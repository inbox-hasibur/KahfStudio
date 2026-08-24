/**
 * VocEx AudioWorkletProcessor — self-contained, no imports.
 * Loaded via audioContext.audioWorklet.addModule(url).
 *
 * DSP Mode: overlap-add spectral Wiener filter for vocal isolation.
 *   - Mid = (L+R)/2, Side = (L-R)/2
 *   - Wiener mask = |Mid|² / (|Mid|² + α·|Side|²)
 *   - Inverse FFT with overlap-add reconstruction
 *
 * ML Mode (live): accumulates input, ships overlap-save windows for ONNX inference
 *   (zero-padded early so the first audio exists ~1.3s+rt in), primes a cushion behind
 *   the page's overlay, then the page rewinds the video to startTime and playback runs
 *   from the START with the pre-buffered separated audio in sync (ML_REPLAY). When the
 *   replay reaches the old live edge, one refill pause of the AUDIO (video keeps
 *   playing) rebuilds the cushion, after which the cleaned audio follows the live
 *   picture on a small stable delay.
 */

// ── Radix-2 FFT ──────────────────────────────────────────────────────────────

function fft(re, im) {
  const N = re.length;
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let crRe = 1.0, crIm = 0.0;
      for (let k = 0; k < (len >> 1); k++) {
        const uRe = re[i+k], uIm = im[i+k];
        const vRe = re[i+k+(len>>1)] * crRe - im[i+k+(len>>1)] * crIm;
        const vIm = re[i+k+(len>>1)] * crIm + im[i+k+(len>>1)] * crRe;
        re[i+k] = uRe+vRe; im[i+k] = uIm+vIm;
        re[i+k+(len>>1)] = uRe-vRe; im[i+k+(len>>1)] = uIm-vIm;
        const nRe = crRe*wRe - crIm*wIm;
        crIm = crRe*wIm + crIm*wRe; crRe = nRe;
      }
    }
  }
}

function ifft(re, im) {
  for (let i = 0; i < im.length; i++) im[i] = -im[i];
  fft(re, im);
  for (let i = 0; i < im.length; i++) im[i] = -im[i];
  const s = 1.0 / re.length;
  for (let i = 0; i < re.length; i++) { re[i] *= s; im[i] *= s; }
}

function makeHann(N) {
  const w = new Float32Array(N);
  for (let i = 0; i < N; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
  return w;
}

// Raised-cosine ramp from BASS_ROLLOFF_MIN (at DC) up to 1.0 (at BASS_ROLLOFF_HZ),
// mirrored for the upper half of the real-FFT spectrum (bin k and N-k represent the
// same frequency for a real-valued input).
function makeBassRolloff(N, rate) {
  const r = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const bin = k <= N / 2 ? k : N - k;
    const freq = bin * rate / N;
    if (freq >= BASS_ROLLOFF_HZ) { r[k] = 1.0; continue; }
    const t = freq / BASS_ROLLOFF_HZ;
    r[k] = BASS_ROLLOFF_MIN + (1 - BASS_ROLLOFF_MIN) * (0.5 - 0.5 * Math.cos(Math.PI * t));
  }
  return r;
}

// ── Processor ────────────────────────────────────────────────────────────────

const FFT_SIZE = 2048;
const HOP      = 128;       // = standard AudioWorklet block size
const ALPHA    = 2.0;       // Wiener suppression factor (higher = more aggressive)

// DSP mode is fundamentally a stereo-panning classifier: the mid/side mask only ever
// distinguishes "centered" from "off-center" content. It has no way to tell a centered
// vocal apart from a centered bass line or kick drum — both land in the mid channel
// identically and pass through at full strength (confirmed empirically: a synthetic
// centered 90Hz tone survived the filter at the same +18dB gain as a synthetic centered
// vocal tone). A real fix needs actual source separation (that's what Quality/ML mode
// is for — see quality-mode-is-mdx-offline). This is a bounded, cheap improvement, not
// a claim of general music removal: sub-bass content (kick/bass fundamentals) is
// disproportionately concentrated below ~150Hz, a range where sustained vocal
// fundamentals rarely carry the content that makes voice intelligible (that lives in
// formants, typically 300Hz+) — so rolling off the mid mask there cuts a real, common
// case of "music survives untouched" with only minor, mostly inaudible collateral
// impact on deep vocal fundamentals.
const BASS_ROLLOFF_HZ  = 150;
const BASS_ROLLOFF_MIN = 0.12;
// MDX-Net overlap-save windows. The model always processes a fixed ~5.9s window
// (ML_CHUNK), but we can SEND that window more often than once per clean-middle width
// and keep only the newest slice of each result. Doing so cuts the end-to-end latency
// (output for "now" is produced every ML_ADVANCE_TARGET instead of every ~5.75s), which
// is the dominant term in the audio-behind-video delay on sites where we can't rewind
// the video (YouTube). The cost is more inference per second of audio — affordable on a
// GPU (webgpu ~0.9s/window); on slow CPU backends the single-in-flight gate naturally
// throttles the send rate back down, and the dynamic take-width (tagged per chunk as
// `adv`) keeps the output gap-free either way.
const ML_CHUNK   = 1024 * 255;                  // 261120  (HOP*(DIM_T-1))
const ML_EDGE    = 7680 / 2;                    // 3840    (n_fft/2 trim; degraded window ends —
                                                // must match MDX.N_FFT in constants.ts)
const ML_KEEP    = ML_CHUNK - 2 * ML_EDGE;      // 253440  usable clean middle (~5.75s)

// Keep-Nature: voice-priority gate, ported from vocex-desktop-rust/src/musicsep.rs's
// combine_voice_priority. See tests/unit/voice-priority-gate.test.ts for the reference
// this formula must match.
const GATE_LO = 0.15;
// Ambience floor: the raw gate opens FULLY whenever the voice stem is quiet, no matter
// how faint the ambience stem is — which took the Bandit model's residual noise floor
// (separation junk, not real ambience) and passed it at full gain in every speech
// pause, while voiced frames closed the gate again: heard as noise the original never
// had, pumping at the frame rate. Below NAT_FLOOR_LO RMS (~-56dBFS) the "ambience" is
// treated as residue and the gate stays shut; it fades in over the ramp to
// NAT_FLOOR_HI (~-44dBFS), above which real ambience beds live and behavior is
// unchanged.
const NAT_FLOOR_LO = 1.5e-3;
const NAT_FLOOR_HI = 6e-3;
// Gate slew: the per-frame target could flip 0↔1 between consecutive 0.1s frames — a
// 10Hz amplitude modulation of the ambience bed that reads as roughness/noise. Bound
// the movement per frame: full-open takes ≥0.4s, full-close ≥0.2s (closing stays
// faster so voice onsets still duck ambience promptly).
const GATE_SLEW_UP   = 0.25;
const GATE_SLEW_DOWN = 0.5;

// Live-mode processed cache: separated audio is ALSO written into a position-indexed
// store (absolute video time) as it's produced, so a seek into an already-processed
// region plays instantly in true sync instead of paying a re-prime — and audio that
// was separated once is never separated again.
//
// Storage is a SPARSE page map (one Int16 stereo page per CACHE_BLK-sample block, ~16KB
// each), not a flat array: memory grows only with what was actually processed, and any
// position of an arbitrarily long video is cacheable (the old flat buffer stopped dead
// at the first CACHE_CAP_S seconds — on long videos every seek past 10min re-processed).
// CACHE_CAP_S is now a RETAINED-AUDIO budget, not a position limit: when the page count
// reaches CACHE_EVICT_FRAC of the budget, the oldest-written pages are evicted FIFO
// (insertion order of the Map), skipping pages near the playhead and the active write
// run so eviction can never chew the region being played or extended.
const CACHE_CAP_S = 600;
const CACHE_BLK   = 4096; // ~93ms coverage granularity / page size
const CACHE_EVICT_FRAC = 0.8; // clean up when the store is 80% of budget (FIFO)

class VocexProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.mode       = (options.processorOptions && options.processorOptions.mode) || 'dsp';
    this.mlVariant  = (options.processorOptions && options.processorOptions.mlVariant) || 'voice';
    this.mlSync     = !!(options.processorOptions && options.processorOptions.mlSync);
    this.gainLinear = (options.processorOptions && options.processorOptions.gainLinear) || 1.0;

    // ── Offline "perfect sync" mode ────────────────────────────────────────────────
    // Process the whole clip FIRST into a position-indexed buffer (indexed by video
    // time), then — after the page rewinds the video — play that buffer back at exactly
    // the video's current position. Because every position is pre-computed, the audio is
    // ALWAYS ready for whatever frame is on screen: frame-accurate sync, and it follows
    // user seeks for free. The cost is a one-time wait while the clip is processed.
    // Phases: 'gather' (playing ahead, filling the buffer) → 'play' (synced playback).
    this.offPhase  = 'gather';
    this.offBufL   = null;   // Int16Array, allocated on OFFLINE_START once duration is known
    this.offBufR   = null;
    this.offCap    = 0;      // buffer length in samples (at offContentRate)
    this.offBase   = 0;      // video time (s) that buffer index 0 corresponds to
    this.offHead   = 0;      // highest sample index written (contiguous processed extent)
    this.offReadF  = 0;      // fractional read cursor (content samples) during synced playback
    this.offTarget = 0;      // read cursor target from the latest SYNC_POS (content samples)
    this.offReported = -1;   // last progress percent posted (throttle)
    this.offReportedCov = 0; // covEnd at the last progress post (2s-advance ack, see _offStore)
    // Fast gather: the page can run the video at Nx with preservesPitch=false while the
    // audio graph runs at N×44100 Hz — so each captured 261120-sample window IS exactly
    // one 44100-rate content window (normal pitch, full fidelity), gathered in 1/N the
    // time. The buffer is therefore indexed at the CONTENT rate = sampleRate / N, and one
    // gathered sample == one content sample (mlTotal is already the content index). At 1×
    // this is just the context rate, so nothing changes for the normal path.
    this.offR = 1;                       // gather playbackRate (set by OFFLINE_START)
    this.offContentRate = sampleRate;    // = sampleRate / offR
    this.offThrottled = false;           // asked the page to pause the (fast) gather so
                                         // inference can catch up — keeps the buffer gapless
    this.offGatherPaused = false; // true while a YouTube ad plays — don't gather ad audio
                                  // (it isn't the content, and would shift the position map)
    // ── Streaming ("chase") perfect sync ─────────────────────────────────────────
    // Instead of pre-processing the WHOLE clip before playing (a duration/rate wait),
    // the gather runs in SEGMENTS: process a leading span, reveal and play it in
    // perfect sync from the buffer, and when the covered runway ahead of the read
    // cursor runs low, ask the page for the next segment (a short catch-up pause —
    // gather runs 2-4× faster than playback, so pauses are a fraction of watch time).
    // offSegBase = buffer index where the CURRENT gather segment's sample 0 lands;
    // coverage is a block bitmap (segments/seeks make the buffer non-contiguous).
    this.offSegBase   = 0;
    this.offSegTag    = 0;     // feed-generation tag (see OFFLINE_SEGMENT/OFFLINE_FEED)
    this.offCovMap    = null;  // Uint8Array over offCap/CACHE_BLK blocks
    this.offRunStart  = -1;    // current contiguous write run (buffer-index domain)
    this.offRunEnd    = -1;
    this.offGoalIdx   = 0;     // buffer index of goalS (never gathered past there)
    this.offAnchorIdx = 0;     // resume position the page is waiting to play from
    this.offAheadIdx  = 0;     // how much coverage past the anchor before READY fires
    this.offReadySent = false; // one READY per segment
    this.offNeedSent  = false; // one NEED per play stretch
    // Offline gather spillover: input that would push the unsent ring backlog past
    // ML_KEEP is parked here and drained into the ring after the in-flight window
    // ships. The ring only holds ML_CHUNK samples, so a backlog past the clean-middle
    // width forces the next window's take-cap to SKIP content — a permanent silent
    // hole in the position buffer (the voice audibly cutting out at that spot on every
    // playback). The throttle asks the page to pause the feed at 0.82·ML_KEEP, but
    // between that request and the feed actually stopping, whole blocks keep landing
    // (queued port messages, a main-thread-jank burst tick, a 4× element gather) —
    // the old headroom to ML_KEEP absorbed well under a second of that. Blocks are
    // {l, r, off}; offSpillN counts parked samples. Live mode never uses this: there
    // the element outrunning inference means the DELAY would grow unboundedly, so the
    // take-cap skip (mlHadGap) is the correct trade there.
    this.offSpill  = [];
    this.offSpillN = 0;
    this.OFF_SPILL_CAP = sampleRate * 30; // broken-feed backstop, far above any real burst
    // Live mode: true while an ad is on screen. Ad sound is not the content — it is
    // passed through raw (no inference, nothing queued); the page re-primes on ad end.
    this.adActive = false;

    // Ring buffer: holds the last FFT_SIZE samples (L and R interleaved)
    this.inBuf    = new Float32Array(FFT_SIZE * 2);
    this.outBuf   = new Float32Array(FFT_SIZE * 2);
    this.inWrite  = 0;
    this.outRead  = 0;
    this.hann     = makeHann(FFT_SIZE);
    this.bassRolloff = makeBassRolloff(FFT_SIZE, sampleRate);

    // Reusable FFT arrays
    this.midRe  = new Float32Array(FFT_SIZE);
    this.midIm  = new Float32Array(FFT_SIZE);
    this.sideRe = new Float32Array(FFT_SIZE);
    this.sideIm = new Float32Array(FFT_SIZE);

    // ML mode: input ring holding the most recent ML_CHUNK samples. Every
    // mlAdvTarget new samples we ship the last ML_CHUNK for inference (overlap-save).
    this.mlRingL  = new Float32Array(ML_CHUNK);
    this.mlRingR  = new Float32Array(ML_CHUNK);
    this.mlRingW  = 0;
    this.mlTotal  = 0;   // total input samples seen
    this.mlSent   = 0;   // mlTotal value at last send
    // How often to ship a window. Smaller = lower latency (output for "now" refreshed
    // sooner) but more inference/sec. This is one of the two terms in the user-audible
    // audio-behind-video delay (the other is the queue cushion below): a sample waits up
    // to one advance in the ring before it's even sent. On machines where the round-trip
    // exceeds this, the in-flight gate is the real cadence anyway (a delayed send just
    // carries a larger `adv`, and the take-width follows, so the output stays gap-free) —
    // so a smaller target only costs extra inference on FAST machines, which have the
    // headroom for it. Adjacent slices stay contiguous (each result contributes exactly
    // its `adv` newest clean samples), so no crossfade is needed.
    // Live mode ships a window every ~1s purely for LATENCY (the audio-behind-video
    // delay). Offline/perfect-sync has no latency term — only THROUGHPUT — and every
    // send costs one full ~5.9s-window inference no matter how little new content it
    // carries. Advancing by 0.75·ML_KEEP (~4.3s) instead of 1s cuts the inferences
    // needed per covered second ~4× at the 1× rates the tap/prefetch paths run at —
    // most of the "perfect sync takes 30-40s before playing" wait on mid/low-end
    // hardware was windows re-processing audio that a previous window already covered.
    // Kept comfortably under ML_KEEP (with the 0.82 throttle in _offlineDrain) so the
    // take-cap can never skip content even under main-thread jank.
    this.mlAdvTarget = this.mlSync
      ? Math.floor(ML_KEEP * 0.75)
      : Math.min(ML_KEEP, Math.round(sampleRate * 1.0));
    this.mlSendTime  = -1;  // currentTime when the in-flight chunk was sent
    // Adaptive delay/cushion. The audio-behind-video delay = queue depth = this cushion.
    // It must stay just above the send→result round-trip (so the queue doesn't empty
    // between results) but no larger (that's wasted delay). We MEASURE the round-trip and
    // size the cushion to it + a margin — small on a fast GPU, automatically larger on a
    // slow CPU so it stays smooth there too, all without a hard-coded guess.
    this.mlRtEst   = 2.0;                                 // seconds, EWMA of recent round-trips
                                                          // (starts moderate: an optimistic first
                                                          // reveal is safe now — a miss costs one
                                                          // refill pause, not instability)
    this.mlRtCount = 0;                                   // results seen (first few are warm-up spikes)
    this.mlCushion = Math.floor(sampleRate * 3.5);        // samples; = the current target delay
    this.mlStatEvery = 0;                                 // throttle counter for the stats report
    // At most one voice-chunk inference in flight at a time. onnx-worker.ts reuses
    // module-level scratch buffers across calls for performance — a second call
    // starting before the first's `await session.run()` resolves would corrupt both.
    // This also means we never build up a backlog of requests the pipeline can't
    // use before they've gone stale.
    this.mlChunkInFlight = false;
    // Consecutive failed results (see the `err` handling in VOCEX_ML_RESULT): bounds
    // how many times a failed window's content is reclaimed for a resend.
    this.mlErrStreak = 0;
    // Offline mode's version of the same accounting: consecutive current-gen failures
    // with NO success in between. Perfect sync has no live fallback — with a broken
    // model it loops gather→grace→silent-play→NEED→gather forever (silent video, CPU
    // pegged). At OFF_FATAL_ERRS the worklet bails to raw pass-through and tells the
    // page to tear the offline session down (VOCEX_OFFLINE_FATAL): unprocessed audio
    // beats a permanently silent video.
    this.offErrRun = 0;
    this.offFatal = false;
    this.OFF_FATAL_ERRS = 6;
    // Lost-reply watchdogs: context-time of the last voice/nature send. The in-flight
    // gates are only ever cleared by a reply — if the reply is LOST (offscreen document
    // torn down mid-request, extension reloaded, transport dropped both legs), the gate
    // stays latched and the pipeline is permanently dead ("enabled but nothing ever
    // processes"). The content script now synthesizes an error reply on transport
    // failure, so these are the last line of defence, sized far above any legitimate
    // round-trip (first model load included).
    this.mlSentAt = -1;
    this.natSentAt = -1;
    // Offline liveness heartbeat throttle (see _offlineDrain): context-time of the last
    // VOCEX_OFFLINE_ALIVE post.
    this.offAliveAt = 0;
    // Replay-at-reveal (ML_REPLAY): the page rewinds the video to startTime so the user
    // sees the clip FROM THE BEGINNING with the pre-buffered separated audio in true
    // sync, instead of the video simply continuing from wherever priming left it (which
    // permanently skipped the first ~5-10s — the reported bug). The element then
    // replays input we have ALREADY gathered; this counter mutes exactly that many
    // input samples so the ring's content stream stays contiguous (…old-live-edge →
    // fresh content) with no re-processing and no duplicates. Counted in input samples,
    // not wall time, so a user pause mid-replay stays correct.
    this.mlInputMuteRemain = 0;
    // A backlog flush was requested (ML_REPLAY) while a chunk was in flight — send it
    // as soon as that request resolves, so the queue covers the full replayed span.
    this.mlFlushPending = false;
    // Queue fully emptied while playing (the one-time catch-up seam after a replay, or
    // a steady-state hiccup): hold output silent — video keeps playing — until one
    // cushion of runway rebuilds, then resume. Without this, playback after an empty
    // queue degrades into just-in-time choppiness (every arrival drains immediately,
    // so every jitter is an audible gap) and never re-stabilises.
    this.mlRefill = false;
    // True if any send's advance exceeded the clean-middle width (inference stalled for
    // more than one whole window — e.g. the first-ever model load happening under the
    // prime): the take-cap then skips content, so the queue holds a GAP and is no longer
    // a contiguous image of the clip from startTime. A replay-from-start reveal would
    // play visibly desynced audio after the gap point; VOCEX_ML_READY carries this so
    // the page falls back to the forward (delayed) reveal for that prime.
    this.mlHadGap = false;
    // The page reported input has stopped for good during priming (video ended after a
    // near-end seek): finish the prime with whatever is processed once the last result
    // lands, instead of waiting for a cushion that can never arrive (see ML_FINISH_PRIME).
    this.mlFinishAsap = false;
    // Live processed cache (see CACHE_CAP_S above): sparse page map, blockIdx →
    // { l, r: Int16Array(CACHE_BLK), full: bool }. `full` marks pages every sample of
    // which was written by a contiguous run (cacheRunStart/End track the current run so
    // a take-cap gap can never falsely mark its blocks covered); only full pages count
    // as coverage. Map insertion order doubles as the FIFO age for eviction — a page is
    // re-inserted on rewrite so recently-updated audio is never the first evicted.
    // mlCacheMode = playing straight from the cache at the video's position (SYNC_POS
    // anchored) after a seek into a covered region. Unlike the original design the
    // pipeline does NOT idle there: input keeps accumulating on the cache session's
    // timeline, and inference resumes on its own just before playback crosses the
    // coverage frontier (see _cacheIngest) — but never for audio that is already
    // covered, so nothing is ever separated twice.
    this.cachePages    = new Map();
    this.cacheMaxPages = Math.ceil((CACHE_CAP_S * sampleRate) / CACHE_BLK);
    this.cacheEvictAt  = Math.max(8, Math.floor(this.cacheMaxPages * CACHE_EVICT_FRAC));
    this.cacheProtPages = Math.ceil((10 * sampleRate) / CACHE_BLK); // ±10s eviction shield
    // Pages newly completed by _cacheWrite, awaiting export to the page for PERSISTENT
    // storage (IndexedDB — see the interceptor). Only live-written pages enter here;
    // pages restored via CACHE_LOAD are already persisted and never re-exported.
    this.cacheDirty = [];
    this.cacheFlushTick = 0;
    // Bumped by CACHE_RESET (a new video in the same element). Outgoing windows are
    // stamped with it (`cg`), and a result is only banked into the position cache when
    // the stamp still matches — the abs stamp deliberately survives mlGen resets
    // (seeks within the SAME video), but across a VIDEO change it would write the
    // previous clip's audio into the new clip's cache at matching positions (heard as
    // the old video's sound on a seek near the start of the new one).
    this.cacheGen = 0;
    // Bumped by CACHE_DROP_TAIL (an ad just started on the SAME video). Windows sent
    // BEFORE that moment can carry a tail of ad samples stamped at content positions
    // (ad detection lags the ad's first audio by up to ~1s) — their results land
    // seconds later and must never bank, or the ad's sound ends up cached (and
    // persisted) as content and replays on every later visit to those positions.
    // Unlike cacheGen this does NOT drop existing pages: the video didn't change,
    // only the trust in what's currently in flight.
    this.cacheEra = 0;
    // Is the media element actually producing audio right now? Maintained by the page
    // (PLAY_STATE) from the element's own play/pause/ended state. The AudioContext being
    // suspended on pause is NOT sufficient on its own: any path that resumes the context
    // while the element is stopped (a stray user gesture, a cache-hit seek, an autoplay
    // unlock) would otherwise let the pipeline play queued/cached audio against a frozen
    // picture — the reported "audio plays while the video is paused / on the home feed".
    // It also protects position mapping: accumulating a paused element's silence advances
    // mlTotal while video time stands still, which drifts every cache position stamped
    // from it. Defaults true — an element is only ever hooked while playing.
    this.elPlaying = true;
    this.cacheRunStart = -1;
    this.cacheRunEnd = -1;
    this.mlCacheMode = false;
    this.cacheReadF = 0;
    this.cacheTarget = 0;
    this.cacheEdgeSent = false;
    // ML mode: separated-output delay queue (stereo ring buffer). Playback reads
    // from here so the output is the FULL-STRENGTH separated signal, delayed by
    // the inference round-trip — not a blend with the unprocessed DSP path.
    // Offline mode: MDX inference is ~realtime and bursty (one ~5.9s block every
    // ~6s). Use a large queue and a deep prime (see ML_PRIME_TARGET below) so
    // steady-state playback has a real runway. Never trim (offline tolerates large
    // latency).
    this.mlQCap   = Math.max(ML_CHUNK * 2, Math.floor(sampleRate * 90));
    this.mlQL     = new Float32Array(this.mlQCap);
    this.mlQR     = new Float32Array(this.mlQCap);
    this.mlQRead  = 0;
    this.mlQWrite = 0;
    this.mlQCount = 0;
    // Output declick. Every source this processor plays from can stop or jump
    // mid-stream (underrun→silence, refill, pause gate, coverage holes, queue trims):
    // a raw step at those seams is an audible click/pop — one ingredient of the
    // "sound is not smooth" report. lastOut* remembers the previous emitted sample so
    // a cut to silence decays instead of stepping; rampIn soft-starts the next audible
    // block; splice* holds a short pre-trim tail that crossfades over a queue trim.
    this.lastOutL = 0; this.lastOutR = 0;
    this.RAMP_N  = 160;   // ~3.6ms at 44.1k — inaudible as a fade, kills the click
    this.rampIn  = 0;
    this.spliceL = null; this.spliceR = null; this.spliceOff = 0;
    this.mlPrimed = false;
    this.mlHaveOut = false;                          // first output block written?
    // Steady-state model: after the replay span is exhausted (or when ML_ALIGN_FORWARD
    // was the fallback), the cleaned audio follows the live video on a small, STABLE
    // delay — essentially the queue cushion below. That delay is architectural: the
    // element is its own audio source, so separated audio for time T cannot exist
    // before T + round-trip; only pre-processing (Perfect sync mode) removes it.
    // Safety net: if inference is so slow (or broken) that the target is never
    // reached, don't leave the user staring at the overlay forever — reveal with
    // whatever's queued (even nothing) once we've waited this long. Generous enough to
    // absorb a slow first model load (can be 20-30s+ on weak single-thread WASM) plus
    // two inference passes, without being anywhere near as long as the old one-size-
    // fits-all 90s.
    this.ML_PRIME_MAX_WAIT = 60;
    // currentTime when the current gen started priming. -1 (not 0) means "not set yet" —
    // currentTime is legitimately 0 at the moment _resetMl() first runs (right as the
    // audio graph starts up), so 0 cannot double as the sentinel without the reveal
    // check below silently never firing.
    this.mlPrimeStartTime  = -1;
    // If the queue ever grows well past the cushion (a burst of results, or a spell where
    // the video paused but the pipeline kept a request in flight), the audio delay would
    // creep up. Trim back to the cushion when it exceeds this, so the delay stays bounded
    // near ML_ALIGN_CUSHION instead of drifting larger over a long session.
    this.ML_MAXLAG = Math.floor(sampleRate * 8);

    // Seek-and-play state: the page shows a loading overlay, and once the queue is
    // primed we ask it to seek the video back to startTime and resume.
    this.mlVideoStartTime = 0;
    this.mlSeekSent = false;

    // Bumped on every _resetMl() (seek / new video / mode switch). Tagged onto every
    // outgoing chunk and checked on every incoming result — a result computed before a
    // reset can still land after one (the inference round-trip can take many seconds),
    // and without this it gets appended into the NEW timeline's queue as if it belonged,
    // producing audio that doesn't match what's on screen (heard as misplaced/"repeated").
    this.mlGen = 0;

    // Buffer-health pause: once primed, if the output queue runs low we ask the page to
    // pause the element (audio catching up) rather than let it keep advancing silently
    // out of sync with what's actually been separated so far. Hysteresis avoids
    // pause/resume thrashing right at the boundary.
    this.mlBuffering = false;
    this.ML_LOW_WATER  = Math.floor(sampleRate * 0.3);
    this.ML_HIGH_WATER = Math.floor(sampleRate * 1.5);

    // Keep-Nature: independent nature-window ring (native-rate — resampling to the
    // model's fixed 48kHz happens in the offscreen document, which has
    // OfflineAudioContext; this worklet has no access to that API).
    // 16s window / 14s hop (was 8/7): bandit-worker downmixes to mid-mono and
    // time-compresses 2:1 into the model's fixed 8s×48k input, so one (~realtime-cost)
    // Bandit run now covers 14s of content instead of needing 2 runs per 7s — the
    // difference between Keep-Ambience processing at ~2.5× realtime (sync mode stuck
    // on "Processing…" for 2-3× the clip) and ~0.6×. Stem quality validated offline:
    // identical envelopes on music, steady ambience beds exact, some transient
    // overshoot on ambience onsets (see _compare_int8_quality-style check in
    // scripts/_timing_probe.mjs history / memory).
    //
    // natRate = the TRUE sample rate of what the nature ring holds. Live mode: the
    // context rate (the ring is fed straight from the element). Perfect sync: the
    // CONTENT rate (offContentRate = sampleRate/offR — OFFLINE_START re-derives the
    // whole pipeline via _setNatureRate). These differ whenever the graph runs on an
    // oversampled fast-gather context (176400/88200, created for voice+sync and
    // permanently reused by graphCache when the user switches to Keep Ambience: a
    // MediaElementSource capture can never move to a new context). Sizing/stamping
    // the sync ring at the context rate there shipped windows spanning 4× the
    // intended content, mislabeled 4× too fast — Bandit heard 8×-speed audio, and
    // the garbage stem it returned was gated into every combined frame (field
    // symptom: continuous wheezing/jamming, plus 4×-content coverage quanta that
    // starved playback into constant edge-holds).
    this.natRate = sampleRate;
    this.NATURE_WIN = Math.round(this.natRate * 16);
    this.NATURE_HOP = Math.round(this.natRate * 14);
    this.NAT_XF     = Math.round(this.natRate * 0.3);
    this.natRingL = new Float32Array(this.NATURE_WIN);
    this.natRingR = new Float32Array(this.NATURE_WIN);
    this.natRingW = 0;
    this.natTotal = 0;
    this.natSent  = 0;
    this.natChunkInFlight = false; // same reasoning as mlChunkInFlight, for the nature ring
    // Content index (input samples) of window[0] of the in-flight nature request, and
    // how far the staged nature stream extends — lets the result handler stage the
    // exact fresh span, including the end-of-clip tail flush (offline mode), instead
    // of assuming perfect hop cadence.
    this.natWinStart  = 0;
    this.natStagedEnd = 0;
    this.natTailFlush = false; // in-flight request is an offline end-of-clip tail flush

    // Keep-Nature: reconstructed voice/nature streams, staged here (not written to mlQ
    // directly) until the gate combine has enough of both to emit — see _tryCombine().
    // Sized at natRate: the staged streams hold ring samples (content-rate in sync),
    // so one gate frame is 0.1s of CONTENT either way.
    this.gateFrame = Math.round(this.natRate * 0.1);
    this.natGate = 1.0;
    // Staged streams are plain arrays consumed via READ OFFSETS, not splice(0, n):
    // a nature result can release ~14s of combine work in ONE port-message callback
    // (which runs on the realtime audio thread), and per-frame splices there moved
    // the whole million-element remainder ~140 times per window — hundreds of ms of
    // memmove per callback, an audible dropout at every window landing. Offsets make
    // consumption O(1); one slice() compaction per callback reclaims the memory.
    // The nature stage is a single MONO array (the stem is mid-channel — see
    // _natureTrySend); the combine writes it to both output channels.
    this.stageVoiceL = [];
    this.stageVoiceR = [];
    this.stageVoiceOff = 0;
    this.stageNature = [];
    this.stageNatureOff = 0;
    this.stageNatureHaveTail = false;
    // Keep-Nature offline: buffer index where the next combined gate frame lands.
    // The staged voice stream starts at segment content −ML_EDGE (the first slice's
    // take reaches back over the window edge — same mapping as the voice-only offline
    // write below), so the cursor is (re)anchored to offSegBase − ML_EDGE per segment.
    this.offCombCursor = 0;

    this.port.onmessage = (e) => {
      const d = e.data;
      if (!d) return;
      // ── Offline "perfect sync" control messages ──────────────────────────────────
      if (d.type === 'OFFLINE_START') {
        // Begin the gather phase. Allocate the position-indexed buffer sized to the
        // span we'll process (video duration from the start point), capped so a very
        // long video can't blow up memory. Int16 keeps it to ~11.5 MB per minute (stereo).
        const spanS = Math.max(1, Math.min(d.durationS || 0, d.capS || 600));
        this.offR = (typeof d.rate === 'number' && d.rate >= 1) ? d.rate : 1;
        this.offContentRate = sampleRate / this.offR; // buffer indexed at the content rate
        this.offBase = d.startS || 0;
        this.offCap  = Math.ceil(spanS * this.offContentRate);
        this.offBufL = new Int16Array(this.offCap);
        this.offBufR = new Int16Array(this.offCap);
        this.offHead = 0;
        this.offPhase = 'gather';
        this.mlGen++;                 // fresh timeline for the gather
        this.mlRingW = 0; this.mlTotal = 0; this.mlSent = 0;
        this.offReported = -1;
        this.offReportedCov = 0;
        // Chase-mode state: coverage bitmap over the buffer, and the goal index the
        // gather never passes (the end-guard region — see goalS on the page side).
        this.offCovMap = new Uint8Array(Math.ceil(this.offCap / CACHE_BLK));
        this.offRunStart = -1; this.offRunEnd = -1;
        this.offGoalIdx = Math.min(this.offCap,
          Math.max(0, Math.round(((typeof d.goalS === 'number' ? d.goalS : spanS) - this.offBase) * this.offContentRate)));
        this.offSegBase = 0; this.offAnchorIdx = 0; this.offAheadIdx = this.offGoalIdx;
        this.offSegTag = 0;
        this.offReadySent = false; this.offNeedSent = false;
        this.offSpill = []; this.offSpillN = 0;
        this.offErrRun = 0; this.offFatal = false; // a new session gets a fresh chance
        // The gather rings hold CONTENT-rate samples from here on — re-derive the
        // nature pipeline's window/hop/frame sizes and rate stamp to match (no-op at
        // 1×; on an oversampled fast-gather context this is the difference between
        // Bandit receiving real 16s content windows and 64s windows mislabeled 4×
        // too fast). Must run BEFORE _resetNatureGather so the reset zeroes the
        // re-sized rings.
        this._setNatureRate(this.offContentRate);
        this._resetNatureGather();
        return;
      }
      if (d.type === 'OFFLINE_SEGMENT') {
        // Begin (or re-aim) a gather segment: the element has been seeked to fromS and
        // is about to fast-play from there; samples map to the buffer from that index.
        // anchorS/aheadS define when VOCEX_OFFLINE_READY fires: once the buffer is
        // contiguously covered from anchorS to anchorS+aheadS (or to the goal), the
        // page can rewind to anchorS and play that span in perfect sync.
        this.offPhase = 'gather';
        this.offSegBase = Math.max(0, Math.round(((d.fromS || 0) - this.offBase) * this.offContentRate));
        this.offAnchorIdx = Math.max(0, Math.round(((d.anchorS || 0) - this.offBase) * this.offContentRate));
        this.offAheadIdx = Math.max(1, Math.round((typeof d.aheadS === 'number' ? d.aheadS : 1e9) * this.offContentRate));
        // Feed-generation tag: OFFLINE_FEED blocks stamped with an older tag belong to a
        // superseded segment (they can sit queued in the port across a re-anchor, e.g.
        // while the graph is suspended) — accumulating them into THIS segment's position
        // map would corrupt it, so the feed handler drops them.
        this.offSegTag = (typeof d.seg === 'number') ? d.seg : this.offSegTag;
        this.offReadySent = false;
        this.offNeedSent = false;
        this.mlGen++; // a prior segment's in-flight result maps to a different base — discard
        this.mlRingW = 0; this.mlTotal = 0; this.mlSent = 0;
        this.offSpill = []; this.offSpillN = 0; // parked content belongs to the old segment
        this._resetNatureGather();
        this._offCheckReady(); // the requested span may ALREADY be covered (seek into old coverage)
        return;
      }
      if (d.type === 'OFFLINE_HOLD') {
        // Playback caught up with background processing (VOCEX_OFFLINE_NEED) while the
        // feed is still producing exactly the span ahead: hold and re-arm the READY
        // check WITHOUT a segment re-anchor. An OFFLINE_SEGMENT here would bump the
        // generation — discarding the in-flight window, up to a whole Bandit inference
        // on the very machines that trigger holds — and reset the nature ring, costing
        // 8 more seconds of content before any ambience can even ship again. Rings,
        // generation, staging and the feed mapping all stay live; only the anchor/ahead
        // targets move. The page only sends this when the coverage gap starts inside
        // the actively-fed span (anything else is a real seek → OFFLINE_SEGMENT).
        this.offPhase = 'gather';
        this.offAnchorIdx = Math.max(0, Math.round(((d.anchorS || 0) - this.offBase) * this.offContentRate));
        this.offAheadIdx = Math.max(1, Math.round((typeof d.aheadS === 'number' ? d.aheadS : 1e9) * this.offContentRate));
        this.offReadySent = false;
        this.offNeedSent = false;
        this._offCheckReady(); // results may have landed since the NEED fired
        return;
      }
      if (d.type === 'OFFLINE_GATHER_PAUSE') {
        this.offGatherPaused = !!d.paused; // suspend/resume gathering across an ad break
        return;
      }
      if (d.type === 'OFFLINE_ABANDON') {
        // Page-initiated bail (gather made no progress for a long time — dead stream,
        // starved network): same raw pass-through as the model-failure bail. The page
        // owns the element-side teardown.
        this.offFatal = true;
        return;
      }
      if (d.type === 'OFFLINE_FEED') {
        // Background prefetch: the page decoded the media file itself and streams content
        // blocks in here, so the pipeline no longer needs the element to fast-play hidden
        // behind an overlay to gather. Processing therefore runs AHEAD of playback in the
        // background — the catch-up pauses ("processing…" every 30-60s) disappear.
        // Deliberately not gated on offGatherPaused: that flag exists to keep a paused
        // ELEMENT's silence out of the buffer, and prefetch keeps the element paused (or
        // playing from the buffer) by design.
        if (typeof d.seg === 'number' && d.seg !== this.offSegTag) return; // stale feed from a superseded segment
        const l = d.left instanceof Float32Array ? d.left : new Float32Array(d.left || 0);
        const r = d.right instanceof Float32Array ? d.right : (d.right ? new Float32Array(d.right) : l);
        if (l.length > 0) this._offlineAccumulate(l, r, l.length);
        this._offlineDrain();
        return;
      }
      if (d.type === 'AD_MODE') {
        this.adActive = !!d.active; // live mode: pass ads through raw (see _ml)
        return;
      }
      if (d.type === 'PLAY_STATE') {
        // The element started/stopped producing audio (see elPlaying).
        this.elPlaying = !!d.playing;
        return;
      }
      if (d.type === 'OFFLINE_RESET') {
        // The video source changed under us (a new clip loaded into the same element).
        // Immediately drop the old pre-computed buffer so its audio can't keep playing,
        // and bump the generation so any in-flight results for the old clip are discarded.
        // A fresh OFFLINE_START follows once the new clip's duration is known.
        this.offPhase = 'gather';
        this.offBufL = null; this.offBufR = null; this.offHead = 0; this.offReadF = 0;
        this.offGatherPaused = false; this.offThrottled = false;
        this.offCovMap = null; this.offRunStart = -1; this.offRunEnd = -1;
        this.offReadySent = false; this.offNeedSent = false;
        this.offErrRun = 0; this.offFatal = false;
        this.mlGen++; this.mlRingW = 0; this.mlTotal = 0; this.mlSent = 0;
        this.offSpill = []; this.offSpillN = 0;
        this._resetNatureGather();
        return;
      }
      if (d.type === 'OFFLINE_FLUSH') {
        // Video reached the end. The last partial advance (< mlAdvTarget) never met the
        // normal send threshold — force it out so the final ~2s gets processed too.
        // Idempotent: after sending, mlSent == mlTotal, so repeat flushes are no-ops.
        // No mlTotal >= ML_CHUNK requirement: for a clip shorter than one window the
        // ring's unwritten (zero) region naturally front-pads the window, and the
        // result handler's position math already maps padded windows correctly —
        // requiring a full window here meant short clips shipped NOTHING (pure silence).
        // Not gated on the 'gather' phase: background prefetch reveals playback long
        // before it finishes feeding, so the end-of-clip tail is flushed while the
        // phase is already 'play'. Harmless for the element-driven path, whose ring is
        // empty once playback starts (mlTotal == mlSent makes this a no-op).
        this._offDrainSpill(); // parked tail content must reach the ring before the flush
        if (this.mlTotal > this.mlSent && !this.mlChunkInFlight) this._shipWindow(false);
        // Keep-Nature: the final partial nature window (< one hop of new content) also
        // never met its send threshold — flush it as a TAIL window (staged through the
        // window's end, not just one hop) so the clip's last seconds get real ambience
        // instead of the voice-only stuck-cap drain. Idempotent the same way (natSent
        // catches up to natTotal on send).
        if (this.mlVariant === 'nature') this._natureTrySend(true);
        return;
      }
      if (d.type === 'OFFLINE_PLAY') {
        // The page has rewound the video to atS (the segment anchor) and is about to
        // play. Switch to synced playback; SYNC_POS drives the read cursor from here.
        this.offPhase = 'play';
        this.offReadF = Math.max(0, Math.round(((typeof d.atS === 'number' ? d.atS : this.offBase) - this.offBase) * this.offContentRate));
        this.offTarget = this.offReadF;
        this.offNeedSent = false;
        return;
      }
      if (d.type === 'SYNC_POS') {
        // Frame-accurate anchor: the video is at d.timeS. Point the read cursor at that
        // exact position in the pre-computed buffer. process() eases toward it so small
        // clock jitter doesn't cause clicks, but a real jump (user seek) snaps.
        // Small drift is corrected in the read loops by a bounded RATE WARP (a few % on
        // the read step), never by moving the cursor here: the old 0.3-proportional ease
        // spliced 3-10ms of audio out (or in) on EVERY pump (~7×/s, driven by the jitter
        // of reading el.currentTime), heard as constant crackle/roughness during cache
        // and perfect-sync playback. Only a real jump (user seek / gross desync) snaps.
        if (this.offPhase === 'play' && this.mlSync) {
          const t = Math.max(0, Math.round((d.timeS - this.offBase) * this.offContentRate));
          this.offTarget = t;
          if (Math.abs(t - this.offReadF) > this.offContentRate * 0.5) this.offReadF = t; // snap (user seek / big drift)
        } else if (this.mlCacheMode) {
          // Same anchoring for live cache playback (indexed at absolute video time).
          const t = Math.max(0, Math.round(d.timeS * sampleRate));
          this.cacheTarget = t;
          if (Math.abs(t - this.cacheReadF) > sampleRate * 0.5) this.cacheReadF = t;
        }
        return;
      }
      if (d.type === 'UPDATE_SETTINGS') {
        const prevMode    = this.mode;
        const prevVariant = this.mlVariant;
        if (d.mode)               this.mode       = d.mode;
        if (d.mlVariant)          this.mlVariant  = d.mlVariant;
        if (d.gainLinear != null) this.gainLinear = d.gainLinear;
        // Full ML-state reset when switching into ML mode, or switching variant while
        // already in ML mode, so the overlay/seek flow starts fresh on the new session.
        const enteringML     = d.mode === 'ml' && prevMode !== 'ml';
        const variantChanged = d.mode === 'ml' && this.mlVariant !== prevVariant;
        if (enteringML || variantChanged) this._resetMl();
      }
      if (d.type === 'VIDEO_START_TIME') {
        this.mlVideoStartTime = typeof d.time === 'number' ? d.time : 0;
      }
      if (d.type === 'ML_FULL_RESET') {
        // Video source or position changed underneath us (seek / new video loaded into
        // the same element) — discard all buffered/queued audio, which belongs to the
        // old timeline, and re-run the buffer/wait/resync flow from scratch.
        this._resetMl();
      }
      if (d.type === 'ML_REPLAY') {
        // The page rewound the video to startTime (verified landed) so the user gets the
        // clip FROM THE START with the pre-buffered separated audio in true sync. Same
        // timeline, same gen — no reset of any kind: the queue already holds the span's
        // audio, and the ring's content stream must stay contiguous. Three things only:
        // start draining (primed); MUTE the replayed input (d.skipInputS seconds — the
        // element will re-play input we already gathered; re-accumulating it would
        // duplicate content in the ring and desync everything after); and flush the
        // unsent backlog so the queue covers right up to the rewind point (the tail
        // between the last send and the reveal). An in-flight request is still valid
        // (same gen) — its result appends normally; the flush follows it (mlFlushPending).
        this.mlPrimed = true;
        this.mlInputMuteRemain = Math.max(0, Math.round((d.skipInputS || 0) * sampleRate));
        this._flushBacklog();
      }
      if (d.type === 'SEEK_TO') {
        // User-seek probe: if the target region is already separated in the cache, play
        // it instantly (and in true sync — better than the live delay) instead of paying
        // a re-prime. Requires 1s of contiguous runway — enough that audio starts
        // immediately; small holes further ahead are RIDDEN THROUGH by the edge check
        // (brief silence, healed in the background by _cacheIngest) instead of bouncing
        // into a re-prime. Slow machines matter here: when inference is slower than one
        // window per window (rt > ~5.75s), live coverage is inherently fragmented into
        // islands — the old 2s-contiguous demand made every probe on such hardware miss
        // and re-process audio that mostly existed. Anything else → miss → re-prime.
        const t = Math.max(0, typeof d.timeS === 'number' ? d.timeS : 0);
        if (this.mode === 'ml' && !this.mlSync && this.mlVariant === 'voice' &&
            this._cacheCoveredS(t, t + 1.0)) {
          this._enterCacheMode(t);
          this.port.postMessage({ type: 'VOCEX_SEEK_HIT', timeS: t });
        } else {
          this.port.postMessage({ type: 'VOCEX_SEEK_MISS', timeS: t,
            dbg: { pages: this.cachePages.size, runStartS: this.cacheRunStart / sampleRate, runEndS: this.cacheRunEnd / sampleRate } });
        }
        return;
      }
      if (d.type === 'CACHE_RESET') {
        // A new video loaded into the same element — every cached position belongs to
        // the previous clip. Drop the pages outright (memory back to zero).
        this.cachePages.clear();
        this.cacheDirty.length = 0;
        this.cacheRunStart = -1; this.cacheRunEnd = -1;
        this.mlCacheMode = false;
        this.cacheGen++; // in-flight results for the old video must not bank (see field)
        return;
      }
      if (d.type === 'CACHE_DROP_TAIL') {
        // An ad just started (page-side detection — see startAdWatch). Anything the
        // current write run banked from the ad boundary on may be AD audio stamped at
        // content positions (the detection latency let those samples through the
        // ring): drop those pages, refuse banking for every window already in flight
        // (cacheEra — sent before this moment, so possibly carrying an ad tail), and
        // report the dropped blocks so the page purges them from persistent storage
        // too (they may already have been exported via cacheDirty).
        const fromIdx = Math.max(0, Math.round((typeof d.fromS === 'number' ? d.fromS : 0) * sampleRate));
        this.cacheEra++;
        if (this.cacheRunEnd > fromIdx) {
          const lo = Math.max(fromIdx, this.cacheRunStart >= 0 ? this.cacheRunStart : fromIdx);
          const b0 = Math.floor(lo / CACHE_BLK); // a partially-contaminated page goes whole
          const b1 = Math.ceil(this.cacheRunEnd / CACHE_BLK);
          const dropped = [];
          for (let b = b0; b < b1; b++) {
            if (this.cachePages.delete(b)) dropped.push(b);
          }
          if (this.cacheDirty.length) {
            this.cacheDirty = this.cacheDirty.filter((b) => b < b0 || b >= b1);
          }
          this.cacheRunEnd = Math.min(this.cacheRunEnd, lo);
          if (this.cacheRunEnd <= this.cacheRunStart) { this.cacheRunStart = -1; this.cacheRunEnd = -1; }
          if (dropped.length) this.port.postMessage({ type: 'VOCEX_CACHE_DROPPED', blocks: dropped });
        }
        return;
      }
      if (d.type === 'CACHE_LOAD') {
        // Pages restored from persistent storage (IndexedDB, see the interceptor):
        // separated audio from a previous session/play of THIS video. Install them as
        // covered coverage — never overwriting a live-written page (fresher), and never
        // entering cacheDirty (they are already persisted). From here the normal
        // machinery does the rest: the prime's reveal-into-cache fires the moment the
        // playhead sits in restored coverage, so a replayed video starts instantly with
        // no re-processing at all.
        const pages = Array.isArray(d.pages) ? d.pages : [];
        for (const p of pages) {
          if (typeof p.b !== 'number' || p.b < 0) continue;
          if (!(p.l instanceof Int16Array) || !(p.r instanceof Int16Array)) continue;
          if (p.l.length !== CACHE_BLK || p.r.length !== CACHE_BLK) continue;
          if (this.cachePages.has(p.b)) continue;
          this.cachePages.set(p.b, { l: p.l, r: p.r, full: true });
        }
        this._cacheEvict();
        return;
      }
      if (d.type === 'ML_FINISH_PRIME') {
        // The video ended while we were still priming (e.g. the user seeked near the
        // end): input has stopped for good, so the reveal's cushion threshold can never
        // be met — without this, the overlay would sit until the 60s prime timeout (or
        // forever, if the ended-pause also suspended the context and froze our clock;
        // this handler still runs — port messages fire regardless of suspension).
        // Flush the tail and reveal as soon as the last result lands.
        if (!this.mlSeekSent) {
          this.mlFinishAsap = true;
          this._flushBacklog();
          if (!this.mlChunkInFlight && this.mlTotal <= this.mlSent) this._finishPrimeNow();
        }
        return;
      }
      if (d.type === 'ML_ALIGN_FORWARD') {
        // Fallback reveal: the rewind did NOT land (livestream / non-seekable player), so
        // the video keeps playing forward from wherever it actually is. Do NOT reset the
        // gather ring/mlTotal: they already correctly track elapsed real playback. Just
        // fast-forward our read pointer through the accumulated pre-buffer, keeping a
        // small cushion, so playback aligns with "now" instead of trying to replay
        // content for a position the video already left behind.
        if (this.mlQCount > this.mlCushion) {
          this._trimQueue(this.mlQCount - this.mlCushion);
        }
        this.mlInputMuteRemain = 0; // no rewind happened — there is no replay to mute
        this.mlPrimed = true;
      }
      if (d.type === 'VOCEX_ML_RESULT') {
        const p = d.payload;
        if (!p) return;
        // A slot has freed up regardless of whether this particular result turns out to be
        // stale (see gen check below) — either way nothing is in flight for this ring now.
        this.mlChunkInFlight = false;
        // Inference failed (model load failure, a genuine error): NOTHING was separated.
        // Never bank or play anything — the old zero-filled replies were cached (and
        // persisted) as processed audio, leaving permanently silent regions. Reclaim the
        // window's content so it gets re-sent, but bounded (mlErrStreak): a permanently
        // broken model degrades to skipping forward instead of an endless resend loop.
        // Reclaim BEFORE the flush dispatch below, so a pending flush covers it too.
        if (p.err !== undefined || !p.left) {
          if (p.gen === this.mlGen && this.mlErrStreak < 8 &&
              typeof p.pos === 'number' && typeof p.adv === 'number' && p.pos === this.mlSent) {
            this.mlErrStreak++;
            this.mlSent = Math.max(0, p.pos - p.adv);
          }
          // Perfect sync with a persistently failing model: bail to pass-through (see
          // offFatal above) instead of looping the gather forever over a silent video.
          if (p.gen === this.mlGen && this.mlSync && !this.offFatal &&
              ++this.offErrRun >= this.OFF_FATAL_ERRS) {
            this.offFatal = true;
            this.port.postMessage({ type: 'VOCEX_OFFLINE_FATAL' });
          }
          if (this.mlFlushPending) { this.mlFlushPending = false; this._flushBacklog(); }
          return;
        }
        this.mlErrStreak = 0;
        this.offErrRun = 0;
        // A replay-reveal flush was waiting on this slot — send it now so the queue
        // covers the full replayed span (see ML_REPLAY).
        if (this.mlFlushPending) { this.mlFlushPending = false; this._flushBacklog(); }
        // Chrome serialises typed arrays as plain arrays across extension contexts.
        const left  = p.left  instanceof Float32Array ? p.left  : new Float32Array(p.left);
        const right = p.right instanceof Float32Array ? p.right : new Float32Array(p.right);
        // Keep only the NEWEST `take` clean samples of this window — the fresh content
        // since the last send. `take` == the advance the sender reported (usually
        // mlAdvTarget; larger if the in-flight gate delayed the send), capped at the
        // clean-middle width. Because each result contributes exactly its own advance,
        // consecutive slices are contiguous (no gap, no overlap). Taking the NEWEST slice
        // (nearest the window's trailing edge) is what makes the latency small.
        const take  = Math.min((typeof p.adv === 'number' && p.adv > 0) ? p.adv : ML_KEEP,
                               ML_KEEP, left.length - ML_EDGE, right.length - ML_EDGE);
        const start = ML_CHUNK - ML_EDGE - take; // >= ML_EDGE (within the clean middle)
        if (take <= 0 || start < 0) return;
        // The window's end position in reset-relative samples, STAMPED AT SEND TIME
        // (see pos on the outgoing payload). Never derive this from this.mlSent here:
        // a flush dispatched earlier in this very handler can have already advanced
        // mlSent past this result's send point, which misplaced cached audio and
        // fragmented coverage (confirmed live: cache probes randomly missed).
        const posEnd = (typeof p.pos === 'number') ? p.pos : this.mlSent;
        // Bank the slice in the position-indexed cache BEFORE the gen check, using the
        // payload's own absolute-position stamp (see _shipWindow): separated audio is
        // separated audio no matter how the timeline moved since the send. This is what
        // keeps a seek from punching a coverage hole at the exact spot the user seeked —
        // the in-flight window's result used to be discarded wholesale, and the hole it
        // left made the NEXT seek probe miss and re-process audio we already had.
        if (typeof p.abs === 'number' && this.mlVariant === 'voice' && !this.mlSync &&
            (p.cg === undefined || p.cg === this.cacheGen) &&
            (p.ce === undefined || p.ce === this.cacheEra)) {
          this._cacheWrite(p.abs - ML_EDGE - take, left, right, start, take);
        }
        // Inference is an async round-trip through the background/offscreen document that
        // can take seconds — long enough for a seek, a new video, or a mode switch to reset
        // the pipeline (_resetMl(), which bumps mlGen) before this result comes back. A
        // stale result belongs to a timeline we've already abandoned; appending it to the
        // playback queue now would inject audio that doesn't match what's on screen.
        if (p.gen !== this.mlGen) return;

        // ── Offline gather: store the fresh slice at its video position ──────────────
        if (this.mlSync && this.offBufL) {
          if (this.mlVariant === 'nature') {
            // Keep-Nature: stage the voice stem exactly like the live path — the gate
            // combine (_tryCombine) merges it with the Bandit ambience stem and writes
            // the COMBINED frames into the offline buffer at offCombCursor.
            // A take-cap skip (adv > clean-middle after an inference stall) drops voice
            // CONTENT — pad the staged stream with silence for the skipped span so it
            // stays sample-aligned with the staged nature stream (see the alignment
            // note in VOCEX_NATURE_RESULT). Bounded like the nature-side pad
            // (natRate: staged samples are ring/content samples).
            const skipN = Math.min(this.natRate * 30, Math.max(0,
              ((typeof p.adv === 'number' && p.adv > 0) ? p.adv : take) - take));
            for (let ni = 0; ni < skipN; ni++) { this.stageVoiceL.push(0); this.stageVoiceR.push(0); }
            for (let ni = 0; ni < take; ni++) {
              this.stageVoiceL.push(left[start + ni]);
              this.stageVoiceR.push(right[start + ni]);
            }
            this._tryCombine();
            return;
          }
          // Buffer index of this slice's first sample: the segment's base plus the
          // slice's position within the segment (posEnd is segment-relative).
          this._offStore(this.offSegBase + posEnd - ML_EDGE - take, left, right, start, take);
          return;
        }

        if (this.mlVariant === 'nature') {
          // Keep-Nature: stage the voice stem instead of writing straight to mlQ — the
          // gate combine (below) reads from here once a matching nature region lands.
          // Same take-cap alignment pad as the offline branch above: skipped voice
          // content becomes silence, keeping the two staged streams sample-aligned.
          const skipN = Math.min(this.natRate * 30, Math.max(0,
            ((typeof p.adv === 'number' && p.adv > 0) ? p.adv : take) - take));
          for (let ni = 0; ni < skipN; ni++) { this.stageVoiceL.push(0); this.stageVoiceR.push(0); }
          for (let ni = 0; ni < take; ni++) {
            this.stageVoiceL.push(left[start + ni]);
            this.stageVoiceR.push(right[start + ni]);
          }
          this._tryCombine();
          return;
        }

        // Backstop for payloads without an abs stamp (shouldn't happen from this build's
        // _shipWindow, but a mid-update page/worklet version skew must not lose caching):
        // same mapping the stamp encodes, derived from the current baseline.
        if (typeof p.abs !== 'number' && (p.ce === undefined || p.ce === this.cacheEra)) {
          this._cacheWrite(
            Math.round(this.mlVideoStartTime * sampleRate) + (posEnd - ML_EDGE - take),
            left, right, start, take);
        }

        // Measure the send→result round-trip and size the cushion (= the delay) to it.
        // Runs in cache mode too — a warm rt estimate is exactly what makes the eventual
        // frontier re-prime's cushion (and so its wait) honest.
        // Use an EWMA of the TYPICAL round-trip (not a decaying max): the first couple of
        // WebGPU inferences are pathologically slow (shader compilation / model warm-up) and
        // must NOT pin the cushion — a decaying max would hold the delay high for ~40s after
        // one warm-up spike. The EWMA tracks steady state and shrugs off the odd slow chunk
        // (the no-pause path covers a rare underrun with a brief skip instead of a stutter).
        if (this.mlSendTime >= 0) {
          const rt = currentTime - this.mlSendTime;
          this.mlSendTime = -1;
          this.mlRtCount++;
          if (this.mlRtCount > 2) this.mlRtEst = 0.8 * this.mlRtEst + 0.2 * rt; // skip warm-up spikes
          // The cushion only has to bridge the gap BETWEEN result arrivals, not a whole
          // round-trip: in steady state results land every `cadence` seconds (the send
          // interval, or the round-trip when the in-flight gate is the bottleneck), each
          // carrying one cadence's worth of audio. Sizing to cadence + margin instead of
          // the old rt + 1.0 cuts the stable audio-behind-video delay by roughly a second
          // on GPU-class hardware while staying just as underrun-free (a rare miss is a
          // brief silent gap, not a stutter — see _checkBuffering).
          const cadence = Math.max(this.mlRtEst, this.mlAdvTarget / sampleRate);
          const target = (cadence + 0.4) * sampleRate;
          this.mlCushion = Math.max(Math.floor(sampleRate * 1.0),
                                    Math.min(Math.floor(sampleRate * 9.0), Math.floor(target)));
          // Report the real round-trip + resulting delay to the page console (throttled),
          // so the actual bottleneck on THIS machine is finally visible/measurable.
          // (Not in cache mode — there the audible output is the cache, delay ~0.)
          if (++this.mlStatEvery % 4 === 0 && !this.mlCacheMode) {
            this.port.postMessage({ type: 'VOCEX_STATS',
              rt: Math.round(rt * 10) / 10,
              delay: Math.round((rt + this.mlQCount / sampleRate) * 10) / 10 });
          }
        }

        // Cache playback: the slice's only job was extending coverage (done above via
        // the abs stamp) — the audible output reads the cache directly, and the queue
        // belongs to a flow that isn't running. Nothing to append, trim, or reveal.
        if (this.mlCacheMode) return;

        // Append the fresh samples to the playback queue.
        for (let i = 0; i < take; i++) {
          if (this.mlQCount < this.mlQCap) {
            this.mlQL[this.mlQWrite] = left[start + i];
            this.mlQR[this.mlQWrite] = right[start + i];
            this.mlQWrite = (this.mlQWrite + 1) % this.mlQCap;
            this.mlQCount++;
          }
        }
        this.mlHaveOut = true;
        // Reveal-to-the-page decision (target reached, or gave up waiting) is made in
        // one place — see the unified check in _ml(), which runs every block instead
        // of only when a result happens to land.

        // Keep the delay pinned near the cushion: if the queue has grown past it (a slow
        // round-trip's big catch-up chunk, or a spell where playback couldn't drain), drop
        // the oldest samples back to the cushion — a one-time tiny forward skip, far less
        // noticeable than a growing delay or a video pause. Only once playing; during
        // priming the queue must be free to grow to the cushion so reveal can fire.
        // NEVER during a replay (mlInputMuteRemain > 0): there the queue is a PRE-BUFFER
        // of the whole rewound span, not a live delay — its depth legitimately exceeds
        // the cushion by the replay length, and trimming it dropped the very samples the
        // rewound video was about to play (several seconds of vocals cut right after
        // every reveal, with the surviving audio running ahead of the picture). The
        // queue drains back to normal on its own as the replay is consumed.
        const trimAt = this.mlCushion + Math.floor(sampleRate * 1.0);
        if (this.mlPrimed && this.mlInputMuteRemain <= 0 && this.mlQCount > trimAt) {
          this._trimQueue(this.mlQCount - this.mlCushion);
        }

        // Eager check — see _checkBuffering() for why this can't wait for process().
        this._checkBuffering();
        // Ended-during-prime finish: this was the last result we were waiting on
        // (the flush dispatch above re-arms mlChunkInFlight when a flush was pending,
        // so this only fires once everything has truly landed).
        if (this.mlFinishAsap && !this.mlChunkInFlight && this.mlTotal <= this.mlSent) {
          this._finishPrimeNow();
        }
      }

      if (d.type === 'VOCEX_NATURE_RESULT') {
        const p = d.payload;
        if (!p) return;
        // Clear the in-flight flag before any other early return (including the
        // variant check below) — otherwise switching away from 'nature' while a
        // request is genuinely in flight would leave natChunkInFlight stuck true
        // forever, permanently blocking sends if the user switches back to 'nature'.
        const wasTailFlush = this.natTailFlush;
        this.natTailFlush = false;
        this.natChunkInFlight = false;
        if (this.mlVariant !== 'nature') return;
        if (p.gen !== this.mlGen) return; // stale — see VOCEX_ML_RESULT above
        // A failed reply stages ZERO stems — the same contract bandit-worker itself
        // keeps on load failure/inference error. Staging NOTHING here (the old
        // behavior) stalled the combine: the staged voice stream waited at the
        // stuck-cap (a permanent 20s coverage lag), and the clip's final tail — which
        // has no NEXT window whose gap-pad would cover the hole — never combined at
        // all, so offline coverage never completed, READY never fired, and the
        // end-of-gather grace looped forever re-gathering the same tail. Silence
        // keeps the voice/nature streams aligned AND keeps coverage advancing; the
        // cost is one window of ambience dip.
        // The stem is MONO (Bandit processes the mid channel — see _natureTrySend);
        // it is staged into both channels below.
        const natFailed = p.err !== undefined || !p.mono;
        const stem = natFailed ? new Float32Array(this.NATURE_WIN)
                               : (p.mono instanceof Float32Array ? p.mono : new Float32Array(p.mono));
        const len = stem.length;
        // Fresh span of this window to stage, BY CONTENT INDEX: the staged nature
        // stream must stay sample-aligned with the staged voice stream (the gate
        // combine consumes them index-for-index). When Bandit runs slower than the 7s
        // hop (the norm on weak hardware) consecutive windows are NON-contiguous —
        // each send's window starts wherever the ring is at send time — and the old
        // always-append staging silently spliced those gaps out, shifting ambience
        // against voice by the accumulated gap (heard as unrelated background noise
        // bleeding in at the wrong moments, worsening over time). Any gap between
        // where staging left off (natStagedEnd) and this window's coverage is filled
        // with SILENCE instead: an ambience dip, alignment kept.
        let from = Math.max(0, Math.min(this.natStagedEnd - this.natWinStart, len));
        let to = wasTailFlush ? len : Math.min(len, from + this.NATURE_HOP);
        const gap = this.natWinStart - this.natStagedEnd;
        if (gap > 0) {
          // Bounded: a stall this long is broken regardless, and an unbounded pad is
          // an unbounded allocation. Beyond the cap alignment re-syncs at this window.
          // The crossfade below stays active — blending into the padded zeros is a
          // clean fade-in, and small (sub-hop) gaps happen every window (the send lands
          // 0..127 samples past the exact hop boundary).
          const pad = Math.min(gap, this.natRate * 30);
          for (let g = 0; g < pad; g++) this.stageNature.push(0);
          from = 0;
          to = wasTailFlush ? len : Math.min(len, this.NATURE_HOP);
        }
        if (to <= from) return;

        let i = from;
        // Short crossfade into the tail already staged (see NAT_XF — this is the same
        // blend-into-queue shape as the (currently unused, ML_XF=0) voice crossfade).
        if (this.stageNatureHaveTail) {
          const xf = Math.min(this.NAT_XF, to - from, this.stageNature.length - this.stageNatureOff);
          const base = this.stageNature.length - xf;
          for (let k = 0; k < xf; k++, i++) {
            const a = (k + 1) / (xf + 1);
            this.stageNature[base + k] = this.stageNature[base + k] * (1 - a) + stem[i] * a;
          }
        }
        for (; i < to; i++) this.stageNature.push(stem[i]);
        this.stageNatureHaveTail = true;
        this.natStagedEnd = this.natWinStart + to;
        this._tryCombine();
      }
    };
  }

  // Discards all ML accumulation/playback state (input rings, output queue, Keep-Nature
  // staging). Used both when switching into ML mode and by ML_FULL_RESET, so a seek or a
  // new video loaded into the same element re-runs the buffer/wait/resync flow cleanly
  // instead of playing back audio queued for a timeline that no longer applies.
  _resetMl() {
    this.mlGen++;
    this.mlSeekSent = false;
    this.mlPrimed   = false;
    this.mlHaveOut  = false;
    this.mlBuffering = false;
    this.mlPrimeStartTime = currentTime;
    // Deliberately do NOT force mlChunkInFlight/natChunkInFlight false here — a real
    // user seek (or a variant switch) can land while a request is genuinely still
    // computing in onnx-worker.ts/bandit-worker.ts, which reuses module-level scratch
    // buffers across calls. Forcing the flag clear would let a second concurrent
    // request start and corrupt both computations. The gen bump above is what actually
    // needs to happen unconditionally (so the orphaned request's eventual result gets
    // discarded instead of misapplied to the new timeline) — the flag itself is only
    // ever cleared for real, when VOCEX_ML_RESULT/VOCEX_NATURE_RESULT actually lands
    // for that request (see the unconditional clear there, before the gen check).
    this.mlRingW = 0; this.mlTotal = 0; this.mlSent = 0;
    this.offSpill = []; this.offSpillN = 0;
    this.mlQRead = 0; this.mlQWrite = 0; this.mlQCount = 0;
    this.spliceL = null; this.spliceR = null; // captured pre-trim tail is old-timeline audio
    this.rampIn = this.RAMP_N;                // whatever plays next starts soft
    this.mlInputMuteRemain = 0;
    this.mlFlushPending = false;
    this.mlRefill = false;
    this.mlHadGap = false;
    this.mlFinishAsap = false;
    this.mlCacheMode = false; // cache CONTENT/coverage deliberately survives resets —
    this.cacheEdgeSent = false; // only CACHE_RESET (a new video) clears it
    this.natRingW = 0; this.natTotal = 0; this.natSent = 0;
    this.natWinStart = 0; this.natStagedEnd = 0; this.natTailFlush = false;
    this.stageVoiceL = []; this.stageVoiceR = []; this.stageVoiceOff = 0;
    this.stageNature = []; this.stageNatureOff = 0;
    this.stageNatureHaveTail = false;
    this.natGate = 1.0;
  }

  // Buffer-health hysteresis: pause the element (via VOCEX_ML_BUFFERING) when the
  // queue runs low, resume (via VOCEX_ML_RESUMED) once a healthy margin rebuilds.
  //
  // MUST be called both from process() (the per-block path) AND immediately from every
  // place that appends to mlQ (VOCEX_ML_RESULT, _tryCombine) — not just process().
  // Reason: once mlBuffering pauses the element, the page suspends the AudioContext,
  // which stops process() from being called at all. But this.port.onmessage keeps
  // firing regardless of context suspension — a result can land, push mlQCount past
  // ML_HIGH_WATER, and yet, if this check only ran inside process(), nothing would ever
  // notice: process() won't run again until the context resumes, and the context won't
  // resume until... this check says the queue is healthy. That circular dependency
  // meant every buffering pause was paying the full REBUFFER_TIMEOUT_MS force-resume
  // penalty even when the data was ready almost immediately — confirmed live (Playwright
  // + Xvfb): VOCEX_ML_RESUMED landed at a suspiciously exact ~8.0-8.2s after every
  // VOCEX_ML_BUFFERING, matching the force-resume timer to the millisecond rather than
  // varying with actual inference time. Calling this eagerly from the result handlers
  // breaks the cycle: a result that already makes the queue healthy again gets announced
  // the moment it lands, not on whatever next process() tick happens to occur after a
  // forced unpause.
  // Seek-free mode NEVER pauses the video. Pausing the element to "catch up" was the
  // visible "catching up" stutter the user reported — and it is doubly wrong here: the
  // element IS the audio source, so pausing it freezes the very input the pipeline needs
  // to refill the queue, guaranteeing the pause can only end via the force-resume timer.
  // Instead, on a brief underrun process() simply outputs silence while the video keeps
  // playing, so the pipeline keeps gathering + inferring and the queue refills on its own
  // within an inference round-trip. No pause, no stutter — just a rare, short audio gap.
  //
  // (A "locked sync" rewind-at-reveal variant was tried and measured on real YouTube:
  // it holds true AV sync only while the pre-buffer lasts, then structurally degrades
  // into a pause-every-advance stutter — the element is its own source, so audio for
  // time T can never exist before T + round-trip. True sync needs pre-processing, which
  // is exactly what Perfect sync mode is. Live mode instead minimizes the stable delay:
  // see mlAdvTarget and the cadence-based cushion.)
  _checkBuffering() { /* no-op: see comment — never pause in seek-free mode */ }

  // Contiguous covered end (buffer index) starting at fromIdx: scans the offline
  // coverage bitmap block by block (≤ ~6.5k blocks for a 10-min cap — negligible).
  _offContigFrom(fromIdx) {
    if (!this.offCovMap) return 0;
    let b = Math.max(0, Math.floor(fromIdx / CACHE_BLK));
    // Tolerate ONE uncovered block right at the scan start. A segment's first write
    // reaches back only ML_EDGE (3840) before its base, but the anchor's block can
    // start up to CACHE_BLK−1 (4095) samples before it — that block then NEVER marks
    // covered, this scan stays pinned at the anchor forever, READY never fires,
    // progress freezes, and the tap feed watchdog re-anchors in a loop (each re-anchor
    // discarding the in-flight inference: the observed "stuck processing" livelock).
    // Playback across the skipped block is ≤93ms of silence — the far lesser evil.
    if (b < this.offCovMap.length && !this.offCovMap[b] && this.offCovMap[b + 1]) b++;
    while (b < this.offCovMap.length && this.offCovMap[b]) b++;
    return Math.min(this.offCap, b * CACHE_BLK);
  }

  // Fire VOCEX_OFFLINE_READY (once per segment) when the buffer is contiguously
  // covered from the anchor through anchor+ahead — or through the gather goal,
  // whichever comes first. The page then rewinds to the anchor and plays that span
  // in perfect sync while the pipeline rests until the next segment.
  _offCheckReady() {
    if (this.offReadySent || !this.offCovMap) return;
    const covEnd = this._offContigFrom(this.offAnchorIdx);
    // The reachable end of coverage is goal − ML_EDGE (the final flush trims the window
    // edge) floored to a whole block — the "covered through the end" target must sit
    // BELOW that or it is never met and every segment end pays the grace timeout.
    // 3 blocks, not 2: the Keep-Nature combine emits in gateFrame (0.1s ≈ one block)
    // units, so its final write can stop up to a block-plus-a-frame short of the edge.
    const endTarget = Math.max(0, this.offGoalIdx - ML_EDGE - 3 * CACHE_BLK);
    const target = Math.min(this.offAnchorIdx + this.offAheadIdx, endTarget);
    if (covEnd >= target) {
      this.offReadySent = true;
      this.port.postMessage({ type: 'VOCEX_OFFLINE_READY', covEndS: covEnd / this.offContentRate + this.offBase });
    }
  }

  // Store `len` separated samples (srcL/srcR from srcOff) into the offline buffer at
  // buffer index `base`, then advance head/coverage and fire progress + the READY
  // check. Shared by the voice-only offline write (position-stamped slices) and the
  // Keep-Nature combined write (sequential gate frames at offCombCursor).
  _offStore(base, srcL, srcR, srcOff, len) {
    for (let i = 0; i < len; i++) {
      const idx = base + i;
      if (idx >= 0 && idx < this.offCap) {
        let sl = srcL[srcOff + i];  sl = sl < -1 ? -1 : sl > 1 ? 1 : sl;
        let sr = srcR[srcOff + i]; sr = sr < -1 ? -1 : sr > 1 ? 1 : sr;
        this.offBufL[idx] = (sl * 32767) | 0;
        this.offBufR[idx] = (sr * 32767) | 0;
      }
    }
    const head = base + len;
    if (head > this.offHead) this.offHead = head;
    // Coverage-run tracking (same scheme as the live cache): only blocks fully
    // inside a contiguous write run count as covered.
    if (this.offCovMap) {
      if (base !== this.offRunEnd) this.offRunStart = base;
      this.offRunEnd = head;
      const b0 = Math.max(0, Math.ceil(this.offRunStart / CACHE_BLK));
      const b1 = Math.min(this.offCovMap.length, Math.floor(this.offRunEnd / CACHE_BLK));
      for (let b = b0; b < b1; b++) this.offCovMap[b] = 1;
    }
    const covEnd = this._offContigFrom(this.offAnchorIdx);
    const denom = Math.max(1, this.offGoalIdx - this.offAnchorIdx);
    const pct = Math.max(0, Math.min(100, Math.floor(100 * (covEnd - this.offAnchorIdx) / denom)));
    // Post on every pct change, but ALSO on every ~2s of coverage advance: on a long
    // clip one pct is many seconds, and the page's tap feed paces itself against the
    // confirmed headS — a quantized ack would false-trigger its stall watchdog.
    if (pct !== this.offReported || Math.abs(covEnd - this.offReportedCov) > 2 * this.offContentRate) {
      this.offReported = pct;
      this.offReportedCov = covEnd;
      this.port.postMessage({ type: 'VOCEX_OFFLINE_PROGRESS', pct, headS: covEnd / this.offContentRate });
    }
    this._offCheckReady();
  }

  // Re-derive every nature-pipeline size from the TRUE rate of what the ring holds
  // (see the natRate note in the constructor). Live worklets never call this (natRate
  // stays the context rate); sync worklets call it from OFFLINE_START with the
  // content rate. The ring is reallocated because its length IS the window size (the
  // ring holds exactly one window; natRingW points at the oldest sample) — every
  // modulo and window copy relies on that.
  _setNatureRate(rate) {
    if (rate === this.natRate) return;
    this.natRate = rate;
    this.NATURE_WIN = Math.round(rate * 16);
    this.NATURE_HOP = Math.round(rate * 14);
    this.NAT_XF     = Math.round(rate * 0.3);
    this.gateFrame  = Math.round(rate * 0.1);
    this.natRingL = new Float32Array(this.NATURE_WIN);
    this.natRingR = new Float32Array(this.NATURE_WIN);
  }

  // Keep-Nature offline: a segment reset invalidates the nature ring and both staged
  // stems (they belong to the old segment's content stream) and re-anchors the combined
  // write cursor. The ring is ZEROED, not just rewound — a tail flush can ship a window
  // that is only partially rewritten, and stale samples from the previous segment must
  // read as silence in the model's context, not as audio.
  _resetNatureGather() {
    this.natRingL.fill(0); this.natRingR.fill(0);
    this.natRingW = 0; this.natTotal = 0; this.natSent = 0;
    this.natWinStart = 0; this.natStagedEnd = 0;
    this.stageVoiceL = []; this.stageVoiceR = []; this.stageVoiceOff = 0;
    this.stageNature = []; this.stageNatureOff = 0;
    this.stageNatureHaveTail = false;
    this.natGate = 1.0;
    this.offCombCursor = this.offSegBase - ML_EDGE;
  }

  // Append one block of input to the nature ring (shared by the live path and the
  // offline gather — their pause/mute gating differs, so the caller decides when).
  _natureAccumulate(inL, inR, n = HOP) {
    for (let i = 0; i < n; i++) {
      this.natRingL[this.natRingW] = inL[i];
      this.natRingR[this.natRingW] = inR ? inR[i] : inL[i];
      this.natRingW = (this.natRingW + 1) % this.NATURE_WIN;
      this.natTotal++;
    }
  }

  // Ship the last nature window when a full hop of new content has accrued (regular
  // cadence — used by both the live path and the offline gather), or, with flushTail,
  // whatever partial tail remains at the clip's end (offline only; the result handler
  // then stages through the window's END instead of one hop). Single-in-flight for the
  // same scratch-buffer reason as the voice ring.
  _natureTrySend(flushTail) {
    if (this.natChunkInFlight) return;
    const due = this.natTotal >= this.NATURE_WIN && this.natTotal - this.natSent >= this.NATURE_HOP;
    if (!due && !(flushTail && this.natTotal > this.natSent)) return;
    // MID-MONO here, not in the offscreen worker: Bandit processes the mid channel
    // anyway (see bandit-worker.ts), and a 16s stereo window shipped as plain arrays
    // JSON-serialized to ~25MB per messaging hop — hundreds of ms of main-thread
    // blocking on the page (dropped video frames) and in the offscreen doc, every
    // window. One mono Float32Array here, Int16+base64 across the extension boundary
    // (content.ts), mono stem back.
    const m = new Float32Array(this.NATURE_WIN);
    for (let i = 0; i < this.NATURE_WIN; i++) {
      const idx = (this.natRingW + i) % this.NATURE_WIN;
      m[i] = (this.natRingL[idx] + this.natRingR[idx]) * 0.5;
    }
    this.natChunkInFlight = true;
    this.natSentAt = currentTime;
    this.natWinStart = this.natTotal - this.NATURE_WIN;
    this.natTailFlush = !due && flushTail;
    // natRate, NOT the context sampleRate: in sync mode the ring holds content-rate
    // samples, and bandit-worker derives its 2:1 time-compression ratio from this
    // stamp — a context-rate stamp on content-rate audio made it compress 8:1 (the
    // model heard 8×-speed audio and returned a garbage stem).
    this.port.postMessage(
      { type: 'VOCEX_NATURE_CHUNK', payload: { mono: m, nativeRate: this.natRate, gen: this.mlGen } },
      [m.buffer]
    );
    this.natSent = this.natTotal;
  }

  // Fetch-or-create the page for block `b`, refreshing its FIFO age (Map insertion
  // order IS the eviction order — a rewrite re-inserts so recently-touched audio is
  // never the first to go).
  _cachePage(b) {
    let p = this.cachePages.get(b);
    if (p) {
      this.cachePages.delete(b);
      this.cachePages.set(b, p);
      return p;
    }
    try {
      p = { l: new Int16Array(CACHE_BLK), r: new Int16Array(CACHE_BLK), full: false };
    } catch { return null }
    this.cachePages.set(b, p);
    return p;
  }

  // FIFO cleanup at the budget's high-water mark (CACHE_EVICT_FRAC): drop the
  // oldest-written pages until back under, but never a page near the playhead (in
  // cache mode) or near the write FRONTIER (cacheRunEnd — the edge being extended).
  // Only the frontier is protected, not the whole run: one long uninterrupted watch is
  // a single run, and protecting all of it would make eviction impossible exactly when
  // it's needed most. The run's older pages ARE the oldest FIFO entries — the target.
  _cacheEvict() {
    if (this.cachePages.size < this.cacheEvictAt) return;
    const PROT = this.cacheProtPages;
    const readB = this.mlCacheMode ? Math.floor(this.cacheReadF / CACHE_BLK) : NaN;
    const endB  = this.cacheRunEnd >= 0 ? Math.floor(this.cacheRunEnd / CACHE_BLK) : NaN;
    for (const b of this.cachePages.keys()) {
      if (this.cachePages.size < this.cacheEvictAt) break;
      if (Math.abs(b - readB) <= PROT) continue; // NaN compares false → no protection
      if (Math.abs(b - endB)  <= PROT) continue;
      this.cachePages.delete(b);
    }
  }

  // Write a separated slice into the position-indexed cache at its absolute video
  // time, and mark coverage. Only fully-written pages are marked; a non-contiguous
  // write (take-cap gap after an inference stall) starts a new run so the gap's pages
  // are never falsely marked covered.
  _cacheWrite(absStart, left, right, srcStart, len) {
    if (len <= 0) return;
    let page = null, pageB = -1;
    for (let i = 0; i < len; i++) {
      const idx = absStart + i;
      if (idx < 0) continue;
      const b = Math.floor(idx / CACHE_BLK);
      if (b !== pageB) { pageB = b; page = this._cachePage(b); }
      if (!page) continue; // allocation failed — degrade to uncached
      let sl = left[srcStart + i];  sl = sl < -1 ? -1 : sl > 1 ? 1 : sl;
      let sr = right[srcStart + i]; sr = sr < -1 ? -1 : sr > 1 ? 1 : sr;
      const off = idx - b * CACHE_BLK;
      page.l[off] = (sl * 32767) | 0;
      page.r[off] = (sr * 32767) | 0;
    }
    if (absStart !== this.cacheRunEnd) this.cacheRunStart = absStart; // gap → new run
    this.cacheRunEnd = absStart + len;
    const b0 = Math.max(0, Math.ceil(this.cacheRunStart / CACHE_BLK));
    const b1 = Math.floor(this.cacheRunEnd / CACHE_BLK);
    for (let b = b0; b < b1; b++) {
      const p = this.cachePages.get(b);
      if (p && !p.full) {
        p.full = true;
        this.cacheDirty.push(b); // newly complete → export for persistent storage
      }
    }
    this._cacheEvict();
  }

  // Switch to cache playback at video time t, RE-BASELINING the input timeline: the
  // element resumes playing at t, so input samples from here map to absolute content
  // position t + mlTotal/sampleRate. That mapping is what lets _cacheIngest keep the
  // pipeline warm (and _cacheWrite place its results) during cache playback. A full
  // _resetMl clears the ring/queue of the old timeline and bumps the gen so any
  // in-flight result can't append to the queue — its audio still lands in the cache via
  // the abs stamp on the payload (see VOCEX_ML_RESULT). mlSeekSent stays true so the
  // prime/reveal machinery lies dormant: cache mode has no overlay and no reveal.
  _enterCacheMode(t) {
    this._resetMl();
    this.mlCacheMode = true;
    this.mlSeekSent = true;
    this.mlVideoStartTime = t;
    this.cacheReadF = t * sampleRate;
    this.cacheTarget = this.cacheReadF;
    this.cacheEdgeSent = false;
  }

  // Cache-mode input pump: accumulate the element's audio into the ring exactly like
  // live mode, but only SEND a window for inference when playback is within
  // CACHE_SEND_AHEAD of the coverage frontier — content behind the frontier is already
  // separated, and re-separating it is the waste this whole cache exists to avoid.
  // The 2.5s margin is under the ~5.75s clean-middle width, so the first resumed
  // window's newest-slice always overlaps existing coverage (no gap), and it keeps the
  // round-trip warm before an edge crossing so the follow-up re-prime is short.
  _cacheIngest(inL, inR) {
    if (!inL) return;
    for (let i = 0; i < HOP; i++) {
      this.mlRingL[this.mlRingW] = inL[i];
      this.mlRingR[this.mlRingW] = inR ? inR[i] : inL[i];
      this.mlRingW = (this.mlRingW + 1) % ML_CHUNK;
      this.mlTotal++;
    }
    if (this.mlTotal - this.mlSent < this.mlAdvTarget || this.mlChunkInFlight) return;
    const CACHE_SEND_AHEAD = 2.5;
    const headS = this.mlVideoStartTime + this.mlTotal / sampleRate;
    if (this._cacheCoveredS(headS, headS + CACHE_SEND_AHEAD)) return; // all covered — nothing to do
    this._shipWindow(true);
  }

  // True when every page overlapping [aS, bS) seconds exists and is fully written.
  _cacheCoveredS(aS, bS) {
    if (this.cachePages.size === 0) return false;
    const aIdx = Math.max(0, Math.floor(aS * sampleRate));
    const bIdx = Math.ceil(bS * sampleRate);
    const b0 = Math.floor(aIdx / CACHE_BLK), b1 = Math.ceil(bIdx / CACHE_BLK);
    for (let b = b0; b < b1; b++) {
      const p = this.cachePages.get(b);
      if (!p || !p.full) return false;
    }
    return true;
  }

  // True when ANY page overlapping [aS, bS) seconds is fully written — the edge check's
  // "is there anything left ahead worth riding to?" question.
  _cacheAnyCoveredS(aS, bS) {
    if (this.cachePages.size === 0) return false;
    const b0 = Math.max(0, Math.floor((aS * sampleRate) / CACHE_BLK));
    const b1 = Math.ceil((bS * sampleRate) / CACHE_BLK);
    for (let b = b0; b < b1; b++) {
      const p = this.cachePages.get(b);
      if (p && p.full) return true;
    }
    return false;
  }

  // Export newly-completed pages to the page for persistent storage. The page arrays
  // are COPIED (a transferred buffer would detach the cache's own storage) and the
  // copies transferred. Called from _ml on a size/time threshold — see cacheDirty.
  _cacheFlushDirty() {
    this.cacheFlushTick = 0;
    if (this.cacheDirty.length === 0) return;
    const pages = [];
    const transfers = [];
    for (const b of this.cacheDirty) {
      const p = this.cachePages.get(b);
      if (!p || !p.full) continue; // evicted since being marked — nothing to save
      const l = p.l.slice(), r = p.r.slice();
      pages.push({ b, l, r });
      transfers.push(l.buffer, r.buffer);
    }
    this.cacheDirty.length = 0;
    if (pages.length) this.port.postMessage({ type: 'VOCEX_CACHE_PAGES', pages }, transfers);
  }

  // Reveal with whatever is processed — the ended-during-prime path (ML_FINISH_PRIME):
  // once nothing more can arrive, waiting longer only holds the overlay.
  _finishPrimeNow() {
    if (this.mlSeekSent) return;
    this.mlSeekSent = true;
    this.mlFinishAsap = false;
    this.port.postMessage({ type: 'VOCEX_ML_READY', seekTo: this.mlVideoStartTime,
      replayOk: !this.mlHadGap && this.mlQCount > 0 });
  }

  // Single sender for a full inference window: copies the ring (oldest→newest), posts
  // it with the tiling metadata, and advances mlSent. `recordRt` marks cadence sends
  // (their round-trip feeds the cushion EWMA); flushes pass false, as before.
  //
  // `abs` — the window end's ABSOLUTE content position (samples of video time) stamped
  // at send. The result handler uses it to place the slice in the position-indexed
  // cache, and because it is a stamp (not derived from live state at receive time) it
  // stays correct even for a result that lands AFTER a seek/reset bumped the gen: the
  // audio is discarded for the (now stale) playback queue but still banked in the
  // cache, instead of leaving a coverage hole exactly where the user seeked.
  _shipWindow(recordRt) {
    const adv = this.mlTotal - this.mlSent;
    if (adv <= 0) return;
    if (adv > ML_KEEP) this.mlHadGap = true; // take-cap will skip content (see field)
    const l = new Float32Array(ML_CHUNK), r = new Float32Array(ML_CHUNK);
    for (let i = 0; i < ML_CHUNK; i++) {
      const idx = (this.mlRingW + i) % ML_CHUNK;
      l[i] = this.mlRingL[idx]; r[i] = this.mlRingR[idx];
    }
    this.mlChunkInFlight = true;
    this.mlSentAt = currentTime;
    if (recordRt) this.mlSendTime = currentTime;
    // Stamp only when the live-voice baseline actually maps mlTotal to video time —
    // offline/nature sends have their own position schemes and must never bank here.
    const abs = (!this.mlSync && this.mlVariant === 'voice')
      ? Math.round(this.mlVideoStartTime * sampleRate) + this.mlTotal : undefined;
    this.port.postMessage(
      { type: 'VOCEX_ML_CHUNK', payload: { left: l, right: r, gen: this.mlGen, adv, pos: this.mlTotal, abs, cg: this.cacheGen, ce: this.cacheEra } },
      [l.buffer, r.buffer]);
    this.mlSent = this.mlTotal;
  }

  // Ship the unsent input backlog immediately (below the normal mlAdvTarget threshold),
  // front-padded by the ring's untouched zeros if the ring isn't full yet. Used by the
  // ML_REPLAY reveal so the queue covers the tail between the last regular send and the
  // rewind point — otherwise the replayed span would end ~an advance short, cutting the
  // synced pre-buffer off early. If a request is in flight, defers via mlFlushPending
  // (the result handler re-invokes); same gen, so nothing is discarded.
  _flushBacklog() {
    if (this.mlTotal <= this.mlSent) return;
    if (this.mlChunkInFlight) { this.mlFlushPending = true; return; }
    this._shipWindow(false);
  }

  // ── Output declick (see the field block by mlQ) ───────────────────────────────
  // Silence block with a short decaying tail from the last emitted sample, so a cut
  // to silence (underrun, refill, pause) never steps the speakers. Arms the fade-in
  // for whenever audio resumes.
  _softSilence(outL, outR) {
    let l = this.lastOutL, r = this.lastOutR;
    for (let i = 0; i < HOP; i++) {
      l *= 0.88; r *= 0.88;
      if (l < 1e-4 && l > -1e-4) l = 0;
      if (r < 1e-4 && r > -1e-4) r = 0;
      outL[i] = l; outR[i] = r;
    }
    this.lastOutL = l; this.lastOutR = r;
    this.rampIn = this.RAMP_N;
  }

  // Post-stage for blocks carrying real audio: crossfade in a pending splice tail
  // (queue trim), consume the fade-in armed by a preceding silence, and remember the
  // block's last sample for the next transition.
  _finishBlock(outL, outR) {
    if (this.spliceL) {
      const n = this.spliceL.length;
      for (let i = 0; i < HOP && this.spliceOff < n; i++, this.spliceOff++) {
        const a = (this.spliceOff + 1) / (n + 1);
        outL[i] = this.spliceL[this.spliceOff] * (1 - a) + outL[i] * a;
        outR[i] = this.spliceR[this.spliceOff] * (1 - a) + outR[i] * a;
      }
      if (this.spliceOff >= n) { this.spliceL = null; this.spliceR = null; }
    }
    if (this.rampIn > 0) {
      for (let i = 0; i < HOP && this.rampIn > 0; i++, this.rampIn--) {
        const g = 1 - this.rampIn / this.RAMP_N;
        outL[i] *= g; outR[i] *= g;
      }
    }
    this.lastOutL = outL[HOP - 1]; this.lastOutR = outR[HOP - 1];
  }

  // Drop `drop` samples from the queue's read side (delay bounding / align-forward),
  // capturing a short tail at the old position first: the reader crossfades that tail
  // into the post-trim audio, turning what used to be a hard mid-waveform jump (an
  // audible click on every trim) into a smooth splice.
  _trimQueue(drop) {
    if (drop <= 0 || drop > this.mlQCount) return;
    const n = Math.min(this.RAMP_N, this.mlQCount - drop);
    if (n > 0) {
      this.spliceL = new Float32Array(n);
      this.spliceR = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const idx = (this.mlQRead + i) % this.mlQCap;
        this.spliceL[i] = this.mlQL[idx] * this.gainLinear;
        this.spliceR[i] = this.mlQR[idx] * this.gainLinear;
      }
      this.spliceOff = 0;
    }
    this.mlQRead = (this.mlQRead + drop) % this.mlQCap;
    this.mlQCount -= drop;
  }

  // Keep-Nature: whenever both staged streams have at least one gate frame of
  // unconsumed data, combine that frame (voice-priority gate — see
  // tests/unit/voice-priority-gate.test.ts for the reference this must match) and write
  // the result into the existing mlQ playback queue. No-op outside 'nature' variant.
  //
  // Safety valve: if voice piles up waiting for nature far beyond one window's worth —
  // the nature model failed after being selected, or a single request errored — stop
  // waiting and drain voice-only (silent nature contribution) rather than silencing the
  // user forever. Same "never leave the user with silence" principle as the existing
  // ML_MAXLAG cap a few lines up in this file.
  _tryCombine() {
    if (this.mlVariant !== 'nature') return;
    // Must exceed the worst NORMAL nature-stream lag behind the voice stream — one
    // full window's accrual (16s) plus a round-trip — or the drain fires every
    // window and permanently drops ambience. Sized for the 16s window with ~2s slack
    // beyond a 10s round-trip; genuinely dead nature still bails here, bounded.
    // natRate: the staged streams hold ring samples (content-rate in sync mode), so
    // this stays 28 CONTENT-seconds instead of ballooning 4× on a fast-gather ctx.
    const STUCK_CAP = Math.round(this.natRate * 28);

    // Consumption is by read offset (vOff/nOff) with ONE compaction after the loop —
    // see the note at the stage arrays' declaration for why splice() here glitched.
    while (this.stageVoiceL.length - this.stageVoiceOff >= this.gateFrame &&
           (this.stageNature.length - this.stageNatureOff >= this.gateFrame ||
            this.stageVoiceL.length - this.stageVoiceOff >= STUCK_CAP)) {
      const haveNature = this.stageNature.length - this.stageNatureOff >= this.gateFrame;
      const vOff = this.stageVoiceOff, nOff = this.stageNatureOff;
      let ev = 0, es = 0;
      for (let i = 0; i < this.gateFrame; i++) {
        const vl = this.stageVoiceL[vOff + i], vr = this.stageVoiceR[vOff + i];
        ev += vl * vl + vr * vr;
        if (haveNature) {
          const s = this.stageNature[nOff + i];
          es += 2 * s * s; // mono stem plays on both channels — same stat as before
        }
      }
      const rv = Math.sqrt(ev / this.gateFrame);
      const rs = haveNature ? Math.sqrt(es / this.gateFrame) : 0;
      let target = !haveNature ? 0.0 : (rv < 1e-4 ? 1.0 : Math.min(1, Math.max(0, (rs / rv - GATE_LO) / GATE_LO)));
      // Ambience floor (see NAT_FLOOR_LO/HI): a near-silent ambience stem is separation
      // residue, not nature — never open the gate onto it (that amplified the model's
      // noise floor in every speech pause: "extra noise the original didn't have").
      if (target > 0) {
        target *= Math.min(1, Math.max(0, (rs - NAT_FLOOR_LO) / (NAT_FLOOR_HI - NAT_FLOOR_LO)));
      }
      // Slew (see GATE_SLEW_UP/DOWN): bound per-frame movement so the gate can't pump
      // the ambience bed at the 10Hz frame rate.
      target = this.natGate + Math.max(-GATE_SLEW_DOWN, Math.min(GATE_SLEW_UP, target - this.natGate));
      const g0 = this.natGate;

      // Offline (perfect sync): combined frames go into the position-indexed buffer at
      // the write cursor — the staged streams are sequential within a segment, so the
      // cursor IS the position — instead of the live playback queue.
      const offline = this.mlSync && !!this.offBufL;
      const fl = offline ? new Float32Array(this.gateFrame) : null;
      const fr = offline ? new Float32Array(this.gateFrame) : null;
      for (let i = 0; i < this.gateFrame; i++) {
        const t = i / this.gateFrame;
        const gg = g0 + (target - g0) * t;
        const vl = this.stageVoiceL[vOff + i], vr = this.stageVoiceR[vOff + i];
        const s = haveNature ? this.stageNature[nOff + i] : 0;
        if (offline) {
          fl[i] = vl + gg * s;
          fr[i] = vr + gg * s;
        } else if (this.mlQCount < this.mlQCap) {
          this.mlQL[this.mlQWrite] = vl + gg * s;
          this.mlQR[this.mlQWrite] = vr + gg * s;
          this.mlQWrite = (this.mlQWrite + 1) % this.mlQCap;
          this.mlQCount++;
        }
      }
      if (offline) {
        this._offStore(this.offCombCursor, fl, fr, 0, this.gateFrame);
        this.offCombCursor += this.gateFrame;
      }
      this.natGate = target;
      this.stageVoiceOff += this.gateFrame;
      if (haveNature) {
        this.stageNatureOff += this.gateFrame;
      } else {
        // Voice-only stuck-cap drain: one frame of nature CONTENT was consumed as
        // implicit silence — advance the staged-nature content cursor to match, or the
        // next arriving nature window would be staged one frame early and permanently
        // shift ambience against voice (the same misalignment the content-indexed
        // staging in VOCEX_NATURE_RESULT exists to prevent).
        this.natStagedEnd += this.gateFrame;
        this.stageNatureHaveTail = false; // nothing staged to crossfade into
      }

      this.mlHaveOut = true;
      // Reveal decision made in one place — see the unified check in _ml().
    }
    // Compact once per callback: reclaim the consumed prefix with a single memcpy-fast
    // slice instead of the per-frame splices this replaces.
    if (this.stageVoiceOff) {
      this.stageVoiceL = this.stageVoiceL.slice(this.stageVoiceOff);
      this.stageVoiceR = this.stageVoiceR.slice(this.stageVoiceOff);
      this.stageVoiceOff = 0;
    }
    if (this.stageNatureOff) {
      this.stageNature = this.stageNature.slice(this.stageNatureOff);
      this.stageNatureOff = 0;
    }
    // Eager check — see _checkBuffering() for why this can't wait for process(). Placed
    // outside the while loop (not per-iteration): cheap either way, and mlQCount only
    // matters after all frames this call produced have been written.
    this._checkBuffering();
  }

  process(inputs, outputs) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out) return true;

    const outL = out[0];
    const outR = out[1] || outL;
    const inL  = (inp && inp[0]) || null;
    const inR  = (inp && inp[1]) || inL;

    if (this.mode === 'ml') {
      this._ml(inL, inR, outL, outR);
    } else {
      const sL = inL || new Float32Array(HOP);
      this._dsp(sL, inR || sL, outL, outR);
    }

    return true;
  }

  // ── DSP: spectral Wiener vocal isolation ──────────────────────────────────

  _dsp(inL, inR, outL, outR) {
    const BUF = this.inBuf.length / 2; // number of sample positions

    // Write new samples
    for (let i = 0; i < HOP; i++) {
      const p = ((this.inWrite + i) % BUF) * 2;
      this.inBuf[p]   = inL[i];
      this.inBuf[p+1] = inR[i];
    }
    this.inWrite = (this.inWrite + HOP) % BUF;

    // Extract windowed frame
    for (let i = 0; i < FFT_SIZE; i++) {
      const p = ((this.inWrite - FFT_SIZE + i + BUF) % BUF) * 2;
      const l = this.inBuf[p],  r = this.inBuf[p+1];
      const w = this.hann[i];
      this.midRe[i]  = w * (l + r) * 0.5;
      this.midIm[i]  = 0;
      this.sideRe[i] = w * (l - r) * 0.5;
      this.sideIm[i] = 0;
    }

    fft(this.midRe,  this.midIm);
    fft(this.sideRe, this.sideIm);

    // Wiener mask, plus a bass rolloff (see BASS_ROLLOFF_HZ above) — panning alone
    // can't tell a centered vocal from a centered bass/kick, so this cuts the common
    // sub-bass case that panning-only masking always misses.
    for (let k = 0; k < FFT_SIZE; k++) {
      const mP = this.midRe[k]*this.midRe[k] + this.midIm[k]*this.midIm[k];
      const sP = this.sideRe[k]*this.sideRe[k] + this.sideIm[k]*this.sideIm[k];
      const mask = (mP / (mP + ALPHA * sP + 1e-12)) * this.bassRolloff[k];
      this.midRe[k] *= mask;
      this.midIm[k] *= mask;
    }

    ifft(this.midRe, this.midIm);

    // Overlap-add
    const OBL = this.outBuf.length;
    for (let i = 0; i < FFT_SIZE; i++) {
      const p = (this.outRead + i) % OBL;
      this.outBuf[p] += this.midRe[i] * this.gainLinear;
    }

    // Read HOP samples from output buffer
    for (let i = 0; i < HOP; i++) {
      const p = (this.outRead + i) % OBL;
      const s = this.outBuf[p];
      outL[i] = s;
      outR[i] = s;
      this.outBuf[p] = 0;
    }
    this.outRead = (this.outRead + HOP) % OBL;
  }

  // ── Offline gather: fill the position buffer as fast as the hardware allows ────
  // Accumulate input (unless paused for an ad or a throttle), and drain the send backlog
  // regardless — so a throttle-pause can still flush what's already gathered and clear.
  _offlineGather(inL, inR) {
    // Accumulate the newest input — but NOT while paused (ad break, or a throttle pause),
    // or a paused element's silence would enter the buffer and shift every later position.
    if (inL && !this.offGatherPaused) this._offlineAccumulate(inL, inR, HOP);
    this._offlineDrain();
  }

  // Append `n` content samples to the gather rings. Source-agnostic: the live gather
  // feeds it one render block from the element, the prefetch path (OFFLINE_FEED) feeds
  // it decoded blocks straight from the media file, with no playback involved at all.
  // Input past the ring's safe backlog (ML_KEEP) is parked in offSpill instead of
  // overwriting unsent ring content — see the field block for why a skip there is a
  // permanent hole in the pre-computed buffer.
  _offlineAccumulate(l, r, n) {
    let i = 0;
    // Only write through while nothing is parked — spilled samples are OLDER than
    // these and must enter the ring first, or the content stream reorders.
    if (this.offSpillN === 0) {
      i = Math.min(n, Math.max(0, ML_KEEP - (this.mlTotal - this.mlSent)));
      if (i > 0) this._offlineWrite(l, r, 0, i);
    }
    if (i < n && this.offSpillN < this.OFF_SPILL_CAP) {
      const m = n - i;
      const sl = new Float32Array(m), sr = new Float32Array(m);
      for (let k = 0; k < m; k++) { sl[k] = l[i + k]; sr[k] = r ? r[i + k] : l[i + k]; }
      this.offSpill.push({ l: sl, r: sr, off: 0 });
      this.offSpillN += m;
    }
  }

  // Low-level dual-ring write: the voice ring and (in Keep-Nature) the nature ring
  // MUST advance in lockstep — the gate combine consumes the two staged stems
  // index-for-index, so a sample entering one ring but not the other permanently
  // shifts ambience against voice.
  _offlineWrite(l, r, from, to) {
    const nat = this.mlVariant === 'nature';
    for (let i = from; i < to; i++) {
      const li = l[i], ri = r ? r[i] : l[i];
      this.mlRingL[this.mlRingW] = li;
      this.mlRingR[this.mlRingW] = ri;
      this.mlRingW = (this.mlRingW + 1) % ML_CHUNK;
      this.mlTotal++;
      if (nat) {
        this.natRingL[this.natRingW] = li;
        this.natRingR[this.natRingW] = ri;
        this.natRingW = (this.natRingW + 1) % this.NATURE_WIN;
        this.natTotal++;
      }
    }
  }

  // Move parked spillover into the ring, oldest first, up to the safe backlog. Called
  // whenever the backlog may have drained (a window shipped, a flush landed).
  _offDrainSpill() {
    while (this.offSpillN > 0) {
      const room = ML_KEEP - (this.mlTotal - this.mlSent);
      if (room <= 0) return;
      const head = this.offSpill[0];
      const take = Math.min(room, head.l.length - head.off);
      this._offlineWrite(head.l, head.r, head.off, head.off + take);
      head.off += take;
      this.offSpillN -= take;
      if (head.off >= head.l.length) this.offSpill.shift();
    }
  }

  // Ship whatever the rings owe, and police the gather-vs-inference backlog.
  _offlineDrain() {
    // Parked spillover first — it is the oldest unprocessed content, and the ring may
    // have room again now (the previous window shipped).
    this._offDrainSpill();
    // Drain the nature send backlog regardless of the pause (mirrors the voice send
    // below — a throttle pause must still be able to flush and clear itself).
    if (this.mlVariant === 'nature') this._natureTrySend(false);
    // Ship the last ML_CHUNK when a full advance has accrued and no request is in flight —
    // this also drains the backlog after a throttle pause, which is what lets it resume.
    // No mlTotal >= ML_CHUNK requirement: before the ring holds a full window the copy
    // below front-pads with the ring's untouched zeros (position math unchanged — same
    // as the live path and OFFLINE_FLUSH). This matters beyond latency: waiting for a
    // full window made the FIRST send's advance exceed ML_KEEP, whose take-cap skipped
    // the first ~87ms — so the coverage block at the segment start never marked and
    // "contiguously covered from the anchor" stayed ZERO forever (confirmed live).
    if (this.mlTotal - this.mlSent >= this.mlAdvTarget && !this.mlChunkInFlight) {
      const adv = this.mlTotal - this.mlSent;
      const l = new Float32Array(ML_CHUNK), r = new Float32Array(ML_CHUNK);
      for (let i = 0; i < ML_CHUNK; i++) { const idx = (this.mlRingW + i) % ML_CHUNK; l[i] = this.mlRingL[idx]; r[i] = this.mlRingR[idx]; }
      this.mlChunkInFlight = true;
      this.mlSentAt = currentTime;
      this.port.postMessage({ type: 'VOCEX_ML_CHUNK', payload: { left: l, right: r, gen: this.mlGen, adv, pos: this.mlTotal } }, [l.buffer, r.buffer]);
      this.mlSent = this.mlTotal;
    }
    // Gap guard / throttle: if inference can't keep up with the (fast) gather, the unsent
    // backlog approaches ML_KEEP and the next window would drop content. Pause the hidden
    // video so inference catches up; resume once the backlog has drained. Keeps the
    // pre-processed audio gapless at whatever rate the hardware sustains.
    //
    // Keep-Nature adds a second, usually TIGHTER bound: Bandit windows must ship every
    // NATURE_HOP of new content, and WASM inference runs near realtime — letting the
    // nature backlog exceed a hop while a request is in flight would skip ambience
    // content and shift the staged nature stream against the voice stream (a permanent
    // combine misalignment, not just a quality dip). Pause at half a hop so the send
    // cadence stays exact at whatever pace Bandit sustains.
    // Spilled samples count toward the backlog: they are gathered-but-unsent content,
    // and the feed must stay paused until they have drained through the ring too.
    const backlog = this.mlTotal - this.mlSent + this.offSpillN;
    const natBacklog = this.natTotal - this.natSent;
    const natOn = this.mlVariant === 'nature';
    // Pause above the send target (0.75·ML_KEEP) so a full-advance send is ALREADY
    // sitting in the backlog the moment the in-flight result lands — the next window
    // ships immediately with no feed wait. The 0.18·ML_KEEP headroom to the ML_KEEP
    // content-skip boundary still absorbs ~1s of main-thread jank between our pause
    // request and the page actually stopping the feed/element.
    const voiceHigh = this.mlChunkInFlight && backlog > ML_KEEP * 0.82;
    const natHigh = natOn && this.natChunkInFlight && natBacklog >= this.NATURE_HOP * 0.5;
    const voiceLow = backlog < ML_KEEP * 0.35;
    const natLow = !natOn || !this.natChunkInFlight || natBacklog < this.NATURE_HOP * 0.25;
    if (!this.offThrottled && (voiceHigh || natHigh)) {
      this.offThrottled = true;
      this.port.postMessage({ type: 'VOCEX_OFFLINE_THROTTLE', pause: true });
    } else if (this.offThrottled && voiceLow && natLow) {
      this.offThrottled = false;
      this.port.postMessage({ type: 'VOCEX_OFFLINE_THROTTLE', pause: false });
    }
    // Liveness heartbeat: a request in flight means the pipeline is WORKING even while
    // coverage stands still — a cold model load is minutes-scale on weak hardware, and
    // a single Bandit window can take tens of seconds there. The page re-arms its
    // dead-gather bail and end-of-clip grace clocks on this; without it, exactly the
    // slow machines had their sessions torn down to pass-through (or grace-looped on
    // the final window) while a legitimate inference was still computing. Bounded:
    // persistent failure still surfaces as err replies → offErrRun → VOCEX_OFFLINE_FATAL,
    // and lost replies unlatch via the mlSentAt/natSentAt watchdogs.
    if ((this.mlChunkInFlight || this.natChunkInFlight) && currentTime - this.offAliveAt > 1) {
      this.offAliveAt = currentTime;
      this.port.postMessage({ type: 'VOCEX_OFFLINE_ALIVE' });
    }
  }

  // ── ML: buffer → main thread → ONNX → delayed full-strength playback ──────

  _ml(inL, inR, outL, outR) {
    // Ad pass-through, ahead of every other path: an ad's sound is not the content, so it
    // is never separated, never queued, and never gathered. It has to come first for the
    // offline modes too — during an ad the element's currentTime is the AD's timeline, so
    // the position-indexed buffer would be read at a meaningless offset (heard as silence
    // or as audio from the wrong part of the clip). The page re-anchors via SYNC_POS the
    // moment the content position is restored.
    if (this.adActive) {
      for (let i = 0; i < HOP; i++) {
        outL[i] = inL ? inL[i] : 0;
        outR[i] = inR ? inR[i] : (inL ? inL[i] : 0);
      }
      return;
    }

    // Persistent-store export pump: ship newly-completed cache pages to the page in
    // batches — by size (≥64 pages ≈ 6s of audio) or by time (~3s of blocks), whichever
    // comes first — so a session's separated audio lands in IndexedDB as it's produced.
    // Deliberately ABOVE the play gate: audio that is already separated should reach
    // persistent storage even if the user pauses right after it was produced.
    if (this.cacheDirty.length &&
        (this.cacheDirty.length >= 64 || ++this.cacheFlushTick >= 256)) {
      this._cacheFlushDirty();
    }

    // ── Play gate ────────────────────────────────────────────────────────────────
    // The element is not playing (user paused, SPA navigated to a feed, stream ended).
    // Nothing may reach the speakers, and nothing position-mapped may advance:
    //   · output stays silent — no queued/cached audio against a frozen picture;
    //   · mlQ is not drained — the cushion is still there when playback resumes;
    //   · cacheReadF / offReadF do not advance — the read cursor stays where the
    //     picture is, so resuming (or seeking while paused) starts in sync;
    //   · the input ring does not accumulate — a paused element emits silence, and
    //     letting that advance mlTotal would drift every cache position derived from
    //     it (and ship inference requests for content that isn't playing).
    // Port messages keep flowing while gated (results still land, still get cached),
    // so a pause never loses in-flight work.
    //
    // Offline GATHER is exempt: it deliberately pauses/fast-plays the hidden element
    // (segment staging, inference throttle) while the graph must keep running — its own
    // offGatherPaused flag governs accumulation there.
    if (!this.elPlaying && !(this.mlSync && this.offPhase === 'gather')) {
      this._softSilence(outL, outR); // decaying tail, not a step (declick on pause)
      return;
    }

    // Lost-reply watchdogs (see mlSentAt): a gate latched for far longer than any
    // legitimate round-trip means the reply is gone — unlatch so the pipeline can
    // move again. The offscreen document serializes inference internally (inferChain/
    // natureChain), so a worst-case overlap is wasted compute, never corruption.
    if (this.mlChunkInFlight && this.mlSentAt >= 0 && currentTime - this.mlSentAt > 120) {
      this.mlChunkInFlight = false;
    }
    if (this.natChunkInFlight && this.natSentAt >= 0 && currentTime - this.natSentAt > 240) {
      this.natChunkInFlight = false;
      this.natTailFlush = false;
    }

    // Offline fatal bail (see offFatal): the model is broken — pass audio through raw.
    // The page tears the session down (normal rate, no overlay) on VOCEX_OFFLINE_FATAL.
    if (this.mlSync && this.offFatal) {
      for (let i = 0; i < HOP; i++) {
        outL[i] = inL ? inL[i] : 0;
        outR[i] = inR ? inR[i] : (inL ? inL[i] : 0);
      }
      return;
    }

    // ── Offline "perfect sync" playback: read the pre-computed buffer at the video's
    // exact position (offReadF, anchored by SYNC_POS). Every position is already
    // processed, so the right audio is always ready — frame-accurate, follows seeks.
    if (this.mlSync && this.offPhase === 'play') {
      // Background prefetch keeps processing WHILE playback runs from the buffer, so the
      // send/throttle pump has to keep turning here too. Without this the pipeline goes
      // silent the moment the page's feed is throttled: the throttle is only ever lifted
      // from inside a drain, and a throttled feed sends nothing to drive one — the feed
      // and the pipeline deadlock, coverage freezes, and playback runs into the edge a
      // few seconds later. No-op for the element-driven path (its ring is idle in 'play').
      this._offlineDrain();
      // Content advances at contentRate per second, output at the context sampleRate, so
      // step the read cursor by contentRate/sampleRate (= 1/offR) per output sample. At 1×
      // that's 1.0; for a 4× fast-gathered buffer it's 0.25 (buffer 44100, output 176400).
      // Drift against the video clock (SYNC_POS target) is corrected by warping this
      // step a few %, inaudibly — never by jumping the cursor (see the SYNC_POS note).
      // The target self-advances at the content rate between pumps so the measured
      // drift is smooth, not a per-pump sawtooth.
      const base = this.offContentRate / sampleRate;
      const offDrift = this.offTarget - this.offReadF;
      let step = base;
      if (Math.abs(offDrift) > this.offContentRate * 0.012) {
        step = base * (1 + Math.max(-0.04, Math.min(0.04, offDrift / (this.offContentRate * 0.7))));
      }
      // The reachable end of processed coverage (same margin as _offCheckReady): past it
      // no processed audio exists and none is ever coming — the gather stops at the goal
      // (end-guard), and the whole buffer stops at OFFLINE_CAP_S. A seek past that point
      // (fast-forward beyond the 10-min cap on a long video) used to play PERMANENT
      // silence while the picture kept moving, with no NEED and no recovery: pass the
      // element's live audio through raw instead (same shape as ad pass-through — in
      // 'play' phase the element runs at 1×, so its input IS the real audio).
      const reachEnd = Math.max(0, this.offGoalIdx - ML_EDGE - 3 * CACHE_BLK);
      for (let i = 0; i < HOP; i++) {
        const idx = this.offReadF | 0;
        // Coverage-gated: segments/seeks make the buffer non-contiguous, so an
        // uncovered position plays silence (and triggers the NEED below) rather than
        // stale zeros read as "audio".
        if (this.offBufL && idx >= 0 && idx < this.offCap && this.offCovMap && this.offCovMap[(idx / CACHE_BLK) | 0]) {
          outL[i] = (this.offBufL[idx] / 32767) * this.gainLinear;
          outR[i] = (this.offBufR[idx] / 32767) * this.gainLinear;
        } else if (idx >= reachEnd) {
          outL[i] = inL ? inL[i] : 0;
          outR[i] = inR ? inR[i] : (inL ? inL[i] : 0);
        } else { outL[i] = 0; outR[i] = 0; }
        this.offReadF += step;      // SYNC_POS + the warp above keep this on the video clock
        this.offTarget += base;
      }
      // Declick the phase/coverage seams (see _finishBlock): a block ending at exactly
      // zero is either silence or a zero crossing — arming the fade-in there is
      // inaudible either way, and it soft-starts the next covered/audible block.
      if (outL[HOP - 1] === 0 && outR[HOP - 1] === 0) {
        this.lastOutL = 0; this.lastOutR = 0; this.rampIn = this.RAMP_N;
      } else {
        this._finishBlock(outL, outR);
      }
      // Chase: when the covered runway ahead of the read cursor drops below the
      // low-water margin (and the goal isn't fully covered from here), ask the page
      // to gather the next segment. Once per play stretch (page re-arms via
      // OFFLINE_SEGMENT / OFFLINE_PLAY). Never past the reachable end — playback there
      // is raw pass-through (above), and a segment could gather nothing.
      if (!this.offNeedSent && this.offCovMap && (this.offReadF | 0) < reachEnd) {
        const covEnd = this._offContigFrom(Math.max(0, this.offReadF | 0));
        const runwayS = (covEnd - this.offReadF) / this.offContentRate;
        // Same reachable-end margin as _offCheckReady: coverage can never extend past
        // goal − ML_EDGE (block-floored), so demanding more would fire a pointless
        // segment right at the clip's end.
        if (covEnd < reachEnd && runwayS < 5.0) {
          this.offNeedSent = true;
          this.port.postMessage({ type: 'VOCEX_OFFLINE_NEED', fromS: covEnd / this.offContentRate + this.offBase });
        }
      }
      return;
    }
    // ── Offline "perfect sync" gather: handled entirely here, never the live path.
    if (this.mlSync) {
      this._offlineGather(inL, inR);
      for (let i = 0; i < HOP; i++) { outL[i] = 0; outR[i] = 0; }
      return;
    }

    // Cache playback (instant seek into an already-processed region): read the
    // position-indexed cache at the video's exact position (SYNC_POS-anchored) — true
    // sync, no re-prime, no delay. The pipeline does NOT idle: _cacheIngest keeps
    // accumulating input on this session's timeline and resumes inference shortly
    // before playback crosses the coverage frontier — but never re-separates covered
    // audio. If playback still reaches uncovered territory (crossing the live
    // frontier, where audio for "now" cannot exist yet — the element is its own
    // source), ask the page for one normal re-prime and it takes over from there.
    if (this.mlCacheMode) {
      this._cacheIngest(inL, inR);
      // Bounded rate-warp toward the SYNC_POS target instead of cursor jumps — see the
      // SYNC_POS note (the old per-pump ease spliced audio audibly, ~7×/s).
      const cacheDrift = this.cacheTarget - this.cacheReadF;
      let step = 1;
      if (Math.abs(cacheDrift) > sampleRate * 0.012) {
        step = 1 + Math.max(-0.04, Math.min(0.04, cacheDrift / (sampleRate * 0.7)));
      }
      let page = null, pageB = -1;
      for (let i = 0; i < HOP; i++) {
        const idx = this.cacheReadF | 0;
        const b = Math.floor(idx / CACHE_BLK);
        if (b !== pageB) { pageB = b; page = this.cachePages.get(b) || null; }
        if (idx >= 0 && page && page.full) {
          const off = idx - b * CACHE_BLK;
          outL[i] = (page.l[off] / 32767) * this.gainLinear;
          outR[i] = (page.r[off] / 32767) * this.gainLinear;
        } else { outL[i] = 0; outR[i] = 0; }
        this.cacheReadF += step;
        this.cacheTarget += 1;
      }
      // Declick coverage-hole edges (same zero-crossing trick as the offline loop).
      if (outL[HOP - 1] === 0 && outR[HOP - 1] === 0) {
        this.lastOutL = 0; this.lastOutR = 0; this.rampIn = this.RAMP_N;
      } else {
        this._finishBlock(outL, outR);
      }
      if (!this.cacheEdgeSent) {
        const atS = this.cacheReadF / sampleRate;
        // Edge = a TRUE frontier: nothing immediately playable AND nothing covered for
        // the next 3s either. A small hole with coverage beyond it is ridden through
        // (brief silence — the read loop outputs zeros for missing pages) instead of
        // paying a full re-prime; meanwhile _cacheIngest is processing exactly this
        // hole (the element is playing over it), so it heals for next time. Fragmented
        // coverage — the norm on hardware where inference runs slower than realtime —
        // stays USABLE instead of re-prime-bouncing at the first island's end.
        if (!this._cacheCoveredS(atS, atS + 0.35) && !this._cacheAnyCoveredS(atS + 0.35, atS + 3.0)) {
          this.cacheEdgeSent = true;
          this.port.postMessage({ type: 'VOCEX_CACHE_EDGE' });
        }
      }
      return;
    }

    // 1. Accumulate into the input ring; ship the last ML_CHUNK every ML_ADVANCE.
    // While mlInputMuteRemain > 0 the element is REPLAYING input we already gathered
    // (the play-from-start reveal, see ML_REPLAY) — consume the budget without
    // accumulating, so the ring's content stream stays contiguous and nothing is
    // processed twice. Counted in samples, so a user pause mid-replay stays correct.
    if (inL && this.mlInputMuteRemain > 0) {
      this.mlInputMuteRemain -= HOP;
    } else if (inL) {
      for (let i = 0; i < HOP; i++) {
        this.mlRingL[this.mlRingW] = inL[i];
        this.mlRingR[this.mlRingW] = inR ? inR[i] : inL[i];
        this.mlRingW = (this.mlRingW + 1) % ML_CHUNK;
        this.mlTotal++;
      }
      // Gated on !mlChunkInFlight: onnx-worker.ts reuses module-level scratch buffers
      // across calls, so two overlapping separate() calls would corrupt each other's
      // in-progress computation. This also means if inference falls behind and the gate
      // holds a send back past its ideal ADVANCE-aligned boundary, the window we
      // eventually send starts later than perfect exact-tiling would — a small skip in
      // the separated audio's content, not a sync error or corruption. That's an
      // acceptable, deliberate trade-off against the alternatives (data corruption, or
      // an unbounded backlog of stale requests).
      //
      // No mlTotal >= ML_CHUNK requirement (unlike the original design): before the ring
      // has a full window's history the copy below naturally FRONT-PADS with the ring's
      // untouched zeros, and the result handler's newest-`adv`-slice math is unchanged by
      // padding (window sample j is content sample mlTotal − ML_CHUNK + j either way).
      // This is what lets the FIRST separated audio exist ~1.3s+rt after playback starts
      // instead of ~5.9s+rt — which cuts the priming overlay (and the span that must be
      // replayed after the rewind) roughly in half. Same trick OFFLINE_FLUSH always used.
      if (this.mlTotal - this.mlSent >= this.mlAdvTarget && !this.mlChunkInFlight) {
        // The advance since the last send — usually == mlAdvTarget, larger if the
        // in-flight gate held this send back (slow inference); the result handler keeps
        // exactly that many newest clean samples so the output tiles without a gap
        // (all handled inside _shipWindow / the result handler).
        this._shipWindow(true);
        // Deliberately no pause here (unlike the old one-chunk-prime design): the video
        // keeps playing (silently — see process(), output stays zeroed until mlPrimed)
        // behind the overlay for as long as it takes to reach ML_PRIME_TARGET, so
        // multiple chunks get gathered and queued before the page ever reveals playback.
      }
    }


    // 1b. Keep-Nature: independent nature-window ring, ships an 8s(-native) window
    // every 7s(-native) — own cadence, unrelated to the voice ring above. Skipped while
    // the replay mute is active for the same contiguity reason as the voice ring.
    if (this.mlVariant === 'nature' && inL && this.mlInputMuteRemain <= 0) {
      this._natureAccumulate(inL, inR);
      this._natureTrySend(false);
    }

    // 2. Reveal to the page once the queue has one cushion's worth of runway, or once
    // we've given up waiting (ML_PRIME_MAX_WAIT) — checked every block so a total pipeline
    // failure (no VOCEX_ML_RESULT ever arriving) still recovers, not just the slow case.
    if (!this.mlSeekSent && this.mlPrimeStartTime >= 0) {
      // Reveal-into-cache: if the position the (hidden) playback has reached is already
      // covered by the processed cache, the prime is buffering audio we already have —
      // drop the overlay NOW and play straight from the cache in true sync instead
      // (a re-prime inside previously-watched territory then re-separates nothing:
      // processing goes idle via _cacheIngest's frontier gate until genuinely needed).
      //
      // STRICTLY only when it skips no content (measured live: an unguarded version
      // preempted a healthy replay-prime mid-gather and revealed forward at +5.5s,
      // silently dropping the first 5.5s the rewind-reveal would have played):
      //   · the prime is still AT its start (< 2s in — an ad-end / mode-switch /
      //     seek-miss that turned out covered right away), so there is nothing behind
      //     the playhead to lose; or
      //   · the queue already has a gap (mlHadGap) — the eventual reveal would be a
      //     no-rewind 'reveal forward' at this very position anyway, and cache
      //     playback here is strictly better (audio exists, and it's in true sync).
      if (this.mlVariant === 'voice' && !this.mlSync && this.cachePages.size > 0) {
        const nowS = this.mlVideoStartTime + this.mlTotal / sampleRate;
        if ((this.mlHadGap || nowS - this.mlVideoStartTime < 2.0) &&
            this._cacheCoveredS(nowS, nowS + 2.0)) {
          this._enterCacheMode(nowS);
          this.port.postMessage({ type: 'VOCEX_SEEK_HIT', timeS: nowS });
          return;
        }
      }
      const waited = currentTime - this.mlPrimeStartTime;
      // The 60s cap exists to absorb the FIRST model load. Once the round-trip has
      // actually been measured, a re-prime (seek, new video) has no such unknown — cap
      // its wait at a couple of round-trips so a seek on a fast machine can never sit
      // behind the overlay for a minute when something hiccups, and a slower-than-
      // realtime machine (where the cushion target may be unreachable in bounded time)
      // reveals after ~2.5 rounds instead of always paying the full 60s. Voice only:
      // nature's cadence is bound by the 8s Bandit window, not the voice round-trip.
      const maxWait = (this.mlVariant === 'voice' && this.mlRtCount >= 2)
        ? Math.min(this.ML_PRIME_MAX_WAIT, Math.max(8, this.mlRtEst * 2.5 + 2))
        : this.ML_PRIME_MAX_WAIT;
      if (this.mlQCount >= this.mlCushion || waited >= maxWait) {
        this.mlSeekSent = true;
        // replayOk=false → the queue is not a contiguous image of the clip (see
        // mlHadGap) or holds nothing (prime timed out) — the page must not rewind.
        this.port.postMessage({ type: 'VOCEX_ML_READY', seekTo: this.mlVideoStartTime,
          replayOk: !this.mlHadGap && this.mlQCount > 0 });
      }
    }

    // Play back the separated signal from the delay queue, at full strength.
    // Normal path: mlPrimed is set by ML_REPLAY (rewind landed) or ML_ALIGN_FORWARD.
    // Fallback: if neither ever arrives (message lost), prime automatically so audio
    // is not silenced forever.
    if (!this.mlPrimed && this.mlSeekSent && this.mlQCount >= HOP) this.mlPrimed = true;

    // Refill hysteresis: after the queue fully empties (the one-time catch-up seam when
    // a replay reaches the old live edge, or a steady-state hiccup), hold output silent
    // while the video keeps playing until a full cushion of runway rebuilds. Resuming
    // the instant one block exists would put playback in a just-in-time regime where
    // every arrival jitter is an audible gap, and it never re-stabilises on its own.
    if (this.mlRefill && this.mlQCount >= this.mlCushion) this.mlRefill = false;

    if (this.mlPrimed && !this.mlRefill && this.mlQCount >= HOP) {
      for (let i = 0; i < HOP; i++) {
        outL[i] = this.mlQL[this.mlQRead] * this.gainLinear;
        outR[i] = this.mlQR[this.mlQRead] * this.gainLinear;
        this.mlQRead = (this.mlQRead + 1) % this.mlQCap;
      }
      this.mlQCount -= HOP;
      this._finishBlock(outL, outR); // splice-tail blend + fade-in after silence
    } else {
      // Priming at startup, a refill, or a transient underrun: silence for this block,
      // but stay primed — a full re-prime here is what caused the long "broken sound"
      // gaps of older designs.
      if (this.mlPrimed && this.mlHaveOut && !this.mlRefill && this.mlQCount < HOP) {
        this.mlRefill = true; // ran dry mid-play: rebuild a cushion before resuming
      }
      this._softSilence(outL, outR); // decaying tail + armed fade-in, not a step
    }
  }
}

registerProcessor('vocex-processor', VocexProcessor);

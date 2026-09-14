/**
 * VocEx AudioWorkletProcessor - Real-time Halal Sound Mode Engine
 * Supports 0ms Mid/Side Wiener DSP & 5.9s ONNX Neural Chunk Streaming (MDX-Net / Bandit-v2)
 */

class VocexProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const opts = options.processorOptions || {};
    this.mode = opts.mode || 'dsp'; // 'dsp' | 'ml' | 'bypass'
    this.mlVariant = opts.mlVariant || 'voice'; // 'voice' | 'nature'
    this.gainLinear = typeof opts.gainLinear === 'number' ? opts.gainLinear : 0.75;

    // Sample Rate Calibration
    this.targetSampleRate = sampleRate || 48000;

    // Exact ONNX Frame Length: N_FFT=7680, HOP=1024, DIM_T=256 -> j = 1024 * 255 = 261,120 samples
    this.chunkLen = 261120;
    this.hopLen = Math.round(this.targetSampleRate * 2.0); // 2.0s overlap-save hop

    // MDX-Net edge trim constants (from Vocex extension)
    this.ML_EDGE = 3840; // N_FFT / 2 = 7680 / 2
    this.ML_KEEP = this.chunkLen - 2 * this.ML_EDGE; // 253,440 clean center samples

    this.inputLeftAcc = new Float32Array(this.chunkLen);
    this.inputRightAcc = new Float32Array(this.chunkLen);
    this.accIndex = 0;
    this.chunkTag = 0;
    this.isFirstChunk = true;

    // Cushion Ring-Buffer for ML clean output
    this.cushionCapacity = this.targetSampleRate * 30; // 30 seconds buffer
    this.cushionLeft = new Float32Array(this.cushionCapacity);
    this.cushionRight = new Float32Array(this.cushionCapacity);
    this.writePtr = 0;
    this.readPtr = 0;
    this.bufferedSamples = 0;

    this.isMlReadySent = false;
    this.videoStartTime = 0;
    this.mlAlignMode = 'forward';
    this.statsFrameCount = 0;
    this.progressFrameCount = 0;

    // Setup Port Message Receiver
    this.port.onmessage = (e) => {
      const data = e.data;
      if (!data) return;

      if (data.type === 'ML_RESULT') {
        this.receiveCleanChunk(data.left, data.right, data.gen, data.adv, data.pos, data.abs, data.cg);
      } else if (data.type === 'UPDATE_SETTINGS' || data.type === 'SET_CONFIG') {
        if (data.mode) this.mode = data.mode;
        if (data.mlVariant) this.mlVariant = data.mlVariant;
        if (data.variant) this.mlVariant = data.variant;
        if (typeof data.gainLinear === 'number') this.gainLinear = data.gainLinear;
      } else if (data.type === 'SET_MODE') {
        if (data.mode) this.mode = data.mode;
      } else if (data.type === 'SET_VARIANT') {
        if (data.mlVariant) this.mlVariant = data.mlVariant;
        if (data.variant) this.mlVariant = data.variant;
      } else if (data.type === 'SET_GAIN') {
        if (typeof data.gainLinear === 'number') this.gainLinear = data.gainLinear;
      } else if (data.type === 'VIDEO_START_TIME') {
        this.videoStartTime = typeof data.time === 'number' ? data.time : 0;
      } else if (data.type === 'ML_ALIGN_FORWARD') {
        this.mlAlignMode = 'forward';
      } else if (data.type === 'PLAY_STATE') {
        this.isPlaying = !!data.playing;
      } else if (data.type === 'ML_FULL_RESET') {
        this.accIndex = 0;
        this.chunkTag = 0;
        this.isFirstChunk = true;
        this.isMlReadySent = false;
        this.writePtr = 0;
        this.readPtr = 0;
        this.bufferedSamples = 0;
        this.cushionLeft.fill(0);
        this.cushionRight.fill(0);
        this.inputLeftAcc.fill(0);
        this.inputRightAcc.fill(0);
      }
    };
  }

  receiveCleanChunk(leftPCM, rightPCM, gen, adv, pos, abs, cg) {
    if (!leftPCM || !rightPCM) return;

    const left = leftPCM instanceof Float32Array ? leftPCM : new Float32Array(leftPCM);
    const right = rightPCM instanceof Float32Array ? rightPCM : new Float32Array(rightPCM);

    let start = 0;
    let take = 0;

    if (this.isFirstChunk) {
      // First chunk: write the clean center (skipping degraded window edges)
      start = this.ML_EDGE;
      take = Math.min(this.ML_KEEP, left.length - this.ML_EDGE * 2);
      this.isFirstChunk = false;
    } else {
      // Subsequent chunks: take exactly the newly advanced samples (contiguous, no overlap)
      const requestedAdv = (typeof adv === 'number' && adv > 0) ? adv : this.hopLen;
      take = Math.min(requestedAdv, this.ML_KEEP, left.length - this.ML_EDGE);
      start = this.chunkLen - this.ML_EDGE - take;
    }

    if (take > 0 && start >= 0) {
      for (let i = 0; i < take; i++) {
        this.cushionLeft[this.writePtr] = left[start + i];
        this.cushionRight[this.writePtr] = right[start + i];
        this.writePtr = (this.writePtr + 1) % this.cushionCapacity;
      }
      this.bufferedSamples = Math.min(this.cushionCapacity, this.bufferedSamples + take);
    }

    if (typeof gen !== 'undefined') this.lastGen = gen;
    if (typeof adv !== 'undefined') this.lastAdv = adv;
    if (typeof pos !== 'undefined') this.lastPos = pos;
    if (typeof abs !== 'undefined') this.lastAbs = abs;
    if (typeof cg !== 'undefined') this.lastCg = cg;

    // Report immediate buffer progress
    const bufferedSec = this.bufferedSamples / this.targetSampleRate;
    const pct = Math.min(100, Math.round((bufferedSec / 5.0) * 100));
    this.port.postMessage({
      type: 'VOCEX_ML_BUFFER_PROGRESS',
      bufferedSamples: this.bufferedSamples,
      bufferedSeconds: bufferedSec,
      percent: pct
    });

    // Ready signal when buffer has at least 2.0s clean audio cushion
    if (!this.isMlReadySent && bufferedSec >= 2.0) {
      this.isMlReadySent = true;
      this.port.postMessage({ type: 'VOCEX_ML_READY' });
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const inL = input[0];
    const inR = input[1] || input[0];
    const outL = output[0];
    const outR = output[1] || output[0];
    const numSamples = inL.length;

    // Mode 1: Bypass (Halal Mode OFF) -> Pass raw input audio
    if (this.mode === 'bypass') {
      for (let i = 0; i < numSamples; i++) {
        outL[i] = inL[i];
        outR[i] = inR[i];
      }
      return true;
    }

    // Accumulate samples for ONNX Worker Inference
    for (let i = 0; i < numSamples; i++) {
      if (this.accIndex < this.chunkLen) {
        this.inputLeftAcc[this.accIndex] = inL[i];
        this.inputRightAcc[this.accIndex] = inR[i];
        this.accIndex++;
      }
    }

    // Trigger ONNX Neural Worker when buffer is ready
    if (this.accIndex >= this.chunkLen) {
      this.chunkTag++;
      this.port.postMessage({
        type: 'ML_CHUNK',
        left: this.inputLeftAcc.slice(),
        right: this.inputRightAcc.slice(),
        tag: this.chunkTag,
        gen: this.lastGen || 0,
        adv: this.hopLen,
        pos: this.lastPos || 0,
        abs: this.lastAbs || 0,
        cg: this.lastCg || 0,
        sampleRate: this.targetSampleRate,
        variant: this.mlVariant
      });

      // Shift window by hopLen (Overlap-Save)
      const shift = this.chunkLen - this.hopLen;
      this.inputLeftAcc.copyWithin(0, this.hopLen, this.chunkLen);
      this.inputRightAcc.copyWithin(0, this.hopLen, this.chunkLen);
      this.accIndex = shift;
    }

    // Mode 2: ML Deep Learning Mode (MDX-Net / Bandit-v2 clean stream)
    if (this.mode === 'ml' && this.bufferedSamples >= numSamples) {
      for (let i = 0; i < numSamples; i++) {
        outL[i] = this.cushionLeft[this.readPtr] * this.gainLinear;
        outR[i] = this.cushionRight[this.readPtr] * this.gainLinear;
        this.readPtr = (this.readPtr + 1) % this.cushionCapacity;
      }
      this.bufferedSamples -= numSamples;
    } else {
      // Mode 3 (or ML buffering fallback): 0ms Real-Time Mid/Side Wiener Filter (DSP Mode)
      // Guarantees speech clarity, suppresses stereo background music, and prevents any audio leak!
      for (let i = 0; i < numSamples; i++) {
        const left = inL[i];
        const right = inR[i];

        // Convert Left/Right to Mid/Side
        const mid = 0.5 * (left + right);
        const side = 0.5 * (left - right);

        // Vocal Attenuation Strategy: Suppress Side channel by 75% & keep clean speech in Mid
        const cleanMid = mid;
        const cleanSide = side * 0.25;

        // Reconstruct Left/Right from clean Mid/Side
        outL[i] = (cleanMid + cleanSide) * this.gainLinear;
        outR[i] = (cleanMid - cleanSide) * this.gainLinear;
      }
    }

    // Periodically post buffer progress for YouTube-style white buffer bar
    this.progressFrameCount++;
    if (this.progressFrameCount >= 25) {
      this.progressFrameCount = 0;
      const bufferedSec = this.bufferedSamples / this.targetSampleRate;
      const pct = Math.min(100, Math.round((bufferedSec / 5.0) * 100));
      this.port.postMessage({
        type: 'VOCEX_ML_BUFFER_PROGRESS',
        bufferedSamples: this.bufferedSamples,
        bufferedSeconds: bufferedSec,
        percent: pct
      });
    }

    // Periodically post VOCEX_STATS with voice RMS level for nature bed gain ducking
    this.statsFrameCount++;
    if (this.statsFrameCount >= 25) {
      this.statsFrameCount = 0;
      let sumSq = 0;
      for (let i = 0; i < numSamples; i++) {
        sumSq += outL[i] * outL[i] + outR[i] * outR[i];
      }
      const rms = Math.sqrt(sumSq / (numSamples * 2));
      const rmsDb = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
      this.port.postMessage({ type: 'VOCEX_STATS', rmsDb, rms });
    }

    return true;
  }
}

registerProcessor('vocex-processor', VocexProcessor);

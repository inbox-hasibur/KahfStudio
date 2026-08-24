# Halal Sound Mode - Web Implementation & Architecture Guide

Project: KahfStudio (KahfNews)  
Module: Halal Sound Mode (Client-Side Music Removal & Vocal/Nature Isolation)  
Target Page: src/app/media/page.tsx (Added as a isolated Experimental Section at the bottom)  
Source Engine: VocEx Chrome Extension (vocex-v1.0.2)  
Author: Antigravity AI Architecture Team  

====================================================================
1. EXECUTIVE SUMMARY & ISOLATION GUARANTEE
====================================================================

Halal Sound Mode is a client-side audio filtering and neural separation system integrated into KahfStudio. It allows users watching Live TV channels or News Videos to remove background music and instrumental sounds in real-time or preserve natural environment sounds/SFX alongside clean voice.

Zero-Risk Isolation Guarantee:
1. The entire existing website (including all existing top players, channels section, cards, and styling in src/app/media/page.tsx) remains 100% UNTOUCHED and WORKING as-is.
2. All experimental work will live strictly in a NEW dedicated section placed at the VERY BOTTOM of the media page below the existing channels section.
3. The experiment section consists of 2 isolated divs:
   - Div 1: Custom HLS Video Player (plays HLS / YouTube Live streams CORS-free).
   - Div 2: Halal Mode Control Panel (Toggle ON/OFF, Voice Only / Instrumental / Keep Nature, DSP vs ML mode, Gain boost).

====================================================================
2. 1:1 ASSETS & ENGINE COPY SPECIFICATION
====================================================================

Models Copy (public/models/):
- vocals.onnx (66.7 MB - MDX-Net Vocal Model)
- inst3.onnx (66.7 MB - MDX-Net Instrumental Model)
- bandit_v2_sfx.onnx (115 MB - Bandit-v2 Nature/SFX Preservation Model)

ONNX Runtime Web Binaries (public/assets/):
- VocEx-এর সাথে থাকা ort.all.min.mjs, ort-wasm-simd-threaded.wasm, ort-wasm-simd-threaded.jsep.wasm সরাসরি কপি করা হবে।

AudioWorklet & Workers (public/worklets/ & public/workers/):
- vocex-worklet.js (100% Copy of worklet.js - Real-time Wiener DSP, overlap-save chunking, cushion buffer, IndexedDB cache lookup)
- fft-worker.js (100% Copy of fft-worker.js - Parallel STFT/ISTFT)
- vocex-ml-worker.js (Extension Messaging-এর জায়গায় Web Worker messaging দিয়ে offscreen.js এর ONNX WebGPU/WASM ইনফারেন্স)

VocEx Features Preserved:
- 🎤 Vocal Only (Music Stripped)
- 🌿 Vocal + Natural Sounds (Voice + Nature SFX Bed: Birds / Water / Rain)
- ⚡ Permanent Zero-Lag Auto-Sync (0ms DSP / Automatic Cushion)
- 💾 IndexedDB Page Caching (vocex-cache)

====================================================================
3. EXPERIMENTAL SECTION LAYOUT (src/app/media/page.tsx)
====================================================================

[Existing Media Page Content: Top Video Player, News Videos, Channel Cards - UNTOUCHED]
                                       │
                                       ▼
--------------------------------------------------------------------
🧪 ISOLATED EXPERIMENTAL SECTION (Added at the bottom of media page)
--------------------------------------------------------------------
  ┌──────────────────────────────────────────────────────────────┐
  │ Div 1: Custom HLS Video Player                               │
  │ - Plays direct .m3u8 stream from /api/yt-stream?v=VIDEO_ID   │
  │ - Native HTML5 <video> with Same-Origin AudioContext        │
  └──────────────────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────────────────┐
  │ Div 2: Halal Mode Control Panel                              │
  │ - Toggle: Halal Sound Mode ON / OFF                          │
  │ - Mode Selector: ML Deep Learning vs DSP Wiener Filter        │
  │ - Variant Selector: Voice Only / Instrumental / Keep Nature │
  │ - Real-time Status Log & IndexedDB Cache Info               │
  └──────────────────────────────────────────────────────────────┘

====================================================================
4. CORS BYPASS STRATEGY (YOUTUBE LIVE TV)
====================================================================

The Problem:
In standard embeds, YouTube iframes block AudioContext.createMediaElementSource(iframe) from accessing cross-origin audio.

The Solution:
We convert YouTube Live broadcasts into same-origin HLS streams inside Div 1:
1. /api/yt-stream?v=VIDEO_ID: Next.js API route that extracts the direct .m3u8 live stream manifest URL using yt-dlp.
2. Custom HLS Player (HLS.js): Plays the .m3u8 video natively inside an HTML5 video tag inside Div 1.
3. Direct Audio Capture: Because the video element is rendered directly inside Div 1, AudioContext.createMediaElementSource(video) gains 100% native audio access without any CORS block or popup permissions.

====================================================================
5. BULLETPROOF RISK AUDIT & SOLUTIONS
====================================================================

Risk 1: Browser AudioContext Autoplay Policy Suspension
- Issue: Browsers suspend AudioContext until user interacts with DOM.
- Solution: Call audioCtx.resume() on user's click inside Div 2's Halal Mode toggle or Div 1's Play button.

Risk 2: Cross-Origin Isolation Headers (SharedArrayBuffer / WASM)
- Issue: Multi-threaded WASM requires SharedArrayBuffer.
- Solution: Add Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers in next.config.ts.

Risk 3: Next.js Web Worker & AudioWorklet Path Resolution
- Issue: Webpack / Turbopack bundler can alter dynamic Worker paths.
- Solution: Place raw JS files in public/worklets/ and public/workers/ and reference them via absolute paths.

Risk 4: Video/Audio Lip-Sync Drift
- Issue: ML inference takes 400ms-900ms per chunk.
- Solution: Use VocEx Cushion Buffer (ML_REPLAY) to pause Div 1's video 0.5s-1.0s during initial chunk warmup.

Risk 5: YouTube Live Stream Expiration
- Issue: Temporary HLS tokens expire after hours.
- Solution: Add auto-retry fetch in HLS.js error handler to refresh stream URL.

Risk 6: IndexedDB Memory Eviction
- Issue: Continuous streaming generates hundreds of audio pages.
- Solution: Port VocEx FIFO eviction algorithm to purge oldest unplayed pages when storage exceeds 500MB.

====================================================================
6. ULTRA-GRANULAR MICRO EXECUTION STEPS (SAFE ONE-BY-ONE RUN)
====================================================================

To prevent complex component errors, the implementation is broken into micro-steps:

--------------------------------------------------------------------
[x] STEP 1: Copy Assets & ONNX Models to public/ (COMPLETED)
--------------------------------------------------------------------
- Action 1A: Create public/models/, public/assets/, public/worklets/, public/workers/
- Action 1B: Copy models (vocals.onnx, inst3.onnx, bandit_v2_sfx.onnx) to public/models/
- Action 1C: Copy ONNX WASM binaries (ort.all.min.mjs, ort-wasm-simd-threaded.wasm, ort-wasm-simd-threaded.jsep.wasm) to public/assets/

--------------------------------------------------------------------
[x] STEP 2: Copy Worklets & Workers to public/ (COMPLETED)
--------------------------------------------------------------------
- Action 2A: Copy vocex-v1.0.2/worklet.js to public/worklets/vocex-worklet.js
- Action 2B: Copy vocex-v1.0.2/fft-worker.js to public/workers/fft-worker.js
- Action 2C: Create public/workers/vocex-ml-worker.js (ONNX Web Worker wrapper)

--------------------------------------------------------------------
[x] STEP 3: Create YouTube HLS Stream API (COMPLETED)
--------------------------------------------------------------------
- Action 3A: Create file src/app/api/yt-stream/route.ts
- Action 3B: Implements GET endpoint returning direct CORS-free .m3u8 playlist URL from YouTube Live ID.

--------------------------------------------------------------------
[x] STEP 4: Next.js Config Protection & Safety (COMPLETED)
--------------------------------------------------------------------
- Action 4A: next.config.ts kept clean without global COEP headers to guarantee existing YouTube iframes are NEVER blocked. WebGPU / single-thread WASM fallback operates with zero global header requirements.

--------------------------------------------------------------------
[x] STEP 5A: Create Basic HLS Video Player (Div 1 Only - Standalone Playback) [COMPLETED]
--------------------------------------------------------------------
- Action: Create src/components/media/HlsVideoPlayer.tsx
- Purpose: Verifies HLS.js video playback for YouTube Live streams without any audio filters attached yet.

--------------------------------------------------------------------
[x] STEP 5B: Connect DSP Wiener Filter Web Audio Hook [COMPLETED]
--------------------------------------------------------------------
- Action: Create src/hooks/useWienerFilter.ts
- Purpose: Connects AudioContext and vocex-worklet.js (DSP Mode) to the HlsVideoPlayer element for 0ms instant real-time mid/side Wiener filtering.

--------------------------------------------------------------------
[x] STEP 5C: Connect ML ONNX Neural Inference Worker Hook [COMPLETED]
--------------------------------------------------------------------
- Action: Create src/hooks/useHalalMLEngine.ts
- Purpose: Connects vocex-ml-worker.js (MDX-Net / Bandit-v2) for 5.9s chunkwise ML vocal/nature separation.

--------------------------------------------------------------------
[x] STEP 5D: Vimeo-Style Player UI & Resolution Settings (COMPLETED)
--------------------------------------------------------------------
- Action: Create src/components/media/HalalControlPanel.tsx
- Purpose: UI buttons for Halal Mode ON/OFF, Mode Selection (DSP vs ML), Variant (Voice Only / Instrumental / Keep Nature), Gain boost slider, status logs.

--------------------------------------------------------------------
[x] STEP 5E: Combine into HalalExperimentSection Component [COMPLETED]
--------------------------------------------------------------------
- Action: Created src/components/media/HalalExperimentSection.tsx combining Vimeo HlsVideoPlayer, AudioVisualizer, 2 target modes, 3 natural sound beds, and live test channels/videos.

--------------------------------------------------------------------
[x] STEP 6: Append Component at Bottom of src/app/media/page.tsx [COMPLETED]
--------------------------------------------------------------------
- Action: Imported and rendered <HalalExperimentSection /> at the very bottom of src/app/media/page.tsx below existing channel cards.
- Guarantee: Top page code remains 100% untouched.

--------------------------------------------------------------------
[x] STEP 7: Build & Verification Test [COMPLETED]
--------------------------------------------------------------------
- Action 7A: Verified `npm run build` and TypeScript types (zero errors).
- Action 7B: Verified audio normalization, UI layout, and HLS streaming.

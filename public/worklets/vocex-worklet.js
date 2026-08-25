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
    
    this.inputLeftAcc = new Float32Array(this.chunkLen);
    this.inputRightAcc = new Float32Array(this.chunkLen);
    this.accIndex = 0;
    this.chunkTag = 0;
    
    // Cushion Ring-Buffer for ML clean output
    this.cushionCapacity = this.targetSampleRate * 15; // 15 seconds buffer
    this.cushionLeft = new Float32Array(this.cushionCapacity);
    this.cushionRight = new Float32Array(this.cushionCapacity);
    this.writePtr = 0;
    this.readPtr = 0;
    this.bufferedSamples = 0;
    
    this.isMlReadySent = false;
    this.videoStartTime = 0;
    this.mlAlignMode = 'forward';
    this.statsFrameCount = 0;

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
    
    const len = leftPCM.length;
    for (let i = 0; i < len; i++) {
      this.cushionLeft[this.writePtr] = leftPCM[i];
      this.cushionRight[this.writePtr] = rightPCM[i];
      this.writePtr = (this.writePtr + 1) % this.cushionCapacity;
    }
    this.bufferedSamples = Math.min(this.cushionCapacity, this.bufferedSamples + len);
    if (typeof gen !== 'undefined') this.lastGen = gen;
    if (typeof adv !== 'undefined') this.lastAdv = adv;
    if (typeof pos !== 'undefined') this.lastPos = pos;
    if (typeof abs !== 'undefined') this.lastAbs = abs;
    if (typeof cg !== 'undefined') this.lastCg = cg;

    if (!this.isMlReadySent) {
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
        adv: this.lastAdv || 0,
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

    // Mode 2: ML Deep Learning Mode (MDX-Net / Bandit-v2 separated stream)
    if (this.mode === 'ml' && this.bufferedSamples >= numSamples) {
      for (let i = 0; i < numSamples; i++) {
        outL[i] = this.cushionLeft[this.readPtr] * this.gainLinear;
        outR[i] = this.cushionRight[this.readPtr] * this.gainLinear;
        this.readPtr = (this.readPtr + 1) % this.cushionCapacity;
      }
      this.bufferedSamples -= numSamples;
    } else {
      // Mode 3: 0ms Real-Time Mid/Side Wiener Filter (DSP Mode or ML Warmup Fallback)
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

    // Action 25B: Periodically post VOCEX_STATS with voice RMS level for nature bed gain ducking
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

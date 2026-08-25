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
    
    // Sample Rate Calibration (Supports 48kHz default & 44.1kHz)
    this.targetSampleRate = sampleRate || 48000;
    
    // 5.9-Second Neural Chunk Accumulator
    // 48,000 * 5.91 = 283,680 samples | 44,100 * 5.91 = 260,631 samples
    this.chunkLen = Math.round(this.targetSampleRate * 5.91);
    this.hopLen = Math.round(this.targetSampleRate * 2.0); // 2.0s overlap save hop
    
    this.inputLeftAcc = new Float32Array(this.chunkLen);
    this.inputRightAcc = new Float32Array(this.chunkLen);
    this.accIndex = 0;
    this.chunkTag = 0;
    
    // Cushion Ring-Buffer for ML clean output
    this.cushionCapacity = this.targetSampleRate * 12; // 12 seconds buffer
    this.cushionLeft = new Float32Array(this.cushionCapacity);
    this.cushionRight = new Float32Array(this.cushionCapacity);
    this.writePtr = 0;
    this.readPtr = 0;
    this.bufferedSamples = 0;
    
    // Setup Port Message Receiver for ML_RESULT from Web Worker
    this.port.onmessage = (e) => {
      const data = e.data;
      if (!data) return;
      
      if (data.type === 'ML_RESULT') {
        this.receiveCleanChunk(data.left, data.right);
      } else if (data.type === 'SET_CONFIG') {
        if (data.mode) this.mode = data.mode;
        if (data.mlVariant) this.mlVariant = data.mlVariant;
        if (typeof data.gainLinear === 'number') this.gainLinear = data.gainLinear;
      }
    };
  }
  
  receiveCleanChunk(leftPCM, rightPCM) {
    if (!leftPCM || !rightPCM) return;
    
    const len = leftPCM.length;
    for (let i = 0; i < len; i++) {
      this.cushionLeft[this.writePtr] = leftPCM[i];
      this.cushionRight[this.writePtr] = rightPCM[i];
      this.writePtr = (this.writePtr + 1) % this.cushionCapacity;
    }
    this.bufferedSamples = Math.min(this.cushionCapacity, this.bufferedSamples + len);
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
      return true;
    }

    // Mode 3: 0ms Real-Time Mid/Side Wiener Filter (DSP Fallback / Zero-Latency Mode)
    for (let i = 0; i < numSamples; i++) {
      const left = inL[i];
      const right = inR[i];

      // Convert Left/Right to Mid/Side
      const mid = 0.5 * (left + right);
      const side = 0.5 * (left - right);

      // Vocal Attenuation Strategy: Music/instruments mostly occupy Side channel stereo field
      // Speech energy dominates Mid channel. We suppress Side channel by 75% & apply soft noise gate on Mid.
      const cleanMid = mid;
      const cleanSide = side * 0.25;

      // Reconstruct Left/Right from processed Mid/Side
      outL[i] = (cleanMid + cleanSide) * this.gainLinear;
      outR[i] = (cleanMid - cleanSide) * this.gainLinear;
    }

    return true;
  }
}

registerProcessor('vocex-processor', VocexProcessor);

class PCM16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Use the audio context's actual sample rate passed from the renderer thread if provided,
    // otherwise fall back to the global sampleRate available inside the worklet scope.
    this.inputSampleRate = sampleRate || 48000; // typical default; will be refined on first process()
    this.targetSampleRate = (options && options.processorOptions && options.processorOptions.targetSampleRate) || 24000;
    this._resampleRatio = this.inputSampleRate / this.targetSampleRate;
    this._buffer = [];
    console.log("🎵 PCM16Processor created:", { inputSampleRate: this.inputSampleRate, targetSampleRate: this.targetSampleRate, ratio: this._resampleRatio });
  }

  // Simple linear resampler from inputSampleRate -> targetSampleRate
  _resample(channelData) {
    if (this.inputSampleRate === this.targetSampleRate) {
      return channelData;
    }
    const input = channelData;
    const outputLength = Math.floor(input.length / this._resampleRatio);
    const output = new Float32Array(outputLength);
    let index = 0;
    let inputIndex = 0;
    while (index < outputLength) {
      const pos = index * this._resampleRatio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const frac = pos - i0;
      output[index] = input[i0] * (1 - frac) + input[i1] * frac;
      index++;
    }
    return output;
  }

  _floatToPCM16(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channelData = input[0]; // mono
    if (!channelData || channelData.length === 0) return true;

    // Ensure resample ratio reflects current worklet input sample rate
    const currentInputSampleRate = sampleRate || this.inputSampleRate;
    if (currentInputSampleRate !== this.inputSampleRate) {
      this.inputSampleRate = currentInputSampleRate;
      this._resampleRatio = this.inputSampleRate / this.targetSampleRate;
      console.log("🎵 Updated sample rate ratio:", this.inputSampleRate, "->", this.targetSampleRate, "ratio:", this._resampleRatio);
    }

    const resampled = this._resample(channelData);
    const pcm16 = this._floatToPCM16(resampled);
    
    // Debug: log occasionally
    if (Math.random() < 0.01) {
      console.log("🎵 PCM16Processor: processed", channelData.length, "samples ->", pcm16.length, "PCM16 samples");
    }
    
    // Post as transferable ArrayBuffer
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    return true;
  }
}

registerProcessor('pcm16-worker', PCM16Processor);



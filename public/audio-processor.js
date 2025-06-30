// This class will be registered as an AudioWorkletProcessor
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Initialize with the standard 48000 Hz sample rate
    this.sampleRate = 48000;
    // Buffer for accumulating audio data
    this.buffer = [];
    // Target chunks of 1024 samples
    this.bufferSize = 1024;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'init') {
        this.sampleRate = event.data.sampleRate;
        console.log(`AudioProcessor initialized with sample rate: ${this.sampleRate}`);
      }
    };
  }

  static get parameterDescriptors() {
    return [];
  }

  // Simple and efficient downsampling function
  downsample(audioData, inSampleRate, outSampleRate) {
    if (inSampleRate === outSampleRate) {
      return audioData;
    }
    
    const ratio = inSampleRate / outSampleRate;
    const outLength = Math.ceil(audioData.length / ratio);
    const result = new Float32Array(outLength);
    
    for (let i = 0; i < outLength; i++) {
      result[i] = audioData[Math.floor(i * ratio)];
    }
    
    return result;
  }

  process(inputs, outputs) {
    // Get the input data from the first channel
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }
    
    const audioChunk = input[0];
    
    // Downsample to 16kHz (Deepgram's preferred rate)
    const downsampled = this.downsample(audioChunk, this.sampleRate, 16000);
    
    // Convert to Int16 format (-32768 to 32767)
    const audioData = new Int16Array(downsampled.length);
    for (let i = 0; i < downsampled.length; i++) {
      audioData[i] = Math.max(-32768, Math.min(32767, Math.floor(downsampled[i] * 32767)));
    }
    
    // Send the processed audio chunk to the main thread
    this.port.postMessage(audioData.buffer, [audioData.buffer]);
    
    // Keep the processor alive
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 
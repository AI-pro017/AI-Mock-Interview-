// This class will be registered as an AudioWorkletProcessor
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Always use 16kHz for Deepgram
    this.outputSampleRate = 16000;
    
    // Log that we're initialized
    console.log("🎛️ AudioProcessor initialized");
    
    // Buffer to accumulate samples for downsampling
    this.buffer = [];
    this.bufferSize = 2048; // Process in larger chunks
  }

  static get parameterDescriptors() {
    return [];
  }

  // Simple and efficient downsampling function
  downsample(audioData, inputSampleRate) {
    const ratio = inputSampleRate / this.outputSampleRate;
    const newLength = Math.ceil(audioData.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const sourceIndex = Math.min(Math.floor(i * ratio), audioData.length - 1);
      result[i] = audioData[sourceIndex];
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
    
    // Get the actual sample rate from the context
    const inputSampleRate = sampleRate;
    
    // Downsample to 16kHz (Deepgram's preferred rate)
    const downsampled = this.downsample(audioChunk, inputSampleRate);
    
    // Convert to Int16 format (-32768 to 32767)
    const audioData = new Int16Array(downsampled.length);
    for (let i = 0; i < downsampled.length; i++) {
      // Ensure proper conversion to Int16
      const sample = downsampled[i] * 32767;
      audioData[i] = Math.max(-32768, Math.min(32767, Math.round(sample)));
    }
    
    // Send the processed audio chunk to the main thread
    this.port.postMessage(audioData.buffer, [audioData.buffer]);
    
    // Keep the processor alive
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 
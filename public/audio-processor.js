// This class will be registered as an AudioWorkletProcessor
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 48000; // Default browser sample rate
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

  // Helper function to downsample and convert audio to 16-bit PCM
  processAudio(inputData) {
    const inputSampleRate = this.sampleRate;
    const outputSampleRate = 16000; // Deepgram's recommended sample rate

    if (inputSampleRate === outputSampleRate) {
      return inputData;
    }

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(inputData.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputData.length; i++) {
        accum += inputData[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  process(inputs, outputs, parameters) {
    // We only need the first channel of the first input
    const input = inputs[0];
    const channelData = input[0];

    if (!channelData) {
      return true; // Keep processor alive
    }

    // Downsample and convert to Int16
    const downsampled = this.processAudio(channelData);
    const int16 = new Int16Array(downsampled.length);
    for (let i = 0; i < downsampled.length; i++) {
      // Ensure we're within valid Int16 range (-32768 to 32767)
      int16[i] = Math.max(-32768, Math.min(32767, Math.round(downsampled[i] * 32767)));
    }

    // Post the processed data back to the main thread
    this.port.postMessage(int16.buffer, [int16.buffer]);

    return true; // Indicate that the processor should remain active
  }
}

registerProcessor('audio-processor', AudioProcessor); 
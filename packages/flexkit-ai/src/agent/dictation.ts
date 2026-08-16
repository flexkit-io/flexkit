export const DICTATION_SAMPLE_RATE = 24_000;
export const DICTATION_MAX_DURATION_SECONDS = 60;
export const DICTATION_MIN_DURATION_SECONDS = 0.25;

export function appendDictatedText(existing: string, transcript: string): string {
  const dictated = transcript.trim();

  if (!dictated) {
    return existing;
  }

  if (!existing.trim()) {
    return existing.length === 0 ? dictated : `${existing}${dictated}`;
  }

  if (/\s$/.test(existing) || /^[.,!?;:]/.test(dictated)) {
    return `${existing}${dictated}`;
  }

  return `${existing} ${dictated}`;
}

export async function convertRecordedAudioToPcm(blob: Blob): Promise<{ durationSeconds: number; pcm: Blob }> {
  if (typeof window === 'undefined') {
    throw new Error('Dictation is only available in the browser.');
  }

  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error('This browser cannot decode recorded audio.');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContextCtor();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(audioBuffer);
    const resampled = resample(mono, audioBuffer.sampleRate, DICTATION_SAMPLE_RATE);
    const pcm = floatToPcm16(resampled);
    const durationSeconds = resampled.length / DICTATION_SAMPLE_RATE;

    if (durationSeconds < DICTATION_MIN_DURATION_SECONDS) {
      throw new Error('No speech was captured. Try again.');
    }

    if (durationSeconds > DICTATION_MAX_DURATION_SECONDS) {
      throw new Error(`Dictation is limited to ${String(DICTATION_MAX_DURATION_SECONDS)} seconds.`);
    }

    return {
      durationSeconds,
      pcm: new Blob([pcm], { type: 'audio/pcm' }),
    };
  } finally {
    await audioContext.close();
  }
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const { length, numberOfChannels: channelCount } = buffer;

  if (channelCount === 1) {
    return buffer.getChannelData(0).slice();
  }

  const mono = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    let sum = 0;

    for (let channel = 0; channel < channelCount; channel += 1) {
      sum += buffer.getChannelData(channel)[index] ?? 0;
    }

    mono[index] = sum / channelCount;
  }

  return mono;
}

function resample(samples: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) {
    return samples;
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(left + 1, samples.length - 1);
    const fraction = sourceIndex - left;
    const leftSample = samples[left] ?? 0;
    const rightSample = samples[right] ?? 0;
    output[index] = leftSample + (rightSample - leftSample) * fraction;
  }

  return output;
}

function floatToPcm16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

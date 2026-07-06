/** Encode a recorded audio Blob as 16 kHz mono WAV for the voice-server STT endpoint. */
export async function blobToWav16k(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16_000), 16_000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const pcm = rendered.getChannelData(0);
    const int16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      const sample = Math.max(-1, Math.min(1, pcm[i]));
      int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return encodeWav(int16, 16_000);
  } finally {
    void audioContext.close();
  }
}

function encodeWav(samples: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  const pcmOffset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(pcmOffset + i * 2, samples[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), 'audio');
const sampleRate = 44100;

function writeTone(name, duration, voice) {
  const sampleCount = Math.floor(sampleRate * duration);
  const audioData = Buffer.alloc(sampleCount * 2);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.min(1, time / 0.008) * Math.pow(1 - time / duration, 1.3);
    const sample = Math.max(-1, Math.min(1, voice(time) * envelope * 0.72));
    audioData.writeInt16LE(Math.round(sample * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + audioData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(audioData.length, 40);

  writeFileSync(join(outputDirectory, name), Buffer.concat([header, audioData]));
}

function sine(frequency, time) {
  return Math.sin(2 * Math.PI * frequency * time);
}

mkdirSync(outputDirectory, { recursive: true });

writeTone('start.wav', 0.28, (time) => {
  const note = time < 0.12 ? 523.25 : time < 0.2 ? 659.25 : 783.99;
  return sine(note, time) * 0.72 + sine(note * 2, time) * 0.14;
});

writeTone('eat.wav', 0.14, (time) => {
  const frequency = time < 0.065 ? 880 : 1174.66;
  return sine(frequency, time) * 0.76 + sine(frequency * 1.5, time) * 0.12;
});

writeTone('reverse.wav', 0.2, (time) => {
  const frequency = 360 + 760 * (time / 0.2);
  return sine(frequency, time) * 0.7 + sine(frequency * 2.01, time) * 0.16;
});

writeTone('game-over.wav', 0.42, (time) => {
  const frequency = 520 - 360 * (time / 0.42);
  const pulse = Math.sign(sine(frequency, time));
  return pulse * 0.5 + sine(frequency * 0.5, time) * 0.24;
});

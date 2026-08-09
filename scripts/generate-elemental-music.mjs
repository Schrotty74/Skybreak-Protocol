#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SAMPLE_RATE = 44_100;
const DURATION = 48;
const FRAMES = SAMPLE_RATE * DURATION;
const output = new URL("../public/audio/", import.meta.url);
const temporary = mkdtempSync(join(tmpdir(), "skybreak-elemental-music-"));

function waveform(type, phase) {
  if (type === "triangle") return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  return Math.sin(phase);
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => { state = (state * 1_664_525 + 1_013_904_223) >>> 0; return state / 0x1_0000_0000; };
}

function renderTrack({ file, bpm, scale, progression, lead, flavor, seed }) {
  const mix = new Float32Array(FRAMES);
  const random = seeded(seed);
  const beat = 60 / bpm;
  const addTone = (start, length, frequency, gain, type = "sine", release = .18) => {
    const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
    const last = Math.min(FRAMES, Math.ceil((start + length) * SAMPLE_RATE));
    for (let frame = first; frame < last; frame++) {
      const elapsed = (frame - first) / SAMPLE_RATE;
      const fadeIn = Math.min(1, elapsed / .018);
      const fadeOut = Math.min(1, Math.max(0, (last - frame) / SAMPLE_RATE) / release);
      const vibrato = flavor === "air" ? Math.sin(elapsed * Math.PI * 8) * .009 : flavor === "water" ? Math.sin(elapsed * Math.PI * 1.4) * .003 : 0;
      mix[frame] += waveform(type, Math.PI * 2 * frequency * elapsed * (1 + vibrato)) * gain * fadeIn * fadeOut;
    }
  };
  const addKick = (start, gain) => {
    const first = Math.floor(start * SAMPLE_RATE); const last = Math.min(FRAMES, first + Math.floor(.24 * SAMPLE_RATE));
    for (let frame = first; frame < last; frame++) {
      const elapsed = (frame - first) / SAMPLE_RATE;
      const frequency = 108 * Math.exp(-elapsed * 16) + 42;
      mix[frame] += Math.sin(Math.PI * 2 * frequency * elapsed) * gain * Math.exp(-elapsed * 15);
    }
  };
  const addNoise = (start, length, gain) => {
    const first = Math.floor(start * SAMPLE_RATE); const last = Math.min(FRAMES, first + Math.floor(length * SAMPLE_RATE));
    for (let frame = first; frame < last; frame++) mix[frame] += (random() * 2 - 1) * gain * Math.exp(-((frame - first) / SAMPLE_RATE) * 22);
  };
  const totalBars = Math.floor(DURATION / (beat * 4));
  for (let bar = 0; bar < totalBars; bar++) {
    const start = bar * beat * 4;
    const root = progression[bar % progression.length];
    [root, root * 1.25, root * 1.5].forEach((note, index) => addTone(start, beat * 3.7, note, .022 - index * .003, flavor === "fire" ? "triangle" : "sine", .45));
    for (let pulse = 0; pulse < 4; pulse++) {
      const at = start + pulse * beat;
      if (flavor === "fire" || flavor === "earth") addKick(at, flavor === "fire" ? .18 : .14);
      if (pulse === 1 || pulse === 3) addNoise(at, .09, flavor === "fire" ? .045 : flavor === "earth" ? .032 : .018);
      addTone(at, beat * .62, root * .5, flavor === "water" ? .035 : .055, "triangle", .14);
    }
    const rhythm = flavor === "air" ? 8 : flavor === "water" ? 6 : 8;
    for (let step = 0; step < rhythm; step++) {
      const at = start + step * (beat * 4 / rhythm);
      const note = root * scale[lead[(step + bar * (flavor === "water" ? 2 : 1)) % lead.length] % scale.length];
      const accent = step % 4 === 0 ? .115 : .078;
      addTone(at, beat * (flavor === "water" ? .82 : .48), note, accent, flavor === "fire" ? "triangle" : "sine", .16);
      if (step % 3 === 1) addTone(at + .03, beat * .36, note * 1.5, accent * .42, "sine", .12);
    }
    if (flavor === "water" && bar % 2 === 1) addNoise(start + beat * 2.5, .35, .009);
    if (flavor === "air" && bar % 2 === 0) addNoise(start + beat * 1.25, .055, .013);
  }
  const pcm = Buffer.allocUnsafe(FRAMES * 2);
  for (let frame = 0; frame < FRAMES; frame++) pcm.writeInt16LE(Math.round(Math.max(-.92, Math.min(.92, mix[frame] * .72)) * 32767), frame * 2);
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SAMPLE_RATE, 24); wav.writeUInt32LE(SAMPLE_RATE * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
  const wavPath = join(temporary, `${file}.wav`);
  writeFileSync(wavPath, wav);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", String(SAMPLE_RATE), join(output.pathname, `${file}.mp3`)], { stdio: "inherit" });
}

mkdirSync(output, { recursive: true });
renderTrack({ file: "level-11-inferno-foundry", bpm: 116, scale: [1, 1.125, 1.2, 1.333, 1.5, 1.6, 1.8], progression: [110, 146.83, 87.31, 98], lead: [0, 2, 4, 2, 5, 4, 3, 1], flavor: "fire", seed: 11 });
renderTrack({ file: "level-12-abyssal-data-ocean", bpm: 92, scale: [1, 1.125, 1.25, 1.333, 1.5, 1.667, 1.875], progression: [110, 146.83, 123.47, 98], lead: [0, 2, 4, 5, 4, 2, 1, 3], flavor: "water", seed: 12 });
renderTrack({ file: "level-13-stratosphere-relay", bpm: 126, scale: [1, 1.125, 1.25, 1.5, 1.667, 1.875, 2], progression: [196, 220, 174.61, 146.83], lead: [0, 2, 4, 6, 4, 2, 5, 3], flavor: "air", seed: 13 });
renderTrack({ file: "level-14-terra-core-citadel", bpm: 100, scale: [1, 1.125, 1.2, 1.333, 1.5, 1.6, 1.8], progression: [73.42, 87.31, 110, 98], lead: [0, 2, 1, 4, 2, 5, 3, 1], flavor: "earth", seed: 14 });
rmSync(temporary, { recursive: true, force: true });

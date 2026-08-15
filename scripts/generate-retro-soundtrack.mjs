#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Original, sample-free 16-bit arcade soundtrack for Levels 1–10.
// Each profile has a different meter, tempo, tonal palette, rhythm, and motif.
const SAMPLE_RATE = 44_100;
const output = new URL("../public/audio/", import.meta.url);
const temporary = mkdtempSync(join(tmpdir(), "skybreak-retro-soundtrack-"));
const semitone = (root, steps) => root * Math.pow(2, steps / 12);

const TRACKS = [
  { file: "level-01-neon-undercity", title: "Neon Undercity", bpm: 112, beats: 4, bars: 32, root: 130.81, progression: [0, -5, -3, -7], wave: "square", bass: "pulse", drums: "drive", arp: [0, 7, 12, 15, 12, 7, 3, 7], motifA: [12, 15, 19, 22, 19, 15, 14, 12], motifB: [19, 22, 24, 22, 19, 15, 19, 22], seed: 101 },
  { file: "level-02-chrome-bazaar", title: "Chrome Bazaar", bpm: 124, beats: 4, bars: 30, root: 146.83, progression: [0, 5, 3, 7], wave: "triangle", bass: "triangle", drums: "funk", arp: [0, 4, 7, 11, 7, 4, 9, 7], motifA: [12, 11, 9, 7, 9, 11, 14, 16], motifB: [16, 14, 11, 12, 9, 7, 9, 11], seed: 202 },
  { file: "level-03-toxic-transit", title: "Toxic Transit", bpm: 136, beats: 4, bars: 32, root: 110, progression: [0, 0, 3, -2], wave: "pulse", bass: "square", drums: "train", arp: [0, 3, 7, 10, 12, 10, 7, 3], motifA: [7, 10, 12, 10, 7, 3, 5, 7], motifB: [14, 12, 10, 7, 10, 12, 15, 14], seed: 303 },
  { file: "level-04-crimson-firewall", title: "Crimson Firewall", bpm: 148, beats: 4, bars: 32, root: 98, progression: [0, -2, -5, -7], wave: "saw", bass: "pulse", drums: "assault", arp: [0, 7, 10, 13, 10, 7, 3, 7], motifA: [12, 13, 15, 12, 10, 7, 10, 12], motifB: [19, 17, 15, 13, 12, 10, 7, 10], seed: 404 },
  { file: "level-05-azure-data-sea", title: "Azure Data Sea", bpm: 98, beats: 6, bars: 24, root: 146.83, progression: [0, 5, -2, 3], wave: "sine", bass: "triangle", drums: "current", arp: [0, 7, 12, 7, 3, 10, 15, 10], motifA: [12, 14, 15, 19, 15, 14, 12, 10], motifB: [19, 17, 15, 14, 12, 10, 7, 10], seed: 505 },
  { file: "level-06-violet-reactor", title: "Violet Reactor", bpm: 128, beats: 5, bars: 28, root: 116.54, progression: [0, 6, 2, -3], wave: "pulse", bass: "pulse", drums: "reactor", arp: [0, 6, 12, 18, 12, 6, 9, 15], motifA: [12, 18, 17, 12, 14, 21, 19, 17], motifB: [24, 21, 18, 17, 19, 14, 12, 9], seed: 606 },
  { file: "level-07-solar-megagrid", title: "Solar Megagrid", bpm: 144, beats: 4, bars: 32, root: 146.83, progression: [0, 7, 5, 9], wave: "triangle", bass: "square", drums: "solar", arp: [0, 4, 7, 12, 16, 12, 7, 4], motifA: [16, 19, 21, 23, 21, 19, 16, 14], motifB: [23, 21, 19, 16, 19, 21, 24, 26], seed: 707 },
  { file: "level-08-ghost-network", title: "Ghost Network", bpm: 106, beats: 3, bars: 40, root: 130.81, progression: [0, -3, 5, 2], wave: "sine", bass: "pulse", drums: "ghost", arp: [0, 7, 10, 14, 10, 7, 3, 7], motifA: [19, 17, 14, 12, 14, 17, 19, 22], motifB: [22, 19, 17, 14, 12, 10, 12, 14], seed: 808 },
  { file: "level-09-quantum-rift", title: "Quantum Rift", bpm: 132, beats: 7, bars: 24, root: 103.83, progression: [0, 1, 6, -1], wave: "pulse", bass: "triangle", drums: "rift", arp: [0, 1, 7, 13, 8, 15, 10, 17], motifA: [12, 13, 19, 20, 17, 24, 20, 19], motifB: [25, 20, 17, 19, 13, 12, 8, 13], seed: 909 },
  { file: "level-10-skybreak-apex", title: "Skybreak Apex", bpm: 156, beats: 4, bars: 32, root: 164.81, progression: [0, 5, 7, 3], wave: "square", bass: "pulse", drums: "apex", arp: [0, 4, 7, 12, 7, 11, 14, 19], motifA: [19, 23, 26, 23, 19, 16, 19, 23], motifB: [26, 28, 31, 28, 26, 23, 19, 23], seed: 1010 },
];

function seeded(seed) { let state = seed >>> 0; return () => { state = (state * 1_664_525 + 1_013_904_223) >>> 0; return state / 0x1_0000_0000; }; }
function waveform(kind, phase) {
  const cycle = phase - Math.floor(phase);
  if (kind === "square") return cycle < .5 ? 1 : -1;
  if (kind === "pulse") return cycle < .25 ? 1 : -1;
  if (kind === "triangle") return 1 - 4 * Math.abs(cycle - .5);
  if (kind === "saw") return 2 * cycle - 1;
  return Math.sin(cycle * Math.PI * 2);
}

function render(profile) {
  const beat = 60 / profile.bpm;
  const duration = profile.bars * profile.beats * beat;
  const frames = Math.ceil(duration * SAMPLE_RATE);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const random = seeded(profile.seed);
  const tone = ({ start, length, frequency, gain, kind = profile.wave, pan = 0, release = .06, bend = 0, vibrato = 0 }) => {
    const first = Math.max(0, Math.floor(start * SAMPLE_RATE)); const last = Math.min(frames, Math.ceil((start + length) * SAMPLE_RATE));
    for (let frame = first; frame < last; frame++) {
      const elapsed = (frame - first) / SAMPLE_RATE; const remaining = (last - frame) / SAMPLE_RATE;
      const envelope = Math.min(1, elapsed / .008, remaining / release);
      const rate = frequency * (1 + bend * elapsed / Math.max(length, .01) + vibrato * Math.sin(elapsed * Math.PI * 10));
      const sample = waveform(kind, elapsed * rate) * gain * envelope;
      left[frame] += sample * (1 - Math.max(0, pan)); right[frame] += sample * (1 + Math.min(0, pan));
    }
  };
  const kick = (start, gain = .3) => {
    const first = Math.floor(start * SAMPLE_RATE); const last = Math.min(frames, first + Math.floor(.2 * SAMPLE_RATE));
    for (let frame = first; frame < last; frame++) { const t = (frame - first) / SAMPLE_RATE; const sample = Math.sin(Math.PI * 2 * (118 * Math.exp(-t * 18) + 40) * t) * gain * Math.exp(-t * 15); left[frame] += sample; right[frame] += sample; }
  };
  const noise = (start, length, gain, pan = 0) => {
    const first = Math.floor(start * SAMPLE_RATE); const last = Math.min(frames, first + Math.floor(length * SAMPLE_RATE));
    for (let frame = first; frame < last; frame++) { const t = (frame - first) / SAMPLE_RATE; const sample = (random() * 2 - 1) * gain * Math.exp(-t * 28); left[frame] += sample * (1 - Math.max(0, pan)); right[frame] += sample * (1 + Math.min(0, pan)); }
  };
  for (let bar = 0; bar < profile.bars; bar++) {
    const start = bar * profile.beats * beat; const root = semitone(profile.root, profile.progression[bar % profile.progression.length]);
    const phrase = Math.floor(bar / 8) % 2; const motif = phrase ? profile.motifB : profile.motifA;
    const steps = profile.beats * 2;
    for (let step = 0; step < profile.beats; step++) {
      const offset = step * beat + ((profile.drums === "funk" || profile.drums === "current") && step % 2 ? beat * .12 : 0);
      if (profile.drums !== "ghost" || step === 0) tone({ start: start + offset, length: beat * .72, frequency: root / 2, gain: .085, kind: profile.bass, release: .12 });
      if (profile.drums !== "ghost" || step === 0 || step === 2) kick(start + step * beat, profile.drums === "current" ? .17 : .29);
      if (step % 2 === 1) noise(start + step * beat, profile.drums === "ghost" ? .2 : .1, profile.drums === "current" ? .018 : .055, step % 4 ? -.22 : .22);
      if (profile.drums === "assault" && step % 2 === 0) kick(start + step * beat + beat * .5, .18);
      if (profile.drums === "rift" && step === profile.beats - 1) noise(start + step * beat + beat * .45, .2, .07, .35);
    }
    for (let step = 0; step < steps; step++) {
      const at = start + step * (beat * .5); const arp = profile.arp[(step + bar * (phrase ? 2 : 1)) % profile.arp.length];
      tone({ start: at, length: beat * .28, frequency: semitone(root, arp), gain: profile.drums === "current" ? .026 : .038, kind: profile.wave, pan: step % 2 ? .24 : -.24, release: .035 });
      const note = motif[step % motif.length]; const accent = step % Math.max(3, profile.beats) === 0;
      tone({ start: at, length: beat * (accent ? .7 : .32), frequency: semitone(root, note), gain: accent ? .078 : .052, kind: profile.wave, pan: .06, release: .07, bend: profile.drums === "reactor" ? .018 : profile.drums === "ghost" ? -.012 : 0, vibrato: profile.drums === "current" ? .007 : 0 });
    }
    if (bar % 8 === 7) [12, 16, 19, 24].forEach((note, index) => tone({ start: start + beat * (profile.beats - 1.4 + index * .22), length: beat * .45, frequency: semitone(root, note), gain: .065, kind: "square", pan: -.18 + index * .12, bend: .02 }));
  }
  let peak = .001; for (let frame = 0; frame < frames; frame++) peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]));
  const pcm = Buffer.allocUnsafe(frames * 4);
  for (let frame = 0; frame < frames; frame++) { pcm.writeInt16LE(Math.round(Math.max(-.92, Math.min(.92, left[frame] / peak * .78)) * 32767), frame * 4); pcm.writeInt16LE(Math.round(Math.max(-.92, Math.min(.92, right[frame] / peak * .78)) * 32767), frame * 4 + 2); }
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SAMPLE_RATE, 24); wav.writeUInt32LE(SAMPLE_RATE * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
  const wavPath = join(temporary, `${profile.file}.wav`); writeFileSync(wavPath, wav);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "192k", "-ar", String(SAMPLE_RATE), join(output.pathname, `${profile.file}.mp3`)], { stdio: "inherit" });
  console.log(`${profile.title}: ${profile.bpm} BPM, ${duration.toFixed(1)} s`);
}

for (const profile of TRACKS) render(profile);
rmSync(temporary, { recursive: true, force: true });

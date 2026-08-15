import { LEVEL_COUNT, MUSIC_TRACKS } from "./levelData";

export function createAudio() {
  let context: AudioContext | null = null;
  let music: HTMLAudioElement | null = null;
  const activeMusic = new Set<HTMLAudioElement>();
  let soundEnabled = true;
  let currentSector = 0;
  let fadeFrame = 0;
  let musicRequest = 0;
  let elementalTimer = 0;
  let elementalNodes: OscillatorNode[] = [];
  const tone = (frequency: number, duration: number, type: OscillatorType, gain = 0.07) => {
    if (!soundEnabled) return;
    context ??= new AudioContext();
    if (context.state === "suspended") context.resume();
    const osc = context.createOscillator(); const amp = context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.72), context.currentTime + duration);
    amp.gain.setValueAtTime(gain, context.currentTime); amp.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(amp).connect(context.destination); osc.start(); osc.stop(context.currentTime + duration);
  };
  const stopElementalMusic = () => {
    window.clearInterval(elementalTimer); elementalTimer = 0;
    for (const node of elementalNodes) {
      try { node.stop(); } catch { /* already stopped */ }
    }
    elementalNodes = [];
  };
  const stopTrack = (track: HTMLAudioElement) => {
    track.pause();
    track.src = "";
    activeMusic.delete(track);
  };
  const stopTracksExcept = (keep: HTMLAudioElement | null = null) => {
    for (const track of [...activeMusic]) {
      if (track !== keep) stopTrack(track);
    }
  };
  const startElementalMusic = async (sector: number) => {
    stopElementalMusic();
    context ??= new AudioContext();
    // A level transition can happen after the original click event has ended.
    // Awaiting the resume is essential on Safari/iOS; starting oscillators on
    // a still-suspended context otherwise looks successful but stays silent.
    if (context.state === "suspended") await context.resume().catch(() => undefined);
    if (context.state !== "running" || currentSector !== sector) return;
    const index = sector - 11;
    // Keep the browser's audio session continuously active with a zero-gain
    // carrier. It is mathematically silent, so it cannot reintroduce the
    // former hum, but avoids a visible on/off speaker state for every note.
    const silentCarrier = context.createOscillator(); const silentGain = context.createGain();
    silentCarrier.type = "sine"; silentCarrier.frequency.value = 1;
    silentGain.gain.value = 0;
    silentCarrier.connect(silentGain).connect(context.destination);
    silentCarrier.start(); elementalNodes.push(silentCarrier);
    // These tracks use only fading notes. A permanently running pad was both
    // monotonous and responsible for the residual hum in the water level.
    const waves: OscillatorType[] = ["triangle", "sine", "sine", "triangle"];
    const phrases: number[][][] = [
      // Fire: uneven forge rhythm with rising sparks and a heavier answer.
      [[110, 165], [220], [165], [247, 330], [110], [196], [165, 247], [294]],
      // Water: two alternating, flowing chords instead of a static drone.
      [[220, 330], [277], [330, 440], [392], [330], [277, 415], [220], [330, 494]],
      // Air: light, quicker arpeggios with open fifths.
      [[392], [523, 587], [659], [523], [784, 659], [587], [523, 698], [880]],
      // Earth: low, irregular mineral pulses with sparse harmonic notes.
      [[73, 110], [146], [92], [110, 146], [73], [123], [98, 146], [110]],
    ];
    const alternatePhrases: number[][][] = [
      [[110], [196, 247], [165], [220], [294, 220], [165], [247], [330]],
      [[220], [330, 392], [277], [440], [330, 494], [277], [220, 330], [392]],
      [[392, 523], [659], [523], [784], [659, 880], [523], [698], [587, 784]],
      [[73], [110, 146], [92], [123], [146, 184], [98], [73, 110], [146]],
    ];
    let step = 0;
    let phraseVariant = 0;
    const elementTone = (note: number, duration: number, accent = 1) => {
      if (!context || context.state !== "running") return;
      const osc = context.createOscillator(); const amp = context.createGain();
      osc.type = waves[index]; osc.frequency.setValueAtTime(note, context.currentTime);
      amp.gain.setValueAtTime((index === 2 ? .095 : .12) * accent, context.currentTime);
      amp.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      osc.connect(amp).connect(context.destination); osc.start(); osc.stop(context.currentTime + duration);
    };
    const playPhraseStep = () => {
      const phrase = phraseVariant ? alternatePhrases[index] : phrases[index];
      const notes = phrase[step];
      const duration = index === 0 ? .58 : index === 1 ? 1.22 : index === 2 ? .72 : 1.04;
      for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) elementTone(notes[noteIndex], duration, noteIndex ? .58 : 1);
      if (step === 0 || step === 4) elementTone(notes[0] * .5, duration * .78, .62);
      step += 1;
      if (step >= phrase.length) { step = 0; phraseVariant = phraseVariant ? 0 : 1; }
    };
    playPhraseStep();
    elementalTimer = window.setInterval(playPhraseStep, [680, 1180, 790, 1090][index]);
  };
  const playMusic = async (sector: number) => {
    const nextSector = Math.max(1, Math.min(LEVEL_COUNT, sector));
    if (music && currentSector === nextSector) {
      // A quick level transition may have left an earlier fading element in
      // the set. The current sector must always have exactly one MP3 player.
      stopTracksExcept(music);
      if (music.paused) await music.play().catch(() => undefined);
      return;
    }
    const request = ++musicRequest;
    cancelAnimationFrame(fadeFrame);
    if (nextSector > MUSIC_TRACKS.length) {
      stopTracksExcept();
      music = null;
      currentSector = nextSector;
      await startElementalMusic(nextSector);
      return;
    }
    stopElementalMusic();
    const previous = music;
    // Only the current track receives a crossfade. Any older one is residue
    // from an interrupted crossfade and must never remain audible.
    stopTracksExcept(previous);
    if (previous) previous.volume = .28;
    const next = new Audio(MUSIC_TRACKS[Math.min(MUSIC_TRACKS.length - 1, nextSector - 1)]);
    activeMusic.add(next); next.loop = true; next.preload = "auto"; next.volume = 0;
    try { await next.play(); } catch { activeMusic.delete(next); return; }
    if (request !== musicRequest) { next.pause(); next.src = ""; activeMusic.delete(next); return; }
    music = next; currentSector = nextSector;
    const started = performance.now();
    const fade = (time: number) => {
      const progress = Math.min(1, (time - started) / 900);
      next.volume = .28 * progress;
      if (previous) previous.volume = .28 * (1 - progress);
      if (progress < 1) fadeFrame = requestAnimationFrame(fade);
      else {
        if (previous) stopTrack(previous);
        // Defensive cleanup for a fade interrupted by an unusually fast
        // transition: no player except the new sector may survive.
        stopTracksExcept(next);
      }
    };
    fadeFrame = requestAnimationFrame(fade);
  };
  const stop = () => { musicRequest += 1; cancelAnimationFrame(fadeFrame); stopElementalMusic(); for (const track of activeMusic) { track.pause(); track.src = ""; } activeMusic.clear(); music = null; currentSector = 0; void context?.close(); context = null; };
  const pauseMusic = () => { musicRequest += 1; cancelAnimationFrame(fadeFrame); stopElementalMusic(); for (const track of activeMusic) { track.pause(); if (track !== music) { track.src = ""; activeMusic.delete(track); } } if (music) music.volume = .28; };
  const setSoundEnabled = (enabled: boolean) => { soundEnabled = enabled; if (!enabled) { void context?.close(); context = null; } };
  const elementIndex = () => Math.max(0, Math.min(3, currentSector - 11));
  return { jump: () => tone(currentSector > 10 ? [180, 420, 600, 125][elementIndex()] : 330, .11, currentSector > 10 ? ["sawtooth", "sine", "triangle", "square"][elementIndex()] as OscillatorType : "square", .045), smash: () => tone(currentSector > 10 ? [70, 330, 520, 95][elementIndex()] : 105, .16, currentSector > 10 ? ["sawtooth", "sine", "triangle", "square"][elementIndex()] as OscillatorType : "sawtooth", .08), hit: () => tone(currentSector > 10 ? [52, 180, 310, 62][elementIndex()] : 65, .3, currentSector > 10 ? ["sawtooth", "sine", "triangle", "square"][elementIndex()] as OscillatorType : "sawtooth", .1), enemy: () => tone(520, .1, "square", .06), powerUp: () => { tone(440, .12, "sine", .065); window.setTimeout(() => tone(660, .16, "sine", .06), 90); }, shield: () => tone(210, .24, "sine", .08), win: () => { tone(520, .22, "sine", .07); window.setTimeout(() => tone(780, .32, "sine", .07), 130); }, playMusic, pauseMusic, setSoundEnabled, stop };
}

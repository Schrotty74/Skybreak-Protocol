"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkForUpdate, type AvailableUpdate } from "./updateCheck";
import { applyPowerUp, buildChestSpawns, ROAMING_CHEST_RULES, type PowerUpKind, type RoamingChestDifficulty } from "./powerUps";
import { detectCheat, type CheatId } from "./cheats";
import { actionForCode, DEFAULT_KEY_BINDINGS, displayKey, normalizeKeyBindings, rebindKey, type BindableAction, type KeyBindings } from "./keyBindings";

type GameStatus = "ready" | "playing" | "paused" | "upgrade" | "gameover" | "won";
type InputKey = BindableAction;
type Quality = "low" | "medium" | "high" | "ultra";
type Difficulty = "easy" | "medium" | "hard";

const LEVEL_COUNT = 10;
const APP_VERSION = __APP_VERSION__;
const CHANGELOG_BASE_URL = "https://github.com/Schrotty74/Skybreak-Protocol/blob/main/docs/releases";
const LEVEL_THEMES = [
  { name: "Neon Undercity", top: "#051d35", mid: "#18072f", bottom: "#02040d", accent: "#00f0ff", secondary: "#ff2b8a", warning: "#ffd84d", motif: 0 },
  { name: "Chrome Bazaar", top: "#24113f", mid: "#35102d", bottom: "#08040f", accent: "#ff5bd6", secondary: "#39f5c8", warning: "#ffe66d", motif: 1 },
  { name: "Toxic Transit", top: "#102b22", mid: "#132d12", bottom: "#030b08", accent: "#72ff4d", secondary: "#00eaff", warning: "#f5ff73", motif: 2 },
  { name: "Crimson Firewall", top: "#351018", mid: "#280617", bottom: "#090208", accent: "#ff365f", secondary: "#ff9b35", warning: "#fff06a", motif: 3 },
  { name: "Azure Data Sea", top: "#062b45", mid: "#071a45", bottom: "#020612", accent: "#36bfff", secondary: "#7c5cff", warning: "#7fffee", motif: 4 },
  { name: "Violet Reactor", top: "#29104a", mid: "#19072d", bottom: "#05020c", accent: "#c65cff", secondary: "#ff3dbb", warning: "#70f7ff", motif: 5 },
  { name: "Solar Megagrid", top: "#4a1d0a", mid: "#35100e", bottom: "#0c0304", accent: "#ff9f32", secondary: "#ff355d", warning: "#fff26b", motif: 6 },
  { name: "Ghost Network", top: "#0e3034", mid: "#11202e", bottom: "#03070b", accent: "#84fff2", secondary: "#b1a3ff", warning: "#ffffff", motif: 7 },
  { name: "Quantum Rift", top: "#25104b", mid: "#071f3b", bottom: "#03020e", accent: "#9c6bff", secondary: "#00f6ff", warning: "#ff61d2", motif: 8 },
  { name: "Skybreak Apex", top: "#3a143f", mid: "#082d45", bottom: "#02040d", accent: "#ffffff", secondary: "#00f0ff", warning: "#ffcf4a", motif: 9 },
] as const;

const MUSIC_TRACKS = [
  "audio/level-01-neon-undercity.mp3",
  "audio/level-02-chrome-bazaar.mp3",
  "audio/level-03-toxic-transit.mp3",
  "audio/level-04-crimson-firewall.mp3",
  "audio/level-05-azure-data-sea.mp3",
  "audio/level-06-violet-reactor.mp3",
  "audio/level-07-solar-megagrid.mp3",
  "audio/level-08-ghost-network.mp3",
  "audio/level-09-quantum-rift.mp3",
  "audio/level-10-skybreak-apex.mp3",
].map((path) => `${import.meta.env.BASE_URL}${path}`);

const DIFFICULTY_SETTINGS: Record<Difficulty, { enemy: number; hazards: number; hazardSpeed: number; score: number }> = {
  easy: { enemy: 0.78, hazards: 0.72, hazardSpeed: 0.82, score: 0.85 },
  medium: { enemy: 1, hazards: 1, hazardSpeed: 1, score: 1 },
  hard: { enemy: 1.28, hazards: 1.42, hazardSpeed: 1.3, score: 1.35 },
};

const QUALITY_SETTINGS: Record<Quality, {
  fps: number;
  dpr: number;
  glFps: number;
  glDpr: number;
  webgl: boolean;
  traffic: number;
  layers: number;
  rain: number;
  fog: number;
}> = {
  low: { fps: 30, dpr: 1, glFps: 12, glDpr: 0.7, webgl: false, traffic: 4, layers: 1, rain: 12, fog: 1 },
  medium: { fps: 40, dpr: 1.5, glFps: 30, glDpr: 1, webgl: true, traffic: 10, layers: 2, rain: 38, fog: 2 },
  high: { fps: 60, dpr: 2, glFps: 45, glDpr: 1.5, webgl: true, traffic: 18, layers: 3, rain: 65, fog: 3 },
  ultra: { fps: 60, dpr: 4, glFps: 60, glDpr: 2.5, webgl: true, traffic: 26, layers: 3, rain: 110, fog: 4 },
};

const VIEW_W = 960;
const VIEW_H = 540;
const TILE = 64;
const PLAYER_W = 34;
const PLAYER_H = 50;
const LEVEL_FLOORS = 15;
const FLOOR_SPACING = 92;
const FLOOR_BASE_Y = 475;
const GRAVITY = 1450;
const MOVE_SPEED = 255;
const JUMP_SPEED = 610;
const WORLD_TOP = FLOOR_BASE_Y - (LEVEL_FLOORS - 1) * FLOOR_SPACING - PLAYER_H + 13;

type Tile = { x: number; y: number; alive: boolean; cracked: boolean };
type Enemy = { x: number; y: number; vx: number; vy: number; alive: boolean; grounded: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Chest = { x: number; y: number; opened: boolean; powerUp: PowerUpKind };
type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: number;
  attack: number;
  idleTime: number;
  pickaxePower: number;
  pickaxeStyle: number;
  invulnerable: number;
  shield: number;
  overdrive: number;
};

type World = {
  player: Player;
  tiles: Tile[];
  enemies: Enemy[];
  chests: Chest[];
  roamingChest: Chest | null;
  roamingChestTimer: number;
  roamingChestMoves: number;
  roamingChestSector: number;
  collectedRoamingChestSectors: boolean[];
  particles: Particle[];
  cameraX: number;
  cameraY: number;
  score: number;
  lives: number;
  sector: number;
  highestSector: number;
  lastTime: number;
  status: GameStatus;
  hazardTimer: number;
  fxTime: number;
  shake: number;
  powerUpMessage: string;
  powerUpMessageTime: number;
  immortalSector: number | null;
  cheatUsed: boolean;
};

function buildLevel(): Pick<World, "tiles" | "enemies" | "chests"> {
  const tiles: Tile[] = [];
  const enemies: Enemy[] = [];
  const chests: Chest[] = [];
  const chestSpawns = new Map(buildChestSpawns(LEVEL_FLOORS).map((spawn) => [spawn.row, spawn.powerUp]));

  for (let row = 0; row < LEVEL_FLOORS; row++) {
    const y = FLOOR_BASE_Y - row * FLOOR_SPACING;
    const gapStart = row === 0 ? -10 : (row * 5 + 2) % 11;
    const rowTiles: Tile[] = [];
    for (let col = 0; col < 15; col++) {
      const safeEdge = col === 0 || col === 14;
      const gap = !safeEdge && (col === gapStart || (row % 7 === 4 && col === gapStart + 1));
      if (!gap) {
        const tile = { x: col * TILE, y, alive: true, cracked: row > 0 };
        tiles.push(tile);
        rowTiles.push(tile);
      }
    }
    const powerUp = chestSpawns.get(row);
    if (powerUp) {
      const preferredX = (2 + ((row * 7 + 3) % 11)) * TILE;
      const support = rowTiles.reduce((closest, tile) =>
        Math.abs(tile.x - preferredX) < Math.abs(closest.x - preferredX) ? tile : closest,
      );
      chests.push({ x: support.x + 13, y: y - 30, opened: false, powerUp });
    }
    const enemyStep = Math.max(2, 5 - Math.floor(row / 11));
    if (row > 2 && row % enemyStep === 1) {
      enemies.push({
        x: ((row * 137) % 720) + 110,
        y: y - 34,
        vx: row % 8 === 1 ? 72 : -72,
        vy: 0,
        alive: true,
        grounded: true,
      });
    }
  }
  return { tiles, enemies, chests };
}

function makeWorld(): World {
  const level = buildLevel();
  return {
    ...level,
    player: {
      x: 463,
      y: 415,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: 1,
      attack: 0,
      idleTime: 0,
      pickaxePower: 1,
      pickaxeStyle: 1,
      invulnerable: 0,
      shield: 0,
      overdrive: 0,
    },
    particles: [],
    cameraX: 210,
    cameraY: 0,
    score: 0,
    lives: 3,
    sector: 1,
    highestSector: 1,
    lastTime: 0,
    status: "ready",
    hazardTimer: 2.4,
    fxTime: 0,
    shake: 0,
    powerUpMessage: "",
    powerUpMessageTime: 0,
    immortalSector: null,
    cheatUsed: false,
    roamingChest: null,
    roamingChestTimer: 0,
    roamingChestMoves: 0,
    roamingChestSector: 1,
    collectedRoamingChestSectors: Array(LEVEL_COUNT).fill(false),
  };
}

function placeWorldAtLevel(world: World, level: number) {
  const targetLevel = Math.min(LEVEL_COUNT, Math.max(1, Math.round(level)));
  world.sector = targetLevel;
  world.highestSector = targetLevel;
  world.roamingChestSector = targetLevel;
}

function levelProgress(playerY: number): number {
  return Math.max(0, Math.min(1, (FLOOR_BASE_Y - playerY) / (FLOOR_BASE_Y - WORLD_TOP)));
}

const CHEST_POWER_UPS: PowerUpKind[] = ["shield", "life", "score", "overdrive"];

function placeRoamingChest(world: World, difficulty: RoamingChestDifficulty): boolean {
  const sector = world.sector;
  const previous = world.roamingChest;
  const available = world.tiles.filter((tile) => tile.alive
    && tile.y <= Math.min(475, world.player.y + 320)
    && tile.y >= Math.max(WORLD_TOP, world.player.y - 360)
    && tile.x >= TILE
    && tile.x <= VIEW_W - TILE * 2
    && (!previous || Math.abs(tile.x + 13 - previous.x) > TILE || Math.abs(tile.y - 30 - previous.y) > 60));
  if (!available.length) {
    world.roamingChest = null;
    return false;
  }
  const rules = ROAMING_CHEST_RULES[difficulty];
  const forceBelow = world.roamingChestMoves > 0 && world.roamingChestMoves % rules.forceBelowEvery === 0;
  const below = available.filter((tile) => tile.y > world.player.y + 65);
  const pool = forceBelow && below.length ? below : available;
  const chosen = pool[(sector * 11 + world.roamingChestMoves * 7) % pool.length];
  world.roamingChest = {
    x: chosen.x + 13,
    y: chosen.y - 30,
    opened: false,
    powerUp: CHEST_POWER_UPS[(sector - 1) % CHEST_POWER_UPS.length],
  };
  world.roamingChestTimer = rules.visibleSeconds;
  return forceBelow && below.length > 0;
}

function createAudio() {
  let context: AudioContext | null = null;
  let music: HTMLAudioElement | null = null;
  const activeMusic = new Set<HTMLAudioElement>();
  let soundEnabled = true;
  let currentSector = 0;
  let fadeFrame = 0;
  let musicRequest = 0;
  const tone = (frequency: number, duration: number, type: OscillatorType, gain = 0.07) => {
    if (!soundEnabled) return;
    context ??= new AudioContext();
    if (context.state === "suspended") context.resume();
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.72), context.currentTime + duration);
    amp.gain.setValueAtTime(gain, context.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(amp).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration);
  };
  const playMusic = async (sector: number) => {
    const nextSector = Math.max(1, Math.min(LEVEL_COUNT, sector));
    if (music && currentSector === nextSector) {
      if (music.paused) await music.play().catch(() => undefined);
      return;
    }
    const previous = music;
    const request = ++musicRequest;
    const next = new Audio(MUSIC_TRACKS[nextSector - 1]);
    activeMusic.add(next);
    next.loop = true;
    next.preload = "auto";
    next.volume = 0;
    try {
      await next.play();
    } catch {
      activeMusic.delete(next);
      return;
    }
    if (request !== musicRequest) {
      next.pause();
      next.src = "";
      activeMusic.delete(next);
      return;
    }
    music = next;
    currentSector = nextSector;
    cancelAnimationFrame(fadeFrame);
    const started = performance.now();
    const fade = (time: number) => {
      const progress = Math.min(1, (time - started) / 900);
      next.volume = 0.28 * progress;
      if (previous) previous.volume = 0.28 * (1 - progress);
      if (progress < 1) fadeFrame = requestAnimationFrame(fade);
      else {
        previous?.pause();
        if (previous) previous.src = "";
        if (previous) activeMusic.delete(previous);
      }
    };
    fadeFrame = requestAnimationFrame(fade);
  };
  const stop = () => {
    musicRequest += 1;
    cancelAnimationFrame(fadeFrame);
    for (const track of activeMusic) {
      track.pause();
      track.src = "";
    }
    activeMusic.clear();
    music = null;
    currentSector = 0;
    void context?.close();
    context = null;
  };
  const pauseMusic = () => {
    musicRequest += 1;
    cancelAnimationFrame(fadeFrame);
    for (const track of activeMusic) {
      track.pause();
      if (track !== music) {
        track.src = "";
        activeMusic.delete(track);
      }
    }
    if (music) music.volume = 0.28;
  };
  const setSoundEnabled = (enabled: boolean) => {
    soundEnabled = enabled;
    if (!enabled) {
      void context?.close();
      context = null;
    }
  };
  return {
    jump: () => tone(330, 0.11, "square", 0.045),
    smash: () => tone(105, 0.16, "sawtooth", 0.08),
    hit: () => tone(65, 0.3, "sawtooth", 0.1),
    enemy: () => tone(520, 0.1, "square", 0.06),
    powerUp: () => {
      tone(440, 0.12, "sine", 0.065);
      window.setTimeout(() => tone(660, 0.16, "sine", 0.06), 90);
    },
    shield: () => tone(210, 0.24, "sine", 0.08),
    win: () => {
      tone(520, 0.22, "sine", 0.07);
      window.setTimeout(() => tone(780, 0.32, "sine", 0.07), 130);
    },
    playMusic,
    pauseMusic,
    setSoundEnabled,
    stop,
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

type EffectCleanup = () => void;

async function startWebGpuEffects(
  canvas: HTMLCanvasElement,
  updateRenderer: (name: string) => void,
): Promise<EffectCleanup | null> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) return null;

  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) return null;
  if (adapter.info?.isFallbackAdapter) return null;
  const maxTextureSize = Math.min(Number(adapter.limits?.maxTextureDimension2D || 4096), 4096);
  const device = await adapter.requestDevice();
  const format = gpu.getPreferredCanvasFormat();
  const shader = device.createShaderModule({
    label: "Skybreak Ultra atmosphere",
    code: `
      struct Uniforms {
        resolution: vec2f,
        time: f32,
        intensity: f32,
      };
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      fn hash(p: vec2f) -> f32 {
        return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
      }

      fn noise(p: vec2f) -> f32 {
        let i = floor(p);
        var f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), f.x),
                   mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), f.x), f.y);
      }

      @vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
        var points = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
        return vec4f(points[index], 0.0, 1.0);
      }

      @fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
        let uv = position.xy / uniforms.resolution;
        var p = uv * 2.0 - 1.0;
        p.x *= uniforms.resolution.x / uniforms.resolution.y;
        let t = uniforms.time;
        let n1 = noise(p * 3.1 + vec2f(t * 0.05, -t * 0.08));
        let n2 = noise(p * 6.3 - vec2f(t * 0.08, t * 0.04));

        let fogA = exp(-7.0 * abs(p.y + 0.28 + sin(p.x * 2.4 + t * 0.25) * 0.13));
        let fogB = exp(-10.0 * abs(p.y - 0.34 + sin(p.x * 3.7 - t * 0.19) * 0.09));
        let fogC = exp(-14.0 * abs(p.y + 0.02 + sin(p.x * 5.1 + t * 0.31) * 0.05));
        var color = vec3f(0.0, 0.82, 1.0) * fogA * n1 * 0.2;
        color += vec3f(1.0, 0.03, 0.4) * fogB * (1.0 - n1) * 0.18;
        color += vec3f(0.42, 0.18, 1.0) * fogC * n2 * 0.1;

        let rainUv = uv * vec2f(150.0, 32.0);
        let lane = floor(rainUv.x);
        let drop = fract(rainUv.y + t * (3.0 + hash(vec2f(lane, 4.0))) + hash(vec2f(lane, 7.0)) * 9.0);
        let rain = smoothstep(0.93, 1.0, drop) * step(0.73, hash(vec2f(lane, floor(rainUv.y))));
        color += mix(vec3f(0.0, 0.78, 1.0), vec3f(1.0, 0.06, 0.48), hash(vec2f(lane, 2.0))) * rain * 0.15;

        let gridX = 1.0 - smoothstep(0.0, 0.035, abs(fract(uv.x * 28.0) - 0.5));
        let gridY = 1.0 - smoothstep(0.0, 0.045, abs(fract(uv.y * 18.0 + t * 0.05) - 0.5));
        color += vec3f(0.0, 0.45, 0.62) * max(gridX, gridY) * 0.035;

        let beamA = exp(-18.0 * abs(p.x - sin(t * 0.16) * 0.5 - p.y * 0.28));
        let beamB = exp(-21.0 * abs(p.x + cos(t * 0.13) * 0.62 + p.y * 0.34));
        color += vec3f(0.0, 0.62, 0.82) * beamA * 0.045;
        color += vec3f(0.85, 0.02, 0.34) * beamB * 0.04;

        let bloom = exp(-5.5 * length(p - vec2f(sin(t * 0.11) * 0.5, 0.18)));
        color += vec3f(0.18, 0.72, 1.0) * bloom * 0.065;
        let scan = sin(position.y * 1.7 + t * 3.2) * 0.5 + 0.5;
        color += vec3f(0.02, 0.05, 0.08) * scan * 0.035;
        color *= uniforms.intensity;

        let alpha = clamp(max(max(color.r, color.g), color.b) * 1.75, 0.0, 0.34);
        return vec4f(color, alpha);
      }
    `,
  });
  const pipeline = device.createRenderPipeline({
    label: "Skybreak Ultra pipeline",
    layout: "auto",
    vertex: { module: shader, entryPoint: "vertexMain" },
    fragment: {
      module: shader,
      entryPoint: "fragmentMain",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  const context = canvas.getContext("webgpu") as any;
  if (!context) return null;
  context.configure({ device, format, alphaMode: "premultiplied" });

  const usage = (globalThis as any).GPUBufferUsage;
  const uniformBuffer = device.createBuffer({
    label: "Skybreak Ultra uniforms",
    size: 16,
    usage: (usage?.UNIFORM ?? 0x40) | (usage?.COPY_DST ?? 0x08),
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);
  updateRenderer(isMac ? "WEBGPU · METAL" : "WEBGPU · NATIVE GPU");
  let active = true;
  let animation = 0;
  let lastFrame = performance.now();
  let dynamicScale = 1;
  let sampleFrames = 0;
  let sampleTime = 0;

  void device.lost.then(() => {
    if (active) updateRenderer("WEBGPU LOST");
  });

  const render = (time: number) => {
    if (!active) return;
    const delta = Math.min(50, time - lastFrame);
    lastFrame = time;
    sampleTime += delta;
    sampleFrames += 1;
    if (sampleFrames >= 30) {
      const average = sampleTime / sampleFrames;
      if (average > 20.5) dynamicScale = Math.max(0.65, dynamicScale - 0.06);
      else if (average < 17.2) dynamicScale = Math.min(1, dynamicScale + 0.025);
      sampleFrames = 0;
      sampleTime = 0;
    }

    const rect = canvas.getBoundingClientRect();
    const dprLimit = window.matchMedia("(pointer: coarse)").matches ? 2.25 : 3;
    const baseDpr = Math.min(
      window.devicePixelRatio || 1,
      dprLimit,
      maxTextureSize / Math.max(1, rect.width),
      Math.min(2160, maxTextureSize) / Math.max(1, rect.height),
    );
    const width = Math.max(1, Math.round(rect.width * baseDpr * dynamicScale));
    const height = Math.max(1, Math.round(rect.height * baseDpr * dynamicScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([width, height, time * 0.001, 1]));
    const encoder = device.createCommandEncoder({ label: "Skybreak Ultra frame" });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    animation = requestAnimationFrame(render);
  };
  animation = requestAnimationFrame(render);
  return () => {
    active = false;
    cancelAnimationFrame(animation);
    uniformBuffer.destroy();
    device.destroy();
  };
}

async function startWebGpuUltraRenderer(
  canvas: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement,
  updateRenderer: (name: string) => void,
  getSceneInstances: () => Float32Array,
  updateFrameRate: (fps: number) => void,
  getAllowHighRefresh: () => boolean,
  updateThermalProtection: (active: boolean) => void,
): Promise<EffectCleanup | null> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) return null;

  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter || adapter.info?.isFallbackAdapter) return null;
  const maxTextureSize = Math.min(Number(adapter.limits?.maxTextureDimension2D || 4096), 4096);
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  // Current mobile WebKit builds can expose shader-f16 while producing a black
  // post-process texture. Keep the stable F32 path on touch devices.
  const supportsF16 = !mobile && Boolean(adapter.features?.has?.("shader-f16"));
  const device = await adapter.requestDevice({ requiredFeatures: supportsF16 ? ["shader-f16"] : [] });
  const format = gpu.getPreferredCanvasFormat();
  const context = canvas.getContext("webgpu") as any;
  if (!context) return null;
  context.configure({ device, format, alphaMode: "premultiplied" });

  const usage = (globalThis as any).GPUBufferUsage;
  const textureUsage = (globalThis as any).GPUTextureUsage;
  const uniformBuffer = device.createBuffer({
    label: "Skybreak Ultra uniforms",
    size: 32,
    usage: (usage?.UNIFORM ?? 0x40) | (usage?.COPY_DST ?? 0x08),
  });
  const quadBuffer = device.createBuffer({
    label: "Skybreak instance quad",
    size: 48,
    usage: (usage?.VERTEX ?? 0x20) | (usage?.COPY_DST ?? 0x08),
  });
  device.queue.writeBuffer(quadBuffer, 0, new Float32Array([
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  ]));
  const instanceCapacity = 1024;
  const instanceBuffer = device.createBuffer({
    label: "Skybreak Ultra instances",
    size: instanceCapacity * 8 * 4,
    usage: (usage?.VERTEX ?? 0x20) | (usage?.COPY_DST ?? 0x08),
  });

  const postShader = device.createShaderModule({
    label: "Skybreak full-scene post processing",
    code: `
      ${supportsF16 ? "enable f16;" : ""}
      struct Uniforms {
        resolution: vec2f,
        time: f32,
        intensity: f32,
        postQuality: f32,
        bloomStrength: f32,
        reflectionStrength: f32,
        padding: f32,
      };
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      @group(0) @binding(1) var sceneTexture: texture_2d<f32>;
      @group(0) @binding(2) var sceneSampler: sampler;

      fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
      fn noise(p: vec2f) -> f32 {
        let i = floor(p); var f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), f.x),
                   mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), f.x), f.y);
      }
      ${supportsF16
        ? "fn toneMap(color32: vec3f) -> vec3f { let color = vec3<f16>(max(color32, vec3f(0.0))); let mapped = color / (color + vec3<f16>(f16(0.82))); return vec3f(mapped); }"
        : "fn toneMap(color: vec3f) -> vec3f { return color / (color + vec3f(0.82)); }"}
      @vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
        var points = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
        return vec4f(points[index], 0.0, 1.0);
      }
      @fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
        let uv = position.xy / uniforms.resolution;
        let textureSize = vec2f(textureDimensions(sceneTexture));
        let texel = 1.0 / max(textureSize, vec2f(1.0));
        let chroma = texel * (1.4 + sin(uniforms.time * 0.7) * 0.25);
        let baseR = textureSample(sceneTexture, sceneSampler, clamp(uv + vec2f(chroma.x, 0.0), vec2f(0.0), vec2f(1.0))).r;
        let baseG = textureSample(sceneTexture, sceneSampler, uv).g;
        let baseB = textureSample(sceneTexture, sceneSampler, clamp(uv - vec2f(chroma.x, 0.0), vec2f(0.0), vec2f(1.0))).b;
        var scene = vec3f(baseR, baseG, baseB);

        var bloom = vec3f(0.0);
        if (uniforms.postQuality > 0.25) {
          bloom += textureSample(sceneTexture, sceneSampler, uv + texel * vec2f(4.0, 0.0)).rgb;
          bloom += textureSample(sceneTexture, sceneSampler, uv - texel * vec2f(4.0, 0.0)).rgb;
          if (uniforms.postQuality > 1.25) {
            bloom += textureSample(sceneTexture, sceneSampler, uv + texel * vec2f(0.0, 4.0)).rgb;
            bloom += textureSample(sceneTexture, sceneSampler, uv - texel * vec2f(0.0, 4.0)).rgb;
            bloom += textureSample(sceneTexture, sceneSampler, uv + texel * vec2f(3.0, 3.0)).rgb;
            bloom += textureSample(sceneTexture, sceneSampler, uv - texel * vec2f(3.0, 3.0)).rgb;
            bloom *= 0.1667;
          } else {
            bloom *= 0.5;
          }
          bloom = max(bloom - vec3f(0.28), vec3f(0.0));
          scene += bloom * uniforms.bloomStrength;

          let distortion = (noise(vec2f(uv.x * 24.0, uniforms.time * 0.45)) - 0.5) * 0.012;
          let reflectionUv = clamp(vec2f(uv.x + distortion, 1.18 - uv.y), vec2f(0.0), vec2f(1.0));
          let reflected = textureSample(sceneTexture, sceneSampler, reflectionUv).rgb;
          let reflectionMask = smoothstep(0.5, 0.96, uv.y) * (1.0 - smoothstep(0.96, 1.0, uv.y));
          scene += reflected * reflectionMask * uniforms.reflectionStrength;
        }

        var p = uv * 2.0 - 1.0;
        p.x *= uniforms.resolution.x / uniforms.resolution.y;
        let n = noise(p * 3.1 + vec2f(uniforms.time * 0.05, -uniforms.time * 0.08));
        let fogA = exp(-7.0 * abs(p.y + 0.28 + sin(p.x * 2.4 + uniforms.time * 0.25) * 0.13));
        let fogB = exp(-10.0 * abs(p.y - 0.34 + sin(p.x * 3.7 - uniforms.time * 0.19) * 0.09));
        scene += vec3f(0.0, 0.82, 1.0) * fogA * n * 0.09;
        scene += vec3f(1.0, 0.03, 0.4) * fogB * (1.0 - n) * 0.075;

        let beamA = exp(-18.0 * abs(p.x - sin(uniforms.time * 0.16) * 0.5 - p.y * 0.28));
        let beamB = exp(-21.0 * abs(p.x + cos(uniforms.time * 0.13) * 0.62 + p.y * 0.34));
        scene += vec3f(0.0, 0.62, 0.82) * beamA * 0.035;
        scene += vec3f(0.85, 0.02, 0.34) * beamB * 0.03;

        let vignette = 1.0 - smoothstep(0.55, 1.25, length(p));
        scene *= 0.78 + vignette * 0.28;
        scene = toneMap(scene);
        scene = pow(max(scene, vec3f(0.0)), vec3f(0.92));
        return vec4f(scene, 1.0);
      }
    `,
  });
  const postPipeline = await device.createRenderPipelineAsync({
    label: "Skybreak full-scene post pipeline",
    layout: "auto",
    vertex: { module: postShader, entryPoint: "vertexMain" },
    fragment: { module: postShader, entryPoint: "fragmentMain", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const instanceShader = device.createShaderModule({
    label: "Skybreak instanced highlights",
    code: `
      struct VertexInput {
        @location(0) corner: vec2f,
        @location(1) center: vec2f,
        @location(2) size: vec2f,
        @location(3) color: vec4f,
      };
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) local: vec2f,
      };
      @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        let point = input.center + input.corner * input.size;
        output.position = vec4f(point.x * 2.0 - 1.0, 1.0 - point.y * 2.0, 0.0, 1.0);
        output.color = input.color;
        output.local = input.corner;
        return output;
      }
      @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
        let glow = 1.0 - smoothstep(0.24, 0.72, length(input.local));
        return vec4f(input.color.rgb, input.color.a * (0.45 + glow * 0.55));
      }
    `,
  });
  const instancePipeline = await device.createRenderPipelineAsync({
    label: "Skybreak GPU instancing pipeline",
    layout: "auto",
    vertex: {
      module: instanceShader,
      entryPoint: "vertexMain",
      buffers: [
        { arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
        {
          arrayStride: 32,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 1, offset: 0, format: "float32x2" },
            { shaderLocation: 2, offset: 8, format: "float32x2" },
            { shaderLocation: 3, offset: 16, format: "float32x4" },
          ],
        },
      ],
    },
    fragment: {
      module: instanceShader,
      entryPoint: "fragmentMain",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });

  const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
  let sceneTexture: any = null;
  let sceneTextureWidth = 0;
  let sceneTextureHeight = 0;
  let postBindGroup: any = null;
  const ensureSceneTexture = () => {
    const width = Math.max(1, Math.min(maxTextureSize, sourceCanvas.width));
    const height = Math.max(1, Math.min(maxTextureSize, sourceCanvas.height));
    if (sceneTexture && width === sceneTextureWidth && height === sceneTextureHeight) return;
    sceneTexture?.destroy();
    sceneTextureWidth = width;
    sceneTextureHeight = height;
    sceneTexture = device.createTexture({
      label: "Skybreak Canvas scene texture",
      size: [width, height, 1],
      format: "rgba8unorm",
      usage: (textureUsage?.TEXTURE_BINDING ?? 0x04) | (textureUsage?.COPY_DST ?? 0x02),
    });
    postBindGroup = device.createBindGroup({
      layout: postPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: sceneTexture.createView() },
        { binding: 2, resource: sampler },
      ],
    });
  };

  const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);
  updateRenderer(`${isMac ? "WEBGPU · METAL" : "WEBGPU · NATIVE"}${supportsF16 ? " · F16" : " · F32"} · INSTANCED`);
  const worker = new Worker(new URL("./ultraWorker.ts", import.meta.url), { type: "module" });
  let active = true;
  let animation = 0;
  let workerBusy = false;
  let workerInstances = new Float32Array(0);
  let renderScale = 1;
  let targetFps = 60;
  let postQuality = 2;
  let lastAnimationFrame = performance.now();
  let lastRenderedFrame = 0;
  let lastWorkerPost = 0;

  worker.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; renderScale: number; targetFps: number; postQuality: number }>) => {
    workerBusy = false;
    workerInstances = new Float32Array(event.data.buffer);
    renderScale = Math.max(0.62, Math.min(1, event.data.renderScale));
    postQuality = Math.max(0, Math.min(2, event.data.postQuality));
    updateThermalProtection(postQuality < 2);
    const nextFps = Math.max(60, Math.min(120, event.data.targetFps));
    if (nextFps !== targetFps) {
      targetFps = nextFps;
      updateFrameRate(nextFps);
    }
  };
  worker.onerror = () => {
    workerBusy = false;
    targetFps = 60;
    updateFrameRate(60);
  };
  void device.lost.then(() => {
    if (active) updateRenderer("WEBGPU LOST");
  });

  const render = (time: number) => {
    if (!active) return;
    const animationDelta = Math.max(4, Math.min(40, time - lastAnimationFrame));
    lastAnimationFrame = time;
    if (!workerBusy && time - lastWorkerPost >= 24) {
      workerBusy = true;
      lastWorkerPost = time;
      worker.postMessage({ type: "tick", time, frameDelta: animationDelta, allowHighRefresh: getAllowHighRefresh(), mobile, rainCount: 220 });
    }

    const frameInterval = 1000 / targetFps;
    if (time - lastRenderedFrame < frameInterval - 0.35) {
      animation = requestAnimationFrame(render);
      return;
    }
    lastRenderedFrame = time;
    const rect = canvas.getBoundingClientRect();
    const dprLimit = window.matchMedia("(pointer: coarse)").matches ? 2.25 : 3;
    const baseDpr = Math.min(
      window.devicePixelRatio || 1,
      dprLimit,
      maxTextureSize / Math.max(1, rect.width),
      Math.min(2160, maxTextureSize) / Math.max(1, rect.height),
    );
    const width = Math.max(1, Math.round(rect.width * baseDpr * renderScale));
    const height = Math.max(1, Math.round(rect.height * baseDpr * renderScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ensureSceneTexture();
    try {
      device.queue.copyExternalImageToTexture(
        { source: sourceCanvas },
        { texture: sceneTexture },
        [sceneTextureWidth, sceneTextureHeight],
      );
    } catch {
      animation = requestAnimationFrame(render);
      return;
    }

    const sceneInstances = getSceneInstances();
    const workerCount = Math.min(workerInstances.length / 8, instanceCapacity);
    const sceneCount = Math.min(sceneInstances.length / 8, instanceCapacity - workerCount);
    if (workerCount > 0) device.queue.writeBuffer(instanceBuffer, 0, workerInstances.subarray(0, workerCount * 8));
    if (sceneCount > 0) device.queue.writeBuffer(instanceBuffer, workerCount * 32, sceneInstances.subarray(0, sceneCount * 8));
    const bloomStrength = postQuality >= 2 ? 0.42 : postQuality >= 1 ? 0.22 : 0;
    const reflectionStrength = postQuality >= 2 ? 0.16 : postQuality >= 1 ? 0.07 : 0;
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
      width, height, time * 0.001, 1, postQuality, bloomStrength, reflectionStrength, 0,
    ]));

    const encoder = device.createCommandEncoder({ label: "Skybreak Ultra frame" });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    pass.setPipeline(postPipeline);
    pass.setBindGroup(0, postBindGroup);
    pass.draw(3);
    if (workerCount + sceneCount > 0) {
      pass.setPipeline(instancePipeline);
      pass.setVertexBuffer(0, quadBuffer);
      pass.setVertexBuffer(1, instanceBuffer);
      pass.draw(6, workerCount + sceneCount);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
    animation = requestAnimationFrame(render);
  };
  animation = requestAnimationFrame(render);
  return () => {
    active = false;
    cancelAnimationFrame(animation);
    worker.terminate();
    updateThermalProtection(false);
    sceneTexture?.destroy();
    uniformBuffer.destroy();
    quadBuffer.destroy();
    instanceBuffer.destroy();
    device.destroy();
  };
}

function startWebGlEffects(
  canvas: HTMLCanvasElement,
  updateRenderer: (name: string) => void,
  getQuality: () => Quality,
): EffectCleanup | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
  });
  if (!gl) return null;
  updateRenderer("WEBGL2");

  const vertexSource = `#version 300 es
    precision highp float;
    const vec2 points[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
    void main(){ gl_Position = vec4(points[gl_VertexID], 0.0, 1.0); }
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    out vec4 outColor;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution; vec2 p = uv * 2.0 - 1.0;
      p.x *= u_resolution.x / u_resolution.y;
      float n = noise(p * 2.8 + vec2(u_time * .035, -u_time * .06));
      float fogA = exp(-7.0 * abs(p.y + .26 + sin(p.x * 2.2 + u_time * .22) * .12));
      float fogB = exp(-9.0 * abs(p.y - .38 + sin(p.x * 3.4 - u_time * .17) * .08));
      vec3 color = vec3(0.0, .85, 1.0) * fogA * n * .16;
      color += vec3(1.0, .04, .42) * fogB * (1.0 - n) * .13;
      vec2 rainUv = uv * vec2(95.0, 24.0); float lane = floor(rainUv.x);
      float drop = fract(rainUv.y + u_time * (2.4 + hash(vec2(lane, 4.0))) + hash(vec2(lane, 7.0)) * 7.0);
      float rain = smoothstep(.94, 1.0, drop) * step(.82, hash(vec2(lane, floor(rainUv.y))));
      color += mix(vec3(0.0,.75,1.0), vec3(1.0,.08,.5), hash(vec2(lane,2.0))) * rain * .1;
      float scan = sin(gl_FragCoord.y * 1.55 + u_time * 3.0) * .5 + .5;
      color += vec3(.02,.05,.08) * scan * .035;
      float alpha = clamp(max(max(color.r, color.g), color.b) * 1.7, 0.0, .28);
      outColor = vec4(color, alpha);
    }
  `;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  let animation = 0;
  let lastGlFrame = 0;
  const render = (time: number) => {
    const settings = QUALITY_SETTINGS[getQuality()];
    const frameInterval = 1000 / settings.glFps;
    if (time - lastGlFrame < frameInterval) {
      animation = requestAnimationFrame(render);
      return;
    }
    lastGlFrame = time;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, settings.glDpr);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (settings.webgl) {
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, width, height);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    animation = requestAnimationFrame(render);
  };
  animation = requestAnimationFrame(render);
  return () => {
    cancelAnimationFrame(animation);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
  };
}

type Language = "en" | "de";

type NeonAscentProps = {
  language?: Language;
  languageHref?: string;
  iconSrc?: string;
};

export default function NeonAscent({ language = "en", languageHref = "./de/", iconSrc = "./icon-512.png" }: NeonAscentProps) {
  const isDe = language === "de";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(makeWorld());
  const inputRef = useRef<Record<InputKey, boolean>>({ left: false, right: false, jump: false, attack: false });
  const pressedRef = useRef<Record<InputKey, boolean>>({ left: false, right: false, jump: false, attack: false });
  const audioRef = useRef<ReturnType<typeof createAudio> | null>(null);
  const soundEnabledRef = useRef(true);
  const musicEnabledRef = useRef(true);
  const qualityRef = useRef<Quality>("medium");
  const ultraFpsRef = useRef(60);
  const mobileUltra120Ref = useRef(false);
  const ultraFallbackRef = useRef(false);
  const pickaxeLoadoutRef = useRef({ power: 1, style: 1 });
  const keyBindingsRef = useRef<KeyBindings>({ ...DEFAULT_KEY_BINDINGS });
  const bindingCaptureRef = useRef<BindableAction | null>(null);
  const unlockedLevelRef = useRef(1);
  const selectedStartLevelRef = useRef(1);
  const cheatArmRef = useRef({ taps: 0, lastTap: 0, armedUntil: 0 });
  const cheatSequenceRef = useRef<{ key: InputKey; time: number }[]>([]);
  const renderViewRef = useRef({ width: VIEW_W, height: VIEW_H, portrait: false });
  const difficultiesRef = useRef<Difficulty[]>(Array(LEVEL_COUNT).fill("medium"));
  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [sector, setSector] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [highScore, setHighScore] = useState(0);
  const [renderer, setRenderer] = useState("CANVAS 2D");
  const [ultraFps, setUltraFps] = useState(60);
  const [mobileUltra120, setMobileUltra120] = useState(false);
  const [mobileDevice, setMobileDevice] = useState(false);
  const [thermalProtection, setThermalProtection] = useState(false);
  const [quality, setQuality] = useState<Quality>("medium");
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [iPhoneSafari, setIPhoneSafari] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [levelDifficulties, setLevelDifficulties] = useState<Difficulty[]>(Array(LEVEL_COUNT).fill("medium"));
  const [pickaxeStats, setPickaxeStats] = useState({ power: 1, style: 1 });
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>({ ...DEFAULT_KEY_BINDINGS });
  const [bindingCapture, setBindingCapture] = useState<BindableAction | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [selectedStartLevel, setSelectedStartLevel] = useState(1);

  const syncHud = useCallback((world: World) => {
    setScore(world.score);
    setLives(world.lives);
    setSector(world.sector);
    setStatus(world.status);
  }, []);

  const ensureAudio = useCallback(() => {
    if (!soundEnabledRef.current && !musicEnabledRef.current) return;
    audioRef.current ??= createAudio();
    audioRef.current.setSoundEnabled(soundEnabledRef.current);
    if (musicEnabledRef.current) void audioRef.current.playMusic(worldRef.current.sector);
  }, []);

  const restart = useCallback(() => {
    const next = makeWorld();
    placeWorldAtLevel(next, selectedStartLevelRef.current);
    next.player.pickaxePower = pickaxeLoadoutRef.current.power;
    next.player.pickaxeStyle = pickaxeLoadoutRef.current.style;
    next.status = "playing";
    worldRef.current = next;
    pressedRef.current = { left: false, right: false, jump: false, attack: false };
    inputRef.current = { left: false, right: false, jump: false, attack: false };
    setPickaxeStats({ ...pickaxeLoadoutRef.current });
    if (musicEnabledRef.current) {
      audioRef.current ??= createAudio();
      audioRef.current.setSoundEnabled(soundEnabledRef.current);
      void audioRef.current.playMusic(next.sector);
    }
    syncHud(next);
  }, [syncHud]);

  const chooseStartLevel = useCallback((level: number) => {
    const next = Math.min(unlockedLevelRef.current, Math.max(1, Math.round(level)));
    selectedStartLevelRef.current = next;
    setSelectedStartLevel(next);
  }, []);

  const beginKeyCapture = useCallback((action: BindableAction) => {
    bindingCaptureRef.current = action;
    setBindingCapture(action);
  }, []);

  const resetKeyBindings = useCallback(() => {
    const defaults = { ...DEFAULT_KEY_BINDINGS };
    keyBindingsRef.current = defaults;
    setKeyBindings(defaults);
    bindingCaptureRef.current = null;
    setBindingCapture(null);
    localStorage.setItem("skybreak-key-bindings", JSON.stringify(defaults));
  }, []);

  const applyPickaxeUpgrade = useCallback((kind: "power" | "style") => {
    const world = worldRef.current;
    if (world.status !== "upgrade") return;
    if (kind === "power") world.player.pickaxePower = Math.min(10, world.player.pickaxePower + 1);
    else world.player.pickaxeStyle = Math.min(10, world.player.pickaxeStyle + 1);
    pickaxeLoadoutRef.current = { power: world.player.pickaxePower, style: world.player.pickaxeStyle };
    setPickaxeStats({ power: world.player.pickaxePower, style: world.player.pickaxeStyle });
    world.status = "won";
    world.lastTime = performance.now();
    syncHud(world);
  }, [syncHud]);

  const applyCheat = useCallback((cheat: CheatId) => {
    const world = worldRef.current;
    if (world.status !== "playing") return;
    world.cheatUsed = true;
    if (cheat === "immortal") {
      world.immortalSector = world.sector;
      world.powerUpMessage = isDe ? `CHEAT // UNSTERBLICH IN LEVEL ${world.sector}` : `CHEAT // IMMORTAL IN LEVEL ${world.sector}`;
    } else if (cheat === "shield") {
      world.player.shield = 2;
      world.powerUpMessage = isDe ? "CHEAT // DOPPELSCHILD AKTIV" : "CHEAT // DOUBLE SHIELD ACTIVE";
    } else if (cheat === "overdrive") {
      world.player.overdrive = Math.max(world.player.overdrive, 30);
      world.powerUpMessage = isDe ? "CHEAT // OVERDRIVE 30 SEKUNDEN" : "CHEAT // OVERDRIVE 30 SECONDS";
    } else {
      world.lives = Math.min(9, world.lives + 1);
      world.powerUpMessage = isDe ? "CHEAT // EXTRALEBEN" : "CHEAT // EXTRA LIFE";
    }
    world.powerUpMessageTime = 3;
    world.shake = 5;
    cheatArmRef.current.armedUntil = 0;
    cheatSequenceRef.current = [];
    audioRef.current?.powerUp();
    syncHud(world);
  }, [isDe, syncHud]);

  const registerCheatInput = useCallback((key: InputKey) => {
    const now = performance.now();
    const world = worldRef.current;
    if (world.status !== "playing" || cheatArmRef.current.armedUntil < now) return;
    const recent = cheatSequenceRef.current.filter((entry) => now - entry.time <= 7000);
    recent.push({ key, time: now });
    cheatSequenceRef.current = recent.slice(-6);
    const cheat = detectCheat(cheatSequenceRef.current.map((entry) => entry.key));
    if (cheat) applyCheat(cheat);
  }, [applyCheat]);

  const armCheats = useCallback(() => {
    const world = worldRef.current;
    if (world.status !== "playing") return;
    const now = performance.now();
    const arm = cheatArmRef.current;
    arm.taps = now - arm.lastTap <= 3000 ? arm.taps + 1 : 1;
    arm.lastTap = now;
    if (arm.taps < 5) return;
    arm.taps = 0;
    arm.armedUntil = now + 10000;
    cheatSequenceRef.current = [];
    world.powerUpMessage = isDe ? "CHEAT-LINK BEREIT // 10 SEKUNDEN" : "CHEAT LINK READY // 10 SECONDS";
    world.powerUpMessageTime = 2.5;
    audioRef.current?.powerUp();
  }, [isDe]);

  const setInput = useCallback((key: InputKey, active: boolean) => {
    if (active && !inputRef.current[key]) {
      pressedRef.current[key] = true;
      registerCheatInput(key);
    }
    inputRef.current[key] = active;
  }, [registerCheatInput]);

  useEffect(() => {
    const saved = Number(localStorage.getItem("neon-ascent-highscore") || 0);
    setHighScore(saved);
    const storedQuality = localStorage.getItem("skybreak-quality") as Quality | null;
    const initialQuality = storedQuality && storedQuality in QUALITY_SETTINGS
      ? storedQuality
      : window.matchMedia("(pointer: coarse)").matches ? "medium" : "high";
    qualityRef.current = initialQuality;
    setQuality(initialQuality);
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setMobileDevice(coarsePointer);
    const savedMobileUltra120 = localStorage.getItem("skybreak-mobile-ultra-120") === "true";
    mobileUltra120Ref.current = savedMobileUltra120;
    setMobileUltra120(savedMobileUltra120);
    window.dispatchEvent(new Event("skybreak-quality"));
    const isIPhone = /iPhone|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIPhoneSafari(isIPhone && !isStandalone);
    try {
      const savedDifficulties = JSON.parse(localStorage.getItem("skybreak-level-difficulties") || "[]") as Difficulty[];
      if (savedDifficulties.length === LEVEL_COUNT && savedDifficulties.every((value) => value in DIFFICULTY_SETTINGS)) {
        difficultiesRef.current = savedDifficulties;
        setLevelDifficulties(savedDifficulties);
      }
    } catch {
      // Ignore malformed local settings and keep the balanced defaults.
    }
    try {
      const bindings = normalizeKeyBindings(JSON.parse(localStorage.getItem("skybreak-key-bindings") || "null"));
      keyBindingsRef.current = bindings;
      setKeyBindings(bindings);
    } catch {
      keyBindingsRef.current = { ...DEFAULT_KEY_BINDINGS };
    }
    const storedUnlockedLevel = Number(localStorage.getItem("skybreak-unlocked-level") || 1);
    const savedUnlockedLevel = Number.isFinite(storedUnlockedLevel)
      ? Math.min(LEVEL_COUNT, Math.max(1, Math.round(storedUnlockedLevel)))
      : 1;
    unlockedLevelRef.current = savedUnlockedLevel;
    selectedStartLevelRef.current = savedUnlockedLevel;
    setUnlockedLevel(savedUnlockedLevel);
    setSelectedStartLevel(savedUnlockedLevel);
  }, []);

  useEffect(() => {
    let active = true;
    void checkForUpdate(APP_VERSION).then((update) => {
      if (active) setAvailableUpdate(update);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => () => {
    audioRef.current?.stop();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("immersive-active", immersiveMode);
    return () => document.documentElement.classList.remove("immersive-active");
  }, [immersiveMode]);

  const chooseQuality = (next: Quality) => {
    qualityRef.current = next;
    setQuality(next);
    localStorage.setItem("skybreak-quality", next);
    window.dispatchEvent(new Event("skybreak-quality"));
  };

  const chooseMobileUltra120 = (enabled: boolean) => {
    mobileUltra120Ref.current = enabled;
    setMobileUltra120(enabled);
    localStorage.setItem("skybreak-mobile-ultra-120", String(enabled));
  };

  const chooseDifficulty = (next: Difficulty) => {
    const updated = [...difficultiesRef.current];
    updated[Math.max(0, sector - 1)] = next;
    difficultiesRef.current = updated;
    setLevelDifficulties(updated);
    localStorage.setItem("skybreak-level-difficulties", JSON.stringify(updated));
  };

  const getUltraSceneInstances = useCallback(() => {
    const world = worldRef.current;
    const view = renderViewRef.current;
    const instances: number[] = [];
    const add = (x: number, y: number, width: number, height: number, r: number, g: number, b: number, alpha: number) => {
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1 || instances.length >= 800 * 8) return;
      instances.push(x, y, width, height, r, g, b, alpha);
    };

    for (const tile of world.tiles) {
      if (!tile.alive || tile.y < world.cameraY - 80 || tile.y > world.cameraY + view.height + 60) continue;
      add(
        (tile.x - world.cameraX + TILE * 0.5) / view.width,
        (tile.y - world.cameraY + 4) / view.height,
        TILE / view.width,
        5 / view.height,
        tile.cracked ? 0 : 1,
        tile.cracked ? 0.88 : 0.76,
        tile.cracked ? 1 : 0.18,
        0.2,
      );
    }
    for (const enemy of world.enemies) {
      if (!enemy.alive || enemy.y < world.cameraY - 70 || enemy.y > world.cameraY + view.height + 70) continue;
      add(
        (enemy.x - world.cameraX + 18) / view.width,
        (enemy.y - world.cameraY + 17) / view.height,
        44 / view.width,
        44 / view.height,
        1,
        0.04,
        0.45,
        0.22,
      );
    }
    const ultraChests = difficultiesRef.current[world.sector - 1] === "easy" ? [...world.chests] : [];
    if (world.roamingChest) ultraChests.push(world.roamingChest);
    for (const chest of ultraChests) {
      if (chest.opened || chest.y < world.cameraY - 50 || chest.y > world.cameraY + view.height + 50) continue;
      add(
        (chest.x - world.cameraX + 19) / view.width,
        (chest.y - world.cameraY + 14) / view.height,
        48 / view.width,
        36 / view.height,
        1,
        0.62,
        0.08,
        0.25,
      );
    }
    for (const particle of world.particles) {
      if (particle.y < world.cameraY - 50 || particle.y > world.cameraY + view.height + 50) continue;
      const pink = particle.color === "#ff2b8a";
      add(
        (particle.x - world.cameraX) / view.width,
        (particle.y - world.cameraY) / view.height,
        (pink ? 11 : 7) / view.width,
        (pink ? 11 : 7) / view.height,
        pink ? 1 : 0.08,
        pink ? 0.05 : 0.82,
        pink ? 0.44 : 1,
        Math.min(0.42, Math.max(0.08, particle.life * 0.3)),
      );
    }
    return new Float32Array(instances);
  }, []);

  useEffect(() => {
    const canvas = fxCanvasRef.current;
    const sourceCanvas = canvasRef.current;
    if (!canvas || !sourceCanvas) return;
    if (quality === "ultra") {
      ultraFallbackRef.current = false;
      const desktopMac = /Macintosh|Mac OS X/i.test(navigator.userAgent)
        && window.matchMedia("(pointer: fine)").matches;
      const firefox = /Firefox\//i.test(navigator.userAgent);
      let disposed = false;
      let cleanup: EffectCleanup | null = null;
      const startFallback = () => {
        ultraFallbackRef.current = true;
        const fallbackFps = firefox ? 30 : 40;
        ultraFpsRef.current = fallbackFps;
        setUltraFps(fallbackFps);
        window.dispatchEvent(new Event("skybreak-quality"));
        return startWebGlEffects(canvas, setRenderer, () => "medium");
      };

      // copyExternalImageToTexture can silently produce a black scene texture
      // in desktop Safari and Chromium on macOS. Use the transparent WebGPU
      // atmosphere there; the 2D game canvas remains the visible base layer.
      const gpuRenderer = desktopMac
        ? startWebGpuEffects(canvas, setRenderer)
        : startWebGpuUltraRenderer(
            canvas,
            sourceCanvas,
            setRenderer,
            getUltraSceneInstances,
            (nextFps) => {
              ultraFpsRef.current = nextFps;
              setUltraFps(nextFps);
            },
            () => window.matchMedia("(pointer: fine)").matches || mobileUltra120Ref.current,
            setThermalProtection,
          );

      void gpuRenderer
        .then((gpuCleanup) => {
          if (disposed) {
            gpuCleanup?.();
            return;
          }
          cleanup = gpuCleanup ?? startFallback();
        })
        .catch(() => {
          if (!disposed) cleanup = startFallback();
        });
      return () => {
        disposed = true;
        cleanup?.();
        ultraFallbackRef.current = false;
      };
    }
    ultraFallbackRef.current = false;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    });
    if (!gl) return;
    setRenderer("WEBGL2");

    const vertexSource = `#version 300 es
      precision highp float;
      const vec2 points[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
      void main(){ gl_Position = vec4(points[gl_VertexID], 0.0, 1.0); }
    `;
    const fragmentSource = `#version 300 es
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      out vec4 outColor;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;
        float n = noise(p * 2.8 + vec2(u_time * .035, -u_time * .06));
        float fogA = exp(-7.0 * abs(p.y + .26 + sin(p.x * 2.2 + u_time * .22) * .12));
        float fogB = exp(-9.0 * abs(p.y - .38 + sin(p.x * 3.4 - u_time * .17) * .08));
        vec3 color = vec3(0.0, .85, 1.0) * fogA * n * .16;
        color += vec3(1.0, .04, .42) * fogB * (1.0 - n) * .13;

        vec2 rainUv = uv * vec2(95.0, 24.0);
        float lane = floor(rainUv.x);
        float drop = fract(rainUv.y + u_time * (2.4 + hash(vec2(lane, 4.0))) + hash(vec2(lane, 7.0)) * 7.0);
        float rain = smoothstep(.94, 1.0, drop) * step(.82, hash(vec2(lane, floor(rainUv.y))));
        color += mix(vec3(0.0,.75,1.0), vec3(1.0,.08,.5), hash(vec2(lane,2.0))) * rain * .1;

        float scan = sin(gl_FragCoord.y * 1.55 + u_time * 3.0) * .5 + .5;
        color += vec3(.02,.05,.08) * scan * .035;
        float edge = smoothstep(.72, 1.25, length(p));
        color += vec3(.0,.32,.42) * edge * .035;
        float alpha = clamp(max(max(color.r, color.g), color.b) * 1.7, 0.0, .28);
        outColor = vec4(color, alpha);
      }
    `;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    let animation = 0;
    let lastGlFrame = 0;

    const render = (time: number) => {
      const settings = qualityRef.current === "ultra" && ultraFallbackRef.current
        ? QUALITY_SETTINGS.medium
        : QUALITY_SETTINGS[qualityRef.current];
      const frameInterval = 1000 / settings.glFps;
      if (time - lastGlFrame < frameInterval) {
        animation = requestAnimationFrame(render);
        return;
      }
      lastGlFrame = time;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, settings.glDpr);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!settings.webgl) {
        animation = requestAnimationFrame(render);
        return;
      }
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, width, height);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animation = requestAnimationFrame(render);
    };
    animation = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animation);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [getUltraSceneInstances, quality]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      ensureAudio();
      const capturedAction = bindingCaptureRef.current;
      if (capturedAction) {
        event.preventDefault();
        bindingCaptureRef.current = null;
        setBindingCapture(null);
        if (event.code === "Escape") return;
        const updated = rebindKey(keyBindingsRef.current, capturedAction, event.code);
        keyBindingsRef.current = updated;
        setKeyBindings(updated);
        localStorage.setItem("skybreak-key-bindings", JSON.stringify(updated));
        return;
      }
      const key = actionForCode(keyBindingsRef.current, event.code);
      if (key) {
        event.preventDefault();
        setInput(key, true);
      }
      if (event.code === "KeyP" || event.code === "Escape") {
        const world = worldRef.current;
        if (world.status === "playing" || world.status === "paused") {
          world.status = world.status === "playing" ? "paused" : "playing";
          if (world.status === "paused") audioRef.current?.pauseMusic();
          else if (musicEnabledRef.current) void audioRef.current?.playMusic(world.sector);
          setStatus(world.status);
        }
      }
      if (event.code === "Enter" && ["ready", "gameover", "won"].includes(worldRef.current.status)) restart();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = actionForCode(keyBindingsRef.current, event.code);
      if (key) setInput(key, false);
    };
    const clear = () => {
      inputRef.current = { left: false, right: false, jump: false, attack: false };
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    };
  }, [ensureAudio, restart, setInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    let frame = 0;
    const view = renderViewRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const settings = qualityRef.current === "ultra" && ultraFallbackRef.current
        ? QUALITY_SETTINGS.medium
        : QUALITY_SETTINGS[qualityRef.current];
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        settings.dpr,
        3840 / Math.max(1, rect.width),
        2160 / Math.max(1, rect.height),
      );
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const aspect = Math.max(0.5, rect.width / Math.max(1, rect.height));
      view.portrait = aspect < 1.05;
      view.width = view.portrait ? 540 : VIEW_W;
      view.height = view.width / aspect;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("skybreak-quality", resize);

    const burst = (world: World, x: number, y: number, color: string, amount = 8) => {
      for (let i = 0; i < amount; i++) {
        world.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.7) * 240,
          life: 0.35 + Math.random() * 0.35,
          color,
        });
      }
    };

    const hurt = (world: World) => {
      const p = world.player;
      if (p.invulnerable > 0) return;
      if (world.immortalSector === world.sector) {
        if (p.y > world.cameraY + view.height + 100) {
          p.x = 463;
          p.y = world.cameraY + Math.min(410, view.height - 130);
          p.vx = 0;
          p.vy = -280;
        }
        p.invulnerable = 0.65;
        world.powerUpMessage = isDe ? "UNSTERBLICH // TREFFER BLOCKIERT" : "IMMORTAL // HIT BLOCKED";
        world.powerUpMessageTime = 1.2;
        burst(world, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, "#ffd84d", 18);
        audioRef.current?.shield();
        return;
      }
      if (p.shield > 0) {
        p.shield -= 1;
        p.invulnerable = 0.8;
        world.shake = 8;
        world.powerUpMessage = isDe ? "SCHUTZSCHILD HAT DEN TREFFER ABGEFANGEN" : "SHIELD ABSORBED THE HIT";
        world.powerUpMessageTime = 1.8;
        audioRef.current?.shield();
        burst(world, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, "#72ffef", 22);
        return;
      }
      world.lives -= 1;
      world.shake = 18;
      audioRef.current?.hit();
      burst(world, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, "#ff2b8a", 18);
      if (world.lives <= 0) {
        world.status = "gameover";
        setStatus("gameover");
        if (!world.cheatUsed) {
          const best = Math.max(world.score, Number(localStorage.getItem("neon-ascent-highscore") || 0));
          localStorage.setItem("neon-ascent-highscore", String(best));
          setHighScore(best);
        }
      } else {
        p.x = 463;
        p.y = world.cameraY + Math.min(410, view.height - 130);
        p.vx = 0;
        p.vy = -280;
        p.invulnerable = 2;
      }
      syncHud(world);
    };

    const update = (world: World, dt: number) => {
      if (world.status !== "playing") return;
      const difficultyLevel = difficultiesRef.current[Math.max(0, world.sector - 1)] || "medium";
      const difficulty = DIFFICULTY_SETTINGS[difficultyLevel];
      const levelPressure = 1 + (world.sector - 1) * 0.075;
      world.fxTime += dt;
      world.shake = Math.max(0, world.shake - dt * 38);
      const p = world.player;
      const input = inputRef.current;
      const pressed = pressedRef.current;
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      p.attack = Math.max(0, p.attack - dt);
      p.overdrive = Math.max(0, p.overdrive - dt);
      world.powerUpMessageTime = Math.max(0, world.powerUpMessageTime - dt);

      if (world.roamingChestSector !== world.sector) {
        world.roamingChest = null;
        world.roamingChestTimer = 0;
        world.roamingChestMoves = 0;
        world.roamingChestSector = world.sector;
      }
      if (difficultyLevel === "easy") {
        world.roamingChest = null;
        world.roamingChestTimer = 0;
      } else {
        const roamingDifficulty = difficultyLevel as RoamingChestDifficulty;
        const rules = ROAMING_CHEST_RULES[roamingDifficulty];
        const unlocked = levelProgress(p.y) >= rules.unlockProgress;
        const alreadyCollected = world.collectedRoamingChestSectors[world.sector - 1];
        if (!unlocked || alreadyCollected) {
          world.roamingChest = null;
          world.roamingChestTimer = 0;
        } else if (!world.roamingChest) {
          placeRoamingChest(world, roamingDifficulty);
        } else {
          world.roamingChestTimer -= dt;
          if (world.roamingChestTimer <= 0) {
            world.roamingChestMoves += 1;
            const movedBelow = placeRoamingChest(world, roamingDifficulty);
            if (movedBelow) {
              world.powerUpMessage = isDe ? "TRUHE UNTER DIR NEU GEORTET" : "CHEST RELOCATED BELOW";
              world.powerUpMessageTime = 1.5;
            }
          }
        }
      }

      p.vx = input.left ? -MOVE_SPEED : input.right ? MOVE_SPEED : p.vx * Math.pow(0.002, dt);
      if (p.vx) p.facing = Math.sign(p.vx);
      const activelyMoving = input.left || input.right || !p.grounded || Math.abs(p.vx) > 18;
      p.idleTime = activelyMoving || input.attack || input.jump ? 0 : p.idleTime + dt;
      if (pressed.jump && p.grounded) {
        p.vy = -JUMP_SPEED;
        p.grounded = false;
        audioRef.current?.jump();
      }
      const startedAttack = pressed.attack;
      if (startedAttack) p.attack = 0.22;
      pressed.jump = false;
      pressed.attack = false;

      const oldY = p.y;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -PLAYER_W) p.x = VIEW_W;
      if (p.x > VIEW_W) p.x = -PLAYER_W;
      p.grounded = false;

      for (const tile of world.tiles) {
        if (!tile.alive) continue;
        const intersectsX = p.x + PLAYER_W - 7 > tile.x && p.x + 7 < tile.x + TILE;
        if (!intersectsX) continue;

        const oldBottom = oldY + PLAYER_H;
        const newBottom = p.y + PLAYER_H;
        if (p.vy >= 0 && oldBottom <= tile.y + 2 && newBottom >= tile.y) {
          p.y = tile.y - PLAYER_H;
          p.vy = 0;
          p.grounded = true;
        } else if (p.vy < 0 && oldY >= tile.y + 16 && p.y <= tile.y + 30 && tile.cracked) {
          tile.alive = false;
          world.shake = 9;
          p.vy *= 0.78;
          world.score += Math.round(100 * difficulty.score);
          burst(world, tile.x + TILE / 2, tile.y + 12, "#00f0ff", 12);
          audioRef.current?.smash();
          syncHud(world);
        }
      }

      const collectableChests = difficultyLevel === "easy"
        ? world.chests
        : world.roamingChest ? [world.roamingChest] : [];
      for (const chest of collectableChests) {
        if (chest.opened) continue;
        const intersects = p.x + PLAYER_W > chest.x
          && p.x < chest.x + 38
          && p.y + PLAYER_H > chest.y
          && p.y < chest.y + 30;
        if (!intersects) continue;
        chest.opened = true;
        if (chest === world.roamingChest) {
          world.collectedRoamingChestSectors[world.sector - 1] = true;
          world.roamingChest = null;
          world.roamingChestTimer = 0;
        }
        const reward = applyPowerUp(chest.powerUp, {
          lives: world.lives,
          shield: p.shield,
          overdrive: p.overdrive,
          score: world.score,
        }, difficulty.score);
        world.lives = reward.lives;
        world.score = reward.score;
        p.shield = reward.shield;
        p.overdrive = reward.overdrive;
        if (reward.message === "shield") world.powerUpMessage = isDe ? "SCHUTZSCHILD AKTIV" : "SHIELD ACTIVE";
        else if (reward.message === "life") world.powerUpMessage = isDe ? "EXTRALEBEN ERHALTEN" : "EXTRA LIFE ACQUIRED";
        else if (reward.message === "life-full") world.powerUpMessage = `${isDe ? "LEBEN VOLL" : "LIVES FULL"} // +${reward.awardedScore}`;
        else if (reward.message === "score") world.powerUpMessage = `${isDe ? "DATENBONUS" : "DATA BONUS"} // +${reward.awardedScore}`;
        else world.powerUpMessage = isDe ? "EISPICKEL-OVERDRIVE // 12 SEKUNDEN" : "ICE PICK OVERDRIVE // 12 SECONDS";
        world.powerUpMessageTime = 2.5;
        world.shake = 5;
        audioRef.current?.powerUp();
        burst(world, chest.x + 19, chest.y + 14, chest.powerUp === "shield" ? "#72ffef" : "#ffd84d", 24);
        syncHud(world);
      }

      if (p.attack > 0) {
        const attackX = p.x + (p.facing > 0 ? PLAYER_W - 2 : -28);
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue;
          if (Math.abs(enemy.x - attackX) < 48 && Math.abs(enemy.y - p.y) < 50) {
            enemy.alive = false;
            world.score += Math.round(250 * difficulty.score);
            burst(world, enemy.x + 18, enemy.y + 16, "#ffd84d", 14);
            audioRef.current?.enemy();
            syncHud(world);
          }
        }
        if (startedAttack) {
          const effectivePower = Math.min(10, p.pickaxePower + (p.overdrive > 0 ? 3 : 0));
          const reach = 42 + effectivePower * 8;
          const breakCount = Math.min(5, 1 + Math.floor((effectivePower - 1) / 2));
          const breakableTiles = world.tiles
            .filter((tile) => {
              const tileCenter = tile.x + TILE / 2;
              const inFront = p.facing > 0 ? tileCenter > p.x + PLAYER_W + 6 : tileCenter < p.x - 6;
              return tile.alive && tile.cracked && inFront
                && Math.abs(tile.y + 12 - (p.y + PLAYER_H * 0.45)) < 54
                && Math.abs(tileCenter - attackX) < reach;
            })
            .sort((a, b) => Math.abs(a.x + TILE / 2 - attackX) - Math.abs(b.x + TILE / 2 - attackX))
            .slice(0, breakCount);
          for (const tile of breakableTiles) {
            tile.alive = false;
            world.shake = Math.max(world.shake, 6 + effectivePower * 0.45);
            world.score += Math.round(75 * difficulty.score);
            burst(world, tile.x + TILE / 2, tile.y + 12, "#00f0ff", 7 + effectivePower);
            audioRef.current?.smash();
            syncHud(world);
          }
        }
      }

      for (const enemy of world.enemies) {
        if (!enemy.alive) continue;
        const enemyOldY = enemy.y;
        enemy.vy += GRAVITY * 0.78 * dt;
        enemy.x += enemy.vx * difficulty.enemy * levelPressure * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.x < 18 || enemy.x > VIEW_W - 54) enemy.vx *= -1;
        enemy.grounded = false;
        for (const tile of world.tiles) {
          if (!tile.alive) continue;
          const horizontal = enemy.x + 34 > tile.x && enemy.x + 4 < tile.x + TILE;
          if (!horizontal) continue;
          const oldBottom = enemyOldY + 32;
          const newBottom = enemy.y + 32;
          if (enemy.vy >= 0 && oldBottom <= tile.y + 3 && newBottom >= tile.y) {
            enemy.y = tile.y - 32;
            enemy.vy = 0;
            enemy.grounded = true;
            break;
          }
        }
        if (enemy.y > world.cameraY + view.height + 120) {
          enemy.alive = false;
          continue;
        }
        if (
          p.x + PLAYER_W > enemy.x &&
          p.x < enemy.x + 38 &&
          p.y + PLAYER_H > enemy.y &&
          p.y < enemy.y + 32
        ) {
          if (p.vy > 110 && p.y + PLAYER_H - enemy.y < 22) {
            enemy.alive = false;
            p.vy = -320;
            world.score += Math.round(200 * difficulty.score);
            burst(world, enemy.x + 18, enemy.y + 16, "#ffd84d", 12);
            audioRef.current?.enemy();
            syncHud(world);
          } else hurt(world);
        }
      }

      world.hazardTimer -= dt;
      if (world.hazardTimer <= 0 && world.cameraY < -400) {
        world.hazardTimer = (2.3 + Math.random() * 2.2) / (difficulty.hazards * levelPressure);
        world.particles.push({
          x: 50 + Math.random() * 860,
          y: world.cameraY - 30,
          vx: (Math.random() - 0.5) * 35,
          vy: 360 * difficulty.hazardSpeed * levelPressure,
          life: 4,
          color: "#ff2b8a",
        });
      }

      for (const particle of world.particles) {
        particle.life -= dt;
        particle.vy += 560 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        if (
          particle.color === "#ff2b8a" &&
          particle.life > 1 &&
          Math.abs(particle.x - (p.x + PLAYER_W / 2)) < 24 &&
          Math.abs(particle.y - (p.y + PLAYER_H / 2)) < 30
        ) {
          particle.life = 0;
          hurt(world);
        }
      }
      world.particles = world.particles.filter((particle) => particle.life > 0);

      const maxCameraX = Math.max(0, VIEW_W - view.width);
      const targetCameraX = Math.min(maxCameraX, Math.max(0, p.x + PLAYER_W / 2 - view.width / 2));
      world.cameraX += (targetCameraX - world.cameraX) * Math.min(1, dt * 5.5);
      const targetCamera = Math.min(0, p.y - view.height * (view.portrait ? 0.66 : 0.61));
      world.cameraY += (targetCamera - world.cameraY) * Math.min(1, dt * 4.5);
      if (p.y > world.cameraY + view.height + 130) hurt(world);
      if (p.y < WORLD_TOP) {
        world.score += 5000;
        audioRef.current?.win();
        const nextLevel = Math.min(LEVEL_COUNT, world.sector + 1);
        if (nextLevel > unlockedLevelRef.current) {
          unlockedLevelRef.current = nextLevel;
          selectedStartLevelRef.current = nextLevel;
          setUnlockedLevel(nextLevel);
          setSelectedStartLevel(nextLevel);
          localStorage.setItem("skybreak-unlocked-level", String(nextLevel));
        }
        world.status = world.sector < LEVEL_COUNT ? "upgrade" : "won";
        p.vx = 0;
        p.vy = 0;
        if (!world.cheatUsed) {
          const best = Math.max(world.score, Number(localStorage.getItem("neon-ascent-highscore") || 0));
          localStorage.setItem("neon-ascent-highscore", String(best));
          setHighScore(best);
        }
        syncHud(world);
      }
    };

    const draw = (world: World) => {
      const settings = qualityRef.current === "ultra" && ultraFallbackRef.current
        ? QUALITY_SETTINGS.medium
        : QUALITY_SETTINGS[qualityRef.current];
      const theme = LEVEL_THEMES[Math.max(0, world.sector - 1)] || LEVEL_THEMES[0];
      const sx = canvas.width / view.width;
      const sy = canvas.height / view.height;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.clearRect(0, 0, view.width, view.height);
      const shakeX = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      const shakeY = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      ctx.translate(shakeX, shakeY);

      const bg = ctx.createLinearGradient(0, 0, 0, view.height);
      bg.addColorStop(0, theme.top);
      bg.addColorStop(0.48, theme.mid);
      bg.addColorStop(1, theme.bottom);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, view.width, view.height);

      // Each level has a distinct animated skyline signature.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = theme.accent;
      ctx.fillStyle = theme.secondary;
      ctx.lineWidth = 1.4;
      const pulse = world.fxTime;
      if (theme.motif === 0) {
        // Neon Undercity: deep shafts, service pipes and fast maglev traffic.
        ctx.globalAlpha = 0.24;
        for (let i = 0; i < 12; i++) {
          const x = (i * 113 - world.cameraX * 0.08) % (view.width + 80) - 40;
          ctx.fillRect(x, 0, 5 + (i % 3) * 3, view.height);
          ctx.fillRect(x - 18, 72 + (i * 47) % (view.height - 90), 62, 3);
        }
        for (let i = 0; i < 7; i++) {
          const x = (i * 171 + pulse * 95) % (view.width + 180) - 90;
          const y = 52 + (i * 73) % Math.max(100, view.height - 100);
          ctx.fillStyle = i % 2 ? theme.secondary : theme.accent;
          ctx.fillRect(x, y, 74, 3);
          ctx.fillRect(x + 69, y - 2, 9, 7);
        }
      } else if (theme.motif === 1) {
        // Chrome Bazaar: hanging signs, market canopies and floating lanterns.
        for (let i = 0; i < 10; i++) {
          const x = (i * 131 - world.cameraX * 0.12) % (view.width + 100) - 50;
          const y = 45 + (i * 79) % Math.max(130, view.height - 120);
          const width = 56 + (i % 3) * 20;
          ctx.globalAlpha = 0.16 + (Math.sin(pulse * 2.4 + i) + 1) * 0.06;
          ctx.fillStyle = i % 2 ? theme.secondary : theme.accent;
          ctx.fillRect(x, y, width, 22);
          ctx.strokeRect(x - 3, y - 3, width + 6, 28);
          ctx.beginPath();
          ctx.arc(x + width / 2, y - 18 - Math.sin(pulse * 1.7 + i) * 5, 5 + (i % 2) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme.motif === 2) {
        // Toxic Transit: tunnel ribs, moving train windows and rising gas.
        ctx.globalAlpha = 0.2;
        for (let rib = 0; rib < 8; rib++) {
          const radius = 90 + rib * 65;
          ctx.beginPath();
          ctx.arc(view.width / 2, view.height + 35, radius, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = theme.accent;
        for (let i = 0; i < 11; i++) {
          const x = (i * 96 - pulse * 115) % (view.width + 120) - 60;
          ctx.fillRect(x, view.height * 0.62, 55, 18);
          ctx.fillStyle = i % 2 ? theme.secondary : theme.accent;
        }
        for (let i = 0; i < 18; i++) {
          ctx.beginPath();
          ctx.arc((i * 83 + pulse * 17) % view.width, view.height - ((i * 61 + pulse * 34) % view.height), 3 + (i % 5) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme.motif === 3) {
        // Crimson Firewall: pulsing data walls and upward-flying embers.
        ctx.globalAlpha = 0.22;
        for (let i = 0; i < 15; i++) {
          const x = i * (view.width / 14);
          const opening = 45 + (Math.sin(pulse * 2.8 + i) + 1) * 28;
          ctx.fillRect(x, 0, 4, view.height - opening);
          ctx.fillRect(x + 7, opening + 24, 2, view.height - opening - 24);
        }
        for (let i = 0; i < 30; i++) {
          const x = (i * 47 + Math.sin(i) * 35) % view.width;
          const y = view.height - ((i * 29 + pulse * (75 + i % 5 * 17)) % view.height);
          ctx.fillStyle = i % 3 ? theme.accent : theme.warning;
          ctx.fillRect(x, y, 2, 8 + i % 9);
        }
      } else if (theme.motif === 4) {
        // Azure Data Sea: layered waves, bubbles and luminous data jellyfish.
        ctx.globalAlpha = 0.25;
        for (let band = 0; band < 7; band++) {
          ctx.beginPath();
          for (let x = 0; x <= view.width; x += 18) {
            const y = 55 + band * 72 + Math.sin(x * 0.021 + pulse * (1.3 + band * 0.08) + band) * (10 + band * 2);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        for (let i = 0; i < 9; i++) {
          const x = (i * 127 + Math.sin(pulse + i) * 42) % view.width;
          const y = view.height - ((i * 71 + pulse * 24) % (view.height + 80));
          ctx.beginPath(); ctx.arc(x, y, 11 + i % 4 * 4, Math.PI, 0); ctx.stroke();
          for (let arm = -1; arm <= 1; arm++) {
            ctx.beginPath(); ctx.moveTo(x + arm * 7, y); ctx.lineTo(x + arm * 10 + Math.sin(pulse * 2 + i) * 4, y + 26); ctx.stroke();
          }
        }
      } else if (theme.motif === 5) {
        // Violet Reactor: rotating containment rings and an unstable core.
        const cx = view.width * 0.5;
        const cy = view.height * 0.48;
        const core = ctx.createRadialGradient(cx, cy, 4, cx, cy, 125);
        core.addColorStop(0, theme.warning);
        core.addColorStop(0.2, theme.secondary);
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = core;
        ctx.fillRect(cx - 140, cy - 140, 280, 280);
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, 42 + i * 34, 20 + i * 18, pulse * (i % 2 ? 0.22 : -0.17) + i, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          const angle = pulse * 1.8 + i * Math.PI / 3;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * 220, cy + Math.sin(angle) * 135); ctx.stroke();
        }
      } else if (theme.motif === 6) {
        // Solar Megagrid: blazing sun, heat shimmer and moving panel arrays.
        const sun = ctx.createRadialGradient(view.width * 0.72, view.height * 0.28, 8, view.width * 0.72, view.height * 0.28, 210);
        sun.addColorStop(0, theme.warning);
        sun.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = sun;
        ctx.fillRect(0, 0, view.width, view.height);
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 9; col++) {
            const x = col * 128 - ((world.cameraX * 0.08 + row * 47) % 128);
            const y = view.height * 0.48 + row * 55 + Math.sin(pulse * 1.5 + col) * 3;
            ctx.fillStyle = (col + row) % 2 ? theme.accent : theme.secondary;
            ctx.fillRect(x, y, 82, 28);
            ctx.strokeRect(x, y, 82, 28);
          }
        }
      } else if (theme.motif === 7) {
        // Ghost Network: broken packet streams and flickering phantom nodes.
        ctx.globalAlpha = 0.21;
        for (let i = 0; i < 28; i++) {
          const x = (i * 67 + Math.sin(pulse * 1.7 + i) * 45) % view.width;
          const y = (i * 97 + pulse * (38 + i % 4 * 11)) % view.height;
          ctx.fillRect(x, y, 2, 18 + (i % 7) * 7);
          if (i % 3 === 0) ctx.fillRect(x - 22, y + 8, 46, 1);
        }
        ctx.globalAlpha = 0.1 + (Math.sin(pulse * 9) + 1) * 0.05;
        for (let i = 0; i < 5; i++) {
          const x = 100 + i * 190 + Math.sin(pulse + i) * 30;
          const y = 100 + (i * 83) % 330;
          ctx.beginPath(); ctx.arc(x, y, 28, Math.PI, 0); ctx.lineTo(x + 28, y + 52); ctx.lineTo(x - 28, y + 52); ctx.closePath(); ctx.stroke();
        }
      } else if (theme.motif === 8) {
        // Quantum Rift: rotating singularity with warped star trails.
        const cx = view.width * 0.52;
        const cy = view.height * 0.44;
        ctx.globalAlpha = 0.25;
        for (let arm = 0; arm < 7; arm++) {
          ctx.beginPath();
          for (let i = 0; i < 22; i++) {
            const radius = 12 + i * 15;
            const angle = pulse * 0.28 + arm * 0.9 + i * 0.19;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius * 0.58;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        for (let i = 0; i < 45; i++) {
          const angle = i * 2.399 + pulse * 0.08;
          const radius = 65 + (i * 47) % 370;
          ctx.fillRect(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.62, 2 + i % 3, 2 + i % 3);
        }
      } else {
        // Skybreak Apex: dawn above the clouds and the transmission beacon.
        const horizon = view.height * 0.55;
        const dawn = ctx.createRadialGradient(view.width / 2, horizon, 8, view.width / 2, horizon, 310);
        dawn.addColorStop(0, theme.warning);
        dawn.addColorStop(0.35, theme.secondary);
        dawn.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = dawn;
        ctx.fillRect(0, 0, view.width, view.height);
        for (let i = 0; i < 24; i++) {
          const angle = (Math.PI * 2 * i) / 24 + pulse * 0.025;
          ctx.beginPath();
          ctx.moveTo(view.width / 2, horizon);
          ctx.lineTo(view.width / 2 + Math.cos(angle) * view.width, horizon + Math.sin(angle) * view.height);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.24;
        for (let i = 0; i < 10; i++) {
          const x = (i * 137 + pulse * (8 + i % 3 * 4)) % (view.width + 220) - 110;
          const y = horizon + 35 + (i % 3) * 42;
          ctx.beginPath(); ctx.ellipse(x, y, 90 + i % 4 * 18, 20 + i % 3 * 7, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = theme.accent;
        ctx.fillRect(view.width / 2 - 4, 45, 8, horizon - 45);
        ctx.fillRect(view.width / 2 - 58, 86, 116, 3);
      }
      ctx.restore();

      // Volumetric searchlights and atmospheric neon bloom.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.16;
      const searchlightCount = [0, 1, 3, 9].includes(theme.motif) ? 4 : theme.motif === 5 ? 2 : 0;
      for (let i = 0; i < searchlightCount; i++) {
        const origin = ((i * 281 + world.fxTime * (i % 2 ? 13 : -9)) % (view.width + 260)) - 130;
        const beam = ctx.createLinearGradient(origin, 0, origin + 190, view.height);
        beam.addColorStop(0, i % 2 ? theme.secondary : theme.accent);
        beam.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(origin - 15, 0);
        ctx.lineTo(origin + 38, 0);
        ctx.lineTo(origin + 260, view.height);
        ctx.lineTo(origin + 80, view.height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Distant air traffic gives the skyline depth without bitmap assets.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const trafficCount = [0, 1, 6, 9].includes(theme.motif) ? settings.traffic : 0;
      for (let i = 0; i < trafficCount; i++) {
        const speed = 18 + (i % 5) * 8;
        const x = (i * 151 + world.fxTime * speed) % (view.width + 120) - 60;
        const y = 35 + ((i * 89 - world.cameraY * 0.025) % Math.max(100, view.height * 0.62));
        const color = i % 3 === 0 ? theme.secondary : theme.accent;
        const trail = ctx.createLinearGradient(x - 34, y, x + 8, y);
        trail.addColorStop(0, "rgba(0,0,0,0)");
        trail.addColorStop(1, color);
        ctx.fillStyle = trail;
        ctx.fillRect(x - 34, y, 42, 1.5);
      }
      ctx.restore();

      ctx.save();
      const skylineLayers = [0, 1, 3, 6, 9].includes(theme.motif) ? settings.layers : 0;
      for (let layer = 0; layer < skylineLayers; layer++) {
        const alpha = 0.18 + layer * 0.13;
        const scale = 0.72 + layer * 0.22;
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 16; i++) {
          const width = (44 + ((i * 29 + layer * 17) % 52)) * scale;
          const x = ((i * 103 + layer * 37 - world.cameraX * (0.045 + layer * 0.055)) % (view.width + 100)) - 50;
          const height = (120 + ((i * 71 + layer * 83) % 340)) * scale;
          const parallax = ((-world.cameraY * (0.025 + layer * 0.025)) % 110);
          const top = view.height - height + parallax;
          const tower = ctx.createLinearGradient(x, top, x + width, top);
          tower.addColorStop(0, layer === 2 ? "#071426" : "#0a1730");
          tower.addColorStop(0.55, layer === 2 ? "#14233c" : "#101b36");
          tower.addColorStop(1, "#030814");
          ctx.fillStyle = tower;
          ctx.beginPath();
          ctx.moveTo(x, view.height);
          ctx.lineTo(x, top + 14);
          ctx.lineTo(x + width * 0.18, top);
          ctx.lineTo(x + width, top);
          ctx.lineTo(x + width, view.height);
          ctx.fill();
          ctx.fillStyle = i % 3 ? theme.accent : theme.secondary;
          for (let wy = top + 21; wy < view.height - 8; wy += 19 + layer * 3) {
            ctx.globalAlpha = alpha * (0.45 + ((i + Math.floor(wy)) % 3) * 0.2);
            ctx.fillRect(x + 9, wy, Math.max(3, width * 0.09), 1.5);
            ctx.fillRect(x + width * 0.55, wy, Math.max(4, width * 0.16), 1.5);
          }
        }
      }
      ctx.restore();

      // Animated holographic billboards in the middle distance.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const billboardCount = [0, 1, 3].includes(theme.motif) ? 3 : 0;
      for (let i = 0; i < billboardCount; i++) {
        const bx = 80 + ((i * 337 - world.cameraX * 0.14) % Math.max(300, view.width - 120));
        const by = view.height * (0.26 + i * 0.16) + ((-world.cameraY * 0.045) % 70);
        const pulse = 0.4 + Math.sin(world.fxTime * 2.2 + i) * 0.12;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = i % 2 ? theme.secondary : theme.accent;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, 88, 32);
        ctx.fillStyle = i % 2 ? "rgba(255,43,138,.08)" : "rgba(0,240,255,.08)";
        ctx.fillRect(bx, by, 88, 32);
        ctx.font = "700 8px ui-monospace, monospace";
        ctx.fillStyle = i % 2 ? theme.secondary : theme.accent;
        ctx.fillText(i === 0 ? "SKY//BREAK" : i === 1 ? "SECTOR 09" : "ASCEND", bx + 9, by + 19);
      }
      ctx.restore();

      // Neon rain is screen-space so it remains consistent while climbing.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const rainCount = [0, 3, 7, 9].includes(theme.motif) ? settings.rain : 0;
      for (let i = 0; i < rainCount; i++) {
        const x = (i * 79 + (i % 7) * 23 - world.fxTime * 36) % (view.width + 80) - 40;
        const y = (i * 113 + world.fxTime * (280 + (i % 5) * 46)) % (view.height + 100) - 50;
        const length = 8 + (i % 6) * 3;
        const rain = ctx.createLinearGradient(x, y, x - 3, y + length);
        rain.addColorStop(0, "rgba(120,240,255,0)");
        rain.addColorStop(1, i % 11 === 0 ? "rgba(255,77,166,.44)" : "rgba(122,231,255,.3)");
        ctx.strokeStyle = rain;
        ctx.lineWidth = i % 4 === 0 ? 1.2 : 0.65;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + length);
        ctx.stroke();
      }
      ctx.restore();

      if ([0, 3, 6].includes(theme.motif)) {
        ctx.strokeStyle = theme.accent;
        ctx.globalAlpha = 0.08;
        ctx.lineWidth = 1;
        for (let x = 0; x < view.width; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, view.height);
          ctx.stroke();
        }
        for (let y = ((-world.cameraY * 0.2) % 48); y < view.height; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(view.width, y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(-world.cameraX, -world.cameraY);
      const platformMaterials = [
        ["#31566f", "#091827", "#020711"],
        ["#76506f", "#24152d", "#0c0710"],
        ["#3f6b3f", "#102619", "#031008"],
        ["#7a3540", "#2d0b12", "#110307"],
        ["#2d6f8c", "#082d48", "#020b18"],
        ["#68438d", "#24103d", "#0d0416"],
        ["#8c5929", "#3a1908", "#150603"],
        ["#4d7375", "#10282b", "#041011"],
        ["#574986", "#17143d", "#070518"],
        ["#778da3", "#173449", "#06121d"],
      ][theme.motif];
      for (const tile of world.tiles) {
        if (!tile.alive || tile.y < world.cameraY - 80 || tile.y > world.cameraY + view.height + 50) continue;
        const glow = tile.cracked ? theme.accent : theme.warning;
        // Deep extrusion, animated power core and polished wet-metal edge.
        const underside = ctx.createLinearGradient(tile.x, tile.y + 16, tile.x, tile.y + 40);
        underside.addColorStop(0, platformMaterials[1]);
        underside.addColorStop(1, platformMaterials[2]);
        ctx.fillStyle = underside;
        ctx.beginPath();
        ctx.moveTo(tile.x + 5, tile.y + 15);
        ctx.lineTo(tile.x + TILE - 5, tile.y + 15);
        ctx.lineTo(tile.x + TILE - 11, tile.y + 36);
        ctx.lineTo(tile.x + 11, tile.y + 36);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(95,132,164,.28)";
        ctx.stroke();

        ctx.shadowBlur = 19;
        ctx.shadowColor = glow;
        roundedRect(ctx, tile.x + 2, tile.y, TILE - 4, 24, 5);
        const plate = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + 24);
        plate.addColorStop(0, platformMaterials[0]);
        plate.addColorStop(0.18, platformMaterials[1]);
        plate.addColorStop(0.58, platformMaterials[2]);
        plate.addColorStop(1, "#02040a");
        ctx.fillStyle = plate;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = glow;
        ctx.lineWidth = 2;
        ctx.stroke();
        const corePulse = 0.55 + Math.sin(world.fxTime * 5 + tile.x * 0.03) * 0.3;
        ctx.globalAlpha = corePulse;
        ctx.fillStyle = glow;
        ctx.fillRect(tile.x + 8, tile.y + 6, 13, 2);
        ctx.fillRect(tile.x + 41, tile.y + 15, 11, 2);
        ctx.fillRect(tile.x + 25, tile.y + 9, 3, 8);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.45;
        if (theme.motif === 2 || theme.motif === 3) {
          for (let stripe = 0; stripe < 4; stripe++) {
            ctx.beginPath();
            ctx.moveTo(tile.x + 6 + stripe * 15, tile.y + 20);
            ctx.lineTo(tile.x + 13 + stripe * 15, tile.y + 4);
            ctx.stroke();
          }
        } else if (theme.motif === 4 || theme.motif === 5 || theme.motif === 8) {
          ctx.beginPath();
          ctx.arc(tile.x + TILE / 2, tile.y + 12, 5 + theme.motif % 4, 0, Math.PI * 2);
          ctx.stroke();
        } else if (theme.motif === 6) {
          for (let cell = 0; cell < 5; cell++) ctx.strokeRect(tile.x + 7 + cell * 11, tile.y + 5, 8, 13);
        } else if (theme.motif === 7) {
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(tile.x + 7, tile.y + 5, TILE - 14, 13);
          ctx.setLineDash([]);
        } else if (theme.motif === 9) {
          ctx.beginPath();
          ctx.moveTo(tile.x + 8, tile.y + 12);
          ctx.lineTo(tile.x + TILE - 8, tile.y + 12);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(225,249,255,.48)";
        ctx.fillRect(tile.x + 9, tile.y + 2, TILE - 19, 1);
        if (tile.cracked) {
          ctx.strokeStyle = "rgba(177,247,255,.75)";
          ctx.beginPath();
          ctx.moveTo(tile.x + 31, tile.y + 2);
          ctx.lineTo(tile.x + 26, tile.y + 10);
          ctx.lineTo(tile.x + 35, tile.y + 16);
          ctx.lineTo(tile.x + 29, tile.y + 23);
          ctx.stroke();
        }
      }

      const visibleChests = difficultiesRef.current[world.sector - 1] === "easy" ? [...world.chests] : [];
      if (world.roamingChest) visibleChests.push(world.roamingChest);
      for (const chest of visibleChests) {
        if (chest.y < world.cameraY - 70 || chest.y > world.cameraY + view.height + 60) continue;
        ctx.save();
        const bob = chest.opened ? 0 : Math.sin(world.fxTime * 3.2 + chest.x * 0.02) * 1.5;
        ctx.translate(chest.x, chest.y + bob);
        ctx.globalAlpha = chest.opened ? 0.38 : 1;
        ctx.shadowBlur = chest.opened ? 0 : 18;
        ctx.shadowColor = "#ffd84d";
        const wood = ctx.createLinearGradient(0, 0, 0, 30);
        wood.addColorStop(0, "#8b5427");
        wood.addColorStop(0.45, "#4b2818");
        wood.addColorStop(1, "#24110c");
        ctx.fillStyle = wood;
        ctx.strokeStyle = "#d59a42";
        ctx.lineWidth = 2;
        roundedRect(ctx, 0, 10, 38, 20, 4);
        ctx.fill();
        ctx.stroke();
        if (chest.opened) {
          ctx.beginPath();
          ctx.moveTo(1, 10);
          ctx.lineTo(7, 0);
          ctx.lineTo(37, 0);
          ctx.lineTo(37, 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          roundedRect(ctx, 0, 3, 38, 13, 5);
          ctx.fill();
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,214,117,.72)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(8, 5);
        ctx.lineTo(8, 29);
        ctx.moveTo(30, 5);
        ctx.lineTo(30, 29);
        ctx.stroke();
        if (!chest.opened) {
          const lockColor = chest.powerUp === "shield" ? "#72ffef"
            : chest.powerUp === "life" ? "#ff5b95"
              : chest.powerUp === "score" ? "#ffd84d" : "#c65cff";
          ctx.fillStyle = lockColor;
          ctx.shadowBlur = 12;
          ctx.shadowColor = lockColor;
          roundedRect(ctx, 15, 12, 8, 9, 2);
          ctx.fill();
        }
        if (chest === world.roamingChest && !chest.opened) {
          const roamingDifficulty = difficultiesRef.current[world.sector - 1] as RoamingChestDifficulty;
          const total = ROAMING_CHEST_RULES[roamingDifficulty].visibleSeconds;
          const ratio = Math.max(0, Math.min(1, world.roamingChestTimer / total));
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,255,255,.2)";
          ctx.fillRect(0, 33, 38, 2);
          ctx.fillStyle = "#ff2b8a";
          ctx.fillRect(0, 33, 38 * ratio, 2);
        }
        ctx.restore();
      }

      for (const enemy of world.enemies) {
        if (!enemy.alive || enemy.y < world.cameraY - 80 || enemy.y > world.cameraY + view.height + 50) continue;
        ctx.save();
        ctx.translate(enemy.x + 19, enemy.y + 16);
        const tilt = Math.max(-0.18, Math.min(0.18, enemy.vy / 900));
        ctx.rotate(tilt);
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#ff2b8a";
        const shell = ctx.createLinearGradient(-18, -15, 18, 15);
        shell.addColorStop(0, "#6d174c");
        shell.addColorStop(0.46, "#260d2d");
        shell.addColorStop(1, "#090713");
        ctx.fillStyle = shell;
        roundedRect(ctx, -19, -16, 38, 31, 9);
        ctx.fill();
        ctx.strokeStyle = "#ff2b8a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,.26)";
        roundedRect(ctx, -12, -12, 24, 7, 3);
        ctx.fill();
        ctx.fillStyle = "#ffd84d";
        ctx.shadowBlur = 11;
        ctx.shadowColor = "#ffd84d";
        ctx.fillRect(enemy.vx > 0 ? 5 : -11, -10, 7, 3);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ff2b8a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-12, 12);
        ctx.lineTo(-17, 21);
        ctx.lineTo(-21, 21);
        ctx.moveTo(11, 12);
        ctx.lineTo(17, 21);
        ctx.lineTo(21, 21);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#ff78b7";
        ctx.strokeStyle = "#ff2b8a";
        ctx.beginPath();
        ctx.arc(0, 0, 25 + Math.sin(world.fxTime * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (const particle of world.particles) {
        ctx.globalAlpha = Math.min(1, particle.life * 2);
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 9;
        ctx.shadowColor = particle.color;
        const size = particle.color === "#ff2b8a" && particle.life > 1 ? 11 : 5;
        ctx.fillRect(particle.x, particle.y, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      const p = world.player;
      if (!(p.invulnerable > 0 && Math.floor(p.invulnerable * 12) % 2 === 0)) {
        ctx.save();
        ctx.translate(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2);
        ctx.scale(p.facing, 1);
        if (p.shield > 0) {
          ctx.globalAlpha = 0.32 + Math.sin(world.fxTime * 5) * 0.08;
          ctx.fillStyle = "rgba(114,255,239,.12)";
          ctx.strokeStyle = "#72ffef";
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 18;
          ctx.shadowColor = "#72ffef";
          ctx.beginPath();
          ctx.ellipse(0, 3, 29, 40, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
        if (p.overdrive > 0) {
          ctx.globalAlpha = 0.22 + Math.sin(world.fxTime * 9) * 0.08;
          ctx.strokeStyle = "#ffd84d";
          ctx.lineWidth = 2;
          ctx.shadowBlur = 16;
          ctx.shadowColor = "#ffd84d";
          ctx.beginPath();
          ctx.arc(0, 2, 34 + Math.sin(world.fxTime * 6) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
        // Motion trail and suit aura.
        if (Math.abs(p.vy) > 90 || Math.abs(p.vx) > 100) {
          ctx.globalAlpha = 0.18;
          for (let i = 1; i <= 3; i++) {
            ctx.fillStyle = i % 2 ? "#00f0ff" : "#ff2b8a";
            roundedRect(ctx, -17 - p.vx * 0.008 * i, -24 - p.vy * 0.004 * i, 34, 48, 9);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        const pickaxeColors = ["#ffd84d", "#00f0ff", "#ff2b8a", "#72ff4d", "#ff9f32", "#c65cff", "#84fff2", "#9c6bff", "#ffffff", "#ffcf4a"];
        const pickaxeColor = p.overdrive > 0 ? "#ffd84d" : pickaxeColors[Math.min(9, p.pickaxeStyle - 1)];
        const renderPower = Math.min(10, p.pickaxePower + (p.overdrive > 0 ? 3 : 0));
        const metal = ctx.createLinearGradient(-16, -22, 16, 24);
        metal.addColorStop(0, "#54728a");
        metal.addColorStop(0.32, "#152b40");
        metal.addColorStop(1, "#030914");

        // Separate mechanical limbs, torso and head make the character read as a robot.
        ctx.strokeStyle = "#00f0ff";
        ctx.lineCap = "round";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-8, 17);
        ctx.lineTo(-11, 31);
        ctx.moveTo(8, 17);
        ctx.lineTo(12, 31);
        ctx.stroke();
        ctx.fillStyle = "#071321";
        ctx.strokeStyle = "#83f8ff";
        ctx.lineWidth = 1.5;
        roundedRect(ctx, -15, 30, 11, 5, 2);
        ctx.fill(); ctx.stroke();
        roundedRect(ctx, 5, 30, 12, 5, 2);
        ctx.fill(); ctx.stroke();

        ctx.shadowBlur = 22;
        ctx.shadowColor = "#00f0ff";
        ctx.fillStyle = metal;
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, -4);
        ctx.lineTo(-11, -10);
        ctx.lineTo(11, -10);
        ctx.lineTo(15, -4);
        ctx.lineTo(11, 20);
        ctx.lineTo(-11, 20);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ff2b8a";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#ff2b8a";
        ctx.beginPath(); ctx.arc(0, 4, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(210,250,255,.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, -3); ctx.lineTo(8, -3);
        ctx.moveTo(0, 8); ctx.lineTo(0, 17);
        ctx.stroke();

        ctx.fillStyle = metal;
        ctx.strokeStyle = "#79f7ff";
        ctx.lineWidth = 2;
        roundedRect(ctx, -14, -25, 28, 17, 5);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#020b16";
        roundedRect(ctx, -10, -21, 21, 8, 3);
        ctx.fill();
        ctx.fillStyle = "#9dffff";
        ctx.fillRect(-7, -19, 5, 3);
        ctx.fillStyle = "#ff2b8a";
        ctx.fillRect(4, -19, 5, 3);
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -25); ctx.lineTo(3, -31); ctx.stroke();
        ctx.fillStyle = pickaxeColor;
        ctx.beginPath(); ctx.arc(3, -32, 2, 0, Math.PI * 2); ctx.fill();

        const idlePlaying = p.idleTime > 0.75;
        const attackProgress = p.attack > 0 ? 1 - p.attack / 0.22 : 0;
        const pickAngle = p.attack > 0
          ? -1.2 + attackProgress * 2.15
          : idlePlaying ? -0.25 + Math.sin(world.fxTime * 4.2) * 0.72 : -0.42;
        const handX = 13 + Math.cos(pickAngle) * 14;
        const handY = -1 + Math.sin(pickAngle) * 14;
        ctx.strokeStyle = "#5b8298";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(12, -3); ctx.lineTo(handX, handY); ctx.stroke();
        ctx.fillStyle = "#9afcff";
        ctx.beginPath(); ctx.arc(handX, handY, 3.2, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(pickAngle);
        ctx.shadowBlur = 9 + p.pickaxeStyle;
        ctx.shadowColor = pickaxeColor;
        ctx.strokeStyle = pickaxeColor;
        ctx.lineWidth = 3 + Math.min(2, renderPower * 0.16);
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(29, 0); ctx.stroke();
        ctx.strokeStyle = "#dffcff";
        ctx.lineWidth = 2.5;
        const styleShape = (p.pickaxeStyle - 1) % 3;
        const headSize = 11 + Math.min(8, renderPower) + styleShape * 1.5;
        ctx.beginPath();
        ctx.moveTo(24, -headSize);
        ctx.quadraticCurveTo(31, -4, 27, 0);
        ctx.quadraticCurveTo(31 + styleShape * 2, 5, 22 - styleShape, headSize * (styleShape === 2 ? 0.9 : 0.65));
        ctx.stroke();
        ctx.fillStyle = pickaxeColor;
        ctx.beginPath(); ctx.arc(28, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (p.attack > 0) {
          ctx.globalAlpha = 0.34;
          ctx.strokeStyle = pickaxeColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(14, -2, 33 + renderPower, -1.25, 0.95);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();

      // Layered fog and light shafts bind foreground and skyline together.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < settings.fog; i++) {
        const fogY = ((world.fxTime * (9 + i * 3) + i * view.height * 0.29) % (view.height + 180)) - 90;
        const fog = ctx.createLinearGradient(0, fogY - 45, 0, fogY + 45);
        fog.addColorStop(0, "rgba(0,0,0,0)");
        fog.addColorStop(0.5, i % 2 ? "rgba(255,43,138,.035)" : "rgba(0,240,255,.045)");
        fog.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fog;
        ctx.fillRect(0, fogY - 45, view.width, 90);
      }
      ctx.restore();

      const vignette = ctx.createRadialGradient(
        view.width / 2,
        view.height / 2,
        150,
        view.width / 2,
        view.height / 2,
        Math.max(view.width, view.height) * 0.72,
      );
      vignette.addColorStop(0.55, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,.52)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, view.width, view.height);

      ctx.fillStyle = "rgba(255,255,255,.025)";
      for (let y = 0; y < view.height; y += 4) ctx.fillRect(0, y, view.width, 1);

      if (world.powerUpMessageTime > 0 && world.powerUpMessage) {
        const alpha = Math.min(1, world.powerUpMessageTime * 2);
        const messageWidth = Math.min(view.width - 32, 460);
        const messageX = (view.width - messageWidth) / 2;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(3,10,22,.92)";
        ctx.strokeStyle = "#ffd84d";
        ctx.lineWidth = 1.5;
        roundedRect(ctx, messageX, 22, messageWidth, 38, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffd84d";
        ctx.font = "800 11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(world.powerUpMessage, view.width / 2, 41, messageWidth - 18);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 1;
      }
    };

    let lastRenderedFrame = 0;
    const loop = (time: number) => {
      const frameInterval = 1000 / (qualityRef.current === "ultra" ? ultraFpsRef.current : QUALITY_SETTINGS[qualityRef.current].fps);
      if (time - lastRenderedFrame < frameInterval) {
        frame = requestAnimationFrame(loop);
        return;
      }
      lastRenderedFrame = time;
      const world = worldRef.current;
      const dt = world.lastTime ? Math.min(0.033, (time - world.lastTime) / 1000) : 0;
      world.lastTime = time;
      update(world, dt);
      draw(world);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("skybreak-quality", resize);
    };
  }, [syncHud]);

  useEffect(() => {
    const onVisibility = () => {
      const world = worldRef.current;
      if (document.hidden && world.status === "playing") {
        world.status = "paused";
        audioRef.current?.pauseMusic();
        setStatus("paused");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const togglePause = () => {
    const world = worldRef.current;
    if (world.status !== "playing" && world.status !== "paused") return;
    world.status = world.status === "playing" ? "paused" : "playing";
    if (world.status === "paused") audioRef.current?.pauseMusic();
    else if (musicEnabledRef.current) void audioRef.current?.playMusic(world.sector);
    setStatus(world.status);
  };

  const toggleSound = () => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    audioRef.current ??= createAudio();
    audioRef.current.setSoundEnabled(next);
  };

  const toggleMusic = () => {
    const next = !musicEnabledRef.current;
    musicEnabledRef.current = next;
    setMusicEnabled(next);
    if (!next) {
      audioRef.current?.pauseMusic();
      return;
    }
    audioRef.current ??= createAudio();
    audioRef.current.setSoundEnabled(soundEnabledRef.current);
    void audioRef.current.playMusic(worldRef.current.sector);
  };

  const toggleFullscreen = async () => {
    if (iPhoneSafari) {
      setShowInstallHint(true);
      return;
    }

    const shell = canvasRef.current?.closest(".game-shell") as HTMLElement | null;
    if (!shell) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (immersiveMode) {
      setImmersiveMode(false);
      return;
    }

    if (document.fullscreenEnabled && shell.requestFullscreen) {
      try {
        await shell.requestFullscreen();
        return;
      } catch {
        // Safari on iPhone can expose the API but still reject non-video elements.
      }
    }

    setImmersiveMode(true);
  };

  const fullscreenActive = nativeFullscreen || immersiveMode;

  const controlProps = (key: InputKey) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setInput(key, true);
    },
    onPointerUp: () => setInput(key, false),
    onPointerCancel: () => setInput(key, false),
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  });

  const overlayTitle =
    status === "ready" ? "SKYBREAK PROTOCOL" : status === "paused" ? (isDe ? "SYSTEM PAUSIERT" : "SYSTEM PAUSED") : status === "upgrade" ? (isDe ? "LEVEL GESCHAFFT" : "LEVEL COMPLETE") : status === "won" ? (sector === LEVEL_COUNT ? (isDe ? "GIPFEL ERREICHT" : "SUMMIT REACHED") : (isDe ? "LEVEL GESCHAFFT" : "LEVEL COMPLETE")) : (isDe ? "LAUF BEENDET" : "RUN TERMINATED");
  const overlayCopy =
    status === "ready"
      ? (isDe ? "Durchbrich 10 Cyberpunk-Level und erreiche den Sendeturm." : "Break through 10 cyberpunk levels and reach the transmission tower.")
      : status === "paused"
        ? (isDe ? "Die Zeit steht still. Noch." : "Time stands still. For now.")
        : status === "upgrade"
          ? (isDe ? `Level ${sector} abgeschlossen. Wähle ein Eispickel-Upgrade für Level ${Math.min(LEVEL_COUNT, sector + 1)}.` : `Level ${sector} complete. Choose an ice-pick upgrade for level ${Math.min(LEVEL_COUNT, sector + 1)}.`)
        : status === "won"
          ? (isDe ? `Level ${sector} befreit · ${score.toLocaleString("de-AT")} Punkte` : `Level ${sector} liberated · ${score.toLocaleString("en-US")} points`)
          : (isDe ? `Dein Lauf endet bei ${score.toLocaleString("de-AT")} Punkten.` : `Your run ends at ${score.toLocaleString("en-US")} points.`);

  return (
    <main className={`game-shell${immersiveMode ? " immersive-mode" : ""}`} onPointerDownCapture={ensureAudio}>
      <header className="topbar">
        <div className="brand">
          <button className="brand-mark" type="button" onClick={armCheats} aria-label={isDe ? "Skybreak-Protokoll-Symbol" : "Skybreak Protocol symbol"}>SP</button>
          <div>
            <strong>SKYBREAK PROTOCOL</strong>
            <span>VERTICAL ARCADE PROTOCOL</span>
          </div>
        </div>
        <div className="hud" aria-live="polite">
          <div><span>SCORE</span><strong>{score.toString().padStart(6, "0")}</strong></div>
          <div><span>LEVEL</span><strong>{sector} / {LEVEL_COUNT}</strong></div>
          <div><span>LIVES</span><strong>{"◆".repeat(Math.max(0, lives))}</strong></div>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled ? (isDe ? "Soundeffekte ausschalten" : "Disable sound effects") : (isDe ? "Soundeffekte einschalten" : "Enable sound effects")}>
            {soundEnabled ? "SFX ON" : "SFX OFF"}
          </button>
          <button className="icon-button" onClick={toggleMusic} aria-pressed={musicEnabled} aria-label={musicEnabled ? (isDe ? "Musik ausschalten" : "Disable music") : (isDe ? "Musik einschalten" : "Enable music")}>
            {musicEnabled ? "MUSIC ON" : "MUSIC OFF"}
          </button>
          <button className="icon-button" onClick={toggleFullscreen} aria-label={iPhoneSafari ? (isDe ? "App-Modus erklären" : "Explain app mode") : fullscreenActive ? (isDe ? "Vollbild beenden" : "Exit fullscreen") : (isDe ? "Vollbildmodus starten" : "Enter fullscreen")}>{iPhoneSafari ? (isDe ? "APP-MODUS" : "APP MODE") : fullscreenActive ? "EXIT" : "FULLSCREEN"}</button>
          <button className="icon-button" onClick={togglePause} aria-label={isDe ? "Spiel pausieren" : "Pause game"}>PAUSE</button>
        </div>
      </header>

      <section className="game-frame" aria-label={isDe ? "Skybreak Protocol Spielfeld" : "Skybreak Protocol game field"}>
        {availableUpdate && (
          <aside className="update-notice" role="status">
            <span>{isDe ? `${availableUpdate.prerelease ? "Beta" : "Final"} ${availableUpdate.version} verfügbar` : `${availableUpdate.prerelease ? "Beta" : "Final"} ${availableUpdate.version} available`}</span>
            <a href={availableUpdate.url} target="_blank" rel="noopener">{isDe ? "Ansehen" : "View"} ↗</a>
            <button type="button" onClick={() => setAvailableUpdate(null)} aria-label={isDe ? "Update-Hinweis schließen" : "Dismiss update notice"}>×</button>
          </aside>
        )}
        <canvas
          key={quality === "ultra" ? "webgpu" : "webgl"}
          ref={fxCanvasRef}
          className={`fx-canvas${quality === "ultra" && !(/Macintosh|Mac OS X/i.test(navigator.userAgent) && window.matchMedia("(pointer: fine)").matches) ? " full-scene-fx" : ""}`}
          aria-hidden="true"
        />
        <canvas ref={canvasRef} aria-label={isDe ? "Spielansicht: Klettere durch die Cyberpunk-Megacity" : "Game view: climb through the cyberpunk megacity"} />
        {status !== "playing" && (
          <div className="game-overlay">
            {status === "ready" && (
              <>
                <img className="game-logo" src={iconSrc} alt="Skybreak Protocol emblem" />
                <a className="changelog-link" href={`${CHANGELOG_BASE_URL}/${APP_VERSION}${isDe ? "" : ".en"}.md`} target="_blank" rel="noopener">CHANGELOG ↗</a>
                <a className="language-link" href={languageHref} lang={isDe ? "en" : "de"}>{isDe ? "ENGLISH" : "DEUTSCH"}</a>
              </>
            )}
            <p className="eyebrow">{status === "ready" ? `NIGHT CITY // 03:17 // v${APP_VERSION}` : status === "upgrade" ? `PICKAXE CORE // LEVEL ${sector}` : "NEURAL LINK STATUS"}</p>
            <h1 className={status === "upgrade" ? "upgrade-title" : undefined}>{overlayTitle}</h1>
            <p>{overlayCopy}</p>
            {status === "upgrade" ? (
              <div className="upgrade-grid">
                <button onClick={() => applyPickaxeUpgrade("power")}>
                  <strong>{isDe ? "KRAFT" : "POWER"} {pickaxeStats.power + 1}</strong>
                  <span>{isDe ? "Mehr Plattformmodule pro Schlag zerstören" : "Destroy more platform modules per strike"}</span>
                </button>
                <button onClick={() => applyPickaxeUpgrade("style")}>
                  <strong>{isDe ? "DESIGN" : "STYLE"} {pickaxeStats.style + 1}</strong>
                  <span>{isDe ? "Neue Farbe, Form und stärkeres Leuchten" : "New color, shape, and stronger glow"}</span>
                </button>
              </div>
            ) : (
              <>
                {status !== "paused" && (
                  <label className="start-level-picker">
                    <span>{isDe ? "STARTLEVEL" : "START LEVEL"}</span>
                    <select value={selectedStartLevel} onChange={(event) => chooseStartLevel(Number(event.target.value))}>
                      {Array.from({ length: unlockedLevel }, (_, index) => index + 1).map((level) => (
                        <option key={level} value={level}>LEVEL {level.toString().padStart(2, "0")} // {LEVEL_THEMES[level - 1].name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button className="primary-button" onClick={status === "paused" ? togglePause : restart}>
                  {status === "paused" ? (isDe ? "WEITER" : "RESUME") : status === "ready" ? (isDe ? "AUFSTIEG STARTEN" : "START ASCENT") : (isDe ? "AUSGEWÄHLTES LEVEL STARTEN" : "START SELECTED LEVEL")}
                </button>
              </>
            )}
            {status === "ready" && (
              <div className="mission-grid">
                <span><b>01</b> {isDe ? "Ebenen von unten durchbrechen" : "Break levels from below"}</span>
                <span><b>02</b> {isDe ? "Drohnen ausschalten" : "Disable the drones"}</span>
                <span><b>03</b> {isDe ? "Sendeturm erreichen" : "Reach the transmission tower"}</span>
              </div>
            )}
          </div>
        )}
        <div className={`sector-tag${worldRef.current.immortalSector === sector ? " cheat-active" : ""}`}>LEVEL {sector.toString().padStart(2, "0")} // {LEVEL_THEMES[sector - 1].name} // PICK P{pickaxeStats.power} S{pickaxeStats.style}{worldRef.current.immortalSector === sector ? " // IMMORTAL" : ""} // v{APP_VERSION}</div>
      </section>

      <section className="control-panel">
        <div className="desktop-help">
          <span><kbd>{displayKey(keyBindings.left)}</kbd><kbd>{displayKey(keyBindings.right)}</kbd> {isDe ? "Bewegen" : "Move"}</span>
          <span><kbd>{displayKey(keyBindings.jump)}</kbd> {isDe ? "Springen" : "Jump"}</span>
          <span><kbd>{displayKey(keyBindings.attack)}</kbd> {isDe ? "Eispickel" : "Ice pick"}</span>
          <span><kbd>P</kbd> Pause</span>
        </div>
        <div className="touch-controls" aria-label={isDe ? "Touch-Steuerung" : "Touch controls"}>
          <div className="touch-group">
            <button {...controlProps("left")} aria-label={isDe ? "Nach links" : "Move left"}>←</button>
            <button {...controlProps("right")} aria-label={isDe ? "Nach rechts" : "Move right"}>→</button>
          </div>
          <div className="touch-group">
            <button className="jump" {...controlProps("jump")} aria-label={isDe ? "Springen" : "Jump"}>JUMP</button>
            <button className="attack" {...controlProps("attack")} aria-label={isDe ? "Eispickel einsetzen" : "Use ice pick"}>PICK</button>
          </div>
        </div>
        <div className="mobile-actions">
          <button onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? (isDe ? "SFX AUS" : "SFX OFF") : (isDe ? "SFX AN" : "SFX ON")}</button>
          <button onClick={toggleMusic} aria-pressed={musicEnabled}>{musicEnabled ? (isDe ? "MUSIK AUS" : "MUSIC OFF") : (isDe ? "MUSIK AN" : "MUSIC ON")}</button>
          <button onClick={toggleFullscreen}>{iPhoneSafari ? (isDe ? "APP-MODUS" : "APP MODE") : fullscreenActive ? (isDe ? "BEENDEN" : "EXIT") : (isDe ? "VOLLBILD" : "FULLSCREEN")}</button>
          <button onClick={togglePause}>PAUSE</button>
        </div>
        <label className="quality-picker">
          <span>{isDe ? "GRAFIK" : "GRAPHICS"}</span>
          <select value={quality} onChange={(event) => chooseQuality(event.target.value as Quality)}>
            <option value="low">{isDe ? "Niedrig" : "Low"}</option>
            <option value="medium">{isDe ? "Mittel" : "Medium"}</option>
            <option value="high">{isDe ? "Hoch" : "High"}</option>
            <option value="ultra">Ultra</option>
          </select>
        </label>
        {quality === "ultra" && mobileDevice && (
          <p className="mobile-ultra-warning" role="alert">
            {isDe
              ? "ULTRA KANN DAS HANDY SEHR ERWÄRMEN. NICHT BEI HITZE ODER DIREKTER SONNE NUTZEN."
              : "ULTRA CAN MAKE THE PHONE VERY WARM. DO NOT USE IN HOT WEATHER OR DIRECT SUNLIGHT."}
          </p>
        )}
        {quality === "ultra" && mobileDevice && (
          <label className="mobile-ultra-picker">
            <span>MOBILE ULTRA</span>
            <select value={mobileUltra120 ? "120" : "60"} onChange={(event) => chooseMobileUltra120(event.target.value === "120")}>
              <option value="60">60 FPS</option>
              <option value="120">{isDe ? "Bis 120 FPS" : "Up to 120 FPS"}</option>
            </select>
            <small>{isDe ? "120 FPS erhöht Wärme und Akkuverbrauch" : "120 FPS increases heat and battery use"}</small>
          </label>
        )}
        <label className="difficulty-picker">
          <span>{isDe ? `LEVEL ${sector} SCHWIERIGKEIT` : `LEVEL ${sector} DIFFICULTY`}</span>
          <select value={levelDifficulties[sector - 1]} onChange={(event) => chooseDifficulty(event.target.value as Difficulty)}>
            <option value="easy">{isDe ? "Leicht" : "Easy"}</option>
            <option value="medium">{isDe ? "Mittel" : "Medium"}</option>
            <option value="hard">{isDe ? "Schwer" : "Hard"}</option>
          </select>
          <small>{LEVEL_THEMES[sector - 1].name}</small>
        </label>
        <div className="run-record">
          <span>{renderer} · {quality.toUpperCase()}{quality === "ultra" ? ` · ${ultraFps} FPS${thermalProtection ? ` · ${isDe ? "WÄRMESCHUTZ" : "THERMAL SAFE"}` : ""}` : ""} · LOCAL RECORD</span>
          <strong>{highScore.toString().padStart(6, "0")}</strong>
        </div>
        {!mobileDevice && (
          <div className="key-binding-panel">
            <span>{isDe ? "TASTENBELEGUNG" : "KEY BINDINGS"}</span>
            {(["left", "right", "jump", "attack"] as BindableAction[]).map((action) => (
              <button key={action} type="button" className={bindingCapture === action ? "listening" : ""} onClick={() => beginKeyCapture(action)}>
                <small>{action === "left" ? (isDe ? "LINKS" : "LEFT") : action === "right" ? (isDe ? "RECHTS" : "RIGHT") : action === "jump" ? (isDe ? "SPRINGEN" : "JUMP") : (isDe ? "HÄMMERN" : "PICK")}</small>
                <strong>{bindingCapture === action ? (isDe ? "TASTE DRÜCKEN" : "PRESS KEY") : displayKey(keyBindings[action])}</strong>
              </button>
            ))}
            <button type="button" className="reset-keys" onClick={resetKeyBindings}>{isDe ? "STANDARD" : "RESET"}</button>
          </div>
        )}
      </section>
      {showInstallHint && (
        <div className="install-hint" role="dialog" aria-modal="true" aria-labelledby="install-hint-title">
          <div className="install-hint-card">
            <span>IPHONE // APP MODE</span>
            <h2 id="install-hint-title">{isDe ? "ECHTES VOLLBILD" : "TRUE FULLSCREEN"}</h2>
            <p>{isDe ? "Tippe in Safari auf Teilen und dann auf „Zum Home-Bildschirm“. Starte Skybreak anschließend über das App-Symbol." : "In Safari, tap Share and then “Add to Home Screen”. Launch Skybreak from its app icon afterwards."}</p>
            <button onClick={() => setShowInstallHint(false)}>{isDe ? "VERSTANDEN" : "GOT IT"}</button>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameStatus = "ready" | "playing" | "paused" | "gameover" | "won";
type InputKey = "left" | "right" | "jump" | "attack";
type Quality = "low" | "medium" | "high" | "ultra";

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
const GRAVITY = 1450;
const MOVE_SPEED = 255;
const JUMP_SPEED = 610;
const WORLD_TOP = -3150;

type Tile = { x: number; y: number; alive: boolean; cracked: boolean };
type Enemy = { x: number; y: number; vx: number; vy: number; alive: boolean; grounded: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: number;
  attack: number;
  invulnerable: number;
};

type World = {
  player: Player;
  tiles: Tile[];
  enemies: Enemy[];
  particles: Particle[];
  cameraX: number;
  cameraY: number;
  score: number;
  lives: number;
  sector: number;
  lastTime: number;
  status: GameStatus;
  hazardTimer: number;
  fxTime: number;
  shake: number;
};

function buildLevel(): Pick<World, "tiles" | "enemies"> {
  const tiles: Tile[] = [];
  const enemies: Enemy[] = [];

  for (let row = 0; row < 39; row++) {
    const y = 475 - row * 92;
    const gapStart = row === 0 ? -10 : (row * 5 + 2) % 11;
    for (let col = 0; col < 15; col++) {
      const safeEdge = col === 0 || col === 14;
      const gap = !safeEdge && (col === gapStart || (row % 7 === 4 && col === gapStart + 1));
      if (!gap) {
        tiles.push({ x: col * TILE, y, alive: true, cracked: row > 0 });
      }
    }
    if (row > 2 && row % 4 === 1) {
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
  return { tiles, enemies };
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
      invulnerable: 0,
    },
    particles: [],
    cameraX: 210,
    cameraY: 0,
    score: 0,
    lives: 3,
    sector: 1,
    lastTime: 0,
    status: "ready",
    hazardTimer: 2.4,
    fxTime: 0,
    shake: 0,
  };
}

function createAudio() {
  let context: AudioContext | null = null;
  const tone = (frequency: number, duration: number, type: OscillatorType, gain = 0.07) => {
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
  return {
    jump: () => tone(330, 0.11, "square", 0.045),
    smash: () => tone(105, 0.16, "sawtooth", 0.08),
    hit: () => tone(65, 0.3, "sawtooth", 0.1),
    enemy: () => tone(520, 0.1, "square", 0.06),
    win: () => {
      tone(520, 0.22, "sine", 0.07);
      window.setTimeout(() => tone(780, 0.32, "sine", 0.07), 130);
    },
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
  const mutedRef = useRef(false);
  const qualityRef = useRef<Quality>("medium");
  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [sector, setSector] = useState(1);
  const [muted, setMuted] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [renderer, setRenderer] = useState("CANVAS 2D");
  const [quality, setQuality] = useState<Quality>("medium");

  const syncHud = useCallback((world: World) => {
    setScore(world.score);
    setLives(world.lives);
    setSector(world.sector);
    setStatus(world.status);
  }, []);

  const restart = useCallback(() => {
    const next = makeWorld();
    next.status = "playing";
    worldRef.current = next;
    pressedRef.current = { left: false, right: false, jump: false, attack: false };
    inputRef.current = { left: false, right: false, jump: false, attack: false };
    if (!mutedRef.current) audioRef.current ??= createAudio();
    syncHud(next);
  }, [syncHud]);

  const setInput = useCallback((key: InputKey, active: boolean) => {
    if (active && !inputRef.current[key]) pressedRef.current[key] = true;
    inputRef.current[key] = active;
  }, []);

  useEffect(() => {
    const saved = Number(localStorage.getItem("neon-ascent-highscore") || 0);
    setHighScore(saved);
    const storedQuality = localStorage.getItem("skybreak-quality") as Quality | null;
    const initialQuality = storedQuality && storedQuality in QUALITY_SETTINGS
      ? storedQuality
      : window.matchMedia("(pointer: coarse)").matches ? "medium" : "high";
    qualityRef.current = initialQuality;
    setQuality(initialQuality);
    window.dispatchEvent(new Event("skybreak-quality"));
  }, []);

  const chooseQuality = (next: Quality) => {
    qualityRef.current = next;
    setQuality(next);
    localStorage.setItem("skybreak-quality", next);
    window.dispatchEvent(new Event("skybreak-quality"));
  };

  useEffect(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
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
      const settings = QUALITY_SETTINGS[qualityRef.current];
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
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const map: Record<string, InputKey | undefined> = {
        ArrowLeft: "left",
        KeyA: "left",
        ArrowRight: "right",
        KeyD: "right",
        Space: "jump",
        ArrowUp: "jump",
        KeyW: "jump",
        KeyX: "attack",
        KeyK: "attack",
      };
      const key = map[event.code];
      if (key) {
        event.preventDefault();
        setInput(key, true);
      }
      if (event.code === "KeyP" || event.code === "Escape") {
        const world = worldRef.current;
        if (world.status === "playing" || world.status === "paused") {
          world.status = world.status === "playing" ? "paused" : "playing";
          setStatus(world.status);
        }
      }
      if (event.code === "Enter" && ["ready", "gameover", "won"].includes(worldRef.current.status)) restart();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const map: Record<string, InputKey | undefined> = {
        ArrowLeft: "left",
        KeyA: "left",
        ArrowRight: "right",
        KeyD: "right",
        Space: "jump",
        ArrowUp: "jump",
        KeyW: "jump",
        KeyX: "attack",
        KeyK: "attack",
      };
      const key = map[event.code];
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
  }, [restart, setInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    let frame = 0;
    const view = { width: VIEW_W, height: VIEW_H, portrait: false };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const settings = QUALITY_SETTINGS[qualityRef.current];
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
      world.lives -= 1;
      world.shake = 18;
      audioRef.current?.hit();
      burst(world, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, "#ff2b8a", 18);
      if (world.lives <= 0) {
        world.status = "gameover";
        setStatus("gameover");
        const best = Math.max(world.score, Number(localStorage.getItem("neon-ascent-highscore") || 0));
        localStorage.setItem("neon-ascent-highscore", String(best));
        setHighScore(best);
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
      world.fxTime += dt;
      world.shake = Math.max(0, world.shake - dt * 38);
      const p = world.player;
      const input = inputRef.current;
      const pressed = pressedRef.current;
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      p.attack = Math.max(0, p.attack - dt);

      p.vx = input.left ? -MOVE_SPEED : input.right ? MOVE_SPEED : p.vx * Math.pow(0.002, dt);
      if (p.vx) p.facing = Math.sign(p.vx);
      if (pressed.jump && p.grounded) {
        p.vy = -JUMP_SPEED;
        p.grounded = false;
        audioRef.current?.jump();
      }
      if (pressed.attack) p.attack = 0.22;
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
          world.score += 100;
          burst(world, tile.x + TILE / 2, tile.y + 12, "#00f0ff", 12);
          audioRef.current?.smash();
          syncHud(world);
        }
      }

      if (p.attack > 0) {
        const attackX = p.x + (p.facing > 0 ? PLAYER_W - 2 : -28);
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue;
          if (Math.abs(enemy.x - attackX) < 48 && Math.abs(enemy.y - p.y) < 50) {
            enemy.alive = false;
            world.score += 250;
            burst(world, enemy.x + 18, enemy.y + 16, "#ffd84d", 14);
            audioRef.current?.enemy();
            syncHud(world);
          }
        }
      }

      for (const enemy of world.enemies) {
        if (!enemy.alive) continue;
        const enemyOldY = enemy.y;
        enemy.vy += GRAVITY * 0.78 * dt;
        enemy.x += enemy.vx * dt;
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
            world.score += 200;
            burst(world, enemy.x + 18, enemy.y + 16, "#ffd84d", 12);
            audioRef.current?.enemy();
            syncHud(world);
          } else hurt(world);
        }
      }

      world.hazardTimer -= dt;
      if (world.hazardTimer <= 0 && world.cameraY < -400) {
        world.hazardTimer = 2.3 + Math.random() * 2.2;
        world.particles.push({
          x: 50 + Math.random() * 860,
          y: world.cameraY - 30,
          vx: (Math.random() - 0.5) * 35,
          vy: 360,
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
      const newSector = Math.min(9, Math.max(1, Math.floor(-p.y / 385) + 1));
      if (newSector !== world.sector) {
        world.sector = newSector;
        syncHud(world);
      }
      if (p.y > world.cameraY + view.height + 130) hurt(world);
      if (p.y < WORLD_TOP) {
        world.status = "won";
        world.score += 5000;
        audioRef.current?.win();
        const best = Math.max(world.score, Number(localStorage.getItem("neon-ascent-highscore") || 0));
        localStorage.setItem("neon-ascent-highscore", String(best));
        setHighScore(best);
        syncHud(world);
      }
    };

    const draw = (world: World) => {
      const settings = QUALITY_SETTINGS[qualityRef.current];
      const sx = canvas.width / view.width;
      const sy = canvas.height / view.height;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.clearRect(0, 0, view.width, view.height);
      const shakeX = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      const shakeY = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      ctx.translate(shakeX, shakeY);

      const bg = ctx.createLinearGradient(0, 0, 0, view.height);
      bg.addColorStop(0, "#061b37");
      bg.addColorStop(0.42, "#10072b");
      bg.addColorStop(0.76, "#09031a");
      bg.addColorStop(1, "#01030a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, view.width, view.height);

      // Volumetric searchlights and atmospheric neon bloom.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 4; i++) {
        const origin = ((i * 281 + world.fxTime * (i % 2 ? 13 : -9)) % (view.width + 260)) - 130;
        const beam = ctx.createLinearGradient(origin, 0, origin + 190, view.height);
        beam.addColorStop(0, i % 2 ? "rgba(255,43,138,.52)" : "rgba(0,240,255,.48)");
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
      for (let i = 0; i < settings.traffic; i++) {
        const speed = 18 + (i % 5) * 8;
        const x = (i * 151 + world.fxTime * speed) % (view.width + 120) - 60;
        const y = 35 + ((i * 89 - world.cameraY * 0.025) % Math.max(100, view.height * 0.62));
        const color = i % 3 === 0 ? "#ff2b8a" : "#00eaff";
        const trail = ctx.createLinearGradient(x - 34, y, x + 8, y);
        trail.addColorStop(0, "rgba(0,0,0,0)");
        trail.addColorStop(1, color);
        ctx.fillStyle = trail;
        ctx.fillRect(x - 34, y, 42, 1.5);
      }
      ctx.restore();

      ctx.save();
      for (let layer = 0; layer < settings.layers; layer++) {
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
          ctx.fillStyle = i % 3 ? "#00d8ff" : "#ff2b8a";
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
      for (let i = 0; i < 3; i++) {
        const bx = 80 + ((i * 337 - world.cameraX * 0.14) % Math.max(300, view.width - 120));
        const by = view.height * (0.26 + i * 0.16) + ((-world.cameraY * 0.045) % 70);
        const pulse = 0.4 + Math.sin(world.fxTime * 2.2 + i) * 0.12;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = i % 2 ? "#ff2b8a" : "#00f0ff";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, 88, 32);
        ctx.fillStyle = i % 2 ? "rgba(255,43,138,.08)" : "rgba(0,240,255,.08)";
        ctx.fillRect(bx, by, 88, 32);
        ctx.font = "700 8px ui-monospace, monospace";
        ctx.fillStyle = i % 2 ? "#ff78b7" : "#8ffaff";
        ctx.fillText(i === 0 ? "SKY//BREAK" : i === 1 ? "SECTOR 09" : "ASCEND", bx + 9, by + 19);
      }
      ctx.restore();

      // Neon rain is screen-space so it remains consistent while climbing.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < settings.rain; i++) {
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

      ctx.strokeStyle = "rgba(0,240,255,.08)";
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

      ctx.save();
      ctx.translate(-world.cameraX, -world.cameraY);
      for (const tile of world.tiles) {
        if (!tile.alive || tile.y < world.cameraY - 80 || tile.y > world.cameraY + view.height + 50) continue;
        const glow = tile.cracked ? "#00f0ff" : "#ffd84d";
        // Deep extrusion, animated power core and polished wet-metal edge.
        const underside = ctx.createLinearGradient(tile.x, tile.y + 16, tile.x, tile.y + 40);
        underside.addColorStop(0, "#101c2f");
        underside.addColorStop(1, "rgba(2,5,14,.92)");
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
        plate.addColorStop(0, "#39506e");
        plate.addColorStop(0.18, "#182940");
        plate.addColorStop(0.58, "#0a1425");
        plate.addColorStop(1, "#030813");
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
        ctx.shadowBlur = 26;
        ctx.shadowColor = "#00f0ff";
        const suit = ctx.createLinearGradient(-17, -24, 17, 24);
        suit.addColorStop(0, "#1b5d78");
        suit.addColorStop(0.38, "#071e34");
        suit.addColorStop(1, "#020813");
        ctx.fillStyle = suit;
        roundedRect(ctx, -17, -24, 34, 48, 9);
        ctx.fill();
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        const visor = ctx.createLinearGradient(-10, -20, 12, -8);
        visor.addColorStop(0, "#ffffff");
        visor.addColorStop(0.4, "#8ffaff");
        visor.addColorStop(1, "#16496b");
        ctx.fillStyle = visor;
        roundedRect(ctx, -10, -20, 22, 12, 5);
        ctx.fill();
        ctx.fillStyle = "#ff2b8a";
        ctx.fillRect(2, -16, 6, 3);
        ctx.strokeStyle = "rgba(255,255,255,.38)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-11, -2);
        ctx.lineTo(10, -2);
        ctx.moveTo(0, 3);
        ctx.lineTo(0, 18);
        ctx.stroke();
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-9, 23);
        ctx.lineTo(-11, 32);
        ctx.moveTo(9, 23);
        ctx.lineTo(12, 32);
        ctx.stroke();
        ctx.strokeStyle = "#ffd84d";
        ctx.lineWidth = 4;
        const arm = p.attack > 0 ? -20 : -4;
        ctx.beginPath();
        ctx.moveTo(13, -2);
        ctx.lineTo(27, arm);
        ctx.stroke();
        if (p.attack > 0) {
          ctx.fillStyle = "#ffd84d";
          ctx.shadowBlur = 12;
          ctx.shadowColor = "#ffd84d";
          roundedRect(ctx, 22, -29, 24, 12, 4);
          ctx.fill();
          ctx.globalAlpha = 0.42;
          ctx.strokeStyle = "#fff1a6";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(34, -23, 17 + Math.sin(world.fxTime * 16) * 3, -0.8, 0.8);
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
    };

    let lastRenderedFrame = 0;
    const loop = (time: number) => {
      const frameInterval = 1000 / QUALITY_SETTINGS[qualityRef.current].fps;
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
    setStatus(world.status);
  };

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) audioRef.current = null;
    else audioRef.current = createAudio();
  };

  const toggleFullscreen = async () => {
    const frame = canvasRef.current?.closest(".game-frame") as HTMLElement | null;
    if (!frame) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.requestFullscreen) await frame.requestFullscreen();
    } catch {
      // iPhone Safari may decline element fullscreen; the game remains fully playable inline.
    }
  };

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
    status === "ready" ? "SKYBREAK PROTOCOL" : status === "paused" ? (isDe ? "SYSTEM PAUSIERT" : "SYSTEM PAUSED") : status === "won" ? (isDe ? "GIPFEL ERREICHT" : "SUMMIT REACHED") : (isDe ? "LAUF BEENDET" : "RUN TERMINATED");
  const overlayCopy =
    status === "ready"
      ? (isDe ? "Durchbrich die Ebenen der Megacity und erreiche den Sendeturm." : "Break through the megacity levels and reach the transmission tower.")
      : status === "paused"
        ? (isDe ? "Die Zeit steht still. Noch." : "Time stands still. For now.")
        : status === "won"
          ? (isDe ? `Sektor 9 befreit · ${score.toLocaleString("de-AT")} Punkte` : `Sector 9 liberated · ${score.toLocaleString("en-US")} points`)
          : (isDe ? `Dein Lauf endet bei ${score.toLocaleString("de-AT")} Punkten.` : `Your run ends at ${score.toLocaleString("en-US")} points.`);

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">SP</span>
          <div>
            <strong>SKYBREAK PROTOCOL</strong>
            <span>VERTICAL ARCADE PROTOCOL</span>
          </div>
        </div>
        <div className="hud" aria-live="polite">
          <div><span>SCORE</span><strong>{score.toString().padStart(6, "0")}</strong></div>
          <div><span>SECTOR</span><strong>{sector} / 9</strong></div>
          <div><span>LIVES</span><strong>{"◆".repeat(Math.max(0, lives))}</strong></div>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={toggleMute} aria-label={muted ? (isDe ? "Ton einschalten" : "Enable sound") : (isDe ? "Ton ausschalten" : "Mute sound")}>
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
          <button className="icon-button" onClick={toggleFullscreen} aria-label={isDe ? "Vollbildmodus umschalten" : "Toggle fullscreen"}>FULLSCREEN</button>
          <button className="icon-button" onClick={togglePause} aria-label={isDe ? "Spiel pausieren" : "Pause game"}>PAUSE</button>
        </div>
      </header>

      <section className="game-frame" aria-label={isDe ? "Skybreak Protocol Spielfeld" : "Skybreak Protocol game field"}>
        <canvas ref={fxCanvasRef} className="fx-canvas" aria-hidden="true" />
        <canvas ref={canvasRef} aria-label={isDe ? "Spielansicht: Klettere durch die Cyberpunk-Megacity" : "Game view: climb through the cyberpunk megacity"} />
        {status !== "playing" && (
          <div className="game-overlay">
            {status === "ready" && (
              <>
                <img className="game-logo" src={iconSrc} alt="Skybreak Protocol emblem" />
                <a className="language-link" href={languageHref} lang={isDe ? "en" : "de"}>{isDe ? "ENGLISH" : "DEUTSCH"}</a>
              </>
            )}
            <p className="eyebrow">{status === "ready" ? "NIGHT CITY // 03:17" : "NEURAL LINK STATUS"}</p>
            <h1>{overlayTitle}</h1>
            <p>{overlayCopy}</p>
            <button className="primary-button" onClick={status === "paused" ? togglePause : restart}>
              {status === "paused" ? (isDe ? "WEITER" : "RESUME") : status === "ready" ? (isDe ? "AUFSTIEG STARTEN" : "START ASCENT") : (isDe ? "NEUER VERSUCH" : "TRY AGAIN")}
            </button>
            {status === "ready" && (
              <div className="mission-grid">
                <span><b>01</b> {isDe ? "Ebenen von unten durchbrechen" : "Break levels from below"}</span>
                <span><b>02</b> {isDe ? "Drohnen ausschalten" : "Disable the drones"}</span>
                <span><b>03</b> {isDe ? "Sendeturm erreichen" : "Reach the transmission tower"}</span>
              </div>
            )}
          </div>
        )}
        <div className="sector-tag">ALTITUDE {Math.max(0, Math.round(-worldRef.current.player.y + 415)).toString().padStart(4, "0")} M</div>
      </section>

      <section className="control-panel">
        <div className="desktop-help">
          <span><kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd> {isDe ? "Bewegen" : "Move"}</span>
          <span><kbd>W</kbd> / <kbd>SPACE</kbd> {isDe ? "Springen" : "Jump"}</span>
          <span><kbd>X</kbd> {isDe ? "Impulshammer" : "Pulse hammer"}</span>
          <span><kbd>P</kbd> Pause</span>
        </div>
        <div className="touch-controls" aria-label={isDe ? "Touch-Steuerung" : "Touch controls"}>
          <div className="touch-group">
            <button {...controlProps("left")} aria-label={isDe ? "Nach links" : "Move left"}>←</button>
            <button {...controlProps("right")} aria-label={isDe ? "Nach rechts" : "Move right"}>→</button>
          </div>
          <div className="touch-group">
            <button className="jump" {...controlProps("jump")} aria-label={isDe ? "Springen" : "Jump"}>JUMP</button>
            <button className="attack" {...controlProps("attack")} aria-label={isDe ? "Impulshammer" : "Pulse hammer"}>PULSE</button>
          </div>
        </div>
        <div className="mobile-actions">
          <button onClick={toggleMute}>{muted ? (isDe ? "TON AN" : "SOUND ON") : (isDe ? "TON AUS" : "SOUND OFF")}</button>
          <button onClick={toggleFullscreen}>{isDe ? "VOLLBILD" : "FULLSCREEN"}</button>
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
        <div className="run-record">
          <span>{renderer} · {quality.toUpperCase()} · LOCAL RECORD</span>
          <strong>{highScore.toString().padStart(6, "0")}</strong>
        </div>
      </section>
    </main>
  );
}

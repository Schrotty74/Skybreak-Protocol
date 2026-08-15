"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkForUpdate, type AvailableUpdate } from "./updateCheck";
import { applyPowerUp, buildChestSpawns, ROAMING_CHEST_RULES, type PowerUpKind, type RoamingChestDifficulty } from "./powerUps";
import { detectCheat, type CheatId } from "./cheats";
import { actionForCode, DEFAULT_KEY_BINDINGS, displayKey, normalizeKeyBindings, rebindKey, type BindableAction, type KeyBindings } from "./keyBindings";
import { clearStoredProfile, getStoredItem, setStoredItem } from "./storage";

// A navigation-based reset runs before React restores any saved progression.
// It is deliberately independent of the in-game click/state lifecycle.
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("reset-profile")) {
  clearStoredProfile();
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
}
import { createAudio } from "./gameAudio";
import { drawLevelBackgroundAnimation } from "./game/renderBackground";
import { drawAnimatedBikiniAvatar, drawHologramDancer, drawLevelRobot, getPreparedChestSprite, getPreparedEnemySprite, getPreparedParticleSprite } from "./game/renderEntities";
import { startWebGlEffects, startWebGpuEffects, startWebGpuUltraRenderer, type EffectCleanup } from "./game/webgpuEffects";
import { BLOCK_EXPLOSION_STYLES, FALLING_HAZARD_STYLES, type BlockExplosionStyle, LEVEL_BACKDROP_FILES, LEVEL_COUNT, LEVEL_GAMEPLAY, LEVEL_THEMES } from "./levelData";

type GameStatus = "ready" | "playing" | "paused" | "chestChoice" | "celebration" | "bikiniShowcase" | "upgrade" | "gameover" | "won";
type InputKey = BindableAction;
type Quality = "low" | "medium" | "high" | "ultra";
type ChallengeMode = "standard" | "noDamage" | "scoreRush";
type RenderResolution = "720p" | "1080p" | "4k";
type Difficulty = "easy" | "medium" | "hard";
type FrameRateMode = "60" | "120" | "unlimited";
type BenchmarkResult = { fps: number; frameMs: number; updateMs: number; drawMs: number; gpuMs: number | null; quality: Quality; resolution: RenderResolution; frameRate: FrameRateMode };
type CosmeticLoadout = { style: number; avatar: Player["avatar"]; robotProfile: number };

const APP_VERSION = __APP_VERSION__;
const APP_BUILD_CHANNEL = __APP_BUILD_CHANNEL__;
// Local-only comparison switch. Set this to false to restore the original
// Level 1 Ultra presentation without touching the showcase implementation.
const LOCAL_LEVEL_ONE_ULTRA_STRESS_TEST = false;
const CHANGELOG_BASE_URL = "https://github.com/Schrotty74/Skybreak-Protocol/blob/main/docs/releases";

const DIFFICULTY_SETTINGS: Record<Difficulty, { enemy: number; hazards: number; hazardSpeed: number; score: number }> = {
  easy: { enemy: 0.3, hazards: 0.15, hazardSpeed: 0.34, score: 0.65 },
  medium: { enemy: 1, hazards: 1, hazardSpeed: 1, score: 1 },
  hard: { enemy: 1.28, hazards: 1.42, hazardSpeed: 1.3, score: 1.35 },
};

const SHIELD_DURATION_SECONDS: Record<Difficulty, number> = { easy: 8, medium: 6, hard: 4 };
const SHIELD_HIT_CAPACITY: Record<Difficulty, number> = { easy: 3, medium: 2, hard: 1 };

const FALLING_HAZARD_SETTINGS: Record<Difficulty, { interval: [number, number]; count: number; speed: number; size: number }> = {
  easy: { interval: [5.8, 7.2], count: 1, speed: .72, size: 11 },
  medium: { interval: [3.5, 4.8], count: 1, speed: 1, size: 14 },
  hard: { interval: [2.2, 3.3], count: 2, speed: 1.26, size: 17 },
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
  low: { fps: 30, dpr: 1, glFps: 12, glDpr: 0.7, webgl: false, traffic: 10, layers: 3, rain: 30, fog: 5 },
  medium: { fps: 40, dpr: 1.5, glFps: 30, glDpr: 1, webgl: true, traffic: 20, layers: 5, rain: 68, fog: 7 },
  high: { fps: 60, dpr: 2, glFps: 45, glDpr: 1.5, webgl: true, traffic: 28, layers: 6, rain: 95, fog: 8 },
  ultra: { fps: 60, dpr: 4, glFps: 60, glDpr: 2.5, webgl: true, traffic: 48, layers: 8, rain: 200, fog: 12 },
};

// Preserve the established mobile effect budgets. The expanded values above
// are a desktop visual upgrade and must not add heat or battery load on phones.
const MOBILE_EFFECT_BUDGETS = {
  low: { traffic: 0, layers: 0, rain: 0, fog: 0 },
  medium: { traffic: 10, layers: 2, rain: 38, fog: 2 },
  high: { traffic: 18, layers: 3, rain: 65, fog: 3 },
  ultra: { traffic: 38, layers: 5, rain: 170, fog: 7 },
} as const;

function activeQualitySettings(quality: Quality, ultraFallback = false, mobileHighThermalProtection = false) {
  const resolvedQuality = quality === "ultra" && ultraFallback ? "medium" : quality;
  const settings = QUALITY_SETTINGS[resolvedQuality];
  const mobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  // Mobile High keeps gameplay at 60 FPS, but reduces only the separate effect
  // renderer and the most expensive atmospheric layers.
  if (resolvedQuality === "high" && mobile) {
    return mobileHighThermalProtection
      ? { ...settings, dpr: 1.25, glFps: 20, glDpr: 0.8, traffic: 8, layers: 1, rain: 24, fog: 1 }
      : { ...settings, dpr: 1.5, glFps: 30, glDpr: 1, traffic: 13, layers: 2, rain: 40, fog: 2 };
  }
  if (mobile) return { ...settings, ...MOBILE_EFFECT_BUDGETS[resolvedQuality] };
  return settings;
}

const VIEW_W = 960;
const VIEW_H = 540;
const RENDER_RESOLUTIONS: Record<RenderResolution, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};

function cappedPixelRatio(rect: DOMRect, preferredRatio: number, resolution: RenderResolution, maxTextureSize = Infinity) {
  const target = RENDER_RESOLUTIONS[resolution];
  return Math.min(
    preferredRatio,
    target.width / Math.max(1, rect.width),
    target.height / Math.max(1, rect.height),
    maxTextureSize / Math.max(1, rect.width),
    maxTextureSize / Math.max(1, rect.height),
  );
}

function colorChannels(color: string): [number, number, number] {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return [0.08, 0.82, 1];
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
}

import { addDestructibleWalls, addDoubleDecks, applyEasyAssists, buildLevel, FLOOR_BASE_Y, FLOOR_SPACING, GRAVITY, JUMP_SPEED, LEVEL_FLOORS, levelProgress, makeWorld, MOVE_SPEED, PLAYER_H, PLAYER_W, placeWorldAtLevel, setBossLayout, setChestLayout, setEnemyLayout, setGuardianIntegrity, setMovingBlockLayout, setPhaseBlockLayout, themeColor, TILE, tileIsActive, WORLD_TOP, type Chest, type Enemy, type Objective, type Particle, type Player, type Tile, type TileMode, type World } from "./game/world";


const CHEST_POWER_UPS: PowerUpKind[] = ["shield", "life", "score", "overdrive"];
const PICKAXE_STYLES = [
  { de: "GOLD // KURVE", en: "GOLD // CURVE" },
  { de: "CYAN // KLINGE", en: "CYAN // BLADE" },
  { de: "PINK // SPITZE", en: "PINK // SPIKE" },
  { de: "GRÜN // KURVE", en: "GREEN // CURVE" },
  { de: "ORANGE // KLINGE", en: "ORANGE // BLADE" },
  { de: "VIOLETT // SPITZE", en: "VIOLET // SPIKE" },
  { de: "EIS // KURVE", en: "ICE // CURVE" },
  { de: "LILA // KLINGE", en: "LILAC // BLADE" },
  { de: "WEISS // SPITZE", en: "WHITE // SPIKE" },
  { de: "SONNE // KURVE", en: "SUN // CURVE" },
] as const;

const BIKINI_LOOKS = [
  { name: "NEON WAVE", primary: "#00f0ff", secondary: "#1c6dff", cut: 0 },
  { name: "CHROME PINK", primary: "#ff4ed8", secondary: "#ffe3f8", cut: 1 },
  { name: "TOXIC LIME", primary: "#72ff4d", secondary: "#d9ff8a", cut: 2 },
  { name: "FIREWALL RED", primary: "#ff365f", secondary: "#ffb12f", cut: 3 },
  { name: "AZURE WRAP", primary: "#36bfff", secondary: "#7c5cff", cut: 4 },
  { name: "VIOLET NOVA", primary: "#c65cff", secondary: "#ff3dbb", cut: 5 },
  { name: "SOLAR GOLD", primary: "#ffb53b", secondary: "#fff2a6", cut: 6 },
  { name: "GHOST MINT", primary: "#84fff2", secondary: "#b1a3ff", cut: 7 },
  { name: "RIFT IRIS", primary: "#9c6bff", secondary: "#00f6ff", cut: 8 },
  { name: "APEX WHITE", primary: "#ffffff", secondary: "#ffcf4a", cut: 9 },
] as const;

const BIKINI_AVATAR_UNLOCK_LEVEL = 7;

function normalizeCosmeticLoadout(value: unknown, unlockedLevel: number, availableRobotProfiles: number[] = [1]): CosmeticLoadout {
  const candidate = value && typeof value === "object" ? value as Partial<CosmeticLoadout> : {};
  const maxStyle = Math.min(PICKAXE_STYLES.length, Math.max(1, unlockedLevel));
  const style = typeof candidate.style === "number" ? Math.min(maxStyle, Math.max(1, Math.round(candidate.style))) : 1;
  const avatar = candidate.avatar === "bikini" && unlockedLevel >= BIKINI_AVATAR_UNLOCK_LEVEL ? "bikini" : "robot";
  const requestedProfile = typeof candidate.robotProfile === "number" ? Math.round(candidate.robotProfile) : 0;
  const robotProfile = requestedProfile > 0 && availableRobotProfiles.includes(requestedProfile) ? requestedProfile : 0;
  return { style, avatar, robotProfile };
}


function pickaxeBreakCount(power: number) {
  return Math.min(5, 1 + Math.floor((Math.min(10, power) - 1) / 2));
}

function placeRoamingChest(world: World, difficulty: RoamingChestDifficulty, viewportHeight: number, slot: "primary" | "secondary"): boolean {
  const sector = world.sector;
  const existing = [world.roamingChest, world.roamingChestSecondary].filter((chest): chest is Chest => Boolean(chest));
  const validTiles = world.tiles.filter((tile) => tile.alive
    && tile.x >= TILE
    && tile.x <= VIEW_W - TILE * 2
    && existing.every((chest) => Math.abs(tile.x + 13 - chest.x) > TILE || Math.abs(tile.y - 30 - chest.y) > 60));
  const available = difficulty === "hard"
    ? validTiles.filter((tile) => tile.y >= world.cameraY - 40 && tile.y <= world.cameraY + viewportHeight + 40)
    : validTiles.filter((tile) => tile.y <= Math.min(475, world.player.y + 320)
      && tile.y >= Math.max(WORLD_TOP, world.player.y - 360));
  if (!available.length) {
    if (slot === "primary") world.roamingChest = null;
    else world.roamingChestSecondary = null;
    return false;
  }
  const rules = ROAMING_CHEST_RULES[difficulty];
  const forceBelow = difficulty === "medium"
    && Boolean(rules.forceBelowEvery)
    && world.roamingChestMoves > 0
    && world.roamingChestMoves % rules.forceBelowEvery! === 0;
  const below = available.filter((tile) => tile.y > world.player.y + 65);
  const preferredHardTiles = available.filter((tile) => tile.y <= world.player.y + PLAYER_H + 8);
  const pool = difficulty === "hard"
    ? (preferredHardTiles.length ? preferredHardTiles : available)
    : forceBelow && below.length ? below : available;
  const chosen = pool[(sector * 11 + world.roamingChestMoves * 7 + (slot === "secondary" ? 3 : 0)) % pool.length];
  const chest: Chest = {
    x: chosen.x + 13,
    y: chosen.y - 30,
    opened: false,
    roaming: true,
    powerUp: CHEST_POWER_UPS[(sector - 1 + (slot === "secondary" ? 2 : 0)) % CHEST_POWER_UPS.length],
  };
  if (slot === "primary") {
    world.roamingChest = chest;
    world.roamingChestTimer = rules.visibleSeconds;
  } else {
    world.roamingChestSecondary = chest;
    world.roamingChestSecondaryTimer = rules.visibleSeconds;
  }
  return forceBelow && below.length > 0;
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
  const benchmarkParameters = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const benchmarkMode = benchmarkParameters?.get("benchmark") === "1";
  const benchmarkVariant = benchmarkParameters?.get("variant") || "standard";
  const benchmarkQuality = benchmarkParameters?.get("quality") as Quality | null;
  const benchmarkResolution = benchmarkParameters?.get("resolution") as RenderResolution | null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const bikiniAvatarImageRef = useRef<HTMLImageElement | null>(null);
  const levelBackdropImagesRef = useRef<(HTMLImageElement | null)[]>(Array(LEVEL_BACKDROP_FILES.length).fill(null));
  const worldRef = useRef<World>(makeWorld());
  const inputRef = useRef<Record<InputKey, boolean>>({ left: false, right: false, jump: false, attack: false });
  const pressedRef = useRef<Record<InputKey, boolean>>({ left: false, right: false, jump: false, attack: false });
  const audioRef = useRef<ReturnType<typeof createAudio> | null>(null);
  const soundEnabledRef = useRef(true);
  const musicEnabledRef = useRef(true);
  const qualityRef = useRef<Quality>("medium");
  const renderResolutionRef = useRef<RenderResolution>("1080p");
  const mobileHighThermalRef = useRef({ active: false, samples: 0, totalWork: 0 });
  const desktopUltraPerformanceRef = useRef({ scale: 1, samples: 0, totalFrameMs: 0 });
  const ultraFpsRef = useRef(60);
  const mobileUltra120Ref = useRef(false);
  const ultraUnlimitedRef = useRef(false);
  const inGameBenchmarkRef = useRef({ active: false, startedAt: 0, frames: 0, totalFrameMs: 0, totalUpdateMs: 0, totalDrawMs: 0 });
  const inGameBenchmarkTimeoutRef = useRef<number | null>(null);
  const ultraFallbackRef = useRef(false);
  const pickaxeLoadoutRef = useRef({ power: 1, style: 1 });
  const avatarRef = useRef<Player["avatar"]>("robot");
  const robotProfileRef = useRef(0);
  const audioUnlockCheatRef = useRef({ cycles: 0, lastCycle: 0, awaitingMusicOff: false });
  const keyBindingsRef = useRef<KeyBindings>({ ...DEFAULT_KEY_BINDINGS });
  const bindingCaptureRef = useRef<BindableAction | null>(null);
  const unlockedLevelRef = useRef(1);
  const selectedStartLevelRef = useRef(1);
  const challengeRef = useRef<ChallengeMode>("standard");
  const cheatArmRef = useRef({ taps: 0, lastTap: 0, armedUntil: 0 });
  const cheatSequenceRef = useRef<{ key: InputKey; time: number }[]>([]);
  const contentUnlockNoticeTimeoutRef = useRef<number | null>(null);
  const renderViewRef = useRef({ width: VIEW_W, height: VIEW_H, portrait: false });
  const frameTelemetryRef = useRef({ frames: 0, totalFrameMs: 0, totalUpdateMs: 0, totalDrawMs: 0, lastSampleAt: 0 });
  const benchmarkStartedAtRef = useRef(0);
  const benchmarkReportedRef = useRef(false);
  const gpuFrameMsRef = useRef<number | null>(null);
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
  const [frameTelemetry, setFrameTelemetry] = useState<{ fps: number; frameMs: number; updateMs: number; drawMs: number } | null>(null);
  const [showFrameTelemetry, setShowFrameTelemetry] = useState(true);
  const [mobileUltra120, setMobileUltra120] = useState(false);
  const [ultraUnlimited, setUltraUnlimited] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [mobileDevice, setMobileDevice] = useState(false);
  const [thermalProtection, setThermalProtection] = useState(false);
  const [desktopUltraScale, setDesktopUltraScale] = useState(1);
  const [quality, setQuality] = useState<Quality>("medium");
  const [renderResolution, setRenderResolution] = useState<RenderResolution>("1080p");
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
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>("standard");
  const [cosmeticLoadout, setCosmeticLoadout] = useState<CosmeticLoadout>({ style: 1, avatar: "robot", robotProfile: 0 });
  const [unlockedRobotProfiles, setUnlockedRobotProfiles] = useState<number[]>([1]);
  const [pendingChest, setPendingChest] = useState<Chest | null>(null);
  const [contentUnlockNotice, setContentUnlockNotice] = useState<string | null>(null);

  useEffect(() => () => {
    if (contentUnlockNoticeTimeoutRef.current !== null) {
      window.clearTimeout(contentUnlockNoticeTimeoutRef.current);
    }
  }, []);

  const syncHud = useCallback((world: World) => {
    setScore(world.score);
    setLives(world.lives);
    setSector(world.sector);
    setStatus(world.status);
  }, []);

  const showOverlayNotice = useCallback((message: string, duration: number) => {
    setContentUnlockNotice(message);
    if (contentUnlockNoticeTimeoutRef.current !== null) {
      window.clearTimeout(contentUnlockNoticeTimeoutRef.current);
    }
    contentUnlockNoticeTimeoutRef.current = window.setTimeout(() => {
      setContentUnlockNotice(null);
      contentUnlockNoticeTimeoutRef.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}images/bikini-avatar-compact.png`;
    image.onload = () => { bikiniAvatarImageRef.current = image; };
    return () => {
      bikiniAvatarImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const images = LEVEL_BACKDROP_FILES.map((file, index) => {
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}images/${file}`;
      image.onload = () => { levelBackdropImagesRef.current[index] = image; };
      return image;
    });
    return () => {
      void images;
      levelBackdropImagesRef.current = Array(LEVEL_BACKDROP_FILES.length).fill(null);
    };
  }, []);

  const ensureAudio = useCallback(() => {
    if (!soundEnabledRef.current && !musicEnabledRef.current) return;
    audioRef.current ??= createAudio();
    audioRef.current.setSoundEnabled(soundEnabledRef.current);
    if (musicEnabledRef.current) void audioRef.current.playMusic(worldRef.current.sector);
  }, []);

  const restart = useCallback(() => {
    const next = makeWorld();
    const variant = Math.floor((Date.now() / 1000 + selectedStartLevelRef.current) % 3);
    placeWorldAtLevel(next, selectedStartLevelRef.current, variant);
    // A manually started level is always a clean run. Never carry defensive
    // power-up state from a prior run, level transition, or showcase.
    next.player.shield = 0;
    next.player.shieldTime = 0;
    next.player.overdrive = 0;
    next.player.invulnerable = 0;
    next.player.damage = 0;
    const startingDifficulty = difficultiesRef.current[selectedStartLevelRef.current - 1] || "medium";
    setEnemyLayout(next, startingDifficulty);
    setBossLayout(next, startingDifficulty);
    setGuardianIntegrity(next, startingDifficulty);
    setChestLayout(next, startingDifficulty);
    addDestructibleWalls(next, startingDifficulty);
    addDoubleDecks(next, startingDifficulty);
    setPhaseBlockLayout(next, startingDifficulty);
    setMovingBlockLayout(next, startingDifficulty);
    if (startingDifficulty === "easy") applyEasyAssists(next);
    next.player.pickaxePower = pickaxeLoadoutRef.current.power;
    next.player.pickaxeStyle = pickaxeLoadoutRef.current.style;
    next.player.avatar = avatarRef.current;
    const startedRobotProfile = selectedStartLevelRef.current;
    setUnlockedRobotProfiles((current) => {
      if (current.includes(startedRobotProfile)) return current;
      const updated = [...current, startedRobotProfile].sort((a, b) => a - b);
      setStoredItem("skybreak-unlocked-robot-profiles", JSON.stringify(updated));
      return updated;
    });
    next.status = "playing";
    next.powerUpMessage = challengeRef.current === "noDamage" ? (isDe ? "CHALLENGE // OHNE TREFFER" : "CHALLENGE // NO DAMAGE") : challengeRef.current === "scoreRush" ? (isDe ? "CHALLENGE // 15.000 PUNKTE" : "CHALLENGE // 15,000 SCORE") : `VARIANTE ${variant + 1}/3`;
    next.powerUpMessageTime = 2.2;
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
  }, [isDe, syncHud]);

  const chooseChestReward = useCallback((kind: PowerUpKind) => {
    const chest = pendingChest;
    const world = worldRef.current;
    if (!chest || world.status !== "chestChoice") return;
    chest.opened = true;
    if (chest === world.roamingChest || chest === world.roamingChestSecondary) {
      world.collectedRoamingChestCounts[world.sector - 1] += 1;
      if (chest === world.roamingChest) {
        world.roamingChest = null;
        world.roamingChestTimer = 0;
      } else {
        world.roamingChestSecondary = null;
        world.roamingChestSecondaryTimer = 0;
      }
    }
    const difficultyKey = difficultiesRef.current[world.sector - 1] || "medium";
    const difficulty = DIFFICULTY_SETTINGS[difficultyKey];
    const reward = applyPowerUp(kind, { lives: world.lives, shield: world.player.shield, overdrive: world.player.overdrive, invulnerable: world.player.invulnerable, damage: world.player.damage, score: world.score }, difficulty.score);
    const roamingBonus = chest.roaming === true;
    if (roamingBonus) {
      if (kind === "score" || kind === "jackpot") {
        reward.score += reward.awardedScore;
        reward.awardedScore *= 2;
      } else if (kind === "overdrive") {
        reward.overdrive = Math.max(reward.overdrive, 24);
      } else if (kind === "phase") {
        reward.invulnerable = Math.max(reward.invulnerable, 14);
      } else if (kind === "life" && reward.message === "life") {
        reward.lives = Math.min(5, reward.lives + 1);
      }
    }
    world.lives = reward.lives; world.score = reward.score; world.player.shield = reward.shield; world.player.overdrive = reward.overdrive; world.player.invulnerable = reward.invulnerable; world.player.damage = reward.damage;
    const shieldSeconds = SHIELD_DURATION_SECONDS[difficultyKey];
    const shieldHits = SHIELD_HIT_CAPACITY[difficultyKey];
    const appliedShieldSeconds = roamingBonus ? shieldSeconds * 2 : shieldSeconds;
    if ((reward.message === "shield" || reward.message === "repair") && world.player.shield > 0) {
      world.player.shield = shieldHits;
      world.player.shieldTime = appliedShieldSeconds;
    }
    world.powerUpMessage = reward.message === "shield" ? (isDe ? `SCHUTZSCHILD // ${shieldHits} TREFFER // ${appliedShieldSeconds} SEKUNDEN` : `SHIELD // ${shieldHits} HITS // ${appliedShieldSeconds} SECONDS`) : reward.message === "life" ? (isDe ? (roamingBonus ? "2 EXTRALeben ERHALTEN" : "EXTRALEBEN ERHALTEN") : (roamingBonus ? "2 EXTRA LIVES ACQUIRED" : "EXTRA LIFE ACQUIRED")) : reward.message === "life-full" ? `${isDe ? "LEBEN VOLL" : "LIVES FULL"} // +${reward.awardedScore}` : reward.message === "score" ? `${isDe ? "DATENBONUS" : "DATA BONUS"} // +${reward.awardedScore}` : reward.message === "jackpot" ? `${isDe ? "JACKPOT" : "JACKPOT"} // +${reward.awardedScore}` : reward.message === "repair" ? (isDe ? `REPARATUR + SCHILD // ${shieldHits} TREFFER // ${appliedShieldSeconds} SEKUNDEN` : `REPAIR + SHIELD // ${shieldHits} HITS // ${appliedShieldSeconds} SECONDS`) : reward.message === "phase" ? (isDe ? `PHASENPANZERUNG // ${roamingBonus ? 14 : 7} SEKUNDEN` : `PHASE ARMOR // ${roamingBonus ? 14 : 7} SECONDS`) : (isDe ? `EISPICKEL-OVERDRIVE // ${roamingBonus ? 24 : 12} SEKUNDEN` : `ICE PICK OVERDRIVE // ${roamingBonus ? 24 : 12} SECONDS`);
    world.powerUpMessageTime = 2.5; world.shake = 5; world.status = "playing";
    audioRef.current?.powerUp();
    setPendingChest(null); syncHud(world);
  }, [isDe, pendingChest, syncHud]);

  useEffect(() => {
    if (!benchmarkMode) return;
    const timer = window.setTimeout(() => {
      benchmarkStartedAtRef.current = performance.now();
      restart();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [benchmarkMode, restart]);

  useEffect(() => {
    if (!benchmarkMode || !frameTelemetry || benchmarkReportedRef.current) return;
    if (performance.now() - benchmarkStartedAtRef.current < 12000) return;
    benchmarkReportedRef.current = true;
    void fetch("http://127.0.0.1:5174/result", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        browser: navigator.userAgent.includes("Firefox") ? "Firefox" : navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome") ? "Safari" : "Other",
        variant: benchmarkVariant,
        ...frameTelemetry,
      }),
    });
  }, [benchmarkMode, frameTelemetry]);

  const chooseStartLevel = useCallback((level: number) => {
    const next = Math.min(unlockedLevelRef.current, Math.max(1, Math.round(level)));
    selectedStartLevelRef.current = next;
    setSelectedStartLevel(next);
  }, []);

  const unlockRobotProfile = useCallback((level: number) => {
    const profile = Math.min(LEVEL_COUNT, Math.max(1, Math.round(level)));
    setUnlockedRobotProfiles((current) => {
      if (current.includes(profile)) return current;
      const updated = [...current, profile].sort((a, b) => a - b);
      setStoredItem("skybreak-unlocked-robot-profiles", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveCosmeticLoadout = useCallback((next: CosmeticLoadout) => {
    pickaxeLoadoutRef.current = { ...pickaxeLoadoutRef.current, style: next.style };
    avatarRef.current = next.avatar;
    robotProfileRef.current = next.robotProfile;
    setPickaxeStats((current) => ({ ...current, style: next.style }));
    setCosmeticLoadout(next);
    setStoredItem("skybreak-cosmetic-loadout", JSON.stringify(next));
  }, []);

  const unlockAllContent = useCallback(() => {
    const allProfiles = Array.from({ length: LEVEL_COUNT }, (_, index) => index + 1);
    unlockedLevelRef.current = LEVEL_COUNT;
    setUnlockedLevel(LEVEL_COUNT);
    setStoredItem("skybreak-unlocked-level", String(LEVEL_COUNT));
    setUnlockedRobotProfiles(allProfiles);
    setStoredItem("skybreak-unlocked-robot-profiles", JSON.stringify(allProfiles));
    const world = worldRef.current;
    world.cheatUsed = true;
    const message = isDe
      ? "CHEAT BESTÄTIGT // ALLE LEVEL, ROBOTER UND HOLOGRAMM-AVATAR FREIGESCHALTET"
      : "CHEAT CONFIRMED // ALL LEVELS, ROBOTS, AND HOLOGRAM AVATAR UNLOCKED";
    // The start menu covers the Canvas. There the dedicated HTML notice below
    // is the single visible confirmation; during play retain the Canvas callout.
    world.powerUpMessage = world.status === "playing" ? message : "";
    world.powerUpMessageTime = world.status === "playing" ? 4 : 0;
    world.shake = 5;
    showOverlayNotice(message, 4000);
    audioRef.current?.powerUp();
    syncHud(world);
  }, [isDe, showOverlayNotice, syncHud]);

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
    setStoredItem("skybreak-key-bindings", JSON.stringify(defaults));
  }, []);

  const applyPickaxeUpgrade = useCallback((kind: "power" | "style") => {
    const world = worldRef.current;
    if (world.status !== "upgrade") return;
    if (kind === "power") world.player.pickaxePower = Math.min(10, world.player.pickaxePower + 1);
    else world.player.pickaxeStyle = Math.min(10, world.player.pickaxeStyle + 1);
    pickaxeLoadoutRef.current = { power: world.player.pickaxePower, style: world.player.pickaxeStyle };
    setPickaxeStats({ power: world.player.pickaxePower, style: world.player.pickaxeStyle });
    if (world.sector < LEVEL_COUNT) {
      const nextSector = world.sector + 1;
      placeWorldAtLevel(world, nextSector, (world.variant + 1) % 3);
      unlockRobotProfile(nextSector);
      world.player.x = 463; world.player.y = 415; world.player.vx = 0; world.player.vy = 0; world.player.grounded = true;
      const nextDifficulty = difficultiesRef.current[nextSector - 1] || "medium";
      setEnemyLayout(world, nextDifficulty);
      setBossLayout(world, nextDifficulty);
      setGuardianIntegrity(world, nextDifficulty);
      setChestLayout(world, nextDifficulty);
      addDestructibleWalls(world, nextDifficulty);
      addDoubleDecks(world, nextDifficulty);
      setPhaseBlockLayout(world, nextDifficulty);
      setMovingBlockLayout(world, nextDifficulty);
      if (nextDifficulty === "easy") applyEasyAssists(world);
      world.status = "playing";
      world.powerUpMessage = isDe ? `VARIANTE ${world.variant + 1}/3 // LEVEL ${nextSector}` : `VARIANT ${world.variant + 1}/3 // LEVEL ${nextSector}`;
      world.powerUpMessageTime = 2;
      if (musicEnabledRef.current) void audioRef.current?.playMusic(world.sector);
    } else {
      world.status = "won";
    }
    world.lastTime = performance.now();
    syncHud(world);
  }, [isDe, syncHud, unlockRobotProfile]);

  const applyCheat = useCallback((cheat: CheatId) => {
    const world = worldRef.current;
    if (world.status !== "playing") return;
    world.cheatUsed = true;
    if (cheat === "immortal") {
      world.immortalSector = world.sector;
      world.powerUpMessage = isDe ? `CHEAT BESTÄTIGT // UNSTERBLICH IN LEVEL ${world.sector}` : `CHEAT CONFIRMED // IMMORTAL IN LEVEL ${world.sector}`;
    } else if (cheat === "shield") {
      const difficultyKey = difficultiesRef.current[world.sector - 1] || "medium";
      world.player.shield = SHIELD_HIT_CAPACITY[difficultyKey];
      const shieldSeconds = SHIELD_DURATION_SECONDS[difficultyKey];
      world.player.shieldTime = shieldSeconds;
      world.powerUpMessage = isDe ? `CHEAT BESTÄTIGT // DOPPELSCHILD ${shieldSeconds} SEKUNDEN` : `CHEAT CONFIRMED // DOUBLE SHIELD ${shieldSeconds} SECONDS`;
    } else if (cheat === "overdrive") {
      world.player.overdrive = Math.max(world.player.overdrive, 30);
      world.powerUpMessage = isDe ? "CHEAT BESTÄTIGT // OVERDRIVE 30 SEKUNDEN" : "CHEAT CONFIRMED // OVERDRIVE 30 SECONDS";
    } else {
      world.lives = Math.min(9, world.lives + 1);
      world.powerUpMessage = isDe ? "CHEAT BESTÄTIGT // EXTRALEBEN" : "CHEAT CONFIRMED // EXTRA LIFE";
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
    const forceProfileReset = sessionStorage.getItem("skybreak-profile-reset") === "1";
    const saved = Number(getStoredItem("neon-ascent-highscore") || 0);
    setHighScore(forceProfileReset ? 0 : saved);
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const storedQuality = getStoredItem("skybreak-quality") as Quality | null;
    const initialQuality = benchmarkQuality && benchmarkQuality in QUALITY_SETTINGS
      ? benchmarkQuality
      : storedQuality && storedQuality in QUALITY_SETTINGS
      ? storedQuality
      : coarsePointer ? "medium" : "high";
    qualityRef.current = initialQuality;
    setQuality(initialQuality);
    const initialUltraScale = 1;
    desktopUltraPerformanceRef.current = { scale: initialUltraScale, samples: 0, totalFrameMs: 0 };
    setDesktopUltraScale(initialUltraScale);
    const storedResolution = getStoredItem("skybreak-render-resolution") as RenderResolution | null;
    const initialResolution = benchmarkResolution && benchmarkResolution in RENDER_RESOLUTIONS
      ? benchmarkResolution
      : storedResolution && storedResolution in RENDER_RESOLUTIONS ? storedResolution : "1080p";
    renderResolutionRef.current = initialResolution;
    setRenderResolution(initialResolution);
    setMobileDevice(coarsePointer);
    setShowFrameTelemetry(getStoredItem("skybreak-show-fps") !== "false");
    const storedFrameRate = getStoredItem("skybreak-ultra-frame-rate") as FrameRateMode | null;
    const savedMobileUltra120 = storedFrameRate
      ? storedFrameRate === "120"
      : getStoredItem("skybreak-ultra-120") === null
        ? (getStoredItem("skybreak-mobile-ultra-120") === "true" || !coarsePointer)
        : getStoredItem("skybreak-ultra-120") === "true";
    const savedUnlimited = storedFrameRate === "unlimited";
    mobileUltra120Ref.current = savedMobileUltra120;
    ultraUnlimitedRef.current = savedUnlimited;
    setMobileUltra120(savedMobileUltra120);
    setUltraUnlimited(savedUnlimited);
    window.dispatchEvent(new Event("skybreak-quality"));
    const isIPhone = /iPhone|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIPhoneSafari(isIPhone && !isStandalone);
    try {
      const savedDifficulties = JSON.parse(getStoredItem("skybreak-level-difficulties") || "[]") as Difficulty[];
      if (savedDifficulties.length === LEVEL_COUNT && savedDifficulties.every((value) => value in DIFFICULTY_SETTINGS)) {
        difficultiesRef.current = savedDifficulties;
        setLevelDifficulties(savedDifficulties);
      }
    } catch {
      // Ignore malformed local settings and keep the balanced defaults.
    }
    try {
      const bindings = normalizeKeyBindings(JSON.parse(getStoredItem("skybreak-key-bindings") || "null"));
      keyBindingsRef.current = bindings;
      setKeyBindings(bindings);
    } catch {
      keyBindingsRef.current = { ...DEFAULT_KEY_BINDINGS };
    }
    const storedUnlockedLevel = forceProfileReset ? 1 : Number(getStoredItem("skybreak-unlocked-level") || 1);
    const savedUnlockedLevel = Number.isFinite(storedUnlockedLevel)
      ? Math.min(LEVEL_COUNT, Math.max(1, Math.round(storedUnlockedLevel)))
      : 1;
    unlockedLevelRef.current = savedUnlockedLevel;
    selectedStartLevelRef.current = savedUnlockedLevel;
    setUnlockedLevel(savedUnlockedLevel);
    setSelectedStartLevel(savedUnlockedLevel);
    try {
      const storedProfiles = forceProfileReset ? [1] : JSON.parse(getStoredItem("skybreak-unlocked-robot-profiles") || "[1]");
      const profiles = Array.isArray(storedProfiles)
        ? [...new Set(storedProfiles.filter((value): value is number => typeof value === "number" && value >= 1 && value <= LEVEL_COUNT).map(Math.round))].sort((a, b) => a - b)
        : [1];
      const availableProfiles = profiles.includes(1) ? profiles : [1, ...profiles].sort((a, b) => a - b);
      setUnlockedRobotProfiles(availableProfiles);
      const cosmetics = normalizeCosmeticLoadout(JSON.parse(getStoredItem("skybreak-cosmetic-loadout") || "null"), savedUnlockedLevel, availableProfiles);
      pickaxeLoadoutRef.current.style = cosmetics.style;
      avatarRef.current = cosmetics.avatar;
      robotProfileRef.current = cosmetics.robotProfile;
      setPickaxeStats((current) => ({ ...current, style: cosmetics.style }));
      setCosmeticLoadout(cosmetics);
    } catch {
      // Ignore malformed cosmetic storage and retain the default robot loadout.
    }
    if (forceProfileReset) {
      setStoredItem("skybreak-unlocked-level", "1");
      setStoredItem("skybreak-unlocked-robot-profiles", "[1]");
      setStoredItem("neon-ascent-highscore", "0");
      sessionStorage.removeItem("skybreak-profile-reset");
    }
  }, []);

  useEffect(() => {
    if (APP_BUILD_CHANNEL === "dev") return;
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
    const nextUltraScale = 1;
    desktopUltraPerformanceRef.current = { scale: nextUltraScale, samples: 0, totalFrameMs: 0 };
    setDesktopUltraScale(nextUltraScale);
    qualityRef.current = next;
    setQuality(next);
    setStoredItem("skybreak-quality", next);
    window.dispatchEvent(new Event("skybreak-quality"));
  };

  const chooseRenderResolution = (next: RenderResolution) => {
    renderResolutionRef.current = next;
    setRenderResolution(next);
    setStoredItem("skybreak-render-resolution", next);
    window.dispatchEvent(new Event("skybreak-quality"));
  };

  const chooseFrameRate = (next: FrameRateMode) => {
    mobileUltra120Ref.current = next === "120";
    ultraUnlimitedRef.current = next === "unlimited";
    setMobileUltra120(next === "120");
    setUltraUnlimited(next === "unlimited");
    setStoredItem("skybreak-ultra-frame-rate", next);
  };

  const finishInGameBenchmark = useCallback((world: World) => {
    const inGameBenchmark = inGameBenchmarkRef.current;
    if (!inGameBenchmark.active) return;
    inGameBenchmark.active = false;
    if (inGameBenchmarkTimeoutRef.current !== null) {
      window.clearTimeout(inGameBenchmarkTimeoutRef.current);
      inGameBenchmarkTimeoutRef.current = null;
    }
    const frames = Math.max(1, inGameBenchmark.frames);
    const measuredMs = Math.max(1, performance.now() - inGameBenchmark.startedAt - 2000);
    const frameRate: FrameRateMode = ultraUnlimitedRef.current ? "unlimited" : mobileUltra120Ref.current ? "120" : "60";
    setBenchmarkResult({
      fps: Math.round((frames * 1000) / measuredMs),
      frameMs: Math.round((inGameBenchmark.totalFrameMs / frames) * 10) / 10,
      updateMs: Math.round((inGameBenchmark.totalUpdateMs / frames) * 10) / 10,
      drawMs: Math.round((inGameBenchmark.totalDrawMs / frames) * 10) / 10,
      gpuMs: gpuFrameMsRef.current,
      quality: qualityRef.current,
      resolution: renderResolutionRef.current,
      frameRate,
    });
    world.showcaseBenchmark = false;
    world.showcaseLastBurst = -1;
    world.particles = [];
    world.status = "ready";
    world.powerUpMessage = isDe ? "SHOWCASE FERTIG // ERGEBNIS UNTEN" : "SHOWCASE COMPLETE // RESULT BELOW";
    world.powerUpMessageTime = 3;
    syncHud(world);
  }, [isDe, syncHud]);

  const startInGameBenchmark = useCallback(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    // A desktop-only, deterministic showcase: it uses the elemental core as
    // a base but never participates in normal level progress or high scores.
    const benchmarkLevel = 14;
    const next = makeWorld();
    placeWorldAtLevel(next, benchmarkLevel, 2);
    next.showcaseBenchmark = true;
    next.showcaseLastBurst = -1;
    next.player.pickaxePower = 10;
    next.player.pickaxeStyle = 10;
    next.player.avatar = "robot";
    next.player.shield = 99;
    next.enemies = next.enemies.concat(Array.from({ length: 38 }, (_, index) => ({
      x: 34 + ((index * 137) % 870),
      y: FLOOR_BASE_Y - 86 - ((index * 61) % 1180),
      vx: index % 2 ? 96 : -96,
      vy: 0,
      alive: true,
      grounded: false,
      kind: index % 6,
      attackTimer: .25 + (index % 5) * .12,
      frozen: 0,
    })));
    next.status = "playing";
    next.powerUpMessage = isDe ? "SHOWCASE BENCHMARK // 2 SEK. AUFWÄRMEN" : "SHOWCASE BENCHMARK // 2 SEC WARM-UP";
    next.powerUpMessageTime = 2;
    worldRef.current = next;
    inputRef.current = { left: false, right: false, jump: false, attack: false };
    pressedRef.current = { left: false, right: false, jump: false, attack: false };
    inGameBenchmarkRef.current = { active: true, startedAt: performance.now(), frames: 0, totalFrameMs: 0, totalUpdateMs: 0, totalDrawMs: 0 };
    gpuFrameMsRef.current = null;
    if (inGameBenchmarkTimeoutRef.current !== null) window.clearTimeout(inGameBenchmarkTimeoutRef.current);
    inGameBenchmarkTimeoutRef.current = window.setTimeout(() => {
      finishInGameBenchmark(worldRef.current);
    }, 32_750);
    setBenchmarkResult(null);
    syncHud(next);
  }, [finishInGameBenchmark, isDe, syncHud]);

  const chooseDifficulty = (next: Difficulty, level = sector) => {
    const updated = [...difficultiesRef.current];
    const levelIndex = Math.max(0, Math.min(LEVEL_COUNT - 1, level - 1));
    updated[levelIndex] = next;
    difficultiesRef.current = updated;
    setLevelDifficulties(updated);
    setStoredItem("skybreak-level-difficulties", JSON.stringify(updated));
    if (next === "easy" && worldRef.current.status === "playing" && worldRef.current.sector === level) {
      applyEasyAssists(worldRef.current);
      syncHud(worldRef.current);
    }
  };

  const getUltraSceneInstances = useCallback(() => {
    const world = worldRef.current;
    const view = renderViewRef.current;
    const instances: number[] = [];
    const add = (x: number, y: number, width: number, height: number, r: number, g: number, b: number, alpha: number) => {
      if (x < -0.1 || x > 1.1 || y < -0.1 || instances.length >= 34000 * 8) return;
      instances.push(x, y, width, height, r, g, b, alpha);
    };

    for (const tile of world.tiles) {
      if (!tile.alive || tile.x + TILE < world.cameraX - 72 || tile.x > world.cameraX + view.width + 72 || tile.y < world.cameraY - 80 || tile.y > world.cameraY + view.height + 60) continue;
      const effectHeight = tile.mode === "wall" ? TILE : 5;
      add(
        (tile.x - world.cameraX + TILE * 0.5) / view.width,
        (tile.y - world.cameraY + effectHeight * .5) / view.height,
        TILE / view.width,
        effectHeight / view.height,
        tile.cracked ? 0 : 1,
        tile.cracked ? 0.88 : 0.76,
        tile.cracked ? 1 : 0.18,
        0.2,
      );
    }
    for (const enemy of world.enemies) {
      if (!enemy.alive || enemy.x + 44 < world.cameraX - 72 || enemy.x > world.cameraX + view.width + 72 || enemy.y < world.cameraY - 70 || enemy.y > world.cameraY + view.height + 70) continue;
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
    // Medium keeps the reliable fixed chests from Easy and additionally gains
    // its roaming chest. Hard stays focused on the timed roaming reward.
    const ultraChests = [...world.chests];
    if (world.roamingChest) ultraChests.push(world.roamingChest);
    if (world.roamingChestSecondary) ultraChests.push(world.roamingChestSecondary);
    for (const chest of ultraChests) {
      if (chest.opened || chest.x + 42 < world.cameraX - 60 || chest.x > world.cameraX + view.width + 60 || chest.y < world.cameraY - 50 || chest.y > world.cameraY + view.height + 50) continue;
      add(
        (chest.x - world.cameraX + 19) / view.width,
        (chest.y - world.cameraY + 14) / view.height,
        48 / view.width,
        36 / view.height,
        chest.roaming ? 1 : 1,
        chest.roaming ? 0.12 : 0.62,
        chest.roaming ? 0.9 : 0.08,
        0.25,
      );
    }
    for (const particle of world.particles) {
      if (particle.x < world.cameraX - 72 || particle.x > world.cameraX + view.width + 72 || particle.y < world.cameraY - 50 || particle.y > world.cameraY + view.height + 50) continue;
      const [r, g, b] = colorChannels(particle.color);
      const size = particle.hazard === "laser" ? 92 : Math.max(8, (particle.size || (particle.hazard ? 10 : 5)) * 2.25);
      const height = particle.hazard === "laser" ? 12 : size;
      add(
        (particle.x - world.cameraX) / view.width,
        (particle.y - world.cameraY) / view.height,
        size / view.width,
        height / view.height,
        r,
        g,
        b,
        Math.min(0.58, Math.max(0.12, particle.life * (particle.blockExplosion ? 0.48 : 0.34))),
      );
    }
    const stressScene = world.showcaseBenchmark || (
      LOCAL_LEVEL_ONE_ULTRA_STRESS_TEST
      && world.status === "playing"
      && world.sector === 1
      && qualityRef.current === "ultra"
    );
    if (stressScene) {
      // GPU-only swarm: thousands of compact instanced glows with deterministic
      // movement. They exist solely in the desktop stress scene.
      const t = world.fxTime;
      const playerX = (world.player.x - world.cameraX + PLAYER_W / 2) / view.width;
      const playerY = (world.player.y - world.cameraY + PLAYER_H / 2) / view.height;
      for (let index = 0; index < 30000; index += 1) {
        const lane = index % 200;
        const band = Math.floor(index / 200);
        const drift = (t * (0.11 + (index % 7) * .013) + index * .618) % 1;
        let x = (lane + .5 + Math.sin(t * .9 + index) * .35) / 200;
        let y = (band + drift + Math.sin(t * 1.2 + lane) * .22) / 150;
        if (Math.abs(x - playerX) < .20 && Math.abs(y - playerY) < .28) {
          // Relocate rather than remove: the instance count and GPU workload
          // remain identical, while the player always has a readable window.
          x = playerX < .5 ? .79 + (index % 17) * .007 : .09 + (index % 17) * .007;
          y = playerY < .5 ? .76 + (index % 13) * .008 : .11 + (index % 13) * .008;
        }
        const size = .0018 + (index % 5) * .0008;
        const phase = index % 3;
        // Keep all 30,000 draws and blending operations, but do not let the
        // additive stress cloud hide the robot beneath the GPU overlay.
        add(x, y, size, size, phase === 0 ? 0 : 1, phase === 1 ? .12 : .82, phase === 2 ? 1 : .34, .008 + (index % 4) * .004);
      }
    }
    return new Float32Array(instances);
  }, []);

  useEffect(() => {
    const canvas = fxCanvasRef.current;
    const sourceCanvas = canvasRef.current;
    if (!canvas || !sourceCanvas) return;
    canvas.classList.remove("fx-ready");
    if (quality === "ultra") {
      ultraFallbackRef.current = false;
      const desktopMac = /Macintosh|Mac OS X/i.test(navigator.userAgent)
        && window.matchMedia("(pointer: fine)").matches;
      const firefox = /Firefox\//i.test(navigator.userAgent);
      // Keep Ultra visually identical across desktop browsers: detailed Canvas
      // sprites plus additive WebGPU object glows.
      const useGpuSceneInstances = benchmarkVariant === "instances-off"
        ? false
        : benchmarkVariant === "instances-on"
          ? true
          : true;
      let disposed = false;
      let cleanup: EffectCleanup | null = null;
      const startFallback = () => {
        ultraFallbackRef.current = true;
        const fallbackFps = firefox ? 30 : 40;
        ultraFpsRef.current = fallbackFps;
        setUltraFps(fallbackFps);
        window.dispatchEvent(new Event("skybreak-quality"));
        return startWebGlEffects(canvas, setRenderer, () => "medium", () => renderResolutionRef.current);
      };

      const startFullSceneRenderer = () => startWebGpuUltraRenderer(
            canvas,
            sourceCanvas,
            setRenderer,
            useGpuSceneInstances ? getUltraSceneInstances : () => new Float32Array(0),
            (nextFps) => {
              ultraFpsRef.current = nextFps;
              setUltraFps(nextFps);
            },
            () => ultraUnlimitedRef.current ? "unlimited" : mobileUltra120Ref.current ? "120" : "60",
            setThermalProtection,
            () => renderResolutionRef.current,
          );
      // Benchmark-only isolation: retain the identical Ultra Canvas scene
      // while omitting the transparent GPU compositor, so its actual cost can
      // be measured without asking the player to change settings.
      const gpuRenderer = benchmarkVariant === "effects-off"
        ? Promise.resolve<EffectCleanup>(() => setRenderer("CANVAS 2D"))
        : desktopMac
          ? startWebGpuEffects(
            canvas,
            setRenderer,
            useGpuSceneInstances ? getUltraSceneInstances : () => new Float32Array(0),
            () => renderResolutionRef.current,
            () => (
              worldRef.current.showcaseBenchmark || (
                LOCAL_LEVEL_ONE_ULTRA_STRESS_TEST
                && worldRef.current.status === "playing"
                && worldRef.current.sector === 1
                && qualityRef.current === "ultra"
              )
            ) ? 2.2 : [2, 7].includes(worldRef.current.sector) ? 0 : 1,
            (milliseconds) => { gpuFrameMsRef.current = milliseconds; },
          )
          : startFullSceneRenderer();

      void gpuRenderer
        .then((gpuCleanup) => {
          if (disposed) {
            gpuCleanup?.();
            return;
          }
          if (gpuCleanup) {
            cleanup = gpuCleanup;
          } else {
            cleanup = startFallback();
          }
        })
        .catch(() => {
          if (!disposed) {
            cleanup = startFallback();
          }
        });
      return () => {
        disposed = true;
        cleanup?.();
        ultraFallbackRef.current = false;
      };
    }
    ultraFallbackRef.current = false;
    if (quality === "low") {
      // Do not allocate a second GPU surface for a profile whose WebGL
      // effects are disabled. Resetting the transparent canvas also removes
      // a previously active Medium/High frame after switching down to Low.
      canvas.width = 1;
      canvas.height = 1;
      setRenderer("CANVAS 2D");
      return;
    }
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
      const settings = activeQualitySettings(qualityRef.current, ultraFallbackRef.current, mobileHighThermalRef.current.active);
      const frameInterval = 1000 / settings.glFps;
      if (time - lastGlFrame < frameInterval) {
        animation = requestAnimationFrame(render);
        return;
      }
      lastGlFrame = time;
      const rect = canvas.getBoundingClientRect();
      const dpr = cappedPixelRatio(rect, Math.min(window.devicePixelRatio || 1, settings.glDpr), renderResolutionRef.current);
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
      canvas.classList.add("fx-ready");
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
        setStoredItem("skybreak-key-bindings", JSON.stringify(updated));
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
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }) as CanvasRenderingContext2D;
    if (!ctx) return;

    let frame = 0;
    const view = renderViewRef.current;
    let staticBackdrop: HTMLCanvasElement | null = null;
    let staticBackdropKey = "";
    let staticOverlay: HTMLCanvasElement | null = null;
    let staticOverlayKey = "";
    let animatedBackdrop: HTMLCanvasElement | null = null;
    let animatedBackdropKey = "";
    let animatedBackdropUpdatedAt = 0;
    let mobileRainLayer: HTMLCanvasElement | null = null;
    let mobileRainKey = "";
    let mobileRainUpdatedAt = 0;
    let mobileFogLayer: HTMLCanvasElement | null = null;
    let mobileFogKey = "";
    let mobileFogUpdatedAt = 0;
    const platformSurfaceCache = new Map<string, HTMLCanvasElement>();
    const makeLayer = () => document.createElement("canvas");
    const drawStaticBackdrop = (theme: typeof LEVEL_THEMES[number]) => {
      const backdrop = levelBackdropImagesRef.current[theme.motif];
      const key = `${theme.name}:${Math.round(view.width)}:${Math.round(view.height)}:${backdrop?.complete ? "art" : "gradient"}`;
      if (key !== staticBackdropKey || !staticBackdrop) {
        staticBackdropKey = key;
        staticBackdrop = makeLayer();
        staticBackdrop.width = Math.max(1, Math.ceil(view.width));
        staticBackdrop.height = Math.max(1, Math.ceil(view.height));
        const layer = staticBackdrop.getContext("2d");
        if (layer) {
          const bg = layer.createLinearGradient(0, 0, 0, view.height);
          bg.addColorStop(0, theme.top);
          bg.addColorStop(0.48, theme.mid);
          bg.addColorStop(1, theme.bottom);
          layer.fillStyle = bg;
          layer.fillRect(0, 0, view.width, view.height);
          if (backdrop?.complete && backdrop.naturalWidth > 0) {
            const scale = Math.max(view.width / backdrop.naturalWidth, view.height / backdrop.naturalHeight);
            const width = backdrop.naturalWidth * scale;
            const height = backdrop.naturalHeight * scale;
            layer.globalAlpha = 1;
            layer.drawImage(backdrop, (view.width - width) / 2, (view.height - height) / 2, width, height);
            // Keep platforms readable in the center while retaining the deep city silhouette.
            const veil = layer.createLinearGradient(0, 0, 0, view.height);
            veil.addColorStop(0, "rgba(1,7,16,.05)");
            veil.addColorStop(.45, "rgba(2,10,22,.12)");
            veil.addColorStop(1, "rgba(0,4,12,.28)");
            layer.globalAlpha = 1;
            layer.fillStyle = veil;
            layer.fillRect(0, 0, view.width, view.height);
          }
        }
      }
      ctx.drawImage(staticBackdrop, 0, 0, view.width, view.height);
    };
    const drawStaticOverlay = () => {
      const key = `${Math.round(view.width)}:${Math.round(view.height)}`;
      if (key !== staticOverlayKey || !staticOverlay) {
        staticOverlayKey = key;
        staticOverlay = makeLayer();
        staticOverlay.width = Math.max(1, Math.ceil(view.width));
        staticOverlay.height = Math.max(1, Math.ceil(view.height));
        const layer = staticOverlay.getContext("2d");
        if (layer) {
          const vignette = layer.createRadialGradient(view.width / 2, view.height / 2, 150, view.width / 2, view.height / 2, Math.max(view.width, view.height) * 0.72);
          vignette.addColorStop(0.55, "rgba(0,0,0,0)");
          vignette.addColorStop(1, "rgba(0,0,0,.52)");
          layer.fillStyle = vignette;
          layer.fillRect(0, 0, view.width, view.height);
          layer.fillStyle = "rgba(255,255,255,.025)";
          for (let y = 0; y < view.height; y += 4) layer.fillRect(0, y, view.width, 1);
        }
      }
      ctx.drawImage(staticOverlay, 0, 0, view.width, view.height);
    };
    const drawCachedBackgroundAnimation = (world: World, theme: typeof LEVEL_THEMES[number], settings: ReturnType<typeof activeQualitySettings>) => {
      const now = performance.now();
      const mobile = window.matchMedia("(pointer: coarse)").matches;
      const interval = mobile ? 1000 / 18 : qualityRef.current === "ultra" ? 1000 / 24 : settings.layers >= 3 ? 1000 / 30 : 1000 / 20;
      const key = `${theme.motif}:${Math.round(view.width)}:${Math.round(view.height)}`;
      if (key !== animatedBackdropKey || !animatedBackdrop || now - animatedBackdropUpdatedAt >= interval) {
        animatedBackdropKey = key;
        animatedBackdropUpdatedAt = now;
        animatedBackdrop ??= makeLayer();
        const width = Math.max(1, Math.ceil(view.width));
        const height = Math.max(1, Math.ceil(view.height));
        if (animatedBackdrop.width !== width || animatedBackdrop.height !== height) {
          animatedBackdrop.width = width;
          animatedBackdrop.height = height;
        }
        const layer = animatedBackdrop.getContext("2d");
        if (layer) {
          layer.clearRect(0, 0, view.width, view.height);
          drawLevelBackgroundAnimation(layer, theme, view, world.fxTime, world.cameraX);
        }
      }
      ctx.drawImage(animatedBackdrop, 0, 0, view.width, view.height);
    };
    const mobileEffectInterval = (status: GameStatus) => status === "ready" ? 1000 / 12 : 1000 / 30;
    const drawMobileRain = (world: World, theme: typeof LEVEL_THEMES[number], settings: ReturnType<typeof activeQualitySettings>) => {
      const now = performance.now();
      const key = `${theme.name}:${Math.round(view.width)}:${Math.round(view.height)}:${settings.rain}`;
      if (key !== mobileRainKey || !mobileRainLayer || now - mobileRainUpdatedAt >= mobileEffectInterval(world.status)) {
        mobileRainKey = key;
        mobileRainUpdatedAt = now;
        mobileRainLayer ??= makeLayer();
        mobileRainLayer.width = Math.max(1, Math.ceil(view.width));
        mobileRainLayer.height = Math.max(1, Math.ceil(view.height));
        const layer = mobileRainLayer.getContext("2d");
        if (layer) {
          layer.clearRect(0, 0, view.width, view.height);
          layer.globalCompositeOperation = "screen";
          const rainCount = [0, 3, 7, 9].includes(theme.motif) ? settings.rain : 0;
          for (let i = 0; i < rainCount; i++) {
            const x = (i * 79 + (i % 7) * 23 - world.fxTime * 36) % (view.width + 80) - 40;
            const y = (i * 113 + world.fxTime * (280 + (i % 5) * 46)) % (view.height + 100) - 50;
            const length = 8 + (i % 6) * 3;
            const rain = layer.createLinearGradient(x, y, x - 3, y + length);
            rain.addColorStop(0, "rgba(120,240,255,0)");
            rain.addColorStop(1, i % 11 === 0 ? "rgba(255,77,166,.44)" : "rgba(122,231,255,.3)");
            layer.strokeStyle = rain;
            layer.lineWidth = i % 4 === 0 ? 1.2 : 0.65;
            layer.beginPath(); layer.moveTo(x, y); layer.lineTo(x - 3, y + length); layer.stroke();
          }
        }
      }
      ctx.drawImage(mobileRainLayer, 0, 0, view.width, view.height);
    };
    const drawMobileFog = (world: World, settings: ReturnType<typeof activeQualitySettings>) => {
      const now = performance.now();
      const key = `${Math.round(view.width)}:${Math.round(view.height)}:${settings.fog}`;
      if (key !== mobileFogKey || !mobileFogLayer || now - mobileFogUpdatedAt >= mobileEffectInterval(world.status)) {
        mobileFogKey = key;
        mobileFogUpdatedAt = now;
        mobileFogLayer ??= makeLayer();
        mobileFogLayer.width = Math.max(1, Math.ceil(view.width));
        mobileFogLayer.height = Math.max(1, Math.ceil(view.height));
        const layer = mobileFogLayer.getContext("2d");
        if (layer) {
          layer.clearRect(0, 0, view.width, view.height);
          layer.globalCompositeOperation = "screen";
          for (let i = 0; i < settings.fog; i++) {
            const fogY = ((world.fxTime * (9 + i * 3) + i * view.height * 0.29) % (view.height + 180)) - 90;
            const fog = layer.createLinearGradient(0, fogY - 45, 0, fogY + 45);
            fog.addColorStop(0, "rgba(0,0,0,0)");
            fog.addColorStop(0.5, i % 2 ? "rgba(255,43,138,.035)" : "rgba(0,240,255,.045)");
            fog.addColorStop(1, "rgba(0,0,0,0)");
            layer.fillStyle = fog;
            layer.fillRect(0, fogY - 45, view.width, 90);
          }
        }
      }
      ctx.drawImage(mobileFogLayer, 0, 0, view.width, view.height);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const settings = activeQualitySettings(qualityRef.current, ultraFallbackRef.current, mobileHighThermalRef.current.active);
      const ratio = cappedPixelRatio(
        rect,
        Math.min(window.devicePixelRatio || 1, settings.dpr),
        renderResolutionRef.current,
      ) * (qualityRef.current === "ultra" && !ultraFallbackRef.current && window.matchMedia("(pointer: fine)").matches
        ? desktopUltraPerformanceRef.current.scale
        : 1);
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

    const explodeDestroyedBlock = (world: World, tile: Tile, fallbackColor: string, fallbackAmount: number) => {
      const quality = qualityRef.current;
      const ultra = quality === "ultra" && !ultraFallbackRef.current;
      const desktopEffects = !window.matchMedia("(pointer: coarse)").matches;
      if (quality !== "high" && !ultra) {
        const particleCount = desktopEffects ? (quality === "medium" ? 30 : 20) : fallbackAmount;
        burst(world, tile.x + TILE / 2, tile.y + 12, fallbackColor, particleCount);
        return;
      }
      const theme = LEVEL_THEMES[Math.max(0, Math.min(LEVEL_THEMES.length - 1, world.sector - 1))];
      const style = BLOCK_EXPLOSION_STYLES[theme.motif];
      const count = ultra ? (desktopEffects ? 60 : 20) : (desktopEffects ? 50 : 10);
      const originX = tile.x + TILE / 2;
      const originY = tile.y + 12;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + (Math.random() - .5) * .38;
        const speed = (ultra ? 145 : 108) + Math.random() * (ultra ? 210 : 130);
        const size = (ultra ? 5 : 3.5) + Math.random() * (ultra ? 9 : 5);
        world.particles.push({
          x: originX + (Math.random() - .5) * 12,
          y: originY + (Math.random() - .5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (ultra ? 98 : 68),
          life: (ultra ? .56 : .38) + Math.random() * (ultra ? .36 : .24),
          color: index % 3 === 0 ? theme.warning : index % 2 ? theme.accent : theme.secondary,
          blockExplosion: style,
          size,
          rotation: style === "energy-bolt" ? angle : Math.random() * Math.PI * 2,
          spin: (Math.random() - .5) * (ultra ? 16 : 10),
        });
      }
      // Ultra gets a compact bright core, while High uses just the material fragments.
      if (ultra) {
        for (let index = 0; index < (desktopEffects ? 10 : 4); index += 1) {
          const angle = index * Math.PI / 2 + Math.random() * .35;
          world.particles.push({
            x: originX,
            y: originY,
            vx: Math.cos(angle) * (230 + Math.random() * 75),
            vy: Math.sin(angle) * (230 + Math.random() * 75),
            life: .24 + Math.random() * .12,
            color: theme.warning,
            blockExplosion: style === "energy-bolt" ? "energy-bolt" : "solar-ray",
            size: 14 + Math.random() * 7,
            rotation: angle,
            spin: 0,
          });
        }
      }
    };

    const hurt = (world: World) => {
      const p = world.player;
      // The in-game benchmark must retain a constant workload and must not
      // end early because a random hazard touched the stationary player.
      if (inGameBenchmarkRef.current.active) return;
      // On a very shallow desktop fullscreen canvas, `view.height - 130` can
      // become negative. Keep a respawn position inside the visible play area.
      const respawnY = world.cameraY + Math.max(PLAYER_H + 28, Math.min(410, view.height - 130));
      if (p.invulnerable > 0) return;
      if (challengeRef.current === "noDamage") {
        world.status = "gameover";
        world.powerUpMessage = isDe ? "CHALLENGE GESCHEITERT // TREFFER" : "CHALLENGE FAILED // HIT";
        world.powerUpMessageTime = 2;
        setStatus("gameover");
        syncHud(world);
        return;
      }
      if (world.immortalSector === world.sector) {
        if (p.y > world.cameraY + view.height + 100) {
          p.x = 463;
          p.y = respawnY;
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
        if (p.shield <= 0) p.shieldTime = 0;
        p.invulnerable = 0.8;
        world.shake = 8;
        world.powerUpMessage = isDe ? "SCHUTZSCHILD HAT DEN TREFFER ABGEFANGEN" : "SHIELD ABSORBED THE HIT";
        world.powerUpMessageTime = 1.8;
        audioRef.current?.shield();
        burst(world, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, "#72ffef", 22);
        return;
      }
      world.lives -= 1;
      p.damage = Math.min(3, p.damage + 1);
      world.shake = 18;
      audioRef.current?.hit();
      burst(world, p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, "#ff2b8a", 18);
      if (world.lives <= 0) {
        world.status = "gameover";
        setStatus("gameover");
        if (!world.cheatUsed) {
          const best = Math.max(world.score, Number(getStoredItem("neon-ascent-highscore") || 0));
          setStoredItem("neon-ascent-highscore", String(best));
          setHighScore(best);
        }
      } else {
        p.x = 463;
        p.y = respawnY;
        p.vx = 0;
        p.vy = -280;
        p.invulnerable = (difficultiesRef.current[Math.max(0, world.sector - 1)] || "medium") === "easy" ? 3.5 : 2;
      }
      syncHud(world);
    };

    const update = (world: World, dt: number) => {
      if (world.status === "celebration" || world.status === "bikiniShowcase") {
        world.fxTime += dt;
        world.celebrationTime = Math.max(0, world.celebrationTime - dt);
        if (world.celebrationTime === 0) {
          world.status = world.celebrationTarget;
          world.victoryTime = world.celebrationTarget === "won" ? 0.01 : 0;
          audioRef.current?.win();
          syncHud(world);
        }
        return;
      }
      if (world.status !== "playing") return;
      const difficultyLevel = inGameBenchmarkRef.current.active
        ? "medium"
        : difficultiesRef.current[Math.max(0, world.sector - 1)] || "medium";
      const difficulty = DIFFICULTY_SETTINGS[difficultyLevel];
      world.fxTime += dt;
      world.transition = Math.max(0, world.transition - dt);
      world.shake = Math.max(0, world.shake - dt * 38);
      const p = world.player;
      const input = inputRef.current;
      const pressed = pressedRef.current;
      if (world.showcaseBenchmark) {
        // A self-contained route keeps the robot visible while avoiding normal
        // collisions, level completion and hazards during the stress test.
        const elapsed = Math.max(0, world.fxTime - 2);
        const cameraTravel = Math.min(-(WORLD_TOP + 150), elapsed * 29);
        world.cameraY = -cameraTravel;
        const wave = Math.sin(elapsed * 2.15);
        p.x = 76 + ((elapsed * 128) % 790);
        p.y = world.cameraY + Math.max(94, Math.min(view.height - 112, view.height * .58)) - PLAYER_H + wave * 10;
        p.vx = Math.cos(elapsed * 2.15) * 128;
        p.vy = 0;
        p.grounded = false;
        p.facing = p.vx >= 0 ? 1 : -1;
        p.overdrive = 99;
        input.left = false;
        input.right = false;
        input.jump = false;
        input.attack = false;
        const burstStep = Math.floor(elapsed * 4.5);
        if (elapsed >= 0 && burstStep !== world.showcaseLastBurst) {
          world.showcaseLastBurst = burstStep;
          const targetY = p.y + 42 - ((burstStep % 3) * 24);
          const target = world.tiles
            .filter((tile) => tile.alive && tile.cracked)
            .sort((a, b) => Math.abs(a.y - targetY) + Math.abs(a.x - p.x) - (Math.abs(b.y - targetY) + Math.abs(b.x - p.x)))[0];
          if (target) {
            target.alive = false;
            world.score += 180;
            world.shake = Math.max(world.shake, 9);
            explodeDestroyedBlock(world, target, themeColor(world.sector, "accent"), 30);
            burst(world, target.x + TILE / 2, target.y + 12, themeColor(world.sector, "warning"), 34);
          }
          p.attack = .22;
        }
        // Preserve visible enemy activity without allowing any enemy collision
        // or objective state to interfere with the benchmark route.
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue;
          enemy.x += enemy.vx * dt;
          if (enemy.x < 18) {
            enemy.x = 18;
            enemy.vx = Math.abs(enemy.vx);
          } else if (enemy.x > VIEW_W - 54) {
            enemy.x = VIEW_W - 54;
            enemy.vx = -Math.abs(enemy.vx);
          }
        }
        for (const tile of world.tiles) {
          if (tile.mode === "moving") tile.x = tile.baseX + Math.sin(world.fxTime * tile.speed + tile.phaseOffset) * tile.travel;
        }
        for (const particle of world.particles) {
          particle.life -= dt;
          if (particle.hazard !== "laser") particle.vy += 560 * dt;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          if (particle.spin) particle.rotation = (particle.rotation || 0) + particle.spin * dt;
        }
        world.particles = world.particles.filter((particle) => particle.life > 0);
        return;
      }
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      p.shieldTime = Math.max(0, p.shieldTime - dt);
      if (p.shieldTime <= 0) p.shield = 0;
      p.attack = Math.max(0, p.attack - dt);
      p.overdrive = Math.max(0, p.overdrive - dt);
      world.powerUpMessageTime = Math.max(0, world.powerUpMessageTime - dt);
      world.mechanicCooldown = Math.max(0, world.mechanicCooldown - dt);
      world.bridgeCooldown = Math.max(0, world.bridgeCooldown - dt);

      for (const tile of world.tiles) {
        tile.previousX = tile.x;
        if (tile.mode === "moving") tile.x = tile.baseX + Math.sin(world.fxTime * tile.speed + tile.phaseOffset) * tile.travel;
        if (tile.temporaryLife !== undefined) {
          tile.temporaryLife -= dt;
          if (tile.temporaryLife <= 0) tile.alive = false;
        }
      }

      if (world.roamingChestSector !== world.sector) {
        world.roamingChest = null;
        world.roamingChestTimer = 0;
        world.roamingChestSecondary = null;
        world.roamingChestSecondaryTimer = 0;
        world.roamingChestMoves = 0;
        world.roamingChestSector = world.sector;
      }
      if (difficultyLevel === "easy") {
        world.roamingChest = null;
        world.roamingChestTimer = 0;
        world.roamingChestSecondary = null;
        world.roamingChestSecondaryTimer = 0;
      } else {
        const roamingDifficulty = difficultyLevel as RoamingChestDifficulty;
        const rules = ROAMING_CHEST_RULES[roamingDifficulty];
        const unlocked = levelProgress(p.y) >= rules.unlockProgress;
        const collected = world.collectedRoamingChestCounts[world.sector - 1];
        if (collected >= rules.count) {
          world.roamingChest = null;
          world.roamingChestTimer = 0;
          world.roamingChestSecondary = null;
          world.roamingChestSecondaryTimer = 0;
        } else if (unlocked) {
          const activeRoamingCount = (world.roamingChest ? 1 : 0) + (world.roamingChestSecondary ? 1 : 0);
          if (!world.roamingChest && collected + activeRoamingCount < rules.count) {
            placeRoamingChest(world, roamingDifficulty, renderViewRef.current.height, "primary");
          }
          if (rules.count > 1 && !world.roamingChestSecondary && collected + (world.roamingChest ? 1 : 0) < rules.count) {
            placeRoamingChest(world, roamingDifficulty, renderViewRef.current.height, "secondary");
          }
          if (world.roamingChest) {
          world.roamingChestTimer -= dt;
          if (world.roamingChestTimer <= 0) {
            world.roamingChestMoves += 1;
              const movedBelow = placeRoamingChest(world, roamingDifficulty, renderViewRef.current.height, "primary");
            if (movedBelow) {
              world.powerUpMessage = isDe ? "TRUHE UNTER DIR NEU GEORTET" : "CHEST RELOCATED BELOW";
              world.powerUpMessageTime = 1.5;
            }
          }
          }
          if (world.roamingChestSecondary) {
            world.roamingChestSecondaryTimer -= dt;
            if (world.roamingChestSecondaryTimer <= 0) {
              world.roamingChestMoves += 1;
              const movedBelow = placeRoamingChest(world, roamingDifficulty, renderViewRef.current.height, "secondary");
              if (movedBelow) {
                world.powerUpMessage = isDe ? "TRUHE UNTER DIR NEU GEORTET" : "CHEST RELOCATED BELOW";
                world.powerUpMessageTime = 1.5;
              }
            }
          }
        }
      }

      const standingTile = world.tiles.find((tile) => tileIsActive(tile, world.fxTime)
        && p.x + PLAYER_W - 7 > tile.x && p.x + 7 < tile.x + TILE && Math.abs(p.y + PLAYER_H - tile.y) < 5);
      if (standingTile?.mode === "moving") p.x += standingTile.x - standingTile.previousX;
      const glide = standingTile?.mode === "ice" ? 0.08 : 0.002;
      p.vx = input.left ? -MOVE_SPEED : input.right ? MOVE_SPEED : p.vx * Math.pow(glide, dt);
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

      const oldX = p.x;
      const oldY = p.y;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -PLAYER_W) p.x = VIEW_W;
      if (p.x > VIEW_W) p.x = -PLAYER_W;
      p.grounded = false;

      for (const tile of world.tiles) {
        if (!tileIsActive(tile, world.fxTime)) continue;
        if (tile.mode === "wall") {
          const overlapsY = p.y + PLAYER_H - 5 > tile.y && p.y + 5 < tile.y + TILE;
          if (overlapsY && p.vx > 0 && oldX + PLAYER_W <= tile.x + 3 && p.x + PLAYER_W >= tile.x) {
            p.x = tile.x - PLAYER_W;
            p.vx = 0;
          } else if (overlapsY && p.vx < 0 && oldX >= tile.x + TILE - 3 && p.x <= tile.x + TILE) {
            p.x = tile.x + TILE;
            p.vx = 0;
          }
        }
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
          // The lower part of a double deck catches the upward momentum so
          // the upper deck requires a deliberate second jump to break.
          p.vy = tile.doubleDeck === "lower" ? 0 : p.vy * .78;
          world.score += Math.round(100 * difficulty.score);
          explodeDestroyedBlock(world, tile, themeColor(world.sector, "accent"), 12);
          audioRef.current?.smash();
          syncHud(world);
        }
      }

      for (const objective of world.objectives) {
        if (!objective.active || objective.kind !== "cell") continue;
        if (p.x + PLAYER_W > objective.x && p.x < objective.x + 22 && p.y + PLAYER_H > objective.y && p.y < objective.y + 26) {
          objective.active = false;
          world.score += Math.round(350 * difficulty.score);
          world.powerUpMessage = isDe ? "ENERGIEZELLE GESICHERT" : "ENERGY CELL SECURED";
          world.powerUpMessageTime = 1.3;
          burst(world, objective.x + 11, objective.y + 13, themeColor(world.sector, "warning"), 16);
          audioRef.current?.powerUp();
          syncHud(world);
        }
      }

      if (p.grounded && world.mechanicCooldown <= 0) {
        const riftTiles = world.tiles.filter((tile) => tile.mode === "rift" && tileIsActive(tile, world.fxTime));
        const standingRift = riftTiles.find((tile) => p.x + PLAYER_W - 7 > tile.x && p.x + 7 < tile.x + TILE && Math.abs(p.y + PLAYER_H - tile.y) < 5);
        if (standingRift && riftTiles.length > 1) {
          const from = riftTiles.indexOf(standingRift);
          const destination = riftTiles[(from + 2) % riftTiles.length];
          p.x = destination.x + (TILE - PLAYER_W) / 2;
          p.y = destination.y - PLAYER_H - 3;
          p.vy = -165;
          p.grounded = false;
          world.mechanicCooldown = 1.1;
          world.powerUpMessage = isDe ? "RIFT-SPRUNG" : "RIFT JUMP";
          world.powerUpMessageTime = 1;
          burst(world, standingRift.x + TILE / 2, standingRift.y + 12, themeColor(world.sector, "secondary"), 14);
          burst(world, destination.x + TILE / 2, destination.y + 12, themeColor(world.sector, "accent"), 14);
        }
      }

      const collectableChests = [...world.chests, ...(world.roamingChest ? [world.roamingChest] : []), ...(world.roamingChestSecondary ? [world.roamingChestSecondary] : [])];
      for (const chest of collectableChests) {
        if (chest.opened) continue;
        const intersects = p.x + PLAYER_W > chest.x
          && p.x < chest.x + 38
          && p.y + PLAYER_H > chest.y
          && p.y < chest.y + 30;
        if (!intersects) continue;
        world.status = "chestChoice";
        setPendingChest(chest);
        syncHud(world);
        break;
      }

      if (p.attack > 0) {
        const attackX = p.x + (p.facing > 0 ? PLAYER_W - 2 : -28);
        for (const objective of world.objectives) {
          if (!objective.active || objective.kind !== "switch") continue;
          if (Math.abs(objective.x - attackX) < 58 && Math.abs(objective.y - p.y) < 64) {
            objective.active = false;
            world.score += Math.round(350 * difficulty.score);
            world.powerUpMessage = isDe ? "ZUGANGSSCHALTER AKTIV" : "ACCESS SWITCH ACTIVE";
            world.powerUpMessageTime = 1.3;
            burst(world, objective.x + 11, objective.y + 13, themeColor(world.sector, "accent"), 16);
            audioRef.current?.powerUp();
            syncHud(world);
          }
        }
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue;
          if (Math.abs(enemy.x - attackX) < (enemy.guardian ? 62 : 48) && Math.abs(enemy.y - p.y) < (enemy.guardian ? 64 : 50)) {
            if (enemy.guardian) {
              enemy.integrity = Math.max(0, (enemy.integrity ?? 1) - 1);
              enemy.alive = enemy.integrity > 0;
              world.powerUpMessage = enemy.alive
                ? (isDe ? `WÄCHTER-INTEGRITÄT ${enemy.integrity}/${enemy.integrityMax ?? 5}` : `GUARDIAN INTEGRITY ${enemy.integrity}/${enemy.integrityMax ?? 5}`)
                : (isDe ? "WÄCHTER NEUTRALISIERT" : "GUARDIAN NEUTRALIZED");
              world.powerUpMessageTime = 1.4;
              world.shake = Math.max(world.shake, 11);
              burst(world, enemy.x + 18, enemy.y + 16, themeColor(world.sector, "warning"), 24);
            } else if (enemy.kind === 4 && (enemy.integrity ?? 2) > 1) {
              enemy.integrity = (enemy.integrity ?? 2) - 1;
              enemy.frozen = 0.5;
              world.powerUpMessage = isDe ? "SCHILD GEBROCHEN" : "SHIELD BROKEN";
              world.powerUpMessageTime = 0.8;
              burst(world, enemy.x + 18, enemy.y + 16, themeColor(world.sector, "warning"), 12);
            } else if (enemy.frozen <= 0) {
              enemy.frozen = 2.2;
              enemy.vx = p.facing * 180;
              world.powerUpMessage = isDe ? "KRIO-FROST" : "CRYO FREEZE";
              world.powerUpMessageTime = 1.2;
              burst(world, enemy.x + 18, enemy.y + 16, "#72ffef", 20);
            } else {
              enemy.alive = false;
              world.score += Math.round(250 * difficulty.score);
              burst(world, enemy.x + 18, enemy.y + 16, "#ffd84d", 14);
            }
            audioRef.current?.enemy();
            syncHud(world);
          }
        }
        if (startedAttack) {
          const effectivePower = Math.min(10, p.pickaxePower + (p.overdrive > 0 ? 3 : 0));
          const reach = 42 + effectivePower * 8;
          const breakCount = pickaxeBreakCount(effectivePower);
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
            explodeDestroyedBlock(world, tile, themeColor(world.sector, "secondary"), 7 + effectivePower);
            audioRef.current?.smash();
            syncHud(world);
          }
          const frozenProjectiles = world.particles.filter((particle) => particle.hazard && Math.abs(particle.x - attackX) < reach && Math.abs(particle.y - (p.y + 20)) < 52);
          for (const particle of frozenProjectiles) {
            particle.life = 0;
            burst(world, particle.x, particle.y, "#72ffef", 5);
          }
          if (!p.grounded && effectivePower >= 4 && world.bridgeCooldown <= 0) {
            const bridgeX = Math.max(0, Math.min(VIEW_W - TILE, p.x + p.facing * 48));
            const bridgeY = Math.min(FLOOR_BASE_Y - 30, p.y + PLAYER_H + 34);
            world.tiles.push({ x: bridgeX, y: bridgeY, alive: true, cracked: false, mode: "bridge", phaseOffset: 0, baseX: bridgeX, travel: 0, speed: 0, previousX: bridgeX, temporaryLife: 4.2 });
            world.bridgeCooldown = 4.5;
            world.powerUpMessage = isDe ? "EISBRÜCKE // 4 SEKUNDEN" : "ICE BRIDGE // 4 SECONDS";
            world.powerUpMessageTime = 1;
            burst(world, bridgeX + TILE / 2, bridgeY + 12, "#72ffef", 14);
          }
        }
      }

      world.enemyShotCooldown = Math.max(0, world.enemyShotCooldown - dt);
      for (const enemy of world.enemies) {
        if (!enemy.alive) continue;
        const enemyOldY = enemy.y;
        const enemyArchetype = (enemy.kind + world.sector - 1) % 3;
        enemy.frozen = Math.max(0, enemy.frozen - dt);
        enemy.bombTimer = Math.max(0, (enemy.bombTimer ?? 0) - dt);
        if (enemy.frozen > 0) continue;
        enemy.attackTimer -= dt;
        if (enemy.guardian && enemy.canFire !== false && enemy.attackTimer <= 0) {
          const guardianMaxIntegrity = enemy.integrityMax ?? 5;
          const bossPhase = guardianMaxIntegrity - (enemy.integrity ?? guardianMaxIntegrity);
          enemy.attackTimer = (difficultyLevel === "easy" ? 2.6 : 1) * Math.max(1.15, 2.2 - bossPhase * 0.24);
          const shotCount = difficultyLevel === "easy" ? 1 : Math.min(5, 1 + Math.floor(bossPhase / 2));
          for (let shot = 0; shot < shotCount; shot += 1) {
            const direction = shotCount === 1 ? Math.sign(p.x - enemy.x) || 1 : shot - (shotCount - 1) / 2;
            world.particles.push({
              x: enemy.x + 19,
              y: enemy.y + 8,
              vx: direction * (110 + bossPhase * 18) * (difficultyLevel === "easy" ? 0.45 : 1),
              vy: -32 + shot * 34,
              life: 3.2,
              color: themeColor(world.sector, "warning"),
              hazard: "boss",
              hazardStyle: "energy-bolt",
              size: 8,
            });
          }
          // Only the designated guardian(s) throw bombs. They need a long
          // independent cooldown, so their normal firing rhythm never turns
          // into an unavoidable bomb stream.
          if (enemy.canThrowBombs && (enemy.bombTimer ?? 0) <= 0) {
            enemy.bombTimer = difficultyLevel === "hard" ? 4.8 : 6.5;
            const bombDirection = Math.sign(p.x - enemy.x) || 1;
            world.particles.push({
              x: enemy.x + 19,
              y: enemy.y + 8,
              vx: bombDirection * 110,
              vy: -225 - Math.min(90, bossPhase * 14),
              life: 3.8,
              color: themeColor(world.sector, "secondary"),
              hazard: "boss",
              hazardStyle: "magma-burst",
              size: 15,
              rotation: Math.random() * Math.PI * 2,
              spin: bombDirection * 5,
            });
          }
          burst(world, enemy.x + 19, enemy.y + 12, themeColor(world.sector, "warning"), 10 + world.sector);
        } else if (!enemy.guardian && enemy.canShoot && enemy.attackTimer <= 0
          && (difficultyLevel === "easy" || (world.enemyShotCooldown <= 0 && enemy.shooterSlot === world.nextEnemyShooterSlot))) {
          enemy.attackTimer = 1.65 + (enemy.kind === 5 ? .25 : 0);
          if (difficultyLevel !== "easy") {
            // Prevent the expanded Medium/Hard patrol from synchronising all
            // shooters into a single unavoidable volley.
            world.enemyShotCooldown = difficultyLevel === "hard" ? 5 : 7;
            const shooterCount = world.enemies.filter((candidate) => candidate.alive && !candidate.guardian && candidate.canShoot).length;
            world.nextEnemyShooterSlot = (world.nextEnemyShooterSlot + 1) % Math.max(1, shooterCount);
          }
          const direction = Math.sign(p.x - enemy.x) || 1;
          world.particles.push({
            x: enemy.x + 19,
            y: enemy.y + 5,
            vx: direction * 104 * difficulty.enemy,
            vy: -18,
            life: 3.1,
            color: themeColor(world.sector, "warning"),
            hazard: "boss",
            hazardStyle: "energy-bolt",
            size: 8,
          });
        } else if (!enemy.guardian && enemyArchetype === 1 && enemy.grounded && enemy.attackTimer <= 0) {
          enemy.vy = -260;
          enemy.attackTimer = 1.4;
        } else if (!enemy.guardian && enemyArchetype === 2 && enemy.attackTimer <= 0) {
          // Keep the patrol archetype active without giving it a separate
          // horizontal speed or allowing repeated actions to compound speed.
          enemy.attackTimer = 1.1;
        }
        if (enemy.grounded) {
          const direction = Math.sign(enemy.vx) || 1;
          const lookAheadX = enemy.x + direction * 34;
          const walkwayContinues = world.tiles.some((tile) => tileIsActive(tile, world.fxTime)
            && Math.abs(tile.y - (enemy.y + 32)) < 5
            && lookAheadX + 34 > tile.x + 3
            && lookAheadX + 4 < tile.x + TILE - 3);
          if (!walkwayContinues) {
            if (!enemy.guardian) enemy.vx = -enemy.vx;
            else {
              const bossWalkway = world.tiles.filter((tile) => tileIsActive(tile, world.fxTime)
                && Math.abs(tile.y - (enemy.y + 32)) < 5);
              const edge = direction > 0
                ? Math.max(...bossWalkway.map((tile) => tile.x + TILE))
                : Math.min(...bossWalkway.map((tile) => tile.x));
              const reachesOuterEdge = direction > 0
                ? enemy.x + 34 >= edge - 3
                : enemy.x + 4 <= edge + 3;
              if (reachesOuterEdge) enemy.vx = -enemy.vx;
            }
          }
        }
        enemy.vy += GRAVITY * (enemy.kind === 5 ? 0.24 : enemyArchetype === 2 ? 0.4 : 0.78) * dt;
        enemy.x += enemy.vx * difficulty.enemy * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.x < 18) {
          enemy.x = 18;
          enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x > VIEW_W - 54) {
          enemy.x = VIEW_W - 54;
          enemy.vx = -Math.abs(enemy.vx);
        }
        enemy.grounded = false;
        for (const tile of world.tiles) {
          if (!tileIsActive(tile, world.fxTime)) continue;
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

      // Falling objects now visibly detach from the underside of the existing
      // walkways. Their timing and count depend only on the selected difficulty.
      world.fallingHazardTimer -= dt;
      if (world.fallingHazardTimer <= 0) {
        const falling = FALLING_HAZARD_SETTINGS[difficultyLevel];
        world.fallingHazardTimer = falling.interval[0] + Math.random() * (falling.interval[1] - falling.interval[0]);
        const visibleTiles = world.tiles.filter((tile) => tile.alive
          && tile.y >= world.cameraY + 24
          && tile.y <= world.cameraY + view.height - 82);
        const rows = new Map<number, Tile[]>();
        for (const tile of visibleTiles) {
          const row = Math.round(tile.y);
          const tiles = rows.get(row) || [];
          tiles.push(tile);
          rows.set(row, tiles);
        }
        const availableRows = [...rows.values()];
        const style = FALLING_HAZARD_STYLES[world.sector - 1];
        for (let index = 0; index < falling.count && availableRows.length; index += 1) {
          const row = availableRows.splice(Math.floor(Math.random() * availableRows.length), 1)[0];
          const tile = row[Math.floor(Math.random() * row.length)];
          const size = falling.size + Math.random() * 4;
          world.particles.push({
            x: tile.x + 12 + Math.random() * Math.max(12, TILE - 24),
            y: tile.y + 31,
            vx: (Math.random() - .5) * 28 * falling.speed,
            vy: (115 + Math.random() * 72) * falling.speed,
            life: 3.5 + Math.random() * .8,
            color: index % 3 === 0 ? themeColor(world.sector, "warning") : index % 2 ? themeColor(world.sector, "accent") : themeColor(world.sector, "secondary"),
            hazard: "fall",
            hazardStyle: style,
            size,
            rotation: Math.random() * Math.PI * 2,
            spin: (Math.random() - .5) * 4.5,
          });
        }
      }

      for (const particle of world.particles) {
        particle.life -= dt;
        if (particle.hazard !== "laser") particle.vy += 560 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        if (particle.spin) particle.rotation = (particle.rotation || 0) + particle.spin * dt;
        if (
          particle.hazard &&
          particle.life > 0 &&
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
      // Desktop fullscreen can produce a very wide, shallow canvas. In that
      // case the old origin clamp left the player below the lower edge. Track
      // the player upward just enough to retain a visible safety band.
      const bottomSafeMargin = Math.max(26, Math.min(96, view.height * 0.12));
      const lowestVisiblePlayerTop = Math.max(0, view.height - PLAYER_H - bottomSafeMargin);
      const targetCamera = p.y > lowestVisiblePlayerTop
        ? p.y - lowestVisiblePlayerTop
        : Math.min(0, p.y - view.height * (view.portrait ? 0.66 : 0.61));
      world.cameraY += (targetCamera - world.cameraY) * Math.min(1, dt * 4.5);
      if (p.y > world.cameraY + view.height + 130) hurt(world);
      const guardianAlive = world.enemies.some((enemy) => enemy.alive && enemy.guardian);
      const objectivesRemaining = world.objectives.some((objective) => objective.active);
      if (p.y < WORLD_TOP && !guardianAlive && !objectivesRemaining) {
        if (challengeRef.current === "scoreRush" && world.sector === LEVEL_COUNT && world.score + 5000 < 15_000) {
          world.status = "gameover";
          world.powerUpMessage = isDe ? "CHALLENGE GESCHEITERT // 15.000 PUNKTE FEHLEN" : "CHALLENGE FAILED // 15,000 SCORE REQUIRED";
          world.powerUpMessageTime = 2.4;
          setStatus("gameover");
          syncHud(world);
          return;
        }
        world.score += 5000;
        const nextLevel = Math.min(LEVEL_COUNT, world.sector + 1);
        if (nextLevel > unlockedLevelRef.current) {
          unlockedLevelRef.current = nextLevel;
          selectedStartLevelRef.current = nextLevel;
          setUnlockedLevel(nextLevel);
          setSelectedStartLevel(nextLevel);
          setStoredItem("skybreak-unlocked-level", String(nextLevel));
          setCosmeticLoadout((current) => normalizeCosmeticLoadout(current, nextLevel, unlockedRobotProfiles));
        }
        if (world.sector < LEVEL_COUNT) {
          const updatedDifficulties = [...difficultiesRef.current];
          updatedDifficulties[world.sector] = difficultyLevel;
          difficultiesRef.current = updatedDifficulties;
          setLevelDifficulties(updatedDifficulties);
          setStoredItem("skybreak-level-difficulties", JSON.stringify(updatedDifficulties));
        }
        const completionTarget = world.sector < LEVEL_COUNT ? "upgrade" : "won";
        const robotCelebration = p.avatar === "robot";
        const bikiniShowcase = p.avatar === "bikini";
        world.status = robotCelebration ? "celebration" : bikiniShowcase ? "bikiniShowcase" : completionTarget;
        world.celebrationTarget = completionTarget;
        world.celebrationTime = robotCelebration || bikiniShowcase ? 5 : 0;
        world.transition = 2.4;
        world.victoryTime = !robotCelebration && !bikiniShowcase && completionTarget === "won" ? 0.01 : 0;
        p.vx = 0;
        p.vy = 0;
        if (!robotCelebration && !bikiniShowcase) audioRef.current?.win();
        if (!world.cheatUsed) {
          const best = Math.max(world.score, Number(getStoredItem("neon-ascent-highscore") || 0));
          setStoredItem("neon-ascent-highscore", String(best));
          setHighScore(best);
        }
        syncHud(world);
      } else if (p.y < WORLD_TOP && (guardianAlive || objectivesRemaining)) {
        p.y = WORLD_TOP + 48;
        p.vy = 120;
        world.powerUpMessage = guardianAlive
          ? (isDe ? "WÄCHTER ZUERST AUSSCHALTEN" : "DISABLE THE GUARDIAN FIRST")
          : (isDe ? "LEVEL-ZIELE ZUERST ABSCHLIESSEN" : "COMPLETE LEVEL OBJECTIVES FIRST");
        world.powerUpMessageTime = 1.5;
      }
    };

    const draw = (world: World) => {
      const settings = activeQualitySettings(qualityRef.current, ultraFallbackRef.current, mobileHighThermalRef.current.active);
      const ultraActive = qualityRef.current === "ultra" && !ultraFallbackRef.current;
      const mobileHigh = qualityRef.current === "high" && window.matchMedia("(pointer: coarse)").matches;
      const theme = LEVEL_THEMES[Math.max(0, world.sector - 1)] || LEVEL_THEMES[0];
      const cinematicBackdrop = Boolean(levelBackdropImagesRef.current[theme.motif]?.complete);
      const visible = (x: number, y: number, width = 0, height = 0, margin = 72) =>
        x + width >= world.cameraX - margin && x <= world.cameraX + view.width + margin
        && y + height >= world.cameraY - margin && y <= world.cameraY + view.height + margin;
      const sx = canvas.width / view.width;
      const sy = canvas.height / view.height;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      ctx.clearRect(0, 0, view.width, view.height);
      const shakeX = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      const shakeY = world.shake ? (Math.random() - 0.5) * world.shake : 0;
      ctx.translate(shakeX, shakeY);

      drawStaticBackdrop(theme);

      // Low intentionally keeps the playable scene but omits the expensive
      // decorative panorama. Desktop Low is a performance mode, not a
      // 30-FPS-limited version of the full Ultra background.
      if (settings.layers > 0 && !(benchmarkMode && benchmarkVariant === "background-off")) {
      drawCachedBackgroundAnimation(world, theme, settings);
      // Ultra draws its moving shafts, bloom, rain, and grid in the WebGPU
      // overlay. Keep the Canvas 2D version only for lower graphics levels.
      if (!ultraActive && settings.layers > 0) {
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
      }

      // Distant air traffic gives the skyline depth without bitmap assets.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const trafficCount = ![1, 6].includes(theme.motif) && [0, 1, 6, 9].includes(theme.motif) ? settings.traffic : 0;
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
      const skylineLayers = !cinematicBackdrop && [0, 1, 3, 6, 9].includes(theme.motif) ? settings.layers : 0;
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
      const billboardCount = !cinematicBackdrop && [0, 1, 3].includes(theme.motif) ? 3 : 0;
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
      }

      // Ultra rain is rendered in WebGPU. Mobile High uses a cached Canvas
      // layer, while the remaining quality levels retain the Canvas version.
      if (ultraActive && ![1, 6].includes(theme.motif)) {
        // WebGPU overlay owns the atmospheric rain on this path.
      } else if (mobileHigh) {
        drawMobileRain(world, theme, settings);
      } else {
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
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + length); ctx.stroke();
        }
        ctx.restore();
      }

      if (!cinematicBackdrop && !ultraActive && settings.layers > 0 && [0, 3, 6].includes(theme.motif)) {
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
        ["#9b361b", "#401007", "#140302"],
        ["#2877a5", "#082b55", "#020a18"],
        ["#7ebfc6", "#1e5265", "#06131c"],
        ["#557045", "#1c311d", "#050c06"],
      ][theme.motif];
      const platformShape = (target: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
        target.beginPath();
        switch (theme.motif) {
          case 0: // Cryo steel: chamfered industrial module.
            target.moveTo(x + 8, y); target.lineTo(x + width - 8, y); target.lineTo(x + width, y + 8); target.lineTo(x + width - 6, y + height); target.lineTo(x + 6, y + height); target.lineTo(x, y + 8); break;
          case 1: // Chrome bazaar: broad capsule sign.
            target.roundRect(x, y + 2, width, height - 2, height / 2); break;
          case 2: // Toxic transit: corroded teeth.
            target.moveTo(x, y + 3); target.lineTo(x + width, y); target.lineTo(x + width - 3, y + height - 5);
            for (let tooth = 0; tooth < 4; tooth++) target.lineTo(x + width - 12 - tooth * 14, y + height - (tooth % 2 ? 2 : 7));
            target.lineTo(x + 3, y + height - 3); break;
          case 3: // Crimson firewall: slanted data blade.
            target.moveTo(x + 9, y); target.lineTo(x + width, y + 4); target.lineTo(x + width - 9, y + height); target.lineTo(x, y + height - 4); break;
          case 4: // Azure data sea: frozen wave.
            target.moveTo(x, y + 8); target.quadraticCurveTo(x + width * 0.2, y - 3, x + width * 0.4, y + 7); target.quadraticCurveTo(x + width * 0.68, y + 17, x + width, y + 2); target.lineTo(x + width - 4, y + height); target.lineTo(x + 4, y + height); break;
          case 5: // Violet reactor: faceted crystal.
            target.moveTo(x + 10, y); target.lineTo(x + width - 10, y); target.lineTo(x + width, y + height / 2); target.lineTo(x + width - 12, y + height); target.lineTo(x + 12, y + height); target.lineTo(x, y + height / 2); break;
          case 6: // Solar megagrid: stepped photovoltaic panel.
            target.moveTo(x + 4, y); target.lineTo(x + width - 4, y); target.lineTo(x + width - 4, y + height - 5); target.lineTo(x + width - 14, y + height); target.lineTo(x + 14, y + height); target.lineTo(x + 4, y + height - 5); break;
          case 7: // Ghost network: asymmetric phase shard.
            target.moveTo(x + 5, y); target.lineTo(x + width - 2, y + 4); target.lineTo(x + width - 12, y + height); target.lineTo(x + 14, y + height - 3); target.lineTo(x, y + 12); break;
          case 8: // Quantum rift: arrowhead prism.
            target.moveTo(x + 12, y); target.lineTo(x + width, y + height / 2); target.lineTo(x + 12, y + height); target.lineTo(x, y + height - 5); target.lineTo(x + 15, y + height / 2); target.lineTo(x, y + 5); break;
          case 9: // Skybreak apex: crown-shaped summit plate.
            target.moveTo(x, y + 7); target.lineTo(x + 12, y); target.lineTo(x + width * 0.5, y + 5); target.lineTo(x + width - 12, y); target.lineTo(x + width, y + 7); target.lineTo(x + width - 7, y + height); target.lineTo(x + 7, y + height); break;
          case 10: // Inferno: heavy molten forge plate.
            target.moveTo(x, y + 5); target.lineTo(x + width, y + 2); target.lineTo(x + width - 6, y + height); target.lineTo(x + 8, y + height); target.lineTo(x + 3, y + 13); break;
          case 11: // Abyss: flowing coral-server shelf.
            target.moveTo(x, y + 9); target.quadraticCurveTo(x + width * .24, y - 4, x + width * .48, y + 8); target.quadraticCurveTo(x + width * .74, y + 21, x + width, y + 4); target.lineTo(x + width - 5, y + height); target.lineTo(x + 5, y + height); break;
          case 12: // Air: swept aero-alloy wing.
            target.moveTo(x + 8, y); target.lineTo(x + width - 4, y + 6); target.lineTo(x + width - 14, y + height); target.lineTo(x + 6, y + height - 3); target.lineTo(x, y + 10); break;
          default: // Earth: geode-bastion facet.
            target.moveTo(x + 7, y); target.lineTo(x + width - 8, y + 2); target.lineTo(x + width, y + 11); target.lineTo(x + width - 12, y + height); target.lineTo(x + 13, y + height); target.lineTo(x, y + 12); break;
        }
        target.closePath();
      };
      const spriteCacheEnabled = true;
      const platformScale = Math.max(1, Math.min(4, canvas.width / Math.max(1, view.width)));
      const getPlatformSurface = (cracked: boolean, glow: string) => {
        const key = `${theme.motif}:${cracked ? "cracked" : "solid"}:${glow}:${platformScale}`;
        const cached = platformSurfaceCache.get(key);
        if (cached) return cached;
        const surface = makeLayer();
        surface.width = Math.ceil(TILE * platformScale);
        surface.height = Math.ceil(40 * platformScale);
        const layer = surface.getContext("2d");
        if (!layer) return surface;
        layer.scale(platformScale, platformScale);
        // Compact 2.5D floating slab: the front and side faces are deliberately
        // short, so every tile reads as its own hovering solid instead of a
        // long hanging wedge.
        const frontFace = layer.createLinearGradient(0, 16, 0, 31);
        frontFace.addColorStop(0, platformMaterials[1]); frontFace.addColorStop(1, platformMaterials[2]);
        layer.fillStyle = frontFace;
        layer.beginPath(); layer.moveTo(5, 16); layer.lineTo(TILE - 5, 16); layer.lineTo(TILE - 9, 31); layer.lineTo(9, 31); layer.closePath(); layer.fill();
        const sideFace = layer.createLinearGradient(TILE - 13, 6, TILE, 31);
        sideFace.addColorStop(0, platformMaterials[0]); sideFace.addColorStop(1, platformMaterials[2]);
        layer.fillStyle = sideFace;
        layer.beginPath(); layer.moveTo(TILE - 5, 7); layer.lineTo(TILE, 11); layer.lineTo(TILE - 9, 31); layer.lineTo(TILE - 13, 23); layer.closePath(); layer.fill();
        layer.strokeStyle = "rgba(185,232,255,.22)"; layer.lineWidth = 1; layer.stroke();
        layer.shadowBlur = ultraActive ? 0 : 19; layer.shadowColor = glow;
        platformShape(layer, 2, 0, TILE - 4, 24);
        const plate = layer.createLinearGradient(0, 0, 0, 24);
        plate.addColorStop(0, platformMaterials[0]); plate.addColorStop(0.18, platformMaterials[1]); plate.addColorStop(0.58, platformMaterials[2]); plate.addColorStop(1, "#02040a");
        layer.fillStyle = plate; layer.fill(); layer.shadowBlur = 0; layer.strokeStyle = glow; layer.lineWidth = 2; layer.stroke();
        platformSurfaceCache.set(key, surface);
        return surface;
      };
      // These are visual-only route markers and guardian set pieces. They sit
      // behind the collision tiles, so every sector can look structurally
      // different without changing jump widths, enemy counts, or damage rules.
      const drawSectorArchitecture = () => {
        const arenaY = FLOOR_BASE_Y - (LEVEL_FLOORS - 2) * FLOOR_SPACING;
        const markerRows = [2, 6, 10];
        ctx.save();
        ctx.globalAlpha = .36;
        ctx.strokeStyle = theme.secondary;
        ctx.fillStyle = theme.accent;
        ctx.lineWidth = 1.5;
        for (const row of markerRows) {
          const y = FLOOR_BASE_Y - row * FLOOR_SPACING + 18;
          const leftX = 18 + ((theme.motif * 37 + row * 19) % 94);
          const rightX = VIEW_W - 46 - ((theme.motif * 29 + row * 13) % 94);
          ctx.fillRect(leftX, y - 32, 4, 32);
          ctx.fillRect(rightX, y - 32, 4, 32);
          ctx.beginPath(); ctx.moveTo(leftX - 8, y - 26); ctx.lineTo(leftX + 12, y - 26); ctx.moveTo(rightX - 8, y - 26); ctx.lineTo(rightX + 12, y - 26); ctx.stroke();
        }
        ctx.globalAlpha = .54;
        if (theme.motif === 0) {
          for (const x of [130, 760]) { ctx.strokeRect(x, arenaY - 58, 48, 56); ctx.beginPath(); ctx.moveTo(x + 12, arenaY - 58); ctx.lineTo(x + 12, arenaY - 86); ctx.lineTo(x + 37, arenaY - 86); ctx.stroke(); }
        } else if (theme.motif === 1) {
          for (const x of [108, 742]) { ctx.beginPath(); ctx.moveTo(x, arenaY - 4); ctx.lineTo(x + 34, arenaY - 52); ctx.lineTo(x + 68, arenaY - 4); ctx.closePath(); ctx.fill(); }
        } else if (theme.motif === 2) {
          ctx.beginPath(); ctx.arc(VIEW_W / 2, arenaY + 26, 182, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(VIEW_W / 2, arenaY + 26, 126, Math.PI, 0); ctx.stroke();
        } else if (theme.motif === 3) {
          for (let x = 90; x < VIEW_W - 80; x += 88) { ctx.fillRect(x, arenaY - 44, 8, 42); ctx.fillRect(x + 13, arenaY - 30, 3, 28); }
        } else if (theme.motif === 4) {
          for (const x of [150, 470, 790]) { ctx.beginPath(); ctx.arc(x, arenaY - 25, 24, Math.PI, 0); ctx.lineTo(x + 24, arenaY + 3); ctx.lineTo(x - 24, arenaY + 3); ctx.closePath(); ctx.stroke(); }
        } else if (theme.motif === 5) {
          for (let ring = 0; ring < 3; ring++) { ctx.beginPath(); ctx.ellipse(VIEW_W / 2, arenaY - 36, 105 + ring * 64, 22 + ring * 13, world.fxTime * (ring % 2 ? .16 : -.12), 0, Math.PI * 2); ctx.stroke(); }
        } else if (theme.motif === 6) {
          for (const x of [116, 244, 628, 756]) { ctx.strokeRect(x, arenaY - 48, 74, 39); ctx.beginPath(); ctx.moveTo(x + 37, arenaY - 48); ctx.lineTo(x + 37, arenaY - 78); ctx.stroke(); }
        } else if (theme.motif === 7) {
          ctx.setLineDash([5, 6]); for (const x of [164, 430, 696]) { ctx.strokeRect(x, arenaY - 58, 98, 48); } ctx.setLineDash([]);
        } else if (theme.motif === 8) {
          for (const x of [184, 480, 776]) { ctx.beginPath(); ctx.arc(x, arenaY - 31, 28 + Math.sin(world.fxTime * 2 + x) * 5, 0, Math.PI * 2); ctx.stroke(); }
        } else if (theme.motif === 9) {
          ctx.fillRect(VIEW_W / 2 - 5, arenaY - 112, 10, 111); ctx.beginPath(); ctx.moveTo(VIEW_W / 2 - 68, arenaY - 80); ctx.lineTo(VIEW_W / 2, arenaY - 118); ctx.lineTo(VIEW_W / 2 + 68, arenaY - 80); ctx.stroke();
        } else if (theme.motif === 10) {
          for (const x of [146, 430, 714]) { ctx.beginPath(); ctx.arc(x, arenaY - 14, 34, Math.PI, 0); ctx.stroke(); ctx.fillRect(x - 4, arenaY - 58, 8, 44); }
        } else if (theme.motif === 11) {
          for (const x of [150, 430, 710]) { ctx.beginPath(); ctx.moveTo(x, arenaY); ctx.quadraticCurveTo(x + 30, arenaY - 80, x + 60, arenaY); ctx.stroke(); }
        } else if (theme.motif === 12) {
          for (const x of [178, 480, 782]) { ctx.beginPath(); ctx.arc(x, arenaY - 32, 32, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(x - 4, arenaY - 64, 8, 64); }
        } else {
          for (const x of [146, 430, 714]) { ctx.beginPath(); ctx.moveTo(x, arenaY); ctx.lineTo(x + 26, arenaY - 68); ctx.lineTo(x + 58, arenaY - 17); ctx.lineTo(x + 84, arenaY - 74); ctx.stroke(); }
        }
        ctx.restore();
      };
      drawSectorArchitecture();
      for (const tile of world.tiles) {
        if (!tile.alive || !visible(tile.x, tile.y, TILE, tile.mode === "wall" ? TILE : 40)) continue;
        const phaseActive = tileIsActive(tile, world.fxTime);
        const glow = tile.mode === "rift" ? theme.secondary : tile.mode === "phase" ? theme.warning : tile.cracked ? theme.accent : theme.warning;
        if (tile.mode === "wall") {
          const wallPulse = .56 + Math.sin(world.fxTime * 3.1 + tile.phaseOffset) * .2;
          ctx.save();
          ctx.globalAlpha = phaseActive ? 1 : .18;
          ctx.shadowBlur = ultraActive ? 0 : 18;
          ctx.shadowColor = glow;
          const wallFace = ctx.createLinearGradient(tile.x, tile.y, tile.x + TILE, tile.y + TILE);
          wallFace.addColorStop(0, platformMaterials[0]);
          wallFace.addColorStop(.4, platformMaterials[1]);
          wallFace.addColorStop(1, platformMaterials[2]);
          ctx.fillStyle = wallFace;
          ctx.strokeStyle = glow;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tile.x + 7, tile.y);
          ctx.lineTo(tile.x + TILE - 7, tile.y + 4);
          ctx.lineTo(tile.x + TILE, tile.y + 14);
          ctx.lineTo(tile.x + TILE - 8, tile.y + TILE);
          ctx.lineTo(tile.x + 8, tile.y + TILE - 4);
          ctx.lineTo(tile.x, tile.y + 13);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = wallPulse;
          ctx.strokeStyle = theme.secondary;
          ctx.beginPath();
          ctx.moveTo(tile.x + 13, tile.y + 12); ctx.lineTo(tile.x + 37, tile.y + 27); ctx.lineTo(tile.x + 23, tile.y + 49); ctx.lineTo(tile.x + 49, tile.y + 56);
          ctx.stroke();
          ctx.fillStyle = theme.warning;
          ctx.fillRect(tile.x + 27, tile.y + 14, 8, 4);
          ctx.fillRect(tile.x + 18, tile.y + 38, 28, 3);
          ctx.restore();
          continue;
        }
        const hover = 2 + Math.sin(world.fxTime * 1.45 + tile.x * .05 + tile.y * .004) * 1.25;
        ctx.globalAlpha = phaseActive ? 1 : 0.18;
        // Contact shadow sits behind the cached slab and gives platforms a
        // stable depth cue without adding per-frame gradients or paths.
        ctx.save();
        ctx.globalAlpha *= 0.22;
        ctx.fillStyle = "#01040a";
        ctx.beginPath();
        ctx.ellipse(tile.x + TILE * .56, tile.y + 38, TILE * .46, 4, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(0, -hover);
        if (spriteCacheEnabled) {
          ctx.drawImage(getPlatformSurface(tile.cracked, glow), tile.x, tile.y, TILE, 40);
        } else {
        const underside = ctx.createLinearGradient(tile.x, tile.y + 16, tile.x, tile.y + 40);
        underside.addColorStop(0, platformMaterials[1]); underside.addColorStop(1, platformMaterials[2]);
        ctx.fillStyle = underside;
        ctx.beginPath(); ctx.moveTo(tile.x + 5, tile.y + 15); ctx.lineTo(tile.x + TILE - 5, tile.y + 15); ctx.lineTo(tile.x + TILE - 11, tile.y + 36); ctx.lineTo(tile.x + 11, tile.y + 36); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(95,132,164,.28)"; ctx.stroke();
        ctx.shadowBlur = ultraActive ? 0 : 19; ctx.shadowColor = glow;
        platformShape(ctx, tile.x + 2, tile.y, TILE - 4, 24);
        const plate = ctx.createLinearGradient(tile.x, tile.y, tile.x, tile.y + 24);
        plate.addColorStop(0, platformMaterials[0]); plate.addColorStop(0.18, platformMaterials[1]); plate.addColorStop(0.58, platformMaterials[2]); plate.addColorStop(1, "#02040a");
        ctx.fillStyle = plate; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = glow; ctx.lineWidth = 2; ctx.stroke();
        }
        // The water front is a clearly visible scene effect only. It never
        // changes traction, preserving the same movement rules in every level.
        const waterSlipActive = world.sector === 12
          && Math.sin(world.fxTime * 1.05 + world.sector * 1.7) > -0.1;
        if (waterSlipActive) {
          const wetShine = 0.3 + Math.sin(world.fxTime * 4 + tile.x * 0.04) * 0.16;
          ctx.globalAlpha = wetShine;
          ctx.fillStyle = "#8af8ff";
          ctx.beginPath();
          ctx.ellipse(tile.x + TILE * .5, tile.y + 5, TILE * .38, 2.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#d8ffff";
          ctx.fillRect(tile.x + 11, tile.y + 4, TILE * .38, 1.2);
        }
        const corePulse = 0.55 + Math.sin(world.fxTime * 5 + tile.x * 0.03) * 0.3;
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = 1;
        ctx.globalAlpha = corePulse;
        if (theme.motif === 0) {
          // Undercity: linked energy conductors, not a generic lightning icon.
          ctx.strokeStyle = glow; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(tile.x + 9, tile.y + 17); ctx.lineTo(tile.x + 19, tile.y + 9); ctx.lineTo(tile.x + 30, tile.y + 16); ctx.lineTo(tile.x + 43, tile.y + 7); ctx.lineTo(tile.x + 54, tile.y + 13); ctx.stroke();
          for (const x of [12, 30, 52]) { ctx.fillStyle = "#e9ffff"; ctx.beginPath(); ctx.arc(tile.x + x, tile.y + (x === 30 ? 16 : x === 12 ? 15 : 12), 1.5, 0, Math.PI * 2); ctx.fill(); }
        } else if (theme.motif === 1) {
          // Bazaar: animated holographic price glyph.
          ctx.strokeStyle = theme.accent; ctx.strokeRect(tile.x + 20, tile.y + 5, 23, 14);
          ctx.fillStyle = theme.secondary; ctx.fillRect(tile.x + 24, tile.y + 9, 15, 2); ctx.fillRect(tile.x + 28, tile.y + 14, 8, 2);
        } else if (theme.motif === 2) {
          ctx.fillStyle = theme.accent;
          for (const [x, y, r] of [[14, 12, 2], [26, 7, 3], [38, 15, 2], [50, 10, 3]] as const) { ctx.beginPath(); ctx.arc(tile.x + x, tile.y + y + Math.sin(world.fxTime * 2 + x) * 1.5, r, 0, Math.PI * 2); ctx.fill(); }
        } else if (theme.motif === 3) {
          ctx.fillStyle = theme.warning;
          for (let bar = 0; bar < 5; bar++) ctx.fillRect(tile.x + 10 + bar * 10, tile.y + 7 + (bar % 2) * 5, 6, 3);
        } else if (theme.motif === 4) {
          ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.4;
          for (let wave = 0; wave < 2; wave++) { ctx.beginPath(); for (let x = 8; x < 57; x += 5) { const y = tile.y + 10 + wave * 6 + Math.sin(world.fxTime * 2.4 + x * .25 + wave) * 1.7; if (x === 8) ctx.moveTo(tile.x + x, y); else ctx.lineTo(tile.x + x, y); } ctx.stroke(); }
        } else if (theme.motif === 5) {
          ctx.strokeStyle = theme.secondary; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(tile.x + 32, tile.y + 5); ctx.lineTo(tile.x + 42, tile.y + 12); ctx.lineTo(tile.x + 32, tile.y + 20); ctx.lineTo(tile.x + 22, tile.y + 12); ctx.closePath(); ctx.stroke(); ctx.fillStyle = theme.warning; ctx.beginPath(); ctx.arc(tile.x + 32, tile.y + 12, 2, 0, Math.PI * 2); ctx.fill();
        } else if (theme.motif === 6) {
          ctx.strokeStyle = theme.warning; ctx.lineWidth = 1;
          for (let cell = 0; cell < 4; cell++) { const x = tile.x + 12 + cell * 10; ctx.strokeRect(x, tile.y + 6, 7, 12); ctx.fillStyle = "rgba(255,213,103,.34)"; ctx.fillRect(x + 1, tile.y + 7, 5, 2); }
        } else if (theme.motif === 7) {
          ctx.setLineDash([2, 3]); ctx.strokeStyle = theme.accent; ctx.strokeRect(tile.x + 13, tile.y + 6, 38, 12); ctx.setLineDash([]); ctx.fillStyle = theme.secondary; ctx.fillRect(tile.x + 20, tile.y + 11, 7, 2); ctx.fillRect(tile.x + 37, tile.y + 11, 6, 2);
        } else if (theme.motif === 8) {
          ctx.strokeStyle = theme.secondary; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(tile.x + 32, tile.y + 12, 7 + Math.sin(world.fxTime * 3 + tile.phaseOffset) * 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(tile.x + 32, tile.y + 12, 2, 0, Math.PI * 2); ctx.fill();
        } else if (theme.motif === 10) {
          ctx.fillStyle = "#ff5c24"; for (let vent = 0; vent < 3; vent++) { ctx.beginPath(); ctx.arc(tile.x + 17 + vent * 15, tile.y + 14, 4, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = "#fff0a3"; ctx.fillRect(tile.x + 13, tile.y + 7, 38, 2);
        } else if (theme.motif === 11) {
          ctx.strokeStyle = "#b2fff6"; ctx.beginPath(); ctx.arc(tile.x + 21, tile.y + 12, 6, Math.PI, 0); ctx.arc(tile.x + 41, tile.y + 12, 6, Math.PI, 0); ctx.stroke(); ctx.fillStyle = "rgba(34,220,255,.55)"; ctx.fillRect(tile.x + 11, tile.y + 16, 42, 2);
        } else if (theme.motif === 12) {
          ctx.strokeStyle = "#cdefff"; ctx.beginPath(); ctx.moveTo(tile.x + 10, tile.y + 15); ctx.quadraticCurveTo(tile.x + 28, tile.y + 4, tile.x + 54, tile.y + 11); ctx.stroke(); ctx.fillStyle = "#75fff3"; ctx.fillRect(tile.x + 25, tile.y + 9, 14, 2);
        } else if (theme.motif === 13) {
          ctx.strokeStyle = "#64f09a"; ctx.beginPath(); ctx.moveTo(tile.x + 16, tile.y + 18); ctx.lineTo(tile.x + 26, tile.y + 6); ctx.lineTo(tile.x + 35, tile.y + 17); ctx.lineTo(tile.x + 47, tile.y + 5); ctx.stroke(); ctx.fillStyle = "#f0ba52"; ctx.beginPath(); ctx.arc(tile.x + 32, tile.y + 12, 3, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = theme.warning; ctx.fillRect(tile.x + 29, tile.y + 5, 6, 14); ctx.fillRect(tile.x + 20, tile.y + 10, 24, 3); ctx.fillStyle = "rgba(255,255,255,.78)"; ctx.fillRect(tile.x + 31, tile.y + 7, 2, 10);
        }
        ctx.globalAlpha = 0.45;
        if (theme.platform === "cryo-steel") {
          for (let rivet = 0; rivet < 4; rivet++) { ctx.beginPath(); ctx.arc(tile.x + 12 + rivet * 14, tile.y + 12, 2, 0, Math.PI * 2); ctx.stroke(); }
        } else if (theme.platform === "chrome-ice") {
          ctx.fillStyle = "rgba(255,255,255,.24)"; ctx.fillRect(tile.x + 8, tile.y + 5, TILE - 22, 4); ctx.strokeRect(tile.x + 12, tile.y + 13, TILE - 24, 6);
        } else if (theme.platform === "corroded-ice" || theme.platform === "molten-glass") {
          for (let stripe = 0; stripe < 4; stripe++) { ctx.beginPath(); ctx.moveTo(tile.x + 6 + stripe * 15, tile.y + 20); ctx.lineTo(tile.x + 13 + stripe * 15, tile.y + 4); ctx.stroke(); }
        } else if (theme.platform === "deep-ice" || theme.platform === "plasma-crystal" || theme.platform === "rift-crystal") {
          ctx.beginPath(); ctx.arc(tile.x + TILE / 2, tile.y + 12, 5 + theme.motif % 4, 0, Math.PI * 2); ctx.stroke();
          if (theme.platform === "deep-ice") { ctx.beginPath(); ctx.moveTo(tile.x + 9, tile.y + 4); ctx.lineTo(tile.x + 22, tile.y + 20); ctx.lineTo(tile.x + 35, tile.y + 4); ctx.lineTo(tile.x + 52, tile.y + 20); ctx.stroke(); }
        } else if (theme.platform === "solar-array") {
          for (let cell = 0; cell < 5; cell++) ctx.strokeRect(tile.x + 7 + cell * 11, tile.y + 5, 8, 13);
        } else if (theme.platform === "phase-ice") {
          ctx.setLineDash([4, 4]); ctx.strokeRect(tile.x + 7, tile.y + 5, TILE - 14, 13); ctx.setLineDash([]);
        } else if (theme.platform === "apex-ice") {
          ctx.beginPath(); ctx.moveTo(tile.x + 8, tile.y + 12); ctx.lineTo(tile.x + TILE - 8, tile.y + 12); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(tile.x + 18, tile.y + 5, 27, 3);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(225,249,255,.48)";
        ctx.fillRect(tile.x + 9, tile.y + 2, TILE - 19, 1);
        if (tile.doubleDeck) {
          ctx.globalAlpha = .88;
          ctx.strokeStyle = tile.doubleDeck === "lower" ? theme.warning : theme.secondary;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(tile.x + 8, tile.y + (tile.doubleDeck === "lower" ? 18 : 6));
          ctx.lineTo(tile.x + TILE - 8, tile.y + (tile.doubleDeck === "lower" ? 18 : 6));
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (tile.cracked) {
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1.15;
          ctx.globalAlpha = .78;
          switch (theme.motif) {
            case 0: // Split circuit traces.
              ctx.beginPath(); ctx.moveTo(tile.x + 13, tile.y + 4); ctx.lineTo(tile.x + 22, tile.y + 9); ctx.lineTo(tile.x + 19, tile.y + 17); ctx.moveTo(tile.x + 45, tile.y + 4); ctx.lineTo(tile.x + 39, tile.y + 12); ctx.lineTo(tile.x + 47, tile.y + 20); break;
            case 1: // Fractured market display frame.
              ctx.strokeStyle = theme.secondary; ctx.strokeRect(tile.x + 17, tile.y + 5, 28, 13); ctx.beginPath(); ctx.moveTo(tile.x + 31, tile.y + 5); ctx.lineTo(tile.x + 28, tile.y + 18); break;
            case 2: // Corrosion pits and a dripping split.
              ctx.beginPath(); ctx.arc(tile.x + 26, tile.y + 10, 4, 0, Math.PI * 2); ctx.moveTo(tile.x + 38, tile.y + 5); ctx.quadraticCurveTo(tile.x + 34, tile.y + 13, tile.x + 40, tile.y + 20); break;
            case 3: // Broken firewall bars.
              ctx.strokeStyle = theme.warning; for (const x of [17, 29, 41]) { ctx.beginPath(); ctx.moveTo(tile.x + x, tile.y + 5); ctx.lineTo(tile.x + x - 4, tile.y + 12); ctx.moveTo(tile.x + x + 2, tile.y + 15); ctx.lineTo(tile.x + x - 2, tile.y + 20); } break;
            case 4: // A torn data wave.
              ctx.beginPath(); for (let x = 10; x < 55; x += 5) { const y = tile.y + 12 + Math.sin(x * .35) * 3 + (x > 31 ? 4 : 0); if (x === 10) ctx.moveTo(tile.x + x, y); else ctx.lineTo(tile.x + x, y); } break;
            case 5: // Crystal fracture facets.
              ctx.beginPath(); ctx.moveTo(tile.x + 32, tile.y + 3); ctx.lineTo(tile.x + 24, tile.y + 12); ctx.lineTo(tile.x + 32, tile.y + 21); ctx.lineTo(tile.x + 41, tile.y + 11); ctx.closePath(); break;
            case 6: // One damaged photovoltaic cell.
              ctx.strokeStyle = theme.warning; ctx.strokeRect(tile.x + 26, tile.y + 5, 10, 15); ctx.beginPath(); ctx.moveTo(tile.x + 27, tile.y + 7); ctx.lineTo(tile.x + 35, tile.y + 18); ctx.stroke(); break;
            case 7: // Ghost packet dropout.
              ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(tile.x + 13, tile.y + 8); ctx.lineTo(tile.x + 27, tile.y + 8); ctx.moveTo(tile.x + 35, tile.y + 16); ctx.lineTo(tile.x + 51, tile.y + 16); ctx.stroke(); ctx.setLineDash([]); break;
            case 8: // Rift ring separation.
              ctx.strokeStyle = theme.secondary; ctx.beginPath(); ctx.arc(tile.x + 32, tile.y + 12, 8, .25, Math.PI * .78); ctx.moveTo(tile.x + 32, tile.y + 4); ctx.lineTo(tile.x + 32, tile.y + 20); break;
            default: // Apex beacon panel split.
              ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.moveTo(tile.x + 18, tile.y + 7); ctx.lineTo(tile.x + 32, tile.y + 12); ctx.lineTo(tile.x + 46, tile.y + 7); ctx.moveTo(tile.x + 32, tile.y + 12); ctx.lineTo(tile.x + 32, tile.y + 21); break;
          }
          ctx.stroke();
        }
        if (tile.mode === "phase") {
          const phasePulse = 0.55 + Math.sin(world.fxTime * 6 + tile.phaseOffset) * 0.3;
          const phaseCode = String(world.sector).padStart(2, "0");
          ctx.globalAlpha = phaseActive ? 0.92 : 0.58;
          ctx.fillStyle = phaseActive ? "rgba(112,247,255,.22)" : "rgba(255,43,138,.12)";
          ctx.fillRect(tile.x + 6, tile.y + 3, TILE - 12, 19);
          ctx.strokeStyle = phaseActive ? "#70f7ff" : "#ff2b8a";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(tile.x + 6, tile.y + 3, TILE - 12, 19);
          ctx.setLineDash([]);
          ctx.globalAlpha = phaseActive ? phasePulse : 0.5;
          ctx.strokeStyle = theme.warning;
          ctx.lineWidth = 1;
          for (let scan = 0; scan < 3; scan++) {
            const y = tile.y + 7 + scan * 5;
            ctx.beginPath(); ctx.moveTo(tile.x + 11, y); ctx.lineTo(tile.x + TILE - 11, y); ctx.stroke();
          }
          ctx.fillStyle = "#f4ffff";
          ctx.font = "700 5px ui-monospace, monospace";
          ctx.fillText(`PHASE ${phaseCode}`, tile.x + 11, tile.y + 16);
        } else if (tile.mode === "rift") {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = theme.secondary;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(tile.x + TILE / 2, tile.y + 12, 9 + Math.sin(world.fxTime * 5 + tile.phaseOffset) * 2, 0, Math.PI * 2); ctx.stroke();
        }
        if (tile.mode === "moving") {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = theme.warning;
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(tile.baseX + TILE / 2, tile.y + 31); ctx.lineTo(tile.x + TILE / 2, tile.y + 31); ctx.stroke();
          ctx.setLineDash([]);
        } else if (tile.mode === "ice") {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = "#d9fbff";
          ctx.fillRect(tile.x + 12, tile.y + 4, TILE - 26, 2);
        } else if (tile.mode === "bridge") {
          ctx.globalAlpha = Math.max(0.15, Math.min(1, (tile.temporaryLife ?? 0) / 1.2));
          ctx.strokeStyle = "#72ffef";
          ctx.lineWidth = 2;
          ctx.strokeRect(tile.x + 6, tile.y + 4, TILE - 12, 16);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      for (const objective of world.objectives) {
        if (!objective.active || !visible(objective.x, objective.y, 22, 28)) continue;
        ctx.save();
        const pulse = 0.7 + Math.sin(world.fxTime * 4 + objective.x * 0.02) * 0.3;
        ctx.translate(objective.x, objective.y);
        ctx.shadowBlur = ultraActive ? 0 : 16;
        ctx.shadowColor = objective.kind === "cell" ? theme.warning : theme.accent;
        ctx.strokeStyle = objective.kind === "cell" ? theme.warning : theme.accent;
        ctx.fillStyle = "#07121f";
        ctx.lineWidth = 2;
        if (objective.kind === "cell") {
          ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(21, 8); ctx.lineTo(18, 25); ctx.lineTo(4, 25); ctx.lineTo(1, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = pulse; ctx.fillStyle = theme.warning; ctx.fillRect(8, 7, 6, 12);
        } else {
          roundedRect(ctx, 0, 6, 22, 18, 4); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = pulse; ctx.fillStyle = theme.accent; ctx.fillRect(7, 11, 8, 8);
        }
        // The objective rules remain cell/switch only; this compact foreground
        // identity turns them into level-specific devices without new logic.
        ctx.globalAlpha = .82;
        ctx.strokeStyle = theme.secondary;
        ctx.fillStyle = theme.secondary;
        if (theme.motif === 0 || theme.motif === 6) {
          ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(19, 4); ctx.moveTo(11, 1); ctx.lineTo(11, 6); ctx.stroke();
        } else if (theme.motif === 1 || theme.motif === 7) {
          ctx.setLineDash([2, 2]); ctx.strokeRect(3, 3, 16, 4); ctx.setLineDash([]);
        } else if (theme.motif === 2 || theme.motif === 10) {
          for (const x of [5, 11, 17]) { ctx.beginPath(); ctx.arc(x, 4, 1.7, 0, Math.PI * 2); ctx.fill(); }
        } else if (theme.motif === 3 || theme.motif === 12) {
          ctx.fillRect(3, 3, 16, 2); ctx.fillRect(7, 0, 8, 2);
        } else if (theme.motif === 4 || theme.motif === 11) {
          ctx.beginPath(); ctx.arc(11, 4, 6, Math.PI, 0); ctx.stroke();
        } else if (theme.motif === 5 || theme.motif === 8) {
          ctx.beginPath(); ctx.arc(11, 4, 5, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(10, 3, 2, 2);
        } else if (theme.motif === 9) {
          ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(17, 6); ctx.lineTo(5, 6); ctx.closePath(); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(9, 0); ctx.lineTo(14, 6); ctx.lineTo(19, 1); ctx.stroke();
        }
        ctx.restore();
      }

      const visibleChests = [...world.chests];
      if (world.roamingChest) visibleChests.push(world.roamingChest);
      if (world.roamingChestSecondary) visibleChests.push(world.roamingChestSecondary);
      for (const chest of visibleChests) {
        if (!visible(chest.x, chest.y, 38, 36)) continue;
        ctx.save();
        const bob = chest.opened ? 0 : Math.sin(world.fxTime * 3.2 + chest.x * 0.02) * 1.5;
        ctx.translate(chest.x, chest.y + bob);
        ctx.globalAlpha = chest.opened ? 0.38 : 1;
        if (!chest.opened) {
          // Static chest geometry is prepared once per palette. Only its lock
          // and roaming countdown remain dynamic in the hot loop.
          ctx.drawImage(getPreparedChestSprite(chest.roaming ? "#ff2bde" : "#d59a42", chest.roaming ? "#29105b" : "#8b5427"), -5, -2, 48, 36);
          const lockColor = chest.roaming ? "#72ffef" : chest.powerUp === "shield" ? "#72ffef" : chest.powerUp === "life" ? "#ff5b95" : chest.powerUp === "score" || chest.powerUp === "jackpot" ? "#ffd84d" : chest.powerUp === "repair" ? "#84fff2" : chest.powerUp === "phase" ? "#9c6bff" : "#c65cff";
          ctx.fillStyle = lockColor;
          ctx.fillRect(15, 12, 8, 9);
          const roamingTimer = chest === world.roamingChest ? world.roamingChestTimer : chest === world.roamingChestSecondary ? world.roamingChestSecondaryTimer : null;
          if (roamingTimer !== null) {
            const roamingDifficulty = difficultiesRef.current[world.sector - 1] as RoamingChestDifficulty;
            const ratio = Math.max(0, Math.min(1, roamingTimer / ROAMING_CHEST_RULES[roamingDifficulty].visibleSeconds));
            ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(0, 33, 38, 2);
            ctx.fillStyle = "#ff2b8a"; ctx.fillRect(0, 33, 38 * ratio, 2);
          }
          ctx.restore();
          continue;
        }
        ctx.shadowBlur = chest.opened || ultraActive ? 0 : 18;
        ctx.shadowColor = "#ffd84d";
        const wood = ctx.createLinearGradient(0, 0, 0, 30);
        wood.addColorStop(0, "#8b5427"); wood.addColorStop(0.45, "#4b2818"); wood.addColorStop(1, "#24110c");
        ctx.fillStyle = wood; ctx.strokeStyle = "#d59a42"; ctx.lineWidth = 2;
        roundedRect(ctx, 0, 10, 38, 20, 4); ctx.fill(); ctx.stroke();
        if (chest.opened) { ctx.beginPath(); ctx.moveTo(1, 10); ctx.lineTo(7, 0); ctx.lineTo(37, 0); ctx.lineTo(37, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        else { roundedRect(ctx, 0, 3, 38, 13, 5); ctx.fill(); ctx.stroke(); }
        ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,214,117,.72)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(8, 5); ctx.lineTo(8, 29); ctx.moveTo(30, 5); ctx.lineTo(30, 29); ctx.stroke();
        if (!chest.opened) {
          const lockColor = chest.powerUp === "shield" ? "#72ffef" : chest.powerUp === "life" ? "#ff5b95" : chest.powerUp === "score" || chest.powerUp === "jackpot" ? "#ffd84d" : chest.powerUp === "repair" ? "#84fff2" : chest.powerUp === "phase" ? "#9c6bff" : "#c65cff";
          ctx.fillStyle = lockColor; ctx.shadowBlur = ultraActive ? 0 : 12; ctx.shadowColor = lockColor; roundedRect(ctx, 15, 12, 8, 9, 2); ctx.fill();
        }
        const roamingTimer = chest === world.roamingChest ? world.roamingChestTimer : chest === world.roamingChestSecondary ? world.roamingChestSecondaryTimer : null;
        if (roamingTimer !== null && !chest.opened) {
          const roamingDifficulty = difficultiesRef.current[world.sector - 1] as RoamingChestDifficulty;
          const total = ROAMING_CHEST_RULES[roamingDifficulty].visibleSeconds;
          const ratio = Math.max(0, Math.min(1, roamingTimer / total));
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,255,255,.2)";
          ctx.fillRect(0, 33, 38, 2);
          ctx.fillStyle = "#ff2b8a";
          ctx.fillRect(0, 33, 38 * ratio, 2);
        }
        ctx.restore();
      }

      for (const enemy of world.enemies) {
        if (!enemy.alive || !visible(enemy.x, enemy.y, 40, 40)) continue;
        ctx.save();
        ctx.translate(enemy.x + 19, enemy.y + 16);
        if (enemy.guardian) ctx.scale(1.65, 1.65);
        const cachedEnemyVariant = world.sector - 1;
        const cachedEnemyArchetype = (enemy.kind + world.sector - 1) % 3;
        const cachedEnemySprite = getPreparedEnemySprite(cachedEnemyVariant, cachedEnemyArchetype, theme.accent, theme.secondary, theme.warning, false);
        // Enemy bodies are immutable for a sector/archetype. Draw the prepared
        // sprite and retain only health/freeze indicators as live canvas work.
        ctx.drawImage(cachedEnemySprite, -26, -26, 52, 52);
        if (enemy.frozen > 0) {
          ctx.globalAlpha = .72;
          ctx.strokeStyle = "#72ffef";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 26 + Math.sin(world.fxTime * 8) * 2, 0, Math.PI * 2); ctx.stroke();
        }
        if (enemy.guardian) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = theme.warning;
          ctx.font = "700 6px ui-monospace, monospace";
          ctx.fillText("GUARDIAN " + (enemy.integrity ?? 0) + "/" + (enemy.integrityMax ?? 5), -20, -29);
          ctx.fillStyle = "rgba(255,255,255,.16)";
          ctx.fillRect(-20, -26, 40, 3);
          ctx.fillStyle = theme.warning;
          ctx.fillRect(-20, -26, 40 * ((enemy.integrity ?? 0) / (enemy.integrityMax ?? 5)), 3);
        }
        ctx.restore();
        continue;
        // A compressed contact shadow anchors hovering robots in the same
        // perspective as the extruded platforms.
        ctx.save();
        ctx.globalAlpha = enemy.guardian ? .28 : .2;
        ctx.fillStyle = "#01040a";
        ctx.beginPath();
        ctx.ellipse(4, 23, enemy.guardian ? 23 : 15, enemy.guardian ? 5.5 : 3.8, -.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const tilt = Math.max(-0.18, Math.min(0.18, enemy.vy / 900));
        ctx.rotate(tilt);
        const enemyVariant = world.sector - 1;
        const enemyArchetype = (enemy.kind + world.sector - 1) % 3;
        const enemyAccent = theme.accent;
        const enemySecondary = theme.secondary;
        ctx.shadowBlur = ultraActive ? 0 : 24;
        ctx.shadowColor = enemyAccent;
        const shell = ctx.createLinearGradient(-18, -15, 18, 15);
        shell.addColorStop(0, enemySecondary);
        shell.addColorStop(0.46, "#0b1428");
        shell.addColorStop(1, "#090713");
        ctx.fillStyle = shell;
        ctx.beginPath();
        if (enemyVariant === 0) {
          roundedRect(ctx, -19, -16, 38, 31, 9);
        } else if (enemyVariant === 1) {
          ctx.moveTo(0, -20); ctx.lineTo(22, 0); ctx.lineTo(0, 18); ctx.lineTo(-22, 0); ctx.closePath();
        } else if (enemyVariant === 2) {
          for (let point = 0; point < 6; point += 1) {
            const angle = -Math.PI / 2 + point * Math.PI / 3;
            const x = Math.cos(angle) * 21;
            const y = Math.sin(angle) * 18;
            if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
        } else if (enemyVariant === 3) {
          ctx.moveTo(0, -22); ctx.lineTo(21, 17); ctx.lineTo(0, 10); ctx.lineTo(-21, 17); ctx.closePath();
        } else if (enemyVariant === 4) {
          ctx.ellipse(0, 0, 23, 14, 0, 0, Math.PI * 2);
        } else if (enemyVariant === 5) {
          ctx.moveTo(-18, -16); ctx.lineTo(18, -16); ctx.lineTo(23, -7); ctx.lineTo(16, 16); ctx.lineTo(-16, 16); ctx.lineTo(-23, -7); ctx.closePath();
        } else if (enemyVariant === 6) {
          ctx.moveTo(-24, -10); ctx.lineTo(-8, -18); ctx.lineTo(8, -18); ctx.lineTo(24, -10); ctx.lineTo(16, 17); ctx.lineTo(-16, 17); ctx.closePath();
        } else if (enemyVariant === 7) {
          ctx.arc(0, 2, 20, Math.PI, 0); ctx.lineTo(18, 17); ctx.lineTo(-18, 17); ctx.closePath();
        } else if (enemyVariant === 8) {
          ctx.moveTo(0, -23); ctx.lineTo(17, -4); ctx.lineTo(11, 20); ctx.lineTo(-11, 20); ctx.lineTo(-17, -4); ctx.closePath();
        } else if (enemyVariant === 10) {
          // Inferno: a vent drone with a living magma core.
          ctx.arc(0, 1, 20, 0, Math.PI * 2); ctx.moveTo(-15, 7); ctx.lineTo(-8, -18); ctx.lineTo(0, -9); ctx.lineTo(10, -21); ctx.lineTo(17, 8); ctx.closePath();
        } else if (enemyVariant === 11) {
          // Abyss: a manta-like data predator, visibly different from robots.
          ctx.moveTo(-25, 4); ctx.quadraticCurveTo(-8, -18, 0, -5); ctx.quadraticCurveTo(10, -18, 25, 4); ctx.quadraticCurveTo(8, 18, 0, 7); ctx.quadraticCurveTo(-8, 18, -25, 4); ctx.closePath();
        } else if (enemyVariant === 12) {
          // Air: a slim storm kite with a trailing stabilizer.
          ctx.moveTo(0, -25); ctx.lineTo(22, 3); ctx.lineTo(0, 16); ctx.lineTo(-22, 3); ctx.closePath(); ctx.moveTo(0, 16); ctx.lineTo(0, 25);
        } else {
          // Earth: a faceted, levitating mineral sentinel.
          ctx.moveTo(-23, 8); ctx.lineTo(-13, -17); ctx.lineTo(6, -21); ctx.lineTo(23, -4); ctx.lineTo(15, 19); ctx.lineTo(-10, 18); ctx.closePath();
        }
        ctx.fill();
        ctx.strokeStyle = enemyAccent;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,.26)";
        if (enemyVariant % 3 === 0) roundedRect(ctx, -12, -12, 24, 7, 3);
        else if (enemyVariant % 3 === 1) {
          ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(12, -9); ctx.lineTo(7, -2); ctx.lineTo(-7, -2); ctx.closePath();
        } else {
          ctx.beginPath(); ctx.arc(0, -7, 8, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = theme.warning;
        ctx.shadowBlur = ultraActive ? 0 : 11;
        ctx.shadowColor = theme.warning;
        if (enemyArchetype === 0) ctx.fillRect(enemy.vx > 0 ? 5 : -11, -10, 7, 3);
        else if (enemyArchetype === 1) {
          ctx.fillRect(-10, -10, 6, 4);
          ctx.fillRect(4, -10, 6, 4);
        } else {
          ctx.beginPath(); ctx.arc(0, -8, 4.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = enemyAccent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (enemyArchetype === 0) {
          ctx.moveTo(-12, 12); ctx.lineTo(-17, 21); ctx.lineTo(-21, 21);
          ctx.moveTo(11, 12); ctx.lineTo(17, 21); ctx.lineTo(21, 21);
        } else if (enemyArchetype === 1) {
          ctx.moveTo(-13, 11); ctx.lineTo(-19, 25); ctx.lineTo(-10, 28);
          ctx.moveTo(13, 11); ctx.lineTo(19, 25); ctx.lineTo(10, 28);
        } else {
          ctx.moveTo(-14, 10); ctx.lineTo(-24, 4); ctx.moveTo(14, 10); ctx.lineTo(24, 4);
          ctx.moveTo(-15, 14); ctx.lineTo(-26, 18); ctx.moveTo(15, 14); ctx.lineTo(26, 18);
        }
        ctx.stroke();
        ctx.strokeStyle = enemySecondary;
        ctx.lineWidth = enemy.guardian ? 2.5 : 1.7;
        ctx.beginPath();
        if (enemyVariant === 0) {
          ctx.moveTo(0, -16); ctx.lineTo(0, -28); ctx.arc(0, -30, 3, 0, Math.PI * 2);
        } else if (enemyVariant === 1) {
          ctx.moveTo(-16, -4); ctx.lineTo(-31, -16); ctx.moveTo(16, -4); ctx.lineTo(31, -16);
        } else if (enemyVariant === 2) {
          for (let spoke = 0; spoke < 6; spoke += 1) {
            const angle = spoke * Math.PI / 3;
            ctx.moveTo(Math.cos(angle) * 18, Math.sin(angle) * 15);
            ctx.lineTo(Math.cos(angle) * 30, Math.sin(angle) * 24);
          }
        } else if (enemyVariant === 3) {
          ctx.moveTo(-15, 12); ctx.lineTo(-27, 25); ctx.lineTo(-8, 20);
          ctx.moveTo(15, 12); ctx.lineTo(27, 25); ctx.lineTo(8, 20);
        } else if (enemyVariant === 4) {
          ctx.ellipse(0, 0, 31, 21, 0, 0, Math.PI * 2);
        } else if (enemyVariant === 5) {
          ctx.moveTo(-14, 9); ctx.lineTo(-30, 20); ctx.lineTo(-24, 29);
          ctx.moveTo(14, 9); ctx.lineTo(30, 20); ctx.lineTo(24, 29);
        } else if (enemyVariant === 6) {
          ctx.moveTo(-14, -11); ctx.lineTo(-34, -21); ctx.moveTo(14, -11); ctx.lineTo(34, -21);
          ctx.moveTo(-16, 9); ctx.lineTo(-34, 19); ctx.moveTo(16, 9); ctx.lineTo(34, 19);
        } else if (enemyVariant === 7) {
          ctx.moveTo(-14, 13); ctx.quadraticCurveTo(-22, 30, -11, 35);
          ctx.moveTo(0, 16); ctx.quadraticCurveTo(0, 34, 0, 39);
          ctx.moveTo(14, 13); ctx.quadraticCurveTo(22, 30, 11, 35);
        } else if (enemyVariant === 8) {
          for (let spike = 0; spike < 4; spike += 1) {
            const angle = Math.PI / 4 + spike * Math.PI / 2;
            ctx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
            ctx.lineTo(Math.cos(angle) * 34, Math.sin(angle) * 34);
          }
        } else {
          ctx.moveTo(-14, -5); ctx.lineTo(-28, -28); ctx.lineTo(-4, -17);
          ctx.moveTo(14, -5); ctx.lineTo(28, -28); ctx.lineTo(4, -17);
        }
        ctx.stroke();
        if (!enemy.guardian && enemyArchetype === 2) {
          ctx.globalAlpha = 0.75;
          ctx.strokeStyle = theme.warning;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 29, world.fxTime * 4, world.fxTime * 4 + Math.PI * 1.25);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = enemyAccent;
        ctx.beginPath();
        ctx.arc(0, 0, 24 + (enemyVariant % 4) * 2 + Math.sin(world.fxTime * (4 + enemyVariant % 3)) * 2, 0, Math.PI * 2);
        ctx.stroke();
        if (!enemy.guardian && enemy.kind === 4 && (enemy.integrity ?? 2) > 1) {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = theme.warning;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
        } else if (!enemy.guardian && enemy.kind === 3) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = theme.warning;
          ctx.fillRect(enemy.vx > 0 ? 18 : -28, -3, 10, 5);
        } else if (!enemy.guardian && enemy.kind === 5) {
          ctx.globalAlpha = 0.65;
          ctx.strokeStyle = theme.secondary;
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.ellipse(0, 18, 24, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
        if (!enemy.guardian && enemy.frozen > 0) {
          ctx.globalAlpha = 0.72;
          ctx.strokeStyle = "#72ffef";
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = ultraActive ? 0 : 18;
          ctx.shadowColor = "#72ffef";
          ctx.beginPath(); ctx.arc(0, 0, 27 + Math.sin(world.fxTime * 8) * 2, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = "rgba(114,255,239,.18)";
          ctx.fillRect(-18, -15, 36, 30);
          ctx.shadowBlur = 0;
        }
        if (enemy.guardian) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = enemySecondary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 30 + (enemyVariant % 3) * 3, world.fxTime * 0.8, world.fxTime * 0.8 + Math.PI * 1.55);
          ctx.stroke();
          ctx.fillStyle = theme.warning;
          ctx.font = "700 6px ui-monospace, monospace";
          ctx.fillText("GUARDIAN " + (enemy.integrity ?? 0) + "/" + (enemy.integrityMax ?? 5), -20, -29);
          ctx.fillStyle = "rgba(255,255,255,.16)";
          ctx.fillRect(-20, -26, 40, 3);
          ctx.fillStyle = theme.warning;
          ctx.fillRect(-20, -26, 40 * ((enemy.integrity ?? 0) / (enemy.integrityMax ?? 5)), 3);
        }
        ctx.restore();
      }

      // Sector emitters at the upper edge telegraph the origin of falling hazards.
      if (difficultiesRef.current[world.sector - 1] !== "easy") {
        ctx.save();
        ctx.globalAlpha = .68;
        for (const x of [VIEW_W * .18, VIEW_W * .5, VIEW_W * .82]) {
          ctx.fillStyle = theme.motif === 2 ? "#72ff4d" : theme.motif === 6 ? "#ffd84d" : theme.accent;
          ctx.beginPath(); ctx.arc(x, world.cameraY + 18, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#07111b"; ctx.fillRect(x - 5, world.cameraY + 14, 10, 5);
        }
        ctx.restore();
      }
      for (const particle of world.particles) {
        if (!visible(particle.x, particle.y, particle.hazard === "laser" ? 96 : 16, particle.hazard === "laser" ? 14 : 16, 40)) continue;
        ctx.globalAlpha = Math.min(1, particle.life * 2);
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = ultraActive ? 0 : 7;
        ctx.shadowColor = particle.color;
        const particleKind = particle.blockExplosion || particle.hazardStyle || particle.hazard || "spark";
        const particleSize = particle.hazard === "laser" ? 1 : (particle.size || (particle.hazard ? 10 : 4));
        const particleSprite = getPreparedParticleSprite(particleKind, particle.color);
        ctx.save();
        ctx.translate(particle.x, particle.y);
        if (particle.rotation) ctx.rotate(particle.rotation);
        if (particle.hazard === "laser") ctx.drawImage(particleSprite, -46, -6, 92, 12);
        else ctx.drawImage(particleSprite, -particleSize, -particleSize, particleSize * 2, particleSize * 2);
        ctx.restore();
        // The detailed silhouette above is a prepared sprite. In Ultra its
        // bloom and colour are submitted as a single GPU instance below.
        continue;
        if (particle.blockExplosion) {
          const size = particle.size || 5;
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rotation || 0);
          ctx.shadowBlur = 0;
          ctx.fillStyle = particle.color;
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = ultraActive ? 1.2 : 1;
          switch (particle.blockExplosion) {
            case "energy-bolt":
              ctx.globalAlpha *= .92;
              ctx.strokeStyle = particle.color;
              ctx.lineWidth = Math.max(1.2, size * .22);
              ctx.beginPath();
              ctx.moveTo(0, size * 1.1);
              ctx.lineTo(size * .26, size * .22);
              ctx.lineTo(-size * .2, -size * .05);
              ctx.lineTo(size * .48, -size * 1.2);
              ctx.stroke();
              ctx.globalAlpha *= .56;
              ctx.strokeStyle = "#e9ffff";
              ctx.lineWidth = Math.max(.7, size * .09);
              ctx.beginPath();
              ctx.moveTo(0, size * 1.05);
              ctx.lineTo(size * .23, size * .2);
              ctx.lineTo(-size * .15, -size * .05);
              ctx.lineTo(size * .43, -size * 1.15);
              ctx.stroke();
              break;
            case "cryo-shard":
            case "plasma-crystal":
              ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .62, size); ctx.lineTo(-size * .62, size); ctx.closePath(); ctx.fill();
              break;
            case "chrome-sliver":
              ctx.fillRect(-size * .24, -size, size * .48, size * 2.3);
              ctx.globalAlpha *= .52; ctx.fillStyle = "#ffffff"; ctx.fillRect(-size * .1, -size, size * .2, size * 2.3);
              break;
            case "toxic-splinter":
              ctx.beginPath(); ctx.arc(0, 0, size * .6, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha *= .44; ctx.beginPath(); ctx.arc(size * .5, -size * .35, size * .35, 0, Math.PI * 2); ctx.fill();
              break;
            case "fire-spark":
              ctx.beginPath(); ctx.moveTo(-size * .25, size); ctx.lineTo(0, -size * 1.35); ctx.lineTo(size * .25, size); ctx.closePath(); ctx.fill();
              break;
            case "sea-droplet":
              ctx.beginPath(); ctx.moveTo(0, -size); ctx.quadraticCurveTo(size, 0, 0, size); ctx.quadraticCurveTo(-size, 0, 0, -size); ctx.fill();
              break;
            case "solar-ray":
              ctx.fillRect(-size * .16, -size * 1.65, size * .32, size * 3.3);
              break;
            case "ghost-fragment":
              ctx.globalAlpha *= .68; ctx.strokeRect(-size * .72, -size * .72, size * 1.44, size * 1.44);
              break;
            case "rift-diamond":
              ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath(); ctx.fill();
              break;
            case "apex-star":
              ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .3, -size * .3); ctx.lineTo(size, 0); ctx.lineTo(size * .3, size * .3); ctx.lineTo(0, size); ctx.lineTo(-size * .3, size * .3); ctx.lineTo(-size, 0); ctx.lineTo(-size * .3, -size * .3); ctx.closePath(); ctx.fill();
              break;
            case "magma-burst":
              ctx.fillStyle = "#ff5c24"; ctx.beginPath(); ctx.arc(0, 0, size * .72, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff0a3"; ctx.beginPath(); ctx.arc(0, 0, size * .28, 0, Math.PI * 2); ctx.fill();
              break;
            case "bubble-spray":
              ctx.globalAlpha *= .74; ctx.strokeStyle = "#b2fff6"; ctx.beginPath(); ctx.arc(-size * .32, size * .18, size * .48, 0, Math.PI * 2); ctx.arc(size * .36, -size * .2, size * .32, 0, Math.PI * 2); ctx.stroke();
              break;
            case "wind-shard":
              ctx.beginPath(); ctx.moveTo(-size, 0); ctx.quadraticCurveTo(0, -size * .45, size, -size * .12); ctx.quadraticCurveTo(0, size * .35, -size, 0); ctx.fill();
              break;
            case "geode-fragment":
              ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .75, -size * .2); ctx.lineTo(size * .4, size); ctx.lineTo(-size * .55, size * .65); ctx.lineTo(-size, -size * .25); ctx.closePath(); ctx.fill();
              break;
          }
          ctx.restore();
        } else if (particle.hazard === "laser") {
          const length = 92;
          ctx.fillStyle = "rgba(255,43,138,.28)";
          ctx.fillRect(particle.x - length / 2, particle.y - 6, length, 12);
          ctx.fillStyle = "#fff1a8";
          ctx.fillRect(particle.x - length / 2, particle.y - 1.5, length, 3);
        } else if (particle.hazard) {
          const size = 8 + (theme.motif % 3) * 2;
          ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(world.fxTime * (1.5 + theme.motif * .1));
          ctx.fillStyle = theme.accent; ctx.strokeStyle = theme.warning; ctx.lineWidth = 1.4;
          switch (theme.motif) {
            case 0: ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath(); ctx.stroke(); break;
            case 1: ctx.fillStyle = theme.secondary; ctx.fillRect(-size, -size / 2, size * 2, size); ctx.fillStyle = theme.accent; ctx.fillRect(-size / 2, -size / 4, size, size / 2); break;
            case 2: ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#d9ff8a"; ctx.beginPath(); ctx.arc(-size / 3, -size / 4, 2, 0, Math.PI * 2); ctx.fill(); break;
            case 3: ctx.fillStyle = theme.warning; ctx.fillRect(-3, -size, 6, size * 2); ctx.fillStyle = theme.accent; ctx.fillRect(-size, -2, size * 2, 4); break;
            case 4: ctx.strokeStyle = theme.accent; ctx.beginPath(); ctx.arc(0, 0, size, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 2, size * .65, Math.PI, 0); ctx.stroke(); break;
            case 5: ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath(); ctx.fill(); break;
            case 6: ctx.fillStyle = theme.warning; ctx.fillRect(-size, -size, size * 2, size * 2); ctx.strokeStyle = "#6d2e0c"; ctx.strokeRect(-size, -size, size * 2, size * 2); ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.stroke(); break;
            case 7: ctx.setLineDash([2, 2]); ctx.strokeRect(-size, -size, size * 2, size * 2); ctx.setLineDash([]); break;
            case 8: ctx.strokeStyle = theme.secondary; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); break;
            default: ctx.fillStyle = theme.warning; ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .4, -size * .3); ctx.lineTo(size, 0); ctx.lineTo(size * .4, size * .3); ctx.lineTo(0, size); ctx.lineTo(-size * .4, size * .3); ctx.lineTo(-size, 0); ctx.lineTo(-size * .4, -size * .3); ctx.closePath(); ctx.fill(); break;
          }
          ctx.restore();
        } else {
          ctx.fillRect(particle.x, particle.y, 5, 5);
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      const p = world.player;
      const elementalIntensity = .45 + levelProgress(p.y) * .55;
      const elementalWave = Math.sin(world.fxTime * (world.sector === 13 ? 1.35 : 1.05) + world.sector * 1.7);
      const wetActive = world.sector === 12 && elementalWave > -.1;
      const windActive = world.sector === 13 && elementalWave > .32;
      const heatActive = world.sector === 11 && elementalWave > .48;
      const earthActive = world.sector === 14 && elementalWave > .62;
      // Environmental cues are rendered before the avatar and are tied one to
      // one to the physics phase above. The effect explains the influence,
      // instead of adding a hidden generic penalty to every element level.
      if (wetActive || windActive || heatActive || earthActive) {
        ctx.save();
        ctx.translate(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2);
        if (wetActive) {
          ctx.globalAlpha = .35 + elementalIntensity * .22;
          ctx.fillStyle = "#67edff";
          ctx.beginPath(); ctx.ellipse(0, 35, 24, 3.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#d8ffff";
          for (const offset of [-12, 1, 13]) { ctx.beginPath(); ctx.arc(offset, 28 + Math.sin(world.fxTime * 5 + offset) * 2, 1.8, 0, Math.PI * 2); ctx.fill(); }
        }
        if (windActive) {
          const direction = Math.sign(Math.sin(world.fxTime * .36)) || 1;
          ctx.globalAlpha = .36 + elementalIntensity * .25;
          ctx.strokeStyle = "#d4ffff"; ctx.lineWidth = 1.7;
          for (let streak = 0; streak < 3; streak++) {
            const y = -18 + streak * 14;
            const reach = 23 + streak * 8;
            ctx.beginPath();
            ctx.moveTo(-direction * reach, y);
            ctx.quadraticCurveTo(0, y - 5 + Math.sin(world.fxTime * 4 + streak) * 2, direction * reach, y + 1);
            ctx.stroke();
          }
        }
        if (heatActive) {
          ctx.globalAlpha = .32 + elementalIntensity * .25;
          ctx.strokeStyle = "#ffad45"; ctx.lineWidth = 2;
          for (const offset of [-13, 0, 13]) {
            ctx.beginPath();
            ctx.moveTo(offset, 31);
            ctx.quadraticCurveTo(offset + Math.sin(world.fxTime * 6 + offset) * 6, 18, offset + Math.sin(world.fxTime * 5 + offset) * 4, 5);
            ctx.stroke();
          }
        }
        if (earthActive) {
          ctx.globalAlpha = .35 + elementalIntensity * .24;
          ctx.strokeStyle = "#dca653"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(0, 35, 28, 5, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = "#8c673c";
          for (const offset of [-20, -8, 10, 22]) { ctx.fillRect(offset, 30 - Math.abs(Math.sin(world.fxTime * 7 + offset)) * 5, 2.5, 2.5); }
        }
        ctx.restore();
      }
      if (!(p.invulnerable > 0 && Math.floor(p.invulnerable * 12) % 2 === 0)) {
        ctx.save();
        ctx.translate(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2);
        ctx.scale(p.facing, 1);
        ctx.save();
        ctx.globalAlpha = .24;
        ctx.fillStyle = "#01040a";
        ctx.beginPath();
        ctx.ellipse(4, 36, 18, 4.5, -.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.shield > 0) {
          ctx.globalAlpha = 0.32 + Math.sin(world.fxTime * 5) * 0.08;
          ctx.fillStyle = "rgba(114,255,239,.12)";
          ctx.strokeStyle = "#72ffef";
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = ultraActive ? 0 : 18;
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
          ctx.shadowBlur = ultraActive ? 0 : 16;
          ctx.shadowColor = "#ffd84d";
          ctx.beginPath();
          ctx.arc(0, 2, 34 + Math.sin(world.fxTime * 6) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
        // Motion trail and suit aura.
        if (p.avatar !== "bikini" && (Math.abs(p.vy) > 90 || Math.abs(p.vx) > 100)) {
          ctx.globalAlpha = 0.18;
          for (let i = 1; i <= 3; i++) {
            ctx.fillStyle = i % 2 ? "#00f0ff" : "#ff2b8a";
            roundedRect(ctx, -17 - p.vx * 0.008 * i, -24 - p.vy * 0.004 * i, 34, 48, 9);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        const pickaxeColors = ["#ffd84d", "#00f0ff", "#ff2b8a", "#72ff4d", "#ff9f32", "#c65cff", "#84fff2", "#9c6bff", "#ffffff", "#ffcf4a"];
        const pickaxeStyleColor = pickaxeColors[Math.min(9, p.pickaxeStyle - 1)];
        const pickaxeColor = p.overdrive > 0 ? "#ffd84d" : theme.accent;
        const pickaxeVariant = world.sector - 1;
        const renderPower = Math.min(10, p.pickaxePower + (p.overdrive > 0 ? 3 : 0));
        const metal = ctx.createLinearGradient(-16, -22, 16, 24);
        metal.addColorStop(0, "#54728a");
        metal.addColorStop(0.32, "#152b40");
        metal.addColorStop(1, "#030914");

        const bikiniAvatar = bikiniAvatarImageRef.current;
        if (p.avatar === "bikini" && bikiniAvatar?.complete && bikiniAvatar.naturalWidth > 0) {
          ctx.save();
          ctx.shadowBlur = ultraActive ? 0 : 12;
          ctx.shadowColor = "#ff2b8a";
          drawAnimatedBikiniAvatar(ctx, bikiniAvatar, world.fxTime, p.vx, p.vy, !p.grounded);
          ctx.restore();
        } else if (p.avatar === "bikini") {
          // Cosmetic cheat: clearly adult arcade heroine with a stylised bikini outfit.
          ctx.strokeStyle = "#d9a48e";
          ctx.lineCap = "round";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-7, 18); ctx.lineTo(-10, 33);
          ctx.moveTo(7, 18); ctx.lineTo(11, 33);
          ctx.moveTo(-12, -2); ctx.lineTo(-20, 12);
          ctx.moveTo(12, -2); ctx.lineTo(20, 10);
          ctx.stroke();
          ctx.fillStyle = "#f2bea4";
          ctx.beginPath(); ctx.ellipse(-10, 35, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(11, 35, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#24122e";
          ctx.beginPath(); ctx.ellipse(0, -19, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#f2bea4";
          ctx.beginPath(); ctx.ellipse(0, -18, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ff2b8a";
          ctx.fillRect(-5, -19, 3, 2); ctx.fillRect(3, -19, 3, 2);
          ctx.fillStyle = "#110916";
          ctx.beginPath(); ctx.arc(0, -14, 2, 0, Math.PI); ctx.strokeStyle = "#110916"; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = "#ff2b8a";
          ctx.strokeStyle = "#ff80b8";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-10, -5); ctx.quadraticCurveTo(0, -11, 10, -5); ctx.lineTo(7, 4); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#f2bea4";
          ctx.fillRect(-6, 4, 12, 12);
          ctx.fillStyle = "#25102f";
          ctx.beginPath(); ctx.moveTo(-8, 13); ctx.lineTo(8, 13); ctx.lineTo(5, 21); ctx.lineTo(-5, 21); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#ff80b8"; ctx.stroke();
          ctx.fillStyle = "#ff2b8a";
          ctx.fillRect(-6, 14, 12, 5);
        } else {
        drawLevelRobot(ctx, robotProfileRef.current || world.sector, theme, world.fxTime, p.vx, p.vy, p.grounded, p.damage, ultraActive);
        // Kept temporarily as a visual reference while the new level-specific
        // renderer is validated locally; it is not executed.
        if (false) {
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

        ctx.shadowBlur = ultraActive ? 0 : 22;
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
        ctx.shadowBlur = ultraActive ? 0 : 8;
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
        ctx.globalAlpha = p.damage > 1 && Math.floor(world.fxTime * 9) % 3 === 0 ? 0.12 : 1;
        ctx.fillRect(4, -19, 5, 3);
        ctx.globalAlpha = 1;
        if (p.damage > 0) {
          ctx.strokeStyle = p.damage > 2 ? "#ff365f" : "#ff9b35";
          ctx.lineWidth = 1.5;
          for (let crack = 0; crack < p.damage; crack++) {
            ctx.beginPath();
            ctx.moveTo(-10 + crack * 8, -1);
            ctx.lineTo(-5 + crack * 7, 8);
            ctx.lineTo(-9 + crack * 8, 17);
            ctx.stroke();
          }
          for (let spark = 0; spark < p.damage * 2; spark++) {
            const angle = world.fxTime * (4 + spark) + spark * 2.1;
            ctx.fillStyle = spark % 2 ? "#ff9b35" : "#ff365f";
            ctx.fillRect(Math.cos(angle) * (18 + spark * 2), Math.sin(angle) * (20 + spark * 2), 2, 5);
          }
        }
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -25); ctx.lineTo(3, -31); ctx.stroke();
        ctx.fillStyle = pickaxeStyleColor;
        ctx.beginPath(); ctx.arc(3, -32, 2, 0, Math.PI * 2); ctx.fill();
        }
        }

        const idlePlaying = p.idleTime > 0.75;
        const attackProgress = p.attack > 0 ? 1 - p.attack / 0.22 : 0;
        const pickAngle = p.attack > 0
          ? -1.2 + attackProgress * 2.15
          : idlePlaying ? -0.25 + Math.sin(world.fxTime * 4.2) * 0.72 : -0.42;
        const humanAvatar = p.avatar === "bikini";
        const handReach = humanAvatar ? 8 : 14;
        const handX = (humanAvatar ? 8 : 13) + Math.cos(pickAngle) * handReach;
        const handY = (humanAvatar ? -4 : -1) + Math.sin(pickAngle) * handReach;
        ctx.strokeStyle = p.avatar === "bikini" ? "#d9a48e" : "#5b8298";
        ctx.lineWidth = p.avatar === "bikini" ? 4 : 5;
        ctx.beginPath(); ctx.moveTo(12, -3); ctx.lineTo(handX, handY); ctx.stroke();
        ctx.fillStyle = p.avatar === "bikini" ? "#f2bea4" : "#9afcff";
        ctx.beginPath(); ctx.arc(handX, handY, 3.2, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(pickAngle);
        ctx.shadowBlur = ultraActive ? 0 : 9 + p.pickaxeStyle;
        ctx.shadowColor = pickaxeColor;
        if (humanAvatar) {
          // Compact pulse pistol: visual-only, with the original attack range
          // and damage still provided by the shared gameplay pickaxe logic.
          ctx.strokeStyle = pickaxeStyleColor;
          ctx.fillStyle = "#14243d";
          roundedRect(ctx, -4, -5, 15, 10, 2); ctx.fill();
          ctx.strokeStyle = pickaxeStyleColor; ctx.lineWidth = 1.7;
          roundedRect(ctx, -4, -5, 15, 10, 2); ctx.stroke();
          ctx.fillStyle = "#09111e";
          ctx.fillRect(10, -2.5, 9, 5);
          ctx.fillStyle = pickaxeStyleColor;
          ctx.fillRect(11, -1, 9, 2);
          ctx.fillStyle = "#17233a";
          ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(6, 4); ctx.lineTo(3, 11); ctx.lineTo(-2, 9); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#1c2940";
          ctx.fillRect(-8, -3, 4, 6);
          ctx.fillStyle = pickaxeColor;
          ctx.beginPath(); ctx.arc(20, 0, 2.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(20, 0, 1, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = pickaxeColor;
          ctx.lineWidth = 3 + Math.min(2, renderPower * 0.16);
          ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(29, 0); ctx.stroke();
          ctx.strokeStyle = "#dffcff";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          if (pickaxeVariant === 0) {
          ctx.moveTo(24, -17); ctx.quadraticCurveTo(31, -4, 27, 0); ctx.quadraticCurveTo(31, 5, 22, 12);
          } else if (pickaxeVariant === 1) {
          ctx.moveTo(21, -18); ctx.lineTo(31, -9); ctx.lineTo(25, 0); ctx.lineTo(31, 9); ctx.lineTo(21, 18);
          } else if (pickaxeVariant === 2) {
          ctx.moveTo(21, -18); ctx.lineTo(30, -13); ctx.lineTo(25, -3); ctx.moveTo(25, 3); ctx.lineTo(30, 13); ctx.lineTo(21, 18);
          } else if (pickaxeVariant === 3) {
          ctx.moveTo(20, -18); ctx.lineTo(32, -10); ctx.lineTo(24, -4); ctx.lineTo(34, 3); ctx.lineTo(22, 15);
          } else if (pickaxeVariant === 4) {
          ctx.moveTo(22, -19); ctx.lineTo(30, -12); ctx.lineTo(26, -2); ctx.lineTo(33, 0); ctx.lineTo(26, 2); ctx.lineTo(30, 12); ctx.lineTo(22, 19);
          } else if (pickaxeVariant === 5) {
          ctx.moveTo(20, -20); ctx.quadraticCurveTo(36, -12, 29, 3); ctx.quadraticCurveTo(26, 15, 16, 17);
          } else if (pickaxeVariant === 6) {
          ctx.moveTo(18, -17); ctx.lineTo(33, -17); ctx.lineTo(33, 17); ctx.lineTo(18, 17); ctx.closePath();
          } else if (pickaxeVariant === 7) {
          ctx.moveTo(19, -20); ctx.quadraticCurveTo(35, -2, 19, 20); ctx.lineTo(26, 4); ctx.lineTo(26, -4); ctx.closePath();
          } else if (pickaxeVariant === 8) {
          ctx.moveTo(20, -20); ctx.lineTo(32, -8); ctx.lineTo(26, 0); ctx.lineTo(32, 8); ctx.lineTo(20, 20);
          } else {
          ctx.moveTo(18, -20); ctx.lineTo(27, -11); ctx.lineTo(31, -20); ctx.lineTo(35, 0); ctx.lineTo(31, 20); ctx.lineTo(27, 11); ctx.lineTo(18, 20);
          }
          ctx.stroke();
          ctx.fillStyle = pickaxeStyleColor;
          ctx.beginPath(); ctx.arc(28, 0, 3, 0, Math.PI * 2); ctx.fill();
        }
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

      // Ultra foreground: dense rain and animated neon bloom make the mode
      // immediately recognisable, including on the ready screen.
      if (ultraActive) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let streak = 0; streak < 150; streak++) {
          const x = (streak * 47 + world.fxTime * (95 + streak % 7 * 13)) % (view.width + 70) - 35;
          const y = (streak * 83 + world.fxTime * (410 + streak % 5 * 42)) % (view.height + 120) - 60;
          ctx.globalAlpha = 0.1 + (streak % 4) * 0.04;
          ctx.strokeStyle = streak % 5 === 0 ? theme.secondary : theme.accent;
          ctx.lineWidth = streak % 6 === 0 ? 1.4 : 0.7;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 5, y + 18 + (streak % 5) * 5);
          ctx.stroke();
        }
        const bloomX = view.width * (0.25 + Math.sin(world.fxTime * 0.31) * 0.14);
        const bloom = ctx.createRadialGradient(bloomX, view.height * 0.28, 4, bloomX, view.height * 0.28, 180);
        bloom.addColorStop(0, "rgba(255,255,255,.19)");
        bloom.addColorStop(0.22, "rgba(0,240,255,.12)");
        bloom.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = bloom;
        ctx.fillRect(bloomX - 180, view.height * 0.28 - 180, 360, 360);
        ctx.restore();
      }

      const stressScene = world.showcaseBenchmark || (
        LOCAL_LEVEL_ONE_ULTRA_STRESS_TEST
        && world.status === "playing"
        && world.sector === 1
        && qualityRef.current === "ultra"
      );
      if (stressScene) {
        // Intentionally denser than normal play: this is the desktop visual
        // stress scene, while the selected quality still controls its budget.
        const showcaseDensity = qualityRef.current === "low" ? .22 : qualityRef.current === "medium" ? .48 : qualityRef.current === "high" ? .72 : 1;
        if (world.showcaseBenchmark) {
          // Simulate the heaviest weather levels as well as the Level 14 base
          // scene. This keeps the benchmark above rain-heavy real gameplay.
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.lineCap = "round";
          for (let rain = 0; rain < Math.round(200 * showcaseDensity); rain += 1) {
            const speed = 380 + (rain % 11) * 38;
            const x = (rain * 83 + world.fxTime * (88 + rain % 7 * 17)) % (view.width + 80) - 40;
            const y = (rain * 131 + world.fxTime * speed) % (view.height + 140) - 70;
            ctx.globalAlpha = .07 + (rain % 5) * .025;
            ctx.strokeStyle = rain % 4 === 0 ? "#ff2b8a" : rain % 3 === 0 ? "#ffd84d" : "#00f0ff";
            ctx.lineWidth = .65 + (rain % 4) * .24;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 6 - (rain % 4) * 2, y + 22 + (rain % 6) * 6);
            ctx.stroke();
          }
          for (let fog = 0; fog < 12; fog += 1) {
            const x = (fog * 149 + Math.sin(world.fxTime * (.35 + fog * .04) + fog) * 130 + view.width) % view.width;
            const y = (fog * 83 + world.fxTime * (14 + fog * 2)) % (view.height + 130) - 65;
            const mist = ctx.createRadialGradient(x, y, 4, x, y, 110 + (fog % 4) * 34);
            mist.addColorStop(0, fog % 2 ? "rgba(255,43,138,.075)" : "rgba(0,240,255,.085)");
            mist.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalAlpha = 1;
            ctx.fillStyle = mist;
            ctx.fillRect(x - 170, y - 170, 340, 340);
          }
          ctx.restore();
        }
        const orbitCount = Math.round(96 * showcaseDensity);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.translate(view.width / 2, view.height * .47);
        for (let orbit = 0; orbit < orbitCount; orbit += 1) {
          const angle = world.fxTime * (.55 + (orbit % 6) * .07) + orbit * 2.399;
          const radius = 80 + (orbit % 18) * 17 + Math.sin(world.fxTime * 1.8 + orbit) * 16;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle * 1.37) * radius * .42;
          const light = 2 + (orbit % 4) * 1.5;
          ctx.globalAlpha = .10 + (orbit % 5) * .035;
          ctx.fillStyle = orbit % 3 === 0 ? theme.warning : orbit % 2 ? theme.accent : theme.secondary;
          ctx.shadowBlur = 10 + (orbit % 4) * 7;
          ctx.shadowColor = ctx.fillStyle;
          ctx.beginPath();
          ctx.arc(x, y, light, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        for (let beam = 0; beam < Math.round(22 * showcaseDensity); beam += 1) {
          const angle = world.fxTime * (.18 + (beam % 4) * .04) + beam * Math.PI / 11;
          ctx.rotate(angle * .012);
          const beamGradient = ctx.createLinearGradient(-view.width * .7, 0, view.width * .7, 0);
          beamGradient.addColorStop(0, "rgba(0,0,0,0)");
          beamGradient.addColorStop(.48, beam % 2 ? "rgba(0,240,255,.10)" : "rgba(255,43,138,.10)");
          beamGradient.addColorStop(.52, beam % 2 ? "rgba(0,240,255,.10)" : "rgba(255,43,138,.10)");
          beamGradient.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = beamGradient;
          ctx.fillRect(-view.width * .7, -1 - (beam % 3), view.width * 1.4, 2 + (beam % 3) * 2);
        }
        ctx.restore();
      }

      if (world.status === "won" && world.sector === LEVEL_COUNT) {
        const sunrise = ctx.createLinearGradient(0, 0, 0, view.height);
        sunrise.addColorStop(0, "rgba(255,218,121,.34)");
        sunrise.addColorStop(0.46, "rgba(255,117,112,.16)");
        sunrise.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunrise;
        ctx.fillRect(0, 0, view.width, view.height);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.translate(view.width / 2, view.height * 0.38);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#00f0ff";
        ctx.beginPath(); ctx.moveTo(0, 160); ctx.lineTo(0, -95); ctx.stroke();
        for (let ray = 0; ray < 8; ray++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -145); ctx.stroke();
        }
        ctx.restore();
      }

      // Layered fog and light shafts bind foreground and skyline together.
      if (mobileHigh) {
        drawMobileFog(world, settings);
      } else {
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
      }

      drawStaticOverlay();

      if (world.status === "celebration") {
        const elapsed = 5 - world.celebrationTime;
        const beat = (Math.sin(elapsed * Math.PI * 2.4) + 1) / 2;
        const pulse = 0.84 + beat * 0.16;
        ctx.save();
        ctx.setTransform(sx, 0, 0, sy, 0, 0);
        ctx.fillStyle = "rgba(1, 5, 16, .92)";
        ctx.fillRect(0, 0, view.width, view.height);
        const glow = ctx.createRadialGradient(view.width / 2, view.height * .48, 10, view.width / 2, view.height * .48, Math.max(view.width, view.height) * .58);
        glow.addColorStop(0, "rgba(255, 43, 138, .32)");
        glow.addColorStop(.35, "rgba(0, 240, 255, .16)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, view.width, view.height);
        ctx.globalCompositeOperation = "screen";
        for (let bar = 0; bar < 18; bar++) {
          const x = (bar + .5) * view.width / 18;
          const height = (34 + ((Math.sin(elapsed * (4 + bar % 4) + bar) + 1) * .5) * 78) * pulse;
          ctx.fillStyle = bar % 2 ? "rgba(255, 43, 138, .58)" : "rgba(0, 240, 255, .58)";
          ctx.fillRect(x - 5, view.height - 48 - height, 10, height);
        }
        const avatarHeight = Math.min(view.height * .72, 410) * pulse;
        ctx.save();
        ctx.translate(view.width / 2, view.height * .53);
        ctx.shadowBlur = 28;
        ctx.shadowColor = "#ff2b8a";
        drawHologramDancer(ctx, elapsed, avatarHeight / 371);
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#ffd84d";
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#ffd84d";
        ctx.font = `900 ${Math.max(18, Math.min(34, view.width * .055))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = "center";
        ctx.fillText(isDe ? "SKYBREAK DANCE" : "SKYBREAK DANCE", view.width / 2, Math.max(48, view.height * .11));
        ctx.shadowBlur = 0;
        ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = "#e8fbff";
        ctx.fillText(`${Math.ceil(world.celebrationTime)} ${isDe ? "SEK." : "SEC."}`, view.width / 2, Math.max(70, view.height * .11 + 25));
        ctx.restore();
      }

      if (world.status === "bikiniShowcase") {
        const look = BIKINI_LOOKS[Math.max(0, Math.min(BIKINI_LOOKS.length - 1, world.sector - 1))];
        const elapsed = 5 - world.celebrationTime;
        const pulse = .93 + (Math.sin(elapsed * Math.PI * 2.1) + 1) * .035;
        const avatar = bikiniAvatarImageRef.current;
        const naturalAspect = avatar?.complete && avatar.naturalHeight > 0 ? avatar.naturalWidth / avatar.naturalHeight : 176 / 371;
        const unclampedHeight = Math.min(view.height * .77, 438) * pulse;
        const avatarWidth = Math.min(view.width * .72, unclampedHeight * naturalAspect);
        const avatarHeight = avatarWidth / naturalAspect;
        ctx.save();
        ctx.setTransform(sx, 0, 0, sy, 0, 0);
        ctx.fillStyle = "rgba(1, 5, 16, .95)";
        ctx.fillRect(0, 0, view.width, view.height);
        const stage = ctx.createRadialGradient(view.width / 2, view.height * .47, 8, view.width / 2, view.height * .47, Math.max(view.width, view.height) * .6);
        stage.addColorStop(0, `${look.primary}66`);
        stage.addColorStop(.44, `${look.secondary}25`);
        stage.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = stage;
        ctx.fillRect(0, 0, view.width, view.height);
        ctx.globalCompositeOperation = "screen";
        for (let line = 0; line < 11; line += 1) {
          ctx.strokeStyle = line % 2 ? look.primary : look.secondary;
          ctx.globalAlpha = .25 + (line % 3) * .1;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, view.height * (.21 + line * .055)); ctx.lineTo(view.width, view.height * (.13 + line * .064)); ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(view.width / 2, view.height * .55);
        ctx.shadowBlur = 26;
        ctx.shadowColor = look.primary;
        if (avatar?.complete && avatar.naturalWidth > 0) {
          ctx.drawImage(avatar, -avatarWidth / 2, -avatarHeight / 2, avatarWidth, avatarHeight);
        }
        ctx.restore();
        ctx.fillStyle = look.primary;
        ctx.shadowBlur = 16;
        ctx.shadowColor = look.primary;
        ctx.font = `900 ${Math.max(18, Math.min(32, view.width * .052))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = "center";
        ctx.fillText("BIKINI LOOK", view.width / 2, Math.max(46, view.height * .09));
        ctx.shadowBlur = 0;
        ctx.fillStyle = look.secondary;
        ctx.font = "800 13px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(`LEVEL ${world.sector.toString().padStart(2, "0")} // ${look.name}`, view.width / 2, Math.max(70, view.height * .09 + 25));
        ctx.restore();
      }

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
    let nextFrameDue = 0;
    const loop = (time: number) => {
      const world = worldRef.current;
      const mobileHigh = qualityRef.current === "high" && window.matchMedia("(pointer: coarse)").matches;
      const selectedFrameRate = ultraUnlimitedRef.current ? 0 : mobileUltra120Ref.current ? 120 : 60;
      const targetFps = qualityRef.current === "ultra"
        ? (ultraUnlimitedRef.current ? 0 : ultraFpsRef.current)
        : selectedFrameRate;
      const frameInterval = targetFps > 0 ? 1000 / targetFps : 0;
      if (targetFps > 0) {
        if (!nextFrameDue) nextFrameDue = time;
        if (time + 0.35 < nextFrameDue) {
          frame = requestAnimationFrame(loop);
          return;
        }
      }
      const renderedFrameMs = lastRenderedFrame ? time - lastRenderedFrame : 0;
      lastRenderedFrame = time;
      // Advance a timeline instead of waiting a full interval after each
      // rendered callback. This avoids half-rate rendering on Safari's
      // 80/96 Hz refresh schedules.
      if (targetFps > 0) {
        nextFrameDue += frameInterval;
        if (nextFrameDue < time - frameInterval) nextFrameDue = time + frameInterval;
      }
      const dt = world.lastTime ? Math.min(0.033, (time - world.lastTime) / 1000) : 0;
      world.lastTime = time;
      const updateStartedAt = performance.now();
      update(world, dt);
      const updateMs = performance.now() - updateStartedAt;
      const drawStartedAt = performance.now();
      draw(world);
      const drawMs = performance.now() - drawStartedAt;
      const telemetry = frameTelemetryRef.current;
      if (!telemetry.lastSampleAt) telemetry.lastSampleAt = time;
      if (renderedFrameMs > 0) {
        telemetry.frames += 1;
        telemetry.totalFrameMs += renderedFrameMs;
        telemetry.totalUpdateMs += updateMs;
        telemetry.totalDrawMs += drawMs;
      }
      const inGameBenchmark = inGameBenchmarkRef.current;
      // Safari's rAF timestamp may use a document timeline with a different
      // offset from performance.now(). Use one clock for start and finish.
      const benchmarkElapsed = performance.now() - inGameBenchmark.startedAt;
      if (inGameBenchmark.active && renderedFrameMs > 0 && benchmarkElapsed >= 2000) {
        inGameBenchmark.frames += 1;
        inGameBenchmark.totalFrameMs += renderedFrameMs;
        inGameBenchmark.totalUpdateMs += updateMs;
        inGameBenchmark.totalDrawMs += drawMs;
      }
      if (inGameBenchmark.active && benchmarkElapsed >= 32000) {
        finishInGameBenchmark(world);
      }
      const sampleDuration = time - telemetry.lastSampleAt;
      if (telemetry.frames > 0 && sampleDuration >= 1000) {
        setFrameTelemetry({
          fps: Math.round((telemetry.frames * 1000) / sampleDuration),
          frameMs: Math.round((telemetry.totalFrameMs / telemetry.frames) * 10) / 10,
          updateMs: Math.round((telemetry.totalUpdateMs / telemetry.frames) * 10) / 10,
          drawMs: Math.round((telemetry.totalDrawMs / telemetry.frames) * 10) / 10,
        });
        telemetry.frames = 0;
        telemetry.totalFrameMs = 0;
        telemetry.totalUpdateMs = 0;
        telemetry.totalDrawMs = 0;
        telemetry.lastSampleAt = time;
      }
      if (mobileHigh && world.status === "playing") {
        const thermal = mobileHighThermalRef.current;
        thermal.totalWork += updateMs + drawMs;
        thermal.samples += 1;
        if (thermal.samples >= 45) {
          const averageWork = thermal.totalWork / thermal.samples;
          const nextActive = thermal.active ? averageWork > 7 : averageWork > 12;
          if (nextActive !== thermal.active) {
            thermal.active = nextActive;
            setThermalProtection(nextActive);
            window.dispatchEvent(new Event("skybreak-quality"));
          }
          thermal.samples = 0;
          thermal.totalWork = 0;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("skybreak-quality", resize);
    };
  }, [finishInGameBenchmark, syncHud]);

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
    const now = performance.now();
    const unlockCheat = audioUnlockCheatRef.current;
    const next = !soundEnabledRef.current;
    // Two completed SFX off/on cycles arm the code. Turning music off within
    // five seconds confirms it and persists all cosmetic/content unlocks.
    if (next) {
      unlockCheat.cycles = now - unlockCheat.lastCycle <= 5000 ? unlockCheat.cycles + 1 : 1;
      unlockCheat.lastCycle = now;
      unlockCheat.awaitingMusicOff = unlockCheat.cycles >= 2;
      if (unlockCheat.awaitingMusicOff) {
        const world = worldRef.current;
        const message = isDe ? "FREISCHALTCODE ERKANNT // MUSIK AUSSCHALTEN" : "UNLOCK CODE DETECTED // TURN MUSIC OFF";
        world.powerUpMessage = world.status === "playing" ? message : "";
        world.powerUpMessageTime = world.status === "playing" ? 2.5 : 0;
        showOverlayNotice(message, 2500);
      }
    }
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    audioRef.current ??= createAudio();
    audioRef.current.setSoundEnabled(next);
  };

  const toggleMusic = () => {
    const now = performance.now();
    const unlockCheat = audioUnlockCheatRef.current;
    const next = !musicEnabledRef.current;
    musicEnabledRef.current = next;
    setMusicEnabled(next);
    if (!next && unlockCheat.awaitingMusicOff && now - unlockCheat.lastCycle <= 5000) {
      unlockCheat.cycles = 0;
      unlockCheat.awaitingMusicOff = false;
      unlockAllContent();
    } else if (!next) {
      unlockCheat.cycles = 0;
      unlockCheat.awaitingMusicOff = false;
    }
    if (!next) {
      audioRef.current?.pauseMusic();
      return;
    }
    audioRef.current ??= createAudio();
    audioRef.current.setSoundEnabled(soundEnabledRef.current);
    void audioRef.current.playMusic(worldRef.current.sector);
  };

  const toggleFrameTelemetry = () => {
    const next = !showFrameTelemetry;
    setShowFrameTelemetry(next);
    setStoredItem("skybreak-show-fps", String(next));
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
    status === "ready" ? "SKYBREAK PROTOCOL" : status === "paused" ? (isDe ? "SYSTEM PAUSIERT" : "SYSTEM PAUSED") : status === "chestChoice" ? (isDe ? "BELOHNUNG ERFASST" : "REWARD ACQUIRED") : status === "upgrade" ? (isDe ? "LEVEL GESCHAFFT" : "LEVEL COMPLETE") : status === "won" ? (sector === LEVEL_COUNT ? (isDe ? "GIPFEL ERREICHT" : "SUMMIT REACHED") : (isDe ? "LEVEL GESCHAFFT" : "LEVEL COMPLETE")) : (isDe ? "LAUF BEENDET" : "RUN TERMINATED");
  const overlayCopy =
    status === "ready"
      ? (isDe
        ? `Sektorprofil: ${LEVEL_GAMEPLAY[selectedStartLevel - 1].de}. Durchbrich ${LEVEL_COUNT} Cyberpunk-Level und erreiche den Sendeturm.`
        : `Sector profile: ${LEVEL_GAMEPLAY[selectedStartLevel - 1].en}. Break through ${LEVEL_COUNT} cyberpunk levels and reach the transmission tower.`)
      : status === "paused"
        ? (isDe ? "Die Zeit steht still. Noch." : "Time stands still. For now.")
        : status === "chestChoice"
          ? (isDe ? "Wähle die Belohnung, die dir für den weiteren Aufstieg am meisten hilft." : "Choose the reward that helps your ascent most.")
        : status === "upgrade"
          ? (isDe ? `Level ${sector} abgeschlossen. Wähle ein Eispickel-Upgrade für Level ${Math.min(LEVEL_COUNT, sector + 1)}.` : `Level ${sector} complete. Choose an ice-pick upgrade for level ${Math.min(LEVEL_COUNT, sector + 1)}.`)
        : status === "won"
          ? (isDe ? `Level ${sector} befreit · ${score.toLocaleString("de-AT")} Punkte` : `Level ${sector} liberated · ${score.toLocaleString("en-US")} points`)
          : (isDe ? `Dein Lauf endet bei ${score.toLocaleString("de-AT")} Punkten.` : `Your run ends at ${score.toLocaleString("en-US")} points.`);

  const nextPickaxePower = Math.min(10, pickaxeStats.power + 1);
  const nextPickaxeStyle = Math.min(10, pickaxeStats.style + 1);
  const nextStylePreview = PICKAXE_STYLES[nextPickaxeStyle - 1];

  return (
    <main className={`game-shell${immersiveMode ? " immersive-mode" : ""}`} onPointerDownCapture={ensureAudio}>
      <header className="topbar">
        <div className="brand">
          <button className="brand-mark" type="button" onClick={armCheats} aria-label={isDe ? "Skybreak-Protokoll-Symbol" : "Skybreak Protocol symbol"}>SP</button>
          <div>
            <strong>SKYBREAK PROTOCOL</strong>
            <span>VERTICAL ARCADE PROTOCOL</span>
            {showFrameTelemetry && mobileDevice && status === "playing" && frameTelemetry && (
              <output className="mobile-performance-hud" aria-label={isDe ? "Aktuelle Bildrate" : "Current frame rate"}>
                {frameTelemetry.fps} FPS · {frameTelemetry.frameMs} MS
              </output>
            )}
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
          {showFrameTelemetry && frameTelemetry && <span className="performance-hud">LIVE {frameTelemetry.fps} FPS · CPU {frameTelemetry.updateMs}+{frameTelemetry.drawMs} MS</span>}
          <button className="icon-button" onClick={toggleFrameTelemetry} aria-pressed={showFrameTelemetry} aria-label={showFrameTelemetry ? (isDe ? "FPS-Anzeige ausschalten" : "Disable FPS display") : (isDe ? "FPS-Anzeige einschalten" : "Enable FPS display")}>
            {showFrameTelemetry ? "FPS ON" : "FPS OFF"}
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
        {contentUnlockNotice && status === "playing" && (
          <output className="content-unlock-notice" role="status">
            {contentUnlockNotice}
          </output>
        )}
        {status !== "playing" && status !== "celebration" && status !== "bikiniShowcase" && (
          <div className="game-overlay">
            {contentUnlockNotice && (
              <output className="content-unlock-notice" role="status">
                {contentUnlockNotice}
              </output>
            )}
            {status === "ready" && (
              <nav className="start-shortcuts" aria-label={isDe ? "Startmenü-Links" : "Start menu links"}>
                <a className="changelog-link" href={`${CHANGELOG_BASE_URL}/${APP_VERSION}${isDe ? "" : ".en"}.md`} target="_blank" rel="noopener">CHANGELOG ↗</a>
                <a className="language-link" href={languageHref} lang={isDe ? "en" : "de"}>{isDe ? "ENGLISH" : "DEUTSCH"}</a>
              </nav>
            )}
            {status !== "ready" && <p className="eyebrow">{status === "upgrade" ? `PICKAXE CORE // LEVEL ${sector}` : "NEURAL LINK STATUS"}</p>}
            {status === "ready" ? (
              <h1 className="start-title"><span>SKYBREAK</span><span>PROTOCOL</span></h1>
            ) : (
              <h1 className={status === "upgrade" ? "upgrade-title" : undefined}>{overlayTitle}</h1>
            )}
            {status === "ready" && <p className="eyebrow">{`NIGHT CITY // 03:17 // ${APP_BUILD_CHANNEL === "dev" ? "LOCAL TEST // " : APP_BUILD_CHANNEL === "beta" ? "BETA // " : "FINAL // "}v${APP_VERSION}`}</p>}
            <p>{overlayCopy}</p>
            {status === "chestChoice" ? (
              <div className="transition-panel" style={{ "--next-accent": LEVEL_THEMES[sector - 1].accent, "--next-secondary": LEVEL_THEMES[sector - 1].secondary } as React.CSSProperties}>
                <div className="level-transition-card">
                  <span>{isDe ? "TRUHE GEÖFFNET" : "CHEST OPENED"}</span>
                  <strong>{isDe ? "GOODIE WÄHLEN" : "CHOOSE A GOODIE"}</strong>
                  <small>{isDe ? "DIE ZEIT STEHT AN, BIS DU DEINE BELohnUNG WÄHLST." : "TIME IS PAUSED UNTIL YOU CHOOSE YOUR REWARD."}</small>
                </div>
                <div className="upgrade-grid">
                  <button onClick={() => chooseChestReward("shield")}><strong>{isDe ? "SCHILD" : "SHIELD"}</strong><span>{isDe ? "+1 TREFFER ABWEHREN" : "+1 HIT ABSORPTION"}</span></button>
                  <button onClick={() => chooseChestReward("life")}><strong>{isDe ? "LEBEN" : "LIFE"}</strong><span>{isDe ? "+1 LEBEN ODER PUNKTE BEI VOLLEM VORRAT" : "+1 LIFE OR SCORE WHEN FULL"}</span></button>
                  <button onClick={() => chooseChestReward("score")}><strong>{isDe ? "DATENBONUS" : "DATA BONUS"}</strong><span>{isDe ? "SOFORT MEHR PUNKTE" : "INSTANT SCORE BOOST"}</span></button>
                  <button onClick={() => chooseChestReward("overdrive")}><strong>OVERDRIVE</strong><span>{isDe ? "12 SEKUNDEN MEHR EISPICKEL-KRAFT" : "12 SECONDS MORE PICKAXE POWER"}</span></button>
                  <button onClick={() => chooseChestReward("jackpot")}><strong>JACKPOT</strong><span>{isDe ? "GROSSER DATENBONUS" : "LARGE DATA BONUS"}</span></button>
                  <button onClick={() => chooseChestReward("repair")}><strong>{isDe ? "REPARATUR" : "REPAIR"}</strong><span>{isDe ? "EINEN SCHADEN REPARIEREN + SCHILD" : "REPAIR ONE DAMAGE + SHIELD"}</span></button>
                  <button onClick={() => chooseChestReward("phase")}><strong>{isDe ? "PHASENPANZER" : "PHASE ARMOR"}</strong><span>{isDe ? "7 SEKUNDEN UNVERWUNDBAR" : "7 SECONDS INVULNERABLE"}</span></button>
                </div>
              </div>
            ) : status === "upgrade" ? (
              <div className="transition-panel" style={{ "--next-accent": LEVEL_THEMES[Math.min(LEVEL_COUNT - 1, sector)].accent, "--next-secondary": LEVEL_THEMES[Math.min(LEVEL_COUNT - 1, sector)].secondary } as React.CSSProperties}>
                <div className="level-transition-card">
                  <span>{isDe ? "NÄCHSTER SEKTOR" : "NEXT SECTOR"}</span>
                  <strong>LEVEL {Math.min(LEVEL_COUNT, sector + 1).toString().padStart(2, "0")}</strong>
                  <b>{LEVEL_THEMES[Math.min(LEVEL_COUNT - 1, sector)].name}</b>
                  <small>{isDe ? `${LEVEL_THEMES[Math.min(LEVEL_COUNT - 1, sector)].platform.replaceAll("-", " ")} // WÄCHTERSIGNAL ERFASST` : `${LEVEL_THEMES[Math.min(LEVEL_COUNT - 1, sector)].platform.replaceAll("-", " ")} // GUARDIAN SIGNAL DETECTED`}</small>
                </div>
                <div className="upgrade-grid">
                  <button onClick={() => applyPickaxeUpgrade("power")}>
                    <strong>{isDe ? "KRAFT" : "POWER"} {nextPickaxePower}</strong>
                    <span>{isDe
                      ? `REICHWEITE +8 // ${pickaxeBreakCount(nextPickaxePower)} PLATTFORM${pickaxeBreakCount(nextPickaxePower) === 1 ? "" : "EN"} PRO SCHLAG`
                      : `RANGE +8 // ${pickaxeBreakCount(nextPickaxePower)} PLATFORM${pickaxeBreakCount(nextPickaxePower) === 1 ? "" : "S"} PER STRIKE`}</span>
                  </button>
                  <button onClick={() => applyPickaxeUpgrade("style")}>
                    <strong>{isDe ? "DESIGN" : "STYLE"} {nextPickaxeStyle}</strong>
                    <span>{isDe
                      ? `${nextStylePreview.de} // NEUE FARBE, FORM UND STÄRKERES LEUCHTEN`
                      : `${nextStylePreview.en} // NEW COLOR, SHAPE, AND STRONGER GLOW`}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {status !== "paused" && (
                  <>
                    <label className="start-level-picker">
                      <span>{isDe ? "STARTLEVEL" : "START LEVEL"}</span>
                      <select value={selectedStartLevel} onChange={(event) => chooseStartLevel(Number(event.target.value))}>
                        {Array.from({ length: unlockedLevel }, (_, index) => index + 1).map((level) => (
                          <option key={level} value={level}>LEVEL {level.toString().padStart(2, "0")} // {LEVEL_THEMES[level - 1].name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="start-level-picker">
                      <span>{isDe ? `LEVEL ${selectedStartLevel} SCHWIERIGKEIT` : `LEVEL ${selectedStartLevel} DIFFICULTY`}</span>
                      <select value={levelDifficulties[selectedStartLevel - 1]} onChange={(event) => chooseDifficulty(event.target.value as Difficulty, selectedStartLevel)}>
                        <option value="easy">{isDe ? "Leicht" : "Easy"}</option>
                        <option value="medium">{isDe ? "Mittel" : "Medium"}</option>
                        <option value="hard">{isDe ? "Schwer" : "Hard"}</option>
                      </select>
                    </label>
                    <details className="optional-start-menu">
                      <summary>{isDe ? "WEITERE OPTIONEN" : "MORE OPTIONS"}</summary>
                      <div className="optional-start-content">
                        <label className="start-level-picker">
                          <span>{isDe ? "CHALLENGE" : "CHALLENGE"}</span>
                          <select value={challengeMode} onChange={(event) => { const next = event.target.value as ChallengeMode; challengeRef.current = next; setChallengeMode(next); }}>
                            <option value="standard">{isDe ? "STANDARD" : "STANDARD"}</option>
                            <option value="noDamage">{isDe ? "OHNE TREFFER" : "NO DAMAGE"}</option>
                            <option value="scoreRush">{isDe ? "15.000 PUNKTE" : "15,000 SCORE"}</option>
                          </select>
                        </label>
                        <label className="start-level-picker">
                          <span>{isDe ? "PICKEL-DESIGN" : "PICKAXE STYLE"}</span>
                          <select value={cosmeticLoadout.style} onChange={(event) => saveCosmeticLoadout({ ...cosmeticLoadout, style: Number(event.target.value) })}>
                            {PICKAXE_STYLES.slice(0, Math.min(PICKAXE_STYLES.length, unlockedLevel)).map((style, index) => (
                              <option key={style.en} value={index + 1}>S{index + 1} // {isDe ? style.de : style.en}</option>
                            ))}
                          </select>
                        </label>
                        <label className="start-level-picker">
                          <span>{isDe ? "AVATAR" : "AVATAR"}</span>
                          <select value={cosmeticLoadout.avatar} onChange={(event) => saveCosmeticLoadout({ ...cosmeticLoadout, avatar: event.target.value as Player["avatar"] })}>
                            <option value="robot">{isDe ? "ROBOTER // STANDARD" : "ROBOT // STANDARD"}</option>
                            {unlockedLevel >= BIKINI_AVATAR_UNLOCK_LEVEL && <option value="bikini">{isDe ? "HOLOGRAMM-AVATAR // LEVEL 07" : "HOLOGRAM AVATAR // LEVEL 07"}</option>}
                          </select>
                        </label>
                        {cosmeticLoadout.avatar === "robot" && (
                          <label className="start-level-picker">
                            <span>{isDe ? "ROBOTER-MODELL" : "ROBOT MODEL"}</span>
                            <select value={cosmeticLoadout.robotProfile} onChange={(event) => saveCosmeticLoadout({ ...cosmeticLoadout, robotProfile: Number(event.target.value) })}>
                              <option value={0}>{isDe ? "AUTO // AKTUELLES LEVEL" : "AUTO // CURRENT LEVEL"}</option>
                              {unlockedRobotProfiles.map((profile) => (
                                <option key={profile} value={profile}>R{profile.toString().padStart(2, "0")} // {LEVEL_THEMES[profile - 1].name}</option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </details>
                  </>
                )}
                <button className="primary-button" onClick={status === "paused" ? togglePause : restart}>
                  {status === "paused" ? (isDe ? "WEITER" : "RESUME") : status === "ready" ? (isDe ? "AUFSTIEG STARTEN" : "START ASCENT") : (isDe ? "AUSGEWÄHLTES LEVEL STARTEN" : "START SELECTED LEVEL")}
                </button>
              </>
            )}
            {status === "ready" && (
              <>
                <div className="mission-grid">
                  <span><b>01</b> {isDe ? "Ebenen von unten durchbrechen" : "Break levels from below"}</span>
                  <span><b>02</b> {isDe ? "Drohnen ausschalten" : "Disable the drones"}</span>
                  <span><b>03</b> {isDe ? "Sendeturm erreichen" : "Reach the transmission tower"}</span>
                </div>
                <div className="level-map" aria-label={isDe ? "Levelkarte" : "Level map"}>
                  {LEVEL_THEMES.map((theme, index) => {
                    const level = index + 1;
                    return <span key={theme.name} className={`${level === selectedStartLevel ? "selected" : ""}${level > unlockedLevel ? " locked" : ""}`} style={{ "--map-accent": theme.accent } as React.CSSProperties}>{level.toString().padStart(2, "0")}</span>;
                  })}
                </div>
                <div className="graphics-settings start-graphics-settings">
                  <label className="quality-picker">
                    <span>{isDe ? "GRAFIK" : "GRAPHICS"}</span>
                    <select value={quality} onChange={(event) => chooseQuality(event.target.value as Quality)}>
                      <option value="low">{isDe ? "Niedrig" : "Low"}</option>
                      <option value="medium">{isDe ? "Mittel" : "Medium"}</option>
                      <option value="high">{isDe ? "Hoch" : "High"}</option>
                      <option value="ultra">Ultra</option>
                    </select>
                  </label>
                  <label className="quality-picker">
                    <span>{isDe ? "AUFLÖSUNG" : "RESOLUTION"}</span>
                    <select value={renderResolution} onChange={(event) => chooseRenderResolution(event.target.value as RenderResolution)}>
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                      <option value="4k">4K</option>
                    </select>
                  </label>
                  <label className="mobile-ultra-picker">
                    <span>{isDe ? "BILDRATEN-LIMIT" : "FRAME RATE LIMIT"}</span>
                    <select value={ultraUnlimited ? "unlimited" : mobileUltra120 ? "120" : "60"} onChange={(event) => chooseFrameRate(event.target.value as FrameRateMode)}>
                      <option value="60">60 FPS</option>
                      <option value="120">{isDe ? "Bis 120 FPS" : "Up to 120 FPS"}</option>
                      <option value="unlimited">{isDe ? "Ohne Limit" : "Unlimited"}</option>
                    </select>
                  </label>
                  {!mobileDevice && (
                    <button className="benchmark-button" type="button" onClick={startInGameBenchmark} disabled={inGameBenchmarkRef.current.active}>
                      {inGameBenchmarkRef.current.active ? (isDe ? "SHOWCASE LÄUFT" : "SHOWCASE RUNNING") : (isDe ? "SHOWCASE // 30 SEK." : "SHOWCASE // 30 SEC")}
                    </button>
                  )}
                </div>
                <a className="reset-profile-button" href="./reset.html">
                  {isDe ? "SPIELSTAND ZURÜCKSETZEN" : "RESET LOCAL PROFILE"}
                </a>
              </>
            )}
          </div>
        )}
        <div className={`sector-tag${worldRef.current.immortalSector === sector ? " cheat-active" : ""}`}>LEVEL {sector.toString().padStart(2, "0")} // {LEVEL_THEMES[sector - 1].name} // {isDe ? LEVEL_GAMEPLAY[sector - 1].de : LEVEL_GAMEPLAY[sector - 1].en} // {avatarRef.current === "robot" ? `BOT R${(robotProfileRef.current || sector).toString().padStart(2, "0")}` : "HOLOGRAM"} // VARIANTE {(worldRef.current.variant + 1)} // PICK P{pickaxeStats.power} S{pickaxeStats.style}{worldRef.current.immortalSector === sector ? " // IMMORTAL" : ""} // v{APP_VERSION}</div>
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
          <button onClick={toggleFrameTelemetry} aria-pressed={showFrameTelemetry}>{showFrameTelemetry ? "FPS AUS" : "FPS AN"}</button>
          <button onClick={toggleFullscreen}>{iPhoneSafari ? (isDe ? "APP-MODUS" : "APP MODE") : fullscreenActive ? (isDe ? "BEENDEN" : "EXIT") : (isDe ? "VOLLBILD" : "FULLSCREEN")}</button>
          <button onClick={togglePause}>PAUSE</button>
        </div>
        {quality === "ultra" && mobileDevice && (
          <p className="mobile-ultra-warning" role="alert">
            {isDe
              ? "ULTRA KANN DAS HANDY SEHR ERWÄRMEN. NICHT BEI HITZE ODER DIREKTER SONNE NUTZEN."
              : "ULTRA CAN MAKE THE PHONE VERY WARM. DO NOT USE IN HOT WEATHER OR DIRECT SUNLIGHT."}
          </p>
        )}
        {benchmarkResult && (
          <div className="benchmark-result" role="status">
            <strong>{isDe ? "SHOWCASE-BENCHMARK" : "SHOWCASE BENCHMARK"}</strong>
            <span>{benchmarkResult.quality.toUpperCase()} · {benchmarkResult.resolution.toUpperCase()} · {benchmarkResult.frameRate === "unlimited" ? (isDe ? "OHNE LIMIT" : "UNLIMITED") : `BIS ${benchmarkResult.frameRate} FPS`}</span>
            <b>{benchmarkResult.fps} FPS · {benchmarkResult.frameMs} MS · CPU {benchmarkResult.updateMs}+{benchmarkResult.drawMs} MS{benchmarkResult.gpuMs !== null ? ` · GPU ${benchmarkResult.gpuMs} MS` : ""}</b>
            {benchmarkResult.gpuMs === null && <small>{isDe ? "DIREKTES GPU-TIMING VOM BROWSER NICHT FREIGEGEBEN" : "DIRECT GPU TIMING NOT EXPOSED BY BROWSER"}</small>}
            {benchmarkResult.frameRate === "unlimited" && benchmarkResult.fps >= 57 && benchmarkResult.fps <= 62 && (
              <small>{isDe ? "BROWSER-ANZEIGE SYNCHRONISIERT MIT 60-HZ-DISPLAY" : "BROWSER DISPLAY SYNCHRONIZED TO 60 HZ"}</small>
            )}
          </div>
        )}
        <div className="run-record">
          <span>{renderer} · {quality.toUpperCase()} · {ultraUnlimited ? (isDe ? "OHNE LIMIT" : "UNLIMITED") : mobileUltra120 ? (isDe ? "BIS 120 FPS" : "UP TO 120 FPS") : "60 FPS"}{thermalProtection && (quality === "ultra" || (quality === "high" && mobileDevice)) ? ` · ${isDe ? "WÄRMESCHUTZ" : "THERMAL SAFE"}` : ""}{desktopUltraScale < 1 ? ` · ${isDe ? "LEISTUNGSSCHUTZ" : "PERFORMANCE SAFE"} ${Math.round(desktopUltraScale * 100)}%` : ""} · LOCAL RECORD</span>
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
            <button type="button" className="reset-keys" onClick={resetKeyBindings}>{isDe ? "TASTEN STANDARD" : "RESET KEYS"}</button>
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

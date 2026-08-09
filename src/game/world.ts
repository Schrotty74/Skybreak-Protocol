import { buildChestSpawns, type PowerUpKind } from "../powerUps";
import { type BlockExplosionStyle, LEVEL_COUNT, LEVEL_THEMES } from "../levelData";

type GameStatus = "ready" | "playing" | "paused" | "chestChoice" | "celebration" | "bikiniShowcase" | "upgrade" | "gameover" | "won";

const VIEW_W = 960;

export const TILE = 64;
export const PLAYER_W = 34;
export const PLAYER_H = 50;
export const LEVEL_FLOORS = 15;
export const FLOOR_SPACING = 92;
export const FLOOR_BASE_Y = 475;
export const GRAVITY = 1450;
export const MOVE_SPEED = 255;
export const JUMP_SPEED = 610;
export const WORLD_TOP = FLOOR_BASE_Y - (LEVEL_FLOORS - 1) * FLOOR_SPACING - PLAYER_H + 13;

export type TileMode = "stable" | "fragile" | "phase" | "rift" | "moving" | "ice" | "bridge";
export type Tile = { x: number; y: number; alive: boolean; cracked: boolean; mode: TileMode; phaseOffset: number; baseX: number; travel: number; speed: number; previousX: number; temporaryLife?: number };
export type Objective = { x: number; y: number; kind: "cell" | "switch"; active: boolean };
export type Enemy = { x: number; y: number; vx: number; vy: number; alive: boolean; grounded: boolean; kind: number; attackTimer: number; frozen: number; guardian?: boolean; integrity?: number };
export type Particle = {
  x: number; y: number; vx: number; vy: number; life: number; color: string;
  hazard?: "fall" | "laser" | "pulse" | "boss";
  blockExplosion?: BlockExplosionStyle; size?: number; rotation?: number; spin?: number;
};
export type Chest = { x: number; y: number; opened: boolean; powerUp: PowerUpKind };
export type Player = {
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
  shieldTime: number;
  overdrive: number;
  damage: number;
  avatar: "robot" | "bikini";
};

export type World = {
  player: Player;
  tiles: Tile[];
  enemies: Enemy[];
  chests: Chest[];
  objectives: Objective[];
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
  transition: number;
  victoryTime: number;
  celebrationTime: number;
  celebrationTarget: "upgrade" | "won";
  mechanicCooldown: number;
  bridgeCooldown: number;
  easyAssistsApplied: boolean;
  showcaseBenchmark: boolean;
  showcaseLastBurst: number;
  variant: number;
};


export function tileIsActive(tile: Tile, time: number) {
  return tile.alive && (tile.mode !== "phase" || Math.sin(time * 2.6 + tile.phaseOffset) > -0.38);
}

export function buildLevel(sector = 1, variant = 0): Pick<World, "tiles" | "enemies" | "chests" | "objectives"> {
  const tiles: Tile[] = [];
  const enemies: Enemy[] = [];
  const chests: Chest[] = [];
  const objectives: Objective[] = [];
  const chestSpawns = new Map(buildChestSpawns(LEVEL_FLOORS).map((spawn) => [spawn.row, spawn.powerUp]));

  for (let row = 0; row < LEVEL_FLOORS; row++) {
    const y = FLOOR_BASE_Y - row * FLOOR_SPACING;
    // Three deterministic layouts per sector: varied but always retain both
    // edge supports and the same fair, reachable gap width.
    const gapStart = row === 0 ? -10 : (row * 5 + 2 + variant * 3 + (row % 3 === 0 ? variant : 0)) % 11;
    const rowTiles: Tile[] = [];
    for (let col = 0; col < 15; col++) {
      const safeEdge = col === 0 || col === 14;
      const gap = !safeEdge && (col === gapStart || (row % 7 === 4 && col === gapStart + 1));
      if (!gap) {
        const mode: TileMode = sector === 9 && row > 3 && row % 4 === 1 && col % 5 === 2
          ? "rift"
          : ([6, 8].includes(sector) && row > 2 && (row + col) % 7 === 0
            ? "phase"
            : ([1, 5, 10].includes(sector) && row > 2 && (row + col) % 9 === 0
              ? "moving"
              : ([3, 7].includes(sector) && row > 1 && (row + col) % 8 === 0
                ? "ice"
                : ([2, 4, 7].includes(sector) && row > 1 && (row + col) % 6 === 0 ? "fragile" : "stable"))));
        const baseX = col * TILE;
        const tile = { x: baseX, y, alive: true, cracked: row > 0 || mode === "fragile", mode, phaseOffset: row * 0.73 + col * 0.41, baseX, travel: mode === "moving" ? 46 + (row % 3) * 12 : 0, speed: 0.9 + (col % 3) * 0.18, previousX: baseX };
        tiles.push(tile);
        rowTiles.push(tile);
      }
    }
    if (row === 4 || row === 9) {
      const objectiveKind: Objective["kind"] = sector % 2 === 0 ? "switch" : "cell";
      const support = rowTiles[Math.min(rowTiles.length - 2, 2 + ((sector * 3 + row) % Math.max(1, rowTiles.length - 3)))];
      if (support) objectives.push({ x: support.x + 20, y: y - 28, kind: objectiveKind, active: true });
    }
    const powerUp = chestSpawns.get(row);
    if (powerUp) {
      const preferredX = (2 + ((row * 7 + 3 + variant * 2) % 11)) * TILE;
      const support = rowTiles.reduce((closest, tile) =>
        Math.abs(tile.x - preferredX) < Math.abs(closest.x - preferredX) ? tile : closest,
      );
      chests.push({ x: support.x + 13, y: y - 30, opened: false, powerUp });
    }
    const enemyStep = Math.max(2, 5 - Math.floor(row / 11));
    if (row === LEVEL_FLOORS - 2) {
      enemies.push({ x: VIEW_W / 2 - 28, y: y - 56, vx: 46, vy: 0, alive: true, grounded: true, kind: 0, attackTimer: 1.8, frozen: 0, guardian: true, integrity: 3 });
    } else if (row > 2 && row % enemyStep === 1) {
      enemies.push({
        x: ((row * 137) % 720) + 110,
        y: y - 34,
        vx: row % 8 === 1 ? 72 : -72,
        vy: 0,
        alive: true,
        grounded: true,
        kind: (row + sector) % 6,
        attackTimer: 1 + (row % 3) * 0.35,
        frozen: 0,
      });
    }
  }
  return { tiles, enemies, chests, objectives };
}

export function makeWorld(): World {
  const level = buildLevel(1);
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
      shieldTime: 0,
      overdrive: 0,
      damage: 0,
      avatar: "robot",
    },
    particles: [],
    // Keep the ready screen aligned to the left world edge. A non-zero
    // starting offset is exposed on wide desktop canvases behind the overlay.
    cameraX: 0,
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
    transition: 0,
    victoryTime: 0,
    celebrationTime: 0,
    celebrationTarget: "upgrade",
    mechanicCooldown: 0,
    bridgeCooldown: 0,
    easyAssistsApplied: false,
    showcaseBenchmark: false,
    showcaseLastBurst: -1,
    roamingChest: null,
    roamingChestTimer: 0,
    roamingChestMoves: 0,
    roamingChestSector: 1,
    collectedRoamingChestSectors: Array(LEVEL_COUNT).fill(false),
    variant: 0,
  };
}

export function placeWorldAtLevel(world: World, level: number, variant = world.variant) {
  const targetLevel = Math.min(LEVEL_COUNT, Math.max(1, Math.round(level)));
  world.variant = variant;
  const levelData = buildLevel(targetLevel, variant);
  world.tiles = levelData.tiles;
  world.enemies = levelData.enemies;
  world.chests = levelData.chests;
  world.objectives = levelData.objectives;
  world.sector = targetLevel;
  world.highestSector = targetLevel;
  world.roamingChestSector = targetLevel;
  // A level has its own world coordinates. Keeping the previous camera offset
  // would show the new player at the right spawn point but the view far above
  // it after selecting an upgrade.
  world.cameraX = 0;
  world.cameraY = 0;
  world.mechanicCooldown = 0;
  world.bridgeCooldown = 0;
  world.celebrationTime = 0;
  world.celebrationTarget = "upgrade";
  world.easyAssistsApplied = false;
}

export function applyEasyAssists(world: World) {
  if (world.easyAssistsApplied) return;
  world.easyAssistsApplied = true;
  // Easy is an onboarding mode: retain the visual world, but remove the
  // mechanics that create the largest frustration spikes.
  world.lives = Math.max(world.lives, 8);
  // Regular enemies are omitted entirely in Easy. The guardian remains as a
  // short, one-hit final encounter so the level objective still has meaning.
  world.enemies = world.enemies.filter((enemy) => enemy.guardian).map((enemy) => ({ ...enemy, integrity: 1, attackTimer: 3.2 }));
  world.objectives = world.objectives.slice(0, 1);
  world.tiles = world.tiles.map((tile) => {
    if (!["moving", "phase", "ice", "fragile", "rift"].includes(tile.mode)) return tile;
    return { ...tile, mode: "stable", x: tile.baseX, travel: 0, previousX: tile.baseX };
  });
}

export function levelProgress(playerY: number): number {
  return Math.max(0, Math.min(1, (FLOOR_BASE_Y - playerY) / (FLOOR_BASE_Y - WORLD_TOP)));
}

export function themeColor(sector: number, key: "accent" | "secondary" | "warning") {
  return LEVEL_THEMES[Math.max(0, Math.min(LEVEL_THEMES.length - 1, sector - 1))][key];
}

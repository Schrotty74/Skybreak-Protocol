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

// Each sector owns a recognisable route blueprint. Every row keeps the same
// reachable one- or two-module opening as every other sector; variants mirror
// or shift it only for replay value, never to increase the difficulty.
const ROUTE_GAP_COLUMNS: readonly (readonly number[])[] = [
  [2, 7, 3, 9, 4, 1, 6, 10, 5, 2, 8, 4, 9, 3],
  [8, 3, 9, 4, 10, 5, 1, 6, 2, 7, 3, 8, 4, 9],
  [1, 5, 9, 5, 1, 6, 10, 6, 2, 7, 10, 5, 2, 8],
  [9, 6, 2, 7, 3, 8, 4, 9, 5, 1, 6, 2, 7, 3],
  [3, 8, 4, 9, 5, 10, 6, 1, 7, 2, 8, 3, 9, 4],
  [5, 1, 7, 3, 9, 5, 2, 8, 4, 10, 6, 1, 7, 3],
  [2, 4, 7, 9, 3, 5, 8, 10, 4, 6, 9, 1, 5, 7],
  [7, 10, 6, 2, 8, 4, 1, 5, 9, 3, 7, 10, 6, 2],
  [4, 9, 1, 6, 10, 2, 7, 3, 8, 5, 1, 6, 10, 2],
  [10, 5, 1, 7, 3, 9, 4, 8, 2, 6, 10, 5, 1, 7],
  [3, 6, 10, 4, 8, 2, 7, 1, 5, 9, 3, 6, 10, 4],
  [8, 4, 1, 5, 9, 3, 7, 2, 6, 10, 4, 8, 1, 5],
  [1, 6, 3, 8, 5, 10, 2, 7, 4, 9, 1, 6, 3, 8],
  [6, 2, 8, 4, 10, 1, 7, 3, 9, 5, 6, 2, 8, 4],
];

export type TileMode = "stable" | "fragile" | "phase" | "rift" | "moving" | "ice" | "bridge" | "wall";
export type Tile = { x: number; y: number; alive: boolean; cracked: boolean; mode: TileMode; phaseOffset: number; baseX: number; travel: number; speed: number; previousX: number; temporaryLife?: number; doubleDeck?: "lower" | "upper" };
export type Objective = { x: number; y: number; kind: "cell" | "switch"; active: boolean };
export type Enemy = { x: number; y: number; vx: number; vy: number; alive: boolean; grounded: boolean; kind: number; attackTimer: number; frozen: number; guardian?: boolean; integrity?: number; integrityMax?: number; canFire?: boolean; canThrowBombs?: boolean; canShoot?: boolean; shooterSlot?: number; bombTimer?: number };
export type Particle = {
  x: number; y: number; vx: number; vy: number; life: number; color: string;
  hazard?: "fall" | "laser" | "pulse" | "boss";
  blockExplosion?: BlockExplosionStyle; hazardStyle?: BlockExplosionStyle; size?: number; rotation?: number; spin?: number;
};
export type Chest = { x: number; y: number; opened: boolean; powerUp: PowerUpKind; roaming?: boolean };
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
  roamingChestSecondary: Chest | null;
  roamingChestSecondaryTimer: number;
  roamingChestMoves: number;
  roamingChestSector: number;
  collectedRoamingChestCounts: number[];
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
  fallingHazardTimer: number;
  enemyShotCooldown: number;
  nextEnemyShooterSlot: number;
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
    // Three deterministic variants per sector retain the blueprint's fair,
    // reachable gap width while making the climb read as a unique route.
    const route = ROUTE_GAP_COLUMNS[Math.max(0, Math.min(ROUTE_GAP_COLUMNS.length - 1, sector - 1))];
    const blueprintGap = route[Math.max(0, row - 1)] ?? 5;
    const gapStart = row === 0 ? -10 : variant === 1 ? 10 - blueprintGap : variant === 2 ? (blueprintGap + 4) % 11 : blueprintGap;
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
    if (row === LEVEL_FLOORS - 2) {
      enemies.push({ x: VIEW_W / 2 - 28, y: y - 56, vx: 46, vy: 0, alive: true, grounded: true, kind: 0, attackTimer: 1.8, frozen: 0, guardian: true, integrity: 5, integrityMax: 5 });
    } else if (row > 0 && row < LEVEL_FLOORS - 2) {
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
  // Every sector keeps at least one phase block in addition to its
  // sector-specific rift, ice, or fragile mechanics.
  if (!tiles.some((tile) => tile.mode === "phase")) {
    const phaseTile = tiles.find((tile) => tile.mode === "stable"
      && tile.y <= FLOOR_BASE_Y - 3 * FLOOR_SPACING
      && tile.y >= FLOOR_BASE_Y - 11 * FLOOR_SPACING);
    if (phaseTile) phaseTile.mode = "phase";
  }
  // Every sector also keeps at least one lateral moving route.
  if (!tiles.some((tile) => tile.mode === "moving")) {
    const movingTile = tiles.find((tile) => tile.mode === "stable"
      && tile.y <= FLOOR_BASE_Y - 3 * FLOOR_SPACING
      && tile.y >= FLOOR_BASE_Y - 11 * FLOOR_SPACING);
    if (movingTile) {
      movingTile.mode = "moving";
      movingTile.travel = 58;
      movingTile.speed = 1.08;
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
    fallingHazardTimer: 3.8,
    enemyShotCooldown: 0,
    nextEnemyShooterSlot: 0,
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
    roamingChestSecondary: null,
    roamingChestSecondaryTimer: 0,
    roamingChestMoves: 0,
    roamingChestSector: 1,
    collectedRoamingChestCounts: Array(LEVEL_COUNT).fill(0),
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
  world.roamingChest = null;
  world.roamingChestTimer = 0;
  world.roamingChestSecondary = null;
  world.roamingChestSecondaryTimer = 0;
  world.roamingChestMoves = 0;
  // A level has its own world coordinates. Keeping the previous camera offset
  // would show the new player at the right spawn point but the view far above
  // it after selecting an upgrade.
  world.cameraX = 0;
  world.cameraY = 0;
  world.mechanicCooldown = 0;
  world.bridgeCooldown = 0;
  world.enemyShotCooldown = 0;
  world.nextEnemyShooterSlot = 0;
  world.celebrationTime = 0;
  world.celebrationTarget = "upgrade";
  world.easyAssistsApplied = false;
}

export function applyEasyAssists(world: World) {
  if (world.easyAssistsApplied) return;
  world.easyAssistsApplied = true;
  // Easy is an onboarding mode: retain its readable moving and phase routes,
  // but remove the remaining mechanics that create the largest frustration spikes.
  world.lives = Math.max(world.lives, 8);
  // Easy keeps a sparse, slow patrol so the level still feels populated and
  // teaches enemy behaviour. The guardian remains a short encounter.
  world.enemies = world.enemies
    .map((enemy) => enemy.guardian
      ? { ...enemy, integrity: 2, integrityMax: 2, attackTimer: 3.2 }
      : { ...enemy, vx: enemy.vx * .42, attackTimer: 3.5 });
  world.objectives = world.objectives.slice(0, 1);
  world.tiles = world.tiles.map((tile) => {
    if (!["ice", "fragile", "rift"].includes(tile.mode)) return tile;
    return { ...tile, mode: "stable", x: tile.baseX, travel: 0, previousX: tile.baseX };
  });
}

export function setGuardianIntegrity(world: World, difficulty: "easy" | "medium" | "hard") {
  const integrity = difficulty === "easy" ? 2 : difficulty === "medium" ? 5 : 8;
  world.enemies = world.enemies.map((enemy) => enemy.guardian
    ? { ...enemy, integrity, integrityMax: integrity, attackTimer: difficulty === "easy" ? 3.2 : difficulty === "hard" ? 1.25 : 1.8 }
    : enemy);
}

export function setEnemyLayout(world: World, difficulty: "easy" | "medium" | "hard") {
  const target = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6;
  const rangedCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 2 : 3;
  const normalEnemies = world.enemies.filter((enemy) => !enemy.guardian);
  const guardians = world.enemies.filter((enemy) => enemy.guardian);
  const shooterIndices = Array.from({ length: Math.min(rangedCount, target) }, (_, index) =>
    rangedCount <= 1 ? 0 : Math.round(index * (target - 1) / (rangedCount - 1)),
  );
  const selected = Array.from({ length: Math.min(target, normalEnemies.length) }, (_, index) => {
    const sourceIndex = target <= 1 ? 0 : Math.round(index * (normalEnemies.length - 1) / (target - 1));
    const enemy = normalEnemies[sourceIndex];
    const shooterSlot = shooterIndices.indexOf(index);
    return {
      ...enemy,
      // Difficulty-specific ranged subset, staggered by the shared scheduler.
      canShoot: shooterSlot >= 0,
      shooterSlot: shooterSlot >= 0 ? shooterSlot : undefined,
    };
  });
  world.enemies = [...selected, ...guardians];
}

export function setBossLayout(world: World, difficulty: "easy" | "medium" | "hard") {
  const baseGuardian = world.enemies.find((enemy) => enemy.guardian);
  if (!baseGuardian) return;
  const count = difficulty === "easy" ? 1 : 2;
  const bossTiles = world.tiles
    .filter((tile) => tile.alive && Math.abs(tile.y - (baseGuardian.y + 56)) < 4)
    .sort((a, b) => a.x - b.x);
  const fractions = count === 1 ? [.5] : [.28, .72];
  const positions = fractions.map((fraction) => {
    const tile = bossTiles[Math.min(bossTiles.length - 1, Math.max(0, Math.round((bossTiles.length - 1) * fraction)))];
    return tile ? tile.x + (TILE - 38) / 2 : VIEW_W / 2 - 28;
  });
  const guardians = positions.map((x, index) => ({
    ...baseGuardian,
    x,
    vx: (index % 2 ? -1 : 1) * Math.abs(baseGuardian.vx),
    attackTimer: baseGuardian.attackTimer + index * .45,
    canFire: index === 0,
    canThrowBombs: index === 0,
    bombTimer: difficulty === "hard" ? 4.8 + index * 1.4 : 6.5,
  }));
  world.enemies = [...world.enemies.filter((enemy) => !enemy.guardian), ...guardians];
}

export function setChestLayout(world: World, difficulty: "easy" | "medium" | "hard") {
  const count = difficulty === "easy" ? 5 : difficulty === "medium" ? 4 : 2;
  world.chests = world.chests.slice(0, count);
}

export function setPhaseBlockLayout(world: World, difficulty: "easy" | "medium" | "hard") {
  const phaseRows = difficulty === "easy"
    ? [2, 5, 8, 11]
    : difficulty === "medium"
      ? [1, 3, 4, 6, 8, 9, 11, 12]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (const tile of world.tiles.filter((tile) => tile.mode === "phase")) {
    tile.mode = "stable";
    tile.travel = 0;
  }
  for (let index = 0; index < phaseRows.length; index += 1) {
    const rowY = FLOOR_BASE_Y - phaseRows[index] * FLOOR_SPACING;
    const rowTiles = world.tiles
      .filter((tile) => tile.mode === "stable" && !tile.doubleDeck && Math.abs(tile.y - rowY) < 2)
      .sort((left, right) => left.x - right.x);
    const phaseTile = rowTiles[(world.sector + world.variant + index * 3) % rowTiles.length];
    if (phaseTile) phaseTile.mode = "phase";
  }
}

export function setMovingBlockLayout(world: World, difficulty: "easy" | "medium" | "hard") {
  const movingRows = difficulty === "easy"
    ? [1, 5, 9, 12]
    : difficulty === "medium"
      ? [1, 3, 5, 7, 9, 11]
      : [1, 2, 4, 5, 7, 8, 10, 12];
  for (const tile of world.tiles.filter((tile) => tile.mode === "moving")) {
    tile.mode = "stable";
    tile.travel = 0;
  }
  for (let index = 0; index < movingRows.length; index += 1) {
    const rowY = FLOOR_BASE_Y - movingRows[index] * FLOOR_SPACING;
    const rowTiles = world.tiles
      .filter((tile) => tile.mode === "stable" && !tile.doubleDeck && Math.abs(tile.y - rowY) < 2)
      .sort((left, right) => left.x - right.x);
    const movingTile = rowTiles[(world.sector + world.variant + index * 4) % rowTiles.length];
    if (movingTile) {
      movingTile.mode = "moving";
      movingTile.travel = 58;
      movingTile.speed = 1.08;
    }
  }
}

export function addDestructibleWalls(world: World, difficulty: "easy" | "medium" | "hard") {
  const wallCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 4 : 6;
  const rows = [2, 4, 6, 8, 10, 12];
  for (let index = 0; index < wallCount; index += 1) {
    const row = rows[index];
    const baseY = FLOOR_BASE_Y - row * FLOOR_SPACING;
    const height = index % 3 === 1 ? 3 : 2;
    const column = 2 + ((world.sector * 3 + world.variant * 2 + index * 5) % 11);
    const x = column * TILE;
    for (let segment = 1; segment <= height; segment += 1) {
      const y = baseY - segment * TILE;
      if (y < WORLD_TOP + 18 || world.tiles.some((tile) => tile.x === x && Math.abs(tile.y - y) < 2)) continue;
      world.tiles.push({
        x,
        y,
        alive: true,
        cracked: true,
        mode: "wall",
        phaseOffset: row * .73 + index * .41,
        baseX: x,
        travel: 0,
        speed: 0,
        previousX: x,
      });
    }
  }
}

export function addDoubleDecks(world: World, difficulty: "easy" | "medium" | "hard") {
  const deckCount = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  const rows = [3, 7, 11];
  for (let index = 0; index < deckCount; index += 1) {
    const y = FLOOR_BASE_Y - rows[index] * FLOOR_SPACING;
    const rowTiles = world.tiles
      .filter((tile) => tile.alive && tile.mode !== "wall" && Math.abs(tile.y - y) < 2)
      .sort((a, b) => a.x - b.x);
    if (!rowTiles.length) continue;
    const spanStart = Math.max(0, Math.min(rowTiles.length - 4, 2 + ((world.sector + world.variant + index * 3) % Math.max(1, rowTiles.length - 3))));
    for (const lower of rowTiles.slice(spanStart, spanStart + 4)) {
      lower.doubleDeck = "lower";
      const upperY = lower.y - TILE;
      if (upperY < WORLD_TOP + 18 || world.tiles.some((tile) => tile.x === lower.x && Math.abs(tile.y - upperY) < 2)) continue;
      world.tiles.push({
        ...lower,
        y: upperY,
        baseX: lower.x,
        previousX: lower.x,
        travel: 0,
        speed: 0,
        mode: "stable",
        cracked: true,
        doubleDeck: "upper",
      });
    }
  }
}

export function levelProgress(playerY: number): number {
  return Math.max(0, Math.min(1, (FLOOR_BASE_Y - playerY) / (FLOOR_BASE_Y - WORLD_TOP)));
}

export function themeColor(sector: number, key: "accent" | "secondary" | "warning") {
  return LEVEL_THEMES[Math.max(0, Math.min(LEVEL_THEMES.length - 1, sector - 1))][key];
}

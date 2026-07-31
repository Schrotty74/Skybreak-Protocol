export type PowerUpKind = "shield" | "life" | "score" | "overdrive";

export type ChestSpawn = {
  row: number;
  powerUp: PowerUpKind;
};

export type PowerUpState = {
  lives: number;
  shield: number;
  overdrive: number;
  score: number;
};

export type PowerUpResult = PowerUpState & {
  message: "shield" | "life" | "life-full" | "score" | "overdrive";
  awardedScore: number;
};

const POWER_UP_ROTATION: PowerUpKind[] = ["shield", "life", "score", "overdrive"];

export function buildChestSpawns(rowCount: number): ChestSpawn[] {
  const spawns: ChestSpawn[] = [];
  let row = 3;
  let index = 0;
  while (row < rowCount) {
    spawns.push({ row, powerUp: POWER_UP_ROTATION[index % POWER_UP_ROTATION.length] });
    row += index % 2 === 0 ? 4 : 3;
    index += 1;
  }
  return spawns;
}

export function applyPowerUp(kind: PowerUpKind, state: PowerUpState, scoreMultiplier: number): PowerUpResult {
  const result: PowerUpResult = { ...state, message: kind, awardedScore: 0 };
  if (kind === "shield") {
    result.shield = Math.min(2, state.shield + 1);
  } else if (kind === "life") {
    if (state.lives < 5) result.lives += 1;
    else {
      result.awardedScore = Math.round(500 * scoreMultiplier);
      result.score += result.awardedScore;
      result.message = "life-full";
    }
  } else if (kind === "score") {
    result.awardedScore = Math.round(1000 * scoreMultiplier);
    result.score += result.awardedScore;
  } else {
    result.overdrive = Math.max(state.overdrive, 12);
  }
  return result;
}

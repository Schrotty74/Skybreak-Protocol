export type CheatInput = "left" | "right" | "jump" | "attack";
export type CheatId = "immortal" | "shield" | "overdrive" | "extra-life";

export const CHEAT_CODES: ReadonlyArray<{ id: CheatId; sequence: readonly CheatInput[] }> = [
  { id: "immortal", sequence: ["left", "right", "left", "right", "jump", "attack"] },
  { id: "shield", sequence: ["jump", "jump", "left", "right", "attack"] },
  { id: "overdrive", sequence: ["attack", "jump", "attack", "jump", "left", "right"] },
  { id: "extra-life", sequence: ["left", "left", "right", "right", "jump", "attack"] },
];

export function detectCheat(inputs: readonly CheatInput[]): CheatId | null {
  for (const cheat of CHEAT_CODES) {
    if (inputs.length < cheat.sequence.length) continue;
    const tail = inputs.slice(-cheat.sequence.length);
    if (cheat.sequence.every((key, index) => key === tail[index])) return cheat.id;
  }
  return null;
}

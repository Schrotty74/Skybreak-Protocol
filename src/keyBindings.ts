export type BindableAction = "left" | "right" | "jump" | "attack";
export type KeyBindings = Record<BindableAction, string>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  attack: "KeyX",
};

export function normalizeKeyBindings(value: unknown): KeyBindings {
  if (!value || typeof value !== "object") return { ...DEFAULT_KEY_BINDINGS };
  const candidate = value as Partial<KeyBindings>;
  const bindings = { ...DEFAULT_KEY_BINDINGS };
  for (const action of Object.keys(bindings) as BindableAction[]) {
    if (typeof candidate[action] === "string" && candidate[action]!.length > 0) {
      bindings[action] = candidate[action]!;
    }
  }
  return bindings;
}

export function rebindKey(bindings: KeyBindings, action: BindableAction, code: string): KeyBindings {
  const next = { ...bindings };
  const duplicate = (Object.keys(next) as BindableAction[]).find((key) => key !== action && next[key] === code);
  if (duplicate) next[duplicate] = next[action];
  next[action] = code;
  return next;
}

export function actionForCode(bindings: KeyBindings, code: string): BindableAction | null {
  return (Object.keys(bindings) as BindableAction[]).find((action) => bindings[action] === code) ?? null;
}

export function displayKey(code: string): string {
  if (code === "Space") return "SPACE";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code.replace("Arrow", "").toUpperCase();
}

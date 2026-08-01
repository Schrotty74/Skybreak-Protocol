const channel = __APP_BUILD_CHANNEL__;
const prefix = `skybreak-${channel}:`;

function key(name: string): string {
  return `${prefix}${name}`;
}

export function getStoredItem(name: string): string | null {
  const value = localStorage.getItem(key(name));
  if (value !== null || channel !== "final") return value;

  // Preserve existing players' production progress when Final first adopts channel isolation.
  const legacyValue = localStorage.getItem(name);
  if (legacyValue !== null) localStorage.setItem(key(name), legacyValue);
  return legacyValue;
}

export function setStoredItem(name: string, value: string): void {
  localStorage.setItem(key(name), value);
}

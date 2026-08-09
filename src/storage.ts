const channel = __APP_BUILD_CHANNEL__;
const prefix = `skybreak-${channel}:`;
const legacyProfileKeys = [
  "neon-ascent-highscore",
  "skybreak-cosmetic-loadout",
  "skybreak-key-bindings",
  "skybreak-level-difficulties",
  "skybreak-mobile-ultra-120",
  "skybreak-quality",
  "skybreak-render-resolution",
  "skybreak-show-fps",
  "skybreak-ultra-120",
  "skybreak-ultra-frame-rate",
  "skybreak-unlocked-level",
  "skybreak-unlocked-robot-profiles",
] as const;

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

/** Removes only this build channel's Skybreak profile, never other sites' data. */
export function clearStoredProfile(): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const storedKey = localStorage.key(index);
    if (storedKey?.startsWith("skybreak-") || storedKey === "neon-ascent-highscore") localStorage.removeItem(storedKey);
  }
  // Final can import pre-channel saves. Keep the explicit list for legacy
  // names even if a future version changes the standard storage prefix.
  legacyProfileKeys.forEach((storedKey) => localStorage.removeItem(storedKey));
}

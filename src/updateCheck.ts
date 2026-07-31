const RELEASES_URL = "https://api.github.com/repos/Schrotty74/Skybreak-Protocol/releases?per_page=20";
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/i;

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  beta: number | null;
};

type GitHubRelease = {
  draft: boolean;
  prerelease: boolean;
  tag_name: string;
  html_url: string;
};

export type AvailableUpdate = {
  version: string;
  prerelease: boolean;
  url: string;
};

function parseVersion(version: string): ParsedVersion | null {
  const match = version.trim().match(VERSION_PATTERN);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    beta: match[4] ? Number(match[4]) : null,
  };
}

export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return 0;
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (a.beta === null && b.beta !== null) return 1;
  if (a.beta !== null && b.beta === null) return -1;
  return (a.beta ?? 0) - (b.beta ?? 0);
}

export async function checkForUpdate(currentVersion: string): Promise<AvailableUpdate | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const releases = await response.json() as GitHubRelease[];
    const latest = releases
      .filter((release) => !release.draft && parseVersion(release.tag_name))
      .sort((a, b) => compareVersions(b.tag_name, a.tag_name))
      .find((release) => compareVersions(release.tag_name, currentVersion) > 0);
    if (!latest) return null;
    return {
      version: latest.tag_name.replace(/^v/i, ""),
      prerelease: latest.prerelease,
      url: latest.html_url,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

import { access, readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const version = packageJson.version;
const requestedChannel = process.argv[2] ?? "release";
if (!/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(version)) {
  throw new Error(`Unsupported release version: ${version}`);
}

const actualChannel = version.includes("-beta.") ? "beta" : "final";
if (requestedChannel !== "release" && requestedChannel !== actualChannel) {
  throw new Error(`Version ${version} is a ${actualChannel} release, not a ${requestedChannel} release`);
}

const changelogs = [
  `docs/releases/${version}.md`,
  `docs/releases/${version}.en.md`,
];

for (const notesPath of changelogs) {
  await access(notesPath).catch(() => {
    throw new Error(`Missing release changelog: ${notesPath}`);
  });

  const notes = await readFile(notesPath, "utf8");
  const topLevelHeadings = notes.match(/^# /gm)?.length ?? 0;
  if (!notes.startsWith(`# Skybreak Protocol ${version}\n`) || notes.length < 500 || topLevelHeadings !== 1) {
    throw new Error(`Release changelog is incomplete or has an invalid title: ${notesPath}`);
  }
}

console.log(`German and English ${actualChannel} release metadata verified: ${version}`);

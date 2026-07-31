import { access, readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const version = packageJson.version;
if (!/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(version)) {
  throw new Error(`Unsupported release version: ${version}`);
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

console.log(`German and English release metadata verified: ${version}`);

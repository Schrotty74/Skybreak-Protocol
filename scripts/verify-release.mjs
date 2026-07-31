import { access, readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const version = packageJson.version;
if (!/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(version)) {
  throw new Error(`Unsupported release version: ${version}`);
}

const notesPath = `docs/releases/${version}.md`;
await access(notesPath).catch(() => {
  throw new Error(`Missing release changelog: ${notesPath}`);
});

const notes = await readFile(notesPath, "utf8");
if (!notes.includes(version) || notes.length < 500) {
  throw new Error(`Release changelog is incomplete: ${notesPath}`);
}

console.log(`Release metadata verified: ${version}`);

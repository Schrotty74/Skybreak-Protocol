import { copyFile, mkdir } from "node:fs/promises";

const outputDirectory = process.argv[2] ?? "dist";

await mkdir(`${outputDirectory}/de`, { recursive: true });
await copyFile(`${outputDirectory}/source/index.html`, `${outputDirectory}/index.html`);
await copyFile(`${outputDirectory}/source/de/index.html`, `${outputDirectory}/de/index.html`);

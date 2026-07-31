import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist/de", { recursive: true });
await copyFile("dist/source/index.html", "dist/index.html");
await copyFile("dist/source/de/index.html", "dist/de/index.html");

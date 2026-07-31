import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import packageJson from "../package.json" with { type: "json" };

const version = packageJson.version;
const packageDirectory = `release/Skybreak-Protocol-${version}`;

await rm(packageDirectory, { recursive: true, force: true });
await mkdir(packageDirectory, { recursive: true });
await cp("dist-offline", packageDirectory, { recursive: true });
await cp("offline/start.command", `${packageDirectory}/Skybreak-Protocol-starten.command`);
await cp("offline/start.sh", `${packageDirectory}/start.sh`);
await cp("offline/start.bat", `${packageDirectory}/Skybreak-Protocol-starten.bat`);

const instructions = await readFile("offline/README-OFFLINE.txt", "utf8");
await writeFile(
  `${packageDirectory}/README-OFFLINE.txt`,
  instructions.replaceAll("__VERSION__", version),
  "utf8",
);

console.log(`Offline package prepared: ${packageDirectory}`);

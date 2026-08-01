import http from "node:http";
import { appendFileSync } from "node:fs";

const results = new Map();
const outputFile = process.argv[2];
const expectedResults = Math.max(1, Number(process.argv[3] || 2));
const timeout = setTimeout(() => finish(), 90000);

function finish() {
  clearTimeout(timeout);
  if (results.size) {
    const entries = [...results.values()].map(({ browser, variant, fps, frameMs, updateMs, drawMs }) => ({ browser, variant, fps, frameMs, updateMs, drawMs }));
    console.table(entries);
    if (outputFile) appendFileSync(outputFile, `${JSON.stringify(entries)}\n`);
  } else {
    console.log("Kein Browser-Ergebnis empfangen.");
  }
  server.close(() => process.exit(0));
}

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/result") {
    response.writeHead(404).end();
    return;
  }
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    try {
      const result = JSON.parse(body);
      if (typeof result.browser === "string" && Number.isFinite(result.fps)) results.set(result.browser, result);
    } catch {
      // Ignore malformed local test results.
    }
    response.writeHead(204, { "Access-Control-Allow-Origin": "*" }).end();
    if (results.size >= expectedResults) finish();
  });
});

server.listen(5174, "127.0.0.1", () => console.log("Skybreak performance test: Safari und Firefox werden gemessen …"));

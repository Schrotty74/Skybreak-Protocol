# Privacy Report – Skybreak Protocol

[Deutsche Fassung](DATENSCHUTZ.md)

Date: July 31, 2026

## Result

After static inspection, the published web app contains **no private personal data, credentials, API keys, or secret local file paths**. The game has no user accounts, advertising, analytics SDK, tracking, or application backend.

## Scope reviewed

- source code, HTML, manifest, GitHub Actions workflow, and documentation
- generated production files
- image files and their metadata
- external connections and browser storage access
- common secret and identity patterns such as email addresses, tokens, passwords, private keys, and local user paths

Dependencies (`node_modules`) are not published. The automatically generated lockfile contains public npm package information only.

## Processing in the browser

Skybreak Protocol stores only four technically non-personal values in the local storage of the current browser:

| Key | Content | Purpose | Transmission |
|---|---|---|---|
| `neon-ascent-highscore` | highest score reached locally | game progress | none |
| `skybreak-quality` | selected graphics level | retain the device setting | none |
| `skybreak-level-difficulties` | difficulty selected for each level | retain the game setting | none |
| `skybreak-mobile-ultra-120` | optional mobile high-refresh setting | retain the device setting | none |

These values never leave the device. They can be removed by deleting the site's browser data.

Ultra mode checks WebGPU and optional F16 support, local GPU capability limits, and frame timing to select WebGPU or the WebGL2 fallback, adapt render resolution and post-processing, and choose 60, 90, or 120 FPS. A same-origin module Web Worker performs local effect and timing calculations. Browsers provide no temperature reading to the game; sustained frame-time degradation is used locally as a performance-throttling signal. No GPU model, adapter information, benchmark result, frame timing, temperature, or hardware identifier is stored or transmitted.

The soundtrack consists of MP3 files included with the game and loaded from the same GitHub Pages origin after user interaction. Playback and level changes are processed locally. No listening behavior is stored or transmitted.

## Not used

- no cookies
- no analytics, advertising, or telemetry services
- no location, camera, or microphone permissions
- no contacts, device, or account data
- no forms or user input beyond game controls
- no `fetch`, WebSocket, Beacon, or XHR calls made by the game
- no externally loaded fonts, images, sounds, or scripts

## Hosting

When the game is opened through GitHub Pages, GitHub processes technically necessary connection data such as the IP address and browser request outside the game code. GitHub's privacy terms apply to that processing. Skybreak Protocol itself has no access to those hosting logs.

## Published identifiers

Only the game name, neutral project information, and the already public repository address `Schrotty74/Skybreak-Protocol` are visible. A different personal or alias attribution previously present in the repository license was replaced as a precaution with the neutral phrase “Skybreak Protocol contributors.”

## Method and limitation

This review is a static privacy and secret scan of the published project state. It confirms the reviewed state but cannot cover future changes to the source code, dependencies, or hosting terms. The same checks should be repeated before every later release.

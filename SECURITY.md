# Security Policy

[Deutsch](SECURITY.de.md)

## Supported Versions

Security reports are accepted for the current published Skybreak Protocol release.

## Reporting a Vulnerability

Please do not publish sensitive vulnerability details in a public GitHub issue. Contact the repository owner privately. Include the game version, browser and operating system, reproduction steps and sanitized console output or screenshots.

## Scope

Relevant reports include the browser/PWA runtime, service-worker or offline behavior, local-storage handling of progress and settings, keyboard/touch input, downloadable offline packages, GitHub Pages deployment, the optional GitHub release check, WebGPU/WebGL rendering paths, Web Workers and Web Audio behavior.

Skybreak Protocol stores game progress, high score, settings and unlocks locally in the browser. It does not require an account. Reports are especially useful for unintended network requests, unsafe handling of local data, malicious or unexpected behavior in offline packages, or vulnerabilities that could escape the expected browser security boundary.

Thank you for helping keep Skybreak Protocol and its players secure.

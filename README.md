<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol emblem" width="180" height="180">
</p>

<p align="center"><a href="README.de.md">Deutsch</a> · <strong>English</strong></p>

# Skybreak Protocol

[![Deploy Pages](https://github.com/Schrotty74/Skybreak-Protocol/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Schrotty74/Skybreak-Protocol/actions/workflows/deploy-pages.yml)
[![Latest Release](https://img.shields.io/github/v/release/Schrotty74/Skybreak-Protocol)](https://github.com/Schrotty74/Skybreak-Protocol/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Schrotty74/Skybreak-Protocol/total)](https://github.com/Schrotty74/Skybreak-Protocol/releases)

**Current release:** `v1.0.1-beta.8` · [Detailed changelog](docs/releases/1.0.1-beta.8.en.md) · [All changelogs](CHANGELOG.md)

An independent vertical cyberpunk arcade game for modern desktop and mobile browsers. Fight upward through fourteen visually distinct levels, break platforms from below, evade drones and falling hazards, upgrade the robot's ice pick and reach the transmission tower above the megacity.

> Skybreak Protocol uses no graphics, music, characters or source code from Nintendo or Ice Climber. It is an independent reinterpretation of the classic vertical arcade concept.

Data handling is documented in the [English Privacy Report](PRIVACY.md) and the [German privacy report](DATENSCHUTZ.md).

## Play

- **English:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **German:** <https://schrotty74.github.io/Skybreak-Protocol/de/>

The web app runs without installation. On iPhone or iPad, use **Share → Add to Home Screen** in Safari. Android browsers offer the equivalent option in their menu.

**Play offline:** Download the versioned ZIP from the [GitHub release](https://github.com/Schrotty74/Skybreak-Protocol/releases/tag/v1.0.1-beta.8), extract it and open the matching starter for macOS, Windows or Linux. All fourteen music tracks are included; only the optional update check requires internet access.

## Manual and detailed documentation

- [English PDF manual](docs/manual/Skybreak-Protocol-Manual-EN.pdf)
- [German PDF manual](docs/manual/Skybreak-Protocol-Handbuch-DE.pdf)
- [Detailed game & technical information](docs/DETAILS.md)
- [Deutsche Spiel- & Technikdetails](docs/DETAILS.de.md)
- [Release workflow](docs/RELEASE_WORKFLOW.md)

## Screenshots

<p align="center">
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg" alt="Skybreak Protocol compact mobile start menu" width="220"></a>
  &nbsp;
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg" alt="Skybreak Protocol desktop gameplay in Ultra mode" width="390"></a>
</p>

<p align="center"><em>Click a preview to open the full-size image.</em></p>

## Gameplay

- Fourteen visually distinct levels, each built as a 15-floor ascent
- Break platform modules from below and use the robot's ice pick against enemies
- Easy, Medium and Hard difficulty with consistent combat rules across all levels
- Destructible walls, double decks, phase blocks, moving routes, patrol drones and falling hazards
- Chests with seven reward types and difficulty-aware placement
- Level guardians, objective devices and a distinct boss arena for every sector
- Power or visual-style ice-pick upgrades between levels
- Persistent local level unlocks, high score and settings
- Original sample-free soundtrack with one track for every level

[Read the complete gameplay rules, soundtrack list and all fourteen level descriptions →](docs/DETAILS.md)

## Controls

| Action | Keyboard | Mobile device |
|---|---|---|
| Move | Default `A` / `D`, configurable | Left and right touch buttons |
| Jump | Default `Space`, configurable | `JUMP` |
| Ice pick | Default `X`, configurable | `PICK` |
| Pause | `P` or `Esc` | `PAUSE` |
| Fullscreen | `FULLSCREEN` button | Native fullscreen or immersive Safari fallback |

Desktop key bindings can be reassigned below the game. **Reset local profile** deletes progress, unlocks, high score and settings only on the current device.

## Graphics

Four presets are available:

- **Low:** reduced resolution and effects for older or warm mobile devices
- **Medium:** battery-friendly smartphone setting
- **High:** high resolution and extended effects
- **Ultra:** WebGPU post-processing, GPU instancing, adaptive effects and resolution up to 4K with WebGL2 fallback

Every preset supports 60 FPS, up to 120 FPS or Unlimited frame-rate limits. Ultra can be demanding and may warm mobile devices.

[Read the complete Ultra, WebGPU, F16, 120 Hz, iPhone and performance documentation →](docs/DETAILS.md#ultra-webgpu-and-performance)

## Technology

- React 19 + TypeScript + Vite 8
- Canvas 2D with WebGPU Ultra effects and WebGL2-compatible fallback
- Web Worker for Ultra instance simulation and performance control
- Web Audio API and original MP3 soundtrack
- Pointer Events for mouse, touch and pen
- Local Storage for progress and settings
- Automatic GitHub Pages deployment through GitHub Actions

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Development channels, local artifacts and beta/final build rules are documented in the [detailed technical page](docs/DETAILS.md#development-and-release-workflow) and the [release workflow](docs/RELEASE_WORKFLOW.md).

## Privacy

Progress, high score, graphics settings, difficulty choices, unlocked levels and key bindings stay in the local browser profile. The game performs only an optional public GitHub release check for newer beta or final builds.

- [Privacy Report](PRIVACY.md)
- [Datenschutzbericht](DATENSCHUTZ.md)

## Community

Questions, feedback and discussions are welcome on [Discord](https://discord.gg/Zy93AaYFaj).

## Repo activity

![Repobeats analytics image](https://repobeats.axiom.co/api/embed/53f9be10734a94ff32acba519ab5639442630dea.svg "Repobeats analytics image")

## License

The source code is available under the [MIT License](LICENSE). The name **Skybreak Protocol**, logos, app icons, screenshots, promotional images and visual artwork are excluded; see the [Asset and Brand License](ASSET_LICENSE.md).

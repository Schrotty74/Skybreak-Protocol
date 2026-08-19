<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol emblem" width="180" height="180">
</p>

<p align="center"><a href="README.de.md">Deutsch</a> · <strong>English</strong></p>

# Skybreak Protocol

[![Deploy Pages](https://github.com/Schrotty74/Skybreak-Protocol/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Schrotty74/Skybreak-Protocol/actions/workflows/deploy-pages.yml)
[![Latest Release](https://img.shields.io/github/v/release/Schrotty74/Skybreak-Protocol)](https://github.com/Schrotty74/Skybreak-Protocol/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Schrotty74/Skybreak-Protocol/total)](https://github.com/Schrotty74/Skybreak-Protocol/releases)

**Current release:** `v1.0.1-beta.8` · [Detailed changelog](docs/releases/1.0.1-beta.8.en.md) · [All changelogs](CHANGELOG.md)

An independent vertical cyberpunk arcade game for modern desktop and mobile browsers. Fight upward through fourteen visually distinct levels, break platforms from below, evade drones and falling hazards, and reach the transmission tower above the megacity. Every level has its own theme, 2.5D platform material, animated scenery, effects, guardian, and soundtrack.

> Skybreak Protocol uses no graphics, music, characters, or source code from Nintendo or Ice Climber. It is an independent reinterpretation of the classic vertical arcade concept.

Data handling is documented in the [English Privacy Report](PRIVACY.md) and the [German privacy report](DATENSCHUTZ.md).

## Play

- **GitHub Pages — English:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **GitHub Pages — German:** <https://schrotty74.github.io/Skybreak-Protocol/de/>

The web app runs without installation. On iPhone or iPad, use **Share → Add to Home Screen** in Safari to install the app icon. Android browsers offer the equivalent option in their menu.

The current version is shown in the game. On startup, Skybreak Protocol checks the public GitHub releases once and displays a notice when a newer beta or final build is available.

**Play offline:** The versioned ZIP is available under **Assets** in the [GitHub release](https://github.com/Schrotty74/Skybreak-Protocol/releases/tag/v1.0.1-beta.8). Extract it and open the matching starter for macOS, Windows, or Linux. All fourteen music tracks are included; only the optional update check requires internet access.

## Manual

- [English PDF manual](docs/manual/Skybreak-Protocol-Manual-EN.pdf) - gameplay, controls, every button, fourteen levels, power-ups, and cheat codes
- [Deutsches PDF-Handbuch](docs/manual/Skybreak-Protocol-Handbuch-DE.pdf)

## Mobile screenshots

<p align="center">
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg" alt="Skybreak Protocol compact mobile start menu" width="260"></a>
  &nbsp;&nbsp;
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-options.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-options.jpeg" alt="Skybreak Protocol mobile start menu with expanded options" width="260"></a>
</p>

<p align="center"><em>Click a preview to open the full-size image.</em></p>

## Desktop screenshots

<p align="center">
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg" alt="Skybreak Protocol desktop gameplay in Ultra mode" width="430"></a>
  &nbsp;&nbsp;
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-start-ultra.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-start-ultra.jpeg" alt="Skybreak Protocol desktop start screen" width="430"></a>
</p>

<p align="center"><em>Click a preview to open the full-size image.</em></p>

## Gameplay

- Ascend through fourteen visually distinct cyberpunk and elemental levels
- Every level is a complete 15-floor ascent with its own fair route blueprint, animated environment, 2.5D platform material, enemy and guardian design, ice-pick base model, and soundtrack
- Break platform modules from below
- Use the robot's ice pick against enemies and nearby platform modules
- Difficulty-aware patrols, guardians, chests, and falling hazards use the same rules in every level: Easy uses four patrols and one guardian; Medium uses five patrols and two guardians; Hard uses six patrols and two guardians. Only selected patrols shoot, and Medium/Hard stagger their volleys.
- Break destructible vertical walls and double decks that require two upward jumps. Phase blocks support the robot only while active and are clearly marked `PHASE 01` through `PHASE 14`; Easy/Medium/Hard distribute four/eight/twelve blocks across separate floors. Four/six/eight routes also move sideways through the ascent. Every level gives its route, boss arena, and two objective devices a distinct readable presentation without changing combat values.
- Difficulty-aware chests: choose from seven rewards (shield, life, data bonus, overdrive, jackpot, repair plus shield, or phase armor). Easy has five fixed chests; Medium has four fixed chests plus two roaming bonus chests after 40% height; Hard has two fixed chests plus one roaming bonus chest after 60%. Roaming chests grant enhanced bonuses.
- A shield lasts 8 seconds and absorbs three hits on Easy, 6 seconds and two hits on Medium, or 4 seconds and one hit on Hard.
- Defeat the level guardian, preview the next sector, then choose the concrete next ice-pick power or visual-style upgrade
- Watch the robot show persistent armor damage, sensor flicker, and sparks when lives are lost
- Permanently unlock reached levels locally and select any unlocked level as the next starting point after a run
- Avoid gaps, falling energy fragments, and patrol drones
- Collect points, preserve lives, and improve the local high score

## Controls

| Action | Keyboard | Mobile device |
|---|---|---|
| Move | Default `A` / `D`, configurable | Left and right touch buttons |
| Jump | Default `Space`, configurable | `JUMP` |
| Ice pick | Default `X`, configurable | `PICK` |
| Pause | `P` or `Esc` | `PAUSE` |
| Fullscreen | `FULLSCREEN` button | Native fullscreen or immersive Safari fallback |

On desktop, use **Key bindings** below the game: select an action and then press the desired key. A duplicate assignment swaps the two bindings; **Reset keys** restores `A`, `D`, `Space`, and `X`. **Reset local profile** in the start menu deletes local progress, unlocks, record, and settings.

## Robot and ice-pick upgrades

The playable character is a compact cyberpunk climbing robot with separate mechanical limbs, illuminated sensors, antenna, animated joints, and a permanently visible ice pick. When left standing still, the robot inspects and playfully twirls the tool instead of remaining frozen.

The ice pick attacks drones and breaks cracked platform modules in front of the robot. When entering levels 2 through 14 for the first time, the game pauses briefly and offers one upgrade:

- **Power:** previews reach and breakable platform modules per strike before selection, then increases both progressively
- **Style:** previews the next design name before selection, then changes the ice pick's core color, head geometry, and glow intensity

Upgrades apply to the current run and are shown as `P` and `S` values in the level display.

## Original retro arcade soundtrack

The start screen and every level have their own original, sample-free retro-arcade track. Levels 1 to 10 use distinct late-1980s/early-1990s arcade arrangements with their own tempo, meter, melody, bass pattern, and percussion. Music begins after the first tap or key press, changes automatically with a short crossfade, loops during the level, and can be switched independently from the sound effects.

| Level | Track | BPM | Listen / download |
|---|---|---:|---|
| 1 + start | Neon Climber | 112 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-01-neon-undercity.mp3) |
| 2 | Bazaar Bounce | 124 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-02-chrome-bazaar.mp3) |
| 3 | Toxic Express | 136 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-03-toxic-transit.mp3) |
| 4 | Firewall Assault | 148 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-04-crimson-firewall.mp3) |
| 5 | Data Current | 98 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-05-azure-data-sea.mp3) |
| 6 | Reactor Vector | 128 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-06-violet-reactor.mp3) |
| 7 | Solar Sprint | 144 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-07-solar-megagrid.mp3) |
| 8 | Ghost Signal | 106 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-08-ghost-network.mp3) |
| 9 | Rift Runner | 132 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-09-quantum-rift.mp3) |
| 10 | Apex Ascension | 156 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-10-skybreak-apex.mp3) |
| 11 | Inferno Foundry | 116 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-11-inferno-foundry.mp3) |
| 12 | Abyssal Data Ocean | 92 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-12-abyssal-data-ocean.mp3) |
| 13 | Stratosphere Relay | 126 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-13-stratosphere-relay.mp3) |
| 14 | Terra Core Citadel | 100 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-14-terra-core-citadel.mp3) |

## Graphics quality

The selected level is stored locally on the device.

| Level | Target | Effects |
|---|---|---|
| Low | older or warm mobile devices | reduced resolution, no WebGL effects, little rain and fog |
| Medium | battery-friendly smartphone setting | WebGL fog, reduced particles and parallax |
| High | powerful devices | high resolution and extended effects |
| Ultra | current desktop and mobile GPUs | full-scene WebGPU post-processing, F16 shaders, GPU instancing, adaptive resolution and effects; WebGL2 fallback |

Every preset has the same **Frame rate limit** choice: 60 FPS, up to 120 FPS, or Unlimited. The desktop-only **Showcase** runs for 30 seconds after a two-second warm-up, with an autonomous climbing robot, block destruction, and a deliberately high effect budget. It reports preset, resolution, limit, FPS, frame time, CPU time, and - where the browser exposes it - GPU time locally.

## Local profile unlock code

To unlock all levels, robot models, and the hologram avatar in the local browser profile, switch **SFX OFF/ON** twice within five seconds, then switch **MUSIC OFF** within five seconds. The confirmation is displayed directly over the start screen. It unlocks content locally only and does not send data anywhere.

> [!WARNING]
> **On an iPhone 17 Pro, “Ultra + 1080p” reached 60 FPS. 4K Ultra is an extremely demanding quality and screenshot mode, not a 60 FPS mobile mode. Ultra can still warm the device; in high ambient temperatures, direct sunlight, or when the phone becomes very warm, switch to Medium or Low.**

### What Ultra changes

Ultra adds a full-scene WebGPU pipeline that requests the browser's **high-performance GPU**. On macOS the browser maps WebGPU to Metal; on current NVIDIA and AMD systems it uses the browser's native GPU backend. Compared with High, Ultra renders denser multilayer fog and rain, energy grids, animated light beams, stronger bloom, screen-space neon reflections, chromatic treatment, tone mapping, and higher resolution up to 4K.

Platforms, enemies, debris, gameplay particles, and rain receive GPU-instanced enhancement layers. Prepared sprites, cached background layers, and visible-area culling reduce repeated Canvas work. A dedicated Web Worker calculates atmospheric instances and evaluates frame timing away from the main game thread. The player selects the 60 FPS, up-to-120 FPS, or Unlimited frame-rate limit for every graphics preset.

When supported, Ultra uses efficient 16-bit shader arithmetic for tone mapping and otherwise keeps the compatible 32-bit path. A Mac Studio M4 Max reached **120 FPS in Ultra at 4K** in Safari with a 120 Hz display after Safari's page-rendering preference was adjusted. The browser exposes no temperature sensor, so a local performance controller detects sustained frame-time degradation as a sign of thermal or power throttling and progressively reduces bloom samples, reflections, post-processing, and render resolution. No measurement leaves the device.

### 120 Hz browsers on macOS

The display itself must be set to 120 Hz or higher. Safari can still prefer 60 FPS for web pages: open **Safari → Settings → Advanced → Feature Flags**, search for **“Prefer Page Rendering Updates near 60fps”**, disable it, then fully quit Safari with `⌘Q` and reopen it. The Safari window must be on the high-refresh display. Chrome and Firefox normally use the display refresh rate without an equivalent game setting; their measured rate can still be limited by the display, power-saving mode, background tabs, or browser workload.

Unsupported or software-only WebGPU adapters automatically use the existing WebGL2 and Canvas renderer.

### iPhone Pro and hardware ray tracing

The iPhone 15 Pro introduced a 6-core Apple GPU with hardware-accelerated ray tracing. The iPhone 17 Pro uses the A19 Pro with a 6-core GPU, hardware-accelerated ray tracing, and improved sustained gaming performance. Skybreak Protocol already benefits from these GPUs through Safari's WebGPU-to-Metal path: Ultra uses full-scene post-processing, GPU instancing, worker-assisted calculations, and adaptive resolution on supported iPhones. [Apple: iPhone 15 Pro](https://www.apple.com/newsroom/2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/) · [Apple: iPhone 17 Pro specifications](https://www.apple.com/iphone-17-pro/specs/)

Hardware ray-tracing cores cannot currently be addressed directly by this web app because ray tracing is not part of the browser WebGPU feature set. Ultra therefore uses screen-space neon reflections rather than hardware ray tracing. On a high-refresh iPhone Pro, the optional Mobile Ultra setting can target up to 120 FPS; the adaptive controller falls back to 90/60 FPS and reduced post-processing when sustained performance drops. [Current WebGPU feature list](https://gpuweb.github.io/types/types/GPUFeatureName.html)

## Visual effects

- WebGPU Ultra shader for multilayer neon fog, denser rain, energy grids, light beams, and atmospheric bloom
- full-scene bloom, screen-space neon reflections, chromatic treatment, tone mapping, and vignette
- GPU-instanced enhancement layers for platforms, enemies, debris, gameplay particles, and rain
- Web Worker for atmospheric instance calculation and adaptive 60/90/120 FPS control
- automatic use of Metal on macOS and the browser's native GPU backend on current NVIDIA/AMD systems
- adaptive Ultra effect resolution up to 4K with WebGL2 fallback
- conditional F16 WebGPU tone mapping with automatic F32 fallback
- optional Mobile Ultra up to 120 FPS with performance-based thermal protection
- multilayer parallax megacity with illuminated windows
- volumetric searchlights and dynamic light cones
- holographic advertising and flying city traffic
- animated neon rain, scanlines, and subtle chromatic effects
- dimensional platform modules with metal, glass, and energy textures
- dynamic shadows, bloom, movement trails, and ice-pick trails
- particles, debris, impact effects, and screen shake
- adaptive rendering resolution up to 4K
- animated cyberpunk robot with an upgradeable ice pick and an idle inspection/twirling animation

## Technology

- React 19 and TypeScript
- Vite 8
- Canvas 2D with a WebGPU Ultra effects layer and WebGL2-compatible fallback
- module Web Worker for Ultra instance simulation and performance control
- Web Audio API for synthesized arcade sounds
- same-origin MP3 soundtrack playback with automatic level crossfades
- public GitHub release check for newer beta and final builds
- Pointer Events for mouse, touch, and pen input
- Local Storage for the high score, graphics level, difficulties, unlocked levels, and desktop key bindings
- automatic GitHub Pages deployment through GitHub Actions
- CSS immersive fullscreen fallback for iPhone Safari

## Fourteen level environments

| Level | Environment | Visual identity and effect |
|---:|---|---|
| 1 | Neon Undercity | cyan and magenta city depths with moving neon scan bars |
| 2 | Chrome Bazaar | pink, mint, and chrome tones with animated holographic frames |
| 3 | Toxic Transit | toxic green infrastructure with rising energy bubbles |
| 4 | Crimson Firewall | red-orange security zone with pulsing firewall columns |
| 5 | Azure Data Sea | deep-blue data district with flowing digital waves |
| 6 | Violet Reactor | violet power core with expanding reactor rings |
| 7 | Solar Megagrid | amber-red energy grid with a radiant solar glow |
| 8 | Ghost Network | pale-cyan network ruins with drifting spectral streaks |
| 9 | Quantum Rift | purple-blue dimensional zone with a moving quantum path |
| 10 | Skybreak Apex | bright cyan summit with rotating transmission rays |
| 11 | Inferno Foundry | lava cavern with unstable heat haze and forge eruptions |
| 12 | Abyssal Data Ocean | deep ocean with manta rays and visibly wet platform shine |
| 13 | Stratosphere Relay | high-altitude storm with turbines and visible gusts |
| 14 | Terra Core Citadel | mineral core cavern with levitating rocks and tremors |

Every level can independently use **Easy**, **Medium**, or **Hard**. Each setting uses the same enemy, guardian, shot, hazard, and reachable-gap values in all fourteen levels; route direction, scenery, music, colours, platform appearance, objective devices, and boss arena differ by level. Choices are stored only in the browser on the device.

## Local development

```bash
npm install
npm run dev
```

`npm run dev` is always labelled **LOCAL TEST**, uses separate save data, and does not check GitHub releases. `npm run dev:beta` and `npm run dev:final` are available for the other channels and each reject a version intended for the wrong release channel.

On macOS, double-click `Skybreak-Protocol-Lokaltest.command` to start this local test channel and open it in the browser. The Terminal window stays open while the server is running; press `Ctrl+C` there to stop it.

Production build:

```bash
npm run build
```

Use `npm run build:local` for local artifacts with no publishing intent. Separate beta and final test artifacts are built with `npm run build:beta` and `npm run build:final`; details are in the [release workflow](docs/RELEASE_WORKFLOW.md).

Every beta and final build requires its own detailed file under `docs/releases/`. See the [release workflow](docs/RELEASE_WORKFLOW.md).

## Device performance

On an **iPhone 17 Pro**, **Ultra + 1080p** reached 60 FPS with the full Ultra effects. **4K Ultra** is an extremely demanding quality and screenshot mode on mobile devices, not the 60 FPS mode. Ultra can still warm the device; select **Medium** or **Low** if it becomes noticeably warm.

## Repo activity

![Repobeats analytics image](https://repobeats.axiom.co/api/embed/53f9be10734a94ff32acba519ab5639442630dea.svg "Repobeats analytics image")

## License

The source code is available under the [MIT License](LICENSE). The name **Skybreak Protocol**, logos, app icons, screenshots, promotional images, and visual artwork are excluded; see the [Asset and Brand License](ASSET_LICENSE.md).
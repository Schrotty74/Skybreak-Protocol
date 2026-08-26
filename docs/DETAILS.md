# Skybreak Protocol — Game & Technical Details

[Deutsch](DETAILS.de.md) · **English** · [← Back to README](../README.md)

This page contains the extended gameplay, soundtrack, graphics, performance and technical information that is intentionally kept out of the main README.

## Detailed gameplay rules

Skybreak Protocol contains fourteen visually distinct levels. Every level is a complete 15-floor ascent with its own route blueprint, animated environment, 2.5D platform material, enemy and guardian design, ice-pick base model and soundtrack.

Difficulty-aware patrols, guardians, chests and falling hazards use consistent rules in every level: Easy uses four patrols and one guardian; Medium uses five patrols and two guardians; Hard uses six patrols and two guardians. Only selected patrols shoot, and Medium/Hard stagger their volleys.

Destructible vertical walls and double decks require two upward jumps. Phase blocks support the robot only while active and are marked `PHASE 01` through `PHASE 14`; Easy/Medium/Hard distribute four/eight/twelve blocks across separate floors. Four/six/eight routes also move sideways through the ascent.

Difficulty-aware chests offer seven rewards: shield, life, data bonus, overdrive, jackpot, repair plus shield, or phase armor. Easy has five fixed chests; Medium has four fixed chests plus two roaming bonus chests after 40% height; Hard has two fixed chests plus one roaming bonus chest after 60%. Roaming chests grant enhanced bonuses.

A shield lasts 8 seconds and absorbs three hits on Easy, 6 seconds and two hits on Medium, or 4 seconds and one hit on Hard.

Reached levels are permanently unlocked in the local browser profile and can be selected as the starting level for later runs.

## Robot and ice-pick upgrades

The playable character is a compact cyberpunk climbing robot with separate mechanical limbs, illuminated sensors, antenna, animated joints and a permanently visible ice pick. When standing still, the robot inspects and twirls the tool.

The ice pick attacks drones and breaks cracked platform modules in front of the robot. When entering levels 2 through 14 for the first time, the game pauses briefly and offers one upgrade:

- **Power:** increases reach and the number of breakable platform modules per strike.
- **Style:** changes the ice pick's design name, core colour, head geometry and glow intensity.

Upgrades apply to the current run and are shown as `P` and `S` values in the level display.

## Original retro arcade soundtrack

The start screen and every level have their own original, sample-free retro-arcade track. Music begins after the first tap or key press, changes automatically with a short crossfade, loops during the level and can be switched independently from sound effects.

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

| Level | Target | Effects |
|---|---|---|
| Low | older or warm mobile devices | reduced resolution, no WebGL effects, little rain and fog |
| Medium | battery-friendly smartphone setting | WebGL fog, reduced particles and parallax |
| High | powerful devices | high resolution and extended effects |
| Ultra | current desktop and mobile GPUs | full-scene WebGPU post-processing, F16 shaders, GPU instancing, adaptive resolution and effects; WebGL2 fallback |

Every preset supports a frame-rate limit of 60 FPS, up to 120 FPS, or Unlimited. The desktop-only Showcase runs for 30 seconds after a two-second warm-up with an autonomous climbing robot, block destruction and a deliberately high effect budget. It reports preset, resolution, limit, FPS, frame time, CPU time and, where exposed by the browser, GPU time locally.

## Local profile unlock code

To unlock all levels, robot models and the hologram avatar in the local browser profile, switch **SFX OFF/ON** twice within five seconds, then switch **MUSIC OFF** within five seconds. The confirmation appears directly over the start screen. This unlocks content locally only.

## Ultra, WebGPU and performance

Ultra adds a full-scene WebGPU pipeline that requests the browser's high-performance GPU. On macOS, the browser maps WebGPU to Metal; on current NVIDIA and AMD systems it uses the browser's native GPU backend. Compared with High, Ultra renders denser multilayer fog and rain, energy grids, animated light beams, stronger bloom, screen-space neon reflections, chromatic treatment, tone mapping and resolution up to 4K.

Platforms, enemies, debris, gameplay particles and rain receive GPU-instanced enhancement layers. Prepared sprites, cached background layers and visible-area culling reduce repeated Canvas work. A dedicated Web Worker calculates atmospheric instances and evaluates frame timing away from the main game thread.

When supported, Ultra uses 16-bit shader arithmetic for tone mapping and otherwise keeps the compatible 32-bit path. Unsupported or software-only WebGPU adapters automatically use the existing WebGL2 and Canvas renderer.

A local performance controller reacts to sustained frame-time degradation by reducing bloom samples, reflections, post-processing and render resolution. No measurement leaves the device.

### 120 Hz browsers on macOS

The display must itself be set to 120 Hz or higher. Safari can still prefer about 60 FPS for web pages. To change this, open **Safari → Settings → Advanced → Feature Flags**, search for **“Prefer Page Rendering Updates near 60fps”**, disable it, then fully quit Safari with `⌘Q` and reopen it. The Safari window must be on the high-refresh display.

Chrome and Firefox normally use the display refresh rate without an equivalent game setting, but may still be limited by the display, power-saving mode, background tabs or browser workload.

### iPhone Pro and hardware ray tracing

Current Pro-class iPhones expose powerful GPUs to Safari through WebGPU-to-Metal. Skybreak Protocol uses this for full-scene post-processing, GPU instancing, worker-assisted calculations and adaptive resolution on supported devices.

Hardware ray-tracing cores cannot currently be addressed directly by this web app because ray tracing is not part of the browser WebGPU feature set. Ultra therefore uses screen-space neon reflections instead of hardware ray tracing. On a high-refresh iPhone Pro, Mobile Ultra can target up to 120 FPS; the adaptive controller falls back to 90/60 FPS and reduced post-processing when sustained performance drops.

References: [Apple iPhone 15 Pro](https://www.apple.com/newsroom/2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/) · [Apple iPhone 17 Pro specifications](https://www.apple.com/iphone-17-pro/specs/) · [Current WebGPU feature list](https://gpuweb.github.io/types/types/GPUFeatureName.html)

## Visual effects

- WebGPU Ultra shader for multilayer neon fog, denser rain, energy grids, light beams and atmospheric bloom
- full-scene bloom, screen-space neon reflections, chromatic treatment, tone mapping and vignette
- GPU-instanced enhancement layers for platforms, enemies, debris, gameplay particles and rain
- Web Worker for atmospheric instance calculation and adaptive 60/90/120 FPS control
- Metal on macOS and native browser GPU backends on current NVIDIA/AMD systems
- adaptive Ultra effect resolution up to 4K with WebGL2 fallback
- conditional F16 WebGPU tone mapping with automatic F32 fallback
- optional Mobile Ultra up to 120 FPS with performance-based thermal protection
- multilayer parallax megacity, illuminated windows, volumetric searchlights and dynamic light cones
- holographic advertising, flying city traffic, neon rain, scanlines and chromatic effects
- dimensional platform modules with metal, glass and energy textures
- dynamic shadows, bloom, movement trails, particles, debris, impact effects and screen shake

## Technology

- React 19 and TypeScript
- Vite 8
- Canvas 2D with a WebGPU Ultra effects layer and WebGL2-compatible fallback
- module Web Worker for Ultra instance simulation and performance control
- Web Audio API for synthesized arcade sounds
- same-origin MP3 soundtrack playback with automatic level crossfades
- public GitHub release check for newer beta and final builds
- Pointer Events for mouse, touch and pen input
- Local Storage for high score, graphics level, difficulties, unlocked levels and desktop key bindings
- automatic GitHub Pages deployment through GitHub Actions
- CSS immersive fullscreen fallback for iPhone Safari

## Fourteen level environments

| Level | Environment | Visual identity and effect |
|---:|---|---|
| 1 | Neon Undercity | cyan and magenta city depths with moving neon scan bars |
| 2 | Chrome Bazaar | pink, mint and chrome tones with animated holographic frames |
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

Every level can independently use **Easy**, **Medium** or **Hard**. Combat values stay consistent across all fourteen levels, while route direction, scenery, music, colours, platform appearance, objective devices and boss arena differ by level. Choices are stored only in the local browser profile.

## Development and release workflow

```bash
npm install
npm run dev
```

`npm run dev` is labelled **LOCAL TEST**, uses separate save data and does not check GitHub releases. `npm run dev:beta` and `npm run dev:final` are available for the other channels and reject versions intended for the wrong release channel.

On macOS, double-click `Skybreak-Protocol-Lokaltest.command` to start the local test channel and open it in the browser. Stop it with `Ctrl+C` in Terminal.

Production build:

```bash
npm run build
```

Use `npm run build:local` for local artifacts with no publishing intent. Separate beta and final test artifacts use `npm run build:beta` and `npm run build:final`. Full release-channel rules are documented in the [release workflow](RELEASE_WORKFLOW.md).

Every beta and final build requires its own detailed file under `docs/releases/`.

## Device performance note

On an iPhone 17 Pro, **Ultra + 1080p** reached 60 FPS with the full Ultra effects. **4K Ultra** is an extremely demanding quality and screenshot mode on mobile devices, not the 60-FPS mode. If the device becomes noticeably warm, use Medium or Low.

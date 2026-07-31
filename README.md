<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol emblem" width="180" height="180">
</p>

<p align="center"><a href="README.de.md">Deutsch</a> · <strong>English</strong></p>

# Skybreak Protocol

An independent vertical cyberpunk arcade game for modern desktop and mobile browsers. Fight upward through ten visually distinct levels, break platforms from below, evade drones and falling hazards, and reach the transmission tower above the megacity. Each level has its own cyberpunk palette, animated scenery, effects, and independently selectable difficulty.

> Skybreak Protocol uses no graphics, music, characters, or source code from Nintendo or Ice Climber. It is an independent reinterpretation of the classic vertical arcade concept.

Data handling is documented in the [English Privacy Report](PRIVACY.md) and the [German privacy report](DATENSCHUTZ.md).

## Play

- **GitHub Pages — English:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **GitHub Pages — German:** <https://schrotty74.github.io/Skybreak-Protocol/de/>

The web app runs without installation. On iPhone or iPad, use **Share → Add to Home Screen** in Safari to install the app icon. Android browsers offer the equivalent option in their menu.

## Mobile screenshots

<p align="center">
  <a href="docs/screenshots/mobile-start.jpeg?raw=1"><img src="docs/screenshots/mobile-start.jpeg" alt="Skybreak Protocol mobile start screen" width="260"></a>
  &nbsp;&nbsp;
  <a href="docs/screenshots/mobile-gameplay.jpeg?raw=1"><img src="docs/screenshots/mobile-gameplay.jpeg" alt="Skybreak Protocol mobile gameplay" width="260"></a>
</p>

<p align="center"><em>Click a preview to open the full-size image. Desktop screenshots will follow.</em></p>

## Gameplay

- Ascend through ten increasingly difficult cyberpunk levels
- Break platform modules from below
- Disable enemies with the pulse hammer or by jumping on them
- Avoid gaps, falling energy fragments, and patrol drones
- Collect points, preserve lives, and improve the local high score

## Controls

| Action | Keyboard | Mobile device |
|---|---|---|
| Move | `A` / `D` or `←` / `→` | Left and right touch buttons |
| Jump | `W`, `↑`, or `Space` | `JUMP` |
| Pulse hammer | `X` or `K` | `PULSE` |
| Pause | `P` or `Esc` | `PAUSE` |
| Fullscreen | `FULLSCREEN` button | Native fullscreen or immersive Safari fallback |

## Graphics quality

The selected level is stored locally on the device.

| Level | Target | Effects |
|---|---|---|
| Low | older or warm mobile devices | 30 FPS, reduced resolution, WebGL effects disabled, little rain and fog |
| Medium | recommended smartphone setting | 40 FPS, WebGL fog, reduced particles and parallax |
| High | powerful devices | up to 60 FPS, high resolution, and extended effects |
| Ultra | current desktop GPUs and 4K | full render resolution, maximum particles, WebGL2, lighting, and parallax |

## Visual effects

- optional WebGL2 shader for animated neon fog, rain, and atmospheric glow
- multilayer parallax megacity with illuminated windows
- volumetric searchlights and dynamic light cones
- holographic advertising and flying city traffic
- animated neon rain, scanlines, and subtle chromatic effects
- dimensional platform modules with metal, glass, and energy textures
- dynamic shadows, bloom, movement trails, and pulse-hammer trails
- particles, debris, impact effects, and screen shake
- adaptive rendering resolution up to 4K

## Technology

- React 19 and TypeScript
- Vite 8
- Canvas 2D with a WebGL2 effects layer and compatible fallback
- Web Audio API for synthesized arcade sounds
- Pointer Events for mouse, touch, and pen input
- Local Storage for the high score and graphics level
- automatic GitHub Pages deployment through GitHub Actions
- CSS immersive fullscreen fallback for iPhone Safari

## Ten level environments

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

Enemy density and environmental hazards increase from level to level. Every level can independently use **Easy**, **Medium**, or **Hard**; the selected setting changes enemy speed, hazard frequency, hazard speed, and score multiplier. Choices are stored only in the browser on the device.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Device performance

Ultra can heavily load smartphones, increase temperature, and drain the battery faster. **Medium** is recommended for iPhone and Android devices. Select **Low** if the device becomes noticeably warm.

## License

The source code is available under the MIT license included in this repository.

<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol emblem" width="180" height="180">
</p>

<p align="center"><a href="README.de.md">Deutsch</a> · <strong>English</strong></p>

# Skybreak Protocol

An independent vertical cyberpunk arcade game for modern desktop and mobile browsers. Break through platforms from below, evade drones and falling hazards, and reach the transmission tower above the megacity.

> Skybreak Protocol uses no graphics, music, characters, or source code from Nintendo or Ice Climber. It is an independent reinterpretation of the classic vertical arcade concept.

Data handling is documented in the [English Privacy Report](PRIVACY.md) and the [German privacy report](DATENSCHUTZ.md).

## Play

- **GitHub Pages — English:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **GitHub Pages — German:** <https://schrotty74.github.io/Skybreak-Protocol/de/>
- **Alternative OpenAI Sites version:** <https://neon-ascent.bk-bezahlen.chatgpt.site>

The web app runs without installation. On iPhone or iPad, use **Share → Add to Home Screen** in Safari to install the app icon. Android browsers offer the equivalent option in their menu.

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

Each level has its own color palette, animated background motif, lighting, atmospheric effects, and rising enemy pressure: Neon Undercity, Chrome Bazaar, Toxic Transit, Crimson Firewall, Azure Data Sea, Violet Reactor, Solar Megagrid, Ghost Network, Quantum Rift, and Skybreak Apex.

Every level can independently use **Easy**, **Medium**, or **Hard**. The choice is stored locally. Higher levels remain progressively faster and more hazardous at every selected difficulty.

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

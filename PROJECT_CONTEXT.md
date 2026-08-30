# Skybreak Protocol – Projektkontext

**Stand:** 30. August 2026

**Öffentliche Version:** `1.0.1-beta.8`
**Arbeitsstand:** Final-Kandidat `1.0.1` wird lokal gebaut; noch nicht veröffentlicht

Die allgemeinen Arbeits-, Git-, Veröffentlichungs- und Repository-Datenschutzregeln stehen verbindlich in `AGENTS.md`. Diese Datei enthält den projektspezifischen technischen und funktionalen Kontext.

## Zweck und Grenzen

Skybreak Protocol ist ein eigenständiges vertikales Cyberpunk-Arcade-Spiel für aktuelle Desktop- und Mobilbrowser. Es gibt ausschließlich die Web-Version: keine native macOS-App und keine 3D-App. Die öffentliche App läuft über GitHub Pages; öffentliche Betas und Finals erhalten zusätzlich ein versioniertes Offline-ZIP.

Alle Spielstände, Freischaltungen und Einstellungen liegen lokal im Browser. Es gibt keine Konten, keinen Anwendungsserver und keine Analyse-Dienste.

## Bestätigter Spielstand

- Vierzehn Level mit jeweils 15 Etagen, eigener 2.5D-Kulisse, Plattformoptik, Routenvariante, Zielgeräten, Bossarena und Musik.
- Die Schwierigkeit ist in allen Leveln gleich: Leicht 4 Patrouillen und 1 Boss, Mittel 5 Patrouillen und 2 Bosse, Schwer 6 Patrouillen und 2 Bosse. Nur ausgewählte Patrouillen schießen; auf Mittel und Schwer sind Schüsse zeitlich gestaffelt. Nur ein Boss pro Begegnung schießt und wirft Bomben.
- Boss-Integrität: 2/5/8 Treffer auf Leicht/Mittel/Schwer. Schilde halten 8/6/4 Sekunden und 3/2/1 Treffer aus. Leicht/Mittel/Schwer besitzen 2/4/6 zerstörbare senkrechte Wände sowie 1/2/3 Doppelstege.
- Fallgefahren lösen sich sichtbar unter vorhandenen Stegen, nicht am oberen Bildschirmrand: Leicht 1 Objekt alle 5,8–7,2 Sekunden, Mittel 1 alle 3,5–4,8 Sekunden, Schwer 2 alle 2,2–3,3 Sekunden. Ihr Stil unterscheidet sich je Level, Anzahl und Timing nur nach Schwierigkeit.
- Phasenblöcke sind über getrennte Etagen verteilt: 4/8/12 auf Leicht/Mittel/Schwer. Seitlich bewegliche Stege: 4/6/8. Beide Plattformarten sind in allen Leveln vorhanden und klar lesbar.
- Truhen: Leicht 5 feste; Mittel 4 feste plus 2 wandernde Bonustruhen ab 40 % Höhe; Schwer 2 feste plus 1 wandernde Bonustruhe ab 60 % Höhe. Wandernde Truhen gewähren stärkere Boni.
- Level 1 bis 10 verwenden zehn unterschiedliche, samplefreie Retro-Arcade-Tracks. Die zentrale Audioverwaltung entfernt bei Levelwechsel, Neustart, Pause, Menüwechsel und Unmount alte Musikobjekte, sodass kein Track überlagert bleibt.
- Die Sektorbezeichnungen sind reine Umgebungsnamen und behaupten keine entfernten Wind-, Laser- oder Pulseffekte.

## Architektur

| Bereich | Zuständigkeit |
|---|---|
| `src/SkybreakProtocol.tsx` | React-Komponente, Spielzustand, Schleife, Schwierigkeitsregeln, Canvas und Oberfläche |
| `src/game/world.ts` | Welterzeugung und Plattformgrundlayout |
| `src/gameAudio.ts` | Soundeffekte, Musikwechsel und Aufräumen früherer Tracks |
| `src/game/` | Hintergrund-, Entitäten- und WebGPU/WebGL-Effekte |
| `src/levelData.ts` | Levelthemen, Hintergrund-, Musik- und Fallgefahrenstile |
| `src/storage.ts` | nach Local/Beta/Final getrennte Browser-Speicherung und Profil-Reset |
| `source/` | englische, deutsche und Reset-Vite-Einstiegspunkte |
| `public/` | veröffentlichte Musik-, Bild-, Icon- und Manifest-Assets |
| `scripts/` | Release-Prüfung, Pages-Aufbereitung, Offline-Paket, Handbücher, Musik- und Leistungswerkzeuge |
| `.github/workflows/` | GitHub-Pages-Bereitstellung und Release-Veröffentlichung |

## Build, Test und Veröffentlichung

- Frischer Checkout: `npm ci`
- Lokaler Server: `npm run dev` oder `Skybreak-Protocol-Lokaltest.command`
- Sicherer lokaler Produktions-Build: `npm run build:local`
- Getrennte Kanäle: `npm run dev:beta`, `npm run dev:final`, `npm run build:beta`, `npm run build:final`
- Veröffentlichbarer Pages-Build: `npm run build`; Offline-Paket: `npm run build:offline`
- Nach sichtbaren Spieländerungen: `npm run build:handbooks` und beide erzeugten PDFs visuell prüfen.
- Nach jeder Spieländerung `npm run build:local` ausführen und den lokalen Starter bereithalten.

## Verbindliche Pflege

Bei jeder relevanten Änderung diese Datei, [`NEXT_STEPS.md`](NEXT_STEPS.md) und [`PORTFOLIO_UPDATE.md`](PORTFOLIO_UPDATE.md) gegen den tatsächlichen Stand prüfen und bei Bedarf im selben Arbeitsgang aktualisieren. Bei öffentlichen Änderungen zusätzlich README, Changelog, Release-Notizen, Handbücher und Datenschutzdokumente nach dem Release-Workflow abgleichen.

## Projektspezifischer Datenschutz und Veröffentlichung

- Vor einer Veröffentlichung [`DATENSCHUTZ.md`](DATENSCHUTZ.md), [`PRIVACY.md`](PRIVACY.md), [`ASSET_LICENSE.md`](ASSET_LICENSE.md) und [`PORTFOLIO_UPDATE.md`](PORTFOLIO_UPDATE.md) prüfen.
- Die Lizenz für Code steht in [`LICENSE`](LICENSE); Grafik-, Audio- und Markenmaterial sind gemäß [`ASSET_LICENSE.md`](ASSET_LICENSE.md) ausgenommen.
- Für alle öffentlichen Dateien und Release-Artefakte gelten zusätzlich die Repository-Datenschutzregeln aus `AGENTS.md`.

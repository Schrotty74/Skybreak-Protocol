<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol Symbol" width="180" height="180">
</p>

<p align="center"><strong>Deutsch</strong> · <a href="README.md">English</a></p>

# Skybreak Protocol

**Aktuelle Version:** `v1.0.1` · [Ausführlicher Changelog](docs/releases/1.0.1.md) · [Alle Changelogs](CHANGELOG.md)

Ein eigenständiges vertikales Cyberpunk-Arcade-Spiel für moderne Desktop- und Mobilbrowser. Kämpfe dich durch vierzehn optisch eigenständige Level nach oben, durchbrich Plattformen von unten, weiche Drohnen und fallenden Gefahren aus, verbessere den Eispickel des Roboters und erreiche den Sendeturm über der Megacity.

> Skybreak Protocol verwendet keine Grafiken, Musik, Figuren oder Quelltexte von Nintendo oder Ice Climber. Es handelt sich um eine eigenständige Neuinterpretation des klassischen vertikalen Arcade-Spielprinzips.

Der Umgang mit Daten ist im [Datenschutzbericht](DATENSCHUTZ.md) und im [English Privacy Report](PRIVACY.md) dokumentiert.

## Spielen

- **English:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **Deutsch:** <https://schrotty74.github.io/Skybreak-Protocol/de/>

Die Web-App funktioniert ohne Installation. Auf iPhone oder iPad kann sie in Safari über **Teilen → Zum Home-Bildschirm** abgelegt werden. Unter Android steht die entsprechende Funktion im Browsermenü zur Verfügung.

**Offline spielen:** Das versionierte ZIP beim [GitHub-Release](https://github.com/Schrotty74/Skybreak-Protocol/releases/tag/v1.0.1) herunterladen, entpacken und den passenden Starter für macOS, Windows oder Linux öffnen. Alle vierzehn Musikstücke sind enthalten; nur die optionale Update-Prüfung benötigt Internet.

## Handbuch und ausführliche Dokumentation

- [Deutsches PDF-Handbuch](docs/manual/Skybreak-Protocol-Handbuch-DE.pdf)
- [English PDF manual](docs/manual/Skybreak-Protocol-Manual-EN.pdf)
- [Ausführliche Spiel- & Technikdetails](docs/DETAILS.de.md)
- [Detailed game & technical information](docs/DETAILS.md)
- [Release-Workflow](docs/RELEASE_WORKFLOW.md)

## Screenshots

<p align="center">
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg" alt="Skybreak Protocol kompaktes Startmenü auf dem Handy" width="220"></a>
  &nbsp;
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg" alt="Skybreak Protocol Desktop-Spielansicht im Ultra-Modus" width="390"></a>
</p>

<p align="center"><em>Eine Vorschau anklicken, um das Bild in voller Größe zu öffnen.</em></p>

## Spielprinzip

- Vierzehn optisch eigenständige Level mit jeweils 15 Etagen
- Plattformmodule von unten durchbrechen und Gegner mit dem Eispickel angreifen
- Leicht, Mittel und Schwer mit konsistenten Kampfregeln in allen Leveln
- Zerstörbare Wände, Doppelstege, Phasenblöcke, bewegte Routen, Patrouillendrohnen und fallende Gefahren
- Truhen mit sieben Belohnungstypen und an die Schwierigkeit angepasster Verteilung
- Level-Wächter, Zielgeräte und eigene Bossarena pro Sektor
- Kraft- oder Design-Upgrades für den Eispickel zwischen den Leveln
- Dauerhafte lokale Level-Freischaltungen, Highscore und Einstellungen
- Eigener samplefreier Soundtrack mit einem Track pro Level

[Vollständige Spielregeln, Soundtrack-Liste und alle vierzehn Levelbeschreibungen lesen →](docs/DETAILS.de.md)

## Steuerung

| Aktion | Tastatur | Mobilgerät |
|---|---|---|
| Bewegen | Standard `A` / `D`, frei belegbar | Linke und rechte Bildschirmtaste |
| Springen | Standard `Leertaste`, frei belegbar | `JUMP` |
| Eispickel | Standard `X`, frei belegbar | `PICK` |
| Pause | `P` oder `Esc` | `PAUSE` |
| Vollbild | Schaltfläche `FULLSCREEN` | natives Vollbild oder immersiver Safari-Fallback |

Die Tastenbelegung kann am Desktop unter dem Spiel geändert werden. **Spielstand zurücksetzen** löscht Fortschritt, Freischaltungen, Highscore und Einstellungen nur auf dem aktuellen Gerät.

## Grafik

Vier Stufen stehen zur Verfügung:

- **Niedrig:** reduzierte Auflösung und Effekte für ältere oder warme Mobilgeräte
- **Mittel:** schonende Smartphone-Einstellung
- **Hoch:** hohe Auflösung und erweiterte Effekte
- **Ultra:** WebGPU-Post-Processing, GPU-Instancing sowie adaptive Effekte und Auflösung bis 4K mit WebGL2-Fallback

Für jede Stufe können 60 FPS, bis 120 FPS oder ohne Limit gewählt werden. Ultra ist anspruchsvoll und kann Mobilgeräte erwärmen.

[Vollständige Dokumentation zu Ultra, WebGPU, F16, 120 Hz, iPhone und Leistung lesen →](docs/DETAILS.de.md#ultra-webgpu-und-leistung)

## Technik

- React 19 + TypeScript + Vite 8
- Canvas 2D mit WebGPU-Ultra-Effekten und WebGL2-kompatiblem Fallback
- Web Worker für Ultra-Instanzsimulation und Leistungssteuerung
- Web Audio API und eigener MP3-Soundtrack
- Pointer Events für Maus, Touch und Stift
- Local Storage für Fortschritt und Einstellungen
- automatische GitHub-Pages-Bereitstellung über GitHub Actions

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Produktions-Build:

```bash
npm run build
```

Entwicklungskanäle, lokale Artefakte und Beta-/Final-Build-Regeln stehen auf der [ausführlichen Technikseite](docs/DETAILS.de.md#entwicklung-und-release-workflow) und im [Release-Workflow](docs/RELEASE_WORKFLOW.md).

## Datenschutz

Fortschritt, Highscore, Grafikeinstellungen, Schwierigkeitswahl, freigeschaltete Level und Tastenbelegung bleiben im lokalen Browserprofil. Das Spiel führt lediglich eine optionale öffentliche GitHub-Release-Prüfung auf neuere Beta- oder Final-Versionen durch.

- [Datenschutzbericht](DATENSCHUTZ.md)
- [Privacy Report](PRIVACY.md)

## Community

Fragen, Feedback und Diskussionen sind auf [Discord](https://discord.gg/Zy93AaYFaj) willkommen.

## Lizenz

Der Quelltext steht unter der [MIT-Lizenz](LICENSE). Der Name **Skybreak Protocol**, Logos, App-Symbole, Screenshots, Werbegrafiken und visuelle Kunstwerke sind davon ausgenommen; siehe [Asset and Brand License](ASSET_LICENSE.md).

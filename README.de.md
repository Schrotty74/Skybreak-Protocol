<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol Symbol" width="180" height="180">
</p>

<p align="center"><strong>Deutsch</strong> · <a href="README.md">English</a></p>

# Skybreak Protocol

Ein eigenständiges vertikales Cyberpunk-Arcade-Spiel für moderne Desktop- und Mobilbrowser. Kämpfe dich durch zehn optisch eigenständige Level nach oben, durchbrich Plattformen von unten, weiche Drohnen und fallenden Gefahren aus und erreiche den Sendeturm über der Megacity. Jedes Level besitzt eine eigene Cyberpunk-Farbwelt, animierte Kulisse, Effekte und separat wählbare Schwierigkeit.

> Skybreak Protocol verwendet keine Grafiken, Musik, Figuren oder Quelltexte von Nintendo oder Ice Climber. Es handelt sich um eine eigenständige Neuinterpretation des klassischen vertikalen Arcade-Spielprinzips.

Der geprüfte Umgang mit Daten ist im [Datenschutzbericht](DATENSCHUTZ.md) und im [English Privacy Report](PRIVACY.md) dokumentiert.

## Spielen

- **GitHub Pages:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **Deutsch:** <https://schrotty74.github.io/Skybreak-Protocol/de/>

Die Web-App funktioniert ohne Installation. Auf iPhone oder iPad kann sie in Safari über **Teilen → Zum Home-Bildschirm** als App-Symbol abgelegt werden. Unter Android steht die entsprechende Funktion im Browsermenü zur Verfügung.

## Handy-Screenshots

<p align="center">
  <a href="docs/screenshots/mobile-start.jpeg?raw=1"><img src="docs/screenshots/mobile-start.jpeg" alt="Skybreak Protocol Startbildschirm auf dem Handy" width="260"></a>
  &nbsp;&nbsp;
  <a href="docs/screenshots/mobile-gameplay.jpeg?raw=1"><img src="docs/screenshots/mobile-gameplay.jpeg" alt="Skybreak Protocol Spielansicht auf dem Handy" width="260"></a>
</p>

<p align="center"><em>Eine Vorschau anklicken, um das Bild in voller Größe zu öffnen. Desktop-Screenshots folgen später.</em></p>

## Spielprinzip

- Durch zehn zunehmend schwierigere Cyberpunk-Level aufsteigen
- Plattformmodule von unten durchbrechen
- Gegner mit dem Impulshammer oder durch Sprünge ausschalten
- Lücken, fallenden Energiesplittern und Patrouillendrohnen ausweichen
- Punkte sammeln, Leben erhalten und den lokalen Highscore verbessern

## Steuerung

| Aktion | Tastatur | Mobilgerät |
|---|---|---|
| Bewegen | `A` / `D` oder `←` / `→` | Linke und rechte Bildschirmtaste |
| Springen | `W`, `↑` oder `Leertaste` | `JUMP` |
| Impulshammer | `X` oder `K` | `PULSE` |
| Pause | `P` oder `Esc` | `PAUSE` |
| Vollbild | Schaltfläche `FULLSCREEN` | natives Vollbild oder immersiver Safari-Fallback |

## Grafikqualität

Die gewählte Stufe wird lokal auf dem Gerät gespeichert.

| Stufe | Ziel | Effekte |
|---|---|---|
| Niedrig | ältere oder warme Mobilgeräte | 30 FPS, reduzierte Auflösung, WebGL-Effekte aus, wenig Regen und Nebel |
| Mittel | empfohlene Smartphone-Einstellung | 40 FPS, WebGL-Nebel, reduzierte Partikel und Parallaxe |
| Hoch | leistungsfähige Geräte | bis 60 FPS, hohe Auflösung und erweiterte Effekte |
| Ultra | aktuelle Desktop-GPUs und 4K | WebGPU-Effekte, volle Renderauflösung, maximale Partikel, Beleuchtung und Parallaxe; WebGL2-Fallback |

## Grafische Effekte

- WebGPU-Ultra-Shader für mehrschichtigen Neonnebel, dichteren Regen, Energiegitter, Lichtstrahlen und atmosphärischen Bloom
- automatische Nutzung von Metal unter macOS und der nativen Browser-GPU-Anbindung auf aktuellen NVIDIA-/AMD-Systemen
- adaptive Ultra-Effektauflösung bis 4K mit WebGL2-Fallback
- mehrstufige Parallax-Megacity mit beleuchteten Fenstern
- volumetrische Suchscheinwerfer und dynamische Lichtkegel
- holografische Werbeflächen und fliegender Stadtverkehr
- animierter Neonregen, Scanlines und subtile chromatische Effekte
- dreidimensional wirkende Plattformmodule mit Metall-, Glas- und Energietexturen
- dynamische Schatten, Bloom, Bewegungs- und Impulshammer-Spuren
- Partikel, Trümmer, Einschlagseffekte und Bildschirmerschütterung
- adaptive Renderauflösung bis 4K

## Technik

- React 19 und TypeScript
- Vite 8
- Canvas 2D mit WebGPU-Ultra-Effektebene und WebGL2-kompatiblem Fallback
- Web Audio API für synthetisierte Arcade-Sounds
- Pointer Events für Maus, Touch und Stift
- Local Storage für Highscore und Grafikstufe
- automatische GitHub-Pages-Bereitstellung über GitHub Actions
- CSS-basierter immersiver Vollbild-Fallback für Safari auf dem iPhone

## Zehn Level-Umgebungen

| Level | Umgebung | Farbwelt und Effekt |
|---:|---|---|
| 1 | Neon Undercity | cyan- und magentafarbene Unterstadt mit bewegten Neon-Scanbalken |
| 2 | Chrome Bazaar | Pink-, Mint- und Chromtöne mit animierten Hologrammrahmen |
| 3 | Toxic Transit | giftgrüne Infrastruktur mit aufsteigenden Energieblasen |
| 4 | Crimson Firewall | rot-orange Sicherheitszone mit pulsierenden Firewall-Säulen |
| 5 | Azure Data Sea | tiefblauer Datenbezirk mit fließenden digitalen Wellen |
| 6 | Violet Reactor | violetter Energiekern mit expandierenden Reaktorringen |
| 7 | Solar Megagrid | bernsteinrotes Energienetz mit strahlendem Sonnenleuchten |
| 8 | Ghost Network | blass-cyanfarbene Netzruinen mit geisterhaften Lichtspuren |
| 9 | Quantum Rift | violett-blaue Dimensionszone mit bewegtem Quantenpfad |
| 10 | Skybreak Apex | leuchtend-cyanfarbener Gipfel mit rotierenden Sendestrahlen |

Gegnerdichte und Umgebungsgefahren steigen von Level zu Level. Für jedes Level kann unabhängig **Leicht**, **Mittel** oder **Schwer** gewählt werden; die Einstellung beeinflusst Gegnergeschwindigkeit, Häufigkeit und Geschwindigkeit der Gefahren sowie den Punktemultiplikator. Die Auswahl bleibt ausschließlich lokal im Browser des Geräts gespeichert.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Produktions-Build:

```bash
npm run build
```

## Hinweise zur Geräteleistung

Ultra kann Smartphones stark belasten und zu höherer Temperatur sowie schnellerem Akkuverbrauch führen. Für iPhones und Android-Geräte ist **Mittel** die empfohlene Einstellung. Bei deutlicher Erwärmung sollte **Niedrig** verwendet werden.

## Lizenz

Der Quelltext steht unter der im Repository enthaltenen MIT-Lizenz.

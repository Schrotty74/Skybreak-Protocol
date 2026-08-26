# Skybreak Protocol — Spiel- & Technikdetails

**Deutsch** · [English](DETAILS.md) · [← Zurück zur README](../README.de.md)

Diese Seite enthält die ausführlichen Informationen zu Spielmechanik, Soundtrack, Grafik, Leistung und Technik, die bewusst aus der Haupt-README ausgelagert wurden.

## Ausführliche Spielregeln

Skybreak Protocol enthält vierzehn optisch eigenständige Level. Jedes Level ist ein vollständiger Aufstieg über 15 Etagen mit eigener Route, animierter Umgebung, 2.5D-Plattformmaterial, Gegner- und Wächterdesign, Eispickel-Grundmodell und Soundtrack.

Patrouillen, Wächter, Truhen und fallende Gefahren folgen in jedem Level denselben Schwierigkeitsregeln: Leicht nutzt vier Patrouillen und einen Wächter, Mittel fünf Patrouillen und zwei Wächter, Schwer sechs Patrouillen und zwei Wächter. Nur ausgewählte Patrouillen schießen; auf Mittel und Schwer werden die Schüsse gestaffelt.

Zerstörbare senkrechte Wände und Doppelstege benötigen zwei Sprünge nach oben. Phasenblöcke tragen den Roboter nur in ihrer aktiven Phase und sind mit `PHASE 01` bis `PHASE 14` markiert; Leicht/Mittel/Schwer verteilen vier/acht/zwölf Blöcke über getrennte Etagen. Zusätzlich bewegen sich vier/sechs/acht Routen seitlich durch den Aufstieg.

Die Truhen passen sich der Schwierigkeit an und bieten sieben Belohnungen: Schild, Leben, Datenbonus, Overdrive, Jackpot, Reparatur plus Schild oder Phasenpanzerung. Leicht besitzt fünf feste Truhen; Mittel vier feste plus zwei wandernde Bonustruhen ab 40 % Höhe; Schwer zwei feste plus eine wandernde Bonustruhe ab 60 %. Wandernde Truhen geben verstärkte Boni.

Ein Schild hält auf Leicht 8 Sekunden und drei Treffer aus, auf Mittel 6 Sekunden und zwei Treffer, auf Schwer 4 Sekunden und einen Treffer.

Erreichte Level werden im lokalen Browserprofil dauerhaft freigeschaltet und können später direkt als Startlevel gewählt werden.

## Roboter und Eispickel-Upgrades

Die Spielfigur ist ein kompakter Cyberpunk-Kletterroboter mit getrennten mechanischen Gliedmaßen, leuchtenden Sensoren, Antenne, animierten Gelenken und dauerhaft sichtbarem Eispickel. Im Leerlauf begutachtet und dreht der Roboter sein Werkzeug.

Der Eispickel greift Drohnen an und zerstört beschädigte Plattformmodule vor dem Roboter. Beim ersten Eintritt in Level 2 bis 14 pausiert das Spiel kurz und bietet ein Upgrade:

- **Kraft:** erhöht Reichweite und die Anzahl zerstörbarer Plattformmodule pro Schlag.
- **Design:** verändert Designname, Kernfarbe, Kopfgeometrie und Leuchtstärke des Eispickels.

Die Upgrades gelten für den aktuellen Durchlauf und werden als `P`- und `S`-Werte angezeigt.

## Eigener Retro-Arcade-Soundtrack

Der Startbildschirm und jedes Level besitzen einen eigenen, samplefreien Retro-Arcade-Track. Die Musik startet nach der ersten Berührung oder Taste, wechselt automatisch mit kurzer Überblendung, läuft im Level als Schleife und lässt sich unabhängig von den Soundeffekten schalten.

| Level | Track | BPM | Anhören / Download |
|---|---|---:|---|
| 1 + Start | Neon Climber | 112 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-01-neon-undercity.mp3) |
| 2 | Bazaar Bounce | 124 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-02-chrome-bazaar.mp3) |
| 3 | Toxic Express | 136 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-03-toxic-transit.mp3) |
| 4 | Firewall Assault | 148 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-04-crimson-firewall.mp3) |
| 5 | Data Current | 98 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-05-azure-data-sea.mp3) |
| 6 | Reactor Vector | 128 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-06-violet-reactor.mp3) |
| 7 | Solar Sprint | 144 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-07-solar-megagrid.mp3) |
| 8 | Ghost Signal | 106 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-08-ghost-network.mp3) |
| 9 | Rift Runner | 132 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-09-quantum-rift.mp3) |
| 10 | Apex Ascension | 156 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-10-skybreak-apex.mp3) |
| 11 | Inferno-Schmiede | 116 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-11-inferno-foundry.mp3) |
| 12 | Abyssales Datenmeer | 92 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-12-abyssal-data-ocean.mp3) |
| 13 | Stratosphären-Relais | 126 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-13-stratosphere-relay.mp3) |
| 14 | Terra-Kernzitadelle | 100 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-14-terra-core-citadel.mp3) |

## Grafikqualität

| Stufe | Ziel | Effekte |
|---|---|---|
| Niedrig | ältere oder warme Mobilgeräte | reduzierte Auflösung, WebGL-Effekte aus, wenig Regen und Nebel |
| Mittel | schonende Smartphone-Einstellung | WebGL-Nebel, reduzierte Partikel und Parallaxe |
| Hoch | leistungsfähige Geräte | hohe Auflösung und erweiterte Effekte |
| Ultra | aktuelle Desktop- und Mobil-GPUs | vollständiges WebGPU-Post-Processing, F16-Shader, GPU-Instancing sowie adaptive Auflösung und Effekte; WebGL2-Fallback |

Für jede Stufe steht ein Bildraten-Limit mit 60 FPS, bis 120 FPS oder ohne Limit bereit. Der nur am Desktop verfügbare Showcase läuft nach zwei Sekunden Aufwärmzeit 30 Sekunden lang mit autonom kletterndem Roboter, Blockzerstörung und absichtlich hoher Effektlast. Er zeigt Stufe, Auflösung, Limit, FPS, Framezeit, CPU-Zeit und – sofern der Browser sie bereitstellt – GPU-Zeit ausschließlich lokal an.

## Lokaler Profil-Freischaltcode

Um alle Level, Roboter-Modelle und den Hologramm-Avatar im lokalen Browserprofil freizuschalten, **SFX AUS/AN** innerhalb von fünf Sekunden zweimal schalten und danach innerhalb von fünf Sekunden **MUSIK AUS** wählen. Die Bestätigung erscheint direkt über dem Startbildschirm. Die Freischaltung bleibt vollständig lokal.

## Ultra, WebGPU und Leistung

Ultra ergänzt eine vollständige WebGPU-Pipeline und fordert die Hochleistungs-GPU des Browsers an. Unter macOS wird WebGPU auf Metal abgebildet; auf aktuellen NVIDIA- und AMD-Systemen kommt die native GPU-Anbindung des Browsers zum Einsatz. Gegenüber Hoch bietet Ultra dichteren mehrschichtigen Nebel und Regen, Energiegitter, animierte Lichtstrahlen, stärkeren Bloom, bildschirmbasierte Neonreflexionen, chromatische Bearbeitung, Tone-Mapping und Auflösungen bis 4K.

Plattformen, Gegner, Trümmer, Spielpartikel und Regen erhalten GPU-instanzierte Verstärkungsebenen. Vorbereitete Sprites, zwischengespeicherte Hintergrundebenen und Sichtbarkeits-Culling reduzieren wiederholte Canvas-Arbeit. Ein eigener Web Worker berechnet atmosphärische Instanzen und wertet Bildzeiten außerhalb des Hauptthreads aus.

Wenn verfügbar, nutzt Ultra 16-Bit-Shader-Berechnungen für das Tone-Mapping; andernfalls bleibt der kompatible 32-Bit-Pfad aktiv. Bei fehlender oder nur softwarebasierter WebGPU-Unterstützung verwendet das Spiel automatisch den vorhandenen WebGL2- und Canvas-Renderer.

Eine lokale Leistungssteuerung reagiert auf anhaltend schlechtere Bildzeiten, indem Bloom-Abtastungen, Reflexionen, Post-Processing und Renderauflösung reduziert werden. Messwerte verlassen das Gerät nicht.

### 120-Hz-Browser unter macOS

Der Bildschirm muss selbst auf 120 Hz oder höher eingestellt sein. Safari kann Webseiten trotzdem auf etwa 60 FPS bevorzugen. Dafür **Safari → Einstellungen → Erweitert → Feature Flags** öffnen, nach **„Prefer Page Rendering Updates near 60fps“** suchen, den Eintrag deaktivieren, Safari anschließend mit `⌘Q` vollständig beenden und neu öffnen. Das Safari-Fenster muss auf dem schnellen Bildschirm liegen.

Chrome und Firefox verwenden normalerweise die Bildwiederholrate des Bildschirms, können aber weiterhin durch Bildschirm, Stromsparmodus, Hintergrund-Tabs oder Browserlast begrenzt werden.

### iPhone Pro und Hardware-Raytracing

Aktuelle Pro-iPhones stellen Safari leistungsfähige GPUs über WebGPU-zu-Metal bereit. Skybreak Protocol verwendet diese für vollständiges Post-Processing, GPU-Instancing, Worker-gestützte Berechnungen und adaptive Auflösung auf unterstützten Geräten.

Hardware-Raytracing-Kerne können von dieser Web-App derzeit nicht direkt angesprochen werden, da Raytracing nicht zum Browser-WebGPU-Funktionsumfang gehört. Ultra verwendet deshalb bildschirmbasierte Neonreflexionen statt Hardware-Raytracing. Auf einem Pro-iPhone mit hoher Bildrate kann Mobile Ultra bis zu 120 FPS anstreben; bei anhaltendem Leistungseinbruch wird auf 90/60 FPS und reduziertes Post-Processing zurückgeschaltet.

Quellen: [Apple iPhone 15 Pro](https://www.apple.com/de/newsroom/2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/) · [Apple iPhone 17 Pro technische Daten](https://www.apple.com/iphone-17-pro/specs/) · [Aktuelle WebGPU-Funktionsliste](https://gpuweb.github.io/types/types/GPUFeatureName.html)

## Grafische Effekte

- WebGPU-Ultra-Shader für mehrschichtigen Neonnebel, dichteren Regen, Energiegitter, Lichtstrahlen und atmosphärischen Bloom
- vollständiger Bloom, bildschirmbasierte Neonreflexionen, chromatische Bearbeitung, Tone-Mapping und Vignette
- GPU-instanzierte Verstärkungsebenen für Plattformen, Gegner, Trümmer, Spielpartikel und Regen
- Web Worker für atmosphärische Instanzberechnung und adaptive Steuerung mit 60/90/120 FPS
- Metal unter macOS und native Browser-GPU-Anbindung auf aktuellen NVIDIA-/AMD-Systemen
- adaptive Ultra-Effektauflösung bis 4K mit WebGL2-Fallback
- bedingtes F16-WebGPU-Tone-Mapping mit automatischem F32-Fallback
- optionales Mobile Ultra bis 120 FPS mit leistungsbasiertem Wärmeschutz
- mehrstufige Parallax-Megacity, beleuchtete Fenster, volumetrische Suchscheinwerfer und dynamische Lichtkegel
- holografische Werbeflächen, fliegender Stadtverkehr, Neonregen, Scanlines und chromatische Effekte
- dreidimensional wirkende Plattformmodule mit Metall-, Glas- und Energietexturen
- dynamische Schatten, Bloom, Bewegungsspuren, Partikel, Trümmer, Einschlagseffekte und Bildschirmerschütterung

## Technik

- React 19 und TypeScript
- Vite 8
- Canvas 2D mit WebGPU-Ultra-Effektebene und WebGL2-kompatiblem Fallback
- Modul-Web-Worker für Ultra-Instanzsimulation und Leistungssteuerung
- Web Audio API für synthetisierte Arcade-Sounds
- Soundtrack-Wiedergabe aus eigenen MP3-Dateien mit automatischer Level-Überblendung
- öffentliche GitHub-Release-Prüfung für neue Beta- und Final-Versionen
- Pointer Events für Maus, Touch und Stift
- Local Storage für Highscore, Grafikstufe, Schwierigkeiten, Level-Freischaltung und Desktop-Tastenbelegung
- automatische GitHub-Pages-Bereitstellung über GitHub Actions
- CSS-basierter immersiver Vollbild-Fallback für Safari auf dem iPhone

## Vierzehn Level-Umgebungen

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
| 11 | Inferno-Schmiede | Lavahöhle mit instabilem Hitzeflimmern und Schmiedeausbrüchen |
| 12 | Abyssales Datenmeer | tiefer Ozean mit Mantarochen und sichtbar nassem Plattformglanz |
| 13 | Stratosphären-Relais | Höhensturm mit Turbinen und sichtbaren Windböen |
| 14 | Terra-Kernzitadelle | Mineralkernhöhle mit schwebenden Felsen und Erdbeben |

Für jedes Level kann unabhängig **Leicht**, **Mittel** oder **Schwer** gewählt werden. Die Kampfwerte bleiben in allen vierzehn Leveln konsistent; Routenverlauf, Kulisse, Musik, Farben, Blockoptik, Zielgeräte und Bossarena unterscheiden sich pro Level. Die Auswahl wird ausschließlich lokal im Browserprofil gespeichert.

## Entwicklung und Release-Workflow

```bash
npm install
npm run dev
```

`npm run dev` ist als **LOCAL TEST** gekennzeichnet, verwendet getrennte Spielstände und fragt keine GitHub-Releases ab. Für die anderen Kanäle stehen `npm run dev:beta` und `npm run dev:final` zur Verfügung; beide lehnen Versionen für den falschen Release-Kanal ab.

Unter macOS startet ein Doppelklick auf `Skybreak-Protocol-Lokaltest.command` den lokalen Testkanal und öffnet ihn im Browser. Mit `Ctrl+C` im Terminal wird er beendet.

Produktions-Build:

```bash
npm run build
```

Für lokale Artefakte ohne Veröffentlichungsabsicht verwende `npm run build:local`. Getrennte Beta- und Final-Testartefakte verwenden `npm run build:beta` und `npm run build:final`. Die vollständigen Regeln stehen im [Release-Workflow](RELEASE_WORKFLOW.md).

Jede Beta- und Final-Version benötigt eine eigene ausführliche Datei unter `docs/releases/`.

## Hinweis zur Geräteleistung

Auf einem iPhone 17 Pro erreichte **Ultra + 1080p** 60 FPS bei vollständigen Ultra-Effekten. **4K Ultra** ist auf Mobilgeräten ein sehr aufwendiger Qualitäts- und Screenshot-Modus und nicht der 60-FPS-Modus. Bei deutlicher Erwärmung sollte Mittel oder Niedrig verwendet werden.

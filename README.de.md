<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol Symbol" width="180" height="180">
</p>

<p align="center"><strong>Deutsch</strong> · <a href="README.md">English</a></p>

# Skybreak Protocol

**Aktuelle Version:** `v1.0.1-beta.7` · [Ausführlicher Changelog](docs/releases/1.0.1-beta.7.md) · [Alle Changelogs](CHANGELOG.md)

Ein eigenständiges vertikales Cyberpunk-Arcade-Spiel für moderne Desktop- und Mobilbrowser. Kämpfe dich durch vierzehn optisch eigenständige Level nach oben, durchbrich Plattformen von unten, weiche Drohnen und fallenden Gefahren aus und erreiche den Sendeturm über der Megacity. Jedes Level besitzt eigene 2.5D-Plattformen, Kulisse, Effekte, Wächter und Musik.

> Skybreak Protocol verwendet keine Grafiken, Musik, Figuren oder Quelltexte von Nintendo oder Ice Climber. Es handelt sich um eine eigenständige Neuinterpretation des klassischen vertikalen Arcade-Spielprinzips.

Der geprüfte Umgang mit Daten ist im [Datenschutzbericht](DATENSCHUTZ.md) und im [English Privacy Report](PRIVACY.md) dokumentiert.

## Spielen

- **GitHub Pages:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **Deutsch:** <https://schrotty74.github.io/Skybreak-Protocol/de/>

Die Web-App funktioniert ohne Installation. Auf iPhone oder iPad kann sie in Safari über **Teilen → Zum Home-Bildschirm** als App-Symbol abgelegt werden. Unter Android steht die entsprechende Funktion im Browsermenü zur Verfügung.

Die aktuelle Version wird im Spiel angezeigt. Beim Start prüft Skybreak Protocol einmal die öffentlichen GitHub-Releases und zeigt einen Hinweis an, wenn eine neuere Beta- oder Final-Version verfügbar ist.

**Offline spielen:** Das versionierte ZIP steht beim [GitHub-Release](https://github.com/Schrotty74/Skybreak-Protocol/releases/tag/v1.0.1-beta.7) unter **Assets** bereit. Nach dem Entpacken den passenden Starter für macOS, Windows oder Linux öffnen. Alle vierzehn Musikstücke sind enthalten; nur die optionale Update-Prüfung benötigt Internet.

## Handbuch

- [Deutsches PDF-Handbuch](docs/manual/Skybreak-Protocol-Handbuch-DE.pdf) - Spielprinzip, Steuerung, alle Buttons, vierzehn Level, Power-ups und Cheat-Codes
- [English PDF manual](docs/manual/Skybreak-Protocol-Manual-EN.pdf)

## Handy-Screenshots

<p align="center">
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-compact.jpeg" alt="Skybreak Protocol kompaktes Startmenü auf dem Handy" width="260"></a>
  &nbsp;&nbsp;
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-options.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/mobile-start-options.jpeg" alt="Skybreak Protocol Startmenü mit erweiterten Optionen auf dem Handy" width="260"></a>
</p>

<p align="center"><em>Eine Vorschau anklicken, um das Bild in voller Größe zu öffnen.</em></p>

## Desktop-Screenshots

<p align="center">
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-gameplay-ultra.jpeg" alt="Skybreak Protocol Desktop-Spielansicht im Ultra-Modus" width="430"></a>
  &nbsp;&nbsp;
  <a href="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-start-ultra.jpeg"><img src="https://raw.githubusercontent.com/Schrotty74/Skybreak-Protocol/main/docs/screenshots/desktop-start-ultra.jpeg" alt="Skybreak Protocol Desktop-Startbildschirm im Ultra-Modus" width="430"></a>
</p>

<p align="center"><em>Eine Vorschau anklicken, um das Bild in voller Größe zu öffnen.</em></p>

## Spielprinzip

- Durch vierzehn optisch eigenständige Cyberpunk- und Element-Level aufsteigen
- Jedes Level ist ein vollständiger Aufstieg über 15 Etagen mit eigener animierter Umgebung, 2.5D-Plattformmaterial, Gegner- und Wächterdesign, Eispickel-Grundmodell und Soundtrack
- Plattformmodule von unten durchbrechen
- Gegner und nahe Plattformmodule mit dem Eispickel des Roboters angreifen
- Gegner, Wächter, Truhen und herabfallende Gefahren folgen in jedem Level denselben Schwierigkeitsregeln: Leicht vier Patrouillen und ein Wächter, Mittel fünf Patrouillen und zwei Wächter, Schwer sechs Patrouillen und zwei Wächter. Nur ausgewählte Patrouillen schießen; Mittel und Schwer staffeln diese Schüsse.
- Zerstörbare senkrechte Wände und Doppelstege durchbrechen, die zwei Sprünge nach oben erfordern. Phasenblöcke tragen nur in ihrer aktiven Phase und sind klar mit `PHASE 01` bis `PHASE 14` markiert; Leicht/Mittel/Schwer verteilen vier/acht/zwölf Blöcke über verschiedene Etagen. Zusätzlich bewegen sich vier/sechs/acht Stege seitlich über den Aufstieg.
- Truhen passend zur Schwierigkeit: aus sieben Belohnungen wählen – Schild, Leben, Datenbonus, Overdrive, Jackpot, Reparatur plus Schild oder Phasenpanzerung. Leicht bietet fünf feste Truhen; Mittel vier feste plus zwei wandernde Bonustruhen ab 40 % Höhe; Schwer zwei feste plus eine wandernde Bonustruhe ab 60 %. Wandernde Truhen geben verstärkte Boni.
- Ein Schild hält auf Leicht 8 Sekunden und drei Treffer aus, auf Mittel 6 Sekunden und zwei Treffer, auf Schwer 4 Sekunden und einen Treffer.
- Wächterdrohne ausschalten, den nächsten Sektor als Vorschau sehen und danach die konkrete Kraft- oder Designstufe des Eispickels auswählen
- Sichtbare Roboterschäden, Sensorflackern und Funken bei verlorenen Leben erleben
- Erreichte Level dauerhaft lokal freischalten und nach einem Lauf direkt als neues Startlevel auswählen
- Lücken, fallenden Energiesplittern und Patrouillendrohnen ausweichen
- Punkte sammeln, Leben erhalten und den lokalen Highscore verbessern

## Steuerung

| Aktion | Tastatur | Mobilgerät |
|---|---|---|
| Bewegen | Standard `A` / `D`, frei belegbar | Linke und rechte Bildschirmtaste |
| Springen | Standard `Leertaste`, frei belegbar | `JUMP` |
| Eispickel | Standard `X`, frei belegbar | `PICK` |
| Pause | `P` oder `Esc` | `PAUSE` |
| Vollbild | Schaltfläche `FULLSCREEN` | natives Vollbild oder immersiver Safari-Fallback |

Am Desktop befindet sich unter dem Spiel die **Tastenbelegung**. Eine Aktion anklicken und anschließend die gewünschte Taste drücken. Bereits verwendete Tasten werden automatisch getauscht; **Tasten Standard** stellt `A`, `D`, `Leertaste` und `X` wieder her. **Spielstand zurücksetzen** im Startmenü löscht Fortschritt, Freischaltungen, Rekord und Einstellungen nur lokal.

## Roboter und Eispickel-Upgrades

Die Spielfigur ist ein kompakter Cyberpunk-Kletterroboter mit getrennten mechanischen Gliedmaßen, leuchtenden Sensoren, Antenne, animierten Gelenken und einem ständig sichtbaren Eispickel. Bleibt der Roboter stehen, begutachtet und dreht er spielerisch sein Werkzeug, statt unbewegt zu bleiben.

Der Eispickel greift Drohnen an und zerstört beschädigte Plattformmodule vor dem Roboter. Beim ersten Eintritt in Level 2 bis 14 pausiert das Spiel kurz und bietet jeweils ein Upgrade an:

- **Kraft:** zeigt vor der Wahl Reichweite und zerstörbare Plattformmodule pro Schlag und erhöht beides schrittweise
- **Design:** zeigt vor der Wahl den Namen des nächsten Designs und verändert Kernfarbe, Kopfgeometrie und Leuchtstärke des Eispickels

Die Upgrades gelten für den aktuellen Durchlauf und werden als `P`- und `S`-Werte in der Levelanzeige dargestellt.

## Eigener Techno-Soundtrack

Der Startbildschirm und jedes Level besitzen einen eigenen Cyberpunk-Techno-Track. Die Musik startet nach der ersten Berührung oder Taste, wechselt automatisch mit einer kurzen Überblendung, läuft im Level als Schleife und lässt sich unabhängig von den Soundeffekten ein- und ausschalten.

| Level | Track | BPM | Anhören / Download |
|---|---|---:|---|
| 1 + Start | Neon Undercity | 126 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-01-neon-undercity.mp3) |
| 2 | Chrome Bazaar | 128 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-02-chrome-bazaar.mp3) |
| 3 | Toxic Transit | 130 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-03-toxic-transit.mp3) |
| 4 | Crimson Firewall | 132 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-04-crimson-firewall.mp3) |
| 5 | Azure Data Sea | 124 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-05-azure-data-sea.mp3) |
| 6 | Violet Reactor | 134 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-06-violet-reactor.mp3) |
| 7 | Solar Megagrid | 136 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-07-solar-megagrid.mp3) |
| 8 | Ghost Network | 128 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-08-ghost-network.mp3) |
| 9 | Quantum Rift | 138 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-09-quantum-rift.mp3) |
| 10 | Skybreak Apex | 142 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-10-skybreak-apex.mp3) |
| 11 | Inferno-Schmiede | 116 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-11-inferno-foundry.mp3) |
| 12 | Abyssales Datenmeer | 92 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-12-abyssal-data-ocean.mp3) |
| 13 | Stratosphären-Relais | 126 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-13-stratosphere-relay.mp3) |
| 14 | Terra-Kernzitadelle | 100 | [MP3](https://schrotty74.github.io/Skybreak-Protocol/audio/level-14-terra-core-citadel.mp3) |

## Grafikqualität

Die gewählte Stufe wird lokal auf dem Gerät gespeichert.

| Stufe | Ziel | Effekte |
|---|---|---|
| Niedrig | ältere oder warme Mobilgeräte | reduzierte Auflösung, WebGL-Effekte aus, wenig Regen und Nebel |
| Mittel | schonende Smartphone-Einstellung | WebGL-Nebel, reduzierte Partikel und Parallaxe |
| Hoch | leistungsfähige Geräte | hohe Auflösung und erweiterte Effekte |
| Ultra | aktuelle Desktop- und Mobil-GPUs | vollständiges WebGPU-Post-Processing, F16-Shader, GPU-Instancing sowie adaptive Auflösung und Effekte; WebGL2-Fallback |

Für jede Stufe steht dasselbe **Bildraten-Limit** bereit: 60 FPS, bis 120 FPS oder ohne Limit. Der nur am Desktop verfügbare **Showcase** läuft nach zwei Sekunden Aufwärmzeit 30 Sekunden lang mit autonom kletterndem Roboter, Blockzerstörung und absichtlich hoher Effektlast. Er zeigt Stufe, Auflösung, Limit, FPS, Framezeit, CPU-Zeit und – sofern der Browser sie bereitstellt – GPU-Zeit ausschließlich lokal an.

## Lokaler Profil-Freischaltcode

Um alle Level, Roboter-Modelle und den Hologramm-Avatar im lokalen Browserprofil freizuschalten, **SFX AUS/AN** innerhalb von fünf Sekunden zweimal schalten und danach innerhalb von fünf Sekunden **MUSIK AUS** wählen. Die Bestätigung erscheint direkt über dem Startbildschirm. Der Code schaltet nur lokal frei und überträgt keine Daten.

> [!WARNING]
> **Auf einem iPhone 17 Pro erreichte „Ultra + 1080p“ 60 FPS. 4K Ultra ist ein extrem aufwendiger Qualitäts- und Screenshot-Modus und nicht für 60 FPS auf Mobilgeräten vorgesehen. Ultra kann das Gerät dennoch erwärmen; bei hohen Umgebungstemperaturen, direkter Sonne oder starker Erwärmung auf „Mittel“ oder „Niedrig“ wechseln.**

### Was Ultra verändert

Ultra ergänzt eine vollständige WebGPU-Pipeline und fordert die **Hochleistungs-GPU** des Browsers an. Unter macOS wird WebGPU vom Browser auf Metal abgebildet; auf aktuellen NVIDIA- und AMD-Systemen kommt die native GPU-Anbindung des Browsers zum Einsatz. Gegenüber Hoch bietet Ultra dichteren mehrschichtigen Nebel und Regen, Energiegitter, animierte Lichtstrahlen, stärkeren Bloom, bildschirmbasierte Neonreflexionen, chromatische Bearbeitung, Tone-Mapping und eine höhere Auflösung bis 4K.

Plattformen, Gegner, Trümmer, Spielpartikel und Regen erhalten GPU-instanzierte Verstärkungsebenen. Vorbereitete Sprites, zwischengespeicherte Hintergrundebenen und Sichtbarkeits-Culling vermeiden wiederholte Canvas-Arbeit. Ein eigener Web Worker berechnet atmosphärische Instanzen und wertet die Bildzeiten außerhalb des Hauptthreads aus. Das 60-FPS-, Bis-120-FPS- oder unbegrenzte Bildraten-Limit kann für jede Grafikstufe gewählt werden.

Wenn verfügbar, verwendet Ultra effiziente 16-Bit-Shader-Berechnungen für das Tone-Mapping und andernfalls den kompatiblen 32-Bit-Pfad. Ein Mac Studio M4 Max erreichte in Safari bei 4K Ultra auf einem 120-Hz-Display **120 FPS**, nachdem die Safari-Seitenrender-Voreinstellung angepasst wurde. Browser stellen keinen Temperatursensor bereit. Deshalb erkennt eine lokale Leistungssteuerung anhaltend schlechtere Bildzeiten als Hinweis auf Wärme- oder Leistungsdrosselung und reduziert stufenweise Bloom-Abtastungen, Reflexionen, Post-Processing und Renderauflösung. Messwerte verlassen das Gerät nicht.

### 120-Hz-Browser unter macOS

Der Bildschirm muss selbst auf 120 Hz oder höher eingestellt sein. Safari kann Webseiten trotzdem auf etwa 60 FPS bevorzugen: **Safari → Einstellungen → Erweitert → Feature Flags** öffnen, nach **„Prefer Page Rendering Updates near 60fps“** suchen, den Eintrag deaktivieren, Safari anschließend mit `⌘Q` vollständig beenden und neu öffnen. Das Safari-Fenster muss auf dem schnellen Bildschirm liegen. Chrome und Firefox verwenden normalerweise die Bildwiederholrate des Bildschirms und besitzen keine entsprechende Spieleinstellung; begrenzt werden können sie dennoch durch Bildschirm, Stromsparmodus, Hintergrund-Tabs oder Browserlast.

Bei fehlender WebGPU-Unterstützung oder einem Softwareadapter werden automatisch der vorhandene WebGL2- und Canvas-Renderer verwendet.

### iPhone Pro und Hardware-Raytracing

Mit dem iPhone 15 Pro führte Apple eine 6-Core-GPU mit hardwarebeschleunigtem Raytracing ein. Das iPhone 17 Pro verwendet den A19 Pro mit 6-Core-GPU, hardwarebeschleunigtem Raytracing und verbesserter dauerhafter Spieleleistung. Skybreak Protocol profitiert bereits über Safaris WebGPU-zu-Metal-Anbindung davon: Ultra verwendet auf unterstützten iPhones vollständiges Post-Processing, GPU-Instancing, Worker-gestützte Berechnungen und adaptive Auflösung. [Apple: iPhone 15 Pro](https://www.apple.com/de/newsroom/2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/) · [Apple: technische Daten des iPhone 17 Pro](https://www.apple.com/iphone-17-pro/specs/)

Die Hardware-Raytracing-Kerne können von dieser Web-App derzeit nicht direkt angesprochen werden, weil Raytracing nicht zum Funktionsumfang der Browser-WebGPU-Schnittstelle gehört. Ultra verwendet deshalb bildschirmbasierte Neonreflexionen statt Hardware-Raytracing. Auf einem Pro-iPhone mit hoher Bildrate kann Mobile Ultra optional bis zu 120 FPS anstreben; bei anhaltendem Leistungseinbruch wird auf 90/60 FPS und reduziertes Post-Processing zurückgeschaltet. [Aktuelle WebGPU-Funktionsliste](https://gpuweb.github.io/types/types/GPUFeatureName.html)

## Grafische Effekte

- WebGPU-Ultra-Shader für mehrschichtigen Neonnebel, dichteren Regen, Energiegitter, Lichtstrahlen und atmosphärischen Bloom
- vollständiger Bloom, bildschirmbasierte Neonreflexionen, chromatische Bearbeitung, Tone-Mapping und Vignette
- GPU-instanzierte Verstärkungsebenen für Plattformen, Gegner, Trümmer, Spielpartikel und Regen
- Web Worker für atmosphärische Instanzberechnung und adaptive Steuerung mit 60/90/120 FPS
- automatische Nutzung von Metal unter macOS und der nativen Browser-GPU-Anbindung auf aktuellen NVIDIA-/AMD-Systemen
- adaptive Ultra-Effektauflösung bis 4K mit WebGL2-Fallback
- bedingtes F16-WebGPU-Tone-Mapping mit automatischem F32-Fallback
- optionales Mobile Ultra bis 120 FPS mit leistungsbasiertem Wärmeschutz
- mehrstufige Parallax-Megacity mit beleuchteten Fenstern
- volumetrische Suchscheinwerfer und dynamische Lichtkegel
- holografische Werbeflächen und fliegender Stadtverkehr
- animierter Neonregen, Scanlines und subtile chromatische Effekte
- dreidimensional wirkende Plattformmodule mit Metall-, Glas- und Energietexturen
- dynamische Schatten, Bloom, Bewegungs- und Eispickel-Spuren
- Partikel, Trümmer, Einschlagseffekte und Bildschirmerschütterung
- adaptive Renderauflösung bis 4K
- animierter Cyberpunk-Roboter mit aufrüstbarem Eispickel und Leerlaufanimation zum Begutachten und Drehen des Werkzeugs

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

Für jedes Level kann unabhängig **Leicht**, **Mittel** oder **Schwer** gewählt werden. Jede Stufe verwendet in allen vierzehn Leveln dieselben Gegner-, Boss-, Schuss- und Gefahrenwerte; nur Kulisse, Musik, Farben und Blockoptik unterscheiden sich. Die Auswahl bleibt ausschließlich lokal im Browser des Geräts gespeichert.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

`npm run dev` ist immer als **LOCAL TEST** gekennzeichnet, verwendet getrennte Spielstände und fragt keine GitHub-Releases ab. Für die anderen Kanäle stehen `npm run dev:beta` und `npm run dev:final` zur Verfügung; beide lehnen eine Version für den falschen Release-Kanal ab.

Auf macOS startet ein Doppelklick auf `Skybreak-Protocol-Lokaltest.command` diesen lokalen Testkanal und öffnet ihn im Browser. Das Terminalfenster bleibt während des Servers geöffnet; mit `Ctrl+C` wird er beendet.

Produktions-Build:

```bash
npm run build
```

Für lokale Artefakte ohne Veröffentlichungsabsicht verwende `npm run build:local`. Beta- und Final-Testartefakte entstehen getrennt mit `npm run build:beta` bzw. `npm run build:final`; Details stehen im [Release-Workflow](docs/RELEASE_WORKFLOW.md).

Jede Beta- und Final-Version benötigt eine eigene ausführliche Datei unter `docs/releases/`. Der Ablauf ist im [Release-Workflow](docs/RELEASE_WORKFLOW.md) beschrieben.

## Hinweise zur Geräteleistung

Auf einem **iPhone 17 Pro** erreichte **Ultra + 1080p** 60 FPS bei vollständigen Ultra-Effekten. **4K Ultra** ist auf Mobilgeräten ein sehr aufwendiger Qualitäts- und Screenshot-Modus, nicht der 60-FPS-Modus. Ultra kann das Gerät dennoch erwärmen; bei deutlicher Erwärmung sollte **Mittel** oder **Niedrig** verwendet werden.

## Lizenz

Der Quelltext steht unter der [MIT-Lizenz](LICENSE). Der Name **Skybreak Protocol**, Logos, App-Symbole, Screenshots, Werbegrafiken und visuelle Kunstwerke sind davon ausgenommen; siehe [Asset and Brand License](ASSET_LICENSE.md).

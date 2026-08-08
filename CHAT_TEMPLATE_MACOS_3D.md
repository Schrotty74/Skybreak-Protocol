# Vorlage für neuen Codex-Chat - Skybreak Protocol native macOS-3D-App

Arbeite ausschließlich lokal im bestehenden Repository `Skybreak-Protocol`.

Die stabile Web-Final-Version wurde von mir ausdrücklich freigegeben. Jetzt beginnt die **separate native macOS-Version in Swift mit Metal**. Die Web-App bleibt unverändert erhalten und ist weiterhin die Referenz für Spielregeln, Level, Steuerung, Audio, Texte und Datenschutz.

## Zuerst prüfen

Lies vollständig und prüfe anschließend den tatsächlichen Repository-Stand:

1. `PROJECT_CONTEXT.md`
2. `NEXT_STEPS.md`
3. `CHAT_TEMPLATE.md`
4. `README.de.md`, `README.md`, `DATENSCHUTZ.md`, `PRIVACY.md`
5. `src/SkybreakProtocol.tsx`, `src/updateCheck.ts`, `src/storage.ts`, `src/cheats.ts`, `src/powerUps.ts` und die vorhandenen Audio-/Bildassets
6. Git-Stand: `git status`, `git log --oneline -10`, Branch und Remote

Bei Abweichungen gilt immer der vorhandene Repository-Inhalt, nicht diese Vorlage.

## Ziel

Eine eigenständige native macOS-App entwickeln, die das Webspiel in Spielinhalt und Bedienung gleichwertig abbildet, aber als hochwertige **2,5D-Cyberpunk-Spielwelt** erscheint:

- Swift + SwiftUI für App-Struktur, Einstellungen und macOS-Oberfläche.
- Metal für die Spielszene, Partikel, Licht und Post-Processing.
- Kamera leicht von schräg vorne auf eine klar lesbare vertikale Spielebene.
- Die Spielfigur bewegt sich weiterhin eindeutig links/rechts/oben; keine frei drehbare Kamera und kein unübersichtliches 3D-Labyrinth.
- Die zehn Web-Level bleiben in Regeln, Reihenfolge, Zielen, Gegnern, Bossen, Musik und Schwierigkeitsstufen erhalten.

## 3D-Bildsprache

Die Optik soll hochwertiger Neon-Arcade-Stil sein, nicht fotorealistisch:

- Plattformen sind echte 3D-Objekte mit Volumen, Kanten, Material, Rissen und Unterseiten.
- Mehrere Tiefenebenen erzeugen Parallaxe: Vordergrundpartikel, Spielpfad, mittlere Architektur, ferne Kulisse.
- Zerstörte Blöcke brechen als passende 3D-Materialstücke heraus.
- Roboter, Gegner, Truhen und Wächter erhalten klare Silhouetten; Spielbarkeit geht vor Detaildichte.
- Die Benutzeroberfläche bleibt ruhig und gut lesbar, nicht als schwebendes 3D-Objekt ins Spiel gemischt.

## Welten als 3D-Dioramen

| Level | Dreidimensionale Umsetzung |
|---|---|
| Neon Undercity | Nasser Service-Schacht, Maglev-Züge, Rohre, Neonspiegelungen. |
| Chrome Bazaar | Schwebende Marktstege, Hologramm-Schilder, gestaffelte Dächer und Laternen. |
| Toxic Transit | Verlassene U-Bahn-Röhren, Rost, giftiger Nebel und Schienen in der Tiefe. |
| Crimson Firewall | Riesige Datenmauern, Laser-Gitter, glühende Glas- und Firewall-Fragmente. |
| Azure Data Sea | Daten-Ozean mit Wellenplatten, Lichtquallen und blauem Volumennebel. |
| Violet Reactor | Zentraler Reaktorschacht, rotierende Ringe, Plasma-Bögen und Kristalle. |
| Solar Megagrid | Solartürme, bewegliche Paneele, Hitze-Flimmern und harte Sonnenstrahlen. |
| Ghost Network | Phasenobjekte, Geisterdaten, Glitch-Partikel und dunkle Netzwerkarchitektur. |
| Quantum Rift | Raumspalt, Rift-Portale, verzerrte Sterne und schwebende Kristalltrümmer. |
| Skybreak Apex | Wolken über der Megacity, Sendeturm, Sonnenaufgang und Gipfellicht. |

## Raytracing-Anforderung

Raytracing ist eine sichtbare höchste Grafikstufe, aber kein Vollbild-Path-Tracing.

- **Mindestanforderung für Raytracing:** ein Mac mit mindestens **M3 Pro**. Auf älteren oder nicht geeigneten Macs bleibt die App vollständig spielbar und verwendet automatisch den hochwertigen Nicht-Raytracing-Fallback.
- Zur Laufzeit `MTLDevice.supportsRaytracing` prüfen.
- Nur gezielte Rays einsetzen: weiche Kontaktschatten, Neon-/Sonnenreflexionen auf Eis, Metall und nassen Flächen sowie kurze Lichtakzente von Explosionen und Portalen.
- Beschleunigungsstrukturen für statische Levelgeometrie aufbauen und dynamische Instanzen gezielt aktualisieren.
- Höchstens ein bis zwei Reflexions-/Schattenstrahlen pro Pixel, reduzierte interne Auflösung und zeitliche Stabilisierung einsetzen.
- Raytracing darf die direkte Steuerung, 60-FPS-Zielbildrate und Lesbarkeit niemals gefährden.

## Grafikstufen und Fallback

1. **Ultra Raytracing:** Metal-Raytracing, hochwertige Reflexionen, Schatten, Volumenlicht und volle Partikeleffekte.
2. **Ultra:** gleiche 3D-Welt ohne Raytracing; Screen-Space-Reflexionen, Lichtproben und hochwertige Shadow Maps.
3. **Hoch:** reduzierte Partikel, kürzere Sichtweite, weniger dynamische Lichter; Gameplay bleibt 60 FPS.
4. **Mittel/Niedrig:** gleiche Spielregeln und vollständige Level, aber weniger Atmosphäre und günstigere Materialien.

Ein Mac ohne Raytracing-Unterstützung darf niemals eine leere, dunkle oder kaputte Szene zeigen.

## Automatische Mac-Leistungsklassen und Partikeleffekte

Beim ersten Spielstart eine **rein lokale** Metal-Hardwareanalyse durchführen. Sie darf weder übertragen noch dauerhaft als Geräteprofil gespeichert werden.

- Primär nach tatsächlichen Metal-Fähigkeiten und Ressourcen staffeln: `supportsRaytracing`, unterstützte GPU-Familien, `recommendedMaxWorkingSetSize`, verfügbare Renderformate und ein kurzer lokaler Start-Benchmark.
- `MTLDevice.name` darf nur zur verständlichen Anzeige im Einstellungsfenster dienen, zum Beispiel „M4 Max erkannt“. Die Effektmenge darf nicht allein am Chipnamen hängen.
- Start mit einer sicheren Effektmenge und innerhalb der ersten Sekunden nur bei stabiler Bildzeit schrittweise erhöhen. Bei dauerhaft schlechter Bildzeit zuerst Partikelanzahl, Partikel-Lebensdauer, Reflexionsauflösung und Volumenlicht reduzieren - niemals Steuerung, Kollisionen oder Spielgeschwindigkeit.
- Die automatisch gewählte Klasse im Grafikmenü sichtbar machen und eine manuelle niedrigere Obergrenze erlauben; sie bleibt lokal, falls der Spieler sie ändert.

| Lokale Klasse | Beispiel | Raytracing | Effektbudget |
|---|---|---|---|
| Raytracing Basis | M3 Pro | Ja | volle 3D-Welt, gezielte Reflexionen/Schatten und konservative Partikelmengen. |
| Raytracing Erweitert | M3 Max oder M4 Pro | Ja | mehr Regen, Splitter, Lichtquellen und längere Explosionsreste. |
| Raytracing Max | M4 Max oder stärker | Ja | höchste Partikelmenge, dichteste Atmosphäre, zusätzliche Funken/Trümmer und längere sichtbare Reflexionen. |
| 3D-Fallback | unter M3 Pro oder keine passende Raytracing-Fähigkeit | Nein | vollständige 3D-Welt mit Screen-Space-Reflexionen, Lichtproben und reduzierter Effektmenge. |

Der Unterschied zwischen M3 Pro und M4 Max soll sichtbar sein, ohne die Bildsprache zu verändern: M4 Max erhält mehr gleichzeitig aktive Partikel, mehr Materialsplitter bei Blockzerstörung, dichteren Regen/Nebel und zusätzliche lokale Lichtakzente. Alle Spielregeln bleiben identisch.

## Architekturvorgaben

- Web-Logik zunächst analysieren und Regeln gezielt in eine testbare, möglichst UI-unabhängige Swift-Spielkern-Schicht übertragen.
- Rendering, Spielzustand, Eingabe, Audio, Speicherung und Einstellungen klar trennen.
- Metal-Renderer nicht in SwiftUI-Views verstreuen; eine klar abgegrenzte Render-Schicht verwenden.
- Bestehende Leveldaten und Begriffe übernehmen, aber keine Web-/React-Abhängigkeit in die App einbauen.
- Lokale macOS-Speicherung klar von Web-Local-Storage trennen. Web-Spielstände nur nach ausdrücklicher Entscheidung importieren.
- Keine Konten, Tracker, Telemetrie, Werbung, Cloud-Synchronisierung oder neue Netzwerkzugriffe ergänzen.

## Arbeitsregeln

- Vor Änderungen zuerst Ursache, betroffene Dateien und den kleinsten sicheren Schritt erklären.
- Kleine, überprüfbare Schritte statt eines großen ungetesteten Umbaus.
- Nach jeder Implementierung passend bauen und vorhandene Tests ausführen.
- Erfolgreichen Build klar von echtem Spieltest unterscheiden.
- Erst eine minimal spielbare 3D-Vertikalscheibe bauen: Roboter, eine Plattformart, Kamera, Springen, Kollision und ein Licht-/Schattenpfad.
- Danach Levelsystem, Gegner, Zerstörung, Audio, zehn Welten und Raytracing schrittweise ergänzen.
- Keine unnötigen Abhängigkeiten installieren. Benötigte Xcode-/Metal-/Swift-Werkzeuge zuerst nur feststellen und dokumentieren; nicht global installieren ohne ausdrückliche Zustimmung.
- Keine privaten Daten, lokalen Pfade, Zugangsdaten, Tokens, Backups, Logs oder echten Spielstände veröffentlichen. Öffentlicher Name ausschließlich `Schrotty74`.
- Keine Versionsnummern, Tags, Releases, Commits oder Pushes ohne ausdrücklichen Auftrag.

## Erste konkrete Aufgabe

Noch keine App-Dateien anlegen. Führe zuerst nur eine Bestandsanalyse durch und berichte kompakt:

1. tatsächlicher Web-Final- und Git-Stand,
2. welche Web-Regeln und Assets zwingend übernommen werden müssen,
3. empfohlene Swift-/Metal-Projektstruktur,
4. Raytracing-Fähigkeitserkennung und Fallback-Entwurf,
5. kleinste erste spielbare 3D-Vertikalscheibe,
6. vorhandene Risiken oder offene Entscheidungen.

Nimm in diesem ersten Schritt keine Änderungen vor.

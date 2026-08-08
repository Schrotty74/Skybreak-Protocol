# Skybreak Protocol – Projektkontext

**Stand:** 8. August 2026
**Status:** öffentliche Web-Beta `1.0.0-beta.7`

Diese Datei ist die zentrale technische Übergabe für neue Codex-Chats. Zuerst diese Datei und anschließend [`NEXT_STEPS.md`](NEXT_STEPS.md) lesen. Für Release-Vorhaben zusätzlich [`docs/RELEASE_WORKFLOW.md`](docs/RELEASE_WORKFLOW.md), [`docs/UNRELEASED.md`](docs/UNRELEASED.md), [`CHANGELOG.md`](CHANGELOG.md) und die passenden Release-Notizen lesen.

## Zweck

Skybreak Protocol ist ein eigenständiges, vertikales Cyberpunk-Arcade-Spiel für aktuelle Desktop- und Mobilbrowser. Es umfasst zehn Level mit eigenen Kulissen, Plattformen, Wächterdrohnen und Musikstücken. Die veröffentlichte Web-App läuft über GitHub Pages; ein versioniertes Offline-Paket wird bei öffentlichen Releases erstellt.

## Architektur und wichtige Dateien

| Bereich | Zuständigkeit |
|---|---|
| `src/SkybreakProtocol.tsx` | React-Komponente, Spielzustand, Gameplay-Schleife, Canvas-Zeichnung, Audio, Oberflächen und Grafikmodi |
| `src/powerUps.ts`, `src/cheats.ts`, `src/keyBindings.ts` | Power-ups, Cheat-Erkennung und frei belegbare Desktop-Steuerung |
| `src/storage.ts` | nach Build-Kanal getrennte Local-Storage-Schlüssel und einmalige Übernahme älterer Final-Spielstände |
| `src/ultraWorker.ts` | Worker für Ultra-Effektinstanzen und lokale Leistungssteuerung |
| `src/updateCheck.ts` | öffentliche GitHub-Release-Prüfung beim Start von Beta/Final |
| `public/audio/` | zehn mitgelieferte Level-Musikstücke |
| `source/` | Vite-Einstiegspunkte für Englisch und Deutsch |
| `scripts/` | Release-Prüfung, Pages-Aufbereitung, Offline-Paket, Handbücher und lokaler Performance-Test |
| `.github/workflows/` | GitHub-Pages-Bereitstellung und automatisierte Release-Erstellung |

Die zentralen Daten sind In-Memory-Spielzustand in `SkybreakProtocol.tsx` sowie lokale Browser-Einstellungen und Fortschritte. Es gibt keinen Anwendungsserver und keine Benutzerkonten.

## Build, Test und Release

- Frischer Checkout: `npm ci`
- Normaler lokaler Spieltest: `npm run dev` oder unter macOS `Skybreak-Protocol-Lokaltest.command`
- Sicherer lokaler Produktions-Build ohne Release-Artefakte: `npm run build:local`
- Beta/Final-Testkanäle: `npm run dev:beta`, `npm run dev:final`, `npm run build:beta`, `npm run build:final`
- Veröffentlichbarer Pages-Build: `npm run build`; Offline-Paket: `npm run build:offline`
- Handbücher nach inhaltlichen Spieländerungen: `npm run build:handbooks`, danach PDF-Seiten visuell prüfen.

`npm run build` ist nur für einen absichtlich vorbereiteten Release-Stand bestimmt. Der genaue Ablauf und die Prüfregeln stehen in [`docs/RELEASE_WORKFLOW.md`](docs/RELEASE_WORKFLOW.md). Keine Version, keinen Tag, Release, Commit oder Push ohne ausdrücklichen Auftrag erstellen.

## Umgesetzter Stand

- Zehn vollständige 15-Etagen-Level mit eigenen Plattformregeln, Energiezellen/Schaltern als Level-Zielen, Umweltgefahren, Gegner-Archetypen, Wächter-Phasen, Schwierigkeitsübernahme, freischaltbaren Startleveln und Eispickel-Upgrades.
- Desktop-Tastatursteuerung, Touch-Steuerung, Pause, Vollbild/immersiver Safari-Fallback, Cheats und Power-ups.
- Grafikstufen Niedrig, Mittel, Hoch und Ultra; Canvas-2D-Hauptszene, WebGPU-Ultra-Effekte und WebGL2-Fallback.
- Mobile Live-FPS-Anzeige während aktiver Runden sowie Desktop-Performance-Anzeige.
- Lokale Fortschritts- und Einstellungsspeicherung, getrennt nach Entwicklungs-, Beta- und Final-Kanal.
- Eigener Level-Soundtrack und synthetisierte Arcade-Soundeffekte.
- Level-Regeln bleiben zustandslos im Spielstand: Bruchzonen, bewegliche und vereiste Plattformen, Strömungen, seitliche Laser, Reaktor-/Geist-Phasen und Rift-Sprünge verändern das jeweilige Level, ohne neue Browserdaten zu speichern. Der Eispickel kann Schalter aktivieren, Projektilenergie auflösen, Schildgegner knacken, Kryo-Frost auslösen und ab Kraftstufe 4 zeitweise Eisbrücken erzeugen.
- Der rein kosmetische Bikini-Avatar-Cheat wird während einer aktiven Runde durch zwei schnelle Musik-Aus/An-Zyklen ausgelöst (insgesamt vier Betätigungen innerhalb von jeweils 1,2 Sekunden). Er verändert weder Punkte noch Spielwerte und gilt nur bis zum Neuladen der Seite.
- Öffentliche, optionale GitHub-Release-Prüfung für Beta und Final.

## Feste technische Regeln

- Mobil auf **Hoch** bleibt die Gameplay-Schleife bei maximal 60 FPS. Bei Wärme-/Leistungsdruck dürfen nur Effekte, Auflösung und atmosphärische Ebenen reduziert werden, nicht die Hauptspielschleife.
- Audio muss bei Levelwechsel, Neustart, Pausieren, Menüwechsel und Unmount eindeutig verwaltet werden: Es darf niemals mehr als ein Musiktrack gleichzeitig hörbar sein.
- Bestehende Local-Storage-Werte und getrennte Build-Kanäle müssen kompatibel bleiben.
- Die beiden Sprachfassungen der App und die inhaltlich passenden Dokumentationen müssen synchron gehalten werden.
- Keine unnötigen Refactorings oder Änderungen an Spielfluss, Steuerung, Datenformaten oder gespeicherten Fortschritten.

## Datenschutz und Veröffentlichung

- Nur „Schrotty74“ als öffentlicher Name verwenden.
- Keine privaten Daten, lokalen Pfade, Zugangsdaten, Tokens, Logs, Backups oder echten Spielstände in Quellcode, Dokumentation, Screenshots oder Releases veröffentlichen.
- Vor einem öffentlichen Release Portfolio und GitHub-Profil aktualisieren, falls sichtbare Projektinformationen geändert wurden; siehe [`PORTFOLIO_UPDATE.md`](PORTFOLIO_UPDATE.md).
- Datenschutz- und Geheimnisprüfung vor jeder Veröffentlichung wiederholen; bestehende Berichte: [`DATENSCHUTZ.md`](DATENSCHUTZ.md) und [`PRIVACY.md`](PRIVACY.md).
- Marken-, Grafik- und Audioinhalte sind nicht durch die MIT-Lizenz freigegeben; siehe [`ASSET_LICENSE.md`](ASSET_LICENSE.md).

## Dokumentationsreihenfolge

1. Diese Datei
2. [`NEXT_STEPS.md`](NEXT_STEPS.md)
3. Bei Release-Arbeit: [`docs/RELEASE_WORKFLOW.md`](docs/RELEASE_WORKFLOW.md), [`docs/UNRELEASED.md`](docs/UNRELEASED.md), [`CHANGELOG.md`](CHANGELOG.md)
4. Bei Datenschutz-/Veröffentlichungsarbeit: [`DATENSCHUTZ.md`](DATENSCHUTZ.md), [`PRIVACY.md`](PRIVACY.md), [`PORTFOLIO_UPDATE.md`](PORTFOLIO_UPDATE.md)
5. Bei Funktionsdetails: passende Abschnitte in `README.de.md`, `README.md` und dem Quellcode

Aktuelle offene Punkte und bekannte Einschränkungen stehen ausschließlich in [`NEXT_STEPS.md`](NEXT_STEPS.md), nicht in dieser Grundlagen-Datei.

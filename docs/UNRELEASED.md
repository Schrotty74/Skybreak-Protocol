# Unveröffentlichte Änderungen seit Skybreak Protocol 1.0.0-beta.1

## Umgesetzt

- Auf Leicht erscheinen dauerhafte Holztruhen alle zwei bis drei Plattform-Etagen.
- Auf Mittel werden Truhen ab der Hälfte des Sektors für acht Sekunden eingeblendet und versetzt.
- Auf Schwer erscheinen Truhen erst ab zwei Dritteln des Sektors für 4,5 Sekunden und wechseln schneller ihre Position – regelmäßig auch unterhalb des Spielers.
- Truhen enthalten Schutzschild, Extraleben, Punktebonus oder einen zwölf Sekunden langen Eispickel-Overdrive.
- Schutzschild, Overdrive, geöffnete Truhen und Power-up-Meldungen werden im Spiel sichtbar dargestellt.
- Vier geheime Cheat-Sequenzen für levelgebundene Unsterblichkeit, Doppelschild, 30-Sekunden-Overdrive und Extraleben ergänzt. Cheat-Läufe verändern den lokalen Highscore nicht.
- Deutsches und englisches PDF-Handbuch mit Spielprinzip, Steuerung, Buttons, Levelbeschreibungen, Einstellungen und Cheat-Codes ergänzt und auf den jeweiligen Startseiten verlinkt.
- Der Release-Workflow verlangt bei spielrelevanten Änderungen eine Aktualisierung und visuelle Prüfung beider Handbücher.
- Ultra verwendet den transparenten Screen-Mischmodus jetzt auch am Desktop, damit ein leerer WebGPU-Frame das Spiel in Safari oder Chrome nicht mehr abdunkelt.
- Der WebGL2-Ultra-Fallback wird auf 40 FPS und die mittlere interne Effektauflösung begrenzt, um starkes Ruckeln besonders in Firefox zu reduzieren.
- Erreichte Level werden lokal freigeschaltet und können auf dem Start-, Niederlage- oder Sieg-Bildschirm direkt als neues Startlevel gewählt werden.
- Desktop-Tasten für Links, Rechts, Springen und Hämmern sind frei belegbar; doppelte Belegungen werden getauscht und die Standardbelegung kann wiederhergestellt werden.

## Geplant: Grafik und Präsentation

- [ ] Level-Übergänge mit kurzer Kamerafahrt, Sektorname, Farbwelt und Umgebungsvorschau
- [ ] Sichtbare Roboterschäden mit Funken, flackernden Sensoren und Schadenszuständen bei wenig Leben
- [ ] Eigene Schlagspuren, Partikelfarben und Einschlaganimationen für Eispickel-Upgrades
- [ ] Stärkere Tiefenwirkung durch zusätzliche Skyline-Ebenen, fliegende Fahrzeuge und entfernte Gewitter
- [ ] Individuelle Plattformmaterialien je Level, etwa Chrom, Energiegitter, Glas und Reaktormetall
- [ ] Boss-ähnliche Levelenden mit Wächterdrohne oder Verteidigungsanlage
- [ ] Erweiterte Siegsequenz mit Kamerazoom, aktiviertem Sendeturm und Sonnenaufgang
- [ ] Grafisches Hauptmenü mit Levelkarte, Vorschau, Schwierigkeitsgrad und Bestwert

Priorität: zuerst Level-Übergänge, Roboterschäden und Siegsequenz.

## Spätere Phase: native macOS-App

Erst beginnen, wenn die Web-App vollständig fertiggestellt und als stabile Final-Version veröffentlicht ist.

- [ ] Vollständige native macOS-App mit Swift und SwiftUI entwickeln
- [ ] Gameplay, zehn Levels, Steuerung, Musik, Soundeffekte, Einstellungen und Spielstände übernehmen
- [ ] Rendering nativ mit Metal umsetzen
- [ ] Hardwarebeschleunigtes Metal-Raytracing auf unterstützten Macs für Reflexionen, Licht und Schatten nutzen
- [ ] Geeigneten Metal-Fallback ohne Raytracing für nicht unterstützte Macs bereitstellen
- [ ] Grafikoptionen für Leistung, Qualität und Raytracing anbieten
- [ ] macOS-Tastatur-, Controller-, Vollbild- und Fenstersteuerung integrieren
- [ ] App-Signierung, Notarisierung, Datenschutz, Updates und Veröffentlichung vorbereiten

## Datenschutz

Unveröffentlichte Änderungen dürfen keine privaten Daten, lokalen Pfade, Zugangsdaten, Protokolle oder persönlichen Spielstände enthalten.

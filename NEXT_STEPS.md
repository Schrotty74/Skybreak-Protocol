# Nächste Schritte – Skybreak Protocol

**Stand:** 1. August 2026  
**Ausgangsstand:** `1.0.0-beta.7`

Diese Datei bei jeder größeren Änderung aktualisieren. Sie enthält nur tatsächlich bekannte, noch offene Punkte.

## Priorität 1 – Musik bei Levelwechsel

- **Fehlerbericht:** Beim Start eines neuen Levels ist der Track des vorherigen Levels noch hörbar, sodass zwei Musikstücke gleichzeitig laufen.
- **Betroffener Bereich:** `createAudio()` in `src/SkybreakProtocol.tsx`, insbesondere `playMusic()` und die Übergabe nach einem Levelabschluss.
- **Ziel:** Vor oder während des Starts des neuen Tracks den bisherigen Track zuverlässig pausieren, von der Audioquelle lösen und aus der aktiven Verwaltung entfernen. Zu jedem Zeitpunkt darf höchstens ein Level-Track hörbar sein.
- **Manuell prüfen:** Levelwechsel, Neustart, Pause/Fortsetzen, Musik aus/ein, Wechsel zum Startbildschirm sowie mehrfach schnelle Übergänge. Der Fehler ist als Nutzerbericht erfasst; ein reproduzierbarer automatisierter Test ist derzeit nicht vorhanden.

## Priorität 2 – Dokumentation vor dem nächsten Release abgleichen

- `src/SkybreakProtocol.tsx` speichert zusätzlich die Renderauflösung unter `skybreak-render-resolution`.
- [`DATENSCHUTZ.md`](DATENSCHUTZ.md) und [`PRIVACY.md`](PRIVACY.md) nennen derzeit sechs gespeicherte Werte und führen diesen Schlüssel nicht auf.
- Vor dem nächsten öffentlichen Release prüfen und die Datenschutzberichte nur dann ergänzen, wenn der aktuelle Quellcode weiterhin maßgeblich ist. Keine Speicher- oder Netzwerkbehauptungen ohne Quellcodeprüfung ändern.

## Priorität 3 – Mobile FPS-Anzeige auf echtem Gerät abnehmen

- Die Anzeige wurde aus dem Spielfeld in den schwarzen Kopfbereich unter „Skybreak Protocol“ verschoben und größer in Gelb gestaltet.
- Auf einem echten Mobilgerät im aktiven Spiel prüfen, ob sie bei unterschiedlichen Bildschirmbreiten lesbar bleibt und weder Score noch Lives verdeckt.

## Bereits bekannte Beta-Einschränkungen

- Bildrate und Wärmeentwicklung hängen von Gerät, Browser, Akkustand, Umgebungstemperatur und Grafikstufe ab.
- Ultra kann auf Mobilgeräten deutlich Wärme und Akkuverbrauch erhöhen; 4K Ultra ist dort kein 60-FPS-Zielmodus.
- Firefox kann bei fehlendem WebGPU den leichteren WebGL2-Fallback verwenden.
- Für den lokalen macOS-Starter müssen projektlokale Node-Abhängigkeiten vorhanden sein; nach frischem Checkout `npm ci` ausführen.

## Spätere Phase

Eine native macOS-App ist erst nach Abschluss und stabiler Final-Veröffentlichung der Web-App vorgesehen. Der detaillierte, noch nicht begonnene Umfang steht in [`docs/UNRELEASED.md`](docs/UNRELEASED.md).

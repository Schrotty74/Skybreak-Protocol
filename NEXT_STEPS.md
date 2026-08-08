# Nächste Schritte – Skybreak Protocol

**Stand:** 8. August 2026
**Ausgangsstand:** `1.0.0-beta.7`

Diese Datei bei jeder größeren Änderung aktualisieren. Sie enthält nur tatsächlich bekannte, noch offene Punkte.

## Priorität 1 – Gameplay-Variation auf echten Geräten abnehmen

- Die neuen Level-Regeln wurden kompiliert, aber noch nicht als kompletter Lauf in einem echten Browser oder auf einem Mobilgerät gespielt.
- Manuell prüfen: Bruchzonen (Level 2/4/7), bewegliche Plattformen (1/5/10), Eisplattformen (3/7), Strömungen (3/5/7/8/10), Seitenlaser (4/7/10), Phasenplattformen (6/8), Rift-Sprünge (9), Energiezellen/Schalter sowie Boss-Angriffe nach jedem Integritätstreffer.
- Eispickel prüfen: Schalteraktivierung, Projektil-Auflösung, Schildgegner, Kryo-Frost bei passenden Style-Stufen und die temporäre Eisbrücke ab Kraftstufe 4.
- Dabei besonders auf unfaire Spawnpunkte, erreichbare Rifts, Kollisionen bei unsichtbaren Phasenplattformen und Wärmeentwicklung auf Mobilgeräten achten.

## Priorität 2 – Musikwechsel auf echtem Gerät prüfen

- Der Quellcode verwaltet beim Wechsel nun aktive Musikobjekte zentral und löst vorherige Tracks nach der Überblendung.
- Der frühere Fehlerbericht mit gleichzeitig hörbaren Level-Tracks ist damit im Quellcode adressiert, aber noch nicht durch den vollständigen manuellen Ablauf bestätigt.
- Manuell prüfen: Levelwechsel, Neustart, Pause/Fortsetzen, Musik aus/ein, Wechsel zum Startbildschirm sowie mehrfach schnelle Übergänge.

## Priorität 3 – Dokumentation vor dem nächsten Release abgleichen

- `src/SkybreakProtocol.tsx` speichert zusätzlich die Renderauflösung unter `skybreak-render-resolution`.
- [`DATENSCHUTZ.md`](DATENSCHUTZ.md) und [`PRIVACY.md`](PRIVACY.md) nennen derzeit sechs gespeicherte Werte und führen diesen Schlüssel nicht auf.
- Vor dem nächsten öffentlichen Release prüfen und die Datenschutzberichte nur dann ergänzen, wenn der aktuelle Quellcode weiterhin maßgeblich ist. Keine Speicher- oder Netzwerkbehauptungen ohne Quellcodeprüfung ändern.

## Priorität 4 – Mobile FPS-Anzeige auf echtem Gerät abnehmen

- Die Anzeige wurde aus dem Spielfeld in den schwarzen Kopfbereich unter „Skybreak Protocol“ verschoben und größer in Gelb gestaltet.
- Auf einem echten Mobilgerät im aktiven Spiel prüfen, ob sie bei unterschiedlichen Bildschirmbreiten lesbar bleibt und weder Score noch Lives verdeckt.

## Priorität 5 – Bikini-Abschlusssequenz abnehmen

- Mit aktiviertem Bikini-Avatar auf einem Desktop- und Mobilbrowser ein Level beenden.
- Prüfen: Die Vollbild-Tanzsequenz läuft fünf Sekunden, die aktuelle Levelmusik bleibt hörbar und anschließend erscheint zuverlässig die Upgrade-Auswahl beziehungsweise das Finale.

## Bereits bekannte Beta-Einschränkungen

- Bildrate und Wärmeentwicklung hängen von Gerät, Browser, Akkustand, Umgebungstemperatur und Grafikstufe ab.
- Ultra kann auf Mobilgeräten deutlich Wärme und Akkuverbrauch erhöhen; 4K Ultra ist dort kein 60-FPS-Zielmodus.
- Firefox kann bei fehlendem WebGPU den leichteren WebGL2-Fallback verwenden.
- Für den lokalen macOS-Starter müssen projektlokale Node-Abhängigkeiten vorhanden sein; nach frischem Checkout `npm ci` ausführen.

## Spätere Phase

Eine native macOS-App ist erst nach Abschluss und stabiler Final-Veröffentlichung der Web-App vorgesehen. Der detaillierte, noch nicht begonnene Umfang steht in [`docs/UNRELEASED.md`](docs/UNRELEASED.md).

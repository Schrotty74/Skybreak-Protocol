# Vorlage für einen neuen Codex-Chat

Arbeite ausschließlich im Projektordner `Skybreak-Protocol` und ausschließlich an der normalen Web-Version. Keine native macOS- oder 3D-App anlegen oder planen.

Lies zuerst vollständig:

1. `README.md` und `README.de.md`
2. `PROJECT_CONTEXT.md` und `NEXT_STEPS.md`
3. `CHANGELOG.md`, `docs/UNRELEASED.md` und `docs/RELEASE_WORKFLOW.md`
4. `package.json`, `package-lock.json`, `vite.config.ts`, die relevanten Skripte, Workflows und den betroffenen Quellcode

Wichtige Regeln:

- Vor jeder Änderung Ursache und betroffene Dateien kurz nennen; anschließend nur die nötigen Dateien ändern.
- Keine Commits, Pushes, Tags, Releases oder Versionsänderungen ohne ausdrücklichen Auftrag.
- Local, Beta und Final strikt getrennt halten. Nach jeder Spieländerung `npm run build:local` ausführen und `Skybreak-Protocol-Lokaltest.command` bereitstellen.
- Browser, Bildschirmaufnahme und Computersteuerung nur mit ausdrücklicher Erlaubnis bedienen.
- Keine privaten Daten, lokalen Pfade, Zugangsdaten, Tokens, Backups, Logs oder echten Spielstände veröffentlichen. Öffentlicher Name ausschließlich `Schrotty74`.
- Bei einer echten Beta deutsche und englische Release-Notizen, `CHANGELOG.md`, beide READMEs und beide PDF-Handbücher aktualisieren, die PDFs visuell prüfen sowie Beta-, Release- und Offline-Build ausführen.
- Vor öffentlichen Releases Datenschutzprüfung wiederholen und bei sichtbaren Projektänderungen die Portfolio-Regel in `PORTFOLIO_UPDATE.md` beachten.

## Dokumentationspflege ist verbindlich

Nach jeder Änderung an Spielverhalten, Architektur, Build-/Release-Ablauf, lokaler Speicherung, Tests oder öffentlichen Projektinformationen müssen die folgenden Dateien gegen den tatsächlichen Repository-Inhalt geprüft und bei Bedarf im selben Arbeitsgang aktualisiert werden:

- `PROJECT_CONTEXT.md`: bestätigter technischer Stand und Architektur
- `NEXT_STEPS.md`: ausschließlich tatsächlich offene, noch relevante Aufgaben
- `PORTFOLIO_UPDATE.md`: Regel und Auslöser für öffentliche Portfolio-Pflege
- diese Vorlage: Arbeitsregeln und verpflichtende Prüfschritte

Vor einem Commit oder Release nochmals prüfen, dass Versionsstand, Spielregeln, offene Punkte und Verweise dieser Dateien zueinander passen. Keine doppelten oder konkurrierenden Übergabe-Dateien anlegen.

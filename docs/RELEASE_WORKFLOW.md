# Release-Workflow

Skybreak Protocol verwendet zwei öffentliche Release-Stufen:

- **Beta:** Testversion im Format `1.0.0-beta.1`, `1.0.0-beta.2` usw.
- **Final:** stabile Version im Format `1.0.0`, `1.1.0` usw.

## Neue Beta oder Final-Version

1. Version in `package.json` und `package-lock.json` aktualisieren.
2. Für genau diese Version ausführliche deutsche und englische Changelogs unter `docs/releases/<version>.md` und `docs/releases/<version>.en.md` erstellen.
3. `CHANGELOG.md` um den neuen Eintrag ergänzen.
4. Änderungen aus `docs/UNRELEASED.md` in den Versions-Changelog übernehmen und die Datei anschließend zurücksetzen.
5. Datenschutzberichte anpassen, falls sich Speicherung oder Netzwerkzugriffe geändert haben.
6. `npm ci`, `npm run build` und `npm run build:offline` ausführen.
7. Vor der Veröffentlichung Portfolio und GitHub-Profil aktualisieren, wenn sich sichtbare Projektinformationen geändert haben.
8. Den geprüften Stand auf `main` veröffentlichen.

Der Build führt `scripts/verify-release.mjs` aus. Eine Beta- oder Final-Version kann nicht gebaut werden, wenn einer der beiden ausführlichen Changelogs fehlt, offensichtlich unvollständig ist oder mehr als eine Versionsüberschrift enthält.

Nach dem Push erstellt `.github/workflows/publish-release.yml` automatisch den Tag und den GitHub Release. Versionen mit `-beta.N` werden als Prerelease markiert; Versionen ohne Zusatz als Final Release. Im Release steht die Versionsüberschrift nur einmal; darunter folgen der deutsche und englische Changelog. Der Workflow erzeugt außerdem ein versioniertes Offline-ZIP und lädt es unter **Assets** hoch. Bei einer Korrektur derselben Version werden Release-Text und ZIP aktualisiert.

## Update-Prüfung im Spiel

Beim Start liest das Spiel die öffentlichen GitHub Releases. Es berücksichtigt ausschließlich Final-Versionen und Tags im Format `v1.0.0-beta.1`. Ist eine höhere Beta oder Final-Version vorhanden, erscheint ein Hinweis mit Link zum Release. Entwürfe und ungültige Versionsbezeichnungen werden ignoriert.

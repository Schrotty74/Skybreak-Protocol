# Release-Workflow

Skybreak Protocol verwendet zwei öffentliche Release-Stufen:

- **Beta:** Testversion im Format `1.0.0-beta.1`, `1.0.0-beta.2` usw.
- **Final:** stabile Version im Format `1.0.0`, `1.1.0` usw.

## Neue Beta oder Final-Version

1. Version in `package.json` und `package-lock.json` aktualisieren.
2. Für genau diese Version einen ausführlichen Changelog unter `docs/releases/<version>.md` erstellen.
3. `CHANGELOG.md` um den neuen Eintrag ergänzen.
4. Änderungen aus `docs/UNRELEASED.md` in den Versions-Changelog übernehmen und die Datei anschließend zurücksetzen.
5. Datenschutzberichte anpassen, falls sich Speicherung oder Netzwerkzugriffe geändert haben.
6. `npm ci` und `npm run build` ausführen.
7. Vor der Veröffentlichung Portfolio und GitHub-Profil aktualisieren, wenn sich sichtbare Projektinformationen geändert haben.
8. Den geprüften Stand auf `main` veröffentlichen.

Der Build führt `scripts/verify-release.mjs` aus. Eine Beta- oder Final-Version kann nicht gebaut werden, wenn der passende ausführliche Changelog fehlt oder offensichtlich unvollständig ist.

Nach dem Push erstellt `.github/workflows/publish-release.yml` automatisch den Tag und den GitHub Release. Versionen mit `-beta.N` werden als Prerelease markiert; Versionen ohne Zusatz als Final Release. Bereits vorhandene Releases werden nicht überschrieben.

## Update-Prüfung im Spiel

Beim Start liest das Spiel die öffentlichen GitHub Releases. Es berücksichtigt ausschließlich Final-Versionen und Tags im Format `v1.0.0-beta.1`. Ist eine höhere Beta oder Final-Version vorhanden, erscheint ein Hinweis mit Link zum Release. Entwürfe und ungültige Versionsbezeichnungen werden ignoriert.

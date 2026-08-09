# Datenschutzbericht – Skybreak Protocol

[English version](PRIVACY.md)

Stand: 8. August 2026

## Ergebnis

Die veröffentlichte Web-App enthält nach statischer Prüfung **keine privaten personenbezogenen Daten, Zugangsdaten, API-Schlüssel oder geheimen lokalen Dateipfade**. Das Spiel besitzt kein Benutzerkonto, keine Werbung, kein Analyse-SDK, kein Tracking und keinen eigenen Serverdienst.

## Geprüfter Umfang

- Quellcode, HTML, Manifest, GitHub-Actions-Workflow und Dokumentation
- erzeugte Produktionsdateien
- Bilddateien und deren Metadaten
- externe Verbindungen und Browser-Speicherzugriffe
- typische Geheimnis- und Identitätsmuster wie E-Mail-Adressen, Token, Passwörter, private Schlüssel und lokale Benutzerpfade

Abhängigkeiten (`node_modules`) werden nicht veröffentlicht. Der automatisch erzeugte Lockfile enthält ausschließlich öffentliche npm-Paketinformationen.

## Verarbeitung im Browser

Skybreak Protocol speichert nur zehn technisch nicht personenbezogene Werte im lokalen Speicher des jeweiligen Browsers:

| Schlüssel | Inhalt | Zweck | Übertragung |
|---|---|---|---|
| `neon-ascent-highscore` | höchste lokal erreichte Punktzahl | Spielstand | keine |
| `skybreak-quality` | gewählte Grafikstufe | Geräteeinstellung beibehalten | keine |
| `skybreak-render-resolution` | gewählte interne Renderauflösung | Geräteeinstellung beibehalten | keine |
| `skybreak-level-difficulties` | je Level gewählte Schwierigkeit | Spieleinstellung beibehalten | keine |
| `skybreak-ultra-frame-rate` | gewähltes Limit 60 FPS, bis 120 FPS oder ohne Limit | Geräteeinstellung beibehalten | keine |
| `skybreak-show-fps` | Sichtbarkeit der lokalen FPS-Anzeige | Geräteeinstellung beibehalten | keine |
| `skybreak-unlocked-level` | höchste lokal freigeschaltete Levelnummer | Levelauswahl nach einem Lauf ermöglichen | keine |
| `skybreak-key-bindings` | selbst gewählte Desktop-Tastenbelegung | Steuerung beibehalten | keine |
| `skybreak-unlocked-robot-profiles` | lokal freigeschaltete levelabhängige Robotermodelle | kosmetische Roboterauswahl ermöglichen | keine |
| `skybreak-cosmetic-loadout` | gewähltes Eispickel-Design, Avatar und Robotermodell | kosmetische Auswahl beibehalten | keine |

Ältere Browserdaten können zusätzlich die früheren Kompatibilitäts-Schlüssel `skybreak-mobile-ultra-120` oder `skybreak-ultra-120` enthalten. Sie werden nur gelesen, um eine vorhandene Einstellung zu übernehmen, und nicht übertragen.

Diese Werte verlassen das Gerät nicht. Sie können durch Löschen der Websitedaten im Browser entfernt werden.

Der Ultra-Modus prüft ausschließlich lokal die Verfügbarkeit von WebGPU und optionalem F16, technische GPU-Grenzwerte und Bildzeiten, um WebGPU oder den WebGL2-Fallback zu wählen, Renderauflösung und Post-Processing anzupassen und 60, 90 oder 120 FPS auszuwählen. Ein Modul-Web-Worker gleicher Herkunft führt lokale Effekt- und Zeitberechnungen aus. Browser stellen dem Spiel keine Temperaturmessung bereit; anhaltend schlechtere Bildzeiten dienen lokal als Signal für Leistungsdrosselung. GPU-Modell, Adapterinformationen, Messergebnisse, Bildzeiten, Temperatur oder Hardwarekennungen werden weder gespeichert noch übertragen.

Der Soundtrack besteht aus MP3-Dateien, die im Spiel enthalten sind und nach einer Nutzerinteraktion von derselben GitHub-Pages-Adresse geladen werden. Wiedergabe und Levelwechsel erfolgen lokal. Hörverhalten wird weder gespeichert noch übertragen.

Die Update-Prüfung ruft einmal beim Start die öffentliche Release-Liste unter `api.github.com/repos/Schrotty74/Skybreak-Protocol/releases` ab. Die Anfrage enthält weder Punktestand noch Spieleinstellungen, Local-Storage-Werte, Gerätemesswerte, Kontodaten oder eine vom Spiel erzeugte Kennung. GitHub erhält die technisch notwendigen Verbindungsdaten einer normalen Webanfrage. Schlägt der Abruf fehl oder läuft nach fünf Sekunden ab, läuft das Spiel ohne Update-Hinweis weiter.

## Nicht verwendet

- keine Cookies
- keine Analyse-, Werbe- oder Telemetriedienste
- keine Standort-, Kamera- oder Mikrofonberechtigungen
- keine Kontakt-, Geräte- oder Kontodaten
- keine Formulare oder Benutzereingaben außerhalb der Spielsteuerung
- keine WebSocket-, Beacon- oder XHR-Aufrufe; `fetch` wird ausschließlich für die oben beschriebene öffentliche GitHub-Release-Prüfung verwendet
- keine extern geladenen Schriften, Bilder, Sounds oder Skripte; die einzige externe Laufzeitanfrage des Spiels ist die öffentliche Release-Prüfung

## Hosting

Beim Abruf über GitHub Pages verarbeitet GitHub technisch notwendige Verbindungsdaten wie IP-Adresse und Browser-Anfrage außerhalb des Spielcodes. Dafür gelten die Datenschutzbedingungen von GitHub. Skybreak Protocol selbst erhält keinen Zugriff auf diese Hosting-Protokolle.

## Veröffentlichte Bezeichnungen

Öffentlich sichtbar sind ausschließlich der Spielname, neutrale Projektangaben und die bereits öffentliche Repository-Adresse `Schrotty74/Skybreak-Protocol`. Eine zuvor in der Repository-Lizenz enthaltene abweichende Personen- oder Aliasangabe wurde vorsorglich durch die neutrale Bezeichnung „Skybreak Protocol contributors“ ersetzt.

## Prüfmethode und Grenze

Die Prüfung ist eine statische Datenschutz- und Geheimnissuche des veröffentlichten Projektstands. Sie bestätigt den geprüften Stand, kann aber zukünftige Änderungen an Quellcode, Abhängigkeiten oder Hostingbedingungen nicht abdecken. Vor jeder späteren Veröffentlichung sollte dieselbe Prüfung wiederholt werden.

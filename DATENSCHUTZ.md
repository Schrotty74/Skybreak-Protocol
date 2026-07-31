# Datenschutzbericht – Skybreak Protocol

[English version](PRIVACY.md)

Stand: 31. Juli 2026

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

Skybreak Protocol speichert nur drei technisch nicht personenbezogene Werte im lokalen Speicher des jeweiligen Browsers:

| Schlüssel | Inhalt | Zweck | Übertragung |
|---|---|---|---|
| `neon-ascent-highscore` | höchste lokal erreichte Punktzahl | Spielstand | keine |
| `skybreak-quality` | gewählte Grafikstufe | Geräteeinstellung beibehalten | keine |
| `skybreak-level-difficulties` | je Level gewählte Schwierigkeit | Spieleinstellung beibehalten | keine |

Diese Werte verlassen das Gerät nicht. Sie können durch Löschen der Websitedaten im Browser entfernt werden.

Der Ultra-Modus prüft ausschließlich lokal die Verfügbarkeit von WebGPU, technische GPU-Grenzwerte und Bildzeiten, um WebGPU oder den WebGL2-Fallback zu wählen, die Renderauflösung anzupassen und 60, 90 oder 120 FPS auszuwählen. Ein Modul-Web-Worker gleicher Herkunft führt lokale Effekt- und Zeitberechnungen aus. GPU-Modell, Adapterinformationen, Messergebnisse, Bildzeiten oder Hardwarekennungen werden weder gespeichert noch übertragen.

## Nicht verwendet

- keine Cookies
- keine Analyse-, Werbe- oder Telemetriedienste
- keine Standort-, Kamera- oder Mikrofonberechtigungen
- keine Kontakt-, Geräte- oder Kontodaten
- keine Formulare oder Benutzereingaben außerhalb der Spielsteuerung
- keine `fetch`-, WebSocket-, Beacon- oder XHR-Aufrufe durch das Spiel
- keine extern geladenen Schriften, Bilder, Sounds oder Skripte

## Hosting

Beim Abruf über GitHub Pages verarbeitet GitHub technisch notwendige Verbindungsdaten wie IP-Adresse und Browser-Anfrage außerhalb des Spielcodes. Dafür gelten die Datenschutzbedingungen von GitHub. Skybreak Protocol selbst erhält keinen Zugriff auf diese Hosting-Protokolle.

## Veröffentlichte Bezeichnungen

Öffentlich sichtbar sind ausschließlich der Spielname, neutrale Projektangaben und die bereits öffentliche Repository-Adresse `Schrotty74/Skybreak-Protocol`. Eine zuvor in der Repository-Lizenz enthaltene abweichende Personen- oder Aliasangabe wurde vorsorglich durch die neutrale Bezeichnung „Skybreak Protocol contributors“ ersetzt.

## Prüfmethode und Grenze

Die Prüfung ist eine statische Datenschutz- und Geheimnissuche des veröffentlichten Projektstands. Sie bestätigt den geprüften Stand, kann aber zukünftige Änderungen an Quellcode, Abhängigkeiten oder Hostingbedingungen nicht abdecken. Vor jeder späteren Veröffentlichung sollte dieselbe Prüfung wiederholt werden.

<p align="center">
  <img src="public/icon-512.png" alt="Skybreak Protocol Symbol" width="180" height="180">
</p>

# Skybreak Protocol

Ein eigenständiges vertikales Cyberpunk-Arcade-Spiel für moderne Desktop- und Mobilbrowser. Durchbrich Plattformen von unten, weiche Drohnen und fallenden Gefahren aus und erreiche den Sendeturm über der Megacity.

> Skybreak Protocol verwendet keine Grafiken, Musik, Figuren oder Quelltexte von Nintendo oder Ice Climber. Es handelt sich um eine eigenständige Neuinterpretation des klassischen vertikalen Arcade-Spielprinzips.

Der geprüfte Umgang mit Daten ist im [Datenschutzbericht](DATENSCHUTZ.md) und im [English Privacy Report](PRIVACY.md) dokumentiert.

## Spielen

- **GitHub Pages:** <https://schrotty74.github.io/Skybreak-Protocol/>
- **Deutsch:** <https://schrotty74.github.io/Skybreak-Protocol/de/>
- **Alternative OpenAI-Sites-Version:** <https://neon-ascent.bk-bezahlen.chatgpt.site>

Die Web-App funktioniert ohne Installation. Auf iPhone oder iPad kann sie in Safari über **Teilen → Zum Home-Bildschirm** als App-Symbol abgelegt werden. Unter Android steht die entsprechende Funktion im Browsermenü zur Verfügung.

## Spielprinzip

- Vertikal durch neun Sektoren der Megacity aufsteigen
- Plattformmodule von unten durchbrechen
- Gegner mit dem Impulshammer oder durch Sprünge ausschalten
- Lücken, fallenden Energiesplittern und Patrouillendrohnen ausweichen
- Punkte sammeln, Leben erhalten und den lokalen Highscore verbessern

## Steuerung

| Aktion | Tastatur | Mobilgerät |
|---|---|---|
| Bewegen | `A` / `D` oder `←` / `→` | Linke und rechte Bildschirmtaste |
| Springen | `W`, `↑` oder `Leertaste` | `JUMP` |
| Impulshammer | `X` oder `K` | `PULSE` |
| Pause | `P` oder `Esc` | `PAUSE` |

## Grafikqualität

Die gewählte Stufe wird lokal auf dem Gerät gespeichert.

| Stufe | Ziel | Effekte |
|---|---|---|
| Niedrig | ältere oder warme Mobilgeräte | 30 FPS, reduzierte Auflösung, WebGL-Effekte aus, wenig Regen und Nebel |
| Mittel | empfohlene Smartphone-Einstellung | 40 FPS, WebGL-Nebel, reduzierte Partikel und Parallaxe |
| Hoch | leistungsfähige Geräte | bis 60 FPS, hohe Auflösung und erweiterte Effekte |
| Ultra | aktuelle Desktop-GPUs und 4K | volle Renderauflösung, maximale Partikel, WebGL2, Beleuchtung und Parallaxe |

## Grafische Effekte

- optionaler WebGL2-Shader für animierten Neon-Nebel, Regen und atmosphärisches Leuchten
- mehrstufige Parallax-Megacity mit beleuchteten Fenstern
- volumetrische Suchscheinwerfer und dynamische Lichtkegel
- holografische Werbeflächen und fliegender Stadtverkehr
- animierter Neonregen, Scanlines und subtile chromatische Effekte
- dreidimensional wirkende Plattformmodule mit Metall-, Glas- und Energietexturen
- dynamische Schatten, Bloom, Bewegungs- und Impulshammer-Spuren
- Partikel, Trümmer, Einschlagseffekte und Bildschirmerschütterung
- adaptive Renderauflösung bis 4K

## Technik

- React 19 und TypeScript
- Vite 8
- Canvas 2D mit WebGL2-Zusatzebene und kompatiblem Fallback
- Web Audio API für synthetisierte Arcade-Sounds
- Pointer Events für Maus, Touch und Stift
- Local Storage für Highscore und Grafikstufe
- automatische GitHub-Pages-Bereitstellung über GitHub Actions

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Produktions-Build:

```bash
npm run build
```

## Hinweise zur Geräteleistung

Ultra kann Smartphones stark belasten und zu höherer Temperatur sowie schnellerem Akkuverbrauch führen. Für iPhones und Android-Geräte ist **Mittel** die empfohlene Einstellung. Bei deutlicher Erwärmung sollte **Niedrig** verwendet werden.

## Lizenz

Der Quelltext steht unter der im Repository enthaltenen MIT-Lizenz.

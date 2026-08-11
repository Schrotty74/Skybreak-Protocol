#!/usr/bin/env python3
"""Generate the German and English Skybreak Protocol handbooks."""

import json
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "manual"
ICON = ROOT / "public" / "icon-512.png"
START_SHOT = ROOT / "docs" / "screenshots" / "desktop-start-ultra.jpeg"
GAME_SHOT = ROOT / "docs" / "screenshots" / "mobile-gameplay.jpeg"
MOBILE_START_COMPACT_SHOT = ROOT / "docs" / "screenshots" / "mobile-start-compact.jpeg"
MOBILE_START_OPTIONS_SHOT = ROOT / "docs" / "screenshots" / "mobile-start-options.jpeg"
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]

PAGE_W, PAGE_H = A4
MARGIN = 36
BG = "#02040d"
PANEL = "#07101d"
CYAN = "#00f0ff"
PINK = "#ff2b8a"
YELLOW = "#ffd84d"
WHITE = "#e8fcff"
MUTED = "#86a7b9"
LINE = "#17445a"

def font_path(*candidates):
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return str(path)
    raise FileNotFoundError(f"Required handbook font not found: {candidates}")


pdfmetrics.registerFont(TTFont("SkySans", font_path(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
)))
pdfmetrics.registerFont(TTFont("SkySansBold", font_path(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
)))
pdfmetrics.registerFont(TTFont("SkyMono", font_path(
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/System/Library/Fonts/Supplemental/Courier New.ttf",
)))
pdfmetrics.registerFont(TTFont("SkyMonoBold", font_path(
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
)))


TEXT = {
    "de": {
        "file": "Skybreak-Protocol-Handbuch-DE.pdf",
        "manual": "SPIELHANDBUCH",
        "subtitle": "Aufstieg, Steuerung, Systeme, Level und Cheat-Codes",
        "edition": f"VERSION {VERSION} // DEUTSCH",
        "intro": "Skybreak Protocol ist ein vertikales Cyberpunk-Arcade-Spiel. Jedes der vierzehn Levels ist ein vollständiger Aufstieg über 15 Etagen mit eigener Kulisse, Musik und Schwierigkeit. Durchbrich Plattformen, schalte Drohnen aus und erreiche den Sendeturm.",
        "facts": [("ZIEL", "Level 14 erreichen"), ("START", "3 Leben"), ("LEVEL", "14 Sektoren"), ("SPEICHERUNG", "Highscore und Einstellungen lokal")],
        "start": "SCHNELLSTART",
        "start_steps": [
            "AUFSTIEG STARTEN wählen.",
            "Mit links/rechts unter eine beschädigte Plattform laufen.",
            "Springen und die Plattform von unten treffen.",
            "Drohnen ausweichen oder mit PICK angreifen.",
            "Nach einem abgeschlossenen Level Kraft oder Design des Eispickels verbessern.",
            "Danach das neu freigeschaltete nächste Level starten.",
        ],
        "menu_title": "MENÜ- UND SYSTEMBUTTONS",
        "menu_buttons": [
            ("START / TRY AGAIN", "Startet einen neuen Lauf; freigeschaltete Startlevel lassen sich vorher wählen."),
            ("CHANGELOG", "Öffnet die Änderungen der aktuellen Version."),
            ("DEUTSCH / ENGLISH", "Wechselt die Sprache der Spielseite."),
            ("POWER / STYLE", "Wählt nach einem Level die angezeigte nächste Kraft- oder Designstufe."),
            ("RESUME / WEITER", "Setzt ein pausiertes Spiel fort."),
            ("VIEW / ANSEHEN", "Öffnet ein verfügbares Update; X schließt den Hinweis."),
            ("GOT IT / VERSTANDEN", "Schließt den iPhone-App-Modus-Hinweis."),
            ("SPIELSTAND ZURÜCKSETZEN", "Löscht den gesamten lokalen Spielstand, Freischaltungen, Rekord und Einstellungen. RESET KEYS setzt dagegen nur die Tasten zurück."),
        ],
        "controls": "STEUERUNG UND BUTTONS",
        "mobile_menu": "KOMPAKTES HANDY-STARTMENÜ",
        "mobile_menu_intro": "Die ersten beiden Auswahlfelder bleiben sofort sichtbar. Challenge und kosmetische Auswahl liegen unter WEITERE OPTIONEN; der lokale Spielstand-Reset bleibt am Ende des Startmenüs erreichbar.",
        "mobile_menu_closed": "KOMPAKTE ANSICHT",
        "mobile_menu_open": "ERWEITERTE OPTIONEN",
        "controls_intro": "Die Handy-Schaltflächen sind im Screenshot links sichtbar. Tastatur und Touch lösen dieselben Aktionen aus.",
        "buttons": [
            ("← / →", "Bewegen", "Standard A/D, am Desktop frei belegbar. Auf Touch gedrückt halten."),
            ("JUMP", "Springen", "Standard Leertaste, am Desktop frei belegbar. Plattformen von unten treffen."),
            ("PICK", "Eispickel", "Standard X, am Desktop frei belegbar. Drohnen und beschädigte Module angreifen."),
            ("SFX", "Soundeffekte", "SFX unabhängig von der Musik ein- oder ausschalten."),
            ("MUSIC", "Musik", "Soundtrack separat ein- oder ausschalten."),
            ("FPS AN/AUS", "Leistungsanzeige", "Zeigt oder verbirgt FPS und Framezeit lokal. Auf Desktop erscheinen zusätzlich CPU-Werte."),
            ("FULLSCREEN", "Vollbild", "Vollbild starten; auf iPhone erklärt APP-MODUS die Installation."),
            ("PAUSE", "Pause", "Spiel anhalten oder fortsetzen. Tastatur: P oder Esc."),
            ("GRAPHICS", "Grafik", "Niedrig, Mittel, Hoch oder Ultra auswählen. Grafik, Auflösung, Bildraten-Limit und Showcase stehen im Startmenü direkt über dem lokalen Spielstand-Reset."),
            ("RESOLUTION", "Auflösung", "iPhone 17 Pro: Ultra erreicht 60 FPS bei 1080p. 4K Ultra ist kein 60-FPS-Mobilmodus."),
            ("FRAME RATE LIMIT", "Bildraten-Limit", "60 FPS, bis 120 FPS oder ohne Limit wählen. Höhere Bildraten erhöhen Last und Stromverbrauch."),
            ("SHOWCASE", "Desktop-Benchmark", "Startet einen 30-Sekunden-Showcase mit autonom kletterndem Roboter, zerstörten Blöcken und hohen Effektbudgets. Das Ergebnis bleibt ausschließlich lokal."),
            ("DIFFICULTY", "Schwierigkeit", "Steht direkt bei der Startlevel-Wahl. Leicht, Mittel oder Schwer wählen; die Wahl wird in den nächsten Level übernommen."),
            ("TASTENBELEGUNG", "Desktop-Tasten", "Aktion anklicken und neue Taste drücken. Standard stellt A, D, SPACE und X wieder her."),
        ],
        "systems": "SPIELSYSTEME",
        "systems_cards": [
            ("PLATTFORMEN", "Neben stabilen und brüchigen Modulen gibt es bewegliche, vereiste, Phasen- und Rift-Plattformen. Phasenblöcke tragen nur aktiv und sind mit PHASE 01 bis PHASE 14 markiert: vier auf Leicht, acht auf Mittel, zwölf auf Schwer - jeweils auf getrennten Etagen. Bewegliche Stege: vier, sechs oder acht."),
            ("GEGNER & GEFAHREN", "Leicht enthält in jedem Level vier Patrouillen und einen Wächter, Mittel fünf Patrouillen und zwei Wächter, Schwer sechs Patrouillen und zwei Wächter. Schüsse, Bomben und Steg-Gefahren richten sich nur nach der Schwierigkeit. Nur ein Wächter pro Begegnung wirft Bomben."),
            ("TRUHEN & SCHILD", "Truhen bieten sieben wählbare Belohnungen. Leicht: fünf feste Truhen. Mittel: vier feste plus zwei wandernde Bonustruhen ab 40 Prozent Höhe. Schwer: zwei feste plus eine wandernde Bonustruhe ab 60 Prozent. Wandernde Truhen geben verstärkte Boni. Schild: 8 Sekunden und 3 Treffer auf Leicht, 6 Sekunden und 2 Treffer auf Mittel, 4 Sekunden und 1 Treffer auf Schwer."),
            ("WÄNDE & DOPPELSTEGE", "Zerstörbare senkrechte Wände ergänzen den Weg: zwei auf Leicht, vier auf Mittel und sechs auf Schwer. Doppelstege sind über den Aufstieg verteilt; zuerst den unteren, dann mit einem zweiten Sprung den oberen Steg durchbrechen."),
            ("ZIELE & EISPICKEL", "Je zwei Energiezellen oder Zugangsschalter müssen vor dem Levelziel aktiviert werden. Der Eispickel löst gegnerische Projektile auf und knackt Schilde. Ein erster Treffer friert einen normalen Gegner ein, der nächste schaltet ihn aus. Ab Kraft 4 entsteht kurz eine Eisbrücke."),
            ("WÄCHTER & LEVEL", "Jedes Level hat 15 Etagen, eine eigene Kulisse, ein Eispickel-Grundmodell und einen Wächter. Werte für Bewegung, Schüsse und Gefahren bleiben innerhalb einer Schwierigkeit über alle Level gleich. Nach Sieg folgt die nächste Upgrade-Vorschau."),
            ("ABSCHLUSS & SIEG", "Nach jedem Levelziel zeigt der Roboter fünf Sekunden SKYBREAK DANCE vor Upgrade oder Finale. Beim kosmetischen Bikini-Avatar erscheint stattdessen eine levelabhängige Look-Präsentation. Nach Level 14 aktiviert sich der Sendeturm; Cheat-Läufe ändern den Rekord nicht."),
        ],
        "levels_a": "LEVEL 1 BIS 5",
        "levels_b": "LEVEL 6 BIS 10",
        "levels_c": "LEVEL 11 BIS 14",
        "levels": [
            (1, "Neon Undercity", "Cyan-magenta Unterstadt mit Versorgungsschächten, Rohren, Regen und schnellen Magnetschwebebahnen."),
            (2, "Chrome Bazaar", "Pink-mintfarbener Chrommarkt mit schwebenden Laternen, Marktständen und animierten Reklamen."),
            (3, "Toxic Transit", "Giftgrüner Transittunnel mit Tunnelrippen, fahrenden Zugfenstern und aufsteigenden Gasblasen."),
            (4, "Crimson Firewall", "Rot-orange Sicherheitszone mit pulsierenden Datenwänden, Firewall-Säulen und fliegender Glut."),
            (5, "Azure Data Sea", "Tiefblaues Datenmeer mit mehreren Wellenebenen, Blasen und leuchtenden Datenquallen."),
            (6, "Violet Reactor", "Violetter Energiekern mit rotierenden Reaktorringen, Plasmabögen und instabilem Zentrum."),
            (7, "Solar Megagrid", "Bernsteinrotes Solarfeld mit großer Sonne, Hitzeschimmer und beweglichen Modulreihen."),
            (8, "Ghost Network", "Blass-cyanfarbene Netzruine mit flackernden Phantomknoten, Paketströmen und Glitches."),
            (9, "Quantum Rift", "Violett-blaue Dimensionszone mit rotierender Singularität, Spiralarmen und verzogenen Sternspuren."),
            (10, "Skybreak Apex", "Leuchtender Gipfel über Wolken mit Morgendämmerung, Sendestrahlen und Transmissionsturm."),
            (11, "Inferno-Schmiede", "Reine Lavakaverne mit Feuerfontänen, Asche und sichtbarem Hitzeflimmern."),
            (12, "Abyssales Datenmeer", "Dunkler Ozean mit Mantarochen, Strömungen und nassem Plattformfilm."),
            (13, "Stratosphären-Relais", "Offener Sturm über Wolken mit Turbinen und Windwirbeln."),
            (14, "Terra-Kernzitadelle", "Erdkernhöhle mit schwebenden Gesteinsbrocken und Mineraladern."),
        ],
        "settings": "EINSTELLUNGEN, AUDIO UND OFFLINE-MODUS",
        "settings_cards": [
            ("SCHWIERIGKEIT", "Leicht ist der Einstiegsmodus mit 8 Leben, vier langsamen Patrouillen, einem Wächter mit zwei Treffern, vier Phasenblöcken und vier Bewegungsstegen. Mittel nutzt fünf Patrouillen, zwei Wächter, acht Phasenblöcke und sechs Bewegungsstege. Schwer nutzt sechs Patrouillen, zwei Wächter, zwölf Phasenblöcke und acht Bewegungsstege. Diese Werte sind in allen Leveln gleich."),
            ("GRAFIK", "Auf einem iPhone 17 Pro erreicht Ultra bei 1080p 60 FPS. 4K Ultra ist kein 60-FPS-Mobilmodus. Ultra kann das Gerät dennoch erwärmen. Zerstörte Blöcke explodieren in Ultra passend zur Welt; Hoch nutzt weniger Fragmente. Bei Hitze, Sonne oder Erwärmung Mittel oder Niedrig wählen."),
            ("BILDRATEN-LIMIT", "Für jede Grafikstufe 60 FPS, bis 120 FPS oder ohne Limit wählen. Höhere Bildraten erhöhen Wärme und Akkuverbrauch; der adaptive Wärmeschutz kann Effekte reduzieren."),
            ("SHOWCASE", "Nur am Desktop: Nach zwei Sekunden Aufwärmen läuft ein 30-Sekunden-Showcase mit autonomem Roboter und besonders hoher Effektlast. Das lokale Ergebnis nennt Grafikstufe, Auflösung, Limit, FPS, Framezeit, CPU- und – sofern vom Browser verfügbar – GPU-Zeit."),
            ("SAFARI 120 HZ", "Bei einem 120-Hz-Bildschirm: Safari-Einstellungen, Erweitert, Feature Flags; Prefer Page Rendering Updates near 60fps deaktivieren, Safari vollständig beenden und neu öffnen. Chrome und Firefox folgen normalerweise der Bildwiederholrate des Bildschirms."),
            ("AUDIO", "Jedes Level besitzt einen eigenen Track. MUSIC und SFX lassen sich vollständig getrennt schalten."),
            ("OFFLINE", "Das Release-ZIP entpacken und den Starter für macOS, Windows oder Linux öffnen. Alle vierzehn Musikstücke sind enthalten."),
            ("UPDATES", "Beim Start prüft das Spiel öffentliche GitHub-Releases. Nur die Update-Prüfung benötigt Internet; Spielstände bleiben lokal."),
        ],
        "upgrades": "UPGRADES UND LEISTUNGSANZEIGE",
        "upgrade_cards": [
            ("KRAFT 1 BIS 10", "Jede Kraftstufe erhöht die Reichweite um 8. P1-2 zerstört 1, P3-4 2, P5-6 3, P7-8 4 und P9-10 5 benachbarte Plattformmodule pro Schlag."),
            ("DESIGN 1 BIS 10", "Gold Kurve, Cyan Klinge, Pink Spitze, Grün Kurve, Orange Klinge, Violett Spitze, Eis Kurve, Lila Klinge, Weiß Spitze und Sonne Kurve. Die Vorschau nennt die nächste Stufe."),
            ("LEVEL-MODELLE", "Jedes Level verwendet unabhängig vom Design-Upgrade ein eigenes Eispickel-Grundmodell, eigene Gegner- und Wächterform sowie seine Farbwelt."),
            ("FPS / SHOWCASE", "FPS AN/AUS schaltet die lokale Live-Anzeige. Der Desktop-Showcase liefert einen reproduzierbaren 30-Sekunden-Vergleich für die gewählte Grafik, Auflösung und Bildrate."),
            ("AUFLÖSUNG", "720p spart Leistung, 1080p ist der empfohlene Mobile-Ultra-Modus auf dem getesteten iPhone 17 Pro. 4K ist ein Qualitäts- und Screenshot-Modus."),
            ("FORTSCHRITT", "Erreichte Level werden lokal freigeschaltet. Im Startmenü ein freigeschaltetes Startlevel wählen; die Schwierigkeit wird beim nächsten Level übernommen."),
        ],
        "cheats": "GEHEIME CHEAT-CODES",
        "cheat_intro": "Die Steuerungs-Cheats funktionieren mit Touch und Tastatur und gelten nur für den aktuellen Lauf; ein solcher Lauf aktualisiert den lokalen Highscore nicht. Der Profil-Freischaltcode benötigt keinen CHEAT-LINK und schaltet Inhalte nur lokal frei.",
        "cheat_steps": [
            "Einen Lauf starten.",
            "Das SP-Symbol links oben fünfmal schnell antippen oder anklicken.",
            "Nach CHEAT-LINK BEREIT innerhalb von 10 Sekunden die Folge eingeben. Die Folge selbst muss innerhalb von 7 Sekunden erfolgen.",
            "Nach jedem Cheat muss das SP-Symbol erneut fünfmal aktiviert werden.",
        ],
        "codes": [
            ("UNSTERBLICH", "← → ← → JUMP PICK", "Blockiert Treffer und Stürze im aktuellen Level. Endet beim nächsten Level."),
            ("DOPPELSCHILD", "JUMP JUMP ← → PICK", "Gewährt sofort zwei Schildladungen: 8 Sekunden auf Leicht, 6 auf Mittel, 4 auf Schwer."),
            ("30-S-OVERDRIVE", "PICK JUMP PICK JUMP ← →", "Maximale Eispickel-Verstärkung für 30 Sekunden."),
            ("EXTRALEBEN", "← ← → → JUMP PICK", "Gibt ein zusätzliches Leben, maximal neun Leben."),
            ("ALLES FREISCHALTEN", "SFX AUS/AN ×2, MUSIC AUS", "SFX innerhalb von 5 Sekunden zweimal aus- und einschalten, dann innerhalb von 5 Sekunden MUSIC ausschalten. Schaltet alle Level, Roboter-Modelle und den Hologramm-Avatar dauerhaft nur im lokalen Profil frei."),
        ],
        "cheat_note": "CHEAT-LAUF // NUR LOKAL // KEIN HIGHSCORE-EINTRAG",
        "footer": "Skybreak Protocol // Handbuch DE",
    },
    "en": {
        "file": "Skybreak-Protocol-Manual-EN.pdf",
        "manual": "GAME MANUAL",
        "subtitle": "Ascent, controls, systems, levels, and cheat codes",
        "edition": f"VERSION {VERSION} // ENGLISH",
        "intro": "Skybreak Protocol is a vertical cyberpunk arcade game. Each of the fourteen levels is a complete 15-floor ascent with its own scenery, music, and difficulty. Break platforms, disable drones, and reach the transmission tower.",
        "facts": [("GOAL", "Reach level 14"), ("START", "3 lives"), ("LEVELS", "14 sectors"), ("STORAGE", "Local high score and settings")],
        "start": "QUICK START",
        "start_steps": [
            "Select START ASCENT.",
            "Move left or right below a damaged platform.",
            "Jump and strike the platform from below.",
            "Avoid drones or attack them with PICK.",
            "After completing a level, upgrade ice-pick power or style.",
            "Then start the newly unlocked next level.",
        ],
        "menu_title": "MENU AND SYSTEM BUTTONS",
        "menu_buttons": [
            ("START / TRY AGAIN", "Starts a new run; choose an unlocked start level first."),
            ("CHANGELOG", "Opens the changes for the current version."),
            ("DEUTSCH / ENGLISH", "Switches the language of the game page."),
            ("POWER / STYLE", "Selects the displayed next power or style level after a completed level."),
            ("RESUME / WEITER", "Continues a paused game."),
            ("VIEW / ANSEHEN", "Opens an available update; X dismisses the notice."),
            ("GOT IT / VERSTANDEN", "Closes the iPhone app-mode notice."),
            ("RESET LOCAL PROFILE", "Deletes all local progress, unlocks, record, and settings. RESET KEYS only restores the key assignments."),
        ],
        "controls": "CONTROLS AND BUTTONS",
        "mobile_menu": "COMPACT MOBILE START MENU",
        "mobile_menu_intro": "The first two selectors remain visible immediately. Challenge and cosmetic choices are grouped under MORE OPTIONS; the local profile reset remains available at the end of the start menu.",
        "mobile_menu_closed": "COMPACT VIEW",
        "mobile_menu_open": "EXPANDED OPTIONS",
        "controls_intro": "The mobile controls are visible in the screenshot on the left. Keyboard and touch trigger the same actions.",
        "buttons": [
            ("← / →", "Move", "Default A/D, configurable on desktop. Hold the touch button."),
            ("JUMP", "Jump", "Default Space, configurable on desktop. Strike platforms from below."),
            ("PICK", "Ice pick", "Default X, configurable on desktop. Attack drones and damaged modules."),
            ("SFX", "Sound effects", "Switch sound effects independently from music."),
            ("MUSIC", "Music", "Switch the soundtrack independently from SFX."),
            ("FPS ON/OFF", "Performance display", "Shows or hides local FPS and frame time. Desktop also shows CPU values."),
            ("FULLSCREEN", "Fullscreen", "Enter fullscreen; on iPhone, APP MODE explains installation."),
            ("PAUSE", "Pause", "Pause or resume the game. Keyboard: P or Esc."),
            ("GRAPHICS", "Graphics", "Select Low, Medium, High, or Ultra. Graphics, resolution, frame-rate limit, and Showcase are grouped in the start menu directly above the local-profile reset."),
            ("RESOLUTION", "Resolution", "iPhone 17 Pro: Ultra reaches 60 FPS at 1080p. 4K Ultra is not a 60 FPS mobile mode."),
            ("FRAME RATE LIMIT", "Frame rate limit", "Choose 60 FPS, up to 120 FPS, or Unlimited. Higher frame rates increase load and power use."),
            ("SHOWCASE", "Desktop benchmark", "Starts a 30-second showcase with an autonomous climbing robot, block destruction, and high effect budgets. The result remains entirely local."),
            ("DIFFICULTY", "Difficulty", "Located directly next to the start-level choice. Select Easy, Medium, or Hard; the choice carries into the next level."),
            ("KEY BINDINGS", "Desktop keys", "Select an action and press a new key. Reset restores A, D, SPACE, and X."),
        ],
        "systems": "GAME SYSTEMS",
        "systems_cards": [
            ("PLATFORMS", "Alongside stable and fragile modules, there are moving, icy, phase, and rift platforms. Phase blocks support the robot only while active and are marked PHASE 01 through PHASE 14: four on Easy, eight on Medium, twelve on Hard, always on separate floors. Moving routes: four, six, or eight."),
            ("ENEMIES & HAZARDS", "Easy uses four patrols and one guardian in every level, Medium five patrols and two guardians, and Hard six patrols and two guardians. Shots, bombs, and walkway hazards depend only on difficulty. Only one guardian per encounter throws bombs."),
            ("CHESTS & SHIELD", "Chests offer seven selectable rewards. Easy: five fixed chests. Medium: four fixed plus two roaming bonus chests after 40 percent height. Hard: two fixed plus one roaming bonus chest after 60 percent. Roaming chests grant enhanced rewards. Shield: 8 seconds and 3 hits on Easy, 6 seconds and 2 hits on Medium, 4 seconds and 1 hit on Hard."),
            ("WALLS & DOUBLE DECKS", "Destructible vertical walls extend the route: two on Easy, four on Medium, and six on Hard. Double decks are distributed through the ascent; break the lower deck first, then use a second jump to break the upper deck."),
            ("OBJECTIVES & ICE PICK", "Two energy cells or access switches must be activated before the level goal. The ice pick dissolves enemy projectiles and breaks shields. A first hit freezes a normal enemy; the next disables it. From power 4, it briefly creates an ice bridge."),
            ("GUARDIANS & LEVELS", "Each level has 15 floors, unique scenery, an ice-pick base model, and a guardian. Movement, shots, and hazards use the same values across all levels within one difficulty. The next upgrade preview follows a win."),
            ("COMPLETION & VICTORY", "After every level goal, the robot shows SKYBREAK DANCE for five seconds before the upgrade or finale. The cosmetic bikini avatar instead shows a level-specific look presentation. After level 14, the tower activates; cheat runs do not change the record."),
        ],
        "levels_a": "LEVELS 1 TO 5",
        "levels_b": "LEVELS 6 TO 10",
        "levels_c": "LEVELS 11 TO 14",
        "levels": [
            (1, "Neon Undercity", "Cyan-magenta depths with service shafts, pipes, rain, and fast maglev traffic."),
            (2, "Chrome Bazaar", "Pink-mint chrome market with floating lanterns, stalls, and animated advertising."),
            (3, "Toxic Transit", "Toxic-green tunnel with structural ribs, moving train windows, and rising gas bubbles."),
            (4, "Crimson Firewall", "Red-orange security zone with pulsing data walls, firewall columns, and flying embers."),
            (5, "Azure Data Sea", "Deep-blue data sea with layered waves, bubbles, and luminous data jellyfish."),
            (6, "Violet Reactor", "Violet energy core with rotating reactor rings, plasma arcs, and an unstable center."),
            (7, "Solar Megagrid", "Amber-red solar field with a blazing sun, heat shimmer, and moving panel arrays."),
            (8, "Ghost Network", "Pale-cyan network ruins with flickering phantom nodes, packet streams, and glitches."),
            (9, "Quantum Rift", "Purple-blue dimension with a rotating singularity, spiral arms, and warped star trails."),
            (10, "Skybreak Apex", "Bright summit above the clouds with dawn light, transmission rays, and the final tower."),
            (11, "Inferno Foundry", "Pure lava cavern with fire fountains, ash, and visible heat haze."),
            (12, "Abyssal Data Ocean", "Dark ocean with manta rays, currents, and a wet platform film."),
            (13, "Stratosphere Relay", "Open storm above the clouds with turbines and wind vortices."),
            (14, "Terra Core Citadel", "Earth-core cavern with levitating rocks and mineral seams."),
        ],
        "settings": "SETTINGS, AUDIO, AND OFFLINE MODE",
        "settings_cards": [
            ("DIFFICULTY", "Easy is the onboarding mode with 8 lives, four slow patrols, one two-hit guardian, four phase blocks, and four moving routes. Medium uses five patrols, two guardians, eight phase blocks, and six moving routes. Hard uses six patrols, two guardians, twelve phase blocks, and eight moving routes. These values are identical in every level."),
            ("GRAPHICS", "On an iPhone 17 Pro, Ultra reaches 60 FPS at 1080p. 4K Ultra is not a 60 FPS mobile mode. Ultra can still warm the device. Destroyed blocks use world-specific explosions in Ultra; High uses fewer fragments. In heat, sunlight, or when warm, choose Medium or Low."),
            ("FRAME RATE LIMIT", "For every graphics preset, choose 60 FPS, up to 120 FPS, or Unlimited. Higher frame rates increase heat and battery use; adaptive thermal protection can reduce effects."),
            ("SHOWCASE", "Desktop only: after a two-second warm-up, a 30-second showcase runs an autonomous robot with especially high effect load. The local result lists graphics preset, resolution, limit, FPS, frame time, CPU time and, when exposed by the browser, GPU time."),
            ("SAFARI 120 HZ", "For Safari on a 120 Hz display: Settings, Advanced, Feature Flags; disable Prefer Page Rendering Updates near 60fps, then quit Safari fully and reopen it. Chrome and Firefox normally follow the display refresh rate."),
            ("AUDIO", "Every level has its own track. MUSIC and SFX are completely independent."),
            ("OFFLINE", "Extract the release ZIP and open the starter for macOS, Windows, or Linux. All fourteen music tracks are included."),
            ("UPDATES", "On startup, the game checks public GitHub releases. Only the update check needs internet; game data remains local."),
        ],
        "upgrades": "UPGRADES AND PERFORMANCE DISPLAY",
        "upgrade_cards": [
            ("POWER 1 TO 10", "Every power level adds 8 reach. P1-2 breaks 1, P3-4 2, P5-6 3, P7-8 4, and P9-10 5 adjacent platform modules per strike."),
            ("STYLE 1 TO 10", "Gold Curve, Cyan Blade, Pink Spike, Green Curve, Orange Blade, Violet Spike, Ice Curve, Lilac Blade, White Spike, and Sun Curve. The preview names the next level."),
            ("LEVEL MODELS", "Independently from the style upgrade, every level uses its own ice-pick base model, enemy and guardian form, and color world."),
            ("FPS / SHOWCASE", "FPS ON/OFF toggles the live local display. The desktop Showcase provides a reproducible 30-second comparison for the selected graphics, resolution, and frame-rate limit."),
            ("RESOLUTION", "720p saves performance, 1080p is the recommended Mobile Ultra mode on the tested iPhone 17 Pro. 4K is a quality and screenshot mode."),
            ("PROGRESS", "Completed levels unlock locally. Choose an unlocked start level from the start menu; difficulty carries into the next level."),
        ],
        "cheats": "SECRET CHEAT CODES",
        "cheat_intro": "Control cheats work with touch and keyboard and apply only to the current run; such a run does not update the local high score. The profile-unlock code needs no CHEAT LINK and unlocks content locally only.",
        "cheat_steps": [
            "Start a run.",
            "Quickly tap or click the SP symbol at the top left five times.",
            "After CHEAT LINK READY appears, enter the sequence within 10 seconds. The sequence itself must be completed within 7 seconds.",
            "Activate the SP symbol five times again before using another cheat.",
        ],
        "codes": [
            ("IMMORTAL", "← → ← → JUMP PICK", "Blocks hits and falls in the current level. Ends at the next level."),
            ("DOUBLE SHIELD", "JUMP JUMP ← → PICK", "Immediately grants two shield charges: 8 seconds on Easy, 6 on Medium, and 4 on Hard."),
            ("30-S OVERDRIVE", "PICK JUMP PICK JUMP ← →", "Maximum ice-pick enhancement for 30 seconds."),
            ("EXTRA LIFE", "← ← → → JUMP PICK", "Adds one life, up to a maximum of nine."),
            ("UNLOCK ALL", "SFX OFF/ON ×2, MUSIC OFF", "Switch SFX off and on twice within 5 seconds, then turn MUSIC off within 5 seconds. Permanently unlocks all levels, robot models, and the hologram avatar in the local profile only."),
        ],
        "cheat_note": "CHEAT RUN // LOCAL ONLY // NO HIGH-SCORE ENTRY",
        "footer": "Skybreak Protocol // Manual EN",
    },
}


def color(hex_value):
    from reportlab.lib.colors import HexColor
    return HexColor(hex_value)


@lru_cache(maxsize=8)
def optimized_image(path_string, max_width, photo=False):
    image = PILImage.open(path_string)
    if image.width > max_width:
        height = round(image.height * max_width / image.width)
        image = image.resize((max_width, height), PILImage.Resampling.LANCZOS)
    buffer = BytesIO()
    if photo:
        image.convert("RGB").save(buffer, format="JPEG", quality=78, optimize=True)
    else:
        image.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return ImageReader(buffer)


def wrap(text, font, size, width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, text, x, y, width, font="SkySans", size=9, leading=13, fill=WHITE, max_lines=None):
    lines = wrap(text, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    c.setFont(font, size)
    c.setFillColor(color(fill))
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def page_base(c, data, page_no, title):
    c.setFillColor(color(BG))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(color("#061223"))
    c.circle(PAGE_W - 45, PAGE_H - 30, 120, fill=1, stroke=0)
    c.setStrokeColor(color(CYAN))
    c.setLineWidth(0.7)
    c.setFillColor(color(CYAN))
    c.setFont("SkyMonoBold", 8)
    c.drawString(MARGIN, PAGE_H - 25, "SKYBREAK PROTOCOL")
    c.setFillColor(color(PINK))
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 25, f"{data['edition']} // {page_no:02d}")
    c.line(MARGIN, PAGE_H - 34, PAGE_W - MARGIN, PAGE_H - 34)
    c.setFillColor(color(WHITE))
    c.setFont("SkySansBold", 20)
    c.drawString(MARGIN, PAGE_H - 65, title)
    c.setStrokeColor(color(LINE))
    c.line(MARGIN, 28, PAGE_W - MARGIN, 28)
    c.setFillColor(color(MUTED))
    c.setFont("SkyMono", 7)
    c.drawString(MARGIN, 16, data["footer"])
    c.drawRightString(PAGE_W - MARGIN, 16, "Schrotty74 // GitHub Pages")


def card(c, x, y, width, height, heading, body, accent=CYAN, body_size=8.5):
    c.setFillColor(color(PANEL))
    c.setStrokeColor(color(accent))
    c.setLineWidth(0.8)
    c.roundRect(x, y - height, width, height, 6, fill=1, stroke=1)
    c.setFillColor(color(accent))
    c.setFont("SkyMonoBold", 9)
    c.drawString(x + 11, y - 18, heading)
    draw_wrapped(c, body, x + 11, y - 35, width - 22, size=body_size, leading=12, fill=WHITE)


def bullet_list(c, items, x, y, width, leading=22):
    for index, item in enumerate(items, 1):
        c.setFillColor(color(YELLOW))
        c.setFont("SkyMonoBold", 8)
        c.drawString(x, y, f"{index:02d}")
        y = draw_wrapped(c, item, x + 24, y, width - 24, size=9, leading=12, fill=WHITE) - (leading - 12)
    return y


def draw_cover(c, data):
    c.setFillColor(color(BG))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setStrokeColor(color(CYAN))
    c.setLineWidth(1)
    c.rect(22, 22, PAGE_W - 44, PAGE_H - 44, fill=0, stroke=1)
    c.setFillColor(color("#061223"))
    c.circle(PAGE_W - 60, PAGE_H - 100, 150, fill=1, stroke=0)
    c.drawImage(optimized_image(str(ICON), 220), MARGIN, PAGE_H - 152, 88, 88, mask="auto")
    c.setFillColor(color(PINK))
    c.setFont("SkyMonoBold", 9)
    c.drawString(MARGIN, PAGE_H - 176, data["edition"])
    c.setFillColor(color(WHITE))
    c.setFont("SkySansBold", 31)
    c.drawString(MARGIN, PAGE_H - 216, "SKYBREAK")
    c.setFillColor(color(CYAN))
    c.drawString(MARGIN, PAGE_H - 251, "PROTOCOL")
    c.setFillColor(color(YELLOW))
    c.setFont("SkyMonoBold", 13)
    c.drawString(MARGIN, PAGE_H - 280, data["manual"])
    draw_wrapped(c, data["subtitle"], MARGIN, PAGE_H - 304, 250, size=10, leading=14, fill=MUTED)
    c.drawImage(optimized_image(str(START_SHOT), 500, True), PAGE_W - 250, PAGE_H - 340, 215, 121, preserveAspectRatio=True, anchor="c")
    y = draw_wrapped(c, data["intro"], MARGIN, PAGE_H - 365, 275, size=10, leading=15, fill=WHITE)
    y -= 18
    for heading, body in data["facts"]:
        c.setFillColor(color(PANEL))
        c.roundRect(MARGIN, y - 34, 275, 28, 4, fill=1, stroke=0)
        c.setFillColor(color(CYAN))
        c.setFont("SkyMonoBold", 7.5)
        c.drawString(MARGIN + 10, y - 23, heading)
        c.setFillColor(color(WHITE))
        c.setFont("SkySansBold", 8.5)
        c.drawRightString(MARGIN + 265, y - 23, body)
        y -= 36
    c.setFillColor(color(PINK))
    c.rect(MARGIN, 52, PAGE_W - 2 * MARGIN, 3, fill=1, stroke=0)
    c.setFillColor(color(MUTED))
    c.setFont("SkyMono", 7)
    c.drawString(MARGIN, 36, "VERTICAL ARCADE PROTOCOL // OFFICIAL MANUAL")
    c.showPage()


def draw_quick_start(c, data, page_no):
    page_base(c, data, page_no, data["start"])
    c.drawImage(optimized_image(str(ICON), 220), PAGE_W - 112, PAGE_H - 144, 70, 70, mask="auto")
    bullet_list(c, data["start_steps"], MARGIN, PAGE_H - 105, 395, leading=27)
    card(c, MARGIN, 555, PAGE_W - 2 * MARGIN, 104, "MISSION", data["intro"], PINK, 9.5)
    card(c, MARGIN, 430, 162, 120, "01 // ASCEND", data["start_steps"][1] + " " + data["start_steps"][2], CYAN)
    card(c, MARGIN + 174, 430, 162, 120, "02 // SURVIVE", data["start_steps"][3], PINK)
    card(c, MARGIN + 348, 430, 175, 120, "03 // UPGRADE", data["start_steps"][4], YELLOW)
    x, top, width, height = MARGIN, 285, PAGE_W - 2 * MARGIN, 154
    c.setFillColor(color(PANEL))
    c.setStrokeColor(color(CYAN))
    c.roundRect(x, top - height, width, height, 6, fill=1, stroke=1)
    c.setFillColor(color(CYAN))
    c.setFont("SkyMonoBold", 9)
    c.drawString(x + 11, top - 18, data["menu_title"])
    column_width = (width - 34) / 2
    for index, (button, body) in enumerate(data["menu_buttons"]):
        column = 0 if index < 4 else 1
        row = index if index < 4 else index - 4
        line_x = x + 11 + column * (column_width + 12)
        line_y = top - 42 - row * 27
        c.setFillColor(color(YELLOW if column == 0 else PINK))
        c.setFont("SkyMonoBold", 7.2)
        c.drawString(line_x, line_y, button)
        draw_wrapped(c, body, line_x, line_y - 11, column_width, size=6.7, leading=8, fill=MUTED, max_lines=2)
    c.showPage()


def draw_controls(c, data, page_no):
    page_base(c, data, page_no, data["controls"])
    draw_wrapped(c, data["controls_intro"], MARGIN, PAGE_H - 87, PAGE_W - 2 * MARGIN, size=9, leading=13, fill=MUTED)
    c.drawImage(optimized_image(str(GAME_SHOT), 360, True), MARGIN, 78, 190, 414, preserveAspectRatio=True, anchor="c")
    x, y, width = 245, PAGE_H - 112, PAGE_W - 245 - MARGIN
    for index, (button, heading, body) in enumerate(data["buttons"][:8]):
        accent = [CYAN, YELLOW, PINK][index % 3]
        c.setFillColor(color(PANEL))
        c.setStrokeColor(color(accent))
        c.roundRect(x, y - 55, width, 50, 5, fill=1, stroke=1)
        c.setFillColor(color(accent))
        c.setFont("SkyMonoBold", 8)
        c.drawString(x + 10, y - 23, button)
        c.setFillColor(color(WHITE))
        c.setFont("SkySansBold", 8.5)
        c.drawString(x + 100, y - 23, heading)
        draw_wrapped(c, body, x + 10, y - 39, width - 20, size=7.5, leading=10, fill=MUTED, max_lines=2)
        y -= 55
    c.showPage()


def draw_controls_more(c, data, page_no):
    page_base(c, data, page_no, data["controls"])
    draw_wrapped(c, "Start menu settings and desktop tools are described below." if data["file"].endswith("EN.pdf") else "Startmenü-Einstellungen und Desktop-Werkzeuge sind unten beschrieben.", MARGIN, PAGE_H - 87, PAGE_W - 2 * MARGIN, size=9, leading=13, fill=MUTED)
    x, y, width = MARGIN, PAGE_H - 120, PAGE_W - 2 * MARGIN
    for index, (button, heading, body) in enumerate(data["buttons"][8:]):
        accent = [PINK, CYAN, YELLOW][index % 3]
        c.setFillColor(color(PANEL))
        c.setStrokeColor(color(accent))
        c.roundRect(x, y - 70, width, 64, 5, fill=1, stroke=1)
        c.setFillColor(color(accent))
        c.setFont("SkyMonoBold", 8.5)
        c.drawString(x + 12, y - 25, button)
        c.setFillColor(color(WHITE))
        c.setFont("SkySansBold", 9)
        c.drawString(x + 142, y - 25, heading)
        draw_wrapped(c, body, x + 12, y - 43, width - 24, size=8, leading=10.5, fill=MUTED, max_lines=2)
        y -= 76
    c.showPage()


def draw_mobile_start_menu(c, data, page_no):
    page_base(c, data, page_no, data["mobile_menu"])
    draw_wrapped(c, data["mobile_menu_intro"], MARGIN, PAGE_H - 87, PAGE_W - 2 * MARGIN, size=9, leading=13, fill=MUTED)
    image_width, image_height = 190, 344
    left_x = 62
    right_x = PAGE_W - 62 - image_width
    image_y = 165
    c.drawImage(optimized_image(str(MOBILE_START_COMPACT_SHOT), 520, True), left_x, image_y, image_width, image_height, preserveAspectRatio=True, anchor="c")
    c.drawImage(optimized_image(str(MOBILE_START_OPTIONS_SHOT), 520, True), right_x, image_y, image_width, image_height, preserveAspectRatio=True, anchor="c")
    c.setFillColor(color(CYAN))
    c.setFont("SkyMonoBold", 8)
    c.drawCentredString(left_x + image_width / 2, image_y - 18, data["mobile_menu_closed"])
    c.setFillColor(color(PINK))
    c.drawCentredString(right_x + image_width / 2, image_y - 18, data["mobile_menu_open"])
    c.showPage()


def draw_cards_page(c, data, page_no, title, entries):
    page_base(c, data, page_no, title)
    width = (PAGE_W - 2 * MARGIN - 14) / 2
    y = PAGE_H - 92
    for index, (heading, body) in enumerate(entries):
        col = index % 2
        row = index // 2
        accent = [CYAN, PINK, YELLOW][index % 3]
        # Four compact rows fit above the footer for the system/settings pages.
        card(c, MARGIN + col * (width + 14), y - row * 160, width, 150, heading, body, accent, 8.5)
    c.showPage()


def draw_levels(c, data, page_no, title, levels):
    page_base(c, data, page_no, title)
    y = PAGE_H - 96
    for number, name, description in levels:
        accent = [CYAN, PINK, YELLOW][(number - 1) % 3]
        c.setFillColor(color(PANEL))
        c.setStrokeColor(color(accent))
        c.roundRect(MARGIN, y - 122, PAGE_W - 2 * MARGIN, 108, 6, fill=1, stroke=1)
        c.setFillColor(color(accent))
        c.setFont("SkyMonoBold", 24)
        c.drawString(MARGIN + 14, y - 53, f"{number:02d}")
        c.setFillColor(color(WHITE))
        c.setFont("SkySansBold", 13)
        c.drawString(MARGIN + 72, y - 36, name)
        draw_wrapped(c, description, MARGIN + 72, y - 57, PAGE_W - 2 * MARGIN - 90, size=9, leading=13, fill=MUTED)
        y -= 130
    c.showPage()


def draw_cheats(c, data, page_no):
    page_base(c, data, page_no, data["cheats"])
    y = draw_wrapped(c, data["cheat_intro"], MARGIN, PAGE_H - 92, PAGE_W - 2 * MARGIN, size=9.5, leading=14, fill=MUTED)
    y = bullet_list(c, data["cheat_steps"], MARGIN, y - 12, PAGE_W - 2 * MARGIN, leading=22)
    y -= 8
    compact = len(data["codes"]) > 4
    card_height = 62 if compact else 80
    card_step = card_height + 9
    for index, (name, code, body) in enumerate(data["codes"]):
        accent = [YELLOW, CYAN, PINK][index % 3]
        c.setFillColor(color(PANEL))
        c.setStrokeColor(color(accent))
        c.roundRect(MARGIN, y - card_height - 11, PAGE_W - 2 * MARGIN, card_height, 6, fill=1, stroke=1)
        c.setFillColor(color(accent))
        c.setFont("SkyMonoBold", 10)
        c.drawString(MARGIN + 12, y - (26 if compact else 31), name)
        c.setFont("SkyMonoBold", 9.5 if compact else 12)
        c.drawRightString(PAGE_W - MARGIN - 12, y - (26 if compact else 31), code)
        draw_wrapped(c, body, MARGIN + 12, y - (42 if compact else 53), PAGE_W - 2 * MARGIN - 24, size=7.5 if compact else 8.5, leading=10 if compact else 12, fill=WHITE, max_lines=2 if compact else None)
        y -= card_step
    c.drawImage(optimized_image(str(ICON), 220), MARGIN, 58, 60, 60, mask="auto")
    c.setFillColor(color(PANEL))
    c.setStrokeColor(color(PINK))
    c.roundRect(MARGIN + 76, 66, PAGE_W - 2 * MARGIN - 76, 44, 5, fill=1, stroke=1)
    c.setFillColor(color(PINK))
    c.setFont("SkyMonoBold", 9)
    c.drawCentredString(MARGIN + 76 + (PAGE_W - 2 * MARGIN - 76) / 2, 83, data["cheat_note"])
    c.showPage()


def build(lang):
    data = TEXT[lang]
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / data["file"]
    # ReportLab mutates image-reader state while writing a document. Do not
    # reuse those readers for the second language manual in the same process.
    optimized_image.cache_clear()
    c = canvas.Canvas(str(target), pagesize=A4, pageCompression=1)
    c.setTitle(f"Skybreak Protocol - {data['manual']}")
    c.setAuthor("Schrotty74")
    c.setSubject(f"Official Skybreak Protocol manual for version {VERSION}")
    draw_cover(c, data)
    draw_quick_start(c, data, 2)
    draw_controls(c, data, 3)
    draw_controls_more(c, data, 4)
    draw_mobile_start_menu(c, data, 5)
    draw_cards_page(c, data, 6, data["systems"], data["systems_cards"])
    draw_levels(c, data, 7, data["levels_a"], data["levels"][:5])
    draw_levels(c, data, 8, data["levels_b"], data["levels"][5:10])
    draw_levels(c, data, 9, data["levels_c"], data["levels"][10:])
    draw_cards_page(c, data, 10, data["settings"], data["settings_cards"])
    draw_cards_page(c, data, 11, data["upgrades"], data["upgrade_cards"])
    draw_cheats(c, data, 12)
    c.save()
    print(target)


if __name__ == "__main__":
    build("de")
    build("en")

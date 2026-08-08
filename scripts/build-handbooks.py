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
START_SHOT = ROOT / "docs" / "screenshots" / "mobile-start.jpeg"
GAME_SHOT = ROOT / "docs" / "screenshots" / "mobile-gameplay.jpeg"
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
        "intro": "Skybreak Protocol ist ein vertikales Cyberpunk-Arcade-Spiel. Jedes der zehn Levels ist ein vollständiger Aufstieg über 15 Etagen mit eigener Kulisse, Musik und Schwierigkeit. Durchbrich Plattformen, schalte Drohnen aus und erreiche den Sendeturm.",
        "facts": [("ZIEL", "Level 10 erreichen"), ("START", "3 Leben"), ("LEVEL", "10 Sektoren"), ("SPEICHERUNG", "Highscore und Einstellungen lokal")],
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
        ],
        "controls": "STEUERUNG UND BUTTONS",
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
            ("GRAPHICS", "Grafik", "Niedrig, Mittel, Hoch oder Ultra auswählen. Daneben 720p, 1080p oder 4K für die interne Renderauflösung wählen. FPS AN/AUS schaltet die lokale FPS-Anzeige."),
            ("RESOLUTION", "Auflösung", "iPhone 17 Pro: Ultra erreicht 60 FPS bei 1080p. 4K Ultra ist kein 60-FPS-Mobilmodus."),
            ("DIFFICULTY", "Schwierigkeit", "Leicht, Mittel oder Schwer wählen. Die Wahl wird in den nächsten Level übernommen."),
            ("TASTENBELEGUNG", "Desktop-Tasten", "Aktion anklicken und neue Taste drücken. Standard stellt A, D, SPACE und X wieder her."),
        ],
        "systems": "SPIELSYSTEME",
        "systems_cards": [
            ("PLATTFORMEN", "Neben stabilen und brüchigen Modulen gibt es bewegliche, vereiste, zeitweise phasenverschobene und Rift-Plattformen. Beschädigte Module lassen sich von unten oder mit dem Eispickel zerstören. Unsichtbare Phasenplattformen tragen nicht."),
            ("GEGNER & GEFAHREN", "Patrouille, Sprungangriff und Richtungswechsel bilden die drei Gegner-Archetypen; Schild-, Schützen- und Schwebegner ergänzen sie. Energiesplitter, Seitenlaser und Energiepulse kosten ein Leben. Von oben getroffene Drohnen werden ausgeschaltet."),
            ("TRUHEN", "Leicht: dauerhaft alle 2-3 Etagen. Mittel: ab der Hälfte 8 Sekunden sichtbar. Schwer: ab 2/3 nur 4,5 Sekunden und häufig versetzt. Schwere Truhen bleiben sichtbar und erscheinen bevorzugt auf Spielerhöhe oder darüber. Eine erschienene Truhe bleibt beim Zurückspringen aktiv."),
            ("ZIELE & EISPICKEL", "Je zwei Energiezellen oder Zugangsschalter müssen vor dem Levelziel aktiviert werden. Der Eispickel löst gegnerische Projektile auf und knackt Schilde. Ein erster Treffer friert einen normalen Gegner ein, der nächste schaltet ihn aus. Ab Kraft 4 entsteht kurz eine Eisbrücke."),
            ("WÄCHTER & LEVEL", "Jedes Level hat 15 Etagen, eigene Regeln, ein Eispickel-Grundmodell und einen Wächter. Dessen Schüsse unterscheiden sich je Level und werden bei der letzten Integritätsstufe schneller. Nach Sieg folgt die nächste Upgrade-Vorschau."),
            ("ABSCHLUSS & SIEG", "Nach jedem Levelziel zeigt der Roboter fünf Sekunden SKYBREAK DANCE vor Upgrade oder Finale. Beim kosmetischen Bikini-Avatar erscheint stattdessen eine levelabhängige Look-Präsentation. Nach Level 10 aktiviert sich der Sendeturm; Cheat-Läufe ändern den Rekord nicht."),
        ],
        "levels_a": "LEVEL 1 BIS 5",
        "levels_b": "LEVEL 6 BIS 10",
        "levels": [
            (1, "Neon Undercity", "Cyan-magenta Unterstadt mit Versorgungsschächten, Rohren, Regen und schnellen Magnetschwebebahnen. Regel: Aufstieg mit beweglichen Plattformen."),
            (2, "Chrome Bazaar", "Pink-mintfarbener Chrommarkt mit schwebenden Laternen, Marktständen und animierten Reklamen. Regel: Bruchzonen mit vielen fragilen Modulen."),
            (3, "Toxic Transit", "Giftgrüner Transittunnel mit Tunnelrippen, fahrenden Zugfenstern und aufsteigenden Gasblasen. Regel: Toxinwind drückt seitlich; vereiste Plattformen sind rutschig."),
            (4, "Crimson Firewall", "Rot-orange Sicherheitszone mit pulsierenden Datenwänden, Firewall-Säulen und fliegender Glut. Regel: Bruchzonen und horizontale Firewall-Laser."),
            (5, "Azure Data Sea", "Tiefblaues Datenmeer mit mehreren Wellenebenen, Blasen und leuchtenden Datenquallen. Regel: Datenströmung nach links und bewegliche Plattformen."),
            (6, "Violet Reactor", "Violetter Energiekern mit rotierenden Reaktorringen, Plasmabögen und instabilem Zentrum. Regel: Energiepulse und phasenverschobene Plattformen."),
            (7, "Solar Megagrid", "Bernsteinrotes Solarfeld mit großer Sonne, Hitzeschimmer und beweglichen Modulreihen. Regel: Solarsturm, Seitenlaser, Seitenwind, Eis und Bruchzonen."),
            (8, "Ghost Network", "Blass-cyanfarbene Netzruine mit flackernden Phantomknoten, Paketströmen und Glitches. Regel: Energiepulse, Phasenplattformen und Seitenwind."),
            (9, "Quantum Rift", "Violett-blaue Dimensionszone mit rotierender Singularität, Spiralarmen und verzogenen Sternspuren. Regel: Rift-Sprungfelder versetzen die Spielfigur."),
            (10, "Skybreak Apex", "Leuchtender Gipfel über Wolken mit Morgendämmerung, Sendestrahlen und Transmissionsturm. Regel: Apex-Aufstieg mit Bewegung, Seitenlaser und Seitenwind."),
        ],
        "settings": "EINSTELLUNGEN, AUDIO UND OFFLINE-MODUS",
        "settings_cards": [
            ("SCHWIERIGKEIT", "Leicht ist der Einstiegsmodus: 8 Leben, keine normalen Gegner, ein Pflichtziel, stabile Plattformen sowie kein Wind und keine Umweltgefahren. Der Wächter hat 1 Trefferpunkt und schießt langsamer. Mittel ist ausgewogen; Schwer erhöht Gegner, Gefahren und Punkte."),
            ("GRAFIK", "Auf einem iPhone 17 Pro erreicht Ultra bei 1080p 60 FPS. 4K Ultra ist kein 60-FPS-Mobilmodus. Ultra kann das Gerät dennoch erwärmen. Bei Hitze, Sonne oder Erwärmung Mittel oder Niedrig wählen."),
            ("MOBILE ULTRA", "60 FPS ist der sichere Standard. FPS AN/AUS schaltet die lokale Anzeige. Bis 120 FPS erhöht Wärme und Akkuverbrauch; der adaptive Wärmeschutz kann Effekte reduzieren."),
            ("AUDIO", "Jedes Level besitzt einen eigenen Track. MUSIC und SFX lassen sich vollständig getrennt schalten."),
            ("OFFLINE", "Das Release-ZIP entpacken und den Starter für macOS, Windows oder Linux öffnen. Alle zehn Musikstücke sind enthalten."),
            ("UPDATES", "Beim Start prüft das Spiel öffentliche GitHub-Releases. Nur die Update-Prüfung benötigt Internet; Spielstände bleiben lokal."),
        ],
        "upgrades": "UPGRADES UND LEISTUNGSANZEIGE",
        "upgrade_cards": [
            ("KRAFT 1 BIS 10", "Jede Kraftstufe erhöht die Reichweite um 8. P1-2 zerstört 1, P3-4 2, P5-6 3, P7-8 4 und P9-10 5 benachbarte Plattformmodule pro Schlag."),
            ("DESIGN 1 BIS 10", "Gold Kurve, Cyan Klinge, Pink Spitze, Grün Kurve, Orange Klinge, Violett Spitze, Eis Kurve, Lila Klinge, Weiß Spitze und Sonne Kurve. Die Vorschau nennt die nächste Stufe."),
            ("LEVEL-MODELLE", "Jedes Level verwendet unabhängig vom Design-Upgrade ein eigenes Eispickel-Grundmodell, eigene Gegner- und Wächterform sowie seine Farbwelt."),
            ("FPS AN/AUS", "Während einer Runde zeigt die mobile Kopfzeile FPS und mittlere Framezeit. Auf Desktop zeigt LIVE zusätzlich die CPU-Zeit für Spielaktualisierung und Zeichnen."),
            ("AUFLÖSUNG", "720p spart Leistung, 1080p ist der empfohlene Mobile-Ultra-Modus auf dem getesteten iPhone 17 Pro. 4K ist ein Qualitäts- und Screenshot-Modus."),
            ("FORTSCHRITT", "Erreichte Level werden lokal freigeschaltet. Im Startmenü ein freigeschaltetes Startlevel wählen; die Schwierigkeit wird beim nächsten Level übernommen."),
        ],
        "cheats": "GEHEIME CHEAT-CODES",
        "cheat_intro": "Cheats funktionieren mit Touch und Tastatur. Sie gelten nur für den aktuellen Lauf. Ein Lauf mit Cheat aktualisiert den lokalen Highscore nicht. Der Bikini-Avatar ist ein zusätzlicher Musik-Schalter-Cheat und benötigt keinen CHEAT-LINK.",
        "cheat_steps": [
            "Einen Lauf starten.",
            "Das SP-Symbol links oben fünfmal schnell antippen oder anklicken.",
            "Nach CHEAT-LINK BEREIT innerhalb von 10 Sekunden die Folge eingeben. Die Folge selbst muss innerhalb von 7 Sekunden erfolgen.",
            "Nach jedem Cheat muss das SP-Symbol erneut fünfmal aktiviert werden.",
        ],
        "codes": [
            ("UNSTERBLICH", "← → ← → JUMP PICK", "Blockiert Treffer und Stürze im aktuellen Level. Endet beim nächsten Level."),
            ("DOPPELSCHILD", "JUMP JUMP ← → PICK", "Gewährt sofort zwei Schildladungen."),
            ("30-S-OVERDRIVE", "PICK JUMP PICK JUMP ← →", "Maximale Eispickel-Verstärkung für 30 Sekunden."),
            ("EXTRALEBEN", "← ← → → JUMP PICK", "Gibt ein zusätzliches Leben, maximal neun Leben."),
            ("BIKINI-AVATAR", "MUSIC AUS/AN ×2", "Während eines aktiven Laufs MUSIC innerhalb von 5 Sekunden zweimal aus- und wieder einschalten. Rein kosmetisch, nur für den Lauf; zeigt eine Bestätigung und levelabhängige Look-Präsentationen."),
        ],
        "cheat_note": "CHEAT-LAUF // NUR LOKAL // KEIN HIGHSCORE-EINTRAG",
        "footer": "Skybreak Protocol // Handbuch DE",
    },
    "en": {
        "file": "Skybreak-Protocol-Manual-EN.pdf",
        "manual": "GAME MANUAL",
        "subtitle": "Ascent, controls, systems, levels, and cheat codes",
        "edition": f"VERSION {VERSION} // ENGLISH",
        "intro": "Skybreak Protocol is a vertical cyberpunk arcade game. Each of the ten levels is a complete 15-floor ascent with its own scenery, music, and difficulty. Break platforms, disable drones, and reach the transmission tower.",
        "facts": [("GOAL", "Reach level 10"), ("START", "3 lives"), ("LEVELS", "10 sectors"), ("STORAGE", "Local high score and settings")],
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
        ],
        "controls": "CONTROLS AND BUTTONS",
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
            ("GRAPHICS", "Graphics", "Select Low, Medium, High, or Ultra. Next to it, select 720p, 1080p, or 4K for the internal render resolution. FPS ON/OFF toggles the local FPS display."),
            ("RESOLUTION", "Resolution", "iPhone 17 Pro: Ultra reaches 60 FPS at 1080p. 4K Ultra is not a 60 FPS mobile mode."),
            ("DIFFICULTY", "Difficulty", "Select Easy, Medium, or Hard. The choice carries into the next level."),
            ("KEY BINDINGS", "Desktop keys", "Select an action and press a new key. Reset restores A, D, SPACE, and X."),
        ],
        "systems": "GAME SYSTEMS",
        "systems_cards": [
            ("PLATFORMS", "Alongside stable and fragile modules, there are moving, icy, temporarily phased, and rift platforms. Damaged modules can be destroyed from below or with the ice pick. Invisible phase platforms do not support the robot."),
            ("ENEMIES & HAZARDS", "Patrol, leap attack, and direction change form the three enemy archetypes; shield, shooter, and hover enemies add roles. Energy fragments, side lasers, and energy pulses cost a life. Landing on a drone disables it."),
            ("CHESTS", "Easy: persistent every 2-3 floors. Medium: available after halfway for 8 seconds. Hard: only after two thirds for 4.5 seconds and frequently relocated. Hard chests stay in view and prefer the player's height or above. An active chest stays active while backtracking."),
            ("OBJECTIVES & ICE PICK", "Two energy cells or access switches must be activated before the level goal. The ice pick dissolves enemy projectiles and breaks shields. A first hit freezes a normal enemy; the next disables it. From power 4, it briefly creates an ice bridge."),
            ("GUARDIANS & LEVELS", "Each level has 15 floors, unique rules, an ice-pick base model, and a guardian. Its shots vary by level and become faster at the final integrity stage. The next upgrade preview follows a win."),
            ("COMPLETION & VICTORY", "After every level goal, the robot shows SKYBREAK DANCE for five seconds before the upgrade or finale. The cosmetic bikini avatar instead shows a level-specific look presentation. After level 10, the tower activates; cheat runs do not change the record."),
        ],
        "levels_a": "LEVELS 1 TO 5",
        "levels_b": "LEVELS 6 TO 10",
        "levels": [
            (1, "Neon Undercity", "Cyan-magenta depths with service shafts, pipes, rain, and fast maglev traffic. Rule: ascent with moving platforms."),
            (2, "Chrome Bazaar", "Pink-mint chrome market with floating lanterns, stalls, and animated advertising. Rule: fracture zones with many fragile modules."),
            (3, "Toxic Transit", "Toxic-green tunnel with structural ribs, moving train windows, and rising gas bubbles. Rule: toxic draft pushes sideways; icy platforms are slippery."),
            (4, "Crimson Firewall", "Red-orange security zone with pulsing data walls, firewall columns, and flying embers. Rule: fracture zones and horizontal firewall lasers."),
            (5, "Azure Data Sea", "Deep-blue data sea with layered waves, bubbles, and luminous data jellyfish. Rule: data current to the left and moving platforms."),
            (6, "Violet Reactor", "Violet energy core with rotating reactor rings, plasma arcs, and an unstable center. Rule: energy pulses and phased platforms."),
            (7, "Solar Megagrid", "Amber-red solar field with a blazing sun, heat shimmer, and moving panel arrays. Rule: solar storm, side lasers, side draft, ice, and fracture zones."),
            (8, "Ghost Network", "Pale-cyan network ruins with flickering phantom nodes, packet streams, and glitches. Rule: energy pulses, phased platforms, and side draft."),
            (9, "Quantum Rift", "Purple-blue dimension with a rotating singularity, spiral arms, and warped star trails. Rule: rift jump fields reposition the robot."),
            (10, "Skybreak Apex", "Bright summit above the clouds with dawn light, transmission rays, and the final tower. Rule: apex ascent with movement, side lasers, and side draft."),
        ],
        "settings": "SETTINGS, AUDIO, AND OFFLINE MODE",
        "settings_cards": [
            ("DIFFICULTY", "Easy is the onboarding mode: 8 lives, no regular enemies, one required objective, stable platforms, and no drafts or environmental hazards. The guardian has 1 hit point and fires more slowly. Medium is balanced; Hard increases enemies, hazards, and points."),
            ("GRAPHICS", "On an iPhone 17 Pro, Ultra reaches 60 FPS at 1080p. 4K Ultra is not a 60 FPS mobile mode. Ultra can still warm the device. In heat, sunlight, or when warm, choose Medium or Low."),
            ("MOBILE ULTRA", "60 FPS is the safer default. FPS ON/OFF toggles the local display. Up to 120 FPS increases heat and battery use; adaptive thermal protection can reduce effects."),
            ("AUDIO", "Every level has its own track. MUSIC and SFX are completely independent."),
            ("OFFLINE", "Extract the release ZIP and open the starter for macOS, Windows, or Linux. All ten music tracks are included."),
            ("UPDATES", "On startup, the game checks public GitHub releases. Only the update check needs internet; game data remains local."),
        ],
        "upgrades": "UPGRADES AND PERFORMANCE DISPLAY",
        "upgrade_cards": [
            ("POWER 1 TO 10", "Every power level adds 8 reach. P1-2 breaks 1, P3-4 2, P5-6 3, P7-8 4, and P9-10 5 adjacent platform modules per strike."),
            ("STYLE 1 TO 10", "Gold Curve, Cyan Blade, Pink Spike, Green Curve, Orange Blade, Violet Spike, Ice Curve, Lilac Blade, White Spike, and Sun Curve. The preview names the next level."),
            ("LEVEL MODELS", "Independently from the style upgrade, every level uses its own ice-pick base model, enemy and guardian form, and color world."),
            ("FPS ON/OFF", "During a run, the mobile header shows FPS and average frame time. On desktop, LIVE also shows CPU time for updating and drawing the game."),
            ("RESOLUTION", "720p saves performance, 1080p is the recommended Mobile Ultra mode on the tested iPhone 17 Pro. 4K is a quality and screenshot mode."),
            ("PROGRESS", "Completed levels unlock locally. Choose an unlocked start level from the start menu; difficulty carries into the next level."),
        ],
        "cheats": "SECRET CHEAT CODES",
        "cheat_intro": "Cheats work with touch and keyboard. They apply only to the current run. A run using a cheat does not update the local high score. The bikini avatar is an additional music-toggle cheat and needs no CHEAT LINK.",
        "cheat_steps": [
            "Start a run.",
            "Quickly tap or click the SP symbol at the top left five times.",
            "After CHEAT LINK READY appears, enter the sequence within 10 seconds. The sequence itself must be completed within 7 seconds.",
            "Activate the SP symbol five times again before using another cheat.",
        ],
        "codes": [
            ("IMMORTAL", "← → ← → JUMP PICK", "Blocks hits and falls in the current level. Ends at the next level."),
            ("DOUBLE SHIELD", "JUMP JUMP ← → PICK", "Immediately grants two shield charges."),
            ("30-S OVERDRIVE", "PICK JUMP PICK JUMP ← →", "Maximum ice-pick enhancement for 30 seconds."),
            ("EXTRA LIFE", "← ← → → JUMP PICK", "Adds one life, up to a maximum of nine."),
            ("BIKINI AVATAR", "MUSIC OFF/ON ×2", "During an active run, switch MUSIC off and on twice within 5 seconds. Cosmetic only and only for that run; shows a confirmation and level-specific look presentations."),
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
    c.drawImage(optimized_image(str(START_SHOT), 360, True), PAGE_W - 220, PAGE_H - 565, 170, 370, preserveAspectRatio=True, anchor="c")
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
    for index, (button, heading, body) in enumerate(data["buttons"]):
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


def draw_cards_page(c, data, page_no, title, entries):
    page_base(c, data, page_no, title)
    width = (PAGE_W - 2 * MARGIN - 14) / 2
    y = PAGE_H - 92
    for index, (heading, body) in enumerate(entries):
        col = index % 2
        row = index // 2
        accent = [CYAN, PINK, YELLOW][index % 3]
        card(c, MARGIN + col * (width + 14), y - row * 205, width, 188, heading, body, accent, 9)
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
    draw_cards_page(c, data, 4, data["systems"], data["systems_cards"])
    draw_levels(c, data, 5, data["levels_a"], data["levels"][:5])
    draw_levels(c, data, 6, data["levels_b"], data["levels"][5:])
    draw_cards_page(c, data, 7, data["settings"], data["settings_cards"])
    draw_cards_page(c, data, 8, data["upgrades"], data["upgrade_cards"])
    draw_cheats(c, data, 9)
    c.save()
    print(target)


if __name__ == "__main__":
    build("de")
    build("en")

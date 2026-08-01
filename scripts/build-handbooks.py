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
            ("START / TRY AGAIN", "Startet einen neuen Lauf."),
            ("CHANGELOG", "Öffnet die Änderungen der aktuellen Version."),
            ("DEUTSCH / ENGLISH", "Wechselt die Sprache der Spielseite."),
            ("POWER / STYLE", "Wählt beim Levelwechsel das Eispickel-Upgrade."),
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
            ("FULLSCREEN", "Vollbild", "Vollbild starten; auf iPhone erklärt APP-MODUS die Installation."),
            ("PAUSE", "Pause", "Spiel anhalten oder fortsetzen. Tastatur: P oder Esc."),
            ("GRAPHICS", "Grafik", "Niedrig, Mittel, Hoch oder Ultra auswählen. Daneben 720p, 1080p oder 4K für die interne Renderauflösung wählen."),
            ("RESOLUTION", "Auflösung", "720p spart Leistung, 1080p ist der Standard, 4K nutzt bei passenden Desktop-Displays die höchste interne Rendergröße."),
            ("DIFFICULTY", "Schwierigkeit", "Leicht, Mittel oder Schwer für jedes Level getrennt."),
            ("TASTENBELEGUNG", "Desktop-Tasten", "Aktion anklicken und neue Taste drücken. Standard stellt A, D, SPACE und X wieder her."),
        ],
        "systems": "SPIELSYSTEME",
        "systems_cards": [
            ("PLATTFORMEN", "Jedes Level besitzt eine eigene Blockform und ein eigenes Material: Kryostahl, Chrom-Eis, Korrosionseis, Schmelzglas, Tiefeneis, Plasmakristall, Solarfelder, Phaseneis, Riftkristall oder Apex-Eis. Beschädigte Module lassen sich von unten oder mit dem Eispickel zerstören."),
            ("GEGNER & GEFAHREN", "Patrouillendrohnen und fallende Energiesplitter kosten ein Leben. Von oben getroffene Drohnen werden ausgeschaltet."),
            ("TRUHEN", "Leicht: dauerhaft alle 2-3 Etagen. Mittel: ab der Hälfte 8 Sekunden sichtbar. Schwer: ab 2/3 nur 4,5 Sekunden und häufig versetzt, auch nach unten."),
            ("POWER-UPS", "Schutzschild, Extraleben, Punktebonus oder 12 Sekunden Eispickel-Overdrive. Ein Schild kann bis zu zwei Ladungen tragen."),
            ("UPGRADES & LEVEL", "Jedes Level hat 15 Etagen, eine gleichbleibende Welt und eine Wächterdrohne am Ende. Nach deren Ausschaltung erscheint die Vorschau des nächsten Sektors; dann Kraft oder Design wählen."),
            ("PUNKTE, SCHÄDEN & SIEG", "Schwer erhöht den Multiplikator. Treffer hinterlassen Risse, Funken und Sensorflackern. Nach Level 10 aktiviert sich der Sendeturm bei Sonnenaufgang. Cheat-Läufe ändern den Rekord nicht."),
        ],
        "levels_a": "LEVEL 1 BIS 5",
        "levels_b": "LEVEL 6 BIS 10",
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
        ],
        "settings": "EINSTELLUNGEN, AUDIO UND OFFLINE-MODUS",
        "settings_cards": [
            ("SCHWIERIGKEIT", "Leicht reduziert Tempo und Gefahren, Mittel ist ausgewogen, Schwer erhöht Gegner, Gefahren und Punkte. Pro Level separat wählbar."),
            ("GRAFIK", "Mittel wird am Smartphone empfohlen. Ultra zeigt dichten Regen, Lichtkegel, Neon-Bloom und Plattformreflexionen, kann das Gerät aber stark erwärmen. Bei Hitze oder direkter Sonne nicht verwenden."),
            ("MOBILE ULTRA", "60 FPS ist der sichere Standard. Bis 120 FPS erhöht Wärme und Akkuverbrauch; der adaptive Wärmeschutz kann Effekte reduzieren."),
            ("AUDIO", "Jedes Level besitzt einen eigenen Track. MUSIC und SFX lassen sich vollständig getrennt schalten."),
            ("OFFLINE", "Das Release-ZIP entpacken und den Starter für macOS, Windows oder Linux öffnen. Alle zehn Musikstücke sind enthalten."),
            ("UPDATES", "Beim Start prüft das Spiel öffentliche GitHub-Releases. Nur die Update-Prüfung benötigt Internet; Spielstände bleiben lokal."),
        ],
        "cheats": "GEHEIME CHEAT-CODES",
        "cheat_intro": "Cheats funktionieren mit Touch und Tastatur. Sie gelten nur für den aktuellen Lauf. Ein Lauf mit Cheat aktualisiert den lokalen Highscore nicht.",
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
            ("START / TRY AGAIN", "Starts a new run."),
            ("CHANGELOG", "Opens the changes for the current version."),
            ("DEUTSCH / ENGLISH", "Switches the language of the game page."),
            ("POWER / STYLE", "Selects the ice-pick upgrade at a level transition."),
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
            ("FULLSCREEN", "Fullscreen", "Enter fullscreen; on iPhone, APP MODE explains installation."),
            ("PAUSE", "Pause", "Pause or resume the game. Keyboard: P or Esc."),
            ("GRAPHICS", "Graphics", "Select Low, Medium, High, or Ultra. Next to it, select 720p, 1080p, or 4K for the internal render resolution."),
            ("RESOLUTION", "Resolution", "720p saves performance, 1080p is the default, and 4K uses the highest internal render size on suitable desktop displays."),
            ("DIFFICULTY", "Difficulty", "Select Easy, Medium, or Hard separately for every level."),
            ("KEY BINDINGS", "Desktop keys", "Select an action and press a new key. Reset restores A, D, SPACE, and X."),
        ],
        "systems": "GAME SYSTEMS",
        "systems_cards": [
            ("PLATFORMS", "Every level has its own block shape and material: cryo steel, chrome ice, corroded ice, molten glass, deep ice, plasma crystal, solar arrays, phase ice, rift crystal, or apex ice. Damaged modules can be destroyed from below or with the ice pick."),
            ("ENEMIES & HAZARDS", "Patrol drones and falling energy fragments cost a life. Landing on a drone disables it."),
            ("CHESTS", "Easy: persistent every 2-3 floors. Medium: available after halfway for 8 seconds. Hard: only after two thirds for 4.5 seconds and frequently relocated, including below."),
            ("POWER-UPS", "Shield, extra life, score bonus, or 12 seconds of ice-pick overdrive. The shield can hold up to two charges."),
            ("UPGRADES & LEVELS", "Each level has 15 floors, one consistent world, and a guardian drone at the end. After disabling it, the next sector preview appears; then choose power or style."),
            ("SCORING, DAMAGE & VICTORY", "Hard increases the multiplier. Hits leave cracks, sparks, and sensor flicker. After level 10, the tower activates at sunrise. Cheat runs do not change the record."),
        ],
        "levels_a": "LEVELS 1 TO 5",
        "levels_b": "LEVELS 6 TO 10",
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
        ],
        "settings": "SETTINGS, AUDIO, AND OFFLINE MODE",
        "settings_cards": [
            ("DIFFICULTY", "Easy lowers pace and hazards, Medium is balanced, and Hard increases enemies, hazards, and points. Set per level."),
            ("GRAPHICS", "Medium is recommended on phones. Ultra shows dense rain, light shafts, neon bloom, and platform reflections, but can make the device very warm. Avoid it in heat or direct sunlight."),
            ("MOBILE ULTRA", "60 FPS is the safer default. Up to 120 FPS increases heat and battery use; adaptive thermal protection can reduce effects."),
            ("AUDIO", "Every level has its own track. MUSIC and SFX are completely independent."),
            ("OFFLINE", "Extract the release ZIP and open the starter for macOS, Windows, or Linux. All ten music tracks are included."),
            ("UPDATES", "On startup, the game checks public GitHub releases. Only the update check needs internet; game data remains local."),
        ],
        "cheats": "SECRET CHEAT CODES",
        "cheat_intro": "Cheats work with touch and keyboard. They apply only to the current run. A run using a cheat does not update the local high score.",
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
        c.roundRect(x, y - 60, width, 53, 5, fill=1, stroke=1)
        c.setFillColor(color(accent))
        c.setFont("SkyMonoBold", 8)
        c.drawString(x + 10, y - 23, button)
        c.setFillColor(color(WHITE))
        c.setFont("SkySansBold", 8.5)
        c.drawString(x + 100, y - 23, heading)
        draw_wrapped(c, body, x + 10, y - 39, width - 20, size=7.5, leading=10, fill=MUTED, max_lines=2)
        y -= 61
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
    for index, (name, code, body) in enumerate(data["codes"]):
        accent = [YELLOW, CYAN, PINK, YELLOW][index]
        c.setFillColor(color(PANEL))
        c.setStrokeColor(color(accent))
        c.roundRect(MARGIN, y - 91, PAGE_W - 2 * MARGIN, 80, 6, fill=1, stroke=1)
        c.setFillColor(color(accent))
        c.setFont("SkyMonoBold", 10)
        c.drawString(MARGIN + 12, y - 31, name)
        c.setFont("SkyMonoBold", 12)
        c.drawRightString(PAGE_W - MARGIN - 12, y - 31, code)
        draw_wrapped(c, body, MARGIN + 12, y - 53, PAGE_W - 2 * MARGIN - 24, size=8.5, leading=12, fill=WHITE)
        y -= 89
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
    draw_cheats(c, data, 8)
    c.save()
    print(target)


if __name__ == "__main__":
    build("de")
    build("en")

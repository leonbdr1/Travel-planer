import os
import re
import subprocess
import time
import sys
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


# ==========================================
# ⚙️ KONFIGURATION
# ==========================================

RATE_LIMIT_FALLBACK_HOURS = 4
SHORT_PAUSE_BETWEEN_TASKS = 5

STARTPROMPT_FILE = "startprompt.txt"
STARTPROMPT_USED_MARKER = "--- STARTPROMPT GENUTZT ---"

# Auto-Compact
AUTOCOMPACT_PERCENT = "35"

# Ab diesem Wert der WÖCHENTLICHEN Nutzung automatisch pausieren
WEEKLY_USAGE_PAUSE_PERCENT = 80

# Prüfintervall für PAUSE PYTHON / START PYTHON
PAUSE_CHECK_INTERVAL = 5


# ==========================================
# 📁 REPOSITORY
# ==========================================

def get_repo_root():
    """
    Ermittelt das Root-Verzeichnis des Git-Repositories,
    in dem diese Python-Datei liegt.
    """

    script_dir = Path(__file__).resolve().parent

    try:
        result = subprocess.run(
            ["git", "-C", str(script_dir), "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True
        )

        return Path(result.stdout.strip()).resolve()

    except Exception:
        return script_dir


def get_repo_name(repo_root):
    """Ermittelt den Repository-Namen."""

    return repo_root.name


# ==========================================
# ⏸️ PYTHON-PAUSE-STEUERUNG
# ==========================================

def get_control_file(repo_root):
    """
    Steuerdatei für den Python-Agenten.

    Die Datei liegt außerhalb des Repositories,
    damit sie keine Git-Änderung erzeugt.
    """

    repo_hash = __import__("hashlib").sha256(
        str(repo_root).encode("utf-8")
    ).hexdigest()[:12]

    control_dir = (
        Path.home()
        / ".claude"
        / "python-agent-controls"
    )

    control_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    return control_dir / f"{repo_hash}.paused"


def is_python_paused(repo_root):
    """Prüft, ob der Python-Agent pausiert ist."""

    return get_control_file(repo_root).exists()


def set_python_paused(repo_root, reason="MANUELL"):
    """Aktiviert den PAUSE-Zustand."""

    control_file = get_control_file(repo_root)

    try:
        timestamp = datetime.now().astimezone().strftime(
            "%Y-%m-%d %H:%M:%S %z"
        )

        control_file.write_text(
            f"PAUSED\n"
            f"Reason: {reason}\n"
            f"Date: {timestamp}\n",
            encoding="utf-8"
        )

        return True

    except Exception as exc:

        print(
            f"⚠️ Python-Pause konnte nicht gesetzt werden: {exc}"
        )

        return False


def wait_while_python_paused(repo_root):
    """
    Wartet, solange PAUSE PYTHON aktiv ist.

    Es werden keine neuen automatischen Claude-Prompts
    gestartet.
    """

    if not is_python_paused(repo_root):
        return

    print("\n" + "=" * 60)
    print("⏸️ PYTHON-AGENT PAUSIERT")
    print("=" * 60)

    print(
        "📱 Schreibe im Claude-App-Chat "
        "'START PYTHON', um fortzufahren."
    )

    while is_python_paused(repo_root):

        time.sleep(
            PAUSE_CHECK_INTERVAL
        )

    print(
        "\n▶️ START PYTHON erkannt."
    )

    print(
        "🚀 Automatische Weiterarbeit wird fortgesetzt."
    )


# ==========================================
# 📝 STARTPROMPT
# ==========================================

def load_startprompt(repo_root):
    """
    Liest den letzten ungenutzten Startprompt.

    Alles vor dem letzten GENUTZT-Marker gehört zur Historie.
    """

    prompt_path = repo_root / STARTPROMPT_FILE

    if not prompt_path.exists():

        print(
            f"ℹ️ Keine {STARTPROMPT_FILE} gefunden."
        )

        return None

    try:

        content = prompt_path.read_text(
            encoding="utf-8"
        )

    except Exception as exc:

        print(
            f"❌ {STARTPROMPT_FILE} konnte nicht gelesen werden: "
            f"{exc}"
        )

        return None

    marker_position = content.rfind(
        STARTPROMPT_USED_MARKER
    )

    if marker_position != -1:

        after_marker = content[
            marker_position + len(
                STARTPROMPT_USED_MARKER
            ):
        ]

        lines = after_marker.splitlines()

        new_prompt_lines = []

        for line in lines:

            stripped = line.strip()

            if stripped.startswith("Datum:"):
                continue

            if stripped.startswith("Status:"):
                continue

            new_prompt_lines.append(line)

        prompt = "\n".join(
            new_prompt_lines
        ).strip()

    else:

        prompt = content.strip()

    if not prompt:

        print(
            f"ℹ️ In {STARTPROMPT_FILE} wurde kein neuer "
            f"ungenutzter Startprompt gefunden."
        )

        return None

    return prompt


def mark_startprompt_as_used(repo_root):
    """Markiert den aktuell verwendeten Startprompt."""

    prompt_path = repo_root / STARTPROMPT_FILE

    timestamp = datetime.now().astimezone().strftime(
        "%Y-%m-%d %H:%M:%S %z"
    )

    marker = (
        "\n\n"
        + STARTPROMPT_USED_MARKER
        + "\n"
        + f"Datum: {timestamp}\n"
        + "Status: GENUTZT\n"
    )

    try:

        with prompt_path.open(
            "a",
            encoding="utf-8"
        ) as file:

            file.write(marker)

        print(
            f"✅ Startprompt als genutzt markiert "
            f"({timestamp})."
        )

        return True

    except Exception as exc:

        print(
            f"⚠️ Startprompt konnte nicht markiert werden: "
            f"{exc}"
        )

        return False


# ==========================================
# 📄 MARKDOWN-DATEIEN
# ==========================================

def find_project_markdowns(repo_root):
    """Sucht rekursiv nach Markdown-Dateien."""

    markdown_files = []

    for root, dirs, files in os.walk(repo_root):

        dirs[:] = [
            directory
            for directory in dirs
            if not directory.startswith(".")
        ]

        for file in files:

            if file.endswith(".md"):

                full_path = Path(root) / file

                try:

                    relative_path = full_path.relative_to(
                        repo_root
                    )

                    markdown_files.append(
                        relative_path.as_posix()
                    )

                except ValueError:
                    pass

    markdown_files.sort()

    return markdown_files


# ==========================================
# 🎛️ START-ABFRAGE (Modell, Level, Prompt)
# ==========================================

MODEL_CHOICES = [
    ("Fable 5.1", "claude-fable-5-1"),
    ("Opus 5.5", "claude-opus-5-5"),
    ("Sonnet 5.5", "claude-sonnet-5-5"),
    ("Haiku 4.5", "claude-haiku-4-5-20251001"),
]

EFFORT_CHOICES = ["low", "medium", "high", "xhigh", "max"]

# Werden beim Start durch die Abfrage gesetzt (None = Claude-Standard)
SELECTED_MODEL = None
SELECTED_EFFORT = None


def ask_choice(title, options):
    """Zeigt ein nummeriertes Menü. Enter = Standard (None)."""

    print(f"\n{title}")

    for index, label in enumerate(options, start=1):
        print(f"  {index}) {label}")

    print("  Enter) Standard von Claude")

    while True:

        answer = input("> ").strip()

        if not answer:
            return None

        if answer.isdigit() and 1 <= int(answer) <= len(options):
            return int(answer) - 1

        print("❌ Ungültige Eingabe.")


def ask_multiline_prompt():
    """Liest einen mehrzeiligen Prompt bis 'ENDE' (oder Strg + D)."""

    print(
        "\n📝 Prompt eingeben "
        "(mehrzeilig möglich, Abschluss: Zeile 'ENDE'; "
        "leer lassen = startprompt.txt verwenden):"
    )

    lines = []

    while True:

        try:
            line = input()

        except EOFError:
            break

        if line.strip() == "ENDE":
            break

        lines.append(line)

    return "\n".join(lines).strip()


def ask_startup_settings():
    """Fragt Modell, Reasoning-Stufe und Prompt ab."""

    global SELECTED_MODEL, SELECTED_EFFORT

    model_index = ask_choice(
        "🧠 Modell wählen:",
        [name for name, _ in MODEL_CHOICES]
    )

    if model_index is not None:
        SELECTED_MODEL = MODEL_CHOICES[model_index][1]

    effort_index = ask_choice(
        "⚡ Reasoning-Stufe wählen:",
        EFFORT_CHOICES
    )

    if effort_index is not None:
        SELECTED_EFFORT = EFFORT_CHOICES[effort_index]

    print(
        f"\n✅ Modell: {SELECTED_MODEL or 'Standard'} | "
        f"Level: {SELECTED_EFFORT or 'Standard'}"
    )

    return ask_multiline_prompt()


def build_claude_command(session_name, prompt):
    """Baut den Claude-Aufruf im Remote-Control-Modus."""

    command = ["claude", "--rc", session_name]

    if SELECTED_MODEL:
        command += ["--model", SELECTED_MODEL]

    if SELECTED_EFFORT:
        command += ["--effort", SELECTED_EFFORT]

    command += ["-p", prompt]

    return command


# ==========================================
# 🤖 CLAUDE-UMGEBUNG
# ==========================================

def get_claude_environment():
    """
    Setzt die automatische Compaction-Schwelle.
    """

    env = os.environ.copy()

    env[
        "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"
    ] = AUTOCOMPACT_PERCENT

    return env


# ==========================================
# 🤖 CLAUDE AUSFÜHREN
# ==========================================

def run_claude(command, repo_root):
    """
    Startet Claude und streamt die Ausgabe live.
    """

    process = None
    output_lines = []

    try:

        process = subprocess.Popen(
            command,
            cwd=repo_root,
            env=get_claude_environment(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in iter(
            process.stdout.readline,
            ""
        ):

            print(
                line,
                end=""
            )

            output_lines.append(line)

        process.stdout.close()

        returncode = process.wait()

        return (
            "".join(output_lines),
            returncode
        )

    except KeyboardInterrupt:

        print(
            "\n\n🛑 Claude-Prozess wird beendet..."
        )

        if process is not None:

            try:

                process.terminate()
                process.wait(timeout=5)

            except subprocess.TimeoutExpired:

                process.kill()
                process.wait()

        raise

    except FileNotFoundError:

        print(
            "\n❌ Der Befehl 'claude' wurde nicht gefunden."
        )

        return "", -1


# ==========================================
# 📊 WOCHENNUTZUNG ERKENNEN
# ==========================================

def get_weekly_usage_percent(output):
    """
    Erkennt die wöchentliche Nutzung aus Claude-Ausgaben.

    Unterstützte Beispiele:

    You've used 80% of your weekly limit

    You've used 85% of your weekly limit

    92% of your weekly limit
    """

    patterns = [
        r"you['’]ve\s+used\s+(\d+(?:\.\d+)?)%\s+of\s+your\s+weekly\s+limit",
        r"(\d+(?:\.\d+)?)%\s+of\s+your\s+weekly\s+limit",
        r"weekly\s+limit[^\n%]{0,80}?(\d+(?:\.\d+)?)%"
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            output,
            re.IGNORECASE
        )

        if matches:

            try:
                return float(matches[-1])

            except ValueError:
                pass

    return None


def notify_weekly_pause_in_claude(
    repo_root,
    session_name,
    weekly_percent
):
    """
    Schickt eine letzte Nachricht in die gleiche
    Claude-Remote-Control-Session, damit die automatische
    Pause auch im Claude-App-Chat sichtbar ist.
    """

    pause_prompt = f"""
AUTOMATISCHE SYSTEMMELDUNG:

Die wöchentliche Claude-Nutzung hat
{weekly_percent:.0f}% erreicht.

Der externe Python-Agent wurde deshalb automatisch pausiert.

Gib dem Benutzer jetzt diese Information kurz und deutlich
im Chat aus:

"⏸️ Python-Agent automatisch pausiert.
Wöchentliche Claude-Nutzung: {weekly_percent:.0f}%.
Schreibe START PYTHON, sobald die automatische Weiterarbeit
wieder beginnen soll."

WICHTIG:
- Keine weiteren Projektaufgaben bearbeiten.
- Keine neuen Aufgaben starten.
- Dies ist nur eine Statusmeldung für den Benutzer.
"""

    try:

        run_claude(
            build_claude_command(
                session_name,
                pause_prompt
            ),
            repo_root
        )

    except Exception as exc:

        print(
            f"⚠️ Statusmeldung konnte nicht an Claude gesendet werden: "
            f"{exc}"
        )


def check_and_handle_weekly_usage(
    output,
    repo_root,
    session_name
):
    """
    Prüft die Ausgabe auf mindestens 80 % Wochenverbrauch.

    Bei >= 80 %:
    - Python wird pausiert.
    - Status wird in derselben Claude-Session gepostet.
    """

    weekly_percent = get_weekly_usage_percent(
        output
    )

    if weekly_percent is None:
        return False

    print(
        f"\n📊 Erkannte wöchentliche Claude-Nutzung: "
        f"{weekly_percent:.0f}%"
    )

    if weekly_percent < WEEKLY_USAGE_PAUSE_PERCENT:
        return False

    if is_python_paused(repo_root):
        return True

    print(
        f"\n⚠️ Wöchentliche Nutzung hat "
        f"{weekly_percent:.0f}% erreicht."
    )

    print(
        "⏸️ Python-Agent wird automatisch pausiert."
    )

    set_python_paused(
        repo_root,
        reason=f"WEEKLY_USAGE_{weekly_percent:.0f}%"
    )

    notify_weekly_pause_in_claude(
        repo_root,
        session_name,
        weekly_percent
    )

    print(
        "\n📱 Statusmeldung wurde an die "
        "Remote-Control-Session gesendet."
    )

    return True


# ==========================================
# ⏳ RATE LIMIT
# ==========================================

def is_rate_limit(output):
    """Erkennt Claude-Rate-/Usage-/Session-Limits."""

    output_lower = output.lower()

    markers = [
        "5-hour limit reached",
        "rate limit",
        "usage limit",
        "you've hit your session limit",
        "you have hit your session limit",
        "session limit",
        "you've hit your usage limit",
        "you have hit your usage limit"
    ]

    return any(
        marker in output_lower
        for marker in markers
    )


def get_rate_limit_reset_time(output):
    """
    Liest z. B.:

    You've hit your session limit · resets 12:40am (Europe/Berlin)
    """

    match = re.search(
        r"resets\s+(\d{1,2}):(\d{2})\s*(am|pm)",
        output,
        re.IGNORECASE
    )

    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2))
    am_pm = match.group(3).lower()

    if am_pm == "pm" and hour != 12:
        hour += 12

    elif am_pm == "am" and hour == 12:
        hour = 0

    timezone_match = re.search(
        r"\(([^)]+)\)",
        output
    )

    timezone_name = (
        timezone_match.group(1).strip()
        if timezone_match
        else "Europe/Berlin"
    )

    try:

        timezone = ZoneInfo(
            timezone_name
        )

    except Exception:

        timezone = ZoneInfo(
            "Europe/Berlin"
        )

    now = datetime.now(
        timezone
    )

    reset_time = now.replace(
        hour=hour,
        minute=minute,
        second=0,
        microsecond=0
    )

    if reset_time <= now:

        reset_time += timedelta(
            days=1
        )

    return reset_time


def wait_until_rate_limit_reset(output):
    """
    Wartet bis Reset-Zeit + 2 Minuten.
    """

    reset_time = get_rate_limit_reset_time(
        output
    )

    if reset_time is not None:

        retry_time = (
            reset_time
            + timedelta(minutes=2)
        )

        now = datetime.now(
            reset_time.tzinfo
        )

        wait_seconds = max(
            0,
            int(
                (
                    retry_time - now
                ).total_seconds()
            )
        )

        print(
            "\n⏳ Claude-Session-Limit erkannt."
        )

        print(
            f"🕐 Reset laut Claude: "
            f"{reset_time.strftime('%H:%M Uhr')}"
        )

        print(
            f"▶️ Neuer Versuch ab: "
            f"{retry_time.strftime('%H:%M Uhr')}"
        )

        print(
            f"😴 Warte "
            f"{wait_seconds // 60} Minuten "
            f"und {wait_seconds % 60} Sekunden..."
        )

        time.sleep(
            wait_seconds
        )

        print(
            "\n🚀 Limit sollte aufgehoben sein."
        )

    else:

        wait_seconds = (
            RATE_LIMIT_FALLBACK_HOURS * 3600
        )

        print(
            "\n⚠️ Session-Limit erkannt, "
            "aber keine Reset-Uhrzeit gefunden."
        )

        print(
            f"😴 Fallback: Warte "
            f"{RATE_LIMIT_FALLBACK_HOURS} Stunden..."
        )

        time.sleep(
            wait_seconds
        )


# ==========================================
# 🎯 STARTPROMPT-PHASE
# ==========================================

def run_startprompt_phase(
    repo_root,
    repo_name,
    startprompt
):
    """
    Arbeitet die Aufgaben des Startprompts ab.
    """

    session_name = f"{repo_name}-Autonom"

    print("\n" + "=" * 60)
    print("🎯 STARTPROMPT-PHASE")
    print("=" * 60)

    while True:

        wait_while_python_paused(
            repo_root
        )

        prompt = f"""
Du arbeitest als autonomer Agent an diesem Projekt.

Der folgende Startprompt definiert die Aufgaben:

---------------- STARTPROMPT ----------------

{startprompt}

-------------- ENDE STARTPROMPT --------------

Arbeite die Aufgaben aus dem Startprompt der Reihe nach ab.

Wichtig:

- Arbeite selbstständig.
- Entscheide selbst, welche einzelnen Schritte und
  Unteraufgaben notwendig sind.
- Bearbeite zuerst die Aufgaben aus dem Startprompt.
- Ziehe keine unabhängigen neuen Aufgaben aus
  Markdown-Dateien hinzu.
- Wenn du in dieser Session nicht alles schaffst,
  fahre bei der nächsten Session mit den noch offenen
  Aufgaben weiter.
- Aktualisiere relevante Dateien.
- Erstelle nach Änderungen einen Git-Commit.
- Prüfe deine Arbeit nach Möglichkeit selbst.

PAUSE/START-STEUERUNG:

Wenn der Benutzer exakt

PAUSE PYTHON

schreibt, erstelle diese Datei:

{get_control_file(repo_root)}

Danach keine weiteren automatischen Aufgaben starten.

Wenn der Benutzer exakt

START PYTHON

schreibt, entferne diese Datei:

{get_control_file(repo_root)}

Die Claude-Session selbst bleibt bestehen.

Wenn und nur wenn ALLE Aufgaben aus dem Startprompt
vollständig umgesetzt und geprüft wurden, gib als letzte
Zeile exakt:

STARTPROMPT_TASKS_COMPLETE
"""

        print(
            "\n🚀 Claude arbeitet die Aufgaben "
            "aus dem Startprompt weiter ab..."
        )

        output, returncode = run_claude(
            build_claude_command(
                session_name,
                prompt
            ),
            repo_root
        )

        # Weekly 80 % prüfen
        if check_and_handle_weekly_usage(
            output,
            repo_root,
            session_name
        ):
            wait_while_python_paused(
                repo_root
            )
            continue

        # Session-/Rate-Limit prüfen
        if is_rate_limit(output):

            wait_until_rate_limit_reset(
                output
            )

            print(
                "▶️ Mache weiter mit den Aufgaben..."
            )

            continue

        if is_python_paused(repo_root):

            wait_while_python_paused(
                repo_root
            )

            continue

        if "STARTPROMPT_TASKS_COMPLETE" in output:

            print(
                "\n✅ Alle Aufgaben aus dem Startprompt "
                "sind erledigt."
            )

            return True

        print(
            "\nℹ️ Claude hat die Session beendet, "
            "ohne den Startprompt als vollständig "
            "abgeschlossen zu markieren."
        )

        print(
            "🔄 Beim nächsten Durchlauf wird weitergemacht."
        )

        time.sleep(
            SHORT_PAUSE_BETWEEN_TASKS
        )


# ==========================================
# 📚 MARKDOWN-PHASE
# ==========================================

def run_markdown_phase(
    repo_root,
    repo_name
):
    """
    Bearbeitet nach dem Startprompt die offenen
    Markdown-Aufgaben.
    """

    session_name = f"{repo_name}-Autonom"

    print("\n" + "=" * 60)
    print("📚 MARKDOWN-PHASE")
    print("=" * 60)

    while True:

        wait_while_python_paused(
            repo_root
        )

        markdown_files = find_project_markdowns(
            repo_root
        )

        if markdown_files:

            markdown_context = "\n".join(
                f"- {file}"
                for file in markdown_files
            )

        else:

            markdown_context = (
                "Keine Markdown-Dateien vorhanden."
            )

        prompt = f"""
Der Startprompt wurde vollständig abgearbeitet.

Arbeite jetzt autonom die offenen Aufgaben aus den
Markdown-Dateien des Projekts ab.

Vorhandene Markdown-Dateien:

{markdown_context}

Deine Aufgabe:

1. Lies die relevanten Markdown-Dateien.
2. Suche nach offenen Aufgaben, To-Dos oder nächsten
   Arbeitsschritten.
3. Entscheide selbst, welche Aufgabe als Nächstes sinnvoll ist.
4. Arbeite sie vollständig ab.
5. Aktualisiere relevante Dateien.
6. Erstelle nach Änderungen einen Git-Commit.
7. Entscheide selbst über Reihenfolge und Unteraufgaben.
8. Fahre anschließend mit weiteren offenen Aufgaben fort.

PAUSE/START-STEUERUNG:

Wenn der Benutzer exakt

PAUSE PYTHON

schreibt, erstelle diese Datei:

{get_control_file(repo_root)}

Wenn der Benutzer exakt

START PYTHON

schreibt, entferne diese Datei:

{get_control_file(repo_root)}

Die Claude-Session selbst bleibt bestehen.

Wenn keine offenen Aufgaben in den Markdown-Dateien mehr
vorhanden sind, gib als letzte Zeile exakt:

NO_MARKDOWN_TASKS_LEFT
"""

        print(
            "\n🔎 Claude sucht und bearbeitet "
            "die nächsten offenen Markdown-Aufgaben..."
        )

        output, returncode = run_claude(
            build_claude_command(
                session_name,
                prompt
            ),
            repo_root
        )

        # Weekly 80 % prüfen
        if check_and_handle_weekly_usage(
            output,
            repo_root,
            session_name
        ):
            wait_while_python_paused(
                repo_root
            )
            continue

        # Session-/Rate-Limit prüfen
        if is_rate_limit(output):

            wait_until_rate_limit_reset(
                output
            )

            print(
                "▶️ Mache weiter mit den Aufgaben..."
            )

            continue

        if is_python_paused(repo_root):

            wait_while_python_paused(
                repo_root
            )

            continue

        if "NO_MARKDOWN_TASKS_LEFT" in output:

            print(
                "\n🎉 Alle Markdown-Aufgaben sind erledigt."
            )

            break

        time.sleep(
            SHORT_PAUSE_BETWEEN_TASKS
        )


# ==========================================
# 🤖 HAUPTLOGIK
# ==========================================

def autonomous_loop():

    repo_root = get_repo_root()
    repo_name = get_repo_name(
        repo_root
    )

    print(
        "🤖 Autonomer Claude-Code-Agent"
    )

    print(
        f"📂 Repository: {repo_name}"
    )

    print(
        f"📍 Pfad: {repo_root}"
    )

    print(
        f"🧠 Auto-Compact: "
        f"{AUTOCOMPACT_PERCENT}%"
    )

    print(
        f"📊 Auto-Pause bei "
        f"{WEEKLY_USAGE_PAUSE_PERCENT}% "
        f"Wochenutzung"
    )

    print(
        "📱 PAUSE PYTHON / START PYTHON "
        "über den Claude-App-Chat möglich."
    )

    print(
        "💡 Strg + C beendet den Agenten."
    )

    print(
        "-" * 60
    )

    # ==========================================
    # Startprompt
    # ==========================================

    entered_prompt = ask_startup_settings()

    if entered_prompt:

        startprompt = entered_prompt

        print(
            "\n✅ Eingegebener Prompt wird als Startprompt genutzt."
        )

    else:

        startprompt = load_startprompt(
            repo_root
        )

        if startprompt:

            print(
                "\n📝 Neuer Startprompt aus Datei gefunden."
            )

            mark_startprompt_as_used(
                repo_root
            )

    if startprompt:

        run_startprompt_phase(
            repo_root,
            repo_name,
            startprompt
        )

    else:

        print(
            "\nℹ️ Kein neuer Startprompt vorhanden."
        )

        print(
            "➡️ Bereits als GENUTZT markierte "
            "Startprompts werden ignoriert."
        )

    # ==========================================
    # Markdown-Aufgaben
    # ==========================================

    run_markdown_phase(
        repo_root,
        repo_name
    )


# ==========================================
# ▶️ START
# ==========================================

if __name__ == "__main__":

    try:

        autonomous_loop()

    except KeyboardInterrupt:

        print(
            "\n\n🛑 Agent per Strg + C beendet."
        )

        sys.exit(0)
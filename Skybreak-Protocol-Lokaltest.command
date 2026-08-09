#!/bin/zsh
set -eu

cd "$(dirname "$0")"

primary_url="http://127.0.0.1:5173/source/"

# A page title alone is not enough: an obsolete Pages build has the same title
# but points at a deleted hashed asset. Reuse 5173 only when it is Vite's real
# source entry.
if /usr/bin/curl --fail --silent --max-time 1 "$primary_url" | grep -q 'src="/src/main.tsx"'; then
  open "$primary_url"
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm wurde nicht gefunden. Bitte Node.js installieren und den Starter erneut öffnen."
  printf "Zum Beenden Enter drücken."
  read -r _
  exit 1
fi

if [[ ! -x "node_modules/.bin/vite" ]]; then
  echo "Die lokalen Projektabhängigkeiten fehlen. Bitte einmal 'npm ci' im Projektordner ausführen."
  printf "Zum Beenden Enter drücken."
  read -r _
  exit 1
fi

# Browser storage is bound to the complete origin, including the port. Never
# silently change the port, otherwise the existing local unlocks/settings look
# like a new profile.
if /usr/sbin/lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 5173 wird von einem anderen Programm verwendet."
  echo "Lokaler Spielstand bleibt an 127.0.0.1:5173 gebunden; deshalb wird kein Ersatz-Port verwendet."
  printf "Das andere Programm beenden und diesen Starter erneut öffnen. Zum Schließen Enter drücken."
  read -r _
  exit 1
fi

test_url="$primary_url"
echo "Lokaler Test startet auf Port 5173."
(sleep 1; open "$test_url") &
exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort

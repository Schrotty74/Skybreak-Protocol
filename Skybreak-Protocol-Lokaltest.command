#!/bin/zsh
set -eu

cd "$(dirname "$0")"

test_url="http://127.0.0.1:5173/Skybreak-Protocol/source/"

if curl --fail --silent --max-time 1 "$test_url" | grep -q "Skybreak Protocol"; then
  open "$test_url"
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

(sleep 1; open "$test_url") &
exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort

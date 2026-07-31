#!/bin/sh
set -eu

cd "$(dirname "$0")"
PORT=8765
URL="http://127.0.0.1:${PORT}/"

if command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi

if command -v python >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
  exec python -m http.server "$PORT" --bind 127.0.0.1
fi

echo "Python 3 wurde nicht gefunden. Bitte Python 3 installieren und den Starter erneut öffnen."
printf "Zum Beenden Enter drücken."
read -r _

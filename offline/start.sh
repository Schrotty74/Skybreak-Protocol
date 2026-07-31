#!/bin/sh
set -eu

cd "$(dirname "$0")"
PORT=8765
URL="http://127.0.0.1:${PORT}/"

if command -v python3 >/dev/null 2>&1; then
  (sleep 1; xdg-open "$URL" >/dev/null 2>&1 || true) &
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi

echo "Python 3 was not found. Install Python 3 and run this starter again."

#!/bin/zsh
set -eu

cd "$(dirname "$0")"
test_url="http://127.0.0.1:4173/Skybreak-Protocol/source/?benchmark=1&quality=ultra&resolution=4k"
result_file="/tmp/skybreak-performance-results.json"
rm -f "$result_file"

if ! /usr/bin/curl --fail --silent --max-time 1 "${test_url%%\?*}" | grep -q "Skybreak Protocol"; then
  if [[ ! -x "node_modules/.bin/vite" ]]; then
    echo "Die lokalen Projektabhängigkeiten fehlen. Bitte zuerst den Lokaltest-Starter öffnen."
    read -r "?Zum Beenden Enter drücken."
    exit 1
  fi
  npm run build >/tmp/skybreak-build.log 2>&1
  npm run preview -- --host 127.0.0.1 --port 4173 --strictPort >/tmp/skybreak-preview.log 2>&1 &
  sleep 2
fi

for variant in default; do
  for browser in Safari Firefox; do
    node scripts/performance-listener.mjs "$result_file" 1 &
    listener_pid=$!
    sleep 1
    run_id="${browser}-${variant}-$(date +%s)-$RANDOM"
    open -a "$browser" "$test_url&variant=$variant&run=$run_id"
    wait "$listener_pid"
  done
done
echo "Die vollständigen Ergebnisse wurden lokal gespeichert: $result_file"
read -r "?Fertig. Zum Schließen Enter drücken."

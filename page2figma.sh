#!/usr/bin/env bash
# Converte QUALQUER página num SVG e o disponibiliza pro plugin do Figma.
# Uso: bash page2figma.sh <url> [seletorCSS]
#   ex.: bash page2figma.sh http://localhost:3000
#        bash page2figma.sh http://127.0.0.1:8788/index.html ".root"
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
URL="$1"
SEL="${2:-body}"
if [ -z "$URL" ]; then echo "uso: bash page2figma.sh <url> [seletorCSS]"; exit 1; fi

# garante o servidor do SVG no ar (porta 8787)
if ! curl -sf -o /dev/null http://localhost:8787/latest.svg 2>/dev/null; then
  node "$HERE/serve.js" >/tmp/page2figma_serve.log 2>&1 &
  sleep 0.6
fi

node "$HERE/convert.js" "$URL" "$HERE/out/latest.svg" "$SEL"
echo "OK → http://localhost:8787/latest.svg  •  agora rode o plugin 'Página → SVG' no Figma."

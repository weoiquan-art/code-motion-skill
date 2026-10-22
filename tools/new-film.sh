#!/usr/bin/env bash
# Start a new code-made film from the skill:
#   bash <skill>/tools/new-film.sh <project-dir>
# Copies starter/ (configs, demo film, audio script), library/ → src/lib,
# and the Node tools → scripts/. Then: npm i, npm run fonts, npm run audio,
# npm run stills -- Film stills 0,120,200,300,400 and npm run render.
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:?usage: new-film.sh <project-dir>}"
if [ -e "$DEST" ] && [ -n "$(ls -A "$DEST" 2>/dev/null)" ]; then
  echo "$DEST exists and is not empty; copy by hand to avoid overwriting." >&2
  exit 1
fi
mkdir -p "$DEST"
cp -r "$SKILL/starter/." "$DEST/"
mkdir -p "$DEST/src/lib" "$DEST/scripts" "$DEST/public/fonts" "$DEST/public/audio"
cp -r "$SKILL/library/." "$DEST/src/lib/"
cp "$SKILL/tools/fetch-fonts.ts" "$SKILL/tools/render-stills.ts" "$SKILL/tools/check-av.ts" "$DEST/scripts/"
cp "$SKILL/tools/contact-sheet.py" "$DEST/scripts/"
echo "New film in $DEST. Next:"
echo "  cd $DEST && npm i --loglevel=error && npm run fonts && npm run audio && npm run lint"

#!/usr/bin/env bash
# One A20 panel iteration: snapshot the working prompt, generate one image, number it,
# and measure colour drift against the first reference.
#
#   scripts/panel_run.sh PROMPT RUN_DIR NAME REF [REF...]
#
#   PROMPT   the live working prompt (e.g. .../milestones/02-right-panel-delivery/PROMPT.txt)
#   RUN_DIR  the run folder inside the milestone (created if missing)
#   NAME     numbered output name without extension, e.g. 34-door-fix or c14-cup-smaller
#   REF...   reference images in order of weight (first = the take to preserve)
#
# Env overrides: MODEL (pro), SIZE (2K), ASPECT (9:16), TRIES (3).
set -euo pipefail
PROMPT=$1; RUN=$2; NAME=$3; shift 3
MODEL=${MODEL:-pro}; SIZE=${SIZE:-2K}; ASPECT=${ASPECT:-9:16}; TRIES=${TRIES:-3}
HERE=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$RUN/prompts" "$RUN/images"
SNAP="$RUN/prompts/$NAME.txt"
cp "$PROMPT" "$SNAP"                      # snapshot: the exact prompt this image came from
REFS=(); for r in "$@"; do REFS+=(-r "$r"); done
cd "$HERE"
for try in $(seq 1 "$TRIES"); do
    out=$(bun run generate -f "$SNAP" -m "$MODEL" -a "$ASPECT" -s "$SIZE" -n 1 \
          --label "$NAME" -o "$RUN/images" "${REFS[@]}" 2>&1 | grep -E '\.png$|ApiError|error:' || true)
    if echo "$out" | grep -q '\.png$'; then
        mv "$out" "$RUN/images/$NAME.png"
        echo "$RUN/images/$NAME.png"
        if [ $# -ge 1 ]; then
            uv run --quiet --with pillow --with numpy python scripts/colour_drift.py "$1" "$RUN/images/$NAME.png" 2>/dev/null | tail -1
        fi
        exit 0
    fi
    echo "try $try: $out" >&2
done
echo "FAILED after $TRIES tries" >&2; exit 1

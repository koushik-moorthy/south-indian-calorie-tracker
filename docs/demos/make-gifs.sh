#!/usr/bin/env bash
#
# make-gifs.sh — turn raw screen recordings into optimized, looped GIFs.
#
#   Reads:   docs/demos/source/<name>.{mov,mp4,webm,mkv,m4v}
#   Writes:  docs/demos/<name>.gif
#
# Uses a two-pass ffmpeg palette (palettegen + paletteuse) for crisp, small
# GIFs. Requires ffmpeg on PATH.
#
# Usage:
#   docs/demos/make-gifs.sh                 # convert everything in source/
#   docs/demos/make-gifs.sh log-food-text   # convert one (by base name)
#   FPS=15 WIDTH=600 docs/demos/make-gifs.sh # override frame rate / width
#
set -euo pipefail

# Resolve the docs/demos dir relative to this script, so it works from anywhere.
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$DEMO_DIR/source"

FPS="${FPS:-12}"        # frames per second
WIDTH="${WIDTH:-720}"   # output width in px (height auto, preserves aspect)

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "error: ffmpeg not found on PATH." >&2
  exit 1
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "error: $SRC_DIR does not exist. Put your recordings there." >&2
  exit 1
fi

# Build the list of source files: a specific base name, or every video in source/.
shopt -s nullglob
if [ "$#" -ge 1 ]; then
  sources=()
  for ext in mov mp4 webm mkv m4v MOV MP4; do
    [ -f "$SRC_DIR/$1.$ext" ] && sources+=("$SRC_DIR/$1.$ext")
  done
  if [ "${#sources[@]}" -eq 0 ]; then
    echo "error: no $SRC_DIR/$1.{mov,mp4,webm,mkv,m4v} found." >&2
    exit 1
  fi
else
  sources=("$SRC_DIR"/*.{mov,mp4,webm,mkv,m4v,MOV,MP4})
fi

if [ "${#sources[@]}" -eq 0 ]; then
  echo "Nothing to convert — drop recordings into $SRC_DIR first."
  exit 0
fi

filters="fps=${FPS},scale=${WIDTH}:-1:flags=lanczos"

for src in "${sources[@]}"; do
  base="$(basename "$src")"
  name="${base%.*}"
  out="$DEMO_DIR/$name.gif"
  palette="$(mktemp -t "${name}-palette").png"

  echo "→ $base  →  $name.gif  (${FPS}fps, ${WIDTH}px)"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -vf "${filters},palettegen=stats_mode=diff" "$palette"
  ffmpeg -hide_banner -loglevel error -y -i "$src" -i "$palette" \
    -lavfi "${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
    -loop 0 "$out"
  rm -f "$palette"

  size="$(du -h "$out" | cut -f1)"
  echo "   wrote $out ($size)"
done

echo "Done. GIFs are in $DEMO_DIR/."

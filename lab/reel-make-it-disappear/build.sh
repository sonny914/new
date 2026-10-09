#!/usr/bin/env bash
# Rebuilds the "make it disappear" reel from the talking-head recording, with lab/reel-kit.
# Usage: build.sh <recording.mp4> [work dir]     PREVIEW=1 renders a 540×960 preview only.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; kit="$here/../reel-kit"
rec="$1"; work="${2:-$(mktemp -d)}"; out="$here/export"; mkdir -p "$work" "$out"

# 1. talking head: un-mirrored (the front camera flips the cap's lettering), restrained grade, 24 fps
[ -f "$work/face/0579.jpg" ] || { mkdir -p "$work/face"; ffmpeg -v error -y -i "$rec" -vf "hflip,eq=contrast=1.05:saturation=0.9:gamma=0.98,format=yuvj420p" -q:v 3 "$work/face/%04d.jpg"; }
# 2. composition → frames; 3. audio
if [ "${PREVIEW:-0}" = 1 ]; then node "$kit/render.mjs" "$here/index.html" "$work/face" "$work/preview" --scale 0.5; frames="$work/preview"
else node "$kit/render.mjs" "$here/index.html" "$work/face" "$work/frames"; frames="$work/frames"; fi
python3 "$here/build-audio.py" "$rec" "$work/audio"

# 4. encode
enc() { ffmpeg -v error -y -framerate 30 -i "$frames/%04d.jpg" -i "$1" -c:v libx264 -preset slow -crf "$2" -maxrate 9M -bufsize 18M \
  -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$3"; }
if [ "${PREVIEW:-0}" = 1 ]; then enc "$work/audio/mix.wav" 24 "$work/preview.mp4"; echo "preview → $work/preview.mp4"; exit; fi
enc "$work/audio/mix.wav" 17 "$out/make-it-disappear-reel.mp4"
enc "$work/audio/mix_nomusic.wav" 17 "$out/make-it-disappear-reel-no-music.mp4"
ffmpeg -v error -y -i "$out/make-it-disappear-reel.mp4" -vf scale=540:960 -c:v libx264 -preset medium -crf 26 -c:a aac -b:a 192k \
  -movflags +faststart "$out/make-it-disappear-reel-preview.mp4"
echo "done → $out"

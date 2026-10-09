#!/usr/bin/env bash
# Rebuilds the false confidence reel from the talking-head recording, with lab/reel-kit.
# Usage: build.sh <recording.mp4> [work dir]     PREVIEW=1 renders a 540×960 check only.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; kit="$here/../reel-kit"
rec="$1"; work="${2:-$(mktemp -d)}"; out="$here/export"; mkdir -p "$work" "$out"

# 1. talking head: 512×910 source, ×2.1 Lanczos (no invented detail), light sharpening, shadows lifted
[ -f "$work/face/1274.jpg" ] || { mkdir -p "$work/face"; ffmpeg -v error -y -i "$rec" -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0.0,eq=contrast=1.04:brightness=0.02:gamma=1.16:saturation=0.95,format=yuvj420p" -q:v 3 "$work/face/%04d.jpg"; }
# 2. composition → frames (the edit is in edit.js); 3. audio
if [ "${PREVIEW:-0}" = 1 ]; then node "$kit/render.mjs" "$here/index.html" "$work/face" "$work/preview" --scale 0.5; frames="$work/preview"
else node "$kit/render.mjs" "$here/index.html" "$work/face" "$work/frames"; frames="$work/frames"; fi
python3 "$here/build-audio.py" "$rec" "$work/audio"

# 4. encode: master, a sharing cut under 30 MB, a no-music cut
enc() { ffmpeg -v error -y -framerate 30 -i "$frames/%04d.jpg" -i "$1" -c:v libx264 -preset slow -crf "$2" -maxrate "$3" -bufsize 20M \
  -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -movflags +faststart "$4"; }
if [ "${PREVIEW:-0}" = 1 ]; then enc "$work/audio/mix.wav" 24 4M "$work/preview.mp4"; echo "preview → $work/preview.mp4"; exit; fi
enc "$work/audio/mix.wav" 16 12M "$out/false-confidence-reel-master.mp4"
enc "$work/audio/mix.wav" 21 5M "$out/false-confidence-reel.mp4"
enc "$work/audio/mix_nomusic.wav" 21 5M "$out/false-confidence-reel-no-music.mp4"
echo "done → $out"

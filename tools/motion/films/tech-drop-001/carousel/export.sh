#!/usr/bin/env bash
# Cut the rendered carousel (6 slides x 6 s, 1080x1350) into one MP4 per slide, plus a still of each slide's
# finished state (for a static carousel or a cover), plus a contact sheet.
# usage: ./export.sh <carousel.mp4>   (render: node ../../../render.mjs tech-drop/carousel --out=<carousel.mp4>)
set -euo pipefail
SRC=${1:?rendered carousel mp4 required}; N=QB_TECH_DROP_001_CAROUSEL
mkdir -p out
for i in $(seq 0 5); do n=$(printf %02d $((i+1)))
  ffmpeg -y -loglevel error -ss $((i*6)) -t 6 -i "$SRC" -an -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -movflags +faststart "out/${N}_${n}.mp4"
  ffmpeg -y -loglevel error -ss $(python3 -c "print($i*6+5.6)") -i "$SRC" -frames:v 1 "out/${N}_${n}.png"
done
ffmpeg -y -loglevel error -i "out/${N}_%02d.png" -vf "scale=324:405,tile=6x1" -frames:v 1 -start_number 1 "out/${N}_CONTACT_SHEET.png" 2>/dev/null || \
  ffmpeg -y -loglevel error -start_number 1 -i "out/${N}_%02d.png" -vf "scale=324:405,tile=6x1" -frames:v 1 "out/${N}_CONTACT_SHEET.png"
ls out

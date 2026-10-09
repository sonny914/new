#!/usr/bin/env bash
# Builds the Quiet Bands sting kit into ./export:
#   qb-sting.wav / .m4a / .mp3        the sound alone (hit at 0.000 s)
#   qb-sting-9x16|4x5|1x1|16x9.mp4    end cards on black, sound on the hit (0.100 s)
#   qb-sting-alpha.mov                ProRes 4444 with transparency + sound, to drop on the end of any edit
# Usage: lab/qb-sting/build.sh [work dir]
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="${1:-$(mktemp -d)}"
out="$here/export"; mkdir -p "$out"

python3 "$here/sting_audio.py" "$out"
# sound placed on the visual hit (HIT = 0.10 s in sting.html), padded to the card length
ffmpeg -v error -y -i "$out/qb-sting.wav" -af "adelay=100|100,apad=whole_dur=1.8,atrim=0:1.8" -c:a pcm_s24le "$work/sting-on-hit.wav"

for ar in 9x16 4x5 1x1 16x9; do
  node "$here/render-sting.mjs" "$ar" "$work/$ar"
  ffmpeg -v error -y -framerate 30 -i "$work/$ar/%03d.jpg" -i "$work/sting-on-hit.wav" \
    -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -ar 48000 \
    -shortest -movflags +faststart "$out/qb-sting-$ar.mp4"
done

node "$here/render-sting.mjs" 1x1 "$work/alpha" alpha
ffmpeg -v error -y -framerate 30 -i "$work/alpha/%03d.png" -i "$work/sting-on-hit.wav" \
  -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -vendor apl0 -c:a pcm_s24le -shortest "$out/qb-sting-alpha.mov"
echo "sting kit → $out"

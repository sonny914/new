#!/usr/bin/env bash
# Assemble Film 001 from its parts. Run from this folder after:
#   python3 build_vo.py && python3 sfx.py && python3 captions.py && node captions-render.mjs
#   node ../../render.mjs everybody-can-build/film001 --from=150 --to=<frames> --out=<body.mp4>
# usage: ./assemble.sh <body.mp4>
set -euo pipefail
BODY=${1:?body mp4 (t >= 5 s) required}
OPEN=../../renders/everybody-can-build-cover-open.mp4      # the approved opening, used as-is for 0-5 s
OUT=out; mkdir -p "$OUT"
DUR=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
ENC=(-c:v libx264 -preset slow -crf 19 -maxrate 9M -bufsize 18M -pix_fmt yuv420p -r 30 -movflags +faststart)
# 1. picture: approved opening + the film body, one continuous 30 fps stream
ffmpeg -y -loglevel error -i "$OPEN" -i "$BODY" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0,trim=duration=$DUR[v]" -map "[v]" -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -r 30 "$OUT/.picture.mp4"
# 2. sound: narration + sound design, loudness-normalised for social (-14 LUFS, true peak -1.5 dBTP)
ffmpeg -y -loglevel error -i narration.wav -i sfx.wav -filter_complex "[0][1]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 48000 -ac 2 "$OUT/.mix.wav"
# 3. clean film (no captions)
ffmpeg -y -loglevel error -i "$OUT/.picture.mp4" -i "$OUT/.mix.wav" -map 0:v -map 1:a "${ENC[@]}" -c:a aac -b:a 192k -shortest "$OUT/everybody-can-build-film001-clean.mp4"
# 4. captioned film: each caption image faded in/out over 0.12 s at its measured time
ARGS=(-i "$OUT/.picture.mp4" -i "$OUT/.mix.wav"); FC=""; PREV="0:v"; i=0
while read -r s e y; do
  d=$(python3 -c "print(round($e-$s,3))"); n=$((i+2))
  ARGS+=(-loop 1 -t "$d" -i "captions/$(printf %02d $i).png")
  FC+="[$n:v]format=rgba,fade=t=in:st=0:d=0.12:alpha=1,fade=t=out:st=$(python3 -c "print(round($d-0.12,3))"):d=0.12:alpha=1,setpts=PTS+$s/TB[c$i];"
  FC+="[$PREV][c$i]overlay=0:$y:enable='between(t,$s,$e)':eof_action=pass[v$i];"; PREV="v$i"; i=$((i+1))
done < <(python3 -c "import json;[print(c['start'],c['end'],c['y']) for c in json.load(open('captions.json'))]")
ffmpeg -y -loglevel error "${ARGS[@]}" -filter_complex "${FC%;}" -map "[$PREV]" -map 1:a "${ENC[@]}" -c:a aac -b:a 192k -t "$DUR" "$OUT/everybody-can-build-film001.mp4"
rm -f "$OUT/.picture.mp4" "$OUT/.mix.wav"
cp everybody-can-build.srt "$OUT/"; cp script.md "$OUT/everybody-can-build-script.md"
ls -la "$OUT"

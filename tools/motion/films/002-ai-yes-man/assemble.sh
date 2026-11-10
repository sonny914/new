#!/usr/bin/env bash
# Assemble Film 002 from its parts. Run from this folder after:
#   python3 build_vo.py && python3 sfx.py && python3 captions.py && node captions-render.mjs
#   node ../../render.mjs the-ai-yes-man/film002 --to=<total*30> --out=<picture.mp4>
# usage: ./assemble.sh <picture.mp4>
set -euo pipefail
PIC=${1:?rendered picture mp4 required}
OUT=out; mkdir -p "$OUT"; N=QB_FILM_002_AI_YES_MAN
DUR=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
ENC=(-c:v libx264 -preset slow -crf 19 -maxrate 9M -bufsize 18M -pix_fmt yuv420p -r 30 -movflags +faststart)
ffmpeg -y -loglevel error -i narration.wav -i sfx.wav -filter_complex "[0][1]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 48000 -ac 2 "$OUT/.mix.wav"
ffmpeg -y -loglevel error -i "$PIC" -i "$OUT/.mix.wav" -map 0:v -map 1:a "${ENC[@]}" -c:a aac -b:a 192k -t "$DUR" "$OUT/${N}_CLEAN.mp4"
ARGS=(-i "$PIC" -i "$OUT/.mix.wav"); FC=""; PREV="0:v"; i=0
while read -r s e y; do
  d=$(python3 -c "print(round($e-$s,3))"); n=$((i+2))
  ARGS+=(-loop 1 -t "$d" -i "captions/$(printf %02d $i).png")
  FC+="[$n:v]format=rgba,fade=t=in:st=0:d=0.12:alpha=1,fade=t=out:st=$(python3 -c "print(round($d-0.12,3))"):d=0.12:alpha=1,setpts=PTS+$s/TB[c$i];"
  FC+="[$PREV][c$i]overlay=0:$y:enable='between(t,$s,$e)':eof_action=pass[v$i];"; PREV="v$i"; i=$((i+1))
done < <(python3 -c "import json;[print(c['start'],c['end'],c['y']) for c in json.load(open('captions.json'))]")
ffmpeg -y -loglevel error "${ARGS[@]}" -filter_complex "${FC%;}" -map "[$PREV]" -map 1:a "${ENC[@]}" -c:a aac -b:a 192k -t "$DUR" "$OUT/${N}_FINAL.mp4"
rm -f "$OUT/.mix.wav"
cp QB_FILM_002_AI_YES_MAN_CAPTIONS.srt "$OUT/"; cp script.md "$OUT/${N}_SCRIPT.md"
ls -la "$OUT"

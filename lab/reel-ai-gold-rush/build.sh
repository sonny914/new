#!/usr/bin/env bash
# Rebuilds the "AI gold rush" reel from the talking-head recording.
# Usage: lab/reel-ai-gold-rush/build.sh <recording.mp4> [work dir]
# Needs ffmpeg, node + Playwright (Chromium), python3 + numpy. The recording and the
# intermediate frames stay in the work dir; only the finished reel lands in ./export.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
rec="$1"; work="${2:-$(mktemp -d)}"
mkdir -p "$work/face" "$work/frames" "$work/audio" "$here/export"

# 1. talking head: crop above the burned-in caption band, upscale, restrained grade
ffmpeg -v error -y -i "$rec" -vf "crop=512:525:0:90,scale=1080:1107:flags=lanczos,unsharp=5:5:0.55:5:5:0.0,eq=contrast=1.06:saturation=0.9:gamma=0.98" \
  -q:v 3 "$work/face/%04d.jpg"

# 2. motion graphics + composite, frame by frame (three workers)
node "$here/render-frames.mjs" "$work/face" "$work/frames" 0 277 &
node "$here/render-frames.mjs" "$work/face" "$work/frames" 278 555 &
node "$here/render-frames.mjs" "$work/face" "$work/frames" 556 833 &
wait

# 3. voice clean-up, original music and sound design, mix
python3 "$here/build-audio.py" "$rec" "$work/audio"

# 4. final (1080×1920, 30 fps, H.264 + AAC) and a light preview
ffmpeg -v error -y -framerate 30 -i "$work/frames/%04d.jpg" -i "$work/audio/mix.wav" \
  -c:v libx264 -preset slow -crf 17 -maxrate 9M -bufsize 18M -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$here/export/ai-gold-rush-reel.mp4"
ffmpeg -v error -y -i "$here/export/ai-gold-rush-reel.mp4" -vf scale=540:960 -c:v libx264 -preset medium -crf 26 \
  -c:a aac -b:a 96k -movflags +faststart "$here/export/ai-gold-rush-reel-preview.mp4"
# 5. a version without the music bed, for adding Instagram audio at upload
ffmpeg -v error -y -i "$work/audio/voice.wav" -i "$work/audio/sfx.wav" \
  -filter_complex "[1:a]volume=0.55[s];[0:a][s]amix=inputs=2:duration=longest:normalize=0,apad=whole_dur=27.8,atrim=0:27.8,loudnorm=I=-14:TP=-1.0:LRA=10[out]" \
  -map "[out]" -ar 48000 "$work/audio/mix_nomusic.wav"
ffmpeg -v error -y -i "$here/export/ai-gold-rush-reel.mp4" -i "$work/audio/mix_nomusic.wav" -map 0:v -map 1:a -c:v copy \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$here/export/ai-gold-rush-reel-no-music.mp4"
echo "done → $here/export"

# Quiet Bands — 10s motion piece

Two cuts of the same 10 seconds, both 60fps H.264 with an AAC score synthesised in `sound.mjs`:

- `quiet-bands-10s.mp4`: 1920×1080, for YouTube, LinkedIn and the site
- `quiet-bands-10s-vertical.mp4`: 1080×1920, for Reels, TikTok and Shorts. The headline stacks over the bulb, the end card is bigger, and the bottom 360px and right edge stay clear of the app's caption and buttons.

| Time | Beat |
| --- | --- |
| 0.0–1.6s | Letterbox opens, grid and scan line, HUD comes up |
| 0.4–2.4s | Wireframe bulb draws in and turns; "Before you build it," |
| 2.4–4.15s | Load climbs, camera pushes, "try to kill it." lands in orange, crack spreads from the impact |
| 4.15s | Break: flash, shock rings, shake, shards |
| 5.0–6.9s | Shards converge into the qb mark |
| 6.9–10s | Mark locks, wordmark wipes in, the line types out, letterbox closes |

Orange appears only on the break and the words that name it, per the identity rules.

Open `index.html` in a browser for a silent live loop; add `?format=vertical` for the 9:16 cut.

## Rebuild

From this folder (needs Playwright with Chromium, and ffmpeg):

```
node render.mjs frames
node render.mjs frames-v --vertical
node sound.mjs score.wav
ffmpeg -framerate 60 -i frames/%04d.png -i score.wav -c:v libx264 -preset slow -crf 16 \
  -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart quiet-bands-10s.mp4
```

For the vertical file, swap in `frames-v/%04d.png` and `quiet-bands-10s-vertical.mp4`.

`node render.mjs stills 3.4,4.25,9.5` renders single stills for checking a beat (add `--vertical` for 9:16).

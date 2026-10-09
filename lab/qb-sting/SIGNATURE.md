# The Quiet Bands sting

The sonic and motion logo: the cream lockup lands on black on a single struck "ding". It first
appeared at the end of the AI gold rush reel; this folder is the canonical version, and the reel now
uses it.

## Sound

| | |
|---|---|
| Notes | A4 (440 Hz) + E5 (659.26 Hz) struck together: a perfect fifth, open and resolved |
| Timbre | Small struck bell: partials at 1×, 2.76× and 5.40× each note, decaying at 5.2, 9 and 16 /s |
| Balance | E5 at 0.6 of A4 |
| Width | ±0.4 Hz (A4) and ±0.3 Hz (E5) detune between left and right |
| Hit | Felt tap (2–7 kHz noise, 8 ms) and an A2 (110 Hz) body under it: the "pop" |
| Space | Short room tail, about 0.33 s decay, 16 % wet |
| Length | 1.7 s; the hit is at 0.000 s in `qb-sting.wav` |
| Level | Peak −3 dBFS (about −21 LUFS on its own), so it sits under any mix without limiting |

## Motion

| | |
|---|---|
| Ground | Black `#000000`; the lockup in cream `#F2EEE5`, never another colour |
| Size | Lockup 300 px wide per 1080 px of the frame's short side |
| Mark | Lands on the hit: fades in over 0.16 s, rises 24 px and scales 96.5 % → 100 % on an exponential ease-out over 0.6 s |
| Wordmark | The same move, 0.07 s after the mark |
| Card | 1.8 s, hit at 0.10 s, then a still hold |

The mark always moves whole: never split, stretched or recoloured part by part (brand rule).

## Use

- It is the last thing in a piece, once per piece. Nothing plays over or after it.
- Picture fades to black over about 0.2 s, and the hit lands as the black arrives.
- Bring the music bed down so it has gone by the hit, and keep voice off the ding.
- Never re-time, pitch or stretch it. If it doesn't fit, trim the edit, not the sting.

## Files (`export/`)

| File | For |
|---|---|
| `qb-sting-9x16.mp4` | Reels, Stories, TikTok end card (1080×1920) |
| `qb-sting-4x5.mp4` | Feed posts and carousel video slides (1080×1350) |
| `qb-sting-1x1.mp4` | Square (1080×1080) |
| `qb-sting-16x9.mp4` | YouTube, LinkedIn, decks (1920×1080) |
| `qb-sting-alpha.mov` | ProRes 4444 with transparency and sound: lay it over the last 2 s of any edit after a fade to black |
| `qb-sting.wav` / `.m4a` / `.mp3` | The sound alone (48 kHz / 24-bit WAV, 256 kbps AAC and MP3) |

## Rebuild

`./build.sh [work dir]` regenerates everything from `sting_audio.py` (sound) and `sting.html`
(motion; open `sting.html?play&ar=9x16` to preview it live).

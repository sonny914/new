"""Cue sheet for the "make it disappear" reel. Sounds, bed, voice clean-up and mix come from
lab/reel-kit/sfx.py; times are recording seconds (words.json). Usage: build-audio.py <rec> <out dir>"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'reel-kit'))
from sfx import *

r = Reel(sys.argv[1], sys.argv[2], offset=0.1, length=756 / 30)
at = r.at

# 1 · the strike
at(0.72, whoosh(0.3, False), 0.16)                                           # the dark comes in
for i in range(23): at(0.76 + i * 0.045, key(), 0.1)                          # code types itself
at(1.30, impact(0.6), 0.38)                                                  # CODE
at(2.02, slash(), 0.6)                                                       # struck through on "money"
for i in range(9): at(2.3 + i * 0.06, flick(), 0.08)                         # the code falls away
at(3.0, whoosh(0.3, False), 0.18); at(3.1, tick(1800), 0.1)                  # CODE drops, the line breathes
at(4.70, tick(1900), 0.16); at(5.10, impact(0.5), 0.32)                      # SOLVE, EXPENSIVE
at(5.65, impact(0.7), 0.5); at(5.7, tick(1500, 0.08), 0.2)                   # PROBLEMS., the underline
at(6.38, whoosh(0.2), 0.14); at(6.56, whoosh(0.4, False), 0.3)               # the line wipes the dark away

# busywork, then one scan
at(7.97, pop(), 0.2); at(7.99, key(), 0.35); at(8.06, key(), 0.3)            # ⌘C
at(8.53, key(), 0.35); at(8.6, key(), 0.3)                                   # ⌘V
for i in range(19): at(8.55 + i * 0.026, tick(3200, 0.02), 0.07)             # pasted, pasted, pasted
at(9.18, pop(480, 760), 0.2)
for i in range(5): at(9.22 + i * 0.16, pop(500 + 40 * i, 820 + 40 * i), 0.17)   # emails pile in
at(10.76, pop(440, 700), 0.2)
for s in (10.78, 10.96, 11.12, 11.27): at(s, tick(1700), 0.12)
at(12.12, whoosh(0.46), 0.28)                                                # "automate": the scan
for s in (12.2, 12.24, 12.3, 12.45, 12.5): at(s, tick(2600), 0.1)            # things get done as it passes

# 2 · find → learn → build
at(12.52, whoosh(0.3, False), 0.2)
for i in range(12): at(12.66 + i * 0.022, flick(), 0.06)                     # the problems deal in
for s in (12.95, 13.28, 13.6): at(s, tick(2200), 0.16)                       # the reticle hunts
at(13.94, stamp(), 0.38); at(13.96, bell(880, 0.6), 0.14)                    # locks on "problems"
at(14.05, whoosh(0.4, False), 0.18); at(14.7, whoosh(0.3), 0.1)
at(15.18, riser(1.0), 0.1)                                                   # the workflow line
for i, f in enumerate((659.3, 740, 830.6, 880)): at(15.57 + i * 0.18, bell(f, 0.5), 0.14)
for i in range(4): at(16.99 + i * 0.08, stamp(), 0.2)                        # bricks stack
for i in range(4): at(17.46 + i * 0.12, tick(3000), 0.08)                    # the workflow runs
at(17.62, bell(1318, 0.6), 0.15); at(17.7, bell(1760, 0.6), 0.11)            # ✓ automated
at(18.02, whoosh(0.36, False), 0.24)

# prompts: $0
for i in range(40): at(18.66 + i * 0.022, key(), 0.1)
at(19.60, stamp(), 0.5)
at(20.22, whoosh(0.3, False), 0.14)

# 3 · the disappear
at(20.60, whoosh(0.35, False), 0.18)
for s in (20.63, 20.87, 21.26, 21.38): at(s, tick(1900), 0.14)
at(21.48, impact(0.9), 0.55); at(21.6, tick(1500, 0.08), 0.18)              # PROBLEM, its underline
at(22.66, dust(1.2), 0.55)                                                   # gone, grain by grain
r.sting(23.6)                                                                # the Quiet Bands sting, as the dot vanishes

r.bed(gains=[(0.1, 0.55), (0.7, 0.8), (2.95, 0.8), (3.05, 0.0), (3.85, 0.0), (4.05, 0.8),
             (12.9, 0.9), (18.0, 0.7), (20.55, 0.7), (20.8, 0.22), (22.6, 0.2), (23.3, 0.0), (30, 0.0)])
r.finish(voice_fade_at=23.42)

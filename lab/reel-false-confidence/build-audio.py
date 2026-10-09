"""Cue sheet for the false confidence reel (lab/reel-kit/sfx.py). Times are the edited clock: when each
word is heard in the reel (edit.json). Usage: build-audio.py <recording> <out dir>"""
import json, sys
from pathlib import Path
here = Path(__file__).resolve().parent
sys.path.insert(0, str(here.parent / 'reel-kit'))
from sfx import *

r = Reel(sys.argv[1], sys.argv[2], edit=here / 'edit.json')
WS = json.load(open(here / 'edit.json'))['words']
def at(w, n=1, key='os'):
    return [x for x in WS if x['w'] == w][n - 1][key]
cue = r.at

# opening: the plan assembles (crisp UI), the stamp lands on "terrible"
for s, f in ((0.04, 2600), (0.12, 2100), (0.3, 3000), (0.55, 2400)): cue(s, tick(f), 0.14)
for i in range(9): cue(0.15 + i * 0.1, tick(3400, 0.02), 0.07)                 # revenue counting up
cue(0.2, riser(1.4), 0.08)                                                    # the chart climbs
cue(1.25, pop(700, 1100), 0.14)                                               # TAM chip
cue(at('terrible') - 0.01, stamp(), 0.85); cue(at('terrible'), impact(0.6), 0.45)
cue(2.78, whoosh(0.36, False), 0.2)                                           # the plan drops away

# the weak prompt and its agreeable answer
for i in range(14): cue(at('was') - 0.05 + i * 0.075, key(), 0.1)
cue(at('idea', 2, 'oe'), pop(600, 1000), 0.18)

# the structure: cards land, the foundation cracks on "false confidence"
for w in (('plan', 1), ('logo', 1), ('whole', 2)): cue(at(*w) - 0.1, stamp(), 0.16)
cue(at('false') + 0.05, whoosh(0.4, False), 0.14)                             # the pull-back
cue(at('false') + 0.1, crack(), 0.5); cue(at('confidence'), crack(0.4), 0.4)
cue(at('try') - 0.12, whoosh(0.3, False), 0.18)

# prompts: the strike, the better prompt typed as said, five reasons
cue(at('instead'), slash(0.28), 0.4)
gi = [x['w'] for x in WS].index('give')
for x in WS[gi:gi + 8]: cue(x['os'], key(), 0.12); cue(x['os'] + 0.06, key(), 0.08)
for i in range(5): cue(at('fail', 1, 'oe') - 0.05 + i * 0.07, tick(1800 + 200 * i), 0.14)
cue(at('then') + 0.02, whoosh(0.3, False), 0.16)

# the end: rebuilt, collapsed, CONFIDENCE alone, FALSE drops out of its F
cue(at('ai', 2) - 0.05, whoosh(0.4), 0.14)
for i in range(3): cue(at('ai', 2) + i * 0.06, tick(2200), 0.1)
cue(at("it's"), collapse(), 0.7)
cue(at('confidence', 2) - 0.05, whoosh(0.5, False), 0.12)
end_idea = at('idea', 3, 'oe')
cue(end_idea + 0.22, tick(1500, 0.08), 0.2)                                   # the F turns
for i in range(4): cue(end_idea + 0.34 + i * 0.12, tick(1300 - 120 * i, 0.06), 0.22)
cue(end_idea + 0.34 + 3 * 0.12 + 0.12, impact(0.9), 0.6)                      # FALSE CONFIDENCE lands

r.bed(gains=[(0, 0.6), (at("it's") - 0.1, 0.6), (at("it's") + 0.4, 0.15), (end_idea, 0.0), (99, 0.0)])
r.finish(voice_fade_at=end_idea + 0.1)

# False confidence reel: creative decision log

Flighty Builds × Quiet Bands. 9:16, 1080×1920, 30 fps, 37.4 s, from one talking-head recording
(42.5 s, 512×910, 30 fps). Built on `lab/reel-kit`.

**Thesis on screen:** a polished plan standing on a foundation that spells CONFIDENCE. It cracks on
"false confidence", collapses on the last line, and the foundation word is all that survives, until
FALSE drops out of its F, crossword-style. One object carries the argument from start to finish.

## What was said (captions follow this, not the script)

The recording is a different take from the pasted script. Captions follow the recording:

> ChatGPT will help you build a terrible business idea and make you feel like a genius the whole time.
> That's the dangerous part. You ask it, "Was this a good idea?" Suddenly you got a business plan, a
> logo, and a whole lot of false confidence. Try this instead: "Give me five reasons this business
> could fail. Then tell me what evidence I need before spending one dollar." Now you're not asking AI to
> hype you up. You're asking it to find your blind spots. Because the most expensive thing AI can give
> you isn't a bad answer. It's confidence in a bad idea.

Transcribed with Vosk, checked against pocketsphinx, word-timed by forced alignment (`words.json`).
One word is uncertain: both recognizers hear **"Was** this a good idea?", not "Is"; captions and the
prompt bar say "Was".

## Decisions

| Moment (reel time) | Decision | Why |
|---|---|---|
| Opening, 0–3.3 s | A deck card for **SockOS** ("the operating system for socks") assembles from frame 1: name, logo, $48M ARR counting up, a hockey-stick chart, a TAM chip. **TERRIBLE IDEA** stamps on the word "terrible" (1.75 s). The card sits in the lower third, so the face is never covered. | The spoken hook already lands at 1.75 s, so the visual hook is built around it, not before it. Frame 1 already shows a plan mid-build. |
| Pauses | 14 jump cuts take the pauses from 41.7 s of speech to 35.0 s. Every word kept; nothing sped up. Beats kept longer after "dangerous part", "false confidence", "blind spots" and before the last line. Punch-ins alternate (100 – 118 %) so the cuts read as intentional. | Tighter pacing without changing the delivery. 37.4 s with the end hold: a little over 35 s, but cutting further would mean cutting words. |
| "You ask it, 'Was this a good idea?'" | The prompt types in a chat bar as it's said; an agreeable reply ("Brilliant. Let's build it!") pops on the end of the question. | Shows the weak prompt once, in the speaker's words. |
| "business plan, a logo, … false confidence" | Three cards (Business plan, Brand identity, Revenue forecast) land on their words; on "false" the frame pulls back to reveal the cracked CONFIDENCE foundation under them. | The false-confidence card set from the brief, with the crack as the reveal. |
| "Try this instead: 'Give me five reasons…'" | The weak prompt returns and is struck through on "instead"; the better prompt types word by word as spoken, "five reasons" in orange; five reason slots light up. Then straight back to the face. | A two-line comparison, not a fake conversation. |
| "Then tell me … blind spots" | Face only, captions carry it (evidence, hype, blind spots in orange). | The argument is in the delivery here; no graphic would add to it. |
| Ending | The structure returns on "AI can give you", collapses on "It's", and CONFIDENCE alone lifts to centre on "confidence". After "a bad idea" the F turns orange and A-L-S-E drop under it: FALSE CONFIDENCE, sharing one letter. Held 2.2 s. | A typographic transformation that only works with these two words. |
| No sting | The Quiet Bands sting is left off. | The brief asks for no logo outro and a final frame of FALSE CONFIDENCE. It can be added as a 1.8 s tail if wanted. |

**Colour:** black ground, cream type and UI, orange only where the argument turns: the stamp, the
cracks, the struck weak prompt, "five reasons", FALSE, and one emphasis per caption.

**Captions:** word-synced, not bouncing. Each phrase is shown whole, and words light from 38 % to full as
they're spoken. Cream with orange emphasis, at most two lines, at y 1478 above the reel UI and below
the face. They step aside only while the type on screen says the same words (the two typed prompts and
the final CONFIDENCE). `captions.srt` carries every line.

**Sound:** UI ticks and a riser as the plan builds; one stamp; cracks on "false confidence"; a key
per word as the better prompt types; a collapse on "It's"; a tick per falling letter and one
impact as FALSE CONFIDENCE lands. Original bed (synthesized), ducked under the voice, gone before the
last word. Voice: high-pass, light denoise, de-ess, gentle compression; nothing replaced.

## Asset manifest

| Asset | Source | Rights |
|---|---|---|
| Talking head + voice | Supplied recording | Owner's footage |
| Plan card, cards, prompts, foundation, type | Original, code-generated (`index.html`) | Original work |
| SockOS and its numbers | Invented for the gag; not a real company | Original |
| Fonts | Bricolage Grotesque, Instrument Sans, Space Mono | SIL Open Font License |
| Music bed, sound effects | Synthesized (`lab/reel-kit/sfx.py`) | Original work |

No AI-generated video, voice or images; no paid services.

## Rebuild

`./build.sh <recording.mp4> [work dir]` (`PREVIEW=1` for 540×960). The cut is `edit.json` / `edit.js`
from `../reel-kit/edit.py words.json . --gap 0.2 --hold 22=0.38 --hold 31=0.3 --hold 45=0.4 --hold 48=0.3 --hold 84=0.35 --hold 97=0.42 --end 2.3`.

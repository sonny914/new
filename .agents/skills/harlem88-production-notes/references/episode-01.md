# Episode 01: The silent mouth (reference)

Storyboard: `episode-01.json`, next to this file. Clip paths are relative to the founder's private media folder and are not in the repo. The source finding is creative review §1: Episode 2, Shot 1, takes #90/#91, and decision log D-099.

## What it shows, and why each choice

| Scene | Footage | What's on screen | Why |
|---|---|---|---|
| Cold open | #90 0.95–2.38 s with its own room tone, then a freeze at 2.38 s (the widest silent opening) | Headline "The silent mouth"; mouth brackets orange on silent frames; flash and punch-in | The silence is the hook, so the bed is muted and the narration waits for the freeze |
| 01 What you see | #90 0–3.25 s muted under the narration, then 3.25–4.62 s with its sound | Chapter; "Shy" ID; voice ruler (top band, playhead); brackets | You see 1.4 s of talking with no voice, then hear the line arrive late |
| 02 How it surfaced | #90 0.95–3.25 s muted | Ruler with the two hums marked (0.85 s, 2.86 s); "No voice" arrow | Taking the hums out (#91) is what made the silence obvious |
| 03 The fix | Side by side: #90 frozen at 2.38 s, and #91 at 3.21 s (the first frame of "I") | "As generated" and "As cut" labels | The real correction was a trim, not a regeneration; both frames exist |
| 03, continued | #91 from 3.21 s with its sound | Ruler with the cut at 3.21 s; the trimmed part dimmed | The corrected shot, playing |
| 04 Did it work | The next shot (Ep 2 Shot 2) 0.9–4.45 s with its sound | Brackets stay cream; "Lips closed until the line" arrow; ruler (low band) | 0.25 s of silent movement against 1.4 s |
| End card | none | "I'm building HARLEM ’88, and I'm showing the work."; series line; Quiet Bands lockup | The series sign-off |

## Numbers and their sources

| Number | Source |
|---|---|
| 1.4 | `c90:summary.silent_mouth_movement_seconds` (1.42) |
| 0.25 | `s2:summary.silent_mouth_movement_seconds` |
| 3.21 | decision log D-099 |
| #90, #91, Ep. 2, shot 1 | creative review §1 |
| ’88 | the series name |

## Lessons from building it

Each of these is fixed in the engine or the library.

- **Timeline clearance.** A zoomed-in face pushed the timeline onto the chin. Keep the take full frame and put the ruler in the band the head leaves free: top for #90, low for Shot 2.
- **Before/after layout.** A top/bottom pair put the subtitles on the lower panel's mouth. Use `pair: "side"`.
- **Arrows.** An arrow from a note in the top band crossed the face. Arrows now start beside the face, level with the mouth.
- **Chrome.** Five tiny all-caps mono labels at the top read as template chrome. The Notes theme uses sentence case, fewer labels and larger type, and keeps mono only for the timecode.
- **Narration spacing.** Two narrated beats back to back made the second line start over the first. A line now waits for the one before it.
- **Length.** The first draft ran 52.6 s. Cutting the quote line and one result line brought it to 42.6 s.

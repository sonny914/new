# Production Notes overlay library

Code: `tools/capture/stage/overlays.js`. Styles: the `Production Notes` sections at the end of `tools/capture/stage/stage.css`. The stage passes each overlay the measurements of the exact source frame on screen, in panel pixels:
- the face box;
- the mouth centre and width;
- whether the frame is silent movement;
- the source time.

That's how graphics follow the face and avoid it.

## Timing (every overlay)

Overlays live in a clip scene's `props.overlays`.

| Key | Meaning |
|---|---|
| `beat` | the authored beat the overlay starts on (default 0) |
| `delay` | seconds after that beat starts |
| `until` | ends with that beat; `"end"` ends with the scene; omitted ends at the last beat |
| `for` | a fixed duration in seconds, instead of `until` |

Text on screen is checked for numbers like any label, except a chapter's `n`.

## Components

### `headline`: kinetic headline

```json
{ "type": "headline", "beat": 0, "delay": 0.15, "until": 1, "text": "The silent\nmouth", "size": "xl", "delays": [0, 0.35] }
```

- Condensed heavy Hubot Sans; each word rises out of a mask; lines split on `\n`.
- `delays` staggers whole lines. `size` is `xl` (150px), `lg` or `md`. `accent` names words to set in orange; use it rarely.
- `band` is `auto` (the half without the face), `top` or `bottom`.

### `id`: character label

```json
{ "type": "id", "beat": 0, "delay": 0.5, "for": 2.4, "name": "Shy", "role": "Ep. 2, shot 1" }
```

- A hairline leader in to the cheek, beside the face.
- The side is picked once, toward the wider margin, so the label never jumps. `side` forces it; `at` (0–1) sets its height on the face.

### `track`: tracking brackets or ring

```json
{ "type": "track", "beat": 0, "delay": 0.3, "until": 1, "target": "mouth", "hot": true }
```

- `target` is `mouth` (needs a track file) or `face` (needs the measurement's face boxes). `shape` is `brackets` (default) or `ring`.
- With `hot`, frames the measurement marks as mouth movement with no voice turn orange.

### `freeze`: freeze-frame and punch-in

```json
{ "type": "freeze", "beat": 1, "until": 1 }
```

- Put it on a `hold` beat: a cream flash, then a 7% push-in on the face, eased out before the beat ends. `amount` sets the push.
- With `timecode: true`, the panel's timecode reads "Frozen 00:00:02:09".

### `compare`: before/after

```json
{ "type": "compare", "beat": 0, "delay": 1.75, "a": "As generated", "aNote": "Lips moving, no voice", "b": "As cut", "bNote": "Starts on his first word", "bDelay": 0.5 }
```

- Labels for a two-panel beat (the beat sets `b: { clip, hold, zoom }`). In 9:16, set `props.pair: "side"`:
  - the take shrinks from full frame into the left of two whole frames, set side by side on black;
  - labels sit above the frames, timecodes above their corners.
- `aAt`/`bAt` ([x, y] in frame units) move a label.
- Both panels must be real frames: before = as generated, after = the edit as made.

### `timeline`: the take as an editing ruler

```json
{ "type": "timeline", "beat": 0, "delay": 0.6, "until": 1, "clip": "c90", "label": "Lip movement against voice", "band": "top",
  "cut": 3.21, "cutAt": 0.3, "marks": [{ "at": 0.85, "text": "Hum", "delay": 0.9 }] }
```

- One bar per source frame: voice in cream, silent mouth movement in orange, nothing elsewhere. Hairline ticks mark each second.
- The playhead follows the clip on screen; the head row shows the source timecode.
- `cut` draws the trim line and label ("Cut at 3.21 s"), and dims what the trim removed.
- `marks` flag moments such as hums; the title row gives way to them.
- `band` is `top` (top: 500px; for takes whose head sits low) or `low` (bottom: 520px, above the subtitles; for takes whose head sits high).

### `arrow`: technical annotation

```json
{ "type": "arrow", "beat": 0, "delay": 0.3, "until": 0, "to": "mouth", "text": "Lips closed", "sub": "until the line" }
```

- A short note beside the face, level with the target, with a hairline that draws itself onto the near mouth corner.
- `to` is `mouth`, `face` or [x, y]. `from` (left or right), `note` ([x, y] frame units), `lift`, `bend` and `gap` adjust it.
- Keep notes to two or three words. The line must not cross an eye.

### `chapter`: chapter transition

```json
{ "type": "chapter", "beat": 0, "for": 1.9, "n": "01", "title": "What you see" }
```

- A rule draws across the top band; the number and title rise and leave.
- Use it on the first scene of each chapter, together with `transition: "wipe"`:
  - in 9:16, the next scene is revealed from the bottom under a cream edge;
  - nothing fades or slides.

## Document-level chrome

| Option | Effect |
|---|---|
| `subs: "words"` | Subtitles from the narration, phrase by phrase (at most 30 characters, one line), each word rising as it is spoken. `*asterisks*` mark emphasis (orange, heavier); the voice gets the plain words. A scene with `props.subs: false` hides them (the end card). |
| `timecode: true` | Running source timecode in each panel's top right. |
| `theme: "notes"` | Production Notes chrome: QB mark and "Production Notes" top left, the preview tag top right, sentence-case source labels, no stage spine. |
| `watermark: { "file": "...", "label": "..." }` | The approved HARLEM '88 logo, bottom centre, at 55%. A missing file shows a dashed slot in previews and fails final renders. |
| `template: "endcard"` | The sign-off scene: `props.lines` (objects with `text`) rise in the headline voice; `props.series` sits under a rule; the Quiet Bands lockup below. |

## 9:16 layout (1080×1920)

| Zone | y (px) | Holds |
|---|---|---|
| top chrome | 150–260 | corner, preview tag, source label, timecode |
| top band | 300–650 | chapter (300), headline (300), `top` timeline (500) |
| face | usually 650–1330 | footage only, plus track brackets and arrow lines |
| lower band | 1270–1400 | `low` timeline |
| subtitles | about 1430–1490 | one line, 56px |
| platform UI | 1500+ | watermark only (bottom 64) |

Keep text left of x = 960, clear of the platform's buttons.

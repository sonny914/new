---
name: qb-packaging
description: Make the thumbnail and title options for a finished video, cut from real frames of the footage and checked against the cut. Use when the founder asks for a thumbnail, cover, title, title options, or to "package" a video, episode or recap for YouTube, Shorts, Reels or TikTok, or asks why a video isn't getting clicked. Produces up to three thumbnail variants, a feed-size review sheet, checked titles and an approval checklist. Never generates or retouches imagery, never shows a moment the video doesn't contain, never predicts a click rate, and never uploads or publishes.
---

# QB Packaging: thumbnails and titles from the real footage

The thumbnail and the title are one promise, made before the video plays. Here the promise is kept: the picture is a frame the video contains, and the words claim only what the video shows. Code: `tools/capture/lib/thumbs.mjs`, template `tools/capture/stage/thumb.html`.

## Rules that do not bend

- **Real frames only.** A thumbnail is one frame of the footage as decoded, with type beside or over it. Never generate, upscale, retouch, composite or relight an image for a thumbnail, and never use an image model to "improve" a face or an expression.
- **The frame is in the video.** A frame from a storyboard clip must fall inside a stretch the cut shows; the check refuses one that doesn't. A frame from a loose file is flagged as unchecked: confirm it yourself or don't use it.
- **The title claims what the video shows.** No outcome the footage doesn't have, no "you won't believe". Every number in a thumbnail or title needs a fact: the storyboard's `facts`, or a `facts` entry in the spec with its source.
- **No predicted click rates.** Nothing here scores or forecasts a click rate. The only real answer is a test on the published video.
- **Faces stay clear.** Type never sits on a measured face; the render refuses it. Check the sheet for faces the measurement missed.
- **Logos.** The HARLEM ’88 logo is the approved file (`"logo"`) or absent, never typeset. The Quiet Bands mark (`"mark": true`) is the supplied vector in cream. Load `qb-identity` before changing the look.
- **Other artists' work.** SPIRITED Visual Library images never appear in a thumbnail.
- **Nothing is uploaded.** The package waits for the founder's choice. Publishing needs their yes for that video.

## Workflow

### 1. Start from a finished cut

You need the storyboard (so frames are checked against the cut) and, ideally, the render. For a session recap, the render alone is enough: frames taken from the cut are in the cut.

### 2. Pick the frames

Make a contact sheet of each clip the cut uses and look:

```
ffmpeg -i <take> -vf "select='not(mod(n\,12))',scale=240:-1,tile=11x1" -frames:v 1 sheet.jpg
```

Good frames are the ones the episode is about: the clearest frame of the fault, the freeze, the after. One subject, readable at the size of a postage stamp. Note the time of each (`at`, in seconds of the clip).

### 3. Write the words

- **Thumbnail text:** two to four words, on one or two lines (`\n`). It says what the picture can't, and it doesn't repeat the title. `*Asterisks*` set the one phrase that names the fault in orange.
- **Titles:** three options, each under 60 characters, concrete, in the founder's voice (first person, blunt, no hype). If `qb-scout` found the phrase people search, use that wording near the front where it is true of the video.
- **Variants differ in one idea each:** a different frame, or different words. Three variants that change everything teach nothing when one wins.

### 4. Write the spec

`thumbs.json`, next to the storyboard (paths are relative to it):

```json
{ "schema": "qb-capture/thumbs@1", "title": "Production Notes 01: The silent mouth",
  "storyboard": "the-silent-mouth.json", "video": "documentary/documentary-16x9.mp4",
  "variants": [
    { "id": "a", "clip": "c1", "at": 1.42, "text": "He talks.\nNo *sound*." },
    { "id": "b", "clip": "c1", "at": 1.42, "text": "Spot the\n*mistake*", "layout": "side" },
    { "id": "c", "file": "documentary/documentary-16x9.mp4", "at": 12.3, "text": "The *cut* that fixed it" } ],
  "titles": ["His mouth moves. Nothing comes out.", "The AI lip sync mistake I almost shipped", "I cut the shot. Here's why."] }
```

| Field | Meaning |
|---|---|
| `clip` / `file` | a storyboard clip (checked against the cut), or a video file; with neither, the frame comes from `video` |
| `at` | seconds into that clip or file |
| `layout` | `over`: the frame fills the canvas, type in a shaded band. `side`: the frame takes one side, type on black beside it |
| `band` | where the type goes: `top`/`bottom` for `over`, `left`/`right` (16:9) or `top`/`bottom` (9:16) for `side`. Left out, `over` picks the half the face isn't in |
| `focus`, `zoom` | the point of the frame to keep in view (`[x, y]`, 0 to 1) and a punch-in. A measured face is framed without them |
| `facts` | `[{ "text": "3", "from": "record:…" }]`, for numbers the storyboard doesn't already cite |

A vertical take in a 16:9 thumbnail is a heavy crop: use `side`.

### 5. Check, render, look

```
node tools/capture/cli.mjs thumbs <thumbs.json> --check
node tools/capture/cli.mjs thumbs <thumbs.json> --formats 16x9,9x16
```

This writes, in `packaging/` beside the spec:

- `thumb-<id>-16x9.jpg` (1280×720, under 2 MB) and `thumb-<id>-9x16.jpg` (1080×1920, type inside the centred 4:5 area);
- `thumbs-sheet.jpg`: every variant at feed sizes, on dark and on light;
- `packaging.md`: each frame's file, time and hash, the titles, the numbers and their sources, warnings;
- `packaging.json`: thumbnails, title and publish, all `pending`.

Open the sheet and judge the smallest size first. If the words can't be read there, cut words. A refused variant (type on the face, text that won't fit) is not written: fix the spec, don't work around the check. Expect two passes.

### 6. Present

Send `thumbs-sheet.jpg` and `packaging.md` (SendUserFile) with one recommended pairing of thumbnail and title, and the reason. The founder chooses.

### 7. After publishing

Publishing is the founder's, by hand. Then, as these features stood when this was written (they change; check the app):

- **Long-form on YouTube:** Studio's thumbnail test compares up to three thumbnails on the live video and reports which one earned more watch time. Upload the chosen variants there. That result, not anything here, says which thumbnail works.
- **Shorts:** the cover is a frame picked in the app at upload, not an uploaded image. Use the 9:16 file to know which frame to pick.
- **Reels and TikTok:** the 9:16 file is the cover.

When the founder shares the result, record which variant won and what differed. That is the evidence the next set of variants starts from.

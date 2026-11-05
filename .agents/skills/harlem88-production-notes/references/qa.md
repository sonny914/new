# Production Notes QA

Run it on stills first, then on the preview. Each item is pass/fail. Fix and re-render until all pass.

## Evidence

- [ ] `doc --check` passes, with no problems. Warnings are listed in the hand-off.
- [ ] Every clip is a real take from the export; labels name it truthfully ("as generated", "as cut").
- [ ] The "after" is the edit as made. For a trim, it is the same take from the trim point the record names; not a regenerated or similar take.
- [ ] Every line of narration says only what its source says (`script.md` columns); the founder's words are quoted verbatim.
- [ ] Every number on screen and in the subtitles has a fact. Measurement facts match the file.

## Faces and layout (look at every still)

- [ ] No graphic, subtitle or arrow line covers an eye or the mouth on any frame. Check scenes where the face moves or the picture punches in.
- [ ] Headlines and chapter titles sit in the band without the face. Timelines stay clear of the chin.
- [ ] Subtitles are one line, above the platform UI (bottom 430px), left of x = 960.
- [ ] Two statement graphics never share the screen: a chapter and a compare are staggered.
- [ ] Labels don't collide: check the timeline's cut label against the timecode, and hum marks against the title row.
- [ ] Pair scenes in 9:16 use `pair: "side"`, so subtitles never sit on the lower panel's face.

## Motion and sound

- [ ] Transitions are the chapter wipe, every time: no fades, slides or random effects.
- [ ] One kinetic moment at a time: words rise, brackets settle, lines draw. No particles, glows or looping motion.
- [ ] Narration never lands on dialogue (the check enforces it); where the footage's own sound matters (the late line, the silence), it plays.
- [ ] The cold open's silence is real: `bed: false` on the scene, and no narration until the freeze.
- [ ] Preview loudness: footage dialogue sits at the narration level, and the limiter doesn't pump.

## Brand

- [ ] Black, cream and orange only; orange marks the fault and the subtitle emphasis.
- [ ] The HARLEM '88 logo is the approved file, or the empty slot in a preview. Never typeset.
- [ ] The Quiet Bands mark and wordmark are the supplied SVGs.

## Hand-off

- [ ] The preview is labelled silent, with narration not recorded.
- [ ] The narration cost is quoted, not spent.
- [ ] `notes package` has run and `approval.json` items are `pending`.
- [ ] Missing assets are listed by name, with what each would unlock.

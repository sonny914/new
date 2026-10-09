# False confidence reel: QA report

Checked on the rendered files, not the code preview. One 540×960 preview, one final render.

| Check | Result |
|---|---|
| First two seconds | Frame 1 shows a plan mid-build with "ChatGPT will help you build"; TERRIBLE IDEA lands at 1.75 s, 9 ms after the start of "terrible" (measured). Pass |
| Graphics vs. words | Every graphic is cued from the word clock (`edit.json`); each event is on the word it illustrates. Pass |
| Face visibility | All UI and captions sit at y ≥ 1060, below the mouth (≈1055 after scaling); the only full-frame graphic is the last 4 s, after the final line is spoken. Pass |
| Captions | Built from the same words as the audio; the build fails if a caption word doesn't match the spoken word. Max two lines, inside 120–960 px. Pass |
| Jump cuts | 14 cuts; frames either side inspected; punch-ins alternate. Pass |
| Audio at cuts | 12 ms fades at each join; the largest sample jump within ±5 ms of any cut is 0.25 × the file's 99.9th percentile (no clicks). Pass |
| Voice sync after cuts | Voice onsets within −50…+90 ms of the aligned word times; picture and sound share one edit list. Pass |
| Clipping / off-screen | No text clipped; the better prompt was overflowing its bar in the first sheet and was fixed (wider bar, 26 px). Pass |
| Loudness | −14.6 LUFS, −1.4 dBTP (master and sharing); first pass hit +1.1 dBTP from AAC at the opening frame, fixed with a 30 ms fade-in and re-muxed. Pass |
| Audio present in compressed export | AAC 48 kHz stereo in all three files. Pass |
| Playback | All three decode end to end with no errors; 1122 frames, 37.4 s each. Pass |
| Size | Master 21.9 MB; sharing cut 10.7 MB (< 30 MB). Pass |
| Source limits | Face is 512×910 upscaled ×2.1 (Lanczos, light sharpening): softer than the graphics, no invented detail. Noted |
| Against the original | 42.5 s → 37.4 s; same words in the same order; pauses shortened, end held for the reveal. |

Open item for review: the weak prompt is captioned as spoken, "Was this a good idea?". The script has "Is".

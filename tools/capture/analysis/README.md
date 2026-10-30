# Footage analysis

Measurements that documentary mode's on-screen numbers are checked against. Python 3.10+, run in a virtual environment:

```
python3 -m venv tools/capture/analysis/.venv
tools/capture/analysis/.venv/bin/pip install mediapipe==1.2.0 numpy opencv-python-headless pillow
curl -o tools/capture/analysis/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

Both scripts load `face_landmarker.task` from this folder. Neither the model nor the environment is committed. Run them with `-I`, so nothing next to the footage can be imported:

```
tools/capture/analysis/.venv/bin/python -I tools/capture/analysis/mouth_sync.py <clip.mp4> <out_dir>
tools/capture/analysis/.venv/bin/python -I tools/capture/analysis/track.py <clip.mp4> <out.json>
```

## `mouth_sync.py`

It writes `<name>.json` and an evidence strip `<name>-strip.png`.

- **Mouth opening:** the inner-lip gap (landmarks 13/14) divided by face height (10/152), per frame, on the largest face. MediaPipe's `jawOpen` is recorded alongside.
- **Voice:** clip audio band-passed 150–4000 Hz, RMS per frame. A frame counts as voice above max(−48 dBFS, noise floor + 14 dB). Gaps under 0.25 s are bridged and segments under 0.15 s are dropped.
- **Mouth moving:** the rolling standard deviation of the opening over 1/3 s, above max(0.006, 2.5 × its 20th percentile).
- **"Silent mouth movement":** moving frames outside a 0.2 s guard band around voice. It counts any change of mouth shape, smiles included, so treat it as an upper bound and confirm long cases by eye.
- **Lip/voice lag:** the cross-correlation peak within ±0.5 s. A correlation under 0.4 is inconclusive.

## `track.py`

Per-frame mouth centre and width (landmarks 13/14 and 61/291) and the eye centres (33/133 and 362/263), in 0–1 frame units. Documentary mode uses them to place the mouth ring and the eye marks.

## Production QC: `qc_measure.py` and `qc_check.py`

These turn the failures QB Capture documented on THE BLOCK into checks that every new take passes through before anyone approves it.

**Setup:** `qc_measure.py` also needs MediaPipe's hand and pose models next to it:
```
curl -o tools/capture/analysis/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
curl -o tools/capture/analysis/pose_landmarker_lite.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
```

**Run:**
```
.venv/bin/python -I tools/capture/analysis/qc_measure.py take.mp4 take.qc.json --every 2 [--start-frame approved.png]
python3 -I tools/capture/analysis/qc_check.py take.qc.json shot-spec.json verdict.json [--ref approved-take.qc.json]
```

`qc_measure.py` also writes `take.qc-sheet.jpg`: the first, middle and last frames, for the wardrobe and continuity checklist.

**Verdicts:**
- **PASS / FAIL:** the measurement settles it.
- **REVIEW:** a person must look or listen.

The tool never approves a take. The dramatic review (DR-1), the wardrobe checklist (WD-1) and the script check (SC-1) are always a person's call, and a FAIL can be overridden only with a written reason.

**Calibration** (THE BLOCK takes, 30 Oct). Each threshold fails the take that showed the problem and passes its approved fix:

| Check | Fails | Passes | Notes |
|---|---|---|---|
| LS-1 silent mouth | #90 (1.58 s), #65 (1.58 s) | Ep 2 Shot 2 (0.25 s), #81 | Also fails #73, the take in the locked Part 1 (1.16 s): it predates the rule. |
| PF-1 performance against the approved take | #88 ×1.57 against #89 | #65 ×1.15 against #73 | Geometric mean of mouth, jaw and lean. Blendshape peaks alone did not separate #88 from #89. |
| HD-1 hand up | #89 (2.9 s) | #88 | The founder approved #89 anyway, which is exactly what the override-with-reason is for. |
| CM-1 locked camera | #88 (scale 0.979) | #89 (0.999) | Locked per D-090. |
| FC identity | | | A screen, not a verdict. Same character 1–10%, the other character 11–30%. Not measurable when the head is turned away. |
| DR-1 dramatic intent | #70 "too hostile" | | #70 passes every technical check. Only the dramatic review catches it. |

**Not measurable here, so checked by eye at a gate:**
- spacing in over-the-shoulder framing (Ep 3 Shot 4);
- a wardrobe error baked into the start frame (#70/#71);
- the script's words, until a recogniser runs.

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

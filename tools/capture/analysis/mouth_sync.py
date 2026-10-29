"""Mouth movement vs speech for one clip: measurements + an evidence strip.

Usage: venv/bin/python mouth_sync.py clip.mp4 out_dir
Writes out_dir/<name>.json (per-frame series, speech segments, summary) and out_dir/<name>-strip.png.
Mouth opening = inner-lip gap (landmarks 13/14) / face height (10/152); also MediaPipe's jawOpen blendshape.
Speech = audio band energy (150-4000 Hz) above max(-48 dBFS, noise floor + 14 dB), gaps < 0.25 s bridged.
"""
import json, subprocess, sys, os
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
from PIL import Image, ImageDraw, ImageFont

clip, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
name = os.path.splitext(os.path.basename(clip))[0]
here = os.path.dirname(os.path.abspath(__file__))

cap = cv2.VideoCapture(clip)
fps = cap.get(cv2.CAP_PROP_FPS) or 24
opts = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=os.path.join(here, 'face_landmarker.task')),
                                    running_mode=vision.RunningMode.VIDEO, num_faces=2, output_face_blendshapes=True)
lm = vision.FaceLandmarker.create_from_options(opts)
opening, jaw, faces, thumbs, boxes = [], [], [], [], []
i = 0
while True:
    ok, frame = cap.read()
    if not ok: break
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
    h, w = rgb.shape[:2]
    best = None
    for k, pts in enumerate(res.face_landmarks or []):
        ys = [p.y for p in pts]; size = max(ys) - min(ys)
        if best is None or size > best[0]: best = (size, k, pts)
    if best:
        _, k, p = best
        face_h = abs(p[152].y - p[10].y) * h
        gap = abs(p[14].y - p[13].y) * h
        opening.append(gap / face_h if face_h else np.nan)
        bs = {c.category_name: c.score for c in res.face_blendshapes[k]} if res.face_blendshapes else {}
        jaw.append(bs.get('jawOpen', np.nan))
        xs = [q.x * w for q in p]; yy = [q.y * h for q in p]
        boxes.append((min(xs), min(yy), max(xs), max(yy)))
        faces.append(len(res.face_landmarks))
    else:
        opening.append(np.nan); jaw.append(np.nan); boxes.append(None); faces.append(0)
    thumbs.append(rgb if i % max(1, int(fps // 2)) == 0 else None)
    i += 1
n = i
t = np.arange(n) / fps

# audio envelope at frame rate
wav = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', clip, '-af', 'highpass=f=150,lowpass=f=4000', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
a = np.frombuffer(wav, dtype=np.int16).astype(np.float32) / 32768 if wav else np.zeros(1)
spf = 16000 / fps
env = np.array([np.sqrt(np.mean(a[int(j * spf):int((j + 1) * spf)] ** 2)) if int(j * spf) < len(a) else 0 for j in range(n)])
db = 20 * np.log10(env + 1e-9)
floor = np.percentile(db, 10) if len(db) else -90
thr = max(-48.0, floor + 14)
speech = db > thr
# bridge short gaps, drop blips
def runs(mask):
    r, s = [], None
    for j, m in enumerate(mask):
        if m and s is None: s = j
        if not m and s is not None: r.append([s, j]); s = None
    if s is not None: r.append([s, len(mask)])
    return r
seg = runs(speech)
merged = []
for s, e in seg:
    if merged and (s - merged[-1][1]) / fps < 0.25: merged[-1][1] = e
    else: merged.append([s, e])
merged = [x for x in merged if (x[1] - x[0]) / fps >= 0.15]
speech = np.zeros(n, bool)
for s, e in merged: speech[s:e] = True

# mouth "moving": rolling std of opening over ~0.33 s
op = np.array(opening, float)
valid = ~np.isnan(op)
win = max(3, int(fps / 3))
mov = np.full(n, np.nan)
for j in range(n):
    seg_ = op[max(0, j - win // 2): j + win // 2 + 1]
    seg_ = seg_[~np.isnan(seg_)]
    if len(seg_) >= 3: mov[j] = np.std(seg_)
face_frames = valid.sum()
base = np.nanpercentile(mov, 20) if np.any(~np.isnan(mov)) else 0
moving = (mov > max(0.006, base * 2.5)) & ~np.isnan(mov)
# a guard band around speech so co-articulation at the edges does not count as silent movement
guard = int(0.2 * fps)
near_speech = np.zeros(n, bool)
for s, e in merged: near_speech[max(0, s - guard):min(n, e + guard)] = True
silent_moving = moving & ~near_speech
still_speech = speech & valid & ~moving

# lag between mouth articulation and audio envelope (positive: audio comes after the lips)
lag = None
if face_frames > n * 0.6 and speech.any():
    art = np.nan_to_num(np.abs(np.diff(op, prepend=op[0])), nan=0.0)
    e_ = env / (env.max() + 1e-9); art = art / (art.max() + 1e-9)
    best = (-1, 0)
    for L in range(-int(fps * 0.5), int(fps * 0.5) + 1):
        x = np.roll(art, L)
        c = np.corrcoef(x, e_)[0, 1] if np.std(x) > 0 and np.std(e_) > 0 else -1
        if c > best[0]: best = (c, L)
    lag = {'frames': int(best[1]), 'seconds': round(best[1] / fps, 3), 'corr': round(float(best[0]), 3)}

summary = {
    'clip': os.path.basename(clip), 'fps': fps, 'frames': n, 'seconds': round(n / fps, 3),
    'face_coverage': round(float(face_frames / n), 3) if n else 0,
    'has_audio': bool(wav), 'speech_threshold_db': round(float(thr), 1), 'noise_floor_db': round(float(floor), 1),
    'speech_segments': [[round(s / fps, 2), round(e / fps, 2)] for s, e in merged],
    'speech_seconds': round(float(speech.sum() / fps), 2),
    'mouth_moving_seconds': round(float(moving.sum() / fps), 2),
    'silent_mouth_movement_seconds': round(float(silent_moving.sum() / fps), 2),
    'silent_mouth_movement_spans': [[round(s / fps, 2), round(e / fps, 2)] for s, e in runs(silent_moving) if (e - s) / fps >= 0.25],
    'speech_with_still_mouth_seconds': round(float(still_speech.sum() / fps), 2),
    'lip_audio_lag': lag,
}
json.dump({'summary': summary, 't': t.round(3).tolist(), 'opening': [None if np.isnan(x) else round(float(x), 4) for x in op],
           'jaw_open': [None if np.isnan(x) else round(float(x), 3) for x in jaw], 'audio_db': db.round(1).tolist(), 'speech': speech.astype(int).tolist(),
           'moving': moving.astype(int).tolist(), 'boxes': [None if b is None else [round(v) for v in b] for b in boxes]}, open(os.path.join(out, f'{name}.json'), 'w'))

# evidence strip: frames every 0.5 s, then mouth opening and speech on one time axis
th = [x for x in thumbs if x is not None]
tw = 120; scale = tw / th[0].shape[1]; tht = int(th[0].shape[0] * scale)
W = max(tw * len(th), 900); H = tht + 220
img = Image.new('RGB', (W, H), (0, 0, 0)); d = ImageDraw.Draw(img)
for k, fr in enumerate(th): img.paste(Image.fromarray(fr).resize((tw, tht)), (k * tw, 0))
y0 = tht + 20; ph = 160; X = lambda j: int(j / max(1, n - 1) * (W - 1))
for s, e in merged: d.rectangle([X(s), y0, X(e), y0 + ph], fill=(60, 45, 20))
for s, e in runs(silent_moving):
    if (e - s) / fps >= 0.25: d.rectangle([X(s), y0, X(e), y0 + ph], fill=(110, 30, 0))
mx = np.nanmax(op) if np.any(valid) else 1
pts = [(X(j), y0 + ph - int((op[j] / mx) * (ph - 10))) for j in range(n) if not np.isnan(op[j])]
if len(pts) > 1: d.line(pts, fill=(242, 238, 229), width=2)
ep = [(X(j), y0 + ph - int(((db[j] - floor) / max(1, db.max() - floor)) * (ph - 10))) for j in range(n)]
d.line(ep, fill=(255, 90, 0), width=1)
d.text((6, y0 + ph + 8), f"{name}  cream=mouth opening  orange=audio  amber=speech  red=mouth moving, no speech  "
       f"silent-move {summary['silent_mouth_movement_seconds']}s  lag {lag['seconds'] if lag else '-'}s", fill=(200, 200, 200))
img.save(os.path.join(out, f'{name}-strip.png'))
print(json.dumps(summary))

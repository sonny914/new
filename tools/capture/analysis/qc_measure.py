"""Measure one generated take for production QC: everything qc_check.py judges, as per-frame series.

Usage: .venv/bin/python -I qc_measure.py <take.mp4> <out.json> [--start-frame approved.png] [--every 1]

Per frame (sampled every N frames):
- faces (up to 3, largest first): box, height, centre, yaw proxy, mouth opening, geometry ratios (identity proxy) and the
  performance blendshapes (eyes wide, brows up, jaw open, smile, lip press);
- hands (up to 4): wrist and fingertip-box positions; pose shoulders and wrists for the main figure;
- camera: frame-to-frame similarity transform from ORB features (scale, x/y shift), accumulated over the take.
Whole take: voice segments and short audible bursts (hums, breaths) from mouth_sync's method, and the first frame's
SSIM against the approved start frame.
"""
import json, os, subprocess, sys
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions

args = sys.argv[1:]
take, out = args[0], args[1]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
start_frame, every = opt('--start-frame'), int(opt('--every', '1'))
here = os.path.dirname(os.path.abspath(__file__))
model = lambda n: BaseOptions(model_asset_path=os.path.join(here, n))
V = vision.RunningMode.VIDEO
face = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=model('face_landmarker.task'), running_mode=V, num_faces=3, output_face_blendshapes=True))
hands = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(base_options=model('hand_landmarker.task'), running_mode=V, num_hands=4))
pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(base_options=model('pose_landmarker_lite.task'), running_mode=V, num_poses=2))

BLEND = ['eyeWideLeft', 'eyeWideRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'jawOpen', 'mouthSmileLeft', 'mouthSmileRight',
         'mouthPressLeft', 'mouthPressRight', 'mouthFunnel', 'mouthPucker', 'eyeSquintLeft', 'eyeSquintRight', 'eyeBlinkLeft', 'eyeBlinkRight']
dist = lambda p, a, b: float(np.hypot(p[a].x - p[b].x, p[a].y - p[b].y))

def face_record(p, bs, W, H):
    xs, ys = [q.x for q in p], [q.y for q in p]
    fh = abs(p[152].y - p[10].y) or 1e-6
    cheek = dist(p, 234, 454) or 1e-6
    return {
        'box': [round(min(xs), 4), round(min(ys), 4), round(max(xs), 4), round(max(ys), 4)],
        'height': round(fh, 4), 'cx': round((min(xs) + max(xs)) / 2, 4), 'cy': round((min(ys) + max(ys)) / 2, 4),
        # nose tip against the cheek midpoint, in face widths: + means the face turns to screen right
        'yaw': round((p[1].x - (p[234].x + p[454].x) / 2) / cheek, 3),
        'open': round(abs(p[14].y - p[13].y) / fh, 4),
        # identity proxy: proportions of the rigid upper face (eyes, nose bridge, forehead), which expressions barely move
        # but a different or drifting face does; the jaw and mouth are left out because talking and smiling move them
        'geo': [round(dist(p, 33, 263) / cheek, 3), round(dist(p, 168, 1) / (dist(p, 33, 263) or 1e-6), 3), round(dist(p, 133, 362) / (dist(p, 33, 263) or 1e-6), 3),
                round(dist(p, 10, 168) / (dist(p, 33, 263) or 1e-6), 3)],
        'bs': {k: round(v, 3) for k, v in ((c.category_name, c.score) for c in bs) if k in BLEND},
    }

cap = cv2.VideoCapture(take); fps = cap.get(cv2.CAP_PROP_FPS) or 24
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0); keep = {0, total // 2, max(0, total - 1)}; kept = {}
orb = cv2.ORB_create(1500); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
frames, prev, first, i = [], None, None, 0
cam = {'scale': 1.0, 'dx': 0.0, 'dy': 0.0}
while True:
    ok, fr = cap.read()
    if not ok: break
    H, W = fr.shape[:2]
    if first is None: first = fr.copy()
    if i in keep: kept[i] = fr.copy()
    g = cv2.cvtColor(cv2.resize(fr, (W // 2, H // 2)), cv2.COLOR_BGR2GRAY)
    if prev is not None:
        k1, d1 = orb.detectAndCompute(prev, None); k2, d2 = orb.detectAndCompute(g, None)
        if d1 is not None and d2 is not None and len(k1) > 20 and len(k2) > 20:
            m = sorted(bf.match(d1, d2), key=lambda x: x.distance)[:400]
            if len(m) >= 12:
                A, _ = cv2.estimateAffinePartial2D(np.float32([k1[x.queryIdx].pt for x in m]), np.float32([k2[x.trainIdx].pt for x in m]), method=cv2.RANSAC, ransacReprojThreshold=2.0)
                if A is not None:
                    s = float(np.hypot(A[0, 0], A[1, 0]))
                    cam['scale'] *= s; cam['dx'] += float(A[0, 2]) / g.shape[1]; cam['dy'] += float(A[1, 2]) / g.shape[0]
    prev = g
    rec = {'t': round(i / fps, 3), 'cam': {k: round(v, 4) for k, v in cam.items()}}
    if i % every == 0:
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)); ts = int(i * 1000 / fps)
        r = face.detect_for_video(img, ts)
        fs = [face_record(p, r.face_blendshapes[k] if r.face_blendshapes else [], W, H) for k, p in enumerate(r.face_landmarks or [])]
        rec['faces'] = sorted(fs, key=lambda f: -f['height'])
        rh = hands.detect_for_video(img, ts)
        rec['hands'] = [{'wrist': [round(h[0].x, 4), round(h[0].y, 4)], 'box': [round(min(q.x for q in h), 4), round(min(q.y for q in h), 4), round(max(q.x for q in h), 4), round(max(q.y for q in h), 4)]}
                        for h in (rh.hand_landmarks or [])]
        rp = pose.detect_for_video(img, ts)
        rec['pose'] = [{'shoulders': [[round(p[11].x, 4), round(p[11].y, 4)], [round(p[12].x, 4), round(p[12].y, 4)]],
                        'wrists': [[round(p[15].x, 4), round(p[15].y, 4), round(p[15].visibility or 0, 2)], [round(p[16].x, 4), round(p[16].y, 4), round(p[16].visibility or 0, 2)]]}
                       for p in (rp.pose_landmarks or [])]
    frames.append(rec); i += 1

# audio: voice segments as mouth_sync.py measures them, plus every short audible burst it drops (hums, breaths, clicks)
wav = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', take, '-af', 'highpass=f=150,lowpass=f=4000', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
a = np.frombuffer(wav, dtype=np.int16).astype(np.float32) / 32768 if wav else np.zeros(1)
spf = 16000 / fps; n = i
env = np.array([np.sqrt(np.mean(a[int(j * spf):int((j + 1) * spf)] ** 2)) if int(j * spf) < len(a) else 0 for j in range(n)])
db = 20 * np.log10(env + 1e-9); floor = float(np.percentile(db, 10)) if n else -90; thr = max(-48.0, floor + 14)
def runs(mask):
    r, s = [], None
    for j, m in enumerate(mask):
        if m and s is None: s = j
        if not m and s is not None: r.append([s, j]); s = None
    if s is not None: r.append([s, len(mask)])
    return r
loud = db > thr
merged = []
for s, e in runs(loud):
    if merged and (s - merged[-1][1]) / fps < 0.25: merged[-1][1] = e
    else: merged.append([s, e])
voice = [x for x in merged if (x[1] - x[0]) / fps >= 0.15]
bursts = [x for x in runs(loud) if not any(v[0] <= x[0] and x[1] <= v[1] for v in voice)]

ssim = None
if start_frame and first is not None:
    ref = cv2.imread(start_frame)
    if ref is not None:
        a1 = cv2.cvtColor(cv2.resize(first, (360, int(360 * first.shape[0] / first.shape[1]))), cv2.COLOR_BGR2GRAY).astype(np.float64)
        b1 = cv2.cvtColor(cv2.resize(ref, (a1.shape[1], a1.shape[0])), cv2.COLOR_BGR2GRAY).astype(np.float64)
        c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
        mu1, mu2 = cv2.GaussianBlur(a1, (11, 11), 1.5), cv2.GaussianBlur(b1, (11, 11), 1.5)
        s11 = cv2.GaussianBlur(a1 * a1, (11, 11), 1.5) - mu1 ** 2; s22 = cv2.GaussianBlur(b1 * b1, (11, 11), 1.5) - mu2 ** 2; s12 = cv2.GaussianBlur(a1 * b1, (11, 11), 1.5) - mu1 * mu2
        ssim = round(float((((2 * mu1 * mu2 + c1) * (2 * s12 + c2)) / ((mu1 ** 2 + mu2 ** 2 + c1) * (s11 + s22 + c2))).mean()), 4)

# review sheet for the wardrobe and continuity checklist: first, middle and last frame side by side
if kept:
    hs = 640; tiles = [cv2.resize(kept[k], (int(hs * kept[k].shape[1] / kept[k].shape[0]), hs)) for k in sorted(kept)]
    cv2.imwrite(os.path.splitext(out)[0] + '-sheet.jpg', np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 88])

json.dump({'take': os.path.basename(take), 'fps': fps, 'frames': n, 'seconds': round(n / fps, 3), 'width': W, 'height': H, 'has_audio': bool(wav),
           'audio': {'floor_db': round(floor, 1), 'threshold_db': round(thr, 1), 'db': db.round(1).tolist(),
                     'voice': [[round(s / fps, 2), round(e / fps, 2)] for s, e in voice], 'bursts': [[round(s / fps, 2), round(e / fps, 2)] for s, e in bursts]},
           'start_frame_ssim': ssim, 'series': frames}, open(out, 'w'))
print(out, n, 'frames')

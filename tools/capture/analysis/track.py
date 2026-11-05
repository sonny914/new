"""Per-frame mouth and eye positions for one clip, for the documentary's callouts (mouth ring, eye marks).

Usage: venv/bin/python -I track.py clip.mp4 out.json
Writes {fps, width, height, frames, mouth: [[x, y, w] | null], eyes: [[lx, ly, rx, ry] | null]}, all in 0-1 frame units.
Mouth centre = midpoint of the inner lips (landmarks 13/14); width = lip corners (61/291).
Eyes = midpoints of each eye's corners (33/133 and 362/263). The largest face in frame is used, as in mouth_sync.py.
"""
import json, os, sys
import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions

clip, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
cap = cv2.VideoCapture(clip)
fps = cap.get(cv2.CAP_PROP_FPS) or 24
opts = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=os.path.join(here, 'face_landmarker.task')),
                                    running_mode=vision.RunningMode.VIDEO, num_faces=2)
lm = vision.FaceLandmarker.create_from_options(opts)
mouth, eyes, W, H, i = [], [], 0, 0, 0
while True:
    ok, frame = cap.read()
    if not ok: break
    H, W = frame.shape[:2]
    res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), int(i * 1000 / fps))
    best = max(res.face_landmarks or [], key=lambda p: max(q.y for q in p) - min(q.y for q in p), default=None)
    if best:
        p = best
        mid = lambda a, b: ((p[a].x + p[b].x) / 2, (p[a].y + p[b].y) / 2)
        mx, my = mid(13, 14)
        mouth.append([round(mx, 4), round(my, 4), round(abs(p[291].x - p[61].x), 4)])
        (lx, ly), (rx, ry) = mid(33, 133), mid(362, 263)
        eyes.append([round(lx, 4), round(ly, 4), round(rx, 4), round(ry, 4)])
    else:
        mouth.append(None); eyes.append(None)
    i += 1
json.dump({'clip': os.path.basename(clip), 'fps': fps, 'width': W, 'height': H, 'frames': i, 'mouth': mouth, 'eyes': eyes}, open(out, 'w'))
print(out, i, 'frames', sum(m is not None for m in mouth), 'with a face')

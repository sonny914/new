"""Judge one measured take (qc_measure.py) against its shot spec. Every check exists because a take failed that way before.

Usage: python3 -I qc_check.py <measure.json> <shot-spec.json> [<out.json>] [--ref <approved-measure.json>]

A shot spec is one shot from the scene board, e.g.
  {"shot": "E1-P2-S3", "speaker": "largest" | "left" | "right", "silent": false,
   "lines": [{"who": "Shy", "text": "...", "window": [2.0, 4.6]}],
   "hands": {"rest": "board" | "free", "raised_ok": false},
   "blocking": {"faces": 2, "min_ratio": 0.55, "sides": {"Zuri": "left", "Shy": "right"}},
   "eyeline": "left" | "right" | null, "camera": {"move": "locked" | "push_in" | "pull_out", "after": 2.0},
   "intent": "suspicion", "intent_note": "..."}
Verdicts: PASS, FAIL, or REVIEW, where a person must look or listen because the measurement cannot settle it. A take is never
approved by this tool: the dramatic review is always required, and a person records it.
"""
import json, sys
import numpy as np

# Thresholds, calibrated on THE BLOCK's takes: each one fails the take that showed the problem and passes its approved fix.
# See docs/THE-BLOCK-QC.md (private archive) for the calibration table.
T = {
    'silent_total': 0.30,      # s of mouth movement outside a 0.2 s guard around voice: above this a person looks
    'silent_fail': 0.75,       # above this, or a run longer than silent_span, it fails (#90 1.58 and #65 1.58 fail; E2 Sh2 0.25 passes)
    'silent_span': 0.50,       # s, longest single silent-movement run
    'early_open': 0.20,        # s the mouth may open before its line's voice starts (#65: about 0.6 early)
    'lag_frames': 2,           # lip/voice lag allowed, in frames, when the correlation is trustworthy
    'lag_corr': 0.40,          # below this the lag is not measurable: REVIEW
    'still_voice': 0.25,       # s of voice while the mouth is still (dubbed look)
    'perf_review': 1.25,       # performance against the character's approved take: mouth amplitude and head movement ratios
    'perf_fail': 1.50,         # (#88 "too big" against #89, the approved correction)
    'hand_raised': 0.30,       # s a hand may stay up near the face or shoulder when the shot doesn't ask for it (#89)
    'shot_size': {'CU': [0.26, 0.50], 'MCU': [0.15, 0.30], 'MS': [0.08, 0.18], 'WS': [0.0, 0.10]},  # speaker face height / frame height
    'geo_drift': 0.15,         # identity proxy, frontal frames only: within a take expressions move it 7–17%, so above this a person looks
    'geo_ref': 0.08,           # against the approved take of the same character: same character 1–10%, the other character 11–30%
    'cam_locked_scale': 0.015, 'cam_locked_shift': 0.02,
    'cam_push_min': 0.03,      # a push-in must grow the frame by at least this much after its trigger
    'start_ssim': 0.92,        # first frame against the approved start frame (records: 0.928–0.959 passed)
}
CAL = 'qc_thresholds.json'

def load_cal(path):
    try:
        T.update({k: v for k, v in json.load(open(path)).items() if k in T})
    except FileNotFoundError:
        pass

def speaker_series(M, how):
    out = []
    for f in M['series']:
        fs = f.get('faces')
        if fs is None: continue
        if not fs: out.append((f['t'], None)); continue
        if how == 'left': face = min(fs[:2], key=lambda x: x['cx'])
        elif how == 'right': face = max(fs[:2], key=lambda x: x['cx'])
        else: face = fs[0]
        out.append((f['t'], face))
    return out

def moving_mask(t, op, fps_eff):
    op = np.array([np.nan if v is None else v for v in op], float)
    win = max(3, int(round(fps_eff / 3)))
    mov = np.full(len(op), np.nan)
    for j in range(len(op)):
        s = op[max(0, j - win // 2): j + win // 2 + 1]; s = s[~np.isnan(s)]
        if len(s) >= 3: mov[j] = np.std(s)
    base = np.nanpercentile(mov, 20) if np.any(~np.isnan(mov)) else 0
    return (mov > max(0.006, base * 2.5)) & ~np.isnan(mov), op

def runs(mask, t):
    r, s = [], None
    for j, m in enumerate(mask):
        if m and s is None: s = j
        if not m and s is not None: r.append((t[s], t[j])); s = None
    if s is not None: r.append((t[s], t[-1]))
    return r

def check(M, spec, ref=None):
    R = []
    add = lambda cid, area, guards, measured, limit, verdict, note='': R.append({'id': cid, 'area': area, 'guards_against': guards, 'measured': measured, 'limit': limit, 'verdict': verdict, 'note': note})
    S = speaker_series(M, spec.get('speaker', 'largest'))
    t = np.array([x[0] for x in S]); dt = float(np.median(np.diff(t))) if len(t) > 1 else 1 / M['fps']
    faces = [x[1] for x in S]
    op = [f['open'] if f else None for f in faces]
    voice = [] if spec.get('silent') else M['audio']['voice']
    mov, opn = moving_mask(t, op, 1 / dt)
    near = np.array([any(a - 0.2 <= x <= b + 0.2 for a, b in voice) for x in t])
    inv = np.array([any(a <= x <= b for a, b in voice) for x in t])
    silent = mov & ~near
    spans = runs(silent, t)
    tot = round(float(silent.sum() * dt), 2); longest = round(max([b - a for a, b in spans], default=0), 2)
    # lip sync
    g = 'Ep2 Shot 1 (#90/#91): mouth "talking" for 1.4 s with no words'
    hmed = float(np.median([f['height'] for f in faces if f])) if any(faces) else 0
    v = 'FAIL' if tot > T['silent_fail'] or longest > T['silent_span'] else 'REVIEW' if tot > T['silent_total'] else 'PASS'
    if hmed < 0.10 and v != 'PASS': v = 'REVIEW'  # a face this small can't be read reliably (Ep3 Shot 4: inconclusive)
    add('LS-1', 'lip-sync', g, f'{tot} s silent movement, longest {longest} s', f'pass ≤ {T["silent_total"]} s; fail > {T["silent_fail"]} s or a run > {T["silent_span"]} s',
        v, ('look at ' + ', '.join(f'{a:.2f}–{b:.2f} s' for a, b in spans) + ' (smiles also count, so this is an upper bound)') if spans else '')
    if voice:
        closed = np.nanpercentile(opn, 25) + 0.01 if np.any(~np.isnan(opn)) else 0
        leads = []
        for a, b in voice:
            pre = [j for j, x in enumerate(t) if x < a]
            k = len(pre) - 1
            while k >= 0 and not np.isnan(opn[k]) and opn[k] > closed: k -= 1
            leads.append(round(max(0.0, a - (t[k + 1] if k + 1 < len(t) else a)), 2))
        # an open-but-smiling mouth reads as "open early", so these two only send a person to look
        add('LS-2', 'lip-sync', 'Ep1 Shot 2 #65: mouth opened about 0.6 s before "So"', f'mouth open up to {max(leads)} s before a line', f'≤ {T["early_open"]} s', 'PASS' if max(leads) <= T['early_open'] else 'REVIEW')
        still = round(float((inv & ~mov).sum() * dt), 2)
        add('LS-4', 'lip-sync', 'voice over a still mouth (a dubbed look)', f'{still} s', f'≤ {T["still_voice"]} s', 'PASS' if still <= T['still_voice'] else 'REVIEW')
        # lag: articulation against the voice envelope, sampled at the measured frames
        fps = M['fps']; db = np.array(M['audio']['db']); env = np.interp(t, np.arange(len(db)) / fps, db)
        art = np.nan_to_num(np.abs(np.diff(np.nan_to_num(opn, nan=np.nanmean(opn)), prepend=0)))
        e = (env - env.min()) / (np.ptp(env) + 1e-9); a_ = art / (art.max() + 1e-9)
        best = (-2, 0)
        for L in range(-int(0.5 / dt), int(0.5 / dt) + 1):
            x = np.roll(a_, L)
            c = np.corrcoef(x, e)[0, 1] if np.std(x) > 0 and np.std(e) > 0 else -1
            if c > best[0]: best = (c, L)
        lag_f = round(best[1] * dt * fps, 1)
        add('LS-3', 'lip-sync', 'lips and voice out of step', f'{lag_f:+} frames (r {best[0]:.2f})', f'±{T["lag_frames"]} frames at r ≥ {T["lag_corr"]}',
            # sampled every other frame, this is coarse: it sends a person to look, it never fails a take on its own
            'PASS' if best[0] >= T['lag_corr'] and abs(lag_f) <= T['lag_frames'] else 'REVIEW', 'weak correlation: check by eye' if best[0] < T['lag_corr'] else 'check sync by eye' if abs(lag_f) > T['lag_frames'] else '')
    bursts = M['audio']['bursts']
    add('AU-1', 'sound', 'Ep2 Shot 1 #90: unscripted "mm" hums at 0.85 s and 2.86 s', f'{len(bursts)} short sounds outside the lines', 'none, or each one scripted (Foley)',
        'PASS' if not bursts else 'REVIEW', 'listen at ' + ', '.join(f'{a:.2f} s' for a, b in bursts) if bursts else '')
    # performance: how big the playing is, against the same character's approved take. On the line: mouth opening (p95),
    # MediaPipe jawOpen (p95), and lean (face-size range over its median). Combined as a geometric mean so one noisy
    # measure can't fail a take alone. Calibration: #88 "too big" against #89 = about x1.6 (fail); #65 against #73,
    # two approved readings of the same line = about x1.17 (pass). Side-to-side head movement did not separate them.
    def intensity(MM, sp):
        SS = [x for x in speaker_series(MM, sp) if x[1]]
        vv = MM['audio']['voice']
        on = [f for tt, f in SS if any(a <= tt <= b for a, b in vv)] or [f for tt, f in SS]
        hh = [f['height'] for tt, f in SS] or [1]
        return (float(np.percentile([f['open'] for f in on], 95)), float(np.percentile([f['bs'].get('jawOpen', 0) for f in on], 95)) + 0.02,
                float(np.ptp(hh) / (np.median(hh) or 1)) + 0.02)
    if not spec.get('silent') and any(x[1] for x in S):
        mine = intensity(M, spec.get('speaker', 'largest'))
        if ref:
            theirs = intensity(ref, 'largest')
            ratios = [a / (b or 1e-6) for a, b in zip(mine, theirs)]
            score = float(np.prod(ratios) ** (1 / 3))
            add('PF-1', 'performance', 'Ep1 Shot 5 #88: "like a stage play": wide mouth, big jaw, leaning in',
                f'×{score:.2f} the approved take (mouth ×{ratios[0]:.2f}, jaw ×{ratios[1]:.2f}, lean ×{ratios[2]:.2f})', f'review > ×{T["perf_review"]}, fail > ×{T["perf_fail"]}',
                'FAIL' if score > T['perf_fail'] else 'REVIEW' if score > T['perf_review'] else 'PASS')
        else:
            add('PF-1', 'performance', 'Ep1 Shot 5 #88: "like a stage play"', f'mouth {mine[0]:.3f}, jaw {mine[1]:.2f}, lean {mine[2]:.2f}', 'needs the approved reference take (--ref)', 'REVIEW')
    # hands: up near the face or shoulder when the shot doesn't ask for it
    hs = spec.get('hands', {})
    if not hs.get('raised_ok'):
        up = 0
        for f, fr in zip(faces, [x for x in M['series'] if x.get('faces') is not None]):
            if not f: continue
            fw = f['box'][2] - f['box'][0]
            if any(h['box'][1] < f['box'][3] + 0.08 and abs((h['box'][0] + h['box'][2]) / 2 - f['cx']) < 2.2 * fw for h in fr.get('hands', [])): up += 1
        up_s = round(up * dt, 2)
        add('HD-1', 'hands', 'Ep1 Shot 5 #89: hand floats up to her shoulder, not in the direction', f'{up_s} s hand up near face or shoulder', f'≤ {T["hand_raised"]} s',
            'PASS' if up_s <= T['hand_raised'] else 'FAIL')
    # blocking and eyeline
    size = spec.get('shot_size')
    if size in T['shot_size']:
        hh = [f['height'] for f in faces if f]
        h = round(float(np.median(hh)), 3) if hh else 0
        lo, hi = T['shot_size'][size]
        add('BK-1', 'blocking', 'framing that drifts from the planned shot size (Ep3 Shot 4: Shy too small, too far back)', f'speaker face {h:.0%} of frame height', f'{size}: {lo:.0%}–{hi:.0%}',
            'PASS' if lo <= h <= hi else 'FAIL')
    if spec.get('blocking'):
        add('BK-2', 'blocking', 'Ep3 Shot 4: "they\'re standing too far apart"; S1E3 frame F2 facing the wrong way',
            'distance, positions and facing against the floor plan, on the start frame and the last frame', spec['blocking'].get('note', 'as planned'), 'REVIEW',
            'over-the-shoulder framing hides one face, so spacing is checked by eye at the start-frame gate')
    if spec.get('eyeline') in ('left', 'right'):
        yaw = [f['yaw'] for f in faces if f]
        y = round(float(np.median(yaw)), 3) if yaw else 0
        want = 1 if spec['eyeline'] == 'right' else -1
        add('EY-1', 'eyeline', 'S1E3 frame F2: Shy faced screen right when the plan needed left; a mirrored fix broke his eyeline (D-078)',
            f'face turned {"right" if y > 0 else "left"} ({y:+.3f})', f'turned {spec["eyeline"]}', 'PASS' if y * want > 0.02 else 'REVIEW' if abs(y) <= 0.02 else 'FAIL')
    # identity: rigid upper-face proportions on frontal frames (|yaw| < 0.12). A screen, never a verdict: off-model goes to a person.
    def frontal_geo(MM, sp):
        g = [f['geo'] for tt, f in speaker_series(MM, sp) if f and f.get('geo') and abs(f['yaw']) < 0.12]
        return np.array(g)
    geo = frontal_geo(M, spec.get('speaker', 'largest'))
    if len(geo) < 5:
        add('FC-1', 'face', 'S1E3 frame F1: face drifted narrower and more angular', f'{len(geo)} frontal frames', 'at least 5 to measure', 'REVIEW', 'head turned too far to measure: compare by eye')
    else:
        med = np.median(geo, axis=0)
        drift = round(float(np.percentile(np.max(np.abs(geo - med) / med, axis=1), 95)), 3)
        add('FC-1', 'face', 'S1E3 frame F1: face drifted narrower and more angular', f'{drift:.1%} proportion change within the take', f'≤ {T["geo_drift"]:.0%}', 'PASS' if drift <= T['geo_drift'] else 'REVIEW')
        if ref:
            rg = frontal_geo(ref, 'largest')
            if len(rg) >= 5:
                d = round(float(np.max(np.abs(med - np.median(rg, axis=0)) / np.median(rg, axis=0))), 3)
                add('FC-2', 'face', 'identity drift from the approved character (#74 is never the reference for Zuri: D-110)', f'{d:.1%} from the approved take', f'≤ {T["geo_ref"]:.0%}', 'PASS' if d <= T['geo_ref'] else 'REVIEW')
    # camera
    cs = spec.get('camera')
    if cs:
        cam = [(fr['t'], fr['cam']) for fr in M['series']]
        sc = cam[-1][1]['scale']; sh = max(abs(cam[-1][1]['dx']), abs(cam[-1][1]['dy']))
        if cs.get('move') == 'locked':
            add('CM-1', 'camera', 'D-090: camera to stay locked, no zoom', f'scale {sc:.3f}, shift {sh:.3f}', f'|scale−1| ≤ {T["cam_locked_scale"]}, shift ≤ {T["cam_locked_shift"]}',
                'PASS' if abs(sc - 1) <= T['cam_locked_scale'] and sh <= T['cam_locked_shift'] else 'FAIL')
        elif cs.get('move') in ('push_in', 'pull_out'):
            after = cs.get('after', 0); s0 = next((c['scale'] for tt, c in cam if tt >= after), 1.0)
            growth = sc / s0 - 1 if cs['move'] == 'push_in' else s0 / sc - 1
            before = max(abs(c['scale'] - 1) for tt, c in cam if tt < after) if after > 0 and any(tt < after for tt, c in cam) else 0
            ok = growth >= T['cam_push_min'] and before <= T['cam_locked_scale']
            add('CM-2', 'camera', 'a camera move must start on its dramatic trigger, not before', f'{growth:+.1%} after {after} s, {before:.1%} drift before', f'≥ {T["cam_push_min"]:.0%} after, ≤ {T["cam_locked_scale"]:.1%} before', 'PASS' if ok else 'FAIL')
    if M.get('start_frame_ssim') is not None:
        s = M['start_frame_ssim']
        add('WD-0', 'wardrobe and continuity', 'Ep1 Shot 3 #70/#71: a collar error baked into the start frame carried into every take', f'first frame SSIM {s}', f'≥ {T["start_ssim"]}', 'PASS' if s >= T['start_ssim'] else 'FAIL')
    # always human
    add('WD-1', 'wardrobe and continuity', '#70/#71 one collar point; #65 charcoal jacket in the foreground; jewellery and props',
        'checklist against the approved references, on the first, middle and last frame (the -sheet.jpg qc_measure writes)', 'every item matches', 'REVIEW', '; '.join(spec.get('wardrobe', [])))
    add('SC-1', 'script', 'words that differ from the locked script', 'the studio recogniser, then a listen', 'every word as scripted', 'REVIEW')
    add('DR-1', 'dramatic intent', 'takes approved on measurements while the scene played wrong (#88 "stage play"; #70 "too hostile")',
        f'does it create {spec.get("intent", "the intended feeling")}?', spec.get('intent_note', ''), 'REVIEW')
    return R

if __name__ == '__main__':
    a = sys.argv[1:]
    M = json.load(open(a[0])); spec = json.load(open(a[1]))
    ref = json.load(open(a[a.index('--ref') + 1])) if '--ref' in a else None
    load_cal(a[a.index('--cal') + 1] if '--cal' in a else CAL)
    res = check(M, spec, ref)
    tech = [r for r in res if r['id'] not in ('DR-1', 'SC-1', 'WD-1')]
    status = 'FAIL' if any(r['verdict'] == 'FAIL' for r in tech) else 'NEEDS REVIEW'
    out = {'take': M['take'], 'shot': spec.get('shot'), 'technical': status, 'approved': False,
           'approval_rule': 'a person approves only after DR-1 (dramatic intent), WD-1 and SC-1, whatever the measurements say; a FAIL can be overridden only with a written reason',
           'checks': res}
    if len(a) > 2 and not a[2].startswith('--'): json.dump(out, open(a[2], 'w'), indent=1)
    print(f"{M['take']}  {spec.get('shot', '')}  technical: {status}  (approved: never by this tool)")
    for r in res: print(f"  {r['verdict']:6} {r['id']:5} {r['area']:22} {r['measured']}  [{r['limit']}]{('  ' + r['note']) if r['note'] else ''}")

"""Check recorded narration takes before they go into a cut: silent, truncated, garbled or padded takes are flagged.

Usage: python -I narration_check.py <narration dir> <storyboard.json>
       (pocketsphinx is optional: `pip install pocketsphinx` in its own venv; its wheel bundles an English model)

Per take (<line id>.wav, for every line in the storyboard's narration):
- level: a take whose speech never rises above -45 dBFS is silent;
- pace: syllables counted from the energy envelope, against the line's expected syllables; a take far below
  (words missing) or far above (repeats) is flagged. Calibrated on Episode 01: good takes read 0.79–1.14×;
- dead air: sound before the first word, and pauses over 0.6 s (the render trims pauses to 0.45 s, not stray noise);
- clipping: a take that ends while the voice is still sounding (the service cut the last word short);
- words: with pocketsphinx, a free transcript, and how many of the line's content words it heard. It is rough on
  this voice, so a low score alone is a REVIEW; with the other signals it is a FAIL.
Exit status 1 if any take fails.
"""
import json, os, re, subprocess, sys
import numpy as np

SR = 16000
NUM = {'0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'}

def spoken(text):
    # the words a voice says for a line: digits spelled, decimals as "point", the subtitle emphasis marks dropped
    t = text.replace('*', '').replace('’', "'")
    t = re.sub(r"'(\d\d)\b", lambda m: ' ' + {'88': 'eighty eight'}.get(m.group(1), m.group(1)), t)
    t = re.sub(r'(\d+)\.(\d+)', lambda m: ' '.join(NUM[c] for c in m.group(1)) + ' point ' + ' '.join(NUM[c] for c in m.group(2)), t)
    t = re.sub(r'\d', lambda m: ' ' + NUM[m.group(0)] + ' ', t)
    return re.findall(r"[a-z']+", t.lower())

def syllables(word):
    w = re.sub(r"[^a-z]", '', word.lower())
    if not w: return 0
    n = len(re.findall(r'[aeiouy]+', w))
    if w.endswith('e') and not w.endswith(('le', 'ee')) and n > 1: n -= 1
    return max(1, n)

def pcm(path):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768, raw

def envelope(a, band=True):
    if band:
        # 300–3000 Hz energy, where syllable nuclei are
        spec = np.fft.rfft(a); f = np.fft.rfftfreq(len(a), 1 / SR); spec[(f < 300) | (f > 3000)] = 0; a = np.fft.irfft(spec, len(a))
    fr = SR // 100
    e = np.array([np.sqrt(np.mean(a[i:i + fr] ** 2) + 1e-12) for i in range(0, len(a) - fr, fr)])
    return np.convolve(20 * np.log10(e + 1e-9), np.ones(5) / 5, mode='same')

def count_nuclei(d):
    floor = np.percentile(d, 95) - 22; peaks, last = 0, -99
    for i in range(1, len(d) - 1):
        if d[i] > floor and d[i] >= d[i - 1] and d[i] >= d[i + 1]:
            lo = min(d[max(0, i - 12):i].min(initial=d[i]), d[i + 1:i + 13].min(initial=d[i]))
            if d[i] - lo >= 6 and i - last >= 9: peaks += 1; last = i
    return peaks, floor

def transcript(raw):
    try:
        from pocketsphinx import Decoder
    except ImportError:
        return None, []
    dec = Decoder(samprate=SR, logfn=os.devnull); dec.start_utt(); dec.process_raw(raw, full_utt=True); dec.end_utt()
    words = [(re.sub(r'\(\d+\)$', '', s.word), s.start_frame / 100) for s in dec.seg() if not s.word.startswith(('<', '['))]
    return ' '.join(w for w, _ in words), words

STOP = {'a', 'an', 'the', 'to', 'of', 'and', 'i', "i'm", 'is', 'it', 'on', 'his', 'he', 'for', 'there', 'are', 'that', 'in', 'then'}

def check(path, text):
    a, raw = pcm(path); secs = len(a) / SR
    loud = envelope(a, band=False)
    if loud.max() < -45: return 'FAIL', [f'silent: loudest 10 ms is {loud.max():.0f} dBFS'], secs, ''
    voiced = loud > max(loud.max() - 35, -50)
    first, last = np.argmax(voiced) / 100, (len(voiced) - np.argmax(voiced[::-1])) / 100
    gaps, run = [], 0
    for v in voiced[int(first * 100):int(last * 100)]:
        if not v: run += 1
        else:
            if run > 60: gaps.append(run / 100)
            run = 0
    nuclei, _ = count_nuclei(envelope(a))
    want_words = spoken(text); want = sum(syllables(w) for w in want_words); ratio = nuclei / max(1, want)
    heard, words = transcript(raw)
    notes, verdict = [], 'PASS'
    if ratio < 0.7: notes.append(f'about {nuclei} of {want} expected syllables: words are probably missing'); verdict = 'FAIL'
    elif ratio > 1.45: notes.append(f'about {nuclei} syllables for {want} expected: repeated or extra words?'); verdict = 'REVIEW'
    # stray sound: the transcript's first word starts well after the first sound
    if words and words[0][1] - first > 0.6: notes.append(f'{words[0][1] - first:.1f} s of sound before the first recognised word: trim it if it is not speech'); verdict = 'REVIEW' if verdict == 'PASS' else verdict
    if gaps: notes.append(f'pauses of {", ".join(f"{g:.1f}" for g in gaps)} s (trimmed to 0.45 s in the render)')
    # a take that stops while the voice is still sounding was cut off by the service: the last word may be clipped
    tail = np.abs(a[-int(SR * 0.01):]).max() if len(a) > SR // 100 else 0
    if tail > 0.02: notes.append(f'ends mid-sound (last 10 ms peaks at {20 * np.log10(tail):.0f} dBFS): the last word may be cut off'); verdict = 'REVIEW' if verdict == 'PASS' else verdict
    if heard is not None:
        content = [w for w in want_words if w not in STOP]
        got = set(heard.split()); hit = sum(1 for w in content if w in got)
        notes.append(f'heard "{heard}" ({hit}/{len(content)} content words)')
        if content and hit / len(content) < 0.2 and ratio < 0.85: verdict = 'FAIL'
        # the recogniser is weak on this voice: a low word score alone, at a normal pace, is only a note
        elif content and hit / len(content) < 0.2 and verdict == 'PASS' and not 0.75 <= ratio <= 1.3: verdict = 'REVIEW'
    return verdict, notes, secs, heard or ''

def main():
    folder, sb = sys.argv[1], json.load(open(sys.argv[2]))
    failed = False
    for line, text in sb['narration'].items():
        p = os.path.join(folder, f'{line}.wav')
        if not os.path.exists(p): print(f'{line}: MISSING ({p})'); failed = True; continue
        verdict, notes, secs, _ = check(p, text)
        failed |= verdict == 'FAIL'
        print(f'{line}: {verdict} ({secs:.2f} s) {text.replace("*", "")}')
        for n in notes: print(f'    - {n}')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

"""Word timings for a reel: forced alignment of the spoken words against the recording.

  python3 align.py transcribe <recording>              draft transcript (Vosk small en-us), for checking by ear
  python3 align.py align <recording> <transcript.txt> <words.json>

The transcript is what was actually said, punctuation optional; hyphenated words are split
("copy-and-pasting" → copy and pasting). words.json is [{"w", "s", "e"}] in recording seconds,
the format every reel composition reads. Vosk's model comes from the transcribe2texts npm package
(the container can't reach the usual model hosts) and is cached in ~/.cache/reel-kit.
"""
import io, json, re, subprocess, sys, tarfile, tempfile, types, urllib.request, wave
from pathlib import Path

CACHE = Path.home() / '.cache' / 'reel-kit'
VOSK = CACHE / 'vosk-model-small-en-us-0.15'


def pcm16k(media):
    tmp = Path(tempfile.mkdtemp()) / 'a.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(media), '-vn', '-ac', '1', '-ar', '16000', str(tmp)], check=True)
    return tmp


def transcribe(media):
    if not VOSK.exists():
        meta = json.load(urllib.request.urlopen('https://registry.npmjs.org/transcribe2texts/1.0.6'))
        tgz = urllib.request.urlopen(meta['dist']['tarball']).read()
        CACHE.mkdir(parents=True, exist_ok=True)
        with tarfile.open(fileobj=io.BytesIO(tgz)) as tf:
            pre = 'package/' + VOSK.name + '/'
            for m in tf.getmembers():
                if m.isfile() and m.name.startswith(pre):
                    dest = VOSK / m.name[len(pre):]; dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(tf.extractfile(m).read())
    sys.modules.setdefault('srt', types.ModuleType('srt'))          # vosk imports it only for SRT export
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    wf = wave.open(str(pcm16k(media)), 'rb')
    rec = KaldiRecognizer(Model(str(VOSK)), wf.getframerate()); rec.SetWords(True)
    words = []
    while (d := wf.readframes(4000)):
        if rec.AcceptWaveform(d): words += json.loads(rec.Result()).get('result', [])
    words += json.loads(rec.FinalResult()).get('result', [])
    print(' '.join(f"{w['word']}[{w['start']:.2f}]" for w in words))


def align(media, transcript, out):
    from pocketsphinx import Decoder
    text = Path(transcript).read_text().lower().replace('-', ' ').replace('’', "'")
    words = re.findall(r"[a-z0-9']+", text)
    wf = wave.open(str(pcm16k(media)), 'rb'); sr = wf.getframerate(); data = wf.readframes(wf.getnframes())
    d = Decoder(samprate=sr, bestpath=False)
    missing = [w for w in words if d.lookup_word(w) is None]
    if missing: sys.exit(f'not in the pronouncing dictionary: {missing} (respell them, e.g. "a i")')
    d.set_align_text(' '.join(words))
    d.start_utt(); d.process_raw(data, full_utt=True); d.end_utt()
    segs = [(re.sub(r'\(\d+\)$', '', s.word), s.start_frame / 100, (s.end_frame + 1) / 100) for s in d.seg()]
    out_words = [{'w': w, 's': round(a, 2), 'e': round(b, 2)} for w, a, b in segs if w not in ('<s>', '</s>', '<sil>', '(NULL)', '[NOISE]')]
    if [o['w'] for o in out_words] != words: print('warning: alignment dropped words', file=sys.stderr)
    Path(out).write_text('[' + ',\n'.join(json.dumps(o, separators=(',', ':')) for o in out_words) + ']\n')
    print(' '.join(f"{o['w']}[{o['s']:.2f}-{o['e']:.2f}]" for o in out_words))


if __name__ == '__main__':
    {'transcribe': transcribe, 'align': align}[sys.argv[1]](*sys.argv[2:])

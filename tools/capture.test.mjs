import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fromTranscript, fromCcrExport, sessionCommits, githubPulls, sessionAliases } from './capture/lib/ingest.mjs';
import { buildEvents, buildMetrics, evidenceLevel } from './capture/lib/events.mjs';
import { buildStory, sentenceWith } from './capture/lib/story.mjs';
import { planStoryboard, timeStoryboard, cues } from './capture/lib/storyboard.mjs';
import { digitNumbers, wordNumbers, validateStoryboard, validateDerived } from './capture/lib/validate.mjs';
import { classify, shouldCapture, ENV_FLAG } from './capture/lib/guard.mjs';
import { srt } from './capture/lib/captions.mjs';
import { score } from './capture/lib/score.mjs';
import { ROOT, readJSON } from './capture/lib/util.mjs';

const ORBS = join(ROOT, 'docs/sessions/2026-10-12-orbs-in-repo');
const line = (o) => JSON.stringify(o) + '\n';
const wav = (seconds, rate = 8000) => { const n = Math.round(seconds * rate), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; };

test('numbers: digits inside identifiers are not claims; units and spelled-out counts are', () => {
  assert.deepEqual(digitNumbers('be1b0f3 · 20c1a03 · claude/orbs-in-repo-68l8w7'), []);
  assert.deepEqual(digitNumbers('a 2.6MB file, 65/65 tests, +653 lines, PR #20, 06:59'), [2.6, 65, 65, 653, 20, 6, 59]);
  assert.deepEqual(wordNumbers('fifty-three steps, two point six megabytes, one commit, fourteen files'), [53, 2.6, 14]);
});

test('sentences come from lines first, so list items are never glued into one claim', () => {
  const text = 'Intro.\n- An orange dot blooms.\n- Every frame is drawn by the real orb code, so nothing in it is a mock-up.\n- The URL on the last frame works.';
  assert.equal(sentenceWith(text, /every frame/i), 'Every frame is drawn by the real orb code, so nothing in it is a mock-up.');
});

test('recursion guard: a capture run is never recapped, and the hook stands down inside one', () => {
  assert.equal(classify({ prompt: '/qb-capture' }), 'capture-run');
  assert.equal(classify({ prompt: 'wrap up', tools: [{ name: 'Bash', input: { command: 'node tools/capture/cli.mjs run --transcript x.jsonl' } }, { name: 'Read', input: { file_path: 'docs/sessions/k/session-report.md' } }] }), 'capture-run');
  assert.equal(classify({ prompt: 'fix the header', tools: [{ name: 'Edit', input: { file_path: 'index.html' } }] }), 'work');
  // editing the capture system itself is real work: it gets documented like any other change
  assert.equal(classify({ prompt: 'improve the timeline', tools: [{ name: 'Edit', input: { file_path: 'tools/capture/stage/stage.js' } }] }), 'work');
  assert.deepEqual(shouldCapture({ env: { [ENV_FLAG]: '1' }, sessionId: 'x', index: { sessions: {} } }), { ok: false, reason: 'already inside a capture run' });
  assert.equal(shouldCapture({ env: {}, sessionId: 's1', transcriptSha: 'abc', index: { sessions: { k: { key: 'k', session_id: 's1', transcript_sha: 'abc' } } } }).ok, false);
  assert.equal(shouldCapture({ env: { QB_CAPTURE_AUTO: 'off' }, sessionId: 's1', index: { sessions: {} } }).ok, false);
});

test('a session that only ran the capture has evidence level none, so it produces no recap', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qbc-'));
  const f = join(dir, 's.jsonl');
  const at = (s) => `2026-10-29T18:00:${String(s).padStart(2, '0')}Z`;
  writeFileSync(f, [
    line({ type: 'user', sessionId: 'cap1', uuid: 'u1', timestamp: at(0), message: { role: 'user', content: '/qb-capture' } }),
    line({ type: 'assistant', sessionId: 'cap1', uuid: 'a1', timestamp: at(5), message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'node tools/capture/cli.mjs run --transcript prior.jsonl' } }] } }),
    line({ type: 'user', sessionId: 'cap1', uuid: 'u2', timestamp: at(9), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'wrote docs/sessions/k/session-recap-16x9.mp4' }] } }),
    line({ type: 'assistant', sessionId: 'cap1', uuid: 'a2', timestamp: at(10), message: { role: 'assistant', content: [{ type: 'text', text: 'Recap ready.' }] } }),
  ].join(''));
  const src = fromTranscript(f);
  assert.equal(src.turns.length, 1);
  const ev = buildEvents({ ...src, git: { commits: [], merges: [] }, pulls: [], repo: ROOT, repoSlug: 'x/y' });
  assert.equal(evidenceLevel(ev), 'none');
  assert.equal(buildStory(ev, buildMetrics(ev)).stages.length, 0);
});

test('a cloud session is matched to its commits by its remote id as well as its local one', () => {
  const env = { CLAUDE_CODE_SESSION_ID: 'local-1', CLAUDE_CODE_REMOTE_SDK_URL: 'https://api.anthropic.com/v1/code/sessions/cse_01Abc' };
  assert.deepEqual(sessionAliases({ id: 'local-1', source: 'transcript' }, env), ['local-1', '01Abc']);
  assert.deepEqual(sessionAliases({ id: 'session_01Xyz', source: 'ccr-export' }, env), ['01Xyz']);
});

test('timing follows the narration: recorded audio sets the scene length and the captions span it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qbc-'));
  mkdirSync(join(dir, '16x9'), { recursive: true });
  writeFileSync(join(dir, '16x9', 'goal.wav'), wav(9.5));
  const sb = { fps: 30, formats: { '16x9': { width: 1920, height: 1080, scenes: [
    { id: 'intro', template: 'intro', narration: 'Session recap.' },
    { id: 'goal', template: 'quote', narration: 'I asked for one thing, and I meant it, so it got built.' }] } } };
  timeStoryboard(sb, { narrationDir: dir });
  const [intro, goal] = sb.formats['16x9'].scenes;
  assert.equal(goal.voice.source, 'recorded');
  assert.equal(intro.voice.source, 'estimate');
  assert.ok(Math.abs(goal.duration - (0.75 + 9.5 + 0.7)) < 0.01, `goal lasts its audio plus lead and tail, got ${goal.duration}`);
  const c = sb.formats['16x9'].cues.filter((x) => x.scene === 'goal');
  assert.ok(Math.abs(c[0].start - goal.speech.start) < 1e-6 && Math.abs(c[c.length - 1].end - goal.speech.end) < 1e-3);
  assert.match(srt(c), /^1\n00:00:\d\d,\d{3} --> 00:00:\d\d,\d{3}\n/);
});

test('the score is a valid stereo WAV of the right length, and ducks under speech', () => {
  const scenes = [{ start: 0, duration: 3, template: 'intro' }, { start: 2.2, duration: 3, stage: 'goal' }];
  const a = score(scenes, 5.2, { rate: 8000 }), b = score(scenes, 5.2, { rate: 8000, speech: [{ start: 2.5, end: 4.5 }] });
  assert.equal(a.toString('ascii', 0, 4), 'RIFF');
  assert.equal(a.readUInt16LE(22), 2);
  assert.equal((a.length - 44) / 4, Math.ceil(5.2 * 8000));
  const rms = (buf, t0, t1) => { let s = 0, n = 0; for (let i = Math.round(t0 * 8000); i < Math.round(t1 * 8000); i++, n++) { const v = buf.readInt16LE(44 + i * 4); s += v * v; } return Math.sqrt(s / n); };
  assert.ok(rms(b, 3, 4) / rms(b, 0.6, 1.6) < rms(a, 3, 4) / rms(a, 0.6, 1.6), 'speech span is quieter relative to the open than without ducking');
});

test('derived counts must list items that appear in the cited text', () => {
  const ev = [{ id: 'E1', text: 'Instagram Reels, TikTok and LinkedIn' }];
  assert.deepEqual(validateDerived([{ key: 'p', value: 3, items: ['Instagram Reels', 'TikTok', 'LinkedIn'], refs: ['E1'] }], ev), []);
  assert.equal(validateDerived([{ key: 'p', value: 5, items: ['Instagram Reels', 'TikTok', 'LinkedIn', 'YouTube'], refs: ['E1'] }], ev).length, 2);
});

// The acceptance session: real evidence, real git history, the recorded GitHub responses.
const orbs = existsSync(join(ORBS, 'evidence/ccr-session.json')) && (() => { try { return sessionCommits(ROOT, 'session_01E33KRahnfgaMJD2zhcyZuQ').commits.length === 2; } catch { return false; } })();

test('acceptance session: the full arc is found, nothing is invented, and an unbacked number is refused', { skip: !orbs && 'needs the full git history and the orbs evidence' }, () => {
  const src = fromCcrExport(join(ORBS, 'evidence/ccr-session.json'));
  const g = sessionCommits(ROOT, src.session.id);
  const pulls = githubPulls('sonny914/new', g.commits.map((c) => c.sha), join(ORBS, 'evidence/github.json'), { offline: true });
  const ev = buildEvents({ ...src, git: g, pulls, repo: ROOT, repoSlug: 'sonny914/new' });
  const assets = readJSON(join(ORBS, 'session-assets.json'));
  const probes = Object.fromEntries(assets.assets.filter((a) => a.probe).map((a) => [a.path, a.probe]));
  const metrics = buildMetrics(ev, probes);
  const m = (k) => metrics.find((x) => x.key === k)?.value;
  assert.equal(m('build_minutes'), 10);
  assert.equal(m('pr20_wait_days'), 8);
  assert.equal(m('tests_passed'), 65);
  const story = buildStory(ev, metrics);
  assert.deepEqual(story.stages.map((s) => s.stage), ['goal', 'process', 'obstacle', 'correction', 'result', 'lesson']);
  const obstacle = story.stages.find((s) => s.stage === 'obstacle');
  assert.ok(obstacle.types.includes('unmerged') && obstacle.types.filter((t) => t === 'mistake').length === 1, 'one admitted mistake, not two');
  assert.ok(story.stages.find((s) => s.stage === 'result').claims.some((c) => c.status === 'unverified' && /quietbands\.com/.test(c.text)), 'the blocked live check is reported as not verified');

  const editorial = readJSON(join(ORBS, 'editorial.json'));
  const sb = timeStoryboard(planStoryboard({ session: src.session, story, events: ev, metrics, assets: assets.assets, repo: ROOT, editorial }));
  assert.ok(sb.formats['9x16'], 'real footage and an arc: the vertical cut is made');
  assert.deepEqual(validateStoryboard(sb, ev, metrics, assets).errors, []);
  // the same storyboard with one invented number must fail
  const bad = structuredClone(sb);
  bad.formats['16x9'].scenes.find((s) => s.id === 'stats').narration = 'About 12 minutes later, it was done.';
  assert.ok(validateStoryboard(bad, ev, metrics, assets).errors.some((e) => /number 12 /.test(e)));
});

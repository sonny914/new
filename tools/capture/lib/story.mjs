// Story construction: GOAL → PROCESS → OBSTACLE → CORRECTION → RESULT → LESSON, built only from events.
// A stage with no evidence is omitted and the reason is recorded. Nothing is invented to complete the arc.
import { isWork, goalTurn, evidenceLevel } from './events.mjs';

export const STAGES = ['goal', 'process', 'obstacle', 'correction', 'result', 'lesson'];

const plain = (s) => String(s).replace(/\*\*|`|__/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
export function sentenceWith(text, re) {
  // lines first (list items rarely end in a full stop), then sentences within each line
  const parts = String(text).split(/\n+/).map((l) => plain(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))).filter(Boolean)
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z"'(])/));
  return parts.find((p) => re.test(p)) ?? null;
}
// Light clean-up for speech: collapse stray punctuation, keep the founder's words.
export const spoken = (s) => plain(s).replace(/\s+\.\s+(?=[A-Za-z])/g, ' ').replace(/\s+([.,!?])/g, '$1');
const at = (e) => Date.parse(e.t);

export function buildStory(ev, metrics) {
  const level = evidenceLevel(ev);
  const omitted = [];
  if (level === 'none') return { level, stages: [], omitted: STAGES.map((stage) => ({ stage, reason: 'the session holds no work beyond running the capture itself' })) };
  const work = ev.filter((e) => isWork(e) && e.kind !== 'session');
  const metric = (k) => metrics.find((m) => m.key === k);
  const stages = [];
  const g = goalTurn(work);

  // GOAL: the founder's own words.
  stages.push({ stage: 'goal', claims: [{ text: plain(g.prompt.text), refs: [g.prompt.id], kind: 'quote' }], narration: `The ask: ${spoken(g.prompt.text)}` });

  // PROCESS: what the goal turn produced, up to the next founder prompt.
  const prompts = work.filter((e) => e.kind === 'prompt');
  const nextPrompt = prompts.find((p) => at(p) > at(g.prompt));
  const inGoal = (e) => at(e) >= at(g.prompt) && (!nextPrompt || at(e) < at(nextPrompt));
  const built = work.filter((e) => inGoal(e) && ['commit', 'pr-open', 'artifact', 'page', 'test-run'].includes(e.kind));
  if (built.length || g.reply) {
    const claims = built.map((e) => ({ text: e.kind === 'commit' ? e.data.subject : e.kind === 'pr-open' ? `Opened PR #${e.data.number}` : e.kind === 'test-run' ? `Tests ${e.data.passed}/${e.data.passed + e.data.failed}` : `Added ${e.data.path}`, refs: [e.id], kind: e.kind }));
    const mins = metric('build_minutes'), steps = metric('build_steps');
    const lead = mins ? `About ${mins.display} minute${mins.value === 1 ? '' : 's'}${steps ? ` and ${steps.display} steps` : ''} later` : 'Then the work';
    const subject = built.find((e) => e.kind === 'commit')?.data.subject;
    stages.push({ stage: 'process', claims, metrics: [mins, steps].filter(Boolean).map((m) => m.key), narration: subject ? `${lead}: ${spoken(subject)}.` : `${lead}.` });
  } else omitted.push({ stage: 'process', reason: 'no commits, artifacts or replies in the goal turn' });

  // OBSTACLE: only what the record shows went wrong.
  const later = work.filter((e) => at(e) > at(g.prompt) && !inGoal(e));
  const complaint = later.find((e) => e.kind === 'prompt' && e.tags.includes('obstacle'));
  const waited = work.filter((e) => e.kind === 'pr-merge' && e.data.open_ms >= 864e5);
  const mistakes = work.filter((e) => e.kind === 'reply' && e.tags.includes('mistake'));
  const reverts = work.filter((e) => e.kind === 'file-removed');
  const failures = work.filter((e) => (e.kind === 'test-run' && e.data.failed > 0) || e.kind === 'tool-error');
  const obstacles = [];
  if (complaint) obstacles.push({ type: waited.length ? 'unmerged' : 'complaint', claims: [{ text: plain(complaint.text), refs: [complaint.id], kind: 'quote' },
    ...waited.map((m) => ({ text: `PR #${m.data.number} sat ${metric(`pr${m.data.number}_wait_days`)?.display ?? '?'} days before it was merged`, refs: [m.id, work.find((e) => e.kind === 'pr-open' && e.data.number === m.data.number)?.id].filter(Boolean), kind: 'wait' }))] });
  for (const r of mistakes) { const s = sentenceWith(r.text, /mistake|accidentally|my fault|shouldn'?t have/i); if (s) obstacles.push({ type: 'mistake', claims: [{ text: s, refs: [r.id, ...reverts.map((x) => x.id)], kind: 'admission' }] }); }
  for (const f of failures) obstacles.push({ type: 'failure', claims: [{ text: f.kind === 'test-run' ? `Tests failed: ${f.data.failed} of ${f.data.passed + f.data.failed}` : `A step failed: ${f.text.slice(0, 80)}`, refs: [f.id], kind: 'failure' }] });
  if (obstacles.length) stages.push({ stage: 'obstacle', types: obstacles.map((o) => o.type), claims: obstacles.flatMap((o) => o.claims),
    narration: [complaint && `Then: "${spoken(complaint.text)}"`, mistakes.length && 'And one mistake came along with it.'].filter(Boolean).join(' ') || 'Then something broke.' });
  else omitted.push({ stage: 'obstacle', reason: 'no complaint, failure or admitted mistake in the record' });

  // CORRECTION: what was done about each obstacle, after it.
  const firstObstacle = Math.min(...[complaint, ...mistakes, ...failures].filter(Boolean).map(at));
  const fixes = obstacles.length ? work.filter((e) => at(e) >= firstObstacle && (e.kind === 'pr-merge' || (e.kind === 'commit' && e.tags.includes('fix')) || e.kind === 'file-removed' || (e.kind === 'test-run' && e.data.failed === 0))) : [];
  if (fixes.length) stages.push({ stage: 'correction', claims: fixes.map((e) => ({ text: e.kind === 'pr-merge' ? `Merged PR #${e.data.number} into ${e.data.base}` : e.kind === 'file-removed' ? `Removed ${e.data.path}` : e.kind === 'commit' ? e.data.subject : `Tests ${e.data.passed}/${e.data.passed}`, refs: [e.id], kind: e.kind })),
    narration: fixes.filter((e) => e.kind === 'pr-merge').map((e) => `Merged pull request ${e.data.number}.`).join(' ') || 'Fixed.' });
  else omitted.push({ stage: 'correction', reason: obstacles.length ? 'no fix in the record after the obstacle' : 'no obstacle to correct' });

  // RESULT: the end state, with what could not be verified said plainly.
  const merged = work.filter((e) => e.kind === 'pr-merge');
  const pages = work.filter((e) => e.kind === 'page'), artifacts = work.filter((e) => e.kind === 'artifact');
  const tests = metric('tests_passed');
  const result = [...pages.map((e) => ({ text: `Page: /${e.data.path.replace(/index\.html$/, '')}`, refs: [e.id], status: 'verified' })),
    ...artifacts.filter((a) => !reverts.some((r) => r.data.path === a.data.path)).map((e) => ({ text: `Artifact: ${e.data.path}`, refs: [e.id], status: 'verified' })),
    ...(tests ? [{ text: `Tests: ${tests.display} passing`, refs: tests.refs, status: 'verified' }] : []),
    ...merged.map((e) => ({ text: `PR #${e.data.number} merged into ${e.data.base}`, refs: [e.id], status: 'verified' })),
    // without a merged PR, the end state is the commits and the last passing test run
    ...(merged.length ? [] : work.filter((e) => e.kind === 'commit').map((e) => ({ text: `Committed: ${e.data.subject}`, refs: [e.id], status: 'verified' }))),
    ...(tests ? [] : work.filter((e) => e.kind === 'test-run').slice(-1).filter((e) => e.data.failed === 0).map((e) => ({ text: `Tests: ${e.data.passed}/${e.data.passed} passing`, refs: [e.id], status: 'verified' }))),
    ...work.filter((e) => e.kind === 'reply' && e.tags.includes('limitation')).map((e) => ({ e, s: sentenceWith(e.text, /block|couldn'?t|could not|unable|not been|nothing has been checked/i) })).filter((x) => x.s).map((x) => ({ text: x.s, refs: [x.e.id], status: 'unverified' }))];
  if (result.length) stages.push({ stage: 'result', claims: result, narration: merged.length ? `It's in ${merged[merged.length - 1].data.base}.` : 'That is where it stands.' });
  else omitted.push({ stage: 'result', reason: 'no end state in the record' });

  // LESSON: drawn only from an obstacle and its correction, by rule.
  const lessons = [];
  if (obstacles.some((o) => o.type === 'unmerged') && waited.length) lessons.push({ text: "Finished isn't shipped until it's merged.", refs: [complaint.id, ...waited.map((m) => m.id)], rule: 'unmerged' });
  if (reverts.length) lessons.push({ text: 'Build byproducts belong in temp, not in the repo.', refs: reverts.map((r) => r.id), rule: 'self-revert' });
  if (obstacles.some((o) => o.type === 'failure') && fixes.some((e) => e.kind === 'test-run')) lessons.push({ text: 'Run the checks before calling it done.', refs: failures.map((f) => f.id), rule: 'failure' });
  if (lessons.length) stages.push({ stage: 'lesson', claims: lessons.map((l) => ({ text: l.text, refs: l.refs, kind: l.rule })), narration: `Lesson: ${lessons[0].text}` });
  else omitted.push({ stage: 'lesson', reason: 'no obstacle-and-correction pair to learn from' });

  return { level, stages, omitted };
}

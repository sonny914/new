import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/lab/operator-core.js';
import { buildInterpretMessages, buildDraftMessages, parseInterpretation, parseDraft, applyVerdictRules, readPrompt } from '../netlify/functions/operator-interpret.js';

const mem = () => { let s = null; return { load: () => s, save: (x) => { s = JSON.parse(JSON.stringify(x)); }, get saved() { return s; } }; };
const T0 = '2026-10-01T12:00:00.000Z';
const fixedNow = () => T0;

/* ---------- identity ---------- */
test('LinkedIn URLs normalise to one stable key', () => {
  assert.equal(C.normaliseLinkedIn('https://uk.linkedin.com/in/Jay-Smith-123/?x=1'), 'https://www.linkedin.com/in/jay-smith-123');
  assert.equal(C.extractLinkedIn('see https://www.linkedin.com/in/priya-natarajan-example/ for more'), 'https://www.linkedin.com/in/priya-natarajan-example');
  assert.equal(C.extractLinkedIn('no url here'), null);
});

test('a person is resolved by URL, then by alias, and never invented', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  const p = store.addPerson({ displayName: 'Priya Natarajan', linkedinUrl: 'https://www.linkedin.com/in/priya-natarajan-example' });
  assert.equal(C.resolveAuthor({ text: 'https://linkedin.com/in/priya-natarajan-example' }, store).how, 'url');
  const byName = C.resolveAuthor({ text: '', guessName: 'Priya Natarajan' }, store);
  assert.equal(byName.person.id, p.id); assert.equal(byName.how, 'alias'); assert.ok(byName.confidence < 0.9, 'an unconfirmed name alias needs Jay');
  store.addAlias(p.id, 'Priya Natarajan', 'name', 1);
  assert.ok(C.resolveAuthor({ text: '', guessName: 'priya natarajan' }, store).confidence >= 0.9);
  assert.equal(C.resolveAuthor({ text: '', guessName: 'Nobody Here' }, store).person, null);
  assert.equal(store.addPerson({ displayName: 'Dup', linkedinUrl: 'linkedin.com/in/priya-natarajan-example' }).id, p.id, 'same URL is the same person');
});

/* ---------- the log ---------- */
test('the log is append-only and rejects uncited system claims', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  assert.equal(typeof store.append, 'function');
  assert.equal(store.update, undefined); assert.equal(store.remove, undefined);
  assert.throws(() => store.append({ kind: 'observation', actor: 'system', payload: { text: 'x' } }), /must cite/);
  assert.throws(() => store.append({ kind: 'bogus', actor: 'jay' }), /unknown event kind/);
  assert.throws(() => store.append({ kind: 'rung_changed', actor: 'jay', payload: { to: 1 } }), /evidenceEventId/);
  const a = store.addArtifact({ sourceKind: 'linkedin_post', rawText: 'hello' });
  const ev = store.append({ kind: 'observation', actor: 'system', artifactId: a.id, payload: { text: 'x', cites: [a.id] } });
  assert.equal(ev.origin, 'real'); assert.equal(ev.at, T0);
});

test('the system may climb to rung 2 and no further; rungs 3 to 5 need Jay', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  const p = store.addPerson({ displayName: 'A' });
  const a = store.addArtifact({ sourceKind: 'linkedin_post', rawText: 't', authorPersonId: p.id });
  store.append({ kind: 'artifact_captured', actor: 'jay', artifactId: a.id, personId: p.id, payload: {} });
  assert.equal(C.currentRung(store.eventsFor(p.id)), 0);
  assert.equal(C.proposeRungChange(store.eventsFor(p.id)).kind, 'none');

  store.append({ kind: 'action', actor: 'jay', artifactId: a.id, personId: p.id, payload: { kind: 'commented', text: 'hi' } });
  let ev = C.applySystemRung(store, p.id);
  assert.equal(ev.payload.to, 1); assert.equal(ev.actor, 'system'); assert.ok(ev.evidenceEventId);

  store.append({ kind: 'response_observed', actor: 'jay', artifactId: a.id, personId: p.id, payload: { kind: 'like', by: 'external' } });
  assert.equal(C.applySystemRung(store, p.id), null, 'a like is still attention');
  store.append({ kind: 'response_observed', actor: 'jay', artifactId: a.id, personId: p.id, payload: { kind: 'reply', by: 'external' } });
  assert.equal(C.applySystemRung(store, p.id).payload.to, 2);

  const pr = store.addProblem({ label: 'handoff' });
  store.append({ kind: 'problem_evidence', actor: 'system', artifactId: a.id, personId: p.id, problemId: pr.id, payload: { quote: 'q', cites: [a.id] } });
  assert.equal(C.proposeRungChange(store.eventsFor(p.id)).kind, 'none', 'a proposed problem is not evidence');
  store.append({ kind: 'problem_evidence', actor: 'jay', artifactId: a.id, personId: p.id, problemId: pr.id, payload: { quote: 'q', cites: [a.id] } });
  const prop = C.proposeRungChange(store.eventsFor(p.id));
  assert.deepEqual([prop.kind, prop.to], ['needs_jay', 3]);
  assert.equal(C.applySystemRung(store, p.id), null, 'the system does not write rung 3');
  assert.throws(() => store.append({ kind: 'rung_changed', actor: 'system', personId: p.id, evidenceEventId: prop.evidenceEventId, payload: { from: 2, to: 3 } }), /may not set rung 3/);
  store.append({ kind: 'rung_changed', actor: 'jay', personId: p.id, evidenceEventId: prop.evidenceEventId, payload: { from: 2, to: 3 } });
  assert.equal(C.currentRung(store.eventsFor(p.id)), 3);

  store.append({ kind: 'response_observed', actor: 'jay', artifactId: a.id, personId: p.id, payload: { kind: 'dm', by: 'external', asksAboutQb: true } });
  assert.equal(C.proposeRungChange(store.eventsFor(p.id)).to, 4);
  store.append({ kind: 'action', actor: 'jay', artifactId: a.id, personId: p.id, payload: { kind: 'meeting' } });
  assert.equal(C.proposeRungChange(store.eventsFor(p.id)).to, 5);
});

test('events attached to an artifact count for its author even when tagged later', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  const a = store.addArtifact({ sourceKind: 'linkedin_post', rawText: 't' });
  store.append({ kind: 'artifact_captured', actor: 'jay', artifactId: a.id, payload: {} });
  const p = store.addPerson({ displayName: 'Late Identified' });
  assert.equal(store.eventsFor(p.id).length, 0);
  store.setArtifactAuthor(a.id, p.id);
  assert.equal(store.eventsFor(p.id).length, 1);
});

/* ---------- context ---------- */
test('the context pack is honest about emptiness, weighted, and budgeted', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  const p = store.addPerson({ displayName: 'Priya Natarajan', title: 'Director of Operations' });
  assert.equal(C.contextPack(store, p.id).status, 'empty');
  assert.match(C.contextPack(store, p.id).markdown, /first time we have seen them/);
  C.seedExample(store, T0);
  const priya = store.state.persons.find((x) => x.displayName === 'Priya Natarajan' && x.linkedinUrl);
  const pack = C.contextPack(store, priya.id, { now: T0 });
  assert.equal(pack.status, 'ok');
  assert.match(pack.markdown, /^# Priya Natarajan/);
  assert.match(pack.markdown, /confirmed by Jay/);
  assert.match(pack.markdown, /What happened between us/);
  assert.ok(pack.eventIds.length >= 3);
  const tiny = C.contextPack(store, priya.id, { now: T0, budget: 120 });
  assert.equal(tiny.truncated, true);
  assert.match(tiny.markdown, /^# Priya Natarajan/, 'the identity line always survives truncation');
});

test('open loops age from the action and close on any recorded response', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  C.seedExample(store, T0);
  const loops = C.openLoops(store, T0);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].person.displayName, 'Marcus Oyelaran');
  assert.equal(loops[0].days, 9);
  store.append({ kind: 'response_observed', actor: 'jay', artifactId: loops[0].artifact.id, personId: loops[0].person.id, payload: { kind: 'none', by: 'external' } });
  assert.equal(C.openLoops(store, T0).length, 0);
});

test('example data is fictional, tagged, and reaches rung 3 only through Jay', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  C.seedExample(store, T0);
  for (const row of [...store.state.persons, ...store.state.artifacts, ...store.state.problems, ...store.state.events, ...store.state.companies]) assert.equal(row.origin, 'example');
  const priya = store.state.persons.find((x) => x.displayName === 'Priya Natarajan');
  const rungEvents = store.eventsFor(priya.id).filter((e) => e.kind === 'rung_changed');
  assert.deepEqual(rungEvents.map((e) => [e.actor, e.payload.to]), [['system', 1], ['system', 2], ['jay', 3]]);
  for (const e of rungEvents) assert.ok(store.events().some((x) => x.id === e.evidenceEventId), 'every rung change cites a real event');
  assert.equal(C.peopleTable(store)[0].person.id, priya.id);
  assert.equal(C.problemTable(store)[0].confirmed, 1);
  assert.doesNotMatch(JSON.stringify(store.state), /bennett|vantage|launchpad|founderos/i);
});

test('edit ratio measures how much Jay rewrote a draft', () => {
  assert.equal(C.editRatio('abc', 'abc'), 0);
  assert.equal(C.editRatio('', ''), 0);
  assert.equal(C.editRatio('abcd', 'wxyz'), 1);
  assert.ok(C.editRatio('who notices when it goes quiet', 'who notices when it goes silent') < 0.3);
});

/* ---------- the model boundary ---------- */
test('the interpreter prompt carries the artifact and the context, and says so when there is none', () => {
  const rules = readPrompt('interpreter-rules.md');
  assert.match(rules, /never estimate interest, intent, budget/i);
  const m = buildInterpretMessages({ text: 'post body', image: null, context: { status: 'empty', markdown: '' } }, rules);
  assert.equal(m.system, rules);
  assert.match(m.messages[0].content[0].text, /post body/);
  assert.match(m.messages[0].content[0].text, /first encounter/i);
  const withImg = buildInterpretMessages({ text: '', image: { mediaType: 'image/png', data: 'AAAA' }, context: { status: 'ok', markdown: '# P\nprior' } }, rules);
  assert.equal(withImg.messages[0].content[0].type, 'image');
  assert.match(withImg.messages[0].content[1].text, /prior/);
});

test('the draft prompt never pitches and carries Jay\'s own anchors', () => {
  const voice = readPrompt('jay-voice.md');
  assert.match(voice, /never mentions Quiet Bands/);
  assert.match(voice, /No hashtags/);
  const m = buildDraftMessages({ text: 'their post', observations: ['o1'], reasons: ['r1'], context: { status: 'empty' }, anchors: ['a real comment'] }, voice);
  assert.match(m.messages[0].content, /a real comment/);
  assert.match(m.messages[0].content, /o1/);
});

test('model output is validated, never trusted: bad verdicts fail, rungs are not accepted', () => {
  assert.equal(parseInterpretation('not json'), null);
  assert.equal(parseInterpretation('{"verdict":"BUY NOW"}'), null);
  const ok = parseInterpretation('Sure:\n{"author":{"name":"P","confidence":"1.7"},"isQuestion":true,"inLane":true,"observations":["a","b"],"problemEvidence":[{"label":"L","quote":"q"},{"label":"no quote"}],"verdict":"comment","reasons":["r"],"rung":5}');
  assert.equal(ok.verdict, 'COMMENT'); assert.equal(ok.author.confidence, 1); assert.equal(ok.problemEvidence.length, 1); assert.equal(ok.rung, undefined);
  assert.deepEqual(parseDraft('{"comment":"fine #tag words"}'), { comment: 'fine  words' });
  assert.equal(parseDraft('{}'), null);
});

test('the first-encounter rule turns a stranger\'s COMMENT into SAVE unless it is a question in lane', () => {
  const base = { verdict: 'COMMENT', isQuestion: false, inLane: true, reasons: ['r'], observations: [], problemEvidence: [], author: {} };
  assert.equal(applyVerdictRules(base, { status: 'empty' }).verdict, 'SAVE');
  assert.deepEqual(applyVerdictRules(base, { status: 'empty' }).rulesApplied, ['first-encounter-save']);
  assert.equal(applyVerdictRules({ ...base, isQuestion: true }, { status: 'empty' }).verdict, 'COMMENT');
  assert.equal(applyVerdictRules(base, { status: 'ok', markdown: 'x' }).verdict, 'COMMENT');
  assert.equal(applyVerdictRules({ ...base, verdict: 'SCROLL' }, { status: 'empty' }).verdict, 'SCROLL');
});

/* ---------- the graph: a projection of the log ---------- */
test('the graph is derived from the log: every edge is a relationship on file, weights are counts', () => {
  const store = C.createStore(mem(), { now: fixedNow });
  C.seedExampleWide(store, T0);
  const m = C.graphModel(store);
  const ids = new Set(m.nodes.map((n) => n.id));
  for (const e of m.edges) { assert.ok(ids.has(e.source) && ids.has(e.target), `dangling edge ${e.id}`); assert.ok(['member', 'authored', 'evidence'].includes(e.kind)); assert.ok(e.weight >= 1); }
  const evidence = m.edges.filter((e) => e.kind === 'evidence');
  assert.ok(evidence.length >= 6);
  for (const e of evidence) assert.ok(store.events().some((x) => x.id === e.eventId), 'every evidence edge cites an event');
  const confirmed = evidence.filter((e) => e.confirmed).length;
  assert.equal(confirmed, store.events().filter((e) => e.kind === 'problem_evidence' && e.actor === 'jay').length, 'solid edges are exactly the Jay-confirmed evidence');
  const priya = m.nodes.find((n) => n.kind === 'person' && n.label === 'Priya Natarajan');
  assert.equal(priya.rung, 3);
  assert.ok(m.nodes.find((n) => n.kind === 'person' && n.label === 'Marcus Oyelaran').openLoop, 'a person with an open loop is marked');
});

test('the layout settles, is deterministic, and keeps problems inside, people around, companies outside', () => {
  const store = C.createStore(mem(), { now: fixedNow }); C.seedExampleWide(store, T0);
  const m = C.graphModel(store);
  const a = C.layoutSettle(m, {}, 400), b = C.layoutSettle(m, {}, 400);
  for (const id of Object.keys(a)) { assert.ok(Number.isFinite(a[id].x) && Number.isFinite(a[id].y)); assert.equal(a[id].x, b[id].x); }
  const r = (kind) => { const xs = m.nodes.filter((n) => n.kind === kind).map((n) => Math.hypot(a[n.id].x, a[n.id].y)); return xs.reduce((s, v) => s + v, 0) / xs.length; };
  assert.ok(r('problem') < r('person'), 'problems sit inside people');
  assert.ok(r('person') < r('company'), 'people sit inside companies');
  const big = m.nodes.filter((n) => n.kind !== 'artifact');
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) assert.ok(Math.hypot(a[big[i].id].x - a[big[j].id].x, a[big[i].id].y - a[big[j].id].y) > 24, 'no two labelled nodes sit on top of each other');
  assert.ok(C.layoutTick(m, a, { alpha: 0.05 }) < 0.5, 'a settled layout barely moves');
});

test('the camera frames the whole picture at home and keeps a focused node clear of the panel', () => {
  const store = C.createStore(mem(), { now: fixedNow }); C.seedExampleWide(store, T0);
  const pos = C.layoutSettle(C.graphModel(store));
  const home = C.cameraRect({ focus: null, positions: pos, aspect: 16 / 9, panelFrac: 0.3 });
  const b = C.bounds(pos, 0);
  assert.ok(home.x + home.w * 0.3 <= b.x + 1, 'the picture starts right of the panel');
  assert.ok(home.x + home.w >= b.x + b.w - 1 && home.y <= b.y && home.y + home.h >= b.y + b.h, 'and the whole picture is inside the frame');
  assert.ok(Math.abs(home.w / home.h - 16 / 9) < 0.01);
  const id = Object.keys(pos)[0];
  const f = C.cameraRect({ focus: pos[id], positions: pos, aspect: 16 / 9, panelFrac: 0.3, zoomW: 400 });
  const fx = (pos[id].x - f.x) / f.w;
  assert.ok(fx > 0.3 && fx < 0.75, `focused node sits in the clear part of the screen (${fx.toFixed(2)})`);
  const mid = C.lerpRect(home, f, 0.5); assert.ok(Math.abs(mid.w - (home.w + f.w) / 2) < 1e-9);
  assert.equal(C.rectClose(f, { ...f }), true);
});

/* ---------- the visual rulebook ---------- */
const css = readFileSync(new URL('../assets/lab/operator.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/lab/operator.js', import.meta.url), 'utf8');

test('rule 1: safety orange is defined once and used only through its tokens', () => {
  const hits = css.match(/#ff5a00/gi) || [];
  assert.equal(hits.length, 1, 'the hex appears once, on --live');
  assert.doesNotMatch(js, /#ff5a00/i);
  assert.doesNotMatch(css, /#FFBE0B|#B38A3D|#0E0F10|#F6F4EE/i, 'no retired brass, ink or bone');
});

test('rule 2: glow exists in one place, the live node and its flare, and never on chrome, hover or motion', () => {
  const lines = css.split('\n');
  const glowLines = lines.filter((l) => /drop-shadow|box-shadow/.test(l));
  assert.ok(glowLines.length >= 2 && glowLines.length <= 3, `glow lines: ${glowLines.length}`);
  for (const l of glowLines) assert.ok(/\.is-live|\.flare|@keyframes flare/.test(l), `glow outside the live element: ${l.trim().slice(0, 60)}`);
  for (const l of glowLines) assert.ok(/rgba\(255,90,0|var\(--live-soft\)/.test(l), 'glow is always the orange');
  assert.doesNotMatch(css, /:hover[^{]*\{[^}]*(shadow|filter)/);
  assert.doesNotMatch(css, /backdrop-filter|filter\s*:\s*blur/);
});

test('rule 3: hover and press move named properties on their own clocks; nothing transitions "all"', () => {
  assert.doesNotMatch(css, /transition\s*:\s*all\b/);
  assert.match(css, /--dur-press:200ms/); assert.match(css, /--dur:360ms/);
  assert.doesNotMatch(css, /transition[^;]*border-radius/);
});

test('rule 4: every CSS variable used is defined', () => {
  const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
  for (const v of used) assert.ok(defined.has(v), `${v} is used but never defined`);
});

test('rule 5: motion is state change only and collapses under reduced motion; nothing below 12px', () => {
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
  const rm = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));
  assert.match(rm, /\.flare \.core\{animation:none\}/);
  assert.match(rm, /\.edge\.draw\{animation:none\}/);
  const sizes = [...css.matchAll(/font-size\s*:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
  assert.ok(sizes.every((s) => s >= 12), `smallest font-size ${Math.min(...sizes)}px`);
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/, 'labels are sentence case');
  const infinite = [...css.matchAll(/animation:[^;]*infinite/g)].map((m) => m[0]);
  assert.deepEqual(infinite.map((a) => a.includes('blink')), [true], 'the only looping animation is the busy tick while a reading is in flight');
});

test('the page keeps the site header lockup, is noindex, and loads the module', () => {
  const html = readFileSync(new URL('../lab/operator/index.html', import.meta.url), 'utf8');
  assert.match(html, /noindex/);
  assert.match(html, /class="qb-word"/);
  assert.match(html, /operator\.js/);
  assert.match(html, /<svg id="canvas"/);
  assert.doesNotMatch(html, /glow|neon|bloom/i);
});

// QUIET BANDS — OPERATOR v0.1 · core
// Pure logic for the LinkedIn-artifact slice. No DOM, no network, no node imports,
// so the same module runs in the browser (assets/lab/operator.js) and under
// node --test (tools/operator.test.mjs).
//
// One append-only event log is the memory. Everything else is identity
// (person, alias, company, artifact, problem) or a projection of the log.
// The invariant: ATTENTION ≠ INTENT. The system may move a person 0→1→2 from
// observed responses. Rungs 3–5 need an event whose actor is Jay.

export const RUNGS = ['Seen', 'Attention', 'Engagement', 'Problem evidence', 'Direct interest', 'Opportunity'];
export const SYSTEM_MAX_RUNG = 2;

export const EVENT_KINDS = [
  'artifact_captured', 'author_resolved', 'context_retrieved', 'observation', 'problem_evidence',
  'recommendation', 'decision', 'action', 'response_observed', 'rung_changed', 'note',
];
export const ACTORS = ['jay', 'system', 'external'];
export const VERDICTS = ['COMMENT', 'SAVE', 'SCROLL'];
export const ACTION_KINDS = ['commented', 'saved', 'dm_sent', 'connection_sent', 'meeting', 'other'];
export const RESPONSE_KINDS = ['reply', 'like', 'dm', 'connection_accepted', 'meeting_booked', 'none'];

export function newId(prefix = 'e') {
  const rand = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('')
    : Math.random().toString(16).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function emptyState() {
  return { version: 1, persons: [], aliases: [], companies: [], artifacts: [], problems: [], events: [] };
}

/** Normalise a LinkedIn profile URL to a stable key, or null. */
export function normaliseLinkedIn(url) {
  if (!url) return null;
  const m = String(url).match(/linkedin\.com\/in\/([A-Za-z0-9\-_%.]+)/i);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).replace(/\/+$/, '').toLowerCase();
  return slug ? `https://www.linkedin.com/in/${slug}` : null;
}

/** First LinkedIn profile URL found in free text, normalised. */
export function extractLinkedIn(text) {
  const m = String(text || '').match(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%.]+\/?/i);
  return m ? normaliseLinkedIn(m[0]) : null;
}

export function normaliseName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The store. `persist` is { load(): state|null, save(state) }. Events are append-only:
 * there is no update or delete path on purpose.
 */
export function createStore(persist, opts = {}) {
  const now = opts.now || (() => new Date().toISOString());
  let state = (persist && persist.load && persist.load()) || emptyState();
  if (!state.events) state = emptyState();
  const save = () => { if (persist && persist.save) persist.save(state); };

  const byId = (list, id) => list.find((x) => x.id === id) || null;

  const store = {
    get state() { return state; },
    now,

    person(id) { return byId(state.persons, id); },
    company(id) { return byId(state.companies, id); },
    artifact(id) { return byId(state.artifacts, id); },
    problem(id) { return byId(state.problems, id); },

    addPerson({ displayName, linkedinUrl = null, companyId = null, title = null, origin = 'real' }) {
      const url = normaliseLinkedIn(linkedinUrl);
      if (url) {
        const existing = state.persons.find((p) => p.linkedinUrl === url);
        if (existing) return existing;
      }
      const person = { id: newId('p'), displayName, linkedinUrl: url, companyId, title, origin, createdAt: now() };
      state.persons.push(person);
      if (url) state.aliases.push({ personId: person.id, alias: url, kind: 'url', confirmedByJay: 1 });
      state.aliases.push({ personId: person.id, alias: normaliseName(displayName), kind: 'name', confirmedByJay: 0 });
      save();
      return person;
    },
    addAlias(personId, alias, kind = 'name', confirmedByJay = 0) {
      const a = kind === 'url' ? normaliseLinkedIn(alias) : normaliseName(alias);
      if (!a) return null;
      const dup = state.aliases.find((x) => x.personId === personId && x.alias === a);
      if (dup) { if (confirmedByJay) dup.confirmedByJay = 1; save(); return dup; }
      const row = { personId, alias: a, kind, confirmedByJay: confirmedByJay ? 1 : 0 };
      state.aliases.push(row); save(); return row;
    },
    addCompany({ name, domain = null, origin = 'real' }) {
      const key = normaliseName(name);
      const existing = state.companies.find((c) => normaliseName(c.name) === key);
      if (existing) return existing;
      const c = { id: newId('c'), name, domain, origin, createdAt: now() };
      state.companies.push(c); save(); return c;
    },
    addArtifact({ sourceKind, url = null, rawText, authorPersonId = null, origin = 'real', capturedAt = null }) {
      const a = {
        id: newId('a'), sourceKind, url, rawText: String(rawText || ''), authorPersonId, origin,
        capturedAt: capturedAt || now(), contentHash: hashText(rawText || ''),
      };
      state.artifacts.push(a); save(); return a;
    },
    setArtifactAuthor(artifactId, personId) {
      const a = byId(state.artifacts, artifactId); if (!a) return null;
      a.authorPersonId = personId; save(); return a;
    },
    addProblem({ label, description = null, origin = 'real' }) {
      const key = normaliseName(label);
      const existing = state.problems.find((p) => normaliseName(p.label) === key);
      if (existing) return existing;
      const p = { id: newId('pr'), label, description, origin, createdAt: now() };
      state.problems.push(p); save(); return p;
    },

    /** Append an event. Rejects unknown kinds, unknown actors, and system claims that cite nothing. */
    append(ev) {
      if (!EVENT_KINDS.includes(ev.kind)) throw new Error(`unknown event kind: ${ev.kind}`);
      if (!ACTORS.includes(ev.actor)) throw new Error(`unknown actor: ${ev.actor}`);
      const claim = ['observation', 'problem_evidence', 'recommendation'].includes(ev.kind);
      if (claim && ev.actor === 'system' && !(ev.payload && Array.isArray(ev.payload.cites) && ev.payload.cites.length)) {
        throw new Error(`system ${ev.kind} must cite at least one artifact`);
      }
      if (ev.kind === 'rung_changed') {
        if (!ev.evidenceEventId) throw new Error('rung_changed must cite evidenceEventId');
        if (ev.actor === 'system' && ev.payload.to > SYSTEM_MAX_RUNG) throw new Error(`system may not set rung ${ev.payload.to}`);
      }
      const row = {
        id: ev.id || newId('e'), at: ev.at || now(), actor: ev.actor, kind: ev.kind,
        personId: ev.personId || null, companyId: ev.companyId || null, artifactId: ev.artifactId || null,
        problemId: ev.problemId || null, payload: ev.payload || {}, evidenceEventId: ev.evidenceEventId || null,
        model: ev.model || null, promptVersion: ev.promptVersion || null, origin: ev.origin || 'real',
      };
      state.events.push(row); save(); return row;
    },

    events() { return state.events; },
    /** Events about a person: tagged directly, or attached to an artifact they authored. */
    eventsFor(personId) {
      const theirs = new Set(state.artifacts.filter((a) => a.authorPersonId === personId).map((a) => a.id));
      return state.events.filter((e) => e.personId === personId || (e.artifactId && theirs.has(e.artifactId)));
    },
    eventsForArtifact(artifactId) { return state.events.filter((e) => e.artifactId === artifactId); },

    replaceState(next) { state = next && next.events ? next : emptyState(); save(); },
    export() { return JSON.stringify(state, null, 2); },
  };
  return store;
}

/** Small stable hash for revision binding. Not cryptographic. */
export function hashText(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * Resolve the author of an artifact. URL first (certain), confirmed alias next,
 * unconfirmed name alias last (needs Jay). Returns { person, how, confidence }.
 */
export function resolveAuthor({ text = '', guessName = null, guessUrl = null }, store) {
  const url = extractLinkedIn(text) || normaliseLinkedIn(guessUrl);
  if (url) {
    const p = store.state.persons.find((x) => x.linkedinUrl === url);
    if (p) return { person: p, how: 'url', confidence: 1 };
  }
  const name = normaliseName(guessName);
  if (name) {
    const hits = store.state.aliases.filter((a) => a.kind === 'name' && a.alias === name);
    if (hits.length === 1) {
      const p = store.person(hits[0].personId);
      return { person: p, how: 'alias', confidence: hits[0].confirmedByJay ? 0.95 : 0.7 };
    }
    if (hits.length > 1) return { person: null, how: 'ambiguous', confidence: 0, candidates: hits.map((h) => store.person(h.personId)) };
  }
  return { person: null, how: null, confidence: 0, url };
}

/** Current rung from the log: the latest rung_changed for this person, else 0 if anything is on file. */
export function currentRung(events) {
  let rung = null;
  for (const e of events) if (e.kind === 'rung_changed') rung = e.payload.to;
  if (rung !== null) return rung;
  return events.length ? 0 : null;
}

/**
 * The rung the evidence supports, with the event that proves it.
 * Pure. Does not care who may write it; see proposeRungChange.
 */
export function evidenceRung(events) {
  let best = { rung: events.some((e) => e.kind === 'artifact_captured') ? 0 : null, evidence: null };
  const bump = (rung, ev) => { if (best.rung === null || rung > best.rung) best = { rung, evidence: ev }; };
  for (const e of events) {
    if (e.kind === 'action' && ['commented', 'saved'].includes(e.payload.kind)) bump(1, e);
    if (e.kind === 'response_observed' && e.payload.kind === 'like') bump(1, e);
    if (e.kind === 'response_observed' && ['reply', 'dm', 'connection_accepted'].includes(e.payload.kind)) bump(2, e);
    if (e.kind === 'problem_evidence' && e.actor === 'jay') bump(3, e);
    if (e.kind === 'response_observed' && e.payload.asksAboutQb) bump(4, e);
    if ((e.kind === 'action' && e.payload.kind === 'meeting') || (e.kind === 'response_observed' && e.payload.kind === 'meeting_booked')) bump(5, e);
  }
  return best;
}

/**
 * What should happen to the ladder now. Returns one of:
 *  { kind: 'none' }
 *  { kind: 'system', to, evidenceEventId }      system may write this (to ≤ 2)
 *  { kind: 'needs_jay', to, evidenceEventId }   evidence supports it; only Jay may write it
 */
export function proposeRungChange(events) {
  const cur = currentRung(events);
  const ev = evidenceRung(events);
  if (ev.rung === null || cur === null || ev.rung <= cur) return { kind: 'none' };
  const to = ev.rung;
  const evidenceEventId = ev.evidence ? ev.evidence.id : null;
  if (!evidenceEventId) return { kind: 'none' };
  return to <= SYSTEM_MAX_RUNG ? { kind: 'system', to, evidenceEventId } : { kind: 'needs_jay', to, evidenceEventId };
}

/** Apply a system-permitted rung change, if any. Returns the event or null. */
export function applySystemRung(store, personId) {
  const events = store.eventsFor(personId);
  const p = proposeRungChange(events);
  if (p.kind !== 'system') return null;
  return store.append({
    kind: 'rung_changed', actor: 'system', personId, evidenceEventId: p.evidenceEventId,
    payload: { from: currentRung(events), to: p.to }, origin: store.person(personId)?.origin || 'real',
  });
}

export function daysBetween(aIso, bIso) {
  return Math.floor((new Date(bIso) - new Date(aIso)) / 86400000);
}

/**
 * The context pack: what the system carries into a reading. Budgeted, weighted,
 * truncating, honest about emptiness. Returns { status, markdown, eventIds, truncated }.
 */
export function contextPack(store, personId, { budget = 6000, now = null } = {}) {
  const person = store.person(personId);
  if (!person) return { status: 'empty', markdown: '', eventIds: [], truncated: false };
  const events = store.eventsFor(personId);
  const nowIso = now || store.now();
  const company = person.companyId ? store.company(person.companyId) : null;
  if (!events.length) {
    return { status: 'empty', markdown: `# ${person.displayName}\nNo prior context. This is the first time we have seen them.`, eventIds: [], truncated: false };
  }
  const rung = currentRung(events);
  const sections = [];
  const used = new Set();
  const push = (weight, text, ids = []) => { sections.push({ weight, text }); ids.forEach((i) => used.add(i)); };

  push(1000, `# ${person.displayName}${person.title ? ` · ${person.title}` : ''}${company ? ` · ${company.name}` : ''}\nLadder: rung ${rung} (${RUNGS[rung]}). ${events.length} events on file.`);

  const confirmed = events.filter((e) => e.kind === 'problem_evidence' && e.actor === 'jay');
  if (confirmed.length) {
    push(90, `## Problems they have demonstrated (confirmed by Jay)\n` + confirmed.map((e) => {
      const pr = store.problem(e.problemId); return `- ${pr ? pr.label : 'problem'}: "${e.payload.quote || ''}" (${e.at.slice(0, 10)})`;
    }).join('\n'), confirmed.map((e) => e.id));
  }
  const proposed = events.filter((e) => e.kind === 'problem_evidence' && e.actor === 'system');
  if (proposed.length) {
    push(50, `## Problems the system proposed (not confirmed)\n` + proposed.slice(-5).map((e) => {
      const pr = store.problem(e.problemId); return `- ${pr ? pr.label : 'problem'}: "${e.payload.quote || ''}"`;
    }).join('\n'), proposed.slice(-5).map((e) => e.id));
  }
  const interactions = events.filter((e) => ['action', 'response_observed', 'decision'].includes(e.kind)).slice(-10).reverse();
  if (interactions.length) {
    push(100, `## What happened between us (newest first)\n` + interactions.map((e) => {
      const d = daysBetween(e.at, nowIso);
      if (e.kind === 'action') return `- ${d}d ago · Jay ${e.payload.kind}${e.payload.text ? `: "${trim(e.payload.text, 160)}"` : ''}`;
      if (e.kind === 'response_observed') return `- ${d}d ago · they ${e.payload.kind}${e.payload.text ? `: "${trim(e.payload.text, 160)}"` : ''}${e.payload.asksAboutQb ? ' · asked about QB' : ''}`;
      return `- ${d}d ago · Jay decided ${e.payload.verdict}${e.payload.agreedWithSystem === false ? ' (overrode the system)' : ''}`;
    }).join('\n'), interactions.map((e) => e.id));
  }
  const obs = events.filter((e) => e.kind === 'observation').slice(-6).reverse();
  if (obs.length) push(60, `## Earlier observations\n` + obs.map((e) => `- ${e.payload.text}`).join('\n'), obs.map((e) => e.id));
  const last = interactions[0];
  if (last) {
    const whose = last.kind === 'action' ? 'theirs' : last.kind === 'response_observed' ? 'ours' : 'ours';
    push(80, `## Ball\nLast move was ${last.kind === 'action' ? 'ours' : 'theirs'} ${daysBetween(last.at, nowIso)}d ago. The next move is ${whose}.`);
  }

  // Strict-priority truncation: the identity section always survives.
  sections.sort((a, b) => b.weight - a.weight);
  let out = '', truncated = false;
  for (const s of sections) {
    if (out.length + s.text.length + 2 > budget && out) { truncated = true; continue; }
    out += (out ? '\n\n' : '') + s.text;
  }
  return { status: 'ok', markdown: out, eventIds: [...used], truncated };
}

function trim(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/** Artifacts Jay acted on with no response recorded since. Aged by first-seen. */
export function openLoops(store, nowIso = null) {
  const now = nowIso || store.now();
  const out = [];
  for (const a of store.state.artifacts) {
    const evs = store.eventsForArtifact(a.id);
    const action = evs.filter((e) => e.kind === 'action').pop();
    if (!action) continue;
    const resp = evs.find((e) => e.kind === 'response_observed' && e.at >= action.at);
    if (resp) continue;
    out.push({ artifact: a, action, person: a.authorPersonId ? store.person(a.authorPersonId) : null, days: daysBetween(action.at, now) });
  }
  return out.sort((x, y) => y.days - x.days);
}

/** Normalised edit distance 0..1 between two strings (how much Jay rewrote a draft). */
export function editRatio(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a && !b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n] / Math.max(m, n);
}

/** People table projection. */
export function peopleTable(store) {
  return store.state.persons.map((p) => {
    const evs = store.eventsFor(p.id);
    const last = evs[evs.length - 1];
    return { person: p, company: p.companyId ? store.company(p.companyId) : null, rung: currentRung(evs), events: evs.length, lastAt: last ? last.at : null };
  }).sort((x, y) => (y.rung ?? -1) - (x.rung ?? -1) || String(y.lastAt).localeCompare(String(x.lastAt)));
}

/** Problems ranked by confirmed evidence count. */
export function problemTable(store) {
  return store.state.problems.map((pr) => {
    const evs = store.events().filter((e) => e.kind === 'problem_evidence' && e.problemId === pr.id);
    const confirmed = evs.filter((e) => e.actor === 'jay');
    return { problem: pr, confirmed: confirmed.length, proposed: evs.length - confirmed.length, people: new Set(confirmed.map((e) => e.personId)).size };
  }).sort((a, b) => b.confirmed - a.confirmed || b.proposed - a.proposed);
}

/**
 * Example data: fictional people and a fictional prior history, every row tagged origin 'example'.
 * Lives in its own namespace and never mixes with the real log.
 */
export function seedExample(store, nowIso = null) {
  const now = new Date(nowIso || store.now());
  const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();
  const co = store.addCompany({ name: 'Harborline Property Group', origin: 'example' });
  const priya = store.addPerson({ displayName: 'Priya Natarajan', linkedinUrl: 'https://www.linkedin.com/in/priya-natarajan-example', companyId: co.id, title: 'Director of Operations', origin: 'example' });
  const a1 = store.addArtifact({
    sourceKind: 'linkedin_post', url: 'https://www.linkedin.com/posts/example-1', origin: 'example', authorPersonId: priya.id, capturedAt: ago(21),
    rawText: 'Genuine question for other ops leaders: how do you keep a maintenance request alive between the resident portal, the vendor, and the on-site team? Ours die in the handoff and nobody finds out until the resident calls again.',
  });
  const e1 = store.append({ kind: 'artifact_captured', actor: 'jay', personId: priya.id, artifactId: a1.id, at: ago(21), origin: 'example', payload: { sourceKind: 'linkedin_post' } });
  store.append({ kind: 'author_resolved', actor: 'system', personId: priya.id, artifactId: a1.id, at: ago(21), origin: 'example', payload: { how: 'url', confidence: 1 } });
  store.append({ kind: 'observation', actor: 'system', personId: priya.id, artifactId: a1.id, at: ago(21), origin: 'example', payload: { text: 'A direct question to peers, not a broadcast. She names three systems and a failure mode.', cites: [a1.id] } });
  const pr = store.addProblem({ label: 'Maintenance requests lost between portal, vendor and on-site team', origin: 'example' });
  const pe = store.append({ kind: 'problem_evidence', actor: 'system', personId: priya.id, artifactId: a1.id, problemId: pr.id, at: ago(21), origin: 'example', payload: { quote: 'Ours die in the handoff and nobody finds out until the resident calls again.', cites: [a1.id] } });
  store.append({ kind: 'recommendation', actor: 'system', personId: priya.id, artifactId: a1.id, at: ago(21), origin: 'example', payload: { verdict: 'COMMENT', reasons: ['She asked a question', 'Three named systems and a failure mode', 'Operations in property, inside QB\'s lane'], cites: [a1.id] } });
  store.append({ kind: 'decision', actor: 'jay', personId: priya.id, artifactId: a1.id, at: ago(21), origin: 'example', payload: { verdict: 'COMMENT', agreedWithSystem: true } });
  const act = store.append({ kind: 'action', actor: 'jay', personId: priya.id, artifactId: a1.id, at: ago(21), origin: 'example', payload: { kind: 'commented', text: 'The request dies because no system owns the gap between the other two. Who is supposed to notice when the vendor goes quiet, and what do they see when they look?' } });
  store.append({ kind: 'rung_changed', actor: 'system', personId: priya.id, at: ago(21), origin: 'example', evidenceEventId: act.id, payload: { from: 0, to: 1 } });
  const resp = store.append({ kind: 'response_observed', actor: 'jay', personId: priya.id, artifactId: a1.id, at: ago(19), origin: 'example', payload: { kind: 'reply', by: 'external', text: 'Honestly nobody. The property manager finds out from the resident. We tried a shared spreadsheet and it lasted a month.' } });
  store.append({ kind: 'rung_changed', actor: 'system', personId: priya.id, at: ago(19), origin: 'example', evidenceEventId: resp.id, payload: { from: 1, to: 2 } });
  const conf = store.append({ kind: 'problem_evidence', actor: 'jay', personId: priya.id, artifactId: a1.id, problemId: pr.id, at: ago(19), origin: 'example', evidenceEventId: pe.id, payload: { quote: 'The property manager finds out from the resident. We tried a shared spreadsheet and it lasted a month.', cites: [a1.id] } });
  store.append({ kind: 'rung_changed', actor: 'jay', personId: priya.id, at: ago(19), origin: 'example', evidenceEventId: conf.id, payload: { from: 2, to: 3 } });

  // A second person with attention only, so the ladder shows a contrast.
  const marcus = store.addPerson({ displayName: 'Marcus Oyelaran', linkedinUrl: 'https://www.linkedin.com/in/marcus-oyelaran-example', title: 'Founder, Driftwood Hospitality', origin: 'example' });
  const a2 = store.addArtifact({ sourceKind: 'linkedin_post', origin: 'example', authorPersonId: marcus.id, capturedAt: ago(9), rawText: 'Hot take: most hotel tech problems are people problems. Agree?' });
  store.append({ kind: 'artifact_captured', actor: 'jay', personId: marcus.id, artifactId: a2.id, at: ago(9), origin: 'example', payload: { sourceKind: 'linkedin_post' } });
  store.append({ kind: 'recommendation', actor: 'system', personId: marcus.id, artifactId: a2.id, at: ago(9), origin: 'example', payload: { verdict: 'SCROLL', reasons: ['A broadcast, not a question', 'No system, no failure, no cost named'], cites: [a2.id] } });
  store.append({ kind: 'decision', actor: 'jay', personId: marcus.id, artifactId: a2.id, at: ago(9), origin: 'example', payload: { verdict: 'SAVE', agreedWithSystem: false, note: 'Runs three properties. Worth a second look.' } });
  const act2 = store.append({ kind: 'action', actor: 'jay', personId: marcus.id, artifactId: a2.id, at: ago(9), origin: 'example', payload: { kind: 'saved' } });
  store.append({ kind: 'rung_changed', actor: 'system', personId: marcus.id, at: ago(9), origin: 'example', evidenceEventId: act2.id, payload: { from: 0, to: 1 } });

  return { priya, marcus, problem: pr, artifact: a1, firstEvent: e1 };
}

/** The example artifact Jay can paste to film a reading with prior context. */
export const EXAMPLE_ARTIFACT = `Priya Natarajan · Director of Operations, Harborline Property Group
https://www.linkedin.com/in/priya-natarajan-example

Update on the maintenance handoff thing from a few weeks ago. We mapped it. A request touches five people and three systems before anyone with a wrench sees it, and two of those steps are someone re-typing what the last person wrote. Vendor confirmations still arrive by text message to whoever happened to call them.

I am not looking for another portal. I want to know who has actually solved the "who notices when it goes quiet" problem without hiring a coordinator.`;

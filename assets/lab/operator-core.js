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

/* =====================================================================
   THE INSTRUMENT · graph projection, force layout, camera
   Pure. Everything below is derived from the log; nothing is decorative.
   ===================================================================== */

/** Deterministic hash → [0,1). */
export function unit(s) { const h = parseInt(hashText(String(s)), 16); return (h % 100000) / 100000; }

/**
 * The graph is a projection of the log. Nodes: problems (what QB cares about), people,
 * companies, artifacts. Edges are evidence: who belongs where, who wrote what, which
 * artifact demonstrated which problem (dashed until Jay confirms). Weights are counts.
 */
export function graphModel(store) {
  const nodes = [], edges = [];
  const now = store.now();
  const loops = new Set(openLoops(store, now).map((l) => l.artifact.authorPersonId).filter(Boolean));
  for (const row of problemTable(store)) {
    nodes.push({ id: row.problem.id, kind: 'problem', label: row.problem.label, confirmed: row.confirmed, proposed: row.proposed, people: row.people, origin: row.problem.origin });
  }
  for (const c of store.state.companies) nodes.push({ id: c.id, kind: 'company', label: c.name, origin: c.origin });
  for (const row of peopleTable(store)) {
    const p = row.person;
    nodes.push({ id: p.id, kind: 'person', label: p.displayName, title: p.title, rung: row.rung, events: row.events, lastAt: row.lastAt, companyId: p.companyId, openLoop: loops.has(p.id), origin: p.origin });
    if (p.companyId && store.company(p.companyId)) edges.push({ id: `m:${p.id}`, source: p.id, target: p.companyId, kind: 'member', weight: 1 });
  }
  for (const a of store.state.artifacts) {
    const evs = store.eventsForArtifact(a.id);
    const dec = evs.filter((e) => e.kind === 'decision').pop();
    const rec = evs.filter((e) => e.kind === 'recommendation').pop();
    nodes.push({ id: a.id, kind: 'artifact', label: trim(a.rawText.replace(/\s+/g, ' '), 80), authorPersonId: a.authorPersonId, verdict: dec ? dec.payload.verdict : rec ? rec.payload.verdict : null, decided: Boolean(dec), capturedAt: a.capturedAt, origin: a.origin });
    if (a.authorPersonId) edges.push({ id: `w:${a.id}`, source: a.authorPersonId, target: a.id, kind: 'authored', weight: 1 });
    const byProblem = new Map();
    for (const e of evs.filter((x) => x.kind === 'problem_evidence' && x.problemId)) {
      const cur = byProblem.get(e.problemId) || { confirmed: false, count: 0, eventId: e.id };
      cur.count += 1; if (e.actor === 'jay') { cur.confirmed = true; cur.eventId = e.id; }
      byProblem.set(e.problemId, cur);
    }
    for (const [problemId, v] of byProblem) edges.push({ id: `e:${a.id}:${problemId}`, source: a.id, target: problemId, kind: 'evidence', confirmed: v.confirmed, weight: v.count, eventId: v.eventId });
  }
  return { nodes, edges };
}

export const LAYOUT = {
  radius: { problem: 85, person: 250, company: 360, artifact: 250 },
  length: { member: 70, authored: 34, evidence: 120 },
  size: { problem: 7, person: 8, company: 5, artifact: 2.6 },
};

/** Where a new node should start: near its anchor if it has one, else on its ring at a hashed angle. */
export function seedPosition(node, positions, edges) {
  const anchor = edges.find((e) => (e.source === node.id && positions[e.target]) || (e.target === node.id && positions[e.source]));
  if (anchor) {
    const other = positions[anchor.source === node.id ? anchor.target : anchor.source];
    const a = unit(node.id) * Math.PI * 2;
    return { x: other.x + Math.cos(a) * 24, y: other.y + Math.sin(a) * 24 };
  }
  const a = unit(node.id) * Math.PI * 2, r = LAYOUT.radius[node.kind] || 200;
  return { x: Math.cos(a) * (r || 30), y: Math.sin(a) * (r || 30) };
}

/**
 * One tick of a small force layout. Mutates positions {id: {x,y,vx,vy}}. Forces: repulsion
 * between all nodes (capped), springs along edges, a gentle radial pull by kind so problems
 * sit at the centre, people around them, companies outside, and a centring pull.
 * Returns the mean speed, so a caller can stop when it is still.
 */
export function layoutTick(model, positions, { alpha = 1, damping = 0.78 } = {}) {
  const { nodes, edges } = model;
  const P = positions;
  for (const n of nodes) if (!P[n.id]) { const s = seedPosition(n, P, edges); P[n.id] = { x: s.x, y: s.y, vx: 0, vy: 0 }; }
  for (let i = 0; i < nodes.length; i++) {
    const a = P[nodes[i].id];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = P[nodes[j].id];
      let dx = a.x - b.x, dy = a.y - b.y; let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) { dx = (unit(nodes[i].id + nodes[j].id) - 0.5) * 0.1; dy = 0.05; d2 = dx * dx + dy * dy; }
      const small = nodes[i].kind === 'artifact' || nodes[j].kind === 'artifact';
      const k = (small ? 260 : 900) * alpha / Math.max(d2, 60);
      const d = Math.sqrt(d2); const fx = (dx / d) * Math.min(k, 6), fy = (dy / d) * Math.min(k, 6);
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  for (const e of edges) {
    const a = P[e.source], b = P[e.target]; if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y; const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const rest = LAYOUT.length[e.kind] || 80;
    const k = (e.kind === 'authored' ? 0.12 : 0.05) * alpha;
    const f = (d - rest) * k; const fx = (dx / d) * f, fy = (dy / d) * f;
    a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
  }
  let speed = 0;
  for (const n of nodes) {
    const p = P[n.id];
    const r = Math.sqrt(p.x * p.x + p.y * p.y) || 0.01;
    const target = LAYOUT.radius[n.kind];
    if (n.kind !== 'artifact') { const f = (target - r) * 0.012 * alpha; p.vx += (p.x / r) * f; p.vy += (p.y / r) * f; }
    p.vx -= p.x * 0.0006 * alpha; p.vy -= p.y * 0.0006 * alpha;
    p.vx *= damping; p.vy *= damping; p.x += p.vx; p.y += p.vy;
    speed += Math.abs(p.vx) + Math.abs(p.vy);
  }
  return nodes.length ? speed / nodes.length : 0;
}

/** Run the layout to rest. Deterministic for a given model. */
export function layoutSettle(model, positions = {}, maxTicks = 400) {
  let alpha = 1, speed = Infinity, t = 0;
  while (t < maxTicks && speed > 0.02) { speed = layoutTick(model, positions, { alpha }); alpha = Math.max(0.08, alpha * 0.985); t++; }
  return positions;
}

/** Bounds of all positions with padding. */
export function bounds(positions, pad = 60) {
  const pts = Object.values(positions);
  if (!pts.length) return { x: -200, y: -150, w: 400, h: 300 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x: x0 - pad, y: y0 - pad, w: Math.max(x1 - x0 + 2 * pad, 200), h: Math.max(y1 - y0 + 2 * pad, 150) };
}

/**
 * The camera target as a viewBox rect for a given aspect. `focus` is a position or null for home.
 * `panelFrac` is the fraction of the viewport the left panel covers, so a focused node sits in
 * the clear part of the screen rather than under the dossier.
 */
export function cameraRect({ focus, positions, aspect, panelFrac = 0, zoomW = 360, labelPad = 170 }) {
  if (!focus) {
    const b = bounds(positions); b.w += labelPad; // labels hang to the right of nodes
    let w = b.w, h = b.h;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    // Keep the whole picture in the clear part of the screen.
    const clearW = w * (1 - panelFrac);
    const scale = Math.max(1, b.w / clearW);
    w *= scale; h *= scale;
    return { x: cx - w / 2 - (w * panelFrac) / 2, y: cy - h / 2, w, h };
  }
  const w = zoomW, h = zoomW / aspect;
  const shift = (w * panelFrac) / 2;
  return { x: focus.x - w / 2 - shift, y: focus.y - h / 2, w, h };
}

export function lerpRect(a, b, k) {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k };
}
export function rectClose(a, b, eps = 0.05) {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps && Math.abs(a.w - b.w) < eps && Math.abs(a.h - b.h) < eps;
}

/* ---------- a richer fictional example, so the macro view has something to show ---------- */
export function seedExampleWide(store, nowIso = null) {
  const base = seedExample(store, nowIso);
  const now = new Date(nowIso || store.now());
  const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();
  const add = (name, title, company, url, post, probLabel, quote, days, path) => {
    const co = company ? store.addCompany({ name: company, origin: 'example' }) : null;
    const p = store.addPerson({ displayName: name, title, companyId: co ? co.id : null, linkedinUrl: url, origin: 'example' });
    const a = store.addArtifact({ sourceKind: 'linkedin_post', origin: 'example', authorPersonId: p.id, capturedAt: ago(days), rawText: post });
    store.append({ kind: 'artifact_captured', actor: 'jay', personId: p.id, artifactId: a.id, at: ago(days), origin: 'example', payload: { sourceKind: 'linkedin_post' } });
    let pr = null, pe = null;
    if (probLabel) {
      pr = store.addProblem({ label: probLabel, origin: 'example' });
      pe = store.append({ kind: 'problem_evidence', actor: 'system', personId: p.id, artifactId: a.id, problemId: pr.id, at: ago(days), origin: 'example', payload: { quote, cites: [a.id] } });
    }
    const verdict = path.includes('comment') ? 'COMMENT' : path.includes('save') ? 'SAVE' : 'SCROLL';
    store.append({ kind: 'recommendation', actor: 'system', personId: p.id, artifactId: a.id, at: ago(days), origin: 'example', payload: { verdict, reasons: ['example'], cites: [a.id] } });
    store.append({ kind: 'decision', actor: 'jay', personId: p.id, artifactId: a.id, at: ago(days), origin: 'example', payload: { verdict, agreedWithSystem: true } });
    if (path.includes('comment') || path.includes('save')) {
      const act = store.append({ kind: 'action', actor: 'jay', personId: p.id, artifactId: a.id, at: ago(days), origin: 'example', payload: { kind: path.includes('comment') ? 'commented' : 'saved', text: path.includes('comment') ? 'Who is supposed to notice first, and what do they see when they look?' : undefined } });
      store.append({ kind: 'rung_changed', actor: 'system', personId: p.id, at: ago(days), origin: 'example', evidenceEventId: act.id, payload: { from: 0, to: 1 } });
    }
    if (path.includes('reply')) {
      const r = store.append({ kind: 'response_observed', actor: 'jay', personId: p.id, artifactId: a.id, at: ago(Math.max(days - 2, 0)), origin: 'example', payload: { kind: 'reply', by: 'external', text: 'Exactly this. Nobody owns the gap.' } });
      store.append({ kind: 'rung_changed', actor: 'system', personId: p.id, at: ago(Math.max(days - 2, 0)), origin: 'example', evidenceEventId: r.id, payload: { from: 1, to: 2 } });
    }
    if (path.includes('confirm') && pe) {
      const c = store.append({ kind: 'problem_evidence', actor: 'jay', personId: p.id, artifactId: a.id, problemId: pr.id, at: ago(Math.max(days - 2, 0)), origin: 'example', evidenceEventId: pe.id, payload: { quote, cites: [a.id] } });
      store.append({ kind: 'rung_changed', actor: 'jay', personId: p.id, at: ago(Math.max(days - 2, 0)), origin: 'example', evidenceEventId: c.id, payload: { from: 2, to: 3 } });
    }
    if (path.includes('meeting')) {
      const m = store.append({ kind: 'response_observed', actor: 'jay', personId: p.id, artifactId: a.id, at: ago(Math.max(days - 5, 0)), origin: 'example', payload: { kind: 'dm', by: 'external', asksAboutQb: true, text: 'Could we talk about how you would approach this?' } });
      store.append({ kind: 'rung_changed', actor: 'jay', personId: p.id, at: ago(Math.max(days - 5, 0)), origin: 'example', evidenceEventId: m.id, payload: { from: 3, to: 4 } });
    }
    return p;
  };
  const P1 = 'Maintenance requests lost between portal, vendor and on-site team';
  const P2 = 'Vendor status lives in text messages nobody else can see';
  const P3 = 'Front desk re-keys the same booking into three systems';
  const P4 = 'Night audit exceptions discovered days later by accounting';
  const P5 = 'Owner reporting assembled by hand from six exports';
  add('Tomás Herrera', 'Regional Property Manager', 'Harborline Property Group', 'https://www.linkedin.com/in/tomas-herrera-example',
    'Our vendors confirm by text. To the person who called. Which means the status of a $4k repair lives in one phone. Anyone solved this without a new portal?', P2,
    'the status of a $4k repair lives in one phone', 14, ['comment', 'reply', 'confirm']);
  add('Lena Abiodun', 'General Manager', 'Driftwood Hospitality', 'https://www.linkedin.com/in/lena-abiodun-example',
    'Night audit found an exception from eleven days ago. Accounting found it today. Everyone did their job. The job is the problem.', P4,
    'Night audit found an exception from eleven days ago. Accounting found it today.', 12, ['comment', 'reply']);
  add('Sam Okonkwo', 'Director of Rooms', 'Driftwood Hospitality', 'https://www.linkedin.com/in/sam-okonkwo-example',
    'Front desk types each group booking into the PMS, the POS and a spreadsheet for the GM. Three times. Daily. Asking for a friend who is me.', P3,
    'types each group booking into the PMS, the POS and a spreadsheet for the GM. Three times.', 8, ['comment']);
  add('Rina Castellanos', 'Asset Manager', 'Westmark Residential', 'https://www.linkedin.com/in/rina-castellanos-example',
    'Monthly owner report: six exports, two hours, one person who is the only one who knows how. If she is sick, there is no report.', P5,
    'six exports, two hours, one person who is the only one who knows how', 6, ['comment', 'reply', 'confirm', 'meeting']);
  add('Dev Raman', 'Operations Lead', 'Westmark Residential', 'https://www.linkedin.com/in/dev-raman-example',
    'Residents call about a repair the vendor already finished. Nobody told the portal. So nobody told the resident.', P1,
    'Nobody told the portal. So nobody told the resident.', 4, ['save']);
  add('Noor Haddad', 'Founder', null, 'https://www.linkedin.com/in/noor-haddad-example',
    'AI will replace every property manager within five years. Thread.', null, null, 3, ['scroll']);
  add('Elliot Park', 'Director of Engineering', 'Harborline Property Group', 'https://www.linkedin.com/in/elliot-park-example',
    'Half my day is finding out what the other half of the building already knows. Work orders, vendor texts, resident emails, three inboxes.', P2,
    'finding out what the other half of the building already knows', 2, ['comment']);
  return base;
}

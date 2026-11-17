// Topic scout: what people type into YouTube's search box, set against the footage that actually exists. Two steps.
// `demand` asks YouTube's own search suggestions about each seed phrase and records what came back, in order.
// `rank` takes hand-written candidate topics and refuses any that cite a phrase nobody was shown to search for, then
// orders the rest: a topic with no real footage is listed as not makeable, never filled in.
// A suggestion's position is evidence that a phrase is searched; it is not a view count or a search volume, and
// nothing here says it is. Nothing here predicts views, publishes or spends credits.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, extname, isAbsolute } from 'node:path';
import { readJSON, writeJSON, writeText } from './util.mjs';

export const SUGGEST_HOST = 'suggestqueries.google.com';
const QUESTIONS = ['how to', 'why', 'what is', 'is', 'can', 'does'];
const ASKS = /^(how|why|what|is|are|can|does|do|should|which|when|where|who)\b/;
const VIDEO = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv']);
const norm = (s) => String(s).toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();

// the searches asked for one seed: the phrase, the questions around it, and (deep) every letter after it
export function queriesFor(seed, { deep = false } = {}) {
  const s = norm(seed), out = [{ q: s, kind: 'seed' }, ...QUESTIONS.map((w) => ({ q: `${w} ${s}`, kind: 'question' }))];
  if (deep) for (const c of 'abcdefghijklmnopqrstuvwxyz') out.push({ q: `${s} ${c}`, kind: 'deep' });
  return out;
}

// `["query", ["suggestion", ...], ...]`: anything else is refused, never guessed at
export function parseSuggest(body) {
  let j; try { j = JSON.parse(body); } catch { throw new Error(`search suggestions: not JSON (${String(body).slice(0, 80)})`); }
  if (!Array.isArray(j) || !Array.isArray(j[1])) throw new Error('search suggestions: unexpected shape');
  return j[1].filter((x) => typeof x === 'string').map(norm).filter(Boolean);
}

// curl, so the environment's proxy and certificates apply as they do for every other download here
export function fetchSuggest(q, { hl = 'en', gl = 'US' } = {}) {
  const args = ['-sS', '--fail', '--max-time', '20', '--get', `https://${SUGGEST_HOST}/complete/search`];
  for (const [k, v] of Object.entries({ client: 'firefox', ds: 'yt', ie: 'utf-8', oe: 'utf-8', hl, gl, q })) args.push('--data-urlencode', `${k}=${v}`);
  try { return execFileSync('curl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { throw new Error(`search suggestions for "${q.trim()}" failed: ${String(e.stderr ?? e.message).trim().split('\n')[0]} (is ${SUGGEST_HOST} allowed by the environment's network access?)`); }
}

// a suggestion belongs to a seed only if it carries every word of it ("why am i videos" is not about "ai video")
export function relevant(phrase, seed) {
  const words = norm(phrase).split(' ');
  return norm(seed).split(' ').every((t) => words.some((w) => w.startsWith(t)));
}

// Ask every query, keep the raw answers, and fold them into phrases: where each one appeared, and how high.
// `weight` adds (11 - position) / 10 for each search that surfaced the phrase: a way to order phrases, not a volume.
// A question search counts only toward phrases that open with the same question word: when nobody asks it that way,
// YouTube falls back to the plain phrase or to another question, and a fallback is not a second sign of demand.
export function gatherDemand(seeds, { deep = false, hl = 'en', gl = 'US', fetcher = fetchSuggest, pause = 150, now = new Date() } = {}) {
  seeds = [...new Set(seeds.map(norm).filter(Boolean))];
  if (!seeds.length) throw new Error('scout demand: give at least one seed phrase');
  const queries = [], phrases = new Map();
  for (const seed of seeds) for (const { q, kind } of queriesFor(seed, { deep })) {
    const suggestions = parseSuggest(fetcher(q, { hl, gl }));
    queries.push({ q, seed, kind, suggestions });
    suggestions.forEach((p, i) => {
      if (!relevant(p, seed) || (kind === 'question' && p.split(' ')[0] !== q.split(' ')[0])) return;
      const e = phrases.get(p) ?? { phrase: p, seeds: [], hits: [] };
      if (!e.seeds.includes(seed)) e.seeds.push(seed);
      e.hits.push({ q: q.trim(), pos: i + 1 });
      phrases.set(p, e);
    });
    if (pause) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pause); // a short breath between requests
  }
  const list = [...phrases.values()].map((e) => ({ ...e, question: ASKS.test(e.phrase), best: Math.min(...e.hits.map((h) => h.pos)),
    weight: +e.hits.reduce((a, h) => a + (11 - Math.min(10, h.pos)) / 10, 0).toFixed(2) })).sort((a, b) => b.weight - a.weight || a.best - b.best || a.phrase.localeCompare(b.phrase));
  return { schema: 'qb-capture/demand@1', source: `YouTube search suggestions (${SUGGEST_HOST}, ds=yt)`, fetched_at: now.toISOString(), locale: { hl, gl }, deep, seeds, queries, phrases: list,
    note: 'A phrase is listed because YouTube suggested it for the search shown, at the position shown. Position is not search volume or views.' };
}

export function demandReport(d) {
  const L = ['# Topic scout: what people search for', '',
    `From ${d.source}, ${d.fetched_at.slice(0, 10)}, ${d.locale.hl}-${d.locale.gl}. ${d.queries.length} searches over ${d.seeds.length} seed phrases gave ${d.phrases.length} phrases.`, '',
    '**What this is:** phrases YouTube itself completes, which it does for searches people make. **What it is not:** a search volume, a view count or a forecast. Read what ranks for a phrase before building on it.', ''];
  for (const seed of d.seeds) {
    const mine = d.phrases.filter((p) => p.seeds.includes(seed));
    L.push(`## ${seed}`, '');
    if (!mine.length) { L.push('Nothing suggested. Either nobody searches this wording, or the seed is too long: try fewer words.', ''); continue; }
    const row = (p) => `| ${p.phrase} | ${p.weight} | ${p.hits.map((h) => `"${h.q}" #${h.pos}`).join(', ')} |`;
    const qs = mine.filter((p) => p.question), rest = mine.filter((p) => !p.question);
    if (qs.length) L.push('**Questions people ask**', '', '| Phrase | Weight | Suggested for |', '|---|---|---|', ...qs.slice(0, 15).map(row), '');
    if (rest.length) L.push('**Searches**', '', '| Phrase | Weight | Suggested for |', '|---|---|---|', ...rest.slice(0, 25).map(row), '');
  }
  return L.join('\n');
}

// ---- rank ------------------------------------------------------------------------------------------------------
// candidates.json (qb-capture/scout@1), written by hand or by Claude following the qb-scout skill:
//   { demand: "demand.json", footage: "<folder the footage paths are relative to>",
//     candidates: [{ title, series, angle, phrases: ["a phrase from demand.json"], footage: ["excerpts/17.mp4"],
//                    seen: [{ url, what, on: "2026-11-17" }], gaps: ["..."] }] }
// `seen` is what was read on the web about the phrase (what ranks, how old, how big the channel): cited and dated,
// checked by a person, never scored.
export function rankCandidates(spec, { base = process.cwd(), now = new Date() } = {}) {
  const problems = [], warnings = [];
  if (spec.schema !== 'qb-capture/scout@1') problems.push('not a qb-capture/scout@1 file');
  const demandFile = resolve(base, spec.demand ?? 'demand.json');
  const demand = existsSync(demandFile) ? readJSON(demandFile) : null;
  if (!demand) problems.push(`no demand file at ${demandFile}: run \`scout demand\` first`);
  const byPhrase = new Map((demand?.phrases ?? []).map((p) => [p.phrase, p]));
  const days = demand ? Math.floor((now - new Date(demand.fetched_at)) / 864e5) : 0;
  if (days > 30) warnings.push(`the demand file is ${days} days old: suggestions drift, so fetch it again before choosing`);
  const root = spec.footage ? resolve(base, spec.footage) : base;
  const ranked = (spec.candidates ?? []).map((c, i) => {
    const id = c.title || `candidate ${i + 1}`;
    if (!c.title) problems.push(`candidate ${i + 1}: no title`);
    const cited = [];
    for (const raw of c.phrases ?? []) {
      const p = byPhrase.get(norm(raw));
      if (p) cited.push(p); else problems.push(`${id}: "${raw}" is not in the demand file, so nothing shows anyone searches for it. Cite a phrase that is there, or fetch it as a seed.`);
    }
    if (!(c.phrases ?? []).length) problems.push(`${id}: cites no search phrase`);
    for (const s of c.seen ?? []) if (!s.url || !s.on || !s.what) problems.push(`${id}: every "seen" entry needs a url, what was seen and the date it was read (on)`);
    const footage = (c.footage ?? []).map((f) => { const p = isAbsolute(f) ? f : join(root, f); return { path: f, found: existsSync(p) && VIDEO.has(extname(p).toLowerCase()) }; });
    const have = footage.filter((f) => f.found), missing = footage.filter((f) => !f.found).map((f) => f.path);
    // three phrases at most count, so a topic cannot climb by listing every wording of the same search
    const top = [...cited].sort((a, b) => b.weight - a.weight).slice(0, 3);
    return { title: c.title ?? '', series: c.series ?? '', angle: c.angle ?? '', makeable: have.length > 0, demand: +top.reduce((a, p) => a + p.weight, 0).toFixed(2),
      phrases: cited.map((p) => ({ phrase: p.phrase, weight: p.weight, question: p.question, hits: p.hits })), footage: have.map((f) => f.path),
      gaps: [!have.length && 'no footage of this exists yet', ...missing.map((m) => `footage named but not found: ${m}`), ...(c.gaps ?? [])].filter(Boolean), seen: c.seen ?? [] };
  }).sort((a, b) => b.makeable - a.makeable || b.demand - a.demand || a.title.localeCompare(b.title));
  return { ok: !problems.length, problems, warnings, demand: demand ? { file: demandFile, fetched_at: demand.fetched_at, source: demand.source } : null, footage: root, ranked };
}

export function briefReport(r) {
  const L = ['# Topic scout: ranked topics', '',
    `Search evidence: ${r.demand.source}, fetched ${r.demand.fetched_at.slice(0, 10)}. Footage checked in \`${r.footage}\`.`, '',
    'Order: topics that can be made from footage that exists come first, then by search evidence (the three strongest phrases each topic answers). The score orders topics. It is not a forecast of views, and a suggestion\'s position is not a search volume.', ''];
  if (r.warnings.length) L.push(...r.warnings.map((w) => `> ${w}`), '');
  r.ranked.forEach((c, i) => {
    L.push(`## ${i + 1}. ${c.title}${c.makeable ? '' : ' (not makeable yet)'}`, '', `- **Search evidence:** ${c.demand}${c.series ? ` · ${c.series}` : ''}`);
    if (c.angle) L.push(`- **Angle:** ${c.angle}`);
    for (const p of c.phrases) L.push(`- **"${p.phrase}"**${p.question ? ' (a question)' : ''}: suggested for ${p.hits.map((h) => `"${h.q}" at #${h.pos}`).join(', ')}`);
    L.push(`- **Footage:** ${c.footage.map((f) => `\`${f}\``).join(', ') || 'none'}`);
    for (const s of c.seen) L.push(`- **Seen ${s.on}:** ${s.what} (${s.url})`);
    if (c.gaps.length) L.push(`- **Gaps:** ${c.gaps.join('; ')}`);
    L.push('');
  });
  return L.join('\n');
}

export function scoutDemand(seeds, out, opts = {}) {
  const d = gatherDemand(seeds, opts);
  writeJSON(join(out, 'demand.json'), d); writeText(join(out, 'demand.md'), demandReport(d));
  return d;
}
export function scoutRank(file) {
  const base = dirname(resolve(file)), r = rankCandidates(JSON.parse(readFileSync(file, 'utf8')), { base });
  if (r.ok) { writeJSON(join(base, 'brief.json'), r); writeText(join(base, 'brief.md'), briefReport(r)); }
  return { ...r, out: join(base, 'brief.md') };
}

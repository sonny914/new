// Evidence validator. A storyboard renders only if:
//  - every scene (brand cards aside) cites at least one event, and every cited event exists;
//  - every number on screen or in the script comes from a metric, a cited event's text or data,
//    a cited event's timestamp, or a declared count whose items all appear in the cited text;
//  - every asset a scene uses is registered with provenance in session-assets.json.
import { parts, TZ } from './util.mjs';

const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

// Numbers written as digits ("2.6MB", "65/65", "+653", "06:59"); digits inside identifiers such as "be1b0f3" are skipped.
export function digitNumbers(s) {
  // skip digits that belong to identifiers: "be1b0f3", "20c1a03", "repo-68l8w7"
  // "1,078,106" is one number, not three
  return [...String(s).matchAll(/(?<![A-Za-z0-9_])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![0-9])(?![A-Za-z]+\d)/g)].map((m) => parseFloat(m[0].replace(/,/g, ''))).filter((n) => !Number.isNaN(n));
}
// Numbers written as words ("fifty-three", "two point six"). "one" and "zero" are left out: they are used as words, not counts.
export function wordNumbers(s) {
  const toks = String(s).toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    let v = null;
    if (TENS[toks[i]] != null) { v = TENS[toks[i]]; if (UNITS[toks[i + 1]] != null && UNITS[toks[i + 1]] < 10) v += UNITS[toks[++i]]; }
    else if (UNITS[toks[i]] != null) v = UNITS[toks[i]];
    if (v == null) continue;
    if (toks[i + 1] === 'hundred') { v *= 100; i++; }
    if (toks[i + 1] === 'point' && UNITS[toks[i + 2]] != null) { v = parseFloat(`${v}.${UNITS[toks[i + 2]]}`); i += 2; }
    if (v > 1) out.push(v);
  }
  return out;
}

function collectNumbers(v, out = []) {
  if (v == null) return out;
  if (typeof v === 'number') out.push(v);
  else if (typeof v === 'string') out.push(...digitNumbers(v));
  else if (Array.isArray(v)) { out.push(v.length); v.forEach((x) => collectNumbers(x, out)); }
  else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    collectNumbers(x, out);
    if (k === 'bytes' && typeof x === 'number') out.push(Math.round(x / 1e5) / 10, Math.round(x / 1e3)); // "2.6 MB", "84 KB"
  }
  return out;
}

// Dates and times are checked as whole tokens ("12 OCT", "14:47", "2026") against the cited events' own
// timestamps, then removed, so a bare "12" can never pass just because something happened on the 12th.
const MON = 'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';
const TIME_TOKENS = new RegExp(`\\b\\d{1,2}:\\d{2}\\b|\\b\\d{1,2} (?:${MON})\\b|\\b(?:${MON}) \\d{1,2}\\b|\\b20\\d\\d\\b`, 'gi');
export function timeTokens(refs, events, tz = TZ) {
  const ok = new Set();
  const byId = new Map(events.map((e) => [e.id, e]));
  for (const id of refs) {
    const e = byId.get(id); if (!e) continue;
    const p = parts(e.t, tz), mon = MON.split('|')[p.m - 1];
    [`${p.hh}:${p.mm}`, `${+p.hh}:${p.mm}`, `${p.d} ${mon}`, `${mon} ${p.d}`, String(p.y)].forEach((x) => ok.add(x.toUpperCase()));
  }
  return ok;
}
export function splitTimes(s) { const found = []; const rest = String(s).replace(TIME_TOKENS, (m) => { found.push(m.toUpperCase()); return ' '; }); return { found, rest }; }

export function allowedNumbers(refs, events, metrics, derived = [], tz = TZ) {
  const ok = new Set();
  const add = (n) => { ok.add(n); ok.add(Math.round(n * 10) / 10); };
  const byId = new Map(events.map((e) => [e.id, e]));
  for (const id of refs) {
    const e = byId.get(id);
    if (!e) continue;
    collectNumbers(e.text).forEach(add);
    wordNumbers(e.text).forEach(add);
    collectNumbers(e.data).forEach(add);
    e.refs.forEach((r) => { const m = r.match(/pr\/(\d+)/); if (m) add(+m[1]); });
  }
  for (const m of metrics) if (m.refs.some((r) => refs.includes(r))) { add(m.value); collectNumbers(m.display).forEach(add); }
  for (const d of derived) if (d.refs.some((r) => refs.includes(r))) add(d.value);
  return ok;
}

const TEXT_KEYS_SKIP = new Set(['asset', 'assets', 'ref', 'refs', 'id', 'template', 'src', 'href', 'kind', 'status', 'stage', 'tone', 'side', 'layout', 'x', 'y', 'w', 'h', 't', 'at', 'start', 'end', 'from', 'to', 'aspect', 'focus', 'scroll', 'accent']);
function textOfProps(v, out = []) {
  if (v == null) return out;
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'number') out.push(String(v));
  else if (Array.isArray(v)) v.forEach((x) => textOfProps(x, out));
  else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!TEXT_KEYS_SKIP.has(k)) textOfProps(x, out);
  return out;
}

export function validateDerived(derived, events) {
  const errors = [];
  const byId = new Map(events.map((e) => [e.id, e]));
  for (const d of derived) {
    const text = d.refs.map((r) => byId.get(r)?.text ?? '').join('\n');
    if (d.items.length !== d.value) errors.push(`derived "${d.key}": value ${d.value} but ${d.items.length} items listed`);
    for (const it of d.items) if (!text.includes(it)) errors.push(`derived "${d.key}": "${it}" not found in ${d.refs.join(', ')}`);
  }
  return errors;
}

export function validateStoryboard(sb, events, metrics, assets) {
  const errors = [], warnings = [];
  const ids = new Set(events.map((e) => e.id));
  const assetIds = new Set((assets?.assets ?? []).map((a) => a.id));
  const derived = sb.derived ?? [];
  errors.push(...validateDerived(derived, events));
  for (const fmt of Object.keys(sb.formats)) {
    for (const sc of sb.formats[fmt].scenes) {
      const where = `${fmt}/${sc.id}`;
      if (!sc.brand && !sc.refs?.length) errors.push(`${where}: cites no evidence`);
      for (const r of sc.refs ?? []) if (!ids.has(r)) errors.push(`${where}: cites missing event ${r}`);
      for (const a of [sc.props?.asset, sc.props?.before?.asset, sc.props?.after?.asset].filter(Boolean)) if (!assetIds.has(a)) errors.push(`${where}: asset "${a}" is not registered in session-assets.json`);
      const allowed = allowedNumbers(sc.refs ?? [], events, metrics, derived), times = timeTokens(sc.refs ?? [], events);
      const texts = [...textOfProps(sc.props), sc.narration ?? ''].map(splitTimes);
      // a token that is not a cited event's date or time (a ratio such as 9:16, say) is checked as plain numbers
      const loose = texts.flatMap((x) => x.found).filter((tok) => !times.has(tok));
      const seen = [...texts.flatMap((x) => digitNumbers(x.rest)), ...loose.flatMap(digitNumbers), ...wordNumbers(sc.narration ?? '')];
      for (const n of seen) if (!allowed.has(n) && !allowed.has(Math.round(n * 10) / 10)) errors.push(`${where}: the number ${n} is not backed by the events it cites (${(sc.refs ?? []).join(', ') || 'none'})`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

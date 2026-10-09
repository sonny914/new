/* Leads view — the rules, pure and tested (tools/leads.test.mjs). The page is assets/leads.js. */

/** Scoring normally lands in seconds; after this long an unscored lead is stuck, not waiting. */
export const PENDING_MS = 3 * 60 * 1000;
export const SCORES = ['HOT', 'WARM', 'COLD'];
export const FILTERS = ['all', 'HOT', 'WARM', 'COLD', 'unscored'];

/** 'scored' | 'pending' (a fresh lead the scorer is still on) | 'unscored' (stuck: needs a hand) */
export function statusOf(lead, now = Date.now()) {
  if (lead && SCORES.includes(String(lead.triage_score || '').toUpperCase())) return 'scored';
  const t = Date.parse(lead && lead.created_at);
  return Number.isFinite(t) && now - t < PENDING_MS ? 'pending' : 'unscored';
}

/** score-lead writes "reason | Next: step"; another tool writes JSON. Either way: { reason, next }. */
export function splitReasoning(text) {
  const s = String(text || '').trim();
  if (!s) return { reason: '', next: '' };
  if (s.startsWith('{')) {
    try {
      const o = JSON.parse(s);
      const reason = o.reasoning || o.summary || o.reason || 'Scored by another tool.';
      return { reason: String(reason), next: String(o.next_step || o.next || '') };
    } catch { /* fall through: show it as written */ }
  }
  const i = s.indexOf(' | Next: ');
  return i < 0 ? { reason: s, next: '' } : { reason: s.slice(0, i).trim(), next: s.slice(i + 9).trim() };
}

/** The intake composes pain_point as "LABEL: answer" lines; give back [{ label, text }], keeping multi-line answers. */
export function parseAnswers(painPoint) {
  const out = [];
  for (const line of String(painPoint || '').split('\n')) {
    const m = line.match(/^([A-Z][A-Z /]{2,40}):\s?(.*)$/);
    if (m) out.push({ label: m[1].charAt(0) + m[1].slice(1).toLowerCase(), text: m[2] });
    else if (out.length) out[out.length - 1].text += `\n${line}`;
    else if (line.trim()) out.push({ label: '', text: line });
  }
  return out.map((a) => ({ ...a, text: a.text.trim() })).filter((a) => a.text);
}

export function firstName(name) { return String(name || '').trim().split(/\s+/)[0] || ''; }

/** A reply that opens in the mail app, addressed and started. */
export function replyHref(lead) {
  const subject = `Quiet Bands, about ${lead.company_name || 'your note'}`;
  const hi = firstName(lead.contact_name);
  const body = `${hi ? `Hi ${hi},` : 'Hi,'}\n\n`;
  return `mailto:${encodeURIComponent(lead.email || '').replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function telHref(phone) { const d = String(phone || '').replace(/[^\d+]/g, ''); return d.length >= 7 ? `tel:${d}` : ''; }

export function ago(iso, now = Date.now()) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: now - t > 86400 * 300 * 1000 ? 'numeric' : undefined });
}

/** HOT | WARM | COLD | pending (the scorer has it) | unscored (stuck). Pending is nobody's job yet, so it is not 'unscored'. */
export function bucket(lead, now) { const s = statusOf(lead, now); return s === 'scored' ? String(lead.triage_score).toUpperCase() : s; }

export function counts(leads, now = Date.now()) {
  const c = { all: leads.length, HOT: 0, WARM: 0, COLD: 0, unscored: 0, pending: 0 };
  for (const l of leads) c[bucket(l, now)]++;
  return c;
}

export function filterLeads(leads, filter, now = Date.now()) {
  return filter === 'all' || !FILTERS.includes(filter) ? leads : leads.filter((l) => bucket(l, now) === filter);
}

/** What score-lead needs to find and score this lead (it matches the newest unscored lead by email). */
export function scorePayload(lead) {
  const keys = ['company_name', 'contact_name', 'email', 'phone', 'current_tech', 'pain_point', 'budget_range', 'timeline', 'source'];
  return Object.fromEntries(keys.map((k) => [k, lead[k] ?? null]));
}

/** Turn a score-lead response into one plain sentence for the owner. */
export function explainScoreResult(status, body) {
  const b = body && typeof body === 'object' ? body : {};
  if (status === 200 && b.success) return { ok: true, text: `Scored ${b.score}.` };
  if (status === 200 && b.reason === 'config') return { ok: false, text: 'Scoring is not set up on this deploy: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or ANTHROPIC_API_KEY is missing in Netlify.' };
  if (status === 404) return { ok: false, text: 'The scorer found no unscored lead for this email. Refresh: it may already be scored.' };
  if (b.error) return { ok: false, text: `Scoring failed: ${String(b.error).slice(0, 400)}` };
  return { ok: false, text: `Scoring failed with status ${status}.` };
}

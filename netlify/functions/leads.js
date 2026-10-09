// netlify/functions/leads.js
//
// The private read side of the leads table, for /leads/. The browser never holds a key that can read leads:
// this function reads them with the service role key (already set for score-lead) and hands them only to a
// request that carries the owner's view key. Fails closed: with no key configured, nothing is served.
//
// Env (Netlify → Site configuration → Environment variables, all deploy contexts):
//   SUPABASE_URL                 already set
//   SUPABASE_SERVICE_ROLE_KEY    already set (SUPABASE_SERVICE_KEY also accepted)
//   LEADS_VIEW_KEY               new: a long random passphrase, at least 24 characters. Type it into /leads/ once.

import { createHash, timingSafeEqual } from 'node:crypto';

export const MIN_KEY_LENGTH = 24;
const FIELDS = 'id,created_at,company_name,contact_name,email,phone,source,current_tech,timeline,budget_range,pain_point,triage_score,triage_reasoning,flagged_for_review,attribution,pressure_test';

const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
});
const digest = (s) => createHash('sha256').update(String(s)).digest();
/** Constant-time comparison of two secrets of any length. */
export function sameKey(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string' || !given || !expected) return false;
  return timingSafeEqual(digest(given), digest(expected));
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  if (req.method !== 'GET') return reply({ error: 'method not allowed' }, 405);

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  const VIEW_KEY = process.env.LEADS_VIEW_KEY || '';

  if (VIEW_KEY.length < MIN_KEY_LENGTH) return reply({ error: 'not_configured', detail: `Set LEADS_VIEW_KEY (${MIN_KEY_LENGTH}+ characters) in Netlify and redeploy.` }, 503);
  if (!sameKey(req.headers.get('x-leads-key') || '', VIEW_KEY)) { await pause(400); return reply({ error: 'wrong_key' }, 401); }
  if (!SUPABASE_URL || !SERVICE_KEY) return reply({ error: 'not_configured', detail: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Netlify.' }, 503);

  const q = new URLSearchParams({ select: FIELDS, order: 'created_at.desc', limit: '200' });
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?${q}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    if (!res.ok) { console.error('leads: supabase', res.status, await res.text()); return reply({ error: 'upstream', status: res.status }, 502); }
    return reply({ leads: await res.json(), at: new Date().toISOString() });
  } catch (e) {
    console.error('leads:', e);
    return reply({ error: 'upstream' }, 502);
  }
};

// netlify/functions/score-lead.js
//
// Scores a freshly inserted lead HOT / WARM / COLD with Claude and writes the score back
// to Supabase. Zero npm dependencies on purpose: it talks to the Supabase REST API and the
// Anthropic Messages API with the fetch() built into Node 18+, so the function bundles and
// runs from a drag-and-drop zip deploy with nothing to install.
//
// Env (Netlify → Site configuration → Environment variables):
//   SUPABASE_URL                 https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service role key (SUPABASE_SERVICE_KEY also accepted)
//   ANTHROPIC_API_KEY            Anthropic API key
//   ANTHROPIC_MODEL              optional, default claude-opus-5
//   ANTHROPIC_BASE_URL           optional, default https://api.anthropic.com

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const ANTHROPIC_BASE_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function supabaseHeaders(extra = {}) {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...extra };
}

/** Newest unscored lead for this email (service role bypasses RLS). */
async function findUnscoredLead(email) {
  const q = new URLSearchParams({ select: 'id', email: `eq.${email}`, triage_score: 'is.null', order: 'created_at.desc', limit: '1' });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?${q}`, { headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`Supabase lookup failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] ? rows[0].id : null;
}

async function updateLead(id, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: supabaseHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Supabase update failed: ${res.status} ${await res.text()}`);
}

function buildPrompt(lead) {
  const { company_name, contact_name, email, phone, current_tech, pain_point, budget_range, timeline, source } = lead;
  return `You are a lead scoring specialist for Quiet Bands, a Houston software development and technology consulting company that designs and builds custom software, internal tools, databases, APIs and integrations, workflow automation, prototypes and AI-assisted systems around real operational problems. The thesis: understand the work before building the software. Two paths: (1) commercial/property/operator engagements (hotels, residential properties, mixed-use, venues, multi-location operators, and any organization with a concrete manual process, integration gap or system limitation — typically five figures, project-based or ongoing) and (2) a productized small-business build (ordering/loyalty/payments, live at Frenchies Coffee Bar).

Field notes: pain_point contains the VERBATIM answers from the "Tell us about the work" intake (what is happening today, who does the work, how often, systems involved, what goes wrong, what they tried, artifacts, what would change) — quote their exact words in your summary rather than paraphrasing them away. current_tech may contain the systems involved or the operation type. source is "pressure-test" when the lead arrived from the R&D Pressure Test with an "explore a build" result, which means they already showed observable evidence, a workaround, a real cost and human confirmation.

Score this lead as HOT, WARM, or COLD based on fit and urgency.

Lead Information:
- Company: ${company_name}
- Contact: ${contact_name}
- Email: ${email}
- Phone: ${phone || '(not provided)'}
- Systems / operation: ${current_tech || '(not specified)'}
- Source: ${source || '(not specified)'}
- The work (verbatim): ${pain_point}
- Budget: ${budget_range || '(not specified)'}
- Timeline / frequency: ${timeline || '(not specified)'}

Scoring Criteria:
- HOT: A concrete, recurring operational problem with named people, systems and consequences (or a credible commercial/property/multi-location inquiry) — regardless of stated budget. Pressure Test "explore a build" leads with specific answers are usually HOT.
- WARM: Interested but vague, longer timeline, unclear consequence, or slightly lower fit. Exploratory operator conversations are WARM, not COLD — discovery interviews are a goal.
- COLD: Clearly outside both paths (e.g., generic marketing-site requests, pure content work, spam). A low stated budget alone is never COLD for an operator inquiry.

Respond ONLY with JSON in this format:
{
  "score": "HOT" or "WARM" or "COLD",
  "reasoning": "One sentence explaining the score, quoting their words where useful",
  "next_step": "Action Jay should take (e.g., 'Call today', 'Schedule discovery call', 'Follow up in 1 week')"
}`;
}

async function scoreWithClaude(lead) {
  const res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: buildPrompt(lead) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
  const message = await res.json();
  if (message.stop_reason === 'refusal') return null;
  const text = (message.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    const score = String(parsed.score || '').toUpperCase();
    if (!['HOT', 'WARM', 'COLD'].includes(score)) return null;
    return { score, reasoning: String(parsed.reasoning || ''), next_step: String(parsed.next_step || '') };
  } catch { return null; }
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let lead;
  try { lead = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
  if (!lead || !lead.email) return json({ error: 'email required' }, 400);

  if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_API_KEY) {
    console.error('score-lead: missing env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY)');
    return json({ ok: false, reason: 'config' });
  }

  try {
    const leadId = await findUnscoredLead(lead.email);
    if (!leadId) return json({ error: 'lead not found' }, 404);

    const triage = (await scoreWithClaude(lead)) || { score: 'WARM', reasoning: 'Unable to auto-score', next_step: 'Review manually' };
    const triage_reasoning = `${triage.reasoning} | Next: ${triage.next_step}`;

    await updateLead(leadId, { triage_score: triage.score, triage_reasoning, flagged_for_review: triage.score === 'COLD' });
    return json({ success: true, leadId, score: triage.score, reasoning: triage_reasoning });
  } catch (error) {
    console.error('Scoring error:', error);
    return json({ error: error.message }, 500);
  }
};

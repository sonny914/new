// netlify/functions/submission-created.js
//
// Netlify runs this after every verified form submission. For the lead forms (work-intake,
// note-lead, project-inquiry) it scores the lead HOT / WARM / COLD with Claude and posts the result to the
// `lead-scores` form, so it sits next to the lead in Netlify → Forms (turn on that form's email
// notification to get each score in your inbox). Other forms (the Studio's) are ignored. There is no
// database: the lead itself is already stored by Netlify Forms before this runs.
// Zero npm dependencies on purpose: it uses the fetch() built into Node 18+.
//
// Env (Netlify → Site configuration → Environment variables):
//   ANTHROPIC_API_KEY            Anthropic API key
//   ANTHROPIC_MODEL              optional, default claude-opus-5
//   ANTHROPIC_BASE_URL           optional, default https://api.anthropic.com
// Netlify sets URL (the site's primary address) itself.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const ANTHROPIC_BASE_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
const SITE_URL = (process.env.URL || 'https://quietbands.com').replace(/\/$/, '');

const LEAD_FORMS = ['work-intake', 'note-lead', 'project-inquiry'];

/** One submission's fields as the lead the scoring prompt expects. Pure; exported for tests. */
export function leadFrom(formName, d = {}) {
  if (formName === 'work-intake') {
    const pain_point = [
      `WHAT IS HAPPENING TODAY: ${d.today}`, d.who && `WHO DOES THIS WORK: ${d.who}`, d.how_often && `HOW OFTEN: ${d.how_often}`,
      d.systems && `SYSTEMS INVOLVED: ${d.systems}`, d.goes_wrong && `WHEN IT GOES WRONG: ${d.goes_wrong}`, d.tried && `ALREADY TRIED: ${d.tried}`,
      d.artifacts && `ARTIFACTS: ${d.artifacts}`, d.if_gone && `IF IT DISAPPEARED: ${d.if_gone}`, d.imagined_build && `IMAGINED BUILD: ${d.imagined_build}`,
    ].filter(Boolean).join('\n');
    return { contact_name: d.contact_name, company_name: d.company_name, email: d.email, pain_point, current_tech: d.systems || null, timeline: d.how_often || null, source: d.source || 'work-intake' };
  }
  if (formName === 'project-inquiry') {
    // The short inquiry on the home page.
    const pain_point = [d.project_type && `PROJECT TYPE: ${d.project_type}`, `WHAT IT SHOULD DO: ${d.details}`].filter(Boolean).join('\n');
    return { contact_name: d.contact_name, company_name: d.company_name, email: d.email, pain_point, current_tech: null, timeline: d.timeline || null, budget_range: d.budget || null, source: d.source || 'home-inquiry' };
  }
  return { contact_name: d.contact_name, company_name: d.company_name, email: d.email, pain_point: d.pain_point, current_tech: d.current_tech || null, source: d.source || formName };
}

/** Record a score as a `lead-scores` submission (the form is declared, hidden, in work/index.html). */
async function saveScore(fields) {
  const res = await fetch(`${SITE_URL}/`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'form-name': 'lead-scores', ...fields }).toString(),
  });
  if (!res.ok) throw new Error(`lead-scores post failed: ${res.status}`);
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
  let payload;
  try { ({ payload } = await req.json()); } catch { return new Response('invalid event', { status: 400 }); }
  const form = payload && payload.form_name;
  if (!LEAD_FORMS.includes(form)) return new Response('not a lead form');

  const lead = leadFrom(form, payload.data || {});
  if (!lead.email) return new Response('no email');

  // Every lead gets a lead-scores row, so a scoring failure shows up next to the lead instead of only in the logs.
  let triage;
  if (!ANTHROPIC_API_KEY) {
    console.error('submission-created: missing ANTHROPIC_API_KEY');
    triage = unscored('ANTHROPIC_API_KEY is not set in Netlify.');
  } else {
    try {
      triage = (await scoreWithClaude(lead)) || { score: 'WARM', reasoning: 'Unable to auto-score', next_step: 'Review manually' };
    } catch (error) {
      console.error('Scoring error:', error);
      triage = unscored(failureReason(error));
    }
  }

  try {
    await saveScore({
      score: triage.score, reasoning: triage.reasoning, next_step: triage.next_step,
      email: lead.email, contact_name: lead.contact_name || '', company_name: lead.company_name || '',
      source: lead.source || '', lead_form: form, lead_id: payload.id || '',
    });
  } catch (error) {
    console.error('Saving score failed:', error);
    return new Response('error', { status: 500 });
  }
  return new Response(triage.score);
};

const unscored = (reason) => ({ score: 'UNSCORED', reasoning: `Scoring failed: ${reason}`, next_step: 'Review manually' });

/** A short, readable reason for the dashboard; the full error stays in the function log. Pure; exported for tests. */
export function failureReason(error) {
  const m = String(error && error.message || error).match(/Anthropic request failed: (\d{3})/);
  if (!m) return 'unexpected error (see the submission-created function log).';
  const status = Number(m[1]);
  if (status === 401 || status === 403) return `the Anthropic API key was rejected (${status}). Replace ANTHROPIC_API_KEY in Netlify and redeploy.`;
  if (status === 429) return 'Anthropic rate limit or credit limit reached (429).';
  if (status >= 500) return `Anthropic was unavailable (${status}).`;
  return `Anthropic returned ${status} (see the submission-created function log).`;
}

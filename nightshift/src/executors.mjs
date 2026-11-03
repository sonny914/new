// Executors carry out approved proposals. They are deterministic: they send exactly the payload the
// founder saw under the checkbox, never a fresh model rewrite of it. What you approve is what ships.
//
//   email  → Resend (RESEND_API_KEY), from the company's configured address
//   post   → a webhook you own (Zapier, Make, Postiz…), or handed to you by hand if none is set
//   spend  → always handed to you; the night shift never moves money
//   site / other → cleared work for the agent next shift (it closes them with close_proposal)
//
// A missing credential marks the proposal "blocked" with the reason; it is retried every shift until
// the credential exists, then sent.

async function sendEmail(p, config, env, fetchImpl) {
  const from = config.actions?.email?.from;
  if (!from) return { status: 'blocked', result: 'actions.email.from is not set in company.json' };
  if (!env.RESEND_API_KEY) return { status: 'blocked', result: 'RESEND_API_KEY is not set' };
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: p.payload.to, subject: p.payload.subject, text: p.payload.body, reply_to: config.actions.email.replyTo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { status: 'failed', result: `Resend ${res.status}: ${String(data.message ?? '').slice(0, 160)}` };
  return { status: 'done', result: `sent (${data.id ?? 'no id'})` };
}

async function sendPost(p, config, env, fetchImpl) {
  const envName = config.actions?.post?.webhookEnv ?? 'NIGHTSHIFT_POST_WEBHOOK';
  const url = env[envName];
  if (!url) return { status: 'ready', result: 'no post webhook set: copy it from the inbox and post it yourself' };
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: p.id, channel: p.payload.channel, text: p.payload.text }),
  });
  if (!res.ok) return { status: 'failed', result: `post webhook answered ${res.status}` };
  return { status: 'done', result: 'handed to the post webhook' };
}

const EXECUTORS = {
  email: sendEmail,
  post: sendPost,
  spend: async () => ({ status: 'ready', result: 'money only moves by your hand' }),
};

/**
 * Run every approved (or previously blocked) executable proposal. Saves after each one through
 * onChange, so a crash halfway never re-sends what already went out.
 */
export async function runApproved(outbox, config, env, { fetchImpl = fetch, now = new Date(), dryRun = false, onChange = async () => {} } = {}) {
  const ran = [];
  const cap = config.actions?.email?.maxPerShift ?? 10;
  let emails = 0;
  for (const p of outbox.proposals) {
    if (!['approved', 'blocked'].includes(p.status)) continue;
    const exec = EXECUTORS[p.kind];
    if (!exec) continue;
    if (p.kind === 'email' && emails >= cap) continue;
    let outcome;
    if (dryRun) outcome = { status: p.kind === 'spend' ? 'ready' : 'done', result: 'dry run: nothing was sent' };
    else {
      try {
        outcome = await exec(p, config, env, fetchImpl);
      } catch (e) {
        outcome = { status: 'failed', result: e.message.slice(0, 200) };
      }
    }
    if (p.kind === 'email' && outcome.status === 'done') emails++;
    Object.assign(p, outcome, { executedAt: now.toISOString() });
    ran.push(p);
    await onChange();
  }
  return ran;
}

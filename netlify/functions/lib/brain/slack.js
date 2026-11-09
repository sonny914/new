// Company Brain: Slack plumbing. Request signing, Web API calls and the message layouts.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Slack's v0 request signature, with a 5 minute replay window. Pure apart from the clock; exported for tests. */
export function verifySlack({ body, timestamp, signature, secret, now = Date.now() }) {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${body}`).digest('hex')}`;
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Constant-time string compare for shared secrets and API keys. */
export function sameSecret(a, b) {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

export function createSlack({ token, fetch: f = fetch }) {
  return async function call(method, payload) {
    if (!token) throw new Error('SLACK_BOT_TOKEN is not set');
    const res = await f(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`slack ${method} failed: ${data.error}`);
    return data;
  };
}

/** Strip the bot mention and Slack's link markup so the question reads as typed. Pure; exported for tests. */
export function cleanText(text = '') {
  return text
    .replace(/<@[A-Z0-9]+>/g, ' ')
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const mrkdwn = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LABEL = { hubspot: 'HubSpot', calls: 'Sales call', docs: 'Doc', analytics: 'Analytics' };

/** An answer in Slack: the answer, its sources, any fix it used, and the Fix it button. Pure; exported for tests. */
export function answerBlocks(r) {
  const src = r.sources.map((s) => {
    const name = `${LABEL[s.source] ?? s.source}: ${mrkdwn(s.title || 'untitled')}`;
    return s.url ? `<${s.url}|${name}>` : name;
  });
  const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: mrkdwn(r.answer) } }];
  const ctx = [];
  if (src.length) ctx.push({ type: 'mrkdwn', text: `*Sources* · ${src.join(' · ')}` });
  else ctx.push({ type: 'mrkdwn', text: '*No source found.* Treat this as unconfirmed.' });
  for (const f of r.fixes) ctx.push({ type: 'mrkdwn', text: `*Fixed once* · ${mrkdwn(f.topic)}` });
  if (r.needs_person) ctx.push({ type: 'mrkdwn', text: '*Needs a person* · this is a decision, not a lookup. Start it with `change:` to hold it for a yes.' });
  blocks.push({ type: 'context', elements: ctx.slice(0, 10) });
  if (r.log_id) {
    blocks.push({ type: 'actions', elements: [
      { type: 'button', action_id: 'brain_fix', text: { type: 'plain_text', text: 'Wrong? Fix it' }, value: String(r.log_id) },
    ] });
  }
  return blocks;
}

/** The modal a person fills in to correct an answer once, for everyone. Pure; exported for tests. */
export function fixModal(logId, question = '') {
  return {
    type: 'modal', callback_id: 'brain_fix_submit', private_metadata: String(logId),
    title: { type: 'plain_text', text: 'Fix once' },
    submit: { type: 'plain_text', text: 'Save for everyone' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Question: ${mrkdwn(question).slice(0, 300) || '(not recorded)'}` }] },
      { type: 'input', block_id: 'topic', label: { type: 'plain_text', text: 'What is this about?' },
        element: { type: 'plain_text_input', action_id: 'v', max_length: 120, placeholder: { type: 'plain_text', text: 'e.g. Annual plan pricing' } } },
      { type: 'input', block_id: 'correction', label: { type: 'plain_text', text: 'The right answer' },
        element: { type: 'plain_text_input', action_id: 'v', multiline: true, max_length: 1500 } },
    ],
  };
}

const RISK = { low: 'Low', medium: 'Medium', high: 'High' };

/** A held change: 3 options, the pick, the risk, and the buttons for a person's yes. Pure; exported for tests. */
export function changeBlocks(c) {
  const opts = c.options.map((o, i) => `${i === c.pick ? '★' : `${i + 1}.`} *${mrkdwn(o.title)}*${i === c.pick ? ' (recommended)' : ''}\n${mrkdwn(o.detail)}`).join('\n\n');
  const head = [
    { type: 'section', text: { type: 'mrkdwn', text: `*1-3-1 · held for a yes*\n${mrkdwn(c.summary)}` } },
    { type: 'section', text: { type: 'mrkdwn', text: opts } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `*Risk:* ${RISK[c.risk] ?? c.risk} · *Why the pick:* ${mrkdwn(c.why)} · asked by <@${c.requested_by}>` }] },
  ];
  if (c.status === 'pending') {
    head.push({ type: 'actions', elements: [
      ...c.options.map((o, i) => ({ type: 'button', action_id: `brain_approve_${i}`, value: `${c.id}:${i}`,
        text: { type: 'plain_text', text: i === c.pick ? `Approve ★ ${i + 1}` : `Approve ${i + 1}` }, ...(i === c.pick ? { style: 'primary' } : {}) })),
      { type: 'button', action_id: 'brain_reject', value: String(c.id), style: 'danger', text: { type: 'plain_text', text: 'Reject' } },
    ] });
  } else {
    const verdict = c.status === 'approved' ? `Approved by <@${c.decided_by}>: *${mrkdwn(c.options[c.pick].title)}*. Every person and AI now gets this answer.` : `Rejected by <@${c.decided_by}>. Nothing changed.`;
    head.push({ type: 'context', elements: [{ type: 'mrkdwn', text: verdict }] });
  }
  return head;
}

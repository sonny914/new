// netlify/functions/brain-slack.js
//
// The Slack app's single endpoint: Events API (mentions, DMs) and Interactivity (Fix it, Approve, Reject, the fix
// modal). Slack wants a reply within 3 seconds and Claude takes longer, so this verifies the request, acknowledges
// it, and hands the work to brain-worker-background. The one thing done here is opening the fix modal, because
// Slack's trigger_id expires in 3 seconds.
// Settings: lib/brain/config.js. Slack app setup: slack/manifest.yml and docs/BRAIN.md.

import { config as loadConfig } from './lib/brain/config.js';
import { verifySlack, createSlack, cleanText, fixModal } from './lib/brain/slack.js';

/** Route one verified Slack request. Returns { status, body, jobs }. Exported for tests; deps are injected. */
export async function route({ rawBody, contentType, slack }) {
  const ok = (body = '', jobs = []) => ({ status: 200, body, jobs });

  if (contentType.includes('application/json')) {
    const msg = JSON.parse(rawBody);
    if (msg.type === 'url_verification') return ok(msg.challenge);
    if (msg.type !== 'event_callback') return ok();
    const e = msg.event ?? {};
    if (e.bot_id || e.subtype) return ok();                       // never answer bots, edits or joins
    const isMention = e.type === 'app_mention';
    const isDM = e.type === 'message' && e.channel_type === 'im';
    if (!isMention && !isDM) return ok();
    const text = cleanText(e.text);
    if (!text) return ok();
    return ok('', [{ type: 'question', text, user: e.user, channel: e.channel, thread_ts: e.thread_ts || e.ts }]);
  }

  const payload = JSON.parse(new URLSearchParams(rawBody).get('payload') || '{}');
  if (payload.type === 'block_actions') {
    const a = payload.actions?.[0] ?? {};
    const where = { channel: payload.channel?.id ?? payload.container?.channel_id, ts: payload.container?.message_ts, thread_ts: payload.message?.thread_ts || payload.message?.ts };
    if (a.action_id === 'brain_fix') {
      const meta = JSON.stringify({ log: a.value, channel: where.channel, thread: where.thread_ts });
      await slack('views.open', { trigger_id: payload.trigger_id, view: { ...fixModal(a.value), private_metadata: meta } });
      return ok();
    }
    const m = /^brain_approve_(\d)$/.exec(a.action_id ?? '');
    if (m || a.action_id === 'brain_reject') {
      const [id, choice] = String(a.value).split(':');
      return ok('', [{ type: 'decide', id: Number(id), approve: Boolean(m), choice: m ? Number(choice) : null, user: payload.user?.id, ...where }]);
    }
    return ok();
  }
  if (payload.type === 'view_submission' && payload.view?.callback_id === 'brain_fix_submit') {
    const v = payload.view.state?.values ?? {};
    const topic = v.topic?.v?.value?.trim() ?? '', correction = v.correction?.v?.value?.trim() ?? '';
    if (!topic || !correction) {
      return { status: 200, body: JSON.stringify({ response_action: 'errors', errors: { ...(topic ? {} : { topic: 'Say what this is about.' }), ...(correction ? {} : { correction: 'Write the right answer.' }) } }), jobs: [], json: true };
    }
    let meta = {};
    try { meta = JSON.parse(payload.view.private_metadata || '{}'); } catch { /* old modal */ }
    return ok('', [{ type: 'fix', log: Number(meta.log) || null, channel: meta.channel, thread_ts: meta.thread, topic, correction, user: payload.user?.id }]);
  }
  return ok();
}

export default async (req) => {
  const cfg = loadConfig();
  const rawBody = await req.text();
  const h = req.headers;
  if (!verifySlack({ body: rawBody, timestamp: h.get('x-slack-request-timestamp'), signature: h.get('x-slack-signature'), secret: cfg.slackSecret })) {
    return new Response('bad signature', { status: 401 });
  }
  if (h.get('x-slack-retry-num')) return new Response('', { status: 200 });   // the first delivery is already being handled
  const out = await route({ rawBody, contentType: h.get('content-type') ?? '', slack: createSlack({ token: cfg.slackToken }) });
  await Promise.all(out.jobs.map((job) => fetch(`${cfg.siteUrl}/.netlify/functions/brain-worker-background`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-brain-secret': cfg.workerSecret }, body: JSON.stringify(job),
  }).catch((err) => console.error('brain: worker dispatch failed', err.message))));
  return new Response(out.body, { status: out.status, headers: { 'Content-Type': out.json ? 'application/json' : 'text/plain' } });
};

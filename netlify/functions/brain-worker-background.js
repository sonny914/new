// netlify/functions/brain-worker-background.js
//
// Background function (the -background suffix gives it up to 15 minutes): does the slow work brain-slack.js
// acknowledged. Answers questions, holds changes for a yes, saves fixes and records decisions, then posts back.
// Only brain-slack.js can call it: every job carries BRAIN_WORKER_SECRET.

import { config as loadConfig } from './lib/brain/config.js';
import { createStore } from './lib/brain/store.js';
import { createClaude } from './lib/brain/claude.js';
import { createSlack, answerBlocks, changeBlocks, sameSecret } from './lib/brain/slack.js';
import { answerQuestion } from './lib/brain/answer.js';
import { changeRequest, holdChange, decideChange, mayApprove } from './lib/brain/changes.js';

/** Run one job. Exported for tests; store, ask and slack are injected. */
export async function runJob(job, { store, ask, slack, approvers = [] }) {
  if (job.type === 'question') {
    const request = changeRequest(job.text);
    if (request) {
      const change = await holdChange({ request, requestedBy: job.user, store, ask });
      const posted = await slack('chat.postMessage', { channel: job.channel, thread_ts: job.thread_ts, text: `Held for a yes: ${change.summary}`, blocks: changeBlocks(change) });
      await store.setChangeMessage(change.id, posted.channel, posted.ts);
      return { kind: 'held', id: change.id };
    }
    const r = await answerQuestion({ question: job.text, actor: job.user, store, ask });
    await slack('chat.postMessage', { channel: job.channel, thread_ts: job.thread_ts, text: r.answer, blocks: answerBlocks(r), unfurl_links: false });
    return { kind: 'answered', log: r.log_id };
  }

  if (job.type === 'fix') {
    const wrong = job.log ? await store.getLog(job.log) : null;
    const fix = await store.addFix({ topic: job.topic, correction: job.correction, question: wrong?.question ?? null, wrong_answer: wrong?.summary ?? null, created_by: job.user, origin: 'fix' });
    await store.log({ kind: 'fix', actor: job.user, question: wrong?.question ?? null, summary: `${job.topic}, saved for all` });
    if (job.channel) await slack('chat.postMessage', { channel: job.channel, thread_ts: job.thread_ts, text: `Fixed once by <@${job.user}>: *${job.topic}*. Every person and AI gets the corrected answer from now on.` });
    return { kind: 'fixed', id: fix?.id };
  }

  if (job.type === 'decide') {
    if (!mayApprove(job.user, approvers)) {
      await slack('chat.postEphemeral', { channel: job.channel, user: job.user, text: 'Only the people set as approvers can decide held changes.' });
      return { kind: 'not-allowed' };
    }
    const out = await decideChange({ id: job.id, approve: job.approve, choice: job.choice, decidedBy: job.user, store });
    if (!out) {
      await slack('chat.postEphemeral', { channel: job.channel, user: job.user, text: 'Someone already decided this change.' });
      return { kind: 'already-decided' };
    }
    const c = out.change;
    if (c.slack_channel && c.slack_ts) await slack('chat.update', { channel: c.slack_channel, ts: c.slack_ts, text: `${c.status}: ${c.summary}`, blocks: changeBlocks(c) });
    return { kind: c.status, id: c.id };
  }
  throw new Error(`unknown job type: ${job.type}`);
}

export default async (req) => {
  const cfg = loadConfig();
  if (!sameSecret(req.headers.get('x-brain-secret'), cfg.workerSecret)) return new Response('forbidden', { status: 403 });
  const job = await req.json();
  const slack = createSlack({ token: cfg.slackToken });
  try {
    const out = await runJob(job, { store: createStore({ url: cfg.supabaseUrl, key: cfg.supabaseKey }), ask: createClaude({ model: cfg.model, effort: cfg.effort }), slack, approvers: cfg.approvers });
    console.log('brain:', job.type, JSON.stringify(out));
  } catch (err) {
    console.error('brain: job failed', job.type, err.message);
    if (job.channel) {
      const text = err.code === 'refusal' ? "I can't answer that one. Ask a person in the channel." : "Something went wrong answering that. It's logged; try again in a minute.";
      await slack(job.user && job.type !== 'question' ? 'chat.postEphemeral' : 'chat.postMessage', { channel: job.channel, user: job.user, thread_ts: job.thread_ts, text }).catch(() => {});
    }
  }
  return new Response('', { status: 202 });
};

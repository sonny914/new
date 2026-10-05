// netlify/functions/operator-interpret.js
//
// The one model boundary for the Operator lab (/lab/operator/). Two actions:
//   interpret  one LinkedIn artifact (text and/or a screenshot) plus the context pack
//              the browser assembled -> author guess, observations, problem evidence,
//              verdict and reasons. Never a rung, never a score.
//   draft      one comment in Jay's voice, from the artifact, the observations and up
//              to three of Jay's real recent comments as anchors.
//
// Zero npm dependencies on purpose, same as score-lead.js: the Anthropic Messages API
// over the fetch() built into Node 18+, so the function runs from a plain deploy.
//
// Env (Netlify -> Site configuration -> Environment variables):
//   ANTHROPIC_API_KEY     required
//   ANTHROPIC_MODEL       optional, default claude-opus-5-5
//   ANTHROPIC_BASE_URL    optional, default https://api.anthropic.com
//   OPERATOR_KEY          required: shared secret the browser sends as x-operator-key.
//                         Unset means the function answers 503 "not configured" and the
//                         page says so. It never pretends.
//
// Prompts live beside this file as markdown so Jay can edit the voice without touching
// code. netlify.toml lists them as included_files so the bundle carries them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const ANTHROPIC_BASE_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
const OPERATOR_KEY = process.env.OPERATOR_KEY || '';

export const PROMPT_VERSION = 'operator-v0.1';
export const VERDICTS = ['COMMENT', 'SAVE', 'SCROLL'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const here = path.dirname(fileURLToPath(import.meta.url));
export function readPrompt(name) {
  return fs.readFileSync(path.join(here, 'operator-prompts', name), 'utf8');
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/* ---------- prompt assembly (pure, tested) ---------- */

export function buildInterpretMessages({ text, image, context }, rules) {
  const ctx = context && context.status === 'ok' && context.markdown
    ? `## Prior context (what the system carries about the likely author)\n${context.markdown}`
    : `## Prior context\nNone. Treat this as a first encounter and say nothing about history.`;
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({ type: 'text', text: `## The artifact\n${text ? text : '(screenshot only; read the image)'}\n\n${ctx}\n\nReply with the JSON object described in your instructions.` });
  return { system: rules, messages: [{ role: 'user', content }] };
}

export function buildDraftMessages({ text, observations = [], reasons = [], context, anchors = [] }, voice) {
  const anchorBlock = anchors.length
    ? `## Three comments Jay actually posted recently (match this register, not these words)\n${anchors.map((a) => `- ${a}`).join('\n')}`
    : `## Anchors\nNone yet. Follow the voice rules.`;
  const ctx = context && context.status === 'ok' && context.markdown ? `## Prior context\n${context.markdown}` : `## Prior context\nFirst encounter.`;
  const body = `## Their post\n${text}\n\n## What the reading noticed\n${observations.map((o) => `- ${o}`).join('\n') || '- (none)'}\n\n## Why a comment\n${reasons.map((r) => `- ${r}`).join('\n') || '- (none)'}\n\n${ctx}\n\n${anchorBlock}\n\nReply with the JSON object described in your instructions.`;
  return { system: voice, messages: [{ role: 'user', content: body }] };
}

/* ---------- response parsing (pure, tested) ---------- */

function firstJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : null);
const strList = (v, max, each) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, max).map((x) => x.trim().slice(0, each)) : []);

export function parseInterpretation(text) {
  const o = firstJson(text);
  if (!o || typeof o !== 'object') return null;
  const verdict = String(o.verdict || '').toUpperCase();
  if (!VERDICTS.includes(verdict)) return null;
  const a = o.author && typeof o.author === 'object' ? o.author : {};
  const conf = Number(a.confidence);
  const author = {
    name: str(a.name, 120), linkedinUrl: str(a.linkedinUrl, 300), company: str(a.company, 120), title: str(a.title, 120),
    confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0,
  };
  const problemEvidence = Array.isArray(o.problemEvidence)
    ? o.problemEvidence.filter((p) => p && typeof p.label === 'string' && typeof p.quote === 'string' && p.quote.trim()).slice(0, 4)
      .map((p) => ({ label: p.label.trim().slice(0, 140), quote: p.quote.trim().slice(0, 400) }))
    : [];
  return {
    author, isQuestion: Boolean(o.isQuestion), inLane: Boolean(o.inLane),
    observations: strList(o.observations, 6, 240), problemEvidence, verdict, reasons: strList(o.reasons, 4, 160),
  };
}

export function parseDraft(text) {
  const o = firstJson(text);
  const c = o && typeof o.comment === 'string' ? o.comment.trim() : null;
  if (!c) return null;
  return { comment: c.replace(/#\w+/g, '').replace(/\s+$/, '').slice(0, 600) };
}

/**
 * Deterministic verdict rules, applied after the model. The model proposes; these decide
 * the cases where Jay has already said what should happen.
 *   - First encounter (no prior context) and not a direct question inside QB's lane:
 *     COMMENT becomes SAVE. We do not open with a comment on a stranger's broadcast.
 */
export function applyVerdictRules(result, context) {
  const firstEncounter = !(context && context.status === 'ok');
  const out = { ...result, reasons: [...result.reasons], rulesApplied: [] };
  if (firstEncounter && out.verdict === 'COMMENT' && !(out.isQuestion && out.inLane)) {
    out.verdict = 'SAVE';
    out.reasons.push('First encounter and not a direct question in QB\'s lane: save it, do not open with a comment.');
    out.rulesApplied.push('first-encounter-save');
  }
  return out;
}

/* ---------- the model call ---------- */

async function callClaude({ system, messages, maxTokens, effort }) {
  const res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      // Server-side fallback: if the safety classifiers decline, the request re-runs on
      // Anthropic's recommended fallback model instead of returning a refusal.
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      fallbacks: 'default',
      system,
      messages,
      // Thinking is adaptive and always on for this model family; effort is the depth control.
      output_config: { effort },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    const err = new Error(`anthropic ${res.status}`);
    err.status = res.status; err.detail = detail.slice(0, 600);
    throw err;
  }
  const message = await res.json();
  if (message.stop_reason === 'refusal') {
    return { refused: true, category: message.stop_details ? message.stop_details.category : null, model: message.model };
  }
  const text = (message.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return { refused: false, text, model: message.model, usage: message.usage || null, stopReason: message.stop_reason };
}

function validImage(image) {
  if (!image) return null;
  if (!IMAGE_TYPES.includes(image.mediaType) || typeof image.data !== 'string') return 'unsupported image type';
  if (Buffer.byteLength(image.data, 'base64') > MAX_IMAGE_BYTES) return 'image over 5 MB';
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!OPERATOR_KEY || !ANTHROPIC_API_KEY) {
    return json({ ok: false, reason: 'config', detail: !OPERATOR_KEY ? 'OPERATOR_KEY is not set on the site' : 'ANTHROPIC_API_KEY is not set on the site' }, 503);
  }
  if ((req.headers.get('x-operator-key') || '') !== OPERATOR_KEY) return json({ ok: false, reason: 'unauthorised' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, reason: 'invalid json' }, 400); }
  const action = body && body.action;

  try {
    if (action === 'interpret') {
      const text = str(body.text, 20000) || '';
      const imgErr = validImage(body.image);
      if (imgErr) return json({ ok: false, reason: imgErr }, 400);
      if (!text && !body.image) return json({ ok: false, reason: 'nothing to read' }, 400);
      const { system, messages } = buildInterpretMessages({ text, image: body.image || null, context: body.context }, readPrompt('interpreter-rules.md'));
      const r = await callClaude({ system, messages, maxTokens: 4000, effort: 'medium' });
      if (r.refused) return json({ ok: false, reason: 'refused', category: r.category, model: r.model }, 200);
      const parsed = parseInterpretation(r.text);
      if (!parsed) return json({ ok: false, reason: 'unparseable', model: r.model, raw: r.text.slice(0, 800) }, 502);
      return json({ ok: true, result: applyVerdictRules(parsed, body.context), model: r.model, usage: r.usage, promptVersion: PROMPT_VERSION });
    }
    if (action === 'draft') {
      const text = str(body.text, 20000);
      if (!text) return json({ ok: false, reason: 'text required' }, 400);
      const { system, messages } = buildDraftMessages({
        text, observations: strList(body.observations, 6, 240), reasons: strList(body.reasons, 5, 160),
        context: body.context, anchors: strList(body.anchors, 3, 600),
      }, readPrompt('jay-voice.md'));
      const r = await callClaude({ system, messages, maxTokens: 1500, effort: 'low' });
      if (r.refused) return json({ ok: false, reason: 'refused', category: r.category, model: r.model }, 200);
      const parsed = parseDraft(r.text);
      if (!parsed) return json({ ok: false, reason: 'unparseable', model: r.model, raw: r.text.slice(0, 800) }, 502);
      return json({ ok: true, result: parsed, model: r.model, usage: r.usage, promptVersion: PROMPT_VERSION });
    }
    return json({ ok: false, reason: 'unknown action' }, 400);
  } catch (error) {
    console.error('operator-interpret:', error);
    return json({ ok: false, reason: 'upstream', status: error.status || null, detail: error.detail || error.message }, 502);
  }
};

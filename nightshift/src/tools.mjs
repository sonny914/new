// The night shift's own tools. Plain async functions that return MCP CallToolResult objects, so the
// real run wraps them in an in-process MCP server (agent.mjs) and the dry run calls them directly.
//
// Nothing here sends, posts or spends. propose_action is the only way out of the building.

import { addProposal, validateProposal, clearedWork, clean, cleanBlock } from './outbox.mjs';
import { metricsTable } from './metrics.mjs';
import { MEMORY_CAP } from './state.mjs';

export const AREAS = ['product', 'growth', 'ops', 'research', 'finance'];

const reply = (text, isError = false) => ({ content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) });

/** The record of one shift, filled in as the agent works. */
export function newShift() {
  return { workLog: [], memoryNotes: [], memoryRewrite: null, created: [], closed: [], report: null };
}

export function createShiftTools({ outbox, shift, metrics, config, save, now = () => new Date() }) {
  const maxProposals = config.budget?.maxProposalsPerShift ?? 10;

  return {
    async log_work({ area, summary }) {
      if (!AREAS.includes(area)) return reply(`area must be one of ${AREAS.join(', ')}`, true);
      const text = clean(summary, 600);
      if (!text) return reply('summary is required', true);
      shift.workLog.push({ at: now().toISOString(), area, summary: text });
      return reply('Logged.');
    },

    async remember({ note }) {
      const text = clean(note, 500);
      if (!text) return reply('note is required', true);
      shift.memoryNotes.push(text);
      return reply('Saved to memory for the next shift.');
    },

    async rewrite_memory({ content }) {
      const text = cleanBlock(content, MEMORY_CAP + 1);
      if (!text) return reply('content is required', true);
      if (text.length > MEMORY_CAP) return reply(`Memory must stay under ${MEMORY_CAP} characters; cut it down.`, true);
      shift.memoryRewrite = text;
      shift.memoryNotes = [];
      return reply('Memory replaced. Notes you add with remember after this are appended to the new version.');
    },

    async propose_action(input) {
      if (shift.created.length >= maxProposals) return reply(`You have filed ${maxProposals} proposals this shift, the limit. Pick your best ones next shift.`, true);
      const error = validateProposal(input);
      if (error) return reply(`Not queued: ${error}`, true);
      const p = addProposal(outbox, input, now());
      shift.created.push(p.id);
      await save();
      return reply(`Queued ${p.id}. The founder approves or lets it expire; nothing happens until they tick it. Don't wait for it this shift.`);
    },

    async close_proposal({ id, outcome, note }) {
      const p = clearedWork(outbox).find((x) => x.id === id);
      if (!p) return reply(`${id} is not approved cleared work. Only approved site/other proposals can be closed.`, true);
      if (!['done', 'failed'].includes(outcome)) return reply('outcome must be done or failed', true);
      p.status = outcome;
      p.result = clean(note, 300) || outcome;
      p.executedAt = now().toISOString();
      shift.closed.push(p.id);
      await save();
      return reply(`${id} closed as ${outcome}.`);
    },

    async read_metrics() {
      return reply(metricsTable(metrics));
    },

    async end_shift({ headline, summary, needs_from_founder = [], tomorrow, pr_title, pr_body }) {
      const h = clean(headline, 120);
      if (!h) return reply('headline is required: one line the founder reads on a phone', true);
      shift.report = {
        headline: h,
        summary: cleanBlock(summary, 3000),
        needs: (Array.isArray(needs_from_founder) ? needs_from_founder : [needs_from_founder]).map((n) => clean(n, 300)).filter(Boolean).slice(0, 5),
        tomorrow: clean(tomorrow, 400),
        pr: pr_title ? { title: clean(pr_title, 100), body: cleanBlock(pr_body, 4000) } : null,
      };
      return reply('Shift closed. Stop now; anything after this is not recorded.');
    },
  };
}

/** Tool descriptions, shared by the MCP server and the docs. Kept here so the contract lives in one file. */
export const TOOL_DOCS = {
  log_work: 'Record a piece of work you finished or a decision you made this shift, in one or two sentences. The founder reads these in the morning brief.',
  remember: 'Save one fact, lesson or open thread for future shifts. You start every shift with no memory except these notes, the journal and the outbox.',
  rewrite_memory: 'Replace the whole memory file with a consolidated version when it gets long or stale. Use sparingly.',
  propose_action:
    'Queue an action that leaves the building (email, post, spend, a bigger site change, anything else outward) for the founder to approve. Write the exact final content: what is approved is exactly what ships. Payload by kind: email {to, subject, body}; post {channel, text}; spend {amount_usd, vendor, details}; site/other {details}.',
  close_proposal: 'Close an approved site/other proposal (cleared work) once you have done it or found you cannot.',
  read_metrics: 'Read the company metrics again. Values marked — could not be read; never estimate them.',
  end_shift:
    'Finish the shift with the report the founder reads first. Give pr_title and pr_body only if product files changed; they become a public pull request, so no internal strategy or customer data.',
};

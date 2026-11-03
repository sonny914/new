// The founder's inbox: one document per company that shows what the night shift wants to do, with a
// checkbox per proposal. Ticking a box is the approval. The same markdown works as a GitHub issue body
// (tick from the GitHub phone app) or as a local INBOX.md file.
//
// Approval lines are recognised only at column 0 and only with the runner's marker, and every piece of
// agent-written text is indented and stripped of comment markers. So nothing the agent (or a web page it
// read) writes into a proposal can forge a ticked box.

import { readFile, writeFile } from 'node:fs/promises';
import { byStatus } from './outbox.mjs';

const MARK = (id) => `<!-- ns:${id} -->`;
const APPROVAL_LINE = /^- \[([ xX])\] .*<!-- ns:(P-\d{4,}) -->\s*$/;
const BODY_LIMIT = 60_000; // GitHub caps issue bodies at 65,536 characters

/** Ids of proposals whose box is ticked. */
export function parseApprovals(body) {
  const ids = new Set();
  for (const line of String(body ?? '').split('\n')) {
    const m = APPROVAL_LINE.exec(line);
    if (m && m[1].toLowerCase() === 'x') ids.add(m[2]);
  }
  return ids;
}

function indent(text, pad = '    ') {
  return String(text)
    .split('\n')
    .map((l) => pad + l)
    .join('\n');
}

/** Exactly what ships if the box is ticked, as an indented fenced block under the checkbox. */
export function previewPayload(p) {
  const x = p.payload ?? {};
  let shown;
  switch (p.kind) {
    case 'email':
      shown = `To: ${x.to.join(', ')}\nSubject: ${x.subject}\n\n${x.body}`;
      break;
    case 'post':
      shown = `Channel: ${x.channel}\n\n${x.text}`;
      break;
    case 'spend':
      shown = `$${x.amount_usd} → ${x.vendor}${x.details ? `\n\n${x.details}` : ''}`;
      break;
    default:
      shown = x.details ?? '';
  }
  const safe = shown.replace(/<!--|-->/g, '').replace(/`{3,}/g, "'''");
  return indent(['<details><summary>Exactly what ships</summary>', '', '```text', safe, '```', '</details>'].join('\n'), '  ');
}

const WHAT_HAPPENS = {
  email: 'sent from the company address',
  post: 'posted through the post webhook, or handed to you if none is set',
  spend: 'handed to you; the night shift never moves money',
  site: 'the builder does it next shift and opens a pull request',
  other: 'the night shift does it next shift',
};

function proposalLine(p) {
  return `- [ ] **${p.id}** · ${p.kind} — ${p.title} ${MARK(p.id)}\n  ${p.why}\n  _If approved: ${WHAT_HAPPENS[p.kind]}._\n${previewPayload(p)}`;
}

/** The inbox document: decisions first, then what is waiting on the founder, then the latest brief. */
export function renderInbox({ companyName, date, brief, outbox }) {
  const pending = byStatus(outbox, 'pending');
  const ready = byStatus(outbox, 'ready');
  const blocked = byStatus(outbox, 'blocked');
  const parts = [
    `# Night Shift · ${companyName}`,
    `_Updated after the ${date} shift. Tick a box to approve it; the next shift carries it out exactly as written. Leave it unticked and it expires. Comment on this issue to give the night shift notes; it reads them at the start of the next shift._`,
    '',
    `## Waiting on your approval (${pending.length})`,
    pending.length ? pending.map(proposalLine).join('\n\n') : '_Nothing waiting._',
  ];
  if (ready.length) {
    parts.push('', `## Approved, yours to do by hand (${ready.length})`);
    parts.push(ready.map((p) => `- **${p.id}** · ${p.kind} — ${p.title}${p.result ? ` (${p.result})` : ''}\n${previewPayload(p)}`).join('\n\n'));
  }
  if (blocked.length) {
    parts.push('', `## Approved but blocked (${blocked.length})`);
    parts.push(blocked.map((p) => `- **${p.id}** · ${p.kind} — ${p.title}: ${p.result ?? 'blocked'}`).join('\n'));
  }
  parts.push('', '---', '', brief);
  let body = parts.join('\n');
  if (body.length > BODY_LIMIT) body = body.slice(0, BODY_LIMIT) + '\n\n_…cut to fit; the full brief is in the journal._';
  return body;
}

/**
 * Inbox kept in files beside the state: INBOX.md (tick boxes in any editor) and NOTES.md (write notes;
 * they are read once and archived into the journal). For running the night shift on your own machine.
 */
export function localInbox(statePaths) {
  return {
    kind: 'local',
    async load() {
      try {
        return { body: await readFile(statePaths.inbox, 'utf8'), number: null };
      } catch {
        return null;
      }
    },
    async founderNotes() {
      let text = '';
      try {
        text = (await readFile(statePaths.notes, 'utf8')).trim();
      } catch {
        return [];
      }
      if (!text) return [];
      await writeFile(statePaths.notes, '');
      return [{ author: 'founder', at: new Date().toISOString(), body: text }];
    },
    async publish({ body }) {
      await writeFile(statePaths.inbox, body);
      return null;
    },
  };
}

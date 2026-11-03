// The outbox: everything the night shift wants to do that leaves the building.
//
// The agent never sends, posts or spends. It files a proposal with the exact content; the founder
// approves it by ticking a box; the shift runner then executes exactly what was approved. These
// functions are pure (they mutate the outbox object they are given and return what changed) so the
// approval rules can be tested without a model, a network or a clock.

export const KINDS = ['email', 'post', 'site', 'spend', 'other'];

/** Kinds the runner can execute itself once approved. The rest are cleared work for the agent or the founder. */
export const EXECUTABLE = new Set(['email', 'post', 'spend']);

const MAX = { title: 140, why: 600, subject: 200, body: 5000, text: 3000, details: 3000, recipients: 5 };
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

export function emptyOutbox() {
  return { nextId: 1, proposals: [] };
}

/** One line, no HTML comments, capped. Agent-written text ends up in an issue body the runner parses. */
export function clean(text, max) {
  return String(text ?? '')
    .replace(/<!--|-->/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Multi-line text, no HTML comments, capped. */
export function cleanBlock(text, max) {
  return String(text ?? '')
    .replace(/<!--|-->/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, max);
}

/**
 * Check a proposal before it is queued. Returns an error message for the agent, or null.
 * The message is written for the model: it says what to fix.
 */
export function validateProposal(input) {
  const { kind, title, why, payload } = input ?? {};
  if (!KINDS.includes(kind)) return `kind must be one of ${KINDS.join(', ')}`;
  if (!clean(title, MAX.title)) return 'title is required: one line the founder can scan on a phone';
  if (!clean(why, MAX.why)) return 'why is required: the reason this moves the charter goal';
  const p = payload ?? {};
  switch (kind) {
    case 'email': {
      const to = Array.isArray(p.to) ? p.to : [p.to];
      if (!to.length || to.some((a) => !EMAIL.test(String(a ?? '').trim()))) return 'payload.to must be one or more real email addresses';
      if (to.length > MAX.recipients) return `payload.to takes at most ${MAX.recipients} addresses; split the batch`;
      if (!clean(p.subject, MAX.subject)) return 'payload.subject is required';
      if (!cleanBlock(p.body, MAX.body)) return 'payload.body is required: the exact text that will be sent';
      return null;
    }
    case 'post':
      if (!clean(p.channel, 40)) return 'payload.channel is required (for example x, instagram, linkedin)';
      if (!cleanBlock(p.text, MAX.text)) return 'payload.text is required: the exact post';
      return null;
    case 'spend':
      if (!(Number(p.amount_usd) > 0)) return 'payload.amount_usd must be a positive number';
      if (!clean(p.vendor, 80)) return 'payload.vendor is required';
      return null;
    default:
      if (!cleanBlock(p.details, MAX.details)) return 'payload.details is required: what exactly you will do once approved';
      return null;
  }
}

function normalisePayload(kind, p = {}) {
  switch (kind) {
    case 'email': {
      const to = (Array.isArray(p.to) ? p.to : [p.to]).map((a) => String(a).trim());
      return { to, subject: clean(p.subject, MAX.subject), body: cleanBlock(p.body, MAX.body) };
    }
    case 'post':
      return { channel: clean(p.channel, 40), text: cleanBlock(p.text, MAX.text) };
    case 'spend':
      return { amount_usd: Number(p.amount_usd), vendor: clean(p.vendor, 80), details: cleanBlock(p.details, MAX.details) };
    default:
      return { details: cleanBlock(p.details, MAX.details) };
  }
}

export function proposalId(n) {
  return `P-${String(n).padStart(4, '0')}`;
}

/** Queue a validated proposal. Throws if invalid so a caller cannot skip validation. */
export function addProposal(outbox, input, now = new Date()) {
  const error = validateProposal(input);
  if (error) throw new Error(error);
  const proposal = {
    id: proposalId(outbox.nextId++),
    kind: input.kind,
    title: clean(input.title, MAX.title),
    why: clean(input.why, MAX.why),
    payload: normalisePayload(input.kind, input.payload),
    status: 'pending',
    createdAt: now.toISOString(),
  };
  outbox.proposals.push(proposal);
  return proposal;
}

/** Mark pending proposals the founder ticked as approved. Returns the proposals that changed. */
export function applyApprovals(outbox, approvedIds, now = new Date()) {
  const changed = [];
  for (const p of outbox.proposals) {
    if (p.status === 'pending' && approvedIds.has(p.id)) {
      p.status = 'approved';
      p.decidedAt = now.toISOString();
      changed.push(p);
    }
  }
  return changed;
}

/** Pending proposals nobody approved within ttlDays expire, so the inbox never becomes a backlog. */
export function expireStale(outbox, now = new Date(), ttlDays = 7) {
  const cutoff = now.getTime() - ttlDays * 86_400_000;
  const expired = [];
  for (const p of outbox.proposals) {
    if (p.status === 'pending' && Date.parse(p.createdAt) < cutoff) {
      p.status = 'expired';
      p.decidedAt = now.toISOString();
      expired.push(p);
    }
  }
  return expired;
}

export function byStatus(outbox, ...statuses) {
  return outbox.proposals.filter((p) => statuses.includes(p.status));
}

/** Approved site/other work the agent is cleared to do this shift. */
export function clearedWork(outbox) {
  return outbox.proposals.filter((p) => p.status === 'approved' && !EXECUTABLE.has(p.kind));
}

/** Keep the file small: drop finished proposals older than keepDays. */
export function prune(outbox, now = new Date(), keepDays = 30) {
  const cutoff = now.getTime() - keepDays * 86_400_000;
  const open = new Set(['pending', 'approved', 'blocked', 'ready']);
  outbox.proposals = outbox.proposals.filter((p) => open.has(p.status) || Date.parse(p.decidedAt ?? p.createdAt) >= cutoff);
  return outbox;
}

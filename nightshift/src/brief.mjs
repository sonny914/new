// What the founder reads. The journal entry is the full private record of a shift; the brief is the
// short version posted as a comment (the phone notification); both are markdown.

import { metricsTable } from './metrics.mjs';
import { byStatus } from './outbox.mjs';

const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;

/** Honest cost line: the SDK reports no cost when a run ends by hitting a cap. */
function cost(run, config) {
  if (run.cost != null) return usd(run.cost);
  if (run.subtype === 'error_max_budget_usd') return `hit the ${usd(config.budget?.maxUsdPerShift ?? 3)} cap`;
  return 'cost not reported';
}

export function renderBrief({ config, date, shift, run, outbox, metrics }) {
  const r = shift.report;
  const pending = byStatus(outbox, 'pending').length;
  const lines = [
    `### ${date} · ${r?.headline ?? 'Shift ended without a report'}`,
    '',
    r?.summary || (run.error ? `The shift stopped early: ${run.error}` : 'No summary was filed.'),
  ];
  if (r?.needs?.length) lines.push('', '**Needs you**', ...r.needs.map((n) => `- ${n}`));
  if (shift.created.length) lines.push('', `**New proposals:** ${shift.created.join(', ')} (${pending} waiting in total; tick them in the issue body)`);
  if (r?.tomorrow) lines.push('', `**Tomorrow:** ${r.tomorrow}`);
  lines.push('', metricsTable(metrics), '', `_${config.name} night shift · ${run.turns ?? '?'} turns · ${cost(run, config)}_`);
  return lines.join('\n');
}

export function renderJournal({ config, date, shift, run, executed, expired, notes, metrics }) {
  const r = shift.report;
  const out = [`# ${config.name} · night shift · ${date}`, '', `**${r?.headline ?? 'No report filed'}**`, ''];
  if (r?.summary) out.push(r.summary, '');
  if (run.error) out.push(`> Stopped early: ${run.error}`, '');
  out.push('## Work log', shift.workLog.length ? shift.workLog.map((w) => `- [${w.area}] ${w.summary}`).join('\n') : '_Nothing logged._', '');
  if (shift.created.length) out.push('## Proposed', shift.created.map((id) => `- ${id}`).join('\n'), '');
  if (executed.length || shift.closed.length || expired.length) {
    out.push('## Carried out');
    for (const p of executed) out.push(`- ${p.id} ${p.kind} "${p.title}": ${p.status}${p.result ? `, ${p.result}` : ''}`);
    for (const id of shift.closed) out.push(`- ${id} closed by the agent`);
    for (const p of expired) out.push(`- ${p.id} expired unapproved`);
    out.push('');
  }
  if (notes.length) out.push('## Founder notes read', ...notes.map((n) => `> ${n.body.replace(/\n/g, '\n> ')}`), '');
  if (r?.needs?.length) out.push('## Needs from the founder', ...r.needs.map((n) => `- ${n}`), '');
  if (r?.tomorrow) out.push('## Tomorrow', r.tomorrow, '');
  out.push('## Metrics', metricsTable(metrics), '');
  out.push(`_${run.turns ?? '?'} turns · ${cost(run, config)} · ${run.subtype ?? (run.error ? 'error' : 'ok')}_`, '');
  return out.join('\n');
}

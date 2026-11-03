// One shift, start to finish:
//   1. read the founder's decisions and notes from the inbox
//   2. carry out what they approved, exactly as approved
//   3. read the instruments
//   4. let the agent work (tools, subagents, guard, budget caps)
//   5. write the journal, memory and outbox
//   6. post the brief and the updated approval board

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyApprovals, expireStale, prune } from './outbox.mjs';
import { parseApprovals, renderInbox } from './inbox.mjs';
import { runApproved } from './executors.mjs';
import { readMetrics } from './metrics.mjs';
import { openState } from './state.mjs';
import { createShiftTools, newShift } from './tools.mjs';
import { buildSystemPrompt, buildShiftPrompt } from './prompt.mjs';
import { renderBrief, renderJournal } from './brief.mjs';

export async function loadCompany(companiesDir, slug) {
  const dir = join(companiesDir, slug);
  const config = JSON.parse(await readFile(join(dir, 'company.json'), 'utf8'));
  const charter = await readFile(join(dir, 'charter.md'), 'utf8');
  return { slug, dir, config, charter };
}

export const isoDate = (d) => d.toISOString().slice(0, 10);

export async function runShift({ slug, companiesDir, stateRoot, workspaceDir, env = process.env, now = new Date(), dryRun = false, makeInbox, agent, fetchImpl = fetch, log = console.log }) {
  const company = await loadCompany(companiesDir, slug);
  const { config } = company;
  const state = await openState(stateRoot, slug);
  const date = isoDate(now);
  const meta = await state.meta();
  const outbox = await state.outbox();
  const save = () => state.saveOutbox(outbox);
  const inbox = await makeInbox({ company, state });

  // 1. The founder's decisions and notes.
  const doc = await inbox.load(meta);
  const approved = applyApprovals(outbox, parseApprovals(doc?.body), now);
  const notes = await inbox.founderNotes(doc, meta.lastShiftAt);
  const expired = expireStale(outbox, now, config.proposalTtlDays ?? 7);
  log(`${config.name}: ${approved.length} newly approved, ${notes.length} founder note(s), ${expired.length} expired`);

  // 2. Carry out what was approved.
  const executed = await runApproved(outbox, config, env, { fetchImpl, now, dryRun, onChange: save });
  await save();
  if (executed.length) log(`  executed ${executed.length}: ${executed.map((p) => `${p.id}=${p.status}`).join(', ')}`);

  // 3. The instruments.
  const metrics = dryRun ? (config.metrics ?? []).map((m) => ({ name: m.name, label: m.label ?? m.name, value: null, note: 'dry run' })) : await readMetrics(config.metrics, env, fetchImpl, now);

  // 4. The shift.
  const shift = newShift();
  const tools = createShiftTools({ outbox, shift, metrics, config, save });
  const memory = await state.memory();
  const journal = await state.recentJournal(3);
  const system = buildSystemPrompt(company);
  const prompt = buildShiftPrompt({ config, date, metrics, notes, outbox, executed, expired, memory, journal });
  let run;
  try {
    run = await agent({ config, system, prompt, tools, workspaceDir, env, log });
  } catch (e) {
    run = { cost: 0, turns: 0, subtype: 'crashed', error: e.message.slice(0, 300) };
  }
  log(`  shift ${run.error ? `stopped: ${run.subtype}` : 'finished'} · ${run.turns ?? '?'} turns · ${run.cost == null ? 'cost not reported' : `$${run.cost.toFixed(2)}`}`);

  // 5. Write it down.
  if (shift.memoryRewrite != null || shift.memoryNotes.length) {
    const base = shift.memoryRewrite ?? memory;
    const added = shift.memoryNotes.map((n) => `- (${date}) ${n}`).join('\n');
    await state.saveMemory([base.trimEnd(), added].filter(Boolean).join('\n'));
  }
  await state.writeJournal(date, renderJournal({ config, date, shift, run, executed, expired, notes, metrics }));
  prune(outbox, now);
  await save();

  // 6. Tell the founder. Re-read the inbox first so boxes ticked during the shift aren't overwritten.
  const latest = await inbox.load(meta);
  applyApprovals(outbox, parseApprovals(latest?.body), now);
  await save();
  const brief = renderBrief({ config, date, shift, run, outbox, metrics });
  const number = await inbox.publish({ doc: latest, body: renderInbox({ companyName: config.name, date, brief, outbox }), comment: brief });
  await state.saveMeta({ ...meta, issueNumber: number ?? meta.issueNumber ?? null, lastShiftAt: now.toISOString(), shifts: (meta.shifts ?? 0) + 1, lastCostUsd: run.cost ?? null });

  return {
    company: slug,
    date,
    headline: shift.report?.headline ?? null,
    error: run.error ?? null,
    cost: run.cost ?? null,
    pr: shift.report?.pr ?? null,
    proposals: shift.created,
  };
}

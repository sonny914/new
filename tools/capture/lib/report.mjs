// Written outputs: session-report.md (the evidence-backed narrative) and production-log.md (how the recap was made).
import { existsSync, readFileSync } from 'node:fs';
import { fmtStamp, fmtZone, fmtDate } from './util.mjs';
import { isWork } from './events.mjs';

const cite = (refs) => refs.map((r) => `[${r}]`).join('');
const one = (s) => String(s).replace(/\s+/g, ' ').trim();

export function sessionReport({ session, key, events, metrics, story, sb, assets, validation }) {
  const work = events.filter((e) => isWork(e) && e.kind !== 'session');
  const first = work[0], last = work[work.length - 1];
  const stage = (s) => story.stages.find((x) => x.stage === s);
  const L = [];
  L.push(`# ${sb.title}`, '');
  L.push(`**Session** \`${session.id}\` · **Recap key** \`${key}\`  `);
  L.push(`**When** ${fmtStamp(first.t)} ${fmtZone(first.t)} → ${fmtStamp(last.t)} ${fmtZone(last.t)}, ${fmtDate(last.t)}  `);
  L.push(`**Repo** ${events[0].data.repo ?? 'n/a'} · **Source** ${session.source}${session.url ? ` · ${session.url}` : ''}  `);
  L.push(`**Evidence** ${events.length} events, ${metrics.length} metrics, ${assets.assets.length} assets · **Story level** ${story.level} · **Validation** ${validation.ok ? 'passed' : `FAILED (${validation.errors.length})`}`, '');
  L.push('Every statement below cites the events it rests on, as `[E07]`. The events, with links to their sources, are listed at the end and in `session-events.json`.', '');
  L.push('## The recap', '');
  for (const fmt of Object.keys(sb.formats)) L.push(`- \`session-recap-${fmt}.mp4\`: ${sb.formats[fmt].scenes.length} scenes, ${sb.formats[fmt].duration.toFixed(1)} s`);
  if (!sb.formats['9x16']) L.push(`- Vertical cut ${sb.vertical}`);
  L.push('');
  const sec = (title, s, fn) => { if (!s) return; L.push(`## ${title}`, ''); fn(s); L.push(''); };
  sec('Goal', stage('goal'), (s) => L.push(`> ${one(s.claims[0].text)} ${cite(s.claims[0].refs)}`));
  sec('Process', stage('process'), (s) => {
    for (const m of (s.metrics ?? []).map((k) => metrics.find((x) => x.key === k)).filter(Boolean)) L.push(`- ${m.how}: **${m.display} ${m.unit}** ${cite(m.refs)}`);
    for (const c of s.claims) L.push(`- ${one(c.text)} ${cite(c.refs)}`);
  });
  sec('Obstacle', stage('obstacle'), (s) => { for (const c of s.claims) L.push(`- ${c.kind === 'quote' ? `“${one(c.text)}”` : one(c.text)} ${cite(c.refs)}`); });
  sec('Correction', stage('correction'), (s) => { for (const c of s.claims) L.push(`- ${one(c.text)} ${cite(c.refs)}`); });
  sec('Result', stage('result'), (s) => {
    for (const c of s.claims.filter((c) => c.status !== 'unverified')) L.push(`- ${one(c.text)} ${cite(c.refs)}`);
    const nv = s.claims.filter((c) => c.status === 'unverified');
    if (nv.length) { L.push('', '**Not verified**', ''); for (const c of nv) L.push(`- ${one(c.text)} ${cite(c.refs)}`); }
  });
  sec('Lesson', stage('lesson'), (s) => { for (const c of s.claims) L.push(`- ${one(c.text)} ${cite(c.refs)}`); });
  if (story.omitted.length) { L.push('## Stages left out', ''); for (const o of story.omitted) L.push(`- **${o.stage}**: ${o.reason}`); L.push(''); }
  L.push('## Metrics', '', '| Metric | Value | How | Events |', '|---|---|---|---|');
  for (const m of metrics) L.push(`| ${m.key} | ${m.display} ${m.unit} | ${m.how} | ${m.refs.join(', ')} |`);
  L.push('', '## Assets', '');
  for (const a of assets.assets) L.push(`- \`${a.id}\` (${a.kind}): \`${a.path}\`, ${a.provenance.source}${a.provenance.commit ? ` @ ${a.provenance.commit.slice(0, 7)}` : ''}${a.provenance.method ? `, ${a.provenance.method}` : ''}`);
  L.push('', '## Script', '');
  for (const [fmt, f] of Object.entries(sb.formats)) { L.push(`**${fmt}**`, ''); for (const s of f.scenes) if (s.narration) L.push(`- *${s.id}* (${s.start.toFixed(1)} s): ${s.narration}`); L.push(''); }
  L.push('## Events', '', '| ID | Time | Kind | Summary | Source |', '|---|---|---|---|---|');
  for (const e of events) L.push(`| ${e.id} | ${fmtStamp(e.t)} | ${e.kind}${e.tags.length ? ` (${e.tags.join(', ')})` : ''} | ${one(e.text).slice(0, 90).replace(/\|/g, '\\|')} | ${e.refs.join(' ')} |`);
  return L.join('\n') + '\n';
}

export function logEntry(lines) {
  return [`## ${new Date().toISOString()}`, '', ...lines, ''].join('\n');
}

export function appendLog(file, header, entry) {
  const prev = existsSync(file) ? readFileSync(file, 'utf8') : `${header}\n\n`;
  return prev.trimEnd() + '\n\n' + entry;
}

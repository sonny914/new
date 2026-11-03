#!/usr/bin/env node
// Run the night shift.
//
//   node src/cli.mjs                       every enabled company, real run
//   node src/cli.mjs --company quiet-bands one company
//   node src/cli.mjs --dry-run             scripted agent, nothing sent, no model calls
//   node src/cli.mjs --state <dir>         where memory/journal/outbox live (default nightshift/.state)
//   node src/cli.mjs --workspace <dir>     the product checkout the builder may edit (default: repo root)
//   node src/cli.mjs --out <file>          write a JSON summary (the workflow reads it to open the PR)
//
// The inbox is a GitHub issue when NIGHTSHIFT_TOKEN and NIGHTSHIFT_HQ_REPO are set (the repo must be
// private), otherwise INBOX.md / NOTES.md files in the state directory.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { runShift } from './shift.mjs';
import { runAgent, runDryAgent } from './agent.mjs';
import { localInbox } from './inbox.mjs';
import { githubInbox } from './github.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const engineDir = resolve(here, '..');

const { values: args } = parseArgs({
  options: {
    company: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    state: { type: 'string' },
    workspace: { type: 'string' },
    out: { type: 'string' },
  },
});

const env = process.env;
const companiesDir = join(engineDir, 'companies');
const stateRoot = resolve(args.state ?? env.NIGHTSHIFT_STATE_DIR ?? join(engineDir, '.state'));
const workspaceDir = resolve(args.workspace ?? join(engineDir, '..'));
const dryRun = args['dry-run'];

async function enabledCompanies() {
  const slugs = [];
  for (const entry of await readdir(companiesDir, { withFileTypes: true })) {
    const file = join(companiesDir, entry.name, 'company.json');
    if (!entry.isDirectory() || !existsSync(file)) continue;
    if (JSON.parse(await readFile(file, 'utf8')).enabled !== false) slugs.push(entry.name);
  }
  return slugs;
}

async function makeInbox({ company, state }) {
  if (env.NIGHTSHIFT_TOKEN && env.NIGHTSHIFT_HQ_REPO && !dryRun) {
    return githubInbox({
      token: env.NIGHTSHIFT_TOKEN,
      repo: env.NIGHTSHIFT_HQ_REPO,
      companyName: company.config.name,
      founders: company.config.founders ?? [],
    });
  }
  return localInbox(state.paths);
}

if (!dryRun && !env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) {
  console.error('ANTHROPIC_API_KEY is not set. Set it, or use --dry-run to see the loop without a model.');
  process.exit(2);
}

const slugs = args.company ? [args.company] : await enabledCompanies();
const results = [];
for (const slug of slugs) {
  const result = await runShift({
    slug,
    companiesDir,
    stateRoot,
    workspaceDir,
    env,
    dryRun,
    makeInbox,
    agent: dryRun ? runDryAgent : runAgent,
  });
  results.push(result);
  // NIGHTSHIFT_QUIET keeps the headline out of logs that may be public (Actions logs on a public repo).
  const said = env.NIGHTSHIFT_QUIET ? `${result.proposals.length} proposal(s); the brief is in the inbox` : (result.headline ?? '(no report)');
  console.log(`${slug}: ${said}${result.error ? ` [${result.error}]` : ''}`);
}

if (args.out) await writeFile(resolve(args.out), JSON.stringify(results, null, 2) + '\n');
process.exitCode = results.some((r) => r.error && !r.headline) ? 1 : 0;

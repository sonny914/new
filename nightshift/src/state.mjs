// What survives between shifts: memory (the agent's notes to itself), the journal (one entry per
// shift), the outbox (proposals and their fate) and meta (bookkeeping). Everything is plain files in a
// state directory that the workflow keeps in a private repository.

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { emptyOutbox } from './outbox.mjs';

export const MEMORY_CAP = 12_000;

async function readText(path, fallback) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return fallback;
  }
}

async function readJson(path, fallback) {
  const text = await readText(path, null);
  return text == null ? fallback : JSON.parse(text);
}

export async function openState(stateRoot, slug) {
  const dir = join(stateRoot, slug);
  const paths = {
    dir,
    memory: join(dir, 'memory.md'),
    outbox: join(dir, 'outbox.json'),
    meta: join(dir, 'meta.json'),
    journal: join(dir, 'journal'),
    inbox: join(dir, 'INBOX.md'),
    notes: join(dir, 'NOTES.md'),
  };
  await mkdir(paths.journal, { recursive: true });

  return {
    paths,
    memory: () => readText(paths.memory, ''),
    async saveMemory(md) {
      await writeFile(paths.memory, md.slice(0, MEMORY_CAP).trimEnd() + '\n');
    },
    outbox: () => readJson(paths.outbox, emptyOutbox()),
    saveOutbox: (o) => writeFile(paths.outbox, JSON.stringify(o, null, 2) + '\n'),
    meta: () => readJson(paths.meta, {}),
    saveMeta: (m) => writeFile(paths.meta, JSON.stringify(m, null, 2) + '\n'),
    /** The last n journal entries, newest first, each capped so old shifts can't crowd out tonight. */
    async recentJournal(n = 3, cap = 4000) {
      const files = (await readdir(paths.journal)).filter((f) => f.endsWith('.md')).sort().reverse().slice(0, n);
      return Promise.all(files.map(async (f) => ({ date: f.replace(/\.md$/, ''), text: (await readText(join(paths.journal, f), '')).slice(0, cap) })));
    },
    /** A second shift on the same date appends to that day's entry. */
    async writeJournal(date, md) {
      const path = join(paths.journal, `${date}.md`);
      const prior = await readText(path, '');
      await writeFile(path, prior ? `${prior.trimEnd()}\n\n---\n\n${md}` : md);
      return path;
    },
  };
}

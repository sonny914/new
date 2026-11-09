// Load text sources into the Company Brain: call transcripts, playbooks, briefs, exported docs.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node tools/brain-ingest.mjs <folder> --source calls
//   node tools/brain-ingest.mjs <folder> --source docs --dry-run      (counts chunks, writes nothing)
//
// Reads every .md and .txt file under the folder. The file's first "# Heading" (or its name) becomes the title.
// Re-running is safe: chunks are keyed by source and path, so a changed file replaces its old chunks' text.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
import { documentChunks } from '../netlify/functions/lib/brain/sources.js';
import { createStore } from '../netlify/functions/lib/brain/store.js';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const source = args[args.indexOf('--source') + 1];
const dry = args.includes('--dry-run');
if (!dir || !['calls', 'docs', 'analytics', 'hubspot'].includes(source)) {
  console.error('usage: node tools/brain-ingest.mjs <folder> --source calls|docs|analytics [--dry-run]');
  process.exit(1);
}

function* files(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (['.md', '.txt'].includes(extname(name).toLowerCase())) yield p;
  }
}

const rows = [];
for (const path of files(dir)) {
  const text = readFileSync(path, 'utf8');
  const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() || basename(path, extname(path));
  rows.push(...documentChunks({ source, id: relative(dir, path), title, text }));
}
console.log(`${rows.length} chunks from ${dir}`);
if (dry) process.exit(0);

const store = createStore({ url: (process.env.SUPABASE_URL ?? '').replace(/\/$/, ''), key: process.env.SUPABASE_SERVICE_KEY });
for (let i = 0; i < rows.length; i += 200) await store.upsertChunks(rows.slice(i, i + 200));
console.log('saved');

// Build Quiet Bands Studio: renders tools/studio/pages.mjs into studio/**. The output is committed, so Netlify
// serves it with no build step, the same as the rest of the site.
//   node tools/studio/build.mjs            write the pages
//   node tools/studio/build.mjs --check    exit 1 if any committed page differs from what the source renders
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from './pages.mjs';
import { layout, linker } from './lib.mjs';

export const STUDIO_DIR = fileURLToPath(new URL('../../studio/', import.meta.url));
const fileFor = (out) => STUDIO_DIR + (out === '' || out.endsWith('/') ? out + 'index.html' : out);

/** Every page as { out, file, html }. */
export function renderAll() {
  return PAGES.map((page) => ({ out: page.out, page, file: fileFor(page.out), html: layout(page, page.body(linker(page))) }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const stale = [];
  for (const { file, html, out } of renderAll()) {
    const now = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (now === html) continue;
    if (check) { stale.push(out || '(home)'); continue; }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
    console.log('wrote studio/' + (out || 'index.html'));
  }
  if (check && stale.length) { console.error('studio/ is out of date; run npm run studio:build. Stale: ' + stale.join(', ')); process.exit(1); }
  if (check) console.log('studio/ is up to date');
}

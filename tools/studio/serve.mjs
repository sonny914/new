// A local stand-in for Netlify, for staging the site before a deploy preview exists:
// folder URLs serve index.html, _redirects rules apply (splats, 301/302/404, `!` force, file shadowing),
// and a miss under /studio/ gets the Studio's own 404 the way the _redirects rule asks.
//   node tools/studio/serve.mjs [port]     then open http://localhost:<port>/studio/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.json': 'application/json', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary', '.xml': 'application/xml', '.txt': 'text/plain' };

/** Parse Netlify _redirects into [{ from, to, status, force }]. Exported for tests. */
export function parseRedirects(text) {
  return text.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((l) => {
    const [from, to, code = '301'] = l.split(/\s+/);
    return { from, to, status: parseInt(code, 10), force: code.endsWith('!') };
  });
}

/** The first rule that matches a path, with the splat filled in. */
export function matchRule(rules, path) {
  for (const r of rules) {
    if (r.from.endsWith('/*')) {
      const base = r.from.slice(0, -2);
      if (path === base || path.startsWith(base + '/')) return { ...r, to: r.to.replace(':splat', path.slice(base.length + 1)) };
    } else if (r.from === path || r.from === path.replace(/\/$/, '')) return r;
  }
  return null;
}

async function fileFor(path) {
  const p = normalize(join(ROOT, decodeURIComponent(path)));
  if (!p.startsWith(ROOT)) return null;
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
    if (s.isDirectory()) { const i = join(p, 'index.html'); if ((await stat(i)).isFile()) return i; }
  } catch { /* not there */ }
  try { const h = p + '.html'; if ((await stat(h)).isFile()) return h; } catch { /* not there */ }
  return null;
}

export function serve(port = 0) {
  const rules = parseRedirects(readFileSync(join(ROOT, '_redirects'), 'utf8'));
  const send = async (res, file, status = 200) => { res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(await readFile(file)); };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname;
    const file = await fileFor(path);
    const rule = matchRule(rules, path);
    if (rule && (rule.force || !file)) {
      if (rule.status === 301 || rule.status === 302) { res.writeHead(rule.status, { location: rule.to + (rule.to.includes('?') ? '' : url.search) }); return res.end(); }
      const target = await fileFor(rule.to.split('?')[0]);
      if (target) return send(res, target, rule.status);
    }
    if (file) return send(res, file);
    return send(res, join(ROOT, '404.html'), 404);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serve(Number(process.argv[2]) || 8080);
  console.log(`staging: http://localhost:${server.address().port}/studio/`);
}

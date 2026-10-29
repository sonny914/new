// Assets: only real material from the session. Media the session committed, a recorded walk-through of each
// page it added, and a before/after of each page it changed (parent of its first commit vs its last commit).
// Every asset is registered in session-assets.json with where it came from and how it was made.
import { createServer } from 'node:http';
import { readFile, stat, mkdir, rm } from 'node:fs/promises';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { git, run, sha256File, loadPlaywright, CACHE, slugify } from './util.mjs';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };

export function serveDir(root) {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      try {
        let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
        const body = await readFile(p);
        res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(body);
      } catch { res.writeHead(404); res.end(); }
    }).listen(0, '127.0.0.1', () => ok({ port: server.address().port, close: () => new Promise((r) => server.close(r)) }));
  });
}

export async function probe(path) {
  const out = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', path]);
  const j = JSON.parse(out), s = j.streams?.[0] ?? {};
  const [a, b] = String(s.r_frame_rate ?? '0/1').split('/').map(Number);
  return { width: s.width ?? null, height: s.height ?? null, fps: b ? Math.round((a / b) * 100) / 100 : null, duration: j.format?.duration ? +(+j.format.duration).toFixed(3) : null };
}

async function worktree(repo, sha) {
  const dir = join(tmpdir(), `qb-capture-wt-${sha.slice(0, 10)}-${process.pid}`);
  if (!existsSync(dir)) git(repo, 'worktree', 'add', '--detach', '--force', dir, sha);
  return { dir, remove: () => { try { git(repo, 'worktree', 'remove', '--force', dir); } catch {} } };
}

// Nearest id="" above the first changed line of a file in a commit, so a before/after frames what changed.
function anchorFor(repo, sha, path) {
  const diff = git(repo, 'show', '-U0', '--format=', sha, '--', path);
  // the biggest hunk is the change worth framing
  const hunks = [...diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)].map((m) => ({ at: +m[1], n: m[2] == null ? 1 : +m[2] }));
  if (!hunks.length) return null;
  const big = hunks.reduce((a, b) => (b.n > a.n ? b : a));
  const lines = git(repo, 'show', `${sha}:${path}`).split('\n').slice(0, big.at);
  for (let i = lines.length - 1; i >= 0; i--) { const id = lines[i].match(/<section[^>]*\sid="([^"]+)"/); if (id) return id[1]; }
  return null;
}

const urlPath = (p) => '/' + p.replace(/index\.html$/, '');

export async function collectAssets({ events, repo, archiveDir, capture = true, log = () => {} }) {
  const assets = [];
  const work = events.filter((e) => !e.tags.includes('capture-output'));
  const commits = work.filter((e) => e.kind === 'commit');
  if (!commits.length) return assets;
  const first = commits[0].data.sha, last = commits[commits.length - 1].data.sha;
  const removed = new Set(work.filter((e) => e.kind === 'file-removed').map((e) => e.data.path));

  // 1. media the session committed (and did not later remove)
  for (const a of work.filter((e) => e.kind === 'artifact' && !removed.has(e.data.path))) {
    const abs = join(repo, a.data.path);
    if (!existsSync(abs)) continue;
    const isVideo = /\.(mp4|mov|webm)$/i.test(a.data.path);
    assets.push({ id: slugify(a.data.path.split('/').slice(-2).join('-').replace(/\.\w+$/, '')), kind: isVideo ? 'video' : 'image', path: a.data.path, root: 'repo',
      provenance: { source: 'committed by the session', commit: a.data.sha, event: a.id }, sha256: sha256File(abs), probe: isVideo ? await probe(abs) : null });
  }
  if (!capture) return assets;

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const outDir = join(archiveDir, 'assets');
  await mkdir(outDir, { recursive: true });
  try {
    // 2. a walk-through of each page the session added, captured at its last commit
    const wtLast = await worktree(repo, last);
    const srvLast = await serveDir(wtLast.dir);
    for (const pg of work.filter((e) => e.kind === 'page')) {
      const id = `screen-${slugify(pg.data.path.replace(/\/?index\.html$/, ''))}`;
      const file = join(outDir, `${id}.mp4`);
      const url = `http://127.0.0.1:${srvLast.port}${urlPath(pg.data.path)}`;
      log(`capture walk-through ${urlPath(pg.data.path)} @ ${last.slice(0, 7)}`);
      const res = await recordScroll(browser, url, file, { seconds: 8, fps: 30 });
      assets.push({ id, kind: 'screen', path: relative(archiveDir, file), root: 'archive', page: urlPath(pg.data.path),
        provenance: { source: 'recorded from the page as committed', commit: last, event: pg.id, method: 'Playwright, clock frozen and stepped 1/30 s per frame, scripted scroll', viewport: '1440x900', captured_at: new Date().toISOString() },
        sha256: sha256File(file), probe: await probe(file), stops: res.stops });
    }
    // 3. before/after of each page the session changed
    const changed = new Map();
    for (const c of commits) for (const f of c.data.files) if (f.status === 'M' && /\.html$/.test(f.path) && !f.path.startsWith('tools/') && !changed.has(f.path)) changed.set(f.path, c.data.sha);
    if (changed.size) {
      const parent = git(repo, 'rev-parse', `${first}^`);
      const wtBefore = await worktree(repo, parent);
      const srvBefore = await serveDir(wtBefore.dir);
      for (const [path, sha] of changed) {
        const anchor = anchorFor(repo, sha, path);
        const base = `ba-${slugify(path.replace(/\/?index\.html$/, '') || 'home')}`;
        for (const [side, srv, commit] of [['before', srvBefore, parent], ['after', srvLast, last]]) {
          const file = join(outDir, `${base}-${side}.png`);
          log(`capture ${side} ${urlPath(path)}${anchor ? '#' + anchor : ''} @ ${commit.slice(0, 7)}`);
          await still(browser, `http://127.0.0.1:${srv.port}${urlPath(path)}`, anchor, file);
          assets.push({ id: `${base}-${side}`, kind: 'still', path: relative(archiveDir, file), root: 'archive', page: urlPath(path), anchor,
            provenance: { source: side === 'before' ? 'the page one commit before the session' : 'the page at the session\'s last commit', commit, method: 'Playwright screenshot, 1440x900, clock frozen', captured_at: new Date().toISOString() }, sha256: sha256File(file) });
        }
      }
      await srvBefore.close(); wtBefore.remove();
    }
    await srvLast.close(); wtLast.remove();
  } finally { await browser.close(); }
  return assets;
}

async function newPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await page.clock.install({ time: new Date('2026-10-20T20:00:00Z') });
  return page;
}

async function still(browser, url, anchor, file) {
  const page = await newPage(browser);
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(1500);
  if (anchor) await page.evaluate((id) => { const el = document.getElementById(id); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40); }, anchor);
  await page.clock.runFor(800);
  await page.screenshot({ path: file, type: 'png' });
  await page.close();
}

// Scroll from the top through the page's sections; hold on each heading. Frames go straight to ffmpeg.
async function recordScroll(browser, url, file, { seconds, fps }) {
  const page = await newPage(browser);
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(1200);
  const stops = await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ys = [0, ...[...document.querySelectorAll('section h2, section h1')].map((h) => Math.min(max, h.getBoundingClientRect().top + scrollY - 120))];
    return [...new Set(ys.map((y) => Math.max(0, Math.round(y))))].sort((a, b) => a - b).slice(0, 4);
  });
  const n = Math.round(seconds * fps), seg = n / Math.max(1, stops.length - 1 || 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const ff = (await import('node:child_process')).spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    const k = Math.min(stops.length - 2, Math.floor(i / seg));
    const local = stops.length > 1 ? (i - k * seg) / seg : 0;
    const hold = 0.45; // hold on each stop, then glide to the next
    const y = stops.length > 1 ? stops[k] + (stops[k + 1] - stops[k]) * ease(Math.max(0, (local - hold) / (1 - hold))) : 0;
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.clock.runFor(1000 / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
  await page.close();
  return { stops };
}

// Decode a video asset to a JPEG sequence the stage can step through frame by frame.
export async function framesFor(asset, archiveDir, repo, { fps = 30, height = 1280 } = {}) {
  const src = asset.root === 'repo' ? join(repo, asset.path) : join(archiveDir, asset.path);
  const dir = join(CACHE, 'frames', `${asset.id}-${asset.sha256.slice(0, 10)}-${height}`);
  if (!existsSync(join(dir, 'done'))) {
    await rm(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `fps=${fps},scale=-2:${height}:flags=lanczos`, '-q:v', '3', join(dir, '%04d.jpg')]);
    await (await import('node:fs/promises')).writeFile(join(dir, 'done'), '');
  }
  return { dir, count: readdirSync(dir).filter((f) => f.endsWith('.jpg')).length };
}

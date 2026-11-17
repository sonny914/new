// Packaging: thumbnails and titles for a finished cut. A thumbnail is one real frame of the footage with a few words
// set beside or over it; nothing is generated, composited or retouched. Before anything renders, the spec is checked:
// the frame must be a moment the cut actually shows, every number in a thumbnail or a title needs a cited fact,
// type never sits on a measured face, and a logo is the approved file or nothing. The output is up to three variants
// to test against each other and a sheet at feed size. Nothing here predicts a click rate, uploads or publishes.
//
// thumbs.json (qb-capture/thumbs@1), paths relative to the file:
//   { title, storyboard: "<documentary.json>", video: "<the rendered cut>", facts: [{ text, from }], mark: false, logo: "<file>",
//     variants: [{ id: "a", clip: "c1" | file: "<video>", at: 1.42, text: "He talks.\nNo *sound*.", layout: "over" | "side",
//                  band: "top" | "bottom" | "left" | "right", focus: [0.5, 0.4], zoom: 1 }],
//     titles: ["...", "..."] }
import { existsSync, readFileSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';
import { ROOT, sha256File, writeJSON, writeText, loadPlaywright, clamp } from './util.mjs';
import { serveDir } from './assets.mjs';
import { loadDoc, timeDoc, clipData } from './documentary.mjs';

export const SIZES = { '16x9': [1280, 720], '9x16': [1080, 1920] };
export const MAX_BYTES = 2 * 1024 * 1024; // YouTube's limit for a custom thumbnail
export const TITLE_MAX = 100, TITLE_FEED = 60; // YouTube's hard limit, and roughly where a feed cuts a title off
const WORDS_MAX = 5, NEAR = 0.05;
const numbers = (text) => (String(text).match(/\d+(?:\.\d+)?/g) ?? []);

// "He talks.\nNo *sound*." → lines of runs; `hot` is the one phrase set in orange
export function parseText(text) {
  const lines = String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split(/(\*[^*]+\*)/).filter(Boolean).map((r) => (/^\*.*\*$/.test(r) ? { t: r.slice(1, -1), hot: true } : { t: r })));
  const plain = lines.map((l) => l.map((r) => r.t).join('')).join(' ');
  return { lines, plain, words: plain.split(/\s+/).filter(Boolean).length, hot: lines.flat().filter((r) => r.hot).length };
}

// Where a source frame lands when it fills a panel: scaled to cover, the focus point brought to the anchor (the
// panel's centre unless told otherwise) as far as the edges allow. The same box places a measured face, so the check
// and the picture agree.
export function coverBox([w, h], panel, focus = [0.5, 0.5], zoom = 1, anchor = [0.5, 0.5]) {
  const s = Math.max(panel.w / w, panel.h / h) * Math.max(1, zoom), W = w * s, H = h * s;
  return { left: +(panel.x + clamp(panel.w * anchor[0] - focus[0] * W, panel.w - W, 0)).toFixed(2), top: +(panel.y + clamp(panel.h * anchor[1] - focus[1] * H, panel.h - H, 0)).toFixed(2), width: +W.toFixed(2), height: +H.toFixed(2) };
}

// The picture panel and the area type may use. `over`: the frame fills the canvas and type sits in a band of it.
// `side`: the frame takes one side and type sits on black beside it. 9:16 keeps type inside the centred 4:5 area,
// which is what survives a profile grid crop.
export function layoutFor(fmt, layout = 'over', band = null) {
  const [W, H] = SIZES[fmt], m = Math.round(W * 0.05), tall = fmt === '9x16', y0 = tall ? (H - W * 1.25) / 2 : 0, y1 = H - y0;
  if (layout === 'side' && !tall) {
    const right = band === 'right', pw = Math.round(W * 0.58);
    return { W, H, layout, band: right ? 'right' : 'left', panel: { x: right ? 0 : W - pw, y: 0, w: pw, h: H }, text: { x: right ? pw + m : m, y: m, w: W - pw - 2 * m, h: H - 2 * m }, align: 'middle' };
  }
  if (layout === 'side') {
    const top = band === 'top', ph = Math.round(H * 0.56);
    return { W, H, layout, band: top ? 'top' : 'bottom', panel: { x: 0, y: top ? H - ph : 0, w: W, h: ph }, text: top ? { x: m, y: y0 + m, w: W - 2 * m, h: H - ph - y0 - 2 * m } : { x: m, y: ph + m, w: W - 2 * m, h: y1 - ph - 2 * m }, align: 'middle' };
  }
  const top = band === 'top', th = Math.round((y1 - y0) * (tall ? 0.34 : 0.46));
  return { W, H, layout: 'over', band: top ? 'top' : 'bottom', panel: { x: 0, y: 0, w: W, h: H }, text: { x: m, y: top ? y0 + m : y1 - m - th, w: Math.round(W * (tall ? 0.9 : 0.72)), h: th }, align: top ? 'start' : 'end' };
}

// every stretch of each clip the cut puts on screen, from the timed storyboard
export function shownSpans(timed) {
  const spans = new Map(), add = (clip, a, b) => { if (clip != null) spans.set(clip, [...(spans.get(clip) ?? []), [a, b]]); };
  for (const s of timed.scenes) for (const b of s.beats ?? []) { add(b.clip, b.src0, b.src1); if (b.b) add(b.b.clip, b.b.src, b.b.src); }
  for (const [k, list] of spans) {
    const merged = [];
    for (const [a, b] of list.sort((x, y) => x[0] - y[0])) { const last = merged[merged.length - 1]; if (last && a <= last[1] + NEAR) last[1] = Math.max(last[1], b); else merged.push([a, b]); }
    spans.set(k, merged);
  }
  return spans;
}

function probeVideo(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', file], { encoding: 'utf8' }));
  const s = j.streams?.[0]; if (!s) throw new Error(`${file}: no video stream`);
  const [a, b] = String(s.r_frame_rate).split('/').map(Number);
  return { width: s.width, height: s.height, fps: b ? a / b : 30, seconds: +(+j.format.duration).toFixed(3) };
}

export function loadThumbs(file) {
  const spec = JSON.parse(readFileSync(file, 'utf8'));
  if (spec.schema !== 'qb-capture/thumbs@1') throw new Error(`${file}: not a qb-capture/thumbs@1 file`);
  spec.base = dirname(resolve(file));
  for (const k of ['storyboard', 'video', 'logo']) if (spec[k]) spec[k] = resolve(spec.base, spec[k]);
  spec.doc = spec.storyboard ? loadDoc(spec.storyboard) : null;
  return spec;
}

// Everything that can be judged before a frame is drawn. Returns the variants resolved to a file and a time.
export function checkThumbs(spec) {
  const problems = [], warnings = [], doc = spec.doc;
  const facts = new Map([...(doc?.facts ?? []), ...(spec.facts ?? [])].map((f) => [String(f.text), f]));
  for (const f of spec.facts ?? []) if (!f.from) problems.push(`fact "${f.text}" cites no source`);
  const cited = (what, text) => { for (const n of numbers(text)) if (!facts.has(n)) problems.push(`${what} shows ${n}, which no fact cites`); };
  let spans = null;
  if (doc) { const timed = timeDoc(doc); if (timed.problems.length) problems.push(`the storyboard has problems of its own; fix them first: ${timed.problems[0]}`); spans = shownSpans(timed); }
  if (spec.video && !existsSync(spec.video)) problems.push(`the cut is not at ${spec.video}`);
  if (spec.logo && !existsSync(spec.logo)) problems.push(`logo: ${spec.logo} is missing. A thumbnail carries the approved logo file or no logo, never a typeset stand-in`);
  const variants = [], ids = new Set();
  if (!(spec.variants ?? []).length) problems.push('no variants');
  if ((spec.variants ?? []).length > 3) warnings.push(`${spec.variants.length} variants: one test compares three at most, so choose three`);
  for (const [i, v] of (spec.variants ?? []).entries()) {
    const id = String(v.id ?? String.fromCharCode(97 + i)), tag = `variant ${id}`;
    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id)) { problems.push(`${tag}: ids are distinct, lower case letters, digits or dashes`); continue; }
    ids.add(id);
    let file = null, source = null, shown = 'not checked', face = null;
    if (v.clip != null) {
      const c = doc?.clips?.[v.clip];
      if (!c) { problems.push(`${tag}: no clip "${v.clip}"${doc ? '' : ' (name a storyboard to cite its clips)'}`); continue; }
      file = c.file; source = `clip ${v.clip}`;
    } else if (v.file) { file = resolve(spec.base, v.file); source = file === spec.video ? 'the cut' : 'a file'; }
    else if (spec.video) { file = spec.video; source = 'the cut'; }
    else { problems.push(`${tag}: names no clip, file or cut to take a frame from`); continue; }
    if (!existsSync(file)) { problems.push(`${tag}: ${file} is missing. Report it; do not substitute another frame`); continue; }
    const p = probeVideo(file), at = +v.at;
    if (!Number.isFinite(at) || at < 0 || at > p.seconds - 1 / p.fps + 1e-6) { problems.push(`${tag}: ${basename(file)} has no frame at ${v.at} s (it runs ${p.seconds} s)`); continue; }
    if (source === 'the cut') shown = 'a frame of the cut';
    else if (v.clip != null) {
      const list = spans?.get(v.clip) ?? [];
      if (list.some(([a, b]) => at >= a - NEAR && at <= b + NEAR)) shown = 'in the cut';
      else problems.push(`${tag}: ${v.clip} at ${at} s is not in the cut (it shows ${list.map(([a, b]) => (a === b ? `${a} s` : `${a}–${b} s`)).join(', ') || 'none of this clip'}). A thumbnail shows a moment the video contains`);
      const d = clipData(doc.clips[v.clip]); face = d.face?.[Math.min(d.n - 1, Math.round(at * d.fps))] ?? null;
    } else warnings.push(`${tag}: ${basename(file)} is not checked against the cut. Confirm this moment is in the video`);
    const text = parseText(v.text);
    if (!text.words) problems.push(`${tag}: no text. A frame alone is chosen in the app, not made here`);
    if (text.words > WORDS_MAX) warnings.push(`${tag}: ${text.words} words. Past ${WORDS_MAX} they stop being readable at feed size`);
    if (text.hot > 1) problems.push(`${tag}: ${text.hot} phrases in orange. One accent only`);
    cited(`${tag}: "${text.plain}"`, text.plain);
    if (v.layout && !['over', 'side'].includes(v.layout)) problems.push(`${tag}: layout is "over" or "side"`);
    variants.push({ id, file, at, source, shown, face, text, layout: v.layout ?? 'over', band: v.band ?? null, focus: v.focus ?? null, zoom: v.zoom ?? 1, probe: p });
  }
  const titles = (spec.titles ?? []).map((t) => String(t.text ?? t).trim()).filter(Boolean);
  titles.forEach((t, i) => {
    if (t.length > TITLE_MAX) problems.push(`title ${i + 1}: ${t.length} characters; YouTube allows ${TITLE_MAX}`);
    else if (t.length > TITLE_FEED) warnings.push(`title ${i + 1}: ${t.length} characters; past about ${TITLE_FEED} the end is cut off in feeds`);
    if (titles.indexOf(t) !== i) problems.push(`title ${i + 1} repeats title ${titles.indexOf(t) + 1}`);
    cited(`title ${i + 1}: "${t}"`, t);
  });
  if (!titles.length) warnings.push('no titles: give two or three to choose from');
  return { problems, warnings, variants, titles };
}

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Draw each variant in headless Chromium: the frame as decoded, the brand type, nothing else. A variant whose type
// does not fit, lands on the face or weighs too much is reported and not written.
export async function renderThumbs(spec, checked, out, formats = ['16x9']) {
  const { chromium } = await loadPlaywright();
  const frames = join(out, '.frames'); mkdirSync(frames, { recursive: true });
  const problems = [], files = [];
  const srv = await serveDir(ROOT, { '/__media/': frames, '/__out/': out, ...(spec.logo ? { '/__logo/': dirname(spec.logo) } : {}) }), browser = await chromium.launch();
  try {
    for (const v of checked.variants) {
      const png = join(frames, `${v.id}.png`); rmSync(png, { force: true });
      execFileSync('ffmpeg', ['-y', '-nostdin', '-loglevel', 'error', '-ss', String(v.at), '-i', v.file, '-frames:v', '1', png]);
      if (!existsSync(png)) { problems.push(`variant ${v.id}: no frame decoded at ${v.at} s`); continue; }
      for (const fmt of formats) {
        if (!SIZES[fmt]) throw new Error(`unknown format ${fmt}`);
        // type goes in the half the face isn't in, unless the spec says where
        const band = v.band ?? (v.layout === 'over' && v.face ? ((v.face[1] + v.face[3]) / 2 > 0.5 ? 'top' : 'bottom') : null);
        const L = layoutFor(fmt, v.layout, band), src = [v.probe.width, v.probe.height];
        const focus = v.focus ?? (v.face ? [(v.face[0] + v.face[2]) / 2, (v.face[1] + v.face[3]) / 2] : [0.5, 0.5]);
        // a measured face is framed in the part of the picture the type leaves free, where the crop has room to move
        const free = L.layout === 'over' && v.face && !v.focus ? (L.band === 'top' ? (L.text.y + L.text.h + L.H) / 2 : L.text.y / 2) / L.H : 0.5;
        const img = coverBox(src, L.panel, focus, v.zoom, [0.5, free]);
        const page = await browser.newPage({ viewport: { width: L.W, height: L.H }, deviceScaleFactor: 1 });
        await page.addInitScript((d) => { window.__THUMB__ = d; }, { ...L, img, frame: `/__media/${v.id}.png`, lines: v.text.lines, tall: fmt === '9x16',
          mark: spec.mark === true ? '/assets/brand/mark.svg' : null, logo: spec.logo ? `/__logo/${basename(spec.logo)}` : null });
        await page.goto(`http://127.0.0.1:${srv.port}/tools/capture/stage/thumb.html`);
        await page.waitForFunction(() => window.thumb?.ok || window.thumb?.error, null, { timeout: 30000 });
        const r = await page.evaluate(() => window.thumb);
        const name = `thumb-${v.id}-${fmt}.jpg`, tag = `variant ${v.id} (${fmt})`;
        let bad = r.error ? `${tag}: ${r.error}` : !r.fits ? `${tag}: the text does not fit at a readable size. Use fewer or shorter words` : null;
        if (!bad && v.face && L.layout === 'over') {
          const f = { x: img.left + v.face[0] * img.width, y: img.top + v.face[1] * img.height, w: (v.face[2] - v.face[0]) * img.width, h: (v.face[3] - v.face[1]) * img.height };
          if (overlap(f, r.rect)) bad = `${tag}: the text sits on the face. Move it (band), shorten it, or use the side layout`;
        }
        if (!bad) {
          const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
          if (buf.length > MAX_BYTES) bad = `${tag}: ${buf.length} bytes; a thumbnail must be under ${MAX_BYTES}`;
          else { await writeFile(join(out, name), buf); files.push({ variant: v.id, format: fmt, file: name, bytes: buf.length, band: L.band, layout: L.layout, font: r.font }); }
        }
        if (bad) { problems.push(bad); rmSync(join(out, name), { force: true }); }
        await page.close();
      }
    }
    // the sheet: every thumbnail at the sizes a feed shows it, on dark and on light, to judge legibility
    if (files.length) {
      // one row per variant, at true pixel size: what is unreadable here is unreadable in the feed
      const page = await browser.newPage({ viewport: { width: 1640, height: 400 }, deviceScaleFactor: 1 });
      const row = (id) => `<div class="r"><p>${id}</p>${files.filter((f) => f.variant === id).flatMap((f) => (f.format === '9x16' ? [270, 150] : [480, 320, 168]).map((w) => `<img src="/__out/${f.file}" width="${w}">`)).join('')}</div>`;
      const rows = [...new Set(files.map((f) => f.variant))].map(row).join('');
      await page.goto(`http://127.0.0.1:${srv.port}/tools/capture/stage/thumb.html?sheet`);
      await page.setContent(`<style>body{margin:0;font:13px sans-serif}section{padding:24px 28px;display:flex;flex-direction:column;gap:20px}.d{background:#0f0f0f;color:#aaa}.l{background:#fff;color:#606060}
        .r{display:flex;align-items:flex-end;gap:20px}.r p{width:40px;margin:0}img{border-radius:8px;display:block}</style><section class="d">${rows}</section><section class="l">${rows}</section>`, { waitUntil: 'load' });
      await writeFile(join(out, 'thumbs-sheet.jpg'), await page.screenshot({ type: 'jpeg', quality: 88, fullPage: true }));
      await page.close();
    }
  } finally { await browser.close(); await srv.close(); }
  return { files, problems };
}

export function packagingReport(spec, checked, rendered) {
  const L = [`# Packaging: ${spec.title ?? spec.doc?.title ?? basename(spec.base)}`, '',
    'Status: **awaiting the founder\'s choice**. Nothing is uploaded or published. No click rate is predicted here: the only real answer is a test on the published video.', '',
    '## Thumbnails', '', 'Each is one frame of the footage as decoded, with type added. Look at `thumbs-sheet.jpg` first: it shows them at feed size.', '',
    '| Variant | Frame | In the cut | Text | Files |', '|---|---|---|---|---|'];
  for (const v of checked.variants) {
    const mine = rendered.files.filter((f) => f.variant === v.id);
    L.push(`| ${v.id} | \`${basename(v.file)}\` at ${v.at} s (sha256 ${sha256File(v.file).slice(0, 16)}) | ${v.shown} | ${v.text.plain} | ${mine.map((f) => `\`${f.file}\` (${Math.round(f.bytes / 1024)} KB)`).join(', ') || 'not rendered'} |`);
  }
  L.push('', '## Titles', '', '| # | Title | Characters |', '|---|---|---|', ...checked.titles.map((t, i) => `| ${i + 1} | ${t.replace(/\|/g, '\\|')} | ${t.length} |`), '');
  const facts = [...(spec.doc?.facts ?? []), ...(spec.facts ?? [])].filter((f) => [...checked.variants.map((v) => v.text.plain), ...checked.titles].some((s) => numbers(s).includes(String(f.text))));
  if (facts.length) L.push('## Numbers shown, and their sources', '', '| Shown | Source |', '|---|---|', ...facts.map((f) => `| ${f.text} | ${f.from} |`), '');
  if (checked.warnings.length) L.push('## Warnings', '', ...checked.warnings.map((w) => `- ${w}`), '');
  L.push('## To decide', '', '- [ ] Which thumbnails go into the test (up to three)', '- [ ] Which title', '- [ ] Publish (manual; nothing posts automatically)');
  return L.join('\n');
}

export async function packageThumbs(file, { out, formats = ['16x9'], checkOnly = false } = {}) {
  const spec = loadThumbs(file), checked = checkThumbs(spec);
  if (checked.problems.length) throw new Error(`thumbnail check failed:\n- ${checked.problems.join('\n- ')}`);
  if (checkOnly) return { spec, checked, out: null, files: [] };
  out = resolve(out ?? join(spec.base, 'packaging')); mkdirSync(out, { recursive: true });
  const rendered = await renderThumbs(spec, checked, out, formats);
  rmSync(join(out, '.frames'), { recursive: true, force: true });
  writeText(join(out, 'packaging.md'), packagingReport(spec, checked, rendered));
  writeJSON(join(out, 'packaging.json'), { status: 'awaiting approval', generated: new Date().toISOString(), thumbnails: rendered.files, titles: checked.titles,
    frames: checked.variants.map((v) => ({ variant: v.id, file: basename(v.file), sha256: sha256File(v.file), at: v.at, shown: v.shown })),
    items: ['thumbnails', 'title', 'publish'].map((id) => ({ id, status: 'pending' })) });
  if (rendered.problems.length) throw new Error(`${rendered.files.length} thumbnails written to ${out}; these were refused:\n- ${rendered.problems.join('\n- ')}`);
  return { spec, checked, out, files: rendered.files, bytes: statSync(join(out, 'thumbs-sheet.jpg')).size };
}

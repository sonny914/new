// Shared helpers for QB Capture: paths, JSON/text IO, git, child processes, time formatting.
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

export const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
export const CAPTURE = join(ROOT, 'tools/capture');
export const ARCHIVE = join(ROOT, 'docs/sessions');
export const CACHE = join(CAPTURE, '.cache');

export const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const readJSONIf = (p, fallback = null) => (existsSync(p) ? readJSON(p) : fallback);
export function writeJSON(p, v) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); }
export function writeText(p, s) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s.endsWith('\n') ? s : s + '\n'); }

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
export const sha256File = (p) => sha256(readFileSync(p));

export const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 << 20 }).trimEnd();
export const gitBuf = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 256 << 20 });

// spawn a process and resolve on exit 0; stdout is collected unless stdio is overridden
export function run(cmd, args, opts = {}) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '', err = '';
    p.stdout?.on('data', (d) => (out += d));
    p.stderr?.on('data', (d) => (err += d));
    p.on('error', fail);
    p.on('close', (code) => (code === 0 ? ok(out) : fail(new Error(`${cmd} exited ${code}: ${err.slice(-2000)}`))));
  });
}

export async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  return createRequire(import.meta.url)('playwright');
}

export const shortId = (id) => String(id).replace(/^session_/, '').slice(0, 8);
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// Display time zone for on-screen dates. The founder works US Central; override with QB_CAPTURE_TZ.
export const TZ = process.env.QB_CAPTURE_TZ || 'America/Chicago';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function parts(iso, tz = TZ) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' });
  const o = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? o.timeZoneName;
  return { y: +o.year, m: +o.month, d: +o.day, hh: o.hour === '24' ? '00' : o.hour, mm: o.minute, zone };
}
export const fmtDay = (iso, tz) => { const p = parts(iso, tz); return `${p.d} ${MONTHS[p.m - 1]}`; };
export const fmtTime = (iso, tz) => { const p = parts(iso, tz); return `${p.hh}:${p.mm}`; };
export const fmtStamp = (iso, tz) => { const p = parts(iso, tz); return `${p.d} ${MONTHS[p.m - 1]} ${p.hh}:${p.mm}`; };
export const fmtZone = (iso, tz) => parts(iso, tz).zone;
export const fmtDate = (iso, tz) => { const p = parts(iso, tz); return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`; };

export const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round = (v, n = 0) => { const k = 10 ** n; return Math.round(v * k) / k; };

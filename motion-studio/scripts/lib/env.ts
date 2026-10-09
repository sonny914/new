// Runtime environment: which browser renders, which ffmpeg encodes, and what hardware we are on.
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import os from 'node:os';

const CANDIDATES = [
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium',
];

/** QB_BROWSER wins; then a pre-installed headless shell; else null (Remotion downloads its own). */
export function browserExecutable(): string | null {
  if (process.env.QB_BROWSER) return process.env.QB_BROWSER;
  return CANDIDATES.find((c) => existsSync(c)) ?? null;
}

export function chromeMode(exe: string | null): 'headless-shell' | 'chrome-for-testing' {
  return !exe || /headless_shell/.test(exe) ? 'headless-shell' : 'chrome-for-testing';
}

export function ffmpeg(): string {
  return process.env.QB_FFMPEG ?? 'ffmpeg';
}
export function ffprobe(): string {
  return process.env.QB_FFPROBE ?? 'ffprobe';
}

export function hasFfmpeg(): boolean {
  try {
    execFileSync(ffmpeg(), ['-version'], {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
}

export function machine() {
  return {
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    memoryGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    platform: `${os.platform()} ${os.release()}`,
    node: process.version,
  };
}

/** Render tabs: leave a core for the encoder on small machines. */
export function concurrency(): number {
  const n = os.cpus().length;
  return Math.max(1, n <= 4 ? n : n - 1);
}

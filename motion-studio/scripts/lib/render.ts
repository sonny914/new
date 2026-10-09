// Remotion rendering: bundle once, then stills or video. Everything runs on the CPU (SwiftShader
// via `gl: swangle`), so machines without a GPU render identically, just slower.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {browserExecutable, chromeMode, concurrency} from './env';
import {STUDIO, type LoadedProject} from './project';

export interface Bundled {
  serveUrl: string;
  ms: number;
}

export async function makeBundle(p: LoadedProject): Promise<Bundled> {
  const t0 = Date.now();
  const serveUrl = await bundle({entryPoint: path.join(STUDIO, 'src/index.ts'), publicDir: p.publicDir});
  return {serveUrl, ms: Date.now() - t0};
}

const browser = () => {
  const exe = browserExecutable();
  return {browserExecutable: exe, chromeMode: chromeMode(exe), chromiumOptions: {gl: 'swangle' as const}};
};

function inputProps(p: LoadedProject, qaFrames?: number[]) {
  return {config: p.raw, assetBase: p.folder, ...(qaFrames ? {qa: {frames: qaFrames}} : {})};
}

/**
 * Remotion's default logger prints every browser console message whatever logLevel says, so the
 * QA probe's lines (collected through onBrowserLog) are dropped from the terminal here.
 */
async function withoutQaEcho<T>(fn: () => Promise<T>): Promise<T> {
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  const keep = (chunk: unknown) => !(typeof chunk === 'string' ? chunk : String(chunk)).includes('[qa] ');
  process.stdout.write = ((c: never, ...rest: never[]) => (keep(c) ? out(c, ...rest) : true)) as typeof process.stdout.write;
  process.stderr.write = ((c: never, ...rest: never[]) => (keep(c) ? err(c, ...rest) : true)) as typeof process.stderr.write;
  try {
    return await fn();
  } finally {
    process.stdout.write = out;
    process.stderr.write = err;
  }
}

export interface QaLog {
  frame: number;
  items: {layer: string; kind: string; x: number; y: number; w: number; h: number}[];
}

export async function stills(p: LoadedProject, b: Bundled, frames: number[], outDir: string, scale = 1): Promise<string[]> {
  mkdirSync(outDir, {recursive: true});
  const props = inputProps(p);
  const br = browser();
  const instance = await openBrowser('chrome', {browserExecutable: br.browserExecutable, chromeMode: br.chromeMode, chromiumOptions: br.chromiumOptions, logLevel: 'error'});
  try {
    const composition = await selectComposition({serveUrl: b.serveUrl, id: 'Project', inputProps: props, puppeteerInstance: instance, logLevel: 'error', ...br});
    const out: string[] = [];
    for (const frame of frames) {
      const file = path.join(outDir, `f${String(frame).padStart(4, '0')}.png`);
      await renderStill({composition, serveUrl: b.serveUrl, frame, output: file, inputProps: props, scale, puppeteerInstance: instance, imageFormat: 'png', logLevel: 'error', ...br});
      out.push(file);
    }
    return out;
  } finally {
    await instance.close({silent: true});
  }
}

export interface VideoResult {
  file: string;
  frames: number;
  ms: number;
  fps: number;
  qa: QaLog[];
  browserErrors: string[];
  /** System-wide memory in use at peak minus before the render, in MB (includes Chromium). */
  peakMemMB: number;
}

export async function video(
  p: LoadedProject,
  b: Bundled,
  opts: {file: string; scale: number; crf: number; quality: 'preview' | 'master'; qaFrames?: number[]; onProgress?: (pct: number) => void},
): Promise<VideoResult> {
  mkdirSync(path.dirname(opts.file), {recursive: true});
  const props = inputProps(p, opts.qaFrames);
  const br = browser();
  const composition = await selectComposition({serveUrl: b.serveUrl, id: 'Project', inputProps: props, logLevel: 'error', ...br});
  const qa: QaLog[] = [];
  const browserErrors: string[] = [];
  const base = os.totalmem() - os.freemem();
  let peak = base;
  const sampler = setInterval(() => (peak = Math.max(peak, os.totalmem() - os.freemem())), 250);
  const t0 = Date.now();
  let last = -1;
  try {
    await withoutQaEcho(() => renderMedia({
      composition,
      serveUrl: b.serveUrl,
      codec: 'h264',
      outputLocation: opts.file,
      inputProps: props,
      scale: opts.scale,
      crf: opts.crf,
      pixelFormat: opts.quality === 'master' ? 'yuv444p' : 'yuv420p',
      x264Preset: opts.quality === 'master' ? 'slow' : 'veryfast',
      imageFormat: opts.quality === 'master' ? 'png' : 'jpeg',
      jpegQuality: 85,
      colorSpace: 'bt709',
      audioCodec: 'aac',
      audioBitrate: '320k',
      concurrency: concurrency(),
      logLevel: 'error',
      ...br,
      onBrowserLog: (log) => {
        if (log.text.startsWith('[qa] ')) {
          const entry = JSON.parse(log.text.slice(5)) as QaLog;
          if (!qa.some((q) => q.frame === entry.frame)) qa.push(entry);
        }
        else if (log.type === 'error') browserErrors.push(log.text);
      },
      onProgress: ({progress}) => {
        const pct = Math.floor(progress * 100);
        if (pct !== last && pct % 10 === 0) {
          last = pct;
          opts.onProgress?.(pct);
        }
      },
    }));
  } finally {
    clearInterval(sampler);
  }
  const ms = Date.now() - t0;
  return {
    file: opts.file,
    frames: composition.durationInFrames,
    ms,
    fps: composition.durationInFrames / (ms / 1000),
    qa,
    browserErrors,
    peakMemMB: Math.round((peak - base) / 1024 ** 2),
  };
}

// Media verification: what the file actually contains, decoded by ffmpeg, compared with what the
// project asked for. Every check reads the output file; none trusts the renderer's word.
import {execFileSync, spawnSync} from 'node:child_process';
import {closeSync, openSync, readSync, statSync} from 'node:fs';
import {ffmpeg, ffprobe} from './env';

export interface Check {
  name: string;
  ok: boolean;
  level: 'error' | 'warning' | 'info';
  detail: string;
}

export interface Probe {
  width: number;
  height: number;
  fps: number;
  frames: number;
  durationSec: number;
  vcodec: string;
  pixFmt: string;
  colorSpace: string;
  profile: string;
  acodec?: string;
  sampleRate?: number;
  channels?: number;
  audioDurationSec?: number;
  bytes: number;
  bitrateKbps: number;
}

export function probe(file: string): Probe {
  const j = JSON.parse(
    execFileSync(ffprobe(), ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8', maxBuffer: 64 << 20}),
  );
  const v = j.streams.find((s: {codec_type: string}) => s.codec_type === 'video');
  const a = j.streams.find((s: {codec_type: string}) => s.codec_type === 'audio');
  const [n, d] = String(v.r_frame_rate).split('/').map(Number);
  return {
    width: v.width,
    height: v.height,
    fps: n / (d || 1),
    frames: Number(v.nb_read_frames ?? v.nb_frames),
    durationSec: Number(v.duration ?? j.format.duration),
    vcodec: v.codec_name,
    pixFmt: v.pix_fmt,
    colorSpace: v.color_space ?? 'unknown',
    profile: v.profile ?? '',
    acodec: a?.codec_name,
    sampleRate: a ? Number(a.sample_rate) : undefined,
    channels: a?.channels,
    audioDurationSec: a ? Number(a.duration ?? j.format.duration) : undefined,
    bytes: statSync(file).size,
    bitrateKbps: Math.round(Number(j.format.bit_rate) / 1000),
  };
}

/** Top-level MP4 boxes in order, to confirm moov precedes mdat (fast start for streaming). */
export function boxes(file: string): string[] {
  const fd = openSync(file, 'r');
  const out: string[] = [];
  const size = statSync(file).size;
  const head = Buffer.alloc(16);
  let pos = 0;
  try {
    while (pos < size && out.length < 32) {
      readSync(fd, head, 0, 16, pos);
      let len = head.readUInt32BE(0);
      out.push(head.toString('latin1', 4, 8));
      if (len === 1) len = Number(head.readBigUInt64BE(8));
      if (len < 8) break;
      pos += len;
    }
  } finally {
    closeSync(fd);
  }
  return out;
}

/** Per-frame luma range; a frame whose range is ~0 is a single flat colour (blank). */
export function blankFrames(file: string): number[] {
  const r = spawnSync(ffmpeg(), ['-v', 'error', '-i', file, '-vf', 'signalstats,metadata=print:file=-', '-an', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 256 << 20});
  const blank: number[] = [];
  let frame = -1;
  let ymin = 0;
  for (const line of r.stdout.split('\n')) {
    const f = line.match(/^frame:(\d+)/);
    if (f) frame = Number(f[1]);
    const mn = line.match(/lavfi\.signalstats\.YMIN=(\d+)/);
    if (mn) ymin = Number(mn[1]);
    const mx = line.match(/lavfi\.signalstats\.YMAX=(\d+)/);
    if (mx && Number(mx[1]) - ymin < 6) blank.push(frame);
  }
  return blank;
}

/** Runs of consecutive frames. */
export function runs(frames: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const f of frames) {
    const last = out[out.length - 1];
    if (last && f === last[1] + 1) last[1] = f;
    else out.push([f, f]);
  }
  return out;
}

export function freezes(file: string, minSec = 0.5): {start: number; end: number}[] {
  const r = spawnSync(ffmpeg(), ['-v', 'info', '-i', file, '-vf', `freezedetect=n=0.0005:d=${minSec}`, '-an', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 64 << 20});
  const out: {start: number; end: number}[] = [];
  let start = 0;
  for (const line of r.stderr.split('\n')) {
    const s = line.match(/freeze_start: ([\d.]+)/);
    if (s) start = Number(s[1]);
    const e = line.match(/freeze_end: ([\d.]+)/);
    if (e) out.push({start, end: Number(e[1])});
  }
  return out;
}

export function loudness(file: string): {integrated: number; truePeak: number} | null {
  const r = spawnSync(ffmpeg(), ['-v', 'info', '-i', file, '-af', 'ebur128=peak=true', '-vn', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 64 << 20});
  const i = r.stderr.match(/I:\s+(-?[\d.]+|-inf) LUFS/g);
  const p = r.stderr.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/g);
  if (!i) return null;
  const last = (arr: string[]) => Number(arr[arr.length - 1].match(/(-?[\d.]+|-inf)/)![1].replace('-inf', '-Infinity'));
  return {integrated: last(i), truePeak: p ? last(p) : NaN};
}

/** Full decode: any error means a player could choke too. */
export function decodeErrors(file: string): string {
  const r = spawnSync(ffmpeg(), ['-v', 'error', '-i', file, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 64 << 20});
  return (r.stderr || '').trim();
}

/** RGB of one pixel at a frame, decoded as a player would (bt709, limited range → full). */
export function pixel(file: string, frame: number, x: number, y: number): [number, number, number] {
  // Select by frame index: timestamp seeks can fall past the last frame.
  const buf = execFileSync(ffmpeg(), [
    '-v', 'error', '-i', file,
    '-vf', `select=eq(n\\,${frame}),crop=3:3:${Math.round(x) - 1}:${Math.round(y) - 1},scale=1:1:flags=area,format=rgb24`,
    '-frames:v', '1', '-f', 'rawvideo', '-',
  ]);
  if (buf.length < 3) throw new Error(`No pixel decoded at frame ${frame}.`);
  return [buf[0], buf[1], buf[2]];
}

export const hexRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export const rgbDistance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

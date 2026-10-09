// Delivery encoding. The bitrate is planned from the duration and the size target rather than
// guessed: a quality ceiling (bits per pixel per frame) for short pieces, a size ceiling for long
// ones. The result is verified afterwards; if it still lands over target, it is re-encoded in two
// passes at a lower rate.
import {execFileSync} from 'node:child_process';
import {rmSync, statSync} from 'node:fs';
import path from 'node:path';
import {ffmpeg} from './env';

export interface Plan {
  durationSec: number;
  targetBytes: number;
  /** What the size target allows for video after audio and a container margin. */
  ceilingKbps: number;
  /** What the picture needs: width × height × fps × bits per pixel. */
  qualityKbps: number;
  videoKbps: number;
  audioKbps: number;
}

/** Megabytes are decimal (1 MB = 1,000,000 bytes): the stricter reading of a platform limit. */
export function plan(o: {durationSec: number; width: number; height: number; fps: number; targetMB: number; audioKbps: number; bitsPerPixel: number; hasAudio: boolean}): Plan {
  const targetBytes = o.targetMB * 1_000_000;
  const usable = targetBytes * 8 * 0.95; // container + VBV margin
  const audioKbps = o.hasAudio ? o.audioKbps : 0;
  const ceilingKbps = usable / o.durationSec / 1000 - audioKbps;
  const qualityKbps = (o.width * o.height * o.fps * o.bitsPerPixel) / 1000;
  const videoKbps = Math.floor(Math.max(200, Math.min(ceilingKbps, qualityKbps)));
  return {durationSec: o.durationSec, targetBytes, ceilingKbps: Math.floor(ceilingKbps), qualityKbps: Math.floor(qualityKbps), videoKbps, audioKbps};
}

const COLOR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];

export function encodeDelivery(master: string, out: string, p: Plan, fps: number, hasAudio: boolean): {file: string; bytes: number; passes: 1 | 2} {
  const v = p.videoKbps;
  const common = ['-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(fps), ...COLOR, '-movflags', '+faststart'];
  const audio = hasAudio ? ['-c:a', 'aac', '-b:a', `${p.audioKbps}k`, '-ar', '48000'] : ['-an'];
  // One pass: constant quality, capped so the peak never exceeds the planned rate.
  execFileSync(ffmpeg(), ['-v', 'error', '-y', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-maxrate', `${v}k`, '-bufsize', `${v * 2}k`, ...common, ...audio, out]);
  let bytes = statSync(out).size;
  if (bytes <= p.targetBytes) return {file: out, bytes, passes: 1};
  // Over target (rare): two-pass average bitrate at 90% of plan.
  const rate = Math.floor(v * 0.9);
  const log = path.join(path.dirname(out), 'x264-2pass');
  execFileSync(ffmpeg(), ['-v', 'error', '-y', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${rate}k`, '-pass', '1', '-passlogfile', log, ...common, '-an', '-f', 'mp4', '/dev/null']);
  execFileSync(ffmpeg(), ['-v', 'error', '-y', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${rate}k`, '-maxrate', `${v}k`, '-bufsize', `${v * 2}k`, '-pass', '2', '-passlogfile', log, ...common, ...audio, out]);
  for (const ext of ['-0.log', '-0.log.mbtree']) rmSync(log + ext, {force: true});
  bytes = statSync(out).size;
  return {file: out, bytes, passes: 2};
}

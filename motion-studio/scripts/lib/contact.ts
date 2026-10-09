// Contact sheets from the rendered file (not from stills), labelled with frame and timecode, so a
// reviewer sees exactly what was encoded.
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {ffmpeg} from './env';

const FONT = ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Menlo.ttc', 'C:/Windows/Fonts/consola.ttf'].find((f) => existsSync(f));

export interface SheetSpec {
  frames: number[];
  cols: number;
  /** Width of each tile in px. */
  tile: number;
}

export function contactSheet(video: string, out: string, fps: number, spec: SheetSpec) {
  const frames = [...new Set(spec.frames)].sort((a, b) => a - b);
  const rows = Math.ceil(frames.length / spec.cols);
  const select = frames.map((f) => `eq(n\\,${f})`).join('+');
  const label = FONT
    ? `,drawtext=fontfile=${FONT}:text='f%{eif\\:t*${fps}\\:d}  %{pts\\:hms}':x=8:y=h-th-8:fontsize=${Math.max(12, Math.round(spec.tile / 14))}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4`
    : '';
  execFileSync(ffmpeg(), [
    '-v', 'error', '-y', '-i', video,
    '-vf', `select='${select}',scale=${spec.tile}:-2${label},pad=iw+4:ih+4:2:2:0x555555,tile=${spec.cols}x${rows}`,
    '-frames:v', '1', '-fps_mode', 'passthrough', out,
  ]);
  return {file: out, frames};
}

/** First, middle and last frame of every scene. */
export function sceneFrames(scenes: {from: number; to: number}[]) {
  return scenes.flatMap((s) => [s.from + 2, Math.round((s.from + s.to) / 2), s.to - 3]);
}

/** Frames straddling each scene boundary, for judging transitions. */
export function transitionFrames(scenes: {from: number; to: number}[], total: number) {
  return scenes.slice(1).flatMap((s) => [-8, -3, 0, 3, 8].map((o) => Math.min(total - 1, Math.max(0, s.from + o))));
}

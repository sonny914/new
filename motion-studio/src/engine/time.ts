// Time expressions. A config can say when something happens in the unit that reads best:
//   48          frame 48
//   "1.6s"      1.6 seconds
//   "12f"       12 frames
//   "s3"        start of scene s3          "s3.end"     end of scene s3
//   "s3+8"      8 frames into s3           "s3+0.25s"   a quarter second into s3
//   "end-1s"    one second before the end  "start"      frame 0
// Everything resolves to an integer frame, so timing stays frame-accurate.

export type TimeExpr = number | string;

export interface SceneSpan {
  start: number;
  end: number;
}

export interface TimeContext {
  fps: number;
  /** Total length in frames. */
  duration: number;
  scenes: Record<string, SceneSpan>;
}

export class TimeError extends Error {}

const ID = /^[a-z][a-z0-9-]*$/;

export function isSceneId(id: string): boolean {
  return ID.test(id) && id !== 'start' && id !== 'end';
}

/** Parse "1.5s" / "12f" / "12" offsets into frames (unrounded). */
function offsetFrames(raw: string, fps: number, expr: string): number {
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*(s|f)?$/);
  if (!m) throw new TimeError(`Cannot read the offset "${raw}" in time "${expr}". Use 12, 12f or 0.5s.`);
  const n = Number(m[1]);
  return m[2] === 's' ? n * fps : n;
}

export function resolveTime(expr: TimeExpr, ctx: TimeContext): number {
  if (typeof expr === 'number') {
    if (!Number.isFinite(expr)) throw new TimeError(`Time ${expr} is not a finite number of frames.`);
    return Math.round(expr);
  }
  const s = expr.trim();
  if (!s) throw new TimeError('Empty time expression.');
  // Pure offset from 0: "48", "48f", "1.6s"
  if (/^\d/.test(s)) return Math.round(offsetFrames(s, ctx.fps, expr));

  // A reference is "start", "end", a scene id, or "<scene>.end", optionally followed by +/- an
  // offset. Scene ids may contain hyphens, so the split is chosen where the left side is a known
  // reference: "intro-a+4" is scene intro-a plus 4, "s3-8" is scene s3 minus 8.
  const known = (ref: string): number | undefined => {
    if (ref === 'start') return 0;
    if (ref === 'end') return ctx.duration;
    const dot = ref.endsWith('.end');
    const scene = ctx.scenes[dot ? ref.slice(0, -4) : ref];
    if (!scene) return undefined;
    return dot ? scene.end : scene.start;
  };
  const whole = known(s);
  if (whole !== undefined) return whole;
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== '+' && s[i] !== '-') continue;
    const base = known(s.slice(0, i).trim());
    const rest = s.slice(i + 1).trim();
    if (base === undefined || !/^\d/.test(rest)) continue;
    const off = offsetFrames(rest, ctx.fps, expr);
    return Math.round(s[i] === '+' ? base + off : base - off);
  }
  const ref = s.match(/^[a-z][a-z0-9.-]*/)?.[0] ?? s;
  if (!/^[a-z]/.test(s)) throw new TimeError(`Cannot read time "${expr}". Examples: 48, "1.6s", "s3+8", "s3.end-0.5s", "end".`);
  const names = Object.keys(ctx.scenes);
  throw new TimeError(`Time "${expr}" does not start with a known scene, "start" or "end"${names.length ? ` (scenes: ${names.join(', ')})` : ''}; read "${ref}".`);
}

export const seconds = (frames: number, fps: number) => frames / fps;

/** Format a frame as m:ss.ff for storyboards and reports. */
export function timecode(frame: number, fps: number): string {
  const total = frame / fps;
  const m = Math.floor(total / 60);
  const sec = Math.floor(total % 60);
  const ff = frame - Math.floor(total) * fps;
  return `${m}:${String(sec).padStart(2, '0')}.${String(Math.round(ff)).padStart(2, '0')}`;
}

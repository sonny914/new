// Validate and resolve a project file. Runs identically in Node (CLI validate/storyboard) and in
// the browser (render), and reports every problem at once with a path to where it is.
import type {ZodError} from 'zod';
import {getTheme, THEMES} from '../../themes';
import {resolveFormat} from '../formats';
import {isSceneId, resolveTime, TimeError, type TimeContext} from '../time';
import type {Issue, PresetDef, Prepared, ResolvedLayer} from '../types';
import {issuePath, ProjectZ, type Project} from './schema';

export class ProjectError extends Error {
  constructor(public issues: Issue[]) {
    super(formatIssues(issues));
  }
}

export function formatIssues(issues: Issue[]): string {
  if (!issues.length) return 'No issues.';
  return issues.map((i) => `${i.level === 'error' ? '✗' : '!'} ${i.where}: ${i.message}`).join('\n');
}

function zodIssues(err: ZodError, raw: unknown, prefix = ''): Issue[] {
  return err.issues.map((i) => ({level: 'error' as const, where: prefix + issuePath(i.path, raw), message: i.message}));
}

function closest(name: string, options: string[]): string | undefined {
  const score = (a: string, b: string) => {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    const dp = Array.from({length: x.length + 1}, (_, i) => [i, ...Array(y.length).fill(0)]);
    for (let j = 1; j <= y.length; j++) dp[0][j] = j;
    for (let i = 1; i <= x.length; i++)
      for (let j = 1; j <= y.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    return dp[x.length][y.length];
  };
  let best: string | undefined;
  let bestScore = Infinity;
  for (const o of options) {
    const s = score(name, o);
    if (s < bestScore) {
      bestScore = s;
      best = o;
    }
  }
  return bestScore <= Math.max(3, name.length / 3) ? best : undefined;
}

export interface PrepareOptions {
  presets: Record<string, PresetDef>;
  /** Node only: check a project-relative asset path exists. */
  fileExists?: (relPath: string) => boolean;
}

/** Validate + resolve. Never throws for content problems: they come back as issues. */
export function prepareProject(raw: unknown, opts: PrepareOptions): Prepared | {issues: Issue[]; project?: undefined} {
  const parsed = ProjectZ.safeParse(raw);
  if (!parsed.success) return {issues: zodIssues(parsed.error, raw)};
  const project: Project = parsed.data;
  const issues: Issue[] = [];
  const err = (where: string, message: string) => issues.push({level: 'error', where, message});
  const warn = (where: string, message: string) => issues.push({level: 'warning', where, message});

  let theme = THEMES['quiet-bands'];
  try {
    theme = getTheme(project.theme);
  } catch (e) {
    err('theme', (e as Error).message);
  }
  let format = resolveFormat('story');
  try {
    format = resolveFormat(project.format as Parameters<typeof resolveFormat>[0]);
  } catch (e) {
    err('format', (e as Error).message);
  }
  const fps = project.fps;
  const time: TimeContext = {fps, duration: 0, scenes: {}};

  // Duration may not reference scenes.
  let duration = 0;
  try {
    duration = resolveTime(project.duration, time);
    if (duration <= 0) err('duration', 'Duration must be longer than zero.');
  } catch (e) {
    err('duration', (e as Error).message);
  }
  time.duration = duration;
  if (fps !== 30 && fps !== 60) warn('fps', `${fps} fps: theme motion durations are authored at 30 fps and are scaled, but check pacing by eye.`);

  // Scenes resolve in order; each may refer to earlier scenes.
  const scenes: Prepared['scenes'] = [];
  const seen = new Set<string>();
  project.scenes.forEach((s, i) => {
    const where = `scenes[${i} "${s.id}"]`;
    if (!isSceneId(s.id)) err(where, `"${s.id}" is reserved; scene ids cannot be "start" or "end".`);
    if (seen.has(s.id)) err(where, `Duplicate scene id "${s.id}".`);
    seen.add(s.id);
    try {
      const from = resolveTime(s.start, time);
      const to = resolveTime(s.end, time);
      if (to <= from) err(where, `Scene ends (${to}) at or before it starts (${from}).`);
      if (from < 0 || to > duration) err(where, `Scene runs ${from}–${to}, outside the video (0–${duration}).`);
      time.scenes[s.id] = {start: from, end: to};
      scenes.push({...s, from, to});
    } catch (e) {
      err(where, (e as Error).message);
    }
  });
  for (let i = 1; i < scenes.length; i++) {
    const a = scenes[i - 1];
    const b = scenes[i];
    if (b.from > a.to) warn(`scenes[${i} "${b.id}"]`, `Gap of ${b.from - a.to} frames after "${a.id}"; the storyboard has no scene there.`);
    if (b.from < a.to) warn(`scenes[${i} "${b.id}"]`, `Overlaps "${a.id}" by ${a.to - b.from} frames.`);
  }
  if (scenes.length && scenes[0].from > 0) warn('scenes[0]', `First scene starts at frame ${scenes[0].from}, not 0.`);
  if (scenes.length && scenes[scenes.length - 1].to < duration) warn('scenes', `Last scene ends at ${scenes[scenes.length - 1].to}; the video runs to ${duration}.`);

  const t = (expr: Parameters<typeof resolveTime>[0], where: string): number => {
    try {
      return resolveTime(expr, time);
    } catch (e) {
      err(where, (e as Error).message);
      return 0;
    }
  };

  // Paths: resolve times now, positions at layout (they may use anchors).
  const paths: Prepared['paths'] = {};
  for (const [pid, p] of Object.entries(project.paths)) {
    const keys = p.keys.map((k, i) => ({...k, at: t(k.at, `paths.${pid}.keys[${i}].at`)}));
    for (let i = 1; i < keys.length; i++)
      if (keys[i].at < keys[i - 1].at) err(`paths.${pid}.keys[${i}]`, `Keys must be in time order (${keys[i].at} comes after ${keys[i - 1].at}).`);
    paths[pid] = {description: p.description, keys};
  }

  // Groups: parents exist, no cycles, camera keys resolved.
  const groups: Prepared['groups'] = {};
  for (const [gid, g] of Object.entries(project.groups)) {
    if (g.parent && !project.groups[g.parent]) err(`groups.${gid}.parent`, `Unknown parent group "${g.parent}".`);
    const camera = g.camera?.map((k, i) => ({
      frame: t(k.at, `groups.${gid}.camera[${i}].at`),
      scale: k.scale ?? 1,
      x: k.x ?? 0,
      y: k.y ?? 0,
      rotate: k.rotate ?? 0,
      ease: k.ease,
    }));
    // Missing channels inherit the previous key's value, so a key can change only what it names.
    if (camera && g.camera)
      for (let i = 1; i < camera.length; i++) {
        const src = g.camera[i];
        if (src.scale === undefined) camera[i].scale = camera[i - 1].scale;
        if (src.x === undefined) camera[i].x = camera[i - 1].x;
        if (src.y === undefined) camera[i].y = camera[i - 1].y;
        if (src.rotate === undefined) camera[i].rotate = camera[i - 1].rotate;
      }
    const timeRemap = g.time
      ? {freezeAt: t(g.time.freezeAt, `groups.${gid}.time.freezeAt`), resumeAt: g.time.resumeAt !== undefined ? t(g.time.resumeAt, `groups.${gid}.time.resumeAt`) : undefined}
      : undefined;
    if (timeRemap?.resumeAt !== undefined && timeRemap.resumeAt <= timeRemap.freezeAt) err(`groups.${gid}.time`, 'resumeAt must come after freezeAt.');
    groups[gid] = {parent: g.parent, camera, origin: g.origin, time: timeRemap};
  }
  for (const gid of Object.keys(groups)) {
    const chain = new Set<string>();
    let cur: string | undefined = gid;
    while (cur) {
      if (chain.has(cur)) {
        err(`groups.${gid}`, `Group parents form a loop: ${[...chain, cur].join(' → ')}.`);
        break;
      }
      chain.add(cur);
      cur = groups[cur]?.parent;
    }
  }

  // Layers: unique ids, known presets, params valid against the preset's schema.
  const layers: ResolvedLayer[] = [];
  const layerIds = new Set<string>();
  project.layers.forEach((l, i) => {
    const where = `layers[${i} "${l.id}"]`;
    if (layerIds.has(l.id)) err(where, `Duplicate layer id "${l.id}".`);
    layerIds.add(l.id);
    const def = opts.presets[l.preset];
    if (!def) {
      const hint = closest(l.preset, Object.keys(opts.presets));
      err(`${where}.preset`, `Unknown preset "${l.preset}".${hint ? ` Did you mean "${hint}"?` : ''} Presets: ${Object.keys(opts.presets).join(', ')}.`);
      return;
    }
    if (def.requiresLogo && !theme.logo) err(`${where}.preset`, `${def.id} draws the brand logo, but theme "${theme.id}" has no logo.`);
    const p = def.schema.safeParse(l.params);
    if (!p.success) {
      issues.push(...zodIssues(p.error, l.params, `${where}.params.`));
      return;
    }
    const from = t(l.from, `${where}.from`);
    const to = t(l.to, `${where}.to`);
    if (to <= from) err(where, `Layer ends (${to}) at or before it starts (${from}).`);
    if (from < 0 || to > duration) warn(where, `Layer runs ${from}–${to}, beyond the video (0–${duration}); it is clipped.`);
    if (l.group && !groups[l.group]) err(`${where}.group`, `Unknown group "${l.group}". Groups: ${Object.keys(groups).join(', ') || '(none)'}.`);
    for (const m of [l.reveal, l.conceal]) {
      if (m && typeof m.origin === 'string' && !paths[m.origin]) err(`${where}.${m === l.reveal ? 'reveal' : 'conceal'}.origin`, `Unknown path "${m.origin}".`);
    }
    // References the preset declares: paths and other layers by id.
    for (const at of [...(def.refs?.paths ?? []), ...(def.refs?.renderPaths ?? [])]) {
      const value = getAt(p.data, at);
      if (typeof value === 'string' && !paths[value]) err(`${where}.params.${at}`, `Unknown path "${value}". Paths: ${Object.keys(paths).join(', ') || '(none)'}.`);
    }
    for (const at of def.refs?.layers ?? []) {
      const value = getAt(p.data, at);
      if (typeof value === 'string' && !project.layers.some((o) => o.id === value)) err(`${where}.params.${at}`, `Unknown layer "${value}".`);
    }
    layers.push({...l, from, to, params: p.data as Record<string, unknown>});
  });

  // Audio: tracks point at real files or defined cue sheets.
  project.audio.tracks.forEach((tr, i) => {
    const where = `audio.tracks[${i} "${tr.id}"]`;
    if (tr.synth && !project.audio.synth[tr.synth]) err(`${where}.synth`, `Unknown cue sheet "${tr.synth}".`);
    if (tr.src && opts.fileExists && !opts.fileExists(tr.src)) err(`${where}.src`, `Missing audio file "${tr.src}" (paths are relative to the project folder).`);
    t(tr.from, `${where}.from`);
    t(tr.to, `${where}.to`);
  });
  for (const [sid, sheet] of Object.entries(project.audio.synth)) {
    sheet.cues.forEach((c, i) => {
      t(c.at, `audio.synth.${sid}.cues[${i}].at`);
      if (c.until !== undefined) t(c.until, `audio.synth.${sid}.cues[${i}].until`);
      if (c.sync && !layerIds.has(c.sync.layer)) err(`audio.synth.${sid}.cues[${i}].sync.layer`, `Unknown layer "${c.sync.layer}".`);
    });
  }
  project.qa.allowBlank.forEach((r, i) => {
    t(r.from, `qa.allowBlank[${i}].from`);
    t(r.to, `qa.allowBlank[${i}].to`);
  });

  return {project, theme, format, fps, duration, time, scenes, layers, paths, groups, issues};
}

/** Throwing variant for code paths that cannot continue on errors. */
export function prepareOrThrow(raw: unknown, opts: PrepareOptions): Prepared {
  const r = prepareProject(raw, opts);
  const errors = r.issues.filter((i) => i.level === 'error');
  if (!('format' in r) || errors.length) throw new ProjectError(r.issues);
  return r as Prepared;
}

/** Read a dotted path ("clear.path") from a params object. */
export function getAt(obj: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function walk(node: unknown, visit: (key: string, value: unknown, at: string) => void, at = ''): void {
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, visit, `${at}[${i}]`));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) {
      const here = at ? `${at}.${k}` : k;
      visit(k, v, here);
      walk(v, visit, here);
    }
}

export {TimeError};

// Layout solver. Runs once per project, before any frame is drawn: measures type, resolves
// positions and anchors, and orders the work so a layer or path can pin itself to geometry
// another layer published ("@viewpoint.end"). Deterministic for a given font, so every render
// tab computes the same layout.
import {getAt, walk} from './config/prepare';
import type {PathKey} from './keyframes';
import {anchorDeps, resolvePos, type Anchors, type PosExpr} from './position';
import {resolveTime, type TimeExpr} from './time';
import type {Issue, LayoutContext, Measurer, PresetDef, Prepared, ResolvedPath} from './types';

export interface LayoutMap {
  anchors: Anchors;
  data: Record<string, unknown>;
  paths: Record<string, ResolvedPath>;
  issues: Issue[];
}

type Node = {kind: 'layer'; id: string; deps: Set<string>} | {kind: 'path'; id: string; deps: Set<string>};

function posDeps(...exprs: unknown[]): string[] {
  return exprs.flatMap((e) => anchorDeps(e));
}

export function layoutProject(prep: Prepared, presets: Record<string, PresetDef>, measure: Measurer): LayoutMap {
  const anchors: Anchors = {};
  const data: Record<string, unknown> = {};
  const paths: Record<string, ResolvedPath> = {};
  const issues: Issue[] = [];
  const layerIds = new Set(prep.layers.map((l) => l.id));

  const nodes = new Map<string, Node>();
  for (const [pid, p] of Object.entries(prep.paths)) {
    const deps = new Set<string>();
    for (const k of p.keys) for (const d of posDeps(k.x, k.y, k.via?.x, k.via?.y)) deps.add(`layer:${d}`);
    nodes.set(`path:${pid}`, {kind: 'path', id: pid, deps});
  }
  for (const l of prep.layers) {
    const deps = new Set<string>();
    walk(l.params, (_key, value) => {
      if (typeof value === 'string') for (const d of anchorDeps(value)) deps.add(`layer:${d}`);
    });
    const def = presets[l.preset];
    for (const at of def.refs?.paths ?? []) {
      const v = getAt(l.params, at);
      if (typeof v === 'string' && prep.paths[v]) deps.add(`path:${v}`);
    }
    for (const at of def.refs?.layers ?? []) {
      const v = getAt(l.params, at);
      if (typeof v === 'string' && layerIds.has(v)) deps.add(`layer:${v}`);
    }
    for (const m of [l.reveal, l.conceal]) {
      if (!m?.origin) continue;
      if (typeof m.origin === 'string') deps.add(`path:${m.origin}`);
      else for (const d of posDeps(m.origin.x, m.origin.y)) deps.add(`layer:${d}`);
    }
    deps.delete(`layer:${l.id}`);
    nodes.set(`layer:${l.id}`, {kind: 'layer', id: l.id, deps});
  }

  const done = new Set<string>();
  const failed = new Set<string>();
  const pos = {format: prep.format, anchors};
  const ctxFor = (): LayoutContext => ({
    theme: prep.theme,
    format: prep.format,
    fps: prep.fps,
    time: prep.time,
    unit: prep.format.width / 1080,
    anchors,
    measure,
    x: (e: PosExpr) => resolvePos(e, 'x', pos),
    y: (e: PosExpr) => resolvePos(e, 'y', pos),
    t: (e: TimeExpr) => resolveTime(e, prep.time),
    path: (id: string) => {
      const p = paths[id];
      if (!p) throw new Error(`Path "${id}" is not resolved yet (is it defined?).`);
      return p;
    },
    layoutOf: <T,>(id: string) => {
      if (!(id in data)) throw new Error(`Layer "${id}" has no layout yet (is it defined, and does it publish layout?).`);
      return data[id] as T;
    },
  });

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const [key, node] of nodes) {
      if (done.has(key) || failed.has(key)) continue;
      if ([...node.deps].some((d) => failed.has(d))) {
        failed.add(key);
        progressed = true;
        continue;
      }
      if (![...node.deps].every((d) => done.has(d) || !nodes.has(d))) continue;
      const missing = [...node.deps].filter((d) => !nodes.has(d));
      if (missing.length) {
        issues.push({level: 'error', where: key, message: `Refers to ${missing.join(', ')}, which does not exist.`});
        failed.add(key);
        progressed = true;
        continue;
      }
      try {
        const ctx = ctxFor();
        if (node.kind === 'path') {
          const p = prep.paths[node.id];
          const keys: PathKey[] = p.keys.map((k) => ({
            frame: k.at,
            x: ctx.x(k.x),
            y: ctx.y(k.y),
            via: k.via ? {x: ctx.x(k.via.x), y: ctx.y(k.via.y)} : undefined,
            ease: k.ease,
          }));
          paths[node.id] = {id: node.id, keys};
        } else {
          const layer = prep.layers.find((l) => l.id === node.id)!;
          const def = presets[layer.preset];
          const res = def.layout ? def.layout(layer.params as never, ctx, layer) : {};
          data[layer.id] = res.data ?? null;
          for (const [name, pt] of Object.entries(res.anchors ?? {})) anchors[`${layer.id}.${name}`] = pt;
        }
        done.add(key);
      } catch (e) {
        issues.push({level: 'error', where: key, message: (e as Error).message});
        failed.add(key);
      }
      progressed = true;
    }
  }
  const stuck = [...nodes.keys()].filter((k) => !done.has(k) && !failed.has(k));
  if (stuck.length)
    issues.push({
      level: 'error',
      where: 'layout',
      message: `Circular references between ${stuck.join(', ')}: each waits for another's anchors.`,
    });
  return {anchors, data, paths, issues};
}

/**
 * A measurer for Node (validation, storyboards, tests): approximate advances from the width axis.
 * It is never used to draw. The browser measures real glyphs.
 */
export const approximateMeasure: Measurer = (text, style) => {
  const k = 0.56 * (style.width / 100) * (style.weight >= 700 ? 1.06 : 1);
  let x = 0;
  const glyphs = [...text].map((char) => {
    const advance = style.size * (char === ' ' ? 0.26 : char === '.' ? 0.28 : k) + style.tracking * style.size;
    const g = {char, x, advance};
    x += advance;
    return g;
  });
  const last = glyphs[glyphs.length - 1];
  return {width: x, glyphs, ascent: style.size * 0.94, descent: style.size * 0.26, capHeight: style.size * 0.71, inkLeft: 0, inkRight: last ? last.x + last.advance : 0};
};

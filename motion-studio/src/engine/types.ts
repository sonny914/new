// Shared runtime types: what a preset declares, what it receives at layout time and at render time.
import type React from 'react';
import type {z} from 'zod';
import type {Theme} from '../themes/types';
import type {Format} from './formats';
import type {PathKey, Point} from './keyframes';
import type {Anchors, PosExpr} from './position';
import type {TimeContext, TimeExpr} from './time';
import type {Layer, Mask, Project, Scene} from './config/schema';

export interface TextStyle {
  family: string;
  size: number;
  weight: number;
  /** font-stretch %, i.e. the wdth axis. */
  width: number;
  /** em */
  tracking: number;
}

export interface GlyphMetric {
  char: string;
  /** Left edge of the glyph's advance box, relative to the text origin, kerning included. */
  x: number;
  advance: number;
}

export interface TextMetrics {
  width: number;
  glyphs: GlyphMetric[];
  /** Font ascent/descent and cap height in px for this style. */
  ascent: number;
  descent: number;
  capHeight: number;
  /** Where the first glyph's ink starts, relative to the text origin (its left side bearing). */
  inkLeft: number;
  /** Where the last glyph's ink ends, relative to the text origin. */
  inkRight: number;
}

export type Measurer = (text: string, style: TextStyle) => TextMetrics;

export interface ResolvedPath {
  id: string;
  keys: PathKey[];
}

export interface LayoutContext {
  theme: Theme;
  format: Format;
  fps: number;
  time: TimeContext;
  /** Canvas width / 1080: theme type sizes are authored at 1080 wide. */
  unit: number;
  anchors: Anchors;
  measure: Measurer;
  x: (expr: PosExpr) => number;
  y: (expr: PosExpr) => number;
  t: (expr: TimeExpr) => number;
  path: (id: string) => ResolvedPath;
  /** Another layer's layout data (it must be laid out first). */
  layoutOf: <T = unknown>(layerId: string) => T;
}

export interface LayoutResult<D = unknown> {
  anchors?: Record<string, Point>;
  data?: D;
}

export interface ResolvedLayer extends Omit<Layer, 'from' | 'to'> {
  from: number;
  to: number;
  /** Params after the preset's schema applied defaults. */
  params: Record<string, unknown>;
}

export interface Runtime<D = unknown> {
  /** Frame on the layer's clock: absolute frame after its group's time remap. Ambient motion uses this. */
  frame: number;
  /** Absolute frame, never remapped. Path-driven events use this so they stay locked to their path. */
  absolute: number;
  fps: number;
  theme: Theme;
  format: Format;
  layer: ResolvedLayer;
  layout: D;
  t: (expr: TimeExpr) => number;
  path: (id: string) => ResolvedPath;
  /** Mark a QA-visible element: text and marks report bounds at rest. */
  qa: (kind: 'text' | 'mark', rest: boolean) => Record<string, string>;
}

export type PresetCategory = 'typography' | 'geometry' | 'transition' | 'camera' | 'brand';

export interface PresetDoc {
  /** Intended visual effect, in one or two sentences. */
  effect: string;
  timing: string;
  easing: string;
  /** Content the preset is built for. */
  supports: string[];
  performance: string;
  /** Catalog names this preset fulfils (e.g. CharacterReveal is a KineticHeadline behaviour). */
  covers: string[];
  limitations: string[];
}

export interface PresetDef<S extends z.ZodTypeAny = z.ZodTypeAny, D = unknown> {
  id: string;
  category: PresetCategory;
  summary: string;
  doc: PresetDoc;
  schema: S;
  /** Anchors the preset publishes as "@<layerId>.<name>". */
  anchors?: string[];
  /**
   * Params that name other things, as dotted paths into the params. `paths` are needed at layout
   * (ordering), `renderPaths` only when drawing (so a path may pin itself to this layer), `layers`
   * are other layers whose layout this one reads.
   */
  refs?: {paths?: string[]; renderPaths?: string[]; layers?: string[]};
  /** Brand presets need a theme with a logo. */
  requiresLogo?: boolean;
  layout?: (params: z.output<S>, ctx: LayoutContext, layer: ResolvedLayer) => LayoutResult<D>;
  /** Frames at which the preset does something audible (for synced sound cues). */
  events?: (params: z.output<S>, ctx: Pick<LayoutContext, 't' | 'fps' | 'theme'>, layer: ResolvedLayer) => number[];
  component: React.FC<{params: z.output<S>; rt: Runtime<D>}>;
  /** A small, self-contained example used by the preset gallery and tests. */
  example: {params: Record<string, unknown>; from?: TimeExpr; to?: TimeExpr; duration: TimeExpr; note: string};
}

export interface Issue {
  level: 'error' | 'warning';
  where: string;
  message: string;
}

export interface Prepared {
  project: Project;
  theme: Theme;
  format: Format;
  fps: number;
  duration: number;
  time: TimeContext;
  scenes: (Scene & {from: number; to: number})[];
  layers: ResolvedLayer[];
  paths: Record<string, {description: string; keys: {at: number; x: PosExpr; y: PosExpr; via?: {x: PosExpr; y: PosExpr}; ease?: Mask['ease']}[]}>;
  groups: Record<string, {parent?: string; camera?: {frame: number; scale: number; x: number; y: number; rotate: number; ease?: Mask['ease']}[]; origin?: {x: PosExpr; y: PosExpr}; time?: {freezeAt: number; resumeAt?: number}}>;
  issues: Issue[];
}

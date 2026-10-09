// The token contract every theme fills. Presets read colour, type and motion only through these
// names, so swapping a theme restyles a video without touching a preset or a config's layers.
import type {BrandVector} from './quiet-bands/brand.generated';

export type Bezier = [number, number, number, number];

export interface ThemeColors {
  /** Canvas ground. */
  ground: string;
  /** Primary ink: type, lines, marks. */
  ink: string;
  /** Secondary ink for supporting structure (rules, quiet labels). */
  inkDim: string;
  /** Hairline structure that should barely register. */
  rule: string;
  /** The one live accent. A theme has exactly one. */
  accent: string;
}

export interface ThemeFont {
  /** CSS family name the browser registers. */
  family: string;
  /** CSS fallbacks appended after the family. */
  fallback: string;
  /** Variable axes the font supports, as CSS ranges. */
  weightRange: [number, number];
  widthRange: [number, number];
}

export interface ThemeMotion {
  /** Named curves. `out` enters, `in` leaves, `inOut` transforms. */
  easing: Record<'out' | 'in' | 'inOut' | 'linear', Bezier>;
  /** Durations in frames at 30 fps; presets scale them by fps/30. */
  duration: Record<'micro' | 'short' | 'base' | 'long' | 'hold', number>;
  /** Stagger between siblings, frames at 30 fps. */
  stagger: Record<'tight' | 'base' | 'loose', number>;
  /** Minimum seconds a line of text must rest, plus seconds per word, before it changes. */
  reading: {minSeconds: number; perWord: number};
}

export interface Theme {
  id: string;
  label: string;
  /** Where the values came from. Brand themes must cite verified files. */
  provenance: string;
  /** Whether this theme represents a real brand (true) or is a neutral working palette. */
  brand: boolean;
  color: ThemeColors;
  font: {display: ThemeFont; text: ThemeFont};
  weight: Record<'light' | 'regular' | 'medium' | 'bold' | 'heavy' | 'black', number>;
  /** Width axis stops (font-stretch %). */
  width: Record<'condensed' | 'normal' | 'expanded', number>;
  /** Type sizes in px at a 1080 px wide canvas; presets scale by canvas width / 1080. */
  type: Record<'micro' | 'caption' | 'body' | 'title' | 'subhead', number>;
  /** Tracking in em. */
  tracking: Record<'tight' | 'normal' | 'label', number>;
  /** 8 px spacing scale. */
  space: number[];
  motion: ThemeMotion;
  /** Brand vectors, when the theme is a brand. */
  logo?: {mark: BrandVector; wordmark: BrandVector; lockup: BrandVector};
}

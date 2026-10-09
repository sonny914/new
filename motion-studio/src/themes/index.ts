import type {Theme} from './types';
import {quietBands} from './quiet-bands/tokens';
import {studioPaper} from './studio-paper/tokens';

export const THEMES: Record<string, Theme> = {
  [quietBands.id]: quietBands,
  [studioPaper.id]: studioPaper,
};

export function getTheme(id: string): Theme {
  const theme = THEMES[id];
  if (!theme) throw new Error(`Unknown theme "${id}". Known: ${Object.keys(THEMES).join(', ')}`);
  return theme;
}

/** Resolve a colour that may be a token name (`ink`, `accent`, ...) or a literal CSS colour. */
export function color(theme: Theme, value: string): string {
  return (theme.color as unknown as Record<string, string>)[value] ?? value;
}

export type {Theme} from './types';

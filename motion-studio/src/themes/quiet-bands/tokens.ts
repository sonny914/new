// Quiet Bands. Every value here is copied from a verified source in this repository:
//  - colours and the one-accent rule: .agents/skills/qb-identity/SKILL.md, assets/bulb/entry.css, assets/bulb/rd.css
//  - typeface (Hubot Sans, variable width + weight): index.html, rd/index.html, work/index.html
//  - ease-out (.23,1,.32,1) and ease-in-out (.77,0,.175,1): assets/bulb/entry.css
//  - logo geometry: assets/brand/*.svg via brand.generated.ts
// The ease-in curve is derived, not sourced: it is the site's ease-out reversed in time, so exits
// mirror entrances exactly.
import type {Theme} from '../types';
import {BRAND} from './brand.generated';

const hubot = {
  family: 'Hubot Sans Variable',
  fallback: 'system-ui, sans-serif',
  weightRange: [200, 900] as [number, number],
  widthRange: [75, 125] as [number, number],
};

export const quietBands: Theme = {
  id: 'quiet-bands',
  label: 'Quiet Bands',
  provenance: 'qb-identity skill, assets/bulb/entry.css, assets/bulb/rd.css, assets/brand/*.svg',
  brand: true,
  color: {
    ground: '#000000',
    ink: '#F2EEE5',
    inkDim: 'rgba(242,238,229,0.62)',
    rule: 'rgba(242,238,229,0.22)',
    accent: '#FF5A00',
  },
  font: {display: hubot, text: hubot},
  weight: {light: 300, regular: 400, medium: 500, bold: 700, heavy: 800, black: 900},
  width: {condensed: 75, normal: 100, expanded: 125},
  type: {micro: 22, caption: 28, body: 40, subhead: 56, title: 88},
  tracking: {tight: -0.01, normal: 0, label: 0.14},
  space: [0, 8, 16, 24, 32, 48, 64, 96, 128, 192],
  motion: {
    easing: {
      out: [0.23, 1, 0.32, 1],
      in: [0.68, 0, 0.77, 0],
      inOut: [0.77, 0, 0.175, 1],
      linear: [0, 0, 1, 1],
    },
    duration: {micro: 6, short: 10, base: 16, long: 24, hold: 18},
    stagger: {tight: 1.5, base: 3, loose: 6},
    reading: {minSeconds: 0.8, perWord: 0.28},
  },
  logo: BRAND,
};

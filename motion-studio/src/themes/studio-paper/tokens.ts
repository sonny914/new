// A neutral working theme for projects that are not Quiet Bands. It is deliberately not a brand:
// no logo, and its colours are generic paper-and-ink values chosen for contrast, not anyone's
// identity. Copy this file to start a theme for another client, then replace the values with
// that client's verified ones.
import type {Theme} from '../types';
import {quietBands} from '../quiet-bands/tokens';

export const studioPaper: Theme = {
  ...quietBands,
  id: 'studio-paper',
  label: 'Studio Paper (neutral, experimental)',
  provenance: 'Neutral working palette; not a brand. Type and motion inherited from the Quiet Bands system.',
  brand: false,
  color: {
    ground: '#ECE9E2',
    ink: '#141414',
    inkDim: 'rgba(20,20,20,0.6)',
    rule: 'rgba(20,20,20,0.2)',
    accent: '#2440E6',
  },
  logo: undefined,
};

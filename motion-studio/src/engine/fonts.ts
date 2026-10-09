// Local font files, registered with the FontFace API before the first frame. Nothing is fetched
// from the network at render time, so output does not depend on a CDN being up.
import hubotLatin from '@fontsource-variable/hubot-sans/files/hubot-sans-latin-standard-normal.woff2';
import hubotLatinExt from '@fontsource-variable/hubot-sans/files/hubot-sans-latin-ext-standard-normal.woff2';
import type {Theme} from '../themes/types';

interface FontFile {
  src: string;
  unicodeRange: string;
}

/** Family name → files. Add a family here when a theme introduces one. */
export const FONT_FILES: Record<string, FontFile[]> = {
  'Hubot Sans Variable': [
    {
      src: hubotLatin,
      unicodeRange:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
    {
      src: hubotLatinExt,
      unicodeRange:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
};

const loaded = new Map<string, Promise<void>>();

export function loadThemeFonts(theme: Theme): Promise<void> {
  const families = [...new Set([theme.font.display, theme.font.text])];
  return Promise.all(
    families.map((f) => {
      const hit = loaded.get(f.family);
      if (hit) return hit;
      const files = FONT_FILES[f.family];
      if (!files) return Promise.reject(new Error(`No local files registered for font "${f.family}" (src/engine/fonts.ts).`));
      const p = Promise.all(
        files.map(async (file) => {
          const face = new FontFace(f.family, `url(${file.src}) format('woff2')`, {
            weight: `${f.weightRange[0]} ${f.weightRange[1]}`,
            stretch: `${f.widthRange[0]}% ${f.widthRange[1]}%`,
            unicodeRange: file.unicodeRange,
            display: 'block',
          });
          await face.load();
          document.fonts.add(face);
        }),
      ).then(() => undefined);
      loaded.set(f.family, p);
      return p;
    }),
  ).then(() => undefined);
}

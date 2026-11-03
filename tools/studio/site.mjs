// Quiet Bands Studio: the settings every page reads. Change a value here, then `npm run studio:build`.

export const SITE = {
  name: 'Quiet Bands Studio',
  base: '/studio/',                       // where the section is served; every in-studio link is built relative to it
  origin: 'https://quietbands.com',       // canonical and share URLs only
  host: 'Flighty',
  instagram: { handle: '@flighty.ai', url: 'https://www.instagram.com/flighty.ai/' },
  email: 'jason@quietbands.com',
  // The one way out of the section on purpose: the footer credit. Tests allow it and nothing else from the parent.
  parent: { href: '/', label: 'A Quiet Bands studio, Houston' },
  // The free Mini-Drama Workshop. Not launching yet: with `public` false the page isn't built, nothing links to it,
  // no form offers it, and _redirects sends /studio/workshop/ to /studio/learn/ (302). The page, the 'workshop' form
  // kind and the table stay, so turning it on is: set `public` true, drop that redirect, add it back to sitemap.xml.
  // Leave `date` null and the page collects names for the next one;
  // set it (ISO with offset, e.g. '2026-11-20T19:00:00-06:00') and every page shows the date instead.
  workshop: { public: false, date: null, where: 'Live, online', length: null },
  // Where the forms send. 'netlify': Netlify Forms (submissions in the Netlify dashboard; needs form detection on,
  // Site configuration → Forms). 'supabase': the studio_signups table (apply db/studio_signups.sql first).
  forms: 'netlify',
};

// The bar and the menu sheet, in this order.
export const NAV = [
  { path: 'pack/', label: 'Free pack' },
  { path: 'workshop/', label: 'Workshop', workshop: true },
  { path: 'learn/', label: 'Learn' },
  { path: 'commission/', label: 'Commission' },
].filter((n) => !n.workshop || SITE.workshop.public);

// Campaign pages: one per reel or post that needs its own landing, at /studio/go/<slug>/.
// Each one carries its slug into the signup row, so the list shows which post brought who.
export const CAMPAIGNS = [
  {
    slug: 'credits',
    kicker: 'From the reel',
    title: 'Credits are film stock.',
    lede: 'Five questions before you spend a single one. They are part 01 of the free pack, with the beat sheet, the character lock and 24 shot prompts after them.',
  },
  {
    slug: 'same-face',
    kicker: 'From the reel',
    title: 'Same face, every shot.',
    lede: 'The identity block and the reference-sheet routine from the reel are part 03 of the free pack. The other eleven parts take the scene from idea to posted.',
  },
];

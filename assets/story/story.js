/* Quiet Bands — the narrative, declared as data.
   The engine (engine.js) reads this file and writes transforms. Nothing in here touches the DOM.

   Coordinates: x is a percentage of stage width, y a percentage of stage height, both measured
   from the stage centre. s = scale, r = rotation in degrees, o = opacity.
   Every pose has a desktop geometry (d) and, where it differs, a mobile geometry (m).
   A scene that does not define a pose for an object inherits the previous scene's pose.
   `at: [a, b]` moves the tween into that window of the scene (0..1) instead of the default transition band. */

export const BAND = 0.36; // first 36% of a scene is the transition band; the rest is the hold

export const SCENES = [
  { id: 'work',       n: '01', name: 'The work',           weight: 1.0 },
  { id: 'understand', n: '02', name: 'Understand',         weight: 1.3 },
  { id: 'friction',   n: '03', name: 'Find the friction',  weight: 1.3 },
  { id: 'intervene',  n: '04', name: 'Intervene',          weight: 1.3 },
  { id: 'nothing',    n: '05', name: 'The interruption',   weight: 1.2, copyDelay: 0.16 },
  { id: 'pressure',   n: '06', name: 'Pressure test',      weight: 1.3 },
  { id: 'doors',      n: '07', name: 'Two doors',          weight: 0.9 },
];

/* Camera: scale and offset applied through each object's depth. */
/* Camera: scale and offset applied through each object's depth. dx/dy/ds = slow drift across the hold. */
export const CAMERA = {
  work:       { d: { s: 1.00, x: 0,  dx: -1.5, ds: 0.05 }, m: { s: 1.00, x: 0, dx: 0,   ds: 0.03 } },
  understand: { d: { s: 1.10, x: 1,  dx: -2,   ds: 0.02 }, m: { s: 1.05, x: 0, dx: 0,   ds: 0.02 } },
  friction:   { d: { s: 1.12, x: -1, dx: 2,    ds: 0.02 }, m: { s: 1.06, x: 0, dx: 0,   ds: 0.02 } },
  intervene:  { d: { s: 1.14, x: 1,  dx: -1.5, ds: 0.02 }, m: { s: 1.07, x: 0, dx: 0,   ds: 0.02 } },
  nothing:    { d: { s: 0.72, x: 0,  dx: 0,    ds: -0.05 }, m: { s: 0.82, x: 0, dx: 0,  ds: -0.03 } },
  pressure:   { d: { s: 1.00, x: 0,  dx: 1.5,  ds: 0.04 }, m: { s: 1.00, x: 0, dx: 0,   ds: 0.02 } },
  doors:      { d: { s: 1.00, x: 0,  dx: 0,    ds: 0.02 }, m: { s: 1.00, x: 0, dx: 0,   ds: 0.01 } },
};

/* Chain geometry shared by scenes 02–04 (desktop: a row; mobile: a column). */
const ROW = { email: -35, sheet: -21, human: -7, approval: 7, db: 21, api: 35 };
const COL = { email: -7, sheet: 2.4, human: 11.8, approval: 21.2, db: 30.6, api: 40 };
const chainD = (id, extra = {}) => ({ x: ROW[id], y: 12, s: 0.76, r: 0, ...extra });
const chainM = (id, extra = {}) => ({ x: -18, y: COL[id], s: 0.5, r: 0, ...extra });

/* Pressure-test ladder: the same objects, reordered and relabelled. */
const LADDER = ['doc', 'email', 'sheet', 'db', 'human', 'api', 'approval'];
const ROLES = { doc: 'Claim', email: 'Evidence', sheet: 'Workaround', db: 'Economic pain', human: 'Human', api: 'Test', approval: 'Decision' };
const QUESTIONS = {
  doc: 'What are you thinking about building?', email: 'What have you actually seen?', sheet: 'What do people do today instead?',
  db: 'What does the problem cost today?', human: 'Have you talked to the people who have it?', api: 'Can the outcome be tested by hand first?', approval: 'Research, humans, manual, build, or park?',
};
const ladderD = (id) => { const i = LADDER.indexOf(id); return { x: -39 + i * 13, y: i % 2 ? 34 : 18, s: 0.62, r: 0 }; };
const ladderM = (id) => { const i = LADDER.indexOf(id); return { x: i % 2 ? 14 : -14, y: i * 7, s: 0.4, r: 0 }; };
const ladderAt = (id) => { const i = LADDER.indexOf(id); return [0.06 + i * 0.07, 0.2 + i * 0.07]; };

export const OBJECTS = {
  email: {
    depth: 0.55, w: 220, h: 118, role: 'Email',
    poses: {
      work:       { d: { x: 16, y: -38, s: 0.8, r: 3 },    m: { x: -24, y: -2, s: 0.48, r: 3 }, o: 0.92 },
      understand: { d: chainD('email'), m: chainM('email'), o: 1 },
      friction:   { d: chainD('email'), m: chainM('email'), tag: 'Manual handoff', note: 'Read, then re-typed somewhere else', at: [0.1, 0.24] },
      intervene:  { d: chainD('email'), m: chainM('email'), tag: '', at: [0.06, 0.2] },
      nothing:    { d: { x: -40, y: -30, s: 0.7, r: -2 }, m: { x: -24, y: -26, s: 0.5, r: -2 }, o: 0.35 },
      pressure:   { d: ladderD('email'), m: ladderM('email'), o: 1, role: ROLES.email, note: QUESTIONS.email, at: ladderAt('email') },
      doors:      { d: { x: -36, y: 26, s: 0.5, r: -3 },  m: { x: -30, y: -42, s: 0.34, r: -3 }, o: 0.34, role: 'Email', note: '' },
    },
  },
  sheet: {
    depth: 0.8, w: 240, h: 132, role: 'Spreadsheet',
    poses: {
      work:       { d: { x: 31, y: -24, s: 1.0, r: -2 },   m: { x: 22, y: 7, s: 0.5, r: -2 }, o: 1 },
      understand: { d: chainD('sheet'), m: chainM('sheet') },
      friction:   { d: chainD('sheet'), m: chainM('sheet'), tag: 'Duplicate entry', note: 'Entered twice, never reconciled', at: [0.22, 0.36] },
      intervene:  { d: chainD('sheet'), m: chainM('sheet'), tag: 'Internal tool', note: 'One record, the rules written down', at: [0.12, 0.26] },
      nothing:    { d: { x: 40, y: -32, s: 0.7, r: 2 }, m: { x: 24, y: -28, s: 0.5, r: 2 }, o: 0.35, tag: '' },
      pressure:   { d: ladderD('sheet'), m: ladderM('sheet'), o: 1, role: ROLES.sheet, note: QUESTIONS.sheet, at: ladderAt('sheet') },
      doors:      { d: { x: -22, y: 34, s: 0.55, r: 2 }, m: { x: 24, y: -38, s: 0.36, r: 2 }, o: 0.34, role: 'Spreadsheet', note: '' },
    },
  },
  sheetGhost: {
    depth: 0.8, w: 240, h: 132, ghost: 'sheet', role: 'Spreadsheet (2)',
    poses: {
      work:       { d: { x: 31, y: -24, s: 1.0, r: -2 }, m: { x: 22, y: 7, s: 0.5, r: -2 }, o: 0 },
      understand: { d: chainD('sheet'), m: chainM('sheet'), o: 0 },
      friction:   { d: chainD('sheet', { x: ROW.sheet + 3.2, y: 12 + 7, r: 3 }), m: chainM('sheet', { x: -18 + 7, y: COL.sheet + 3, r: 3 }), o: 0.92, at: [0.22, 0.36] },
      intervene:  { d: chainD('sheet'), m: chainM('sheet'), o: 0, at: [0.12, 0.26] },
    },
  },
  human: {
    depth: 0.7, w: 168, h: 92, role: 'Decision',
    poses: {
      work:       { d: { x: 29, y: 6, s: 0.95, r: 0 },    m: { x: 22, y: 21, s: 0.48, r: 0 }, o: 1 },
      understand: { d: chainD('human'), m: chainM('human') },
      friction:   { d: chainD('human'), m: chainM('human'), tag: 'Decides from memory', note: 'The rules live in one head', at: [0.58, 0.72] },
      intervene:  { d: chainD('human'), m: chainM('human'), tag: 'Human, preserved', note: 'Judgment stays. Admin goes.', state: 'kept', at: [0.5, 0.64] },
      nothing:    { d: { x: 40, y: 36, s: 0.7, r: 0 },  m: { x: 24, y: 32, s: 0.5, r: 0 }, o: 0.4, tag: '', state: '' },
      pressure:   { d: ladderD('human'), m: ladderM('human'), o: 1, role: ROLES.human, note: QUESTIONS.human, at: ladderAt('human') },
      doors:      { d: { x: 28, y: 32, s: 0.55, r: 0 }, m: { x: 16, y: 42, s: 0.38, r: 0 }, o: 0.4, role: 'Decision', note: '' },
    },
  },
  approval: {
    depth: 0.45, w: 176, h: 96, role: 'Approval',
    poses: {
      work:       { d: { x: 43, y: -8, s: 0.66, r: 5 },   m: { x: 22, y: 34, s: 0.44, r: 4 }, o: 0.85 },
      understand: { d: chainD('approval'), m: chainM('approval'), o: 1 },
      friction:   { d: chainD('approval'), m: chainM('approval'), tag: 'Repeated approval', note: 'Asked three times, answered once', at: [0.34, 0.48] },
      intervene:  { d: chainD('approval'), m: chainM('approval'), tag: 'Automatic', note: 'Follows the decision. Nobody chases it.', at: [0.2, 0.34] },
      nothing:    { d: { x: 62, y: -52, s: 0.5, r: 8 }, m: { x: 50, y: -50, s: 0.4, r: 8 }, o: 0, tag: '' },
      pressure:   { d: ladderD('approval'), m: ladderM('approval'), o: 1, role: ROLES.approval, note: QUESTIONS.approval, at: ladderAt('approval') },
      doors:      { d: { x: -30, y: 43, s: 0.45, r: 4 }, m: { x: -18, y: -31, s: 0.3, r: 4 }, o: 0.3, role: 'Approval', note: '' },
    },
  },
  approvalQ1: {
    depth: 0.45, w: 176, h: 96, ghost: 'approval', role: 'Approval',
    poses: {
      work:       { d: { x: 43, y: -8, s: 0.66, r: 5 }, m: { x: 22, y: 34, s: 0.44, r: 4 }, o: 0 },
      understand: { d: chainD('approval'), m: chainM('approval'), o: 0 },
      friction:   { d: chainD('approval', { x: ROW.approval + 1.6, y: 12 + 4.5, r: 2 }), m: chainM('approval', { x: -18 + 5, y: COL.approval + 2, r: 2 }), o: 0.8, at: [0.34, 0.48] },
      intervene:  { d: chainD('approval'), m: chainM('approval'), o: 0, at: [0.2, 0.34] },
    },
  },
  approvalQ2: {
    depth: 0.45, w: 176, h: 96, ghost: 'approval', role: 'Approval',
    poses: {
      work:       { d: { x: 43, y: -8, s: 0.66, r: 5 }, m: { x: 22, y: 34, s: 0.44, r: 4 }, o: 0 },
      understand: { d: chainD('approval'), m: chainM('approval'), o: 0 },
      friction:   { d: chainD('approval', { x: ROW.approval + 3.2, y: 12 + 9, r: 4 }), m: chainM('approval', { x: -18 + 10, y: COL.approval + 4, r: 4 }), o: 0.6, at: [0.36, 0.5] },
      intervene:  { d: chainD('approval'), m: chainM('approval'), o: 0, at: [0.22, 0.36] },
    },
  },
  db: {
    depth: 0.35, w: 176, h: 96, role: 'Database',
    poses: {
      work:       { d: { x: 37, y: 30, s: 0.66, r: -3 },  m: { x: -24, y: 37, s: 0.4, r: -3 }, o: 0.8 },
      understand: { d: chainD('db'), m: chainM('db'), o: 1 },
      friction:   { d: chainD('db'), m: chainM('db'), tag: 'Disconnected', note: 'Updated by hand, on Fridays', at: [0.46, 0.6] },
      intervene:  { d: chainD('db'), m: chainM('db'), tag: 'Integration', note: 'The record updates itself', at: [0.3, 0.44] },
      nothing:    { d: { x: 62, y: 58, s: 0.5, r: -6 }, m: { x: 50, y: 56, s: 0.4, r: -6 }, o: 0, tag: '' },
      pressure:   { d: ladderD('db'), m: ladderM('db'), o: 1, role: ROLES.db, note: QUESTIONS.db, at: ladderAt('db') },
      doors:      { d: { x: -8, y: 25, s: 0.45, r: -2 }, m: { x: -2, y: -45, s: 0.3, r: -2 }, o: 0.3, role: 'Database', note: '' },
    },
  },
  doc: {
    depth: 0.5, w: 172, h: 110, role: 'Document',
    poses: {
      work:       { d: { x: 14, y: 36, s: 0.78, r: -6 },  m: { x: -24, y: 12, s: 0.44, r: -5 }, o: 0.9 },
      understand: { d: { x: ROW.human + 18, y: -12, s: 0.7, r: 0 }, m: { x: 29, y: COL.email, s: 0.42, r: 0 }, o: 1 },
      friction:   { d: { x: ROW.human + 26, y: -30, s: 0.6, r: 7 }, m: { x: 30, y: -19, s: 0.36, r: 7 }, o: 0.7, tag: 'Missing context', note: 'The SOP nobody has open', at: [0.58, 0.72] },
      intervene:  { d: { x: ROW.human + 18, y: -12, s: 0.7, r: 0 }, m: { x: 29, y: COL.email, s: 0.42, r: 0 }, o: 1, tag: 'Context carried', note: 'The rules travel with the request', at: [0.4, 0.54] },
      nothing:    { d: { x: -40, y: 34, s: 0.65, r: -4 }, m: { x: -24, y: 30, s: 0.45, r: -4 }, o: 0.35, tag: '' },
      pressure:   { d: ladderD('doc'), m: ladderM('doc'), o: 1, role: ROLES.doc, note: QUESTIONS.doc, at: ladderAt('doc') },
      doors:      { d: { x: 14, y: 27, s: 0.5, r: -3 }, m: { x: -16, y: 40, s: 0.36, r: -3 }, o: 0.34, role: 'Document', note: '' },
    },
  },
  api: {
    depth: 0.3, w: 216, h: 88, role: 'API',
    poses: {
      work:       { d: { x: -12, y: 44, s: 0.62, r: 2 },  m: { x: -24, y: 25, s: 0.42, r: 2 }, o: 0.75 },
      understand: { d: chainD('api'), m: chainM('api'), o: 1 },
      friction:   { d: chainD('api'), m: chainM('api') },
      intervene:  { d: chainD('api'), m: chainM('api'), tag: 'Automation', note: 'Runs without a reminder', at: [0.36, 0.5] },
      nothing:    { d: { x: -62, y: 60, s: 0.5, r: 4 }, m: { x: -50, y: 58, s: 0.4, r: 4 }, o: 0, tag: '' },
      pressure:   { d: ladderD('api'), m: ladderM('api'), o: 1, role: ROLES.api, note: QUESTIONS.api, at: ladderAt('api') },
      doors:      { d: { x: -14, y: 43, s: 0.45, r: 3 }, m: { x: 16, y: -29, s: 0.3, r: 3 }, o: 0.3, role: 'API', note: '' },
    },
  },
};

/* Connections. One state per scene; a missing scene inherits the previous state.
   States: hidden | faint | draw | manual | broken | solid | dark | rung */
export const LINKS = [
  { id: 'email-sheet',    from: 'email',    to: 'sheet',    order: 0, label: 'Re-keyed by hand',
    states: { work: 'faint', understand: 'draw', friction: 'manual', intervene: 'manual', nothing: 'dark', pressure: 'hidden' } },
  { id: 'sheet-human',    from: 'sheet',    to: 'human',    order: 1, label: 'Read, then decided',
    states: { work: 'hidden', understand: 'draw', friction: 'manual', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'human-approval', from: 'human',    to: 'approval', order: 2, label: 'Waits on email',
    states: { work: 'faint', understand: 'draw', friction: 'manual', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'approval-db',    from: 'approval', to: 'db',       order: 3, label: 'Entered again, later',
    states: { work: 'hidden', understand: 'draw', friction: 'broken', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'db-api',         from: 'db',       to: 'api',      order: 4, label: 'Pushed by hand',
    states: { work: 'faint', understand: 'draw', friction: 'manual', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'doc-human',      from: 'doc',      to: 'human',    order: 5, label: 'The rules, if anyone looks',
    states: { work: 'faint', understand: 'draw', friction: 'broken', intervene: 'solid', nothing: 'dark', pressure: 'hidden' } },
  /* ladder rungs, only in the pressure test */
  ...LADDER.slice(0, -1).map((from, i) => ({
    id: `rung-${i}`, from, to: LADDER[i + 1], order: i, rung: true, label: '',
    states: { work: 'hidden', pressure: 'rung', doors: 'hidden' },
  })),
];

/* The request that travels the chain. Visible windows are scene-local (u). */
export const PACKET = {
  path: ['email', 'sheet', 'human', 'approval', 'db', 'api'],
  runs: { understand: [0.4, 0.96], intervene: [0.62, 0.98] },
};

/* Copy visibility windows are computed by the engine; this lists the scene ids that are doors (never fade out). */
export const LAST = SCENES[SCENES.length - 1].id;

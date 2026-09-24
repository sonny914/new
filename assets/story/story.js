/* Quiet Bands — the narrative, declared as data.
   The engine (engine.js) reads this file and writes transforms. Nothing in here touches the DOM.

   Coordinates: x is a percentage of stage width, y a percentage of stage height, both measured
   from the stage centre. s = scale, r = rotation in degrees, o = opacity.
   Every pose has a desktop geometry (d) and, where it differs, a mobile geometry (m).
   A scene that does not define a pose for an object inherits the previous scene's pose.
   `at: [a, b]` moves the tween into that window of the scene (0..1) instead of the default transition band. */

export const BAND = 0.36; // first 36% of a scene is the transition band; the rest is the hold

export const SCENES = [
  { id: 'work',       n: '01', name: 'The work',           weight: 1.35 },
  { id: 'understand', n: '02', name: 'Understand',         weight: 1.2 },
  { id: 'friction',   n: '03', name: 'Find the friction',  weight: 1.2 },
  { id: 'intervene',  n: '04', name: 'Intervene',          weight: 1.45 },
  { id: 'nothing',    n: '05', name: 'The interruption',   weight: 1.1, copyDelay: 0.16 },
  { id: 'pressure',   n: '06', name: 'Pressure test',      weight: 1.2 },
  { id: 'doors',      n: '07', name: 'Two doors',          weight: 0.9 },
];

/* Camera: scale and offset applied through each object's depth. */
/* Camera: scale and offset applied through each object's depth. dx/dy/ds = slow drift across the hold. */
export const CAMERA = {
  work:       { d: { s: 1.00, x: 0,  dx: 0,    ds: 0 },    m: { s: 1.00, x: 0, dx: 0, ds: 0 } },
  understand: { d: { s: 1.10, x: 1,  dx: -2,   ds: 0.02 }, m: { s: 1.05, x: 0, dx: 0, ds: 0.02 } },
  friction:   { d: { s: 1.12, x: 0,  dx: 0,    ds: 0 },    m: { s: 1.06, x: 0, dx: 0, ds: 0 } },
  intervene:  { d: { s: 1.12, x: 0,  dx: 0,    ds: 0 },    m: { s: 1.06, x: 0, dx: 0, ds: 0 } },
  nothing:    { d: { s: 1.00, x: 0,  dx: 0,    ds: 0 },    m: { s: 1.00, x: 0, dx: 0, ds: 0 } },
  pressure:   { d: { s: 1.00, x: 0,  dx: 1.5,  ds: 0.04 }, m: { s: 1.00, x: 0, dx: 0, ds: 0.02 } },
  doors:      { d: { s: 1.00, x: 0,  dx: 0,    ds: 0.02 }, m: { s: 1.00, x: 0, dx: 0, ds: 0.01 } },
};

/* ---------- Signature 01: THE THREE BANDS ----------
   The Quiet Bands mark as a physical object: three slabs of operational paper, stacked, lit.
   Each slab is a layer of any operation: the promise, the operation, the record. The seven
   artifacts start printed on the slab surfaces, then peel off into the workflow. */
export const SLAB = {
  d: { w: 640, h: 240, t: 22, cx: 15, cy: 4, gap0: 34, gap1: 150, rx0: 64, rx1: 50, ry0: -32, ry1: -12 },
  m: { w: 200, h: 84, t: 9, cx: 0,  cy: 23, gap0: 14, gap1: 52,  rx0: 60, rx1: 48, ry0: -20, ry1: -8 },
};
const sm = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
const lp = (a, b, k) => a + (b - a) * k;
/** Hero orientation through scene 01: turns toward the viewer and lifts its layers apart. Pointer rocks it. */
export function heroAt(u, mobile, pointer = { x: 0, y: 0 }) {
  const S = mobile ? SLAB.m : SLAB.d, k = sm(u);
  return {
    rx: lp(S.rx0, S.rx1, k) + pointer.y * 3,
    ry: lp(S.ry0, S.ry1, k) + pointer.x * 8,
    gap: lp(S.gap0, S.gap1, k),
  };
}
const RAD = Math.PI / 180;
/** World pose of a point on slab k (uu, vv in -0.5..0.5 of the slab's width/height), lying flat on it. */
export function onSlab(k, uu, vv, scale, u, ctx) {
  const mobile = !!ctx.mobile, S = mobile ? SLAB.m : SLAB.d;
  const h = heroAt(u, mobile, ctx.pointer);
  const x = uu * S.w, y = vv * S.h, z = (1 - k) * h.gap + S.t / 2 + 2;
  const cy = Math.cos(h.ry * RAD), sy = Math.sin(h.ry * RAD);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;                 // rotateY
  const cx = Math.cos(h.rx * RAD), sx = Math.sin(h.rx * RAD);
  const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;                 // rotateX
  const W = ctx.W || 1440, H = ctx.H || 800;
  return { x: S.cx + (x1 / W) * 100, y: S.cy + (y2 / H) * 100, z: z2, rx: h.rx, ry: h.ry, r: 0, s: scale };
}
const slabPose = (k, uu, vv, sd, smob) => ({
  d: (u, ctx) => onSlab(k, uu, vv, sd, u, { ...ctx, mobile: false }),
  m: (u, ctx) => onSlab(k, uu, vv, smob, u, { ...ctx, mobile: true }),
});

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
  hero: {
    kind: 'hero', depth: 0.5, w: 640, h: 240,
    poses: {
      work:       { d: (u, ctx) => ({ x: SLAB.d.cx, y: SLAB.d.cy, z: 0, r: 0, s: 1, ...heroAt(u, false, ctx.pointer) }),
                    m: (u, ctx) => ({ x: SLAB.m.cx, y: SLAB.m.cy, z: 0, r: 0, s: 1, ...heroAt(u, true, ctx.pointer) }), o: 1 },
      /* the layers recede into the dark as the work lifts off them */
      understand: { d: { x: 15, y: 6, z: -900, rx: 56, ry: -18, gap: 150, s: 1 }, m: { x: 0, y: 24, z: -700, rx: 54, ry: -12, gap: 64, s: 1 }, o: 0, at: [0, 0.3] },
      /* and return edge-on, exactly the mark, above the two doors */
      doors:      { d: { x: 0, y: -38, z: 0, rx: 90, ry: 0, gap: 44, s: 1.1 }, m: { x: 0, y: -46, z: 0, rx: 90, ry: 0, gap: 22, s: 1 }, o: 0.14 },
    },
  },
  email: {
    depth: 0.55, w: 220, h: 118, role: 'Email',
    poses: {
      work:       { ...slabPose(0, -0.22, 0.02, 0.62, 0.3), o: 1 },
      understand: { d: chainD('email'), m: chainM('email'), o: 1 },
      friction:   { d: chainD('email'), m: chainM('email'), tag: 'Manual handoff', note: 'Read, then re-typed somewhere else', at: [0.1, 0.24] },
      intervene:  { d: chainD('email'), m: chainM('email'), tag: '', at: [0.06, 0.2] },
      nothing:    { d: { x: -84, y: -58, s: 0.8, r: -22 }, m: { x: -90, y: -70, s: 0.5, r: -22 }, o: 1 },
      pressure:   { d: ladderD('email'), m: ladderM('email'), o: 1, role: ROLES.email, note: QUESTIONS.email, at: ladderAt('email') },
      doors:      { d: { x: -36, y: 26, s: 0.5, r: -3 },  m: { x: -30, y: -42, s: 0.34, r: -3 }, o: 0.34, role: 'Email', note: '' },
    },
  },
  sheet: {
    depth: 0.8, w: 240, h: 132, role: 'Spreadsheet',
    poses: {
      work:       { ...slabPose(1, -0.3, -0.12, 0.64, 0.3), o: 1 },
      understand: { d: chainD('sheet'), m: chainM('sheet') },
      friction:   { d: chainD('sheet'), m: chainM('sheet'), tag: 'Duplicate entry', note: 'Entered twice, never reconciled', at: [0.22, 0.36] },
      intervene:  { d: chainD('sheet'), m: chainM('sheet'), tag: 'Internal tool', note: 'One record, the rules written down', at: [0.12, 0.26] },
      nothing:    { d: { x: 82, y: -64, s: 0.9, r: 18 }, m: { x: 92, y: -74, s: 0.5, r: 18 }, o: 1, tag: '' },
      pressure:   { d: ladderD('sheet'), m: ladderM('sheet'), o: 1, role: ROLES.sheet, note: QUESTIONS.sheet, at: ladderAt('sheet') },
      doors:      { d: { x: -22, y: 34, s: 0.55, r: 2 }, m: { x: 24, y: -38, s: 0.36, r: 2 }, o: 0.34, role: 'Spreadsheet', note: '' },
    },
  },
  sheetGhost: {
    depth: 0.8, w: 240, h: 132, ghost: 'sheet', role: 'Spreadsheet (2)',
    poses: {
      work:       { ...slabPose(1, -0.3, -0.12, 0.64, 0.3), o: 0 },
      understand: { d: chainD('sheet'), m: chainM('sheet'), o: 0 },
      friction:   { d: chainD('sheet', { x: ROW.sheet + 3.2, y: 12 + 7, r: 3 }), m: chainM('sheet', { x: -18 + 7, y: COL.sheet + 3, r: 3 }), o: 0.92, at: [0.22, 0.36] },
      intervene:  { d: chainD('sheet'), m: chainM('sheet'), o: 0, at: [0.12, 0.26] },
    },
  },
  human: {
    depth: 0.7, w: 168, h: 92, role: 'Decision',
    poses: {
      work:       { ...slabPose(1, 0.05, 0.2, 0.62, 0.3), o: 1 },
      understand: { d: chainD('human'), m: chainM('human') },
      friction:   { d: chainD('human'), m: chainM('human'), tag: 'Decides from memory', note: 'The rules live in one head', at: [0.58, 0.72] },
      intervene:  { d: chainD('human'), m: chainM('human'), tag: 'Human, preserved', note: 'Judgment stays. Admin goes.', state: 'kept', at: [0.5, 0.64] },
      nothing:    { d: { x: 86, y: 62, s: 0.8, r: 14 },  m: { x: 92, y: 74, s: 0.5, r: 14 }, o: 1, tag: '', state: '' },
      pressure:   { d: ladderD('human'), m: ladderM('human'), o: 1, role: ROLES.human, note: QUESTIONS.human, at: ladderAt('human') },
      doors:      { d: { x: 28, y: 32, s: 0.55, r: 0 }, m: { x: 16, y: 42, s: 0.38, r: 0 }, o: 0.4, role: 'Decision', note: '' },
    },
  },
  approval: {
    depth: 0.45, w: 176, h: 96, role: 'Approval',
    poses: {
      work:       { ...slabPose(1, 0.34, -0.2, 0.6, 0.29), o: 1 },
      understand: { d: chainD('approval'), m: chainM('approval'), o: 1 },
      friction:   { d: chainD('approval'), m: chainM('approval'), tag: 'Repeated approval', note: 'Asked three times, answered once', at: [0.34, 0.48] },
      intervene:  { d: chainD('approval'), m: chainM('approval'), tag: 'Automatic', note: 'Follows the decision. Nobody chases it.', at: [0.2, 0.34] },
      nothing:    { d: { x: 74, y: -76, s: 0.7, r: 30 }, m: { x: 84, y: -84, s: 0.4, r: 30 }, o: 1, tag: '' },
      pressure:   { d: ladderD('approval'), m: ladderM('approval'), o: 1, role: ROLES.approval, note: QUESTIONS.approval, at: ladderAt('approval') },
      doors:      { d: { x: -30, y: 43, s: 0.45, r: 4 }, m: { x: -18, y: -31, s: 0.3, r: 4 }, o: 0.3, role: 'Approval', note: '' },
    },
  },
  approvalQ1: {
    depth: 0.45, w: 176, h: 96, ghost: 'approval', role: 'Approval',
    poses: {
      work:       { ...slabPose(1, 0.34, -0.2, 0.6, 0.29), o: 0 },
      understand: { d: chainD('approval'), m: chainM('approval'), o: 0 },
      friction:   { d: chainD('approval', { x: ROW.approval + 1.6, y: 12 + 4.5, r: 2 }), m: chainM('approval', { x: -18 + 5, y: COL.approval + 2, r: 2 }), o: 0.8, at: [0.34, 0.48] },
      intervene:  { d: chainD('approval'), m: chainM('approval'), o: 0, at: [0.2, 0.34] },
    },
  },
  approvalQ2: {
    depth: 0.45, w: 176, h: 96, ghost: 'approval', role: 'Approval',
    poses: {
      work:       { ...slabPose(1, 0.34, -0.2, 0.6, 0.29), o: 0 },
      understand: { d: chainD('approval'), m: chainM('approval'), o: 0 },
      friction:   { d: chainD('approval', { x: ROW.approval + 3.2, y: 12 + 9, r: 4 }), m: chainM('approval', { x: -18 + 10, y: COL.approval + 4, r: 4 }), o: 0.6, at: [0.36, 0.5] },
      intervene:  { d: chainD('approval'), m: chainM('approval'), o: 0, at: [0.22, 0.36] },
    },
  },
  db: {
    depth: 0.35, w: 176, h: 96, role: 'Database',
    poses: {
      work:       { ...slabPose(2, -0.2, -0.02, 0.62, 0.3), o: 1 },
      understand: { d: chainD('db'), m: chainM('db'), o: 1 },
      friction:   { d: chainD('db'), m: chainM('db'), tag: 'Disconnected', note: 'Updated by hand, on Fridays', at: [0.46, 0.6] },
      intervene:  { d: chainD('db'), m: chainM('db'), tag: 'Integration', note: 'The record updates itself', at: [0.3, 0.44] },
      nothing:    { d: { x: 80, y: 72, s: 0.7, r: -26 }, m: { x: 88, y: 84, s: 0.4, r: -26 }, o: 1, tag: '' },
      pressure:   { d: ladderD('db'), m: ladderM('db'), o: 1, role: ROLES.db, note: QUESTIONS.db, at: ladderAt('db') },
      doors:      { d: { x: -8, y: 25, s: 0.45, r: -2 }, m: { x: -2, y: -45, s: 0.3, r: -2 }, o: 0.3, role: 'Database', note: '' },
    },
  },
  doc: {
    depth: 0.5, w: 172, h: 110, role: 'Document',
    poses: {
      work:       { ...slabPose(1, 0.34, 0.28, 0.58, 0.29), o: 1 },
      understand: { d: { x: ROW.human + 18, y: -12, s: 0.7, r: 0 }, m: { x: 29, y: COL.email, s: 0.42, r: 0 }, o: 1 },
      friction:   { d: { x: ROW.human + 26, y: -30, s: 0.6, r: 7 }, m: { x: 30, y: -19, s: 0.36, r: 7 }, o: 0.7, tag: 'Missing context', note: 'The SOP nobody has open', at: [0.58, 0.72] },
      intervene:  { d: { x: ROW.human + 18, y: -12, s: 0.7, r: 0 }, m: { x: 29, y: COL.email, s: 0.42, r: 0 }, o: 1, tag: 'Context carried', note: 'The rules travel with the request', at: [0.4, 0.54] },
      nothing:    { d: { x: -80, y: 66, s: 0.7, r: -34 }, m: { x: -88, y: 78, s: 0.45, r: -34 }, o: 1, tag: '' },
      pressure:   { d: ladderD('doc'), m: ladderM('doc'), o: 1, role: ROLES.doc, note: QUESTIONS.doc, at: ladderAt('doc') },
      doors:      { d: { x: 14, y: 27, s: 0.5, r: -3 }, m: { x: -16, y: 40, s: 0.36, r: -3 }, o: 0.34, role: 'Document', note: '' },
    },
  },
  api: {
    depth: 0.3, w: 216, h: 88, role: 'API',
    poses: {
      work:       { ...slabPose(2, 0.24, 0.1, 0.62, 0.3), o: 1 },
      understand: { d: chainD('api'), m: chainM('api'), o: 1 },
      friction:   { d: chainD('api'), m: chainM('api') },
      intervene:  { d: chainD('api'), m: chainM('api'), tag: 'Automation', note: 'Runs without a reminder', at: [0.36, 0.5] },
      nothing:    { d: { x: -88, y: 76, s: 0.7, r: 24 }, m: { x: -92, y: 86, s: 0.4, r: 24 }, o: 1, tag: '' },
      pressure:   { d: ladderD('api'), m: ladderM('api'), o: 1, role: ROLES.api, note: QUESTIONS.api, at: ladderAt('api') },
      doors:      { d: { x: -14, y: 43, s: 0.45, r: 3 }, m: { x: 16, y: -29, s: 0.3, r: 3 }, o: 0.3, role: 'API', note: '' },
    },
  },
};

/* Connections. One state per scene; a missing scene inherits the previous state.
   States: hidden | faint | draw | manual | broken | solid | dark | rung */
export const LINKS = [
  { id: 'email-sheet',    from: 'email',    to: 'sheet',    order: 0, label: 'Re-keyed by hand',
    states: { work: 'hidden', understand: 'draw', friction: 'manual', intervene: 'manual', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'sheet-human',    from: 'sheet',    to: 'human',    order: 1, label: 'Read, then decided',
    states: { work: 'hidden', understand: 'draw', friction: 'manual', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'human-approval', from: 'human',    to: 'approval', order: 2, label: 'Waits on email',
    states: { work: 'hidden', understand: 'draw', friction: 'manual', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'approval-db',    from: 'approval', to: 'db',       order: 3, label: 'Entered again, later',
    states: { work: 'hidden', understand: 'draw', friction: 'broken', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'db-api',         from: 'db',       to: 'api',      order: 4, label: 'Pushed by hand',
    states: { work: 'hidden', understand: 'draw', friction: 'manual', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
  { id: 'doc-human',      from: 'doc',      to: 'human',    order: 5, label: 'The rules, if anyone looks',
    states: { work: 'hidden', understand: 'draw', friction: 'broken', intervene: 'solid', nothing: 'hidden', pressure: 'hidden' } },
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

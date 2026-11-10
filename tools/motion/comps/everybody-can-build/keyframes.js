// The approved art-direction keyframes, taken straight from the animated proof so stills and motion never drift.
//   node tools/motion/render.mjs everybody-can-build/keyframes --frames=0,1,2 --blur=1
import proof from './proof.js';
export const TIMES = [1.2, 2.72, 4.75];
export default { ...proof, fps: 1, duration: 3, motionBlur: undefined, draw: (ctx, t, env) => proof.draw(ctx, TIMES[Math.min(2, Math.floor(t))], env) };

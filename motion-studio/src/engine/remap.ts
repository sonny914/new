// Group time remap: a group can stop dead at freezeAt and, if resumeAt is set, carry on from where
// it stopped. Pure so the freeze is unit-tested.
export function remap(frame: number, time?: {freezeAt: number; resumeAt?: number}): number {
  if (!time || frame < time.freezeAt) return frame;
  if (time.resumeAt === undefined || frame < time.resumeAt) return time.freezeAt;
  return frame - (time.resumeAt - time.freezeAt);
}

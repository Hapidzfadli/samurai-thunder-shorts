import { ToonParams } from "./objectsSoda";

/** Card-space helpers: the character card is 512 x 800 units, shoulders at y=425, hips at y=565. */
export const SHOULDER_R: [number, number] = [256 + 64, 425];
export const SHOULDER_L: [number, number] = [256 - 64, 425];
const L1 = 92;
const L2 = 88;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Overshoot: rushes past 1 then settles (follow-through). */
export const overshoot = (k: number, amt = 0.18) => {
  const x = clamp01(k);
  return 1 + amt * Math.sin(x * Math.PI * 2) * (1 - x) * 1.6 - (1 - x) * (1 - x) * 0 - (x < 1 ? 0 : 0);
};

/** Two-bone IK: returns [upper, forearm-relative] angles (radians, 0 = hanging down, + = screen right) so the hand reaches (tx, ty). */
export const ik2 = (shoulder: [number, number], tx: number, ty: number, bend: 1 | -1 = 1): [number, number] => {
  const dx = tx - shoulder[0];
  const dy = ty - shoulder[1];
  const d = Math.min(L1 + L2 - 1, Math.max(Math.abs(L1 - L2) + 1, Math.hypot(dx, dy)));
  const base = Math.atan2(dx, dy);
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const a1 = base + bend * Math.acos(Math.min(1, Math.max(-1, cosA)));
  const ex = shoulder[0] + Math.sin(a1) * L1;
  const ey = shoulder[1] + Math.cos(a1) * L1;
  const foreAbs = Math.atan2(tx - ex, ty - ey);
  return [a1, foreAbs - a1];
};

/** Breathing + tiny sway for a character standing still. */
export const idle = (t: number, seed = 0, amt = 1): Partial<ToonParams> => ({
  squash: (0.05 + 0.05 * Math.sin(t * 2.4 + seed)) * amt,
  lean: Math.sin(t * 0.9 + seed) * 0.03 * amt,
  armL: [-0.12 - 0.03 * Math.sin(t * 2.4 + seed), -0.08],
  armR: [0.12 + 0.03 * Math.sin(t * 2.4 + seed + 1), 0.08],
  bob: 0,
});

/**
 * Side-stepping walk cycle (legs drawn in profile). `phase` is in cycles. `dir` +1 = walking right.
 * mode "tiptoe": short strides, high knees, arms out for balance, body leaning back.
 */
export const walk = (phase: number, mode: "walk" | "tiptoe" | "sneak" = "walk", dir: 1 | -1 = 1): Partial<ToonParams> => {
  const ph = phase * Math.PI * 2;
  const A = mode === "walk" ? 0.55 : mode === "tiptoe" ? 0.3 : 0.4;
  const K = mode === "walk" ? 0.8 : mode === "tiptoe" ? 1.25 : 1.0;
  const sw = Math.sin(ph);
  const fwdL = Math.max(0, Math.cos(ph)); // left leg lifting while swinging forward
  const fwdR = Math.max(0, -Math.cos(ph));
  const thighL = dir * A * sw;
  const thighR = dir * -A * sw;
  const bob = (mode === "tiptoe" ? 7 : 11) * Math.abs(Math.sin(ph)) + (mode === "tiptoe" ? 10 : 0);
  const armSwing = mode === "walk" ? 0.55 : 0.12;
  const out = mode === "walk" ? 0 : 1.0;
  return {
    profile: true,
    legL: thighL,
    legR: thighR,
    kneeL: -K * fwdL * dir * (dir > 0 ? 1 : -1) * 1,
    kneeR: -K * fwdR * dir * (dir > 0 ? 1 : -1) * 1,
    bob,
    lean: dir * (mode === "walk" ? 0.25 : -0.12) + sw * 0.05,
    squash: Math.abs(sw) * 0.2,
    armL: [-0.25 - out * 0.9 + dir * armSwing * -sw, -0.15 - out * 0.4],
    armR: [0.25 + out * 0.9 + dir * armSwing * sw, 0.15 + out * 0.4],
  };
};

/** A cartoon "freeze": anticipation squash then a held pose. k 0..1 */
export const freeze = (k: number): Partial<ToonParams> => ({ squash: 0.35 * Math.sin(clamp01(k) * Math.PI), lean: -0.1 * Math.sin(clamp01(k) * Math.PI) });

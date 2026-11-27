export type V = [number, number, number];
export type Word = { w: string; from: number; to: number };
export type Line = {
  voice: string;
  speaker?: string;
  style?: string;
  text: string;
  from: number;
  to: number;
  words: Word[];
};
export type Caption = {
  text: string;
  from?: number;
  to?: number;
  startFrame?: number;
  endFrame?: number;
  highlight?: boolean;
  voice?: string;
  speaker?: string;
};
export type Timing = {
  fps: number;
  totalDurationSec: number;
  totalFrames: number;
  order: string[];
  scenes: Record<string, { startFrame: number; durationInFrames: number; title?: string }>;
  lines: Record<string, Line[]>;
  events: Record<string, number>;
  captions: Caption[];
};

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (x: number) => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};
export const mix = (a: V, b: V, t: number): V => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Active line speaking right now (for shot-reverse-shot & lip-sync). */
export const activeLine = (t: Timing, scene: string, f: number): Line | null => {
  for (const l of t.lines[scene] ?? []) {
    if (f >= l.from && f <= l.to) return l;
  }
  return null;
};

/** Real-time mouth aperture (0..1) for a specific voice (supports exact voice or prefix like "crowd_"). */
export const mouth = (t: Timing, scene: string, voice: string, f: number): number => {
  for (const l of t.lines[scene] ?? []) {
    const match = voice.endsWith('_') ? l.voice.startsWith(voice) : l.voice === voice;
    if (!match) continue;
    for (const w of l.words) {
      if (f >= w.from && f <= w.to) {
        const u = (f - w.from) / Math.max(1, w.to - w.from);
        return clamp(Math.sin(u * Math.PI) * 0.65 + 0.3 * Math.abs(Math.sin(f * 0.72)));
      }
    }
  }
  return 0;
};

export const wordAt = (t: Timing, scene: string, word: string, fallback: number): number => {
  const key = word.toLowerCase();
  for (const l of t.lines[scene] ?? []) {
    for (const w of l.words) {
      if (w.w.toLowerCase().replace(/[^a-z]/g, '') === key) return w.from;
    }
  }
  return fallback;
};

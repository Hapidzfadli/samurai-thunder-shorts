export type ZhugeWord = { w: string; from: number; to: number };

export type ZhugeLine = {
  voice: string;
  speaker: string;
  style: string;
  text: string;
  from: number;
  to: number;
  words: ZhugeWord[];
};

export type ZhugeCaption = {
  text: string;
  startFrame: number;
  endFrame: number;
  highlight?: boolean;
  voice?: string;
  speaker?: string;
  scene?: string;
};

export type ZhugeTiming = {
  fps: number;
  tempo: number;
  totalDurationSec: number;
  totalFrames: number;
  order: string[];
  scenes: Record<string, { startFrame: number; durationInFrames: number }>;
  lines: Record<string, ZhugeLine[]>;
  captions: ZhugeCaption[];
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Returns 0..1 speaking mouth amplitude for a given voice in the current scene at local frame f. */
export function voiceAmp(timing: ZhugeTiming, scene: string, voice: string, f: number): number {
  const rows = timing.lines[scene] ?? [];
  for (const row of rows) {
    if (row.voice !== voice) continue;
    if (f >= row.from && f <= row.to) {
      for (const w of row.words) {
        if (f >= w.from && f <= w.to) {
          const p = (f - w.from) / Math.max(1, w.to - w.from);
          const env = Math.sin(p * Math.PI);
          const syl = 0.55 + 0.45 * Math.abs(Math.sin(f * 0.72));
          return clamp01(0.25 + env * syl * 0.75);
        }
      }
      return 0.14;
    }
  }
  return 0;
}

/** Returns the active line in the current scene at local frame f, if any. */
export function activeLine(timing: ZhugeTiming, scene: string, f: number): ZhugeLine | null {
  const rows = timing.lines[scene] ?? [];
  for (const row of rows) {
    if (f >= row.from && f <= row.to) return row;
  }
  return null;
}

/** Finds the local frame of the first word matching target substring in a scene. */
export function findWordFrame(timing: ZhugeTiming, scene: string, substr: string, fallback: number): number {
  const rows = timing.lines[scene] ?? [];
  const low = substr.toLowerCase();
  for (const row of rows) {
    for (const w of row.words) {
      if (w.w.toLowerCase().includes(low)) return w.from;
    }
  }
  return fallback;
}

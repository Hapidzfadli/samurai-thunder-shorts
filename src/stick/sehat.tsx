import React from "react";
import { INK } from "./draw";

/* Hijab: ring frame around the face, crown band, drape over shoulders */
export const hijab = (c: string, c2 = "#00000022") => ({
  back: (
    <g>
      <path d="M -86 10 Q -92 -80 0 -88 Q 92 -80 86 10 L 110 118 Q 0 150 -110 118 Z" fill={c} stroke={INK} strokeWidth={10} strokeLinejoin="round" />
      <path d="M -60 70 Q 0 100 60 70" stroke={c2} strokeWidth={6} fill="none" />
    </g>
  ),
  front: (
    <g>
      <path d="M -62 -22 Q -50 -70 0 -70 Q 50 -70 62 -22 Q 40 -44 0 -44 Q -40 -44 -62 -22 Z" fill={c} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    </g>
  ),
});

/* Pompadour sweeping back (to -x), like the user's sketch */
export const pompadour = (c = INK) => (
  <g>
    <path d="M -58 -30 Q -86 -70 -62 -100 Q -20 -146 52 -122 Q 90 -110 118 -128 Q 112 -96 86 -84 Q 104 -74 98 -60 Q 70 -66 62 -52 Q 40 -92 -2 -86 Q -44 -80 -58 -30 Z" fill={c} stroke={INK} strokeWidth={6} strokeLinejoin="round" transform="translate(0 14) scale(-1 1)" />
  </g>
);

export const shades = (
  <g>
    <circle cx={-22} cy={-8} r={20} fill={INK} />
    <circle cx={24} cy={-8} r={20} fill={INK} />
    <line x1={-3} y1={-10} x2={5} y2={-10} stroke={INK} strokeWidth={5} />
    <circle cx={-28} cy={-14} r={5} fill="#fff" opacity={0.8} />
    <circle cx={18} cy={-14} r={5} fill="#fff" opacity={0.8} />
  </g>
);

export const belly = (c: string) => (
  <ellipse cx={34} cy={-66} rx={36} ry={42} fill={c} stroke={INK} strokeWidth={9} />
);

export const Hormone: React.FC<{ x: number; y: number; s?: number; c: string; hat: string; kind?: "mail" | "nose" | "none" }> = ({ x, y, s = 1, c, hat, kind = "none" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -34 -92 L 0 -150 L 34 -92 Z" fill={hat} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <circle r={82} cy={-20} fill={c} stroke={INK} strokeWidth={10} />
    <circle cx={-28} cy={-34} r={20} fill="#fff" stroke={INK} strokeWidth={6} />
    <circle cx={28} cy={-34} r={20} fill="#fff" stroke={INK} strokeWidth={6} />
    <circle cx={-24} cy={-32} r={8} fill={INK} />
    <circle cx={32} cy={-32} r={8} fill={INK} />
    <ellipse cx={2} cy={22} rx={14} ry={17} fill={INK} />
    {kind === "nose" && <ellipse cx={2} cy={-2} rx={26} ry={22} fill="#f2a58e" stroke={INK} strokeWidth={7} />}
    {kind === "mail" && (
      <g transform="translate(96 -20) rotate(14)">
        <rect x={-30} y={-22} width={60} height={42} fill="#fff" stroke={INK} strokeWidth={6} />
        <path d="M -30 -22 L 0 2 L 30 -22" fill="none" stroke={INK} strokeWidth={5} />
      </g>
    )}
  </g>
);

export const mask = (c = "#bfe6ff") => (
  <g>
    <path d="M -50 14 Q 0 6 50 14 Q 52 52 0 66 Q -52 52 -50 14 Z" fill={c} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <path d="M -38 26 L 38 26 M -38 40 L 34 40" stroke="#fff" strokeWidth={3} opacity={0.8} />
    <path d="M -50 22 Q -70 18 -66 4 M 50 22 Q 70 18 66 4" stroke={INK} strokeWidth={4} fill="none" />
  </g>
);
export const blush = <g><circle cx={-40} cy={20} r={11} fill="#ff8aa8" opacity={0.75} /><circle cx={42} cy={20} r={11} fill="#ff8aa8" opacity={0.75} /></g>;

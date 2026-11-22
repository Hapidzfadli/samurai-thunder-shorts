import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";

type Vec3 = [number, number, number];
export const BW = 600;
export const BH = 1000;
const INKC = "#241726";

export type BeanExpr = "neutral" | "worried" | "shock" | "angry" | "smug" | "scared" | "happy" | "sad" | "sleepy" | "talk" | "laugh" | "disgust" | "think";
export type BeanParams = {
  expr?: BeanExpr;
  look?: number; // -1..1 pupils
  skin?: string;
  torso?: string;
  pants?: string;
  hat?: "none" | "cap" | "bowler" | "bonnet" | "helmet" | "tophat" | "wig" | "kerchief" | "peci" | "policecap" | "turban" | "crown" | "tallturban" | "guardhelmet" | "iket" | "sanggul" | "caping";
  pangsi?: string; // loose trousers drawn over the legs
  sleeves?: string; // long sleeves (kampret / kebaya)
  kebaya?: string; // kebaya top with lace edge (uses torso colour)
  skirt?: string; // sinjang / batik skirt to the calves
  batik?: string; // batik motif colour for skirt / iket
  slung?: string; // sarung slung over the shoulder
  selendang?: string;
  golok?: boolean;
  wet?: number; // 0..1 soaked from the feet up
  gooColor?: string;
  barefoot?: boolean;
  beard?: string;
  robe?: string; // long robe to the ankles
  robeTrim?: string;
  sash?: string;
  wide?: number; // torso width factor (stocky build)
  safari?: boolean; // safari shirt pockets + buttons
  stars?: number; // shoulder stars (police rank)
  badge?: boolean; // chest badge
  belt?: string;
  sideHair?: string; // hair at the temples under a hat
  headphones?: boolean;
  hatColor?: string;
  hair?: string;
  mustache?: boolean;
  apron?: string;
  tie?: string;
  coat?: boolean;
  /** leg/arm angles in degrees, 0 = hanging down, + = toward facing (right) */
  legL?: [number, number];
  legR?: [number, number];
  armL?: [number, number];
  armR?: [number, number];
  lean?: number;
  bob?: number;
  prop?: "none" | "brush" | "bucket" | "paper" | "gavel" | "stamp" | "jar" | "pen" | "umbrella" | "phone" | "headset" | "button" | "bottle" | "sack" | "net" | "spear" | "fan" | "scroll";
  propHand?: "L" | "R";
  propRot?: number;
  goo?: number; // 0..1 brown coverage from the feet up
  sweat?: boolean;
  blink?: boolean;
  mouthOpen?: number; // 0..1 for talk
  seed?: number;
};

const poly = (c: CanvasRenderingContext2D, pts: [number, number][], fill?: string, stroke = INKC, w = 8) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  c.strokeStyle = stroke;
  c.lineWidth = w;
  c.lineJoin = "round";
  c.stroke();
};
const seg = (c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w = 9, col = INKC) => {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
};
const R = (d: number) => (d * Math.PI) / 180;
const tip = (x: number, y: number, len: number, a: number): [number, number] => [x + len * Math.sin(R(a)), y + len * Math.cos(R(a))];

const limb = (c: CanvasRenderingContext2D, x: number, y: number, l1: number, l2: number, a: [number, number], w = 9): [number, number, number] => {
  const e = tip(x, y, l1, a[0]);
  const h = tip(e[0], e[1], l2, a[0] + a[1]);
  seg(c, x, y, e[0], e[1], w);
  seg(c, e[0], e[1], h[0], h[1], w);
  return [h[0], h[1], a[0] + a[1]];
};


/** wide robe sleeve over the upper arm and half the forearm */
const sleeve = (c: CanvasRenderingContext2D, x: number, y: number, a: [number, number], col: string, trim?: string) => {
  const e = tip(x, y, 130, a[0]);
  const m = tip(e[0], e[1], 70, a[0] + a[1]);
  const band = (p0: [number, number], p1: [number, number], w0: number, w1: number, fill: string) => {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    poly(c, [[p0[0] + nx * w0, p0[1] + ny * w0], [p1[0] + nx * w1, p1[1] + ny * w1], [p1[0] - nx * w1, p1[1] - ny * w1], [p0[0] - nx * w0, p0[1] - ny * w0]], fill, INKC, 6);
  };
  band([x, y], e, 18, 20, col);
  band(e, m, 20, 27, col);
  if (trim) band(tip(e[0], e[1], 56, a[0] + a[1]), m, 25, 27, trim);
  c.fillStyle = col;
  c.beginPath();
  c.arc(e[0], e[1], 19, 0, Math.PI * 2);
  c.fill();
};
const slipper = (c: CanvasRenderingContext2D, x: number, y: number, col: string) => {
  poly(c, [[x - 18, y - 16], [x + 30, y - 14], [x + 58, y - 22], [x + 62, y - 34], [x + 70, y - 22], [x + 56, y + 6], [x - 20, y + 6]], col, INKC, 6);
};

const trouser = (c: CanvasRenderingContext2D, x: number, y: number, a: [number, number], col: string) => {
  const k = tip(x, y, 165, a[0]);
  const f = tip(k[0], k[1], 150, a[0] + a[1]);
  const band = (p0: [number, number], p1: [number, number], w0: number, w1: number) => {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    poly(c, [[p0[0] + nx * w0, p0[1] + ny * w0], [p1[0] + nx * w1, p1[1] + ny * w1], [p1[0] - nx * w1, p1[1] - ny * w1], [p0[0] - nx * w0, p0[1] - ny * w0]], col, INKC, 6);
  };
  band([x, y - 10], k, 34, 28);
  band(k, f, 28, 30);
  c.fillStyle = col;
  c.beginPath();
  c.arc(k[0], k[1], 27, 0, Math.PI * 2);
  c.fill();
};
const batikDots = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, step = 26) => {
  c.save();
  c.strokeStyle = col;
  c.lineWidth = 4;
  for (let y = y0 + step / 2; y < y1; y += step)
    for (let x = x0 + ((y / step) % 2 ? step / 2 : 0); x < x1; x += step) {
      c.beginPath();
      c.moveTo(x - 7, y + 7);
      c.lineTo(x + 7, y - 7);
      c.stroke();
      c.beginPath();
      c.arc(x + 8, y + 6, 3, 0, Math.PI * 2);
      c.stroke();
    }
  c.restore();
};
const drawProp = (c: CanvasRenderingContext2D, p: BeanParams, hx: number, hy: number, ang: number) => {
  if (!p.prop || p.prop === "none") return;
  c.save();
  c.translate(hx, hy);
  c.rotate(R(-(ang) + (p.propRot ?? 0)));
  switch (p.prop) {
    case "brush":
      seg(c, 0, 0, 0, 120, 9, "#8b5a2b");
      poly(c, [[-18, 120], [18, 120], [14, 170], [-14, 170]], "#4a2410", INKC, 6);
      break;
    case "bucket":
      poly(c, [[-40, 10], [40, 10], [32, 90], [-32, 90]], "#7a7f8a", INKC, 7);
      c.fillStyle = "#4a2410";
      c.fillRect(-36, 10, 72, 14);
      break;
    case "paper":
      poly(c, [[-42, -10], [42, -10], [42, 110], [-42, 110]], "#f7f1dd", INKC, 6);
      seg(c, -26, 20, 26, 20, 4);
      seg(c, -26, 44, 26, 44, 4);
      seg(c, -26, 68, 10, 68, 4);
      break;
    case "gavel":
      seg(c, 0, 0, 0, 90, 10, "#8b5a2b");
      poly(c, [[-40, -14], [40, -14], [40, 22], [-40, 22]], "#a96b34", INKC, 7);
      break;
    case "stamp":
      seg(c, 0, 0, 0, 60, 14, "#8b5a2b");
      poly(c, [[-40, 60], [40, 60], [40, 90], [-40, 90]], "#c93b3b", INKC, 7);
      break;
    case "jar":
      poly(c, [[-34, 0], [34, 0], [38, 100], [-38, 100]], "#ffd36a", INKC, 7);
      poly(c, [[-38, -16], [38, -16], [38, 0], [-38, 0]], "#c8a050", INKC, 6);
      break;
    case "pen":
      seg(c, 0, -10, 0, 60, 8, "#222");
      break;
    case "phone":
      poly(c, [[-22, -50], [22, -50], [22, 30], [-22, 30]], "#15151c", INKC, 5);
      poly(c, [[-15, -42], [15, -42], [15, 20], [-15, 20]], "#6ec6ff", INKC, 2);
      break;
    case "button":
      poly(c, [[-30, -6], [30, -6], [30, 26], [-30, 26]], "#3a3a44", INKC, 5);
      c.fillStyle = "#e63946";
      c.beginPath();
      c.arc(0, -6, 22, Math.PI, 0);
      c.fill();
      c.stroke();
      break;
    case "bottle":
      poly(c, [[-22, 0], [22, 0], [26, 96], [-26, 96]], "rgba(170,220,200,0.9)", INKC, 6);
      poly(c, [[-10, -40], [10, -40], [10, 0], [-10, 0]], "rgba(170,220,200,0.9)", INKC, 5);
      poly(c, [[-12, -62], [12, -62], [10, -40], [-10, -40]], "#a8672a", INKC, 5);
      break;
    case "sack":
      poly(c, [[-50, 10], [50, 10], [64, 120], [-64, 120]], "#d9c28a", INKC, 6);
      seg(c, -30, 10, 30, 10, 8, "#8b5a2b");
      break;
    case "net":
      seg(c, 0, 0, 0, 130, 8, "#8b5a2b");
      c.strokeStyle = INKC;
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(0, 175, 46, 52, 0, 0, Math.PI * 2);
      c.stroke();
      [-30, 0, 30].forEach((x) => seg(c, x, 130, x, 222, 2, INKC));
      [150, 175, 200].forEach((y) => seg(c, -44, y, 44, y, 2, INKC));
      break;
    case "spear":
      seg(c, 0, -160, 0, 140, 8, "#8b5a2b");
      poly(c, [[-14, -160], [14, -160], [0, -210]], "#c8ccd4", INKC, 5);
      break;
    case "fan":
      seg(c, 0, 0, 0, 60, 7, "#8b5a2b");
      poly(c, [[0, 60], [-60, 150], [60, 150]], "#e8c86a", INKC, 6);
      break;
    case "scroll":
      poly(c, [[-40, 0], [40, 0], [40, 120], [-40, 120]], "#f2e2b0", INKC, 6);
      [30, 55, 80].forEach((y) => seg(c, -26, y, 26, y, 3));
      break;
    case "umbrella":
      seg(c, 0, 0, 0, 200, 8, "#3a2a1a");
      break;
  }
  c.restore();
};

export const drawBean = (c: CanvasRenderingContext2D, p: BeanParams) => {
  c.clearRect(0, 0, BW, BH);
  const skin = p.skin ?? "#f7ead6";
  const torso = p.torso ?? "#6b84b8";
  const pants = p.pants ?? "#3a3a4a";
  const lean = p.lean ?? 0;
  const bob = p.bob ?? 0;
  const lL = p.legL ?? [0, 0];
  const lR = p.legR ?? [0, 0];
  const aL = p.armL ?? [-6, -8];
  const aR = p.armR ?? [6, -8];
  c.save();
  c.translate(300, 975);
  c.rotate(R(lean) * 0.0);
  c.translate(-300, -975 - bob);
  const hipY = 640;
  const shY = 350;
  // far leg + arm
  limb(c, 280, hipY, 165, 170, lL, 10);
  const footL = tip(...tip(280, hipY, 165, lL[0]), 170, lL[0] + lL[1]);
  if (p.robe) slipper(c, footL[0], footL[1], p.robeTrim ?? "#8a3a2a");
  else if (!p.barefoot) seg(c, footL[0], footL[1], footL[0] + 40, footL[1], 10);
  else poly(c, [[footL[0] - 8, footL[1] - 8], [footL[0] + 36, footL[1] - 6], [footL[0] + 40, footL[1] + 6], [footL[0] - 8, footL[1] + 6]], p.skin ?? "#f7ead6", INKC, 5);
  if (p.pangsi) trouser(c, 280, hipY, lL, p.pangsi);
  const handL = limb(c, 300 - 40 * (p.wide ?? 0.95), shY + 14, 130, 120, aL, 9);
  if (p.robe) sleeve(c, 300 - 40 * (p.wide ?? 0.95), shY + 14, aL, p.robe, p.robeTrim ?? p.sash);
  else if (p.sleeves) sleeve(c, 300 - 40 * (p.wide ?? 0.95), shY + 14, aL, p.sleeves);
  c.fillStyle = INKC;
  c.beginPath();
  c.arc(handL[0], handL[1], 12, 0, Math.PI * 2);
  c.fill();
  if (p.propHand === "L") drawProp(c, p, handL[0], handL[1], handL[2]);
  // torso (lean: shift top)
  const tx = lean * 3.2;
  if (p.coat) {
    poly(c, [[238 + tx, shY - 4], [362 + tx, shY - 4], [372, hipY + 40], [228, hipY + 40]], torso, INKC, 8);
    poly(c, [[286 + tx, shY - 4], [314 + tx, shY - 4], [300 + tx * 0.6, shY + 90]], "#f5efe0", INKC, 5);
    if (p.tie) poly(c, [[294 + tx, shY + 14], [306 + tx, shY + 14], [312 + tx * 0.8, shY + 120], [300 + tx * 0.8, shY + 136], [288 + tx * 0.8, shY + 120]], p.tie, INKC, 4);
  } else {
    const wd = p.wide ?? 1;
    poly(c, [[300 - 54 * wd + tx, shY - 2], [300 + 54 * wd + tx, shY - 2], [300 + 70 * wd, shY + 150], [300 + 64 * wd, hipY + 20], [300 - 64 * wd, hipY + 20], [300 - 70 * wd, shY + 150]], torso, INKC, 8);
    if (p.safari) {
      poly(c, [[300 - 18 + tx, shY - 4], [300 + tx, shY + 34], [300 + 18 + tx, shY - 4]], torso, INKC, 5);
      [-1, 1].forEach((sd) => poly(c, [[300 + sd * 22 * wd + tx, shY + 50], [300 + sd * 52 * wd + tx, shY + 50], [300 + sd * 52 * wd + tx, shY + 100], [300 + sd * 22 * wd + tx, shY + 100]], torso, INKC, 4));
      [0, 1, 2, 3].forEach((k) => {
        c.fillStyle = INKC;
        c.beginPath();
        c.arc(300 + tx * (1 - k * 0.2), shY + 50 + k * 60, 5, 0, Math.PI * 2);
        c.fill();
      });
    }
    if (p.badge) poly(c, [[262 + tx, shY + 46], [282 + tx, shY + 46], [282 + tx, shY + 66], [272 + tx, shY + 78], [262 + tx, shY + 66]], "#e0b040", INKC, 3);
    if (p.stars) {
      [-1, 1].forEach((sd) => {
        for (let k = 0; k < p.stars!; k++) {
          const cx = 300 + sd * (30 + k * 10) * (p.wide ?? 1) + tx;
          const cy = shY + 6 - (k % 2) * 4;
          c.fillStyle = "#f2c230";
          c.beginPath();
          for (let a = 0; a < 10; a++) {
            const rr = a % 2 ? 4 : 9;
            const an = (a * Math.PI) / 5 - Math.PI / 2;
            a ? c.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr) : c.moveTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr);
          }
          c.closePath();
          c.fill();
          c.strokeStyle = INKC;
          c.lineWidth = 2;
          c.stroke();
        }
      });
    }
    if (p.belt) poly(c, [[300 - 64 * wd, hipY - 8], [300 + 64 * wd, hipY - 8], [300 + 64 * wd, hipY + 12], [300 - 64 * wd, hipY + 12]], p.belt, INKC, 4);
  }
  if (p.apron) poly(c, [[260 + tx * 0.8, shY + 60], [340 + tx * 0.8, shY + 60], [352, hipY + 130], [248, hipY + 130]], p.apron, INKC, 6);
  if (!p.coat) poly(c, [[246, hipY + 10], [354, hipY + 10], [350, hipY + 40], [250, hipY + 40]], pants, INKC, 6);
  // near leg
  limb(c, 322, hipY, 165, 170, lR, 10);
  const footR = tip(...tip(322, hipY, 165, lR[0]), 170, lR[0] + lR[1]);
  if (p.robe) slipper(c, footR[0], footR[1], p.robeTrim ?? "#8a3a2a");
  else if (!p.barefoot) seg(c, footR[0], footR[1], footR[0] + 40, footR[1], 10);
  else poly(c, [[footR[0] - 8, footR[1] - 8], [footR[0] + 36, footR[1] - 6], [footR[0] + 40, footR[1] + 6], [footR[0] - 8, footR[1] + 6]], p.skin ?? "#f7ead6", INKC, 5);
  if (p.pangsi) trouser(c, 322, hipY, lR, p.pangsi);
  if (p.skirt) {
    const wd = p.wide ?? 1;
    poly(c, [[300 - 66 * wd, hipY - 30], [300 + 66 * wd, hipY - 30], [300 + 80 * wd, 868], [300 - 80 * wd, 868]], p.skirt, INKC, 8);
    c.save();
    c.beginPath();
    c.moveTo(300 - 66 * wd, hipY - 30);
    c.lineTo(300 + 66 * wd, hipY - 30);
    c.lineTo(300 + 80 * wd, 868);
    c.lineTo(300 - 80 * wd, 868);
    c.closePath();
    c.clip();
    batikDots(c, 200, hipY - 30, 400, 868, p.batik ?? "#f2d8a0");
    c.restore();
    seg(c, 300 + 30 * wd, hipY - 20, 300 + 46 * wd, 866, 4, INKC);
  }
  if (p.kebaya) {
    const wd = p.wide ?? 1;
    poly(c, [[300 - 54 * wd + tx, shY - 2], [300 + 54 * wd + tx, shY - 2], [300 + 70 * wd, shY + 150], [300 + 72 * wd, hipY + 40], [300 - 72 * wd, hipY + 40], [300 - 70 * wd, shY + 150]], p.kebaya, INKC, 8);
    for (let k = 0; k < 8; k++) {
      c.beginPath();
      c.arc(300 - 64 * wd + k * 18 * wd, hipY + 40, 9, 0, Math.PI);
      c.fillStyle = "#fff6f0";
      c.fill();
      c.strokeStyle = INKC;
      c.lineWidth = 3;
      c.stroke();
    }
    poly(c, [[300 - 26 + tx, shY - 4], [300 + 26 + tx, shY - 4], [300 + 8, hipY + 36], [300 - 8, hipY + 36]], "#fff6f0", INKC, 4);
    [0, 1, 2].forEach((k) => {
      c.fillStyle = "#e0b040";
      c.beginPath();
      c.arc(300 + tx * (1 - k * 0.3), shY + 70 + k * 70, 7, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });
  }
  if (p.selendang) poly(c, [[300 + 50 + tx, shY - 4], [300 + 76 + tx, shY + 10], [300 - 50, hipY + 50], [300 - 74, hipY + 30]], p.selendang, INKC, 5);
  if (p.slung) {
    poly(c, [[300 + 40 + tx, shY - 10], [300 + 74 + tx, shY + 14], [300 - 56, hipY + 40], [300 - 84, hipY + 10]], p.slung, INKC, 6);
    for (let k = 1; k < 6; k++) {
      const a = k / 6;
      seg(c, 300 + 40 + tx + (-96 - tx) * a, shY - 10 + (hipY + 20 - shY) * a, 300 + 74 + tx + (-130 - tx) * a, shY + 14 + (hipY + 26 - shY - 14) * a, 4, "rgba(255,255,255,0.45)");
    }
  }
  if (p.golok) {
    poly(c, [[300 - 70, hipY - 6], [300 - 50, hipY - 16], [300 - 126, hipY + 150], [300 - 146, hipY + 140]], "#5a3a1a", INKC, 5);
    poly(c, [[300 - 52, hipY - 14], [300 - 36, hipY - 40], [300 - 22, hipY - 34], [300 - 38, hipY - 8]], "#2a1a10", INKC, 4);
  }
  if (p.robe) {
    const wd = p.wide ?? 1;
    poly(c, [[300 - 56 * wd + tx, shY - 2], [300 + 56 * wd + tx, shY - 2], [300 + 92 * wd, 905], [300 - 92 * wd, 905]], p.robe, INKC, 8);
    if (p.robeTrim) {
      seg(c, 300 + tx, shY + 10, 300, 900, 10, p.robeTrim);
      seg(c, 300 - 90 * wd, 896, 300 + 90 * wd, 896, 10, p.robeTrim);
    }
    if (p.sash) poly(c, [[300 - 66 * wd, hipY - 20], [300 + 66 * wd, hipY - 20], [300 + 68 * wd, hipY + 14], [300 - 68 * wd, hipY + 14]], p.sash, INKC, 4);
    // shading on the far side + folds
    c.save();
    c.beginPath();
    c.moveTo(300 + 20 * wd + tx, shY);
    c.lineTo(300 + 56 * wd + tx, shY - 2);
    c.lineTo(300 + 92 * wd, 905);
    c.lineTo(300 + 40 * wd, 905);
    c.closePath();
    c.fillStyle = "rgba(20,10,30,0.16)";
    c.fill();
    c.restore();
    [-0.45, 0.15].forEach((k) => seg(c, 300 + k * 60 * wd, hipY + 40, 300 + k * 80 * wd, 880, 3, "rgba(20,10,30,0.25)"));
    // embroidered hem + collar
    const hemCol = p.robeTrim ?? p.sash ?? "#c8a050";
    poly(c, [[300 - 90 * wd, 862], [300 + 90 * wd, 862], [300 + 92 * wd, 905], [300 - 92 * wd, 905]], hemCol, INKC, 5);
    for (let k = 0; k < 7; k++) {
      const cx = 300 - 72 * wd + k * 24 * wd;
      poly(c, [[cx, 870], [cx + 8, 883], [cx, 896], [cx - 8, 883]], "#fff6d8", INKC, 2);
    }
    poly(c, [[300 - 34 + tx, shY - 4], [300 + 34 + tx, shY - 4], [300 + tx, shY + 46]], hemCol, INKC, 5);
  }
  // head
  const hx = 300 + tx * 1.3;
  c.save();
  c.translate(hx, 330);
  c.rotate(R(lean) * 0.6);
  c.translate(-300, -330);
  // neck
  seg(c, 300, 326, 300, 352, 9);
  // hair/hat behind
  const hatCol = p.hatColor ?? "#5a3a22";
  c.beginPath();
  c.moveTo(300, 88);
  c.bezierCurveTo(382, 88, 422, 150, 420, 212);
  c.bezierCurveTo(418, 276, 372, 320, 300, 320);
  c.bezierCurveTo(228, 320, 182, 276, 180, 212);
  c.bezierCurveTo(178, 150, 218, 88, 300, 88);
  c.closePath();
  c.fillStyle = skin;
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 10;
  c.stroke();
  // face
  const ex = [262, 338];
  const look = (p.look ?? 0) * 7;
  const big = p.expr === "shock" || p.expr === "scared" ? 24 : 19;
  const blink = p.blink || p.expr === "sleepy";
  const eyeY = 212;
  ex.forEach((x, i) => {
    if (blink) {
      seg(c, x - 16, eyeY + 4, x + 16, eyeY + 4, 6);
    } else if (p.expr === "happy") {
      c.strokeStyle = INKC;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(x, eyeY + 8, 15, Math.PI, 0);
      c.stroke();
    } else if (p.expr === "laugh") {
      // squeezed shut ">" "<" eyes
      c.strokeStyle = INKC;
      c.lineWidth = 7;
      c.beginPath();
      const d = i === 0 ? 1 : -1;
      c.moveTo(x - 14 * d, eyeY - 12);
      c.lineTo(x + 12 * d, eyeY);
      c.lineTo(x - 14 * d, eyeY + 12);
      c.stroke();
    } else if (p.expr === "disgust") {
      c.strokeStyle = INKC;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(x - 16, eyeY + 2);
      c.lineTo(x + 16, eyeY - 2 + (i ? 6 : -6));
      c.stroke();
    } else {
      c.beginPath();
      c.arc(x, eyeY, big, 0, Math.PI * 2);
      c.fillStyle = "#fffdf6";
      c.fill();
      c.strokeStyle = INKC;
      c.lineWidth = 5;
      c.stroke();
      c.beginPath();
      c.arc(x + look, eyeY + (p.expr === "sad" ? 4 : 0), p.expr === "shock" ? 5 : 8, 0, Math.PI * 2);
      c.fillStyle = INKC;
      c.fill();
    }
    // brows
    let ang = 0;
    let by = eyeY - 36;
    if (p.expr === "worried" || p.expr === "scared" || p.expr === "sad") ang = i === 0 ? -18 : 18;
    if (p.expr === "angry") ang = i === 0 ? 22 : -22;
    if (p.expr === "smug") ang = i === 0 ? 8 : -2;
    if (p.expr === "shock") by -= 12;
    if (p.expr === "laugh") by -= 8;
    if (p.expr === "disgust") ang = i === 0 ? 14 : -14;
    if (p.expr === "think") ang = i === 0 ? 0 : -16;
    c.save();
    c.translate(x, by);
    c.rotate(R(ang));
    seg(c, -17, 0, 17, 0, 7);
    c.restore();
  });
  if (p.beard) {
    c.fillStyle = p.beard;
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(212, 236);
    c.quadraticCurveTo(222, 336, 300, 356);
    c.quadraticCurveTo(378, 336, 388, 236);
    c.quadraticCurveTo(372, 268, 346, 280);
    c.quadraticCurveTo(300, 318, 254, 280);
    c.quadraticCurveTo(228, 268, 212, 236);
    c.fill();
    c.stroke();
    // skin window around the mouth
    c.fillStyle = p.skin ?? "#f7ead6";
    c.beginPath();
    c.ellipse(300, 272, 44, 26, 0, 0, Math.PI * 2);
    c.fill();
  }
  // mouth
  const my = 270;
  c.strokeStyle = INKC;
  c.lineWidth = 7;
  c.lineCap = "round";
  const mo = p.mouthOpen ?? 0;
  if (p.expr === "shock" || p.expr === "scared") {
    c.beginPath();
    c.ellipse(300, my + 6, 16, 22, 0, 0, Math.PI * 2);
    c.fillStyle = INKC;
    c.fill();
  } else if (p.expr === "happy") {
    c.beginPath();
    c.arc(300, my - 6, 26, 0.15, Math.PI - 0.15);
    c.stroke();
  } else if (p.expr === "angry" || p.expr === "sad" || p.expr === "worried") {
    c.beginPath();
    c.arc(300, my + 26, 22, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
  } else if (p.expr === "smug") {
    c.beginPath();
    c.moveTo(280, my + 4);
    c.quadraticCurveTo(310, my + 18, 330, my - 4);
    c.stroke();
  } else if (p.expr === "laugh") {
    // big open "D" mouth with tongue
    const o = 0.75 + 0.25 * mo;
    c.beginPath();
    c.moveTo(258, my - 10);
    c.lineTo(342, my - 10);
    c.quadraticCurveTo(342, my + 48 * o, 300, my + 50 * o);
    c.quadraticCurveTo(258, my + 48 * o, 258, my - 10);
    c.closePath();
    c.fillStyle = "#3a0f16";
    c.fill();
    c.lineWidth = 5;
    c.stroke();
    c.fillStyle = "#e86a7a";
    c.beginPath();
    c.ellipse(300, my + 26 * o, 16, 9 * o, 0, 0, Math.PI * 2);
    c.fill();
    // laugh tears
    c.fillStyle = "#8fd3ff";
    [[236, 232], [364, 232]].forEach(([tx2, ty]) => {
      c.beginPath();
      c.ellipse(tx2, ty + mo * 6, 7, 11, 0, 0, Math.PI * 2);
      c.fill();
    });
  } else if (p.expr === "disgust") {
    c.beginPath();
    c.moveTo(276, my + 8);
    c.quadraticCurveTo(288, my - 4, 300, my + 8);
    c.quadraticCurveTo(312, my + 20, 324, my + 4);
    c.stroke();
    // greenish cheeks
    c.fillStyle = "rgba(140,190,90,0.45)";
    [[238, 252], [362, 252]].forEach(([x2, y2]) => {
      c.beginPath();
      c.ellipse(x2, y2, 22, 14, 0, 0, Math.PI * 2);
      c.fill();
    });
  } else if (p.expr === "think") {
    seg(c, 286, my + 8, 314, my + 2, 7);
  } else if (p.expr === "talk") {
    c.beginPath();
    c.ellipse(300, my + 4, 18, 8 + mo * 14, 0, 0, Math.PI * 2);
    c.fillStyle = INKC;
    c.fill();
  } else {
    seg(c, 282, my + 4, 318, my + 4, 7);
  }
  if (p.mustache) {
    c.save();
    if (p.expr === "laugh" || p.expr === "shock") c.translate(0, -10);
    c.fillStyle = "#2b1a12";
    c.beginPath();
    c.moveTo(300, my - 12);
    c.quadraticCurveTo(258, my - 26, 236, my - 2);
    c.quadraticCurveTo(262, my + 2, 300, my - 6);
    c.quadraticCurveTo(338, my + 2, 364, my - 2);
    c.quadraticCurveTo(342, my - 26, 300, my - 12);
    c.fill();
    c.stroke();
    c.restore();
  }
  // hats
  const hat = p.hat ?? "none";
  if (hat === "cap") {
    poly(c, [[196, 150], [200, 112], [300, 84], [400, 112], [404, 150], [330, 138], [250, 138]], hatCol, INKC, 8);
    poly(c, [[196, 150], [330, 146], [340, 166], [200, 170]], hatCol, INKC, 8);
  } else if (hat === "bowler") {
    poly(c, [[230, 130], [240, 80], [300, 62], [360, 80], [370, 130]], hatCol, INKC, 8);
    poly(c, [[196, 134], [404, 134], [394, 154], [206, 154]], hatCol, INKC, 8);
  } else if (hat === "tophat") {
    poly(c, [[236, 128], [240, 20], [360, 20], [364, 128]], hatCol, INKC, 8);
    poly(c, [[196, 130], [404, 130], [396, 152], [204, 152]], hatCol, INKC, 8);
    poly(c, [[238, 108], [362, 108], [362, 124], [238, 124]], "#c93b3b", INKC, 4);
  } else if (hat === "helmet") {
    poly(c, [[196, 160], [206, 100], [300, 70], [394, 100], [404, 160]], hatCol, INKC, 8);
  } else if (hat === "bonnet") {
    poly(c, [[184, 220], [186, 120], [300, 70], [414, 120], [416, 220], [380, 150], [220, 150]], hatCol, INKC, 8);
  } else if (hat === "kerchief") {
    poly(c, [[190, 170], [210, 100], [300, 78], [390, 100], [410, 170], [350, 128], [250, 128]], hatCol, INKC, 8);
    poly(c, [[392, 160], [440, 190], [420, 230], [396, 180]], hatCol, INKC, 6);
  } else if (hat === "iket") {
    poly(c, [[190, 172], [196, 112], [300, 88], [404, 112], [410, 172], [300, 156]], hatCol, INKC, 7);
    c.save();
    c.beginPath();
    c.moveTo(190, 172);
    c.lineTo(196, 112);
    c.lineTo(300, 88);
    c.lineTo(404, 112);
    c.lineTo(410, 172);
    c.closePath();
    c.clip();
    batikDots(c, 186, 86, 414, 176, p.batik ?? "#e8c070", 22);
    c.restore();
    poly(c, [[252, 120], [300, 40], [348, 120]], hatCol, INKC, 7);
    poly(c, [[392, 140], [452, 112], [446, 152], [404, 166]], hatCol, INKC, 6);
    seg(c, 196, 150, 404, 150, 4, "rgba(0,0,0,0.3)");
  } else if (hat === "sanggul") {
    c.fillStyle = p.hair ?? "#1c1418";
    c.beginPath();
    c.arc(400, 140, 44, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.stroke();
    poly(c, [[186, 196], [192, 122], [250, 84], [350, 84], [408, 122], [414, 196], [390, 150], [300, 128], [210, 150]], p.hair ?? "#1c1418", INKC, 6);
    seg(c, 380, 108, 430, 90, 5, "#e0b040");
    c.fillStyle = "#e0b040";
    c.beginPath();
    c.arc(432, 88, 8, 0, Math.PI * 2);
    c.fill();
  } else if (hat === "caping") {
    poly(c, [[140, 170], [300, 40], [460, 170]], hatCol, INKC, 7);
    [200, 250, 300, 350, 400].forEach((x) => seg(c, 300, 48, x, 166, 3, "rgba(0,0,0,0.25)"));
  } else if (hat === "turban") {
    c.fillStyle = hatCol;
    poly(c, [[190, 170], [196, 110], [250, 76], [350, 76], [404, 110], [410, 170], [300, 150]], hatCol, INKC, 7);
    [100, 124, 148].forEach((y, i) => seg(c, 200 + i * 6, y + 6, 400 - i * 6, y - 4, 4, "rgba(0,0,0,0.25)"));
    c.beginPath();
    c.arc(300, 70, 22, 0, Math.PI * 2);
    c.fillStyle = hatCol;
    c.fill();
    c.stroke();
  } else if (hat === "tallturban") {
    poly(c, [[196, 160], [206, 40], [300, 6], [394, 40], [404, 160], [300, 146]], hatCol, INKC, 7);
    poly(c, [[284, 70], [316, 70], [300, 100]], "#e0b040", INKC, 3);
  } else if (hat === "crown") {
    poly(c, [[192, 168], [204, 110], [396, 110], [408, 168], [300, 156]], "#7a1f3a", INKC, 7);
    poly(c, [[206, 114], [214, 40], [250, 84], [300, 20], [350, 84], [386, 40], [394, 114]], "#f2c230", INKC, 7);
    [[250, 96, "#e63946"], [300, 92, "#3b78e7"], [350, 96, "#2bb673"]].forEach(([x, y, col]) => {
      c.beginPath();
      c.arc(x as number, y as number, 9, 0, Math.PI * 2);
      c.fillStyle = col as string;
      c.fill();
      c.lineWidth = 3;
      c.stroke();
    });
  } else if (hat === "guardhelmet") {
    poly(c, [[196, 160], [206, 100], [300, 40], [394, 100], [404, 160]], "#b8bfc8", INKC, 7);
    seg(c, 300, 40, 300, 10, 8, "#b8bfc8");
    seg(c, 300, 150, 300, 210, 8, "#8a95a5");
  } else if (hat === "peci") {
    if (p.sideHair) [-1, 1].forEach((sd) => poly(c, [[300 + sd * 112, 150], [300 + sd * 120, 200], [300 + sd * 104, 205]], p.sideHair!, INKC, 4));
    poly(c, [[206, 156], [214, 92], [300, 84], [386, 92], [394, 156], [300, 146]], "#151518", INKC, 7);
    seg(c, 220, 100, 380, 100, 3, "#3a3a44");
  } else if (hat === "policecap") {
    poly(c, [[204, 150], [212, 118], [176, 90], [300, 62], [424, 90], [388, 118], [396, 150]], hatCol, INKC, 7);
    poly(c, [[204, 150], [396, 150], [380, 176], [220, 176]], "#121216", INKC, 6);
    poly(c, [[288, 96], [312, 96], [314, 120], [300, 130], [286, 120]], "#e0b040", INKC, 3);
  } else if (hat === "wig") {
    poly(c, [[170, 250], [176, 120], [300, 60], [424, 120], [430, 250], [400, 190], [200, 190]], "#f2f2f2", INKC, 7);
  } else if (p.hair) {
    c.fillStyle = p.hair;
    c.beginPath();
    c.moveTo(188, 170);
    c.bezierCurveTo(196, 100, 260, 80, 300, 82);
    c.bezierCurveTo(350, 80, 410, 100, 414, 170);
    c.bezierCurveTo(380, 130, 220, 130, 188, 170);
    c.fill();
    c.stroke();
  }
  if (p.headphones) {
    c.strokeStyle = INKC;
    c.lineWidth = 12;
    c.beginPath();
    c.arc(300, 210, 132, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
    [-1, 1].forEach((sd) => poly(c, [[300 + sd * 112, 180], [300 + sd * 140, 180], [300 + sd * 140, 250], [300 + sd * 112, 250]], "#2a2a33", INKC, 5));
  }
  if (p.sweat) {
    c.fillStyle = "#8fd3ff";
    c.strokeStyle = INKC;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(410, 150);
    c.quadraticCurveTo(430, 186, 410, 196);
    c.quadraticCurveTo(388, 186, 410, 150);
    c.fill();
    c.stroke();
  }
  c.restore();
  // near arm
  const handR = limb(c, 300 + 40 * (p.wide ?? 0.95) + tx, shY + 14, 130, 120, aR, 9);
  if (p.robe) sleeve(c, 300 + 40 * (p.wide ?? 0.95) + tx, shY + 14, aR, p.robe, p.robeTrim ?? p.sash);
  else if (p.sleeves) sleeve(c, 300 + 40 * (p.wide ?? 0.95) + tx, shY + 14, aR, p.sleeves);
  c.fillStyle = INKC;
  c.beginPath();
  c.arc(handR[0], handR[1], 12, 0, Math.PI * 2);
  c.fill();
  if (p.propHand !== "L") drawProp(c, p, handR[0], handR[1], handR[2]);
  c.restore();
  // goo coverage from the feet up (only where the character is drawn)
  if (p.goo && p.goo > 0) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    const top = 980 - p.goo * 900;
    c.fillStyle = p.gooColor ?? "#5a2a10";
    c.beginPath();
    c.moveTo(0, 1000);
    c.lineTo(0, top);
    for (let x = 0; x <= BW; x += 30) c.lineTo(x, top + Math.sin(x * 0.05 + (p.seed ?? 0)) * 10 + ((x / 30) % 2) * 6);
    c.lineTo(BW, 1000);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,180,90,0.35)";
    c.fillRect(80, top + 6, 440, 6);
    c.restore();
  }
  if (p.wet && p.wet > 0) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(40,80,140,${0.22 * Math.min(1, p.wet * 1.5)})`;
    const wy = Math.max(372, 1000 - p.wet * 1000);
    c.fillRect(0, wy, BW, 1000 - wy);
    c.restore();
    c.fillStyle = "#8fd3ff";
    c.strokeStyle = INKC;
    c.lineWidth = 3;
    const sd = p.seed ?? 0;
    for (let k = 0; k < Math.round(8 * p.wet); k++) {
      const x = 220 + ((k * 73 + sd * 31) % 160);
      const y = 300 + ((k * 137 + sd * 17) % 560);
      c.beginPath();
      c.moveTo(x, y - 14);
      c.quadraticCurveTo(x + 9, y, x, y + 8);
      c.quadraticCurveTo(x - 9, y, x, y - 14);
      c.fill();
      c.stroke();
    }
  }
};

/** Camera-facing 2D bean card in the 3D world; drawn fresh per frame (reusing a texture left cards blank in video renders). */
export const BeanCard: React.FC<{ position: Vec3; height?: number; params: BeanParams; flip?: boolean; roll?: number; shadow?: boolean; tint?: string; faceCam?: boolean; yaw?: number }> = ({ position, height = 2.0, params, flip = false, roll = 0, shadow = true, tint = "#fff1e0", faceCam = true, yaw = 0 }) => {
  const frameNo = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const { cv, tex, buf } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = BW;
    cv.height = BH;
    const buf = new Uint8Array(BW * BH * 4);
    const tex = new THREE.DataTexture(buf, BW, BH, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    return { cv, tex, buf };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameNo]);
  useEffect(() => () => tex.dispose(), [tex]);
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  drawBean(ctx, params);
  buf.set(ctx.getImageData(0, 0, BW, BH).data);
  tex.needsUpdate = true;
  const w = (height * BW) / BH;
  const face = faceCam ? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]) : yaw;
  return (
    <group position={position} rotation={[0, face, 0]}>
      <group rotation={[0, 0, roll]}>
        <mesh position={[0, height / 2 - height * 0.025, 0]} scale={[flip ? -1 : 1, 1, 1]}>
          <planeGeometry args={[w, height]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} color={tint} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {shadow && (
        <mesh position={[0.1, 0.015, 0.05]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.4, 1]}>
          <circleGeometry args={[0.55 * (height / 2.0), 20]} />
          <meshBasicMaterial color="#1a1030" transparent opacity={0.38} />
        </mesh>
      )}
    </group>
  );
};

/** simple walk cycle poses for BeanParams */
export const beanWalk = (phase: number, amp = 1): Partial<BeanParams> => {
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  return {
    legL: [28 * s * amp, Math.max(0, -c) * 28 * amp],
    legR: [-28 * s * amp, Math.max(0, c) * 28 * amp],
    armL: [-22 * s * amp, -10],
    armR: [22 * s * amp, -10],
    bob: Math.abs(s) * 8 * amp,
    lean: 3 * amp,
  };
};

/**
 * World position of a bean card's hand (for attaching real 3D props that can change hands).
 * Mirrors the canvas maths in drawBean: shoulders at (300 ± 40*wide [+lean*3.2 for R], 364), upper arm 130, forearm 120,
 * whole drawing lifted by `bob`. The card faces the camera (yaw = atan2(cam - pos)).
 */
export const beanHandCanvas = (p: BeanParams, side: "L" | "R"): [number, number] => {
  const wide = p.wide ?? 0.95;
  const tx = (p.lean ?? 0) * 3.2;
  const a = side === "L" ? (p.armL ?? [-6, -8]) : (p.armR ?? [6, -8]);
  const sx = side === "L" ? 300 - 40 * wide : 300 + 40 * wide + tx;
  const sy = 350 + 14;
  const e = tip(sx, sy, 130, a[0]);
  const h = tip(e[0], e[1], 120, a[0] + a[1]);
  return [h[0], h[1] - (p.bob ?? 0)];
};
export const beanCanvasToWorld = (cx: number, cy: number, position: Vec3, height: number, camPos: Vec3, flip = false, toCam = 0.04): Vec3 => {
  const w = (height * BW) / BH;
  const lx = (cx / BW - 0.5) * w * (flip ? -1 : 1);
  const ly = height * (0.975 - cy / BH);
  const face = Math.atan2(camPos[0] - position[0], camPos[2] - position[2]);
  return [position[0] + lx * Math.cos(face) + Math.sin(face) * toCam, position[1] + ly, position[2] - lx * Math.sin(face) + Math.cos(face) * toCam];
};
export const beanHandWorld = (p: BeanParams, side: "L" | "R", position: Vec3, height: number, camPos: Vec3, flip = false): Vec3 => {
  const [cx, cy] = beanHandCanvas(p, side);
  return beanCanvasToWorld(cx, cy, position, height, camPos, flip, 0.06);
};

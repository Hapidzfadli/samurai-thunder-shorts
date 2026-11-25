import React, { useEffect, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { random } from "remotion";
import * as THREE from "three";
import { Vec3 } from "./objects";

const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;
export const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (x: number) => x * x * (3 - 2 * x);
export const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/* ------------------------------------------------------------------ */
/* Procedural textures (deterministic, no assets needed)                */
/* ------------------------------------------------------------------ */
export const hash = (x: number, y = 0) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const useTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) =>
  useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d")!);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    if (repeat) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
    }
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

const STRATA = ["#7a2f3e", "#b8431f", "#d9622b", "#e8893f", "#f2ad5e", "#c2552d", "#8f3a35", "#e07a3a", "#f4c07a", "#a63f2a", "#6b2f4a"];
export const useStrata = (repeat: [number, number] = [2, 1]) =>
  useTex("strata", 1024, 512, (g) => {
    g.fillStyle = "#c2552d";
    g.fillRect(0, 0, 1024, 512);
    let y = 0;
    let band = 0;
    while (y < 512) {
      const hgt = 18 + hash(band, 3) * 40;
      const col = STRATA[band % STRATA.length];
      for (let x = 0; x < 1024; x += 4) {
        const wy = y + Math.sin(x * 0.012 + band * 1.7) * 7 + Math.sin(x * 0.041 + band) * 3;
        g.fillStyle = col;
        g.fillRect(x, wy, 4, hgt + 12);
      }
      // dark seam under each band
      for (let x = 0; x < 1024; x += 4) {
        const wy = y + hgt + Math.sin(x * 0.012 + (band + 1) * 1.7) * 7;
        g.fillStyle = "rgba(60,20,20,0.28)";
        g.fillRect(x, wy, 4, 3);
      }
      y += hgt;
      band++;
    }
    // vertical erosion streaks + grain
    for (let i = 0; i < 260; i++) {
      const x = hash(i, 9) * 1024;
      const y0 = hash(i, 11) * 512;
      g.fillStyle = `rgba(40,12,12,${0.05 + hash(i, 13) * 0.1})`;
      g.fillRect(x, y0, 2 + hash(i, 5) * 4, 40 + hash(i, 7) * 160);
    }
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = hash(i, 21) > 0.5 ? "rgba(255,230,190,0.07)" : "rgba(40,10,10,0.08)";
      g.fillRect(hash(i, 22) * 1024, hash(i, 23) * 512, 2, 2);
    }
  }, repeat);

export const useSand = () =>
  useTex("sand", 1024, 1024, (g) => {
    g.fillStyle = "#dfae72";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 9000; i++) {
      const a = hash(i, 1);
      g.fillStyle = a > 0.55 ? `rgba(255,235,190,${0.1 + a * 0.15})` : `rgba(120,70,30,${0.1 + a * 0.12})`;
      g.fillRect(hash(i, 2) * 1024, hash(i, 3) * 1024, 2 + hash(i, 4) * 3, 2 + hash(i, 5) * 3);
    }
    for (let i = 0; i < 380; i++) {
      const x = hash(i, 6) * 1024;
      const y = hash(i, 7) * 1024;
      const r = 3 + hash(i, 8) * 7;
      g.fillStyle = `rgb(${150 + hash(i, 9) * 50},${110 + hash(i, 10) * 40},${80 + hash(i, 12) * 30})`;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.7, hash(i, 14) * 3, 0, 7);
      g.fill();
      g.fillStyle = "rgba(255,240,210,0.35)";
      g.beginPath();
      g.ellipse(x - r * 0.25, y - r * 0.25, r * 0.4, r * 0.25, 0, 0, 7);
      g.fill();
    }
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = "rgba(255,230,180,0.08)";
      g.lineWidth = 2;
      g.beginPath();
      const y = hash(i, 31) * 1024;
      g.moveTo(0, y);
      g.bezierCurveTo(300, y + 30, 700, y - 30, 1024, y + 10);
      g.stroke();
    }
  }, [10, 10]);

const useRoad = () =>
  useTex("road", 512, 512, (g) => {
    g.fillStyle = "#3d3c44";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = hash(i, 1) > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.18)";
      g.fillRect(hash(i, 2) * 512, hash(i, 3) * 512, 2, 2);
    }
    g.fillStyle = "#f2c230";
    g.fillRect(0, 248, 200, 14);
    g.fillRect(256, 248, 200, 14);
    g.fillStyle = "rgba(255,255,255,0.5)";
    g.fillRect(0, 6, 512, 6);
    g.fillRect(0, 500, 512, 6);
  }, [6, 1]);

export const usePlanks = (base = "#9a5a30") =>
  useTex("planks" + base, 512, 512, (g) => {
    g.fillStyle = "#2a160b";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++) {
      const tone = 0.8 + hash(i, 2) * 0.35;
      g.fillStyle = base;
      g.fillRect(i * 64 + 3, 0, 58, 512);
      g.fillStyle = `rgba(0,0,0,${0.35 - tone * 0.2})`;
      g.fillRect(i * 64 + 3, 0, 58, 512);
      for (let k = 0; k < 16; k++) {
        g.strokeStyle = `rgba(50,22,8,${0.15 + hash(i, k) * 0.25})`;
        g.lineWidth = 1.5;
        const x = i * 64 + 8 + hash(i, k + 40) * 48;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 2, 512);
        g.stroke();
      }
      g.fillStyle = "rgba(30,14,6,0.55)";
      g.beginPath();
      g.arc(i * 64 + 32, 60 + hash(i, 77) * 400, 4, 0, 7);
      g.fill();
    }
  });

export const Sign: React.FC<{ position: Vec3; rotation?: Vec3; size: [number, number]; text: string; sub?: string; bg: string; fg: string; accent?: string }> = ({ position, rotation = [0, 0, 0], size, text, sub, bg, fg, accent = "#ffd23f" }) => {
  const w = 1024;
  const h = Math.round((1024 * size[1]) / size[0]);
  const tex = useTex(`${text}${sub}${bg}`, w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) {
      g.fillStyle = `rgba(0,0,0,${hash(i, 1) * 0.12})`;
      g.fillRect(hash(i, 2) * w, hash(i, 3) * h, 3, 3);
    }
    g.strokeStyle = accent;
    g.lineWidth = 12;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `bold ${sub ? h * 0.46 : h * 0.6}px Anton, Impact, 'DejaVu Sans', sans-serif`;
    g.fillText(text, w / 2, sub ? h * 0.38 : h * 0.54);
    if (sub) {
      g.fillStyle = accent;
      g.font = `bold ${h * 0.2}px Anton, Impact, 'DejaVu Sans', sans-serif`;
      g.fillText(sub, w / 2, h * 0.78);
    }
  });
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* Hand-drawn 2D character on a card inside the 3D world                */
/* ------------------------------------------------------------------ */
export type ToonExpr = "neutral" | "smirk" | "surprised" | "worried" | "happy" | "laugh" | "angry" | "nervous" | "sleepy";
export type ToonParams = {
  expr: ToonExpr;
  face?: string;
  shirt: string;
  pants?: string;
  hat?: "cap" | "bowler" | "bucket" | "hair" | "short" | "bald" | "hijab" | "curlers" | "bun" | "none";
  shades?: boolean;
  headphones?: boolean;
  whistle?: boolean;
  pattern?: "batik" | "flower";
  mustache?: boolean;
  belly?: number;
  tie?: string;
  lanyard?: boolean;
  glasses?: boolean;
  tape?: boolean;
  small?: boolean;
  kind?: "person" | "box" | "cat"; // a cardboard-box character (data packet) or a cat
  rim?: { color: string; side: -1 | 1 }; // cinematic rim light from the scene
  tint?: string; // ambient colour wash (rgba)
  hatColor?: string;
  armL?: [number, number]; // [upper, fore-relative] radians from straight down, + = toward screen-right
  armR?: [number, number];
  legL?: number;
  legR?: number;
  kneeL?: number; // shin angle relative to the thigh (negative = knee bends)
  kneeR?: number;
  bob?: number; // lifts the whole body (px, card space)
  profile?: boolean; // legs/feet drawn as a side-view stride (walking sideways)
  prop?: "can" | "box" | "mic" | "cane" | "none";
  canShake?: number;
  sweat?: number;
  foam?: number;
  steam?: number;
  lean?: number;
  squash?: number;
  wet?: number;
  look?: number; // pupil x offset -1..1
  seed?: number;
};
const INK = "#16110f";
const CW = 1024;
const CH = 1600;

const wob = (seed: number, i: number, amp: number) => (hash(seed * 7.1 + i, seed) - 0.5) * 2 * amp;

const inkLine = (g: CanvasRenderingContext2D, pts: [number, number][], w: number, seed: number) => {
  g.lineCap = "round";
  g.lineJoin = "round";
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = INK;
    g.lineWidth = w * (pass ? 0.55 : 1);
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = pass ? wob(seed, i * 3 + pass, 2.2) : 0;
      const jy = pass ? wob(seed, i * 3 + pass + 1, 2.2) : 0;
      if (i === 0) g.moveTo(x + jx, y + jy);
      else g.lineTo(x + jx, y + jy);
    });
    g.stroke();
  }
};

const inkEllipse = (g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, fill: string, lw: number, seed: number, rot = 0) => {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.fillStyle = fill;
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.lineJoin = "round";
  g.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wob(seed, i, 0.012);
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
};

const limb = (g: CanvasRenderingContext2D, from: [number, number], a1: number, a2: number, l1: number, l2: number, w: number, seed: number): [number, number] => {
  const e: [number, number] = [from[0] + Math.sin(a1) * l1, from[1] + Math.cos(a1) * l1];
  const h: [number, number] = [e[0] + Math.sin(a1 + a2) * l2, e[1] + Math.cos(a1 + a2) * l2];
  inkLine(g, [from, e, h], w, seed);
  return h;
};

const grade = (g: CanvasRenderingContext2D, p: ToonParams) => {
  if (!p.rim && !p.tint) return;
  g.save();
  g.globalCompositeOperation = "source-atop";
  if (p.tint) {
    g.fillStyle = p.tint;
    g.fillRect(0, 0, CW, CH);
  }
  if (p.rim) {
    const left = p.rim.side < 0;
    const gr = g.createLinearGradient(left ? CW * 0.2 : CW * 0.8, 0, left ? CW * 0.31 : CW * 0.69, 0);
    gr.addColorStop(0, p.rim.color);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, CW, CH);
  }
  g.restore();
};

const drawCat = (g: CanvasRenderingContext2D, p: ToonParams) => {
  const sd = p.seed ?? 1;
  const fur = p.shirt;
  const tail = Math.sin((p.squash ?? 0) * 6) * 18;
  // tail
  g.strokeStyle = INK;
  g.lineCap = "round";
  g.lineWidth = 40;
  g.beginPath();
  g.moveTo(330, 640);
  g.bezierCurveTo(470, 640 + tail, 470, 520, 410 + tail, 470);
  g.stroke();
  g.strokeStyle = fur;
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(330, 640);
  g.bezierCurveTo(470, 640 + tail, 470, 520, 410 + tail, 470);
  g.stroke();
  // body
  inkEllipse(g, 256, 650, 132, 120, fur, 11, sd + 1);
  // legs
  [-1, 1].forEach((sg) => inkEllipse(g, 256 + sg * 70, 760, 34, 22, fur, 8, sd + 2 + sg));
  // head
  inkEllipse(g, 256, 470, 112, 98, fur, 11, sd + 3);
  [-1, 1].forEach((sg) => {
    g.fillStyle = fur;
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(256 + sg * 100, 430);
    g.lineTo(256 + sg * 92, 330);
    g.lineTo(256 + sg * 28, 392);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#f6a6b8";
    g.beginPath();
    g.moveTo(256 + sg * 86, 410);
    g.lineTo(256 + sg * 84, 356);
    g.lineTo(256 + sg * 48, 392);
    g.closePath();
    g.fill();
  });
  // glowing eyes
  [-1, 1].forEach((sg) => {
    const grd = g.createRadialGradient(256 + sg * 44, 468, 4, 256 + sg * 44, 468, 54);
    grd.addColorStop(0, "rgba(255,240,120,0.9)");
    grd.addColorStop(1, "rgba(255,240,120,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(256 + sg * 44, 468, 54, 0, 7);
    g.fill();
    inkEllipse(g, 256 + sg * 44, 468, 24, p.expr === "surprised" ? 30 : 22, "#ffe24a", 7, sd + 5 + sg);
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(256 + sg * 44, 468, p.expr === "surprised" ? 9 : 5, p.expr === "surprised" ? 24 : 18, 0, 0, 7);
    g.fill();
  });
  g.fillStyle = "#f08a9a";
  g.beginPath();
  g.moveTo(246, 506);
  g.lineTo(266, 506);
  g.lineTo(256, 520);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(256, 520);
  g.quadraticCurveTo(236, 548, 214, 534);
  g.moveTo(256, 520);
  g.quadraticCurveTo(276, 548, 298, 534);
  g.stroke();
  g.lineWidth = 5;
  [-1, 1].forEach((sg) =>
    [0, 1].forEach((i) => {
      g.beginPath();
      g.moveTo(256 + sg * 50, 514 + i * 14);
      g.lineTo(256 + sg * 130, 502 + i * 30);
      g.stroke();
    })
  );
  // stripes
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 8;
  [-1, 0, 1].forEach((i) => {
    g.beginPath();
    g.moveTo(256 + i * 40, 380);
    g.lineTo(256 + i * 40, 410);
    g.stroke();
  });
};

export const drawToon = (g: CanvasRenderingContext2D, p: ToonParams) => {
  g.clearRect(0, 0, CW, CH);
  g.save();
  g.scale(2, 2);
  if (p.kind === "cat") {
    drawCat(g, p);
    g.restore();
    grade(g, p);
    return;
  }
  const sd = p.seed ?? 1;
  const lean = p.lean ?? 0;
  const sq = p.squash ?? 0;
  g.translate(256, 780);
  g.rotate(lean * 0.12);
  g.scale(1 + sq * 0.05, 1 - sq * 0.05);
  g.translate(-256, -780);
  g.translate(0, -(p.bob ?? 0));
  const face = p.face ?? "#ffffff";

  // legs
  const isBox = p.kind === "box";
  const legTop = 565;
  const tL = p.legL ?? 0.04;
  const tR = p.legR ?? -0.04;
  const kL = p.kneeL ?? -0.02;
  const kR = p.kneeR ?? 0.02;
  const lh = limb(g, [256 - 36, legTop], tL, kL, 105, 105, 9, sd + 1);
  const rh = limb(g, [256 + 36, legTop], tR, kR, 105, 105, 9, sd + 2);
  if (p.profile) {
    // side-view feet follow the shin so a lifted foot points its toes down
    inkEllipse(g, lh[0] + 12, lh[1] + 4, 30, 13, INK, 3, sd + 3, (tL + kL) * -0.7);
    inkEllipse(g, rh[0] + 12, rh[1] + 4, 30, 13, INK, 3, sd + 4, (tR + kR) * -0.7);
  } else {
    inkEllipse(g, lh[0] - 6, lh[1] + 4, 30, 14, INK, 3, sd + 3);
    inkEllipse(g, rh[0] + 6, rh[1] + 4, 30, 14, INK, 3, sd + 4);
  }

  // back arm (left side of screen)
  const aL = p.armL ?? [-0.22, -0.1];
  const aR = p.armR ?? [0.22, 0.1];
  const shX = isBox ? 150 : 64;
  const shY = isBox ? 440 : 425;
  const handL = limb(g, [256 - shX, shY], aL[0], aL[1], 92, 88, 9, sd + 5);

  const shirt = p.shirt;
  if (!isBox) {
  g.save();
  g.translate(256, 500);
  g.scale(1 + (p.belly ?? 0) * 0.55, 1 + (p.belly ?? 0) * 0.08);
  g.translate(-256, -500);
  g.save();
  g.fillStyle = shirt;
  g.strokeStyle = INK;
  g.lineWidth = 9;
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(256 - 70, 410);
  g.bezierCurveTo(256 - 100, 470, 256 - 88, 560, 256 - 58, 590);
  g.lineTo(256 + 58, 590);
  g.bezierCurveTo(256 + 88, 560, 256 + 100, 470, 256 + 70, 410);
  g.closePath();
  g.fill();
  g.stroke();
  g.clip();
  // hatch shading on the right side + wet darkening
  g.strokeStyle = "rgba(0,0,0,0.22)";
  g.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    g.moveTo(256 + 20 + i * 8, 400);
    g.lineTo(256 - 20 + i * 8, 600);
    g.stroke();
  }
  if (p.pattern) {
    g.strokeStyle = p.pattern === "batik" ? "rgba(255,230,160,0.75)" : "rgba(255,255,255,0.7)";
    g.fillStyle = p.pattern === "batik" ? "rgba(255,230,160,0.35)" : "rgba(255,255,255,0.45)";
    g.lineWidth = 3;
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 5; c++) {
        const x = 170 + c * 40 + (r % 2) * 20;
        const y = 420 + r * 32;
        if (p.pattern === "batik") {
          g.beginPath();
          g.moveTo(x, y - 12);
          g.lineTo(x + 12, y);
          g.lineTo(x, y + 12);
          g.lineTo(x - 12, y);
          g.closePath();
          g.stroke();
        } else {
          g.beginPath();
          g.arc(x, y, 9, 0, 7);
          g.fill();
        }
      }
  }
  if (p.wet) {
    g.fillStyle = `rgba(20,40,80,${0.35 * p.wet})`;
    g.fillRect(150, 400, 220, 200);
  }
  g.restore();
  if (p.tape) {
    g.fillStyle = "rgba(240,220,170,0.9)";
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.fillRect(256 - 16, 405, 32, 190);
    g.strokeRect(256 - 16, 405, 32, 190);
  g.restore();
  }
  // collar / buttons
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(256, 420);
  g.lineTo(256, 585);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    g.fillStyle = INK;
    g.beginPath();
    g.arc(262, 455 + i * 40, 5, 0, 7);
    g.fill();
  }
  if (p.tie && !isBox) {
    g.fillStyle = p.tie;
    g.strokeStyle = INK;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(256 - 14, 418);
    g.lineTo(256 + 14, 418);
    g.lineTo(256 + 20, 520);
    g.lineTo(256, 556);
    g.lineTo(256 - 20, 520);
    g.closePath();
    g.fill();
    g.stroke();
  }
  if (p.lanyard && !isBox) {
    g.strokeStyle = "#2563eb";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(256 - 40, 410);
    g.lineTo(256, 520);
    g.lineTo(256 + 40, 410);
    g.stroke();
    g.fillStyle = "#fff";
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.fillRect(256 - 24, 520, 48, 62);
    g.strokeRect(256 - 24, 520, 48, 62);
    g.fillStyle = "#2563eb";
    g.fillRect(256 - 16, 528, 32, 12);
  }
  if (p.whistle && !isBox) {
    g.strokeStyle = "#16a34a";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(256 - 36, 412);
    g.lineTo(256 + 20, 500);
    g.lineTo(256 + 48, 412);
    g.stroke();
    g.fillStyle = "#d4d8de";
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(256 + 6, 496, 40, 20, 8);
    g.fill();
    g.stroke();
  }
  if (p.pants) {
    g.fillStyle = p.pants;
    g.strokeStyle = INK;
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(256 - 60, 575, 120, 36, 12);
    g.fill();
    g.stroke();
  }

  }
  // front arm (right side of screen) + prop
  const handR = limb(g, [256 + shX, shY], aR[0], aR[1], 92, 88, 9, sd + 6);
  const hands: [number, number][] = [handL, handR];
  hands.forEach(([x, y], i) => inkEllipse(g, x, y, 17, 17, face, 7, sd + 7 + i));
  if (p.prop === "mic") {
    g.save();
    g.translate(handR[0] + 6, handR[1] - 20);
    g.rotate(-0.5);
    g.fillStyle = "#2b2b33";
    g.strokeStyle = INK;
    g.lineWidth = 7;
    g.beginPath();
    g.roundRect(-9, -8, 18, 64, 8);
    g.fill();
    g.stroke();
    g.fillStyle = "#c9ced6";
    g.beginPath();
    g.arc(0, -22, 22, 0, 7);
    g.fill();
    g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * 8, -40);
      g.lineTo(i * 8, -6);
      g.stroke();
    }
    g.restore();
    inkEllipse(g, handR[0], handR[1], 17, 17, face, 7, sd + 9);
  }
  if (p.prop === "cane") {
    g.strokeStyle = INK;
    g.lineCap = "round";
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(handR[0], handR[1] - 10);
    g.lineTo(handR[0] + 10, 770);
    g.stroke();
    g.strokeStyle = "#a8703a";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(handR[0], handR[1] - 10);
    g.lineTo(handR[0] + 10, 770);
    g.stroke();
    inkEllipse(g, handR[0], handR[1], 17, 17, face, 7, sd + 9);
  }
  if (p.prop === "box") {
    g.save();
    g.translate(handR[0] + 10, handR[1] - 26);
    g.fillStyle = "#d49a4a";
    g.strokeStyle = INK;
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(-52, -52, 104, 92, 8);
    g.fill();
    g.stroke();
    g.fillStyle = "rgba(245,225,170,0.95)";
    g.fillRect(-52, -30, 104, 18);
    g.strokeRect(-52, -30, 104, 18);
    g.restore();
    inkEllipse(g, handR[0], handR[1], 17, 17, face, 7, sd + 9);
  }
  if (p.prop === "can") {
    const sh = (p.canShake ?? 0) * 7;
    const cx = handR[0] + Math.sin(sd * 9 + (p.canShake ?? 0) * 40) * sh;
    const cy = handR[1] - 30 + Math.cos(sd * 7 + (p.canShake ?? 0) * 33) * sh;
    // soda can
    g.save();
    g.translate(cx, cy);
    g.fillStyle = "#d62828";
    g.strokeStyle = INK;
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(-30, -62, 60, 104, 10);
    g.fill();
    g.stroke();
    g.fillStyle = "#f1f1f1";
    g.fillRect(-26, -22, 52, 26);
    g.fillStyle = "#d62828";
    g.font = "bold 24px Anton, Impact, sans-serif";
    g.textAlign = "center";
    g.fillText("SODA", 0, -2);
    g.fillStyle = "#c9ced6";
    g.beginPath();
    g.roundRect(-30, -72, 60, 14, 6);
    g.fill();
    g.stroke();
    g.restore();
    inkEllipse(g, handR[0], handR[1], 17, 17, face, 7, sd + 9);
  }

  // head
  if (p.hat === "hijab") {
    g.fillStyle = p.hatColor ?? "#7c3aed";
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.ellipse(256, 262, 176, 176, 0, 0, 7);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(256 - 150, 330);
    g.quadraticCurveTo(256 - 170, 470, 256 - 70, 450);
    g.lineTo(256 + 70, 450);
    g.quadraticCurveTo(256 + 170, 470, 256 + 150, 330);
    g.closePath();
    g.fill();
    g.stroke();
  }
  const hx = 256;
  const hy = isBox ? 425 : 240;
  if (isBox) {
    const bx = 106;
    const by = 280;
    const bw = 300;
    const bh = 290;
    // open top flaps
    g.fillStyle = "#b9803a";
    g.strokeStyle = INK;
    g.lineWidth = 9;
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(bx + 6, by + 6);
    g.lineTo(bx - 40, by - 52);
    g.lineTo(bx + 120, by - 20);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(bx + bw - 6, by + 6);
    g.lineTo(bx + bw + 40, by - 52);
    g.lineTo(bx + bw - 120, by - 20);
    g.closePath();
    g.fill();
    g.stroke();
    // body
    g.fillStyle = p.shirt;
    g.beginPath();
    g.roundRect(bx, by, bw, bh, 18);
    g.fill();
    g.stroke();
    g.save();
    g.beginPath();
    g.roundRect(bx, by, bw, bh, 18);
    g.clip();
    g.strokeStyle = "rgba(0,0,0,0.16)";
    g.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      g.beginPath();
      g.moveTo(bx + 150 + i * 9, by);
      g.lineTo(bx + 110 + i * 9, by + bh);
      g.stroke();
    }
    // tape across the top
    g.fillStyle = "rgba(245,225,170,0.95)";
    g.fillRect(bx, by + 18, bw, 30);
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.strokeRect(bx, by + 18, bw, 30);
    g.restore();
    // shipping label with a data icon
    g.fillStyle = "#ffffff";
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.fillRect(bx + 196, by + 208, 92, 62);
    g.strokeRect(bx + 196, by + 208, 92, 62);
    g.fillStyle = "#1d4ed8";
    g.font = "bold 24px Anton, Impact, sans-serif";
    g.textAlign = "center";
    g.fillText("DATA", bx + 242, by + 236);
    g.fillStyle = INK;
    for (let i = 0; i < 12; i++) g.fillRect(bx + 204 + i * 6.4, by + 244, 2 + (i % 3), 18);
    // wet / glow tint
    if (p.wet) {
      g.fillStyle = `rgba(120,180,255,${0.15 * p.wet})`;
      g.fillRect(bx, by, bw, bh);
    }
  } else inkEllipse(g, hx, hy, 148, 138, face, 11, sd + 10);
  if (p.wet) {
    g.fillStyle = `rgba(120,180,255,${0.15 * p.wet})`;
    g.beginPath();
    g.ellipse(hx, hy, 140, 130, 0, 0, 7);
    g.fill();
  }
  // cheek hatch
  if (!isBox) {
  g.strokeStyle = "rgba(0,0,0,0.12)";
  g.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.moveTo(hx + 80 + i * 6, hy + 40 - i * 4);
    g.lineTo(hx + 60 + i * 6, hy + 100 - i * 6);
    g.stroke();
  }
  }

  // eyes
  const ex = [hx - 56, hx + 56];
  const look = (p.look ?? 0) * 12;
  const big = p.expr === "surprised" || p.expr === "nervous" ? 1.18 : p.expr === "smirk" ? 0.95 : 1;
  ex.forEach((x, i) => {
    const lidK = p.expr === "smirk" ? 0.55 : p.expr === "laugh" || p.expr === "sleepy" ? 0.18 : p.expr === "happy" ? 0.75 : 1;
    inkEllipse(g, x, hy - 10, 33 * big, 36 * big * lidK, "#ffffff", 8, sd + 20 + i);
    if (lidK > 0.4) {
      g.fillStyle = INK;
      g.beginPath();
      g.arc(x + look, hy - 8 + (p.expr === "smirk" ? 4 : 0), p.expr === "surprised" ? 8 : 12, 0, 7);
      g.fill();
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(x + look + 3, hy - 12, 3.5, 0, 7);
      g.fill();
    }
    if (p.expr === "smirk") {
      g.strokeStyle = INK;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(x - 34, hy - 12);
      g.lineTo(x + 34, hy - 12);
      g.stroke();
    }
  });
  // brows
  const brow = (x: number, tilt: number, y: number) => {
    inkLine(g, [[x - 32, y + tilt * 26], [x + 32, y - tilt * 26]], 11, sd + 30 + x);
  };
  const by = p.expr === "surprised" ? hy - 74 : hy - 58;
  const tilt = p.expr === "worried" || p.expr === "nervous" ? 0.9 : p.expr === "angry" ? -0.9 : p.expr === "smirk" ? -0.5 : p.expr === "happy" || p.expr === "laugh" ? -0.2 : 0.05;
  brow(ex[0], tilt, by);
  brow(ex[1], -tilt, by);
  // mouth
  g.strokeStyle = INK;
  g.fillStyle = "#4a0f14";
  g.lineWidth = 9;
  const my = hy + 62;
  if (p.expr === "surprised") {
    inkEllipse(g, hx, my + 10, 24, 34, "#4a0f14", 7, sd + 40);
  } else if (p.expr === "laugh") {
    g.beginPath();
    g.moveTo(hx - 62, my - 10);
    g.quadraticCurveTo(hx, my + 100, hx + 62, my - 10);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#e85a6a";
    g.beginPath();
    g.ellipse(hx, my + 36, 30, 16, 0, 0, 7);
    g.fill();
  } else if (p.expr === "happy") {
    g.fillStyle = "#fff";
    g.beginPath();
    g.moveTo(hx - 55, my - 6);
    g.quadraticCurveTo(hx, my + 60, hx + 55, my - 6);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (p.expr === "smirk") {
    g.beginPath();
    g.moveTo(hx - 40, my + 4);
    g.quadraticCurveTo(hx + 20, my + 26, hx + 60, my - 14);
    g.stroke();
  } else if (p.expr === "worried" || p.expr === "nervous") {
    g.beginPath();
    g.moveTo(hx - 46, my + 18);
    for (let i = 0; i <= 6; i++) g.lineTo(hx - 46 + i * 15.3, my + 18 + (i % 2 ? -10 : 6));
    g.stroke();
  } else if (p.expr === "angry") {
    g.beginPath();
    g.moveTo(hx - 44, my + 20);
    g.quadraticCurveTo(hx, my - 10, hx + 44, my + 20);
    g.stroke();
  } else {
    g.beginPath();
    g.moveTo(hx - 34, my + 10);
    g.lineTo(hx + 34, my + 10);
    g.stroke();
  }

  if (p.mustache) {
    g.fillStyle = INK;
    g.strokeStyle = INK;
    g.lineWidth = 4;
    [-1, 1].forEach((sg) => {
      g.beginPath();
      g.moveTo(hx, my - 22);
      g.quadraticCurveTo(hx + sg * 40, my - 40, hx + sg * 74, my - 8);
      g.quadraticCurveTo(hx + sg * 40, my - 14, hx, my - 4);
      g.closePath();
      g.fill();
      g.stroke();
    });
  }
  // hat
  const hat = isBox ? "none" : (p.hat ?? "none");
  const hc = p.hatColor ?? "#222";
  if (hat === "cap") {
    g.fillStyle = hc;
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(hx - 140, hy - 40);
    g.bezierCurveTo(hx - 140, hy - 170, hx + 140, hy - 170, hx + 140, hy - 40);
    g.quadraticCurveTo(hx, hy - 70, hx - 140, hy - 40);
    g.fill();
    g.stroke();
    inkEllipse(g, hx + 120, hy - 44, 74, 16, hc, 9, sd + 50, -0.1);
    g.strokeStyle = "rgba(255,255,255,0.5)";
    g.lineWidth = 7;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(hx + i * 34, hy - 122 + Math.abs(i) * 9);
      g.lineTo(hx + i * 30, hy - 62);
      g.stroke();
    }
  } else if (hat === "bowler") {
    inkEllipse(g, hx, hy - 118, 150, 22, hc, 10, sd + 51);
    g.fillStyle = hc;
    g.beginPath();
    g.moveTo(hx - 100, hy - 124);
    g.bezierCurveTo(hx - 100, hy - 230, hx + 100, hy - 230, hx + 100, hy - 124);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.stroke();
  } else if (hat === "hair") {
    g.fillStyle = hc;
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(hx - 150, hy + 20);
    g.bezierCurveTo(hx - 190, hy - 150, hx + 190, hy - 150, hx + 150, hy + 20);
    g.bezierCurveTo(hx + 120, hy - 40, hx + 60, hy - 90, hx - 20, hy - 96);
    g.bezierCurveTo(hx - 80, hy - 80, hx - 120, hy - 40, hx - 150, hy + 20);
    g.fill();
    g.stroke();
    inkEllipse(g, hx + 150, hy + 80, 30, 56, hc, 9, sd + 53, 0.15);
  } else if (hat === "short") {
    g.fillStyle = hc;
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(hx - 144, hy - 20);
    g.bezierCurveTo(hx - 170, hy - 140, hx + 170, hy - 140, hx + 144, hy - 20);
    g.bezierCurveTo(hx + 110, hy - 70, hx + 40, hy - 88, hx - 30, hy - 84);
    g.bezierCurveTo(hx - 90, hy - 80, hx - 130, hy - 56, hx - 144, hy - 20);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (hat === "curlers") {
    g.fillStyle = hc;
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(hx - 150, hy + 10);
    g.bezierCurveTo(hx - 190, hy - 160, hx + 190, hy - 160, hx + 150, hy + 10);
    g.bezierCurveTo(hx + 110, hy - 50, hx + 40, hy - 80, hx - 20, hy - 82);
    g.bezierCurveTo(hx - 80, hy - 76, hx - 126, hy - 40, hx - 150, hy + 10);
    g.closePath();
    g.fill();
    g.stroke();
    [-90, -30, 30, 90].forEach((dx, i) => {
      g.fillStyle = ["#f472b6", "#60a5fa", "#fbbf24", "#34d399"][i];
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.beginPath();
      g.roundRect(hx + dx - 20, hy - 150 + Math.abs(dx) * 0.18, 40, 52, 14);
      g.fill();
      g.stroke();
    });
  } else if (hat === "bun") {
    g.fillStyle = hc;
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(hx, hy - 150, 46, 0, 7);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(hx - 146, hy - 10);
    g.bezierCurveTo(hx - 170, hy - 140, hx + 170, hy - 140, hx + 146, hy - 10);
    g.bezierCurveTo(hx + 100, hy - 60, hx + 30, hy - 80, hx - 20, hy - 80);
    g.bezierCurveTo(hx - 80, hy - 76, hx - 126, hy - 50, hx - 146, hy - 10);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (hat === "bald") {
    g.strokeStyle = INK;
    g.lineWidth = 9;
    g.fillStyle = hc;
    [-1, 1].forEach((sg) => {
      g.beginPath();
      g.moveTo(hx + sg * 146, hy - 70);
      g.quadraticCurveTo(hx + sg * 176, hy - 20, hx + sg * 146, hy + 40);
      g.quadraticCurveTo(hx + sg * 130, hy - 10, hx + sg * 146, hy - 70);
      g.fill();
      g.stroke();
    });
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 12;
    g.beginPath();
    g.arc(hx - 40, hy - 80, 70, Math.PI * 1.15, Math.PI * 1.45);
    g.stroke();
  } else if (hat === "hijab") {
    g.strokeStyle = p.hatColor ?? "#7c3aed";
    g.lineWidth = 30;
    g.beginPath();
    g.ellipse(hx, hy, 140, 130, 0, 0, 7);
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = 8;
    g.beginPath();
    g.ellipse(hx, hy, 124, 116, 0, 0, 7);
    g.stroke();
  } else if (hat === "bucket") {
    g.fillStyle = hc;
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(hx - 105, hy - 105);
    g.lineTo(hx - 80, hy - 190);
    g.lineTo(hx + 80, hy - 190);
    g.lineTo(hx + 105, hy - 105);
    g.closePath();
    g.fill();
    g.stroke();
    inkEllipse(g, hx, hy - 105, 160, 26, hc, 10, sd + 52);
  }

  if (p.shades) {
    g.fillStyle = "#111";
    g.strokeStyle = INK;
    g.lineWidth = 8;
    ex.forEach((x) => {
      g.beginPath();
      g.roundRect(x - 46, hy - 40, 92, 58, 18);
      g.fill();
      g.stroke();
    });
    g.beginPath();
    g.moveTo(ex[0] + 46, hy - 22);
    g.lineTo(ex[1] - 46, hy - 22);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.6)";
    g.lineWidth = 5;
    ex.forEach((x) => {
      g.beginPath();
      g.moveTo(x - 26, hy - 28);
      g.lineTo(x - 8, hy - 28);
      g.stroke();
    });
  }
  if (p.headphones) {
    g.strokeStyle = "#16a34a";
    g.lineWidth = 16;
    g.beginPath();
    g.arc(hx, hy, 160, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = 6;
    g.beginPath();
    g.arc(hx, hy, 168, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    [-1, 1].forEach((sg) => {
      g.fillStyle = "#22c55e";
      g.strokeStyle = INK;
      g.lineWidth = 7;
      g.beginPath();
      g.roundRect(hx + sg * 150 - 26, hy - 40, 52, 90, 20);
      g.fill();
      g.stroke();
    });
  }
  if (p.glasses) {
    g.strokeStyle = INK;
    g.lineWidth = 8;
    ex.forEach((x) => {
      g.beginPath();
      g.arc(x, hy - 10, 46, 0, 7);
      g.stroke();
    });
    g.beginPath();
    g.moveTo(ex[0] + 46, hy - 10);
    g.lineTo(ex[1] - 46, hy - 10);
    g.stroke();
  }
  // effects
  if ((p.sweat ?? 0) > 0.02) {
    for (let i = 0; i < 4; i++) {
      const sx = hx + (i % 2 ? 1 : -1) * (110 + i * 6);
      const sy = hy - 80 + i * 36 + Math.sin(sd + i) * 6;
      g.fillStyle = "#bfe9ff";
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(sx, sy - 24 * (p.sweat ?? 0));
      g.bezierCurveTo(sx + 18, sy, sx + 16, sy + 22, sx, sy + 22);
      g.bezierCurveTo(sx - 16, sy + 22, sx - 18, sy, sx, sy - 24 * (p.sweat ?? 0));
      g.fill();
      g.stroke();
    }
  }
  if ((p.steam ?? 0) > 0.02) {
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 3; i++) {
        g.fillStyle = "rgba(255,255,255,0.92)";
        g.strokeStyle = INK;
        g.lineWidth = 5;
        g.beginPath();
        g.arc(hx + s * (130 + i * 22), hy - 110 - i * 34, 22 + i * 8, 0, 7);
        g.fill();
        g.stroke();
      }
    });
  }
  if ((p.foam ?? 0) > 0.02) {
    const f = p.foam ?? 0;
    g.fillStyle = "#fffaf0";
    g.strokeStyle = INK;
    g.lineWidth = 7;
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * (0.08 + 0.84 * (i / 11));
      const r = 22 + hash(i, sd) * 24;
      const x = hx + Math.cos(a) * (120 + hash(i, 9) * 30) * f;
      const y = hy + Math.sin(a) * (108 + hash(i, 4) * 26) * f + 10 * f;
      g.beginPath();
      g.arc(x, y, r * f, 0, 7);
      g.fill();
      g.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = hx + (i < 2 ? -1 : 1) * (112 + (i % 2) * 22);
      const y = hy + 26 + (i % 2) * 40;
      g.beginPath();
      g.arc(x, y, 26 * f, 0, 7);
      g.fill();
      g.stroke();
    }
    // drips
    for (let i = 0; i < 4; i++) {
      const x = [hx - 124, hx - 98, hx + 98, hx + 124][i];
      g.fillStyle = "#fffaf0";
      g.beginPath();
      g.roundRect(x - 9, hy + 50, 18, 70 * f * (0.5 + hash(i, 6)), 9);
      g.fill();
      g.stroke();
    }
  }
  g.restore();
  grade(g, p);
};

export const ToonSprite: React.FC<{ position: Vec3; height?: number; yaw?: number; roll?: number; params: ToonParams; flip?: boolean; shadow?: boolean }> = ({ position, height = 2.1, yaw = 0, roll = 0, params, flip = false, shadow = true }) => {
  // The card is drawn on a 2D canvas, copied to raw pixels and uploaded as a DataTexture. Uploading straight from
  // the canvas could race with the screenshot in headless video renders and leave the card blank.
  const frameNo = useCurrentFrame();
  const { cv, tex, buf } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = CW;
    cv.height = CH;
    const buf = new Uint8Array(CW * CH * 4);
    const tex = new THREE.DataTexture(buf, CW, CH, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    return { cv, tex, buf };
    // a fresh card per frame: reusing one texture across frames left it blank in headless video renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameNo]);
  useEffect(() => () => tex.dispose(), [tex]);
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  drawToon(ctx, params);
  buf.set(ctx.getImageData(0, 0, CW, CH).data);
  tex.needsUpdate = true;
  const w = (height * CW) / CH;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, roll]}>
      <mesh position={[0, height / 2 - height * 0.0375, 0]} scale={[flip ? -1 : 1, 1, 1]}>
        <planeGeometry args={[w, height]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} color="#fff3e2" side={THREE.DoubleSide} />
      </mesh>
      </group>
      {shadow && (
        <mesh position={[0.15, 0.012, 0.05]} rotation={[-Math.PI / 2, 0, 0.15]} scale={[1, 0.34, 1]}>
          <circleGeometry args={[0.62 * (height / 2.1), 20]} />
          <meshBasicMaterial color="#3a1608" transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* The desert pit stop                                                   */
/* ------------------------------------------------------------------ */
export const Desert: React.FC<{ t: number }> = ({ t }) => {
  const strata = useStrata([2, 1]);
  const strata2 = useStrata([1.4, 1]);
  const sand = useSand();
  const road = useRoad();
  const planks = usePlanks();
  const planksDark = usePlanks("#6e3d1f");
  const bottles = useMemo(() => new Array(8).fill(0).map((_, i) => ({ x: -1.5 + i * 0.28, c: ["#d62828", "#2a9d8f", "#f4a261", "#e9c46a"][i % 4] })), []);
  const wires = [0.0, 0.25, 0.5];
  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]} receiveShadow>
        <planeGeometry args={[70, 50]} />
        <meshStandardMaterial map={sand} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -9.5]} receiveShadow>
        <planeGeometry args={[70, 4.2]} />
        <meshStandardMaterial map={road} roughness={0.95} />
      </mesh>
      {/* canyon walls */}
      <mesh position={[0, 3.2, -22]}>
        <planeGeometry args={[90, 6.4]} />
        <meshStandardMaterial map={strata} roughness={1} />
      </mesh>
      <mesh position={[-16, 3.4, -8]} rotation={[0, Math.PI / 2.6, 0]}>
        <planeGeometry args={[28, 6.8]} />
        <meshStandardMaterial map={strata2} roughness={1} />
      </mesh>
      <mesh position={[18, 3.4, -9]} rotation={[0, -Math.PI / 2.6, 0]}>
        <planeGeometry args={[30, 6.8]} />
        <meshStandardMaterial map={strata2} roughness={1} />
      </mesh>
      {[-22, -9, 8, 24].map((x, i) => (
        <mesh key={i} position={[x, 2.2 + i * 0.4, -34]}>
          <boxGeometry args={[10 + i * 2, 4.4 + i * 0.8, 4]} />
          <meshStandardMaterial map={strata2} roughness={1} />
        </mesh>
      ))}
      {/* kios */}
      <group position={[-2.6, 0, -3.6]}>
        <M position={[0, 1.2, 0]}>
          <boxGeometry args={[4.2, 2.4, 2.2]} />
          <meshStandardMaterial map={planks} roughness={0.95} />
        </M>
        <M position={[0, 2.55, 0.15]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[4.8, 0.14, 2.8]} />
          <meshStandardMaterial color="#7d8793" metalness={0.5} roughness={0.5} />
        </M>
        {new Array(7).fill(0).map((_, i) => (
          <mesh key={i} position={[-2.1 + i * 0.7, 2.64, 0.15]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.04, 0.05, 2.8]} />
            <meshStandardMaterial color="#5c6570" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        <M position={[0, 0.95, 1.2]}>
          <boxGeometry args={[3.4, 0.14, 0.7]} />
          <meshStandardMaterial map={planksDark} roughness={0.9} />
        </M>
        <M position={[0, 0.45, 1.2]}>
          <boxGeometry args={[3.2, 0.9, 0.6]} />
          <meshStandardMaterial map={planksDark} roughness={0.9} />
        </M>
        {bottles.map((b, i) => (
          <M key={i} position={[b.x, 1.2, 1.2]}>
            <cylinderGeometry args={[0.07, 0.08, 0.34, 8]} />
            <meshStandardMaterial color={b.c} roughness={0.3} />
          </M>
        ))}
        <Sign position={[0, 2.0, 1.12]} size={[3.0, 0.7]} text="SODA DINGIN" sub="PIT STOP KM 99" bg="#8a1c12" fg="#ffe9b0" />
        {[-1.6, 1.6].map((x, i) => (
          <M key={i} position={[x, 0.35, 1.5]}>
            <boxGeometry args={[0.6, 0.7, 0.6]} />
            <meshStandardMaterial map={planksDark} roughness={0.9} />
          </M>
        ))}
      </group>
      {/* bench */}
      <group position={[2.4, 0, -2.6]}>
        <M position={[0, 0.5, 0]}>
          <boxGeometry args={[2.2, 0.1, 0.55]} />
          <meshStandardMaterial map={planks} roughness={0.9} />
        </M>
        {[-0.9, 0.9].map((x, i) => (
          <M key={i} position={[x, 0.25, 0]}>
            <boxGeometry args={[0.1, 0.5, 0.45]} />
            <meshStandardMaterial color="#4a2a14" />
          </M>
        ))}
      </group>
      {/* cacti */}
      {[[5.2, -4.4, 1.3], [-6.5, -5.2, 1.0], [6.6, -6.4, 1.6], [3.8, -7.5, 0.9]].map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <M position={[0, 0.8, 0]}>
            <capsuleGeometry args={[0.2, 1.2, 6, 10]} />
            <meshStandardMaterial color="#3f8f4a" roughness={0.8} />
          </M>
          <M position={[0.38, 1.05, 0]} rotation={[0, 0, -0.2]}>
            <capsuleGeometry args={[0.12, 0.5, 6, 8]} />
            <meshStandardMaterial color="#3f8f4a" roughness={0.8} />
          </M>
          <M position={[-0.36, 0.8, 0]} rotation={[0, 0, 0.2]}>
            <capsuleGeometry args={[0.11, 0.4, 6, 8]} />
            <meshStandardMaterial color="#3f8f4a" roughness={0.8} />
          </M>
        </group>
      ))}
      {/* telegraph pole + wires */}
      <group position={[6.2, 0, -5.2]}>
        <M position={[0, 3, 0]}>
          <cylinderGeometry args={[0.1, 0.13, 6, 8]} />
          <meshStandardMaterial map={planksDark} roughness={0.9} />
        </M>
        <M position={[0, 5.5, 0]}>
          <boxGeometry args={[2.0, 0.12, 0.12]} />
          <meshStandardMaterial map={planksDark} roughness={0.9} />
        </M>
      </group>
      {wires.map((o, i) => (
        <mesh key={i} position={[-3.8, 5.4 - o * 0.2 - 0.25 * Math.sin(i), -5.2]} rotation={[0, 0, 0.012]}>
          <boxGeometry args={[20, 0.02, 0.02]} />
          <meshBasicMaterial color="#201410" />
        </mesh>
      ))}
      {/* string lights over the kios */}
      {new Array(9).fill(0).map((_, i) => (
        <group key={i} position={[-4.4 + i * 0.7, 2.95 - Math.sin((i / 8) * Math.PI) * 0.22, -2.0]}>
          <mesh>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={i % 2 ? "#ffd27a" : "#ffb25a"} />
          </mesh>
        </group>
      ))}
      {/* sun */}
      <mesh position={[-9, 9.5, -40]}>
        <circleGeometry args={[3, 28]} />
        <meshBasicMaterial color="#fff2c8" />
      </mesh>
      <mesh position={[-9, 9.5, -40.1]}>
        <circleGeometry args={[8, 28]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.28} />
      </mesh>
      {/* dust motes */}
      {new Array(26).fill(0).map((_, i) => (
        <mesh key={i} position={[((hash(i, 1) * 14 - 7) + t * (0.15 + hash(i, 2) * 0.2)) % 14 - 7, 0.8 + hash(i, 3) * 3.2 + Math.sin(t * 0.8 + i) * 0.1, -1 - hash(i, 4) * 4]}>
          <sphereGeometry args={[0.02 + hash(i, 5) * 0.025, 5, 5]} />
          <meshBasicMaterial color="#fff2d0" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
};

export const DesertLights: React.FC = () => (
  <>
    <hemisphereLight args={["#ffd9b0", "#9a5a30", 0.75]} />
    <ambientLight intensity={0.5} color="#ffe2c0" />
    <directionalLight position={[-7, 5.5, 6]} intensity={2.6} color="#ffb372" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-4} shadow-camera-near={1} shadow-camera-far={40} shadow-bias={-0.0006} />
    <directionalLight position={[5, 3, 6]} intensity={0.6} color="#9fc2ff" />
    <fog attach="fog" args={["#f3b98a", 16, 60]} />
  </>
);

/* ------------------------------------------------------------------ */
/* Inside the can                                                        */
/* ------------------------------------------------------------------ */
export const CanInterior: React.FC<{
  t: number;
  shake?: number; // 0..1 how violently the can is being shaken
  nucleate?: number; // 0..1 bubbles on the wall have grown
  rush?: number; // 0..1 bubbles stampeding to the opening
  lidStrain?: number; // 0..1
  faces?: boolean;
  lift?: number; // 0..1 faced bubbles crowd up against the lid
}> = ({ t, shake = 0, nucleate = 0, rush = 0, lidStrain = 0, faces = true, lift = 0 }) => {
  const dots = useMemo(() => new Array(260).fill(0).map((_, i) => ({ x: (hash(i, 1) - 0.5) * 5, y: hash(i, 2) * 7 - 1.5, z: (hash(i, 3) - 0.5) * 5, r: 0.03 + hash(i, 4) * 0.05, ph: hash(i, 5) * 6 })), []);
  const wall = useMemo(
    () =>
      new Array(46).fill(0).map((_, i) => {
        const a = hash(i, 7) * Math.PI * 2;
        const rr = 2.72;
        return { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: hash(i, 8) * 6 - 1.8, r: 0.12 + hash(i, 9) * 0.22, d: hash(i, 10) * 0.5 };
      }),
    []
  );
  const jx = Math.sin(t * 60) * 0.07 * shake;
  const jy = Math.cos(t * 53) * 0.07 * shake;
  return (
    <group position={[jx, jy, 0]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[3, 3, 9, 18, 1, true]} />
        <meshStandardMaterial color="#7a3414" side={THREE.BackSide} roughness={0.6} emissive="#4a1d08" emissiveIntensity={0.7} flatShading />
      </mesh>
      <mesh position={[0, -2.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 18]} />
        <meshStandardMaterial color="#5a230d" emissive="#3a1405" emissiveIntensity={0.6} />
      </mesh>
      {/* headspace + lid */}
      <mesh position={[0, 4.1 + 0.05 * lidStrain * Math.sin(t * 40), 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1 + lidStrain * 0.04]}>
        <circleGeometry args={[3, 18]} />
        <meshStandardMaterial color="#8a919e" metalness={0.7} roughness={0.4} side={THREE.DoubleSide} emissive="#3a404a" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 4.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.35, 24]} />
        <meshBasicMaterial color={new THREE.Color("#ff3b30").multiplyScalar(0.4 + lidStrain)} side={THREE.DoubleSide} />
      </mesh>
      {/* dissolved CO2 dots */}
      {dots.map((d, i) => (
        <mesh key={i} position={[d.x + Math.sin(t * 0.9 + d.ph) * 0.1, d.y + Math.sin(t * 0.6 + d.ph) * 0.12 + rush * 3, d.z]}>
          <sphereGeometry args={[d.r * (1 + nucleate * 0.5), 6, 6]} />
          <meshBasicMaterial color="#ffe6b0" transparent opacity={0.65 - 0.35 * rush} />
        </mesh>
      ))}
      {/* bubbles that grow on the wall */}
      {wall.map((w, i) => {
        const k = sm(cl((nucleate - w.d) / 0.5));
        if (k <= 0.01) return null;
        const rise = rush > 0 ? rush * rush * (4.0 - w.y + 1.0) : 0;
        return (
          <mesh key={i} position={[w.x * (1 - rush * 0.8), w.y + rise + Math.sin(t * 3 + i) * 0.03, w.z * (1 - rush * 0.8)]} scale={k}>
            <sphereGeometry args={[w.r, 10, 8]} />
            <meshStandardMaterial color="#fff3d0" transparent opacity={0.75} roughness={0.15} emissive="#ffe2a0" emissiveIntensity={0.55} />
          </mesh>
        );
      })}
      {/* cute bubble characters */}
      {faces &&
        [[-0.9, 0.3, 1.4, 0.55], [0.8, -0.2, 1.0, 0.45], [0.1, 1.2, 1.9, 0.4], [-1.6, 1.4, 0.4, 0.35]].map(([x, y, z, r], i) => {
          const k = sm(cl(nucleate * 2 - 0.2 * i));
          const up = rush * rush * (5 - y);
          const px = x * (1 - rush * 0.7);
          const py = y + lift * (3.0 - y * 0.2 + i * 0.12) + up + Math.sin(t * 2 + i) * 0.05;
          const s = (0.5 + 0.5 * k) * r;
          return (
            <group key={i} position={[px, py, z * (1 - rush * 0.7)]} scale={s * 2.2}>
              <mesh>
                <sphereGeometry args={[1, 14, 12]} />
                <meshStandardMaterial color="#fff6dc" transparent opacity={0.9} roughness={0.2} emissive="#ffe6b0" emissiveIntensity={0.5} />
              </mesh>
              {[-1, 1].map((sd) => (
                <group key={sd}>
                  <mesh position={[sd * 0.32, 0.18, 0.88]}>
                    <sphereGeometry args={[0.2, 10, 10]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <mesh position={[sd * 0.32, 0.18, 1.05]}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color="#16110f" />
                  </mesh>
                  <mesh position={[sd * 0.32, 0.5, 0.82]} rotation={[0, 0, -sd * (0.3 + 0.5 * nucleate)]}>
                    <boxGeometry args={[0.3, 0.06, 0.05]} />
                    <meshBasicMaterial color="#16110f" />
                  </mesh>
                </group>
              ))}
              <mesh position={[0, -0.28, 0.92]} scale={[1, 0.6 + 0.8 * nucleate, 0.4]}>
                <sphereGeometry args={[0.2, 10, 10]} />
                <meshBasicMaterial color="#4a0f14" />
              </mesh>
            </group>
          );
        })}
      <ambientLight intensity={1.0} color="#ffcf9a" />
      <pointLight position={[0, 3.6, 0]} intensity={90} distance={14} color="#ffe6c0" />
      <pointLight position={[0, 0.5, 3]} intensity={55} distance={12} color="#ffb070" />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Pull tab close-up + foam eruption                                    */
/* ------------------------------------------------------------------ */
export const CanTop: React.FC<{ position: Vec3; tab: number; t: number; scale?: number; seep?: number }> = ({ position, tab, t, scale = 1, seep = 0 }) => (
  <group position={position} scale={scale} rotation={[-0.9, 0, 0]}>
    <M>
      <cylinderGeometry args={[1.0, 1.0, 0.18, 28]} />
      <meshStandardMaterial color="#d62828" metalness={0.5} roughness={0.35} />
    </M>
    <M position={[0, 0.12, 0]}>
      <cylinderGeometry args={[0.82, 0.88, 0.1, 28]} />
      <meshStandardMaterial color="#c9ced6" metalness={0.8} roughness={0.3} />
    </M>
    <M position={[0, 0.2, -0.28]} rotation={[0, 0, 0]}>
      <boxGeometry args={[0.5, 0.02, 0.28]} />
      <meshStandardMaterial color="#8c929c" metalness={0.8} roughness={0.35} />
    </M>
    <group position={[0, 0.2, 0.2]} rotation={[-tab * 0.9, 0, 0]}>
      <M position={[0, 0.03, 0.1]}>
        <boxGeometry args={[0.44, 0.04, 0.6]} />
        <meshStandardMaterial color="#e6e9ee" metalness={0.8} roughness={0.25} />
      </M>
      <mesh position={[0, 0.06, 0.2]}>
        <torusGeometry args={[0.1, 0.025, 6, 14]} />
        <meshStandardMaterial color="#8c929c" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
    {seep > 0.02 &&
      [0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[(i - 2) * 0.13, 0.3 + Math.sin(t * 9 + i) * 0.04, -0.28]} scale={seep}>
          <sphereGeometry args={[0.09 + hash(i, 1) * 0.05, 8, 8]} />
          <meshStandardMaterial color="#fffaf0" emissive="#fff3d6" emissiveIntensity={0.4} />
        </mesh>
      ))}
  </group>
);

export const Foam: React.FC<{ origin: Vec3; target: Vec3; f: number; count?: number; seed?: string }> = ({ origin, target, f, count = 70, seed = "fm" }) => {
  const parts = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        vx: (random(`${seed}x${i}`) - 0.5) * 2.2,
        vy: 3.8 + random(`${seed}y${i}`) * 3.0,
        vz: (random(`${seed}z${i}`) - 0.5) * 1.6,
        r: 0.07 + random(`${seed}r${i}`) * 0.12,
        d: random(`${seed}d${i}`) * 10,
      })),
    [count, seed]
  );
  return (
    <group>
      {parts.map((p, i) => {
        const u = (f - p.d) / 30;
        if (u < 0) return null;
        const tt = Math.min(u, 1.6);
        const hit = Math.min(1, tt / 0.8);
        const px = origin[0] + (target[0] - origin[0]) * hit + p.vx * tt * 0.35;
        const py = origin[1] + p.vy * tt - 4.9 * tt * tt * 0.9;
        const pz = origin[2] + (target[2] - origin[2]) * hit + p.vz * tt * 0.3;
        const s = (1 + 0.6 * Math.min(1, u * 2)) * p.r;
        return (
          <mesh key={i} position={[px, Math.max(0.02, py), pz]} scale={s * 6}>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshStandardMaterial color="#fffaf0" emissive="#fff3d6" emissiveIntensity={0.35} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
};
export { THREE };

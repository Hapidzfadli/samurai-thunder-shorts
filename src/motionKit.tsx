/**
 * motionKit — gerak tokoh yang hidup: siklus lari, kejar-kejaran, debu, kamera pengikut.
 * Dipakai bersama cinemaKit (lihat src/UjiKejar.tsx). Koordinat jalur = koordinat Blender (x, y); gunakan `toThree` untuk Three.js.
 */
import React from "react";
import * as THREE from "three";
import { Vec3 } from "./three/objects";
import { BeanParams } from "./three/objectsBean";
import { RabbitCard } from "./three/objectsKelinci";
import { Cam, cl, smoother } from "./cinemaKit";

export const toThree = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];

/** siklus lari 1 tokoh: ayunan kaki + lutut terangkat, lengan memompa, badan condong ke arah lari, bob + squash saat mendarat. */
export const runPose = (f: number, o: { amp?: number; dir?: number; cadence?: number; phase?: number } = {}): Partial<BeanParams> => {
  const { amp = 1, dir = 1, cadence = 0.5, phase = 0 } = o;
  const ph = f * cadence + phase;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  return {
    legL: [58 * s * amp, Math.max(0, -c) * 62 * amp],
    legR: [-58 * s * amp, Math.max(0, c) * 62 * amp],
    armL: [-58 * s * amp, -38],
    armR: [58 * s * amp, -38],
    bob: Math.abs(s) * 16 * amp,
    lean: 9 * dir * amp,
    squash: -0.055 * Math.max(0, Math.abs(c) - 0.6) * amp,
    footBend: true,
    headTilt: s * 4 * dir,
  };
};

/** jalur sebagai fungsi frame → [x, y] Blender */
export type PathFn = (f: number) => [number, number];
/** jalur lurus dari (x0,y0) ke arah (x1,y1) dengan kecepatan m/frame; terus melaju melewati titik akhir */
export const linePath = (x0: number, y0: number, x1: number, y1: number, speed: number, start = 0): PathFn => {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  return (f) => { const d = Math.max(0, f - start) * speed; return [x0 + ux * d, y0 + uy * d]; };
};
export const velOf = (p: PathFn, f: number): [number, number] => {
  const a = p(f + 1), b = p(f - 1);
  return [(a[0] - b[0]) / 2, (a[1] - b[1]) / 2];
};
/** jalur lari melingkar/elips (koordinat Blender). speed = radian per frame. */
export type LoopPath = { cx: number; cy: number; rx: number; ry: number; speed: number; phase?: number };
export const loopAt = (p: LoopPath, f: number): [number, number] => {
  const a = (p.phase ?? 0) + f * p.speed;
  return [p.cx + Math.cos(a) * p.rx, p.cy + Math.sin(a) * p.ry];
};
export const velAt = (p: LoopPath, f: number): [number, number] => {
  const a = loopAt(p, f + 1);
  const b = loopAt(p, f - 1);
  return [(a[0] - b[0]) / 2, (a[1] - b[1]) / 2];
};
/** +1 bila tokoh bergerak ke kanan layar, -1 ke kiri (untuk condong badan / flip kartu) */
export const screenDir = (cam: Cam, vel: [number, number]): number => {
  const fwd = new THREE.Vector3(cam.look[0] - cam.pos[0], 0, cam.look[2] - cam.pos[2]).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  return new THREE.Vector3(vel[0], 0, -vel[1]).dot(right) >= 0 ? 1 : -1;
};

/** pengejar: tiap kelinci menapak jalur target dengan jeda (menyusul jejak), melompat-lompat. */
export const ChaseRabbits: React.FC<{ path: LoopPath | PathFn; f: number; n: number; cam: Cam; ox?: number; gap?: number; size?: number; lead?: number }> = ({ path, f, n, cam, ox = 0, gap = 3, size = 0.78, lead = 3 }) => {
  const FURS = ["#f1ece2", "#f1ece2", "#cdb594", "#e8dccb", "#8a6a4a", "#f6f2ea"];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const ff = f - lead - i * gap - (i % 3) * 2;
        const P: PathFn = typeof path === "function" ? path : (fr) => loopAt(path, fr);
        const [x, y] = P(ff);
        const v = velOf(P, ff);
        const side = ((i * 37) % 7 - 3) * 0.28;
        const jump = Math.abs(Math.sin((f + i * 7) * 0.42)) * 0.38;
        const d = screenDir(cam, v);
        return (
          <RabbitCard
            key={i}
            position={toThree(x + side, y + ((i * 53) % 5 - 2) * 0.2, 0.05 + jump, ox)}
            size={size * (0.85 + ((i * 29) % 5) * 0.06)}
            flip={d > 0}
            params={{ pose: "hop", expr: "lapar", fur: FURS[i % 6], mouth: 0.5 }}
          />
        );
      })}
    </>
  );
};

/** debu di jejak kaki: bola-bola abu yang membesar dan memudar */
export const DustTrail: React.FC<{ path: LoopPath | PathFn; f: number; ox?: number; count?: number; color?: string }> = ({ path, f, ox = 0, count = 8, color = "#cdb89a" }) => (
  <>
    {Array.from({ length: count }, (_, i) => {
      const age = i * 3;
      const [x, y] = typeof path === "function" ? path(f - 2 - age) : loopAt(path, f - 2 - age);
      const k = age / (count * 3);
      return (
        <mesh key={i} position={toThree(x, y, 0.12 + k * 0.4, ox)}>
          <sphereGeometry args={[0.1 + k * 0.38, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5 * (1 - k)} depthWrite={false} />
        </mesh>
      );
    })}
  </>
);

/** kamera pengikut: ganti jenis shot tiap ±2 detik (samping, depan-mundur, rendah-miring, atas, dekat) dengan transisi halus. */
type Rel = { a: number; b: number; h: number; fov: number; roll: number; lookH: number };
const RELS: Rel[] = [
  { a: 0.8, b: -5.6, h: 1.6, fov: 42, roll: 0, lookH: 1.1 },   // samping (tracking)
  { a: 5.2, b: 0.4, h: 1.7, fov: 46, roll: 0, lookH: 1.3 },    // depan, mundur menghadap pelari
  { a: -5.6, b: 0.2, h: 0.5, fov: 50, roll: 6, lookH: 1.2 }, // rendah di belakang, miring
  { a: -1.0, b: -1.2, h: 6.6, fov: 46, roll: 0, lookH: 0.4 }, // crane atas
  { a: -3.6, b: -2.6, h: 1.5, fov: 40, roll: -4, lookH: 1.3 },// dekat, ikut dari belakang
  { a: 1.2, b: 3.6, h: 1.2, fov: 40, roll: 3, lookH: 1.2 },   // samping sisi lain
];
export const chaseCam = (f: number, target: (f: number) => [number, number], ox = 0, seg = 62, order = [0, 1, 2, 4, 3, 5]): Cam => {
  const rel = (fr: number): Rel => RELS[order[Math.floor(fr / seg) % order.length]];
  const k = smoother(cl((f % seg) / 14)); // 14 frame pertama tiap segmen = transisi dari shot sebelumnya
  const prev = f < seg ? rel(f) : rel(f - seg);
  const cur = rel(f);
  const mix = (a: number, b: number) => (f < seg ? b : a + (b - a) * k);
  const r: Rel = { a: mix(prev.a, cur.a), b: mix(prev.b, cur.b), h: mix(prev.h, cur.h), fov: mix(prev.fov, cur.fov), roll: mix(prev.roll, cur.roll), lookH: mix(prev.lookH, cur.lookH) };
  const [x, y] = target(f);
  const [x2, y2] = target(f + 4);
  const fx = x2 - x, fy = y2 - y;
  const len = Math.hypot(fx, fy) || 1;
  const fwd: [number, number] = [fx / len, fy / len];             // arah lari (Blender)
  const perp: [number, number] = [-fwd[1], fwd[0]];
  const T = toThree(x, y, 0, ox);
  const pos: Vec3 = [T[0] + fwd[0] * r.a + perp[0] * r.b, r.h, T[2] - (fwd[1] * r.a + perp[1] * r.b)];
  const look: Vec3 = [T[0] + fwd[0] * 0.6, r.lookH, T[2] - fwd[1] * 0.6];
  return { pos, look, fov: r.fov, roll: r.roll };
};

/**
 * Kamera "menjauh": kamera DIAM di titik jangkar per segmen dan hanya menoleh mengikuti pelari,
 * sehingga pelari makin kecil menjauh. anchors: [frameMulai, dx, dy, tinggi, fov, roll] relatif posisi pelari di awal segmen
 * (dx/dy koordinat Blender). Dua jangkar terakhir dapat naik (crane) lewat `rise`.
 */
export type Anchor = { from: number; dx: number; dy: number; h: number; fov: number; roll?: number; rise?: number; lookH?: number };
export const recedeCam = (f: number, target: PathFn, anchors: Anchor[], ox = 0): Cam => {
  let a = anchors[0];
  for (const k of anchors) if (f >= k.from) a = k;
  const next = anchors[anchors.indexOf(a) + 1];
  const segLen = (next ? next.from : a.from + 120) - a.from;
  const prog = smoother(cl((f - a.from) / segLen));
  const [sx, sy] = target(a.from);
  const [x, y] = target(f);
  const P = toThree(sx + a.dx, sy + a.dy, a.h + (a.rise ?? 0) * prog, ox);
  const L = toThree(x, y, a.lookH ?? 1.1, ox);
  return { pos: P, look: L, fov: a.fov, roll: a.roll ?? 0 };
};

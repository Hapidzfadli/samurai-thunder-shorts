// Perkakas adegan bersama untuk video gaya 3D explainer (kamera, panggung, subtitle 1 kata, chip, judul).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { ToonRes, Vec3 } from "./three/toon";

export const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (x: number) => {
  const t = cl(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const rp = (f: number, a: number, b: number) => sm((f - a) / Math.max(1, b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lv = (a: Vec3, b: Vec3, k: number): Vec3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const yawTo = (from: Vec3, to: Vec3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
export const talkAt = (f: number, ln: { from: number; to: number }, k = 1) => (f >= ln.from && f < ln.to ? k * (0.25 + 0.75 * Math.abs(Math.sin(f * 0.9)) * (Math.sin(f * 0.37) > -0.6 ? 1 : 0.2)) : 0);
export const walkLerp = (f: number, a: number, b: number, p0: Vec3, p1: Vec3) => {
  const k = rp(f, a, b);
  return { pos: lv(p0, p1, k), walk: f > a && f < b ? (f - a) * 0.42 : undefined, yaw: yawTo(p0, p1) };
};

export type Cam = { pos: Vec3; look: Vec3; fov: number };
export type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number; ease?: number };
export const shotCam = (f: number, shots: Shot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (f < s.to || i === shots.length - 1) {
      const k = sm((f - start) / Math.max(1, (s.ease ?? s.to) - start));
      return { pos: lv(s.p0, s.p1 ?? s.p0, k), look: lv(s.l0, s.l1 ?? s.l0, k), fov: lerp(s.fov ?? 40, s.fov1 ?? s.fov ?? 40, k) };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 40 };
};
/** keluar dari close-up: kamera menjauh pelan dari posisi dekat ke kamera shot */
export const pullBack = (f: number, a: number, b: number, close: Cam, cam: Cam): Cam => {
  if (f < a || f >= b) return cam;
  const k = rp(f, a, b);
  return { pos: lv(close.pos, cam.pos, k), look: lv(close.look, cam.look, k), fov: lerp(close.fov, cam.fov, k) };
};
export const kick = (f: number, hits: number[], amp = 0.05): Vec3 => {
  let x = 0,
    y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 8) {
      const a = (1 - d / 8) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 2 ? 1 : -1) * a * 0.7;
    }
  }
  return [x, y, 0];
};
const Rig: React.FC<{ cam: Cam; shake?: Vec3 }> = ({ cam, shake = [0, 0, 0] }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(cam.pos[0] + shake[0], cam.pos[1] + shake[1], cam.pos[2]);
  camera.lookAt(cam.look[0] + shake[0], cam.look[1] + shake[1], cam.look[2]);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  return null;
};
export const Stage: React.FC<{ cam: Cam; shake?: Vec3; w?: number; h?: number; bg?: string; children: React.ReactNode }> = ({ cam, shake, w = 1080, h = 1920, bg = "#cfe6ff", children }) => (
  <AbsoluteFill style={{ background: bg, width: w, height: h }}>
    <ThreeCanvas width={w} height={h} shadows flat camera={{ fov: cam.fov, near: 0.05, far: 600, position: cam.pos }}>
      <ToonRes />
      <Rig cam={cam} shake={shake} />
      {children}
    </ThreeCanvas>
  </AbsoluteFill>
);

type Timing = { lines: Record<string, { from: number; to: number; words: { w: string; from: number; to: number }[] }[]> };
export const SubWord: React.FC<{ timing: Timing; scene: string; y?: number }> = ({ timing, scene, y = 1390 }) => {
  const f = useCurrentFrame();
  const lines = timing.lines[scene];
  let word = "";
  let born = 0;
  for (const ln of lines) {
    const ws = ln.words;
    for (let i = 0; i < ws.length; i++) {
      const end = i + 1 < ws.length ? ws[i + 1].from : ws[i].to + 8;
      if (f >= ws[i].from - 1 && f < end) {
        word = ws[i].w;
        born = ws[i].from - 1;
      }
    }
  }
  if (!word) return null;
  const pop = 1 + 0.12 * Math.max(0, 1 - (f - born) / 4);
  const size = 84;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      <text x={540} y={y} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={900} fontSize={size * pop} fill="#ffffff" stroke="#0c0c10" strokeWidth={size * 0.2} strokeLinejoin="round" paintOrder="stroke fill">
        {word}
      </text>
    </svg>
  );
};
export const Chip: React.FC<{ at: number; to?: number; top: number; left?: number; children: React.ReactNode; color?: string; size?: number }> = ({ at, to = 99999, top, left = 70, children, color = "#ffd23f", size = 52 }) => {
  const f = useCurrentFrame();
  if (f < at || f > to) return null;
  const k = sm((f - at) / 6) * (1 - sm((f - to + 6) / 6));
  return (
    <div style={{ position: "absolute", top, left, transform: `scale(${0.6 + 0.4 * k})`, transformOrigin: "left center", opacity: k, display: "flex", alignItems: "center", gap: 14, background: "rgba(10,14,28,0.86)", border: `4px solid ${color}`, borderRadius: 22, padding: "14px 26px", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: size, color: "#fff", boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>
      {children}
    </div>
  );
};
export const BigTitle: React.FC<{ at: number; to?: number; top?: number; line1: string; line2?: string; badge?: string; size?: number }> = ({ at, to = 99999, top = 190, line1, line2, badge, size = 80 }) => {
  const f = useCurrentFrame();
  if (f < at || f > to) return null;
  const k = rp(f, at, at + 8) * (1 - rp(f, to - 8, to));
  const sh = "6px 6px 0 #0c0c10, -3px -3px 0 #0c0c10, 3px -3px 0 #0c0c10, -3px 3px 0 #0c0c10";
  return (
    <div style={{ position: "absolute", top, left: 40, right: 40, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 900, opacity: k, transform: `scale(${0.8 + 0.2 * k})` }}>
      <div style={{ fontSize: size, lineHeight: 1.08, color: "#fff", textShadow: sh }}>{line1}</div>
      {line2 ? <div style={{ fontSize: size * 0.82, lineHeight: 1.1, marginTop: 10, color: "#ffd23f", textShadow: sh }}>{line2}</div> : null}
      {badge ? <div style={{ display: "inline-block", marginTop: 22, background: "rgba(10,14,28,0.88)", border: "5px solid #ffd23f", borderRadius: 24, padding: "10px 30px", fontSize: size * 0.68, color: "#fff" }}>{badge}</div> : null}
    </div>
  );
};
export const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(10,10,30,0.35) 100%)", pointerEvents: "none" }} />;
export const Flash: React.FC<{ at: number; dur?: number; color?: string }> = ({ at, dur = 6, color = "#ffffff" }) => {
  const f = useCurrentFrame();
  const k = f >= at && f < at + dur ? 1 - (f - at) / dur : 0;
  return k > 0 ? <AbsoluteFill style={{ background: color, opacity: k * 0.85 }} /> : null;
};

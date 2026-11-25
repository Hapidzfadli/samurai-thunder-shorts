import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./kelelawar_timing.json";
import { Vec3 } from "./three/objects";
import { P } from "./three/objectsRig";
import { BeanCard, BeanParams, beanHandWorld, beanWalk } from "./three/objectsBean";
import { InkBox, SkyDome } from "./three/objectsMolase";
import { Sign, WallMap, CrateStack, BarrelStack } from "./three/objectsMolaseProps";
import { HangingLamp } from "./three/objectsAbuProps";
import { FireCluster } from "./three/objectsBandung";
import { SmokeColumn } from "./three/objectsSby";
import { BlueGrid } from "./three/toon";
import {
  BatCanister, BatCard, BatFridge, BatParams, BatSwarm, CaveMouth, Cactus, DesertGround, FuelTank, Hangar, LabBench, Mesa, Runway, StaffCar,
} from "./three/objectsKelelawar";
import { ADAMS, ARA, DODI, JENDERAL } from "./SheetKelelawar";

export type KlScene = "hook" | "gua" | "lab" | "kulkas" | "cara" | "kandang" | "tangki" | "akhir";
export const KL_ORDER = timing.order as KlScene[];
export const TOTAL_FRAMES_KELELAWAR = timing.totalFrames;
const DUR = (k: KlScene): number => (timing.scenes as Record<string, { durationInFrames: number }>)[k].durationInFrames;

type Word = { w: string; from: number; to: number };
type Line = { voice: string; style: string; text: string; from: number; to: number; words: Word[] };
const LINES = timing.lines as unknown as Record<KlScene, Line[]>;
const EV = timing.events as Record<string, number>;

const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const easeOutBack = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
const ramp = (f: number, a: number, len: number) => smoother(cl((f - a) / len));
const pulse = (f: number, at: number, len = 10) => {
  const d = f - at;
  return d < 0 || d > len ? 0 : Math.sin((d / len) * Math.PI);
};

/* ---------------------------------------------------- jadwal kata/baris */
const lineAt = (s: KlScene, i: number) => LINES[s][i];
const wordF = (s: KlScene, i: number, w: string, fallback = 0): number => {
  const ln = LINES[s][i];
  if (!ln) return fallback;
  const key = w.toLowerCase();
  const hit = ln.words.find((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(key));
  return hit ? hit.from : ln.from;
};
/** mulut bergerak hanya saat kata diucapkan oleh suara itu (dialog, bukan narasi) */
const mouth = (s: KlScene, voice: string, f: number, skip: number[] = []): number => {
  const lines = LINES[s];
  for (let i = 0; i < lines.length; i++) {
    if (skip.includes(i) || lines[i].voice !== voice) continue;
    for (const w of lines[i].words) {
      if (f >= w.from - 1 && f <= w.to + 1) return 0.3 + 0.7 * Math.abs(Math.sin((f - w.from) * 0.9 + w.from));
    }
  }
  return 0;
};
const speaking = (s: KlScene, i: number, f: number) => f >= LINES[s][i].from - 2 && f <= LINES[s][i].to + 2;
/** anggukan kepala pada kata-kata bertekanan selama baris diucapkan */
const nod = (s: KlScene, voice: string, f: number) => {
  let v = 0;
  for (const ln of LINES[s]) {
    if (ln.voice !== voice) continue;
    for (const w of ln.words) if (w.w.length > 5) v += pulse(f, w.from - 1, 8) * 5;
  }
  return v;
};

/* ---------------------------------------------------- kamera */
type Shot = { to: number; p0: Vec3; p1?: Vec3; l0: Vec3; l1?: Vec3; fov?: number; fov1?: number; roll0?: number; roll1?: number; creep?: number; ease?: "out" };
type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };
const shotCam = (frame: number, shots: Shot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, s.to - start);
      const local = frame - start;
      const x = cl(local / len);
      const k = s.ease === "out" ? 1 - Math.pow(1 - x, 3) : smoother(x);
      const look = lerpV(s.l0, s.l1 ?? s.l0, k);
      const p = lerpV(s.p0, s.p1 ?? s.p0, k);
      const push = 1 - (s.creep ?? 0.0008) * Math.min(local, 400);
      const pos: Vec3 = [look[0] + (p[0] - look[0]) * push, look[1] + (p[1] - look[1]) * push, look[2] + (p[2] - look[2]) * push];
      const f0 = s.fov ?? 36;
      return { pos, look, fov: lerpN(f0, s.fov1 ?? f0, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 36, roll: 0 };
};
const kick = (f: number, hits: number[], amp = 0.12, len = 12): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < len) {
      const a = (1 - d / len) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 3 ? 1 : -1) * a * 0.7;
    }
  }
  return [x, y, 0];
};
const Rig: React.FC<{ cam: Cam; shake?: Vec3 }> = ({ cam, shake = [0, 0, 0] }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(cam.pos[0] + shake[0], cam.pos[1] + shake[1], cam.pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(cam.look[0] + shake[0] * 0.5, cam.look[1] + shake[1] * 0.5, cam.look[2]);
  camera.rotateZ((cam.roll * Math.PI) / 180);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};
const Stage: React.FC<{ cam: Cam; shake?: Vec3; bg?: string; fog?: [string, number, number]; children: React.ReactNode }> = ({ cam, shake, bg = "#261828", fog, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.05, far: 260, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <color attach="background" args={[bg]} />
        {fog && <fog attach="fog" args={fog} />}
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
const Lights: React.FC<{ key1?: string; sky?: string; ground?: string; dir?: Vec3; k?: number; hemi?: number }> = ({
  key1 = "#ffdcae", sky = "#a8c4f0", ground = "#7a5a50", dir = [-8, 12, 10], k = 2.1, hemi = 1.7,
}) => (
  <>
    <hemisphereLight args={[sky, ground, hemi]} />
    <directionalLight position={[0, 6, 14]} intensity={0.8} color="#fff2de" />
    <directionalLight position={dir} intensity={k} color={key1} castShadow shadow-mapSize={[1024, 1024]} />
  </>
);
const Grade: React.FC<{ warm?: number; cool?: number; flash?: number; heat?: number }> = ({ warm = 0, cool = 0, flash = 0, heat = 0 }) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill style={{ mixBlendMode: "soft-light", background: warm > 0 ? `rgba(255,140,60,${0.35 * warm})` : `rgba(60,90,210,${0.32 * cool})` }} />
    )}
    {heat > 0 && <AbsoluteFill style={{ background: `linear-gradient(rgba(255,240,180,${0.22 * heat}), rgba(255,200,120,0) 45%)` }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(28,10,24,0.5) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(20,8,20,0) 70%, rgba(20,8,20,0.45) 88%, rgba(20,8,20,0.65) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: "#fff8e0", opacity: flash }} />}
  </>
);

/* ---------------------------------------------------- overlay 2D */
const Chip: React.FC<{ from: number; to: number; top: number; children: React.ReactNode; color?: string; size?: number }> = ({ from, to, top, children, color = "#991b1b", size = 64 }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 200 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, textAlign: "center", transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) * o }}>
      <div style={{ display: "inline-block", background: "rgba(255,250,235,0.97)", border: `7px solid ${color}`, borderRadius: 28, padding: "14px 32px", fontFamily: "Anton, Impact, sans-serif", fontSize: size, color: "#1a121c", boxShadow: "0 14px 34px rgba(0,0,0,0.35)", lineHeight: 1.05 }}>
        {children}
      </div>
    </div>
  );
};
const Stamp: React.FC<{ text: string; from: number; to: number; color?: string; top?: number; rot?: number }> = ({ text, from, to, color = "#dc2626", top = 470, rot = -6 }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 9, stiffness: 260 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 60, right: 60, textAlign: "center", transform: `rotate(${rot}deg) scale(${1.6 - 0.6 * s})`, opacity: Math.min(1, s * 2) * o }}>
      <div style={{ display: "inline-block", border: `10px solid ${color}`, borderRadius: 20, padding: "12px 34px", background: "rgba(255,248,235,0.94)", fontFamily: "Anton, Impact, sans-serif", fontSize: 76, color, letterSpacing: 3, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
        {text}
      </div>
    </div>
  );
};
/** gelembung kecil pikiran/emote di dekat kepala (koordinat layar) */
const Emote: React.FC<{ x: number; y: number; from: number; to: number; text: string; size?: number; color?: string }> = ({ x, y, from, to, text, size = 84, color = "#241726" }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 8, stiffness: 240 } });
  const o = interpolate(f, [to - 6, to], [1, 0], clamp);
  const wob = Math.sin((f - from) * 0.4) * 6;
  return (
    <div style={{ position: "absolute", left: x - 120, top: y - 60, width: 240, textAlign: "center", transform: `scale(${s}) rotate(${wob}deg)`, opacity: o }}>
      <span style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: size, color, WebkitTextStroke: "5px #fff", paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(0,0,0,0.25)" }}>{text}</span>
    </div>
  );
};

/* insert close-up tangan (ilustrasi SVG besar bergaya sama) */
const HandSvg: React.FC<{ x: number; y: number; rot?: number; s?: number; grip?: number; flip?: boolean; sleeve?: string; skin?: string }> = ({ x, y, rot = 0, s = 1, grip = 0, flip = false, sleeve = "#7d7451", skin = "#f0d2ad" }) => {
  const ink = "#241726";
  // telapak menghadap kanan; jari-jari kapsul yang menekuk sesuai grip
  const fingers = [-54, -18, 18, 50].map((fy, i) => {
    const len = [92, 104, 98, 80][i];
    const ang = grip * 70;
    return (
      <g key={i} transform={`translate(70 ${fy}) rotate(${ang})`}>
        <rect x="-8" y="-17" width={len} height="34" rx="17" fill={skin} stroke={ink} strokeWidth="11" />
        <line x1={len * 0.55} y1="-10" x2={len * 0.55} y2="10" stroke={ink} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      </g>
    );
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`}>
      <path d="M -300 -78 L -70 -86 L -60 86 L -300 96 Z" fill={sleeve} stroke={ink} strokeWidth="14" strokeLinejoin="round" />
      <path d="M -290 -40 L -80 -46" stroke="rgba(0,0,0,0.18)" strokeWidth="10" />
      <rect x="-84" y="-92" width="34" height="186" rx="10" fill={sleeve} stroke={ink} strokeWidth="12" />
      {fingers}
      <ellipse cx="20" cy="0" rx="78" ry="84" fill={skin} stroke={ink} strokeWidth="14" />
      <g transform={`translate(10 -70) rotate(${-40 + grip * 50})`}>
        <rect x="-10" y="-18" width="84" height="36" rx="18" fill={skin} stroke={ink} strokeWidth="11" />
      </g>
      <path d="M -10 30 Q 20 44 50 28" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" opacity="0.45" />
    </g>
  );
};
type InsertKind = "tie" | "handle" | "latch";
const Insert: React.FC<{ kind: InsertKind; from: number; len?: number }> = ({ kind, from, len = 38 }) => {
  const f = useCurrentFrame();
  const d = f - from;
  if (d < 0 || d > len) return null;
  const k = d / len;
  const inK = smoother(cl(d / 5));
  const outK = smoother(cl((len - d) / 5));
  const op = Math.min(inK, outK);
  const a = smoother(cl((d - 6) / (len - 14)));
  const bg = kind === "handle" ? "#cfe2f2" : kind === "latch" ? "#f4c27a" : "#e8d2ae";
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs>
          <radialGradient id="ig" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#fff8ee" />
            <stop offset="100%" stopColor={bg} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1080" height="1920" fill="url(#ig)" />
        {/* garis kecepatan */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={i} x1={540} y1={900} x2={540 + Math.cos(i * 0.8 + k) * 900} y2={900 + Math.sin(i * 0.8 + k) * 900} stroke="rgba(36,23,38,0.07)" strokeWidth="40" />
        ))}
        {kind === "tie" && (
          <g>
            {/* kelelawar besar + tabung diikat */}
            <g transform="translate(560 860)">
              <path d="M -330 -60 Q -160 -220 -40 -80 Q -150 -40 -330 -60 Z" fill="#4c3c4e" stroke="#241726" strokeWidth="14" />
              <path d="M 330 -60 Q 160 -220 40 -80 Q 150 -40 330 -60 Z" fill="#4c3c4e" stroke="#241726" strokeWidth="14" />
              <ellipse cx="0" cy="0" rx="120" ry="150" fill="#6e5a6a" stroke="#241726" strokeWidth="16" />
              <ellipse cx="0" cy="50" rx="70" ry="74" fill="#a08c96" />
              <circle cx="-42" cy="-62" r="30" fill="#fff" stroke="#241726" strokeWidth="10" />
              <circle cx="42" cy="-62" r="30" fill="#fff" stroke="#241726" strokeWidth="10" />
              <circle cx={-42 + 8 * Math.sin(d * 0.3)} cy="-58" r="13" fill="#241726" />
              <circle cx={42 + 8 * Math.sin(d * 0.3)} cy="-58" r="13" fill="#241726" />
              <path d="M -30 0 Q 0 30 30 0" fill="none" stroke="#241726" strokeWidth="10" />
              {/* tabung datang dari bawah lalu terikat */}
              <g transform={`translate(0 ${lerpN(380, 120, a)})`}>
                <rect x="-38" y="0" width="76" height="140" rx="20" fill="#c8c0a8" stroke="#241726" strokeWidth="12" />
                <rect x="-34" y="46" width="68" height="22" fill="#d63a2a" />
              </g>
              {/* tali */}
              <path d={`M -120 110 Q 0 ${130 + 30 * (1 - a)} 120 110`} fill="none" stroke="#8a6a3a" strokeWidth="14" strokeDasharray={`${a * 300} 400`} />
            </g>
            <HandSvg x={lerpN(160, 360, a)} y={lerpN(1300, 1060, a)} rot={-35} s={1.6} grip={a} />
            <HandSvg x={lerpN(920, 760, a)} y={lerpN(1320, 1080, a)} rot={-145} s={1.6} grip={a} flip />
          </g>
        )}
        {kind === "handle" && (
          <g>
            <rect x="140" y="260" width="800" height="1400" rx="30" fill="#e9eef2" stroke="#241726" strokeWidth="18" />
            <rect x="180" y="300" width="720" height="1320" rx="22" fill="#d7e1ea" stroke="#241726" strokeWidth="10" />
            <rect x="370" y="520" width="340" height="110" rx="12" fill="#f4e8c8" stroke="#241726" strokeWidth="8" />
            <text x="540" y="595" textAnchor="middle" fontFamily="Anton, Impact" fontSize="56" fill="#b0201a">JANGAN DIBUKA!</text>
            {/* gagang ditarik */}
            <g transform={`translate(${lerpN(800, 760, a)} 980) rotate(${-a * 10})`}>
              <rect x="-22" y="-170" width="44" height="340" rx="16" fill="#5a6a80" stroke="#241726" strokeWidth="12" />
            </g>
            <HandSvg x={lerpN(960, 900, a)} y={980} rot={180} s={1.7} grip={0.3 + 0.7 * smoother(cl(d / 12))} flip />
            {/* kristal es */}
            {[0, 1, 2, 3, 4].map((i) => (
              <text key={i} x={240 + i * 150} y={1450 + (i % 2) * 60} fontSize="70" fill="#9fd0ff" fontFamily="Anton">*</text>
            ))}
          </g>
        )}
        {kind === "latch" && (
          <g>
            {/* kandang kayu + palang */}
            <rect x="120" y="420" width="840" height="1100" rx="20" fill="#b9824a" stroke="#241726" strokeWidth="18" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={200 + i * 125} y="480" width="34" height="980" fill="#5a4030" stroke="#241726" strokeWidth="8" />
            ))}
            {/* mata kelelawar dari dalam gelap */}
            {[[330, 760], [610, 900], [480, 1180], [760, 700]].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x - 18} cy={y} r="16" fill="#ffe86a" stroke="#241726" strokeWidth="5" />
                <circle cx={x + 18} cy={y} r="16" fill="#ffe86a" stroke="#241726" strokeWidth="5" />
              </g>
            ))}
            <g transform={`translate(600 980) rotate(${-a * 80})`}>
              <rect x="-20" y="-20" width="260" height="56" rx="14" fill="#8a8a92" stroke="#241726" strokeWidth="12" />
            </g>
            <rect x="560" y="930" width="90" height="120" rx="12" fill="#6a6a74" stroke="#241726" strokeWidth="12" />
            <HandSvg x={lerpN(980, 900, a)} y={lerpN(1000, 860, a)} rot={-160 + a * 40} s={1.6} grip={0.4} flip sleeve="#857b56" skin="#f6dcc0" />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

/* hologram layar terbelah: rumah-rumah kertas yang menyala satu per satu */
const HoloPanel: React.FC<{ from: number; to: number; fireFrom: number }> = ({ from, to, fireFrom }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 13, stiffness: 180 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  const houses = new Array(12).fill(0).map((_, i) => ({ x: 90 + (i % 6) * 150, y: 210 + Math.floor(i / 6) * 190 }));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 170, height: 560, transform: `scaleY(${s})`, opacity: o, transformOrigin: "50% 0%" }}>
      <svg width="1000" height="560" viewBox="0 0 1000 560">
        <rect x="4" y="4" width="992" height="552" rx="26" fill="rgba(6,30,60,0.88)" stroke="#5fd4ff" strokeWidth="8" />
        {new Array(20).fill(0).map((_, i) => <line key={`v${i}`} x1={i * 52} y1="8" x2={i * 52} y2="552" stroke="rgba(95,212,255,0.18)" strokeWidth="2" />)}
        {new Array(11).fill(0).map((_, i) => <line key={`h${i}`} x1="8" y1={i * 52} x2="992" y2={i * 52} stroke="rgba(95,212,255,0.18)" strokeWidth="2" />)}
        <text x="500" y="70" textAnchor="middle" fontFamily="Anton, Impact" fontSize="46" fill="#9fe6ff">1 KELELAWAR = 1 API</text>
        {houses.map((h, i) => {
          const lit = f > fireFrom + i * 3;
          const fl = lit ? 1 + 0.15 * Math.sin(f * 0.8 + i) : 0;
          return (
            <g key={i} transform={`translate(${h.x} ${h.y})`}>
              <path d="M -50 0 L 0 -46 L 50 0 Z" fill="rgba(95,212,255,0.25)" stroke="#5fd4ff" strokeWidth="5" />
              <rect x="-40" y="0" width="80" height="62" fill="rgba(95,212,255,0.12)" stroke="#5fd4ff" strokeWidth="5" />
              {!lit && i < 6 && <text x="0" y="-52" textAnchor="middle" fontSize="28" fill="#9fe6ff" fontFamily="Anton">^v^</text>}
              {lit && (
                <g transform={`scale(${fl})`}>
                  <path d="M -30 -30 Q -36 -80 0 -110 Q 6 -70 30 -60 Q 40 -30 20 -24 Z" fill="#ff7a2a" stroke="#ffd23a" strokeWidth="5" />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** judul pembuka besar dengan per-huruf memantul */
const BigTitle: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  const word = "BOM KELELAWAR";
  return (
    <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center", opacity: o }}>
      <div>
        {word.split("").map((ch, i) => {
          const s = spring({ frame: f - from - i * 1.5, fps: 30, config: { damping: 8, stiffness: 260 } });
          return (
            <span key={i} style={{ display: "inline-block", fontFamily: "Anton, Impact, sans-serif", fontSize: 100, color: i < 3 ? "#ffd23f" : "#ffffff", WebkitTextStroke: "9px #241726", paintOrder: "stroke fill", textShadow: "0 12px 0 rgba(36,23,38,0.6)", transform: `translateY(${(1 - s) * -160}px) rotate(${(1 - s) * (i % 2 ? 20 : -20)}deg)`, opacity: Math.min(1, s * 2), whiteSpace: "pre" }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 8, display: "inline-block", background: "#991b1b", color: "#fff", fontFamily: "Anton, Impact, sans-serif", fontSize: 62, padding: "6px 36px", borderRadius: 18, border: "6px solid #241726", transform: `scale(${spring({ frame: f - from - 16, fps: 30, config: { damping: 10 } })})` }}>
        1943 · KISAH NYATA
      </div>
    </div>
  );
};

/* caption global 1-2 kata; warna tepi menandai pembicara */
export const KelelawarCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cue = timing.captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const sp = spring({ frame: frame - cue.startFrame, fps, config: { damping: 12, stiffness: 250 } });
  const txt = cue.text.toLowerCase();
  const size = Math.min(92, 760 / (Math.max(4, txt.length) * 0.52));
  const ara = cue.voice === "ara";
  return (
    <div style={{ position: "absolute", top: 1370, left: 60, right: 60, textAlign: "center", pointerEvents: "none" }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.1,
          color: cue.highlight ? "#ffd23f" : ara ? "#ffd6ea" : "#ffffff",
          WebkitTextStroke: `7px ${ara ? "#5a1838" : "rgba(24,10,28,0.96)"}`,
          paintOrder: "stroke fill",
          textShadow: "0 8px 0 rgba(24,10,28,0.72)",
          transform: `scale(${0.7 + 0.3 * sp}) rotate(${(1 - sp) * (ara ? 4 : -4)}deg)`,
          opacity: Math.min(1, sp * 1.6),
        }}
      >
        {txt}
      </span>
    </div>
  );
};

export const DissolveKl: React.FC<{ first?: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, 8], [0, 1], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/* ---------------------------------------------------- pose tokoh */
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({
  bob: Math.abs(Math.sin(t * 1.8 + k)) * 3,
  armL: [-8 + Math.sin(t * 1.3 + k) * 4, -10],
  armR: [8 - Math.sin(t * 1.3 + k) * 4, -10],
  blink: (t + k * 0.7) % 3.1 < 0.11,
  headTilt: Math.sin(t * 0.9 + k) * 2,
});
/** gestur tangan saat bicara: tangan naik-turun mengikuti kata */
const gesture = (f: number, m: number, k = 0): Partial<BeanParams> =>
  m > 0 ? { armR: [40 + Math.sin(f * 0.25 + k) * 25, -40 + Math.sin(f * 0.37 + k) * 20], armL: [-14 - Math.sin(f * 0.2 + k) * 10, -18] } : {};

/* ---------------------------------------------------- dunia bersama */
const DesertWorld: React.FC<{ dusk?: boolean; far?: number; noon?: boolean }> = ({ dusk = false, noon = false }) => (
  <group>
    <SkyDome top={dusk ? "#3a2a6a" : noon ? "#4a8fe0" : "#6aa8ee"} horizon={dusk ? "#ff9a5a" : noon ? "#fff0c8" : "#ffe0b0"} r={200} />
    <DesertGround size={300} />
    <Mesa pos={[-26, 0, -60]} w={22} h={9} />
    <Mesa pos={[22, 0, -70]} w={28} h={12} />
    <Mesa pos={[48, 0, -45]} w={14} h={6} />
    <Mesa pos={[-55, 0, -40]} w={18} h={7} />
    {[[-9, -18], [11, -22], [-16, -9], [15, -12], [-4, -30], [26, -26]].map(([x, z], i) => (
      <Cactus key={i} pos={[x, 0, z]} s={0.8 + (i % 3) * 0.25} />
    ))}
  </group>
);

/* ================================================================== */
/* 1. HOOK                                                            */
/* ================================================================== */
export const SceneKlHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("hook");
  const kel = EV["hook.kelelawar"];
  const cam = shotCam(f, [
    { to: kel, p0: [0, 1.8, 9.5], p1: [0, 1.9, 7.6], l0: [0, 3.2, -6], l1: [0, 2.6, 0], fov: 40, fov1: 36 },
    { to: dur, p0: [0, 1.9, 7.6], p1: [0.4, 1.8, 6.4], l0: [0, 2.6, 0], l1: [0, 2.7, 0], fov: 36, fov1: 34 },
  ]);
  const fly = smoother(cl(f / Math.max(10, kel - 4)));
  const batPos: Vec3 = lerpV([1.6, 4.2, -16], [0, 2.55, 2.8], fly);
  const hover = f > kel - 4 ? Math.sin((f - kel) * 0.25) * 0.08 : 0;
  const flap = 0.5 + 0.5 * Math.sin(t * (f > kel ? 11 : 16));
  const grin = f >= kel - 2;
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [kel + 16], 0.05)} bg="#2a1a3a" fog={["#e08a5a", 40, 160]}>
        <DesertWorld dusk />
        <Lights key1="#ffb070" sky="#ff9a7a" ground="#5a3a40" k={2.0} dir={[10, 6, -6]} />
        <BatSwarm center={[0, 7, -22]} count={34} spread={[26, 6, 10]} t={t} size={0.9} drift={[0.6, 0.4, 2.2]} seed={7} />
        <BatCard position={[batPos[0], batPos[1] + hover, batPos[2]]} size={1.6} params={{ flap, expr: grin ? "sneaky" : "happy", bomb: true, fuse: grin ? 0.5 + 0.5 * Math.abs(Math.sin(f * 0.7)) : 0, seed: 1 }} roll={Math.sin(t * 3) * 0.12 * (1 - fly * 0.6)} />
      </Stage>
      <Grade warm={0.5} flash={pulse(f, kel + 14, 6) * 0.5} />
      <BigTitle from={kel + 12} to={dur + 10} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. GUA CARLSBAD                                                    */
/* ================================================================== */
export const SceneKlGua: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("gua");
  const jut = EV["gua.jutaan"];
  const gua = EV["gua.gua"];
  const cam = shotCam(f, [
    { to: jut + 10, p0: [0.5, 2.2, 13], p1: [-0.6, 2.6, 10.5], l0: [0, 2.0, -4], l1: [0, 2.8, -4], fov: 42, fov1: 40 },
    { to: dur, p0: [-0.6, 2.6, 10.5], p1: [2.8, 1.7, 5.6], l0: [0, 2.8, -4], l1: [1.9, 1.5, 1.4], fov: 40, fov1: 36 },
  ]);
  const out = cl((f - jut + 8) / 30);
  const look = f > jut ? 1 : 0;
  const pointK = ramp(f, gua - 6, 10);
  const idea = f > dur - 40;
  const adamsP = bean(ADAMS, {
    ...idle(t, 2),
    expr: f < jut ? "neutral" : f < gua ? "shock" : "happy",
    mouthOpen: f >= jut && f < gua ? 0.8 : 0,
    headTilt: look ? -10 : 0,
    armR: [lerpN(10, 150, pointK), lerpN(-10, -20, pointK)],
    armL: f > gua + 10 ? [-30 + Math.sin(t * 6) * 15, -60] : [-8, -10],
    bob: f > gua + 10 ? Math.abs(Math.sin(t * 7)) * 8 : 2,
  });
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2a1a3a" fog={["#e89a6a", 30, 140]}>
        <DesertWorld dusk />
        <Lights key1="#ffb070" sky="#ffa07a" ground="#5a3a40" k={2.1} dir={[9, 7, 4]} />
        <CaveMouth pos={[0, 0, -5]} scale={1.0} />
        <Cactus pos={[-4.2, 0, -1]} s={1.1} />
        <Cactus pos={[4.6, 0, -2.5]} s={0.9} />
        <StaffCar pos={[3.2, 0, 0.3]} rot={[0, -0.6, 0]} />
        <BeanCard position={[1.8, 0, 1.4]} height={2.0} params={adamsP} />
        {out > 0 && <BatSwarm center={[0, 1.6 + out * 3, -4.6 + out * 2]} count={40} spread={[3.6 + out * 9, 1.5 + out * 6, 2 + out * 3]} t={t} size={0.42} drift={[0.2, 0.9, 0.6]} seed={3} />}
        {idea && (
          <group position={[1.8, 2.55 + 0.05 * Math.sin(t * 8), 1.4]} scale={easeOutBack(cl((f - (dur - 40)) / 10))}>
            <P geo={() => <sphereGeometry args={[0.17, 16, 12]} />} color="#fff4a0" emissive="#ffd23a" pos={[0, 0, 0]} hull={0.12} />
            <P geo={() => <cylinderGeometry args={[0.08, 0.08, 0.1, 10]} />} color="#9a9aa4" pos={[0, -0.18, 0]} hull={0.15} />
          </group>
        )}
      </Stage>
      <Grade warm={0.55} />
      <Chip from={8} to={jut + 20} top={170} color="#7a1f1f" size={52}>GUA CARLSBAD · NEW MEXICO</Chip>
      <Emote x={720} y={690} from={jut} to={gua + 4} text="!!" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3-5. LAB                                                           */
/* ================================================================== */
const plankTex = (() => {
  let c: THREE.CanvasTexture | null = null;
  return () => {
    if (c) return c;
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 512;
    const g = cv.getContext("2d")!;
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ["#a7774a", "#9a6c42", "#b0804f", "#946640"][i % 4];
      g.fillRect(0, i * 64, 512, 64);
      g.fillStyle = "rgba(40,20,10,0.55)";
      g.fillRect(0, i * 64 + 60, 512, 4);
      for (let k = 0; k < 14; k++) {
        g.fillStyle = "rgba(60,30,15,0.15)";
        g.fillRect((k * 97 + i * 31) % 512, i * 64 + 10 + (k % 4) * 11, 60 + (k % 3) * 30, 2);
      }
    }
    c = new THREE.CanvasTexture(cv);
    c.colorSpace = THREE.SRGBColorSpace;
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(3, 2);
    return c;
  };
})();
const LabRoom: React.FC<{ t: number; fridgeOpen?: number; frost?: number }> = ({ t, fridgeOpen = 0, frost = 1 }) => {
  const wall = plankTex();
  return (
    <group>
      {/* lantai & dinding */}
      <InkBox pos={[0, -0.05, -1]} size={[16, 0.1, 12]} color="#7a6a5a" />
      <mesh position={[0, 3, -4.2]} receiveShadow>
        <planeGeometry args={[16, 6.4]} />
        <meshStandardMaterial map={wall} roughness={1} />
      </mesh>
      <mesh position={[-5.5, 3, -1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 6.4]} />
        <meshStandardMaterial map={wall} roughness={1} color="#d8c8b8" />
      </mesh>
      <InkBox pos={[0, 0.25, -4.15]} size={[16, 0.5, 0.1]} color="#5a3a24" />
      {/* dekorasi dinding */}
      <WallMap pos={[-1.6, 2.6, -4.1]} />
      <Sign pos={[1.7, 3.1, -4.1]} w={2.0} h={0.75} text="PROYEK X-RAY" bg="#f4e8c8" fg="#b0201a" />
      <Sign pos={[1.7, 2.3, -4.1]} w={2.0} h={0.55} text="RAHASIA · 1943" bg="#2a2a3a" fg="#ffd23f" />
      <Sign pos={[-3.9, 2.4, -4.1]} w={1.3} h={1.0} text="DILARANG MASUK" bg="#ffe08a" fg="#2a1a10" />
      {/* bendera bergaris sederhana */}
      <group position={[3.9, 2.6, -4.1]}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <InkBox key={i} pos={[0, 0.42 - i * 0.14, 0]} size={[1.3, 0.14, 0.02]} color={i % 2 ? "#f4f0e8" : "#b0302a"} ink={0.005} />)}
        <InkBox pos={[-0.36, 0.28, 0.02]} size={[0.58, 0.42, 0.02]} color="#2a3a7a" ink={0.005} />
      </group>
      <HangingLamp pos={[-0.8, 5.2, -1.2]} lit len={1.6} />
      <HangingLamp pos={[2.4, 5.2, -2.0]} lit len={1.4} />
      {/* perabot */}
      <LabBench pos={[-0.4, 0, -2.6]} />
      <BatFridge pos={[2.9, 0, -2.6]} open={fridgeOpen} frost={frost} t={t} rot={[0, -0.35, 0]} />
      <BatCanister pos={[-3.3, 0, -2.4]} open={0.25} scale={0.9} />
      <CrateStack pos={[-4.6, 0, -3.3]} />
      <BarrelStack pos={[4.3, 0, -3.6]} />
      {/* kandang kecil di meja dengan kelelawar bergelantung */}
      <group position={[-1.3, 0.96, -2.75]}>
        <InkBox pos={[0, 0.3, 0]} size={[0.7, 0.6, 0.45]} color="#c9a878" ink={0.02} />
        {[0, 1].map((i) => <BatCard key={i} position={[-0.15 + i * 0.3, 0.38, 0.25]} size={0.24} params={{ flap: 0, hang: true, expr: "sleepy", seed: 20 + i }} />)}
      </group>
    </group>
  );
};

export const SceneKlLab: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("lab");
  const L0 = lineAt("lab", 0), L1 = lineAt("lab", 1), L2 = lineAt("lab", 2);
  const lihat = EV["lab.lihat"];
  const bomF = wordF("lab", 2, "bom");
  const rib = EV["lab.ribuan2"];
  const cam = shotCam(f, [
    { to: L1.from - 4, p0: [0.5, 1.75, 6.6], p1: [0.2, 1.65, 5.4], l0: [0.05, 1.3, 0], l1: [0.05, 1.35, 0], fov: 36, fov1: 34 },
    { to: L2.from, p0: [0.9, 1.55, 4.4], p1: [1.1, 1.5, 4.0], l0: [0.45, 1.45, 0], fov: 32, fov1: 30 },
    { to: dur, p0: [0.2, 1.7, 5.6], p1: [0.1, 1.8, 6.6], l0: [0.0, 1.4, 0], l1: [0.0, 1.5, 0], fov: 34, fov1: 38 },
  ]);
  const mD = mouth("lab", "dodi", f);
  const mA = mouth("lab", "ara", f);
  const lift = ramp(f, 6, 14);
  const offer = ramp(f, lihat - 4, 10);
  const spread = ramp(f, rib - 6, 10);
  const dodiPos: Vec3 = [-0.5, 0, 0.8];
  const araPos: Vec3 = [0.62, 0, -0.15];
  const dodiP = bean(DODI, {
    ...idle(t, 0),
    ...gesture(f, speaking("lab", 2, f) && f < rib - 8 ? mD : 0, 1),
    expr: speaking("lab", 1, f) ? "neutral" : f >= rib - 4 ? "happy" : mD > 0 ? "smug" : "smug",
    mouthOpen: mD,
    headTilt: nod("lab", "dodi", f) - (speaking("lab", 1, f) ? 6 : 0),
    armR: f >= rib - 6 ? [lerpN(60, 150, spread), -10] : [lerpN(10, lerpN(55, 85, offer), lift), lerpN(-10, -60 + offer * 45, lift)],
    armL: f >= rib - 6 ? [lerpN(-14, -150, spread), 10] : [-12, -14],
    lean: offer * 6 - (f >= rib ? 3 : 0),
    bob: f >= rib - 4 ? Math.abs(Math.sin(t * 8)) * 6 : idle(t).bob,
  });
  const camPos = [0.5, 1.7, 6] as Vec3;
  const batHand = beanHandWorld(dodiP, "R", dodiPos, 2.05, camPos);
  const batOnBench: Vec3 = [-0.9, 1.12, -2.3];
  const batPos: Vec3 = f < 6 ? batOnBench : lerpV(batOnBench, [batHand[0], batHand[1] + 0.12, batHand[2] + 0.05], cl((f - 6) / 12));
  const surprised = f >= EV["lab.kecil"] - 3 && f < L2.from;
  const araP = bean(ARA, {
    ...idle(t, 3),
    ...(mA > 0 ? { armL: [-30 + Math.sin(f * 0.3) * 10, -70] as [number, number] } : {}),
    expr: f < L1.from - 6 ? (f > lihat ? "think" : "neutral") : speaking("lab", 1, f) ? (surprised ? "shock" : "think") : f >= rib ? "worried" : "think",
    mouthOpen: mA,
    lean: speaking("lab", 1, f) ? -4 : f > lihat ? 4 : 0,
    headTilt: (speaking("lab", 1, f) ? 8 : 0) + nod("lab", "ara", f),
    prop: "paper",
    propHand: "R",
    sweat: f >= rib,
  });
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [rib], 0.03)} bg="#3a2a28" fog={["#3a2a28", 14, 40]}>
        <LabRoom t={t} />
        <Lights key1="#ffd8a0" sky="#ffe8cc" ground="#6a4a3a" k={1.8} dir={[-3, 9, 7]} hemi={1.6} />
        <BeanCard position={araPos} height={1.92} params={araP} />
        <BeanCard position={dodiPos} height={2.05} params={dodiP} />
        <BatCard position={batPos} size={0.55} params={{ flap: f < 6 ? 0 : 0.5 + 0.5 * Math.sin(t * 12), expr: f > L1.from ? "sneaky" : "happy", bomb: f > bomF + 30, seed: 2 }} />
      </Stage>
      <Grade warm={0.25} />
      <Insert kind="tie" from={bomF - 6} len={40} />
      <HoloPanel from={rib - 6} to={dur + 8} fireFrom={EV["lab.kebakaran"] - 4} />
      <Emote x={720} y={660} from={EV["lab.kecil"] - 2} to={L1.to + 8} text="?" color="#5a1838" />
    </AbsoluteFill>
  );
};

export const SceneKlKulkas: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("kulkas");
  const L0 = lineAt("kulkas", 0), L1 = lineAt("kulkas", 1), L2 = lineAt("kulkas", 2);
  const kul = EV["kul.kulkas"];
  const tidur = EV["kul.tidur"];
  const lucu = EV["kul.lucu"];
  const insertF = kul - 2;
  const openK = ramp(f, insertF + 30, 14) * (1 - ramp(f, dur - 26, 10));
  const cam = shotCam(f, [
    { to: L1.from, p0: [0.4, 1.6, 5.4], p1: [0.6, 1.55, 4.6], l0: [0.9, 1.3, -1.3], l1: [0.9, 1.3, -1.3], fov: 36 },
    { to: L2.from - 10, p0: [0.3, 1.5, 3.4], p1: [0.6, 1.45, 2.4], l0: [2.0, 1.35, -2.2], l1: [2.3, 1.4, -2.4], fov: 34, fov1: 32 },
    { to: dur, p0: [0.0, 1.6, 5.0], p1: [-0.2, 1.7, 5.8], l0: [0.6, 1.35, -0.8], l1: [0.6, 1.4, -0.9], fov: 36, fov1: 38 },
  ]);
  const mD = mouth("kulkas", "dodi", f);
  const mA = mouth("kulkas", "ara", f);
  const walk = ramp(f, 0, 22);
  const araPos: Vec3 = [lerpN(-0.4, 0.55, walk), 0, lerpN(0.6, -0.4, walk)];
  const dodiPos: Vec3 = [-0.75, 0, 0.75];
  const cheeks = ramp(f, lucu - 6, 8);
  const close = ramp(f, dur - 32, 10);
  const araP = bean(ARA, {
    ...(f < 22 ? beanWalk(t * 2.2, 0.7) : idle(t, 4)),
    expr: speaking("kulkas", 0, f) ? "worried" : f >= lucu - 4 ? "happy" : f > insertF + 34 ? "shock" : "think",
    mouthOpen: mA,
    headTilt: nod("kulkas", "ara", f) + (f >= lucu - 4 ? Math.sin(t * 9) * 6 : 0),
    ...(f >= lucu - 6 ? { armL: [-lerpN(10, 150, cheeks), -lerpN(10, 100, cheeks)] as [number, number], armR: [lerpN(10, 150, cheeks), -lerpN(10, 100, cheeks)] as [number, number] } : {}),
    ...(speaking("kulkas", 0, f) ? { armR: [30 + Math.sin(f * 0.3) * 10, -60] as [number, number] } : {}),
    bob: f >= lucu - 4 ? Math.abs(Math.sin(t * 9)) * 7 : 2,
    sweat: f > insertF + 34 && f < lucu - 6,
  });
  const dodiP = bean(DODI, {
    ...idle(t, 1),
    ...gesture(f, mD, 2),
    expr: speaking("kulkas", 1, f) ? "smug" : f >= lucu ? "neutral" : "neutral",
    mouthOpen: mD,
    headTilt: nod("kulkas", "dodi", f) + (f >= lucu + 6 ? -8 : 0),
    armR: f > dur - 34 ? [lerpN(10, 95, close), -10] : (gesture(f, mD, 2).armR ?? [8, -10]),
    lean: f > dur - 34 ? close * 8 : 0,
    blink: f >= lucu + 4 && f < lucu + 30 ? true : idle(t, 1).blink,
  });
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#3a2a28" fog={["#3a2a28", 14, 40]}>
        <LabRoom t={t} fridgeOpen={openK} />
        <Lights key1="#ffd8a0" sky="#e8f0ff" ground="#6a4a3a" k={1.8} dir={[-3, 9, 7]} hemi={1.6} />
        <BeanCard position={dodiPos} height={2.05} params={dodiP} />
        <BeanCard position={araPos} height={1.92} params={araP} />
      </Stage>
      <Grade warm={0.15} cool={openK > 0.2 && f < L2.from ? 0.4 * openK : 0} />
      <Insert kind="handle" from={insertF} len={32} />
      <Emote x={700} y={560} from={tidur + 4} to={L1.to + 10} text="Zzz" color="#3a6aa8" />
      <Emote x={420} y={600} from={lucu} to={dur} text="♥" color="#d6336c" />
    </AbsoluteFill>
  );
};

const PaperTown: React.FC<{ t: number; hide: number }> = ({ t, hide }) => (
  <group>
    {[[-2.4, -1.5], [-0.8, -2.2], [0.9, -1.8], [2.5, -2.4], [-1.6, 0.2], [1.7, 0.0]].map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <InkBox pos={[0, 0.4, 0]} size={[1.0, 0.8, 0.9]} color="#1e5a8a" ink={0.03} emissive="#0a2a4a" />
        <P geo={() => <coneGeometry args={[0.8, 0.6, 4]} />} color="#2a7ab8" pos={[0, 1.1, 0]} rot={[0, Math.PI / 4, 0]} hull={0.05} />
        {hide > (i + 1) / 7 && <BatCard position={[0.2, 1.25, 0.35]} size={0.38} params={{ flap: 0, hang: false, expr: "sneaky", bomb: true, seed: 40 + i }} roll={Math.sin(t * 2 + i) * 0.05} />}
      </group>
    ))}
  </group>
);

export const SceneKlCara: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("cara");
  const L1 = lineAt("cara", 1), L2 = lineAt("cara", 2);
  const pes = EV["cara.pesawat"], hang = EV["cara.hangat"], atap = EV["cara.atap"];
  const gelap = EV["cara.gelap"], tinggi = EV["cara.tinggi"], persis = EV["cara.persis"];
  const cut = L1.from - 6;
  if (f < cut) {
    const cam = shotCam(f, [
      { to: hang, p0: [0, 4.2, 9], p1: [0, 3.2, 7.6], l0: [0, 3.2, 0], l1: [0, 2.2, 0], fov: 38 },
      { to: cut, p0: [0, 3.2, 7.6], p1: [0.6, 4.2, 9.4], l0: [0, 2.2, 0], l1: [0, 1.2, -0.6], fov: 38, fov1: 40 },
    ]);
    const fall = ramp(f, pes, Math.max(8, hang - pes));
    const canY = lerpN(9, 1.6, fall);
    const openK = ramp(f, hang, 10);
    const chute = f > pes + 6 && openK < 0.5;
    const scatter = cl((f - hang - 4) / 30);
    const hide = cl((f - atap + 20) / 26);
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="#06182c" fog={["#06182c", 14, 40]}>
          <BlueGrid size={60} y={0} />
          <hemisphereLight args={["#9fe6ff", "#0a2a4a", 1.8]} />
          <directionalLight position={[2, 8, 6]} intensity={1.4} color="#cfefff" />
          <PaperTown t={t} hide={hide} />
          <group position={[0, canY, -0.5]} rotation={[0, t * 0.6, Math.sin(t * 2) * 0.06]}>
            <BatCanister open={openK} scale={0.8} />
            {chute && (
              <group position={[0, 2.4, 0]}>
                <P geo={() => <sphereGeometry args={[1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />} color="#e8dcc0" pos={[0, 0, 0]} hull={0.04} />
                {[0, 1, 2, 3].map((i) => <InkBox key={i} pos={[Math.cos(i * 1.57) * 0.5, -0.6, Math.sin(i * 1.57) * 0.5]} size={[0.02, 1.2, 0.02]} color="#888" ink={0.005} />)}
              </group>
            )}
          </group>
          {scatter > 0 && <BatSwarm center={[0, 2.0 + scatter * 1.2, -0.5]} count={18} spread={[1 + scatter * 5, 0.6 + scatter * 1.6, 1 + scatter * 2.4]} t={t} size={0.4} drift={[0, 0.1, 0]} bomb seed={9} />}
        </Stage>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,10,30,0.6) 100%)" }} />
        <Chip from={4} to={hang + 30} top={170} color="#1e6aa8" size={50}>CARA KERJA · X-RAY</Chip>
        <Emote x={540} y={600} from={hang} to={hang + 26} text="BANGUN!" size={70} color="#ffd23f" />
      </AbsoluteFill>
    );
  }
  const g = f - cut;
  const cam = shotCam(g, [
    { to: persis - cut, p0: [0.7, 1.6, 4.6], p1: [0.9, 1.55, 3.9], l0: [0.35, 1.45, 0], fov: 32, fov1: 30 },
    { to: dur - cut, p0: [0.9, 1.55, 3.9], p1: [0.5, 1.7, 5.4], l0: [0.35, 1.45, 0], l1: [0.1, 1.45, 0], fov: 30, fov1: 34, ease: "out" },
  ]);
  const mD = mouth("cara", "dodi", f, [0]);
  const mA = mouth("cara", "ara", f);
  const thumb = ramp(f, persis - 4, 6);
  const tap = speaking("cara", 1, f) ? Math.abs(Math.sin(t * 7)) : 0;
  const dodiP = bean(DODI, {
    ...idle(t, 0),
    expr: f >= persis - 3 ? "happy" : "smug",
    mouthOpen: mD,
    headTilt: f >= persis - 3 ? 10 * pulse(f, persis, 14) : nod("cara", "ara", f) * 0.6,
    armR: f >= persis - 4 ? [lerpN(10, 120, thumb), lerpN(-10, -80, thumb)] : [8, -10],
    bob: f >= persis - 2 ? pulse(f, persis, 12) * 12 : 2,
    squash: -pulse(f, persis, 8) * 0.06,
  });
  const araP = bean(ARA, {
    ...idle(t, 3),
    expr: f >= persis ? "happy" : f >= tinggi - 3 ? "think" : "think",
    mouthOpen: mA,
    look: f >= tinggi - 2 && f < persis ? 1 : 0,
    headTilt: speaking("cara", 1, f) ? 10 + tap * 3 : 0,
    armR: speaking("cara", 1, f) ? [140, -150 + tap * 10] : [8, -10],
    lean: speaking("cara", 1, f) ? -3 : 0,
  });
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#3a2a28" fog={["#3a2a28", 14, 40]}>
        <LabRoom t={t} />
        <Lights key1="#ffd8a0" sky="#ffe8cc" ground="#6a4a3a" k={1.8} dir={[-3, 9, 7]} hemi={1.6} />
        <BeanCard position={[0.62, 0, -0.15]} height={1.92} params={araP} />
        <BeanCard position={[-0.5, 0, 0.8]} height={2.05} params={dodiP} />
      </Stage>
      <Grade warm={0.25} />
      <Emote x={760} y={560} from={gelap + 2} to={L1.to + 6} text="..." color="#5a1838" />
      <Stamp text="PERSIS!" from={persis - 2} to={dur + 6} color="#16803c" top={430} />
      {L2 && null}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6-8. PANGKALAN UDARA                                               */
/* ================================================================== */
const Cage: React.FC<{ pos: Vec3; open: number }> = ({ pos, open }) => (
  <group position={pos}>
    <InkBox pos={[0, 0.55, 0]} size={[1.2, 1.1, 0.9]} color="#b9824a" />
    <InkBox pos={[0, 1.14, 0]} size={[1.3, 0.08, 1.0]} color="#8a5a34" ink={0.03} />
    <group position={[-0.6, 0.55, 0.46]} rotation={[0, -open * 1.9, 0]}>
      {[0, 1, 2, 3, 4].map((i) => <InkBox key={i} pos={[0.12 + i * 0.24, 0, 0]} size={[0.05, 1.0, 0.05]} color="#5a4030" ink={0.015} />)}
      <InkBox pos={[0.6, 0.45, 0]} size={[1.2, 0.06, 0.06]} color="#5a4030" ink={0.015} />
      <InkBox pos={[0.6, -0.45, 0]} size={[1.2, 0.06, 0.06]} color="#5a4030" ink={0.015} />
    </group>
    <Sign pos={[0, 0.85, 0.47]} w={0.8} h={0.22} text="KELELAWAR" bg="#f4e8c8" fg="#2a1a10" />
  </group>
);
const BaseWorld: React.FC<{ t: number; burn?: number; soot?: number; dusk?: boolean }> = ({ t, burn = 0, soot = 0, dusk = false }) => (
  <group>
    <DesertWorld noon={!dusk} dusk={dusk} />
    <Runway pos={[-6, 0, -8]} len={60} rot={[0, 0.25, 0]} />
    <Hangar pos={[-6.5, 0, -11]} rot={[0, 0.5, 0]} burn={burn} t={t} />
    <FuelTank pos={[4.2, 0, -7.5]} burn={burn} t={t} bats={0} />
    <StaffCar pos={[4.4, 0, -3.4]} rot={[0, -0.9, 0]} burn={burn * 0.9} t={t} soot={soot} />
    {[[-9, -4], [9, -12], [-3, -16]].map(([x, z], i) => <Cactus key={i} pos={[x, 0, z]} s={1} />)}
    {/* pagar kawat */}
    {new Array(12).fill(0).map((_, i) => <InkBox key={i} pos={[-14 + i * 2.6, 0.6, -18]} size={[0.08, 1.2, 0.08]} color="#6a5a4a" ink={0.02} />)}
    <InkBox pos={[1, 1.0, -18]} size={[30, 0.03, 0.03]} color="#6a6a6a" ink={0.005} />
    <InkBox pos={[1, 0.6, -18]} size={[30, 0.03, 0.03]} color="#6a6a6a" ink={0.005} />
    <Sign pos={[-1.2, 1.4, -6]} w={2.6} h={0.6} text="CARLSBAD · 15 MEI 1943" bg="#f2e6c8" fg="#2a2a3a" />
    <InkBox pos={[-1.2, 0.55, -6]} size={[0.08, 1.1, 0.08]} color="#6a4a2e" ink={0.02} />
  </group>
);

export const SceneKlKandang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("kandang");
  const L0 = lineAt("kandang", 0), L1 = lineAt("kandang", 1), L2 = lineAt("kandang", 2);
  const hah = EV["kan.hah"], kasihan = EV["kan.kasihan"];
  const latchF = 4;
  const openK = ramp(f, latchF + 30, 10);
  const whip = hah - 8;
  const cam = shotCam(f, [
    { to: latchF + 30, p0: [0.4, 2.4, 8.5], p1: [0.3, 1.9, 6.0], l0: [0.3, 1.5, -2], l1: [0.25, 1.2, 0], fov: 40, fov1: 36 },
    { to: whip, p0: [0.3, 1.9, 6.0], p1: [0.1, 1.7, 4.8], l0: [0.25, 1.2, 0], l1: [0.15, 1.35, 0], fov: 36, fov1: 34 },
    { to: L2.from - 6, p0: [1.8, 1.7, 4.7], p1: [2.0, 1.65, 4.2], l0: [2.0, 1.4, 0.6], fov: 32, ease: "out" },
    { to: dur, p0: [0.0, 1.55, 3.8], p1: [-0.1, 1.5, 3.4], l0: [-0.15, 1.3, 0], fov: 32, fov1: 30 },
  ]);
  const mD = mouth("kandang", "dodi", f);
  const mA = mouth("kandang", "ara", f);
  const out = cl((f - latchF - 34) / 60);
  const jump = pulse(f, hah - 2, 12);
  const sheep = speaking("kandang", 2, f) || f > L2.from;
  const araP = bean(ARA, {
    ...idle(t, 3),
    expr: sheep ? "worried" : speaking("kandang", 0, f) ? "happy" : f > latchF + 34 ? "happy" : "neutral",
    mouthOpen: mA,
    headTilt: sheep ? -10 + Math.sin(t * 2) * 3 : nod("kandang", "ara", f) + (speaking("kandang", 0, f) ? 6 : 0),
    armR: f < latchF + 34 ? [100, -40] : sheep ? [30 + Math.sin(t * 10) * 6, -110] : [lerpN(100, 140, out), -20],
    armL: sheep ? [-30 - Math.sin(t * 10) * 6, -110] : [-10, -12],
    look: sheep ? -1 : 0,
    lean: sheep ? 4 : 0,
    sweat: f >= hah,
  });
  const dodiP = bean(DODI, {
    ...idle(t, 0),
    expr: f >= hah - 3 ? (f < hah + 30 ? "shock" : "angry") : "neutral",
    mouthOpen: mD,
    bob: jump * 30,
    squash: jump * -0.08,
    headTilt: nod("kandang", "dodi", f),
    armL: f >= hah - 2 ? [-150, -20] : [-8, -10],
    armR: f >= hah - 2 ? [150, -20] : [8, -10],
    sweat: f >= hah,
  });
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [hah], 0.06, 10)} bg="#8ab8e8" fog={["#f4e4c0", 30, 150]}>
        <BaseWorld t={t} />
        <Lights key1="#fff6dc" sky="#bcdcff" ground="#c8a070" k={2.6} dir={[3, 14, 6]} hemi={1.8} />
        <Cage pos={[0.55, 0, -0.6]} open={openK} />
        <BeanCard position={[-0.35, 0, 0.1]} height={1.92} params={araP} />
        <BeanCard position={[2.1, 0, 0.7]} height={2.05} params={dodiP} />
        {out > 0 && <BatSwarm center={[0.6 + out * 1.5, 1.0 + out * 2.6, -0.3 - out * 2]} count={14} spread={[0.6 + out * 3, 0.4 + out * 1.5, 0.6 + out]} t={t} size={0.34} drift={[0.3, 0.2, -0.4]} bomb seed={11} />}
      </Stage>
      <Grade heat={0.8} flash={f < 6 ? 1 - f / 6 : 0} />
      <Insert kind="latch" from={latchF} len={30} />
      <Chip from={2} to={L0.from + 20} top={170} color="#b45309" size={52}>CARLSBAD · 15 MEI 1943</Chip>
      <Emote x={760} y={640} from={hah - 2} to={hah + 26} text="HAH?!" size={90} color="#c0302a" />
      <Emote x={440} y={700} from={kasihan + 6} to={dur} text="hehe..." size={64} color="#5a1838" />
    </AbsoluteFill>
  );
};

export const SceneKlTangki: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("tangki");
  const L0 = lineAt("tangki", 0), L1 = lineAt("tangki", 1);
  const itu = EV["tan.itu"], jg = EV["tan.jangan"], fire = EV["tan.jangan2"] + 12;
  const cam = shotCam(f, [
    { to: itu + 10, p0: [-0.7, 1.6, 4.4], p1: [-0.6, 1.65, 4.0], l0: [-0.35, 1.45, -0.3], l1: [-0.1, 1.6, -1.0], fov: 36, fov1: 35 },
    { to: L1.from + 4, p0: [-0.3, 1.65, 4.0], p1: [-0.4, 2.2, 6.4], l0: [0.3, 1.6, -1.0], l1: [2.6, 3.0, -6.5], fov: 35, fov1: 38 },
    { to: fire, p0: [-0.4, 2.2, 6.4], p1: [0.6, 2.4, 3.0], l0: [2.6, 3.0, -6.5], l1: [3.6, 3.2, -7.5], fov: 38, fov1: 34 },
    { to: dur, p0: [0.0, 2.4, 6.5], p1: [-0.8, 2.8, 9.0], l0: [2.4, 2.6, -5.5], l1: [1.6, 2.8, -5], fov: 40, fov1: 46, ease: "out" },
  ]);
  const mD = mouth("tangki", "dodi", f);
  const mA = mouth("tangki", "ara", f);
  const burn = ramp(f, fire - 2, 16);
  const toTank = cl((f - 4) / (L1.from + 10));
  const run = ramp(f, jg, Math.max(10, fire - jg));
  const back = ramp(f, fire + 6, 30);
  const dodiPos: Vec3 = f < fire + 6 ? lerpV([0.9, 0, 0.6], [1.7, 0, -4.4], run) : lerpV([1.7, 0, -4.4], [0.3, 0, 1.2], back);
  const running = (f >= jg && f < fire) || (f > fire + 6 && back < 1);
  const araP = bean(ARA, {
    ...idle(t, 3),
    expr: f >= fire ? "shock" : speaking("tangki", 0, f) ? "think" : "worried",
    mouthOpen: mA || (f >= fire ? 0.9 : 0),
    armR: f < L1.from + 10 ? [lerpN(10, 150, ramp(f, itu - 8, 8)), -10] : f >= fire ? [160, -30] : [10, -10],
    armL: f >= fire ? [-160, -30] : [-10, -12],
    bob: f >= fire ? Math.abs(Math.sin(t * 10)) * 10 : 2,
    sweat: f >= jg,
    headTilt: nod("tangki", "ara", f),
  });
  const dodiP = bean(DODI, {
    ...(running ? beanWalk(t * 3.4, 1.25) : idle(t, 0)),
    expr: f >= fire ? "scared" : f >= jg ? "scared" : "worried",
    mouthOpen: mD || (f >= fire && f < fire + 40 ? 0.9 : 0),
    ...(f >= jg && f < fire ? { armL: [-160 + Math.sin(t * 16) * 15, -20] as [number, number], armR: [160 - Math.sin(t * 16) * 15, -20] as [number, number] } : {}),
    ...(f >= fire && back < 1 ? { armL: [-150, -30] as [number, number], armR: [150, -30] as [number, number] } : {}),
    sweat: f >= jg,
  });
  const jendP = bean(JENDERAL, {
    ...idle(t, 5),
    expr: f >= fire + 20 ? "angry" : f >= fire ? "shock" : "neutral",
    armL: f >= fire + 20 ? [-120 + Math.sin(t * 12) * 20, -40] : [-10, -10],
    armR: f >= fire + 20 ? [120 - Math.sin(t * 12) * 20, -40] : [10, -10],
    bob: f >= fire + 20 ? Math.abs(Math.sin(t * 12)) * 10 : 2,
    soot: burn * 0.6,
    headTilt: f >= fire + 20 ? Math.sin(t * 14) * 6 : 0,
  });
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [fire, fire + 15], 0.22, 16)} bg="#8ab8e8" fog={["#f4e4c0", 30, 150]}>
        <BaseWorld t={t} burn={burn} soot={burn} />
        <Lights key1="#fff6dc" sky="#bcdcff" ground="#c8a070" k={2.6} dir={[3, 14, 6]} hemi={1.8} />
        {/* kelelawar menuju & bergelantungan di bawah tangki */}
        <FuelTank pos={[4.2, 0, -7.5]} burn={burn} t={t} bats={toTank >= 1 ? 12 : 0} />
        {toTank < 1 && <BatSwarm center={lerpV([0.6, 2.5, -1], [4.2, 3.0, -6.5], toTank)} count={12} spread={[2.2 * (1 - toTank) + 0.6, 1.0, 1.0]} t={t} size={0.34} drift={[0, 0, 0]} bomb seed={13} />}
        {burn > 0 && <SmokeColumn position={[4.2, 5.5, -7.5]} t={t} h={16} scale={0.6 + burn * 0.5} />}
        {burn > 0 && <SmokeColumn position={[-6.5, 3.5, -11]} t={t + 3} h={14} scale={0.5 + burn * 0.4} />}
        <BeanCard position={[-0.45, 0, 0.3]} height={1.92} params={araP} />
        <BeanCard position={dodiPos} height={2.05} params={dodiP} flip={f > fire + 6} />
        <BeanCard position={[2.9, 0, -2.2]} height={2.1} params={jendP} />
      </Stage>
      <Grade heat={0.6} warm={burn * 0.6} flash={pulse(f, fire, 8) * 0.9} />
      <Emote x={760} y={500} from={jg} to={fire} text="JANGAN!!" size={78} color="#c0302a" />
      <Stamp text="KEBAKARAN!" from={fire + 8} to={dur + 6} color="#dc2626" top={300} rot={5} />
    </AbsoluteFill>
  );
};

export const SceneKlAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("akhir");
  const L2 = lineAt("akhir", 2), L3 = lineAt("akhir", 3);
  const send = EV["akh.sendiri"], atom = EV["akh.atom"], menang = EV["akh.menang"], kel = EV["akh.kelelawarnya"];
  const cam = shotCam(f, [
    { to: L2.from - 6, p0: [0.4, 2.6, 9.5], p1: [0.2, 1.8, 6.2], l0: [0, 2.2, -4], l1: [0.05, 1.4, 0], fov: 40, fov1: 36 },
    { to: kel - 4, p0: [0.2, 1.8, 6.2], p1: [0.0, 1.7, 5.0], l0: [0.05, 1.4, 0], fov: 36, fov1: 34 },
    { to: dur, p0: [-0.3, 1.95, 4.2], p1: [-0.45, 2.0, 3.4], l0: [-0.5, 1.7, 0.6], fov: 30, fov1: 28, roll0: 0, roll1: -4, ease: "out" },
  ]);
  const mD = mouth("akhir", "dodi", f, [0, 1]);
  const mA = mouth("akhir", "ara", f);
  const cough = (k: number) => (f < L2.from - 10 ? pulse(f % 50, 10 + k * 20, 14) : 0);
  const sigh = ramp(f, L3.from - 4, 12);
  const land = ramp(f, kel - 10, 14);
  const dodiPos: Vec3 = [-0.5, 0, 0.6];
  const dodiP = bean(DODI, {
    ...idle(t, 0),
    expr: f >= kel ? "sad" : f >= L3.from - 6 ? "sad" : f >= L2.from ? "neutral" : "worried",
    mouthOpen: mD,
    soot: 0.85,
    bob: cough(0) * 10 - sigh * 6,
    armR: f < L2.from - 10 ? [70 + Math.sin(t * 8) * 30, -60] : [8, -10],
    armL: [-8 - sigh * 6, -10],
    headTilt: -sigh * 8 + (f >= kel ? -4 : 0),
    lean: sigh * 4,
  });
  const araP = bean(ARA, {
    ...idle(t, 3),
    expr: f >= kel + 6 ? "shock" : speaking("akhir", 2, f) ? "happy" : f >= L2.from ? "happy" : "worried",
    mouthOpen: mA,
    soot: 0.75,
    bob: cough(1) * 10 + (speaking("akhir", 2, f) ? Math.abs(Math.sin(t * 6)) * 5 : 0),
    armL: speaking("akhir", 2, f) ? [-140, -90] : [-8, -10],
    armR: f < L2.from - 10 ? [-30 + Math.sin(t * 9) * 25, -100] : [8, -10],
    headTilt: speaking("akhir", 2, f) ? 12 : 0,
    look: f >= L2.from - 4 && f < kel ? -1 : 0,
  });
  // kelelawar mendarat di kepala Dodi pada kata terakhir
  const headTop: Vec3 = [dodiPos[0] + 0.02, 2.02, dodiPos[2] + 0.06];
  const batPos = lerpV([1.8, 3.6, -1.5], headTop, land);
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [kel], 0.04)} bg="#3a2a3a" fog={["#7a5a5a", 18, 90]}>
        <BaseWorld t={t} burn={0.45} soot={1} dusk />
        <Lights key1="#ff9a6a" sky="#c08a8a" ground="#4a3030" k={1.9} dir={[8, 6, 4]} hemi={1.5} />
        <SmokeColumn position={[4.2, 4.5, -7.5]} t={t} h={18} scale={1.0} />
        <SmokeColumn position={[-6.5, 3.0, -11]} t={t + 4} h={16} scale={0.9} />
        <BeanCard position={[0.6, 0, -0.1]} height={1.92} params={araP} />
        <BeanCard position={dodiPos} height={2.05} params={dodiP} />
        {land > 0 && <BatCard position={batPos} size={0.62} params={{ flap: land < 1 ? 0.5 + 0.5 * Math.sin(t * 14) : 0.15, expr: f >= kel + 4 ? "sneaky" : "happy", seed: 5 }} />}
      </Stage>
      <Grade warm={0.45} flash={pulse(f, kel, 5) * 0.25} />
      <Chip from={send + 4} to={atom - 6} top={190} color="#b45309" size={54}>BERHASIL... MEMBAKAR PANGKALAN SENDIRI</Chip>
      <Stamp text="DIBATALKAN · 1944" from={atom - 2} to={menang - 10} color="#7a1f1f" top={360} rot={-5} />
      <Emote x={720} y={600} from={menang + 2} to={L3.from} text="?" color="#5a1838" />
    </AbsoluteFill>
  );
};

export const KL_SCENES: Record<KlScene, React.FC> = {
  hook: SceneKlHook,
  gua: SceneKlGua,
  lab: SceneKlLab,
  kulkas: SceneKlKulkas,
  cara: SceneKlCara,
  kandang: SceneKlKandang,
  tangki: SceneKlTangki,
  akhir: SceneKlAkhir,
};
export type { BatParams };

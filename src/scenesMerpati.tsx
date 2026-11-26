import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./merpati_timing.json";
import { Vec3 } from "./three/objects";
import { P } from "./three/objectsRig";
import { BeanCard, BeanParams, beanHandWorld, beanWalk } from "./three/objectsBean";
import { InkBox, SkyDome } from "./three/objectsMolase";
import { Sign, WallMap, CrateStack, BarrelStack } from "./three/objectsMolaseProps";
import { HangingLamp } from "./three/objectsAbuProps";
import { BlueGrid } from "./three/toon";
import {
  CanteenTruck,
  ControlDesk,
  CornBag3D,
  CornScatter3D,
  GrainSilo,
  GrassField,
  ParkBench,
  PelicanNoseCone,
  PelicanRig,
  PigeonCard,
  PigeonFlock,
  PigeonParams,
  RadarSet1944,
  ShipTargetBoard,
  SkinnerBox,
  TrainCoach,
} from "./three/objectsMerpati";
import { ARA_M, DODI_M, JENDERAL_M, SKINNER } from "./SheetMerpati";

export type MpScene = "hook" | "kereta" | "lab" | "voting" | "uji" | "tumpah" | "serbu" | "akhir";
export const MP_ORDER = timing.order as MpScene[];
export const TOTAL_FRAMES_MERPATI = timing.totalFrames;
const DUR = (k: MpScene): number => (timing.scenes as Record<string, { durationInFrames: number }>)[k].durationInFrames;

type Word = { w: string; from: number; to: number };
type Line = { voice: string; style: string; text: string; from: number; to: number; words: Word[] };
const LINES = timing.lines as unknown as Record<MpScene, Line[]>;
const EV = timing.events as Record<string, number>;

const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const easeOutBack = (x: number) => 1 + 2.3 * Math.pow(x - 1, 3) + 1.3 * Math.pow(x - 1, 2);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
const ramp = (f: number, a: number, len: number) => smoother(cl((f - a) / Math.max(1, len)));
const pulse = (f: number, at: number, len = 10) => {
  const d = f - at;
  return d < 0 || d > len ? 0 : Math.sin((d / len) * Math.PI);
};

/* ---------------------------------------------------- jadwal kata/baris */
const lineAt = (s: MpScene, i: number) => LINES[s][i];
const mouth = (s: MpScene, voice: string, f: number, skip: number[] = []): number => {
  const lines = LINES[s];
  for (let i = 0; i < lines.length; i++) {
    if (skip.includes(i) || lines[i].voice !== voice) continue;
    for (const w of lines[i].words) {
      if (f >= w.from - 1 && f <= w.to + 1) return 0.32 + 0.68 * Math.abs(Math.sin((f - w.from) * 0.92 + w.from));
    }
  }
  return 0;
};
const speaking = (s: MpScene, i: number, f: number) => f >= LINES[s][i].from - 2 && f <= LINES[s][i].to + 2;
const nod = (s: MpScene, voice: string, f: number) => {
  let v = 0;
  for (const ln of LINES[s]) {
    if (ln.voice !== voice) continue;
    for (const w of ln.words) if (w.w.length > 5) v += pulse(f, w.from - 1, 8) * 5;
  }
  return v;
};

/* ================================================================== */
/* KOREOGRAFI KAMERA DINAMIS ALA @RicksClips3000 (`riksCam`)          */
/* 6 Jurus: crane | push | ots | snap | whip (9f + roll) | vertigo    */
/* ================================================================== */
type CamMode = "crane" | "push" | "ots" | "snap" | "whip" | "vertigo";
type RiksShot = {
  to: number;
  mode?: CamMode;
  p0: Vec3;
  p1?: Vec3;
  l0: Vec3;
  l1?: Vec3;
  fov?: number;
  fov1?: number;
  roll0?: number;
  roll1?: number;
  whipDir?: 1 | -1;
};
type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };

const evalRawShot = (s: RiksShot, local: number, len: number): Cam => {
  const mode = s.mode ?? "push";
  const x = cl(local / Math.max(1, len));
  const f0 = s.fov ?? 38;
  const f1 = s.fov1 ?? f0;

  if (mode === "vertigo") {
    // Hitchcock / @RicksClips3000 Dolly-Zoom: kamera mundur sepanjang garis pandang
    // sebanding tan(fov0/2)/tan(fov(k)/2) agar wajah tokoh tetap sebesar layar sambil latar melengkung!
    const k = smoother(x);
    const fov = lerpN(f0, f1, k);
    const look = lerpV(s.l0, s.l1 ?? s.l0, k);
    const dx = s.p0[0] - s.l0[0];
    const dy = s.p0[1] - s.l0[1];
    const dz = s.p0[2] - s.l0[2];
    const d0 = Math.max(0.2, Math.hypot(dx, dy, dz));
    const scale = Math.tan((f0 * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
    const d = d0 * scale;
    const pos: Vec3 = [look[0] + (dx / d0) * d, look[1] + (dy / d0) * d, look[2] + (dz / d0) * d];
    return { pos, look, fov, roll: lerpN(s.roll0 ?? 0, s.roll1 ?? -5.5, k) };
  }

  if (mode === "snap") {
    // ECU Snap-Zoom cepat (8 frame easeOutBack) lalu hidup dengan micro-push
    const snapK = cl(local / 8);
    const k = snapK < 1 ? cl(easeOutBack(snapK), 0, 1.06) : 1;
    const creep = 1 - 0.0011 * Math.max(0, local - 8);
    const look = lerpV(s.l0, s.l1 ?? s.l0, smoother(x));
    const baseP = lerpV(s.p0, s.p1 ?? s.p0, k);
    const pos: Vec3 = [
      look[0] + (baseP[0] - look[0]) * creep,
      look[1] + (baseP[1] - look[1]) * creep,
      look[2] + (baseP[2] - look[2]) * creep,
    ];
    return { pos, look, fov: lerpN(f0, f1, Math.min(1, k)), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, smoother(x)) };
  }

  const k = mode === "crane" ? 1 - Math.pow(1 - x, 2.4) : smoother(x);
  const look = lerpV(s.l0, s.l1 ?? s.l0, k);
  const p = lerpV(s.p0, s.p1 ?? s.p0, k);
  const push = 1 - 0.0009 * Math.min(local, 360);
  const pos: Vec3 = [look[0] + (p[0] - look[0]) * push, look[1] + (p[1] - look[1]) * push, look[2] + (p[2] - look[2]) * push];
  return { pos, look, fov: lerpN(f0, f1, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
};

const riksCam = (frame: number, shots: RiksShot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, s.to - start);
      const local = Math.max(0, frame - start);
      const cur = evalRawShot(s, local, len);

      // Whip-Pan 9 frame (0.30 dtk) dari posisi akhir shot sebelumnya + ayunan roll ±3.8°!
      let out = cur;
      if (s.mode === "whip" && i > 0 && local < 9) {
        const prev = shots[i - 1];
        const prevStart = i >= 2 ? shots[i - 2].to : 0;
        const prevEnd = evalRawShot(prev, Math.max(1, prev.to - prevStart), Math.max(1, prev.to - prevStart));
        const w = smoother(cl(local / 9));
        const dir = s.whipDir ?? (cur.pos[0] >= prevEnd.pos[0] ? 1 : -1);
        const whipRoll = Math.sin(w * Math.PI) * 3.8 * dir;
        out = {
          pos: lerpV(prevEnd.pos, cur.pos, w),
          look: lerpV(prevEnd.look, cur.look, w),
          fov: lerpN(prevEnd.fov, cur.fov, w),
          roll: lerpN(prevEnd.roll, cur.roll, w) + whipRoll,
        };
      }

      // Handheld micro-breathing halus agar 0% frame statis mati
      const brX = Math.sin(frame * 0.075) * 0.018;
      const brY = Math.cos(frame * 0.062) * 0.014;
      const brR = Math.sin(frame * 0.05) * 0.28;
      return {
        pos: [out.pos[0] + brX, out.pos[1] + brY, out.pos[2]],
        look: [out.look[0] + brX * 0.4, out.look[1] + brY * 0.4, out.look[2]],
        fov: out.fov,
        roll: out.roll + brR,
      };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 38, roll: 0 };
};

const kick = (f: number, hits: number[], amp = 0.11, len = 10): Vec3 => {
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

const Stage: React.FC<{ cam: Cam; shake?: Vec3; bg?: string; fog?: [string, number, number]; children: React.ReactNode }> = ({
  cam,
  shake,
  bg = "#261828",
  fog,
  children,
}) => {
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
  key1 = "#ffdcae",
  sky = "#a8c4f0",
  ground = "#7a5a50",
  dir = [-8, 12, 10],
  k = 2.1,
  hemi = 1.7,
}) => (
  <>
    <hemisphereLight args={[sky, ground, hemi]} />
    <directionalLight position={[0, 6, 14]} intensity={0.8} color="#fff2de" />
    <directionalLight position={dir} intensity={k} color={key1} castShadow shadow-mapSize={[1024, 1024]} />
  </>
);

const Grade: React.FC<{ warm?: number; cool?: number; flash?: number; speedLines?: number }> = ({
  warm = 0,
  cool = 0,
  flash = 0,
  speedLines = 0,
}) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: warm > 0 ? `rgba(255,140,60,${0.32 * warm})` : `rgba(60,95,215,${0.30 * cool})`,
        }}
      />
    )}
    {speedLines > 0 && (
      <AbsoluteFill style={{ opacity: speedLines, pointerEvents: "none" }}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          {new Array(16).fill(0).map((_, i) => {
            const ang = (i / 16) * Math.PI * 2 + 0.15;
            return (
              <line
                key={i}
                x1={540 + Math.cos(ang) * 430}
                y1={840 + Math.sin(ang) * 520}
                x2={540 + Math.cos(ang) * 1150}
                y2={840 + Math.sin(ang) * 1250}
                stroke="rgba(255,248,220,0.42)"
                strokeWidth={i % 2 ? 10 : 18}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </AbsoluteFill>
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 56%, rgba(28,10,24,0.48) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(20,8,20,0) 70%, rgba(20,8,20,0.45) 88%, rgba(20,8,20,0.66) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: "#fff8e0", opacity: flash }} />}
  </>
);

/* ---------------------------------------------------- overlay komik 2D */
const Chip: React.FC<{ from: number; to: number; top: number; children: React.ReactNode; color?: string; size?: number }> = ({
  from,
  to,
  top,
  children,
  color = "#991b1b",
  size = 58,
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 200 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 54, right: 54, top, textAlign: "center", transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) * o }}>
      <div
        style={{
          display: "inline-block",
          background: "rgba(255,250,235,0.97)",
          border: `7px solid ${color}`,
          borderRadius: 26,
          padding: "13px 30px",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: size,
          color: "#1a121c",
          boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
          lineHeight: 1.06,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Stamp: React.FC<{ text: string; from: number; to: number; color?: string; top?: number; rot?: number }> = ({
  text,
  from,
  to,
  color = "#dc2626",
  top = 450,
  rot = -6,
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 9, stiffness: 260 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 50, right: 50, textAlign: "center", transform: `rotate(${rot}deg) scale(${1.6 - 0.6 * s})`, opacity: Math.min(1, s * 2) * o }}>
      <div
        style={{
          display: "inline-block",
          border: `10px solid ${color}`,
          borderRadius: 20,
          padding: "12px 32px",
          background: "rgba(255,248,235,0.95)",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 72,
          color,
          letterSpacing: 3,
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Emote: React.FC<{ x: number; y: number; from: number; to: number; text: string; size?: number; color?: string }> = ({
  x,
  y,
  from,
  to,
  text,
  size = 84,
  color = "#241726",
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 8, stiffness: 240 } });
  const o = interpolate(f, [to - 6, to], [1, 0], clamp);
  const wob = Math.sin((f - from) * 0.4) * 6;
  return (
    <div style={{ position: "absolute", left: x - 120, top: y - 60, width: 240, textAlign: "center", transform: `scale(${s}) rotate(${wob}deg)`, opacity: o }}>
      <span
        style={{
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: size,
          color,
          WebkitTextStroke: "5px #fff",
          paintOrder: "stroke fill",
          textShadow: "0 6px 0 rgba(0,0,0,0.25)",
        }}
      >
        {text}
      </span>
    </div>
  );
};

/* ================================================================== */
/* INSERT CLOSE-UP TANGAN SVG (CLAUDE.md §3 — wajib untuk aksi kecil) */
/* ================================================================== */
const HandSvg: React.FC<{ x: number; y: number; rot?: number; s?: number; grip?: number; flip?: boolean; sleeve?: string; skin?: string }> = ({
  x,
  y,
  rot = 0,
  s = 1,
  grip = 0,
  flip = false,
  sleeve = "#7d7451",
  skin = "#f0d2ad",
}) => {
  const ink = "#241726";
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

type InsertKind = "feed" | "rip";
const Insert: React.FC<{ kind: InsertKind; from: number; len?: number }> = ({ kind, from, len = 36 }) => {
  const f = useCurrentFrame();
  const d = f - from;
  if (d < 0 || d > len) return null;
  const k = d / len;
  const op = Math.min(smoother(cl(d / 5)), smoother(cl((len - d) / 5)));
  const a = smoother(cl((d - 5) / (len - 12)));
  const bg = kind === "feed" ? "#dceefb" : "#f5cf88";
  const peckWave = Math.abs(Math.sin(d * 0.65));

  return (
    <AbsoluteFill style={{ opacity: op }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs>
          <radialGradient id={`ig-${kind}`} cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#fff9ef" />
            <stop offset="100%" stopColor={bg} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1080" height="1920" fill={`url(#ig-${kind})`} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line
            key={i}
            x1={540}
            y1={900}
            x2={540 + Math.cos(i * 0.8 + k) * 950}
            y2={900 + Math.sin(i * 0.8 + k) * 950}
            stroke="rgba(36,23,38,0.065)"
            strokeWidth="42"
          />
        ))}

        {kind === "feed" && (
          <g>
            {/* Layar kaca proyeksi kapal & lampu hijau HADIAH */}
            <rect x="640" y="520" width="320" height="440" rx="22" fill="#bae6fd" stroke="#241726" strokeWidth="16" />
            <path d="M 700 760 L 735 725 L 865 725 L 900 760 Z" fill="#1e293b" stroke="#241726" strokeWidth="8" />
            <rect x="765" y="688" width="44" height="40" fill="#334155" stroke="#241726" strokeWidth="7" />
            <circle cx="800" cy="435" r="42" fill={a > 0.35 ? "#4ade80" : "#94a3b8"} stroke="#241726" strokeWidth="12" />
            <text x="800" y="365" textAnchor="middle" fontFamily="Anton, Impact" fontSize="48" fill="#166534">
              UPAH: 1 JAGUNG!
            </text>

            {/* Merpati berompi mematuk target kapal TOK! TOK! */}
            <g transform={`translate(${430 + peckWave * 165} 820) rotate(${peckWave * 14})`}>
              <ellipse cx="-60" cy="40" rx="135" ry="95" fill="#7c8ea6" stroke="#241726" strokeWidth="15" />
              <rect x="-110" y="-12" width="105" height="105" rx="18" fill="#c29b61" stroke="#241726" strokeWidth="11" />
              <circle cx="45" cy="-55" r="70" fill="#64748b" stroke="#241726" strokeWidth="15" />
              <circle cx="62" cy="-68" r="22" fill="#fef3c7" stroke="#241726" strokeWidth="8" />
              <circle cx="67" cy="-68" r="10" fill="#241726" />
              <polygon points="108,-68 175,-50 108,-34" fill="#f59e0b" stroke="#241726" strokeWidth="11" />
            </g>
            {peckWave > 0.55 && (
              <g transform="translate(690 750)">
                <text x="-40" y="-65" fontFamily="Anton, Impact" fontSize="64" fill="#dc2626" stroke="#fff" strokeWidth="6" paintOrder="stroke">
                  TOK!
                </text>
              </g>
            )}

            {/* Mangkuk corong & tangan Dodi menjatuhkan biji jagung emas */}
            <rect x="260" y="1160" width="280" height="120" rx="22" fill="#eab308" stroke="#241726" strokeWidth="14" />
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={380 + (i - 1) * 34}
                cy={lerpN(620, 1140, cl(a * 1.25 - i * 0.14))}
                r="24"
                fill="#fde047"
                stroke="#241726"
                strokeWidth="9"
              />
            ))}
            <HandSvg x={lerpN(150, 250, a)} y={lerpN(510, 560, a)} rot={28} s={1.45} grip={1 - a * 0.65} sleeve="#7d7451" skin="#f0d2ad" />
          </g>
        )}

        {kind === "rip" && (
          <g>
            {/* Kantong kertas JAGUNG ditarik 2 arah sampai robek KRETEK! */}
            <g transform={`translate(${540 - a * 55} 820) rotate(${-a * 14})`}>
              <path d="M -190 -240 L 30 -240 L 10 -60 L 45 60 L -5 210 L -190 210 Z" fill="#e6c387" stroke="#241726" strokeWidth="16" strokeLinejoin="round" />
              <rect x="-145" y="-80" width="135" height="90" fill="#b91c1c" stroke="#241726" strokeWidth="9" />
              <text x="-76" y="-20" textAnchor="middle" fontFamily="Anton, Impact" fontSize="42" fill="#fef08a">
                JAGUNG
              </text>
            </g>
            <g transform={`translate(${540 + a * 68} 825) rotate(${a * 16})`}>
              <path d="M 15 -240 L 195 -240 L 195 210 L 0 210 L 42 58 L 8 -62 Z" fill="#dfba7b" stroke="#241726" strokeWidth="16" strokeLinejoin="round" />
            </g>

            {/* Biji-biji jagung kuning berhamburan keluar dari robekan! */}
            {a > 0.25 &&
              new Array(14).fill(0).map((_, i) => {
                const sp = cl((a - 0.25) / 0.75);
                const gx = 540 + ((i % 5) - 2) * 68 * sp + Math.sin(i * 2.1) * 35;
                const gy = 860 + sp * (240 + (i % 4) * 145);
                return <circle key={i} cx={gx} cy={gy} r="24" fill={i % 2 ? "#facc15" : "#fde047"} stroke="#241726" strokeWidth="9" />;
              })}

            {a > 0.3 && (
              <text x="540" y="470" textAnchor="middle" fontFamily="Anton, Impact" fontSize="86" fill="#dc2626" stroke="#fff" strokeWidth="10" paintOrder="stroke">
                KRETEK!! ROBEK!
              </text>
            )}

            {/* Tangan Dodi (kiri) & Tangan Ara (kanan) menarik kantong */}
            <HandSvg x={lerpN(220, 130, a)} y={840} rot={-8} s={1.55} grip={0.85} sleeve="#7d7451" skin="#f0d2ad" />
            <HandSvg x={lerpN(860, 955, a)} y={850} rot={188} s={1.5} grip={0.85} flip sleeve="#857b56" skin="#f6dcc0" />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

/* Panel Hologram Voting 3 Merpati di atas panggung X-Ray */
const VoteBoard2D: React.FC<{ from: number; to: number; sleepFrom: number; winFrom: number }> = ({ from, to, sleepFrom, winFrom }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 13, stiffness: 190 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  const sleepy = f >= sleepFrom;
  const won = f >= winFrom;
  const cards = [
    { name: "PILOT #1", vote: "← KIRI", ok: true },
    { name: "PILOT #2", vote: "← KIRI", ok: true },
    { name: "PILOT #3", vote: sleepy ? "KANAN → (MELENG)" : "← KIRI", ok: !sleepy },
  ];
  return (
    <div style={{ position: "absolute", left: 44, right: 44, top: 150, transform: `scaleY(${s})`, opacity: o, transformOrigin: "50% 0%" }}>
      <div style={{ background: "rgba(6,28,56,0.90)", border: "7px solid #5fd4ff", borderRadius: 26, padding: "18px 24px", boxShadow: "0 16px 36px rgba(0,0,0,0.45)" }}>
        <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 44, color: "#9fe6ff", textAlign: "center", letterSpacing: 2 }}>
          DEMOKRASI MONCONG PELICAN · SUARA MAYORITAS
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
          {cards.map((c, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                background: c.ok ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.24)",
                border: `4px solid ${c.ok ? "#4ade80" : "#f87171"}`,
                borderRadius: 18,
                padding: "10px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 30, color: "#e2f4ff" }}>{c.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 25, color: c.ok ? "#86efac" : "#fca5a5", marginTop: 4 }}>{c.vote}</div>
            </div>
          ))}
        </div>
        {won && (
          <div style={{ marginTop: 12, textAlign: "center", fontFamily: "Anton, Impact, sans-serif", fontSize: 42, color: "#ffd23f" }}>
            KEPUTUSAN SIRIP: BELOK KIRI (MENANG 2 LAWAN 1!)
          </div>
        )}
      </div>
    </div>
  );
};

/* Judul besar pembuka per-huruf memantul (gaya Bom Kelelawar) */
const BigTitle: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  const word = "RUDAL\nMERPATI";
  return (
    <div style={{ position: "absolute", top: 100, left: 0, right: 0, textAlign: "center", opacity: o }}>
      <div style={{ lineHeight: 0.96 }}>
        {word.split("").map((ch, i) => {
          if (ch === "\n") return <br key={i} />;
          const s = spring({ frame: f - from - i * 1.4, fps: 30, config: { damping: 8, stiffness: 260 } });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: "Anton, Impact, sans-serif",
                fontSize: 102,
                color: i < 5 ? "#ffd23f" : "#ffffff",
                WebkitTextStroke: "9px #241726",
                paintOrder: "stroke fill",
                textShadow: "0 12px 0 rgba(36,23,38,0.6)",
                transform: `translateY(${(1 - s) * -150}px) rotate(${(1 - s) * (i % 2 ? 18 : -18)}deg)`,
                opacity: Math.min(1, s * 2),
                whiteSpace: "pre",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 8,
          display: "inline-block",
          background: "#991b1b",
          color: "#fff",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 60,
          padding: "6px 34px",
          borderRadius: 18,
          border: "6px solid #241726",
          transform: `scale(${spring({ frame: f - from - 15, fps: 30, config: { damping: 10 } })})`,
        }}
      >
        1944 · KISAH NYATA
      </div>
    </div>
  );
};

/* Caption global 1–2 kata berwarna per pembicara (sama persis dengan Bom Kelelawar) */
export const MerpatiCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captions = timing.captions as { text: string; startFrame: number; endFrame: number; highlight: boolean; voice: string }[];
  const cue = captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
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

export const DissolveMp: React.FC<{ first?: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, 7], [0, 1], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/* ---------------------------------------------------- pose tokoh */
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({
  bob: Math.abs(Math.sin(t * 1.8 + k)) * 3,
  armL: [-8 + Math.sin(t * 1.3 + k) * 4, -10],
  armR: [8 - Math.sin(t * 1.3 + k) * 4, -10],
  blink: (t + k * 0.7) % 3.1 < 0.11,
});
const gesture = (f: number, m: number, k = 0): Partial<BeanParams> =>
  m > 0 ? { armR: [42 + Math.sin(f * 0.26 + k) * 24, -42 + Math.sin(f * 0.37 + k) * 20], armL: [-14 - Math.sin(f * 0.2 + k) * 10, -18] } : {};

/* ================================================================== */
/* 3 DUNIA 3D 360°-AMAN (agar Whip-Pan & Orbit tidak pernah kosong)   */
/* ================================================================== */
const LowHill: React.FC<{ pos: Vec3; w: number; h: number; color?: string }> = ({ pos, w, h, color = "#6d8450" }) => (
  <P geo={() => <coneGeometry args={[w * 0.65, h, 7]} />} color={color} pos={[pos[0], h * 0.45, pos[2]]} hull={0.03} />
);
const TreeSimple: React.FC<{ pos: Vec3; s?: number }> = ({ pos, s = 1 }) => (
  <group position={pos} scale={s}>
    <InkBox pos={[0, 0.55, 0]} size={[0.26, 1.1, 0.26]} color="#6b4423" ink={0.03} />
    <P geo={() => <sphereGeometry args={[0.85, 12, 10]} />} color="#4d7c3f" pos={[0, 1.55, 0]} hull={0.05} />
  </group>
);

const MinnesotaWorld: React.FC = () => (
  <group>
    <SkyDome top="#3b336a" horizon="#ff9e64" r={200} />
    <GrassField size={260} color="#7d9054" />
    <LowHill pos={[-28, 0, -55]} w={28} h={10} color="#5f6f46" />
    <LowHill pos={[24, 0, -62]} w={34} h={12} color="#586842" />
    <LowHill pos={[52, 0, -38]} w={22} h={8} color="#63744a" />
    <LowHill pos={[-48, 0, -35]} w={24} h={9} color="#63744a" />
    <GrainSilo pos={[5.6, 0, -11.5]} scale={1.15} />
    <ParkBench pos={[2.5, 0, 1.8]} rot={[0, -0.35, 0]} />
    {[[-7.5, -8], [-11, -15], [10.5, -9], [13, -18], [-4, -18]].map(([x, z], i) => (
      <TreeSimple key={i} pos={[x, 0, z]} s={0.9 + (i % 3) * 0.22} />
    ))}
  </group>
);

const plankTex = (() => {
  let c: THREE.CanvasTexture | null = null;
  return () => {
    if (c) return c;
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 512;
    const g = cv.getContext("2d")!;
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ["#a87b4f", "#9b6f45", "#b28455", "#94673f"][i % 4];
      g.fillRect(0, i * 64, 512, 64);
      g.fillStyle = "rgba(40,20,10,0.52)";
      g.fillRect(0, i * 64 + 60, 512, 4);
    }
    c = new THREE.CanvasTexture(cv);
    c.colorSpace = THREE.SRGBColorSpace;
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(3, 2);
    return c;
  };
})();

const FlourMillLab: React.FC<{ pecked?: number; noseOpen?: number; peckPhase?: number; countText?: string }> = ({
  pecked = 0,
  noseOpen = 0.85,
  peckPhase = 0,
  countText = "10.000 PATUKAN!",
}) => {
  const wall = plankTex();
  return (
    <group>
      {/* Lantai kayu loteng pabrik tepung & 3 dinding penuh (360°-aman untuk whip-pan!) */}
      <InkBox pos={[0, -0.05, -0.8]} size={[16, 0.1, 13]} color="#7c6855" />
      <mesh position={[0, 3.1, -4.4]} receiveShadow>
        <planeGeometry args={[16, 6.6]} />
        <meshStandardMaterial map={wall} roughness={1} />
      </mesh>
      <mesh position={[-5.8, 3.1, -0.8]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 6.6]} />
        <meshStandardMaterial map={wall} roughness={1} color="#dccbb8" />
      </mesh>
      <mesh position={[5.8, 3.1, -0.8]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 6.6]} />
        <meshStandardMaterial map={wall} roughness={1} color="#dccbb8" />
      </mesh>
      <InkBox pos={[0, 0.24, -4.35]} size={[16, 0.48, 0.1]} color="#5a3a24" />
      {/* Balok atap loteng */}
      {[-3.2, 0, 3.2].map((x) => (
        <InkBox key={x} pos={[x, 5.6, -1.2]} size={[0.28, 0.32, 9.5]} color="#5a3a24" ink={0.02} />
      ))}

      {/* Poster, Peta & Lampu Gantung */}
      <WallMap pos={[-2.1, 2.75, -4.3]} />
      <Sign pos={[0.4, 3.25, -4.3]} w={2.45} h={0.72} text="PROJECT PIGEON · $25,000" bg="#f6ecd0" fg="#991b1b" />
      <Sign pos={[0.4, 2.42, -4.3]} w={2.15} h={0.52} text="LOTENG GENERAL MILLS" bg="#262936" fg="#ffd23f" />
      <Sign pos={[3.5, 2.75, -4.3]} w={1.55} h={0.95} text="RAHASIA NDRC" bg="#fde68a" fg="#1f2937" />
      <HangingLamp pos={[-1.1, 5.3, -1.3]} lit len={1.5} />
      <HangingLamp pos={[1.9, 5.3, -1.8]} lit len={1.4} />

      {/* Peralatan Lab: Kotak Latih Skinner, Meja Penghitung 10.000x, Moncong Pelican 3-Layar */}
      <SkinnerBox pos={[-1.95, 0, -2.55]} rot={[0, 0.22, 0]} pecked={pecked} />
      <ControlDesk pos={[0.55, 0, -2.85]} countText={countText} />
      <PelicanNoseCone pos={[2.85, 0, -2.45]} rot={[0, -0.32, 0]} open={noseOpen} peckPhase={peckPhase} />
      <CrateStack pos={[-4.5, 0, -3.4]} />
      <BarrelStack pos={[4.5, 0, -3.5]} />
      {/* Karung tepung putih khas loteng pabrik General Mills */}
      {[-4.3, -3.75].map((x, i) => (
        <P key={i} geo={() => <sphereGeometry args={[0.42, 14, 12]} />} color="#f5f0e1" pos={[x, 0.34, -1.8 + i * 0.45]} scale={[1, 0.82, 1.25]} hull={0.06} />
      ))}
    </group>
  );
};

const RangeWorld: React.FC<{ dusk?: boolean }> = ({ dusk = false }) => (
  <group>
    <SkyDome top={dusk ? "#3d356b" : "#4b8fe2"} horizon={dusk ? "#ffa46b" : "#fff2cf"} r={220} />
    <GrassField size={280} color={dusk ? "#7a8550" : "#899e5c"} />
    {/* Jalur tanah lapangan uji NDRC */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -4]} receiveShadow>
      <planeGeometry args={[14, 42]} />
      <meshStandardMaterial color={dusk ? "#b9986d" : "#cfb184"} roughness={1} />
    </mesh>
    <LowHill pos={[-32, 0, -68]} w={30} h={11} color="#63784c" />
    <LowHill pos={[28, 0, -72]} w={34} h={13} color="#5b7045" />
    <LowHill pos={[56, 0, -42]} w={24} h={9} color="#687d50" />
    <LowHill pos={[-54, 0, -40]} w={24} h={9} color="#687d50" />
    {/* Pagar kayu batas lapangan uji agar latar keliling rapat */}
    {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
      <group key={x} position={[x, 0, -18]}>
        <InkBox pos={[0, 0.55, 0]} size={[0.14, 1.1, 0.14]} color="#f5f0e6" ink={0.02} />
        <InkBox pos={[2, 0.82, 0]} size={[4.0, 0.1, 0.06]} color="#f5f0e6" ink={0.015} />
      </group>
    ))}
    {[[-11, -12], [12, -13], [-15, -4], [15, -5]].map(([x, z], i) => (
      <TreeSimple key={i} pos={[x, 0, z]} s={1.0 + (i % 2) * 0.25} />
    ))}
  </group>
);

/* ================================================================== */
/* ADEGAN 1 — HOOK: BOM LUNCUR PELICAN & PILOT MERPATI DI MONCONG     */
/* ================================================================== */
export const SceneMpHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("hook");
  const moncong = EV["hook.moncong"];
  const merpati = EV["hook.merpati"];

  // @RicksClips3000: Tracking Sweep di udara -> OTS mendekati lensa moncong -> ECU Snap-Zoom menembus kaca ke merpati!
  const cam = riksCam(f, [
    { to: moncong, mode: "crane", p0: [-2.6, 5.4, 8.2], p1: [-0.9, 4.1, 5.2], l0: [0, 3.8, -1.5], l1: [0, 3.85, 0.8], fov: 46, fov1: 40, roll0: -3, roll1: 1.5 },
    { to: merpati - 4, mode: "ots", p0: [-0.9, 4.1, 5.2], p1: [0.15, 3.92, 2.75], l0: [0, 3.85, 0.8], l1: [0, 3.88, 1.15], fov: 40, fov1: 35 },
    { to: dur + 10, mode: "snap", p0: [0.0, 3.95, 3.15], p1: [0.22, 4.02, 3.65], l0: [0, 3.85, 1.2], l1: [0, 3.95, 1.2], fov: 34, fov1: 38, roll0: 2.5, roll1: 0 },
  ]);

  const glideX = Math.sin(t * 2.3) * 0.25;
  const glideY = 3.9 + Math.cos(t * 2.8) * 0.12;
  const bank = Math.sin(t * 2.3) * 0.16;
  const reveal = ramp(f, merpati - 8, 8);
  const peck = f >= merpati - 8 ? Math.abs(Math.sin((f - merpati) * 0.55)) : 0;

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [merpati - 3, merpati + 3, merpati + 14], 0.055)} bg="#3b6fb6" fog={["#cfe4ff", 35, 170]}>
        <RangeWorld />
        <Lights key1="#fff1cc" sky="#93c5fd" ground="#5e6f46" k={2.1} dir={[8, 12, 8]} />
        {/* Awan tipis melintas cepat memberi efek kecepatan meluncur */}
        {[-5, 4.5, -2.5, 6].map((cx, i) => (
          <P
            key={i}
            geo={() => <sphereGeometry args={[1.4, 12, 10]} />}
            color="#ffffff"
            pos={[cx, 5.5 + (i % 2) * 1.4, -14 + ((t * 14 + i * 9) % 28)]}
            scale={[1.8, 0.55, 1.1]}
            hull={0.02}
          />
        ))}
        <ShipTargetBoard pos={[0, 0, -20]} />

        {/* Bom Luncur Pelican melayang di udara + kabin kaca depan terbuka/tembus pandang ke merpati pilot */}
        <group position={[glideX, glideY, 0]} rotation={[0.06, 0, bank]}>
          <P geo={() => <cylinderGeometry args={[0.52, 0.44, 2.5, 20]} />} color="#646e4b" rot={[Math.PI / 2, 0, 0]} hull={0.035} />
          <InkBox pos={[0, 0.08, -0.15]} size={[3.6, 0.09, 0.62]} color="#768259" ink={0.03} />
          <InkBox pos={[0, 0.50, -1.1]} size={[0.09, 0.72, 0.48]} color="#b91c1c" ink={0.025} />
          {/* Cincin jendela moncong + Merpati Pilot berkacamata di dalamnya! */}
          <P geo={() => <cylinderGeometry args={[0.48, 0.52, 0.22, 20]} />} color="#334155" pos={[0, 0, 1.26]} rot={[Math.PI / 2, 0, 0]} hull={0.04} />
          <mesh position={[0, 0, 1.36]}>
            <circleGeometry args={[0.43, 24]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <PigeonCard
            position={[0, -0.34, 1.40]}
            size={0.78 + reveal * 0.08}
            params={{
              flap: 0.15,
              peck,
              harness: true,
              goggles: true,
              expr: f >= merpati - 3 ? "smug" : "focus",
              seed: 1,
            }}
          />
        </group>
      </Stage>
      <Grade warm={0.18} speedLines={f < merpati - 4 ? 0.55 : 0.2} flash={pulse(f, merpati + 12, 6) * 0.45} />
      <BigTitle from={merpati + 10} to={dur + 8} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* ADEGAN 2 — IDE DI KERETA MINNESOTA & LOTENG PABRIK TEPUNG (1940)   */
/* ================================================================== */
export const SceneMpKereta: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("kereta");
  const kawanan = EV["ker.kawanan"];
  const kereta = EV["ker.kereta"];
  const loteng = EV["ker.loteng"];

  // @RicksClips3000: Crane-Down Establish senja -> Through-Glass/OTS ke Prof. Skinner -> Push-Orbit ke Silo Pabrik Tepung!
  const cam = riksCam(f, [
    { to: kawanan + 8, mode: "crane", p0: [-3.4, 5.2, 12.5], p1: [-1.2, 2.5, 8.8], l0: [0.4, 2.8, -3.5], l1: [0.5, 2.5, -1.5], fov: 48, fov1: 41, roll0: 2.5, roll1: 0 },
    { to: loteng - 6, mode: "ots", p0: [-0.2, 1.85, 5.4], p1: [1.35, 1.72, 4.3], l0: [1.1, 1.65, 0.6], l1: [1.35, 1.75, 0.8], fov: 37, fov1: 34 },
    { to: dur + 8, mode: "whip", whipDir: 1, p0: [2.1, 1.95, 5.8], p1: [2.5, 2.05, 6.4], l0: [2.4, 2.05, -2.5], l1: [2.9, 2.15, -4.0], fov: 40, fov1: 38 },
  ]);

  const pointK = ramp(f, kereta - 8, 12);
  const idea = f >= loteng - 4;
  const trainX = -2.2 + t * 0.55;
  const skinnerP = bean(SKINNER, {
    ...idle(t, 2),
    expr: f < kawanan - 2 ? "neutral" : f < kereta ? "shock" : "happy",
    mouthOpen: f >= kawanan && f < kereta ? 0.65 : 0,
    headTilt: f >= kawanan ? -10 : 0,
    prop: "paper",
    armL: [-22, -35],
    armR: [lerpN(16, 142, pointK), lerpN(-18, -24, pointK)],
    bob: idea ? Math.abs(Math.sin(t * 7)) * 7 : 2,
  });

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2d2142" fog={["#eb9c6b", 28, 130]}>
        <MinnesotaWorld />
        <Lights key1="#ffb472" sky="#ffa47c" ground="#5a3f42" k={2.1} dir={[9, 8, 5]} />
        <TrainCoach pos={[trainX, 0, -2.2]} />
        <BeanCard position={[1.45, 0, 0.9]} height={2.02} params={skinnerP} />
        <PigeonFlock center={[-1.4, 3.85, -2.5]} count={16} spread={[4.4, 1.4, 1.8]} t={t} size={0.44} drift={[0.65, 0.12, 0.1]} seed={4} />
        {idea && (
          <group position={[1.45, 2.58 + 0.05 * Math.sin(t * 8), 0.9]} scale={cl(easeOutBack(cl((f - (loteng - 4)) / 10)), 0, 1.2)}>
            <P geo={() => <sphereGeometry args={[0.18, 16, 12]} />} color="#fff4a0" emissive="#ffd23a" pos={[0, 0, 0]} hull={0.12} />
            <P geo={() => <cylinderGeometry args={[0.08, 0.08, 0.1, 10]} />} color="#9a9aa4" pos={[0, -0.19, 0]} hull={0.15} />
          </group>
        )}
      </Stage>
      <Grade warm={0.5} />
      <Chip from={6} to={kereta - 4} top={170} color="#7a1f1f" size={50}>
        MINNESOTA · 1940 · PROF. B.F. SKINNER
      </Chip>
      <Emote x={690} y={670} from={kawanan - 2} to={kereta + 6} text="!!" color="#991b1b" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* ADEGAN 3 — LAB: 10.000 PATUKAN & GAJI SEBUTIR JAGUNG               */
/* ================================================================== */
export const SceneMpLab: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("lab");
  const L1 = lineAt("lab", 1);
  const L2 = lineAt("lab", 2);
  const sepuluh = EV["lab.sepuluh"];
  const jagung = EV["lab.jagung"];
  const cuti = EV["lab.cuti"];

  // @RicksClips3000: Low-Angle Hero Push ke Dodi -> Snap ke Kotak/Counter 10.000x -> Whip-Pan 9f ke Ara -> Pull-Back Two-Shot!
  const cam = riksCam(f, [
    { to: sepuluh - 4, mode: "push", p0: [-0.35, 1.38, 5.6], p1: [-0.45, 1.44, 4.7], l0: [-0.55, 1.48, -0.4], l1: [-0.65, 1.52, -0.6], fov: 37, fov1: 34 },
    { to: L1.from - 3, mode: "snap", p0: [-0.85, 1.58, 3.55], p1: [-0.75, 1.62, 3.85], l0: [-1.25, 1.48, -2.3], l1: [-0.6, 1.42, -2.5], fov: 33, fov1: 35 },
    { to: L2.from - 3, mode: "whip", whipDir: 1, p0: [0.72, 1.48, 4.25], p1: [0.82, 1.46, 3.95], l0: [0.52, 1.45, -0.2], l1: [0.55, 1.48, -0.2], fov: 33, fov1: 31 },
    { to: dur + 8, mode: "whip", whipDir: -1, p0: [0.05, 1.58, 5.45], p1: [0.0, 1.65, 6.05], l0: [0.0, 1.42, -0.2], l1: [0.0, 1.46, -0.2], fov: 35, fov1: 38 },
  ]);

  const mD = mouth("lab", "dodi", f);
  const mA = mouth("lab", "ara", f);
  const peck = Math.abs(Math.sin(f * 0.62));
  const dodiPos: Vec3 = [-0.52, 0, 0.35];
  const araPos: Vec3 = [0.56, 0, -0.22];

  const dodiP = bean(DODI_M, {
    ...idle(t, 0),
    ...gesture(f, mD, 1),
    expr: f >= cuti - 2 ? "smug" : speaking("lab", 0, f) ? "happy" : speaking("lab", 2, f) ? "smug" : "neutral",
    mouthOpen: mD,
    headTilt: nod("lab", "dodi", f) + (f >= cuti - 2 ? 6 : 0),
    ...(f >= cuti - 3 ? { armL: [-52, -75] as [number, number], armR: [52, -75] as [number, number] } : {}),
  });

  const araP = bean(ARA_M, {
    ...idle(t, 2),
    expr: speaking("lab", 1, f) ? "think" : f >= jagung ? "happy" : "neutral",
    mouthOpen: mA,
    headTilt: speaking("lab", 1, f) ? 10 : nod("lab", "ara", f),
    armL: [-18, -32],
    armR: [66, -48],
  });
  const bagPos = beanHandWorld(araP, "R", araPos, 1.92, cam.pos);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [sepuluh, cuti], 0.04)} bg="#3b2b28" fog={["#3b2b28", 15, 42]}>
        <FlourMillLab pecked={peck} noseOpen={0.75} peckPhase={t} countText={f >= sepuluh - 2 ? "10.000 PATUKAN!" : "9.998 PATUKAN"} />
        <Lights key1="#ffdca4" sky="#eef4ff" ground="#6b4b3b" k={1.85} dir={[-3, 9, 7]} hemi={1.65} />
        <BeanCard position={araPos} height={1.92} params={araP} />
        <CornBag3D pos={[bagPos[0], bagPos[1] - 0.14, bagPos[2] + 0.05]} scale={0.88} />
        <BeanCard position={dodiPos} height={2.05} params={dodiP} />
      </Stage>
      <Grade warm={0.18} />
      <Chip from={sepuluh - 2} to={L1.from + 4} top={175} color="#991b1b" size={56}>
        REKOR UJI: 10.000 PATUKAN / 45 MENIT!
      </Chip>
      <Emote x={710} y={710} from={L1.from - 2} to={L1.to + 4} text="?" color="#5a1838" />
      <Insert kind="feed" from={jagung - 4} len={38} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* ADEGAN 4 — DEMOKRASI 3 MERPATI (X-RAY BLUEGRID VOTING 2 LAWAN 1)   */
/* ================================================================== */
export const SceneMpVoting: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("voting");
  const L1 = lineAt("voting", 1);
  const tiga = EV["vot.tiga"];
  const meleng = EV["vot.meleng"];
  const terbanyak = EV["vot.terbanyak"];

  const xrayStart = L1.from + 8;
  const xrayEnd = terbanyak + 24;

  // Cabang panggung X-Ray 3D dengan orbit 110° ala @RicksClips3000 mengelilingi Moncong Pelican 3-Merpati!
  if (f >= xrayStart && f < xrayEnd) {
    const xk = cl((f - xrayStart) / Math.max(1, xrayEnd - xrayStart));
    const ang = lerpN(-0.62, 0.58, smoother(xk));
    const rad = lerpN(4.4, 3.65, Math.sin(xk * Math.PI));
    const xCam: Cam = {
      pos: [Math.sin(ang) * rad, lerpN(2.35, 1.75, smoother(xk)), Math.cos(ang) * rad],
      look: [0, 1.55, 0.05],
      fov: lerpN(39, 34, smoother(xk)),
      roll: Math.sin(xk * Math.PI * 2) * 2.2,
    };
    const sleepy = f >= meleng - 3;
    const steer = ramp(f, terbanyak - 6, 12);

    return (
      <AbsoluteFill>
        <Stage cam={xCam} shake={kick(f, [terbanyak], 0.06)} bg="#06192e" fog={["#06192e", 14, 42]}>
          <BlueGrid size={60} y={0} />
          <hemisphereLight args={["#9fe6ff", "#0a2a4a", 1.85]} />
          <directionalLight position={[3, 8, 6]} intensity={1.5} color="#cfefff" />
          <group position={[0, 0, 0]} rotation={[0, -steer * 0.28, steer * 0.08]}>
            <PelicanNoseCone open={1.05} peckPhase={t * 1.2} scale={1.18} />
            {/* Panah arah kemudi sirip rudal di atas moncong */}
            <group position={[-steer * 0.35, 3.15, 0.1]} rotation={[0, 0, 0.35 + steer * 0.35]}>
              <InkBox pos={[0, 0, 0]} size={[1.15, 0.20, 0.14]} color={steer > 0.2 ? "#4ade80" : "#38bdf8"} ink={0.02} />
              <P geo={() => <coneGeometry args={[0.28, 0.45, 4]} />} color={steer > 0.2 ? "#4ade80" : "#38bdf8"} pos={[-0.72, 0, 0]} rot={[0, 0, Math.PI / 2]} hull={0.06} />
            </group>
          </group>
          {/* Indikator 3D silang merah di kabin bawah saat merpati ke-3 meleng */}
          {sleepy && <InkBox pos={[0.38, 1.38, 0.45]} size={[0.28, 0.28, 0.06]} color="#ef4444" ink={0.02} />}
        </Stage>
        <Grade cool={0.45} flash={pulse(f, terbanyak, 6) * 0.35} />
        <VoteBoard2D from={xrayStart + 2} to={xrayEnd - 2} sleepFrom={meleng - 3} winFrom={terbanyak - 2} />
        <Stamp text="MENANG VOTING 2–1!" from={terbanyak} to={xrayEnd - 2} color="#16a34a" top={960} rot={-4} />
      </AbsoluteFill>
    );
  }

  // Di Lab sebelum & sesudah X-Ray: OTS bahu Dodi ke Ara -> Snap kembali ke Dodi tegas!
  const cam = riksCam(f, [
    { to: xrayStart, mode: "ots", p0: [-0.75, 1.58, 4.5], p1: [-0.35, 1.54, 3.95], l0: [0.48, 1.46, -0.3], l1: [0.65, 1.48, -0.6], fov: 36, fov1: 33 },
    { to: dur + 8, mode: "snap", p0: [0.1, 1.56, 4.9], p1: [0.0, 1.62, 5.5], l0: [-0.15, 1.46, -0.2], l1: [0.0, 1.48, -0.2], fov: 34, fov1: 37 },
  ]);

  const mD = mouth("voting", "dodi", f);
  const mA = mouth("voting", "ara", f);
  const dodiP = bean(DODI_M, {
    ...idle(t, 1),
    ...gesture(f, mD, 2),
    expr: f >= terbanyak ? "smug" : speaking("voting", 1, f) ? "happy" : "neutral",
    mouthOpen: mD,
    headTilt: nod("voting", "dodi", f),
  });
  const araP = bean(ARA_M, {
    ...idle(t, 3),
    ...gesture(f, mA, 4),
    expr: speaking("voting", 0, f) ? "worried" : "happy",
    mouthOpen: mA,
    headTilt: speaking("voting", 0, f) ? -9 : 5,
  });

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#3b2b28" fog={["#3b2b28", 15, 42]}>
        <FlourMillLab pecked={0.4} noseOpen={0.95} peckPhase={t} />
        <Lights key1="#ffdca4" sky="#eef4ff" ground="#6b4b3b" k={1.85} dir={[-3, 9, 7]} hemi={1.65} />
        <BeanCard position={[0.56, 0, -0.22]} height={1.92} params={araP} />
        <BeanCard position={[-0.52, 0, 0.35]} height={2.05} params={dodiP} />
      </Stage>
      <Grade warm={0.16} />
      <Emote x={690} y={560} from={EV["vot.ngantuk"] - 2} to={L1.from} text="Zzz?" color="#3a6aa8" />
      {tiga < -999 && null}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* ADEGAN 5 — PAMERAN DI DEPAN KOMITE JENDERAL & KANTONG JAGUNG ARA   */
/* ================================================================== */
export const SceneMpUji: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("uji");
  const L1 = lineAt("uji", 1);
  const L2 = lineAt("uji", 2);
  const hus = EV["uji.hus"];

  // @RicksClips3000: Crane-Down Establish Lapangan Uji NDRC -> OTS Close-Up Kantong Jagung Ara -> Whip-Pan 9f ke Dodi Panik!
  const cam = riksCam(f, [
    { to: L1.from - 4, mode: "crane", p0: [2.4, 5.2, 11.2], p1: [0.8, 2.05, 7.2], l0: [0.0, 2.1, -2.5], l1: [0.2, 1.55, -1.2], fov: 47, fov1: 38, roll0: -2.5, roll1: 0 },
    { to: L2.from - 2, mode: "ots", p0: [-0.35, 1.48, 3.85], p1: [-0.15, 1.44, 3.35], l0: [0.58, 1.38, 0.2], l1: [0.62, 1.32, 0.25], fov: 34, fov1: 31 },
    { to: dur + 8, mode: "whip", whipDir: -1, p0: [-0.55, 1.52, 3.65], p1: [-0.15, 1.56, 4.45], l0: [-0.35, 1.48, 0.3], l1: [0.05, 1.46, 0.2], fov: 33, fov1: 36 },
  ]);

  const mD = mouth("uji", "dodi", f, [0]);
  const mA = mouth("uji", "ara", f);
  const stepA = ramp(f, L1.from - 10, 22);
  const araWalk = stepA > 0 && stepA < 1 ? beanWalk(t, 1.5) : {};
  const reachD = ramp(f, hus - 2, 10);

  const dodiPos: Vec3 = [-0.48, 0, 0.38];
  const araPos: Vec3 = [lerpN(0.88, 0.52, stepA), 0, lerpN(-0.35, 0.18, stepA)];
  const jenPos: Vec3 = [1.55, 0, -2.6];

  const dodiP = bean(DODI_M, {
    ...idle(t, 0),
    expr: f >= hus - 2 ? "scared" : "smug",
    sweat: f >= hus - 2,
    mouthOpen: mD,
    headTilt: f >= hus - 2 ? -8 : 4,
    armR: f >= hus - 2 ? [lerpN(12, 86, reachD), lerpN(-15, -35, reachD)] : [12, -14],
    lean: reachD * 6,
  });

  const araP = bean(ARA_M, {
    ...idle(t, 2),
    ...araWalk,
    expr: f >= hus + 2 ? "shock" : speaking("uji", 1, f) ? "happy" : "neutral",
    mouthOpen: mA,
    armL: [-34, -46],
    armR: [68, -52],
    headTilt: speaking("uji", 1, f) ? 9 : 0,
  });

  const jenP = bean(JENDERAL_M, {
    ...idle(t, 5),
    expr: "neutral",
    armL: [-28, -55],
    armR: [28, -55],
    headTilt: -4,
  });

  const bagPos = beanHandWorld(araP, "R", araPos, 1.92, cam.pos);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [hus], 0.06)} bg="#4a8be0" fog={["#dcebff", 32, 150]}>
        <RangeWorld />
        <Lights key1="#fff0c4" sky="#a6ceff" ground="#687a48" k={2.05} dir={[7, 12, 8]} />
        <PelicanRig pos={[-1.4, 0, -4.5]} yaw={Math.sin(t * 1.4) * 0.08} peckPhase={t} voteText="SUARA 2-1: KAPAL TARGET" />
        <ShipTargetBoard pos={[-1.4, 0, -13.5]} />
        <CanteenTruck pos={[3.5, 0, -5.2]} rot={[0, -0.45, 0]} chaos={0} t={t} />
        <BeanCard position={jenPos} height={2.12} params={jenP} />
        <BeanCard position={araPos} height={1.92} params={araP} />
        <CornBag3D pos={[bagPos[0], bagPos[1] - 0.12, bagPos[2] + 0.06]} scale={0.95} />
        <BeanCard position={dodiPos} height={2.05} params={dodiP} />
      </Stage>
      <Grade warm={0.14} />
      <Chip from={6} to={L1.from - 6} top={170} color="#1e3a8a" size={50}>
        OKTOBER 1944 · UJI KOMITE JENDERAL
      </Chip>
      <Emote x={360} y={560} from={hus - 2} to={dur} text="!!" color="#dc2626" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* ADEGAN 6 — KANTONG JAGUNG ROBEK & 3 LENSA LANGSUNG NYOROT JAGUNG!  */
/* ================================================================== */
export const SceneMpTumpah: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("tumpah");
  const L1 = lineAt("tumpah", 1);
  const tumpah = EV["tum.tumpah"];
  const lensanya = EV["tum.lensanya"];

  // @RicksClips3000: Pull-Shot rebutan -> Tracking Drop mengikuti jagung jatuh ke Truk Kantin -> ECU Snap-Zoom ke 3 Lensa Pelican!
  const cam = riksCam(f, [
    { to: tumpah + 16, mode: "crane", p0: [0.2, 1.58, 4.2], p1: [1.85, 1.05, 3.8], l0: [0.15, 1.35, 0.2], l1: [2.25, 0.45, -3.2], fov: 38, fov1: 42, roll0: 0, roll1: 3.2 },
    { to: dur + 8, mode: "snap", p0: [-1.25, 2.15, 0.45], p1: [-1.35, 2.1, 0.15], l0: [-1.4, 1.95, -2.5], l1: [-1.4, 1.95, -2.5], fov: 34, fov1: 31, roll0: -3.5, roll1: 0 },
  ]);

  const mD = mouth("tumpah", "dodi", f);
  const mA = mouth("tumpah", "ara", f);
  const spilled = ramp(f, tumpah - 4, 18);
  const hungry = f >= lensanya - 3;

  const dodiP = bean(DODI_M, {
    ...idle(t, 0),
    expr: "shock",
    sweat: true,
    mouthOpen: mD,
    armL: [-125, -60],
    armR: [125, -60],
    bob: pulse(f, L1.from, 12) * 9,
  });
  const araP = bean(ARA_M, {
    ...idle(t, 2),
    expr: "scared",
    sweat: true,
    mouthOpen: mA,
    armL: [-110, -75],
    armR: [110, -75],
  });

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [tumpah, lensanya], 0.065)} bg="#4a8be0" fog={["#dcebff", 32, 150]}>
        <RangeWorld />
        <Lights key1="#fff0c4" sky="#a6ceff" ground="#687a48" k={2.05} dir={[7, 12, 8]} />
        <PelicanRig
          pos={[-1.4, 0, -4.5]}
          yaw={lerpN(0.05, 0.42, ramp(f, lensanya - 2, 18))}
          peckPhase={t * 2.2}
          distracted={hungry}
          voteText={hungry ? "TARGET BARU: JAGUNG!!" : "MENCARI SASARAN..."}
        />
        {/* 3 Merpati tampak di dekat moncong rig melotot kuning lapar */}
        {hungry && (
          <PelicanNoseCone
            pos={[-1.4, 0.85, -2.6]}
            scale={0.85}
            open={1.0}
            peckPhase={t * 2.5}
            distracted
          />
        )}
        <CanteenTruck pos={[2.75, 0, -4.2]} rot={[0, -0.5, 0]} chaos={spilled * 0.4} t={t} />
        {spilled > 0.1 && <CornScatter3D pos={[1.85, 0, -2.85]} count={22} />}
        {spilled > 0.2 && <CornScatter3D pos={[2.35, 0, -3.45]} count={18} />}
        <BeanCard position={[0.52, 0, 0.15]} height={1.92} params={araP} />
        <BeanCard position={[-0.48, 0, 0.35]} height={2.05} params={dodiP} />
      </Stage>
      <Grade warm={0.22} flash={pulse(f, lensanya, 6) * 0.35} />
      <Insert kind="rip" from={4} len={36} />
      {hungry && (
        <Chip from={lensanya - 1} to={dur + 4} top={175} color="#ca8a04" size={54}>
          3 LENSA TERKUNCI KE JAGUNG JENDERAL!
        </Chip>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* ADEGAN 7 — KLIMAKS VOTING 3–0 & VERTIGO DOLLY-ZOOM PAK JENDERAL!!  */
/* ================================================================== */
export const SceneMpSerbu: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("serbu");
  const tiga = EV["ser.tiga"];
  const panci = EV["ser.panci"];
  const jangan = EV["ser.jangan"];
  const jenderal = EV["ser.jenderal"];

  // @RicksClips3000 Klimaks:
  // 1) Whip-Snap ke Rig Pelican membanting 3-0 -> 2) Whip-Track Dodi lari panik ke Truk Kantin ->
  // 3) JURUS #6: VERTIGO DOLLY-ZOOM + DUTCH TILT (-5.5°) tepat di wajah murka Pak Jenderal!!
  const cam = riksCam(f, [
    { to: panci - 2, mode: "snap", p0: [-0.55, 2.35, -0.35], p1: [-0.25, 2.25, 0.25], l0: [-1.35, 2.35, -4.4], l1: [-1.1, 2.25, -4.4], fov: 36, fov1: 39, roll0: -3, roll1: 2 },
    { to: jenderal - 6, mode: "whip", whipDir: 1, p0: [0.35, 1.65, 3.85], p1: [1.45, 1.58, 2.95], l0: [1.15, 1.45, -1.8], l1: [1.95, 1.48, -2.6], fov: 40, fov1: 38 },
    { to: dur + 10, mode: "vertigo", p0: [1.85, 1.56, 0.55], l0: [1.85, 1.58, -2.15], fov: 48, fov1: 25, roll0: -1.5, roll1: -5.8 },
  ]);

  const mD = mouth("serbu", "dodi", f);
  const mA = mouth("serbu", "ara", f);
  const runK = cl((f - jangan + 4) / 34);
  const dodiWalk = runK > 0 && runK < 1 ? beanWalk(t, 2.6) : {};
  const dodiPos: Vec3 = [lerpN(-0.6, 0.68, runK), 0, lerpN(0.4, -1.45, runK)];

  const dodiP = bean(DODI_M, {
    ...idle(t, 0),
    ...dodiWalk,
    expr: "scared",
    sweat: true,
    mouthOpen: mD,
    armL: [-135 + Math.sin(f * 0.7) * 22, -40],
    armR: [135 - Math.sin(f * 0.7) * 22, -40],
    lean: 10,
  });

  const araP = bean(ARA_M, {
    ...idle(t, 2),
    expr: "shock",
    sweat: true,
    mouthOpen: mA,
    armL: [-140, -90],
    armR: [140, -90],
  });

  const mad = f >= jenderal - 4;
  const jenP = bean(JENDERAL_M, {
    ...idle(t, 4),
    expr: mad ? "angry" : "shock",
    mouthOpen: mad ? 0.75 * Math.abs(Math.sin(f * 0.55)) : 0.6,
    armL: mad ? [-145 + Math.sin(f * 0.8) * 18, -35] : [-40, -40],
    armR: mad ? [145 - Math.sin(f * 0.8) * 18, -35] : [40, -40],
    bob: mad ? Math.abs(Math.sin(f * 0.65)) * 12 : 3,
  });

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [tiga, panci, jenderal], 0.085, 14)} bg="#4a8be0" fog={["#dcebff", 30, 145]}>
        <RangeWorld />
        <Lights key1="#ffe8b0" sky="#a6ceff" ground="#687a48" k={2.15} dir={[6, 11, 8]} />
        <PelicanRig
          pos={[-1.4, 0, -4.5]}
          yaw={0.62 + Math.sin(t * 9) * 0.06}
          pitch={-0.18}
          peckPhase={t * 3.0}
          distracted
          voteText="SUARA 3-0: SERBU JAGUNG!!"
        />
        <CanteenTruck pos={[2.75, 0, -4.4]} rot={[0, -0.48, 0]} chaos={1} t={t} />
        <CornScatter3D pos={[1.95, 0, -3.1]} count={26} />
        {/* Kawanan merpati menyerbu panci makan siang Pak Jenderal! */}
        <PigeonFlock center={[2.05, 1.55, -3.1]} count={12} spread={[1.9, 1.1, 1.2]} t={t * 1.35} size={0.44} drift={[0.05, 0.04, 0]} seed={9} />
        <BeanCard position={[-0.85, 0, -0.6]} height={1.90} params={araP} />
        <BeanCard position={dodiPos} height={2.02} params={dodiP} />
        <BeanCard position={[1.85, 0, -2.15]} height={2.16} params={jenP} />
      </Stage>
      <Grade warm={0.32} speedLines={mad ? 0.45 : 0.22} flash={pulse(f, jenderal, 7) * 0.45} />
      <Chip from={tiga - 2} to={jenderal - 8} top={165} color="#dc2626" size={56}>
        HASIL VOTING: 3–0 KE PANCI JENDERAL!
      </Chip>
      <Stamp text="SALAH SASARAN!!" from={jenderal + 4} to={dur + 6} color="#dc2626" top={220} rot={-6} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* ADEGAN 8 — DIGANTI RADAR ELEKTRONIK 1944 & PENGHARGAAN IG NOBEL    */
/* ================================================================== */
export const SceneMpAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("akhir");
  const L1 = lineAt("akhir", 1);
  const L2 = lineAt("akhir", 2);
  const dibatalkan = EV["akh.dibatalkan"];
  const radar = EV["akh.radar"];
  const nobel = EV["akh.nobel"];
  const iya = EV["akh.iya"];
  const mereka = EV["akh.mereka"];

  // @RicksClips3000: Crane Glide dari Radar 1944 berputar -> Whip halus ke Ara ceria (Ig Nobel) -> Push-In + Roll ke merpati mendarat di topi Dodi!
  const cam = riksCam(f, [
    { to: L1.from - 3, mode: "crane", p0: [1.85, 2.75, 5.8], p1: [0.45, 1.75, 4.9], l0: [1.35, 1.55, -1.6], l1: [0.15, 1.45, -0.4], fov: 41, fov1: 36 },
    { to: L2.from - 3, mode: "whip", whipDir: -1, p0: [0.35, 1.54, 4.25], p1: [0.15, 1.52, 4.05], l0: [0.22, 1.48, -0.1], l1: [0.1, 1.5, 0.0], fov: 34, fov1: 33 },
    { to: dur + 10, mode: "push", p0: [-0.15, 1.56, 4.15], p1: [-0.28, 1.66, 3.45], l0: [-0.35, 1.58, 0.45], l1: [-0.42, 1.72, 0.5], fov: 34, fov1: 30, roll0: 0, roll1: -2.8 },
  ]);

  const mD = mouth("akhir", "dodi", f, [0]);
  const mA = mouth("akhir", "ara", f);
  const sigh = ramp(f, iya - 2, 12);
  const land = ramp(f, mereka - 12, 14);

  const dodiPos: Vec3 = [-0.46, 0, 0.52];
  const araPos: Vec3 = [0.54, 0, -0.15];

  const dodiP = bean(DODI_M, {
    ...idle(t, 0),
    expr: f >= mereka ? "sad" : f >= iya - 2 ? "worried" : "neutral",
    mouthOpen: mD,
    bob: -sigh * 6,
    armL: [-8 - sigh * 6, -10],
    armR: [8 + sigh * 6, -10],
    headTilt: -sigh * 8 + (f >= mereka ? -4 : 0),
    lean: sigh * 4,
  });

  const araP = bean(ARA_M, {
    ...idle(t, 3),
    expr: speaking("akhir", 1, f) || f >= nobel - 2 ? "happy" : "neutral",
    mouthOpen: mA,
    armL: [-12, -16],
    armR: speaking("akhir", 1, f) ? [125, -45] : [12, -16],
    headTilt: speaking("akhir", 1, f) ? 10 : 0,
    bob: speaking("akhir", 1, f) ? Math.abs(Math.sin(t * 6)) * 6 : 2,
  });

  const headTop: Vec3 = [dodiPos[0] + 0.02, 2.02, dodiPos[2] + 0.08];
  const pigeonPos = lerpV([1.8, 3.6, -1.2], headTop, land);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [dibatalkan, mereka], 0.04)} bg="#3c3056" fog={["#d69b72", 26, 120]}>
        <RangeWorld dusk />
        <Lights key1="#ffa86e" sky="#d4988f" ground="#563c3a" k={1.95} dir={[8, 7, 5]} hemi={1.55} />
        <RadarSet1944 pos={[1.85, 0, -1.95]} rot={[0, -0.38, 0]} t={t} />
        <PelicanRig pos={[-2.4, 0, -5.8]} yaw={0} peckPhase={0} voteText="PROYEK DITUTUP · OKT 1944" />
        <CornScatter3D pos={[-0.1, 0, 0.9]} count={10} />
        <BeanCard position={araPos} height={1.92} params={araP} />
        <BeanCard position={dodiPos} height={2.05} params={dodiP} />
        {land > 0 && (
          <PigeonCard
            position={pigeonPos}
            size={0.62}
            params={{
              flap: land < 1 ? 0.45 + 0.55 * Math.abs(Math.sin(t * 14)) : 0,
              harness: true,
              corn: true,
              expr: f >= mereka + 2 ? "smug" : "happy",
              seed: 7,
            }}
          />
        )}
      </Stage>
      <Grade warm={0.42} flash={pulse(f, mereka, 5) * 0.24} />
      <Stamp text="DIGANTI RADAR · 1944" from={dibatalkan} to={L1.from - 6} color="#7a1f1f" top={260} rot={-5} />
      <Chip from={nobel - 4} to={L2.from - 4} top={175} color="#b45309" size={52}>
        2024 · PENGHARGAAN IG NOBEL PERDAMAIAN!
      </Chip>
      {radar < -999 && null}
    </AbsoluteFill>
  );
};

export const MP_SCENES: Record<MpScene, React.FC> = {
  hook: SceneMpHook,
  kereta: SceneMpKereta,
  lab: SceneMpLab,
  voting: SceneMpVoting,
  uji: SceneMpUji,
  tumpah: SceneMpTumpah,
  serbu: SceneMpSerbu,
  akhir: SceneMpAkhir,
};
export type { PigeonParams };

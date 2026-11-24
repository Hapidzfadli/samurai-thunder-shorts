import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./razia_timing.json";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanExpr, BeanParams, beanHandWorld } from "./three/objectsBean";
import {
  BayanganSapu3D,
  BesekPindang3D,
  Ember3D,
  IkanTongkol3D,
  KamarKosRiko,
  KoridorLantai2,
  OrenHero3D,
  SapuIjuk3D,
  Selimut3D,
  SPOT,
} from "./three/objectsRazia";
import { ARA, BAGAS_RAZIA, BU_TINI_RAZIA, NADIA, RIKO_RAZIA, SPEAKER_COLORS } from "./SheetRazia";

export type RaziaScene = "hook" | "alarm" | "nyamar" | "dobrak" | "bocor" | "twist" | "rebutan" | "ending";
export const RAZIA_ORDER = timing.order as RaziaScene[];
export const DUR_RAZIA = (k: RaziaScene): number => timing.scenes[k].durationInFrames;
export const TOTAL_FRAMES_RAZIA = timing.totalFrames;

const FONT_HEAD = "Anton, Impact, 'Arial Black', sans-serif";
const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
const smoothStep = (f: number, from: number, dur: number) => smoother(cl((f - from) / Math.max(1, dur)));

type LineTiming = { from: number; to: number; speaker?: string };
const LINES = timing.lines as Record<string, LineTiming>;
const EV = timing.events as Record<string, number>;

const inLine = (f: number, id: string, pad = 2) => {
  const ln = LINES[id];
  return ln ? f >= ln.from - pad && f <= ln.to + pad : false;
};

const talkMouth = (f: number, ids: string[]): number => {
  for (const id of ids) {
    const ln = LINES[id];
    if (ln && f >= ln.from && f <= ln.to) {
      return 0.22 + 0.78 * Math.abs(Math.sin(f * 0.85)) * (Math.sin(f * 0.31) > -0.55 ? 1 : 0.25);
    }
  }
  return 0;
};

/* ================================================================== */
/* 3D CINEMATIC CAMERA ENGINE (ORBIT 360° + LINEAR + VERTIGO + CRANE) */
/* ================================================================== */
type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };

type OrbitSeg = {
  kind: "orbit";
  to: number;
  target0: Vec3;
  target1?: Vec3;
  ang0: number;
  ang1: number;
  rad0: number;
  rad1?: number;
  y0: number;
  y1?: number;
  fov0?: number;
  fov1?: number;
  roll0?: number;
  roll1?: number;
};

type LinearSeg = {
  kind: "linear";
  to: number;
  p0: Vec3;
  p1?: Vec3;
  l0: Vec3;
  l1?: Vec3;
  fov0?: number;
  fov1?: number;
  roll0?: number;
  roll1?: number;
};

type CamSeg = OrbitSeg | LinearSeg;

const evalCam = (frame: number, segs: CamSeg[]): Cam => {
  let start = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (frame < s.to || i === segs.length - 1) {
      const len = Math.max(1, s.to - start);
      const k = smoother(cl((frame - start) / len));
      const fov0 = s.fov0 ?? 50;
      const fov = lerpN(fov0, s.fov1 ?? fov0, k);
      const roll = lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k);
      if (s.kind === "orbit") {
        const look = lerpV(s.target0, s.target1 ?? s.target0, k);
        const ang = lerpN(s.ang0, s.ang1, k);
        const rad = lerpN(s.rad0, s.rad1 ?? s.rad0, k);
        const y = lerpN(s.y0, s.y1 ?? s.y0, k);
        const pos: Vec3 = [look[0] + Math.sin(ang) * rad, y, look[2] + Math.cos(ang) * rad];
        return { pos, look, fov, roll };
      }
      const pos = lerpV(s.p0, s.p1 ?? s.p0, k);
      const look = lerpV(s.l0, s.l1 ?? s.l0, k);
      return { pos, look, fov, roll };
    }
    start = s.to;
  }
  return { pos: [0, 1.6, 4.1], look: [0, 1.0, -0.8], fov: 52, roll: 0 };
};

const kick = (f: number, hits: number[], amp = 0.14): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 14) {
      const a = (1 - d / 14) * amp;
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
  camera.lookAt(cam.look[0] + shake[0], cam.look[1] + shake[1], cam.look[2]);
  camera.rotateZ((cam.roll * Math.PI) / 180);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};

const Stage: React.FC<{ cam: Cam; shake?: Vec3; bg?: string; children: React.ReactNode }> = ({ cam, shake, bg = "#291810", children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.05, far: 120, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <color attach="background" args={[bg]} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* Clean Color Grade WITHOUT SwANGLE-buggy backdropFilter blur */
const Grade: React.FC<{ warm?: number; pastel?: number; spy?: number; flash?: number; flashCol?: string }> = ({
  warm = 0,
  pastel = 0,
  spy = 0,
  flash = 0,
  flashCol = "#ffffff",
}) => (
  <>
    {warm > 0 && <AbsoluteFill style={{ mixBlendMode: "soft-light", background: `rgba(255,180,80,${0.32 * warm})` }} />}
    {pastel > 0 && <AbsoluteFill style={{ mixBlendMode: "soft-light", background: `rgba(255,215,150,${0.44 * pastel})` }} />}
    {spy > 0 && <AbsoluteFill style={{ mixBlendMode: "multiply", background: `rgba(30,40,75,${0.22 * spy})` }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 44%, rgba(0,0,0,0) 56%, rgba(16,8,6,0.40) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(16,8,6,0) 72%, rgba(16,8,6,0.42) 89%, rgba(16,8,6,0.68) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: flashCol, opacity: flash }} />}
  </>
);

/* ================================================================== */
/* UI OVERLAYS: TAG, CHIP, STAMP, SPEECH POP, CLOSE-UP INSERT, CAPTIONS */
/* ================================================================== */
const Tag: React.FC<{ label: string; from?: number; to: number; color?: string; top?: number }> = ({ label, from = 0, to, color = "#fb923c", top = 112 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 52,
        padding: "10px 24px",
        borderRadius: 16,
        background: "rgba(24,14,10,0.92)",
        border: `3.5px solid ${color}`,
        fontFamily: FONT_BODY,
        fontWeight: 900,
        fontSize: 30,
        letterSpacing: 1.1,
        color: "#fff7ed",
        opacity: s * out,
        transform: `translateX(${(1 - s) * -80}px)`,
        boxShadow: "0 8px 20px rgba(0,0,0,0.38)",
      }}
    >
      {label}
    </div>
  );
};

const Chip: React.FC<{ from: number; to: number; top: number; children: React.ReactNode; color?: string }> = ({ from, to, top, children, color = "#f97316" }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 220 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 54, right: 54, top, textAlign: "center", transform: `scale(${0.65 + 0.35 * s})`, opacity: Math.min(1, s * 1.5) * o }}>
      <div
        style={{
          display: "inline-block",
          background: "rgba(255,250,238,0.97)",
          border: `7px solid ${color}`,
          borderRadius: 26,
          padding: "12px 28px",
          fontFamily: FONT_HEAD,
          fontSize: 52,
          color: "#1c120c",
          boxShadow: "0 14px 32px rgba(0,0,0,0.42)",
          lineHeight: 1.05,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Stamp: React.FC<{ text: string; from: number; to: number; color?: string; top?: number }> = ({ text, from, to, color = "#dc2626", top = 215 }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 9, stiffness: 260 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 54, right: 54, textAlign: "center", transform: `rotate(-4deg) scale(${1.45 - 0.45 * s})`, opacity: Math.min(1, s * 2) * o }}>
      <div
        style={{
          display: "inline-block",
          border: `10px solid ${color}`,
          borderRadius: 20,
          padding: "12px 30px",
          background: "rgba(255,248,235,0.96)",
          fontFamily: FONT_HEAD,
          fontSize: 56,
          color,
          letterSpacing: 2,
          boxShadow: "0 16px 36px rgba(0,0,0,0.42)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Close-up SVG hand insert for small actions (Rule 3 of CLAUDE.md: stuffing Oren into pillowcase!) */
const PillowDisguiseInsert: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const p = cl((f - from) / Math.max(1, to - from));
  const enter = spring({ frame: f - from, fps: 30, config: { damping: 12, stiffness: 220 } });
  const exit = interpolate(f, [to - 7, to], [1, 0], clamp);
  const slipY = interpolate(p, [0.1, 0.72], [-75, 0], clamp);
  const earPop = spring({ frame: Math.max(0, f - (from + Math.round((to - from) * 0.52))), fps: 30, config: { damping: 9, stiffness: 260 } });

  return (
    <div
      style={{
        position: "absolute",
        top: 230,
        left: 90,
        right: 90,
        transform: `scale(${(0.7 + 0.3 * enter) * (0.85 + 0.15 * exit)})`,
        opacity: Math.min(1, enter * 1.6) * exit,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "#fffbeb",
          border: "8px solid #241726",
          borderRadius: 34,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.52)",
        }}
      >
        <div style={{ background: "#f59e0b", padding: "10px 22px", borderBottom: "6px solid #241726", fontFamily: FONT_HEAD, fontSize: 38, color: "#1c1917", textAlign: "center", letterSpacing: 1 }}>
          ✨ INSERT: OPERASI "BANTAL BULU" ✨
        </div>
        <svg viewBox="0 0 600 380" style={{ width: "100%", display: "block", background: "#fef3c7" }}>
          {/* Kasur kotak latar */}
          <rect x="0" y="260" width="600" height="120" fill="#dc2626" />
          <rect x="0" y="260" width="600" height="120" fill="#ffffff" opacity="0.35" />
          <line x1="0" y1="260" x2="600" y2="260" stroke="#241726" strokeWidth="7" />
          {/* Badan Oren meringkuk */}
          <ellipse cx="300" cy="240" rx="132" ry="72" fill="#f28c28" stroke="#241726" strokeWidth="8" />
          {/* Sarung bantal kuning kotak-kotak ditarik turun oleh dua tangan Bagas */}
          <g transform={`translate(0, ${slipY})`}>
            <rect x="148" y="168" width="304" height="145" rx="48" fill="#fde68a" stroke="#241726" strokeWidth="8" />
            {[200, 260, 320, 380].map((x) => (
              <line key={x} x1={x} y1="172" x2={x} y2="309" stroke="#f59e0b" strokeWidth="10" opacity="0.55" />
            ))}
            {[210, 260].map((y) => (
              <line key={y} x1="154" y1={y} x2="446" y2={y} stroke="#f59e0b" strokeWidth="10" opacity="0.55" />
            ))}
            {/* Tangan kiri & kanan Bagas menarik tepi sarung */}
            <ellipse cx="146" cy="235" rx="34" ry="26" fill="#f0d2af" stroke="#241726" strokeWidth="7" />
            <ellipse cx="454" cy="235" rx="34" ry="26" fill="#f0d2af" stroke="#241726" strokeWidth="7" />
          </g>
          {/* Dua kuping oren nongol keluar "POP!" */}
          <g transform={`translate(300, 170) scale(${earPop})`}>
            <polygon points="-75,4 -42,-78 -10,4" fill="#f28c28" stroke="#241726" strokeWidth="8" strokeLinejoin="round" />
            <polygon points="-60,-4 -42,-54 -24,-4" fill="#f9a8b8" />
            <polygon points="10,4 42,-78 75,4" fill="#f28c28" stroke="#241726" strokeWidth="8" strokeLinejoin="round" />
            <polygon points="24,-4 42,-54 60,-4" fill="#f9a8b8" />
          </g>
          {/* Ekor oren kecil nongol di samping */}
          <path d="M448,255 Q515,240 500,192" fill="none" stroke="#241726" strokeWidth="26" strokeLinecap="round" />
          <path d="M448,255 Q515,240 500,192" fill="none" stroke="#f28c28" strokeWidth="14" strokeLinecap="round" />
          <text x="300" y="64" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="34" fill="#7c2d12">
            KUPINGNYA KOK MASIH NONGOL?! 😂
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ================================================================== */
/* SPEAKER BADGE & SUBTITLES (5 VOICES WITH COLOR-CODED BADGES)       */
/* ================================================================== */
const SPEAKER_META: Record<string, { label: string; bg: string; border: string; fg: string }> = {
  nadia: { label: "🎙️ MBAK NADIA", bg: SPEAKER_COLORS.nadia, border: "#e0f2fe", fg: "#ffffff" },
  riko: { label: "😰 RIKO (KAMAR 01)", bg: SPEAKER_COLORS.riko, border: "#bfdbfe", fg: "#ffffff" },
  bagas: { label: "😎 MAS BAGAS", bg: SPEAKER_COLORS.bagas, border: "#cbd5e1", fg: "#fef08a" },
  ara: { label: "🤭 MBAK ARA", bg: SPEAKER_COLORS.ara, border: "#f5d0fe", fg: "#ffffff" },
  bu_tini: { label: "🩴 BU TINI", bg: SPEAKER_COLORS.bu_tini, border: "#fde047", fg: "#ffffff" },
};

export const RaziaCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cues = timing.captions as Array<{ text: string; speaker?: string; startFrame: number; endFrame: number; highlight: boolean }>;
  const cue = cues.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const sp = spring({ frame: frame - cue.startFrame, fps, config: { damping: 12, stiffness: 260 } });
  const txt = cue.text.toLowerCase();
  const size = Math.min(86, 740 / (Math.max(4, txt.length) * 0.52));
  const badge = cue.speaker ? SPEAKER_META[cue.speaker] : undefined;

  return (
    <div style={{ position: "absolute", top: 1340, left: 60, right: 60, textAlign: "center", pointerEvents: "none" }}>
      {badge && (
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 22px",
              borderRadius: 999,
              background: badge.bg,
              border: `4px solid ${badge.border}`,
              fontFamily: FONT_BODY,
              fontWeight: 900,
              fontSize: 30,
              letterSpacing: 1.2,
              color: badge.fg,
              boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
            }}
          >
            {badge.label}
          </span>
        </div>
      )}
      <div>
        <span
          style={{
            display: "inline-block",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.1,
            color: cue.highlight ? "#facc15" : "#ffffff",
            WebkitTextStroke: "6px rgba(24,12,8,0.96)",
            paintOrder: "stroke fill",
            textShadow: "0 8px 0 rgba(24,12,8,0.75)",
            transform: `scale(${0.72 + 0.28 * sp})`,
            opacity: Math.min(1, sp * 1.6),
          }}
        >
          {txt}
        </span>
      </div>
    </div>
  );
};

/* ================================================================== */
/* KINEMATICS HELPERS                                                 */
/* ================================================================== */
type Pose = {
  legL: [number, number];
  legR: [number, number];
  armL: [number, number];
  armR: [number, number];
  lean: number;
  bob: number;
  headTilt: number;
  squash: number;
  look: number;
};

const idlePose = (t: number, ph = 0): Pose => ({
  legL: [-4, 2],
  legR: [4, 2],
  armL: [-14 + Math.sin(t * 2.1 + ph) * 5, 16],
  armR: [14 - Math.sin(t * 2.1 + ph) * 5, 16],
  lean: Math.sin(t * 1.5 + ph) * 2,
  bob: Math.sin(t * 2.4 + ph) * 5,
  headTilt: Math.sin(t * 1.8 + ph) * 3,
  squash: Math.sin(t * 2.4 + ph) * 0.015,
  look: 0,
});

const walkPose = (t: number, speed = 7.5, amp = 1): Pose => {
  const s = Math.sin(t * speed);
  const c = Math.cos(t * speed);
  return {
    legL: [30 * s * amp, Math.max(0, -c) * 30 * amp],
    legR: [-30 * s * amp, Math.max(0, c) * 30 * amp],
    armL: [-24 * s * amp, 14],
    armR: [24 * s * amp, 14],
    lean: 6 * amp,
    bob: Math.abs(s) * 11 * amp,
    headTilt: s * 3 * amp,
    squash: (Math.abs(s) - 0.5) * 0.03 * amp,
    look: 0.2,
  };
};

const panicPose = (t: number, ph = 0): Pose => ({
  legL: [-12 + Math.sin(t * 16 + ph) * 8, 12],
  legR: [12 - Math.sin(t * 16 + ph) * 8, 12],
  armL: [-105 + Math.sin(t * 18 + ph) * 20, -25],
  armR: [105 - Math.sin(t * 18 + ph) * 20, 25],
  lean: -6 + Math.sin(t * 14) * 4,
  bob: Math.abs(Math.sin(t * 14 + ph)) * 12,
  headTilt: Math.sin(t * 14 + ph) * 8,
  squash: Math.sin(t * 14 + ph) * 0.04,
  look: Math.sin(t * 7) * 0.4,
});

const toBean = (base: BeanParams, p: Pose, t: number, seed: number, extra: Partial<BeanParams> = {}): BeanParams => ({
  ...base,
  legL: p.legL,
  legR: p.legR,
  armL: p.armL,
  armR: p.armR,
  lean: p.lean,
  bob: p.bob,
  headTilt: p.headTilt,
  squash: p.squash,
  look: p.look,
  footBend: true,
  blink: (t + seed * 1.13) % 3.6 > 3.46,
  ...extra,
});

/* ================================================================== */
/* SCENE 1: HOOK — ATURAN DILARANG HEWAN & SUAP IKAN TONGKOL KE OREN  */
/* ================================================================== */
const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("hook");
  const t = f / 30;
  const evDilarang = EV["hook.dilarang"] ?? 30;
  const evTongkol = EV["hook.tongkol"] ?? 125;
  const evSsst = EV["hook.ssst"] ?? 230;

  // Camera starts looking at the red "DILARANG PELIHARA HEWAN!" sign -> pans down to Riko feeding Oren!
  const cam = evalCam(f, [
    { kind: "linear", to: evDilarang + 48, p0: [0.95, 2.2, 0.1], p1: [0.95, 2.2, -0.45], l0: [1.0, 2.2, -2.18], l1: [1.0, 2.2, -2.18], fov0: 44, fov1: 38 },
    { kind: "linear", to: evTongkol + 35, p0: [0.95, 2.2, -0.45], p1: [0.15, 1.38, 3.65], l0: [1.0, 2.2, -2.18], l1: [-0.25, 0.78, -0.6], fov0: 38, fov1: 54 },
    { kind: "orbit", to: dur, target0: [-0.25, 0.65, -0.2], target1: [-0.2, 0.55, 0.0], ang0: 0.14, ang1: -0.22, rad0: 3.4, rad1: 2.95, y0: 1.32, y1: 1.05, fov0: 54, fov1: 50 },
  ]);

  const signShake = f >= evDilarang && f < evDilarang + 40 ? (f - evDilarang) / 30 : 0;
  // Riko carries plate from right -> sets it cleanly on floor at [-0.12, 0, 0.35] for Oren!
  const setK = smoothStep(f, evTongkol - 20, 40);
  const rikoPos: Vec3 = [-0.78, 0, 0.05];
  const rikoMouth = talkMouth(f, ["h2"]);
  const rikoPose: Pose =
    f < evTongkol + 20
      ? {
          ...idlePose(t, 1),
          lean: lerpN(12, 22, setK),
          armR: [lerpN(65, 42, setK), lerpN(25, 15, setK)],
          armL: [-22, 18],
          bob: lerpN(4, -18, setK),
          look: 0.4,
        }
      : {
          ...idlePose(t, 1),
          lean: 14,
          armR: [122, 30], // jari telunjuk "ssst!"
          armL: [-18, 22],
          bob: -10 + Math.sin(t * 3) * 4,
          look: 0.3,
        };
  const rikoExpr: BeanExpr = f >= evSsst ? "worried" : "smug";
  const rikoP = toBean(RIKO_RAZIA, rikoPose, t, 1, { expr: rikoExpr, mouthOpen: rikoMouth, sweat: f >= evSsst + 30 });
  const rHand = beanHandWorld(rikoP, "R", rikoPos, 1.94, cam.pos, false);

  // Plate transfers smoothly from Riko's hand to floor in front of Oren!
  const plateFloor: Vec3 = [0.02, 0.01, 0.35];
  const platePos = lerpV([rHand[0] + 0.08, rHand[1] - 0.04, rHand[2] + 0.1], plateFloor, setK);
  const eating = f >= evTongkol + 24;
  const orenChew = eating ? 1 : 0;

  // Nadia cameo peeking smoothly from bottom-left corner while narrating h1!
  const nadiaMouth = talkMouth(f, ["h1"]);
  const nadiaShow = inLine(f, "h1", 8);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evDilarang], 0.07)}>
        <KamarKosRiko t={t} signShake={signShake} sun={1.2} hideFront={cam.pos[2] > 2.2} />
        <BeanCard position={rikoPos} height={1.94} params={rikoP} />
        <IkanTongkol3D pos={platePos} scale={1.08} eaten={eating ? cl((f - (evTongkol + 24)) / 140, 0, 0.65) : 0} t={t} steam />
        <OrenHero3D
          pos={[0.45, 0.01, 0.38]}
          rot={[0, -1.25, 0]}
          scale={1.32}
          t={t}
          pose={eating ? "loaf" : "sit"}
          chew={orenChew}
          sparkle={eating ? 0.25 : 0.45}
          tailAmp={eating ? 0.6 : 0.4}
          look={eating ? [0, 0.35] : [-0.3, -0.1]}
        />
        {nadiaShow && (
          <BeanCard
            position={[cam.pos[0] - 0.85, 0, cam.pos[2] - 2.35]}
            height={0.0001}
            params={NADIA}
          />
        )}
      </Stage>
      <Grade warm={0.35} spy={0.18} />
      <Tag label="🏠 KOS BU TINI · KAMAR 01 · 16:45 WIB" to={dur - 10} color="#fb923c" />
      <Chip from={2} to={evDilarang + 44} top={215} color="#dc2626">
        🚫 RAZIA KUCING OREN!
      </Chip>
      {nadiaShow && (
        <div
          style={{
            position: "absolute",
            top: 220,
            right: 42,
            background: "rgba(14,165,233,0.94)",
            border: "5px solid #ffffff",
            borderRadius: 22,
            padding: "8px 18px",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 28,
            color: "#ffffff",
            transform: `scale(${1 + nadiaMouth * 0.06})`,
            boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
          }}
        >
          🎙️ HAI WAK!
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 2: ALARM RAZIA — KORIDOR BAYANGAN SAPU -> RIKO PANIK DI KAMAR */
/* ================================================================== */
const SceneAlarm: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("alarm");
  const t = f / 30;
  const evGawat = EV["alarm.gawat"] ?? Math.round(dur * 0.54);
  const inRoom = f >= evGawat - 4;

  // Part A: Corridor tracking Bu Tini marching with broom + giant shadow on wall!
  // Part B: Cut inside room -> Riko jumps in panic pointing at the door!
  const camCorridor = evalCam(f, [
    { kind: "linear", to: evGawat, p0: [3.65, 1.48, 3.8], p1: [3.55, 1.42, 2.55], l0: [2.85, 1.25, -1.2], l1: [2.75, 1.32, 0.2], fov0: 54, fov1: 48, roll0: -1.5, roll1: 1.5 },
  ]);
  const camRoom = evalCam(Math.max(0, f - (evGawat - 4)), [
    { kind: "linear", to: dur - evGawat + 6, p0: [-0.1, 1.38, 3.55], p1: [0.25, 1.45, 3.1], l0: [0.3, 1.05, 0.1], l1: [0.65, 1.12, 0.4], fov0: 55, fov1: 48, roll0: 2.5, roll1: -2.0 },
  ]);

  const cam = inRoom ? camRoom : camCorridor;
  const marchK = cl(f / Math.max(1, evGawat));
  const tiniZ = lerpN(-2.1, 0.55, marchK);
  const tiniPos: Vec3 = [3.12, 0, tiniZ];
  const tiniMouth = talkMouth(f, ["a1"]);
  const tiniWalk = walkPose(t, 8.2, 1.05);
  const tiniP = toBean(BU_TINI_RAZIA, { ...tiniWalk, armR: [125 + Math.sin(t * 8) * 14, 22], armL: [-34, 28], lean: 10 }, t, 2, {
    expr: "angry",
    mouthOpen: tiniMouth,
  });
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, 2.02, cam.pos, true);

  const rikoMouth = talkMouth(f, ["a2"]);
  const rikoPos: Vec3 = [-0.55, 0, 0.15];
  const rikoP = toBean(RIKO_RAZIA, panicPose(t, 1), t, 1, { expr: "shock", sweat: true, mouthOpen: rikoMouth });
  const bagasPos: Vec3 = [-1.45, 0, -0.55];
  const bagasP = toBean(BAGAS_RAZIA, { ...idlePose(t, 3), armR: [42, 34] }, t, 3, { expr: "neutral" });

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [8, 22, 36, evGawat], 0.10)}>
        {!inRoom ? (
          <>
            <KoridorLantai2 t={t} noticeGlow={1} />
            <hemisphereLight args={["#fff1d6", "#b08968", 1.25]} />
            <directionalLight position={[9, 6, 3]} intensity={1.45} color="#ffd59a" />
            <BeanCard position={tiniPos} height={2.02} params={tiniP} flip />
            <SapuIjuk3D pos={[tiniHand[0] - 0.1, tiniHand[1] + 0.12, tiniHand[2] + 0.08]} rot={[0.15, 0.3, -0.55 + Math.sin(t * 8) * 0.12]} scale={1.08} />
            {/* Bayangan sapu Bu Tini membesar dramatis di dinding koridor! */}
            <BayanganSapu3D pos={[2.38, 1.28, tiniZ + 0.95]} rot={[0, Math.PI / 2, 0]} scale={0.9 + marchK * 0.55} opacity={0.48 + marchK * 0.2} />
          </>
        ) : (
          <>
            <KamarKosRiko t={t} sun={1.15} hideFront />
            <BeanCard position={rikoPos} height={1.96} params={rikoP} />
            <BeanCard position={bagasPos} height={1.94} params={bagasP} />
            <OrenHero3D pos={[0.58, 0.01, 0.35]} rot={[0, -0.6, 0]} scale={1.32} t={t} pose="sit" sparkle={0.35} tailAmp={0.75} look={[0.4, -0.2]} />
            <IkanTongkol3D pos={[0.25, 0.01, 0.72]} scale={1.0} eaten={0.5} t={t} steam />
          </>
        )}
      </Stage>
      <Grade warm={0.22} spy={0.32} flash={f >= evGawat - 4 && f <= evGawat ? 0.35 : 0} flashCol="#fee2e2" />
      <Tag label={inRoom ? "🚨 KAMAR 01 · PANIK TOTAL!" : "📢 KORIDOR LANTAI 2 · RAZIA!"} to={dur - 8} color="#ef4444" />
      <Stamp text="🚨 RAZIA MENDADAK!" from={10} to={evGawat - 6} color="#dc2626" top={215} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: OPERASI PENYAMARAN — WHIP-PAN LEMARI -> EMBER -> BANTAL!  */
/* ================================================================== */
const SceneNyamar: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("nyamar");
  const t = f / 30;
  const evLemari = EV["nyamar.lemari"] ?? 10;
  const evEmber = EV["nyamar.ember"] ?? 62;
  const evJenius = EV["nyamar.jenius"] ?? 160;
  const evBantal = EV["nyamar.bantal"] ?? 215;

  // Whip-pan: Wardrobe -> Blue Bucket -> Bed ("Bantal Bulu"!)
  const cam = evalCam(f, [
    { kind: "linear", to: evEmber - 8, p0: [0.35, 1.38, 1.75], p1: [0.15, 1.32, 1.35], l0: [-1.85, 1.08, 0.1], l1: [-1.95, 1.05, 0.1], fov0: 54, fov1: 50 },
    { kind: "linear", to: evEmber + 6, p0: [0.15, 1.32, 1.35], p1: [0.05, 1.15, 3.25], l0: [-1.95, 1.05, 0.1], l1: [1.15, 0.55, 1.25], fov0: 50, fov1: 54, roll0: -3, roll1: 3 },
    { kind: "linear", to: evJenius - 10, p0: [0.05, 1.15, 3.25], p1: [0.1, 1.08, 2.95], l0: [1.15, 0.55, 1.25], l1: [1.05, 0.5, 1.25], fov0: 54, fov1: 48, roll0: 3, roll1: 0 },
    { kind: "linear", to: dur, p0: [0.1, 1.35, 3.6], p1: [-0.25, 1.42, 1.55], l0: [-0.95, 0.85, -1.2], l1: [-1.2, 0.72, -1.55], fov0: 54, fov1: 46 },
  ]);

  // Wardrobe doors swing open then slam shut!
  const openLemari = f < evLemari + 24 ? smoothStep(f, evLemari, 14) : 1 - smoothStep(f, evLemari + 34, 10);
  const lemariShake = f >= evLemari + 42 && f <= evLemari + 54 ? (f - (evLemari + 42)) / 10 : 0;

  // Character blocking across 3 quick beats
  const phase = f < evEmber - 4 ? 0 : f < evJenius - 10 ? 1 : 2;
  const rikoPos: Vec3 = phase === 0 ? [-1.05, 0, 0.45] : phase === 1 ? [0.45, 0, 0.95] : [-0.15, 0, -0.55];
  const bagasPos: Vec3 = phase < 2 ? [0.45, 0, -0.45] : lerpV([0.35, 0, -0.45], [-0.58, 0, -0.78], smoothStep(f, evJenius - 8, 28));

  const rikoMouth = talkMouth(f, ["n1"]);
  const bagasMouth = talkMouth(f, ["n2"]);
  const rikoP = toBean(RIKO_RAZIA, panicPose(t, 2), t, 1, { expr: "scared", sweat: true, mouthOpen: rikoMouth });
  const bagasP = toBean(
    BAGAS_RAZIA,
    phase === 2 && f < evJenius + 22
      ? walkPose(t, 7.0, 0.85)
      : { ...idlePose(t, 4), armR: [f >= evJenius ? 115 : 40, 32], lean: 8 },
    t,
    3,
    { expr: f >= evJenius ? "smug" : "think", mouthOpen: bagasMouth },
  );

  // Oren moves with Riko/Bagas -> ends up disguised as "Bantal Bulu" on the bed!
  const isDisguised = f >= evBantal + 18;
  const orenPos: Vec3 =
    phase === 0 ? [-1.32, 0.01, 0.85] : phase === 1 ? [1.22, 0.01, 1.32] : [-1.25, 0.46, -1.58];

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evLemari + 42, evEmber + 4], 0.09)}>
        <KamarKosRiko t={t} lemariL={openLemari} lemariR={openLemari * 0.85} lemariShake={lemariShake} showPillow={!isDisguised} hideFront={cam.pos[2] > 2.2} />
        <BeanCard position={rikoPos} height={1.94} params={rikoP} flip={phase === 0} />
        <BeanCard position={bagasPos} height={1.94} params={bagasP} flip={phase === 2} />
        {/* Ember biru di pojok — terlalu kecil untuk Oren gembul! */}
        <Ember3D pos={[1.25, 0, 1.35]} scale={1.18} />
        <OrenHero3D
          pos={orenPos}
          rot={[0, phase === 2 ? 0.35 : -0.35, 0]}
          scale={phase === 2 ? 1.15 : 1.25}
          t={t}
          pose={isDisguised ? "loaf" : "sit"}
          disguise={isDisguised ? 1 : 0}
          tailAmp={isDisguised ? 0.25 : 0.65}
        />
      </Stage>
      <Grade warm={0.2} spy={0.3} />
      <Tag label="🕵️ OPERASI PENYAMARAN SI OREN" to={dur - 8} color="#f59e0b" />
      <PillowDisguiseInsert from={evBantal - 4} to={Math.min(dur - 8, evBantal + 48)} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 4: DOBRAK PINTU! — BAU IKAN TONGKOL vs "PARFUM PANTAI ANCOL" */
/* ================================================================== */
const SceneDobrak: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("dobrak");
  const t = f / 30;
  const evTongkol = EV["dobrak.tongkol"] ?? 65;
  const evParfum = EV["dobrak.parfum"] ?? 175;
  const evAncol = EV["dobrak.ancol"] ?? 220;

  const cam = evalCam(f, [
    { kind: "linear", to: 38, p0: [-0.2, 1.48, 3.65], p1: [0.2, 1.45, 3.35], l0: [1.35, 1.15, 0.6], l1: [0.55, 1.1, 0.3], fov0: 56, fov1: 52, roll0: -2.2, roll1: 0.8 },
    { kind: "orbit", to: dur, target0: [0.2, 1.05, 0.05], target1: [-0.1, 1.08, -0.25], ang0: 0.16, ang1: -0.2, rad0: 3.5, rad1: 3.35, y0: 1.45, y1: 1.42, fov0: 52, fov1: 50 },
  ]);

  // Door flies open at frame 2!
  const doorOpen = smoothStep(f, 1, 10) * 0.94;
  const doorBang = f < 22 ? f / 22 : 0;

  // Bu Tini storms through the door holding Sapu Ijuk, then leans sniffing toward the fish plate!
  const stepIn = smoothStep(f, 5, 26);
  const tiniPos: Vec3 = lerpV([2.15, 0, 0.82], [0.85, 0, 0.42], stepIn);
  const tiniMouth = talkMouth(f, ["d1"]);
  const tiniBasePose = stepIn < 0.98 ? walkPose(t, 9.0, 1.0) : { ...idlePose(t, 2), lean: 14, armR: [128, 18], armL: [-42, 40] };
  const tiniP = toBean(BU_TINI_RAZIA, tiniBasePose, t, 2, { expr: "angry", mouthOpen: tiniMouth });
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, 2.02, cam.pos, true);

  // Riko backs up nervously waving hands while making up "Parfum Pantai Ancol"!
  const rikoStep = smoothStep(f, 12, 24);
  const rikoPos: Vec3 = lerpV([-0.35, 0, 0.35], [-0.85, 0, 0.15], rikoStep);
  const rikoMouth = talkMouth(f, ["d2"]);
  const rikoPose: Pose =
    f >= evParfum - 6
      ? {
          ...idlePose(t, 1),
          armL: [-82 + Math.sin(t * 11) * 18, 28],
          armR: [88 - Math.sin(t * 11) * 18, 28],
          lean: -8,
          bob: Math.abs(Math.sin(t * 10)) * 8,
          headTilt: Math.sin(t * 9) * 7,
        }
      : panicPose(t, 1);
  const rikoP = toBean(RIKO_RAZIA, rikoPose, t, 1, { expr: f >= evParfum ? "worried" : "shock", sweat: true, mouthOpen: rikoMouth });

  const bagasPos: Vec3 = [-1.52, 0, -0.68];
  const bagasP = toBean(BAGAS_RAZIA, { ...idlePose(t, 3), armR: [35, 28] }, t, 3, { expr: "smug" });

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [3, 8], 0.16)}>
        <KamarKosRiko t={t} doorOpen={doorOpen} doorBang={doorBang} showPillow={false} hideFront={cam.pos[2] > 2.2} />
        <BeanCard position={tiniPos} height={2.02} params={tiniP} flip />
        <SapuIjuk3D pos={[tiniHand[0] - 0.12, tiniHand[1] + 0.16, tiniHand[2] + 0.08]} rot={[0.1, 0.25, -0.58]} scale={1.06} />
        <BeanCard position={rikoPos} height={1.96} params={rikoP} />
        <BeanCard position={bagasPos} height={1.94} params={bagasP} />
        {/* Oren tetap menyamar sebagai bantal bulu di kasur + selimut menutupi sebagian */}
        <OrenHero3D pos={[-1.25, 0.46, -1.58]} rot={[0, 0.35, 0]} scale={1.15} t={t} pose="loaf" disguise={1} tailAmp={0.18} />
        <Selimut3D pos={[-1.25, 0.46, -1.58]} pull={0.0} t={t} />
        {/* Piring ikan tongkol masih mengepul di lantai! */}
        <IkanTongkol3D pos={[0.05, 0.01, 0.68]} scale={1.08} eaten={0.55} t={t} steam />
      </Stage>
      <Grade warm={0.22} spy={0.3} flash={f >= 2 && f <= 6 ? 0.4 : 0} flashCol="#fff7ed" />
      <Tag label="💥 DOBRAK PINTU! BAU IKAN TONGKOL!" to={dur - 8} color="#dc2626" />
      {f >= evTongkol && f < evParfum && (
        <Chip from={evTongkol} to={evParfum - 2} top={215} color="#b91c1c">
          🐟 BAU IKAN TONGKOL?!
        </Chip>
      )}
      {f >= evAncol - 10 && (
        <Chip from={evAncol - 10} to={dur - 8} top={215} color="#0284c7">
          🏖️ "PARFUM PANTAI ANCOL"?! 😅
        </Chip>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: BOCOR GARA-GARA MBAK ARA — 160° REVERSE-ANGLE!            */
/* ================================================================== */
const SceneBocor: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("bocor");
  const t = f / 30;
  const evGerak = EV["bocor.gerak"] ?? 105;
  const evNgeong = EV["bocor.ngeong"] ?? 150;
  const evTamat = EV["bocor.tamat"] ?? 215;

  // 160° REVERSE-ANGLE from behind the bed looking toward the open door & Mbak Ara peeking in!
  // Front-wall props (dispenser/mirror) are visible naturally in the background!
  const cam = evalCam(f, [
    { kind: "linear", to: evNgeong, p0: [-1.85, 1.38, -1.85], p1: [-1.62, 1.32, -1.52], l0: [1.15, 1.12, 0.65], l1: [0.85, 1.05, 0.55], fov0: 56, fov1: 52 },
    { kind: "linear", to: dur, p0: [-1.62, 1.32, -1.52], p1: [-1.35, 1.25, -1.1], l0: [0.85, 1.05, 0.55], l1: [-0.25, 1.02, 0.35], fov0: 52, fov1: 50, roll0: 0, roll1: -2.0 },
  ]);

  // Mbak Ara leans cheerfully through the open door pointing right at the "bantal bulu"!
  const araPos: Vec3 = [1.82, 0, 0.85];
  const araMouth = talkMouth(f, ["b1"]);
  const araP = toBean(
    ARA,
    {
      ...idlePose(t, 5),
      lean: 14,
      armR: [108 + Math.sin(t * 5) * 10, 18],
      armL: [-28, 32],
      headTilt: 10,
      look: -0.4,
    },
    t,
    5,
    { expr: "happy", mouthOpen: araMouth },
  );

  // Bu Tini spins her glare from Riko straight toward the bed!
  const tiniPos: Vec3 = [0.75, 0, 0.45];
  const tiniP = toBean(BU_TINI_RAZIA, { ...idlePose(t, 2), armR: [125, 18], lean: 12 }, t, 2, {
    expr: f >= evGerak ? "shock" : "angry",
  });
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, 2.02, cam.pos, true);

  // Riko facepalms in absolute despair!
  const rikoPos: Vec3 = [-0.25, 0, 0.65];
  const rikoMouth = talkMouth(f, ["b2"]);
  const rikoPose: Pose =
    f >= evNgeong - 6
      ? { ...panicPose(t, 1), armR: [148, -42], armL: [-148, 42], lean: -10 }
      : { ...idlePose(t, 1), armR: [75, 35], armL: [-75, -35], lean: -4 };
  const rikoP = toBean(RIKO_RAZIA, rikoPose, t, 1, { expr: f >= evNgeong ? "scared" : "worried", sweat: true, mouthOpen: rikoMouth });

  // Oren pillow wiggles right when Ara mentions "gerak-gerak" & "ngeong"!
  const wiggle = f >= evGerak - 10 ? Math.sin(t * 16) * 0.08 : 0;

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evNgeong, evTamat], 0.11)}>
        <KamarKosRiko t={t} doorOpen={0.94} showPillow={false} />
        <BeanCard position={araPos} height={1.9} params={araP} flip />
        <BeanCard position={tiniPos} height={2.02} params={tiniP} flip />
        <SapuIjuk3D pos={[tiniHand[0] - 0.12, tiniHand[1] + 0.14, tiniHand[2] + 0.08]} rot={[0.1, 0.25, -0.58]} scale={1.06} />
        <BeanCard position={rikoPos} height={1.96} params={rikoP} />
        {/* Foreground disguised Oren pillow wiggling on bed corner! */}
        <OrenHero3D pos={[-1.12, 0.46, -1.25]} rot={[0, 0.9 + wiggle, wiggle * 0.6]} scale={1.12} t={t} pose="loaf" disguise={1} tailAmp={f >= evGerak ? 0.9 : 0.25} />
      </Stage>
      <Grade warm={0.22} spy={0.28} />
      <Tag label="🤭 160° REVERSE ANGLE · BOCOR!" to={dur - 8} color="#c026d3" />
      {f >= evGerak - 4 && f <= evTamat + 20 && (
        <Chip from={evGerak - 4} to={evTamat + 20} top={215} color="#c026d3">
          🐱 "MEOW~" DARI BANTAL?! 😱
        </Chip>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: PLOT TWIST MATA BERBINAR! SELIMUT -> VERTIGO ZOOM -> SCRATCH */
/* ================================================================== */
const SceneTwist: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("twist");
  const t = f / 30;
  const evTarik = EV["twist.tarik"] ?? 72;
  const evPullDone = EV["twist.pull_done"] ?? 108;
  const evMeow = EV["twist.meow"] ?? 120;
  const evScratch = EV["twist.scratch"] ?? 142;
  const evLuluh = EV["twist.luluh"] ?? 155;

  // 1. Wide shot Bu Tini marching to bed & yanking blanket off
  // 2. DRAMATIC VERTIGO ZOOM straight into Oren's sparkling Puss-in-Boots eyes!
  // 3. HARD RECORD SCRATCH -> cut back to Bu Tini dropping her broom & melting!
  const cam = evalCam(f, [
    { kind: "linear", to: evPullDone, p0: [0.35, 1.42, 1.65], p1: [-0.25, 1.25, 0.85], l0: [-1.15, 0.85, -1.4], l1: [-1.22, 0.82, -1.55], fov0: 54, fov1: 48 },
    // Vertigo Zoom: dolly-in + telephoto FOV squeeze right into Oren's starry eyes!
    { kind: "linear", to: evScratch + 2, p0: [-0.75, 1.12, -0.35], p1: [-1.08, 1.04, -0.82], l0: [-1.22, 0.92, -1.58], l1: [-1.22, 0.96, -1.58], fov0: 56, fov1: 28, roll0: 0, roll1: -4.5 },
    // Pull back to reveal Bu Tini completely melted in pastel golden glow!
    { kind: "orbit", to: dur, target0: [-0.75, 1.05, -1.2], target1: [-0.75, 1.08, -1.15], ang0: 0.45, ang1: -0.18, rad0: 2.35, rad1: 2.6, y0: 1.38, y1: 1.45, fov0: 50, fov1: 52, roll0: 0, roll1: 0 },
  ]);

  const pullK = smoothStep(f, evTarik, 28);
  const sparkleK = smoothStep(f, evPullDone - 2, 16);
  const meowK = f >= evMeow - 2 && f <= evScratch + 6 ? Math.sin(cl((f - (evMeow - 2)) / 24) * Math.PI) : 0;
  const melted = f >= evScratch;
  const cozyK = smoothStep(f, evScratch, 22);

  // Bu Tini steps to bed, pulls blanket, then drops broom & melts!
  const tiniStep = smoothStep(f, 0, 32);
  const tiniPos: Vec3 = lerpV([0.45, 0, -0.25], [-0.32, 0, -1.05], tiniStep);
  const tiniMouth = talkMouth(f, ["t1", "t2"]);
  const tiniPose: Pose = melted
    ? {
        ...idlePose(t, 2),
        lean: 16,
        armL: [-62, 58], // kedua tangan gemes di pipi/depan!
        armR: [62, 58],
        bob: 6 + Math.sin(t * 5) * 6,
        headTilt: Math.sin(t * 4) * 10,
      }
    : {
        ...idlePose(t, 2),
        lean: 14,
        armL: [lerpN(-30, -95, pullK), lerpN(20, 10, pullK)],
        armR: [122, 22],
      };
  const tiniP = toBean(BU_TINI_RAZIA, tiniPose, t, 2, {
    expr: melted ? "laugh" : "angry",
    mouthOpen: tiniMouth,
  });
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, 2.02, cam.pos, true);

  // Broom drops physically from Bu Tini's hand onto the floor right after Record Scratch!
  const dropK = smoothStep(f, evScratch + 2, 14);
  const broomPos = lerpV([tiniHand[0] - 0.1, tiniHand[1] + 0.14, tiniHand[2] + 0.08], [0.15, 0.07, -0.75], dropK);
  const broomRot: Vec3 = [lerpN(0.1, Math.PI / 2, dropK), lerpN(0.25, 0.6, dropK), lerpN(-0.55, 0.85, dropK)];

  const rikoPos: Vec3 = [0.78, 0, 0.25];
  const rikoP = toBean(RIKO_RAZIA, { ...idlePose(t, 1), armL: [-55, 42], armR: [55, 42] }, t, 1, { expr: melted ? "shock" : "scared", sweat: true });

  const scratchFlash = f >= evScratch - 1 && f <= evScratch + 5 ? (1 - (f - (evScratch - 1)) / 6) * 0.85 : 0;

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evTarik, evScratch], 0.15)}>
        <KamarKosRiko t={t} cozy={cozyK} sun={1.15 + cozyK * 0.35} showPillow={false} doorOpen={0.94} hideFront={cam.pos[2] > 2.2} />
        <BeanCard position={tiniPos} height={2.02} params={tiniP} flip />
        <SapuIjuk3D pos={broomPos} rot={broomRot} scale={1.04} />
        <BeanCard position={rikoPos} height={1.96} params={rikoP} flip />
        {/* Hero Oren: blanket ripped off -> giant starry Puss-in-Boots eyes! */}
        <OrenHero3D
          pos={[-1.22, 0.46, -1.58]}
          rot={[0, 0.42, 0]}
          scale={1.25}
          t={t}
          pose={pullK > 0.35 ? "sit" : "loaf"}
          disguise={pullK > 0.35 ? 0 : 1}
          sparkle={sparkleK}
          meow={meowK}
          tailAmp={0.22}
        />
        {pullK < 0.98 && <Selimut3D pos={[-1.22, 0.46, -1.58]} pull={pullK} t={t} />}
      </Stage>
      <Grade warm={0.25} pastel={cozyK} spy={0.3 * (1 - cozyK)} flash={scratchFlash} flashCol="#fef9c3" />
      <Tag label={melted ? "✨ PLOT TWIST! BU TINI LULUH TOTAL!" : "😱 KETANGKAP BASAH!"} to={dur - 8} color={melted ? "#f59e0b" : "#dc2626"} />
      {f >= evMeow - 4 && f <= evScratch + 4 && (
        <Chip from={evMeow - 4} to={evScratch + 4} top={215} color="#f97316">
          ✨ MEEEOOW~ 🥺🐱 ✨
        </Chip>
      )}
      {f >= evScratch && f <= evScratch + 28 && (
        <Stamp text="💿 RECORD SCRATCH!" from={evScratch} to={evScratch + 28} color="#f59e0b" top={330} />
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 7: REBUTAN NGELUS — PASTEL GOLDEN 360° ORBIT + BEBEK!        */
/* ================================================================== */
const SceneRebutan: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("rebutan");
  const t = f / 30;
  const evKeluar = EV["rebutan.keluar"] ?? 125;
  const evDiusir = EV["rebutan.diusir"] ?? 210;
  const evBebek = EV["rebutan.bebek"] ?? 310;

  // Full 360° warm golden pastel orbit INSIDE the room (radius 2.05m so all 4 walls & furniture glide around!)
  const cam = evalCam(f, [
    { kind: "orbit", to: evDiusir + 20, target0: [0.05, 1.05, 0.05], target1: [0.25, 1.08, 0.25], ang0: -0.25, ang1: Math.PI * 1.45, rad0: 2.15, rad1: 2.05, y0: 1.42, y1: 1.52, fov0: 58, fov1: 56 },
    { kind: "orbit", to: dur, target0: [0.25, 1.08, 0.25], target1: [0.55, 1.12, 0.45], ang0: Math.PI * 1.45, ang1: Math.PI * 2.15, rad0: 2.05, rad1: 2.25, y0: 1.52, y1: 1.48, fov0: 56, fov1: 54 },
  ]);

  // Bu Tini scoops Oren into her arms (15f hand transfer) + holds Besek Pindang!
  const scoopK = smoothStep(f, 4, 18);
  const tiniPos: Vec3 = lerpV([-0.35, 0, -0.55], [0.15, 0, 0.15], smoothStep(f, 0, 60));
  const tiniMouth = talkMouth(f, ["r1"]);
  const tiniP = toBean(
    BU_TINI_RAZIA,
    {
      ...idlePose(t, 2),
      armL: [-68, 52],
      armR: [f >= evKeluar - 8 && f < evDiusir ? 105 + Math.sin(t * 10) * 16 : 64, 46],
      lean: 6,
      bob: Math.sin(t * 4.5) * 8,
    },
    t,
    2,
    { expr: "laugh", mouthOpen: tiniMouth },
  );
  const tiniL = beanHandWorld(tiniP, "L", tiniPos, 2.02, cam.pos, false);
  const tiniR = beanHandWorld(tiniP, "R", tiniPos, 2.02, cam.pos, false);

  // Oren physically transfers from bed into Bu Tini's cuddling arms (pose="held", purr=1)!
  const orenHeldPos = lerpV(SPOT.bedCenter, [tiniL[0] + 0.08, tiniL[1] - 0.18, tiniL[2] + 0.12], scoopK);

  // Riko & Bagas get shooed toward the door looking totally bewildered!
  const kickOutK = smoothStep(f, evKeluar, 65);
  const rikoPos = lerpV([-0.85, 0, 0.35], [1.45, 0, 0.95], kickOutK);
  const bagasPos = lerpV([-1.35, 0, -0.25], [1.18, 0, 1.38], kickOutK);
  const bagasMouth = talkMouth(f, ["r2"]);
  const rikoP = toBean(RIKO_RAZIA, kickOutK > 0.05 && kickOutK < 0.95 ? walkPose(t, 7.5, 0.85) : idlePose(t, 1), t, 1, { expr: "shock", sweat: true });
  const bagasP = toBean(BAGAS_RAZIA, kickOutK > 0.05 && kickOutK < 0.95 ? walkPose(t, 7.0, 0.85) : { ...idlePose(t, 3), armL: [-78, 30], armR: [78, 30] }, t, 3, {
    expr: "worried",
    mouthOpen: bagasMouth,
  });

  // Mbak Ara eagerly raises her hand asking if she can keep a duck!
  const araPos: Vec3 = [1.55, 0, 0.08];
  const araMouth = talkMouth(f, ["r3"]);
  const araP = toBean(
    ARA,
    {
      ...idlePose(t, 5),
      armR: [f >= evBebek - 40 ? 155 + Math.sin(t * 7) * 8 : 55, 16],
      bob: f >= evBebek - 40 ? Math.abs(Math.sin(t * 6)) * 10 : 4,
    },
    t,
    5,
    { expr: "happy", mouthOpen: araMouth },
  );

  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <KamarKosRiko t={t} cozy={1} sun={1.4} doorOpen={0.96} showPillow={false} />
        <BeanCard position={tiniPos} height={2.02} params={tiniP} />
        <OrenHero3D pos={orenHeldPos} rot={[0, Math.atan2(cam.pos[0] - orenHeldPos[0], cam.pos[2] - orenHeldPos[2]), 0]} scale={1.15} t={t} pose="held" purr={1} tailAmp={0.45} />
        <BesekPindang3D pos={[tiniR[0] + 0.06, tiniR[1] - 0.06, tiniR[2] + 0.1]} rot={[0.1, -0.4, 0]} scale={0.95} lid={1} />
        <BeanCard position={rikoPos} height={1.96} params={rikoP} flip />
        <BeanCard position={bagasPos} height={1.94} params={bagasP} flip />
        <BeanCard position={araPos} height={1.9} params={araP} flip />
        <SapuIjuk3D pos={[-0.65, 0.07, -0.75]} rot={[Math.PI / 2, 0.5, 0.9]} scale={0.95} />
      </Stage>
      <Grade warm={0.35} pastel={0.85} />
      <Tag label="💛 REBUTAN NGELUS · ORBIT 360°!" to={dur - 8} color="#f59e0b" />
      {f >= evBebek - 16 && (
        <Chip from={evBebek - 16} to={dur - 6} top={215} color="#c026d3">
          🦆 "BOLEH PELIHARA BEBEK?!" 😂
        </Chip>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 8: ENDING — PIXAR CRANE-UP + KARTU VOTING KOMEN!             */
/* ================================================================== */
const SceneEnding: React.FC = () => {
  const f = useCurrentFrame();
  const dur = DUR_RAZIA("ending");
  const t = f / 30;
  const evBoleh = EV["ending.boleh"] ?? 72;

  // Pixar Crane-Up smoothly soaring above the dollhouse ceiling (ceiling FrontSide auto-culls from above!)
  const cam = evalCam(f, [
    { kind: "orbit", to: dur, target0: [0.5, 1.0, 0.2], target1: [0.85, 0.85, 0.4], ang0: 0.25, ang1: 0.72, rad0: 3.4, rad1: 5.4, y0: 1.75, y1: 4.55, fov0: 54, fov1: 48 },
  ]);

  const wave = (ph: number): Pose => {
    const w = Math.sin(t * 7.5 + ph);
    return { ...idlePose(t, ph), armL: [-28, 38], armR: [118 + w * 18, 22], bob: Math.abs(w) * 9, headTilt: w * 6 };
  };

  const tiniP = toBean(BU_TINI_RAZIA, { ...idlePose(t, 2), armL: [-52, 48], armR: [58, 42], lean: 12 }, t, 2, { expr: "laugh" });
  const rikoP = toBean(RIKO_RAZIA, { ...idlePose(t, 1), armL: [-42, 32], armR: [42, 32] }, t, 1, { expr: "shock", sweat: true });
  const bagasP = toBean(BAGAS_RAZIA, wave(1.4), t, 3, { expr: "happy" });
  const araP = toBean(ARA, wave(2.8), t, 5, { expr: "happy" });

  const ctaFrom = Math.max(18, evBoleh - 16);
  const ctaS = spring({ frame: Math.max(0, f - ctaFrom), fps: 30, config: { damping: 11, stiffness: 200 } });

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#3b1d0c">
        <KamarKosRiko t={t} cozy={1} sun={1.45} doorOpen={0.96} showPillow={false} hideFront />
        <KoridorLantai2 t={t} noticeGlow={0} />
        {/* Bu Tini happily spoiling Oren with pindang inside */}
        <BeanCard position={[-0.35, 0, -0.15]} height={2.02} params={tiniP} />
        <OrenHero3D pos={[0.25, 0.01, 0.15]} rot={[0, -0.45, 0]} scale={1.32} t={t} pose="loaf" purr={1} chew={0.7} tailAmp={0.55} />
        <BesekPindang3D pos={[0.62, 0.01, 0.22]} rot={[0, -0.5, 0]} scale={1.08} lid={1} />
        {/* Riko & Bagas kicked out into Koridor Lantai 2, Ara waving happily! */}
        <BeanCard position={[2.88, 0, 0.65]} height={1.96} params={rikoP} flip />
        <BeanCard position={[3.22, 0, 1.55]} height={1.94} params={bagasP} flip />
        <BeanCard position={[1.45, 0, -0.35]} height={1.9} params={araP} flip />
      </Stage>
      <Grade warm={0.35} pastel={0.65} />

      {/* Kartu Voting Komentar Viral */}
      {f >= ctaFrom && (
        <div
          style={{
            position: "absolute",
            top: 138,
            left: 44,
            right: 44,
            textAlign: "center",
            transform: `scale(${0.68 + 0.32 * ctaS})`,
            opacity: Math.min(1, ctaS * 1.5),
          }}
        >
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <div
              style={{
                flex: 1,
                background: "rgba(234,88,12,0.96)",
                border: "6px solid #ffffff",
                borderRadius: 24,
                padding: "16px 12px",
                fontFamily: FONT_HEAD,
                fontSize: 38,
                lineHeight: 1.08,
                color: "#ffffff",
                boxShadow: "0 14px 30px rgba(0,0,0,0.44)",
              }}
            >
              BOLEH PELIHARA KUCING 🐱
            </div>
            <div
              style={{
                flex: 1,
                background: "rgba(185,28,28,0.96)",
                border: "6px solid #ffffff",
                borderRadius: 24,
                padding: "16px 12px",
                fontFamily: FONT_HEAD,
                fontSize: 38,
                lineHeight: 1.08,
                color: "#ffffff",
                boxShadow: "0 14px 30px rgba(0,0,0,0.44)",
              }}
            >
              DILARANG KERAS 🚫
            </div>
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 16,
              background: "#1c120c",
              border: "5px solid #facc15",
              borderRadius: 20,
              padding: "10px 26px",
              fontFamily: FONT_BODY,
              fontWeight: 900,
              fontSize: 30,
              color: "#fef08a",
              boxShadow: "0 10px 24px rgba(0,0,0,0.44)",
            }}
          >
            TIM MANA KAMU WAK? VOTE DI KOMEN! 👇
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const RAZIA_SCENES: Record<RaziaScene, React.FC> = {
  hook: SceneHook,
  alarm: SceneAlarm,
  nyamar: SceneNyamar,
  dobrak: SceneDobrak,
  bocor: SceneBocor,
  twist: SceneTwist,
  rebutan: SceneRebutan,
  ending: SceneEnding,
};

export const DissolveRazia: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= 8 ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / 8);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

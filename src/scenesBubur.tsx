import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./bubur_timing.json";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import {
  BuburBowl3D,
  BukuBon3D,
  ClashAura3D,
  Kerupuk3D,
  KosanMorningStreet,
  LightningBolt3D,
  Spoon3D,
} from "./three/objectsBubur";
import { BAGAS_BUBUR, BANG_UDIN, BU_TINI, DEDI, NISA, RIKO_BUBUR } from "./SheetBubur";

export type BuburScene = "hook" | "rapi" | "aduk" | "kubu" | "duel" | "udin" | "bon" | "ending";
export const BUBUR_ORDER = timing.order as BuburScene[];
export const DUR_BUBUR = (k: BuburScene): number => timing.scenes[k].durationInFrames;
export const TOTAL_FRAMES_BUBUR = timing.totalFrames;

const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];

/* Exact world coordinates sitting cleanly on WarungTableSet3D (pos=[-1.05,0.16,-0.35], rotY=0.08, tabletop y=1.045) */
const RIKO_BOWL_POS: Vec3 = [-1.76, 1.045, -0.17];
const BAGAS_BOWL_POS: Vec3 = [-0.46, 1.045, -0.24];

/* ================================================================== */
/* TRUE 3D CINEMATIC CAMERA ENGINE (ORBIT + CRANE + DUTCH TILT)       */
/* ================================================================== */
type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };

type OrbitSeg = {
  kind: "orbit";
  to: number;
  target0: Vec3;
  target1?: Vec3;
  ang0: number; // radians around Y (0 = +Z front, + = right, - = left)
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
      const fov0 = s.fov0 ?? 38;
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
  return { pos: [0, 2.2, 8], look: [0, 1.5, -1], fov: 38, roll: 0 };
};

const kick = (f: number, hits: number[], amp = 0.16): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 14) {
      const a = (1 - d / 14) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 3 ? 1 : -1) * a * 0.72;
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

const Stage: React.FC<{ cam: Cam; shake?: Vec3; bg?: string; fog?: [string, number, number]; children: React.ReactNode }> = ({
  cam,
  shake,
  bg = "#93d5f8",
  fog,
  children,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.08, far: 180, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <color attach="background" args={[bg]} />
        {fog && <fog attach="fog" args={fog} />}
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* Clean Cinematic Color Grade WITHOUT SwANGLE-buggy backdropFilter blur */
const Grade: React.FC<{ warm?: number; cool?: number; flash?: number; flashCol?: string }> = ({
  warm = 0,
  cool = 0,
  flash = 0,
  flashCol = "#fef9c3",
}) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: warm > 0 ? `rgba(255,165,65,${0.32 * warm})` : `rgba(56,120,240,${0.30 * cool})`,
        }}
      />
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 44%, rgba(0,0,0,0) 56%, rgba(16,12,26,0.38) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(16,10,22,0) 70%, rgba(16,10,22,0.42) 88%, rgba(16,10,22,0.65) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: flashCol, opacity: flash }} />}
  </>
);

const Tag: React.FC<{ label: string; from?: number; to: number; color?: string; top?: number }> = ({
  label,
  from = 0,
  to,
  color = "#facc15",
  top = 152,
}) => {
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
        left: 58,
        padding: "10px 24px",
        borderRadius: 16,
        background: "rgba(24,14,28,0.9)",
        border: `3px solid ${color}`,
        fontFamily: FONT_BODY,
        fontWeight: 800,
        fontSize: 32,
        letterSpacing: 1.4,
        color: "white",
        opacity: s * out,
        transform: `translateX(${(1 - s) * -80}px)`,
      }}
    >
      {label}
    </div>
  );
};

const Chip: React.FC<{ from: number; to: number; top: number; children: React.ReactNode; color?: string }> = ({
  from,
  to,
  top,
  children,
  color = "#dc2626",
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 210 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top,
        textAlign: "center",
        transform: `scale(${0.6 + 0.4 * s})`,
        opacity: Math.min(1, s * 1.5) * o,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "rgba(255,250,235,0.97)",
          border: `7px solid ${color}`,
          borderRadius: 28,
          padding: "13px 30px",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 60,
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

const Bubble: React.FC<{ x: number; y: number; w?: number; text: string; size?: number; from: number; to: number }> = ({
  x,
  y,
  w = 540,
  text,
  size = 40,
  from,
  to,
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 220 } });
  const o = interpolate(f, [to - 6, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y,
        width: w,
        textAlign: "center",
        transform: `scale(${0.6 + 0.4 * s})`,
        opacity: Math.min(1, s * 1.5) * o,
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "7px solid #241726",
          borderRadius: 32,
          padding: "12px 22px",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: size,
          color: "#241726",
          boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Stamp: React.FC<{ text: string; from: number; to: number; color?: string; top?: number }> = ({
  text,
  from,
  to,
  color = "#dc2626",
  top = 310,
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 9, stiffness: 260 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 60,
        right: 60,
        textAlign: "center",
        transform: `rotate(-4deg) scale(${1.48 - 0.48 * s})`,
        opacity: Math.min(1, s * 2) * o,
      }}
    >
      <div
        style={{
          display: "inline-block",
          border: `10px solid ${color}`,
          borderRadius: 20,
          padding: "14px 32px",
          background: "rgba(255,248,235,0.96)",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 60,
          color,
          letterSpacing: 2,
          boxShadow: "0 16px 40px rgba(0,0,0,0.42)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const BuburCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cue = timing.captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const sp = spring({ frame: frame - cue.startFrame, fps, config: { damping: 12, stiffness: 260 } });
  const txt = cue.text.toLowerCase();
  const size = Math.min(86, 740 / (Math.max(4, txt.length) * 0.52));
  return (
    <div style={{ position: "absolute", top: 1380, left: 68, right: 68, textAlign: "center", pointerEvents: "none" }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: FONT_BODY,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.1,
          color: cue.highlight ? "#facc15" : "#ffffff",
          WebkitTextStroke: "6px rgba(24,10,28,0.96)",
          paintOrder: "stroke fill",
          textShadow: "0 8px 0 rgba(24,10,28,0.72)",
          transform: `scale(${0.72 + 0.28 * sp})`,
          opacity: Math.min(1, sp * 1.6),
        }}
      >
        {txt}
      </span>
    </div>
  );
};

/* ================================================================== */
/* FLUID CHARACTER KINEMATICS ENGINE v2 (NO SNAPS, DISTANCE-LOCKED)   */
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

const smoothStep = (f: number, from: number, dur: number) => smoother(cl((f - from) / Math.max(1, dur)));
const pulseBell = (f: number, start: number, peak: number, end: number) => {
  if (f <= start || f >= end) return 0;
  return f < peak ? smoother((f - start) / Math.max(1, peak - start)) : 1 - smoother((f - peak) / Math.max(1, end - peak));
};
const travelVel = (f: number, fn: (ff: number) => number) => Math.abs(fn(f + 0.5) - fn(f - 0.5));
const lerp2 = (a: [number, number], b: [number, number], k: number): [number, number] => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k)];
const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  const w = cl(k);
  return {
    legL: lerp2(a.legL, b.legL, w),
    legR: lerp2(a.legR, b.legR, w),
    armL: lerp2(a.armL, b.armL, w),
    armR: lerp2(a.armR, b.armR, w),
    lean: lerpN(a.lean, b.lean, w),
    bob: lerpN(a.bob, b.bob, w),
    headTilt: lerpN(a.headTilt, b.headTilt, w),
    squash: lerpN(a.squash, b.squash, w),
    look: lerpN(a.look, b.look, w),
  };
};

const breathIdle = (t: number, k = 0): Pose => {
  const b = Math.sin(t * 2.1 + k);
  const lag = Math.sin(t * 2.1 + k - 0.7);
  return {
    legL: [2 + b * 1.4, -4 - Math.max(0, b) * 2.5],
    legR: [-2 - b * 1.4, -4 - Math.max(0, -b) * 2.5],
    armL: [-10 + b * 3.8, 12 + lag * 4.5],
    armR: [10 - b * 3.8, 12 - lag * 4.5],
    lean: b * 1.2,
    bob: (b + 1) * 2.2,
    headTilt: Math.sin(t * 1.35 + k - 0.5) * 2.8,
    squash: b * 0.012,
    look: 0,
  };
};

type WalkStyle = "run" | "march" | "back";
const WALK_CFG: Record<
  WalkStyle,
  { stride: number; thigh: number; crouch: number; baseKnee: number; liftKnee: number; pushKnee: number; arm: number; bob: number; lean: number; sq: number; rev?: boolean }
> = {
  run: { stride: 1.05, thigh: 40, crouch: 8, baseKnee: 10, liftKnee: 54, pushKnee: 34, arm: 52, bob: 17, lean: 14, sq: 0.045 },
  march: { stride: 0.86, thigh: 34, crouch: 5, baseKnee: 8, liftKnee: 44, pushKnee: 24, arm: 38, bob: 13, lean: 9, sq: 0.038 },
  back: { stride: 0.84, thigh: 30, crouch: 10, baseKnee: 14, liftKnee: 40, pushKnee: 24, arm: 42, bob: 12, lean: -14, sq: 0.035, rev: true },
};

const smoothWalk = (dist: number, weight: number, t: number, style: WalkStyle = "run", seed = 0): Pose => {
  const cfg = WALK_CFG[style];
  const base = breathIdle(t, seed);
  const w = smoother(cl(weight));
  if (w < 0.001) return base;
  const p = ((dist / cfg.stride) * Math.PI * 2 + seed) * (cfg.rev ? -1 : 1);
  const sL = Math.sin(p);
  const cL = Math.cos(p);
  const sR = -sL;
  const cR = -cL;
  const legL: [number, number] = [
    sL * cfg.thigh + cfg.crouch,
    -(cfg.baseKnee + Math.max(0, cL) * cfg.liftKnee + Math.max(0, -cL) * cfg.pushKnee),
  ];
  const legR: [number, number] = [
    sR * cfg.thigh + cfg.crouch,
    -(cfg.baseKnee + Math.max(0, cR) * cfg.liftKnee + Math.max(0, -cR) * cfg.pushKnee),
  ];
  const armL: [number, number] = [-sL * cfg.arm, 16 + Math.max(0, -sL) * 44];
  const armR: [number, number] = [sL * cfg.arm, 16 + Math.max(0, sL) * 44];
  const strideHigh = Math.abs(cL);
  const walkPose: Pose = {
    legL,
    legR,
    armL,
    armR,
    lean: cfg.lean + Math.sin(p * 2) * 2.2,
    bob: strideHigh * cfg.bob - 4,
    headTilt: Math.sin(p - 0.6) * 3.5,
    squash: (strideHigh - 0.5) * 2 * cfg.sq,
    look: 0,
  };
  return mixPose(base, walkPose, w);
};

const toBean = (base: BeanParams, pose: Pose, t: number, seed: number, extra: Partial<BeanParams> = {}): BeanParams => ({
  ...base,
  legL: pose.legL,
  legR: pose.legR,
  armL: pose.armL,
  armR: pose.armR,
  lean: pose.lean,
  bob: pose.bob,
  headTilt: pose.headTilt,
  squash: pose.squash,
  look: pose.look,
  footBend: true,
  blink: (t + seed * 0.73) % 2.9 < 0.12,
  ...extra,
});

const talkMouth = (t: number) => 0.35 + 0.65 * Math.abs(Math.sin(t * 15));

/* Subtle golden floating sparkle diamonds around Riko's pristine bowl */
const SparkleRing3D: React.FC<{ pos: Vec3; t: number; scale?: number }> = ({ pos, t, scale = 1 }) => (
  <group position={pos} scale={scale}>
    {[0, 1, 2, 3, 4].map((i) => {
      const ang = t * 1.7 + (i * Math.PI * 2) / 5;
      const r = 0.34 + Math.sin(t * 3 + i) * 0.04;
      const y = 0.42 + Math.sin(t * 2.5 + i * 1.4) * 0.11;
      const sc = 0.026 + Math.abs(Math.sin(t * 4.5 + i)) * 0.024;
      return (
        <mesh key={i} position={[Math.cos(ang) * r, y, Math.sin(ang) * r]} rotation={[t * 2, t * 3, 0]} scale={sc}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#fef08a" : "#7dd3fc"} />
        </mesh>
      );
    })}
  </group>
);

/* ================================================================== */
/* SCENE 1: HOOK — PIXAR CRANE SWOOP INTO MORNING KOS + SPOON STAB!   */
/* ================================================================== */
export const SceneBuburHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("hook");
  const evTusuk = timing.events["hook.tusuk"];
  const evPerang = timing.events["hook.perang"];

  const cam = evalCam(f, [
    // Sweeping Pixar crane down & 55-deg orbit across sunny Kos Bu Tini morning street -> tabletop!
    {
      kind: "orbit",
      to: evTusuk - 4,
      target0: [-0.25, 2.0, -1.85],
      target1: [-1.10, 1.38, -0.52],
      ang0: -0.62,
      ang1: 0.28,
      rad0: 10.4,
      rad1: 6.2,
      y0: 4.85,
      y1: 2.08,
      fov0: 46,
      fov1: 42,
    },
    // Dramatic whip-in Dutch-tilt orbit right on Bagas's spoon stab (both Riko & Bagas + both bowls framed)!
    {
      kind: "orbit",
      to: dur,
      target0: [-1.10, 1.38, -0.52],
      target1: [-1.12, 1.35, -0.42],
      ang0: 0.28,
      ang1: -0.22,
      rad0: 6.2,
      rad1: 5.55,
      y0: 2.08,
      y1: 1.72,
      fov0: 42,
      fov1: 42,
      roll0: 0,
      roll1: -5.5,
    },
  ]);

  const stabK = smoothStep(f, evTusuk - 10, 12);
  const clashK = smoothStep(f, evTusuk, 10);
  const shockJump = pulseBell(f, evTusuk - 2, evTusuk + 6, evTusuk + 26);

  // Riko: peacefully admiring steaming bowl -> jolts back in shock when Bagas stabs!
  const rikoCalm: Pose = {
    ...breathIdle(t, 1),
    armL: [-14, 24],
    armR: [44 + Math.sin(t * 2.2) * 4, 48 + Math.cos(t * 2.2) * 5],
    lean: 6 + Math.sin(t * 1.8) * 2,
    headTilt: 5,
    look: 0.4,
  };
  const rikoShock: Pose = {
    legL: [10, -18 + shockJump * 12],
    legR: [-10, -18 + shockJump * 12],
    armL: [-86, -24 + Math.sin(t * 18) * 6],
    armR: [84, 34 - Math.sin(t * 18) * 6],
    lean: -12 - shockJump * 5,
    bob: shockJump * 20 - 4,
    headTilt: -10 - shockJump * 6,
    squash: shockJump * 0.065 - 0.02,
    look: 0.85,
  };
  const rikoPose = mixPose(rikoCalm, rikoShock, clashK);

  // Bagas: smiles innocently -> lifts spoon high & stabs downward!
  const bagasCalm: Pose = {
    ...breathIdle(t, 2.5),
    armL: [-18, 22],
    armR: [52 + Math.sin(t * 2.4) * 5, 42 + Math.cos(t * 2.4) * 6],
    lean: 5,
    headTilt: 4,
    look: 0.35,
  };
  const bagasStab: Pose = {
    ...breathIdle(t, 2.5),
    armL: [-34, 62],
    armR: [88 - clashK * 42, 22 + clashK * 44],
    lean: 14 + clashK * 6,
    bob: 8 - clashK * 14,
    headTilt: 9,
    squash: (1 - clashK) * 0.04 - clashK * 0.05,
    look: 0.75,
  };
  const bagasPose = mixPose(bagasCalm, bagasStab, stabK);

  // Bang Udin cheerfully ladling behind cart
  const udinPose: Pose = {
    ...breathIdle(t, 4.1),
    armL: [-22, 34],
    armR: [48 + Math.sin(t * 3.1) * 12, 42 + Math.cos(t * 3.1) * 14],
    lean: 4 + Math.sin(t * 3.1) * 2,
    look: -0.25,
  };

  const rikoPos: Vec3 = [-1.78, 0.16, -1.26];
  const bagasPos: Vec3 = [-0.46, 0.16, -1.28];
  const udinPos: Vec3 = [1.35, 0.16, -3.15];

  const rikoP = toBean(RIKO_BUBUR, rikoPose, t, 1, { expr: clashK > 0.25 ? "shock" : "happy", sweat: clashK > 0.2 });
  const bagasP = toBean(BAGAS_BUBUR, bagasPose, t, 2, { expr: stabK > 0.3 ? "smug" : "happy" });
  const udinP = toBean(BANG_UDIN, udinPose, t, 3, { expr: "happy" });

  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);
  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evTusuk, evPerang], 0.15)} bg="#8ad2f6" fog={["#bae6fd", 18, 48]}>
        <KosanMorningStreet t={t} dramatic={clashK * 0.35} />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.86} mixProgress={0} t={t} steam />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.86} mixProgress={clashK * 0.35} t={t + 0.4} steam />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <BeanCard position={udinPos} height={2.08} params={udinP} flip />
        <Spoon3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.08]} rot={[0.1, 0.2, -0.55]} scale={0.76} />
        <Spoon3D
          pos={[bagasHand[0], bagasHand[1] - 0.16, bagasHand[2] + 0.12]}
          rot={[0.15, -0.2, 0.4 + clashK * 1.1]}
          scale={0.84}
          glow={clashK > 0.2 ? "#f59e0b" : undefined}
        />
        {clashK > 0.1 && (
          <>
            <ClashAura3D pos={[-0.46, 1.38, -0.22]} scale={0.62 * clashK} t={t} />
            <LightningBolt3D pos={[-1.08, 1.15, -0.35]} color="#38bdf8" scale={0.65 * clashK} t={t} />
            <LightningBolt3D pos={[-0.45, 1.18, -0.28]} color="#f59e0b" scale={0.62 * clashK} t={t + 0.3} />
          </>
        )}
      </Stage>
      <Grade warm={0.22} flash={pulseBell(f, evTusuk - 1, evTusuk + 2, evTusuk + 8) * 0.35} />
      <Tag label="KOS BU TINI EP. 2 · 07:00 WIB" from={6} to={evPerang - 8} color="#38bdf8" />
      <Chip from={evPerang - 4} to={dur - 6} top={156} color="#dc2626">
        PERANG BUBUR DIMULAI!
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 2: RAPI — HERO TABLETOP 3D ORBIT + EASTER EGG KUCING OREN #1 */
/* ================================================================== */
export const SceneBuburRapi: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("rapi");
  const evKerupuk = timing.events["rapi.kerupuk"];

  const cam = evalCam(f, [
    // Close glamorous 70-deg 3D tabletop orbit around Riko & his pristine Neat Bowl!
    {
      kind: "orbit",
      to: evKerupuk,
      target0: [-1.72, 1.32, -0.42],
      target1: [-1.68, 1.34, -0.35],
      ang0: -0.68,
      ang1: 0.24,
      rad0: 3.65,
      rad1: 2.95,
      y0: 1.92,
      y1: 1.58,
      fov0: 38,
      fov1: 36,
    },
    // Smooth wide orbit right to showcase Gerobak Bang Udin + hidden Kucing Oren peeking near cart wheel!
    {
      kind: "orbit",
      to: dur,
      target0: [-1.68, 1.34, -0.35],
      target1: [1.15, 1.22, -1.45],
      ang0: 0.24,
      ang1: 0.42,
      rad0: 2.95,
      rad1: 6.45,
      y0: 1.58,
      y1: 2.02,
      fov0: 36,
      fov1: 44,
    },
  ]);

  const scoopK = smoothStep(f, evKerupuk - 12, 22);
  const sway = Math.sin(t * 2.6);

  // Riko: chef's-kiss proud appreciation -> delicate dignified bite!
  const admirePose: Pose = {
    ...breathIdle(t, 1.2),
    armL: [-34 + sway * 5, 78 + Math.cos(t * 2.6) * 8],
    armR: [54 + sway * 6, 62 + Math.cos(t * 2.6) * 8],
    lean: 8 + sway * 2.5,
    bob: 4 + Math.abs(sway) * 4,
    headTilt: 7 + sway * 4,
    squash: sway * 0.018,
    look: 0.45,
  };
  const elegantScoop: Pose = {
    ...breathIdle(t, 1.2),
    armL: [-24, 34],
    armR: [62 + Math.sin(t * 4) * 8, 76 + Math.cos(t * 4) * 10],
    lean: 11,
    bob: 2 + Math.sin(t * 4) * 3,
    headTilt: 6 + Math.sin(t * 4 - 0.5) * 4,
    squash: 0.015,
    look: 0.65,
  };
  const rikoPose = mixPose(admirePose, elegantScoop, scoopK);

  // Bagas watching Riko skeptically with mischievous grin building
  const bagasPose: Pose = {
    ...breathIdle(t, 3.1),
    armL: [-32, 72],
    armR: [44, 52],
    lean: 6,
    headTilt: -6 + Math.sin(t * 2) * 3,
    look: 0.6,
  };
  const udinPose: Pose = {
    ...breathIdle(t, 5),
    armR: [46 + Math.sin(t * 2.8) * 10, 44],
    look: -0.2,
  };

  const rikoPos: Vec3 = [-1.78, 0.16, -1.26];
  const bagasPos: Vec3 = [-0.46, 0.16, -1.28];
  const udinPos: Vec3 = [1.35, 0.16, -3.15];

  const rikoP = toBean(RIKO_BUBUR, rikoPose, t, 1, { expr: "smug" });
  const bagasP = toBean(BAGAS_BUBUR, bagasPose, t, 2, { expr: "smug" });
  const udinP = toBean(BANG_UDIN, udinPose, t, 3, { expr: "happy" });
  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#93d5f8" fog={["#bae6fd", 18, 48]}>
        <KosanMorningStreet t={t} showCat />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.92} mixProgress={0} t={t} steam />
        <SparkleRing3D pos={RIKO_BOWL_POS} t={t} scale={1.08} />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.86} mixProgress={0} t={t + 0.5} steam />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <BeanCard position={udinPos} height={2.08} params={udinP} flip />
        <Spoon3D pos={[rikoHand[0], rikoHand[1] - 0.12, rikoHand[2] + 0.1]} rot={[0.1, 0.25, -0.65]} scale={0.76} />
      </Stage>
      <Grade warm={0.28} />
      <Tag label="TIM TIDAK DIADUK 🥣 · KARYA SENI" from={6} to={dur - 8} color="#38bdf8" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: ADUK — LIVE 3D MIX VORTEX (0 -> 1) + RIKO DOUBLE-TAKE!    */
/* ================================================================== */
export const SceneBuburAduk: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("aduk");
  const evTancap = timing.events["aduk.tancap"];
  const evMengaduk = timing.events["aduk.mengaduk"];
  const evMelotot = timing.events["aduk.melotot"];

  const cam = evalCam(f, [
    // Beat 1: Menacing low-angle orbit push onto Bagas raising his spoon!
    {
      kind: "orbit",
      to: evMengaduk,
      target0: [-0.48, 1.52, -0.68],
      target1: [-0.46, 1.28, -0.32],
      ang0: -0.32,
      ang1: 0.38,
      rad0: 3.9,
      rad1: 2.35,
      y0: 1.56,
      y1: 2.15,
      fov0: 36,
      fov1: 31,
      roll0: 0,
      roll1: 4.5,
    },
    // Beat 2: High top-down 80-deg 3D vortex orbit RIGHT AROUND Bagas's transforming bowl!
    {
      kind: "orbit",
      to: evMelotot - 6,
      target0: [-0.46, 1.28, -0.32],
      target1: [-0.46, 1.22, -0.24],
      ang0: 0.38,
      ang1: -0.58,
      rad0: 2.35,
      rad1: 2.05,
      y0: 2.15,
      y1: 2.12,
      fov0: 31,
      fov1: 29,
      roll0: 4.5,
      roll1: 3.0,
    },
    // Beat 3: Whip-pan 3D orbit onto Riko's horrified eyes popping out!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.46, 1.22, -0.24],
      target1: [-1.72, 1.58, -1.12],
      ang0: -0.58,
      ang1: -0.14,
      rad0: 2.05,
      rad1: 2.85,
      y0: 2.12,
      y1: 1.62,
      fov0: 29,
      fov1: 33,
      roll0: 3.0,
      roll1: -6.5,
    },
  ]);

  // Real-time BuburBowl3D mixProgress smoothly swirling from 0 (neat) -> 1 (swirled kecap vortex)!
  const mixProgress = smoothStep(f, evMengaduk - 4, 66);
  const raiseK = smoothStep(f, evTancap - 16, 14) * (1 - smoothStep(f, evMengaduk - 4, 10));
  const stirK = smoothStep(f, evMengaduk - 6, 12) * (1 - smoothStep(f, evMelotot + 6, 16));
  const proudK = smoothStep(f, evMelotot, 16);
  const shockK = smoothStep(f, evMelotot - 4, 10);
  const shockJump = pulseBell(f, evMelotot - 2, evMelotot + 6, evMelotot + 24);

  const stirP = t * 14.5;
  const bagasGrin: Pose = {
    ...breathIdle(t, 2),
    armL: [-28, 52],
    armR: [44, 52],
    lean: 8,
    headTilt: 7,
    look: 0.4,
  };
  const bagasRaise: Pose = {
    ...bagasGrin,
    armL: [-42, 74],
    armR: [118, 22],
    lean: -4,
    bob: 10,
    headTilt: -6,
    squash: 0.04,
    look: 0.6,
  };
  const bagasStir: Pose = {
    legL: [6 + Math.sin(stirP) * 3, -12],
    legR: [-6 - Math.sin(stirP) * 3, -12],
    armL: [-40 + Math.sin(stirP) * 8, 68 + Math.cos(stirP) * 10],
    // Rapid circular full-power stirring right over his bowl!
    armR: [62 + Math.sin(stirP) * 24, 48 + Math.cos(stirP) * 28],
    lean: 16 + Math.sin(stirP) * 4,
    bob: -4 + Math.abs(Math.sin(stirP)) * 9,
    headTilt: 10 + Math.sin(stirP - 0.4) * 8,
    squash: Math.sin(stirP) * 0.032,
    look: 0.8,
  };
  const bagasProud: Pose = {
    ...breathIdle(t, 2),
    armL: [-38, 84],
    armR: [76, 42],
    lean: -5,
    bob: 6,
    headTilt: -5,
    squash: 0.02,
    look: 0.5,
  };

  let bagasPose = mixPose(bagasGrin, bagasRaise, raiseK);
  bagasPose = mixPose(bagasPose, bagasStir, stirK);
  bagasPose = mixPose(bagasPose, bagasProud, proudK);

  // Riko watches in growing horror -> explodes in shock!
  const rikoWatch: Pose = {
    ...breathIdle(t, 1),
    armL: [-18, 36],
    armR: [32, 48],
    lean: 10,
    headTilt: 6,
    look: 0.85,
  };
  const rikoMelotot: Pose = {
    legL: [12, -24 + shockJump * 16],
    legR: [-12, -24 + shockJump * 16],
    armL: [-96, -26 + Math.sin(t * 20) * 8],
    armR: [92, 32 - Math.sin(t * 20) * 8],
    lean: -14 - shockJump * 6,
    bob: shockJump * 24 - 6,
    headTilt: -12 - shockJump * 8,
    squash: shockJump * 0.075 - 0.03,
    look: 0.9,
  };
  const rikoPose = mixPose(rikoWatch, rikoMelotot, shockK);

  const rikoPos: Vec3 = [-1.78, 0.16, -1.26];
  const bagasPos: Vec3 = [-0.46, 0.16, -1.28];
  const rikoP = toBean(RIKO_BUBUR, rikoPose, t, 1, { expr: shockK > 0.25 ? "shock" : "worried", sweat: true });
  const bagasP = toBean(BAGAS_BUBUR, bagasPose, t, 2, { expr: stirK > 0.2 || proudK > 0.3 ? "laugh" : "smug" });

  // During active stirring, lock inverted spoon scoop right inside Bagas's porridge vortex with handle rising up!
  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);
  const stirCirclePos: Vec3 = [
    BAGAS_BOWL_POS[0] + Math.cos(stirP) * 0.11,
    BAGAS_BOWL_POS[1] + 0.68,
    BAGAS_BOWL_POS[2] + Math.sin(stirP) * 0.11,
  ];
  const spoonPos = lerpV([bagasHand[0], bagasHand[1] - 0.10, bagasHand[2] + 0.08], stirCirclePos, stirK);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evTancap, evMelotot], 0.17)} bg="#8ad2f6" fog={["#bae6fd", 18, 48]}>
        <KosanMorningStreet t={t} />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.86} mixProgress={0} t={t} steam />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.94} mixProgress={mixProgress} t={t + 0.2} steam />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <Spoon3D
          pos={spoonPos}
          rot={[0.18 * stirK, -0.3 + stirK * stirP * 0.35, Math.PI + (1 - stirK) * 0.45 + stirK * Math.sin(stirP) * 0.22]}
          scale={0.86}
          glow={stirK > 0.2 ? "#f59e0b" : undefined}
        />
      </Stage>
      <Grade warm={0.30 * stirK} cool={0.22 * shockK} flash={pulseBell(f, evMelotot - 1, evMelotot + 2, evMelotot + 7) * 0.32} />
      <Chip from={evMengaduk - 2} to={evMelotot - 4} top={165} color="#d97706">
        ADUK FULL POWER!!
      </Chip>
      <Bubble x={540} y={245} w={560} size={42} text="BUBUR APA ADUKAN SEMEN?!" from={evMelotot - 2} to={dur - 6} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 4: KUBU — SATU KOSAN TERBELAH DUA! (5 KARAKTER + WALK FLUID) */
/* ================================================================== */
export const SceneBuburKubu: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("kubu");
  const evTini = timing.events["kubu.tini"];
  const evNisa = timing.events["kubu.nisa"];
  const evDedi = timing.events["kubu.dedi"];
  const k1From = timing.lines.k1.from;
  const k1To = timing.lines.k1.to;

  const cam = evalCam(f, [
    // Beat 1: Focus left side as Riko protests & Bu Tini marches out of the Kos Bu Tini gate!
    {
      kind: "orbit",
      to: evNisa - 12,
      target0: [-1.85, 1.48, -0.75],
      target1: [-2.05, 1.48, -0.65],
      ang0: 0.22,
      ang1: -0.42,
      rad0: 5.8,
      rad1: 6.1,
      y0: 1.92,
      y1: 1.88,
      fov0: 42,
      fov1: 42,
    },
    // Beat 2: Dynamic 70-deg 3D pendulum sweep across table to Bagas & Mbak Nisa on right!
    {
      kind: "orbit",
      to: evDedi - 6,
      target0: [-2.05, 1.48, -0.65],
      target1: [-0.08, 1.48, -0.58],
      ang0: -0.42,
      ang1: 0.48,
      rad0: 6.1,
      rad1: 5.8,
      y0: 1.88,
      y1: 1.92,
      fov0: 42,
      fov1: 42,
    },
    // Beat 3: Dramatic pull-back revealing ALL 5 residents squared up with panicking Mas Dedi dead-center!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.08, 1.48, -0.58],
      target1: [-1.05, 1.45, -0.35],
      ang0: 0.48,
      ang1: 0.0,
      rad0: 5.8,
      rad1: 8.6,
      y0: 1.92,
      y1: 2.25,
      fov0: 42,
      fov1: 46,
    },
  ]);

  // Smooth distance-locked paths for Bu Tini (from gate), Mbak Nisa (from right), & Mas Dedi (into center)!
  const tiniKFn = (ff: number) => smoothStep(ff, Math.max(0, evTini - 42), 48);
  const nisaKFn = (ff: number) => smoothStep(ff, Math.max(0, evNisa - 38), 44);
  const dediKFn = (ff: number) => smoothStep(ff, Math.max(0, evDedi - 34), 38);

  const tiniK = tiniKFn(f);
  const nisaK = nisaKFn(f);
  const dediK = dediKFn(f);

  const tiniPos: Vec3 = lerpV([-3.65, 0.16, -3.15], [-2.42, 0.16, -0.22], tiniK);
  const nisaPos: Vec3 = lerpV([3.15, 0.16, -0.45], [0.34, 0.16, -0.22], nisaK);
  const dediPos: Vec3 = lerpV([-3.45, 0.16, -3.15], [-1.05, 0.16, 0.52], dediK);

  const tiniDist = tiniK * 3.18;
  const nisaDist = nisaK * 2.82;
  const dediDist = dediK * 4.38;

  const tiniVel = cl((travelVel(f, tiniKFn) * 3.18) / 0.03);
  const nisaVel = cl((travelVel(f, nisaKFn) * 2.82) / 0.03);
  const dediVel = cl((travelVel(f, dediKFn) * 4.38) / 0.03);

  const talkRiko = f >= k1From && f <= k1To;
  const arg = Math.sin(t * 9.5);

  const rikoPose: Pose = {
    ...breathIdle(t, 1),
    armL: [-34, 72],
    armR: [86 + arg * 14, 24 + Math.cos(t * 9.5) * 14],
    lean: 12 + arg * 3,
    bob: 4 + Math.abs(arg) * 6,
    headTilt: 6 + arg * 5,
    squash: arg * 0.025,
    look: 0.75,
  };
  const bagasPose: Pose = {
    ...breathIdle(t, 2),
    armL: [-38, 84],
    armR: [76 - arg * 12, 34 - Math.cos(t * 9.5) * 12],
    lean: 9 - arg * 3,
    bob: 3 + Math.abs(arg) * 5,
    headTilt: 5 - arg * 4,
    squash: -arg * 0.02,
    look: 0.7,
  };

  const tiniWalk = smoothWalk(tiniDist, tiniVel, t, "march", 3);
  const tiniRally: Pose = {
    ...breathIdle(t, 3),
    armL: [-42, 88],
    armR: [92 + Math.sin(t * 10) * 14, 34 + Math.cos(t * 10) * 14],
    lean: 10,
    bob: Math.abs(Math.sin(t * 10)) * 6,
    headTilt: 6 + Math.sin(t * 10) * 5,
    look: 0.7,
  };
  const tiniPose = mixPose(tiniWalk, tiniRally, smoothStep(f, evTini - 2, 14));

  const nisaWalk = smoothWalk(nisaDist, nisaVel, t, "run", 4);
  const nisaRally: Pose = {
    ...breathIdle(t, 4),
    armL: [-62, 46 + Math.sin(t * 8) * 10],
    armR: [88 + Math.sin(t * 8) * 12, 36 + Math.cos(t * 8) * 12],
    lean: 8,
    bob: Math.abs(Math.sin(t * 8)) * 7,
    headTilt: 5 + Math.sin(t * 8) * 5,
    look: 0.65,
  };
  const nisaPose = mixPose(nisaWalk, nisaRally, smoothStep(f, evNisa - 2, 14));

  const dediWalk = smoothWalk(dediDist, dediVel, t, "run", 5);
  const dediPanic: Pose = {
    legL: [10, -18],
    legR: [-10, -18],
    armL: [-82 + Math.sin(t * 14) * 14, -18 + Math.cos(t * 14) * 14],
    armR: [82 - Math.sin(t * 14) * 14, 18 - Math.cos(t * 14) * 14],
    lean: Math.sin(t * 7) * 5,
    bob: Math.abs(Math.sin(t * 14)) * 9 - 2,
    headTilt: Math.sin(t * 7) * 9,
    squash: Math.sin(t * 14) * 0.032,
    look: Math.sin(t * 7) * 0.85,
  };
  const dediPose = mixPose(dediWalk, dediPanic, smoothStep(f, evDedi - 4, 14));

  const rikoPos: Vec3 = [-1.74, 0.16, -1.02];
  const bagasPos: Vec3 = [-0.38, 0.16, -1.02];

  const rikoP = toBean(RIKO_BUBUR, rikoPose, t, 1, { expr: talkRiko ? "talk" : "angry", mouthOpen: talkRiko ? talkMouth(t) : 0 });
  const bagasP = toBean(BAGAS_BUBUR, bagasPose, t, 2, { expr: "smug" });
  const tiniP = toBean(BU_TINI, tiniPose, t, 3, { expr: "angry" });
  const nisaP = toBean(NISA, nisaPose, t, 4, { expr: "happy" });
  const dediP = toBean(DEDI, dediPose, t, 5, { expr: "shock", sweat: true });

  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [timing.events["kubu.semen"]], 0.12)} bg="#8ad2f6" fog={["#bae6fd", 18, 48]}>
        <KosanMorningStreet t={t} />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.86} mixProgress={0} t={t} steam />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.86} mixProgress={1} t={t + 0.4} steam />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <BeanCard position={tiniPos} height={2.08} params={tiniP} />
        <BeanCard position={nisaPos} height={1.96} params={nisaP} flip />
        <BeanCard position={dediPos} height={2.02} params={dediP} />
        <Spoon3D pos={[bagasHand[0], bagasHand[1] - 0.1, bagasHand[2] + 0.08]} rot={[0.1, -0.2, 0.5]} scale={0.8} />
      </Stage>
      <Grade warm={0.18} />
      {/* Split Faction Banners */}
      {f >= evTini - 4 && f <= dur - 6 && (
        <div
          style={{
            position: "absolute",
            top: 155,
            left: 42,
            right: 42,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 36,
          }}
        >
          <div style={{ flex: 1, textAlign: "center", background: "rgba(2,132,199,0.95)", color: "#fff", border: "5px solid #fff", borderRadius: 18, padding: "10px 12px" }}>
            TIM TIDAK DIADUK 🥣
          </div>
          {f >= evNisa - 4 && (
            <div style={{ flex: 1, textAlign: "center", background: "rgba(217,119,6,0.95)", color: "#fff", border: "5px solid #fff", borderRadius: 18, padding: "10px 12px" }}>
              TIM DIADUK 🥄
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: DUEL — 120° MATRIX BULLET-TIME ORBIT + PETIR + KERUPUK!   */
/* ================================================================== */
const FLYING_KERUPUK: [number, number, number, number, number, number][] = [
  // [startX, startY, startZ, vx, vy, vz] distributed across foreground, midground & background for rich 3D parallax!
  [-1.05, 2.2, -0.1, -2.6, 0.9, 2.4],
  [-1.05, 2.2, -0.1, 2.8, 1.1, 2.1],
  [-1.05, 2.1, -0.1, -1.8, -0.6, 3.2],
  [-1.05, 2.3, -0.1, 1.5, 1.8, 1.9],
  [-1.05, 2.2, -0.1, -3.2, 0.2, 0.4],
  [-1.05, 2.2, -0.1, 3.1, -0.3, -0.6],
  [-1.05, 2.3, -0.1, -0.8, 2.1, -1.2],
  [-1.05, 2.2, -0.1, 0.9, 1.7, 2.9],
  [-1.05, 2.1, -0.1, -2.2, -0.9, 1.6],
  [-1.05, 2.2, -0.1, 2.4, 0.5, 2.7],
  [-1.05, 2.3, -0.1, 0.1, 0.6, 3.5],
  [-1.05, 2.1, -0.1, -0.4, -0.4, 1.8],
];

export const SceneBuburDuel: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("duel");
  const evSendok = timing.events["duel.sendok"];
  const evPetir = timing.events["duel.petir"];
  const evKerupuk = timing.events["duel.kerupuk"];
  const evDedi = timing.events["duel.dedi"];

  const cam = evalCam(f, [
    // Beat 1: Ultra-low heroic launch tilt as both jump into the air!
    {
      kind: "orbit",
      to: evSendok,
      target0: [-1.05, 1.65, -0.25],
      target1: [-1.05, 2.25, -0.15],
      ang0: -0.58,
      ang1: -0.82,
      rad0: 6.8,
      rad1: 5.55,
      y0: 1.05,
      y1: 1.72,
      fov0: 44,
      fov1: 42,
      roll0: 0,
      roll1: -5.5,
    },
    // Beat 2: SIGNATURE 95-DEG MATRIX BULLET-TIME 3D CYLINDRICAL ORBIT around frozen mid-air clash!
    {
      kind: "orbit",
      to: evKerupuk + 18,
      target0: [-1.05, 2.25, -0.15],
      target1: [-1.05, 2.15, -0.10],
      ang0: -0.78,
      ang1: 0.86,
      rad0: 5.55,
      rad1: 5.15,
      y0: 1.72,
      y1: 2.42,
      fov0: 42,
      fov1: 42,
      roll0: -5.5,
      roll1: 5.0,
    },
    // Beat 3: Swoop down onto Mas Dedi buried in spinning 3D kerupuk!
    {
      kind: "orbit",
      to: dur,
      target0: [-1.05, 2.15, -0.10],
      target1: [-1.05, 1.48, 0.72],
      ang0: 0.86,
      ang1: 0.14,
      rad0: 5.15,
      rad1: 3.95,
      y0: 2.42,
      y1: 1.68,
      fov0: 42,
      fov1: 39,
      roll0: 5.0,
      roll1: 0,
    },
  ]);

  const stormK = smoothStep(f, 0, 26);
  const crouchK = pulseBell(f, 0, Math.max(8, evSendok - 24), Math.max(16, evSendok - 6));
  const leapK = smoothStep(f, Math.max(10, evSendok - 18), 18);
  const clashK = smoothStep(f, evSendok - 2, 8);
  const petirK = smoothStep(f, evPetir - 4, 8);
  const blastT = Math.max(0, (f - evSendok) / 30);
  // Bullet-time slow-mo clock: dramatic speed ramp during clash!
  const slowFloat = Math.sin(t * 2.2) * 0.08 * clashK;

  // Riko & Bagas crouch -> leap high facing each other over the table!
  const rikoX = lerpN(-2.48, -1.78, leapK);
  const bagasX = lerpN(0.38, -0.32, leapK);
  const jumpY = 0.16 + leapK * 0.96 + slowFloat;

  const crouchPose: Pose = {
    legL: [34, -62],
    legR: [-22, -52],
    armL: [-42, 42],
    armR: [42, 52],
    lean: 20,
    bob: -28,
    headTilt: 10,
    squash: -0.09,
    look: 0.8,
  };
  const airSlashPose: Pose = {
    legL: [44, -68],
    legR: [-38, -32],
    armL: [-78, -22],
    armR: [96 + Math.sin(t * 16) * 4, 24],
    lean: 18,
    bob: 10,
    headTilt: 8,
    squash: 0.06,
    look: 0.9,
  };
  const baseDuel = mixPose(breathIdle(t, 1), crouchPose, crouchK);
  const duelPose = mixPose(baseDuel, airSlashPose, leapK);

  // Mas Dedi ducking directly underneath the flying cracker storm!
  const dediHitK = smoothStep(f, evDedi - 6, 12);
  const dediPose: Pose = {
    legL: [26, -54],
    legR: [-24, -50],
    armL: [-112, 34 + Math.sin(t * 18) * 8],
    armR: [112, 34 - Math.sin(t * 18) * 8],
    lean: Math.sin(t * 14) * 6,
    bob: -24 + Math.abs(Math.sin(t * 16)) * 6,
    headTilt: -10 + Math.sin(t * 16) * 8,
    squash: -0.06,
    look: Math.sin(t * 10) * 0.8,
  };

  // Bu Tini & Mbak Nisa shielding from the wind blast on left/right!
  const shieldPose = (s: number): Pose => ({
    ...breathIdle(t, s),
    armL: [-68, 52],
    armR: [72, 48],
    lean: -12,
    bob: -8,
    headTilt: -8,
    look: 0.6,
  });

  const rikoPos: Vec3 = [rikoX, jumpY, -0.28];
  const bagasPos: Vec3 = [bagasX, jumpY, 0.04];
  const dediPos: Vec3 = [-1.05, 0.16, 0.82];

  const rikoP = toBean(RIKO_BUBUR, duelPose, t, 1, { expr: "angry" });
  const bagasP = toBean(BAGAS_BUBUR, duelPose, t, 2, { expr: "angry" });
  const dediP = toBean(DEDI, dediPose, t, 3, { expr: "shock", sweat: true });
  const tiniP = toBean(BU_TINI, shieldPose(4), t, 4, { expr: "shock" });
  const nisaP = toBean(NISA, shieldPose(5), t, 5, { expr: "shock" });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);
  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evSendok, evPetir, evKerupuk], 0.22)} bg="#171434" fog={["#1e1b4b", 14, 42]}>
        <KosanMorningStreet t={t} dramatic={stormK} />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.86} mixProgress={0} t={t} steam />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.86} mixProgress={1} t={t} steam />

        {/* Dramatic Cyan & Gold Rim Lights for the Anime Duel */}
        <pointLight position={[-2.2, 2.6, 0.8]} color="#38bdf8" intensity={3.2 * stormK} distance={9} />
        <pointLight position={[0.2, 2.6, 0.8]} color="#f59e0b" intensity={3.2 * stormK} distance={9} />

        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <BeanCard position={dediPos} height={2.02} params={dediP} />
        <BeanCard position={[-2.52, 0.16, -0.45]} height={2.08} params={tiniP} />
        <BeanCard position={[0.42, 0.16, -0.45]} height={1.96} params={nisaP} flip />

        {/* Giant Glowing Anime Duel Spoons Crossing Mid-Air! */}
        <Spoon3D
          pos={[rikoHand[0], rikoHand[1] - 0.12, rikoHand[2] + 0.08]}
          rot={[0.1, 0.15, -0.82]}
          scale={1.85}
          glow="#38bdf8"
        />
        <Spoon3D
          pos={[bagasHand[0], bagasHand[1] - 0.12, bagasHand[2] + 0.08]}
          rot={[0.1, -0.15, 0.82]}
          scale={1.85}
          glow="#f59e0b"
        />

        {/* Clash Shockwave Ring & Twin Extruded Lightning Bolts */}
        {clashK > 0.05 && <ClashAura3D pos={[-1.05, 2.25, -0.12]} scale={1.15 * clashK} t={t} />}
        {petirK > 0.05 && (
          <>
            <LightningBolt3D pos={[-1.42, 2.15, -0.25]} color="#38bdf8" scale={1.25 * petirK} t={t} />
            <LightningBolt3D pos={[-0.75, 2.15, -0.25]} color="#f59e0b" scale={1.25 * petirK} t={t + 0.35} />
            <LightningBolt3D pos={[-1.08, 0.55, -0.32]} color="#fef08a" scale={0.95 * petirK} t={t + 0.15} />
          </>
        )}

        {/* 12 Slow-Mo 3D Flying Kerupuk Crackers creating insane 3D parallax! */}
        {clashK > 0.1 &&
          FLYING_KERUPUK.map(([sx, sy, sz, vx, vy, vz], idx) => {
            const p = Math.min(1.4, blastT * 0.52);
            const px = sx + vx * p;
            const py = Math.max(0.35, sy + vy * p - 0.55 * p * p);
            const pz = sz + vz * p;
            return (
              <Kerupuk3D
                key={idx}
                pos={[px, py, pz]}
                rot={[t * (2.5 + (idx % 3)), t * (3.1 + idx * 0.4), idx * 0.7]}
                scale={0.92 + (idx % 3) * 0.22}
              />
            );
          })}

        {/* 3 Comedic Kerupuk Pieces Stuck Right Around Mas Dedi's Head & Peci! */}
        {dediHitK > 0.05 && (
          <>
            <Kerupuk3D pos={[-1.25, 1.88, 0.98]} rot={[0.6, 0.3, 0.4]} scale={0.78 * dediHitK} />
            <Kerupuk3D pos={[-0.86, 1.76, 1.02]} rot={[-0.5, 0.4, -0.5]} scale={0.72 * dediHitK} />
            <Kerupuk3D pos={[-1.04, 2.08, 0.96]} rot={[0.2, 0.8, 0.2]} scale={0.82 * dediHitK} />
          </>
        )}
      </Stage>
      <Grade
        cool={0.22 * stormK}
        flash={pulseBell(f, evPetir - 1, evPetir + 2, evPetir + 9) * 0.55}
        flashCol="#e0f2fe"
      />
      <Stamp text="DUEL SENDOK RAKSASA!" from={evSendok - 2} to={evKerupuk + 10} color="#facc15" top={210} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: UDIN — TENG!! DANDANG CLANG + FREEZE + BUKU BIRU KERAMAT  */
/* ================================================================== */
export const SceneBuburUdin: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("udin");
  const evKetuk = timing.events["udin.ketuk"];
  const evBuku = timing.events["udin.buku"];

  const cam = evalCam(f, [
    // Beat 1: Orbit straight to Bang Udin standing clearly beside the right dandang pot + Kucing Oren peek!
    {
      kind: "orbit",
      to: evKetuk + 22,
      target0: [2.15, 1.58, -1.92],
      target1: [2.25, 1.52, -1.85],
      ang0: -0.35,
      ang1: 0.24,
      rad0: 5.1,
      rad1: 4.35,
      y0: 2.02,
      y1: 1.78,
      fov0: 42,
      fov1: 40,
    },
    // Beat 2: Wide comic reaction whip-orbit revealing EVERYONE frozen dead still in awkward poses!
    {
      kind: "orbit",
      to: evBuku - 6,
      target0: [2.25, 1.52, -1.85],
      target1: [-0.95, 1.45, -0.45],
      ang0: 0.24,
      ang1: -0.22,
      rad0: 4.35,
      rad1: 8.3,
      y0: 1.78,
      y1: 2.15,
      fov0: 40,
      fov1: 46,
    },
    // Beat 3: Dramatic hero push-in onto Bang Udin unobstructed in front holding the sacred blue Buku Bon Utang!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.95, 1.45, -0.45],
      target1: [0.68, 1.38, 0.32],
      ang0: -0.22,
      ang1: 0.14,
      rad0: 8.3,
      rad1: 3.25,
      y0: 2.15,
      y1: 1.52,
      fov0: 46,
      fov1: 35,
    },
  ]);

  const clangStrike = pulseBell(f, evKetuk - 8, evKetuk, evKetuk + 16);
  const stepOutK = smoothStep(f, evKetuk + 20, 44);
  const bookK = smoothStep(f, evBuku - 8, 16);
  const stepVel = cl((travelVel(f, (ff) => smoothStep(ff, evKetuk + 20, 44)) * 2.8) / 0.03);

  // Bang Udin stands unobstructed right beside dandang pot -> steps cleanly to front-right sidewalk -> raises Buku Bon!
  const udinPos: Vec3 = lerpV([2.48, 0.16, -2.02], [0.76, 0.16, 0.34], stepOutK);
  const udinClangPose: Pose = {
    ...breathIdle(t, 6),
    armL: [-16, 28],
    armR: [66 + clangStrike * 38, 36 - clangStrike * 26],
    lean: 4 + clangStrike * 6,
    bob: -clangStrike * 6,
    headTilt: 2,
    look: -0.35,
  };
  const udinWalk = smoothWalk(stepOutK * 2.8, stepVel, t, "march", 6);
  const udinBookPose: Pose = {
    ...breathIdle(t, 6),
    armL: [-22, 34],
    armR: [82, 32],
    lean: 5,
    bob: 2,
    headTilt: 3,
    look: -0.1,
  };

  let udinPose = mixPose(udinClangPose, udinWalk, smoothStep(f, evKetuk + 18, 12));
  udinPose = mixPose(udinPose, udinBookPose, bookK);

  // Frozen awkward comic poses for the 5 kosan residents (literally frozen in time with tiny nervous tremor!)
  const shiver = Math.sin(t * 28) * 1.2 * smoothStep(f, evKetuk, 6);
  const frozenRiko: Pose = {
    legL: [24, -36],
    legR: [-18, -22],
    armL: [-72, -18],
    armR: [86, 26],
    lean: 12 + shiver,
    bob: -8,
    headTilt: -8,
    squash: -0.02,
    look: 0.85,
  };
  const frozenBagas: Pose = {
    legL: [20, -32],
    legR: [-22, -26],
    armL: [-68, -20],
    armR: [84, 24],
    lean: 10 - shiver,
    bob: -8,
    headTilt: -6,
    squash: -0.02,
    look: -0.85,
  };
  const frozenDedi: Pose = {
    legL: [14, -28],
    legR: [-14, -28],
    armL: [-88, -16],
    armR: [88, 16],
    lean: shiver,
    bob: -14,
    headTilt: -4,
    squash: -0.03,
    look: 0.8,
  };

  const udinP = toBean(BANG_UDIN, udinPose, t, 6, { expr: "smug" });
  const rikoP = toBean(RIKO_BUBUR, frozenRiko, t, 1, { expr: "shock", sweat: true });
  const bagasP = toBean(BAGAS_BUBUR, frozenBagas, t, 2, { expr: "shock", sweat: true });
  const dediP = toBean(DEDI, frozenDedi, t, 3, { expr: "shock", sweat: true });
  const tiniP = toBean(BU_TINI, { ...breathIdle(0, 4), armL: [-42, 82], armR: [62, 42], look: 0.8 }, t, 4, { expr: "shock", sweat: true });
  const nisaP = toBean(NISA, { ...breathIdle(0, 5), armL: [-54, 42], armR: [54, 42], look: -0.5 }, t, 5, { expr: "shock", sweat: true });

  const udinHand = beanHandWorld(udinP, "R", udinPos, 2.08, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evKetuk, evBuku], 0.18)} bg="#93d5f8" fog={["#bae6fd", 18, 48]}>
        {/* Bright morning daylight snaps back! Easter Egg Kucing Oren #2 peeking beside cart wheel! */}
        <KosanMorningStreet t={t} showCat />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.86} mixProgress={0} t={t} steam />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.86} mixProgress={1} t={t} steam />

        <BeanCard position={udinPos} height={2.08} params={udinP} flip />
        <BeanCard position={[-1.74, 0.16, -1.02]} height={2.02} params={rikoP} />
        <BeanCard position={[-0.38, 0.16, -1.02]} height={2.02} params={bagasP} flip />
        <BeanCard position={[-1.05, 0.16, 0.52]} height={2.02} params={dediP} />
        <BeanCard position={[-2.42, 0.16, -0.42]} height={2.08} params={tiniP} />
        <BeanCard position={[0.45, 0.16, -1.18]} height={1.96} params={nisaP} flip />

        {/* Ladle during clang, smoothly replaced by sacred blue Buku Bon Utang clearly facing camera! */}
        {bookK < 0.4 && (
          <Spoon3D pos={[udinHand[0], udinHand[1] - 0.1, udinHand[2] + 0.08]} rot={[0.1, 0.2, 0.45 + clangStrike * 0.6]} scale={1.12} />
        )}
        {bookK > 0.05 && (
          <BukuBon3D
            pos={[udinHand[0] - 0.10, udinHand[1] + 0.08, udinHand[2] + 0.26]}
            rot={[0.04, 0.10 + Math.sin(t * 2.5) * 0.06, -0.04]}
            scale={1.28 * bookK}
          />
        )}
      </Stage>
      <Grade warm={0.14} flash={pulseBell(f, evKetuk - 1, evKetuk + 2, evKetuk + 7) * 0.42} />
      <Stamp text="TENG!!" from={evKetuk - 2} to={evKetuk + 34} color="#dc2626" top={225} />
      <Chip from={evBuku - 4} to={dur - 6} top={160} color="#1d4ed8">
        BUKU BIRU KERAMAT!
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 7: BON — BANG UDIN LIP-SYNC + KANTONG KOSONG + TAWA RAMAI!   */
/* ================================================================== */
export const SceneBuburBon: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("bon");
  const evKantong = timing.events["bon.kantong"];
  const evTertawa = timing.events["bon.tertawa"];
  const b1From = timing.lines.b1.from;
  const b1To = timing.lines.b1.to;

  const cam = evalCam(f, [
    // Beat 1: Hero unobstructed low-angle orbit around Bang Udin lecturing firmly with full Buku Bon centered!
    {
      kind: "orbit",
      to: evKantong - 8,
      target0: [0.42, 1.48, 0.34],
      target1: [0.36, 1.46, 0.30],
      ang0: 0.22,
      ang1: -0.18,
      rad0: 4.15,
      rad1: 4.55,
      y0: 1.52,
      y1: 1.72,
      fov0: 38,
      fov1: 40,
    },
    // Beat 2: Wide comedy pull-out orbit revealing Riko & Bagas checking empty pockets + everyone laughing!
    {
      kind: "orbit",
      to: dur,
      target0: [0.36, 1.46, 0.30],
      target1: [-0.82, 1.42, -0.35],
      ang0: -0.18,
      ang1: 0.26,
      rad0: 4.55,
      rad1: 8.65,
      y0: 1.72,
      y1: 2.25,
      fov0: 40,
      fov1: 46,
    },
  ]);

  const talkingUdin = f >= b1From && f <= b1To;
  const talkK = smoothStep(f, b1From - 4, 8) * (1 - smoothStep(f, b1To - 2, 8));
  const pocketK = smoothStep(f, evKantong - 10, 14);
  const laughK = smoothStep(f, evTertawa - 10, 14);

  const wag = Math.sin(t * 9.2);
  const udinPose: Pose = {
    ...breathIdle(t, 6),
    armL: [-38, 86],
    armR: [84 + talkK * wag * 12, 34 + talkK * Math.cos(t * 9.2) * 10],
    lean: 6 + talkK * wag * 2.5,
    bob: 3 + talkK * Math.abs(wag) * 4,
    headTilt: 4 + talkK * wag * 5,
    squash: talkK * wag * 0.018,
    look: -0.35,
  };

  // Riko & Bagas frantically patting empty pants pockets & slumping in comical despair!
  const pat = Math.sin(t * 13);
  const emptyPocketPose = (seed: number): Pose => ({
    ...breathIdle(t, seed),
    armL: [-22 + pat * 14, 72 + pat * 14],
    armR: [22 - pat * 14, 72 - pat * 14],
    lean: 15,
    bob: -12 + Math.abs(pat) * 4,
    headTilt: 14 + Math.sin(t * 6 + seed) * 5,
    squash: -0.04,
    look: 0.2,
  });
  const rikoPose = mixPose(
    { ...breathIdle(t, 1), lean: -4, armL: [-18, 32], armR: [18, 32], look: 0.65 },
    emptyPocketPose(1),
    pocketK
  );
  const bagasPose = mixPose(
    { ...breathIdle(t, 2), lean: -4, armL: [-18, 32], armR: [18, 32], look: -0.55 },
    emptyPocketPose(2),
    pocketK
  );

  // Staggered belly-laugh bounce for Bu Tini, Mbak Nisa, & Mas Dedi!
  const laughPose = (phase: number): Pose => {
    const ch = Math.sin(t * 11 + phase);
    const lPose: Pose = {
      ...breathIdle(t, phase),
      armL: [-36 + ch * 14, 78 + ch * 12],
      armR: [68 - ch * 14, 48 - ch * 12],
      lean: -8 + ch * 5,
      bob: Math.abs(ch) * 13,
      headTilt: -10 + ch * 8,
      squash: ch * 0.036,
      look: 0.35,
    };
    return mixPose(breathIdle(t, phase), lPose, laughK);
  };

  const udinPos: Vec3 = [0.76, 0.16, 0.34];
  const udinP = toBean(BANG_UDIN, udinPose, t, 6, { expr: talkingUdin ? "talk" : "smug", mouthOpen: talkingUdin ? talkMouth(t) : 0 });
  const rikoP = toBean(RIKO_BUBUR, rikoPose, t, 1, { expr: pocketK > 0.25 ? "shock" : "worried", sweat: true });
  const bagasP = toBean(BAGAS_BUBUR, bagasPose, t, 2, { expr: pocketK > 0.25 ? "shock" : "worried", sweat: true });
  const tiniP = toBean(BU_TINI, laughPose(0.2), t, 3, { expr: laughK > 0.2 ? "laugh" : "happy" });
  const nisaP = toBean(NISA, laughPose(1.5), t, 4, { expr: laughK > 0.2 ? "laugh" : "happy" });
  const dediP = toBean(DEDI, laughPose(2.7), t, 5, { expr: laughK > 0.2 ? "laugh" : "happy" });

  const udinHand = beanHandWorld(udinP, "R", udinPos, 2.08, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#93d5f8" fog={["#bae6fd", 18, 48]}>
        <KosanMorningStreet t={t} />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.86} mixProgress={0} t={t} steam />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.86} mixProgress={1} t={t} steam />

        <BeanCard position={udinPos} height={2.08} params={udinP} flip />
        <BeanCard position={[-1.74, 0.16, -1.08]} height={2.02} params={rikoP} />
        <BeanCard position={[-0.44, 0.16, -1.08]} height={2.02} params={bagasP} flip />
        <BeanCard position={[-2.52, 0.16, -0.52]} height={2.08} params={tiniP} />
        <BeanCard position={[0.48, 0.16, -1.18]} height={1.96} params={nisaP} flip />
        <BeanCard position={[-1.25, 0.16, 0.56]} height={2.02} params={dediP} />

        <BukuBon3D
          pos={[udinHand[0] - 0.10, udinHand[1] + 0.06, udinHand[2] + 0.24]}
          rot={[0.04, 0.08 + Math.sin(t * 4) * 0.08, -0.04]}
          scale={1.24}
        />
      </Stage>
      <Grade warm={0.24} />
      <Bubble x={540} y={210} w={620} size={38} text="BAYAR DULU UTANG KEMARIN!!" from={b1From - 2} to={evKantong - 6} />
      <Stamp text="KANTONG KOSONG!!" from={evKantong - 2} to={dur - 8} color="#dc2626" top={220} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 8: ENDING — DAMAI MAKAN BARENG + PIXAR CRANE-UP + VOTE CTA!  */
/* ================================================================== */
export const SceneBuburEnding: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BUBUR("ending");
  const evKomentar = timing.events["ending.komentar"];

  const cam = evalCam(f, [
    // Beat 1: Warm intimate 3D orbit around the peaceful breakfast table (both bowls clearly visible)!
    {
      kind: "orbit",
      to: evKomentar - 8,
      target0: [-1.05, 1.45, -0.58],
      target1: [-0.95, 1.48, -0.62],
      ang0: -0.44,
      ang1: 0.32,
      rad0: 6.3,
      rad1: 6.0,
      y0: 1.88,
      y1: 2.08,
      fov0: 44,
      fov1: 42,
    },
    // Beat 2: Pixar golden-hour 3D crane-up panorama showcasing the entire lush Kos Bu Tini street!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.95, 1.48, -0.62],
      target1: [-0.25, 1.72, -1.55],
      ang0: 0.32,
      ang1: -0.18,
      rad0: 6.0,
      rad1: 10.6,
      y0: 2.08,
      y1: 4.45,
      fov0: 42,
      fov1: 46,
    },
  ]);

  const eatPose = (phase: number, spoonSide: "L" | "R"): Pose => {
    const sway = Math.sin(t * 2.5 + phase);
    const bite = Math.max(0, Math.sin(t * 3.4 + phase));
    return {
      ...breathIdle(t, phase),
      armL: spoonSide === "L" ? [-44 - bite * 24, 58 + bite * 36] : [-20 + sway * 5, 34 + sway * 6],
      armR: spoonSide === "R" ? [44 + bite * 24, 58 + bite * 36] : [20 - sway * 5, 34 - sway * 6],
      lean: 5 + bite * 4 + sway * 1.5,
      bob: Math.abs(sway) * 4 - bite * 3,
      headTilt: sway * 4 + bite * 5,
      squash: sway * 0.016 - bite * 0.02,
      look: sway * 0.25,
    };
  };

  const udinWave: Pose = {
    ...breathIdle(t, 6),
    armL: [-22, 34],
    armR: [108 + Math.sin(t * 7) * 14, 24 + Math.cos(t * 7) * 12],
    lean: 3,
    headTilt: Math.sin(t * 4) * 5,
    look: 0,
  };

  const rikoPos: Vec3 = [-1.74, 0.16, -1.25];
  const bagasPos: Vec3 = [-0.44, 0.16, -1.25];
  const tiniPos: Vec3 = [-2.78, 0.16, -0.62];
  const nisaPos: Vec3 = [0.68, 0.16, -0.78];
  const dediPos: Vec3 = [-2.18, 0.16, 0.45];
  const udinPos: Vec3 = [2.35, 0.16, -1.92];

  const rikoP = toBean(RIKO_BUBUR, eatPose(0.3, "R"), t, 1, { expr: "happy" });
  const bagasP = toBean(BAGAS_BUBUR, eatPose(1.6, "R"), t, 2, { expr: "happy" });
  const tiniP = toBean(BU_TINI, eatPose(2.4, "L"), t, 3, { expr: "happy" });
  const nisaP = toBean(NISA, eatPose(3.1, "R"), t, 4, { expr: "happy" });
  const dediP = toBean(DEDI, eatPose(4.2, "R"), t, 5, { expr: "laugh" });
  const udinP = toBean(BANG_UDIN, udinWave, t, 6, { expr: "happy" });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);
  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);
  const dediHand = beanHandWorld(dediP, "R", dediPos, 2.02, cam.pos, false);

  const ctaS = spring({ frame: Math.max(0, f - (evKomentar - 4)), fps: 30, config: { damping: 11, stiffness: 200 } });

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#93d5f8" fog={["#fde68a", 20, 52]}>
        <KosanMorningStreet t={t} showCat />
        <BuburBowl3D pos={RIKO_BOWL_POS} scale={0.88} mixProgress={0} t={t} steam />
        <BuburBowl3D pos={BAGAS_BOWL_POS} scale={0.88} mixProgress={1} t={t + 0.4} steam />

        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <BeanCard position={tiniPos} height={2.08} params={tiniP} />
        <BeanCard position={nisaPos} height={1.96} params={nisaP} flip />
        <BeanCard position={dediPos} height={2.02} params={dediP} />
        <BeanCard position={udinPos} height={2.08} params={udinP} flip />

        <Spoon3D pos={[rikoHand[0], rikoHand[1] - 0.1, rikoHand[2] + 0.08]} rot={[0.1, 0.2, -0.5]} scale={0.74} />
        <Spoon3D pos={[bagasHand[0], bagasHand[1] - 0.1, bagasHand[2] + 0.08]} rot={[0.1, -0.2, 0.5]} scale={0.74} />
        <BuburBowl3D pos={[dediHand[0] + 0.05, dediHand[1] + 0.05, dediHand[2] + 0.14]} scale={0.72} mixProgress={0.5} t={t + 0.2} steam />
      </Stage>
      <Grade warm={0.34} />

      {/* Viral Comment-Voting & Episode 3 Subscribe Magnet Card! */}
      {f >= evKomentar - 4 && (
        <div
          style={{
            position: "absolute",
            top: 150,
            left: 48,
            right: 48,
            textAlign: "center",
            transform: `scale(${0.65 + 0.35 * ctaS})`,
            opacity: Math.min(1, ctaS * 1.5),
          }}
        >
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <div
              style={{
                flex: 1,
                background: "rgba(2,132,199,0.96)",
                border: "6px solid #ffffff",
                borderRadius: 24,
                padding: "16px 14px",
                fontFamily: "Anton, Impact, sans-serif",
                fontSize: 42,
                color: "#ffffff",
                boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
              }}
            >
              TIM TIDAK DIADUK 🥣
            </div>
            <div
              style={{
                flex: 1,
                background: "rgba(217,119,6,0.96)",
                border: "6px solid #ffffff",
                borderRadius: 24,
                padding: "16px 14px",
                fontFamily: "Anton, Impact, sans-serif",
                fontSize: 42,
                color: "#ffffff",
                boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
              }}
            >
              TIM DIADUK 🥄
            </div>
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 16,
              background: "#1e1b2e",
              border: "5px solid #facc15",
              borderRadius: 20,
              padding: "10px 28px",
              fontFamily: FONT_BODY,
              fontWeight: 900,
              fontSize: 32,
              color: "#fef08a",
              boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
            }}
          >
            VOTE DI KOMENTAR + IDE EPISODE 3! 👇
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const BUBUR_SCENES: Record<BuburScene, React.FC> = {
  hook: SceneBuburHook,
  rapi: SceneBuburRapi,
  aduk: SceneBuburAduk,
  kubu: SceneBuburKubu,
  duel: SceneBuburDuel,
  udin: SceneBuburUdin,
  bon: SceneBuburBon,
  ending: SceneBuburEnding,
};

export const DissolveBubur: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= 10 ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / 10);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

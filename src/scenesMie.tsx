import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./mie_timing.json";
import { Vec3 } from "./three/objects";
import { P } from "./three/objectsRig";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import { Ground, InkBox } from "./three/objectsMolase";
import { Sign } from "./three/objectsMolaseProps";
import {
  Gayung3D,
  KosanBedroomSet,
  KosanDoorUnit,
  KosanFridge3D,
  KosanKitchenCounter,
  NoodleBowl3D,
  NoodlePacket3D,
  RealisticFlame3D,
  Spatula3D,
  WaterSplash3D,
  WetTowel3D,
  kitchenTileTex,
} from "./three/objectsMie";
import { BAGAS, BU_TINI, DEDI, NISA, RIKO } from "./SheetMie";

export type MieScene = "hook" | "koridor" | "chef" | "menyambar" | "gayung" | "heboh" | "handuk" | "makan";
export const MIE_ORDER = timing.order as MieScene[];
export const DUR_MIE = (k: MieScene): number => timing.scenes[k].durationInFrames;
export const TOTAL_FRAMES_MIE = timing.totalFrames;

const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];

/* ================================================================== */
/* UPGRADED 3D CINEMATIC CAMERA ENGINE (ORBIT + LINEAR + DUTCH TILT)  */
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
  return { pos: [0, 2, 8], look: [0, 1.5, 0], fov: 38, roll: 0 };
};

const kick = (f: number, hits: number[], amp = 0.16): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 14) {
      const a = (1 - d / 14) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 3 ? 1 : -1) * a * 0.75;
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
  bg = "#1b1c2c",
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

/* Clean Grade WITHOUT SwANGLE-buggy backdropFilter blur */
const Grade: React.FC<{ warm?: number; cool?: number; flash?: number; flashCol?: string }> = ({
  warm = 0,
  cool = 0,
  flash = 0,
  flashCol = "#ffedd5",
}) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: warm > 0 ? `rgba(255,130,45,${0.36 * warm})` : `rgba(50,85,210,${0.32 * cool})`,
        }}
      />
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 54%, rgba(16,10,24,0.48) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(16,8,20,0) 70%, rgba(16,8,20,0.46) 88%, rgba(16,8,20,0.68) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: flashCol, opacity: flash }} />}
  </>
);

const Tag: React.FC<{ label: string; from?: number; to: number; color?: string; top?: number }> = ({
  label,
  from = 0,
  to,
  color = "#facc15",
  top = 155,
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
        fontSize: 33,
        letterSpacing: 1.5,
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
          fontSize: 62,
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
  w = 500,
  text,
  size = 42,
  from,
  to,
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 220 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y,
        width: w,
        textAlign: "center",
        transform: `scale(${0.6 + 0.4 * s})`,
        opacity: Math.min(1, s * 1.5),
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
  top = 340,
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
        transform: `rotate(-5deg) scale(${1.5 - 0.5 * s})`,
        opacity: Math.min(1, s * 2) * o,
      }}
    >
      <div
        style={{
          display: "inline-block",
          border: `10px solid ${color}`,
          borderRadius: 20,
          padding: "14px 32px",
          background: "rgba(255,248,235,0.95)",
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

export const MieCaptions: React.FC = () => {
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
/* FLUID CHARACTER KINEMATICS ENGINE (NO SNAPS, DISTANCE-LOCKED GAIT) */
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

/** Organic breathing idle with subtle weight shift, elbow lag & head micro-motion */
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

type WalkStyle = "sneak" | "run" | "march" | "back";
const WALK_CFG: Record<
  WalkStyle,
  { stride: number; thigh: number; crouch: number; baseKnee: number; liftKnee: number; pushKnee: number; arm: number; bob: number; lean: number; sq: number; rev?: boolean }
> = {
  sneak: { stride: 0.72, thigh: 30, crouch: 13, baseKnee: 16, liftKnee: 46, pushKnee: 26, arm: 18, bob: 9, lean: 14, sq: 0.032 },
  run: { stride: 1.08, thigh: 42, crouch: 8, baseKnee: 10, liftKnee: 56, pushKnee: 36, arm: 54, bob: 18, lean: 16, sq: 0.048 },
  march: { stride: 0.88, thigh: 34, crouch: 5, baseKnee: 8, liftKnee: 44, pushKnee: 24, arm: 38, bob: 13, lean: 9, sq: 0.04 },
  back: { stride: 0.84, thigh: 30, crouch: 10, baseKnee: 14, liftKnee: 40, pushKnee: 24, arm: 42, bob: 12, lean: -14, sq: 0.036, rev: true },
};

/** Distance-locked, velocity-blended human walk/run cycle with true backward-bending knees & natural elbow flexion */
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
  // Opposing natural arm swing (human elbow bends forward + when swinging forward, relaxes on backswing)
  const armL: [number, number] = [-sL * cfg.arm, 16 + Math.max(0, -sL) * 46];
  const armR: [number, number] = [sL * cfg.arm, 16 + Math.max(0, sL) * 46];
  const strideHigh = Math.abs(cL);
  const walkPose: Pose = {
    legL,
    legR,
    armL,
    armR,
    lean: cfg.lean + Math.sin(p * 2) * 2.2,
    bob: strideHigh * cfg.bob - (style === "sneak" ? 12 : 4),
    headTilt: Math.sin(p - 0.6) * (style === "sneak" ? 4.5 : 3.5),
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

/* Shared Enclosed 3D Kosan Kitchen Room */
const KosanKitchenRoom: React.FC<{
  burnerOn?: boolean;
  scorchLevel?: number;
  fireScale?: number;
  wokToss?: number;
  t?: number;
  smokeCloud?: number;
  warmLight?: number;
}> = ({ burnerOn = true, scorchLevel = 0, fireScale = 0, wokToss = 0, t = 0, smokeCloud = 0, warmLight = 1 }) => {
  const floorTex = React.useMemo(() => kitchenTileTex("#e8dfd1", "#d9cebc", "#9c8d7a"), []);
  return (
    <group>
      {/* Tiled Kosan Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial map={floorTex} roughness={0.95} />
      </mesh>
      {/* Enclosed Back & Side Walls */}
      <InkBox pos={[0, 3.0, -2.55]} size={[13, 6.0, 0.25]} color="#f5ebd8" ink={0.05} />
      <InkBox pos={[-5.4, 3.0, 1.5]} size={[0.25, 6.0, 9.5]} color="#e8dbc4" ink={0.05} />
      <InkBox pos={[5.4, 3.0, 1.5]} size={[0.25, 6.0, 9.5]} color="#e8dbc4" ink={0.05} />
      {/* Ceiling & Fluorescent Tube Lamp */}
      <InkBox pos={[0, 5.1, 0.5]} size={[12, 0.25, 8.5]} color="#dcd4c6" ink={0.04} />
      <InkBox pos={[0, 4.92, -0.4]} size={[2.2, 0.12, 0.18]} color="#ffffff" emissive="#fffbeb" ink={0.02} />
      {/* Night Kitchen Window with Grilles */}
      <InkBox pos={[-3.2, 2.75, -2.38]} size={[1.8, 1.45, 0.10]} color="#16213e" ink={0.04} />
      <InkBox pos={[-3.2, 2.75, -2.30]} size={[0.06, 1.42, 0.04]} color="#f8fafc" ink={0.01} />
      <InkBox pos={[-3.2, 2.75, -2.30]} size={[1.76, 0.06, 0.04]} color="#f8fafc" ink={0.01} />
      {/* Shared Fridge on Left & Main Stove Counter Center-Right */}
      <KosanFridge3D pos={[-2.95, 0, -1.65]} />
      <KosanKitchenCounter pos={[0.25, 0, -1.65]} burnerOn={burnerOn} scorchLevel={scorchLevel} fireScale={fireScale} wokToss={wokToss} t={t} />
      {/* Kitchen Rules Sign */}
      <Sign pos={[3.55, 2.9, -2.38]} w={1.85} h={0.78} text="CUCI WAJAN!" bg="#fef08a" fg="#991b1b" />
      {/* Overhead lingering smoke puffs when kitchen fills with smoke */}
      {smokeCloud > 0.05 &&
        [-1.8, -0.4, 1.0, 2.2].map((sx, i) => (
          <mesh key={i} position={[sx + Math.sin(t * 1.4 + i) * 0.25, 4.15 + Math.cos(t + i) * 0.12, -0.8 + (i % 2) * 0.7]}>
            <dodecahedronGeometry args={[0.85 * smokeCloud, 1]} />
            <meshStandardMaterial color="#38343e" roughness={1} transparent opacity={0.42 * smokeCloud} depthWrite={false} />
          </mesh>
        ))}
      {/* Balanced Ambient & Ceiling Lights */}
      <hemisphereLight args={["#fff4e0", "#5a4648", 1.35 * warmLight]} />
      <directionalLight position={[3, 6.5, 6]} intensity={1.55 * warmLight} color="#fff2d6" castShadow shadow-mapSize={[1024, 1024]} />
    </group>
  );
};

/* ================================================================== */
/* SCENE 1: HOOK — KAMAR KOS JAM 02:00 (FLUID WAKE-UP & PACKET GRAB)  */
/* ================================================================== */
export const SceneMieHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("hook");
  const evKeroncong = timing.events["hook.keroncong"];
  const evApi = timing.events["hook.kebakaran"];

  const cam = evalCam(f, [
    { kind: "linear", to: 52, p0: [0.0, 2.75, 1.5], p1: [2.2, 2.1, 6.2], l0: [0.0, 2.75, -1.15], l1: [-0.2, 1.3, 0.2], fov0: 30, fov1: 38 },
    { kind: "orbit", to: 185, target0: [-0.2, 1.3, 0.2], target1: [0.1, 1.35, 0.5], ang0: 0.36, ang1: -0.52, rad0: 6.4, rad1: 5.8, y0: 2.1, y1: 1.75, fov0: 38, fov1: 35 },
    { kind: "orbit", to: dur, target0: [0.1, 1.35, 0.5], target1: [0.2, 1.5, 0.4], ang0: -0.52, ang1: -0.15, rad0: 5.8, rad1: 6.5, y0: 1.75, y1: 1.9, fov0: 35, fov1: 38, roll0: 0, roll1: -4 },
  ]);

  const hungryK = smoothStep(f, evKeroncong - 4, 14);
  const standK = smoothStep(f, 102, 36);
  const reachK = pulseBell(f, 108, 122, 138);
  const grabHoldK = smoothStep(f, 120, 14);
  const packetAttachK = smoothStep(f, 120, 8);
  const firePreview = smoothStep(f, evApi, 22);
  const shockJump = pulseBell(f, evApi - 2, evApi + 6, evApi + 22);
  const rumbleEnv = pulseBell(f, evKeroncong - 2, evKeroncong + 8, evKeroncong + 30);
  const rumbleOsc = Math.sin(f * 2.1) * rumbleEnv;

  const rikoX = lerpN(-0.65, 0.25, standK);
  const rikoZ = lerpN(0.55, 0.95, standK);
  const stepLift = Math.sin(standK * Math.PI);

  // Build smooth layered pose: sleepy seated -> stomach-clutch wince -> stand-up & reach -> lift packet -> jump-scare!
  const baseIdle = breathIdle(t, 1);
  const sleepyPose: Pose = {
    legL: [42, -55],
    legR: [32, -48],
    armL: [-16, 22 + Math.sin(t * 1.4) * 4],
    armR: [16, 18 - Math.sin(t * 1.4) * 4],
    lean: 6 + Math.sin(t * 1.3) * 2.5,
    bob: -30 + Math.sin(t * 1.8) * 3,
    headTilt: 9 + Math.sin(t * 1.3 - 0.6) * 4,
    squash: Math.sin(t * 1.8) * 0.015,
    look: -0.2,
  };
  const clutchPose: Pose = {
    legL: [44, -58],
    legR: [34, -50],
    armL: [-28, 72 + rumbleOsc * 8],
    armR: [28, 72 - rumbleOsc * 8],
    lean: 16 + rumbleOsc * 2.5,
    bob: -32 + rumbleOsc * 5,
    headTilt: -8 + rumbleOsc * 5,
    squash: -0.045 * rumbleEnv,
    look: 0.35,
  };
  const standHoldPose: Pose = {
    legL: [stepLift * 18, -stepLift * 28 - 4],
    legR: [-stepLift * 14, -stepLift * 22 - 4],
    armL: [-14 + Math.sin(t * 2.4) * 5, 18 + Math.sin(t * 2.4 - 0.6) * 6],
    armR: lerp2([22, 34], [64 + Math.sin(t * 2.4) * 4, 48 + Math.sin(t * 2.4 - 0.5) * 5], grabHoldK),
    lean: 3 + reachK * 14 + Math.sin(t * 2.1) * 1.5,
    bob: baseIdle.bob + stepLift * 10 - reachK * 8,
    headTilt: reachK * 12 + Math.sin(t * 1.7) * 3,
    squash: baseIdle.squash + stepLift * 0.04 - reachK * 0.03,
    look: reachK > 0.2 ? 0.8 : 0.15,
  };
  const shockPose: Pose = {
    legL: [10, -22 + shockJump * 14],
    legR: [-10, -22 + shockJump * 14],
    armL: [-92, -32 + Math.sin(t * 18) * 8],
    armR: [76, 46 + Math.sin(t * 18) * 6],
    lean: -10 - shockJump * 6,
    bob: shockJump * 22 - (1 - shockJump) * 6,
    headTilt: -10 - shockJump * 8,
    squash: shockJump * 0.075 - (1 - shockJump) * 0.03,
    look: -0.6,
  };

  let pose = mixPose(sleepyPose, clutchPose, hungryK);
  pose = mixPose(pose, standHoldPose, standK);
  // Reach arm smoothly down toward the noodle packet on the bed before lifting
  if (reachK > 0.001) {
    pose = { ...pose, armR: lerp2(pose.armR, [42, 12], reachK) };
  }
  pose = mixPose(pose, shockPose, smoothStep(f, evApi - 2, 10));

  const rikoP = toBean(RIKO, pose, t, 1, {
    apron: undefined,
    expr: firePreview > 0.15 ? "shock" : hungryK > 0.35 ? "worried" : "sleepy",
    sweat: hungryK > 0.3,
  });
  const handPos = beanHandWorld(rikoP, "R", [rikoX, 0, rikoZ], 2.05, cam.pos, false);
  const packetPos: Vec3 = lerpV([0.55, 0.55, 0.35], handPos, packetAttachK);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evKeroncong, evApi], 0.14)} bg="#121629">
        <hemisphereLight args={["#7c98d4", "#282238", 1.15]} />
        <directionalLight position={[-3, 6, 5]} intensity={1.35} color="#a5c4ff" castShadow />
        <pointLight position={[0.4, 1.8, 1.5]} color="#fde68a" intensity={1.4} distance={7} />
        <Ground color="#3b3546" size={18} />
        <InkBox pos={[0, 2.8, -1.35]} size={[11, 5.6, 0.25]} color="#3b425c" ink={0.05} />
        <InkBox pos={[-4.6, 2.8, 1.5]} size={[0.25, 5.6, 8]} color="#31384f" ink={0.05} />
        <InkBox pos={[4.6, 2.8, 1.5]} size={[0.25, 5.6, 8]} color="#31384f" ink={0.05} />
        <KosanBedroomSet pos={[0, 0, 0]} t={t} />
        <BeanCard position={[rikoX, 0, rikoZ]} height={2.05} params={rikoP} />
        <NoodlePacket3D
          pos={packetPos}
          rot={[0, lerpN(0.6, 0.2, packetAttachK), lerpN(Math.PI / 2, -0.1 + Math.sin(t * 3) * 0.06, packetAttachK)]}
          scale={0.78}
        />
        {firePreview > 0.05 && <RealisticFlame3D pos={[0.2, 0.2, -0.3]} scale={0.9 * firePreview} heightMul={1.45} t={t} seed={9} />}
      </Stage>
      <Grade cool={firePreview > 0.2 ? 0 : 0.35} warm={firePreview * 0.75} flash={firePreview > 0.05 && firePreview < 0.35 ? 0.25 : 0} />
      <Tag label="KAMAR KOS 01 · 02:00 WIB" from={6} to={evApi - 10} color="#38bdf8" />
      <Chip from={evApi - 4} to={dur - 8} top={155} color="#dc2626">
        KEBAKARAN KOSAN?!
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 2: OPERASI SENYAP KORIDOR (DISTANCE-LOCKED TIPTOE SNEAKING!) */
/* ================================================================== */
export const SceneMieKoridor: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("koridor");
  const k2From = timing.lines.k2.from;
  const k2To = timing.lines.k2.to;

  const rikoXFn = (ff: number) => lerpN(-3.4, 0.75, smoothStep(ff, 0, 158)) + smoothStep(ff, 226, 44) * 2.4;
  const rikoX = rikoXFn(f);
  const travelDist = rikoX + 3.4;
  const walkW = cl(travelVel(f, rikoXFn) / 0.022);
  const freezeK = smoothStep(f, 148, 14) * (1 - smoothStep(f, 222, 14));
  const talking = f >= k2From && f <= k2To;
  const talkK = smoothStep(f, k2From - 4, 8) * (1 - smoothStep(f, k2To - 2, 8));

  const cam = evalCam(f, [
    { kind: "linear", to: 155, p0: [-4.2, 0.95, 4.8], p1: [0.4, 1.45, 5.2], l0: [-3.0, 1.15, 0.2], l1: [0.75, 1.35, 0.2], fov0: 42, fov1: 36 },
    { kind: "orbit", to: dur, target0: [0.75, 1.4, 0.3], target1: [1.1, 1.45, 0.3], ang0: -0.1, ang1: 0.55, rad0: 5.0, rad1: 4.5, y0: 1.45, y1: 1.75, fov0: 36, fov1: 33 },
  ]);

  // Distance-locked tiptoe gait smoothly blending into nervous shush-freeze & conversational head nod!
  const walkPose = smoothWalk(travelDist, walkW, t, "sneak", 2);
  const shushPose: Pose = {
    legL: [10, -18],
    legR: [-8, -14],
    armL: [-28, 118 + Math.sin(t * 3.5) * 4], // raised hand shushing near mouth
    armR: [54 + Math.sin(t * 2.2) * 3, 42 + Math.sin(t * 2.2 - 0.6) * 4],
    lean: 6 + talkK * Math.sin(t * 8) * 2.5,
    bob: -8 + talkK * Math.abs(Math.sin(t * 8)) * 4,
    headTilt: 5 + talkK * Math.sin(t * 9) * 5,
    squash: -0.02 + talkK * Math.sin(t * 8) * 0.015,
    look: 0.75,
  };
  // Right hand cradles noodle packet; left hand extends slightly back for sneaky balance so both arms read cleanly
  const sneakArmL: [number, number] = [-36 + Math.sin(travelDist * 8) * 14 * walkW, -16 + Math.cos(travelDist * 8) * 12 * walkW];
  const packetCarryArm: [number, number] = [56 + Math.sin(travelDist * 8 - 0.5) * 6 * walkW, 44 + Math.cos(travelDist * 8) * 5 * walkW];
  let pose = mixPose({ ...walkPose, armL: sneakArmL, armR: packetCarryArm, look: 0.45 + Math.sin(t * 2.3) * 0.35 }, shushPose, freezeK);
  pose = { ...pose, armR: lerp2(packetCarryArm, shushPose.armR, freezeK) };

  const rikoP = toBean(RIKO, pose, t, 2, {
    apron: undefined,
    expr: talking ? "talk" : freezeK > 0.35 ? "worried" : "smug",
    mouthOpen: talking ? talkMouth(t) : 0,
    sweat: freezeK > 0.3,
  });
  const handPos = beanHandWorld(rikoP, "R", [rikoX, 0, 0.65], 2.05, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#16192b">
        <hemisphereLight args={["#8ba4d6", "#2f2430", 1.25]} />
        <directionalLight position={[1, 6, 6]} intensity={1.3} color="#ffe7ba" castShadow />
        <Ground color="#584f5c" size={24} />
        <InkBox pos={[0, 2.8, -1.1]} size={[18, 5.6, 0.25]} color="#d6c5ae" ink={0.05} />
        <InkBox pos={[0, 4.9, 1.0]} size={[18, 0.25, 5.5]} color="#bfb29f" ink={0.04} />
        <KosanDoorUnit pos={[-4.2, 0, -0.92]} num="01" color="#a16a42" />
        <KosanDoorUnit pos={[-1.9, 0, -0.92]} num="02" color="#a16a42" />
        <KosanDoorUnit pos={[0.4, 0, -0.92]} num="03" color="#a16a42" />
        <KosanDoorUnit pos={[2.7, 0, -0.92]} num="BU TINI" color="#7f1d1d" />
        <Sign pos={[-0.75, 2.96, -0.82]} w={2.2} h={0.44} text="KOS BU TINI · JAM MALAM 22.00" bg="#fef08a" fg="#991b1b" />
        <BeanCard position={[rikoX, 0, 0.65]} height={2.05} params={rikoP} />
        <NoodlePacket3D
          pos={[handPos[0] + 0.14, handPos[1], handPos[2] + 0.08]}
          rot={[0, 0.25, -0.12 + Math.sin(travelDist * 8) * 0.1 * walkW]}
          scale={0.74}
        />
      </Stage>
      <Grade cool={0.28} />
      <Tag label="OPERASI SENYAP · KORIDOR KOS" from={6} to={dur - 10} color="#60a5fa" />
      <Bubble x={540} y={320} w={520} size={40} text="JANGAN SAMPAI BU TINI BANGUN..." from={k2From - 4} to={dur - 8} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: DAPUR KOS — FULL-BODY FLUID 5-STAR CHEF + 3D WOK TOSS!    */
/* ================================================================== */
export const SceneMieChef: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("chef");
  const evMinyak = timing.events["chef.minyak"];
  const evWajan = timing.events["chef.wajan"];

  const cam = evalCam(f, [
    { kind: "orbit", to: 95, target0: [0.35, 1.55, -1.3], target1: [0.58, 1.48, -1.35], ang0: 0.62, ang1: 0.12, rad0: 7.3, rad1: 5.4, y0: 2.3, y1: 1.88, fov0: 40, fov1: 36 },
    { kind: "orbit", to: dur, target0: [0.58, 1.48, -1.35], target1: [0.52, 1.55, -0.95], ang0: 0.12, ang1: -0.36, rad0: 5.4, rad1: 6.7, y0: 1.88, y1: 2.1, fov0: 36, fov1: 39 },
  ]);

  const burnerOn = f >= 25;
  // Smooth continuous phase weights (ZERO 1-frame snaps!)
  const pourArmK = smoothStep(f, evMinyak - 22, 16) * (1 - smoothStep(f, evWajan - 16, 14));
  const oilTiltK = smoothStep(f, evMinyak - 8, 12) * (1 - smoothStep(f, evWajan - 20, 10));
  const tossK = smoothStep(f, evWajan - 12, 16);

  // Beat 1: Circular 2D figure-8 chef stirring right beside the wok with rhythmic knee groove
  const stirP = t * 5.2;
  const groove = Math.sin(t * 4.4);
  const stirPose: Pose = {
    legL: [6 + groove * 4, -10 - Math.max(0, -groove) * 10],
    legR: [-6 - groove * 4, -10 - Math.max(0, groove) * 10],
    armL: [-28 + Math.sin(stirP) * 6, 34 + Math.cos(stirP) * 8],
    // True 2D circular stirring reaching right over the wok!
    armR: [64 + Math.sin(stirP) * 18, 42 + Math.cos(stirP) * 22],
    lean: 7 + Math.sin(stirP) * 3.5,
    bob: Math.abs(Math.sin(t * 4.4)) * 7 - 3,
    headTilt: Math.sin(stirP - 0.6) * 6,
    squash: groove * 0.022,
    look: 0.65,
  };

  // Beat 2: Dramatic high-arc oil pour RIGHT INTO THE WOK with right hand (left hand smugly on hip!)
  const pourPose: Pose = {
    ...stirPose,
    legL: [10, -14],
    legR: [-8, -10],
    armL: [-38, 86], // proud chef hand on hip!
    armR: [96 + Math.sin(t * 7) * 4, 24 + Math.cos(t * 7) * 5],
    lean: 11 + oilTiltK * 5,
    bob: 4 + Math.sin(t * 3.2) * 4,
    headTilt: 7 - oilTiltK * 4,
    squash: 0.02 * oilTiltK,
    look: 0.8,
  };

  // Beat 3: Explosive rhythmic full-body wok-tossing ("wajan digoyang-goyang")!
  const tossPeriod = 15; // 2 tosses/sec
  const tossCycle = f >= evWajan - 14 ? ((f - (evWajan - 14)) % tossPeriod) / tossPeriod : 0;
  const tossAng = tossCycle * Math.PI * 2;
  const tossUp = Math.sin(tossAng);
  const tossLag = Math.sin(tossAng - 0.55);
  const tossCrouch = Math.max(0, -tossUp);
  const tossFlick = Math.max(0, tossUp);
  const tossPose: Pose = {
    legL: [8 + tossCrouch * 16, -10 - tossCrouch * 28],
    legR: [-6 + tossCrouch * 12, -10 - tossCrouch * 24],
    armL: [-38 - tossFlick * 38, -18 - tossLag * 24],
    armR: [62 + tossFlick * 46 - tossCrouch * 14, 38 + tossLag * 28],
    lean: 4 + tossCrouch * 11 - tossFlick * 10,
    bob: tossFlick * 15 - tossCrouch * 12,
    headTilt: -tossLag * 12,
    squash: tossFlick * 0.06 - tossCrouch * 0.055,
    look: 0.55,
  };

  let pose = mixPose(stirPose, pourPose, pourArmK);
  pose = mixPose(pose, tossPose, tossK);

  // Sync 3D Wok & jumping noodles directly to Riko's toss rhythm!
  const wokToss = tossK > 0.05 ? cl(Math.sin(tossCycle * Math.PI) * tossK) : 0;
  const miniFlame = tossK * (0.28 + 0.22 * wokToss + 0.05 * Math.sin(t * 24));

  // Position Riko cleanly to the left of the wok (wok at x=1.04) so his right hand interacts right at the wok without blocking it!
  const rikoPos: Vec3 = [0.16, 0, -0.45];
  const rikoP = toBean(RIKO, pose, t, 3, {
    expr: tossK > 0.45 ? "laugh" : "smug",
  });
  const handR = beanHandWorld(rikoP, "R", rikoPos, 2.08, cam.pos, false);
  const spatWrist = -0.35 + Math.cos(stirP) * 0.22 * (1 - tossK) + tossLag * 0.55 * tossK;
  const spatPos: Vec3 = lerpV(handR, [0.42, 1.18, -1.25], pourArmK);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#28232d">
        <KosanKitchenRoom burnerOn={burnerOn} scorchLevel={0} fireScale={miniFlame} wokToss={wokToss} t={t} />
        <BeanCard position={rikoPos} height={2.08} params={rikoP} />
        <Spatula3D pos={spatPos} rot={[lerpN(0.12, Math.PI / 2, pourArmK), 0.3, spatWrist]} scale={1.15} />
        {/* Smoothly appearing & tilting yellow cooking oil bottle in Riko's right hand pouring straight into the wok! */}
        {pourArmK > 0.05 && (
          <group position={handR} rotation={[0, 0, lerpN(-0.15, -1.22, oilTiltK)]} scale={pourArmK}>
            <P geo={() => <cylinderGeometry args={[0.09, 0.10, 0.44, 12]} />} color="#facc15" pos={[0, 0, 0]} hull={0.07} />
            {oilTiltK > 0.15 && (
              <P
                geo={() => <cylinderGeometry args={[0.022, 0.036, 0.65 * oilTiltK, 8]} />}
                color="#fde047"
                pos={[0.28, 0.22 - 0.12 * oilTiltK, -0.18]}
                rot={[0, 0, 1.22]}
                hull={0.05}
              />
            )}
          </group>
        )}
      </Stage>
      <Grade warm={0.22} />
      <Tag label="DAPUR BERSAMA · MODE CHEF" from={6} to={dur - 10} color="#f59e0b" />
      <Chip from={evWajan - 4} to={dur - 8} top={250} color="#ea580c">
        CHEF BINTANG LIMA!
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 4: API TAJAM MENYAMBAR & LEMARI GOSONG! (FLUID RECOIL!)      */
/* ================================================================== */
export const SceneMieMenyambar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("menyambar");
  const evApi = timing.events["sambar.api"];
  const evGosong = timing.events["sambar.gosong"];

  const flameK = smoothStep(f, evApi - 10, 32);
  const scorchK = smoothStep(f, evApi + 15, 120);
  const stepFn = (ff: number) => smoothStep(ff, evApi + 4, 44);
  const stepBack = stepFn(f);
  const stepVel = travelVel(f, stepFn);
  const flinchK = pulseBell(f, evApi - 4, evApi + 5, evApi + 18);
  const cowerK = smoothStep(f, evApi + 34, 20);

  const cam = evalCam(f, [
    { kind: "orbit", to: 95, target0: [1.0, 2.0, -1.6], target1: [0.85, 2.35, -1.6], ang0: -0.42, ang1: 0.28, rad0: 4.8, rad1: 5.2, y0: 1.15, y1: 1.35, fov0: 38, fov1: 42, roll0: 0, roll1: -8 },
    { kind: "orbit", to: dur, target0: [0.85, 2.35, -1.6], target1: [0.15, 2.05, -1.4], ang0: 0.28, ang1: -0.35, rad0: 5.2, rad1: 6.9, y0: 1.35, y1: 2.15, fov0: 42, fov1: 42, roll0: -8, roll1: -4 },
  ]);

  const rikoX = lerpN(0.65, -0.75, stepBack);
  const rikoZ = lerpN(-0.25, 0.85, stepBack);
  const stepDist = stepBack * 1.8;
  const walkW = cl(stepVel / 0.015);

  // Seamless continuity from Scene 3's stirring -> shock jump -> velocity-locked backward scramble -> trembling cower!
  const preCook: Pose = {
    ...breathIdle(t, 4),
    armR: [62 + Math.sin(t * 7) * 18, 48 + Math.cos(t * 7) * 20],
    lean: 6,
    look: 0.5,
  };
  const backWalk = smoothWalk(stepDist, walkW, t, "back", 4);
  const scramblePose: Pose = {
    ...backWalk,
    armL: [-82 + Math.sin(t * 16) * 24, -26 + Math.cos(t * 16) * 22],
    armR: [84 + Math.cos(t * 16) * 24, 34 + Math.sin(t * 16) * 22],
    lean: -15 - flinchK * 6,
    bob: backWalk.bob + flinchK * 16,
    headTilt: -10 + Math.sin(t * 14) * 5,
    squash: backWalk.squash + flinchK * 0.06,
    look: 0.8,
  };
  const shiver = Math.sin(t * 28) * 2.5;
  const cowerPose: Pose = {
    legL: [16, -30],
    legR: [-10, -24],
    armL: [-54 + shiver, -82 - shiver],
    armR: [54 - shiver, 82 + shiver],
    lean: -8 + shiver * 0.4,
    bob: -18 + Math.abs(Math.sin(t * 10)) * 3,
    headTilt: -14 + shiver * 0.8,
    squash: -0.035,
    look: 0.85,
  };

  let pose = mixPose(preCook, scramblePose, smoothStep(f, evApi - 4, 10));
  pose = mixPose(pose, cowerPose, cowerK);

  const rikoP = toBean(RIKO, pose, t, 4, {
    expr: flameK > 0.15 ? "scared" : "shock",
    sweat: true,
  });
  const spatHand = beanHandWorld(rikoP, "R", [rikoX, 0, rikoZ], 2.08, cam.pos, false);
  const spatDropK = smoothStep(f, evApi + 6, 20);
  const spatBounce = Math.sin(spatDropK * Math.PI) * 0.36;
  const spatPos: Vec3 =
    f < evApi + 6
      ? spatHand
      : [lerpN(spatHand[0], 0.35, spatDropK), lerpN(spatHand[1], 0.08, spatDropK) + spatBounce, lerpN(spatHand[2], 0.2, spatDropK)];

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evApi, evApi + 12, evGosong], 0.18)} bg="#22131d">
        <KosanKitchenRoom burnerOn scorchLevel={scorchK * 0.85} fireScale={0.22 + flameK * 1.15} t={t} smokeCloud={scorchK * 0.65} warmLight={0.85} />
        <BeanCard position={[rikoX, 0, rikoZ]} height={2.08} params={rikoP} />
        <Spatula3D
          pos={spatPos}
          rot={[lerpN(0.1, Math.PI / 2, spatDropK), 0.4 + spatDropK * 2.4, lerpN(-0.3, 0.8 + spatDropK * 3.2, spatDropK)]}
          scale={1.15}
        />
      </Stage>
      <Grade warm={0.35 + flameK * 0.55} flash={f >= evApi - 2 && f < evApi + 8 ? interpolate(f, [evApi - 2, evApi + 1, evApi + 8], [0, 0.45, 0], clamp) : 0} />
      <Chip from={evGosong - 6} to={dur - 8} top={215} color="#dc2626">
        LEMARI BU TINI GOSONG!
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: BLUNDER SIRAM GAYUNG AIR -> LEDAKAN API PLAFON!           */
/* ================================================================== */
export const SceneMieGayung: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("gayung");
  const evSiram = timing.events["gayung.siram"];
  const evBoom = timing.events["gayung.meledak"];

  const runFn = (ff: number) => smoothStep(ff, 0, evSiram - 4);
  const recoilFn = (ff: number) => smoothStep(ff, evBoom, 36);
  const runK = runFn(f);
  const recoilK = recoilFn(f);
  const runVel = travelVel(f, runFn);
  const recoilVel = travelVel(f, recoilFn);

  const splashK = cl((f - evSiram) / 56);
  const boomK = smoothStep(f, evBoom - 4, 24);
  const windUpK = pulseBell(f, evSiram - 16, evSiram - 4, evSiram + 6);
  const heaveK = pulseBell(f, evSiram - 4, evSiram + 10, evSiram + 46);
  const blastK = smoothStep(f, evBoom - 2, 10);

  const cam = evalCam(f, [
    { kind: "linear", to: evSiram, p0: [-2.8, 1.8, 5.8], p1: [-0.8, 2.0, 5.2], l0: [-1.4, 1.4, 0.2], l1: [0.3, 1.65, -1.2], fov0: 40, fov1: 36 },
    { kind: "orbit", to: evBoom - 2, target0: [0.65, 1.75, -1.4], target1: [1.0, 1.85, -1.6], ang0: -0.45, ang1: 0.35, rad0: 5.0, rad1: 4.6, y0: 2.05, y1: 1.85, fov0: 36, fov1: 34 },
    { kind: "orbit", to: evBoom + 26, target0: [0.85, 2.15, -1.55], target1: [0.15, 2.35, -1.35], ang0: 0.35, ang1: 0.12, rad0: 4.6, rad1: 8.2, y0: 1.85, y1: 2.25, fov0: 34, fov1: 45, roll0: 0, roll1: 6 },
    { kind: "orbit", to: dur, target0: [0.15, 2.35, -1.35], target1: [0.1, 2.45, -1.4], ang0: 0.12, ang1: -0.28, rad0: 8.2, rad1: 9.0, y0: 2.25, y1: 2.5, fov0: 45, fov1: 46, roll0: 6, roll1: 4 },
  ]);

  const rikoX = lerpN(-2.2, -0.35, runK) - recoilK * 1.15;
  const rikoZ = lerpN(1.1, -0.15, runK) + recoilK * 1.1;

  // 1) Distance-locked panic sprint carrying blue gayung!
  const sprintPose = smoothWalk(runK * 2.4, cl(runVel / 0.014), t, "run", 5);
  let pose: Pose = {
    ...sprintPose,
    armR: lerp2(sprintPose.armR, [58 + Math.sin(runK * 14) * 8, 42], 0.85),
    look: 0.7,
  };
  // 2) Athletic anticipation wind-up -> forward lunge heave splash!
  const windPose: Pose = {
    legL: [14, -26],
    legR: [-12, -20],
    armL: [-34, 48],
    armR: [12, 92],
    lean: -12,
    bob: -10,
    headTilt: -8,
    squash: -0.05,
    look: 0.8,
  };
  const heavePose: Pose = {
    legL: [24, -18],
    legR: [-22, -16],
    armL: [-48, 22],
    armR: [112, 22],
    lean: 20,
    bob: 8,
    headTilt: 10,
    squash: 0.055,
    look: 0.9,
  };
  pose = mixPose(pose, windPose, windUpK);
  pose = mixPose(pose, heavePose, heaveK);

  // 3) Violent explosion blast blowback with velocity-locked backward scramble!
  const blowWalk = smoothWalk(recoilK * 1.65, cl(recoilVel / 0.015), t, "back", 6);
  const blastPose: Pose = {
    ...blowWalk,
    armL: [-102 + Math.sin(t * 18) * 18, -28 + Math.cos(t * 18) * 20],
    armR: [98 + Math.cos(t * 18) * 18, 28 + Math.sin(t * 18) * 20],
    lean: -22,
    bob: blowWalk.bob + pulseBell(f, evBoom - 2, evBoom + 6, evBoom + 20) * 20,
    headTilt: -16 + Math.sin(t * 20) * 5,
    squash: blowWalk.squash + pulseBell(f, evBoom - 2, evBoom + 5, evBoom + 16) * 0.07,
    look: 0.85,
  };
  pose = mixPose(pose, blastPose, blastK);

  const rikoP = toBean(RIKO, pose, t, 5, {
    expr: boomK > 0.1 ? "scared" : "shock",
    sweat: true,
  });
  const gayungHand = beanHandWorld(rikoP, "R", [rikoX, 0, rikoZ], 2.08, cam.pos, false);
  const flash = f >= evBoom - 2 && f < evBoom + 14 ? interpolate(f, [evBoom - 2, evBoom + 2, evBoom + 14], [0, 0.82, 0], clamp) : 0;

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evBoom, evBoom + 8, evBoom + 16, evBoom + 24], 0.34)} bg="#221018">
        <KosanKitchenRoom burnerOn scorchLevel={0.78 + boomK * 0.22} fireScale={1.15 + boomK * 0.65} t={t * 1.25} smokeCloud={0.6 + boomK * 0.4} warmLight={0.85} />
        {boomK > 0.05 && <RealisticFlame3D pos={[1.04, 2.35, -1.62]} scale={0.78 * boomK} heightMul={1.55} t={t * 1.35} seed={14} />}
        <BeanCard position={[rikoX, 0, rikoZ]} height={2.08} params={rikoP} />
        <Gayung3D pos={gayungHand} rot={[0, 0, lerpN(-0.15, -1.15, heaveK) + windUpK * 0.55]} scale={1.15} hasWater={f < evSiram + 8} />
        {splashK > 0 && splashK < 1 && <WaterSplash3D pos={[0.72, 1.58, -1.25]} progress={splashK} />}
      </Stage>
      <Grade warm={0.55 + boomK * 0.45} flash={flash} flashCol="#fef08a" />
      <Stamp text="JANGAN SIRAM AIR KE MINYAK!" from={evBoom + 6} to={dur - 8} color="#dc2626" top={245} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: SATU KOSAN HEBOH & BU TINI MENDOBRAK! (FLUID PANIC + BOSS)*/
/* ================================================================== */
export const SceneMieHeboh: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("heboh");
  const evPintu = timing.events["heboh.pintu"];
  const evDobrak = timing.events["heboh.dobrak"];

  const cam = evalCam(f, [
    { kind: "linear", to: evDobrak - 8, p0: [-3.6, 1.9, 6.4], p1: [2.4, 1.95, 6.2], l0: [-2.8, 1.45, -0.5], l1: [2.0, 1.45, -0.5], fov0: 40, fov1: 38 },
    { kind: "orbit", to: dur, target0: [2.7, 1.45, 0.3], target1: [2.7, 1.55, 0.7], ang0: -0.22, ang1: 0.16, rad0: 5.8, rad1: 4.5, y0: 0.95, y1: 1.15, fov0: 40, fov1: 32, roll0: 0, roll1: 4 },
  ]);

  const d02 = smoothStep(f, evPintu - 6, 18);
  const d03 = smoothStep(f, evPintu + 16, 18);
  const d04 = smoothStep(f, evPintu + 38, 18);
  const dTini = smoothStep(f, evDobrak - 6, 14);

  const bagasFn = (ff: number) => smoothStep(ff, evPintu + 8, 68);
  const nisaFn = (ff: number) => smoothStep(ff, evPintu + 28, 68);
  const dediFn = (ff: number) => smoothStep(ff, evPintu + 48, 68);
  const tiniFn = (ff: number) => smoothStep(ff, evDobrak - 2, 42);

  const bagasRun = bagasFn(f);
  const nisaRun = nisaFn(f);
  const dediRun = dediFn(f);
  const tiniStep = tiniFn(f);

  // Distance-locked panic sprints for all 3 neighbors with natural pumping/waving elbows!
  const bagasWalk = smoothWalk(bagasRun * 9.2, cl(travelVel(f, bagasFn) / 0.012), t, "run", 11);
  const bagasP = toBean(
    BAGAS,
    { ...bagasWalk, armR: [68 + Math.sin(t * 14) * 10, 48 + Math.cos(t * 14) * 8], look: 0.8 },
    t,
    11,
    { expr: "shock", sweat: true, prop: "phone" }
  );

  const nisaWalk = smoothWalk(nisaRun * 7.3, cl(travelVel(f, nisaFn) / 0.012), t, "run", 13);
  const nisaP = toBean(
    NISA,
    {
      ...nisaWalk,
      armL: [-76 + Math.sin(t * 16) * 28, -28 + Math.cos(t * 16) * 24],
      armR: [76 + Math.cos(t * 16) * 28, 34 + Math.sin(t * 16) * 24],
      look: 0.85,
    },
    t,
    13,
    { expr: "scared", sweat: true }
  );

  const dediWalk = smoothWalk(dediRun * 5.8, cl(travelVel(f, dediFn) / 0.012), t, "run", 17);
  const dediP = toBean(DEDI, { ...dediWalk, look: 0.75 }, t, 17, { expr: "worried", sweat: true });

  // Heavy menacing boss stomp -> smooth settle into furious wide stance raising wet towel!
  const tiniWalk = smoothWalk(tiniStep * 1.4, cl(travelVel(f, tiniFn) / 0.015), t, "march", 8);
  const tiniRaiseK = smoothStep(f, evDobrak + 6, 22);
  const tiniBreathe = Math.sin(t * 4.2);
  const tiniStance: Pose = {
    legL: [10, -8],
    legR: [-10, -8],
    armL: [-34 + tiniBreathe * 4, 48 + tiniBreathe * 5],
    armR: [74 + tiniBreathe * 5, 38 - tiniBreathe * 4],
    lean: 10 + tiniBreathe * 1.8,
    bob: tiniBreathe * 3,
    headTilt: 5 + tiniBreathe * 2,
    squash: tiniBreathe * 0.018,
    look: 0.1,
  };
  let tiniPose = mixPose(tiniStance, tiniWalk, cl(travelVel(f, tiniFn) / 0.018));
  tiniPose = { ...tiniPose, armR: lerp2(tiniPose.armR, tiniStance.armR, tiniRaiseK) };

  const tiniPos: Vec3 = [2.7, 0, lerpN(-0.3, 0.95, tiniStep)];
  const tiniP = toBean(BU_TINI, tiniPose, t, 8, { expr: "angry" });
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, 2.15, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evDobrak, evDobrak + 8], 0.26)} bg="#221622">
        <hemisphereLight args={["#ffb48a", "#3a2228", 1.35]} />
        <directionalLight position={[-4, 6, 6]} intensity={1.6} color="#ffbe85" castShadow />
        <pointLight position={[6.2, 2.2, 1.0]} color="#ff6a1a" intensity={6 + Math.sin(t * 22) * 2} distance={14} />
        <Ground color="#584c58" size={24} />
        <InkBox pos={[0, 2.8, -1.1]} size={[18, 5.6, 0.25]} color="#d8c4ac" ink={0.05} />
        <KosanDoorUnit pos={[-3.4, 0, -0.92]} num="02" openAngle={-1.15 * d02} color="#a16a42" />
        <KosanDoorUnit pos={[-1.1, 0, -0.92]} num="03" openAngle={-1.15 * d03} color="#a16a42" />
        <KosanDoorUnit pos={[1.0, 0, -0.92]} num="04" openAngle={-1.15 * d04} color="#a16a42" />
        <KosanDoorUnit pos={[2.7, 0, -0.92]} num="BU TINI" openAngle={-1.25 * dTini} color="#7f1d1d" />

        {d02 > 0.2 && <BeanCard position={[lerpN(-3.4, 5.8, bagasRun), 0, lerpN(-0.2, 1.25, bagasRun)]} height={2.05} params={bagasP} />}
        {d03 > 0.2 && <BeanCard position={[lerpN(-1.1, 6.2, nisaRun), 0, lerpN(-0.2, 1.45, nisaRun)]} height={2.0} params={nisaP} />}
        {d04 > 0.2 && <BeanCard position={[lerpN(1.0, 6.8, dediRun), 0, lerpN(-0.2, 1.05, dediRun)]} height={2.08} params={dediP} />}

        {dTini > 0.15 && (
          <>
            <BeanCard position={tiniPos} height={2.15} params={tiniP} />
            <WetTowel3D pos={tiniHand} rot={[0.35, 0.3, 0.35 + tiniBreathe * 0.08]} scale={0.78} />
          </>
        )}
      </Stage>
      <Grade warm={0.45} />
      <Chip from={evDobrak - 2} to={dur - 8} top={215} color="#991b1b">
        BU TINI DATANG!!
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 7: JURUS HANDUK BASAH BU TINI & PLOT TWIST AROMA MIE!        */
/* ================================================================== */
export const SceneMieHanduk: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("handuk");
  const evLempar = timing.events["handuk.lempar"];
  const evPadam = timing.events["handuk.padam"];
  const evAroma = timing.events["handuk.aroma"];

  const throwK = smoothStep(f, evLempar, Math.max(20, evPadam - evLempar - 8));
  const landed = f >= evPadam - 6;
  const snuffK = smoothStep(f, evPadam - 6, 18);
  const sniffK = smoothStep(f, evAroma, 22);

  // Full athletic wind-up -> explosive whip-throw -> cool follow-through -> cute double-sniff aroma twist!
  const windK = pulseBell(f, evLempar - 22, evLempar - 4, evLempar + 8);
  const whipK = pulseBell(f, evLempar - 4, evLempar + 8, evLempar + 34);
  const sniffPulse =
    pulseBell(f, evAroma + 4, evAroma + 11, evAroma + 19) + pulseBell(f, evAroma + 22, evAroma + 29, evAroma + 38);

  const cam = evalCam(f, [
    { kind: "orbit", to: evPadam, target0: [0.15, 1.65, -0.5], target1: [0.75, 1.72, -1.25], ang0: -0.32, ang1: 0.28, rad0: 7.4, rad1: 6.2, y0: 2.15, y1: 1.95, fov0: 41, fov1: 38 },
    { kind: "orbit", to: evAroma + 18, target0: [0.75, 1.72, -1.25], target1: [0.18, 1.55, 0.0], ang0: 0.28, ang1: -0.14, rad0: 6.2, rad1: 6.4, y0: 1.95, y1: 1.85, fov0: 38, fov1: 38 },
    { kind: "orbit", to: dur, target0: [0.18, 1.55, 0.0], target1: [-0.08, 1.55, 0.25], ang0: -0.14, ang1: 0.12, rad0: 6.4, rad1: 5.9, y0: 1.85, y1: 1.75, fov0: 38, fov1: 36 },
  ]);

  const tiniPos: Vec3 = [-0.52, 0, 0.4];
  const rikoPos: Vec3 = [1.12, 0, 0.5];

  const tiniReady: Pose = {
    ...breathIdle(t, 9),
    armL: [-22, 34],
    armR: [52, 46],
    lean: 6,
    look: 0.65,
  };
  const tiniWind: Pose = {
    legL: [14, -26],
    legR: [-14, -22],
    armL: [36, 42],
    armR: [-26, 98],
    lean: -15,
    bob: -12,
    headTilt: -9,
    squash: -0.055,
    look: 0.75,
  };
  const tiniWhip: Pose = {
    legL: [22, -16],
    legR: [-22, -14],
    armL: [-48, 22],
    armR: [132, 18],
    lean: 19,
    bob: 10,
    headTilt: 8,
    squash: 0.06,
    look: 0.85,
  };
  const tiniDelight: Pose = {
    legL: [4, -6],
    legR: [-4, -6],
    armL: [-26 + Math.sin(t * 2.6) * 5, 58 + sniffPulse * 14],
    armR: [36 - Math.sin(t * 2.6) * 5, 62 + sniffPulse * 16],
    lean: 8 + sniffPulse * 5,
    bob: 3 + sniffPulse * 9 + Math.sin(t * 2.4) * 3,
    headTilt: -6 - sniffPulse * 10 + Math.sin(t * 2.2) * 3,
    squash: sniffPulse * 0.045 + Math.sin(t * 2.4) * 0.014,
    look: 0.4,
  };

  let tiniPose = mixPose(tiniReady, tiniWind, windK);
  tiniPose = mixPose(tiniPose, tiniWhip, whipK);
  tiniPose = mixPose(tiniPose, tiniDelight, sniffK);

  const tiniP = toBean(BU_TINI, tiniPose, t, 9, {
    expr: sniffK > 0.35 ? "happy" : landed ? "think" : "angry",
  });
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, 2.15, cam.pos, false);

  // Riko crouches trembling during fire -> slowly rises & tilts head in stunned disbelief!
  const peekK = smoothStep(f, evAroma - 4, 24);
  const rShiver = Math.sin(t * 26) * 3 * (1 - peekK);
  const rikoCrouch: Pose = {
    legL: [22, -38],
    legR: [-12, -32],
    armL: [-54 + rShiver, -88],
    armR: [54 - rShiver, 88],
    lean: -10,
    bob: -28 + Math.abs(rShiver),
    headTilt: -10 + rShiver,
    squash: -0.045,
    look: 0.7,
  };
  const rikoStunned: Pose = {
    ...breathIdle(t, 2),
    armL: [-18, 28],
    armR: [24, 34],
    lean: -3,
    headTilt: -12 + Math.sin(t * 2.2) * 3,
    look: 0.85,
  };
  const rikoP = toBean(RIKO, mixPose(rikoCrouch, rikoStunned, peekK), t, 2, {
    expr: sniffK > 0.35 ? "shock" : "scared",
    sweat: true,
  });

  const wokTop: Vec3 = [1.04, 1.74, -1.62];
  const towelPos: Vec3 =
    f < evLempar
      ? tiniHand
      : landed
        ? wokTop
        : [
            lerpN(tiniHand[0], wokTop[0], throwK),
            lerpN(tiniHand[1], wokTop[1], throwK) + Math.sin(throwK * Math.PI) * 1.45,
            lerpN(tiniHand[2], wokTop[2], throwK),
          ];

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evPadam - 6], 0.14)} bg="#24202c">
        <KosanKitchenRoom
          burnerOn={!landed}
          scorchLevel={0.95}
          fireScale={Math.max(0, 1.35 * (1 - snuffK))}
          t={t}
          smokeCloud={Math.max(0.15, 0.75 * (1 - snuffK * 0.7))}
          warmLight={landed ? 1.15 : 0.9}
        />
        <BeanCard position={rikoPos} height={2.05} flip params={rikoP} />
        <BeanCard position={tiniPos} height={2.15} params={tiniP} />
        <WetTowel3D
          pos={towelPos}
          rot={[landed ? 0 : throwK * 2.8, landed ? 0.1 : throwK * 2.0, landed ? 0 : 0.4 + windK * 0.5]}
          scale={landed ? 1.18 : 0.85}
        />
        {landed &&
          Array.from({ length: 7 }).map((_, i) => {
            const k = (t * 0.85 + i * 0.145) % 1;
            const ax = lerpN(1.04, -0.45, k * (sniffK > 0.1 ? 1 : 0.25)) + Math.sin(t * 4 + i) * 0.08;
            const ay = 1.62 + Math.sin(k * Math.PI) * 0.42 + (i % 2) * 0.08;
            const az = lerpN(-1.5, 0.35, k * (sniffK > 0.1 ? 1 : 0.25));
            return (
              <mesh key={i} position={[ax, ay, az]}>
                <sphereGeometry args={[0.075 + k * 0.075, 10, 8]} />
                <meshBasicMaterial color={sniffK > 0.15 ? "#fde047" : "#f8fafc"} transparent opacity={Math.sin(k * Math.PI) * 0.42} depthWrite={false} />
              </mesh>
            );
          })}
      </Stage>
      <Grade warm={sniffK > 0.2 ? 0.42 : 0.18} />
      <Bubble x={540} y={245} w={520} size={46} text="KOK WANGI BANGET?!" from={evAroma - 2} to={dur - 8} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 8: ENDING KOCAK — LIVELY 5-CHARACTER NOODLE FEAST!           */
/* ================================================================== */
export const SceneMieMakan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("makan");
  const m2From = timing.lines.m2.from;
  const m2To = timing.lines.m2.to;
  const talking = f >= m2From && f <= m2To;
  const talkK = smoothStep(f, m2From - 6, 12) * (1 - smoothStep(f, m2To - 4, 12));

  const cam = evalCam(f, [
    { kind: "orbit", to: dur, target0: [0.0, 1.5, 0.0], target1: [0.0, 2.0, -0.55], ang0: -0.2, ang1: 0.18, rad0: 8.2, rad1: 9.8, y0: 1.75, y1: 3.15, fov0: 40, fov1: 43 },
  ]);

  // Helper for rhythmic joyful noodle-eating pose (lifting bowl to slurp, happy sway & head nod!)
  const eatPose = (seed: number, bowlSide: "L" | "R"): Pose => {
    const slurp = Math.pow(Math.max(0, Math.sin(t * 2.1 + seed)), 1.6);
    const sway = Math.sin(t * 2.8 + seed);
    const bowlArm: [number, number] =
      bowlSide === "R" ? [46 + slurp * 18, 44 + slurp * 26] : [-46 - slurp * 18, -44 - slurp * 26];
    const freeArm: [number, number] =
      bowlSide === "R" ? [-24 + sway * 8, 56 + slurp * 34] : [24 - sway * 8, 56 + slurp * 34];
    return {
      legL: [4 + sway * 2.5, -7 - Math.max(0, -sway) * 4],
      legR: [-4 - sway * 2.5, -7 - Math.max(0, sway) * 4],
      armL: bowlSide === "L" ? bowlArm : freeArm,
      armR: bowlSide === "R" ? bowlArm : freeArm,
      lean: 3 + slurp * 6 + sway * 2,
      bob: Math.abs(sway) * 5 - slurp * 4,
      headTilt: slurp * 9 + Math.sin(t * 2.8 + seed - 0.5) * 4,
      squash: sway * 0.016 - slurp * 0.02,
      look: sway * 0.25,
    };
  };

  const bagasPose = eatPose(0.4, "R");
  const nisaPose = eatPose(2.1, "L");
  const dediBase = eatPose(3.6, "R");
  const dediPose: Pose = {
    ...dediBase,
    bob: dediBase.bob + Math.abs(Math.sin(t * 6.5)) * 4,
    headTilt: Math.sin(t * 6.5 - 0.4) * 6,
    squash: Math.sin(t * 6.5) * 0.022,
  };

  // Bu Tini eats happily -> smoothly raises playful scolding hand & nods warmly during punchline!
  const tiniEat = eatPose(1.1, "L");
  const wag = Math.sin(t * 10.5);
  const tiniLecture: Pose = {
    ...tiniEat,
    armR: [96 + wag * 14, 38 + Math.cos(t * 10.5) * 14],
    lean: 6 + wag * 2.5,
    bob: 4 + Math.abs(wag) * 4,
    headTilt: 4 + wag * 6,
    squash: wag * 0.018,
    look: 0.55,
  };
  const tiniPose = mixPose(tiniEat, tiniLecture, talkK);

  // Riko eats happily -> bounces laughing sheepishly when Bu Tini tells him to repaint the cabinet!
  const rikoEat = eatPose(2.8, "R");
  const chuckle = Math.sin(t * 9.5);
  const rikoLaugh: Pose = {
    ...rikoEat,
    armL: [-34 + chuckle * 10, 74 + chuckle * 12],
    lean: -4 + chuckle * 3,
    bob: Math.abs(chuckle) * 8,
    headTilt: -6 + chuckle * 7,
    squash: chuckle * 0.028,
    look: -0.45,
  };
  const rikoPose = mixPose(rikoEat, rikoLaugh, talkK);

  const bagasP = toBean(BAGAS, bagasPose, t, 3, { expr: "happy" });
  const tiniP = toBean(BU_TINI, tiniPose, t, 1, { expr: talking ? "talk" : "happy", mouthOpen: talking ? talkMouth(t) : 0 });
  const rikoP = toBean(RIKO, rikoPose, t, 2, { expr: talkK > 0.35 ? "laugh" : "happy", sweat: talkK > 0.35 });
  const nisaP = toBean(NISA, nisaPose, t, 4, { expr: "happy" });
  const dediP = toBean(DEDI, dediPose, t, 5, { expr: "laugh" });

  const bagasPos: Vec3 = [-1.52, 0, -0.18];
  const tiniPos: Vec3 = [-0.56, 0, 0.72];
  const dediPos: Vec3 = [0.0, 0, -0.18];
  const rikoPos: Vec3 = [0.56, 0, 0.72];
  const nisaPos: Vec3 = [1.52, 0, -0.18];

  const tiniBowl = beanHandWorld(tiniP, "L", tiniPos, 2.12, cam.pos, false);
  const rikoBowl = beanHandWorld(rikoP, "R", rikoPos, 2.05, cam.pos, false);
  const bagasBowl = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, false);
  const nisaBowl = beanHandWorld(nisaP, "L", nisaPos, 1.98, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#3b2c26">
        <KosanKitchenRoom burnerOn={false} scorchLevel={0.95} fireScale={0} t={t} smokeCloud={0} warmLight={1.35} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={tiniPos} height={2.12} params={tiniP} />
        <BeanCard position={dediPos} height={2.05} params={dediP} />
        <BeanCard position={rikoPos} height={2.05} params={rikoP} />
        <BeanCard position={nisaPos} height={1.98} params={nisaP} />
        <NoodleBowl3D pos={[tiniBowl[0], tiniBowl[1] + 0.08, tiniBowl[2] + 0.1]} scale={0.92} t={t} steam />
        <NoodleBowl3D pos={[rikoBowl[0], rikoBowl[1] + 0.08, rikoBowl[2] + 0.1]} scale={0.92} t={t + 0.4} steam />
        <NoodleBowl3D pos={[bagasBowl[0], bagasBowl[1] + 0.08, bagasBowl[2] + 0.1]} scale={0.86} t={t + 0.25} steam />
        <NoodleBowl3D pos={[nisaBowl[0], nisaBowl[1] + 0.08, nisaBowl[2] + 0.1]} scale={0.86} t={t + 0.65} steam />
        <NoodleBowl3D pos={[0.25, 1.15, -1.35]} scale={1.1} t={t + 0.2} steam />
      </Stage>
      <Grade warm={0.38} />
      <Bubble x={540} y={245} w={580} size={40} text="BESOK CAT ULANG, TAMBAH TELOR!" from={m2From - 4} to={250} />
      <Chip from={254} to={dur - 4} top={195} color="#dc2626">
        MIE JAM 2 PAGI · EMANG BEDA!
      </Chip>
    </AbsoluteFill>
  );
};

export const MIE_SCENES: Record<MieScene, React.FC> = {
  hook: SceneMieHook,
  koridor: SceneMieKoridor,
  chef: SceneMieChef,
  menyambar: SceneMieMenyambar,
  gayung: SceneMieGayung,
  heboh: SceneMieHeboh,
  handuk: SceneMieHanduk,
  makan: SceneMieMakan,
};

export const DissolveMie: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= 10 ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / 10);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

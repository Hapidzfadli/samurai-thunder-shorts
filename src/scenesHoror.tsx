import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./horor_timing.json";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import {
  Flashlight3D,
  GorenganBasket3D,
  HauntedMansionYard,
  PhoneGimbal3D,
  PisangGoreng3D,
  SpookyAura3D,
  ThermosCoffeeSet3D,
} from "./three/objectsHoror";
import { BAGAS_HOROR, DEDI_HOROR, MAS_POCONG, MBAK_KUNTI, RIKO_HOROR } from "./SheetHoror";

export type HororScene = "hook" | "masuk" | "muncul" | "tawar" | "curhat" | "viral" | "foto" | "ending";
export const HOROR_ORDER = timing.order as HororScene[];
export const DUR_HOROR = (k: HororScene): number => timing.scenes[k].durationInFrames;
export const TOTAL_FRAMES_HOROR = timing.totalFrames;

const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];

/* Exact world tabletop positions on the stone yard table (group=[-0.65,0,-0.35], top y=0.725) */
const GORENGAN_TABLE_POS: Vec3 = [-0.95, 0.725, -0.16];
const THERMOS_TABLE_POS: Vec3 = [-0.14, 0.725, -0.22];

/* ================================================================== */
/* TRUE 3D CINEMATIC CAMERA ENGINE (ORBIT + CRANE + DUTCH TILT)       */
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
      const fov0 = s.fov0 ?? 40;
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
  return { pos: [0, 2.2, 8], look: [0, 1.5, -1], fov: 42, roll: 0 };
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
  bg = "#0c1026",
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

/* Clean Color Grade WITHOUT SwANGLE-buggy backdropFilter blur */
const Grade: React.FC<{ warm?: number; cool?: number; flash?: number; flashCol?: string }> = ({
  warm = 0,
  cool = 0,
  flash = 0,
  flashCol = "#ffffff",
}) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: warm > 0 ? `rgba(255,165,65,${0.35 * warm})` : `rgba(56,110,245,${0.32 * cool})`,
        }}
      />
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 44%, rgba(0,0,0,0) 54%, rgba(8,8,20,0.48) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(10,10,24,0) 70%, rgba(10,10,24,0.48) 88%, rgba(10,10,24,0.72) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: flashCol, opacity: flash }} />}
  </>
);

const Tag: React.FC<{ label: string; from?: number; to: number; color?: string; top?: number }> = ({
  label,
  from = 0,
  to,
  color = "#38bdf8",
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
        background: "rgba(15,18,36,0.92)",
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
  color = "#7c3aed",
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
          fontSize: 58,
          color: "#1a121c",
          boxShadow: "0 14px 34px rgba(0,0,0,0.42)",
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
  w = 560,
  text,
  size = 38,
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
          boxShadow: "0 10px 26px rgba(0,0,0,0.32)",
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
  top = 280,
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
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const HororCaptions: React.FC = () => {
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
          WebkitTextStroke: "6px rgba(18,10,28,0.96)",
          paintOrder: "stroke fill",
          textShadow: "0 8px 0 rgba(18,10,28,0.75)",
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

type WalkStyle = "sneak" | "run" | "march";
const WALK_CFG: Record<
  WalkStyle,
  { stride: number; thigh: number; crouch: number; baseKnee: number; liftKnee: number; pushKnee: number; arm: number; bob: number; lean: number; sq: number }
> = {
  sneak: { stride: 0.72, thigh: 28, crouch: 13, baseKnee: 16, liftKnee: 46, pushKnee: 24, arm: 18, bob: 9, lean: 14, sq: 0.032 },
  run: { stride: 1.05, thigh: 40, crouch: 8, baseKnee: 10, liftKnee: 54, pushKnee: 34, arm: 52, bob: 17, lean: 14, sq: 0.045 },
  march: { stride: 0.86, thigh: 34, crouch: 5, baseKnee: 8, liftKnee: 44, pushKnee: 24, arm: 38, bob: 13, lean: 9, sq: 0.038 },
};

const smoothWalk = (dist: number, weight: number, t: number, style: WalkStyle = "sneak", seed = 0): Pose => {
  const cfg = WALK_CFG[style];
  const base = breathIdle(t, seed);
  const w = smoother(cl(weight));
  if (w < 0.001) return base;
  const p = (dist / cfg.stride) * Math.PI * 2 + seed;
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
    bob: strideHigh * cfg.bob - (style === "sneak" ? 12 : 4),
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

/* ================================================================== */
/* SCENE 1: HOOK — CRANE-SWOOP FROM FULL MOON TO HAUNTED GATE!        */
/* ================================================================== */
export const SceneHororHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("hook");
  const evGoreng = timing.events["hook.goreng"];
  const pivotBagas = Math.min(evGoreng - 8, 225);

  const cam = evalCam(f, [
    // Beat 1: Pixar crane-swoop down from glowing 3D Full Moon & Colonial Roof onto front iron gate trio!
    {
      kind: "linear",
      to: 125,
      p0: [-1.15, 2.55, 11.4],
      p1: [-1.35, 1.92, 10.25],
      l0: [1.35, 4.15, -6.5],
      l1: [0.0, 1.42, 4.35],
      fov0: 50,
      fov1: 43,
      roll0: 0,
      roll1: -2.5,
    },
    // Beat 2: Smooth moody orbit across the trembling trio in front of the haunted colonial gate!
    {
      kind: "orbit",
      to: pivotBagas,
      target0: [0.0, 1.42, 4.35],
      target1: [0.0, 1.40, 4.35],
      ang0: -0.22,
      ang1: -0.10,
      rad0: 6.05,
      rad1: 6.15,
      y0: 1.92,
      y1: 1.88,
      fov0: 43,
      fov1: 42,
      roll0: -2.5,
      roll1: -1.5,
    },
    // Beat 3: Orbit right to spotlight Bagas casually holding steaming Pisang Goreng beside trembling Riko!
    {
      kind: "orbit",
      to: dur,
      target0: [0.0, 1.40, 4.35],
      target1: [0.35, 1.38, 4.42],
      ang0: -0.10,
      ang1: 0.30,
      rad0: 6.15,
      rad1: 5.85,
      y0: 1.88,
      y1: 1.76,
      fov0: 42,
      fov1: 41,
      roll0: -1.5,
      roll1: 0,
    },
  ]);

  const shiver = Math.sin(t * 22);
  const rikoPose: Pose = {
    legL: [14 + shiver * 3, -24],
    legR: [-14 - shiver * 3, -24],
    armL: [-32, 62 + shiver * 5],
    armR: [68 + shiver * 4, 38],
    lean: 6 + shiver * 1.5,
    bob: -6 + Math.abs(shiver) * 3,
    headTilt: -4 + shiver * 3,
    squash: -0.025,
    look: 0.35,
  };
  const dediPose: Pose = {
    ...breathIdle(t, 3),
    armL: [-18, 34],
    armR: [66 + Math.sin(t * 2.4) * 14, 24],
    lean: 5,
    headTilt: Math.sin(t * 2.4) * 6,
    look: Math.sin(t * 2.4) * 0.7,
  };
  const bagasPose: Pose = {
    ...breathIdle(t, 2),
    armL: [-26, 48],
    armR: [58 + Math.sin(t * 2.5) * 6, 48 + Math.cos(t * 2.5) * 6],
    lean: -3,
    headTilt: Math.sin(t * 1.8) * 5,
    look: -0.35,
  };

  const rikoPos: Vec3 = [-0.95, 0, 4.55];
  const dediPos: Vec3 = [-0.02, 0, 4.18];
  const bagasPos: Vec3 = [0.95, 0, 4.62];

  const rikoP = toBean(RIKO_HOROR, rikoPose, t, 1, { expr: "scared", sweat: true });
  const dediP = toBean(DEDI_HOROR, dediPose, t, 2, { expr: "worried", sweat: true });
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: "happy" });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);
  const dediHand = beanHandWorld(dediP, "R", dediPos, 2.02, cam.pos, false);
  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#0a0e24" fog={["#0f1635", 16, 46]}>
        <HauntedMansionYard t={t} cozy={0} />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={dediPos} height={2.02} params={dediP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.12]} rot={[0.05, 0.2, -0.1]} scale={0.78} />
        <Flashlight3D pos={[dediHand[0], dediHand[1], dediHand[2] + 0.08]} rot={[0.08, Math.PI + Math.sin(t * 2.4) * 0.4, 0]} beam={0.85} t={t} scale={0.85} />
        <GorenganBasket3D pos={[bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.16]} scale={0.82} t={t} steam />
      </Stage>
      <Grade cool={0.28} />
      <Tag label="KOS BU TINI EP. 3 · MALAM JUMAT" from={6} to={pivotBagas - 6} color="#38bdf8" />
      <Chip from={pivotBagas + 12} to={dur - 6} top={158} color="#f59e0b">
        UJI NYALI BAWA GORENGAN?!
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 2: MASUK — SNEAK WALK + VOLUMETRIC SENTER + 🐱 KUCING OREN #1 */
/* ================================================================== */
export const SceneHororMasuk: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("masuk");
  const evKedip = timing.events["masuk.berkedip"];
  const evBeringin = timing.events["masuk.beringin"];

  const walkKFn = (ff: number) => smoothStep(ff, 0, Math.max(40, evKedip - 6));
  const walkK = walkKFn(f);
  const walkDist = walkK * 2.15;
  const walkVel = cl((travelVel(f, walkKFn) * 2.15) / 0.025);
  const freezeK = smoothStep(f, evKedip - 6, 12);

  const zPos = lerpN(2.75, 1.05, walkK);
  const cam = evalCam(f, [
    // Low moody 3D tracking orbit sneaking into the misty colonial yard (+ Easter Egg Kucing Oren #1!)
    {
      kind: "orbit",
      to: evKedip,
      target0: [0.0, 1.35, 2.35],
      target1: [0.15, 1.38, 0.85],
      ang0: -0.44,
      ang1: 0.34,
      rad0: 6.4,
      rad1: 6.3,
      y0: 1.48,
      y1: 1.85,
      fov0: 44,
      fov1: 43,
    },
    // Dramatic eerie crane-tilt looking past the trio toward flickering porch lamp & swaying banyan tree!
    {
      kind: "orbit",
      to: dur,
      target0: [0.15, 1.38, 0.85],
      target1: [-0.85, 2.05, -2.25],
      ang0: 0.34,
      ang1: -0.18,
      rad0: 6.3,
      rad1: 7.4,
      y0: 1.85,
      y1: 2.15,
      fov0: 43,
      fov1: 45,
      roll0: 0,
      roll1: -4.0,
    },
  ]);

  const sneakRiko = smoothWalk(walkDist, walkVel, t, "sneak", 1);
  const sneakDedi = smoothWalk(walkDist, walkVel, t, "sneak", 2);
  const sneakBagas = smoothWalk(walkDist, walkVel, t, "march", 3);

  const lampZap = f >= evKedip - 2 && f <= evKedip + 24 ? (Math.sin(f * 2.7) > 0.2 ? 0.38 : 0) : 0;

  const rikoPose = mixPose(
    { ...sneakRiko, armR: [62, 42] },
    { ...breathIdle(t, 1), armL: [-54, 48], armR: [66, 42], lean: -8, look: -0.6 },
    freezeK
  );
  const dediPose = mixPose(
    { ...sneakDedi, armR: [74 + Math.sin(t * 2.6) * 16, 18] },
    { ...breathIdle(t, 2), armL: [-38, 42], armR: [84, 18], lean: -6, look: -0.7 },
    freezeK
  );
  const bagasPose: Pose = {
    ...sneakBagas,
    armR: [56, 48],
    look: 0.25,
  };

  const rikoPos: Vec3 = [-0.95, 0, zPos + 0.15];
  const dediPos: Vec3 = [0.02, 0, zPos];
  const bagasPos: Vec3 = [0.95, 0, zPos + 0.25];

  const rikoP = toBean(RIKO_HOROR, rikoPose, t, 1, { expr: freezeK > 0.3 ? "scared" : "worried", sweat: true });
  const dediP = toBean(DEDI_HOROR, dediPose, t, 2, { expr: freezeK > 0.3 ? "shock" : "worried", sweat: true });
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: "smug" });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);
  const dediHand = beanHandWorld(dediP, "R", dediPos, 2.02, cam.pos, false);
  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evKedip, evBeringin], 0.11)} bg="#0a0e24" fog={["#0f1635", 14, 42]}>
        {/* Easter Egg Kucing Oren #1 sitting right beside the stone yard table! */}
        <HauntedMansionYard t={t} cozy={0} showCat hideGate />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={dediPos} height={2.02} params={dediP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.12]} rot={[0.05, 0.2, -0.1]} scale={0.76} />
        <Flashlight3D
          pos={[dediHand[0], dediHand[1], dediHand[2] + 0.08]}
          rot={[0.12, Math.PI + Math.sin(t * 2.5) * 0.52 - freezeK * 0.35, 0]}
          beam={1.05}
          t={t}
          scale={0.9}
        />
        <GorenganBasket3D pos={[bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.16]} scale={0.82} t={t} steam />
      </Stage>
      <Grade cool={0.34} flash={lampZap} flashCol="#fef08a" />
      <Tag label="HALAMAN RUMAH TUA · 00:00 WIB" from={6} to={dur - 8} color="#a855f7" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: MUNCUL — 105° LOW-ANGLE HORROR ORBIT! POCONG & KUNTI!     */
/* ================================================================== */
export const SceneHororMuncul: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("muncul");
  const evPocong = timing.events["muncul.pocong"];
  const evKunti = timing.events["muncul.kunti"];
  const evMembeku = timing.events["muncul.membeku"];

  const cam = evalCam(f, [
    // Beat 1: SIGNATURE LOW-ANGLE HORROR ORBIT clearly revealing BOTH Kang Pocong & Mbak Kunti!
    {
      kind: "orbit",
      to: evMembeku - 6,
      target0: [-0.08, 1.52, -1.05],
      target1: [-0.08, 1.48, -1.05],
      ang0: -0.42,
      ang1: 0.42,
      rad0: 6.45,
      rad1: 6.15,
      y0: 1.45,
      y1: 2.02,
      fov0: 45,
      fov1: 44,
      roll0: -3.8,
      roll1: 3.8,
    },
    // Beat 2: Whip-orbit onto Riko & Mas Dedi frozen solid like statues with Bagas casually watching!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.08, 1.48, -1.05],
      target1: [-0.12, 1.42, 1.55],
      ang0: 0.42,
      ang1: -0.14,
      rad0: 6.15,
      rad1: 7.65,
      y0: 2.02,
      y1: 1.82,
      fov0: 44,
      fov1: 46,
      roll0: 3.8,
      roll1: -2.8,
    },
  ]);

  const pocongK = smoothStep(f, Math.max(0, evPocong - 24), 40);
  const kuntiK = smoothStep(f, Math.max(4, evPocong - 14), 46);
  const freezeK = smoothStep(f, evMembeku - 8, 12);
  const auraK = smoothStep(f, Math.max(0, evPocong - 14), 18);

  // Kang Pocong rhythmic boing-boing parabolic hops emerging from the banyan tree!
  const hopPhase = pocongK * 3 * Math.PI;
  const hopY = Math.abs(Math.sin(hopPhase)) * 0.56 * (1 - smoothStep(f, evPocong + 38, 16)) + Math.abs(Math.sin(t * 3.8)) * 0.14;
  const pocongPos: Vec3 = [lerpN(-3.25, -1.02, pocongK), hopY, lerpN(-2.15, -1.08, pocongK)];
  const pocongPose: Pose = {
    ...breathIdle(t, 4),
    lean: Math.sin(hopPhase) * 8,
    bob: 4,
    headTilt: Math.sin(t * 4) * 5,
    squash: (hopY > 0.25 ? 0.065 : -0.055) * (1 - smoothStep(f, evPocong + 38, 16)),
    look: 0.45,
  };

  // Mbak Kunti floating eerily down from 2nd-floor balcony with outstretched spooky arms!
  const kuntiPos: Vec3 = [
    lerpN(1.55, 0.88, kuntiK),
    lerpN(3.25, 0.34, kuntiK) + Math.sin(t * 2.8) * 0.12,
    lerpN(-2.65, -1.08, kuntiK),
  ];
  const kuntiPose: Pose = {
    ...breathIdle(t, 5),
    armL: [-82 + Math.sin(t * 4) * 10, 22],
    armR: [84 - Math.sin(t * 4) * 10, 22],
    lean: 12,
    headTilt: -8 + Math.sin(t * 3) * 5,
    look: -0.5,
  };

  // Riko & Mas Dedi frozen stiff in hilarious comic terror!
  const tremor = Math.sin(t * 32) * 1.8 * freezeK;
  const frozenPanic = (s: number): Pose => ({
    legL: [12, -24],
    legR: [-12, -24],
    armL: [-96, -24],
    armR: [96, 24],
    lean: -14 + tremor,
    bob: -8,
    headTilt: -10 + tremor,
    squash: -0.04,
    look: s === 1 ? 0.2 : -0.2,
  });

  const rikoPos: Vec3 = [-1.18, 0, 1.55];
  const dediPos: Vec3 = [-0.04, 0, 1.62];
  const bagasPos: Vec3 = [1.12, 0, 1.58];

  const pocongP = toBean(MAS_POCONG, pocongPose, t, 4, { expr: "angry", tired: true });
  const kuntiP = toBean(MBAK_KUNTI, kuntiPose, t, 5, { expr: "angry", tired: true });
  const rikoP = toBean(RIKO_HOROR, mixPose(breathIdle(t, 1), frozenPanic(1), freezeK), t, 1, { expr: "shock", sweat: true });
  const dediP = toBean(DEDI_HOROR, mixPose(breathIdle(t, 2), frozenPanic(2), freezeK), t, 2, { expr: "shock", sweat: true });
  const bagasP = toBean(BAGAS_HOROR, { ...breathIdle(t, 3), armR: [54, 48] }, t, 3, { expr: "smug" });

  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evPocong, evKunti, evMembeku], 0.20)} bg="#080c1e" fog={["#121638", 12, 38]}>
        <HauntedMansionYard t={t} cozy={0} hideGate />
        <pointLight position={[-1.2, 2.2, -0.8]} color="#38bdf8" intensity={3.8 * auraK} distance={9} />
        <pointLight position={[0.9, 2.4, -0.8]} color="#a855f7" intensity={3.8 * auraK} distance={9} />

        <BeanCard position={pocongPos} height={2.08} params={pocongP} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip />
        {/* Show foreground trio clearly once camera whips back onto them (no ghost-blocking in Beat 1!) */}
        {f >= evMembeku - 20 && (
          <>
            <BeanCard position={rikoPos} height={2.02} params={rikoP} />
            <BeanCard position={dediPos} height={2.02} params={dediP} />
            <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
            <GorenganBasket3D pos={[bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.16]} scale={0.82} t={t} steam />
          </>
        )}

        {auraK > 0.05 && (
          <>
            <SpookyAura3D pos={[-1.02, 0.15, -1.08]} scale={1.12 * auraK} t={t} />
            <SpookyAura3D pos={[0.88, 0.15, -1.08]} scale={1.12 * auraK} t={t + 0.5} />
          </>
        )}
      </Stage>
      <Grade cool={0.38} flash={pulseBell(f, evPocong - 1, evPocong + 2, evPocong + 9) * 0.48} flashCol="#bae6fd" />
      <Stamp text="PENAMPAKAN GANDA!!" from={evPocong - 2} to={evMembeku + 14} color="#7c3aed" top={195} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 4: TAWAR — PLOT TWIST PISANG GORENG! MOOD HOROR -> HANGAT!   */
/* ================================================================== */
export const SceneHororTawar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("tawar");
  const evGorengan = timing.events["tawar.gorengan"];
  const evBerbinar = timing.events["tawar.berbinar"];

  const cozyK = smoothStep(f, Math.max(142, evBerbinar - 78), 44);
  const stepKFn = (ff: number) => smoothStep(ff, 0, Math.max(24, evGorengan + 8));
  const stepK = stepKFn(f);
  const stepVel = cl((travelVel(f, stepKFn) * 1.4) / 0.03);

  const cam = evalCam(f, [
    // Beat 1: Whip-orbit onto Bagas calmly setting steaming Gorengan & Thermos onto the stone yard table!
    {
      kind: "orbit",
      to: evBerbinar - 28,
      target0: [-0.25, 1.25, 0.25],
      target1: [-0.55, 1.15, -0.25],
      ang0: 0.48,
      ang1: -0.22,
      rad0: 5.8,
      rad1: 5.1,
      y0: 1.85,
      y1: 1.68,
      fov0: 42,
      fov1: 41,
    },
    // Beat 2: Warm glowing orbit revealing Kang Pocong & Mbak Kunti's starry-eyed happy faces over the snacks!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.55, 1.15, -0.25],
      target1: [-0.45, 1.38, -0.82],
      ang0: -0.22,
      ang1: 0.32,
      rad0: 5.1,
      rad1: 6.45,
      y0: 1.68,
      y1: 1.92,
      fov0: 41,
      fov1: 44,
    },
  ]);

  const bagasPos: Vec3 = lerpV([0.95, 0, 1.25], [0.22, 0, 0.52], stepK);
  const offerK = smoothStep(f, evGorengan - 8, 16);
  const bagasWalk = smoothWalk(stepK * 1.4, stepVel, t, "march", 3);
  const bagasOffer: Pose = {
    ...breathIdle(t, 3),
    armL: [-28, 52],
    armR: [76 + Math.sin(t * 3) * 6, 38],
    lean: 10,
    headTilt: 4,
    look: -0.5,
  };
  const bagasPose = mixPose(bagasWalk, bagasOffer, offerK);

  // Kang Pocong & Mbak Kunti melt from spooky -> excited hopping/floating toward the pisang goreng!
  const excitedHop = cozyK * Math.abs(Math.sin(t * 7.5)) * 0.26;
  const pocongPos: Vec3 = [-1.42, excitedHop, -1.08];
  const kuntiPos: Vec3 = [0.45, 0.22 + Math.sin(t * 3.6) * 0.1, -1.08];

  const pocongP = toBean(
    MAS_POCONG,
    { ...breathIdle(t, 4), lean: 12 * cozyK, headTilt: 6 * cozyK, squash: cozyK * Math.sin(t * 7.5) * 0.04, look: 0.45 },
    t,
    4,
    { expr: cozyK > 0.25 ? "happy" : "shock", tired: true }
  );
  const kuntiP = toBean(
    MBAK_KUNTI,
    {
      ...breathIdle(t, 5),
      armL: lerp2([-76, 22], [-42, 72], cozyK),
      armR: lerp2([76, 22], [58, 68], cozyK),
      lean: 12 * cozyK,
      look: -0.45,
    },
    t,
    5,
    { expr: cozyK > 0.25 ? "happy" : "shock", tired: true }
  );
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: "happy" });
  const rikoP = toBean(RIKO_HOROR, { ...breathIdle(t, 1), armL: [-68, 22], armR: [68, 22], lean: -8, look: 0.5 }, t, 1, { expr: "shock", sweat: true });

  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);
  const basketPos = lerpV([bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.14], GORENGAN_TABLE_POS, offerK);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg={cozyK > 0.45 ? "#171432" : "#0b1026"} fog={[cozyK > 0.45 ? "#1e1a3d" : "#101635", 16, 46]}>
        <HauntedMansionYard t={t} cozy={cozyK} hideGate />
        <BeanCard position={pocongPos} height={2.08} params={pocongP} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <BeanCard position={[-2.15, 0, 1.05]} height={2.02} params={rikoP} />

        <GorenganBasket3D pos={basketPos} scale={0.96} t={t} steam />
        {offerK > 0.25 && <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.95 * offerK} t={t} />}
        {cozyK < 0.7 && <SpookyAura3D pos={[-0.55, 0.12, -1.1]} scale={1.0 * (1 - cozyK)} t={t} />}
      </Stage>
      <Grade warm={0.34 * cozyK} cool={0.28 * (1 - cozyK)} />
      <Bubble x={540} y={220} w={580} size={40} text="MONGGO, PISANG GORENG HANGAT!" from={evGorengan - 4} to={evBerbinar - 14} />
      <Chip from={evBerbinar - 6} to={dur - 6} top={165} color="#f59e0b">
        AURA HOROR LANGSUNG BUBAR! 😂
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: CURHAT — HANTU LEMBUR MALAM JUMAT CURHAT & NGEMIL!        */
/* ================================================================== */
export const SceneHororCurhat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("curhat");
  const evPocong = timing.events["curhat.pocong"];
  const evMelompat = timing.events["curhat.melompat"];
  const c1From = timing.lines.c1.from;
  const c1To = timing.lines.c1.to;
  const c2From = timing.lines.c2.from;
  const c2To = timing.lines.c2.to;

  const cam = evalCam(f, [
    // Beat 1: Warm cozy 3D orbit around Mbak Kunti lip-syncing curhat while holding crispy Pisang Goreng!
    {
      kind: "orbit",
      to: evPocong - 8,
      target0: [0.15, 1.38, -0.82],
      target1: [0.02, 1.38, -0.82],
      ang0: -0.34,
      ang1: 0.30,
      rad0: 5.85,
      rad1: 5.55,
      y0: 1.78,
      y1: 1.72,
      fov0: 42,
      fov1: 41,
    },
    // Beat 2: Smooth 3D orbit swinging left to Kang Pocong lip-syncing curhat about sore calves!
    {
      kind: "orbit",
      to: dur,
      target0: [0.02, 1.38, -0.82],
      target1: [-0.62, 1.38, -0.82],
      ang0: 0.30,
      ang1: -0.28,
      rad0: 5.55,
      rad1: 6.05,
      y0: 1.72,
      y1: 1.82,
      fov0: 41,
      fov1: 43,
    },
  ]);

  const talkKunti = f >= c1From && f <= c1To;
  const talkPocong = f >= c2From && f <= c2To;
  const tiredHop = pulseBell(f, evMelompat - 4, evMelompat + 8, evMelompat + 24) * 0.42;

  const kuntiPos: Vec3 = [0.42, 0.20 + Math.sin(t * 2.4) * 0.08, -1.05];
  const pocongPos: Vec3 = [-1.42, tiredHop, -1.05];
  const bagasPos: Vec3 = [-0.48, 0, -1.12];

  const wag = Math.sin(t * 8.5);
  const kuntiPose: Pose = {
    ...breathIdle(t, 5),
    armL: [-34 + (talkKunti ? wag * 14 : 0), 58 + (talkKunti ? Math.cos(t * 8.5) * 12 : 0)],
    armR: [62 + Math.sin(t * 3.5) * 8, 66 + Math.cos(t * 3.5) * 10],
    lean: 6 + (talkKunti ? wag * 3 : 0),
    headTilt: 5 + (talkKunti ? wag * 6 : 0),
    look: -0.35,
  };
  const pocongPose: Pose = {
    ...breathIdle(t, 4),
    lean: 4 + (talkPocong ? Math.sin(t * 8) * 4 : 0),
    headTilt: 8 + (talkPocong ? Math.sin(t * 8) * 6 : 0),
    squash: tiredHop > 0.1 ? 0.055 : -0.02,
    look: 0.35,
  };
  const bagasPose: Pose = {
    ...breathIdle(t, 3),
    armL: [-24, 48],
    armR: [42, 58 + Math.sin(t * 3.2) * 14],
    lean: 4,
    headTilt: Math.sin(t * 3.2) * 5,
    look: talkKunti ? 0.55 : -0.55,
  };

  const kuntiP = toBean(MBAK_KUNTI, kuntiPose, t, 5, { expr: talkKunti ? "talk" : "happy", mouthOpen: talkKunti ? talkMouth(t) : 0, tired: true });
  const pocongP = toBean(MAS_POCONG, pocongPose, t, 4, { expr: talkPocong ? "talk" : "sad", mouthOpen: talkPocong ? talkMouth(t) : 0, tired: true });
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: "happy" });

  const kuntiHand = beanHandWorld(kuntiP, "R", kuntiPos, 2.08, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#181534" fog={["#201b42", 16, 48]}>
        <HauntedMansionYard t={t} cozy={1} hideGate />
        <BeanCard position={pocongPos} height={2.08} params={pocongP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip />

        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.96} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.96} t={t} />
        <PisangGoreng3D pos={[kuntiHand[0], kuntiHand[1] + 0.02, kuntiHand[2] + 0.12]} rot={[0.2, 0.4, 0.15]} scale={0.92} />
      </Stage>
      <Grade warm={0.34} />
      <Tag label="SESI CURHAT HANTU LEMBUR ☕" from={6} to={dur - 8} color="#facc15" top={122} />
      <Bubble x={540} y={248} w={600} size={36} text="CAPEK LEMBUR TIAP MALAM JUMAT..." from={c1From + 6} to={evPocong - 8} />
      <Bubble x={540} y={248} w={580} size={36} text="BETIS PEGAL LOMPAT TERUS!" from={evPocong + 4} to={dur - 8} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: VIRAL — RIKO SADAR HP LIVE NYALA -> SATU CHAT NGAKAK!     */
/* ================================================================== */
export const SceneHororViral: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("viral");
  const evKaget = timing.events["viral.kaget"];
  const evTertawa = timing.events["viral.tertawa"];

  const cam = evalCam(f, [
    // Beat 1: Tight comic push-in on Riko waking up & discovering his LIVE stream is still rolling!
    {
      kind: "orbit",
      to: evTertawa - 10,
      target0: [-1.45, 1.45, 0.72],
      target1: [-1.35, 1.44, 0.72],
      ang0: -0.26,
      ang1: 0.18,
      rad0: 4.35,
      rad1: 3.75,
      y0: 1.72,
      y1: 1.58,
      fov0: 40,
      fov1: 37,
      roll0: 0,
      roll1: -4.0,
    },
    // Beat 2: Wide joyous pull-out orbit showing ALL 5 characters cracking up together cleanly!
    {
      kind: "orbit",
      to: dur,
      target0: [-1.35, 1.44, 0.72],
      target1: [-0.22, 1.42, -0.35],
      ang0: 0.18,
      ang1: -0.18,
      rad0: 3.75,
      rad1: 9.35,
      y0: 1.58,
      y1: 2.18,
      fov0: 37,
      fov1: 46,
      roll0: -4.0,
      roll1: 0,
    },
  ]);

  const shockK = smoothStep(f, evKaget - 6, 10);
  const shockJump = pulseBell(f, evKaget - 2, evKaget + 6, evKaget + 22);
  const laughK = smoothStep(f, evTertawa - 8, 14);

  const rikoPos: Vec3 = [-1.68, 0, 0.72];
  const dediPos: Vec3 = [1.28, 0, 0.65];
  const bagasPos: Vec3 = [-0.08, 0, -1.10];
  const pocongPos: Vec3 = [-1.12, Math.abs(Math.sin(t * 7)) * 0.22 * laughK, -1.06];
  const kuntiPos: Vec3 = [0.92, 0.22 + Math.sin(t * 3.5) * 0.1, -1.06];

  const rikoShock: Pose = {
    legL: [14, -24 + shockJump * 16],
    legR: [-14, -24 + shockJump * 16],
    armL: [-88, -24],
    armR: [76, 46],
    lean: -12 - shockJump * 5,
    bob: shockJump * 24 - 4,
    headTilt: -10,
    squash: shockJump * 0.075 - 0.02,
    look: 0.55,
  };
  const rikoPose = mixPose({ ...breathIdle(t, 1), armR: [62, 48] }, rikoShock, shockK);

  const laughBounce = (ph: number): Pose => {
    const ch = Math.sin(t * 11 + ph);
    return mixPose(
      breathIdle(t, ph),
      {
        ...breathIdle(t, ph),
        armL: [-38 + ch * 14, 72 + ch * 12],
        armR: [68 - ch * 14, 48 - ch * 12],
        lean: -6 + ch * 5,
        bob: Math.abs(ch) * 12,
        headTilt: -8 + ch * 8,
        squash: ch * 0.036,
        look: 0.2,
      },
      laughK
    );
  };

  const rikoP = toBean(RIKO_HOROR, rikoPose, t, 1, { expr: shockK > 0.25 ? "shock" : "worried", sweat: true });
  const dediP = toBean(DEDI_HOROR, laughBounce(1.2), t, 2, { expr: laughK > 0.25 ? "laugh" : "happy" });
  const bagasP = toBean(BAGAS_HOROR, laughBounce(2.4), t, 3, { expr: "laugh" });
  const pocongP = toBean(MAS_POCONG, laughBounce(3.6), t, 4, { expr: "laugh", tired: false });
  const kuntiP = toBean(MBAK_KUNTI, laughBounce(4.8), t, 5, { expr: "laugh", tired: false });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evKaget], 0.15)} bg="#181534" fog={["#201b42", 16, 48]}>
        <HauntedMansionYard t={t} cozy={1} hideGate />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={dediPos} height={2.02} params={dediP} flip />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={pocongPos} height={2.08} params={pocongP} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.14]} rot={[0.05, 0.25, -0.08]} scale={0.92} />
        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.96} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.96} t={t} />
      </Stage>
      <Grade warm={0.34} />
      <Chip from={evKaget - 2} to={evTertawa - 4} top={165} color="#dc2626">
        🔴 LIVE MASIH NYALA!!
      </Chip>
      <Bubble x={540} y={210} w={640} size={38} text="NETIZEN: INI UJI NYALI APA PODCAST?! 🤣" from={evTertawa - 2} to={dur - 6} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 7: FOTO — 80° GROUP SELFIE ORBIT + 🐱 KUCING OREN #2!        */
/* ================================================================== */
export const SceneHororFoto: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("foto");
  const evFoto = timing.events["foto.foto"];
  const evBakwan = timing.events["foto.bakwan"];

  const cam = evalCam(f, [
    // Signature 80-deg festive group selfie orbit showcasing all 5 friends + Kucing Oren #2!
    {
      kind: "orbit",
      to: evBakwan - 6,
      target0: [-0.22, 1.38, -0.25],
      target1: [-0.18, 1.36, -0.25],
      ang0: -0.45,
      ang1: 0.42,
      rad0: 8.15,
      rad1: 7.55,
      y0: 1.98,
      y1: 1.82,
      fov0: 46,
      fov1: 45,
    },
    // Smooth warm hold orbiting gently left as Kang Pocong excitedly requests extra bakwan!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.18, 1.36, -0.25],
      target1: [-0.42, 1.38, -0.48],
      ang0: 0.42,
      ang1: -0.22,
      rad0: 7.55,
      rad1: 8.05,
      y0: 1.82,
      y1: 1.96,
      fov0: 45,
      fov1: 46,
    },
  ]);

  const poseSnap = smoothStep(f, evFoto - 10, 10);
  const flashK = pulseBell(f, evFoto, evFoto + 2, evFoto + 9);
  const bakwanHop = Math.abs(Math.sin(t * 6.5)) * 0.22 * smoothStep(f, evBakwan - 10, 12);

  const rikoPos: Vec3 = [-1.62, 0, 0.58];
  const dediPos: Vec3 = [1.18, 0, 0.55];
  const pocongPos: Vec3 = [-1.08, bakwanHop, -1.02];
  const bagasPos: Vec3 = [-0.08, 0, -1.08];
  const kuntiPos: Vec3 = [0.92, 0.22 + Math.sin(t * 2.8) * 0.08, -1.02];

  const rikoP = toBean(RIKO_HOROR, { ...breathIdle(t, 1), armL: [-42, 68], armR: [86, 26], lean: 6, look: 0.3 }, t, 1, { expr: "happy" });
  const bagasP = toBean(BAGAS_HOROR, { ...breathIdle(t, 2), armL: [-68, 42], armR: [72, 42], lean: 3 }, t, 2, { expr: "laugh" });
  const dediP = toBean(DEDI_HOROR, { ...breathIdle(t, 3), armL: [-54, 58], armR: [66, 48], lean: -4 }, t, 3, { expr: "happy" });
  const pocongP = toBean(MAS_POCONG, { ...breathIdle(t, 4), lean: 6 * poseSnap, headTilt: -6 * poseSnap, squash: bakwanHop * 0.16 }, t, 4, { expr: "happy", tired: false });
  const kuntiP = toBean(MBAK_KUNTI, { ...breathIdle(t, 5), armL: [-48, 66], armR: [82, 34], headTilt: 6 * poseSnap }, t, 5, { expr: "happy", tired: false });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#181534" fog={["#201b42", 16, 48]}>
        {/* Easter Egg Kucing Oren #2 photobombing cutely beside the stone table! */}
        <HauntedMansionYard t={t} cozy={1} showCat hideGate />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={dediPos} height={2.02} params={dediP} flip />
        <BeanCard position={pocongPos} height={2.08} params={pocongP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.16]} rot={[0.05, 0.35, -0.1]} scale={0.86} />
        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.96} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.96} t={t} />
      </Stage>
      <Grade warm={0.34} flash={flashK * 0.72} flashCol="#ffffff" />
      <Stamp text="CEKREK!! 📸" from={evFoto - 2} to={evFoto + 38} color="#facc15" top={215} />
      <Bubble x={540} y={220} w={610} size={36} text="BESOK BAWA BAKWAN + CABAI RAWIT YA!" from={evBakwan - 4} to={dur - 6} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 8: ENDING — PIXAR FULL-MOON CRANE-UP + VIRAL CTA CARD!       */
/* ================================================================== */
export const SceneHororEnding: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("ending");
  const evKomentar = timing.events["ending.komentar"];
  const craneStart = Math.min(evKomentar - 20, 215);

  const cam = evalCam(f, [
    // Beat 1: Cozy orbit around the midnight hangout under dancing golden fireflies!
    {
      kind: "orbit",
      to: craneStart,
      target0: [-0.25, 1.42, -0.35],
      target1: [-0.15, 1.52, -0.52],
      ang0: -0.35,
      ang1: 0.25,
      rad0: 7.8,
      rad1: 8.2,
      y0: 1.98,
      y1: 2.25,
      fov0: 45,
      fov1: 46,
    },
    // Beat 2: Pixar 3D Crane-Up Panorama lifting smoothly toward the Colonial Roof, Banyan & Giant Full Moon!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.15, 1.52, -0.52],
      target1: [0.85, 3.15, -3.55],
      ang0: 0.25,
      ang1: -0.18,
      rad0: 8.2,
      rad1: 12.2,
      y0: 2.25,
      y1: 3.95,
      fov0: 46,
      fov1: 48,
    },
  ]);

  const wavePose = (ph: number): Pose => {
    const w = Math.sin(t * 6.5 + ph);
    return {
      ...breathIdle(t, ph),
      armL: [-24, 38],
      armR: [104 + w * 14, 24 + Math.cos(t * 6.5 + ph) * 12],
      lean: 3,
      headTilt: Math.sin(t * 3.5 + ph) * 5,
      look: 0,
    };
  };

  const rikoP = toBean(RIKO_HOROR, wavePose(0.2), t, 1, { expr: "happy" });
  const bagasP = toBean(BAGAS_HOROR, wavePose(1.1), t, 2, { expr: "happy" });
  const dediP = toBean(DEDI_HOROR, wavePose(2.3), t, 3, { expr: "laugh" });
  const pocongP = toBean(MAS_POCONG, { ...breathIdle(t, 4), lean: Math.sin(t * 4) * 5, headTilt: Math.sin(t * 4) * 6 }, t, 4, { expr: "happy", tired: false });
  const kuntiP = toBean(MBAK_KUNTI, wavePose(3.5), t, 5, { expr: "happy", tired: false });

  const ctaFrom = evKomentar - 16;
  const ctaS = spring({ frame: Math.max(0, f - ctaFrom), fps: 30, config: { damping: 11, stiffness: 200 } });

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#121432" fog={["#1a1d45", 20, 56]}>
        <HauntedMansionYard t={t} cozy={1} showCat hideGate />
        <BeanCard position={[-1.62, 0, 0.48]} height={2.02} params={rikoP} />
        <BeanCard position={[1.15, 0, 0.48]} height={2.02} params={dediP} flip />
        <BeanCard position={[-1.12, Math.abs(Math.sin(t * 4.5)) * 0.14, -1.04]} height={2.08} params={pocongP} />
        <BeanCard position={[-0.08, 0, -1.08]} height={2.02} params={bagasP} />
        <BeanCard position={[0.92, 0.22 + Math.sin(t * 2.6) * 0.08, -1.04]} height={2.08} params={kuntiP} flip />

        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.96} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.96} t={t} />
      </Stage>
      <Grade warm={0.34} />

      {/* Viral Comment-Voting & Ep. 4 Subscribe Magnet Card! */}
      {f >= ctaFrom && (
        <div
          style={{
            position: "absolute",
            top: 148,
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
                background: "rgba(124,58,237,0.96)",
                border: "6px solid #ffffff",
                borderRadius: 24,
                padding: "16px 14px",
                fontFamily: "Anton, Impact, sans-serif",
                fontSize: 42,
                color: "#ffffff",
                boxShadow: "0 14px 30px rgba(0,0,0,0.42)",
              }}
            >
              KABUR DULUAN 🏃
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
                boxShadow: "0 14px 30px rgba(0,0,0,0.42)",
              }}
            >
              AJAK NGOPI ☕
            </div>
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 16,
              background: "#0f172a",
              border: "5px solid #facc15",
              borderRadius: 20,
              padding: "10px 26px",
              fontFamily: FONT_BODY,
              fontWeight: 900,
              fontSize: 31,
              color: "#fef08a",
              boxShadow: "0 10px 24px rgba(0,0,0,0.42)",
            }}
          >
            TULIS PERTANYAANMU BUAT HANTU DI KOMEN! 👇
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const HOROR_SCENES: Record<HororScene, React.FC> = {
  hook: SceneHororHook,
  masuk: SceneHororMasuk,
  muncul: SceneHororMuncul,
  tawar: SceneHororTawar,
  curhat: SceneHororCurhat,
  viral: SceneHororViral,
  foto: SceneHororFoto,
  ending: SceneHororEnding,
};

export const DissolveHoror: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= 10 ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / 10);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

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
  GroundShadow3D,
  HauntedMansionYard,
  HopDustPuff3D,
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

type LineTiming = { from: number; to: number; speaker?: string };
const LINES = timing.lines as Record<string, LineTiming>;
const EV = timing.events as Record<string, number>;
const inLine = (f: number, id: string, pad = 2) => {
  const ln = LINES[id];
  return ln ? f >= ln.from - pad && f <= ln.to + pad : false;
};

/* ================================================================== */
/* TRUE 3D CINEMATIC CAMERA ENGINE (360° ORBIT + OTS + CRANE + TILT)  */
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
      const fov0 = s.fov0 ?? 42;
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
          background: warm > 0 ? `rgba(255,165,65,${0.36 * warm})` : `rgba(56,110,245,${0.32 * cool})`,
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
  top = 128,
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
        fontSize: 31,
        letterSpacing: 1.3,
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
          padding: "12px 28px",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 54,
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

const Stamp: React.FC<{ text: string; from: number; to: number; color?: string; top?: number }> = ({
  text,
  from,
  to,
  color = "#dc2626",
  top = 210,
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
          fontSize: 58,
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

const SPEAKER_META: Record<string, { label: string; bg: string; border: string; fg: string }> = {
  riko: { label: "😱 RIKO", bg: "#0c4a6e", border: "#38bdf8", fg: "#e0f2fe" },
  bagas: { label: "🍌 BAGAS", bg: "#78350f", border: "#f59e0b", fg: "#fef3c7" },
  pocong: { label: "👻 KANG POCONG", bg: "#164e63", border: "#22d3ee", fg: "#cffafe" },
  kunti: { label: "👻 MBAK KUNTI", bg: "#4c1d95", border: "#c084fc", fg: "#f3e8ff" },
};

export const HororCaptions: React.FC = () => {
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
    <div style={{ position: "absolute", top: 1320, left: 64, right: 64, textAlign: "center", pointerEvents: "none" }}>
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
    </div>
  );
};

/* ================================================================== */
/* HYPER-EXPRESSIVE CARTOON KINEMATICS ENGINE v3                      */
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
  const b = Math.sin(t * 2.5 + k);
  const lag = Math.sin(t * 2.5 + k - 0.7);
  return {
    legL: [3 + b * 2.0, -5 - Math.max(0, b) * 3.0],
    legR: [-3 - b * 2.0, -5 - Math.max(0, -b) * 3.0],
    armL: [-12 + b * 5.0, 16 + lag * 6.0],
    armR: [12 - b * 5.0, 16 - lag * 6.0],
    lean: b * 1.8,
    bob: (b + 1) * 3.0,
    headTilt: Math.sin(t * 1.6 + k - 0.5) * 3.6,
    squash: b * 0.016,
    look: 0,
  };
};

/** Lively animated dialogue acting overlay (gesturing arms, torso lean, bobbing head!) */
const talkAct = (base: Pose, t: number, active: boolean, energy = 1, seed = 0): Pose => {
  if (!active) return base;
  const g1 = Math.sin(t * 9.5 + seed);
  const g2 = Math.cos(t * 6.8 + seed);
  return {
    ...base,
    armL: [base.armL[0] - 18 * energy + g1 * 18 * energy, base.armL[1] + 24 * energy + g2 * 16 * energy],
    armR: [base.armR[0] + 18 * energy - g2 * 18 * energy, base.armR[1] + 22 * energy + g1 * 16 * energy],
    lean: base.lean + g1 * 5.5 * energy,
    bob: base.bob + Math.abs(g1) * 8 * energy,
    headTilt: base.headTilt + g2 * 8.5 * energy,
    squash: base.squash + g1 * 0.024 * energy,
  };
};

type WalkStyle = "sneak" | "run" | "march" | "stumble";
const WALK_CFG: Record<
  WalkStyle,
  { stride: number; thigh: number; crouch: number; baseKnee: number; liftKnee: number; pushKnee: number; arm: number; bob: number; lean: number; sq: number }
> = {
  sneak: { stride: 0.68, thigh: 32, crouch: 16, baseKnee: 18, liftKnee: 52, pushKnee: 28, arm: 24, bob: 12, lean: 16, sq: 0.042 },
  run: { stride: 0.96, thigh: 48, crouch: 10, baseKnee: 14, liftKnee: 64, pushKnee: 40, arm: 64, bob: 22, lean: 18, sq: 0.058 },
  march: { stride: 0.82, thigh: 38, crouch: 6, baseKnee: 10, liftKnee: 48, pushKnee: 28, arm: 46, bob: 16, lean: 10, sq: 0.046 },
  stumble: { stride: 0.65, thigh: 34, crouch: 12, baseKnee: 16, liftKnee: 48, pushKnee: 26, arm: 54, bob: 15, lean: -14, sq: 0.045 },
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
  const armL: [number, number] = [-sL * cfg.arm, 18 + Math.max(0, -sL) * 48];
  const armR: [number, number] = [sL * cfg.arm, 18 + Math.max(0, sL) * 48];
  const strideHigh = Math.abs(cL);
  const walkPose: Pose = {
    legL,
    legR,
    armL,
    armR,
    lean: cfg.lean + Math.sin(p * 2) * 3.0,
    bob: strideHigh * cfg.bob - (style === "sneak" ? 12 : 4),
    headTilt: Math.sin(p - 0.6) * 4.8,
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
  blink: (t + seed * 0.73) % 2.8 < 0.12,
  ...extra,
});

const talkMouth = (t: number) => 0.35 + 0.65 * Math.abs(Math.sin(t * 16.5));

/* ================================================================== */
/* SCENE 1: HOOK — HIGH-ANGLE BIRD'S-EYE CRANE-DIVE + DIALOGUE!       */
/* ================================================================== */
export const SceneHororHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("hook");
  const h2From = LINES.h2?.from ?? 150;
  const h3From = LINES.h3?.from ?? 260;

  const talkRiko = inLine(f, "h2");
  const talkBagas = inLine(f, "h3");

  // Bagas strides boldly past trembling Riko & chomps a pisang goreng!
  const bagasWalkFn = (ff: number) => smoothStep(ff, h3From - 25, 48);
  const bagasK = bagasWalkFn(f);
  const bagasVel = cl((travelVel(f, bagasWalkFn) * 1.45) / 0.025);

  // Riko backs up nervously during his line!
  const rikoBackFn = (ff: number) => smoothStep(ff, h2From - 8, 34);
  const rikoBack = rikoBackFn(f);
  const rikoVel = cl((travelVel(f, rikoBackFn) * 0.65) / 0.022);

  const cam = evalCam(f, [
    // Beat 1: Steep Bird's-Eye Crane-Dive sweeping down from the Giant Full Moon & Colonial Roof onto the iron gate!
    {
      kind: "orbit",
      to: h2From - 4,
      target0: [0.4, 3.2, -3.5],
      target1: [-0.2, 1.42, 4.45],
      ang0: 0.78,
      ang1: -0.58,
      rad0: 12.2,
      rad1: 6.2,
      y0: 5.85,
      y1: 1.55,
      fov0: 50,
      fov1: 43,
      roll0: 0,
      roll1: -4.5,
    },
    // Beat 2 (Riko speaks!): Low-angle 3D diagonal framing trembling Riko pointing at Bagas!
    {
      kind: "orbit",
      to: h3From - 6,
      target0: [-0.2, 1.42, 4.45],
      target1: [-0.72, 1.42, 4.55],
      ang0: -0.58,
      ang1: -0.32,
      rad0: 6.2,
      rad1: 5.2,
      y0: 1.55,
      y1: 1.25,
      fov0: 43,
      fov1: 41,
      roll0: -4.5,
      roll1: -2.0,
    },
    // Beat 3 (Bagas speaks!): Sweeping 75-deg 3D orbit framing Bagas striding past with Pisang Goreng + Riko!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.72, 1.42, 4.55],
      target1: [0.38, 1.38, 4.45],
      ang0: -0.32,
      ang1: 0.45,
      rad0: 5.2,
      rad1: 6.15,
      y0: 1.25,
      y1: 1.55,
      fov0: 41,
      fov1: 42,
      roll0: -2.0,
      roll1: 2.0,
    },
  ]);

  const shiver = Math.sin(t * 24);
  const rikoPos: Vec3 = [lerpN(-0.85, -1.25, rikoBack), 0, lerpN(4.45, 4.88, rikoBack)];
  const dediPos: Vec3 = [-0.08, 0, 4.18];
  const bagasPos: Vec3 = [lerpN(1.18, 0.72, bagasK), 0, lerpN(4.85, 4.25, bagasK)];

  const rikoBase: Pose = mixPose(
    {
      legL: [16 + shiver * 4, -26],
      legR: [-16 - shiver * 4, -26],
      armL: [-34, 62 + shiver * 6],
      armR: [76 + shiver * 5, 38],
      lean: -8 + shiver * 2.2,
      bob: -6 + Math.abs(shiver) * 4,
      headTilt: -6 + shiver * 4,
      squash: -0.028,
      look: 0.65,
    },
    smoothWalk(rikoBack * 0.85, rikoVel, t, "stumble", 1),
    rikoVel * 0.7
  );
  const rikoPose = talkAct(rikoBase, t, talkRiko, 1.15, 1);

  const dediPose: Pose = {
    ...breathIdle(t, 2),
    armL: [-18, 36],
    armR: [72 + Math.sin(t * 2.8) * 18, 22],
    lean: 6,
    headTilt: Math.sin(t * 2.8) * 7,
    look: Math.sin(t * 2.8) * 0.75,
  };

  // Bagas walks up boldly & raises a crispy pisang goreng right up to his mouth!
  const chewBounce = talkBagas ? Math.sin(t * 10) * 14 : Math.sin(t * 3.5) * 10;
  const bagasBase = mixPose(
    {
      ...breathIdle(t, 3),
      armL: [-42, 76 + chewBounce],
      armR: [66, 48 + Math.sin(t * 4) * 8],
      lean: -4,
      headTilt: Math.sin(t * 3) * 6,
      look: -0.55,
    },
    smoothWalk(bagasK * 1.45, bagasVel, t, "march", 3),
    bagasVel
  );
  const bagasPose = talkAct(bagasBase, t, talkBagas, 1.0, 3);

  const rikoP = toBean(RIKO_HOROR, rikoPose, t, 1, { expr: talkRiko ? "talk" : "scared", mouthOpen: talkRiko ? talkMouth(t) : 0, sweat: true });
  const dediP = toBean(DEDI_HOROR, dediPose, t, 2, { expr: "worried", sweat: true });
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: talkBagas ? "talk" : "happy", mouthOpen: talkBagas ? talkMouth(t) : 0 });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);
  const dediHand = beanHandWorld(dediP, "R", dediPos, 2.02, cam.pos, false);
  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#0a0e24" fog={["#0f1635", 16, 48]}>
        <HauntedMansionYard t={t} cozy={0} />
        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={dediPos} height={2.02} params={dediP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.12]} rot={[0.05, 0.25, -0.1]} scale={0.80} />
        <Flashlight3D pos={[dediHand[0], dediHand[1], dediHand[2] + 0.08]} rot={[0.10, Math.PI + Math.sin(t * 2.8) * 0.55, 0]} beam={0.95} t={t} scale={0.88} />
        <GorenganBasket3D pos={[bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.18]} scale={0.86} t={t} steam />
      </Stage>
      <Grade cool={0.28} />
      <Tag label="KOS BU TINI EP. 3 · MALAM JUMAT" from={6} to={h3From - 10} color="#38bdf8" />
      <Chip from={h3From + 4} to={dur - 6} top={145} color="#f59e0b">
        UJI NYALI BAWA GORENGAN?! 🍌
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 2: MASUK — WORM'S-EYE 3D SNEAK + JUMP SCARE + KUCING OREN #1 */
/* ================================================================== */
export const SceneHororMasuk: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("masuk");
  const evKedip = EV["masuk.berkedip"] ?? 120;
  const m2From = LINES.m2?.from ?? 185;

  const talkRiko = inLine(f, "m1");
  const talkBagas = inLine(f, "m2");

  const walkKFn = (ff: number) => smoothStep(ff, 0, Math.max(40, evKedip - 8));
  const walkK = walkKFn(f);
  const walkDist = walkK * 2.35;
  const walkVel = cl((travelVel(f, walkKFn) * 2.35) / 0.025);
  const scareJump = pulseBell(f, evKedip - 2, evKedip + 6, evKedip + 24);
  const freezeK = smoothStep(f, evKedip - 4, 10);

  const zPos = lerpN(2.85, 0.85, walkK);
  const cam = evalCam(f, [
    // Beat 1: Ultra-Low Worm's-Eye 3D Tracking Dolly (y = 0.74!) skimming cobblestones & 🐱 Kucing Oren #1!
    {
      kind: "orbit",
      to: evKedip + 16,
      target0: [0.0, 1.32, 2.55],
      target1: [0.15, 1.38, 0.85],
      ang0: -0.78,
      ang1: 0.45,
      rad0: 6.4,
      rad1: 6.1,
      y0: 0.74,
      y1: 1.45,
      fov0: 47,
      fov1: 44,
      roll0: -3.5,
      roll1: 2.5,
    },
    // Beat 2 (Bagas speaks!): Dramatic Low-Angle 3D Sweep framing Bagas, Mas Dedi & Riko under the eerie balcony!
    {
      kind: "orbit",
      to: dur,
      target0: [0.15, 1.38, 0.85],
      target1: [0.18, 1.68, 0.25],
      ang0: 0.45,
      ang1: -0.48,
      rad0: 6.1,
      rad1: 6.95,
      y0: 1.45,
      y1: 1.05,
      fov0: 44,
      fov1: 46,
      roll0: 2.5,
      roll1: -3.8,
    },
  ]);

  const sneakRiko = smoothWalk(walkDist, walkVel, t, "sneak", 1);
  const sneakDedi = smoothWalk(walkDist, walkVel, t, "sneak", 2);
  const sneakBagas = smoothWalk(walkDist, walkVel, t, "march", 3);

  const lampZap = f >= evKedip - 2 && f <= evKedip + 24 ? (Math.sin(f * 2.7) > 0.2 ? 0.42 : 0) : 0;

  const rikoScarePose: Pose = {
    legL: [24, -46 + scareJump * 32],
    legR: [-24, -46 + scareJump * 32],
    armL: [-92, -16],
    armR: [88, 22],
    lean: -14,
    bob: 8,
    headTilt: -12,
    squash: scareJump * 0.08 - 0.03,
    look: -0.5,
  };
  const rikoBase = mixPose(
    mixPose({ ...sneakRiko, armR: [66, 44] }, { ...breathIdle(t, 1), armL: [-58, 52], armR: [68, 44], lean: -8, look: -0.5 }, freezeK),
    rikoScarePose,
    scareJump
  );
  const rikoPose = talkAct(rikoBase, t, talkRiko && scareJump < 0.3, 1.0, 1);

  const dediPose = mixPose(
    { ...sneakDedi, armR: [76 + Math.sin(t * 3.4) * 20, 18] },
    { ...breathIdle(t, 2), armL: [-42, 46], armR: [88, 16], lean: -8, look: -0.65 },
    freezeK
  );

  // Bagas strolls totally chill, sniffing the pisang goreng!
  const bagasBase: Pose = {
    ...sneakBagas,
    armL: [-34, 62 + Math.sin(t * 4) * 10],
    armR: [60, 48],
    look: 0.2,
  };
  const bagasPose = talkAct(bagasBase, t, talkBagas, 1.05, 3);

  const rikoPos: Vec3 = [-1.05, scareJump * 0.56, zPos + 0.15];
  const dediPos: Vec3 = [-0.02, 0, zPos - 0.12];
  const bagasPos: Vec3 = [1.02, 0, zPos + 0.28];

  const rikoP = toBean(RIKO_HOROR, rikoPose, t, 1, { expr: scareJump > 0.25 ? "shock" : talkRiko ? "talk" : "scared", mouthOpen: talkRiko ? talkMouth(t) : 0, sweat: true });
  const dediP = toBean(DEDI_HOROR, dediPose, t, 2, { expr: freezeK > 0.3 ? "shock" : "worried", sweat: true });
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: talkBagas ? "talk" : "smug", mouthOpen: talkBagas ? talkMouth(t) : 0 });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);
  const dediHand = beanHandWorld(dediP, "R", dediPos, 2.02, cam.pos, false);
  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evKedip, m2From], 0.13)} bg="#0a0e24" fog={["#0f1635", 14, 44]}>
        {/* Easter Egg Kucing Oren #1 sitting right beside the stone yard table! */}
        <HauntedMansionYard t={t} cozy={0} showCat hideGate />
        <GroundShadow3D x={rikoPos[0]} z={rikoPos[2]} elevation={rikoPos[1]} />
        <HopDustPuff3D pos={[rikoPos[0], 0, rikoPos[2]]} progress={cl((f - (evKedip + 20)) / 14)} color="#93c5fd" />

        <BeanCard position={rikoPos} height={2.02} params={rikoP} shadow={false} />
        <BeanCard position={dediPos} height={2.02} params={dediP} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.12]} rot={[0.05, 0.2, -0.1]} scale={0.78} />
        <Flashlight3D
          pos={[dediHand[0], dediHand[1], dediHand[2] + 0.08]}
          rot={[0.14, Math.PI + Math.sin(t * 3.4) * 0.72 - freezeK * 0.35, 0]}
          beam={1.15}
          t={t}
          scale={0.92}
        />
        <GorenganBasket3D pos={[bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.16]} scale={0.84} t={t} steam />
      </Stage>
      <Grade cool={0.34} flash={lampZap} flashCol="#fef08a" />
      <Tag label="HALAMAN RUMAH TUA · 00:00 WIB" from={6} to={dur - 8} color="#a855f7" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: MUNCUL — 130° HORROR ORBIT + VERTIGO ZOOM + REVERSE OTS!  */
/* ================================================================== */
export const SceneHororMuncul: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("muncul");
  const u1From = LINES.u1?.from ?? 14;
  const u2From = LINES.u2?.from ?? 145;

  const talkPocong = inLine(f, "u1");
  const talkRiko = inLine(f, "u2");

  const cam = evalCam(f, [
    // Beat 1 (Kang Pocong speaks!): ULTRA-LOW WORM'S-EYE 105° ORBIT + VERTIGO DOLLY-ZOOM (fov 52 -> 38)!
    {
      kind: "orbit",
      to: u2From - 8,
      target0: [-0.25, 1.85, -1.25],
      target1: [-0.25, 1.48, -1.05],
      ang0: -0.88,
      ang1: 0.56,
      rad0: 6.9,
      rad1: 5.5,
      y0: 0.65,
      y1: 1.72,
      fov0: 52,
      fov1: 39,
      roll0: -5.5,
      roll1: 4.5,
    },
    // Beat 2 (Riko screams!): TRUE 165° REVERSE-ANGLE OVER-THE-SHOULDER GHOST POV (safely in front of porch columns at z=-2.0!)
    {
      kind: "linear",
      to: dur,
      p0: [1.55, 1.88, -1.95],
      p1: [0.35, 1.48, -2.12],
      l0: [-0.25, 1.48, 1.72],
      l1: [-0.15, 1.42, 1.78],
      fov0: 48,
      fov1: 47,
      roll0: 3.5,
      roll1: -4.0,
    },
  ]);

  // Kang Pocong bursts out in 4 huge cartoon parabolic hops with anticipation, tilt & landing squash!
  const hopDur = 68;
  const pocongK = smoothStep(f, 0, hopDur);
  const hopCycle = cl(f / hopDur) * 4.0;
  const hopFrac = hopCycle - Math.floor(hopCycle);
  const inBurst = f < hopDur;
  const burstY = inBurst ? Math.sin(hopFrac * Math.PI) * 0.92 : Math.abs(Math.sin(t * 4.2)) * 0.16;
  const pocongSquash = inBurst
    ? hopFrac < 0.14 || hopFrac > 0.86
      ? -0.085
      : 0.08
    : Math.sin(t * 4.2) * 0.03;

  const pocongPos: Vec3 = [lerpN(-3.95, -0.95, pocongK), burstY, lerpN(-2.35, -1.05, pocongK)];
  const pocongBase: Pose = {
    ...breathIdle(t, 4),
    lean: inBurst ? Math.cos(hopFrac * Math.PI) * 14 : 10 + (talkPocong ? Math.sin(t * 9) * 6 : 0),
    bob: 4,
    headTilt: talkPocong ? Math.sin(t * 10) * 8 : Math.sin(t * 4) * 5,
    squash: pocongSquash,
    look: 0.45,
  };

  // Mbak Kunti executes a dramatic 3D helical spiral swoop-dive off the 2nd-floor balcony!
  const kuntiK = smoothStep(f, 4, 62);
  const spiralA = (1 - kuntiK) * Math.PI * 1.45;
  const kuntiPos: Vec3 = [
    lerpN(1.65, 0.95, kuntiK) + Math.sin(spiralA) * 0.95 * (1 - kuntiK),
    lerpN(3.95, 0.36, kuntiK) + Math.sin(t * 3.4) * 0.14,
    lerpN(-3.35, -1.05, kuntiK) + Math.cos(spiralA) * 0.65 * (1 - kuntiK),
  ];
  const kuntiPose: Pose = {
    ...breathIdle(t, 5),
    armL: [-86 + Math.sin(t * 5) * 14, 24],
    armR: [88 - Math.sin(t * 5) * 14, 24],
    lean: 16,
    headTilt: -10 + Math.sin(t * 4) * 6,
    look: -0.5,
  };

  // Riko leaps into hilarious mid-air cartoon leg-windmill panic run!!
  const panicAir = pulseBell(f, u2From - 8, u2From + 16, dur - 8);
  const windPhase = t * 26;
  const rikoWindmill: Pose = {
    legL: [Math.sin(windPhase) * 52, -45 - Math.max(0, Math.cos(windPhase)) * 45],
    legR: [-Math.sin(windPhase) * 52, -45 - Math.max(0, -Math.cos(windPhase)) * 45],
    armL: [-102 + Math.cos(windPhase) * 18, -20],
    armR: [102 - Math.cos(windPhase) * 18, 20],
    lean: -16 + Math.sin(t * 20) * 4,
    bob: 10,
    headTilt: -12 + Math.sin(t * 18) * 6,
    squash: panicAir * 0.06,
    look: 0.25,
  };

  // Mas Dedi drops into a hilariously trembling crouched flashlight stance!
  const dediCrouch: Pose = {
    legL: [28, -58],
    legR: [-28, -58],
    armL: [-68, 42],
    armR: [84 + Math.sin(t * 28) * 8, 20],
    lean: -10 + Math.sin(t * 28) * 2,
    bob: -22,
    headTilt: -8,
    squash: -0.055,
    look: 0.1,
  };

  const rikoPos: Vec3 = [-1.18, panicAir * 0.72, 1.72];
  const dediPos: Vec3 = [-0.02, 0, 1.85];
  const bagasPos: Vec3 = [1.18, 0, 1.65];

  const pocongP = toBean(MAS_POCONG, pocongBase, t, 4, { expr: talkPocong ? "talk" : "angry", mouthOpen: talkPocong ? talkMouth(t) : 0, tired: true });
  const kuntiP = toBean(MBAK_KUNTI, kuntiPose, t, 5, { expr: "angry", tired: true });
  const rikoP = toBean(RIKO_HOROR, mixPose(breathIdle(t, 1), rikoWindmill, cl(panicAir * 1.6)), t, 1, { expr: talkRiko ? "talk" : "shock", mouthOpen: talkRiko ? talkMouth(t) : 0, sweat: true });
  const dediP = toBean(DEDI_HOROR, dediCrouch, t, 2, { expr: "shock", sweat: true });
  const bagasP = toBean(BAGAS_HOROR, { ...breathIdle(t, 3), armL: [-28, 56], armR: [56, 48] }, t, 3, { expr: "smug" });

  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);
  const dediHand = beanHandWorld(dediP, "R", dediPos, 2.02, cam.pos, false);

  const reverseShot = f >= u2From - 8;

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [12, 34, 56, u2From - 2], 0.22)} bg="#080c1e" fog={["#121638", 13, 42]}>
        {/* Keep gate visible during Reverse OTS shot so open archway & village streetlamp glow behind Riko! */}
        <HauntedMansionYard t={t} cozy={0} hideGate={!reverseShot} />
        <pointLight position={[-1.0, 2.2, -0.8]} color="#38bdf8" intensity={4.0} distance={10} />
        <pointLight position={[0.95, 2.4, -0.8]} color="#a855f7" intensity={4.0} distance={10} />

        <GroundShadow3D x={pocongPos[0]} z={pocongPos[2]} elevation={pocongPos[1]} />
        <GroundShadow3D x={kuntiPos[0]} z={kuntiPos[2]} elevation={kuntiPos[1]} />
        {inBurst && <HopDustPuff3D pos={[pocongPos[0], 0, pocongPos[2]]} progress={hopFrac} color="#7dd3fc" />}

        <BeanCard position={pocongPos} height={2.10} params={pocongP} shadow={false} />
        <BeanCard position={kuntiPos} height={2.10} params={kuntiP} flip shadow={false} />

        {reverseShot && (
          <>
            <GroundShadow3D x={rikoPos[0]} z={rikoPos[2]} elevation={rikoPos[1]} />
            <BeanCard position={rikoPos} height={2.02} params={rikoP} shadow={false} />
            <BeanCard position={dediPos} height={2.02} params={dediP} />
            <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
            <Flashlight3D pos={[dediHand[0], dediHand[1], dediHand[2] + 0.08]} rot={[0.1, Math.sin(t * 14) * 0.25, 0]} beam={0.9} t={t} scale={0.85} />
            <GorenganBasket3D pos={[bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.16]} scale={0.84} t={t} steam />
          </>
        )}

        <SpookyAura3D pos={[pocongPos[0], 0.15, pocongPos[2]]} scale={1.15} t={t} />
        <SpookyAura3D pos={[kuntiPos[0], 0.15, kuntiPos[2]]} scale={1.10} t={t + 0.5} />
      </Stage>
      <Grade cool={0.38} flash={pulseBell(f, u1From - 4, u1From, u1From + 8) * 0.50} flashCol="#bae6fd" />
      <Stamp text="PENAMPAKAN GANDA!!" from={4} to={u2From - 8} color="#7c3aed" top={168} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 4: TAWAR — 3D SHOT-REVERSE-SHOT DIALOGUE + MOOD SHIFT!       */
/* ================================================================== */
export const SceneHororTawar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("tawar");
  const t1From = LINES.t1?.from ?? 10;
  const t2From = LINES.t2?.from ?? 120;
  const t3From = LINES.t3?.from ?? 230;

  const talkBagas = inLine(f, "t1");
  const talkPocong = inLine(f, "t2");
  const talkKunti = inLine(f, "t3");

  // Warm golden hangout transformation erupts right as Kang Pocong smells the pisang goreng!
  const cozyK = smoothStep(f, t2From - 12, 34);
  const stepKFn = (ff: number) => smoothStep(ff, 0, Math.max(28, t1From + 42));
  const stepK = stepKFn(f);
  const stepVel = cl((travelVel(f, stepKFn) * 1.8) / 0.025);
  const offerK = smoothStep(f, t1From + 28, 18);

  const cam = evalCam(f, [
    // Beat 1 (Bagas speaks!): Dynamic Diagonal 3D Tracking Shot (-52° -> -22°) framing Bagas + steaming snacks + ghosts!
    {
      kind: "orbit",
      to: t2From - 6,
      target0: [-0.25, 1.32, 0.25],
      target1: [-0.45, 1.24, -0.35],
      ang0: -0.82,
      ang1: -0.36,
      rad0: 6.1,
      rad1: 5.75,
      y0: 1.48,
      y1: 1.42,
      fov0: 44,
      fov1: 43,
      roll0: -2.5,
      roll1: 0,
    },
    // Beat 2 (Kang Pocong speaks!): OVER-BAGAS'S-SHOULDER 3D SHOT (+48°) looking diagonally past steaming pisang goreng!
    {
      kind: "orbit",
      to: t3From - 6,
      target0: [-0.45, 1.24, -0.35],
      target1: [-0.72, 1.42, -0.85],
      ang0: 0.56,
      ang1: 0.84,
      rad0: 5.65,
      rad1: 5.35,
      y0: 1.42,
      y1: 1.58,
      fov0: 43,
      fov1: 41,
    },
    // Beat 3 (Mbak Kunti speaks!): Low Sweeping Tabletop Orbit (-54° -> +26°, y = 1.22) framing all 3 cleanly!
    {
      kind: "orbit",
      to: dur,
      target0: [0.05, 1.38, -0.82],
      target1: [-0.25, 1.38, -0.68],
      ang0: -0.78,
      ang1: 0.34,
      rad0: 6.15,
      rad1: 6.55,
      y0: 1.24,
      y1: 1.68,
      fov0: 43,
      fov1: 44,
    },
  ]);

  const bagasPos: Vec3 = lerpV([1.25, 0, 1.35], [0.18, 0, 0.55], stepK);
  const bagasWalk = smoothWalk(stepK * 1.8, stepVel, t, "march", 3);
  const bagasOffer: Pose = {
    ...breathIdle(t, 3),
    armL: [-38, 62],
    armR: [82 + Math.sin(t * 4) * 8, 38],
    lean: 14,
    headTilt: 6,
    look: -0.5,
  };
  const bagasPose = talkAct(mixPose(bagasWalk, bagasOffer, offerK), t, talkBagas, 0.95, 3);

  // Kang Pocong gets SO excited smelling pisang goreng -> rapid adorable tippy-hops!
  const tippyHop = cozyK * Math.abs(Math.sin(t * 9.5)) * (talkPocong ? 0.32 : 0.16);
  const pocongPos: Vec3 = [-1.32, tippyHop, -1.08];
  const kuntiSwoop = smoothStep(f, t3From - 20, 26);
  const kuntiPos: Vec3 = [lerpN(0.85, 0.52, kuntiSwoop), 0.24 + Math.sin(t * 4.2) * 0.12, lerpN(-1.25, -0.95, kuntiSwoop)];

  const pocongBase: Pose = {
    ...breathIdle(t, 4),
    lean: 14 * cozyK + (talkPocong ? Math.sin(t * 9) * 5 : 0),
    headTilt: 8 * cozyK + (talkPocong ? Math.cos(t * 8) * 6 : 0),
    squash: cozyK * Math.sin(t * 9.5) * 0.05,
    look: 0.45,
  };
  const kuntiBase: Pose = {
    ...breathIdle(t, 5),
    armL: lerp2([-76, 22], [-48, 76], cozyK),
    armR: lerp2([76, 22], [68, 72], cozyK),
    lean: 14 * cozyK,
    look: -0.45,
  };
  const kuntiPose = talkAct(kuntiBase, t, talkKunti, 1.05, 5);

  const pocongP = toBean(MAS_POCONG, pocongBase, t, 4, { expr: talkPocong ? "talk" : cozyK > 0.25 ? "happy" : "shock", mouthOpen: talkPocong ? talkMouth(t) : 0, tired: true });
  const kuntiP = toBean(MBAK_KUNTI, kuntiPose, t, 5, { expr: talkKunti ? "talk" : cozyK > 0.25 ? "happy" : "shock", mouthOpen: talkKunti ? talkMouth(t) : 0, tired: true });
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: talkBagas ? "talk" : "happy", mouthOpen: talkBagas ? talkMouth(t) : 0 });
  const rikoP = toBean(RIKO_HOROR, { ...breathIdle(t, 1), armL: [-68, 22], armR: [68, 22], lean: -10, look: 0.55 }, t, 1, { expr: "shock", sweat: true });

  const bagasHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, cam.pos, true);
  const basketPos = lerpV([bagasHand[0], bagasHand[1] - 0.04, bagasHand[2] + 0.14], GORENGAN_TABLE_POS, offerK);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg={cozyK > 0.45 ? "#171432" : "#0b1026"} fog={[cozyK > 0.45 ? "#1e1a3d" : "#101635", 16, 48]}>
        <HauntedMansionYard t={t} cozy={cozyK} hideGate />
        <GroundShadow3D x={pocongPos[0]} z={pocongPos[2]} elevation={pocongPos[1]} />
        <GroundShadow3D x={kuntiPos[0]} z={kuntiPos[2]} elevation={kuntiPos[1]} />

        <BeanCard position={pocongPos} height={2.08} params={pocongP} shadow={false} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip shadow={false} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} flip />
        <BeanCard position={[-2.25, 0, 1.12]} height={2.02} params={rikoP} />

        <GorenganBasket3D pos={basketPos} scale={0.98} t={t} steam />
        {offerK > 0.2 && <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.96 * offerK} t={t} />}
        {cozyK < 0.7 && <SpookyAura3D pos={[-0.45, 0.12, -1.1]} scale={1.0 * (1 - cozyK)} t={t} />}
      </Stage>
      <Grade warm={0.35 * cozyK} cool={0.28 * (1 - cozyK)} />
      <Chip from={t2From - 2} to={dur - 6} top={145} color="#f59e0b">
        AURA HOROR LANGSUNG BUBAR! 😂
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: CURHAT — 160° TABLE-CIRCLE 3D ORBIT + BITE & CRAMP GAGS!  */
/* ================================================================== */
export const SceneHororCurhat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("curhat");
  const c2From = LINES.c2?.from ?? 135;
  const c3From = LINES.c3?.from ?? 265;
  const evMelompat = EV["curhat.melompat"] ?? c2From + 40;

  const talkKunti = inLine(f, "c1");
  const talkPocong = inLine(f, "c2");
  const talkBagas = inLine(f, "c3");

  const cam = evalCam(f, [
    // Beat 1 (Mbak Kunti speaks!): Sweeping low-to-mid 3D orbit (-68° -> +12°) across steaming pisang goreng!
    {
      kind: "orbit",
      to: c2From - 6,
      target0: [0.05, 1.38, -0.78],
      target1: [-0.08, 1.38, -0.78],
      ang0: -1.04,
      ang1: 0.18,
      rad0: 5.95,
      rad1: 5.65,
      y0: 1.28,
      y1: 1.62,
      fov0: 43,
      fov1: 42,
    },
    // Beat 2 (Kang Pocong speaks!): Sweeping right around to +62° spotlighting Pocong's hilarious calf-cramp hop!
    {
      kind: "orbit",
      to: c3From - 6,
      target0: [-0.08, 1.38, -0.78],
      target1: [-0.72, 1.38, -0.85],
      ang0: 0.18,
      ang1: 0.94,
      rad0: 5.65,
      rad1: 6.15,
      y0: 1.62,
      y1: 1.52,
      fov0: 42,
      fov1: 43,
    },
    // Beat 3 (Bagas speaks!): Reverse diagonal 3D angle framing ALL 3 friends laughing around the snacks!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.72, 1.38, -0.85],
      target1: [-0.35, 1.38, -0.78],
      ang0: 0.94,
      ang1: -0.45,
      rad0: 6.15,
      rad1: 6.55,
      y0: 1.52,
      y1: 1.82,
      fov0: 43,
      fov1: 44,
    },
  ]);

  // Mbak Kunti takes a big bite of crispy pisang goreng at scene start, then gestures expressively!
  const biteK = pulseBell(f, 2, 14, 34);
  const tiredHop = pulseBell(f, evMelompat - 6, evMelompat + 8, evMelompat + 26) * 0.56;
  const crampSlump = smoothStep(f, evMelompat + 20, 14) * (1 - smoothStep(f, c3From - 8, 12));

  const kuntiPos: Vec3 = [0.58, 0.22 + Math.sin(t * 2.8) * 0.10, -1.02];
  const pocongPos: Vec3 = [-1.42, tiredHop, -1.02];
  const bagasPos: Vec3 = [-0.42, 0, -1.10];

  const kuntiBase: Pose = {
    ...breathIdle(t, 5),
    armL: [-42, 68],
    armR: [lerpN(66, 118, biteK), lerpN(68, 96, biteK)],
    lean: 6 + biteK * 8,
    headTilt: 4 - biteK * 10,
    look: -0.35,
  };
  const kuntiPose = talkAct(kuntiBase, t, talkKunti && biteK < 0.3, 1.1, 5);

  const pocongPose: Pose = {
    ...breathIdle(t, 4),
    lean: 4 + crampSlump * 18 + (talkPocong ? Math.sin(t * 8.5) * 6 : 0),
    headTilt: 8 + crampSlump * 16 + (talkPocong ? Math.cos(t * 8.5) * 7 : 0),
    squash: tiredHop > 0.12 ? 0.075 : crampSlump * -0.055,
    look: 0.4,
  };

  const bagasBase: Pose = {
    ...breathIdle(t, 3),
    armL: [-32, 54],
    armR: [54, 62 + Math.sin(t * 3.5) * 14],
    lean: 6,
    headTilt: Math.sin(t * 3.5) * 6,
    look: talkKunti ? 0.55 : talkPocong ? -0.55 : 0,
  };
  const bagasPose = talkAct(bagasBase, t, talkBagas, 1.1, 3);

  const kuntiP = toBean(MBAK_KUNTI, kuntiPose, t, 5, { expr: biteK > 0.3 ? "happy" : talkKunti ? "talk" : "happy", mouthOpen: biteK > 0.3 ? 0.85 : talkKunti ? talkMouth(t) : 0, tired: true });
  const pocongP = toBean(MAS_POCONG, pocongPose, t, 4, { expr: talkPocong ? "talk" : "sad", mouthOpen: talkPocong ? talkMouth(t) : 0, tired: true });
  const bagasP = toBean(BAGAS_HOROR, bagasPose, t, 3, { expr: talkBagas ? "talk" : "happy", mouthOpen: talkBagas ? talkMouth(t) : 0 });

  const kuntiHand = beanHandWorld(kuntiP, "R", kuntiPos, 2.08, cam.pos, true);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#181534" fog={["#201b42", 16, 48]}>
        <HauntedMansionYard t={t} cozy={1} hideGate />
        <GroundShadow3D x={pocongPos[0]} z={pocongPos[2]} elevation={pocongPos[1]} />
        <GroundShadow3D x={kuntiPos[0]} z={kuntiPos[2]} elevation={kuntiPos[1]} />
        <HopDustPuff3D pos={[pocongPos[0], 0, pocongPos[2]]} progress={cl((f - (evMelompat + 22)) / 14)} color="#fde68a" />

        <BeanCard position={pocongPos} height={2.08} params={pocongP} shadow={false} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip shadow={false} />

        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.98} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.98} t={t} />
        <PisangGoreng3D pos={[kuntiHand[0], kuntiHand[1] + 0.03, kuntiHand[2] + 0.12]} rot={[0.25, 0.4, 0.18]} scale={0.95} />
      </Stage>
      <Grade warm={0.34} />
      <Tag label="SESI CURHAT HANTU LEMBUR ☕" from={6} to={dur - 8} color="#facc15" top={122} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: VIRAL — WHIP-ORBIT + POCONG CAMERA-LENS PHOTOBOMB!!       */
/* ================================================================== */
export const SceneHororViral: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("viral");
  const v1From = LINES.v1?.from ?? 10;
  const v2From = LINES.v2?.from ?? 145;

  const talkRiko = inLine(f, "v1");
  const talkPocong = inLine(f, "v2");

  const cam = evalCam(f, [
    // Beat 1 (Riko panics!): Snappy Dutch-Tilt Low Push-In on Riko waving his glowing LIVE phone!
    {
      kind: "orbit",
      to: v2From - 10,
      target0: [-1.48, 1.44, 0.75],
      target1: [-1.38, 1.44, 0.75],
      ang0: -0.62,
      ang1: 0.34,
      rad0: 4.65,
      rad1: 3.65,
      y0: 1.18,
      y1: 1.52,
      fov0: 42,
      fov1: 36,
      roll0: -2.0,
      roll1: -6.5,
    },
    // Beat 2 (Kang Pocong photobombs LIVE!): Wide 105° Whip-Orbit as Pocong hops RIGHT UP TO CAMERA LENS!
    {
      kind: "orbit",
      to: dur,
      target0: [-1.38, 1.44, 0.75],
      target1: [-0.35, 1.42, 0.35],
      ang0: 0.34,
      ang1: -0.52,
      rad0: 3.65,
      rad1: 8.15,
      y0: 1.52,
      y1: 1.88,
      fov0: 36,
      fov1: 46,
      roll0: -6.5,
      roll1: 2.0,
    },
  ]);

  const shockJump = pulseBell(f, v1From + 2, v1From + 12, v1From + 32);
  // Kang Pocong hops right forward from back row straight up close to the camera lens to greet viewers!
  const photobombK = smoothStep(f, v2From - 12, 34);
  const pbBounce = photobombK < 0.98 && photobombK > 0.02 ? Math.abs(Math.sin(photobombK * Math.PI * 2)) * 0.58 : Math.abs(Math.sin(t * 7.5)) * 0.18 * photobombK;

  const rikoPos: Vec3 = [-1.62, shockJump * 0.45, 0.72];
  const dediPos: Vec3 = [1.32, 0, 0.65];
  const bagasPos: Vec3 = [-0.08, 0, -1.08];
  const pocongPos: Vec3 = [lerpN(-1.12, -0.35, photobombK), pbBounce, lerpN(-1.05, 1.45, photobombK)];
  const kuntiPos: Vec3 = [0.95, 0.24 + Math.sin(t * 4.2) * 0.14, -1.05];

  const rikoShock: Pose = {
    legL: [18, -28 + shockJump * 20],
    legR: [-18, -28 + shockJump * 20],
    armL: [-94 + Math.sin(t * 16) * 18, -20],
    armR: [84 + Math.cos(t * 14) * 16, 46],
    lean: -14,
    bob: 6,
    headTilt: -10 + Math.sin(t * 16) * 8,
    squash: shockJump * 0.075 - 0.02,
    look: 0.55,
  };

  const laughBounce = (ph: number): Pose => {
    const ch = Math.sin(t * 11 + ph);
    return {
      ...breathIdle(t, ph),
      armL: [-42 + ch * 16, 74 + ch * 14],
      armR: [72 - ch * 16, 52 - ch * 14],
      lean: -6 + ch * 6,
      bob: Math.abs(ch) * 14,
      headTilt: -8 + ch * 9,
      squash: ch * 0.04,
      look: 0.15,
    };
  };

  const pocongPose: Pose = {
    ...breathIdle(t, 4),
    lean: 8 + (talkPocong ? Math.sin(t * 9.5) * 7 : 0),
    headTilt: talkPocong ? Math.cos(t * 9.5) * 9 : 0,
    squash: pbBounce > 0.2 ? 0.065 : -0.02,
    look: 0,
  };

  const rikoP = toBean(RIKO_HOROR, talkAct(rikoShock, t, talkRiko, 0.85, 1), t, 1, { expr: talkRiko ? "talk" : "shock", mouthOpen: talkRiko ? talkMouth(t) : 0, sweat: true });
  const dediP = toBean(DEDI_HOROR, laughBounce(1.2), t, 2, { expr: "laugh" });
  const bagasP = toBean(BAGAS_HOROR, laughBounce(2.4), t, 3, { expr: "laugh" });
  const pocongP = toBean(MAS_POCONG, pocongPose, t, 4, { expr: talkPocong ? "talk" : "laugh", mouthOpen: talkPocong ? talkMouth(t) : 0, tired: false });
  const kuntiP = toBean(MBAK_KUNTI, laughBounce(4.8), t, 5, { expr: "laugh", tired: false });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [v1From, v2From + 16], 0.16)} bg="#181534" fog={["#201b42", 16, 48]}>
        <HauntedMansionYard t={t} cozy={1} hideGate />
        <GroundShadow3D x={rikoPos[0]} z={rikoPos[2]} elevation={rikoPos[1]} />
        <GroundShadow3D x={pocongPos[0]} z={pocongPos[2]} elevation={pocongPos[1]} />
        <HopDustPuff3D pos={[pocongPos[0], 0, pocongPos[2]]} progress={cl((f - (v2From + 18)) / 14)} color="#fef08a" />

        <BeanCard position={rikoPos} height={2.02} params={rikoP} shadow={false} />
        <BeanCard position={dediPos} height={2.02} params={dediP} flip />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={pocongPos} height={2.12} params={pocongP} shadow={false} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.14]} rot={[0.05, 0.25, -0.08]} scale={0.94} />
        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.98} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.98} t={t} />
      </Stage>
      <Grade warm={0.34} />
      <Chip from={v1From - 2} to={v2From - 8} top={145} color="#dc2626">
        🔴 LIVE MASIH NYALA!!
      </Chip>
      <Chip from={v2From + 4} to={dur - 6} top={145} color="#06b6d4">
        PODCAST GORENGAN TENGAH MALAM! 🤣
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 7: FOTO — GRAND 125° SELFIE ORBIT + 🐱 KUCING OREN #2!       */
/* ================================================================== */
export const SceneHororFoto: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("foto");
  const f2From = LINES.f2?.from ?? 155;
  const evCekrek = EV["foto.cekrek"] ?? dur - 35;

  const talkKunti = inLine(f, "f1");
  const talkRiko = inLine(f, "f2");

  const cam = evalCam(f, [
    // Beat 1 (Mbak Kunti speaks!): Sweeping 100° orbit dipping low (y = 0.96) past 🐱 Kucing Oren #2 in foreground!
    {
      kind: "orbit",
      to: f2From - 6,
      target0: [0.05, 1.38, -0.35],
      target1: [-0.25, 1.38, -0.25],
      ang0: 0.92,
      ang1: -0.68,
      rad0: 7.45,
      rad1: 7.15,
      y0: 0.98,
      y1: 2.05,
      fov0: 46,
      fov1: 45,
      roll0: 3.0,
      roll1: -3.0,
    },
    // Beat 2 (Riko counts 1-2-3 CEKREK!): Sweeping back to hero front-right selfie arc!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.25, 1.38, -0.25],
      target1: [-0.25, 1.36, -0.35],
      ang0: -0.68,
      ang1: 0.42,
      rad0: 7.15,
      rad1: 7.65,
      y0: 2.05,
      y1: 1.65,
      fov0: 45,
      fov1: 46,
      roll0: -3.0,
      roll1: 0,
    },
  ]);

  const poseSnap = smoothStep(f, f2From - 4, 16);
  const flashK = pulseBell(f, evCekrek - 1, evCekrek + 2, evCekrek + 10);
  const happyHop = Math.abs(Math.sin(t * 7.2)) * 0.28;

  const rikoPos: Vec3 = [-1.55, 0, 0.58];
  const dediPos: Vec3 = [1.15, 0, 0.55];
  const pocongPos: Vec3 = [-1.05, happyHop, -1.02];
  const bagasPos: Vec3 = [-0.08, 0, -1.08];
  const kuntiPos: Vec3 = [0.92, 0.26 + Math.sin(t * 3.8) * 0.14, -1.02];

  const rikoBase: Pose = { ...breathIdle(t, 1), armL: [-54, 74], armR: [92, 26], lean: 8 * poseSnap, look: 0.25 };
  const kuntiBase: Pose = { ...breathIdle(t, 5), armL: [-62, 72], armR: [88, 34], headTilt: 8 * poseSnap, lean: Math.sin(t * 5) * 6 };

  const rikoP = toBean(RIKO_HOROR, talkAct(rikoBase, t, talkRiko, 0.85, 1), t, 1, { expr: talkRiko ? "talk" : "happy", mouthOpen: talkRiko ? talkMouth(t) : 0 });
  const bagasP = toBean(BAGAS_HOROR, { ...breathIdle(t, 2), armL: [-78, 42], armR: [82, 42], lean: 5 * poseSnap }, t, 2, { expr: "laugh" });
  const dediP = toBean(DEDI_HOROR, { ...breathIdle(t, 3), armL: [-62, 62], armR: [74, 48], lean: -6 * poseSnap }, t, 3, { expr: "happy" });
  const pocongP = toBean(MAS_POCONG, { ...breathIdle(t, 4), lean: 8 * poseSnap, headTilt: -8 * poseSnap, squash: happyHop * 0.2 }, t, 4, { expr: "happy", tired: false });
  const kuntiP = toBean(MBAK_KUNTI, talkAct(kuntiBase, t, talkKunti, 1.05, 5), t, 5, { expr: talkKunti ? "talk" : "happy", mouthOpen: talkKunti ? talkMouth(t) : 0, tired: false });

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, 2.02, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#181534" fog={["#201b42", 16, 48]}>
        {/* Easter Egg Kucing Oren #2 photobombing cutely beside the stone table! */}
        <HauntedMansionYard t={t} cozy={1} showCat hideGate />
        <GroundShadow3D x={pocongPos[0]} z={pocongPos[2]} elevation={pocongPos[1]} />
        <GroundShadow3D x={kuntiPos[0]} z={kuntiPos[2]} elevation={kuntiPos[1]} />

        <BeanCard position={rikoPos} height={2.02} params={rikoP} />
        <BeanCard position={dediPos} height={2.02} params={dediP} flip />
        <BeanCard position={pocongPos} height={2.08} params={pocongP} shadow={false} />
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={kuntiPos} height={2.08} params={kuntiP} flip shadow={false} />

        <PhoneGimbal3D pos={[rikoHand[0], rikoHand[1] - 0.14, rikoHand[2] + 0.16]} rot={[0.05, 0.35, -0.1]} scale={0.88} />
        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.98} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.98} t={t} />
      </Stage>
      <Grade warm={0.34} flash={flashK * 0.80} flashCol="#ffffff" />
      <Stamp text="CEKREK!! 📸" from={evCekrek - 2} to={dur - 4} color="#facc15" top={190} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 8: ENDING — BREATHTAKING PIXAR SPIRAL CRANE-UP TO FULL MOON! */
/* ================================================================== */
export const SceneHororEnding: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_HOROR("ending");
  const evKabur = EV["ending.kabur"] ?? 65;

  const cam = evalCam(f, [
    // Continuous Pixar Spiral Crane-Up lifting smoothly from yard hangout up to Giant Full Moon diorama!
    {
      kind: "orbit",
      to: dur,
      target0: [-0.25, 1.42, -0.35],
      target1: [0.95, 3.25, -3.85],
      ang0: -0.68,
      ang1: 0.32,
      rad0: 6.65,
      rad1: 13.4,
      y0: 1.48,
      y1: 5.95,
      fov0: 44,
      fov1: 49,
    },
  ]);

  const wavePose = (ph: number): Pose => {
    const w = Math.sin(t * 7.5 + ph);
    return {
      ...breathIdle(t, ph),
      armL: [-28, 42],
      armR: [108 + w * 18, 26 + Math.cos(t * 7.5 + ph) * 14],
      lean: 4 + w * 2,
      bob: Math.abs(w) * 10,
      headTilt: Math.sin(t * 4 + ph) * 6,
      look: 0,
    };
  };

  const rikoP = toBean(RIKO_HOROR, wavePose(0.2), t, 1, { expr: "happy" });
  const bagasP = toBean(BAGAS_HOROR, wavePose(1.1), t, 2, { expr: "happy" });
  const dediP = toBean(DEDI_HOROR, wavePose(2.3), t, 3, { expr: "laugh" });
  const pocongP = toBean(MAS_POCONG, { ...breathIdle(t, 4), lean: Math.sin(t * 5) * 6, headTilt: Math.sin(t * 5) * 8 }, t, 4, { expr: "happy", tired: false });
  const kuntiP = toBean(MBAK_KUNTI, wavePose(3.5), t, 5, { expr: "happy", tired: false });

  const ctaFrom = Math.max(24, evKabur - 12);
  const ctaS = spring({ frame: Math.max(0, f - ctaFrom), fps: 30, config: { damping: 11, stiffness: 200 } });

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#121432" fog={["#1a1d45", 22, 60]}>
        <HauntedMansionYard t={t} cozy={1} showCat hideGate />
        <BeanCard position={[-1.62, 0, 0.48]} height={2.02} params={rikoP} />
        <BeanCard position={[1.15, 0, 0.48]} height={2.02} params={dediP} flip />
        <BeanCard position={[-1.12, Math.abs(Math.sin(t * 5.2)) * 0.22, -1.04]} height={2.08} params={pocongP} />
        <BeanCard position={[-0.08, 0, -1.08]} height={2.02} params={bagasP} />
        <BeanCard position={[0.92, 0.24 + Math.sin(t * 3.0) * 0.12, -1.04]} height={2.08} params={kuntiP} flip />

        <GorenganBasket3D pos={GORENGAN_TABLE_POS} scale={0.98} t={t} steam />
        <ThermosCoffeeSet3D pos={THERMOS_TABLE_POS} scale={0.98} t={t} />
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

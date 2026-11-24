import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./bandung_timing.json";
import { Vec3 } from "./three/objects";
import { P } from "./three/objectsRig";
import { BeanCard, BeanParams, beanHandWorld, beanWalk } from "./three/objectsBean";
import { Cobble, Ground, InkBox, SkyDome } from "./three/objectsMolase";
import { GasLamp, Hydrant } from "./three/objectsMolaseProps";
import {
  AlliedPlane3D,
  AlliedTank3D,
  AmmoDepot,
  BandungMapBoard,
  ColonialHouse,
  CommandDesk,
  Dynamite3D,
  FireCluster,
  FlagPoleID,
  GedungSate,
  RefugeeCart,
  SandbagBarricade,
  TntCrateStack,
  WatchTower,
} from "./three/objectsBandung";
import { IBU_BANDUNG, NASUTION, RAMDAN, RELAWAN_PMI, SEKUTU, TOHA } from "./SheetBandung";

export type BandungScene = "hook" | "ultimatum" | "markas" | "bakar" | "susup" | "dinamit" | "ledakan" | "fajar";
export const BANDUNG_ORDER = timing.order as BandungScene[];
export const DUR_BD = (k: BandungScene): number => timing.scenes[k].durationInFrames;
export const TOTAL_FRAMES_BANDUNG = timing.totalFrames;

const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];

type Shot = { to: number; p0: Vec3; p1?: Vec3; l0: Vec3; l1?: Vec3; fov?: number; fov1?: number; roll0?: number; roll1?: number; creep?: number };
type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };

const shotCam = (frame: number, shots: Shot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, Math.min(s.to, start + 900) - start);
      const local = frame - start;
      const k = smoother(cl(local / len));
      const look = lerpV(s.l0, s.l1 ?? s.l0, k);
      const p = lerpV(s.p0, s.p1 ?? s.p0, k);
      const push = 1 - (s.creep ?? 0.0009) * Math.min(local, 400);
      const pos: Vec3 = [
        look[0] + (p[0] - look[0]) * push,
        look[1] + (p[1] - look[1]) * push,
        look[2] + (p[2] - look[2]) * push,
      ];
      const f0 = s.fov ?? 36;
      return { pos, look, fov: lerpN(f0, s.fov1 ?? f0, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 36, roll: 0 };
};

const kick = (f: number, hits: number[], amp = 0.14): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 12) {
      const a = (1 - d / 12) * amp;
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
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.05, far: 220, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <color attach="background" args={[bg]} />
        {fog && <fog attach="fog" args={fog} />}
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const Lights: React.FC<{ key1?: string; sky?: string; ground?: string; dir?: Vec3; k?: number; hemi?: number }> = ({
  key1 = "#ffcf96",
  sky = "#9ab4f0",
  ground = "#6e4e58",
  dir = [-8, 11, 10],
  k = 2.1,
  hemi = 1.65,
}) => (
  <>
    <hemisphereLight args={[sky, ground, hemi]} />
    <directionalLight position={[0, 6, 14]} intensity={0.85} color="#fff2de" />
    <directionalLight position={dir} intensity={k} color={key1} castShadow shadow-mapSize={[1024, 1024]} />
  </>
);

const Grade: React.FC<{ warm?: number; cool?: number; dark?: number; flash?: number }> = ({
  warm = 0,
  cool = 0,
  dark = 0,
  flash = 0,
}) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: warm > 0 ? `rgba(255,140,60,${0.35 * warm})` : `rgba(60,90,210,${0.32 * cool})`,
        }}
      />
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(28,10,24,0.52) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(20,8,20,0) 68%, rgba(20,8,20,0.48) 88%, rgba(20,8,20,0.68) 100%)" }} />
    {dark > 0 && <AbsoluteFill style={{ background: `rgba(10,12,26,${dark})` }} />}
    {flash > 0 && <AbsoluteFill style={{ background: "#fff8e0", opacity: flash }} />}
  </>
);

const Tag: React.FC<{ label: string; from?: number; to: number; color?: string; top?: number }> = ({
  label,
  from = 0,
  to,
  color = "#ffd23f",
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
        background: "rgba(30,12,22,0.88)",
        border: `3px solid ${color}`,
        fontFamily: FONT_BODY,
        fontWeight: 800,
        fontSize: 34,
        letterSpacing: 2,
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
  color = "#991b1b",
}) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 200 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
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
          padding: "14px 32px",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 66,
          color: "#1a121c",
          boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
          lineHeight: 1.05,
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
  w = 460,
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
          padding: "12px 20px",
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

const Stamp: React.FC<{ text: string; from: number; to: number; color?: string }> = ({ text, from, to, color = "#dc2626" }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 9, stiffness: 260 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 520,
        left: 70,
        right: 70,
        textAlign: "center",
        transform: `rotate(-6deg) scale(${1.5 - 0.5 * s})`,
        opacity: Math.min(1, s * 2) * o,
      }}
    >
      <div
        style={{
          display: "inline-block",
          border: `10px solid ${color}`,
          borderRadius: 20,
          padding: "14px 36px",
          background: "rgba(255,248,235,0.94)",
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

/* Global synced 1-2 word spring captions matching Banjir Molase Boston! */
export const BandungCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cue = timing.captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const sp = spring({ frame: frame - cue.startFrame, fps, config: { damping: 12, stiffness: 250 } });
  const txt = cue.text.toLowerCase();
  const size = Math.min(86, 740 / (Math.max(4, txt.length) * 0.52));
  return (
    <div style={{ position: "absolute", top: 1360, left: 70, right: 70, textAlign: "center", pointerEvents: "none" }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: FONT_BODY,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.1,
          color: cue.highlight ? "#ffd23f" : "#ffffff",
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

const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({
  bob: Math.abs(Math.sin(t * 1.7 + k)) * 3,
  armL: [-8 + Math.sin(t * 1.3 + k) * 3, -10],
  armR: [8 - Math.sin(t * 1.3 + k) * 3, -10],
  blink: (t + k * 0.7) % 2.9 < 0.12,
});
const talkMouth = (t: number) => 0.35 + 0.65 * Math.abs(Math.sin(t * 14));

/* Shared 3D Bandung Colonial Street */
const BandungStreet3D: React.FC<{ t: number; fireLevel?: number; dusk?: boolean }> = ({ t, fireLevel = 0, dusk = false }) => (
  <group>
    <Ground color={dusk ? "#4c3e4c" : "#8b889c"} />
    <Cobble w={10} z={0.8} len={110} a={dusk ? "#6a5a6e" : "#9694aa"} b="#2d2638" />
    <InkBox pos={[0, 0.12, -4.6]} size={[110, 0.24, 2.0]} color="#bdb4a8" ink={0.05} />
    {/* Back row colonial buildings + Gedung Sate centerpiece */}
    <ColonialHouse pos={[-15, 0, -9.0]} base="#d4a982" seed={2} burning={fireLevel} t={t} />
    <ColonialHouse pos={[-8.8, 0, -8.8]} base="#c97b63" seed={5} burning={fireLevel * 0.9} t={t} />
    <GedungSate pos={[0, 0, -10.2]} lit={0.65} />
    <ColonialHouse pos={[9.0, 0, -8.8]} base="#dfd0b2" seed={8} burning={fireLevel} t={t} />
    <ColonialHouse pos={[15.4, 0, -9.0]} base="#b56552" seed={11} burning={fireLevel * 0.85} t={t} />
    {/* Street lamps & hydrants */}
    {[-12, -5.2, 5.2, 12].map((x) => (
      <GasLamp key={x} pos={[x, 0.24, -4.1]} lit={dusk} />
    ))}
    <Hydrant pos={[-3.2, 0.24, -3.9]} />
    {/* Burning horizon fire wall when fireLevel > 0 */}
    {fireLevel > 0.05 && (
      <group>
        {[-13, -7, -2.5, 2.5, 7.5, 13].map((fx, i) => (
          <FireCluster key={i} pos={[fx, 0.4, -5.8 - (i % 2) * 1.4]} scale={(1.3 + (i % 3) * 0.35) * fireLevel} t={t} seed={i * 3} />
        ))}
      </group>
    )}
  </group>
);

/* ================================================================== */
/* SCENE 1: HOOK — BANDUNG MEMBARA (23 MARET 1946)                    */
/* ================================================================== */
export const SceneBdHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("hook");
  const cam = shotCam(f, [
    { to: 115, p0: [2.4, 2.7, 12.6], p1: [0.3, 2.0, 9.4], l0: [0, 2.2, -3.0], l1: [0, 1.55, 0.0], fov: 40, fov1: 38 },
    { to: dur, p0: [0.3, 2.0, 9.4], p1: [-1.1, 1.9, 8.6], l0: [0, 1.55, 0.0], l1: [0.0, 1.55, 0.2], fov: 38, fov1: 37 },
  ]);

  const runK = smoother(cl(f / 65));
  const tohaX = lerpN(-4.2, -0.68, runK);
  const ramdanX = lerpN(-5.4, 0.72, runK);
  const isRunning = f < 62;
  const fistRaise = smoother(cl((f - 85) / 35));

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [15, 75, 140], 0.06)} bg="#3b1824" fog={["#5e2422", 22, 80]}>
        <SkyDome top="#1e1230" horizon="#d9532f" />
        <Lights key1="#ffb066" sky="#ff8c5a" ground="#5c2824" k={2.4} />
        <BandungStreet3D t={t} fireLevel={1.0} dusk />
        <SandbagBarricade pos={[0, 0, -0.8]} />
        <FlagPoleID pos={[1.85, 0, -1.2]} h={5.0} t={t} />
        <BeanCard
          position={[tohaX, 0, 0.55]}
          height={2.15}
          params={bean(TOHA, {
            ...(isRunning ? beanWalk(t * 2.6, 1.1) : idle(t, 1)),
            expr: f > 80 ? "angry" : "worried",
            armR: isRunning ? [24 * Math.sin(t * 15), -10] : [lerpN(12, 138, fistRaise), lerpN(-10, -25, fistRaise)],
            prop: "bamboo",
          })}
        />
        <BeanCard
          position={[ramdanX, 0, 0.95]}
          height={2.1}
          params={bean(RAMDAN, {
            ...(isRunning ? beanWalk(t * 2.5 + 0.3, 1.0) : idle(t, 2)),
            expr: "angry",
            prop: "rifle",
            armR: [42, -32],
          })}
        />
      </Stage>
      <Grade warm={0.75} />
      <Tag label="BANDUNG · 23 MARET 1946" from={4} to={dur - 12} color="#facc15" />
      <Chip from={118} to={dur - 10} top={250} color="#dc2626">
        LAUTAN API
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 2: ULTIMATUM SEKUTU DARI UDARA (7 JAM)                       */
/* ================================================================== */
export const SceneBdUltimatum: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("ultimatum");
  const cam = shotCam(f, [
    { to: 112, p0: [-1.4, 3.6, 11.4], p1: [0.3, 2.1, 10.6], l0: [-0.2, 5.8, -4.5], l1: [-0.1, 1.5, -0.5], fov: 42, fov1: 40 },
    { to: dur, p0: [0.3, 2.1, 10.6], p1: [0.7, 1.9, 9.0], l0: [-0.1, 1.5, -0.5], l1: [0.0, 1.45, 0.2], fov: 40, fov1: 38 },
  ]);

  const planeX = lerpN(-6.5, 8.5, cl(f / 115));
  const tankX = lerpN(-5.8, -1.7, smoother(cl(f / 145)));
  // Ramdan bends to pick up a fallen leaflet at f=108..148, then holds it up!
  const bendK = f < 108 ? 0 : f < 142 ? smoother((f - 108) / 34) : 1 - smoother(cl((f - 142) / 26));
  const picked = f >= 138;

  const ramdanParams = bean(RAMDAN, {
    ...idle(t, 4),
    lean: bendK * 22,
    bob: -bendK * 28,
    expr: picked ? (f > 180 ? "angry" : "shock") : "worried",
    armR: picked ? [72, -52] : [bendK * 55, bendK * 12],
    prop: "none",
  });
  const handPos = beanHandWorld(ramdanParams, "R", [0.85, 0, 1.25], 2.15, cam.pos, true);
  const paperPos: Vec3 = picked ? handPos : [0.55, lerpN(6.6, 0.06, cl((f - 30) / 90)), 1.25];

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#9ec5ea" fog={["#b8d4f0", 28, 95]}>
        <SkyDome top="#4a7ec4" horizon="#f4d8b8" />
        <Lights key1="#fff0cc" sky="#cce4ff" ground="#8d8278" k={2.2} />
        <BandungStreet3D t={t} fireLevel={0} dusk={false} />
        {/* Allied Warplane flying clearly across upper sky */}
        <AlliedPlane3D pos={[planeX, 6.6, -4.6]} rot={[0.06, Math.PI / 2, -0.15]} t={t} />
        {/* Fluttering leaflets falling from the sky */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const lf = cl((f - 12 - i * 7) / 115);
          if (lf <= 0) return null;
          const y = lerpN(6.8, 0.05, lf);
          const x = -2.4 + i * 0.65 + Math.sin(t * 4 + i) * 0.4;
          return (
            <InkBox
              key={i}
              pos={[x, y, -0.8 + (i % 3) * 0.9]}
              size={[0.34, 0.02, 0.46]}
              rot={[Math.sin(t * 5 + i) * 0.5, t * 2 + i, Math.cos(t * 4 + i) * 0.4]}
              color="#fffdf0"
              ink={0.015}
            />
          );
        })}
        {/* Allied Sherman Tank + Guard cleanly visible on left/mid */}
        <AlliedTank3D pos={[tankX, 0, -2.4]} rot={[0, 1.05, 0]} turretYaw={-0.18} />
        <BeanCard
          position={[tankX + 1.35, 0, -0.55]}
          height={2.1}
          params={bean(SEKUTU, { ...idle(t, 9), expr: "smug", prop: "rifle", armR: [45, -35] })}
        />
        {/* Ramdan picking up & reading the 3D ultimatum paper in his actual hand */}
        <BeanCard position={[0.85, 0, 1.25]} height={2.15} flip params={ramdanParams} />
        <InkBox
          pos={paperPos}
          size={[0.38, 0.5, 0.03]}
          rot={[picked ? 0 : Math.PI / 2, picked ? -0.2 : 0.4, 0]}
          color="#fff9e2"
          ink={0.015}
        />
      </Stage>
      <Grade warm={0.18} />
      <Chip from={138} to={dur - 10} top={185} color="#1d3557">
        ULTIMATUM · 7 JAM
      </Chip>
      <Bubble x={540} y={355} w={560} size={38} text="KOSONGKAN SEBELUM 24.00!" from={155} to={dur - 15} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: POS MARKAS DIVISI III TRI (KOLONEL A.H. NASUTION)         */
/* ================================================================== */
export const SceneBdMarkas: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("markas");
  const cam = shotCam(f, [
    { to: 115, p0: [1.5, 2.2, 9.6], p1: [0.1, 2.0, 8.6], l0: [0, 1.75, -1.0], l1: [0, 1.8, -1.2], fov: 40, fov1: 38 },
    { to: dur, p0: [0.1, 2.0, 8.6], p1: [-1.1, 2.05, 8.8], l0: [0, 1.8, -1.2], l1: [0, 1.85, -1.4], fov: 38, fov1: 38 },
  ]);

  // Action Beat: Ramdan walks in (0-45f) -> hands ultimatum letter to Nasution (45-85f) -> Nasution points firmly to Bandung Map (105-end)
  const walkIn = smoother(cl(f / 45));
  const ramX = lerpN(-2.6, -0.88, walkIn);
  const handOverK = smoother(cl((f - 48) / 28));
  const m2From = timing.lines.m2.from;
  const m2To = timing.lines.m2.to;
  const talking = f >= m2From && f <= m2To;

  const ramP = bean(RAMDAN, {
    ...(f < 44 ? beanWalk(t * 2.4, 0.9) : idle(t, 3)),
    expr: "worried",
    armR: f >= 44 && f < 90 ? [78, -22] : [20, -25],
    prop: "none",
  });
  const nasP = bean(NASUTION, {
    ...idle(t, 5),
    expr: talking ? "talk" : f > 85 ? "angry" : "think",
    mouthOpen: talking ? talkMouth(t) : 0,
    armL: f >= 50 && f < 95 ? [-75, 22] : [-15, -18],
    armR: f >= Math.min(105, m2From) ? [115, -20] : [18, -22],
    prop: "none",
  });

  const ramHand = beanHandWorld(ramP, "R", [ramX, 0, 0.75], 2.1, cam.pos, false);
  const nasHand = beanHandWorld(nasP, "L", [0.88, 0, 0.55], 2.18, cam.pos, true);
  const paperWorld: Vec3 =
    f < 52
      ? ramHand
      : f < 82
        ? lerpV(ramHand, nasHand, handOverK)
        : f < 105
          ? lerpV(nasHand, [0.15, 1.18, -0.35], smoother((f - 82) / 23))
          : [0.15, 1.18, -0.35];

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#3b2820">
        <Lights key1="#ffe0a8" sky="#ffd8a8" ground="#5c3e32" dir={[4, 7, 8]} k={2.2} hemi={1.7} />
        {/* Warm Enclosed 3D Colonial Command Room */}
        <Ground color="#5c3e2a" size={26} />
        <InkBox pos={[0, 3.2, -2.8]} size={[14, 6.4, 0.3]} color="#d8c39e" ink={0.05} />
        <InkBox pos={[-6.2, 3.2, 1.5]} size={[0.3, 6.4, 10]} color="#cbb48c" ink={0.05} />
        <InkBox pos={[6.2, 3.2, 1.5]} size={[0.3, 6.4, 10]} color="#cbb48c" ink={0.05} />
        {/* Bandung Strategy Map sized cleanly for vertical 9:16 framing */}
        <group position={[0, 2.75, -2.55]} scale={[0.84, 0.84, 1]}>
          <BandungMapBoard pos={[0, 0, 0]} />
        </group>
        {/* Wooden Command Desk + Field Phone + Standing Flag */}
        <CommandDesk pos={[0, 0, -0.5]} />
        <FlagPoleID pos={[2.2, 0, -2.1]} h={3.8} t={t * 0.4} />
        {/* Characters both framed clearly inside 9:16 */}
        <BeanCard position={[ramX, 0, 0.75]} height={2.1} params={ramP} />
        <BeanCard position={[0.88, 0, 0.55]} height={2.18} flip params={nasP} />
        {/* Real 3D Ultimatum Paper transferring hand-to-hand -> desk! */}
        <InkBox
          pos={paperWorld}
          size={[0.34, 0.44, 0.03]}
          rot={[f >= 105 ? Math.PI / 2 : 0, 0.15, 0]}
          color="#fff9e2"
          ink={0.015}
        />
      </Stage>
      <Grade warm={0.35} />
      <Tag label="POS MARKAS DIVISI III TRI" from={6} to={dur - 12} color="#f59e0b" />
      <Bubble x={540} y={265} w={540} size={42} text="BUMIHANGUSKAN BANDUNG!" from={Math.max(95, m2From - 4)} to={dur - 10} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 4: 200.000 WARGA MEMBAKAR RUMAHNYA SENDIRI (11 KM API)       */
/* ================================================================== */
export const SceneBdBakar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("bakar");
  const cam = shotCam(f, [
    { to: 115, p0: [-0.8, 2.1, 9.8], p1: [0.2, 2.0, 9.0], l0: [0.1, 1.65, -0.5], l1: [0.4, 1.75, -1.2], fov: 40, fov1: 39 },
    { to: dur, p0: [0.2, 2.0, 9.0], p1: [2.4, 2.5, 11.4], l0: [0.4, 1.75, -1.2], l1: [1.1, 1.9, -2.2], fov: 39, fov1: 43 },
  ]);

  // Action Beat: Ibu raises burning torch (30-85f) -> touches porch -> fire spreads (85-160f) -> evacuates with RefugeeCart & Relawan (145-end)
  const fireGrow = smoother(cl((f - 78) / 85));
  const moveAway = smoother(cl((f - 145) / 95));
  const ibuX = lerpN(-0.9, 1.15, moveAway);
  const relawanX = lerpN(0.45, 2.35, moveAway);
  const cartX = lerpN(1.55, 3.65, moveAway);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2d1424" fog={["#54201f", 20, 75]}>
        <SkyDome top="#140c24" horizon="#d94e28" />
        <Lights key1="#ffa852" sky="#ff7b47" ground="#4a2020" k={2.4} />
        <BandungStreet3D t={t} fireLevel={0.18 + fireGrow * 1.15} dusk />
        {/* Refugee Cart loaded with mattress & bundles */}
        <RefugeeCart pos={[cartX, 0, 1.25]} />
        {/* Ibu Pengungsi lighting her own home with a torch, then evacuating */}
        <BeanCard
          position={[ibuX, 0, 0.55]}
          height={2.05}
          params={bean(IBU_BANDUNG, {
            ...(f >= 145 ? beanWalk(t * 2.0, 0.85) : idle(t, 6)),
            expr: f < 110 ? "sad" : "worried",
            prop: "torch",
            armR: f < 130 ? [lerpN(35, 118, smoother(cl((f - 25) / 55))), -35] : [45, -20],
          })}
        />
        {/* Relawan Palang Merah assisting evacuation */}
        <BeanCard
          position={[relawanX, 0, 1.05]}
          height={2.05}
          params={bean(RELAWAN_PMI, {
            ...(f >= 145 ? beanWalk(t * 2.0 + 0.4, 0.85) : idle(t, 7)),
            expr: "worried",
            prop: "medkit",
            armR: [35, -20],
          })}
        />
      </Stage>
      <Grade warm={0.35 + fireGrow * 0.55} />
      <Chip from={125} to={dur - 10} top={175} color="#dc2626">
        200.000 WARGA · 11 KM API
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: MISI RAHASIA — GUDANG MESIU DAYEUHKOLOT (LAMPU SOROT)     */
/* ================================================================== */
export const SceneBdSusup: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("susup");
  const cam = shotCam(f, [
    { to: 125, p0: [-1.4, 2.35, 10.8], p1: [-0.4, 2.0, 9.4], l0: [0.0, 2.5, -3.6], l1: [-0.2, 1.6, -0.8], fov: 42, fov1: 39 },
    { to: dur, p0: [-0.4, 2.0, 9.4], p1: [1.1, 2.0, 8.8], l0: [-0.2, 1.6, -0.8], l1: [0.25, 1.65, -1.8], fov: 39, fov1: 40 },
  ]);

  const sweep = Math.sin(t * 1.65) * 0.58;
  const guardX = Math.sin(t * 1.1) * 1.85;
  const crouchK = f > 35 && f < 125 ? 1 : 0;
  const sneakWalk = smoother(cl((f - 130) / 120));
  const tohaX = lerpN(-0.25, 0.72, sneakWalk);
  const ramX = lerpN(-1.15, -0.42, sneakWalk);
  const tohaZ = lerpN(2.1, -0.4, sneakWalk);
  const ramZ = lerpN(2.35, -0.1, sneakWalk);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#0d1428" fog={["#18223d", 28, 95]}>
        <SkyDome top="#0a1228" horizon="#5c2828" />
        <Lights key1="#bdd4ff" sky="#7088c8" ground="#342838" k={2.0} hemi={1.45} />
        <Ground color="#2e323c" />
        <Cobble w={12} z={1.0} len={90} a="#4b5060" b="#1e202a" />
        {/* Giant Dayeuhkolot Ammo Depot & Closer Sweeping WatchTowers */}
        <AmmoDepot pos={[0, 0, -6.5]} />
        <WatchTower pos={[4.4, 0, -4.0]} sweepAngle={sweep - 0.35} />
        <WatchTower pos={[-4.4, 0, -4.0]} sweepAngle={-sweep + 0.35} />
        <SandbagBarricade pos={[-0.6, 0, 1.5]} />
        {/* Patrolling Allied Guard always visible in front of depot */}
        <BeanCard
          position={[guardX, 0, -2.2]}
          height={2.15}
          flip={Math.cos(t * 1.1) < 0}
          params={bean(SEKUTU, { ...beanWalk(t * 1.4, 0.8), expr: "neutral", prop: "rifle", armR: [45, -35] })}
        />
        {/* Mohammad Toha & Ramdan crouching behind sandbags, then sneaking in! */}
        <BeanCard
          position={[tohaX, 0, tohaZ]}
          height={2.1}
          params={bean(TOHA, {
            ...(f >= 130 ? beanWalk(t * 2.2, 0.85) : idle(t, 1)),
            bob: crouchK ? -55 : 0,
            lean: crouchK ? 16 : 6,
            expr: "angry",
            prop: "dynamite",
            armR: [48, -42],
          })}
        />
        <BeanCard
          position={[ramX, 0, ramZ]}
          height={2.05}
          params={bean(RAMDAN, {
            ...(f >= 130 ? beanWalk(t * 2.2 + 0.4, 0.85) : idle(t, 2)),
            bob: crouchK ? -55 : 0,
            lean: crouchK ? 16 : 6,
            expr: "worried",
            sweat: crouchK > 0,
            prop: "rifle",
            armR: [42, -32],
          })}
        />
      </Stage>
      <Grade cool={0.38} />
      <Tag label="GUDANG MESIU DAYEUHKOLOT" from={8} to={dur - 12} color="#38bdf8" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: MENYALAKAN DINAMIT DI DALAM GUDANG MESIU                  */
/* ================================================================== */
export const SceneBdDinamit: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("dinamit");
  const cam = shotCam(f, [
    { to: 118, p0: [1.3, 1.95, 8.2], p1: [0.2, 1.8, 6.8], l0: [0, 1.55, -0.7], l1: [-0.1, 1.55, -0.7], fov: 38, fov1: 36 },
    { to: dur, p0: [0.2, 1.8, 6.8], p1: [-0.8, 1.9, 7.6], l0: [-0.1, 1.55, -0.7], l1: [0.15, 1.55, -0.3], fov: 36, fov1: 38 },
  ]);

  // Action Beat: Toha walks to TNT stack (0-48f) -> places 3D Dynamite onto crate (48-78f) -> lights fuse (84f+) -> tells Ramdan to retreat (128f+)
  const tohaWalk = smoother(cl(f / 48));
  const tohaX = lerpN(-1.45, -0.55, tohaWalk);
  const placed = f >= 78;
  const fuseLit = f >= 84;
  const d2From = timing.lines.d2.from;
  const d2To = timing.lines.d2.to;
  const talking = f >= d2From && f <= d2To;
  const retreatStart = d2From + 12;
  const ramRetreat = smoother(cl((f - retreatStart) / 85));
  const ramX = lerpN(0.88, 3.8, ramRetreat);

  const tohaP = bean(TOHA, {
    ...(f < 46 ? beanWalk(t * 2.2, 0.85) : idle(t, 1)),
    expr: talking ? "talk" : "angry",
    mouthOpen: talking ? talkMouth(t) : 0,
    armR: f >= 46 && f < 105 ? [72, -32] : talking ? [105, -20] : [20, -25],
    prop: "none",
  });
  const tohaHand = beanHandWorld(tohaP, "R", [tohaX, 0, 0.55], 2.15, cam.pos, false);
  const crateSpot: Vec3 = [0.0, 2.34, -1.15];
  const dynPos: Vec3 = placed ? crateSpot : f < 48 ? tohaHand : lerpV(tohaHand, crateSpot, smoother((f - 48) / 30));

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#1a1c22">
        <Lights key1={fuseLit ? "#ffbe6b" : "#9db8e6"} sky="#586478" ground="#2c2420" dir={[2, 8, 6]} k={2.2} hemi={1.35} />
        {/* Dark Reinforced Concrete Depot Interior */}
        <Ground color="#3b3e46" size={24} />
        <InkBox pos={[0, 3.4, -3.2]} size={[14, 6.8, 0.35]} color="#4a505a" ink={0.06} />
        <InkBox pos={[-6.0, 3.4, 1.5]} size={[0.35, 6.8, 10]} color="#3e444e" ink={0.06} />
        <InkBox pos={[6.0, 3.4, 1.5]} size={[0.35, 6.8, 10]} color="#3e444e" ink={0.06} />
        {/* Towering TNT Crates & Brass Artillery Shells */}
        <TntCrateStack pos={[0, 0, -1.5]} />
        <TntCrateStack pos={[-3.4, 0, -1.8]} />
        <TntCrateStack pos={[3.5, 0, -1.8]} />
        {/* Characters */}
        <BeanCard position={[tohaX, 0, 0.55]} height={2.15} params={tohaP} />
        <BeanCard
          position={[ramX, 0, 0.85]}
          height={2.1}
          flip={f < retreatStart}
          params={bean(RAMDAN, {
            ...(f >= retreatStart ? beanWalk(t * 2.6, 1.0) : idle(t, 2)),
            expr: "shock",
            sweat: true,
            prop: "rifle",
            armR: [40, -30],
          })}
        />
        {/* Real 3D Dynamite Bundle placed onto TNT Crate with sparkling lit fuse! */}
        <Dynamite3D pos={dynPos} rot={[0, 0.2, 0.15]} scale={1.15} lit={fuseLit} t={t} />
      </Stage>
      <Grade warm={fuseLit ? 0.45 : 0} cool={fuseLit ? 0 : 0.3} />
      <Bubble x={540} y={295} w={560} size={42} text="CEPAT MUNDUR, RAMDAN!" from={Math.max(95, d2From - 4)} to={dur - 10} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 7: LEDAKAN DAHSYAT DAYEUHKOLOT (18.000 TON MESIU HANCUR)     */
/* ================================================================== */
const DEBRIS_V: [number, number, number, string][] = [
  [-5.2, 9.5, 4.2, "#a86f38"],
  [4.8, 10.8, 3.8, "#704620"],
  [-3.4, 12.2, 2.5, "#5b626c"],
  [3.6, 11.4, 5.2, "#dc2626"],
  [-6.4, 7.6, 5.8, "#4a505a"],
  [6.0, 8.2, 4.6, "#b87a3d"],
  [-1.6, 13.4, 4.0, "#3a3f46"],
  [2.1, 12.6, 3.2, "#945e2c"],
];

export const SceneBdLedakan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("ledakan");
  const cam = shotCam(f, [
    { to: dur, p0: [0.4, 2.2, 11.4], p1: [1.3, 4.6, 20.2], l0: [0, 2.6, -5.0], l1: [0, 4.8, -5.0], fov: 40, fov1: 48 },
  ]);

  const boomStart = 12;
  const expK = cl((f - boomStart) / 110);
  const coreScale = 0.9 + smoother(Math.min(expK * 1.4, 1)) * 2.1;
  const flash = f >= boomStart && f < boomStart + 16 ? interpolate(f, [boomStart, boomStart + 4, boomStart + 16], [0, 0.92, 0], clamp) : 0;
  const guardRun = smoother(cl((f - 10) / 100));

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [boomStart, boomStart + 8, boomStart + 16, boomStart + 26, boomStart + 40], 0.32)} bg="#241016">
        <SkyDome top="#12091c" horizon={expK > 0.05 ? "#ff6b2b" : "#24304a"} />
        <Lights key1="#ffd080" sky="#ff8844" ground="#4a2018" k={2.8} />
        <Ground color="#2e2a34" />
        <Cobble w={12} z={1.0} len={90} a="#4b4656" b="#1e1c24" />
        <AmmoDepot pos={[0, 0, -6.5]} />
        <WatchTower pos={[4.8, 0, -4.4]} sweepAngle={0.2} />
        <WatchTower pos={[-4.8, 0, -4.4]} sweepAngle={-0.2} />
        {/* Allied guard sprinting across foreground in shock */}
        <BeanCard
          position={[lerpN(0.6, -3.4, guardRun), 0, 1.6]}
          height={2.1}
          flip
          params={bean(SEKUTU, { ...beanWalk(t * 3.8, 1.3), expr: "scared", sweat: true, armL: [-80, -30], armR: [80, -30] })}
        />
        {/* Layered 3D Mushroom Cloud + Dark Smoke Crown + Flying Crate Debris */}
        {expK > 0.01 && (
          <group position={[0, 1.2, -4.8]}>
            {/* Glowing Base Fire Core */}
            <FireCluster pos={[0, 0.2, 0.5]} scale={coreScale} t={t * 1.6} seed={1} />
            <FireCluster pos={[-2.2 * expK, 1.6 * expK, 0.8]} scale={coreScale * 0.72} t={t * 1.4} seed={4} />
            <FireCluster pos={[2.3 * expK, 1.8 * expK, 0.7]} scale={coreScale * 0.74} t={t * 1.5} seed={7} />
            {/* Rising Billowing Dark Charcoal Mushroom Smoke Crown */}
            {[
              [0, 3.6 + expK * 5.2, -0.2, 2.3 + expK * 1.6, "#3b232a"],
              [-2.2 - expK * 1.5, 3.0 + expK * 4.5, 0.2, 1.9 + expK * 1.3, "#4d2824"],
              [2.2 + expK * 1.5, 3.1 + expK * 4.7, 0.1, 1.9 + expK * 1.3, "#2f1b24"],
              [0, 5.2 + expK * 6.5, 0.3, 1.7 + expK * 1.4, "#241720"],
            ].map(([sx, sy, sz, sr, scol], i) => (
              <P
                key={i}
                geo={() => <icosahedronGeometry args={[sr as number, 1]} />}
                color={scol as string}
                pos={[sx as number, sy as number, sz as number]}
                scale={[1.15, 0.9, 1.0]}
                hull={0.06}
              />
            ))}
            {/* Flying 3D Wooden Crate & Concrete Debris */}
            {DEBRIS_V.map(([vx, vy, vz, col], i) => {
              const dt = expK * 1.5;
              const dy = Math.max(-0.9, 1.2 + vy * dt - 6.8 * dt * dt);
              return (
                <InkBox
                  key={i}
                  pos={[vx * dt, dy, vz * dt]}
                  size={[0.62, 0.48, 0.52]}
                  rot={[dt * (4 + i), dt * (3 + i * 0.7), dt * 5]}
                  color={col}
                  ink={0.04}
                />
              );
            })}
            {/* Golden Ground Shockwave Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.0, 0]} scale={1 + expK * 13}>
              <ringGeometry args={[0.72, 0.98, 28]} />
              <meshBasicMaterial color="#fef08a" transparent opacity={1 - expK} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </Stage>
      <Grade warm={0.75} flash={flash} />
      <Stamp text="18.000 TON MESIU HANCUR" from={78} to={dur - 10} color="#dc2626" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 8: PENUTUP — LANGIT FAJAR BANDUNG (SEMANGAT ABADI)           */
/* ================================================================== */
export const SceneBdFajar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_BD("fajar");
  const cam = shotCam(f, [
    { to: dur, p0: [-0.6, 2.0, 11.4], p1: [0.4, 3.2, 13.6], l0: [0, 1.8, -1.0], l1: [0, 3.1, -3.2], fov: 40, fov1: 44 },
  ]);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#d98a5f" fog={["#e09a72", 28, 100]}>
        <SkyDome top="#3a4c7a" horizon="#ffb677" />
        <Lights key1="#ffdca8" sky="#ffd0a0" ground="#7a5850" dir={[6, 9, 10]} k={2.2} hemi={1.8} />
        <BandungStreet3D t={t} fireLevel={0.32} dusk={false} />
        <SandbagBarricade pos={[0, 0, -1.2]} />
        {/* Flagpole placed to the left-back so Merah Putih waves proudly without slicing center */}
        <FlagPoleID pos={[-2.15, 0, -2.0]} h={5.8} t={t} />
        {/* All 4 heroes & citizens tightly staggered inside 9:16 vertical frame */}
        <BeanCard position={[-1.42, 0, 0.35]} height={2.1} params={bean(NASUTION, { ...idle(t, 1), expr: "neutral", armR: [110, -85] })} />
        <BeanCard position={[-0.48, 0, 0.95]} height={2.08} params={bean(RAMDAN, { ...idle(t, 2), expr: "sad", prop: "rifle", armR: [35, -25] })} />
        <BeanCard position={[0.52, 0, 0.95]} height={2.02} params={bean(IBU_BANDUNG, { ...idle(t, 3), expr: "happy" })} />
        <BeanCard position={[1.45, 0, 0.35]} height={2.02} params={bean(RELAWAN_PMI, { ...idle(t, 4), expr: "happy", prop: "medkit", armR: [30, -20] })} />
      </Stage>
      <Grade warm={0.5} />
      <Chip from={120} to={dur - 6} top={185} color="#991b1b">
        BANDUNG LAUTAN API · 1946
      </Chip>
    </AbsoluteFill>
  );
};

export const BANDUNG_SCENES: Record<BandungScene, React.FC> = {
  hook: SceneBdHook,
  ultimatum: SceneBdUltimatum,
  markas: SceneBdMarkas,
  bakar: SceneBdBakar,
  susup: SceneBdSusup,
  dinamit: SceneBdDinamit,
  ledakan: SceneBdLedakan,
  fajar: SceneBdFajar,
};

export const DissolveBd: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= 10 ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / 10);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

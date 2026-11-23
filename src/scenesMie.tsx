import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./mie_timing.json";
import { Vec3 } from "./three/objects";
import { P } from "./three/objectsRig";
import { BeanCard, BeanParams, beanHandWorld, beanWalk } from "./three/objectsBean";
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

const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({
  bob: Math.abs(Math.sin(t * 1.8 + k)) * 3,
  armL: [-8 + Math.sin(t * 1.3 + k) * 3, -10],
  armR: [8 - Math.sin(t * 1.3 + k) * 3, -10],
  blink: (t + k * 0.7) % 2.9 < 0.12,
});
const talkMouth = (t: number) => 0.35 + 0.65 * Math.abs(Math.sin(t * 15));

/* Shared Enclosed 3D Kosan Kitchen Room */
const KosanKitchenRoom: React.FC<{
  burnerOn?: boolean;
  scorchLevel?: number;
  fireScale?: number;
  t?: number;
  smokeCloud?: number;
  warmLight?: number;
}> = ({ burnerOn = true, scorchLevel = 0, fireScale = 0, t = 0, smokeCloud = 0, warmLight = 1 }) => {
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
      <KosanKitchenCounter pos={[0.25, 0, -1.65]} burnerOn={burnerOn} scorchLevel={scorchLevel} fireScale={fireScale} t={t} />
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
/* SCENE 1: HOOK — KAMAR KOS JAM 02:00 (ORBIT 55° + JAM + BUNGKUS MIE)*/
/* ================================================================== */
export const SceneMieHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("hook");
  const evKeroncong = timing.events["hook.keroncong"];
  const evApi = timing.events["hook.kebakaran"];

  const cam = evalCam(f, [
    // Starts tight on the 02:00 wall clock, then pulls back & orbits 55° around Riko's bed!
    { kind: "linear", to: 52, p0: [0.0, 2.75, 1.5], p1: [2.2, 2.1, 6.2], l0: [0.0, 2.75, -1.15], l1: [-0.2, 1.3, 0.2], fov0: 30, fov1: 38 },
    { kind: "orbit", to: 185, target0: [-0.2, 1.3, 0.2], target1: [0.1, 1.35, 0.5], ang0: 0.36, ang1: -0.52, rad0: 6.4, rad1: 5.8, y0: 2.1, y1: 1.75, fov0: 38, fov1: 35 },
    { kind: "orbit", to: dur, target0: [0.1, 1.35, 0.5], target1: [0.2, 1.5, 0.4], ang0: -0.52, ang1: -0.15, rad0: 5.8, rad1: 6.5, y0: 1.75, y1: 1.9, fov0: 35, fov1: 38, roll0: 0, roll1: -4 },
  ]);

  const hungry = f >= evKeroncong;
  const grabbed = f >= 122;
  const standK = smoother(cl((f - 105) / 36));
  const rikoX = lerpN(-0.65, 0.25, standK);
  const rikoZ = lerpN(0.55, 0.95, standK);
  const shakeStomach = f >= evKeroncong && f < evKeroncong + 24 ? Math.sin(f * 2.2) * 8 : 0;
  const firePreview = smoother(cl((f - evApi) / 22));

  const rikoP = bean(RIKO, {
    ...idle(t, 1),
    apron: undefined, // masih pakai kaos tidur di kamar
    bob: (1 - standK) * -32 + shakeStomach * 0.4,
    lean: hungry && !grabbed ? 14 : 2,
    expr: firePreview > 0.2 ? "shock" : hungry ? "worried" : "sleepy",
    sweat: hungry,
    armL: hungry && !grabbed ? [-40, -65] : [-15, -15],
    armR: grabbed ? [78, -42] : hungry ? [40, -65] : [12, -14],
  });
  const handPos = beanHandWorld(rikoP, "R", [rikoX, 0, rikoZ], 2.05, cam.pos, false);
  const packetPos: Vec3 = grabbed ? handPos : [0.55, 0.55, 0.35];

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evKeroncong, evApi], 0.14)} bg="#121629">
        <hemisphereLight args={["#7c98d4", "#282238", 1.15]} />
        <directionalLight position={[-3, 6, 5]} intensity={1.35} color="#a5c4ff" castShadow />
        <pointLight position={[0.4, 1.8, 1.5]} color="#fde68a" intensity={1.4} distance={7} />
        <Ground color="#3b3546" size={18} />
        {/* Enclosed Dark Kosan Bedroom */}
        <InkBox pos={[0, 2.8, -1.35]} size={[11, 5.6, 0.25]} color="#3b425c" ink={0.05} />
        <InkBox pos={[-4.6, 2.8, 1.5]} size={[0.25, 5.6, 8]} color="#31384f" ink={0.05} />
        <InkBox pos={[4.6, 2.8, 1.5]} size={[0.25, 5.6, 8]} color="#31384f" ink={0.05} />
        <KosanBedroomSet pos={[0, 0, 0]} t={t} />
        <BeanCard position={[rikoX, 0, rikoZ]} height={2.05} params={rikoP} />
        <NoodlePacket3D pos={packetPos} rot={[0, grabbed ? 0.2 : 0.6, grabbed ? -0.1 : Math.PI / 2]} scale={0.78} />
        {/* Dramatic fire-teaser flare right at "bikin kebakaran satu kosan!" */}
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
/* SCENE 2: OPERASI SENYAP KORIDOR (LOW-ANGLE TRACKING + 55° ORBIT)   */
/* ================================================================== */
export const SceneMieKoridor: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("koridor");
  const k2From = timing.lines.k2.from;
  const k2To = timing.lines.k2.to;

  const walk1 = smoother(cl(f / 155));
  const walk2 = smoother(cl((f - 228) / 40));
  const rikoX = lerpN(-3.4, 0.75, walk1) + walk2 * 2.4;
  const freeze = f >= 152 && f < 228;
  const talking = f >= k2From && f <= k2To;

  const cam = evalCam(f, [
    // Low-angle tracking follow right beside Riko's tiptoeing feet past doors 01, 02, 03!
    { kind: "linear", to: 155, p0: [-4.2, 0.95, 4.8], p1: [0.4, 1.45, 5.2], l0: [-3.0, 1.15, 0.2], l1: [0.75, 1.35, 0.2], fov0: 42, fov1: 36 },
    // Whip-orbit 55° around frozen Riko right outside Bu Tini's door!
    { kind: "orbit", to: dur, target0: [0.75, 1.4, 0.3], target1: [1.1, 1.45, 0.3], ang0: -0.1, ang1: 0.55, rad0: 5.0, rad1: 4.5, y0: 1.45, y1: 1.75, fov0: 36, fov1: 33 },
  ]);

  const rikoP = bean(RIKO, {
    ...(freeze ? idle(t, 2) : beanWalk(t * 1.45, 0.65)),
    apron: undefined,
    lean: freeze ? 4 : 15,
    expr: talking ? "talk" : freeze ? "worried" : "smug",
    mouthOpen: talking ? talkMouth(t) : 0,
    sweat: freeze,
    armL: freeze ? [-65, -75] : [-20, -25],
    armR: [62, -40],
  });
  const handPos = beanHandWorld(rikoP, "R", [rikoX, 0, 0.65], 2.05, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#16192b">
        <hemisphereLight args={["#8ba4d6", "#2f2430", 1.25]} />
        <directionalLight position={[1, 6, 6]} intensity={1.3} color="#ffe7ba" castShadow />
        <Ground color="#584f5c" size={24} />
        {/* Corridor Back Wall + Doors 01, 02, 03 & Bu Tini */}
        <InkBox pos={[0, 2.8, -1.1]} size={[18, 5.6, 0.25]} color="#d6c5ae" ink={0.05} />
        <InkBox pos={[0, 4.9, 1.0]} size={[18, 0.25, 5.5]} color="#bfb29f" ink={0.04} />
        <KosanDoorUnit pos={[-4.2, 0, -0.92]} num="01" color="#a16a42" />
        <KosanDoorUnit pos={[-1.9, 0, -0.92]} num="02" color="#a16a42" />
        <KosanDoorUnit pos={[0.4, 0, -0.92]} num="03" color="#a16a42" />
        <KosanDoorUnit pos={[2.7, 0, -0.92]} num="BU TINI" color="#7f1d1d" />
        <Sign pos={[-0.75, 2.96, -0.82]} w={2.2} h={0.44} text="KOS BU TINI · JAM MALAM 22.00" bg="#fef08a" fg="#991b1b" />
        {/* Riko sneaking with 3D Noodle Packet held cleanly at his side */}
        <BeanCard position={[rikoX, 0, 0.65]} height={2.05} params={rikoP} />
        <NoodlePacket3D pos={[handPos[0] + 0.14, handPos[1], handPos[2] + 0.08]} rot={[0, 0.25, -0.15]} scale={0.74} />
      </Stage>
      <Grade cool={0.28} />
      <Tag label="OPERASI SENYAP · KORIDOR KOS" from={6} to={dur - 10} color="#60a5fa" />
      <Bubble x={540} y={320} w={520} size={40} text="JANGAN SAMPAI BU TINI BANGUN..." from={k2From - 4} to={dur - 8} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: DAPUR KOS & SOK CHEF BINTANG 5 (110° HERO 3D ORBIT!)      */
/* ================================================================== */
export const SceneMieChef: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("chef");
  const evMinyak = timing.events["chef.minyak"];
  const evWajan = timing.events["chef.wajan"];

  // Sweeping 100° 3D Orbit showcasing the entire dense Indonesian kosan kitchen!
  const cam = evalCam(f, [
    { kind: "orbit", to: 95, target0: [0.35, 1.55, -1.4], target1: [0.75, 1.45, -1.45], ang0: 0.68, ang1: 0.15, rad0: 7.4, rad1: 5.1, y0: 2.35, y1: 1.85, fov0: 40, fov1: 35 },
    { kind: "orbit", to: dur, target0: [0.75, 1.45, -1.45], target1: [0.68, 1.55, -0.85], ang0: 0.15, ang1: -0.42, rad0: 5.1, rad1: 6.7, y0: 1.85, y1: 2.1, fov0: 35, fov1: 38 },
  ]);

  const burnerOn = f >= 25;
  const tossing = f >= evWajan - 10;
  const tossWave = tossing ? Math.sin(t * 16) * 28 : 0;
  const pouring = f >= evMinyak - 15 && f < evWajan - 10;
  const miniFlame = tossing ? 0.34 + 0.08 * Math.sin(t * 22) : 0;

  const rikoP = bean(RIKO, {
    ...idle(t, 3),
    expr: tossing ? "laugh" : "smug",
    lean: tossing ? -8 : 6,
    armL: pouring ? [-92, -35] : [-25, -35],
    armR: tossing ? [92 + tossWave, -45] : [65, -35],
  });
  const handR = beanHandWorld(rikoP, "R", [0.72, 0, -0.35], 2.08, cam.pos, false);
  const handL = beanHandWorld(rikoP, "L", [0.72, 0, -0.35], 2.08, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#28232d">
        <KosanKitchenRoom burnerOn={burnerOn} scorchLevel={0} fireScale={miniFlame} t={t} />
        <BeanCard position={[0.72, 0, -0.35]} height={2.08} params={rikoP} />
        {/* Real 3D Spatula in Riko's right hand + pouring yellow oil bottle in left hand! */}
        <Spatula3D pos={handR} rot={[0.1, 0.3, tossing ? -0.45 + Math.sin(t * 16) * 0.4 : -0.25]} scale={1.15} />
        {pouring && (
          <group position={handL} rotation={[0, 0, 1.15]}>
            <P geo={() => <cylinderGeometry args={[0.09, 0.10, 0.44, 12]} />} color="#facc15" pos={[0, 0, 0]} hull={0.07} />
            {/* Oil stream pouring down into wok */}
            <P geo={() => <cylinderGeometry args={[0.025, 0.035, 0.65, 8]} />} color="#fde047" pos={[-0.32, 0.2, 0]} rot={[0, 0, -1.15]} hull={0.05} />
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
/* SCENE 4: API TAJAM MENYAMBAR & LEMARI GOSONG! (LOW-ANGLE + DUTCH!) */
/* ================================================================== */
export const SceneMieMenyambar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("menyambar");
  const evApi = timing.events["sambar.api"];
  const evGosong = timing.events["sambar.gosong"];

  const flameK = smoother(cl((f - (evApi - 10)) / 32));
  const scorchK = smoother(cl((f - (evApi + 15)) / 120));
  const stepBack = smoother(cl((f - (evApi + 6)) / 42));

  // Dramatic low-angle looking UP through the sharp flames toward the scorching cabinet + -8° Dutch tilt!
  const cam = evalCam(f, [
    { kind: "orbit", to: 95, target0: [1.0, 2.0, -1.6], target1: [0.85, 2.35, -1.6], ang0: -0.42, ang1: 0.28, rad0: 4.8, rad1: 5.2, y0: 1.15, y1: 1.35, fov0: 38, fov1: 42, roll0: 0, roll1: -8 },
    { kind: "orbit", to: dur, target0: [0.85, 2.35, -1.6], target1: [0.15, 2.05, -1.4], ang0: 0.28, ang1: -0.35, rad0: 5.2, rad1: 6.9, y0: 1.35, y1: 2.15, fov0: 42, fov1: 42, roll0: -8, roll1: -4 },
  ]);

  const rikoX = lerpN(0.65, -0.75, stepBack);
  const rikoZ = lerpN(-0.25, 0.85, stepBack);
  const dropped = f >= evApi + 8;

  const rikoP = bean(RIKO, {
    ...(stepBack > 0.05 && stepBack < 0.95 ? beanWalk(t * 2.8, 1.0) : idle(t, 4)),
    expr: flameK > 0.15 ? "scared" : "shock",
    sweat: true,
    lean: -14 * stepBack,
    armL: [-95 * flameK - 20, -25],
    armR: [95 * flameK + 20, -25],
  });
  const spatHand = beanHandWorld(rikoP, "R", [rikoX, 0, rikoZ], 2.08, cam.pos, false);
  const spatDropK = smoother(cl((f - (evApi + 8)) / 18));
  const spatPos: Vec3 = dropped ? lerpV(spatHand, [0.35, 0.08, 0.2], spatDropK) : spatHand;

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evApi, evApi + 12, evGosong], 0.18)} bg="#22131d">
        <KosanKitchenRoom
          burnerOn
          scorchLevel={scorchK * 0.85}
          fireScale={0.22 + flameK * 1.15}
          t={t}
          smokeCloud={scorchK * 0.65}
          warmLight={0.85}
        />
        <BeanCard position={[rikoX, 0, rikoZ]} height={2.08} params={rikoP} />
        <Spatula3D pos={spatPos} rot={[dropped ? Math.PI / 2 : 0.1, 0.4, dropped ? 0.8 : -0.3]} scale={1.15} />
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

  const runK = smoother(cl(f / (evSiram - 4)));
  const splashK = cl((f - evSiram) / 56);
  const boomK = smoother(cl((f - (evBoom - 4)) / 24));
  const recoilK = smoother(cl((f - evBoom) / 36));

  // Tracking follow to gayung -> orbiting arc watching water splash -> violent snap pull-back + horror orbit!
  const cam = evalCam(f, [
    { kind: "linear", to: evSiram, p0: [-2.8, 1.8, 5.8], p1: [-0.8, 2.0, 5.2], l0: [-1.4, 1.4, 0.2], l1: [0.3, 1.65, -1.2], fov0: 40, fov1: 36 },
    { kind: "orbit", to: evBoom - 2, target0: [0.65, 1.75, -1.4], target1: [1.0, 1.85, -1.6], ang0: -0.45, ang1: 0.35, rad0: 5.0, rad1: 4.6, y0: 2.05, y1: 1.85, fov0: 36, fov1: 34 },
    { kind: "orbit", to: evBoom + 26, target0: [0.85, 2.15, -1.55], target1: [0.15, 2.35, -1.35], ang0: 0.35, ang1: 0.12, rad0: 4.6, rad1: 8.2, y0: 1.85, y1: 2.25, fov0: 34, fov1: 45, roll0: 0, roll1: 6 },
    { kind: "orbit", to: dur, target0: [0.15, 2.35, -1.35], target1: [0.1, 2.45, -1.4], ang0: 0.12, ang1: -0.28, rad0: 8.2, rad1: 9.0, y0: 2.25, y1: 2.5, fov0: 45, fov1: 46, roll0: 6, roll1: 4 },
  ]);

  const rikoX = lerpN(-2.2, -0.35, runK) - recoilK * 1.15;
  const rikoZ = lerpN(1.1, -0.15, runK) + recoilK * 1.1;
  const pouring = f >= evSiram - 6 && f < evBoom;

  const rikoP = bean(RIKO, {
    ...(runK < 0.95 ? beanWalk(t * 3.2, 1.15) : idle(t, 5)),
    expr: boomK > 0.1 ? "scared" : "shock",
    sweat: true,
    lean: pouring ? 16 : -18 * recoilK,
    armL: boomK > 0.1 ? [-105, -20] : [-35, -30],
    armR: pouring ? [108, -28] : boomK > 0.1 ? [105, -20] : [72, -32],
  });
  const gayungHand = beanHandWorld(rikoP, "R", [rikoX, 0, rikoZ], 2.08, cam.pos, false);
  const flash = f >= evBoom - 2 && f < evBoom + 14 ? interpolate(f, [evBoom - 2, evBoom + 2, evBoom + 14], [0, 0.82, 0], clamp) : 0;

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evBoom, evBoom + 8, evBoom + 16, evBoom + 24], 0.34)} bg="#221018">
        <KosanKitchenRoom
          burnerOn
          scorchLevel={0.78 + boomK * 0.22}
          fireScale={1.15 + boomK * 0.65}
          t={t * 1.25}
          smokeCloud={0.6 + boomK * 0.4}
          warmLight={0.85}
        />
        {/* Extra towering sharp central grease-fire flare shooting near the ceiling! */}
        {boomK > 0.05 && <RealisticFlame3D pos={[1.04, 2.35, -1.62]} scale={0.78 * boomK} heightMul={1.55} t={t * 1.35} seed={14} />}
        <BeanCard position={[rikoX, 0, rikoZ]} height={2.08} params={rikoP} />
        <Gayung3D pos={gayungHand} rot={[0, 0, pouring ? -0.95 : -0.15]} scale={1.15} hasWater={!pouring} />
        {splashK > 0 && splashK < 1 && <WaterSplash3D pos={[0.72, 1.58, -1.25]} progress={splashK} />}
      </Stage>
      <Grade warm={0.55 + boomK * 0.45} flash={flash} flashCol="#fef08a" />
      <Stamp text="JANGAN SIRAM AIR KE MINYAK!" from={evBoom + 6} to={dur - 8} color="#dc2626" top={245} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: SATU KOSAN HEBOH & BU TINI MENDOBRAK! (WHIP-PAN + HERO!)  */
/* ================================================================== */
export const SceneMieHeboh: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("heboh");
  const evPintu = timing.events["heboh.pintu"];
  const evDobrak = timing.events["heboh.dobrak"];

  // Whip-pan along 3 swinging doors -> snap into menacing low-angle push-in on furious Bu Tini!
  const cam = evalCam(f, [
    { kind: "linear", to: evDobrak - 8, p0: [-3.6, 1.9, 6.4], p1: [2.4, 1.95, 6.2], l0: [-2.8, 1.45, -0.5], l1: [2.0, 1.45, -0.5], fov0: 40, fov1: 38 },
    { kind: "orbit", to: dur, target0: [2.7, 1.45, 0.3], target1: [2.7, 1.55, 0.7], ang0: -0.22, ang1: 0.16, rad0: 5.8, rad1: 4.5, y0: 0.95, y1: 1.15, fov0: 40, fov1: 32, roll0: 0, roll1: 4 },
  ]);

  const d02 = smoother(cl((f - (evPintu - 6)) / 18));
  const d03 = smoother(cl((f - (evPintu + 16)) / 18));
  const d04 = smoother(cl((f - (evPintu + 38)) / 18));
  const dTini = smoother(cl((f - (evDobrak - 6)) / 14));

  const bagasRun = smoother(cl((f - (evPintu + 8)) / 68));
  const nisaRun = smoother(cl((f - (evPintu + 28)) / 68));
  const dediRun = smoother(cl((f - (evPintu + 48)) / 68));
  const tiniStep = smoother(cl((f - (evDobrak - 2)) / 36));

  const tiniP = bean(BU_TINI, {
    ...(tiniStep < 0.95 ? beanWalk(t * 2.4, 0.95) : idle(t, 8)),
    expr: "angry",
    lean: 10,
    armL: [-42, -30],
    armR: [82, -35],
  });
  const tiniHand = beanHandWorld(tiniP, "R", [2.7, 0, lerpN(-0.3, 0.95, tiniStep)], 2.15, cam.pos, false);

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [evDobrak, evDobrak + 8], 0.26)} bg="#221622">
        <hemisphereLight args={["#ffb48a", "#3a2228", 1.35]} />
        <directionalLight position={[-4, 6, 6]} intensity={1.6} color="#ffbe85" castShadow />
        {/* Pulsing orange fire glow spilling from kitchen right side */}
        <pointLight position={[6.2, 2.2, 1.0]} color="#ff6a1a" intensity={6 + Math.sin(t * 22) * 2} distance={14} />
        <Ground color="#584c58" size={24} />
        <InkBox pos={[0, 2.8, -1.1]} size={[18, 5.6, 0.25]} color="#d8c4ac" ink={0.05} />
        <KosanDoorUnit pos={[-3.4, 0, -0.92]} num="02" openAngle={-1.15 * d02} color="#a16a42" />
        <KosanDoorUnit pos={[-1.1, 0, -0.92]} num="03" openAngle={-1.15 * d03} color="#a16a42" />
        <KosanDoorUnit pos={[1.0, 0, -0.92]} num="04" openAngle={-1.15 * d04} color="#a16a42" />
        <KosanDoorUnit pos={[2.7, 0, -0.92]} num="BU TINI" openAngle={-1.25 * dTini} color="#7f1d1d" />

        {/* Panicking neighbors bursting out of doors 02, 03, 04 and sprinting cleanly toward the kitchen on the right! */}
        {d02 > 0.2 && (
          <BeanCard
            position={[lerpN(-3.4, 5.8, bagasRun), 0, lerpN(-0.2, 1.25, bagasRun)]}
            height={2.05}
            params={bean(BAGAS, { ...beanWalk(t * 3.4, 1.2), expr: "shock", sweat: true, prop: "phone", armR: [75, -35] })}
          />
        )}
        {d03 > 0.2 && (
          <BeanCard
            position={[lerpN(-1.1, 6.2, nisaRun), 0, lerpN(-0.2, 1.45, nisaRun)]}
            height={2.0}
            params={bean(NISA, { ...beanWalk(t * 3.5 + 0.3, 1.2), expr: "scared", sweat: true, armL: [-80, -25], armR: [80, -25] })}
          />
        )}
        {d04 > 0.2 && (
          <BeanCard
            position={[lerpN(1.0, 6.8, dediRun), 0, lerpN(-0.2, 1.05, dediRun)]}
            height={2.08}
            params={bean(DEDI, { ...beanWalk(t * 3.2 + 0.6, 1.1), expr: "worried", sweat: true, armR: [72, -35] })}
          />
        )}

        {/* Furious Bu Tini storming in clutching her Wet Towel — clean solo hero framing! */}
        {dTini > 0.15 && (
          <>
            <BeanCard position={[2.7, 0, lerpN(-0.3, 0.95, tiniStep)]} height={2.15} params={tiniP} />
            <WetTowel3D pos={tiniHand} rot={[0.35, 0.3, 0.35]} scale={0.78} />
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

  const throwK = smoother(cl((f - evLempar) / Math.max(20, evPadam - evLempar - 8)));
  const landed = f >= evPadam - 6;
  const snuffK = smoother(cl((f - (evPadam - 6)) / 18));
  const sniffK = smoother(cl((f - evAroma) / 22));

  // Tracking arc following flying wet towel -> swift swing framing BOTH Bu Tini & Riko -> joyful sniff push-in!
  const cam = evalCam(f, [
    { kind: "orbit", to: evPadam, target0: [0.3, 1.65, -0.8], target1: [1.0, 1.75, -1.5], ang0: -0.42, ang1: 0.35, rad0: 7.0, rad1: 5.4, y0: 2.15, y1: 1.95, fov0: 40, fov1: 36 },
    { kind: "orbit", to: evAroma + 18, target0: [1.0, 1.75, -1.5], target1: [0.18, 1.55, 0.0], ang0: 0.35, ang1: -0.14, rad0: 5.4, rad1: 6.4, y0: 1.95, y1: 1.85, fov0: 36, fov1: 38 },
    { kind: "orbit", to: dur, target0: [0.18, 1.55, 0.0], target1: [-0.08, 1.55, 0.25], ang0: -0.14, ang1: 0.12, rad0: 6.4, rad1: 5.9, y0: 1.85, y1: 1.75, fov0: 38, fov1: 36 },
  ]);

  const tiniPos: Vec3 = [-0.52, 0, 0.4];
  const rikoPos: Vec3 = [1.12, 0, 0.5];
  const tiniP = bean(BU_TINI, {
    ...idle(t, 9),
    expr: sniffK > 0.35 ? "happy" : landed ? "think" : "angry",
    lean: f >= evLempar && !landed ? 14 : 0,
    armL: [-22, -25],
    armR: f >= evLempar && f < evLempar + 35 ? [118, -25] : [25, -22],
  });
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, 2.15, cam.pos, false);
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
        {/* Cowering Riko clearly framed on the right */}
        <BeanCard
          position={rikoPos}
          height={2.05}
          flip
          params={bean(RIKO, { ...idle(t, 2), expr: sniffK > 0.4 ? "shock" : "scared", sweat: true, bob: -22 })}
        />
        {/* Bu Tini tossing the wet towel like a pro, then sniffing the delicious noodle aroma! */}
        <BeanCard position={tiniPos} height={2.15} params={tiniP} />
        <WetTowel3D
          pos={towelPos}
          rot={[landed ? 0 : throwK * 2.6, landed ? 0.1 : throwK * 1.8, landed ? 0 : 0.4]}
          scale={landed ? 1.18 : 0.85}
        />
        {/* Subtle curling golden noodle-aroma wisps drifting right from wok toward Bu Tini's nose */}
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
/* SCENE 8: ENDING KOCAK — MAKAN BARENG JAM 2 PAGI (CRANE-UP ORBIT!)  */
/* ================================================================== */
export const SceneMieMakan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR_MIE("makan");
  const m2From = timing.lines.m2.from;
  const m2To = timing.lines.m2.to;
  const talking = f >= m2From && f <= m2To;

  // Warm sweeping 3D crane-up + gentle orbit keeping all 5 faces 100% unobstructed with charred cabinet behind!
  const cam = evalCam(f, [
    { kind: "orbit", to: dur, target0: [0.0, 1.5, 0.0], target1: [0.0, 2.0, -0.55], ang0: -0.2, ang1: 0.18, rad0: 8.2, rad1: 9.8, y0: 1.75, y1: 3.15, fov0: 40, fov1: 43 },
  ]);

  const bagasP = bean(BAGAS, { ...idle(t, 3), expr: "happy", armR: [52, -40] });
  const tiniP = bean(BU_TINI, {
    ...idle(t, 1),
    expr: talking ? "talk" : "happy",
    mouthOpen: talking ? talkMouth(t) : 0,
    armR: talking ? [112, -28] : [55, -42],
  });
  const rikoP = bean(RIKO, {
    ...idle(t, 2),
    expr: talking ? "laugh" : "happy",
    sweat: talking,
    armR: [56, -42],
  });
  const nisaP = bean(NISA, { ...idle(t, 4), expr: "happy", armL: [-52, -40] });
  const dediP = bean(DEDI, { ...idle(t, 5), expr: "laugh", armR: [50, -38] });

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
        {/* Charred black cabinet still hilariously visible in the warm dawn-lit kitchen! */}
        <KosanKitchenRoom burnerOn={false} scorchLevel={0.95} fireScale={0} t={t} smokeCloud={0} warmLight={1.35} />
        {/* Clean two-tier 5-character arc with zero face overlap across the entire crane-up orbit */}
        <BeanCard position={bagasPos} height={2.02} params={bagasP} />
        <BeanCard position={tiniPos} height={2.12} params={tiniP} />
        <BeanCard position={dediPos} height={2.05} params={dediP} />
        <BeanCard position={rikoPos} height={2.05} params={rikoP} />
        <BeanCard position={nisaPos} height={1.98} params={nisaP} />
        {/* Steaming 3D Mangkok Ayam Jago bowls! */}
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

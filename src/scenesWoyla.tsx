// 8 Adegan 3D Hollywood Blockbuster — "Operasi Woyla 1981: 3 Menit yang Mengguncang Dunia"
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./woyla_timing.json";
import { Vec3 } from "./three/objects";
import { HeroP, heroHand } from "./three/objectsHero";
import {
  BintangSakti3D,
  BriefingRoom1981,
  BulletTimeTracers,
  DC9CabinInterior,
  DonMueangApron,
  Flashbang3D,
  FlashbangBlast3D,
  GarudaDC9Woyla,
  MP5Gun,
  NightRain3D,
  Pistol3D,
  RadioHT3D,
  WoylaActor,
} from "./three/objectsWoyla";
import {
  KAPTEN_HERMAN,
  KIRANG_HIJAU,
  PEMBAJAK,
  SANDERA_BAPAK,
  SANDERA_IBU,
  SINTONG,
  TIM_BIRU,
  TIM_MERAH,
} from "./SheetWoyla";

export type WoylaScene = "hook" | "krisis" | "briefing" | "susup" | "ababa" | "klimaks" | "evakuasi" | "epilog";
export const WOYLA_ORDER = timing.order as WoylaScene[];
export const DUR_WOYLA = (k: WoylaScene): number => timing.scenes[k].durationInFrames;
export const TOTAL_FRAMES_WOYLA = timing.totalFrames;

const FONT_HEAD = "Anton, Impact, sans-serif";
const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];

type LineTiming = { from: number; to: number; speaker?: string };
const LINES = timing.lines as Record<string, LineTiming>;
const EV = timing.events as Record<string, number>;
const inLine = (f: number, id: string, pad = 2) => {
  const ln = LINES[id];
  return ln ? f >= ln.from - pad && f <= ln.to + pad : false;
};

/* ================================================================== */
/* HOLLYWOOD 3D CAMERA ENGINE (ORBIT · LINEAR · SHAKE · DUTCH ROLL)   */
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
      const fov0 = s.fov0 ?? 44;
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
  return { pos: [0, 3, 12], look: [0, 2, 0], fov: 44, roll: 0 };
};

const kick = (f: number, hits: number[], amp = 0.22): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 16) {
      const a = (1 - d / 16) * amp;
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

const Stage: React.FC<{
  cam: Cam;
  shake?: Vec3;
  bg?: string;
  fog?: [string, number, number];
  children: React.ReactNode;
}> = ({ cam, shake, bg = "#070d19", fog, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <ThreeCanvas
        width={width}
        height={height}
        dpr={1}
        gl={{ antialias: false }}
        camera={{ fov: cam.fov, near: 0.08, far: 180, position: cam.pos }}
      >
        <Rig cam={cam} shake={shake} />
        <color attach="background" args={[bg]} />
        {fog && <fog attach="fog" args={fog} />}
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* Clean Cinema Grade (ZERO SwANGLE-buggy backdropFilter blur or slow soft-light readback!) */
const Grade: React.FC<{
  warm?: number;
  cool?: number;
  flash?: number;
  flashCol?: string;
  bars?: number;
}> = ({ warm = 0, cool = 0, flash = 0, flashCol = "#ffffff", bars = 0 }) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill
        style={{
          background: warm > 0 ? `rgba(255,165,65,${0.16 * warm})` : `rgba(48,118,245,${0.14 * cool})`,
        }}
      />
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(4,8,18,0.55) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(6,10,20,0) 70%, rgba(6,10,20,0.52) 86%, rgba(4,8,16,0.80) 100%)" }} />
    {bars > 1 && (
      <>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: bars, background: "#03050a" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: bars, background: "#03050a" }} />
      </>
    )}
    {flash > 0.005 && <AbsoluteFill style={{ background: flashCol, opacity: cl(flash) }} />}
  </>
);

/* Tactical Hollywood HUD Badge */
const HudTag: React.FC<{ label: string; sub?: string; from?: number; to: number; accent?: string; top?: number }> = ({
  label,
  sub,
  from = 0,
  to,
  accent = "#ef4444",
  top = 116,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps, config: { damping: 14, stiffness: 180 } });
  const out = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 52,
        padding: "10px 22px",
        borderRadius: 12,
        background: "rgba(6,12,24,0.92)",
        borderLeft: `7px solid ${accent}`,
        borderTop: "1.5px solid rgba(148,163,184,0.28)",
        borderRight: "1.5px solid rgba(148,163,184,0.28)",
        borderBottom: "1.5px solid rgba(148,163,184,0.28)",
        opacity: s * out,
        transform: `translateX(${(1 - s) * -70}px)`,
      }}
    >
      <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 27, letterSpacing: 1.8, color: "#f8fafc" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 20, letterSpacing: 1.2, color: accent, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

/* Kinetic Blockbuster Stamp */
const SlamBanner: React.FC<{
  title: string;
  sub?: string;
  from: number;
  to: number;
  top?: number;
  accent?: string;
}> = ({ title, sub, from, to, top = 235, accent = "#facc15" }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 220 } });
  const out = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        right: 48,
        top,
        textAlign: "center",
        opacity: Math.min(1, s * 1.4) * out,
        transform: `scale(${0.72 + 0.28 * s})`,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "12px 30px",
          borderRadius: 16,
          background: "rgba(8,14,26,0.92)",
          border: `3.5px solid ${accent}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
        }}
      >
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 64,
            letterSpacing: 2.2,
            color: "#ffffff",
            lineHeight: 1.04,
            textShadow: "0 4px 16px rgba(0,0,0,0.8)",
          }}
        >
          {title}
        </div>
        {sub && (
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 25, letterSpacing: 2, color: accent, marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

/* Tactical Mission Stopwatch HUD (Top-Right) */
const MissionClock: React.FC<{ timeText: string; mode: string; color?: string; top?: number }> = ({
  timeText,
  mode,
  color = "#ef4444",
  top = 116,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      right: 52,
      padding: "10px 20px",
      borderRadius: 12,
      background: "rgba(6,12,24,0.92)",
      border: `2.5px solid ${color}`,
      textAlign: "right",
    }}
  >
    <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 17, letterSpacing: 2, color }}>● {mode}</div>
    <div style={{ fontFamily: FONT_HEAD, fontSize: 44, letterSpacing: 2.5, color: "#ffffff", lineHeight: 1.05 }}>{timeText}</div>
  </div>
);

/* Macro Close-Up Insert Card for Flashbang Pin-Pull (CLAUDE.md §3!) */
const PinPullInsert: React.FC<{ pull: number; opacity: number }> = ({ pull, opacity }) => {
  if (opacity <= 0.02) return null;
  const ringShift = pull * 64;
  return (
    <div
      style={{
        position: "absolute",
        right: 54,
        bottom: 430,
        width: 340,
        padding: 18,
        borderRadius: 20,
        background: "rgba(6,13,26,0.94)",
        border: "3px solid #38bdf8",
        boxShadow: "0 18px 46px rgba(0,0,0,0.75)",
        opacity,
        transform: `scale(${0.92 + 0.08 * opacity})`,
      }}
    >
      <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 19, letterSpacing: 2, color: "#38bdf8", marginBottom: 8 }}>
        MACRO · PIN GRANAT KEJUT
      </div>
      <svg width="304" height="168" viewBox="0 0 304 168">
        <rect x="0" y="0" width="304" height="168" rx="12" fill="#0b1526" />
        {/* Canister */}
        <rect x="82" y="42" width="70" height="106" rx="10" fill="#334155" stroke="#94a3b8" strokeWidth="3" />
        <rect x="82" y="64" width="70" height="22" fill="#38bdf8" />
        <rect x="82" y="104" width="70" height="16" fill="#0ea5e9" opacity="0.65" />
        {/* Fuse head */}
        <rect x="97" y="20" width="40" height="24" rx="5" fill="#d97706" stroke="#fde047" strokeWidth="2.5" />
        {/* Striker spoon */}
        <path
          d={`M 82 26 Q ${60 - pull * 14} 58 ${66 - pull * 22} 112`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Pin & Yellow Pull Ring moving smoothly out */}
        <line x1={134 + ringShift * 0.65} y1="32" x2={176 + ringShift} y2="32" stroke="#facc15" strokeWidth="6" strokeLinecap="round" />
        <circle cx={196 + ringShift} cy="32" r="20" fill="none" stroke="#fde047" strokeWidth="7" />
        {/* Sparks when pin clears */}
        {pull > 0.55 && (
          <g opacity={(pull - 0.55) / 0.45}>
            <circle cx="136" cy="32" r="14" fill="#fef08a" opacity="0.7" />
            <line x1="136" y1="8" x2="136" y2="0" stroke="#fef08a" strokeWidth="4" />
            <line x1="154" y1="16" x2="164" y2="8" stroke="#38bdf8" strokeWidth="4" />
            <line x1="154" y1="48" x2="164" y2="56" stroke="#fef08a" strokeWidth="4" />
          </g>
        )}
      </svg>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 28, letterSpacing: 1.5, color: pull > 0.65 ? "#facc15" : "#e2e8f0", marginTop: 6, textAlign: "center" }}>
        {pull > 0.65 ? "PIN TERLEPAS · 1.5 DETIK!" : "TARIK PIN PENGAMAN..."}
      </div>
    </div>
  );
};

/* Helper: Tactical Breathing & Aiming Motion */
const tacticalBreath = (t: number, phase = 0) => Math.sin(t * 2.6 + phase) * 0.04;

/* ================================================================== */
/* SCENE 1: HOOK — "48 SANDERA · TUNTAS KURANG DARI 3 MENIT!"         */
/* ================================================================== */
const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("hook");
  const t = f / 30;
  const hitBang = EV["hook.bang"] ?? 80;
  const hitMenit = EV["hook.menit"] ?? 210;

  const cam = evalCam(f, [
    { kind: "orbit", to: Math.round(d * 0.52), target0: [0, 2.7, 1.2], target1: [0, 2.9, 0.2], ang0: 0.72, ang1: 0.14, rad0: 15.8, rad1: 11.4, y0: 2.3, y1: 5.2, fov0: 46, fov1: 42 },
    { kind: "orbit", to: d, target0: [0, 2.9, 0.2], target1: [0, 2.6, 0.4], ang0: 0.14, ang1: -0.58, rad0: 11.4, rad1: 10.6, y0: 5.2, y1: 3.1, fov0: 42, fov1: 44, roll0: 0, roll1: -2.2 },
  ]);

  const strobe = Math.sin(t * 9) > 0.65 ? 1 : 0;
  const flashPulse = f >= hitMenit && f < hitMenit + 18 ? interpolate(f, [hitMenit, hitMenit + 5, hitMenit + 18], [0, 0.9, 0], clamp) : 0;
  const shake = kick(f, [4, hitBang, hitMenit], 0.24);

  const merahPose: HeroP = {
    ...TIM_MERAH,
    lean: 0.24,
    armR: { pitch: 0.52, out: 0.16, elbow: 1.18 },
    armL: { pitch: 0.92, out: -0.2, elbow: 1.15 },
    legL: { pitch: 0.32, out: 0.1, knee: 0.45 },
    legR: { pitch: -0.26, out: 0.1, knee: 0.35 },
  };
  const biruPose: HeroP = {
    ...TIM_BIRU,
    lean: 0.22,
    armR: { pitch: 0.48, out: 0.16, elbow: 1.2 },
    armL: { pitch: 0.88, out: -0.18, elbow: 1.15 },
    legL: { pitch: 0.26, out: 0.1, knee: 0.4 },
    legR: { pitch: -0.22, out: 0.1, knee: 0.35 },
  };

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={shake} bg="#060c18" fog={["#060c18", 22, 68]}>
        <ambientLight intensity={0.48} color="#93c5fd" />
        <directionalLight position={[12, 18, 10]} intensity={1.35} color="#dbeafe" castShadow />
        <pointLight position={[-10, 6, 8]} intensity={2.2} color="#ef4444" distance={34} />
        <pointLight position={[10, 6, 8]} intensity={2.2} color="#3b82f6" distance={34} />

        <DonMueangApron searchlightPhase={t * 0.14} beaconPhase={t * 0.55} />
        <GarudaDC9Woyla position={[0, 0, 0]} strobe={strobe} cabinFlash={flashPulse} rearStair={0.18} />
        <NightRain3D time={t} count={54} spread={20} height={11} />

        {/* Commandos poised in foreground shadow */}
        <WoylaActor p={merahPose} role="merah" position={[-4.2, 0, 7.6]} rotation={[0, 2.7, 0]}>
          <MP5Gun position={heroHand(merahPose, "R")} rotation={[0.05, 0.15, 0]} muzzleFlash={flashPulse * 0.8} />
        </WoylaActor>
        <WoylaActor p={biruPose} role="biru" position={[4.1, 0, 7.2]} rotation={[0, -2.6, 0]}>
          <MP5Gun position={heroHand(biruPose, "R")} rotation={[0.05, -0.15, 0]} muzzleFlash={flashPulse * 0.8} />
        </WoylaActor>
      </Stage>

      <Grade cool={0.42} flash={flashPulse * 0.45} flashCol="#e0f2fe" />
      <HudTag label="BANDARA DON MUEANG · BANGKOK" sub="KISAH NYATA · 31 MARET 1981" from={4} to={d - 10} accent="#ef4444" />
      <MissionClock timeText="02:58" mode="OPERASI WOYLA" color="#facc15" />
      <SlamBanner title="48 SANDERA" sub="GARUDA DC-9 · PK-GNJ 'WOYLA'" from={12} to={hitMenit - 8} top={255} accent="#ef4444" />
      <SlamBanner title="KURANG DARI 3 MENIT!" sub="SERBUAN KILAT KOPASSANDHA" from={hitMenit} to={d - 6} top={255} accent="#facc15" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 2: KRISIS — "PEMBAJAKAN GA-206 & KAPTEN HERMAN RANTE"        */
/* ================================================================== */
const KrisisScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("krisis");
  const t = f / 30;
  const k1End = LINES["k1"]?.to ?? Math.round(d * 0.5);
  const cutCabin = k1End + 2;
  const isCabin = f >= cutCabin;
  const fCab = Math.max(0, f - cutCabin);
  const dCab = Math.max(1, d - cutCabin);

  const camExt = evalCam(f, [
    { kind: "orbit", to: cutCabin, target0: [0, 2.5, 1.5], target1: [0, 2.7, 4.2], ang0: -0.78, ang1: -0.22, rad0: 14.5, rad1: 10.2, y0: 4.4, y1: 2.9, fov0: 46, fov1: 40 },
  ]);
  const camCab = evalCam(fCab, [
    { kind: "linear", to: Math.round(dCab * 0.52), p0: [0.06, 1.48, 3.2], p1: [-0.04, 1.38, 0.35], l0: [0.0, 1.25, -4.5], l1: [-0.08, 1.32, -5.4], fov0: 48, fov1: 42 },
    { kind: "linear", to: dCab, p0: [-0.04, 1.38, 0.35], p1: [0.08, 1.42, -1.65], l0: [-0.08, 1.32, -5.4], l1: [-0.05, 1.45, -5.8], fov0: 42, fov1: 36 },
  ]);

  const shake = kick(f, [EV["krisis.dibajak"] ?? 90, EV["krisis.kokpit"] ?? cutCabin + 60], 0.16);
  const tremble = Math.sin(t * 14) * 0.025;

  const hijackerPose: HeroP = {
    ...PEMBAJAK,
    turn: Math.sin(t * 2.1) * 0.25,
    lean: 0.08,
    armR: { pitch: 1.32 + Math.sin(t * 3) * 0.08, out: 0.14, elbow: 0.22 },
    armL: { pitch: 0.55, out: 0.28, elbow: 0.72 },
  };
  const pilotPose: HeroP = {
    ...KAPTEN_HERMAN,
    expr: "determined",
    armR: { pitch: 0.65, out: 0.26, elbow: 0.45 },
    armL: { pitch: 0.72, out: 0.24, elbow: 0.38 },
  };
  const hostageIbu: HeroP = {
    ...SANDERA_IBU,
    lean: 0.45 + tremble,
    headPitch: 0.35,
    armR: { pitch: 0.95, out: 0.06, elbow: 1.5 },
    armL: { pitch: 0.95, out: 0.06, elbow: 1.5 },
  };
  const hostageBpk: HeroP = {
    ...SANDERA_BAPAK,
    lean: 0.42 - tremble,
    headPitch: 0.32,
    armR: { pitch: 0.85, out: 0.08, elbow: 1.4 },
    armL: { pitch: 0.85, out: 0.08, elbow: 1.4 },
  };

  return (
    <AbsoluteFill>
      {!isCabin ? (
        <Stage cam={camExt} shake={shake} bg="#080e1c" fog={["#080e1c", 22, 66]}>
          <ambientLight intensity={0.46} color="#93c5fd" />
          <directionalLight position={[-10, 14, 12]} intensity={1.3} color="#e2e8f0" castShadow />
          <DonMueangApron searchlightPhase={t * 0.16 + 0.4} beaconPhase={t * 0.75} />
          <GarudaDC9Woyla position={[0, 0, 0]} strobe={Math.sin(t * 10) > 0.5 ? 1 : 0} />
          <NightRain3D time={t} count={48} spread={18} height={10} />
        </Stage>
      ) : (
        <Stage cam={camCab} shake={shake} bg="#141118" fog={["#141118", 8, 22]}>
          <ambientLight intensity={0.55} color="#fed7aa" />
          <pointLight position={[0, 2.2, 1.5]} intensity={1.35} color="#fbbf24" distance={12} />
          <pointLight position={[0, 2.2, -3.8]} intensity={1.6} color="#f59e0b" distance={12} />
          <pointLight position={[0, 1.8, -6.5]} intensity={1.1} color="#ef4444" distance={8} />

          <DC9CabinInterior cockpitDoorOpen={0.78} emergencyLight={0.75 + Math.sin(t * 6) * 0.25} />

          {/* Hijacker patrolling tense center aisle */}
          <WoylaActor p={hijackerPose} role="pembajak" position={[0.14, 0, -2.55]} rotation={[0, 0.12, 0]}>
            <Pistol3D position={heroHand(hijackerPose, "R")} rotation={[0.05, 0.1, 0]} />
          </WoylaActor>

          {/* Kapten Herman Rante standing steadfastly at cockpit threshold */}
          <WoylaActor p={pilotPose} role="pilot" position={[-0.1, 0, -5.35]} rotation={[0, 0.05, 0]} />

          {/* Seated frightened passengers along left & right 1981 burnt-orange seats */}
          <WoylaActor p={hostageIbu} role="sandera" position={[-0.95, 0.14, 1.25]} rotation={[0, 0.25, 0]} />
          <WoylaActor p={hostageBpk} role="sandera" position={[0.98, 0.14, 1.25]} rotation={[0, -0.25, 0]} />
          <WoylaActor p={hostageBpk} role="sandera" position={[-0.98, 0.14, -0.15]} rotation={[0, 0.2, 0]} />
          <WoylaActor p={hostageIbu} role="sandera" position={[0.96, 0.14, -0.15]} rotation={[0, -0.2, 0]} />
          <WoylaActor p={hostageIbu} role="sandera" position={[-0.95, 0.14, -1.55]} rotation={[0, 0.18, 0]} />
          <WoylaActor p={hostageBpk} role="sandera" position={[0.96, 0.14, -1.55]} rotation={[0, -0.18, 0]} />
        </Stage>
      )}

      <Grade warm={isCabin ? 0.32 : 0} cool={isCabin ? 0 : 0.35} />
      <HudTag
        label={isCabin ? "KABIN GARUDA DC-9 · HARI KE-4" : "28 MARET 1981 · GA-206 DIBAJAK"}
        sub={isCabin ? "KAPTEN HERMAN RANTE LINDUNGI PENUMPANG" : "5 PEMBAJAK BERSENJATA · DON MUEANG"}
        from={4}
        to={d - 8}
        accent={isCabin ? "#f59e0b" : "#ef4444"}
      />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: BRIEFING — "35 KOPASSANDHA · SERBUAN 3 ARAH SERENTAK"     */
/* ================================================================== */
const BriefingScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("briefing");
  const t = f / 30;
  const fMerah = EV["briefing.merah"] ?? Math.round(d * 0.55);
  const fHijau = EV["briefing.hijau"] ?? Math.round(d * 0.78);

  const cam = evalCam(f, [
    { kind: "orbit", to: Math.round(d * 0.48), target0: [0, 1.48, -0.3], target1: [0, 1.45, -0.15], ang0: -0.2, ang1: 0.18, rad0: 5.9, rad1: 4.8, y0: 2.35, y1: 2.15, fov0: 44, fov1: 42 },
    { kind: "orbit", to: d, target0: [0, 1.45, -0.15], target1: [0, 1.38, -0.1], ang0: 0.18, ang1: 0.45, rad0: 4.8, rad1: 4.1, y0: 2.15, y1: 2.25, fov0: 42, fov1: 40 },
  ]);

  const pointWave = Math.sin(t * 3.2) * 0.14;
  const sintongPose: HeroP = {
    ...SINTONG,
    lean: 0.12,
    turn: f >= fHijau ? -0.18 : f >= fMerah ? 0.18 : 0,
    armR: { pitch: 0.85 + pointWave, out: 0.18, elbow: 0.35 },
    armL: { pitch: 0.35, out: 0.15, elbow: 0.75 },
  };
  const merahStand: HeroP = {
    ...TIM_MERAH,
    lean: 0.1,
    turn: 0.28,
    armR: { pitch: 0.3, out: 0.14, elbow: 0.75 },
    armL: { pitch: 0.3, out: 0.14, elbow: 0.75 },
  };
  const biruStand: HeroP = {
    ...TIM_BIRU,
    lean: 0.1,
    turn: -0.28,
    armR: { pitch: 0.32, out: 0.14, elbow: 0.75 },
    armL: { pitch: 0.28, out: 0.14, elbow: 0.75 },
  };
  const hijauStand: HeroP = {
    ...KIRANG_HIJAU,
    expr: "determined",
    lean: 0.08,
    turn: -0.14,
    armR: { pitch: 0.35, out: 0.14, elbow: 0.85 },
    armL: { pitch: 0.35, out: 0.14, elbow: 0.85 },
  };

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#07101f" fog={["#07101f", 9, 28]}>
        <ambientLight intensity={0.55} color="#bae6fd" />
        <pointLight position={[0, 3.8, 0.4]} intensity={2.2} color="#38bdf8" distance={14} />
        <pointLight position={[0, 1.8, 0.2]} intensity={1.8} color="#0ea5e9" distance={8} />
        <directionalLight position={[4, 6, 5]} intensity={0.95} color="#f8fafc" />

        <BriefingRoom1981 pulse={t * 0.42} />

        {/* All 4 commandos arranged behind/beside hologram table facing camera cleanly */}
        <WoylaActor p={sintongPose} role="sintong" beret position={[0, 0, -1.55]} rotation={[0, 0, 0]} />
        <WoylaActor p={merahStand} role="merah" position={[-1.95, 0, -1.1]} rotation={[0, 0.55, 0]} />
        <WoylaActor p={biruStand} role="biru" position={[1.95, 0, -1.1]} rotation={[0, -0.55, 0]} />
        <WoylaActor p={hijauStand} role="hijau" position={[2.35, 0, 0.45]} rotation={[0, -1.15, 0]} />
      </Stage>

      <Grade cool={0.38} />
      <HudTag label="RUANG KOMANDO · 35 KOPASSANDHA" sub="LETKOL INF. SINTONG PANJAITAN" from={4} to={d - 8} accent="#38bdf8" />

      {/* Color-coded 3-team vector cards */}
      {f >= fMerah - 6 && (
        <div style={{ position: "absolute", left: 52, right: 52, top: 245, display: "flex", gap: 12, justifyContent: "center" }}>
          {[
            { name: "TIM MERAH", desc: "Sayap Kiri", col: "#ef4444", active: true },
            { name: "TIM BIRU", desc: "Sayap Kanan", col: "#3b82f6", active: true },
            { name: "TIM HIJAU", desc: "Tangga Ekor", col: "#22c55e", active: f >= fHijau - 6 },
          ].map((tm) => (
            <div
              key={tm.name}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(6,13,26,0.92)",
                border: `2.5px solid ${tm.col}`,
                opacity: tm.active ? 1 : 0.35,
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: FONT_HEAD, fontSize: 30, letterSpacing: 1.5, color: tm.col }}>{tm.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 19, color: "#e2e8f0" }}>{tm.desc}</div>
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 4: SUSUP — "02:45 DINI HARI · PENYUSUPAN SENYAP DI HUJAN"    */
/* ================================================================== */
const SusupScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("susup");
  const t = f / 30;
  const k = cl(f / Math.max(1, d - 12));
  const bars = interpolate(f, [0, 24], [0, 76], clamp);

  const cam = evalCam(f, [
    { kind: "linear", to: Math.round(d * 0.56), p0: [-9.2, 3.85, 5.4], p1: [-6.1, 3.6, 3.2], l0: [-2.8, 2.35, -0.45], l1: [-2.1, 2.5, -0.35], fov0: 44, fov1: 40 },
    { kind: "orbit", to: d, target0: [0.1, 1.05, -9.8], target1: [0.1, 1.1, -9.5], ang0: -0.58, ang1: 0.16, rad0: 6.4, rad1: 4.9, y0: 1.75, y1: 1.5, fov0: 42, fov1: 38 },
  ]);

  const creep = Math.sin(t * 4.5) * 0.14;
  const wingCrawlerL: HeroP = {
    ...TIM_MERAH,
    lean: 0.42,
    armR: { pitch: 0.55, out: 0.16, elbow: 1.1 },
    armL: { pitch: 0.9, out: -0.16, elbow: 1.1 },
    legL: { pitch: 0.35 + creep, out: 0.1, knee: 0.65 },
    legR: { pitch: -0.25 - creep, out: 0.1, knee: 0.6 },
  };
  const wingCrawlerR: HeroP = {
    ...TIM_BIRU,
    lean: 0.42,
    armR: { pitch: 0.55, out: 0.16, elbow: 1.1 },
    armL: { pitch: 0.9, out: -0.16, elbow: 1.1 },
    legL: { pitch: 0.35 - creep, out: 0.1, knee: 0.65 },
    legR: { pitch: -0.25 + creep, out: 0.1, knee: 0.6 },
  };
  const kirangCreep: HeroP = {
    ...KIRANG_HIJAU,
    expr: "determined",
    lean: 0.36,
    armR: { pitch: 0.5, out: 0.18, elbow: 1.15 },
    armL: { pitch: 1.05, out: 0.18, elbow: 0.9 },
    legL: { pitch: 0.32 + creep * 0.7, out: 0.1, knee: 0.55 },
    legR: { pitch: -0.22 - creep * 0.7, out: 0.1, knee: 0.5 },
  };

  const xWingL = lerpN(-4.5, -2.25, smoother(k));
  const xWingR = lerpN(4.5, 2.25, smoother(k));
  const zKirang = lerpN(-10.8, -9.55, smoother(k));

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#050b16" fog={["#050b16", 14, 48]}>
        <ambientLight intensity={0.42} color="#60a5fa" />
        <directionalLight position={[-10, 14, 6]} intensity={1.1} color="#93c5fd" />
        <pointLight position={[-3.5, 4.2, 1.5]} intensity={1.5} color="#ef4444" distance={10} />
        <pointLight position={[0, 2.4, -10.0]} intensity={1.7} color="#22c55e" distance={10} />

        <DonMueangApron searchlightPhase={t * 0.12 + 0.8} beaconPhase={t * 0.5} />
        <GarudaDC9Woyla position={[0, 0, 0]} rearStair={0.35 + k * 0.45} strobe={Math.sin(t * 7) > 0.75 ? 1 : 0} />
        <NightRain3D time={t} count={72} spread={18} height={11} />

        {/* Tim Merah & Tim Biru crawling onto DC-9 wings toward overwing doors */}
        <WoylaActor p={wingCrawlerL} role="merah" position={[xWingL, 2.08, -0.55]} rotation={[0, Math.PI / 2, 0]}>
          <MP5Gun position={heroHand(wingCrawlerL, "R")} rotation={[0.05, 0.14, 0]} />
        </WoylaActor>
        <WoylaActor p={wingCrawlerR} role="biru" position={[xWingR, 2.08, -0.55]} rotation={[0, -Math.PI / 2, 0]}>
          <MP5Gun position={heroHand(wingCrawlerR, "R")} rotation={[0.05, -0.14, 0]} />
        </WoylaActor>

        {/* Peltu Achmad Kirang (Tim Hijau) poised silently under ventral rear airstair */}
        <WoylaActor p={kirangCreep} role="hijau" position={[0.15, 0, zKirang]} rotation={[0, 0, 0]}>
          <MP5Gun position={heroHand(kirangCreep, "R")} rotation={[0.05, 0.12, 0]} />
          <Flashbang3D position={heroHand(kirangCreep, "L")} scale={1.15} glow={0.35} />
        </WoylaActor>
      </Stage>

      <Grade cool={0.55} bars={bars} />
      <HudTag label="31 MARET 1981 · PENYUSUPAN SENYAP" sub="TIM MERAH · BIRU · HIJAU DI POSISI" from={4} to={d - 6} accent="#22c55e" top={104} />
      <MissionClock timeText="02:45" mode="DINI HARI" color="#22c55e" top={104} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: ABA-ABA — "3, 2, 1, LAKSANAKAN! · CABUT PIN · SUB-DROP!"  */
/* ================================================================== */
const AbabaScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("ababa");
  const t = f / 30;
  const fLaks = EV["ababa.laksanakan"] ?? Math.round(d * 0.56);
  const fPin = EV["ababa.pin_pull"] ?? Math.round(d * 0.72);
  const fSub = EV["ababa.sub_drop"] ?? Math.round(d * 0.84);

  const isPinShot = f >= fPin - 4 && f < fSub + 6;
  const isSubDrop = f >= fSub;
  const pinPull = cl((f - fPin) / Math.max(1, fSub - fPin));
  const subFade = isSubDrop ? cl((f - fSub) / 9) : 0;
  const bars = interpolate(f, [0, fSub, d], [76, 86, 118], clamp);

  const camSintong = evalCam(f, [
    { kind: "orbit", to: Math.max(1, fPin), target0: [0, 1.48, 0], target1: [0, 1.54, 0], ang0: 0.28, ang1: -0.14, rad0: 2.95, rad1: 2.05, y0: 1.58, y1: 1.62, fov0: 40, fov1: 34, roll0: 0, roll1: -3.2 },
  ]);
  const camPin = evalCam(Math.max(0, f - fPin), [
    { kind: "linear", to: Math.max(1, d - fPin), p0: [0.06, 1.48, 1.85], p1: [0.02, 1.46, 1.38], l0: [-0.05, 1.42, 0.22], l1: [-0.08, 1.44, 0.22], fov0: 38, fov1: 32, roll0: -3, roll1: -5 },
  ]);

  const radioSpeak = inLine(f, "a1", 2);
  const sintongRadio: HeroP = {
    ...SINTONG,
    expr: f >= fLaks ? "shout" : "determined",
    armR: { pitch: 0.78 + (radioSpeak ? Math.sin(t * 16) * 0.03 : 0), out: 0.08, elbow: 1.62 },
    armL: { pitch: 0.28, out: 0.16, elbow: 0.55 },
  };
  const commandoPin: HeroP = {
    ...KIRANG_HIJAU,
    expr: "determined",
    armL: { pitch: 1.18, out: 0.08, elbow: 0.92 },
    armR: { pitch: 1.06, out: -0.16 + pinPull * 0.36, elbow: 1.15 - pinPull * 0.45 },
  };

  const countStage = f >= fLaks ? "LAKSANAKAN!" : f >= fLaks - 14 ? "1" : f >= fLaks - 28 ? "2" : f >= fLaks - 42 ? "3" : "";

  return (
    <AbsoluteFill>
      {!isPinShot ? (
        <Stage cam={camSintong} shake={kick(f, [fLaks], 0.18)} bg="#060d18" fog={["#060d18", 14, 46]}>
          <ambientLight intensity={0.48} color="#93c5fd" />
          <directionalLight position={[5, 8, 6]} intensity={1.35} color="#e2e8f0" />
          <pointLight position={[-1.4, 2.2, 1.4]} intensity={2.0} color="#22c55e" distance={8} />
          <pointLight position={[1.8, 2.0, -1.6]} intensity={1.8} color="#ef4444" distance={10} />

          <DonMueangApron searchlightPhase={t * 0.15} beaconPhase={t * 0.9} />
          <GarudaDC9Woyla position={[1.8, 0, -13.5]} rotation={[0, -0.35, 0]} strobe={1} />
          <NightRain3D time={t} count={52} spread={12} height={8} />

          <WoylaActor p={sintongRadio} role="sintong" beret position={[0, 0, 0]}>
            <RadioHT3D position={heroHand(sintongRadio, "R")} rotation={[0.12, 0.25, 0]} active />
          </WoylaActor>
        </Stage>
      ) : (
        <Stage cam={camPin} shake={kick(f, [fPin], 0.14)} bg="#050a14" fog={["#050a14", 6, 20]}>
          <ambientLight intensity={0.5} color="#bae6fd" />
          <pointLight position={[0.4, 2.1, 1.2]} intensity={2.4} color="#38bdf8" distance={8} />
          <pointLight position={[-1.2, 1.5, 0.8]} intensity={1.8} color="#facc15" distance={6} />
          <NightRain3D time={t} count={36} spread={6} height={5} />
          <WoylaActor p={commandoPin} role="hijau" position={[0, 0, 0]}>
            <Flashbang3D position={heroHand(commandoPin, "L")} scale={1.55} pinPull={pinPull} glow={0.35 + pinPull * 0.9} />
          </WoylaActor>
        </Stage>
      )}

      <Grade cool={0.45} bars={bars} />

      <HudTag label="FREKUENSI TAKTIS · VHF CH-01" sub="LETKOL SINTONG PANJAITAN" from={2} to={fSub + 4} accent="#22c55e" top={106} />

      {/* Big Hollywood Countdown Slam */}
      {countStage && !isSubDrop && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 265,
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "10px 38px",
              borderRadius: 18,
              background: countStage === "LAKSANAKAN!" ? "rgba(220,38,38,0.95)" : "rgba(6,13,26,0.9)",
              border: `4px solid ${countStage === "LAKSANAKAN!" ? "#fef08a" : "#ef4444"}`,
              fontFamily: FONT_HEAD,
              fontSize: countStage === "LAKSANAKAN!" ? 78 : 112,
              letterSpacing: 3,
              color: "#ffffff",
              boxShadow: "0 16px 46px rgba(0,0,0,0.7)",
            }}
          >
            {countStage}
          </span>
        </div>
      )}

      {/* Macro Close-Up Insert for Pin Pull */}
      {isPinShot && !isSubDrop && <PinPullInsert pull={pinPull} opacity={cl((f - fPin + 4) / 2)} />}

      {/* 0.75-Second Hollywood Sub-Drop Blackout Suspense Beat */}
      {isSubDrop && (
        <AbsoluteFill
          style={{
            background: `rgba(2,5,12,${0.94 * subFade})`,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 240 - subFade * 40,
              height: 240 - subFade * 40,
              borderRadius: "50%",
              border: "5px solid #38bdf8",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 60px rgba(56,189,248,0.55)",
              opacity: subFade,
            }}
          >
            <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 22, letterSpacing: 3, color: "#38bdf8" }}>SERBUAN</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 74, color: "#ffffff", lineHeight: 1 }}>0.0s</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 6: KLIMAKS HOLLYWOOD! — BREACH · FLASHBANG · 360° BULLET-TIME */
/* ================================================================== */
const KlimaksScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("klimaks");
  const t = f / 30;
  const fBreach = EV["klimaks.breach"] ?? 2;
  const fBlast = EV["klimaks.flashbang"] ?? 12;
  const fBullet = EV["klimaks.bullettime"] ?? 34;
  const fPeluru = EV["klimaks.peluru"] ?? Math.round(d * 0.56);

  const isBulletTime = f >= fBullet;
  const breachOpen = spring({ frame: Math.max(0, f - fBreach), fps: 30, config: { damping: 10, stiffness: 240 } });
  const blastProg = isBulletTime
    ? 0.24 + cl((f - fBullet) / Math.max(1, d - fBullet)) * 0.52
    : cl((f - fBlast) / 26) * 0.28;
  const flashPeak =
    f >= fBlast && f < fBlast + 26
      ? interpolate(f, [fBlast, fBlast + 4, fBlast + 12, fBlast + 26], [0, 0.96, 0.58, 0], clamp)
      : 0;
  const slowT = isBulletTime ? cl((f - fBullet) / Math.max(1, d - fBullet)) : 0;
  const bars = interpolate(f, [0, d - 18, d], [84, 84, 52], clamp);

  /* Phase 1: Explosive 3-door Exterior Breach -> Phase 2: Unobstructed 300° Bullet-Time Cabin Orbit! */
  const camBreach = evalCam(f, [
    { kind: "orbit", to: Math.max(1, fBullet), target0: [0, 2.5, 0], target1: [0, 2.6, 0.2], ang0: -0.78, ang1: -0.35, rad0: 11.8, rad1: 8.2, y0: 4.1, y1: 3.1, fov0: 48, fov1: 42, roll0: -3, roll1: 4 },
  ]);

  const fBT = Math.max(0, f - fBullet);
  const dBT = Math.max(1, d - fBullet);
  const camBullet = evalCam(fBT, [
    { kind: "orbit", to: Math.round(dBT * 0.52), target0: [0, 1.35, -0.5], target1: [0, 1.32, -1.2], ang0: -0.75, ang1: 1.75, rad0: 5.1, rad1: 3.7, y0: 2.1, y1: 1.5, fov0: 46, fov1: 38, roll0: -5.5, roll1: 4.5 },
    { kind: "orbit", to: dBT, target0: [0, 1.32, -1.2], target1: [0, 1.4, -1.6], ang0: 1.75, ang1: 4.35, rad0: 3.7, rad1: 4.6, y0: 1.5, y1: 2.4, fov0: 38, fov1: 44, roll0: 4.5, roll1: -1.5 },
  ]);

  const shake = kick(f, [fBreach, fBlast, fBlast + 6, fPeluru], isBulletTime ? 0.14 : 0.38);

  /* Super-slow-motion dynamic action poses (moving only 5% during bullet-time!) */
  const merahLeap: HeroP = {
    ...TIM_MERAH,
    expr: "shout",
    lean: 0.34,
    turn: 0.15,
    armR: { pitch: 0.95, out: 0.14, elbow: 0.72 },
    armL: { pitch: 1.12, out: -0.18, elbow: 0.82 },
    legL: { pitch: 0.62, out: 0.12, knee: 0.68 },
    legR: { pitch: -0.55, out: 0.12, knee: 0.42 },
  };
  const biruLeap: HeroP = {
    ...TIM_BIRU,
    expr: "determined",
    lean: 0.32,
    turn: -0.18,
    armR: { pitch: 0.92, out: 0.16, elbow: 0.75 },
    armL: { pitch: 1.05, out: -0.18, elbow: 0.85 },
    legL: { pitch: 0.52, out: 0.12, knee: 0.58 },
    legR: { pitch: -0.48, out: 0.12, knee: 0.38 },
  };
  const kirangCharge: HeroP = {
    ...KIRANG_HIJAU,
    expr: "shout",
    lean: 0.36,
    armR: { pitch: 0.98, out: 0.14, elbow: 0.65 },
    armL: { pitch: 1.2, out: 0.2, elbow: 0.55 },
    legL: { pitch: 0.55, out: 0.1, knee: 0.45 },
    legR: { pitch: -0.48, out: 0.1, knee: 0.45 },
  };
  const stunnedHijacker: HeroP = {
    ...PEMBAJAK,
    expr: "shock",
    lean: -0.34 - slowT * 0.12,
    armR: { pitch: 1.85, out: 0.68, elbow: 0.55 },
    armL: { pitch: 1.75, out: 0.58, elbow: 0.85 },
    legL: { pitch: -0.22, out: 0.14, knee: 0.25 },
    legR: { pitch: 0.28, out: 0.14, knee: 0.35 },
  };
  const duckIbu: HeroP = {
    ...SANDERA_IBU,
    lean: 0.68,
    headPitch: 0.45,
    armR: { pitch: 1.25, out: 0.08, elbow: 1.65 },
    armL: { pitch: 1.25, out: 0.08, elbow: 1.65 },
  };
  const duckBpk: HeroP = {
    ...SANDERA_BAPAK,
    lean: 0.65,
    headPitch: 0.42,
    armR: { pitch: 1.15, out: 0.08, elbow: 1.6 },
    armL: { pitch: 1.15, out: 0.08, elbow: 1.6 },
  };

  /* Live mission stopwatch ticking fast during assault */
  const secsElapsed = Math.floor(lerpN(4, 118, cl(f / d)));
  const clockStr = `0${Math.floor(secsElapsed / 60)}:${String(secsElapsed % 60).padStart(2, "0")}`;

  return (
    <AbsoluteFill>
      {!isBulletTime ? (
        <Stage cam={camBreach} shake={shake} bg="#050b18" fog={["#050b18", 16, 54]}>
          <ambientLight intensity={0.55 + flashPeak * 1.4} color="#dbeafe" />
          <directionalLight position={[10, 16, 10]} intensity={1.4} color="#f8fafc" />
          <pointLight position={[0, 3.2, 0.2]} intensity={3.2 + flashPeak * 9} color="#7dd3fc" distance={24} />

          <DonMueangApron searchlightPhase={t * 0.22} beaconPhase={t * 1.2} />
          <GarudaDC9Woyla
            position={[0, 0, 0]}
            wingDoorL={breachOpen}
            wingDoorR={breachOpen}
            rearStair={0.85 + breachOpen * 0.15}
            frontDoor={breachOpen * 0.4}
            strobe={1}
            cabinFlash={0.45 + flashPeak}
          />
          <NightRain3D time={t} count={60} spread={18} height={11} />

          {/* Commandos lunging into all 3 breached doors simultaneously */}
          <WoylaActor p={merahLeap} role="merah" position={[-2.15 + breachOpen * 0.55, 2.25, 0.15]} rotation={[0, Math.PI / 2, 0]}>
            <MP5Gun position={heroHand(merahLeap, "R")} muzzleFlash={0.95} />
          </WoylaActor>
          <WoylaActor p={biruLeap} role="biru" position={[2.15 - breachOpen * 0.55, 2.25, 0.15]} rotation={[0, -Math.PI / 2, 0]}>
            <MP5Gun position={heroHand(biruLeap, "R")} muzzleFlash={0.95} />
          </WoylaActor>
          <WoylaActor p={kirangCharge} role="hijau" position={[0, 0.65 + breachOpen * 0.55, -9.2 + breachOpen * 0.9]}>
            <MP5Gun position={heroHand(kirangCharge, "R")} muzzleFlash={0.85} />
          </WoylaActor>

          <FlashbangBlast3D position={[0, 2.85, 0.1]} progress={blastProg} scale={1.75} />
        </Stage>
      ) : (
        <Stage cam={camBullet} shake={shake} bg="#060f1e" fog={["#060f1e", 9, 28]}>
          <ambientLight intensity={0.68} color="#bae6fd" />
          <pointLight position={[0, 2.4, -0.8]} intensity={3.8} color="#7dd3fc" distance={15} />
          <pointLight position={[-2.6, 2.0, 1.2]} intensity={2.2} color="#fb923c" distance={12} />
          <pointLight position={[2.6, 2.0, -2.5]} intensity={2.2} color="#38bdf8" distance={12} />

          {/* Open 360° Cutaway Cabin — ZERO wall occlusions during full 300° Bullet-Time Orbit! */}
          <DC9CabinInterior hideLeft hideRight hideRoof cockpitDoorOpen={0.95} emergencyLight={1.0} flashIntensity={0.68} />

          {/* Centerpiece: Frozen Incandescent Flashbang Shockwave + Supersonic Bullet-Time Tracers */}
          <FlashbangBlast3D position={[0.05, 1.38, -0.85]} progress={blastProg} scale={1.15} />
          <BulletTimeTracers position={[0, 1.38, -0.75]} progress={slowT} />

          {/* Tim Merah leaping dynamically from left wing breach */}
          <WoylaActor p={merahLeap} role="merah" position={[-1.08 + slowT * 0.25, 0.36 + Math.sin(slowT * Math.PI) * 0.12, 0.72 - slowT * 0.35]} rotation={[0, 2.65, 0]}>
            <MP5Gun position={heroHand(merahLeap, "R")} rotation={[0.04, 0.12, 0]} muzzleFlash={0.95} />
          </WoylaActor>

          {/* Tim Biru lunging from right wing breach */}
          <WoylaActor p={biruLeap} role="biru" position={[1.05 - slowT * 0.22, 0.3 + Math.sin(slowT * Math.PI) * 0.1, -0.35 - slowT * 0.3]} rotation={[0, -2.55, 0]}>
            <MP5Gun position={heroHand(biruLeap, "R")} rotation={[0.04, -0.12, 0]} muzzleFlash={0.92} />
          </WoylaActor>

          {/* Peltu Achmad Kirang charging forward from rear airstair */}
          <WoylaActor p={kirangCharge} role="hijau" position={[0.04, 0.14, 2.25 - slowT * 0.55]} rotation={[0, Math.PI, 0]}>
            <MP5Gun position={heroHand(kirangCharge, "R")} rotation={[0.02, 0.05, 0]} muzzleFlash={0.9} />
          </WoylaActor>

          {/* Stunned hijacker reeling back; pistol flying loose in slow-motion! */}
          <WoylaActor p={stunnedHijacker} role="pembajak" position={[0.12, 0.05, -2.95 - slowT * 0.28]} rotation={[0, 0.18, 0]} />
          <Pistol3D position={[0.68 + slowT * 0.42, 1.65 + slowT * 0.24, -2.55]} rotation={[slowT * 5.2, slowT * 3.4, 0.8]} scale={1.35} />

          {/* Kapten Herman & protected hostages ducking safely below line of fire */}
          <WoylaActor p={{ ...KAPTEN_HERMAN, lean: 0.45 }} role="pilot" position={[-0.25, 0, -5.2]} rotation={[0, 0.1, 0]} />
          <WoylaActor p={duckIbu} role="sandera" position={[-1.02, 0.1, 1.38]} rotation={[0, 0.15, 0]} />
          <WoylaActor p={duckBpk} role="sandera" position={[1.02, 0.1, 1.38]} rotation={[0, -0.15, 0]} />
          <WoylaActor p={duckBpk} role="sandera" position={[-1.02, 0.1, -1.4]} rotation={[0, 0.15, 0]} />
          <WoylaActor p={duckIbu} role="sandera" position={[1.02, 0.1, -1.4]} rotation={[0, -0.15, 0]} />
        </Stage>
      )}

      <Grade cool={0.32} flash={flashPeak} flashCol="#f0f9ff" bars={bars} />
      <HudTag
        label={isBulletTime ? "BULLET-TIME · 0.05× SLOW-MO" : "SERBUAN 3 PINTU SERENTAK!"}
        sub={isBulletTime ? "ORBIT 360° KABIN GARUDA DC-9" : "FLASHBANG DETONATION · TIM MERAH/BIRU/HIJAU"}
        from={2}
        to={d - 4}
        accent={isBulletTime ? "#38bdf8" : "#facc15"}
        top={106}
      />
      <MissionClock timeText={clockStr} mode="ASSAULT LIVE" color="#ef4444" top={106} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 7: EVAKUASI — "02:58 · 48 SANDERA SELAMAT!"                  */
/* ================================================================== */
const EvakuasiScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("evakuasi");
  const t = f / 30;
  const k = cl(f / Math.max(1, d - 10));
  const fTimer = EV["evakuasi.timer"] ?? 30;
  const fSelamat = EV["evakuasi.selamat"] ?? Math.round(d * 0.65);

  const cam = evalCam(f, [
    { kind: "orbit", to: d, target0: [-1.4, 1.7, 5.2], target1: [-0.8, 2.2, 3.2], ang0: 0.48, ang1: -0.32, rad0: 9.8, rad1: 11.4, y0: 2.35, y1: 4.3, fov0: 44, fov1: 42 },
  ]);

  const runSwing = Math.sin(t * 10.5) * 0.48;
  const runHostageA: HeroP = {
    ...SANDERA_IBU,
    expr: "happy",
    lean: 0.16,
    armR: { pitch: -runSwing * 0.8 + 0.5, out: 0.18, elbow: 1.0 },
    armL: { pitch: runSwing * 0.8 + 0.5, out: 0.18, elbow: 1.0 },
    legL: { pitch: runSwing, out: 0.06, knee: Math.max(0, -runSwing) * 0.7 },
    legR: { pitch: -runSwing, out: 0.06, knee: Math.max(0, runSwing) * 0.7 },
  };
  const runHostageB: HeroP = {
    ...SANDERA_BAPAK,
    expr: "happy",
    lean: 0.14,
    armR: { pitch: runSwing * 0.75 + 0.45, out: 0.18, elbow: 0.95 },
    armL: { pitch: -runSwing * 0.75 + 0.45, out: 0.18, elbow: 0.95 },
    legL: { pitch: -runSwing, out: 0.06, knee: Math.max(0, runSwing) * 0.7 },
    legR: { pitch: runSwing, out: 0.06, knee: Math.max(0, -runSwing) * 0.7 },
  };
  const escortMerah: HeroP = {
    ...TIM_MERAH,
    expr: "determined",
    armR: { pitch: 0.32, out: 0.18, elbow: 1.05 },
    armL: { pitch: 1.35 + Math.sin(t * 6) * 0.12, out: 0.32, elbow: 0.35 },
  };
  const sintongWin: HeroP = {
    ...SINTONG,
    expr: "happy",
    armR: { pitch: 1.15, out: 0.25, elbow: 0.75 },
    armL: { pitch: 0.25, out: 0.16, elbow: 0.55 },
  };

  const zRun = lerpN(3.2, 9.2, smoother(k));

  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [fSelamat], 0.12)} bg="#0f1d38" fog={["#0f1d38", 22, 74]}>
        <ambientLight intensity={0.62} color="#dbeafe" />
        <directionalLight position={[14, 14, 10]} intensity={1.55} color="#fde68a" castShadow />
        <pointLight position={[-3, 4, 8]} intensity={2.2} color="#fbbf24" distance={22} />

        <DonMueangApron searchlightPhase={t * 0.08} beaconPhase={t * 0.4} />
        <GarudaDC9Woyla position={[0.8, 0, -2.2]} frontDoor={1} wingDoorL={1} wingDoorR={1} rearStair={1} strobe={0.5} />

        {/* Relieved hostages running safely to freedom */}
        <WoylaActor p={runHostageA} role="sandera" position={[-2.3, 0, zRun]} rotation={[0, -0.25, 0]} />
        <WoylaActor p={runHostageB} role="sandera" position={[-1.1, 0, zRun - 1.2]} rotation={[0, -0.18, 0]} />
        <WoylaActor p={runHostageA} role="sandera" position={[-3.2, 0, zRun - 2.1]} rotation={[0, -0.22, 0]} />
        <WoylaActor p={runHostageB} role="sandera" position={[-0.2, 0, zRun - 2.6]} rotation={[0, -0.15, 0]} />

        {/* Kopassandha escorting & Sintong calling mission clear */}
        <WoylaActor p={escortMerah} role="merah" position={[-4.2, 0, 5.4]} rotation={[0, 0.55, 0]}>
          <MP5Gun position={heroHand(escortMerah, "R")} rotation={[0.1, 0.15, 0]} />
        </WoylaActor>
        <WoylaActor p={sintongWin} role="sintong" beret position={[1.4, 0, 7.6]} rotation={[0, -0.45, 0]}>
          <RadioHT3D position={heroHand(sintongWin, "R")} active />
        </WoylaActor>
      </Stage>

      <Grade warm={0.22} />
      <HudTag label="EVAKUASI DARURAT · DON MUEANG" sub="SELURUH PENUMPANG SIPIL SELAMAT" from={4} to={d - 6} accent="#22c55e" />
      <MissionClock timeText="02:58" mode="MISI SELESAI" color="#22c55e" />
      <SlamBanner title="02:58 · 48 SANDERA BEBAS!" sub="REKOR OPERASI ANTITEROR DUNIA" from={fTimer} to={d - 4} top={245} accent="#22c55e" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 8: EPILOG — "TRIBUTE PAHLAWAN & SATUAN 81 GULTOR KOPASSUS"   */
/* ================================================================== */
const EpilogScene: React.FC = () => {
  const f = useCurrentFrame();
  const d = DUR_WOYLA("epilog");
  const t = f / 30;
  const fGugur = EV["epilog.gugur"] ?? 45;
  const fGultor = EV["epilog.gultor"] ?? Math.round(d * 0.62);

  const cam = evalCam(f, [
    { kind: "orbit", to: d, target0: [0, 1.85, 0.4], target1: [0, 2.35, -0.8], ang0: -0.24, ang1: 0.24, rad0: 5.5, rad1: 7.4, y0: 1.85, y1: 3.9, fov0: 42, fov1: 44 },
  ]);

  const salutePose = (base: HeroP): HeroP => ({
    ...base,
    expr: "calm",
    lean: 0,
    armR: { pitch: 1.48, out: 0.36, elbow: 1.65 },
    armL: { pitch: 0.06, out: 0.08, elbow: 0.14 },
    legL: { pitch: 0.02, out: 0.04 },
    legR: { pitch: -0.02, out: 0.04 },
  });

  const sintongSalute = salutePose(SINTONG);
  const merahSalute = salutePose(TIM_MERAH);
  const biruSalute = salutePose(TIM_BIRU);

  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#231618" fog={["#2b1a1c", 18, 72]}>
        <ambientLight intensity={0.68} color="#fde68a" />
        <directionalLight position={[-12, 9, -16]} intensity={2.2} color="#fb923c" />
        <directionalLight position={[6, 10, 12]} intensity={1.15} color="#fef3c7" castShadow />
        <pointLight position={[0, 3.6, 1.2]} intensity={2.4} color="#facc15" distance={14} />

        <DonMueangApron searchlightPhase={0.1} beaconPhase={0} />
        <GarudaDC9Woyla position={[0, 0, -9.8]} rotation={[0, 0.28, 0]} strobe={0} />

        {/* Saluting Baret Merah heroes at golden sunrise */}
        <WoylaActor p={sintongSalute} role="sintong" beret position={[0, 0, 1.1]} rotation={[0, 0, 0]} />
        <WoylaActor p={merahSalute} role="merah" position={[-1.45, 0, 0.65]} rotation={[0, 0.14, 0]} />
        <WoylaActor p={biruSalute} role="biru" position={[1.45, 0, 0.65]} rotation={[0, -0.14, 0]} />

        {/* Rotating Golden Bintang Sakti Medal floating cleanly between squad and header */}
        <BintangSakti3D position={[0, 2.58 + Math.sin(t * 2.2) * 0.06, 1.45]} rotation={[0, t * 1.15, 0]} scale={1.55} />
      </Stage>

      <Grade warm={0.58} />
      <HudTag label="BINTANG SAKTI · KEHORMATAN BANGSA" sub="OPERASI WOYLA · 31 MARET 1981" from={4} to={d - 4} accent="#facc15" />

      {f >= fGugur - 6 && f < fGultor - 6 && (
        <SlamBanner
          title="HORMAT PAHLAWAN"
          sub="PELTU ACHMAD KIRANG · KAPTEN HERMAN RANTE"
          from={Math.max(4, fGugur - 6)}
          to={Math.max(30, fGultor - 6)}
          top={225}
          accent="#fbbf24"
        />
      )}

      {f >= fGultor - 6 && (
        <SlamBanner
          title="SATUAN 81 / GULTOR"
          sub="KOPASSUS · LAHIR DARI OPERASI WOYLA 1981"
          from={Math.max(10, fGultor - 6)}
          to={d}
          top={225}
          accent="#ef4444"
        />
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE DISSOLVE + KINETIC HOLLYWOOD CAPTIONS                        */
/* ================================================================== */
export const DissolveWoyla: React.FC<{ first?: boolean; hardCut?: boolean; children: React.ReactNode }> = ({
  first = false,
  hardCut = false,
  children,
}) => {
  const f = useCurrentFrame();
  const opacity = first || hardCut ? 1 : interpolate(f, [0, 8], [0, 1], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

type CapChunk = { text: string; speaker?: string; from: number; to: number; emph?: boolean };
const CAPS = timing.captions as CapChunk[];

export const WoylaCaptions: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunk = CAPS.find((c) => f >= c.from && f <= c.to);
  if (!chunk) return null;

  const isSintong = chunk.speaker === "sintong";
  const badgeBg = isSintong ? "#14532d" : "#7f1d1d";
  const badgeBorder = isSintong ? "#4ade80" : "#facc15";
  const badgeLabel = isSintong ? "LETKOL SINTONG · RADIO VHF" : "NADIA OMARA · KISAH NYATA";
  const pop = spring({ frame: Math.max(0, f - chunk.from), fps, config: { damping: 13, stiffness: 260 } });

  return (
    <div
      style={{
        position: "absolute",
        left: 44,
        right: 44,
        bottom: 192,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          marginBottom: 10,
          padding: "5px 18px",
          borderRadius: 999,
          background: badgeBg,
          border: `2px solid ${badgeBorder}`,
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 21,
          letterSpacing: 1.8,
          color: "#ffffff",
          boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
        }}
      >
        {badgeLabel}
      </div>
      <div
        style={{
          display: "inline-block",
          padding: "14px 30px",
          borderRadius: 20,
          background: "rgba(5,10,20,0.90)",
          border: `3px solid ${chunk.emph ? (isSintong ? "#4ade80" : "#facc15") : "rgba(148,163,184,0.45)"}`,
          boxShadow: "0 14px 36px rgba(0,0,0,0.72)",
          transform: `scale(${0.86 + 0.14 * pop})`,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: FONT_HEAD,
            fontSize: chunk.emph ? 64 : 58,
            letterSpacing: 1.5,
            lineHeight: 1.06,
            color: chunk.emph ? (isSintong ? "#4ade80" : "#facc15") : "#ffffff",
            textShadow: "0 4px 18px rgba(0,0,0,0.85), 0 3px 0 #000",
            display: "inline-block",
          }}
        >
          {chunk.text.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

export const WOYLA_SCENES: Record<WoylaScene, React.FC> = {
  hook: HookScene,
  krisis: KrisisScene,
  briefing: BriefingScene,
  susup: SusupScene,
  ababa: AbabaScene,
  klimaks: KlimaksScene,
  evakuasi: EvakuasiScene,
  epilog: EpilogScene,
};

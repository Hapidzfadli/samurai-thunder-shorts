import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { P, easeInOut3, lerpN, lerpV } from "./three/objectsRig";
import { BeanCard, BeanParams, beanWalk } from "./three/objectsBean";
import * as S from "./three/objectsSadapProps";
import { Cat3D } from "./three/objectsRig";
import { PRESIDEN, OKNUM_A, OKNUM_B, PETUGAS, PENYIDIK } from "./SheetSadap";
import { Building, Cobble, Ground, InkBox, SkyDome } from "./three/objectsMolase";
import * as K from "./three/objectsMolaseProps";
import timing from "./sadap_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

type Vec3 = [number, number, number];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_S = timing.scenes as Record<"istana" | "kerja" | "server" | "daftar" | "bosan" | "hapus" | "lapor" | "bareskrim" | "penutup", number>;
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/* ------------------------------------------------------------------ */
/* camera: smootherstep glides + creeping push-ins + dutch rolls         */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number; roll0?: number; roll1?: number; creep?: number };
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
      const push = 1 - (s.creep ?? 0.0012) * Math.min(local, 400);
      const pos: Vec3 = [look[0] + (p[0] - look[0]) * push, look[1] + (p[1] - look[1]) * push, look[2] + (p[2] - look[2]) * push];
      const f0 = s.fov ?? 36;
      return { pos, look, fov: lerpN(f0, s.fov1 ?? f0, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 36, roll: 0 };
};
const kick = (f: number, hits: number[], amp = 0.12): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 8) {
      const a = (1 - d / 8) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 2 ? 1 : -1) * a * 0.7;
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
  return null;
};
const Stage: React.FC<{ cam: Cam; shake?: Vec3; bg?: string; fog?: [string, number, number]; children: React.ReactNode }> = ({ cam, shake, bg = "#bcd4f0", fog, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.05, far: 200, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <color attach="background" args={[bg]} />
        {fog && <fog attach="fog" args={fog} />}
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
const Lights: React.FC<{ key1?: string; sky?: string; ground?: string; dir?: Vec3; k?: number; hemi?: number }> = ({ key1 = "#ffe2b0", sky = "#b8caff", ground = "#9a8aa8", dir = [-8, 9, 10], k = 2.2, hemi = 1.7 }) => (
  <>
    <hemisphereLight args={[sky, ground, hemi]} />
    <directionalLight position={[0, 5, 14]} intensity={0.9} color="#fff4e6" />
    <directionalLight position={dir} intensity={k} color={key1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-far={60} />
  </>
);

/* ------------------------------------------------------------------ */
/* post + UI                                                             */
/* ------------------------------------------------------------------ */
/** painterly finish: soft-light grade, vignette, edge blur (cheap lens-blur stand-in) */
const Grade: React.FC<{ warm?: number; cool?: number; flash?: number; dark?: number; blur?: number }> = ({ warm = 0.2, cool = 0, flash = 0, dark = 0, blur = 5 }) => (
  <>
    <AbsoluteFill style={{ mixBlendMode: "soft-light", background: warm > 0 ? `rgba(255,170,90,${0.3 * warm})` : `rgba(70,90,200,${0.3 * cool})` }} />
    {blur > 0 && <AbsoluteFill style={{ backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`, maskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 74%, #000 100%)", WebkitMaskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 74%, #000 100%)" }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 54%, rgba(30,14,40,0.5) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(20,8,28,0) 66%, rgba(20,8,28,0.5) 88%, rgba(20,8,28,0.65) 100%)" }} />
    {dark > 0 && <AbsoluteFill style={{ background: `rgba(10,12,30,${dark})` }} />}
    {flash > 0 && <AbsoluteFill style={{ background: "#fff8e8", opacity: flash }} />}
  </>
);
const chunkText = (text: string) => {
  const words = text.replace(/[.,!?:]/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const n = words[i + 1];
    if (n && w.length <= 4 && (w + n).length <= 12) {
      out.push(`${w} ${n}`);
      i++;
    } else out.push(w);
  }
  return out;
};
const Caps: React.FC<{ ids: LineId[]; hl?: string[]; color?: string; top?: number }> = ({ ids, hl = [], color = "#ffd23f", top = 1330 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hlU = hl.map((h) => h.toUpperCase());
  for (const id of ids) {
    const ln = LN(id);
    const chunks = chunkText(ln.text);
    const total = chunks.reduce((a, c) => a + c.length + 2, 0);
    const span = ln.to - ln.from + 3;
    let acc = 0;
    for (let i = 0; i < chunks.length; i++) {
      const s = ln.from + (acc / total) * span;
      acc += chunks[i].length + 2;
      const e = i === chunks.length - 1 ? ln.to + 8 : ln.from + (acc / total) * span;
      if (frame >= s && frame < e) {
        const sp = spring({ frame: frame - s, fps, config: { damping: 12, stiffness: 240 } });
        const txt = chunks[i].toLowerCase();
        const isHl = txt.split(" ").some((w) => hlU.includes(w.toUpperCase()));
        const size = Math.min(90, 720 / (txt.length * 0.52));
        return (
          <div style={{ position: "absolute", top, left: 90, width: 760, textAlign: "center" }}>
            <span style={{ display: "inline-block", fontFamily: FONT_BODY, fontWeight: 800, fontSize: size, lineHeight: 1.1, color: isHl ? color : "white", WebkitTextStroke: "6px rgba(24,10,28,0.95)", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(24,10,28,0.7)", transform: `scale(${0.7 + 0.3 * sp})`, opacity: Math.min(1, sp * 1.6) }}>
              {txt}
            </span>
          </div>
        );
      }
    }
  }
  return null;
};
const Tag: React.FC<{ label: string; from?: number; to: number; color?: string; top?: number }> = ({ label, from = 0, to, color = "#ffd23f", top = 200 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 60, padding: "10px 24px", borderRadius: 16, background: "rgba(30,14,30,0.85)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 38, letterSpacing: 2, color: "white", opacity: s * out, transform: `translateX(${(1 - s) * -90}px)` }}>
      {label}
    </div>
  );
};
const Chip: React.FC<{ from: number; to: number; top: number; children: React.ReactNode; color?: string }> = ({ from, to, top, children, color = "#12121a" }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 200 } });
  const o = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top, textAlign: "center", transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) * o }}>
      <div style={{ display: "inline-block", background: "rgba(255,250,235,0.97)", border: `7px solid ${color}`, borderRadius: 30, padding: "16px 34px", fontFamily: "Anton, Impact, sans-serif", fontSize: 76, color: "#12121a", boxShadow: "0 14px 34px rgba(0,0,0,0.3)", lineHeight: 1.05 }}>{children}</div>
    </div>
  );
};
const Bubble: React.FC<{ x: number; y: number; w?: number; text: string; size?: number; from: number; to: number }> = ({ x, y, w = 420, text, size = 44, from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y, width: w, textAlign: "center", transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) }}>
      <div style={{ background: "#fff", border: "7px solid #241726", borderRadius: 34, padding: "12px 18px", fontFamily: "Anton, Impact, sans-serif", fontSize: size, color: "#241726", boxShadow: "0 10px 26px rgba(0,0,0,0.25)" }}>{text}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* cast + sets                                                           */
/* ------------------------------------------------------------------ */
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({ bob: Math.abs(Math.sin(t * 1.6 + k)) * 2, armL: [-6 + Math.sin(t * 1.2 + k) * 3, -8], armR: [6 - Math.sin(t * 1.2 + k) * 3, -8], blink: (t * 1.0 + k * 0.7) % 2.6 < 0.13 });
/** the famous happy dance: arms out to the sides, swinging */
const joget = (t: number, phone = false): Partial<BeanParams> => {
  const s = Math.sin(t * 5.2);
  return { bob: Math.abs(s) * 10, lean: s * 3, armL: [-95 + s * 18, 40 - s * 20], armR: phone ? [150, -125] : [95 + s * 18, -40 + s * 20], legL: [s * 8, 0], legR: [-s * 8, 0] };
};

const IstanaSet: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <SkyDome top="#3f86d8" horizon="#cfe6f7" />
    <Ground color="#5ab060" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1]} receiveShadow>
      <planeGeometry args={[14, 12]} />
      <meshStandardMaterial color="#e6dccb" roughness={1} />
    </mesh>
    <S.IstanaFacade pos={[0, 0, -10]} />
    <S.Flagpole pos={[-7.5, 0, -3]} h={10} t={t} />
    <S.Hedge pos={[-6.5, 0, -1.5]} len={5} />
    <S.Hedge pos={[6.5, 0, -1.5]} len={5} />
    <S.PalaceGuard pos={[-4.8, 0, -4.4]} />
    <S.PalaceGuard pos={[4.8, 0, -4.4]} />
    <S.BlackCar pos={[7.5, 0, 2.2]} rot={-0.4} />
    <S.Monas pos={[-30, 0, -80]} s={1.2} />
    {[-12, 12].map((x) => <K.Plant key={x} pos={[x, 0, -2]} />)}
  </group>
);
const OfficeSet: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh position={[0, 3.2, -3.6]}><planeGeometry args={[30, 10]} /><meshStandardMaterial color="#efe2c8" /></mesh>
    <mesh position={[0, 1.0, -3.55]}><planeGeometry args={[30, 2]} /><meshStandardMaterial color="#7a4a24" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 30]} /><meshStandardMaterial color="#8a5a34" roughness={0.9} /></mesh>
    <K.Rug pos={[0, 0, 0.4]} w={7} d={4} color="#8a1a1a" />
    <S.CarvedPillar pos={[-4.2, 0, -3.2]} h={5.4} />
    <S.CarvedPillar pos={[4.2, 0, -3.2]} h={5.4} />
    <S.GoldEmblem pos={[0, 3.8, -3.45]} s={1.1} />
    <S.PortraitFrame pos={[-2.4, 3.3, -3.45]} />
    <S.PortraitFrame pos={[2.4, 3.3, -3.45]} />
    <S.FlagStandMP pos={[-1.8, 0, -2.8]} />
    <S.FlagStandMP pos={[1.4, 0, -2.8]} />
    <S.BigChair pos={[0, 0, -2.5]} />
    <S.PresDesk pos={[0, 0, -1.6]} />
    <S.Sofa pos={[-5.2, 0, 0.8]} rot={Math.PI / 2} />
    <S.CoffeeTable pos={[-3.7, 0, 0.8]} />
    <S.CatBed pos={[2.8, 0, 0.6]} />
    <K.Chandelier pos={[0, 6.0, -0.5]} />
    <K.Window pos={[6.2, 3.0, -3.45]} w={1.6} h={2.4} curtain="#8a1a1a" />
    <K.Plant pos={[5.6, 0, -2.6]} />
  </group>
);
const ServerSet: React.FC<{ t: number; red?: number }> = ({ t, red = 0 }) => (
  <group>
    <mesh position={[0, 3, -4.2]}><planeGeometry args={[30, 10]} /><meshStandardMaterial color="#202838" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 30]} /><meshStandardMaterial color="#2a3242" roughness={0.8} /></mesh>
    {[...Array(12)].map((_, i) => <mesh key={i} position={[-8 + i * 1.5, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.03, 30]} /><meshBasicMaterial color="#3a4458" /></mesh>)}
    {[-6.6, -5.6, -4.6, 4.6, 5.6, 6.6].map((x, i) => <S.ServerRack key={x} pos={[x, 0, -3.4]} t={t} seed={i} />)}
    {[-6.6, -5.6, 5.6, 6.6].map((x, i) => <S.ServerRack key={`f${x}`} pos={[x, 0, -1.2]} t={t + 1} seed={i + 7} />)}
    <S.LimsMachine pos={[0, 0, -2.2]} t={t} />
    <S.VerifDoor pos={[-3.0, 0, -4.1]} />
    <InkBox pos={[-3.0, 0.45, -2.6]} size={[1.0, 0.9, 0.6]} color="#3a4050" ink={0.03} />
    <S.SopBinder pos={[-3.0, 0.9, -2.6]} />
    <S.CableBundle pos={[0, 0, 0.6]} len={10} />
    <S.Shredder pos={[3.4, 0, -2.6]} />
    {[-4, 0, 4].map((x) => <mesh key={x} position={[x, 6.2, -1]}><boxGeometry args={[2.4, 0.08, 0.3]} /><meshBasicMaterial color="#cfe6ff" /></mesh>)}
    <pointLight position={[0, 3.5, 1]} intensity={20 + red * 30} color={red > 0 ? "#ff5a5a" : "#6aa8ff"} distance={14} />
  </group>
);
const BareskrimSet: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <SkyDome top="#4a86d6" horizon="#e0ecf6" />
    <Ground color="#9a9cb3" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow><planeGeometry args={[30, 14]} /><meshStandardMaterial color="#c8c0b6" roughness={1} /></mesh>
    <S.PoliceHQ pos={[0, 0, -9]} />
    <S.Flagpole pos={[-6, 0, -4]} h={8} t={t} />
    <S.PoliceFlag pos={[5.4, 0, -4.2]} />
    <S.BlackCar pos={[-6.5, 0, 1.6]} rot={0.5} />
    <S.Hedge pos={[4, 0, -5.4]} len={4} />
    {[-10, 10].map((x) => <K.Plant key={x} pos={[x, 0, -4]} />)}
  </group>
);
const EthicsSet: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh position={[0, 3.2, -3.6]}><planeGeometry args={[30, 10]} /><meshStandardMaterial color="#e8dcc4" /></mesh>
    <mesh position={[0, 0.9, -3.55]}><planeGeometry args={[30, 1.8]} /><meshStandardMaterial color="#6a3a1c" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 30]} /><meshStandardMaterial color="#7a4a2a" roughness={0.9} /></mesh>
    <S.PoliceFlag pos={[-3.4, 0, -3.0]} />
    <S.FlagStandMP pos={[3.0, 0, -3.0]} />
    <K.WallClock pos={[0, 4.4, -3.5]} r={0.5} />
    <S.GoldEmblem pos={[-1.6, 3.6, -3.5]} s={0.8} />
    <S.EthicsTable pos={[0, 0, -1.4]} />
    <S.CaseFiles pos={[-1.8, 0.85, -1.2]} />
    <K.Chair pos={[0, 0, 1.6]} rot={Math.PI} />
    <K.Chandelier pos={[0, 6, 0]} />
  </group>
);
const WarungSet: React.FC<{ t: number; tvText?: string }> = ({ t, tvText = "BREAKING NEWS" }) => (
  <group>
    <SkyDome top="#4a86d6" horizon="#ffe2b8" />
    <Ground color="#b8a88a" />
    <InkBox pos={[0, 2.0, -3.2]} size={[9, 4.0, 0.3]} color="#e8d8b0" ink={0.05} />
    <S.Awning pos={[0, 3.6, -1.6]} w={6} />
    <S.WarungCounter pos={[-1.2, 0, -2.2]} />
    <S.Sachets pos={[1.6, 3.2, -1.2]} cols={5} />
    <S.Kerupuk pos={[1.5, 0, -2.4]} />
    <S.Kerupuk pos={[2.2, 0, -2.4]} />
    <S.WallTV pos={[2.8, 2.4, -3.0]} text={tvText} t={t} />
    <S.LongBench pos={[-0.8, 0, 0.0]} />
    <S.PlasticStool pos={[2.0, 0, 0.4]} />
    <S.PlasticStool pos={[2.8, 0, 0.0]} color="#2bb673" />
    <S.Gerobak pos={[-4.8, 0, -1.0]} />
  </group>
);

const RecChip: React.FC<{ from: number; to?: number }> = ({ from, to = 99999 }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const on = Math.floor(f / 12) % 2 === 0;
  return (
    <div style={{ position: "absolute", top: 196, right: 60, padding: "8px 20px", borderRadius: 14, background: "rgba(10,10,16,0.85)", border: "3px solid #ff4a4a", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 36, color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: on ? "#ff4a4a" : "#5a1a1a", display: "inline-block" }} />
      REC
    </div>
  );
};
const Stamp: React.FC<{ at: number; text: string; sub?: string; top?: number; rot?: number; to?: number }> = ({ at, text, sub, top = 620, rot = -8, to = 99999 }) => {
  const f = useCurrentFrame();
  if (f < at || f > to) return null;
  const st = spring({ frame: f - at, fps: 30, config: { damping: 8, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", transform: `rotate(${rot}deg) scale(${0.5 + 0.5 * st})`, opacity: Math.min(1, st * 1.6) }}>
      <span style={{ display: "inline-block", border: "11px solid #c93b3b", color: "#c93b3b", fontFamily: "Anton, Impact, sans-serif", fontSize: 104, padding: "4px 30px", borderRadius: 14, background: "rgba(255,248,235,0.92)", letterSpacing: 4, lineHeight: 1.05 }}>
        {text}
        {sub && <div style={{ fontSize: 46, letterSpacing: 2 }}>{sub}</div>}
      </span>
    </div>
  );
};

/* ================================================================== */
/* 1. ISTANA                                                            */
/* ================================================================== */
export const SceneSIstana: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const rec = EV("istana.rec");
  const cam = shotCam(f, [
    { to: rec, p0: [0, 2.6, 22], l0: [0, 3.2, -4], p1: [0, 2.0, 15], l1: [0, 2.2, -1], fov: 38 },
    { to: 9999, p0: [1.2, 1.5, 8.6], l0: [0, 1.6, 1.0], p1: [1.0, 1.5, 7.6], l1: [0, 1.6, 1.0], fov: 36, roll0: -3, roll1: -4 },
  ]);
  return (
    <>
      <Stage cam={cam} bg="#cfe6f7" fog={["#d8e8f4", 40, 160]}>
        <IstanaSet t={t} />
        <BeanCard position={[0, 0, 1.2]} height={2.3} params={bean(PRESIDEN, { ...joget(t, true), expr: "happy", prop: "phone", propRot: 90 })} />
        <Lights key1="#fff0d0" dir={[-8, 10, 10]} />
      </Stage>
      <Grade warm={0.2} blur={4} dark={f >= rec ? 0.12 : 0} />
      <RecChip from={rec} />
      <Tag label="ISTANA · JAKARTA" to={rec} color="#d62828" />
      <Caps ids={["i1", "i2"]} hl={["istana", "joget", "menelepon", "tidak", "tahu", "mendengarkan"]} />
    </>
  );
};

/* ================================================================== */
/* 2. RUANG KERJA                                                       */
/* ================================================================== */
export const SceneSKerja: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const talk = EV("kerja.talk");
  const stamp = EV("kerja.stamp");
  const cam = shotCam(f, [
    { to: stamp - 10, p0: [1.6, 1.8, 9.5], l0: [1.0, 1.6, 0], p1: [1.4, 1.7, 8.4], l1: [1.0, 1.6, 0], fov: 36 },
    { to: 9999, p0: [0, 2.6, 13], l0: [0, 2.0, -1], p1: [0, 2.6, 14], l1: [0, 2.0, -1], fov: 38 },
  ]);
  return (
    <>
      <Stage cam={cam} bg="#efe2c8">
        <OfficeSet t={t} />
        <Cat3D position={[2.8, 0.15, 0.6]} rotationY={-0.4} t={t} scale={0.9} fur="#f59e0b" sit alert={f >= talk ? 0.6 : 0} />
        <BeanCard position={[1.1, 0, 1.0]} height={2.3} params={bean(PRESIDEN, { ...idle(t), expr: f >= talk ? "talk" : "happy", mouthOpen: Math.abs(Math.sin(f * 0.5)), prop: "phone", propRot: 90, armR: [150, -125], look: 0.6 })} />
        <Lights key1="#ffe6c0" sky="#fff0dc" ground="#8a6a4a" dir={[-4, 9, 8]} k={1.9} />
      </Stage>
      <Grade warm={0.35} blur={5} />
      <RecChip from={0} />
      <Bubble x={360} y={520} w={520} text="BOBBY, PAKAI SAMBAL YA!" size={40} from={talk} to={stamp - 6} />
      <Stamp at={stamp} text="RAHASIA NEGARA" sub="(soal sambal)" />
      <Caps ids={["k1", "k2"]} hl={["Bobby", "sambal", "pedas", "Rahasia", "negara"]} />
    </>
  );
};

/* ================================================================== */
/* 3. SERVER                                                            */
/* ================================================================== */
export const SceneSServer: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const toss = EV("server.toss");
  const door = EV("server.door");
  const chain = EV("server.chain");
  const cam = shotCam(f, [
    { to: door, p0: [1.0, 2.2, 11], l0: [0.7, 2.0, -1.2], p1: [0.9, 2.1, 10], l1: [0.7, 2.1, -1.2], fov: 38 },
    { to: 9999, p0: [-2.6, 1.6, 4.6], l0: [-3.0, 1.6, -3.6], p1: [-2.7, 1.6, 4.0], l1: [-3.0, 1.7, -3.6], fov: 36, roll0: 3, roll1: 4 },
  ]);
  const nums = [...Array(6)].map((_, i) => {
    const k = cl((f - toss - i * 10) / 22);
    return { k, x: lerpN(1.8, 0, k), y: 1.5 + Math.sin(k * Math.PI) * 2.6 + k * 1.8, z: lerpN(0.8, -2.2, k), i };
  });
  return (
    <>
      <Stage cam={cam} bg="#202838">
        <ServerSet t={t} />
        <BeanCard position={[1.5, 0, 1.2]} height={2.3} params={bean(OKNUM_A, { ...idle(t), expr: "smug", armR: f >= toss && f < toss + 70 ? [140 - Math.abs(Math.sin(f * 0.45)) * 50, -20] : [20, -20], look: -0.7 })} flip />
        {nums.map((n) => n.k > 0 && n.k < 1 && (
          <group key={n.i} position={[n.x, n.y, n.z]} rotation={[0, 0, n.k * 6]}>
            <mesh><planeGeometry args={[0.5, 0.28]} /><meshBasicMaterial color="#f7f1dd" side={THREE.DoubleSide} /></mesh>
            <mesh position={[0, 0, 0.01]}><planeGeometry args={[0.38, 0.06]} /><meshBasicMaterial color="#2a2a33" /></mesh>
          </group>
        ))}
        <hemisphereLight args={["#9fb8ff", "#2a3040", 1.1]} />
        <directionalLight position={[2, 8, 8]} intensity={1.2} color="#cfe0ff" />
      </Stage>
      <Grade warm={0} cool={0.5} blur={5} />
      <RecChip from={0} />
      <Tag label="RUANG LIMS (VERSI SARKAS)" to={door} color="#6aa8ff" />
      <Chip from={toss + 20} to={door - 6} top={430} color="#c93b3b">TANPA VERIFIKASI</Chip>
      <Stamp at={chain} text="DILEWATI" top={560} rot={6} />
      <Caps ids={["v1", "v2"]} hl={["diduga", "LIMS", "tanpa", "verifikasi", "ada", "tidak", "dilewati"]} />
    </>
  );
};

/* ================================================================== */
/* 4. DAFTAR                                                            */
/* ================================================================== */
export const SceneSDaftar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const print = EV("daftar.print");
  const long = EV("daftar.long");
  const items = ["PRESIDEN", "PEJABAT", "POLITISI", "JURNALIS", "ORMAS", "LSM", "PENGUSAHA", "...", "...", "..."];
  const shown = Math.min(items.length, Math.max(0, Math.floor((f - print + 6) / 12)));
  const grow = f >= long ? (f - long) * 9 : 0;
  const cam = shotCam(f, [{ to: 9999, p0: [0, 2.4, 9.6], l0: [0, 2.2, -2], p1: [0, 2.6, 11.6], l1: [0, 2.2, -2], fov: 38 }]);
  return (
    <>
      <Stage cam={cam} bg="#202838">
        <ServerSet t={t} />
        <BeanCard position={[-2.0, 0, 0.6]} height={2.2} params={bean(OKNUM_B, { ...idle(t), expr: f >= long ? "shock" : "neutral", look: 1 })} />
        <hemisphereLight args={["#9fb8ff", "#2a3040", 1.1]} />
        <directionalLight position={[2, 8, 8]} intensity={1.2} color="#cfe0ff" />
      </Stage>
      <Grade cool={0.5} warm={0} blur={4} />
      <RecChip from={0} />
      {f >= print && (
        <div style={{ position: "absolute", left: 330, top: 330, width: 420, minHeight: 200, height: Math.min(1180, 120 + shown * 74 + grow), background: "#fffdf4", borderLeft: "6px dashed #c8c0b0", borderRight: "6px dashed #c8c0b0", boxShadow: "0 18px 40px rgba(0,0,0,0.45)", padding: "18px 26px", fontFamily: "'DejaVu Sans Mono', monospace", fontWeight: 800, color: "#1a1a22", overflow: "hidden", transform: `rotate(-2deg)` }}>
          <div style={{ fontSize: 34, textAlign: "center", borderBottom: "4px dashed #999", paddingBottom: 8 }}>STRUK SADAPAN</div>
          {items.slice(0, shown).map((it, i) => (
            <div key={i} style={{ fontSize: 40, marginTop: 14, display: "flex", justifyContent: "space-between" }}>
              <span>{it}</span>
              <span style={{ color: "#c93b3b" }}>{it === "..." ? "" : "✓"}</span>
            </div>
          ))}
        </div>
      )}
      <Caps ids={["d1", "d2"]} hl={["bukan", "pejabat", "politisi", "jurnalis", "ormas", "pengusaha", "struknya", "panjang", "bulanan"]} top={1560} />
    </>
  );
};

/* ================================================================== */
/* 5. BOSAN                                                             */
/* ================================================================== */
export const SceneSBosan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const yawn = EV("bosan.yawn");
  const film = EV("bosan.film");
  const cam = shotCam(f, [{ to: 9999, p0: [2.8, 1.7, 6.6], l0: [3.2, 1.5, 0], p1: [2.9, 1.7, 5.8], l1: [3.2, 1.5, 0], fov: 36, roll0: -2, roll1: -3 }]);
  return (
    <>
      <Stage cam={cam} bg="#202838">
        <ServerSet t={t} />
        <S.OpsDesk pos={[3.2, 0, -0.4]} t={t} />
        <BeanCard position={[3.2, 0, 0.6]} height={2.2} params={bean(OKNUM_B, { ...idle(t), expr: f >= yawn ? "sleepy" : "neutral", lean: f >= film ? 6 : 0, armL: [-30, -60], armR: [30, -60] })} />
        <hemisphereLight args={["#9fb8ff", "#2a3040", 1.1]} />
        <directionalLight position={[2, 8, 8]} intensity={1.2} color="#cfe0ff" />
      </Stage>
      <Grade cool={0.5} warm={0} blur={5} />
      <RecChip from={0} />
      <div style={{ position: "absolute", left: 120, right: 120, top: 420, textAlign: "center", fontFamily: "'DejaVu Sans Mono', monospace", fontSize: 34, color: "#3cff7a", textShadow: "0 0 12px #0a4a1a" }}>
        {f > 6 && <div>[00:14] ...pakai sambal ya...</div>}
        {f > 30 && <div>[00:21] ...Bobby, sini...</div>}
        {f > 54 && <div>[00:33] ...meong...</div>}
      </div>
      <Bubble x={560} y={700} w={560} text="KUCING & SAMBAL LAGI..." size={42} from={yawn} to={film - 4} />
      {f >= film && <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center", fontFamily: "Anton, Impact, sans-serif", fontSize: 120, color: "#fff", WebkitTextStroke: "8px #1a1a22", paintOrder: "stroke fill", opacity: cl((f - film) / 10) }}>Zzz...</div>}
      <Caps ids={["b1", "b2"]} hl={["kucing", "sambal", "tidak", "seseru", "film"]} />
    </>
  );
};

/* ================================================================== */
/* 6. HAPUS                                                             */
/* ================================================================== */
export const SceneSHapus: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const press = EV("hapus.press");
  const chat = EV("hapus.chat");
  const red = f >= press && f < chat ? 0.5 + 0.5 * Math.sin(f * 0.6) : 0;
  const cam = shotCam(f, [{ to: chat, p0: [3.2, 1.6, 7.4], l0: [3.4, 1.4, -1.5], p1: [3.3, 1.6, 6.6], l1: [3.4, 1.4, -1.5], fov: 36 }, { to: 9999, p0: [3.2, 1.6, 9], l0: [3.4, 1.5, -1.5], fov: 38 }]);
  const k = spring({ frame: f - chat, fps: 30, config: { damping: 12 } });
  return (
    <>
      <Stage cam={cam} bg="#202838" shake={kick(f, [press], 0.06)}>
        <ServerSet t={t} red={red} />
        <S.Monitor pos={[4.2, 0.95, -1.4]} t={t} mode="delete" rot={-0.2} />
        <InkBox pos={[4.2, 0.45, -1.4]} size={[1.4, 0.9, 0.8]} color="#3a4050" ink={0.03} />
        <BeanCard position={[3.0, 0, 0.4]} height={2.3} params={bean(OKNUM_A, { ...idle(t), expr: f >= press ? "smug" : "neutral", prop: "button", armR: f >= press - 10 && f < press + 20 ? [70, -10] : [20, -20], look: 0.8, sweat: true })} />
        <hemisphereLight args={["#9fb8ff", "#2a3040", 1.1]} />
        <directionalLight position={[2, 8, 8]} intensity={1.2} color="#cfe0ff" />
      </Stage>
      <Grade cool={0.4} warm={0} blur={5} />
      <Tag label="OKTOBER 2026" to={chat} color="#ff4a4a" />
      <Chip from={press} to={chat - 4} top={430} color="#c93b3b">HAPUS REKAMAN?</Chip>
      {f >= chat && (
        <div style={{ position: "absolute", left: 250, top: 380, width: 580, transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.5) }}>
          <div style={{ background: "#15151c", borderRadius: 54, padding: "26px 22px", border: "6px solid #000" }}>
            <div style={{ background: "#f4f6fa", borderRadius: 30, padding: "30px 24px", fontFamily: FONT_BODY, color: "#12121a", textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 800 }}>Hapus riwayat chat?</div>
              <div style={{ fontSize: 30, fontWeight: 600, marginTop: 10, color: "#555" }}>Ibu mau cek HP kamu 👀</div>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 24 }}>
                <span style={{ background: "#ddd", borderRadius: 18, padding: "10px 24px", fontSize: 32, fontWeight: 800 }}>Batal</span>
                <span style={{ background: "#e63946", color: "#fff", borderRadius: 18, padding: "10px 24px", fontSize: 32, fontWeight: 800 }}>HAPUS</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <Caps ids={["h1", "h2"]} hl={["Oktober", "diduga", "dihapus", "riwayat", "chat", "ibu"]} />
    </>
  );
};

/* ================================================================== */
/* 7. LAPOR                                                             */
/* ================================================================== */
export const SceneSLapor: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const read = EV("lapor.read");
  const salute = EV("lapor.salute");
  const sop = EV("lapor.sop");
  const cam = shotCam(f, [
    { to: salute, p0: [-2.4, 1.6, 6.4], l0: [-2.8, 1.5, -1.5], p1: [-2.5, 1.6, 5.6], l1: [-2.8, 1.5, -1.5], fov: 36 },
    { to: 9999, p0: [-1.0, 1.7, 8.6], l0: [-1.2, 1.6, 0], p1: [-1.0, 1.9, 10], l1: [-1.2, 1.6, 0], fov: 38, roll0: 2, roll1: 0 },
  ]);
  const walk = cl((f - salute + 30) / 30);
  return (
    <>
      <Stage cam={cam} bg="#202838">
        <ServerSet t={t} />
        <BeanCard position={[lerpN(-2.6, -2.1, walk), 0, lerpN(-1.4, 0.8, walk)]} height={2.2} params={bean(PETUGAS, f < salute ? { ...idle(t), expr: "worried", prop: "paper", armR: [70, -60], armL: [40, -70], look: -0.2 } : { ...idle(t), expr: "neutral", armR: [160, -100], prop: "none" })} />
        {f >= salute && <BeanCard position={[-0.2, 0, 0.8]} height={2.3} params={bean(PENYIDIK, { ...idle(t, 1), expr: f >= sop ? "happy" : "shock", prop: "paper", armR: [60, -40], look: -1 })} flip />}
        <hemisphereLight args={["#9fb8ff", "#2a3040", 1.2]} />
        <directionalLight position={[2, 8, 8]} intensity={1.4} color="#fff0d8" />
      </Stage>
      <Grade cool={0.3} warm={0.1} blur={5} />
      <Tag label="30 OKTOBER 2026" to={salute + 20} color="#ffd23f" />
      <Bubble x={380} y={560} w={520} text="LAPOR, NDAN! TIDAK SESUAI SOP" size={36} from={salute} to={sop - 4} />
      <Chip from={sop} to={sop + 90} top={430} color="#2bb673">SOP &gt; SISTEM CANGGIH</Chip>
      <Caps ids={["l1", "l2", "l3"]} hl={["tiga", "puluh", "Oktober", "melapor", "Lapor", "SOP", "secanggih", "kalah", "satu"]} />
    </>
  );
};

/* ================================================================== */
/* 8. BARESKRIM                                                         */
/* ================================================================== */
export const SceneSBareskrim: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const set = EV("bareskrim.set");
  const etik = EV("bareskrim.etik");
  const makar = EV("bareskrim.makar");
  const inside = f >= etik - 12;
  const atWarung = f >= makar - 10;
  const cam = !inside
    ? shotCam(f, [{ to: 9999, p0: [0, 2.6, 18], l0: [0, 3.2, -4], p1: [0, 2.2, 14], l1: [0, 2.6, -3], fov: 40 }])
    : !atWarung
      ? shotCam(f - etik, [{ to: 9999, p0: [0, 2.1, 9.4], l0: [0, 1.5, -1], p1: [0, 2.1, 8.6], l1: [0, 1.5, -1], fov: 38 }])
      : shotCam(f - makar, [{ to: 9999, p0: [0.6, 1.7, 8.4], l0: [0.6, 1.6, -1], p1: [0.6, 1.8, 9.6], l1: [0.6, 1.6, -1], fov: 38 }]);
  return (
    <>
      <Stage cam={cam} bg="#e0ecf6">
        {!inside && (
          <>
            <BareskrimSet t={t} />
            <BeanCard position={[0, 0, 1.0]} height={2.3} params={bean(PENYIDIK, { ...idle(t), expr: "neutral", prop: "paper", armR: f >= set ? [120, -40] : [40, -30] })} />
          </>
        )}
        {inside && !atWarung && (
          <>
            <EthicsSet t={t} />
            {[-1.6, 0, 1.6].map((x, i) => <BeanCard key={x} position={[x, 0, -2.2]} height={2.2} params={bean(PENYIDIK, { ...idle(t, i), expr: "neutral", seed: 20 + i, hair: ["#1c1c22", "#3a2a1a", "#2a2a30"][i] })} shadow={false} />)}
            <BeanCard position={[0.2, 0, 1.9]} height={2.2} params={bean(OKNUM_A, { ...idle(t), expr: "worried", sweat: true, look: 0 })} />
          </>
        )}
        {atWarung && (
          <>
            <WarungSet t={t} tvText="DIDUGA MENGARAH KE MAKAR" />
            {[-1.6, -0.4].map((x, i) => <BeanCard key={x} position={[x, 0, 0.1]} height={1.9} params={{ torso: ["#2bb673", "#e0805a"][i], pants: "#3a3a4a", hat: i ? "cap" : "none", hatColor: "#3b4a6b", hair: "#1c1c22", expr: "shock", look: 1, seed: 30 + i }} />)}
          </>
        )}
        <Lights key1="#fff0d0" dir={[-6, 9, 10]} k={2.0} />
      </Stage>
      <Grade warm={0.2} blur={5} />
      <Stamp at={set} text="TERSANGKA" sub="(diduga)" top={520} to={etik - 14} />
      {inside && !atWarung && <Tag label="SIDANG ETIK" from={etik - 12} to={makar - 10} color="#7a5530" />}
      <Chip from={makar} to={makar + 120} top={430} color="#c93b3b">DALANG & MOTIF: DIDALAMI</Chip>
      <Caps ids={["r1", "r2"]} hl={["Bareskrim", "tersangka", "sidang", "etik", "dugaan", "makar", "Dalang", "didalami"]} />
    </>
  );
};

/* ================================================================== */
/* 9. PENUTUP                                                           */
/* ================================================================== */
export const SceneSPenutup: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const phone = EV("penutup.phone");
  const card = EV("penutup.card");
  const cam = shotCam(f, [{ to: card, p0: [0.6, 1.7, 7.6], l0: [0.6, 1.7, 0], p1: [0.6, 1.8, 6.8], l1: [0.6, 1.7, 0], fov: 36 }, { to: 9999, p0: [0, 2.8, 14], l0: [0, 2.0, -1], fov: 40 }]);
  const ck = cl((f - card) / 12);
  return (
    <>
      <Stage cam={cam} bg="#efe2c8">
        <OfficeSet t={t} />
        <Cat3D position={[2.2, 0, 1.3]} rotationY={-0.3} t={t} scale={0.9} fur="#f59e0b" sit />
        <BeanCard position={[0.4, 0, 1.2]} height={2.3} params={bean(PRESIDEN, f >= phone ? { ...joget(t), expr: "happy", prop: "phone", propRot: 0 } : { ...idle(t), expr: "talk", mouthOpen: Math.abs(Math.sin(f * 0.5)), look: 0 })} />
        <Lights key1="#ffe6c0" sky="#fff0dc" ground="#8a6a4a" dir={[-4, 9, 8]} k={1.9} />
      </Stage>
      <Grade warm={0.35} blur={5} dark={f >= card ? ck * 0.55 : 0} />
      <Bubble x={540} y={500} w={620} text="ISINYA JOGET & FOTO BOBBY" size={42} from={phone} to={card - 4} />
      {f >= card && (
        <div style={{ position: "absolute", left: 80, right: 80, top: 560, opacity: ck, transform: `scale(${0.8 + 0.2 * ck})`, background: "#fff", border: "8px solid #12121a", borderRadius: 40, padding: "40px 36px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 96, color: "#c93b3b", lineHeight: 1 }}>PARODI</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 42, color: "#12121a", marginTop: 18, lineHeight: 1.25 }}>Kasus masih berjalan. Semua tersangka berhak atas praduga tak bersalah.</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 28, color: "#666", marginTop: 16 }}>Tokoh polisi dalam video ini fiktif.</div>
        </div>
      )}
      <Caps ids={["p1", "p2"]} hl={["tanya", "joget", "Bobby", "parodi", "berjalan", "praduga", "bersalah"]} top={1560} />
    </>
  );
};

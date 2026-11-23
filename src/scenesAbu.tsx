import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { P, easeInOut3, lerpN, lerpV } from "./three/objectsRig";
import { BeanCard, BeanParams, beanHandWorld, beanWalk } from "./three/objectsBean";
import * as A from "./three/objectsAbuProps";
import { Cat3D } from "./three/objectsRig";
import { ABU, RAJA, WAZIR, PENGAWAL, ISTRI, PEDAGANG } from "./SheetAbu";
import { Building, Cobble, Ground, InkBox, SkyDome } from "./three/objectsMolase";
import * as K from "./three/objectsMolaseProps";
import timing from "./abu_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

type Vec3 = [number, number, number];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_ABU = timing.scenes as Record<"tantang" | "pasar" | "hari2" | "malam" | "kentut" | "istana" | "buka" | "akhir", number>;
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
/* helpers                                                              */
/* ------------------------------------------------------------------ */
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({ bob: Math.abs(Math.sin(t * 1.6 + k)) * 2, armL: [-6 + Math.sin(t * 1.2 + k) * 3, -8], armR: [6 - Math.sin(t * 1.2 + k) * 3, -8], blink: (t * 1.0 + k * 0.7) % 2.6 < 0.13 });
const talk = (f: number, on: boolean) => (on ? { expr: "talk" as const, mouthOpen: Math.abs(Math.sin(f * 0.55)) } : {});
const laughing = (f: number, k = 0): Partial<BeanParams> => ({ expr: "laugh", mouthOpen: 0.5 + 0.5 * Math.abs(Math.sin(f * 0.7 + k)), bob: Math.abs(Math.sin(f * 0.7 + k)) * 12, lean: Math.sin(f * 0.35 + k) * 6, armL: [-40, -100], armR: [40, -100] });
const LN2 = (id: LineId) => LN(id);
const Onoma: React.FC<{ at: number; text: string; x: number; y: number; color?: string; size?: number; dur?: number; rot?: number }> = ({ at, text, x, y, color = "#ffe14d", size = 130, dur = 40, rot = -8 }) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur) return null;
  const s = spring({ frame: f - at, fps: 30, config: { damping: 7, stiffness: 230 } });
  const o = interpolate(f, [at + dur - 8, at + dur], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: x - 400, width: 800, top: y, textAlign: "center", transform: `rotate(${rot}deg) scale(${0.3 + 0.8 * s})`, opacity: o, fontFamily: "Anton, Impact, sans-serif", fontSize: size, color, WebkitTextStroke: "10px #241726", paintOrder: "stroke fill", textShadow: "0 10px 0 rgba(36,23,38,0.6)" }}>
      {text}
    </div>
  );
};
const DayTag: React.FC<{ label: string; to?: number }> = ({ label, to = 70 }) => <Tag label={label} to={to} color="#e0b040" />;

/* ------------------------------------------------------------------ */
/* sets                                                                  */
/* ------------------------------------------------------------------ */
const ThroneHall: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh position={[0, 5, -6.2]}><planeGeometry args={[40, 14]} /><meshStandardMaterial map={A.mosaicTex()} /></mesh>
    <mesh position={[0, 0.8, -6.15]}><planeGeometry args={[40, 1.6]} /><meshStandardMaterial color="#7a1f3a" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 40]} /><meshStandardMaterial color="#d8c4a0" roughness={0.7} /></mesh>
    {[...Array(16)].map((_, i) => <mesh key={i} position={[-12 + i * 1.6, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.03, 40]} /><meshBasicMaterial color="#b8a47a" /></mesh>)}
    <A.Colonnade pos={[0, 0, -5.4]} n={7} spacing={2.4} />
    {[-5.2, 5.2].map((x) => <A.LatticeWindow key={x} pos={[x, 2.2, -6.1]} w={1.6} h={2.6} />)}
    <A.Drapes pos={[0, 0, -5.0]} w={4.2} h={5.2} />
    <group position={[0, 0, -4.2]}><A.Throne /></group>
    <A.Carpet pos={[0, 0, 0.5]} w={3.2} d={9} />
    {[-2.6, 2.6].map((x) => <A.Brazier key={x} pos={[x, 0, -3.4]} t={t} />)}
    {[-4, -1.4, 1.4, 4].map((x, i) => <A.HangingLamp key={x} pos={[x, 4.6 + (i % 2) * 0.4, -1.5]} />)}
    {[-4.6, -3.6, 3.6, 4.6].map((x, i) => <A.Cushion key={x} pos={[x, 0, -2.4]} color={i % 2 ? "#7a1f3a" : "#2a6ab0"} />)}
    {[-7, 7].map((x) => <A.ClayJar key={x} pos={[x, 0, -3.8]} s={1.3} color="#c8a050" />)}
    <pointLight position={[0, 4, 1]} intensity={22} color="#ffcf8a" distance={14} />
  </group>
);
const Market: React.FC<{ t: number; wind?: number }> = ({ t, wind = 0 }) => (
  <group>
    <SkyDome top="#3f86d8" horizon="#ffe2b8" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial map={A.mudTex()} roughness={1} /></mesh>
    <A.PalaceExterior pos={[2, 0, -30]} />
    <A.Minaret pos={[-9, 0, -28]} h={13} />
    <A.Minaret pos={[13, 0, -28]} h={12} />
    <A.CityWall pos={[-14, 0, -18]} len={14} />
    <A.CityWall pos={[16, 0, -18]} len={12} />
    <A.MarketStall pos={[-4.5, 0, -3.6]} goods="fruit" />
    <A.MarketStall pos={[-1.2, 0, -4.4]} goods="spice" awning="#2a6ab0" />
    <A.MarketStall pos={[2.2, 0, -3.8]} goods="cloth" awning="#1a8a8a" />
    <A.MarketStall pos={[5.6, 0, -4.4]} goods="fruit" awning="#e0b040" />
    {[-6.4, -2.8, 0.6, 4, 7.2].map((x, i) => <A.Basket key={x} pos={[x, 0, -2.4 + (i % 2) * 0.4]} s={0.9} />)}
    {[-7.6, 8.2].map((x) => <A.ClayJar key={x} pos={[x, 0, -2.8]} s={1.1} />)}
    <A.Camel pos={[-9, 0, -6]} rot={0.6} t={t} />
    {[-11, 10, -16, 15].map((x, i) => <A.Palm3D key={x} position={[x, 0, -7 - (i % 2) * 4]} s={1.3} sway={Math.sin(t * 1.4 + i) + wind * 2} />)}
  </group>
);
const HouseInterior: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh position={[0, 3, -3.2]}><planeGeometry args={[30, 10]} /><meshStandardMaterial map={A.mudTex()} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 30]} /><meshStandardMaterial color="#8a6a4a" roughness={1} /></mesh>
    {/* window with night sky + moon */}
    <group position={[2.6, 2.6, -3.15]}>
      <mesh><planeGeometry args={[1.6, 1.4]} /><meshBasicMaterial color="#1a2450" /></mesh>
      <mesh position={[0.3, 0.2, 0.01]}><circleGeometry args={[0.25, 20]} /><meshBasicMaterial color="#fff6c8" /></mesh>
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[-0.6 + i * 0.3, -0.3 + (i % 2) * 0.4, 0.01]}><circleGeometry args={[0.03, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      <InkBox pos={[0, 0, 0]} size={[1.8, 0.1, 0.1]} color="#6a4a2e" ink={0.02} />
      <InkBox pos={[0, 0, 0]} size={[0.1, 1.6, 0.1]} color="#6a4a2e" ink={0.02} />
    </group>
    <A.Shelf pos={[-2.4, 2.2, -2.95]} />
    <A.Mat pos={[0, 0, 0.2]} w={4} d={2.6} />
    <A.LowTable pos={[0.6, 0, 0.0]} />
    <A.OilLamp pos={[0.3, 0.42, -0.1]} t={t} />
    <A.ClayJar pos={[-3.6, 0, -2.4]} s={1.2} />
    <A.ClayJar pos={[-2.8, 0, -2.6]} s={0.8} color="#a85a2a" />
    <A.Cushion pos={[-1.2, 0, 0.4]} color="#7a1f3a" />
    <A.Cushion pos={[1.8, 0, 0.6]} color="#2a6ab0" />
    <pointLight position={[0.4, 1.2, 0.4]} intensity={14 + Math.sin(t * 9) * 1.5} color="#ffb05a" distance={8} />
  </group>
);
const Yard: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <SkyDome top="#5a96e0" horizon="#ffe0b0" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial map={A.mudTex()} roughness={1} /></mesh>
    <A.MudHouse pos={[0, 0, -4.5]} w={6} h={3.4} />
    <A.MudHouse pos={[-8, 0, -6.5]} w={5} h={4} />
    <A.MudHouse pos={[8, 0, -6]} w={5} h={3} />
    <A.Minaret pos={[-3, 0, -24]} h={13} />
    {[-4.5, 4.6].map((x, i) => <A.Palm3D key={x} position={[x, 0, -2.4]} s={1.1} sway={Math.sin(t * 1.3 + i)} />)}
    <A.ClayJar pos={[2.6, 0, -2.0]} s={1.1} />
    <A.ClayJar pos={[3.4, 0, -2.2]} s={0.8} color="#a85a2a" />
    <A.Basket pos={[-2.8, 0, -1.8]} />
    <A.Shelf pos={[1.8, 1.4, -2.4]} />
  </group>
);

/* ================================================================== */
/* 1. TANTANG                                                           */
/* ================================================================== */
export const SceneATantang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const raja = EV("tantang.raja");
  const three = EV("tantang.three");
  const laugh = EV("tantang.laugh");
  const rajaTalk = f >= raja && f < LN2("t2").to;
  const cam = shotCam(f, [
    { to: raja - 4, p0: [0.6, 3.0, 17], l0: [0.4, 2.2, -2], p1: [0.6, 2.8, 15], l1: [0.4, 2.2, -2], fov: 40 },
    { to: laugh, p0: [0.2, 2.8, 7.4], l0: [0, 2.6, -3.8], p1: [0.2, 2.8, 6.6], l1: [0, 2.6, -3.8], fov: 36, roll0: -3, roll1: -4 },
    { to: 9999, p0: [0.8, 2.6, 13.5], l0: [0.4, 1.8, -1.5], p1: [0.8, 2.6, 12.5], l1: [0.4, 1.8, -1.5], fov: 40 },
  ]);
  return (
    <>
      <Stage cam={cam} bg="#e8d4b0">
        <ThroneHall t={t} />
        <BeanCard position={[0, 1.27, -4.0]} height={2.5} params={bean(RAJA, { ...idle(t), ...(rajaTalk ? { expr: "talk", mouthOpen: Math.abs(Math.sin(f * 0.5)), armR: [120 + Math.sin(f * 0.3) * 10, -20] } : { expr: f >= laugh ? "laugh" : "smug", mouthOpen: Math.abs(Math.sin(f * 0.6)) }) })} />
        {[-2.1, 2.1].map((x, i) => <BeanCard key={x} position={[x, 0, -2.2]} height={2.3} params={bean(WAZIR, { ...idle(t, i), ...(f >= laugh ? laughing(f, i) : { expr: "smug" }), seed: 50 + i, beard: i ? "#a8a8b0" : "#3a2a1a" })} flip={i === 1} />)}
        {[-3.4, 3.4].map((x, i) => <BeanCard key={x} position={[x, 0, -3.2]} height={2.4} params={bean(PENGAWAL, { ...idle(t, i + 2), expr: f >= laugh ? "laugh" : "angry", mouthOpen: 0.6, prop: "spear", armR: [10, -10], seed: 60 + i })} flip={i === 1} />)}
        <BeanCard position={[1.5, 0, 1.4]} height={2.3} params={bean(ABU, { ...idle(t, 3), expr: f >= three ? "worried" : "neutral", sweat: f >= three, look: -0.2 })} />
        <Lights key1="#ffe0b0" sky="#fff0d8" ground="#8a6a4a" dir={[-5, 9, 9]} k={1.8} />
      </Stage>
      <Grade warm={0.4} blur={4} />
      <Tag label="ISTANA BAGHDAD" to={raja} color="#e0b040" />
      <Chip from={three} to={laugh - 4} top={430} color="#c93b3b">TANGKAP ANGIN · 3 HARI!</Chip>
      <Onoma at={laugh} text="HAHAHA!" x={540} y={520} size={110} color="#ffe14d" dur={50} />
      <Caps ids={["t1", "t2", "t3"]} hl={["Raja", "menjebak", "Tangkap", "angin", "tiga", "hari", "dihukum", "tertawa", "mungkin"]} />
    </>
  );
};

/* ================================================================== */
/* 2. PASAR                                                             */
/* ================================================================== */
export const SceneAPasar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const run = EV("pasar.run");
  const ask = EV("pasar.ask");
  const miss = EV("pasar.miss");
  const p3 = LN2("p3");
  const ax = f < ask ? lerpN(-6, 2.2, easeInOut3(cl((f - run + 20) / (ask - run + 20)))) : f < miss ? 2.2 : lerpN(2.2, 3.2, easeInOut3(cl((f - miss) / 10)));
  const running = f < ask || (f >= miss && f < miss + 12);
  const lunge = f >= miss && f < miss + 14 ? 1 : 0;
  const windX = f < miss ? ax + 1.6 + Math.sin(f * 0.2) * 0.3 : ax + 1.6 + (f - miss) * 0.25;
  const cam = shotCam(f, [
    { to: ask, p0: [-3, 2.0, 11], l0: [-2, 1.6, -1], p1: [1.5, 2.0, 10.5], l1: [1.8, 1.6, -1], fov: 38 },
    { to: 9999, p0: [1.8, 1.8, 8.4], l0: [1.6, 1.5, -1], p1: [1.8, 1.9, 9.4], l1: [1.8, 1.5, -1], fov: 38, roll0: 2, roll1: 0 },
  ]);
  return (
    <>
      <Stage cam={cam} bg="#ffe2b8" fog={["#ffe2c8", 40, 160]}>
        <Market t={t} wind={running ? 1 : 0} />
        <A.WindSwirl pos={[windX, 1.2, 0.4]} t={t} s={1.1} />
        <BeanCard position={[ax, 0, 0.4]} height={2.3} params={bean(ABU, { ...(running ? beanWalk(f * 0.07, 1.4) : idle(t)), ...(f >= p3.from && f < p3.to ? talk(f, true) : { expr: f >= miss ? "worried" : "smug" }), prop: "sack", armR: lunge ? [150, -40] : [70, -50], look: 1, sweat: f >= miss })} />
        <BeanCard position={[4.4, 0, -1.9]} height={2.3} params={bean(PEDAGANG, { ...idle(t, 1), ...(f >= ask && f < LN2("p2").to ? talk(f, true) : { expr: f >= ask ? "shock" : "neutral" }), armR: f >= ask ? [100, -30] : [6, -8], look: -1 })} flip />
        <Lights key1="#ffe6c0" dir={[-6, 10, 8]} k={2.1} />
      </Stage>
      <Grade warm={0.35} blur={4} />
      <DayTag label="HARI KE-1" to={ask} />
      <Onoma at={miss} text="WUSSH!" x={720} y={560} size={100} color="#bfe6ff" />
      <Caps ids={["p1", "p2", "p3"]} hl={["pertama", "mengejar", "karung", "sedang", "apa", "Menangkap", "lolos", "lagi"]} />
    </>
  );
};

/* ================================================================== */
/* 3. HARI 2                                                            */
/* ================================================================== */
export const SceneAHari2: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const net = EV("hari2.net");
  const fan = EV("hari2.fan");
  const kite = EV("hari2.kite");
  const empty = EV("hari2.empty");
  const phase = f < fan ? 0 : f < kite ? 1 : f < empty ? 2 : 3;
  const swing = Math.sin(f * 0.5);
  const params: Partial<BeanParams> =
    phase === 0 ? { ...beanWalk(f * 0.06, 1.1), prop: "net", armR: [120 + swing * 40, -30], expr: "smug" } :
    phase === 1 ? { ...idle(t), prop: "fan", armR: [100 + swing * 30, -60 + swing * 30], expr: "think" } :
    phase === 2 ? { ...idle(t), armR: [150, -10], expr: "happy" } :
    { ...idle(t), expr: "sad", armL: [-20, -10], armR: [20, -10], sweat: true, lean: 6 };
  const cam = shotCam(f, [{ to: 9999, p0: [0.6, 2.0, 9.6], l0: [0.6, 1.8, -1], p1: [0.6, 2.2, 10.6], l1: [0.6, 2.2, -1], fov: 38 }]);
  return (
    <>
      <Stage cam={cam} bg="#ffe2b8" fog={["#ffe2c8", 40, 160]}>
        <Market t={t} />
        <A.WindSwirl pos={[2.6 + Math.sin(t) * 0.6, 1.6 + Math.sin(t * 1.4) * 0.3, 0.2]} t={t} s={1.0} />
        {phase === 2 && <A.Kite pos={[1.6 + Math.sin(t * 1.2) * 0.5, 4.2 + Math.sin(t * 2) * 0.3, -0.4]} t={t} />}
        {phase === 2 && <mesh position={[1.1, 2.9, 0.2]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.02, 2.6, 0.02]} /><meshBasicMaterial color="#2a2a33" /></mesh>}
        <BeanCard position={[0, 0, 0.4]} height={2.3} params={bean(ABU, { ...params, look: 0.8 })} />
        <BeanCard position={[-4.4, 0, -1.8]} height={2.3} params={bean(PEDAGANG, { ...idle(t, 1), expr: phase === 3 ? "laugh" : "smug", mouthOpen: 0.6 })} />
        <Lights key1="#ffd8a0" dir={[-6, 10, 8]} k={2.0} />
      </Stage>
      <Grade warm={0.45} blur={4} />
      <DayTag label="HARI KE-2" to={net + 40} />
      <Chip from={empty} to={empty + 70} top={430} color="#c93b3b">HASILNYA: KOSONG</Chip>
      <Caps ids={["h1"]} hl={["kedua", "jaring", "kipas", "layang-layang", "Kosong"]} />
    </>
  );
};

/* ================================================================== */
/* 4. MALAM                                                             */
/* ================================================================== */
export const SceneAMalam: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const wife = EV("malam.wife");
  const think = EV("malam.think");
  const m1 = LN2("m1");
  const cam = shotCam(f, [{ to: think, p0: [-0.4, 1.7, 7.4], l0: [-0.2, 1.4, 0], p1: [-0.2, 1.7, 6.8], l1: [-0.2, 1.4, 0], fov: 36 }, { to: 9999, p0: [0.6, 1.6, 6.0], l0: [0.5, 1.5, 0], p1: [0.6, 1.6, 5.2], l1: [0.5, 1.5, 0], fov: 34 }]);
  const dots = Math.floor((f - think) / 10) % 4;
  return (
    <>
      <Stage cam={cam} bg="#1a2040">
        <HouseInterior t={t} />
        <BeanCard position={[-1.4, 0, 0.6]} height={2.1} params={bean(ISTRI, { ...idle(t, 1), ...(f >= m1.from && f < m1.to ? talk(f, true) : { expr: "worried" }), armL: [-40, -70], armR: [40, -70], look: 1 })} />
        <BeanCard position={[0.6, 0, 0.8]} height={2.3} params={bean(ABU, { ...idle(t), expr: f >= think ? "think" : "worried", armR: f >= think ? [160, -150] : [10, -10], look: f >= think ? 1 : -1, blink: false })} flip />
        <hemisphereLight args={["#3a4a8a", "#1a1020", 0.7]} />
        <directionalLight position={[3, 6, 4]} intensity={0.5} color="#9ab0ff" />
      </Stage>
      <Grade warm={0.3} blur={5} dark={0.05} />
      <Tag label="MALAM · BATAS WAKTU BESOK" to={think} color="#9ab0ff" />
      {f >= think && <div style={{ position: "absolute", left: 600, top: 460, width: 260, textAlign: "center", background: "#fff", border: "7px solid #241726", borderRadius: 80, padding: "18px 0", fontFamily: "Anton, Impact, sans-serif", fontSize: 90, color: "#241726", opacity: cl((f - think) / 8) }}>{"?".repeat(1 + (dots % 3))}</div>}
      <Caps ids={["m1", "m2"]} hl={["besok", "batas", "Bagaimana", "berpikir", "keras", "semalaman"]} />
    </>
  );
};


/** screen-space projection with the same camera the Stage uses */
const projector = (cam: Cam) => {
  const c = new THREE.PerspectiveCamera(cam.fov, 1080 / 1920, 0.05, 200);
  c.position.set(...cam.pos);
  c.lookAt(...cam.look);
  c.updateMatrixWorld();
  return (p: Vec3) => {
    const v = new THREE.Vector3(...p).project(c);
    return [v.x * 540, v.y * 960] as [number, number];
  };
};
/** brute-force 2-bone solve: arm angles that put a card's hand on a screen target */
const reachArm = (base: BeanParams, side: "L" | "R", pos: Vec3, h: number, cam: Cam, target: Vec3): [number, number] => {
  const proj = projector(cam);
  const goal = proj(target);
  let best: [number, number] = [0, 0];
  let bd = 1e9;
  for (let a0 = -180; a0 <= 180; a0 += 6)
    for (let a1 = -150; a1 <= 0; a1 += 6) {
      const pp = { ...base, [side === "R" ? "armR" : "armL"]: [a0, a1] } as BeanParams;
      const q = proj(beanHandWorld(pp, side, pos, h, cam.pos));
      const d = Math.hypot(q[0] - goal[0], q[1] - goal[1]) + Math.abs(a1) * 0.05;
      if (d < bd) {
        bd = d;
        best = [a0, a1];
      }
    }
  return best;
};
/* ================================================================== */
/* close-up inserts (hands)                                              */
/* ================================================================== */
const SKIN = "#f7ead6";
const INKH = "#241726";
const BottleSvg: React.FC<{ x: number; y: number; s?: number; fill?: number }> = ({ x, y, s = 1, fill = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -150 -180 Q -160 260 -120 300 L 120 300 Q 160 260 150 -180 Q 140 -260 60 -300 L 60 -420 L -60 -420 L -60 -300 Q -140 -260 -150 -180 Z" fill="rgba(160,220,200,0.55)" stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
    {fill > 0 && <path d={`M -140 ${300 - 400 * fill} L 140 ${300 - 400 * fill} L 125 295 L -125 295 Z`} fill="rgba(170,210,90,0.5)" />}
    <path d="M -95 -150 Q -105 100 -80 230" stroke="#ffffff" strokeWidth={20} fill="none" opacity={0.6} strokeLinecap="round" />
    <path d="M -60 -420 L 60 -420" stroke={INKH} strokeWidth={14} />
  </g>
);
const Cork: React.FC<{ x: number; y: number; rot?: number }> = ({ x, y, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M -58 -70 L 58 -70 L 48 60 L -48 60 Z" fill="#c8874a" stroke={INKH} strokeWidth={11} strokeLinejoin="round" />
    {[[-20, -30], [18, -6], [-8, 26], [26, 34]].map(([a, b], i) => <circle key={i} cx={a} cy={b} r={6} fill="#8a5428" />)}
  </g>
);
/** a hand gripping something vertical: palm on the left, four finger bars across the object */
const GripHand: React.FC<{ x: number; y: number; flip?: boolean; sleeve: string; cuff: string; s?: number }> = ({ x, y, flip = false, sleeve, cuff, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <path d="M -560 -160 L -170 -120 L -170 170 L -560 260 Z" fill={sleeve} stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
    <path d="M -230 -128 L -170 -120 L -170 170 L -230 182 Z" fill={cuff} stroke={INKH} strokeWidth={10} />
    <path d="M -175 -110 Q -60 -150 20 -100 L 40 140 Q -60 190 -175 160 Z" fill={SKIN} stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
    {[-70, -10, 50, 110].map((yy, i) => <rect key={i} x={-10} y={yy - 26} width={200 - i * 8} height={54} rx={27} fill={SKIN} stroke={INKH} strokeWidth={11} />)}
    <path d="M -60 -110 Q 40 -190 120 -150 Q 150 -120 110 -100 Q 40 -120 -20 -80" fill={SKIN} stroke={INKH} strokeWidth={11} strokeLinejoin="round" />
  </g>
);
/** thumb + index pinch from above */
const PinchHand: React.FC<{ x: number; y: number; sleeve: string; cuff: string; open?: number }> = ({ x, y, sleeve, cuff, open = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M 120 -620 L 420 -560 L 330 -230 L 60 -300 Z" fill={sleeve} stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
    <path d="M 80 -310 L 330 -240 L 312 -180 L 64 -250 Z" fill={cuff} stroke={INKH} strokeWidth={10} />
    <path d="M 70 -250 Q 220 -230 300 -170 Q 270 -60 160 -60 Q 60 -80 30 -170 Z" fill={SKIN} stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
    <rect x={-120 - open * 40} y={-150} width={70} height={190} rx={35} fill={SKIN} stroke={INKH} strokeWidth={11} transform={`rotate(${-10 - open * 10} -85 -150)`} />
    <rect x={60 + open * 40} y={-150} width={70} height={190} rx={35} fill={SKIN} stroke={INKH} strokeWidth={11} transform={`rotate(${12 + open * 10} 95 -150)`} />
  </g>
);
const InsertBg: React.FC<{ a: string; b: string }> = ({ a, b }) => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${a} 0%, ${b} 100%)` }} />;
/** Abu presses the cork into the bottle while the last wisps of 'wind' go in */
const InsertCork: React.FC<{ from: number; to: number; plok: number }> = ({ from, to, plok }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const k = cl((f - from) / Math.max(1, plok - from));
  const corkY = lerpN(330, 560, easeInOut3(cl((k - 0.35) / 0.65)));
  const done = f >= plok;
  const fade = interpolate(f, [from, from + 4, to - 4, to], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <InsertBg a="#f2dcb0" b="#b8946a" />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        {!done && [0, 1, 2, 3, 4].map((i) => {
          const p = (k * 1.6 + i * 0.2) % 1;
          return <path key={i} d={`M ${300 + i * 90} ${180 + p * 40} Q ${540 + Math.sin(i + p * 6) * 120} ${380 + p * 120} 540 ${600 + p * 200}`} stroke="#a8c860" strokeWidth={26 - p * 14} fill="none" strokeLinecap="round" opacity={1 - p} />;
        })}
        <BottleSvg x={540} y={1060} s={1.15} fill={0.55} />
        <Cork x={540} y={corkY} />
        <GripHand x={430} y={1170} sleeve="#7a9a6a" cuff="#c8a050" s={1.1} />
        <g transform={`translate(0 ${corkY - 560})`}><PinchHand x={540} y={500} sleeve="#7a9a6a" cuff="#c8a050" /></g>
        {done && [0, 1, 2, 3, 4, 5].map((i) => <path key={i} transform={`translate(${540 + Math.cos(i * 1.05) * 260} ${520 + Math.sin(i * 1.05) * 200}) rotate(${(f - plok) * 8})`} d="M 0 -26 L 7 -7 L 26 0 L 7 7 L 0 26 L -7 7 L -26 0 L -7 -7 Z" fill="#fff6a8" stroke={INKH} strokeWidth={4} />)}
      </svg>
    </AbsoluteFill>
  );
};
/** the king grips the bottle and pulls the cork until it pops */
const InsertUncork: React.FC<{ from: number; to: number; pop: number }> = ({ from, to, pop }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const k = cl((f - from) / Math.max(1, pop - from));
  const popped = f >= pop;
  const pk = cl((f - pop) / 14);
  const shake = !popped ? Math.sin(f * 2.3) * 8 * k : 0;
  const corkY = popped ? 560 - 120 - pk * 900 : 560 - 120 * easeInOut3(k * k);
  const fade = interpolate(f, [from, from + 4, to - 4, to], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <InsertBg a="#ffe6c0" b="#a86a4a" />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <g transform={`translate(${shake} 0)`}>
          <BottleSvg x={540} y={1060} s={1.15} fill={0.55} />
          <GripHand x={430} y={1180} sleeve="#5a2a8a" cuff="#e0b040" s={1.1} />
        </g>
        {popped && [...Array(14)].map((i, n) => {
          const a = -Math.PI / 2 + (n - 6.5) * 0.18;
          const r = 120 + pk * (500 + (n % 3) * 140);
          return <circle key={n} cx={540 + Math.cos(a) * r * 0.9} cy={560 + Math.sin(a) * r} r={50 + pk * 70 + (n % 4) * 14} fill="#a8c860" stroke={INKH} strokeWidth={6} opacity={0.9 - pk * 0.3} />;
        })}
        <Cork x={540 + shake} y={corkY} rot={popped ? pk * 540 : shake} />
        <g transform={`translate(${shake} ${popped ? -pk * 220 : corkY - 440})`}><PinchHand x={540} y={500} sleeve="#5a2a8a" cuff="#e0b040" open={popped ? 1 : 0} /></g>
        {!popped && k > 0.3 && [0, 1, 2].map((i) => <path key={i} d={`M ${720 + i * 40} ${300 + i * 50} l 70 -20`} stroke={INKH} strokeWidth={10} strokeLinecap="round" opacity={0.7} />)}
      </svg>
      {popped && <AbsoluteFill style={{ background: `rgba(150,200,80,${0.35 * pk})` }} />}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. KENTUT (revised: grab bottle from shelf, aim it at the rear, cork)  */
/* ================================================================== */
const SHELF_BOTTLE: Vec3 = [2.15, 1.44, -2.4];
export const SceneAKentut: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const belly = EV("kentut.belly");
  const fart = EV("kentut.fart");
  const idea = EV("kentut.idea");
  const cork = EV("kentut.cork");
  const giggle = EV("kentut.giggle");
  const k2 = LN2("k2");
  const H = 2.3;
  // path: stand (0,0.6) -> walk to shelf (1.7,-1.5) -> grab -> back (0,0.6) -> aim behind -> insert cork -> giggle
  const goK = easeInOut3(cl((f - (idea + 8)) / 26));
  const backK = easeInOut3(cl((f - (idea + 44)) / 24));
  const ax = f < idea + 44 ? lerpN(0, 1.75, goK) : lerpN(1.75, 0.2, backK);
  const az = f < idea + 44 ? lerpN(0.6, -1.5, goK) : lerpN(-1.5, 0.6, backK);
  const walking = (goK > 0 && goK < 1) || (backK > 0 && backK < 1);
  const reachShelf = f >= idea + 32 && f < idea + 46;
  const aiming = f >= idea + 70 && f < cork - 14;
  const aimK = easeInOut3(cl((f - (idea + 70)) / 12));
  const camPos: Vec3 = [0.8, 1.8, 9.6];
  const cam = shotCam(f, [
    { to: idea + 8, p0: [0.2, 1.7, 8.0], l0: [0.1, 1.3, -0.2], p1: [0.2, 1.6, 7.2], l1: [0.1, 1.3, -0.2], fov: 36 },
    { to: idea + 62, p0: camPos, l0: [0.8, 1.3, -0.6], p1: [0.8, 1.8, 9.0], l1: [0.8, 1.3, -0.6], fov: 38 },
    { to: 9999, p0: [0.2, 1.5, 6.4], l0: [0.0, 1.2, 0.0], p1: [0.2, 1.5, 5.8], l1: [0.0, 1.2, 0.0], fov: 36 },
  ]);
  let params: Partial<BeanParams>;
  if (f < fart) params = { ...idle(t), expr: f >= belly ? "worried" : "sad", armL: [25, 70], armR: [-25, -70], lean: f >= belly ? 8 : 0, sweat: f >= belly };
  else if (f < idea) params = { ...idle(t), expr: "shock", armL: [-60, -30], armR: [60, -30], bob: 14 };
  else if (walking) params = { ...beanWalk(f * 0.07, 1.2), ...(f >= k2.from && f < k2.to ? talk(f, true) : { expr: "smug" }), armR: backK > 0 ? [40, -40] : [30, -10] };
  else if (reachShelf) params = { ...idle(t), expr: "smug", armR: [150, -20] };
  else if (aiming) params = { ...idle(t), expr: "smug", lean: 12 * aimK, armR: [lerpN(40, -48, aimK), lerpN(-40, -18, aimK)], armL: [-20, -40], look: -1 };
  else if (f < giggle) params = { ...idle(t), expr: "smug", armR: [70, -70], armL: [-30, -50] };
  else params = { ...laughing(f), armR: [120, -70] };
  const abuPos: Vec3 = [ax, 0, az];
  const full = bean(ABU, { ...params });
  const hand = beanHandWorld(full, "R", abuPos, H, cam.pos);
  const grabbed = f >= idea + 40;
  const bottlePos: Vec3 = grabbed ? (aiming ? [hand[0], hand[1], hand[2] - 0.02 * aimK] : hand) : SHELF_BOTTLE;
  const bottleRot: Vec3 = aiming ? [0, 0, lerpN(0, -1.35, aimK)] : [0, 0, 0];
  const rear: Vec3 = [ax - 0.15, 0.9, az - 0.3];
  // fart cloud stays behind, then is sucked into the bottle mouth while aiming
  const suck = aiming ? cl((f - (idea + 78)) / 26) : f >= cork - 14 ? 1 : 0;
  const cloudK = f >= fart ? cl((f - fart) / 12) * (1 - suck) : 0;
  const mouth: Vec3 = [bottlePos[0] - Math.sin(bottleRot[2]) * 0.32, bottlePos[1] + Math.cos(bottleRot[2]) * 0.32, bottlePos[2]];
  return (
    <>
      <Stage cam={cam} shake={kick(f, [fart], 0.08)} bg="#ffe0b0" fog={["#ffe2c8", 40, 160]}>
        <Yard t={t} />
        {cloudK > 0 && <A.StinkCloud pos={aiming ? [rear[0] - 0.3, 0.5, rear[2]] : [-0.9, 0.15, -0.4]} t={t} k={0.25 + cloudK * 0.5} />}
        {aiming && [0, 1, 2, 3, 4].map((i) => {
          const p = (suck * 2 + i * 0.2) % 1;
          return <mesh key={i} position={[lerpN(rear[0] - 0.3, mouth[0], p), lerpN(0.7, mouth[1], p) + Math.sin(p * 6 + i) * 0.06, lerpN(rear[2], mouth[2], p)]}><sphereGeometry args={[0.09 * (1 - p * 0.6), 8, 6]} /><meshBasicMaterial color="#a8c860" /></mesh>;
        })}
        <group position={bottlePos} rotation={bottleRot}>
          <A.Bottle pos={[0, -0.15, 0]} s={0.55} corked={f >= cork} />
        </group>
        <BeanCard position={abuPos} height={H} params={full} />
        <Lights key1="#ffe6c0" dir={[-6, 10, 8]} k={2.0} />
      </Stage>
      <Grade warm={0.35} blur={4} flash={f >= idea && f < idea + 6 ? 0.4 * (1 - (f - idea) / 6) : 0} />
      <DayTag label="HARI KE-3" to={fart - 4} />
      <Onoma at={fart} text="PRRRUT!" x={330} y={700} color="#b8e06a" size={130} dur={30} rot={-10} />
      {f >= idea && f < idea + 30 && <div style={{ position: "absolute", left: 600, top: 380, fontSize: 160, transform: `scale(${spring({ frame: f - idea, fps: 30, config: { damping: 8 } })})` }}>💡</div>}
      {aiming && <Onoma at={idea + 80} text="SLURRP..." x={560} y={330} color="#b8e06a" size={80} dur={28} rot={-6} />}
      <InsertCork from={cork - 14} to={cork + 16} plok={cork} />
      <Onoma at={cork} text="PLOK!" x={540} y={260} color="#e0b040" size={110} dur={16} />
      <Onoma at={giggle} text="HEHEHE..." x={540} y={460} color="#ffffff" size={96} dur={56} rot={-4} />
      <Caps ids={["k1", "k2", "k3"]} hl={["ketiga", "mulas", "Lalu", "Nah", "anginnya", "Cepat-cepat", "botol", "rapat-rapat"]} />
    </>
  );
};

/* ================================================================== */
/* 6. ISTANA (revised: the bottle visibly passes from hand to hand)      */
/* ================================================================== */
const RAJA_POS: Vec3 = [0, 1.27, -4.0];
const RAJA_H = 2.5;
export const SceneAIstana: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const i2 = LN2("i2");
  const camPos: Vec3 = [3.4, 2.4, 6.4];
  const cam = shotCam(f, [{ to: 9999, p0: camPos, l0: [0.4, 1.9, -2.6], p1: [3.0, 2.3, 5.8], l1: [0.3, 1.9, -2.8], fov: 38 }]);
  const walkK = easeInOut3(cl(f / 30));
  const abuPos: Vec3 = [lerpN(2.6, 0.7, walkK), 0, lerpN(3.0, -2.7, walkK)];
  const offerK = easeInOut3(cl((f - 26) / 14));
  const reachK = easeInOut3(cl((f - 34) / 12));
  const passK = easeInOut3(cl((f - 48) / 12));
  const pullK = easeInOut3(cl((f - 62) / 14));
  const abuP = bean(ABU, { ...(walkK < 1 ? beanWalk(f * 0.05, 1) : idle(t)), ...(f >= i2.from && f < i2.to ? talk(f, true) : { expr: "smug" }), lean: 10 * offerK * (1 - pullK), armR: pullK < 0.01 ? [lerpN(40, 150, offerK), lerpN(-40, -10, offerK)] : [lerpN(150, 10, pullK), -10], look: -1 });
  const abuHand = beanHandWorld(abuP, "R", abuPos, 2.3, cam.pos);
  const rajaBase = bean(RAJA, { ...idle(t), expr: f >= i2.from ? "smug" : "neutral", lean: 10 * reachK * (1 - pullK), look: 0.6 });
  const meet = reachArm(rajaBase, "R", RAJA_POS, RAJA_H, cam, abuHand);
  const rest: [number, number] = [10, -10];
  const chest: [number, number] = [35, -120];
  const armR: [number, number] = pullK > 0 ? [lerpN(meet[0], chest[0], pullK), lerpN(meet[1], chest[1], pullK)] : [lerpN(rest[0], meet[0], reachK), lerpN(rest[1], meet[1], reachK)];
  const rajaP = bean(rajaBase, { armR });
  const rajaHand = beanHandWorld(rajaP, "R", RAJA_POS, RAJA_H, cam.pos);
  const bottlePos = lerpV(abuHand, rajaHand, passK);
  return (
    <>
      <Stage cam={cam} bg="#e8d4b0">
        <ThroneHall t={t} />
        <BeanCard position={RAJA_POS} height={RAJA_H} params={rajaP} />
        {[-2.1, 2.1].map((x, i) => <BeanCard key={x} position={[x, 0, -2.2]} height={2.3} params={bean(WAZIR, { ...idle(t, i), expr: "smug", seed: 50 + i, beard: i ? "#a8a8b0" : "#3a2a1a" })} flip={i === 1} />)}
        {[-3.4, 3.4].map((x, i) => <BeanCard key={x} position={[x, 0, -3.2]} height={2.4} params={bean(PENGAWAL, { ...idle(t, i + 2), expr: "angry", prop: "spear", armR: [10, -10], seed: 60 + i })} flip={i === 1} />)}
        <group position={bottlePos}><A.Bottle pos={[0, -0.15, 0]} s={0.55} /></group>
        <BeanCard position={abuPos} height={2.3} params={abuP} />
        <Lights key1="#ffe0b0" sky="#fff0d8" ground="#8a6a4a" dir={[-5, 9, 9]} k={1.8} />
      </Stage>
      <Grade warm={0.4} blur={4} />
      <Tag label="KEMBALI KE ISTANA" to={40} color="#e0b040" />
      <Caps ids={["i1", "i2"]} hl={["istana", "botol", "angin", "Paduka", "dibuka"]} />
    </>
  );
};

/* ================================================================== */
/* 7. BUKA (revised: close-up of the king pulling the cork)              */
/* ================================================================== */
export const SceneABuka: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const pop = EV("buka.pop");
  const yuck = EV("buka.yuck");
  const camPos: Vec3 = [0.6, 2.8, 11.5];
  const after = f >= pop + 10;
  const cloud = after ? cl((f - pop - 10) / 30) : 0;
  const rajaP = bean(RAJA, { ...idle(t), expr: after ? "disgust" : "smug", armR: after ? [100, -10] : [40, -110], armL: after ? [-150, -150] : [-40, -100], lean: after ? -6 : 0 });
  const rajaHand = beanHandWorld(rajaP, "R", RAJA_POS, RAJA_H, camPos);
  const cam = shotCam(f, [{ to: 9999, p0: camPos, l0: [0.3, 2.1, -2.4], p1: [0.6, 2.8, 12.5], l1: [0.3, 2.1, -2.4], fov: 40, roll0: -3, roll1: -1 }]);
  return (
    <>
      <Stage cam={cam} shake={kick(f, [pop + 10], 0.07)} bg="#e8d4b0">
        <ThroneHall t={t} />
        <BeanCard position={RAJA_POS} height={RAJA_H} params={rajaP} />
        <group position={rajaHand}><A.Bottle pos={[0, -0.15, 0]} s={0.55} corked={!after} /></group>
        {after && <A.StinkCloud pos={[rajaHand[0] + 0.1, rajaHand[1] + 0.3 + cloud * 0.6, rajaHand[2]]} t={t} k={0.25 + cloud * 0.6} />}
        {after && <group position={[1.4, 0.06, -1.6]} rotation={[Math.PI / 2, 0, 0.6]}><mesh><cylinderGeometry args={[0.05, 0.045, 0.1, 10]} /><meshStandardMaterial color="#c8874a" /></mesh></group>}
        {[-2.1, 2.1].map((x, i) => <BeanCard key={x} position={[x, 0, -2.2]} height={2.3} params={bean(WAZIR, { ...idle(t, i), expr: f >= pop + 22 ? "disgust" : "neutral", armL: f >= pop + 22 ? [-150, -150] : [-6, -8], seed: 50 + i, beard: i ? "#a8a8b0" : "#3a2a1a" })} flip={i === 1} />)}
        {[-3.4, 3.4].map((x, i) => <BeanCard key={x} position={[x, 0, -3.2]} height={2.4} params={bean(PENGAWAL, { ...idle(t, i + 2), expr: f >= pop + 30 ? "disgust" : "angry", prop: "spear", armR: [10, -10], armL: f >= pop + 30 ? [-150, -150] : [-6, -8], seed: 60 + i })} flip={i === 1} />)}
        <BeanCard position={[1.6, 0, 0.8]} height={2.3} params={bean(ABU, { ...idle(t), expr: after ? "smug" : "neutral", look: -0.4 })} />
        <Lights key1="#ffe0b0" sky="#fff0d8" ground="#8a6a4a" dir={[-5, 9, 9]} k={1.8} />
      </Stage>
      <Grade warm={0.3} blur={4} />
      {cloud > 0 && <AbsoluteFill style={{ background: `rgba(140,200,80,${0.2 * Math.min(1, cloud * 2) * (1 - cl((f - pop - 70) / 30))})`, mixBlendMode: "multiply" }} />}
      <InsertUncork from={12} to={pop + 10} pop={pop} />
      <Onoma at={pop} text="POP!" x={540} y={250} color="#e0b040" size={130} dur={12} />
      <Onoma at={yuck} text="HUEEEK!" x={540} y={560} color="#b8e06a" size={130} dur={60} rot={6} />
      <Caps ids={["b1", "b2"]} hl={["membuka", "dan", "Hueek", "Bau", "apa"]} />
    </>
  );
};

/* ================================================================== */
/* 8. AKHIR                                                             */
/* ================================================================== */
export const SceneAAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const say = EV("akhir.say");
  const laugh = EV("akhir.laugh");
  const crowd = EV("akhir.crowd");
  const end = EV("akhir.end");
  const dur = DURATIONS_ABU.akhir;
  const a1 = LN2("a1");
  const cam = shotCam(f, [
    { to: laugh, p0: [2.6, 1.9, 7.0], l0: [2.4, 1.7, 0.8], p1: [2.6, 1.9, 6.4], l1: [2.4, 1.7, 0.8], fov: 34 },
    { to: crowd, p0: [-0.4, 2.8, 6.4], l0: [0, 2.6, -3.8], p1: [-0.3, 2.8, 5.9], l1: [0, 2.6, -3.8], fov: 36, roll0: 3, roll1: 5 },
    { to: 9999, p0: [0.4, 3.2, 13], l0: [0.4, 2.0, -1.5], p1: [0.4, 3.6, 16], l1: [0.4, 2.0, -1.5], fov: 40 },
  ]);
  const title = cl((f - (dur - 60)) / 14);
  return (
    <>
      <Stage cam={cam} bg="#e8d4b0">
        <ThroneHall t={t} />
        <BeanCard position={[0, 1.27, -4.0]} height={2.5} params={bean(RAJA, { ...idle(t), ...(f >= laugh ? laughing(f) : { expr: "shock" }), prop: "none" })} />
        <A.Bottle pos={[1.05, 1.9, -3.9]} s={0.55} corked={false} />
        {[-2.1, 2.1].map((x, i) => <BeanCard key={x} position={[x, 0, -2.2]} height={2.3} params={bean(WAZIR, { ...idle(t, i), ...(f >= crowd ? laughing(f, i + 1) : { expr: "shock" }), seed: 50 + i, beard: i ? "#a8a8b0" : "#3a2a1a" })} flip={i === 1} />)}
        {[-3.4, 3.4].map((x, i) => <BeanCard key={x} position={[x, 0, -3.2]} height={2.4} params={bean(PENGAWAL, { ...idle(t, i + 2), ...(f >= crowd + 8 ? laughing(f, i + 3) : { expr: "shock" }), prop: "spear", seed: 60 + i })} flip={i === 1} />)}
        <BeanCard position={[2.4, 0, 0.8]} height={2.3} params={bean(ABU, { ...idle(t), ...(f >= a1.from && f < a1.to ? { ...talk(f, true), armR: [100, -40] } : f >= crowd ? laughing(f, 2) : { expr: "smug" }) })} />
        <Lights key1="#ffe0b0" sky="#fff0d8" ground="#8a6a4a" dir={[-5, 9, 9]} k={1.9} />
      </Stage>
      <Grade warm={0.45} blur={4} dark={title * 0.45} />
      <Onoma at={laugh} text="HO HO HO!" x={540} y={420} color="#ffe14d" size={110} dur={70} rot={-6} />
      <Onoma at={crowd + 20} text="HAHAHAHA!" x={540} y={600} color="#ffffff" size={120} dur={80} rot={5} />
      {title > 0 && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 560, textAlign: "center", opacity: title, transform: `scale(${0.85 + 0.15 * title})` }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 104, lineHeight: 1.05, color: "#ffe14d", WebkitTextStroke: "9px #241726", paintOrder: "stroke fill" }}>ABU NAWAS</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 76, lineHeight: 1.05, color: "#fff", WebkitTextStroke: "8px #241726", paintOrder: "stroke fill", marginTop: 6 }}>MENANGKAP ANGIN</div>
        </div>
      )}
      <Caps ids={["a1", "a2"]} hl={["Ampun", "buang", "angin", "takut", "lepas", "terbahak-bahak", "lolos", "akalnya"]} top={end ? 1500 : 1330} />
    </>
  );
};

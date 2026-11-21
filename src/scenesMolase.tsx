import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { P, easeInOut3, lerpN, lerpV } from "./three/objectsRig";
import { BeanCard, BeanParams, beanWalk } from "./three/objectsBean";
import { Barrel, Building, Cobble, Crate, Ground, InkBox, LampPost, Molasses, Puddle, SkyDome, Tank, Wave } from "./three/objectsMolase";
import * as K from "./three/objectsMolaseProps";
import timing from "./molase_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

type Vec3 = [number, number, number];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_M = timing.scenes as Record<"hook" | "tangki" | "rembes" | "cat" | "hangat" | "pecah" | "gelombang" | "madu" | "court" | "aturan" | "twist", number>;
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
/* cast                                                                  */
/* ------------------------------------------------------------------ */
const HENDRIK: BeanParams = { torso: "#8a5a3a", pants: "#3a3a4a", hat: "cap", hatColor: "#3b4a6b", mustache: true, apron: "#c9b27a", seed: 1 };
const MARIA: BeanParams = { torso: "#c0526a", pants: "#6a3a4a", hat: "bonnet", hatColor: "#f1e3c6", apron: "#ffffff", seed: 2 };
const BOSS: BeanParams = { torso: "#2a2a3a", pants: "#2a2a3a", hat: "bowler", hatColor: "#1c1c26", coat: true, tie: "#c93b3b", mustache: true, seed: 3 };
const KID: BeanParams = { torso: "#4a9a6a", pants: "#4a4a5a", hat: "cap", hatColor: "#c9a03b", seed: 4 };
const JUDGE: BeanParams = { torso: "#16161e", pants: "#16161e", hat: "wig", coat: true, seed: 5 };
const ENG: BeanParams = { torso: "#6a8ab8", pants: "#3a3a4a", hat: "tophat", hatColor: "#20202a", coat: true, tie: "#3b78e7", seed: 6 };
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({ bob: Math.abs(Math.sin(t * 1.6 + k)) * 2, armL: [-6 + Math.sin(t * 1.2 + k) * 3, -8], armR: [6 - Math.sin(t * 1.2 + k) * 3, -8], blink: (t * 1.0 + k * 0.7) % 2.6 < 0.13 });

const Street: React.FC<{ t: number; snow?: number; dusk?: number; wagon?: boolean }> = ({ t, snow = 0, dusk = 0, wagon = false }) => {
  const d = dusk > 0;
  const wx = ((t * 0.9 + 30) % 70) - 30;
  return (
    <group>
      <Ground color={d ? "#6e607a" : "#9a9cb3"} />
      <Cobble w={9} z={0.5} len={120} a={d ? "#8a7a96" : "#9b9db8"} b="#3d3a52" />
      <InkBox pos={[0, 0.12, -5.1]} size={[120, 0.24, 2.2]} color="#c9c0b6" ink={0.05} />
      <InkBox pos={[0, 0.12, 5.9]} size={[120, 0.24, 1.6]} color="#c9c0b6" ink={0.05} />
      {/* back row: tenements, firehouse, warehouse */}
      <K.Tenement pos={[-28, 0, -8.6]} seed={3} base="#b5573f" />
      <K.Tenement pos={[-22, 0, -8.6]} seed={5} base="#c9a066" shop={false} />
      <K.Firehouse pos={[-14, 0, -9.2]} />
      <K.Tenement pos={[-6, 0, -8.6]} seed={8} base="#9c4a38" />
      <K.Warehouse pos={[2.6, 0, -9.2]} />
      <K.Tenement pos={[11, 0, -9.2]} seed={12} base="#c47f50" shop={false} />
      <K.Warehouse pos={[19.4, 0, -9.2]} />
      <K.Tenement pos={[27, 0, -8.6]} seed={14} base="#b5573f" />
      {/* the elevated railway along the street */}
      <K.ElevatedRail pos={[-4, 0, -6.2]} len={34} />
      <K.ElevatedRail pos={[30, 0, -6.2]} len={30} />
      {/* street furniture */}
      {[-18, -8, 2, 20, 28].map((x) => <K.GasLamp key={x} pos={[x, 0.24, -4.3]} lit={d} />)}
      {[-12, 6, 24].map((x) => <K.Hydrant key={x} pos={[x, 0.24, -4.0]} />)}
      <K.NewsStand pos={[-9.5, 0.24, -4.4]} />
      <K.Bench pos={[-1.6, 0.24, -4.3]} />
      <K.Mailbox pos={[3.6, 0.24, -4.1]} />
      <K.TrashCan pos={[-20.5, 0.24, -4.0]} />
      <K.Bicycle pos={[-15.5, 0.24, -4.0]} />
      <K.BarrelStack pos={[-1.4, 0.24, -4.6]} />
      <K.CrateStack pos={[5.2, 0.24, -4.6]} />
      <K.Sacks pos={[14.4, 0.24, -4.4]} />
      <K.BarrelStack pos={[17.6, 0.24, -4.6]} />
      <K.TankSite pos={TANK} r={1.9} />
      {/* the harbour to the right of the tank */}
      <mesh position={[40, -0.04, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={d ? "#7a8ac0" : "#4a8fc8"} roughness={0.4} />
      </mesh>
      <K.Pier pos={[27, 0, 6]} len={9} />
      <K.Steamer pos={[36, 0, 10]} t={t} />
      <K.Crane pos={[24, 0.3, 4.2]} />
      {[22.5, 25, 27.5].map((x) => <K.Bollard key={x} pos={[x, 0.3, 8]} />)}
      <K.IronFence pos={[22, 0.24, 5.3]} len={5} />
      <K.Streetcar pos={[-26, 0.24, 1.8]} />
      {wagon && <K.Wagon pos={[wx, 0.1, -1.7]} t={t} load={wx > 10 ? "sacks" : "barrels"} />}
      {snow > 0 && [...Array(18)].map((_, i) => <K.SnowPatch key={i} pos={[-20 + i * 2.5, 0.04, -3.2 + (i % 4) * 2.4]} s={1.1 * snow} />)}
    </group>
  );
};
const PierSet: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 40]}>
      <planeGeometry args={[220, 70]} />
      <meshStandardMaterial color="#4a7fb0" roughness={0.5} />
    </mesh>
    {[...Array(6)].map((_, i) => <mesh key={i} position={[-24 + i * 9 + Math.sin(t + i) * 0.5, 0.0, 14 + (i % 3) * 5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 0.1]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.5} /></mesh>)}
  </group>
);

const TANK: Vec3 = [11, 0, -3.5];
const SKY_DAY = { top: "#4a86d6", hor: "#cfe3f7" };

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneMHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shock = EV("hook.shock");
  const wave = EV("hook.wave");
  const dur = DURATIONS_M.hook;
  const wf = lerpN(22, -2, easeInOut3(cl((f - 4) / (dur - 4))));
  const cam = shotCam(f, [{ to: 9999, p0: [-17, 1.3, 2.2], l0: [0, 2.4, 0.4], p1: [-18.5, 1.6, 2.0], l1: [-1, 2.6, 0.4], fov: 40, roll0: -3, roll1: -4, creep: 0.0008 }]);
  const run = cl((f - shock) / 60);
  return (
    <>
      <Stage cam={cam} shake={kick(f, [wave, wave + 14], 0.08)} bg={SKY_DAY.hor} fog={["#e4c8b8", 40, 150]}>
        <SkyDome top={SKY_DAY.top} horizon="#f6d9b8" />
        <PierSet t={t} />
        <Street t={t} />
        <Tank pos={TANK} paint={1} t={t} leak={0} burst={1} />
        <Puddle x0={wf} x1={TANK[0]} z={0.5} width={9} h={0.35} t={t} />
        <Wave front={wf} z={0.5} width={9} h={4.6} t={t} />
        <BeanCard position={[-5.6 - run * 3.2, 0, 1.4]} height={2.1} params={bean(HENDRIK, { ...(f < shock ? idle(t) : beanWalk(f * 0.05, 1.3)), expr: f < shock ? "talk" : "shock", look: 0, sweat: f >= shock })} />
        <BeanCard position={[-4.2 - run * 3.6, 0, -0.4]} height={2.0} params={bean(MARIA, { ...(f < shock ? idle(t, 1) : beanWalk(f * 0.05 + 0.3, 1.3)), expr: f < shock ? "neutral" : "scared", look: 0 })} />
        <BeanCard position={[-7.8 - run * 3.4, 0, 0.9]} height={1.4} params={bean(KID, { ...(f < shock ? idle(t, 2) : beanWalk(f * 0.06 + 0.6, 1.4)), expr: f < shock ? "happy" : "shock" })} />
        <Lights key1="#ffb877" dir={[-8, 6, 8]} k={2.4} />
      </Stage>
      <Grade warm={0.5} blur={4} />
      <Tag label="BOSTON · 1919" to={90} color="#ffb703" />
      <Caps ids={["h1"]} hl={["gelombang", "sirup", "setinggi", "dua", "lantai"]} />
    </>
  );
};

/* ================================================================== */
/* 2. TANGKI                                                            */
/* ================================================================== */
export const SceneMTangki: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const show = EV("tangki.show");
  const hen = EV("tangki.hendrik");
  const leak = EV("tangki.leak");
  const cam = shotCam(f, [
    { to: hen, p0: [-1, 1.8, 16], l0: [7, 2.6, -3], p1: [3, 2.0, 16], l1: [9, 2.6, -3], fov: 40, roll0: -2, roll1: 0 },
    { to: 9999, p0: [5.0, 1.4, 9.6], l0: [8.6, 1.9, 0.5], p1: [6.2, 1.5, 8.6], l1: [8.9, 1.9, 0.4], fov: 36 },
  ]);
  return (
    <>
      <Stage cam={cam} bg={SKY_DAY.hor} fog={["#d6dcec", 30, 130]}>
        <SkyDome top={SKY_DAY.top} horizon={SKY_DAY.hor} />
        <PierSet t={t} />
        <Street t={t} snow={0.8} />
        <Tank pos={TANK} t={t} leak={f >= leak - 20 ? 1 : 0.6} />
        {[...Array(5)].map((_, i) => <Barrel key={i} pos={[2.5 + i * 0.9, 0, -2.3]} />)}
        <Crate pos={[4.8, 0.4, -1.6]} />
        <BeanCard position={[8.0, 0, 1.2]} height={2.0} params={bean(HENDRIK, { ...idle(t), expr: f >= hen ? "talk" : "neutral", mouthOpen: Math.abs(Math.sin(f * 0.5)), look: -0.5 })} />
        <BeanCard position={[1.0, 0, 1.4]} height={1.9} params={bean(MARIA, { ...beanWalk(f * 0.025, 0.6), expr: "happy" })} flip />
        <Lights key1="#ffe6b8" dir={[-8, 9, 10]} />
      </Stage>
      <Grade warm={0.25} blur={5} />
      <Chip from={show} to={show + 70} top={430}>2.000.000+ GALON</Chip>
      <Caps ids={["t1", "t2"]} hl={["Boston", "raksasa", "dua", "juta", "galon", "Hendrik", "setiap", "merembes"]} />
    </>
  );
};

/* ================================================================== */
/* 3. REMBES                                                            */
/* ================================================================== */
export const SceneMRembes: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const say = EV("rembes.say");
  const stick = EV("rembes.stick");
  const cam = shotCam(f, [{ to: stick, p0: [5.4, 1.4, 9.6], l0: [8.0, 1.6, 0], p1: [6.2, 1.5, 8.6], l1: [8.2, 1.6, 0], fov: 36 }, { to: 9999, p0: [5.8, 0.9, 7.2], l0: [7.0, 1.0, 1.4], p1: [6.2, 1.0, 6.6], l1: [7.1, 1.0, 1.4], fov: 36, roll0: 3, roll1: 4 }]);
  const lift = smoother(cl((f - stick) / 18));
  return (
    <>
      <Stage cam={cam} bg={SKY_DAY.hor} fog={["#d6dcec", 30, 130]}>
        <SkyDome top={SKY_DAY.top} horizon={SKY_DAY.hor} />
        <Street t={t} snow={0.6} />
        <Tank pos={TANK} t={t} leak={1} />
        <Puddle x0={6.0} x1={9.8} z={1.6} width={2.4} h={0.08} t={t} />
        <BeanCard position={[9.2, 0, 1.8]} height={2.0} params={bean(HENDRIK, { ...idle(t), expr: f >= say ? "smug" : "neutral", armR: [f >= say ? 70 : 6, -30] })} flip />
        <BeanCard position={[7.0, 0, 1.9]} height={1.9} params={bean(MARIA, { ...idle(t, 1), expr: f >= stick ? "shock" : "worried", legR: [lift * 38, lift * 52], goo: 0.06, look: 0.5 })} />
        {f >= stick && <mesh position={[7.12, 0.14 + lift * 0.18, 1.95]} scale={[0.05, 0.28 + lift * 0.3, 0.05]}><cylinderGeometry args={[1, 1, 1, 6]} /><meshBasicMaterial color="#4a2410" /></mesh>}
        <Lights key1="#ffe6b8" dir={[-6, 9, 10]} />
      </Stage>
      <Grade warm={0.25} blur={6} />
      <Bubble x={720} y={560} w={400} text="CUMA REMBES SEDIKIT" size={38} from={say} to={stick - 4} />
      <Bubble x={330} y={640} w={380} text="SEPATUKU LENGKET!" size={40} from={stick} to={stick + 90} />
      <Caps ids={["r1", "r2"]} hl={["Tenang", "sedikit", "sepatuku", "lengket"]} />
    </>
  );
};

/* ================================================================== */
/* 4. CAT                                                               */
/* ================================================================== */
export const SceneMCat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const paint = EV("cat.paint");
  const done = EV("cat.done");
  const line = EV("cat.line");
  const k = cl((f - paint) / (done - paint + 20));
  const strokes = Math.sin(f * 0.5) * 18;
  const cam = shotCam(f, [{ to: done, p0: [5.0, 1.5, 10.0], l0: [8.8, 2.0, -0.5], p1: [6.4, 1.6, 9.2], l1: [9.0, 2.1, -0.5], fov: 36 }, { to: 9999, p0: [6.0, 1.0, 7.2], l0: [8.2, 1.5, 0.8], p1: [6.6, 1.1, 6.6], l1: [8.4, 1.5, 0.8], fov: 36, roll0: -3, roll1: -4 }]);
  return (
    <>
      <Stage cam={cam} bg={SKY_DAY.hor} fog={["#d6dcec", 30, 130]}>
        <SkyDome top={SKY_DAY.top} horizon={SKY_DAY.hor} />
        <Street t={t} snow={0.5} />
        <Tank pos={TANK} t={t} leak={1} paint={k} />
        <BeanCard position={[9.0, 0, 1.0]} height={2.0} params={bean(BOSS, { ...idle(t), expr: f >= done ? "smug" : "neutral", prop: "brush", armR: f >= paint && f < done ? [100 + strokes, -20] : [30, -20], look: -0.6 })} flip />
        <BeanCard position={[7.0, 0, 1.6]} height={1.8} params={bean(HENDRIK, { ...idle(t, 1), expr: f >= paint ? "worried" : "neutral", look: 0.5, sweat: f >= line })} />
        <Lights key1="#ffe6b8" dir={[-6, 9, 10]} />
      </Stage>
      <Grade warm={0.25} blur={5} />
      <Bubble x={560} y={540} w={640} text="TIDAK KELIHATAN, TIDAK BOCOR" size={38} from={line} to={line + 100} />
      <Caps ids={["c1", "c2"]} hl={["solusi", "cerdas", "cokelat", "Beres", "tidak", "bocor"]} />
    </>
  );
};

/* ================================================================== */
/* 5. HANGAT                                                            */
/* ================================================================== */
export const SceneMHangat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cold = EV("hangat.cold");
  const warm = EV("hangat.warm");
  const deg = EV("hangat.deg");
  const creak = EV("hangat.creak");
  const crack = EV("hangat.crack");
  const heat = smoother(cl((f - warm) / (deg - warm + 10)));
  const snow = 0.9 * (1 - heat);
  const cam = shotCam(f, [{ to: creak, p0: [-2, 2.2, 15], l0: [6, 2.8, -2], p1: [2, 2.0, 15], l1: [8.5, 2.8, -2], fov: 40 }, { to: 9999, p0: [6.0, 1.0, 9.6], l0: [9.6, 2.8, -1], p1: [7.0, 0.9, 8.4], l1: [10.0, 3.2, -1], fov: 40, roll0: 0, roll1: -5, creep: 0.002 }]);
  const shake = f >= creak ? Math.min(1, (f - creak) / 40) * 1.0 : 0;
  const popA = f >= crack - 6 ? cl((f - crack + 6) / 20) : 0;
  const sunT = lerpN(0.0, 1, heat);
  const sky = heat > 0.5 ? "#86c0f0" : "#7e9cc8";
  return (
    <>
      <Stage cam={cam} shake={kick(f, f >= creak ? [creak + 6, creak + 22, creak + 38, crack] : [], 0.05)} bg={sky} fog={["#e8d8c8", 30, 130]}>
        <SkyDome top={heat > 0.5 ? "#5a9ae0" : "#6a88c0"} horizon={heat > 0.5 ? "#ffe2b0" : "#cfd8e8"} />
        <Street t={t} snow={snow} />
        <Tank pos={TANK} t={t} leak={1} paint={1} shake={shake} />
        {popA > 0 && [...Array(6)].map((_, i) => <mesh key={i} position={[TANK[0] - 1.8 + popA * (i - 2) * 0.5, 1.2 + (i % 3) * 0.9 + popA * 1.0, TANK[2] + 1.9 + popA * 1.0]} rotation={[popA * 6, popA * 5, 0]}><boxGeometry args={[0.16, 0.16, 0.16]} /><meshBasicMaterial color="#3a3a44" /></mesh>)}
        {/* sun glowing as it warms */}
        <mesh position={[-6, 14, -40]}>
          <sphereGeometry args={[3 + sunT * 2.2, 20, 14]} />
          <meshBasicMaterial color={heat > 0.5 ? "#ffd27a" : "#e8eef8"} />
        </mesh>
        <BeanCard position={[7.2, 0, 1.4]} height={2.0} params={bean(HENDRIK, { ...idle(t), expr: f >= creak ? "worried" : "neutral", look: 1, sweat: heat > 0.7 })} />
        <Lights key1={heat > 0.4 ? "#ffd09a" : "#e8eeff"} sky={heat > 0.4 ? "#ffd8b0" : "#9fb8ff"} dir={[-6, 9, 10]} />
      </Stage>
      <Grade warm={heat * 0.8} cool={0.5 * (1 - heat)} blur={5} />
      {f >= cold && (
        <div style={{ position: "absolute", left: 70, top: 300, width: 190, height: 640, opacity: cl((f - cold) / 10), transform: `translateX(${(1 - cl((f - cold) / 12)) * -80}px)` }}>
          <div style={{ position: "absolute", left: 60, top: 0, width: 66, height: 560, background: "#fff", border: "7px solid #241726", borderRadius: 40 }}>
            <div style={{ position: "absolute", left: 14, bottom: 8, width: 26, height: 40 + heat * 440, background: heat > 0.5 ? "#e8432e" : "#4a8fe8", borderRadius: 14, transition: "none" }} />
          </div>
          <div style={{ position: "absolute", left: 20, bottom: -60, width: 150, height: 150, borderRadius: 80, background: heat > 0.5 ? "#e8432e" : "#4a8fe8", border: "7px solid #241726" }} />
          <div style={{ position: "absolute", left: 140, top: -10, fontFamily: "Anton, Impact, sans-serif", fontSize: 72, color: "#fff", WebkitTextStroke: "8px #241726", paintOrder: "stroke fill", whiteSpace: "nowrap" }}>{f >= deg ? "4°C" : heat > 0.1 ? "NAIK!" : "BEKU"}</div>
        </div>
      )}
      <Caps ids={["w1", "w2"]} hl={["tiba-tiba", "hangat", "empat", "derajat", "membeku", "berderit", "Tunggu", "retak"]} />
    </>
  );
};

/* ================================================================== */
/* 6. PECAH                                                             */
/* ================================================================== */
export const SceneMPecah: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const snap = EV("pecah.snap");
  const b = cl((f - snap) / 10);
  const fl = f >= snap ? interpolate(f, [snap, snap + 3, snap + 16], [0, 1, 0], clamp) : 0;
  const cam = shotCam(f, [{ to: snap, p0: [6.0, 1.0, 9.6], l0: [10.2, 2.8, -1.5], fov: 40, roll0: -5, roll1: -5, creep: 0.004 }, { to: 9999, p0: [4.0, 1.4, 11], l0: [9.6, 2.4, -1], p1: [1.0, 1.2, 12], l1: [8.0, 2.2, -1], fov: 44, roll0: 6, roll1: 3 }]);
  return (
    <>
      <Stage cam={cam} shake={kick(f, [snap, snap + 3, snap + 6, snap + 10], 0.35)} bg="#f2b987" fog={["#f0c8a0", 30, 120]}>
        <SkyDome top="#5a8ee0" horizon="#ffd0a0" />
        <Street t={t} snow={0} />
        <Tank pos={TANK} t={t} leak={0} paint={1} shake={f < snap ? 1 : 0} burst={f >= snap ? Math.min(1, b + 0.2) : 0} />
        {f >= snap && [...Array(7)].map((_, i) => <mesh key={i} position={[TANK[0] - 1 - b * (3 + i) , 1.2 + (i % 3) * 0.9 + b * 2.0 - b * b * 0.8, TANK[2] + (i - 3) * 0.7 + b * 3]} rotation={[b * 7 + i, b * 5, i]}><boxGeometry args={[1.2, 0.08, 0.7]} /><meshBasicMaterial color="#4a4a58" /></mesh>)}
        {f >= snap && <Wave front={TANK[0] - 4 - b * 14} z={-1} width={9} h={2 + b * 3} t={t} />}
        <BeanCard position={[7.4, 0, 1.4]} height={2.0} params={bean(HENDRIK, { ...idle(t), expr: f >= snap ? "shock" : "worried", sweat: true, look: 1 })} />
        <Lights key1="#ffb06a" dir={[8, 6, 10]} k={2.4} />
      </Stage>
      <Grade warm={0.7} blur={5} flash={fl} />
      <Caps ids={["p1"]} hl={["sekejap", "pecah"]} />
    </>
  );
};

/* ================================================================== */
/* 7. GELOMBANG                                                         */
/* ================================================================== */
export const SceneMGelombang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const rush = EV("gelombang.rush");
  const speed = EV("gelombang.speed");
  const sweep = EV("gelombang.sweep");
  const sad = EV("gelombang.sad");
  const wf = f < sad ? lerpN(12, -15, easeInOut3(cl((f - rush + 6) / (sad - rush + 6)))) : -15 - (f - sad) * 0.012;
  const settle = cl((f - sad) / 60);
  const cast: [BeanParams, number, number, number][] = [
    [HENDRIK, -2.0, 1.2, 2.0],
    [MARIA, -4.0, 0.4, 1.9],
    [KID, -6.2, 1.7, 1.3],
    [BOSS, -9.0, 0.9, 2.0],
  ];
  const cam = f < sad
    ? { pos: [wf + 8, 1.6, 13] as Vec3, look: [wf - 3.0, 2.0, 0] as Vec3, fov: 38, roll: lerpN(-2, -6, cl((f - speed) / 40)) }
    : shotCam(f - sad, [{ to: 9999, p0: [-17, 2.2, 11], l0: [-19, 1.2, 0], p1: [-12, 5.5, 18], l1: [-14, 0.8, 0], fov: 38, roll0: 0, roll1: 0, creep: 0.0004 }]);
  return (
    <>
      <Stage cam={cam} shake={f < sad ? kick(f, [rush, rush + 20, rush + 40, speed, speed + 18, sweep], 0.06) : [0, 0, 0]} bg="#f2b987" fog={["#e8b890", 30, 120]}>
        <SkyDome top={f < sad ? "#5a8ee0" : "#4a6aa0"} horizon={f < sad ? "#ffc890" : "#c8b0c0"} />
        <PierSet t={t} />
        <Street t={t} wagon={false} />
        <Puddle x0={wf} x1={TANK[0] - 3} z={0.5} width={9} h={0.32 + settle * 0.05} t={t} />
        <Wave front={wf} z={0.5} width={9} h={f < sad ? 4.4 : Math.max(0.2, 4.4 * (1 - settle * 0.95))} t={t} />
        {f < sad
          ? cast.map(([p, x0, z, h], i) => {
              const run = x0 - cl((f - rush + 10) / 40) * 1.0 * (i + 1) * 3.2;
              const caught = wf <= run + 1.2;
              const x = caught ? wf + 1.4 + i * 0.5 : run;
              return (
                <BeanCard key={i} position={[x, caught ? 0.25 + Math.sin(f * 0.15 + i) * 0.1 : 0, z]} height={h} flip roll={caught ? 0.5 + i * 0.3 : 0} params={bean(p, { ...(caught ? idle(t, i) : beanWalk(f * 0.06 + i * 0.3, 1.4)), expr: caught ? "scared" : "shock", sweat: !caught, goo: caught ? 0.55 : 0, look: 1 })} />
              );
            })
          : null}
        {[0, 1, 2, 3, 4].map((i) => <Crate key={i} pos={[wf + 2 + i * 1.6, 0.35 + Math.sin(f * 0.12 + i) * 0.12, -1.6 + (i % 2) * 2.6]} rot={[f * 0.02 * (i + 1), 0.4 * i, f * 0.015]} />)}
        {f < sad && <K.Wagon pos={[wf + 4.5, 0.4 + Math.sin(f * 0.1) * 0.1, -2.2]} t={t} load="barrels" />}
        {[0, 1, 2].map((i) => <Barrel key={i} pos={[wf + 6 + i * 1.8, 0.3 + Math.abs(Math.sin(f * 0.1 + i)) * 0.3, 2.6 - i * 1.4]} />)}
        <Lights key1={f < sad ? "#ffb06a" : "#9ab0e0"} sky={f < sad ? "#ffd8b0" : "#8aa0d0"} dir={[8, 6, 10]} k={f < sad ? 2.4 : 1.4} />
      </Stage>
      <Grade warm={f < sad ? 0.7 : 0} cool={f < sad ? 0 : 0.8} blur={5} dark={f < sad ? 0 : 0.18 * settle} />
      <Chip from={speed - 8} to={speed + 60} top={430}>7 METER · 56 KM/JAM</Chip>
      {f >= sad && (
        <div style={{ position: "absolute", left: 80, right: 80, top: 480, textAlign: "center", opacity: cl((f - sad) / 20) }}>
          <div style={{ display: "inline-block", background: "rgba(16,18,34,0.9)", border: "5px solid #8a95c8", borderRadius: 26, padding: "18px 34px", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 54, color: "#e8ecff", lineHeight: 1.25 }}>
            21 meninggal<br />150 terluka
          </div>
        </div>
      )}
      <Caps ids={["g1", "g2"]} hl={["tujuh", "meter", "lima", "puluh", "enam", "menyapu", "Dua", "satu", "meninggal", "terluka"]} color={f < sad ? "#ffd23f" : "#cdd6ff"} />
    </>
  );
};

/* ================================================================== */
/* 8. MADU (penjelasan)                                                 */
/* ================================================================== */
const Jar: React.FC<{ pos: Vec3; tilt?: number }> = ({ pos, tilt = 0 }) => (
  <group position={pos} rotation={[0, 0, tilt]}>
    <P geo={() => <cylinderGeometry args={[0.32, 0.34, 0.7, 14]} />} color="#e8a020" pos={[0, 0.35, 0]} hull={0.07} />
    <P geo={() => <cylinderGeometry args={[0.3, 0.3, 0.12, 14]} />} color="#8a5a2b" pos={[0, 0.76, 0]} hull={0.1} />
  </group>
);
const Drip: React.FC<{ x: number; y: number; z: number; t: number; speed: number; len: number }> = ({ x, y, z, t, speed, len }) => {
  const ph = (t * speed) % 1;
  const strand = len * Math.min(1, ph * 1.4);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, -strand / 2, 0]} scale={[0.07, Math.max(0.01, strand), 0.07]}>
        <cylinderGeometry args={[1, 0.6, 1, 8]} />
        <meshStandardMaterial color="#e8a020" roughness={0.2} />
      </mesh>
      <mesh position={[0, -strand - 0.06 - Math.max(0, ph - 0.7) * len * 2, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#e8a020" roughness={0.2} />
      </mesh>
    </group>
  );
};
const TileWall: React.FC<{ z: number; w?: number }> = ({ z, w = 24 }) => (
  <group>
    <mesh position={[0, 3, z]}><planeGeometry args={[w, 8]} /><meshStandardMaterial color="#f3ecd6" /></mesh>
    <mesh position={[0, 1.15, z + 0.01]}><planeGeometry args={[w, 2.3]} /><meshBasicMaterial color="#9fd0cf" /></mesh>
    {[...Array(Math.round(w / 0.8))].map((_, i) => <mesh key={i} position={[-w / 2 + 0.4 + i * 0.8, 1.15, z + 0.02]}><planeGeometry args={[0.02, 2.3]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
    {[0.6, 1.2, 1.8].map((y) => <mesh key={y} position={[0, y, z + 0.02]}><planeGeometry args={[w, 0.02]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
  </group>
);
export const SceneMMadu: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const fridge = EV("madu.fridge");
  const slow = EV("madu.slow");
  const warm = EV("madu.warm");
  const fast = EV("madu.fast");
  const thin = EV("madu.thin");
  const cam = shotCam(f, [
    { to: warm - 10, p0: [-2.0, 1.7, 11], l0: [-2.2, 1.5, 0], p1: [-1.8, 1.7, 10], l1: [-2.1, 1.5, 0], fov: 36 },
    { to: thin, p0: [1.8, 1.7, 11], l0: [1.8, 1.4, 0], p1: [1.6, 1.7, 10], l1: [1.7, 1.4, 0], fov: 36 },
    { to: 9999, p0: [0, 2.3, 15], l0: [0, 1.7, 0], p1: [0, 2.4, 16], l1: [0, 1.7, 0], fov: 40 },
  ]);
  const open = smoother(cl((f - fridge + 20) / 16));
  return (
    <>
      <Stage cam={cam} bg="#cfd8ee">
        <TileWall z={-2.4} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <meshStandardMaterial color="#c89a68" roughness={0.9} />
        </mesh>
        {[...Array(14)].map((_, i) => <mesh key={i} position={[-8 + i * 1.2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.03, 30]} /><meshBasicMaterial color="#8a5a2b" /></mesh>)}
        <K.Rug pos={[0, 0, 1.4]} w={5} d={2.6} color="#c0526a" />
        {/* cold side */}
        <K.Fridge pos={[-2.9, 0, -1.2]} open={open} />
        <K.WallClock pos={[-1.0, 3.5, -2.3]} r={0.4} />
        <K.Cabinet pos={[-5.4, 0, -2.0]} />
        {/* window + shelves */}
        <K.Window pos={[0.4, 2.4, -2.3]} w={1.8} h={1.4} />
        <K.JarShelf pos={[2.7, 3.2, -2.0]} />
        <K.Pot pos={[2.2, 1.1, -1.4]} />
        {/* warm side */}
        <K.Stove pos={[2.7, 0, -1.3]} hot={f >= warm} />
        <K.Cabinet pos={[5.5, 0, -2.0]} />
        {[2.0, 3.0, 4.0].map((x, i) => <K.Pot key={i} pos={[x, 2.9 + (i % 2) * 0.3, -2.25]} />)}
        {/* table + plant */}
        <K.KitchenTable pos={[-0.2, 0, -0.6]} />
        <K.Chair pos={[-1.2, 0, 0.4]} rot={Math.PI} />
        <K.Chair pos={[0.8, 0, 0.4]} rot={Math.PI} />
        <K.Plant pos={[-5.4, 0, 0.2]} />
        <K.Plant pos={[4.7, 0, 0.6]} />
        {/* jars */}
        <Jar pos={[-2.9, 1.43, -0.5]} tilt={0} />
        <Drip x={-2.9} y={1.43} z={-0.5} t={t} speed={0.06} len={0.4} />
        <Jar pos={[2.4, 1.18, -0.9]} tilt={0.9} />
        <Drip x={2.15} y={1.26} z={-0.9} t={t} speed={f >= fast ? 2.6 : 0.5} len={0.9} />
        <BeanCard position={[0.2, 0, 1.8]} height={1.5} params={bean(KID, { ...idle(t), expr: f < warm ? "sleepy" : f >= fast ? "happy" : "neutral", look: f < warm ? -1 : 1 })} />
        <hemisphereLight args={["#e8eeff", "#8a7a8a", 1.4]} />
        <directionalLight position={[2, 8, 8]} intensity={1.4} color="#fff0d8" castShadow />
        <pointLight position={[-2.9, 2.6, 1.0]} intensity={30} color="#6aa8ff" distance={8} />
        <pointLight position={[2.7, 2.4, 1.0]} intensity={f >= warm ? 36 : 8} color="#ff9a4a" distance={8} />
      </Stage>
      <Grade warm={f >= warm ? 0.5 : 0} cool={f < warm ? 0.7 : 0.1} blur={5} />
      <Chip from={slow} to={warm - 6} top={430} color="#3b78e7">DINGIN = LAMBAT</Chip>
      <Chip from={fast} to={thin - 10} top={430} color="#e8590c">HANGAT = DERAS</Chip>
      <Chip from={thin} to={thin + 150} top={430}>DINDING TERLALU TIPIS</Chip>
      <Caps ids={["m1", "m2", "m3"]} hl={["begini", "madu", "kulkas", "kental", "lambat", "hangat", "mengalir", "deras", "Molase", "ikut", "berperan", "utamanya", "tipis"]} />
    </>
  );
};

/* ================================================================== */
/* 9. COURT                                                             */
/* ================================================================== */
const Pew: React.FC<{ pos: Vec3; color: string }> = ({ pos, color }) => (
  <group position={pos}>
    <P geo={() => <sphereGeometry args={[0.26, 10, 8]} />} color="#f7ead6" pos={[0, 1.05, 0]} hull={0.1} />
    <P geo={() => <capsuleGeometry args={[0.24, 0.35, 4, 8]} />} color={color} pos={[0, 0.6, 0]} hull={0.1} />
  </group>
);
export const SceneMCourt: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shout = EV("court.shout");
  const gavel = EV("court.gavel");
  const guilty = EV("court.guilty");
  const cam = shotCam(f, [
    { to: shout + 24, p0: [-2.4, 2.0, 11], l0: [-2.4, 2.0, 0], p1: [-2.4, 2.1, 10], l1: [-2.4, 2.0, 0], fov: 36 },
    { to: gavel + 30, p0: [2.2, 2.6, 12], l0: [2.2, 3.0, -1.6], p1: [2.2, 2.6, 11], l1: [2.2, 3.0, -1.6], fov: 36, roll0: 3, roll1: 0 },
    { to: 9999, p0: [0, 3.2, 17], l0: [0, 2.0, 0], p1: [0, 3.4, 19], l1: [0, 2.0, 0], fov: 40 },
  ]);
  const hit = f >= gavel && f < gavel + 10 ? 1 : f >= guilty && f < guilty + 10 ? 1 : 0;
  const stamp = spring({ frame: f - guilty, fps: 30, config: { damping: 8, stiffness: 220 } });
  const cols = ["#c0526a", "#6b84b8", "#4a9a6a", "#c9a03b", "#8a6ab8", "#e0805a"];
  return (
    <>
      <Stage cam={cam} bg="#6a4a3a">
        {/* hall */}
        <mesh position={[0, 4, -4.6]}><planeGeometry args={[40, 11]} /><meshStandardMaterial color="#d9c49a" /></mesh>
        <mesh position={[0, 1.2, -4.55]}><planeGeometry args={[40, 2.4]} /><meshStandardMaterial color="#7a4a2a" /></mesh>
        {[-9, -6, -3, 0, 3, 6, 9].map((x) => <K.Window key={x} pos={[x, 5.2, -4.5]} w={1.4} h={2.6} curtain="#8a1a1a" />)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#6a3f24" roughness={0.9} /></mesh>
        <mesh position={[0, 0.02, 4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.2, 18]} /><meshBasicMaterial color="#7a1a1a" /></mesh>
        <K.WallClock pos={[0, 7.2, -4.4]} r={0.6} />
        <K.Bookshelf pos={[-7.6, 0, -4.2]} />
        <K.Bookshelf pos={[7.6, 0, -4.2]} />
        <K.FlagStand pos={[0.6, 0, -3.2]} />
        <K.FlagStand pos={[5.2, 0, -3.2]} />
        <K.Chandelier pos={[-2.5, 7.0, -1]} />
        <K.Chandelier pos={[3.5, 7.0, -1]} />
        {/* bench, witness, jury */}
        <K.JudgeBench pos={[2.2, 0, -2.2]} />
        <K.WitnessStand pos={[-0.9, 0, -1.8]} />
        <group position={[-7.4, 0, 0.2]} rotation={[0, Math.PI / 2, 0]}><K.JuryBox /></group>
        <K.Scales pos={[5.6, 1.85, -2.4]} />
        {/* lawyers + bar rail + gallery */}
        <K.Lawyers pos={[-2.6, 0, 1.0]} />
        <K.Lawyers pos={[2.8, 0, 1.0]} />
        <K.BarRail pos={[0, 0, 3.0]} len={14} />
        <K.Pews pos={[-2.6, 0, 6.0]} rows={4} />
        {[0, 1, 2, 3].map((r) => [...Array(7)].map((_, i) => <Pew key={`${r}-${i}`} pos={[-4.6 + i * 0.76 + (r % 2) * 0.3, 0, 6.2 + r * 1.4]} color={cols[(i + r) % cols.length]} />))}
        <BeanCard position={[2.2, 1.9, -2.2]} height={1.9} params={bean(JUDGE, { ...idle(t), expr: f >= guilty ? "angry" : "neutral", prop: "gavel", armR: hit ? [120, -30] : [60, -30] })} />
        <BeanCard position={[-2.6, 0, 0.0]} height={2.0} params={bean(BOSS, { ...idle(t, 1), expr: f >= shout && f < gavel ? "angry" : f >= gavel ? "sad" : "smug", sweat: f >= gavel, armR: f >= shout && f < gavel ? [140 + Math.sin(f) * 10, -10] : [6, -8], look: 0.5 })} flip />
        <Lights key1="#ffd9a0" sky="#d8c0a0" ground="#6a4a3a" dir={[-6, 8, 10]} k={1.8} />
      </Stage>
      <Grade warm={0.4} blur={5} />
      <Bubble x={300} y={500} w={420} text="PASTI SABOTASE!" size={52} from={shout} to={shout + 70} />
      <Chip from={guilty - 70} to={guilty + 40} top={430}>6 TAHUN · 3.000 SAKSI</Chip>
      {f >= guilty && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", transform: `rotate(-8deg) scale(${0.5 + 0.5 * stamp})`, opacity: Math.min(1, stamp * 1.6) }}>
          <span style={{ display: "inline-block", border: "12px solid #c93b3b", color: "#c93b3b", fontFamily: "Anton, Impact, sans-serif", fontSize: 140, padding: "6px 34px", borderRadius: 16, background: "rgba(255,248,235,0.9)", letterSpacing: 6 }}>BERSALAH</span>
        </div>
      )}
      <Caps ids={["k1", "k2", "k3"]} hl={["menyalahkan", "anarkis", "bom", "Pasti", "sabotase", "tidak", "percaya", "enam", "tiga", "ribu", "bersalah"]} />
    </>
  );
};

/* ================================================================== */
/* 10. ATURAN                                                           */
/* ================================================================== */
export const SceneMAturan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const sign = EV("aturan.sign");
  const stamp = EV("aturan.stamp");
  const cam = shotCam(f, [{ to: 9999, p0: [-0.2, 2.4, 10.0], l0: [-0.2, 1.7, 1.0], p1: [-0.4, 2.2, 9.0], l1: [-0.3, 1.7, 1.0], fov: 36, roll0: 3, roll1: 0 }]);
  const st = spring({ frame: f - stamp, fps: 30, config: { damping: 8, stiffness: 240 } });
  const kick1 = f >= stamp ? kick(f, [stamp], 0.1) : ([0, 0, 0] as Vec3);
  return (
    <>
      <Stage cam={cam} shake={kick1} bg="#cdbd9a">
        <mesh position={[0, 3.2, -3.2]}><planeGeometry args={[40, 10]} /><meshStandardMaterial color="#e9dcc0" /></mesh>
        <mesh position={[0, 1.0, -3.15]}><planeGeometry args={[40, 2.0]} /><meshStandardMaterial color="#8a6a40" /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#a8794a" roughness={0.9} /></mesh>
        {[...Array(16)].map((_, i) => <mesh key={i} position={[-9 + i * 1.2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.03, 30]} /><meshBasicMaterial color="#6a4a2a" /></mesh>)}
        <K.Window pos={[-4.2, 3.6, -3.1]} w={1.8} h={2.2} curtain="#2a5aa8" />
        <K.Window pos={[4.2, 3.6, -3.1]} w={1.8} h={2.2} curtain="#2a5aa8" />
        <K.WallMap pos={[-0.2, 4.4, -3.1]} />
        <K.WallClock pos={[2.0, 5.2, -3.1]} r={0.4} />
        <K.BlueprintRack pos={[6.4, 0, -2.6]} />
        <K.FilingCabinet pos={[8.2, 0, -2.6]} />
        <K.FilingCabinet pos={[-8.2, 0, -2.6]} />
        <K.CoatStand pos={[-6.4, 0, -2.4]} />
        <K.Desk pos={[-5.6, 0, 0.6]} />
        <K.Telephone pos={[-5.0, 1.0, 0.7]} />
        <K.Globe pos={[-3.2, 0, -2.2]} />
        <K.DraftingTable pos={[-3.0, 0, 3.6]} />
        <K.Stool pos={[-3.0, 0, 5.0]} />
        <K.PendantLamp pos={[0, 6.4, 0.4]} />
        <K.PendantLamp pos={[-5, 6.4, 0.4]} />
        {/* the hero table with the blueprint */}
        <K.DraftingTable pos={[0.6, 0, 0.9]} />
        <K.Stool pos={[2.5, 0, 0.9]} />
        <BeanCard position={[-1.0, 0, 1.7]} height={2.0} params={bean(ENG, { ...idle(t), expr: f >= stamp ? "happy" : "neutral", prop: f >= sign ? (f < stamp ? "pen" : "stamp") : "none", armR: f >= sign && f < stamp ? [80 + Math.sin(f * 0.7) * 8, -40] : f >= stamp ? [70 + (1 - st) * 40, -30] : [6, -8], look: 0.5 })} />
        <Lights key1="#fff0d0" dir={[-4, 9, 8]} k={1.9} />
      </Stage>
      <Grade warm={0.3} blur={5} />
      {f >= stamp && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 620, textAlign: "center", transform: `rotate(6deg) scale(${0.4 + 0.6 * st})`, opacity: Math.min(1, st * 1.6) }}>
          <span style={{ display: "inline-block", border: "12px solid #c93b3b", color: "#c93b3b", fontFamily: "Anton, Impact, sans-serif", fontSize: 130, padding: "6px 32px", borderRadius: 14, background: "rgba(255,248,235,0.92)", letterSpacing: 6 }}>DISAHKAN</span>
        </div>
      )}
      <Chip from={sign - 10} to={sign + 80} top={430}>WAJIB TANDA TANGAN</Chip>
      <Caps ids={["a1"]} hl={["insinyur", "wajib", "menandatangani"]} />
    </>
  );
};

/* ================================================================== */
/* 11. TWIST                                                            */
/* ================================================================== */
export const SceneMTwist: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const irony = EV("twist.irony");
  const paint = EV("twist.paint");
  const smell = EV("twist.smell");
  const dur = DURATIONS_M.twist;
  const cam = shotCam(f, [
    { to: smell - 10, p0: [6.4, 1.5, 11], l0: [9.2, 1.6, -1.5], p1: [7.2, 1.6, 10], l1: [9.4, 1.6, -1.5], fov: 36, roll0: 3, roll1: 2 },
    { to: 9999, p0: [4, 2.4, 14], l0: [6, 1.4, 0], p1: [-2, 3.6, 20], l1: [4, 2.0, 0], fov: 40 },
  ]);
  const bulge = 0.35 + 0.25 * Math.sin(t * 3);
  const scent = (i: number) => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k++) pts.push(new THREE.Vector3(Math.sin(k * 0.6 + t * 3 + i) * 0.35, k * 0.18, 0));
    return new THREE.CatmullRomCurve3(pts);
  };
  return (
    <>
      <Stage cam={cam} bg="#ffd0a0" fog={["#f6c898", 30, 130]}>
        <SkyDome top="#5a8ee0" horizon="#ffd0a0" />
        <PierSet t={t} />
        <Street t={t} dusk={0} wagon />
        {/* painted tank wall segment with something oozing behind the paint */}
        <Tank pos={TANK} t={t} leak={0} paint={1} />
        <mesh position={[TANK[0] - 1.2, 1.4, TANK[2] + 1.6]}>
          <sphereGeometry args={[bulge * 0.55, 12, 10]} />
          <meshStandardMaterial color="#7a4020" roughness={0.3} />
        </mesh>
        <mesh position={[TANK[0] - 1.2, 0.8, TANK[2] + 1.9]} scale={[0.08, 1.0, 0.05]}>
          <cylinderGeometry args={[1, 0.6, 1, 6]} />
          <meshBasicMaterial color="#3a1c0a" />
        </mesh>
        <BeanCard position={[TANK[0] - 3.6, 0, 1.4]} height={2.0} params={bean(BOSS, { ...idle(t), expr: f >= paint ? "smug" : "neutral", prop: "brush", armR: f < paint ? [100 + Math.sin(f * 0.5) * 18, -20] : [40, -20], look: -0.6 })} />
        {f >= smell && [0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-2 + i * 3.2, 0.3 + (i % 2) * 0.2, 1.6 + (i % 3) * 0.6]}>
            <tubeGeometry args={[scent(i), 24, 0.045, 5, false]} />
            <meshBasicMaterial color="#e8a020" transparent opacity={0.85} />
          </mesh>
        ))}
        {f >= smell && <BeanCard position={[3.2, 0, 2.6]} height={1.4} params={bean(KID, { ...idle(t), expr: "happy", look: 0.4 })} />}
        {f >= smell && <BeanCard position={[0.6, 0, 3.0]} height={1.9} params={bean(MARIA, { ...idle(t, 1), expr: "happy" })} flip />}
        <Lights key1="#ffb877" dir={[8, 5, 10]} k={2.2} />
      </Stage>
      <Grade warm={0.8} blur={6} dark={f > dur - 20 ? cl((f - dur + 20) / 20) * 0.9 : 0} />
      <Caps ids={["z1", "z2"]} hl={["Ironisnya", "berbahaya", "ditutup", "cat", "konon", "panas", "bau", "manis"]} />
    </>
  );
};

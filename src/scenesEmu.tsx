// Adegan "Perang Emu 1932" — gaya 3D explainer (toon + garis tepi, X-ray, laser, layar terbelah).
// Semua waktu aksi diambil dari src/emu_timing.json (dibuat scripts/build_audio_emu.py) supaya sinkron dengan suara.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import timing from "./emu_timing.json";
import { Bean3, Bean3Params, BlueGrid, G, Hat, HEAD_R, Limb, T, ToonRes, ToonSky, Vec3, XR, bean3HandWorld, toonGradient } from "./three/toon";
import { Binoculars, Emu3D, EmuPose, Eucalyptus, Farmhouse, Fence, Hills, LewisGun, Sandbags, ToonCloud, Wheat, Windmill, emuHeadLocal } from "./three/objectsEmu";
import { AmmoCrate, Camp, Casings, Dam, DotPath, Dust, Letter, MuzzleFlash, Newspaper, Notebook, OfficeSet, Pencil, Rabbit, Stamp, Tracers, Truck } from "./three/objectsEmu2";
import { MEREDITH, OHALLORAN, PAKTOM } from "./StyleEmu";

const TM = timing as any;
export type EmuScene = "hook" | "serbu" | "kantor" | "datang" | "gerilya" | "bendungan" | "truk" | "kutipan" | "akhir";
export const EMU_ORDER: EmuScene[] = TM.order;
export const DUR_EMU = (k: EmuScene): number => TM.scenes[k].dur;
const EV = (n: string): number => TM.events[n];
const LN = (k: EmuScene, i: number): { from: number; to: number; words: { w: string; from: number; to: number }[] } => TM.lines[k][i];

const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x: number) => {
  const t = cl(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const rp = (f: number, a: number, b: number) => sm((f - a) / Math.max(1, b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lv = (a: Vec3, b: Vec3, k: number): Vec3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const talkAt = (f: number, ln: { from: number; to: number }) => (f >= ln.from && f < ln.to ? 0.25 + 0.75 * Math.abs(Math.sin(f * 0.9)) * (Math.sin(f * 0.37) > -0.6 ? 1 : 0.2) : 0);
const blink = (f: number, k = 0) => ((f + k * 37) % 97 < 3 ? 1 : 0);

/* ---------------- kamera ---------------- */
type Cam = { pos: Vec3; look: Vec3; fov: number };
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number; ease?: number };
const shotCam = (f: number, shots: Shot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (f < s.to || i === shots.length - 1) {
      const k = sm((f - start) / Math.max(1, (s.ease ?? s.to) - start));
      return { pos: lv(s.p0, s.p1 ?? s.p0, k), look: lv(s.l0, s.l1 ?? s.l0, k), fov: lerp(s.fov ?? 40, s.fov1 ?? s.fov ?? 40, k) };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 40 };
};
const kick = (f: number, hits: number[], amp = 0.05): Vec3 => {
  let x = 0,
    y = 0;
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
  camera.lookAt(cam.look[0] + shake[0], cam.look[1] + shake[1], cam.look[2]);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  return null;
};
const Stage: React.FC<{ cam: Cam; shake?: Vec3; w?: number; h?: number; bg?: string; children: React.ReactNode }> = ({ cam, shake, w = 1080, h = 1920, bg = "#cfe6ff", children }) => (
  <AbsoluteFill style={{ background: bg, width: w, height: h }}>
    <ThreeCanvas width={w} height={h} shadows flat camera={{ fov: cam.fov, near: 0.05, far: 600, position: cam.pos }}>
      <ToonRes />
      <Rig cam={cam} shake={shake} />
      {children}
    </ThreeCanvas>
  </AbsoluteFill>
);
const Sun: React.FC<{ k?: number; warm?: string }> = ({ k = 2.0, warm = "#fff0d6" }) => (
  <>
    <hemisphereLight args={["#eaf4ff", "#c8a46a", 1.15]} />
    <directionalLight position={[-7, 11, 8]} intensity={k} color={warm} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0004} />
  </>
);
const Ground: React.FC<{ c?: string }> = ({ c = "#c9a866" }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[600, 600]} />
    <meshToonMaterial color={c} gradientMap={toonGradient()} />
  </mesh>
);
const Countryside: React.FC<{ f: number; clear?: [number, number, number][]; wheat?: [number, number, number, number]; houseAt?: Vec3; houseRot?: number; n?: number }> = ({ f, clear = [], wheat = [-16, 16, -18, 1.2], houseAt = [-7, 0, -15], houseRot = 0.45, n = 3200 }) => (
  <>
    <ToonSky top="#3f97ea" horizon="#fbe7c4" r={400} />
    <Sun />
    <Ground />
    <Hills />
    <ToonCloud position={[-16, 17, -70]} scale={3.2} />
    <ToonCloud position={[18, 21, -80]} scale={3.6} />
    <ToonCloud position={[2, 26, -100]} scale={2.8} />
    <Wheat area={wheat} n={n} clear={clear} />
    <Farmhouse position={houseAt} rotation={[0, houseRot, 0]} />
    <Windmill position={[6, 0, -14]} spin={f * 0.06} />
    <Eucalyptus position={[-5.5, 0, -12]} />
    <Eucalyptus position={[10, 0, -20]} scale={1.3} seed={2} />
  </>
);

/* ---------------- UI: subtitle 1 kata, chip, judul ---------------- */
const SubWord: React.FC<{ scene: EmuScene; y?: number }> = ({ scene, y = 1390 }) => {
  const f = useCurrentFrame();
  const lines = TM.lines[scene] as { words: { w: string; from: number; to: number }[] }[];
  let word = "";
  let born = 0;
  for (const ln of lines) {
    const ws = ln.words;
    for (let i = 0; i < ws.length; i++) {
      const end = i + 1 < ws.length ? ws[i + 1].from : ws[i].to + 8;
      if (f >= ws[i].from - 1 && f < end) {
        word = ws[i].w;
        born = ws[i].from - 1;
        if (word.replace(/[^\w]/g, "").length <= 3 && i + 1 < ws.length && f >= ws[i + 1].from - 1) word = ws[i + 1].w;
      }
    }
  }
  if (!word) return null;
  const pop = 1 + 0.12 * Math.max(0, 1 - (f - born) / 4);
  const size = 84;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      <text x={540} y={y} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={900} fontSize={size * pop} fill="#ffffff" stroke="#0c0c10" strokeWidth={size * 0.2} strokeLinejoin="round" paintOrder="stroke fill">
        {word}
      </text>
    </svg>
  );
};
const Chip: React.FC<{ at: number; to?: number; top: number; left?: number; children: React.ReactNode; color?: string }> = ({ at, to = 99999, top, left = 70, children, color = "#ffd23f" }) => {
  const f = useCurrentFrame();
  if (f < at || f > to) return null;
  const k = sm((f - at) / 6) * (1 - sm((f - to + 6) / 6));
  return (
    <div style={{ position: "absolute", top, left, transform: `scale(${0.6 + 0.4 * k})`, transformOrigin: "left center", opacity: k, display: "flex", alignItems: "center", gap: 14, background: "rgba(10,14,28,0.86)", border: `4px solid ${color}`, borderRadius: 22, padding: "14px 26px", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 52, color: "#fff", boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>
      {children}
    </div>
  );
};
const Flash: React.FC<{ at: number; dur?: number; color?: string }> = ({ at, dur = 6, color = "#ffffff" }) => {
  const f = useCurrentFrame();
  const k = f >= at && f < at + dur ? 1 - (f - at) / dur : 0;
  return k > 0 ? <AbsoluteFill style={{ background: color, opacity: k * 0.85 }} /> : null;
};
const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(10,10,30,0.35) 100%)", pointerEvents: "none" }} />;

/* ---------------- tokoh ---------------- */
export const MENTERI: Bean3Params = { body: "#3c3c48", pants: "#34343e", shirt: "#f4f4ee", tie: "#a82a2a", hair: "#9a9aa2", glove: "#e8dccc", sleeve: "#3c3c48", hat: "none", mustache: true };
export const MCMURRAY: Bean3Params = { ...OHALLORAN, hat: "slouch", hatColor: "#968456", body: "#94875a", belt: "#5a3a22" };
export const WARTAWAN: Bean3Params = { body: "#a89070", pants: "#7a6a52", shirt: "#f4f0e4", tie: "#2a3a6a", hat: "fedora", hatColor: "#5a4a3a", hatBand: "#2a2220", glove: "#e8dccc" };
export const PAKBILL: Bean3Params = { ...PAKTOM, body: "#4a6a8a", plaid: "#2a4a6a", hat: "wide", hatColor: "#a8885a" };
const PAKTOM2: Bean3Params = { ...PAKTOM, medal: true };
const yawTo = (from: Vec3, to: Vec3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const walkLerp = (f: number, a: number, b: number, p0: Vec3, p1: Vec3) => {
  const k = rp(f, a, b);
  const moving = f > a && f < b;
  return { pos: lv(p0, p1, k), walk: moving ? (f - a) * 0.42 : undefined, yaw: yawTo(p0, p1) };
};

/* ===================== 1. HOOK ===================== */
export const SceneEmuHook: React.FC = () => {
  const f = useCurrentFrame();
  const sal = EV("hook.salute");
  const emu = EV("hook.emu");
  const cam = shotCam(f, [
    { to: sal + 6, p0: [7, 10, 22], l0: [0, 1, -2], p1: [1.15, 1.6, 5.4], l1: [0.35, 1.2, 0], fov: 40 },
    { to: DUR_EMU("hook"), p0: [1.15, 1.6, 5.4], l0: [0.35, 1.2, 0], p1: [1.6, 1.6, 6.2], l1: [0.4, 1.15, 0] },
  ]);
  const salute = rp(f, sal, sal + 8) * (1 - rp(f, emu + 18, emu + 26));
  const surprised = f >= emu + 12;
  const rise = rp(f, emu, emu + 12);
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Countryside f={f} clear={[[0, 0, 0.9], [1.2, -0.5, 0.3]]} />
        <Fence from={[-12, -3.5]} to={[12, -3.5]} posts={11} />
        <Bean3
          p={{ ...MEREDITH, expr: surprised ? "shock" : "proud", look: surprised ? 0.8 : 0, headTurn: surprised ? 0.45 * rp(f, emu + 12, emu + 18) : 0, handR: lv([0.42, 0.6, 0.1], [0.4, 1.68, 0.22], salute) }}
          position={[0, 0, 0]}
          rotation={[0, 0.22, 0]}
        />
        <Emu3D position={[1.2, -1.15 * (1 - rise), -0.5]} rotation={[0, -0.5, 0]} pose={{ neck: 0.25, headTilt: rise * 0.45 * Math.sin(Math.max(0, f - emu - 12) * 0.12 + 1.2), headTurn: -0.35, eyes: "round" }} />
      </Stage>
      <Vignette />
      {f < emu - 6 ? (
        <div style={{ position: "absolute", top: 230, left: 40, right: 40, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 900, opacity: rp(f, 0, 6) * (1 - rp(f, emu - 14, emu - 6)), transform: `scale(${0.85 + 0.15 * rp(f, 0, 8)})` }}>
          <div style={{ fontSize: 78, lineHeight: 1.08, color: "#fff", textShadow: "6px 6px 0 #0c0c10, -3px -3px 0 #0c0c10, 3px -3px 0 #0c0c10, -3px 3px 0 #0c0c10" }}>AUSTRALIA PERNAH KALAH PERANG…</div>
          <div style={{ display: "inline-block", marginTop: 22, background: "rgba(10,14,28,0.88)", border: "5px solid #ffd23f", borderRadius: 24, padding: "10px 30px", fontSize: 64, color: "#ffd23f" }}>LAWAN SIAPA? 🤔</div>
        </div>
      ) : null}
      <SubWord scene="hook" />
    </AbsoluteFill>
  );
};

/* ===================== 2. SERBUAN ===================== */
const HERD: [number, number][] = [
  [3.0, -1.0],
  [-2.5, 0.3],
  [-0.8, -2.2],
  [1.2, 0.8],
  [-4.2, -1.4],
  [4.6, 0.2],
  [0.2, -4.2],
  [-2.0, -5.0],
  [2.6, -5.5],
  [-5.6, -3.4],
  [5.8, -3.0],
  [-0.6, -6.6],
];
export const SceneEmuSerbu: React.FC = () => {
  const f = useCurrentFrame();
  const vet = EV("serbu.veteran");
  const fence = EV("serbu.fence");
  const peck = EV("serbu.peck");
  const rab = EV("serbu.rabbit");
  const hat = EV("serbu.hat");
  const D = DUR_EMU("serbu");
  const cam = shotCam(f, [
    { to: vet - 4, p0: [0, 7.5, 16], l0: [0, 0.6, -2], p1: [0, 6.5, 14], l1: [0, 0.6, -2], fov: 42 },
    { to: fence - 4, p0: [2.3, 1.7, 3.2], l0: [3.6, 1.15, -1.9], p1: [2.5, 1.7, 3.6], l1: [3.6, 1.1, -1.9] },
    { to: hat - 12, p0: [1.4, 1.9, 5.8], l0: [2.4, 0.7, -1.2], p1: [0.8, 2.0, 6.4], l1: [1.8, 0.7, -1.4] },
    { to: D, p0: [2.4, 1.6, 3.2], l0: [3.6, 1.1, -1.0], p1: [2.2, 1.7, 4.0], l1: [3.5, 1.0, -1.0] },
  ]);
  const tom = walkLerp(f, vet - 2, vet + 40, [4.6, 0, -4.0], [3.6, 0, -1.3]);
  const throwK = rp(f, hat - 10, hat - 2);
  const fly = rp(f, hat - 2, hat + 9);
  const tomP: Bean3Params = {
    ...PAKTOM2,
    expr: f >= fence ? (f >= hat - 12 ? "shout" : "angry") : "worried",
    walk: tom.walk,
    talk: f >= hat - 10 && f < hat + 20 ? 0.5 + 0.5 * Math.abs(Math.sin(f * 0.8)) : 0,
    hide: f >= hat - 10 ? ["hat"] : undefined,
    handR: f >= hat - 10 ? lv([0.42, 0.6, 0.1], [0.7, 1.55, 0.15], throwK * (1 - fly)) : undefined,
  };
  const tomYaw = f < vet + 40 ? tom.yaw : 0.2;
  const handW = bean3HandWorld(tomP, "R", tom.pos, tomYaw);
  const hatPos: Vec3 = fly > 0 ? lv(handW, [tom.pos[0] + 0.5, 0.05, tom.pos[2] + 0.6], fly) : handW;
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={kick(f, [fence + 2], 0.04)}>
        <Countryside f={f} clear={[[3.6, -1.3, 1.2], [3.0, -1.0, 0.8]]} houseAt={[5.2, 0, -6.3]} houseRot={-0.5} n={2600} />
        <Fence from={[-9, -1.0]} to={[9, -1.0]} posts={10} broken={f >= fence ? 6 : -1} />
        <Dust position={[3.0, 0, -1.0]} k={(f - fence) / 18} seed={2} />
        {HERD.map(([tx, tz], i) => {
          const arrive = 40 + i * 4;
          const start: Vec3 = [-15 - i * 0.7, 0, tz - 3];
          if (i === 0) {
            // emu yang menabrak pagar
            const k = rp(f, fence - 22, fence);
            const after = rp(f, fence, fence + 20);
            const p = lv(lv([3.0, 0, -6.5], [3.0, 0, -1.25], k), [1.6, 0, -0.3], after);
            return <Emu3D key={i} position={p} rotation={[0, 0, 0]} pose={{ run: f < fence + 20 && f > fence - 22 ? f * 0.55 : undefined, neck: 0.45, peck: f > fence + 22 ? Math.max(0, Math.sin(f * 0.3)) * 0.7 : 0 }} />;
          }
          const k = rp(f, 0, arrive);
          const p = lv(start, [tx, 0, tz], k);
          const running = f < arrive;
          const pk = f >= peck ? Math.max(0, Math.sin(f * 0.28 + i * 1.7)) * 0.85 : 0;
          return <Emu3D key={i} position={p} rotation={[0, running ? Math.PI / 2 - 0.2 : i * 1.3, 0]} pose={{ run: running ? f * 0.55 + i : undefined, neck: 0.45, peck: running ? 0 : pk, eyes: i % 3 === 0 ? "half" : "round" }} scale={0.95} />;
        })}
        {[0, 1, 2].map((i) => {
          const k = rp(f, rab + i * 6, rab + 40 + i * 6);
          return f >= rab + i * 6 ? <Rabbit key={i} position={lv([2.6 + i * 0.4, 0, -3.5 - i * 0.3], [0.6 + i * 0.5, 0, 0.6], k)} rotation={[0, -0.5, 0]} hop={(f - rab) * 0.7 + i} scale={1.3} /> : null;
        })}
        <Bean3 p={tomP} position={tom.pos} rotation={[0, tomYaw, 0]} />
        {f >= hat - 10 ? <group position={hatPos} rotation={[fly * 2.4, 0, fly * 0.6]}><Hat kind="wide" c={PAKTOM.hatColor!} band={PAKTOM.hatBand!} r={HEAD_R} /></group> : null}
      </Stage>
      <Vignette />
      <Chip at={8} to={vet - 6} top={240}>🪶 ±20.000 EMU</Chip>
      <SubWord scene="serbu" />
    </AbsoluteFill>
  );
};

/* ===================== 3. KANTOR MENTERI ===================== */
const InsertStamp: React.FC<{ f: number; at: number }> = ({ f, at }) => {
  const down = f < at ? rp(f, at - 12, at) : 1 - rp(f, at + 4, at + 14);
  const y = lerp(0.55, 0.04, down);
  const cam: Cam = { pos: [0.0, 1.2, 1.1], look: [0, 0.05, 0], fov: 40 };
  return (
    <Stage cam={cam} bg="#7a4422" shake={kick(f, [at], 0.015)}>
      <hemisphereLight args={["#fff4e0", "#6a3a1c", 1.3]} />
      <directionalLight position={[-2, 4, 3]} intensity={1.6} castShadow />
      <T g={G.box(3, 0.1, 3)} c="#7a4422" position={[0, -0.05, 0]} o={false} />
      <Letter position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0.12]} stamped={f >= at ? 1 : 0} w={0.5} />
      <group position={[0.04, y, 0.1]}>
        <Stamp scale={1.5} />
        <T g={G.sph(0.1, 18, 12)} c="#e8dccc" position={[0, 0.3, 0]} />
        <Limb a={[0, 0.4, 0]} b={[0.25, 1.2, 0.5]} r={0.09} c="#3c3c48" />
      </group>
    </Stage>
  );
};
export const SceneEmuKantor: React.FC = () => {
  const f = useCurrentFrame();
  const arrive = EV("kantor.arrive");
  const slam = EV("kantor.slam");
  const grab = EV("kantor.grab");
  const stamp = EV("kantor.stamp");
  const D = DUR_EMU("kantor");
  const l1 = LN("kantor", 1);
  const cam = shotCam(f, [
    { to: arrive, p0: [2.0, 1.9, 4.6], l0: [-1.2, 1.1, -0.3], p1: [1.6, 1.75, 4.2], l1: [-0.6, 1.1, -0.5], fov: 42 },
    { to: grab, p0: [1.5, 1.7, 4.1], l0: [-0.45, 1.1, -0.6], p1: [1.3, 1.65, 3.7], l1: [-0.45, 1.1, -0.6], fov: 40 },
    { to: D, p0: [1.3, 1.65, 3.7], l0: [-0.45, 1.1, -0.6], p1: [1.8, 1.8, 4.6], l1: [-0.45, 1.05, -0.6], fov: 40 },
  ]);
  const tom = walkLerp(f, 0, arrive, [-3.2, 0, -1.2], [-0.9, 0, -0.2]);
  const bill = walkLerp(f, 6, arrive + 6, [-3.8, 0, -0.4], [-1.75, 0, 0.6]);
  const raise = rp(f, slam - 10, slam - 4);
  const hit = rp(f, slam - 4, slam);
  const relax = rp(f, slam + 14, slam + 24);
  const handTom = f < slam - 10 ? undefined : lv(lv(lv([0.42, 0.6, 0.1], [0.32, 1.65, 0.3], raise), [0.2, 0.9, 0.58], hit), [0.42, 0.6, 0.1], relax);
  const happy = f > stamp + 6;
  const tomP: Bean3Params = { ...PAKTOM2, hat: "none", hair: "#6a4a2a", expr: happy ? "laugh" : f >= l1.from - 4 ? "shout" : "angry", walk: tom.walk, talk: talkAt(f, l1), handR: handTom };
  const billP: Bean3Params = { ...PAKBILL, hat: "none", hair: "#3a2a1a", expr: happy ? "happy" : "determined", walk: bill.walk };
  const jump = f >= slam && f < slam + 10 ? Math.sin(((f - slam) / 10) * Math.PI) * 0.08 : 0;
  const reach = rp(f, grab, grab + 10);
  const minP: Bean3Params = {
    ...MENTERI,
    seated: true,
    bob: jump,
    expr: f >= slam && f < grab ? "shock" : f >= stamp ? "worried" : f >= grab ? "neutral" : "determined",
    look: f >= arrive - 10 ? -0.5 : 0,
    talk: talkAt(f, LN("kantor", 2)) * 0.5,
    handL: [-0.3, 1.06, 0.45],
    handR: lv([0.3, 1.06, 0.45], [0.38, 1.12, 0.5], reach),
  };
  const insert = f >= stamp - 13 && f < stamp + 22;
  if (f >= stamp + 22 && f < stamp + 42) {
    // keluar dari close-up: kamera menjauh pelan dari meja ke shot lebar
    const k = rp(f, stamp + 22, stamp + 42);
    cam.pos = lv([0.5, 1.5, 0.9], cam.pos, k);
    cam.look = lv([0.1, 0.9, -0.9], cam.look, k);
  }
  return (
    <AbsoluteFill>
      {insert ? (
        <InsertStamp f={f} at={stamp} />
      ) : (
        <Stage cam={cam} bg="#efe2c4" shake={kick(f, [slam], 0.05)}>
          <hemisphereLight args={["#fff6e6", "#8a6a4a", 1.25]} />
          <directionalLight position={[2, 6, 4]} intensity={1.6} color="#fff0d8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
          <pointLight position={[0.25, 1.3, -1.2]} intensity={0.8} color="#ffe2a0" distance={4} />
          <OfficeSet fan={f * 0.25} />
          <Letter position={[0.1, 0.852 + jump * 0.6, -0.75]} rotation={[-Math.PI / 2, 0, 0.1]} stamped={f >= stamp ? 1 : 0} />
          <Stamp position={reach > 0 ? bean3HandWorld(minP, "R", [0, 0, -1.6]) : [0.4, 0.85, -1.08]} />
          <Bean3 p={minP} position={[0, 0, -1.6]} />
          <Bean3 p={billP} position={bill.pos} rotation={[0, f < arrive + 6 ? bill.yaw : 1.0, 0]} />
          <Bean3 p={tomP} position={tom.pos} rotation={[0, f < arrive ? tom.yaw : 1.25, 0]} />
        </Stage>
      )}
      <Vignette />
      <Flash at={stamp} dur={4} color="#ffe0d0" />
      <Chip at={stamp + 22} to={D} top={240} color="#ff5a4a">✅ DISETUJUI</Chip>
      <SubWord scene="kantor" />
    </AbsoluteFill>
  );
};

/* ===================== 4. PASUKAN DATANG ===================== */
const Road: React.FC = () => (
  <>
    <T g={G.box(300, 0.02, 3.2)} c="#b89462" position={[0, 0.01, 0]} o={false} />
    {Array.from({ length: 40 }).map((_, i) => (
      <T key={i} g={G.box(1.2, 0.025, 0.12)} c="#a07e50" position={[-60 + i * 3.1, 0.012, (i % 2 ? 0.6 : -0.7)]} o={false} />
    ))}
  </>
);
export const SceneEmuDatang: React.FC = () => {
  const f = useCurrentFrame();
  const stop = EV("datang.stop");
  const lewis = EV("datang.lewis");
  const ammo = EV("datang.ammo");
  const D = DUR_EMU("datang");
  const tk = rp(f, 0, stop);
  const truckX = lerp(16, 1.6, 1 - Math.pow(1 - cl(f / Math.max(1, stop)), 2));
  const moving = f < stop;
  const cam = shotCam(f, [
    { to: stop + 8, p0: [7.5, 2.0, 8.5], l0: [8, 1.0, 0], p1: [1.6, 1.8, 7.2], l1: [1.4, 1.0, 0.8], fov: 40 },
    { to: D, p0: [1.6, 1.8, 7.2], l0: [1.4, 1.0, 0.8], p1: [1.2, 1.7, 6.4], l1: [1.2, 1.0, 0.8] },
  ]);
  // Meredith turun dari kabin
  const step = rp(f, stop + 2, stop + 18);
  const merP = lv([1.25, 0.45, 0.95], [0.4, 0, 2.1], step);
  // O'Halloran mengangkat Lewis dari bak ke bahu
  const oh: Vec3 = [3.3, 0, 1.4];
  const lift = rp(f, lewis, lewis + 14);
  const ohP: Bean3Params = { ...OHALLORAN, expr: "determined", handL: lv([-0.42, 0.6, 0.1], [-0.2, 1.35, 0.3], lift), handR: lv([0.42, 0.6, 0.1], [0.2, 1.2, 0.35], lift) };
  const gunPos: Vec3 = f < lewis ? [3.1, 1.12, 0.2] : lv([3.1, 1.12, 0.2], [oh[0] - 0.1, 1.35, oh[2] + 0.25], lift);
  // McMurray membawa peti amunisi dari bak ke tumpukan
  const carry = walkLerp(f, ammo + 6, ammo + 40, [2.6, 0, 1.3], [-0.6, 0, 2.2]);
  const pickK = rp(f, ammo, ammo + 6);
  const dropK = rp(f, ammo + 40, ammo + 46);
  const mcP: Bean3Params = { ...MCMURRAY, expr: "determined", walk: carry.walk, handL: lv([-0.42, 0.6, 0.1], [-0.25, 0.9, 0.45], pickK * (1 - dropK)), handR: lv([0.42, 0.6, 0.1], [0.25, 0.9, 0.45], pickK * (1 - dropK)) };
  const mcYaw = f < ammo + 6 ? -0.2 : carry.yaw;
  const crateW = f < ammo ? ([2.4, 1.07, -0.1] as Vec3) : f > ammo + 40 ? lv(bean3HandWorld(mcP, "L", carry.pos, mcYaw), [-0.6, 0.15, 1.7], dropK) : lv([2.4, 1.07, -0.1], lv(bean3HandWorld(mcP, "L", carry.pos, mcYaw), bean3HandWorld(mcP, "R", carry.pos, mcYaw), 0.5), pickK);
  const count = Math.round(10000 * rp(f, ammo + 10, ammo + 40));
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Countryside f={f} clear={[]} wheat={[-16, 16, -18, -2.4]} />
        <Road />
        <Fence from={[-14, -2.2]} to={[14, -2.2]} posts={13} />
        <Truck position={[truckX, 0, 0]} rotation={[0, -Math.PI / 2, 0]} spin={-truckX * 2.2} bounce={moving ? Math.abs(Math.sin(f * 0.8)) * 0.03 : 0}>
          {/* peti di bak sebelum diangkat */}
          <AmmoCrate position={[0.2, 1.07, -1.4]} />
        </Truck>
        {[0, 1, 2, 3].map((i) => (moving ? <Dust key={i} position={[truckX + 2.2 + i * 0.5, 0, (i % 2) * 0.6 - 0.3]} k={((f + i * 5) % 20) / 20} seed={i} scale={0.8} /> : null))}
        <Dust position={[truckX + 2.0, 0, 0]} k={(f - stop) / 20} seed={9} />
        <Bean3 p={{ ...MEREDITH, expr: step >= 1 ? "proud" : "determined", walk: step > 0 && step < 1 ? f * 0.4 : undefined }} position={merP} rotation={[0, step < 1 ? 0.6 : 0.25, 0]} />
        <Bean3 p={ohP} position={oh} rotation={[0, -0.35, 0]} />
        <LewisGun position={gunPos} rotation={[0, f < lewis ? Math.PI / 2 : lerp(Math.PI / 2, -0.4, lift), lift * 0.35]} scale={0.85} bipod />
        <Bean3 p={mcP} position={carry.pos} rotation={[0, mcYaw, 0]} />
        <AmmoCrate position={crateW} rotation={[0, mcYaw, 0]} />
        <AmmoCrate position={[-0.6, 0.15, 1.7]} rotation={[0, 0.3, 0]} />
        {f > ammo + 46 ? <AmmoCrate position={[-0.55, 0.45, 1.75]} rotation={[0, 0.1, 0]} /> : null}
      </Stage>
      <Vignette />
      <Chip at={stop + 4} to={D} top={200}>🎖️ MAYOR MEREDITH</Chip>
      <Chip at={lewis + 12} to={D} top={320}>🔫 2× SENAPAN LEWIS</Chip>
      <Chip at={ammo + 10} to={D} top={440}>🟡 {count.toLocaleString("id-ID")} PELURU</Chip>
      <SubWord scene="datang" />
    </AbsoluteFill>
  );
};

/* ===================== 5. GERILYA (peta hologram + layar terbelah) ===================== */
const GROUP_DIR: [number, number][] = [
  [-6, -7],
  [-7, -2],
  [-4, 2.5],
  [6, -7],
  [7, -2],
  [4.5, 2.5],
];
const HoloMap: React.FC<{ f: number; cam: Cam; w?: number }> = ({ f, cam, w = 1080 }) => {
  const look = EV("gerilya.look");
  const split = EV("gerilya.split");
  const aim = EV("gerilya.aim");
  const sweep = Math.sin((f - aim) * 0.12) * 0.9;
  const laserTo: Vec3 = [Math.sin(sweep) * 7, 0.3, 4 - Math.cos(sweep) * 9];
  return (
    <Stage cam={cam} w={w} bg="#020a1c">
      <hemisphereLight args={["#bfe4ff", "#123060", 1.6]} />
      <directionalLight position={[3, 8, 5]} intensity={1.6} color="#e8f4ff" />
      <BlueGrid size={80} />
      {/* pasukan: Mayor + senapan (padat) */}
      <Bean3 p={{ ...MEREDITH, expr: f >= split ? "worried" : "determined" }} position={[-0.9, 0, 4.2]} rotation={[0, Math.PI, 0]} scale={0.8} />
      <LewisGun position={[0.3, 0.45, 4.0]} rotation={[0, Math.PI, 0]} scale={0.8} bipod />
      {Array.from({ length: 24 }).map((_, i) => {
        const row = Math.floor(i / 6),
          col = i % 6;
        const home: Vec3 = [-2.5 + col * 1.0, 0, -3.2 + row * 1.0];
        const g = i % 6;
        const dir = GROUP_DIR[g];
        const k = rp(f, split + (i % 4) * 2, split + 34 + (i % 4) * 2);
        const tgt: Vec3 = [dir[0] + ((i * 7) % 3) * 0.5 - 0.5, 0, dir[1] + ((i * 5) % 3) * 0.5 - 0.5];
        const p = lv(home, tgt, k);
        const yaw = f < split ? Math.PI + (f >= look ? Math.sin(f * 0.2 + i) * 0.8 : 0) : yawTo(home, tgt);
        return <Emu3D key={i} position={p} rotation={[0, yaw, 0]} pose={{ run: k > 0 && k < 1 ? f * 0.6 + i : undefined, neck: 0.3, headTurn: f >= look && f < split ? Math.sin(f * 0.25 + i * 2) * 0.9 : 0 }} scale={0.5} />;
      })}
      {f >= split
        ? GROUP_DIR.map((d, g) => <DotPath key={g} pts={[[-2.5 + g * 1.0, 0.05, -1.7], [d[0] * 0.5, 0.05, d[1] * 0.5 - 1], [d[0], 0.05, d[1]]]} k={rp(f, split, split + 30)} />)
        : null}
      {/* barisan impian (garis putus-putus formasi) */}
      {f < split ? <DotPath pts={[[-3, 0.05, -3.7], [3.3, 0.05, -3.7], [3.3, 0.05, -0.3], [-3, 0.05, -0.3], [-3, 0.05, -3.7]]} k={1} color="#ffffff" size={0.04} step={0.25} /> : null}
      {/* laser bidik merah menyapu, target selalu lolos */}
      {f >= aim ? (
        <>
          <Limb a={[0.3, 0.55, 3.3]} b={laserTo} r={0.025} c="#ff3b30" o={false} cap={false} />
          <T g={G.tor(0.45, 0.04, 6, 30)} c="#ff3b30" emissive="#ff2010" ei={1.2} o={false} position={[laserTo[0], 0.06, laserTo[2]]} rotation={[Math.PI / 2, 0, 0]} />
        </>
      ) : null}
    </Stage>
  );
};
const BinocularPOV: React.FC<{ f: number }> = ({ f }) => {
  const cam: Cam = { pos: [Math.sin(f * 0.08) * 0.3, 1.7, 6], look: [Math.sin(f * 0.08) * 0.8, 1.2, -2], fov: 24 };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 1920, overflow: "hidden" }}>
      <Stage cam={cam} w={540} h={1920}>
        <ToonSky top="#3f97ea" horizon="#fbe7c4" />
        <Sun />
        <Ground />
        <Wheat area={[-10, 10, -16, -5]} n={1200} seed={8} />
        {[0, 1, 2].map((i) => (
          <Emu3D key={i} position={[-1.0 + i * 1.0 + Math.sin(f * 0.05 + i) * 0.5, 0, -1.0 - i * 1.0 - (f % 200) * 0.01]} rotation={[0, Math.PI + 0.3 * (i - 1), 0]} pose={{ run: f * 0.55 + i * 2, neck: 0.4, eyes: "half", headTurn: i === 1 ? Math.PI * 0.85 : 0 }} />
        ))}
      </Stage>
      {/* masker teropong: dua lingkaran + crosshair merah */}
      <svg width={540} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <mask id="bino">
            <rect width={540} height={1920} fill="white" />
            <circle cx={270} cy={780} r={250} fill="black" />
            <circle cx={270} cy={1230} r={250} fill="black" />
          </mask>
        </defs>
        <rect width={540} height={1920} fill="#05060a" mask="url(#bino)" />
        {[780, 1230].map((cy) => (
          <g key={cy} stroke="#ff3b30" strokeWidth={4} opacity={0.85}>
            <line x1={170} y1={cy} x2={370} y2={cy} />
            <line x1={270} y1={cy - 100} x2={270} y2={cy + 100} />
            <circle cx={270} cy={cy} r={60} fill="none" />
          </g>
        ))}
      </svg>
    </div>
  );
};
export const SceneEmuGerilya: React.FC = () => {
  const f = useCurrentFrame();
  const split = EV("gerilya.split");
  const aim = EV("gerilya.aim");
  const D = DUR_EMU("gerilya");
  const cam = shotCam(f, [
    { to: split, p0: [0, 7.5, 10.5], l0: [0, 0, -1.5], p1: [0, 8.5, 11], l1: [0, 0, -1.8], fov: 42 },
    { to: D, p0: [0, 8.5, 11], l0: [0, 0, -1.8], p1: [0, 11, 12.5], l1: [0, 0, -2.2], fov: 46, ease: split + 30 },
  ]);
  const splitScreen = f >= aim;
  const mcam: Cam = { pos: [0.15, 1.5, 2.6], look: [0, 1.25, 0], fov: 38 };
  return (
    <AbsoluteFill style={{ background: "#020a1c" }}>
      {!splitScreen ? (
        <HoloMap f={f} cam={cam} />
      ) : (
        <>
          <BinocularPOV f={f} />
          <div style={{ position: "absolute", left: 540, top: 0, width: 540, height: 1920, overflow: "hidden" }}>
            <Stage cam={mcam} w={540} h={1920} bg="#cfe6ff">
              <ToonSky top="#3f97ea" horizon="#fbe7c4" />
              <Sun />
              <Ground />
              <Wheat area={[-8, 8, -12, -1]} n={900} seed={5} />
              <Bean3 p={{ ...MEREDITH, expr: "worried", look: -0.4, handL: [-0.12, 1.0, 0.45], handR: [0.12, 1.0, 0.45], headTilt: -0.05 }} position={[0, 0, 0]}>
                <Binoculars position={[0, 1.0, 0.5]} rotation={[0, 0, 0]} />
              </Bean3>
            </Stage>
          </div>
          <div style={{ position: "absolute", left: 536, top: 0, width: 8, height: 1920, background: "#0c0c10" }} />
          <Chip at={aim + 4} to={D} top={230} left={40} color="#ff5a4a">🎯 TARGET HILANG</Chip>
        </>
      )}
      {!splitScreen ? <Chip at={10} to={split - 4} top={230} color="#7fe8ff">📋 RENCANA: EMU BERBARIS</Chip> : null}
      {!splitScreen ? <Chip at={split + 6} to={aim} top={230} color="#7fe8ff">🪶 BERPENCAR · GERILYA</Chip> : null}
      <SubWord scene="gerilya" />
    </AbsoluteFill>
  );
};

/* ===================== 6. BENDUNGAN ===================== */
const DRINKERS: [number, number, number][] = [
  [-3.2, -3.6, 0.3],
  [-1.6, -2.7, 0.0],
  [0.4, -2.5, -0.1],
  [2.2, -2.9, -0.4],
  [3.8, -3.8, -0.7],
  [-4.6, -5.6, 0.9],
  [4.9, -5.6, -1.2],
  [-2.0, -9.6, 2.9],
  [1.6, -9.8, 3.4],
  [5.6, -8.2, -2.2],
];
const XRayGun: React.FC<{ f: number; jam: number; cock: number }> = ({ f, jam, cock }) => {
  const pull = rp(f, jam, jam + 14);
  const cam: Cam = { pos: lv([0.25, 0.95, 0.9], [0.55, 1.45, 2.9], pull), look: [-0.1, 1.0, 0.1], fov: 40 };
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.4);
  // tangan menarik tuas kokang maju-mundur (klik-klik), tetap macet
  const c = f >= cock ? Math.abs(Math.sin(((f - cock) / 7) * Math.PI)) : 0;
  const gunPos: Vec3 = [0, 0.95, 0];
  const yaw = -1.3;
  const handLocal: Vec3 = [0.12, 0.0, 0.05 - c * 0.14];
  const hx = gunPos[0] + (handLocal[0] * Math.cos(yaw) + handLocal[2] * Math.sin(yaw)) * 1.4;
  const hz = gunPos[2] + (-handLocal[0] * Math.sin(yaw) + handLocal[2] * Math.cos(yaw)) * 1.4;
  return (
    <Stage cam={cam} bg="#020a1c">
      <hemisphereLight args={["#bfe4ff", "#123060", 1.5]} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} color="#e8f4ff" />
      <BlueGrid />
      <LewisGun position={gunPos} rotation={[0.05, yaw, 0]} scale={1.4} xray jam={pulse} bipod={false} />
      <group position={[-0.03, 1.08, 0.08]}>
        <T g={G.sph(0.035, 16, 12)} c="#ff4b40" emissive="#ff2a20" ei={1.5} o={2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={1 + pulse * 0.6}>
          <ringGeometry args={[0.06, 0.075, 32]} />
          <meshBasicMaterial color="#ff5040" transparent opacity={0.8 - pulse * 0.5} />
        </mesh>
      </group>
      {f >= cock - 8 ? (
        <group>
          <T g={G.sph(0.075, 14, 10)} c="#2a2a2e" position={[hx, 0.97, hz]} />
          <Limb a={[hx, 0.97, hz]} b={[hx + 0.7, 0.75, hz + 0.6]} r={0.045} c={OHALLORAN.body} />
        </group>
      ) : null}
    </Stage>
  );
};
export const SceneEmuBendungan: React.FC = () => {
  const f = useCurrentFrame();
  const wait = EV("bendungan.wait");
  const fire = EV("bendungan.fire");
  const jam = EV("bendungan.jam");
  const cock = EV("bendungan.cock");
  const turn = EV("bendungan.turn");
  const flee = EV("bendungan.flee");
  const D = DUR_EMU("bendungan");
  const xrayEnd = turn - 4;
  const shooting = f >= fire + 2 && f < jam - 10;
  const cam = shotCam(f, [
    { to: wait - 12, p0: [6.2, 4.4, 4.2], l0: [0.3, 0.6, -2.6], p1: [5.6, 4.0, 3.8], l1: [0.3, 0.6, -2.8], fov: 42 },
    { to: fire + 3, p0: [2.4, 1.6, -2.0], l0: [-0.4, 0.9, 2.4], p1: [2.1, 1.55, -1.6], l1: [-0.4, 0.9, 2.4], fov: 40 },
    // tembak dari belakang senapan, lalu kamera MENEMBUS ke dalam senapan
    { to: jam, p0: [-1.6, 2.6, 5.6], l0: [0, 0.6, -4], p1: [-0.02, 0.72, 1.95], l1: [0, 0.68, 1.2], fov: 40, ease: jam },
    { to: D, p0: [2.6, 3.0, 0.5], l0: [0, 0.8, -7], p1: [2.4, 2.9, 0.2], l1: [0, 0.8, -7.5], fov: 42 },
  ]);
  const handUp = rp(f, wait, wait + 8) * (1 - rp(f, fire - 3, fire));
  const merP: Bean3Params = { ...MEREDITH, kneel: 0.6, expr: f >= fire - 4 && f < fire + 12 ? "shout" : f >= jam ? "shock" : "determined", talk: f >= fire - 2 && f < fire + 10 ? 0.9 : 0, handR: lv([0.42, 0.6, 0.1], [0.38, 1.75, 0.15], handUp) };
  const ohP: Bean3Params = { ...OHALLORAN, kneel: 0.7, expr: f >= jam - 10 ? "puzzled" : "determined", handL: [-0.35, 0.95, 0.5], handR: [-0.1, 0.85, 0.45] };
  const gunPos: Vec3 = [0, 0.66, 1.75];
  const muzzle: Vec3 = [0, 0.66, 0.4];
  const fled = rp(f, flee, flee + 50);
  const xray = f >= jam && f < xrayEnd;
  const targets: Vec3[] = DRINKERS.slice(0, 6).map(([x, z], i) => [x + (i % 2 ? 0.9 : -0.9), 0.3, z + 0.6]);
  return (
    <AbsoluteFill>
      {xray ? (
        <XRayGun f={f} jam={jam} cock={cock} />
      ) : (
        <Stage cam={cam} shake={shooting ? kick(f, [f - (f % 3)], 0.02) : [0, 0, 0]}>
          <Countryside f={f} wheat={[-18, 18, -24, -12]} n={1600} houseAt={[-12, 0, -22]} />
          <Dam position={[0, 0, -6]} t={f} />
          {DRINKERS.map(([x, z, yaw], i) => {
            const headUp = f >= fire + 4 ? 1 : 0;
            const run = f >= flee + i * 2;
            const p: Vec3 = run ? [x + (x > 0 ? 1 : -1) * fled * 6, 0, z - fled * 9] : [x, 0, z];
            const lookAtGun = f >= turn && !run;
            return <Emu3D key={i} position={p} rotation={[0, run ? (x > 0 ? 2.6 : -2.6) : lookAtGun ? yawTo([x, 0, z], gunPos) : yaw + Math.PI, 0]} pose={{ peck: headUp || lookAtGun ? 0 : 0.55 + 0.3 * Math.sin(f * 0.15 + i), neck: 0.5, run: run ? f * 0.35 + i : undefined, eyes: i === 2 || f >= turn ? "half" : "round" }} />;
          })}
          {shooting ? targets.map((t, i) => <Dust key={i} position={[t[0], 0, t[2]]} k={((f - fire - i * 3) % 16) / 16} seed={i} scale={0.7} />) : null}
          <Sandbags position={[0, 0, 1.3]} rotation={[0, 0, 0]} n={5} rows={2} />
          <LewisGun position={gunPos} rotation={[0.04, Math.PI, 0]} scale={1.0} bipod />
          <MuzzleFlash position={[0, 0.66, 0.68]} rotation={[0, Math.PI, 0]} on={shooting && f % 3 === 0} seed={f} />
          <Tracers from={muzzle} to={targets} t={shooting ? f - fire - 2 : -1} dur={jam - fire - 14} />
          <Casings center={[0.35, 0, 2.2]} n={shooting || f > jam ? 18 : 0} r={0.4} />
          <Bean3 p={merP} position={[-1.1, 0, 2.5]} rotation={[0, 2.6, 0]} />
          <Bean3 p={ohP} position={[0.75, 0, 2.55]} rotation={[0, -2.75, 0]} />
          <Bean3 p={{ ...MCMURRAY, kneel: 0.6, expr: f >= jam ? "worried" : "determined" }} position={[1.75, 0, 2.7]} rotation={[0, -2.5, 0]} />
        </Stage>
      )}
      <Vignette />
      <Flash at={jam} dur={5} color="#7fd8ff" />
      {xray ? <Chip at={jam + 6} to={xrayEnd} top={230} color="#ff5a4a">⚠️ PELURU MACET</Chip> : null}
      <Chip at={8} to={wait - 14} top={230}>💧 ±1.000 EMU</Chip>
      <SubWord scene="bendungan" />
    </AbsoluteFill>
  );
};

/* ===================== 7. TRUK ===================== */
export const SceneEmuTruk: React.FC = () => {
  const f = useCurrentFrame();
  const mount = EV("truk.mount");
  const drive = EV("truk.drive");
  const wild = EV("truk.wild");
  const over = EV("truk.overtake");
  const speedEv = EV("truk.speed");
  const stop = EV("truk.stop");
  const D = DUR_EMU("truk");
  const v = 0.22;
  const tx = f < drive ? 0 : f < stop ? -(f - drive) * v : -(stop - drive) * v;
  const driving = f >= drive && f < stop;
  const bounce = driving ? Math.abs(Math.sin(f * 0.9)) * 0.09 : 0;
  const tilt = driving ? Math.sin(f * 0.53) * 0.05 : f >= stop && f < stop + 10 ? Math.sin((f - stop) * 0.9) * 0.08 * (1 - (f - stop) / 10) : 0;
  const cam = shotCam(f, [
    { to: drive, p0: [1.6, 2.1, 4.4], l0: [1.2, 1.3, -0.6], p1: [1.4, 2.0, 4.0], l1: [1.2, 1.3, -0.6], fov: 42 },
    { to: over, p0: [tx + 0.2, 3.3, 8.2], l0: [tx + 0.3, 1.0, 0], fov: 44 },
    { to: D, p0: [tx - 1.5, 3.3, 8.6], l0: [tx - 2.0, 1.0, 0.5], fov: 46 },
  ]);
  if (f >= drive && f < D) {
    cam.pos = [tx + (f < over ? 0.2 : -1.5), cam.pos[1], cam.pos[2]];
    cam.look = [tx + (f < over ? 0.3 : -2.0), cam.look[1], cam.look[2]];
  }
  const mk = rp(f, mount, mount + 16);
  const wildK = f >= wild && driving;
  const gunYaw = 0 + (wildK ? Math.sin(f * 0.7) * 0.6 : 0);
  const gunPitch = wildK ? -0.3 + Math.sin(f * 1.1) * 0.35 : 0;
  // posisi dunia: truk menghadap -x, bak di belakang kabin (+x)
  const bedTop: Vec3 = [tx + 1.05, 0.92 + bounce, 0];
  const gunPos: Vec3 = f < mount ? [1.6, 1.25, -0.9] : lv([1.6, 1.25, -0.9], [bedTop[0], bedTop[1] + 0.55, bedTop[2]], mk);
  const shoot = wildK;
  const sky: Vec3[] = [0, 1, 2, 3, 4].map((i) => [tx - 3 + i * 2, 6 + (i % 3) * 2, 6 + i]);
  const emuSpeed = f < over ? v * 1.0 : v * 1.6;
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={driving ? [0, Math.sin(f * 0.9) * 0.02, 0] : [0, 0, 0]}>
        <Countryside f={f} wheat={[-80, 20, -20, -3]} n={4200} houseAt={[10, 0, -16]} />
        <Road />
        <Fence from={[-70, -2.4]} to={[14, -2.4]} posts={36} />
        <Truck position={[tx, 0, 0]} rotation={[0, -Math.PI / 2, 0]} spin={tx * 2.2} bounce={bounce} tilt={tilt}>
          <T g={G.cyl(0.05, 0.06, 0.5, 10)} c="#26272a" position={[0, 1.17, -1.05]} />
        </Truck>
        <LewisGun position={gunPos} rotation={[gunPitch, gunYaw, 0]} scale={0.85} bipod={f < mount} />
        <MuzzleFlash position={[gunPos[0] + Math.sin(gunYaw) * 0.85, gunPos[1] - gunPitch * 0.85, gunPos[2] + Math.cos(gunYaw) * 0.85]} rotation={[gunPitch, gunYaw, 0]} on={shoot && f % 3 === 0} seed={f} scale={0.8} />
        <Tracers from={[gunPos[0], gunPos[1], gunPos[2] + 0.8]} to={sky} t={shoot ? f - wild : -1} dur={over - wild} speed={0.12} />
        <Bean3
          p={{ ...OHALLORAN, expr: wildK ? "shock" : "determined", handL: [-0.2, 1.0, 0.5], handR: [0.2, 0.95, 0.45], lean: tilt * 3, headTilt: wildK ? Math.sin(f * 0.8) * 0.2 : 0 }}
          position={f < mount ? [1.6, 0, -1.4] : [tx + 1.15, 0.92 + bounce * 1.4, -0.6]}
          rotation={[0, f < mount ? 0.2 : 0.15, tilt * 2]}
        />
        <Bean3 p={{ ...MCMURRAY, expr: f >= mount ? "proud" : "determined", handL: f < mount + 16 ? [-0.25, 1.15, 0.45] : undefined, handR: f < mount + 16 ? [0.25, 1.15, 0.45] : undefined }} position={f < drive ? [0.5, 0, -1.4] : [tx - 0.35, 0.5 + bounce, 0.35]} rotation={[0, f < drive ? 0.3 : -1.57, 0]} scale={f < drive ? 1 : 0.0001} />
        {f >= drive
          ? [0, 1, 2, 3].map((i) => {
              const ex = tx - 1.0 + i * 1.6 - Math.max(0, f - over) * (emuSpeed - v);
              return <Emu3D key={i} position={[ex, 0, 2.5 + (i % 2) * 1.0]} rotation={[0, -Math.PI / 2, 0]} pose={{ run: f * 0.75 + i * 1.3, neck: 0.55, eyes: "half", headTurn: i === 1 && f >= speedEv ? 1.25 : 0 }} />;
            })
          : null}
        {driving ? [0, 1, 2].map((i) => <Dust key={i} position={[tx + 2.4 + i * 0.6, 0, (i - 1) * 0.6]} k={((f + i * 6) % 18) / 18} seed={i + 3} scale={0.8} />) : null}
        <Dust position={[tx - 2.0, 0, 0]} k={(f - stop) / 22} seed={7} scale={1.4} />
      </Stage>
      <Vignette />
      {f >= speedEv ? (
        <div style={{ position: "absolute", top: 210, left: 60, right: 60, display: "flex", gap: 24, opacity: rp(f, speedEv, speedEv + 6) }}>
          {[
            ["🪶 EMU", 50, "#7fe8ff"],
            ["🚚 TRUK", 30, "#ffd23f"],
          ].map(([label, kmh, color]) => (
            <div key={label as string} style={{ flex: 1, background: "rgba(10,14,28,0.86)", border: `4px solid ${color}`, borderRadius: 22, padding: "16px 22px", fontFamily: "Inter, sans-serif", color: "#fff" }}>
              <div style={{ fontWeight: 900, fontSize: 40 }}>{label}</div>
              <div style={{ fontWeight: 900, fontSize: 64, color: color as string }}>{Math.round((kmh as number) * rp(f, speedEv, speedEv + 20))} km/jam</div>
              <div style={{ height: 14, background: "#223", borderRadius: 7, marginTop: 8 }}>
                <div style={{ height: 14, width: `${(((kmh as number) / 50) * 100 * rp(f, speedEv, speedEv + 20)).toFixed(0)}%`, background: color as string, borderRadius: 7 }} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <SubWord scene="truk" />
    </AbsoluteFill>
  );
};

/* ===================== 8. KUTIPAN, KORAN, DITARIK ===================== */
const InsertWrite: React.FC<{ f: number; a: number; b: number }> = ({ f, a, b }) => {
  const text = "They can face machine guns with the invulnerability of tanks.";
  const k = rp(f, a, a + (b - a) * 0.7);
  const cam: Cam = { pos: [0.06, 1.0, 0.62], look: [0, 0, 0.02], fov: 38 };
  const px = -0.11 + ((k * 6) % 1) * 0.24;
  const py = 0.16 - Math.floor(k * 6) * 0.035;
  return (
    <Stage cam={cam} bg="#6a3a22">
      <hemisphereLight args={["#fff4e0", "#6a3a1c", 1.3]} />
      <directionalLight position={[-2, 4, 3]} intensity={1.5} />
      <T g={G.box(2, 0.05, 2)} c="#8a6a42" position={[0, -0.04, 0]} o={false} />
      <Notebook text={text} k={k} position={[0, 0, 0]} />
      <group position={[px, 0.03 + Math.abs(Math.sin(f * 1.3)) * 0.008, -py]} rotation={[0.6, 0, -0.5]}>
        <Pencil scale={1.3} />
        <T g={G.sph(0.06, 14, 10)} c="#e8dccc" position={[0.02, 0.22, 0]} />
        <Limb a={[0.02, 0.24, 0]} b={[0.3, 0.6, 0.2]} r={0.04} c={WARTAWAN.body} />
      </group>
    </Stage>
  );
};
export const SceneEmuKutipan: React.FC = () => {
  const f = useCurrentFrame();
  const talk = EV("kutipan.talk");
  const write = EV("kutipan.write");
  const paper = EV("kutipan.paper");
  const tarik = EV("kutipan.tarik");
  const kirim = EV("kutipan.kirim");
  const pulang = EV("kutipan.pulang");
  const D = DUR_EMU("kutipan");
  const l0 = LN("kutipan", 0);
  const l1 = LN("kutipan", 1);
  const insert = f >= write + 14 && f < l1.to - 10;
  const cam = shotCam(f, [
    { to: paper - 3, p0: [0.3, 1.55, 4.6], l0: [0.25, 1.15, 0.7], p1: [0.3, 1.5, 4.0], l1: [0.25, 1.15, 0.7], fov: 40 },
    { to: tarik - 3, p0: [0, 1.55, 2.9], l0: [0, 1.25, 0], p1: [0, 1.55, 2.6], l1: [0, 1.25, 0], fov: 40 },
    { to: D, p0: [0, 3.4, 15], l0: [0, 0.8, 0], p1: [0, 3.3, 14.5], l1: [0, 0.8, 0], fov: 46 },
  ]);
  if (f >= l1.to - 10 && f < paper - 3) {
    // keluar dari close-up buku: menjauh pelan ke shot kemah
    const k = rp(f, l1.to - 10, l1.to + 12);
    cam.pos = lv([1.7, 1.65, 2.6], cam.pos, k);
    cam.look = lv([0.85, 1.0, 1.4], cam.look, k);
  }
  const scene = f < paper - 3 ? "camp" : f < tarik - 3 ? "paper" : "road";
  // truk: ditarik (keluar ke kiri), dikirim lagi (masuk), pulang (keluar)
  const truckX = f < kirim ? lerp(0, -5.5, rp(f, tarik, kirim)) : f < pulang ? lerp(5.5, 0, rp(f, kirim, Math.min(pulang - 2, kirim + 30))) : lerp(0, -7, rp(f, pulang, pulang + 45));
  const truckYaw = f >= kirim && f < pulang ? -Math.PI / 2 : -Math.PI / 2;
  const merTalk = Math.max(talkAt(f, l1), talkAt(f, l0) * 0);
  return (
    <AbsoluteFill>
      {insert ? (
        <InsertWrite f={f} a={write + 14} b={l1.to - 10} />
      ) : scene === "camp" ? (
        <Stage cam={cam}>
          <Countryside f={f} wheat={[-18, 18, -22, -6]} n={1500} />
          <Camp position={[0, 0, -0.6]} t={f} />
          <Bean3 p={{ ...MEREDITH, expr: f >= talk ? "worried" : "determined", talk: merTalk, look: 0.5, handR: f >= talk ? [0.45, 1.0 + 0.1 * Math.sin(f * 0.2), 0.35] : undefined }} position={[-0.45, 0, 0.75]} rotation={[0, 0.55, 0]} />
          <Bean3 p={{ ...WARTAWAN, expr: f >= write ? "shock" : "neutral", look: -0.5, handL: [-0.2, 0.95, 0.45], handR: [0.12, 0.98 + (f >= write ? Math.abs(Math.sin(f * 1.2)) * 0.03 : 0), 0.47] }} position={[0.95, 0, 0.95]} rotation={[0, -0.6, 0]}>
            <Notebook text="They can face machine guns with the invulnerability of tanks." k={rp(f, write, l1.to)} position={[-0.08, 0.98, 0.5]} rotation={[0.9, 0, 0]} scale={0.6} />
            <Pencil position={[0.12, 1.0, 0.5]} rotation={[0.5, 0, -0.4]} scale={0.8} />
          </Bean3>
        </Stage>
      ) : scene === "paper" ? (
        <Stage cam={cam}>
          <Countryside f={f} wheat={[-18, 18, -22, -3]} n={1500} />
          <Bean3 p={{ ...PAKTOM2, expr: "laugh", bob: Math.abs(Math.sin(f * 0.7)) * 0.05, handL: [-0.32, 0.95, 0.42], handR: [0.32, 0.95, 0.42] }} position={[0, 0, 0]}>
            <Newspaper position={[0, 0.95, 0.5]} rotation={[-0.25, 0, 0]} scale={0.75} />
          </Bean3>
          <Bean3 p={{ ...PAKBILL, expr: "laugh", bob: Math.abs(Math.sin(f * 0.7 + 1)) * 0.05 }} position={[-1.15, 0, -0.6]} rotation={[0, 0.5, 0]} />
        </Stage>
      ) : (
        <Stage cam={cam}>
          <Countryside f={f} wheat={[-18, 18, -22, -2.6]} n={2200} />
          <Road />
          <Truck position={[truckX, 0, 0]} rotation={[0, truckYaw, 0]} spin={truckX * 2.2} bounce={Math.abs(Math.sin(f * 0.8)) * 0.03} />
          <Emu3D position={[3.5, 0, -3.2]} rotation={[0, -1.2, 0]} pose={{ neck: 0.3, eyes: "half", headTurn: Math.sin(f * 0.05) * 0.5 }} />
          <Emu3D position={[-3.6, 0, -3.6]} rotation={[0, 1.4, 0]} pose={{ peck: Math.max(0, Math.sin(f * 0.25)) * 0.8, neck: 0.5 }} />
        </Stage>
      )}
      <Vignette />
      <Chip at={tarik} to={kirim - 2} top={230}>📅 8 NOV · DITARIK</Chip>
      <Chip at={kirim} to={pulang - 2} top={230}>📅 13 NOV · DIKIRIM LAGI</Chip>
      <Chip at={pulang} to={D} top={230}>📅 10 DES · PULANG</Chip>
      <SubWord scene="kutipan" />
    </AbsoluteFill>
  );
};

/* ===================== 9. AKHIR ===================== */
export const SceneEmuAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const walkEv = EV("akhir.walk");
  const pick = EV("akhir.pick");
  const wear = EV("akhir.wear");
  const title = EV("akhir.title");
  const D = DUR_EMU("akhir");
  const hatGround: Vec3 = [0, 0, 0];
  const start: Vec3 = [2.0, 0, -0.9];
  const stand: Vec3 = [0.2, 0, 0.35];
  const wk = rp(f, walkEv, pick - 10);
  const pos = lv(start, stand, wk);
  const peck = f < pick - 10 ? 0 : f < pick + 4 ? rp(f, pick - 10, pick) : 1 - rp(f, pick + 4, wear - 2);
  const pose: EmuPose = { neck: 0.25 + 0.55 * peck, peck, run: wk > 0 && wk < 1 ? f * 0.4 : undefined, eyes: f >= wear ? "half" : "round", headTilt: f >= wear + 6 ? Math.sin(f * 0.1) * 0.15 : 0 };
  const yaw = wk < 1 ? yawTo(start, stand) : lerp(yawTo(start, stand), 0.35, rp(f, pick + 4, wear));
  const hl = emuHeadLocal(pose);
  const headW: Vec3 = [pos[0] + hl[2] * Math.sin(yaw), hl[1], pos[2] + hl[2] * Math.cos(yaw)];
  const beak: Vec3 = [headW[0] + Math.sin(yaw) * 0.14, headW[1] - 0.02, headW[2] + Math.cos(yaw) * 0.14];
  // topi tergeletak di atas tumpukan peti, tepat di titik paruh saat mematuk
  const y0 = yawTo(start, stand);
  const hp0: Vec3 = [stand[0] + Math.sin(y0) * 1.28, 0.64, stand[2] + Math.cos(y0) * 1.28];
  const flip = rp(f, wear - 2, wear + 6);
  const hatPos: Vec3 = f < pick ? hp0 : f < wear - 2 ? beak : lv(beak, [headW[0], headW[1] + 0.03, headW[2]], flip);
  const hatRot: Vec3 = f < pick ? [0.05, 0.4, 0.1] : f < wear - 2 ? [1.3, yaw, 0] : [lerp(1.3, -0.15, flip) + flip * Math.PI * 2, yaw, 0];
  const cam = shotCam(f, [
    { to: walkEv, p0: [0, 6, 13], l0: [0, 0.6, -2], p1: [0, 5, 11], l1: [0, 0.6, -2], fov: 42 },
    { to: title, p0: [1.8, 1.9, 6.4], l0: [0.6, 1.0, 0.2], p1: [1.3, 2.0, 5.0], l1: [0.25, 1.4, 0.35], fov: 40 },
    { to: D, p0: [1.3, 2.0, 5.0], l0: [0.25, 1.4, 0.35], p1: [1.9, 2.4, 7.4], l1: [0.25, 1.2, 0.2], fov: 40 },
  ]);
  const tk = rp(f, title, title + 10);
  const close: Cam = { pos: [beak[0] + 2.0, beak[1] + 0.45, beak[2] + 1.6], look: [beak[0], beak[1] + 0.05, beak[2]], fov: 38 };
  const camF: Cam =
    f >= pick - 12 && f < pick + 18 ? close : f >= pick + 18 && f < pick + 40 ? { pos: lv(close.pos, cam.pos, rp(f, pick + 18, pick + 40)), look: lv(close.look, cam.look, rp(f, pick + 18, pick + 40)), fov: lerp(38, cam.fov, rp(f, pick + 18, pick + 40)) } : cam;
  return (
    <AbsoluteFill>
      <Stage cam={camF}>
        <Countryside f={f} clear={[[0.4, 0.4, 1.4]]} n={2600} />
        <Casings center={[0, 0, 1.2]} n={40} r={1.6} seed={7} />
        <AmmoCrate position={[hp0[0], 0.15, hp0[2]]} rotation={[0, 0.4, 0]} />
        <AmmoCrate position={[hp0[0], 0.45, hp0[2]]} rotation={[0, 0.2, 0]} />
        <AmmoCrate position={[1.6, 0.15, 1.6]} rotation={[0, -0.4, 0]} />
        {[
          [-3, -2.5],
          [3.5, -3],
          [-1.5, -5],
          [2, -6],
          [-4.5, -6.5],
          [5, -7],
        ].map(([x, z], i) => (
          <Emu3D key={i} position={[x, 0, z]} rotation={[0, i * 1.7, 0]} pose={{ peck: Math.max(0, Math.sin(f * 0.22 + i * 1.3)) * 0.8, neck: 0.45, eyes: i % 2 ? "half" : "round" }} />
        ))}
        <Emu3D position={pos} rotation={[0, yaw, 0]} pose={pose} />
        <group position={hatPos} rotation={hatRot} scale={0.55}>
          <Hat kind="peaked" c={MEREDITH.hatColor!} band={MEREDITH.hatBand!} r={HEAD_R} />
        </group>
      </Stage>
      <Vignette />
      <Chip at={10} to={walkEv - 4} top={230}>🟡 RIBUAN PELURU</Chip>
      {f >= title ? (
        <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", fontFamily: "Inter, sans-serif", transform: `scale(${0.7 + 0.3 * tk})`, opacity: tk }}>
          <div style={{ fontWeight: 900, fontSize: 104, color: "#fff", WebkitTextStroke: "0px", textShadow: "0 0 0 #000, 6px 6px 0 #0c0c10, -3px -3px 0 #0c0c10, 3px -3px 0 #0c0c10, -3px 3px 0 #0c0c10" }}>PERANG EMU</div>
          <div style={{ fontWeight: 900, fontSize: 72, color: "#ffd23f", textShadow: "5px 5px 0 #0c0c10, -3px -3px 0 #0c0c10, 3px -3px 0 #0c0c10, -3px 3px 0 #0c0c10" }}>1932</div>
          <div style={{ display: "inline-block", marginTop: 26, background: "rgba(10,14,28,0.88)", border: "5px solid #ffd23f", borderRadius: 26, padding: "14px 34px", fontWeight: 900, fontSize: 58, color: "#fff" }}>🏆 PEMENANG: EMU</div>
        </div>
      ) : null}
      <SubWord scene="akhir" />
    </AbsoluteFill>
  );
};

import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import timing from "./napoleon_timing.json";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import { RabbitCard } from "./three/objectsKelinci";
import { ToonSky } from "./three/toon";
import { Chip, Emote, Insert, Stamp } from "./scenesKelelawar";
import { AJUDAN, KAISAR, PENGAWAL, PETANI } from "./SheetNapoleon";

export type NpScene = "hook" | "tilsit" | "ide" | "ternak" | "hari" | "serbu" | "kereta" | "akhir";
export const NP_ORDER = timing.order as NpScene[];
export const TOTAL_FRAMES_NAPOLEON = timing.totalFrames;
const DUR = (k: NpScene): number => (timing.scenes as Record<string, { durationInFrames: number }>)[k].durationInFrames;

type Word = { w: string; from: number; to: number };
type Line = { voice: string; style: string; text: string; from: number; to: number; words: Word[] };
const LINES = timing.lines as unknown as Record<NpScene, Line[]>;
const FONT_BODY = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
const ramp = (f: number, a: number, len: number) => smoother(cl((f - a) / len));
const pulse = (f: number, at: number, len = 10) => {
  const d = f - at;
  return d < 0 || d > len ? 0 : Math.sin((d / len) * Math.PI);
};
const lineAt = (s: NpScene, i: number): Line => LINES[s][i];
const wordF = (s: NpScene, i: number, w: string): number => {
  const ln = LINES[s][i];
  const hit = ln.words.find((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(w.toLowerCase()));
  return hit ? hit.from : ln.from;
};
const mouth = (s: NpScene, voice: string, f: number, skip: number[] = []): number => {
  const lines = LINES[s];
  for (let i = 0; i < lines.length; i++) {
    if (skip.includes(i) || lines[i].voice !== voice) continue;
    for (const w of lines[i].words) if (f >= w.from - 1 && f <= w.to + 1) return 0.3 + 0.7 * Math.abs(Math.sin((f - w.from) * 0.9 + w.from));
  }
  return 0;
};
const speaking = (s: NpScene, i: number, f: number) => f >= LINES[s][i].from - 2 && f <= LINES[s][i].to + 2;
const nod = (s: NpScene, voice: string, f: number) => {
  let v = 0;
  for (const ln of LINES[s]) if (ln.voice === voice) for (const w of ln.words) if (w.w.length > 5) v += pulse(f, w.from - 1, 8) * 5;
  return v;
};

/* ---------------------------------------------------------------- dunia (GLB Blender) */
const OX = { L1: 0, L2: 400, L3: 800, L4: 1200, L5: 1600 };
type Latar = "L1_Rakit" | "L2_Tenda" | "L3_Peternakan" | "L4_Lapangan" | "L5_Kereta";
/** koordinat Blender -> Three.js: X=X, Y=Z (tinggi), Z=-Y */
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];

let cache: Promise<THREE.Group> | null = null;
const loadWorld = (): Promise<THREE.Group> => {
  if (!cache) {
    cache = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        staticFile("models/napoleon.glb"),
        (g) => {
          g.scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              const nm = m.name;
              m.castShadow = !(nm.includes("Water") || nm.includes("Meadow") || nm.includes("Dirt") || nm.includes("Langit") || nm.includes("Hill"));
              m.receiveShadow = !nm.includes("Langit");
              m.frustumCulled = false;
            }
          });
          resolve(g.scene);
        },
        undefined,
        reject,
      );
    });
  }
  return cache;
};

const World: React.FC<{ active: Latar }> = ({ active }) => {
  const invalidate = useThree((st) => st.invalidate);
  const advance = useThree((st) => st.advance);
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [h] = useState(() => delayRender("napoleon.glb"));
  useEffect(() => {
    loadWorld().then(setScene).catch((e) => { console.error(e); continueRender(h); });
  }, [h]);
  useEffect(() => {
    if (!scene) return;
    invalidate();
    const id = setTimeout(() => { invalidate(); advance(performance.now() / 1000, true); continueRender(h); }, 500);
    return () => clearTimeout(id);
  }, [scene, h, invalidate, advance]);
  const inst = useMemo(() => {
    if (!scene) return null;
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.visible = o.name.startsWith(active) || o.name.startsWith("Langit");
    });
    return c;
  }, [scene, active]);
  return inst ? <primitive object={inst} /> : null;
};

type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };
type Shot = { to: number; p0: Vec3; p1?: Vec3; l0: Vec3; l1?: Vec3; fov?: number; fov1?: number; roll0?: number; roll1?: number; creep?: number; ease?: "out" };
const shotCam = (frame: number, shots: Shot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, s.to - start);
      const local = frame - start;
      const x = cl(local / len);
      const k = s.ease === "out" ? 1 - Math.pow(1 - x, 3) : smoother(x);
      const look = lerpV(s.l0, s.l1 ?? s.l0, k);
      const p = lerpV(s.p0, s.p1 ?? s.p0, k);
      const push = 1 - (s.creep ?? 0.0006) * Math.min(local, 400);
      const pos: Vec3 = [look[0] + (p[0] - look[0]) * push, look[1] + (p[1] - look[1]) * push, look[2] + (p[2] - look[2]) * push];
      const f0 = s.fov ?? 38;
      return { pos, look, fov: lerpN(f0, s.fov1 ?? f0, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 38, roll: 0 };
};
/** kamera terbang di sepanjang kurva Catmull-Rom (pola fly-through sekolah) */
const pathCam = (frame: number, t0: number, t1: number, P: Vec3[], Lk: Vec3[], fov0: number, fov1: number): Cam => {
  const k = smoother(cl((frame - t0) / Math.max(1, t1 - t0)));
  const pc = new THREE.CatmullRomCurve3(P.map((v) => new THREE.Vector3(...v)), false, "catmullrom", 0.4);
  const lc = new THREE.CatmullRomCurve3(Lk.map((v) => new THREE.Vector3(...v)), false, "catmullrom", 0.4);
  const p = pc.getPoint(k);
  const l = lc.getPoint(k);
  return { pos: [p.x, p.y, p.z], look: [l.x, l.y, l.z], fov: lerpN(fov0, fov1, k), roll: 0 };
};
const kick = (f: number, hits: number[], amp = 0.1, len = 12): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < len) {
      const a = (1 - d / len) * amp;
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
  camera.lookAt(cam.look[0] + shake[0] * 0.5, cam.look[1] + shake[1] * 0.5, cam.look[2]);
  camera.rotateZ((cam.roll * Math.PI) / 180);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};
const SkyFollow: React.FC<{ cam: Cam; night?: boolean }> = ({ cam, night }) => (
  <group position={cam.pos}>
    {night ? <ToonSky top="#0c1230" horizon="#34447a" bottom="#34447a" r={900} /> : <ToonSky top="#4a86d8" horizon="#f6f0dc" bottom="#f6f0dc" r={900} />}
  </group>
);

type PL = { p: Vec3; i: number };
const Stage: React.FC<{ cam: Cam; active: Latar; focus: Vec3; shake?: Vec3; interior?: boolean; night?: boolean; pts?: PL[]; children: React.ReactNode }> = ({
  cam, active, focus, shake, interior = false, night = false, pts = [], children,
}) => {
  const { width, height } = useVideoConfig();
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <AbsoluteFill style={{ background: night ? "#0c1230" : "#f6f0dc" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.1, far: 1500, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <SkyFollow cam={cam} night={night} />
        <hemisphereLight args={night ? ["#7a8ad8", "#2a2038", 0.7] : interior ? ["#fff4e0", "#a08060", 1.15] : ["#ffffff", "#a89878", 1.55]} />
        <primitive object={target} position={focus} />
        <directionalLight
          target={target}
          position={[focus[0] + 26, focus[1] + 42, focus[2] + 30]}
          intensity={night ? 0.25 : interior ? 1.6 : 2.5}
          color={night ? "#8090ff" : "#fff0d8"}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-32}
          shadow-camera-right={32}
          shadow-camera-top={32}
          shadow-camera-bottom={-32}
          shadow-camera-near={1}
          shadow-camera-far={140}
          shadow-bias={-0.0006}
        />
        {pts.map((q, i) => (
          <pointLight key={i} position={q.p} intensity={q.i} distance={16} decay={1.6} color="#ffd9a0" />
        ))}
        <World active={active} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const Grade: React.FC<{ warm?: number; dark?: number; flash?: number }> = ({ warm = 0, dark = 0, flash = 0 }) => (
  <>
    {warm > 0 && <AbsoluteFill style={{ mixBlendMode: "soft-light", background: `rgba(255,170,90,${0.3 * warm})` }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(28,10,24,0.42) 100%)" }} />
    {dark > 0 && <AbsoluteFill style={{ background: `rgba(10,14,40,${dark})` }} />}
    {flash > 0 && <AbsoluteFill style={{ background: "#fff8e0", opacity: flash }} />}
  </>
);

export const NapoleonCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cue = timing.captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const sp = spring({ frame: frame - cue.startFrame, fps, config: { damping: 12, stiffness: 250 } });
  const txt = cue.text.toLowerCase();
  const size = Math.min(92, 760 / (Math.max(4, txt.length) * 0.52));
  const ara = cue.voice === "ara";
  return (
    <div style={{ position: "absolute", top: 1370, left: 60, right: 60, textAlign: "center", pointerEvents: "none" }}>
      <span style={{ display: "inline-block", fontFamily: FONT_BODY, fontWeight: 900, fontSize: size, lineHeight: 1.1, color: ara ? "#ffd6ea" : "#ffffff", WebkitTextStroke: `7px ${ara ? "#5a1838" : "rgba(24,10,28,0.96)"}`, paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(24,10,28,0.72)", transform: `scale(${0.7 + 0.3 * sp}) rotate(${(1 - sp) * (ara ? 4 : -4)}deg)`, opacity: Math.min(1, sp * 1.6) }}>
        {txt}
      </span>
    </div>
  );
};
export const DissolveNp: React.FC<{ first?: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: first ? 1 : interpolate(f, [0, 8], [0, 1], clamp) }}>{children}</AbsoluteFill>;
};

/* ---------------------------------------------------------------- tokoh */
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({
  bob: Math.abs(Math.sin(t * 1.8 + k)) * 3,
  armL: [-8 + Math.sin(t * 1.3 + k) * 4, -10],
  armR: [8 - Math.sin(t * 1.3 + k) * 4, -10],
  blink: (t + k * 0.7) % 3.1 < 0.11,
  headTilt: Math.sin(t * 0.9 + k) * 2,
});
const gesture = (f: number, m: number, k = 0): Partial<BeanParams> =>
  m > 0 ? { armR: [40 + Math.sin(f * 0.25 + k) * 25, -40 + Math.sin(f * 0.37 + k) * 20], armL: [-14 - Math.sin(f * 0.2 + k) * 10, -18] } : {};
const H_K = 2.0;
const H_A = 1.9;

type RB = { id: number; pos: Vec3; flip: boolean; pose: "sit" | "hop"; expr: "polos" | "lapar" | "kenyang" | "kaget"; size: number; fur: string; mouth?: number };
const FURS = ["#f1ece2", "#f1ece2", "#cdb594", "#e8dccb", "#8a6a4a", "#f6f2ea"];
/** kawanan kelinci berlari dari titik `from` ke sekitar `to`; mengelilingi sasaran bila `ring` */
const Swarm: React.FC<{ n: number; from: Vec3; to: Vec3; t0: number; t1: number; spread?: number; ring?: number; seed?: number; size?: number; around?: number }> = ({
  n, from, to, t0, t1, spread = 1.2, ring = 0, seed = 1, size = 0.7, around = 0,
}) => {
  const f = useCurrentFrame();
  const items: RB[] = [];
  for (let i = 0; i < n; i++) {
    const r = (k: number) => {
      const x = Math.sin((i + 1) * 12.9898 * k + seed * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const delay = r(1) * 0.5;
    const p = smoother(cl((f - t0 - delay * (t1 - t0) * 0.5) / ((t1 - t0) * 0.55)));
    const a = r(2) * Math.PI * 2;
    const rad = ring > 0 ? ring * (0.65 + 0.5 * r(3)) : spread * r(3);
    const end: Vec3 = [to[0] + Math.cos(a) * rad, to[1], to[2] + Math.sin(a) * rad * 0.7];
    const start: Vec3 = [from[0] + (r(4) - 0.5) * spread, from[1], from[2] + (r(5) - 0.5) * 0.6];
    const moving = p > 0.02 && p < 0.98;
    const wig = around > 0 ? Math.sin(f * 0.25 + i) * around : 0;
    const pos = lerpV(start, end, p);
    const hop = moving ? Math.abs(Math.sin((f + i * 5) * 0.5)) * 0.28 : around > 0 ? Math.abs(Math.sin((f + i * 3) * 0.4)) * 0.12 : 0;
    items.push({
      id: i,
      pos: [pos[0] + wig, pos[1] + hop, pos[2]],
      flip: end[0] < start[0],
      pose: moving || around > 0 ? "hop" : "sit",
      expr: "lapar",
      size: size * (0.8 + 0.4 * r(6)),
      fur: FURS[Math.floor(r(7) * FURS.length)],
      mouth: moving ? 0.5 : 0.1,
    });
  }
  return (
    <>
      {items.map((it) => (
        <RabbitCard key={it.id} position={it.pos} size={it.size} flip={it.flip} shadow={false} params={{ pose: it.pose, expr: it.expr, fur: it.fur, mouth: it.mouth }} />
      ))}
    </>
  );
};

/* ================================================================== */
/* 1. HOOK — terbang di atas sungai menuju paviliun                   */
/* ================================================================== */
export const SceneNpHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("hook");
  const L1 = lineAt("hook", 1);
  const cam = pathCam(f, 0, dur, [bl(-17, -27, 12), bl(-9, -20, 8.6), bl(-2, -13, 5.4), bl(1.2, -8.0, 3.6)], [bl(0, 0, 3.4), bl(0.4, -1, 3.3), bl(1.0, -3.4, 3.1), bl(1.0, -3.5, 3.0)], 38, 44);
  const peek = ramp(f, 40, 24);
  const grin = f >= L1.from + 6;
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L1_Rakit" focus={bl(0, -4, 1)}>
        <RabbitCard position={bl(5.6, -5.0, 0.76)} size={1.1} params={{ pose: "sit", expr: grin ? "lapar" : "polos", mouth: grin ? 0.5 * Math.abs(Math.sin(t * 9)) : 0 }} />
        <RabbitCard position={bl(6.6, -4.2, 0.76)} size={0.9} flip params={{ pose: "sit", expr: "polos", fur: "#cdb594" }} />
        <group position={[0, -peek * 3, 0]} />
      </Stage>
      <Grade />
      <Chip from={10} to={dur - 20} top={170} color="#7a1f1f" size={54}>KONON · JULI 1807</Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. TILSIT — ruang perjanjian                                        */
/* ================================================================== */
export const SceneNpTilsit: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("tilsit");
  const L0 = lineAt("tilsit", 0), L1 = lineAt("tilsit", 1), L2 = lineAt("tilsit", 2), L3 = lineAt("tilsit", 3), L4 = lineAt("tilsit", 4);
  const sign = wordF("tilsit", 0, "menandatangani");
  const flyEnd = 84;
  const cam = f < flyEnd
    ? pathCam(f, 0, flyEnd, [bl(1.2, -7.5, 3.5), bl(1.6, -4.6, 3.1), bl(3.2, -5.2, 3.2)], [bl(0.4, 0.6, 2.3), bl(0.5, 0.4, 1.9), bl(0.5, 0.2, 1.6)], 44, 50)
    : shotCam(f - flyEnd, [
        { to: L2.from - flyEnd - 10, p0: bl(3.2, -5.2, 3.2), p1: bl(3.0, -4.9, 3.1), l0: bl(0.5, 0.2, 1.6), fov: 50, fov1: 46 },
        { to: L4.from - flyEnd, p0: bl(3.0, -4.9, 3.1), p1: bl(2.7, -4.5, 3.0), l0: bl(0.4, 0.3, 1.6), fov: 46, fov1: 42 },
        { to: dur, p0: bl(2.7, -4.5, 3.0), p1: bl(3.4, -5.4, 3.2), l0: bl(0.4, 0.3, 1.6), fov: 42, fov1: 50 },
      ]);
  const mK = mouth("tilsit", "dodi", f, [0]);
  const mA = mouth("tilsit", "ara", f);
  const kaisar = bean(KAISAR, {
    ...idle(t, 0),
    ...gesture(f, speaking("tilsit", 4, f) ? mK : 0, 1),
    expr: speaking("tilsit", 2, f) ? "sleepy" : speaking("tilsit", 4, f) ? "smug" : f < L2.from ? "smug" : "neutral",
    mouthOpen: mK,
    headTilt: nod("tilsit", "dodi", f) - (speaking("tilsit", 2, f) ? 8 : 0),
    armR: f >= sign - 10 && f < sign + 60 ? [38 + Math.sin(f * 0.6) * 6, -70] : [8, -10],
    prop: f >= sign - 10 && f < sign + 60 ? "pen" : "none",
    propHand: "R",
    lean: speaking("tilsit", 4, f) ? 4 : 0,
  });
  const ajudan = bean(AJUDAN, {
    ...idle(t, 3),
    expr: speaking("tilsit", 1, f) ? "happy" : speaking("tilsit", 3, f) ? "shock" : f >= L4.from ? "think" : "happy",
    mouthOpen: mA,
    headTilt: nod("tilsit", "ara", f) + (speaking("tilsit", 3, f) ? 8 : 0),
    armL: speaking("tilsit", 1, f) ? [-120 - Math.sin(f * 0.8) * 20, -70] : [-8, -10],
    bob: speaking("tilsit", 1, f) ? Math.abs(Math.sin(t * 7)) * 6 : 2,
  });
  const pts: PL[] = [{ p: bl(0, 0.2, 3.4), i: 55 }, { p: bl(-1.5, 0.3, 2.6), i: 14 }, { p: bl(1.5, 0.3, 2.6), i: 14 }, { p: bl(2.0, -2.5, 3.2), i: 20 }];
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L1_Rakit" focus={bl(0, 0, 2)} interior pts={pts}>
        <BeanCard position={bl(-0.7, 1.7, 0.92)} height={H_K} params={kaisar} />
        <BeanCard position={bl(1.5, -1.5, 0.92)} height={H_A} params={ajudan} />
      </Stage>
      <Grade warm={0.3} />
      <Insert kind="write" from={sign - 6} len={46} />
      <Chip from={4} to={flyEnd + 30} top={170} color="#1e3f8a" size={50}>TILSIT · PERJANJIAN DAMAI</Chip>
      <Emote x={720} y={640} from={L3.from} to={L3.from + 20} text="?" color="#5a1838" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. IDE — tenda markas                                               */
/* ================================================================== */
export const SceneNpIde: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("ide");
  const L0 = lineAt("ide", 0), L1 = lineAt("ide", 1), L2 = lineAt("ide", 2), L3 = lineAt("ide", 3);
  const cam = shotCam(f, [
    { to: L1.from, p0: bl(4.4, -4.9, 2.7, OX.L2), p1: bl(4.1, -4.6, 2.6, OX.L2), l0: bl(0.3, 0.5, 1.45, OX.L2), fov: 52, fov1: 48 },
    { to: L3.from, p0: bl(4.1, -4.6, 2.6, OX.L2), p1: bl(3.6, -4.1, 2.5, OX.L2), l0: bl(0.3, 0.4, 1.5, OX.L2), fov: 46, fov1: 42 },
    { to: dur, p0: bl(3.6, -4.1, 2.5, OX.L2), p1: bl(4.4, -4.9, 2.7, OX.L2), l0: bl(0.3, 0.4, 1.5, OX.L2), fov: 42, fov1: 52 },
  ]);
  const mK = mouth("ide", "dodi", f);
  const mA = mouth("ide", "ara", f);
  const slam = pulse(f, L1.from + 18, 8);
  const count = ramp(f, L2.from + 20, 50);
  const kaisar = bean(KAISAR, {
    ...idle(t, 0),
    expr: speaking("ide", 1, f) ? "happy" : speaking("ide", 3, f) ? "smug" : "neutral",
    mouthOpen: mK,
    headTilt: nod("ide", "dodi", f),
    armR: speaking("ide", 1, f) ? [60 + slam * 40, -50] : speaking("ide", 3, f) ? [lerpN(60, 150, ramp(f, L3.from + 40, 14)), -20] : [8, -10],
    armL: speaking("ide", 3, f) ? [-lerpN(60, 150, ramp(f, L3.from + 40, 14)), -20] : [-8, -10],
    bob: speaking("ide", 1, f) ? Math.abs(Math.sin(t * 8)) * 8 : 2,
  });
  const ajudan = bean(AJUDAN, {
    ...idle(t, 3),
    expr: speaking("ide", 0, f) ? "happy" : speaking("ide", 2, f) ? "think" : "happy",
    mouthOpen: mA,
    headTilt: nod("ide", "ara", f),
    prop: "paper",
    propHand: "R",
    armR: speaking("ide", 2, f) ? [lerpN(50, 70, count), -80 + Math.sin(f * 0.5) * 8] : [30, -60],
  });
  const pts: PL[] = [{ p: bl(0, 0, 4.0, OX.L2), i: 55 }, { p: bl(1.4, 1.0, 2.1, OX.L2), i: 10 }, { p: bl(-5.2, -2.6, 1.3, OX.L2), i: 10 }];
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L2_Tenda" focus={bl(0, 0, 1.5, OX.L2)} interior pts={pts}>
        <BeanCard position={bl(-0.9, 2.0, 0.27, OX.L2)} height={H_K} params={kaisar} />
        <BeanCard position={bl(1.6, -1.5, 0.27, OX.L2)} height={H_A} params={ajudan} />
      </Stage>
      <Grade warm={0.3} />
      <Chip from={4} to={L0.from + 60} top={170} color="#7a1f1f" size={50}>TENDA MARKAS · TILSIT</Chip>
      <Emote x={560} y={560} from={L1.from + 10} to={L2.from} text="!" color="#c0302a" />
      <Stamp text="RATUSAN!" from={L3.from + 40} to={dur - 12} color="#b91c1c" top={430} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. TERNAK — peternakan kelinci                                      */
/* ================================================================== */
export const SceneNpTernak: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("ternak");
  const L0 = lineAt("ternak", 0), L1 = lineAt("ternak", 1), L2 = lineAt("ternak", 2), L3 = lineAt("ternak", 3);
  const cam = shotCam(f, [
    { to: L1.from, p0: bl(-7, -13.5, 2.6, OX.L3), p1: bl(-5, -11, 2.4, OX.L3), l0: bl(0.5, -1, 2.0, OX.L3), fov: 50, fov1: 46 },
    { to: L3.from, p0: bl(-3.6, -10.2, 2.0, OX.L3), p1: bl(-2.0, -8.8, 1.9, OX.L3), l0: bl(0.9, -2.8, 1.4, OX.L3), fov: 46, fov1: 40 },
    { to: dur, p0: bl(-2.0, -8.8, 1.9, OX.L3), p1: bl(-7, -14, 2.8, OX.L3), l0: bl(0.9, -2.8, 1.5, OX.L3), fov: 40, fov1: 50, ease: "out" },
  ]);
  const walk = ramp(f, 4, 70);
  const mA = mouth("ternak", "ara", f);
  const snap = pulse(f, wordF("ternak", 1, "beli") - 3, 10);
  const araPos: Vec3 = bl(lerpN(-3.0, -0.2, walk), -3.2, 0.06, OX.L3);
  const petaniPos: Vec3 = bl(1.9, -2.4, 0.06, OX.L3);
  const hand = ramp(f, L2.from + 6, 55);
  const petaniP = bean(PETANI, { ...idle(t, 2), expr: f >= L2.from ? "happy" : "neutral", armR: f < L2.from + 6 ? [30, -30] : [lerpN(50, 80, hand), lerpN(-60, -35, hand)] });
  const araP = bean(AJUDAN, {
    ...idle(t, 3),
    expr: speaking("ternak", 1, f) ? "think" : f >= L2.from ? "happy" : "neutral",
    mouthOpen: mA,
    headTilt: nod("ternak", "ara", f),
    armR: snap > 0 ? [120 + snap * 20, -50] : f >= L2.from + 20 ? [lerpN(10, 70, hand), lerpN(-10, -50, hand)] : [8, -10],
    bob: f < 74 ? Math.abs(Math.sin(t * 5)) * 5 : 2,
  });
  const camPos = cam.pos;
  const hP = beanHandWorld(petaniP, "R", petaniPos, 2.0, camPos);
  const hA = beanHandWorld(araP, "R", araPos, H_A, camPos);
  const rabPos = lerpV(hP, hA, ramp(f, L2.from + 28, 28));
  const chew = f > L2.from + 60 ? Math.abs(Math.sin(t * 10)) * 0.8 : 0;
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L3_Peternakan" focus={bl(0, -2, 1, OX.L3)}>
        <BeanCard position={petaniPos} height={2.0} params={petaniP} />
        <BeanCard position={araPos} height={H_A} params={araP} />
        <RabbitCard position={[rabPos[0], rabPos[1] - 0.14, rabPos[2] + 0.1]} size={0.62} params={{ pose: "sit", expr: f > L2.from + 60 ? "kenyang" : "polos", mouth: chew }} shadow={false} />
        <RabbitCard position={bl(-3.2, -3.0, 0.06, OX.L3)} size={0.8} params={{ pose: "sit", expr: "polos" }} />
        <RabbitCard position={bl(5.0, -4.2, 0.06, OX.L3)} size={0.8} flip params={{ pose: "hop", expr: "polos", fur: "#cdb594" }} />
        <RabbitCard position={bl(-6.0, -2.0, 0.06, OX.L3)} size={0.8} params={{ pose: "sit", expr: "polos", fur: "#8a6a4a" }} />
      </Stage>
      <Grade />
      <Chip from={4} to={L1.from} top={170} color="#2f6a3a" size={50}>PETERNAKAN KELINCI</Chip>
      <Emote x={420} y={640} from={wordF("ternak", 1, "beli") - 4} to={wordF("ternak", 1, "beli") + 24} text="AH!" color="#d99a00" />
      <Chip from={L3.from + 40} to={dur - 6} top={190} color="#b45309" size={46}>TERLALU JINAK!</Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. HARI — lapangan perburuan, kandang dibuka                        */
/* ================================================================== */
const K_POS: Vec3 = bl(-2.0, -7.2, 0, OX.L4);
const CAGE_DOOR: Vec3 = bl(14, -5.4, 0.2, OX.L4);
export const SceneNpHari: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("hari");
  const L0 = lineAt("hari", 0), L1 = lineAt("hari", 1), L2 = lineAt("hari", 2), L3 = lineAt("hari", 3), L4 = lineAt("hari", 4), L5 = lineAt("hari", 5);
  const cam = shotCam(f, [
    { to: L1.from, p0: bl(-12, -22, 11, OX.L4), p1: bl(-6, -17, 5.0, OX.L4), l0: bl(3, -2, 1.5, OX.L4), l1: bl(2, -6, 1.6, OX.L4), fov: 40, fov1: 38 },
    { to: L3.from, p0: bl(-5.5, -14.5, 2.6, OX.L4), p1: bl(0.5, -14, 2.4, OX.L4), l0: bl(6, -6, 1.5, OX.L4), l1: bl(10, -5.5, 1.2, OX.L4), fov: 34, fov1: 32 },
    { to: L5.from + 20, p0: bl(-6.5, -12.5, 1.6, OX.L4), p1: bl(-3.5, -11.0, 1.3, OX.L4), l0: bl(-1.0, -7.0, 1.7, OX.L4), l1: bl(-1.8, -7.2, 1.8, OX.L4), fov: 36, fov1: 40 },
    { to: dur, p0: bl(-3.5, -11.0, 1.3, OX.L4), p1: bl(-4.5, -12.5, 1.6, OX.L4), l0: bl(-1.8, -7.2, 1.8, OX.L4), fov: 40, fov1: 44 },
  ]);
  const mK = mouth("hari", "dodi", f, [0]);
  const mA = mouth("hari", "ara", f);
  const open = L2.from + 36;
  const ara_walk = ramp(f, L1.to - 10, 50);
  const araPos: Vec3 = bl(lerpN(6.5, 12.0, ara_walk), -6.6, 0, OX.L4);
  const shock = f >= L3.from;
  const kaisar = bean(KAISAR, {
    ...idle(t, 0),
    expr: speaking("hari", 1, f) ? "angry" : shock ? (f >= L5.from - 4 ? "scared" : "shock") : "smug",
    mouthOpen: mK,
    headTilt: nod("hari", "dodi", f),
    prop: "rifle",
    propHand: "R",
    armR: speaking("hari", 1, f) ? [90, -40] : [lerpN(20, 10, ramp(f, L3.from, 20)), -30],
    armL: speaking("hari", 1, f) ? [lerpN(10, 130, ramp(f, L1.from, 10)), -20] : [-8, -10],
    sweat: f >= L5.from - 4,
  });
  const ajudan = bean(AJUDAN, {
    ...idle(t, 3),
    expr: f >= L4.from ? "worried" : speaking("hari", 2, f) ? "happy" : "neutral",
    mouthOpen: mA,
    headTilt: nod("hari", "ara", f),
    armR: f < L1.to ? [8, -10] : f >= open - 28 && f < open + 8 ? [130, -30] : [8, -10],
    bob: f >= L1.to - 10 && ara_walk < 1 ? Math.abs(Math.sin(t * 5)) * 5 : 2,
  });
  const guard = (x: number, k: number): BeanParams => bean(PENGAWAL, { ...idle(t, k), expr: shock ? "worried" : "neutral", sweat: shock && f > L4.from });
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L4_Lapangan" focus={bl(3, -6, 1, OX.L4)}>
        <BeanCard position={K_POS} height={H_K} params={kaisar} />
        <BeanCard position={araPos} height={H_A} params={ajudan} />
        <BeanCard position={bl(-5.4, -5.6, 0, OX.L4)} height={2.0} params={guard(0, 5)} />
        <BeanCard position={bl(1.4, -5.2, 0, OX.L4)} height={2.0} params={guard(1, 6)} />
        <BeanCard position={bl(-9, -6.5, 0, OX.L4)} height={2.0} params={guard(2, 7)} />
        <Swarm n={22} from={CAGE_DOOR} to={bl(-2.0, -7.2, 0.05, OX.L4)} t0={open} t1={L5.from + 8} spread={2.2} ring={2.4} seed={3} size={0.62} />
      </Stage>
      <Grade />
      <Insert kind="latch" from={open - 30} len={30} />
      <Chip from={4} to={L1.from} top={170} color="#2f6a3a" size={48}>LAPANGAN PERBURUAN · KONON</Chip>
      <Emote x={600} y={560} from={L3.from} to={L4.from} text="HM?" color="#c0302a" size={80} />
      <Emote x={600} y={560} from={L5.from} to={dur - 4} text="!!" color="#c0302a" size={96} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. SERBU — kelinci menyerbu Kaisar                                  */
/* ================================================================== */
export const SceneNpSerbu: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("serbu");
  const L0 = lineAt("serbu", 0), L1 = lineAt("serbu", 1), L2 = lineAt("serbu", 2), L3 = lineAt("serbu", 3);
  const cam = shotCam(f, [
    { to: L1.from, p0: bl(-4.5, -11.5, 1.5, OX.L4), p1: bl(-3.0, -10.5, 1.4, OX.L4), l0: bl(-1.4, -7.2, 1.4, OX.L4), fov: 38, fov1: 34 },
    { to: L3.from, p0: bl(-3.0, -10.5, 1.4, OX.L4), p1: bl(0.5, -9.8, 1.2, OX.L4), l0: bl(-1.4, -7.2, 1.3, OX.L4), l1: bl(-0.6, -7.0, 1.2, OX.L4), fov: 36, fov1: 40 },
    { to: dur, p0: bl(0.5, -9.8, 1.2, OX.L4), p1: bl(-1.0, -12.5, 2.0, OX.L4), l0: bl(-0.6, -7.0, 1.2, OX.L4), fov: 40, fov1: 46, ease: "out" },
  ]);
  const mK = mouth("serbu", "dodi", f);
  const mA = mouth("serbu", "ara", f);
  const hop = Math.abs(Math.sin(t * 6)) * 14;
  const kaisar = bean(KAISAR, {
    ...idle(t, 0),
    expr: speaking("serbu", 3, f) ? "angry" : "scared",
    mouthOpen: mK || 0.7,
    sweat: true,
    prop: "rifle",
    armR: [lerpN(30, 120, Math.abs(Math.sin(t * 7))), -30],
    armL: [-lerpN(30, 140, Math.abs(Math.cos(t * 7))), -30],
    bob: hop,
    squash: -0.05 * Math.abs(Math.sin(t * 6)),
    headTilt: Math.sin(t * 9) * 6,
  });
  const ajudan = bean(AJUDAN, { ...idle(t, 3), expr: speaking("serbu", 0, f) ? "worried" : speaking("serbu", 2, f) ? "shock" : "worried", mouthOpen: mA, headTilt: nod("serbu", "ara", f), armL: [-40, -100], armR: [40, -110] });
  const gua = (k: number): BeanParams => bean(PENGAWAL, { ...idle(t, k), expr: "scared", sweat: true, armL: [-120 + Math.sin(t * 12 + k) * 25, -30], armR: [120 - Math.sin(t * 12 + k) * 25, -30], bob: Math.abs(Math.sin(t * 8 + k)) * 8 });
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L4_Lapangan" focus={bl(-1, -7, 1, OX.L4)} shake={kick(f, [L3.from], 0.05, 14)}>
        <BeanCard position={bl(-1.4, -7.2, 0.05, OX.L4)} height={H_K} params={kaisar} />
        <BeanCard position={bl(2.6, -8.6, 0, OX.L4)} height={H_A} params={ajudan} />
        <BeanCard position={bl(-5.0, -8.8, 0, OX.L4)} height={2.0} params={gua(1)} />
        <BeanCard position={bl(-4.0, -4.6, 0, OX.L4)} height={2.0} params={gua(2)} />
        <Swarm n={26} from={bl(-1.4, -7.2, 0.05, OX.L4)} to={bl(-1.4, -7.2, 0.05, OX.L4)} t0={0} t1={1} ring={2.8} seed={5} size={0.62} around={0.35} />
        <Swarm n={8} from={bl(-1.4, -7.2, 0.05, OX.L4)} to={bl(-1.4, -7.2, 0.05, OX.L4)} t0={0} t1={1} ring={0.9} seed={9} size={0.55} around={0.15} />
      </Stage>
      <Grade />
      <Emote x={380} y={640} from={L0.from} to={L1.from} text="MAKAN?" color="#d99a00" size={70} />
      <Stamp text="KELINCI LAPAR!" from={L2.from + 6} to={L3.from - 6} color="#dc2626" top={380} />
      <Emote x={740} y={560} from={L3.from} to={dur - 2} text="USIR!!" color="#c0302a" size={84} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. KERETA                                                           */
/* ================================================================== */
export const SceneNpKereta: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("kereta");
  const L0 = lineAt("kereta", 0), L1 = lineAt("kereta", 1), L2 = lineAt("kereta", 2), L3 = lineAt("kereta", 3);
  const inside = false;
  const cam = inside
    ? shotCam(f - (L0.to - 4), [
        { to: L2.from - (L0.to - 4), p0: bl(1.5, 0.1, 2.3, OX.L5), p1: bl(1.6, 0.15, 2.3, OX.L5), l0: bl(-0.6, 0.0, 1.7, OX.L5), fov: 70, fov1: 64 },
        { to: dur, p0: bl(1.6, 0.15, 2.3, OX.L5), p1: bl(1.5, 0.2, 2.35, OX.L5), l0: bl(-0.6, 0.0, 1.7, OX.L5), fov: 64, fov1: 72 },
      ])
    : shotCam(f, [
        { to: L0.to, p0: bl(-9, -12, 2.6, OX.L5), p1: bl(-6, -9, 2.4, OX.L5), l0: bl(0, 0, 2.2, OX.L5), fov: 44, fov1: 42 },
        { to: L2.from, p0: bl(-8.4, -9.6, 2.4, OX.L5), p1: bl(-7.6, -8.8, 2.2, OX.L5), l0: bl(-4.2, -3.2, 1.5, OX.L5), fov: 46, fov1: 42 },
        { to: dur, p0: bl(-7.6, -8.8, 2.2, OX.L5), p1: bl(-9.5, -11.5, 2.8, OX.L5), l0: bl(-4.2, -3.2, 1.5, OX.L5), fov: 42, fov1: 50 },
      ]);
  const run = ramp(f, 4, Math.max(10, L0.to - 20));
  const kPos: Vec3 = f < L0.to ? bl(lerpN(-9, -1.6, run), -3.6 + 2.6 * run, 0.0, OX.L5) : bl(-3.8, -3.2, 0.0, OX.L5);
  const mK = mouth("kereta", "dodi", f);
  const mA = mouth("kereta", "ara", f);
  const kaisar = bean(KAISAR, {
    ...(inside ? idle(t, 0) : beanRun(t)),
    expr: speaking("kereta", 2, f) ? "shock" : inside ? "scared" : "scared",
    mouthOpen: mK || (inside ? 0 : 0.8),
    sweat: true,
    armL: inside ? [-60, -120] : undefined,
    armR: inside ? [60, -120] : undefined,
    headTilt: inside ? Math.sin(t * 8) * 6 : 0,
  });
  const ajudan = bean(AJUDAN, { ...idle(t, 3), expr: "happy", mouthOpen: mA, headTilt: nod("kereta", "ara", f), armL: speaking("kereta", 3, f) ? [-120, -70] : [-8, -10] });
  const win = L2.from - 40;
  const pts: PL[] = [{ p: bl(0, 0, 2.7, OX.L5), i: 30 }];
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L5_Kereta" focus={bl(0, 0, 2, OX.L5)} interior={inside} pts={inside ? pts : []}>
        <BeanCard position={kPos} height={inside ? 1.55 : H_K} params={kaisar} />
        {f >= L0.to && <BeanCard position={bl(-5.6, -3.8, 0.0, OX.L5)} height={H_A} params={ajudan} />}
        {f >= L0.to && (
          <Swarm n={16} from={bl(-9, -3.5, 0, OX.L5)} to={bl(-3.8, -3.2, 0.05, OX.L5)} t0={L1.from} t1={L2.from + 40} ring={1.5} seed={11} size={0.62} around={0.2} />
        )}
        {f < L0.to && <Swarm n={12} from={bl(-12, -4.5, 0, OX.L5)} to={bl(-3.5, -1.5, 0, OX.L5)} t0={0} t1={L0.to} spread={1.5} ring={1.6} seed={13} size={0.7} />}
      </Stage>
      <Grade />
      <Chip from={4} to={L0.to - 10} top={170} color="#1e3f8a" size={50}>KABUR KE KERETA</Chip>
      <Emote x={560} y={560} from={L2.from} to={L2.to} text="HAH?!" color="#c0302a" size={86} />
    </AbsoluteFill>
  );
};
const beanRun = (t: number): Partial<BeanParams> => {
  const s = Math.sin(t * 14);
  const c = Math.cos(t * 14);
  return { legL: [32 * s, Math.max(0, -c) * 30], legR: [-32 * s, Math.max(0, c) * 30], armL: [-30 * s, -10], armR: [30 * s, -10], bob: Math.abs(s) * 8, lean: 4 };
};

/* ================================================================== */
/* 8. AKHIR — tenda malam                                              */
/* ================================================================== */
export const SceneNpAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("akhir");
  const L0 = lineAt("akhir", 0), L1 = lineAt("akhir", 1), L2 = lineAt("akhir", 2), L3 = lineAt("akhir", 3);
  const last = wordF("akhir", 3, "lapar");
  const cam = shotCam(f, [
    { to: L2.from, p0: bl(4.4, -4.9, 2.7, OX.L2), p1: bl(4, -4.5, 2.6, OX.L2), l0: bl(0.3, 0.5, 1.5, OX.L2), fov: 52, fov1: 46 },
    { to: last - 10, p0: bl(4, -4.5, 2.6, OX.L2), p1: bl(3.4, -3.9, 2.6, OX.L2), l0: bl(-0.1, 0.9, 1.7, OX.L2), fov: 46, fov1: 38 },
    { to: dur, p0: bl(3.4, -3.9, 2.6, OX.L2), p1: bl(2.9, -3.3, 2.6, OX.L2), l0: bl(-0.5, 1.6, 2.3, OX.L2), fov: 38, fov1: 30, ease: "out" },
  ]);
  const mK = mouth("akhir", "dodi", f, [2, 3]);
  const mA = mouth("akhir", "ara", f);
  const land = ramp(f, last - 8, 14);
  const shh = ramp(f, L0.to - 12, 10) * (1 - ramp(f, L1.from + 6, 8));
  const kaisar = bean(KAISAR, {
    ...idle(t, 0),
    expr: f >= last ? "sad" : speaking("akhir", 0, f) ? "sleepy" : "neutral",
    mouthOpen: mK,
    soot: 0.4,
    headTilt: speaking("akhir", 0, f) ? -8 : f >= last ? -6 : 0,
    armR: shh > 0.1 ? [lerpN(10, 120, shh), lerpN(-10, -140, shh)] : [8, -10],
    bob: 1,
    lean: -3,
  });
  const ajudan = bean(AJUDAN, {
    ...idle(t, 3),
    expr: f >= last + 4 ? "shock" : speaking("akhir", 1, f) ? "happy" : "happy",
    mouthOpen: mA,
    headTilt: nod("akhir", "ara", f),
    armL: speaking("akhir", 1, f) ? [-110 - Math.sin(f * 0.7) * 10, -130] : [-8, -10],
  });
  const kPos: Vec3 = bl(-0.7, 1.7, 0.27, OX.L2);
  const hat: Vec3 = [kPos[0] + 0.03, kPos[1] + 1.78, kPos[2] + 0.04];
  const rab: Vec3 = lerpV([hat[0] + 1.6, hat[1] + 1.4, hat[2] - 0.4], hat, land);
  const pts: PL[] = [{ p: bl(0, 0, 4.0, OX.L2), i: 28 }, { p: bl(1.4, 1.0, 2.1, OX.L2), i: 22 }, { p: bl(-5.2, -2.6, 1.3, OX.L2), i: 14 }, { p: bl(-3.0, -3.4, 1.8, OX.L2), i: 10 }];
  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L2_Tenda" focus={bl(0, 0, 1.5, OX.L2)} interior night pts={pts}>
        <BeanCard position={kPos} height={H_K} params={kaisar} />
        <BeanCard position={bl(-2.3, 0.2, 0.27, OX.L2)} height={H_A} params={ajudan} />
        {land > 0 && <RabbitCard position={rab} size={0.5} shadow={false} params={{ pose: land < 1 ? "hop" : "sit", expr: land >= 1 ? "kenyang" : "polos", mouth: 0.3 }} />}
        <RabbitCard position={bl(-3.4, -1.4, 0.27, OX.L2)} size={0.6} params={{ pose: "sit", expr: "kenyang" }} />
        <RabbitCard position={bl(2.8, 3.0, 0.27, OX.L2)} size={0.55} flip params={{ pose: "sit", expr: "kenyang", fur: "#cdb594" }} />
      </Stage>
      <Grade warm={0.5} dark={0.1} flash={pulse(f, last, 5) * 0.2} />
      <Chip from={L2.from + 40} to={L3.from - 10} top={190} color="#7a1f1f" size={40}>SUMBER: MEMOAR JENDERAL THIÉBAULT · 1895</Chip>
      <Emote x={680} y={620} from={last + 10} to={dur - 4} text="Zzz" color="#3a6aa8" />
    </AbsoluteFill>
  );
};

export const NP_SCENES: Record<NpScene, React.FC> = {
  hook: SceneNpHook,
  tilsit: SceneNpTilsit,
  ide: SceneNpIde,
  ternak: SceneNpTernak,
  hari: SceneNpHari,
  serbu: SceneNpSerbu,
  kereta: SceneNpKereta,
  akhir: SceneNpAkhir,
};

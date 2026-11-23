import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { P, easeInOut3, lerpN, lerpV } from "./three/objectsRig";
import { BeanCard, BeanParams, beanCanvasToWorld, beanHandWorld, beanWalk, BW, BH } from "./three/objectsBean";
import * as KP from "./three/objectsKabayanProps";
import { Cloud3D } from "./three/objectsAncol3d";
import { Cat3D } from "./three/objectsRig";
import { KABAYAN, ABAH, ITEUNG, AMBU, PETANI } from "./SheetKabayan";
import { Building, Cobble, Ground, InkBox, SkyDome } from "./three/objectsMolase";
import * as K from "./three/objectsMolaseProps";
import timing from "./kabayan_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

type Vec3 = [number, number, number];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_KBY = timing.scenes as Record<"pagi" | "jalan" | "pematang" | "saung" | "sore" | "seret" | "dorong" | "akhir", number>;
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
/* ------------------------------------------------------------------ */
/* Kabayan helpers                                                       */
/* ------------------------------------------------------------------ */
const HK = 2.2;
const HA = 2.35;
const HI = 2.1;
const rad = (d: number) => (d * Math.PI) / 180;
const tip2 = (x: number, y: number, len: number, a: number): [number, number] => [x + len * Math.sin(rad(a)), y + len * Math.cos(rad(a))];
/** how far the card must sink so the lowest foot touches the ground (bent legs) */
const footDrop = (p: BeanParams, h: number) => {
  const legs: [number, [number, number]][] = [[280, p.legL ?? [0, 0]], [322, p.legR ?? [0, 0]]];
  let maxY = 0;
  for (const [x, a] of legs) {
    const k = tip2(x, 640, 165, a[0]);
    const ft = tip2(k[0], k[1], 170, a[0] + a[1]);
    maxY = Math.max(maxY, ft[1] - (p.bob ?? 0));
  }
  return ((975 - maxY) / BH) * h;
};
const crouch = (k: number): Partial<BeanParams> => ({ legL: [lerpN(0, 95, k), lerpN(0, -150, k)], legR: [lerpN(0, 100, k), lerpN(0, -155, k)], lean: 12 * k });
const sitting: Partial<BeanParams> = { legL: [85, -85], legR: [80, -80] };
const Zzz: React.FC<{ from: number; to?: number; x: number; y: number }> = ({ from, to = 99999, x, y }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  return (
    <>
      {[0, 1, 2].map((i) => {
        const k = ((f - from) / 45 + i / 3) % 1;
        return <div key={i} style={{ position: "absolute", left: x + k * 90 + i * 20, top: y - k * 160, fontFamily: "Anton, Impact, sans-serif", fontSize: 54 + i * 16, color: "#fff", WebkitTextStroke: "6px #241726", paintOrder: "stroke fill", opacity: 1 - k }}>Z</div>;
      })}
    </>
  );
};
const Steam: React.FC<{ pos: Vec3; t: number; k: number }> = ({ pos, t, k }) => (
  <group position={pos}>
    {[0, 1, 2, 3].map((i) => {
      const p = (t * 1.2 + i * 0.25) % 1;
      return <mesh key={i} position={[(i - 1.5) * 0.18, p * 0.9, 0]}><sphereGeometry args={[0.1 + p * 0.12, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={(1 - p) * k} /></mesh>;
    })}
  </group>
);

/* ------------------------------------------------------------------ */
/* sets                                                                  */
/* ------------------------------------------------------------------ */
const SKY_MORN = { top: "#3a86e0", hor: "#d8eefc" };
const SKY_DUSK = { top: "#5a5aa8", hor: "#ffb27a" };
const mixHex = (a: string, b: string, k: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
const Clouds: React.FC<{ t: number; y?: number }> = ({ t, y = 0 }) => (
  <group>
    {[[-7, 9, -10, 2.2], [4, 11, -14, 2.8], [10, 9, -6, 2.0], [-2, 12, -4, 2.4], [-10, 10, 2, 2.0], [6, 10, 4, 2.2]].map(([x, yy, z, s], i) => (
      <Cloud3D key={i} position={[x + Math.sin(t * 0.1 + i) * 0.6, yy + y, z]} s={s} />
    ))}
  </group>
);
const Backdrop: React.FC<{ t: number; dusk?: number }> = ({ t, dusk = 0 }) => (
  <group>
    <SkyDome top={mixHex(SKY_MORN.top, SKY_DUSK.top, dusk)} horizon={mixHex(SKY_MORN.hor, SKY_DUSK.hor, dusk)} r={150} />
    <KP.Mountain pos={[-26, 0, -95]} r={30} h={26} color={mixHex("#5a8a7a", "#6a5a7a", dusk)} />
    <KP.Mountain pos={[20, 0, -110]} r={36} h={32} color={mixHex("#4a7a6a", "#5a4a6a", dusk)} />
    <KP.Mountain pos={[60, 0, -90]} r={22} h={18} color={mixHex("#6a9a8a", "#7a6a8a", dusk)} />
    <Clouds t={t} />
    <mesh position={[dusk > 0 ? -30 + 0 * dusk : 30, lerpN(40, 12, dusk), -100]}><sphereGeometry args={[lerpN(4, 7, dusk), 20, 14]} /><meshBasicMaterial color={mixHex("#fff6c0", "#ffb060", dusk)} /></mesh>
  </group>
);
const GrassGround: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
    <planeGeometry args={[300, 300]} />
    <meshStandardMaterial map={KP.grassTex()} roughness={1} />
  </mesh>
);
const Kampung: React.FC<{ t: number; dusk?: number }> = ({ t, dusk = 0 }) => (
  <group>
    <Backdrop t={t} dusk={dusk} />
    <GrassGround />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -1]} receiveShadow><planeGeometry args={[16, 10]} /><meshStandardMaterial map={KP.mudTex()} color="#e8d8b8" /></mesh>
    <KP.RumahPanggung pos={[-1, 0, -6]} />
    <KP.Leuit pos={[-7.4, 0, -6.4]} />
    <KP.BaleBale pos={[2.4, 0, 0.2]} />
    <KP.BambooClump pos={[5.6, 0, -7]} t={t} />
    <KP.BambooClump pos={[-11, 0, -8]} t={t} />
    <KP.Banana pos={[6.8, 0, -3.2]} t={t} />
    <KP.Banana pos={[-8.6, 0, -2.4]} t={t} />
    <KP.Palm3D position={[9, 0, -9]} s={1.4} sway={Math.sin(t)} />
    <KP.Palm3D position={[-14, 0, -12]} s={1.5} sway={Math.sin(t + 1)} />
    <KP.BambooFence pos={[-4.8, 0, 3.6]} len={6} />
    <KP.BambooFence pos={[6.2, 0, 3.6]} len={6} />
    <KP.Lisung pos={[-5.2, 0, -1.4]} />
    <KP.Pancuran pos={[6.4, 0, 0.4]} t={t} />
    <KP.Ayam pos={[-2.6 + Math.sin(t * 0.7) * 0.6, 0, 1.2]} t={t} rotY={Math.sin(t * 0.7) > 0 ? 0 : Math.PI} />
    <KP.Ayam pos={[-3.6, 0, 0.4]} t={t + 1} rotY={1.2} color="#8a4a2a" />
    <KP.Kendi pos={[1.5, 0.49, 0.2]} />
    <KP.Nyiru pos={[-2.1, 1.2, -3.62]} rot={[Math.PI / 2 - 0.2, 0, 0]} />
  </group>
);
/** sawah: pematang along x at z=0, a big mirror plot in front (z>0) and behind (z<0) */
const Sawah: React.FC<{ t: number; dusk?: number; frontPadi?: boolean }> = ({ t, dusk = 0, frontPadi = false }) => (
  <group>
    <Backdrop t={t} dusk={dusk} />
    <GrassGround />
    <KP.SawahWater pos={[0, 0.02, 4.6]} w={30} d={8.4} />
    <KP.SawahWater pos={[0, 0.02, -5]} w={30} d={9} />
    {frontPadi && <KP.PadiRows pos={[-8, 0.02, 4.6]} w={10} d={8} t={t} />}
    <KP.PadiRows pos={[0, 0.02, -5]} w={28} d={8.6} t={t} step={0.55} />
    <KP.Pematang pos={[0, 0, 0]} len={30} />
    <KP.Pematang pos={[0, 0, 9.1]} len={30} />
    <KP.Pematang pos={[-15.2, 0, 2]} len={16} rotY={Math.PI / 2} />
    <KP.Pematang pos={[15.2, 0, 2]} len={16} rotY={Math.PI / 2} />
    <KP.Saung pos={[7.5, 0.3, -2.6]} rotY={-0.2} />
    <KP.Scarecrow pos={[-5, 0, -4]} t={t} />
    <KP.Kerbau pos={[-9, 0.3, -11]} rotY={0.5} t={t} />
    <KP.Terrace pos={[0, 0, -16]} w={40} steps={4} />
    {[-12, 12].map((x, i) => <KP.Palm3D key={x} position={[x, 0, -12]} s={1.4} sway={Math.sin(t + i)} />)}
    <KP.Pancuran pos={[-14.4, 0.2, -1.4]} t={t} />
  </group>
);
const SunLights: React.FC<{ dusk?: number }> = ({ dusk = 0 }) => (
  <>
    <hemisphereLight args={[mixHex("#ffffff", "#ffc8a0", dusk), mixHex("#9ab080", "#6a5a7a", dusk), lerpN(1.5, 1.1, dusk)]} />
    <directionalLight position={[lerpN(-6, -12, dusk), lerpN(12, 4, dusk), 8]} intensity={lerpN(2.0, 1.6, dusk)} color={mixHex("#fff4e0", "#ff9a5a", dusk)} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
  </>
);
const reachF = (base: BeanParams, side: "L" | "R", pos: Vec3, h: number, cam: Cam, target: Vec3, flip = false): [number, number] => {
  const proj = projector(cam);
  const goal = proj(target);
  let best: [number, number] = [0, 0];
  let bd = 1e9;
  for (let a0 = -180; a0 <= 180; a0 += 6)
    for (let a1 = -150; a1 <= 0; a1 += 6) {
      const pp = { ...base, [side === "R" ? "armR" : "armL"]: [a0, a1] } as BeanParams;
      const q = proj(beanHandWorld(pp, side, pos, h, cam.pos, flip));
      const d = Math.hypot(q[0] - goal[0], q[1] - goal[1]) + Math.abs(a1) * 0.05;
      if (d < bd) {
        bd = d;
        best = [a0, a1];
      }
    }
  return best;
};
const lerpA = (a: [number, number], b: [number, number], k: number): [number, number] => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k)];
/** korang hanging from a hand position */
const HeldKorang: React.FC<{ hand: Vec3; full?: number; flipUp?: number }> = ({ hand, full = 0, flipUp = 0 }) => (
  <group position={[hand[0], hand[1] - 0.05, hand[2]]} rotation={[0, 0, flipUp * Math.PI]}>
    <group position={[0, -0.58, 0]}><KP.Korang full={full} /></group>
  </group>
);

/* ================================================================== */
/* close-up inserts                                                      */
/* ================================================================== */
const INKH = "#241726";
const SKIN = "#f7ead6";
const InsertSplash: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const k = cl((f - from) / (to - from));
  const fade = interpolate(f, [from, from + 3, to - 4, to], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ background: "linear-gradient(#8ec8f0 0%, #6aa8d8 55%, #5a7a5a 100%)" }} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <ellipse cx={540} cy={1180} rx={200 + k * 420} ry={50 + k * 90} fill="none" stroke="#ffffff" strokeWidth={16} opacity={1 - k} />
        <path d={`M 260 1180 Q 300 ${1000 - k * 300} 380 ${980 - k * 380} Q 420 ${1100 - k * 200} 460 ${880 - k * 420} Q 520 ${1060 - k * 200} 560 ${820 - k * 460} Q 620 ${1060 - k * 200} 660 ${880 - k * 420} Q 700 ${1100 - k * 200} 740 ${980 - k * 380} Q 800 ${1000 - k * 300} 820 1180 Z`} fill="#dff4ff" stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
        {[...Array(16)].map((_, i) => {
          const a = -Math.PI / 2 + (i - 7.5) * 0.17;
          const r = 260 + k * (520 + (i % 3) * 120);
          return <circle key={i} cx={540 + Math.cos(a) * r} cy={1100 + Math.sin(a) * r + k * k * 500} r={22 - (i % 3) * 5} fill="#bfe6ff" stroke={INKH} strokeWidth={6} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center", fontFamily: "Anton, Impact, sans-serif", fontSize: 220, color: "#ffffff", WebkitTextStroke: "14px #1a4a8a", paintOrder: "stroke fill", transform: `rotate(-6deg) scale(${0.6 + 0.5 * Math.min(1, k * 4)})` }}>BYUR!</div>
    </AbsoluteFill>
  );
};
const TututSvg: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({ x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M 0 -90 Q 60 -10 52 30 Q 30 70 -20 60 Q -60 40 -48 0 Q -30 -50 0 -90 Z" fill="#3e4e2c" stroke={INKH} strokeWidth={9} strokeLinejoin="round" />
    <path d="M -36 -8 Q 8 -40 40 -4 M -42 18 Q 8 -10 48 22" stroke="#6a7a4a" strokeWidth={6} fill="none" />
    <ellipse cx={-4} cy={44} rx={26} ry={18} fill="#e8d8b8" stroke={INKH} strokeWidth={6} />
  </g>
);
const InsertPick: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const k = cl((f - from) / (to - from));
  const lift = easeInOut3(cl(k / 0.45));
  const carry = easeInOut3(cl((k - 0.45) / 0.35));
  const drop = cl((k - 0.8) / 0.2);
  const hx = lerpN(470, 760, carry);
  const hy = lerpN(1080, 640, lift) + carry * 120;
  const fade = interpolate(f, [from, from + 4, to - 4, to], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ background: "linear-gradient(#b8d8e8 0%, #8aa880 50%, #6a5a3a 100%)" }} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <rect x={0} y={1180} width={1080} height={740} fill="#6a5034" />
        <path d="M 0 1180 Q 270 1160 540 1185 T 1080 1180" stroke="#cfe6f0" strokeWidth={10} fill="none" opacity={0.7} />
        {[[220, 1300], [380, 1420], [880, 1360]].map(([x, y], i) => <TututSvg key={i} x={x} y={y} s={0.9} rot={i * 30} />)}
        {/* korang */}
        <g transform="translate(800 1120)">
          <path d="M -170 -120 L 170 -120 L 130 220 L -130 220 Z" fill="#c8a060" stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
          {[-60, 20, 100].map((y) => <path key={y} d={`M ${-160 + (y + 120) * 0.1} ${y} L ${160 - (y + 120) * 0.1} ${y}`} stroke="#8a6a3a" strokeWidth={10} />)}
          {[-80, -10, 60].map((x, i) => <TututSvg key={x} x={x} y={-130 - (i % 2) * 20} s={0.6} rot={i * 40 - 30} />)}
        </g>
        {/* tutut in the hand */}
        {drop < 1 && <TututSvg x={hx + 10} y={hy + 90 + drop * 260} s={0.75} rot={20} />}
        {/* hand: black kampret sleeve from top */}
        <g transform={`translate(${hx} ${hy})`}>
          <path d="M -160 -900 L 60 -900 L 70 -120 L -110 -140 Z" fill="#1c1c22" stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
          <path d="M -110 -150 Q -20 -190 70 -130 Q 100 -20 30 40 Q -60 60 -110 -20 Z" fill={SKIN} stroke={INKH} strokeWidth={12} strokeLinejoin="round" />
          <rect x={-60 - drop * 30} y={-10} width={58} height={150} rx={29} fill={SKIN} stroke={INKH} strokeWidth={11} transform={`rotate(${10 + drop * 15} -30 -10)`} />
          <rect x={22 + drop * 30} y={-10} width={58} height={150} rx={29} fill={SKIN} stroke={INKH} strokeWidth={11} transform={`rotate(${-12 - drop * 15} 50 -10)`} />
        </g>
        {lift < 1 && lift > 0 && [0, 1, 2].map((i) => <circle key={i} cx={470 + (i - 1) * 50} cy={1150 + lift * 60 + i * 20} r={14} fill="#6a5034" stroke={INKH} strokeWidth={4} />)}
      </svg>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 1. PAGI                                                              */
/* ================================================================== */
const GOLODOG: Vec3 = [-1.9, 0, -3.0];
export const SceneKPagi: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const call = EV("pagi.call");
  const shake = EV("pagi.shake");
  const wake = EV("pagi.wake");
  const give = EV("pagi.give");
  const a1 = LN2("a1");
  const i1 = LN2("i1");
  const cam = shotCam(f, [
    { to: call, p0: [0.4, 3.0, 15], l0: [0.4, 1.6, -2], p1: [0.8, 2.6, 13], l1: [0.8, 1.4, -1.5], fov: 40 },
    { to: 9999, p0: [2.6, 2.0, 10.4], l0: [2.5, 1.1, 0.4], p1: [2.6, 2.0, 9.8], l1: [2.5, 1.1, 0.4], fov: 38 },
  ]);
  // Abah walks from the steps to the bale, shakes Kabayan
  const aw = easeInOut3(cl((f - 8) / Math.max(20, call + 10)));
  const abahPos: Vec3 = [lerpN(GOLODOG[0], 1.0, aw), 0, lerpN(GOLODOG[2], 1.0, aw)];
  const abahBase = bean(ABAH, { ...(aw < 1 ? beanWalk(f * 0.05, 1) : idle(t)), ...(f >= a1.from && f < a1.to ? talk(f, true) : { expr: "angry" }) });
  const shaking = f >= shake && f < wake + 4;
  const shoulder: Vec3 = [1.75, 0.82, 0.3];
  const abahArm = shaking ? reachF(abahBase, "R", abahPos, HA, cam, [shoulder[0] + Math.sin(f * 1.6) * 0.06, shoulder[1], shoulder[2]]) : ([10, -10] as [number, number]);
  const abahP = bean(abahBase, { armR: abahArm });
  // Kabayan: lying -> sits up -> stretches -> takes the korang
  const up = easeInOut3(cl((f - wake) / 14));
  const lying = up < 1;
  const seatY = 0.52 - HK * (0.975 - 0.64);
  const kPos: Vec3 = lying ? [lerpN(3.35, 2.5, up), lerpN(0.72, seatY, up) + (shaking ? Math.sin(f * 1.6) * 0.03 : 0), 0.3] : [2.5, seatY, 0.3];
  const stretch = f >= wake + 10 && f < wake + 40;
  // Iteung brings the korang
  const iw = easeInOut3(cl((f - (wake - 30)) / 40));
  const iPos: Vec3 = [lerpN(GOLODOG[0] + 0.4, 3.9, iw), 0, lerpN(GOLODOG[2], 1.0, iw)];
  const offer = easeInOut3(cl((f - (give - 14)) / 10));
  const pass = easeInOut3(cl((f - give) / 14));
  const iBase = bean(ITEUNG, { ...(iw > 0 && iw < 1 ? beanWalk(f * 0.05, 0.9) : idle(t, 2)), ...(f >= i1.from && f < i1.to ? talk(f, true) : { expr: "happy" }) });
  const iArm: [number, number] = offer > 0 && pass < 1 ? lerpA([20, -60], [80, -20], offer) : pass >= 1 ? [6, -8] : [20, -60];
  const iP = bean(iBase, { armR: iArm });
  const iHand = beanHandWorld(iP, "R", iPos, HI, cam.pos, true);
  const kBase = bean(KABAYAN, { ...idle(t), ...sitting, expr: lying ? "sleepy" : stretch ? "sleepy" : "smug", blink: lying, roll: 0 } as BeanParams);
  const kReach = f >= give - 8 ? reachF(kBase, "R", kPos, HK, cam, iHand) : ([10, -10] as [number, number]);
  const kArmR: [number, number] = stretch ? [165, -10] : f >= give - 8 && pass < 1 ? kReach : pass >= 1 ? lerpA(kReach, [35, -40], easeInOut3(cl((f - give - 14) / 12))) : [10, -10];
  const kP = bean(kBase, { armR: kArmR, armL: stretch ? [-165, -10] : [-10, -10] });
  const kHand = beanHandWorld(kP, "R", kPos, HK, cam.pos);
  const korang = pass > 0 ? lerpV(iHand, kHand, pass) : iHand;
  return (
    <>
      <Stage cam={cam} bg="#d8eefc">
        <Kampung t={t} />
        <BeanCard position={abahPos} height={HA} params={abahP} />
        <BeanCard position={kPos} height={HK} params={kP} roll={lying ? lerpN(Math.PI / 2, 0, up) : 0} shadow={!lying} />
        {f >= wake - 30 && <BeanCard position={iPos} height={HI} params={iP} flip />}
        {f >= wake - 30 && <HeldKorang hand={korang} />}
        <SunLights />
      </Stage>
      <Grade warm={0.2} blur={4} />
      <Tag label="PAGI · KAMPUNG" to={call} color="#2a9a5a" />
      <Zzz from={0} to={shake} x={420} y={700} />
      {shaking && <Onoma at={shake} text="BANGUN!" x={540} y={460} color="#ff6a4a" size={110} dur={22} />}
      <Caps ids={["n1", "a1", "n2", "i1"]} hl={["Pagi-pagi", "mendengkur", "Bangun", "tutut", "sawah", "malas", "korang", "banyak"]} />
    </>
  );
};

/* ================================================================== */
/* 2. JALAN                                                             */
/* ================================================================== */
export const SceneKJalan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const whistle = EV("jalan.whistle");
  const dur = DURATIONS_KBY.jalan;
  const kx = lerpN(-7, 1.0, f / dur);
  const kPos: Vec3 = [kx, 0.27, 0];
  const cam: Cam = { pos: [kx + 1.2, 1.7, 6.2], look: [kx + 0.2, 1.1, 0], fov: 38, roll: 0 };
  const kP = bean(KABAYAN, { ...beanWalk(f * 0.045, 0.8), expr: f >= whistle - 10 ? "smug" : "sleepy", armR: [25 + Math.sin(f * 0.28) * 10, -30] });
  const hand = beanHandWorld(kP, "R", kPos, HK, cam.pos);
  return (
    <>
      <Stage cam={cam} bg="#d8eefc">
        <Sawah t={t} frontPadi />
        <BeanCard position={[-4, -0.35, -3.2]} height={2.1} params={bean(PETANI, { ...idle(t), lean: 30, armL: [40, -20], armR: [50, -20], expr: "neutral" })} />
        <BeanCard position={kPos} height={HK} params={kP} />
        <HeldKorang hand={hand} />
        <SunLights />
      </Stage>
      <Grade warm={0.2} blur={4} />
      <Tag label="MENUJU SAWAH" to={whistle} color="#2a9a5a" />
      {[0, 1, 2].map((i) => <Onoma key={i} at={whistle + i * 14} text={i % 2 ? "♫" : "♪"} x={660 + i * 50} y={560 - i * 40} color="#ffffff" size={90} dur={30} rot={i * 8 - 8} />)}
      <Caps ids={["n3"]} hl={["sawah", "bersiul", "santai"]} />
    </>
  );
};

/* ================================================================== */
/* 3. PEMATANG (the illusion)                                           */
/* ================================================================== */
export const SceneKPematang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const crouchAt = EV("pematang.crouch");
  const footAt = EV("pematang.foot");
  const look = EV("pematang.look");
  const shock = EV("pematang.shock");
  const pov = EV("pematang.pov");
  const k1 = LN2("k1");
  const ck = easeInOut3(cl((f - crouchAt) / 12));
  const sitK = easeInOut3(cl((f - footAt) / 12));
  const dip = easeInOut3(cl((f - (footAt + 12)) / Math.max(8, look - footAt - 12)));
  const recoil = easeInOut3(cl((f - shock) / 8));
  let pose: Partial<BeanParams>;
  if (f < footAt) pose = { ...idle(t), ...crouch(ck), expr: "smug", armR: [30, -30] };
  else if (f < shock) pose = { ...idle(t), legL: [85, -85], legR: [lerpN(85, 30, dip), lerpN(-85, -5, dip)], lean: 14, expr: f >= look ? "worried" : "smug", armR: [30, -30], armL: [-40, -20], look: 0 };
  else pose = { ...idle(t), legL: [100, -150], legR: [100, -150], lean: -10 * recoil, ...(f >= k1.from && f < k1.to ? { expr: "talk", mouthOpen: Math.abs(Math.sin(f * 0.6)) } : { expr: "scared" }), sweat: true, armL: [-120, -20], armR: [120, -20] };
  const kP0 = bean(KABAYAN, pose);
  const sitY = 0.27 + 0.02 - HK * (0.975 - 0.64);
  const standY = 0.27 - footDrop(kP0, HK);
  const kPos: Vec3 = [0, f < footAt ? lerpN(0.27, standY, ck) : sitY + (f >= shock ? 0.02 : 0), lerpN(0.1, 0.2, sitK) - recoil * 0.1];
  const povOn = f >= pov - 4;
  const cam: Cam = povOn
    ? { pos: [0.1, 1.55, 0.5], look: [0.1 + Math.sin(t * 0.5) * 0.05, 0.0, 2.8], fov: 50, roll: Math.sin(t * 0.9) * 1.2 }
    : shotCam(f, [
        { to: footAt, p0: [1.2, 1.9, 7.2], l0: [0.2, 1.1, 0.6], p1: [1.0, 1.8, 6.6], l1: [0.2, 1.0, 0.6], fov: 38 },
        { to: 9999, p0: [0.4, 1.3, 4.8], l0: [0.1, 0.8, 0.8], p1: [0.4, 1.3, 4.4], l1: [0.1, 0.8, 0.8], fov: 38 },
      ]);
  const kP = bean(kP0, {});
  const hand = beanHandWorld(kP, "R", kPos, HK, cam.pos);
  return (
    <>
      <Stage cam={cam} shake={kick(f, [shock], 0.06)} bg="#d8eefc">
        <Sawah t={t} />
        {/* extra clouds placed so the water mirrors them in the POV shot */}
        {[[-2, 9, 14, 2.4], [3, 11, 18, 3.0], [0, 8, 11, 2.0], [-5, 10, 20, 2.6], [5, 8, 12, 1.8]].map(([x, y, z, s], i) => <Cloud3D key={i} position={[x + Math.sin(t * 0.2 + i) * 0.4, y, z]} s={s} />)}
        {povOn && [[-0.9, 1.4], [1.1, 1.6], [-1.2, 2.6], [1.4, 3.0], [-0.6, 3.8], [0.9, 4.2]].map(([x, z], i) => <KP.Padi key={i} pos={[x, 0.02, z]} t={t} s={1.3} />)}
        {povOn && [0, 1].map((i) => { const k = ((f - pov) / 40 + i * 0.5) % 1; return <mesh key={i} position={[0.2, 0.04, 2.6]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.1 + k * 1.2, 0.14 + k * 1.2, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.6 * (1 - k)} /></mesh>; })}
        {povOn && <mesh position={[0.1, 0.05, 1.0]} rotation={[-Math.PI / 2, 0, 0.5]}><planeGeometry args={[0.16, 0.08]} /><meshBasicMaterial color="#6aa84a" side={THREE.DoubleSide} /></mesh>}
        {!povOn && <BeanCard position={kPos} height={HK} params={kP} />}
        {!povOn && <group position={[0.75, 0.29, -0.05]}><KP.Korang /></group>}
        <SunLights />
      </Stage>
      <Grade warm={0.15} blur={povOn ? 2 : 4} />
      {povOn && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(10,20,40,0.55) 100%)" }} />}
      {povOn && <Tag label="SUDUT PANDANG KABAYAN" from={pov - 4} to={9999} color="#6ec6ff" />}
      <Onoma at={shock} text="EULEUH!" x={540} y={520} color="#ffe14d" size={130} dur={34} />
      <Caps ids={["n4", "k1", "n5"]} hl={["pematang", "turun", "bawah", "Euleuh", "dalam", "sekali", "langitnya", "langit", "awannya"]} />
    </>
  );
};

/* ================================================================== */
/* 4. SAUNG (waits, falls asleep, dusk)                                 */
/* ================================================================== */
export const SceneKSaung: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const sit = EV("saung.sit");
  const sleep = EV("saung.sleep");
  const dur = DURATIONS_KBY.saung;
  const dusk = cl((f - sit) / (dur - sit)) * 0.85;
  const floorY = 0.3 + 0.75;
  const seatY = floorY - HK * (0.975 - 0.64);
  const lie = easeInOut3(cl((f - sleep) / 14));
  const kPos: Vec3 = [lerpN(7.3, 7.6, lie), lerpN(seatY, floorY + 0.2, lie), -2.0];
  const kP = bean(KABAYAN, { ...idle(t), ...sitting, expr: f >= sleep - 10 ? "sleepy" : "worried", blink: f >= sleep, armL: [-20, -60], armR: [20, -60] });
  const cam = shotCam(f, [{ to: 9999, p0: [5.6, 2.2, 4.4], l0: [7.4, 1.4, -2.2], p1: [5.0, 2.6, 6.0], l1: [7.2, 1.4, -2.2], fov: 38 }]);
  return (
    <>
      <Stage cam={cam} bg={mixHex(SKY_MORN.hor, SKY_DUSK.hor, dusk)}>
        <Sawah t={t} dusk={dusk} />
        <BeanCard position={kPos} height={HK} params={kP} roll={lie * (Math.PI / 2)} shadow={false} />
        <group position={[6.6, floorY, -1.7]}><KP.Korang /></group>
        <SunLights dusk={dusk} />
      </Stage>
      <Grade warm={0.2 + dusk * 0.6} blur={4} />
      <Tag label={dusk > 0.5 ? "SORE..." : "SIANG..."} to={9999} color="#ff9a5a" />
      <Zzz from={sleep + 8} x={560} y={620} />
      <Caps ids={["n6"]} hl={["tidak", "berani", "saung", "ketiduran", "sore"]} />
    </>
  );
};

/* ================================================================== */
/* 5. SORE (empty korang)                                               */
/* ================================================================== */
export const SceneKSore: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ask = EV("sore.ask");
  const flipAt = EV("sore.flip");
  const angry = EV("sore.angry");
  const a2 = LN2("a2");
  const k2 = LN2("k2");
  const dusk = 0.85;
  const cam = shotCam(f, [{ to: 9999, p0: [1.6, 2.0, 10.6], l0: [1.5, 1.2, 0.4], p1: [1.6, 2.0, 10.0], l1: [1.5, 1.2, 0.4], fov: 38 }]);
  const kw = easeInOut3(cl(f / 30));
  const kPos: Vec3 = [lerpN(6.5, 2.5, kw), 0, 1.0];
  const flipK = easeInOut3(cl((f - flipAt) / 10));
  const kP = bean(KABAYAN, { ...(kw < 1 ? beanWalk(f * 0.05, 0.9) : idle(t)), ...(f >= k2.from && f < k2.to ? talk(f, true) : { expr: "smug" }), armR: f >= flipAt ? [80, -20] : [25, -30], look: -1 });
  const hand = beanHandWorld(kP, "R", kPos, HK, cam.pos, true);
  const abahPos: Vec3 = [0.4, 0, 1.0];
  const abahP = bean(ABAH, { ...idle(t), ...(f >= a2.from && f < a2.to ? talk(f, true) : { expr: f >= angry ? "angry" : "neutral" }), armR: f >= a2.from && f < a2.to ? [100, -20] : f >= angry ? [40, -110] : [10, -10], armL: f >= angry ? [-40, -110] : [-10, -10], bob: f >= angry ? Math.abs(Math.sin(f * 0.9)) * 6 : 0 });
  return (
    <>
      <Stage cam={cam} shake={kick(f, [angry], 0.05)} bg={mixHex(SKY_MORN.hor, SKY_DUSK.hor, dusk)}>
        <Kampung t={t} dusk={dusk} />
        <BeanCard position={[-2.6, 0, -0.6]} height={2.1} params={bean(AMBU, { ...idle(t, 1), expr: f >= flipAt ? "worried" : "neutral" })} />
        <BeanCard position={[-1.4, 0, -0.2]} height={HI} params={bean(ITEUNG, { ...idle(t, 2), expr: f >= flipAt ? "shock" : "happy" })} />
        <BeanCard position={abahPos} height={HA} params={abahP} />
        {f >= angry && <Steam pos={[abahPos[0], HA + 0.2, abahPos[2]]} t={t} k={cl((f - angry) / 10)} />}
        <BeanCard position={kPos} height={HK} params={kP} flip />
        <HeldKorang hand={hand} flipUp={flipK} />
        <SunLights dusk={dusk} />
      </Stage>
      <Grade warm={0.7} blur={4} />
      {f >= angry && <AbsoluteFill style={{ background: `rgba(255,60,40,${0.12 * cl((f - angry) / 10)})`, mixBlendMode: "multiply" }} />}
      <Tag label="SORE HARI" to={ask} color="#ff9a5a" />
      <Onoma at={flipAt + 6} text="KOSONG..." x={760} y={760} color="#ffffff" size={80} dur={40} rot={6} />
      <Caps ids={["a2", "k2", "n7"]} hl={["Kabayan", "Mana", "tututnya", "dalam", "Sedalam", "langit", "tenggelam", "naik", "darah"]} />
    </>
  );
};

/* ================================================================== */
/* 6. SERET                                                             */
/* ================================================================== */
export const SceneKSeret: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const point = EV("seret.point");
  const a3 = LN2("a3");
  const k3 = LN2("k3");
  const dusk = 0.85;
  const run = easeInOut3(cl(f / Math.max(30, point - 8)));
  const ax = lerpN(-8, 0.9, run);
  const abahPos: Vec3 = [ax, 0.27, -0.05];
  const kPos: Vec3 = [ax - 1.15, 0.27, 0.1];
  const walking = run < 1;
  const cam: Cam = { pos: [ax - 0.4, 1.9, 8.0], look: [ax - 0.55, 1.1, 0], fov: 38, roll: 0 };
  const kP = bean(KABAYAN, { ...(walking ? beanWalk(f * 0.08, 1.1) : idle(t)), lean: walking ? -8 : 0, ...(f >= k3.from && f < k3.to ? talk(f, true) : { expr: walking ? "worried" : "smug" }), armR: walking ? [70, -10] : [60, 10], sweat: walking });
  const kHand = beanHandWorld(kP, "R", kPos, HK, cam.pos);
  const abahBase = bean(ABAH, { ...(walking ? beanWalk(f * 0.08, 1.2) : idle(t)), ...(f >= a3.from && f < a3.to ? talk(f, true) : { expr: "angry" }) });
  const abahArmL = walking ? reachF(abahBase, "L", abahPos, HA, cam, kHand) : ([-10, -10] as [number, number]);
  const abahP = bean(abahBase, { armL: abahArmL, armR: walking ? [30, -20] : [10, -10] });
  return (
    <>
      <Stage cam={cam} bg={mixHex(SKY_MORN.hor, SKY_DUSK.hor, dusk)}>
        <Sawah t={t} dusk={dusk} />
        <BeanCard position={kPos} height={HK} params={kP} />
        <BeanCard position={abahPos} height={HA} params={abahP} />
        <SunLights dusk={dusk} />
      </Stage>
      <Grade warm={0.65} blur={4} />
      <Caps ids={["a3", "k3"]} hl={["Dalam", "bagaimana", "ikut", "Tuh", "lihat", "langitnya"]} />
    </>
  );
};

/* ================================================================== */
/* 7. DORONG + 8. AKHIR (side view over the front plot)                 */
/* ================================================================== */
const SIDE_CAM: Vec3 = [9.2, 1.9, 0.9];
const SIDE_LOOK: Vec3 = [0, 0.8, 0.7];
const tututOnHead = (p: BeanParams, pos: Vec3, h: number, camPos: Vec3, flip: boolean) => beanCanvasToWorld(300, 70, pos, h, camPos, flip, 0.1);
export const SceneKDorong: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const push = EV("dorong.push");
  const splash = EV("dorong.splash");
  const stand = EV("dorong.stand");
  const dusk = 0.85;
  const cam = shotCam(f, [{ to: 9999, p0: SIDE_CAM, l0: SIDE_LOOK, p1: [8.8, 1.9, 0.9], l1: SIDE_LOOK, fov: 38 }]);
  const fly = cl((f - push - 4) / Math.max(6, splash - push - 4));
  const inWater = f >= splash;
  const standK = easeInOut3(cl((f - stand + 10) / 12));
  const kPos: Vec3 = inWater ? [0, lerpN(-0.95, -0.55, standK), 2.0] : [0, 0.27 + Math.sin(fly * Math.PI) * 0.5 - fly * 0.6, lerpN(0.15, 2.0, fly)];
  const roll = inWater ? lerpN(Math.PI / 2, 0, standK) : fly * (Math.PI / 2);
  const kP = bean(KABAYAN, inWater ? { ...idle(t), expr: standK < 1 ? "scared" : "sad", wet: 1, goo: 0.3, gooColor: "#6a5030", armL: [-30, -30], armR: [30, -30] } : { ...idle(t), expr: f >= push ? "shock" : "smug", armL: f >= push ? [-150, -20] : [-10, -10], armR: f >= push ? [150, -20] : [60, 10], look: -1 });
  const abahPos: Vec3 = [0, 0.27, -0.6];
  const kBack: Vec3 = [0, 1.2, 0.05];
  const abahBase = bean(ABAH, { ...idle(t), expr: "angry" });
  const pushK = easeInOut3(cl((f - (push - 8)) / 8));
  const meet = reachF(abahBase, "R", abahPos, HA, cam, kBack, true);
  const abahP = bean(abahBase, { armR: f >= push - 8 && f < push + 16 ? lerpA([10, -10], meet, pushK) : [10, -10], armL: f >= push - 8 && f < push + 16 ? [lerpN(-10, 20, pushK), -30] : [-10, -10], lean: f >= push - 8 && f < push + 16 ? 10 * pushK : 0 });
  const head = tututOnHead(kP, kPos, HK, cam.pos, true);
  return (
    <>
      <Stage cam={cam} bg={mixHex(SKY_MORN.hor, SKY_DUSK.hor, dusk)}>
        <Sawah t={t} dusk={dusk} />
        <BeanCard position={abahPos} height={HA} params={abahP} flip />
        <BeanCard position={kPos} height={HK} params={kP} flip roll={roll} shadow={!inWater} />
        {inWater && standK > 0.5 && <KP.Tutut pos={head} s={1.6} rot={[0, 0, 0.4]} />}
        {inWater && f < splash + 30 && [...Array(14)].map((_, i) => {
          const p = (f - splash) / 30;
          const a = (i / 14) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * p * 1.6, 0.1 + Math.sin(p * Math.PI) * (0.8 + (i % 3) * 0.3), 2.0 + Math.sin(a) * p * 1.6]}><sphereGeometry args={[0.07, 6, 5]} /><meshBasicMaterial color="#cfeeff" /></mesh>;
        })}
        {inWater && <mesh position={[0, 0.04, 2.0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3 + cl((f - splash) / 40) * 1.6, 0.36 + cl((f - splash) / 40) * 1.6, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={1 - cl((f - splash) / 40)} /></mesh>}
        <SunLights dusk={dusk} />
      </Stage>
      <Grade warm={0.65} blur={4} />
      <InsertSplash from={splash} to={splash + 16} />
      <Chip from={stand} to={stand + 80} top={430} color="#2a6ab0">AIRNYA CUMA SEBETIS</Chip>
      <Caps ids={["n8", "n9"]} hl={["Tanpa", "mendorong", "sawah", "Ternyata", "cuma", "sebetis"]} />
    </>
  );
};
export const SceneKAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const facepalm = EV("akhir.facepalm");
  const laugh = EV("akhir.laugh");
  const pick = EV("akhir.pick");
  const titleAt = EV("akhir.title");
  const k4 = LN2("k4");
  const dusk = 0.85;
  const cam = shotCam(f, [
    { to: pick, p0: SIDE_CAM, l0: SIDE_LOOK, p1: [9.6, 2.1, 1.2], l1: [0.4, 0.8, 0.6], fov: 38 },
    { to: 9999, p0: [11.5, 3.0, 1.4], l0: [0.6, 1.0, 0.6], p1: [12.5, 3.4, 1.6], l1: [0.6, 1.0, 0.6], fov: 40 },
  ]);
  const kPos: Vec3 = [0, -0.55, 2.0];
  const afterPick = f >= pick + 40;
  const kBase = bean(KABAYAN, { ...idle(t), wet: 1, goo: 0.3, gooColor: "#6a5030", ...(f >= k4.from && f < k4.to ? { expr: "laugh" as const, mouthOpen: Math.abs(Math.sin(f * 0.5)) * 0.6 } : { expr: afterPick ? "happy" : "smug" }), armR: afterPick ? [60, -60] : [30, -30], armL: [-30, -30] });
  const hand = beanHandWorld(kBase, "R", kPos, HK, cam.pos, true);
  const abahP = bean(ABAH, { ...idle(t), expr: f >= facepalm ? "worried" : "shock", armR: f >= facepalm ? [150, -175] : [10, -10] });
  const iteungIn = easeInOut3(cl((f - (facepalm - 30)) / 30));
  const iPos: Vec3 = [lerpN(4.0, 1.4, iteungIn), 0.27, -0.15];
  const head = tututOnHead(kBase, kPos, HK, cam.pos, true);
  const titleK = cl((f - titleAt) / 14);
  return (
    <>
      <Stage cam={cam} bg={mixHex(SKY_MORN.hor, SKY_DUSK.hor, dusk)}>
        <Sawah t={t} dusk={dusk} />
        <BeanCard position={[0, 0.27, -0.6]} height={HA} params={abahP} flip />
        <BeanCard position={kPos} height={HK} params={kBase} flip />
        {!afterPick && <KP.Tutut pos={head} s={1.6} rot={[0, 0, 0.4]} />}
        {afterPick && <HeldKorang hand={hand} full={1} />}
        <BeanCard position={iPos} height={HI} params={bean(ITEUNG, { ...(iteungIn < 1 ? beanWalk(f * 0.06, 1) : f >= laugh ? laughing(f, 1) : idle(t)) })} flip />
        <BeanCard position={[-5, -0.4, -3.4]} height={2.1} params={bean(PETANI, { ...(f >= laugh + 10 ? laughing(f, 2) : { ...idle(t), lean: 30 }) })} />
        <SunLights dusk={dusk} />
      </Stage>
      <Grade warm={0.65} blur={4} dark={titleK * 0.35} />
      <Onoma at={laugh} text="HAHAHA!" x={540} y={520} color="#ffffff" size={120} dur={60} rot={-5} />
      <InsertPick from={pick} to={pick + 40} />
      {titleK > 0 && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 560, textAlign: "center", opacity: titleK, transform: `scale(${0.85 + 0.15 * titleK})` }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 104, lineHeight: 1.05, color: "#ffe14d", WebkitTextStroke: "9px #241726", paintOrder: "stroke fill" }}>SI KABAYAN</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 84, lineHeight: 1.05, color: "#fff", WebkitTextStroke: "8px #241726", paintOrder: "stroke fill", marginTop: 6 }}>NGALA TUTUT</div>
        </div>
      )}
      <Caps ids={["k4", "n10"]} hl={["Geuning", "langitnya", "sebetis", "tutut", "lumpur", "telinga"]} top={titleK > 0 ? 1500 : 1330} />
    </>
  );
};

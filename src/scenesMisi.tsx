import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { Body, Cat3D, Pose3, Rig3D, blendPose, easeInOut3, idle3, lerpN, lerpV, smooth3, walk3 } from "./three/objectsRig";
import { Corridor3D, Dust, LivingRoom3D, Remote, Torch } from "./three/objectsHome";
import timing from "./misi_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_MISI = timing.scenes as { hook: number; lorong: number; kucing: number; tangan: number; twist: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/* ------------------------------------------------------------------ */
/* Camera: slow, motivated moves                                         */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number };
const shotCam = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, Math.min(s.to, start + 500) - start);
      const k = smooth3((frame - start) / len);
      const f0 = s.fov ?? 44;
      return { pos: lerpV(s.p0, s.p1 ?? s.p0, k), look: lerpV(s.l0, s.l1 ?? s.l0, k), fov: f0 + ((s.fov1 ?? f0) - f0) * k };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 44 };
};
type Cam = { pos: Vec3; look: Vec3; fov: number };

const Stage: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#070b1c" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.05, far: 80, position: cam.pos }}>
        <CameraRig position={cam.pos} lookAt={cam.look} fov={cam.fov} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* UI + cinematic finish                                                 */
/* ------------------------------------------------------------------ */
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
const Caps: React.FC<{ ids: LineId[]; hl?: string[]; color?: string; top?: number }> = ({ ids, hl = [], color = "#ffb347", top = 1320 }) => {
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
        const size = Math.min(88, 700 / (txt.length * 0.52));
        return (
          <div style={{ position: "absolute", top, left: 90, width: 760, textAlign: "center" }}>
            <span style={{ display: "inline-block", fontFamily: FONT_BODY, fontWeight: 800, fontSize: size, lineHeight: 1.1, color: isHl ? color : "#f3f6ff", WebkitTextStroke: "6px rgba(6,8,20,0.95)", paintOrder: "stroke fill", textShadow: isHl ? `0 0 30px ${color}88, 0 8px 0 rgba(6,8,20,0.7)` : "0 8px 0 rgba(6,8,20,0.7)", transform: `scale(${0.7 + 0.3 * sp})`, opacity: Math.min(1, sp * 1.6) }}>
              {txt}
            </span>
          </div>
        );
      }
    }
  }
  return null;
};
const Clock: React.FC<{ time: string }> = ({ time }) => (
  <div style={{ position: "absolute", top: 180, left: 60, padding: "6px 22px", borderRadius: 14, background: "rgba(5,8,20,0.85)", border: "3px solid #2c4a8f", fontFamily: "'DejaVu Sans Mono', monospace", fontWeight: 800, fontSize: 48, color: "#7fb2ff", textShadow: "0 0 14px #4c7dff" }}>
    {time}
  </div>
);
/** Film finish: vignette, soft bloom around the TV, grain, subtle teal/orange grade. */
const Grade: React.FC<{ bloom?: [number, number]; warm?: number; flash?: number }> = ({ bloom, warm = 0, flash = 0 }) => {
  const f = useCurrentFrame();
  return (
    <>
      {bloom && <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.32, background: `radial-gradient(ellipse at ${bloom[0]}% ${bloom[1]}%, rgba(110,170,255,0.8) 0%, rgba(80,120,255,0) 45%)` }} />}
      <AbsoluteFill style={{ mixBlendMode: "soft-light", background: warm > 0 ? `rgba(255,170,90,${0.25 * warm})` : "rgba(20,50,120,0.3)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(3,5,14,0.62) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(3,5,14,0) 62%, rgba(3,5,14,0.55) 86%, rgba(3,5,14,0.72) 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.1, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id={`n${f % 4}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 7} />
          </filter>
          <rect width="100%" height="100%" filter={`url(#n${f % 4})`} />
        </svg>
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: "#fff8e6", opacity: flash }} />}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Characters                                                            */
/* ------------------------------------------------------------------ */
const BIMA: Body = { shirt: "#3b82c4", pants: "#1e3a8a", hair: "#2a1a10", hairStyle: "messy", height: 0.74, headScale: 1.32, shoes: "#e5e7eb" };
const AYAH: Body = { shirt: "#e5e7eb", pants: "#7c2d12", hair: "#3a2a1a", hairStyle: "bald", height: 1.0, belly: 0.9, mustache: true, sarong: true };
const IBU: Body = { shirt: "#8b5cf6", pants: "#6d3fd1", hair: "#2a1a10", hairStyle: "bun", height: 0.93, slim: 0.95, sarong: true };

const SIT: Pose3 = { lean: -0.1, bob: 0, legL: { swing: 1.45, knee: 1.4 }, legR: { swing: 1.45, knee: 1.4 }, armL: { swing: 0.1, out: 0.12, elbow: 0.2 }, armR: { swing: 0.1, out: 0.12, elbow: 0.2 } };
const toRig = (world: Vec3, pos: Vec3, rotY: number, scale: number, hipY: number): Vec3 => {
  const dx = world[0] - pos[0];
  const dy = world[1] - pos[1];
  const dz = world[2] - pos[2];
  // inverse of Ry(rotY)
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [(dx * c - dz * s) / scale, dy / scale - hipY, (dx * s + dz * c) / scale];
};
const rigToWorld = (local: Vec3, pos: Vec3, rotY: number, scale: number, hipY: number): Vec3 => {
  const x = local[0] * scale;
  const y = (local[1] + hipY) * scale;
  const z = local[2] * scale;
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [pos[0] + x * c + z * s, pos[1] + y, pos[2] - x * s + z * c];
};

const AYAH_POS: Vec3 = [1.45, 0.04, -0.5];
const AYAH_RY = -Math.PI / 2;
const AYAH_HIP = 0.54;
const HAND_REST: Vec3 = [0.2, -0.02, 0.28]; // pelvis-local: right hand on the thigh
const REMOTE_WORLD = rigToWorld(HAND_REST, AYAH_POS, AYAH_RY, 1.0, AYAH_HIP);

const Sweat: React.FC<{ position: Vec3; t: number; amount?: number }> = ({ position, t, amount = 1 }) => (
  <>
    {amount > 0.02 &&
      [0, 1].map((i) => {
        const k = (t * 1.1 + i * 0.5) % 1;
        return (
          <mesh key={i} position={[position[0] + (i ? 0.08 : -0.08), position[1] - k * 0.22, position[2]]} scale={amount * (1 - 0.3 * k)}>
            <sphereGeometry args={[0.026, 8, 8]} />
            <meshStandardMaterial color="#cfe9ff" emissive="#7ec4ff" emissiveIntensity={0.5} transparent opacity={0.9 - k * 0.5} />
          </mesh>
        );
      })}
  </>
);

const AyahAsleep: React.FC<{ t: number; snore: number; cam?: Cam; lookAt?: number; offer?: number; eye?: number }> = ({ t, snore, lookAt = 0, offer = 0, eye = 0 }) => {
  const breath = Math.sin(t * 2.6) * 0.5 + 0.5;
  const handLocal: Vec3 = lerpV(HAND_REST, [0.2, 0.0, 0.95], offer);
  const pose: Pose3 = {
    ...SIT,
    bob: 0.012 * breath * snore,
    lean: -0.1 - 0.025 * breath * snore + lookAt * 0.08,
    head: [-0.4 * (1 - lookAt) + 0.0, lookAt * 0.85, 0.12 * (1 - lookAt)],
    armR: { ik: { target: handLocal, pole: [0.5, -0.4, -0.1] } },
    armL: { swing: 0.2, out: 0.2, elbow: 0.5 },
  };
  const expr = eye > 0.5 ? (offer > 0.5 ? "grin" : "smug") : "sleepy";
  return <Rig3D position={AYAH_POS} rotationY={AYAH_RY} t={t} body={AYAH} pose={pose} expr={expr} seed={2} />;
};

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneMisiHook: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const title = EV("hook.title");
  const target = EV("hook.target");
  const cam = shotCam(f, [
    { to: target, p0: [3.6, 1.8, 6.4], l0: [0.4, 0.9, -0.4], p1: [3.0, 1.6, 5.4], l1: [0.8, 0.9, -0.3], fov: 44 },
    { to: 9999, p0: [2.5, 1.2, 3.0], l0: [1.2, 0.7, -0.2], p1: [2.1, 1.05, 2.5], l1: [1.15, 0.7, -0.25], fov: 36 },
  ]);
  const peek = smooth3(cl(f / 24));
  const bimaPose: Pose3 = { ...idle3(t, 1), bob: -0.22 * peek, lean: 0.25 * peek, head: [0.15, -0.5, 0.18], legL: { swing: 0.5, knee: 0.9 }, legR: { swing: 0.4, knee: 1.0 }, armL: { swing: 0.1, out: 0.3, elbow: 0.4 }, armR: { swing: 0.3, out: 0.15, elbow: 0.7 } };
  const ts = spring({ frame: f - title, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <LivingRoom3D t={t} />
        <AyahAsleep t={t} snore={1} />
        <Remote position={REMOTE_WORLD} rotation={[0, 0.4, 0]} glow={0.6 + 0.4 * Math.sin(t * 3)} />
        <Rig3D position={[3.55, 0, 2.55]} rotationY={Math.PI + 0.5} t={t} body={BIMA} pose={bimaPose} expr="worried" look={[-0.6, 0]} seed={5} />
        <Cat3D position={[2.9, 0.5, 1.9]} rotationY={0.3} t={t} alert={0.2} />
        <Dust t={t} />
      </Stage>
      <Grade bloom={[16, 52]} />
      <Clock time="02:00 AM" />
      {f >= title && f < title + 70 && (
        <div style={{ position: "absolute", top: 330, left: 70, width: 760, opacity: Math.min(1, ts) * (f > title + 55 ? 1 - (f - title - 55) / 15 : 1), transform: `scale(${0.9 + 0.1 * ts})` }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, letterSpacing: 10, color: "#7fb2ff" }}>MISI</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1, color: "#fff", textShadow: "0 0 40px rgba(110,170,255,0.8), 0 8px 0 #0a1230" }}>REMOTE TV</div>
        </div>
      )}
      <Caps ids={["hook_1", "hook_2"]} hl={["dua", "pagi", "remote", "Targetnya", "ayah"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. LORONG: tiptoe down the hall, a board creaks                       */
/* ================================================================== */
export const SceneMisiLorong: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const s1 = EV("lorong.step1");
  const creak = EV("lorong.creak");
  const freeze = EV("lorong.freeze");
  const walkEnd = creak - 6;
  const moving = f < walkEnd;
  const cyc = cl((f - s1 + 6) / Math.max(1, walkEnd - s1 + 6));
  const phase = 0.1 + 4.2 * cyc * (f < walkEnd ? 1 : 1);
  const z = lerpN(0.4, -2.4, cl((f - s1 + 6) / Math.max(1, walkEnd - s1 + 6)));
  const cam = shotCam(f, [
    { to: creak, p0: [0.3, 1.05, -6.0], l0: [0, 0.75, 0], p1: [0.1, 1.0, -6.6], l1: [0, 0.75, -0.6], fov: 40 },
    { to: freeze + 60, p0: [0.1, 0.95, -4.6], l0: [0, 0.8, -2.4], p1: [0.1, 0.95, -5.0], l1: [0, 0.8, -2.4], fov: 38 },
    { to: 9999, p0: [0.5, 1.4, -5.8], l0: [0, 0.7, -1.8], p1: [0.4, 1.35, -6.4], l1: [0, 0.7, -1.8], fov: 42 },
  ]);
  const since = f - creak;
  const sq = since >= 0 ? Math.sin(cl(since / 8) * Math.PI) * 0.5 : 0;
  const frozen: Pose3 = { ...walk3(0.12, "tiptoe"), squash: 0.3 * Math.sin(cl(since / 10) * Math.PI), lean: 0.02, head: [0.05, Math.sin(cl((f - freeze) / 40) * Math.PI * 2) * 0.7, 0], armL: { swing: 0.1, out: 1.0, elbow: 0.5 }, armR: { swing: 0.1, out: 1.0, elbow: 0.5 } };
  const pose: Pose3 = moving ? walk3(phase, "tiptoe") : frozen;
  const expr = f < creak ? "worried" : f < freeze + 40 ? "scared" : "worried";
  const bz = moving ? z : -2.4;
  const bob = moving ? 0 : sq * 0.08;
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Corridor3D t={t} creak={since >= 0 && since < 40 ? 1 : 0} />
        <Rig3D position={[0, bob, bz]} rotationY={Math.PI} t={t} body={BIMA} pose={pose} expr={expr} look={[0, 0]} seed={5} />
        {since >= 0 && since < 36 &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[(i - 2.5) * 0.12, 0.05 + since * 0.012 * (1 + (i % 2)), -2.4 + Math.sin(i * 2) * 0.2]}>
              <sphereGeometry args={[0.03 + (i % 3) * 0.01, 6, 6]} />
              <meshBasicMaterial color="#cfd8ff" transparent opacity={0.6 * (1 - since / 36)} />
            </mesh>
          ))}
        <Dust t={t} box={[2.4, 2.4, 6]} center={[0, 1.3, -2]} n={30} />
      </Stage>
      <Grade bloom={[50, 40]} />
      <Clock time="02:03 AM" />
      {since >= 0 && since < 46 && (
        <div style={{ position: "absolute", top: 640, left: 110, fontFamily: FONT_TITLE, fontSize: 150, color: "#ffd23f", WebkitTextStroke: "8px #0a0b14", paintOrder: "stroke fill", transform: `rotate(-6deg) scale(${1 + 0.08 * Math.sin(since * 1.4)})`, opacity: since > 34 ? 1 - (since - 34) / 12 : 1 }}>KRIEEET!</div>
      )}
      <Caps ids={["lorong_1", "lorong_2", "lorong_3"]} hl={["Satu", "Dua", "berisik", "berderit", "membeku"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. KUCING                                                             */
/* ================================================================== */
export const SceneMisiKucing: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const guard = EV("kucing.guard");
  const talk = EV("kucing.talk");
  const hiss = EV("kucing.hiss");
  const cam = shotCam(f, [
    { to: talk, p0: [2.6, 0.95, 4.8], l0: [2.9, 0.75, 1.9], p1: [2.5, 0.9, 4.2], l1: [2.9, 0.75, 1.9], fov: 36 },
    { to: 9999, p0: [1.2, 1.05, 4.6], l0: [2.55, 0.85, 2.3], p1: [1.5, 1.0, 4.2], l1: [2.6, 0.85, 2.3], fov: 38 },
  ]);
  const walkK = cl(f / (talk - 6));
  const ph = walkK * 3.0;
  const bx = lerpN(1.3, 2.35, walkK);
  const bz = lerpN(0.9, 2.9, walkK);
  const walking = f < talk - 6;
  const begging = f >= talk;
  const alert = cl((f - guard) / 10);
  const hissK = f >= hiss ? cl((f - hiss) / 6) : 0;
  const bimaPose: Pose3 = walking
    ? { ...walk3(ph, "tiptoe"), head: [0.0, 0.4, 0] }
    : begging
    ? { ...idle3(t, 3), lean: 0.12 - 0.3 * hissK, bob: -0.12 + 0.1 * hissK, legL: { swing: 0.6, knee: 0.9 }, legR: { swing: 0.5, knee: 1.0 }, armL: { ik: { target: [0.03, 0.55, 0.28] } }, armR: { ik: { target: [-0.03, 0.55, 0.28] } }, head: [0.1, 0.35, 0.12] }
    : walk3(ph, "tiptoe");
  const bimaRy = walking ? Math.PI * 0.62 : Math.PI * 0.8;
  const expr = hissK > 0 ? "scared" : begging ? "worried" : "worried";
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <LivingRoom3D t={t} />
        <AyahAsleep t={t} snore={1} />
        <Cat3D position={[2.9, 0.5, 1.9]} rotationY={-2.5 + 0.5 * Math.sin(t * 0.5)} t={t} alert={Math.max(alert, hissK)} tailPhase={hissK * 3} />
        <Rig3D position={[bx, 0, bz]} rotationY={bimaRy} t={t} body={BIMA} pose={bimaPose} expr={expr} look={[0, 0]} seed={5} />
        {begging && <Sweat position={[bx - 0.08, 0.95, bz + 0.1]} t={t} />}
        <Dust t={t} />
      </Stage>
      <Grade bloom={[10, 55]} />
      <Clock time="02:07 AM" />
      <Caps ids={["kucing_1", "kucing_2"]} hl={["penjaga", "Mpus", "teman"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. TANGAN: the reach                                                  */
/* ================================================================== */
export const SceneMisiTangan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const reach = EV("tangan.reach");
  const near = EV("tangan.near");
  const snore = EV("tangan.snore");
  const stop = EV("tangan.stop");
  const cam = shotCam(f, [
    { to: near, p0: [2.6, 1.3, 2.4], l0: [1.2, 0.85, 0.0], p1: [2.2, 1.2, 2.0], l1: [1.2, 0.8, -0.05], fov: 36 },
    { to: 9999, p0: [2.0, 1.1, 1.4], l0: [1.2, 0.75, -0.15], p1: [1.8, 1.05, 1.1], l1: [1.2, 0.72, -0.2], fov: 30 },
  ]);
  const BP: Vec3 = [1.36, 0, 0.12];
  const BRY = Math.PI;
  const hip = 0.76;
  const k = easeInOut3(cl((f - reach) / (near - reach + 22)));
  const rest: Vec3 = toRig([1.4, 0.55, 0.0], BP, BRY, 0.74, hip);
  const tgtWorld: Vec3 = [REMOTE_WORLD[0], REMOTE_WORLD[1] + 0.035, REMOTE_WORLD[2] + 0.02];
  const tgt: Vec3 = toRig(tgtWorld, BP, BRY, 0.74, hip);
  const hand = lerpV(rest, lerpV(tgt, [tgt[0], tgt[1], tgt[2] + 0.02], 0.0), k * 0.96);
  const shake = f > near ? Math.sin(f * 2.4) * 0.006 : 0;
  const snoring = f < snore ? 1 : f < stop ? 0.3 : 0;
  const bimaPose: Pose3 = { ...idle3(t, 5), lean: 0.16 + 0.1 * k, bob: -0.04 * k, legL: { swing: 0.15, knee: 0.3 }, legR: { swing: -0.05, knee: 0.15 }, armR: { ik: { target: [hand[0] + shake, hand[1] + shake, hand[2]], pole: [0.2, -0.5, 0.3] } }, armL: { swing: 0.1, out: 0.5, elbow: 0.6 }, head: [0.2 * k, 0.25, 0] };
  const sweatAmt = f > near ? 1 : 0;
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <LivingRoom3D t={t} />
        <AyahAsleep t={t} snore={snoring} />
        <Remote position={REMOTE_WORLD} rotation={[0, 0.4, 0]} glow={0.9} />
        <Rig3D position={BP} rotationY={BRY} t={t} body={BIMA} pose={bimaPose} expr={f > near ? "scared" : "worried"} look={[0.4, -0.5]} seed={5} />
        <Sweat position={[BP[0] + 0.0, 1.38, BP[2] - 0.16]} t={t} amount={sweatAmt} />
        <Dust t={t} />
      </Stage>
      <Grade bloom={[8, 55]} />
      <Clock time="02:09 AM" />
      <Caps ids={["tangan_1", "tangan_2"]} hl={["Sedikit", "lagi", "Dengkur", "berhenti"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. TWIST                                                              */
/* ================================================================== */
export const SceneMisiTwist: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const eye = EV("twist.eye");
  const say = EV("twist.say");
  const hah = EV("twist.hah");
  const light = EV("twist.light");
  const ibuF = EV("twist.ibu");
  const lights = smooth3((f - light) / 6);
  const offer = smooth3((f - say + 4) / 14);
  const eyeOpen = f >= eye ? 1 : 0;
  const lookAt = smooth3((f - eye) / 12);
  const cam = shotCam(f, [
    { to: hah - 4, p0: [0.1, 1.15, 1.6], l0: [1.45, 0.95, -0.4], p1: [0.35, 1.12, 1.3], l1: [1.45, 0.98, -0.4], fov: 32 },
    { to: light, p0: [2.6, 1.15, 2.6], l0: [1.3, 0.85, 0.1], p1: [2.4, 1.1, 2.3], l1: [1.3, 0.85, 0.1], fov: 36 },
    { to: 9999, p0: [3.2, 1.7, 6.4], l0: [2.0, 1.0, 0.8], p1: [2.8, 1.6, 5.6], l1: [2.0, 1.0, 0.8], fov: 42 },
  ]);
  const BP: Vec3 = [1.36, 0, 0.12];
  const jump = f >= hah ? Math.max(0, Math.sin(cl((f - hah) / 14) * Math.PI)) : 0;
  const back = f >= hah ? easeInOut3((f - hah) / 14) : 0;
  const bpos: Vec3 = [BP[0] + 0.45 * back, 0.28 * jump, BP[2] + 0.5 * back];
  const handLocal: Vec3 = lerpV(HAND_REST, [0.2, 0.0, 0.95], offer);
  const handWorld = rigToWorld(handLocal, AYAH_POS, AYAH_RY, 1.0, AYAH_HIP);
  const bPose: Pose3 = f < hah ? { ...idle3(t, 5), lean: 0.2, armR: { ik: { target: toRig(REMOTE_WORLD, BP, Math.PI, 0.74, 0.76) } }, armL: { swing: 0.1, out: 0.5, elbow: 0.6 } } : { ...idle3(t, 5), lean: -0.25 * (1 - jump * 0), bob: 0, armL: { swing: 0, out: 1.9, elbow: 0.3 }, armR: { swing: 0, out: 1.9, elbow: 0.3 }, legL: { swing: 0.3, knee: 0.5 }, legR: { swing: -0.2, knee: 0.4 }, head: [-0.2, 0.2, 0] };
  const ibuIn = f >= light ? smooth3((f - light) / 14) : 0;
  const ibuPose: Pose3 = { ...idle3(t, 9), lean: 0.05, armL: { swing: 0.15, out: 0.9, elbow: 1.2 }, armR: { swing: -0.5, out: 0.4, elbow: 0.9 }, head: [0.0, -0.5, 0.0] };
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <LivingRoom3D t={t} lights={lights} />
        <AyahAsleep t={t} snore={0} lookAt={lookAt} offer={offer} eye={eyeOpen} />
        <Remote position={f >= say - 4 ? [handWorld[0], handWorld[1] + 0.02, handWorld[2]] : REMOTE_WORLD} rotation={[0, 0.4, 0]} glow={0.7} />
        <Rig3D position={bpos} rotationY={Math.PI} t={t} body={BIMA} pose={bPose} expr={f >= hah ? "scared" : "worried"} look={[0.2, 0]} seed={5} />
        <Cat3D position={[2.9, 0.5, 1.9]} rotationY={-2.5} t={t} alert={0.2} />
        {f >= light && (
          <>
            <Rig3D position={[3.55 - 0.6 * ibuIn, 0, 3.0]} rotationY={Math.PI + 0.55} t={t} body={IBU} pose={ibuPose} expr="angry" look={[-0.3, 0]} seed={8} />
            <Torch position={[3.3, 1.0, 2.9]} target={[1.4, 0.8, 0.3]} on={ibuIn} />
          </>
        )}
        <Dust t={t} />
      </Stage>
      <Grade bloom={[10, 55]} warm={lights} flash={f >= light && f < light + 5 ? 0.5 * (1 - (f - light) / 5) : 0} />
      <Clock time="02:10 AM" />
      {f >= say && f < ibuF && <div style={{ position: "absolute", top: 760, left: 90, padding: "10px 22px", borderRadius: 24, background: "#fff", border: "5px solid #16110f", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 52, color: "#16110f" }}>Mau ini?</div>}
      <Caps ids={["twist_1", "twist_2", "twist_3"]} hl={["Mau", "Hah", "Jam", "berapa"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. AKHIR                                                              */
/* ================================================================== */
export const SceneMisiAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const sit = EV("akhir.sit");
  const ibuF = EV("akhir.ibu");
  const bimaF = EV("akhir.bima");
  const card = EV("akhir.card");
  const settle = smooth3((f - 4) / Math.max(10, sit - 4));
  const cam = shotCam(f, [
    { to: ibuF, p0: [-1.6, 1.15, 3.2], l0: [1.4, 0.9, -0.5], p1: [-1.9, 1.2, 3.8], l1: [1.4, 0.9, -0.5], fov: 44 },
    { to: 9999, p0: [-1.0, 1.25, 4.2], l0: [1.4, 0.9, -0.5], p1: [-0.6, 1.4, 5.2], l1: [1.4, 0.9, -0.5], fov: 46 },
  ]);
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  const laugh = Math.sin(t * 9) * 0.5 + 0.5;
  const sitPose = (seed: number, extra: Pose3 = {}): Pose3 => ({ ...SIT, bob: 0.01 * Math.sin(t * 2.4 + seed), ...extra });
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <LivingRoom3D t={t} lights={0.35} />
        {/* Bima sits between his parents */}
        <Rig3D position={[1.45, 0.04, -1.4]} rotationY={AYAH_RY} t={t} body={BIMA} pose={sitPose(1, { legL: { swing: 1.2, knee: 1.2 }, legR: { swing: 1.2, knee: 1.2 }, head: [0, -0.05, 0] })} expr={f >= bimaF ? "grin" : "happy"} look={[-0.8, 0]} seed={5} />
        <Rig3D position={AYAH_POS} rotationY={AYAH_RY} t={t} body={AYAH} pose={sitPose(2, { armR: { swing: 0.3, out: 0.15, elbow: 0.6 }, head: [-0.05, 0.0, 0] })} expr={f >= ibuF ? "smug" : "happy"} look={[-0.8, 0]} seed={2} />
        <Rig3D position={[1.45, 0.04, 0.45]} rotationY={AYAH_RY} t={t} body={IBU} pose={sitPose(3, { head: [0, 0.1, 0] })} expr={f >= ibuF ? "smug" : "happy"} look={[-0.8, 0]} seed={8} />
        <Cat3D position={[0.5, 0, -0.2]} rotationY={-Math.PI / 2 + 0.2} t={t} alert={0} />
        <Remote position={[1.2, 0.62, -0.2]} rotation={[0, 0.2, 0]} />
        <Dust t={t} />
      </Stage>
      <Grade bloom={[6, 55]} warm={0.35} />
      <Clock time="04:00 AM" />
      <Caps ids={["akhir_1", "akhir_2", "akhir_3"]} hl={["satu", "keluarga", "bareng", "Besok", "sekolah", "episode", "lagi"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(6,8,20,${0.62 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, width: 760 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 124, lineHeight: 1.05, color: "#ffb347", WebkitTextStroke: "8px #0a0b14", paintOrder: "stroke fill", textShadow: "0 10px 0 #0a0b14" }}>BESOK SEKOLAH</div>
            <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: "white", lineHeight: 1.25 }}>Misi berhasil. Sebagian.</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

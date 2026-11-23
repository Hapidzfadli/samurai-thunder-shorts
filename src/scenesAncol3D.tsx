import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { Body, Pose3, Rig3D, blendPose, easeInOut3, idle3, lerpN, lerpV, smooth3, walk3 } from "./three/objectsRig";
import { B_ASTI, B_HAPID, B_KAKAK, B_PETUGAS, B_TEMAN, Cloud3D, Ground, Heart3D, Hearts3D, House3D, MASK_A, MASK_H, Palm3D, Road, Scooter3D, Sea, Sun } from "./three/objectsAncol3d";
import { P } from "./three/objectsRig";
import timing from "./ancol3d_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_A3 = timing.scenes as Record<"chat" | "rencana" | "bersiap" | "jemput" | "motor" | "foto" | "muter" | "cair" | "biang" | "makan" | "coaster" | "pulang" | "akhir", number>;
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/* ------------------------------------------------------------------ */
/* Camera: slow, motivated moves                                         */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number };
const shotCam = (frame: number, shots: Shot[], far = 1.45) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, Math.min(s.to, start + 500) - start);
      const k = smooth3((frame - start) / len);
      const f0 = s.fov ?? 44;
      const lk = lerpV(s.l0, s.l1 ?? s.l0, k);
      const ps = lerpV(s.p0, s.p1 ?? s.p0, k);
      return { pos: [lk[0] + (ps[0] - lk[0]) * far, lk[1] + (ps[1] - lk[1]) * far, lk[2] + (ps[2] - lk[2]) * far] as Vec3, look: lk, fov: f0 + ((s.fov1 ?? f0) - f0) * k };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 44 };
};
type Cam = { pos: Vec3; look: Vec3; fov: number };

const Stage: React.FC<{ cam: Cam; bg?: string; children: React.ReactNode }> = ({ cam, bg = "#bfe8ff", children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.05, far: 80, position: cam.pos }}>
        <CameraRig position={cam.pos} lookAt={cam.look} fov={cam.fov} />
        <color attach="background" args={[bg]} />
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

const Tag: React.FC<{ label: string; from?: number; to: number; color?: string }> = ({ label, from = 0, to, color = "#ffb3cf" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: 200, left: 60, padding: "10px 24px", borderRadius: 16, background: "rgba(40,18,40,0.82)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 38, letterSpacing: 2, color: "white", opacity: s * out, transform: `translateX(${(1 - s) * -90}px)` }}>
      {label}
    </div>
  );
};
const Bubble: React.FC<{ x: number; y: number; w?: number; text: string; size?: number; from: number; to: number }> = ({ x, y, w = 420, text, size = 44, from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 11, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y, width: w, textAlign: "center", transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) }}>
      <div style={{ background: "#fff", border: "7px solid #12121a", borderRadius: 34, padding: "12px 18px", fontFamily: "Anton, Impact, sans-serif", fontSize: size, color: "#12121a", boxShadow: "0 10px 26px rgba(0,0,0,0.25)" }}>{text}</div>
    </div>
  );
};
/** Soft cinematic finish; warm = 0..1 golden tone */
const Grade: React.FC<{ warm?: number; flash?: number }> = ({ warm = 0.15, flash = 0 }) => (
  <>
    <AbsoluteFill style={{ mixBlendMode: "soft-light", background: `rgba(255,170,120,${0.25 * warm + 0.1})` }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 56%, rgba(40,16,40,0.4) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(30,10,30,0) 66%, rgba(30,10,30,0.5) 88%, rgba(30,10,30,0.66) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: flash }} />}
  </>
);
const Lights: React.FC<{ sun?: string; amb?: number; ambColor?: string; dir?: Vec3; fill?: string }> = ({ sun = "#fff4e0", amb = 1.25, ambColor = "#fff0e6", dir = [4, 7, 6], fill = "#ffd6e6" }) => (
  <>
    <ambientLight intensity={amb} color={ambColor} />
    <directionalLight position={dir} intensity={1.8} color={sun} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
    <directionalLight position={[-5, 3, 4]} intensity={0.5} color={fill} />
  </>
);

/* poses */
const sitP = (t: number, seed = 0): Pose3 => ({ ...idle3(t, seed), lean: 0.04, legL: { swing: 1.45, knee: 1.5 }, legR: { swing: 1.4, knee: 1.5 } });
const ridePose = (t: number, seed: number, front: boolean): Pose3 => ({
  ...sitP(t, seed),
  armL: { ik: { target: front ? [0.3, 0.04, 0.62] : [0.16, 0.3, 0.5], pole: [-0.4, -0.3, 0] } },
  armR: { ik: { target: front ? [-0.3, 0.04, 0.62] : [-0.16, 0.3, 0.5], pole: [0.4, -0.3, 0] } },
});
const Pair: React.FC<{ x: number; y?: number; z?: number; rot?: number; t: number; wheel: number; bounce?: number; hapidMask?: boolean; astiMask?: boolean; asti?: boolean; exprH?: "happy" | "neutral" | "surprised"; exprA?: "happy" | "neutral" | "surprised" }> = ({ x, y = 0, z = 0, rot = 0, t, wheel, bounce = 0, hapidMask = true, astiMask = true, asti = true, exprH = "happy", exprA = "happy" }) => (
  <group position={[x, y + bounce, z]} rotation={[0, rot, 0]}>
    <Scooter3D position={[0, 0, 0]} wheel={wheel} />
    <Rig3D position={[-0.1, 0.52, 0]} rotationY={Math.PI / 2} t={t} body={{ ...B_HAPID, mask: hapidMask ? MASK_H : undefined }} pose={ridePose(t, 1, true)} expr={exprH} seed={1} />
    {asti && <Rig3D position={[-0.72, 0.5, 0]} rotationY={Math.PI / 2} t={t} body={{ ...B_ASTI, mask: astiMask ? MASK_A : undefined }} pose={ridePose(t, 2, false)} expr={exprA} seed={2} />}
  </group>
);
const Mask3D: React.FC<{ position: Vec3; rot?: Vec3; color?: string; s?: number }> = ({ position, rot = [0, 0, 0], color = MASK_A, s = 1 }) => (
  <group position={position} rotation={rot} scale={s}>
    <mesh>
      <boxGeometry args={[0.18, 0.11, 0.02]} />
      <meshToonMaterial color={color} />
    </mesh>
  </group>
);
const Phone3D: React.FC<{ position?: Vec3; rot?: Vec3 }> = ({ position = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={position} rotation={rot}>
    <mesh>
      <boxGeometry args={[0.09, 0.17, 0.012]} />
      <meshBasicMaterial color="#222" />
    </mesh>
    <mesh position={[0, 0, 0.007]}>
      <planeGeometry args={[0.08, 0.15]} />
      <meshBasicMaterial color="#9ad9ff" />
    </mesh>
  </group>
);

/* ================================================================== */
/* shared set pieces                                                    */
/* ================================================================== */
const AncolSet: React.FC<{ t: number; golden?: number; gate?: boolean }> = ({ t, golden = 0, gate = false }) => (
  <group>
    <Ground color={golden > 0.5 ? "#e8c6a0" : "#f4e1b0"} />
    <Sea z={-9} color={golden > 0.5 ? "#7aa6cf" : "#4fc3e8"} t={t} />
    <Sun position={golden > 0.5 ? [8, 2.2, -28] : [10, 12, -30]} color={golden > 0.5 ? "#ffd27a" : "#ffe9a0"} r={golden > 0.5 ? 4 : 2.6} />
    {golden < 0.5 && <Cloud3D position={[-8, 10, -26]} s={1.6} />}
    {golden < 0.5 && <Cloud3D position={[7, 13, -30]} s={1.3} />}
    {[-6.5, 5.5, 9.5, -10.5].map((x, i) => <Palm3D key={i} position={[x, 0, -4 - (i % 2) * 1.2]} s={1 + (i % 3) * 0.12} sway={Math.sin(t * 1.3 + i)} />)}
    {gate && (
      <group position={[0, 0, -1.5]}>
        <P geo={() => <boxGeometry args={[0.5, 4.4, 0.5]} />} color="#ffb703" pos={[-3.2, 2.2, 0]} hull={0.03} />
        <P geo={() => <boxGeometry args={[0.5, 4.4, 0.5]} />} color="#ffb703" pos={[3.2, 2.2, 0]} hull={0.03} />
        <P geo={() => <boxGeometry args={[7.2, 0.9, 0.5]} />} color="#ffb703" pos={[0, 4.4, 0]} hull={0.03} />
        <P geo={() => <boxGeometry args={[4.4, 0.55, 0.1]} />} color="#ffffff" pos={[0, 4.4, 0.3]} hull={0.03} />
      </group>
    )}
  </group>
);
const KosSet: React.FC<{ t: number; dusk?: boolean }> = ({ t, dusk = false }) => (
  <group>
    <Ground color={dusk ? "#7a6a78" : "#cfd0c4"} />
    <Road z={1.4} dusk={dusk} width={3.2} />
    <Sun position={dusk ? [-9, 3, -30] : [10, 12, -30]} color={dusk ? "#ffd27a" : "#ffe9a0"} r={dusk ? 5 : 2.6} />
    {!dusk && <Cloud3D position={[-6, 11, -26]} s={1.5} />}
    {!dusk && <Cloud3D position={[9, 13, -30]} s={1.2} />}
    <House3D position={[4.4, 0, -1.8]} color={dusk ? "#e8b28a" : "#fff2d6"} />
    <House3D position={[8.6, 0, -1.8]} w={3.0} h={2.8} color={dusk ? "#d9a0a6" : "#e6f0ff"} roof="#6a7fb8" />
    <House3D position={[-3.4, 0, -2.4]} w={3.6} h={3.4} color={dusk ? "#c98a9a" : "#d8e7f0"} roof="#7a5a90" door={false} />
    {[-7, -1, 12].map((x, i) => <Palm3D key={i} position={[x, 0, -3.5]} s={0.9} sway={Math.sin(t * 1.2 + i)} />)}
  </group>
);

/* ================================================================== */
/* 1. CHAT                                                              */
/* ================================================================== */
export const SceneA3Chat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cal = EV("chat.cal");
  const type = EV("chat.type");
  const heart = EV("chat.heart");
  const meet = EV("chat.meet");
  const cam = shotCam(f, [{ to: 9999, p0: [0, 1.4, 8.0], l0: [0, 1.2, 0], p1: [0, 1.4, 6.8], l1: [0, 1.2, 0], fov: 34 }]);
  const msgs: [string, boolean][] = [["Halo, lagi apa?", false], ["Lagi santai, kamu?", true], ["Sama! Hehe", false], ["Besok chat lagi ya", true]];
  const day = Math.min(30, 1 + Math.floor(cl((f - cal) / (meet - cal + 10)) * 29));
  const phoneR = (k: number): Pose3 => ({ ...idle3(t, k), armR: { ik: { target: [-0.14, 0.58, 0.38], pole: [-0.5, -0.4, 0] } }, armL: { swing: 0.02, out: 0.15, elbow: 0.2 } });
  return (
    <>
      <Stage cam={cam} bg="#f5d9ee">
        <mesh position={[0, 3, -4]}>
          <planeGeometry args={[40, 14]} />
          <meshBasicMaterial color="#f5d9ee" />
        </mesh>
        <Ground color="#f9e6d6" />
        {[...Array(8)].map((_, i) => <Heart3D key={i} position={[-4 + i * 1.15, 3.4 + ((i * 7) % 5) * 0.35, -3 + (i % 3) * 0.3]} s={1.4 + (i % 3) * 0.5} color="#ffb3cf" opacity={0.55} />)}
        <Rig3D position={[-1.15, 0, 0]} rotationY={0.4} t={t} body={B_HAPID} pose={phoneR(1)} expr="happy" seed={1}>
          <Phone3D position={[-0.14, 0.62, 0.42]} rot={[-0.3, 0.3, 0]} />
        </Rig3D>
        <Rig3D position={[1.15, 0, 0]} rotationY={-0.4} t={t} body={B_ASTI} pose={phoneR(2)} expr="happy" seed={2}>
          <Phone3D position={[-0.14, 0.62, 0.42]} rot={[-0.3, -0.3, 0]} />
        </Rig3D>
        <Hearts3D position={[0, 1.9, 0.3]} f={f} at={heart} n={6} spread={2.4} />
        <Lights />
      </Stage>
      <div style={{ position: "absolute", left: 150, top: 250, width: 780, height: 470, background: "rgba(255,255,255,0.96)", border: "6px solid #12121a", borderRadius: 38, boxShadow: "0 16px 40px rgba(0,0,0,0.22)", overflow: "hidden", fontFamily: FONT_BODY }}>
        <div style={{ background: "#3b78e7", color: "#fff", fontWeight: 800, fontSize: 36, padding: "14px 26px", display: "flex", justifyContent: "space-between" }}>
          <span>Chat Asti</span>
          <span>Hari ke-{day}</span>
        </div>
        <div style={{ padding: "16px 22px" }}>
          {msgs.map(([m, mine], i) => {
            const at = type + i * 26;
            const k = Math.min(1, Math.max(0, (f - at) / 8));
            return (
              <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 12, opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
                <span style={{ background: mine ? "#3b78e7" : "#eceff4", color: mine ? "#fff" : "#12121a", fontWeight: 700, fontSize: 32, padding: "10px 24px", borderRadius: 30, border: "3px solid #12121a" }}>{m}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Grade warm={0.1} />
      <Tag label="BERMULA DARI CHAT" to={heart} color="#3b78e7" />
      <Bubble x={540} y={760} w={640} text="PENGEN KETEMU LANGSUNG..." size={42} from={meet} to={9999} />
      <Caps ids={["c1", "c2"]} hl={["Facebook", "sapa", "setiap", "hari", "akhirnya", "bertemu"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 2. RENCANA                                                           */
/* ================================================================== */
export const SceneA3Rencana: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ask = EV("rencana.ask");
  const yes = EV("rencana.yes");
  const vou = EV("rencana.voucher");
  const cam = shotCam(f, [{ to: yes, p0: [0, 1.4, 6.4], l0: [0, 1.15, 0], p1: [0, 1.4, 6.0], l1: [0, 1.15, 0], fov: 34 }, { to: 9999, p0: [0, 1.4, 6.0], l0: [0, 1.15, 0], p1: [0, 1.6, 7.6], l1: [0, 1.2, 0], fov: 34 }]);
  const wave = (k: number): Pose3 => ({ ...idle3(t, k), armR: { swing: -2.4 + Math.sin(f * 0.4) * 0.3, out: 0.4, elbow: 0.5 } });
  const k = spring({ frame: f - vou, fps: 30, config: { damping: 9, stiffness: 150 } });
  return (
    <>
      <Stage cam={cam}>
        <AncolSet t={t} />
        <Rig3D position={[-0.85, 0, 0]} rotationY={0.5} t={t} body={B_HAPID} pose={f >= ask && f < yes + 10 ? wave(1) : idle3(t, 1)} expr="happy" seed={1} />
        <Rig3D position={[0.85, 0, 0]} rotationY={-0.5} t={t} body={B_ASTI} pose={f >= yes ? wave(2) : idle3(t, 2)} expr={f >= yes ? "happy" : "neutral"} seed={2} />
        <Lights />
      </Stage>
      <Grade warm={0.15} />
      <Bubble x={300} y={430} w={440} text="KE ANCOL YUK?" size={46} from={ask} to={yes + 6} />
      <Bubble x={780} y={520} w={380} text="BOLEH, KAK!" size={48} from={yes} to={vou + 14} />
      {f >= vou && (
        <div style={{ position: "absolute", left: 100, top: 300, width: 880, textAlign: "center", transform: `rotate(-6deg) scale(${0.3 + 0.7 * k})`, opacity: Math.min(1, k * 1.4) }}>
          <div style={{ display: "inline-block", background: "#ffd23f", border: "9px solid #12121a", borderRadius: 24, padding: "20px 44px", boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 100, color: "#12121a", lineHeight: 1 }}>VOUCHER</div>
            <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 84, color: "#e03131", lineHeight: 1 }}>DISKON!</div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 36, color: "#12121a" }}>hemat beberapa ribu</div>
          </div>
        </div>
      )}
      <Tag label="RENCANA SERU" to={yes} color="#ffb703" />
      <Caps ids={["r1", "r2", "r3", "r4"]} hl={["beranikan", "Ancol", "yuk", "Boleh", "voucher", "diskon", "hemat"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 3. BERSIAP                                                           */
/* ================================================================== */
export const SceneA3Bersiap: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const mir = EV("bersiap.mirror");
  const msk = EV("bersiap.mask");
  const cam = shotCam(f, [{ to: msk, p0: [-0.6, 1.5, 6.0], l0: [0.7, 1.15, 0], p1: [-0.2, 1.5, 5.4], l1: [0.8, 1.15, 0], fov: 34 }, { to: 9999, p0: [-0.2, 1.5, 5.4], l0: [0.8, 1.15, 0], p1: [0.3, 1.5, 7.0], l1: [0.8, 1.2, 0], fov: 34 }]);
  const fix = f >= mir - 20 && f < msk - 12;
  const maskOn = f >= msk;
  const pose: Pose3 = fix
    ? { ...idle3(t, 1), lean: 0.03, armR: { ik: { target: [0.02, 1.0, 0.16], pole: [0.5, 0.2, -0.2] } }, head: [-0.1, 0.0, 0.05] }
    : f >= msk - 12 && f < msk + 14
      ? { ...idle3(t, 1), armL: { ik: { target: [0.1, 0.8, 0.22], pole: [-0.5, -0.3, 0] } }, armR: { ik: { target: [-0.1, 0.8, 0.22], pole: [0.5, -0.3, 0] } } }
      : { ...idle3(t, 1), armR: { swing: 0.05, out: 0.2, elbow: 0.3 } };
  return (
    <>
      <Stage cam={cam} bg="#ffe1c4">
        <mesh position={[0, 3, -2.2]}>
          <planeGeometry args={[40, 12]} />
          <meshStandardMaterial color="#ffe1c4" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <meshStandardMaterial color="#c9996a" roughness={0.9} />
        </mesh>
        {/* mirror on the right */}
        <group position={[2.0, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <P geo={() => <boxGeometry args={[1.5, 2.3, 0.1]} />} color="#8b5a2b" hull={0.03} />
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[1.3, 2.1]} />
            <meshBasicMaterial color="#bfe6ff" />
          </mesh>
        </group>
        <P geo={() => <boxGeometry args={[1.6, 0.9, 1.0]} />} color="#e8c39a" pos={[-2.4, 0.45, -1.2]} hull={0.03} />
        <Rig3D position={[0.7, 0, 0]} rotationY={Math.PI / 2 - 0.15} t={t} body={{ ...B_HAPID, mask: maskOn ? MASK_H : undefined }} pose={pose} expr={maskOn ? "worried" : "happy"} seed={1} />
        <Lights ambColor="#ffe8d0" />
      </Stage>
      <Grade warm={0.3} />
      <Tag label="HARI H" to={msk} color="#ff6b9a" />
      <Caps ids={["b1"]} hl={["tiba", "grogi", "masker"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 4. JEMPUT: pinjam masker                                             */
/* ================================================================== */
const MX = 0.8;
export const SceneA3Jemput: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const arrive = EV("jemput.arrive");
  const look = EV("jemput.look");
  const cover = EV("jemput.cover");
  const mount = EV("jemput.mount");
  const ask = EV("jemput.ask");
  const go = EV("jemput.go");
  const back = EV("jemput.back");
  const inK = easeInOut3(cl(f / Math.max(40, arrive + 70)));
  const mx = lerpN(-5, MX, inK);
  const driving = inK < 1;
  const outX = (k: number) => k;
  // Asti path
  const toDoor = 4.4;
  const meetX = 2.4;
  const showA = f >= look - 50;
  const walkIn = easeInOut3(cl((f - (look - 50)) / 50));
  const toBike = easeInOut3(cl((f - cover) / Math.max(20, mount - cover)));
  const seated = f >= mount && f < go;
  const sitK = easeInOut3(cl((f - mount) / 10));
  const runOut = easeInOut3(cl((f - go) / 60));
  const runBack = easeInOut3(cl((f - (back - 10)) / 50));
  const friendOn = f >= go + 36;
  const seatX = MX - 0.72;
  let ax = toDoor;
  let ay = 0;
  let rot = -Math.PI / 2;
  let pose: Pose3 = idle3(t, 2);
  let masked = false;
  if (f < cover) {
    ax = lerpN(toDoor, meetX, walkIn);
    pose = walkIn < 1 ? walk3(f * 0.03, "walk") : idle3(t, 2);
  } else if (f < mount) {
    ax = lerpN(meetX, seatX + 0.6, toBike);
    pose = { ...(toBike < 1 ? walk3(f * 0.03, "walk") : idle3(t, 2)), armL: { ik: { target: [0.12, 0.8, 0.24], pole: [-0.5, -0.3, 0] } }, armR: { ik: { target: [-0.12, 0.8, 0.24], pole: [0.5, -0.3, 0] } } };
  } else if (f < go) {
    ax = lerpN(seatX + 0.6, seatX, sitK);
    ay = 0.5 * sitK;
    rot = lerpN(-Math.PI / 2, Math.PI / 2, sitK);
    pose = blendPose(idle3(t, 2), ridePose(t, 2, false), sitK);
  } else if (f < back - 10) {
    ax = lerpN(seatX, 7.0, runOut);
    ay = 0.5 * (1 - cl((f - go) / 8));
    rot = Math.PI / 2;
    pose = { ...walk3(f * 0.07, "walk"), lean: 0.25 };
    if (runOut >= 1) pose = { ...idle3(t, 2), armR: { swing: -1.0, out: 0.3, elbow: 0.5 } };
    masked = f >= go + 70;
  } else {
    ax = lerpN(7.0, seatX + (runBack < 1 ? 0.6 : 0), runBack);
    rot = -Math.PI / 2;
    pose = runBack < 1 ? { ...walk3(f * 0.07, "walk"), lean: 0.25 } : idle3(t, 2);
    masked = true;
    if (runBack >= 1) {
      ay = 0.5;
      rot = Math.PI / 2;
      pose = ridePose(t, 2, false);
      ax = seatX;
    }
  }
  const laugh = f >= go && f < back + 20 ? Math.sin(f * 1.1) * 0.06 : 0;
  const hLook = f >= look && f < cover ? 0.6 : 0;
  const cam = shotCam(f, [
    { to: look, p0: [-1.0, 1.4, 7.8], l0: [0.4, 1.1, 0], p1: [0.2, 1.4, 7.2], l1: [1.2, 1.1, 0], fov: 34 },
    { to: go, p0: [0.4, 1.35, 6.2], l0: [1.5, 1.2, 0], p1: [1.0, 1.35, 6.4], l1: [1.5, 1.2, 0], fov: 34 },
    { to: go + 70, p0: [2.8, 1.5, 9.2], l0: [2.8, 1.15, 0], p1: [5.6, 1.5, 9.2], l1: [5.6, 1.15, 0], fov: 34 },
    { to: back + 20, p0: [5.6, 1.5, 9.2], l0: [5.6, 1.15, 0], p1: [2.8, 1.5, 9.2], l1: [2.8, 1.15, 0], fov: 34 },
    { to: 9999, p0: [2.8, 1.5, 9.2], l0: [2.8, 1.15, 0], p1: [2.8, 1.5, 9.2], l1: [2.8, 1.15, 0], fov: 34 },
  ]);
  return (
    <>
      <Stage cam={cam}>
        <KosSet t={t} />
        <group position={[mx, laugh, 0.3]}>
          <Scooter3D position={[0, 0, 0]} wheel={driving ? f * 0.5 : 0} />
          <Rig3D position={[-0.1, 0.52, 0]} rotationY={Math.PI / 2 - hLook * 0.5} t={t} body={{ ...B_HAPID, mask: MASK_H }} pose={{ ...ridePose(t, 1, true), lean: 0.04 + laugh * 2 }} expr={f >= go ? "happy" : f >= look ? "surprised" : "neutral"} seed={1} />
        </group>
        {showA && <Rig3D position={[ax, ay, 0.3]} rotationY={rot} t={t} body={{ ...B_ASTI, mask: masked ? MASK_A : undefined }} pose={pose} expr="happy" seed={2} />}
        {friendOn && <Rig3D position={[8.0, 0, -0.1]} rotationY={-Math.PI / 2 + 0.2} t={t} body={B_TEMAN} pose={{ ...idle3(t, 5), armR: { swing: -1.0, out: 0.2, elbow: 0.4 } }} expr="happy" seed={5} />}
        {f >= look && f < cover + 30 && <Hearts3D position={[meetX - 0.6, 2.0, 0.3]} f={f} at={look} n={4} spread={1.1} />}
        <Lights />
      </Stage>
      <Grade warm={0.12} />
      <Bubble x={540} y={560} w={560} text="SEBENTAR YA, KAK!" size={44} from={ask} to={ask + 60} />
      {f >= go + 8 && f < back + 10 && <Bubble x={300} y={620} w={260} text="HAHA!" size={52} from={go + 8} to={back + 10} />}
      <Tag label="JEMPUT DI KOSAN" to={look + 60} color="#ff6b9a" />
      <Caps ids={["j1", "j2", "j3", "j4"]} hl={["menjemputnya", "memandang", "tidak", "malu", "menutupi", "motorku", "sebentar", "pinjam", "masker", "berlari", "tertawa"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 5. MOTOR: ke Ancol                                                   */
/* ================================================================== */
export const SceneA3Motor: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const go = EV("motor.go");
  const heart = EV("motor.heart");
  const dur = DURATIONS_A3.motor;
  const GATE_X = 36;
  const run = cl((f - 4) / Math.max(60, dur - 40));
  const mx = lerpN(-3, GATE_X + 0.5, easeInOut3(run));
  const moving = run < 1;
  const camX = mx + 0.2;
  const k = cl((f - (dur - 70)) / 70);
  const cam = shotCam(f, [{ to: 9999, p0: [camX + 0.6, 1.25, 7.4 + 5.5 * smooth3(k)], l0: [camX + 0.2, 1.0, 0], fov: 34 }]);
  return (
    <>
      <Stage cam={cam}>
        <Ground color="#d8d3c4" />
        <Road z={0} width={3.4} scroll={mx} />
        <Sun position={[mx + 14, 10, -30]} />
        <Cloud3D position={[mx - 4, 11, -26]} s={1.4} />
        <Cloud3D position={[mx + 10, 13, -30]} s={1.2} />
        {[...Array(12)].map((_, i) => <Palm3D key={i} position={[-4 + i * 4.2, 0, -2.4 - (i % 3) * 0.8]} s={0.9 + (i % 2) * 0.15} sway={Math.sin(t * 1.3 + i)} />)}
        {[...Array(5)].map((_, i) => <House3D key={i} position={[2 + i * 7.2, 0, -5.2]} w={3.4} h={3 + (i % 2)} color={["#fff2d6", "#e6f0ff", "#ffe1e1", "#e7ffe9", "#f2e6ff"][i]} roof={["#c0534a", "#6a7fb8", "#c07a4a", "#4aa072", "#8a5ac0"][i]} door={false} />)}
        <Sea z={-12} />
        {/* gate */}
        <group position={[GATE_X, 0, 0]}>
          <P geo={() => <boxGeometry args={[0.6, 5, 0.6]} />} color="#ffb703" pos={[0, 2.5, -2.2]} hull={0.03} />
          <P geo={() => <boxGeometry args={[0.6, 5, 0.6]} />} color="#ffb703" pos={[0, 2.5, 2.2]} hull={0.03} />
          <P geo={() => <boxGeometry args={[0.6, 0.9, 5.4]} />} color="#ffb703" pos={[0, 5, 0]} hull={0.03} />
          <P geo={() => <boxGeometry args={[0.1, 0.55, 3.2]} />} color="#ffffff" pos={[-0.35, 5, 0]} hull={0.03} />
        </group>
        <Pair x={mx} z={0} t={t} wheel={moving ? f * 0.6 : 0} bounce={moving ? Math.abs(Math.sin(f * 0.5)) * 0.02 : 0} />
        <Hearts3D position={[mx - 0.4, 2.0, 0.3]} f={f} at={heart} n={5} spread={1.4} />
        <Lights />
      </Stage>
      <Grade warm={0.1} />
      {f >= dur - 70 && <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", fontFamily: "Anton, Impact, sans-serif", fontSize: 130, color: "#fff", WebkitTextStroke: "9px #1c9ad6", paintOrder: "stroke fill", opacity: cl((f - dur + 70) / 12), letterSpacing: 6 }}>ANCOL</div>}
      <Tag label="MENUJU ANCOL" to={heart + 30} color="#1c9ad6" />
      <Caps ids={["m1"]} hl={["berangkat", "Ancol", "berdebar"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 6. FOTO                                                              */
/* ================================================================== */
export const SceneA3Foto: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ask = EV("foto.ask");
  const say = EV("foto.say");
  const flash = EV("foto.flash");
  const laugh = EV("foto.laugh");
  const fl = f >= flash ? interpolate(f, [flash, flash + 3, flash + 14], [0, 1, 0], clamp) : 0;
  const lau = f >= laugh ? Math.sin((f - laugh) * 1.2) : 0;
  const cam = shotCam(f, [
    { to: say, p0: [0.4, 1.4, 7.4], l0: [0.4, 1.1, 0], p1: [0.4, 1.4, 6.6], l1: [0.4, 1.1, 0], fov: 34 },
    { to: laugh, p0: [0.4, 1.4, 6.6], l0: [0.5, 1.15, 0], p1: [0.5, 1.4, 6.0], l1: [0.5, 1.15, 0], fov: 34 },
    { to: 9999, p0: [0.5, 1.4, 6.0], l0: [0.5, 1.15, 0], p1: [0.4, 1.7, 8.0], l1: [0.5, 1.2, 0], fov: 34 },
  ]);
  const takePic = f >= ask && f < say + 26;
  const kakakPose: Pose3 = takePic
    ? { ...idle3(t, 3), armR: { ik: { target: [-0.12, 0.66, 0.45], pole: [-0.5, -0.2, 0] } }, armL: { ik: { target: [0.12, 0.66, 0.45], pole: [0.5, -0.2, 0] } } }
    : { ...idle3(t, 3), armR: { swing: -0.5, out: 0.2, elbow: 0.8 }, armL: { swing: 0.1, out: 0.2, elbow: 0.2 } };
  const couple = (k: number): Pose3 => ({ ...idle3(t, k), sway: lau * 0.08, lean: 0.02 + Math.abs(lau) * 0.18, head: [0.1 * lau, 0, lau * 0.1] });
  return (
    <>
      <Stage cam={cam}>
        <AncolSet t={t} />
        <Rig3D position={[-1.6, 0, 0]} rotationY={Math.PI / 2 - 0.5} t={t} body={B_KAKAK} pose={kakakPose} expr="happy" seed={3}>
          {takePic && <Phone3D position={[0, 0.68, 0.52]} rot={[0, 0, 0]} />}
        </Rig3D>
        <Rig3D position={[0.7, 0, 0]} rotationY={-0.6} t={t} body={{ ...B_HAPID, mask: MASK_H }} pose={couple(1)} expr={f >= laugh ? "happy" : "neutral"} seed={1} />
        <Rig3D position={[1.75, 0, 0]} rotationY={-0.6} t={t} body={{ ...B_ASTI, mask: MASK_A }} pose={couple(2)} expr={f >= laugh ? "happy" : "neutral"} seed={2} />
        {f >= laugh && <Hearts3D position={[1.2, 2.0, 0.3]} f={f} at={laugh + 8} n={5} spread={1.6} />}
        <Lights />
      </Stage>
      <Grade warm={0.12} flash={fl} />
      <Bubble x={300} y={470} w={620} text="SEMOGA LANGGENG YA, KAK!" size={42} from={say} to={laugh + 10} />
      {f >= laugh && f < laugh + 60 && <Bubble x={760} y={640} w={340} text="HAHAHA!" size={52} from={laugh} to={laugh + 60} />}
      <Tag label="FOTO BERDUA" to={say} color="#ffb703" />
      <Caps ids={["f1", "f2", "f3"]} hl={["malu-malu", "memotret", "langgeng", "tertawa", "belum"]} color="#ffb3cf" />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* helpers for the second half                                           */
/* ------------------------------------------------------------------ */
/** keyframe interpolation with ease between [frame, value] pairs */
const kf = (f: number, keys: [number, number][]) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (f < keys[i][0]) {
      const [a, va] = keys[i - 1];
      const [b, vb] = keys[i];
      return lerpN(va, vb, easeInOut3(cl((f - a) / Math.max(1, b - a))));
    }
  }
  return keys[keys.length - 1][1];
};
const Cone3D: React.FC<{ position?: Vec3; rot?: Vec3; scoops?: number }> = ({ position = [0, 0, 0], rot = [0, 0, 0], scoops = 2 }) => (
  <group position={position} rotation={rot}>
    <P geo={() => <coneGeometry args={[0.07, 0.2, 10]} />} color="#e0a85b" rot={[Math.PI, 0, 0]} pos={[0, -0.1, 0]} hull={0.06} />
    {scoops >= 1 && <P geo={() => <sphereGeometry args={[0.075, 12, 10]} />} color="#ffb3d1" pos={[0, 0.03, 0]} hull={0.07} />}
    {scoops >= 2 && <P geo={() => <sphereGeometry args={[0.065, 12, 10]} />} color="#fff1a8" pos={[0, 0.11, 0]} hull={0.07} />}
  </group>
);
const Stars3D: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[Math.cos(f * 0.2 + i * 2.1) * 0.35, Math.sin(f * 0.2 + i * 2.1) * 0.08, Math.sin(f * 0.2 + i * 2.1) * 0.35]}>
        <octahedronGeometry args={[0.07]} />
        <meshBasicMaterial color="#ffe14d" />
      </mesh>
    ))}
  </group>
);
const Bench: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <P geo={() => <boxGeometry args={[2.0, 0.1, 0.5]} />} color="#c8743a" pos={[0, 0.48, 0]} hull={0.03} />
    <P geo={() => <boxGeometry args={[2.0, 0.5, 0.08]} />} color="#c8743a" pos={[0, 0.8, -0.24]} hull={0.03} />
    {[-0.9, 0.9].map((x) => <P key={x} geo={() => <boxGeometry args={[0.08, 0.48, 0.45]} />} color="#6b4a2e" pos={[x, 0.24, 0]} hull={0.03} />)}
  </group>
);

/* ================================================================== */
/* 7. MUTER: wahana berputar                                            */
/* ================================================================== */
export const SceneA3Muter: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const start = EV("muter.start");
  const mual = EV("muter.mual");
  const fun = EV("muter.fun");
  const spd = 0.012 + 0.07 * easeInOut3(cl((f - start + 30) / 70));
  const phi = 0.12 + 0.6 * easeInOut3(cl((f - start + 20) / 80));
  const theta = f * spd;
  const R = 2.5;
  const L = 2.2;
  const chairPos = (a: number): Vec3 => [(R + L * Math.sin(phi)) * Math.cos(a), 4.3 - L * Math.cos(phi), -(R + L * Math.sin(phi)) * Math.sin(a)];
  const yawFor = (a: number) => Math.atan2(-Math.sin(a), -Math.cos(a));
  const aH = theta;
  const aA = theta - 0.5;
  const pH = chairPos(aH);
  const pA = chairPos(aA);
  const mid: Vec3 = [(pH[0] + pA[0]) / 2, (pH[1] + pA[1]) / 2 + 0.2, (pH[2] + pA[2]) / 2];
  const ac = theta + 0.35;
  const camPos: Vec3 = [11 * Math.cos(ac), 3.6, -11 * Math.sin(ac)];
  const ride = f < mual;
  const cheer: Pose3 = { ...idle3(t, 1), legL: { swing: 0.5, knee: 0.3 }, legR: { swing: 0.5, knee: 0.3 }, armL: { swing: -2.6, out: 0.3, elbow: 0.2 }, armR: { swing: -2.6, out: 0.3, elbow: 0.2 } };
  const sick: Pose3 = { ...idle3(t, 2), lean: 0.3, legL: { swing: 0.5, knee: 0.3 }, legR: { swing: 0.5, knee: 0.3 }, armL: { ik: { target: [0.2, 0.15, 0.32], pole: [-0.2, 0, 0] } }, armR: { ik: { target: [-0.2, 0.15, 0.32], pole: [0.2, 0, 0] } }, head: [0.3, 0, 0.1] };
  const camRide = { pos: camPos, look: mid, fov: 40 } as Cam;
  const camGround = shotCam(f - mual, [{ to: 9999, p0: [0, 1.4, 6.0], l0: [0, 1.1, 0], p1: [0, 1.5, 5.2], l1: [0, 1.15, 0], fov: 34 }]);
  const hunch: Pose3 = { ...idle3(t, 2), lean: 0.55, head: [0.4, 0, 0.1], armR: { swing: 0.4, out: 0.2, elbow: 1.0 }, armL: { swing: 0.1, out: 0.2, elbow: 0.2 }, legL: { swing: 0.1, knee: 0.2 }, legR: { swing: -0.05, knee: 0.1 } };
  const cheer2: Pose3 = { ...idle3(t, 1), bob: 0.03 * Math.abs(Math.sin(f * 0.3)), armL: { swing: -2.6 + Math.sin(f * 0.4) * 0.2, out: 0.3, elbow: 0.2 }, armR: { swing: -2.6 - Math.sin(f * 0.4) * 0.2, out: 0.3, elbow: 0.2 } };
  return (
    <>
      <Stage cam={ride ? camRide : camGround} bg="#bfe8ff">
        {ride ? (
          <group>
            <Ground color="#f4e1b0" />
            <Sea z={-22} t={t} />
            <Sun position={[14, 12, -30]} />
            {[...Array(10)].map((_, i) => <Palm3D key={i} position={[16 * Math.cos(i * 0.63), 0, 16 * Math.sin(i * 0.63)]} s={1.1} sway={Math.sin(t + i)} />)}
            <Cloud3D position={[-10, 12, -24]} s={1.6} />
            <P geo={() => <cylinderGeometry args={[0.28, 0.4, 4.4, 10]} />} color="#9aa4b2" pos={[0, 2.2, 0]} hull={0.03} />
            <group rotation={[0, theta, 0]}>
              <P geo={() => <cylinderGeometry args={[R + 0.2, R + 0.2, 0.3, 24]} />} color="#e63946" pos={[0, 4.4, 0]} hull={0.03} />
              <P geo={() => <coneGeometry args={[R + 0.4, 0.8, 24]} />} color="#ffd23f" pos={[0, 4.95, 0]} hull={0.03} />
            </group>
            {[...Array(6)].map((_, i) => {
              const a = theta + (i * Math.PI) / 3 - (i === 0 ? 0 : 0);
              const cp = chairPos(a);
              const hook: Vec3 = [R * Math.cos(a), 4.3, -R * Math.sin(a)];
              if (i === 0 || i === 5) return null;
              return (
                <group key={i}>
                  <mesh position={[(cp[0] + hook[0]) / 2, (cp[1] + hook[1]) / 2, (cp[2] + hook[2]) / 2]} scale={[0.03, Math.hypot(cp[0] - hook[0], cp[1] - hook[1], cp[2] - hook[2]), 0.03]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#444" />
                  </mesh>
                  <P geo={() => <boxGeometry args={[0.6, 0.12, 0.5]} />} color={["#6ec6ff", "#ffd23f", "#9be7a6", "#ffa8c8"][i % 4]} pos={cp} rot={[0, yawFor(a), 0]} hull={0.05} />
                </group>
              );
            })}
            {[[aH, pH, 1], [aA, pA, 2]].map(([a, p, k]) => {
              const pos = p as Vec3;
              const hook: Vec3 = [R * Math.cos(a as number), 4.3, -R * Math.sin(a as number)];
              return (
                <group key={k as number}>
                  <mesh position={[(pos[0] + hook[0]) / 2, (pos[1] + hook[1]) / 2, (pos[2] + hook[2]) / 2]} scale={[0.03, Math.hypot(pos[0] - hook[0], pos[1] - hook[1], pos[2] - hook[2]), 0.03]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#444" />
                  </mesh>
                  <P geo={() => <boxGeometry args={[0.6, 0.12, 0.5]} />} color={k === 1 ? "#6ec6ff" : "#ffa8c8"} pos={pos} rot={[0, yawFor(a as number), 0]} hull={0.05} />
                  <Rig3D position={[pos[0], pos[1] - 0.76, pos[2]]} rotationY={yawFor(a as number)} t={t} body={k === 1 ? { ...B_HAPID, mask: MASK_H } : { ...B_ASTI, mask: MASK_A }} pose={k === 1 ? cheer : sick} expr={k === 1 ? "grin" : "scared"} seed={k as number} />
                </group>
              );
            })}
          </group>
        ) : (
          <group>
            <AncolSet t={t} />
            <Rig3D position={[-0.9, 0, 0]} rotationY={0.35} t={t} body={{ ...B_ASTI, mask: MASK_A }} pose={hunch} expr="scared" seed={2} />
            <Stars3D position={[-0.9, 1.75, 0.15]} f={f} />
            <Rig3D position={[0.9, 0, 0]} rotationY={-0.35} t={t} body={{ ...B_HAPID, mask: MASK_H }} pose={cheer2} expr="grin" seed={1} />
          </group>
        )}
        <Lights />
      </Stage>
      <Grade warm={0.12} />
      <Bubble x={300} y={560} w={420} text="AKU MUAL..." size={46} from={mual} to={mual + 70} />
      {f >= fun && <Bubble x={780} y={520} w={360} text="SERU BANGET!" size={46} from={fun} to={fun + 60} />}
      <Tag label="WAHANA PERTAMA" to={mual} color="#ff6b6b" />
      <Caps ids={["w1", "w2", "w3"]} hl={["mengantre", "berputar-putar", "mual", "seru", "banget"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 8. CAIR: minum, es krim, buka masker                                 */
/* ================================================================== */
export const SceneA3Cair: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const want = EV("cair.want");
  const turn = EV("cair.turn");
  const buy = EV("cair.buy");
  const drop = EV("cair.drop");
  const sigh = EV("cair.sigh");
  const mask = EV("cair.mask");
  const maskOff = f >= mask + 10;
  // positions / yaw via keyframes
  const hx = kf(f, [[0, -0.7], [turn, -0.45], [buy - 6, -0.45], [buy + 24, -1.0], [mask + 4, -1.0], [mask + 40, -0.8]]);
  const ax = kf(f, [[0, 0.7], [turn, 0.45], [buy - 6, 0.45], [buy + 24, 0.2], [mask + 4, 0.2], [mask + 40, 0.8]]);
  const hr = kf(f, [[0, 0.8], [want + 10, 0.8], [turn + 14, -1.45], [buy - 6, -1.45], [buy + 24, -0.9], [mask + 4, -0.9], [mask + 40, 0.55]]);
  const ar = kf(f, [[0, -0.8], [want + 10, -0.8], [turn + 14, 1.45], [buy - 6, 1.45], [buy + 24, -0.9], [mask + 4, -0.9], [mask + 40, -0.55]]);
  const drink = f >= turn + 10 && f < buy - 10;
  const sip = drink ? Math.abs(Math.sin((f - turn) * 0.25)) : 0;
  const mouth = (side: number): Pose3["armR"] => ({ ik: { target: [side * 0.02, 0.8 + sip * 0.05, 0.22], pole: [side * 0.5, -0.1, 0] } });
  const holding = f >= buy + 6 && f < drop;
  const cone = (side: number): Pose3["armR"] => ({ ik: { target: [side * 0.18, 0.14, 0.42], pole: [side * 0.5, -0.3, 0] } });
  const hPose: Pose3 = drink ? { ...idle3(t, 1), lean: -0.12, head: [-0.45 * sip, 0, 0], armR: mouth(-1) } : holding ? { ...idle3(t, 1), armR: cone(-1) } : f >= drop && f < mask ? { ...idle3(t, 1), lean: 0.2, head: [0.3, 0, 0], armR: { swing: 0.2, out: 0.2, elbow: 0.5 } } : f >= mask + 10 ? { ...idle3(t, 1), sway: Math.sin(f * 0.2) * 0.03, armR: { swing: -0.3, out: 0.25, elbow: 0.9 } } : idle3(t, 1);
  const aPose: Pose3 = drink ? { ...idle3(t, 2), lean: -0.12, head: [-0.45 * sip, 0, 0], armR: mouth(-1) } : f >= buy + 6 && f < mask ? { ...idle3(t, 2), armR: cone(-1) } : f >= mask + 10 ? { ...idle3(t, 2), sway: Math.sin(f * 0.2 + 1) * 0.03, armL: { swing: -0.2, out: 0.25, elbow: 1.0 } } : idle3(t, 2);
  const fall = easeInOut3(cl((f - drop) / 16));
  const conePos: Vec3 = [lerpN(hx - 0.2, hx - 0.35, fall), lerpN(1.0, 0.1, fall * fall), 0.4];
  const cam = shotCam(f, [
    { to: turn, p0: [0, 1.4, 6.6], l0: [0, 1.15, 0], p1: [0, 1.4, 6.0], l1: [0, 1.15, 0], fov: 34 },
    { to: sigh, p0: [-0.4, 1.4, 6.4], l0: [-0.4, 1.1, 0], p1: [-0.4, 1.35, 5.8], l1: [-0.4, 1.1, 0], fov: 34 },
    { to: mask, p0: [-0.2, 1.4, 6.2], l0: [0, 1.15, 0], p1: [0, 1.4, 5.6], l1: [0, 1.2, 0], fov: 34 },
    { to: 9999, p0: [0, 1.4, 5.6], l0: [0, 1.2, 0], p1: [0, 1.7, 7.6], l1: [0, 1.2, 0], fov: 34 },
  ]);
  return (
    <>
      <Stage cam={cam}>
        <AncolSet t={t} />
        <Bench position={[0, 0, -1.4]} />
        {/* ice cream cart */}
        <group position={[-3.2, 0, -0.5]}>
          <P geo={() => <boxGeometry args={[1.4, 1.0, 0.9]} />} color="#ffffff" pos={[0, 0.9, 0]} hull={0.03} />
          <P geo={() => <boxGeometry args={[1.6, 0.18, 1.1]} />} color="#ff6b9a" pos={[0, 1.5, 0]} hull={0.03} />
          <P geo={() => <coneGeometry args={[1.1, 0.7, 4]} />} color="#ffe14d" pos={[0, 2.1, 0]} rot={[0, Math.PI / 4, 0]} hull={0.03} />
          {[-0.5, 0.5].map((x) => <P key={x} geo={() => <cylinderGeometry args={[0.25, 0.25, 0.12, 14]} />} color="#555" pos={[x, 0.26, 0.5]} rot={[Math.PI / 2, 0, 0]} hull={0.05} />)}
        </group>
        <Rig3D position={[hx, 0, 0]} rotationY={hr} t={t} body={{ ...B_HAPID, mask: maskOff ? undefined : MASK_H }} pose={hPose} expr={f >= mask ? "happy" : f >= drop ? "worried" : "neutral"} seed={1}>
          {(drink || (f >= turn - 30 && f < buy)) && <group position={[-0.02, 0.8 + sip * 0.1, 0.28]} rotation={[-sip * 1.2, 0, 0]}><P geo={() => <cylinderGeometry args={[0.035, 0.035, 0.18, 10]} />} color="#6ec6ff" hull={0.08} /></group>}
          {holding && <Cone3D position={[-0.18, 0.22, 0.46]} />}
        </Rig3D>
        <Rig3D position={[ax, 0, 0]} rotationY={ar} t={t} body={{ ...B_ASTI, mask: maskOff ? undefined : MASK_A }} pose={aPose} expr={f >= mask ? "happy" : f >= sigh ? "surprised" : "neutral"} seed={2}>
          {(drink || (f >= turn - 30 && f < buy)) && <group position={[-0.02, 0.8 + sip * 0.1, 0.28]} rotation={[-sip * 1.2, 0, 0]}><P geo={() => <cylinderGeometry args={[0.035, 0.035, 0.18, 10]} />} color="#ffa8c8" hull={0.08} /></group>}
          {f >= buy + 6 && f < mask + 10 && <Cone3D position={[-0.18, 0.22, 0.46]} scoops={1} />}
        </Rig3D>
        {f >= drop && <Cone3D position={conePos} rot={[0, 0, fall * 2.2]} scoops={f > drop + 16 ? 0 : 2} />}
        {f >= drop + 14 && (
          <mesh position={[hx - 0.35, 0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.18, 14]} />
            <meshBasicMaterial color="#ffb3d1" />
          </mesh>
        )}
        {f >= mask + 10 && <Hearts3D position={[0, 2.0, 0.2]} f={f} at={mask + 14} n={6} spread={1.8} />}
        {f >= mask && f < mask + 30 && (
          <>
            <Mask3D position={[hx + 0.1 + (f - mask) * 0.02, 1.45 - (f - mask) * (f - mask) * 0.0016, 0.3]} rot={[0, 0, (f - mask) * 0.2]} color={MASK_H} />
            <Mask3D position={[ax - 0.1 - (f - mask) * 0.02, 1.4 - (f - mask) * (f - mask) * 0.0016, 0.3]} rot={[0, 0, -(f - mask) * 0.2]} color={MASK_A} />
          </>
        )}
        <Lights />
      </Stage>
      <Grade warm={0.15} />
      <Bubble x={300} y={560} w={300} text="HMM..." size={52} from={want} to={turn} />
      <Bubble x={780} y={560} w={300} text="HMM..." size={52} from={want} to={turn} />
      <Bubble x={720} y={500} w={500} text="YAH, ES KRIMNYA!" size={42} from={sigh} to={sigh + 70} />
      {f >= drop && f < drop + 44 && <Bubble x={300} y={620} w={260} text="PLOP!" size={56} from={drop} to={drop + 44} />}
      {f >= mask && f < mask + 70 && <Tag label="BUKA MASKER!" from={mask} to={mask + 70} color="#ff6b9a" />}
      <Caps ids={["e1", "e2", "e3", "e4"]} hl={["minum", "tidak", "bergantian", "membelakangi", "krim", "jatuh", "Yah", "sepakat", "membuka", "bersama-sama"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 9. BIANG LALA                                                        */
/* ================================================================== */
export const SceneA3Biang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ride = EV("biang.ride");
  const view = EV("biang.view");
  const say = EV("biang.say");
  const smile = EV("biang.smile");
  const C: Vec3 = [0, 8.5, -2];
  const R = 6.4;
  const ang = -0.9 + f * 0.0035;
  const gPos = (a: number): Vec3 => [C[0] + R * Math.cos(a), C[1] + R * Math.sin(a), C[2]];
  const mine = gPos(ang + Math.PI * 0.0);
  const kk = easeInOut3(cl((f - 20) / 220));
  const camPos = lerpV([mine[0] + 0.6, mine[1] + 0.5, mine[2] + 7.0], [0, 6.5, 34], kk);
  const camLook = lerpV([mine[0], mine[1] - 0.2, mine[2]], [0, 8.2, -2], kk);
  const cam = { pos: camPos, look: camLook, fov: lerpN(30, 36, kk) } as Cam;
  const N = 10;
  const sitCouple = (k: number): Pose3 => ({ ...idle3(t, k), legL: { swing: 1.45, knee: 1.5 }, legR: { swing: 1.45, knee: 1.5 } });
  return (
    <>
      <Stage cam={cam} bg="#ffb48a">
        <Ground color="#e8c6a0" />
        <Sea z={-22} color="#7aa6cf" t={t} />
        <mesh position={[-6, 6, -46]}>
          <planeGeometry args={[160, 40]} />
          <meshBasicMaterial color="#ffb48a" />
        </mesh>
        <Sun position={[6, 4, -40]} color="#fff1b8" r={7} />
        {[-12, -8, 11, 15].map((x, i) => <Palm3D key={i} position={[x, 0, 3 - (i % 2) * 2]} s={1.2} sway={Math.sin(t + i)} />)}
        {/* wheel */}
        <P geo={() => <boxGeometry args={[0.7, 8.5, 0.5]} />} color="#9aa4b2" pos={[-2, 4.2, C[2]]} rot={[0, 0, -0.32]} hull={0.02} />
        <P geo={() => <boxGeometry args={[0.7, 8.5, 0.5]} />} color="#9aa4b2" pos={[2, 4.2, C[2]]} rot={[0, 0, 0.32]} hull={0.02} />
        <mesh position={C} rotation={[0, 0, 0]}>
          <torusGeometry args={[R, 0.12, 8, 60]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
        <mesh position={C}>
          <torusGeometry args={[R * 0.55, 0.07, 8, 40]} />
          <meshStandardMaterial color="#ffd23f" />
        </mesh>
        {[...Array(N)].map((_, i) => {
          const a = ang + (i * Math.PI * 2) / N;
          return (
            <mesh key={i} position={[C[0] + (R / 2) * Math.cos(a), C[1] + (R / 2) * Math.sin(a), C[2]]} rotation={[0, 0, a]}>
              <boxGeometry args={[R, 0.07, 0.07]} />
              <meshStandardMaterial color="#e63946" />
            </mesh>
          );
        })}
        <P geo={() => <sphereGeometry args={[0.5, 12, 10]} />} color="#ffd23f" pos={C} hull={0.04} />
        {[...Array(N)].map((_, i) => {
          const a = ang + (i * Math.PI * 2) / N;
          const p = gPos(a);
          const isMine = i === 0;
          const col = isMine ? "#ffd6e7" : ["#6ec6ff", "#9be7a6", "#ffe14d"][i % 3];
          return (
            <group key={i} position={[p[0], p[1] - 0.5, p[2]]}>
              <mesh position={[0, 0.5, 0]} scale={[0.03, 0.5, 0.03]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#444" />
              </mesh>
              <P geo={() => <boxGeometry args={[1.7, 0.1, 1.1]} />} color={col} pos={[0, -0.78, 0]} hull={0.04} />
              <P geo={() => <boxGeometry args={[1.7, 0.55, 0.08]} />} color={col} pos={[0, -0.5, 0.52]} hull={0.04} />
              <P geo={() => <boxGeometry args={[1.7, 0.55, 0.08]} />} color={col} pos={[0, -0.5, -0.52]} hull={0.04} />
              {[-0.85, 0.85].map((x) => <P key={x} geo={() => <boxGeometry args={[0.08, 0.55, 1.1]} />} color={col} pos={[x, -0.5, 0]} hull={0.04} />)}
              {isMine && (
                <>
                  <Rig3D position={[-0.4, -0.75, 0.05]} rotationY={0.15} t={t} body={B_HAPID} pose={{ ...sitCouple(1), armR: { swing: -0.3, out: 0.3, elbow: 0.9 } }} expr="happy" seed={1} scale={0.8} />
                  <Rig3D position={[0.4, -0.75, 0.05]} rotationY={-0.15} t={t} body={B_ASTI} pose={{ ...sitCouple(2), armL: { swing: -0.3, out: 0.3, elbow: 0.9 } }} expr="happy" seed={2} scale={0.8} />
                </>
              )}
            </group>
          );
        })}
        {f >= say && <Hearts3D position={[mine[0], mine[1] + 0.8, mine[2] + 0.6]} f={f} at={say + 6} n={5} spread={1.4} />}
        {f >= smile && <Hearts3D position={[mine[0], mine[1] + 0.8, mine[2] + 0.6]} f={f} at={smile} n={6} spread={1.8} />}
        <Lights sun="#ffd6a8" amb={1.1} ambColor="#ffd9bd" dir={[-6, 8, 8]} />
      </Stage>
      <Grade warm={0.7} />
      <Tag label="BIANG LALA" to={view} color="#ff9f43" />
      <Caps ids={["g1", "g2", "g3"]} hl={["biang", "lala", "indah", "Indah", "banget", "tersenyum", "berharap", "berhenti"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 10. MAKAN                                                            */
/* ================================================================== */
export const SceneA3Makan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const pay = EV("makan.pay");
  const drop = EV("makan.drop");
  const give = EV("makan.give");
  const thanks = EV("makan.thanks");
  const talk = EV("makan.talk");
  const walkL = easeInOut3(cl((f - (thanks + 24)) / 56));
  const hx = f < thanks + 24 ? 2.0 : lerpN(2.0, -0.3, walkL);
  const hr = f < thanks + 24 ? -Math.PI / 2 + 0.2 : -Math.PI / 2;
  const seated = walkL >= 1;
  const px = f < give ? 3.5 : lerpN(3.5, 2.9, easeInOut3(cl((f - give) / 22)));
  const wk0 = f >= thanks + 24 && walkL < 1;
  const bow = f >= thanks && f < thanks + 26 ? Math.sin(cl((f - thanks) / 26) * Math.PI) : 0;
  const hPose: Pose3 = seated
    ? { ...sitP(t, 1), armR: { swing: -0.5 + Math.sin(f * 0.25) * 0.25, out: 0.3, elbow: 1.1 } }
    : wk0
      ? walk3(f * 0.035, "walk")
      : bow > 0
        ? { ...idle3(t, 1), lean: 0.35 * bow, armL: { ik: { target: [0.06, 0.2, 0.3], pole: [-0.4, -0.2, 0] } }, armR: { ik: { target: [-0.06, 0.2, 0.3], pole: [0.4, -0.2, 0] } } }
        : f >= pay && f < drop
          ? { ...idle3(t, 1), armR: { swing: -0.8, out: 0.3, elbow: 0.6 } }
          : idle3(t, 1);
  const dk = easeInOut3(cl((f - drop) / 14));
  const cam = shotCam(f, [
    { to: thanks + 20, p0: [2.4, 1.5, 6.4], l0: [2.6, 1.15, 0], p1: [2.5, 1.5, 6.0], l1: [2.6, 1.15, 0], fov: 34 },
    { to: talk, p0: [2.4, 1.5, 6.4], l0: [2.0, 1.1, 0], p1: [0.6, 1.5, 6.6], l1: [0.2, 1.1, 0], fov: 34 },
    { to: 9999, p0: [-0.6, 1.5, 6.2], l0: [-1.0, 1.1, 0], p1: [-0.9, 1.6, 7.8], l1: [-1.0, 1.15, 0], fov: 34 },
  ]);
  return (
    <>
      <Stage cam={cam} bg="#ffe9c9">
        <mesh position={[0, 3, -2.5]}>
          <planeGeometry args={[40, 12]} />
          <meshStandardMaterial color="#ffe9c9" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <meshStandardMaterial color="#c8955a" roughness={0.9} />
        </mesh>
        {[-3, 0, 3].map((x) => <P key={x} geo={() => <coneGeometry args={[0.5, 0.5, 12]} />} color="#ffd23f" pos={[x, 4.5, -2]} hull={0.04} />)}
        {/* counter */}
        <group position={[3.3, 0, -0.3]}>
          <P geo={() => <boxGeometry args={[2.4, 1.1, 0.8]} />} color="#ffffff" pos={[0, 0.55, 0]} hull={0.02} />
          <P geo={() => <boxGeometry args={[2.6, 0.12, 1.0]} />} color="#c8743a" pos={[0, 1.15, 0]} hull={0.03} />
          <P geo={() => <boxGeometry args={[0.5, 0.35, 0.4]} />} color="#cfd8e3" pos={[0.4, 1.4, 0]} hull={0.04} />
        </group>
        {/* table + chairs */}
        <group position={[-1.0, 0, 0]}>
          <P geo={() => <boxGeometry args={[1.5, 0.08, 0.9]} />} color="#c8743a" pos={[0, 0.8, 0]} hull={0.03} />
          <P geo={() => <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />} color="#6b4a2e" pos={[0, 0.4, 0]} hull={0.04} />
          <P geo={() => <cylinderGeometry args={[0.28, 0.28, 0.03, 16]} />} color="#ffffff" pos={[-0.35, 0.86, 0]} hull={0.05} />
          <P geo={() => <cylinderGeometry args={[0.28, 0.28, 0.03, 16]} />} color="#ffffff" pos={[0.35, 0.86, 0]} hull={0.05} />
          <P geo={() => <sphereGeometry args={[0.14, 10, 8]} />} color="#e08a2c" pos={[-0.35, 0.93, 0]} hull={0.06} />
          <P geo={() => <sphereGeometry args={[0.14, 10, 8]} />} color="#7ac74f" pos={[0.35, 0.93, 0]} hull={0.06} />
          {[-0.95, 0.95].map((x) => <P key={x} geo={() => <boxGeometry args={[0.5, 0.08, 0.5]} />} color="#a85f2e" pos={[x, 0.46, 0]} hull={0.03} />)}
        </group>
        <Rig3D position={[-1.95, 0, 0]} rotationY={Math.PI / 2} t={t} body={B_ASTI} pose={f >= talk ? { ...sitP(t, 2), armL: { swing: -0.5 + Math.sin(f * 0.22 + 1) * 0.25, out: 0.3, elbow: 1.1 } } : sitP(t, 2)} expr="happy" seed={2} />
        <Rig3D position={[hx, 0, 0]} rotationY={hr} t={t} body={B_HAPID} pose={hPose} expr={f >= thanks ? "happy" : f >= drop ? "surprised" : "neutral"} seed={1} />
        <Rig3D position={[px, 0, -0.25]} rotationY={-Math.PI / 2 + 0.15} t={t} body={B_PETUGAS} pose={f >= give && f < thanks + 10 ? { ...(f < give + 22 ? walk3(f * 0.05, "walk") : idle3(t, 4)), armR: { swing: -1.2, out: 0.2, elbow: 0.3 } } : idle3(t, 4)} expr="happy" seed={4}>
          {f >= give && f < thanks + 14 && <P geo={() => <boxGeometry args={[0.16, 0.1, 0.03]} />} color="#8b5a2b" pos={[-0.12, 0.25, 0.42]} hull={0.08} />}
        </Rig3D>
        {f >= drop && f < give && <P geo={() => <boxGeometry args={[0.16, 0.1, 0.03]} />} color="#8b5a2b" pos={[2.0, lerpN(0.9, 0.03, dk * dk), 0.2]} rot={[0, 0, dk * 2]} hull={0.08} />}
        {f >= talk + 10 && <Hearts3D position={[-1.0, 1.9, 0.2]} f={f} at={talk + 10} n={5} spread={1.4} />}
        <Lights />
      </Stage>
      <Grade warm={0.25} />
      {f >= give && f < thanks && <Bubble x={640} y={560} w={560} text="MAS, DOMPETNYA JATUH!" size={36} from={give} to={thanks} />}
      {f >= drop && f < give && <Bubble x={420} y={620} w={260} text="PLUK!" size={56} from={drop} to={give} />}
      <Tag label={f >= talk ? "NGOBROL HANGAT" : "MAKAN SIANG"} to={9999} color="#ff9f43" />
      <Caps ids={["k1", "k2", "k3"]} hl={["membayar", "dompetku", "jatuh", "dompetnya", "Alhamdulillah", "baik", "ngobrol", "kenal", "lama"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 11. COASTER                                                          */
/* ================================================================== */
const COASTER_PTS: [number, number][] = [[-16, 0.8], [-10, 1.0], [-5, 3.4], [-1, 9.5], [1.6, 10.2], [4.2, 7.0], [6.6, 1.6], [9, 1.0], [12, 5.0], [14.8, 6.2], [17.5, 2.2], [21, 0.9]];
const coasterCurve = () => new THREE.CatmullRomCurve3(COASTER_PTS.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, "catmullrom", 0.3);
export const SceneA3Coaster: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const queue = EV("coaster.queue");
  const nerv = EV("coaster.nerv");
  const go = EV("coaster.go");
  const scream = EV("coaster.scream");
  const dizzy = EV("coaster.dizzy");
  const curve = React.useMemo(coasterCurve, []);
  const tube = React.useMemo(() => new THREE.TubeGeometry(curve, 160, 0.09, 6, false), [curve]);
  const ridePhase = f >= go && f < dizzy - 10;
  const u = cl((f - go) / Math.max(30, dizzy - go - 12));
  const uu = Math.pow(u, 1.25) * 0.98;
  const cp = curve.getPointAt(uu);
  const tg = curve.getTangentAt(uu);
  const roll = Math.atan2(tg.y, tg.x);
  const phase = f < nerv ? 0 : f < go ? 1 : f < dizzy - 10 ? 2 : 3;
  const extras: [number, string][] = [[0, "#2bb673"], [1, "#ffb703"], [2, "#9b6bff"], [3, "#ff6b6b"], [4, "#2aa6c9"], [5, "#ffa94d"]];
  const camQ = shotCam(f, [{ to: nerv, p0: [3.0, 1.5, 9.0], l0: [3.0, 1.2, 0], p1: [2.4, 1.5, 7.2], l1: [2.4, 1.2, 0], fov: 34 }]);
  const camN = shotCam(f - nerv, [{ to: 9999, p0: [0.2, 1.5, 4.6], l0: [0.3, 1.45, 0], p1: [0.2, 1.5, 4.0], l1: [0.3, 1.5, 0], fov: 32 }], 1.15);
  const camR: Cam = { pos: [cp.x + 1.4, cp.y + 1.0, 9.5], look: [cp.x + tg.x * 1.4, cp.y + 0.3, 0], fov: 36 };
  const camD = shotCam(f - dizzy + 10, [{ to: 9999, p0: [0, 1.4, 6.0], l0: [0, 1.1, 0], p1: [0, 1.6, 7.6], l1: [0, 1.2, 0], fov: 34 }]);
  const cam = phase === 0 ? camQ : phase === 1 ? camN : phase === 2 ? camR : camD;
  const arms: Pose3 = { ...idle3(t, 1), lean: 0.05, legL: { swing: 1.45, knee: 1.5 }, legR: { swing: 1.45, knee: 1.5 }, armL: { swing: -2.7, out: 0.4, elbow: 0.2 }, armR: { swing: -2.7, out: 0.4, elbow: 0.2 } };
  return (
    <>
      <Stage cam={cam}>
        <AncolSet t={t} />
        {phase === 2 && (
          <group>
            {[-12, -4, 4, 12, 18].map((x, i) => {
              const y = curve.getPointAt(cl((x + 16) / 38)).y;
              return <mesh key={i} position={[x, y / 2, 0]} scale={[0.1, Math.max(0.2, y), 0.1]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#9aa4b2" /></mesh>;
            })}
          </group>
        )}
        {(phase === 2 || phase === 1) && (
          <group>
            <mesh geometry={tube} position={[0, 0, 0.4]}>
              <meshStandardMaterial color="#e63946" />
            </mesh>
            <mesh geometry={tube} position={[0, 0, -0.4]}>
              <meshStandardMaterial color="#e63946" />
            </mesh>
            {[...Array(34)].map((_, i) => {
              const q = curve.getPointAt(i / 33);
              return <mesh key={i} position={[q.x, q.y, 0]} scale={[0.06, 0.06, 0.9]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#444" /></mesh>;
            })}
          </group>
        )}
        {phase === 2 && (
          <group position={[cp.x, cp.y + 0.2, 0]} rotation={[0, 0, roll]}>
            <P geo={() => <boxGeometry args={[2.4, 0.5, 1.0]} />} color="#ffd23f" pos={[0, 0, 0]} hull={0.04} />
            <Rig3D position={[0.5, 0.1, 0]} rotationY={Math.PI / 2} t={t} body={{ ...B_HAPID, mask: undefined }} pose={arms} expr={f >= scream ? "scared" : "neutral"} seed={1} />
            <Rig3D position={[-0.5, 0.1, 0]} rotationY={Math.PI / 2} t={t} body={{ ...B_ASTI, mask: undefined }} pose={arms} expr={f >= scream ? "scared" : "neutral"} seed={2} />
          </group>
        )}
        {phase === 0 && (
          <group>
            {extras.map(([i, c]) => <Rig3D key={i} position={[-1.0 + i * 0.95 + (i > 3 ? 0.4 : 0), 0, 0]} rotationY={Math.PI / 2} t={t} body={{ shirt: c, pants: "#2b3350", hair: i % 2 ? "#5a3a22" : "#2d2d3a", hairStyle: "short", height: 0.95 + (i % 3) * 0.04 }} pose={{ ...walk3(f * 0.01 + i * 0.3, "walk"), legL: { swing: 0, knee: 0 }, legR: { swing: 0, knee: 0 } }} expr="neutral" seed={i + 8} />)}
            <Rig3D position={[5.4, 0, 0]} rotationY={Math.PI / 2} t={t} body={{ ...B_HAPID, mask: undefined }} pose={idle3(t, 1)} expr="neutral" seed={1} />
            <Rig3D position={[6.3, 0, 0]} rotationY={Math.PI / 2} t={t} body={{ ...B_ASTI, mask: undefined }} pose={idle3(t, 2)} expr="neutral" seed={2} />
            {[...Array(8)].map((_, i) => <mesh key={i} position={[-1.4 + i * 1.0, 0.5, 0.6]}><cylinderGeometry args={[0.05, 0.05, 1.0, 6]} /><meshBasicMaterial color="#9aa4b2" /></mesh>)}
            <mesh position={[3, 0.9, 0.6]} scale={[9, 0.05, 0.05]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#e63946" /></mesh>
          </group>
        )}
        {phase === 1 && (
          <group>
            <Rig3D position={[0, 0, 0]} rotationY={0.1} t={t} body={{ ...B_ASTI, mask: undefined }} pose={{ ...idle3(t, 2), armL: { ik: { target: [0.1, 0.78, 0.3], pole: [-0.4, -0.2, 0] } }, armR: { ik: { target: [-0.1, 0.78, 0.3], pole: [0.4, -0.2, 0] } }, head: [0.05, 0, 0] }} expr="scared" seed={2} />
            <Heart3D position={[0.7, 1.7, 0.3]} s={2.0 + 0.5 * Math.sin(f * 0.8)} />
            <Rig3D position={[1.1, 0, 0]} rotationY={-0.4} t={t} body={{ ...B_HAPID, mask: undefined }} pose={idle3(t, 1)} expr="happy" seed={1} />
          </group>
        )}
        {phase === 3 && (
          <group>
            <Rig3D position={[-0.9, 0, 0]} rotationY={0.35} t={t} body={{ ...B_ASTI, mask: undefined }} pose={{ ...idle3(t, 2), lean: 0.4, head: [0.3, 0, 0.1], sway: Math.sin(f * 0.3) * 0.08 }} expr="scared" seed={2} />
            <Stars3D position={[-0.9, 1.75, 0.15]} f={f} />
            <Rig3D position={[0.9, 0, 0]} rotationY={-0.35} t={t} body={{ ...B_HAPID, mask: undefined }} pose={{ ...idle3(t, 1), sway: Math.sin(f * 0.3) * 0.08, armL: { swing: -2.6, out: 0.3, elbow: 0.2 }, armR: { swing: -2.6, out: 0.3, elbow: 0.2 } }} expr="grin" seed={1} />
            <Hearts3D position={[0, 2.0, 0.2]} f={f} at={dizzy + 20} n={6} spread={1.8} />
          </group>
        )}
        <Lights />
      </Stage>
      <Grade warm={0.12} />
      {phase === 0 && <div style={{ position: "absolute", top: 420, left: 0, right: 0, textAlign: "center" }}><span style={{ display: "inline-block", background: "#e03131", color: "#fff", border: "8px solid #12121a", borderRadius: 28, padding: "10px 40px", fontFamily: "Anton, Impact, sans-serif", fontSize: 78 }}>ROLLER COASTER</span></div>}
      {f >= scream && f < scream + 60 && <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", fontFamily: "Anton, Impact, sans-serif", fontSize: 150, color: "#ffe14d", WebkitTextStroke: "10px #12121a", paintOrder: "stroke fill", transform: "rotate(-6deg)" }}>AAAAA!</div>}
      <Tag label={phase === 0 ? "ANTRE PANJANG" : phase === 1 ? "DEG-DEGAN" : phase === 2 ? "SERUUU!" : "PUSING TAPI HAPPY"} to={9999} color="#e03131" />
      <Caps ids={["s1", "s2", "s3"]} hl={["ekstrem", "roller", "coaster", "panjang", "deg-degan", "seru", "banget", "berteriak", "pusing", "bahagia"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 12. PULANG                                                           */
/* ================================================================== */
export const SceneA3Pulang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const arr = EV("pulang.arrive");
  const thanks = EV("pulang.thanks");
  const reply = EV("pulang.reply");
  const inK = easeInOut3(cl((f - 2) / Math.max(40, arr)));
  const mx = lerpN(-5, MX, inK);
  const moving = inK < 1;
  const off = easeInOut3(cl((f - arr) / 22));
  const seatX = MX - 0.72;
  const toDoor = easeInOut3(cl((f - (reply + 50)) / 50));
  const ax = f < arr ? mx - 0.72 : f < reply + 50 ? lerpN(seatX, 2.4, off) : lerpN(2.4, 4.3, toDoor);
  const ay = f < arr ? 0.5 : 0.5 * (1 - off);
  const bow = f >= thanks && f < thanks + 30 ? Math.sin(cl((f - thanks) / 30) * Math.PI) : 0;
  const aRot = f < arr ? Math.PI / 2 : f < reply + 50 ? lerpN(Math.PI / 2, -Math.PI / 2 + 0.4, off) : Math.PI / 2;
  const aPose: Pose3 = f < arr
    ? ridePose(t, 2, false)
    : off < 1
      ? { ...walk3(f * 0.03, "walk") }
      : f < reply + 50
        ? bow > 0 ? { ...idle3(t, 2), lean: 0.35 * bow, armL: { ik: { target: [0.06, 0.2, 0.3], pole: [-0.4, -0.2, 0] } }, armR: { ik: { target: [-0.06, 0.2, 0.3], pole: [0.4, -0.2, 0] } } } : { ...idle3(t, 2), armR: { swing: -2.2 + Math.sin(f * 0.5) * 0.3, out: 0.4, elbow: 0.4 } }
        : walk3(f * 0.03, "walk");
  const wave = f >= reply ? Math.sin(f * 0.5) * 0.3 : 0;
  const cam = shotCam(f, [
    { to: arr, p0: [-1.0, 1.4, 7.8], l0: [0.6, 1.1, 0], p1: [0.4, 1.4, 7.0], l1: [1.0, 1.1, 0], fov: 34 },
    { to: reply + 40, p0: [1.0, 1.4, 6.2], l0: [1.5, 1.2, 0], p1: [1.4, 1.4, 6.0], l1: [1.6, 1.2, 0], fov: 34 },
    { to: 9999, p0: [2.4, 1.5, 7.6], l0: [2.6, 1.2, 0], p1: [2.4, 1.6, 9.0], l1: [2.8, 1.2, 0], fov: 34 },
  ]);
  return (
    <>
      <Stage cam={cam} bg="#ffb48a">
        <KosSet t={t} dusk />
        <group position={[mx, 0, 0.3]}>
          <Scooter3D position={[0, 0, 0]} wheel={moving ? f * 0.5 : 0} />
          <Rig3D position={[-0.1, 0.52, 0]} rotationY={Math.PI / 2} t={t} body={{ ...B_HAPID }} pose={f >= reply ? { ...ridePose(t, 1, true), armR: { swing: -2.3 + wave, out: 0.3, elbow: 0.3 } } : ridePose(t, 1, true)} expr="happy" seed={1} />
        </group>
        <Rig3D position={[ax, ay, 0.3]} rotationY={aRot} t={t} body={{ ...B_ASTI }} pose={aPose} expr="happy" seed={2} />
        {f >= reply && <Hearts3D position={[1.4, 2.1, 0.3]} f={f} at={reply} n={6} spread={2.0} />}
        <Lights sun="#ffc58a" amb={1.0} ambColor="#ffc9a8" dir={[-8, 5, 6]} fill="#ff9ec0" />
      </Stage>
      <Grade warm={0.75} />
      <Bubble x={640} y={560} w={600} text="MAKASIH YA, KAK HAPID!" size={42} from={thanks} to={reply} />
      <Bubble x={380} y={600} w={520} text="SAMA-SAMA, DEK!" size={46} from={reply} to={reply + 54} />
      <Tag label="HARI MULAI PETANG" to={arr} color="#ff7b54" />
      <Caps ids={["p1", "p2", "p3"]} hl={["petang", "antar", "kosannya", "Makasih", "seru", "Sama-sama", "Hati-hati"]} color="#ffb3cf" />
    </>
  );
};

/* ================================================================== */
/* 13. AKHIR                                                            */
/* ================================================================== */
export const SceneA3Akhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const smile = EV("akhir.smile");
  const sunset = EV("akhir.sunset");
  const dur = DURATIONS_A3.akhir;
  const mx = -3 + f * 0.1;
  const k = easeInOut3(cl(f / (dur + 20)));
  const cam = { pos: lerpV([mx + 1.2, 1.25, 5.6], [mx + 0.8, 4.4, 15], k), look: lerpV([mx + 0.1, 1.15, 0], [mx + 0.6, 1.4, 0], k), fov: 34 } as Cam;
  const title = easeInOut3(cl((f - sunset) / 22));
  return (
    <>
      <Stage cam={cam} bg="#ff9f7a">
        <Ground color="#e8c6a0" />
        <Road z={0} dusk width={3.4} scroll={mx} />
        <Sea z={-9} color="#7a96cf" t={t} />
        <mesh position={[mx, 6, -46]}>
          <planeGeometry args={[160, 40]} />
          <meshBasicMaterial color="#ff9f7a" />
        </mesh>
        <Sun position={[mx + 6, 3.6, -40]} color="#fff1b8" r={8} />
        {[...Array(10)].map((_, i) => <Palm3D key={i} position={[mx - 8 + i * 4.4, 0, -2.2 - (i % 2) * 0.8]} s={1} sway={Math.sin(t + i)} />)}
        <Pair x={mx} z={0} t={t} wheel={f * 0.5} asti={false} hapidMask={false} bounce={Math.abs(Math.sin(f * 0.5)) * 0.015} />
        <Hearts3D position={[mx - 0.3, 2.0, 0.3]} f={f} at={smile + 10} n={5} spread={1.4} />
        <Hearts3D position={[mx + 0.2, 2.0, 0.3]} f={f} at={sunset} n={5} spread={1.4} />
        <Lights sun="#ffc58a" amb={1.0} ambColor="#ffc9a8" dir={[-8, 5, 6]} fill="#ff9ec0" />
      </Stage>
      <Grade warm={0.8} />
      {f >= sunset && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 520, textAlign: "center", opacity: title, transform: `translateY(${(1 - title) * 30}px)` }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 112, lineHeight: 1.05, color: "#fff", WebkitTextStroke: "8px rgba(70,20,50,0.9)", paintOrder: "stroke fill", textShadow: "0 10px 40px rgba(255,120,150,0.6)" }}>HARI YANG SPESIAL</div>
        </div>
      )}
      <Caps ids={["a1"]} hl={["senyum-senyum", "spesial", "bagiku"]} color="#ffb3cf" top={1380} />
    </>
  );
};

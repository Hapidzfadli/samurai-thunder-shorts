import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { ToonParams, ToonSprite, cl, lerp3, sm } from "./three/objectsSoda";
import { Kamar } from "./three/objectsPaket";
import { Gang, LivingRoom, PosRonda } from "./three/objectsKaraoke";
import timing from "./karaoke_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_KARAOKE = timing.scenes as { hook: number; tini: number; rizal: number; ronda: number; pagar: number; dalam: number; panggung: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];

/* ------------------------------------------------------------------ */
/* Camera: calm, slow dolly                                              */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number; shake?: number };
const shotCam = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, Math.min(s.to, start + 400) - start);
      const k = sm(cl((frame - start) / len));
      const p = lerp3(s.p0, s.p1 ?? s.p0, k);
      const l = lerp3(s.l0, s.l1 ?? s.l0, k);
      const f0 = s.fov ?? 46;
      const sh = s.shake ?? 0;
      const jx = sh * Math.sin(frame * 2.3) * 0.5 + sh * Math.sin(frame * 5.1) * 0.3;
      const jy = sh * Math.cos(frame * 2.9) * 0.5;
      return { pos: [p[0] + jx, p[1] + jy, p[2]] as Vec3, look: l, fov: f0 + ((s.fov1 ?? f0) - f0) * k };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 46 };
};
type Cam = { pos: Vec3; look: Vec3; fov: number };

const NIGHT = "linear-gradient(#0b0f33, #1d2060 55%, #5a3f8f)";
const Stage: React.FC<{ cam: Cam; bg?: string; shadows?: boolean; children: React.ReactNode }> = ({ cam, bg = NIGHT, shadows = false, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={width} height={height} shadows={shadows} camera={{ fov: cam.fov, near: 0.05, far: 240, position: cam.pos }}>
        <CameraRig position={cam.pos} lookAt={cam.look} fov={cam.fov} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* UI                                                                    */
/* ------------------------------------------------------------------ */
const chunkText = (text: string) => {
  const words = text.replace(/[.,!?]/g, " ").split(/\s+/).filter(Boolean);
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
const Caps: React.FC<{ ids: LineId[]; hl?: string[]; color?: string; top?: number }> = ({ ids, hl = [], color = "#ffd23f", top = 1320 }) => {
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
        const sp = spring({ frame: frame - s, fps, config: { damping: 10, stiffness: 260 } });
        const txt = chunks[i].toLowerCase();
        const isHl = txt.split(" ").some((w) => hlU.includes(w.toUpperCase()));
        const size = Math.min(92, 720 / (txt.length * 0.52));
        return (
          <div style={{ position: "absolute", top, left: 90, width: 760, textAlign: "center" }}>
            <span style={{ display: "inline-block", fontFamily: FONT_BODY, fontWeight: 800, fontSize: size, lineHeight: 1.1, color: isHl ? color : "white", WebkitTextStroke: "6px rgba(10,6,18,0.95)", paintOrder: "stroke fill", textShadow: isHl ? `0 0 34px ${color}99, 0 8px 0 rgba(10,6,18,0.7)` : "0 8px 0 rgba(10,6,18,0.7)", transform: `scale(${0.55 + 0.45 * sp}) rotate(${(1 - sp) * -3}deg)`, opacity: Math.min(1, sp * 1.6) }}>
              {txt}
            </span>
          </div>
        );
      }
    }
  }
  return null;
};
const Clock: React.FC<{ time: string; sub?: string }> = ({ time, sub }) => (
  <div style={{ position: "absolute", top: 180, left: 60, display: "flex", alignItems: "center", gap: 14, padding: "6px 22px", borderRadius: 14, background: "#0b0b10", border: "4px solid #444", fontFamily: "'DejaVu Sans Mono', monospace", fontWeight: 800, fontSize: 52, color: "#ff4d4d", textShadow: "0 0 12px #ff4d4d" }}>
    {time}
    {sub && <span style={{ fontFamily: FONT_BODY, fontSize: 26, color: "#cbd5e1", letterSpacing: 2 }}>{sub}</span>}
  </div>
);
const Bubble: React.FC<{ text: string; from: number; to: number; x: number; y: number; color?: string; size?: number }> = ({ text, from, to, x, y, color = "#fff", size = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 10, stiffness: 230 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, padding: "10px 22px", borderRadius: 24, background: color, border: "5px solid #16110f", fontFamily: FONT_BODY, fontWeight: 800, fontSize: size, color: "#16110f", transform: `scale(${0.3 + 0.7 * s})`, transformOrigin: "bottom left", opacity: Math.min(1, s * 2) }}>
      {text}
    </div>
  );
};
const Notes: React.FC<{ from: number; to: number; x: number; y: number; color?: string }> = ({ from, to, x, y, color = "#ffd23f" }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const k = ((f - from) / 36 + i / 5) % 1;
        return (
          <div key={i} style={{ position: "absolute", left: x + Math.sin(k * 6 + i) * 70 + i * 26, top: y - k * 320, fontSize: 70 + (i % 2) * 24, color, opacity: 1 - k, textShadow: "0 4px 0 rgba(0,0,0,0.5)", fontFamily: FONT_BODY, fontWeight: 800 }}>
            {i % 2 ? "♪" : "♫"}
          </div>
        );
      })}
    </>
  );
};
const Look: React.FC<{ tint?: string }> = ({ tint }) => (
  <>
    {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light" }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 56%, rgba(8,6,20,0.5) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(8,6,20,0) 62%, rgba(8,6,20,0.55) 86%, rgba(8,6,20,0.7) 100%)" }} />
  </>
);

/* ------------------------------------------------------------------ */
/* Characters                                                            */
/* ------------------------------------------------------------------ */
const yawTo = (x: number, z: number, cam: Cam) => Math.max(-0.5, Math.min(0.5, Math.atan2(cam.pos[0] - x, cam.pos[2] - z) * 0.6));
const joko: ToonParams = { expr: "happy", shirt: "#8a4b1f", pants: "#2a2a3a", hat: "short", hatColor: "#111111", mustache: true, shades: true, belly: 0.8, pattern: "batik", prop: "mic", seed: 3 };
const tini: ToonParams = { expr: "angry", shirt: "#f4a6c0", pants: "#7a4a6a", hat: "curlers", hatColor: "#3a2410", pattern: "flower", seed: 6 };
const ujang: ToonParams = { expr: "neutral", shirt: "#4d7c3a", pants: "#2f4a24", hat: "cap", hatColor: "#2f4a24", mustache: true, whistle: true, seed: 12 };
const rizal: ToonParams = { expr: "worried", shirt: "#27272a", pants: "#334155", hat: "short", hatColor: "#3a2a1a", headphones: true, seed: 17 };
const nenek: ToonParams = { expr: "smirk", shirt: "#3b82c4", pants: "#5a3a5a", hat: "bun", hatColor: "#e5e7eb", glasses: true, prop: "cane", pattern: "flower", seed: 21 };
const beat = (t: number) => Math.pow(Math.abs(Math.sin(t * Math.PI * 2.33)), 3);
const pulse = (f: number, at: number, len = 12) => (f < at || f > at + len ? 0 : Math.sin(((f - at) / len) * Math.PI));

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneKHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const start = EV("hook.start");
  const test = EV("hook.test");
  const sing = EV("hook.sing");
  const shake = EV("hook.shake");
  const disco = sm(cl((f - start) / 10));
  const pu = beat(t) * (f >= start ? 1 : 0);
  const cam = shotCam(f, [
    { to: test, p0: [0, 2.2, 10.5], l0: [0, 1.6, -2], p1: [0, 2.1, 9.6], l1: [0, 1.6, -2], fov: 46 },
    { to: sing + 70, p0: [0.4, 1.9, 7.4], l0: [0.4, 1.5, -1], p1: [0.4, 1.9, 6.8], l1: [0.4, 1.5, -1], fov: 40 },
    { to: 9999, p0: [0, 2.2, 10.0], l0: [0, 1.7, -2], p1: [0, 2.1, 9.4], l1: [0, 1.7, -2], fov: 46, shake: f >= shake ? 0.05 : 0 },
  ]);
  const singing = f >= sing;
  const jokoP: ToonParams = { ...joko, expr: singing ? "laugh" : "happy", armR: singing ? [1.6 + 0.1 * Math.sin(t * 8), -1.4] : [1.2, -1.6], squash: singing ? Math.abs(Math.sin(t * 6)) * 0.25 : 0.05, lean: singing ? Math.sin(t * 3) * 0.1 : 0 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} shadows>
        <Gang t={t} pulse={pu} disco={disco} />
        <ToonSprite position={[0.2, 0.4, -0.5]} height={2.0} yaw={yawTo(0.2, -0.5, cam)} params={jokoP} />
      </Stage>
      <Look tint="rgba(60,20,120,0.2)" />
      <Clock time="00:00" sub="TENGAH MALAM" />
      <Notes from={sing} to={sing + 140} x={520} y={900} />
      <Caps ids={["hook_1", "hook_2", "hook_3"]} hl={["dua", "belas", "karaoke", "tes", "Tes", "sedalam", "selebar"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. TINI                                                               */
/* ================================================================== */
export const SceneKTini: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const wake = EV("tini.wake");
  const say = EV("tini.say");
  const cam = shotCam(f, [
    { to: wake, p0: [-0.6, 1.6, 7.2], l0: [-1.2, 1.2, -1], p1: [-0.6, 1.6, 6.8], l1: [-1.2, 1.2, -1], fov: 46, shake: 0.02 },
    { to: 9999, p0: [-0.6, 1.6, 5.8], l0: [-1.2, 1.3, -1], p1: [-0.6, 1.6, 5.4], l1: [-1.2, 1.3, -1], fov: 44, shake: 0.03 },
  ]);
  const up = sm(cl((f - wake) / 8));
  const tiniP: ToonParams = f < wake ? { ...tini, expr: "sleepy", lean: 0.05, armR: [0.2, 0.1], armL: [-0.2, -0.1] } : { ...tini, expr: "angry", armR: [2.9, 0.5], armL: [-2.9, -0.5], squash: pulse(f, wake, 10) * 0.4 + Math.abs(Math.sin(f * 0.8)) * 0.05 * up };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#161a3d" shadows>
        <Kamar t={t} variant="rina" clock="00:05" screen="" progress={-1} sign={["TIDUR", "JANGAN GANGGU"]} />
        <ToonSprite position={[-1.3 + (f < wake ? 0 : -0.1 * Math.sin(f)), 0 + 0.3 * pulse(f, wake, 10), -0.8]} height={2.0} yaw={yawTo(-1.3, -0.8, cam)} params={tiniP} />
      </Stage>
      <Look tint="rgba(30,20,90,0.2)" />
      <Clock time="00:05" />
      {f < wake && <div style={{ position: "absolute", top: 760, left: 520, fontFamily: FONT_TITLE, fontSize: 90, color: "#a5b4fc", WebkitTextStroke: "5px #16110f", paintOrder: "stroke fill" }}>Zzz...</div>}
      <Bubble text="Astaghfirullah!" from={say} to={say + 80} x={80} y={980} color="#ffe4ef" />
      <Caps ids={["tini_1", "tini_2"]} hl={["Tini", "terbangun", "Astaghfirullah", "siapa"]} color="#ff9ad6" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. RIZAL                                                              */
/* ================================================================== */
export const SceneKRizal: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const look = EV("rizal.look");
  const say = EV("rizal.say");
  const cam = shotCam(f, [
    { to: say, p0: [0.4, 1.7, 7.0], l0: [0.6, 1.2, -1.5], p1: [0.4, 1.7, 6.5], l1: [0.6, 1.2, -1.5], fov: 46, shake: 0.02 },
    { to: 9999, p0: [0.5, 1.5, 5.4], l0: [0.7, 1.2, -1.5], p1: [0.5, 1.5, 5.0], l1: [0.7, 1.2, -1.5], fov: 42, shake: 0.03 },
  ]);
  const rp: ToonParams = { ...rizal, expr: f >= say ? "worried" : "neutral", sweat: f >= say ? 1 : 0, armR: [2.7, 0.6], armL: [-2.7, -0.6], squash: Math.abs(Math.sin(f * 0.5)) * 0.1, look: 0.4 };
  const r = (t * 2.33) % 1;
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#161a3d" shadows>
        <Kamar t={t} variant="rina" clock="00:10" screen="RAPAT 08.00" progress={-1} sign={["BESOK", "RAPAT 08.00"]} />
        <ToonSprite position={[0.2, 0, -1.2]} height={2.0} yaw={yawTo(0.2, -1.2, cam)} params={rp} />
        {/* the coffee rippling to the bass */}
        <group position={[2.3, 0.88, -2.1]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.12, 0.26, 12]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
          <mesh position={[0, 0.131, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.15, 14]} />
            <meshBasicMaterial color="#4a2a14" />
          </mesh>
          {[0, 1].map((i) => {
            const k = (r + i * 0.5) % 1;
            return (
              <mesh key={i} position={[0, 0.135, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.3 + k * 0.7}>
                <ringGeometry args={[0.1, 0.13, 20]} />
                <meshBasicMaterial color="#b88a5a" transparent opacity={0.8 * (1 - k)} />
              </mesh>
            );
          })}
        </group>
      </Stage>
      <Look tint="rgba(30,20,90,0.2)" />
      <Clock time="00:10" />
      <Bubble text="Tolong..." from={say} to={say + 90} x={110} y={980} color="#dbeafe" />
      <Caps ids={["rizal_1", "rizal_2"]} hl={["Rizal", "meeting", "delapan", "tolong", "tidur"]} color="#9fd0ff" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. RONDA                                                              */
/* ================================================================== */
export const SceneKRonda: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const fall = EV("ronda.fall");
  const say = EV("ronda.say");
  const cam = shotCam(f, [
    { to: fall + 30, p0: [-0.6, 1.7, 6.4], l0: [-0.8, 1.2, -1.7], p1: [-0.6, 1.7, 5.9], l1: [-0.8, 1.2, -1.7], fov: 44, shake: 0.02 },
    { to: 9999, p0: [-0.6, 1.6, 5.6], l0: [-0.8, 1.2, -1.7], p1: [-0.6, 1.6, 5.2], l1: [-0.8, 1.2, -1.7], fov: 42, shake: 0.02 },
  ]);
  const down = sm(cl((f - fall) / 8));
  const stand = sm(cl((f - fall - 30) / 14));
  const roll = f < fall ? 0.12 : -1.45 * down * (1 - stand);
  const yy = f < fall ? 0.9 : 0.9 - 0.9 * down * (1 - stand);
  const p: ToonParams = f < fall ? { ...ujang, expr: "sleepy", lean: 0.15, armR: [0.2, 0.1], armL: [-0.2, -0.1] } : f < fall + 30 ? { ...ujang, expr: "surprised", armR: [1.5, -1], armL: [-1.5, 1] } : { ...ujang, expr: "worried", armR: [1.6, -2.4 + Math.sin(f) * 0.2], armL: [-0.6, 0.2], look: 0.4 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#161a3d" shadows>
        <PosRonda t={t} />
        <ToonSprite position={[-1.2, yy, -1.7]} roll={roll} height={1.9} yaw={0.1} params={p} />
      </Stage>
      <Look tint="rgba(30,20,90,0.2)" />
      <Clock time="00:12" />
      {f >= fall && f < fall + 40 && <div style={{ position: "absolute", top: 640, left: 160, fontFamily: FONT_TITLE, fontSize: 120, color: "#ffd23f", WebkitTextStroke: "7px #16110f", paintOrder: "stroke fill", transform: "rotate(-8deg)" }}>BRUK!</div>}
      <Bubble text="Maling?! Gempa?!" from={say} to={say + 90} x={80} y={980} color="#d9f5d0" />
      <Caps ids={["ronda_1", "ronda_2"]} hl={["Ujang", "jatuh", "Maling", "Gempa"]} color="#9be8a0" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. PAGAR                                                              */
/* ================================================================== */
export const SceneKPagar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const knock = EV("pagar.knock");
  const say = EV("pagar.say");
  const jk = EV("pagar.joko");
  const tenth = EV("pagar.tenth");
  const pu = beat(t);
  const cam = shotCam(f, [
    { to: say, p0: [-0.8, 1.8, 7.8], l0: [-0.2, 1.4, -0.5], p1: [-0.6, 1.8, 7.2], l1: [-0.2, 1.4, -0.5], fov: 44 },
    { to: jk, p0: [-1.0, 1.7, 5.8], l0: [-0.7, 1.4, -0.3], p1: [-0.8, 1.7, 5.4], l1: [-0.7, 1.4, -0.3], fov: 42 },
    { to: 9999, p0: [0.9, 1.8, 6.4], l0: [0.7, 1.4, -0.5], p1: [0.8, 1.8, 6.0], l1: [0.7, 1.4, -0.5], fov: 42 },
  ]);
  const bang = f >= knock ? Math.sin((f - knock) * 1.6) * 0.1 : 0;
  const tiniP: ToonParams = { ...tini, expr: "angry", armR: [2.4 + bang * 3, -0.6], armL: [-0.5, 0.2], squash: Math.abs(bang) * 2, lean: bang };
  const ujangP: ToonParams = { ...ujang, expr: f >= say ? "angry" : "neutral", armR: f >= say + 20 ? [2.5, -0.5] : [0.4, 0.1], armL: [-0.4, -0.1] };
  const jokoP: ToonParams = { ...joko, expr: f >= jk ? "happy" : "smirk", armR: [1.2, -1.6], squash: Math.abs(Math.sin(t * 6)) * 0.1 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg={NIGHT} shadows>
        <Gang t={t} pulse={pu} />
        <ToonSprite position={[0.9, 0.4, -0.9]} height={2.0} yaw={yawTo(0.9, -0.9, cam)} params={jokoP} />
        <ToonSprite position={[-0.9, 0, 0.5]} height={2.0} yaw={yawTo(-0.9, 0.5, cam)} params={tiniP} />
        {f >= say - 10 && <ToonSprite position={[-2.9, 0, 0.6]} height={1.9} yaw={yawTo(-2.9, 0.6, cam)} params={ujangP} />}
      </Stage>
      <Look tint="rgba(60,20,120,0.2)" />
      <Clock time="00:30" />
      {f >= knock && f < knock + 40 && <div style={{ position: "absolute", top: 700, left: 120, fontFamily: FONT_TITLE, fontSize: 110, color: "#ffd23f", WebkitTextStroke: "7px #16110f", paintOrder: "stroke fill", transform: `rotate(-6deg) scale(${1 + 0.05 * Math.sin(f * 2)})` }}>DUK DUK DUK!</div>}
      <Bubble text="Pak Joko, sudah malam!" from={say} to={jk - 4} x={70} y={1000} color="#ffe4ef" size={38} />
      <Bubble text="Lagu terakhir, Bu." from={jk} to={tenth - 4} x={380} y={1000} color="#fff3c4" />
      {f >= tenth && (
        <div style={{ position: "absolute", top: 760, left: 110, padding: "14px 28px", borderRadius: 20, background: "rgba(16,16,34,0.92)", border: "4px solid #ffd23f", fontFamily: FONT_TITLE, fontSize: 84, color: "#ffd23f", transform: `scale(${0.6 + 0.4 * sm(cl((f - tenth) / 8))})`, transformOrigin: "left top" }}>
          LAGU KE-10
        </div>
      )}
      <Caps ids={["pagar_1", "pagar_2", "pagar_3", "pagar_4"]} hl={["menggedor", "pagar", "Joko", "malam", "Sebentar", "terakhir", "kesepuluh"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. DALAM                                                              */
/* ================================================================== */
export const SceneKDalam: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const enter = EV("dalam.enter");
  const song = EV("dalam.song");
  const tiniF = EV("dalam.tini");
  const dance = EV("dalam.dance");
  const party = sm(cl((f - song) / 10));
  const cam = shotCam(f, [
    { to: song, p0: [0, 1.9, 8.8], l0: [0, 1.4, -1], p1: [0, 1.9, 8.2], l1: [0, 1.4, -1], fov: 46 },
    { to: dance, p0: [0, 1.8, 7.6], l0: [0, 1.4, -1], p1: [0, 1.8, 7.2], l1: [0, 1.4, -1], fov: 46 },
    { to: 9999, p0: [0, 1.8, 7.8], l0: [0, 1.3, -1], p1: [0, 1.8, 7.3], l1: [0, 1.3, -1], fov: 46 },
  ]);
  const walkIn = (x1: number, delay: number) => lerpX(6.5, x1, sm(cl((f - enter - delay) / 22)));
  const lerpX = (a: number, b: number, k: number) => a + (b - a) * k;
  const sway = (ph: number) => Math.sin(t * 7 + ph);
  const dancing = f >= dance;
  const mk = (base: ToonParams, ph: number, expr: ToonParams["expr"]): ToonParams => ({ ...base, expr: f >= song ? expr : "angry", armR: f >= song ? [2.4 + 0.5 * sway(ph), -0.3] : [0.5, -0.2], armL: f >= song ? [-2.4 - 0.5 * sway(ph + 1), 0.3] : [-0.5, 0.2], squash: f >= song ? Math.abs(sway(ph)) * 0.35 : 0, lean: f >= song ? 0.1 * sway(ph) : 0 });
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2a1a40" shadows>
        <LivingRoom t={t} party={party} />
        <ToonSprite position={[0, 0, -2.0]} height={2.0} yaw={0} params={{ ...joko, expr: "laugh", armR: [1.5, -1.5], squash: Math.abs(sway(0)) * 0.3 }} />
        <ToonSprite position={[walkIn(-2.2, 0), 0, -0.4]} height={2.0} yaw={0} params={f >= tiniF ? { ...mk(tini, 1, "happy"), prop: "mic" } : mk(tini, 1, "angry")} />
        <ToonSprite position={[walkIn(2.3, 6), 0, -0.2]} height={1.9} yaw={0} params={mk(ujang, 2, "happy")} />
        <ToonSprite position={[walkIn(0.9, 12), 0, 0.5]} height={1.95} yaw={0} params={mk({ ...rizal, headphones: false }, 3, "laugh")} />
      </Stage>
      <Look tint="rgba(120,30,120,0.15)" />
      <Clock time="01:15" />
      {f >= song && <Notes from={song} to={song + 200} x={460} y={1000} color="#ff9ad6" />}
      <Bubble text="Satu lagu saja!" from={tiniF} to={tiniF + 70} x={90} y={980} color="#ffe4ef" />
      <Caps ids={["dalam_1", "dalam_2", "dalam_3"]} hl={["protes", "koplo", "diputar", "Satu", "saja", "lupa", "goyang"]} color="#ff9ad6" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. PANGGUNG                                                           */
/* ================================================================== */
export const SceneKPanggung: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const mic = EV("panggung.mic");
  const sing = EV("panggung.sing");
  const quiet = EV("panggung.quiet");
  const jokoF = EV("panggung.joko");
  const tiniF = EV("panggung.tini");
  const card = EV("panggung.card");
  const dawn = sm(cl((f - (tiniF + 6)) / 50));
  const cam = shotCam(f, [
    { to: mic + 20, p0: [0.4, 2.0, 9.6], l0: [0.4, 1.5, -0.2], p1: [0.4, 1.9, 8.8], l1: [0.4, 1.5, -0.2], fov: 44 },
    { to: quiet, p0: [0.4, 1.9, 6.4], l0: [0.4, 1.7, 0.2], p1: [0.4, 1.9, 6.0], l1: [0.4, 1.7, 0.2], fov: 40 },
    { to: jokoF, p0: [-0.8, 1.7, 9.2], l0: [0.2, 1.4, 0.6], p1: [-0.4, 1.7, 8.6], l1: [0.2, 1.4, 0.6], fov: 46 },
    { to: 9999, p0: [0, 2.1, 10.2], l0: [0.3, 1.5, 0], p1: [0, 2.0, 9.6], l1: [0.3, 1.5, 0], fov: 46 },
  ]);
  const singing = f >= sing && f < quiet;
  const nenekP: ToonParams = { ...nenek, expr: f >= mic ? (singing ? "happy" : "smirk") : "neutral", prop: f >= mic ? "mic" : "cane", armR: f >= mic ? [1.3, -1.7] : [0.3, 0.1], lean: singing ? Math.sin(t * 2.5) * 0.06 : 0, squash: singing ? Math.abs(Math.sin(t * 2.5)) * 0.06 : 0 };
  const awe = f >= sing;
  const crowd = (x: number, base: ToonParams, ph: number, extra: Partial<ToonParams> = {}) => ({ ...base, expr: awe ? ("surprised" as const) : ("angry" as const), armR: awe ? [2.4 + 0.2 * Math.sin(t * 2 + ph), -0.4] : [0.4, 0.1], armL: awe ? [-2.4 - 0.2 * Math.sin(t * 2 + ph), 0.4] : [-0.4, -0.1], ...extra }) as ToonParams;
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg={dawn > 0.5 ? "linear-gradient(#f6a56b, #ffcf9a 60%, #ffe9c4)" : NIGHT} shadows>
        <Gang t={t} dawn={dawn} stage disco={0} />
        <ToonSprite position={[0.4, 0.5, 0.4]} height={1.9} yaw={0} params={nenekP} />
        <ToonSprite position={[-1.8, 0, 2.2]} height={2.0} yaw={0.12} params={crowd(-1.8, { ...joko, prop: "none", shades: false }, 0, f >= quiet ? { expr: "worried", sweat: 1, armR: [0.4, -0.2], armL: [-0.4, 0.2] } : {})} />
        <ToonSprite position={[-0.4, 0, 2.5]} height={2.0} yaw={0.05} params={crowd(-0.4, { ...tini }, 1)} />
        <ToonSprite position={[1.2, 0, 2.4]} height={1.9} yaw={-0.05} params={crowd(1.2, { ...ujang }, 2)} />
        <ToonSprite position={[2.7, 0, 2.2]} height={1.95} yaw={-0.12} params={crowd(2.7, { ...rizal, sweat: 0, headphones: false }, 3)} />
        {awe && [0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[[-1.0, 0.2, 1.8, 3.3][i], 2.7 + Math.sin(t * 3 + i) * 0.08, 2.2]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color="#fff2a0" />
          </mesh>
        ))}
      </Stage>
      <Look tint={dawn > 0.5 ? "rgba(255,170,100,0.18)" : "rgba(40,20,100,0.2)"} />
      <Clock time={dawn > 0.5 ? "04:30" : "03:00"} />
      {singing && <Notes from={sing} to={quiet} x={500} y={1000} color="#bfe3ff" />}
      <Bubble text="Saya... kalah, Nek." from={jokoF} to={tiniF - 4} x={90} y={980} color="#fff3c4" />
      <Bubble text="Besok malam lagi, ya!" from={tiniF} to={card} x={90} y={980} color="#ffe4ef" />
      <Caps ids={["panggung_1", "panggung_2", "panggung_3", "panggung_4", "panggung_5"]} hl={["Nenek", "Mina", "mic", "bulan", "syahdu", "terdiam", "menangis", "kalah", "Besok", "lagi"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(30,12,40,${0.62 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, width: 760 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 112, lineHeight: 1.05, color: "#ffd23f", WebkitTextStroke: "8px #1a0a0a", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a0a0a" }}>BESOK JAM 12</div>
            <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: "white", lineHeight: 1.25 }}>Lagu apa yang kamu pilih?</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

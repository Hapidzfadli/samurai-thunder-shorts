import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { ToonParams, ToonSprite, cl, lerp3, sm } from "./three/objectsSoda";
import { BtsHill, CableCut, Kamar, NightCity, Router, ServerRoom, Shark, Tube, Underwater } from "./three/objectsPaket";
import timing from "./paket_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_PAKET = timing.scenes as { hook: number; router: number; tiang: number; laut: number; server: number; bts: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const KEYS = ["hook", "router", "tiang", "laut", "server", "bts", "akhir"] as const;
const START: Record<string, number> = {};
{
  let a = 0;
  for (const k of KEYS) {
    START[k] = a;
    a += DURATIONS_PAKET[k];
  }
}

/* ------------------------------------------------------------------ */
/* Camera (push in / pull back through a mid point)                      */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; pm?: Vec3; lm?: Vec3; fov?: number; fov1?: number; shake?: number };
const curve = (a: Vec3, b: Vec3, m: Vec3 | undefined, k: number): Vec3 => {
  if (!m) return lerp3(a, b, k);
  const c: Vec3 = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2, 2 * m[2] - (a[2] + b[2]) / 2];
  const u = 1 - k;
  return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1], u * u * a[2] + 2 * u * k * c[2] + k * k * b[2]];
};
const shotCam = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, Math.min(s.to, start + 400) - start);
      const raw = cl((frame - start) / len);
      const k = s.pm ? raw * raw * (3 - 2 * raw) * 0.4 + raw * 0.6 : sm(raw);
      const p = curve(s.p0, s.p1 ?? s.p0, s.pm, k);
      const l = curve(s.l0, s.l1 ?? s.l0, s.lm, k);
      const f0 = s.fov ?? 50;
      const fov = f0 + ((s.fov1 ?? f0) - f0) * k;
      const sh = s.shake ?? 0;
      const jx = sh * Math.sin(frame * 2.3) * 0.5 + sh * Math.sin(frame * 5.1) * 0.3;
      const jy = sh * Math.cos(frame * 2.9) * 0.5;
      return { pos: [p[0] + jx, p[1] + jy, p[2]] as Vec3, look: l, fov };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 50 };
};
type Cam = { pos: Vec3; look: Vec3; fov: number };

const Stage: React.FC<{ cam: Cam; bg: string; shadows?: boolean; children: React.ReactNode }> = ({ cam, bg, shadows = false, children }) => {
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

const Tag: React.FC<{ label: string; from: number; to: number; color?: string; top?: number }> = ({ label, from, to, color = "#7dd3fc", top = 268 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 60, padding: "10px 24px", borderRadius: 16, background: "rgba(16,16,34,0.88)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 38, letterSpacing: 2, color: "white", opacity: s * out, transform: `translateX(${(1 - s) * -90}px)`, boxShadow: `0 8px 30px ${color}55` }}>
      <span style={{ color }}>● </span>
      {label}
    </div>
  );
};

/** The 60-second deadline, counted down across the whole trip. */
const Timer: React.FC<{ scene: (typeof KEYS)[number]; final?: boolean }> = ({ scene, final }) => {
  const f = useCurrentFrame();
  const g = START[scene] + f;
  const g0 = START.hook + EV("hook.timer");
  const g1 = START.akhir + EV("akhir.time");
  const left = final ? 1 : Math.max(1, Math.round(60 - (60 - 1) * cl((g - g0) / (g1 - g0))));
  const k = cl((g - g0) / (g1 - g0));
  if (g < g0 - 4) return null;
  const low = left < 15;
  return (
    <div style={{ position: "absolute", top: 180, left: 60, display: "flex", alignItems: "center", gap: 14, padding: "8px 22px", borderRadius: 16, background: "rgba(16,16,34,0.9)", border: `3px solid ${low ? "#ff4d4d" : "#4ade80"}`, fontFamily: FONT_TITLE, fontSize: 52, color: low ? "#ff6b6b" : "#fff", boxShadow: `0 8px 30px ${low ? "#ff4d4d" : "#4ade80"}55`, transform: low ? `scale(${1 + 0.03 * Math.sin(f * 1.2)})` : undefined }}>
      <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 28, color: "#cbd5e1", letterSpacing: 2 }}>SISA</span>
      0:{String(left).padStart(2, "0")}
      <div style={{ width: 120, height: 14, borderRadius: 7, background: "#334155", overflow: "hidden" }}>
        <div style={{ width: `${(1 - k) * 100}%`, height: "100%", background: low ? "#ff4d4d" : "#4ade80" }} />
      </div>
    </div>
  );
};

const Look: React.FC<{ tint?: string }> = ({ tint = "rgba(30,20,60,0)" }) => (
  <>
    <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(8,6,20,0.5) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(8,6,20,0) 62%, rgba(8,6,20,0.55) 86%, rgba(8,6,20,0.7) 100%)" }} />
  </>
);

/* ------------------------------------------------------------------ */
/* Characters                                                            */
/* ------------------------------------------------------------------ */
const yawTo = (x: number, z: number, cam: Cam) => Math.max(-0.6, Math.min(0.6, Math.atan2(cam.pos[0] - x, cam.pos[2] - z) * 0.8));
const paket: ToonParams = { expr: "worried", shirt: "#d49a4a", kind: "box", seed: 5 };
const rina: ToonParams = { expr: "worried", shirt: "#ff6b9d", pants: "#3a3a5a", hat: "hair", hatColor: "#1a1210", seed: 2 };
const dosen: ToonParams = { expr: "neutral", shirt: "#6b7280", pants: "#27272a", hat: "bowler", hatColor: "#3f3f46", glasses: true, seed: 9 };
const petugas: ToonParams = { expr: "neutral", shirt: "#16a34a", pants: "#1f2937", hat: "cap", hatColor: "#14532d", seed: 12 };
const run = (f: number, sp = 0.9): Partial<ToonParams> => ({ legL: Math.sin(f * sp) * 0.75, legR: -Math.sin(f * sp) * 0.75, armL: [-0.5 - Math.sin(f * sp) * 0.7, 0.5], armR: [0.5 - Math.sin(f * sp) * 0.7, -0.5], squash: Math.abs(Math.sin(f * sp)) * 0.35, lean: 0.25 });

/* ================================================================== */
/* 1. HOOK: Rina hits send at 23:59                                      */
/* ================================================================== */
export const ScenePaketHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const send = EV("hook.send");
  const pack = EV("hook.pack");
  const tim = EV("hook.timer");
  const cam = shotCam(f, [
    { to: send + 4, p0: [0.5, 1.5, 4.8], l0: [0.7, 1.2, -2], p1: [0.9, 1.4, 3.6], l1: [0.9, 1.15, -2.2], fov: 40 },
    { to: pack + 6, p0: [1.3, 1.3, 1.2], l0: [1.3, 1.2, -2.6], pm: [1.3, 1.3, 0.8], p1: [1.4, 1.7, 3.6], l1: [1.2, 1.2, -2.4], fov: 34, fov1: 40 },
    { to: 9999, p0: [0.4, 1.8, 5.8], l0: [1.0, 1.2, -2], p1: [1.0, 1.6, 4.4], l1: [1.0, 1.2, -2], fov: 42 },
  ]);
  const pressed = f > send - 2 ? 1 : 0;
  const rinaP: ToonParams = {
    ...rina,
    expr: f > send ? "surprised" : "worried",
    armR: [0.9 + (pressed ? 0.1 : Math.sin(f * 1.8) * 0.15), -1.3 + (pressed ? -0.35 : 0)],
    armL: [-0.4, 0.1],
    sweat: 1,
    look: 0.6,
    squash: Math.abs(Math.sin(f * 1.8)) * 0.15,
  };
  const pk = sm(cl((f - pack) / 12));
  const pakP: ToonParams = { ...paket, expr: f > tim ? "worried" : "happy", armL: [-2.2, -0.3], armR: [2.2, 0.3], squash: Math.sin((f - pack) * 0.7) * 0.2 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#0e1230" shadows>
        <Kamar t={t} clock="23:59" screen={f > send ? "TERKIRIM" : "MENGIRIM"} progress={f > send ? 1 : 0.9 + 0.08 * (f / send)} />
        <ToonSprite position={[0.1, 0, -1.3]} yaw={yawTo(0.1, -1.3, cam)} params={rinaP} />
        {f > pack && <ToonSprite position={[1.3, 0.86 + 0.4 * Math.abs(Math.sin((f - pack) * 0.25)) * (f > tim ? 0 : 1), -2.3]} yaw={yawTo(1.3, -2.3, cam)} height={1.4 * pk} params={pakP} shadow={false} />}
      </Stage>
      <Look tint="rgba(60,40,120,0.25)" />
      <Timer scene="hook" />
      <Tag label="DEADLINE 23:59" from={0} to={send + 60} color="#ff6b6b" top={268} />
      <Caps ids={["hook_1", "hook_2", "hook_3"]} hl={["sebelas", "kirim", "paket", "Paket", "enam", "puluh"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. ROUTER: Pak Paket cuts the queue                                   */
/* ================================================================== */
const QUEUE = ["#7dd3fc", "#a7f3d0", "#fde68a", "#fca5a5", "#c4b5fd", "#fdba74"];
export const ScenePaketRouter: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const queue = EV("router.queue");
  const say = EV("router.say");
  const reply = EV("router.reply");
  const cam = shotCam(f, [
    { to: queue, p0: [-0.5, 1.7, 6.4], l0: [0, 1.0, -0.5], p1: [0.4, 1.5, 5.4], l1: [0.4, 1.0, -0.5], fov: 44 },
    { to: say, p0: [-2.2, 1.0, 3.6], l0: [-0.4, 0.8, -0.2], p1: [0.2, 1.3, 4.6], l1: [1.0, 1.0, -0.4], fov: 40 },
    { to: 9999, p0: [2.3, 1.7, 3.8], l0: [2.3, 1.5, -1], pm: [2.3, 1.7, 3.2], p1: [1.3, 1.7, 6.0], l1: [1.4, 1.2, -0.6], fov: 38, fov1: 44 },
  ]);
  const mad = sm(cl((f - reply) / 8));
  const dash = sm(cl((f - 2) / 40));
  const px = -3.8 + dash * 4.6 - (f > say ? 0 : 0);
  const pakP: ToonParams = f < say + 10 ? { ...paket, ...run(f, 0.9), expr: "worried" } : { ...paket, expr: "nervous", armL: [-1.0, 0.3], armR: [1.0, -0.3], sweat: 1 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="linear-gradient(#0b1030, #1a2150)">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}>
          <planeGeometry args={[40, 20]} />
          <meshStandardMaterial color="#4b5aa8" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3, -5]}>
          <planeGeometry args={[40, 8]} />
          <meshStandardMaterial color="#35418a" />
        </mesh>
        <mesh position={[2.3, 0.35, -1]}>
          <boxGeometry args={[4.4, 0.7, 2]} />
          <meshStandardMaterial color="#3d2b1f" />
        </mesh>
        <Router position={[2.3, 0.7, -1]} t={t} scale={1.1} mad={mad} />
        {QUEUE.map((c, i) => (
          <ToonSprite key={i} position={[-3.4 + i * 0.75 + (f > say ? 0 : 0), 0, -0.6 - (i % 2) * 0.15]} height={1.55} yaw={0.2} params={{ expr: i % 2 ? "neutral" : "worried", shirt: c, kind: "box", seed: 20 + i, armL: [-0.3, 0.9], armR: [0.3, -0.9], squash: Math.sin(t * 2 + i) * 0.15, look: 0.5 }} />
        ))}
        <ToonSprite position={[px, 0, 0.7]} yaw={yawTo(px, 0.7, cam)} height={1.9} params={pakP} />
        <ambientLight intensity={1.6} color="#c9d6ff" />
        <pointLight position={[2, 3, 3]} intensity={120} distance={14} color="#9fe0ff" />
        <pointLight position={[-2, 3, 3]} intensity={70} distance={14} color="#ffd9a0" />
      </Stage>
      <Look tint="rgba(30,40,120,0.2)" />
      <Timer scene="router" />
      <Tag label="ROUTER" from={2} to={queue + 20} />
      <Caps ids={["router_1", "router_2", "router_3", "router_4"]} hl={["router", "berkedip", "antre", "Antre", "darurat"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. TIANG: fibre-optic cable, speed of light, a kite in the way       */
/* ================================================================== */
export const ScenePaketTiang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const light = EV("tiang.light");
  const speed = EV("tiang.speed");
  const kite = EV("tiang.kite");
  const x = interpolate(f, [0, light], [-7, 6], clamp);
  if (f < light) {
    const cam = shotCam(f, [{ to: light, p0: [-7.0, 5.8, 2.0], l0: [-7.0, 6.5, -5.5], p1: [6.0, 5.8, 2.0], l1: [6.0, 6.5, -5.5], fov: 46 }]);
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="linear-gradient(#0b1030, #2b2f6b 70%, #6b5fa8)">
          <NightCity t={t} kite={0} />
          <ToonSprite position={[x, 6.4, -5.3]} height={2.2} yaw={0.1} params={{ ...paket, ...run(f, 1.1), expr: "worried" }} shadow={false} />
        </Stage>
        <Look tint="rgba(30,40,120,0.2)" />
        <Timer scene="tiang" />
        <Tag label="KABEL SERAT OPTIK" from={4} to={light - 6} color="#7dd3fc" />
        <Caps ids={["tiang_1"]} hl={["lari", "serat", "optik"]} />
      </AbsoluteFill>
    );
  }
  if (f < kite - 4) {
    const cam = shotCam(f, [
      { to: speed, p0: [0.3, -1.0, 6.2], l0: [0, -1.0, 0], p1: [-0.6, -0.5, 4.2], l1: [0, -1.0, 0], fov: 56 },
      { to: 9999, p0: [-1.4, -0.6, 4.4], l0: [0, -1.0, 0], pm: [1.4, -0.3, 3.6], p1: [0, 0.2, 6.5], l1: [0, -1.0, 0], fov: 60, fov1: 70, shake: 0.05 },
    ]);
    const fl = sm(cl((f - light) / 10));
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="#050a1e">
          <Tube t={t} speed={30 + 40 * sm(cl((f - speed + 10) / 20))} />
          <mesh position={[0, -1.0, -0.4]}>
            <sphereGeometry args={[1.55 * fl, 16, 12]} />
            <meshBasicMaterial color="#bfe3ff" transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <ToonSprite position={[0, -2.0, 0]} height={2.0} yaw={0.15} params={{ ...paket, ...run(f, 1.3), expr: "happy", shirt: "#dbeafe" }} shadow={false} />
        </Stage>
        <Look tint="rgba(0,60,160,0.15)" />
        <Timer scene="tiang" />
        <Tag label="JADI CAHAYA" from={light} to={speed - 4} color="#bfe3ff" />
        <Tag label="200.000 KM/DETIK" from={speed} to={kite - 8} color="#f0abfc" />
        <Caps ids={["tiang_2", "tiang_3"]} hl={["berubah", "cahaya", "dua", "ratus", "ribu"]} color="#bfe3ff" />
      </AbsoluteFill>
    );
  }
  const k = sm(cl((f - kite) / 40));
  const cam = shotCam(f, [{ to: 9999, p0: [1.0, 5.4, 2.6], l0: [2.0, 5.9, -5.3], p1: [1.6, 5.8, 4.8], l1: [2.2, 6.0, -5.3], fov: 40 }]);
  const lx = -8 + k * 18;
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="linear-gradient(#0b1030, #2b2f6b 70%, #6b5fa8)">
        <NightCity t={t} kite={1} />
        <mesh position={[lx, 6.35, -5.4]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshBasicMaterial color="#e0f2fe" />
        </mesh>
        <mesh position={[lx - 0.8, 6.35, -5.4]} scale={[4, 0.5, 0.5]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.5} />
        </mesh>
      </Stage>
      <Look tint="rgba(30,40,120,0.2)" />
      <Timer scene="tiang" />
      <Caps ids={["tiang_4"]} hl={["nyangkut", "nggak", "peduli"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. LAUT: shark bites the sea cable, armour saves the day             */
/* ================================================================== */
export const ScenePaketLaut: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shark = EV("laut.shark");
  const chomp = EV("laut.chomp");
  const armor = EV("laut.armor");
  if (f >= armor - 6) {
    const hit = sm(cl((f - armor) / 6));
    const cam = shotCam(f, [{ to: 9999, p0: [0, 0.3, 5.2], l0: [0, 0, 0], pm: [0.2, 0.2, 4.0], p1: [0, 0.6, 6.4], l1: [0, 0, 0], fov: 40, fov1: 46 }]);
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="#08485c">
          <CableCut position={[0, 0, 0]} t={t} hit={hit} scale={1.0} />
          <ambientLight intensity={1.0} color="#9fe3f5" />
          <directionalLight position={[2, 4, 6]} intensity={2.0} color="#ffffff" />
        </Stage>
        <Look tint="rgba(0,80,110,0.2)" />
        <Timer scene="laut" />
        <Tag label="KABEL BERLAPIS BAJA" from={armor - 4} to={9999} color="#cbd5e1" />
        <Caps ids={["laut_4"]} hl={["Untung", "berlapis", "baja"]} color="#fde68a" />
      </AbsoluteFill>
    );
  }
  const sx = interpolate(f, [shark - 12, chomp], [13, 3.0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const open = f > shark ? sm(cl((f - shark) / 10)) * (f < chomp ? 1 : Math.max(0, 1 - (f - chomp) / 4)) : 0;
  const px = interpolate(f, [0, chomp], [-9, 0.5], clamp);
  const cam = shotCam(f, [
    { to: shark, p0: [-8.0, 1.5, 5.4], l0: [-8, 0.9, -2], p1: [-2.0, 1.5, 5.4], l1: [-2.0, 0.9, -2], fov: 44 },
    { to: chomp - 6, p0: [-0.5, 1.6, 6.0], l0: [3.0, 0.9, -2], p1: [1.0, 1.4, 4.4], l1: [2.4, 0.8, -2], fov: 44 },
    { to: 9999, p0: [2.0, 0.9, 3.0], l0: [2.0, 0.6, -2], p1: [1.0, 1.5, 5.2], l1: [2.0, 0.7, -2], fov: 36, fov1: 44, shake: f < chomp + 14 ? 0.1 : 0.02 },
  ]);
  const pak: ToonParams = f < chomp - 4 ? { ...paket, ...run(f, 0.9), expr: f > shark ? "surprised" : "worried" } : { ...paket, expr: "surprised", armL: [-2.4, -0.3], armR: [2.4, 0.3], squash: 0.3 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="linear-gradient(#0a6f8c, #08485c)">
        <Underwater t={t} />
        {f > shark - 12 && <Shark position={[sx, 1.0, -2]} t={t} open={open} scale={0.9} rotationY={Math.PI} />}
        <ToonSprite position={[px, 0.2, -1.5]} height={1.5} yaw={0.1} params={pak} shadow={false} />
      </Stage>
      <Look tint="rgba(0,90,120,0.2)" />
      <Timer scene="laut" />
      <Tag label="KABEL DASAR LAUT" from={4} to={shark - 6} color="#7dd3fc" />
      <Caps ids={["laut_1", "laut_2", "laut_3"]} hl={["menyeberang", "dasar", "laut", "hiu", "menggigit", "enak"]} color="#fde68a" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. SERVER                                                             */
/* ================================================================== */
export const ScenePaketServer: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const inF = EV("server.in");
  const cold = EV("server.cold");
  const ticket = EV("server.ticket");
  const cam = shotCam(f, [
    { to: cold, p0: [0, 2.4, 5.4], l0: [0, 1.8, -8], p1: [0, 1.9, 3.0], l1: [0, 1.7, -8], fov: 52 },
    { to: ticket - 6, p0: [0.4, 1.5, -1.0], l0: [3.2, 1.7, -4.2], p1: [-0.2, 1.6, -3.4], l1: [3.2, 1.7, -7], fov: 54 },
    { to: 9999, p0: [0.4, 1.6, 3.0], l0: [0.6, 1.2, -0.5], pm: [0.4, 1.5, 2.2], p1: [0.2, 1.7, 4.6], l1: [0.6, 1.2, -0.5], fov: 40, fov1: 46 },
  ]);
  const pz = f < ticket - 6 ? interpolate(f, [0, ticket - 6], [-9, -1.2], clamp) : -0.9;
  const shiver = f > cold ? Math.sin(f * 2.2) * 0.04 : 0;
  const pakP: ToonParams = f < ticket - 6 ? { ...paket, ...run(f, 1.0), expr: "worried" } : { ...paket, expr: "nervous", armL: [-0.6, 0.2], armR: [1.9, 0.2], sweat: 0, lean: shiver * 4, squash: Math.abs(shiver) * 4 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#101b33">
        <ServerRoom t={t} />
        {f < ticket - 6 ? <ToonSprite position={[0, 0, pz]} height={1.9} yaw={0} params={pakP} /> : <ToonSprite position={[-0.3, 0, -0.9]} height={1.9} yaw={0.1} params={pakP} />}
        {f >= ticket - 8 && <ToonSprite position={[1.3, 0, -0.9]} height={2.0} yaw={-0.2} params={{ ...petugas, expr: "angry", armR: [1.1, 0.5], armL: [-0.7, 1.6], squash: 0.05 }} flip />}
      </Stage>
      <AbsoluteFill style={{ background: `rgba(120,180,255,${f > cold ? 0.18 : 0})`, mixBlendMode: "screen" }} />
      <Look tint="rgba(0,50,140,0.18)" />
      <Timer scene="server" />
      <Tag label="GEDUNG SERVER" from={2} to={cold - 6} color="#7dd3fc" />
      <Tag label="SUHU 18°C" from={cold} to={ticket - 8} color="#a5f3fc" />
      <Caps ids={["server_1", "server_2", "server_3"]} hl={["ribuan", "dua", "puluh", "empat", "dingin", "kepanasan", "Tiket"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. BTS: radio waves                                                   */
/* ================================================================== */
export const ScenePaketBts: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const tower = EV("bts.tower");
  const fly = EV("bts.fly");
  const wave = sm(cl((f - tower) / 10));
  const k = sm(cl((f - fly) / 34));
  const fx = k * 8;
  const fy = 9.5 - Math.sin(k * Math.PI) * 0 - k * 5.5;
  const cam = shotCam(f, [
    { to: fly, p0: [0, 0.8, 6.0], l0: [0, 5.5, -6], p1: [-0.4, 3.0, 6.4], l1: [0, 6.5, -6], fov: 56 },
    { to: fly + 50, p0: [1.0, 5.0, 6.0], l0: [1.5, 7.0, -6], p1: [5.5, 4.4, 6.0], l1: [6.0, 4.6, -6], fov: 50 },
    { to: 9999, p0: [5.5, 4.4, 6.0], l0: [6.0, 4.6, -6], p1: [5.2, 4.2, 5.4], l1: [6.2, 4.5, -6], fov: 50 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="linear-gradient(#0b1030, #2b2f6b 65%, #7a5fa8)">
        <BtsHill t={t} wave={wave} />
        {f >= fly - 4 && <ToonSprite position={[fx, fy, -5.5]} height={1.4 * (1 - 0.35 * k)} yaw={0} params={{ ...paket, expr: "happy", armL: [-2.5, -0.2], armR: [2.5, 0.2], shirt: "#dbeafe", squash: Math.sin(f * 0.6) * 0.2 }} shadow={false} />}
      </Stage>
      <Look tint="rgba(30,40,120,0.2)" />
      <Timer scene="bts" />
      <Tag label="MENARA BTS" from={2} to={fly - 8} color="#fca5a5" />
      <Tag label="GELOMBANG RADIO" from={tower + 18} to={fly + 20} color="#7dd3fc" />
      <Caps ids={["bts_1", "bts_2"]} hl={["menara", "gelombang", "radio", "Terbang", "ngopi"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. AKHIR: on time... but the file is empty                            */
/* ================================================================== */
export const ScenePaketAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const { fps } = useVideoConfig();
  const tim = EV("akhir.time");
  const empty = EV("akhir.empty");
  const wrong = EV("akhir.wrong");
  const quit = EV("akhir.quit");
  const card = EV("akhir.card");
  const cam = shotCam(f, [
    { to: empty, p0: [0.6, 1.5, 6.0], l0: [0.6, 1.2, -1.5], p1: [0.8, 1.45, 4.6], l1: [0.8, 1.15, -1.5], fov: 42 },
    { to: wrong, p0: [0.6, 1.4, 3.6], l0: [0.4, 1.35, -1.5], pm: [0.3, 1.4, 3.1], p1: [0.8, 1.6, 5.6], l1: [0.8, 1.2, -1.5], fov: 36, fov1: 44 },
    { to: 9999, p0: [1.4, 1.4, 4.8], l0: [1.4, 1.2, -1.5], p1: [0.8, 1.6, 6.0], l1: [0.8, 1.2, -1.5], fov: 40, fov1: 44 },
  ]);
  const arrive = sm(cl(f / 18));
  const px = 4.5 - 3.2 * arrive;
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  const dosenP: ToonParams = { ...dosen, expr: f > empty ? "surprised" : "smirk", armR: [0.5, -2.3], armL: [-0.3, -0.1], sweat: 0, look: 0.4 };
  const pakP: ToonParams = f < tim ? { ...paket, ...run(f, 0.9), expr: "happy" } : f < empty ? { ...paket, expr: "happy", armL: [-2.5, -0.3], armR: [2.5, 0.3], squash: Math.abs(Math.sin(f * 0.5)) * 0.3 } : f < quit ? { ...paket, expr: "worried", lean: -0.2, sweat: 1, armL: [-0.2, 0.0], armR: [0.2, 0.0] } : { ...paket, expr: "nervous", armL: [-0.3, 0.0], armR: [1.3, -0.6], lean: -0.2 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2a160c" shadows>
        <Kamar t={t} variant="cafe" clock="00:00" />
        <ToonSprite position={[0.2, 0, -1.4]} yaw={yawTo(0.2, -1.4, cam)} params={dosenP} />
        <ToonSprite position={[px, 0, -0.9]} height={1.7} yaw={yawTo(px, -0.9, cam)} params={pakP} flip={px > 1.5} />
      </Stage>
      <Look tint="rgba(90,40,10,0.15)" />
      {f >= empty && f < card && (
        <div style={{ position: "absolute", top: 250, left: 60, width: 520, padding: "20px 26px", borderRadius: 22, background: "rgba(250,250,252,0.96)", border: "5px solid #16110f", boxShadow: "0 14px 40px rgba(0,0,0,0.45)", transform: `scale(${0.8 + 0.2 * sm(cl((f - empty) / 8))})`, transformOrigin: "left top" }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 30, color: "#334155" }}>📎 tugas_final_revisi_3_beneran.docx</div>
          <div style={{ marginTop: 14, height: 190, background: "#fff", border: "3px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_TITLE, fontSize: 64, color: "#cbd5e1" }}>KOSONG</div>
          <div style={{ marginTop: 12, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 28, color: "#ef4444" }}>0 KB</div>
        </div>
      )}
      <Timer scene="akhir" final />
      <Caps ids={["akhir_1", "akhir_2", "akhir_3", "akhir_4"]} hl={["sembilan", "Tepat", "kosong", "salah", "revisi", "beneran", "pensiun"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(20,10,8,${0.62 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, width: 760 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 120, lineHeight: 1.05, color: "#ffd23f", WebkitTextStroke: "8px #1a0a0a", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a0a0a" }}>CEK FILE DULU</div>
            <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: "white", lineHeight: 1.25 }}>Internet bisa cepat. Salah kirim tetap salah kamu.</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { ToonParams, ToonSprite, cl, lerp3, sm } from "./three/objectsSoda";
import { Building, Gas, Gut, HRRoom, LiftRoom, Lobby } from "./three/objectsLift";
import * as THREE from "three";
import timing from "./lift_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_LIFT = timing.scenes as { hook: number; perut: number; naik: number; bau: number; tuduh: number; buka: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];

/* ------------------------------------------------------------------ */
/* Camera: calm. Mostly still shots with a slow dolly.                  */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number };
const shotCam = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, Math.min(s.to, start + 400) - start);
      const k = sm(cl((frame - start) / len));
      const p = lerp3(s.p0, s.p1 ?? s.p0, k);
      const l = lerp3(s.l0, s.l1 ?? s.l0, k);
      const f0 = s.fov ?? 48;
      return { pos: p, look: l, fov: f0 + ((s.fov1 ?? f0) - f0) * k };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 48 };
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
const Tag: React.FC<{ label: string; from: number; to: number; color?: string; top?: number }> = ({ label, from, to, color = "#ffd23f", top = 268 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 60, padding: "10px 24px", borderRadius: 16, background: "rgba(14,18,36,0.9)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 38, letterSpacing: 2, color: "white", opacity: s * out, transform: `translateX(${(1 - s) * -90}px)`, boxShadow: `0 8px 30px ${color}55` }}>
      {label}
    </div>
  );
};
/** Floor indicator, like the one above a real lift door. */
const Floor: React.FC<{ n: number; up?: boolean }> = ({ n, up = true }) => (
  <div style={{ position: "absolute", top: 180, left: 60, display: "flex", alignItems: "center", gap: 12, padding: "6px 22px", borderRadius: 14, background: "#0b0b10", border: "4px solid #444", fontFamily: "'DejaVu Sans Mono', monospace", fontWeight: 800, fontSize: 56, color: "#ff4d4d", textShadow: "0 0 12px #ff4d4d" }}>
    <span style={{ fontSize: 40 }}>{up ? "▲" : "▼"}</span>
    {String(n).padStart(2, "0")}
  </div>
);
const Bubble: React.FC<{ text: string; from: number; to: number; x: number; y: number; color?: string }> = ({ text, from, to, x, y, color = "#fff" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 10, stiffness: 230 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, padding: "10px 22px", borderRadius: 24, background: color, border: "5px solid #16110f", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, color: "#16110f", transform: `scale(${0.3 + 0.7 * s})`, transformOrigin: "bottom left", opacity: Math.min(1, s * 2) }}>
      {text}
    </div>
  );
};
const Look: React.FC<{ green?: number }> = ({ green = 0 }) => (
  <>
    {green > 0 && <AbsoluteFill style={{ background: `rgba(150,220,60,${green})`, mixBlendMode: "multiply" }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 56%, rgba(10,12,6,0.5) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(8,8,6,0) 62%, rgba(8,8,6,0.55) 86%, rgba(8,8,6,0.7) 100%)" }} />
  </>
);

/* ------------------------------------------------------------------ */
/* Characters                                                            */
/* ------------------------------------------------------------------ */
const yawTo = (x: number, z: number, cam: Cam) => Math.max(-0.5, Math.min(0.5, Math.atan2(cam.pos[0] - x, cam.pos[2] - z) * 0.6));
const greenFace = (k: number) => new THREE.Color("#ffffff").lerp(new THREE.Color("#b7e07a"), cl(k)).getStyle();
const budi: ToonParams = { expr: "worried", shirt: "#dbeafe", pants: "#3b3f63", hat: "bald", hatColor: "#3a2a1a", mustache: true, belly: 0.9, tie: "#dc2626", seed: 4 };
const ibu: ToonParams = { expr: "neutral", shirt: "#e76f9a", pants: "#5a3a5a", hat: "hijab", hatColor: "#7c3aed", seed: 6 };
const ceo: ToonParams = { expr: "neutral", shirt: "#1f2937", pants: "#111827", hat: "bowler", hatColor: "#222222", glasses: true, mustache: true, tie: "#1d4ed8", seed: 9 };
const magang: ToonParams = { expr: "neutral", shirt: "#22c55e", pants: "#334155", hat: "short", hatColor: "#1c1410", glasses: true, lanyard: true, seed: 13 };
const kurir: ToonParams = { expr: "neutral", shirt: "#f97316", pants: "#7c2d12", hat: "cap", hatColor: "#c2410c", prop: "box", seed: 15 };
const NOSE = { armR: [3.5, 0.4] as [number, number], armL: [-3.5, -0.4] as [number, number] };

type Slot = { x: number; z: number; h: number };
const SLOT: Record<string, Slot> = {
  ibu: { x: -1.4, z: 0.9, h: 1.75 },
  budi: { x: 0, z: 0.9, h: 1.75 },
  ceo: { x: 1.4, z: 0.9, h: 1.75 },
  magang: { x: -0.72, z: -0.15, h: 1.6 },
  kurir: { x: 0.72, z: -0.15, h: 1.6 },
};
const Crew: React.FC<{ cam: Cam; p: Record<"ibu" | "budi" | "ceo" | "magang" | "kurir", ToonParams>; z0?: number }> = ({ cam, p, z0 = 0 }) => (
  <>
    {(["magang", "kurir", "ibu", "budi", "ceo"] as const).map((k) => (
      <ToonSprite key={k} position={[SLOT[k].x, 0, SLOT[k].z + z0]} height={SLOT[k].h} yaw={yawTo(SLOT[k].x, SLOT[k].z + z0, cam)} params={p[k]} shadow={false} />
    ))}
  </>
);

const idle = (f: number, seed: number, amt = 0.05) => ({ squash: Math.abs(Math.sin(f * 0.07 + seed)) * amt });

/* ================================================================== */
/* 1. HOOK: lobby                                                        */
/* ================================================================== */
export const SceneLiftHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const enter = EV("hook.enter");
  const stomach = EV("hook.stomach");
  const rumble = EV("hook.rumble");
  const cam = shotCam(f, [
    { to: stomach - 8, p0: [0, 1.9, 9.0], l0: [0, 1.4, 0], p1: [0, 1.8, 8.0], l1: [0, 1.4, 0], fov: 46 },
    { to: rumble + 30, p0: [-0.9, 1.5, 5.4], l0: [-0.4, 1.2, 0], p1: [-0.7, 1.5, 4.9], l1: [-0.3, 1.2, 0], fov: 40 },
    { to: 9999, p0: [0, 1.8, 8.4], l0: [0, 1.4, 0], p1: [0, 1.7, 7.6], l1: [0, 1.4, 0], fov: 46 },
  ]);
  const door = sm(cl((f - enter) / 16));
  const wob = Math.sin(f * 1.3) * 0.04 * (f >= rumble ? 1 : 0);
  const row: [keyof typeof SLOT, number][] = [["ibu", -2.9], ["kurir", -1.6], ["budi", -0.3], ["ceo", 1.0], ["magang", 2.2]];
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2b2638" shadows>
        <Lobby t={t} doorOpen={door} />
        {row.map(([k, x]) => {
          const params = ({ ibu, kurir, budi, ceo, magang } as Record<string, ToonParams>)[k];
          const isB = k === "budi";
          return (
            <ToonSprite key={k} position={[x, 0, 0.6]} height={k === "kurir" || k === "magang" ? 1.85 : 2.0} yaw={yawTo(x, 0.6, cam)} params={{ ...params, ...idle(f, params.seed ?? 1), expr: isB ? (f > stomach ? "worried" : "neutral") : "neutral", armR: isB ? [0.5, -1.5] : params.armR, armL: isB ? [-0.5, 1.5] : params.armL, sweat: isB && f > rumble ? 1 : 0, squash: isB ? 0.1 + Math.abs(wob) * 4 : params.squash }} shadow />
          );
        })}
      </Stage>
      <Look />
      <Tag label="LOBI, LANTAI 1" from={2} to={stomach - 10} color="#ffd23f" />
      {f >= rumble && f < rumble + 36 && <div style={{ position: "absolute", top: 760, left: 180, fontFamily: FONT_TITLE, fontSize: 130, color: "#ffd23f", WebkitTextStroke: "7px #16110f", paintOrder: "stroke fill", transform: `rotate(-8deg) scale(${1 + 0.06 * Math.sin(f)})`, opacity: interpolate(f, [rumble + 26, rumble + 36], [1, 0], clamp) }}>GRUUUK</div>}
      <Caps ids={["hook_1", "hook_2", "hook_3"]} hl={["penuh", "dua", "puluh", "Budi", "jengkol", "berbunyi"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. PERUT: bacteria party                                              */
/* ================================================================== */
export const ScenePerut: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const party = EV("perut.party");
  const gasF = EV("perut.gas");
  const press = EV("perut.press");
  const cheer = EV("perut.cheer");
  const gas = interpolate(f, [gasF, press + 40], [0, 1], clamp);
  const needle = interpolate(f, [press, press + 70], [0.15, 1], clamp);
  const cam = shotCam(f, [
    { to: gasF, p0: [0, 0.4, 7.0], l0: [0, -0.2, -1], p1: [0, 0.3, 6.2], l1: [0, -0.2, -1], fov: 52 },
    { to: cheer - 4, p0: [-1.0, -0.2, 5.8], l0: [-0.6, -1.0, -0.8], p1: [-0.4, -0.2, 5.2], l1: [-0.4, -1.0, -0.8], fov: 50 },
    { to: 9999, p0: [0, 0.2, 7.2], l0: [0, -0.4, -1], p1: [0, 0.2, 6.6], l1: [0, -0.4, -1], fov: 52 },
  ]);
  const s = spring({ frame: f - press, fps, config: { damping: 13 } });
  const ang = -90 + 180 * cl(needle) + Math.sin(f * 1.7) * 3 * needle;
  const arc = (a0: number, a1: number, col: string) => {
    const r = 92;
    const pt = (a: number) => [120 + r * Math.cos(((a - 180) * Math.PI) / 180), 120 + r * Math.sin(((a - 180) * Math.PI) / 180)];
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    return <path d={`M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`} stroke={col} strokeWidth={22} fill="none" />;
  };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#6e2a3c">
        <Gut t={t} gas={gas} cheer={f >= cheer ? 1 : 0.2} />
      </Stage>
      <Look green={gas * 0.12} />
      <Tag label="DI DALAM PERUT" from={2} to={gasF + 10} color="#ff8fa3" top={268} />
      {f >= press && (
        <div style={{ position: "absolute", top: 262, left: 60, width: 260, height: 190, opacity: s, transform: `scale(${0.7 + 0.3 * s})`, transformOrigin: "left top" }}>
          <svg width="260" height="190" viewBox="0 0 240 175">
            <rect x="0" y="0" width="240" height="175" rx="22" fill="rgba(16,16,34,0.88)" stroke="#ffd23f" strokeWidth="4" />
            {arc(0, 60, "#4ade80")}
            {arc(60, 120, "#facc15")}
            {arc(120, 180, "#ef4444")}
            <g transform={`rotate(${ang} 120 120)`}>
              <polygon points="116,120 124,120 120,38" fill="#fff" stroke="#16110f" strokeWidth="2" />
            </g>
            <circle cx="120" cy="120" r="9" fill="#fff" stroke="#16110f" strokeWidth="2" />
            <text x="120" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="19" fill="#fff" letterSpacing="2">TEKANAN GAS</text>
          </svg>
        </div>
      )}
      <Caps ids={["perut_1", "perut_2", "perut_3"]} hl={["pesta", "pora", "gas", "Tekanan", "empat", "belas"]} color="#c8f08a" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. NAIK: building, then the cabin                                     */
/* ================================================================== */
export const SceneNaik: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const seven = EV("naik.seven");
  const sweat = EV("naik.sweat");
  const twelve = EV("naik.twelve");
  const release = EV("naik.release");
  const floor = Math.round(f < 48 ? interpolate(f, [0, 48], [4, 7], clamp) : f < twelve ? interpolate(f, [48, twelve], [7, 12], clamp) : interpolate(f, [twelve, release + 40], [12, 13], clamp));
  if (f < 48) {
    const cam = shotCam(f, [{ to: 9999, p0: [0, 2.2, 13], l0: [0, 5.0, -3], p1: [0, 4.0, 13], l1: [0, 7.0, -3], fov: 46 }]);
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="linear-gradient(#0b1030, #2b2f6b 70%, #6b5fa8)">
          <Building t={t} floor={interpolate(f, [0, 48], [3.2, 6.6], clamp)} />
        </Stage>
        <Look />
        <Floor n={floor} />
        <Caps ids={["naik_1"]} hl={["tujuh", "berkeringat"]} />
      </AbsoluteFill>
    );
  }
  const cam = shotCam(f, [
    { to: twelve - 4, p0: [0, 1.4, 7.0], l0: [0, 1.15, 0], p1: [0, 1.4, 6.5], l1: [0, 1.15, 0], fov: 48 },
    { to: 9999, p0: [0.25, 1.5, 5.4], l0: [0, 1.3, 0.3], p1: [0.2, 1.5, 5.0], l1: [0, 1.3, 0.3], fov: 42 },
  ]);
  const rel = f >= release;
  const crew = {
    ibu: { ...ibu, ...idle(f, 1), look: 0.3, armR: [0.5, -1.2] as [number, number] },
    budi: { ...budi, expr: rel ? ("surprised" as const) : ("worried" as const), sweat: 1, squash: 0.15 + Math.abs(Math.sin(f * 0.5)) * 0.1, lean: Math.sin(f * 0.4) * 0.05, look: -0.2 },
    ceo: { ...ceo, ...idle(f, 2), armR: [1.5, -2.0] as [number, number], look: -0.5 },
    magang: { ...magang, ...idle(f, 3), expr: "happy" as const, armR: [1.0, -1.7] as [number, number], look: 0.4 },
    kurir: { ...kurir, ...idle(f, 4), expr: "happy" as const },
  };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#20232c">
        <LiftRoom t={t} />
        <Crew cam={cam} p={crew} />
        {f >= release && <Gas origin={[0, 0.7, 0.15]} k={cl((f - release) / 80) * 0.25} t={t} spread={1.2} />}
      </Stage>
      <Look />
      <Floor n={floor} />
      {f >= release && <Tag label="TANPA SUARA" from={release} to={release + 70} color="#c8f08a" />}
      <Caps ids={["naik_1", "naik_2", "naik_3"]} hl={["tujuh", "berkeringat", "dua", "belas", "nggak", "kuat", "Tanpa", "mematikan"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. BAU: the cloud and the science                                     */
/* ================================================================== */
export const SceneBau: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cloud = EV("bau.cloud");
  const nose = EV("bau.nose");
  const k = cl(f / 90) * 0.7 + 0.3;
  const react = (at: number) => sm(cl((f - at) / 14));
  const cam = shotCam(f, [
    { to: nose, p0: [0, 1.4, 7.0], l0: [0, 1.15, 0], p1: [0, 1.4, 6.6], l1: [0, 1.15, 0], fov: 48 },
    { to: 9999, p0: [-0.2, 1.4, 6.8], l0: [0, 1.15, 0], p1: [0.2, 1.4, 6.4], l1: [0, 1.15, 0], fov: 48 },
  ]);
  const sick = (at: number) => react(at);
  const crew = {
    ibu: { ...ibu, expr: sick(cloud + 20) > 0.5 ? ("angry" as const) : ("neutral" as const), face: greenFace(sick(cloud + 20)), ...(sick(cloud + 20) > 0.5 ? NOSE : {}) },
    budi: { ...budi, expr: "nervous" as const, sweat: 1, squash: 0.1, face: greenFace(0.2), look: 0.3 },
    ceo: { ...ceo, expr: sick(cloud + 36) > 0.5 ? ("angry" as const) : ("neutral" as const), face: greenFace(sick(cloud + 36)), ...(sick(cloud + 36) > 0.5 ? NOSE : {}) },
    magang: { ...magang, expr: sick(cloud + 50) > 0.5 ? ("worried" as const) : ("happy" as const), face: greenFace(sick(cloud + 50)), ...(sick(cloud + 50) > 0.5 ? NOSE : {}), lean: -0.15 * sick(cloud + 60) },
    kurir: { ...kurir, expr: sick(cloud + 62) > 0.5 ? ("worried" as const) : ("happy" as const), face: greenFace(sick(cloud + 62)), ...(sick(cloud + 62) > 0.5 ? NOSE : {}) },
  };
  const floor = Math.round(interpolate(f, [0, 200], [13, 17], clamp));
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#20232c">
        <LiftRoom t={t} gas={k} />
        <Crew cam={cam} p={crew} />
        <Gas origin={[0, 0.7, 0.15]} k={k} t={t} spread={3.4} />
      </Stage>
      <Look green={0.1 + 0.18 * k} />
      <Floor n={floor} />
      <Tag label="H₂S: HIDROGEN SULFIDA" from={cloud + 6} to={nose - 4} color="#c8f08a" />
      <Tag label="HIDUNG SANGAT PEKA" from={nose + 6} to={9999} color="#ffd23f" />
      <Caps ids={["bau_1", "bau_2"]} hl={["hidrogen", "sulfida", "bakteri", "mencium", "sedikit"]} color="#c8f08a" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. TUDUH                                                              */
/* ================================================================== */
export const SceneTuduh: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const start = EV("tuduh.start");
  const ibuF = EV("tuduh.ibu");
  const mag = EV("tuduh.magang");
  const bud = EV("tuduh.budi");
  const cam = shotCam(f, [
    { to: ibuF - 4, p0: [0, 1.4, 7.0], l0: [0, 1.15, 0], p1: [0, 1.4, 6.6], l1: [0, 1.15, 0], fov: 48 },
    { to: mag - 4, p0: [-1.0, 1.5, 5.4], l0: [-0.9, 1.3, 0.4], p1: [-0.9, 1.5, 5.0], l1: [-0.8, 1.3, 0.4], fov: 42 },
    { to: bud - 4, p0: [-0.2, 1.5, 5.4], l0: [-0.5, 1.3, 0.2], p1: [-0.1, 1.5, 5.0], l1: [-0.4, 1.3, 0.2], fov: 42 },
    { to: 9999, p0: [0.2, 1.5, 5.4], l0: [0.1, 1.3, 0.4], p1: [0.1, 1.5, 5.0], l1: [0.1, 1.3, 0.4], fov: 42 },
  ]);
  const jab = (at: number) => pulse(f, at, 16);
  const green = 0.8;
  const base = { face: greenFace(green) };
  const crew = {
    ibu: { ...ibu, ...base, expr: "angry" as const, armR: f >= ibuF ? [2.2 + 0.2 * jab(ibuF), -0.3] : NOSE.armR, armL: NOSE.armL, lean: 0.1 * jab(ibuF) } as ToonParams,
    budi: { ...budi, face: greenFace(0.15), expr: f >= bud ? ("smirk" as const) : ("nervous" as const), sweat: 1, armR: f >= bud ? [0.3, 0.1] : [0.5, -1.2], armL: f >= bud ? [-1.8, -0.6] : [-0.5, 1.2] } as ToonParams,
    ceo: { ...ceo, ...base, expr: "angry" as const, ...NOSE, lean: 0.05 * jab(start + 8) } as ToonParams,
    magang: { ...magang, ...base, expr: f >= mag ? ("surprised" as const) : ("worried" as const), armR: f >= mag ? [2.6 + 0.4 * Math.sin(f), 0.3] : NOSE.armR, armL: f >= mag ? [-2.6 - 0.4 * Math.sin(f), -0.3] : NOSE.armL, squash: Math.abs(Math.sin(f * 0.9)) * 0.15 * (f >= mag ? 1 : 0) } as ToonParams,
    kurir: { ...kurir, ...base, expr: "worried" as const, ...NOSE } as ToonParams,
  };
  const floor = Math.round(interpolate(f, [0, 240], [17, 19], clamp));
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#20232c">
        <LiftRoom t={t} gas={1} />
        <Crew cam={cam} p={crew} />
        <Gas origin={[0, 0.7, 0.15]} k={1} t={t} spread={3.6} />
      </Stage>
      <Look green={0.26} />
      <Floor n={floor} />
      <Bubble text="Siapa ini?!" from={ibuF} to={mag - 4} x={80} y={1000} />
      <Bubble text="Bukan saya, Pak!" from={mag} to={bud - 4} x={140} y={1000} />
      <Bubble text="Wah, baunya parah ya." from={bud} to={9999} x={220} y={1000} color="#e0f2fe" />
      <Caps ids={["tuduh_1", "tuduh_2", "tuduh_3", "tuduh_4"]} hl={["saling", "menuduh", "Siapa", "ampun", "Bukan", "saya", "parah"]} color="#ffb4a8" />
    </AbsoluteFill>
  );
};
const pulse = (f: number, at: number, len = 12) => (f < at || f > at + len ? 0 : Math.sin(((f - at) / len) * Math.PI));

/* ================================================================== */
/* 6. BUKA: floor 20                                                     */
/* ================================================================== */
export const SceneBuka: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const door = EV("buka.door");
  const hrd = EV("buka.hrd");
  const open = sm(cl((f - door) / 18));
  const rush = cl((f - door) / 40);
  const cam = shotCam(f, [
    { to: hrd - 4, p0: [0, 1.7, 9.0], l0: [0, 1.5, -2.5], p1: [0, 1.7, 8.2], l1: [0, 1.5, -2.5], fov: 46 },
    { to: 9999, p0: [1.6, 1.6, 6.0], l0: [0.6, 1.4, -1.5], p1: [1.2, 1.6, 5.6], l1: [0.4, 1.4, -1.5], fov: 44 },
  ]);
  const base = { face: greenFace(0.85) };
  const crew = {
    ibu: { ...ibu, ...base, expr: "worried" as const, ...NOSE },
    budi: { ...budi, face: greenFace(0.1), expr: "smirk" as const, armL: [-0.4, 0.2], armR: [0.4, -0.2] } as ToonParams,
    ceo: { ...ceo, ...base, expr: "angry" as const, ...NOSE },
    magang: { ...magang, ...base, expr: "worried" as const, ...NOSE } as ToonParams,
    kurir: { ...kurir, ...base, expr: "worried" as const, ...NOSE },
  };
  const hrdP: ToonParams = { expr: f > door + 20 ? "surprised" : "happy", shirt: "#7c3aed", pants: "#1f2937", hat: "hair", hatColor: "#2a1a10", seed: 21, armR: f >= hrd ? [1.5, -0.2] : [0.5, -2.2], armL: [-0.5, 1.4], face: greenFace(open * 0.4) };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#cdd8ee" shadows>
        <Lobby t={t} doorOpen={open} warm={false} portal title="LANTAI 20" sub="HRD & KEUANGAN" />
        <LiftRoom t={t} z0={-5.3} gas={1} />
        <Crew cam={cam} p={crew} z0={-5.3} />
        <Gas origin={[0, 0.7, -5.1]} k={0.8 + 0.2 * rush} t={t} spread={3.8} />
        {open > 0.1 && <Gas origin={[0, 0.9, -1.8]} k={rush} t={t} spread={2.4 + 3 * rush} />}
        <ToonSprite position={[2.8, 0, -0.4]} height={2.0} yaw={yawTo(2.8, -0.4, cam)} params={hrdP} flip />
      </Stage>
      <Look green={0.08 * open} />
      <Floor n={20} />
      <Tag label="LANTAI 20" from={door - 4} to={hrd} color="#ffd23f" />
      <Caps ids={["buka_1", "buka_2"]} hl={["terbuka", "dua", "puluh", "HRD", "menunggu", "wawancara"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. AKHIR: the interview                                               */
/* ================================================================== */
export const SceneAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const ceoF = EV("akhir.ceo");
  const verdict = EV("akhir.verdict");
  const tip = EV("akhir.tip");
  const card = EV("akhir.card");
  const cam = shotCam(f, [
    { to: ceoF + 40, p0: [0.4, 1.6, 5.8], l0: [0.4, 1.3, -1.5], p1: [0.8, 1.6, 5.2], l1: [0.8, 1.3, -1.8], fov: 42 },
    { to: tip, p0: [0, 1.7, 7.2], l0: [0, 1.4, -1.5], p1: [0, 1.7, 6.6], l1: [0, 1.4, -1.5], fov: 46 },
    { to: 9999, p0: [-0.6, 1.6, 6.2], l0: [-0.8, 1.3, -0.5], p1: [-0.4, 1.6, 5.6], l1: [-0.6, 1.3, -0.5], fov: 42 },
  ]);
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  const stamp = sm(cl((f - verdict - 8) / 6));
  const leave = sm(cl((f - tip) / 40));
  const bx = -1.6 - leave * 3.2;
  const budiP: ToonParams = { ...budi, face: "#ffffff", expr: f < verdict ? "nervous" : "worried", sweat: f < tip ? 1 : 0, armR: [0.4, -0.2], armL: [-0.4, 0.2], ...(leave > 0 ? { legL: Math.sin(f * 0.8) * 0.6, legR: -Math.sin(f * 0.8) * 0.6 } : {}) };
  const ceoP: ToonParams = { ...ceo, face: greenFace(0.5), expr: f < verdict ? "angry" : "worried", ...NOSE };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#cfe6f7" shadows>
        <HRRoom t={t} />
        <ToonSprite position={[1.0, 0, -3.1]} height={2.0} yaw={0} params={ceoP} flip shadow={false} />
        <ToonSprite position={[bx, 0, -0.6]} height={2.0} yaw={yawTo(bx, -0.6, cam)} params={budiP} />
      </Stage>
      <Look />
      {f >= verdict + 8 && f < card && (
        <div style={{ position: "absolute", top: 520, left: 100, transform: `rotate(-12deg) scale(${0.5 + 0.5 * stamp})`, opacity: stamp, border: "10px solid #e63946", borderRadius: 18, padding: "6px 30px", fontFamily: FONT_TITLE, fontSize: 120, color: "#e63946", background: "rgba(255,255,255,0.75)", letterSpacing: 6 }}>DITOLAK</div>
      )}
      <Caps ids={["akhir_1", "akhir_2", "akhir_3"]} hl={["Selamat", "bertemu", "tidak", "diterima", "berkesan", "toilet"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(20,16,8,${0.64 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, width: 760 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 112, lineHeight: 1.05, color: "#c8f08a", WebkitTextStroke: "8px #1a0a0a", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a0a0a" }}>TOILET DULU</div>
            <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: "white", lineHeight: 1.25 }}>Lift itu bukan tempat yang tepat.</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

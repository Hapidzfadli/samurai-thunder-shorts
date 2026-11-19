import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { CanInterior, CanTop, Desert, DesertLights, Foam, ToonParams, ToonSprite, cl, lerp3, sm } from "./three/objectsSoda";
import timing from "./soda_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_SODA = timing.scenes as { hook: number; kocok: number; tekan: number; serah: number; buka: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];

/* ------------------------------------------------------------------ */
/* Camera: a shot dollies p0 -> p1, optionally swinging through pm     */
/* (push in, then pull back out).                                       */
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

const SKY = "linear-gradient(#35407f 0%, #8a5f9a 28%, #ff9a62 56%, #ffd9a0 78%, #ffe9c4 100%)";
const Stage: React.FC<{ cam: Cam; bg?: string; shadows?: boolean; children: React.ReactNode }> = ({ cam, bg = SKY, shadows = false, children }) => {
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
/* UI: tiny captions in the safe area, tags, gauge, cinematic grade      */
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

const Tag: React.FC<{ label: string; from: number; to: number; color?: string; top?: number }> = ({ label, from, to, color = "#ffd23f", top = 190 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 60, padding: "10px 24px", borderRadius: 16, background: "rgba(16,16,34,0.88)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, letterSpacing: 2, color: "white", opacity: s * out, transform: `translateX(${(1 - s) * -90}px)`, boxShadow: `0 8px 30px ${color}55` }}>
      <span style={{ color }}>● </span>
      {label}
    </div>
  );
};

/** Pressure gauge: the abstract made visible. */
const Gauge: React.FC<{ value: number; from: number; to: number }> = ({ value, from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 13 } });
  const ang = -90 + 180 * cl(value) + Math.sin(frame * 1.7) * 3 * value;
  const arc = (a0: number, a1: number, col: string) => {
    const r = 92;
    const p = (a: number) => [120 + r * Math.cos(((a - 180) * Math.PI) / 180), 120 + r * Math.sin(((a - 180) * Math.PI) / 180)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return <path d={`M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`} stroke={col} strokeWidth={22} fill="none" strokeLinecap="butt" />;
  };
  return (
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
        <text x="120" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="19" fill="#fff" letterSpacing="2">TEKANAN</text>
      </svg>
    </div>
  );
};

/** Warm cinematic grade: sun bloom, haze, vignette, shade under captions. */
const Look: React.FC<{ warm?: number; flash?: number }> = ({ warm = 1, flash = 0 }) => (
  <>
    <AbsoluteFill style={{ mixBlendMode: "soft-light", opacity: warm, background: "linear-gradient(#ffb36b99, #ff7a3d55)" }} />
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.35 * warm, background: "radial-gradient(ellipse at 18% 22%, rgba(255,230,170,0.9) 0%, rgba(255,200,120,0) 46%)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(30,10,10,0.5) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(20,8,8,0) 62%, rgba(20,8,8,0.55) 86%, rgba(20,8,8,0.7) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ background: "white", opacity: flash }} />}
  </>
);

/* ------------------------------------------------------------------ */
/* Characters                                                            */
/* ------------------------------------------------------------------ */
const yawTo = (x: number, z: number, cam: Cam) => Math.max(-0.6, Math.min(0.6, Math.atan2(cam.pos[0] - x, cam.pos[2] - z) * 0.8));
const DODI_X = -0.9;
const RIZKY_X = 1.0;
const dodiBase: ToonParams = { expr: "smirk", shirt: "#2a9d8f", pants: "#3a3a5a", hat: "cap", hatColor: "#e63946", seed: 3 };
const rizkyBase: ToonParams = { expr: "neutral", shirt: "#f4c430", pants: "#2b2d42", hat: "bucket", hatColor: "#4a7c59", seed: 8 };

const Actors: React.FC<{ cam: Cam; dodi: ToonParams; rizky?: ToonParams; dx?: number; rx?: number }> = ({ cam, dodi, rizky, dx = DODI_X, rx = RIZKY_X }) => (
  <>
    <ToonSprite position={[dx, 0, 0]} yaw={yawTo(dx, 0, cam)} params={dodi} />
    {rizky && <ToonSprite position={[rx, 0, -0.15]} yaw={yawTo(rx, -0.15, cam)} params={rizky} flip />}
  </>
);

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneSodaHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shake = EV("hook.shake");
  const smirk = EV("hook.smirk");
  const dive = EV("hook.dive");
  const osc = Math.sin(f * 1.35);
  const shaking = f < smirk + 6;
  const cam = shotCam(f, [
    { to: smirk, p0: [-0.2, 1.6, 6.0], l0: [-0.7, 1.15, 0], p1: [-0.6, 1.5, 4.6], l1: [-0.7, 1.1, 0], fov: 40 },
    { to: dive, p0: [-0.3, 1.45, 3.9], l0: [-0.75, 1.45, 0], pm: [-0.5, 1.45, 3.4], p1: [1.3, 1.8, 6.4], l1: [0.3, 1.2, 0], fov: 34, fov1: 42 },
    { to: 9999, p0: [-0.6, 1.1, 3.6], l0: [-0.4, 0.95, 0], p1: [-0.35, 0.95, 1.4], l1: [-0.35, 0.95, 0], fov: 40, shake: 0.03 },
  ]);
  const dodi: ToonParams = shaking
    ? { ...dodiBase, expr: f > smirk - 4 ? "smirk" : "angry", armR: [0.5 + osc * 0.25, -2.7 + osc * 0.35], armL: [-0.55, 2.1 - osc * 0.2], prop: "can", canShake: 1, squash: Math.abs(osc) * 0.5, lean: osc * 0.2, sweat: 0 }
    : { ...dodiBase, expr: "smirk", armR: [0.45, -2.6], armL: [-0.55, 2.0], prop: "can", canShake: 0.1 };
  const rizky: ToonParams = { ...rizkyBase, expr: "neutral", armR: [0.3, 0.1], armL: [-0.7, 2.2], look: -0.6, squash: Math.sin(t * 2) * 0.1 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} shadows>
        <DesertLights />
        <Desert t={t} />
        <Actors cam={cam} dodi={dodi} rizky={rizky} />
      </Stage>
      <Look />
      <Tag label="KALENG SODA" from={0} to={smirk + 30} color="#ff4d4d" />
      <Caps ids={["hook_1", "hook_2", "hook_3"]} hl={["mengocok", "sekuat", "Rizky", "masuk", "kalengnya"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. KOCOK: inside the can, CO2 wakes up                               */
/* ================================================================== */
export const SceneSodaKocok: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shakeF = EV("kocok.shake");
  const nuclF = EV("kocok.nucl");
  const plead = EV("kocok.plead");
  const nuc = interpolate(f, [nuclF, nuclF + 50], [0, 1], clamp);
  const shakeAmt = f < shakeF ? 0 : f < plead ? 1 : 0.35;
  const cam = shotCam(f, [
    { to: shakeF, p0: [0, 0.6, 3.0], l0: [0, 1.2, -1], p1: [0.4, 1.1, 1.9], l1: [0, 1.4, -1], fov: 70 },
    { to: plead, p0: [-0.2, 1.0, 2.4], l0: [0, 1.1, 0.4], pm: [0.4, 1.3, 1.4], p1: [0, 1.4, 3.0], l1: [0, 1.2, 0.6], fov: 64, shake: 0.1 },
    { to: 9999, p0: [0.2, 0.9, 1.9], l0: [-0.4, 0.5, 1.2], p1: [0, 1.3, 3.2], l1: [0, 1.2, 0.8], fov: 56, shake: 0.05 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2a0e04">
        <CanInterior t={t} shake={shakeAmt} nucleate={nuc} faces={f >= shakeF - 10} />
      </Stage>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(30,8,0,0.55) 100%)" }} />
      <Tag label="DI DALAM KALENG" from={2} to={shakeF - 6} color="#ffb45a" />
      <Tag label="GAS CO2" from={shakeF - 4} to={nuclF - 4} color="#fff3d0" />
      <Tag label="GELEMBUNG" from={nuclF} to={plead + 24} color="#7ad0ff" />
      <Caps ids={["kocok_1", "kocok_2", "kocok_3", "kocok_4"]} hl={["gas", "larut", "tenang", "dikocok", "ribuan", "menempel", "keluar"]} color="#9be8ff" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. TEKAN: pressure builds, the lid strains                           */
/* ================================================================== */
export const SceneSodaTekan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const lidF = EV("tekan.lid");
  const maxF = EV("tekan.max");
  const press = interpolate(f, [4, maxF], [0.12, 1], clamp);
  const strain = interpolate(f, [lidF, maxF], [0.1, 1], clamp);
  const cam = shotCam(f, [
    { to: lidF, p0: [0, 0.2, 2.8], l0: [0, 1.6, 0], p1: [0, 1.0, 1.7], l1: [0, 4.0, 0], fov: 66 },
    { to: maxF, p0: [1.6, 2.6, 2.4], l0: [0, 4.1, 0], p1: [0.8, 3.3, 1.7], l1: [0, 4.1, 0], fov: 50, shake: 0.05 },
    { to: 9999, p0: [0.8, 3.3, 1.7], l0: [0, 4.1, 0], p1: [0, 1.4, 4.4], l1: [0, 3.0, 0], fov: 50, fov1: 64, shake: 0.1 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2a0e04">
        <CanInterior t={t} shake={0.25 + 0.5 * strain} nucleate={1} lidStrain={strain} rush={0.04 * Math.abs(Math.sin(t * 9)) * press} />
      </Stage>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(60,8,0,0.55) 100%)" }} />
      <Tag label="DALAM KALENG" from={2} to={50} color="#ffb45a" />
      <Gauge value={press} from={4} to={9999} />
      <Caps ids={["tekan_1", "tekan_2"]} hl={["Makin", "tinggi", "tekanannya", "menahan", "mudik"]} color="#ff9a6a" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. SERAH: neither wants to open it                                   */
/* ================================================================== */
export const SceneSodaSerah: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const give = EV("serah.give");
  const refuse = EV("serah.refuse");
  const say = EV("serah.say");
  const sweatF = EV("serah.sweat");
  const cam = shotCam(f, [
    { to: refuse, p0: [0.0, 1.5, 6.6], l0: [0, 1.1, 0], p1: [0.0, 1.45, 5.5], l1: [0, 1.1, 0], fov: 42 },
    { to: say, p0: [-0.3, 1.45, 3.8], l0: [0.9, 1.35, 0], pm: [0.2, 1.5, 3.4], p1: [0.6, 1.5, 5.8], l1: [0.1, 1.2, 0], fov: 36, fov1: 42 },
    { to: 9999, p0: [-2.0, 1.4, 3.9], l0: [-0.9, 1.35, 0], p1: [-0.6, 1.5, 5.8], l1: [-0.1, 1.2, 0], fov: 36, fov1: 42 },
  ]);
  const ext = sm(cl((f - give + 10) / 14));
  const back = sm(cl((f - refuse - 14) / 12)) * (f > refuse + 8 ? 1 : 0);
  const dodi: ToonParams = {
    ...dodiBase,
    expr: f > sweatF - 6 ? "nervous" : f > refuse ? "worried" : "smirk",
    armR: [0.45 + 0.85 * ext, -2.6 + 2.5 * ext - 0.5 * back],
    armL: [-0.55, 2.0],
    prop: "can",
    canShake: f > sweatF ? 0.3 : 0.05,
    sweat: f > refuse + 8 ? Math.min(1, (f - refuse - 8) / 20) : 0,
    look: 0.6,
    lean: -0.05 + 0.1 * ext,
  };
  const noWave = f > refuse - 4 && f < say ? Math.sin(f * 0.9) * 0.25 : 0;
  const rizky: ToonParams = {
    ...rizkyBase,
    expr: f > say ? "smirk" : f > refuse - 6 ? "surprised" : "neutral",
    armR: f > refuse - 6 && f < say ? [2.4 + noWave, 0.4] : f >= say ? [1.9, 0.2] : [0.3, 0.1],
    armL: f > refuse - 6 ? [-2.4 + noWave, -0.4] : [-0.7, 2.2],
    look: -0.7,
    squash: f > say ? Math.sin(f * 0.5) * 0.15 : 0,
  };
  return (
    <AbsoluteFill>
      <Stage cam={cam} shadows>
        <DesertLights />
        <Desert t={t} />
        <Actors cam={cam} dodi={dodi} rizky={rizky} dx={-0.7} rx={0.8} />
      </Stage>
      <Look />
      <Caps ids={["serah_1", "serah_2", "serah_3", "serah_4"]} hl={["menyodorkan", "menolak", "balik", "Kamu", "duluan", "gugup", "lagi"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. BUKA: tab, hiss, bubbles stampede, foam hits Dodi                 */
/* ================================================================== */
export const SceneSodaBuka: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const tab = EV("buka.tab");
  const pssh = EV("buka.pssh");
  const rush = EV("buka.rush");
  const hit = EV("buka.hit");
  const nervous = Math.sin(f * 2.6) * 0.04;

  // A: nervous Dodi, then the tab macro
  if (f < tab - 6) {
    const cam = shotCam(f, [{ to: 9999, p0: [-0.9, 1.35, 5.2], l0: [-0.5, 1.1, 0], p1: [-0.5, 1.1, 3.6], l1: [-0.35, 1.0, 0], fov: 38 }]);
    const dodi: ToonParams = { ...dodiBase, expr: "nervous", armR: [0.45, -2.6 + nervous], armL: [-0.55, 2.0], prop: "can", canShake: 0.25, sweat: 1, look: 0.2 };
    return (
      <AbsoluteFill>
        <Stage cam={cam} shadows>
          <DesertLights />
          <Desert t={t} />
          <Actors cam={cam} dodi={dodi} rizky={{ ...rizkyBase, expr: "smirk", look: -0.6, armR: [1.9, 0.2], armL: [-0.7, 2.2] }} dx={-0.7} rx={0.9} />
        </Stage>
        <Look />
        <Tag label="TARIK CINCIN" from={tab - 40} to={tab} color="#ffd23f" />
        <Caps ids={["buka_1"]} hl={["menarik", "cincinnya"]} />
      </AbsoluteFill>
    );
  }
  if (f < pssh) {
    const k = sm(cl((f - (tab - 6)) / 14));
    const cam = shotCam(f, [{ to: 9999, p0: [0.0, 1.9, 3.8], l0: [0, 1.2, 0], p1: [0.0, 1.6, 2.7], l1: [0, 1.15, 0], fov: 38, shake: 0.02 }]);
    return (
      <AbsoluteFill>
        <Stage cam={cam}>
          <DesertLights />
          <Desert t={t} />
          <CanTop position={[0, 1.15, 0.2]} tab={k} t={t} scale={0.9} seep={f > pssh - 6 ? 1 : 0} />
        </Stage>
        <Look />
        <Caps ids={["buka_1"]} hl={["menarik", "cincinnya"]} />
      </AbsoluteFill>
    );
  }
  if (f < hit - 4) {
    const rushK = interpolate(f, [rush - 10, hit - 6], [0, 1], clamp);
    const cam = shotCam(f, [{ to: 9999, p0: [0, 0.0, 2.6], l0: [0, 2.4, 0], p1: [0, 3.4, 1.4], l1: [0, 6.0, 0], fov: 72, shake: 0.12 }]);
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="#2a0e04">
          <CanInterior t={t} shake={0.9} nucleate={1} rush={rushK} lidStrain={0} />
        </Stage>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(30,8,0,0.5) 100%)" }} />
        <Tag label="TEKANAN TURUN" from={pssh} to={hit - 4} color="#7ad0ff" />
        <Caps ids={["buka_2"]} hl={["mendadak", "berebut", "keluar", "sodanya"]} color="#9be8ff" />
      </AbsoluteFill>
    );
  }
  // C: the eruption hits Dodi
  const u = f - hit;
  const foamK = sm(cl(u / 14));
  const dodi: ToonParams = {
    ...dodiBase,
    expr: "surprised",
    armR: [0.9 + Math.sin(f * 1.2) * 0.2, -1.8],
    armL: [-2.3, 0.4],
    prop: "can",
    canShake: 0.8,
    foam: foamK,
    wet: foamK,
    sweat: 0,
    squash: Math.sin(u * 1.5) * 0.3,
    lean: -0.3 * foamK,
  };
  const rizky: ToonParams = { ...rizkyBase, expr: u > 20 ? "laugh" : "surprised", armR: [1.8, 0.3], armL: [-2.4, -0.3], squash: Math.abs(Math.sin(u * 0.7)) * 0.4, look: -0.5 };
  const cam = shotCam(f, [{ to: 9999, p0: [0.9, 1.4, 5.0], l0: [-0.2, 1.2, 0], pm: [-0.2, 1.5, 3.9], p1: [1.4, 1.7, 6.2], l1: [0.1, 1.2, 0], fov: 40, shake: u < 14 ? 0.08 : 0.02 }]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} shadows>
        <DesertLights />
        <Desert t={t} />
        <Actors cam={cam} dodi={dodi} rizky={rizky} dx={-0.7} rx={0.9} />
        <Foam origin={[-0.3, 1.0, 0.3]} target={[-0.7, 1.4, 0.5]} f={u} count={70} />
      </Stage>
      <Look flash={u < 3 ? 0.35 * (1 - u / 3) : 0} />
      <Caps ids={["buka_2"]} hl={["mendadak", "berebut", "keluar", "sodanya"]} color="#9be8ff" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. AKHIR                                                             */
/* ================================================================== */
export const SceneSodaAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const { fps } = useVideoConfig();
  const tipF = EV("akhir.tip");
  const againF = EV("akhir.again");
  const noF = EV("akhir.no");
  const card = EV("akhir.card");
  const cam = shotCam(f, [
    { to: tipF, p0: [0.2, 1.5, 6.8], l0: [0.1, 1.15, 0], p1: [0.1, 1.45, 5.6], l1: [0, 1.15, 0], fov: 42 },
    { to: againF, p0: [-0.9, 1.4, 4.6], l0: [-0.7, 1.2, 0], p1: [-0.4, 1.4, 5.8], l1: [0, 1.2, 0], fov: 40 },
    { to: noF, p0: [1.4, 1.5, 4.4], l0: [0.9, 1.3, 0], p1: [0.8, 1.5, 5.8], l1: [0, 1.2, 0], fov: 38, fov1: 42 },
    { to: 9999, p0: [-0.2, 1.4, 3.7], l0: [-0.7, 1.35, 0], pm: [-0.6, 1.4, 3.3], p1: [0.4, 1.6, 6.2], l1: [0, 1.2, 0], fov: 36, fov1: 44 },
  ]);
  const dodi: ToonParams = { ...dodiBase, expr: f > noF ? "worried" : "angry", armR: [0.3, 0.1], armL: [-0.3, -0.1], foam: 1, wet: 1, sweat: 0, lean: Math.sin(f * 0.2) * 0.03, look: 0.5 };
  const rizky: ToonParams = { ...rizkyBase, expr: f > againF + 20 ? "smirk" : "laugh", armR: [1.1, -0.2], armL: [-0.9, 0.3], squash: f < againF ? Math.abs(Math.sin(f * 0.9)) * 0.45 : 0, look: -0.5 };
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <Stage cam={cam} shadows>
        <DesertLights />
        <Desert t={t} />
        <Actors cam={cam} dodi={dodi} rizky={rizky} dx={-0.7} rx={0.9} />
      </Stage>
      <Look />
      <Tag label="TIPS" from={tipF} to={againF - 8} color="#7ad0ff" />
      <Caps ids={["akhir_1", "akhir_2", "akhir_3", "akhir_4"]} hl={["basah", "tertawa", "aman", "diamkan", "lagi", "Jangan"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(30,10,8,${0.62 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, width: 760 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 124, lineHeight: 1.05, color: "#ffd23f", WebkitTextStroke: "8px #1a0a0a", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a0a0a" }}>JANGAN BUKA DULU</div>
            <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: "white", lineHeight: 1.25 }}>Habis dikocok? Diamkan beberapa menit, biar gelembungnya larut lagi.</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

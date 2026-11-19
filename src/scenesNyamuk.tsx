import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "./nyamuk_timing.json";
import { Caption, FONT_BODY, FONT_TITLE, GOLD, Kicker, SceneFade } from "./ui";
import { Bentol, Coil, Fan, Guling, INK, LyingBimo, Mosquito, Net, Phone, Pose, Racket, Room, SpeedLines, Smoke, SprayCan, Star, Stick, Zzz, flightPath } from "./stick/draw";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const RED = "#ff3b2f";

export const DURATIONS_NYAMUK = timing.scenes as { hook: number; tampar: number; raket: number; asap: number; senter: number; pagi: number; kelambu: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const capTo = (id: LineId) => LN(id).to + 4;
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/* ------------------------------------------------------------------ */
/* Camera over the SVG world (1080 x 1920). z = zoom, r = roll (deg).  */
/* ------------------------------------------------------------------ */
type Shot = { to: number; f0: [number, number]; z0: number; f1?: [number, number]; z1?: number; r0?: number; r1?: number };
const camAt = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const k = smooth(Math.min(1, Math.max(0, (frame - start) / Math.max(1, Math.min(s.to, start + 500) - start))));
      return { fx: lerp(s.f0[0], (s.f1 ?? s.f0)[0], k), fy: lerp(s.f0[1], (s.f1 ?? s.f0)[1], k), z: lerp(s.z0, s.z1 ?? s.z0, k), r: lerp(s.r0 ?? 0, s.r1 ?? s.r0 ?? 0, k), index: i };
    }
    start = s.to;
  }
  return { fx: 540, fy: 960, z: 1, r: 0, index: 0 };
};
const shakeAt = (frame: number, hits: number[], amp = 20, dur = 12): [number, number] => {
  let dx = 0;
  let dy = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d >= 0 && d < dur) {
      const k = 1 - d / dur;
      dx += Math.sin(d * 2.7) * amp * k;
      dy += Math.cos(d * 3.1) * amp * 0.7 * k;
    }
  }
  return [dx, dy];
};

const World: React.FC<{ cam: { fx: number; fy: number; z: number; r: number }; shake?: [number, number]; children: React.ReactNode }> = ({ cam, shake = [0, 0], children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
    <g transform={`translate(${540 + shake[0]} ${960 + shake[1]}) rotate(${cam.r}) scale(${cam.z}) translate(${-cam.fx} ${-cam.fy})`}>{children}</g>
  </svg>
);

const Chip: React.FC<{ label: string; from: number; to: number; top: number; left?: boolean; color?: string }> = ({ label, from, to, top, left = true, color = GOLD }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: left ? 70 : undefined, right: left ? undefined : 70, padding: "14px 28px", borderRadius: 18, background: "rgba(14,18,36,0.9)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 42, color: "white", letterSpacing: 1.5, opacity: s * out, transform: `translateX(${(1 - s) * (left ? -120 : 120)}px) scale(${0.9 + 0.1 * s})`, boxShadow: `0 10px 36px ${color}55` }}>
      {label}
    </div>
  );
};

/** SVG comic word inside the world (pops, wobbles, fades). */
const Onoma: React.FC<{ frame: number; at: number; x: number; y: number; text: string; size?: number; fill?: string; rot?: number; dur?: number; star?: boolean }> = ({ frame, at, x, y, text, size = 120, fill = "#ffe14d", rot = -8, dur = 40, star = true }) => {
  const { fps } = useVideoConfig();
  if (frame < at || frame > at + dur) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 7, stiffness: 230 } });
  const o = interpolate(frame, [at + dur - 10, at + dur], [1, 0], clamp);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${0.3 + 0.8 * s})`} opacity={o}>
      {star && <Star x={0} y={0} r={size * 1.15} fill={fill} />}
      <text textAnchor="middle" y={size * 0.32} fontFamily="Anton, Impact, sans-serif" fontSize={size} fill="#fff" stroke={INK} strokeWidth={10} paintOrder="stroke" style={{ letterSpacing: 2 }}>
        {text}
      </text>
    </g>
  );
};

const trailFor = (t: number, f: (tt: number) => [number, number, number], n = 9, step = 0.035): [number, number][] =>
  new Array(n).fill(0).map((_, i) => {
    const p = f(t - (n - i) * step);
    return [p[0], p[1]] as [number, number];
  });

const Title: React.FC<{ top: number; l1: string; l2: string; opacity?: number }> = ({ top, l1, l2, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: frame - 4, fps, config: { damping: 13 } });
  const b = spring({ frame: frame - 14, fps, config: { damping: 11 } });
  return (
    <div style={{ position: "absolute", top, width: "100%", textAlign: "center", opacity }}>
      <div style={{ fontFamily: FONT_TITLE, fontSize: 142, lineHeight: 1.04, color: "white", opacity: a, transform: `scale(${1.4 - 0.4 * a})`, WebkitTextStroke: "6px #12121a", paintOrder: "stroke fill", textShadow: "0 10px 0 #12121a" }}>{l1}</div>
      <div style={{ fontFamily: FONT_TITLE, fontSize: 168, lineHeight: 1, color: GOLD, opacity: b, transform: `scale(${1.5 - 0.5 * b})`, WebkitTextStroke: "6px #7a4b00", paintOrder: "stroke fill", textShadow: "0 10px 0 #7a4b00" }}>{l2}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Bimo standing next to the bed (faces left)                           */
/* ------------------------------------------------------------------ */
const BIMO_S = 1.15;
const BX = 740;
const BY = 1400 - 196 * BIMO_S; // hip
const HEAD_W: [number, number] = [BX, BY - 230 * BIMO_S];

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneNyamukHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const buzz = EV("hook.buzz");
  const look = EV("hook.look");
  const jetF = EV("hook.jet");
  const awake = frame >= buzz + 6;
  const expr = !awake ? "sleepy" : frame < look + 16 ? "surprised" : "angry";
  const cam = camAt(frame, [
    { to: buzz - 4, f0: [520, 980], z0: 1.0, f1: [450, 1060], z1: 1.18 },
    { to: LN("hook_3").from - 4, f0: [230, 1130], z0: 2.7, f1: [260, 1120], z1: 2.45 },
    { to: 9999, f0: [430, 1030], z0: 1.35, f1: [520, 1020], z1: 1.15 },
  ]);
  const f = (tt: number): [number, number, number] => {
    const p = flightPath(tt, 330, 1050, 250, 110, 1, 1);
    return p;
  };
  const enter = interpolate(frame, [buzz, buzz + 22], [0, 1], { ...clamp, easing: ease });
  const [mx0, my0, dir] = f(t);
  const mx = lerp(1350, mx0, enter);
  const my = lerp(900, my0, enter);
  const jet = interpolate(frame, [jetF, jetF + 44], [0, 1], clamp);
  const sh = shakeAt(frame, [buzz + 2], 14, 14);
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam} shake={sh}>
        <Room mode="night" clockMin={60} t={t} />
        <LyingBimo expr={expr} t={t} />
        {!awake && <Zzz x={250} y={1010} t={t} />}
        {frame >= buzz && <Mosquito x={mx} y={my} s={2.2} t={t} flip={dir < 0} trail={trailFor(t, f).map((p) => [lerp(1350, p[0], enter), p[1]] as [number, number])} />}
        {frame >= buzz + 4 && <SpeedLines x={mx} y={my} r0={70} r1={130} n={10} seed={t * 3} />}
        {jet > 0 && jet < 1 && (
          <g transform={`translate(${lerp(1300, -400, jet)} 760) scale(2)`}>
            <path d="M -130 20 L 90 0 L 130 -6 L 90 -22 L -60 -22 Z" fill="#c9d6e8" stroke={INK} strokeWidth={5} />
            <path d="M -20 -20 L 30 -70 L 60 -20 Z" fill="#9fb2cc" stroke={INK} strokeWidth={5} />
            <path d="M -20 4 L 40 56 L 70 6 Z" fill="#9fb2cc" stroke={INK} strokeWidth={5} />
            <path d="M -130 20 L -150 -34 L -100 -14 Z" fill="#e63946" stroke={INK} strokeWidth={5} />
            <line x1={-150} y1={-6} x2={-420} y2={-6} stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.7} />
          </g>
        )}
      </World>
      {frame >= buzz && frame < buzz + 70 && (
        <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center", fontFamily: FONT_TITLE, fontSize: 190, color: "#e8f4ff", WebkitTextStroke: "7px #12121a", paintOrder: "stroke fill", transform: `rotate(${Math.sin(frame * 3) * 4 - 4}deg) scale(${0.6 + 0.4 * Math.min(1, (frame - buzz) / 6)})`, opacity: interpolate(frame, [buzz + 56, buzz + 70], [1, 0], clamp) }}>
          NGIIING~
        </div>
      )}
      <Title top={215} l1="PERANG LAWAN" l2="NYAMUK" opacity={interpolate(frame, [buzz - 20, buzz - 2], [1, 0], clamp)} />
      <Chip label="01:00 DINI HARI" from={6} to={buzz - 4} top={470} left />
      <Caption text="Jam satu malam. Bimo baru mau TIDUR, tiba-tiba..." from={LN("hook_1").from} to={capTo("hook_1")} highlight={["TIDUR"]} top={1290} size={64} />
      <Caption text="Satu nyamuk. Cuma satu. Tapi suaranya kayak PESAWAT JET" from={LN("hook_3").from} to={capTo("hook_3")} highlight={["PESAWAT", "JET"]} highlightColor={RED} top={1290} size={62} />
      <SceneFade duration={DURATIONS_NYAMUK.hook} inFrames={8} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. TAMPAR                                                            */
/* ================================================================== */
const slapArm = (frame: number, hits: number[]): [number, number] => {
  let a: [number, number] = [10, -14];
  for (const h of hits) {
    if (frame >= h - 12 && frame < h - 3) {
      const k = smooth((frame - (h - 12)) / 9);
      a = [lerp(10, 135, k), lerp(-14, 60, k)];
    } else if (frame >= h - 3 && frame < h + 1) {
      const k = (frame - (h - 3)) / 4;
      a = [lerp(135, 100, k), lerp(60, 105, k)];
    } else if (frame >= h + 1 && frame < h + 9) {
      a = [100, 105];
    } else if (frame >= h + 9 && frame < h + 20) {
      const k = smooth((frame - (h + 9)) / 11);
      a = [lerp(100, 10, k), lerp(105, -14, k)];
    }
  }
  return a;
};

export const SceneNyamukTampar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const hits = [EV("tampar.slap1"), EV("tampar.slap2"), EV("tampar.slap3"), EV("tampar.slap4")];
  const aR = slapArm(frame, hits);
  const sinceHit = Math.min(...hits.map((h) => (frame >= h ? frame - h : 999)));
  const hitNow = sinceHit < 12;
  const cheek = frame >= hits[0] ? Math.min(1, 0.4 + 0.2 * hits.filter((h) => frame >= h).length) : 0;
  const expr = hitNow ? "pain" : frame >= EV("tampar.chill") ? "tired" : "angry";
  const hOff = hitNow ? -22 * Math.max(0, 1 - sinceHit / 10) : 0;
  const pose: Pose = { t: hitNow ? 6 : 0, h: hOff, aR, aL: [-8, -10] };
  const orbit = (tt: number): [number, number, number] => {
    // circles around Bimo's head, scooting away right after each slap
    const near = hits.some((h) => tt * 30 >= h - 4 && tt * 30 < h + 10);
    const p = flightPath(tt, HEAD_W[0] - 20, HEAD_W[1] - 40, near ? 330 : 190, near ? 170 : 110, 1.1, 0.5);
    return p;
  };
  const [mx, my, dir] = orbit(t);
  const chill = frame >= EV("tampar.chill");
  const cam = camAt(frame, [
    { to: EV("tampar.slap1") - 14, f0: [700, 1010], z0: 1.15, f1: [690, 980], z1: 1.35 },
    { to: EV("tampar.slap1") + 26, f0: [HEAD_W[0] - 10, HEAD_W[1] + 10], z0: 2.6, f1: [HEAD_W[0] - 20, HEAD_W[1] + 4], z1: 2.8, r0: 3, r1: -2 },
    { to: EV("tampar.slap2") - 10, f0: [620, 1000], z0: 1.2, r0: -3, f1: [660, 1000], z1: 1.35 },
    { to: EV("tampar.slap3") - 8, f0: [HEAD_W[0] - 60, HEAD_W[1] + 20], z0: 2.0, r0: 4, r1: 1 },
    { to: EV("tampar.slap4") - 8, f0: [560, 1040], z0: 1.5, r0: -4, r1: -1 },
    { to: EV("tampar.chill") - 2, f0: [HEAD_W[0] - 30, HEAD_W[1]], z0: 2.2, r0: 3, r1: 0 },
    { to: 9999, f0: [HEAD_W[0] - 20, HEAD_W[1] + 20], z0: 1.8, f1: [HEAD_W[0], HEAD_W[1] + 70], z1: 1.5 },
  ]);
  const sh = shakeAt(frame, hits, 24, 12);
  const mpos: [number, number] = chill ? [HEAD_W[0] + 18, HEAD_W[1] - 98] : [mx, my];
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam} shake={sh}>
        <Room mode="night" clockMin={62} t={t} />
        <Stick x={BX} y={BY} s={BIMO_S} flip pose={pose} expr={expr} cheek={cheek} />
        <Mosquito x={mpos[0]} y={mpos[1]} s={chill ? 1.6 : 2.0} t={t} flip={chill ? true : dir < 0} mood={chill ? "smug" : "normal"} wings={!chill} trail={chill ? undefined : trailFor(t, orbit)} />
        {hits.map((h, i) => (
          <Onoma key={i} frame={frame} at={h} x={HEAD_W[0] - 130} y={HEAD_W[1] - 20 + (i % 2) * 40} text="PLAK!" size={i === 0 ? 120 : 96} rot={-10 + i * 7} dur={24} />
        ))}
      </World>
      <Chip label="TAMPARAN #1" from={EV("tampar.slap1") - 6} to={EV("tampar.slap2") - 14} top={470} left />
      <Chip label="#2 ... #3 ... #4" from={EV("tampar.slap2") - 6} to={EV("tampar.chill") + 12} top={470} left={false} />
      <Caption text="Bimo menampar ke arah suara. PLAK! Nyamuknya selamat, pipinya yang kena" from={LN("tampar_1a").from} to={capTo("tampar_1c")} highlight={["PLAK", "SELAMAT", "PIPINYA"]} highlightColor={RED} top={1290} size={58} />
      <Caption text="Tamparan kedua, ketiga, keempat. Nyamuknya masih terbang SANTAI" from={LN("tampar_2").from} to={capTo("tampar_2")} highlight={["SANTAI"]} top={1290} size={58} />
      <SceneFade duration={DURATIONS_NYAMUK.tampar} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. RAKET                                                             */
/* ================================================================== */
export const SceneNyamukRaket: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const show = EV("raket.show");
  const swing = EV("raket.swing");
  const zap = EV("raket.zap");
  const pop = frame >= show ? spring({ frame: frame - show, fps, config: { damping: 8 } }) : 0;
  // arm: raised racket -> big swing -> hits the upright bolster
  const k = smooth(Math.min(1, Math.max(0, (frame - swing) / Math.max(1, zap - swing))));
  const aR: [number, number] = frame < show ? [8, -10] : frame < swing ? [lerp(8, 160, smooth(Math.min(1, pop))), 0] : [lerp(160, 82, k), lerp(0, -8, k)];
  const hit = frame >= zap;
  const since = frame - zap;
  const expr = hit ? "surprised" : frame >= show ? "angry" : "tired";
  const dodge = (tt: number): [number, number, number] => {
    if (tt * 30 >= swing - 6) {
      const p = flightPath(tt, 400, 760, 120, 90, 1.6, 2);
      return p;
    }
    return flightPath(tt, 560, 960, 160, 100, 1.2, 1);
  };
  const [mx, my, dir] = dodge(t);
  const cam = camAt(frame, [
    { to: show + 28, f0: [660, 1020], z0: 1.2, f1: [680, 1000], z1: 1.35 },
    { to: swing + 8, f0: [520, 940], z0: 1.5, f1: [470, 930], z1: 1.7 },
    { to: zap - 4, f0: [480, 1020], z0: 1.45, r0: -4, r1: 3 },
    { to: 9999, f0: [500, 1060], z0: 1.9, f1: [520, 1040], z1: 1.5 },
  ]);
  const sh = shakeAt(frame, [zap], 30, 16);
  const scorch = hit ? Math.min(1, since / 14) : 0;
  const gShake = hit && since < 18 ? Math.sin(since * 2.2) * 16 * (1 - since / 18) : 0;
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam} shake={sh}>
        <Room mode="night" clockMin={74} t={t} />
        <Guling x={520} y={1090} vertical scorch={scorch} shake={gShake} />
        <Stick x={BX} y={BY} s={BIMO_S} flip pose={{ aR, aL: [-8, -10], t: frame >= swing && !hit ? 8 : 0 }} expr={expr} holdR={frame >= show ? () => <g transform={`scale(${0.5 + 0.5 * Math.min(1, pop)} ${-(0.5 + 0.5 * Math.min(1, pop))})`}><Racket on t={t} /></g> : undefined} />
        <Mosquito x={mx} y={my} s={2.0} t={t} flip={dir < 0} mood={hit ? "smug" : "normal"} />
        {hit && (
          <g>
            <Smoke x={520} y={1050} t={t} amount={Math.min(0.7, since / 20)} spread={60} color="#555" />
            <Star x={500} y={1010} r={90 * Math.max(0, 1 - since / 20)} fill="#fff6a0" rot={t * 60} spikes={9} />
          </g>
        )}
        <Onoma frame={frame} at={zap} x={470} y={920} text="ZZZT!" size={110} rot={-8} dur={30} />
      </World>
      <Chip label="RAKET LISTRIK" from={show} to={swing + 20} top={470} left={false} color="#ffe14d" />
      <Chip label="SALAH SASARAN" from={zap + 4} to={capTo("raket_2")} top={470} left color={RED} />
      <Caption text="Bimo mengeluarkan senjata pamungkas, RAKET LISTRIK" from={LN("raket_1").from} to={capTo("raket_1")} highlight={["RAKET", "LISTRIK"]} highlightColor="#ffe14d" top={1290} size={62} />
      <Caption text="Nyamuknya menghindar, raketnya malah menyetrum GULING kesayangan" from={LN("raket_2").from} to={capTo("raket_2")} highlight={["MENGHINDAR", "GULING"]} highlightColor={RED} top={1290} size={58} />
      <SceneFade duration={DURATIONS_NYAMUK.raket} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. ASAP                                                              */
/* ================================================================== */
export const SceneNyamukAsap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const coil = EV("asap.coil");
  const fan = EV("asap.fan");
  const spray = EV("asap.spray");
  const smoke = EV("asap.smoke");
  const cough = EV("asap.cough");
  const smokeAmt = interpolate(frame, [coil, smoke + 40], [0, 1], clamp);
  const spraying = frame >= spray && frame < spray + 40;
  const coughing = frame >= cough - 6;
  const coughShake = coughing ? Math.sin(frame * 1.9) * 7 : 0;
  const sprayA = interpolate(frame, [spray - 8, spray], [0, 1], clamp);
  const aR: [number, number] = coughing ? [100, 105] : [lerp(8, 96, smooth(sprayA)), -10];
  const cam = camAt(frame, [
    { to: fan - 8, f0: [330, 1290], z0: 2.2, f1: [360, 1240], z1: 1.9 },
    { to: spray - 6, f0: [800, 1140], z0: 1.7, f1: [840, 1120], z1: 1.5 },
    { to: smoke + 24, f0: [640, 1040], z0: 1.4, f1: [600, 1020], z1: 1.25 },
    { to: cough + 40, f0: [HEAD_W[0] - 20, HEAD_W[1] + 10], z0: 2.1, f1: [HEAD_W[0] - 20, HEAD_W[1]], z1: 2.3 },
    { to: 9999, f0: [850, 1090], z0: 2.7, f1: [860, 1080], z1: 2.4 },
  ]);
  const perch: [number, number] = [868, 1058];
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam} shake={[coughShake, 0]}>
        <Room mode="night" clockMin={110} t={t} lamp />
        <Coil x={300} y={1392} t={t} on={frame >= coil} />
        {frame >= coil && <Smoke x={300} y={1370} t={t} amount={Math.min(1, smokeAmt * 1.3)} spread={140} color="#d6d9df" />}
        <Fan x={900} y={1250} t={t} on={frame >= fan} />
        <Stick
          x={BX - 80}
          y={BY}
          s={BIMO_S}
          flip
          pose={{ aR, aL: coughing ? [20, 80] : [-8, -10], t: coughing ? 10 + Math.sin(frame * 1.9) * 3 : 0 }}
          expr={coughing ? "cough" : spraying ? "angry" : "neutral"}
          holdR={() => (
            <g transform="scale(0.7 -0.7)">
              <SprayCan />
            </g>
          )}
        />
        {spraying && (
          <g opacity={0.8}>
            {new Array(10).fill(0).map((_, i) => {
              const life = (frame - spray + i * 2) % 40;
              return <circle key={i} cx={BX - 80 - 190 - life * 6 - i * 10} cy={BY - 150 + (i % 3) * 14} r={20 + life * 1.6} fill="#fff" opacity={Math.max(0, 0.7 - life / 40)} />;
            })}
          </g>
        )}
        <Mosquito x={perch[0]} y={perch[1]} s={1.5} t={t} mood="smug" wings={false} flip />
        <Smoke x={620} y={1380} t={t * 0.8} amount={smokeAmt} spread={380} color="#c7cbd3" />
        <Onoma frame={frame} at={spray} x={520} y={900} text="PSSSHH" size={90} rot={-6} fill="#d9f2ff" dur={34} />
        <Onoma frame={frame} at={cough + 6} x={HEAD_W[0] - 180} y={HEAD_W[1] - 60} text="UHUK!" size={92} rot={8} dur={36} />
      </World>
      <AbsoluteFill style={{ background: "#b9bec7", opacity: smokeAmt * 0.32, mixBlendMode: "screen" }} />
      <Chip label="OBAT NYAMUK" from={coil} to={fan - 4} top={470} left />
      <Chip label="KIPAS ANGIN" from={fan} to={spray - 4} top={470} left={false} />
      <Chip label="SEMPROTAN" from={spray} to={smoke + 6} top={470} left color="#ff9f1c" />
      <Caption text="Obat nyamuk, kipas, semprotan, semuanya DINYALAKAN. Kamar penuh ASAP" from={LN("asap_1").from} to={capTo("asap_1")} highlight={["DINYALAKAN", "ASAP"]} highlightColor="#ff9f1c" top={1290} size={58} />
      <Caption text="Nyamuknya baik-baik saja. Yang batuk-batuk justru BIMO" from={LN("asap_2").from} to={capTo("asap_2")} highlight={["BIMO"]} highlightColor={RED} top={1290} size={62} />
      <SceneFade duration={DURATIONS_NYAMUK.asap} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. SENTER                                                            */
/* ================================================================== */
export const SceneNyamukSenter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dark = EV("senter.dark");
  const flash = EV("senter.flash");
  const land = EV("senter.land");
  const slap = EV("senter.slap");
  const crack = EV("senter.crack");
  const isDark = frame >= dark;
  const lightOn = frame >= flash;
  const closeUp = frame >= land - 6;
  const aR: [number, number] = lightOn ? [92, 6] : [8, -10];
  const cone = (tt: number): [number, number, number] => flightPath(tt, 470, 1000, 170, 120, 1.1, 3);
  const [mx, my, dir] = cone(t);
  const handDrop = interpolate(frame, [slap - 8, slap], [-700, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const handUp = frame > slap + 2 ? interpolate(frame, [slap + 6, slap + 24], [0, -900], clamp) : 0;
  const crackAmt = frame >= crack ? interpolate(frame, [crack, crack + 18], [0, 1], clamp) : frame >= slap ? 0.5 : 0;
  const flashW = interpolate(frame, [slap, slap + 2, slap + 9], [0, 0.85, 0], clamp);
  const escape = frame > slap + 10 ? interpolate(frame, [slap + 10, slap + 40], [0, 1], clamp) : 0;
  const cam = camAt(frame, [
    { to: dark - 2, f0: [540, 1000], z0: 1.1, f1: [560, 1000], z1: 1.25 },
    { to: land - 6, f0: [560, 1040], z0: 1.45, f1: [520, 1030], z1: 1.35 },
    { to: 9999, f0: [540, 960], z0: 1, r0: 0 },
  ]);
  const sh = shakeAt(frame, [slap], 36, 14);
  return (
    <AbsoluteFill style={{ background: "#070b1c" }}>
      {!closeUp ? (
        <World cam={cam}>
          <Room mode={isDark ? "dark" : "night"} clockMin={180} t={t} lamp={!isDark} />
          <Stick x={BX - 60} y={BY} s={BIMO_S} flip pose={{ aR, aL: [-8, -10], t: lightOn ? 4 : 0 }} expr={lightOn ? "angry" : "tired"} holdR={lightOn ? () => <g transform="scale(0.6 -0.6) rotate(180)"><Phone screen="#fffbe0" /></g> : undefined} />
          {lightOn && (
            <polygon points={`${BX - 60 - 200},${BY - 160} ${BX - 60 - 900},${BY - 560} ${BX - 60 - 900},${BY + 220}`} fill="rgba(255,250,200,0.28)" />
          )}
          <Mosquito x={lightOn ? mx : 160} y={lightOn ? my : 700} s={2.0} t={t} flip={dir < 0} trail={lightOn ? trailFor(t, cone) : undefined} />
        </World>
      ) : (
        <World cam={{ fx: 540, fy: 960, z: 1, r: 0 }} shake={sh}>
          <rect x={-100} y={-100} width={1300} height={2200} fill="#070b1c" />
          <g transform="translate(540 1010) scale(5.2)">
            <Phone screen="#eef9ff" crack={crackAmt} />
          </g>
          <g transform={`translate(${lerp(540, 540 + 460 * escape, 1)} ${lerp(930, 930 - 700 * escape, 1)})`}>
            {frame < slap + 4 && <Mosquito x={0} y={0} s={5.2} t={t} mood="smug" wings={false} rot={-6} />}
            {frame >= slap + 10 && <Mosquito x={0} y={0} s={4.2} t={t} mood="smug" rot={-20} />}
          </g>
          {/* giant palm */}
          <g transform={`translate(540 ${480 + handDrop + handUp})`}>
            <ellipse cx={0} cy={0} rx={250} ry={300} fill="#fff" stroke={INK} strokeWidth={14} />
            {[-150, -75, 0, 75, 150].map((fx, i) => (
              <ellipse key={i} cx={fx} cy={-290 - (i === 2 ? 40 : 0)} rx={44} ry={110} fill="#fff" stroke={INK} strokeWidth={12} />
            ))}
          </g>
          {frame >= slap && frame < slap + 12 && <SpeedLines x={540} y={960} r0={300} r1={640} n={18} seed={slap} color="#ffe14d" width={8} />}
          <Onoma frame={frame} at={slap} x={540} y={760} text="PLAK!" size={150} rot={-6} dur={26} />
          {frame >= slap + 14 && <text x={880} y={500} fontFamily="Anton, Impact, sans-serif" fontSize={80} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke" opacity={interpolate(frame, [slap + 14, slap + 24], [0, 1], clamp)}>hihihi~</text>}
        </World>
      )}
      <AbsoluteFill style={{ background: "white", opacity: flashW }} />
      <Chip label="03:00 PAGI" from={4} to={flash - 2} top={470} left />
      <Chip label="SENTER HP = UMPAN" from={flash} to={land + 20} top={470} left={false} color="#fffbe0" />
      <Chip label="LAYAR RETAK" from={crack} to={capTo("senter_2c")} top={470} left color={RED} />
      <Caption text="Jam tiga pagi. Bimo matikan lampu, nyalakan SENTER HP, biar nyamuknya mendekat" from={LN("senter_1").from} to={capTo("senter_1")} highlight={["SENTER"]} highlightColor="#fffbe0" top={1290} size={54} />
      <Caption text="Nyamuk hinggap di layar. Bimo menepuk sekuat tenaga" from={LN("senter_2a").from} to={capTo("senter_2a")} highlight={["HINGGAP", "MENEPUK"]} top={1290} size={60} />
      <Caption text="Layar HP-nya RETAK" from={LN("senter_2c").from} to={capTo("senter_2c")} highlight={["RETAK"]} highlightColor={RED} top={1290} size={76} />
      <SceneFade duration={DURATIONS_NYAMUK.senter} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. PAGI                                                              */
/* ================================================================== */
const BENTOL: [number, number][] = [[-22, 8], [26, -10], [4, 34], [-34, -22], [30, 26], [8, -38], [-12, 22], [36, 4]];
const BODY_BENTOL: [number, number][] = [[330, 1196], [380, 1210], [430, 1190], [480, 1214], [530, 1196], [580, 1212], [620, 1194], [350, 1224], [410, 1226], [470, 1228], [540, 1226], [600, 1228], [300, 1214], [450, 1204], [510, 1202]];
export const SceneNyamukPagi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sleep = EV("pagi.sleep");
  const morning = EV("pagi.morning");
  const bentol = EV("pagi.bentol");
  const silent = EV("pagi.silent");
  const win = EV("pagi.window");
  const isMorning = frame >= morning;
  const nShow = Math.round(interpolate(frame, [bentol, bentol + 70], [0, BENTOL.length], clamp));
  const nBody = Math.round(interpolate(frame, [bentol + 20, bentol + 90], [0, BODY_BENTOL.length], clamp));
  const count = nShow + nBody;
  const cam = camAt(frame, [
    { to: morning - 2, f0: [380, 1120], z0: 1.5, f1: [360, 1130], z1: 1.7 },
    { to: silent - 4, f0: [330, 1150], z0: 1.9, f1: [380, 1170], z1: 1.45 },
    { to: win - 4, f0: [520, 760], z0: 1.2, f1: [700, 780], z1: 1.25 },
    { to: 9999, f0: [850, 690], z0: 2.7, f1: [850, 680], z1: 2.5 },
  ]);
  const swarm = new Array(7).fill(0).map((_, i) => ({ x: lerp(-100 - i * 90, 1050, interpolate(frame, [silent, silent + 120], [0, 1], clamp)), y: 760 + Math.sin(i * 1.3 + t) * 10 + (i % 3) * 22 }));
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam}>
        <Room mode="night" clockMin={200} t={t} />
        {isMorning && <g opacity={interpolate(frame, [morning, morning + 14], [0, 1], clamp)}><Room mode="morning" clockMin={420} t={t} /></g>}
        <LyingBimo expr={frame < bentol ? "sleepy" : count > 8 ? "pain" : "sleepy"} t={t} blanket={isMorning ? "#8fd3ff" : "#6ec6ff"} bentol={BENTOL.slice(0, nShow)} />
        {BODY_BENTOL.slice(0, nBody).map((b, i) => (
          <Bentol key={i} x={b[0]} y={b[1]} r={11} />
        ))}
        {frame < morning && <Zzz x={250} y={1010} t={t} />}
        {frame >= silent && swarm.map((m, i) => <Mosquito key={i} x={m.x} y={m.y} s={0.9} t={t} wings={false} mood="smug" />)}
        {frame >= silent && (
          <text x={540} y={650} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={64} fill="#fff" stroke={INK} strokeWidth={7} paintOrder="stroke" opacity={interpolate(frame, [silent, silent + 14], [0, 1], clamp)}>
            ssst... diam-diam...
          </text>
        )}
        {frame >= win && (
          <g>
            <rect x={760} y={706} width={200} height={26} rx={8} fill="#8a6a42" stroke={INK} strokeWidth={6} />
            <ellipse cx={850} cy={690} rx={50} ry={16} fill="#fff" stroke={INK} strokeWidth={5} />
            <Mosquito x={850} y={664} s={2.2} t={t} mood="sleepy" wings={false} />
            <Zzz x={880} y={640} t={t} size={0.9} />
          </g>
        )}
      </World>
      {count > 0 && frame < win - 4 && (
        <div style={{ position: "absolute", top: 440, right: 60, padding: "12px 28px", background: "rgba(255,90,100,0.95)", border: "4px solid #12121a", borderRadius: 18, fontFamily: FONT_TITLE, fontSize: 84, color: "white", WebkitTextStroke: "3px #12121a", paintOrder: "stroke fill" }}>
          {count} BENTOL
        </div>
      )}
      <Chip label="PAGINYA..." from={morning} to={bentol + 20} top={470} left />
      <Caption text="Akhirnya Bimo menyerah dan tertidur KELELAHAN" from={LN("pagi_1").from} to={capTo("pagi_1")} highlight={["KELELAHAN"]} top={1290} size={62} />
      <Caption text="Paginya, badannya penuh BENTOL. Yang menggigit semalaman bukan si berisik, tapi puluhan nyamuk lain yang DIAM-DIAM" from={LN("pagi_2").from} to={capTo("pagi_2")} highlight={["BENTOL", "DIAM-DIAM"]} highlightColor={RED} top={1250} size={52} />
      <Caption text="Sementara si berisik, tidur NYENYAK di jendela" from={LN("pagi_3").from} to={capTo("pagi_3")} highlight={["NYENYAK"]} top={1290} size={62} />
      <SceneFade duration={DURATIONS_NYAMUK.pagi} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. KELAMBU                                                           */
/* ================================================================== */
export const SceneNyamukKelambu: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const net = EV("kelambu.net");
  const inside = EV("kelambu.inside");
  const nging = EV("kelambu.nging");
  const cardF = EV("kelambu.card");
  const grow = spring({ frame: frame - net, fps, config: { damping: 14 } });
  const awake = frame >= nging + 4;
  const expr = awake ? "surprised" : frame >= net + 20 ? "happy" : "tired";
  const m = (tt: number): [number, number, number] => flightPath(tt, 360, 1090, 150, 50, 0.9, 1);
  const [mx, my, dir] = m(t);
  const cam = camAt(frame, [
    { to: net + 10, f0: [340, 1100], z0: 1.5, f1: [330, 1080], z1: 1.35 },
    { to: inside - 2, f0: [340, 1060], z0: 1.45, f1: [340, 1040], z1: 1.6 },
    { to: nging + 40, f0: [360, 1090], z0: 2.4, f1: [350, 1090], z1: 2.8, r0: 0 },
    { to: 9999, f0: [420, 1080], z0: 1.4, f1: [480, 1040], z1: 1.0 },
  ]);
  const sh = shakeAt(frame, [nging + 4], 16, 12);
  const c1 = spring({ frame: frame - cardF, fps, config: { damping: 12 } });
  const c2 = spring({ frame: frame - cardF - 10, fps, config: { damping: 10, stiffness: 180 } });
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam} shake={sh}>
        <Room mode="night" clockMin={60} t={t} />
        <LyingBimo expr={expr} t={t} />
        {frame >= inside - 20 && <Mosquito x={mx} y={my} s={1.7} t={t} flip={dir < 0} mood="smug" />}
        {frame >= net && <Net grow={grow} />}
        {frame < nging && frame >= net + 30 && <Zzz x={250} y={1010} t={t} />}
        {frame >= nging && frame < nging + 60 && <SpeedLines x={mx} y={my} r0={60} r1={120} n={10} seed={t * 3} />}
      </World>
      {frame >= nging && frame < cardF && (
        <div style={{ position: "absolute", top: 520, width: "100%", textAlign: "center", fontFamily: FONT_TITLE, fontSize: 190, color: "#e8f4ff", WebkitTextStroke: "7px #12121a", paintOrder: "stroke fill", transform: `rotate(${Math.sin(frame * 3) * 4 - 4}deg)`, opacity: interpolate(frame, [cardF - 10, cardF], [1, 0], clamp) }}>
          NGIIING~
        </div>
      )}
      {frame >= cardF && (
        <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1.04, color: "white", opacity: c1, transform: `scale(${1.5 - 0.5 * c1})`, WebkitTextStroke: "6px #12121a", paintOrder: "stroke fill", textShadow: "0 10px 0 #12121a" }}>NYAMUK 1</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 168, lineHeight: 1, color: GOLD, opacity: c2, transform: `scale(${1.7 - 0.7 * c2})`, WebkitTextStroke: "6px #7a4b00", paintOrder: "stroke fill", textShadow: "0 10px 0 #7a4b00" }}>BIMO 0</div>
        </div>
      )}
      {frame < cardF - 8 && <Kicker text="MALAM BERIKUTNYA" from={4} top={235} />}
      <Caption text="Malam berikutnya, Bimo memasang KELAMBU" from={LN("kelambu_1").from} to={capTo("kelambu_1")} highlight={["KELAMBU"]} top={1290} size={66} />
      <Caption text="Tapi si berisik sudah masuk DULUAN" from={LN("kelambu_2").from} to={capTo("kelambu_2")} highlight={["DULUAN"]} highlightColor={RED} top={1290} size={68} />
      <SceneFade duration={DURATIONS_NYAMUK.kelambu} inFrames={0} outFrames={14} />
    </AbsoluteFill>
  );
};

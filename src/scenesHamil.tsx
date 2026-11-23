import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "./hamil_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";
import { INK, Expr, Pose, Star, Stick } from "./stick/draw";
import { belly, hijab, Hormone, pompadour, shades } from "./stick/sehat";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_HAMIL = timing.scenes as { hook: number; mandi: number; klinik: number; tubuh: number; hidung: number; grafik: number; tips: number; siaga: number; bahaya: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const pulse = (f: number, at: number, len = 12) => (f < at || f > at + len ? 0 : Math.sin(((f - at) / len) * Math.PI));

/* ------------------------------------------------------------------ */
/* Camera over the SVG world                                            */
/* ------------------------------------------------------------------ */
type Shot = { to: number; f0: [number, number]; z0: number; f1?: [number, number]; z1?: number; r0?: number; r1?: number };
const camAt = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const k = smooth(cl((frame - start) / Math.max(1, Math.min(s.to, start + 500) - start)));
      return { fx: lerp(s.f0[0], (s.f1 ?? s.f0)[0], k), fy: lerp(s.f0[1], (s.f1 ?? s.f0)[1], k), z: lerp(s.z0, s.z1 ?? s.z0, k), r: lerp(s.r0 ?? 0, s.r1 ?? s.r0 ?? 0, k) };
    }
    start = s.to;
  }
  return { fx: 540, fy: 960, z: 1, r: 0 };
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
const World: React.FC<{ cam: { fx: number; fy: number; z: number; r: number }; shake?: [number, number]; dy?: number; children: React.ReactNode }> = ({ cam, shake = [0, 0], dy = 140, children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
    <g transform={`translate(${540 + shake[0]} ${960 - dy + shake[1]}) rotate(${cam.r}) scale(${cam.z}) translate(${-cam.fx} ${-cam.fy})`}>{children}</g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* UI: tiny synced captions, tags                                        */
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
const Tag: React.FC<{ label: string; from: number; to: number; color?: string; top?: number }> = ({ label, from, to, color = "#ffd23f", top = 200 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 60, padding: "10px 24px", borderRadius: 16, background: "rgba(14,18,36,0.9)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, letterSpacing: 2, color: "white", opacity: s * out, transform: `translateX(${(1 - s) * -90}px)`, boxShadow: `0 8px 30px ${color}55` }}>
      {label}
    </div>
  );
};
const Onoma: React.FC<{ frame: number; at: number; x: number; y: number; text: string; size?: number; fill?: string; rot?: number; dur?: number }> = ({ frame, at, x, y, text, size = 110, fill = "#ffe14d", rot = -8, dur = 36 }) => {
  const { fps } = useVideoConfig();
  if (frame < at || frame > at + dur) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 7, stiffness: 230 } });
  const o = interpolate(frame, [at + dur - 10, at + dur], [1, 0], clamp);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${0.3 + 0.8 * s})`} opacity={o}>
      <Star x={0} y={0} r={size * 1.1} fill={fill} />
      <text textAnchor="middle" y={size * 0.32} fontFamily="Anton, Impact, sans-serif" fontSize={size} fill="#fff" stroke={INK} strokeWidth={10} paintOrder="stroke" style={{ letterSpacing: 2 }}>
        {text}
      </text>
    </g>
  );
};
const Grade: React.FC<{ dark?: number }> = ({ dark = 0 }) => (
  <>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 58%, rgba(10,6,20,0.45) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(10,6,20,0) 66%, rgba(10,6,20,0.55) 88%, rgba(10,6,20,0.7) 100%)" }} />
    {dark > 0 && <AbsoluteFill style={{ background: `rgba(8,10,30,${dark})` }} />}
  </>
);

/* ------------------------------------------------------------------ */
/* Characters + props                                                    */
/* ------------------------------------------------------------------ */
const GROUND = 1400;
const SC = 1.1;
const HIP = GROUND - 196 * SC;
const PINK = "#f48fb1";
const BLUE = "#2d6cdf";
const AH = hijab("#c0529a");
const BH = hijab("#ffffff", "#00000033");
type CP = { x: number; y?: number; flip?: boolean; pose?: Pose; expr?: Expr; holdR?: React.ComponentProps<typeof Stick>["holdR"]; holdL?: React.ComponentProps<typeof Stick>["holdL"]; s?: number; noBelly?: boolean };
const Asti: React.FC<CP> = ({ x, y = HIP, s = SC, noBelly, ...r }) => <Stick x={x} y={y} s={s} color={PINK} tuft={false} headBack={AH.back} headFront={AH.front} bodyFront={noBelly ? undefined : belly(PINK)} {...r} />;
const Hapid: React.FC<CP> = ({ x, y = HIP, s = SC, noBelly: _n, ...r }) => <Stick x={x} y={y} s={s} color={BLUE} tuft={false} headFront={<>{shades}{pompadour()}</>} {...r} />;
const Bidan: React.FC<CP> = ({ x, y = HIP, s = SC, noBelly: _n, ...r }) => <Stick x={x} y={y} s={s} color="#ffffff" tuft={false} headBack={BH.back} headFront={BH.front} {...r} />;

const wk = (f: number, sp = 0.5, amp = 26): Pose => {
  const a = Math.sin(f * sp);
  return { t: 6, lL: [a * amp, 0], lR: [-a * amp, 0], aL: [-a * amp * 1.1, 0], aR: [a * amp * 1.1, 0] };
};
const Bubble: React.FC<{ x: number; y: number; w?: number; text: string; size?: number; tail?: number }> = ({ x, y, w = 360, text, size = 46, tail = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={-62} width={w} height={110} rx={34} fill="#fff" stroke={INK} strokeWidth={8} />
    <path d={`M ${tail - 18} 48 L ${tail} 92 L ${tail + 26} 48 Z`} fill="#fff" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <rect x={tail - 22} y={40} width={52} height={14} fill="#fff" />
    <text textAnchor="middle" y={size * 0.34} fontFamily="Anton, Impact, sans-serif" fontSize={size} fill={INK}>
      {text}
    </text>
  </g>
);
const Sweat: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => (
  <g>
    {[0, 1, 2].map((i) => {
      const k = (t * 1.4 + i / 3) % 1;
      return <path key={i} d={`M ${x + i * 34 - 34} ${y + k * 40} q 12 -22 24 0 a 12 12 0 1 1 -24 0 z`} fill="#7ad0ff" stroke={INK} strokeWidth={4} opacity={1 - k * 0.6} />;
    })}
  </g>
);
const Stink: React.FC<{ x: number; y: number; t: number; c?: string; n?: number }> = ({ x, y, t, c = "#8bd46e", n = 3 }) => (
  <g>
    {[...Array(n)].map((_, i) => (
      <path key={i} d={`M ${x + i * 46} ${y} q 18 -34 0 -66 q -18 -34 0 -66`} stroke={c} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.8} transform={`translate(0 ${-Math.abs(Math.sin(t * 2 + i)) * 14})`} />
    ))}
  </g>
);
const Plate: React.FC<{ x: number; y: number; s?: number; steam?: number; t?: number }> = ({ x, y, s = 1, steam = 0, t = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {steam > 0 && [0, 1, 2].map((i) => <path key={i} d={`M ${-40 + i * 40} -60 q 14 -26 0 -52 q -14 -26 0 -52`} stroke="#fff" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.75 * steam} transform={`translate(0 ${Math.sin(t * 3 + i) * 6})`} />)}
    <ellipse rx={120} ry={22} cy={22} fill="#fff" stroke={INK} strokeWidth={8} />
    <path d="M -86 10 Q -70 -52 -10 -48 Q 40 -70 80 -10 Q 90 14 0 20 Q -60 22 -86 10 Z" fill="#e08a2c" stroke={INK} strokeWidth={7} />
    {[[-40, -22], [0, -34], [40, -22], [-10, -8], [28, -4], [-62, -4]].map(([a, b], i) => <circle key={i} cx={a} cy={b} r={6} fill={["#ffe14d", "#e63946", "#7ac74f"][i % 3]} stroke={INK} strokeWidth={2} />)}
    <ellipse cx={0} cy={-62} rx={30} ry={14} fill="#fff8e7" stroke={INK} strokeWidth={5} />
    <ellipse cx={0} cy={-62} rx={11} ry={6} fill="#ffc83d" />
  </g>
);
const Kitchen: React.FC<{ t: number; steam?: number; rice?: boolean }> = ({ t, steam = 1, rice = true }) => (
  <g>
    <rect x={-600} y={-600} width={2300} height={2000} fill="#ffe9b8" />
    {[...Array(9)].map((_, i) => (
      <line key={i} x1={-600 + i * 260} y1={-600} x2={-600 + i * 260} y2={GROUND} stroke="#f0d08c" strokeWidth={6} />
    ))}
    <rect x={-600} y={GROUND} width={2300} height={900} fill="#d9a86a" />
    <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#9a6a38" stroke={INK} strokeWidth={5} />
    {/* window */}
    <rect x={720} y={330} width={280} height={330} fill="#9fdcff" stroke={INK} strokeWidth={12} />
    <line x1={860} y1={330} x2={860} y2={660} stroke={INK} strokeWidth={8} />
    <line x1={720} y1={495} x2={1000} y2={495} stroke={INK} strokeWidth={8} />
    <circle cx={930} cy={400} r={36} fill="#ffd23f" />
    {/* counter + stove */}
    <rect x={-40} y={1100} width={640} height={300} fill="#fff" stroke={INK} strokeWidth={10} />
    <rect x={-40} y={1070} width={640} height={40} fill="#cfd8e3" stroke={INK} strokeWidth={10} />
    <rect x={50} y={1200} width={160} height={150} rx={10} fill="#e9eef5" stroke={INK} strokeWidth={7} />
    <circle cx={130} cy={1275} r={20} fill="#fff" stroke={INK} strokeWidth={6} />
    <rect x={260} y={1200} width={160} height={150} rx={10} fill="#e9eef5" stroke={INK} strokeWidth={7} />
    {[100, 200, 300, 400].map((a, i) => <circle key={i} cx={40 + a} cy={1175} r={14} fill="#222" stroke={INK} strokeWidth={4} />)}
    {rice && (
      <g transform="translate(500 1070)">
        <rect x={-56} y={-96} width={112} height={96} rx={18} fill="#f4f4f4" stroke={INK} strokeWidth={8} />
        <rect x={-62} y={-110} width={124} height={26} rx={12} fill="#d9304f" stroke={INK} strokeWidth={8} />
        <circle cx={0} cy={-50} r={12} fill="#7ac74f" stroke={INK} strokeWidth={5} />
        {steam > 0 && <path d="M -14 -124 q 14 -22 0 -44" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.8 * steam} transform={`translate(0 ${Math.sin(t * 3) * 5})`} />}
      </g>
    )}
  </g>
);
const Bathroom: React.FC = () => (
  <g>
    <rect x={-600} y={-600} width={2300} height={2000} fill="#cfeaf2" />
    {[...Array(14)].map((_, i) => <line key={i} x1={-600 + i * 180} y1={-600} x2={-600 + i * 180} y2={GROUND} stroke="#a8d2de" strokeWidth={6} />)}
    {[...Array(8)].map((_, i) => <line key={i} x1={-600} y1={150 + i * 190} x2={1700} y2={150 + i * 190} stroke="#a8d2de" strokeWidth={6} />)}
    <rect x={-600} y={GROUND} width={2300} height={900} fill="#9bb8c4" />
    <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#6f8f9c" stroke={INK} strokeWidth={5} />
    {/* toilet */}
    <g transform="translate(250 1400)">
      <rect x={-70} y={-340} width={140} height={150} rx={14} fill="#fff" stroke={INK} strokeWidth={9} />
      <rect x={-50} y={-350} width={100} height={16} rx={6} fill="#e9eef5" stroke={INK} strokeWidth={6} />
      <path d="M -150 -190 L 150 -190 Q 160 -90 90 -50 L 60 0 L -60 0 L -90 -50 Q -160 -90 -150 -190 Z" fill="#fff" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
      <ellipse cx={0} cy={-190} rx={150} ry={26} fill="#dbe7ee" stroke={INK} strokeWidth={9} />
    </g>
    {/* door frame at right */}
    <rect x={720} y={420} width={330} height={980} fill="#c98e55" stroke={INK} strokeWidth={12} />
    <circle cx={760} cy={920} r={16} fill="#ffd23f" stroke={INK} strokeWidth={5} />
  </g>
);
const Clinic: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <rect x={-600} y={-600} width={2300} height={2000} fill="#e3f6ef" />
    <rect x={-600} y={900} width={2300} height={500} fill="#cdeee1" />
    <rect x={-600} y={GROUND} width={2300} height={900} fill="#b8d9cc" />
    <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#7fae9d" stroke={INK} strokeWidth={5} />
    <rect x={380} y={330} width={320} height={120} rx={18} fill="#fff" stroke={INK} strokeWidth={9} />
    <text x={540} y={414} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={64} fill="#1c9a6a" letterSpacing={3}>
      KLINIK
    </text>
    <rect x={425} y={355} width={0} height={0} />
    <g transform="translate(130 330)">
      <rect x={-70} y={0} width={140} height={190} fill="#fff" stroke={INK} strokeWidth={8} />
      <rect x={-8} y={30} width={16} height={60} fill="#e63946" />
      <rect x={-30} y={52} width={60} height={16} fill="#e63946" />
      <rect x={-48} y={110} width={96} height={12} fill="#cfd8e3" />
      <rect x={-48} y={140} width={70} height={12} fill="#cfd8e3" />
    </g>
    {/* plant */}
    <g transform="translate(990 1400)">
      <rect x={-34} y={-70} width={68} height={70} rx={8} fill="#c8743a" stroke={INK} strokeWidth={7} />
      {[-30, -10, 14, 34].map((a, i) => <path key={i} d={`M 0 -70 Q ${a * 2} -150 ${a * 3} ${-170 - i * 8}`} stroke="#3c9a4c" strokeWidth={16} fill="none" strokeLinecap="round" />)}
    </g>
    {/* desk */}
    <g transform="translate(790 1400)">
      <rect x={-190} y={-210} width={380} height={30} rx={8} fill="#c8743a" stroke={INK} strokeWidth={9} />
      <rect x={-170} y={-180} width={30} height={180} fill="#a85f2e" stroke={INK} strokeWidth={8} />
      <rect x={140} y={-180} width={30} height={180} fill="#a85f2e" stroke={INK} strokeWidth={8} />
    </g>
  </g>
);

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneHamilHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cook = EV("hook.cook");
  const call = EV("hook.call");
  const smell = EV("hook.smell");
  const run = EV("hook.run");
  const hFace = f >= call - 4 && f < smell + 30;
  const hPose: Pose = f < call - 4 ? { t: -3, aR: [38 + 10 * Math.sin(f * 0.7), 20], aL: [-20, 0] } : f < run + 20 ? { t: 2, aR: [150, -20], aL: [-8, -10] } : { t: 0, aR: [20, 0], aL: [-10, 0] };
  const inK = smooth(cl((f - (call + 6)) / 30));
  const ax = f < run ? lerp(1260, 790, inK) : 790 + (f - run) * 36;
  const aPose: Pose = f < run ? (inK < 1 ? wk(f, 0.55) : { t: -4, aL: [-10, 0], aR: [14, 0] }) : { ...wk(f, 0.9, 38), t: 22 };
  const aExpr: Expr = f < smell ? "happy" : "pain";
  const cam = camAt(f, [
    { to: call - 4, f0: [330, 1060], z0: 1.35, f1: [360, 1040], z1: 1.25 },
    { to: run + 4, f0: [560, 1030], z0: 1.15, f1: [600, 1020], z1: 1.25 },
    { to: 9999, f0: [640, 1040], z0: 1.4, f1: [600, 1030], z1: 1.05 },
  ]);
  return (
    <AbsoluteFill style={{ background: "#ffe9b8" }}>
      <World cam={cam} shake={shakeAt(f, [run], 7, 8)}>
        <Kitchen t={t} />
        <g transform="translate(250 1068)">
          <Plate x={0} y={-6} s={0.8} steam={1} t={t} />
        </g>
        <Hapid x={440} flip={!hFace} pose={hPose} expr={hFace ? "happy" : "smug"} holdR={() => <g transform="translate(18 -4) rotate(-20)"><rect x={-4} y={-4} width={64} height={12} rx={5} fill="#ccc" stroke={INK} strokeWidth={4} /><ellipse cx={72} cy={2} rx={22} ry={12} fill="#ccc" stroke={INK} strokeWidth={4} /></g>} />
        {f >= call && f < call + 52 && <Bubble x={560} y={760} w={440} text="SARAPAN SIAP!" tail={-90} size={48} />}
        <Asti x={ax} flip={f < run} pose={aPose} expr={aExpr} noBelly={f >= run} />
        {f >= smell && f < run + 10 && <Stink x={ax - 140} y={HIP - 380} t={t} />}
        {f >= smell && f < run && <Sweat x={ax + 20} y={HIP - 500} t={t} />}
        {f >= run + 4 && <Onoma frame={f} at={run + 4} x={ax - 120} y={HIP - 120} text="WUSSH" size={90} fill="#9bd6ff" rot={-6} />}
      </World>
      <Grade />
      <Tag label="PAGI HARI" from={0} to={call} color="#ffb703" />
      <Caps ids={["hook_1", "hook_2", "hook_3"]} hl={["bangga", "spesial", "sarapan", "siap", "tercium", "lari"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. KAMAR MANDI                                                       */
/* ================================================================== */
export const SceneHamilMandi: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const retch = EV("mandi.retch");
  const panic = EV("mandi.panic");
  const stat = EV("mandi.stat");
  const heave = f >= retch ? Math.abs(Math.sin((f - retch) * 0.22)) : 0;
  const k = cl((f - 4) / 18);
  const aPose: Pose = { t: lerp(8, 58 + heave * 6, smooth(k)), aR: [lerp(8, 92, smooth(k)), -30], aL: [-8, -20], lL: [-10, 0], lR: [14, 0] };
  const hPose: Pose = f < panic ? { t: 4, aL: [-8, -10], aR: [20, -10] } : { t: -4 + 4 * Math.sin(f * 1.1), aL: [150 + 20 * Math.sin(f * 1.8), 0], aR: [150 - 20 * Math.sin(f * 1.8), 0], lL: [-6, 0], lR: [6, 0] };
  const cam = camAt(f, [
    { to: panic, f0: [420, 1080], z0: 1.5, f1: [440, 1060], z1: 1.35 },
    { to: stat, f0: [600, 1040], z0: 1.2, f1: [620, 1030], z1: 1.1 },
    { to: 9999, f0: [540, 960], z0: 1.0, f1: [540, 960], z1: 1.0 },
  ]);
  const sp = spring({ frame: f - stat, fps: 30, config: { damping: 10, stiffness: 160 } });
  const chip = f >= stat ? sp : 0;
  return (
    <AbsoluteFill style={{ background: "#cfeaf2" }}>
      <World cam={cam} shake={shakeAt(f, [retch, retch + 36], 6, 8)}>
        <Bathroom />
        <Asti x={480} flip pose={aPose} expr="pain" noBelly />
        {f >= retch && f < retch + 70 && <Onoma frame={f} at={retch} x={330} y={HIP - 130} text="UWEEK" size={86} fill="#a6e07b" rot={-8} />}
        <Sweat x={560} y={HIP - 300} t={t} />
        <Hapid x={870} flip pose={hPose} expr={f < panic ? "surprised" : "surprised"} />
        {f >= panic && f < panic + 80 && <Bubble x={760} y={640} w={380} text="ASTAGA?!" tail={80} size={52} />}
      </World>
      <Grade />
      {chip > 0 && (
        <div style={{ position: "absolute", left: 90, top: 500, width: 760, transform: `scale(${0.6 + 0.4 * chip})`, opacity: chip, background: "rgba(255,255,255,0.97)", border: "6px solid #12121a", borderRadius: 32, padding: "26px 30px", boxShadow: "0 14px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 120, color: "#d6336c", textAlign: "center", lineHeight: 1 }}>7 DARI 10</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 36, color: "#12121a", textAlign: "center", marginTop: 6 }}>ibu hamil mengalami mual atau muntah</div>
          <svg width={700} height={90} viewBox="0 0 700 90" style={{ marginTop: 14 }}>
            {[...Array(10)].map((_, i) => (
              <g key={i} transform={`translate(${35 + i * 70} 12)`} opacity={cl((f - stat - i * 3) / 6)}>
                <circle r={13} cy={10} fill={i < 7 ? "#f48fb1" : "#d0d5dc"} stroke={INK} strokeWidth={4} />
                <path d="M 0 24 L 0 58 M -16 36 L 16 36 M 0 58 L -12 78 M 0 58 L 12 78" stroke={i < 7 ? "#f48fb1" : "#d0d5dc"} strokeWidth={7} strokeLinecap="round" />
              </g>
            ))}
          </svg>
        </div>
      )}
      <Tag label="KAMAR MANDI" from={0} to={panic} color="#2aa6c9" />
      <Caps ids={["mandi_1", "mandi_2", "mandi_3"]} hl={["mual", "muntah", "panik", "Astaga", "beracun", "tujuh", "sepuluh", "umum"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. KLINIK                                                            */
/* ================================================================== */
export const SceneHamilKlinik: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const inn = EV("klinik.in");
  const morning = EV("klinik.morning");
  const night = EV("klinik.night");
  const ask = EV("klinik.ask");
  const zoom = EV("klinik.zoom");
  const talk = (a: number, b: number) => (f >= a && f < b ? Math.sin(f * 0.8) * 6 : 0);
  const bidanTalk = f < ask || f >= zoom - 40;
  const cam = camAt(f, [
    { to: morning - 6, f0: [540, 1000], z0: 1.15, f1: [600, 1010], z1: 1.25 },
    { to: ask, f0: [520, 1000], z0: 1.3, f1: [530, 1010], z1: 1.35 },
    { to: zoom, f0: [420, 1040], z0: 1.2, f1: [420, 1020], z1: 1.1 },
    { to: 9999, f0: [440, 1060], z0: 1.2, f1: [440, 1130], z1: 3.4 },
  ]);
  const sunK = smooth(cl((f - morning) / 12));
  const moonK = smooth(cl((f - night) / 12));
  const flash = interpolate(f, [zoom + 34, zoom + 56], [0, 1], clamp);
  const bPose: Pose = { t: 0, aR: [80 + talk(0, 999) * 2, -40], aL: [-8, -10] };
  return (
    <AbsoluteFill style={{ background: "#e3f6ef" }}>
      <World cam={cam}>
        <Clinic t={t} />
        <Hapid x={190} pose={{ t: 2, aL: [-8, -10], aR: f >= ask ? [100, -90] : [8, -10] }} expr={f >= ask && f < zoom ? "surprised" : "neutral"} />
        <Asti x={450} pose={{ t: 0, aL: [-8, -10], aR: [8, -10] }} expr={f < morning ? "happy" : "neutral"} />
        <Bidan x={860} flip pose={bPose} expr="happy" />
        {sunK > 0 && (
          <g transform={`translate(560 640) scale(${sunK})`}>
            <circle r={52} fill="#ffd23f" stroke={INK} strokeWidth={8} />
            {[...Array(8)].map((_, i) => <line key={i} x1={Math.cos((i * Math.PI) / 4) * 66} y1={Math.sin((i * Math.PI) / 4) * 66} x2={Math.cos((i * Math.PI) / 4) * 90} y2={Math.sin((i * Math.PI) / 4) * 90} stroke="#ffb703" strokeWidth={9} strokeLinecap="round" />)}
          </g>
        )}
        {moonK > 0 && (
          <g transform={`translate(760 690) scale(${moonK})`}>
            <circle r={52} fill="#cdd6ff" stroke={INK} strokeWidth={8} />
            <circle cx={22} cy={-12} r={44} fill="#e3f6ef" />
          </g>
        )}
        {f >= ask && f < ask + 60 && <Bubble x={230} y={640} w={340} text="BUKAN SALAH NASGOR?" size={32} tail={0} />}
      </World>
      <Grade />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Tag label="KLINIK" from={0} to={morning} color="#1c9a6a" />
      <Caps ids={["klinik_1", "klinik_2", "klinik_3", "klinik_4"]} hl={["kapan", "saja", "malam", "bukan", "salah", "dalam"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. DI DALAM TUBUH: hormon                                            */
/* ================================================================== */
const BodyCity: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <rect x={-600} y={-600} width={2300} height={2000} fill="#ffc9d3" />
    {[...Array(7)].map((_, i) => <circle key={i} cx={80 + i * 170} cy={260 + ((i * 97) % 300)} r={60 + (i % 3) * 26} fill="#ffb3c1" opacity={0.6} transform={`translate(0 ${Math.sin(t * 1.2 + i) * 10})`} />)}
    <rect x={-600} y={GROUND} width={2300} height={900} fill="#f5a3b3" />
    <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#c9738a" stroke={INK} strokeWidth={5} />
    {/* organ houses */}
    <g transform="translate(130 1400)">
      <rect x={-90} y={-300} width={180} height={300} rx={20} fill="#ff6b6b" stroke={INK} strokeWidth={9} />
      <text y={-170} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={54} fill="#fff" stroke={INK} strokeWidth={5} paintOrder="stroke">JANTUNG</text>
      <path d="M 0 -80 q -50 -50 -24 -80 q 24 -20 24 10 q 0 -30 24 -10 q 26 30 -24 80 z" fill="#fff" stroke={INK} strokeWidth={4} transform="translate(0 40)" />
    </g>
    <g transform="translate(420 1400)">
      <rect x={-100} y={-360} width={200} height={360} rx={24} fill="#7ac74f" stroke={INK} strokeWidth={9} />
      <text y={-210} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={54} fill="#fff" stroke={INK} strokeWidth={5} paintOrder="stroke">LAMBUNG</text>
      <path d="M -40 -150 q 0 -40 40 -40 q 50 0 50 50 q 0 50 -50 50 q -40 0 -40 -60 z" fill="#ffe0e6" stroke={INK} strokeWidth={5} transform="translate(0 20)" />
    </g>
    <g transform="translate(980 1400)">
      <rect x={-100} y={-300} width={200} height={300} rx={20} fill="#6ec6ff" stroke={INK} strokeWidth={9} />
      <text y={-170} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={54} fill="#fff" stroke={INK} strokeWidth={5} paintOrder="stroke">OTAK</text>
    </g>
  </g>
);
export const SceneHamilTubuh: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const mail = EV("tubuh.mail");
  const cause = EV("tubuh.cause");
  const kx = lerp(1350, 560, smooth(cl((f - 8) / 40)));
  const ex = lerp(1500, 800, smooth(cl((f - 14) / 44)));
  const hop = (a: number) => -Math.abs(Math.sin(f * 0.35 + a)) * 24;
  const cam = camAt(f, [
    { to: mail, f0: [640, 1100], z0: 1.15, f1: [660, 1090], z1: 1.25 },
    { to: cause, f0: [640, 1060], z0: 1.5, f1: [640, 1060], z1: 1.65 },
    { to: 9999, f0: [600, 1060], z0: 1.4, f1: [560, 1020], z1: 1.0 },
  ]);
  const letters = f >= mail ? [...Array(6)].map((_, i) => ({ x: 560 + i * 90 - 180, y: lerp(1040, 560 - (i % 3) * 120, smooth(cl((f - mail - i * 3) / 22))), r: -20 + i * 16 })) : [];
  const flash = interpolate(f, [0, 14], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#ffc9d3" }}>
      <World cam={cam}>
        <BodyCity t={t} />
        <Hormone x={kx} y={1318 + hop(0)} s={0.85} c="#ffd23f" hat="#6ec6ff" kind="mail" />
        <Hormone x={ex} y={1318 + hop(1.5)} s={0.85} c="#ff8fb1" hat="#ffd23f" kind="mail" />
        <text x={kx} y={1080} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={64} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">hCG</text>
        <text x={ex} y={1080} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={50} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">ESTROGEN</text>
        {letters.map((l, i) => (
          <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}>
            <rect x={-44} y={-30} width={88} height={60} fill="#fff" stroke={INK} strokeWidth={6} />
            <path d="M -44 -30 L 0 4 L 44 -30" fill="none" stroke={INK} strokeWidth={5} />
          </g>
        ))}
        {f >= mail && f < mail + 70 && <Onoma frame={f} at={mail} x={700} y={640} text="KAMU HAMIL!" size={74} fill="#ff6b9a" rot={-6} dur={64} />}
      </World>
      <Grade />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      {f >= cause && (
        <div style={{ position: "absolute", left: 90, top: 470, width: 760, textAlign: "center", opacity: smooth(cl((f - cause) / 10)) }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.96)", border: "6px solid #12121a", borderRadius: 28, padding: "18px 30px", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, color: "#12121a" }}>
            salah satu faktor yang <span style={{ color: "#d6336c" }}>dikaitkan</span>, bukan satu-satunya
          </div>
        </div>
      )}
      <Tag label="DI DALAM TUBUH ASTI" from={0} to={cause - 10} color="#ff6b9a" />
      <Caps ids={["tubuh_1", "tubuh_2", "tubuh_3"]} hl={["hormon", "naik", "pesat", "hCG", "estrogen", "Surat", "hamil", "dikaitkan", "mual", "bukan"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. HIDUNG                                                            */
/* ================================================================== */
export const SceneHamilHidung: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const nose = EV("hidung.nose");
  const guess = EV("hidung.guess");
  const alarm = EV("hidung.alarm");
  const bad = EV("hidung.bad");
  const alarmOn = f >= alarm && f < alarm + 66;
  const blink = alarmOn && Math.floor(f / 5) % 2 === 0;
  const smellX = lerp(1250, 620, smooth(cl((f - alarm + 24) / 36)));
  const cam = camAt(f, [
    { to: guess, f0: [600, 1040], z0: 1.25, f1: [560, 1030], z1: 1.4 },
    { to: alarm, f0: [560, 1040], z0: 1.6, f1: [520, 1040], z1: 1.55 },
    { to: bad, f0: [620, 1060], z0: 1.3, f1: [600, 1050], z1: 1.4 },
    { to: 9999, f0: [560, 1040], z0: 1.5, f1: [560, 1020], z1: 1.05 },
  ]);
  return (
    <AbsoluteFill style={{ background: "#ffc9d3" }}>
      <World cam={cam} shake={shakeAt(f, alarmOn ? [alarm, alarm + 12, alarm + 24, alarm + 36] : [], 8, 8)}>
        <BodyCity t={t} />
        {/* guardhouse */}
        <g transform="translate(420 1400)">
          <rect x={-120} y={-300} width={240} height={300} fill="#fff" stroke={INK} strokeWidth={10} />
          <path d="M -150 -300 L 0 -420 L 150 -300 Z" fill="#6ec6ff" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
          <rect x={-60} y={-230} width={120} height={110} fill="#bfe6ff" stroke={INK} strokeWidth={8} />
          <circle cx={0} cy={-440} r={26} fill={blink ? "#ff2d2d" : "#7a1f1f"} stroke={INK} strokeWidth={8} />
          {blink && <circle cx={0} cy={-440} r={90} fill="#ff2d2d" opacity={0.25} />}
        </g>
        <Hormone x={420} y={1288 + (alarmOn ? Math.sin(f * 1.4) * 8 : 0)} s={0.8} c="#9bd6ff" hat="#ff5a6a" kind="nose" />
        {f >= alarm - 24 && <Plate x={smellX} y={1150} s={0.9} steam={1} t={t} />}
        {f >= alarm - 24 && <Stink x={smellX - 100} y={1060} t={t} />}
        {alarmOn && <Onoma frame={f} at={alarm} x={430} y={790} text="WIUU!" size={100} fill="#ff6b6b" rot={-8} dur={60} />}
      </World>
      <Grade />
      {f >= nose && f < bad && (
        <div style={{ position: "absolute", left: 90, top: 440, width: 760, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.96)", border: "6px solid #12121a", borderRadius: 26, padding: "16px 28px", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, color: "#12121a", opacity: smooth(cl((f - nose) / 10)) }}>
            hidung lebih peka bau <span style={{ color: "#e8590c" }}>{f >= guess ? "· masih dugaan" : ""}</span>
          </div>
        </div>
      )}
      <Tag label="DI DALAM TUBUH ASTI" from={0} to={nose + 40} color="#ff6b9a" />
      <Caps ids={["hidung_1", "hidung_2", "hidung_3"]} hl={["peka", "dugaan", "belum", "Awas", "Alarm", "enak", "menyebalkan"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. GRAFIK: minggu 5 -> 9 -> 16                                       */
/* ================================================================== */
const curveY = (w: number) => {
  // week 4..20 -> y (higher = worse). Peak at 9.
  const g = Math.exp(-Math.pow((w - 9.5) / 3.1, 2));
  const tail = w > 9.5 ? 0 : 0;
  return 1500 - (g * 520 + tail) - 60;
};
export const SceneHamilGrafik: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const start = EV("grafik.start");
  const peak = EV("grafik.peak");
  const end = EV("grafik.end");
  const X0 = 110;
  const X1 = 970;
  const wx = (w: number) => X0 + ((w - 4) / 16) * (X1 - X0);
  const prog = cl((f - start) / Math.max(1, end - start + 20));
  const wNow = 4 + prog * 16;
  const pts: string[] = [];
  for (let w = 4; w <= wNow; w += 0.25) pts.push(`${wx(w).toFixed(1)},${curveY(w).toFixed(1)}`);
  const mx = wx(wNow);
  const my = curveY(wNow);
  const cam = camAt(f, [{ to: 9999, f0: [540, 960], z0: 1.0, f1: [540, 960], z1: 1.0 }]);
  const wkLabel = Math.round(wNow);
  return (
    <AbsoluteFill style={{ background: "#fffaf0" }}>
      <World cam={cam} dy={230}>
        <rect x={-600} y={-600} width={2300} height={3000} fill="#fffaf0" />
        {[...Array(14)].map((_, i) => <line key={i} x1={-100 + i * 100} y1={0} x2={-100 + i * 100} y2={1920} stroke="#f0e6cf" strokeWidth={3} />)}
        {[...Array(20)].map((_, i) => <line key={i} x1={0} y1={i * 100} x2={1080} y2={i * 100} stroke="#f0e6cf" strokeWidth={3} />)}
        <text x={540} y={540} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={70} fill={INK}>SEBERAT APA MUALNYA?</text>
        <text x={540} y={610} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={800} fontSize={34} fill="#777">perkiraan umum, tiap ibu bisa berbeda</text>
        {/* axes */}
        <line x1={X0 - 30} y1={1500} x2={X1 + 20} y2={1500} stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <line x1={X0 - 30} y1={1500} x2={X0 - 30} y2={820} stroke={INK} strokeWidth={8} strokeLinecap="round" />
        {[5, 9, 16].map((w) => (
          <g key={w}>
            <line x1={wx(w)} y1={1500} x2={wx(w)} y2={1520} stroke={INK} strokeWidth={6} />
            <text x={wx(w)} y={1570} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={44} fill={INK}>{`MG ${w}`}</text>
          </g>
        ))}
        <text x={X0 - 56} y={1160} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={800} fontSize={30} fill="#777" transform={`rotate(-90 ${X0 - 56} 1160)`}>tingkat mual</text>
        {/* shaded zone 16-18 */}
        <rect x={wx(16)} y={820} width={wx(18) - wx(16)} height={680} fill="#bdf0c9" opacity={0.7} />
        <text x={(wx(16) + wx(18)) / 2} y={870} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={32} fill="#1c8a4a">MEMBAIK</text>
        {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke="#e8317a" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />}
        {f >= peak && (
          <g transform={`translate(${wx(9)} ${curveY(9) - 76})`}>
            <rect x={-170} y={-52} width={340} height={64} rx={20} fill="#ffe14d" stroke={INK} strokeWidth={7} />
            <text textAnchor="middle" y={-6} fontFamily="Anton, Impact, sans-serif" fontSize={40} fill={INK}>PUNCAK ± MINGGU 9</text>
          </g>
        )}
        {f >= start && (
          <g transform={`translate(${mx} ${my - 4})`}>
            <Asti x={0} y={-6} s={0.36} pose={{ t: 0, aL: [-20, 0], aR: [20, 0], lL: [-10, 0], lR: [10, 0] }} expr={prog < 0.35 ? "neutral" : prog < 0.75 ? "pain" : "happy"} noBelly />
          </g>
        )}
        <text x={mx} y={my + 140} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={40} fill={INK} opacity={f >= start ? 1 : 0}>{`MINGGU ${wkLabel}`}</text>
      </World>
      <Grade />
      <Tag label="KABAR BAIKNYA" from={0} to={end} color="#2bb673" />
      <Caps ids={["grafik_1", "grafik_2"]} hl={["kelima", "kesembilan", "membaik", "nggak", "selamanya"]} top={1400} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. TIPS                                                              */
/* ================================================================== */
const Card: React.FC<{ x: number; y: number; at: number; f: number; label: string; children: React.ReactNode; c?: string }> = ({ x, y, at, f, label, children, c = "#ffe14d" }) => {
  const k = spring({ frame: f - at, fps: 30, config: { damping: 10, stiffness: 190 } });
  if (f < at) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${0.4 + 0.6 * k})`} opacity={cl(k * 1.4)}>
      <rect x={-140} y={-130} width={280} height={260} rx={34} fill="#fff" stroke={INK} strokeWidth={9} />
      <rect x={-140} y={80} width={280} height={50} rx={0} fill={c} stroke={INK} strokeWidth={9} />
      <text textAnchor="middle" y={118} fontFamily="Anton, Impact, sans-serif" fontSize={34} fill={INK}>{label}</text>
      <g transform="translate(0 -30)">{children}</g>
    </g>
  );
};
export const SceneHamilTips: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const b = EV("tips.biscuit");
  const sm = EV("tips.small");
  const dr = EV("tips.drink");
  const ok = EV("tips.ok");
  const cam = camAt(f, [
    { to: ok, f0: [540, 900], z0: 1.0, f1: [540, 960], z1: 1.1 },
    { to: 9999, f0: [520, 1080], z0: 1.28, f1: [540, 1050], z1: 1.1 },
  ]);
  const salute = f >= ok;
  return (
    <AbsoluteFill style={{ background: "#e3f6ef" }}>
      <World cam={cam}>
        <Clinic t={t} />
        <Hapid x={200} pose={salute ? { t: 0, aR: [155, -100], aL: [-8, -10] } : { t: 0, aL: [-8, -10], aR: [8, -10] }} expr={salute ? "smug" : "neutral"} />
        <Asti x={470} pose={{ t: 0, aL: [-8, -10], aR: [12, -40] }} expr="neutral" />
        <Bidan x={830} flip pose={{ t: 0, aR: [70 + Math.sin(f * 0.5) * 8, -40], aL: [-8, -10] }} expr="happy" />
        <Card x={250} y={640} at={b} f={f} label="BISKUIT KERING">
          <g>
            <rect x={-60} y={-40} width={120} height={80} rx={12} fill="#e0a85b" stroke={INK} strokeWidth={7} />
            {[-30, 0, 30].map((a, i) => <circle key={i} cx={a} cy={0} r={8} fill="#a8672a" />)}
          </g>
        </Card>
        <Card x={540} y={640} at={sm} f={f} label="SEDIKIT, SERING" c="#9be7a6">
          <g>
            {[-46, 0, 46].map((a, i) => <g key={i} transform={`translate(${a} ${i === 1 ? -8 : 8})`}><ellipse rx={24} ry={9} cy={14} fill="#fff" stroke={INK} strokeWidth={5} /><circle cy={0} r={11} fill="#ff9f43" stroke={INK} strokeWidth={4} /></g>)}
          </g>
        </Card>
        <Card x={830} y={640} at={dr} f={f} label="MINUM PELAN" c="#9bd6ff">
          <g>
            <path d="M -34 -52 L 34 -52 L 24 50 L -24 50 Z" fill="#bfe6ff" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
            <path d="M -29 -8 L 29 -8 L 24 50 L -24 50 Z" fill="#6ec6ff" />
          </g>
        </Card>
        {f >= ok && f < ok + 40 && <Onoma frame={f} at={ok} x={260} y={HIP - 380} text="SIAP!" size={90} fill="#ffb703" rot={-8} dur={40} />}
      </World>
      <Grade />
      <Tag label="TIPS AMAN" from={0} to={dr + 30} color="#2bb673" />
      <Caps ids={["tips_1", "tips_2"]} hl={["biskuit", "sedikit", "sering", "minum", "Siap", "Serahkan"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 8. SIAGA: Hapid suami siaga                                          */
/* ================================================================== */
export const SceneHamilSiaga: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const start = EV("siaga.start");
  const run = EV("siaga.run");
  const pile = EV("siaga.pile");
  const fall = EV("siaga.fall");
  const asti = EV("siaga.asti");
  const stackN = Math.min(8, Math.max(0, Math.floor((f - pile + 40) / 7)));
  const fallK = cl((f - fall) / 14);
  const hx = f < run ? lerp(-120, 360, smooth(cl(f / 28))) : f < fall ? lerp(360, 760, smooth(cl((f - run) / (fall - run)))) : 760;
  const walking = f < fall;
  const hPose: Pose = walking ? { ...wk(f, 0.7, 22), aL: [140, -20], aR: [140, -20] } : { t: -75 * fallK, aL: [160, 0], aR: [160, 0], lL: [20 * fallK, 0], lR: [-30 * fallK, 0] };
  const cam = camAt(f, [
    { to: run, f0: [440, 1040], z0: 1.2, f1: [460, 1030], z1: 1.25 },
    { to: fall, f0: [560, 1040], z0: 1.2, f1: [680, 1040], z1: 1.4 },
    { to: 9999, f0: [760, 1100], z0: 1.5, f1: [600, 1020], z1: 1.05 },
  ]);
  const winOpen = smooth(cl((f - run - 6) / 16));
  return (
    <AbsoluteFill style={{ background: "#ffe9b8" }}>
      <World cam={cam} shake={shakeAt(f, [fall], 14, 12)}>
        <Kitchen t={t} steam={0} rice={f < run + 14} />
        {/* open window flap */}
        <rect x={720} y={330} width={280 * winOpen} height={330} fill="#fff" opacity={0.0} />
        {f >= run + 14 && (
          <g transform={`translate(${lerp(500, 1230, smooth(cl((f - run - 14) / 22)))} 960)`}>
            <rect x={-56} y={-96} width={112} height={96} rx={18} fill="#f4f4f4" stroke={INK} strokeWidth={8} transform={`rotate(${(f - run) * 14})`} />
          </g>
        )}
        {/* fan */}
        <g transform="translate(300 640)">
          <circle r={70} fill="#e9eef5" stroke={INK} strokeWidth={8} />
          {[0, 120, 240].map((a) => <ellipse key={a} cx={0} cy={-34} rx={16} ry={34} fill="#9bd6ff" stroke={INK} strokeWidth={5} transform={`rotate(${a + f * 30})`} />)}
          <circle r={10} fill={INK} />
        </g>
        <Hapid x={hx} flip={false} pose={hPose} expr={walking ? "happy" : "pain"} holdL={() => <g />} />
        {/* biscuit stack above head */}
        {walking
          ? [...Array(stackN)].map((_, i) => <g key={i} transform={`translate(${hx + 30} ${HIP - 440 - i * 38}) rotate(${Math.sin(f * 0.3 + i) * 6})`}><rect x={-60} y={-18} width={120} height={36} rx={8} fill="#e0a85b" stroke={INK} strokeWidth={6} /><circle cx={-24} cy={0} r={6} fill="#a8672a" /><circle cx={0} cy={0} r={6} fill="#a8672a" /><circle cx={24} cy={0} r={6} fill="#a8672a" /></g>)
          : [...Array(stackN)].map((_, i) => <g key={i} transform={`translate(${hx + 30 + (i - 1) * 50 * fallK} ${lerp(HIP - 440 - i * 38, GROUND - 24 - (i % 3) * 30, fallK)}) rotate(${i * 24 * fallK})`}><rect x={-60} y={-18} width={120} height={36} rx={8} fill="#e0a85b" stroke={INK} strokeWidth={6} /><circle cx={-24} cy={0} r={6} fill="#a8672a" /><circle cx={24} cy={0} r={6} fill="#a8672a" /></g>)}
        {f >= fall && <Onoma frame={f} at={fall} x={hx} y={HIP - 100} text="BRUK!" size={96} fill="#ff9f43" rot={-8} />}
        <Asti x={f < asti ? 960 : 960} flip pose={{ t: 0, aL: [-8, -10], aR: [10, -10] }} expr={f >= asti ? "tired" : "neutral"} />
        {f >= asti && f < asti + 70 && <Bubble x={870} y={640} w={420} text="TERLALU BANYAK..." size={40} tail={70} />}
      </World>
      <Grade />
      <Tag label="SUAMI SIAGA" from={0} to={run} color="#ffb703" />
      <Caps ids={["siaga_1", "siaga_2", "siaga_3"]} hl={["suami", "siaga", "Biskuit", "Jendela", "asingkan", "terlalu", "banyak"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 9. BAHAYA: tanda bahaya                                              */
/* ================================================================== */
export const SceneHamilBahaya: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const sign = EV("bahaya.sign");
  const items = [EV("bahaya.i1"), EV("bahaya.i2"), EV("bahaya.i3"), EV("bahaya.i4")];
  const name = EV("bahaya.name");
  const rows: [string, string][] = [
    ["TIDAK BISA MAKAN / MINUM", "#ff6b6b"],
    ["BADAN LEMAS", "#ffa94d"],
    ["AIR SENI PEKAT / JARANG", "#ffd43b"],
    ["BERAT BADAN TURUN", "#ff8787"],
  ];
  const blink = Math.floor(f / 8) % 2 === 0;
  const pop = spring({ frame: f - sign, fps: 30, config: { damping: 11, stiffness: 150 } });
  const nm = smooth(cl((f - name) / 10));
  const cam = camAt(f, [{ to: 9999, f0: [540, 960], z0: 1.0, f1: [540, 980], z1: 1.04 }]);
  return (
    <AbsoluteFill style={{ background: "#fff1ee" }}>
      <World cam={cam}>
        <rect x={-600} y={-600} width={2300} height={3000} fill="#fff1ee" />
        <rect x={-600} y={GROUND} width={2300} height={900} fill="#e8c9c2" />
        <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#b58a82" stroke={INK} strokeWidth={5} />
        <g transform={`translate(540 600) scale(${0.5 + 0.5 * pop})`} opacity={cl(pop * 1.4)}>
          <rect x={-470} y={-400} width={940} height={800} rx={44} fill="#fff" stroke={INK} strokeWidth={12} />
          <rect x={-470} y={-400} width={940} height={150} rx={44} fill="#e03131" stroke={INK} strokeWidth={12} />
          <rect x={-470} y={-300} width={940} height={50} fill="#e03131" />
          <path d="M -380 -380 L -310 -270 L -450 -270 Z" fill="#ffe14d" stroke={INK} strokeWidth={7} strokeLinejoin="round" opacity={blink ? 1 : 0.5} transform="translate(60 -12)" />
          <text x={-160} y={-296} textAnchor="start" fontFamily="Anton, Impact, sans-serif" fontSize={84} fill="#fff" stroke={INK} strokeWidth={6} paintOrder="stroke">TANDA BAHAYA</text>
          {rows.map(([label, c], i) => {
            const k = smooth(cl((f - items[i]) / 8));
            return (
              <g key={i} transform={`translate(0 ${-170 + i * 140})`} opacity={k}>
                <rect x={-420 + (1 - k) * 80} y={-52} width={840} height={110} rx={26} fill={c} stroke={INK} strokeWidth={8} />
                <circle cx={-350 + (1 - k) * 80} cy={3} r={36} fill="#fff" stroke={INK} strokeWidth={6} />
                <text x={-350 + (1 - k) * 80} y={20} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={50} fill={INK}>{i + 1}</text>
                <text x={-290 + (1 - k) * 80} y={20} fontFamily="Anton, Impact, sans-serif" fontSize={44} fill={INK}>{label}</text>
              </g>
            );
          })}
        </g>
        <g transform="translate(540 1150)" opacity={nm}>
          <rect x={-330} y={-70} width={660} height={150} rx={28} fill="#e03131" stroke={INK} strokeWidth={9} />
          <text textAnchor="middle" y={-8} fontFamily="Anton, Impact, sans-serif" fontSize={44} fill="#fff">HIPEREMESIS GRAVIDARUM</text>
          <text textAnchor="middle" y={46} fontFamily="Anton, Impact, sans-serif" fontSize={40} fill="#ffe14d">SEGERA PERIKSA</text>
        </g>
        <Bidan x={110} pose={{ t: 0, aR: [100, -20], aL: [-8, -10] }} expr="neutral" s={0.62} y={GROUND - 196 * 0.62} />
        <Asti x={970} flip pose={{ t: 0, aL: [-8, -10], aR: [10, -10] }} expr="tired" s={0.62} y={GROUND - 196 * 0.62} />
      </World>
      <Grade />
      <Tag label="PERLU DIPERHATIKAN" from={0} to={items[0]} color="#e03131" />
      <Caps ids={["bahaya_1", "bahaya_2"]} hl={["waspada", "Segera", "lemas", "pekat", "turun", "hiperemesis", "gravidarum", "medis"]} color="#ff8a8a" top={1480} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 10. AKHIR                                                            */
/* ================================================================== */
export const SceneHamilAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const eat = EV("akhir.eat");
  const ask = EV("akhir.ask");
  const card = EV("akhir.card");
  const spoon = Math.abs(Math.sin(f * 0.25));
  const cam = camAt(f, [
    { to: ask, f0: [540, 1020], z0: 1.15, f1: [560, 1030], z1: 1.25 },
    { to: card, f0: [560, 1030], z0: 1.5, f1: [580, 1020], z1: 1.35 },
    { to: 9999, f0: [560, 1020], z0: 1.2, f1: [540, 980], z1: 1.0 },
  ]);
  const cardK = smooth(cl((f - card) / 12));
  return (
    <AbsoluteFill style={{ background: "#ffe9b8" }}>
      <World cam={cam}>
        <Kitchen t={t} steam={0} rice={false} />
        <rect x={0} y={1150} width={1080} height={40} rx={10} fill="#c8743a" stroke={INK} strokeWidth={9} />
        <rect x={120} y={1190} width={40} height={210} fill="#a85f2e" stroke={INK} strokeWidth={8} />
        <rect x={920} y={1190} width={40} height={210} fill="#a85f2e" stroke={INK} strokeWidth={8} />
        <Plate x={540} y={1138} s={1.0} steam={1} t={t} />
        {f >= ask && [0, 1, 2].map((i) => <ellipse key={i} cx={640 + i * 40} cy={1114 - i * 6} rx={34} ry={14} fill="#ffeab0" stroke={INK} strokeWidth={5} transform={`rotate(${-12 + i * 10} ${640 + i * 40} ${1114})`} />)}
        <Asti x={330} pose={{ t: 6, aR: [lerp(50, 100, spoon), -60], aL: [-8, -10] }} expr="happy" holdR={() => <g transform="translate(14 -6) rotate(-30)"><rect x={-3} y={-3} width={54} height={8} rx={4} fill="#ccc" stroke={INK} strokeWidth={3} /><ellipse cx={58} cy={0} rx={14} ry={9} fill="#ccc" stroke={INK} strokeWidth={3} /></g>} />
        <Hapid x={760} flip pose={{ t: 0, aL: [-8, -10], aR: f >= ask ? [150, -30] : [10, -10] }} expr="happy" />
        {f >= ask && f < ask + 64 && <Bubble x={330} y={650} w={420} text="TAMBAH KERUPUK!" size={42} tail={0} />}
      </World>
      <Grade />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(12,8,20,${0.5 * cardK})` }}>
          <div style={{ position: "absolute", left: 80, right: 80, top: 600, transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, background: "#fff", border: "8px solid #12121a", borderRadius: 40, padding: "46px 40px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 88, color: "#d6336c", lineHeight: 1 }}>KONTEN EDUKASI</div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: "#12121a", marginTop: 20, lineHeight: 1.25 }}>
              Bukan pengganti konsultasi dengan bidan atau dokter.
            </div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 34, color: "#555", marginTop: 20 }}>Gejalanya berat atau mengkhawatirkan? Segera periksa.</div>
          </div>
        </AbsoluteFill>
      )}
      <Tag label="BEBERAPA MINGGU KEMUDIAN" from={0} to={ask} color="#ffb703" />
      <Caps ids={["akhir_1", "akhir_2", "akhir_3"]} hl={["minggu", "menikmati", "lagi", "tambah", "kerupuknya", "edukasi", "bukan", "bidan", "dokter"]} top={card ? 1560 : 1320} />
    </AbsoluteFill>
  );
};

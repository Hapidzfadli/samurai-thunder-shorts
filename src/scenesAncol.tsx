import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "./ancol_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";
import { INK, Expr, Pose, Star, Stick } from "./stick/draw";
import { hijab, mask, pompadour, blush } from "./stick/sehat";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_ANCOL = timing.scenes as Record<"chat" | "rencana" | "jemput" | "malu" | "jalan" | "foto" | "muter" | "minum" | "eskrim" | "biang" | "makan" | "coaster" | "pulang" | "akhir", number>;
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
type CP = { x: number; y?: number; flip?: boolean; pose?: Pose; expr?: Expr; holdR?: React.ComponentProps<typeof Stick>["holdR"]; holdL?: React.ComponentProps<typeof Stick>["holdL"]; s?: number; masked?: boolean; shy?: boolean };
const Hapid: React.FC<CP> = ({ x, y = HIP, s = SC, masked, shy, ...r }) => <Stick x={x} y={y} s={s} color={BLUE} tuft={false} headFront={<>{pompadour()}{shy ? blush : null}{masked ? mask("#bfe6ff") : null}</>} {...r} />;
const Asti: React.FC<CP> = ({ x, y = HIP, s = SC, masked, shy, ...r }) => <Stick x={x} y={y} s={s} color={PINK} tuft={false} headBack={AH.back} headFront={<>{AH.front}{shy ? blush : null}{masked ? mask("#ffd6e7") : null}</>} {...r} />;
const Extra: React.FC<CP & { color: string; hair?: string }> = ({ x, y = HIP, s = SC, color, hair = "#5a3a22", masked: _m, shy: _s, ...r }) => (
  <Stick x={x} y={y} s={s} color={color} tuft={false} headFront={<path d="M -60 -30 Q -50 -90 0 -92 Q 50 -90 60 -30 Q 30 -62 0 -62 Q -30 -62 -60 -30 Z" fill={hair} stroke={INK} strokeWidth={6} />} {...r} />
);
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
const Heart: React.FC<{ x: number; y: number; s?: number; c?: string; o?: number }> = ({ x, y, s = 1, c = "#ff5d8f", o = 1 }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M 0 18 C -40 -10 -26 -40 0 -22 C 26 -40 40 -10 0 18 Z" fill={c} stroke={INK} strokeWidth={4} opacity={o} />
);
const Hearts: React.FC<{ x: number; y: number; f: number; at: number; n?: number; spread?: number }> = ({ x, y, f, at, n = 5, spread = 160 }) => {
  if (f < at) return null;
  return (
    <g>
      {[...Array(n)].map((_, i) => {
        const k = cl((f - at - i * 5) / 46);
        if (k <= 0 || k >= 1) return null;
        return <Heart key={i} x={x + (i - (n - 1) / 2) * (spread / n) + Math.sin(k * 6 + i) * 16} y={y - k * 260} s={0.7 + (i % 3) * 0.2} o={1 - k * k} c={i % 2 ? "#ff5d8f" : "#ff8fb1"} />;
      })}
    </g>
  );
};
const Sky: React.FC<{ id: string; a: string; b: string; c?: string }> = ({ id, a, b, c }) => (
  <g>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={a} />
        <stop offset="100%" stopColor={b} />
        {c && <stop offset="100%" stopColor={c} />}
      </linearGradient>
    </defs>
    <rect x={-600} y={-600} width={2300} height={2100} fill={`url(#${id})`} />
  </g>
);
const Cloud: React.FC<{ x: number; y: number; s?: number; o?: number }> = ({ x, y, s = 1, o = 0.95 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <ellipse cx={0} cy={0} rx={90} ry={34} fill="#fff" />
    <ellipse cx={-46} cy={-14} rx={50} ry={34} fill="#fff" />
    <ellipse cx={34} cy={-24} rx={56} ry={40} fill="#fff" />
  </g>
);
const Palm: React.FC<{ x: number; s?: number }> = ({ x, s = 1 }) => (
  <g transform={`translate(${x} ${GROUND}) scale(${s})`}>
    <path d="M 0 0 Q 20 -200 0 -420" stroke="#8a5a30" strokeWidth={34} fill="none" strokeLinecap="round" />
    <path d="M 0 0 Q 20 -200 0 -420" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.25} />
    {[-70, -35, 0, 35, 70].map((a, i) => <path key={i} d="M 0 -420 Q 90 -470 170 -400 Q 90 -430 0 -420 Z" fill="#3ea04c" stroke={INK} strokeWidth={5} transform={`rotate(${a} 0 -420)`} />)}
  </g>
);
const Motor: React.FC<{ x: number; flip?: boolean; rot?: number; bounce?: number; color?: string }> = ({ x, flip = false, rot = 0, bounce = 0, color = "#e63946" }) => (
  <g transform={`translate(${x} ${GROUND + bounce}) scale(${flip ? -1 : 1} 1)`}>
    {/* rear + front body (matic scooter) */}
    <path d="M -210 -80 L -210 -150 Q -200 -176 -150 -172 L 30 -172 L 40 -80 Z" fill={color} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <path d="M 40 -80 L 70 -80 Q 96 -86 108 -120 L 116 -250 L 150 -252 L 160 -150 Q 160 -80 120 -64 L 40 -64 Z" fill={color} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <rect x={-30} y={-96} width={110} height={26} rx={8} fill="#2a2a33" stroke={INK} strokeWidth={7} />
    <rect x={-200} y={-190} width={236} height={32} rx={16} fill="#2a2a33" stroke={INK} strokeWidth={8} />
    <path d="M 112 -254 L 168 -270 L 190 -262" stroke={INK} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={160} cy={-226} r={18} fill="#fff7b0" stroke={INK} strokeWidth={6} />
    <path d="M -210 -96 L -250 -86 L -236 -70" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x={-212} y={-118} width={30} height={20} rx={5} fill="#ff3b3b" stroke={INK} strokeWidth={5} />
    {[-140, 134].map((wx) => (
      <g key={wx} transform={`translate(${wx} -50) rotate(${rot})`}>
        <circle r={52} fill="#333" stroke={INK} strokeWidth={9} />
        <circle r={28} fill="#cfd8e3" stroke={INK} strokeWidth={5} />
        {[0, 60, 120].map((a) => <line key={a} x1={0} y1={-26} x2={0} y2={26} stroke={INK} strokeWidth={4} transform={`rotate(${a})`} />)}
      </g>
    ))}
  </g>
);
const sit: Pose = { t: 4, lL: [85, -85], lR: [78, -80], aL: [46, -6], aR: [50, -8] };
const SEAT_Y = GROUND - 186;
const Phone: React.FC<{ w?: number }> = ({ w = 1 }) => (
  <g transform={`scale(${w})`}>
    <rect x={-30} y={-52} width={60} height={104} rx={10} fill="#222" stroke={INK} strokeWidth={5} />
    <rect x={-24} y={-44} width={48} height={84} rx={4} fill="#9ad9ff" />
  </g>
);
const Street: React.FC<{ t: number; dusk?: number; door?: boolean }> = ({ t, dusk = 0, door = true }) => (
  <g>
    <Sky id={`sky_st${dusk > 0 ? "d" : "n"}`} a={dusk > 0 ? "#ffb97a" : "#9fdcff"} b={dusk > 0 ? "#f7a8c4" : "#e8f7ff"} />
    {dusk === 0 && <Cloud x={200} y={380} s={1.2} />}
    {dusk === 0 && <Cloud x={820} y={520} s={0.9} />}
    <circle cx={880} cy={dusk > 0 ? 780 : 420} r={dusk > 0 ? 110 : 70} fill={dusk > 0 ? "#ffd27a" : "#ffe14d"} opacity={dusk > 0 ? 0.95 : 1} />
    {/* far houses */}
    {[0, 1, 2, 3].map((i) => <rect key={i} x={-60 + i * 330} y={GROUND - 260 - (i % 2) * 70} width={240} height={260 + (i % 2) * 70} fill={dusk > 0 ? "#c98a9a" : "#d8e7f0"} stroke={INK} strokeWidth={6} />)}
    <rect x={-600} y={GROUND - 30} width={2300} height={500} fill={dusk > 0 ? "#7a6578" : "#8d9aa6"} />
    <rect x={-600} y={GROUND - 40} width={2300} height={18} fill={dusk > 0 ? "#a38aa0" : "#c0cbd5"} stroke={INK} strokeWidth={5} />
    {[...Array(9)].map((_, i) => <rect key={i} x={-300 + i * 260 - ((t * 120) % 260) * 0} y={GROUND + 70} width={120} height={14} rx={7} fill="#f4f4f4" opacity={0.85} />)}
    {door && (
      <g transform="translate(820 1400)">
        <rect x={-150} y={-470} width={300} height={470} fill={dusk > 0 ? "#e8b28a" : "#fff2d6"} stroke={INK} strokeWidth={10} />
        <rect x={-165} y={-500} width={330} height={42} fill="#c0534a" stroke={INK} strokeWidth={10} />
        <rect x={-50} y={-300} width={100} height={300} fill="#8b5a2b" stroke={INK} strokeWidth={8} />
        <circle cx={30} cy={-150} r={9} fill="#ffd23f" stroke={INK} strokeWidth={4} />
        <rect x={-120} y={-410} width={64} height={70} fill="#9fdcff" stroke={INK} strokeWidth={7} />
        <rect x={56} y={-410} width={64} height={70} fill="#9fdcff" stroke={INK} strokeWidth={7} />
      </g>
    )}
  </g>
);
const Ancol: React.FC<{ t: number; dusk?: boolean }> = ({ t, dusk = false }) => (
  <g>
    <Sky id={dusk ? "sky_an_d" : "sky_an"} a={dusk ? "#ff9f7a" : "#7fd0ff"} b={dusk ? "#ffd6a0" : "#eaf9ff"} />
    {!dusk && <Cloud x={250} y={330} s={1.3} />}
    {!dusk && <Cloud x={800} y={450} s={1.0} />}
    <circle cx={850} cy={dusk ? 900 : 380} r={dusk ? 130 : 66} fill={dusk ? "#ffe3a0" : "#ffe14d"} />
    <rect x={-600} y={900} width={2300} height={260} fill={dusk ? "#7aa6cf" : "#4fc3e8"} />
    {[...Array(9)].map((_, i) => <path key={i} d={`M ${-100 + i * 150} ${960 + (i % 3) * 36} q 40 -22 80 0`} stroke="#fff" strokeWidth={6} fill="none" opacity={0.7} transform={`translate(${Math.sin(t * 1.4 + i) * 10} 0)`} />)}
    <rect x={-600} y={1150} width={2300} height={600} fill={dusk ? "#e8c6a0" : "#f4e1b0"} />
    <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#c9a86a" stroke={INK} strokeWidth={5} />
    <Palm x={90} s={0.9} />
    <Palm x={990} s={1.0} />
  </g>
);

/* ================================================================== */
/* 1. CHAT                                                              */
/* ================================================================== */
export const SceneAncolChat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const type = EV("chat.type");
  const heart = EV("chat.heart");
  const meet = EV("chat.meet");
  const msgs: [string, boolean][] = [
    ["Halo, lagi apa?", false],
    ["Lagi santai, kamu?", true],
    ["Sama! Hehe", false],
    ["Besok chat lagi ya", true],
  ];
  const cam = camAt(f, [{ to: meet, f0: [540, 900], z0: 1.08, f1: [540, 880], z1: 1.02 }, { to: 9999, f0: [540, 880], z0: 1.02, f1: [540, 960], z1: 1.0 }]);
  const pulse2 = f >= meet ? 1 + 0.06 * Math.sin((f - meet) * 0.5) : 1;
  return (
    <AbsoluteFill style={{ background: "#ffe0ec" }}>
      <World cam={cam}>
        <Sky id="sky_chat" a="#ffd6e7" b="#e9dcff" />
        {[...Array(9)].map((_, i) => <Heart key={i} x={100 + ((i * 131) % 900)} y={260 + ((i * 197) % 1000)} s={0.9 + (i % 3) * 0.3} c="#ffb3cf" o={0.5} />)}
        <g transform={`translate(540 760) scale(${pulse2})`}>
          <rect x={-250} y={-420} width={500} height={860} rx={54} fill="#1f1f2b" stroke={INK} strokeWidth={10} />
          <rect x={-226} y={-386} width={452} height={790} rx={30} fill="#fff" />
          <rect x={-226} y={-386} width={452} height={84} rx={30} fill="#3b78e7" />
          <rect x={-226} y={-340} width={452} height={40} fill="#3b78e7" />
          <text y={-330} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={800} fontSize={34} fill="#fff">Chat Asti</text>
          {msgs.map(([m, mine], i) => {
            const at = type + i * 26;
            const k = smooth(cl((f - at) / 8));
            if (f < at) return null;
            return (
              <g key={i} transform={`translate(0 ${-250 + i * 118 + (1 - k) * 20})`} opacity={k}>
                <rect x={mine ? 220 - 330 : -214} y={-34} width={330} height={76} rx={34} fill={mine ? "#3b78e7" : "#eceff4"} stroke={INK} strokeWidth={3} />
                <text x={mine ? 220 - 165 : -214 + 165} y={12} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700} fontSize={28} fill={mine ? "#fff" : INK}>{m}</text>
              </g>
            );
          })}
          {f >= type + 4 * 26 && f < heart + 20 && (
            <g transform="translate(-160 230)">
              {[0, 1, 2].map((i) => <circle key={i} cx={i * 30} cy={Math.sin(f * 0.4 + i) * 6} r={9} fill="#9aa4b2" />)}
            </g>
          )}
        </g>
        <Hapid x={150} s={0.62} y={GROUND - 196 * 0.62} flip={false} pose={{ t: 0, aR: [70, -80], aL: [-8, -10] }} expr="happy" holdR={() => <g transform="translate(16 -6) rotate(-10)"><Phone w={0.9} /></g>} />
        <Asti x={930} s={0.62} y={GROUND - 196 * 0.62} flip pose={{ t: 0, aR: [70, -80], aL: [-8, -10] }} expr="happy" holdR={() => <g transform="translate(16 -6) rotate(-10)"><Phone w={0.9} /></g>} />
        <Hearts x={540} y={380} f={f} at={heart} n={6} spread={380} />
        {f >= meet && <Bubble x={540} y={1200} w={640} text="PENGEN KETEMU LANGSUNG..." size={44} tail={0} />}
      </World>
      <Grade />
      <Tag label="BERMULA DARI CHAT" from={0} to={heart} color="#3b78e7" />
      <Caps ids={["chat_1", "chat_2"]} hl={["Facebook", "sapa", "setiap", "hari", "obrolkan", "bertemu"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. RENCANA                                                           */
/* ================================================================== */
export const SceneAncolRencana: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ask = EV("rencana.ask");
  const yes = EV("rencana.yes");
  const vou = EV("rencana.voucher");
  const k = spring({ frame: f - vou, fps: 30, config: { damping: 9, stiffness: 150 } });
  const cam = camAt(f, [{ to: yes, f0: [540, 1020], z0: 1.2, f1: [540, 1010], z1: 1.1 }, { to: 9999, f0: [540, 1000], z0: 1.1, f1: [540, 960], z1: 1.0 }]);
  return (
    <AbsoluteFill style={{ background: "#bfe8ff" }}>
      <World cam={cam}>
        <Ancol t={t} />
        <Hapid x={330} pose={f >= ask ? { t: 2, aR: [150, -20], aL: [-8, -10] } : { t: 0, aR: [20, -10], aL: [-8, -10] }} expr="happy" />
        <Asti x={760} flip pose={f >= yes ? { t: 0, aR: [150, -20], aL: [-8, -10] } : { t: 0, aR: [14, -10], aL: [-8, -10] }} expr={f >= yes ? "happy" : "neutral"} />
        {f >= ask && f < yes + 6 && <Bubble x={330} y={640} w={500} text="KE ANCOL YUK?" size={50} tail={0} />}
        {f >= yes && f < vou + 14 && <Bubble x={780} y={700} w={420} text="BOLEH, KAK!" size={52} tail={0} />}
        {f >= vou && (
          <g transform={`translate(540 560) rotate(-6) scale(${0.3 + 0.7 * k})`} opacity={cl(k * 1.4)}>
            <path d="M -300 -110 L 300 -110 L 300 -30 A 30 30 0 0 0 300 30 L 300 110 L -300 110 L -300 30 A 30 30 0 0 0 -300 -30 Z" fill="#ffd23f" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
            <line x1={150} y1={-110} x2={150} y2={110} stroke={INK} strokeWidth={5} strokeDasharray="14 12" />
            <text x={-70} y={-24} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={74} fill={INK}>VOUCHER</text>
            <text x={-70} y={64} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={64} fill="#e03131">DISKON!</text>
            <text x={226} y={20} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={46} fill={INK}>HEMAT</text>
          </g>
        )}
        {f >= vou && [0, 1, 2, 3, 4, 5].map((i) => <Star key={i} x={300 + i * 100} y={420 + ((i * 53) % 60) + Math.sin(f * 0.3 + i) * 8} r={16} fill="#fff6a8" spikes={4} />)}
      </World>
      <Grade />
      <Tag label="RENCANA SERU" from={0} to={yes} color="#ffb703" />
      <Caps ids={["rencana_1", "rencana_2", "rencana_3", "rencana_4"]} hl={["beranikan", "Ancol", "yuk", "Boleh", "voucher", "diskon", "hemat"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. JEMPUT                                                            */
/* ================================================================== */
export const SceneAncolJemput: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const arrive = EV("jemput.arrive");
  const out = EV("jemput.out");
  const look = EV("jemput.look");
  const mx = lerp(-340, 420, smooth(cl((f - 4) / Math.max(20, out - 10))));
  const moving = f < out - 6;
  const ax = f < out ? 820 : lerp(820, 720, smooth(cl((f - out) / 30)));
  const cam = camAt(f, [{ to: out, f0: [420, 1050], z0: 1.15, f1: [480, 1040], z1: 1.2 }, { to: look, f0: [560, 1050], z0: 1.4, f1: [560, 1040], z1: 1.5 }, { to: 9999, f0: [560, 1040], z0: 1.5, f1: [560, 1020], z1: 1.1 }]);
  return (
    <AbsoluteFill style={{ background: "#9fdcff" }}>
      <World cam={cam} shake={shakeAt(f, moving ? [] : [], 0)}>
        <Street t={t} />
        <Motor x={mx} rot={moving ? f * 18 : 0} bounce={moving ? Math.sin(f * 1.6) * 3 : 0} />
        <Hapid x={mx - 20} y={SEAT_Y} pose={sit} expr={f >= look ? "happy" : "neutral"} masked shy={f >= look} />
        {f >= out && <Asti x={ax} flip pose={f < out + 30 ? wk(f, 0.5, 18) : { t: -3, aL: [-8, -10], aR: [20, -30] }} expr={f >= look ? "happy" : "neutral"} shy={f >= look} />}
        {f >= look && <Hearts x={600} y={HIP - 560} f={f} at={look} n={4} spread={160} />}
        {f >= look && f < look + 60 && <Bubble x={560} y={600} w={150} text="..." size={64} tail={0} />}
      </World>
      <Grade />
      <Tag label="HARI H" from={0} to={out} color="#ff6b9a" />
      <Caps ids={["jemput_1", "jemput_2"]} hl={["menjemputnya", "masker", "memandang", "tidak", "malu"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. MALU: pinjam masker                                               */
/* ================================================================== */
export const SceneAncolMalu: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cover = EV("malu.cover");
  const mount = EV("malu.mount");
  const ask = EV("malu.ask");
  const go = EV("malu.go");
  const back = EV("malu.back");
  const MX = 400;
  // Asti: stands covering face -> sits on motor -> hops off, runs to friend, returns masked
  const phase = f < mount ? 0 : f < go ? 1 : f < back ? 2 : 3;
  const toFriend = smooth(cl((f - go) / 26));
  const ret = smooth(cl((f - back - 6) / 26));
  const ax = phase === 0 ? lerp(760, 560, smooth(cl((f - cover) / 24))) : phase === 1 ? MX - 150 : phase === 2 ? lerp(MX - 150, 780, toFriend) : lerp(780, MX - 150, ret);
  const seated = phase === 1 || (phase === 3 && ret >= 1);
  const aPose: Pose = phase === 0 ? { t: -4, aL: [150, -70], aR: [150, -70] } : seated ? sit : { ...wk(f, 0.8, 34), t: 14 };
  const aMasked = f >= back;
  const cam = camAt(f, [{ to: mount, f0: [560, 1040], z0: 1.3, f1: [540, 1030], z1: 1.3 }, { to: go, f0: [520, 1040], z0: 1.25, f1: [520, 1030], z1: 1.2 }, { to: 9999, f0: [600, 1050], z0: 1.1, f1: [580, 1030], z1: 1.0 }]);
  return (
    <AbsoluteFill style={{ background: "#9fdcff" }}>
      <World cam={cam}>
        <Street t={t} door />
        <Motor x={MX} />
        <Hapid x={MX - 20} y={SEAT_Y} pose={sit} expr={f >= go ? "happy" : "neutral"} masked shy />
        {f >= go && Math.floor(f / 5) % 2 === 0 && f < back + 30 && <Onoma frame={f} at={go} x={MX - 20} y={HIP - 520} text="HAHA" size={70} fill="#ffe14d" rot={-6} dur={40} />}
        <Asti x={ax} y={seated ? SEAT_Y : HIP} flip={phase === 0 || (phase === 3 && !seated)} pose={aPose} expr={phase === 0 ? "happy" : "happy"} shy masked={aMasked} />
        {f >= mount - 4 && f < ask + 40 && f >= ask && <Bubble x={ax + 40} y={HIP - 560} w={520} text="SEBENTAR YA, KAK!" size={44} tail={0} />}
        {/* friend */}
        {f >= go + 10 && <Extra x={900} color="#2bb673" hair="#2d2d3a" flip pose={f < back ? { t: 0, aR: [100, -20], aL: [-8, -10] } : { t: 0, aL: [-8, -10], aR: [10, -10] }} expr="happy" />}
        {f >= go + 20 && f < back && <g transform="translate(830 840)"><rect x={-22} y={-14} width={44} height={28} rx={8} fill="#ffd6e7" stroke={INK} strokeWidth={4} /></g>}
        {phase === 0 && <Hearts x={560} y={HIP - 520} f={f} at={cover + 10} n={3} spread={80} />}
      </World>
      <Grade />
      <Tag label="MALU-MALU" from={0} to={mount} color="#ff6b9a" />
      <Caps ids={["malu_1", "malu_2", "malu_3"]} hl={["menutupi", "seolah-olah", "motorku", "sebentar", "pinjam", "masker", "berlari", "tertawa"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. JALAN                                                             */
/* ================================================================== */
export const SceneAncolJalan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const go = EV("jalan.go");
  const heart = EV("jalan.heart");
  const arrive = EV("jalan.arrive");
  const driving = f < arrive + 20;
  const scroll = (f * 14) % 520;
  const cam = camAt(f, [{ to: arrive, f0: [540, 1060], z0: 1.2, f1: [540, 1040], z1: 1.25 }, { to: 9999, f0: [540, 1040], z0: 1.25, f1: [540, 980], z1: 1.0 }]);
  const gate = smooth(cl((f - arrive) / 26));
  return (
    <AbsoluteFill style={{ background: "#9fdcff" }}>
      <World cam={cam}>
        <Sky id="sky_road" a="#8fd6ff" b="#eaf9ff" />
        <Cloud x={((300 - f * 3) % 1500 + 1500) % 1500 - 200} y={380} s={1.2} />
        <Cloud x={((900 - f * 2) % 1500 + 1500) % 1500 - 200} y={520} s={0.9} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={-300 + i * 520 - scroll * 0.6} y={GROUND - 340} width={300} height={340} fill="#d8e7f0" stroke={INK} strokeWidth={6} />)}
        {[0, 1, 2, 3].map((i) => <rect key={i} x={-100 + i * 520 - scroll * 0.6} y={GROUND - 380} width={130} height={380} fill="#c3d7e6" stroke={INK} strokeWidth={6} />)}
        <rect x={-600} y={GROUND - 30} width={2300} height={500} fill="#8d9aa6" />
        <rect x={-600} y={GROUND - 40} width={2300} height={18} fill="#c0cbd5" stroke={INK} strokeWidth={5} />
        {[...Array(7)].map((_, i) => <rect key={i} x={-300 + i * 260 - ((scroll * 1.6) % 260)} y={GROUND + 70} width={120} height={14} rx={7} fill="#f4f4f4" />)}
        <Motor x={540 - (f >= arrive + 8 ? smooth(cl((f - arrive - 8) / 24)) * 0 : 0)} rot={driving ? f * 20 : 0} bounce={driving ? Math.sin(f * 1.7) * 3 : 0} />
        <Hapid x={520} y={SEAT_Y} pose={sit} expr="happy" masked shy />
        <Asti x={390} y={SEAT_Y} pose={{ ...sit, aL: [30, 10], aR: [34, 10] }} expr="happy" masked shy />
        <Hearts x={520} y={HIP - 540} f={f} at={heart} n={5} spread={200} />
        {f >= arrive && (
          <g transform={`translate(${lerp(1500, 540, gate)} 620)`}>
            <path d="M -380 200 L -380 -40 Q 0 -230 380 -40 L 380 200 L 300 200 L 300 -10 Q 0 -150 -300 -10 L -300 200 Z" fill="#ffb703" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
            <rect x={-170} y={-120} width={340} height={96} rx={30} fill="#fff" stroke={INK} strokeWidth={8} />
            <text y={-48} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={72} fill="#1c9ad6" letterSpacing={3}>ANCOL</text>
          </g>
        )}
      </World>
      <Grade />
      <Tag label="MENUJU ANCOL" from={0} to={heart} color="#1c9ad6" />
      <Caps ids={["jalan_1", "jalan_2"]} hl={["berangkat", "berdebar", "Ancol", "malu-malu"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. FOTO                                                              */
/* ================================================================== */
export const SceneAncolFoto: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ask = EV("foto.ask");
  const say = EV("foto.say");
  const flash = EV("foto.flash");
  const laugh = EV("foto.laugh");
  const fl = f >= flash ? interpolate(f, [flash, flash + 3, flash + 14], [0, 1, 0], clamp) : 0;
  const lau = f >= laugh ? Math.sin((f - laugh) * 1.3) * 3 : 0;
  const cam = camAt(f, [{ to: say, f0: [560, 1040], z0: 1.1, f1: [540, 1030], z1: 1.25 }, { to: laugh, f0: [560, 1040], z0: 1.35, f1: [580, 1030], z1: 1.35 }, { to: 9999, f0: [600, 1040], z0: 1.3, f1: [540, 980], z1: 1.0 }]);
  return (
    <AbsoluteFill style={{ background: "#bfe8ff" }}>
      <World cam={cam}>
        <Ancol t={t} />
        <Hapid x={f < ask ? 520 : 690} pose={f >= ask && f < say ? { t: 0, aR: [110, -20], aL: [-8, -10] } : { t: lau, aL: [-8, -10], aR: [10, -10] }} expr={f >= laugh ? "happy" : "neutral"} masked shy holdR={f >= ask && f < say + 20 ? () => <g transform="translate(12 -6) rotate(-10)"><Phone w={0.9} /></g> : undefined} />
        <Asti x={880} flip pose={{ t: lau, aL: [-8, -10], aR: [12, -20] }} expr={f >= laugh ? "happy" : "neutral"} masked shy />
        <Extra x={300} color="#ffb703" hair="#5a3a22" pose={f < say + 24 ? { t: 0, aR: [150, -20], aL: [-8, -10] } : { t: 0, aL: [-8, -10], aR: [80, -20] }} expr="happy" holdR={f < say + 24 ? () => <g transform="translate(12 -6) rotate(-10)"><Phone w={0.9} /></g> : undefined} />
        {f >= say && f < laugh + 10 && <Bubble x={330} y={560} w={560} text="SEMOGA LANGGENG YA, KAK!" size={42} tail={0} />}
        {f >= laugh && <Onoma frame={f} at={laugh} x={780} y={HIP - 540} text="HAHAHA" size={72} fill="#ffe14d" rot={-6} dur={50} />}
        {f >= laugh && <Hearts x={790} y={HIP - 560} f={f} at={laugh + 8} n={4} spread={200} />}
      </World>
      <Grade />
      <AbsoluteFill style={{ background: "#fff", opacity: fl }} />
      <Tag label="FOTO BERDUA" from={0} to={say} color="#ffb703" />
      <Caps ids={["foto_1", "foto_2", "foto_3"]} hl={["berfoto", "memotret", "langgeng", "tertawa", "belum"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. MUTER                                                             */
/* ================================================================== */
export const SceneAncolMuter: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const start = EV("muter.start");
  const mual = EV("muter.mual");
  const fun = EV("muter.fun");
  const ride = f < mual;
  const spd = 0.04 + 0.22 * smooth(cl((f - start) / 40));
  const ang = f * spd * 6;
  const R = 330;
  const cx = 540;
  const cy = 820;
  const cam = camAt(f, [{ to: mual, f0: [540, 900], z0: 1.0, f1: [540, 900], z1: 1.05 }, { to: 9999, f0: [560, 1040], z0: 1.4, f1: [560, 1020], z1: 1.15 }]);
  return (
    <AbsoluteFill style={{ background: "#bfe8ff" }}>
      <World cam={cam} shake={ride && f > start + 20 ? shakeAt(f, [f], 4, 2) : [0, 0]}>
        <Ancol t={t} />
        {ride ? (
          <g>
            <rect x={cx - 24} y={cy} width={48} height={GROUND - cy} fill="#9aa4b2" stroke={INK} strokeWidth={8} />
            <g transform={`rotate(${ang} ${cx} ${cy})`}>
              <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="#e63946" strokeWidth={26} strokeLinecap="round" />
              <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={INK} strokeWidth={5} strokeLinecap="round" opacity={0.3} />
            </g>
            <circle cx={cx} cy={cy} r={42} fill="#ffd23f" stroke={INK} strokeWidth={9} />
            {[0, 180].map((a) => {
              const rad = ((ang + a) * Math.PI) / 180;
              const gx = cx + R * Math.cos(rad);
              const gy = cy + R * Math.sin(rad);
              return (
                <g key={a} transform={`translate(${gx} ${gy})`}>
                  <rect x={-170} y={-20} width={340} height={196} rx={36} fill={a === 0 ? "#6ec6ff" : "#ffd23f"} stroke={INK} strokeWidth={9} />
                  {a === 0 ? (
                    <g>
                      <Hapid x={-68} y={140} s={0.56} pose={{ t: 0, aL: [150, 0], aR: [150, 0] }} expr="happy" masked />
                      <Asti x={72} y={140} s={0.56} pose={{ t: 4, aL: [-6, -10], aR: [10, -10] }} expr="pain" masked />
                    </g>
                  ) : null}
                </g>
              );
            })}
          </g>
        ) : (
          <g>
            <Asti x={420} pose={{ t: 20, aR: [50, 60], aL: [-20, -10], lL: [-4, 0], lR: [10, 0] }} expr="pain" masked />
            <Hapid x={760} flip pose={{ t: 0, aL: [150 + Math.sin(f * 0.8) * 10, 0], aR: [150 - Math.sin(f * 0.8) * 10, 0] }} expr="happy" masked />
            {[0, 1, 2].map((i) => <Star key={i} x={420 + Math.cos(f * 0.3 + i * 2.1) * 90} y={HIP - 540 + Math.sin(f * 0.3 + i * 2.1) * 26} r={16} fill="#ffe14d" spikes={5} rot={f * 6} />)}
            {f >= fun && <Onoma frame={f} at={fun} x={780} y={HIP - 560} text="SERU!" size={84} fill="#ffb703" rot={-8} dur={50} />}
          </g>
        )}
        {f >= mual && f < mual + 60 && <Bubble x={420} y={HIP - 640} w={420} text="AKU MUAL..." size={44} tail={0} />}
      </World>
      <Grade />
      <Tag label="WAHANA PERTAMA" from={0} to={mual} color="#ff6b6b" />
      <Caps ids={["muter_1", "muter_2", "muter_3"]} hl={["mengantre", "berputar-putar", "mual", "seru", "banget"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 8. MINUM                                                             */
/* ================================================================== */
const Bottle: React.FC<{ c?: string }> = ({ c = "#6ec6ff" }) => (
  <g>
    <rect x={-14} y={-46} width={28} height={80} rx={9} fill={c} stroke={INK} strokeWidth={5} />
    <rect x={-8} y={-62} width={16} height={18} rx={4} fill="#fff" stroke={INK} strokeWidth={5} />
  </g>
);
export const SceneAncolMinum: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const want = EV("minum.want");
  const turn = EV("minum.turn");
  const drink = EV("minum.drink");
  const turned = f >= turn;
  const sip = f >= drink ? Math.abs(Math.sin((f - drink) * 0.3)) : 0;
  const cam = camAt(f, [{ to: turn, f0: [540, 1040], z0: 1.3, f1: [540, 1030], z1: 1.35 }, { to: 9999, f0: [540, 1040], z0: 1.35, f1: [540, 990], z1: 1.1 }]);
  return (
    <AbsoluteFill style={{ background: "#bfe8ff" }}>
      <World cam={cam}>
        <Ancol t={t} />
        <rect x={-100} y={1250} width={1300} height={30} rx={8} fill="#c8743a" stroke={INK} strokeWidth={8} opacity={0} />
        <Hapid x={turned ? 440 : 340} flip={turned} pose={turned ? { t: -4, aR: [lerp(40, 150, sip), -70], aL: [140, -80] } : { t: 0, aR: [70, -30], aL: [-8, -10] }} expr={turned ? "happy" : "neutral"} masked shy holdR={() => <g transform="translate(10 -8) rotate(-12)"><Bottle /></g>} />
        <Asti x={turned ? 650 : 760} flip={!turned} pose={turned ? { t: 4, aR: [lerp(40, 150, sip), -70], aL: [140, -80] } : { t: 0, aR: [70, -30], aL: [-8, -10] }} expr={turned ? "happy" : "neutral"} masked shy holdR={() => <g transform="translate(10 -8) rotate(-12)"><Bottle c="#ffa8c8" /></g>} />
        {f >= want && f < turn && <Bubble x={340} y={720} w={300} text="HMM..." size={50} tail={0} />}
        {f >= want && f < turn && <Bubble x={780} y={720} w={300} text="HMM..." size={50} tail={0} />}
        {f >= drink && f < drink + 60 && <Onoma frame={f} at={drink} x={540} y={HIP - 560} text="GLEK" size={80} fill="#9bd6ff" rot={-4} dur={50} />}
        {turned && <Sweat x={500} y={HIP - 520} t={t} />}
      </World>
      <Grade />
      <Tag label="HAUS TAPI MALU" from={0} to={turn} color="#2aa6c9" />
      <Caps ids={["minum_1", "minum_2"]} hl={["minum", "tidak", "masker", "bergantian", "membelakangi", "Malu"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 9. ESKRIM                                                            */
/* ================================================================== */
const Cone: React.FC<{ scoops?: number }> = ({ scoops = 1 }) => (
  <g>
    <path d="M -22 -10 L 22 -10 L 0 70 Z" fill="#e0a85b" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    <path d="M -12 5 L 12 5 M -8 25 L 8 25" stroke="#a8672a" strokeWidth={3} />
    {scoops >= 1 && <circle cy={-24} r={28} fill="#ffb3d1" stroke={INK} strokeWidth={5} />}
    {scoops >= 2 && <circle cy={-64} r={24} fill="#fff1a8" stroke={INK} strokeWidth={5} />}
  </g>
);
export const SceneAncolEskrim: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const buy = EV("eskrim.buy");
  const drop = EV("eskrim.drop");
  const sigh = EV("eskrim.sigh");
  const mk = EV("eskrim.mask");
  const dk = smooth(cl((f - drop) / 14));
  const maskOff = f >= mk + 12;
  const rev = smooth(cl((f - mk - 12) / 14));
  const cam = camAt(f, [{ to: drop, f0: [540, 1040], z0: 1.25, f1: [560, 1040], z1: 1.3 }, { to: mk, f0: [560, 1060], z0: 1.4, f1: [560, 1060], z1: 1.45 }, { to: 9999, f0: [560, 1040], z0: 1.5, f1: [560, 1000], z1: 1.0 }]);
  return (
    <AbsoluteFill style={{ background: "#bfe8ff" }}>
      <World cam={cam}>
        <Ancol t={t} />
        {/* ice cream cart */}
        <g transform="translate(180 1400)">
          <rect x={-110} y={-250} width={220} height={190} rx={14} fill="#fff" stroke={INK} strokeWidth={9} />
          <rect x={-110} y={-280} width={220} height={44} rx={10} fill="#ff6b9a" stroke={INK} strokeWidth={9} />
          <circle cx={-60} cy={-40} r={34} fill="#555" stroke={INK} strokeWidth={8} />
          <circle cx={60} cy={-40} r={34} fill="#555" stroke={INK} strokeWidth={8} />
          <text y={-130} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={54} fill="#ff6b9a">ES KRIM</text>
          <path d="M -130 -280 Q 0 -400 130 -280 Z" fill="#ffe14d" stroke={INK} strokeWidth={9} />
        </g>
        <Hapid x={540} pose={f < drop ? { t: 0, aR: [lerp(30, 90, smooth(cl((f - buy) / 20))), -50], aL: [-8, -10] } : { t: 2, aR: [20, -10], aL: [-8, -10] }} expr={f < drop ? "happy" : f < mk ? "pain" : "happy"} masked={!maskOff} shy holdR={f < drop ? () => <g transform="translate(14 -10)"><Cone scoops={2} /></g> : undefined} />
        <Asti x={820} flip pose={{ t: 0, aR: [lerp(30, 90, smooth(cl((f - buy) / 20))), -50], aL: [-8, -10] }} expr={f >= sigh && f < mk ? "surprised" : "happy"} masked={!maskOff} shy holdR={() => <g transform="translate(14 -10)"><Cone scoops={1} /></g>} />
        {f >= drop && <g transform={`translate(${590 + dk * 30} ${lerp(HIP - 310, GROUND - 24, dk)}) rotate(${dk * 60})`}><Cone scoops={f > drop + 14 ? 0 : 2} /></g>}
        {f >= drop + 12 && <ellipse cx={622} cy={GROUND - 12} rx={60} ry={14} fill="#ffb3d1" stroke={INK} strokeWidth={5} />}
        {f >= drop + 8 && f < drop + 56 && <Onoma frame={f} at={drop + 8} x={560} y={HIP - 420} text="PLOP" size={86} fill="#ffb3d1" rot={-6} dur={44} />}
        {f >= sigh && f < mk && <Bubble x={830} y={HIP - 620} w={460} text="YAH, ES KRIMNYA!" size={40} tail={0} />}
        {f >= mk + 8 && (
          <g>
            {rev > 0 && [0, 1, 2, 3, 4, 5].map((i) => <Star key={i} x={680 + Math.cos(i * 1.05) * 160 * rev} y={HIP - 460 + Math.sin(i * 1.05) * 90 * rev} r={14} fill="#fff6a8" spikes={4} rot={f * 5} />)}
            <Hearts x={680} y={HIP - 520} f={f} at={mk + 14} n={6} spread={300} />
            <g transform={`translate(${520 + (f - mk - 8) * 9} ${HIP - 380 + (f - mk - 8) * (f - mk - 8) * 1.2}) rotate(${(f - mk) * 18})`} opacity={cl(1 - (f - mk - 8) / 30)}>{mask("#bfe6ff")}</g>
          </g>
        )}
      </World>
      <Grade />
      <Tag label="BUKA MASKER!" from={mk} to={mk + 60} color="#ff6b9a" />
      <Caps ids={["eskrim_1", "eskrim_2", "eskrim_3"]} hl={["krim", "jatuh", "Yah", "sepakat", "membuka", "bersama-sama"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 10. BIANG LALA                                                       */
/* ================================================================== */
export const SceneAncolBiang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ride = EV("biang.ride");
  const view = EV("biang.view");
  const say = EV("biang.say");
  const smile = EV("biang.smile");
  const cx = 540;
  const cy = 860;
  const R = 470;
  const ang = -90 + f * 0.35;
  const cabin = (a: number) => {
    const rad = (a * Math.PI) / 180;
    return [cx + R * Math.cos(rad), cy + R * Math.sin(rad)] as [number, number];
  };
  const mine = cabin(ang + 140);
  const kk = smooth(cl((f - ride) / 160));
  const z = lerp(2.6, 1.0, kk);
  const camX = lerp(mine[0], 540, kk);
  const camY = lerp(mine[1], 880, kk);
  const cam = { fx: camX, fy: camY, z, r: 0 };
  return (
    <AbsoluteFill style={{ background: "#ffb48a" }}>
      <World cam={cam} dy={140 * kk}>
        <Sky id="sky_bi" a="#ff9f7a" b="#ffe3b8" />
        <circle cx={800} cy={1050} r={150} fill="#fff1b8" opacity={0.95} />
        <rect x={-600} y={1100} width={2300} height={500} fill="#6fa8d6" />
        {[...Array(9)].map((_, i) => <path key={i} d={`M ${-100 + i * 150} ${1160 + (i % 3) * 40} q 40 -22 80 0`} stroke="#fff" strokeWidth={6} fill="none" opacity={0.7} transform={`translate(${Math.sin(t * 1.4 + i) * 10} 0)`} />)}
        <rect x={-600} y={1400} width={2300} height={500} fill="#e8c6a0" />
        <path d={`M ${cx - 150} ${GROUND} L ${cx} ${cy} L ${cx + 150} ${GROUND}`} stroke="#9aa4b2" strokeWidth={26} fill="none" strokeLinejoin="round" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e63946" strokeWidth={14} />
        <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke="#ffd23f" strokeWidth={8} />
        {[...Array(12)].map((_, i) => {
          const a = ((ang + i * 30) * Math.PI) / 180;
          return <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} stroke="#e63946" strokeWidth={8} />;
        })}
        <circle cx={cx} cy={cy} r={34} fill="#ffd23f" stroke={INK} strokeWidth={8} />
        {[...Array(12)].map((_, i) => {
          const [gx, gy] = cabin(ang + i * 30);
          const isMine = i === 4;
          return (
            <g key={i} transform={`translate(${gx} ${gy})`}>
              <line x1={0} y1={-60} x2={0} y2={0} stroke={INK} strokeWidth={5} />
              <rect x={-64} y={0} width={128} height={104} rx={20} fill={isMine ? "#ffd6e7" : ["#6ec6ff", "#9be7a6", "#ffe14d"][i % 3]} stroke={INK} strokeWidth={7} />
              {isMine && (
                <g>
                  <Hapid x={-24} y={92} s={0.34} pose={{ t: 0, aL: [-8, -10], aR: [14, -20] }} expr="happy" shy />
                  <Asti x={22} y={92} s={0.34} flip pose={{ t: 0, aL: [-8, -10], aR: [14, -20] }} expr="happy" shy />
                </g>
              )}
              <rect x={-64} y={52} width={128} height={52} rx={12} fill={isMine ? "#ffd6e7" : ["#6ec6ff", "#9be7a6", "#ffe14d"][i % 3]} stroke={INK} strokeWidth={7} />
            </g>
          );
        })}
        {[0, 1, 2].map((i) => <path key={i} d={`M ${200 + i * 260 + Math.sin(t + i) * 30} ${360 + i * 60} q 20 -26 40 0 q 20 -26 40 0`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />)}
        <Hearts x={mine[0]} y={mine[1] - 60} f={f} at={say + 10} n={5} spread={160} />
        <Hearts x={mine[0]} y={mine[1] - 60} f={f} at={smile} n={5} spread={200} />
      </World>
      <Grade />
      <Tag label="BIANG LALA" from={0} to={view} color="#ff9f43" />
      <Caps ids={["biang_1", "biang_2", "biang_3"]} hl={["biang", "lala", "indah", "Indah", "banget", "tersenyum", "berharap", "berhenti"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 11. MAKAN                                                            */
/* ================================================================== */
const Resto: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <rect x={-600} y={-600} width={2300} height={2000} fill="#ffe9c9" />
    {[...Array(8)].map((_, i) => <line key={i} x1={-600 + i * 260} y1={-600} x2={-600 + i * 260} y2={GROUND} stroke="#f2d3a0" strokeWidth={6} />)}
    <rect x={-600} y={GROUND} width={2300} height={900} fill="#c8955a" />
    <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#8a5a30" stroke={INK} strokeWidth={5} />
    {[0, 1, 2].map((i) => <g key={i} transform={`translate(${220 + i * 330} 330)`}><line x1={0} y1={-400} x2={0} y2={0} stroke={INK} strokeWidth={5} /><path d="M -50 0 L 50 0 L 34 -60 L -34 -60 Z" fill="#ffd23f" stroke={INK} strokeWidth={7} /></g>)}
    {/* table */}
    <g transform="translate(300 1400)">
      <rect x={-210} y={-250} width={420} height={32} rx={8} fill="#c8743a" stroke={INK} strokeWidth={9} />
      <rect x={-170} y={-220} width={30} height={220} fill="#a85f2e" stroke={INK} strokeWidth={8} />
      <rect x={140} y={-220} width={30} height={220} fill="#a85f2e" stroke={INK} strokeWidth={8} />
      <ellipse cx={-90} cy={-262} rx={64} ry={14} fill="#fff" stroke={INK} strokeWidth={6} />
      <ellipse cx={-90} cy={-276} rx={44} ry={12} fill="#e08a2c" stroke={INK} strokeWidth={4} />
      <ellipse cx={90} cy={-262} rx={64} ry={14} fill="#fff" stroke={INK} strokeWidth={6} />
      <ellipse cx={90} cy={-276} rx={44} ry={12} fill="#7ac74f" stroke={INK} strokeWidth={4} />
    </g>
    {/* counter */}
    <g transform="translate(900 1400)">
      <rect x={-170} y={-230} width={340} height={230} fill="#fff" stroke={INK} strokeWidth={10} />
      <rect x={-190} y={-262} width={380} height={40} rx={8} fill="#c8743a" stroke={INK} strokeWidth={9} />
      <rect x={-60} y={-340} width={120} height={78} rx={10} fill="#cfd8e3" stroke={INK} strokeWidth={8} />
      <text y={-170} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={52} fill="#e03131">KASIR</text>
    </g>
  </g>
);
export const SceneAncolMakan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const pay = EV("makan.pay");
  const drop = EV("makan.drop");
  const give = EV("makan.give");
  const thanks = EV("makan.thanks");
  const talk = EV("makan.talk");
  const dk = smooth(cl((f - drop) / 12));
  const pk = smooth(cl((f - give) / 22));
  const hx = f < talk - 20 ? lerp(540, 760, smooth(cl((f - 4) / 20))) : lerp(760, 480, smooth(cl((f - talk + 20) / 36)));
  const atTable = f >= talk + 16;
  const cam = camAt(f, [{ to: give, f0: [700, 1040], z0: 1.25, f1: [720, 1040], z1: 1.35 }, { to: talk - 20, f0: [700, 1040], z0: 1.3, f1: [660, 1040], z1: 1.3 }, { to: 9999, f0: [440, 1040], z0: 1.3, f1: [520, 1000], z1: 1.0 }]);
  const bows = f >= thanks && f < thanks + 40;
  return (
    <AbsoluteFill style={{ background: "#ffe9c9" }}>
      <World cam={cam}>
        <Resto t={t} />
        <Extra x={f < give ? 1000 : lerp(1000, 800, pk)} color="#2bb673" hair="#2d2d3a" flip pose={f >= give && pk < 1 ? { ...wk(f, 0.6, 18), aR: [100, -20] } : { t: 0, aL: [-8, -10], aR: [10, -10] }} expr="happy" />
        {f >= give && <g transform={`translate(${lerp(1000, 800, pk) - 80} ${HIP - 190})`}><rect x={-26} y={-18} width={52} height={34} rx={6} fill="#8b5a2b" stroke={INK} strokeWidth={5} /></g>}
        <Hapid x={hx} flip={f >= talk - 20 && !atTable ? true : atTable ? false : false} pose={bows ? { t: 14, aL: [90, -90], aR: [90, -90] } : f < talk - 20 ? { t: 0, aR: [lerp(30, 100, smooth(cl((f - pay) / 16))), -30], aL: [-8, -10] } : atTable ? { t: Math.sin(f * 0.3) * 2, aR: [60 + Math.sin(f * 0.5) * 12, -40], aL: [-8, -10] } : wk(f, 0.5, 20)} expr={f >= thanks ? "happy" : f >= drop ? "surprised" : "neutral"} />
        {f >= drop && f < give && <g transform={`translate(${hx - 20} ${lerp(HIP + 30, GROUND - 20, dk)}) rotate(${dk * 40})`}><rect x={-26} y={-18} width={52} height={34} rx={6} fill="#8b5a2b" stroke={INK} strokeWidth={5} /></g>}
        {f >= drop && f < drop + 40 && <Onoma frame={f} at={drop} x={hx - 40} y={HIP - 300} text="PLUK" size={70} fill="#ffb86b" rot={-6} dur={36} />}
        <Asti x={300 - 20} pose={f >= talk ? { t: Math.sin(f * 0.3) * 2, aR: [50 + Math.sin(f * 0.45 + 1) * 14, -40], aL: [-8, -10] } : { t: 0, aL: [-8, -10], aR: [10, -10] }} expr="happy" />
        {f >= give && f < thanks && <Bubble x={820} y={HIP - 560} w={520} text="MAS, DOMPETNYA JATUH!" size={36} tail={0} />}
        {f >= talk + 10 && [0, 1, 2].map((i) => <Heart key={i} x={400 + Math.sin(f * 0.1 + i * 2) * 40} y={HIP - 540 - ((f - talk + i * 20) % 60) * 2.2} s={0.6} o={0.8} c="#ff8fb1" />)}
        {atTable && f % 40 < 24 && <Bubble x={250} y={HIP - 620} w={160} text="..." size={54} tail={20} />}
      </World>
      <Grade />
      <Tag label={f >= talk ? "NGOBROL HANGAT" : "MAKAN SIANG"} from={0} to={9999} color="#ff9f43" />
      <Caps ids={["makan_1", "makan_2", "makan_3", "makan_4"]} hl={["membayar", "dompetku", "jatuh", "dompetnya", "Alhamdulillah", "baik", "ngobrol", "kenal", "lama"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 12. COASTER                                                          */
/* ================================================================== */
const trackY = (x: number) => 1180 - 760 * Math.exp(-Math.pow((x - 280) / 170, 2)) - 480 * Math.exp(-Math.pow((x - 800) / 140, 2));
const trackPt = (u: number): [number, number, number] => {
  const x = -150 + 1380 * u;
  const y = trackY(x);
  const ang = (Math.atan2(trackY(x + 6) - trackY(x - 6), 12) * 180) / Math.PI;
  return [x, y, ang];
};
export const SceneAncolCoaster: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const queue = EV("coaster.queue");
  const nerv = EV("coaster.nerv");
  const go = EV("coaster.go");
  const scream = EV("coaster.scream");
  const dizzy = EV("coaster.dizzy");
  const ridePhase = f >= go && f < dizzy - 6;
  const raw = cl((f - go) / Math.max(30, dizzy - go - 10));
  const u = Math.pow(raw, 1.5);
  const [cx0, cy0, ca] = trackPt(u);
  const cam = f < nerv ? camAt(f, [{ to: nerv, f0: [540, 1060], z0: 1.1, f1: [540, 1040], z1: 1.2 }, { to: 9999, f0: [540, 1060], z0: 1.2, f1: [540, 1040], z1: 1.2 }]) : f < go ? camAt(f - nerv, [{ to: 9999, f0: [420, 1080], z0: 1.6, f1: [440, 1060], z1: 1.5 }]) : f < dizzy - 6 ? { fx: 540, fy: 820, z: 1.0, r: 0 } : camAt(f - dizzy, [{ to: 9999, f0: [540, 1050], z0: 1.4, f1: [540, 1000], z1: 1.1 }]);
  const pts: string[] = [];
  for (let x = -200; x <= 1280; x += 10) pts.push(`${x},${trackY(x)}`);
  return (
    <AbsoluteFill style={{ background: "#bfe8ff" }}>
      <World cam={cam} shake={ridePhase && f > scream ? shakeAt(f, [f], 6, 2) : [0, 0]}>
        <Ancol t={t} />
        {ridePhase || (f >= go - 4 && f < dizzy) ? (
          <g>
            {[...Array(14)].map((_, i) => <line key={i} x1={-120 + i * 100} y1={trackY(-120 + i * 100)} x2={-120 + i * 100} y2={GROUND} stroke="#9aa4b2" strokeWidth={10} />)}
            <polyline points={pts.join(" ")} fill="none" stroke={INK} strokeWidth={26} strokeLinejoin="round" />
            <polyline points={pts.join(" ")} fill="none" stroke="#e63946" strokeWidth={14} strokeLinejoin="round" />
            <g transform={`translate(${cx0} ${cy0 - 20}) rotate(${ca})`}>
              <rect x={-110} y={-40} width={220} height={52} rx={16} fill="#ffd23f" stroke={INK} strokeWidth={8} />
              <Hapid x={-50} y={-26 + 0} s={0.44} pose={{ t: 0, aL: [160, 0], aR: [160, 0], lL: [60, -60], lR: [60, -60] }} expr={f >= scream ? "surprised" : "neutral"} shy />
              <Asti x={50} y={-26} s={0.44} pose={{ t: 0, aL: [160, 0], aR: [160, 0], lL: [60, -60], lR: [60, -60] }} expr={f >= scream ? "surprised" : "neutral"} shy />
            </g>
            {f >= scream && <Onoma frame={f} at={scream} x={540} y={520} text="AAAAA!" size={110} fill="#ffb703" rot={-6} dur={60} />}
          </g>
        ) : f < queue + 40 || f < nerv ? (
          <g>
            {[...Array(8)].map((_, i) => <Extra key={i} x={140 + i * 120 - (f * 0.3) % 20} s={0.52} y={GROUND - 196 * 0.52} color={["#2bb673", "#ffb703", "#6ec6ff", "#b388ff"][i % 4]} hair={["#2d2d3a", "#5a3a22"][i % 2]} pose={{ ...wk(f + i * 7, 0.2, 6), t: 0 }} expr="neutral" />)}
            <rect x={80} y={1090} width={880} height={14} rx={6} fill="#9aa4b2" stroke={INK} strokeWidth={5} />
            <Hapid x={760} s={0.64} y={GROUND - 196 * 0.64} pose={{ t: 0, aL: [-8, -10], aR: [10, -10] }} expr="neutral" shy flip />
            <Asti x={870} s={0.64} y={GROUND - 196 * 0.64} pose={{ t: 0, aL: [-8, -10], aR: [10, -10] }} expr="neutral" shy flip />
            <g transform="translate(540 700)"><rect x={-310} y={-60} width={620} height={110} rx={30} fill="#e03131" stroke={INK} strokeWidth={9} /><text y={20} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={64} fill="#fff">ROLLER COASTER</text></g>
          </g>
        ) : f < go ? (
          <g>
            <Asti x={430} pose={{ t: 0, aL: [-8, -10], aR: [40, -20] }} expr="surprised" shy />
            <Sweat x={470} y={HIP - 520} t={t} />
            <Heart x={620} y={HIP - 420} s={1.6 + 0.4 * Math.sin(f * 0.8)} />
            <Hapid x={760} flip pose={{ t: 0, aL: [-8, -10], aR: [14, -10] }} expr="happy" shy />
          </g>
        ) : (
          <g>
            <Asti x={420} pose={{ t: 12 * Math.sin(f * 0.3), aR: [50, 60], aL: [-20, -10] }} expr="pain" shy />
            <Hapid x={760} flip pose={{ t: -10 * Math.sin(f * 0.3), aL: [150, 0], aR: [150, 0] }} expr="happy" shy />
            {[0, 1, 2].map((i) => <Star key={i} x={420 + Math.cos(f * 0.35 + i * 2.1) * 90} y={HIP - 540 + Math.sin(f * 0.35 + i * 2.1) * 26} r={16} fill="#ffe14d" spikes={5} rot={f * 6} />)}
            <Hearts x={600} y={HIP - 560} f={f} at={dizzy + 20} n={5} spread={300} />
          </g>
        )}
      </World>
      <Grade />
      <Tag label={f < nerv ? "ANTRE PANJANG" : f < go ? "DEG-DEGAN" : f < dizzy ? "SERUUU!" : "PUSING TAPI HAPPY"} from={0} to={9999} color="#e03131" />
      <Caps ids={["coaster_1", "coaster_2", "coaster_3", "coaster_4"]} hl={["ekstrem", "Roller", "coaster", "panjang", "deg-degan", "seru", "banget", "berteriak", "pusing", "bahagia"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 13. PULANG                                                           */
/* ================================================================== */
export const SceneAncolPulang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ride = EV("pulang.ride");
  const arr = EV("pulang.arrive");
  const thanks = EV("pulang.thanks");
  const reply = EV("pulang.reply");
  const mx = lerp(-340, 420, smooth(cl((f - 2) / Math.max(20, arr - 6))));
  const moving = f < arr;
  const off = smooth(cl((f - arr) / 20));
  const ax = lerp(mx - 150, 640, off);
  const enter = f >= reply + 50 ? smooth(cl((f - reply - 50) / 24)) : 0;
  const cam = camAt(f, [{ to: arr, f0: [420, 1050], z0: 1.15, f1: [480, 1040], z1: 1.2 }, { to: reply + 40, f0: [560, 1040], z0: 1.45, f1: [560, 1030], z1: 1.4 }, { to: 9999, f0: [600, 1040], z0: 1.4, f1: [560, 1000], z1: 1.1 }]);
  return (
    <AbsoluteFill style={{ background: "#ffb48a" }}>
      <World cam={cam}>
        <Street t={t} dusk={1} />
        <Motor x={mx} rot={moving ? f * 18 : 0} bounce={moving ? Math.sin(f * 1.6) * 3 : 0} />
        <Hapid x={mx - 20} y={SEAT_Y} pose={f >= reply ? { t: 0, aR: [150 + Math.sin(f * 0.6) * 14, -10], aL: [40, 6], lL: [85, -85], lR: [78, -80] } : sit} expr="happy" shy />
        {f < arr ? (
          <Asti x={mx - 150} y={SEAT_Y} pose={sit} expr="happy" shy />
        ) : (
          <Asti x={ax} flip={f < reply + 50} y={lerp(SEAT_Y, HIP, off)} pose={f < arr + 22 ? { ...wk(f, 0.6, 16), t: 6 } : f < thanks + 30 ? { t: 12, aL: [90, -90], aR: [90, -90] } : f < reply + 50 ? { t: 0, aR: [150 + Math.sin(f * 0.6) * 14, -10], aL: [-8, -10] } : wk(f, 0.5, 18)} expr="happy" shy />
        )}
        {f >= thanks && f < reply && <Bubble x={640} y={HIP - 560} w={600} text="MAKASIH YA, KAK HAPID!" size={42} tail={0} />}
        {f >= reply && f < reply + 50 && <Bubble x={420} y={HIP - 610} w={520} text="SAMA-SAMA, DEK!" size={46} tail={0} />}
        <Hearts x={540} y={HIP - 560} f={f} at={reply} n={6} spread={320} />
      </World>
      <Grade />
      <Tag label="HARI MULAI PETANG" from={0} to={arr} color="#ff7b54" />
      <Caps ids={["pulang_1", "pulang_2", "pulang_3"]} hl={["petang", "antar", "kosannya", "Makasih", "seru", "Sama-sama", "Hati-hati"]} color="#ffb3cf" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 14. AKHIR                                                            */
/* ================================================================== */
export const SceneAncolAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const smile = EV("akhir.smile");
  const sunset = EV("akhir.sunset");
  const mx = lerp(-300, 440, smooth(cl(f / 70)));
  const kk = smooth(cl(f / 240));
  const cam = { fx: lerp(mx, 540, kk), fy: lerp(1060, 940, kk), z: lerp(1.7, 1.0, kk), r: 0 };
  const title = smooth(cl((f - sunset) / 20));
  return (
    <AbsoluteFill style={{ background: "#ff9f7a" }}>
      <World cam={cam} dy={140 * kk}>
        <Sky id="sky_ak" a="#ff8f6b" b="#ffd9a0" />
        <circle cx={800} cy={900} r={190} fill="#fff1b8" />
        <rect x={-600} y={1000} width={2300} height={400} fill="#8aa6d6" opacity={0.8} />
        <rect x={-600} y={GROUND - 30} width={2300} height={500} fill="#6e5c7a" />
        <rect x={-600} y={GROUND - 40} width={2300} height={18} fill="#a38aa0" stroke={INK} strokeWidth={5} />
        {[...Array(7)].map((_, i) => <rect key={i} x={-300 + i * 260 - ((f * 6) % 260)} y={GROUND + 70} width={120} height={14} rx={7} fill="#f4f4f4" opacity={0.8} />)}
        {[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${200 + i * 330 - ((f * 3) % 330)} ${GROUND - 40})`}><line y1={0} y2={-420} stroke={INK} strokeWidth={9} /><circle cy={-430} r={18} fill="#fff1b8" stroke={INK} strokeWidth={5} /></g>)}
        <Motor x={mx} rot={f * 16} bounce={Math.sin(f * 1.5) * 3} />
        <Hapid x={mx - 20} y={SEAT_Y} pose={sit} expr="happy" shy />
        <Hearts x={mx} y={HIP - 560} f={f} at={smile + 10} n={6} spread={300} />
        <Hearts x={mx + 60} y={HIP - 520} f={f} at={sunset} n={6} spread={300} />
      </World>
      <Grade />
      {f >= sunset && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 560, textAlign: "center", opacity: title, transform: `translateY(${(1 - title) * 30}px)` }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 112, lineHeight: 1.05, color: "#fff", WebkitTextStroke: "8px rgba(70,20,50,0.9)", paintOrder: "stroke fill", textShadow: "0 10px 40px rgba(255,120,150,0.6)" }}>HARI YANG SPESIAL</div>
        </div>
      )}
      <Caps ids={["akhir_1"]} hl={["senyum-senyum", "spesial", "bagiku"]} color="#ffb3cf" top={1380} />
    </AbsoluteFill>
  );
};

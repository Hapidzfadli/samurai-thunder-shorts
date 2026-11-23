import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "./kos_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";
import { INK, Phone, Pose, Room, Star, Stick, Smoke } from "./stick/draw";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_KOS = timing.scenes as { hook: number; kasur: number; celana: number; kulkas: number; warung: number; makan: number; akhir: number };
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
const World: React.FC<{ cam: { fx: number; fy: number; z: number; r: number }; shake?: [number, number]; children: React.ReactNode }> = ({ cam, shake = [0, 0], children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
    <g transform={`translate(${540 + shake[0]} ${960 + shake[1]}) rotate(${cam.r}) scale(${cam.z}) translate(${-cam.fx} ${-cam.fy})`}>{children}</g>
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
const RS = 1.15; // Rendi scale
const hipY = (s: number) => GROUND - 196 * s;
const RENDI = "#2d6cdf";

const Wallet: React.FC<{ open: number }> = ({ open }) => (
  <g>
    <rect x={-60} y={-50} width={120} height={84} rx={12} fill="#8b5a2b" stroke={INK} strokeWidth={7} />
    <path d={`M -60 -50 L 60 -50 L ${60 - 14 * open} ${-50 - 52 * open} L ${-60 + 14 * open} ${-50 - 52 * open} Z`} fill="#a0693a" stroke={INK} strokeWidth={7} />
    {open > 0.4 && (
      <text x={0} y={-8} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={34} fill="#fff" stroke={INK} strokeWidth={5} paintOrder="stroke">
        AMIN
      </text>
    )}
  </g>
);

const Coin: React.FC<{ x: number; y: number; r?: number; label?: string }> = ({ x, y, r = 22, label = "" }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="#ffd23f" stroke={INK} strokeWidth={5} />
    <circle r={r * 0.65} fill="none" stroke="#b8860b" strokeWidth={3} />
    {label && (
      <text textAnchor="middle" y={6} fontFamily="Anton, Impact, sans-serif" fontSize={r * 0.8} fill={INK}>
        {label}
      </text>
    )}
  </g>
);

const Bowl: React.FC<{ x: number; y: number; noodle?: number; steam?: number; t: number }> = ({ x, y, noodle = 1, steam = 1, t }) => (
  <g transform={`translate(${x} ${y})`}>
    {steam > 0 && [0, 1, 2].map((i) => <path key={i} d={`M ${-40 + i * 40} -70 q 14 -26 0 -52 q -14 -26 0 -52`} stroke="#fff" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7 * steam} transform={`translate(0 ${Math.sin(t * 3 + i) * 6})`} />)}
    {noodle > 0 && (
      <g stroke="#f5c842" strokeWidth={10} fill="none" strokeLinecap="round" opacity={noodle}>
        <path d="M -70 -20 q 30 -50 60 0 t 60 0 t 60 0" />
        <path d="M -60 -34 q 30 -50 60 0 t 60 0" />
        <path d="M -50 -10 q 25 -40 50 0 t 50 0 t 50 0" />
      </g>
    )}
    <path d="M -110 -30 L 110 -30 Q 100 70 40 76 L -40 76 Q -100 70 -110 -30 Z" fill="#e63946" stroke={INK} strokeWidth={9} />
    <rect x={-40} y={78} width={80} height={14} rx={6} fill="#b02a36" stroke={INK} strokeWidth={6} />
    <text textAnchor="middle" y={30} fontFamily="Anton, Impact, sans-serif" fontSize={34} fill="#fff">
      MIE
    </text>
  </g>
);

const Egg: React.FC<{ x: number; y: number; s?: number; glow?: number; t: number; rot?: number }> = ({ x, y, s = 1, glow = 0, t, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    {glow > 0 && (
      <g opacity={glow}>
        <circle r={110} fill="url(#eggglow)" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} transform={`rotate(${i * 60 + t * 40}) translate(0 -96)`}>
            <path d="M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z" fill="#fff6a8" />
          </g>
        ))}
      </g>
    )}
    <ellipse rx={38} ry={50} fill="#fff8e7" stroke={INK} strokeWidth={7} />
    <ellipse cx={-10} cy={-14} rx={10} ry={16} fill="#fff" opacity={0.8} />
    <defs>
      <radialGradient id="eggglow">
        <stop offset="0%" stopColor="#fff6a8" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#fff6a8" stopOpacity={0} />
      </radialGradient>
    </defs>
  </g>
);

const Tears: React.FC<{ x: number; y: number; t: number; amount?: number; flip?: boolean }> = ({ x, y, t, amount = 1, flip = false }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
    {[0, 1, 2, 3].map((i) => {
      const k = (t * 1.3 + i * 0.25) % 1;
      return (
        <g key={i}>
          <circle cx={26 + k * 24} cy={20 + k * 160} r={10 * (1 - k * 0.4) * amount} fill="#7ad0ff" stroke={INK} strokeWidth={3} opacity={1 - k * 0.5} />
          <circle cx={-18 - k * 24} cy={20 + k * 160} r={10 * (1 - k * 0.4) * amount} fill="#7ad0ff" stroke={INK} strokeWidth={3} opacity={1 - k * 0.5} />
        </g>
      );
    })}
  </g>
);

const HEAD = (x: number, y: number, s: number): [number, number] => [x, y - 230 * s];

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneKosHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const bal = EV("hook.balance");
  const growl = EV("hook.growl");
  const wal = EV("hook.wallet");
  const X = 560;
  const Y = hipY(RS);
  const phoneUp = f < growl - 6;
  const pose: Pose = f < growl - 6 ? { t: -2, aR: [62, 40], aL: [-8, -10] } : f < wal ? { t: 8 * pulse(f, growl, 40) * 0 + 6, aR: [-6, 0], aL: [60, 50], lL: [-6, 0], lR: [6, 0] } : { t: 2, aR: [-8, -6], aL: [70, 70] };
  const grow = f >= growl ? Math.sin((f - growl) * 1.5) * 0.6 : 0;
  const cam = camAt(f, [
    { to: bal + 6, f0: [560, 1090], z0: 2.9, f1: [560, 1070], z1: 2.5 },
    { to: growl + 4, f0: [560, 1000], z0: 1.9, f1: [560, 1080], z1: 1.25 },
    { to: wal, f0: [560, 1180], z0: 2.4, f1: [560, 1160], z1: 1.9 },
    { to: 9999, f0: [600, 1040], z0: 1.6, f1: [560, 1030], z1: 1.15 },
  ]);
  const expr = f < growl ? "tired" : f < wal ? "pain" : "sleepy";
  const tick = f < bal + 6 ? Math.floor((f / 4) % 2) : 0;
  return (
    <AbsoluteFill style={{ background: "#ffe6a8" }}>
      <World cam={cam} shake={shakeAt(f, [growl, growl + 14, growl + 28], 9, 10)}>
        <Room mode="morning" clockMin={0} t={t} />
        <g>
          <rect x={440} y={470} width={150} height={190} rx={8} fill="#fff" stroke={INK} strokeWidth={8} />
          <rect x={440} y={470} width={150} height={50} fill="#e63946" stroke={INK} strokeWidth={8} />
          <text x={515} y={508} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={34} fill="#fff">
            TGL
          </text>
          <text x={515} y={620} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={96} fill={INK}>
            29
          </text>
          <path d="M 458 586 L 572 654 M 572 586 L 458 654" stroke="#e63946" strokeWidth={0} />
        </g>
        <Stick
          x={X}
          y={Y + grow * 4}
          s={RS}
          pose={pose}
          expr={expr}
          color={RENDI}
          holdR={
            phoneUp
              ? ({ ang }) => (
                  <g transform={`translate(24 -62) rotate(${ang + 6}) scale(1.7)`}>
                    <Phone screen="#cfe9ff" />
                    <text x={0} y={-80} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={13} fill={INK}>
                      SALDO
                    </text>
                    <text x={0} y={-58} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={17} fill={tick ? "#e63946" : INK}>
                      Rp 4.500
                    </text>
                  </g>
                )
              : undefined
          }
          holdL={f >= growl - 6 && f < wal + 40 ? () => <g transform="translate(10 -20) rotate(-10)"><Wallet open={f >= wal - 6 ? smooth(cl((f - wal + 6) / 8)) : 0} /></g> : undefined}
        />
        {f >= growl && f < wal && (
          <g>
            <Onoma frame={f} at={growl} x={X + 150} y={Y - 30} text="GRUUUK" size={96} fill="#ff9f43" />
            <path d={`M ${X - 40} ${Y - 70} q 20 ${14 + grow * 8} 40 0 t 40 0`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
          </g>
        )}
        {f >= wal + 6 && (
          <g>
            <text x={X - 130} y={Y - 380} fontFamily="Anton, Impact, sans-serif" fontSize={52} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">
              ...
            </text>
          </g>
        )}
      </World>
      <Grade />
      <Tag label="TANGGAL 29" from={0} to={growl} color="#ff6b6b" />
      <Caps ids={["hook_1", "hook_2"]} hl={["dua", "puluh", "sembilan", "empat", "ribu", "keroncongan", "doa"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. KASUR: lifting the mattress                                       */
/* ================================================================== */
export const SceneKosKasur: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const lift = EV("kasur.lift");
  const dust = EV("kasur.dust");
  const roach = EV("kasur.roach");
  const sock = EV("kasur.sock");
  const up = smooth(cl((f - lift) / 18));
  const X = 760;
  const Y = hipY(RS);
  const pose: Pose = { t: 6 * up, aL: [lerp(-8, -150, up), 0], aR: [lerp(8, 150, up), 0], lL: [-6, 0], lR: [6, 0] };
  const cam = camAt(f, [
    { to: lift, f0: [420, 1180], z0: 1.2, f1: [460, 1170], z1: 1.3 },
    { to: sock - 6, f0: [330, 1330], z0: 2.1, f1: [390, 1340], z1: 1.9, r0: -2, r1: 1 },
    { to: roach + 4, f0: [330, 1330], z0: 3.0, f1: [300, 1340], z1: 3.4 },
    { to: 9999, f0: [440, 1250], z0: 1.5, f1: [560, 1180], z1: 1.1 },
  ]);
  const rise = -28 * up;
  return (
    <AbsoluteFill style={{ background: "#2a3560" }}>
      <World cam={cam} shake={shakeAt(f, [lift + 12], 14, 12)}>
        <rect x={-600} y={-600} width={2300} height={2000} fill="#fbe3b5" />
        <rect x={-600} y={GROUND} width={2300} height={900} fill="#c8a06a" />
        <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#8a5a30" stroke={INK} strokeWidth={5} />
        {/* bed frame (stays) */}
        <rect x={40} y={1210} width={620} height={30} fill="#8a5a30" stroke={INK} strokeWidth={8} />
        <rect x={50} y={1240} width={26} height={150} fill="#8a5a30" stroke={INK} strokeWidth={7} />
        <rect x={624} y={1240} width={26} height={150} fill="#8a5a30" stroke={INK} strokeWidth={7} />
        {/* stuff under the bed */}
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${130 + i * 120} ${1370 + (i % 2) * 6})`} opacity={cl((f - dust + i * 3) / 8)}>
              <circle r={34} fill="#cfd3da" stroke={INK} strokeWidth={4} />
              {[0, 1, 2, 3, 4, 5].map((j) => (
                <line key={j} x1={0} y1={0} x2={Math.cos(j * 1.05 + i) * 52} y2={Math.sin(j * 1.05 + i) * 36} stroke={INK} strokeWidth={3} />
              ))}
              <circle cx={-10} cy={-6} r={4} fill={INK} />
              <circle cx={10} cy={-6} r={4} fill={INK} />
            </g>
          ))}
          {/* the lone sock */}
          <g transform={`translate(500 1366) rotate(${-10 + 8 * pulse(f, sock, 20)})`} opacity={cl((f - sock + 8) / 6)}>
            <path d="M -40 -50 L 10 -50 L 12 0 L 54 14 Q 64 36 36 40 L -30 36 Q -46 30 -40 -10 Z" fill="#fff" stroke={INK} strokeWidth={6} />
            <rect x={-40} y={-50} width={50} height={14} fill="#e63946" stroke={INK} strokeWidth={4} />
            <circle cx={22} cy={22} r={9} fill="#f6c9a0" stroke={INK} strokeWidth={3} />
          </g>
          {/* cockroach tenant */}
          <g transform={`translate(300 1372)`} opacity={cl((f - roach + 6) / 6)}>
            <g transform={`translate(0 ${-pulse(f, roach, 30) * 6}) scale(1.3)`}>
              <ellipse rx={44} ry={26} fill="#7a4a1e" stroke={INK} strokeWidth={5} />
              <ellipse cx={-4} cy={-4} rx={30} ry={14} fill="#9b6228" opacity={0.7} />
              <circle cx={40} cy={-6} r={16} fill="#7a4a1e" stroke={INK} strokeWidth={5} />
              <circle cx={44} cy={-12} r={7} fill="#fff" stroke={INK} strokeWidth={3} />
              <circle cx={46} cy={-12} r={3} fill={INK} />
              <path d="M 50 -18 q 26 -30 44 -34 M 52 -14 q 30 -10 52 -12" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
              {[-26, -6, 14].map((x, i) => (
                <path key={i} d={`M ${x} 20 q ${-6 + i * 3} 22 ${-16} 30`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
              ))}
            </g>
            <rect x={-40} y={-100} width={120} height={46} rx={8} fill="#fff" stroke={INK} strokeWidth={5} opacity={f > roach ? 1 : 0} />
            <text x={20} y={-68} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={26} fill="#e63946" opacity={f > roach ? 1 : 0}>
              KONTRAKAN
            </text>
          </g>
        </g>
        {/* mattress lifted at the right end */}
        <g transform={`translate(70 ${1190 + rise}) rotate(${-12 * up} 0 20)`}>
          <rect x={0} y={-60} width={600} height={80} rx={22} fill="#dfe6ff" stroke={INK} strokeWidth={9} />
          <path d="M 30 -34 L 570 -34" stroke="#b9c4f4" strokeWidth={6} strokeDasharray="14 14" />
          <ellipse cx={90} cy={-84} rx={88} ry={32} fill="#fff" stroke={INK} strokeWidth={8} transform={`rotate(${-2 * up})`} />
        </g>
        <Stick x={X} y={Y} s={RS} flip pose={pose} expr={f < lift ? "tired" : f < sock ? "surprised" : "pain"} color={RENDI} />
        {f >= dust && f < dust + 40 && <Smoke x={300} y={1340} t={t} amount={cl((f - dust) / 10)} color="#d9d4c8" spread={150} />}
        <Onoma frame={f} at={lift + 8} x={640} y={1050} text="HEAAP" size={90} fill="#ffd23f" rot={-10} />
        <Onoma frame={f} at={roach} x={140} y={1130} text="HAH?!" size={80} fill="#ff9f43" rot={8} dur={30} />
      </World>
      <Grade />
      <Tag label="BAWAH KASUR" from={4} to={lift + 40} color="#ffd23f" />
      <Caps ids={["kasur_1", "kasur_2", "kasur_3"]} hl={["membongkar", "terselip", "debu", "kecoa", "sebelah", "kontrakan"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. CELANA: the old pants pocket                                       */
/* ================================================================== */
export const SceneKosCelana: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const reach = EV("celana.reach");
  const paper = EV("celana.paper");
  const struk = EV("celana.struk");
  const X = 360;
  const Y = hipY(RS);
  const r1 = smooth(cl((f - reach + 14) / 14));
  const pull = smooth(cl((f - paper) / 14));
  const pose: Pose = { t: 4 * r1, aR: [lerp(8, 98, r1) - 30 * pull, lerp(-10, -20, r1)], aL: [-8, -10] };
  const cam = camAt(f, [
    { to: reach - 4, f0: [580, 1090], z0: 1.2, f1: [640, 1100], z1: 1.4 },
    { to: paper + 4, f0: [700, 1150], z0: 2.6, f1: [700, 1180], z1: 2.9 },
    { to: struk + 10, f0: [740, 1070], z0: 2.2, f1: [700, 1020], z1: 1.5 },
    { to: 9999, f0: [640, 1060], z0: 1.4, f1: [600, 1040], z1: 1.1 },
  ]);
  const ex = f >= paper ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: "#ffe6a8" }}>
      <World cam={cam} shake={shakeAt(f, [struk + 4], 10, 10)}>
        <rect x={-600} y={-600} width={2300} height={2000} fill="#f7d7a0" />
        <rect x={-600} y={GROUND} width={2300} height={900} fill="#c8a06a" />
        <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#8a5a30" stroke={INK} strokeWidth={5} />
        {/* wardrobe */}
        <rect x={640} y={360} width={360} height={1040} rx={10} fill="#a8703a" stroke={INK} strokeWidth={10} />
        <line x1={820} y1={370} x2={820} y2={1390} stroke={INK} strokeWidth={8} />
        <circle cx={800} cy={880} r={10} fill="#ffd23f" stroke={INK} strokeWidth={4} />
        <circle cx={840} cy={880} r={10} fill="#ffd23f" stroke={INK} strokeWidth={4} />
        {/* hanger with old pants on a wall hook */}
        <g transform="translate(560 640)">
          <line x1={0} y1={-90} x2={0} y2={-50} stroke={INK} strokeWidth={8} />
          <path d="M -70 0 L 0 -50 L 70 0" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M -70 0 L 70 0 L 82 330 L 22 330 L 0 90 L -22 330 L -82 330 Z" fill="#4a6fd8" stroke={INK} strokeWidth={9} strokeLinejoin="round" transform={`rotate(${Math.sin(t * 2) * 1.2 + 2.5 * pulse(f, reach, 20)} 0 -50)`} />
          <path d="M 20 40 L 64 40 L 62 108 L 22 108 Z" fill="#3e5db5" stroke={INK} strokeWidth={7} />
          <path d="M -50 18 L 50 18" stroke="#f6e27a" strokeWidth={6} strokeDasharray="10 8" />
        </g>
        <Stick x={X} y={Y} s={RS} pose={pose} expr={f < reach ? "neutral" : f < paper ? "surprised" : f < struk ? "happy" : "tired"} color={RENDI} />
        {/* the paper */}
        {f >= paper && (
          <g transform={`translate(${lerp(610, 520, pull)} ${lerp(756, 640, pull)}) rotate(${lerp(-4, 8, pull)}) scale(${lerp(0.5, 1.2, pull)})`}>
            <rect x={-70} y={-96} width={140} height={190} rx={6} fill="#fffdf4" stroke={INK} strokeWidth={6} />
            <text x={0} y={-62} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={22} fill={INK}>
              STRUK
            </text>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={-48} y1={-34 + i * 24} x2={48 - i * 10} y2={-34 + i * 24} stroke="#9aa0ac" strokeWidth={5} strokeLinecap="round" />
            ))}
            <text x={0} y={80} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={26} fill="#e63946">
              {f > struk ? "2023" : "Rp ?"}
            </text>
          </g>
        )}
        <Onoma frame={f} at={paper + 6} x={470} y={560} text={"UANG?!"} size={80} fill="#7ddc8b" rot={-8} dur={26} />
        <Onoma frame={f} at={struk + 6} x={470} y={560} text="ZONK" size={100} fill="#ff6b6b" rot={6} dur={34} />
      </World>
      <Grade />
      <Tag label="KANTONG CELANA" from={4} to={paper} color="#ffd23f" />
      <Caps ids={["celana_1", "celana_2"]} hl={["kertas", "Uang", "struk", "lalu"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. KULKAS                                                             */
/* ================================================================== */
export const SceneKosKulkas: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const open = EV("kulkas.open");
  const sauce = EV("kulkas.sauce");
  const cricket = EV("kulkas.cricket");
  const door = smooth(cl((f - open) / 14));
  const X = 300;
  const Y = hipY(RS);
  const pose: Pose = { t: 4, aR: [lerp(8, 96, door), -6], aL: [-8, -10] };
  const cam = camAt(f, [
    { to: open, f0: [540, 1060], z0: 1.15, f1: [560, 1040], z1: 1.3 },
    { to: sauce, f0: [730, 880], z0: 1.9, f1: [740, 900], z1: 2.5 },
    { to: cricket, f0: [760, 1000], z0: 2.2, f1: [700, 1020], z1: 1.7 },
    { to: 9999, f0: [820, 1180], z0: 3.0, f1: [660, 1080], z1: 1.4 },
  ]);
  const walk = cl((f - cricket - 6) / 56);
  return (
    <AbsoluteFill style={{ background: "#1f2540" }}>
      <World cam={cam} shake={shakeAt(f, [open + 10], 10, 10)}>
        <rect x={-600} y={-600} width={2300} height={2000} fill="#5a6ea8" />
        <rect x={-600} y={GROUND} width={2300} height={900} fill="#9a7a58" />
        <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#6b4a2e" stroke={INK} strokeWidth={5} />
        {/* fridge body (inside) */}
        <rect x={600} y={620} width={380} height={760} rx={16} fill="#eef3fb" stroke={INK} strokeWidth={10} />
        <rect x={622} y={642} width={336} height={716} rx={8} fill={f >= open ? "#f9fdff" : "#cfd8e6"} stroke={INK} strokeWidth={6} />
        {f >= open && <rect x={622} y={642} width={336} height={716} rx={8} fill="url(#fridgelight)" />}
        <defs>
          <radialGradient id="fridgelight" cx="50%" cy="10%" r="90%">
            <stop offset="0%" stopColor="#fffbe0" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#fffbe0" stopOpacity={0} />
          </radialGradient>
        </defs>
        {[880, 1080].map((y, i) => (
          <line key={i} x1={622} y1={y} x2={958} y2={y} stroke={INK} strokeWidth={7} />
        ))}
        {/* cobweb */}
        <path d="M 622 642 L 720 642 M 622 642 L 700 700 M 622 642 L 622 740 M 650 642 q 20 40 -28 70 M 690 642 q -10 44 -68 40" stroke="#9aa0ac" strokeWidth={4} fill="none" />
        {/* sauce sachets */}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${690 + i * 54} ${1048}) rotate(${-8 + i * 5})`} opacity={cl((f - open - 6) / 8)}>
            <rect x={-18} y={-44} width={36} height={52} rx={4} fill={["#e63946", "#ffd23f", "#e63946", "#7ddc8b", "#ffd23f"][i]} stroke={INK} strokeWidth={5} />
            <path d="M -18 -44 l 6 -8 l 6 8 l 6 -8 l 6 8 l 6 -8 l 6 8" fill="#fff" stroke={INK} strokeWidth={3} />
          </g>
        ))}
        {/* a lonely bottle of water */}
        <g transform="translate(900 1020)" opacity={cl((f - open - 6) / 8)}>
          <rect x={-22} y={-100} width={44} height={110} rx={12} fill="#bfe6ff" stroke={INK} strokeWidth={6} />
          <rect x={-12} y={-122} width={24} height={26} rx={4} fill="#fff" stroke={INK} strokeWidth={5} />
          <rect x={-22} y={-56} width={44} height={26} fill="#4a90e2" opacity={0.7} />
        </g>
        {/* lamp, the only resident */}
        <g transform="translate(790 700)">
          <circle r={26} fill="#fff3b0" stroke={INK} strokeWidth={6} opacity={f >= open ? 1 : 0} />
          {f >= open && <path d="M -14 14 L 14 14 M -8 26 L 8 26" stroke={INK} strokeWidth={5} />}
        </g>
        {/* cricket with suitcase leaving */}
        {f >= cricket - 2 && (
          <g transform={`translate(${790 + walk * 240} ${1330 - 4 * Math.abs(Math.sin(f * 0.9))}) scale(${1.2})`}>
            <ellipse rx={30} ry={16} fill="#5b7f2b" stroke={INK} strokeWidth={5} />
            <circle cx={30} cy={-8} r={13} fill="#5b7f2b" stroke={INK} strokeWidth={5} />
            <circle cx={35} cy={-12} r={5} fill="#fff" stroke={INK} strokeWidth={3} />
            <path d="M 36 -18 q 18 -22 34 -22" stroke={INK} strokeWidth={4} fill="none" />
            <path d="M -10 12 q -6 18 -2 26 M 8 12 q 4 18 0 26" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
            <g transform="translate(-48 8)">
              <rect x={-18} y={-18} width={36} height={30} rx={4} fill="#c8873a" stroke={INK} strokeWidth={5} />
              <rect x={-8} y={-26} width={16} height={8} fill="none" stroke={INK} strokeWidth={4} />
            </g>
          </g>
        )}
        {/* door swung open */}
        <g transform={`translate(600 ${620})`}>
          <path d={`M 0 0 L ${-60 * door} ${-16 * door} L ${-60 * door} ${760 + 16 * door} L 0 760 Z`} fill="#dfe6f2" stroke={INK} strokeWidth={9} />
          <rect x={-26 * door - 6} y={300} width={12 * (1 - door * 0.2)} height={140} rx={6} fill="#9aa0ac" stroke={INK} strokeWidth={5} opacity={door > 0.1 ? 1 : 0} />
        </g>
        <Stick x={X} y={Y} s={RS} pose={pose} expr={f < open ? "tired" : f < cricket ? "surprised" : "sleepy"} color={RENDI} />
        <Onoma frame={f} at={sauce + 4} x={640} y={560} text="CUMA INI?" size={74} fill="#ffd23f" rot={-8} dur={34} />
      </World>
      <Grade />
      <Tag label="KULKAS" from={4} to={open + 40} color="#7ad0ff" />
      <Caps ids={["kulkas_1", "kulkas_2"]} hl={["lampu", "sachet", "jangkrik", "nggak"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. WARUNG                                                             */
/* ================================================================== */
export const SceneKosWarung: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const inF = EV("warung.in");
  const egg = EV("warung.egg");
  const ask = EV("warung.ask");
  const no = EV("warung.no");
  const X = 280;
  const Y = hipY(RS);
  const walk = smooth(cl(f / 26));
  const rx = lerp(-60, X, walk);
  const rp: Pose = f < 28 ? { t: 10, lL: [lerp(-24, 24, Math.sin(f * 0.5) * 0.5 + 0.5), 0], lR: [lerp(24, -24, Math.sin(f * 0.5) * 0.5 + 0.5), 0], aL: [-30 * Math.sin(f * 0.5), 0], aR: [30 * Math.sin(f * 0.5), 0] } : f < ask ? { t: 2, aR: [90, -80], aL: [-8, -10] } : f < no ? { t: 6, aL: [160, 0], aR: [160, 0] } : { t: -6, h: -10, aL: [-8, -10], aR: [8, -10] };
  const hit = f >= no + 4;
  const bp: Pose = f < no ? { aL: [-10, -10], aR: [26, -20] } : { aL: [-10, -10], aR: [lerp(130, 20, smooth(cl((f - no - 4) / 8))), -20] };
  const cam = camAt(f, [
    { to: egg - 6, f0: [500, 1060], z0: 1.15, f1: [560, 1050], z1: 1.25 },
    { to: ask, f0: [590, 990], z0: 2.2, f1: [640, 1000], z1: 2.0 },
    { to: no - 2, f0: [380, 1000], z0: 2.2, f1: [430, 1000], z1: 2.4 },
    { to: 9999, f0: [560, 1060], z0: 1.5, f1: [560, 1040], z1: 1.15 },
  ]);
  const BX = 800;
  const BY = hipY(1.05);
  return (
    <AbsoluteFill style={{ background: "#9fdcff" }}>
      <World cam={cam} shake={shakeAt(f, [no + 4], 18, 14)}>
        <rect x={-600} y={-600} width={2300} height={2000} fill="#bfe8ff" />
        <circle cx={160} cy={300} r={80} fill="#ffd23f" />
        <path d="M 600 330 q 40 -50 90 0 q 50 -50 100 0 q 40 -30 80 10 v 40 h -280 Z" fill="#fff" opacity={0.9} />
        <rect x={-600} y={GROUND} width={2300} height={900} fill="#b0a58f" />
        <rect x={-600} y={GROUND - 16} width={2300} height={22} fill="#8a8268" stroke={INK} strokeWidth={5} />
        {/* warung stall */}
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={`M ${560 + i * 66} 560 L ${560 + (i + 1) * 66} 560 L ${560 + (i + 1) * 66 + 8} 640 Q ${560 + i * 66 + 37} 668 ${560 + i * 66 - 4} 640 Z`} fill={i % 2 ? "#fff" : "#e63946"} stroke={INK} strokeWidth={6} />
          ))}
          <rect x={560} y={640} width={462} height={20} fill="#6b4a2e" stroke={INK} strokeWidth={6} />
          <rect x={580} y={660} width={14} height={740} fill="#6b4a2e" stroke={INK} strokeWidth={6} />
          <rect x={988} y={660} width={14} height={740} fill="#6b4a2e" stroke={INK} strokeWidth={6} />
          <rect x={576} y={1110} width={430} height={290} rx={10} fill="#c8873a" stroke={INK} strokeWidth={9} />
          <rect x={560} y={1090} width={462} height={30} rx={8} fill="#8a5a30" stroke={INK} strokeWidth={8} />
          {/* shelf with noodles */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={604 + i * 76} y={830} width={62} height={90} rx={6} fill={["#ffd23f", "#e63946", "#4a90e2", "#7ddc8b", "#ff9f43"][i]} stroke={INK} strokeWidth={5} />
          ))}
          <rect x={596} y={920} width={400} height={12} fill="#6b4a2e" stroke={INK} strokeWidth={5} />
          {/* egg tray */}
          <g transform="translate(760 1058)">
            <rect x={-130} y={0} width={260} height={32} rx={8} fill="#c9b99a" stroke={INK} strokeWidth={6} />
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse key={i} cx={-100 + i * 50} cy={-6} rx={20} ry={26} fill="#fff8e7" stroke={INK} strokeWidth={5} />
            ))}
          </g>
          {/* price signs */}
          <g transform="translate(640 740)">
            <rect x={-70} y={-34} width={140} height={64} rx={6} fill="#fff" stroke={INK} strokeWidth={6} />
            <text textAnchor="middle" y={-6} fontFamily="Anton, Impact, sans-serif" fontSize={22} fill={INK}>MIE INSTAN</text>
            <text textAnchor="middle" y={22} fontFamily="Anton, Impact, sans-serif" fontSize={26} fill="#e63946">Rp 3.500</text>
          </g>
          <g transform="translate(880 740)">
            <rect x={-70} y={-34} width={140} height={64} rx={6} fill="#fff" stroke={INK} strokeWidth={6} />
            <text textAnchor="middle" y={-6} fontFamily="Anton, Impact, sans-serif" fontSize={22} fill={INK}>TELUR 1 BIJI</text>
            <text textAnchor="middle" y={22} fontFamily="Anton, Impact, sans-serif" fontSize={26} fill="#e63946">Rp 2.500</text>
          </g>
        </g>
        {/* Bu Warung */}
        <g transform={hit ? `rotate(${-2 * pulse(f, no + 4, 12)} ${BX} ${BY})` : undefined}>
          <Stick x={BX} y={BY} s={1.05} flip pose={bp} expr={f < no ? "neutral" : "angry"} color="#d6457a" tuft={false} />
          <g transform={`translate(${BX - 6} ${BY - 230 * 1.05 - 82})`}>
            <circle r={26} fill="#2a1a10" stroke={INK} strokeWidth={6} />
          </g>
        </g>
        <Stick x={rx} y={Y} s={RS} pose={rp} expr={f < 26 ? "neutral" : f < egg ? "happy" : f < ask ? "surprised" : f < no ? "happy" : "pain"} color={RENDI} holdR={f >= 28 && f < ask ? () => <Coin x={26} y={-14} r={22} label="1K" /> : undefined} />
        {hit && (
          <g>
            <Onoma frame={f} at={no + 4} x={420} y={760} text="PLETAK!" size={100} fill="#ff6b6b" rot={-8} dur={34} />
            <g transform={`translate(${BX - 120} ${BY - 280}) rotate(${lerp(-80, 20, smooth(cl((f - no - 4) / 6)))})`}>
              <rect x={-8} y={-90} width={16} height={90} rx={6} fill="#c8873a" stroke={INK} strokeWidth={5} />
              <ellipse cx={0} cy={-110} rx={30} ry={22} fill="#b0b6c0" stroke={INK} strokeWidth={6} />
            </g>
          </g>
        )}
        {f >= egg && f < ask && (
          <g transform={`translate(${rx + 90} ${Y - 360})`}>
            <path d="M 0 0 q -40 -40 0 -80 q 70 -30 110 20 q 30 60 -40 80 Z" fill="#fff" stroke={INK} strokeWidth={6} opacity={0} />
          </g>
        )}
      </World>
      <Grade />
      <Tag label="WARUNG BU RINI" from={4} to={egg - 10} color="#ff9f43" />
      <Tag label="UANG: Rp 4.500" from={egg} to={no - 6} color="#7ddc8b" />
      <Caps ids={["warung_1", "warung_2", "warung_3", "warung_4"]} hl={["warung", "tiga", "ribu", "ratus", "dua", "kurang", "seribu", "boleh", "setengah", "lelang"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. MAKAN: plain noodles and an imaginary egg                         */
/* ================================================================== */
export const SceneKosMakan: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const eat = EV("makan.eat");
  const dream = EV("makan.dream");
  const eggF = EV("makan.egg");
  const back = EV("makan.back");
  const X = 360;
  const Y = hipY(RS);
  const slurp = Math.sin(f * 0.8);
  const pose: Pose = { t: 12, aR: [lerp(40, 96, Math.abs(slurp)), -40], aL: [-8, 10] };
  const cam = camAt(f, [
    { to: eat + 20, f0: [520, 1090], z0: 1.25, f1: [560, 1060], z1: 1.4 },
    { to: dream, f0: [470, 1010], z0: 2.1, f1: [500, 1000], z1: 2.3 },
    { to: back, f0: [540, 880], z0: 1.8, f1: [560, 860], z1: 1.5 },
    { to: 9999, f0: [500, 1070], z0: 2.4, f1: [540, 1060], z1: 1.4 },
  ]);
  const ek = f >= eggF ? smooth(cl((f - eggF) / 20)) : 0;
  const drop = smooth(cl((f - back) / 18));
  const noodle = f >= back + 12 ? 1 : 1;
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam} shake={shakeAt(f, [back + 16], 8, 10)}>
        <Room mode="night" clockMin={23 * 60 + 40} t={t} lamp />
        {/* desk */}
        <rect x={200} y={1270} width={560} height={26} rx={8} fill="#8a5a30" stroke={INK} strokeWidth={9} />
        <rect x={230} y={1296} width={26} height={104} fill="#8a5a30" stroke={INK} strokeWidth={7} />
        <rect x={704} y={1296} width={26} height={104} fill="#8a5a30" stroke={INK} strokeWidth={7} />
        <Bowl x={560} y={1196} t={t} steam={1} noodle={noodle} />
        <Stick x={X} y={Y} s={RS} pose={pose} expr={f < dream ? (Math.abs(slurp) > 0.6 ? "happy" : "tired") : f < back ? "happy" : "sleepy"} color={RENDI} />
        {/* the imagined egg in a thought bubble */}
        {f >= dream && (
          <g>
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={470 + i * 24} cy={1010 - i * 34} r={9 + i * 6} fill="#fff" stroke={INK} strokeWidth={5} opacity={cl((f - dream - i * 3) / 6)} />
            ))}
            <g opacity={cl((f - dream - 6) / 8)}>
              <ellipse cx={620} cy={780} rx={150} ry={118} fill="#fff" stroke={INK} strokeWidth={8} />
              <Egg x={620} y={f >= back ? lerp(780, 1130, drop) : 780 + Math.sin(t * 3) * 10} s={f >= back ? lerp(1.3, 0.6, drop) : 1.3} glow={f >= back ? 1 - drop : 1} t={t} rot={f >= back ? drop * 180 : 0} />
            </g>
          </g>
        )}
        {f >= eggF && f < back && <Onoma frame={f} at={eggF} x={780} y={620} text="TRING!" size={80} fill="#fff6a8" rot={8} dur={30} />}
        {f >= back + 14 && <Onoma frame={f} at={back + 14} x={470} y={1010} text="POF" size={80} fill="#ff9f43" rot={-8} dur={28} />}
      </World>
      <Grade dark={0.12} />
      <Tag label="MALAM, JAM 23.40" from={4} to={dream} color="#a5b4fc" />
      <Caps ids={["makan_1", "makan_2"]} hl={["polos", "membayangkan", "bersinar", "melayang", "lagi"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. AKHIR: a message from mom                                          */
/* ================================================================== */
export const SceneKosAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const buzz = EV("akhir.buzz");
  const read = EV("akhir.read");
  const cry = EV("akhir.cry");
  const card = EV("akhir.card");
  const X = 420;
  const Y = hipY(RS);
  const hug = smooth(cl((f - cry) / 14));
  const pose: Pose = f < read ? { t: 4, aR: [20, -20], aL: [-8, -10] } : f < cry ? { t: 6, aR: [64, 40], aL: [-30, 20] } : { t: 8, aR: [lerp(64, 120, hug), 80], aL: [lerp(-30, 110, hug), 80] };
  const vib = f >= buzz && f < buzz + 40 ? Math.sin(f * 3.2) * 6 : 0;
  const cam = camAt(f, [
    { to: buzz + 6, f0: [520, 1120], z0: 1.3, f1: [600, 1200], z1: 1.7 },
    { to: read, f0: [660, 1200], z0: 3.0, f1: [640, 1180], z1: 2.5 },
    { to: cry, f0: [470, 1040], z0: 1.8, f1: [450, 1010], z1: 2.0 },
    { to: card, f0: [450, 1010], z0: 2.6, f1: [480, 1030], z1: 1.35 },
    { to: 9999, f0: [500, 1010], z0: 1.4, f1: [520, 1010], z1: 1.2 },
  ]);
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: "#0e1a46" }}>
      <World cam={cam} shake={shakeAt(f, [buzz + 2, buzz + 10, buzz + 18], 7, 8)}>
        <Room mode="night" clockMin={23 * 60 + 58} t={t} lamp />
        <rect x={200} y={1270} width={560} height={26} rx={8} fill="#8a5a30" stroke={INK} strokeWidth={9} />
        <rect x={230} y={1296} width={26} height={104} fill="#8a5a30" stroke={INK} strokeWidth={7} />
        <rect x={704} y={1296} width={26} height={104} fill="#8a5a30" stroke={INK} strokeWidth={7} />
        <Bowl x={400} y={1226} t={t} steam={0} noodle={0.0} />
        <g transform={`translate(${650 + vib} 1240) rotate(${vib * 0.6})`}>
          <g transform="scale(1.25)">
            <Phone screen={f >= buzz ? "#e8fff0" : "#222"} />
            {f >= buzz && (
              <g>
                <rect x={-30} y={-132} width={60} height={34} rx={5} fill="#16a34a" />
                <text x={0} y={-112} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={13} fill="#fff">
                  IBU
                </text>
                <text x={0} y={-60} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={18} fill="#16a34a">
                  +50.000
                </text>
              </g>
            )}
          </g>
          {f >= buzz && f < buzz + 36 && [-1, 1].map((s) => <path key={s} d={`M ${s * 70} -60 q ${s * 16} 30 0 60 M ${s * 94} -76 q ${s * 22} 46 0 92`} stroke="#ffd23f" strokeWidth={6} fill="none" strokeLinecap="round" />)}
        </g>
        <Stick x={X} y={Y} s={RS} pose={pose} expr={f < buzz ? "sleepy" : f < read ? "surprised" : "pain"} color={RENDI} />
        {f >= cry && <Tears x={HEAD(X, Y, RS)[0]} y={HEAD(X, Y, RS)[1] - 10} t={t} amount={1.2} />}
        {f >= cry + 10 && <Egg x={800} y={1000 + Math.sin(t * 3) * 8} s={0.9} glow={0.9} t={t} />}
      </World>
      <Grade dark={0.1} />
      {f >= buzz + 8 && f < cry && (
        <div style={{ position: "absolute", top: 250, left: 60, width: 620, padding: "18px 24px", borderRadius: 22, background: "rgba(255,255,255,0.96)", border: "5px solid #16110f", boxShadow: "0 14px 40px rgba(0,0,0,0.45)", transform: `scale(${0.8 + 0.2 * smooth(cl((f - buzz - 8) / 8))})`, transformOrigin: "left top" }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 28, color: "#16a34a" }}>Transfer masuk · Rp 50.000</div>
          <div style={{ marginTop: 6, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 32, color: "#1f2937" }}>Ibu: &ldquo;Nak, ini buat beli telur.&rdquo;</div>
        </div>
      )}
      <Caps ids={["akhir_1", "akhir_2", "akhir_3"]} hl={["bergetar", "lima", "puluh", "ribu", "Ibu", "telur", "haru", "selalu"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(14,10,24,${0.64 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, width: 760 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 112, lineHeight: 1.05, color: "#ffd23f", WebkitTextStroke: "8px #1a0a0a", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a0a0a" }}>IBU SELALU TAHU</div>
            <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: "white", lineHeight: 1.25 }}>Sudah kabari ibumu hari ini?</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

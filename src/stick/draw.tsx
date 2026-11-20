import React from "react";

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (x: number, y: number, len: number, a: number): [number, number] => [x + len * Math.sin(rad(a)), y + len * Math.cos(rad(a))];
export const INK = "#12121a";

/* ------------------------------------------------------------------ */
/* Stickman with a real skeleton (angles in degrees, 0 = hanging down,  */
/* positive = toward the facing direction).                              */
/* ------------------------------------------------------------------ */
export type Expr = "neutral" | "sleepy" | "angry" | "surprised" | "pain" | "smug" | "tired" | "happy" | "cough";
export type Pose = { t?: number; h?: number; aL?: [number, number]; aR?: [number, number]; lL?: [number, number]; lR?: [number, number] };
export type Hold = (w: { x: number; y: number; ang: number }) => React.ReactNode;

const Face: React.FC<{ expr: Expr; blink?: boolean }> = ({ expr, blink = false }) => {
  const eyeX = [-22, 24];
  const white = (r: number, k: number) => (
    <g key={k}>
      <circle cx={eyeX[k]} cy={-8} r={r} fill="#fff" stroke={INK} strokeWidth={5} />
    </g>
  );
  const pupil = (r: number, k: number, dx = 5, dy = 0) => <circle key={`p${k}`} cx={eyeX[k] + dx} cy={-8 + dy} r={r} fill={INK} />;
  const closed = (k: number) => <path key={`c${k}`} d={`M ${eyeX[k] - 14} -8 Q ${eyeX[k]} 2 ${eyeX[k] + 14} -8`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
  const happyEye = (k: number) => <path key={`h${k}`} d={`M ${eyeX[k] - 14} -2 Q ${eyeX[k]} -20 ${eyeX[k] + 14} -2`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
  const brow = (k: number, ang: number, dy = -30) => <line key={`b${k}`} x1={eyeX[k] - 14} y1={dy} x2={eyeX[k] + 14} y2={dy} stroke={INK} strokeWidth={7} strokeLinecap="round" transform={`rotate(${ang} ${eyeX[k]} ${dy})`} />;
  if (blink || expr === "sleepy")
    return (
      <g>
        {closed(0)}
        {closed(1)}
        <path d="M -10 30 Q 2 36 14 30" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
      </g>
    );
  switch (expr) {
    case "angry":
      return (
        <g>
          {white(15, 0)}
          {white(15, 1)}
          {pupil(7, 0, 6)}
          {pupil(7, 1, 6)}
          {brow(0, 22)}
          {brow(1, -22)}
          <path d="M -22 34 L -12 28 L -2 36 L 8 28 L 18 36 L 28 30" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "surprised":
      return (
        <g>
          {white(21, 0)}
          {white(21, 1)}
          {pupil(6, 0, 3)}
          {pupil(6, 1, 3)}
          {brow(0, -8, -42)}
          {brow(1, 8, -42)}
          <ellipse cx={2} cy={36} rx={13} ry={17} fill={INK} />
        </g>
      );
    case "pain":
      return (
        <g>
          {[0, 1].map((k) => (
            <g key={k} stroke={INK} strokeWidth={7} strokeLinecap="round">
              <line x1={eyeX[k] - 12} y1={-20} x2={eyeX[k] + 12} y2={4} />
              <line x1={eyeX[k] + 12} y1={-20} x2={eyeX[k] - 12} y2={4} />
            </g>
          ))}
          <path d="M -20 36 Q -10 26 0 36 Q 10 46 20 36" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
        </g>
      );
    case "smug":
      return (
        <g>
          {white(15, 0)}
          {white(15, 1)}
          {pupil(7, 0, 7, 2)}
          {pupil(7, 1, 7, 2)}
          <path d={`M ${eyeX[0] - 17} -10 L ${eyeX[0] + 17} -10`} stroke={INK} strokeWidth={8} />
          <path d={`M ${eyeX[1] - 17} -10 L ${eyeX[1] + 17} -10`} stroke={INK} strokeWidth={8} />
          <path d="M -12 30 Q 14 46 30 24" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
        </g>
      );
    case "tired":
      return (
        <g>
          {white(15, 0)}
          {white(15, 1)}
          {pupil(6, 0, 3, 4)}
          {pupil(6, 1, 3, 4)}
          <path d={`M ${eyeX[0] - 17} -12 L ${eyeX[0] + 17} -12`} stroke={INK} strokeWidth={9} />
          <path d={`M ${eyeX[1] - 17} -12 L ${eyeX[1] + 17} -12`} stroke={INK} strokeWidth={9} />
          <path d="M -34 10 Q -22 18 -10 10" stroke="#6b5b8a" strokeWidth={5} fill="none" />
          <path d="M 12 10 Q 24 18 36 10" stroke="#6b5b8a" strokeWidth={5} fill="none" />
          <path d="M -14 38 L 16 36" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    case "happy":
      return (
        <g>
          {happyEye(0)}
          {happyEye(1)}
          <path d="M -18 24 Q 2 52 24 24 Z" fill={INK} />
        </g>
      );
    case "cough":
      return (
        <g>
          {[0, 1].map((k) => (
            <path key={k} d={k === 0 ? `M ${eyeX[k] - 12} -18 L ${eyeX[k] + 10} -8 L ${eyeX[k] - 12} 2` : `M ${eyeX[k] + 12} -18 L ${eyeX[k] - 10} -8 L ${eyeX[k] + 12} 2`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          <ellipse cx={2} cy={34} rx={10} ry={12} fill={INK} />
        </g>
      );
    default:
      return (
        <g>
          {white(15, 0)}
          {white(15, 1)}
          {pupil(7, 0)}
          {pupil(7, 1)}
          {brow(0, 0, -32)}
          {brow(1, 0, -32)}
          <path d="M -10 34 L 14 34" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
      );
  }
};

export const Stick: React.FC<{
  x: number;
  y: number; // hip position
  s?: number;
  flip?: boolean;
  pose?: Pose;
  expr?: Expr;
  color?: string;
  holdR?: Hold;
  holdL?: Hold;
  tuft?: boolean;
  cheek?: number; // red slap mark 0..1
  headBack?: React.ReactNode;
  headFront?: React.ReactNode;
  bodyBack?: React.ReactNode;
  bodyFront?: React.ReactNode;
}> = ({ x, y, s = 1, flip = false, pose = {}, expr = "neutral", color = "#2d6cdf", holdR, holdL, tuft = true, cheek = 0, headBack, headFront, bodyBack, bodyFront }) => {
  const t = pose.t ?? 0;
  const h = pose.h ?? 0;
  const aL = pose.aL ?? [-8, -10];
  const aR = pose.aR ?? [8, -10];
  const lL = pose.lL ?? [-6, 0];
  const lR = pose.lR ?? [6, 0];
  const S: [number, number] = [150 * Math.sin(rad(t)), -150 * Math.cos(rad(t))];
  const H: [number, number] = [S[0] + 80 * Math.sin(rad(t + h)), S[1] - 80 * Math.cos(rad(t + h))];
  const armPts = (a: [number, number]) => {
    const E = pt(S[0], S[1], 80, a[0]);
    const W = pt(E[0], E[1], 74, a[0] + a[1]);
    return { E, W, ang: a[0] + a[1] };
  };
  const legPts = (a: [number, number]) => {
    const K = pt(0, 0, 98, a[0]);
    const F = pt(K[0], K[1], 98, a[0] + a[1]);
    return { K, F };
  };
  const AL = armPts(aL);
  const AR = armPts(aR);
  const LL = legPts(lL);
  const LR = legPts(lR);
  const seg = (a: [number, number], b: [number, number], k: string) => (
    <g key={k} strokeLinecap="round">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={22} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={11} />
    </g>
  );
  const foot = (F: [number, number], k: string) => <line key={k} x1={F[0]} y1={F[1]} x2={F[0] + 36} y2={F[1]} stroke={INK} strokeWidth={22} strokeLinecap="round" />;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {/* far limbs first */}
      {seg([0, 0], LL.K, "lk")}
      {seg(LL.K, LL.F, "lf")}
      {foot(LL.F, "fl")}
      {seg(S, AL.E, "ae")}
      {seg(AL.E, AL.W, "aw")}
      <circle cx={AL.W[0]} cy={AL.W[1]} r={13} fill={INK} />
      {holdL && <g transform={`translate(${AL.W[0]} ${AL.W[1]}) rotate(${-AL.ang})`}>{holdL({ x: AL.W[0], y: AL.W[1], ang: AL.ang })}</g>}
      {/* torso */}
      {bodyBack}
      {seg([0, 0], S, "torso")}
      {bodyFront}
      {/* near limbs */}
      {seg([0, 0], LR.K, "rk")}
      {seg(LR.K, LR.F, "rf")}
      {foot(LR.F, "fr")}
      {seg(S, AR.E, "bre")}
      {seg(AR.E, AR.W, "brw")}
      <circle cx={AR.W[0]} cy={AR.W[1]} r={13} fill={INK} />
      {holdR && <g transform={`translate(${AR.W[0]} ${AR.W[1]}) rotate(${-AR.ang})`}>{holdR({ x: AR.W[0], y: AR.W[1], ang: AR.ang })}</g>}
      {/* head */}
      <g transform={`translate(${H[0]} ${H[1]}) rotate(${t + h})`}>
        {tuft && (
          <g stroke={INK} strokeWidth={8} strokeLinecap="round">
            <line x1={-8} y1={-62} x2={-18} y2={-92} />
            <line x1={4} y1={-64} x2={6} y2={-98} />
            <line x1={16} y1={-60} x2={28} y2={-88} />
          </g>
        )}
        {headBack}
        <circle r={64} fill="#fff" stroke={INK} strokeWidth={12} />
        <Face expr={expr} />
        {headFront}
        {cheek > 0 && <circle cx={36} cy={18} r={20 * cheek} fill="#ff5a5a" opacity={0.75} />}
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* The mosquito                                                          */
/* ------------------------------------------------------------------ */
export const Mosquito: React.FC<{ x: number; y: number; s?: number; rot?: number; t: number; mood?: "normal" | "smug" | "sleepy" | "tired"; flip?: boolean; wings?: boolean; trail?: [number, number][] }> = ({ x, y, s = 1, rot = 0, t, mood = "normal", flip = false, wings = true, trail }) => {
  const flap = wings ? Math.sin(t * 75) * 38 : -20;
  return (
    <g>
      {trail?.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3 + (i / trail.length) * 4 * s} fill="#fff" opacity={0.08 + (i / trail.length) * 0.28} />
      ))}
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`}>
        {/* wings */}
        <ellipse cx={-4} cy={-16} rx={22} ry={9} fill="#cfe9ff" stroke={INK} strokeWidth={3} opacity={0.85} transform={`rotate(${-28 + flap} -4 -8)`} />
        <ellipse cx={4} cy={-14} rx={20} ry={8} fill="#e3f2ff" stroke={INK} strokeWidth={3} opacity={0.8} transform={`rotate(${-8 - flap * 0.8} 4 -8)`} />
        {/* legs */}
        {[-12, 0, 12].map((lx, i) => (
          <path key={i} d={`M ${lx} 6 q ${i * 3 - 4} 16 ${i * 4 - 8} 24`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        ))}
        {/* body + abdomen */}
        <ellipse cx={-6} cy={0} rx={26} ry={11} fill="#3a3a48" stroke={INK} strokeWidth={4} />
        <path d="M -30 -2 q -10 2 -16 8" stroke="#3a3a48" strokeWidth={9} strokeLinecap="round" fill="none" />
        {/* stripes */}
        <path d="M -16 -10 v 20 M -6 -11 v 22 M 4 -10 v 20" stroke="#cfcfdc" strokeWidth={2.5} />
        {/* head + proboscis */}
        <circle cx={24} cy={-3} r={12} fill="#4a4a5c" stroke={INK} strokeWidth={4} />
        <line x1={34} y1={0} x2={64} y2={6} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
        {/* face */}
        {mood === "sleepy" ? (
          <path d="M 18 -6 q 5 4 10 0" stroke="#fff" strokeWidth={2.5} fill="none" />
        ) : (
          <>
            <circle cx={26} cy={-6} r={4.5} fill="#fff" />
            <circle cx={27.5} cy={-6} r={2.2} fill={INK} />
          </>
        )}
        {mood === "smug" && <path d="M 17 -11 l 14 -2" stroke="#fff" strokeWidth={2.5} />}
        {mood === "tired" && <path d="M 17 -11 l 14 1" stroke="#fff" strokeWidth={2.5} />}
      </g>
    </g>
  );
};

/** A wobbling flight path around (cx,cy). */
export const flightPath = (t: number, cx: number, cy: number, ax: number, ay: number, speed = 1, seed = 0): [number, number, number] => {
  const x = cx + ax * Math.sin(t * 1.9 * speed + seed) + ax * 0.35 * Math.sin(t * 4.3 * speed + seed * 2);
  const y = cy + ay * Math.sin(t * 2.6 * speed + seed * 1.3) + ay * 0.3 * Math.cos(t * 5.1 * speed);
  const dx = ax * 1.9 * speed * Math.cos(t * 1.9 * speed + seed);
  return [x, y, dx > 0 ? 1 : -1];
};

/* ------------------------------------------------------------------ */
/* Props                                                                 */
/* ------------------------------------------------------------------ */
export const Racket: React.FC<{ on?: boolean; t: number }> = ({ on = true, t }) => (
  <g transform="rotate(0)">
    <line x1={0} y1={0} x2={0} y2={-70} stroke={INK} strokeWidth={14} strokeLinecap="round" />
    <line x1={0} y1={0} x2={0} y2={-70} stroke="#e63946" strokeWidth={7} strokeLinecap="round" />
    <ellipse cx={0} cy={-150} rx={52} ry={74} fill={on ? "rgba(255,240,120,0.55)" : "rgba(255,255,255,0.3)"} stroke={INK} strokeWidth={9} />
    {[-30, -15, 0, 15, 30].map((gx) => (
      <line key={gx} x1={gx} y1={-215} x2={gx} y2={-85} stroke={INK} strokeWidth={3} opacity={0.6} />
    ))}
    {[-180, -150, -120].map((gy) => (
      <line key={gy} x1={-40} y1={gy} x2={40} y2={gy} stroke={INK} strokeWidth={3} opacity={0.6} />
    ))}
    {on && (
      <g stroke="#fff6a0" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.6 + 0.4 * Math.sin(t * 50)}>
        <path d="M -30 -190 l 12 14 l -10 8 l 14 16" />
        <path d="M 28 -120 l -12 -12 l 12 -10" />
      </g>
    )}
  </g>
);

export const SprayCan: React.FC = () => (
  <g>
    <rect x={-22} y={-110} width={44} height={110} rx={10} fill="#ff9f1c" stroke={INK} strokeWidth={7} />
    <rect x={-22} y={-90} width={44} height={30} fill="#fff" stroke={INK} strokeWidth={4} />
    <rect x={-12} y={-130} width={24} height={22} rx={4} fill="#444" stroke={INK} strokeWidth={5} />
    <rect x={-34} y={-128} width={24} height={10} rx={3} fill="#666" stroke={INK} strokeWidth={4} />
  </g>
);

export const Phone: React.FC<{ screen?: string; crack?: number; w?: number }> = ({ screen = "#e8f6ff", crack = 0, w = 1 }) => (
  <g transform={`scale(${w})`}>
    <rect x={-40} y={-150} width={80} height={140} rx={14} fill="#222" stroke={INK} strokeWidth={6} />
    <rect x={-33} y={-142} width={66} height={118} rx={7} fill={screen} />
    {crack > 0 && (
      <g stroke={INK} strokeWidth={2.5} fill="none" opacity={Math.min(1, crack)} strokeLinecap="round">
        <path d="M -4 -100 L 14 -120 L 22 -138 M -4 -100 L -24 -122 M -4 -100 L 8 -76 L 26 -60 M -4 -100 L -22 -78 L -30 -52" />
      </g>
    )}
  </g>
);

export const Guling: React.FC<{ x: number; y: number; scorch?: number; shake?: number; vertical?: boolean }> = ({ x, y, scorch = 0, shake = 0, vertical = false }) => (
  <g transform={`translate(${x + shake} ${y}) rotate(${vertical ? -90 : 0})`}>
    <rect x={-120} y={-34} width={240} height={68} rx={34} fill="#ffd166" stroke={INK} strokeWidth={8} />
    {[-70, -20, 30, 80].map((gx) => (
      <line key={gx} x1={gx} y1={-30} x2={gx} y2={30} stroke="#f4a261" strokeWidth={8} />
    ))}
    {scorch > 0 && <ellipse cx={-10} cy={0} rx={34 * scorch} ry={22 * scorch} fill="#3a2a22" opacity={0.7} />}
    {scorch > 0 && <path d="M -20 -20 l 10 -14 l 10 14" stroke="#e63946" strokeWidth={4} fill="none" />}
  </g>
);

export const Coil: React.FC<{ x: number; y: number; t: number; on?: boolean }> = ({ x, y, t, on = true }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={0} cy={0} rx={60} ry={14} fill="#8d99a6" stroke={INK} strokeWidth={6} />
    <ellipse cx={0} cy={-8} rx={44} ry={10} fill="none" stroke="#3a7a3a" strokeWidth={8} />
    <ellipse cx={0} cy={-8} rx={26} ry={6} fill="none" stroke="#3a7a3a" strokeWidth={8} />
    {on && <circle cx={44} cy={-8} r={6 + Math.sin(t * 20) * 1.5} fill="#ff5a2a" />}
  </g>
);

export const Fan: React.FC<{ x: number; y: number; t: number; on?: boolean }> = ({ x, y, t, on = true }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-10} y={0} width={20} height={150} fill="#9aa5b1" stroke={INK} strokeWidth={6} />
    <ellipse cx={0} cy={150} rx={55} ry={12} fill="#9aa5b1" stroke={INK} strokeWidth={6} />
    <circle cx={0} cy={-4} r={80} fill="rgba(255,255,255,0.18)" stroke={INK} strokeWidth={7} />
    <g transform={`rotate(${on ? t * 900 : 0})`}>
      {[0, 120, 240].map((a) => (
        <ellipse key={a} cx={0} cy={-38} rx={20} ry={40} fill="#6ec6ff" stroke={INK} strokeWidth={4} transform={`rotate(${a})`} opacity={on ? 0.75 : 1} />
      ))}
    </g>
    <circle cx={0} cy={-4} r={11} fill={INK} />
  </g>
);

/* ------------------------------------------------------------------ */
/* Comic effects                                                         */
/* ------------------------------------------------------------------ */
export const Star: React.FC<{ x: number; y: number; r: number; fill?: string; rot?: number; spikes?: number }> = ({ x, y, r, fill = "#ffe14d", rot = 0, spikes = 12 }) => {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.62 : r;
    pts.push(`${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} stroke={INK} strokeWidth={8} strokeLinejoin="round" transform={`rotate(${rot} ${x} ${y})`} />;
};

export const SpeedLines: React.FC<{ x: number; y: number; r0: number; r1: number; n?: number; seed?: number; color?: string; width?: number }> = ({ x, y, r0, r1, n = 14, seed = 0, color = "#fff", width = 5 }) => (
  <g stroke={color} strokeWidth={width} strokeLinecap="round" opacity={0.85}>
    {new Array(n).fill(0).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + seed;
      const l0 = r0 + ((i * 37) % 20);
      const l1 = r1 - ((i * 53) % 30);
      return <line key={i} x1={x + Math.cos(a) * l0} y1={y + Math.sin(a) * l0} x2={x + Math.cos(a) * l1} y2={y + Math.sin(a) * l1} />;
    })}
  </g>
);

export const Smoke: React.FC<{ x: number; y: number; t: number; amount: number; spread?: number; color?: string }> = ({ x, y, t, amount, spread = 160, color = "#cfd3da" }) => (
  <g>
    {new Array(Math.round(14 * amount)).fill(0).map((_, i) => {
      const life = (t * 0.35 + i * 0.137) % 1;
      const px = x + Math.sin(i * 2.3 + t * 1.2) * spread * (0.4 + life);
      const py = y - life * 520;
      const r = 36 + life * 90;
      return <circle key={i} cx={px} cy={py} r={r} fill={color} opacity={Math.sin(Math.PI * life) * 0.5 * amount} />;
    })}
  </g>
);

export const Zzz: React.FC<{ x: number; y: number; t: number; size?: number }> = ({ x, y, t, size = 1 }) => (
  <g fontFamily="Anton, Impact, sans-serif" fill="#cfe0ff" stroke={INK} strokeWidth={4} paintOrder="stroke">
    {[0, 1, 2].map((i) => {
      const life = (t * 0.5 + i / 3) % 1;
      return (
        <text key={i} x={x + life * 90 + i * 12} y={y - life * 200} fontSize={(46 + i * 14) * size} opacity={Math.sin(Math.PI * life)}>
          Z
        </text>
      );
    })}
  </g>
);

export const Bentol: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 14 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#ff5d6c" stroke="#b3202f" strokeWidth={3} />
    <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.28} fill="#ffb3ba" />
  </g>
);

/* ------------------------------------------------------------------ */
/* Bedroom                                                               */
/* ------------------------------------------------------------------ */
export type RoomMode = "night" | "dark" | "morning";
export const Room: React.FC<{ mode: RoomMode; clockMin: number; lamp?: boolean; t: number }> = ({ mode, clockMin, lamp = false, t }) => {
  const wall = mode === "morning" ? "#ffe6a8" : mode === "dark" ? "#0a0f24" : "#2a3560";
  const floor = mode === "morning" ? "#d9b27a" : mode === "dark" ? "#0b1020" : "#3a4468";
  const sky = mode === "morning" ? "#9fdcff" : mode === "dark" ? "#0a1230" : "#0e1a46";
  const wood = mode === "morning" ? "#b5793c" : mode === "dark" ? "#2a2218" : "#6b4a2e";
  const hAng = ((clockMin / 60) % 12) * 30;
  const mAng = (clockMin % 60) * 6;
  return (
    <g>
      <rect x={-600} y={-600} width={2300} height={2000} fill={wall} />
      <rect x={-600} y={1400} width={2300} height={900} fill={floor} />
      <rect x={-600} y={1384} width={2300} height={22} fill={wood} stroke={INK} strokeWidth={5} />
      {/* window */}
      <rect x={690} y={300} width={320} height={420} fill={sky} stroke={INK} strokeWidth={12} />
      {mode !== "morning" && (
        <g>
          <circle cx={850} cy={470} r={mode === "dark" ? 46 : 60} fill="#fff4c2" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={720 + ((i * 53) % 270)} cy={340 + ((i * 71) % 120)} r={3 + (i % 2)} fill="#fff" opacity={0.6 + 0.4 * Math.sin(t * 2 + i)} />
          ))}
        </g>
      )}
      {mode === "morning" && (
        <g>
          <circle cx={900} cy={420} r={70} fill="#ffd23f" />
          <path d="M 700 640 q 40 -40 80 0 q 40 -40 90 0" stroke="#fff" strokeWidth={30} fill="none" strokeLinecap="round" opacity={0.9} />
        </g>
      )}
      <line x1={850} y1={300} x2={850} y2={720} stroke={INK} strokeWidth={9} />
      <line x1={690} y1={510} x2={1010} y2={510} stroke={INK} strokeWidth={9} />
      <path d="M 670 290 q 20 220 0 450 h 90 q 20 -220 0 -450 Z" fill="#c0407a" stroke={INK} strokeWidth={8} opacity={mode === "dark" ? 0.5 : 1} />
      <path d="M 1030 290 q -20 220 0 450 h -90 q -20 -220 0 -450 Z" fill="#c0407a" stroke={INK} strokeWidth={8} opacity={mode === "dark" ? 0.5 : 1} />
      {/* clock */}
      <circle cx={250} cy={520} r={104} fill="#fffaf0" stroke={INK} strokeWidth={12} />
      {[...Array(12)].map((_, i) => (
        <line key={i} x1={250 + Math.sin(rad(i * 30)) * 84} y1={520 - Math.cos(rad(i * 30)) * 84} x2={250 + Math.sin(rad(i * 30)) * 96} y2={520 - Math.cos(rad(i * 30)) * 96} stroke={INK} strokeWidth={6} />
      ))}
      <line x1={250} y1={520} x2={250 + Math.sin(rad(hAng)) * 52} y2={520 - Math.cos(rad(hAng)) * 52} stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <line x1={250} y1={520} x2={250 + Math.sin(rad(mAng)) * 78} y2={520 - Math.cos(rad(mAng)) * 78} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <circle cx={250} cy={520} r={9} fill="#e63946" />
      {/* bed */}
      <rect x={20} y={1010} width={90} height={330} rx={14} fill={wood} stroke={INK} strokeWidth={10} />
      <rect x={20} y={1230} width={650} height={90} rx={14} fill={wood} stroke={INK} strokeWidth={10} />
      <rect x={110} y={1180} width={540} height={70} rx={18} fill={mode === "morning" ? "#ffffff" : "#dfe6ff"} stroke={INK} strokeWidth={9} />
      <rect x={30} y={1320} width={30} height={70} fill={wood} stroke={INK} strokeWidth={7} />
      <rect x={610} y={1320} width={30} height={70} fill={wood} stroke={INK} strokeWidth={7} />
      <ellipse cx={200} cy={1160} rx={92} ry={34} fill="#fff" stroke={INK} strokeWidth={8} />
      {/* nightstand + lamp */}
      <rect x={770} y={1240} width={200} height={150} rx={10} fill={wood} stroke={INK} strokeWidth={9} />
      <line x1={770} y1={1315} x2={970} y2={1315} stroke={INK} strokeWidth={6} />
      <rect x={860} y={1170} width={20} height={70} fill="#888" stroke={INK} strokeWidth={6} />
      <path d="M 820 1170 L 920 1170 L 900 1070 L 840 1070 Z" fill={lamp ? "#ffe9a3" : "#c9b89a"} stroke={INK} strokeWidth={8} />
      {lamp && <circle cx={870} cy={1120} r={210} fill="url(#lampglow)" />}
      <defs>
        <radialGradient id="lampglow">
          <stop offset="0%" stopColor="#ffe9a3" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#ffe9a3" stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  );
};

/** Kelambu (mosquito net) over the bed. */
export const Net: React.FC<{ grow: number }> = ({ grow }) => (
  <g opacity={0.5 + 0.35 * grow} transform={`translate(0 ${(1 - grow) * -220})`}>
    <path d="M 0 880 L 680 880 L 710 1340 L -20 1340 Z" fill="rgba(255,255,255,0.35)" stroke="#fff" strokeWidth={6} />
    {[...Array(12)].map((_, i) => (
      <line key={i} x1={i * 60 + 10} y1={880} x2={i * 60 + 4 + (i - 6) * 3} y2={1340} stroke="rgba(255,255,255,0.55)" strokeWidth={3} />
    ))}
    {[960, 1040, 1120, 1200, 1280].map((y) => (
      <line key={y} x1={-10} y1={y} x2={700} y2={y} stroke="rgba(255,255,255,0.45)" strokeWidth={3} />
    ))}
  </g>
);

/** Lying Bimo (on the pillow, under the blanket). */
export const LyingBimo: React.FC<{ expr: Expr; t: number; armUp?: number; blanket?: string; bentol?: [number, number][] }> = ({ expr, t, armUp = 0, blanket = "#6ec6ff", bentol }) => (
  <g>
    {/* body under blanket */}
    <path d={`M 262 1240 Q 300 1150 380 1160 Q 470 1150 560 1166 Q 640 1170 660 1240 Z`} fill={blanket} stroke={INK} strokeWidth={9} />
    {[330, 420, 510, 600].map((x) => (
      <line key={x} x1={x} y1={1172} x2={x - 8} y2={1236} stroke="#fff" strokeWidth={7} opacity={0.6} />
    ))}
    {/* arm */}
    <g transform={`translate(270 1180) rotate(${-armUp * 160})`}>
      <line x1={0} y1={0} x2={86} y2={-6} stroke={INK} strokeWidth={22} strokeLinecap="round" />
      <line x1={0} y1={0} x2={86} y2={-6} stroke="#2d6cdf" strokeWidth={11} strokeLinecap="round" />
      <circle cx={94} cy={-6} r={13} fill={INK} />
    </g>
    {/* head on pillow */}
    <g transform={`translate(196 1124) rotate(${Math.sin(t * 1.4) * 1.5})`}>
      <g stroke={INK} strokeWidth={8} strokeLinecap="round">
        <line x1={-8} y1={-62} x2={-18} y2={-92} />
        <line x1={4} y1={-64} x2={6} y2={-98} />
        <line x1={16} y1={-60} x2={28} y2={-88} />
      </g>
      <circle r={64} fill="#fff" stroke={INK} strokeWidth={12} />
      <Face expr={expr} />
      {bentol?.map((b, i) => (
        <Bentol key={i} x={b[0]} y={b[1]} r={9} />
      ))}
    </g>
  </g>
);

export { rad };

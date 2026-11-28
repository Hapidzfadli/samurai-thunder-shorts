/**
 * Komposisi Utama V2 DINAMIS & INTERAKTIF (1080x1920 @ 30fps):
 *   "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)"
 *
 * Upgrade V2 ala Rudal Merpati 1944:
 *   - 4 Insert Close-Up 2D layar penuh (`mic` KLIK!, `door` SRAAK!, `brake` CIIIT!, `chomp` KRES-KRES!)
 *   - Anime `speedLines`, impact `flash` putih, & color grading dinamis (`cool` X-Ray / `warm` amarah Direktur)
 *   - Pop-up `Emote` komik memantul + BigTitle Counter `$0 -> $20,000,000` + X-Ray Badges + Live Radar HUD
 *   - Subtitle 1-2 kata berwarna per pembicara dengan animasi pop/shake sesuai gaya emosi!
 */
import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { KucingTiming, KucingWorld3D, useLoadedKucingGlb } from "./scenesKucing";
import rawTiming from "./kucing_timing.json";

const TIMING = rawTiming as unknown as KucingTiming;
export const TOTAL_FRAMES_KUCING = TIMING.totalFrames;

const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;

/* ==================== GRADE: SPEED LINES + FLASH + TINT ==================== */
const GradeOverlay: React.FC<{ warm?: number; cool?: number; flash?: number; speedLines?: number; lineColor?: string }> = ({
  warm = 0,
  cool = 0,
  flash = 0,
  speedLines = 0,
  lineColor = "rgba(255,248,220,0.46)",
}) => (
  <>
    {(warm > 0 || cool > 0) && (
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: warm > 0 ? `rgba(255,95,45,${0.36 * warm})` : `rgba(55,120,235,${0.28 * cool})`,
          pointerEvents: "none",
        }}
      />
    )}
    {speedLines > 0 && (
      <AbsoluteFill style={{ opacity: speedLines, pointerEvents: "none" }}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          {new Array(18).fill(0).map((_, i) => {
            const ang = (i / 18) * Math.PI * 2 + 0.12;
            return (
              <line
                key={i}
                x1={540 + Math.cos(ang) * 410}
                y1={860 + Math.sin(ang) * 510}
                x2={540 + Math.cos(ang) * 1160}
                y2={860 + Math.sin(ang) * 1260}
                stroke={lineColor}
                strokeWidth={i % 2 ? 10 : 20}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </AbsoluteFill>
    )}
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 45%, transparent 56%, rgba(8,10,16,0.44) 100%)",
        pointerEvents: "none",
      }}
    />
    {flash > 0 && <AbsoluteFill style={{ background: "#fff9e6", opacity: flash, pointerEvents: "none" }} />}
  </>
);

/* ==================== HAND SVG + 4 FULL-SCREEN COMIC INSERTS ==================== */
const HandSvg: React.FC<{ x: number; y: number; rot?: number; s?: number; grip?: number; sleeve?: string; skin?: string }> = ({
  x,
  y,
  rot = 0,
  s = 1,
  grip = 0,
  sleeve = "#1b2230",
  skin = "#f2d3af",
}) => {
  const ink = "#221720";
  const fingers = [-52, -18, 18, 50].map((fy, i) => {
    const len = [90, 102, 96, 78][i];
    const ang = grip * 68;
    return (
      <g key={i} transform={`translate(68 ${fy}) rotate(${ang})`}>
        <rect x="-8" y="-16" width={len} height="32" rx="16" fill={skin} stroke={ink} strokeWidth="11" />
      </g>
    );
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M -310 -78 L -70 -86 L -60 86 L -310 96 Z" fill={sleeve} stroke={ink} strokeWidth="14" strokeLinejoin="round" />
      <rect x="-84" y="-92" width="32" height="184" rx="10" fill={sleeve} stroke={ink} strokeWidth="12" />
      {fingers}
      <ellipse cx="18" cy="0" rx="76" ry="82" fill={skin} stroke={ink} strokeWidth="14" />
      <g transform={`translate(10 -68) rotate(${-40 + grip * 48})`}>
        <rect x="-10" y="-18" width="84" height="36" rx="18" fill={skin} stroke={ink} strokeWidth="11" />
      </g>
    </g>
  );
};

type KucingInsertKind = "mic" | "door" | "brake" | "chomp";
const ComicInsert: React.FC<{ kind: KucingInsertKind; from: number; len: number }> = ({ kind, from, len }) => {
  const frame = useCurrentFrame();
  const d = frame - from;
  if (d < 0 || d > len) return null;
  const k = d / len;
  const op = Math.min(smoother(cl(d / 4)), smoother(cl((len - d) / 5)));
  const a = smoother(cl((d - 3) / Math.max(1, len - 9)));
  const ink = "#221720";
  const bgMap: Record<KucingInsertKind, string> = {
    mic: "#0c2848",
    door: "#f7c981",
    brake: "#ffe4a8",
    chomp: "#ffcf70",
  };

  return (
    <AbsoluteFill style={{ opacity: op, pointerEvents: "none" }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs>
          <radialGradient id={`kig-${kind}`} cx="50%" cy="46%" r="68%">
            <stop offset="0%" stopColor={kind === "mic" ? "#1c4e80" : "#fffaf0"} />
            <stop offset="100%" stopColor={bgMap[kind]} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1080" height="1920" fill={`url(#kig-${kind})`} />
        {/* Dynamic comic sunburst rays */}
        {new Array(12).fill(0).map((_, i) => (
          <line
            key={i}
            x1={540}
            y1={920}
            x2={540 + Math.cos(i * 0.52 + k * 0.9) * 1100}
            y2={920 + Math.sin(i * 0.52 + k * 0.9) * 1100}
            stroke={kind === "mic" ? "rgba(83,220,255,0.14)" : "rgba(34,23,32,0.08)"}
            strokeWidth="44"
          />
        ))}

        {/* INSERT 1: Lab Hand clipping glowing spy mic onto Agen Meong's twitching ear! */}
        {kind === "mic" && (
          <g>
            {/* Big Orange Cat Ear & Side-Eye Head */}
            <g transform={`translate(690 1060) rotate(${Math.sin(d * 0.7) * 2.5})`}>
              <polygon points="-240,-150 -140,-410 40,-175" fill="#f29b38" stroke={ink} strokeWidth="18" strokeLinejoin="round" />
              <polygon points="-195,-170 -132,-340 -22,-185" fill="#ffd2c2" stroke={ink} strokeWidth="10" strokeLinejoin="round" />
              <ellipse cx="0" cy="40" rx="280" ry="230" fill="#f29b38" stroke={ink} strokeWidth="18" />
              {/* Annoyed deadpan side-eye */}
              <ellipse cx="-85" cy="10" rx="54" ry="48" fill="#ffffff" stroke={ink} strokeWidth="12" />
              <circle cx="-112" cy="12" r="20" fill={ink} />
              <line x1="-150" y1="-44" x2="-30" y2="-28" stroke={ink} strokeWidth="16" strokeLinecap="round" />
            </g>
            {/* Glowing Spy Microphone clipped into ear */}
            <g transform={`translate(${lerpN(350, 565, a)} ${lerpN(650, 815, a)})`}>
              <circle cx="0" cy="0" r="38" fill="#2c3442" stroke={ink} strokeWidth="12" />
              <circle cx="0" cy="0" r="18" fill="#ffe047" />
              {a > 0.7 && (
                <>
                  <circle cx="0" cy="0" r={55 + (d % 8) * 9} fill="none" stroke="#53dcff" strokeWidth="8" opacity="0.85" />
                  <circle cx="0" cy="0" r={95 + (d % 8) * 11} fill="none" stroke="#53dcff" strokeWidth="6" opacity="0.5" />
                </>
              )}
            </g>
            <HandSvg x={lerpN(140, 355, a)} y={lerpN(590, 775, a)} rot={18} s={1.45} grip={0.55 + a * 0.35} sleeve="#f2f4f8" />
            {a > 0.62 && (
              <text x="540" y="470" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="950" fontSize="92" fill="#ffe047" stroke={ink} strokeWidth="16" paintOrder="stroke">
                KLIK! MIKROFON!
              </text>
            )}
          </g>
        )}

        {/* INSERT 2: CIA Agent Hand yanking sliding Van Door open SRAAK! */}
        {kind === "door" && (
          <g>
            {/* Golden sunset outdoor crack widening as door slides right! */}
            <rect x="0" y="340" width={lerpN(120, 720, a)} height="1240" fill="#ffb86b" />
            <circle cx="240" cy="760" r="140" fill="#ffe98a" opacity="0.85" />
            {/* Dark Steel CIA Van Sliding Door */}
            <g transform={`translate(${lerpN(120, 720, a)} 340)`}>
              <rect x="0" y="0" width="960" height="1240" fill="#2d3b4e" stroke={ink} strokeWidth="20" />
              <rect x="90" y="130" width="660" height="440" rx="28" fill="#5e7999" stroke={ink} strokeWidth="16" />
              {/* Chrome Pull Handle */}
              <rect x="52" y="640" width="54" height="210" rx="18" fill="#dfe6ee" stroke={ink} strokeWidth="14" />
            </g>
            {/* Wavy Grilled Fish Aroma sneaking into van! */}
            {a > 0.3 &&
              [0, 1, 2].map((i) => (
                <path
                  key={i}
                  d={`M ${110 + i * 110} ${1180 - a * 220} Q ${170 + i * 110} ${1040 - a * 220} ${120 + i * 110} ${900 - a * 220}`}
                  fill="none"
                  stroke="#fff5d6"
                  strokeWidth="18"
                  strokeLinecap="round"
                  opacity="0.78"
                />
              ))}
            <HandSvg x={lerpN(42, 642, a)} y={1085} rot={-6} s={1.45} grip={0.95} sleeve="#171e2b" />
            <text x="540" y="455" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="950" fontSize="74" fill="#ffde42" stroke={ink} strokeWidth="15" paintOrder="stroke">
              SRAAK!! MISI MULAI!
            </text>
          </g>
        )}

        {/* INSERT 3: Yellow Taxi Tire slamming brakes CIIIT! on zebra crosswalk! */}
        {kind === "brake" && (
          <g>
            {/* Asphalt road & white zebra stripes */}
            <rect x="0" y="1060" width="1080" height="860" fill="#23272e" />
            {[0, 1, 2, 3].map((i) => (
              <polygon
                key={i}
                points={`${-80 + i * 320 - a * 180},1220 ${130 + i * 320 - a * 180},1220 ${40 + i * 320 - a * 180},1520 ${-170 + i * 320 - a * 180},1520`}
                fill="#f2f4f8"
              />
            ))}
            {/* Black rubber skid marks */}
            <rect x="0" y="1280" width={lerpN(180, 680, a)} height="74" rx="20" fill="#0d0f14" opacity="0.88" />
            {/* Yellow Taxi fender & smoking wheel */}
            <g transform={`translate(${lerpN(220, 620, a)} ${940 + Math.sin(d * 3) * 10}) rotate(${-a * 9})`}>
              <rect x="-580" y="-260" width="760" height="310" rx="45" fill="#f7c52a" stroke={ink} strokeWidth="20" />
              <rect x="-560" y="-120" width="720" height="44" fill={ink} />
              <circle cx="0" cy="140" r="195" fill="#1d2128" stroke={ink} strokeWidth="20" />
              <circle cx="0" cy="140" r="88" fill="#d4dbe4" stroke={ink} strokeWidth="14" />
            </g>
            {/* White brake smoke puffs & orange sparks */}
            {[0, 1, 2, 3].map((i) => (
              <circle
                key={i}
                cx={lerpN(160, 440, a) - i * 85}
                cy={1240 - i * 48 - a * 55}
                r={52 + i * 24}
                fill="#ffffff"
                opacity={0.78 - i * 0.14}
              />
            ))}
            <text x="540" y="480" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="950" fontSize="90" fill="#ff3b30" stroke="#ffffff" strokeWidth="16" paintOrder="stroke">
              CIIIT!! NYARIS!!
            </text>
          </g>
        )}

        {/* INSERT 4: Close-Up Agen Meong CHOMPING sizzling Grilled Ikan Tongkol KRES-KRES!! */}
        {kind === "chomp" && (
          <g>
            {/* Happy Orange CIA Cat Face with Cool Sunglasses */}
            <g transform={`translate(540 ${940 + Math.abs(Math.sin(d * 0.9)) * -24})`}>
              {/* Ears */}
              <polygon points="-250,-190 -185,-395 -45,-230" fill="#f29b38" stroke={ink} strokeWidth="18" strokeLinejoin="round" />
              <polygon points="250,-190 185,-395 45,-230" fill="#f29b38" stroke={ink} strokeWidth="18" strokeLinejoin="round" />
              <ellipse cx="0" cy="0" rx="295" ry="245" fill="#f29b38" stroke={ink} strokeWidth="18" />
              {/* Cool CIA Aviator Shades */}
              <rect x="-215" y="-115" width="185" height="108" rx="34" fill="#151924" stroke={ink} strokeWidth="14" />
              <rect x="30" y="-115" width="185" height="108" rx="34" fill="#151924" stroke={ink} strokeWidth="14" />
              <line x1="-30" y1="-72" x2="30" y2="-72" stroke={ink} strokeWidth="16" />
              <line x1="-175" y1="-42" x2="-110" y2="-95" stroke="rgba(255,255,255,0.65)" strokeWidth="16" strokeLinecap="round" />
              <line x1="70" y1="-42" x2="135" y2="-95" stroke="rgba(255,255,255,0.65)" strokeWidth="16" strokeLinecap="round" />
              {/* Wide chomping mouth with sizzling Grilled Fish! */}
              <ellipse cx="0" cy="95" rx="115" ry={48 + Math.abs(Math.sin(d * 0.85)) * 42} fill="#8c1d24" stroke={ink} strokeWidth="14" />
              {/* Grilled Ikan Tongkol held in mouth */}
              <g transform={`translate(${Math.sin(d * 1.1) * 14} 105) rotate(${Math.sin(d * 0.9) * 6})`}>
                <ellipse cx="0" cy="0" rx="255" ry="74" fill="#c96f28" stroke={ink} strokeWidth="16" />
                <polygon points="225,0 325,-72 305,0 325,72" fill="#b35c1e" stroke={ink} strokeWidth="14" strokeLinejoin="round" />
                {/* Grill char stripes */}
                {[-110, -40, 30, 100].map((gx) => (
                  <line key={gx} x1={gx} y1="-50" x2={gx - 22} y2="50" stroke="#4f220c" strokeWidth="14" strokeLinecap="round" />
                ))}
                <circle cx="-175" cy="-14" r="14" fill="#ffffff" stroke={ink} strokeWidth="6" />
              </g>
            </g>
            {/* Radio Signal Waves pulsing out of headset/mic! */}
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                cx="540"
                cy="940"
                r={330 + ((d * 16 + i * 90) % 270)}
                fill="none"
                stroke="#4cff91"
                strokeWidth="9"
                opacity="0.55"
              />
            ))}
            <text x="540" y="450" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="950" fontSize="76" fill="#ffe135" stroke={ink} strokeWidth="15" paintOrder="stroke">
              KRES-KRES!! ENAK!
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

/* ==================== POP-UP COMIC EMOTE & STAMP ==================== */
const EmotePop: React.FC<{
  text: string;
  x: number;
  y: number;
  startFrame: number;
  endFrame: number;
  color?: string;
  size?: number;
}> = ({ text, x, y, startFrame, endFrame, color = "#ffe135", size = 68 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame || frame > endFrame) return null;
  const f = frame - startFrame;
  const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 260 } });
  const op = interpolate(frame, [endFrame - 6, endFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wob = Math.sin(f * 0.45) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 180,
        top: y - 50,
        width: 360,
        textAlign: "center",
        transform: `scale(${s}) rotate(${wob}deg)`,
        opacity: op,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 950,
          fontSize: size,
          color,
          WebkitTextStroke: "5px #1a121c",
          paintOrder: "stroke fill",
          textShadow: "0 7px 0 rgba(0,0,0,0.45)",
        }}
      >
        {text}
      </span>
    </div>
  );
};

const Stamp: React.FC<{
  text: string;
  color?: string;
  bg?: string;
  rotate?: number;
  top?: number;
  startFrame: number;
  endFrame: number;
}> = ({ text, color = "#fff9e6", bg = "#d62828", rotate = -4, top = 210, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame || frame > endFrame) return null;
  const f = frame - startFrame;
  const s = spring({ frame: f, fps, config: { damping: 10, stiffness: 240, mass: 0.65 } });
  const outOp = interpolate(frame, [endFrame - 6, endFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = f < 10 ? Math.sin(f * 3.8) * 4 : 0;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: outOp,
      }}
    >
      <div
        style={{
          transform: `scale(${s}) rotate(${rotate}deg) translateX(${shake}px)`,
          background: bg,
          color,
          border: "5px solid #1a1418",
          boxShadow: "0 10px 0 rgba(20,14,18,0.85)",
          borderRadius: 18,
          padding: "14px 34px",
          fontSize: 46,
          fontWeight: 950,
          letterSpacing: 1.5,
          textShadow: "0 3px 0 rgba(0,0,0,0.45)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const TopPill: React.FC<{ text: string; accent?: string; visible: boolean }> = ({ text, accent = "#ffd447", visible }) => {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 88,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(18, 24, 34, 0.88)",
          color: "#fff8eb",
          border: `3px solid ${accent}`,
          borderRadius: 999,
          padding: "9px 26px",
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: 1.4,
          boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const KucingCia: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sceneRoot = useLoadedKucingGlb("models/kucing_cia.glb");
  const S = TIMING.scenes;
  const EV = TIMING.events;

  const inScene = (name: string) => {
    const m = S[name];
    return m ? frame >= m.startFrame && frame < m.endFrame : false;
  };

  // Dynamic Color Grade, Speed Lines & Impact Flashes synced to key beats!
  const flashAt = (at: number, dur = 6) => {
    const d = frame - at;
    return d >= 0 && d < dur ? (1 - d / dur) * 0.72 : 0;
  };
  const flash = Math.max(
    flashAt(EV["hook.kucing"], 5),
    flashAt(EV["lep.apa"], 5),
    flashAt(EV["kac.ngerem"] - 2, 6),
    flashAt(EV["dir.siapa"], 6),
    flashAt(EV["akh.batal"], 5)
  );
  const isSpeedAction =
    (inScene("lepas") && (frame < EV["lep.apa"] + 35 || frame >= EV["lep.taksi"] - 10)) ||
    (inScene("kacau") && frame < EV["kac.gerobak"] + 8) ||
    (inScene("direktur") && frame >= EV["dir.siapa"]);
  const speedLines = isSpeedAction ? (inScene("direktur") ? 0.92 : 0.72) : 0;
  const warm = inScene("direktur") && frame >= EV["dir.siapa"] ? 0.85 : 0;
  const cool = inScene("xray") ? 0.45 : 0;

  // 1. Dynamic Hook Budget Counter ($0 -> $20,000,000!)
  const showBudget = inScene("hook") && frame >= EV["hook.dolar"] - 8;
  const budgetVal = Math.round(
    interpolate(frame, [EV["hook.dolar"] - 8, EV["hook.dolar"] + 34], [0, 20000000], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  // 2. X-Ray Callouts in Scene 3
  const showXr = inScene("xray");
  const xrStep =
    frame >= EV["xr.ekor"] ? 3 : frame >= EV["xr.pemancar"] ? 2 : frame >= EV["xr.kuping"] ? 1 : 0;

  // 3. Surveillance Radar HUD in Scene 6
  const showRadarHud = inScene("kacau") && frame >= EV["kac.gerobak"] - 10;
  const lockedFish = frame >= EV["kac.radar"] - 4;

  // 4. Active Word-Synced Dynamic Colored Caption
  const activeCap = TIMING.captions.find((c) => frame >= c.startFrame && frame <= c.endFrame);

  const renderCaption = () => {
    if (!activeCap) return null;
    const cf = frame - activeCap.startFrame;
    const pop = spring({ frame: cf, fps, config: { damping: 12, stiffness: 280, mass: 0.6 } });
    const isIntense = ["kaget", "panik", "marah"].includes(activeCap.style);
    const isWhisper = activeCap.style === "bisik";
    const isDir = activeCap.voice === "direktur";
    const isAra = activeCap.voice === "ara";

    const color = isDir ? "#ffeb52" : isAra ? "#ffd6ea" : isIntense ? "#ffe047" : "#ffffff";
    const strokeBg = isDir ? "#9c1111" : "#161118";
    const fontSize = isDir ? 78 : isIntense ? 74 : isWhisper ? 54 : 66;
    const shakeX = isIntense || isDir ? Math.sin(cf * 2.8) * 5 : 0;
    const tilt = isIntense ? (cf % 6 < 3 ? -2.2 : 2.2) : isAra ? -1.2 : 0;

    return (
      <div
        style={{
          position: "absolute",
          bottom: 295,
          left: 44,
          right: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {isDir && (
          <div
            style={{
              background: "#c92a2a",
              color: "#fff",
              fontSize: 22,
              fontWeight: 900,
              padding: "4px 16px",
              borderRadius: 999,
              border: "3px solid #161118",
              marginBottom: 8,
              letterSpacing: 1.5,
            }}
          >
            PAK DIREKTUR CIA (VIA HEADSET)
          </div>
        )}
        <div
          style={{
            transform: `scale(${0.86 + pop * 0.14}) translateX(${shakeX}px) rotate(${tilt}deg)`,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 950,
            fontSize,
            lineHeight: 1.08,
            textAlign: "center",
            color,
            textTransform: isDir || isIntense ? "uppercase" : "none",
            fontStyle: isWhisper ? "italic" : "normal",
            WebkitTextStroke: `4px ${strokeBg}`,
            paintOrder: "stroke fill",
            textShadow: `0 7px 0 ${strokeBg}, 0 12px 24px rgba(0,0,0,0.6)`,
          }}
        >
          {activeCap.text}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#141a24" }}>
      {/* Main 3D Blender + 2D Extra-Expressive World V2 */}
      {sceneRoot && (
        <ThreeCanvas width={width} height={height} shadows={false} dpr={1} camera={{ near: 0.1, far: 400 }}>
          <KucingWorld3D timing={TIMING} sceneRoot={sceneRoot} />
        </ThreeCanvas>
      )}

      {/* Master Audio */}
      {withAudio && <Audio src={staticFile("audio/kucing_master.mp3")} />}

      {/* 4 Full-Screen Interactive Hand-Drawn SVG Comic Inserts! */}
      <ComicInsert kind="mic" from={EV["xr.kuping"] - 4} len={34} />
      <ComicInsert kind="door" from={EV["van.pintu"] - 2} len={30} />
      <ComicInsert kind="brake" from={EV["kac.ngerem"] - 4} len={26} />
      <ComicInsert kind="chomp" from={EV["kac.tongkol"] - 22} len={36} />

      {/* Dynamic Grade: Speed Lines + Color Tint + Impact Flash */}
      <GradeOverlay
        warm={warm}
        cool={cool}
        flash={flash}
        speedLines={speedLines}
        lineColor={inScene("direktur") ? "rgba(255,95,70,0.52)" : "rgba(255,248,220,0.46)"}
      />

      {/* Pop-Up Comic Emotes */}
      <EmotePop text="MEONG?!" x={780} y={560} startFrame={EV["hook.kucing"] + 8} endFrame={S.hook.endFrame - 4} color="#ffe135" size={64} />
      <EmotePop text="ZZZ..." x={760} y={590} startFrame={EV["lab.nyadap"] + 28} endFrame={S.lab.endFrame - 4} color="#53dcff" size={62} />
      <EmotePop text="KABUR!!" x={300} y={540} startFrame={EV["lep.belok"]} endFrame={EV["lep.taksi"] - 4} color="#ff5c54" size={72} />
      <EmotePop text="BRAAK!!" x={780} y={510} startFrame={EV["dir.siapa"] + 24} endFrame={EV["dir.siapa"] + 68} color="#ffeb52" size={76} />

      {/* ========== TOP CONTEXT PILLS PER SCENE ========== */}
      <TopPill text="CIA TOP SECRET · WASHINGTON 1966" visible={inScene("hook") || inScene("lab")} />
      <TopPill text="BEDAH X-RAY · OPERATION ACOUSTIC KITTY" accent="#53dcff" visible={inScene("xray")} />
      <TopPill text="VAN PENYADAP CIA · MISI PERDANA" accent="#4cff91" visible={inScene("van")} />
      <TopPill text="PENNSYLVANIA AVE · WASHINGTON D.C." accent="#ff9d2e" visible={inScene("lepas") || inScene("kacau")} />
      <TopPill text="REKAMAN LANGSUNG · HEADSET DIREKTUR" accent="#ff3b30" visible={inScene("direktur")} />
      <TopPill text="ARSIP CIA · 1967 (RESMI DIBATALKAN)" accent="#ffd447" visible={inScene("akhir")} />

      {/* ========== HOOK BIG TITLE & $20M COUNTER ========== */}
      {showBudget && (
        <div
          style={{
            position: "absolute",
            top: 170,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(16, 28, 22, 0.92)",
              border: "4px solid #4cff91",
              borderRadius: 18,
              padding: "10px 30px",
              color: "#4cff91",
              fontFamily: "monospace",
              fontSize: 48,
              fontWeight: 900,
              boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            }}
          >
            ${budgetVal.toLocaleString("en-US")}
          </div>
        </div>
      )}
      <Stamp
        text="KUCING CIA · $20 JUTA!"
        bg="#f4b41a"
        color="#181214"
        rotate={-3}
        top={275}
        startFrame={EV["hook.kucing"]}
        endFrame={S.hook.endFrame}
      />

      {/* ========== SCENE 3: X-RAY 3D GADGET CALLOUT BADGES ========== */}
      {showXr && xrStep >= 1 && (
        <div
          style={{
            position: "absolute",
            top: 175,
            left: 56,
            right: 56,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            pointerEvents: "none",
          }}
        >
          {[
            { n: 1, label: "1. MIKROFON MINI DI KUPING", col: "#ffe047" },
            { n: 2, label: "2. PEMANCAR RADIO DI DADA", col: "#ff5c54" },
            { n: 3, label: "3. ANTENA KAWAT DI EKOR", col: "#53dcff" },
          ]
            .filter((item) => xrStep >= item.n)
            .map((item) => (
              <div
                key={item.n}
                style={{
                  background: "rgba(8, 22, 42, 0.88)",
                  borderLeft: `8px solid ${item.col}`,
                  border: `2px solid ${item.col}`,
                  borderRadius: 12,
                  padding: "10px 20px",
                  color: "#ffffff",
                  fontSize: 27,
                  fontWeight: 900,
                  fontFamily: "system-ui, sans-serif",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.45)",
                }}
              >
                <span style={{ color: item.col }}>●</span> {item.label}
              </div>
            ))}
        </div>
      )}

      {/* ========== SCENE 5: ALARM WARNING BANNER ========== */}
      <Stamp
        text="AWAS TAKSI KUNING!!"
        bg="#e6392e"
        color="#fff6cc"
        rotate={3}
        top={185}
        startFrame={EV["lep.taksi"] - 4}
        endFrame={S.lepas.endFrame}
      />

      {/* ========== SCENE 6: INTERACTIVE SURVEILLANCE RADAR HUD ========== */}
      {showRadarHud && (
        <div
          style={{
            position: "absolute",
            top: 165,
            left: 64,
            right: 64,
            background: lockedFish ? "rgba(65, 16, 14, 0.92)" : "rgba(10, 32, 24, 0.90)",
            border: `4px solid ${lockedFish ? "#ff5247" : "#4cff91"}`,
            borderRadius: 18,
            padding: "14px 24px",
            fontFamily: "monospace",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        >
          <div style={{ color: "#d8e4f0", fontSize: 21, fontWeight: 800 }}>
            RADAR SINYAL ACOUSTIC KITTY ($20,000,000)
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 32,
              fontWeight: 950,
              color: lockedFish ? "#ffe047" : "#4cff91",
            }}
          >
            {lockedFish ? "LOCKED: IKAN TONGKOL BAKAR!!" : "TARGET: DIPLOMAT TAMAN..."}
          </div>
          <div style={{ marginTop: 4, fontSize: 20, color: lockedFish ? "#ff8a80" : "#9af7c4", fontWeight: 700 }}>
            {lockedFish ? "DIPLOMAT: DITINGGAL ❌   |   KUCING: NGUNYAH ✅" : "STATUS: MELENCENG KE GEROBAK..."}
          </div>
        </div>
      )}

      {/* ========== SCENE 7: RADIO AUDIO WAVEFORM + DIRECTOR FURY STAMP ========== */}
      {inScene("direktur") && frame < EV["dir.siapa"] && (
        <Stamp
          text='HEADSET: "MEONG! KRES-KRES!"'
          bg="#1d2f45"
          color="#53dcff"
          rotate={-2}
          top={185}
          startFrame={S.direktur.startFrame + 6}
          endFrame={EV["dir.siapa"]}
        />
      )}
      <Stamp
        text="MISI GAGAL TOTAL!!"
        bg="#c92222"
        color="#ffea5c"
        rotate={-5}
        top={180}
        startFrame={EV["dir.siapa"] + 12}
        endFrame={S.direktur.endFrame}
      />

      {/* ========== SCENE 8: CANCELLED ARCHIVE STAMP ========== */}
      <Stamp
        text="DIBATALKAN · 1967"
        bg="#8f1d1d"
        color="#fff6e0"
        rotate={4}
        top={180}
        startFrame={EV["akh.batal"]}
        endFrame={EV["akh.meong"] - 10}
      />

      {/* ========== DYNAMIC COLORED 1-2 WORD CAPTIONS ========== */}
      {renderCaption()}
    </AbsoluteFill>
  );
};

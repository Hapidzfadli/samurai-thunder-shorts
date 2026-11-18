import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const FONT_TITLE = "Anton, 'DejaVu Sans', sans-serif";
export const FONT_BODY = "Inter, 'DejaVu Sans', sans-serif";
export const FONT_JP = "'Noto Serif JP', serif";
export const GOLD = "#ffc94a";
export const RED = "#ff3b2f";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Lightning brightness 0..1 with a natural double-flicker. */
export const lightning = (frame: number, strikes: number[]) => {
  const pattern = [1, 0.25, 0.95, 0.15, 0.6, 0.35, 0.15, 0.07, 0.03, 0];
  let v = 0;
  for (const s of strikes) {
    const d = frame - s;
    if (d >= 0 && d < pattern.length) v = Math.max(v, pattern[d]);
  }
  return v;
};

/** Word-by-word pop-in caption, TikTok/Shorts style. */
export const Caption: React.FC<{
  text: string;
  from: number;
  to: number;
  highlight?: string[];
  highlightColor?: string;
  top?: number;
  size?: number;
}> = ({ text, from, to, highlight = [], highlightColor = GOLD, top = 1280, size = 78 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  const words = text.split(" ");
  const hl = highlight.map((h) => h.toUpperCase());
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 22px",
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - from - i * 3, fps, config: { damping: 11, stiffness: 220 } });
        const isHl = hl.includes(w.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase());
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.15,
              textTransform: "uppercase",
              color: isHl ? highlightColor : "white",
              WebkitTextStroke: "3px rgba(0,0,0,0.9)",
              paintOrder: "stroke fill",
              textShadow: isHl ? `0 0 30px ${highlightColor}88, 0 6px 0 rgba(0,0,0,0.6)` : "0 6px 0 rgba(0,0,0,0.6)",
              transform: `translateY(${(1 - s) * 30}px) scale(${0.6 + 0.4 * s})`,
              opacity: s,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Night sky painted in HTML behind the transparent WebGL canvas. */
export const NightSky: React.FC<{ flash?: number; storm?: boolean; moonX?: number; moonY?: number }> = ({
  flash = 0,
  storm = false,
  moonX = 760,
  moonY = 380,
}) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const stars = React.useMemo(
    () =>
      new Array(storm ? 0 : 140).fill(0).map((_, i) => ({
        x: random(`x${i}`) * width,
        y: random(`y${i}`) * height * 0.55,
        r: 0.8 + random(`r${i}`) * 2.2,
        p: random(`p${i}`) * 10,
      })),
    [width, height, storm]
  );
  const top = storm ? "#04060c" : "#030614";
  const mid = storm ? "#121a28" : "#0d1d3d";
  const horizon = storm ? "#26303f" : "#1c2f55";
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${top} 0%, ${mid} 45%, ${horizon} 62%, #0b1630 100%)` }}>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.r,
            height: s.r,
            borderRadius: "50%",
            background: "white",
            opacity: 0.35 + 0.5 * Math.abs(Math.sin(frame / 12 + s.p)),
          }}
        />
      ))}
      {!storm && (
        <div
          style={{
            position: "absolute",
            left: moonX - 70,
            top: moonY - 70,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 40%, #fffaf0, #d9dce8 60%, #b9bfd3)",
            boxShadow: "0 0 80px 30px rgba(190,205,255,0.35), 0 0 220px 90px rgba(120,150,255,0.15)",
          }}
        />
      )}
      {storm &&
        new Array(5).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -200 + i * 300 + ((frame * (1 + i * 0.3)) % 400) - 200,
              top: 150 + i * 120,
              width: 900,
              height: 260,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(60,70,90,0.75), rgba(20,24,32,0) 70%)",
              filter: "blur(8px)",
            }}
          />
        ))}
      <AbsoluteFill style={{ background: "#c9d6ff", opacity: flash * 0.55 }} />
    </AbsoluteFill>
  );
};

/** Jagged lightning bolt drawn in SVG. */
export const Bolt: React.FC<{ visible: number; seed: string; x: number }> = ({ visible, seed, x }) => {
  if (visible <= 0.05) return null;
  let px = x;
  let py = 0;
  const pts: string[] = [`${px},${py}`];
  for (let i = 0; i < 12; i++) {
    px += (random(`${seed}-${i}`) - 0.5) * 140;
    py += 60 + random(`${seed}-y${i}`) * 40;
    pts.push(`${px},${py}`);
  }
  return (
    <AbsoluteFill style={{ opacity: visible }}>
      <svg width="1080" height="1920">
        <polyline points={pts.join(" ")} fill="none" stroke="#bcd0ff" strokeWidth={16} opacity={0.35} />
        <polyline points={pts.join(" ")} fill="none" stroke="white" strokeWidth={5} />
      </svg>
    </AbsoluteFill>
  );
};

/** Vignette to give a cinematic finish (lightweight for fast rendering). */
export const Finish: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)" }}
      />
    </AbsoluteFill>
  );
};

/** Fade from/to black at scene edges. */
export const SceneFade: React.FC<{ duration: number; inFrames?: number; outFrames?: number }> = ({
  duration,
  inFrames = 8,
  outFrames = 8,
}) => {
  const frame = useCurrentFrame();
  const o = Math.max(
    inFrames ? interpolate(frame, [0, inFrames], [1, 0], clamp) : 0,
    outFrames ? interpolate(frame, [duration - outFrames, duration], [0, 1], clamp) : 0
  );
  return <AbsoluteFill style={{ background: "black", opacity: o }} />;
};

/** Slanted rain streaks for the storm outro. */
export const Rain: React.FC<{ count?: number }> = ({ count = 110 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ transform: "rotate(14deg) scale(1.3)" }}>
      {new Array(count).fill(0).map((_, i) => {
        const speed = 45 + random(`rs${i}`) * 35;
        const len = 60 + random(`rl${i}`) * 90;
        const y = ((random(`ry${i}`) * 2400 + frame * speed) % 2400) - 300;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: random(`rx${i}`) * 1400 - 160,
              top: y,
              width: 2.5,
              height: len,
              background: "linear-gradient(rgba(200,215,255,0), rgba(200,215,255,0.55))",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Small kicker label like "1274 · HAKATA BAY". */
export const Kicker: React.FC<{ text: string; from: number; top?: number }> = ({ text, from, top = 260 }) => {
  const frame = useCurrentFrame();
  const chars = Math.floor(interpolate(frame - from, [0, text.length * 1.5], [0, text.length], clamp));
  const lineW = interpolate(frame - from, [0, 20], [0, 260], clamp);
  if (frame < from) return null;
  return (
    <div style={{ position: "absolute", top, width: "100%", textAlign: "center" }}>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: 10,
          color: GOLD,
          textShadow: "0 3px 10px rgba(0,0,0,0.9)",
        }}
      >
        {text.slice(0, chars)}
      </div>
      <div style={{ margin: "18px auto 0", height: 4, width: lineW, background: GOLD, borderRadius: 2 }} />
    </div>
  );
};

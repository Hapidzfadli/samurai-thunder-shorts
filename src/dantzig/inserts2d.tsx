import React from "react";
import { AbsoluteFill, interpolate } from "remotion";

/**
 * Close-up Insert 1 (Adegan 2):
 * Hand holding yellow pencil rapidly copying the 2 unsolved statistics problems into lined notebook!
 */
export const InsertCopyHomework: React.FC<{ progress: number }> = ({ progress }) => {
  const p = Math.min(1, Math.max(0, progress));
  const enter = interpolate(p, [0, 0.12, 0.88, 1], [0, 1, 1, 0]);
  const line1 = interpolate(p, [0.10, 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2 = interpolate(p, [0.48, 0.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pencil tip tracks the active writing position
  const writingSecond = p >= 0.48;
  const px = writingSecond ? 175 + line2 * 560 : 175 + line1 * 540;
  const py = (writingSecond ? 535 : 355) + Math.sin(p * 85) * 6;

  return (
    <AbsoluteFill
      style={{
        background: "rgba(14, 16, 26, 0.55)",
        opacity: enter,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 920,
          height: 820,
          borderRadius: 36,
          overflow: "hidden",
          border: "10px solid #14121a",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          background: "#f8f2e2",
          transform: `scale(${0.92 + 0.08 * enter})`,
        }}
      >
        <svg width={920} height={820} viewBox="0 0 920 820">
          {/* Vintage notebook margin & ruled lines */}
          <rect x={0} y={0} width={920} height={820} fill="#f8f2e2" />
          <line x1={120} y1={0} x2={120} y2={820} stroke="#e07a7a" strokeWidth={5} />
          {[160, 230, 300, 370, 440, 510, 580, 650, 720].map((y) => (
            <line key={y} x1={0} y1={y} x2={920} y2={y} stroke="#b6cfe0" strokeWidth={3} />
          ))}

          {/* Top notebook label */}
          <text x={150} y={132} fontFamily="Inter, sans-serif" fontWeight={900} fontSize={40} fill="#2c3e66">
            CATATAN PR — STATISTIKA 1939
          </text>

          {/* Animated handwritten Problem 1 */}
          <clipPath id="clipLine1">
            <rect x={140} y={240} width={line1 * 720} height={155} />
          </clipPath>
          <g clipPath="url(#clipLine1)">
            <text x={155} y={292} fontFamily="Inter, sans-serif" fontWeight={800} fontSize={38} fill="#1d2230">
              1. Hipotesis Student:
            </text>
            <text x={175} y={358} fontFamily="Inter, sans-serif" fontWeight={700} fontSize={34} fill="#2c3e66">
              P(|T(X)| &gt; c | μ, σ) = α  (∀ σ &gt; 0)
            </text>
          </g>

          {/* Animated handwritten Problem 2 */}
          <clipPath id="clipLine2">
            <rect x={140} y={420} width={line2 * 720} height={155} />
          </clipPath>
          <g clipPath="url(#clipLine2)">
            <text x={155} y={472} fontFamily="Inter, sans-serif" fontWeight={800} fontSize={38} fill="#1d2230">
              2. Lemma Neyman–Pearson:
            </text>
            <text x={175} y={538} fontFamily="Inter, sans-serif" fontWeight={700} fontSize={34} fill="#2c3e66">
              max ∫ φ(x) f₁(x) dx  s.t.  ≤ α
            </text>
          </g>

          {/* Hand + Classic Yellow Pencil tracing the tip */}
          <g transform={`translate(${px}, ${py}) rotate(-28)`}>
            {/* Graphite tip */}
            <polygon points="0,0 32,-14 32,14" fill="#f0d1a8" stroke="#14121a" strokeWidth={6} strokeLinejoin="round" />
            <polygon points="0,0 12,-5 12,5" fill="#222" />
            {/* Yellow pencil shaft */}
            <rect x={32} y={-14} width={280} height={28} fill="#f2bf38" stroke="#14121a" strokeWidth={6} />
            <line x1={32} y1={-4} x2={312} y2={-4} stroke="#d49c1e" strokeWidth={4} />
            {/* Pink eraser */}
            <rect x={312} y={-14} width={34} height={28} rx={6} fill="#e88a96" stroke="#14121a" strokeWidth={6} />
            {/* Cartoon fingers gripping pencil */}
            <ellipse cx={125} cy={18} rx={58} ry={34} fill="#f6ddc2" stroke="#14121a" strokeWidth={7} />
            <ellipse cx={105} cy={-16} rx={36} ry={22} fill="#f6ddc2" stroke="#14121a" strokeWidth={7} />
            {/* White shirt cuff */}
            <rect x={170} y={-24} width={160} height={92} rx={24} fill="#f2f0ea" stroke="#14121a" strokeWidth={7} />
          </g>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Close-up Insert 2 (Adegan 6):
 * Prof. Neyman's hand handing the journal proof to George with bold red "TERPECAHKAN!" stamp!
 */
export const InsertPaperStamp: React.FC<{ progress: number }> = ({ progress }) => {
  const p = Math.min(1, Math.max(0, progress));
  const enter = interpolate(p, [0, 0.12, 0.88, 1], [0, 1, 1, 0]);
  const handSlide = interpolate(p, [0.05, 0.35], [120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampScale = interpolate(p, [0.38, 0.50], [2.4, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampOpacity = interpolate(p, [0.36, 0.44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "rgba(14, 16, 26, 0.58)",
        opacity: enter,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 920,
          height: 820,
          borderRadius: 36,
          overflow: "hidden",
          border: "10px solid #14121a",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          background: "linear-gradient(180deg, #fff5dc 0%, #f0d7a8 100%)",
          transform: `scale(${0.92 + 0.08 * enter})`,
        }}
      >
        <svg width={920} height={820} viewBox="0 0 920 820">
          {/* Paper Document in Center */}
          <g transform={`translate(${handSlide * 0.4}, 0)`}>
            <rect x={165} y={100} width={590} height={630} rx={16} fill="#ffffff" stroke="#14121a" strokeWidth={8} />
            <text x={215} y={185} fontFamily="Inter, sans-serif" fontWeight={900} fontSize={32} fill="#1d2f54">
              ANNALS OF MATHEMATICAL STATISTICS
            </text>
            <line x1={215} y1={206} x2={705} y2={206} stroke="#1d2f54" strokeWidth={4} />
            <text x={215} y={268} fontFamily="Inter, sans-serif" fontWeight={800} fontSize={30} fill="#2b2b34">
              Penulis: George B. Dantzig
            </text>
            <text x={215} y={316} fontFamily="Inter, sans-serif" fontWeight={700} fontSize={26} fill="#5e5a52">
              Pengantar: Prof. Jerzy Neyman (UC Berkeley)
            </text>
            {/* Proof lines */}
            {[380, 425, 470, 515, 560, 605].map((y, idx) => (
              <rect key={y} x={215} y={y} width={idx % 2 === 0 ? 460 : 380} height={16} rx={8} fill="#d6d2c8" />
            ))}
          </g>

          {/* Left Hand (George in Navy Vest cuff) reaching to receive */}
          <g transform={`translate(${-handSlide}, 0)`}>
            <rect x={-20} y={530} width={220} height={95} rx={24} fill="#2c3e66" stroke="#14121a" strokeWidth={8} />
            <ellipse cx={210} cy={578} rx={48} ry={34} fill="#f6ddc2" stroke="#14121a" strokeWidth={8} />
          </g>

          {/* Right Hand (Prof. Neyman in Tweed Jacket) passing paper */}
          <g transform={`translate(${handSlide}, 0)`}>
            <rect x={720} y={240} width={220} height={98} rx={24} fill="#8a6648" stroke="#14121a" strokeWidth={8} />
            <ellipse cx={710} cy={288} rx={48} ry={34} fill="#f2d6ba" stroke="#14121a" strokeWidth={8} />
          </g>

          {/* Bold Red Animated Stamp: TERPECAHKAN! */}
          {stampOpacity > 0.01 && (
            <g transform={`translate(460, 455) rotate(-12) scale(${stampScale})`} opacity={stampOpacity}>
              <rect x={-255} y={-68} width={510} height={136} rx={20} fill="rgba(255,255,255,0.92)" stroke="#d42620" strokeWidth={12} />
              <text x={0} y={22} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={900} fontSize={62} fill="#d42620" letterSpacing={3}>
                TERPECAHKAN!
              </text>
            </g>
          )}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

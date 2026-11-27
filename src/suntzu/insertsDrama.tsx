import React from 'react';
import { clamp } from './timing';

export type DramaInsertKind = 'bamboo' | 'drum' | 'right' | 'left' | 'spear_raise';

/** Dramatic 2D SVG insert card overlaid smoothly over the live 3D palace scene. */
export const DramaInsert: React.FC<{ kind: DramaInsertKind; f: number; len: number }> = ({ kind, f, len }) => {
  const u = clamp(f / Math.max(1, len));
  const enter = clamp(u * 5);
  const exit = clamp((1 - u) * 5);
  const alpha = Math.min(enter, exit);
  const scale = 0.92 + 0.08 * enter;
  const strike = Math.sin(clamp(u * 2.1) * Math.PI);
  const ripple = clamp((u - 0.28) * 2.2);

  const labels: Record<DramaInsertKind, string> = {
    bamboo: 'KITAB SENI PERANG • 13 BAB',
    drum: 'GENDERANG PERANG BERBUNYI!',
    right: 'ABA-ABA: HADAP KANAN!',
    left: 'ABA-ABA: HADAP KIRI!',
    spear_raise: 'PASUKAN SIAP — TOMBAK TEGAK!',
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        right: 96,
        top: 390,
        height: 540,
        border: '5px solid #3c2f24',
        borderRadius: 28,
        background: 'linear-gradient(180deg, rgba(248,238,214,0.95) 0%, rgba(232,216,182,0.95) 100%)',
        boxShadow: '0 20px 60px rgba(15,10,8,0.55)',
        opacity: alpha,
        transform: `scale(${scale})`,
        overflow: 'hidden',
      }}
    >
      <svg viewBox="0 0 800 500" width="100%" height="100%">
        {kind === 'bamboo' && (
          <g transform={`translate(0, ${(1 - enter) * 25})`}>
            {Array.from({ length: 11 }, (_, idx) => (
              <g key={idx}>
                <rect
                  x={105 + idx * 54}
                  y={90}
                  width={44}
                  height={290}
                  rx={6}
                  fill={idx % 2 ? '#cfa963' : '#d8b46f'}
                  stroke="#493521"
                  strokeWidth={5}
                />
                {/* Vertical brush ink marks (stylized strokes, not fake characters) */}
                {[0, 1, 2, 3, 4].map((row) => (
                  <rect
                    key={row}
                    x={120 + idx * 54}
                    y={128 + row * 46}
                    width={14}
                    height={22}
                    rx={3}
                    fill="#342619"
                    opacity={0.78}
                  />
                ))}
              </g>
            ))}
            {/* Binding cords */}
            <path d="M90 155 H710 M90 320 H710" stroke="#7d2b25" strokeWidth={11} strokeLinecap="round" />
          </g>
        )}

        {kind === 'drum' && (
          <g>
            {/* Shockwave rings on impact */}
            {ripple > 0 && (
              <>
                <ellipse
                  cx={400}
                  cy={320}
                  rx={190 + ripple * 170}
                  ry={62 + ripple * 58}
                  fill="none"
                  stroke="#b83828"
                  strokeWidth={10 * (1 - ripple)}
                  opacity={1 - ripple}
                />
                <ellipse
                  cx={400}
                  cy={320}
                  rx={140 + ripple * 120}
                  ry={44 + ripple * 40}
                  fill="none"
                  stroke="#e8b853"
                  strokeWidth={7 * (1 - ripple)}
                  opacity={1 - ripple}
                />
              </>
            )}
            {/* War drum body */}
            <ellipse cx={400} cy={360} rx={220} ry={78} fill="#8a322a" stroke="#2c1d18" strokeWidth={9} />
            <rect x={180} y={310} width={440} height={52} fill="#8a322a" />
            <ellipse cx={400} cy={312} rx={220} ry={70} fill="#ecdcb7" stroke="#2c1d18" strokeWidth={9} />
            <ellipse cx={400} cy={312} rx={165} ry={50} fill="none" stroke="#c3a776" strokeWidth={4} />
            {/* Striking arm + mallet */}
            <g transform={`translate(230, ${30 + strike * 115}) rotate(${-18 + strike * 36})`}>
              <path d="M-80 120 L20 60 L65 110 L-40 175 Z" fill="#435847" stroke="#261e1a" strokeWidth={8} />
              <circle cx={42} cy={84} r={30} fill="#ecc9a0" stroke="#261e1a" strokeWidth={7} />
              <path d="M55 78 L215 170" stroke="#6b4426" strokeWidth={22} strokeLinecap="round" />
              <circle cx={218} cy={172} r={32} fill="#e2c280" stroke="#261e1a" strokeWidth={7} />
            </g>
          </g>
        )}

        {(kind === 'right' || kind === 'left') && (
          <g>
            {/* Big directional arrow */}
            <path
              d={
                kind === 'right'
                  ? 'M160 220 H535 V150 L680 250 L535 350 V280 H160 Z'
                  : 'M640 220 H265 V150 L120 250 L265 350 V280 H640 Z'
              }
              fill={kind === 'right' ? '#3d6f5c' : '#963b33'}
              stroke="#241c18"
              strokeWidth={9}
              strokeLinejoin="round"
              transform={`translate(${(kind === 'right' ? 1 : -1) * Math.sin(u * Math.PI * 2) * 18}, 0)`}
            />
          </g>
        )}

        {kind === 'spear_raise' && (
          <g>
            {[-210, -105, 0, 105, 210].map((dx, idx) => {
              const lift = (1 - clamp(u * 2.5 - idx * 0.05)) * 120;
              return (
                <g key={idx} transform={`translate(${400 + dx}, ${lift})`}>
                  <line x1={0} y1={450} x2={0} y2={115} stroke="#734d2c" strokeWidth={18} strokeLinecap="round" />
                  <polygon points="-22,125 0,32 22,125" fill="#c7cac2" stroke="#28211d" strokeWidth={6} />
                  <path d="M-24 132 Q0 165 24 132" fill="#a8372e" stroke="#28211d" strokeWidth={5} />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      <div
        style={{
          position: 'absolute',
          bottom: 22,
          left: 24,
          right: 24,
          textAlign: 'center',
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 1.2,
          color: '#2f241c',
          textTransform: 'uppercase',
        }}
      >
        {labels[kind]}
      </div>
    </div>
  );
};

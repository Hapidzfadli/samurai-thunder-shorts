/**
 * Rich, varied 2D cinematic typography callouts, animated stamps, order scrolls,
 * musical Guqin notes, thought callouts, and closing cards for Zhuge Liang.
 * Designed to eliminate monotonous text and add high-craft editorial rhythm!
 */
import React from 'react';
import { interpolate, spring } from 'remotion';

const FPS = 30;

/** 1. Opening Hook Brush-Scroll Title Card (Scene 1) */
export const OpeningTitleCard: React.FC<{ f: number }> = ({ f }) => {
  if (f > 95) return null;
  const ent = spring({ frame: f, fps: FPS, config: { damping: 14, stiffness: 120 } });
  const fadeOut = interpolate(f, [72, 95], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const op = ent * fadeOut;

  return (
    <div
      style={{
        position: 'absolute',
        top: 165,
        left: 52,
        right: 52,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: op,
        transform: `translateY(${(1 - ent) * -36}px) scale(${0.92 + ent * 0.08})`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(138, 34, 28, 0.92)',
          color: '#ffebc2',
          fontFamily: 'Inter, sans-serif',
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 3.5,
          padding: '6px 22px',
          borderRadius: 6,
          border: '2px solid #e0b862',
          marginBottom: 12,
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
        }}
      >
        228 M • BENTENG XICHENG • SAMKOK
      </div>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(28,22,18,0.92) 0%, rgba(44,32,24,0.88) 100%)',
          border: '3px solid #d9ad54',
          borderRadius: 20,
          padding: '18px 34px',
          boxShadow: '0 14px 36px rgba(0,0,0,0.55)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 58,
            fontWeight: 900,
            color: '#ffe6a3',
            letterSpacing: 2,
            lineHeight: 1.06,
            textShadow: '0 4px 12px rgba(0,0,0,0.65)',
          }}
        >
          STRATEGI KOTA KOSONG
        </div>
        <div
          style={{
            height: 2,
            background: 'linear-gradient(90deg, transparent, #d9ad54, transparent)',
            margin: '10px 0 8px',
          }}
        />
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 23,
            fontWeight: 700,
            color: '#efe3c6',
            letterSpacing: 1.2,
          }}
        >
          ZHUGE LIANG vs 150.000 PASUKAN SIMA YI
        </div>
      </div>
    </div>
  );
};

/** 2. Power Imbalance Stat Stamp (Scene 2: 2.000 vs 150.000) */
export const ForceRatioStamp: React.FC<{ f: number; start?: number; end?: number }> = ({
  f,
  start = 18,
  end = 155,
}) => {
  if (f < start || f > end) return null;
  const s = spring({ frame: f - start, fps: FPS, config: { damping: 12, stiffness: 150 } });
  const fade = interpolate(f, [end - 18, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 175,
        left: 64,
        right: 64,
        display: 'flex',
        justifyContent: 'center',
        opacity: s * fade,
        transform: `scale(${0.84 + s * 0.16})`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          background: 'rgba(24, 18, 15, 0.88)',
          border: '2.5px solid #cf9f48',
          borderRadius: 18,
          padding: '14px 24px',
          boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#9ed1b5', letterSpacing: 1.5 }}>KOTA XICHENG</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', lineHeight: 1.05 }}>2.000</div>
        </div>
        <div
          style={{
            background: '#a62626',
            color: '#ffe699',
            fontWeight: 900,
            fontSize: 24,
            padding: '8px 14px',
            borderRadius: 12,
            transform: 'rotate(-6deg)',
          }}
        >
          VS
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ff8a7a', letterSpacing: 1.5 }}>PASUKAN WEI</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#ff5c47', lineHeight: 1.05 }}>150.000</div>
        </div>
      </div>
    </div>
  );
};

/** 3. Zhuge Liang's 4-Step Secret Order Scroll (Scene 3) */
export const OrderChecklistCard: React.FC<{
  f: number;
  t1: number;
  t2: number;
  t3: number;
  t4: number;
}> = ({ f, t1, t2, t3, t4 }) => {
  if (f < t1 - 6) return null;
  const items = [
    { at: t1, label: '01  TURUNKAN SEMUA PANJI' },
    { at: t2, label: '02  SEMBUNYI & DILARANG BERSUARA' },
    { at: t3, label: '03  BUKA LEBAR KEEMPAT GERBANG' },
    { at: t4, label: '04  MENYAMAR & SAPU JALAN' },
  ];
  const visible = items.filter((it) => f >= it.at);
  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 170,
        left: 58,
        right: 58,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          alignSelf: 'flex-start',
          background: '#2f4961',
          color: '#ffebb8',
          fontSize: 20,
          fontWeight: 900,
          letterSpacing: 2,
          padding: '5px 16px',
          borderRadius: 8,
          border: '2px solid #d9b262',
        }}
      >
        PERINTAH RAHASIA ZHUGE LIANG
      </div>
      {visible.map((it, idx) => {
        const s = spring({ frame: f - it.at, fps: FPS, config: { damping: 14, stiffness: 160 } });
        return (
          <div
            key={idx}
            style={{
              background: 'rgba(249, 238, 214, 0.94)',
              color: '#241b15',
              borderLeft: '8px solid #355570',
              borderRadius: '4px 14px 14px 4px',
              padding: '10px 20px',
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 0.6,
              boxShadow: '0 6px 18px rgba(0,0,0,0.38)',
              transform: `translateX(${(1 - s) * -60}px)`,
              opacity: s,
            }}
          >
            {it.label}
          </div>
        );
      })}
    </div>
  );
};

/** 4. Dramatic Kinetic Impact Slam ("BERHENTI!!", "GERBANG DIBUKA", "MUNDUR!!") */
export const ImpactSlamOverlay: React.FC<{
  f: number;
  at: number;
  dur?: number;
  text: string;
  sub?: string;
  bg?: string;
  color?: string;
  tilt?: number;
}> = ({ f, at, dur = 48, text, sub, bg = 'rgba(138, 24, 24, 0.93)', color = '#ffe58f', tilt = -3 }) => {
  if (f < at || f > at + dur) return null;
  const loc = f - at;
  const s = spring({ frame: loc, fps: FPS, config: { damping: 11, stiffness: 220 } });
  const fade = interpolate(loc, [dur - 14, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shakeX = loc < 12 ? Math.sin(loc * 2.8) * (12 - loc) * 1.1 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 230,
        left: 48,
        right: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: fade,
        transform: `translateX(${shakeX}px) rotate(${tilt}deg) scale(${0.5 + s * 0.5})`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: bg,
          border: '4px solid #f5cf73',
          borderRadius: 18,
          padding: '16px 36px',
          boxShadow: '0 14px 40px rgba(0,0,0,0.65)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Impact, Inter, sans-serif',
            fontSize: 74,
            fontWeight: 900,
            color,
            letterSpacing: 3,
            lineHeight: 1.0,
            textShadow: '0 5px 0 #1c120e',
          }}
        >
          {text}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 24,
              fontWeight: 800,
              color: '#fff6e0',
              letterSpacing: 2,
              marginTop: 6,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

/** 5. Floating Musical Guqin Notes & Tranquil Silk-String Ripple (Scene 6) */
export const GuqinNotesOverlay: React.FC<{ f: number; maxF?: number }> = ({ f, maxF = 240 }) => {
  if (f > maxF) return null;
  const fade = interpolate(f, [0, 16, maxF - 20, maxF], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const notes = [
    { sym: '♪', x: 220, phase: 0 },
    { sym: '♫', x: 760, phase: 22 },
    { sym: '♪', x: 350, phase: 48 },
    { sym: '♩', x: 660, phase: 72 },
    { sym: '♫', x: 520, phase: 96 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade, pointerEvents: 'none' }}>
      {/* Tranquil vertical calligraphy tag */}
      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 56,
          right: 56,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'rgba(26, 36, 46, 0.84)',
            border: '2px solid #e3be6d',
            borderRadius: 999,
            padding: '10px 28px',
            color: '#ffebb5',
            fontFamily: 'Georgia, serif',
            fontSize: 26,
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}
        >
          ♪ Alunan Kecapi Guqin — Tenang Tanpa Getar ♪
        </div>
      </div>

      {/* Gently drifting golden music notes */}
      {notes.map((n, i) => {
        const cyc = ((f + n.phase) % 95) / 95;
        const y = 1120 - cyc * 620;
        const x = n.x + Math.sin(cyc * Math.PI * 3 + i) * 38;
        const op = Math.sin(cyc * Math.PI) * 0.88;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              fontSize: 48 + (i % 2) * 16,
              color: '#ffe08a',
              opacity: op,
              textShadow: '0 0 18px rgba(255, 200, 90, 0.75), 0 4px 10px rgba(0,0,0,0.6)',
              transform: `rotate(${Math.sin(cyc * 6 + i) * 14}deg)`,
            }}
          >
            {n.sym}
          </div>
        );
      })}
    </div>
  );
};

/** 6. Sima Yi Suspicious Inner Thought Callout (Scene 6 & 7) */
export const ThoughtCallout: React.FC<{ f: number; at: number; dur?: number; text: string }> = ({
  f,
  at,
  dur = 95,
  text,
}) => {
  if (f < at || f > at + dur) return null;
  const loc = f - at;
  const s = spring({ frame: loc, fps: FPS, config: { damping: 16, stiffness: 130 } });
  const fade = interpolate(loc, [dur - 16, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 190,
        right: 52,
        maxWidth: 660,
        opacity: s * fade,
        transform: `translateY(${(1 - s) * 20}px)`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(25, 20, 22, 0.86)',
          border: '2px dashed #e0a858',
          borderRadius: 24,
          padding: '14px 24px',
          color: '#ffe6b8',
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: 27,
          fontWeight: 700,
          lineHeight: 1.25,
          boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
        }}
      >
        💭 {text}
      </div>
    </div>
  );
};

/** 7. Victory Zero-Arrows Stat Strip (Scene 9-10) */
export const VictoryZeroStamp: React.FC<{ f: number; at?: number; end?: number }> = ({
  f,
  at = 12,
  end = 160,
}) => {
  if (f < at || f > end) return null;
  const s = spring({ frame: f - at, fps: FPS, config: { damping: 14, stiffness: 130 } });
  const fade = interpolate(f, [end - 20, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pills = [
    { num: '0', lbl: 'ANAK PANAH' },
    { num: '1', lbl: 'KECAPI GUQIN' },
    { num: '150.000', lbl: 'MUNDUR' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 175,
        left: 48,
        right: 48,
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        opacity: s * fade,
        transform: `translateY(${(1 - s) * -24}px)`,
        pointerEvents: 'none',
      }}
    >
      {pills.map((p, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            background: 'rgba(24, 21, 18, 0.88)',
            border: '2.5px solid #d9b059',
            borderRadius: 16,
            padding: '12px 10px',
            textAlign: 'center',
            boxShadow: '0 8px 22px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{ fontSize: 38, fontWeight: 900, color: '#ffe078', lineHeight: 1.05 }}>{p.num}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f2e6cf', letterSpacing: 1.2, marginTop: 4 }}>
            {p.lbl}
          </div>
        </div>
      ))}
    </div>
  );
};

/** 8. Professional Closing Card (Scene 10) */
export const EndingScrollCard: React.FC<{ f: number; start: number }> = ({ f, start }) => {
  if (f < start) return null;
  const s = spring({ frame: f - start, fps: FPS, config: { damping: 16, stiffness: 110 } });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: `rgba(18, 14, 12, ${s * 0.56})`,
        opacity: s,
        padding: 56,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(34,26,20,0.95) 0%, rgba(22,17,14,0.96) 100%)',
          border: '3px solid #deb45c',
          borderRadius: 26,
          padding: '38px 42px',
          textAlign: 'center',
          boxShadow: '0 20px 55px rgba(0,0,0,0.72)',
          transform: `scale(${0.9 + s * 0.1})`,
          maxWidth: 920,
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 22,
            fontWeight: 800,
            color: '#d9b05c',
            letterSpacing: 4,
            marginBottom: 12,
          }}
        >
          KONGCHENG JI • 228 M
        </div>
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 60,
            fontWeight: 900,
            color: '#ffebad',
            lineHeight: 1.08,
          }}
        >
          STRATEGI KOTA KOSONG
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#ffffff',
            marginTop: 14,
          }}
        >
          ZHUGE LIANG
        </div>
        <div
          style={{
            height: 2,
            background: 'linear-gradient(90deg, transparent, #d9b05c, transparent)',
            margin: '22px auto',
            width: '72%',
          }}
        />
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 22,
            fontWeight: 600,
            color: '#d9cbb3',
            letterSpacing: 0.6,
          }}
        >
          Kisah Klasik Samkok (Tiga Kerajaan) • Dialog didramatisasi
        </div>
      </div>
    </div>
  );
};

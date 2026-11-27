import React from 'react';
import { interpolate, spring } from 'remotion';

const cardWrap: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 30,
};

/**
 * Insert 1 (Scene 3 — ditolak):
 * Close-up modern smartphone showing rejection email + Brian Acton's iconic 2009 tweet!
 */
export const InsertRejectionPhone: React.FC<{ localFrame: number; fps: number }> = ({
  localFrame,
  fps,
}) => {
  const pop = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 140 } });
  const fadeOut = interpolate(localFrame, [112, 128], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tweetPop = spring({
    frame: Math.max(0, localFrame - 28),
    fps,
    config: { damping: 14, stiffness: 130 },
  });

  return (
    <div style={{ ...cardWrap, opacity: pop * fadeOut }}>
      <div
        style={{
          width: 820,
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 42,
          border: '6px solid #334155',
          boxShadow: '0 32px 80px rgba(0,0,0,0.65)',
          padding: '38px 36px',
          transform: `scale(${0.84 + pop * 0.16}) translateY(${(1 - pop) * 50}px)`,
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top email card */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: 24,
            border: '3px solid #ef4444',
            padding: '24px 28px',
            marginBottom: 26,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#f87171', letterSpacing: 1 }}>
              INBOX · RECRUITING TEAM
            </span>
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: 20,
                fontWeight: 900,
                padding: '6px 18px',
                borderRadius: 99,
              }}
            >
              DITOLAK ✕
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
            “We regret to inform you...”
          </div>
          <div style={{ fontSize: 24, color: '#cbd5e1', marginTop: 8 }}>
            Facebook &amp; Twitter — Agustus 2009
          </div>
        </div>

        {/* Iconic Brian Acton Tweet */}
        <div
          style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: 24,
            padding: '26px 28px',
            border: '4px solid #38bdf8',
            transform: `scale(${0.86 + tweetPop * 0.14})`,
            opacity: tweetPop,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: '#3a6a9c',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 24,
              }}
            >
              BA
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>Brian Acton</div>
              <div style={{ fontSize: 20, color: '#64748b' }}>@brianacton · 3 Agu 2009</div>
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.35, color: '#0f172a' }}>
            “Facebook turned me down. Looking forward to life’s next adventure.”
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Insert 2 (Scene 5 — prinsip):
 * Close-up of Brian Acton's legendary yellow sticky note ("NO ADS! NO GAMES! NO GIMMICKS!")
 * slapped onto modern glass next to a crisp WhatsApp chat bubble!
 */
export const InsertNoAdsSticky: React.FC<{ localFrame: number; fps: number }> = ({
  localFrame,
  fps,
}) => {
  const slap = spring({ frame: localFrame, fps, config: { damping: 11, stiffness: 170 } });
  const fadeOut = interpolate(localFrame, [105, 122], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bubblePop = spring({
    frame: Math.max(0, localFrame - 24),
    fps,
    config: { damping: 13, stiffness: 150 },
  });

  return (
    <div style={{ ...cardWrap, opacity: slap * fadeOut }}>
      <div
        style={{
          width: 780,
          background: 'rgba(15, 23, 42, 0.88)',
          borderRadius: 40,
          border: '5px solid rgba(148, 163, 184, 0.45)',
          boxShadow: '0 32px 90px rgba(0,0,0,0.65)',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Legendary Yellow Sticky Note */}
        <div
          style={{
            width: 560,
            background: 'linear-gradient(155deg, #fef08a 0%, #facc15 100%)',
            color: '#18181b',
            padding: '38px 36px',
            borderRadius: 10,
            boxShadow: '0 22px 45px rgba(0,0,0,0.45)',
            transform: `rotate(-3deg) scale(${1.22 - slap * 0.22})`,
            borderTop: '16px solid #eab308',
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.18, letterSpacing: 1 }}>
            ✕ NO ADS!
            <br />
            ✕ NO GAMES!
            <br />
            ✕ NO GIMMICKS!
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 18, color: '#422006' }}>
            — Catatan Brian Acton di Meja Jan Koum
          </div>
        </div>

        {/* Clean green WhatsApp bubble preview */}
        <div
          style={{
            width: 580,
            background: '#0b141a',
            borderRadius: 24,
            border: '3px solid #25d366',
            padding: '20px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transform: `scale(${0.86 + bubblePop * 0.14})`,
            opacity: bubblePop,
          }}
        >
          <div
            style={{
              background: '#005c4b',
              color: '#e9edef',
              padding: '14px 22px',
              borderRadius: '18px 18px 18px 4px',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            Halo! Pesan langsung terkirim ✓✓
          </div>
          <div style={{ color: '#25d366', fontSize: 22, fontWeight: 800 }}>100% BERSIH</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Insert 3 (Scene 7/8 — tawaran / penutup):
 * Close-up of the $19,000,000,000 Acquisition Agreement with animated signature stroke!
 */
export const InsertAcquisitionDeal: React.FC<{
  localFrame: number;
  fps: number;
  signed?: boolean;
}> = ({ localFrame, fps, signed = false }) => {
  const pop = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 140 } });
  const fadeOut = interpolate(localFrame, [108, 125], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sigDraw = interpolate(localFrame, [18, 66], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stampPop = spring({
    frame: Math.max(0, localFrame - 66),
    fps,
    config: { damping: 10, stiffness: 180 },
  });

  return (
    <div style={{ ...cardWrap, opacity: pop * fadeOut }}>
      <div
        style={{
          width: 820,
          background: '#fffdf7',
          color: '#0f172a',
          borderRadius: 28,
          border: '6px solid #1e3a5f',
          boxShadow: '0 34px 90px rgba(0,0,0,0.68)',
          padding: '40px 44px',
          transform: `scale(${0.86 + pop * 0.14})`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f', letterSpacing: 2 }}>
          ACQUISITION AGREEMENT · 19 FEB 2014
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8, color: '#0f172a' }}>
          FACEBOOK INC. × WHATSAPP INC.
        </div>
        <div
          style={{
            marginTop: 22,
            padding: '22px 26px',
            background: '#ecfdf5',
            borderRadius: 20,
            border: '3px solid #10b981',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#047857' }}>NILAI AKUISISI RESMI</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#065f46', letterSpacing: -1 }}>
            $19,000,000,000
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>
            (± Rp 280 Triliun)
          </div>
        </div>

        {/* Animated Fountain Pen Signature Line */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ width: 420 }}>
            <svg width="400" height="86" viewBox="0 0 400 86">
              {signed && (
                <path
                  d="M 22 62 C 35 12, 62 10, 56 64 C 52 78, 86 38, 108 42 C 122 45, 118 65, 140 58 C 168 48, 182 14, 185 60 C 195 45, 224 38, 240 58 C 258 40, 290 42, 315 56 C 335 45, 355 52, 378 48"
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="620"
                  strokeDashoffset={620 * (1 - sigDraw)}
                />
              )}
              <line x1="10" y1="76" x2="390" y2="76" stroke="#475569" strokeWidth="3" />
            </svg>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#475569' }}>
              Jan Koum — Co-Founder &amp; CEO, WhatsApp
            </div>
          </div>

          {signed && (
            <div
              style={{
                border: '6px solid #16a34a',
                color: '#16a34a',
                padding: '10px 22px',
                borderRadius: 16,
                fontSize: 30,
                fontWeight: 900,
                transform: `rotate(-8deg) scale(${0.5 + stampPop * 0.5})`,
                opacity: stampPop,
              }}
            >
              SIGNED ✓
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

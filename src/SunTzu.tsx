import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { SunTzuScene } from './scenesSunTzu';
import { Timing } from './suntzu/timing';

export type SunTzuProps = { withAudio?: boolean; timing?: Timing };

const SPEAKER_COLOR: Record<string, { badge: string; stroke: string; text: string }> = {
  raja:     { badge: '#a63232', stroke: '#4d1414', text: '#fff4d4' },
  suntzu:   { badge: '#2f5940', stroke: '#172e20', text: '#ffffff' },
  selir_a:  { badge: '#b84c60', stroke: '#4f1b26', text: '#fff5f7' },
  selir_b:  { badge: '#386291', stroke: '#172e47', text: '#f0f7ff' },
  utusan:   { badge: '#9c6828', stroke: '#40290d', text: '#fff7e6' },
  narator:  { badge: '#3b342e', stroke: '#1e1916', text: '#fff8e7' },
  crowd:    { badge: '#7c456e', stroke: '#381a30', text: '#fff2fb' },
};

const Captions: React.FC<{ timing: Timing }> = ({ timing }) => {
  const f = useCurrentFrame();
  const c = timing.captions.find((cap) => {
    const a = cap.startFrame ?? cap.from ?? 0;
    const b = cap.endFrame ?? cap.to ?? 0;
    return f >= a && f < b;
  });
  if (!c) return null;
  const vKey = (c.voice ?? 'narator').startsWith('crowd_') ? 'crowd' : (c.voice ?? 'narator');
  const pal = SPEAKER_COLOR[vKey] ?? SPEAKER_COLOR.narator;

  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        right: 56,
        bottom: 138,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {c.speaker && (
        <div
          style={{
            background: pal.badge,
            color: '#fff8e8',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1.6,
            padding: '5px 18px',
            borderRadius: 999,
            border: '2px solid rgba(255,244,218,0.65)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
          }}
        >
          {c.speaker}
        </div>
      )}
      <div
        style={{
          textAlign: 'center',
          fontSize: c.highlight ? 72 : 64,
          fontWeight: 900,
          lineHeight: 1.08,
          color: c.highlight ? '#ffe078' : pal.text,
          textShadow: '0 5px 0 #1c1512, 3px 0 0 #1c1512, -3px 0 0 #1c1512, 0 -3px 0 #1c1512, 0 8px 22px rgba(0,0,0,0.65)',
          WebkitTextStroke: `2.2px ${pal.stroke}`,
        }}
      >
        {c.text}
      </div>
    </div>
  );
};

export const SunTzu: React.FC<SunTzuProps> = ({ withAudio = false, timing }) => {
  if (!timing) {
    throw new Error('SunTzu requires timing. Production entry loads src/suntzu_timing.json.');
  }
  return (
    <AbsoluteFill style={{ background: '#bed9dc' }}>
      {withAudio && <Audio src={staticFile('audio/suntzu_master.mp3')} />}
      {timing.order.map((s, i) => (
        <Sequence
          key={s}
          from={timing.scenes[s].startFrame}
          durationInFrames={timing.scenes[s].durationInFrames}
          name={s}
        >
          <SunTzuScene timing={timing} scene={s} index={i} />
        </Sequence>
      ))}
      <Captions timing={timing} />
    </AbsoluteFill>
  );
};

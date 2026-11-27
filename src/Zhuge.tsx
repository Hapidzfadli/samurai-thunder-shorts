/**
 * Root composition for Zhuge Liang: Strategi Kota Kosong.
 * Features a rich, NON-MONOTONOUS Dynamic Typography Engine that adapts font family,
 * layout, motion, badge design, and karaoke phrase highlighting to each character & mood!
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { ZhugeScene } from './scenesZhuge';
import { useXichengGlb } from './zhuge/World';
import { ZhugeLine, ZhugeTiming } from './zhuge/timing';

export type ZhugeProps = { withAudio?: boolean; timing?: ZhugeTiming };

type VoiceStyle = {
  badgeBg: string;
  badgeBorder: string;
  fontFamily: string;
  baseColor: string;
  activeColor: string;
  stroke: string;
  boxBg?: string;
  boxBorder?: string;
  italic?: boolean;
  tilt?: number;
  shakeAmp?: number;
  sizeBase: number;
  sizeActive: number;
  mode: 'serif_scroll' | 'military_impact' | 'fiery_tilt' | 'panic_jitter' | 'whisper_box' | 'crowd_stack' | 'editorial_bar';
};

const VOICE_STYLE: Record<string, VoiceStyle> = {
  zhuge: {
    badgeBg: 'linear-gradient(90deg, #273e52, #3c5b75)',
    badgeBorder: '#e2bd68',
    fontFamily: 'Georgia, "Times New Roman", serif',
    baseColor: '#f6eed9',
    activeColor: '#ffe285',
    stroke: '#16212b',
    sizeBase: 50,
    sizeActive: 60,
    mode: 'serif_scroll',
  },
  simayi: {
    badgeBg: 'linear-gradient(90deg, #7a1b1b, #a82828)',
    badgeBorder: '#f0c45d',
    fontFamily: 'Impact, "Arial Black", Inter, sans-serif',
    baseColor: '#fff0d4',
    activeColor: '#ffca4d',
    stroke: '#2e0808',
    shakeAmp: 3.0,
    sizeBase: 54,
    sizeActive: 68,
    mode: 'military_impact',
  },
  simazhao: {
    badgeBg: 'linear-gradient(90deg, #8c3d19, #bd5522)',
    badgeBorder: '#ffd080',
    fontFamily: 'Inter, sans-serif',
    baseColor: '#fff2db',
    activeColor: '#ffae42',
    stroke: '#361507',
    italic: true,
    tilt: -3,
    sizeBase: 50,
    sizeActive: 62,
    mode: 'fiery_tilt',
  },
  pengintai: {
    badgeBg: '#9e621c',
    badgeBorder: '#ffe29c',
    fontFamily: 'Inter, sans-serif',
    baseColor: '#fff6db',
    activeColor: '#ff7b54',
    stroke: '#381e06',
    shakeAmp: 4.0,
    sizeBase: 50,
    sizeActive: 62,
    mode: 'panic_jitter',
  },
  perwira: {
    badgeBg: '#2e5742',
    badgeBorder: '#e2c57e',
    fontFamily: 'Inter, sans-serif',
    baseColor: '#f2faee',
    activeColor: '#ffd966',
    stroke: '#11261b',
    shakeAmp: 2.5,
    sizeBase: 50,
    sizeActive: 60,
    mode: 'panic_jitter',
  },
  penyapu: {
    badgeBg: 'rgba(84, 74, 58, 0.92)',
    badgeBorder: '#d6c6a5',
    fontFamily: 'Georgia, serif',
    baseColor: '#f5ecd8',
    activeColor: '#ffe79e',
    stroke: '#241e17',
    boxBg: 'rgba(26, 22, 18, 0.78)',
    boxBorder: 'rgba(218, 198, 158, 0.55)',
    italic: true,
    sizeBase: 44,
    sizeActive: 50,
    mode: 'whisper_box',
  },
  crowd: {
    badgeBg: 'linear-gradient(90deg, #8f2222, #b8421f)',
    badgeBorder: '#ffdf78',
    fontFamily: 'Impact, Inter, sans-serif',
    baseColor: '#fff4d6',
    activeColor: '#ff5242',
    stroke: '#290909',
    shakeAmp: 5.0,
    tilt: -2.5,
    sizeBase: 54,
    sizeActive: 68,
    mode: 'crowd_stack',
  },
  narator: {
    badgeBg: 'rgba(30, 24, 20, 0.9)',
    badgeBorder: '#d6ac54',
    fontFamily: 'Inter, sans-serif',
    baseColor: '#fffaf0',
    activeColor: '#ffe074',
    stroke: '#17120f',
    boxBg: 'rgba(20, 16, 13, 0.80)',
    boxBorder: 'rgba(220, 178, 92, 0.72)',
    sizeBase: 46,
    sizeActive: 54,
    mode: 'editorial_bar',
  },
};

/**
 * Dynamic Phrase-Window Karaoke Captions:
 * Shows 3-word crisp phrase windows with the currently spoken word popping & styled
 * differently per character & emotional state — never monotonous!
 */
const DynamicCaptions: React.FC<{ timing: ZhugeTiming }> = ({ timing }) => {
  const f = useCurrentFrame();

  // Locate active scene + active line
  let activeScene: string | null = null;
  let localF = 0;
  for (const s of timing.order) {
    const info = timing.scenes[s];
    if (f >= info.startFrame && f < info.startFrame + info.durationInFrames) {
      activeScene = s;
      localF = f - info.startFrame;
      break;
    }
  }
  if (!activeScene) return null;

  const lines: ZhugeLine[] = timing.lines[activeScene] ?? [];
  const line = lines.find((ln) => localF >= ln.from - 2 && localF <= ln.to + 4);
  if (!line || line.words.length === 0) return null;

  // Find active word index within this line
  let wi = line.words.findIndex((w) => localF >= w.from && localF <= Math.max(w.from + 3, w.to));
  if (wi < 0) {
    // Between words inside line: show nearest upcoming or last spoken word
    wi = line.words.findIndex((w) => localF < w.from);
    if (wi < 0) wi = line.words.length - 1;
    else if (wi > 0) wi -= 1;
  }

  // Group words into natural 3-word readable chunks (2 words for short shout lines)
  const vKey = line.voice.startsWith('crowd_') ? 'crowd' : line.voice;
  const st = VOICE_STYLE[vKey] ?? VOICE_STYLE.narator;
  const chunkSize = st.mode === 'military_impact' || st.mode === 'crowd_stack' ? 2 : 3;
  const chunkIdx = Math.floor(wi / chunkSize);
  const chunkWords = line.words.slice(chunkIdx * chunkSize, chunkIdx * chunkSize + chunkSize);
  const activeWord = line.words[wi];
  const wordAge = Math.max(0, localF - activeWord.from);

  const pop = spring({ frame: wordAge, fps: timing.fps, config: { damping: 12, stiffness: 220 } });
  const isLoud =
    activeWord.w.includes('!') ||
    activeWord.w === activeWord.w.toUpperCase() ||
    st.mode === 'crowd_stack';
  const shakeX =
    st.shakeAmp && isLoud && wordAge < 12
      ? Math.sin(f * 2.9) * st.shakeAmp * (1 - wordAge / 12)
      : 0;
  const shakeY =
    st.shakeAmp && isLoud && wordAge < 12
      ? Math.cos(f * 3.4) * st.shakeAmp * 0.6 * (1 - wordAge / 12)
      : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: 48,
        right: 48,
        bottom: st.mode === 'whisper_box' ? 162 : 132,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
        transform: `translate(${shakeX}px, ${shakeY}px) rotate(${st.tilt ?? 0}deg)`,
      }}
    >
      {/* Speaker badge (varied design per role!) */}
      {line.speaker && (
        <div
          style={{
            background: st.badgeBg,
            color: '#fff8e8',
            fontFamily: 'Inter, sans-serif',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: st.mode === 'serif_scroll' ? 2.6 : 1.6,
            padding: st.mode === 'serif_scroll' ? '6px 24px' : '5px 20px',
            borderRadius: st.mode === 'military_impact' ? 6 : 999,
            border: `2.5px solid ${st.badgeBorder}`,
            boxShadow: '0 6px 18px rgba(0,0,0,0.48)',
          }}
        >
          {st.mode === 'whisper_box' ? `🤫 ${line.speaker}` : st.mode === 'crowd_stack' ? `🔥 ${line.speaker}` : line.speaker}
        </div>
      )}

      {/* Phrase container (editorial bar / whisper card / stacked crowd / floating serif or impact) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: '10px 24px',
          padding: st.boxBg ? '14px 28px' : st.mode === 'crowd_stack' ? '12px 24px' : '6px 14px',
          borderRadius: st.mode === 'editorial_bar' ? 20 : st.mode === 'whisper_box' ? 16 : 12,
          background:
            st.boxBg ??
            (st.mode === 'crowd_stack'
              ? 'rgba(130, 22, 22, 0.78)'
              : 'transparent'),
          border: st.boxBorder
            ? `2.5px solid ${st.boxBorder}`
            : st.mode === 'crowd_stack'
              ? '3px solid #ffd966'
              : 'none',
          boxShadow: st.boxBg || st.mode === 'crowd_stack' ? '0 10px 30px rgba(0,0,0,0.52)' : 'none',
          maxWidth: 960,
        }}
      >
        {chunkWords.map((w, idx) => {
          const globalIdx = chunkIdx * chunkSize + idx;
          const isCurrent = globalIdx === wi;
          const isPast = globalIdx < wi;
          const scale = isCurrent ? 0.92 + pop * 0.16 : 1.0;

          return (
            <span
              key={globalIdx}
              style={{
                display: 'inline-block',
                fontFamily: st.fontFamily,
                fontSize: isCurrent ? st.sizeActive : st.sizeBase,
                fontWeight: 900,
                fontStyle: st.italic ? 'italic' : 'normal',
                lineHeight: 1.08,
                color: isCurrent ? st.activeColor : isPast ? st.baseColor : 'rgba(255, 248, 232, 0.72)',
                transform: `scale(${scale})`,
                textShadow:
                  st.mode === 'editorial_bar' || st.mode === 'whisper_box'
                    ? '0 3px 10px rgba(0,0,0,0.85)'
                    : '0 5px 0 #18110e, 3px 0 0 #18110e, -3px 0 0 #18110e, 0 -3px 0 #18110e, 0 10px 24px rgba(0,0,0,0.72)',
                WebkitTextStroke:
                  st.mode === 'editorial_bar' || st.mode === 'whisper_box'
                    ? '0px transparent'
                    : `2.2px ${st.stroke}`,
                letterSpacing: st.mode === 'military_impact' ? 1.5 : 0.3,
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>

      {/* Subtle golden brush underline exclusively for Zhuge Liang's calm wisdom */}
      {st.mode === 'serif_scroll' && (
        <div
          style={{
            width: 240,
            height: 3,
            borderRadius: 99,
            background: 'linear-gradient(90deg, transparent, #e8c36c, transparent)',
            marginTop: -4,
          }}
        />
      )}
    </div>
  );
};

export const Zhuge: React.FC<ZhugeProps> = ({ withAudio = false, timing }) => {
  const model = useXichengGlb();
  if (!timing) {
    throw new Error('Zhuge requires timing. Production entry loads src/zhuge_timing.json.');
  }
  if (!model) return null;

  return (
    <AbsoluteFill style={{ background: '#261e1a' }}>
      {withAudio && <Audio src={staticFile('audio/zhuge_master.mp3')} />}
      {timing.order.map((s) => (
        <Sequence
          key={s}
          from={timing.scenes[s].startFrame}
          durationInFrames={timing.scenes[s].durationInFrames}
          name={s}
        >
          <ZhugeScene timing={timing} scene={s} model={model} />
        </Sequence>
      ))}
      <DynamicCaptions timing={timing} />
    </AbsoluteFill>
  );
};

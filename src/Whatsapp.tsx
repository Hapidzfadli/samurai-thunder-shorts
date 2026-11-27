import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import T from './whatsapp_timing.json';
import {
  SceneWaAntrean,
  SceneWaDitolak,
  SceneWaHook,
  SceneWaIde,
  SceneWaMeledak,
  SceneWaPenutup,
  SceneWaPrinsip,
  SceneWaTawaran,
} from './scenesWhatsapp';

export const TOTAL_FRAMES_WHATSAPP = T.totalFrames;

type CaptionCue = {
  text: string;
  startFrame: number;
  endFrame: number;
  highlight: boolean;
  voice: string;
};

const CAPTIONS = T.captions as CaptionCue[];
const SCENES = T.scenes as Record<string, { startFrame: number; durationInFrames: number }>;

const SCENE_BADGES: Record<string, { title: string; sub: string; accent: string }> = {
  hook:    { title: 'MOUNTAIN VIEW · 2014', sub: 'KONTRAK RP 280 TRILIUN DI DEPAN DINAS SOSIAL', accent: '#25d366' },
  antrean: { title: 'FLASHBACK · 1992', sub: 'ANTRE KUPON MAKANAN · CALIFORNIA', accent: '#38bdf8' },
  ditolak: { title: 'SILICON VALLEY · 2009', sub: 'DITOLAK FACEBOOK & TWITTER', accent: '#f87171' },
  ide:     { title: 'APARTEMEN JAN · 02:15', sub: 'LAHIRNYA IDE WHATSAPP', accent: '#25d366' },
  prinsip: { title: 'PRINSIP WHATSAPP', sub: 'NO ADS · NO GAMES · NO GIMMICKS', accent: '#facc15' },
  meledak: { title: '2011 — 2014', sub: '450 JUTA PENGGUNA · 55 KARYAWAN', accent: '#25d366' },
  tawaran: { title: '19 FEBRUARI 2014', sub: 'TAWARAN AKUISISI $19 MILIAR', accent: '#4ade80' },
  penutup: { title: 'KISAH NYATA JAN KOUM', sub: 'PENOLAKAN BUKAN AKHIR CERITAMU', accent: '#facc15' },
};

const TopBadge: React.FC<{ scene: string; localFrame: number }> = ({ scene, localFrame }) => {
  const { fps } = useVideoConfig();
  const info = SCENE_BADGES[scene];
  if (!info || localFrame > 135) return null;
  const enter = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 150 } });
  const exit = interpolate(localFrame, [110, 132], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 86,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 25,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * -28}px)`,
      }}
    >
      <div
        style={{
          background: 'rgba(11, 18, 30, 0.86)',
          border: `3px solid ${info.accent}`,
          borderRadius: 99,
          padding: '10px 30px',
          color: info.accent,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 900,
          fontSize: 28,
          letterSpacing: 1.5,
          boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
        }}
      >
        {info.title}
      </div>
      <div
        style={{
          marginTop: 8,
          background: 'rgba(11, 18, 30, 0.78)',
          borderRadius: 12,
          padding: '6px 20px',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 800,
          fontSize: 21,
          letterSpacing: 0.6,
        }}
      >
        {info.sub}
      </div>
    </div>
  );
};

const WordCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cue = CAPTIONS.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;

  const pop = spring({
    frame: frame - cue.startFrame,
    fps,
    config: { damping: 16, stiffness: 220 },
  });
  const color =
    cue.voice === 'butini'
      ? '#fde68a'
      : cue.voice === 'ara'
        ? '#fca5a5'
        : cue.highlight
          ? '#4ade80'
          : '#ffffff';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 295,
        left: 60,
        right: 60,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      <div
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 900,
          fontSize: cue.highlight ? 68 : 60,
          color,
          textAlign: 'center',
          transform: `scale(${0.88 + pop * 0.12})`,
          textShadow:
            '-4px -4px 0 #090d14, 4px -4px 0 #090d14, -4px 4px 0 #090d14, 4px 4px 0 #090d14, 0 8px 22px rgba(0,0,0,0.82)',
          lineHeight: 1.1,
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};

const SceneWrapper: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => {
  const f = useCurrentFrame();
  const sc = SCENES[name];
  const fadeIn = interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(f, [sc.durationInFrames - 8, sc.durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
      <TopBadge scene={name} localFrame={f} />
    </AbsoluteFill>
  );
};

export const Whatsapp: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1220' }}>
      {withAudio && <Audio src={staticFile('audio/whatsapp_master.mp3')} />}

      <Sequence from={SCENES.hook.startFrame} durationInFrames={SCENES.hook.durationInFrames}>
        <SceneWrapper name="hook"><SceneWaHook /></SceneWrapper>
      </Sequence>
      <Sequence from={SCENES.antrean.startFrame} durationInFrames={SCENES.antrean.durationInFrames}>
        <SceneWrapper name="antrean"><SceneWaAntrean /></SceneWrapper>
      </Sequence>
      <Sequence from={SCENES.ditolak.startFrame} durationInFrames={SCENES.ditolak.durationInFrames}>
        <SceneWrapper name="ditolak"><SceneWaDitolak /></SceneWrapper>
      </Sequence>
      <Sequence from={SCENES.ide.startFrame} durationInFrames={SCENES.ide.durationInFrames}>
        <SceneWrapper name="ide"><SceneWaIde /></SceneWrapper>
      </Sequence>
      <Sequence from={SCENES.prinsip.startFrame} durationInFrames={SCENES.prinsip.durationInFrames}>
        <SceneWrapper name="prinsip"><SceneWaPrinsip /></SceneWrapper>
      </Sequence>
      <Sequence from={SCENES.meledak.startFrame} durationInFrames={SCENES.meledak.durationInFrames}>
        <SceneWrapper name="meledak"><SceneWaMeledak /></SceneWrapper>
      </Sequence>
      <Sequence from={SCENES.tawaran.startFrame} durationInFrames={SCENES.tawaran.durationInFrames}>
        <SceneWrapper name="tawaran"><SceneWaTawaran /></SceneWrapper>
      </Sequence>
      <Sequence from={SCENES.penutup.startFrame} durationInFrames={SCENES.penutup.durationInFrames}>
        <SceneWrapper name="penutup"><SceneWaPenutup /></SceneWrapper>
      </Sequence>

      <WordCaptions />
    </AbsoluteFill>
  );
};

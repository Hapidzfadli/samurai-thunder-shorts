/**
 * Preview Entry for Zhuge Liang: Strategi Kota Kosong.
 * Renders:
 *  - ZhugeCharSheet (1920x1080): Actual 2D articulated rig showcase of all 8 characters
 *  - ZhugeLatarPreview (1080x1920, frames 0..3): 4 HQ 3D angles of Xicheng Fortress
 *  - ZhugeScenePreview (1080x1920, frames 0..5): 6 key dramatic story scenes with characters, props & lighting
 */
import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { CameraRig } from './three/objects';
import { ToonSky } from './three/toon';
import { ZhugeExpr, ZhugeRole, drawZhugeChar } from './zhuge/rigZhuge';
import {
  DustClouds3D,
  IncenseSmoke3D,
  V3,
  WeiBannerProp,
  XichengInstance,
  ZhugeActor,
  useXichengGlb,
} from './zhuge/World';

// ===== 1. ACTUAL CHARACTER RIG SHOWCASE SHEET =====
const CharCard: React.FC<{
  role: ZhugeRole;
  label: string;
  sub: string;
  expr: ZhugeExpr;
  armL?: [number, number];
  armR?: [number, number];
  sweat?: boolean;
}> = ({ role, label, sub, expr, armL, armR, sweat }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    drawZhugeChar(ctx, { role, expr, mouthOpen: expr === 'panic' ? 0.65 : 0.12, armL, armR, sweat });
  }, [role, expr, armL, armR, sweat]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(255, 250, 238, 0.94)',
        border: '3px solid #8a7352',
        borderRadius: 18,
        padding: '8px 12px 12px',
        boxShadow: '0 8px 24px rgba(30,20,10,0.18)',
      }}
    >
      <canvas ref={ref} width={512} height={1024} style={{ width: 168, height: 336 }} />
      <div style={{ fontSize: 24, fontWeight: 900, color: '#2b2119', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#6b5844', textAlign: 'center', marginTop: 2 }}>{sub}</div>
    </div>
  );
};

const ZhugeCharSheet: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'linear-gradient(180deg, #f3e8d0 0%, #e4d3b0 100%)',
      fontFamily: 'Inter, sans-serif',
      padding: '28px 36px 26px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 38, fontWeight: 900, color: '#261d16', letterSpacing: 1 }}>
        LEMBAR KARAKTER AKTUAL (2D ARTICULATED RIG) — STRATEGI KOTA KOSONG
      </div>
      <div style={{ fontSize: 19, color: '#5c4b39', marginTop: 4 }}>
        Semua karakter memiliki lengan 2-segmen, walk cycle, kedip mata, lirikan pupil, & real-time lip-sync
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 14 }}>
      <CharCard role="zhuge" label="ZHUGE LIANG" sub="Tenang • Jubah Gading + Kipas Bulu" expr="calm" armL={[14, -10]} armR={[30, 32]} />
      <CharCard role="simayi" label="JEND. SIMA YI" sub="Curiga • Zirah Arang-Emas + Jubah" expr="suspicious" armL={[18, -12]} armR={[38, 28]} />
      <CharCard role="simazhao" label="SIMA ZHAO" sub="Agresif • Zirah Perunggu-Merah" expr="eager" armL={[22, 10]} armR={[54, 34]} />
      <CharCard role="pengintai" label="PENGINTAI SHU" sub="Panik • Melapor 150.000 Pasukan" expr="panic" armL={[52, 34]} armR={[56, 38]} sweat />
      <CharCard role="perwira" label="PERWIRA SHU" sub="Syok • Komandan Kota Xicheng" expr="shock" armL={[24, 18]} armR={[42, 32]} />
      <CharCard role="penyapu" label="PENYAPU TUA" sub="Prajurit Menyamar • Topi Caping + Sapu" expr="neutral" armL={[18, -6]} armR={[32, 16]} />
      <CharCard role="pelayan" label="PELAYAN MENARA" sub="Tenang • Mendampingi Zhuge Liang" expr="calm" armL={[14, -8]} armR={[16, -6]} />
      <CharCard role="wei_soldier" label="PASUKAN WEI" sub="150.000 Tentara • Zirah Gelap + Tombak" expr="angry" armL={[18, -10]} armR={[36, 18]} />
    </div>
  </AbsoluteFill>
);

// ===== 2. 4-ANGLE 3D XICHENG FORTRESS ENVIRONMENT PREVIEW (frames 0..3) =====
const LATAR_SHOTS: Array<{ name: string; pos: V3; look: V3; fov: number; gateOpen: number; bannersDown: number }> = [
  { name: '01 / GERBANG BENTENG XICHENG TERBUKA LEBAR', pos: [5.5, 4.6, 17.5], look: [0, 4.2, 0], fov: 50, gateOpen: 1, bannersDown: 1 },
  { name: '02 / BALKON MENARA & MEJA KECAPI GUQIN', pos: [1.8, 7.2, 4.2], look: [0, 6.2, 0.8], fov: 46, gateOpen: 1, bannersDown: 1 },
  { name: '03 / JALAN BATU DALAM KOTA & BALAIRUNG', pos: [2.2, 3.2, -5.5], look: [0, 2.2, -21.5], fov: 50, gateOpen: 0, bannersDown: 0 },
  { name: '04 / LUAR BENTENG & DATARAN PASUKAN WEI', pos: [-9.0, 7.8, 28.0], look: [0, 3.8, 2.0], fov: 52, gateOpen: 1, bannersDown: 1 },
];

const ZhugeLatarPreview: React.FC = () => {
  const f = useCurrentFrame();
  const model = useXichengGlb();
  if (!model) return null;
  const s = LATAR_SHOTS[Math.min(LATAR_SHOTS.length - 1, f)];
  return (
    <AbsoluteFill style={{ background: '#261e1a', fontFamily: 'Inter, sans-serif' }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows="basic"
        camera={{ position: s.pos, fov: s.fov, near: 0.1, far: 260 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      >
        <CameraRig position={s.pos} lookAt={s.look} fov={s.fov} />
        <ToonSky top="#3d4d68" horizon="#e8a468" bottom="#8c6d52" r={220} />
        <hemisphereLight args={['#ffe8c8', '#5e5044', 1.25]} />
        <directionalLight
          position={[-20, 26, 22]}
          color="#ffc585"
          intensity={2.6}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.0008}
        />
        <directionalLight position={[14, 10, -16]} color="#9cb8d9" intensity={0.55} />
        <pointLight position={[0, 8.2, 2.4]} intensity={22} distance={14} decay={1.4} color="#ff9944" />
        <pointLight position={[0, 3.6, -21.0]} intensity={18} distance={14} decay={1.4} color="#ffb96e" />
        <XichengInstance source={model} gateOpen={s.gateOpen} bannersDown={s.bannersDown} />
        <IncenseSmoke3D at={[0.72, 6.65, 1.22]} f={30} />
        <DustClouds3D f={30} zCenter={25} density={0.9} />
      </ThreeCanvas>
      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 56,
          right: 56,
          textAlign: 'center',
          background: 'rgba(28, 22, 18, 0.86)',
          color: '#ffe8b5',
          border: '2px solid #d4a852',
          borderRadius: 16,
          padding: '14px 20px',
          fontSize: 28,
          fontWeight: 900,
        }}
      >
        {s.name}
      </div>
    </AbsoluteFill>
  );
};

// ===== 3. 6-KEY DRAMATIC SCENE PREVIEWS (frames 0..5, 1080x1920) =====
const ZhugeScenePreview: React.FC = () => {
  const f = useCurrentFrame();
  const model = useXichengGlb();
  if (!model) return null;

  const idx = Math.min(5, f);
  const meta = [
    { title: '01 / KABAR MENGERIKAN DI XICHENG', badge: 'PENGINTAI SHU', badgeBg: '#9c6828', sub: 'seratus lima puluh ribu!', pos: [0.2, 2.5, -13.6] as V3, look: [0.0, 1.85, -20.5] as V3, fov: 48, gateOpen: 0, bannersDown: 0 },
    { title: '03 / PERINTAH GILA ZHUGE LIANG', badge: 'ZHUGE LIANG', badgeBg: '#365066', sub: 'Buka lebar gerbang kota!', pos: [-0.35, 2.45, -14.8] as V3, look: [0.15, 1.95, -21.0] as V3, fov: 46, gateOpen: 0, bannersDown: 0 },
    { title: '04 / GERBANG DIBUKA & DISAPU', badge: 'PENYAPU TUA', badgeBg: '#6c624d', sub: 'Sapu terus... tenang!', pos: [1.6, 3.8, 16.5] as V3, look: [0.0, 3.6, 1.0] as V3, fov: 50, gateOpen: 1, bannersDown: 1 },
    { title: '05 / 150.000 PASUKAN SIMA YI TIBA!', badge: 'JEND. SIMA YI', badgeBg: '#8c2626', sub: 'BERHENTI!!', pos: [0.4, 2.5, 8.6] as V3, look: [0.2, 1.85, 16.0] as V3, fov: 48, gateOpen: 1, bannersDown: 1 },
    { title: '06 / KECAPI GUQIN DI ATAS MENARA', badge: 'ZHUGE LIANG', badgeBg: '#365066', sub: '♪ Alunan Kecapi Guqin ♪', pos: [0.6, 7.25, 4.4] as V3, look: [0.0, 6.45, 0.8] as V3, fov: 42, gateOpen: 1, bannersDown: 1 },
    { title: '08 / PERINTAH MUNDUR!', badge: 'JEND. SIMA YI', badgeBg: '#8c2626', sub: 'INI JEBAKAN! MUNDUR!!', pos: [-0.9, 2.75, 8.8] as V3, look: [0.2, 1.85, 16.2] as V3, fov: 50, gateOpen: 1, bannersDown: 1 },
  ][idx];

  return (
    <AbsoluteFill style={{ background: '#261e1a', fontFamily: 'Inter, sans-serif' }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows="basic"
        camera={{ position: meta.pos, fov: meta.fov, near: 0.1, far: 260 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      >
        <CameraRig position={meta.pos} lookAt={meta.look} fov={meta.fov} />
        <ToonSky top="#3d4d68" horizon="#e8a468" bottom="#8c6d52" r={220} />
        <hemisphereLight args={['#ffe8c8', '#5e5044', 1.25]} />
        <directionalLight
          position={[-20, 26, 22]}
          color="#ffc585"
          intensity={2.6}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.0008}
        />
        <directionalLight position={[14, 10, -16]} color="#9cb8d9" intensity={0.55} />
        <pointLight position={[0, 8.2, 2.4]} intensity={22} distance={14} decay={1.4} color="#ff9944" />
        <pointLight position={[0, 3.6, -21.0]} intensity={20} distance={15} decay={1.4} color="#ffb96e" />

        <XichengInstance source={model} gateOpen={meta.gateOpen} bannersDown={meta.bannersDown} />

        {/* Interior Hall Scenes (0 & 1): All 3 characters tightly framed in vertical 9:16 */}
        {(idx === 0 || idx === 1) && (
          <>
            <ZhugeActor role="zhuge" at={[0.05, 0.55, -21.2]} cam={meta.pos} f={40} h={2.05} expr="calm" mouthOpen={idx === 1 ? 0.58 : 0} fan armR={[28, 28]} seed={1} />
            <ZhugeActor role="pengintai" at={[-1.08, 0.55, -19.2]} cam={meta.pos} f={40} h={1.92} expr="panic" mouthOpen={idx === 0 ? 0.72 : 0} armL={[50, 32]} armR={[54, 36]} sweat seed={2} />
            <ZhugeActor role="perwira" at={[1.22, 0.55, -19.5]} cam={meta.pos} f={40} h={1.98} expr="shock" armL={[24, 16]} armR={[38, 28]} seed={3} />
          </>
        )}

        {/* Gate Open + Sweepers + Zhuge atop Tower (Scenes 2 & 4) */}
        {(idx === 2 || idx === 4) && (
          <>
            {/* Zhuge Liang seated calmly behind the Guqin table atop the Gate Tower */}
            <ZhugeActor role="zhuge" at={[0.0, 5.55, 0.65]} cam={meta.pos} f={45} h={2.05} expr="smile" sitting armL={[-16, -12]} armR={[-16, -12]} seed={1} />
            <ZhugeActor role="pelayan" at={[-1.45, 5.59, 0.55]} cam={meta.pos} f={45} h={1.65} expr="calm" seed={11} />
            <ZhugeActor role="pelayan" at={[1.45, 5.59, 0.55]} cam={meta.pos} f={45} h={1.65} expr="calm" seed={12} />
            <IncenseSmoke3D at={[0.72, 6.65, 1.22]} f={45} />

            {/* 3 Disguised Elderly Sweepers casually sweeping in front of the wide-open gate */}
            <ZhugeActor role="penyapu" at={[-1.25, 0.1, 4.4]} cam={meta.pos} f={45} h={1.88} expr="neutral" broom armR={[30, 14]} seed={21} />
            <ZhugeActor role="penyapu" at={[1.15, 0.1, 5.2]} cam={meta.pos} f={45} h={1.88} expr="neutral" broom armR={[30, 14]} seed={22} />
            <ZhugeActor role="penyapu" at={[-0.1, 0.1, 7.0]} cam={meta.pos} f={45} h={1.86} expr="neutral" broom armR={[30, 14]} seed={23} />
          </>
        )}

        {/* Sima Yi, Sima Zhao & Wei Army Outside the Gate (Scenes 3 & 5) */}
        {(idx === 3 || idx === 5) && (
          <>
            <ZhugeActor role="simayi" at={[-0.55, 0.1, 14.2]} cam={meta.pos} f={50} h={2.06} expr={idx === 5 ? 'panic' : 'suspicious'} mouthOpen={0.68} armL={[24, 14]} armR={idx === 5 ? [66, 42] : [58, 36]} sweat={idx === 5} seed={31} />
            <ZhugeActor role="simazhao" at={[1.02, 0.1, 14.9]} cam={meta.pos} f={50} h={2.0} expr={idx === 5 ? 'shock' : 'eager'} armL={[20, 10]} armR={[48, 32]} seed={32} />
            {/* Dense rows of armored Wei soldiers + crimson war banners + low ground dust */}
            {Array.from({ length: 12 }, (_, k) => {
              const col = (k % 6) - 2.5;
              const row = Math.floor(k / 6);
              return (
                <ZhugeActor
                  key={k}
                  role="wei_soldier"
                  at={[col * 1.55 + (row % 2) * 0.55, 0.1, 17.8 + row * 2.2]}
                  cam={meta.pos}
                  f={50}
                  h={1.94}
                  expr="angry"
                  spear
                  seed={50 + k}
                />
              );
            })}
            <WeiBannerProp at={[-2.9, 0.1, 17.5]} f={50} seed={1} />
            <WeiBannerProp at={[2.9, 0.1, 17.5]} f={50} seed={2} />
            <WeiBannerProp at={[-1.1, 0.1, 20.5]} f={50} seed={3} />
            <WeiBannerProp at={[1.9, 0.1, 20.8]} f={50} seed={4} />
            <DustClouds3D f={50} zCenter={24} density={1.0} />
          </>
        )}
      </ThreeCanvas>

      {/* Top scene badge */}
      <div
        style={{
          position: 'absolute',
          top: 74,
          left: 56,
          right: 56,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: '#2c221b',
            background: 'rgba(249, 238, 217, 0.92)',
            padding: '14px 26px',
            borderRadius: 16,
            border: '2.5px solid #ad905e',
            fontWeight: 900,
            fontSize: 28,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {meta.title}
        </div>
      </div>

      {/* Bottom speaker badge + sample dramatic caption */}
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
        }}
      >
        <div
          style={{
            background: meta.badgeBg,
            color: '#fff8e8',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1.5,
            padding: '5px 18px',
            borderRadius: 999,
            border: '2px solid rgba(255,244,218,0.65)',
          }}
        >
          {meta.badge}
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 64,
            fontWeight: 900,
            color: '#ffe078',
            textShadow: '0 5px 0 #1c1512, 3px 0 0 #1c1512, -3px 0 0 #1c1512, 0 -3px 0 #1c1512',
          }}
        >
          {meta.sub}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <>
    <Composition id="ZhugeCharSheet" component={ZhugeCharSheet} width={1920} height={1080} fps={30} durationInFrames={1} />
    <Composition id="ZhugeLatarPreview" component={ZhugeLatarPreview} width={1080} height={1920} fps={30} durationInFrames={4} />
    <Composition id="ZhugeScenePreview" component={ZhugeScenePreview} width={1080} height={1920} fps={30} durationInFrames={6} />
  </>
);

registerRoot(Root);

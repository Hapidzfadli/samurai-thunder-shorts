/**
 * All 10 Full Dramatic Animated 3D Scenes for Zhuge Liang: Strategi Kota Kosong.
 * Uses the HQ Blender Xicheng Fortress (zhuge_xicheng_hq.glb) with live animated
 * fortress gates, lowering Shu banners, 2D articulated characters, 3D props,
 * dynamic camera choreography, and synced kinetic typography inserts.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { CameraRig } from './three/objects';
import { ToonSky } from './three/toon';
import {
  DustClouds3D,
  IncenseSmoke3D,
  V3,
  WeiBannerProp,
  XichengInstance,
  ZhugeActor,
} from './zhuge/World';
import {
  EndingScrollCard,
  ForceRatioStamp,
  GuqinNotesOverlay,
  ImpactSlamOverlay,
  OpeningTitleCard,
  OrderChecklistCard,
  ThoughtCallout,
  VictoryZeroStamp,
} from './zhuge/insertsZhuge';
import {
  ZhugeTiming,
  clamp01,
  easeInOut,
  easeOut,
  findWordFrame,
  lerp,
  voiceAmp,
} from './zhuge/timing';

const SCENE_BADGES: Record<string, string> = {
  s01_kabar: '01 / KABAR MENGERIKAN DI XICHENG',
  s02_panik: '02 / KEPANIKAN MASSAL DI DALAM KOTA',
  s03_perintah: '03 / PERINTAH GILA ZHUGE LIANG',
  s04_gerbang: '04 / GERBANG DIBUKA & JALAN DISAPU',
  s05_simayi: '05 / 150.000 PASUKAN SIMA YI TIBA!',
  s06_guqin: '06 / ALUNAN KECAPI GUQIN DI MENARA',
  s07_debat: '07 / DEBAT PANAS SIMA YI vs SIMA ZHAO',
  s08_mundur: '08 / PERINTAH MUNDUR 150.000 TENTARA!',
  s09_lega: '09 / TAWA LEGA DI ATAS MENARA',
  s10_penutup: '10 / STRATEGI KOTA KOSONG',
};

const lerpV3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const ZhugeScene: React.FC<{
  timing: ZhugeTiming;
  scene: string;
  model: THREE.Group;
}> = ({ timing, scene, model }) => {
  const f = useCurrentFrame();
  const dur = timing.scenes[scene]?.durationInFrames ?? 180;
  const p = clamp01(f / Math.max(1, dur));

  // Real-time lip-sync amplitudes for all speakers
  const ampZhuge = voiceAmp(timing, scene, 'zhuge', f);
  const ampSimayi = voiceAmp(timing, scene, 'simayi', f);
  const ampSimazhao = voiceAmp(timing, scene, 'simazhao', f);
  const ampPengintai = voiceAmp(timing, scene, 'pengintai', f);
  const ampPerwira = voiceAmp(timing, scene, 'perwira', f);
  const ampPenyapu = voiceAmp(timing, scene, 'penyapu', f);
  const ampCrowdPanic = voiceAmp(timing, scene, 'crowd_panic', f);
  const ampCrowdWei = voiceAmp(timing, scene, 'crowd_wei', f);
  const ampCrowdRetreat = voiceAmp(timing, scene, 'crowd_retreat', f);

  // Key story beat frames per scene
  const lines = timing.lines[scene] ?? [];
  const line0Start = lines[0]?.from ?? 15;
  const line1Start = lines[1]?.from ?? Math.round(dur * 0.4);
  const line2Start = lines[2]?.from ?? Math.round(dur * 0.68);

  // Camera + world defaults
  let camPos: V3 = [0, 3.0, 12.0];
  let camLook: V3 = [0, 2.2, 0];
  let fov = 48;
  let gateOpen = 0;
  let bannersDown = 0;
  let skyTop = '#3d4d68';
  let skyHor = '#e8a468';
  let skyBot = '#8c6d52';
  let shake = 0;

  // ==================== CAMERA & WORLD CHOREOGRAPHY PER SCENE ====================
  if (scene === 's01_kabar') {
    // Dramatic opening: outside dusk fortress -> push into Xicheng Command Hall as Pengintai sprints in!
    if (f < line1Start - 8) {
      const t = easeInOut(f / Math.max(1, line1Start - 8));
      camPos = lerpV3([-5.5, 6.2, 22.0], [0.3, 3.2, 11.5], t);
      camLook = lerpV3([0, 4.2, 0], [0, 2.8, 0], t);
      fov = 50;
    } else {
      const t = easeOut((f - (line1Start - 8)) / Math.max(1, dur - (line1Start - 8)));
      camPos = lerpV3([0.3, 2.6, -12.8], [-0.15, 2.45, -14.4], t);
      camLook = lerpV3([-0.25, 1.85, -19.8], [-0.35, 1.9, -20.2], t);
      fov = 48;
      if (f >= line1Start && f < line1Start + 25) shake = 0.04;
    }
    gateOpen = 0;
    bannersDown = 0;
  } else if (scene === 's02_panik') {
    // Part 1: Panicked citizens & Shu soldiers running in Xicheng Street -> Part 2: Snap to trembling Perwira
    if (f < line1Start - 6) {
      const t = easeInOut(f / Math.max(1, line1Start - 6));
      camPos = lerpV3([-1.8, 2.7, -6.2], [1.4, 2.6, -8.4], t);
      camLook = lerpV3([0, 1.85, -14.2], [0, 1.85, -15.5], t);
      fov = 50;
      shake = 0.035;
    } else {
      const t = easeOut((f - (line1Start - 6)) / Math.max(1, dur - (line1Start - 6)));
      camPos = lerpV3([0.85, 2.4, -14.4], [0.55, 2.3, -15.8], t);
      camLook = lerpV3([0.6, 1.95, -20.2], [0.4, 2.0, -20.6], t);
      fov = 45;
    }
    gateOpen = 0;
    bannersDown = 0;
  } else if (scene === 's03_perintah') {
    // Calm authoritative push-in on Zhuge -> reverse to shocked Perwira -> heroic low angle on Zhuge's 4 orders
    if (f < line1Start - 5) {
      const t = easeOut(f / Math.max(1, line1Start - 5));
      camPos = lerpV3([-0.4, 2.45, -14.6], [-0.15, 2.35, -16.4], t);
      camLook = [0.05, 1.98, -21.2];
      fov = 45;
    } else if (f < line2Start - 5) {
      const t = easeOut((f - line1Start) / Math.max(1, line2Start - line1Start));
      camPos = lerpV3([0.45, 2.35, -14.8], [0.9, 2.3, -16.2], t);
      camLook = [1.15, 1.95, -19.5];
      fov = 44;
    } else {
      const t = easeInOut((f - line2Start) / Math.max(1, dur - line2Start));
      camPos = lerpV3([-0.7, 2.15, -15.2], [0.25, 2.1, -16.8], t);
      camLook = [0.05, 2.02, -21.2];
      fov = 44;
    }
    gateOpen = 0;
    bannersDown = 0;
  } else if (scene === 's04_gerbang') {
    // Banners visibly lower & massive Gate_Left + Gate_Right creak WIDE OPEN!
    bannersDown = easeInOut(f / 34);
    gateOpen = easeInOut((f - 6) / 48);
    if (f < line1Start - 6) {
      // Wide dramatic exterior shot showing gate opening & sweepers stepping out!
      const t = easeInOut(f / Math.max(1, line1Start - 6));
      camPos = lerpV3([2.6, 3.9, 17.8], [1.4, 3.2, 14.5], t);
      camLook = lerpV3([0, 3.5, 1.0], [-0.2, 2.3, 3.5], t);
      fov = 50;
    } else {
      // Tilt up smoothly to show Zhuge Liang calmly reassuring from the glowing Gate Tower balcony!
      const t = easeInOut((f - (line1Start - 6)) / Math.max(1, dur - (line1Start - 6)));
      camPos = lerpV3([1.4, 3.6, 15.2], [0.9, 5.2, 11.2], t);
      camLook = lerpV3([0, 3.8, 1.0], [0, 5.8, 0.8], t);
      fov = 48;
    }
  } else if (scene === 's05_simayi') {
    // 150,000 Wei Army surges forward with camera shake -> HARD FREEZE on Sima Yi's "BERHENTI!!"
    gateOpen = 1;
    bannersDown = 1;
    const stopF = findWordFrame(timing, scene, 'berhenti', line2Start);
    const stopped = f >= stopF;
    if (!stopped) {
      const t = easeOut(f / Math.max(1, stopF));
      camPos = lerpV3([1.2, 2.9, 10.6], [0.35, 2.45, 8.6], t);
      camLook = lerpV3([0.2, 1.85, 17.5], [0.25, 1.85, 15.5], t);
      fov = 48;
      shake = 0.065 * (1 - t * 0.25);
    } else {
      // Sharp punch-in on Sima Yi raising his hand to halt 150,000 troops!
      const t = easeOut((f - stopF) / 24);
      camPos = lerpV3([0.2, 2.4, 8.8], [-0.35, 2.25, 10.8], t);
      camLook = [-0.5, 1.88, 14.2];
      fov = 42;
      if (f - stopF < 10) shake = 0.09 * (1 - (f - stopF) / 10);
    }
  } else if (scene === 's06_guqin') {
    // Hypnotic crane-up during 2.6s pure Guqin solo -> intimate close-up on serene Zhuge -> cut to stunned Sima Yi!
    gateOpen = 1;
    bannersDown = 1;
    skyTop = '#2f3d56';
    skyHor = '#de8f54';
    if (f < line0Start + 45) {
      const t = easeInOut(f / Math.max(1, line0Start + 45));
      camPos = lerpV3([1.8, 4.6, 12.2], [0.45, 7.22, 4.25], t);
      camLook = lerpV3([0, 4.4, 0.8], [0, 6.45, 0.75], t);
      fov = lerp(49, 41, t);
    } else {
      const t = easeOut((f - (line0Start + 45)) / Math.max(1, dur - (line0Start + 45)));
      camPos = lerpV3([0.25, 2.3, 10.2], [-0.2, 2.2, 11.2], t);
      camLook = [-0.45, 1.9, 14.4];
      fov = 42;
    }
  } else if (scene === 's07_debat') {
    // Crisp shot-reverse-shot: Sima Zhao eager arguing -> Sima Yi scolding sharply with sweat & fear
    gateOpen = 1;
    bannersDown = 1;
    skyTop = '#303b52';
    skyHor = '#d9864d';
    if (f < line1Start - 4) {
      const t = easeOut(f / Math.max(1, line1Start - 4));
      camPos = lerpV3([-0.2, 2.4, 9.4], [0.65, 2.35, 10.6], t);
      camLook = [0.9, 1.88, 14.8];
      fov = 44;
    } else {
      const t = easeOut((f - line1Start) / Math.max(1, dur - line1Start));
      camPos = lerpV3([0.45, 2.35, 9.5], [-0.45, 2.25, 10.8], t);
      camLook = [-0.45, 1.9, 14.3];
      fov = 43;
      if (f >= line1Start && f < line1Start + 18) shake = 0.035;
    }
  } else if (scene === 's08_mundur') {
    // Sima Yi screams retreat -> wide shot of 150,000 Wei army turning around & retreating into golden dust!
    gateOpen = 1;
    bannersDown = 1;
    skyTop = '#384359';
    skyHor = '#e09152';
    if (f < line1Start - 4) {
      const t = easeOut(f / Math.max(1, line1Start - 4));
      camPos = lerpV3([-0.7, 2.2, 10.2], [-0.5, 2.15, 11.2], t);
      camLook = [-0.45, 1.9, 14.2];
      fov = 44;
      shake = 0.055;
    } else {
      const t = easeInOut((f - line1Start) / Math.max(1, dur - line1Start));
      camPos = lerpV3([-1.4, 3.2, 8.8], [-2.8, 4.4, 11.2], t);
      camLook = lerpV3([0.2, 1.85, 16.5], [0.4, 1.85, 21.5], t);
      fov = 50;
      shake = 0.04 * (1 - t);
    }
  } else if (scene === 's09_lega') {
    // Up on the glowing Gate Tower balcony: Perwira runs up amazed -> Zhuge Liang laughs warmly!
    gateOpen = 1;
    bannersDown = 1;
    skyTop = '#3c4c6b';
    skyHor = '#f0a663';
    if (f < line1Start - 6) {
      const t = easeOut(f / Math.max(1, line1Start - 6));
      camPos = lerpV3([1.8, 7.2, 5.2], [1.1, 7.15, 4.6], t);
      camLook = [0.6, 6.45, 0.7];
      fov = 44;
    } else {
      const t = easeOut((f - line1Start) / Math.max(1, dur - line1Start));
      camPos = lerpV3([0.7, 7.22, 4.6], [0.15, 7.18, 3.85], t);
      camLook = [0.0, 6.48, 0.7];
      fov = 42;
    }
  } else {
    // s10_penutup: Grand sunset crane pull-back revealing the majestic Xicheng Fortress & calm Zhuge atop!
    gateOpen = 1;
    bannersDown = 1;
    skyTop = '#2d3a58';
    skyHor = '#f29f58';
    skyBot = '#8a6144';
    const t = easeInOut(p);
    camPos = lerpV3([0.8, 7.1, 5.8], [-5.2, 8.4, 24.5], t);
    camLook = lerpV3([0, 6.4, 0.8], [0, 4.4, 0.0], t);
    fov = lerp(44, 52, t);
  }

  // Apply subtle deterministic camera shake on dramatic beats
  const finalCam: V3 = shake > 0
    ? [
        camPos[0] + Math.sin(f * 2.1) * shake,
        camPos[1] + Math.cos(f * 2.7) * shake * 0.7,
        camPos[2],
      ]
    : camPos;

  // Dynamic troop motion for s05_simayi (charge -> freeze) and s08_mundur (turn -> retreat!)
  const stopF5 = scene === 's05_simayi' ? findWordFrame(timing, scene, 'berhenti', line2Start) : 0;
  const weiAdvance = scene === 's05_simayi' ? lerp(4.8, 0.0, easeOut(Math.min(f, stopF5) / Math.max(1, stopF5))) : 0;
  const weiWalking5 = scene === 's05_simayi' && f < stopF5;

  const retreatStart8 = scene === 's08_mundur' ? Math.max(12, line1Start - 8) : 9999;
  const weiRetreat = scene === 's08_mundur' && f >= retreatStart8
    ? lerp(0.0, 11.5, easeInOut((f - retreatStart8) / Math.max(1, dur - retreatStart8)))
    : 0;
  const weiRetreating8 = scene === 's08_mundur' && f >= retreatStart8;

  // Scene-specific timing frames for kinetic inserts
  const tOrder1 = scene === 's03_perintah' ? findWordFrame(timing, scene, 'panji', line2Start) : 9999;
  const tOrder2 = scene === 's03_perintah' ? findWordFrame(timing, scene, 'bersembunyi', line2Start + 45) : 9999;
  const tOrder3 = scene === 's03_perintah' ? findWordFrame(timing, scene, 'gerbang', line2Start + 90) : 9999;
  const tOrder4 = scene === 's03_perintah' ? findWordFrame(timing, scene, 'menyamar', line2Start + 135) : 9999;

  return (
    <AbsoluteFill style={{ background: '#261e1a' }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows="basic"
        camera={{ position: finalCam, fov, near: 0.1, far: 260 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      >
        <CameraRig position={finalCam} lookAt={camLook} fov={fov} />
        <ToonSky top={skyTop} horizon={skyHor} bottom={skyBot} r={220} />
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
        <pointLight position={[0, 8.2, 2.4]} intensity={24} distance={15} decay={1.4} color="#ff9944" />
        <pointLight position={[0, 3.6, -21.0]} intensity={20} distance={15} decay={1.4} color="#ffb96e" />

        <XichengInstance source={model} gateOpen={gateOpen} bannersDown={bannersDown} />

        {/* === SCENE 1: KABAR MENGERIKAN (Exterior -> Pengintai runs into Hall!) === */}
        {scene === 's01_kabar' && (
          <>
            <DustClouds3D f={f} zCenter={26} density={1.1} />
            <ZhugeActor
              role="zhuge"
              at={[0.05, 0.55, -21.2]}
              cam={finalCam}
              f={f}
              h={2.05}
              expr="calm"
              fan
              armR={[28 + Math.sin(f * 0.08) * 6, 28]}
              seed={1}
            />
            <ZhugeActor
              role="pengintai"
              at={[
                lerp(-1.9, -1.05, easeOut((f - (line1Start - 16)) / 24)),
                0.55,
                lerp(-15.5, -19.2, easeOut((f - (line1Start - 16)) / 24)),
              ]}
              cam={finalCam}
              f={f}
              h={1.92}
              expr="panic"
              mouthOpen={ampPengintai}
              walkAmp={f >= line1Start - 16 && f < line1Start + 8 ? 1.05 : 0}
              walkSpeed={0.45}
              armL={[50 + Math.sin(f * 0.35) * 14, 34]}
              armR={[54 + Math.cos(f * 0.35) * 14, 38]}
              sweat
              seed={2}
            />
            <ZhugeActor
              role="perwira"
              at={[1.22, 0.55, -19.5]}
              cam={finalCam}
              f={f}
              h={1.98}
              expr="shock"
              armL={[26, 18]}
              armR={[38, 28]}
              sweat={f > line1Start + 35}
              seed={3}
            />
          </>
        )}

        {/* === SCENE 2: KEPANIKAN MASSAL (Street crowd panicking + Perwira pleading!) === */}
        {scene === 's02_panik' && (
          <>
            {/* 6 panicked citizens & Shu soldiers running around Xicheng Main Street! */}
            {[
              { role: 'warga' as const, x0: -1.8, z0: -12.8, dx: 1.4, sd: 10 },
              { role: 'warga' as const, x0: 1.5, z0: -13.6, dx: -1.6, sd: 11 },
              { role: 'pengintai' as const, x0: -0.3, z0: -14.8, dx: 0.9, sd: 12 },
              { role: 'warga' as const, x0: 0.6, z0: -11.5, dx: -1.1, sd: 13 },
              { role: 'perwira' as const, x0: -1.3, z0: -16.0, dx: 0.7, sd: 14 },
              { role: 'warga' as const, x0: 1.9, z0: -15.4, dx: -1.2, sd: 15 },
            ].map((c, idx) => (
              <ZhugeActor
                key={idx}
                role={c.role}
                at={[c.x0 + Math.sin(f * 0.08 + idx) * c.dx, 0.1, c.z0]}
                cam={finalCam}
                f={f}
                h={1.9}
                variant={idx}
                expr="panic"
                mouthOpen={ampCrowdPanic}
                walkAmp={0.95}
                walkSpeed={0.38}
                armL={[56 + Math.sin(f * 0.4 + idx) * 16, 40]}
                armR={[58 + Math.cos(f * 0.4 + idx) * 16, 40]}
                sweat
                seed={c.sd}
              />
            ))}
            {/* Inside Command Hall: Perwira pleading & Zhuge listening calmly */}
            <ZhugeActor role="zhuge" at={[-0.45, 0.55, -21.2]} cam={finalCam} f={f} h={2.05} expr="calm" fan seed={1} />
            <ZhugeActor
              role="perwira"
              at={[0.78, 0.55, -19.6]}
              cam={finalCam}
              f={f}
              h={1.98}
              expr="panic"
              mouthOpen={ampPerwira}
              armL={[48 + ampPerwira * 16, 32]}
              armR={[54 + ampPerwira * 18, 36]}
              sweat
              seed={3}
            />
          </>
        )}

        {/* === SCENE 3: PERINTAH GILA ZHUGE LIANG === */}
        {scene === 's03_perintah' && (
          <>
            <ZhugeActor
              role="zhuge"
              at={[0.05, 0.55, -21.2]}
              cam={finalCam}
              f={f}
              h={2.05}
              expr={f >= line2Start ? 'command' : 'calm'}
              mouthOpen={ampZhuge}
              fan
              armL={[16, -6]}
              armR={[30 + ampZhuge * 18, 32 + Math.sin(f * 0.14) * 8]}
              seed={1}
            />
            <ZhugeActor
              role="pengintai"
              at={[-1.18, 0.55, -19.2]}
              cam={finalCam}
              f={f}
              h={1.92}
              expr="shock"
              sweat
              seed={2}
            />
            <ZhugeActor
              role="perwira"
              at={[1.18, 0.55, -19.5]}
              cam={finalCam}
              f={f}
              h={1.98}
              expr="shock"
              mouthOpen={ampPerwira}
              armL={[32 + ampPerwira * 18, 22]}
              armR={[44 + ampPerwira * 20, 34]}
              sweat
              seed={3}
            />
          </>
        )}

        {/* === SCENE 4: GERBANG DIBUKA LEBAR & JALAN DISAPU === */}
        {scene === 's04_gerbang' && (
          <>
            {/* Zhuge Liang calmly watching from atop Gate Tower with 2 child attendants */}
            <ZhugeActor
              role="zhuge"
              at={[0.0, 5.59, 0.68]}
              cam={finalCam}
              f={f}
              h={2.05}
              expr="calm"
              mouthOpen={ampZhuge}
              fan
              armR={[30 + ampZhuge * 16, 28]}
              seed={1}
            />
            <ZhugeActor role="pelayan" at={[-1.45, 5.59, 0.55]} cam={finalCam} f={f} h={1.65} expr="calm" seed={11} />
            <ZhugeActor role="pelayan" at={[1.45, 5.59, 0.55]} cam={finalCam} f={f} h={1.65} expr="calm" seed={12} />
            <IncenseSmoke3D at={[0.72, 6.65, 1.22]} f={f} />

            {/* 3 Disguised Elderly Sweepers casually sweeping stone causeway outside open gate */}
            <ZhugeActor
              role="penyapu"
              at={[-1.25 + Math.sin(f * 0.05) * 0.25, 0.1, lerp(1.5, 4.4, easeOut((f - 18) / 42))]}
              cam={finalCam}
              f={f}
              h={1.88}
              expr={ampPenyapu > 0.1 ? 'panic' : 'neutral'}
              mouthOpen={ampPenyapu}
              walkAmp={f > 18 && f < 60 ? 0.65 : 0}
              broom
              armR={[30 + Math.sin(f * 0.14) * 14, 14]}
              sweat={ampPenyapu > 0.05}
              seed={21}
            />
            <ZhugeActor
              role="penyapu"
              at={[1.15 - Math.sin(f * 0.05 + 1) * 0.25, 0.1, lerp(1.8, 5.2, easeOut((f - 22) / 44))]}
              cam={finalCam}
              f={f}
              h={1.88}
              expr="neutral"
              walkAmp={f > 22 && f < 66 ? 0.65 : 0}
              broom
              armR={[30 + Math.sin(f * 0.14 + 1.5) * 14, 14]}
              seed={22}
            />
            <ZhugeActor
              role="penyapu"
              at={[-0.08 + Math.sin(f * 0.045 + 2) * 0.2, 0.1, lerp(2.2, 6.8, easeOut((f - 24) / 46))]}
              cam={finalCam}
              f={f}
              h={1.86}
              expr="neutral"
              walkAmp={f > 24 && f < 70 ? 0.65 : 0}
              broom
              armR={[30 + Math.sin(f * 0.14 + 3.0) * 14, 14]}
              seed={23}
            />
          </>
        )}

        {/* === SCENES 5, 6, 7, 8: EXTERIOR BATTLEFIELD + TOWER GUQIN === */}
        {(scene === 's05_simayi' || scene === 's06_guqin' || scene === 's07_debat' || scene === 's08_mundur') && (
          <>
            {/* Zhuge Liang seated calmly playing Guqin atop the illuminated Gate Tower */}
            <ZhugeActor
              role="zhuge"
              at={[0.0, 5.55, 0.65]}
              cam={finalCam}
              f={f}
              h={2.05}
              expr="smile"
              sitting
              armL={[-16 + Math.sin(f * 0.16) * 7, -12 + Math.cos(f * 0.16) * 6]}
              armR={[-16 - Math.sin(f * 0.18 + 0.8) * 7, -12 + Math.sin(f * 0.18) * 6]}
              seed={1}
            />
            <ZhugeActor role="pelayan" at={[-1.45, 5.59, 0.55]} cam={finalCam} f={f} h={1.65} expr="calm" seed={11} />
            <ZhugeActor role="pelayan" at={[1.45, 5.59, 0.55]} cam={finalCam} f={f} h={1.65} expr="calm" seed={12} />
            <IncenseSmoke3D at={[0.72, 6.65, 1.22]} f={f} />

            {/* Calm elderly sweepers still sweeping near the open gate */}
            <ZhugeActor role="penyapu" at={[-1.3, 0.1, 4.4]} cam={finalCam} f={f} h={1.88} expr="neutral" broom armR={[30 + Math.sin(f * 0.12) * 12, 14]} seed={21} />
            <ZhugeActor role="penyapu" at={[1.2, 0.1, 5.0]} cam={finalCam} f={f} h={1.88} expr="neutral" broom armR={[30 + Math.sin(f * 0.12 + 2) * 12, 14]} seed={22} />

            {/* Sima Yi (General) */}
            <ZhugeActor
              role="simayi"
              at={[-0.52, 0.1, 14.2 + weiAdvance + weiRetreat]}
              cam={finalCam}
              f={f}
              h={2.06}
              expr={
                scene === 's08_mundur'
                  ? 'panic'
                  : scene === 's07_debat' && ampSimayi > 0.05
                    ? 'angry'
                    : 'suspicious'
              }
              mouthOpen={ampSimayi}
              walkAmp={weiWalking5 || weiRetreating8 ? 0.95 : 0}
              walkSpeed={0.38}
              fixedYaw={weiRetreating8 ? Math.PI * 0.24 : undefined}
              armL={[24, 14]}
              armR={
                scene === 's05_simayi' && f >= stopF5
                  ? [74, 46]
                  : scene === 's08_mundur'
                    ? [68 + Math.sin(f * 0.3) * 10, 44]
                    : [36 + ampSimayi * 24, 24 + ampSimayi * 16]
              }
              sweat={scene === 's07_debat' || scene === 's08_mundur'}
              seed={31}
            />

            {/* Sima Zhao (Son) */}
            <ZhugeActor
              role="simazhao"
              at={[1.02, 0.1, 14.8 + weiAdvance + weiRetreat]}
              cam={finalCam}
              f={f}
              h={2.0}
              expr={scene === 's08_mundur' ? 'shock' : 'eager'}
              mouthOpen={ampSimazhao}
              walkAmp={weiWalking5 || weiRetreating8 ? 0.95 : 0}
              walkSpeed={0.38}
              fixedYaw={weiRetreating8 ? -Math.PI * 0.24 : undefined}
              armL={[20, 10]}
              armR={[44 + ampSimazhao * 22, 30 + ampSimazhao * 14]}
              seed={32}
            />

            {/* 16 Armored Wei Soldiers + Spears + 6 Waving Crimson War Banners! */}
            {Array.from({ length: 16 }, (_, k) => {
              const col = (k % 8) - 3.5;
              const row = Math.floor(k / 8);
              return (
                <ZhugeActor
                  key={k}
                  role="wei_soldier"
                  at={[
                    col * 1.45 + (row % 2) * 0.55,
                    0.1,
                    17.8 + row * 2.2 + weiAdvance + weiRetreat,
                  ]}
                  cam={finalCam}
                  f={f}
                  h={1.94}
                  expr={weiRetreating8 ? 'panic' : 'angry'}
                  mouthOpen={scene === 's05_simayi' ? ampCrowdWei : scene === 's08_mundur' ? ampCrowdRetreat : 0}
                  walkAmp={weiWalking5 || weiRetreating8 ? 0.95 : 0}
                  walkSpeed={0.36}
                  fixedYaw={weiRetreating8 ? (k % 2 === 0 ? Math.PI * 0.24 : -Math.PI * 0.24) : undefined}
                  spear
                  seed={50 + k}
                />
              );
            })}
            {[
              [-3.1, 17.6], [3.1, 17.6],
              [-1.4, 20.4], [1.9, 20.6],
              [-4.4, 21.8], [4.2, 22.0],
            ].map(([bx, bz], i) => (
              <WeiBannerProp key={i} at={[bx, 0.1, bz + weiAdvance + weiRetreat]} f={f} seed={i + 1} />
            ))}
            <DustClouds3D
              f={f}
              zCenter={24 + weiAdvance * 0.5 + weiRetreat * 0.8}
              density={scene === 's06_guqin' ? 0.45 : 1.05}
            />
          </>
        )}

        {/* === SCENES 9 & 10: VICTORY LAUGH & GRAND SUNSET FINALE === */}
        {(scene === 's09_lega' || scene === 's10_penutup') && (
          <>
            <ZhugeActor
              role="zhuge"
              at={[0.0, 5.55, 0.65]}
              cam={finalCam}
              f={f}
              h={2.05}
              expr={scene === 's09_lega' ? 'relieved' : 'smile'}
              mouthOpen={ampZhuge}
              sitting={scene === 's10_penutup'}
              fan={scene === 's09_lega'}
              armL={scene === 's10_penutup' ? [-16, -12] : [18, -6]}
              armR={scene === 's10_penutup' ? [-16, -12] : [32 + ampZhuge * 16, 30]}
              headTilt={scene === 's09_lega' && ampZhuge > 0.2 ? Math.sin(f * 0.55) * 4.5 : 0}
              seed={1}
            />
            <ZhugeActor role="pelayan" at={[-1.45, 5.59, 0.55]} cam={finalCam} f={f} h={1.65} expr="smile" seed={11} />
            {scene === 's09_lega' ? (
              <ZhugeActor
                role="perwira"
                at={[lerp(2.6, 1.35, easeOut(f / 26)), 5.59, 0.55]}
                cam={finalCam}
                f={f}
                h={1.95}
                expr="shock"
                mouthOpen={ampPerwira}
                walkAmp={f < 26 ? 0.9 : 0}
                armL={[32 + ampPerwira * 18, 22]}
                armR={[44 + ampPerwira * 20, 32]}
                seed={3}
              />
            ) : (
              <ZhugeActor role="pelayan" at={[1.45, 5.59, 0.55]} cam={finalCam} f={f} h={1.65} expr="calm" seed={12} />
            )}
            <IncenseSmoke3D at={[0.72, 6.65, 1.22]} f={f} />
          </>
        )}
      </ThreeCanvas>

      {/* Top scene chapter pill (clean, consistent anchor) */}
      <div
        style={{
          position: 'absolute',
          top: 66,
          left: 52,
          right: 52,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            color: '#2c221b',
            background: 'rgba(249, 238, 217, 0.90)',
            padding: '11px 24px',
            borderRadius: 14,
            border: '2px solid #ad905e',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            fontSize: 25,
            letterSpacing: 0.8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.34)',
          }}
        >
          {SCENE_BADGES[scene] ?? scene}
        </div>
      </div>

      {/* === VARIED CINEMATIC KINETIC TYPOGRAPHY INSERTS PER SCENE === */}
      {scene === 's01_kabar' && <OpeningTitleCard f={f} />}
      {scene === 's02_panik' && <ForceRatioStamp f={f} start={10} end={Math.min(dur - 20, 175)} />}
      {scene === 's03_perintah' && (
        <OrderChecklistCard f={f} t1={tOrder1} t2={tOrder2} t3={tOrder3} t4={tOrder4} />
      )}
      {scene === 's04_gerbang' && (
        <ImpactSlamOverlay
          f={f}
          at={14}
          dur={58}
          text="GERBANG DIBUKA!"
          sub="PANJI DITURUNKAN • JALANAN DISAPU"
          bg="rgba(42, 62, 79, 0.92)"
          color="#ffeaad"
          tilt={-2}
        />
      )}
      {scene === 's05_simayi' && (
        <ImpactSlamOverlay
          f={f}
          at={stopF5}
          dur={52}
          text="BERHENTI!!"
          sub="150.000 PASUKAN MENDADAK HENING"
          bg="rgba(145, 22, 22, 0.95)"
          color="#ffe37a"
          tilt={-3.5}
        />
      )}
      {scene === 's06_guqin' && (
        <>
          <GuqinNotesOverlay f={f} maxF={line0Start + 48} />
          <ThoughtCallout
            f={f}
            at={line0Start + 52}
            dur={Math.max(60, dur - (line0Start + 60))}
            text="Mustahil... nadanya tidak bergetar sedikit pun!"
          />
        </>
      )}
      {scene === 's07_debat' && (
        <ThoughtCallout
          f={f}
          at={line1Start + 24}
          dur={Math.max(65, dur - (line1Start + 34))}
          text="Zhuge Liang terlalu hati-hati... pasti ada jebakan!"
        />
      )}
      {scene === 's08_mundur' && (
        <ImpactSlamOverlay
          f={f}
          at={findWordFrame(timing, scene, 'mundur', line0Start + 35)}
          dur={64}
          text="MUNDUR!!"
          sub="150.000 TENTARA DITARIK TANPA BERTARUNG"
          bg="rgba(148, 24, 24, 0.94)"
          color="#ffe680"
          tilt={2.5}
        />
      )}
      {scene === 's09_lega' && <VictoryZeroStamp f={f} at={12} end={Math.min(dur - 15, 160)} />}
      {scene === 's10_penutup' && (
        <>
          <VictoryZeroStamp f={f} at={8} end={Math.max(60, dur - 115)} />
          <EndingScrollCard f={f} start={Math.max(60, dur - 110)} />
        </>
      )}
    </AbsoluteFill>
  );
};

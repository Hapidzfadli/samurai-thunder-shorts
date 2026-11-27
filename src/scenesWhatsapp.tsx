import React from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import T from './whatsapp_timing.json';
import {
  DynamicCamera,
  easeInOutQuad,
  easeOutCubic,
  evalSpline,
  lerp3,
  smoothstep,
} from './whatsapp/camera';
import {
  BoardroomOfferPlane,
  CoffeeCup3D,
  CouponEnvelope3D,
  GroceryBag3D,
  OfficeDisplayPlane,
  PaperFolder3D,
  Pen3D,
  QueueLedPlane,
  Smartphone3D,
  StickyNote3D,
  useWaGlb,
  WaCharSprite,
  WaGlbInstance,
  WaSkyDome,
  WaStudioEnv,
  WelfareSignPlane,
} from './whatsapp/props3d';
import {
  InsertAcquisitionDeal,
  InsertNoAdsSticky,
  InsertRejectionPhone,
} from './whatsapp/inserts2d';
import { waHandWorld, WaArmPose, WaExpr } from './whatsapp/rig2d';

type TimingLine = {
  voice: string;
  style: string;
  text: string;
  from: number;
  to: number;
  words: { w: string; from: number; to: number }[];
};

const LINES = T.lines as Record<string, TimingLine[]>;
const EV = T.events as Record<string, number>;

/** Real-time smooth mouth openness (0..1) driven by aligned word timestamps */
function talkFor(scene: string, localFrame: number, lineIndices: number[]): number {
  const arr = LINES[scene] || [];
  for (const idx of lineIndices) {
    const ln = arr[idx];
    if (!ln || localFrame < ln.from || localFrame > ln.to) continue;
    for (const w of ln.words) {
      if (localFrame >= w.from && localFrame <= w.to) {
        const dur = Math.max(2, w.to - w.from);
        const u = (localFrame - w.from) / dur;
        return Math.max(
          0.15,
          Math.min(1, Math.sin(u * Math.PI) * 0.65 + 0.35 * Math.abs(Math.sin(localFrame * 0.95))),
        );
      }
    }
    return 0.08;
  }
  return 0;
}

const Stage3D: React.FC<{
  bg: string;
  model: unknown;
  children: React.ReactNode;
}> = ({ bg, model, children }) => {
  const { width, height } = useVideoConfig();
  if (!model) return null;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={0.68}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.06,
      }}
      shadows="basic"
      style={{ position: 'absolute', inset: 0, background: bg }}
      camera={{ fov: 54, near: 0.1, far: 160 }}
    >
      {children}
    </ThreeCanvas>
  );
};

// ==================== CINEMATIC 3-POINT ARCHITECTURAL LIGHTING RIGS ====================
const GoldenExteriorLights: React.FC = () => (
  <>
    <WaSkyDome mode="golden" />
    <WaStudioEnv mode="golden" />
    <fog attach="fog" args={['#e8b382', 26, 78]} />
    <ambientLight intensity={0.26} color="#ffe8d0" />
    <hemisphereLight args={['#9bc2f0', '#5a4332', 0.58]} />
    <directionalLight
      position={[16, 17, 18]}
      intensity={2.35}
      color="#ffd296"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-18}
      shadow-camera-right={18}
      shadow-camera-top={18}
      shadow-camera-bottom={-14}
      shadow-camera-near={2}
      shadow-camera-far={65}
      shadow-bias={-0.0005}
    />
    <directionalLight position={[-12, 8, -8]} intensity={0.45} color="#7aa8e8" />
  </>
);

const MorningLobbyLights: React.FC = () => (
  <>
    <WaSkyDome mode="morning" />
    <WaStudioEnv mode="morning" />
    <ambientLight intensity={0.30} color="#eef5ff" />
    <hemisphereLight args={['#d8ecff', '#7d776f', 0.62]} />
    <directionalLight
      position={[10, 14, 14]}
      intensity={1.65}
      color="#fff5e6"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-14}
      shadow-camera-right={14}
      shadow-camera-top={14}
      shadow-camera-bottom={-10}
      shadow-bias={-0.0005}
    />
    <pointLight position={[0, 3.6, -1.2]} intensity={3.2} distance={14} decay={1.6} color="#fffaf2" />
    <pointLight position={[-3.2, 3.5, 1.5]} intensity={1.8} distance={10} decay={1.8} color="#eef6ff" />
  </>
);

const ModernOfficeLights: React.FC<{ cx?: number }> = ({ cx = 28 }) => (
  <>
    <WaStudioEnv mode="office" />
    <ambientLight intensity={0.32} color="#f0f5fc" />
    <hemisphereLight args={['#ffffff', '#8a745d', 0.58]} />
    <directionalLight
      position={[cx - 6, 10, 10]}
      intensity={1.55}
      color="#fffaf2"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-8}
      shadow-bias={-0.0005}
    />
    <pointLight position={[cx, 3.1, 0.2]} intensity={3.4} distance={14} decay={1.6} color="#fffef8" />
    <pointLight position={[cx + 3.2, 2.8, -1.8]} intensity={1.8} distance={10} decay={1.8} color="#dcfce7" />
  </>
);

const NightAptLights: React.FC<{ warmBoost?: number }> = ({ warmBoost = 1.0 }) => (
  <>
    <WaSkyDome mode="night" />
    <WaStudioEnv mode="night" />
    <ambientLight intensity={0.24} color="#7ea4dc" />
    <hemisphereLight args={['#5278b8', '#221c18', 0.42]} />
    <directionalLight
      position={[-3, 6, 5]}
      intensity={0.78 * warmBoost}
      color="#ffd7a0"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-8}
      shadow-camera-right={8}
      shadow-camera-top={8}
      shadow-camera-bottom={-6}
      shadow-bias={-0.0006}
    />
    <pointLight position={[-1.1, 1.55, -1.45]} intensity={3.8 * warmBoost} distance={8} decay={1.7} color="#ffc978" />
    <pointLight position={[0.05, 1.45, -1.15]} intensity={1.9} distance={6} decay={1.8} color="#45f0a2" />
    <pointLight position={[3.8, 2.1, -2.4]} intensity={2.4 * warmBoost} distance={10} decay={1.7} color="#ffcf8c" />
  </>
);

const BoardroomLights: React.FC<{ ex?: number }> = ({ ex = 56 }) => (
  <>
    <WaStudioEnv mode="boardroom" />
    <ambientLight intensity={0.24} color="#f5d9bc" />
    <hemisphereLight args={['#ffcf96', '#2a201b', 0.48]} />
    <directionalLight
      position={[ex + 6, 8, 7]}
      intensity={1.75}
      color="#ffc780"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-8}
      shadow-bias={-0.0005}
    />
    <pointLight position={[ex, 3.05, -0.8]} intensity={4.6} distance={13} decay={1.6} color="#ffd99e" />
    <pointLight position={[ex - 3.0, 2.2, 1.5]} intensity={1.4} distance={10} decay={1.8} color="#9bc0f0" />
  </>
);

// ============================================================================
// SCENE 1 — HOOK: Golden-Hour Aerial Drone Dive onto Social Services Building
// ============================================================================
export const SceneWaHook: React.FC = () => {
  const model = useWaGlb('models/wa_exterior_welfare.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.hook.durationInFrames;
  const t = f / fps;
  const p = easeInOutQuad(f / Math.max(1, dur - 1));

  const posPts: [number, number, number][] = [
    [-6.2, 8.8, 21.5],
    [-2.0, 5.2, 15.0],
    [1.8, 2.8, 11.4],
    [0.45, 1.82, 9.35],
  ];
  const lookPts: [number, number, number][] = [
    [0.0, 3.8, 4.0],
    [0.0, 2.9, 4.8],
    [0.0, 2.0, 5.6],
    [0.0, 1.32, 6.2],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  const janPos: [number, number, number] = [0.0, 0.14, 6.25];
  const janArm: WaArmPose = f > EV['hook.pintu'] ? 'hold_folder' : 'idle';
  const rHand = waHandWorld(janPos, 1.72, 1, janArm, 'right', t);

  return (
    <Stage3D model={model} bg="#e58e52">
      <GoldenExteriorLights />

      <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={55 - p * 3} drift={0.036} />
      <WaGlbInstance model={model} slidingDoorOpen={0} />
      <WelfareSignPlane />

      <WaCharSprite
        state={{
          id: 'jan',
          expr: f > EV['hook.kupon'] ? 'warm' : 'calm',
          arm: janArm,
          talk: 0,
          timeSec: t,
          facing: 1,
          gazeX: 0.1,
        }}
        position={janPos}
        height={1.72}
        camPos={camPos}
      />
      <PaperFolder3D
        position={[rHand[0] - 0.06, rHand[1] - 0.04, rHand[2] + 0.06]}
        rotation={[0.35, 0.2, 0.12]}
        color="#1e3a5f"
      />
    </Stage3D>
  );
};

// ============================================================================
// SCENE 2 — ANTREAN: Glass-Door Fly-Through into Modern Welfare Waiting Room
// ============================================================================
export const SceneWaAntrean: React.FC = () => {
  const model = useWaGlb('models/wa_exterior_welfare.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.antrean.durationInFrames;
  const t = f / fps;

  // Automatic sliding glass doors open smoothly as camera flies in!
  const doorOpen = smoothstep(8, 58, f);
  const p = Math.min(1, f / Math.max(1, dur - 1));

  // Continuous 6-point fly-through spline from outside plaza through glass doors into waiting room!
  const posPts: [number, number, number][] = [
    [0.50, 1.85, 8.6],
    [0.12, 1.72, 4.1],
    [0.15, 1.70, 2.35],
    [-0.95, 1.65, 1.75],
    [0.95, 1.68, 1.55],
    [0.18, 1.66, 1.65],
  ];
  const lookPts: [number, number, number][] = [
    [0.0, 1.65, 1.0],
    [0.0, 1.50, -2.5],
    [0.0, 1.38, -2.1],
    [0.02, 1.32, -2.0],
    [0.0, 1.35, -2.1],
    [0.0, 1.38, -2.2],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  // Jan & Ibu Faina walk forward smoothly in the queue (45..175f)
  const walkU = smoothstep(45, 175, f);
  const walking = f >= 45 && f <= 178 ? 1 : 0;
  const janPos = lerp3([-0.42, 0.25, 0.0], [-0.44, 0.25, -1.92], walkU);
  const fainaPos = lerp3([0.44, 0.25, 0.35], [0.44, 0.25, -1.85], walkU);
  const clerkPos: [number, number, number] = [0.02, 0.25, -4.05];

  const ibuTalk = talkFor('antrean', f, [2]);
  const ibuPat = f >= EV['antrean.ibu'] - 8 && f < EV['antrean.coding'] - 15;
  const receiveEnv = f >= EV['antrean.coding'] - 20;
  const envU = smoothstep(EV['antrean.coding'] - 18, EV['antrean.coding'] + 28, f);

  const fainaArm: WaArmPose = walking
    ? 'walk'
    : ibuPat
      ? 'offer_left'
      : receiveEnv
        ? 'offer_left'
        : 'hold_bags';
  const janArm: WaArmPose = walking ? 'walk' : f > EV['antrean.coding'] ? 'hold_folder' : 'idle';
  const clerkArm: WaArmPose = receiveEnv && envU < 0.7 ? 'offer_right' : 'idle';

  const bagHand = waHandWorld(fainaPos, 1.66, -1, fainaArm, 'left', t);
  const clerkHand = waHandWorld(clerkPos, 1.70, 1, clerkArm, 'right', t);
  const fainaRecHand = waHandWorld(fainaPos, 1.66, -1, fainaArm, 'right', t);
  const envPos = lerp3(
    [clerkHand[0], 1.44, -3.35],
    [fainaRecHand[0], fainaRecHand[1], fainaRecHand[2] + 0.08],
    envU,
  );

  return (
    <Stage3D model={model} bg="#c8e1f5">
      <MorningLobbyLights />

      <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={56} drift={0.028} />
      <WaGlbInstance model={model} slidingDoorOpen={doorOpen} />
      <WelfareSignPlane />
      <QueueLedPlane ticket="A-047" />

      <WaCharSprite
        state={{ id: 'clerk', expr: 'calm', arm: clerkArm, talk: 0, timeSec: t, facing: 1 }}
        position={clerkPos}
        height={1.70}
        camPos={camPos}
      />

      <WaCharSprite
        state={{
          id: 'jan',
          expr: ibuPat ? 'warm' : f > EV['antrean.coding'] ? 'serious' : 'tired',
          arm: janArm,
          talk: 0,
          timeSec: t,
          walkAmount: walking,
          walkPhase: f * 0.25,
          facing: 1,
          gazeX: ibuPat ? 0.5 : 0.0,
        }}
        position={janPos}
        height={1.68}
        camPos={camPos}
      />

      <WaCharSprite
        state={{
          id: 'faina',
          expr: ibuPat ? 'warm' : 'calm',
          arm: fainaArm,
          talk: ibuTalk,
          timeSec: t,
          walkAmount: walking,
          walkPhase: f * 0.25 + 1.4,
          facing: -1,
          gazeX: 0.4,
        }}
        position={fainaPos}
        height={1.64}
        camPos={camPos}
      />

      <GroceryBag3D position={[bagHand[0] + 0.08, Math.max(0.42, bagHand[1] - 0.14), bagHand[2] + 0.05]} />
      {receiveEnv && <CouponEnvelope3D position={envPos} rotation={[0.1, 0.2, 0]} />}
    </Stage3D>
  );
};

// ============================================================================
// SCENE 3 — DITOLAK: Modern Glass Tech HQ Interview Room (Facebook & Twitter)
// ============================================================================
export const SceneWaDitolak: React.FC = () => {
  const model = useWaGlb('models/wa_modern_spaces.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.ditolak.durationInFrames;
  const t = f / fps;
  const p = Math.min(1, f / Math.max(1, dur - 1));

  // Continuous parallax sweep across modern glass Tech HQ with clean 9:16 margins!
  const posPts: [number, number, number][] = [
    [26.4, 2.02, 4.65],
    [27.6, 1.82, 4.35],
    [29.4, 1.78, 4.30],
    [28.0, 1.76, 4.55],
  ];
  const lookPts: [number, number, number][] = [
    [28.0, 1.42, -0.85],
    [28.0, 1.38, -0.75],
    [28.0, 1.35, -0.55],
    [28.0, 1.40, -0.70],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  const hrTalk = talkFor('ditolak', f, [1]);
  const brianTalk = talkFor('ditolak', f, [3]);
  const rejectFrame = EV['ditolak.maaf'];
  const walkOutStart = EV['ditolak.santai'] - 25;
  const walkOutU = smoothstep(walkOutStart, walkOutStart + 95, f);
  const isWalking = f >= walkOutStart && f <= walkOutStart + 92 ? 1 : 0;

  const hrPos: [number, number, number] = [28.0, 0.0, -1.68];
  const janPos = lerp3([27.44, 0.0, 0.42], [27.60, 0.0, 0.78], walkOutU);
  const brianPos = lerp3([28.56, 0.0, 0.48], [28.72, 0.0, 0.84], walkOutU);

  const slideU = smoothstep(rejectFrame, rejectFrame + 40, f);
  const folderPos = lerp3([28.0, 0.84, -1.05], [27.58, 0.84, -0.25], slideU);

  const insertStart = EV['ditolak.mentah'] + 12;
  const showInsert = f >= insertStart && f < insertStart + 128;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage3D model={model} bg="#dce6f2">
        <ModernOfficeLights />

        <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={55} drift={0.030} />
        <WaGlbInstance model={model} />
        <OfficeDisplayPlane mode="interview" />

        <WaCharSprite
          state={{
            id: 'hr',
            expr: 'serious',
            arm: f >= rejectFrame && f < rejectFrame + 60 ? 'offer_right' : 'crossed',
            talk: hrTalk,
            timeSec: t,
            facing: 1,
          }}
          position={hrPos}
          height={1.68}
          camPos={camPos}
        />

        <WaCharSprite
          state={{
            id: 'jan',
            expr: f >= EV['ditolak.santai'] ? 'calm' : f >= rejectFrame ? 'sad' : 'serious',
            arm: isWalking ? 'walk' : 'idle',
            talk: 0,
            timeSec: t,
            walkAmount: isWalking,
            walkPhase: f * 0.24,
            facing: 1,
            lean: f >= rejectFrame && !isWalking ? 0.05 : 0,
            gazeX: f >= EV['ditolak.santai'] ? 0.6 : 0,
          }}
          position={janPos}
          height={1.70}
          camPos={camPos}
        />

        <WaCharSprite
          state={{
            id: 'brian',
            expr: f >= EV['ditolak.santai'] - 10 ? 'warm' : f >= rejectFrame ? 'tired' : 'calm',
            arm: isWalking ? 'walk' : f >= EV['ditolak.santai'] ? 'offer_left' : 'idle',
            talk: brianTalk,
            timeSec: t,
            walkAmount: isWalking,
            walkPhase: f * 0.24 + 1.2,
            facing: -1,
            gazeX: 0.5,
          }}
          position={brianPos}
          height={1.72}
          camPos={camPos}
        />

        <PaperFolder3D position={folderPos} rotation={[0, 0.18, 0]} color="#7f1d1d" scale={0.95} />
      </Stage3D>
      {showInsert && <InsertRejectionPhone localFrame={f - insertStart} fps={fps} />}
    </div>
  );
};

// ============================================================================
// SCENE 4 — IDE: Midnight Modern Programmer Apartment (Orbital 60° Dolly!)
// ============================================================================
export const SceneWaIde: React.FC = () => {
  const model = useWaGlb('models/wa_modern_spaces.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.ide.durationInFrames;
  const t = f / fps;
  const p = Math.min(1, f / Math.max(1, dur - 1));

  // Silky 55-degree orbital spline showcasing dual glowing monitors + night city skyline!
  const posPts: [number, number, number][] = [
    [-2.05, 1.98, 2.85],
    [-0.65, 1.76, 2.68],
    [1.45, 1.70, 2.55],
    [0.25, 1.64, 2.45],
  ];
  const lookPts: [number, number, number][] = [
    [-0.15, 1.32, -1.45],
    [-0.15, 1.34, -1.35],
    [-0.10, 1.32, -1.35],
    [-0.12, 1.34, -1.40],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  const janTalk = talkFor('ide', f, [2]);
  const janPos: [number, number, number] = [-0.15, 0.0, -0.96];

  const holdPhone = f >= EV['ide.ponsel'] && f < EV['ide.whatsapp'] - 15;
  const typing = f >= EV['ide.whatsapp'] - 15 || f < EV['ide.ponsel'];
  const janArm: WaArmPose = holdPhone ? 'hold_phone' : typing ? 'typing' : 'idle';
  const janExpr: WaExpr =
    f >= EV['ide.whatsapp'] ? 'happy' : f >= EV['ide.ringan'] ? 'proud' : 'serious';

  const rHand = waHandWorld(janPos, 1.68, 1, janArm, 'right', t);
  const pickU = smoothstep(EV['ide.ponsel'] - 12, EV['ide.ponsel'] + 16, f);
  const dropU = smoothstep(EV['ide.whatsapp'] - 24, EV['ide.whatsapp'] - 6, f);
  const phoneHoldWeight = pickU * (1 - dropU);
  const phonePos = lerp3(
    [0.45, 0.92, -1.52],
    [rHand[0] + 0.03, rHand[1] + 0.06, rHand[2] + 0.08],
    phoneHoldWeight,
  );

  return (
    <Stage3D model={model} bg="#0b1224">
      <NightAptLights warmBoost={1.0} />

      <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={56} drift={0.028} />
      <WaGlbInstance model={model} />

      <WaCharSprite
        state={{
          id: 'jan',
          expr: janExpr,
          arm: janArm,
          talk: janTalk,
          timeSec: t,
          facing: 1,
          lean: typing ? -0.04 : 0.02,
          gazeX: holdPhone ? 0.45 : 0.05,
          gazeY: holdPhone ? -0.15 : 0.0,
        }}
        position={janPos}
        height={1.68}
        camPos={camPos}
      />

      <Smartphone3D
        position={phonePos}
        rotation={[0.05, -0.25 * phoneHoldWeight, 0.12 * phoneHoldWeight]}
        scale={1.15}
      />
    </Stage3D>
  );
};

// ============================================================================
// SCENE 5 — PRINSIP: Brian Brings Coffee + "NO ADS! NO GAMES! NO GIMMICKS!"
// ============================================================================
export const SceneWaPrinsip: React.FC = () => {
  const model = useWaGlb('models/wa_modern_spaces.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.prinsip.durationInFrames;
  const t = f / fps;
  const p = Math.min(1, f / Math.max(1, dur - 1));

  // Side-tracking camera comfortably framing BOTH Jan & Brian + glowing studio behind!
  const posPts: [number, number, number][] = [
    [1.65, 1.82, 3.05],
    [0.55, 1.72, 2.85],
    [-0.75, 1.66, 2.75],
    [0.15, 1.72, 2.95],
  ];
  const lookPts: [number, number, number][] = [
    [0.35, 1.28, -0.95],
    [0.05, 1.28, -0.95],
    [-0.10, 1.32, -1.05],
    [0.02, 1.32, -1.05],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  const brianTalk = talkFor('prinsip', f, [1, 3]);
  const walkInEnd = Math.max(85, EV['prinsip.kopi'] - 25);
  const walkU = smoothstep(20, walkInEnd, f);
  const isWalking = f >= 20 && f < walkInEnd ? 1 : 0;

  const janPos: [number, number, number] = [-0.48, 0.0, -0.85];
  const brianPos = lerp3([2.05, 0.0, -0.58], [0.50, 0.0, -0.82], walkU);

  const coffeeStart = EV['prinsip.kopi'] - 10;
  const coffeeU = smoothstep(coffeeStart, coffeeStart + 32, f);
  const stickyStart = EV['prinsip.catatan'];
  const stickyU = smoothstep(stickyStart, stickyStart + 34, f);

  const brianArm: WaArmPose = isWalking
    ? 'walk'
    : f >= stickyStart - 8 && f < stickyStart + 65
      ? 'point_up'
      : f >= coffeeStart - 10 && f < coffeeStart + 50
        ? 'offer_left'
        : 'idle';
  const janArm: WaArmPose =
    f >= coffeeStart + 10 && f < stickyStart + 20
      ? 'offer_right'
      : f >= EV['prinsip.iklan']
        ? 'celebrate'
        : 'idle';

  const brianHand = waHandWorld(brianPos, 1.70, -1, brianArm, 'right', t);
  const janHand = waHandWorld(janPos, 1.68, 1, janArm, 'right', t);
  const cupPos = lerp3(
    [brianHand[0], brianHand[1], brianHand[2] + 0.08],
    [janHand[0], janHand[1], janHand[2] + 0.08],
    coffeeU,
  );
  const stickyPos = lerp3(
    [brianHand[0] + 0.05, brianHand[1] + 0.06, brianHand[2] + 0.06],
    [1.35, 1.92, -3.45],
    stickyU,
  );

  const insertStart = EV['prinsip.iklan'] - 8;
  const showInsert = f >= insertStart && f < insertStart + 122;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage3D model={model} bg="#141e33">
        <NightAptLights warmBoost={1.25} />

        <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={56} drift={0.028} />
        <WaGlbInstance model={model} />

        <WaCharSprite
          state={{
            id: 'jan',
            expr: f >= EV['prinsip.iklan'] ? 'proud' : f >= coffeeStart + 15 ? 'warm' : 'tired',
            arm: janArm,
            talk: 0,
            timeSec: t,
            facing: 1,
            lean: f < coffeeStart ? 0.07 : 0,
            gazeX: 0.45,
          }}
          position={janPos}
          height={1.68}
          camPos={camPos}
        />

        <WaCharSprite
          state={{
            id: 'brian',
            expr: f >= EV['prinsip.iklan'] ? 'happy' : 'warm',
            arm: brianArm,
            talk: brianTalk,
            timeSec: t,
            walkAmount: isWalking,
            walkPhase: f * 0.25,
            facing: -1,
            gazeX: 0.35,
          }}
          position={brianPos}
          height={1.70}
          camPos={camPos}
        />

        <CoffeeCup3D position={cupPos} scale={1.15} />
        {f >= stickyStart - 14 && (
          <StickyNote3D position={stickyPos} rotation={[0, 0, -0.06]} scale={1.25} />
        )}
      </Stage3D>
      {showInsert && <InsertNoAdsSticky localFrame={f - insertStart} fps={fps} />}
    </div>
  );
};

// ============================================================================
// SCENE 6 — MELEDAK: Modern WhatsApp Glass Startup Office + Rising Crane Sweep
// ============================================================================
export const SceneWaMeledak: React.FC = () => {
  const model = useWaGlb('models/wa_modern_spaces.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.meledak.durationInFrames;
  const t = f / fps;
  const p = Math.min(1, f / Math.max(1, dur - 1));

  // Rising crane sweep keeping BOTH founders + 75" dashboard + developers cleanly in frame!
  const posPts: [number, number, number][] = [
    [26.2, 1.58, 4.75],
    [27.8, 1.88, 4.45],
    [29.5, 2.22, 4.40],
    [28.0, 1.98, 4.65],
  ];
  const lookPts: [number, number, number][] = [
    [28.0, 1.55, -1.65],
    [28.0, 1.72, -1.95],
    [28.0, 1.78, -2.05],
    [28.0, 1.62, -1.75],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  const growthP = easeOutCubic(
    smoothstep(EV['meledak.meledak'] - 25, EV['meledak.karyawan'] - 15, f),
  );
  const walkU = smoothstep(0, 75, f);
  const isWalking = f < 72 ? 1 : 0;
  const celebrate = f >= EV['meledak.juta'];

  const janPos = lerp3([27.15, 0.0, 0.65], [27.44, 0.0, 0.35], walkU);
  const brianPos = lerp3([28.85, 0.0, 0.72], [28.56, 0.0, 0.42], walkU);

  return (
    <Stage3D model={model} bg="#dde7f0">
      <ModernOfficeLights />

      <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={56} drift={0.032} />
      <WaGlbInstance model={model} />
      <OfficeDisplayPlane mode="growth" growthProgress={growthP} />

      <WaCharSprite
        state={{ id: 'dev1', expr: 'calm', arm: 'typing', talk: 0, timeSec: t, facing: 1 }}
        position={[25.05, 0.0, -1.72]}
        height={1.62}
        camPos={camPos}
      />
      <WaCharSprite
        state={{ id: 'dev2', expr: 'happy', arm: 'typing', talk: 0, timeSec: t + 0.8, facing: -1 }}
        position={[30.95, 0.0, -1.72]}
        height={1.62}
        camPos={camPos}
      />

      <WaCharSprite
        state={{
          id: 'jan',
          expr: celebrate ? 'happy' : 'proud',
          arm: isWalking ? 'walk' : celebrate ? 'celebrate' : 'point_up',
          talk: 0,
          timeSec: t,
          walkAmount: isWalking,
          walkPhase: f * 0.24,
          facing: 1,
          gazeY: -0.25,
        }}
        position={janPos}
        height={1.70}
        camPos={camPos}
      />
      <WaCharSprite
        state={{
          id: 'brian',
          expr: 'happy',
          arm: isWalking ? 'walk' : celebrate ? 'celebrate' : 'point_up',
          talk: 0,
          timeSec: t,
          walkAmount: isWalking,
          walkPhase: f * 0.24 + 1.1,
          facing: -1,
          gazeY: -0.25,
        }}
        position={brianPos}
        height={1.72}
        camPos={camPos}
      />
    </Stage3D>
  );
};

// ============================================================================
// SCENE 7 — TAWARAN: Executive Penthouse Boardroom at Golden Hour ($19B!)
// ============================================================================
export const SceneWaTawaran: React.FC = () => {
  const model = useWaGlb('models/wa_modern_spaces.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.tawaran.durationInFrames;
  const t = f / fps;
  const p = Math.min(1, f / Math.max(1, dur - 1));

  // Executive over-the-shoulder orbit keeping BOTH Jan, Mark & full $19B board inside 9:16!
  const posPts: [number, number, number][] = [
    [54.6, 2.02, 4.65],
    [55.8, 1.88, 4.35],
    [57.3, 1.92, 4.45],
    [56.0, 2.02, 4.65],
  ];
  const lookPts: [number, number, number][] = [
    [56.0, 1.56, -1.15],
    [56.0, 1.54, -1.05],
    [56.0, 1.56, -1.15],
    [56.0, 1.62, -1.25],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  const markTalk = talkFor('tawaran', f, [2]);
  const offerFrame = EV['tawaran.akuisisi'] - 18;
  const slideU = smoothstep(offerFrame, offerFrame + 42, f);
  const revealU = smoothstep(offerFrame + 5, offerFrame + 30, f);

  const markPos: [number, number, number] = [56.52, 0.0, -1.62];
  const janPos: [number, number, number] = [55.46, 0.0, 0.35];

  const markArm: WaArmPose = f >= offerFrame - 10 && f < offerFrame + 75 ? 'offer_left' : 'idle';
  const janArm: WaArmPose = f >= offerFrame + 28 ? 'hold_folder' : 'idle';
  const folderPos = lerp3([56.25, 0.87, -1.05], [55.68, 0.87, -0.18], slideU);

  const insertStart = EV['tawaran.akuisisi'] + 16;
  const showInsert = f >= insertStart && f < insertStart + 118;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage3D model={model} bg="#2c2426">
        <BoardroomLights />

        <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={56} drift={0.028} />
        <WaGlbInstance model={model} />
        <BoardroomOfferPlane reveal={revealU} />

        <WaCharSprite
          state={{
            id: 'mark',
            expr: f >= offerFrame ? 'happy' : 'warm',
            arm: markArm,
            talk: markTalk,
            timeSec: t,
            facing: -1,
            gazeX: 0.35,
          }}
          position={markPos}
          height={1.72}
          camPos={camPos}
        />

        <WaCharSprite
          state={{
            id: 'jan',
            expr: f >= offerFrame + 35 ? 'proud' : f >= offerFrame ? 'shock' : 'calm',
            arm: janArm,
            talk: 0,
            timeSec: t,
            facing: 1,
            gazeX: 0.45,
          }}
          position={janPos}
          height={1.72}
          camPos={camPos}
        />

        <PaperFolder3D position={folderPos} rotation={[0, -0.22, 0]} color="#14532d" scale={1.08} />
      </Stage3D>
      {showInsert && <InsertAcquisitionDeal localFrame={f - insertStart} fps={fps} signed={false} />}
    </div>
  );
};

// ============================================================================
// SCENE 8 — PENUTUP: Signing Outside Social Services + Rising Sunset Fly-Out!
// ============================================================================
export const SceneWaPenutup: React.FC = () => {
  const model = useWaGlb('models/wa_exterior_welfare.glb');
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = T.scenes.penutup.durationInFrames;
  const t = f / fps;
  const p = Math.min(1, f / Math.max(1, dur - 1));

  // Intimate golden-hour orbit -> majestic rising crane fly-out over Silicon Valley!
  const posPts: [number, number, number][] = [
    [-0.85, 1.82, 9.85],
    [0.65, 1.78, 9.75],
    [0.10, 2.45, 11.4],
    [-2.2, 5.5, 16.8],
    [4.0, 9.6, 22.8],
  ];
  const lookPts: [number, number, number][] = [
    [-0.10, 1.28, 6.2],
    [-0.10, 1.30, 6.2],
    [0.0, 2.1, 5.4],
    [0.0, 3.5, 4.4],
    [0.0, 4.4, 4.0],
  ];
  const camV = evalSpline(posPts, p);
  const camPos: [number, number, number] = [camV.x, camV.y, camV.z];

  const janTalk = talkFor('penutup', f, [1]);
  const signFrame = EV['penutup.tanda'];
  const shakeStart = EV['penutup.asal'] - 25;
  const shakeEnd = EV['penutup.akhir'] - 15;

  const janPos: [number, number, number] = [-0.28, 0.14, 6.22];
  const markPos: [number, number, number] = [0.64, 0.14, 6.26];
  const brianPos: [number, number, number] = [-1.14, 0.14, 6.52];

  const isSigning = f >= signFrame && f < shakeStart;
  const isShaking = f >= shakeStart && f < shakeEnd;

  const janArm: WaArmPose = isSigning ? 'sign' : isShaking ? 'handshake' : 'hold_folder';
  const markArm: WaArmPose = isShaking ? 'handshake' : f >= shakeEnd ? 'hold_folder' : 'idle';
  const janHand = waHandWorld(janPos, 1.72, 1, janArm, 'right', t);
  const markHand = waHandWorld(markPos, 1.72, -1, markArm, 'left', t);
  const handOverU = smoothstep(shakeStart, shakeStart + 30, f);
  const folderPos = lerp3(
    [janHand[0] - 0.08, janHand[1] - 0.06, janHand[2] + 0.08],
    [markHand[0] + 0.06, markHand[1] - 0.05, markHand[2] + 0.08],
    handOverU,
  );

  const insertStart = signFrame + 8;
  const showInsert = f >= insertStart && f < insertStart + 125;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage3D model={model} bg="#e58e52">
        <WaSkyDome mode="golden" />
        <ambientLight intensity={0.96} color="#fff2de" />
        <directionalLight position={[12, 18, 16]} intensity={1.38} color="#ffd9a3" />
        <hemisphereLight args={['#a9c8f0', '#5a4a3a', 0.55]} />

        <DynamicCamera pos={posPts} look={lookPts} t={p} timeSec={t} fov={54 + p * 3} drift={0.034} />
        <WaGlbInstance model={model} slidingDoorOpen={0} />
        <WelfareSignPlane />

        <WaCharSprite
          state={{
            id: 'brian',
            expr: 'proud',
            arm: f >= shakeEnd ? 'celebrate' : 'idle',
            talk: 0,
            timeSec: t,
            facing: 1,
            gazeX: 0.4,
          }}
          position={brianPos}
          height={1.72}
          camPos={camPos}
        />

        <WaCharSprite
          state={{
            id: 'jan',
            expr: f >= EV['penutup.asal'] ? 'proud' : 'warm',
            arm: janArm,
            talk: janTalk,
            timeSec: t,
            facing: 1,
            gazeX: isShaking ? 0.45 : 0.1,
          }}
          position={janPos}
          height={1.72}
          camPos={camPos}
        />

        <WaCharSprite
          state={{
            id: 'mark',
            expr: 'happy',
            arm: markArm,
            talk: 0,
            timeSec: t,
            facing: -1,
            gazeX: 0.4,
          }}
          position={markPos}
          height={1.72}
          camPos={camPos}
        />

        <PaperFolder3D position={folderPos} rotation={[0.25, 0.15, 0.08]} color="#14532d" />
        {isSigning && <Pen3D position={[janHand[0] + 0.04, janHand[1] + 0.04, janHand[2] + 0.14]} />}
      </Stage3D>
      {showInsert && <InsertAcquisitionDeal localFrame={f - insertStart} fps={fps} signed />}
    </div>
  );
};

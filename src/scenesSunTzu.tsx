import React, { useMemo, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { CameraRig } from './three/objects';
import { ToonSky } from './three/toon';
import { Palace } from './suntzu/World';
import {
  DRAMA_ASPECT,
  DramaCharPose,
  DramaExpr,
  DramaRole,
  drawDramaChar,
  dramaHandWorld,
  makeDramaTexture,
} from './suntzu/rigDrama';
import { DramaInsert, DramaInsertKind } from './suntzu/insertsDrama';
import { Timing, V, activeLine, clamp, mix, mouth, smooth } from './suntzu/timing';

type Cam = { p: V; t: V; fov: number };

const curve = (pts: V[], u: number): V =>
  new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal')
    .getPoint(smooth(u))
    .toArray() as V;

const glide = (u: number, a: V, b: V, t: V, fov = 50): Cam => ({
  p: mix(a, b, smooth(u)),
  t,
  fov,
});

const offset = (p: V, x: number, y: number, z: number): V => [p[0] + x, p[1] + y, p[2] + z];

// ===== 3D ACTION PROPS ATTACHED TO ARTICULATED CHARACTER HANDS =====
const Spear3D: React.FC<{ at: V; tiltZ?: number; yaw?: number }> = ({ at, tiltZ = 0, yaw = 0 }) => (
  <group position={at} rotation={[0, yaw, tiltZ]}>
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.022, 0.026, 2.35, 8]} />
      <meshStandardMaterial color="#734c2b" roughness={0.7} />
    </mesh>
    {/* Red silk tassel below spearhead */}
    <mesh position={[0, 1.24, 0]}>
      <coneGeometry args={[0.065, 0.16, 8]} />
      <meshStandardMaterial color="#a8322c" roughness={0.8} />
    </mesh>
    <mesh position={[0, 1.48, 0]}>
      <coneGeometry args={[0.072, 0.3, 4]} />
      <meshStandardMaterial color="#c4c7be" metalness={0.65} roughness={0.3} />
    </mesh>
  </group>
);

const BambooScroll3D: React.FC<{ at: V; rotY?: number }> = ({ at, rotY = 0 }) => (
  <group position={at} rotation={[0.25, rotY, -0.35]}>
    <mesh>
      <boxGeometry args={[0.36, 0.24, 0.05]} />
      <meshStandardMaterial color="#d4b168" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.06, 0.028]}>
      <boxGeometry args={[0.37, 0.022, 0.01]} />
      <meshStandardMaterial color="#802a24" />
    </mesh>
    <mesh position={[0, -0.06, 0.028]}>
      <boxGeometry args={[0.37, 0.022, 0.01]} />
      <meshStandardMaterial color="#802a24" />
    </mesh>
  </group>
);

const DrumStick3D: React.FC<{ at: V; swing: number }> = ({ at, swing }) => (
  <group position={at} rotation={[swing, 0, -0.45]}>
    <mesh position={[0, -0.2, 0]}>
      <cylinderGeometry args={[0.024, 0.024, 0.52, 8]} />
      <meshStandardMaterial color="#7b5230" />
    </mesh>
    <mesh position={[0, -0.47, 0]}>
      <sphereGeometry args={[0.078, 10, 8]} />
      <meshStandardMaterial color="#dfc284" />
    </mesh>
  </group>
);

// ===== ARTICULATED DRAMA CHARACTER BILLBOARD =====
const DramaActor: React.FC<{
  role: DramaRole;
  at: V;
  cam: V;
  f: number;
  t: Timing;
  scene: string;
  voice?: string;
  h?: number;
  variant?: number;
  expr?: DramaExpr;
  armL?: [number, number];
  armR?: [number, number];
  walkAmp?: number;
  walkSpeed?: number;
  lean?: number;
  headTilt?: number;
  gazeX?: number;
  fixedYaw?: number;
  spear?: boolean;
  spearTilt?: number;
  scroll?: boolean;
  sweat?: boolean;
  seed?: number;
}> = ({
  role,
  at,
  cam,
  f,
  t,
  scene,
  voice,
  h = 1.98,
  variant = 0,
  expr = 'neutral',
  armL,
  armR,
  walkAmp = 0,
  walkSpeed = 0.28,
  lean = 0,
  headTilt = 0,
  gazeX = 0,
  fixedYaw,
  spear = false,
  spearTilt = 0,
  scroll = false,
  sweat = false,
  seed = 1,
}) => {
  const { canvas, tex } = useMemo(() => makeDramaTexture(), []);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const talking = voice ? mouth(t, scene, voice, f) : 0;

  // Natural talking gesture if armR not overridden
  const dynArmR: [number, number] =
    armR ??
    (talking > 0.1
      ? [28 + Math.sin(f * 0.22 + seed) * 16, -38 - Math.cos(f * 0.19) * 10]
      : [18, -20]);
  const dynArmL: [number, number] =
    armL ?? (walkAmp > 0.1 ? [Math.sin(f * walkSpeed) * 28, -22] : [-16, -14]);

  const pose: DramaCharPose = {
    role,
    seed,
    variant,
    expr,
    mouthOpen: talking,
    armL: dynArmL,
    armR: dynArmR,
    walkPhase: f * walkSpeed + seed,
    walkAmp,
    lean,
    headTilt: headTilt + Math.sin(f * 0.045 + seed) * 1.4,
    gazeX,
    blink: expr !== 'shock' && expr !== 'panic' && (f + seed * 17) % 131 < 4,
    breathe: Math.sin(f * 0.06 + seed),
    sweat,
  };

  if (!ctxRef.current) ctxRef.current = canvas.getContext('2d');
  if (ctxRef.current) {
    drawDramaChar(ctxRef.current, pose);
    tex.needsUpdate = true;
  }

  const w = h * DRAMA_ASPECT;
  const yaw = fixedYaw !== undefined ? fixedYaw : Math.atan2(cam[0] - at[0], cam[2] - at[2]);
  const handR = (spear || scroll) ? dramaHandWorld(pose, 'R', at, h, cam, fixedYaw) : null;

  return (
    <>
      <mesh position={[at[0], at[1] + h * 0.5, at[2]]} rotation={[0, yaw, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={tex}
          transparent
          alphaTest={0.12}
          roughness={0.85}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {spear && handR && <Spear3D at={handR} tiltZ={spearTilt} yaw={yaw} />}
      {scroll && handR && <BambooScroll3D at={handR} rotY={yaw} />}
    </>
  );
};

// ===== UTUSAN RUNNING PATH DOWN HALL STEPS TO SUN TZU =====
function utusanRunPos(u: number): V {
  const pts: V[] = [
    [-11.8, 0.44, -0.4],
    [-8.5, 0.14, -0.8],
    [-5.2, 0.14, -1.0],
    [-2.4, 0.14, -0.85],
    [-0.85, 0.14, -0.75],
  ];
  const k = clamp(u) * (pts.length - 1);
  const idx = Math.min(pts.length - 2, Math.floor(k));
  return mix(pts[idx], pts[idx + 1], smooth(k - idx));
}

// ===== LIVING PALACE ATMOSPHERE (BANNERS, DUST, TORCH GLOW) =====
const PalaceAtmosphere: React.FC<{ f: number; windy?: boolean; dark?: boolean }> = ({
  f,
  windy = false,
  dark = false,
}) => {
  const spd = windy ? 0.18 : 0.055;
  const amp = windy ? 0.22 : 0.07;
  return (
    <group>
      {/* Swaying silk palace banners */}
      {[-15.5, 8.8].map((x, n) => (
        <group key={x} position={[x, 2.9, -2.8]}>
          {[0, 1, 2, 3, 4].map((j) => (
            <mesh
              key={j}
              position={[j * 0.17, Math.sin(f * spd + j * 0.65 + n) * amp, 0]}
              rotation={[0, Math.sin(f * (spd * 0.9) + j * 0.7) * (windy ? 0.35 : 0.12), 0]}
            >
              <boxGeometry args={[0.18, 1.38, 0.025]} />
              <meshStandardMaterial
                color={n ? '#9c433a' : '#4f7a66'}
                roughness={0.75}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      ))}
      {/* Floating golden dust motes */}
      {!dark &&
        Array.from({ length: 18 }, (_, n) => (
          <mesh
            key={n}
            position={[
              -5 + (n % 6) * 2 + Math.sin(f * 0.012 + n) * 0.35,
              0.9 + ((n * 0.37 + f * 0.008) % 3.4),
              -4 + Math.floor(n / 6) * 3.2,
            ]}
          >
            <sphereGeometry args={[0.015, 4, 4]} />
            <meshBasicMaterial color="#ffe7ba" transparent opacity={0.36} />
          </mesh>
        ))}
    </group>
  );
};

// ===== MAIN 10-SCENE FULL DRAMATIC DIRECTOR =====
export const SunTzuScene: React.FC<{ timing: Timing; scene: string; index: number }> = ({
  timing: t,
  scene: s,
  index,
}) => {
  const f = useCurrentFrame();
  const dur = t.scenes[s].durationInFrames;
  const q = clamp(f / Math.max(1, dur));
  const [, setAnchors] = useState<Record<string, V>>({});
  const curLine = activeLine(t, s, f);
  const speaker = curLine?.voice ?? '';
  const scLines = t.lines[s] ?? [];

  // Key event frames (local to scene)
  const ev = t.events;
  const isPostDrum1 = s === 's04_perintah1' && f >= (ev.drum1 ?? 60);
  const isLaugh1 = s === 's04_perintah1' && f >= (ev.laugh1 ?? 70) && f < (scLines[3]?.from ?? dur);
  const isPostDrum2 = s === 's05_perintah2' && f >= (ev.drum2 ?? 120);
  const isLaugh2 = s === 's05_perintah2' && f >= (ev.laugh2 ?? 130);
  const isVerdict = s === 's06_vonis' && f >= (ev.death_verdict ?? 120);
  const isArrest = s === 's06_vonis' && f >= (ev.arrest_cmd ?? 150);
  const isPanic = s === 's06_vonis' && f >= (ev.crowd_scream ?? 165);
  const isCutaway = s === 's08_eksekusi' && f < (ev.replace_cmd ?? 75);
  const isTurnRight = s === 's09_serempak' && f >= (ev.drum3_right ?? 60);
  const isTurnLeft = s === 's09_serempak' && f >= (ev.drum4_left ?? 150);

  // ===== 1. DYNAMIC CINEMATIC CAMERA PER SCENE (NEVER FROZEN!) =====
  let cam: Cam = { p: [0, 3.2, 8], t: [0, 1.5, 0], fov: 50 };
  let insert: { kind: DramaInsertKind; start: number; len: number } | null = null;

  if (s === 's01_balairung') {
    const l0End = scLines[0]?.to ?? 70;
    const l1 = scLines[1];
    const l2 = scLines[2];
    const l3 = scLines[3];
    if (f < l0End) {
      // Epic fly-through from outside palace gate straight into the Royal Hall!
      const u = clamp(f / Math.max(1, l0End));
      cam = {
        p: curve(
          [
            [0, 2.4, 21],
            [0, 2.3, 14],
            [0, 2.3, 5],
            [0, 2.5, -4],
            [0, 2.4, -8.5],
          ],
          u,
        ),
        t: curve(
          [
            [0, 2.0, 8],
            [0, 2.0, -4],
            [0, 2.0, -12.8],
          ],
          u,
        ),
        fov: 52,
      };
    } else if (speaker === 'raja' || (l1 && f < l1.to + 8)) {
      // Shot on King Helü (push-in authoritative angle)
      const u = l3 && f >= l3.from - 6 ? clamp((f - l3.from) / Math.max(1, l3.to - l3.from)) : clamp((f - l0End) / Math.max(1, (l1?.to ?? 150) - l0End));
      cam = glide(u, [0.35, 2.35, -9.8], [0.65, 2.25, -10.5], [0.85, 2.05, -13.3], 44);
      if (l1 && f >= l1.from + 12 && f <= l1.from + 70) {
        insert = { kind: 'bamboo', start: l1.from + 12, len: 58 };
      }
    } else if (speaker === 'suntzu' || (l2 && f >= l2.from - 6)) {
      // Reverse shot on Sun Tzu standing firm before the King!
      const refL = scLines[4] && f >= scLines[4].from - 6 ? scLines[4] : l2;
      const u = refL ? clamp((f - refL.from) / Math.max(1, refL.to - refL.from)) : 0.5;
      cam = glide(u, [0.3, 2.25, -8.2], [-0.2, 2.2, -8.8], [-0.85, 2.0, -11.4], 44);
    } else {
      // Wide two-shot of Hall
      cam = glide(q, [0.1, 2.5, -7.8], [-0.2, 2.6, -7.4], [0, 2.0, -12.4], 50);
    }
  } else if (s === 's02_pasukan') {
    const l1 = scLines[1];
    const l2 = scLines[2];
    if (f < (scLines[0]?.to ?? 150)) {
      // Sweeping crane from gate down to Sun Tzu & two ranks forming
      const u = clamp(f / Math.max(1, scLines[0]?.to ?? 150));
      cam = {
        p: curve(
          [
            [0.8, 5.2, 14.5],
            [0.2, 3.6, 9.5],
            [-0.4, 2.6, 5.2],
          ],
          u,
        ),
        t: mix([0, 1.5, 2.0], [0, 1.4, -0.5], smooth(u)),
        fov: 52,
      };
    } else if (l1 && f < (l2?.from ?? dur) - 4) {
      // Close-up on Selir A giggling with heavy spear
      const u = clamp((f - l1.from) / Math.max(1, l1.to - l1.from));
      cam = glide(u, [-0.4, 2.0, 4.4], [-0.75, 1.95, 3.9], [-1.05, 1.65, 1.35], 44);
    } else {
      // Close-up on Selir B smirking toward pavilion
      const u = l2 ? clamp((f - l2.from) / Math.max(1, l2.to - l2.from)) : 0.5;
      cam = glide(u, [0.3, 2.0, 4.4], [0.75, 1.95, 3.9], [1.05, 1.65, 1.35], 44);
    }
  } else if (s === 's03_aturan') {
    if (speaker.startsWith('crowd_')) {
      // Wide lively shot of all troops answering in unison
      cam = glide(q, [1.4, 2.7, 7.6], [-1.2, 2.6, 7.2], [0, 1.4, 2.2], 50);
    } else {
      // Authoritative medium orbit around Sun Tzu explaining rules
      cam = glide(q, [-1.4, 2.2, 2.6], [1.2, 2.15, 2.4], [0, 1.55, -1.6], 46);
    }
  } else if (s === 's04_perintah1') {
    const l0 = scLines[0];
    const l1 = scLines[1];
    const l2 = scLines[2];
    const l3 = scLines[3];
    if (l0 && f < (ev.drum1 ?? l0.to) + 18) {
      // Hero low-angle push-in on Sun Tzu shouting "HADAP KANAN! GERAK!"
      const u = clamp(f / Math.max(1, (ev.drum1 ?? l0.to) + 18));
      cam = glide(u, [0.8, 1.95, 2.2], [0.1, 1.85, 1.4], [0, 1.6, -1.6], 44);
      if (f >= (ev.drum1 ?? l0.to) - 8) {
        insert = { kind: 'drum', start: (ev.drum1 ?? l0.to) - 8, len: 30 };
      } else if (f >= l0.from + 22 && f < (ev.drum1 ?? l0.to) - 8) {
        insert = { kind: 'right', start: l0.from + 22, len: 28 };
      }
    } else if (l3 && f >= l3.from - 6) {
      // Calm stoic Sun Tzu accepting commander's responsibility
      const u = clamp((f - l3.from) / Math.max(1, l3.to - l3.from));
      cam = glide(u, [-0.9, 2.1, 2.3], [0.2, 2.05, 1.9], [0, 1.55, -1.6], 44);
    } else {
      // Whip to Selir A & laughing troops!
      const u = l1 ? clamp((f - l1.from) / Math.max(1, (l2?.to ?? dur) - l1.from)) : 0.5;
      cam = glide(u, [1.8, 2.5, 6.2], [-1.3, 2.1, 4.6], [-0.4, 1.5, 1.6], 48);
    }
  } else if (s === 's05_perintah2') {
    const l0 = scLines[0];
    const l1 = scLines[1];
    if (l0 && f < (ev.drum2 ?? l0.to) + 18) {
      // Tight intense push-in on Sun Tzu for 2nd command
      const u = clamp(f / Math.max(1, (ev.drum2 ?? l0.to) + 18));
      cam = glide(u, [-0.9, 2.05, 2.4], [0.0, 1.9, 1.35], [0, 1.6, -1.6], 43);
      if (f >= (ev.drum2 ?? l0.to) - 8) {
        insert = { kind: 'drum', start: (ev.drum2 ?? l0.to) - 8, len: 30 };
      } else if (f >= l0.from + 38 && f < l0.from + 72) {
        insert = { kind: 'left', start: l0.from + 38, len: 34 };
      }
    } else {
      // Cut to laughing Selir B & troops, pulling back to show tension
      const u = l1 ? clamp((f - l1.from) / Math.max(1, dur - l1.from)) : 0.5;
      cam = glide(u, [-1.4, 2.4, 6.0], [1.4, 2.2, 4.8], [0.5, 1.5, 1.6], 48);
    }
  } else if (s === 's06_vonis') {
    const l0 = scLines[0];
    const l1 = scLines[1];
    const l2 = scLines[2];
    const l3 = scLines[3];
    if (l0 && f < l0.to + 4) {
      // Dramatic slow-to-sharp push-in on cold Sun Tzu delivering death sentence!
      const u = clamp(f / Math.max(1, l0.to));
      cam = glide(u, [1.2, 2.2, 2.8], [0.0, 1.85, 1.2], [0, 1.62, -1.6], 42);
    } else if (l1 && f < (l2?.from ?? dur) - 3) {
      // Wide panic shock of ALL 12 troops, captains & guards rushing in!
      const u = clamp((f - l1.from) / Math.max(1, l1.to - l1.from));
      cam = glide(u, [0.0, 3.3, 10.6], [0.0, 2.9, 9.4], [0, 1.4, 2.0], 52);
    } else if (l2 && f < (l3?.from ?? dur) - 3) {
      // Close-up terrified Selir A pleading!
      const u = clamp((f - l2.from) / Math.max(1, l2.to - l2.from));
      cam = glide(u, [-0.3, 2.0, 4.1], [-0.7, 1.95, 3.6], [-1.05, 1.65, 1.35], 42);
    } else {
      // Close-up terrified Selir B screaming toward King's pavilion!
      const u = l3 ? clamp((f - l3.from) / Math.max(1, dur - l3.from)) : 0.5;
      cam = glide(u, [0.3, 2.0, 4.1], [0.8, 1.95, 3.6], [1.05, 1.65, 1.35], 42);
    }
  } else if (s === 's07_utusan') {
    const l0 = scLines[0];
    const l1 = scLines[1];
    const l2 = scLines[2];
    const runStart = ev.utusan_run_start ?? (l0?.to ?? 120);
    const runEnd = ev.utusan_arrive ?? (l1?.from ?? 160);
    if (f < runStart) {
      // King Helü jumping up in panic on the high Command Pavilion!
      const u = clamp(f / Math.max(1, runStart));
      cam = glide(u, [-11.5, 2.3, 3.2], [-12.2, 2.1, 2.1], [-13.4, 1.8, -0.8], 45);
    } else if (f < runEnd) {
      // Dynamic tracking shot following Utusan sprinting down to courtyard!
      const u = clamp((f - runStart) / Math.max(1, runEnd - runStart));
      const up = utusanRunPos(u);
      cam = { p: offset(up, 0.7, 1.95, 3.4), t: offset(up, 0, 1.3, 0), fov: 48 };
    } else if (l1 && f < (l2?.from ?? dur) - 4) {
      // Breathless close-up on Utusan begging Sun Tzu (camera positioned IN FRONT of Selir A, z=1.05 -> 0.85)
      const u = clamp((f - l1.from) / Math.max(1, l1.to - l1.from));
      cam = glide(u, [-0.4, 1.98, 1.15], [-0.65, 1.94, 0.92], [-0.85, 1.6, -0.75], 46);
    } else {
      // Cold, unshakeable low-angle hero shot of Sun Tzu refusing King's order!
      const u = l2 ? clamp((f - l2.from) / Math.max(1, dur - l2.from)) : 0.5;
      cam = glide(u, [0.9, 1.95, 2.0], [-0.1, 1.85, 1.25], [0, 1.62, -1.6], 42);
    }
  } else if (s === 's08_eksekusi') {
    const repStart = ev.replace_cmd ?? 75;
    if (f < repStart) {
      // Dramatic cutaway: swaying battle banner + brooding palace roof as bronze gong booms (ZERO gore!)
      const u = clamp(f / Math.max(1, repStart));
      cam = glide(u, [-13.2, 2.8, 3.8], [-14.2, 3.4, 2.6], [-15.5, 2.7, -2.8], 46);
    } else {
      // Return to silent courtyard: two replacements step forward and raise spears!
      const u = clamp((f - repStart) / Math.max(1, dur - repStart));
      cam = glide(u, [0.5, 3.1, 10.2], [-0.3, 2.8, 8.8], [0, 1.4, 1.8], 50);
      if (u > 0.62 && u < 0.95) {
        insert = { kind: 'spear_raise', start: Math.round(repStart + (dur - repStart) * 0.62), len: Math.round((dur - repStart) * 0.33) };
      }
    }
  } else if (s === 's09_serempak') {
    const d3 = ev.drum3_right ?? 60;
    const d4 = ev.drum4_left ?? 150;
    const l4 = scLines[4];
    if (f < d3 + 10) {
      // Sharp command shot on Sun Tzu
      const u = clamp(f / Math.max(1, d3 + 10));
      cam = glide(u, [0.7, 2.0, 2.2], [0.0, 1.9, 1.5], [0, 1.6, -1.6], 44);
      if (f >= d3 - 8) insert = { kind: 'drum', start: d3 - 8, len: 24 };
    } else if (f < d4 + 10) {
      // High sweeping formation view as ALL 14 troops snap right in unison!
      const u = clamp((f - d3) / Math.max(1, d4 - d3));
      cam = glide(u, [2.6, 4.1, 11.2], [-2.0, 3.8, 10.2], [0, 1.35, 2.4], 52);
      if (f >= d4 - 8) insert = { kind: 'drum', start: d4 - 8, len: 24 };
    } else if (l4 && f >= l4.from - 6) {
      // Sun Tzu triumphantly addressing the King's pavilion
      const u = clamp((f - l4.from) / Math.max(1, dur - l4.from));
      cam = glide(u, [-1.1, 2.05, 2.2], [0.4, 2.15, 1.8], [0, 1.6, -1.6], 44);
    } else {
      // Sweeping formation shot as ALL 14 troops snap left & march forward like clockwork!
      const u = clamp((f - d4) / Math.max(1, (l4?.from ?? dur) - d4));
      cam = glide(u, [-2.2, 3.5, 10.6], [2.0, 3.7, 10.0], [0, 1.4, 2.2], 52);
    }
  } else {
    // s10_penutup — Golden-hour sunset finale!
    const l0 = scLines[0];
    const l1 = scLines[1];
    const l2 = scLines[2];
    if (l0 && f < (l1?.from ?? 110) - 5) {
      // Somber King Helü in Command Pavilion looking away
      const u = clamp(f / Math.max(1, l0.to));
      cam = glide(u, [-11.8, 2.15, 2.6], [-12.3, 2.1, 2.2], [-13.4, 1.7, -0.8], 44);
    } else if (l1 && f < (l2?.from ?? 220) - 5) {
      // Sun Tzu delivering the legendary parting line
      const u = clamp((f - l1.from) / Math.max(1, l1.to - l1.from));
      cam = glide(u, [0.5, 2.0, 2.1], [-0.3, 1.95, 1.7], [0, 1.6, -1.6], 44);
    } else {
      // Grand sunset crane pullback over the entire palace courtyard!
      const u = l2 ? clamp((f - l2.from) / Math.max(1, dur - l2.from)) : q;
      cam = {
        p: curve(
          [
            [0.4, 3.4, 9.8],
            [1.6, 5.6, 14.2],
            [0.0, 8.0, 20.0],
          ],
          u,
        ),
        t: mix([0, 1.5, 1.0], [0, 1.8, -4.0], smooth(u)),
        fov: 52,
      };
    }
  }

  // Organic subtle handheld gimbal drift (camera never looks statically frozen)
  cam.p = [
    cam.p[0] + Math.sin(f * 0.042) * 0.035,
    cam.p[1] + Math.cos(f * 0.035) * 0.02,
    cam.p[2],
  ];

  // Punchy camera shake on war drums, death verdict, and bronze gong!
  const shakeHit = (triggerFrame?: number, amp = 0.055, span = 10) => {
    if (triggerFrame === undefined) return;
    if (f >= triggerFrame && f < triggerFrame + span) {
      const decay = 1 - (f - triggerFrame) / span;
      cam.p[0] += (f % 2 === 0 ? 1 : -1) * amp * decay;
      cam.p[1] += (f % 3 === 0 ? 1 : -1) * amp * 0.65 * decay;
    }
  };
  if (s === 's04_perintah1') shakeHit(ev.drum1, 0.06, 10);
  if (s === 's05_perintah2') shakeHit(ev.drum2, 0.065, 10);
  if (s === 's06_vonis') shakeHit(ev.death_verdict, 0.075, 12);
  if (s === 's08_eksekusi') shakeHit(ev.gong_exec, 0.05, 14);
  if (s === 's09_serempak') {
    shakeHit(ev.drum3_right, 0.055, 8);
    shakeHit(ev.drum4_left, 0.06, 10);
  }

  // ===== 2. LIGHTING MOOD PER SCENE (MORNING -> TENSE STORM -> GOLDEN SUNSET) =====
  const isTense = s === 's06_vonis' || s === 's07_utusan' || s === 's08_eksekusi';
  const isSunset = s === 's10_penutup';
  const skyTop = isSunset ? '#495b7a' : isTense ? '#5e7382' : '#6aa6cb';
  const skyHor = isSunset ? '#f0a668' : isTense ? '#b5bec4' : '#f2dfc0';
  const skyBot = isSunset ? '#9e7d62' : isTense ? '#8c8a80' : '#bdb496';
  const sunColor = isSunset ? '#ffb870' : isTense ? '#cfd8e0' : '#ffe2b3';
  const sunInt = isCutaway ? 1.15 : isTense ? 1.85 : isSunset ? 2.2 : 2.55;
  const hemiInt = isCutaway ? 0.75 : isTense ? 1.15 : 1.45;

  // ===== 3. CHARACTER BLOCKING & ANIMATED STATES =====
  const sunPos: V = s === 's01_balairung' ? [-0.85, 0.99, -11.4] : [0, 0.14, -1.6];
  const sunExpr: DramaExpr =
    s === 's06_vonis' || s === 's07_utusan' || s === 's08_eksekusi'
      ? 'cold'
      : speaker === 'suntzu' && (s === 's04_perintah1' || s === 's05_perintah2' || s === 's09_serempak')
        ? 'command'
        : 'neutral';
  const sunArmR: [number, number] =
    (s === 's04_perintah1' && !isPostDrum1) || (s === 's05_perintah2' && !isPostDrum2) || (s === 's09_serempak' && speaker === 'suntzu')
      ? [78, -58] // raised command arm!
      : s === 's06_vonis' && isVerdict
        ? [82, -45] // pointing verdict!
        : s === 's07_utusan' && f >= (ev.suntzu_refuse ?? 200)
          ? [74, -62] // firm palm halt refusing King!
          : speaker === 'suntzu'
            ? [32 + Math.sin(f * 0.2) * 14, -38]
            : [16, -20];

  // Courtyard troops formation (12 soldiers in 2 crisp companies of 6)
  const showCourtyard = s !== 's01_balairung';
  const showOriginalCaptains = showCourtyard && !['s08_eksekusi', 's09_serempak', 's10_penutup'].includes(s);
  const showReplacements = s === 's08_eksekusi' || s === 's09_serempak' || s === 's10_penutup';

  // Formation turn angle & march forward in Scene 9 (clean 3/4 turn ~47 deg so 2D planes stay full & readable!)
  const turnRightU = isTurnRight ? smooth((f - (ev.drum3_right ?? 60)) / 14) : 0;
  const turnLeftU = isTurnLeft ? smooth((f - (ev.drum4_left ?? 150)) / 14) : 0;
  const marchU = isTurnLeft ? smooth((f - (ev.drum4_left ?? 150) - 12) / 48) : 0;
  const troopYaw: number | undefined =
    s === 's09_serempak' && (turnRightU > 0 || turnLeftU > 0)
      ? turnRightU * (-Math.PI * 0.26) + turnLeftU * (Math.PI * 0.52)
      : undefined;
  const marchDz = -marchU * 0.85;
  const marchWalk =
    (turnRightU > 0 && turnRightU < 1) || (turnLeftU > 0 && turnLeftU < 1) || (marchU > 0 && marchU < 1)
      ? 0.9
      : 0;

  // Troop emotion across the story arc
  const troopExpr: DramaExpr =
    isLaugh1 || isLaugh2
      ? 'laugh'
      : isPanic || s === 's07_utusan'
        ? 'panic'
        : s === 's08_eksekusi' || s === 's09_serempak' || s === 's10_penutup'
          ? 'fear'
          : 'neutral';

  // Guards marching forward on "tangkap!" in Scene 6
  const arrestU = isArrest ? smooth((f - (ev.arrest_cmd ?? 150)) / 32) : s === 's07_utusan' ? 1 : 0;
  const guardLPos: V = mix([-3.1, 0.14, -1.6], [-1.75, 0.14, 1.15], arrestU);
  const guardRPos: V = mix([3.1, 0.14, -1.6], [1.75, 0.14, 1.15], arrestU);
  const guardWalk = arrestU > 0 && arrestU < 1 ? 1.0 : 0;

  // Replacement captains stepping forward in Scene 8
  const repU = s === 's08_eksekusi' ? smooth((f - (ev.replace_cmd ?? 75)) / 36) : 1;

  // Utusan running state in Scene 7
  const runStart = ev.utusan_run_start ?? 120;
  const runEnd = ev.utusan_arrive ?? 160;
  const utusanU = s === 's07_utusan' ? clamp((f - runStart) / Math.max(1, runEnd - runStart)) : 0;
  const utusanPos = utusanRunPos(utusanU);
  const utusanRunning = s === 's07_utusan' && f >= runStart && f < runEnd;

  // Drummer mallet swing on commands
  const drumHitFrame =
    s === 's04_perintah1'
      ? ev.drum1
      : s === 's05_perintah2'
        ? ev.drum2
        : s === 's09_serempak'
          ? f < (ev.drum4_left ?? 150) - 15
            ? ev.drum3_right
            : ev.drum4_left
          : undefined;
  const drumStroke =
    drumHitFrame !== undefined
      ? smooth((f - drumHitFrame + 14) / 10) - smooth((f - drumHitFrame) / 8)
      : 0;

  const sceneTitle = t.scenes[s]?.title ?? `${String(index + 1).padStart(2, '0')} / SUN TZU`;

  return (
    <AbsoluteFill style={{ background: '#1e1915', fontFamily: 'Inter, sans-serif' }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows="basic"
        camera={{ position: cam.p, fov: cam.fov, near: 0.05, far: 260 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isCutaway ? 0.92 : 1.14,
        }}
      >
        <CameraRig position={cam.p} lookAt={cam.t} fov={cam.fov} />
        <ToonSky top={skyTop} horizon={skyHor} bottom={skyBot} r={220} />

        {/* 3-Point Dramatic Palace Lighting with Real Shadow Map */}
        <hemisphereLight args={['#fff0d8', '#7d6e58', hemiInt]} />
        <directionalLight
          position={isSunset ? [-22, 14, 18] : [-14, 24, 15]}
          color={sunColor}
          intensity={sunInt}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={1}
          shadow-camera-far={75}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-22}
          shadow-bias={-0.0008}
        />
        <directionalLight position={[10, 8, 14]} color="#b9d1e8" intensity={0.45} />
        {/* Warm interior palace oil lamps in Royal Hall & Command Pavilion */}
        <pointLight position={[0, 3.2, -11.8]} intensity={20} distance={15} decay={1.3} color="#ffdfb0" />
        <pointLight position={[-13, 3.1, -0.5]} intensity={16} distance={13} decay={1.3} color="#ffd99e" />

        <Palace onAnchors={setAnchors} />
        <PalaceAtmosphere f={f} windy={isCutaway || isTense} dark={isCutaway} />

        {/* === SCENE 1: ROYAL HALL — KING HELÜ VS SUN TZU === */}
        {s === 's01_balairung' && (
          <>
            <DramaActor
              role="raja"
              at={[0.85, 0.99, -13.3]}
              cam={cam.p}
              f={f}
              t={t}
              scene={s}
              voice="raja"
              h={2.05}
              expr={speaker === 'raja' ? 'smug' : 'neutral'}
              gazeX={-0.7}
              scroll
              armR={speaker === 'raja' ? [48 + Math.sin(f * 0.16) * 10, -45] : [26, -32]}
              seed={10}
            />
            <DramaActor
              role="suntzu"
              at={sunPos}
              cam={cam.p}
              f={f}
              t={t}
              scene={s}
              voice="suntzu"
              h={2.0}
              expr={speaker === 'suntzu' ? 'command' : 'neutral'}
              gazeX={0.7}
              armR={sunArmR}
              seed={20}
            />
          </>
        )}

        {/* === SCENES 2–10: TRAINING COURTYARD & COMMAND PAVILION === */}
        {showCourtyard && (
          <>
            {/* Sun Tzu commanding center stage */}
            <DramaActor
              role="suntzu"
              at={sunPos}
              cam={cam.p}
              f={f}
              t={t}
              scene={s}
              voice="suntzu"
              h={2.02}
              expr={sunExpr}
              armR={sunArmR}
              armL={s === 's05_perintah2' ? [55, -38] : [-16, -14]}
              gazeX={s === 's07_utusan' ? -0.6 : 0}
              seed={20}
            />

            {/* King Helü watching from the high Command Pavilion */}
            <DramaActor
              role="raja"
              at={[-13.4, 0.44, -0.8]}
              cam={cam.p}
              f={f}
              t={t}
              scene={s}
              voice="raja"
              h={2.05}
              expr={
                s === 's10_penutup'
                  ? 'sad'
                  : s === 's07_utusan'
                    ? 'panic'
                    : s === 's06_vonis'
                      ? 'shock'
                      : 'smug'
              }
              lean={s === 's07_utusan' && f < runStart ? 10 : 0}
              headTilt={s === 's10_penutup' ? 8 : 0}
              armR={s === 's07_utusan' && f < runStart ? [82, -52] : [18, -22]}
              gazeX={0.8}
              sweat={s === 's07_utusan'}
              seed={10}
            />

            {/* Armored Palace Guards */}
            <DramaActor
              role="pengawal"
              at={guardLPos}
              cam={cam.p}
              f={f}
              t={t}
              scene={s}
              h={2.0}
              expr="cold"
              walkAmp={guardWalk}
              spear
              armR={[28, -36]}
              seed={91}
            />
            <DramaActor
              role="pengawal"
              at={guardRPos}
              cam={cam.p}
              f={f}
              t={t}
              scene={s}
              h={2.0}
              expr="cold"
              walkAmp={guardWalk}
              spear
              armR={[28, -36]}
              seed={92}
            />

            {/* War Drummer at Command Drum */}
            <group>
              <DramaActor
                role="utusan"
                at={[-6.8, 0.14, 3.0]}
                cam={cam.p}
                f={f}
                t={t}
                scene={s}
                h={1.92}
                expr="neutral"
                armR={[36 + drumStroke * 80, -48]}
                seed={77}
              />
              <DrumStick3D
                at={dramaHandWorld(
                  { role: 'utusan', armR: [36 + drumStroke * 80, -48] },
                  'R',
                  [-6.8, 0.14, 3.0],
                  1.92,
                  cam.p,
                )}
                swing={-0.7 + drumStroke * 1.15}
              />
            </group>

            {/* Original Two Concubine Leaders (Selir A & Selir B) — Scenes 2 to 7 */}
            {showOriginalCaptains && (
              <>
                {(() => {
                  const enterU = s === 's02_pasukan' ? smooth((q - 0.08) / 0.28) : 1;
                  const backOff = isPanic ? 0.35 : 0;
                  const posA: V = [mix([-2.6, 0.14, 1.35], [-1.05, 0.14, 1.35], enterU)[0], 0.14, 1.35 + backOff];
                  const posB: V = [mix([2.6, 0.14, 1.35], [1.05, 0.14, 1.35], enterU)[0], 0.14, 1.35 + backOff];
                  const capExpr: DramaExpr =
                    isPanic || s === 's07_utusan'
                      ? 'panic'
                      : isVerdict
                        ? 'shock'
                        : isLaugh1 || isLaugh2 || (s === 's02_pasukan' && (speaker === 'selir_a' || speaker === 'selir_b'))
                          ? 'laugh'
                          : 'neutral';
                  const capWalk = s === 's02_pasukan' && enterU > 0 && enterU < 1 ? 0.9 : 0;
                  const giggleTilt = capExpr === 'laugh' ? Math.sin(f * 0.42) * 7 : 0;
                  return (
                    <>
                      <DramaActor
                        role="selir_a"
                        at={posA}
                        cam={cam.p}
                        f={f}
                        t={t}
                        scene={s}
                        voice={speaker.startsWith('crowd_') ? 'crowd_' : 'selir_a'}
                        h={1.92}
                        expr={capExpr}
                        headTilt={giggleTilt}
                        walkAmp={capWalk}
                        spear
                        spearTilt={capExpr === 'laugh' ? 0.12 : 0}
                        armR={capExpr === 'panic' ? [56, -24] : [42, -12]}
                        armL={capExpr === 'panic' ? [68, -40] : [-16, -14]}
                        sweat={capExpr === 'panic'}
                        gazeX={s === 's02_pasukan' ? 0.7 : 0}
                        seed={31}
                      />
                      <DramaActor
                        role="selir_b"
                        at={posB}
                        cam={cam.p}
                        f={f}
                        t={t}
                        scene={s}
                        voice={speaker.startsWith('crowd_') ? 'crowd_' : 'selir_b'}
                        h={1.92}
                        expr={capExpr}
                        headTilt={-giggleTilt}
                        walkAmp={capWalk}
                        spear
                        spearTilt={capExpr === 'laugh' ? -0.12 : 0}
                        armR={capExpr === 'panic' ? [56, -24] : [42, -12]}
                        armL={capExpr === 'panic' ? [65, -44] : [-16, -14]}
                        sweat={capExpr === 'panic'}
                        gazeX={s === 's02_pasukan' ? -0.7 : 0}
                        seed={32}
                      />
                    </>
                  );
                })()}
              </>
            )}

            {/* Replacement Leaders (Scenes 8, 9, 10) */}
            {showReplacements && (
              <>
                <DramaActor
                  role="pengganti_a"
                  at={[-1.05, 0.14, mix([-1.05, 0.14, 2.4], [-1.05, 0.14, 1.35], repU)[2] + marchDz]}
                  cam={cam.p}
                  f={f}
                  t={t}
                  scene={s}
                  voice={speaker.startsWith('crowd_') ? 'crowd_' : undefined}
                  h={1.92}
                  expr="fear"
                  walkAmp={(repU > 0 && repU < 1) ? 0.85 : marchWalk}
                  fixedYaw={troopYaw}
                  spear
                  armR={[42, -12]}
                  seed={41}
                />
                <DramaActor
                  role="pengganti_b"
                  at={[1.05, 0.14, mix([1.05, 0.14, 2.4], [1.05, 0.14, 1.35], repU)[2] + marchDz]}
                  cam={cam.p}
                  f={f}
                  t={t}
                  scene={s}
                  voice={speaker.startsWith('crowd_') ? 'crowd_' : undefined}
                  h={1.92}
                  expr="fear"
                  walkAmp={(repU > 0 && repU < 1) ? 0.85 : marchWalk}
                  fixedYaw={troopYaw}
                  spear
                  armR={[42, -12]}
                  seed={42}
                />
              </>
            )}

            {/* 12 Palace Concubine Soldiers (2 Companies × 6) — Speaking/Laughing/Screaming/Turning in Unison! */}
            {Array.from({ length: 12 }, (_, idx) => {
              const row = Math.floor(idx / 2);
              const side = idx % 2 === 0 ? -1 : 1;
              const x = side * (1.35 + (row % 2) * 0.72);
              const z = 2.25 + Math.floor(row / 2) * 1.15 + (row % 2) * 0.42 + marchDz + (isPanic ? 0.2 : 0);
              const laughJitter = troopExpr === 'laugh' ? Math.sin(f * 0.36 + idx * 1.1) * 6 : 0;
              return (
                <DramaActor
                  key={idx}
                  role="pasukan"
                  variant={idx % 4}
                  at={[x, 0.14, z]}
                  cam={cam.p}
                  f={f}
                  t={t}
                  scene={s}
                  voice={speaker.startsWith('crowd_') ? 'crowd_' : undefined}
                  h={1.88}
                  expr={troopExpr}
                  headTilt={laughJitter}
                  walkAmp={marchWalk}
                  fixedYaw={troopYaw}
                  spear
                  spearTilt={troopExpr === 'laugh' ? side * 0.1 : 0}
                  armR={troopExpr === 'panic' ? [56, -24] : [42, -12]}
                  armL={troopExpr === 'panic' ? [60, -40] : [-14, -14]}
                  sweat={troopExpr === 'panic'}
                  seed={100 + idx}
                />
              );
            })}

            {/* Royal Messenger (Utusan) sprinting from Pavilion to Sun Tzu in Scene 7 */}
            {s === 's07_utusan' && (
              <DramaActor
                role="utusan"
                at={utusanPos}
                cam={cam.p}
                f={f}
                t={t}
                scene={s}
                voice="utusan"
                h={1.94}
                expr="panic"
                walkAmp={utusanRunning ? 1.0 : 0}
                walkSpeed={0.48}
                lean={utusanRunning ? 12 : 0}
                armR={speaker === 'utusan' ? [64, -46] : [35, -35]}
                armL={speaker === 'utusan' ? [52, -38] : [-25, -20]}
                sweat
                seed={60}
              />
            )}
          </>
        )}
      </ThreeCanvas>

      {/* === TOP SCENE HEADER BADGE === */}
      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 64,
          right: 64,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: '#2c221b',
            background: 'rgba(249, 238, 217, 0.9)',
            padding: '14px 28px',
            borderRadius: 16,
            border: '2.5px solid #ad905e',
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: 1.0,
            boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
          }}
        >
          {sceneTitle}
        </div>
      </div>

      {/* === 2D DRAMATIC INSERT OVERLAY === */}
      {insert && <DramaInsert kind={insert.kind} f={f - insert.start} len={insert.len} />}

      {/* === DRAMATIC DARK SHADOW PULSE ON EXECUTION GONG (SCENE 8 CUTAWAY, ZERO GORE) === */}
      {isCutaway && (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle at center, rgba(20,16,18,0.35) 0%, rgba(10,8,10,0.86) 100%)',
            opacity: Math.sin(clamp(f / Math.max(1, ev.replace_cmd ?? 75)) * Math.PI),
            pointerEvents: 'none',
          }}
        />
      )}

      {/* === ENDING HISTORICAL NOTE CARD (SCENE 10) === */}
      {s === 's10_penutup' && f >= (scLines[2]?.from ?? 180) && (
        <div
          style={{
            position: 'absolute',
            left: 68,
            right: 68,
            top: 175,
            textAlign: 'center',
            background: 'rgba(28, 22, 18, 0.86)',
            border: '2px solid #d9b153',
            padding: '20px 24px',
            borderRadius: 18,
            color: '#fff4da',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 900, color: '#ffe078', letterSpacing: 1 }}>
            DISIPLIN ATAU KEKEJAMAN?
          </div>
          <div style={{ fontSize: 22, marginTop: 6, color: '#e8dcc4', fontWeight: 600 }}>
            Kisah dalam Shiji • Dialog didramatisasi
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

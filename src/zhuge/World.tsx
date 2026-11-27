import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ZHUGE_ASPECT,
  ZhugeCharPose,
  ZhugeExpr,
  ZhugeRole,
  drawZhugeChar,
  makeZhugeTexture,
  zhugeHandWorld,
} from './rigZhuge';

export type V3 = [number, number, number];

let cachedGlb: Promise<THREE.Group> | null = null;
function loadXicheng(): Promise<THREE.Group> {
  if (!cachedGlb) {
    cachedGlb = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        staticFile('models/zhuge_xicheng_hq.glb'),
        (gltf) => resolve(gltf.scene),
        undefined,
        reject,
      );
    });
  }
  return cachedGlb;
}

/** MUST be called OUTSIDE <ThreeCanvas> so <ThreeCanvas> only mounts once the GLB is ready! */
export function useXichengGlb(): THREE.Group | null {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender('Load zhuge_xicheng_hq.glb'));

  useEffect(() => {
    let alive = true;
    loadXicheng()
      .then((scene) => {
        if (!alive) return;
        setModel(scene);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
    return () => {
      alive = false;
    };
  }, [handle]);

  return model;
}

/** Procedural dusk studio PMREM reflections on bronze/lacquer + 1-shot static shadow map bake. */
export const XichengEnvAndBake: React.FC<{ model: THREE.Group; sunset?: boolean }> = ({
  model,
  sunset = true,
}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(sunset ? '#4a3a35' : '#3a4654');
    const skyLight = new THREE.Mesh(
      new THREE.SphereGeometry(20, 12, 8),
      new THREE.MeshBasicMaterial({ color: sunset ? '#ffb56b' : '#b8cee0', side: THREE.BackSide }),
    );
    envScene.add(skyLight);
    const envRT = pmrem.fromScene(envScene, 0.04);
    const envTex = envRT.texture;

    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (mat.metalness > 0.2 || mat.roughness < 0.55) {
            mat.envMap = envTex;
            mat.envMapIntensity = 0.9;
            mat.needsUpdate = true;
          }
        }
      }
    });

    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      envRT.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, model, sunset]);

  return null;
};

/** Instantiates the Xicheng Fortress GLB with animated Gate_Left, Gate_Right, and Shu banners. */
export const XichengInstance: React.FC<{
  source: THREE.Group;
  gateOpen?: number; // 0 = closed, 1 = wide open (105 deg inward into tunnel!)
  bannersDown?: number; // 0 = raised, 1 = lowered out of sight
}> = ({ source, gateOpen = 0, bannersDown = 0 }) => {
  const clone = useMemo(() => {
    const c = source.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });
    return c;
  }, [source]);

  // Animate fortress gates & banners deterministically every frame
  const gateL = clone.getObjectByName('Gate_Left');
  const gateR = clone.getObjectByName('Gate_Right');
  const banL = clone.getObjectByName('Banner_Shu_L');
  const banR = clone.getObjectByName('Banner_Shu_R');

  const openRad = Math.max(0, Math.min(1, gateOpen)) * (Math.PI * 0.58);
  if (gateL) gateL.rotation.y = openRad; // swings cleanly inward toward interior city
  if (gateR) gateR.rotation.y = -openRad;

  const drop = Math.max(0, Math.min(1, bannersDown));
  if (banL) {
    banL.position.y = 5.35 - drop * 4.8;
    banL.visible = drop < 0.98;
  }
  if (banR) {
    banR.position.y = 5.35 - drop * 4.8;
    banR.visible = drop < 0.98;
  }

  return (
    <>
      <XichengEnvAndBake model={clone} />
      <primitive object={clone} />
    </>
  );
};

// ==================== 3D HAND PROPS & EFFECTS ====================

export const FeatherFan3D: React.FC<{ at: V3; yaw?: number; wave?: number }> = ({
  at,
  yaw = 0,
  wave = 0,
}) => (
  <group position={at} rotation={[0.15, yaw, -0.35 + wave]}>
    <mesh position={[0, 0.08, 0]}>
      <cylinderGeometry args={[0.015, 0.018, 0.24, 8]} />
      <meshStandardMaterial color="#805832" roughness={0.6} />
    </mesh>
    {/* White layered goose-feather fan */}
    {[-0.28, -0.14, 0, 0.14, 0.28].map((ang, i) => (
      <mesh key={i} position={[Math.sin(ang) * 0.16, 0.28 + Math.cos(ang) * 0.08, i * 0.004]} rotation={[0, 0, -ang]}>
        <boxGeometry args={[0.095, 0.34, 0.015]} />
        <meshStandardMaterial color="#faf7ee" roughness={0.75} />
      </mesh>
    ))}
  </group>
);

export const Broom3D: React.FC<{ at: V3; yaw?: number; sweep?: number }> = ({
  at,
  yaw = 0,
  sweep = 0,
}) => (
  <group position={at} rotation={[0.2, yaw, -0.25 + sweep]}>
    <mesh position={[0, -0.15, 0]}>
      <cylinderGeometry args={[0.022, 0.024, 1.85, 8]} />
      <meshStandardMaterial color="#9e7a48" roughness={0.8} />
    </mesh>
    <mesh position={[0, -1.12, 0]}>
      <coneGeometry args={[0.26, 0.45, 10]} />
      <meshStandardMaterial color="#c4a462" roughness={0.9} />
    </mesh>
  </group>
);

export const WeiSpear3D: React.FC<{ at: V3; yaw?: number; tilt?: number }> = ({
  at,
  yaw = 0,
  tilt = 0,
}) => (
  <group position={at} rotation={[0, yaw, tilt]}>
    <mesh position={[0, 0.25, 0]}>
      <cylinderGeometry args={[0.022, 0.026, 2.5, 8]} />
      <meshStandardMaterial color="#4a3322" roughness={0.75} />
    </mesh>
    <mesh position={[0, 1.38, 0]}>
      <coneGeometry args={[0.065, 0.18, 8]} />
      <meshStandardMaterial color="#962020" roughness={0.8} />
    </mesh>
    <mesh position={[0, 1.62, 0]}>
      <coneGeometry args={[0.075, 0.34, 4]} />
      <meshStandardMaterial color="#cfd2cc" metalness={0.75} roughness={0.28} />
    </mesh>
  </group>
);

export const WeiBannerProp: React.FC<{ at: V3; f: number; seed?: number }> = ({ at, f, seed = 0 }) => (
  <group position={at}>
    <mesh position={[0, 2.2, 0]}>
      <cylinderGeometry args={[0.035, 0.04, 4.4, 8]} />
      <meshStandardMaterial color="#2e241d" roughness={0.8} />
    </mesh>
    {[0, 1, 2, 3].map((j) => (
      <mesh
        key={j}
        position={[0.2 + j * 0.22, 3.6 + Math.sin(f * 0.1 + j * 0.7 + seed) * 0.06, 0]}
        rotation={[0, Math.sin(f * 0.09 + j * 0.6 + seed) * 0.22, 0]}
      >
        <boxGeometry args={[0.24, 1.25, 0.025]} />
        <meshStandardMaterial color={j === 0 ? '#d4a644' : '#851e1e'} roughness={0.75} />
      </mesh>
    ))}
  </group>
);

/** Gently rising aromatic incense smoke ribbons from the bronze burner atop the gate tower. */
export const IncenseSmoke3D: React.FC<{ at: V3; f: number }> = ({ at, f }) => (
  <group position={at}>
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const cycle = ((f * 0.018 + i / 6) % 1);
      const y = cycle * 1.45;
      const x = Math.sin(cycle * 5.2 + i) * 0.12;
      const sc = 0.04 + cycle * 0.11;
      const op = Math.sin(cycle * Math.PI) * 0.32;
      return (
        <mesh key={i} position={[x, y, 0]} scale={[sc, sc * 1.3, sc]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#f5ede0" transparent opacity={op} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

/** Billowing golden dust clouds kicked up by 150,000 Wei troops outside Xicheng. */
export const DustClouds3D: React.FC<{ f: number; zCenter?: number; density?: number }> = ({
  f,
  zCenter = 24,
  density = 1,
}) => (
  <group>
    {Array.from({ length: 12 }, (_, i) => {
      const x = -12 + (i % 6) * 4.8 + Math.sin(f * 0.02 + i) * 0.8;
      const z = zCenter + Math.floor(i / 6) * 5.0 + Math.cos(f * 0.018 + i) * 0.7;
      const y = 0.7 + (i % 3) * 0.55 + Math.sin(f * 0.03 + i) * 0.18;
      const r = (2.4 + (i % 3) * 0.6) * density;
      return (
        <mesh key={i} position={[x, y, z]} scale={[r * 1.65, r * 0.58, r]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#d4b07c" transparent opacity={0.14 * density} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

/** Reusable Y-billboarded articulated Zhuge character sprite with optional 3D hand props. */
export const ZhugeActor: React.FC<{
  role: ZhugeRole;
  at: V3;
  cam: V3;
  f: number;
  h?: number;
  variant?: number;
  expr?: ZhugeExpr;
  mouthOpen?: number;
  armL?: [number, number];
  armR?: [number, number];
  walkAmp?: number;
  walkSpeed?: number;
  lean?: number;
  headTilt?: number;
  gazeX?: number;
  fixedYaw?: number;
  sitting?: boolean;
  sweat?: boolean;
  fan?: boolean;
  broom?: boolean;
  spear?: boolean;
  seed?: number;
}> = ({
  role,
  at,
  cam,
  f,
  h = 1.98,
  variant = 0,
  expr = 'neutral',
  mouthOpen = 0,
  armL,
  armR,
  walkAmp = 0,
  walkSpeed = 0.28,
  lean = 0,
  headTilt = 0,
  gazeX = 0,
  fixedYaw,
  sitting = false,
  sweat = false,
  fan = false,
  broom = false,
  spear = false,
  seed = 1,
}) => {
  const { canvas, tex } = useMemo(() => makeZhugeTexture(), []);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const dynArmR: [number, number] =
    armR ??
    (mouthOpen > 0.1
      ? [28 + Math.sin(f * 0.22 + seed) * 12, 32]
      : spear
        ? [34, 16]
        : [20, 12]);
  const dynArmL: [number, number] =
    armL ?? (walkAmp > 0.1 ? [16 + Math.sin(f * walkSpeed) * 24, 12] : [16, -8]);

  const pose: ZhugeCharPose = {
    role,
    seed,
    variant,
    expr,
    mouthOpen,
    armL: dynArmL,
    armR: dynArmR,
    walkPhase: f * walkSpeed + seed,
    walkAmp,
    lean,
    headTilt: headTilt + Math.sin(f * 0.045 + seed) * 1.4,
    gazeX,
    blink: expr !== 'shock' && expr !== 'panic' && (f + seed * 19) % 133 < 4,
    breathe: Math.sin(f * 0.06 + seed),
    sweat,
    sitting,
  };

  if (!ctxRef.current) ctxRef.current = canvas.getContext('2d');
  if (ctxRef.current) {
    drawZhugeChar(ctxRef.current, pose);
    tex.needsUpdate = true;
  }

  const w = h * ZHUGE_ASPECT;
  const yaw = fixedYaw !== undefined ? fixedYaw : Math.atan2(cam[0] - at[0], cam[2] - at[2]);
  const handR = fan || broom || spear ? zhugeHandWorld(pose, 'R', at, h, cam, fixedYaw) : null;

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
      {fan && handR && <FeatherFan3D at={handR} yaw={yaw} wave={Math.sin(f * 0.12) * 0.18} />}
      {broom && handR && <Broom3D at={handR} yaw={yaw} sweep={Math.sin(f * 0.14 + seed) * 0.22} />}
      {spear && handR && <WeiSpear3D at={handR} yaw={yaw} />}
    </>
  );
};

import React from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";
import { Body, Pose3, Rig3D } from "./objectsRig";

const INK = "#0d0b14";
const GRAD = (() => {
  const d = new Uint8Array([85, 150, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const B: React.FC<{ size: Vec3; color: string; pos?: Vec3; rot?: Vec3; hull?: number }> = ({ size, color, pos = [0, 0, 0], rot = [0, 0, 0], hull = 0.05 }) => (
  <group position={pos} rotation={rot}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshToonMaterial color={color} gradientMap={GRAD} />
    </mesh>
    <mesh scale={1 + hull}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

/** Matchlock arquebus (tanegashima), held in a character's pelvis-local frame. */
export const Matchlock: React.FC<{ position?: Vec3; rotation?: Vec3; fire?: number }> = ({ position = [0, 0, 0], rotation = [0, 0, 0], fire = 0 }) => (
  <group position={position} rotation={rotation}>
    <B size={[0.07, 0.12, 0.5]} color="#5a3a22" pos={[0, 0, -0.18]} />
    <mesh position={[0, 0.03, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.022, 0.026, 0.95, 8]} />
      <meshToonMaterial color="#222530" gradientMap={GRAD} />
    </mesh>
    <mesh position={[0, 0.095, -0.02]}>
      <sphereGeometry args={[0.022, 6, 6]} />
      <meshBasicMaterial color="#ff7a1f" />
    </mesh>
    {fire > 0 ? (
      <group position={[0, 0.03, 0.92]}>
        <mesh scale={[1 + fire, 1 + fire, 1 + 2 * fire]}>
          <coneGeometry args={[0.12, 0.5, 8]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.9 * (1 - fire * 0.3)} />
        </mesh>
        <pointLight intensity={60 * fire} distance={9} color="#ffb04a" />
      </group>
    ) : null}
  </group>
);

/** Low-poly war horse with a gallop cycle (phase in cycles). */
export const Horse3D: React.FC<{ position: Vec3; rotationY?: number; scale?: number; phase?: number; t: number; color?: string; armor?: boolean; rider?: { body: Body; pose?: Pose3 } }> = ({ position, rotationY = 0, scale = 1, phase = 0, t, color = "#3b2a22", armor = true, rider }) => {
  const ph = phase * Math.PI * 2;
  const bob = Math.sin(ph * 2) * 0.06;
  const pitch = Math.sin(ph * 2 + 0.6) * 0.05;
  const leg = (x: number, z: number, off: number) => {
    const a = Math.sin(ph + off);
    const lift = Math.max(0, Math.cos(ph + off));
    return (
      <group key={`${x}${z}`} position={[x, 0.72, z]} rotation={[a * 0.7, 0, 0]}>
        <B size={[0.14, 0.4, 0.16]} color={color} pos={[0, -0.2, 0]} />
        <group position={[0, -0.4, 0]} rotation={[-lift * 0.9, 0, 0]}>
          <B size={[0.1, 0.4, 0.12]} color={color} pos={[0, -0.2, 0]} />
          <B size={[0.13, 0.08, 0.17]} color="#14100e" pos={[0, -0.42, 0.02]} />
        </group>
      </group>
    );
  };
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={[0, bob, 0]} rotation={[pitch, 0, 0]}>
        <B size={[0.55, 0.55, 1.3]} color={color} pos={[0, 1.0, 0]} />
        <B size={[0.5, 0.5, 0.5]} color={color} pos={[0, 1.02, 0.55]} />
        <B size={[0.22, 0.6, 0.26]} color={color} pos={[0, 1.4, 0.78]} rot={[0.5, 0, 0]} />
        <B size={[0.2, 0.22, 0.46]} color={color} pos={[0, 1.66, 1.0]} rot={[0.4, 0, 0]} />
        <B size={[0.05, 0.3, 0.12]} color="#14100e" pos={[0, 1.55, 0.7]} rot={[0.5, 0, 0]} />
        <B size={[0.1, 0.1, 0.4]} color="#14100e" pos={[0, 0.98, -0.8]} rot={[-0.7 + Math.sin(ph * 2) * 0.2, 0, 0]} />
        {armor && <B size={[0.62, 0.42, 0.7]} color="#7a1018" pos={[0, 1.02, 0.0]} hull={0.03} />}
        {leg(-0.17, 0.5, 0)}
        {leg(0.17, 0.5, 0.35)}
        {leg(-0.17, -0.5, 1.6)}
        {leg(0.17, -0.5, 1.95)}
        {rider && (
          <Rig3D position={[0, 0.78, -0.1]} t={t} body={rider.body} pose={rider.pose} seed={4} shadow={false} />
        )}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} scale={[1, 1.7, 1]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
};

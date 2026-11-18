import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Vec3 } from "./objects";

const WOOD = "#6b4526";
const DARK_WOOD = "#3d2612";

/* ------------------------------------------------------------------ */
/* Genkō Bōrui — 20 km defensive stone wall along Hakata Bay (1281).  */
/* ------------------------------------------------------------------ */
export const StoneWall: React.FC<{
  position?: Vec3;
  length?: number;
  frame: number;
}> = ({ position = [0, 0, 10], length = 44, frame }) => {
  const stones = useMemo(() => {
    const arr: { pos: Vec3; scale: Vec3; shade: string }[] = [];
    const cols = 6;
    const rows = 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * (length / cols) + (r % 2) * 0.6;
        const y = 0.55 + r * 0.95;
        const z = (random(`sw-z-${r}-${c}`) - 0.5) * 0.18 - r * 0.1;
        const w = length / cols - 0.12;
        const h = 0.92;
        const d = 1.4 - r * 0.15;
        const v = Math.floor(100 + random(`sw-c-${r}-${c}`) * 40);
        arr.push({
          pos: [x, y, z],
          scale: [w, h, d],
          shade: `rgb(${v}, ${v - 4}, ${v - 10})`,
        });
      }
    }
    return arr;
  }, [length]);

  const flicker = 0.8 + 0.25 * Math.sin(frame * 1.3) * Math.cos(frame * 0.7);

  return (
    <group position={position}>
      {/* Sandy embankment base */}
      <mesh position={[0, -0.2, 2.2]}>
        <boxGeometry args={[length + 10, 1.2, 8]} />
        <meshStandardMaterial color="#6e5c44" roughness={1} />
      </mesh>

      {/* Interlocking stone blocks */}
      {stones.map((s, i) => (
        <mesh key={i} position={s.pos} scale={s.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={s.shade} roughness={0.9} flatShading />
        </mesh>
      ))}

      {/* Wooden standing shields (tate) + blazing braziers (kagaribi) */}
      {[-12, -7, -2, 3, 8, 13].map((x, i) => (
        <group key={i} position={[x, 2.25, -0.35]}>
          {/* Wooden shield */}
          <mesh position={[0, 0.35, 0]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.9, 1.1, 0.08]} />
            <meshStandardMaterial color="#4a2e16" roughness={0.9} />
          </mesh>
          {/* Clan crest stripe on shield */}
          <mesh position={[0, 0.42, -0.05]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.7, 0.18, 0.02]} />
            <meshBasicMaterial color="#c42b1c" />
          </mesh>

          {/* Iron brazier on every other post */}
          {i % 2 === 0 && (
            <group position={[1.4, 0, 0.2]}>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.22, 0.08, 0.6, 6]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.72, 0]} scale={[1, 0.9 + 0.25 * Math.sin(frame * 0.9 + i), 1]}>
                <coneGeometry args={[0.26, 0.65, 6]} />
                <meshBasicMaterial color="#ff8a1e" />
              </mesh>
              <mesh position={[0, 0.68, 0]}>
                <sphereGeometry args={[0.16, 6, 6]} />
                <meshBasicMaterial color="#fff1a8" />
              </mesh>
              <pointLight
                position={[0, 1.1, 0]}
                intensity={8 * flicker}
                distance={11}
                color="#ff7b1a"
              />
            </group>
          )}
        </group>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Samurai Kobaya — small agile night-raid boarding boat.             */
/* ------------------------------------------------------------------ */
export const RaidBoat: React.FC<{
  position: Vec3;
  rotationY?: number;
  t: number;
  phase?: number;
}> = ({ position, rotationY = 0, t, phase = 0 }) => {
  const bob = Math.sin(t * 2.2 + phase) * 0.1;
  const pitch = Math.sin(t * 1.8 + phase) * 0.05;
  const oarSwing = Math.sin(t * 5 + phase) * 0.45;
  return (
    <group
      position={[position[0], position[1] + bob, position[2]]}
      rotation={[pitch, rotationY, 0]}
    >
      {/* Sleek low hull */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.9, 0.35, 2.6]} />
        <meshStandardMaterial color="#593a1e" roughness={0.85} flatShading />
      </mesh>
      {/* Sharp prow */}
      <mesh position={[0, 0.28, -1.55]} rotation={[-0.35, 0, 0]}>
        <coneGeometry args={[0.48, 0.9, 4]} />
        <meshStandardMaterial color="#593a1e" roughness={0.85} flatShading />
      </mesh>
      {/* Torch at the prow */}
      <mesh position={[0, 0.62, -1.7]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshBasicMaterial color="#ffcc55" />
      </mesh>
      <pointLight position={[0, 0.8, -1.7]} intensity={4} distance={6} color="#ff8822" />
      {/* Oars */}
      {[-1, 1].map((side) =>
        [-0.4, 0.4].map((z, j) => (
          <mesh
            key={`${side}-${j}`}
            position={[side * 0.55, 0.22, z]}
            rotation={[0, side * oarSwing, side * -0.55]}
          >
            <boxGeometry args={[0.95, 0.04, 0.08]} />
            <meshStandardMaterial color="#8c6239" />
          </mesh>
        ))
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Heavy iron chain stretched between two 3D points.                  */
/* ------------------------------------------------------------------ */
export const IronChain: React.FC<{
  from: Vec3;
  to: Vec3;
  links?: number;
  sag?: number;
  glow?: number;
}> = ({ from, to, links = 14, sag = 0.28, glow = 0 }) => {
  const items = useMemo(() => {
    const out: { pos: Vec3; rot: Vec3 }[] = [];
    for (let i = 0; i <= links; i++) {
      const u = i / links;
      const x = from[0] + (to[0] - from[0]) * u;
      const y = from[1] + (to[1] - from[1]) * u - Math.sin(u * Math.PI) * sag;
      const z = from[2] + (to[2] - from[2]) * u;
      out.push({
        pos: [x, y, z],
        rot: [i % 2 === 0 ? 0 : Math.PI / 2, 0, 0.2],
      });
    }
    return out;
  }, [from, to, links, sag]);

  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} rotation={it.rot}>
          <torusGeometry args={[0.13, 0.042, 8, 14]} />
          <meshStandardMaterial
            color="#c7d0dc"
            metalness={0.9}
            roughness={0.25}
            emissive="#ff8822"
            emissiveIntensity={glow * 0.6}
          />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Mongol ship that can pitch violently, snap its mast, and sink.     */
/* ------------------------------------------------------------------ */
export const SinkingShip: React.FC<{
  position: Vec3;
  t: number;
  phase?: number;
  scale?: number;
  rotationY?: number;
  listAngle?: number; // radians roll (heeling / capsizing)
  pitchAngle?: number; // extra pitch
  sink?: number; // vertical sink depth
  mastBreak?: number; // 0 = intact, 1 = snapped & falling
  sailColor?: string;
}> = ({
  position,
  t,
  phase = 0,
  scale = 1,
  rotationY = 0,
  listAngle = 0,
  pitchAngle = 0,
  sink = 0,
  mastBreak = 0,
  sailColor = "#9a2a1c",
}) => {
  const bob = Math.sin(t * 2.2 + phase) * 0.28;
  const roll = Math.sin(t * 1.9 + phase) * 0.14 + listAngle;
  const pitch = Math.sin(t * 1.5 + phase * 1.3) * 0.09 + pitchAngle;

  return (
    <group
      position={[position[0], position[1] + bob - sink, position[2]]}
      rotation={[pitch, rotationY, roll]}
      scale={scale}
    >
      {/* Hull */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.7, 0.8, 4.2]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.65, 2.25]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[1.5, 0.5, 1.0]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 1.05, -1.6]}>
        <boxGeometry args={[1.6, 0.8, 1.2]} />
        <meshStandardMaterial color={DARK_WOOD} roughness={0.9} flatShading />
      </mesh>

      {/* Main mast (can snap at deck level) */}
      <group
        position={[0, 0.7, 0.7]}
        rotation={[mastBreak * 0.4, 0, mastBreak * 1.25]}
      >
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 3.8, 6]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
        <mesh position={[0, 1.9, 0]}>
          <boxGeometry args={[2.3, 2.5, 0.05]} />
          <meshStandardMaterial color={sailColor} roughness={1} side={THREE.DoubleSide} />
        </mesh>
        {[-0.9, -0.3, 0.3, 0.9].map((y) => (
          <mesh key={y} position={[0, 1.9 + y, 0.04]}>
            <boxGeometry args={[2.35, 0.05, 0.06]} />
            <meshStandardMaterial color={DARK_WOOD} />
          </mesh>
        ))}
      </group>

      {/* Rear mast */}
      <group
        position={[0, 0.7, -0.4]}
        rotation={[-mastBreak * 0.35, 0, -mastBreak * 0.9]}
      >
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.045, 0.07, 3.4, 6]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[1.9, 2.0, 0.05]} />
          <meshStandardMaterial color={sailColor} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* 3D Typhoon Vortex — swirling wind rings & flying ship debris.      */
/* ------------------------------------------------------------------ */
export const TyphoonVortex: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame / 30;
  const rings = useMemo(
    () =>
      new Array(12).fill(0).map((_, i) => ({
        y: 5.0 + i * 0.9,
        radius: 4.0 + i * 1.4,
        tiltX: (random(`tv-tx-${i}`) - 0.5) * 0.08,
        tiltZ: (random(`tv-tz-${i}`) - 0.5) * 0.08,
        speed: 1.8 + (i % 3) * 0.4,
        arc: Math.PI * (0.6 + random(`tv-a-${i}`) * 0.5),
        offset: random(`tv-o-${i}`) * Math.PI * 2,
      })),
    []
  );

  const debris = useMemo(
    () =>
      new Array(45).fill(0).map((_, i) => ({
        r: 2.5 + random(`td-r-${i}`) * 14,
        yBase: 0.8 + random(`td-y-${i}`) * 12,
        speed: 2.0 + random(`td-s-${i}`) * 2.5,
        phase: random(`td-p-${i}`) * Math.PI * 2,
        size: [0.15 + random(`td-w-${i}`) * 0.5, 0.06, 0.08 + random(`td-d-${i}`) * 0.15] as Vec3,
      })),
    []
  );

  return (
    <group position={[0, 0, -18]}>
      {rings.map((rg, i) => (
        <mesh
          key={i}
          position={[Math.sin(t * 1.5 + i) * 0.6, rg.y, Math.cos(t * 1.2 + i) * 0.6]}
          rotation={[Math.PI / 2 + rg.tiltX, rg.offset + t * rg.speed, rg.tiltZ]}
        >
          <torusGeometry args={[rg.radius, 0.08, 6, 36, rg.arc]} />
          <meshBasicMaterial color="#9cb8e8" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ))}
      {debris.map((d, i) => {
        const a = d.phase + t * d.speed;
        return (
          <mesh
            key={`d-${i}`}
            position={[Math.cos(a) * d.r, d.yBase + Math.sin(t * 3 + i) * 0.5, Math.sin(a) * d.r]}
            rotation={[t * 4 + i, t * 3, i]}
          >
            <boxGeometry args={d.size} />
            <meshStandardMaterial color={i % 4 === 0 ? "#9a2a1c" : WOOD} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Floating wreckage on the calm sea at dawn.                         */
/* ------------------------------------------------------------------ */
export const FloatingWreckage: React.FC<{ t: number }> = ({ t }) => {
  const pieces = useMemo(
    () =>
      new Array(28).fill(0).map((_, i) => ({
        x: (random(`fw-x-${i}`) - 0.5) * 28,
        z: -6 - random(`fw-z-${i}`) * 28,
        rotY: random(`fw-ry-${i}`) * Math.PI * 2,
        phase: random(`fw-p-${i}`) * 6,
        type: i % 4 === 0 ? "sail" : i % 3 === 0 ? "mast" : "plank",
      })),
    []
  );

  return (
    <group>
      {pieces.map((p, i) => {
        const bob = Math.sin(t * 1.3 + p.phase) * 0.06;
        return (
          <group key={i} position={[p.x, 0.05 + bob, p.z]} rotation={[0, p.rotY, 0]}>
            {p.type === "sail" && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.6, 1.1]} />
                <meshStandardMaterial color="#7a1c12" side={THREE.DoubleSide} roughness={1} />
              </mesh>
            )}
            {p.type === "mast" && (
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.06, 0.08, 2.8, 6]} />
                <meshStandardMaterial color={DARK_WOOD} roughness={0.9} />
              </mesh>
            )}
            {p.type === "plank" && (
              <mesh>
                <boxGeometry args={[1.1, 0.08, 0.28]} />
                <meshStandardMaterial color={WOOD} roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

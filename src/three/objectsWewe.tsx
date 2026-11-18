import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Vec3 } from "./objects";

/* ------------------------------------------------------------------ */
/* Village ground + dirt path + drifting eerie ground mist.           */
/* ------------------------------------------------------------------ */
export const VillageGround: React.FC<{ t: number; mistColor?: string }> = ({
  t,
  mistColor = "#3a1e3d",
}) => {
  const mistPuffs = useMemo(
    () =>
      new Array(6).fill(0).map((_, i) => ({
        x: (random(`mg-x-${i}`) - 0.5) * 22,
        z: -20 + random(`mg-z-${i}`) * 26,
        r: 2.2 + random(`mg-r-${i}`) * 2.2,
        sp: 0.4 + random(`mg-s-${i}`) * 0.6,
        ph: random(`mg-p-${i}`) * 6,
      })),
    []
  );

  return (
    <group>
      {/* Main village earth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
        <planeGeometry args={[120, 120, 16, 16]} />
        <meshStandardMaterial color="#181216" roughness={1} />
      </mesh>
      {/* Winding dirt path */}
      <mesh rotation={[-Math.PI / 2, 0, 0.08]} position={[0, 0.02, -4]}>
        <planeGeometry args={[3.4, 60]} />
        <meshStandardMaterial color="#2b1e17" roughness={1} />
      </mesh>
      {/* Low drifting ground mist */}
      {mistPuffs.map((m, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[m.x + Math.sin(t * m.sp + m.ph) * 1.4, 0.18 + (i % 3) * 0.12, m.z]}
        >
          <circleGeometry args={[m.r, 12]} />
          <meshBasicMaterial color={mistColor} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Pohon Beringin Tua — giant banyan tree with hanging aerial roots.  */
/* ------------------------------------------------------------------ */
export const BeringinTree: React.FC<{
  position?: Vec3;
  scale?: number;
  t: number;
  eerieGlow?: number;
}> = ({ position = [0, 0, -10], scale = 1, t, eerieGlow = 0 }) => {
  const roots = useMemo(
    () =>
      new Array(18).fill(0).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = 1.4 + random(`br-r-${i}`) * 2.0;
        const len = 2.0 + random(`br-l-${i}`) * 1.8;
        return {
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          len,
          ph: random(`br-p-${i}`) * 6,
        };
      }),
    []
  );

  const canopy = useMemo(
    () => [
      { pos: [0, 5.2, 0] as Vec3, r: 2.9 },
      { pos: [-2.1, 4.5, 0.6] as Vec3, r: 2.2 },
      { pos: [2.2, 4.6, 0.4] as Vec3, r: 2.3 },
      { pos: [-1.4, 4.8, -1.5] as Vec3, r: 2.1 },
      { pos: [1.5, 4.9, -1.4] as Vec3, r: 2.1 },
      { pos: [0, 6.4, -0.3] as Vec3, r: 2.2 },
    ],
    []
  );

  return (
    <group position={position} scale={scale}>
      {/* Gnarled main trunk + buttress roots */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.75, 1.35, 4.4, 8]} />
        <meshStandardMaterial color="#241710" roughness={0.95} flatShading />
      </mesh>
      {[-0.9, 0.9].map((s, i) => (
        <mesh key={i} position={[s * 0.7, 1.2, 0.4]} rotation={[0, 0, s * -0.35]}>
          <cylinderGeometry args={[0.25, 0.55, 2.6, 6]} />
          <meshStandardMaterial color="#241710" roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* Main spreading boughs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.4, 3.8, 0]} rotation={[0, 0, s * -0.7]}>
          <cylinderGeometry args={[0.22, 0.4, 2.8, 6]} />
          <meshStandardMaterial color="#241710" roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* Dense dark foliage clusters */}
      {canopy.map((c, i) => (
        <mesh key={i} position={c.pos}>
          <icosahedronGeometry args={[c.r, 1]} />
          <meshStandardMaterial color="#122019" roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* Hanging aerial roots (akar gantung beringin) swaying in the wind */}
      {roots.map((rt, i) => (
        <mesh
          key={i}
          position={[rt.x, 3.8 - rt.len / 2, rt.z]}
          rotation={[Math.sin(t * 1.6 + rt.ph) * 0.08, 0, Math.cos(t * 1.4 + rt.ph) * 0.08]}
        >
          <cylinderGeometry args={[0.03, 0.045, rt.len, 4]} />
          <meshStandardMaterial color="#382316" roughness={0.9} />
        </mesh>
      ))}

      {/* Eerie crimson/amber spirit glow inside the banyan roots */}
      {eerieGlow > 0 && (
        <pointLight
          position={[0, 2.6, 1.2]}
          intensity={14 * eerieGlow}
          distance={12}
          color="#ff3311"
        />
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Rumah Kampung Jawa (Limasan / Joglo) with warm porch lantern.      */
/* ------------------------------------------------------------------ */
export const KampungHouse: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  lightOn?: boolean;
}> = ({ position, rotationY = 0, scale = 1, lightOn = true }) => {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Walls */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[3.4, 2.2, 2.8]} />
        <meshStandardMaterial color="#3b2b20" roughness={0.9} flatShading />
      </mesh>
      {/* Terracotta pitched roof */}
      <mesh position={[0, 2.75, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.9, 1.5, 4]} />
        <meshStandardMaterial color="#592518" roughness={0.85} flatShading />
      </mesh>
      {/* Wooden door */}
      <mesh position={[0, 0.85, 1.41]}>
        <planeGeometry args={[0.75, 1.6]} />
        <meshStandardMaterial color="#22150d" />
      </mesh>
      {/* Glowing yellow window + porch bulb */}
      {lightOn && (
        <>
          <mesh position={[-0.95, 1.15, 1.42]}>
            <planeGeometry args={[0.65, 0.65]} />
            <meshBasicMaterial color="#ffbe55" />
          </mesh>
          <mesh position={[0.95, 1.15, 1.42]}>
            <planeGeometry args={[0.65, 0.65]} />
            <meshBasicMaterial color="#ffbe55" />
          </mesh>
          <mesh position={[0, 1.95, 1.55]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshBasicMaterial color="#ffe49e" />
          </mesh>
          <pointLight position={[0, 1.9, 1.8]} intensity={5} distance={8} color="#ffaa33" />
        </>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Sosok Wewe Gombel — tall hunched ghostly figure with glowing eyes. */
/* ------------------------------------------------------------------ */
export const WeweGombelFigure: React.FC<{
  position: Vec3;
  scale?: number;
  t: number;
  reveal?: number; // 0..1
}> = ({ position, scale = 1, t, reveal = 1 }) => {
  if (reveal <= 0.01) return null;
  const hover = Math.sin(t * 2.0) * 0.14;
  const sway = Math.sin(t * 1.3) * 0.06;

  return (
    <group
      position={[position[0], position[1] + hover, position[2]]}
      rotation={[0.12, sway, 0]}
      scale={scale * (0.7 + 0.3 * reveal)}
    >
      {/* Tattered dark shroud / dress */}
      <mesh position={[0, 1.4, 0]}>
        <coneGeometry args={[0.95, 2.9, 7]} />
        <meshStandardMaterial color="#17131a" roughness={0.95} flatShading />
      </mesh>
      {/* Hunched upper torso & shoulders */}
      <mesh position={[0, 2.55, 0.12]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[1.15, 0.9, 0.6]} />
        <meshStandardMaterial color="#1f1924" roughness={0.9} flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[0, 3.18, 0.28]}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshStandardMaterial color="#4a4248" roughness={0.9} flatShading />
      </mesh>
      {/* Wild long tangled black hair draping down */}
      <mesh position={[0, 2.75, 0.18]}>
        <coneGeometry args={[0.55, 1.9, 8]} />
        <meshStandardMaterial color="#0b090d" roughness={1} flatShading />
      </mesh>
      {/* Glowing red eyes piercing the dusk */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 3.2, 0.56]}>
          <sphereGeometry args={[0.055, 6, 6]} />
          <meshBasicMaterial color="#ff1e00" />
        </mesh>
      ))}
      <pointLight position={[0, 3.2, 0.8]} intensity={8 * reveal} distance={6} color="#ff2200" />

      {/* Long reaching arms / claws */}
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[s * 0.65, 2.6, 0.25]}
          rotation={[-0.75 + Math.sin(t * 2.5 + s) * 0.15, 0, s * -0.3]}
        >
          <mesh position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.09, 0.06, 1.2, 5]} />
            <meshStandardMaterial color="#3c343a" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Anak kecil & bola yang masih main saat waktu Magrib.               */
/* ------------------------------------------------------------------ */
export const ChildFigure: React.FC<{
  position: Vec3;
  rotationY?: number;
  t: number;
  running?: boolean;
}> = ({ position, rotationY = 0, t, running = false }) => {
  const bounce = running ? Math.abs(Math.sin(t * 7)) * 0.12 : Math.sin(t * 2) * 0.02;
  const legSwing = running ? Math.sin(t * 7) * 0.5 : 0;

  return (
    <group position={[position[0], position[1] + bounce, position[2]]} rotation={[0, rotationY, 0]}>
      {/* Legs */}
      {[-0.12, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 0]} rotation={[i === 0 ? legSwing : -legSwing, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.06, 0.6, 6]} />
          <meshStandardMaterial color="#2b3a4a" />
        </mesh>
      ))}
      {/* Red T-shirt torso */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.42, 0.52, 0.26]} />
        <meshStandardMaterial color="#c92a2a" roughness={0.8} flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.28, 0]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#c69065" flatShading />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#141110" />
      </mesh>
    </group>
  );
};

export const SoccerBall: React.FC<{ position: Vec3; t: number }> = ({ position, t }) => (
  <mesh position={[position[0], position[1] + 0.16, position[2]]} rotation={[t * 4, t * 2, 0]}>
    <icosahedronGeometry args={[0.16, 1]} />
    <meshStandardMaterial color="#e8e8e8" roughness={0.6} flatShading />
  </mesh>
);

/* ------------------------------------------------------------------ */
/* Warga Kampung membawa obor & memukul kentongan bambu.              */
/* ------------------------------------------------------------------ */
export const VillagerWithTorch: React.FC<{
  position: Vec3;
  rotationY?: number;
  t: number;
  phase?: number;
}> = ({ position, rotationY = 0, t, phase = 0 }) => {
  const walk = Math.abs(Math.sin(t * 4 + phase)) * 0.06;
  const strike = Math.sin(t * 14 + phase) * 0.35;
  return (
    <group position={[position[0], position[1] + walk, position[2]]} rotation={[0, rotationY, 0]}>
      {/* Sarung / lower body */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.22, 0.3, 0.9, 6]} />
        <meshStandardMaterial color="#3d271d" flatShading />
      </mesh>
      {/* Baju koko / dark shirt */}
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[0.52, 0.65, 0.32]} />
        <meshStandardMaterial color="#222831" flatShading />
      </mesh>
      {/* Head + peci cap */}
      <mesh position={[0, 1.68, 0]}>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshStandardMaterial color="#b8845c" flatShading />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <cylinderGeometry args={[0.16, 0.17, 0.14, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Raised bamboo torch (obor) in left hand */}
      <group position={[-0.35, 1.45, 0.2]} rotation={[-0.3, 0, 0.2]}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.75, 5]} />
          <meshStandardMaterial color="#6e4b26" />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <coneGeometry args={[0.14, 0.38, 6]} />
          <meshBasicMaterial color="#ff9922" />
        </mesh>
        <pointLight position={[0, 0.95, 0]} intensity={5} distance={7} color="#ff7711" />
      </group>
      {/* Bamboo kentongan in right hand */}
      <group position={[0.35, 1.25, 0.28]} rotation={[strike, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.45, 6]} />
          <meshStandardMaterial color="#8c6d32" />
        </mesh>
      </group>
    </group>
  );
};

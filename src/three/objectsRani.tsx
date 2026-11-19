import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Vec3 } from "./objects";

/* ------------------------------------------------------------------ */
/* Person — low-poly villager. Hair is a dome of thin strands that can  */
/* lie flat (hairUp = 0) or stand up and lean toward `lean` (hairUp = 1) */
/* ------------------------------------------------------------------ */
export type HairStyle = "short" | "bald" | "ponytail" | "bun";

export const Person: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  skin?: string;
  shirt?: string;
  pants?: string;
  hair?: string;
  style?: HairStyle;
  hairUp?: number; // 0..1
  lean?: [number, number]; // local x,z direction the standing hair leans toward
  walking?: boolean;
  walkF?: number;
  armsUp?: number; // 0..1 raise both arms
  pointArm?: number; // 0..1 right arm points forward
  shake?: number; // 0..1 jolt
  apron?: string;
  seed?: string;
}> = ({
  position,
  rotationY = 0,
  scale = 1,
  t,
  skin = "#c89068",
  shirt = "#3b82c4",
  pants = "#3b3f63",
  hair = "#1c1410",
  style = "short",
  hairUp = 0,
  lean = [0, 0],
  walking = false,
  walkF = 2.0,
  armsUp = 0,
  pointArm = 0,
  shake = 0,
  apron,
  seed = "p",
}) => {
  const ph = Math.PI * walkF * t;
  const c = walking ? Math.cos(ph) : 0;
  const bob = walking ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(t * 2.2) * 0.01;
  const jx = shake * Math.sin(t * 60) * 0.05;
  const R = 0.19;
  const headY = 1.62;

  const strands = useMemo(() => {
    if (style === "bald") return [];
    const N = style === "ponytail" ? 26 : style === "bun" ? 16 : 30;
    return new Array(N).fill(0).map((_, i) => {
      const phi = i * 2.399963 + random(`${seed}-p${i}`) * 0.4;
      const theta = Math.acos(1 - ((i + 0.5) / N) * 0.9);
      return {
        phi,
        theta,
        j1: random(`${seed}-a${i}`) - 0.5,
        j2: random(`${seed}-b${i}`) - 0.5,
        ph: random(`${seed}-c${i}`) * 6,
      };
    });
  }, [style, seed]);

  const strandMeshes = strands.map((s, i) => {
    const p = new THREE.Vector3(R * Math.sin(s.theta) * Math.cos(s.phi), R * Math.cos(s.theta), R * Math.sin(s.theta) * Math.sin(s.phi));
    const n = p.clone().normalize();
    const lying = n.clone().add(new THREE.Vector3(0, -0.85, 0)).normalize();
    const stand = new THREE.Vector3(
      s.j1 * 0.35 + lean[0] * 0.55 + Math.sin(t * 11 + s.ph) * 0.05,
      1,
      s.j2 * 0.35 + lean[1] * 0.55 + Math.cos(t * 9 + s.ph) * 0.05
    ).normalize();
    const dir = lying.clone().lerp(stand, hairUp).normalize();
    const len = 0.075 + 0.1 * hairUp;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const pos = p.clone().add(dir.clone().multiplyScalar(len / 2));
    return (
      <mesh key={i} position={[pos.x, pos.y, pos.z]} quaternion={[q.x, q.y, q.z, q.w]}>
        <coneGeometry args={[0.016, len, 4]} />
        <meshStandardMaterial color={hair} roughness={1} flatShading />
      </mesh>
    );
  });

  const arm = (side: number) => {
    const swing = walking ? -side * 0.5 * c : 0;
    const up = -armsUp * 2.7;
    const point = side > 0 ? -pointArm * 1.45 : 0;
    const rx = swing + up + point;
    return (
      <group key={side} position={[side * 0.31, 1.38, 0]} rotation={[rx, 0, side * (0.06 + armsUp * 0.35)]}>
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.055, 0.05, 0.56, 6]} />
          <meshStandardMaterial color={skin} roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color={skin} roughness={0.9} flatShading />
        </mesh>
      </group>
    );
  };

  return (
    <group position={[position[0] + jx, position[1] + bob, position[2]]} rotation={[0, rotationY, shake * Math.sin(t * 50) * 0.06]} scale={scale}>
      {/* legs + shoes */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.11, 0.86, 0]} rotation={[sd * 0.55 * c, 0, 0]}>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[0.095, 0.08, 0.86, 7]} />
            <meshStandardMaterial color={pants} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, -0.86, 0.05]}>
            <boxGeometry args={[0.13, 0.07, 0.24]} />
            <meshStandardMaterial color="#222" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* torso */}
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[0.56, 0.62, 0.3]} />
        <meshStandardMaterial color={shirt} roughness={0.85} flatShading />
      </mesh>
      {apron && (
        <mesh position={[0, 1.08, 0.155]}>
          <boxGeometry args={[0.46, 0.5, 0.02]} />
          <meshStandardMaterial color={apron} roughness={0.9} />
        </mesh>
      )}
      {arm(-1)}
      {arm(1)}
      {/* head */}
      <mesh position={[0, headY, 0]}>
        <sphereGeometry args={[R, 10, 8]} />
        <meshStandardMaterial color={skin} roughness={0.9} flatShading />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, headY + 0.02, R * 0.93]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshBasicMaterial color="#1a1210" />
        </mesh>
      ))}
      <mesh position={[0, headY - 0.07, R * 0.95]}>
        <boxGeometry args={[0.07, 0.018, 0.01]} />
        <meshBasicMaterial color="#6b2b2b" />
      </mesh>
      {/* hair */}
      <group position={[0, headY, 0]}>{strandMeshes}</group>
      {style === "ponytail" && (
        <mesh position={[0, headY - 0.02, -R - 0.05 + hairUp * 0.0]} rotation={[0.5 - hairUp * 0.4, 0, 0]}>
          <coneGeometry args={[0.06, 0.34, 5]} />
          <meshStandardMaterial color={hair} flatShading />
        </mesh>
      )}
      {style === "bun" && (
        <mesh position={[0, headY + 0.16, -0.05]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={hair} flatShading />
        </mesh>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* The warung: back wall, iron shelves with goods, counter, vinyl floor */
/* ------------------------------------------------------------------ */
export const WarungSet: React.FC<{ rainy?: boolean }> = ({ rainy = false }) => {
  const tiles = useMemo(() => {
    const out: { x: number; z: number; a: boolean }[] = [];
    for (let i = -8; i < 8; i++) for (let j = -5; j < 12; j++) out.push({ x: i * 0.5 + 0.25, z: j * 0.5 + 0.25 - 0.5, a: (i + j) % 2 === 0 });
    return out;
  }, []);
  const goods = useMemo(
    () => new Array(18).fill(0).map((_, i) => ({ x: -1.5 + (i % 6) * 0.6, y: 0.58 + Math.floor(i / 6) * 0.72, c: ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#457b9d", "#9b5de5"][(i * 5) % 6] })),
    []
  );
  return (
    <group>
      {/* base floor reaching toward the camera */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]}>
        <planeGeometry args={[14, 22]} />
        <meshStandardMaterial color="#cfe9dc" roughness={0.6} />
      </mesh>
      {/* vinyl floor (checker) */}
      {tiles.map((tl, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[tl.x, 0.005, tl.z]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial color={tl.a ? "#7fc8a9" : "#cfe9dc"} roughness={0.35} metalness={0.05} />
        </mesh>
      ))}
      {/* back wall */}
      <mesh position={[0, 2.2, -2.7]}>
        <boxGeometry args={[7, 4.4, 0.15]} />
        <meshStandardMaterial color={rainy ? "#b9c4cf" : "#f5e6c8"} roughness={1} />
      </mesh>
      {/* iron shelves */}
      {[0, 1, 2].map((r) => (
        <mesh key={r} position={[0, 0.3 + r * 0.72, -2.35]}>
          <boxGeometry args={[3.9, 0.04, 0.5]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.25} roughness={0.45} />
        </mesh>
      ))}
      {[-1.9, 1.9].map((x) => (
        <mesh key={x} position={[x, 1.1, -2.35]}>
          <boxGeometry args={[0.05, 2.3, 0.5]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.25} roughness={0.45} />
        </mesh>
      ))}
      {goods.map((g, i) => (
        <mesh key={i} position={[g.x, g.y, -2.33]}>
          <boxGeometry args={[0.38, 0.4, 0.3]} />
          <meshStandardMaterial color={g.c} roughness={0.7} flatShading />
        </mesh>
      ))}
      {/* counter */}
      <mesh position={[1.25, 0.45, -1.15]}>
        <boxGeometry args={[1.6, 0.9, 0.7]} />
        <meshStandardMaterial color="#8a5a35" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[1.25, 0.93, -1.15]}>
        <boxGeometry args={[1.7, 0.06, 0.78]} />
        <meshStandardMaterial color="#c8935a" roughness={0.8} />
      </mesh>
      {/* kitchen roof overhang */}
      <mesh position={[0, 3.55, -0.9]}>
        <boxGeometry args={[7, 0.12, 3.6]} />
        <meshStandardMaterial color="#c0392b" roughness={0.9} />
      </mesh>
    </group>
  );
};

/** Iron pole of the warung's awning, where the static finally discharges. */
export const IronPole: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 1.7, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 3.4, 8]} />
      <meshStandardMaterial color="#b8c2cc" metalness={0.25} roughness={0.45} />
    </mesh>
    <mesh position={[0, 0.03, 0]}>
      <cylinderGeometry args={[0.16, 0.18, 0.06, 8]} />
      <meshStandardMaterial color="#8d99a6" metalness={0.25} roughness={0.5} />
    </mesh>
  </group>
);

/** Basket of tujuh rupa flowers. */
export const FlowerBasket: React.FC<{ position: Vec3; scale?: number; pop?: number }> = ({ position, scale = 1, pop = 1 }) => {
  const flowers = useMemo(
    () => new Array(14).fill(0).map((_, i) => ({ x: (random(`fb-x${i}`) - 0.5) * 0.36, z: (random(`fb-z${i}`) - 0.5) * 0.3, y: 0.2 + random(`fb-y${i}`) * 0.1, c: ["#ff5d8f", "#ffd166", "#ffffff", "#c77dff", "#ff9f1c", "#06d6a0", "#ef476f"][i % 7] })),
    []
  );
  return (
    <group position={position} scale={scale * pop}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.24, 0.17, 0.24, 10]} />
        <meshStandardMaterial color="#b5793c" roughness={1} flatShading />
      </mesh>
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.x, f.y + 0.1, f.z]}>
          <icosahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color={f.c} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
};

export const FloorMat: React.FC<{ position: Vec3; grow?: number }> = ({ position, grow = 1 }) => (
  <group position={position} scale={[grow, 1, grow]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <planeGeometry args={[3.4, 1.9]} />
      <meshStandardMaterial color="#d98e3f" roughness={1} />
    </mesh>
    {[-0.6, 0, 0.6].map((z) => (
      <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, z]}>
        <planeGeometry args={[3.4, 0.12]} />
        <meshStandardMaterial color="#8b4a1b" roughness={1} />
      </mesh>
    ))}
  </group>
);

/** A little burst of static discharge: radiating yellow-white spikes + a flash of light. */
export const Spark: React.FC<{ position: Vec3; s: number; seed?: string }> = ({ position, s, seed = "sp" }) => {
  if (s <= 0.02) return null;
  const rays = new Array(9).fill(0).map((_, i) => {
    const a = (i / 9) * Math.PI * 2 + random(`${seed}${i}`) * 0.5;
    const l = 0.25 + random(`${seed}l${i}`) * 0.25;
    return { a, l };
  });
  return (
    <group position={position} scale={s}>
      {rays.map((r, i) => (
        <mesh key={i} position={[Math.cos(r.a) * r.l * 0.5, Math.sin(r.a) * r.l * 0.5, 0.1]} rotation={[0, 0, r.a - Math.PI / 2]}>
          <boxGeometry args={[0.035, r.l, 0.02]} />
          <meshBasicMaterial color={i % 2 ? "#fff6b0" : "#ffe14d"} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.1]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight position={[0, 0, 0.5]} intensity={14 * s} distance={5} color="#fff2a8" />
    </group>
  );
};

/** Floating "+" charge symbols (the static electricity, made visible). */
export const ChargePlus: React.FC<{ origin: Vec3; t: number; amount: number; spread?: number; seed?: string }> = ({ origin, t, amount, spread = 0.55, seed = "cp" }) => {
  const n = Math.round(14 * amount);
  return (
    <group>
      {new Array(n).fill(0).map((_, i) => {
        const a = random(`${seed}a${i}`) * Math.PI * 2;
        const r = 0.15 + random(`${seed}r${i}`) * spread;
        const life = (t * 0.5 + random(`${seed}t${i}`)) % 1;
        const x = origin[0] + Math.cos(a) * r;
        const y = origin[1] + (random(`${seed}y${i}`) - 0.3) * 1.2 + Math.sin(t * 2 + i) * 0.04;
        const z = origin[2] + Math.sin(a) * r * 0.6 + 0.25;
        return (
          <group key={i} position={[x, y, z]} scale={0.7 + 0.3 * Math.sin(life * Math.PI)}>
            <mesh>
              <boxGeometry args={[0.13, 0.03, 0.02]} />
              <meshBasicMaterial color="#ffd23f" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.03, 0.13, 0.02]} />
              <meshBasicMaterial color="#ffd23f" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export { THREE };

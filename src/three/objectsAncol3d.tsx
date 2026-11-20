import React from "react";
import * as THREE from "three";
import { P } from "./objectsRig";

type V3 = [number, number, number];

/* Matic scooter facing +x. Origin at ground, centre between the wheels. */
export const Scooter3D: React.FC<{ position: V3; rotationY?: number; wheel?: number; color?: string; scale?: number; steer?: number }> = ({ position, rotationY = 0, wheel = 0, color = "#e63946", scale = 1, steer = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
    {[-0.62, 0.58].map((x, i) => (
      <group key={i} position={[x, 0.27, 0]} rotation={[0, 0, -wheel]}>
        <P geo={() => <cylinderGeometry args={[0.27, 0.27, 0.16, 20]} />} color="#26262e" rot={[Math.PI / 2, 0, 0]} hull={0.05} />
        <P geo={() => <cylinderGeometry args={[0.15, 0.15, 0.18, 14]} />} color="#cfd8e3" rot={[Math.PI / 2, 0, 0]} nohull />
        <P geo={() => <boxGeometry args={[0.05, 0.26, 0.19]} />} color="#8a95a5" nohull />
      </group>
    ))}
    {/* rear body */}
    <P geo={() => <boxGeometry args={[0.8, 0.34, 0.36]} />} color={color} pos={[-0.55, 0.62, 0]} rot={[0, 0, 0.1]} hull={0.035} />
    <P geo={() => <sphereGeometry args={[0.2, 14, 10]} />} color={color} pos={[-0.95, 0.66, 0]} scale={[1, 0.9, 1.0]} hull={0.04} />
    {/* seat */}
    <P geo={() => <boxGeometry args={[0.86, 0.1, 0.32]} />} color="#2a2a33" pos={[-0.45, 0.84, 0]} hull={0.04} />
    {/* floorboard */}
    <P geo={() => <boxGeometry args={[0.55, 0.07, 0.34]} />} color="#2a2a33" pos={[0.12, 0.36, 0]} hull={0.04} />
    {/* leg shield / front */}
    <P geo={() => <boxGeometry args={[0.2, 0.8, 0.42]} />} color={color} pos={[0.46, 0.76, 0]} rot={[0, 0, -0.18]} hull={0.035} />
    <P geo={() => <sphereGeometry args={[0.2, 14, 10]} />} color={color} pos={[0.5, 0.36, 0]} scale={[1, 0.8, 0.9]} hull={0.04} />
    {/* handle bar */}
    <group position={[0.52, 1.1, 0]} rotation={[0, steer, 0]}>
      <P geo={() => <cylinderGeometry args={[0.025, 0.025, 0.62, 8]} />} color="#2a2a33" rot={[Math.PI / 2, 0, 0]} nohull />
      <P geo={() => <sphereGeometry args={[0.12, 12, 10]} />} color="#fff7b0" pos={[0.1, -0.05, 0]} hull={0.05} />
      <P geo={() => <sphereGeometry args={[0.06, 8, 8]} />} color="#2a2a33" pos={[0, 0, 0.32]} nohull />
      <P geo={() => <sphereGeometry args={[0.06, 8, 8]} />} color="#2a2a33" pos={[0, 0, -0.32]} nohull />
    </group>
    <P geo={() => <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />} color="#2a2a33" pos={[0.5, 0.92, 0]} rot={[0, 0, -0.18]} nohull />
    {/* tail light */}
    <mesh position={[-1.14, 0.7, 0]}>
      <boxGeometry args={[0.04, 0.08, 0.2]} />
      <meshBasicMaterial color="#ff3b3b" />
    </mesh>
  </group>
);

/* ------------------------------------------------------------------ */
/* Shared bodies                                                         */
/* ------------------------------------------------------------------ */
import type { Body } from "./objectsRig";
export const B_HAPID: Body = { shirt: "#2d6cdf", pants: "#2b3350", hair: "#15121a", hairStyle: "quiff", height: 1.02 };
export const B_ASTI: Body = { shirt: "#f48fb1", pants: "#c0529a", hair: "#c0529a", hairStyle: "hijab", height: 0.93, slim: 0.95, sarong: true };
export const B_KAKAK: Body = { shirt: "#ffb703", pants: "#3b5b92", hair: "#5a3a22", hairStyle: "short", height: 0.96, slim: 0.95 };
export const B_PETUGAS: Body = { shirt: "#2bb673", pants: "#1f2a44", hair: "#2d2d3a", hairStyle: "short", height: 1.0 };
export const B_TEMAN: Body = { shirt: "#9b6bff", pants: "#3a3358", hair: "#2a1a10", hairStyle: "bun", height: 0.94, slim: 0.95 };
export const MASK_H = "#6ec6ff";
export const MASK_A = "#ff9fc4";

/* ------------------------------------------------------------------ */
/* Environment pieces                                                    */
/* ------------------------------------------------------------------ */
export const Ground: React.FC<{ color: string; y?: number; size?: number; z?: number }> = ({ color, y = 0, size = 120, z = 0 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, z]} receiveShadow>
    <planeGeometry args={[size, size]} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>
);
export const Sun: React.FC<{ position: V3; color?: string; r?: number }> = ({ position, color = "#ffe9a0", r = 2 }) => (
  <mesh position={position}>
    <sphereGeometry args={[r, 20, 16]} />
    <meshBasicMaterial color={color} />
  </mesh>
);
export const Cloud3D: React.FC<{ position: V3; s?: number }> = ({ position, s = 1 }) => (
  <group position={position} scale={s}>
    {[[0, 0, 0, 1.2], [1.1, -0.1, 0.1, 0.9], [-1.1, -0.15, 0, 0.85], [0.4, 0.45, 0, 0.8]].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]}>
        <sphereGeometry args={[r, 14, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    ))}
  </group>
);
export const Palm3D: React.FC<{ position: V3; s?: number; sway?: number }> = ({ position, s = 1, sway = 0 }) => (
  <group position={position} scale={s} rotation={[0, 0, sway * 0.03]}>
    <P geo={() => <cylinderGeometry args={[0.14, 0.22, 3.6, 8]} />} color="#9a6a3c" pos={[0, 1.8, 0]} rot={[0, 0, 0.05]} hull={0.04} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <group key={i} position={[0.1, 3.6, 0]} rotation={[0, (i * Math.PI) / 3, 0]}>
        <P geo={() => <boxGeometry args={[1.5, 0.05, 0.38]} />} color="#3ea04c" pos={[0.75, -0.1, 0]} rot={[0, 0, -0.35]} hull={0.04} />
      </group>
    ))}
  </group>
);
export const Sea: React.FC<{ y?: number; z: number; color?: string; t?: number }> = ({ y = -0.05, z, color = "#4fc3e8", t = 0 }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, z]}>
      <planeGeometry args={[160, 60]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} position={[-18 + i * 7 + Math.sin(t + i) * 0.5, y + 0.02, z + 2 + (i % 3) * 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 0.08]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
    ))}
  </group>
);
export const Road: React.FC<{ z?: number; dusk?: boolean; scroll?: number; width?: number }> = ({ z = 0, dusk = false, scroll = 0, width = 6 }) => (
  <group position={[0, 0, z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
      <planeGeometry args={[120, width]} />
      <meshStandardMaterial color={dusk ? "#5a4b68" : "#767f8c"} roughness={1} />
    </mesh>
    {[...Array(24)].map((_, i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-30 + i * 2.6 - (scroll % 2.6), 0.012, 0]}>
        <planeGeometry args={[1.2, 0.12]} />
        <meshBasicMaterial color="#f4f4f4" />
      </mesh>
    ))}
  </group>
);
export const House3D: React.FC<{ position: V3; w?: number; h?: number; d?: number; color?: string; roof?: string; door?: boolean }> = ({ position, w = 3.4, h = 3, d = 2.4, color = "#fff2d6", roof = "#c0534a", door = true }) => (
  <group position={position}>
    <P geo={() => <boxGeometry args={[w, h, d]} />} color={color} pos={[0, h / 2, 0]} hull={0.012} />
    <P geo={() => <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />} color={roof} pos={[0, h + 0.15, 0]} hull={0.02} />
    {door && <P geo={() => <boxGeometry args={[0.8, 1.7, 0.06]} />} color="#8b5a2b" pos={[0, 0.85, d / 2 + 0.03]} hull={0.04} />}
    {[-1, 1].map((sd) => (
      <P key={sd} geo={() => <boxGeometry args={[0.7, 0.7, 0.06]} />} color="#9fdcff" pos={[sd * w * 0.3, h * 0.62, d / 2 + 0.03]} hull={0.05} />
    ))}
  </group>
);
export const Heart3D: React.FC<{ position: V3; s?: number; color?: string; opacity?: number }> = ({ position, s = 1, color = "#ff5d8f", opacity = 1 }) => {
  const shape = React.useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.5);
    sh.bezierCurveTo(-0.9, 0.1, -0.5, 0.8, 0, 0.35);
    sh.bezierCurveTo(0.5, 0.8, 0.9, 0.1, 0, -0.5);
    return sh;
  }, []);
  return (
    <mesh position={position} scale={s * 0.22}>
      <extrudeGeometry args={[shape, { depth: 0.2, bevelEnabled: false }]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
};
export const Hearts3D: React.FC<{ position: V3; f: number; at: number; n?: number; spread?: number }> = ({ position, f, at, n = 5, spread = 0.9 }) => {
  if (f < at) return null;
  return (
    <group>
      {[...Array(n)].map((_, i) => {
        const k = Math.min(1, Math.max(0, (f - at - i * 5) / 50));
        if (k <= 0 || k >= 1) return null;
        return <Heart3D key={i} position={[position[0] + (i - (n - 1) / 2) * (spread / n) + Math.sin(k * 6 + i) * 0.08, position[1] + k * 1.3, position[2]]} s={0.9 + (i % 3) * 0.3} opacity={1 - k * k} color={i % 2 ? "#ff5d8f" : "#ff8fb1"} />;
      })}
    </group>
  );
};

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

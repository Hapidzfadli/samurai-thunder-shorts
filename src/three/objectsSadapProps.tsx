import React from "react";
import * as THREE from "three";
import { P } from "./objectsRig";
import { InkBox } from "./objectsMolase";
import { Sign, Window, WallClock, Plant, Chandelier, Chair, Bench, Telephone } from "./objectsMolaseProps";

type V3 = [number, number, number];
const B = InkBox;
const Cyl: React.FC<{ pos: V3; r: number; h: number; color: string; rot?: V3; hull?: number; seg?: number; r2?: number }> = ({ pos, r, h, color, rot = [0, 0, 0], hull = 0.06, seg = 14, r2 }) => (
  <P geo={() => <cylinderGeometry args={[r2 ?? r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} />
);
const Ball: React.FC<{ pos: V3; r: number; color: string; s?: V3; emissive?: string }> = ({ pos, r, color, s = [1, 1, 1], emissive }) => (
  <P geo={() => <sphereGeometry args={[r, 12, 10]} />} color={color} pos={pos} scale={s} hull={0.07} emissive={emissive} />
);
const Flat: React.FC<{ pos: V3; size: [number, number]; color: string; rot?: V3 }> = ({ pos, size, color, rot = [0, 0, 0] }) => (
  <mesh position={pos} rotation={rot}>
    <planeGeometry args={size} />
    <meshBasicMaterial color={color} side={THREE.DoubleSide} />
  </mesh>
);
export { Sign };

/* ================================================================== */
/* ISTANA (exterior)                                                      */
/* ================================================================== */
const Pediment: React.FC<{ pos: V3; w: number; h: number; d: number }> = ({ pos, w, h, d }) => {
  const shape = React.useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0);
    sh.lineTo(w / 2, 0);
    sh.lineTo(0, h);
    sh.closePath();
    return sh;
  }, [w, h]);
  return (
    <group position={pos}>
      <mesh castShadow>
        <extrudeGeometry args={[shape, { depth: d, bevelEnabled: false }]} />
        <meshStandardMaterial color="#f6f3ea" />
      </mesh>
      <mesh scale={[1.03, 1.06, 1.04]} position={[0, -0.03, -0.02]}>
        <extrudeGeometry args={[shape, { depth: d, bevelEnabled: false }]} />
        <meshBasicMaterial color="#0b0a0c" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};
/** Palladian facade: white Ionic columns, pediment, steps (Istana Merdeka style) */
export const IstanaFacade: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 3.2, -1.2]} size={[16, 6.4, 4]} color="#f6f3ea" ink={0.06} />
    {[-6.5, -4, 4, 6.5].map((x) => [1.6, 4.4].map((y) => <B key={`${x}${y}`} pos={[x, y, 0.84]} size={[1.4, 1.8, 0.1]} color="#cfe0f0" ink={0.03} />))}
    {/* portico */}
    <B pos={[0, 0.5, 2.0]} size={[9.4, 1.0, 3.2]} color="#e8e2d2" ink={0.05} />
    {[0, 1, 2, 3].map((i) => <B key={i} pos={[0, 0.12 + i * 0.22, 3.75 + (3 - i) * 0.35]} size={[7, 0.22, 0.4]} color="#ece6d6" ink={0.02} />)}
    {[-3.6, -2.2, -0.75, 0.75, 2.2, 3.6].map((x) => (
      <group key={x} position={[x, 1.0, 3.2]}>
        <Cyl pos={[0, 2.6, 0]} r={0.36} h={5.2} color="#ffffff" hull={0.04} seg={18} />
        <B pos={[0, 5.3, 0]} size={[0.95, 0.25, 0.95]} color="#f2ede0" ink={0.02} />
        {[-1, 1].map((sd) => <Ball key={sd} pos={[sd * 0.42, 5.2, 0.3]} r={0.13} color="#f2ede0" />)}
        <B pos={[0, 0.1, 0]} size={[0.9, 0.2, 0.9]} color="#f2ede0" ink={0.02} />
      </group>
    ))}
    <B pos={[0, 6.55, 3.2]} size={[8.6, 0.5, 1.4]} color="#f6f3ea" ink={0.04} />
    <Pediment pos={[0, 6.8, 2.7]} w={8.8} h={1.5} d={1.0} />
    <Ball pos={[0, 7.3, 3.25]} r={0.32} color="#e0b040" />
    <B pos={[0, 6.6, -1.2]} size={[16.6, 0.4, 4.6]} color="#c8c0b0" ink={0.05} />
    {/* lamps by the door */}
    {[-2.9, 2.9].map((x) => <Ball key={x} pos={[x, 3.2, 1.0]} r={0.22} color="#fff0b0" emissive="#ffcf6a" />)}
    <B pos={[0, 2.2, 0.85]} size={[1.6, 2.6, 0.1]} color="#8a5a34" ink={0.03} />
  </group>
);
export const Flagpole: React.FC<{ pos?: V3; h?: number; t?: number }> = ({ pos = [0, 0, 0], h = 9, t = 0 }) => (
  <group position={pos}>
    <Cyl pos={[0, h / 2, 0]} r={0.07} h={h} color="#d8dde6" hull={0.12} />
    <Ball pos={[0, h + 0.1, 0]} r={0.14} color="#e0b040" />
    <group position={[0, h - 0.9, 0]} rotation={[0, 0, Math.sin(t * 2) * 0.04]}>
      <B pos={[1.0, 0.35, 0]} size={[2.0, 0.7, 0.03]} color="#d62828" ink={0.015} />
      <B pos={[1.0, -0.35, 0]} size={[2.0, 0.7, 0.03]} color="#ffffff" ink={0.015} />
    </group>
    <Cyl pos={[0, 0.2, 0]} r={0.5} h={0.4} color="#c8c0b0" />
  </group>
);
export const Monas: React.FC<{ pos?: V3; s?: number }> = ({ pos = [0, 0, 0], s = 1 }) => (
  <group position={pos} scale={s}>
    <B pos={[0, 1.2, 0]} size={[9, 2.4, 9]} color="#e8e2d2" ink={0.05} />
    <P geo={() => <cylinderGeometry args={[0.7, 1.4, 22, 4]} />} color="#f6f3ea" pos={[0, 13.4, 0]} rot={[0, Math.PI / 4, 0]} hull={0.02} />
    <B pos={[0, 24.6, 0]} size={[2.6, 0.5, 2.6]} color="#e8e2d2" ink={0.03} />
    <P geo={() => <coneGeometry args={[0.8, 2.6, 8]} />} color="#f2c230" pos={[0, 26.2, 0]} hull={0.04} emissive="#5a3d00" />
  </group>
);
export const PalaceGuard: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 1.6, 0]} size={[1.1, 3.2, 1.1]} color="#ffffff" ink={0.04} />
    <P geo={() => <coneGeometry args={[0.9, 1.0, 4]} />} color="#d62828" pos={[0, 3.7, 0]} rot={[0, Math.PI / 4, 0]} hull={0.05} />
    <B pos={[0, 1.8, 0.56]} size={[0.5, 0.9, 0.04]} color="#2a2a33" ink={0.01} />
  </group>
);
export const Hedge: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 4 }) => (
  <group position={pos}>
    <B pos={[0, 0.5, 0]} size={[len, 1.0, 0.9]} color="#3ea04c" ink={0.04} />
    {[...Array(Math.round(len))].map((_, i) => <Ball key={i} pos={[-len / 2 + 0.5 + i, 1.0, 0]} r={0.45} color="#4ab05a" />)}
  </group>
);
export const BlackCar: React.FC<{ pos?: V3; rot?: number }> = ({ pos = [0, 0, 0], rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <B pos={[0, 0.75, 0]} size={[4.6, 0.9, 1.9]} color="#15151c" ink={0.04} />
    <B pos={[-0.2, 1.5, 0]} size={[2.6, 0.7, 1.7]} color="#1c1c26" ink={0.04} />
    {[-1.3, 0.9].map((x) => <B key={x} pos={[x, 1.5, 0.86]} size={[1.1, 0.5, 0.02]} color="#5a6a80" ink={0.01} />)}
    {[-1.5, 1.5].flatMap((x) => [-0.95, 0.95].map((z) => <Cyl key={`${x}${z}`} pos={[x, 0.38, z]} r={0.38} h={0.22} color="#0c0c10" rot={[Math.PI / 2, 0, 0]} />))}
    <B pos={[2.31, 0.8, 0.6]} size={[0.04, 0.2, 0.35]} color="#fff6c0" ink={0.01} />
    <B pos={[2.31, 0.8, -0.6]} size={[0.04, 0.2, 0.35]} color="#fff6c0" ink={0.01} />
    <B pos={[1.9, 1.35, 0.7]} size={[0.3, 0.2, 0.02]} color="#d62828" ink={0.005} />
  </group>
);

/* ================================================================== */
/* RUANG KERJA PRESIDEN                                                   */
/* ================================================================== */
export const PresDesk: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.85, 0]} size={[3.2, 0.14, 1.4]} color="#6a3a1c" ink={0.04} />
    <B pos={[-1.2, 0.42, 0]} size={[0.7, 0.84, 1.3]} color="#5a301a" ink={0.04} />
    <B pos={[1.2, 0.42, 0]} size={[0.7, 0.84, 1.3]} color="#5a301a" ink={0.04} />
    <B pos={[0, 0.42, -0.55]} size={[1.8, 0.84, 0.1]} color="#5a301a" ink={0.03} />
    {[-1.2, 1.2].map((x) => <B key={x} pos={[x, 0.55, 0.66]} size={[0.5, 0.3, 0.02]} color="#8a5a34" ink={0.005} />)}
    <B pos={[0.6, 0.94, 0.1]} size={[0.6, 0.04, 0.45]} color="#f7f1dd" ink={0.005} />
    <B pos={[-0.7, 0.96, 0.2]} size={[0.16, 0.06, 0.3]} color="#15151c" ink={0.008} />
    <B pos={[-0.2, 0.98, -0.2]} size={[0.5, 0.12, 0.15]} color="#8a5a34" ink={0.008} />
    <Cyl pos={[1.3, 1.0, -0.3]} r={0.03} h={0.25} color="#c8a050" hull={0.15} />
    <B pos={[1.3, 1.15, -0.3]} size={[0.28, 0.16, 0.02]} color="#d62828" ink={0.005} />
  </group>
);
export const BigChair: React.FC<{ pos?: V3; rot?: number }> = ({ pos = [0, 0, 0], rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <B pos={[0, 0.55, 0]} size={[0.9, 0.2, 0.85]} color="#2a1a14" ink={0.03} />
    <B pos={[0, 1.35, -0.38]} size={[0.95, 1.5, 0.16]} color="#2a1a14" ink={0.03} />
    {[-0.48, 0.48].map((x) => <B key={x} pos={[x, 0.8, 0]} size={[0.12, 0.3, 0.8]} color="#3a2418" ink={0.02} />)}
    <Cyl pos={[0, 0.25, 0]} r={0.06} h={0.5} color="#2a2a33" />
    <Cyl pos={[0, 0.04, 0]} r={0.4} h={0.06} color="#2a2a33" />
  </group>
);
export const FlagStandMP: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 1.5, 0]} r={0.04} h={3} color="#c8a050" hull={0.15} />
    <Ball pos={[0, 3.05, 0]} r={0.09} color="#e0b040" />
    <B pos={[0.55, 2.55, 0]} size={[1.0, 0.4, 0.02]} color="#d62828" ink={0.01} rot={[0, 0, -0.05]} />
    <B pos={[0.55, 2.15, 0]} size={[1.0, 0.4, 0.02]} color="#ffffff" ink={0.01} rot={[0, 0, -0.05]} />
    <Cyl pos={[0, 0.06, 0]} r={0.3} h={0.12} color="#8a5a34" />
  </group>
);
/** stylised golden emblem plaque (simple eagle-like silhouette, not a copy of the state crest) */
export const GoldEmblem: React.FC<{ pos?: V3; s?: number }> = ({ pos = [0, 0, 0], s = 1 }) => (
  <group position={pos} scale={s}>
    <B pos={[0, 0, 0]} size={[1.4, 1.4, 0.06]} color="#5a301a" ink={0.03} />
    <Ball pos={[0, 0.1, 0.06]} r={0.26} color="#e0b040" s={[1, 1.2, 0.3]} />
    {[-1, 1].map((sd) => <B key={sd} pos={[sd * 0.38, 0.18, 0.06]} size={[0.5, 0.18, 0.04]} color="#e0b040" ink={0.01} rot={[0, 0, sd * 0.4]} />)}
    <Ball pos={[0, 0.42, 0.06]} r={0.1} color="#e0b040" />
    <B pos={[0, -0.34, 0.06]} size={[0.5, 0.08, 0.03]} color="#f2efe6" ink={0.005} />
  </group>
);
export const Sofa: React.FC<{ pos?: V3; rot?: number; color?: string }> = ({ pos = [0, 0, 0], rot = 0, color = "#7a2a2a" }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <B pos={[0, 0.4, 0]} size={[2.4, 0.4, 0.9]} color={color} ink={0.04} />
    <B pos={[0, 0.85, -0.38]} size={[2.4, 0.7, 0.2]} color={color} ink={0.04} />
    {[-1.2, 1.2].map((x) => <B key={x} pos={[x, 0.65, 0]} size={[0.22, 0.5, 0.9]} color={color} ink={0.03} />)}
    {[-0.6, 0.6].map((x) => <B key={x} pos={[x, 0.65, 0.05]} size={[1.0, 0.1, 0.7]} color="#8a3a3a" ink={0.01} />)}
  </group>
);
export const CoffeeTable: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.42, 0]} size={[1.4, 0.08, 0.8]} color="#6a3a1c" ink={0.03} />
    {[-0.6, 0.6].flatMap((x) => [-0.32, 0.32].map((z) => <B key={`${x}${z}`} pos={[x, 0.2, z]} size={[0.07, 0.4, 0.07]} color="#4a2a14" ink={0.01} />))}
    <Cyl pos={[0.3, 0.52, 0]} r={0.08} h={0.12} color="#ffffff" hull={0.1} />
    <Cyl pos={[-0.3, 0.5, 0.1]} r={0.2} h={0.06} color="#e0b040" hull={0.08} />
  </group>
);
export const CarvedPillar: React.FC<{ pos?: V3; h?: number }> = ({ pos = [0, 0, 0], h = 4.6 }) => (
  <group position={pos}>
    <B pos={[0, h / 2, 0]} size={[0.6, h, 0.6]} color="#7a4a24" ink={0.04} />
    {[...Array(Math.round(h / 0.5))].map((_, i) => <B key={i} pos={[0, 0.3 + i * 0.5, 0.31]} size={[0.4, 0.12, 0.02]} color={i % 2 ? "#a86a34" : "#5a3018"} ink={0} rot={[0, 0, (i % 2 ? 1 : -1) * 0.4]} />)}
  </group>
);
export const CatBed: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <P geo={() => <torusGeometry args={[0.42, 0.16, 8, 18]} />} color="#c0526a" pos={[0, 0.16, 0]} rot={[Math.PI / 2, 0, 0]} hull={0.08} />
    <Cyl pos={[0, 0.06, 0]} r={0.42} h={0.1} color="#f1e3c6" hull={0.05} />
    <Ball pos={[0.5, 0.08, 0.3]} r={0.08} color="#ffd23f" />
  </group>
);
export const PortraitFrame: React.FC<{ pos?: V3; w?: number; h?: number }> = ({ pos = [0, 0, 0], w = 1.2, h = 1.5 }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[w, h, 0.06]} color="#c8a050" ink={0.03} />
    <Flat pos={[0, 0, 0.04]} size={[w * 0.82, h * 0.85]} color="#3a6a8a" />
    <Flat pos={[0, -h * 0.15, 0.05]} size={[w * 0.82, h * 0.25]} color="#5a8a4a" />
  </group>
);
export const Smartphone: React.FC<{ pos?: V3; rot?: V3; s?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], s = 1 }) => (
  <group position={pos} rotation={rot} scale={s}>
    <B pos={[0, 0, 0]} size={[0.09, 0.18, 0.012]} color="#15151c" ink={0.006} />
    <Flat pos={[0, 0, 0.008]} size={[0.08, 0.16]} color="#6ec6ff" />
  </group>
);

/* ================================================================== */
/* RUANG SERVER LIMS                                                      */
/* ================================================================== */
export const ServerRack: React.FC<{ pos?: V3; t?: number; seed?: number }> = ({ pos = [0, 0, 0], t = 0, seed = 0 }) => (
  <group position={pos}>
    <B pos={[0, 1.2, 0]} size={[0.9, 2.4, 0.9]} color="#1c1f2a" ink={0.04} />
    {[...Array(8)].map((_, i) => (
      <group key={i}>
        <B pos={[0, 0.3 + i * 0.27, 0.46]} size={[0.8, 0.2, 0.02]} color="#2a2f3c" ink={0.005} />
        {[0, 1, 2].map((k) => {
          const on = Math.sin(t * (4 + k) + i * 1.7 + seed * 3.1 + k) > 0;
          return <Flat key={k} pos={[-0.3 + k * 0.08, 0.3 + i * 0.27, 0.475]} size={[0.04, 0.04]} color={on ? ["#3cff7a", "#ffcf3a", "#3ab0ff"][k] : "#1a3a24"} />;
        })}
      </group>
    ))}
  </group>
);
export const Monitor: React.FC<{ pos?: V3; t?: number; mode?: "wave" | "list" | "delete"; rot?: number }> = ({ pos = [0, 0, 0], t = 0, mode = "wave", rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <B pos={[0, 0.5, 0]} size={[1.0, 0.65, 0.06]} color="#15151c" ink={0.02} />
    <Flat pos={[0, 0.5, 0.035]} size={[0.9, 0.55]} color={mode === "delete" ? "#3a0f12" : "#0a1a2a"} />
    {mode === "wave" && [...Array(14)].map((_, i) => <Flat key={i} pos={[-0.38 + i * 0.058, 0.5, 0.04]} size={[0.03, 0.05 + Math.abs(Math.sin(t * 6 + i * 0.9)) * 0.35]} color="#3cff7a" />)}
    {mode === "list" && [...Array(6)].map((_, i) => <Flat key={i} pos={[-0.1, 0.72 - i * 0.08, 0.04]} size={[0.6 - (i % 3) * 0.12, 0.03]} color="#6ec6ff" />)}
    {mode === "delete" && <Flat pos={[0, 0.5, 0.04]} size={[0.6, 0.1]} color="#ff4a4a" />}
    <B pos={[0, 0.1, 0]} size={[0.08, 0.2, 0.08]} color="#2a2a33" ink={0.01} />
    <B pos={[0, 0.01, 0]} size={[0.4, 0.02, 0.25]} color="#2a2a33" ink={0.01} />
  </group>
);
export const OpsDesk: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <B pos={[0, 0.8, 0]} size={[3.0, 0.1, 1.0]} color="#3a4050" ink={0.04} />
    {[-1.4, 1.4].map((x) => <B key={x} pos={[x, 0.4, 0]} size={[0.1, 0.8, 0.9]} color="#2a2f3c" ink={0.02} />)}
    <Monitor pos={[-0.8, 0.85, -0.25]} t={t} mode="wave" rot={0.15} />
    <Monitor pos={[0.4, 0.85, -0.3]} t={t} mode="list" />
    <B pos={[-0.3, 0.87, 0.15]} size={[0.7, 0.03, 0.22]} color="#1c1c22" ink={0.005} />
    <Cyl pos={[1.1, 0.92, 0.1]} r={0.07} h={0.16} color="#ffffff" hull={0.1} />
    <Cyl pos={[1.28, 0.92, 0.25]} r={0.07} h={0.16} color="#c8743a" hull={0.1} />
    <P geo={() => <torusGeometry args={[0.12, 0.03, 6, 14, Math.PI]} />} color="#2a2a33" pos={[0.9, 0.9, 0.3]} hull={0.1} />
  </group>
);
/** a big funnel-fed "LIMS" machine for the sarcastic explainer */
export const LimsMachine: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <B pos={[0, 1.4, 0]} size={[3.0, 2.8, 2.0]} color="#4a5566" ink={0.05} />
    <P geo={() => <cylinderGeometry args={[1.3, 0.35, 1.6, 16, 1, true]} />} color="#8a95a5" pos={[0, 3.6, 0]} hull={0.04} />
    <Flat pos={[0, 1.9, 1.02]} size={[1.8, 0.9]} color="#0a1a2a" />
    {[...Array(10)].map((_, i) => <Flat key={i} pos={[-0.75 + i * 0.165, 1.9, 1.03]} size={[0.08, 0.1 + Math.abs(Math.sin(t * 5 + i)) * 0.6]} color="#3cff7a" />)}
    {[-1, 1].map((sd) => <Ball key={sd} pos={[sd * 1.1, 2.6, 1.02]} r={0.14} color={Math.sin(t * 6 + sd) > 0 ? "#ff4a4a" : "#6a1a1a"} />)}
    <B pos={[1.0, 0.6, 1.02]} size={[0.6, 0.4, 0.04]} color="#2a2a33" ink={0.01} />
    <Sign pos={[0, 0.7, 1.05]} w={1.3} h={0.42} text="LIMS" bg="#d8dde6" fg="#15151c" />
  </group>
);
export const VerifDoor: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 1.2, 0]} size={[1.4, 2.4, 0.12]} color="#6a7078" ink={0.04} />
    <Sign pos={[0, 2.7, 0.08]} w={1.8} h={0.45} text="VERIFIKASI" bg="#2a5aa8" fg="#ffffff" />
    {[-1, 1].map((sd) => <B key={sd} pos={[0, 1.2, 0.08]} size={[1.7, 0.08, 0.04]} color="#a8a8b0" ink={0.01} rot={[0, 0, sd * 0.6]} />)}
    <B pos={[0, 1.2, 0.12]} size={[0.3, 0.35, 0.1]} color="#c8a050" ink={0.015} />
    {[0, 1, 2].map((i) => <mesh key={i} position={[0.55 - i * 0.2, 2.2 - i * 0.12, 0.09]} rotation={[0, 0, i * 0.8]}><ringGeometry args={[0.1, 0.12, 6]} /><meshBasicMaterial color="#e8e8f0" /></mesh>)}
  </group>
);
export const SopBinder: React.FC<{ pos?: V3; dusty?: boolean }> = ({ pos = [0, 0, 0], dusty = true }) => (
  <group position={pos}>
    <B pos={[0, 0.2, 0]} size={[0.5, 0.4, 0.12]} color="#c93b3b" ink={0.02} />
    <Flat pos={[0, 0.22, 0.065]} size={[0.36, 0.12]} color="#f7f1dd" />
    {dusty && [0, 1, 2].map((i) => <mesh key={i} position={[0.18 - i * 0.12, 0.42, 0.07]} rotation={[0, 0, i * 0.9]}><ringGeometry args={[0.04, 0.05, 6]} /><meshBasicMaterial color="#e8e8f0" /></mesh>)}
  </group>
);
export const Shredder: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.35, 0]} size={[0.6, 0.7, 0.4]} color="#2a2a33" ink={0.03} />
    <B pos={[0, 0.72, 0]} size={[0.64, 0.08, 0.44]} color="#4a4a58" ink={0.02} />
    {[...Array(5)].map((_, i) => <Flat key={i} pos={[-0.2 + i * 0.1, 0.9, 0]} size={[0.04, 0.3]} color="#f7f1dd" />)}
  </group>
);
export const CableBundle: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 4 }) => (
  <group position={pos}>
    {["#e63946", "#3b78e7", "#ffd23f", "#2bb673"].map((c, i) => <Cyl key={c} pos={[0, 0.04 + i * 0.03, i * 0.06]} r={0.025} h={len} color={c} rot={[0, 0, Math.PI / 2]} hull={0.1} />)}
  </group>
);

/* ================================================================== */
/* WARUNG KOPI                                                            */
/* ================================================================== */
export const WarungCounter: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.55, 0]} size={[3.2, 1.1, 0.9]} color="#5a8ac0" ink={0.04} />
    <B pos={[0, 1.14, 0]} size={[3.4, 0.08, 1.1]} color="#e8e0c0" ink={0.03} />
    {[-1.1, -0.5, 0.1, 0.7].map((x, i) => <group key={x}><Cyl pos={[x, 1.38, 0]} r={0.2} h={0.42} color="#f2f2f2" hull={0.06} /><Cyl pos={[x, 1.62, 0]} r={0.21} h={0.06} color={["#c93b3b", "#2a5aa8", "#2bb673", "#ffd23f"][i]} hull={0.06} /></group>)}
    <Cyl pos={[1.3, 1.3, 0.1]} r={0.12} h={0.28} color="#c8c8d0" hull={0.08} />
  </group>
);
/** strings of coffee sachets hanging at the front of a warung */
export const Sachets: React.FC<{ pos?: V3; cols?: number }> = ({ pos = [0, 0, 0], cols = 6 }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[cols * 0.32, 0.04, 0.04]} color="#4a3a2a" ink={0.005} />
    {[...Array(cols)].map((_, i) => [...Array(5)].map((_, k) => <B key={`${i}${k}`} pos={[-((cols - 1) * 0.32) / 2 + i * 0.32, -0.18 - k * 0.2, 0]} size={[0.22, 0.17, 0.01]} color={["#c93b3b", "#3a2a1a", "#ffd23f", "#2a5aa8", "#e8590c", "#6a3a1a"][(i + k) % 6]} ink={0.005} />))}
  </group>
);
export const Kerupuk: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.45, 0]} size={[0.55, 0.9, 0.55]} color="#c8d8e8" ink={0.03} />
    <B pos={[0, 0.92, 0]} size={[0.58, 0.06, 0.58]} color="#c93b3b" ink={0.02} />
    {[0, 1, 2].map((i) => <Ball key={i} pos={[-0.12 + i * 0.12, 0.6 + (i % 2) * 0.15, 0.2]} r={0.12} color="#f2e2b0" s={[1, 1, 0.3]} />)}
  </group>
);
export const WallTV: React.FC<{ pos?: V3; text?: string; t?: number }> = ({ pos = [0, 0, 0], text = "BREAKING NEWS", t = 0 }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[1.9, 1.15, 0.12]} color="#15151c" ink={0.03} />
    <Flat pos={[0, 0.08, 0.07]} size={[1.75, 0.82]} color="#2a5aa8" />
    <Flat pos={[0, -0.12, 0.075]} size={[1.75, 0.18]} color="#c93b3b" />
    <Sign pos={[0, -0.12, 0.08]} w={1.7} h={0.16} text={text} bg="#c93b3b" fg="#ffffff" />
    <Flat pos={[-0.55 + ((t * 0.2) % 1) * 0.02, 0.2, 0.076]} size={[0.5, 0.45]} color="#f7ead6" />
    <B pos={[0, 0.75, -0.2]} size={[0.1, 0.4, 0.1]} color="#2a2a33" ink={0.01} />
  </group>
);
export const PlasticStool: React.FC<{ pos?: V3; color?: string }> = ({ pos = [0, 0, 0], color = "#e63946" }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.42, 0]} r={0.22} h={0.06} color={color} />
    <Cyl pos={[0, 0.2, 0]} r={0.2} r2={0.14} h={0.4} color={color} hull={0.05} />
  </group>
);
export const LongBench: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 2.6 }) => (
  <group position={pos}>
    <B pos={[0, 0.45, 0]} size={[len, 0.08, 0.4]} color="#a9703a" ink={0.03} />
    {[-len / 2 + 0.15, len / 2 - 0.15].map((x) => <B key={x} pos={[x, 0.22, 0]} size={[0.08, 0.44, 0.36]} color="#7a4a2a" ink={0.015} />)}
  </group>
);
export const Awning: React.FC<{ pos?: V3; w?: number }> = ({ pos = [0, 0, 0], w = 4 }) => (
  <group position={pos}>
    {[...Array(Math.round(w / 0.5))].map((_, i) => <B key={i} pos={[-w / 2 + 0.25 + i * 0.5, 0, 0]} size={[0.5, 0.06, 1.4]} color={i % 2 ? "#ffffff" : "#2bb673"} ink={0.01} rot={[0.3, 0, 0]} />)}
    {[-w / 2, w / 2].map((x) => <B key={x} pos={[x, -1.4, 0.6]} size={[0.08, 2.8, 0.08]} color="#4a3a2a" ink={0.01} />)}
  </group>
);
export const Gerobak: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.95, 0]} size={[1.8, 0.9, 0.8]} color="#f2f2f2" ink={0.04} />
    <B pos={[0, 1.45, 0]} size={[1.8, 0.08, 0.8]} color="#5a8ac0" ink={0.02} />
    {[-0.8, 0.8].map((x) => <B key={x} pos={[x, 1.95, 0]} size={[0.06, 1.0, 0.06]} color="#c8c8d0" ink={0.01} />)}
    <B pos={[0, 2.45, 0]} size={[1.9, 0.06, 0.9]} color="#c93b3b" ink={0.02} />
    <Cyl pos={[0, 0.3, 0.42]} r={0.3} h={0.08} color="#2a2a33" rot={[Math.PI / 2, 0, 0]} />
    <Sign pos={[0, 1.05, 0.42]} w={1.4} h={0.38} text="KOPI · GORENGAN" bg="#fff6dd" fg="#c93b3b" />
  </group>
);

/* ================================================================== */
/* BARESKRIM / SIDANG ETIK                                                */
/* ================================================================== */
export const PoliceHQ: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 4, 0]} size={[14, 8, 4]} color="#e8e2d2" ink={0.06} />
    {[...Array(6)].map((_, r) => [...Array(8)].map((_, c) => <B key={`${r}${c}`} pos={[-5.6 + c * 1.6, 1.2 + r * 1.2, 2.04]} size={[1.0, 0.7, 0.04]} color="#5a7a9a" ink={0.01} />))}
    <B pos={[0, 1.3, 2.4]} size={[4, 2.6, 0.8]} color="#7a5530" ink={0.05} />
    <B pos={[0, 2.8, 2.9]} size={[4.6, 0.2, 1.6]} color="#5a3d20" ink={0.03} />
    <Sign pos={[0, 3.3, 2.1]} w={4.2} h={0.6} text="BARESKRIM" bg="#7a5530" fg="#f2c230" />
    <B pos={[0, 8.2, 0]} size={[14.4, 0.4, 4.4]} color="#c8c0b0" ink={0.05} />
  </group>
);
export const EvidenceBoard: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[2.6, 1.7, 0.08]} color="#b88a5a" ink={0.03} />
    {[[-0.8, 0.4], [0.2, 0.5], [0.9, 0.1], [-0.4, -0.4], [0.6, -0.5]].map(([x, y], i) => <Flat key={i} pos={[x, y, 0.05]} size={[0.45, 0.35]} color={["#f7f1dd", "#ffe9a8", "#f7f1dd", "#cfe0f0", "#ffe9a8"][i]} />)}
    {[[[-0.8, 0.4], [0.2, 0.5]], [[0.2, 0.5], [0.9, 0.1]], [[-0.8, 0.4], [-0.4, -0.4]], [[-0.4, -0.4], [0.6, -0.5]]].map(([[a, b], [c2, d]], i) => {
      const len = Math.hypot(c2 - a, d - b);
      return <mesh key={i} position={[(a + c2) / 2, (b + d) / 2, 0.06]} rotation={[0, 0, Math.atan2(d - b, c2 - a)]}><planeGeometry args={[len, 0.02]} /><meshBasicMaterial color="#d62828" /></mesh>;
    })}
  </group>
);
export const CaseFiles: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    {[0, 1, 2, 3].map((i) => <B key={i} pos={[0.02 * i, 0.05 + i * 0.09, 0]} size={[0.5, 0.08, 0.36]} color={["#d9c28a", "#c9b27a", "#e0cc98", "#d9c28a"][i]} ink={0.008} rot={[0, i * 0.1, 0]} />)}
    <B pos={[0, 0.42, 0]} size={[0.2, 0.02, 0.36]} color="#c93b3b" ink={0.004} />
  </group>
);
export const EthicsTable: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.8, 0]} size={[5.0, 0.1, 1.1]} color="#6a3a1c" ink={0.04} />
    <B pos={[0, 0.45, 0.5]} size={[5.0, 0.8, 0.06]} color="#2a6a3a" ink={0.03} />
    {[-1.6, 0, 1.6].map((x) => <group key={x}><B pos={[x, 0.95, 0.35]} size={[0.6, 0.16, 0.06]} color="#f7f1dd" ink={0.008} rot={[-0.4, 0, 0]} /><Cyl pos={[x + 0.4, 1.0, 0]} r={0.02} h={0.3} color="#2a2a33" hull={0.15} /><Ball pos={[x + 0.4, 1.16, 0]} r={0.04} color="#2a2a33" /></group>)}
  </group>
);
export const PoliceFlag: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 1.5, 0]} r={0.04} h={3} color="#c8a050" hull={0.15} />
    <B pos={[0.55, 2.35, 0]} size={[1.0, 0.8, 0.02]} color="#7a5530" ink={0.01} />
    <Ball pos={[0.55, 2.35, 0.02]} r={0.18} color="#f2c230" s={[1, 1, 0.2]} />
  </group>
);
export { Window, WallClock, Plant, Chandelier, Chair, Bench, Telephone };

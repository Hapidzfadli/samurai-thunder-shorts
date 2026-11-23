import React from "react";
import * as THREE from "three";
import { P } from "./objectsRig";
import { Horse3D } from "./objectsWar";
import { InkBox, facadeTex } from "./objectsMolase";

type V3 = [number, number, number];
const INK = "#0b0a0c";
const Cyl: React.FC<{ pos: V3; r: number; h: number; color: string; rot?: V3; hull?: number; seg?: number }> = ({ pos, r, h, color, rot = [0, 0, 0], hull = 0.06, seg = 12 }) => (
  <P geo={() => <cylinderGeometry args={[r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} />
);
const Ball: React.FC<{ pos: V3; r: number; color: string; s?: V3 }> = ({ pos, r, color, s = [1, 1, 1] }) => (
  <P geo={() => <sphereGeometry args={[r, 12, 10]} />} color={color} pos={pos} scale={s} hull={0.07} />
);
const Plane: React.FC<{ pos: V3; size: [number, number]; color: string; rot?: V3 }> = ({ pos, size, color, rot = [0, 0, 0] }) => (
  <mesh position={pos} rotation={rot}>
    <planeGeometry args={size} />
    <meshBasicMaterial color={color} side={THREE.DoubleSide} />
  </mesh>
);
const B = InkBox;
/** flat painted sign made of a canvas texture */
const signCache: Record<string, THREE.CanvasTexture> = {};
export const signTex = (text: string, bg: string, fg: string, w = 512, h = 192, border = "#241726"): THREE.CanvasTexture => {
  const k = `${text}|${bg}|${fg}`;
  if (signCache[k]) return signCache[k];
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = border;
  c.lineWidth = 14;
  c.strokeRect(7, 7, w - 14, h - 14);
  c.fillStyle = fg;
  c.font = `bold ${Math.min(96, (w - 60) / (text.length * 0.56))}px Anton, Impact, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  signCache[k] = t;
  return t;
};
export const Sign: React.FC<{ pos: V3; w: number; h: number; text: string; bg?: string; fg?: string; rot?: V3 }> = ({ pos, w, h, text, bg = "#f4e8c8", fg = "#2a1a10", rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0, 0]} size={[w, h, 0.06]} color="#4a3a2a" ink={0.03} />
    <mesh position={[0, 0, 0.04]}>
      <planeGeometry args={[w * 0.94, h * 0.9]} />
      <meshBasicMaterial map={signTex(text, bg, fg, 512, Math.round((512 * h) / w))} />
    </mesh>
  </group>
);

/* ================================================================== */
/* OUTDOOR: Commercial Street, 1919                                      */
/* ================================================================== */
export const GasLamp: React.FC<{ pos?: V3; lit?: boolean }> = ({ pos = [0, 0, 0], lit = false }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.15, 0]} r={0.22} h={0.3} color="#2a2a33" />
    <Cyl pos={[0, 1.9, 0]} r={0.07} h={3.5} color="#2a2a33" hull={0.12} />
    <B pos={[0, 3.55, 0]} size={[0.5, 0.06, 0.06]} color="#2a2a33" ink={0.02} />
    <B pos={[0, 3.82, 0]} size={[0.3, 0.44, 0.3]} color={lit ? "#fff0b0" : "#cfe0e8"} ink={0.03} emissive={lit ? "#ffcf6a" : undefined} />
    <P geo={() => <coneGeometry args={[0.27, 0.22, 4]} />} color="#2a2a33" pos={[0, 4.15, 0]} rot={[0, Math.PI / 4, 0]} hull={0.08} />
  </group>
);
export const Hydrant: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.4, 0]} r={0.2} h={0.8} color="#d63a3a" />
    <Ball pos={[0, 0.84, 0]} r={0.21} color="#d63a3a" />
    <Cyl pos={[0, 0.5, 0]} r={0.09} h={0.6} color="#b02a2a" rot={[0, 0, Math.PI / 2]} />
    <Cyl pos={[0, 0.1, 0]} r={0.26} h={0.14} color="#9a2020" />
  </group>
);
export const Wheel: React.FC<{ pos: V3; r?: number; rot?: number }> = ({ pos, r = 0.55, rot = 0 }) => (
  <group position={pos} rotation={[0, 0, rot]}>
    <P geo={() => <torusGeometry args={[r, 0.06, 6, 20]} />} color="#6b4a2e" rot={[0, 0, 0]} hull={0.1} />
    <P geo={() => <cylinderGeometry args={[0.1, 0.1, 0.16, 10]} />} color="#3a3a44" rot={[Math.PI / 2, 0, 0]} hull={0.1} />
    {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]}><boxGeometry args={[r * 2, 0.05, 0.05]} /><meshBasicMaterial color="#8b5a2b" /></mesh>)}
  </group>
);
export const Wagon: React.FC<{ pos?: V3; load?: "barrels" | "sacks" | "none"; t?: number; withHorse?: boolean }> = ({ pos = [0, 0, 0], load = "barrels", t = 0, withHorse = true }) => (
  <group position={pos}>
    <B pos={[0, 0.85, 0]} size={[2.6, 0.18, 1.3]} color="#a9703a" ink={0.04} />
    {[-1.28, 1.28].map((x) => <B key={x} pos={[x, 1.1, 0]} size={[0.08, 0.5, 1.3]} color="#8b5a2b" ink={0.03} />)}
    {[-0.64, 0.64].map((z) => <B key={z} pos={[0, 1.1, z]} size={[2.6, 0.5, 0.08]} color="#8b5a2b" ink={0.03} />)}
    {[[-0.85, 0.35], [0.85, 0.35]].flatMap(([x, y]) => [-0.72, 0.72].map((z) => <Wheel key={`${x}${z}`} pos={[x, y + 0.1, z]} r={0.5} />))}
    <B pos={[1.9, 0.75, 0]} size={[1.8, 0.07, 0.1]} color="#6b4a2e" ink={0.02} />
    {load === "barrels" && [0, 1, 2].map((i) => <Cyl key={i} pos={[-0.7 + i * 0.7, 1.55, 0]} r={0.3} h={0.8} color="#8b5a2b" />)}
    {load === "sacks" && [0, 1, 2, 3].map((i) => <Ball key={i} pos={[-0.8 + i * 0.55, 1.4, (i % 2) * 0.3 - 0.15]} r={0.34} color="#d9c28a" s={[1, 0.8, 0.8]} />)}
    <B pos={[-0.9, 1.65, 0.0]} size={[0.5, 0.5, 0.5]} color="#c8a070" ink={0.03} />
    {withHorse && <Horse3D position={[2.9, 0, 0]} rotationY={Math.PI / 2} scale={1.05} phase={t * 0.9} t={t} color="#7a4a2a" armor={false} />}
  </group>
);
export const Sacks: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    {[[0, 0], [0.55, 0], [0.28, 0.42]].map(([x, y], i) => <Ball key={i} pos={[x, 0.28 + y, 0]} r={0.32} color={["#d9c28a", "#c9b27a", "#e0cc98"][i]} s={[1, 0.82, 0.8]} />)}
  </group>
);
export const CrateStack: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.4, 0]} size={[0.8, 0.8, 0.8]} color="#b9824a" ink={0.03} />
    <B pos={[0.9, 0.4, 0.1]} size={[0.8, 0.8, 0.8]} color="#a8723a" ink={0.03} />
    <B pos={[0.4, 1.2, 0.05]} size={[0.8, 0.8, 0.8]} color="#c8924a" ink={0.03} rot={[0, 0.2, 0]} />
  </group>
);
export const BarrelStack: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    {[0, 1, 2].map((i) => <Cyl key={i} pos={[i * 0.76, 0.5, 0]} r={0.36} h={1.0} color="#8b5a2b" />)}
    <Cyl pos={[0.38, 1.5, 0]} r={0.36} h={1.0} color="#9b6a3b" />
    {[0, 1, 2].map((i) => [0.22, 0.78].map((y) => <Cyl key={`${i}${y}`} pos={[i * 0.76, y, 0]} r={0.375} h={0.06} color="#3a3a44" hull={0.02} />))}
  </group>
);
/** Atlantic Avenue elevated railway: iron lattice pillars + deck + a small car */
export const ElevatedRail: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 14 }) => (
  <group position={pos}>
    {[-len / 2 + 1, 0, len / 2 - 1].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        {[-0.9, 0.9].map((z) => <B key={z} pos={[0, 3.2, z]} size={[0.28, 6.4, 0.28]} color="#3a4350" ink={0.04} />)}
        {[0.8, 2.0, 3.2, 4.4, 5.6].map((y, i) => <B key={y} pos={[0, y, 0]} size={[0.14, 0.14, 1.8]} color="#4a5566" ink={0.02} rot={[i % 2 ? 0.5 : -0.5, 0, 0]} />)}
        <B pos={[0, 6.5, 0]} size={[0.5, 0.4, 2.4]} color="#3a4350" ink={0.04} />
      </group>
    ))}
    <B pos={[0, 6.9, 0]} size={[len, 0.4, 2.6]} color="#4a5566" ink={0.05} />
    {[-0.8, 0.8].map((z) => <B key={z} pos={[0, 7.2, z]} size={[len, 0.1, 0.1]} color="#8a95a5" ink={0.02} />)}
    {[...Array(Math.round(len * 2))].map((_, i) => <B key={i} pos={[-len / 2 + 0.25 + i * 0.5, 7.12, 0]} size={[0.1, 0.06, 2.2]} color="#6b4a2e" ink={0.01} />)}
    <B pos={[0, 8.0, 0]} size={[4.2, 1.5, 1.8]} color="#2f7a4a" ink={0.05} />
    {[-1.4, -0.4, 0.6, 1.5].map((x) => <B key={x} pos={[x, 8.2, 0.93]} size={[0.6, 0.6, 0.05]} color="#ffe9a8" ink={0.02} />)}
    <B pos={[0, 8.9, 0]} size={[4.0, 0.18, 1.6]} color="#244f33" ink={0.03} />
  </group>
);
export const Firehouse: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 2.8, 0]} size={[7, 5.6, 4.4]} map={facadeTex("#a94a38", 11, 3, 2, 0.4)} />
    {[-1.7, 1.7].map((x) => (
      <group key={x} position={[x, 0, 2.28]}>
        <B pos={[0, 1.25, 0]} size={[2.2, 2.5, 0.12]} color="#c93b3b" ink={0.04} />
        <P geo={() => <cylinderGeometry args={[1.1, 1.1, 0.12, 16, 1, false, 0, Math.PI]} />} color="#c93b3b" pos={[0, 2.5, 0]} rot={[Math.PI / 2, 0, 0]} hull={0.04} />
        {[-0.5, 0.5].map((dx) => <B key={dx} pos={[dx, 1.2, 0.08]} size={[0.8, 1.8, 0.04]} color="#8a2a2a" ink={0.01} />)}
      </group>
    ))}
    <B pos={[0, 5.9, 0]} size={[7.5, 0.4, 4.9]} color="#4a3a45" ink={0.05} />
    <B pos={[2.4, 7.2, 0]} size={[1.4, 2.8, 1.4]} color="#a94a38" ink={0.05} />
    <P geo={() => <coneGeometry args={[1.1, 1.2, 4]} />} color="#3a3a4a" pos={[2.4, 9.2, 0]} rot={[0, Math.PI / 4, 0]} hull={0.05} />
    <Ball pos={[2.4, 7.6, 0.8]} r={0.3} color="#e0b040" />
    <Sign pos={[0, 4.5, 2.3]} w={2.6} h={0.8} text="ENGINE 31" bg="#f4e8c8" fg="#8a1a1a" />
  </group>
);
export const Warehouse: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 3, 0]} size={[8, 6, 4.4]} map={facadeTex("#8a5a40", 21, 4, 2, 0.15)} />
    <B pos={[-1.5, 1.5, 2.26]} size={[2.4, 3, 0.1]} color="#4a3a2a" ink={0.04} />
    <B pos={[1.8, 1.5, 2.26]} size={[2.4, 3, 0.1]} color="#4a3a2a" ink={0.04} />
    <B pos={[0, 6.2, 0]} size={[8.4, 0.5, 4.8]} color="#4a3a45" ink={0.05} />
    <B pos={[3.2, 5.1, 2.9]} size={[0.14, 0.14, 1.6]} color="#2a2a33" ink={0.02} />
    <Cyl pos={[3.2, 4.6, 3.6]} r={0.05} h={1.0} color="#8b7a5a" hull={0.2} />
    <B pos={[3.2, 3.9, 3.6]} size={[0.5, 0.5, 0.5]} color="#c8a070" ink={0.03} />
    <Sign pos={[0, 5.2, 2.26]} w={3.4} h={0.9} text="MOLASSES · SUGAR" />
  </group>
);
export const Tenement: React.FC<{ pos?: V3; seed?: number; base?: string; shop?: boolean }> = ({ pos = [0, 0, 0], seed = 3, base = "#b5573f", shop = true }) => (
  <group position={pos}>
    <B pos={[0, 4, 0]} size={[5.4, 8, 4]} map={facadeTex(base, seed, 3, 4, 0.45, shop)} />
    <B pos={[0, 8.15, 0]} size={[5.9, 0.35, 4.5]} color="#4a3a45" ink={0.05} />
    {/* fire escape */}
    {[3.2, 5.2].map((y) => <B key={y} pos={[0.9, y, 2.3]} size={[1.8, 0.07, 0.7]} color="#2a2a33" ink={0.02} />)}
    <B pos={[1.6, 4.2, 2.3]} size={[0.07, 2.2, 0.07]} color="#2a2a33" ink={0.02} rot={[0, 0, 0.5]} />
    {/* awning + barber pole */}
    {shop && <B pos={[0, 2.5, 2.4]} size={[3.8, 0.12, 1.1]} color="#c93b3b" ink={0.03} rot={[0.25, 0, 0]} />}
    {shop && <Cyl pos={[-2.1, 1.2, 2.4]} r={0.12} h={1.5} color="#ffffff" hull={0.15} />}
    {shop && [0.5, 1.0, 1.5].map((y) => <Cyl key={y} pos={[-2.1, y, 2.4]} r={0.125} h={0.1} color="#d63a3a" hull={0.02} />)}
    {/* laundry line */}
    <mesh position={[-1.2, 5.6, 2.35]} rotation={[0, 0, 0.05]} scale={[2.4, 0.02, 0.02]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#2a2a33" /></mesh>
    {[-1.8, -1.2, -0.6].map((x, i) => <B key={x} pos={[x, 5.3, 2.35]} size={[0.4, 0.5, 0.03]} color={["#ffffff", "#ffd36a", "#6ec6ff"][i]} ink={0.01} />)}
    <B pos={[1.4, 8.7, -0.8]} size={[0.6, 1.2, 0.6]} color="#8a4a3a" ink={0.04} />
  </group>
);
export const Streetcar: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 1.55, 0]} size={[5, 2.2, 1.8]} color="#2f7a4a" ink={0.05} />
    <B pos={[0, 2.8, 0]} size={[5.2, 0.3, 2.0]} color="#e8e0c0" ink={0.04} />
    {[-1.8, -0.6, 0.6, 1.8].map((x) => <B key={x} pos={[x, 1.85, 0.93]} size={[0.8, 0.8, 0.05]} color="#ffe9a8" ink={0.02} />)}
    {[-1.7, 1.7].map((x) => <Cyl key={x} pos={[x, 0.42, 0.7]} r={0.4} h={0.2} color="#2a2a33" rot={[Math.PI / 2, 0, 0]} />)}
    <B pos={[-0.5, 3.4, 0]} size={[0.06, 1.0, 0.06]} color="#2a2a33" ink={0.02} rot={[0, 0, 0.5]} />
  </group>
);
export const Mailbox: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.5, 0]} r={0.06} h={1} color="#2a2a33" />
    <B pos={[0, 1.2, 0]} size={[0.5, 0.7, 0.4]} color="#2a5aa8" ink={0.03} />
    <P geo={() => <sphereGeometry args={[0.26, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />} color="#2a5aa8" pos={[0, 1.55, 0]} hull={0.08} />
  </group>
);
export const NewsStand: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.55, 0]} size={[1.6, 1.1, 0.9]} color="#6b4a2e" ink={0.03} />
    <B pos={[0, 1.15, -0.1]} size={[1.7, 0.08, 1.0]} color="#a9703a" ink={0.03} />
    {[-0.5, 0, 0.5].map((x, i) => <B key={x} pos={[x, 1.35, 0.1]} size={[0.4, 0.5, 0.04]} color={["#f4eedd", "#e8e0c0", "#fff6dd"][i]} ink={0.01} rot={[-0.4, 0, 0]} />)}
    <B pos={[0, 2.1, -0.3]} size={[1.9, 0.08, 1.2]} color="#c93b3b" ink={0.03} />
    {[-0.8, 0.8].map((x) => <Cyl key={x} pos={[x, 1.6, -0.3]} r={0.04} h={1} color="#4a3a2a" hull={0.15} />)}
  </group>
);
export const Bench: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.5, 0]} size={[1.8, 0.1, 0.5]} color="#a9703a" ink={0.03} />
    <B pos={[0, 0.9, -0.22]} size={[1.8, 0.45, 0.08]} color="#a9703a" ink={0.03} />
    {[-0.8, 0.8].map((x) => <B key={x} pos={[x, 0.25, 0]} size={[0.1, 0.5, 0.45]} color="#2a2a33" ink={0.02} />)}
  </group>
);
export const TrashCan: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.4, 0]} r={0.28} h={0.8} color="#6a7078" />
    <Cyl pos={[0, 0.84, 0]} r={0.3} h={0.08} color="#4a5058" />
  </group>
);
export const Bicycle: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    {[-0.5, 0.5].map((x) => <P key={x} geo={() => <torusGeometry args={[0.36, 0.03, 6, 18]} />} color="#2a2a33" pos={[x, 0.4, 0]} hull={0.12} />)}
    <B pos={[0, 0.6, 0]} size={[1.0, 0.05, 0.05]} color="#d63a3a" ink={0.01} rot={[0, 0, 0.2]} />
    <B pos={[0.4, 0.9, 0]} size={[0.05, 0.5, 0.05]} color="#d63a3a" ink={0.01} />
    <B pos={[0.4, 1.12, 0]} size={[0.05, 0.05, 0.5]} color="#2a2a33" ink={0.01} />
    <B pos={[-0.3, 0.88, 0]} size={[0.3, 0.06, 0.12]} color="#2a2a33" ink={0.01} />
  </group>
);
export const Bollard: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.35, 0]} r={0.2} h={0.7} color="#2a2a33" />
    <Ball pos={[0, 0.75, 0]} r={0.25} color="#2a2a33" s={[1, 0.6, 1]} />
  </group>
);
export const Steamer: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={[pos[0], pos[1] + Math.sin(t * 1.2) * 0.05, pos[2]]}>
    <P geo={() => <boxGeometry args={[11, 2.2, 3.2]} />} color="#2a3a58" pos={[0, 1.1, 0]} hull={0.02} />
    <P geo={() => <coneGeometry args={[1.6, 2.2, 4]} />} color="#2a3a58" pos={[6.3, 1.1, 0]} rot={[0, Math.PI / 4, -Math.PI / 2]} scale={[1, 1, 0.9]} hull={0.02} />
    <B pos={[0, 2.5, 0]} size={[6, 0.7, 2.2]} color="#e8e0c0" ink={0.04} />
    <B pos={[-1, 3.2, 0]} size={[3, 0.8, 1.8]} color="#f4eedd" ink={0.04} />
    <Cyl pos={[-1.2, 4.4, 0]} r={0.5} h={1.8} color="#c93b3b" />
    <Cyl pos={[-1.2, 5.4, 0]} r={0.52} h={0.25} color="#2a2a33" hull={0.04} />
    <Cyl pos={[3, 4.2, 0]} r={0.06} h={5} color="#6b4a2e" hull={0.15} />
    {[-0.6, 0.6].map((z, i) => <Ball key={i} pos={[-1.2 + Math.sin(t + i) * 0.2, 6.6 + i * 0.6, z * 0.4]} r={0.5 + i * 0.2} color="#d8dde6" />)}
  </group>
);
export const Crane: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 2.2, 0]} size={[0.4, 4.4, 0.4]} color="#2a2a33" ink={0.04} />
    <B pos={[1.6, 4.4, 0]} size={[3.6, 0.3, 0.3]} color="#c93b3b" ink={0.04} />
    <B pos={[3.0, 3.2, 0]} size={[0.04, 2.2, 0.04]} color="#2a2a33" ink={0.01} />
    <B pos={[3.0, 2.0, 0]} size={[0.6, 0.6, 0.6]} color="#c8a070" ink={0.03} />
  </group>
);
export const Pier: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 12 }) => (
  <group position={pos}>
    <B pos={[0, 0.15, 0]} size={[len, 0.3, 5]} color="#8a6a40" ink={0.04} />
    {[...Array(Math.round(len))].map((_, i) => <mesh key={i} position={[-len / 2 + 0.5 + i, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.04, 5]} /><meshBasicMaterial color="#4a3a22" /></mesh>)}
    {[-len / 2 + 0.4, len / 2 - 0.4].flatMap((x) => [-2.3, 2.3].map((z) => <Cyl key={`${x}${z}`} pos={[x, -0.4, z]} r={0.18} h={1.4} color="#5a4a30" />))}
  </group>
);
export const IronFence: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 4 }) => (
  <group position={pos}>
    {[...Array(Math.round(len / 0.3))].map((_, i) => <B key={i} pos={[-len / 2 + 0.15 + i * 0.3, 0.55, 0]} size={[0.05, 1.1, 0.05]} color="#2a2a33" ink={0.015} />)}
    <B pos={[0, 0.9, 0]} size={[len, 0.07, 0.07]} color="#2a2a33" ink={0.015} />
    <B pos={[0, 0.2, 0]} size={[len, 0.07, 0.07]} color="#2a2a33" ink={0.015} />
  </group>
);
/** the tank site: tank accessories (stairs, pipe, valve, sign, shed) */
export const TankSite: React.FC<{ pos?: V3; r?: number }> = ({ pos = [0, 0, 0], r = 1.9 }) => (
  <group position={pos}>
    <B pos={[0, 0.2, 0]} size={[r * 2.6, 0.4, r * 2.6]} color="#7a7480" ink={0.05} />
    {[...Array(9)].map((_, i) => <B key={i} pos={[r + 0.2 + i * 0.01, 0.35 + i * 0.5, 0.5]} size={[0.35, 0.1, 0.9]} color="#3a3a44" ink={0.015} rot={[0, 0, 0]} />)}
    <Cyl pos={[-r - 0.5, 0.7, 0.4]} r={0.12} h={2.6} color="#4a5058" rot={[0, 0, Math.PI / 2]} />
    <Cyl pos={[-r - 1.8, 0.7, 0.4]} r={0.15} h={0.3} color="#4a5058" />
    <P geo={() => <torusGeometry args={[0.3, 0.05, 6, 14]} />} color="#c93b3b" pos={[-r - 1.2, 1.1, 0.4]} hull={0.1} />
    <B pos={[-r - 2.8, 0.6, 1.2]} size={[1.6, 1.2, 1.2]} color="#a9703a" ink={0.04} />
    <B pos={[-r - 2.8, 1.35, 1.2]} size={[1.9, 0.2, 1.5]} color="#4a3a45" ink={0.04} />
    <Sign pos={[-r - 2.2, 1.6, 2.4]} w={1.8} h={0.6} text="MOLASSES" bg="#e8dcb8" fg="#3a1c0a" />
    <Cyl pos={[-r - 2.9, 0.8, 2.4]} r={0.05} h={1.6} color="#4a3a2a" hull={0.15} />
    <Cyl pos={[-r - 1.5, 0.8, 2.4]} r={0.05} h={1.6} color="#4a3a2a" hull={0.15} />
  </group>
);
export const SnowPatch: React.FC<{ pos?: V3; s?: number }> = ({ pos = [0, 0, 0], s = 1 }) => (
  <group position={pos} scale={s}>
    {[[0, 0, 0.9], [0.8, 0.3, 0.6], [-0.7, 0.2, 0.5]].map(([x, z, r], i) => <mesh key={i} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]}><circleGeometry args={[r, 12]} /><meshBasicMaterial color="#f4f8ff" /></mesh>)}
  </group>
);

/* ================================================================== */
/* KITCHEN (modern analogy scene)                                        */
/* ================================================================== */
export const Fridge: React.FC<{ pos?: V3; open?: number }> = ({ pos = [0, 0, 0], open = 0 }) => (
  <group position={pos}>
    <B pos={[0, 1.4, 0]} size={[1.5, 2.8, 1.2]} color="#e6eef6" ink={0.05} />
    <group position={[-0.75, 1.4, 0.6]} rotation={[0, -open * 1.3, 0]}>
      <B pos={[0.75, 0, 0]} size={[1.5, 2.8, 0.1]} color="#cfdbe8" ink={0.04} />
      <B pos={[1.3, 0.2, 0.1]} size={[0.07, 0.9, 0.07]} color="#5a6a80" ink={0.015} />
    </group>
    {open > 0 && [0.6, 1.4, 2.1].map((y) => <B key={y} pos={[0, y, 0.0]} size={[1.3, 0.05, 1.0]} color="#bcd0e4" ink={0.01} />)}
  </group>
);
export const KitchenTable: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.95, 0]} size={[2.2, 0.1, 1.2]} color="#c8924a" ink={0.04} />
    {[[-0.95, -0.45], [0.95, -0.45], [-0.95, 0.45], [0.95, 0.45]].map(([x, z]) => <B key={`${x}${z}`} pos={[x, 0.47, z]} size={[0.1, 0.94, 0.1]} color="#8b5a2b" ink={0.02} />)}
    <B pos={[0, 1.02, 0]} size={[2.3, 0.02, 1.3]} color="#ffffff" ink={0.005} />
  </group>
);
export const Chair: React.FC<{ pos?: V3; rot?: number }> = ({ pos = [0, 0, 0], rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <B pos={[0, 0.5, 0]} size={[0.55, 0.08, 0.55]} color="#a9703a" ink={0.03} />
    <B pos={[0, 0.95, -0.25]} size={[0.55, 0.8, 0.06]} color="#a9703a" ink={0.03} />
    {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z]) => <B key={`${x}${z}`} pos={[x, 0.25, z]} size={[0.06, 0.5, 0.06]} color="#7a4a2a" ink={0.015} />)}
  </group>
);
export const Stove: React.FC<{ pos?: V3; hot?: boolean }> = ({ pos = [0, 0, 0], hot = false }) => (
  <group position={pos}>
    <B pos={[0, 0.55, 0]} size={[1.6, 1.1, 1.1]} color="#4a4a58" ink={0.05} />
    {[-0.4, 0.4].map((x) => <Cyl key={x} pos={[x, 1.13, 0]} r={0.28} h={0.04} color={hot ? "#ff7a2a" : "#1c1c22"} hull={0.03} />)}
    <B pos={[0, 0.6, 0.57]} size={[1.2, 0.6, 0.04]} color="#2a2a33" ink={0.01} />
    <Cyl pos={[0.4, 1.4, 0]} r={0.22} h={0.5} color="#b8bfc8" />
    <B pos={[0.65, 1.45, 0]} size={[0.3, 0.06, 0.06]} color="#2a2a33" ink={0.01} />
  </group>
);
export const Window: React.FC<{ pos?: V3; w?: number; h?: number; curtain?: string }> = ({ pos = [0, 0, 0], w = 1.8, h = 1.6, curtain = "#c0526a" }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[w + 0.2, h + 0.2, 0.1]} color="#f4eedd" ink={0.03} />
    <mesh position={[0, 0, 0.06]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color="#bfe0ff" />
    </mesh>
    <B pos={[0, 0, 0.08]} size={[0.06, h, 0.04]} color="#f4eedd" ink={0.005} />
    <B pos={[0, 0, 0.08]} size={[w, 0.06, 0.04]} color="#f4eedd" ink={0.005} />
    {[-1, 1].map((s) => <B key={s} pos={[s * (w / 2 + 0.2), -0.1, 0.1]} size={[0.4, h + 0.3, 0.1]} color={curtain} ink={0.02} />)}
  </group>
);
export const Cabinet: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 2.2, 0]} size={[2.0, 1.2, 0.5]} color="#c8924a" ink={0.04} />
    {[-0.5, 0.5].map((x) => <B key={x} pos={[x, 2.2, 0.27]} size={[0.9, 1.0, 0.04]} color="#b8823a" ink={0.01} />)}
    <B pos={[0, 1.0, 0.05]} size={[2.0, 1.0, 0.8]} color="#e8dcc0" ink={0.04} />
    <B pos={[0, 1.55, 0.05]} size={[2.1, 0.08, 0.9]} color="#a9703a" ink={0.03} />
  </group>
);
export const Pot: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.12, 0]} r={0.16} h={0.24} color="#b8bfc8" hull={0.1} />
    <B pos={[0.22, 0.2, 0]} size={[0.2, 0.04, 0.04]} color="#2a2a33" ink={0.01} />
  </group>
);
export const WallClock: React.FC<{ pos?: V3; r?: number }> = ({ pos = [0, 0, 0], r = 0.35 }) => (
  <group position={pos}>
    <Cyl pos={[0, 0, 0]} r={r} h={0.08} color="#f4eedd" rot={[Math.PI / 2, 0, 0]} hull={0.08} />
    <B pos={[0, r * 0.3, 0.06]} size={[0.03, r * 0.6, 0.02]} color="#241726" ink={0.005} />
    <B pos={[r * 0.25, 0, 0.06]} size={[r * 0.5, 0.03, 0.02]} color="#241726" ink={0.005} />
  </group>
);
export const Plant: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.25, 0]} r={0.28} h={0.5} color="#c8743a" />
    {[0, 1, 2, 3, 4].map((i) => <Ball key={i} pos={[Math.cos(i * 1.3) * 0.18, 0.75 + (i % 2) * 0.2, Math.sin(i * 1.3) * 0.18]} r={0.22} color="#3ea04c" s={[0.7, 1.3, 0.7]} />)}
  </group>
);
export const Rug: React.FC<{ pos?: V3; w?: number; d?: number; color?: string }> = ({ pos = [0, 0, 0], w = 3, d = 2, color = "#c0526a" }) => (
  <group position={pos}>
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, d]} /><meshBasicMaterial color={color} /></mesh>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w * 0.8, d * 0.7]} /><meshBasicMaterial color="#f1e3c6" /></mesh>
  </group>
);
export const JarShelf: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[2.2, 0.08, 0.5]} color="#a9703a" ink={0.03} />
    {[-0.7, -0.2, 0.3, 0.8].map((x, i) => (
      <group key={x} position={[x, 0.25, 0]}>
        <Cyl pos={[0, 0, 0]} r={0.18} h={0.4} color={["#e8a020", "#c0526a", "#6ab04c", "#e8a020"][i]} hull={0.1} />
        <Cyl pos={[0, 0.24, 0]} r={0.17} h={0.08} color="#8a5a2b" hull={0.1} />
      </group>
    ))}
  </group>
);

/* ================================================================== */
/* COURTROOM                                                              */
/* ================================================================== */
export const JudgeBench: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.9, 0]} size={[4.4, 1.8, 1.4]} color="#6a3f24" ink={0.05} />
    <B pos={[0, 1.85, 0.2]} size={[4.6, 0.12, 1.6]} color="#8a5a34" ink={0.04} />
    {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => <B key={x} pos={[x, 0.9, 0.72]} size={[0.6, 1.4, 0.05]} color="#5a331c" ink={0.01} />)}
    <B pos={[0, 2.6, -0.4]} size={[1.1, 1.5, 0.2]} color="#4a2a18" ink={0.04} />
    <Cyl pos={[0, 3.45, -0.4]} r={0.55} h={0.12} color="#e0b040" rot={[Math.PI / 2, 0, 0]} hull={0.06} />
  </group>
);
export const WitnessStand: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.6, 0]} size={[1.6, 1.2, 1.2]} color="#6a3f24" ink={0.05} />
    <B pos={[0, 1.3, 0.3]} size={[1.7, 0.1, 0.9]} color="#8a5a34" ink={0.04} />
    <Chair pos={[0, 1.2, -0.1]} />
  </group>
);
export const JuryBox: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.6, 0.9]} size={[5.2, 1.2, 0.12]} color="#6a3f24" ink={0.04} />
    <B pos={[0, 0.1, 0]} size={[5.2, 0.2, 2.0]} color="#7a4a2a" ink={0.03} />
    {[...Array(6)].map((_, i) => <Chair key={i} pos={[-2.1 + i * 0.84, 0.2, 0.1]} />)}
    {[...Array(6)].map((_, i) => <Chair key={`b${i}`} pos={[-2.1 + i * 0.84, 0.6, -0.6]} />)}
  </group>
);
export const Pews: React.FC<{ pos?: V3; rows?: number }> = ({ pos = [0, 0, 0], rows = 3 }) => (
  <group position={pos}>
    {[...Array(rows)].map((_, r) => (
      <group key={r} position={[0, 0, r * 1.4]}>
        <B pos={[0, 0.45, 0]} size={[5.2, 0.1, 0.6]} color="#8a5a34" ink={0.03} />
        <B pos={[0, 0.9, -0.28]} size={[5.2, 0.8, 0.08]} color="#7a4a2a" ink={0.03} />
        {[-2.5, 2.5].map((x) => <B key={x} pos={[x, 0.25, 0]} size={[0.1, 0.5, 0.55]} color="#5a331c" ink={0.015} />)}
      </group>
    ))}
  </group>
);
export const BarRail: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 7 }) => (
  <group position={pos}>
    <B pos={[0, 0.5, 0]} size={[len, 1.0, 0.12]} color="#6a3f24" ink={0.04} />
    <B pos={[0, 1.05, 0]} size={[len, 0.08, 0.2]} color="#8a5a34" ink={0.03} />
    {[...Array(Math.round(len / 0.4))].map((_, i) => <B key={i} pos={[-len / 2 + 0.2 + i * 0.4, 0.55, 0.07]} size={[0.07, 0.8, 0.04]} color="#4a2a18" ink={0.005} />)}
  </group>
);
export const FlagStand: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 1.7, 0]} r={0.04} h={3.4} color="#8a6a30" hull={0.15} />
    <Ball pos={[0, 3.45, 0]} r={0.09} color="#e0b040" />
    <B pos={[0.7, 3.0, 0]} size={[1.4, 0.9, 0.03]} color="#f4eedd" ink={0.015} />
    {[0, 1, 2, 3].map((i) => <B key={i} pos={[0.7, 2.7 + i * 0.22, 0.03]} size={[1.4, 0.1, 0.01]} color="#c93b3b" ink={0} />)}
    <B pos={[0.25, 3.25, 0.03]} size={[0.55, 0.45, 0.01]} color="#2a3a8a" ink={0} />
  </group>
);
export const Scales: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.4, 0]} r={0.2} h={0.8} color="#4a2a18" />
    <Cyl pos={[0, 1.0, 0]} r={0.04} h={0.8} color="#e0b040" hull={0.15} />
    <B pos={[0, 1.45, 0]} size={[1.2, 0.05, 0.05]} color="#e0b040" ink={0.01} />
    {[-0.55, 0.55].map((x) => <group key={x}><B pos={[x, 1.2, 0]} size={[0.02, 0.4, 0.02]} color="#8a6a30" ink={0} /><Cyl pos={[x, 1.0, 0]} r={0.2} h={0.05} color="#e0b040" /></group>)}
  </group>
);
export const Bookshelf: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 1.6, 0]} size={[2.2, 3.2, 0.5]} color="#5a331c" ink={0.04} />
    {[0.6, 1.4, 2.2, 2.9].map((y, r) => <group key={y}>{[...Array(9)].map((_, i) => <B key={i} pos={[-0.9 + i * 0.22, y, 0.2]} size={[0.16, 0.5, 0.3]} color={["#8a1a1a", "#1a3a6a", "#2a5a2a", "#6a4a1a", "#4a2a5a"][(i + r) % 5]} ink={0.005} />)}</group>)}
  </group>
);
export const Chandelier: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.6, 0]} r={0.03} h={1.2} color="#8a6a30" hull={0.2} />
    <P geo={() => <torusGeometry args={[0.7, 0.05, 6, 20]} />} color="#e0b040" pos={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} hull={0.1} />
    {[0, 1, 2, 3, 4, 5].map((i) => <Ball key={i} pos={[Math.cos(i * 1.05) * 0.7, 0.15, Math.sin(i * 1.05) * 0.7]} r={0.1} color="#fff0b0" />)}
  </group>
);
export const Lawyers: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.8, 0]} size={[2.4, 0.1, 1.0]} color="#8a5a34" ink={0.04} />
    {[-1.0, 1.0].flatMap((x) => [-0.4, 0.4].map((z) => <B key={`${x}${z}`} pos={[x, 0.4, z]} size={[0.08, 0.8, 0.08]} color="#5a331c" ink={0.015} />))}
    <B pos={[-0.5, 0.9, 0]} size={[0.5, 0.06, 0.7]} color="#f7f1dd" ink={0.01} />
    <B pos={[0.5, 0.92, 0]} size={[0.5, 0.1, 0.4]} color="#6a3a1a" ink={0.01} />
  </group>
);

/* ================================================================== */
/* DRAFTING OFFICE                                                        */
/* ================================================================== */
export const DraftingTable: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <group position={[0, 1.3, 0]} rotation={[-0.35, 0, 0]}>
      <B pos={[0, 0, 0]} size={[2.4, 0.08, 1.5]} color="#c8924a" ink={0.04} />
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.0, 1.2]} /><meshBasicMaterial color="#3b6ac8" /></mesh>
      {[...Array(4)].map((_, i) => <mesh key={i} position={[0, 0.055, -0.4 + i * 0.28]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.8, 0.015]} /><meshBasicMaterial color="#bcd4ff" /></mesh>)}
      <B pos={[-0.7, 0.06, 0.6]} size={[1.4, 0.03, 0.1]} color="#d9c28a" ink={0.005} />
    </group>
    {[-1.0, 1.0].map((x) => <B key={x} pos={[x, 0.65, 0]} size={[0.12, 1.3, 0.12]} color="#6a4a2e" ink={0.02} />)}
    <B pos={[0, 0.4, 0]} size={[2.1, 0.06, 0.1]} color="#6a4a2e" ink={0.01} />
  </group>
);
export const Stool: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.85, 0]} r={0.28} h={0.1} color="#6a3f24" />
    {[0, 1, 2].map((i) => <B key={i} pos={[Math.cos(i * 2.1) * 0.2, 0.42, Math.sin(i * 2.1) * 0.2]} size={[0.05, 0.84, 0.05]} color="#2a2a33" ink={0.01} />)}
  </group>
);
export const BlueprintRack: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 1.2, 0]} size={[1.8, 2.4, 0.5]} color="#6a4a2e" ink={0.04} />
    {[0.3, 0.9, 1.5, 2.1].map((y, r) => <group key={y}>{[-0.5, 0, 0.5].map((x, i) => <Cyl key={i} pos={[x, y, 0.27]} r={0.12} h={0.4} color={["#3b6ac8", "#f4eedd", "#5a8ae0"][(i + r) % 3]} rot={[Math.PI / 2, 0, 0]} hull={0.1} />)}</group>)}
  </group>
);
export const FilingCabinet: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.9, 0]} size={[0.8, 1.8, 0.7]} color="#6a7078" ink={0.04} />
    {[0.3, 0.8, 1.3].map((y) => <group key={y}><B pos={[0, y, 0.37]} size={[0.7, 0.4, 0.04]} color="#8a9098" ink={0.01} /><B pos={[0, y, 0.41]} size={[0.2, 0.05, 0.03]} color="#2a2a33" ink={0.005} /></group>)}
  </group>
);
export const Desk: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.85, 0]} size={[2.0, 0.1, 1.0]} color="#8a5a34" ink={0.04} />
    <B pos={[-0.8, 0.4, 0]} size={[0.4, 0.8, 0.9]} color="#6a3f24" ink={0.04} />
    <B pos={[0.8, 0.4, 0]} size={[0.4, 0.8, 0.9]} color="#6a3f24" ink={0.04} />
    <B pos={[0.4, 0.97, 0.0]} size={[0.5, 0.14, 0.4]} color="#2a2a33" ink={0.015} />
    <Cyl pos={[-0.5, 1.0, 0.1]} r={0.1} h={0.15} color="#2a2a33" />
    <Cyl pos={[-0.5, 1.2, 0.1]} r={0.03} h={0.3} color="#2a2a33" hull={0.2} />
    <B pos={[0.0, 0.92, 0.1]} size={[0.6, 0.03, 0.4]} color="#f7f1dd" ink={0.005} />
  </group>
);
export const Telephone: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.08, 0]} r={0.12} h={0.16} color="#2a2a33" />
    <Cyl pos={[0, 0.3, 0]} r={0.03} h={0.3} color="#2a2a33" hull={0.2} />
    <Cyl pos={[0, 0.48, 0]} r={0.06} h={0.08} color="#2a2a33" />
  </group>
);
export const CoatStand: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.9, 0]} r={0.05} h={1.8} color="#4a2a18" hull={0.15} />
    <Cyl pos={[0, 0.06, 0]} r={0.35} h={0.1} color="#4a2a18" />
    {[0, 1, 2, 3].map((i) => <B key={i} pos={[Math.cos(i * 1.57) * 0.18, 1.75, Math.sin(i * 1.57) * 0.18]} size={[0.3, 0.04, 0.04]} color="#4a2a18" ink={0.005} rot={[0, -i * 1.57, 0.4]} />)}
    <P geo={() => <cylinderGeometry args={[0.2, 0.2, 0.12, 12]} />} color="#20202a" pos={[0.22, 1.85, 0]} hull={0.08} />
  </group>
);
export const Globe: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.3, 0]} r={0.2} h={0.1} color="#6a3f24" />
    <Cyl pos={[0, 0.5, 0]} r={0.03} h={0.4} color="#8a6a30" hull={0.2} />
    <Ball pos={[0, 0.85, 0]} r={0.35} color="#4a8ae0" />
    <Ball pos={[0.1, 0.9, 0.2]} r={0.18} color="#6ab04c" s={[1, 0.8, 0.6]} />
  </group>
);
export const WallMap: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[2.4, 1.6, 0.06]} color="#6a4a2e" ink={0.03} />
    <mesh position={[0, 0, 0.04]}><planeGeometry args={[2.2, 1.4]} /><meshBasicMaterial color="#e8dcb8" /></mesh>
    {[[-0.5, 0.2, 0.7, 0.3], [0.3, -0.3, 0.6, 0.35], [0.6, 0.3, 0.5, 0.25]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.05]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={["#8ab88a", "#c8a070", "#9ab8d8"][i]} /></mesh>)}
  </group>
);
export const PendantLamp: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.6, 0]} r={0.02} h={1.2} color="#2a2a33" hull={0.2} />
    <P geo={() => <coneGeometry args={[0.4, 0.4, 16, 1, true]} />} color="#3a6a4a" pos={[0, 0, 0]} hull={0.06} />
    <Ball pos={[0, -0.1, 0]} r={0.1} color="#fff0b0" />
  </group>
);

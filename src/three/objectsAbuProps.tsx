import React from "react";
import * as THREE from "three";
import { P } from "./objectsRig";
import { InkBox } from "./objectsMolase";
import { Palm3D } from "./objectsAncol3d";

type V3 = [number, number, number];
const B = InkBox;
const Cyl: React.FC<{ pos: V3; r: number; h: number; color: string; rot?: V3; hull?: number; seg?: number; r2?: number }> = ({ pos, r, h, color, rot = [0, 0, 0], hull = 0.05, seg = 16, r2 }) => (
  <P geo={() => <cylinderGeometry args={[r2 ?? r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} />
);
const Ball: React.FC<{ pos: V3; r: number; color: string; s?: V3; emissive?: string; hull?: number }> = ({ pos, r, color, s = [1, 1, 1], emissive, hull = 0.06 }) => (
  <P geo={() => <sphereGeometry args={[r, 16, 12]} />} color={color} pos={pos} scale={s} hull={hull} emissive={emissive} />
);
export { Palm3D };

/* ------------------------------------------------------------------ */
/* painted pattern textures                                              */
/* ------------------------------------------------------------------ */
const texCache: Record<string, THREE.CanvasTexture> = {};
const mk = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rep?: [number, number]) => {
  if (texCache[key]) return texCache[key];
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
  }
  texCache[key] = t;
  return t;
};
export const carpetTex = (base = "#9b1c2c", border = "#1f3a6b", gold = "#e0b040") =>
  mk(`carpet${base}${border}`, 512, 768, (c) => {
    c.fillStyle = border;
    c.fillRect(0, 0, 512, 768);
    c.fillStyle = gold;
    c.fillRect(24, 24, 464, 720);
    c.fillStyle = base;
    c.fillRect(44, 44, 424, 680);
    c.strokeStyle = gold;
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(256, 120);
    c.lineTo(400, 384);
    c.lineTo(256, 648);
    c.lineTo(112, 384);
    c.closePath();
    c.stroke();
    c.fillStyle = border;
    c.beginPath();
    c.arc(256, 384, 70, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 8; i++) {
      c.fillStyle = gold;
      c.beginPath();
      c.arc(256 + Math.cos((i * Math.PI) / 4) * 110, 384 + Math.sin((i * Math.PI) / 4) * 150, 14, 0, Math.PI * 2);
      c.fill();
    }
    for (let x = 60; x < 460; x += 36) {
      c.fillStyle = gold;
      c.fillRect(x, 56, 16, 16);
      c.fillRect(x, 696, 16, 16);
    }
  });
export const mosaicTex = () =>
  mk("mosaic", 256, 256, (c) => {
    c.fillStyle = "#f2efe6";
    c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const cx = x * 64 + 32;
        const cy = y * 64 + 32;
        c.fillStyle = (x + y) % 2 ? "#2a6ab0" : "#1a8a8a";
        c.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const r = k % 2 ? 14 : 28;
          k ? c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        c.closePath();
        c.fill();
        c.fillStyle = "#e0b040";
        c.beginPath();
        c.arc(cx, cy, 6, 0, Math.PI * 2);
        c.fill();
      }
  }, [4, 2]);
export const latticeTex = () =>
  mk("lattice", 256, 256, (c) => {
    c.fillStyle = "#ffe6a8";
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = "#6a3a1c";
    c.lineWidth = 10;
    for (let i = -256; i < 512; i += 40) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 256, 256);
      c.stroke();
      c.beginPath();
      c.moveTo(i + 256, 0);
      c.lineTo(i, 256);
      c.stroke();
    }
  });
export const mudTex = () =>
  mk("mud", 256, 256, (c) => {
    c.fillStyle = "#d9b88a";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) {
      c.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "90,60,30"},0.08)`;
      c.beginPath();
      c.arc(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 12, 0, Math.PI * 2);
      c.fill();
    }
  }, [2, 2]);
const Tex: React.FC<{ pos: V3; size: V3; map: THREE.Texture; ink?: number; rot?: V3 }> = ({ pos, size, map, ink = 0.05, rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={map} roughness={0.9} />
    </mesh>
    <mesh>
      <boxGeometry args={[size[0] + ink * 2, size[1] + ink * 2, size[2] + ink * 2]} />
      <meshBasicMaterial color="#0b0a0c" side={THREE.BackSide} />
    </mesh>
  </group>
);

/* ================================================================== */
/* PALACE EXTERIOR                                                       */
/* ================================================================== */
/** onion dome */
export const Dome: React.FC<{ pos: V3; r: number; color?: string }> = ({ pos, r, color = "#2a8ac0" }) => (
  <group position={pos}>
    <Ball pos={[0, r * 0.7, 0]} r={r} color={color} s={[1, 1.15, 1]} />
    <P geo={() => <coneGeometry args={[r * 0.45, r * 0.9, 16]} />} color={color} pos={[0, r * 1.95, 0]} hull={0.05} />
    <Ball pos={[0, r * 2.45, 0]} r={r * 0.12} color="#f2c230" />
    <Cyl pos={[0, r * 0.05, 0]} r={r * 1.02} h={r * 0.3} color="#f2efe6" />
  </group>
);
export const PointedArch: React.FC<{ pos?: V3; w?: number; h?: number; color?: string; dark?: string; depth?: number }> = ({ pos = [0, 0, 0], w = 2, h = 3, color = "#f2efe6", dark = "#3a2418", depth = 0.4 }) => {
  const shape = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(-w / 2, h * 0.6);
    s.quadraticCurveTo(-w / 2, h * 0.95, 0, h);
    s.quadraticCurveTo(w / 2, h * 0.95, w / 2, h * 0.6);
    s.lineTo(w / 2, 0);
    s.closePath();
    return s;
  }, [w, h]);
  return (
    <group position={pos}>
      <B pos={[0, h / 2 + 0.25, -0.05]} size={[w + 0.8, h + 0.5, depth]} color={color} ink={0.04} />
      <mesh position={[0, 0, depth / 2 - 0.02]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={dark} />
      </mesh>
    </group>
  );
};
export const PalaceExterior: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Tex pos={[0, 3, 0]} size={[14, 6, 6]} map={mosaicTex()} />
    <B pos={[0, 6.15, 0]} size={[14.4, 0.3, 6.4]} color="#e0b040" ink={0.04} />
    {[...Array(14)].map((_, i) => <B key={i} pos={[-6.75 + i * 1.04, 6.55, 3.0]} size={[0.5, 0.5, 0.3]} color="#f2efe6" ink={0.02} />)}
    <Dome pos={[0, 6.3, 0]} r={2.6} />
    <Dome pos={[-5, 6.3, 1.5]} r={1.0} color="#1a8a8a" />
    <Dome pos={[5, 6.3, 1.5]} r={1.0} color="#1a8a8a" />
    <PointedArch pos={[0, 0, 3.02]} w={2.6} h={4.0} color="#f2efe6" />
    {[-4.4, -2.6, 2.6, 4.4].map((x) => <PointedArch key={x} pos={[x, 1.6, 3.02]} w={1.0} h={1.8} dark="#ffe6a8" />)}
  </group>
);
export const Minaret: React.FC<{ pos?: V3; h?: number }> = ({ pos = [0, 0, 0], h = 11 }) => (
  <group position={pos}>
    <Cyl pos={[0, h / 2, 0]} r={0.6} r2={0.5} h={h} color="#f2efe6" seg={12} />
    <Cyl pos={[0, h * 0.72, 0]} r={0.85} h={0.3} color="#e0b040" seg={12} />
    {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} pos={[Math.cos(i * 1.05) * 0.8, h * 0.76, Math.sin(i * 1.05) * 0.8]} size={[0.12, 0.4, 0.12]} color="#f2efe6" ink={0.01} />)}
    <Dome pos={[0, h, 0]} r={0.6} color="#1a8a8a" />
    {[0.25, 0.5].map((k) => <B key={k} pos={[0, h * k, 0.55]} size={[0.3, 0.6, 0.1]} color="#3a2418" ink={0.01} />)}
  </group>
);
export const CityWall: React.FC<{ pos?: V3; len?: number }> = ({ pos = [0, 0, 0], len = 10 }) => (
  <group position={pos}>
    <Tex pos={[0, 1.6, 0]} size={[len, 3.2, 0.8]} map={mudTex()} />
    {[...Array(Math.round(len / 0.9))].map((_, i) => <B key={i} pos={[-len / 2 + 0.3 + i * 0.9, 3.5, 0]} size={[0.5, 0.6, 0.8]} color="#d9b88a" ink={0.02} />)}
  </group>
);
export const Fountain: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.3, 0]} r={1.6} h={0.6} color="#f2efe6" seg={8} />
    <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.45, 8]} /><meshStandardMaterial color="#5ab0e0" roughness={0.3} /></mesh>
    <Cyl pos={[0, 1.0, 0]} r={0.15} h={1.0} color="#f2efe6" />
    <Cyl pos={[0, 1.5, 0]} r={0.5} h={0.15} color="#f2efe6" seg={8} />
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const k = (t * 1.6 + i / 6) % 1;
      return <Ball key={i} pos={[Math.cos(i) * k * 0.9, 1.7 + Math.sin(k * Math.PI) * 0.6, Math.sin(i) * k * 0.9]} r={0.05} color="#bfe6ff" hull={0} />;
    })}
  </group>
);

/* ================================================================== */
/* THRONE HALL                                                           */
/* ================================================================== */
export const Throne: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.25, 0]} size={[3.2, 0.5, 2.4]} color="#7a1f3a" ink={0.04} />
    <B pos={[0, 0.85, 0]} size={[1.8, 0.7, 1.2]} color="#e0b040" ink={0.04} />
    <B pos={[0, 1.27, 0.05]} size={[1.6, 0.18, 1.0]} color="#c0392b" ink={0.03} />
    <B pos={[0, 2.3, -0.5]} size={[1.9, 2.3, 0.25]} color="#e0b040" ink={0.04} />
    <Ball pos={[0, 3.55, -0.5]} r={0.35} color="#e0b040" />
    {[-0.95, 0.95].map((x) => <B key={x} pos={[x, 1.55, 0]} size={[0.22, 0.7, 1.2]} color="#f2c230" ink={0.03} />)}
    <B pos={[0, 2.3, -0.36]} size={[1.4, 1.8, 0.04]} color="#c0392b" ink={0.01} />
  </group>
);
export const Colonnade: React.FC<{ pos?: V3; n?: number; spacing?: number }> = ({ pos = [0, 0, 0], n = 5, spacing = 2.2 }) => (
  <group position={pos}>
    {[...Array(n)].map((_, i) => {
      const x = (i - (n - 1) / 2) * spacing;
      return (
        <group key={i} position={[x, 0, 0]}>
          <Cyl pos={[0, 2.2, 0]} r={0.22} h={4.4} color="#f2efe6" seg={12} />
          <B pos={[0, 4.5, 0]} size={[0.6, 0.2, 0.6]} color="#e0b040" ink={0.02} />
          <B pos={[0, 0.1, 0]} size={[0.6, 0.2, 0.6]} color="#e0b040" ink={0.02} />
        </group>
      );
    })}
    {[...Array(n - 1)].map((_, i) => <PointedArch key={i} pos={[(i - (n - 2) / 2) * spacing, 2.6, 0]} w={spacing - 0.5} h={2.0} color="#f2efe6" dark="#d6c8a8" depth={0.3} />)}
  </group>
);
export const Carpet: React.FC<{ pos?: V3; w?: number; d?: number; rot?: number }> = ({ pos = [0, 0, 0], w = 4, d = 6, rot = 0 }) => (
  <mesh position={[pos[0], pos[1] + 0.02, pos[2]]} rotation={[-Math.PI / 2, 0, rot]} receiveShadow>
    <planeGeometry args={[w, d]} />
    <meshStandardMaterial map={carpetTex()} roughness={1} />
  </mesh>
);
export const HangingLamp: React.FC<{ pos?: V3; lit?: boolean; len?: number }> = ({ pos = [0, 0, 0], lit = true, len = 1.4 }) => (
  <group position={pos}>
    <mesh position={[0, len / 2, 0]}><cylinderGeometry args={[0.015, 0.015, len, 4]} /><meshBasicMaterial color="#5a4a2a" /></mesh>
    <P geo={() => <octahedronGeometry args={[0.32]} />} color={lit ? "#ffcf6a" : "#c8a050"} pos={[0, 0, 0]} scale={[1, 1.4, 1]} hull={0.08} emissive={lit ? "#a86a10" : "#000"} />
    <P geo={() => <coneGeometry args={[0.2, 0.25, 8]} />} color="#c8a050" pos={[0, 0.5, 0]} hull={0.08} />
  </group>
);
export const Brazier: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.5, 0]} r={0.08} h={1.0} color="#c8a050" />
    <Cyl pos={[0, 1.05, 0]} r={0.4} r2={0.3} h={0.25} color="#c8a050" seg={10} />
    {[0, 1, 2].map((i) => <Ball key={i} pos={[Math.sin(t * 2 + i) * 0.1, 1.4 + i * 0.35 + ((t * 0.5) % 0.3), 0]} r={0.16 + i * 0.06} color="#e8e4f0" hull={0} />)}
  </group>
);
export const Cushion: React.FC<{ pos?: V3; color?: string }> = ({ pos = [0, 0, 0], color = "#2a6ab0" }) => (
  <group position={pos}>
    <B pos={[0, 0.15, 0]} size={[0.9, 0.3, 0.9]} color={color} ink={0.03} />
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Ball key={`${sx}${sz}`} pos={[sx * 0.45, 0.2, sz * 0.45]} r={0.06} color="#e0b040" hull={0} />))}
  </group>
);
export const Drapes: React.FC<{ pos?: V3; w?: number; h?: number; color?: string }> = ({ pos = [0, 0, 0], w = 3, h = 5, color = "#7a1f3a" }) => (
  <group position={pos}>
    {[-1, 1].map((sd) => (
      <group key={sd} position={[sd * (w / 2 - 0.35), h / 2, 0]}>
        {[0, 1, 2].map((i) => <Cyl key={i} pos={[(i - 1) * 0.2, 0, 0]} r={0.12} h={h} color={color} seg={8} hull={0.03} />)}
      </group>
    ))}
    <B pos={[0, h + 0.1, 0]} size={[w, 0.2, 0.2]} color="#e0b040" ink={0.02} />
  </group>
);
export const LatticeWindow: React.FC<{ pos?: V3; w?: number; h?: number }> = ({ pos = [0, 0, 0], w = 1.4, h = 2.2 }) => (
  <group position={pos}>
    <PointedArch pos={[0, 0, 0]} w={w} h={h} color="#c8a070" dark="#6a3a1c" depth={0.2} />
    <mesh position={[0, h * 0.42, 0.1]}><planeGeometry args={[w * 0.85, h * 0.75]} /><meshBasicMaterial map={latticeTex()} /></mesh>
  </group>
);

/* ================================================================== */
/* ABU NAWAS'S HOUSE                                                     */
/* ================================================================== */
export const MudHouse: React.FC<{ pos?: V3; w?: number; h?: number }> = ({ pos = [0, 0, 0], w = 5, h = 3.2 }) => (
  <group position={pos}>
    <Tex pos={[0, h / 2, 0]} size={[w, h, 4]} map={mudTex()} />
    <B pos={[0, h + 0.1, 0]} size={[w + 0.3, 0.2, 4.3]} color="#b8946a" ink={0.03} />
    {[...Array(5)].map((_, i) => <Cyl key={i} pos={[-w / 2 + 0.6 + i * (w - 1.2) / 4, h - 0.2, 2.1]} r={0.08} h={0.5} color="#8b5a2b" rot={[Math.PI / 2, 0, 0]} hull={0.1} />)}
    <PointedArch pos={[-0.6, 0, 2.01]} w={1.1} h={2.0} color="#c8a070" dark="#6a4a2e" depth={0.12} />
    <B pos={[1.4, 1.9, 2.02]} size={[0.8, 0.8, 0.06]} color="#3a2418" ink={0.02} />
    <B pos={[1.4, 1.9, 2.06]} size={[0.06, 0.8, 0.02]} color="#8b5a2b" ink={0} />
  </group>
);
export const Mat: React.FC<{ pos?: V3; w?: number; d?: number }> = ({ pos = [0, 0, 0], w = 2.4, d = 1.6 }) => (
  <group position={pos}>
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, d]} /><meshBasicMaterial color="#d9c28a" /></mesh>
    {[...Array(8)].map((_, i) => <mesh key={i} position={[-w / 2 + 0.15 + i * (w / 8), 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.04, d]} /><meshBasicMaterial color="#b8a060" /></mesh>)}
  </group>
);
export const OilLamp: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <Ball pos={[0, 0.1, 0]} r={0.16} color="#c8743a" s={[1.4, 0.6, 1]} />
    <B pos={[0.2, 0.13, 0]} size={[0.14, 0.05, 0.06]} color="#c8743a" ink={0.01} />
    <P geo={() => <coneGeometry args={[0.05, 0.16 + Math.sin(t * 9) * 0.02, 8]} />} color="#ffcf3a" pos={[0.27, 0.24, 0]} hull={0} emissive="#ff9a2a" />
  </group>
);
export const ClayJar: React.FC<{ pos?: V3; s?: number; color?: string }> = ({ pos = [0, 0, 0], s = 1, color = "#c8743a" }) => (
  <group position={pos} scale={s}>
    <Ball pos={[0, 0.45, 0]} r={0.4} color={color} s={[1, 1.15, 1]} />
    <Cyl pos={[0, 0.95, 0]} r={0.16} r2={0.2} h={0.25} color={color} />
  </group>
);
export const LowTable: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.35, 0]} r={0.7} h={0.08} color="#8b5a2b" seg={8} />
    {[0, 1, 2, 3].map((i) => <B key={i} pos={[Math.cos(i * 1.57 + 0.78) * 0.45, 0.16, Math.sin(i * 1.57 + 0.78) * 0.45]} size={[0.07, 0.32, 0.07]} color="#6a4a2e" ink={0.01} />)}
    <Cyl pos={[0.2, 0.46, 0]} r={0.12} h={0.14} color="#e8e0c0" />
    <Ball pos={[-0.25, 0.46, 0.1]} r={0.12} color="#e0a040" s={[1, 0.5, 1]} />
  </group>
);
export const Shelf: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0, 0]} size={[1.8, 0.08, 0.35]} color="#8b5a2b" ink={0.02} />
    <ClayJar pos={[-0.6, 0.04, 0]} s={0.35} />
    <ClayJar pos={[-0.15, 0.04, 0]} s={0.3} color="#a85a2a" />
    <Bottle pos={[0.35, 0.04, 0]} s={0.8} />
    <Bottle pos={[0.65, 0.04, 0]} s={0.7} />
  </group>
);

/* ================================================================== */
/* MARKET                                                                 */
/* ================================================================== */
export const MarketStall: React.FC<{ pos?: V3; goods?: "fruit" | "spice" | "cloth"; awning?: string }> = ({ pos = [0, 0, 0], goods = "fruit", awning = "#c0392b" }) => (
  <group position={pos}>
    <B pos={[0, 0.5, 0]} size={[2.6, 1.0, 1.1]} color="#8b5a2b" ink={0.04} />
    {[-1.2, 1.2].map((x) => <B key={x} pos={[x, 1.6, -0.5]} size={[0.08, 3.2, 0.08]} color="#6a4a2e" ink={0.01} />)}
    {[...Array(6)].map((_, i) => <B key={i} pos={[-1.25 + i * 0.5, 3.1, 0]} size={[0.5, 0.05, 1.8]} color={i % 2 ? "#f2efe6" : awning} ink={0.01} rot={[0.25, 0, 0]} />)}
    {goods === "fruit" && [...Array(9)].map((_, i) => <Ball key={i} pos={[-0.9 + (i % 5) * 0.42, 1.12 + Math.floor(i / 5) * 0.2, -0.1 + Math.floor(i / 5) * 0.15]} r={0.17} color={["#e63946", "#f2a33a", "#8ac34a"][i % 3]} hull={0.08} />)}
    {goods === "spice" && [0, 1, 2, 3].map((i) => <P key={i} geo={() => <coneGeometry args={[0.28, 0.45, 12]} />} color={["#e8590c", "#f2c230", "#a83a2a", "#6a8a2a"][i]} pos={[-0.9 + i * 0.6, 1.22, 0]} hull={0.06} />)}
    {goods === "cloth" && [0, 1, 2].map((i) => <Cyl key={i} pos={[-0.7 + i * 0.7, 1.2, 0]} r={0.18} h={1.0} color={["#2a6ab0", "#c0392b", "#e0b040"][i]} rot={[0, 0, Math.PI / 2]} />)}
  </group>
);
export const Basket: React.FC<{ pos?: V3; s?: number }> = ({ pos = [0, 0, 0], s = 1 }) => (
  <group position={pos} scale={s}>
    <Cyl pos={[0, 0.25, 0]} r={0.4} r2={0.32} h={0.5} color="#c8a060" />
    {[0, 1, 2].map((i) => <Ball key={i} pos={[-0.15 + i * 0.15, 0.55, 0]} r={0.13} color="#8a3a6a" hull={0.08} />)}
  </group>
);
export const Camel: React.FC<{ pos?: V3; rot?: number; t?: number }> = ({ pos = [0, 0, 0], rot = 0, t = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <Ball pos={[0, 1.6, 0]} r={0.7} color="#d0a060" s={[1.5, 0.8, 0.8]} />
    <Ball pos={[-0.1, 2.15, 0]} r={0.4} color="#c89050" s={[1, 1, 0.9]} />
    <Cyl pos={[0.95, 2.0, 0]} r={0.16} h={1.0} color="#d0a060" rot={[0, 0, -0.5]} />
    <Ball pos={[1.25, 2.5 + Math.sin(t * 2) * 0.03, 0]} r={0.22} color="#d0a060" s={[1.5, 1, 1]} />
    {[[-0.6, 0.3], [0.6, 0.3], [-0.6, -0.3], [0.6, -0.3]].map(([x, z]) => <Cyl key={`${x}${z}`} pos={[x, 0.65, z]} r={0.1} h={1.3} color="#c89050" />)}
    <B pos={[-0.1, 1.95, 0]} size={[0.9, 0.12, 1.2]} color="#c0392b" ink={0.02} />
  </group>
);

/* ================================================================== */
/* STORY PROPS                                                             */
/* ================================================================== */
export const Bottle: React.FC<{ pos?: V3; s?: number; corked?: boolean; rot?: V3 }> = ({ pos = [0, 0, 0], s = 1, corked = true, rot = [0, 0, 0] }) => (
  <group position={pos} scale={s} rotation={rot}>
    <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.13, 0.15, 0.4, 14]} /><meshStandardMaterial color="#9ad8c0" transparent opacity={0.75} roughness={0.1} /></mesh>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.05, 0.12, 0.18, 12]} /><meshStandardMaterial color="#9ad8c0" transparent opacity={0.75} roughness={0.1} /></mesh>
    <mesh position={[0, 0.22, 0]} scale={1.08}><cylinderGeometry args={[0.13, 0.15, 0.4, 14]} /><meshBasicMaterial color="#0b0a0c" side={THREE.BackSide} /></mesh>
    {corked && <Cyl pos={[0, 0.63, 0]} r={0.055} h={0.1} color="#a8672a" hull={0.1} />}
  </group>
);
export const WindSwirl: React.FC<{ pos?: V3; t?: number; s?: number; color?: string }> = ({ pos = [0, 0, 0], t = 0, s = 1, color = "#e8f4ff" }) => {
  const curve = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 40; k++) {
      const a = k * 0.35;
      pts.push(new THREE.Vector3(Math.cos(a) * (0.2 + k * 0.025), k * 0.02, Math.sin(a) * (0.2 + k * 0.025)));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  return (
    <group position={pos} scale={s} rotation={[0, t * 2.5, 0.3]}>
      <mesh><tubeGeometry args={[curve, 60, 0.03, 5, false]} /><meshBasicMaterial color={color} transparent opacity={0.85} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(i * 2 + t * 4) * 0.9, 0.4 + i * 0.2, Math.sin(i * 2 + t * 4) * 0.9]} rotation={[t * 3 + i, i, 0]}><planeGeometry args={[0.18, 0.1]} /><meshBasicMaterial color={["#6ab04c", "#c8a040", "#8ac34a"][i]} side={THREE.DoubleSide} /></mesh>)}
    </group>
  );
};
export const StinkCloud: React.FC<{ pos?: V3; t?: number; k?: number }> = ({ pos = [0, 0, 0], t = 0, k = 1 }) => (
  <group position={pos} scale={k}>
    {[0, 1, 2, 3, 4].map((i) => <Ball key={i} pos={[Math.cos(i * 1.3 + t) * 0.35, 0.2 + i * 0.18, Math.sin(i * 1.3 + t) * 0.25]} r={0.22 + (i % 2) * 0.08} color="#a8c860" hull={0.06} />)}
  </group>
);
export const Kite: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos} rotation={[0, 0, Math.sin(t * 2) * 0.2]}>
    <P geo={() => <octahedronGeometry args={[0.5, 0]} />} color="#e63946" scale={[1, 1.3, 0.05]} hull={0.08} />
    <mesh position={[0, -0.9, 0]}><boxGeometry args={[0.02, 1.2, 0.02]} /><meshBasicMaterial color="#2a2a33" /></mesh>
  </group>
);

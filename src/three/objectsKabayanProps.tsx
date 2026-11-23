import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { P } from "./objectsRig";
import { InkBox } from "./objectsMolase";
import { Palm3D } from "./objectsAncol3d";

type V3 = [number, number, number];
const B = InkBox;
const INK = "#0b0a0c";
const Cyl: React.FC<{ pos: V3; r: number; h: number; color: string; rot?: V3; hull?: number; seg?: number; r2?: number }> = ({ pos, r, h, color, rot = [0, 0, 0], hull = 0.05, seg = 12, r2 }) => (
  <P geo={() => <cylinderGeometry args={[r2 ?? r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} />
);
const Ball: React.FC<{ pos: V3; r: number; color: string; s?: V3; hull?: number }> = ({ pos, r, color, s = [1, 1, 1], hull = 0.06 }) => (
  <P geo={() => <sphereGeometry args={[r, 14, 10]} />} color={color} pos={pos} scale={s} hull={hull} />
);
export { Palm3D };

/* ------------------------------------------------------------------ */
/* textures                                                              */
/* ------------------------------------------------------------------ */
const cache: Record<string, THREE.CanvasTexture> = {};
const mk = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rep?: [number, number]) => {
  if (cache[key]) return cache[key];
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
  cache[key] = t;
  return t;
};
/** woven bamboo wall (bilik) */
export const bilikTex = () =>
  mk("bilik", 256, 256, (c) => {
    c.fillStyle = "#d9b878";
    c.fillRect(0, 0, 256, 256);
    const s = 32;
    for (let y = 0; y < 256; y += s)
      for (let x = 0; x < 256; x += s) {
        const up = ((x + y) / s) % 2 === 0;
        c.fillStyle = up ? "#e8c88a" : "#c9a060";
        c.beginPath();
        if (up) {
          c.moveTo(x, y + s);
          c.lineTo(x + s, y);
          c.lineTo(x + s, y + s * 0.4);
          c.lineTo(x + s * 0.4, y + s);
        } else {
          c.moveTo(x, y);
          c.lineTo(x + s, y + s);
          c.lineTo(x + s * 0.6, y + s);
          c.lineTo(x, y + s * 0.4);
        }
        c.closePath();
        c.fill();
      }
    c.strokeStyle = "rgba(90,60,20,0.35)";
    c.lineWidth = 2;
    for (let i = -256; i < 512; i += 16) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 256, 256);
      c.stroke();
    }
  }, [3, 2]);
/** thatch / ijuk roof */
export const thatchTex = (dark = false) =>
  mk(`thatch${dark}`, 256, 256, (c) => {
    c.fillStyle = dark ? "#2a2420" : "#8a6a3a";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      c.strokeStyle = dark ? `rgba(${90 + Math.random() * 40},${80 + Math.random() * 30},70,0.5)` : `rgba(${200 + Math.random() * 40},${160 + Math.random() * 40},90,0.5)`;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (Math.random() - 0.5) * 6, y + 18 + Math.random() * 14);
      c.stroke();
    }
    for (let y = 0; y < 256; y += 42) {
      c.fillStyle = "rgba(0,0,0,0.18)";
      c.fillRect(0, y, 256, 6);
    }
  }, [2, 2]);
export const grassTex = () =>
  mk("grass", 256, 256, (c) => {
    c.fillStyle = "#6aa84a";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1200; i++) {
      c.strokeStyle = `rgba(${40 + Math.random() * 60},${120 + Math.random() * 60},${40 + Math.random() * 30},0.8)`;
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (Math.random() - 0.5) * 4, y - 6 - Math.random() * 6);
      c.stroke();
    }
  }, [6, 6]);
export const mudTex = () =>
  mk("mudK", 256, 256, (c) => {
    c.fillStyle = "#8a6a44";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 200; i++) {
      c.fillStyle = `rgba(${Math.random() > 0.5 ? "255,230,190" : "60,40,20"},0.1)`;
      c.beginPath();
      c.arc(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 0, Math.PI * 2);
      c.fill();
    }
  }, [4, 4]);

/* ================================================================== */
/* SAWAH                                                                 */
/* ================================================================== */
/** a flooded rice plot with a real mirror (reflects sky, clouds and characters) */
export const SawahWater: React.FC<{ pos: V3; w: number; d: number; tint?: string }> = ({ pos, w, d, tint = "#9ab8a8" }) => {
  const mirror = useMemo(() => {
    const m = new Reflector(new THREE.PlaneGeometry(w, d), { textureWidth: 1024, textureHeight: 1024, color: new THREE.Color(tint), clipBias: 0.003 });
    m.rotation.x = -Math.PI / 2;
    return m;
  }, [w, d, tint]);
  useEffect(() => () => {
    (mirror as unknown as { dispose?: () => void }).dispose?.();
  }, [mirror]);
  return (
    <group position={pos}>
      <primitive object={mirror} />
      {/* thin muddy rim so the plot reads as a shallow pool */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w + 0.3, d + 0.3]} /><meshStandardMaterial map={mudTex()} /></mesh>
    </group>
  );
};
/** a clump of young rice */
export const Padi: React.FC<{ pos: V3; s?: number; t?: number }> = ({ pos, s = 1, t = 0 }) => (
  <group position={pos} scale={s} rotation={[0, 0, Math.sin(t * 1.6 + pos[0]) * 0.05]}>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh key={i} position={[Math.cos(i * 1.26) * 0.04, 0.22, Math.sin(i * 1.26) * 0.04]} rotation={[Math.sin(i * 1.26) * 0.35, 0, -Math.cos(i * 1.26) * 0.35]}>
        <boxGeometry args={[0.025, 0.45, 0.01]} />
        <meshStandardMaterial color={i % 2 ? "#5aa83a" : "#7ac04a"} />
      </mesh>
    ))}
  </group>
);
export const PadiRows: React.FC<{ pos: V3; w: number; d: number; step?: number; t?: number; gapX?: [number, number] }> = ({ pos, w, d, step = 0.45, t = 0, gapX }) => {
  const items: V3[] = [];
  for (let x = -w / 2 + step / 2; x < w / 2; x += step)
    for (let z = -d / 2 + step / 2; z < d / 2; z += step) {
      if (gapX && x > gapX[0] && x < gapX[1]) continue;
      items.push([x, 0, z]);
    }
  return <group position={pos}>{items.map((p, i) => <Padi key={i} pos={p} t={t} s={0.9 + (i % 3) * 0.1} />)}</group>;
};
/** pematang / galengan: raised grassy earth bund */
export const Pematang: React.FC<{ pos: V3; len: number; rotY?: number; w?: number }> = ({ pos, len, rotY = 0, w = 0.7 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <mesh position={[0, 0.12, 0]} castShadow receiveShadow><boxGeometry args={[len, 0.3, w]} /><meshStandardMaterial map={mudTex()} /></mesh>
    <mesh position={[0, 0.275, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[len, w * 0.9]} /><meshStandardMaterial map={grassTex()} /></mesh>
    <mesh position={[0, 0.12, 0]} scale={[1, 1.02, 1.04]}><boxGeometry args={[len + 0.02, 0.3, w]} /><meshBasicMaterial color={INK} side={THREE.BackSide} /></mesh>
  </group>
);
export const Saung: React.FC<{ pos?: V3; rotY?: number }> = ({ pos = [0, 0, 0], rotY = 0 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    {[[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]].map(([x, z]) => <Cyl key={`${x}${z}`} pos={[x, 1.1, z]} r={0.07} h={2.2} color="#8a6a3a" />)}
    <B pos={[0, 0.7, 0]} size={[2.0, 0.1, 1.6]} color="#c8a060" ink={0.03} />
    {[...Array(9)].map((_, i) => <mesh key={i} position={[-0.9 + i * 0.225, 0.76, 0]}><boxGeometry args={[0.03, 0.01, 1.6]} /><meshBasicMaterial color="#8a6a3a" /></mesh>)}
    {[-1, 1].map((sd) => (
      <mesh key={sd} position={[0, 2.35, sd * 0.55]} rotation={[sd * 0.62, 0, 0]} castShadow>
        <boxGeometry args={[2.6, 0.08, 1.5]} />
        <meshStandardMaterial map={thatchTex()} />
      </mesh>
    ))}
    <B pos={[0, 2.78, 0]} size={[2.7, 0.08, 0.1]} color="#5a4a2a" ink={0.02} />
    <Cyl pos={[0.75, 1.7, 0.75]} r={0.06} h={0.5} color="#a87a3a" />
  </group>
);
export const Scarecrow: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos} rotation={[0, 0, Math.sin(t * 1.2) * 0.04]}>
    <Cyl pos={[0, 1.0, 0]} r={0.04} h={2.0} color="#8a6a3a" />
    <B pos={[0, 1.4, 0]} size={[1.2, 0.05, 0.05]} color="#8a6a3a" ink={0.01} />
    <B pos={[0, 1.25, 0]} size={[0.5, 0.6, 0.12]} color="#c0392b" ink={0.02} />
    <Ball pos={[0, 1.78, 0]} r={0.17} color="#e8d8b0" />
    <P geo={() => <coneGeometry args={[0.4, 0.22, 14]} />} color="#e0c080" pos={[0, 1.98, 0]} hull={0.06} />
    {[-0.55, 0.55].map((x) => <Cyl key={x} pos={[x, 1.25, 0]} r={0.06} h={0.14} color="#b8bfc8" />)}
  </group>
);
export const Kerbau: React.FC<{ pos?: V3; rotY?: number; t?: number }> = ({ pos = [0, 0, 0], rotY = 0, t = 0 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Ball pos={[0, 0.95, 0]} r={0.55} color="#4a4450" s={[1.6, 0.9, 0.85]} />
    <Ball pos={[0.95, 1.0 + Math.sin(t * 1.5) * 0.02, 0]} r={0.3} color="#4a4450" s={[1.2, 0.9, 0.9]} />
    <Ball pos={[1.2, 0.92, 0]} r={0.14} color="#7a7080" />
    {[-1, 1].map((sd) => <mesh key={sd} position={[0.85, 1.25, sd * 0.28]} rotation={[sd * 0.6, 0, -0.4]}><torusGeometry args={[0.25, 0.05, 6, 12, Math.PI]} /><meshStandardMaterial color="#d8d0c0" /></mesh>)}
    {[[-0.55, 0.25], [0.55, 0.25], [-0.55, -0.25], [0.55, -0.25]].map(([x, z]) => <Cyl key={`${x}${z}`} pos={[x, 0.3, z]} r={0.1} h={0.6} color="#4a4450" />)}
    <Cyl pos={[-0.95, 0.8, 0]} r={0.03} h={0.6} color="#4a4450" rot={[0, 0, 0.4]} />
  </group>
);
export const Tutut: React.FC<{ pos?: V3; s?: number; rot?: V3 }> = ({ pos = [0, 0, 0], s = 1, rot = [0, 0, 0] }) => (
  <group position={pos} scale={s} rotation={rot}>
    <P geo={() => <coneGeometry args={[0.07, 0.14, 10]} />} color="#3a4a2a" pos={[0, 0.07, 0]} hull={0.12} />
    <Ball pos={[0, 0.03, 0.02]} r={0.06} color="#4a5a32" hull={0.1} />
    <Ball pos={[0.02, 0.02, 0.06]} r={0.025} color="#e8d8b8" hull={0.1} />
  </group>
);
/** korang: bamboo basket tied at the waist / carried, for tutut */
export const Korang: React.FC<{ pos?: V3; s?: number; full?: number }> = ({ pos = [0, 0, 0], s = 1, full = 0 }) => (
  <group position={pos} scale={s}>
    <Cyl pos={[0, 0.18, 0]} r={0.2} r2={0.14} h={0.36} color="#c8a060" seg={10} hull={0.06} />
    {[0.08, 0.18, 0.28].map((y) => <Cyl key={y} pos={[0, y, 0]} r={y < 0.15 ? 0.155 : 0.18} h={0.02} color="#8a6a3a" seg={10} hull={0} />)}
    {full > 0 && [...Array(Math.round(full * 6))].map((_, i) => <Tutut key={i} pos={[Math.cos(i * 1.1) * 0.1, 0.34, Math.sin(i * 1.1) * 0.1]} s={0.9} />)}
    <mesh position={[0, 0.5, 0]}><torusGeometry args={[0.2, 0.012, 6, 16, Math.PI]} /><meshBasicMaterial color="#5a4a2a" /></mesh>
  </group>
);
export const Mountain: React.FC<{ pos: V3; r: number; h: number; color?: string; snow?: string }> = ({ pos, r, h, color = "#5a8a7a", snow = "#8ab0c0" }) => (
  <group position={pos}>
    <mesh position={[0, h / 2, 0]}><coneGeometry args={[r, h, 7]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[0, h * 0.86, 0]}><coneGeometry args={[r * 0.18, h * 0.28, 7]} /><meshStandardMaterial color={snow} flatShading /></mesh>
  </group>
);
export const Terrace: React.FC<{ pos: V3; w: number; steps?: number }> = ({ pos, w, steps = 4 }) => (
  <group position={pos}>
    {[...Array(steps)].map((_, i) => (
      <group key={i} position={[0, i * 0.8, -i * 2.2]}>
        <mesh position={[0, 0.4, 0]}><boxGeometry args={[w, 0.8, 2.2]} /><meshStandardMaterial map={grassTex()} /></mesh>
        <mesh position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w * 0.96, 2.0]} /><meshStandardMaterial color={i % 2 ? "#7ab0a0" : "#8ac0b0"} /></mesh>
      </group>
    ))}
  </group>
);

/* ================================================================== */
/* KAMPUNG                                                               */
/* ================================================================== */
/** rumah panggung with bilik walls and a suhunan jolopong (long saddle) roof */
export const RumahPanggung: React.FC<{ pos?: V3; rotY?: number; w?: number; d?: number }> = ({ pos = [0, 0, 0], rotY = 0, w = 6, d = 4.4 }) => {
  const H = 0.9; // stilt height
  const wallH = 2.4;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* umpak stones + stilts */}
      {[-w / 2 + 0.2, 0, w / 2 - 0.2].flatMap((x) => [-d / 2 + 0.2, d / 2 - 0.2].map((z) => (
        <group key={`${x}${z}`}>
          <Cyl pos={[x, 0.12, z]} r={0.2} r2={0.14} h={0.24} color="#8a8a90" seg={6} />
          <B pos={[x, H / 2 + 0.2, z]} size={[0.18, H, 0.18]} color="#6a4a2a" ink={0.02} />
        </group>
      )))}
      <B pos={[0, H + 0.25, 0]} size={[w + 0.2, 0.14, d + 0.6]} color="#8a6a3a" ink={0.03} />
      {/* bilik walls */}
      <group position={[0, H + 0.32 + wallH / 2, 0]}>
        <mesh castShadow receiveShadow><boxGeometry args={[w, wallH, d]} /><meshStandardMaterial map={bilikTex()} /></mesh>
        <mesh scale={[1.01, 1.01, 1.01]}><boxGeometry args={[w, wallH, d]} /><meshBasicMaterial color={INK} side={THREE.BackSide} /></mesh>
        {/* corner posts and beams */}
        {[-w / 2, w / 2].map((x) => <B key={x} pos={[x, 0, d / 2]} size={[0.14, wallH, 0.14]} color="#5a3a1a" ink={0.01} />)}
        <B pos={[0, wallH / 2 - 0.05, d / 2 + 0.02]} size={[w, 0.12, 0.08]} color="#5a3a1a" ink={0.01} />
        {/* door + windows with wooden shutters */}
        <B pos={[-0.9, -0.2, d / 2 + 0.03]} size={[0.9, 1.9, 0.06]} color="#6a4a2a" ink={0.02} />
        <B pos={[-0.9, -0.2, d / 2 + 0.07]} size={[0.06, 1.9, 0.02]} color="#4a2a10" ink={0} />
        {[1.0, 2.1].map((x) => (
          <group key={x} position={[x, 0.25, d / 2 + 0.03]}>
            <B pos={[0, 0, 0]} size={[0.8, 0.7, 0.04]} color="#2a1a10" ink={0.02} />
            {[-0.2, 0, 0.2].map((xx) => <B key={xx} pos={[xx, 0, 0.03]} size={[0.05, 0.7, 0.03]} color="#8a6a3a" ink={0} />)}
            <B pos={[-0.55, 0, 0.05]} size={[0.32, 0.72, 0.04]} color="#8a5a2a" ink={0.015} rot={[0, -0.6, 0]} />
          </group>
        ))}
      </group>
      {/* golodog (front steps) */}
      {[0, 1, 2].map((i) => <B key={i} pos={[-0.9, 0.18 + i * 0.32, d / 2 + 0.55 - i * 0.18]} size={[1.1, 0.08, 0.3]} color="#8a6a3a" ink={0.02} />)}
      {/* roof: long saddle, dark ijuk */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[0, H + 0.32 + wallH + 0.75, sd * (d / 4 + 0.15)]} rotation={[sd * 0.62, 0, 0]} castShadow>
          <boxGeometry args={[w + 1.2, 0.14, d / 2 + 1.1]} />
          <meshStandardMaterial map={thatchTex(true)} />
        </mesh>
      ))}
      <B pos={[0, H + 0.32 + wallH + 1.42, 0]} size={[w + 1.3, 0.12, 0.16]} color="#1a1410" ink={0.02} />
      {/* triangular gable ends in bilik */}
      {[-1, 1].map((sd) => {
        const shape = new THREE.Shape();
        shape.moveTo(-d / 2, 0);
        shape.lineTo(d / 2, 0);
        shape.lineTo(0, 1.35);
        shape.closePath();
        return (
          <mesh key={sd} position={[sd * (w / 2), H + 0.32 + wallH, 0]} rotation={[0, sd * Math.PI / 2, 0]}>
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial map={bilikTex()} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};
export const Leuit: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => (
      <group key={`${x}${z}`}>
        <B pos={[x, 0.45, z]} size={[0.12, 0.9, 0.12]} color="#6a4a2a" ink={0.015} />
        <Cyl pos={[x, 0.92, z]} r={0.16} h={0.06} color="#6a4a2a" />
      </group>
    ))}
    <mesh position={[0, 1.6, 0]} castShadow><boxGeometry args={[1.3, 1.3, 1.3]} /><meshStandardMaterial map={bilikTex()} /></mesh>
    <mesh position={[0, 1.6, 0]} scale={1.02}><boxGeometry args={[1.3, 1.3, 1.3]} /><meshBasicMaterial color={INK} side={THREE.BackSide} /></mesh>
    <mesh position={[0, 2.9, 0]} castShadow><coneGeometry args={[1.25, 1.6, 4]} /><meshStandardMaterial map={thatchTex(true)} /></mesh>
  </group>
);
export const BaleBale: React.FC<{ pos?: V3; rotY?: number }> = ({ pos = [0, 0, 0], rotY = 0 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <B pos={[0, 0.45, 0]} size={[2.0, 0.08, 0.9]} color="#d8b878" ink={0.03} />
    {[...Array(8)].map((_, i) => <mesh key={i} position={[-0.88 + i * 0.25, 0.495, 0]}><boxGeometry args={[0.03, 0.01, 0.9]} /><meshBasicMaterial color="#9a7a3a" /></mesh>)}
    {[[-0.9, -0.38], [0.9, -0.38], [-0.9, 0.38], [0.9, 0.38]].map(([x, z]) => <Cyl key={`${x}${z}`} pos={[x, 0.22, z]} r={0.05} h={0.44} color="#9a7a3a" />)}
  </group>
);
export const BambooClump: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const a = i * 0.9;
      const lean = 0.12 + (i % 3) * 0.06;
      return (
        <group key={i} position={[Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]} rotation={[Math.sin(a) * lean, 0, -Math.cos(a) * lean + Math.sin(t + i) * 0.015]}>
          <Cyl pos={[0, 3, 0]} r={0.07} h={6} color={i % 2 ? "#7a9a3a" : "#8aaa4a"} seg={8} hull={0.03} />
          {[1.5, 3, 4.5].map((y) => <Cyl key={y} pos={[0, y, 0]} r={0.08} h={0.05} color="#5a7a2a" seg={8} hull={0} />)}
          {[0, 1, 2].map((k) => <mesh key={k} position={[0.25, 5.2 + k * 0.3, 0]} rotation={[0, k, 0.8]}><boxGeometry args={[0.6, 0.02, 0.08]} /><meshStandardMaterial color="#6aa84a" /></mesh>)}
        </group>
      );
    })}
  </group>
);
export const Banana: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <Cyl pos={[0, 1.1, 0]} r={0.14} r2={0.1} h={2.2} color="#8aa060" />
    {[0, 1, 2, 3, 4].map((i) => (
      <group key={i} position={[0, 2.2, 0]} rotation={[0, i * 1.25, 0.9 + Math.sin(t + i) * 0.04]}>
        <mesh position={[0.65, 0, 0]}><boxGeometry args={[1.3, 0.02, 0.4]} /><meshStandardMaterial color={i % 2 ? "#5aa83a" : "#6ab84a"} /></mesh>
      </group>
    ))}
  </group>
);
export const BambooFence: React.FC<{ pos?: V3; len?: number; rotY?: number }> = ({ pos = [0, 0, 0], len = 4, rotY = 0 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    {[...Array(Math.round(len / 0.5) + 1)].map((_, i) => <Cyl key={i} pos={[-len / 2 + i * 0.5, 0.45, 0]} r={0.04} h={0.9} color="#c8a060" seg={6} hull={0.08} />)}
    {[0.35, 0.7].map((y) => <Cyl key={y} pos={[0, y, 0.02]} r={0.03} h={len} color="#a8803a" rot={[0, 0, Math.PI / 2]} seg={6} hull={0.08} />)}
  </group>
);
export const Lisung: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 0.25, 0]} size={[2.0, 0.5, 0.55]} color="#7a5a3a" ink={0.03} />
    <B pos={[0, 0.51, 0]} size={[1.6, 0.02, 0.3]} color="#3a2a1a" ink={0} />
    <Cyl pos={[0.5, 0.95, 0.35]} r={0.05} h={1.7} color="#a8803a" rot={[0.2, 0, 0.3]} />
  </group>
);
export const Hawu: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <B pos={[0, 0.35, 0]} size={[1.2, 0.7, 0.7]} color="#b86a3a" ink={0.03} />
    <B pos={[0, 0.25, 0.36]} size={[0.4, 0.3, 0.02]} color="#2a1a10" ink={0} />
    <Ball pos={[0, 0.25 + Math.sin(t * 9) * 0.01, 0.37]} r={0.08} color="#ff9a2a" hull={0} />
    <Cyl pos={[-0.25, 0.85, 0]} r={0.22} r2={0.26} h={0.3} color="#c8ccd4" />
    <P geo={() => <coneGeometry args={[0.24, 0.4, 12]} />} color="#d8b878" pos={[-0.25, 1.2, 0]} rot={[Math.PI, 0, 0]} hull={0.06} />
    <Cyl pos={[0.3, 0.8, 0]} r={0.18} h={0.2} color="#3a3a44" />
  </group>
);
export const Boboko: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.15, 0]} r={0.2} r2={0.14} h={0.3} color="#c8a060" seg={4} hull={0.06} />
    <Ball pos={[0, 0.3, 0]} r={0.16} color="#fff8ee" s={[1, 0.5, 1]} />
  </group>
);
export const Kendi: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Ball pos={[0, 0.22, 0]} r={0.2} color="#b86a3a" s={[1, 0.95, 1]} />
    <Cyl pos={[0, 0.48, 0]} r={0.05} r2={0.07} h={0.16} color="#b86a3a" />
    <Cyl pos={[0.2, 0.3, 0]} r={0.025} h={0.18} color="#b86a3a" rot={[0, 0, -0.9]} />
  </group>
);
export const Nyiru: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <Cyl pos={[0, 0, 0]} r={0.45} h={0.04} color="#d8b878" seg={20} hull={0.04} />
    <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.38, 0.45, 20]} /><meshBasicMaterial color="#9a7a3a" /></mesh>
  </group>
);
export const Ayam: React.FC<{ pos?: V3; t?: number; rotY?: number; color?: string }> = ({ pos = [0, 0, 0], t = 0, rotY = 0, color = "#e8e0d0" }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    <Ball pos={[0, 0.25, 0]} r={0.18} color={color} s={[1.3, 1, 0.9]} />
    <Ball pos={[0.2, 0.42 + Math.abs(Math.sin(t * 4)) * 0.03, 0]} r={0.09} color={color} />
    <P geo={() => <coneGeometry args={[0.035, 0.08, 6]} />} color="#e8a020" pos={[0.3, 0.42, 0]} rot={[0, 0, -Math.PI / 2]} hull={0.1} />
    <Ball pos={[0.2, 0.52, 0]} r={0.04} color="#d62828" hull={0.1} />
    <P geo={() => <coneGeometry args={[0.1, 0.22, 6]} />} color="#8a4a2a" pos={[-0.24, 0.36, 0]} rot={[0, 0, 0.9]} hull={0.08} />
    {[-0.05, 0.05].map((z) => <Cyl key={z} pos={[0.02, 0.06, z]} r={0.012} h={0.12} color="#e8a020" hull={0} />)}
  </group>
);
export const Caping: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => <P geo={() => <coneGeometry args={[0.45, 0.25, 18]} />} color="#e0c080" pos={pos} hull={0.06} />;
export const Pancuran: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.6, 0]} r={0.05} h={1.2} color="#8aaa4a" />
    <Cyl pos={[0.4, 1.15, 0]} r={0.06} h={0.9} color="#8aaa4a" rot={[0, 0, Math.PI / 2 - 0.2]} />
    <mesh position={[0.85, 0.6, 0]}><cylinderGeometry args={[0.02, 0.03, 1.0, 6]} /><meshBasicMaterial color="#bfe6ff" transparent opacity={0.8} /></mesh>
    <Cyl pos={[0.85, 0.06, 0]} r={0.4} h={0.12} color="#8a8a90" seg={8} />
  </group>
);

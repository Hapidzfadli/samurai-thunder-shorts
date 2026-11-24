import React, { useMemo } from "react";
import * as THREE from "three";
import { InkBox } from "./objectsMolase";
import { Sign } from "./objectsMolaseProps";
import { P } from "./objectsRig";
import { OrenCat3D } from "./objectsBubur";

type V3 = [number, number, number];
const INKC = "#241726";

const B: React.FC<{
  pos: V3;
  size: V3;
  color?: string;
  rot?: V3;
  ink?: number;
  map?: THREE.Texture;
  emissive?: string;
}> = ({ pos, size, color = "#fff", rot = [0, 0, 0], ink = 0.03, map, emissive }) => (
  <InkBox pos={pos} size={size} color={color} rot={rot} ink={ink} map={map} emissive={emissive} />
);

const Cyl: React.FC<{
  pos: V3;
  r: number;
  h: number;
  rTop?: number;
  color: string;
  rot?: V3;
  hull?: number;
  seg?: number;
}> = ({ pos, r, h, rTop = r, color, rot = [0, 0, 0], hull = 0.06, seg = 14 }) => (
  <P geo={() => <cylinderGeometry args={[rTop, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} />
);

/* ================================================================== */
/* 1. PROCEDURAL TEXTURES (LIVE STREAM SCREEN, STONE YARD, SIGN)      */
/* ================================================================== */
const makeLivePhoneTex = (): THREE.CanvasTexture => {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 448;
  const c = cv.getContext("2d")!;
  // Night camera feed background
  c.fillStyle = "#111827";
  c.fillRect(0, 0, 256, 448);
  const g = c.createRadialGradient(128, 180, 12, 128, 200, 150);
  g.addColorStop(0, "#1e3a5f");
  g.addColorStop(1, "#090d16");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 448);
  // LIVE red pill + viewer count
  c.fillStyle = "#dc2626";
  c.fillRect(16, 18, 82, 34);
  c.fillStyle = "#ffffff";
  c.font = "900 22px Arial, sans-serif";
  c.fillText("● LIVE", 24, 43);
  c.fillStyle = "rgba(0,0,0,0.65)";
  c.fillRect(108, 18, 130, 34);
  c.fillStyle = "#fef08a";
  c.font = "800 20px Arial, sans-serif";
  c.fillText("👁 2.4K", 122, 42);
  // Ghostly silhouette on screen
  c.fillStyle = "rgba(186,230,253,0.45)";
  c.beginPath();
  c.arc(128, 180, 38, 0, Math.PI * 2);
  c.fill();
  c.fillRect(102, 212, 52, 92);
  // Live comments scrolling at bottom
  c.fillStyle = "rgba(15,23,42,0.78)";
  c.fillRect(12, 324, 232, 108);
  c.fillStyle = "#38bdf8";
  c.font = "800 18px Arial, sans-serif";
  c.fillText("UJI NYALI MALAM JUMAT!", 20, 352);
  c.fillStyle = "#f8fafc";
  c.font = "700 16px Arial, sans-serif";
  c.fillText("• Bang belakang lo!! 😱", 20, 382);
  c.fillText("• Bagi gorengannya woy 🤣", 20, 408);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const makeYardGrassTex = (): THREE.CanvasTexture => {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#1e3a2f";
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 380; i++) {
    const x = (i * 67) % 256;
    const y = (i * 113) % 256;
    c.fillStyle = i % 3 === 0 ? "#162d24" : i % 3 === 1 ? "#26493a" : "#2f5744";
    c.fillRect(x, y, 6, 10);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 9);
  return t;
};

/* ================================================================== */
/* 2. HERO 3D PROPS (SENTER, HP LIVE, GORENGAN, TERMOS KOPI, AURA)    */
/* ================================================================== */

/** Heavy Metal Flashlight with Real 3D Volumetric Beam Cone! */
export const Flashlight3D: React.FC<{
  pos?: V3;
  rot?: V3;
  scale?: number;
  beam?: number;
  t?: number;
}> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, beam = 1, t = 0 }) => {
  const flicker = 0.88 + 0.12 * Math.sin(t * 23) * Math.cos(t * 9);
  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* Flashlight cylinder handle + yellow accent + wide chrome head */}
      <Cyl pos={[0, 0, 0]} r={0.06} h={0.34} rot={[Math.PI / 2, 0, 0]} color="#1e293b" hull={0.07} />
      <Cyl pos={[0, 0, 0.08]} r={0.068} h={0.06} rot={[Math.PI / 2, 0, 0]} color="#facc15" hull={0.06} />
      <Cyl pos={[0, 0, 0.20]} r={0.065} rTop={0.115} h={0.14} rot={[Math.PI / 2, 0, 0]} color="#334155" hull={0.07} />
      {/* Glowing warm lens face */}
      <mesh position={[0, 0, 0.275]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.10, 0.10, 0.02, 16]} />
        <meshBasicMaterial color="#fef9c3" />
      </mesh>
      {/* Volumetric translucent light cone sweeping ahead */}
      {beam > 0.05 && (
        <mesh position={[0, 0, 0.28 + 1.15 * beam]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.78 * beam, 2.3 * beam, 18, 1, true]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.22 * beam * flicker}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

/** Riko's Smartphone Live-Stream Gimbal Selfie-Stick */
export const PhoneGimbal3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
}) => {
  const screenTex = useMemo(() => makeLivePhoneTex(), []);
  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* Gimbal grip + telescoping pole + tiny tripod legs */}
      <Cyl pos={[0, 0.12, 0]} r={0.032} h={0.26} color="#18181b" hull={0.07} />
      <Cyl pos={[0, 0.36, 0]} r={0.018} h={0.28} color="#94a3b8" hull={0.07} />
      {/* Clamp & Smartphone body */}
      <B pos={[0, 0.56, 0]} size={[0.24, 0.38, 0.04]} color="#0f172a" ink={0.02} />
      <B pos={[0, 0.56, 0.024]} size={[0.20, 0.34, 0.012]} map={screenTex} ink={0.005} />
      {/* Glowing tiny ring light perched on top of phone */}
      <mesh position={[0, 0.80, 0.02]}>
        <torusGeometry args={[0.075, 0.016, 8, 18]} />
        <meshBasicMaterial color="#fef9c3" />
      </mesh>
    </group>
  );
};

/** Warm Crispy Indonesian Gorengan Basket (Pisang Goreng, Tahu Isi, Bakwan & Cabai Rawit!) */
export const GorenganBasket3D: React.FC<{
  pos?: V3;
  rot?: V3;
  scale?: number;
  t?: number;
  steam?: boolean;
}> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, t = 0, steam = true }) => (
  <group position={pos} rotation={rot} scale={scale}>
    {/* Woven bamboo tampah tray + folded brown oil-paper liner */}
    <Cyl pos={[0, 0.04, 0]} r={0.34} rTop={0.42} h={0.08} color="#b45309" hull={0.06} seg={18} />
    <Cyl pos={[0, 0.085, 0]} r={0.36} h={0.02} color="#d6b47a" hull={0.04} seg={16} />
    {/* Open brown paper bag behind */}
    <B pos={[-0.14, 0.24, -0.14]} size={[0.28, 0.36, 0.18]} rot={[0.12, 0.25, -0.08]} color="#a16207" ink={0.025} />
    {/* Golden Crispy Pisang Goreng slices */}
    <B pos={[-0.15, 0.16, 0.08]} size={[0.22, 0.07, 0.11]} rot={[0.18, 0.35, 0.22]} color="#f59e0b" ink={0.018} />
    <B pos={[-0.08, 0.24, 0.04]} size={[0.23, 0.07, 0.11]} rot={[-0.12, -0.25, 0.34]} color="#fbbf24" ink={0.018} />
    {/* Crispy Tahu Isi cubes */}
    <B pos={[0.14, 0.16, 0.10]} size={[0.14, 0.13, 0.14]} rot={[0.08, 0.4, -0.06]} color="#d97706" ink={0.018} />
    <B pos={[0.18, 0.21, -0.05]} size={[0.14, 0.13, 0.14]} rot={[-0.1, -0.2, 0.15]} color="#ea580c" ink={0.018} />
    {/* Crispy Bakwan Sayur discs with tiny carrot/scallion flecks */}
    <Cyl pos={[0.02, 0.15, 0.18]} r={0.11} h={0.055} rot={[0.22, 0, -0.15]} color="#f59e0b" hull={0.06} seg={12} />
    <Cyl pos={[0.04, 0.24, 0.12]} r={0.105} h={0.05} rot={[-0.18, 0.2, 0.2]} color="#d97706" hull={0.06} seg={12} />
    {/* Bright green Cabai Rawit Hijau chilies tucked in front! */}
    <Cyl pos={[-0.22, 0.13, 0.22]} r={0.022} h={0.14} rot={[0.2, 0.4, Math.PI / 2.2]} color="#16a34a" hull={0.08} seg={8} />
    <Cyl pos={[0.22, 0.13, 0.20]} r={0.022} h={0.14} rot={[-0.2, -0.3, -Math.PI / 2.3]} color="#22c55e" hull={0.08} seg={8} />
    {/* Warm appetizing aroma steam puffs */}
    {steam &&
      [0, 1, 2].map((i) => {
        const k = (t * 0.55 + i * 0.33) % 1;
        return (
          <mesh key={i} position={[(i - 1) * 0.14 + Math.sin(k * 6 + i) * 0.06, 0.34 + k * 0.58, 0.05]}>
            <sphereGeometry args={[0.05 + k * 0.055, 8, 8]} />
            <meshBasicMaterial color="#fef3c7" transparent opacity={Math.sin(k * Math.PI) * 0.52} depthWrite={false} />
          </mesh>
        );
      })}
  </group>
);

/** Single Hand-Holdable Crispy Pisang Goreng Piece */
export const PisangGoreng3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    <B pos={[0, 0, 0]} size={[0.24, 0.09, 0.13]} rot={[0, 0, 0.15]} color="#f59e0b" ink={0.02} />
    <B pos={[0.04, 0.02, 0.02]} size={[0.14, 0.07, 0.10]} rot={[0.1, 0.2, -0.1]} color="#fbbf24" ink={0.015} />
  </group>
);

/** Classic Indonesian Thermos & Steaming Kopi Hitam Cups Set */
export const ThermosCoffeeSet3D: React.FC<{ pos?: V3; scale?: number; t?: number }> = ({
  pos = [0, 0, 0],
  scale = 1,
  t = 0,
}) => (
  <group position={pos} scale={scale}>
    {/* Red vintage thermos with white cap & handle */}
    <Cyl pos={[-0.18, 0.26, 0]} r={0.12} h={0.52} color="#dc2626" hull={0.06} seg={16} />
    <Cyl pos={[-0.18, 0.26, 0]} r={0.125} h={0.14} color="#fef08a" hull={0.04} seg={16} />
    <Cyl pos={[-0.18, 0.57, 0]} r={0.095} h={0.12} color="#f8fafc" hull={0.06} seg={14} />
    <B pos={[-0.32, 0.32, 0]} size={[0.05, 0.24, 0.05]} color="#f8fafc" ink={0.015} />
    {/* Two steaming cups of Kopi Hitam */}
    {[
      [0.14, 0.09, 0.08, "#38bdf8"],
      [0.34, 0.09, -0.06, "#f472b6"],
    ].map(([cx, cy, cz, col], idx) => (
      <group key={idx} position={[cx as number, cy as number, cz as number]}>
        <Cyl pos={[0, 0, 0]} r={0.065} rTop={0.08} h={0.18} color={col as string} hull={0.06} seg={12} />
        <Cyl pos={[0, 0.085, 0]} r={0.072} h={0.02} color="#29150b" hull={0.02} seg={12} />
        {[0, 1].map((s) => {
          const k = (t * 0.6 + idx * 0.4 + s * 0.5) % 1;
          return (
            <mesh key={s} position={[Math.sin(k * 5 + idx) * 0.03, 0.14 + k * 0.28, 0]}>
              <sphereGeometry args={[0.028 + k * 0.03, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={Math.sin(k * Math.PI) * 0.5} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    ))}
  </group>
);

/** Eerie Cyan-Violet Ghostly Entrance Aura + Floating Spirit Wisps */
export const SpookyAura3D: React.FC<{ pos?: V3; scale?: number; t?: number }> = ({
  pos = [0, 0, 0],
  scale = 1,
  t = 0,
}) => {
  const pulse = 0.92 + Math.sin(t * 7) * 0.1;
  return (
    <group position={pos} scale={scale * pulse}>
      <mesh rotation={[Math.PI / 2, 0, t * 2.2]}>
        <torusGeometry args={[0.72, 0.045, 8, 24]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2.2, 0.2, -t * 3.1]}>
        <torusGeometry args={[0.98, 0.035, 8, 24]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.62} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = t * 2.2 + (i * Math.PI * 2) / 5;
        const r = 0.85 + Math.sin(t * 3 + i) * 0.15;
        const y = 0.35 + ((t * 0.8 + i * 0.2) % 1) * 1.45;
        return (
          <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#67e8f9" : "#d8b4fe"} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ================================================================== */
/* 3. LUSH 3D HAUNTED COLONIAL HOUSE, BANYAN TREE & MOONLIT YARD      */
/* ================================================================== */

/** Ancient Indonesian Sacred Banyan Tree (Pohon Beringin) with Swaying Aerial Roots */
const BanyanTree3D: React.FC<{ pos?: V3; scale?: number; t?: number }> = ({ pos = [0, 0, 0], scale = 1, t = 0 }) => {
  const sway = Math.sin(t * 1.35) * 0.045;
  return (
    <group position={pos} scale={scale}>
      {/* Massive gnarled multi-buttress banyan trunk */}
      <Cyl pos={[0, 1.55, 0]} r={0.55} rTop={0.34} h={3.1} color="#3b2618" hull={0.05} seg={12} />
      <Cyl pos={[-0.36, 0.95, 0.22]} r={0.26} rTop={0.14} h={1.9} rot={[0.15, 0, 0.25]} color="#4a3120" hull={0.05} />
      <Cyl pos={[0.38, 1.0, 0.18]} r={0.24} rTop={0.12} h={2.0} rot={[0.12, 0, -0.28]} color="#4a3120" hull={0.05} />
      {/* Wide reaching branches */}
      <Cyl pos={[-0.95, 3.05, 0.15]} r={0.18} rTop={0.10} h={2.2} rot={[0, 0, 0.78]} color="#3b2618" hull={0.05} />
      <Cyl pos={[1.05, 3.15, 0.1]} r={0.18} rTop={0.10} h={2.3} rot={[0, 0, -0.75]} color="#3b2618" hull={0.05} />
      {/* Thick dark-emerald moonlit foliage canopy + hanging aerial roots! */}
      <group rotation={[0, 0, sway]}>
        <P geo={() => <dodecahedronGeometry args={[1.65, 1]} />} color="#14532d" pos={[0, 4.15, 0]} hull={0.04} />
        <P geo={() => <dodecahedronGeometry args={[1.32, 1]} />} color="#166534" pos={[-1.35, 3.65, 0.25]} hull={0.04} />
        <P geo={() => <dodecahedronGeometry args={[1.38, 1]} />} color="#15803d" pos={[1.38, 3.72, 0.22]} hull={0.04} />
        <P geo={() => <dodecahedronGeometry args={[1.15, 1]} />} color="#1e4035" pos={[0.25, 4.95, -0.25]} hull={0.04} />
        {/* Swaying Hanging Banyan Aerial Roots (Akar Gantung!) */}
        {[-1.55, -0.95, 0.85, 1.48, 1.85].map((rx, idx) => (
          <group key={idx} position={[rx, 3.1, 0.45 + (idx % 2) * 0.22]} rotation={[0, 0, Math.sin(t * 2.1 + idx) * 0.1]}>
            <Cyl pos={[0, -0.95, 0]} r={0.032} rTop={0.045} h={1.9 + (idx % 3) * 0.3} color="#573a24" hull={0.08} seg={6} />
          </group>
        ))}
      </group>
    </group>
  );
};

/** 2-Story Indonesian Abandoned Colonial Mansion (Rumah Tua Belanda) */
const ColonialHauntedHouse3D: React.FC<{ pos?: V3; t?: number; cozy?: number }> = ({
  pos = [0, 0, 0],
  t = 0,
  cozy = 0,
}) => {
  const lampFlicker = cozy > 0.4 ? 1 : 0.65 + 0.35 * Math.sin(t * 17) * Math.sin(t * 7.3);
  return (
    <group position={pos}>
      {/* Raised Mossy Stone Foundation & Front Porch Steps */}
      <B pos={[0, 0.38, 0.6]} size={[9.6, 0.76, 3.4]} color="#57534e" ink={0.04} />
      <B pos={[0, 0.25, 2.55]} size={[3.2, 0.50, 0.72]} color="#64748b" ink={0.03} />
      <B pos={[0, 0.12, 3.12]} size={[3.4, 0.24, 0.56]} color="#78716c" ink={0.03} />

      {/* Ground-Floor Weathered Colonial Cream-Sage Walls */}
      <B pos={[0, 2.35, -0.75]} size={[9.2, 3.35, 1.9]} color="#cbd5c0" ink={0.045} />
      {/* Weathering moss patches & creeping ivy vines */}
      <B pos={[-3.4, 1.35, 0.24]} size={[1.35, 1.15, 0.08]} color="#4d7c59" ink={0.015} />
      <B pos={[3.5, 2.95, 0.24]} size={[1.1, 1.45, 0.08]} color="#3f6a4b" ink={0.015} />

      {/* 4 Tall Fluted Colonial Porch Pillars */}
      {[-3.95, -1.65, 1.65, 3.95].map((px, i) => (
        <group key={i} position={[px, 0.76, 2.05]}>
          <B pos={[0, 0.16, 0]} size={[0.52, 0.32, 0.52]} color="#94a3b8" ink={0.025} />
          <Cyl pos={[0, 1.65, 0]} r={0.18} h={3.0} color="#e2e8f0" hull={0.05} seg={12} />
          <B pos={[0, 3.16, 0]} size={[0.54, 0.24, 0.54]} color="#cbd5e1" ink={0.025} />
        </group>
      ))}

      {/* Slightly Ajar Dark Colonial Double Doors */}
      <B pos={[0, 2.12, 0.20]} size={[2.15, 2.72, 0.12]} color="#0f172a" ink={0.02} />
      <B pos={[-0.62, 2.12, 0.28]} size={[0.92, 2.65, 0.12]} rot={[0, 0.28, 0]} color="#5c361e" ink={0.03} />
      <B pos={[0.52, 2.12, 0.24]} size={[0.92, 2.65, 0.12]} color="#4a2b18" ink={0.03} />

      {/* Tall Colonial Louvered Windows (Left crooked shutter!) */}
      {[-2.85, 2.85].map((wx, i) => (
        <group key={i} position={[wx, 2.35, 0.24]}>
          <B pos={[0, 0, 0]} size={[1.45, 1.85, 0.12]} color="#1e1b2e" ink={0.03} />
          <B pos={[0, 0, 0.06]} size={[1.22, 1.62, 0.04]} color={cozy > 0.5 ? "#fde68a" : "#1e293b"} emissive={cozy > 0.5 ? "#f59e0b" : undefined} ink={0.015} />
          <B pos={[-0.78, 0, 0.12]} size={[0.38, 1.78, 0.06]} rot={[0, 0.35, i === 0 ? 0.14 : 0]} color="#3f6212" ink={0.02} />
          <B pos={[0.78, 0, 0.12]} size={[0.38, 1.78, 0.06]} rot={[0, -0.35, 0]} color="#3f6212" ink={0.02} />
        </group>
      ))}

      {/* Vintage Hanging Brass Porch Lantern (flickers eerie -> warm golden glow in hangout mode!) */}
      <group position={[0, 3.62, 1.65]} rotation={[0, 0, Math.sin(t * 2.2) * 0.06]}>
        <Cyl pos={[0, 0.22, 0]} r={0.025} h={0.42} color="#18181b" />
        <P geo={() => <sphereGeometry args={[0.18, 12, 10]} />} color={cozy > 0.4 ? "#fde047" : "#fef08a"} pos={[0, -0.04, 0]} hull={0.04} />
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.32 + cozy * 0.12, 12, 10]} />
          <meshBasicMaterial color={cozy > 0.4 ? "#fbbf24" : "#fef08a"} transparent opacity={(0.28 + cozy * 0.28) * lampFlicker} depthWrite={false} />
        </mesh>
      </group>

      {/* Porch Roof Deck + 2nd-Floor Colonial Balcony & Ornate Wrought-Iron Railing */}
      <B pos={[0, 4.12, 0.85]} size={[9.8, 0.28, 3.2]} color="#64748b" ink={0.04} />
      <B pos={[0, 4.88, 2.25]} size={[9.5, 0.08, 0.08]} color="#1e293b" ink={0.015} />
      {[-4.4, -3.3, -2.2, -1.1, 0, 1.1, 2.2, 3.3, 4.4].map((bx, i) => (
        <B key={i} pos={[bx, 4.52, 2.25]} size={[0.06, 0.72, 0.06]} color="#334155" ink={0.01} />
      ))}

      {/* 2nd-Floor Wall + Moonlit Arched Attic Windows + Stepped Dutch Clay Roof */}
      <B pos={[0, 5.55, -0.65]} size={[8.6, 2.65, 1.7]} color="#bcc8b4" ink={0.045} />
      {[-2.1, 0, 2.1].map((wx, i) => (
        <group key={i} position={[wx, 5.65, 0.24]}>
          <B pos={[0, 0, 0]} size={[1.15, 1.42, 0.10]} color="#3b2618" ink={0.03} />
          <B pos={[0, 0, 0.04]} size={[0.92, 1.18, 0.05]} color="#312e81" ink={0.015} />
        </group>
      ))}
      <B pos={[0, 7.18, 0.05]} size={[9.6, 0.46, 3.4]} rot={[0.26, 0, 0]} color="#7f1d1d" ink={0.04} />
      <B pos={[0, 7.62, -1.15]} size={[9.8, 0.28, 0.45]} color="#450a0a" ink={0.03} />
    </group>
  );
};

/** Full Moonlit Haunted Colonial Mansion Yard Diorama (Shifts from Spooky Blue to Warm Hangout Glow!) */
export const HauntedMansionYard: React.FC<{ t?: number; cozy?: number; showCat?: boolean; hideGate?: boolean }> = ({
  t = 0,
  cozy = 0,
  showCat = false,
  hideGate = false,
}) => {
  const grassTex = useMemo(() => makeYardGrassTex(), []);
  return (
    <group>
      {/* Giant Glowing Full Moon + Layered Moon Halos + Twinkling 3D Stars + Drifting Clouds */}
      <group position={[4.1, 6.5, -12.2]}>
        <mesh>
          <sphereGeometry args={[1.65, 20, 14]} />
          <meshBasicMaterial color="#fef9c3" />
        </mesh>
        <mesh position={[0, 0, -0.25]}>
          <sphereGeometry args={[2.35, 18, 12]} />
          <meshBasicMaterial color="#bae6fd" transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, -0.45]}>
          <sphereGeometry args={[3.2, 18, 12]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>
      {[
        [-7.5, 8.8, -14],
        [-3.4, 9.4, -15],
        [0.4, 8.6, -14.5],
        [-5.8, 7.2, -14],
        [8.2, 8.4, -14],
        [2.2, 9.6, -15],
      ].map(([sx, sy, sz], i) => (
        <mesh key={i} position={[sx, sy, sz]} scale={0.11 + Math.abs(Math.sin(t * 2.5 + i)) * 0.08}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      ))}
      {[
        [-5.8, 6.8, -11.5, 1.35],
        [2.6, 7.2, -12.0, 1.45],
        [7.4, 6.4, -11.0, 1.15],
      ].map(([cx, cy, cz, sc], idx) => (
        <group key={idx} position={[cx + Math.sin(t * 0.22 + idx * 1.9) * 0.75, cy, cz]} scale={sc}>
          <P geo={() => <dodecahedronGeometry args={[0.78, 1]} />} color="#2e2a5c" pos={[0, 0, 0]} hull={0.02} />
          <P geo={() => <dodecahedronGeometry args={[0.62, 1]} />} color="#3730a3" pos={[0.68, -0.1, 0.1]} hull={0.02} />
          <P geo={() => <dodecahedronGeometry args={[0.56, 1]} />} color="#26234e" pos={[-0.62, -0.08, 0.06]} hull={0.02} />
        </group>
      ))}

      {/* Moonlit Grass Ground + Broken Stone Garden Walkway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow>
        <planeGeometry args={[36, 28]} />
        <meshStandardMaterial map={grassTex} roughness={0.96} />
      </mesh>
      {[-2.4, -1.35, -0.35, 0.65, 1.65, 2.65, 3.65].map((wz, i) => (
        <B
          key={i}
          pos={[(i % 2 === 0 ? -0.18 : 0.22), 0.03, wz]}
          size={[1.45, 0.06, 0.78]}
          rot={[0, (i % 3 - 1) * 0.06, 0]}
          color={i % 2 === 0 ? "#64748b" : "#78716c"}
          ink={0.02}
        />
      ))}

      {/* 2-Story Colonial Haunted Mansion Center-Back */}
      <ColonialHauntedHouse3D pos={[0.25, 0, -5.65]} t={t} cozy={cozy} />

      {/* Monumental Sacred Banyan Tree (Pohon Beringin Keramat) Left-Midground */}
      <BanyanTree3D pos={[-5.15, 0, -2.55]} scale={1.15} t={t} />

      {/* Cozy Wooden Garden Bench & Low Stone Table in Front Yard (Hangout Spot for Gorengan!) */}
      <group position={[-0.65, 0, -0.35]}>
        {/* Wooden bench */}
        <B pos={[0, 0.48, -0.68]} size={[2.45, 0.09, 0.44]} color="#78350f" ink={0.03} />
        <B pos={[0, 0.88, -0.88]} size={[2.45, 0.34, 0.08]} rot={[-0.12, 0, 0]} color="#92400e" ink={0.03} />
        <B pos={[-1.0, 0.24, -0.68]} size={[0.10, 0.48, 0.36]} color="#451a03" ink={0.02} />
        <B pos={[1.0, 0.24, -0.68]} size={[0.10, 0.48, 0.36]} color="#451a03" ink={0.02} />
        {/* Low wooden/stone hangout table in front of bench (tabletop world y = 0.725!) */}
        <B pos={[0.05, 0.68, 0.16]} size={[1.85, 0.09, 0.88]} color="#64748b" ink={0.035} />
        <B pos={[-0.68, 0.34, 0.16]} size={[0.24, 0.68, 0.68]} color="#475569" ink={0.025} />
        <B pos={[0.78, 0.34, 0.16]} size={[0.24, 0.68, 0.68]} color="#475569" ink={0.025} />
      </group>

      {/* Rusty Wrought-Iron Front Fence + Twin Mossy Stone Gate Pillars + Crooked Warning Sign */}
      {!hideGate && (
        <group position={[0, 0, 3.65]}>
          {[-4.2, -2.6, 2.6, 4.2].map((fx, i) => (
            <group key={i} position={[fx, 0, 0]}>
              <B pos={[0, 0.35, 0]} size={[1.6, 0.7, 0.28]} color="#57534e" ink={0.025} />
              {[-0.55, -0.18, 0.18, 0.55].map((bx, k) => (
                <B key={k} pos={[bx, 1.15, 0]} size={[0.05, 1.15, 0.05]} color="#1e293b" ink={0.01} />
              ))}
            </group>
          ))}
          {/* Twin Mossy Gate Pillars */}
          {[-1.72, 1.72].map((px, i) => (
            <group key={i} position={[px, 0, 0]}>
              <B pos={[0, 1.12, 0]} size={[0.56, 2.24, 0.56]} color="#64748b" ink={0.035} />
              <B pos={[0, 2.30, 0]} size={[0.66, 0.14, 0.66]} color="#475569" ink={0.02} />
              <P geo={() => <sphereGeometry args={[0.20, 10, 8]} />} color="#cbd5e1" pos={[0, 2.52, 0]} hull={0.05} />
            </group>
          ))}
          {/* Crooked wooden warning sign hung on right fence */}
          <group position={[3.05, 1.52, 0.20]} rotation={[0, 0, -0.12]}>
            <Sign pos={[0, 0, 0]} w={2.15} h={0.62} text="RUMAH KOSONG!" bg="#fef08a" fg="#991b1b" />
          </group>
        </group>
      )}

      {/* Lush Night Ferns & Wild Bushes on Right Yard */}
      {[
        [3.65, 0.45, -1.65, 0.78],
        [4.55, 0.55, -2.45, 0.95],
        [-3.65, 0.42, 1.35, 0.68],
      ].map(([bx, by, bz, sc], i) => (
        <group key={i} position={[bx, by, bz]} scale={sc}>
          <P geo={() => <dodecahedronGeometry args={[0.72, 1]} />} color="#14532d" pos={[0, 0, 0]} hull={0.04} />
          <P geo={() => <dodecahedronGeometry args={[0.55, 1]} />} color="#166534" pos={[0.45, -0.12, 0.25]} hull={0.04} />
        </group>
      ))}

      {/* Twinkling Golden Fireflies (Kunang-Kunang) gently dancing around the banyan & yard! */}
      {[
        [-3.2, 1.85, -1.2],
        [-2.1, 2.35, -2.0],
        [1.8, 1.75, -1.5],
        [2.9, 2.45, -0.8],
        [-0.4, 2.65, -2.4],
        [0.9, 1.55, 0.6],
      ].map(([fx, fy, fz], i) => (
        <mesh
          key={i}
          position={[fx + Math.sin(t * 1.8 + i * 1.4) * 0.35, fy + Math.cos(t * 2.2 + i) * 0.24, fz]}
          scale={0.045 + Math.abs(Math.sin(t * 4.2 + i)) * 0.035}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      ))}

      {/* Translucent Ground Mist Layers (thick & spooky at cozy=0, clearing up gently at cozy=1!) */}
      {cozy < 0.85 &&
        [
          [-2.8, 0.32, -1.6],
          [0.4, 0.28, -2.2],
          [2.9, 0.34, -1.2],
          [-1.5, 0.25, 1.4],
          [2.1, 0.28, 1.2],
        ].map(([mx, my, mz], i) => (
          <mesh key={i} position={[mx + Math.sin(t * 0.4 + i) * 0.45, my, mz]} scale={[1.85, 0.42, 1.35]}>
            <dodecahedronGeometry args={[0.82, 1]} />
            <meshBasicMaterial color="#bae6fd" transparent opacity={0.18 * (1 - cozy)} depthWrite={false} />
          </mesh>
        ))}

      {/* Hidden Easter Egg: Brave Kucing Oren peeking playfully right beside the stone yard table! */}
      {showCat && <OrenCat3D pos={[1.25, 0.02, 0.85]} rot={[0, -0.45, 0]} scale={1.05} t={t} />}

      {/* Dynamic Moonlight -> Warm Cozy Hangout Lighting */}
      <hemisphereLight args={[cozy > 0.4 ? "#fde68a" : "#818cf8", cozy > 0.4 ? "#422006" : "#1e1b4b", 1.05 + cozy * 0.42]} />
      <directionalLight
        position={[5, 10, 6]}
        intensity={1.28 + cozy * 0.35}
        color={cozy > 0.4 ? "#ffedd5" : "#c7d2fe"}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0.2, 3.2, -3.8]} color="#fbbf24" intensity={1.8 + cozy * 3.8} distance={14} />
      <pointLight position={[-0.6, 1.9, 0.4]} color={cozy > 0.4 ? "#fb923c" : "#38bdf8"} intensity={1.2 + cozy * 2.8} distance={9} />
    </group>
  );
};

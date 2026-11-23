import React, { useMemo } from "react";
import * as THREE from "three";
import { InkBox } from "./objectsMolase";
import { Sign } from "./objectsMolaseProps";
import { P } from "./objectsRig";

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
/* 1. PROCEDURAL TEXTURES (GEROBAK BANNER, BUKU BON, PAVING ROAD)     */
/* ================================================================== */
const makeCartBannerTex = (): THREE.CanvasTexture => {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 192;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#fef08a";
  c.fillRect(0, 0, 512, 192);
  c.strokeStyle = "#dc2626";
  c.lineWidth = 14;
  c.strokeRect(10, 10, 492, 172);
  c.fillStyle = "#dc2626";
  c.fillRect(16, 16, 480, 74);
  c.fillStyle = "#ffffff";
  c.font = "900 35px Arial, sans-serif";
  c.textAlign = "center";
  c.fillText("BUBUR AYAM BANG UDIN", 256, 66);
  c.fillStyle = "#1e3a8a";
  c.font = "900 31px Arial, sans-serif";
  c.fillText("SPESIAL KALDU KUNING", 256, 132);
  c.fillStyle = "#15803d";
  c.font = "800 20px Arial, sans-serif";
  c.fillText("DIADUK / TIDAK DIADUK — SAMA ENAK!", 256, 166);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const makeBonBookTex = (): THREE.CanvasTexture => {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 320;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#1d4ed8";
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = "#1e3a8a";
  c.fillRect(0, 0, 28, 320);
  c.fillStyle = "#fef9c3";
  c.fillRect(42, 34, 194, 92);
  c.strokeStyle = "#1c1917";
  c.lineWidth = 5;
  c.strokeRect(42, 34, 194, 92);
  c.fillStyle = "#dc2626";
  c.font = "900 28px Arial, sans-serif";
  c.textAlign = "center";
  c.fillText("BON UTANG", 139, 75);
  c.fillStyle = "#1c1917";
  c.font = "800 16px Arial, sans-serif";
  c.fillText("ANAK KOS BU TINI", 139, 108);
  // Ruled ledger lines preview
  c.fillStyle = "#ffffff";
  c.font = "700 22px Arial, sans-serif";
  c.textAlign = "left";
  c.fillText("• Riko : 45rb", 48, 178);
  c.fillText("• Bagas: 60rb", 48, 214);
  c.fillStyle = "#facc15";
  c.font = "900 24px Arial, sans-serif";
  c.fillText("BELUM LUNAS!", 48, 272);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const roadAsphaltTex = (): THREE.CanvasTexture => {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#52525b";
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const x = (i * 73) % 256;
    const y = (i * 139) % 256;
    c.fillStyle = i % 2 ? "#3f3f46" : "#64646f";
    c.fillRect(x, y, 4, 4);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  return t;
};

/* ================================================================== */
/* 2. STAR PROPS: BUBUR BOWL (NEAT vs MIXED), SPOON, KERUPUK, BON     */
/* ================================================================== */

/**
 * Iconic Indonesian Bubur Ayam Mangkok Ayam Jago!
 * mixProgress = 0 -> Pristine TIM TIDAK DIADUK (snow-white base + neat distinct topping quadrants + proud upright kerupuk)
 * mixProgress = 1 -> Chaotic TIM DIADUK (creamy beige-gold swirled vortex + kecap spirals + sunken mashed toppings!)
 */
export const BuburBowl3D: React.FC<{
  pos?: V3;
  rot?: V3;
  scale?: number;
  mixProgress?: number;
  t?: number;
  steam?: boolean;
}> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, mixProgress = 0, t = 0, steam = true }) => {
  const m = Math.max(0, Math.min(1, mixProgress));
  // Smooth color transition from snowy white rice porridge (#fffef8) to creamy kecap-swirled porridge (#c98a3b)
  const baseCol = useMemo(() => {
    const c0 = new THREE.Color("#fffef8");
    const c1 = new THREE.Color("#c98a3b");
    return "#" + c0.lerp(c1, m).getHexString();
  }, [m]);
  const swirlAngle = m * 5.2;

  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* Mangkok Ayam Jago ceramic bowl + hollow red rim */}
      <Cyl pos={[0, 0.04, 0]} r={0.14} h={0.07} color="#e5e7eb" hull={0.07} />
      <Cyl pos={[0, 0.165, 0]} r={0.15} rTop={0.305} h={0.21} color="#fffef7" hull={0.07} seg={20} />
      <P
        geo={() => <torusGeometry args={[0.302, 0.018, 8, 24]} />}
        color="#dc2626"
        pos={[0, 0.275, 0]}
        rot={[Math.PI / 2, 0, 0]}
        hull={0.05}
      />
      {/* Iconic Rooster Emblem on front */}
      <B pos={[0, 0.165, 0.24]} size={[0.14, 0.11, 0.04]} color="#b91c1c" ink={0.015} />

      {/* Visible Porridge Surface sitting cleanly inside the red rim */}
      <Cyl pos={[0, 0.265, 0]} r={0.285} h={0.024} color={baseCol} hull={0.02} seg={20} />

      {/* Rotating topping layer that swirls and sinks as mixProgress goes 0 -> 1 */}
      <group position={[0, 0.285 - m * 0.014, 0]} rotation={[0, swirlAngle, 0]}>
        {/* Golden yellow broth pool (kaldu kuning) visible on neat bowl, absorbed when mixed */}
        {m < 0.85 && <Cyl pos={[0, 0.0, 0]} r={0.21 * (1 - m * 0.45)} h={0.016} color="#f59e0b" hull={0.02} seg={16} />}
        {/* Neat quadrant 1: Shredded white chicken (suwiran ayam) */}
        <B pos={[-0.10 * (1 - m * 0.45), 0.024, -0.05]} size={[0.13, 0.036, 0.10]} rot={[0, 0.2, 0]} color="#fef3c7" ink={0.01} />
        {/* Neat quadrant 2: Crispy golden cakwe cubes */}
        <B pos={[0.11 * (1 - m * 0.4), 0.026, -0.04]} size={[0.08, 0.042, 0.07]} rot={[0.1, 0.4, 0]} color="#d97706" ink={0.01} />
        <B pos={[0.07 * (1 - m * 0.5), 0.026, 0.07]} size={[0.07, 0.038, 0.06]} rot={[-0.1, -0.3, 0]} color="#b45309" ink={0.01} />
        {/* Neat quadrant 3: Emerald scallions (daun bawang) */}
        <B pos={[-0.08, 0.028, 0.09 * (1 - m * 0.4)]} size={[0.09, 0.024, 0.07]} color="#16a34a" ink={0.008} />
        <B pos={[0.02, 0.030, 0.01]} size={[0.05, 0.022, 0.05]} color="#22c55e" ink={0.008} />
        {/* Red sambal dab */}
        <P geo={() => <sphereGeometry args={[0.034, 8, 8]} />} color="#dc2626" pos={[-0.14 * (1 - m * 0.5), 0.028, 0.03]} hull={0.04} />
        {/* Dark kecap manis swirl vortex appearing clearly when mixed! */}
        {m > 0.15 && (
          <>
            <P
              geo={() => <torusGeometry args={[0.19, 0.018 * m, 6, 20]} />}
              color="#451a03"
              pos={[0, 0.014, 0]}
              rot={[Math.PI / 2, 0, 0]}
              hull={0.02}
            />
            <P
              geo={() => <torusGeometry args={[0.11, 0.016 * m, 6, 16]} />}
              color="#78350f"
              pos={[0.02, 0.018, -0.01]}
              rot={[Math.PI / 2, 0, 0.6]}
              hull={0.02}
            />
          </>
        )}
        {/* Crisp White Kerupuk standing tall on Neat bowl, sinking & tilting when Mixed! */}
        <group position={[0.08 * (1 - m * 0.5), 0.085 - m * 0.055, -0.06]} rotation={[0.3 + m * 0.9, 0.4, -0.25 - m * 0.7]}>
          <Cyl pos={[0, 0, 0]} r={0.095} h={0.022} color="#fffbeb" hull={0.06} seg={10} />
          <Cyl pos={[0.06, 0.025, 0.04]} r={0.075} h={0.022} rot={[0.35, 0, 0.3]} color="#fef3c7" hull={0.06} seg={10} />
        </group>
      </group>

      {/* Delicate warm rising porridge steam */}
      {steam &&
        [0, 1, 2].map((i) => {
          const k = (t * 0.55 + i * 0.33) % 1;
          return (
            <mesh key={i} position={[(i - 1) * 0.10 + Math.sin(k * 6 + i) * 0.05, 0.38 + k * 0.52, 0]}>
              <sphereGeometry args={[0.042 + k * 0.048, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={Math.sin(k * Math.PI) * 0.52} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

/* Attachable Metallic Soup Spoon (for stirring & epic anime sword clash!) */
export const Spoon3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; glow?: string }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
  glow,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    {/* Handle */}
    <B pos={[0, 0.22, 0]} size={[0.045, 0.46, 0.018]} color="#e2e8f0" emissive={glow} ink={0.012} />
    {/* Oval Spoon Scoop */}
    <P geo={() => <sphereGeometry args={[0.088, 12, 8]} />} color="#f1f5f9" pos={[0, 0.49, 0.01]} scale={[0.92, 1.35, 0.34]} hull={0.06} />
  </group>
);

/* Individual Flyable Wavy White Indonesian Kerupuk (for slow-mo shockwave!) */
export const Kerupuk3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    <Cyl pos={[0, 0, 0]} r={0.14} h={0.032} color="#fffbeb" hull={0.07} seg={10} />
    <P geo={() => <torusGeometry args={[0.095, 0.022, 6, 12]} />} color="#fef3c7" pos={[0, 0.016, 0]} rot={[Math.PI / 2, 0, 0]} hull={0.05} />
  </group>
);

/* Iconic Indonesian Turquoise Blue Tin Cracker Jar (Kaleng Kerupuk) */
export const KalengKerupuk3D: React.FC<{ pos?: V3; scale?: number }> = ({ pos = [0, 0, 0], scale = 1 }) => (
  <group position={pos} scale={scale}>
    <B pos={[0, 0.28, 0]} size={[0.42, 0.56, 0.42]} color="#0284c7" ink={0.035} />
    {/* Round glass window showing white kerupuk inside */}
    <Cyl pos={[0, 0.28, 0.215]} r={0.14} h={0.02} rot={[Math.PI / 2, 0, 0]} color="#bae6fd" hull={0.04} seg={16} />
    <Kerupuk3D pos={[0, 0.28, 0.228]} rot={[Math.PI / 2, 0, 0.3]} scale={0.72} />
    {/* Metal lid with top handle */}
    <Cyl pos={[0, 0.59, 0]} r={0.16} h={0.06} color="#0369a1" hull={0.05} seg={16} />
    <B pos={[0, 0.64, 0]} size={[0.12, 0.04, 0.04]} color="#e2e8f0" ink={0.01} />
  </group>
);

/* Plate of Indonesian Sate Telur Puyuh & Sate Usus Skewers */
export const SatePlate3D: React.FC<{ pos?: V3; scale?: number }> = ({ pos = [0, 0, 0], scale = 1 }) => (
  <group position={pos} scale={scale}>
    <Cyl pos={[0, 0.025, 0]} r={0.22} rTop={0.26} h={0.04} color="#fef9c3" hull={0.05} seg={16} />
    {[-0.08, -0.02, 0.04, 0.10].map((oz, idx) => (
      <group key={idx} position={[0, 0.065 + (idx % 2) * 0.015, oz]} rotation={[0, 0.12 * (idx - 1.5), 0]}>
        <Cyl pos={[0, 0, 0]} r={0.008} h={0.44} rot={[0, 0, Math.PI / 2]} color="#d6b47a" hull={0.08} seg={6} />
        {[-0.12, -0.03, 0.06, 0.14].map((ox, k) => (
          <P
            key={k}
            geo={() => <sphereGeometry args={[0.032, 8, 8]} />}
            color={idx % 2 === 0 ? "#a16207" : "#78350f"}
            pos={[ox, 0, 0]}
            hull={0.06}
          />
        ))}
      </group>
    ))}
  </group>
);

/* Bang Udin's Infamous Debt Ledger (Buku Bon Utang Anak Kos) */
export const BukuBon3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
}) => {
  const tex = useMemo(() => makeBonBookTex(), []);
  return (
    <group position={pos} rotation={rot} scale={scale}>
      <B pos={[0, 0, 0]} size={[0.38, 0.48, 0.05]} map={tex} ink={0.025} />
    </group>
  );
};

/* ================================================================== */
/* 3. ICONIC INDONESIAN GEROBAK BUBUR AYAM & STREET TABLE SET         */
/* ================================================================== */
export const BuburCart3D: React.FC<{ pos?: V3; rot?: V3; t?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], t = 0 }) => {
  const bannerTex = useMemo(() => makeCartBannerTex(), []);
  return (
    <group position={pos} rotation={rot}>
      {/* Big Bicycle Spoked Wheels (Left & Right) + Rear Support Legs */}
      {[-0.78, 0.78].map((wx, i) => (
        <group key={i} position={[wx, 0.46, 0.05]}>
          <P geo={() => <torusGeometry args={[0.42, 0.055, 8, 22]} />} color="#18181b" pos={[0, 0, 0]} rot={[0, Math.PI / 2, 0]} hull={0.07} />
          <Cyl pos={[0, 0, 0]} r={0.06} h={0.14} rot={[0, 0, Math.PI / 2]} color="#94a3b8" hull={0.06} />
          {[0, 1, 2, 3].map((sp) => (
            <B key={sp} pos={[0, 0, 0]} size={[0.02, 0.80, 0.025]} rot={[(sp * Math.PI) / 4, 0, 0]} color="#cbd5e1" ink={0.005} />
          ))}
        </group>
      ))}
      <B pos={[-0.75, 0.42, -0.52]} size={[0.09, 0.84, 0.09]} color="#7c2d12" ink={0.02} />
      <B pos={[0.75, 0.42, -0.52]} size={[0.09, 0.84, 0.09]} color="#7c2d12" ink={0.02} />

      {/* Main Wooden Cart Body with Blue/Red Indonesian Street Trim */}
      <B pos={[0, 0.96, 0]} size={[2.25, 0.96, 1.05]} color="#b45309" ink={0.05} />
      <B pos={[0, 1.46, 0]} size={[2.35, 0.08, 1.12]} color="#1d4ed8" ink={0.03} />
      {/* Iconic Front Banner: BUBUR AYAM BANG UDIN */}
      <B pos={[0, 0.98, 0.55]} size={[2.02, 0.74, 0.04]} map={bannerTex} ink={0.02} />

      {/* Left Upper Glass Showcase Cabinet (Etalase Kaca) with Crackers & Condiments */}
      <B pos={[-0.45, 1.98, 0]} size={[1.18, 0.96, 0.86]} color="#92400e" ink={0.04} />
      {/* Bright interior display cutout */}
      <B pos={[-0.45, 1.98, 0.42]} size={[1.04, 0.80, 0.05]} color="#e0f2fe" ink={0.015} />
      {/* Mini toppings visible inside etalase */}
      <Kerupuk3D pos={[-0.72, 2.15, 0.46]} rot={[Math.PI / 2, 0, 0.1]} scale={0.75} />
      <Kerupuk3D pos={[-0.48, 2.15, 0.46]} rot={[Math.PI / 2, 0, -0.2]} scale={0.75} />
      <Kerupuk3D pos={[-0.22, 2.15, 0.46]} rot={[Math.PI / 2, 0, 0.25]} scale={0.75} />
      <Cyl pos={[-0.78, 1.78, 0.46]} r={0.05} h={0.24} color="#1c1917" />
      <Cyl pos={[-0.60, 1.76, 0.46]} r={0.05} h={0.20} color="#dc2626" />
      <Cyl pos={[-0.36, 1.76, 0.46]} r={0.12} h={0.12} color="#fef08a" />

      {/* Right Side Giant Stainless Steel Porridge Pot (Dandang Bubur) + Rising Steam */}
      <Cyl pos={[0.62, 1.76, 0]} r={0.38} h={0.56} color="#cbd5e1" hull={0.06} seg={18} />
      <Cyl pos={[0.62, 2.05, 0]} r={0.40} h={0.05} color="#94a3b8" hull={0.04} seg={18} />
      {/* Soup ladle sticking out of pot */}
      <Cyl pos={[0.76, 2.22, 0.08]} r={0.022} h={0.48} rot={[0.15, 0, -0.42]} color="#e2e8f0" hull={0.12} />
      {[0, 1, 2, 3].map((i) => {
        const k = (t * 0.5 + i * 0.25) % 1;
        return (
          <mesh key={i} position={[0.62 + Math.sin(k * 6 + i) * 0.12, 2.15 + k * 0.72, 0]}>
            <sphereGeometry args={[0.09 + k * 0.09, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={Math.sin(k * Math.PI) * 0.55} depthWrite={false} />
          </mesh>
        );
      })}

      {/* Roof Posts & Cheerful Yellow-Red Striped Canopy Awning */}
      {[-1.08, 1.08].map((px, i) => (
        <React.Fragment key={i}>
          <B pos={[px, 2.1, 0.46]} size={[0.07, 1.3, 0.07]} color="#7c2d12" ink={0.02} />
          <B pos={[px, 2.1, -0.46]} size={[0.07, 1.3, 0.07]} color="#7c2d12" ink={0.02} />
        </React.Fragment>
      ))}
      <B pos={[0, 2.82, 0]} size={[2.55, 0.12, 1.35]} rot={[0.08, 0, 0]} color="#dc2626" ink={0.04} />
      <B pos={[0, 2.84, 0.66]} size={[2.55, 0.18, 0.05]} color="#facc15" ink={0.02} />
      {/* Push handles on right end */}
      <Cyl pos={[1.38, 1.32, -0.35]} r={0.035} h={0.55} rot={[0, 0, Math.PI / 2]} color="#7c2d12" />
      <Cyl pos={[1.38, 1.32, 0.35]} r={0.035} h={0.55} rot={[0, 0, Math.PI / 2]} color="#7c2d12" />
    </group>
  );
};

/* Street-Side Wooden Eating Table + Bench + Condiments + Kaleng Kerupuk */
export const WarungTableSet3D: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    {/* Wooden tabletop + 4 legs */}
    <B pos={[0, 0.84, 0]} size={[2.35, 0.09, 1.02]} color="#d97706" ink={0.04} />
    {[-1.02, 1.02].map((lx) =>
      [-0.4, 0.4].map((lz) => <B key={`${lx}_${lz}`} pos={[lx, 0.42, lz]} size={[0.09, 0.84, 0.09]} color="#92400e" ink={0.02} />)
    )}
    {/* Long wooden bench behind & red plastic stools */}
    <B pos={[0, 0.44, -0.82]} size={[2.2, 0.07, 0.36]} color="#b45309" ink={0.03} />
    <B pos={[-0.9, 0.22, -0.82]} size={[0.08, 0.44, 0.32]} color="#78350f" ink={0.02} />
    <B pos={[0.9, 0.22, -0.82]} size={[0.08, 0.44, 0.32]} color="#78350f" ink={0.02} />
    {/* Table condiments: Kecap Manis, Sambal, Tissue Box, Sate Plate, Kaleng Kerupuk */}
    <Cyl pos={[-0.18, 1.04, -0.25]} r={0.055} h={0.30} color="#1c1917" />
    <Cyl pos={[-0.18, 1.22, -0.25]} r={0.025} h={0.08} color="#facc15" />
    <Cyl pos={[0.0, 1.01, -0.26]} r={0.065} h={0.22} color="#dc2626" />
    <B pos={[0.25, 0.96, -0.25]} size={[0.26, 0.14, 0.16]} color="#16a34a" ink={0.02} />
    <SatePlate3D pos={[0.02, 0.89, 0.12]} scale={0.95} />
    <KalengKerupuk3D pos={[0.92, 0.89, -0.22]} scale={0.72} />
  </group>
);

/* ================================================================== */
/* 4. ANIME DUEL VFX (LIGHTNING BOLTS, SPLIT AURA) & HIDDEN OREN CAT  */
/* ================================================================== */

/** Sharp Connected 3D Extruded Anime Lightning Bolt for the Tim Tidak Diaduk vs Tim Diaduk clash! */
const boltGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0.18, 1.95);
  s.lineTo(-0.22, 1.02);
  s.lineTo(0.06, 1.02);
  s.lineTo(-0.26, 0.05);
  s.lineTo(0.32, 0.88);
  s.lineTo(0.02, 0.88);
  s.lineTo(0.38, 1.95);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: false });
})();

export const LightningBolt3D: React.FC<{ pos?: V3; rot?: V3; color?: string; scale?: number; t?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  color = "#38bdf8",
  scale = 1,
  t = 0,
}) => {
  const jitter = Math.sin(t * 42) * 0.05;
  return (
    <group position={[pos[0] + jitter, pos[1], pos[2]]} rotation={rot} scale={scale}>
      <mesh geometry={boltGeo}>
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh geometry={boltGeo} position={[0, 0, 0.05]} scale={[0.55, 0.92, 0.5]}>
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

/** Expanding Anime Energy Shockwave Ring between Clashing Spoons */
export const ClashAura3D: React.FC<{ pos?: V3; scale?: number; t?: number }> = ({ pos = [0, 0, 0], scale = 1, t = 0 }) => {
  const pulse = 0.88 + Math.sin(t * 28) * 0.16;
  return (
    <group position={pos} scale={scale * pulse}>
      <mesh>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshBasicMaterial color="#fef9c3" transparent opacity={0.92} />
      </mesh>
      <mesh rotation={[0, 0, t * 5]}>
        <torusGeometry args={[0.58, 0.05, 8, 22]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.82} />
      </mesh>
      <mesh rotation={[0.4, 0.3, -t * 6]}>
        <torusGeometry args={[0.85, 0.04, 8, 24]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.75} />
      </mesh>
    </group>
  );
};

/** Cute Hidden Easter Egg: Peeking Orange Tabby Cat (Kucing Oren!) to trigger viewer comments! */
export const OrenCat3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; t?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
  t = 0,
}) => {
  const tailWag = Math.sin(t * 5.2) * 0.35;
  const headBob = Math.sin(t * 2.6) * 0.04;
  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* Chubby orange body */}
      <P geo={() => <sphereGeometry args={[0.22, 12, 10]} />} color="#f97316" pos={[0, 0.22, 0]} scale={[1.15, 0.92, 0.95]} hull={0.06} />
      {/* White belly patch */}
      <P geo={() => <sphereGeometry args={[0.14, 10, 8]} />} color="#fff7ed" pos={[0, 0.18, 0.14]} scale={[0.9, 0.85, 0.5]} hull={0.02} />
      {/* Head + pointy cat ears + cute eyes */}
      <group position={[0, 0.44 + headBob, 0.08]}>
        <P geo={() => <sphereGeometry args={[0.17, 12, 10]} />} color="#fb923c" pos={[0, 0, 0]} hull={0.07} />
        <P geo={() => <coneGeometry args={[0.06, 0.12, 6]} />} color="#ea580c" pos={[-0.10, 0.15, 0]} rot={[0, 0, 0.28]} hull={0.08} />
        <P geo={() => <coneGeometry args={[0.06, 0.12, 6]} />} color="#ea580c" pos={[0.10, 0.15, 0]} rot={[0, 0, -0.28]} hull={0.08} />
        <P geo={() => <sphereGeometry args={[0.026, 8, 8]} />} color={INKC} pos={[-0.06, 0.02, 0.155]} hull={0.01} />
        <P geo={() => <sphereGeometry args={[0.026, 8, 8]} />} color={INKC} pos={[0.06, 0.02, 0.155]} hull={0.01} />
        <P geo={() => <sphereGeometry args={[0.02, 8, 8]} />} color="#f43f5e" pos={[0, -0.025, 0.165]} hull={0.01} />
      </group>
      {/* Curled wagging tail */}
      <group position={[-0.18, 0.26, -0.14]} rotation={[0.2, 0, 0.55 + tailWag]}>
        <Cyl pos={[0, 0.16, 0]} r={0.04} h={0.34} color="#ea580c" hull={0.08} />
      </group>
    </group>
  );
};

/* ================================================================== */
/* 5. LUSH, ULTRA-DETAILED INDONESIAN MORNING KOSAN STREET DIORAMA    */
/* ================================================================== */
const pavingBlockTex = (): THREE.CanvasTexture => {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#e7dfd3";
  c.fillRect(0, 0, 256, 256);
  const rows = 8;
  const cols = 4;
  const rh = 256 / rows;
  const cw = 256 / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw / 2);
    for (let col = -1; col <= cols; col++) {
      c.fillStyle = (r + col) % 3 === 0 ? "#ded4c5" : (r + col) % 3 === 1 ? "#ebe3d7" : "#e3d9ca";
      c.fillRect(col * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
      c.strokeStyle = "#b8ab9a";
      c.lineWidth = 2;
      c.strokeRect(col * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 2.5);
  return t;
};

/** 3D Parked Indonesian Scooter (Motor Matic) adding scale & 3D parallax */
const Scooter3D: React.FC<{ pos?: V3; rot?: V3; color?: string }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  color = "#0d9488",
}) => (
  <group position={pos} rotation={rot}>
    {/* Front & Rear Tires */}
    <P geo={() => <torusGeometry args={[0.26, 0.08, 8, 18]} />} color="#18181b" pos={[-0.62, 0.30, 0]} hull={0.07} />
    <P geo={() => <torusGeometry args={[0.26, 0.08, 8, 18]} />} color="#18181b" pos={[0.62, 0.30, 0]} hull={0.07} />
    <Cyl pos={[-0.62, 0.30, 0]} r={0.13} h={0.09} rot={[Math.PI / 2, 0, 0]} color="#94a3b8" hull={0.05} />
    <Cyl pos={[0.62, 0.30, 0]} r={0.13} h={0.09} rot={[Math.PI / 2, 0, 0]} color="#94a3b8" hull={0.05} />
    {/* Body Deck + Rear Fairing + Black Seat */}
    <B pos={[0.02, 0.44, 0]} size={[1.18, 0.16, 0.44]} color="#27272a" ink={0.03} />
    <B pos={[0.38, 0.68, 0]} size={[0.84, 0.34, 0.48]} color={color} ink={0.04} />
    <B pos={[0.34, 0.90, 0]} size={[0.76, 0.15, 0.40]} color="#18181b" ink={0.03} />
    {/* Front Leg Shield + Handlebars + Glowing Round Headlight + Mirrors */}
    <B pos={[-0.50, 0.78, 0]} size={[0.26, 0.72, 0.44]} rot={[0, 0, 0.18]} color={color} ink={0.04} />
    <B pos={[-0.56, 1.18, 0]} size={[0.16, 0.14, 0.68]} color="#1e293b" ink={0.025} />
    <Cyl pos={[-0.66, 1.16, 0]} r={0.10} h={0.08} rot={[0, 0, Math.PI / 2]} color="#fef9c3" hull={0.05} />
    <Cyl pos={[-0.54, 1.32, 0.24]} r={0.015} h={0.22} rot={[0.2, 0, 0]} color="#64748b" />
    <Cyl pos={[-0.54, 1.32, -0.24]} r={0.015} h={0.22} rot={[-0.2, 0, 0]} color="#64748b" />
    {/* Rear license plate */}
    <B pos={[0.82, 0.56, 0]} size={[0.04, 0.14, 0.24]} color="#18181b" ink={0.01} />
  </group>
);

/** Stacked Classic Red & Blue Plastic Street-Food Stools (Kursi Bakso) */
const PlasticStool3D: React.FC<{ pos?: V3; color?: string }> = ({ pos = [0, 0, 0], color = "#ef4444" }) => (
  <group position={pos}>
    <B pos={[0, 0.44, 0]} size={[0.36, 0.06, 0.36]} color={color} ink={0.02} />
    {[-0.14, 0.14].map((x) =>
      [-0.14, 0.14].map((z) => (
        <B key={`${x}_${z}`} pos={[x, 0.22, z]} size={[0.05, 0.44, 0.05]} rot={[z * 0.25, 0, -x * 0.25]} color={color} ink={0.015} />
      ))
    )}
  </group>
);

/** Lush Tropical Neighborhood Mango Tree with Dappled Foliage & Bougainvillea Accents */
const TropicalTree3D: React.FC<{ pos?: V3; scale?: number; t?: number }> = ({ pos = [0, 0, 0], scale = 1, t = 0 }) => {
  const sway = Math.sin(t * 1.4) * 0.03;
  return (
    <group position={pos} scale={scale}>
      {/* Planter ring & curved trunk */}
      <Cyl pos={[0, 0.18, 0]} r={0.58} h={0.36} color="#a8a29e" hull={0.05} />
      <Cyl pos={[0, 1.45, 0]} r={0.22} rTop={0.14} h={2.5} rot={[0, 0, 0.06]} color="#78350f" hull={0.06} />
      <Cyl pos={[0.38, 2.65, 0.1]} r={0.11} rTop={0.07} h={1.2} rot={[0.1, 0, -0.58]} color="#78350f" hull={0.06} />
      <Cyl pos={[-0.36, 2.55, -0.08]} r={0.11} rTop={0.07} h={1.15} rot={[-0.1, 0, 0.55]} color="#78350f" hull={0.06} />
      {/* Layered lush green canopy clusters swaying softly */}
      <group rotation={[0, 0, sway]}>
        <P geo={() => <dodecahedronGeometry args={[1.18, 1]} />} color="#15803d" pos={[0, 3.55, 0]} hull={0.04} />
        <P geo={() => <dodecahedronGeometry args={[0.92, 1]} />} color="#16a34a" pos={[0.88, 3.15, 0.25]} hull={0.04} />
        <P geo={() => <dodecahedronGeometry args={[0.88, 1]} />} color="#22c55e" pos={[-0.82, 3.25, 0.18]} hull={0.04} />
        <P geo={() => <dodecahedronGeometry args={[0.78, 1]} />} color="#4ade80" pos={[0.25, 4.15, 0.35]} hull={0.04} />
        {/* Tiny ripe yellow-orange mangoes hanging in the canopy */}
        <P geo={() => <sphereGeometry args={[0.10, 8, 8]} />} color="#facc15" pos={[0.62, 2.52, 0.55]} hull={0.05} />
        <P geo={() => <sphereGeometry args={[0.09, 8, 8]} />} color="#fb923c" pos={[-0.45, 2.62, 0.52]} hull={0.05} />
      </group>
    </group>
  );
};

export const KosanMorningStreet: React.FC<{ t?: number; showCat?: boolean; dramatic?: number }> = ({
  t = 0,
  showCat = false,
  dramatic = 0,
}) => {
  const roadTex = useMemo(() => roadAsphaltTex(), []);
  const paveTex = useMemo(() => pavingBlockTex(), []);
  const breeze = Math.sin(t * 2.4);

  return (
    <group>
      {/* Golden Morning Sun & Floating Puffy 3D Clouds (hide sun during dark anime storm!) */}
      {dramatic < 0.5 && (
        <group>
          <mesh position={[-6.8, 7.6, -12.5]}>
            <sphereGeometry args={[1.35, 16, 12]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          <mesh position={[-6.8, 7.6, -12.7]}>
            <sphereGeometry args={[1.95, 16, 12]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        </group>
      )}
      {[
        [-5.2, 6.9, -10.5, 1.15],
        [1.8, 7.4, -11.2, 1.35],
        [7.2, 6.6, -10.0, 1.05],
      ].map(([cx, cy, cz, sc], idx) => (
        <group key={idx} position={[cx + Math.sin(t * 0.25 + idx * 2) * 0.65, cy, cz]} scale={sc}>
          <P geo={() => <dodecahedronGeometry args={[0.72, 1]} />} color={dramatic > 0.4 ? "#312e81" : "#ffffff"} pos={[0, 0, 0]} hull={0.02} />
          <P geo={() => <dodecahedronGeometry args={[0.56, 1]} />} color={dramatic > 0.4 ? "#3730a3" : "#f8fafc"} pos={[0.62, -0.08, 0.1]} hull={0.02} />
          <P geo={() => <dodecahedronGeometry args={[0.52, 1]} />} color={dramatic > 0.4 ? "#312e81" : "#f1f5f9"} pos={[-0.58, -0.1, 0.05]} hull={0.02} />
        </group>
      ))}

      {/* Textured Morning Street Asphalt + White Road Dashes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3.2]} receiveShadow>
        <planeGeometry args={[34, 18]} />
        <meshStandardMaterial map={roadTex} roughness={0.96} />
      </mesh>
      {[-7.2, -3.6, 0, 3.6, 7.2].map((dx, i) => (
        <B key={i} pos={[dx, 0.015, 2.95]} size={[1.85, 0.02, 0.16]} color="#f8fafc" ink={0.005} />
      ))}

      {/* Textured Paving-Block Sidewalk + Iconic Black-White Curb */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.165, -2.5]} receiveShadow>
        <planeGeometry args={[32, 6.2]} />
        <meshStandardMaterial map={paveTex} roughness={0.92} />
      </mesh>
      <B pos={[0, 0.08, -2.5]} size={[32, 0.16, 6.2]} color="#d6cfc5" ink={0.015} />
      {Array.from({ length: 18 }).map((_, i) => (
        <B key={i} pos={[-11.5 + i * 1.4, 0.095, 0.62]} size={[1.35, 0.19, 0.2]} color={i % 2 === 0 ? "#18181b" : "#f8fafc"} ink={0.01} />
      ))}

      {/* ============================================================ */}
      {/* 2-STORY KOS BU TINI BUILDING (LEFT-CENTER BACKDROP)          */}
      {/* ============================================================ */}
      <group position={[-3.35, 0, -4.75]}>
        {/* Ground-floor cream wall + gray river-stone wainscot */}
        <B pos={[0, 1.9, 0]} size={[9.2, 3.6, 0.42]} color="#fef3c7" ink={0.045} />
        <B pos={[0, 0.55, 0.05]} size={[9.26, 0.95, 0.38]} color="#78716c" ink={0.03} />
        {/* Terracotta floor divider ledge */}
        <B pos={[0, 3.72, 0.28]} size={[9.5, 0.22, 0.72]} color="#b45309" ink={0.035} />
        {/* Second-floor kosan rooms wall + balcony railing */}
        <B pos={[0, 5.15, -0.35]} size={[9.1, 2.7, 0.35]} color="#fde68a" ink={0.045} />
        {/* 2nd floor iron balcony railing */}
        <B pos={[0, 4.48, 0.56]} size={[9.2, 0.07, 0.07]} color="#1e293b" ink={0.015} />
        {[-4.2, -3.1, -2.0, -0.9, 0.2, 1.3, 2.4, 3.5, 4.3].map((bx, i) => (
          <B key={i} pos={[bx, 4.12, 0.56]} size={[0.05, 0.72, 0.05]} color="#334155" ink={0.01} />
        ))}
        {/* Swaying colorful kosan clothes drying on 2nd-floor balcony! */}
        <group position={[1.45, 4.45, 0.62]} rotation={[breeze * 0.08, 0, 0]}>
          <B pos={[-0.75, -0.34, 0]} size={[0.52, 0.62, 0.06]} color="#38bdf8" ink={0.02} />
          <B pos={[0.0, -0.38, 0]} size={[0.48, 0.70, 0.06]} color="#f472b6" ink={0.02} />
          <B pos={[0.78, -0.32, 0]} size={[0.54, 0.58, 0.06]} color="#4ade80" ink={0.02} />
        </group>
        {/* 2nd-floor wooden louvered windows + blue sky reflection */}
        {[-2.4, 2.4].map((wx, i) => (
          <group key={i} position={[wx, 5.15, -0.14]}>
            <B pos={[0, 0, 0]} size={[1.45, 1.25, 0.1]} color="#7c2d12" ink={0.03} />
            <B pos={[0, 0, 0.04]} size={[1.22, 1.02, 0.06]} color="#7dd3fc" ink={0.015} />
            <B pos={[0, 0, 0.07]} size={[0.06, 1.02, 0.04]} color="#7c2d12" ink={0.01} />
          </group>
        ))}
        {/* Slanted Indonesian Clay-Tile Roof (Genteng Oranye) */}
        <B pos={[0, 6.75, 0.05]} size={[9.9, 0.42, 2.15]} rot={[0.24, 0, 0]} color="#b91c1c" ink={0.04} />
        <B pos={[0, 7.05, -0.82]} size={[10.0, 0.24, 0.35]} color="#991b1b" ink={0.03} />

        {/* Detailed Kos Bu Tini Iron-Bar Gate + Brick Pillars + Globe Lamps */}
        <group position={[-0.3, 0, 0.24]}>
          {/* Dark interior corridor behind gate */}
          <B pos={[0, 1.48, -0.05]} size={[2.55, 2.85, 0.08]} color="#1e1b2e" ink={0.02} />
          {/* Green wrought-iron gate frame + vertical bars */}
          <B pos={[0, 0.48, 0.04]} size={[2.52, 0.86, 0.09]} color="#15803d" ink={0.025} />
          <B pos={[0, 2.78, 0.04]} size={[2.52, 0.14, 0.10]} color="#15803d" ink={0.02} />
          {[-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05].map((gx, i) => (
            <B key={i} pos={[gx, 1.82, 0.04]} size={[0.06, 1.85, 0.06]} color="#166534" ink={0.01} />
          ))}
          {/* Twin Stone Gate Pillars + Warm Morning Globe Lamps */}
          {[-1.48, 1.48].map((px, i) => (
            <group key={i} position={[px, 0, 0.12]}>
              <B pos={[0, 1.62, 0]} size={[0.42, 3.2, 0.42]} color="#a8a29e" ink={0.035} />
              <B pos={[0, 3.26, 0]} size={[0.50, 0.12, 0.50]} color="#78716c" ink={0.02} />
              <P geo={() => <sphereGeometry args={[0.16, 10, 8]} />} color="#fef9c3" pos={[0, 3.46, 0]} hull={0.05} />
            </group>
          ))}
          <Sign pos={[0, 3.42, 0.18]} w={2.75} h={0.68} text="KOS BU TINI" bg="#fef08a" fg="#991b1b" />
        </group>

        {/* Ground-floor Kosan Window + Hanging Birdcage + Magenta Bougainvillea Planter */}
        <group position={[2.85, 2.05, 0.24]}>
          <B pos={[0, 0, 0]} size={[1.45, 1.25, 0.1]} color="#7c2d12" ink={0.03} />
          <B pos={[0, 0, 0.04]} size={[1.22, 1.02, 0.06]} color="#bae6fd" ink={0.015} />
          <B pos={[0, -0.75, 0.18]} size={[1.55, 0.26, 0.34]} color="#b45309" ink={0.025} />
          {/* Blooming magenta bougainvillea! */}
          <P geo={() => <dodecahedronGeometry args={[0.26, 1]} />} color="#16a34a" pos={[-0.4, -0.52, 0.22]} hull={0.04} />
          <P geo={() => <dodecahedronGeometry args={[0.26, 1]} />} color="#15803d" pos={[0.35, -0.52, 0.22]} hull={0.04} />
          <P geo={() => <sphereGeometry args={[0.14, 8, 8]} />} color="#ec4899" pos={[-0.45, -0.38, 0.30]} hull={0.04} />
          <P geo={() => <sphereGeometry args={[0.16, 8, 8]} />} color="#db2777" pos={[0.0, -0.40, 0.32]} hull={0.04} />
          <P geo={() => <sphereGeometry args={[0.14, 8, 8]} />} color="#f472b6" pos={[0.42, -0.36, 0.28]} hull={0.04} />
        </group>
        {/* Classic Indonesian Hanging Wooden Birdcage under porch */}
        <group position={[-3.35, 2.85, 0.58]} rotation={[0, 0, breeze * 0.06]}>
          <Cyl pos={[0, 0.38, 0]} r={0.018} h={0.42} color="#18181b" />
          <Cyl pos={[0, 0, 0]} r={0.22} h={0.44} color="#d97706" hull={0.05} seg={10} />
          <P geo={() => <coneGeometry args={[0.24, 0.18, 10]} />} color="#92400e" pos={[0, 0.30, 0]} hull={0.05} />
        </group>
      </group>

      {/* ============================================================ */}
      {/* NEIGHBORING PASTEL-MINT HOUSE + AWNING + PARKED SCOOTER      */}
      {/* ============================================================ */}
      <group position={[5.15, 0, -4.85]}>
        <B pos={[0, 2.55, 0]} size={[7.4, 5.1, 0.42]} color="#d1fae5" ink={0.045} />
        <B pos={[0, 0.55, 0.04]} size={[7.46, 0.95, 0.38]} color="#64748b" ink={0.025} />
        <B pos={[0, 5.25, 0.18]} size={[7.9, 0.48, 1.55]} rot={[0.22, 0, 0]} color="#c2410c" ink={0.04} />
        {/* Striped Green-White Terrace Awning */}
        {[-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1].map((ax, i) => (
          <B key={i} pos={[ax, 3.15, 0.78]} size={[0.7, 0.12, 1.25]} rot={[0.28, 0, 0]} color={i % 2 === 0 ? "#059669" : "#ffffff"} ink={0.015} />
        ))}
        {/* Neighbor Door & Shuttered Window */}
        <B pos={[-1.4, 1.35, 0.24]} size={[1.15, 2.4, 0.10]} color="#92400e" ink={0.03} />
        <B pos={[0.85, 2.15, 0.24]} size={[1.65, 1.25, 0.10]} color="#78350f" ink={0.03} />
        <B pos={[0.85, 2.15, 0.28]} size={[1.42, 1.02, 0.06]} color="#7dd3fc" ink={0.015} />
      </group>

      {/* Parked 3D Indonesian Motor Matic Scooter along right curb! */}
      <Scooter3D pos={[4.35, 0.16, -0.55]} rot={[0, -0.45, 0]} color="#0284c7" />

      {/* Lush Tropical Mango Tree on Left + Bougainvillea Bush */}
      <TropicalTree3D pos={[-6.85, 0.16, -2.75]} scale={1.15} t={t} />
      <group position={[6.9, 0.16, -3.1]}>
        <Cyl pos={[0, 0.32, 0]} r={0.30} rTop={0.36} h={0.58} color="#b45309" />
        <P geo={() => <dodecahedronGeometry args={[0.58, 1]} />} color="#16a34a" pos={[0, 0.92, 0]} hull={0.04} />
        <P geo={() => <sphereGeometry args={[0.18, 8, 8]} />} color="#ec4899" pos={[-0.22, 1.15, 0.32]} hull={0.04} />
        <P geo={() => <sphereGeometry args={[0.16, 8, 8]} />} color="#f43f5e" pos={[0.24, 1.02, 0.30]} hull={0.04} />
      </group>

      {/* Detailed Utility Pole + Street Lamp + Overhead Power Cables + Festive Alley Bunting Flags! */}
      <group position={[3.65, 0.16, -3.25]}>
        <Cyl pos={[0, 3.35, 0]} r={0.11} h={6.7} color="#57534e" hull={0.06} />
        <B pos={[0, 5.55, 0]} size={[1.5, 0.11, 0.11]} color="#44403c" ink={0.02} />
        <B pos={[-0.75, 4.95, 0.42]} size={[0.08, 0.08, 0.95]} rot={[-0.25, 0, 0]} color="#64748b" ink={0.015} />
        <B pos={[-0.75, 5.06, 0.88]} size={[0.38, 0.12, 0.24]} color="#fef9c3" emissive="#fde68a" ink={0.02} />
      </group>
      {/* Overhead Power Cables + Colorful Festive Alley Pennant Flags stretching across the sky! */}
      <B pos={[-1.4, 5.35, -3.4]} size={[11.2, 0.035, 0.035]} rot={[0, 0.05, 0.02]} color="#18181b" ink={0.005} />
      <B pos={[-1.4, 4.95, -3.1]} size={[11.2, 0.03, 0.03]} rot={[0, 0.04, -0.02]} color="#27272a" ink={0.005} />
      {Array.from({ length: 11 }).map((_, i) => {
        const fx = -5.4 + i * 0.84;
        const sag = Math.sin((i / 10) * Math.PI) * 0.42;
        const flagCols = ["#ef4444", "#facc15", "#38bdf8", "#22c55e", "#f472b6"];
        return (
          <P
            key={i}
            geo={() => <coneGeometry args={[0.16, 0.34, 4]} />}
            color={flagCols[i % flagCols.length]}
            pos={[fx, 4.82 - sag, -3.1]}
            rot={[Math.PI + breeze * 0.14, 0, 0]}
            hull={0.04}
          />
        );
      })}

      {/* Neighborhood Yellow-Blue Trash Bin on Left Curb */}
      <group position={[-4.55, 0.16, -0.65]}>
        <Cyl pos={[0, 0.34, 0]} r={0.22} rTop={0.26} h={0.68} color="#facc15" hull={0.05} />
        <Cyl pos={[0, 0.70, 0]} r={0.27} h={0.07} color="#0284c7" hull={0.04} />
      </group>

      {/* Main Hero Props: Gerobak Bubur Ayam Bang Udin + Street Eating Table + Plastic Stools + Wash Bucket */}
      <BuburCart3D pos={[1.35, 0.16, -2.15]} rot={[0, -0.24, 0]} t={t} />
      <Cyl pos={[2.68, 0.38, -2.35]} r={0.20} rTop={0.24} h={0.42} color="#0ea5e9" hull={0.05} />
      <WarungTableSet3D pos={[-1.05, 0.16, -0.35]} rot={[0, 0.08, 0]} />
      <PlasticStool3D pos={[-2.48, 0.16, -0.25]} color="#ef4444" />
      <PlasticStool3D pos={[0.38, 0.16, -0.25]} color="#3b82f6" />

      {/* Hidden Easter Egg Kucing Oren peeking playfully beside the cart wheel! */}
      {showCat && <OrenCat3D pos={[2.48, 0.16, -1.35]} rot={[0, -0.45, 0]} scale={1.02} t={t} />}

      {/* Warm Sunny Golden-Hour Morning Lighting (shifts to dramatic storm blue-gold during anime duel!) */}
      <hemisphereLight args={[dramatic > 0.3 ? "#818cf8" : "#fff4dc", dramatic > 0.3 ? "#312e81" : "#7c5e4c", 1.55 - dramatic * 0.45]} />
      <directionalLight position={[-5, 9, 7]} intensity={1.82 - dramatic * 0.45} color={dramatic > 0.3 ? "#c7d2fe" : "#fff2cc"} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[6, 5, 4]} intensity={0.45} color="#bae6fd" />
    </group>
  );
};

import React, { useMemo } from "react";
import * as THREE from "three";
import { P } from "./objectsRig";
import { InkBox } from "./objectsMolase";
import { Sign } from "./objectsMolaseProps";

type V3 = [number, number, number];
const B = InkBox;

const Cyl: React.FC<{
  pos: V3;
  r: number;
  rTop?: number;
  h: number;
  color: string;
  rot?: V3;
  hull?: number;
  seg?: number;
  emissive?: string;
}> = ({ pos, r, rTop, h, color, rot = [0, 0, 0], hull = 0.06, seg = 14, emissive }) => (
  <P geo={() => <cylinderGeometry args={[rTop ?? r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} emissive={emissive} />
);

/* ================================================================== */
/* 1. PROCEDURAL CANVAS TEXTURES (TILES, SCORCH, CLOCK, FRIDGE, MIE)  */
/* ================================================================== */
const texCache: Record<string, THREE.CanvasTexture> = {};

export const kitchenTileTex = (a = "#f3f6f9", b = "#cfe0ec", grout = "#7c8d9e"): THREE.CanvasTexture => {
  const k = `tile|${a}|${b}|${grout}`;
  if (texCache[k]) return texCache[k];
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 512;
  const c = cv.getContext("2d")!;
  c.fillStyle = a;
  c.fillRect(0, 0, 512, 512);
  const s = 64;
  for (let y = 0; y < 512; y += s) {
    for (let x = 0; x < 512; x += s) {
      c.fillStyle = ((x / s + y / s) % 2 === 0) ? a : b;
      c.fillRect(x + 2, y + 2, s - 4, s - 4);
      c.strokeStyle = grout;
      c.lineWidth = 3;
      c.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache[k] = t;
  return t;
};

export const scorchTex = (): THREE.CanvasTexture => {
  const k = "scorch_mark_v1";
  if (texCache[k]) return texCache[k];
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 512;
  const c = cv.getContext("2d")!;
  c.clearRect(0, 0, 512, 512);
  // Upward soot plume with jagged charred flame-lick streaks
  const g = c.createRadialGradient(256, 390, 20, 256, 260, 240);
  g.addColorStop(0, "rgba(18, 12, 10, 0.94)");
  g.addColorStop(0.45, "rgba(38, 24, 16, 0.72)");
  g.addColorStop(0.78, "rgba(70, 42, 24, 0.30)");
  g.addColorStop(1, "rgba(40, 20, 10, 0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 512);
  // Charred licking tongues going upward
  for (let i = 0; i < 9; i++) {
    const cx = 110 + i * 36;
    const h = 160 + ((i * 73) % 190);
    const sg = c.createLinearGradient(cx, 440, cx, 440 - h);
    sg.addColorStop(0, "rgba(15, 10, 8, 0.85)");
    sg.addColorStop(0.6, "rgba(40, 24, 14, 0.45)");
    sg.addColorStop(1, "rgba(40, 24, 14, 0)");
    c.fillStyle = sg;
    c.beginPath();
    c.moveTo(cx - 24, 440);
    c.quadraticCurveTo(cx - 10, 440 - h * 0.6, cx + ((i % 2 ? 1 : -1) * 14), 440 - h);
    c.quadraticCurveTo(cx + 14, 440 - h * 0.55, cx + 24, 440);
    c.closePath();
    c.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache[k] = t;
  return t;
};

const clock02Tex = (hour = 2, minute = 0): THREE.CanvasTexture => {
  const k = `clock|${hour}|${minute}`;
  if (texCache[k]) return texCache[k];
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#fffdf5";
  c.beginPath();
  c.arc(128, 128, 120, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#241726";
  c.lineWidth = 14;
  c.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    c.strokeStyle = "#241726";
    c.lineWidth = i % 3 === 0 ? 7 : 4;
    c.beginPath();
    c.moveTo(128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88);
    c.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106);
    c.stroke();
  }
  // Digital mini badge 02:00
  c.fillStyle = "#dc2626";
  c.font = "bold 28px Inter, sans-serif";
  c.textAlign = "center";
  c.fillText(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, 128, 186);
  // Hour hand
  const ha = ((hour % 12) + minute / 60) * (Math.PI / 6) - Math.PI / 2;
  c.strokeStyle = "#18181b";
  c.lineWidth = 10;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(128, 128);
  c.lineTo(128 + Math.cos(ha) * 56, 128 + Math.sin(ha) * 56);
  c.stroke();
  // Minute hand
  const ma = (minute / 60) * Math.PI * 2 - Math.PI / 2;
  c.strokeStyle = "#dc2626";
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(128, 128);
  c.lineTo(128 + Math.cos(ma) * 82, 128 + Math.sin(ma) * 82);
  c.stroke();
  c.fillStyle = "#241726";
  c.beginPath();
  c.arc(128, 128, 9, 0, Math.PI * 2);
  c.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache[k] = t;
  return t;
};

const miePacketTex = (): THREE.CanvasTexture => {
  const k = "mie_packet_tex";
  if (texCache[k]) return texCache[k];
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 320;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#fff8eb";
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = "#dc2626";
  c.fillRect(0, 0, 256, 98);
  c.fillStyle = "#facc15";
  c.fillRect(0, 98, 256, 16);
  c.fillStyle = "#16a34a";
  c.fillRect(0, 274, 256, 46);
  c.strokeStyle = "#241726";
  c.lineWidth = 10;
  c.strokeRect(5, 5, 246, 310);
  c.fillStyle = "#fff";
  c.font = "bold 46px Anton, Impact, sans-serif";
  c.textAlign = "center";
  c.fillText("MIE GORENG", 128, 66);
  // Plate graphic
  c.fillStyle = "#f59e0b";
  c.beginPath();
  c.ellipse(128, 195, 76, 48, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#92400e";
  c.lineWidth = 6;
  c.stroke();
  // Fried egg on top
  c.fillStyle = "#fff";
  c.beginPath();
  c.ellipse(142, 184, 30, 22, 0.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#facc15";
  c.beginPath();
  c.arc(146, 184, 11, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#fff";
  c.font = "bold 24px Inter, sans-serif";
  c.fillText("JUMBO PEDAS!", 128, 304);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache[k] = t;
  return t;
};

/* ================================================================== */
/* 2. UPGRADED REALISTIC STYLIZED 3D FIRE, EMBERS, SMOKE & SCORCH     */
/* ================================================================== */
let cachedFlameGeo: THREE.BufferGeometry | null = null;
const getFlameTongueGeo = (): THREE.BufferGeometry => {
  if (cachedFlameGeo) return cachedFlameGeo;
  // Tapered teardrop-blade profile: rounded base -> wide lower belly -> sharp whipping point
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18, 0.04),
    new THREE.Vector2(0.32, 0.16),
    new THREE.Vector2(0.35, 0.30),
    new THREE.Vector2(0.28, 0.48),
    new THREE.Vector2(0.18, 0.68),
    new THREE.Vector2(0.08, 0.86),
    new THREE.Vector2(0.0, 1.02),
  ];
  const geo = new THREE.LatheGeometry(pts, 10);
  // Apply subtle organic flame S-curve lean along Y so each tongue licks upward naturally
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const bend = Math.sin(y * Math.PI * 1.35) * 0.14 * y;
    pos.setX(i, x + bend);
  }
  geo.computeVertexNormals();
  cachedFlameGeo = geo;
  return geo;
};

const TONGUE_SPECS: {
  x: number;
  z: number;
  h: number;
  w: number;
  yaw: number;
  tilt: number;
  freq: number;
  phase: number;
  layer: "outer" | "mid" | "core";
}[] = [
  // Outer crimson/orange licking tongues
  { x: 0.0, z: 0.0, h: 1.55, w: 0.95, yaw: 0.0, tilt: 0.06, freq: 11, phase: 0.0, layer: "outer" },
  { x: -0.24, z: 0.08, h: 1.25, w: 0.72, yaw: 1.1, tilt: 0.24, freq: 13, phase: 1.4, layer: "outer" },
  { x: 0.26, z: 0.06, h: 1.32, w: 0.75, yaw: -1.2, tilt: 0.22, freq: 12, phase: 2.6, layer: "outer" },
  { x: -0.14, z: -0.20, h: 1.18, w: 0.68, yaw: 2.4, tilt: 0.20, freq: 14, phase: 3.9, layer: "outer" },
  { x: 0.18, z: -0.18, h: 1.22, w: 0.70, yaw: -2.5, tilt: 0.22, freq: 10, phase: 5.1, layer: "outer" },
  // Mid bright amber-yellow dancing tongues
  { x: 0.02, z: 0.04, h: 1.18, w: 0.68, yaw: 0.5, tilt: 0.08, freq: 15, phase: 0.7, layer: "mid" },
  { x: -0.16, z: 0.10, h: 0.92, w: 0.50, yaw: 1.6, tilt: 0.18, freq: 16, phase: 2.1, layer: "mid" },
  { x: 0.16, z: 0.09, h: 0.96, w: 0.52, yaw: -1.5, tilt: 0.16, freq: 14, phase: 3.5, layer: "mid" },
  { x: 0.0, z: -0.12, h: 0.88, w: 0.50, yaw: 3.1, tilt: 0.12, freq: 17, phase: 4.8, layer: "mid" },
  // Inner white-hot core spears
  { x: 0.0, z: 0.03, h: 0.76, w: 0.38, yaw: 0.2, tilt: 0.04, freq: 19, phase: 1.1, layer: "core" },
  { x: -0.07, z: 0.05, h: 0.58, w: 0.30, yaw: -0.9, tilt: 0.09, freq: 21, phase: 3.0, layer: "core" },
];

export const RealisticFlame3D: React.FC<{
  pos?: V3;
  scale?: number;
  heightMul?: number;
  t?: number;
  seed?: number;
  smoke?: boolean;
  light?: boolean;
}> = ({ pos = [0, 0, 0], scale = 1, heightMul = 1, t = 0, seed = 1, smoke = true, light = true }) => {
  const geo = useMemo(() => getFlameTongueGeo(), []);
  const flicker = 0.88 + 0.24 * Math.sin(t * 21 + seed) + 0.12 * Math.cos(t * 34 + seed * 2);

  return (
    <group position={pos} scale={[scale, scale * heightMul, scale]}>
      {/* Dynamic flickering orange pointLight casting real fire glow on walls & characters */}
      {light && <pointLight position={[0, 0.7, 0.35]} color="#ff7a1a" intensity={5.5 * scale * flicker} distance={10} decay={2} />}

      {/* Layered sharp flickering flame tongues */}
      {TONGUE_SPECS.map((sp, i) => {
        const stretch = 0.84 + 0.28 * Math.sin(t * sp.freq + sp.phase + seed);
        const swayZ = Math.sin(t * (sp.freq * 0.65) + sp.phase) * 0.14;
        const swayX = Math.cos(t * (sp.freq * 0.55) + sp.phase) * 0.10;
        const col = sp.layer === "outer" ? (i % 2 ? "#dc2626" : "#ea580c") : sp.layer === "mid" ? "#facc15" : "#fffbeb";
        const opacity = sp.layer === "outer" ? 0.86 : sp.layer === "mid" ? 0.94 : 1.0;
        return (
          <group key={i} position={[sp.x, 0, sp.z]} rotation={[sp.tilt + swayX, sp.yaw + t * 0.4, swayZ]}>
            <mesh geometry={geo} scale={[sp.w, sp.h * stretch, sp.w]}>
              <meshBasicMaterial color={col} transparent={opacity < 1} opacity={opacity} depthWrite={sp.layer === "core"} />
            </mesh>
            {/* Subtle warm dark-red rim silhouette on outer tongues only so it matches ink style cleanly */}
            {sp.layer === "outer" && (
              <mesh geometry={geo} scale={[sp.w * 1.09, sp.h * stretch * 1.04, sp.w * 1.09]}>
                <meshBasicMaterial color="#450a0a" side={THREE.BackSide} transparent opacity={0.55} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 12 Rising glowing embers / sparks drifting upward */}
      {Array.from({ length: 12 }).map((_, i) => {
        const cycle = (t * (0.9 + (i % 4) * 0.22) + i * 0.17 + seed * 0.11) % 1;
        const ang = i * 2.1 + cycle * 3.8;
        const rad = 0.14 + cycle * 0.52;
        const y = 0.35 + cycle * 2.15;
        const sz = (1 - cycle) * 0.055;
        return (
          <mesh key={`e${i}`} position={[Math.cos(ang) * rad, y, Math.sin(ang) * rad]} rotation={[t * 4 + i, t * 3, i]}>
            <octahedronGeometry args={[Math.max(0.012, sz), 0]} />
            <meshBasicMaterial color={i % 2 ? "#fef08a" : "#fb923c"} />
          </mesh>
        );
      })}

      {/* Rising translucent curling smoke plumes above the flame tips */}
      {smoke &&
        Array.from({ length: 6 }).map((_, i) => {
          const cycle = (t * 0.48 + i / 6 + seed * 0.13) % 1;
          const y = 1.15 + cycle * 1.95;
          const driftX = Math.sin(cycle * 4.5 + i) * (0.18 + cycle * 0.35);
          const driftZ = Math.cos(cycle * 3.5 + i) * 0.15;
          const r = 0.22 + cycle * 0.45;
          const op = Math.sin(cycle * Math.PI) * 0.48;
          return (
            <mesh key={`s${i}`} position={[driftX, y, driftZ]} scale={[1.15, 0.85, 1.0]}>
              <dodecahedronGeometry args={[r, 1]} />
              <meshStandardMaterial color="#2c2830" roughness={1} transparent opacity={op} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

/* Crisp blue ring of gas stove burner flames */
export const GasBurnerFlame: React.FC<{ pos?: V3; on?: boolean; t?: number }> = ({ pos = [0, 0, 0], on = true, t = 0 }) => {
  if (!on) return null;
  const geo = useMemo(() => getFlameTongueGeo(), []);
  return (
    <group position={pos}>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const h = 0.16 + 0.04 * Math.sin(t * 28 + i * 1.7);
        return (
          <mesh
            key={i}
            geometry={geo}
            position={[Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18]}
            rotation={[0.35 * Math.sin(a), -a, -0.35 * Math.cos(a)]}
            scale={[0.10, h, 0.10]}
          >
            <meshBasicMaterial color={i % 2 ? "#38bdf8" : "#93c5fd"} />
          </mesh>
        );
      })}
      <pointLight position={[0, 0.12, 0]} color="#38bdf8" intensity={1.8} distance={3} />
    </group>
  );
};

/* Dynamic charred soot mark creeping up wall & cabinet when fire burns */
export const ScorchedMark3D: React.FC<{ pos: V3; size?: [number, number]; level?: number }> = ({
  pos,
  size = [2.2, 2.4],
  level = 1,
}) => {
  const tex = useMemo(() => scorchTex(), []);
  if (level <= 0.02) return null;
  return (
    <mesh position={pos}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent opacity={Math.min(1, level)} depthWrite={false} />
    </mesh>
  );
};

/* Arcing water splash & steam burst when Riko dumps a gayung of water into hot oil */
export const WaterSplash3D: React.FC<{ pos?: V3; progress?: number }> = ({ pos = [0, 0, 0], progress = 0.5 }) => {
  if (progress <= 0 || progress >= 1) return null;
  return (
    <group position={pos}>
      {Array.from({ length: 14 }).map((_, i) => {
        const k = Math.max(0, Math.min(1, progress * 1.25 - (i % 5) * 0.06));
        const spread = ((i % 7) - 3) * 0.14;
        const x = spread * k;
        const y = 0.85 * (1 - k) + Math.sin(k * Math.PI) * 0.55 - k * k * 0.45;
        const z = (i % 3 - 1) * 0.14 * k;
        return (
          <P
            key={i}
            geo={() => <sphereGeometry args={[0.07 + (i % 3) * 0.025, 8, 8]} />}
            color={i % 2 ? "#bae6fd" : "#38bdf8"}
            pos={[x, y, z]}
            scale={[0.8, 1.35, 0.8]}
            hull={0.07}
          />
        );
      })}
    </group>
  );
};

/* ================================================================== */
/* 3. INDONESIAN KOSAN PROPS (STOVE, LPG 3KG, WOK, FRIDGE, BOWL, ETC) */
/* ================================================================== */

/* Classic Indonesian 3kg Green LPG "Tabung Melon" */
export const LpgMelon3D: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <Cyl pos={[0, 0.06, 0]} r={0.22} h={0.12} color="#15803d" />
    <Cyl pos={[0, 0.36, 0]} r={0.27} h={0.48} color="#4ade80" />
    <P geo={() => <sphereGeometry args={[0.27, 14, 10]} />} color="#4ade80" pos={[0, 0.58, 0]} scale={[1, 0.5, 1]} hull={0.06} />
    <Cyl pos={[0, 0.74, 0]} r={0.15} h={0.14} color="#22c55e" />
    <Cyl pos={[0, 0.78, 0]} r={0.05} h={0.12} color="#b45309" />
    <B pos={[0, 0.36, 0.25]} size={[0.32, 0.12, 0.04]} color="#dc2626" ink={0.015} />
  </group>
);

/* Indonesian 2-Burner Gas Stove */
export const GasStove3D: React.FC<{ pos?: V3; burnerOn?: boolean; t?: number }> = ({ pos = [0, 0, 0], burnerOn = false, t = 0 }) => (
  <group position={pos}>
    <B pos={[0, 0.12, 0]} size={[1.75, 0.24, 0.88]} color="#d4d8df" ink={0.035} />
    <B pos={[0, 0.25, 0]} size={[1.66, 0.04, 0.80]} color="#4b5563" ink={0.02} />
    {/* Two Burner Grates */}
    {[-0.44, 0.44].map((x, idx) => (
      <group key={idx} position={[x, 0.29, 0]}>
        <Cyl pos={[0, 0, 0]} r={0.24} h={0.05} color="#1f2937" hull={0.08} />
        <B pos={[0, 0.03, 0]} size={[0.52, 0.03, 0.05]} color="#111827" ink={0.01} />
        <B pos={[0, 0.03, 0]} size={[0.05, 0.03, 0.52]} color="#111827" ink={0.01} />
      </group>
    ))}
    {/* Red Rotary Knobs */}
    {[-0.44, 0.44].map((x, idx) => (
      <Cyl key={idx} pos={[x, 0.12, 0.46]} r={0.065} h={0.07} rot={[Math.PI / 2, 0, 0]} color="#dc2626" />
    ))}
    <GasBurnerFlame pos={[0.44, 0.32, 0]} on={burnerOn} t={t} />
  </group>
);

/* Wok Pan with Curly Yellow Noodles + Fried Egg */
export const WokPan3D: React.FC<{ pos?: V3; rot?: V3; hasNoodles?: boolean; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  hasNoodles = true,
  scale = 1,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    {/* Wok bowl */}
    <Cyl pos={[0, 0.12, 0]} r={0.24} rTop={0.42} h={0.22} color="#27272a" hull={0.07} seg={16} />
    {/* Wooden handle */}
    <Cyl pos={[0.62, 0.26, 0]} r={0.045} h={0.56} rot={[0, 0, -1.22]} color="#92400e" hull={0.12} />
    {/* Small ear handle */}
    <B pos={[-0.44, 0.22, 0]} size={[0.10, 0.05, 0.18]} color="#18181b" ink={0.02} />
    {hasNoodles && (
      <group position={[0, 0.20, 0]}>
        <P geo={() => <sphereGeometry args={[0.31, 12, 8]} />} color="#f59e0b" pos={[0, 0.0, 0]} scale={[1, 0.35, 1]} hull={0.05} />
        {/* Sunny-side up egg */}
        <Cyl pos={[0.08, 0.10, 0.04]} r={0.14} h={0.03} color="#fffbeb" hull={0.06} />
        <P geo={() => <sphereGeometry args={[0.065, 10, 8]} />} color="#facc15" pos={[0.09, 0.13, 0.04]} scale={[1, 0.55, 1]} hull={0.08} />
        {/* Chili slices */}
        <B pos={[-0.12, 0.11, 0.08]} size={[0.07, 0.025, 0.04]} color="#dc2626" ink={0.01} />
        <B pos={[-0.04, 0.11, -0.10]} size={[0.07, 0.025, 0.04]} color="#16a34a" ink={0.01} />
      </group>
    )}
  </group>
);

/* Iconic Indonesian "Mangkok Ayam Jago" with Steaming Noodles */
export const NoodleBowl3D: React.FC<{ pos?: V3; scale?: number; t?: number; steam?: boolean }> = ({
  pos = [0, 0, 0],
  scale = 1,
  t = 0,
  steam = true,
}) => (
  <group position={pos} scale={scale}>
    <Cyl pos={[0, 0.04, 0]} r={0.14} h={0.07} color="#e5e7eb" hull={0.07} />
    <Cyl pos={[0, 0.17, 0]} r={0.15} rTop={0.30} h={0.22} color="#fffef7" hull={0.07} seg={16} />
    {/* Classic Red Rim & Rooster Stripe */}
    <Cyl pos={[0, 0.27, 0]} r={0.305} h={0.03} color="#dc2626" hull={0.04} seg={16} />
    <B pos={[0, 0.17, 0.24]} size={[0.14, 0.11, 0.04]} color="#b91c1c" ink={0.015} />
    {/* Noodles + Egg + Chopsticks */}
    <P geo={() => <sphereGeometry args={[0.25, 12, 8]} />} color="#f59e0b" pos={[0, 0.24, 0]} scale={[1, 0.36, 1]} hull={0.05} />
    <Cyl pos={[0.06, 0.32, 0.02]} r={0.11} h={0.025} color="#ffffff" hull={0.06} />
    <P geo={() => <sphereGeometry args={[0.05, 8, 8]} />} color="#facc15" pos={[0.06, 0.34, 0.02]} scale={[1, 0.6, 1]} hull={0.08} />
    <Cyl pos={[0.14, 0.38, -0.04]} r={0.014} h={0.48} rot={[0, 0, -0.45]} color="#92400e" hull={0.15} />
    <Cyl pos={[0.19, 0.36, 0.02]} r={0.014} h={0.48} rot={[0, 0, -0.35]} color="#92400e" hull={0.15} />
    {/* Delicate rising noodle steam curls */}
    {steam &&
      [0, 1, 2].map((i) => {
        const k = (t * 0.6 + i * 0.33) % 1;
        return (
          <mesh key={i} position={[(i - 1) * 0.10 + Math.sin(k * 6 + i) * 0.06, 0.36 + k * 0.55, 0]}>
            <sphereGeometry args={[0.045 + k * 0.05, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={Math.sin(k * Math.PI) * 0.55} depthWrite={false} />
          </mesh>
        );
      })}
  </group>
);

/* 3D Instant Noodle Packet (attachable to beanHandWorld!) */
export const NoodlePacket3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
}) => {
  const tex = useMemo(() => miePacketTex(), []);
  return (
    <group position={pos} rotation={rot} scale={scale}>
      <B pos={[0, 0, 0]} size={[0.38, 0.46, 0.09]} map={tex} ink={0.02} />
    </group>
  );
};

/* Classic Indonesian Blue Plastic Water Dipper ("Gayung") */
export const Gayung3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; hasWater?: boolean }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
  hasWater = true,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    <Cyl pos={[0, 0, 0]} r={0.15} rTop={0.21} h={0.24} color="#2563eb" hull={0.08} seg={14} />
    <B pos={[0.30, 0.06, 0]} size={[0.32, 0.06, 0.07]} rot={[0, 0, 0.12]} color="#1d4ed8" ink={0.02} />
    {hasWater && <Cyl pos={[0, 0.08, 0]} r={0.19} h={0.03} color="#7dd3fc" hull={0.03} />}
  </group>
);

/* Metal Spatula ("Sodet") for Riko's Overconfident Chef Pose */
export const Spatula3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    <Cyl pos={[0, 0, 0]} r={0.022} h={0.55} color="#cbd5e1" hull={0.14} />
    <Cyl pos={[0, -0.26, 0]} r={0.032} h={0.18} color="#dc2626" hull={0.12} />
    <B pos={[0, 0.30, 0.02]} size={[0.16, 0.16, 0.02]} rot={[0.25, 0, 0]} color="#e2e8f0" ink={0.015} />
  </group>
);

/* Wet Towel ("Handuk Basah") tossed by Bu Tini to snuff out grease fire */
export const WetTowel3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    <B pos={[0, 0, 0]} size={[0.92, 0.08, 0.72]} color="#0284c7" ink={0.03} />
    <B pos={[0, 0.045, 0.24]} size={[0.90, 0.02, 0.08]} color="#e0f2fe" ink={0.01} />
    <B pos={[0, 0.045, -0.24]} size={[0.90, 0.02, 0.08]} color="#e0f2fe" ink={0.01} />
  </group>
);

/* Wall Clock showing 02:00 */
export const WallClock02: React.FC<{ pos?: V3; hour?: number; minute?: number }> = ({ pos = [0, 0, 0], hour = 2, minute = 0 }) => {
  const tex = useMemo(() => clock02Tex(hour, minute), [hour, minute]);
  return (
    <group position={pos}>
      <Cyl pos={[0, 0, 0]} r={0.44} h={0.08} rot={[Math.PI / 2, 0, 0]} color="#dc2626" hull={0.08} seg={20} />
      <mesh position={[0, 0, 0.05]}>
        <circleGeometry args={[0.39, 24]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
};

/* ================================================================== */
/* 4. DENSE 3D INDONESIAN KOSAN SETS (KITCHEN, FRIDGE, BED, CORRIDOR) */
/* ================================================================== */

/* Shared Kosan Fridge with Sticky Notes */
export const KosanFridge3D: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 1.35, 0]} size={[1.15, 2.7, 1.05]} color="#e2e8f0" ink={0.05} />
    <B pos={[0, 1.85, 0.54]} size={[1.1, 0.04, 0.04]} color="#64748b" ink={0.015} />
    <B pos={[-0.42, 2.15, 0.56]} size={[0.06, 0.36, 0.06]} color="#475569" ink={0.015} />
    <B pos={[-0.42, 1.45, 0.56]} size={[0.06, 0.45, 0.06]} color="#475569" ink={0.015} />
    <Sign pos={[0.04, 1.55, 0.55]} w={0.86} h={0.44} text="JANGAN AMBIL TELOR!" bg="#fef08a" fg="#991b1b" />
    {/* Water gallon sitting on top */}
    <Cyl pos={[0, 3.05, 0]} r={0.28} h={0.62} color="#7dd3fc" hull={0.05} />
    <Cyl pos={[0, 3.40, 0]} r={0.09} h={0.12} color="#0284c7" />
  </group>
);

/* Complete Kosan Shared Kitchen Counter + Stove + LPG + Overhead Cabinet (scorchable!) */
export const KosanKitchenCounter: React.FC<{
  pos?: V3;
  burnerOn?: boolean;
  scorchLevel?: number;
  fireScale?: number;
  t?: number;
}> = ({ pos = [0, 0, 0], burnerOn = true, scorchLevel = 0, fireScale = 0, t = 0 }) => {
  const tile = useMemo(() => kitchenTileTex(), []);
  return (
    <group position={pos}>
      {/* Tiled concrete countertop */}
      <B pos={[0, 0.52, 0]} size={[4.2, 1.04, 1.25]} color="#d6d3d1" ink={0.05} />
      <B pos={[0, 1.06, 0]} size={[4.3, 0.12, 1.35]} map={tile} ink={0.035} />
      {/* Under-counter opening with LPG 3kg Melon */}
      <B pos={[0.55, 0.48, 0.58]} size={[1.1, 0.85, 0.12]} color="#27272a" ink={0.02} />
      <LpgMelon3D pos={[0.55, 0.02, 0.72]} />
      {/* Tiled Backsplash behind stove */}
      <B pos={[0, 2.35, -0.62]} size={[4.4, 2.5, 0.12]} map={tile} ink={0.04} />
      {/* Overhead Wooden Dish Cabinet (darkens & scorches above stove!) */}
      <B
        pos={[0.45, 3.15, -0.18]}
        size={[2.3, 0.92, 0.72]}
        color={scorchLevel > 0.3 ? "#573926" : "#a16236"}
        ink={0.045}
      />
      <B pos={[-0.12, 3.15, 0.20]} size={[0.06, 0.24, 0.06]} color="#facc15" ink={0.015} />
      <B pos={[1.02, 3.15, 0.20]} size={[0.06, 0.24, 0.06]} color="#facc15" ink={0.015} />
      {/* Scorched soot mark creeping up tiles & cabinet above the burning wok */}
      <ScorchedMark3D pos={[0.45, 2.25, -0.53]} size={[2.3, 2.2]} level={scorchLevel} />
      <ScorchedMark3D pos={[0.45, 3.05, 0.21]} size={[2.1, 0.9]} level={scorchLevel * 0.95} />

      {/* Spice Bottles (Kecap, Sambal, Cooking Oil) on left */}
      <Cyl pos={[-1.55, 1.32, -0.1]} r={0.08} h={0.40} color="#1c1917" />
      <Cyl pos={[-1.55, 1.56, -0.1]} r={0.035} h={0.12} color="#dc2626" />
      <Cyl pos={[-1.30, 1.30, 0.08]} r={0.075} h={0.36} color="#dc2626" />
      <Cyl pos={[-1.02, 1.36, -0.15]} r={0.10} h={0.48} color="#facc15" />

      {/* 2-Burner Gas Stove + Wok Pan */}
      <GasStove3D pos={[0.35, 1.12, 0.02]} burnerOn={burnerOn} t={t} />
      <WokPan3D pos={[0.79, 1.42, 0.02]} hasNoodles />

      {/* Upgraded Realistic Flame erupting from Wok! */}
      {fireScale > 0.01 && <RealisticFlame3D pos={[0.79, 1.58, 0.02]} scale={fireScale} heightMul={1.25} t={t} seed={3} />}
    </group>
  );
};

/* Indonesian Kosan Bedroom Corner (Bed + Standing Fan + Desk + Clock 02:00) */
export const KosanBedroomSet: React.FC<{ pos?: V3; t?: number }> = ({ pos = [0, 0, 0], t = 0 }) => (
  <group position={pos}>
    {/* Mattress + Blue Blanket + Pillow + Bolster (Guling!) */}
    <B pos={[-0.7, 0.24, 0]} size={[2.3, 0.42, 1.55]} color="#3b82f6" ink={0.04} />
    <B pos={[-0.2, 0.48, 0]} size={[1.35, 0.14, 1.58]} color="#1d4ed8" ink={0.03} />
    <B pos={[-1.5, 0.54, 0]} size={[0.52, 0.22, 0.92]} color="#fef9c3" ink={0.03} />
    <Cyl pos={[-0.75, 0.56, -0.45]} r={0.15} h={1.05} rot={[0, 0, Math.PI / 2]} color="#f472b6" />
    {/* Standing Electric Fan with Spinning Blades */}
    <group position={[1.45, 0, -0.45]}>
      <Cyl pos={[0, 0.06, 0]} r={0.32} h={0.10} color="#475569" />
      <Cyl pos={[0, 0.85, 0]} r={0.045} h={1.55} color="#cbd5e1" hull={0.14} />
      <P geo={() => <torusGeometry args={[0.36, 0.04, 8, 20]} />} color="#64748b" pos={[0, 1.65, 0.06]} hull={0.08} />
      <group position={[0, 1.65, 0.05]} rotation={[0, 0, t * 18]}>
        {[0, 1, 2].map((i) => (
          <B key={i} pos={[0, 0, 0]} size={[0.60, 0.12, 0.03]} rot={[0, 0, (i * Math.PI) / 3]} color="#38bdf8" ink={0.015} />
        ))}
      </group>
    </group>
    {/* Wall Clock 02:00 */}
    <WallClock02 pos={[0, 2.75, -1.15]} hour={2} minute={0} />
  </group>
);

/* Kosan Corridor Door Unit with Room Number + Flip-Flop Rack */
export const KosanDoorUnit: React.FC<{ pos?: V3; num: string; openAngle?: number; color?: string }> = ({
  pos = [0, 0, 0],
  num,
  openAngle = 0,
  color = "#b47b4e",
}) => (
  <group position={pos}>
    <B pos={[0, 1.35, -0.04]} size={[1.55, 2.7, 0.14]} color="#4a301e" ink={0.04} />
    {/* Hinged door swinging open */}
    <group position={[-0.7, 0, 0]} rotation={[0, openAngle, 0]}>
      <B pos={[0.7, 1.32, 0.02]} size={[1.38, 2.55, 0.10]} color={color} ink={0.035} />
      <P geo={() => <sphereGeometry args={[0.07, 10, 8]} />} color="#facc15" pos={[1.22, 1.22, 0.11]} hull={0.08} />
      <Sign pos={[0.7, 2.1, 0.09]} w={0.48} h={0.34} text={num} bg="#fef3c7" fg="#1c1917" />
    </group>
    {/* Flip-flops outside door */}
    <B pos={[0.35, 0.04, 0.38]} size={[0.14, 0.05, 0.30]} color="#22c55e" ink={0.015} />
    <B pos={[0.56, 0.04, 0.42]} size={[0.14, 0.05, 0.30]} color="#22c55e" ink={0.015} />
  </group>
);

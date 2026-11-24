import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { BAGAS, BU_TINI, DEDI, NISA, RIKO } from "./SheetMie";
import {
  BuburBowl3D,
  BuburCart3D,
  BukuBon3D,
  ClashAura3D,
  KalengKerupuk3D,
  Kerupuk3D,
  KosanMorningStreet,
  LightningBolt3D,
  OrenCat3D,
  SatePlate3D,
  Spoon3D,
  WarungTableSet3D,
} from "./three/objectsBubur";

const SyncCam: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fov?: number }> = ({
  pos,
  look,
  fov = 34,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};

/* ================================================================== */
/* CAST "PERANG BUBUR DIADUK VS TIDAK DIADUK" (Kos Bu Tini Ep. 2!)    */
/* ================================================================== */
export const RIKO_BUBUR: BeanParams = {
  ...RIKO,
  apron: undefined, // kaos biru santai pagi hari tanpa celemek dapur
  barefoot: false,
  seed: 91,
};

export const BAGAS_BUBUR: BeanParams = {
  ...BAGAS,
  barefoot: false,
  seed: 92,
};

export const BANG_UDIN: BeanParams = {
  skin: "#e3bc93",
  torso: "#fef3c7",
  sleeves: "#fef3c7",
  pants: "#3f3f46",
  apron: "#15803d",
  slung: "#f8fafc", // handuk putih kecil di bahu khas tukang bubur!
  hat: "cap",
  hatColor: "#1e3a8a",
  mustache: true,
  wide: 1.12,
  barefoot: false,
  seed: 96,
};

export { BU_TINI, DEDI, NISA };

const CHAR_LABELS: [string, string, string][] = [
  ["Riko (Kamar 01)", "Ketua TIM TIDAK DIADUK 🥣", "Kaos biru khas Kos Bu Tini. Sangat estetik: kuah kuning, suwiran ayam, dan kerupuk wajib rapi terpisah."],
  ["Mas Bagas (Kamar 02)", "Jenderal TIM DIADUK 🥄", "Kaos hitam + headphone. Langsung tancap sendok & aduk rata semua topping biar lumer menyatu!"],
  ["Bang Udin (BARU!)", "Tukang Bubur Legendaris", "Topi biru, celemek hijau, handuk bahu, kumis ramah. Pemegang Buku Bon Utang pamungkas."],
  ["Bu Tini", "Ibu Kos · Kubu TIDAK DIADUK", "Kebaya batik merah & sanggul. Setuju sama Riko: bubur rapi itu penuh seni!"],
  ["Mbak Nisa (Kamar 03)", "Penghuni 03 · Kubu DIADUK", "Kerudung & busana pink. Bela Bagas: diaduk baru merata gurihnya dari suapan pertama!"],
  ["Mas Dedi (Kamar 04)", "Wasit Panik di Tengah", "Kaos putih, sarung hijau, peci. Coba melerai duel sendok, malah kena hujan kerupuk!"],
];

export const SheetBuburKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#e0f2fe, #fef3c7)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.9, 25] }}>
      <SyncCam pos={[0, 1.9, 25]} look={[0, 1.55, 0]} fov={22} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 30]} />
        <meshStandardMaterial color="#e7e5e4" roughness={1} />
      </mesh>
      <hemisphereLight args={["#fff8eb", "#7c6556", 1.75]} />
      <directionalLight position={[6, 10, 12]} intensity={1.7} color="#fff6df" castShadow />

      <BeanCard position={[-6.8, 0, 0]} height={2.55} params={{ ...RIKO_BUBUR, expr: "smug", armR: [64, 42] }} />
      <BeanCard position={[-4.1, 0, 0]} height={2.55} params={{ ...BAGAS_BUBUR, expr: "laugh", armR: [76, 36] }} />
      <BeanCard position={[-1.35, 0, 0]} height={2.62} params={{ ...BANG_UDIN, expr: "smug", armR: [58, 42] }} />
      <BeanCard position={[1.35, 0, 0]} height={2.62} params={{ ...BU_TINI, expr: "angry", armL: [-34, 48], armR: [68, 38] }} />
      <BeanCard position={[4.1, 0, 0]} height={2.48} params={{ ...NISA, expr: "happy", armL: [-40, 48], armR: [52, 42] }} />
      <BeanCard position={[6.8, 0, 0]} height={2.55} params={{ ...DEDI, expr: "shock", sweat: true, armL: [-76, -24], armR: [76, 24] }} />
    </ThreeCanvas>

    {/* Top Title Bar */}
    <div style={{ position: "absolute", top: 28, left: 0, right: 0, textAlign: "center" }}>
      <div
        style={{
          display: "inline-block",
          padding: "12px 38px",
          borderRadius: 20,
          background: "#1e1b2e",
          border: "5px solid #facc15",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 48,
          color: "#fef08a",
          letterSpacing: 1.5,
        }}
      >
        LEMBAR KARAKTER — KOS BU TINI EP. 2: PERANG BUBUR DIADUK VS TIDAK DIADUK
      </div>
    </div>

    {/* Bottom Character Cards */}
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 34,
        right: 34,
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 14,
      }}
    >
      {CHAR_LABELS.map(([name, role, desc], i) => (
        <div
          key={i}
          style={{
            background: "rgba(255,252,245,0.96)",
            border: "4px solid #241726",
            borderRadius: 16,
            padding: "12px 14px",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 21, color: "#1c1917" }}>{name}</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: i === 0 || i === 3 ? "#0284c7" : i === 1 || i === 4 ? "#d97706" : "#b91c1c", marginTop: 2 }}>
            {role}
          </div>
          <div style={{ fontSize: 13.5, color: "#44403c", marginTop: 5, lineHeight: 1.32 }}>{desc}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const PropTile: React.FC<{
  title: string;
  subtitle: string;
  camPos: [number, number, number];
  look: [number, number, number];
  bg?: string;
  fov?: number;
  children: React.ReactNode;
}> = ({ title, subtitle, camPos, look, bg = "#f5efe6", fov = 34, children }) => (
  <div
    style={{
      position: "relative",
      borderRadius: 18,
      overflow: "hidden",
      border: "5px solid #241726",
      background: bg,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ position: "relative", flex: 1 }}>
      <ThreeCanvas width={460} height={470} shadows camera={{ fov, near: 0.1, far: 120, position: camPos }}>
        <SyncCam pos={camPos} look={look} fov={fov} />
        <color attach="background" args={[bg]} />
        <hemisphereLight args={["#fff8eb", "#6a5448", 1.65]} />
        <directionalLight position={[4, 7, 6]} intensity={1.65} color="#fff5db" castShadow />
        {children}
      </ThreeCanvas>
    </div>
    <div
      style={{
        background: "#1f1826",
        color: "#ffffff",
        padding: "10px 14px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 20, color: "#fde047" }}>{title}</div>
      <div style={{ fontSize: 14, color: "#e5e7eb", marginTop: 2 }}>{subtitle}</div>
    </div>
  </div>
);

export const SheetBuburProperti: React.FC = () => (
  <AbsoluteFill style={{ background: "#14111a", padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ textAlign: "center" }}>
      <span
        style={{
          display: "inline-block",
          padding: "10px 36px",
          borderRadius: 18,
          background: "#fef08a",
          border: "5px solid #dc2626",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 44,
          color: "#1c1917",
          letterSpacing: 1.5,
        }}
      >
        LEMBAR PROPERTI & LATAR 3D — PERANG BUBUR AYAM BANG UDIN
      </span>
    </div>

    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 18 }}>
      <PropTile title="1. Gerobak Bubur Bang Udin" subtitle="Etalase kaca, dandang uap, roda sepeda, spanduk" camPos={[1.8, 2.2, 5.1]} look={[0, 1.35, 0]} bg="#dbeafe">
        <BuburCart3D pos={[0, 0, 0]} t={0.6} />
      </PropTile>

      <PropTile title="2. Bubur: Rapi vs Diaduk!" subtitle="Kiri: Tidak Diaduk (estetik) · Kanan: Diaduk (swirl)" camPos={[0, 1.35, 2.3]} look={[0, 0.25, 0]} bg="#fef3c7">
        <BuburBowl3D pos={[-0.45, 0, 0]} scale={1.18} mixProgress={0} t={0.3} steam />
        <BuburBowl3D pos={[0.45, 0, 0]} scale={1.18} mixProgress={1} t={0.8} steam />
      </PropTile>

      <PropTile title="3. Sendok Duel & Kaleng Kerupuk" subtitle="Sendok 3D (attachable), kaleng biru & kerupuk terbang" camPos={[0.3, 1.15, 2.6]} look={[0, 0.45, 0]} bg="#e0f2fe">
        <KalengKerupuk3D pos={[-0.42, 0, 0]} scale={1.05} />
        <Spoon3D pos={[0.35, 0.08, 0.1]} rot={[0.1, 0.2, -0.35]} scale={1.35} />
        <Kerupuk3D pos={[0.42, 0.72, 0.15]} rot={[0.5, 0.3, 0.4]} scale={1.15} />
      </PropTile>

      <PropTile title="4. Meja Warung & Sate Puyuh" subtitle="Meja-bangku kayu, kecap, sambal, tisu & sate tusuk" camPos={[1.4, 1.85, 3.6]} look={[0, 0.85, 0]} bg="#ffedd5">
        <WarungTableSet3D pos={[0, 0, 0]} />
      </PropTile>

      <PropTile title="5. Buku Bon Utang (Twist!)" subtitle="Buku bon biru Bang Udin: Riko 45rb, Bagas 60rb" camPos={[0.2, 0.35, 1.35]} look={[0, 0.05, 0]} bg="#fef9c3">
        <BukuBon3D pos={[0, 0.05, 0]} rot={[0, -0.22, 0.08]} scale={1.25} />
      </PropTile>

      <PropTile title="6. VFX Duel Anime 3D" subtitle="Petir biru (Tidak Diaduk) vs emas (Diaduk) + shockwave" camPos={[0, 1.2, 3.8]} look={[0, 0.85, 0]} bg="#171226">
        <LightningBolt3D pos={[-0.78, 0.1, 0]} color="#38bdf8" scale={0.95} t={0.4} />
        <LightningBolt3D pos={[0.78, 0.1, 0]} color="#f59e0b" scale={0.95} t={0.9} />
        <ClashAura3D pos={[0, 0.9, 0.2]} scale={0.85} t={0.6} />
        <Spoon3D pos={[-0.4, 0.4, 0.3]} rot={[0, 0, -0.7]} scale={1.3} glow="#38bdf8" />
        <Spoon3D pos={[0.4, 0.4, 0.3]} rot={[0, 0, 0.7]} scale={1.3} glow="#f59e0b" />
      </PropTile>

      <PropTile title="7. Easter Egg: Kucing Oren!" subtitle="Mengintip di dekat gerobak — pemancing komentar!" camPos={[0.55, 0.72, 1.55]} look={[0, 0.32, 0]} bg="#dcfce7">
        <OrenCat3D pos={[0, 0, 0]} scale={1.25} t={0.5} />
      </PropTile>

      <PropTile title="8. Latar Jalan Pagi Kos Bu Tini" subtitle="Gerbang Kos Bu Tini, gerobak, meja makan, trotoar" camPos={[-0.5, 2.9, 8.6]} look={[0, 1.5, -2.0]} bg="#bae6fd" fov={42}>
        <KosanMorningStreet t={0.5} showCat />
      </PropTile>
    </div>
  </AbsoluteFill>
);

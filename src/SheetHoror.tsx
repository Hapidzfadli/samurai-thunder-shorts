import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { BAGAS, DEDI, RIKO } from "./SheetMie";
import {
  Flashlight3D,
  GorenganBasket3D,
  HauntedMansionYard,
  PhoneGimbal3D,
  PisangGoreng3D,
  SpookyAura3D,
  ThermosCoffeeSet3D,
} from "./three/objectsHoror";

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
/* CAST "UJI NYALI MALAM JUMAT — HANTUNYA MINTA GORENGAN!" (Ep. 3)    */
/* ================================================================== */
export const RIKO_HOROR: BeanParams = {
  ...RIKO,
  apron: undefined,
  barefoot: false,
  seed: 101,
};

export const BAGAS_HOROR: BeanParams = {
  ...BAGAS,
  barefoot: false,
  seed: 102,
};

export const DEDI_HOROR: BeanParams = {
  ...DEDI,
  barefoot: false,
  seed: 103,
};

export const MAS_POCONG: BeanParams = {
  skin: "#e2e8f0",
  torso: "#f5f2e6",
  hat: "pocong",
  hatColor: "#f5f2e6",
  pocong: true,
  tired: true,
  seed: 104,
};

export const MBAK_KUNTI: BeanParams = {
  skin: "#e8eef5",
  torso: "#f8fafc",
  hair: "#17131e",
  hat: "kunti",
  kunti: true,
  tired: true,
  seed: 105,
};

const CHAR_LABELS: [string, string, string][] = [
  ["Riko (Kamar 01)", "Host Uji Nyali Sok Berani", "Bawa HP Live Stream biar viral, padahal paling duluan keringat dingin & lutut lemas!"],
  ["Mas Bagas (Kamar 02)", "Kameramen Santuy + Gorengan", "Bawa kantong pisang goreng & kopi panas. Nggak takut hantu — malah ajak nongkrong!"],
  ["Mas Dedi (Kamar 04)", "Tim Doa & Senter Gede", "Pegang senter super terang. Begitu lihat penampakan langsung kaku kayak patung!"],
  ["Kang Pocong (BARU!)", "Hantu Lembur Malam Jumat", "Kain kafan rapi & ikatan tali lucu. Capek lompat-lompat tiap malam Jumat, langsung luluh lihat pisang goreng!"],
  ["Mbak Kunti (BARU!)", "Hantu Curhat & Kopi Hitam", "Awalnya muncul dramatis penuh kabut, ujungnya ikut duduk curhat capek kerja shift malam!"],
];

export const SheetHororKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#1e1b4b, #312e81)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.9, 23] }}>
      <SyncCam pos={[0, 1.9, 23]} look={[0, 1.55, 0]} fov={22} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 30]} />
        <meshStandardMaterial color="#1e293b" roughness={1} />
      </mesh>
      <hemisphereLight args={["#c7d2fe", "#1e1b4b", 1.75]} />
      <directionalLight position={[6, 10, 12]} intensity={1.7} color="#fef3c7" castShadow />

      <BeanCard position={[-5.6, 0, 0]} height={2.55} params={{ ...RIKO_HOROR, expr: "scared", sweat: true, armL: [-52, 46], armR: [74, 34] }} />
      <BeanCard position={[-2.8, 0, 0]} height={2.55} params={{ ...BAGAS_HOROR, expr: "smug", armL: [-24, 48], armR: [66, 42] }} />
      <BeanCard position={[0.0, 0, 0]} height={2.55} params={{ ...DEDI_HOROR, expr: "shock", sweat: true, armL: [-72, -18], armR: [82, 24] }} />
      <BeanCard position={[2.8, 0.12, 0]} height={2.58} params={{ ...MAS_POCONG, expr: "sad", sweat: true }} />
      <BeanCard position={[5.6, 0.25, 0]} height={2.56} params={{ ...MBAK_KUNTI, expr: "happy", armL: [-44, 52], armR: [62, 46] }} />
    </ThreeCanvas>

    <div style={{ position: "absolute", top: 28, left: 0, right: 0, textAlign: "center" }}>
      <div
        style={{
          display: "inline-block",
          padding: "12px 38px",
          borderRadius: 20,
          background: "#0f172a",
          border: "5px solid #38bdf8",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 46,
          color: "#fef08a",
          letterSpacing: 1.5,
        }}
      >
        LEMBAR KARAKTER — KOS BU TINI EP. 3: UJI NYALI MALAH CURHAT & GORENGAN!
      </div>
    </div>

    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 34,
        right: 34,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 16,
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
          <div style={{ fontWeight: 900, fontSize: 22, color: "#1c1917" }}>{name}</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: i >= 3 ? "#7c3aed" : "#0284c7", marginTop: 2 }}>{role}</div>
          <div style={{ fontSize: 14, color: "#44403c", marginTop: 5, lineHeight: 1.35 }}>{desc}</div>
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
}> = ({ title, subtitle, camPos, look, bg = "#1e1b4b", fov = 34, children }) => (
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
      <ThreeCanvas width={460} height={470} shadows camera={{ fov, near: 0.1, far: 140, position: camPos }}>
        <SyncCam pos={camPos} look={look} fov={fov} />
        <color attach="background" args={[bg]} />
        <hemisphereLight args={["#e0e7ff", "#312e81", 1.45]} />
        <directionalLight position={[4, 7, 6]} intensity={1.55} color="#fff5db" castShadow />
        {children}
      </ThreeCanvas>
    </div>
    <div style={{ background: "#0f172a", color: "#ffffff", padding: "10px 14px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: "#fde047" }}>{title}</div>
      <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 2 }}>{subtitle}</div>
    </div>
  </div>
);

export const SheetHororProperti: React.FC = () => (
  <AbsoluteFill style={{ background: "#090d16", padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ textAlign: "center" }}>
      <span
        style={{
          display: "inline-block",
          padding: "10px 36px",
          borderRadius: 18,
          background: "#fef08a",
          border: "5px solid #7c3aed",
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 44,
          color: "#1c1917",
          letterSpacing: 1.5,
        }}
      >
        LEMBAR PROPERTI & LATAR 3D — UJI NYALI RUMAH KOSONG MALAM JUMAT
      </span>
    </div>

    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 18 }}>
      <PropTile title="1. Senter Sorot Volumetrik 3D" subtitle="Sorot lampu kerucut menembus kabut malam" camPos={[1.8, 1.1, 2.5]} look={[0, 0.2, 0.8]} bg="#0f172a">
        <Flashlight3D pos={[0, 0.25, -0.3]} beam={1.0} t={0.4} scale={1.15} />
      </PropTile>

      <PropTile title="2. HP Live Stream Gimbal" subtitle="Layar LIVE 2.4K + ring-light uji nyali Riko" camPos={[0.35, 0.62, 2.05]} look={[0, 0.44, 0]} bg="#1e293b">
        <PhoneGimbal3D pos={[0, 0, 0]} rot={[0, -0.22, 0]} scale={1.12} />
      </PropTile>

      <PropTile title="3. Tampah Gorengan Hangat!" subtitle="Pisang goreng, tahu isi, bakwan & cabai rawit" camPos={[0.3, 1.15, 1.85]} look={[0, 0.25, 0]} bg="#292524">
        <GorenganBasket3D pos={[0, 0, 0]} scale={1.35} t={0.5} steam />
      </PropTile>

      <PropTile title="4. Termos & Kopi Hitam Panas" subtitle="Termos merah klasik + gelas kopi mengepul" camPos={[0.45, 0.95, 2.25]} look={[0.05, 0.30, 0]} bg="#27272a">
        <ThermosCoffeeSet3D pos={[0, 0, 0]} scale={1.32} t={0.4} />
        <PisangGoreng3D pos={[0.25, 0.42, 0.32]} rot={[0.3, 0.4, 0.2]} scale={1.08} />
      </PropTile>

      <PropTile title="5. Aura Mistis Kemunculan 3D" subtitle="Cincin kabut biru-ungu + bola spirit melayang" camPos={[0, 1.35, 3.2]} look={[0, 0.75, 0]} bg="#090d16">
        <SpookyAura3D pos={[0, 0.2, 0]} scale={0.95} t={0.5} />
      </PropTile>

      <PropTile title="6. Mode Horor: Rumah Tua Belanda" subtitle="Bulan purnama, pohon beringin, kabut & senter" camPos={[-1.8, 2.75, 11.4]} look={[0.5, 2.65, -3.5]} bg="#0f172a" fov={46}>
        <HauntedMansionYard t={0.4} cozy={0} />
      </PropTile>

      <PropTile title="7. Mode Nongkrong: Lampu Hangat!" subtitle="Lentera teras emas, kunang-kunang & Kucing Oren!" camPos={[1.5, 2.65, 10.6]} look={[0.2, 2.15, -2.5]} bg="#1e1b4b" fov={46}>
        <HauntedMansionYard t={0.8} cozy={1} showCat />
      </PropTile>

      <PropTile title="8. Duo Hantu Curhat!" subtitle="Kang Pocong (tali kafan lucu) & Mbak Kunti" camPos={[0, 1.55, 5.8]} look={[0, 1.35, 0]} bg="#171434" fov={32}>
        <BeanCard position={[-0.78, 0.08, 0]} height={2.15} params={{ ...MAS_POCONG, expr: "talk", mouthOpen: 0.6 }} />
        <BeanCard position={[0.78, 0.20, 0]} height={2.15} params={{ ...MBAK_KUNTI, expr: "laugh", armL: [-38, 48], armR: [58, 42] }} flip />
        <SpookyAura3D pos={[0, 0.1, -0.3]} scale={1.15} t={0.3} />
      </PropTile>
    </div>
  </AbsoluteFill>
);

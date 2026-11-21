import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { Cat3D } from "./three/objectsRig";

export const PRESIDEN: BeanParams = { torso: "#d8c39a", pants: "#2a2a30", hat: "peci", sideHair: "#d9d9de", wide: 1.35, safari: true, seed: 11 };
export const OKNUM_A: BeanParams = { torso: "#7a5530", pants: "#4a3420", hat: "policecap", hatColor: "#7a5530", wide: 1.15, stars: 2, badge: true, belt: "#121216", mustache: true, seed: 12 };
export const OKNUM_B: BeanParams = { torso: "#7a5530", pants: "#4a3420", hat: "policecap", hatColor: "#7a5530", wide: 1.0, stars: 2, badge: true, belt: "#121216", headphones: true, seed: 13 };
export const PETUGAS: BeanParams = { torso: "#7a5530", pants: "#4a3420", hat: "policecap", hatColor: "#7a5530", wide: 0.95, badge: true, belt: "#121216", seed: 14 };
export const PENYIDIK: BeanParams = { torso: "#f2efe6", pants: "#2a2a30", hair: "#1c1c22", coat: false, wide: 1.0, badge: true, seed: 15 };

const labels: [string, string, string][] = [
  ["Pak Presiden", "KARIKATUR · korban penyadapan", "Peci hitam, safari krem, badan 'gemoy'. Riang, suka joget, sayang kucing."],
  ["Bobby", "Kucing istana", "Kucing oranye-putih, teman curhat Pak Presiden."],
  ["Oknum Bintang Dua", "Polisi fiktif · terduga", "Seragam cokelat Polri, kumis tebal. Tidak meniru wajah tersangka mana pun."],
  ["Oknum Headset", "Polisi fiktif · terduga", "Operator LIMS yang memasukkan nomor tanpa verifikasi, lalu bosan mendengarkan."],
  ["Petugas Jujur", "Pelapor", "Polisi biasa yang masih membaca SOP, lalu melapor pada 30 Oktober."],
  ["Penyidik", "Bareskrim", "Kemeja putih, membawa berkas, menetapkan tersangka."],
];
export const SheetSadap: React.FC = () => {
  const t = 0.4;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#ffe9cf, #f5c9d4)" }}>
      <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.3, 26] }}>
        <CameraRig position={[0, 1.9, 21]} lookAt={[0, 1.6, 0]} fov={22} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <meshStandardMaterial color="#f1dcc4" roughness={1} />
        </mesh>
        <BeanCard position={[-5.3, 0, 0]} height={3.1} params={{ ...PRESIDEN, expr: "happy", armL: [-100, 40], armR: [100, -40] }} />
        <Cat3D position={[-3.3, 0, 0.6]} t={t} scale={1.6} fur="#f59e0b" sit />
        <BeanCard position={[-1.2, 0, 0]} height={3.0} params={{ ...OKNUM_A, expr: "smug", armR: [60, -60], look: 0.5 }} />
        <BeanCard position={[1.0, 0, 0]} height={2.9} params={{ ...OKNUM_B, expr: "sleepy", armL: [-30, -60], armR: [30, -60] }} />
        <BeanCard position={[3.2, 0, 0]} height={2.9} params={{ ...PETUGAS, expr: "worried", prop: "paper", armR: [80, -40] }} />
        <BeanCard position={[5.4, 0, 0]} height={2.9} params={{ ...PENYIDIK, expr: "neutral", prop: "paper", armR: [40, -30] }} />
        <hemisphereLight args={["#ffffff", "#bba8c8", 1.6]} />
        <directionalLight position={[-6, 10, 14]} intensity={2.0} color="#fff0d8" castShadow />
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 56, color: "#2a1a38", letterSpacing: 2 }}>KARAKTER · "HP PRESIDEN DISADAP" (PARODI)</div>
      <div style={{ position: "absolute", bottom: 24, left: 20, right: 20, display: "flex", gap: 14 }}>
        {labels.map(([n, r, d]) => (
          <div key={n} style={{ width: 320, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontWeight: 800, fontSize: 25, color: "#2a1a38" }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#c0526a" }}>{r}</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#5a4a6a", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

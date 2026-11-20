import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Body, Rig3D, idle3 } from "./three/objectsRig";
import { Bacteria } from "./three/objectsLift";

const ASTI: Body = { shirt: "#f6a6c0", pants: "#f6a6c0", hair: "#2a1a10", hairStyle: "bun", height: 0.93, slim: 0.95, belly: 0.25, sarong: true };
const HAPID: Body = { shirt: "#3b82c4", pants: "#2b3350", hair: "#2a1a10", hairStyle: "messy", height: 1.02, glasses: true };
const BIDAN: Body = { shirt: "#f4f6f8", pants: "#f4f6f8", hair: "#2a1a10", hairStyle: "bun", height: 0.95, slim: 0.95, sarong: true, shoes: "#e5e7eb" };

const Blob: React.FC<{ x: number; color: string; hat: string; t: number; seed: number; nose?: boolean; mail?: boolean }> = ({ x, color, t, seed, nose, mail }) => (
  <group position={[x, 0.3, 0]}>
    <Bacteria position={[0, 0.5, 0]} t={t} seed={seed} color={color} scale={1.2} cheer={0.2} />
    {nose && (
      <mesh position={[0, 0.58, 0.72]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#f2b5a0" />
      </mesh>
    )}
    {mail && (
      <mesh position={[0.62, 0.5, 0.2]} rotation={[0, -0.5, 0.2]}>
        <boxGeometry args={[0.4, 0.28, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    )}
  </group>
);

export const SheetSehat: React.FC = () => {
  const t = 0.4;
  const idle = idle3(t, 1);
  const labels: [string, string, string][] = [
    ["Bu Asti", "TOKOH UTAMA · hamil muda", "Ibu muda yang sedang hamil trimester pertama. Ceria, tapi kini setiap aroma nasi goreng terasa seperti musuh."],
    ["Pak Hapid", "Suami yang panik", "Penuh niat baik, kikuk di dapur, dan selalu salah menafsirkan gejala. Pembawa humor sepanjang cerita."],
    ["Bu Bidan Ratih", "Pemandu edukasi", "Tenang, hangat, menjelaskan dengan perumpamaan sederhana, lalu mengajak 'masuk ke dalam tubuh'."],
    ["Kurir hCG & Estrogen", "Penghuni tubuh", "Makhluk-makhluk kecil bersurat yang membanjiri kota tubuh Bu Asti di awal kehamilan."],
    ["Satpam Hidung", "Penghuni tubuh", "Penjaga bau yang mendadak super peka dan membunyikan alarm pada hampir semua aroma."],
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#fdeee6, #f6d9e4)" }}>
      <ThreeCanvas width={2000} height={1080} shadows camera={{ fov: 30, near: 0.05, far: 80, position: [0, 1.6, 9.5] }}>
        <CameraRig position={[0.3, 1.5, 12.4]} lookAt={[0.3, 0.95, 0]} fov={30} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 20]} />
          <meshStandardMaterial color="#f3e3d3" roughness={1} />
        </mesh>
        <Rig3D position={[-4.6, 0, 0]} rotationY={0.2} t={t} body={ASTI} pose={{ ...idle, armR: { swing: -0.4, out: 0.2, elbow: 1.0 }, armL: { swing: -0.4, out: 0.2, elbow: 0.8 } }} expr="worried" seed={1} />
        <Rig3D position={[-2.3, 0, 0]} rotationY={0.1} t={t} body={HAPID} pose={{ ...idle, armR: { swing: -1.2, out: 0.5, elbow: 0.5 }, armL: { swing: -1.2, out: 0.5, elbow: 0.5 } }} expr="surprised" seed={2} />
        <Rig3D position={[0.1, 0, 0]} rotationY={-0.1} t={t} body={BIDAN} pose={{ ...idle, armR: { swing: -0.5, out: 0.6, elbow: 1.0 } }} expr="happy" seed={3} />
        <Blob x={2.5} color="#ffd23f" hat="" t={t} seed={1} mail />
        <Blob x={3.9} color="#ff8fb1" hat="" t={t} seed={2} />
        <Blob x={5.3} color="#9bd6ff" hat="" t={t} seed={3} nose />
        <ambientLight intensity={1.2} color="#fff0e6" />
        <directionalLight position={[3, 6, 6]} intensity={1.8} castShadow />
        <directionalLight position={[-4, 3, 4]} intensity={0.6} color="#ffd6e6" />
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#7a2a4a", letterSpacing: 2 }}>KARAKTER · "KENAPA IBU HAMIL MUAL?" (edukasi kesehatan)</div>
      <div style={{ position: "absolute", bottom: 26, left: 30, right: 30, display: "flex", gap: 22, justifyContent: "space-between" }}>
        {labels.map(([n, r, d]) => (
          <div key={n} style={{ width: 360, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontWeight: 800, fontSize: 25, color: "#5a1f3a" }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#c2477a" }}>{r}</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#6b4a58", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

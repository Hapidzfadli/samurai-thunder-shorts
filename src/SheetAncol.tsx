import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Body, Rig3D, idle3 } from "./three/objectsRig";
import { Scooter3D } from "./three/objectsAncol3d";

const HAPID: Body = { shirt: "#2d6cdf", pants: "#2b3350", hair: "#15121a", hairStyle: "quiff", height: 1.02, mask: "#6ec6ff" };
const ASTI: Body = { shirt: "#f48fb1", pants: "#c0529a", hair: "#c0529a", hairStyle: "hijab", height: 0.93, slim: 0.95, sarong: true, mask: "#ff9fc4" };
const KAKAK: Body = { shirt: "#ffb703", pants: "#3b5b92", hair: "#5a3a22", hairStyle: "short", height: 0.96, slim: 0.95 };
const PETUGAS: Body = { shirt: "#2bb673", pants: "#1f2a44", hair: "#2d2d3a", hairStyle: "short", height: 1.0 };

const labels: [string, string, string][] = [
  ["Hapid (aku)", "Tokoh utama", "Rambut pompadour, masker biru. Grogi tapi berusaha tampil santai."],
  ["Asti", "Pasangan di hari spesial", "Hijab magenta, masker pink, mudah merona. Pemalu dan manis."],
  ["Kakak Fotografer", "Penyampai doa", "Pengunjung ramah: 'Semoga langgeng ya, Kak!'"],
  ["Petugas Warung", "Penolong", "Mengembalikan dompet yang jatuh."],
  ["Motor Matic", "Kendaraan berdua", "Motor merah yang membawa mereka ke Ancol."],
];
export const SheetAncol: React.FC = () => {
  const t = 0.4;
  const i = idle3(t, 1);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#fff1e4, #ffd9e4)" }}>
      <ThreeCanvas width={2000} height={1080} shadows camera={{ fov: 30, near: 0.05, far: 80, position: [0, 1.6, 9.5] }}>
        <CameraRig position={[0.2, 1.5, 12.8]} lookAt={[0.2, 0.95, 0]} fov={30} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 20]} />
          <meshStandardMaterial color="#f6e6d3" roughness={1} />
        </mesh>
        <Rig3D position={[-4.8, 0, 0]} rotationY={0.35} t={t} body={HAPID} pose={{ ...i, armR: { swing: -0.3, out: 0.4, elbow: 1.2 } }} expr="happy" seed={1} />
        <Rig3D position={[-2.5, 0, 0]} rotationY={0.2} t={t} body={ASTI} pose={{ ...i, armR: { swing: -0.9, out: 0.2, elbow: 1.5 }, armL: { swing: -0.3, out: 0.2, elbow: 1.0 } }} expr="happy" seed={2} />
        <Rig3D position={[-0.2, 0, 0]} rotationY={0.1} t={t} body={KAKAK} pose={{ ...i, armR: { swing: -1.4, out: 0.3, elbow: 0.6 } }} expr="happy" seed={3} />
        <Rig3D position={[2.2, 0, 0]} rotationY={-0.2} t={t} body={PETUGAS} pose={{ ...i, armR: { swing: -0.8, out: 0.4, elbow: 1.0 } }} expr="happy" seed={4} />
        <Scooter3D position={[4.6, 0, 0]} rotationY={-0.6} />
        <ambientLight intensity={1.25} color="#fff0e6" />
        <directionalLight position={[3, 6, 6]} intensity={1.8} castShadow />
        <directionalLight position={[-4, 3, 4]} intensity={0.6} color="#ffd6e6" />
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#7a2a4a", letterSpacing: 2 }}>KARAKTER 3D · "HARI PERTAMA KE ANCOL"</div>
      <div style={{ position: "absolute", bottom: 26, left: 24, right: 24, display: "flex", gap: 18 }}>
        {labels.map(([n, r, d]) => (
          <div key={n} style={{ width: 380, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontWeight: 800, fontSize: 25, color: "#5a1f3a" }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#c2477a" }}>{r}</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#6b4a58", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

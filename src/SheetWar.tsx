import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Body, Pose3, Rig3D, idle3 } from "./three/objectsRig";
import { Horse3D, Matchlock } from "./three/objectsWar";

const SAM: Body = { shirt: "#1a1822", pants: "#16141c", skin: "#c79a72", hairStyle: "none", armor: "samurai", banner: "#e9e2d0", accent: "#9c1c1c", height: 1.0, shoes: "#111" };
const ASH: Body = { shirt: "#3a3646", pants: "#2a2832", skin: "#c79a72", hairStyle: "none", armor: "ashigaru", accent: "#6b5a3a", height: 0.95, shoes: "#111" };
const CMD: Body = { shirt: "#1a1822", pants: "#16141c", skin: "#c79a72", hairStyle: "none", armor: "commander", banner: "#e9e2d0", accent: "#b3141b", height: 1.04, shoes: "#111" };
const RID: Body = { shirt: "#1a1822", pants: "#16141c", skin: "#c79a72", hairStyle: "none", armor: "samurai", banner: "#b3141b", accent: "#d8a93a", height: 0.9, shoes: "#111" };

export const SheetWar: React.FC = () => {
  const t = 0.6;
  const idle = idle3(t, 1);
  const aim: Pose3 = { ...idle, lean: 0.12, armR: { ik: { target: [0.12, 0.6, 0.34], pole: [0.5, -0.4, -0.1] } }, armL: { ik: { target: [-0.04, 0.66, 0.72], pole: [-0.5, -0.3, 0] } }, legL: { swing: 0.25, knee: 0.3 }, legR: { swing: -0.15, knee: 0.2 }, head: [0.05, 0, 0] };
  const sword: Pose3 = { ...idle, lean: 0.05, armR: { swing: -1.5, out: 0.3, elbow: 0.5 }, armL: { swing: 0.3, out: 0.2, elbow: 0.7 }, legL: { swing: 0.3, knee: 0.3 }, legR: { swing: -0.2, knee: 0.2 } };
  const cmdPose: Pose3 = { ...idle, armR: { swing: -0.3, out: 0.8, elbow: 0.9 }, armL: { swing: 0.1, out: 0.3, elbow: 0.5 } };
  const ride: Pose3 = { lean: 0.15, legL: { swing: 0.9, out: 0.55, knee: 0.9 }, legR: { swing: 0.9, out: 0.55, knee: 0.9 }, armL: { swing: -0.6, out: 0.2, elbow: 0.9 }, armR: { swing: -0.9, out: 0.15, elbow: 0.9 } };
  const labels: [string, string, string][] = [
    ["Samurai (bushi)", "Prajurit elit", "Kabuto hitam bertanduk emas, zirah berlacing merah, panji putih bermon merah di punggung, topeng wajah."],
    ["Ashigaru penembak", "Pasukan senapan", "Topi jingasa kerucut, zirah ringan, senapan sumbu (tanegashima) dengan sumbu menyala."],
    ["Oda Nobunaga", "Panglima", "Jubah merah, bulan sabit emas di helm, bergerak paling tenang di tengah kekacauan."],
    ["Penunggang kuda", "Pasukan berkuda lawan", "Kuda berpelindung merah, penunggang berpanji, menyerbu dengan kecepatan penuh."],
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#070b1c, #1a1424 60%, #3a1d1d)" }}>
      <ThreeCanvas width={2000} height={1080} shadows camera={{ fov: 30, near: 0.05, far: 80, position: [0, 1.6, 9.5] }}>
        <CameraRig position={[0.2, 1.7, 12.6]} lookAt={[0.2, 1.1, 0]} fov={30} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 20]} />
          <meshStandardMaterial color="#1a1c2a" roughness={1} />
        </mesh>
        <Rig3D position={[-4.0, 0, 0]} rotationY={0.3} t={t} body={SAM} pose={sword} seed={1}>
          <group position={[0.28, 0.55, 0.15]} rotation={[0.2, 0, 0.3]}>
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[0.03, 1.1, 0.06]} />
              <meshStandardMaterial color="#e8eef5" metalness={1} roughness={0.15} />
            </mesh>
          </group>
        </Rig3D>
        <Rig3D position={[-1.4, 0, 0]} rotationY={1.15} t={t} body={ASH} pose={aim} seed={2}>
          <Matchlock position={[0.05, 0.62, 0.3]} rotation={[-0.15, 0, 0]} />
        </Rig3D>
        <Rig3D position={[1.3, 0, 0]} rotationY={-0.1} t={t} body={CMD} pose={cmdPose} seed={3} />
        <Horse3D position={[4.1, 0, 0]} rotationY={-0.9} phase={0.15} t={t} rider={{ body: RID, pose: ride }} />
        <ambientLight intensity={1.1} color="#7a8ce0" />
        <directionalLight position={[0, 4, -8]} intensity={2.4} color="#9bb4ff" />
        <directionalLight position={[-4, 6, 5]} intensity={1.6} color="#a9bcff" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={6} shadow-camera-bottom={-2} />
        <pointLight position={[5, 1.5, 3]} intensity={60} distance={10} color="#ff8a3d" />
        <pointLight position={[-6, 2, 3]} intensity={40} distance={10} color="#ffb070" />
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 28, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#fff", letterSpacing: 2 }}>KARAKTER · "NAGASHINO 1575" (gaya Samurai)</div>
      <div style={{ position: "absolute", bottom: 30, left: 30, right: 30, display: "flex", gap: 26, justifyContent: "space-between" }}>
        {labels.map(([n, r, d]) => (
          <div key={n} style={{ width: 460, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontWeight: 800, fontSize: 28, color: "#fff" }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: "#ffb347" }}>{r}</div>
            <div style={{ fontWeight: 600, fontSize: 17, color: "#cbd5e1", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

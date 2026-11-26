import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vec3 } from "./three/objects";
import { BeanCard } from "./three/objectsBean";
import { SkyDome } from "./three/objectsMolase";
import { CanteenTruck, CornBag3D, CornScatter3D, GrassField, PelicanNoseCone, PelicanRig, PigeonCard } from "./three/objectsMerpati";
import { ARA_M, DODI_M, JENDERAL_M } from "./SheetMerpati";

const FONT_HEAD = "Anton, Impact, 'Arial Black', sans-serif";
const FONT_BODY = "Inter, system-ui, sans-serif";

const ThumbRig: React.FC<{ pos: Vec3; look: Vec3; fov: number; roll: number }> = ({ pos, look, fov, roll }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(look[0], look[1], look[2]);
  camera.rotateZ((roll * Math.PI) / 180);
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};

const ThumbMerpatiStage: React.FC<{ portrait: boolean }> = ({ portrait }) => (
  <group>
    <SkyDome top="#3a72c8" horizon="#ffe8b0" r={180} />
    <GrassField size={200} color="#869c58" />
    <hemisphereLight args={["#fff5dd", "#657448", 1.75]} />
    <directionalLight position={[6, 11, 9]} intensity={2.15} color="#ffedc2" castShadow />

    <PelicanRig pos={[-1.55, 0, -4.6]} yaw={0.45} peckPhase={0.5} distracted voteText="SUARA 3-0: JAGUNG!!" />
    <CanteenTruck pos={[2.25, 0, -4.4]} rot={[0, -0.45, 0]} chaos={1} t={0.5} />
    <PelicanNoseCone pos={[0.0, 0.0, -1.85]} scale={0.78} open={0.95} peckPhase={0.35} distracted />
    <CornScatter3D pos={[0.25, 0, 0.25]} count={22} />

    <BeanCard position={portrait ? [-0.72, 0, 0.45] : [-0.95, 0, 0.35]} height={2.05} params={{ ...DODI_M, expr: "scared", sweat: true, armL: [-135, -45], armR: [135, -45] }} />
    <BeanCard position={portrait ? [0.72, 0, 0.35] : [0.92, 0, 0.25]} height={1.94} params={{ ...ARA_M, expr: "shock", sweat: true, armL: [-40, -50], armR: [72, -48] }} />
    <CornBag3D pos={portrait ? [1.0, 0.92, 0.6] : [1.36, 1.18, 0.38]} scale={1.15} spill={0.8} />
    <BeanCard position={portrait ? [1.3, 0, -0.95] : [1.95, 0, -1.55]} height={2.15} params={{ ...JENDERAL_M, expr: "angry", armL: [-140, -35], armR: [140, -35] }} />
    <PigeonCard position={portrait ? [0.0, 2.02, 0.85] : [-0.08, 2.38, 0.95]} size={1.18} params={{ flap: 0.6, harness: true, goggles: true, corn: true, expr: "smug", seed: 1 }} />
  </group>
);

export const ThumbMerpatiShorts: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [0.0, 1.72, 6.2];
  const look: Vec3 = [0.05, 1.55, -0.8];
  return (
    <AbsoluteFill style={{ background: "#1e293b" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 42, near: 0.08, far: 180, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={42} roll={-3.2} />
        <ThumbMerpatiStage portrait />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,12,26,0.72) 0%, rgba(20,12,26,0.05) 30%, rgba(20,12,26,0.05) 64%, rgba(20,12,26,0.78) 100%)" }} />
      <div style={{ position: "absolute", top: 68, left: 40, right: 40, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 26px",
            borderRadius: 999,
            background: "#991b1b",
            border: "5px solid #241726",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 32,
            color: "#fef08a",
            marginBottom: 12,
          }}
        >
          KISAH NYATA · PROJECT PIGEON 1944
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 122,
            lineHeight: 0.96,
            color: "#ffd23f",
            WebkitTextStroke: "12px #241726",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #241726",
          }}
        >
          RUDAL DISETIR
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 112,
            lineHeight: 0.98,
            color: "#ffffff",
            WebkitTextStroke: "12px #241726",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #241726",
          }}
        >
          3 MERPATI HIDUP?!
        </div>
      </div>
      <div style={{ position: "absolute", top: 1555, left: 44, right: 44, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "#fef08a",
            border: "7px solid #241726",
            borderRadius: 28,
            padding: "12px 34px",
            fontFamily: FONT_HEAD,
            fontSize: 50,
            color: "#991b1b",
            boxShadow: "0 14px 36px rgba(0,0,0,0.45)",
          }}
        >
          MALAH VOTING 3–0 SERBU JAGUNG!!
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ThumbMerpatiYoutube: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [0.05, 1.72, 4.35];
  const look: Vec3 = [0.08, 1.48, -0.9];
  return (
    <AbsoluteFill style={{ background: "#1e293b" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 42, near: 0.08, far: 180, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={42} roll={-2.8} />
        <ThumbMerpatiStage portrait={false} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,12,26,0.68) 0%, rgba(20,12,26,0.04) 34%, rgba(20,12,26,0.04) 68%, rgba(20,12,26,0.74) 100%)" }} />
      <div style={{ position: "absolute", top: 34, left: 60, right: 60, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "6px 26px",
            borderRadius: 999,
            background: "#991b1b",
            border: "5px solid #241726",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 28,
            color: "#fef08a",
            marginBottom: 8,
          }}
        >
          SEJARAH KOCAK PD II · PROJECT PIGEON (1944)
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 108,
            lineHeight: 0.96,
            color: "#ffd23f",
            WebkitTextStroke: "12px #241726",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #241726",
          }}
        >
          RUDAL DISETIR 3 MERPATI HIDUP?!
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 36, left: 60, right: 60, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "#fef08a",
            border: "7px solid #241726",
            borderRadius: 24,
            padding: "8px 34px",
            fontFamily: FONT_HEAD,
            fontSize: 48,
            color: "#991b1b",
            boxShadow: "0 14px 36px rgba(0,0,0,0.45)",
          }}
        >
          VOTING 3–0 SERBU JAGUNG JENDERAL!
        </div>
      </div>
    </AbsoluteFill>
  );
};

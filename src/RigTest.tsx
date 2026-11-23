import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Body, Cat3D, Rig3D, blendPose, idle3, walk3 } from "./three/objectsRig";

export const RIG_TEST_FRAMES = 120;
const bima: Body = { shirt: "#3b82c4", pants: "#1e3a8a", hair: "#2a1a10", hairStyle: "messy", height: 0.72, headScale: 1.3 };
const ayah: Body = { shirt: "#e5e7eb", pants: "#7c2d12", hair: "#3a2a1a", hairStyle: "bald", height: 1.0, belly: 0.9, mustache: true, sarong: true };
const ibu: Body = { shirt: "#8b5cf6", pants: "#4c1d95", hair: "#2a1a10", hairStyle: "bun", height: 0.92, slim: 0.95 };

export const RigTest: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const ph = (f / 30) * 1.1;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#0a1226, #17305a)" }}>
      <ThreeCanvas width={1080} height={1080} shadows camera={{ fov: 38, near: 0.05, far: 100, position: [0, 1.4, 6.2] }}>
        <CameraRig position={[0, 1.2, 6.6]} lookAt={[0, 0.9, 0]} fov={38} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 20]} />
          <meshStandardMaterial color="#2b3a66" />
        </mesh>
        <Rig3D position={[-2.2, 0, 0]} t={t} body={bima} pose={walk3(ph, "tiptoe")} expr="worried" />
        <Rig3D position={[-0.8, 0, 0]} t={t} body={bima} pose={walk3(ph, "walk")} expr="happy" />
        <Rig3D position={[0.7, 0, 0]} t={t} body={ayah} pose={blendPose(idle3(t), { armR: { ik: { target: [0.35, 0.95, 0.5] } } as never }, 0)} expr="sleepy" />
        <Rig3D position={[2.0, 0, 0]} t={t} body={ibu} pose={{ ...idle3(t), armR: { ik: { target: [0.2, 1.0, 0.55] } } }} expr="angry" />
        <Cat3D position={[3.0, 0, 0.3]} t={t} alert={1} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 5, 5]} intensity={1.8} castShadow />
        <pointLight position={[-3, 2, 4]} intensity={20} color="#7ec4ff" />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

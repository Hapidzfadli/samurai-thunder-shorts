import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Rig3D, idle3, Pose3 } from "./three/objectsRig";
import { B_ASTI, B_HAPID, Ground, MASK_A, MASK_H, Scooter3D } from "./three/objectsAncol3d";

const rideA = (swing: number, knee: number): Pose3 => ({
  ...idle3(0.3, 1), lean: 0.05, legL: { swing, knee }, legR: { swing: swing - 0.1, knee },
  armL: { ik: { target: [0.2, 0.5, 0.2], pole: [-0.4, -0.3, 0] } }, armR: { ik: { target: [-0.2, 0.5, 0.2], pole: [0.4, -0.3, 0] } },
});
export const Ancol3DTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#bfe8ff" }}>
    <ThreeCanvas width={1080} height={1080} shadows camera={{ fov: 30, near: 0.05, far: 80, position: [0, 1.6, 9.5] }}>
      <CameraRig position={[-0.5, 1.3, 6.5]} lookAt={[0, 0.95, 0]} fov={32} />
      <Ground color="#d9c9a8" />
      <Scooter3D position={[0, 0, 0]} rotationY={0} />
      <Rig3D position={[-0.1, 0.52, 0]} rotationY={Math.PI / 2} t={0.3} body={{ ...B_HAPID, mask: MASK_H }} pose={rideA(1.45, 1.5)} expr="happy" seed={1} />
      <Rig3D position={[-0.7, 0.62, 0]} rotationY={Math.PI / 2} t={0.3} body={{ ...B_ASTI, mask: MASK_A }} pose={rideA(1.45, 1.5)} expr="happy" seed={2} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 6, 6]} intensity={1.8} castShadow />
    </ThreeCanvas>
  </AbsoluteFill>
);

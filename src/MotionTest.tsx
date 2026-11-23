import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { ToonParams, ToonSprite } from "./three/objectsSoda";
import { SHOULDER_R, easeInOut, easeOut, freeze, ik2, lerp, smooth, walk } from "./three/anim";

export const MOTION_TEST_FRAMES = 150;
const bima: ToonParams = { expr: "nervous", shirt: "#3b82c4", pants: "#1e3a8a", hat: "short", hatColor: "#2a1a10", pattern: "flower", seed: 5, rim: { color: "rgba(110,185,255,0.65)", side: -1 }, tint: "rgba(10,24,60,0.16)" };

/** Bima tiptoes across, freezes when a floorboard creaks, then reaches for the remote. */
export const MotionTest: React.FC = () => {
  const f = useCurrentFrame();
  // 0-70 tiptoe, 70-84 freeze (creak), 84-100 move on, 100-150 reach
  const walking = f < 70 || (f >= 90 && f < 104);
  const x = f < 70 ? lerp(-2.4, 0.2, f / 70) : f < 90 ? 0.2 : lerp(0.2, 0.7, smooth((f - 90) / 14));
  const phase = f < 70 ? f / 70 * 2.2 : 2.2 + (f - 90) / 30;
  let p: Partial<ToonParams> = walking ? walk(phase, "tiptoe", 1) : {};
  let expr: ToonParams["expr"] = "nervous";
  if (f >= 70 && f < 90) {
    // creak: legs lock mid-step, body squashes (anticipation), eyes widen, then a slow turn of the head
    const k = (f - 70) / 20;
    p = { ...walk(0.28, "tiptoe", 1), ...freeze(k), kneeL: -1.1, legL: 0.25, bob: 22 };
    expr = "surprised";
  }
  if (f >= 104) {
    const k = easeInOut(Math.min(1, (f - 104) / 26));
    const [a1, a2] = ik2(SHOULDER_R, lerp(SHOULDER_R[0] + 20, 430, k), lerp(SHOULDER_R[1] + 150, 380, k));
    const grab = f > 134 ? easeOut((f - 134) / 8) : 0;
    p = { profile: false, armR: [a1, a2], armL: [-0.5 + 0.2 * Math.sin(f * 0.3), 0.4], lean: 0.12 * k, squash: 0.1 + 0.1 * Math.sin(k * Math.PI), legL: 0.2, legR: -0.1, kneeL: -0.5, kneeR: -0.2, bob: 0 };
    expr = grab > 0.5 ? "happy" : "nervous";
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#101a3a, #1b2a55)" }}>
      <ThreeCanvas width={1080} height={1080} camera={{ fov: 40, near: 0.05, far: 100, position: [0, 1.4, 6] }}>
        <CameraRig position={[0, 1.3, 6.2]} lookAt={[0, 1.2, 0]} fov={40} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[30, 20]} />
          <meshBasicMaterial color="#1a2347" />
        </mesh>
        <ToonSprite position={[x, 0, 0]} height={2.2} yaw={0} params={{ ...bima, expr, ...p }} />
        <mesh position={[0.9, 0.35, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.3]} />
          <meshBasicMaterial color="#3a2a1a" />
        </mesh>
        <mesh position={[0.9, 0.62, 0]}>
          <boxGeometry args={[0.22, 0.05, 0.1]} />
          <meshBasicMaterial color="#ff4d4d" />
        </mesh>
        <ambientLight intensity={1} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

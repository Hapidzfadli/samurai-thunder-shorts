import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import {
  BuburBowl3D,
  ClashAura3D,
  Kerupuk3D,
  KosanMorningStreet,
  LightningBolt3D,
  Spoon3D,
} from "./three/objectsBubur";
import { BAGAS_BUBUR, BANG_UDIN, RIKO_BUBUR } from "./SheetBubur";

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

const ThumbBuburStage: React.FC<{
  camPos: Vec3;
  rikoPos: Vec3;
  bagasPos: Vec3;
  bowlL: Vec3;
  bowlR: Vec3;
}> = ({ camPos, rikoPos, bagasPos, bowlL, bowlR }) => {
  const rikoP: BeanParams = {
    ...RIKO_BUBUR,
    expr: "angry",
    lean: 16,
    headTilt: 7,
    bob: 8,
    squash: 0.04,
    look: 0.85,
    footBend: true,
    legL: [34, -52],
    legR: [-28, -32],
    armL: [-72, -18],
    armR: [92, 24],
  };
  const bagasP: BeanParams = {
    ...BAGAS_BUBUR,
    expr: "laugh",
    lean: 16,
    headTilt: 7,
    bob: 8,
    squash: 0.04,
    look: 0.85,
    footBend: true,
    legL: [34, -52],
    legR: [-28, -32],
    armL: [-72, -18],
    armR: [92, 24],
  };
  const udinP: BeanParams = {
    ...BANG_UDIN,
    expr: "smug",
    armL: [-28, 62],
    armR: [64, 42],
    footBend: true,
  };

  const rHand = beanHandWorld(rikoP, "R", rikoPos, 2.08, camPos, false);
  const bHand = beanHandWorld(bagasP, "R", bagasPos, 2.08, camPos, true);

  return (
    <group>
      <KosanMorningStreet t={0.6} showCat dramatic={0.55} />
      <pointLight position={[-2.2, 2.6, 1.4]} color="#38bdf8" intensity={4.0} distance={10} />
      <pointLight position={[0.4, 2.6, 1.4]} color="#f59e0b" intensity={4.0} distance={10} />

      <BuburBowl3D pos={bowlL} scale={1.18} mixProgress={0} t={0.3} steam />
      <BuburBowl3D pos={bowlR} scale={1.18} mixProgress={1} t={0.8} steam />

      <BeanCard position={rikoPos} height={2.08} params={rikoP} />
      <BeanCard position={bagasPos} height={2.08} params={bagasP} flip />
      <BeanCard position={[1.42, 0.16, -2.95]} height={2.08} params={udinP} flip />

      <Spoon3D pos={[rHand[0], rHand[1] - 0.1, rHand[2] + 0.1]} rot={[0.1, 0.15, -0.78]} scale={1.8} glow="#38bdf8" />
      <Spoon3D pos={[bHand[0], bHand[1] - 0.1, bHand[2] + 0.1]} rot={[0.1, -0.15, 0.78]} scale={1.8} glow="#f59e0b" />

      <ClashAura3D pos={[-1.05, 2.15, 0.22]} scale={1.12} t={0.4} />
      <LightningBolt3D pos={[-1.55, 1.85, -0.1]} color="#38bdf8" scale={1.2} t={0.2} />
      <LightningBolt3D pos={[-0.65, 1.85, -0.1]} color="#f59e0b" scale={1.2} t={0.7} />

      <Kerupuk3D pos={[-2.05, 2.55, 1.15]} rot={[0.6, 0.4, 0.3]} scale={1.08} />
      <Kerupuk3D pos={[0.05, 2.68, 1.25]} rot={[-0.5, 0.8, -0.4]} scale={1.12} />
      <Kerupuk3D pos={[-1.05, 1.15, 1.45]} rot={[0.8, 0.2, 0.5]} scale={0.95} />
    </group>
  );
};

export const ThumbBuburShorts: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [-1.05, 2.1, 6.2];
  const look: Vec3 = [-1.05, 1.68, -0.35];
  return (
    <AbsoluteFill style={{ background: "#171434" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 44, near: 0.08, far: 140, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={44} roll={-3.5} />
        <color attach="background" args={["#1e1b4b"]} />
        <ThumbBuburStage
          camPos={camPos}
          rikoPos={[-1.92, 0.55, -0.12]}
          bagasPos={[-0.18, 0.55, -0.12]}
          bowlL={[-1.82, 1.045, 0.65]}
          bowlR={[-0.28, 1.045, 0.65]}
        />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(16,10,30,0.72) 0%, rgba(16,10,30,0.08) 28%, rgba(16,10,30,0) 55%, rgba(16,10,30,0.72) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 72, left: 42, right: 42, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 26px",
            borderRadius: 999,
            background: "rgba(24,14,34,0.92)",
            border: "4px solid #facc15",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 32,
            color: "#fef08a",
            marginBottom: 14,
          }}
        >
          KOS BU TINI EP. 2 · PERANG BUBUR!
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 122,
            lineHeight: 0.96,
            color: "#38bdf8",
            WebkitTextStroke: "13px #170c22",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #170c22",
          }}
        >
          DIADUK VS
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 112,
            lineHeight: 0.98,
            color: "#fde047",
            WebkitTextStroke: "13px #170c22",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #170c22",
          }}
        >
          TIDAK DIADUK!
        </div>
      </div>
      <div style={{ position: "absolute", top: 1550, left: 48, right: 48, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
            border: "7px solid #fef08a",
            borderRadius: 999,
            padding: "12px 36px",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 38,
            color: "#ffffff",
            boxShadow: "0 14px 36px rgba(0,0,0,0.6)",
          }}
        >
          KAMU TIM MANA?! VOTE DI KOMEN!
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ThumbBuburYoutube: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [-1.05, 1.98, 4.95];
  const look: Vec3 = [-1.05, 1.55, -0.45];
  return (
    <AbsoluteFill style={{ background: "#171434" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 43, near: 0.08, far: 140, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={43} roll={-2.5} />
        <color attach="background" args={["#1e1b4b"]} />
        <ThumbBuburStage
          camPos={camPos}
          rikoPos={[-2.25, 0.45, -0.15]}
          bagasPos={[0.15, 0.45, -0.15]}
          bowlL={[-1.88, 1.045, 0.58]}
          bowlR={[-0.22, 1.045, 0.58]}
        />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(16,10,30,0.68) 0%, rgba(16,10,30,0.05) 35%, rgba(16,10,30,0.05) 70%, rgba(16,10,30,0.68) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 44, left: 60, right: 60, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 28px",
            borderRadius: 999,
            background: "rgba(24,14,34,0.92)",
            border: "4px solid #facc15",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 30,
            color: "#fef08a",
            marginBottom: 10,
          }}
        >
          KOS BU TINI EP. 2 · PERANG BUBUR AYAM!
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 118,
            lineHeight: 0.96,
            color: "#fde047",
            WebkitTextStroke: "13px #170c22",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #170c22",
          }}
        >
          DIADUK VS TIDAK DIADUK!
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 42, left: 60, right: 60, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
            border: "7px solid #fef08a",
            borderRadius: 999,
            padding: "10px 38px",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 40,
            color: "#ffffff",
            boxShadow: "0 14px 36px rgba(0,0,0,0.6)",
          }}
        >
          TIM MANA YANG MENANG?! VOTE DI KOMENTAR!
        </div>
      </div>
    </AbsoluteFill>
  );
};


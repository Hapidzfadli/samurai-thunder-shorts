import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import {
  GorenganBasket3D,
  HauntedMansionYard,
  PisangGoreng3D,
  SpookyAura3D,
  ThermosCoffeeSet3D,
} from "./three/objectsHoror";
import { BAGAS_HOROR, MAS_POCONG, MBAK_KUNTI, RIKO_HOROR } from "./SheetHoror";

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

const ThumbHororStage: React.FC<{
  camPos: Vec3;
  rikoPos: Vec3;
  bagasPos: Vec3;
  pocongPos: Vec3;
  kuntiPos: Vec3;
}> = ({ camPos, rikoPos, bagasPos, pocongPos, kuntiPos }) => {
  const rikoP: BeanParams = {
    ...RIKO_HOROR,
    expr: "shock",
    sweat: true,
    lean: -12,
    armL: [-88, -22],
    armR: [84, 24],
    footBend: true,
  };
  const bagasP: BeanParams = {
    ...BAGAS_HOROR,
    expr: "laugh",
    lean: 6,
    armL: [-28, 48],
    armR: [76, 38],
    footBend: true,
  };
  const pocongP: BeanParams = {
    ...MAS_POCONG,
    expr: "happy",
    lean: 10,
    tired: true,
  };
  const kuntiP: BeanParams = {
    ...MBAK_KUNTI,
    expr: "happy",
    armL: [-42, 62],
    armR: [68, 56],
    lean: 8,
    tired: true,
  };
  const bHand = beanHandWorld(bagasP, "R", bagasPos, 2.02, camPos, false);
  const kHand = beanHandWorld(kuntiP, "R", kuntiPos, 2.08, camPos, true);

  return (
    <group>
      <HauntedMansionYard t={0.6} cozy={0.85} showCat hideGate />
      <pointLight position={[-1.5, 2.5, 1.2]} color="#38bdf8" intensity={3.2} distance={10} />
      <pointLight position={[1.2, 2.2, 1.4]} color="#fbbf24" intensity={3.6} distance={10} />

      <BeanCard position={rikoPos} height={2.02} params={rikoP} />
      <BeanCard position={bagasPos} height={2.02} params={bagasP} />
      <BeanCard position={pocongPos} height={2.12} params={pocongP} flip />
      <BeanCard position={kuntiPos} height={2.12} params={kuntiP} flip />

      <SpookyAura3D pos={[pocongPos[0], 0.15, pocongPos[2] - 0.25]} scale={0.95} t={0.4} />
      <GorenganBasket3D pos={[bHand[0] + 0.08, bHand[1] - 0.04, bHand[2] + 0.18]} scale={1.08} t={0.4} steam />
      <ThermosCoffeeSet3D pos={[-0.14, 0.725, -0.22]} scale={1.02} t={0.4} />
      <PisangGoreng3D pos={[kHand[0], kHand[1] + 0.04, kHand[2] + 0.12]} rot={[0.2, 0.3, 0.15]} scale={1.05} />
    </group>
  );
};

export const ThumbHororShorts: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [-0.25, 2.05, 6.45];
  const look: Vec3 = [-0.25, 1.55, -0.65];
  return (
    <AbsoluteFill style={{ background: "#0f122a" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 44, near: 0.08, far: 140, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={44} roll={-3.0} />
        <color attach="background" args={["#0f122a"]} />
        <ThumbHororStage
          camPos={camPos}
          rikoPos={[-1.45, 0, 0.35]}
          bagasPos={[-0.45, 0, 0.65]}
          pocongPos={[0.52, 0.18, -0.75]}
          kuntiPos={[1.28, 0.30, -0.15]}
        />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,26,0.74) 0%, rgba(10,8,26,0.08) 28%, rgba(10,8,26,0) 56%, rgba(10,8,26,0.74) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 68, left: 40, right: 40, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 26px",
            borderRadius: 999,
            background: "rgba(15,18,36,0.92)",
            border: "4px solid #38bdf8",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 32,
            color: "#fef08a",
            marginBottom: 14,
          }}
        >
          KOS BU TINI EP. 3 · SPESIAL MALAM JUMAT
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 124,
            lineHeight: 0.96,
            color: "#38bdf8",
            WebkitTextStroke: "13px #120a20",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #120a20",
          }}
        >
          NIAT UJI NYALI
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 108,
            lineHeight: 0.98,
            color: "#fde047",
            WebkitTextStroke: "13px #120a20",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #120a20",
          }}
        >
          HANTUNYA CURHAT?!
        </div>
      </div>
      <div style={{ position: "absolute", top: 1550, left: 48, right: 48, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "linear-gradient(180deg, #f59e0b 0%, #b45309 100%)",
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
          MALAH MINTA PISANG GORENG!! 😭🍌
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ThumbHororYoutube: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [-0.25, 2.02, 5.45];
  const look: Vec3 = [-0.15, 1.55, -0.75];
  return (
    <AbsoluteFill style={{ background: "#0f122a" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 44, near: 0.08, far: 140, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={44} roll={-2.5} />
        <color attach="background" args={["#0f122a"]} />
        <ThumbHororStage
          camPos={camPos}
          rikoPos={[-1.95, 0, 0.35]}
          bagasPos={[-0.75, 0, 0.65]}
          pocongPos={[0.62, 0.18, -0.65]}
          kuntiPos={[1.75, 0.28, -0.15]}
        />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,26,0.70) 0%, rgba(10,8,26,0.06) 34%, rgba(10,8,26,0.06) 70%, rgba(10,8,26,0.70) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 40, left: 60, right: 60, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 28px",
            borderRadius: 999,
            background: "rgba(15,18,36,0.92)",
            border: "4px solid #38bdf8",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 30,
            color: "#fef08a",
            marginBottom: 10,
          }}
        >
          KOS BU TINI EP. 3 · UJI NYALI RUMAH KOSONG!
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 112,
            lineHeight: 0.96,
            color: "#fde047",
            WebkitTextStroke: "13px #120a20",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #120a20",
          }}
        >
          HANTUNYA CURHAT & MINTA GORENGAN!
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 42, left: 60, right: 60, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "linear-gradient(180deg, #7c3aed 0%, #4c1d95 100%)",
            border: "7px solid #fef08a",
            borderRadius: 999,
            padding: "10px 38px",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 38,
            color: "#ffffff",
            boxShadow: "0 14px 36px rgba(0,0,0,0.6)",
          }}
        >
          KABUR 🏃 ATAU AJAK NGOPI ☕? VOTE DI KOMENTAR!
        </div>
      </div>
    </AbsoluteFill>
  );
};

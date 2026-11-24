import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import {
  BesekPindang3D,
  IkanTongkol3D,
  KamarKosRiko,
  OrenHero3D,
  SapuIjuk3D,
} from "./three/objectsRazia";
import { ARA, BAGAS_RAZIA, BU_TINI_RAZIA, RIKO_RAZIA } from "./SheetRazia";

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

const ThumbRaziaStage: React.FC<{
  camPos: Vec3;
  rikoPos: Vec3;
  bagasPos: Vec3;
  tiniPos: Vec3;
  araPos: Vec3;
  orenPos: Vec3;
  orenScale?: number;
}> = ({ camPos, rikoPos, bagasPos, tiniPos, araPos, orenPos, orenScale = 1.65 }) => {
  const rikoP: BeanParams = {
    ...RIKO_RAZIA,
    expr: "shock",
    sweat: true,
    lean: -10,
    armL: [-86, -24],
    armR: [82, 26],
    footBend: true,
  };
  const bagasP: BeanParams = {
    ...BAGAS_RAZIA,
    expr: "worried",
    sweat: true,
    lean: -6,
    armL: [-42, 48],
    armR: [56, 36],
    footBend: true,
  };
  const tiniP: BeanParams = {
    ...BU_TINI_RAZIA,
    expr: "laugh",
    lean: 8,
    armL: [-38, 66],
    armR: [68, 52],
    footBend: true,
  };
  const araP: BeanParams = {
    ...ARA,
    expr: "happy",
    lean: 6,
    armL: [-28, 38],
    armR: [115, 22],
    footBend: true,
  };
  const tiniHand = beanHandWorld(tiniP, "L", tiniPos, 2.02, camPos, true);

  return (
    <group>
      <KamarKosRiko t={0.7} cozy={0.85} sun={1.25} doorOpen={0.82} lemariL={0.28} hideFront />
      <pointLight position={[0, 2.2, 2.6]} color="#fde68a" intensity={3.8} distance={9} />
      <pointLight position={[-1.4, 2.1, 1.5]} color="#fb923c" intensity={2.6} distance={8} />

      <BeanCard position={rikoPos} height={1.92} params={rikoP} />
      <BeanCard position={bagasPos} height={1.88} params={bagasP} />
      <BeanCard position={tiniPos} height={1.96} params={tiniP} flip />
      <BeanCard position={araPos} height={1.86} params={araP} flip />

      {/* Hero Kucing Oren 3D mata berbinar ala Puss in Boots! */}
      <OrenHero3D pos={orenPos} rot={[0, -0.05, 0]} scale={orenScale} t={0.65} pose="sit" sparkle={1} meow={0.55} tailAmp={0.5} />

      {/* Besek pindang di tangan Bu Tini, ikan tongkol di karpet, sapu ijuk tergeletak di lantai! */}
      <BesekPindang3D pos={[tiniHand[0] - 0.05, tiniHand[1] - 0.06, tiniHand[2] + 0.14]} rot={[0.1, -0.35, 0]} scale={1.1} lid={1} />
      <IkanTongkol3D pos={[-0.78, 0.01, 0.95]} scale={1.1} t={0.7} steam />
      <SapuIjuk3D pos={[1.18, 0.08, 1.05]} rot={[Math.PI / 2, 0.4, 0.85]} scale={0.95} />
    </group>
  );
};

export const ThumbRaziaShorts: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [0.0, 1.56, 4.35];
  const look: Vec3 = [0.0, 1.02, -0.9];
  return (
    <AbsoluteFill style={{ background: "#291810" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 56, near: 0.05, far: 80, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={56} roll={-1.8} />
        <color attach="background" args={["#291810"]} />
        <ThumbRaziaStage
          camPos={camPos}
          rikoPos={[-0.92, 0, -0.35]}
          bagasPos={[-1.45, 0, -1.15]}
          tiniPos={[0.88, 0, -0.32]}
          araPos={[1.45, 0, -1.12]}
          orenPos={[0.0, 0.01, 1.15]}
          orenScale={1.75}
        />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(28,12,4,0.78) 0%, rgba(28,12,4,0.08) 28%, rgba(28,12,4,0) 58%, rgba(28,12,4,0.78) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 58, left: 36, right: 36, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 26px",
            borderRadius: 999,
            background: "rgba(124,45,18,0.95)",
            border: "4px solid #fde047",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 32,
            color: "#fef08a",
            marginBottom: 14,
            boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
          }}
        >
          KOS BU TINI EP. 4 · RAZIA MENDADAK!
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 120,
            lineHeight: 0.95,
            color: "#fb923c",
            WebkitTextStroke: "13px #1c0f08",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #1c0f08",
          }}
        >
          RAZIA KUCING OREN
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 98,
            lineHeight: 0.98,
            color: "#fde047",
            WebkitTextStroke: "13px #1c0f08",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #1c0f08",
          }}
        >
          MALAH REBUTAN NGELUS?!
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 72, left: 48, right: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            background: "#dc2626",
            border: "5px solid #ffffff",
            borderRadius: 20,
            padding: "12px 24px",
            fontFamily: FONT_HEAD,
            fontSize: 40,
            color: "#ffffff",
            transform: "rotate(-3deg)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          🚫 DILARANG HEWAN!
        </div>
        <div
          style={{
            background: "#f97316",
            border: "5px solid #ffffff",
            borderRadius: 20,
            padding: "12px 24px",
            fontFamily: FONT_HEAD,
            fontSize: 40,
            color: "#ffffff",
            transform: "rotate(3deg)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          🐱 MEEEOOW~ ✨
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ThumbRaziaYoutube: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [0.0, 1.48, 3.85];
  const look: Vec3 = [0.0, 1.02, -0.85];
  return (
    <AbsoluteFill style={{ background: "#291810" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 48, near: 0.05, far: 80, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={48} roll={-1.0} />
        <color attach="background" args={["#291810"]} />
        <ThumbRaziaStage
          camPos={camPos}
          rikoPos={[-1.12, 0, -0.45]}
          bagasPos={[-1.82, 0, -1.05]}
          tiniPos={[1.05, 0, -0.42]}
          araPos={[1.82, 0, -1.02]}
          orenPos={[0.0, 0.01, 1.15]}
          orenScale={1.58}
        />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(28,12,4,0.72) 0%, rgba(28,12,4,0.04) 32%, rgba(28,12,4,0) 64%, rgba(28,12,4,0.72) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 20, left: 30, right: 30, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              display: "inline-block",
              padding: "5px 16px",
              borderRadius: 999,
              background: "#dc2626",
              border: "3px solid #fde047",
              fontFamily: FONT_BODY,
              fontWeight: 900,
              fontSize: 21,
              color: "#fef08a",
              marginBottom: 6,
            }}
          >
            KOS BU TINI EP. 4 · 3D ANIMASI KOMEDI
          </div>
          <div
            style={{
              fontFamily: FONT_HEAD,
              fontSize: 72,
              lineHeight: 0.94,
              color: "#fb923c",
              WebkitTextStroke: "8px #1c0f08",
              paintOrder: "stroke fill",
              textShadow: "0 6px 0 #1c0f08",
            }}
          >
            RAZIA KAMAR KOS MENDADAK!
          </div>
          <div
            style={{
              fontFamily: FONT_HEAD,
              fontSize: 58,
              lineHeight: 0.98,
              color: "#fde047",
              WebkitTextStroke: "8px #1c0f08",
              paintOrder: "stroke fill",
              textShadow: "0 6px 0 #1c0f08",
            }}
          >
            MALAH REBUTAN NGELUS OREN?!
          </div>
        </div>
        <div
          style={{
            background: "#f97316",
            border: "4px solid #ffffff",
            borderRadius: 18,
            padding: "10px 22px",
            fontFamily: FONT_HEAD,
            fontSize: 34,
            color: "#ffffff",
            transform: "rotate(3deg)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
            whiteSpace: "nowrap",
          }}
        >
          🐱 MEEEOOW~ ✨
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import { InkBox } from "./three/objectsMolase";
import {
  Gayung3D,
  KosanFridge3D,
  KosanKitchenCounter,
  NoodlePacket3D,
  RealisticFlame3D,
  WallClock02,
  WetTowel3D,
  kitchenTileTex,
} from "./three/objectsMie";
import { BU_TINI, RIKO } from "./SheetMie";

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

const ThumbKitchenBackdrop: React.FC<{
  camPos: Vec3;
  rikoPos: Vec3;
  tiniPos: Vec3;
  clockPos: Vec3;
  packetPos: Vec3;
  rikoHeight?: number;
  tiniHeight?: number;
}> = ({ camPos, rikoPos, tiniPos, clockPos, packetPos, rikoHeight = 2.18, tiniHeight = 2.12 }) => {
  const floorTex = React.useMemo(() => kitchenTileTex("#e8dfd1", "#d9cebc", "#9c8d7a"), []);

  const rikoP: BeanParams = {
    ...RIKO,
    expr: "scared",
    sweat: true,
    lean: -14,
    headTilt: -10,
    bob: 8,
    squash: 0.04,
    look: 0.85,
    footBend: true,
    legL: [18, -32],
    legR: [-14, -24],
    armL: [-94, -36],
    armR: [82, 34],
  };
  const tiniP: BeanParams = {
    ...BU_TINI,
    expr: "angry",
    lean: 12,
    headTilt: 6,
    bob: 4,
    squash: 0.02,
    look: -0.75,
    footBend: true,
    legL: [12, -14],
    legR: [-12, -12],
    armL: [-34, 48],
    armR: [96, 26],
  };

  const rikoHand = beanHandWorld(rikoP, "R", rikoPos, rikoHeight, camPos, false);
  const tiniHand = beanHandWorld(tiniP, "R", tiniPos, tiniHeight, camPos, true);

  return (
    <group>
      {/* Floor & Enclosed Warm-Lit Kosan Kitchen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial map={floorTex} roughness={0.95} />
      </mesh>
      <InkBox pos={[0, 3.0, -2.55]} size={[14, 6.2, 0.25]} color="#f5ebd8" ink={0.05} />
      <InkBox pos={[-5.4, 3.0, 1.5]} size={[0.25, 6.2, 9.5]} color="#e8dbc4" ink={0.05} />
      <InkBox pos={[5.4, 3.0, 1.5]} size={[0.25, 6.2, 9.5]} color="#e8dbc4" ink={0.05} />
      <InkBox pos={[0, 5.1, 0.5]} size={[13, 0.25, 8.5]} color="#dcd4c6" ink={0.04} />
      <InkBox pos={[0, 4.92, -0.4]} size={[2.2, 0.12, 0.18]} color="#ffffff" emissive="#fffbeb" ink={0.02} />

      {/* Shared Kosan Fridge & Scorched Stove Counter with Tossing Wok & Towering Flames */}
      <KosanFridge3D pos={[-3.1, 0, -1.65]} />
      <KosanKitchenCounter pos={[0.25, 0, -1.65]} burnerOn scorchLevel={0.95} fireScale={1.35} wokToss={0.62} t={1.15} />
      {/* Extra towering sharp flame spire licking the blackened cabinet */}
      <RealisticFlame3D pos={[1.04, 2.08, -1.62]} scale={0.72} heightMul={1.5} t={1.9} seed={14} />

      {/* Iconic 02:00 Red Wall Clock */}
      <WallClock02 pos={clockPos} hour={2} minute={0} />

      {/* Terrified Riko clutching Blue Gayung + Flying Instant Noodle Packet */}
      <BeanCard position={rikoPos} height={rikoHeight} params={rikoP} />
      <Gayung3D pos={rikoHand} rot={[0.15, 0.2, -0.65]} scale={1.08} hasWater={false} />
      <NoodlePacket3D pos={packetPos} rot={[0.15, -0.18, -0.28]} scale={0.84} />

      {/* Furious Bu Tini bursting in with Wet Towel */}
      <BeanCard position={tiniPos} height={tiniHeight} flip params={tiniP} />
      <WetTowel3D pos={tiniHand} rot={[0.32, -0.32, -0.35]} scale={0.76} />

      {/* Dramatic Firelight & Rim Lighting */}
      <hemisphereLight args={["#ffdfb8", "#42202e", 1.18]} />
      <directionalLight position={[2.5, 6.2, 6.5]} intensity={1.48} color="#fff0d4" castShadow />
      <pointLight position={[1.0, 2.2, -0.6]} color="#ff7a1a" intensity={7.5} distance={10} />
      <pointLight position={[-1.5, 2.0, 2.2]} color="#60a5fa" intensity={1.8} distance={7} />
    </group>
  );
};

/* Radial comic speed lines for extra thumbnail punch */
const SpeedLines: React.FC<{ cx?: string; cy?: string; opacity?: number }> = ({ cx = "54%", cy = "54%", opacity = 0.22 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      opacity,
      background: `repeating-conic-gradient(from 0deg at ${cx} ${cy}, rgba(255,244,180,0.45) 0deg 2deg, transparent 2deg 11deg)`,
      WebkitMaskImage: `radial-gradient(circle at ${cx} ${cy}, transparent 30%, black 75%)`,
      maskImage: `radial-gradient(circle at ${cx} ${cy}, transparent 30%, black 75%)`,
    }}
  />
);

/* ================================================================== */
/* THUMBNAIL 1: VERTICAL 9:16 (YOUTUBE SHORTS / TIKTOK / REELS)       */
/* ================================================================== */
export const ThumbMieShorts: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [0.05, 2.1, 7.65];
  const look: Vec3 = [0.18, 1.88, -0.85];

  return (
    <AbsoluteFill style={{ background: "#1b1018" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 44, near: 0.08, far: 120, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={44} roll={-4.5} />
        <color attach="background" args={["#1b1018"]} />
        <ThumbKitchenBackdrop
          camPos={camPos}
          rikoPos={[-0.78, 0, 0.95]}
          tiniPos={[1.22, 0, 0.55]}
          clockPos={[-1.08, 2.68, -2.25]}
          packetPos={[0.02, 1.28, 2.05]}
          rikoHeight={2.1}
          tiniHeight={2.02}
        />
      </ThreeCanvas>

      {/* Warm fiery vignette + subtle top/bottom contrast scrims */}
      <SpeedLines cx="54%" cy="54%" opacity={0.22} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(16,6,18,0.72) 0%, rgba(16,6,18,0.18) 28%, rgba(16,6,18,0) 50%, rgba(16,6,18,0.12) 76%, rgba(16,6,18,0.74) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: "radial-gradient(circle at 58% 48%, rgba(255,140,35,0.55) 0%, rgba(255,60,20,0.12) 60%, rgba(15,10,30,0.45) 100%)",
        }}
      />

      {/* Top Viral Hook Block (Clean Center-Safe Typography) */}
      <div style={{ position: "absolute", top: 76, left: 48, right: 48, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "9px 28px",
            borderRadius: 999,
            background: "rgba(24,10,24,0.92)",
            border: "4px solid #facc15",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: 2,
            color: "#fef08a",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            marginBottom: 18,
          }}
        >
          02:00 WIB · DAPUR KOS
        </div>

        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 132,
            lineHeight: 0.96,
            letterSpacing: 2,
            color: "#fde047",
            WebkitTextStroke: "14px #1f0c1e",
            paintOrder: "stroke fill",
            textShadow: "0 12px 0 #1f0c1e, 0 22px 44px rgba(0,0,0,0.72)",
          }}
        >
          MASAK MIE
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 118,
            lineHeight: 0.98,
            letterSpacing: 2,
            color: "#ffffff",
            WebkitTextStroke: "13px #1f0c1e",
            paintOrder: "stroke fill",
            textShadow: "0 12px 0 #1f0c1e, 0 20px 40px rgba(0,0,0,0.7)",
            marginTop: 4,
          }}
        >
          JAM 2 PAGI
        </div>

        {/* Fiery Red Tilted Punch Banner */}
        <div style={{ marginTop: 22, transform: "rotate(-3.5deg)" }}>
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
              border: "8px solid #fef08a",
              borderRadius: 24,
              padding: "12px 38px",
              fontFamily: FONT_HEAD,
              fontSize: 74,
              letterSpacing: 2,
              color: "#ffffff",
              WebkitTextStroke: "6px #3b0712",
              paintOrder: "stroke fill",
              boxShadow: "0 14px 36px rgba(0,0,0,0.65)",
            }}
          >
            MALAH KEBAKARAN?!
          </div>
        </div>
      </div>

      {/* Bottom Safe-Zone Curiosity Pill (well above YouTube Shorts UI chrome) */}
      <div style={{ position: "absolute", top: 1545, left: 60, right: 60, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "rgba(255,250,235,0.97)",
            border: "7px solid #ea580c",
            borderRadius: 999,
            padding: "12px 36px",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 40,
            color: "#1f0c1e",
            boxShadow: "0 14px 36px rgba(0,0,0,0.55)",
          }}
        >
          TONTON ENDINGNYA — BIKIN NGAKAK!
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* THUMBNAIL 2: LANDSCAPE 16:9 (YOUTUBE FEED / COMMUNITY / DESKTOP)   */
/* ================================================================== */
export const ThumbMieYoutube: React.FC = () => {
  const { width, height } = useVideoConfig();
  const camPos: Vec3 = [-0.15, 1.95, 5.25];
  const look: Vec3 = [0.25, 1.72, -1.0];

  return (
    <AbsoluteFill style={{ background: "#1b1018" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 43, near: 0.08, far: 120, position: camPos }}>
        <ThumbRig pos={camPos} look={look} fov={43} roll={-3.5} />
        <color attach="background" args={["#1b1018"]} />
        <ThumbKitchenBackdrop
          camPos={camPos}
          rikoPos={[-1.62, 0, 1.02]}
          tiniPos={[2.35, 0, 0.55]}
          clockPos={[2.55, 2.88, -2.25]}
          packetPos={[0.02, 1.24, 1.92]}
          rikoHeight={2.22}
          tiniHeight={2.15}
        />
      </ThreeCanvas>

      <SpeedLines cx="52%" cy="52%" opacity={0.22} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(16,6,18,0.68) 0%, rgba(16,6,18,0.12) 44%, rgba(16,6,18,0.08) 72%, rgba(16,6,18,0.52) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          mixBlendMode: "soft-light",
          background: "radial-gradient(circle at 54% 48%, rgba(255,140,35,0.52) 0%, rgba(255,60,20,0.12) 60%, rgba(15,10,30,0.45) 100%)",
        }}
      />

      {/* Bold Top-Left Viral Stack */}
      <div style={{ position: "absolute", top: 52, left: 60 }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 24px",
            borderRadius: 999,
            background: "rgba(24,10,24,0.92)",
            border: "4px solid #facc15",
            fontFamily: FONT_BODY,
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: 1.5,
            color: "#fef08a",
            marginBottom: 12,
          }}
        >
          02:00 WIB · KISAH ANAK KOS
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 124,
            lineHeight: 0.94,
            letterSpacing: 2,
            color: "#fde047",
            WebkitTextStroke: "13px #1f0c1e",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #1f0c1e, 0 18px 36px rgba(0,0,0,0.72)",
          }}
        >
          MASAK MIE
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontSize: 110,
            lineHeight: 0.96,
            letterSpacing: 2,
            color: "#ffffff",
            WebkitTextStroke: "12px #1f0c1e",
            paintOrder: "stroke fill",
            textShadow: "0 10px 0 #1f0c1e, 0 18px 36px rgba(0,0,0,0.7)",
          }}
        >
          JAM 2 PAGI
        </div>
      </div>

      {/* Bottom-Left Fiery Stamp Banner */}
      <div style={{ position: "absolute", bottom: 46, left: 56, transform: "rotate(-3deg)" }}>
        <div
          style={{
            display: "inline-block",
            background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
            border: "8px solid #fef08a",
            borderRadius: 24,
            padding: "11px 32px",
            fontFamily: FONT_HEAD,
            fontSize: 68,
            letterSpacing: 2,
            color: "#ffffff",
            WebkitTextStroke: "6px #3b0712",
            paintOrder: "stroke fill",
            boxShadow: "0 14px 36px rgba(0,0,0,0.68)",
          }}
        >
          KOSAN KEBAKARAN?!
        </div>
      </div>
    </AbsoluteFill>
  );
};

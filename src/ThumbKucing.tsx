/**
 * Thumbnail Resmi 16:9 (1920x1080) & 9:16 (1080x1920)
 * Menggunakan KARAKTER & LATAR 3D BLENDER YANG 100% SAMA dengan video:
 *   - Latar 3D Blender: L3_TamanWashington (kucing_cia.glb — Sunset, Capitol, Pohon Gugur, Gerobak Ikan, Taksi Kuning)
 *   - Karakter 2D Asli: AgentBeanCard (Dodi & Ara) + CatCard (Agen Meong) dengan pose bebas & ekspresif
 *   - Efek 3D Asli: GrilledFishSmoke, SignalWaveArcs, FloatingDollarRain
 *   - Tipografi Thumbnail Viral siap upload YouTube / Shorts / TikTok / Reels!
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Composition, registerRoot, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useLoadedKucingGlb } from "./scenesKucing";
import {
  AgentBeanCard,
  CatCard,
  FloatingDollarRain,
  GrilledFishSmoke,
  SignalWaveArcs,
} from "./three/objectsKucing";
import { ARA_BASE, DODI_BASE } from "./SheetKucing";

type Vec3 = [number, number, number];

const ARA_CIA = { ...ARA_BASE, skirt: "#5c5042", batik: "#5c5042" };

const ThumbCamera: React.FC<{ pos: Vec3; target: Vec3; fov: number; rollDeg?: number }> = ({
  pos,
  target,
  fov,
  rollDeg = 0,
}) => {
  const { camera } = useThree();
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(target[0], target[1], target[2]);
  if (Math.abs(rollDeg) > 0.001) camera.rotateZ((rollDeg * Math.PI) / 180);
  const pc = camera as THREE.PerspectiveCamera;
  pc.fov = fov;
  pc.updateProjectionMatrix();
  return null;
};

const ThumbSkyDome: React.FC<{ center: Vec3 }> = ({ center }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          cTop: { value: new THREE.Color("#1f3b78") },
          cMid: { value: new THREE.Color("#e87b4f") },
          cBot: { value: new THREE.Color("#ffcf78") },
        },
        vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 cTop, cMid, cBot; varying vec3 vPos;
          void main(){
            float h = clamp((normalize(vPos).y + 0.06) / 0.72, 0.0, 1.0);
            vec3 col = h < 0.38 ? mix(cBot, cMid, h / 0.38) : mix(cMid, cTop, (h - 0.38) / 0.62);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    []
  );
  return (
    <mesh position={center} material={mat}>
      <sphereGeometry args={[55, 24, 16]} />
    </mesh>
  );
};

const ThumbWorld3D: React.FC<{ sceneRoot: THREE.Group; aspect: "16x9" | "9x16" }> = ({ sceneRoot, aspect }) => {
  // Only show L3_TamanWashington (Washington D.C. sunset street + park + fish cart + yellow taxi)
  for (const child of sceneRoot.children) {
    const n = child.name;
    child.visible = n.startsWith("L3_") || n === "ANIM_YellowTaxi" || n === "ANIM_FishCart";
  }

  // Pose Yellow Taxi screeching on the crosswalk in front-left!
  const yellowTaxi = sceneRoot.getObjectByName("ANIM_YellowTaxi");
  if (yellowTaxi) {
    if (aspect === "16x9") {
      yellowTaxi.position.set(799.2, 0, 2.55);
      yellowTaxi.rotation.set(0, 0.16, -0.09);
    } else {
      yellowTaxi.position.set(800.4, 0, 2.65);
      yellowTaxi.rotation.set(0, 0.1, -0.1);
    }
  }

  const fishCart = sceneRoot.getObjectByName("ANIM_FishCart");
  if (fishCart) {
    fishCart.rotation.set(0, 0, 0.03);
  }

  const isWide = aspect === "16x9";

  // Camera framing tailored per aspect ratio so characters + 3D set + title text breathe cleanly!
  const camPos: Vec3 = isWide ? [802.35, 2.02, 5.15] : [802.85, 2.08, 5.75];
  const camTgt: Vec3 = isWide ? [802.75, 1.56, -1.4] : [803.05, 1.85, -1.45];
  const camFov = isWide ? 42 : 47;
  const camRoll = isWide ? -1.5 : -1.8;

  return (
    <>
      <ThumbCamera pos={camPos} target={camTgt} fov={camFov} rollDeg={camRoll} />
      <ThumbSkyDome center={[800, 0, 0]} />
      <ambientLight intensity={1.12} color="#fff7eb" />
      <directionalLight position={[814, 18, 14]} intensity={1.45} color="#ffe4b8" />
      <directionalLight position={[790, 10, -8]} intensity={0.62} color="#b2d4ff" />

      <primitive object={sceneRoot} />

      {/* HERO AGEN MEONG sitting proudly on the 3D Grilled Fish Cart, munching fish with CIA shades! */}
      <CatCard
        position={isWide ? [804.22, 1.48, -1.62] : [804.05, 1.48, -1.58]}
        height={isWide ? 1.42 : 1.34}
        facing={-1}
        opts={{
          expr: "makan",
          t: 1.4,
          shades: true,
          shadesSlip: 0.12,
          antenna: true,
          vest: true,
          fishInMouth: true,
        }}
      />
      <SignalWaveArcs from={isWide ? [804.22, 2.55, -1.62] : [804.05, 2.5, -1.58]} phase={1.6} color="#53dcff" />
      <GrilledFishSmoke position={[804.35, 1.42, -1.85]} phase={2.2} />

      {/* DODI panicking dynamically CLEAR of blue mailbox (mailbox is at x~801.7, z~-0.6)! */}
      <AgentBeanCard
        position={isWide ? [802.52, 0.18, 0.22] : [802.32, 0.18, 0.18]}
        height={isWide ? 1.92 : 1.88}
        facing={1}
        params={{
          ...DODI_BASE,
          expr: "shock",
          mouthOpen: 0.95,
          armL: [-138, -22],
          armR: [142, 18],
          headTilt: -7,
          sweat: true,
          squash: 0.05,
        }}
        extra={{
          shades: true,
          shadesSlip: 1.0,
          earpiece: true,
          fx: "shock",
          fxPhase: 1.2,
        }}
      />

      {/* ARA shocked holding her un-mirrored IKAN box CLEAR of headline text! */}
      <AgentBeanCard
        position={isWide ? [800.92, 0.18, 0.15] : [803.28, 0.18, -0.78]}
        height={isWide ? 1.72 : 1.68}
        facing={isWide ? 1 : -1}
        params={{
          ...ARA_CIA,
          expr: "scared",
          mouthOpen: 0.78,
          armL: [-115, 20],
          armR: [105, -24],
          headTilt: 7,
          sweat: true,
        }}
        extra={{
          fishBox: true,
          fx: "sweat",
          fxPhase: 0.9,
        }}
      />

      {/* Crisp flying 3D green dollar bills ($20,000,000 flying away!) */}
      <FloatingDollarRain center={[803.1, 2.1, -0.3]} phase={1.8} />
    </>
  );
};

const KucingThumbBase: React.FC<{ aspect: "16x9" | "9x16" }> = ({ aspect }) => {
  const { width, height } = useVideoConfig();
  const sceneRoot = useLoadedKucingGlb("models/kucing_cia.glb");
  const isWide = aspect === "16x9";

  return (
    <AbsoluteFill style={{ backgroundColor: "#141a24" }}>
      {sceneRoot && (
        <ThreeCanvas width={width} height={height} shadows={false} dpr={1} camera={{ near: 0.1, far: 400 }}>
          <ThumbWorld3D sceneRoot={sceneRoot} aspect={aspect} />
        </ThreeCanvas>
      )}

      {/* Subtle cinematic edge contrast so typography pops at small thumbnail size */}
      <AbsoluteFill
        style={{
          background: isWide
            ? "linear-gradient(112deg, rgba(10,14,26,0.62) 0%, rgba(10,14,26,0.22) 34%, rgba(10,14,26,0.0) 58%, rgba(10,14,26,0.12) 100%)"
            : "linear-gradient(180deg, rgba(10,14,26,0.68) 0%, rgba(10,14,26,0.26) 26%, rgba(10,14,26,0.0) 50%, rgba(10,14,26,0.34) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ========== VIRAL YOUTUBE / SHORTS TYPOGRAPHY OVERLAY ========== */}
      {isWide ? (
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            pointerEvents: "none",
          }}
        >
          {/* Top CIA Stamp Pill */}
          <div
            style={{
              background: "#161b29",
              color: "#53dcff",
              border: "4px solid #53dcff",
              borderRadius: 999,
              padding: "6px 22px",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 2,
              marginBottom: 10,
              boxShadow: "0 7px 0 rgba(0,0,0,0.65)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            KISAH NYATA CIA · 1966
          </div>

          {/* Line 1: KUCING CIA */}
          <div
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 950,
              fontSize: 112,
              lineHeight: 0.94,
              color: "#ffe135",
              WebkitTextStroke: "9px #140f16",
              paintOrder: "stroke fill",
              textShadow: "0 10px 0 #140f16, 0 18px 30px rgba(0,0,0,0.75)",
              letterSpacing: -2,
              transform: "rotate(-2deg)",
            }}
          >
            KUCING CIA
          </div>

          {/* Line 2: $20 JUTA?! */}
          <div
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 950,
              fontSize: 124,
              lineHeight: 0.95,
              color: "#ffffff",
              WebkitTextStroke: "10px #140f16",
              paintOrder: "stroke fill",
              textShadow: "0 11px 0 #140f16, 0 18px 32px rgba(0,0,0,0.78)",
              letterSpacing: -2,
              marginTop: 4,
              transform: "rotate(-2deg)",
            }}
          >
            $20 JUTA?!
          </div>

          {/* Tilted Red Punchline Badge */}
          <div
            style={{
              marginTop: 18,
              transform: "rotate(-3.5deg)",
              background: "#e02424",
              color: "#fffbe6",
              border: "6px solid #140f16",
              boxShadow: "0 10px 0 #140f16, 0 16px 26px rgba(0,0,0,0.6)",
              borderRadius: 20,
              padding: "12px 30px",
              fontSize: 44,
              fontWeight: 950,
              letterSpacing: 1,
              fontFamily: "system-ui, -apple-system, sans-serif",
              textShadow: "0 3px 0 rgba(0,0,0,0.5)",
            }}
          >
            MALAH MAKAN IKAN!!
          </div>
        </div>
      ) : (
        <>
          {/* 9:16 Top Hero Headline */}
          <div
            style={{
              position: "absolute",
              top: 72,
              left: 36,
              right: 36,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: "#161b29",
                color: "#53dcff",
                border: "4px solid #53dcff",
                borderRadius: 999,
                padding: "8px 28px",
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 2,
                marginBottom: 14,
                boxShadow: "0 7px 0 rgba(0,0,0,0.65)",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              KISAH NYATA CIA · 1966
            </div>

            <div
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 950,
                fontSize: 122,
                lineHeight: 0.95,
                textAlign: "center",
                color: "#ffe135",
                WebkitTextStroke: "10px #140f16",
                paintOrder: "stroke fill",
                textShadow: "0 12px 0 #140f16, 0 20px 36px rgba(0,0,0,0.75)",
                letterSpacing: -2,
                transform: "rotate(-2deg)",
              }}
            >
              KUCING CIA
            </div>

            <div
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 950,
                fontSize: 136,
                lineHeight: 0.96,
                textAlign: "center",
                color: "#ffffff",
                WebkitTextStroke: "11px #140f16",
                paintOrder: "stroke fill",
                textShadow: "0 12px 0 #140f16, 0 20px 36px rgba(0,0,0,0.75)",
                letterSpacing: -2,
                marginTop: 6,
                transform: "rotate(-2deg)",
              }}
            >
              $20 JUTA?!
            </div>
          </div>

          {/* 9:16 Bottom Red Punchline Stamp */}
          <div
            style={{
              position: "absolute",
              bottom: 126,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                transform: "rotate(-3.5deg)",
                background: "#e02424",
                color: "#fffbe6",
                border: "7px solid #140f16",
                boxShadow: "0 12px 0 #140f16, 0 18px 30px rgba(0,0,0,0.65)",
                borderRadius: 24,
                padding: "18px 42px",
                fontSize: 56,
                fontWeight: 950,
                letterSpacing: 1,
                fontFamily: "system-ui, -apple-system, sans-serif",
                textShadow: "0 4px 0 rgba(0,0,0,0.5)",
              }}
            >
              MALAH MAKAN IKAN!!
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

export const KucingThumb16x9: React.FC = () => <KucingThumbBase aspect="16x9" />;
export const KucingThumb9x16: React.FC = () => <KucingThumbBase aspect="9x16" />;

const ThumbRoot: React.FC = () => (
  <>
    <Composition id="KucingThumb16x9" component={KucingThumb16x9} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="KucingThumb9x16" component={KucingThumb9x16} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);

registerRoot(ThumbRoot);

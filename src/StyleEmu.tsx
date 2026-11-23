// Uji gaya "3D explainer" (referensi Apache) untuk cerita Perang Emu 1932.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Bean3, Bean3Params, BlueGrid, G, T, ToonRes, ToonSky, WordSub, toonGradient } from "./three/toon";
import { Binoculars, Emu3D, Eucalyptus, Farmhouse, Fence, Hills, LewisGun, Sandbags, ToonCloud, Wheat, Windmill } from "./three/objectsEmu";

export const MEREDITH: Bean3Params = {
  body: "#9a8a5c",
  pants: "#8a7c52",
  boots: "#4a3222",
  glove: "#3a2c22",
  hat: "peaked",
  hatColor: "#8e7e52",
  hatBand: "#5a3a22",
  belt: "#5a3a22",
  strap: "#5a3a22",
  pockets: true,
  collar: "#9a8a5c",
  mustache: true,
};
export const OHALLORAN: Bean3Params = {
  body: "#9c8e60",
  pants: "#8c7e54",
  boots: "#4a3222",
  hat: "slouch",
  hatColor: "#a08a5a",
  hatBand: "#4a3a2a",
  belt: "#6a4a2a",
  pockets: true,
};
export const PAKTOM: Bean3Params = {
  body: "#b8483a",
  plaid: "#7a2a22",
  pants: "#5a5e6a",
  boots: "#5a3a22",
  hat: "wide",
  hatColor: "#c8a46a",
  hatBand: "#6a4a2a",
  braces: "#4a3a2a",
};

const Lights: React.FC = () => (
  <>
    <hemisphereLight args={["#eaf4ff", "#c8a46a", 1.1]} />
    <directionalLight
      position={[-6, 10, 7]}
      intensity={2.0}
      color="#fff0d6"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-9}
      shadow-camera-right={9}
      shadow-camera-top={9}
      shadow-camera-bottom={-9}
      shadow-bias={-0.0004}
    />
  </>
);

// A: ladang gandum siang, Mayor Meredith + senapan Lewis + emu mengintip
export const StyleEmuA: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#cfe6ff" }}>
      <ThreeCanvas width={1080} height={1920} shadows flat camera={{ fov: 40, near: 0.1, far: 500, position: [2.1, 1.6, 6.2] }}>
        <ToonRes />
        <CameraRig position={[1.7, 1.55, 6.4]} lookAt={[0.25, 1.1, 0]} fov={40} />
        <ToonSky top="#3f97ea" horizon="#fbe7c4" r={300} />
        <Lights />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshToonMaterial color="#c9a866" gradientMap={toonGradient()} />
        </mesh>
        <Hills />
        <ToonCloud position={[-14, 16, -60]} scale={3} />
        <ToonCloud position={[16, 20, -70]} scale={3.6} />
        <ToonCloud position={[2, 24, -90]} scale={2.6} />
        <Wheat area={[-14, 14, -16, 1.4]} n={3200} clear={[[-0.25, 0.4, 1.0], [0.75, 1.25, 1.1], [1.4, -0.6, 0.3]]} />
        <Farmhouse position={[-6.5, 0, -14]} rotation={[0, 0.45, 0]} />
        <Windmill position={[5, 0, -12]} spin={f * 0.05} />
        <Eucalyptus position={[-4.6, 0, -11]} />
        <Eucalyptus position={[8.5, 0, -18]} scale={1.3} seed={2} />
        <Fence from={[-12, -3.4]} to={[12, -3.4]} posts={11} broken={6} />
        {/* senapan Lewis di atas karung pasir, membidik ke arah emu */}
        <Sandbags position={[0.75, 0, 1.3]} rotation={[0, 0.45, 0]} n={4} rows={2} />
        <LewisGun position={[0.75, 0.6, 1.25]} rotation={[0.05, 2.75, 0]} scale={0.95} bipod />
        <T g={G.rbox(0.42, 0.26, 0.26, 0.2)} c="#5a6a3e" position={[-0.75, 0.13, 1.2]} rotation={[0, -0.3, 0]} />
        {/* Mayor Meredith memegang teropong */}
        <Bean3 p={{ ...MEREDITH, expr: "determined", look: 0.7, handR: [0.16, 0.98, 0.34], handL: [-0.38, 0.6, 0.1], headTurn: 0.25 }} position={[-0.3, 0, 0.5]} rotation={[0, 0.5, 0]}>
          <Binoculars position={[0.08, 0.98, 0.42]} rotation={[0, 0.2, 0]} />
        </Bean3>
        {/* emu mengintip dari gandum, kepala dimiringkan */}
        <Emu3D position={[1.4, 0, -0.6]} rotation={[0, -0.5, 0]} pose={{ neck: 0.3, headTilt: 0.4, headTurn: -0.3 }} />
        <Emu3D position={[3.6, 0, -6]} rotation={[0, -1.3, 0]} pose={{ run: f * 0.45, neck: 0.55 }} scale={0.95} />
        <Emu3D position={[-1.6, 0, -9]} rotation={[0, 1.2, 0]} pose={{ peck: 0.8, neck: 0.6 }} scale={0.95} />
        <Emu3D position={[0.8, 0, -11]} rotation={[0, 2.0, 0]} pose={{ neck: 0.2 }} scale={0.95} />
      </ThreeCanvas>
      <WordSub word="burung." />
    </AbsoluteFill>
  );
};

// B: X-ray senapan Lewis di atas grid biru, peluru macet menyala merah
export const StyleEmuB: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.35);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#020812 0%, #06204a 55%, #0a2c5c 100%)" }}>
      <ThreeCanvas width={1080} height={1920} flat camera={{ fov: 38, near: 0.05, far: 200, position: [1.9, 1.55, 2.9] }}>
        <ToonRes />
        <CameraRig position={[0.0, 1.65, 3.2]} lookAt={[0.1, 1.05, -0.2]} fov={42} />
        <hemisphereLight args={["#bfe4ff", "#123060", 1.5]} />
        <directionalLight position={[3, 6, 5]} intensity={1.8} color="#e8f4ff" />
        <BlueGrid />
        {/* tokoh tetap padat; hanya senapan yang tembus pandang */}
        <Bean3 p={{ ...OHALLORAN, expr: "puzzled", look: -0.6, handL: [-0.32, 1.78, 0.12], handR: [0.4, 0.75, 0.2], headTilt: 0.12 }} position={[0.5, 0, -1.3]} rotation={[0, -0.3, 0]} />
        <LewisGun position={[-0.2, 0.8, 0.35]} rotation={[0.08, -0.75, 0]} scale={1.4} xray jam={pulse} bipod={false} />
        {/* penanda merah di titik macet */}
        <group position={[-0.3, 0.97, 0.47]}>
          <T g={G.sph(0.035, 16, 12)} c="#ff4b40" emissive="#ff2a20" ei={1.5} o={2} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={1 + pulse * 0.6}>
            <ringGeometry args={[0.06, 0.075, 32]} />
            <meshBasicMaterial color="#ff5040" transparent opacity={0.8 - pulse * 0.5} />
          </mesh>
        </group>
      </ThreeCanvas>
      <WordSub word="macet." />
    </AbsoluteFill>
  );
};

import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CHARACTER_PRESETS, CartoonCharacter3D } from "./three/characters";

const ANGLES: { label: string; rotY: number; x: number }[] = [
  { label: "Depan (0°)", rotY: 0, x: -4.4 },
  { label: "Serong (45°)", rotY: Math.PI / 4, x: -2.2 },
  { label: "Samping (90°)", rotY: Math.PI / 2, x: 0 },
  { label: "Belakang (180°)", rotY: Math.PI, x: 2.2 },
  { label: "Kiri (270°)", rotY: (Math.PI * 3) / 2, x: 4.4 },
];

export const CharacterShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const preset = CHARACTER_PRESETS[frame % CHARACTER_PRESETS.length];

  return (
    <AbsoluteFill style={{ backgroundColor: "#141824" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 1.5, 8.8], fov: 36 }}
      >
        <color attach="background" args={["#181d2b"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 6]} intensity={1.4} />
        <directionalLight position={[-5, 4, -4]} intensity={0.65} color="#a3c4ff" />

        {/* Studio floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
          <planeGeometry args={[20, 10]} />
          <meshStandardMaterial color="#202738" roughness={0.9} />
        </mesh>

        {/* Render 5 angles of the current character */}
        {ANGLES.map((ang) => (
          <group key={ang.label} position={[ang.x, -0.45, 0]}>
            {/* Pedestal disc */}
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.72, 0.78, 0.04, 24]} />
              <meshStandardMaterial color="#2f3b54" roughness={0.7} />
            </mesh>
            <CartoonCharacter3D
              {...preset}
              rotation={[0, ang.rotY, 0]}
              scale={1}
            />
          </group>
        ))}
      </ThreeCanvas>

      {/* Top Title */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
          color: "#ffffff",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 22, opacity: 0.7, letterSpacing: 3, textTransform: "uppercase" }}>
          3D Character Turnaround ({frame + 1}/{CHARACTER_PRESETS.length})
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, marginTop: 6 }}>
          {preset.label}
        </div>
      </div>

      {/* Bottom Angle Labels */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 90,
          right: 90,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "Inter, sans-serif",
          fontSize: 26,
          fontWeight: 600,
          color: "#cbd5e1",
          pointerEvents: "none",
        }}
      >
        {ANGLES.map((ang) => (
          <div key={ang.label} style={{ width: 260, textAlign: "center" }}>
            {ang.label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

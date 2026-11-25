import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./CinematicPipeline";

// ---------------------------------------------------------------------------
// Procedural Canvas Textures (cached once)
// ---------------------------------------------------------------------------
function makeWoodTex(baseHex = "#6b4428", grainHex = "#472b16"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) {
    const y = i * 64;
    ctx.fillStyle = grainHex;
    ctx.fillRect(0, y, 512, 3);
    ctx.globalAlpha = 0.25;
    for (let k = 0; k < 28; k++) {
      ctx.fillRect((k * 73 + i * 19) % 512, y + 6 + ((k * 13) % 52), 90, 2);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function makeDirtTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8a6240";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 650; i++) {
    const x = (i * 197) % 512;
    const y = (i * 313) % 512;
    ctx.fillStyle = i % 3 === 0 ? "#6e4b2e" : i % 3 === 1 ? "#a37852" : "#5a3c24";
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x, y, 4 + (i % 7), 3 + (i % 5));
  }
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#5c3f26";
  ctx.fillRect(145, 0, 26, 512);
  ctx.fillRect(340, 0, 26, 512);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 12);
  return tex;
}

// ---------------------------------------------------------------------------
// 3D Revolver Prop (separate object so it can be holstered, drawn, or flying)
// ---------------------------------------------------------------------------
export const Revolver3D: React.FC<{
  pos?: Vec3;
  rot?: Vec3;
  scale?: number;
  finish?: "steel" | "silver";
}> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, finish = "steel" }) => {
  const metalColor = finish === "silver" ? "#d6dce6" : "#4f5866";
  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* Barrel */}
      <mesh position={[0, 0.05, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.024, 0.24, 12]} />
        <meshStandardMaterial color={metalColor} metalness={0.88} roughness={0.22} />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.075, 0.26]} castShadow>
        <boxGeometry args={[0.008, 0.018, 0.022]} />
        <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Cylinder */}
      <mesh position={[0, 0.042, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.036, 0.036, 0.08, 12]} />
        <meshStandardMaterial color={metalColor} metalness={0.86} roughness={0.25} />
      </mesh>
      {/* Frame & trigger guard */}
      <mesh position={[0, 0.02, 0.01]} castShadow>
        <boxGeometry args={[0.032, 0.055, 0.11]} />
        <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.28} />
      </mesh>
      {/* Wooden grip */}
      <mesh position={[0, -0.055, -0.05]} rotation={[-0.38, 0, 0]} castShadow>
        <boxGeometry args={[0.032, 0.12, 0.052]} />
        <meshStandardMaterial color="#5e3219" roughness={0.72} metalness={0.05} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Cartoon 3D Cowboy Character (clean silhouette, outline, micro-acting)
// ---------------------------------------------------------------------------
export type CowboyExpr = "deadpan" | "smug" | "angry" | "shocked" | "focused";

export interface CowboyProps {
  pos?: Vec3;
  yaw?: number;
  coatColor?: string;
  vestColor?: string;
  hatColor?: string;
  kerchiefColor?: string;
  skinColor?: string;
  mustacheColor?: string;
  hasMustache?: boolean;
  expr?: CowboyExpr;
  talk?: number; // 0..1 lip-sync
  blink?: boolean;
  breathe?: number; // frame or phase
  headYaw?: number;
  headPitch?: number;
  armAngle?: number; // 0 = hovering over holster, +0.9 = drawn & aiming forward, -0.4 = recoil
  fingerTwitch?: number;
  sweat?: number; // 0..1
  lean?: number; // forward/back lean
  gunInHand?: boolean;
  gunInHolster?: boolean;
  gunFinish?: "steel" | "silver";
  hatTilt?: number;
}

export const CowboyCharacter: React.FC<CowboyProps> = ({
  pos = [0, 0, 0],
  yaw = 0,
  coatColor = "#8c6239",
  vestColor = "#3a2b24",
  hatColor = "#4e3624",
  kerchiefColor = "#a83226",
  skinColor = "#e8b48a",
  mustacheColor = "#c8ccd4",
  hasMustache = false,
  expr = "deadpan",
  talk = 0,
  blink = false,
  breathe = 0,
  headYaw = 0,
  headPitch = 0,
  armAngle = 0,
  fingerTwitch = 0,
  sweat = 0,
  lean = 0,
  gunInHand = false,
  gunInHolster = true,
  gunFinish = "steel",
  hatTilt = -0.14,
}) => {
  const breathY = Math.sin(breathe * 0.14) * 0.012;
  const shoulderLift = Math.sin(breathe * 0.14) * 0.014;

  const eyeScaleY = blink ? 0.1 : expr === "deadpan" || expr === "focused" ? 0.55 : expr === "shocked" ? 1.35 : 0.85;
  const browTilt =
    expr === "angry" ? 0.32 : expr === "smug" ? -0.18 : expr === "shocked" ? -0.35 : expr === "focused" ? 0.2 : 0.02;

  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      {/* Soft contact shadow on ground */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.52, 24]} />
        <meshBasicMaterial color="#181222" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {/* Legs & Cowboy Boots */}
      {[-0.15, 0.15].map((lx, idx) => (
        <group key={idx} position={[lx, 0, 0]}>
          {/* Boot */}
          <mesh position={[0, 0.14, 0.04]} castShadow>
            <boxGeometry args={[0.14, 0.28, 0.26]} />
            <meshStandardMaterial color="#2b1b12" roughness={0.75} />
          </mesh>
          {/* Leg */}
          <mesh position={[0, 0.52, 0]} castShadow>
            <cylinderGeometry args={[0.095, 0.085, 0.56, 12]} />
            <meshStandardMaterial color="#2c3347" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Upper Body Group (leans & breathes) */}
      <group position={[0, 0.82 + breathY, 0]} rotation={[lean, 0, 0]}>
        {/* Gun Belt & Buckle */}
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.24, 0.11, 16]} />
          <meshStandardMaterial color="#362012" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.04, 0.24]} castShadow>
          <boxGeometry args={[0.12, 0.09, 0.03]} />
          <meshStandardMaterial color="#d4a74a" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Right-hip Holster */}
        <group position={[-0.27, -0.06, 0.04]} rotation={[0.15, 0, 0.08]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.24, 0.12]} />
            <meshStandardMaterial color="#3d2414" roughness={0.7} />
          </mesh>
          {gunInHolster && (
            <Revolver3D pos={[0, 0.08, 0.02]} rot={[-1.4, 0, 0]} scale={0.85} finish={gunFinish} />
          )}
        </group>

        {/* Torso / Vest + Coat */}
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.22, 0.54, 16]} />
          <meshStandardMaterial color={vestColor} roughness={0.78} />
        </mesh>
        {/* Duster Coat sides & tail */}
        <mesh position={[-0.19, 0.16, -0.02]} rotation={[0, 0, 0.08]} castShadow>
          <boxGeometry args={[0.14, 0.72, 0.36]} />
          <meshStandardMaterial color={coatColor} roughness={0.82} />
        </mesh>
        <mesh position={[0.19, 0.16, -0.02]} rotation={[0, 0, -0.08]} castShadow>
          <boxGeometry args={[0.14, 0.72, 0.36]} />
          <meshStandardMaterial color={coatColor} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.15, -0.17]} castShadow>
          <boxGeometry args={[0.42, 0.74, 0.1]} />
          <meshStandardMaterial color={coatColor} roughness={0.82} />
        </mesh>

        {/* Neckerchief */}
        <mesh position={[0, 0.56, 0.08]} rotation={[0.35, 0, 0]} castShadow>
          <coneGeometry args={[0.18, 0.22, 12]} />
          <meshStandardMaterial color={kerchiefColor} roughness={0.75} />
        </mesh>

        {/* Left Arm (relaxed balance) */}
        <group position={[0.3, 0.52 + shoulderLift, 0]} rotation={[0.1, 0, -0.18]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.065, 0.44, 10]} />
            <meshStandardMaterial color={coatColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.46, 0.02]} castShadow>
            <sphereGeometry args={[0.068, 12, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
        </group>

        {/* Right Arm (Gun Arm: hovers over holster, twitches, draws, aims) */}
        <group position={[-0.3, 0.52 + shoulderLift, 0]} rotation={[-armAngle, 0, 0.18]}>
          <mesh position={[0, -0.21, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.065, 0.42, 10]} />
            <meshStandardMaterial color={coatColor} roughness={0.8} />
          </mesh>
          <group position={[0, -0.44, 0.05]} rotation={[0, 0, fingerTwitch]}>
            <mesh castShadow>
              <sphereGeometry args={[0.072, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.6} />
            </mesh>
            {gunInHand && (
              <Revolver3D pos={[0, -0.02, 0.06]} rot={[Math.PI / 2, 0, 0]} scale={1.0} finish={gunFinish} />
            )}
          </group>
        </group>

        {/* Head & Hat Group */}
        <group position={[0, 0.78, 0]} rotation={[headPitch, headYaw, 0]}>
          {/* Head sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshStandardMaterial color={skinColor} roughness={0.55} />
          </mesh>
          {/* Thin cartoon outline on head */}
          <mesh scale={1.04}>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshBasicMaterial color="#16111c" side={THREE.BackSide} />
          </mesh>

          {/* Eyes */}
          {[-0.078, 0.078].map((ex, i) => (
            <group key={i} position={[ex, 0.03, 0.195]}>
              <mesh scale={[1, eyeScaleY, 0.6]}>
                <sphereGeometry args={[0.042, 12, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0.022]} scale={[1, Math.min(1, eyeScaleY), 0.6]}>
                <sphereGeometry args={[0.021, 10, 10]} />
                <meshStandardMaterial color="#181820" roughness={0.15} />
              </mesh>
              {/* Eyebrow */}
              <mesh
                position={[0, 0.058, 0.01]}
                rotation={[0, 0, i === 0 ? -browTilt : browTilt]}
              >
                <boxGeometry args={[0.078, 0.02, 0.025]} />
                <meshStandardMaterial color={hasMustache ? mustacheColor : "#2b1d14"} roughness={0.7} />
              </mesh>
            </group>
          ))}

          {/* Mustache (kept below nose, never hides mouth/eyes) */}
          {hasMustache && (
            <group position={[0, -0.042, 0.205]}>
              <mesh position={[-0.045, 0, 0]} rotation={[0, 0, 0.22]}>
                <boxGeometry args={[0.09, 0.026, 0.03]} />
                <meshStandardMaterial color={mustacheColor} roughness={0.7} />
              </mesh>
              <mesh position={[0.045, 0, 0]} rotation={[0, 0, -0.22]}>
                <boxGeometry args={[0.09, 0.026, 0.03]} />
                <meshStandardMaterial color={mustacheColor} roughness={0.7} />
              </mesh>
            </group>
          )}

          {/* Mouth (lip-sync + expression) */}
          <mesh
            position={[0, -0.095, 0.195]}
            scale={[
              expr === "smug" ? 1.25 : expr === "shocked" ? 0.9 : 1.0,
              0.25 + talk * 1.1 + (expr === "shocked" ? 1.1 : 0),
              1,
            ]}
          >
            <boxGeometry args={[0.085, 0.045, 0.03]} />
            <meshStandardMaterial color="#3b1518" roughness={0.8} />
          </mesh>

          {/* Sweat drop during tension */}
          {sweat > 0.05 && (
            <mesh position={[0.19, 0.08 - sweat * 0.12, 0.12]} scale={[0.8, 1.3, 0.8]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#9ee7ff" roughness={0.1} metalness={0.1} transparent opacity={0.85} />
            </mesh>
          )}

          {/* Cowboy Hat (tilted slightly back so eyes/brows stay 100% readable) */}
          <group position={[0, 0.17, -0.02]} rotation={[hatTilt, 0, 0]}>
            {/* Brim */}
            <mesh castShadow>
              <cylinderGeometry args={[0.42, 0.44, 0.03, 24]} />
              <meshStandardMaterial color={hatColor} roughness={0.82} />
            </mesh>
            {/* Brim outline */}
            <mesh scale={[1.03, 1.15, 1.03]}>
              <cylinderGeometry args={[0.42, 0.44, 0.03, 24]} />
              <meshBasicMaterial color="#16111c" side={THREE.BackSide} />
            </mesh>
            {/* Crown */}
            <mesh position={[0, 0.13, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.24, 0.24, 18]} />
              <meshStandardMaterial color={hatColor} roughness={0.82} />
            </mesh>
            {/* Hat band */}
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.245, 0.245, 0.04, 18]} />
              <meshStandardMaterial color={kerchiefColor} roughness={0.6} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Bystander Townsfolk on Saloon Porch
// ---------------------------------------------------------------------------
export const TownsfolkBystander: React.FC<{
  pos: Vec3;
  yaw?: number;
  shirtColor?: string;
  hatColor?: string;
  talk?: number;
  lean?: number;
}> = ({ pos, yaw = 0, shirtColor = "#b5524c", hatColor = "#7a5b3e", talk = 0, lean = 0 }) => (
  <group position={pos} rotation={[lean, yaw, 0]} scale={0.9}>
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.4, 16]} />
      <meshBasicMaterial color="#181222" transparent opacity={0.4} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0.45, 0]} castShadow>
      <cylinderGeometry args={[0.18, 0.22, 0.9, 12]} />
      <meshStandardMaterial color="#3c4359" roughness={0.85} />
    </mesh>
    <mesh position={[0, 1.05, 0]} castShadow>
      <cylinderGeometry args={[0.22, 0.2, 0.5, 14]} />
      <meshStandardMaterial color={shirtColor} roughness={0.78} />
    </mesh>
    <group position={[0, 1.48, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.19, 16, 16]} />
        <meshStandardMaterial color="#eab996" roughness={0.55} />
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[0.19, 16, 16]} />
        <meshBasicMaterial color="#16111c" side={THREE.BackSide} />
      </mesh>
      {[-0.065, 0.065].map((ex, i) => (
        <mesh key={i} position={[ex, 0.02, 0.17]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#1b1b22" />
        </mesh>
      ))}
      <mesh position={[0, -0.075, 0.17]} scale={[1, 0.3 + talk * 1.1, 1]}>
        <boxGeometry args={[0.07, 0.04, 0.02]} />
        <meshStandardMaterial color="#3b1518" />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[-0.1, 0, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.04, 16]} />
        <meshStandardMaterial color={hatColor} roughness={0.85} />
      </mesh>
    </group>
  </group>
);

// ---------------------------------------------------------------------------
// Set A: Rich 3-Layer Wild West Town (Foreground + Midground + Background)
// ---------------------------------------------------------------------------
export const WildWestTown: React.FC<{ frame: number }> = ({ frame }) => {
  const dirtTex = useMemo(() => makeDirtTex(), []);
  const woodTex = useMemo(() => makeWoodTex("#73492a", "#472914"), []);
  const darkWoodTex = useMemo(() => makeWoodTex("#52331d", "#331d0e"), []);

  const dustMotes = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        x: ((i * 73) % 100) / 10 - 5,
        y: 0.3 + ((i * 37) % 35) / 10,
        z: ((i * 53) % 240) / 10 - 12,
        s: 0.016 + (i % 4) * 0.007,
        spd: 0.015 + (i % 5) * 0.006,
      })),
    []
  );

  return (
    <group>
      {/* Dusty Main Street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 90]} />
        <meshStandardMaterial map={dirtTex} roughness={0.94} metalness={0.02} />
      </mesh>

      {/* Left & Right Wooden Boardwalks (kept at |x| >= 4.2 so street center is 100% clear) */}
      {[-5.2, 5.2].map((bx, i) => (
        <mesh key={i} position={[bx, 0.12, -2]} receiveShadow castShadow>
          <boxGeometry args={[2.2, 0.24, 34]} />
          <meshStandardMaterial map={woodTex} roughness={0.85} />
        </mesh>
      ))}

      {/* LEFT: Two-Story Saloon */}
      <group position={[-7.6, 0, -2]}>
        {/* Main structure */}
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 6.4, 14]} />
          <meshStandardMaterial map={darkWoodTex} roughness={0.86} />
        </mesh>
        {/* False front parapet */}
        <mesh position={[2.0, 7.2, 0]} castShadow>
          <boxGeometry args={[0.45, 2.0, 13.6]} />
          <meshStandardMaterial map={woodTex} roughness={0.82} />
        </mesh>
        {/* SALOON Signboard */}
        <mesh position={[2.3, 6.9, 0]} castShadow>
          <boxGeometry args={[0.18, 1.1, 5.2]} />
          <meshStandardMaterial color="#2b170e" roughness={0.75} />
        </mesh>
        {/* Warm Glowing Saloon Windows */}
        {[-3.6, 3.6].map((wz, i) => (
          <mesh key={i} position={[2.22, 2.2, wz]}>
            <boxGeometry args={[0.08, 1.5, 1.8]} />
            <meshStandardMaterial color="#ffbe63" emissive="#ff9933" emissiveIntensity={1.6} />
          </mesh>
        ))}
        {/* Porch roof & pillars (at x = -4.35, safely outside central corridor) */}
        <mesh position={[3.1, 3.7, 0]} rotation={[0, 0, -0.14]} castShadow>
          <boxGeometry args={[2.6, 0.18, 14.2]} />
          <meshStandardMaterial map={woodTex} roughness={0.85} />
        </mesh>
        {[-6.2, -2.0, 2.0, 6.2].map((pz, i) => (
          <mesh key={i} position={[4.1, 1.9, pz]} castShadow>
            <cylinderGeometry args={[0.11, 0.12, 3.6, 10]} />
            <meshStandardMaterial color="#4a2c17" roughness={0.85} />
          </mesh>
        ))}
        {/* Glowing Oil Lanterns on Porch */}
        {[-2.0, 2.0].map((lz, i) => (
          <group key={i} position={[3.95, 2.9, lz]}>
            <mesh>
              <cylinderGeometry args={[0.11, 0.14, 0.28, 10]} />
              <meshStandardMaterial color="#ffcf6b" emissive="#ff9b2e" emissiveIntensity={3.2} />
            </mesh>
            <pointLight position={[0.2, -0.1, 0]} intensity={1.8} distance={7} color="#ffaa44" />
          </group>
        ))}
        {/* Whiskey Barrels & Crates */}
        <mesh position={[2.8, 0.65, -4.5]} castShadow>
          <cylinderGeometry args={[0.38, 0.34, 0.9, 14]} />
          <meshStandardMaterial color="#693e20" roughness={0.78} />
        </mesh>
        <mesh position={[2.8, 0.65, 4.6]} castShadow>
          <cylinderGeometry args={[0.38, 0.34, 0.9, 14]} />
          <meshStandardMaterial color="#693e20" roughness={0.78} />
        </mesh>
      </group>

      {/* RIGHT: Sheriff Office & General Store */}
      <group position={[7.6, 0, -2]}>
        <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 5.6, 13.5]} />
          <meshStandardMaterial map={woodTex} roughness={0.86} />
        </mesh>
        <mesh position={[-2.0, 6.2, 0]} castShadow>
          <boxGeometry args={[0.45, 1.6, 12.8]} />
          <meshStandardMaterial map={darkWoodTex} roughness={0.84} />
        </mesh>
        {[-3.4, 3.4].map((wz, i) => (
          <mesh key={i} position={[-2.22, 2.0, wz]}>
            <boxGeometry args={[0.08, 1.4, 1.6]} />
            <meshStandardMaterial color="#ffbc5e" emissive="#ff9429" emissiveIntensity={1.4} />
          </mesh>
        ))}
        <mesh position={[-3.1, 3.5, 0]} rotation={[0, 0, 0.14]} castShadow>
          <boxGeometry args={[2.5, 0.18, 13.8]} />
          <meshStandardMaterial map={darkWoodTex} roughness={0.85} />
        </mesh>
        {[-6.0, -2.0, 2.0, 6.0].map((pz, i) => (
          <mesh key={i} position={[-4.1, 1.85, pz]} castShadow>
            <cylinderGeometry args={[0.11, 0.12, 3.4, 10]} />
            <meshStandardMaterial color="#4a2c17" roughness={0.85} />
          </mesh>
        ))}
        {/* Crates & Hitching Post */}
        <mesh position={[-2.9, 0.6, 3.8]} castShadow>
          <boxGeometry args={[0.85, 0.85, 0.85]} />
          <meshStandardMaterial map={woodTex} roughness={0.82} />
        </mesh>
      </group>

      {/* BACKGROUND: Church Bell Tower & Desert Mesas */}
      <group position={[0, 0, -26]}>
        {/* Church */}
        <mesh position={[-2.8, 3.2, 0]} castShadow>
          <boxGeometry args={[4.2, 6.4, 5.0]} />
          <meshStandardMaterial color="#9c7e62" roughness={0.9} />
        </mesh>
        <mesh position={[-2.8, 8.2, 0]} castShadow>
          <boxGeometry args={[1.6, 4.0, 1.6]} />
          <meshStandardMaterial color="#8c6f54" roughness={0.9} />
        </mesh>
        <mesh position={[-2.8, 11.2, 0]} castShadow>
          <coneGeometry args={[1.3, 2.4, 4]} />
          <meshStandardMaterial color="#4d3221" roughness={0.85} />
        </mesh>
        {/* Distant Mesas */}
        <mesh position={[-18, 5, -18]}>
          <cylinderGeometry args={[7, 11, 12, 7]} />
          <meshStandardMaterial color="#593a3e" roughness={0.95} />
        </mesh>
        <mesh position={[16, 6, -22]}>
          <cylinderGeometry args={[8, 13, 14, 7]} />
          <meshStandardMaterial color="#4f353d" roughness={0.95} />
        </mesh>
      </group>

      {/* Cacti along outer edges */}
      {[
        [-4.6, 0, -13],
        [4.7, 0, -14],
        [-4.8, 0, 10],
        [4.6, 0, 11],
      ].map(([cx, cy, cz], i) => (
        <group key={i} position={[cx, cy, cz]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 2.2, 10]} />
            <meshStandardMaterial color="#3c5e3a" roughness={0.85} />
          </mesh>
          <mesh position={[0.28, 1.2, 0]} rotation={[0, 0, -0.7]} castShadow>
            <cylinderGeometry args={[0.12, 0.13, 0.7, 8]} />
            <meshStandardMaterial color="#3c5e3a" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Volumetric Low-Sun Shafts */}
      {[-4, 2, 8].map((sz, i) => (
        <mesh key={i} position={[-6, 4.5, sz]} rotation={[0.1, 0, -0.95]}>
          <coneGeometry args={[3.5, 22, 16, 1, true]} />
          <meshBasicMaterial
            color="#ffba66"
            transparent
            opacity={0.042}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Drifting Dust Motes */}
      {dustMotes.map((m, i) => (
        <mesh key={i} position={[m.x + Math.sin(frame * m.spd + i) * 0.6, m.y, m.z + ((frame * 0.03) % 4) - 2]}>
          <sphereGeometry args={[m.s, 6, 6]} />
          <meshBasicMaterial color="#ffd599" transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Set B: Modern Room / Desk Mini-Set (Phone Falling Analogy)
// ---------------------------------------------------------------------------
export const ModernDeskSet: React.FC<{
  frame: number;
  phoneSlide: number; // 0..1 (0 = on desk, 0.5 = tipping over edge, 1 = falling)
  handCatch: number; // 0..1 (0 = hovering, 1 = lunging & catching!)
}> = ({ frame, phoneSlide, handCatch }) => {
  const deskTex = useMemo(() => makeWoodTex("#8f623d", "#5e3c20"), []);
  // Phone trajectory: slides to front-right edge [0.58, 0.83, 0.52] then drops cleanly in front of desk
  const slideX = 0.18 + Math.min(1, phoneSlide * 1.3) * 0.42;
  const slideZ = 0.24 + Math.min(1, phoneSlide * 1.3) * 0.30;
  const fallT = Math.max(0, (phoneSlide - 0.42) / 0.58);
  const phoneY = 0.83 - fallT * fallT * 0.18;
  const phoneTilt = -fallT * 0.65;

  // Hand lunge to catch
  const handX = slideX + 0.12 + (1 - handCatch) * 0.32;
  const handY = 1.02 - handCatch * 0.28;
  const handZ = slideZ + 0.05 + (1 - handCatch) * 0.22;

  return (
    <group>
      {/* Room floor & back wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#343b52" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.5, -1.8]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#2a3147" roughness={0.9} />
      </mesh>

      {/* Wooden Desk */}
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.08, 1.0]} />
        <meshStandardMaterial map={deskTex} roughness={0.55} />
      </mesh>
      {[-0.85, 0.85].map((lx, i) => (
        <mesh key={i} position={[lx, 0.38, 0]} castShadow>
          <boxGeometry args={[0.08, 0.76, 0.88]} />
          <meshStandardMaterial color="#222533" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}

      {/* Laptop on left of desk */}
      <group position={[-0.45, 0.8, -0.08]} rotation={[0, 0.22, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.02, 0.36]} />
          <meshStandardMaterial color="#9aa3b5" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.17, -0.17]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.52, 0.34, 0.02]} />
          <meshStandardMaterial color="#252936" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.17, -0.158]} rotation={[-0.2, 0, 0]}>
          <planeGeometry args={[0.47, 0.29]} />
          <meshStandardMaterial color="#6cb4ff" emissive="#3c78d8" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Coffee Mug & Books */}
      <mesh position={[0.05, 0.87, -0.22]} castShadow>
        <cylinderGeometry args={[0.06, 0.055, 0.14, 14]} />
        <meshStandardMaterial color="#d97b38" roughness={0.35} />
      </mesh>
      <mesh position={[-0.82, 0.84, 0.2]} castShadow>
        <boxGeometry args={[0.24, 0.08, 0.32]} />
        <meshStandardMaterial color="#3c6e71" roughness={0.7} />
      </mesh>

      {/* Warm Desk Lamp */}
      <group position={[-0.85, 0.8, -0.35]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.04, 14]} />
          <meshStandardMaterial color="#2a2d3a" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.05, 0.32, 0.04]} rotation={[0, 0, -0.25]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.62, 8]} />
          <meshStandardMaterial color="#2a2d3a" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.18, 0.56, 0.08]} rotation={[0.2, 0, 0.5]} castShadow>
          <coneGeometry args={[0.13, 0.18, 16]} />
          <meshStandardMaterial color="#d49b4b" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0.18, 0.52, 0.08]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color="#ffe2a8" emissive="#ffb84d" emissiveIntensity={3.0} />
        </mesh>
      </group>

      {/* 3D Smartphone sliding off desk edge */}
      <group position={[slideX, phoneY, slideZ]} rotation={[0.18, 0.12, phoneTilt]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.02, 0.3]} />
          <meshStandardMaterial color="#1b1e28" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.14, 0.27]} />
          <meshStandardMaterial color="#80d4ff" emissive="#42a5f5" emissiveIntensity={1.6} />
        </mesh>
      </group>

      {/* 3D Cartoon Hand lunging to catch */}
      <group position={[handX, handY, handZ]} rotation={[0.3, -0.2, -0.35 + handCatch * 0.4]}>
        {/* Forearm */}
        <mesh position={[0.26, 0.12, 0.1]} rotation={[0, 0, 1.15]} castShadow>
          <cylinderGeometry args={[0.055, 0.068, 0.52, 12]} />
          <meshStandardMaterial color="#e8b48a" roughness={0.55} />
        </mesh>
        {/* Palm */}
        <mesh castShadow>
          <boxGeometry args={[0.14, 0.05, 0.16]} />
          <meshStandardMaterial color="#e8b48a" roughness={0.55} />
        </mesh>
        {/* Fingers curling to catch */}
        {[-0.048, -0.016, 0.016, 0.048].map((fz, i) => (
          <mesh
            key={i}
            position={[-0.08, -0.02 * handCatch, fz]}
            rotation={[0, 0, 0.4 + handCatch * 0.9]}
            castShadow
          >
            <boxGeometry args={[0.09, 0.028, 0.025]} />
            <meshStandardMaterial color="#e8b48a" roughness={0.55} />
          </mesh>
        ))}
      </group>

      {/* Floating Reflex Speed Indicator Ring when caught */}
      {handCatch > 0.7 && (
        <mesh position={[slideX, phoneY + 0.02, 0.24]} rotation={[-Math.PI / 2, 0, frame * 0.05]}>
          <ringGeometry args={[0.18, 0.22, 24]} />
          <meshBasicMaterial color="#ffd23f" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Hollywood Bullet-Cam Macro Slow-Mo Hero Shot
// ---------------------------------------------------------------------------
export const HollywoodBulletCam: React.FC<{
  bulletPos: Vec3;
  muzzlePos: Vec3;
  slowMoProgress: number; // 0..1 across the 3.0s slow-mo
  frame: number;
}> = ({ bulletPos, muzzlePos, slowMoProgress, frame }) => {
  const spinAngle = frame * 0.55 + slowMoProgress * 18.0;

  const embers = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const ang = (i / 36) * Math.PI * 2 + (i % 3) * 0.4;
        const rad = 0.06 + ((i * 19) % 100) / 280;
        const fwd = 0.05 + ((i * 41) % 100) / 140;
        return { ang, rad, fwd, s: 0.005 + (i % 4) * 0.003 };
      }),
    []
  );

  // Distance traveled from muzzle
  const dx = bulletPos[0] - muzzlePos[0];
  const dy = bulletPos[1] - muzzlePos[1];
  const dz = bulletPos[2] - muzzlePos[2];
  const dist = Math.max(0.15, Math.hypot(dx, dy, dz));
  const yaw = Math.atan2(dx, dz);

  return (
    <group>
      {/* Muzzle Flash + Expanding Gunpowder Smoke Ring + 36 Glowing Ember Sparks */}
      <group position={muzzlePos} rotation={[0, yaw, 0]}>
        {/* Bright Muzzle Flash Core (fades as bullet leaves) */}
        {slowMoProgress < 0.45 && (
          <mesh scale={1 + slowMoProgress * 2.2}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial
              color="#fff0b3"
              emissive="#ff9e2c"
              emissiveIntensity={4.5 * (1 - slowMoProgress / 0.45)}
              transparent
              opacity={0.9 * (1 - slowMoProgress / 0.45)}
            />
          </mesh>
        )}
        {/* Slowly blooming gunpowder smoke ring */}
        <mesh position={[0, 0, 0.18 + slowMoProgress * 0.25]} scale={0.7 + slowMoProgress * 1.4}>
          <torusGeometry args={[0.14, 0.035, 10, 24]} />
          <meshStandardMaterial
            color="#a69b90"
            roughness={0.95}
            transparent
            opacity={Math.max(0.08, 0.52 - slowMoProgress * 0.4)}
          />
        </mesh>
        {/* 36 Glowing Ember Sparks suspended in slow-mo */}
        {embers.map((e, i) => {
          const r = e.rad * (0.6 + slowMoProgress * 0.8);
          const z = e.fwd * (0.3 + slowMoProgress * 0.9);
          return (
            <mesh key={i} position={[Math.cos(e.ang) * r, Math.sin(e.ang) * r, z]}>
              <sphereGeometry args={[e.s, 6, 6]} />
              <meshStandardMaterial
                color="#ffd27d"
                emissive="#ff7b1c"
                emissiveIntensity={3.8}
              />
            </mesh>
          );
        })}
      </group>

      {/* Spiral Vapor Trail stretching behind bullet */}
      <group position={muzzlePos} rotation={[0, yaw, 0]}>
        <mesh position={[0, 0, dist * 0.5]} rotation={[Math.PI / 2, spinAngle * 0.3, 0]}>
          <cylinderGeometry args={[0.018, 0.045, dist * 0.92, 10, 1, true]} />
          <meshBasicMaterial
            color="#e8dfd5"
            transparent
            opacity={0.28}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* THE SPINNING BRASS BULLET + 3 MACH SHOCKWAVE CONES */}
      <group position={bulletPos} rotation={[0, yaw, 0]}>
        {/* Rifling-Spinning Bullet Group */}
        <group rotation={[0, 0, spinAngle]}>
          {/* Copper/Brass Ogive Nose */}
          <mesh position={[0, 0, 0.032]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.022, 0.052, 24]} />
            <meshStandardMaterial color="#e6b157" metalness={0.85} roughness={0.22} />
          </mesh>
          {/* Brass Cylindrical Body */}
          <mesh position={[0, 0, -0.008]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.036, 24]} />
            <meshStandardMaterial color="#d4963b" metalness={0.86} roughness={0.22} />
          </mesh>
          {/* Rifling groove ring (makes spin clearly visible!) */}
          <mesh position={[0, 0, -0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0235, 0.0235, 0.006, 8]} />
            <meshStandardMaterial color="#7a4c16" metalness={0.85} roughness={0.24} />
          </mesh>
          {/* Asymmetric specular notch so spin catches golden rim light */}
          <mesh position={[0.018, 0, -0.005]}>
            <boxGeometry args={[0.008, 0.01, 0.028]} />
            <meshStandardMaterial color="#ffdf94" metalness={0.92} roughness={0.12} />
          </mesh>
        </group>

        {/* Subtle cool purple-blue fill on shadow side of bullet */}
        <pointLight position={[-0.12, -0.06, 0.08]} intensity={0.9} distance={1.2} color="#6b7ec7" />

        {/* 3 Layers of Semi-Transparent Mach Shockwave Cones & Rings (apex forward, flare backward) */}
        {[
          { z: -0.025, r: 0.085, h: 0.15, op: 0.16 },
          { z: -0.075, r: 0.135, h: 0.21, op: 0.11 },
          { z: -0.135, r: 0.185, h: 0.26, op: 0.07 },
        ].map((c, idx) => (
          <group key={idx} position={[0, 0, c.z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[c.r, c.h, 24, 1, true]} />
              <meshBasicMaterial
                color="#ffe3ba"
                transparent
                opacity={c.op}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0, -c.h * 0.48]}>
              <torusGeometry args={[c.r * 0.96, 0.0035, 8, 28]} />
              <meshBasicMaterial
                color="#fff0d4"
                transparent
                opacity={c.op * 1.4}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}

        {/* Macro PointLight so bullet & shockwave cast warm golden glint */}
        <pointLight position={[0.08, 0.12, 0.1]} intensity={1.4} distance={1.5} color="#ffd080" />
      </group>
    </group>
  );
};

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";

// ---------------------------------------------------------------------------
// Cached GLB Loaders (school.glb & dantzig_rooms.glb)
// ---------------------------------------------------------------------------
const glbCache = new Map<string, Promise<THREE.Group>>();

export function loadGlbCached(publicRelPath: string): Promise<THREE.Group> {
  let p = glbCache.get(publicRelPath);
  if (!p) {
    const loader = new GLTFLoader();
    p = new Promise((resolve, reject) => {
      loader.load(
        staticFile(publicRelPath),
        (gltf) => {
          gltf.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const m = obj as THREE.Mesh;
              const noCast =
                m.name.includes("Floor") ||
                m.name.includes("Ground") ||
                m.name.includes("Plaza") ||
                m.name.includes("Ceiling") ||
                m.name.includes("Walkway") ||
                m.name.includes("Lawn") ||
                m.name.includes("Grass") ||
                m.name.includes("Rug") ||
                m.name.includes("Sky") ||
                m.name.includes("Morning");
              m.castShadow = !noCast;
              m.receiveShadow = true;
            }
          });
          resolve(gltf.scene);
        },
        undefined,
        reject
      );
    });
    glbCache.set(publicRelPath, p);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Gradient Sky Dome (Morning Golden / Warm Afternoon / Night)
// ---------------------------------------------------------------------------
export const SkyDome: React.FC<{ top?: string; mid?: string; horizon?: string }> = ({
  top = "#4f72b0",
  mid = "#a5b8d9",
  horizon = "#f7d4a8",
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uMid: { value: new THREE.Color(mid) },
          uHorizon: { value: new THREE.Color(horizon) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vW;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vW = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon;
          varying vec3 vW;
          void main() {
            float h = clamp(normalize(vW).y, 0.0, 1.0);
            vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
            c = mix(c, uTop, smoothstep(0.24, 0.72, h));
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [top, mid, horizon]
  );
  return (
    <mesh material={mat} scale={[190, 190, 190]}>
      <sphereGeometry args={[1, 20, 14]} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Dynamic 1939 UC Berkeley Chalkboard Canvas (2 Unsolved Statistics Problems)
// ---------------------------------------------------------------------------
export const ChalkboardDantzigPlane: React.FC<{
  position?: [number, number, number];
  solvedCheck?: number; // 0..1 green checkmark animation for Scene 7 finale
}> = ({ position = [6.2, 6.62, -4.935], solvedCheck = 0 }) => {
  const step = Math.round(solvedCheck * 16);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 1024, 512);

    // Header (centered cleanly in middle 60% so vertical 9:16 frame never clips text!)
    ctx.textAlign = "center";
    ctx.font = "900 28px Inter, Arial, sans-serif";
    ctx.fillStyle = "rgba(255, 232, 168, 0.94)";
    ctx.fillText("UC BERKELEY 1939 · STATISTIKA", 512, 62);
    ctx.strokeStyle = "rgba(255, 232, 168, 0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(250, 84);
    ctx.lineTo(774, 84);
    ctx.stroke();

    // Problem 1
    ctx.font = "900 32px Inter, Arial, sans-serif";
    ctx.fillStyle = "rgba(246, 246, 238, 0.96)";
    ctx.fillText("SOAL 1 · Hipotesis Student", 512, 158);
    ctx.font = "700 26px Inter, Arial, sans-serif";
    ctx.fillStyle = "rgba(225, 242, 230, 0.94)";
    ctx.fillText("P(|T(X)| > c | μ, σ) = α  (∀ σ > 0) ?", 512, 206);

    // Problem 2
    ctx.font = "900 32px Inter, Arial, sans-serif";
    ctx.fillStyle = "rgba(246, 246, 238, 0.96)";
    ctx.fillText("SOAL 2 · Lemma Neyman–Pearson", 512, 304);
    ctx.font = "700 26px Inter, Arial, sans-serif";
    ctx.fillStyle = "rgba(225, 242, 230, 0.94)";
    ctx.fillText("max ∫ φ(x) f₁(x) dx  s.t.  ≤ α", 512, 352);

    // Bottom status + animated green checkmarks
    if (step === 0) {
      ctx.font = "800 25px Inter, Arial, sans-serif";
      ctx.fillStyle = "rgba(255, 175, 155, 0.94)";
      ctx.fillText("★ 2 Teorema Belum Terpecahkan", 512, 444);
    } else {
      const p = step / 16;
      ctx.strokeStyle = "#4be878";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const cy of [175, 322]) {
        ctx.beginPath();
        ctx.moveTo(735, cy);
        ctx.lineTo(735 + 20 * Math.min(1, p * 2), cy + 22 * Math.min(1, p * 2));
        if (p > 0.45) {
          const p2 = (p - 0.45) / 0.55;
          ctx.lineTo(755 + 44 * p2, cy + 22 - 52 * p2);
        }
        ctx.stroke();
      }
      if (p > 0.35) {
        ctx.font = "900 32px Inter, Arial, sans-serif";
        ctx.fillStyle = "#5cf289";
        ctx.fillText("✓ KEDUANYA TERPECAHKAN!", 512, 448);
      }
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [step]);

  useEffect(() => () => tex.dispose(), [tex]);

  return (
    <mesh position={position}>
      <planeGeometry args={[5.2, 2.0]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Separate 3D Hand-Held / Transferrable Props (CLAUDE.md Section 3!)
// ---------------------------------------------------------------------------
export const Notebook3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh castShadow>
      <boxGeometry args={[0.32, 0.04, 0.42]} />
      <meshStandardMaterial color="#3b2619" roughness={0.75} />
    </mesh>
    <mesh position={[0.01, 0.012, 0]}>
      <boxGeometry args={[0.29, 0.03, 0.39]} />
      <meshStandardMaterial color="#f5f0e2" roughness={0.85} />
    </mesh>
  </group>
);

export const HomeworkStack3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  stamped?: boolean;
}> = ({ position, rotation = [0, 0, 0], scale = 1, stamped = false }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Thick stack of sheets */}
    <mesh castShadow receiveShadow>
      <boxGeometry args={[0.38, 0.075, 0.29]} />
      <meshStandardMaterial color="#f7f4ec" roughness={0.86} />
    </mesh>
    {/* Top slightly skewed sheet */}
    <mesh position={[0.01, 0.042, 0.005]} rotation={[0, 0.07, 0]} castShadow>
      <boxGeometry args={[0.37, 0.012, 0.28]} />
      <meshStandardMaterial color="#ffffff" roughness={0.84} />
    </mesh>
    {/* Red rubber band / stamp highlight */}
    <mesh position={[0, 0.05, 0]} rotation={[0, 0.07, 0]}>
      <boxGeometry args={[stamped ? 0.24 : 0.05, 0.006, stamped ? 0.08 : 0.29]} />
      <meshStandardMaterial color={stamped ? "#d92e28" : "#c73c2e"} roughness={0.6} />
    </mesh>
  </group>
);

export const CoffeeMug3D: React.FC<{
  position: [number, number, number];
  frame: number;
  scale?: number;
}> = ({ position, frame, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.075, 0]} castShadow>
      <cylinderGeometry args={[0.068, 0.060, 0.15, 14]} />
      <meshStandardMaterial color="#f2ece0" roughness={0.35} />
    </mesh>
    {/* Coffee liquid inside */}
    <mesh position={[0, 0.145, 0]}>
      <cylinderGeometry args={[0.058, 0.058, 0.01, 14]} />
      <meshStandardMaterial color="#3b2010" roughness={0.2} />
    </mesh>
    {/* Handle */}
    <mesh position={[0.072, 0.078, 0]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[0.042, 0.012, 8, 14, Math.PI]} />
      <meshStandardMaterial color="#f2ece0" roughness={0.35} />
    </mesh>
    {/* Rising steam wisps */}
    {[0, 1, 2].map((i) => {
      const p = ((frame * 0.03 + i * 0.33) % 1);
      return (
        <mesh
          key={i}
          position={[Math.sin(p * 6 + i) * 0.025, 0.18 + p * 0.22, Math.cos(p * 5 + i) * 0.015]}
          scale={[1 - p * 0.5, 1 - p * 0.4, 1 - p * 0.5]}
        >
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={(1 - p) * 0.55} />
        </mesh>
      );
    })}
  </group>
);

export const ThesisBinder3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Prestige Navy PhD Binder */}
    <mesh castShadow>
      <boxGeometry args={[0.42, 0.54, 0.085]} />
      <meshStandardMaterial color="#1d2f54" roughness={0.45} />
    </mesh>
    {/* White pages edge */}
    <mesh position={[0.012, 0, 0]}>
      <boxGeometry args={[0.405, 0.51, 0.062]} />
      <meshStandardMaterial color="#f7f3e8" roughness={0.85} />
    </mesh>
    {/* Gold embossed title plaque on front */}
    <mesh position={[0, 0.10, 0.045]}>
      <boxGeometry args={[0.28, 0.10, 0.008]} />
      <meshStandardMaterial color="#e0b23c" roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh position={[0, -0.05, 0.045]}>
      <boxGeometry args={[0.20, 0.03, 0.008]} />
      <meshStandardMaterial color="#e0b23c" roughness={0.3} metalness={0.6} />
    </mesh>
  </group>
);

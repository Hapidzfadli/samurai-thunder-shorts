import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";
import { hash, useTex, usePlanks } from "./objectsSoda";

const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/* ------------------------------------------------------------------ */
/* Light shaft (additive, fades out on both ends)                        */
/* ------------------------------------------------------------------ */
export const Shaft: React.FC<{ position: Vec3; rotation?: Vec3; size: [number, number]; color?: string; opacity?: number }> = ({ position, rotation = [0, 0, 0], size, color = "#9ec5ff", opacity = 0.16 }) => {
  const tex = useTex("shaft" + color, 64, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.2, "rgba(255,255,255,0.8)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 256);
    const gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, "rgba(0,0,0,1)");
    gx.addColorStop(0.5, "rgba(0,0,0,0)");
    gx.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = gx;
    g.fillRect(0, 0, 64, 256);
  });
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

export const Dust: React.FC<{ t: number; box?: [number, number, number]; center?: Vec3; n?: number; color?: string }> = ({ t, box = [6, 3, 5], center = [0, 1.5, 0], n = 40, color = "#b9d4ff" }) => (
  <group>
    {new Array(n).fill(0).map((_, i) => (
      <mesh key={i} position={[center[0] + (hash(i, 1) - 0.5) * box[0] + Math.sin(t * 0.3 + i) * 0.15, center[1] + (hash(i, 2) - 0.5) * box[1] + Math.sin(t * 0.5 + i * 2) * 0.1, center[2] + (hash(i, 3) - 0.5) * box[2]]}>
        <sphereGeometry args={[0.012 + hash(i, 4) * 0.014, 5, 5]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/* The TV (screen cycles colours; the light it throws flickers)          */
/* ------------------------------------------------------------------ */
const hsl = (h: number, s: number, l: number) => new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l);

export const TV: React.FC<{ position: Vec3; rotationY?: number; t: number; on?: boolean; scale?: number }> = ({ position, rotationY = 0, t, on = true, scale = 1 }) => {
  const hue = (t * 0.35) % 1;
  const base = on ? hsl(hue, 0.55, 0.55) : new THREE.Color("#0b0d14");
  const flick = on ? 0.7 + 0.3 * Math.sin(t * 17) * Math.sin(t * 5.3) : 0;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <M position={[0, 0.35, 0]}>
        <boxGeometry args={[2.2, 0.7, 0.8]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.8} />
      </M>
      <M position={[0, 1.35, 0]}>
        <boxGeometry args={[2.0, 1.2, 0.12]} />
        <meshStandardMaterial color="#111318" roughness={0.4} />
      </M>
      <mesh position={[0, 1.35, 0.07]}>
        <planeGeometry args={[1.84, 1.04]} />
        <meshBasicMaterial color={base} toneMapped={false} />
      </mesh>
      {on && (
        <>
          {/* cartoon on screen */}
          <mesh position={[Math.sin(t * 2.1) * 0.6, 1.35 + Math.abs(Math.sin(t * 3.3)) * 0.3 - 0.2, 0.075]}>
            <circleGeometry args={[0.2, 18]} />
            <meshBasicMaterial color={hsl(hue + 0.5, 0.9, 0.7)} toneMapped={false} />
          </mesh>
          <mesh position={[-0.5 + Math.cos(t * 1.4) * 0.3, 1.1, 0.075]}>
            <planeGeometry args={[0.5, 0.2]} />
            <meshBasicMaterial color={hsl(hue + 0.25, 0.8, 0.8)} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 1.3, 1.2]} intensity={46 * flick} distance={9} color={hsl(hue, 0.6, 0.65)} />
          <pointLight position={[0, 1.3, 2.8]} intensity={20 * flick} distance={9} color="#a9c6ff" />
        </>
      )}
    </group>
  );
};

export const Remote: React.FC<{ position: Vec3; rotation?: Vec3; glow?: number }> = ({ position, rotation = [0, 0, 0], glow = 0 }) => (
  <group position={position} rotation={rotation}>
    <M>
      <boxGeometry args={[0.07, 0.03, 0.22]} />
      <meshToonMaterial color="#1f2430" />
    </M>
    <mesh position={[0, 0.02, -0.07]}>
      <circleGeometry args={[0.014, 10]} />
      <meshBasicMaterial color="#ff4d4d" />
    </mesh>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[(i - 1) * 0.02, 0.02, 0.0 + 0.03 * (i % 2)]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.009, 8]} />
        <meshBasicMaterial color="#9aa4b6" />
      </mesh>
    ))}
    {glow > 0 && <pointLight position={[0, 0.1, 0]} intensity={4 * glow} distance={1.4} color="#ff6b6b" />}
  </group>
);

/* ------------------------------------------------------------------ */
/* Living room at night                                                  */
/* x: -4.2..4.2, z: -5..4. TV on the left wall facing +x, sofa facing it. */
/* ------------------------------------------------------------------ */
export const LivingRoom3D: React.FC<{ t: number; lights?: number; tvOn?: boolean }> = ({ t, lights = 0, tvOn = true }) => {
  const planks = usePlanks("#7a5a3a");
  const wall = useTex("hwall", 256, 256, (g) => {
    g.fillStyle = "#b9a98f";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(0,0,0,${hash(i, 1) * 0.06})`;
      g.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 3, 3);
    }
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 2);
  }, [3, 1]);
  const rug = useTex("rug", 256, 256, (g) => {
    g.fillStyle = "#6b2d3a";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#e0b36a";
    g.lineWidth = 8;
    g.strokeRect(16, 16, 224, 224);
    g.strokeStyle = "#c98a4a";
    g.lineWidth = 3;
    for (let i = 0; i < 6; i++) g.strokeRect(36 + i * 14, 36 + i * 14, 184 - i * 28, 184 - i * 28);
  });
  const photo = useTex("photo", 128, 96, (g) => {
    g.fillStyle = "#d9c9a8";
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = "#8a6a4a";
    g.beginPath();
    g.arc(40, 40, 18, 0, 7);
    g.arc(86, 44, 15, 0, 7);
    g.fill();
    g.fillRect(24, 58, 32, 30);
    g.fillRect(72, 60, 28, 28);
  });
  const L = clamp01(lights);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.5]} receiveShadow>
        <planeGeometry args={[10, 9]} />
        <meshStandardMaterial map={planks} roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.9, 0.012, -0.5]}>
        <planeGeometry args={[4.2, 3.0]} />
        <meshStandardMaterial map={rug} roughness={1} />
      </mesh>
      <mesh position={[0, 2.0, -5]}>
        <planeGeometry args={[10, 4]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh position={[-4.2, 2.0, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[9, 4]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh position={[4.2, 2.0, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[9, 4]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 4.0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 9]} />
        <meshStandardMaterial color="#cfc6b5" />
      </mesh>
      {/* window with moon */}
      <mesh position={[1.0, 2.2, -4.95]}>
        <planeGeometry args={[1.9, 1.7]} />
        <meshBasicMaterial color="#2c4a8f" />
      </mesh>
      <mesh position={[1.35, 2.5, -4.93]}>
        <circleGeometry args={[0.22, 20]} />
        <meshBasicMaterial color="#fff5d0" />
      </mesh>
      {[[0, 0.9, 2.1, 0.07], [0, -0.9, 2.1, 0.07], [-1.0, 0, 0.07, 1.8], [1.0, 0, 0.07, 1.8], [0, 0, 0.05, 1.8], [0, 0, 2.0, 0.05]].map(([dx, dy, w, h], i) => (
        <M key={i} position={[1.0 + (dx as number), 2.2 + (dy as number), -4.9]}>
          <boxGeometry args={[w as number, h as number, 0.08]} />
          <meshStandardMaterial color="#e8e1d0" />
        </M>
      ))}
      {[-1, 1].map((s) => (
        <M key={s} position={[1.0 + s * 1.25, 2.1, -4.78]}>
          <boxGeometry args={[0.5, 2.5, 0.1]} />
          <meshStandardMaterial color="#6a3d5c" roughness={1} />
        </M>
      ))}
      <Shaft position={[0.9, 1.6, -3.0]} rotation={[0.35, 0, 0.02]} size={[1.8, 4.5]} color="#8fb4ff" opacity={0.2 * (1 - L)} />
      {/* family photos + clock */}
      {[-2.6, -1.6].map((x, i) => (
        <group key={i} position={[x, 2.3 + i * 0.1, -4.93]}>
          <M>
            <boxGeometry args={[0.8, 0.62, 0.05]} />
            <meshStandardMaterial color="#4a2f1c" />
          </M>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.68, 0.5]} />
            <meshBasicMaterial map={photo} />
          </mesh>
        </group>
      ))}
      <TV position={[-3.7, 0, -0.5]} rotationY={Math.PI / 2} t={t} on={tvOn} scale={1.15} />
      {/* sofa: faces -x (toward the TV) */}
      <group position={[1.5, 0, -0.5]}>
        <M position={[0, 0.25, 0]}>
          <boxGeometry args={[1.0, 0.5, 2.6]} />
          <meshStandardMaterial color="#5a4a6a" roughness={0.95} />
        </M>
        <M position={[0.42, 0.85, 0]}>
          <boxGeometry args={[0.28, 0.9, 2.6]} />
          <meshStandardMaterial color="#5a4a6a" roughness={0.95} />
        </M>
        {[-1, 1].map((s) => (
          <M key={s} position={[0, 0.45, s * 1.38]}>
            <boxGeometry args={[1.0, 0.62, 0.22]} />
            <meshStandardMaterial color="#4a3b59" roughness={0.95} />
          </M>
        ))}
        {[-0.8, 0, 0.8].map((z, i) => (
          <M key={i} position={[-0.0, 0.54, z]}>
            <boxGeometry args={[0.9, 0.12, 0.78]} />
            <meshStandardMaterial color="#6b5a7d" roughness={1} />
          </M>
        ))}
      </group>
      {/* coffee table + a glass */}
      <M position={[-1.3, 0.28, -0.5]}>
        <boxGeometry args={[1.0, 0.07, 1.5]} />
        <meshStandardMaterial color="#6a4528" roughness={0.6} />
      </M>
      {[[-0.4, -0.65], [0.4, -0.65], [-0.4, 0.65], [0.4, 0.65]].map(([x, z], i) => (
        <M key={i} position={[-1.3 + (x as number), 0.13, -0.5 + (z as number)]}>
          <boxGeometry args={[0.07, 0.26, 0.07]} />
          <meshStandardMaterial color="#4a2f1c" />
        </M>
      ))}
      <M position={[-1.2, 0.4, -0.1]}>
        <cylinderGeometry args={[0.06, 0.05, 0.16, 10]} />
        <meshStandardMaterial color="#cfe6ff" transparent opacity={0.6} />
      </M>
      {/* armchair for the cat */}
      <group position={[2.9, 0, 1.9]} rotation={[0, -2.2, 0]}>
        <M position={[0, 0.25, 0]}>
          <boxGeometry args={[0.9, 0.5, 0.9]} />
          <meshStandardMaterial color="#7a3b2e" roughness={0.95} />
        </M>
        <M position={[0, 0.7, -0.38]}>
          <boxGeometry args={[0.9, 0.7, 0.16]} />
          <meshStandardMaterial color="#7a3b2e" roughness={0.95} />
        </M>
      </group>
      {/* lighting: dark, moonlight + TV + (later) the ceiling light */}
      <ambientLight intensity={0.28 + 0.9 * L} color={L > 0.4 ? "#fff0d8" : "#5a74c8"} />
      <directionalLight position={[3, 5, -3]} intensity={1.0 * (1 - 0.5 * L)} color="#8fb4ff" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-3} shadow-camera-near={0.5} shadow-camera-far={20} shadow-bias={-0.0006} />
      {L > 0.01 && <pointLight position={[0, 3.6, 0.5]} intensity={90 * L} distance={14} color="#ffe9c0" />}
      <fog attach="fog" args={["#0b1230", 9, 26]} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Hallway: planks, doors, frames, a night light and a creaky board     */
/* runs along z; the living room glows at the far end (z < -5).          */
/* ------------------------------------------------------------------ */
export const Corridor3D: React.FC<{ t: number; creak?: number }> = ({ t, creak = 0 }) => {
  const planks = usePlanks("#6e4e32");
  const wall = useTex("cwall", 256, 256, (g) => {
    g.fillStyle = "#a8a08a";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(0,0,0,${hash(i, 1) * 0.06})`;
      g.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 3, 3);
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]} receiveShadow>
        <planeGeometry args={[2.6, 16]} />
        <meshStandardMaterial map={planks} roughness={0.7} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.3, 1.5, -4]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[16, 3]} />
          <meshStandardMaterial map={wall} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 3.0, -4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 16]} />
        <meshStandardMaterial color="#c9c1b0" />
      </mesh>
      {/* doors and frames */}
      {[-6.5, -2.5, 1.5].map((z, i) => (
        <M key={i} position={[-1.27, 1.05, z]}>
          <boxGeometry args={[0.06, 2.1, 0.95]} />
          <meshStandardMaterial color="#6b4528" roughness={0.8} />
        </M>
      ))}
      {[-5, 0.0].map((z, i) => (
        <M key={i} position={[1.27, 1.7, z]}>
          <boxGeometry args={[0.05, 0.7, 0.55]} />
          <meshStandardMaterial color="#4a2f1c" />
        </M>
      ))}
      {/* night light */}
      <mesh position={[1.25, 0.35, -1.5]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#ffd7a0" />
      </mesh>
      <pointLight position={[1.0, 0.4, -1.5]} intensity={7} distance={5} color="#ffb870" />
      {/* the creaky board */}
      <M position={[0, 0.014 - 0.012 * creak, -2.4]}>
        <boxGeometry args={[0.55, 0.02, 1.0]} />
        <meshStandardMaterial color={creak > 0 ? "#a9815a" : "#80603f"} roughness={0.6} />
      </M>
      {/* the blue glow of the TV down the hall */}
      <mesh position={[0, 1.5, -11.9]}>
        <planeGeometry args={[2.6, 3]} />
        <meshBasicMaterial color={new THREE.Color("#2a4fa8")} />
      </mesh>
      <pointLight position={[0, 1.3, -9]} intensity={30 + 8 * Math.sin(t * 17) * Math.sin(t * 5)} distance={10} color="#5c8dff" />
      <Shaft position={[0, 1.4, -10.5]} rotation={[Math.PI / 2, 0, 0]} size={[2.2, 4]} color="#4c7dff" opacity={0.1} />
      <ambientLight intensity={0.3} color="#566dc0" />
      <directionalLight position={[2, 4, 4]} intensity={0.5} color="#8fb4ff" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={6} shadow-camera-bottom={-12} shadow-camera-near={0.5} shadow-camera-far={25} />
      <fog attach="fog" args={["#0b1230", 5, 16]} />
    </group>
  );
};

/** Cone of light with a spotlight, for Ibu's torch. */
export const Torch: React.FC<{ position: Vec3; target: Vec3; on?: number }> = ({ position, target, on = 1 }) => {
  const spot = useMemo(() => new THREE.Object3D(), []);
  spot.position.set(...target);
  return (
    <group>
      <primitive object={spot} />
      <spotLight position={position} target={spot} angle={0.45} penumbra={0.6} intensity={140 * on} distance={12} color="#fff1c8" castShadow={false} />
    </group>
  );
};

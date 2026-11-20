import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";
import { Sign, cl, hash, sm, useTex, usePlanks, useSand } from "./objectsSoda";

const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;

/* ------------------------------------------------------------------ */
/* Bedroom / cafe                                                       */
/* ------------------------------------------------------------------ */
export const Kamar: React.FC<{ t: number; variant?: "rina" | "cafe"; clock?: string; screen?: string; progress?: number; sign?: [string, string] | null }> = ({ t, variant = "rina", clock = "23:59", screen = "MENGIRIM", progress = 0.9, sign }) => {
  const planks = usePlanks(variant === "cafe" ? "#7b4a2a" : "#b07a48");
  const wall = useTex("wall" + variant, 512, 512, (g) => {
    g.fillStyle = variant === "cafe" ? "#7a3f26" : "#6a5acd";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = variant === "cafe" ? "rgba(255,200,140,0.08)" : "rgba(255,255,255,0.08)";
      g.fillRect(i * 32, 0, 16, 512);
    }
    for (let i = 0; i < 2000; i++) {
      g.fillStyle = `rgba(0,0,0,${hash(i, 1) * 0.07})`;
      g.fillRect(hash(i, 2) * 512, hash(i, 3) * 512, 2, 2);
    }
  }, [3, 1]);
  const clockTex = useTex("clock" + clock, 256, 256, (g) => {
    g.fillStyle = "#111";
    g.beginPath();
    g.arc(128, 128, 124, 0, 7);
    g.fill();
    g.fillStyle = "#ff3b30";
    g.font = "bold 78px Anton, Impact, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(clock, 128, 134);
  });
  const screenTex = useTex("scr" + screen + Math.round(progress * 10), 512, 320, (g) => {
    g.fillStyle = "#12203f";
    g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#fff";
    g.font = "bold 54px Anton, Impact, sans-serif";
    g.textAlign = "center";
    g.fillText(screen, 256, 120);
    if (progress >= 0) {
      g.fillStyle = "#26324f";
      g.fillRect(56, 170, 400, 40);
      g.fillStyle = "#4ade80";
      g.fillRect(56, 170, 400 * progress, 40);
      g.fillStyle = "#cfd8ff";
      g.font = "bold 36px Inter, sans-serif";
      g.fillText(`${Math.round(progress * 100)}%`, 256, 270);
    }
  });
  const cafe = variant === "cafe";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial map={planks} roughness={0.9} />
      </mesh>
      <mesh position={[0, 3, -4]}>
        <planeGeometry args={[18, 6]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh position={[-3.2, 2.6, -3.95]}>
        <planeGeometry args={[2.2, 2.6]} />
        <meshBasicMaterial color={cafe ? "#8ec5ff" : "#10163a"} />
      </mesh>
      {!cafe && (
        <mesh position={[-2.6, 3.3, -3.9]}>
          <circleGeometry args={[0.32, 20]} />
          <meshBasicMaterial color="#fff5c8" />
        </mesh>
      )}
      <M position={[-3.2, 2.6, -3.92]}>
        <boxGeometry args={[2.4, 2.8, 0.06]} />
        <meshStandardMaterial color="#2a1a10" />
      </M>
      <mesh position={[-3.2, 2.6, -3.88]}>
        <planeGeometry args={[2.2, 2.6]} />
        <meshBasicMaterial color={cafe ? "#8ec5ff" : "#10163a"} />
      </mesh>
      <mesh position={[2.6, 3.4, -3.92]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial map={clockTex} />
      </mesh>
      {sign === undefined && !cafe && <Sign position={[0.4, 3.6, -3.9]} size={[1.5, 1.0]} text="JANGAN MALAS" sub="DEADLINE" bg="#1d3557" fg="#f1faee" accent="#e63946" />}
      {sign === undefined && cafe && <Sign position={[0.4, 3.5, -3.9]} size={[2.2, 0.9]} text="WARUNG KOPI" sub="BUKA 24 JAM" bg="#3b2314" fg="#ffe9b0" accent="#ffb347" />}
      {sign && <Sign position={[0.4, 3.6, -3.9]} size={[1.9, 0.9]} text={sign[0]} sub={sign[1]} bg="#4a1d6a" fg="#ffe9b0" accent="#ff9ad6" />}
      {/* desk */}
      <M position={[1.1, 0.78, -2.6]}>
        <boxGeometry args={[3.4, 0.12, 1.3]} />
        <meshStandardMaterial map={planks} roughness={0.9} />
      </M>
      {[-0.5, 2.7].map((x, i) => (
        <M key={i} position={[x, 0.38, -2.6]}>
          <boxGeometry args={[0.12, 0.76, 1.1]} />
          <meshStandardMaterial color="#4a2a14" />
        </M>
      ))}
      {/* laptop */}
      {!cafe ? (
        <group position={[1.3, 0.86, -2.6]}>
          <M position={[0, 0.02, 0]}>
            <boxGeometry args={[1.1, 0.05, 0.75]} />
            <meshStandardMaterial color="#cfd3da" metalness={0.5} roughness={0.4} />
          </M>
          <group position={[0, 0.05, -0.34]} rotation={[-0.2, 0, 0]}>
            <M position={[0, 0.38, 0]}>
              <boxGeometry args={[1.1, 0.76, 0.05]} />
              <meshStandardMaterial color="#cfd3da" metalness={0.5} roughness={0.4} />
            </M>
            <mesh position={[0, 0.38, 0.03]}>
              <planeGeometry args={[1.0, 0.64]} />
              <meshBasicMaterial map={screenTex} toneMapped={false} />
            </mesh>
          </group>
        </group>
      ) : (
        <group position={[1.2, 0.86, -2.5]}>
          <M position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.16, 0.12, 0.24, 12]} />
            <meshStandardMaterial color="#f4f1ea" />
          </M>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.sin(t * 2 + i) * 0.03, 0.4 + i * 0.16 + ((t * 0.5 + i * 0.3) % 0.5) * 0.1, 0]} scale={0.8}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
          ))}
        </group>
      )}
      <M position={[-0.2, 1.1, -2.9]}>
        <cylinderGeometry args={[0.04, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ffb347" emissiveIntensity={0.9} />
      </M>
      {/* bed */}
      <M position={[-3.4, 0.3, -0.4]}>
        <boxGeometry args={[2.2, 0.6, 3.2]} />
        <meshStandardMaterial color={cafe ? "#5c3a22" : "#e07a5f"} roughness={0.9} />
      </M>
      <ambientLight intensity={cafe ? 0.9 : 0.5} color={cafe ? "#ffe0b0" : "#b9c4ff"} />
      <pointLight position={[-0.2, 2.2, -2.2]} intensity={cafe ? 60 : 55} distance={12} color="#ffb870" />
      <pointLight position={[1.3, 1.7, -1.6]} intensity={cafe ? 20 : 40} distance={7} color={cafe ? "#ffd9a0" : "#9fc2ff"} />
      <directionalLight position={[2, 5, 6]} intensity={cafe ? 1.8 : 1.0} color={cafe ? "#fff0d0" : "#c9d3ff"} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Router (a grumpy bouncer with LED eyes)                               */
/* ------------------------------------------------------------------ */
export const Router: React.FC<{ position: Vec3; t: number; scale?: number; mad?: number }> = ({ position, t, scale = 1, mad = 0 }) => {
  const leds = ["#4ade80", "#4ade80", "#facc15", "#4ade80", "#60a5fa"];
  return (
    <group position={position} scale={scale}>
      {[-1.1, 1.1].map((x, i) => (
        <M key={i} position={[x, 1.5, -0.1]} rotation={[0, 0, x * 0.1]}>
          <cylinderGeometry args={[0.05, 0.05, 1.8, 8]} />
          <meshStandardMaterial color="#222" />
        </M>
      ))}
      <M position={[0, 0.45, 0]}>
        <boxGeometry args={[3.0, 0.9, 1.3]} />
        <meshStandardMaterial color="#202833" roughness={0.5} />
      </M>
      {[-0.7, 0.7].map((x, i) => (
        <group key={i} position={[x, 0.55, 0.66]}>
          <mesh>
            <sphereGeometry args={[0.2, 12, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.17]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          <mesh position={[0, 0.27, 0.05]} rotation={[0, 0, -(x > 0 ? 1 : -1) * (0.15 + 0.4 * mad)]}>
            <boxGeometry args={[0.38, 0.07, 0.05]} />
            <meshBasicMaterial color="#111" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.2, 0.66]}>
        <boxGeometry args={[0.8, 0.07 + 0.05 * mad, 0.03]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {leds.map((c, i) => {
        const on = Math.sin(t * (7 + i * 1.3) + i) > -0.3;
        return (
          <mesh key={i} position={[-1.2 + i * 0.3, 0.82, 0.66]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={on ? c : "#22252b"} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Tube (fibre-optic cable seen from inside)                              */
/* ------------------------------------------------------------------ */
export const Tube: React.FC<{ t: number; speed?: number; color?: string }> = ({ t, speed = 30, color = "#38bdf8" }) => {
  const LEN = 90;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -30]}>
        <cylinderGeometry args={[2.6, 2.6, 160, 14, 1, true]} />
        <meshStandardMaterial color="#0b1b3d" side={THREE.BackSide} roughness={0.6} emissive="#0a2a60" emissiveIntensity={0.7} flatShading />
      </mesh>
      {new Array(30).fill(0).map((_, i) => {
        const z = ((i * 3 + t * speed) % LEN) - 64;
        return (
          <mesh key={i} position={[0, 0, z]}>
            <torusGeometry args={[2.5, 0.06, 6, 20]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#f0abfc" : color} />
          </mesh>
        );
      })}
      {new Array(14).fill(0).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const z = ((i * 6 + t * speed * 1.4) % LEN) - 64;
        return (
          <mesh key={`s${i}`} position={[Math.cos(a) * 2.3, Math.sin(a) * 2.3, z]}>
            <boxGeometry args={[0.06, 0.06, 3.2]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>
        );
      })}
      <ambientLight intensity={1.2} color="#8fb8ff" />
      <pointLight position={[0, 0, 2]} intensity={70} distance={20} color="#bfe3ff" />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Night street with utility poles                                       */
/* ------------------------------------------------------------------ */
export const NightCity: React.FC<{ t: number; kite?: number }> = ({ t, kite = 1 }) => {
  const windows = useTex("windows", 256, 512, (g) => {
    g.fillStyle = "#1b2347";
    g.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 8; x++) {
        const on = hash(x, y) > 0.55;
        g.fillStyle = on ? (hash(x + 9, y) > 0.5 ? "#ffd27a" : "#ffe9a8") : "#27305a";
        g.fillRect(x * 32 + 6, y * 32 + 6, 20, 20);
      }
  });
  const sand = useSand();
  const bldgs = useMemo(() => [-14, -9, -4.5, 7, 11.5, 16].map((x, i) => ({ x, h: 7 + hash(i, 3) * 8, w: 3 + hash(i, 4) * 2, z: -10 - hash(i, 5) * 4 })), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}>
        <planeGeometry args={[80, 40]} />
        <meshStandardMaterial map={sand} color="#6b6f9a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3]}>
        <planeGeometry args={[80, 4]} />
        <meshStandardMaterial color="#2a2d3d" roughness={1} />
      </mesh>
      {bldgs.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, 3]} />
          <meshStandardMaterial map={windows} roughness={0.9} />
        </mesh>
      ))}
      {[-9, -3, 3, 9].map((x, i) => (
        <group key={i} position={[x, 0, -5.5]}>
          <M position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 7, 8]} />
            <meshStandardMaterial color="#5a4632" roughness={0.9} />
          </M>
          <M position={[0, 6.4, 0]}>
            <boxGeometry args={[2.0, 0.12, 0.12]} />
            <meshStandardMaterial color="#5a4632" roughness={0.9} />
          </M>
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 6.35 - i * 0.12, -5.5 + (i - 1) * 0.05]}>
          <boxGeometry args={[40, 0.045, 0.045]} />
          <meshBasicMaterial color={i === 1 ? "#7dd3fc" : "#11131c"} />
        </mesh>
      ))}
      {kite > 0 && (
        <group position={[2.2, 5.6, -5.3]} rotation={[0, 0, 0.5 + Math.sin(t * 3) * 0.1]} scale={kite}>
          <mesh>
            <circleGeometry args={[0.5, 4]} />
            <meshBasicMaterial color="#ff4d6d" side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.sin(t * 4 + i) * 0.08, -0.7 - i * 0.28, 0]}>
              <boxGeometry args={[0.16, 0.1, 0.02]} />
              <meshBasicMaterial color={i % 2 ? "#ffd23f" : "#4cc9f0"} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[-12, 12, -28]}>
        <circleGeometry args={[2.4, 24]} />
        <meshBasicMaterial color="#fff5c8" />
      </mesh>
      {new Array(40).fill(0).map((_, i) => (
        <mesh key={i} position={[(hash(i, 1) - 0.5) * 60, 8 + hash(i, 2) * 14, -30]}>
          <circleGeometry args={[0.06 + hash(i, 3) * 0.06, 5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <ambientLight intensity={0.8} color="#9aa8ff" />
      <directionalLight position={[-6, 8, 6]} intensity={1.6} color="#c9d3ff" />
      <pointLight position={[0, 5, 3]} intensity={40} distance={14} color="#7dd3fc" />
      <fog attach="fog" args={["#141a3d", 14, 50]} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Seabed + shark                                                       */
/* ------------------------------------------------------------------ */
export const Shark: React.FC<{ position: Vec3; t: number; open?: number; scale?: number; rotationY?: number }> = ({ position, t, open = 0, scale = 1, rotationY = 0 }) => (
  <group position={position} scale={scale} rotation={[0, rotationY, Math.sin(t * 2) * 0.04]}>
    <M scale={[2.2, 0.7, 0.8]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color="#6f8fa8" roughness={0.6} flatShading />
    </M>
    <M position={[0.1, -0.15, 0.05]} scale={[1.9, 0.5, 0.78]}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color="#e7eef3" roughness={0.6} flatShading />
    </M>
    <M position={[0, 0.85, 0]} rotation={[0, 0, -0.2]}>
      <coneGeometry args={[0.32, 0.9, 4]} />
      <meshStandardMaterial color="#5c7a90" flatShading />
    </M>
    <group position={[-2.1, 0, 0]} rotation={[0, 0, Math.sin(t * 6) * 0.25]}>
      <M position={[-0.3, 0.3, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.35, 1.0, 4]} />
        <meshStandardMaterial color="#5c7a90" flatShading />
      </M>
      <M position={[-0.3, -0.3, 0]} rotation={[0, 0, 2.6]}>
        <coneGeometry args={[0.3, 0.8, 4]} />
        <meshStandardMaterial color="#5c7a90" flatShading />
      </M>
    </group>
    {/* jaw */}
    <group position={[1.7, -0.25, 0]} rotation={[0, 0, -open * 0.55]}>
      <M position={[0.3, 0, 0]} scale={[0.7, 0.14, 0.6]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#e7eef3" flatShading />
      </M>
      {[-0.3, -0.1, 0.1, 0.3].map((z, i) => (
        <mesh key={i} position={[0.55, 0.12, z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.06, 0.18, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
    {[-1, 1].map((s) => (
      <group key={s} position={[1.25, 0.28, s * 0.62]}>
        <mesh>
          <sphereGeometry args={[0.17, 10, 10]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.1, 0, s * 0.08]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      </group>
    ))}
  </group>
);

export const Underwater: React.FC<{ t: number }> = ({ t }) => {
  const sand = useSand();
  const fish = useMemo(() => new Array(14).fill(0).map((_, i) => ({ y: 1 + hash(i, 1) * 5, z: -6 - hash(i, 2) * 9, sp: 0.5 + hash(i, 3), ph: hash(i, 4) * 20, c: ["#ffb703", "#fb8500", "#8ecae6", "#ff6b6b"][i % 4] })), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}>
        <planeGeometry args={[80, 40]} />
        <meshStandardMaterial map={sand} color="#7aa8b8" roughness={1} />
      </mesh>
      {/* the cable lying on the seabed */}
      <M position={[0, 0.22, -2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 60, 10]} />
        <meshStandardMaterial color="#1b1b24" roughness={0.6} />
      </M>
      {new Array(20).fill(0).map((_, i) => (
        <mesh key={i} position={[-20 + i * 2, 0.22, -2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.235, 0.235, 0.3, 10]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      ))}
      {fish.map((f, i) => (
        <group key={i} position={[((t * f.sp * 2 + f.ph) % 30) - 15, f.y, f.z]} scale={0.5 + (i % 3) * 0.2}>
          <mesh scale={[1, 0.6, 0.4]}>
            <sphereGeometry args={[0.4, 8, 6]} />
            <meshBasicMaterial color={f.c} />
          </mesh>
          <mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.2, 0.3, 4]} />
            <meshBasicMaterial color={f.c} />
          </mesh>
        </group>
      ))}
      {[-8, -4.5, -1, 3, 6.5, 10].map((x, i) => (
        <mesh key={i} position={[x, 1.2, -5 - (i % 2) * 2]} rotation={[0, 0, Math.sin(t * 1.5 + i) * 0.12]}>
          <coneGeometry args={[0.2, 2.4 + (i % 3) * 0.6, 5]} />
          <meshStandardMaterial color="#2f9e6a" flatShading />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-8 + i * 5, 9, -9]} rotation={[0, 0, 0.35]}>
          <planeGeometry args={[1.2, 18]} />
          <meshBasicMaterial color="#d9fbff" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {new Array(30).fill(0).map((_, i) => (
        <mesh key={`b${i}`} position={[(hash(i, 7) - 0.5) * 18, ((t * (0.6 + hash(i, 8)) + hash(i, 9) * 9) % 9), -1 - hash(i, 10) * 6]}>
          <sphereGeometry args={[0.04 + hash(i, 11) * 0.06, 6, 6]} />
          <meshBasicMaterial color="#e8fbff" transparent opacity={0.55} />
        </mesh>
      ))}
      <ambientLight intensity={0.9} color="#7fd1e6" />
      <directionalLight position={[2, 9, 4]} intensity={1.6} color="#d9fbff" />
      <fog attach="fog" args={["#0b5f7a", 8, 34]} />
    </group>
  );
};

/** Cross-section of an armoured subsea cable, facing the camera. */
export const CableCut: React.FC<{ position: Vec3; t: number; hit?: number; scale?: number }> = ({ position, t, hit = 0, scale = 1 }) => (
  <group position={position} scale={scale} rotation={[Math.PI / 2, 0, 0]}>
    {[
      [1.5, "#9aa3ad"],
      [1.2, "#c2c7ce"],
      [0.9, "#b8651b"],
      [0.55, "#2b2b36"],
    ].map(([r, c], i) => (
      <mesh key={i} position={[0, 0.02 * i, 0]}>
        <cylinderGeometry args={[r as number, r as number, 0.6, 24]} />
        <meshStandardMaterial color={c as string} metalness={i < 2 ? 0.8 : 0.2} roughness={0.4} />
      </mesh>
    ))}
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.2, 0.2, 0.62, 12]} />
      <meshBasicMaterial color="#7dd3fc" />
    </mesh>
    {hit > 0 && (
      <mesh position={[1.5, 0.3, -0.4 + Math.sin(t * 40) * 0.05]} rotation={[0, 0, -0.9]} scale={1 + 0.2 * Math.sin(t * 30)}>
        <coneGeometry args={[0.18, 0.6, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    )}
  </group>
);

/* ------------------------------------------------------------------ */
/* Server room                                                           */
/* ------------------------------------------------------------------ */
export const ServerRoom: React.FC<{ t: number }> = ({ t }) => {
  const rack = useTex("rack", 256, 512, (g) => {
    g.fillStyle = "#12151c";
    g.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 20; y++) {
      g.fillStyle = "#1e232d";
      g.fillRect(8, 10 + y * 24, 240, 20);
      for (let x = 0; x < 8; x++) {
        const c = hash(x, y) > 0.7 ? "#facc15" : hash(x + 3, y) > 0.4 ? "#4ade80" : "#38bdf8";
        g.fillStyle = c;
        g.fillRect(16 + x * 14, 16 + y * 24, 8, 8);
      }
    }
  });
  const tiles = useTex("tiles", 256, 256, (g) => {
    g.fillStyle = "#cfd8e3";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#b9c4d2";
    g.fillRect(0, 0, 128, 128);
    g.fillRect(128, 128, 128, 128);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 4;
    g.strokeRect(0, 0, 256, 256);
  }, [14, 14]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial map={tiles} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 4, -18]}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color="#1c2b45" />
      </mesh>
      {[-1, 1].flatMap((s) =>
        new Array(6).fill(0).map((_, i) => (
          <M key={`${s}${i}`} position={[s * 3.2, 2.0, -2 - i * 2.4]}>
            <boxGeometry args={[1.5, 4, 1.0]} />
            <meshStandardMaterial map={rack} roughness={0.5} metalness={0.3} />
          </M>
        ))
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 3.2, 0.3, -6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 14]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.15 + 0.1 * Math.sin(t * 3)} />
        </mesh>
      ))}
      {/* ceiling cable tray */}
      <mesh position={[0, 4.6, -8]}>
        <boxGeometry args={[3.4, 0.2, 20]} />
        <meshStandardMaterial color="#394253" />
      </mesh>
      {/* spinning cooling fans */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.4, 3.2, -9]} rotation={[0, s * -Math.PI / 2, 0]}>
          <group rotation={[0, 0, t * 9]}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]}>
                <boxGeometry args={[0.15, 0.9, 0.04]} />
                <meshBasicMaterial color="#e5eefc" />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      <ambientLight intensity={0.9} color="#a9c8ff" />
      <pointLight position={[0, 3.8, 0]} intensity={70} distance={14} color="#cfe6ff" />
      <pointLight position={[0, 1.5, -8]} intensity={60} distance={14} color="#60a5fa" />
      <fog attach="fog" args={["#16243d", 8, 30]} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Cell tower on a hill                                                  */
/* ------------------------------------------------------------------ */
export const BtsHill: React.FC<{ t: number; wave?: number }> = ({ t, wave = 0 }) => {
  const sand = useSand();
  return (
    <group>
      <mesh position={[0, -1.2, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[70, 40]} />
        <meshStandardMaterial map={sand} color="#4b6a5a" roughness={1} />
      </mesh>
      <mesh position={[0, -1.4, -6]} scale={[10, 3.4, 8]}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshStandardMaterial color="#3e7a4f" roughness={1} flatShading />
      </mesh>
      <group position={[0, 1.8, -6]}>
        {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => (
          <M key={i} position={[x * 0.9, 4, z * 0.9]} rotation={[z * 0.06, 0, -x * 0.06]}>
            <cylinderGeometry args={[0.05, 0.08, 8, 5]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.5} roughness={0.5} />
          </M>
        ))}
        {[1, 2.4, 3.8, 5.2, 6.6].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[1.0 - i * 0.1, 0.05, 1.0 - i * 0.1]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <M key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.6, 8.0, Math.sin((i * 2 * Math.PI) / 3) * 0.6]} rotation={[0, -(i * 2 * Math.PI) / 3, 0]}>
            <boxGeometry args={[0.2, 1.0, 0.1]} />
            <meshStandardMaterial color="#f8fafc" />
          </M>
        ))}
        <mesh position={[0, 8.7, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={Math.sin(t * 6) > 0 ? "#ff3b30" : "#661515"} />
        </mesh>
        {wave > 0 &&
          [0, 1, 2, 3].map((i) => {
            const k = ((t * 0.9 + i * 0.25) % 1) * wave;
            return (
              <mesh key={i} position={[0, 8.0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.6 + k * 7}>
                <torusGeometry args={[1, 0.05, 6, 28]} />
                <meshBasicMaterial color="#7dd3fc" transparent opacity={0.8 * (1 - k)} />
              </mesh>
            );
          })}
      </group>
      {new Array(40).fill(0).map((_, i) => (
        <mesh key={i} position={[(hash(i, 1) - 0.5) * 60, 8 + hash(i, 2) * 14, -30]}>
          <circleGeometry args={[0.06 + hash(i, 3) * 0.06, 5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh position={[10, 12, -28]}>
        <circleGeometry args={[2.4, 24]} />
        <meshBasicMaterial color="#fff5c8" />
      </mesh>
      <ambientLight intensity={0.8} color="#9aa8ff" />
      <directionalLight position={[6, 8, 6]} intensity={1.6} color="#c9d3ff" />
      <fog attach="fog" args={["#141a3d", 18, 60]} />
    </group>
  );
};
export { sm, cl };

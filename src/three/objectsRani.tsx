import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Vec3 } from "./objects";

/** Mesh that always casts and receives shadows. */
const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;

/* ------------------------------------------------------------------ */
/* Person v2: capsule limbs, jointed arms, a face that can emote, a     */
/* head that turns, and hair that can lie flat or stand and lean.        */
/* ------------------------------------------------------------------ */
export type HairStyle = "short" | "bald" | "ponytail" | "bun";
export type Expr = "neutral" | "surprised" | "worried" | "happy" | "smug";

export const Person: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  skin?: string;
  shirt?: string;
  pants?: string;
  hair?: string;
  style?: HairStyle;
  hairUp?: number; // 0..1
  lean?: [number, number];
  walking?: boolean;
  walkF?: number;
  armsUp?: number;
  pointArm?: number;
  shake?: number;
  apron?: string;
  seed?: string;
  expr?: Expr;
  look?: number; // head yaw (rad)
  jump?: number; // 0..1 hop
  hand?: string; // little accessory colour held in left hand (e.g. plastic bag)
}> = ({
  position,
  rotationY = 0,
  scale = 1,
  t,
  skin = "#c89068",
  shirt = "#3b82c4",
  pants = "#3b3f63",
  hair = "#1c1410",
  style = "short",
  hairUp = 0,
  lean = [0, 0],
  walking = false,
  walkF = 2.0,
  armsUp = 0,
  pointArm = 0,
  shake = 0,
  apron,
  seed = "p",
  expr = "neutral",
  look = 0,
  jump = 0,
}) => {
  const ph = Math.PI * walkF * t;
  const c = walking ? Math.cos(ph) : 0;
  const bob = (walking ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(t * 2.2 + seed.length) * 0.008) + jump * 0.22;
  const jx = shake * Math.sin(t * 60) * 0.05;
  const R = 0.2;
  const headY = 1.6;
  const breathe = 1 + Math.sin(t * 2.2 + seed.length) * 0.012;

  const strands = useMemo(() => {
    if (style === "bald") return [];
    const N = style === "ponytail" ? 28 : style === "bun" ? 18 : 34;
    return new Array(N).fill(0).map((_, i) => ({
      phi: i * 2.399963 + random(`${seed}-p${i}`) * 0.4,
      theta: Math.acos(1 - ((i + 0.5) / N) * 0.88),
      j1: random(`${seed}-a${i}`) - 0.5,
      j2: random(`${seed}-b${i}`) - 0.5,
      ph: random(`${seed}-c${i}`) * 6,
    }));
  }, [style, seed]);

  const strandMeshes = strands.map((s, i) => {
    const p = new THREE.Vector3(R * Math.sin(s.theta) * Math.cos(s.phi), R * Math.cos(s.theta) * 1.04, R * Math.sin(s.theta) * Math.sin(s.phi));
    const n = p.clone().normalize();
    const lying = n.clone().add(new THREE.Vector3(0, -0.85, 0)).normalize();
    const stand = new THREE.Vector3(s.j1 * 0.35 + lean[0] * 0.55 + Math.sin(t * 11 + s.ph) * 0.05, 1, s.j2 * 0.35 + lean[1] * 0.55 + Math.cos(t * 9 + s.ph) * 0.05).normalize();
    const dir = lying.clone().lerp(stand, hairUp).normalize();
    const len = 0.08 + 0.11 * hairUp;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const pos = p.clone().add(dir.clone().multiplyScalar(len / 2));
    return (
      <M key={i} position={[pos.x, pos.y, pos.z]} quaternion={[q.x, q.y, q.z, q.w]}>
        <coneGeometry args={[0.017, len, 4]} />
        <meshStandardMaterial color={hair} roughness={0.9} flatShading />
      </M>
    );
  });

  // expression -> brow tilt / height, mouth shape
  const brow = expr === "worried" ? { tilt: 0.38, y: 0.105 } : expr === "surprised" ? { tilt: 0, y: 0.14 } : expr === "smug" ? { tilt: -0.18, y: 0.1 } : expr === "happy" ? { tilt: -0.1, y: 0.112 } : { tilt: 0, y: 0.1 };

  const arm = (side: number) => {
    const swing = walking ? -side * 0.5 * c : 0;
    const up = -armsUp * 2.7;
    const point = side > 0 ? -pointArm * 1.45 : 0;
    const bend = side > 0 && pointArm > 0.05 ? -0.1 : -0.25 - armsUp * 0.2;
    return (
      <group key={side} position={[side * 0.3, 1.4, 0]} rotation={[swing + up + point, 0, side * (0.07 + armsUp * 0.32)]}>
        <M position={[0, -0.14, 0]}>
          <capsuleGeometry args={[0.05, 0.22, 4, 8]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </M>
        <group position={[0, -0.29, 0]} rotation={[bend, 0, 0]}>
          <M position={[0, -0.13, 0]}>
            <capsuleGeometry args={[0.042, 0.2, 4, 8]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </M>
          <M position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </M>
        </group>
      </group>
    );
  };

  return (
    <group position={[position[0] + jx, position[1] + bob, position[2]]} rotation={[0, rotationY, shake * Math.sin(t * 50) * 0.06]} scale={scale}>
      {/* legs */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.1, 0.9, 0]} rotation={[sd * 0.55 * c, 0, 0]}>
          <M position={[0, -0.42, 0]}>
            <capsuleGeometry args={[0.075, 0.68, 4, 8]} />
            <meshStandardMaterial color={pants} roughness={0.9} />
          </M>
          <M position={[0, -0.86, 0.045]}>
            <boxGeometry args={[0.13, 0.07, 0.26]} />
            <meshStandardMaterial color="#2a211c" roughness={0.9} />
          </M>
        </group>
      ))}
      {/* torso (slightly breathing) */}
      <group scale={[1, breathe, 1]}>
        <M position={[0, 1.2, 0]} scale={[1, 1, 0.68]}>
          <capsuleGeometry args={[0.22, 0.26, 6, 12]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </M>
        {apron && (
          <M position={[0, 1.1, 0.145]}>
            <boxGeometry args={[0.4, 0.46, 0.02]} />
            <meshStandardMaterial color={apron} roughness={0.9} />
          </M>
        )}
      </group>
      <M position={[0, 1.46, 0]}>
        <cylinderGeometry args={[0.055, 0.065, 0.1, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </M>
      {arm(-1)}
      {arm(1)}
      {/* head */}
      <group position={[0, headY, 0]} rotation={[0, look + Math.sin(t * 0.8 + seed.length) * 0.05, 0]}>
        <M scale={[0.95, 1.05, 0.97]}>
          <sphereGeometry args={[R, 16, 12]} />
          <meshStandardMaterial color={skin} roughness={0.75} />
        </M>
        {[-1, 1].map((sd) => (
          <M key={sd} position={[sd * 0.195, -0.01, 0]} scale={[0.5, 1, 0.8]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </M>
        ))}
        <M position={[0, -0.02, 0.2]} scale={[1, 0.9, 1]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </M>
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <mesh position={[sd * 0.075, 0.035, 0.175]}>
              <sphereGeometry args={[expr === "surprised" ? 0.047 : 0.04, 10, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </mesh>
            <mesh position={[sd * 0.075 + Math.sin(look) * 0.01, 0.033, 0.208]}>
              <sphereGeometry args={[expr === "surprised" ? 0.017 : 0.022, 8, 8]} />
              <meshBasicMaterial color="#17110d" />
            </mesh>
            <mesh position={[sd * 0.075, brow.y, 0.185]} rotation={[0, 0, -sd * brow.tilt]}>
              <boxGeometry args={[0.085, 0.017, 0.014]} />
              <meshStandardMaterial color={style === "bald" ? "#3a2a20" : hair} roughness={1} />
            </mesh>
          </group>
        ))}
        {/* mouth */}
        {expr === "surprised" && (
          <mesh position={[0, -0.085, 0.19]} scale={[1, 1.4, 0.4]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshBasicMaterial color="#3a0f12" />
          </mesh>
        )}
        {(expr === "happy" || expr === "smug") && (
          <mesh position={[expr === "smug" ? 0.015 : 0, -0.065, 0.192]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.04, 0.008, 6, 14, Math.PI]} />
            <meshBasicMaterial color="#5a1f22" />
          </mesh>
        )}
        {expr === "worried" && (
          <mesh position={[0, -0.1, 0.192]}>
            <torusGeometry args={[0.032, 0.008, 6, 14, Math.PI]} />
            <meshBasicMaterial color="#5a1f22" />
          </mesh>
        )}
        {expr === "neutral" && (
          <mesh position={[0, -0.08, 0.192]}>
            <boxGeometry args={[0.065, 0.012, 0.01]} />
            <meshBasicMaterial color="#5a1f22" />
          </mesh>
        )}
        {/* hair */}
        {strandMeshes}
        {style === "ponytail" && (
          <M position={[0, -0.02, -R - 0.05]} rotation={[0.5 - hairUp * 0.5, 0, 0]}>
            <coneGeometry args={[0.065, 0.36, 6]} />
            <meshStandardMaterial color={hair} flatShading />
          </M>
        )}
        {style === "bun" && (
          <M position={[0, 0.2, -0.05]}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial color={hair} flatShading />
          </M>
        )}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Canvas textures                                                      */
/* ------------------------------------------------------------------ */
const useChecker = (a: string, b: string) =>
  useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const g = cv.getContext("2d")!;
    g.fillStyle = a;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = b;
    g.fillRect(0, 0, 128, 128);
    g.fillRect(128, 128, 128, 128);
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.lineWidth = 3;
    g.strokeRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [a, b]);

const useSign = (text: string, bg: string, fg: string) =>
  useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = 256;
    const g = cv.getContext("2d")!;
    g.fillStyle = bg;
    g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = fg;
    g.lineWidth = 10;
    g.strokeRect(14, 14, 996, 228);
    g.fillStyle = fg;
    g.font = "bold 150px Anton, Impact, 'DejaVu Sans', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 512, 138);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text, bg, fg]);

/* ------------------------------------------------------------------ */
/* The warung and the street around it.                                  */
/* Interior: x -3..3, z -2.7..2.2. Front opens to the sidewalk (z>2.2).  */
/* ------------------------------------------------------------------ */
export const WarungWorld: React.FC<{ t: number; rain?: number; fanSpeed?: number }> = ({ t, rain = 0, fanSpeed = 7 }) => {
  const floorTex = useChecker("#d6efe2", "#7fc8a9");
  floorTex.repeat.set(6, 4.6);
  const roadTex = useChecker("#3a3f47", "#40454d");
  roadTex.repeat.set(30, 30);
  const sign = useSign("WARUNG BU RATMI", "#c0392b", "#fff3c4");
  const wet = rain > 0.5;
  const goods = useMemo(() => new Array(24).fill(0).map((_, i) => ({ x: -2.3 + (i % 8) * 0.66, y: 0.52 + Math.floor(i / 8) * 0.72, c: ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#457b9d", "#9b5de5", "#06d6a0"][(i * 5) % 7] })), []);
  const snacks = useMemo(() => new Array(16).fill(0).map((_, i) => ({ x: -2.7 + i * 0.36, c: ["#ff5d8f", "#ffd166", "#06d6a0", "#4cc9f0", "#ff9f1c"][i % 5], ph: random(`sn${i}`) * 6 })), []);
  return (
    <group>
      {/* interior floor (glossy vinyl) */}
      <M position={[0, 0, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 4.9]} />
        <meshStandardMaterial map={floorTex} roughness={0.22} metalness={0.05} />
      </M>
      {/* sidewalk */}
      <M position={[0, -0.02, 3.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[18, 1.6, 0.06]} />
        <meshStandardMaterial color={wet ? "#8a8f96" : "#c9c4b8"} roughness={0.9} />
      </M>
      {/* road */}
      <M position={[0, -0.05, 17]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial map={roadTex} color={wet ? "#9aa3ad" : "#ffffff"} roughness={wet ? 0.25 : 0.85} />
      </M>
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[-12 + i * 3.4, -0.03, 11]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.14]} />
          <meshBasicMaterial color="#e9e2b8" />
        </mesh>
      ))}
      {/* back wall */}
      <M position={[0, 2.0, -2.75]}>
        <boxGeometry args={[6.2, 4, 0.15]} />
        <meshStandardMaterial color={wet ? "#c8cfd6" : "#f4e4c4"} roughness={1} />
      </M>
      {/* side walls with windows */}
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <M position={[sd * 3.1, 2.0, -0.25]}>
            <boxGeometry args={[0.15, 4, 5.1]} />
            <meshStandardMaterial color={wet ? "#bfc7cf" : "#efd9b0"} roughness={1} />
          </M>
          <mesh position={[sd * 3.0, 2.3, 0.2]}>
            <planeGeometry args={[1.3, 1.0]} />
            <meshBasicMaterial color={wet ? "#9fb4c8" : "#bfe4ff"} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[sd * 3.02, 2.3, 0.2]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[1.4, 0.06, 0.04]} />
            <meshStandardMaterial color="#6b4a2a" />
          </mesh>
        </group>
      ))}
      {/* ceiling beams + fan */}
      {[-1.8, -0.2, 1.4].map((z) => (
        <M key={z} position={[0, 3.72, z]}>
          <boxGeometry args={[6.2, 0.16, 0.2]} />
          <meshStandardMaterial color="#6b4423" roughness={0.9} />
        </M>
      ))}
      <group position={[0, 3.5, -0.4]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <group position={[0, -0.22, 0]} rotation={[0, t * fanSpeed, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <M key={i} position={[Math.cos((i * Math.PI) / 2) * 0.45, 0, Math.sin((i * Math.PI) / 2) * 0.45]} rotation={[0, -(i * Math.PI) / 2, 0.05]}>
              <boxGeometry args={[0.8, 0.02, 0.17]} />
              <meshStandardMaterial color="#c9a46a" roughness={0.8} />
            </M>
          ))}
        </group>
      </group>
      {/* hanging snacks at the front edge */}
      {snacks.map((s, i) => (
        <group key={i} position={[s.x, 3.35, 2.05]} rotation={[Math.sin(t * 1.8 + s.ph) * 0.08, 0, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <boxGeometry args={[0.02, 0.56, 0.01]} />
            <meshStandardMaterial color="#d9d9d9" />
          </mesh>
          <M position={[0, -0.62, 0]}>
            <boxGeometry args={[0.24, 0.32, 0.03]} />
            <meshStandardMaterial color={s.c} roughness={0.5} metalness={0.2} />
          </M>
        </group>
      ))}
      {/* back shelves + goods */}
      {[0, 1, 2].map((r) => (
        <M key={r} position={[0, 0.28 + r * 0.72, -2.4]}>
          <boxGeometry args={[5.4, 0.04, 0.55]} />
          <meshStandardMaterial color="#c7a06b" roughness={0.8} />
        </M>
      ))}
      {goods.map((g, i) => (
        <M key={i} position={[g.x, g.y + 0.2, -2.38]}>
          <boxGeometry args={[0.4, 0.38, 0.32]} />
          <meshStandardMaterial color={g.c} roughness={0.6} flatShading />
        </M>
      ))}
      {/* fridge */}
      <M position={[2.55, 0.95, -2.0]}>
        <boxGeometry args={[0.8, 1.9, 0.7]} />
        <meshStandardMaterial color="#f2f6f8" roughness={0.3} metalness={0.2} />
      </M>
      <mesh position={[2.55, 1.2, -1.64]}>
        <planeGeometry args={[0.6, 1.0]} />
        <meshBasicMaterial color="#cfeaff" transparent opacity={0.65} />
      </mesh>
      {/* counter, register, jars */}
      <M position={[1.45, 0.47, -1.15]}>
        <boxGeometry args={[1.9, 0.94, 0.8]} />
        <meshStandardMaterial color="#8a5a35" roughness={0.9} />
      </M>
      <M position={[1.45, 0.97, -1.15]}>
        <boxGeometry args={[2.0, 0.07, 0.9]} />
        <meshStandardMaterial color="#d9a066" roughness={0.6} />
      </M>
      <M position={[0.95, 1.12, -1.2]}>
        <boxGeometry args={[0.32, 0.22, 0.28]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </M>
      {[1.75, 1.95, 2.15].map((x, i) => (
        <M key={x} position={[x, 1.12, -1.05]}>
          <cylinderGeometry args={[0.07, 0.07, 0.24, 10]} />
          <meshStandardMaterial color={["#ff9f1c", "#e63946", "#2a9d8f"][i]} roughness={0.4} />
        </M>
      ))}
      {/* front awning: striped roof + sign */}
      {[...Array(10)].map((_, i) => (
        <M key={i} position={[-2.7 + i * 0.6, 3.75, 3.0]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.6, 0.08, 2.4]} />
          <meshStandardMaterial color={i % 2 ? "#ffffff" : "#d62828"} roughness={0.8} />
        </M>
      ))}
      <mesh position={[0, 3.35, 2.1]}>
        <planeGeometry args={[3.6, 0.9]} />
        <meshBasicMaterial map={sign} />
      </mesh>
      {/* iron awning posts */}
      {[-1, 1].map((sd) => (
        <M key={sd} position={[sd * 2.8, 1.8, 3.6]}>
          <cylinderGeometry args={[0.06, 0.06, 3.6, 8]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.25} roughness={0.45} />
        </M>
      ))}
      {/* potted plants */}
      {[-2.6, 2.6].map((x) => (
        <group key={x} position={[x, 0, 2.7]}>
          <M position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.2, 0.15, 0.4, 10]} />
            <meshStandardMaterial color="#b5653a" roughness={0.9} />
          </M>
          {[0, 1, 2, 3, 4].map((i) => (
            <M key={i} position={[Math.cos(i * 1.3) * 0.13, 0.55 + (i % 3) * 0.1, Math.sin(i * 1.3) * 0.13]}>
              <icosahedronGeometry args={[0.17, 0]} />
              <meshStandardMaterial color="#3f9b4a" roughness={0.9} flatShading />
            </M>
          ))}
        </group>
      ))}
      {/* across the street: shops, trees, power pole, parked motorbike */}
      {[-9, -2.2, 5.2].map((x, i) => (
        <group key={x} position={[x, 0, 21]}>
          <M position={[0, 2.6, 0]}>
            <boxGeometry args={[6.4, 5.2, 4]} />
            <meshStandardMaterial color={["#e9c8a6", "#a8d5ba", "#f2b8a2"][i]} roughness={0.95} />
          </M>
          <M position={[0, 1.2, -2.05]}>
            <boxGeometry args={[4.2, 2.4, 0.1]} />
            <meshStandardMaterial color="#7a8896" roughness={0.6} metalness={0.3} />
          </M>
          <M position={[0, 5.4, 0]}>
            <boxGeometry args={[6.8, 0.4, 4.4]} />
            <meshStandardMaterial color="#8c4a2f" roughness={0.9} />
          </M>
        </group>
      ))}
      {[-5.5, 7].map((x, i) => (
        <group key={x} position={[x, 0, 7.5]}>
          <M position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.18, 0.26, 2.8, 8]} />
            <meshStandardMaterial color="#6a4a2e" roughness={1} />
          </M>
          {[[0, 3.4, 0, 1.3], [-0.8, 3.0, 0.2, 0.9], [0.8, 3.1, -0.2, 1.0]].map(([x2, y, z, r], k) => (
            <M key={k} position={[x2, y, z]}>
              <icosahedronGeometry args={[r, 1]} />
              <meshStandardMaterial color={i ? "#4a9d4f" : "#3f8f4a"} roughness={0.9} flatShading />
            </M>
          ))}
        </group>
      ))}
      <group position={[4.6, 0, 4.4]}>
        <M position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.09, 0.12, 6.4, 8]} />
          <meshStandardMaterial color="#7a766e" roughness={0.9} />
        </M>
        <M position={[0, 6.2, 0]}>
          <boxGeometry args={[2.2, 0.1, 0.1]} />
          <meshStandardMaterial color="#7a766e" />
        </M>
      </group>
      <Motorbike position={[-4.3, 0, 3.4]} rotationY={0.5} />
      {/* iron fence + gate post (where Rani discharges) */}
      <group position={[0, 0, 4.15]}>
        <M position={[2.2, 0.9, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 1.8, 10]} />
          <meshStandardMaterial color="#9aa5b1" metalness={0.3} roughness={0.4} />
        </M>
        {[0.55, 1.35].map((y) => (
          <M key={y} position={[3.2, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 2.0, 8]} />
            <meshStandardMaterial color="#9aa5b1" metalness={0.3} roughness={0.4} />
          </M>
        ))}
        {[2.6, 3.0, 3.4, 3.8, 4.2].map((x) => (
          <M key={x} position={[x - 0.4, 0.9, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.8, 6]} />
            <meshStandardMaterial color="#9aa5b1" metalness={0.3} roughness={0.4} />
          </M>
        ))}
      </group>
    </group>
  );
};

/** Iron display rack inside the shop (the "rak besi"). */
export const IronRack: React.FC<{ position: Vec3 }> = ({ position }) => {
  const chips = useMemo(() => new Array(9).fill(0).map((_, i) => ({ x: -0.28 + (i % 3) * 0.28, y: 0.35 + Math.floor(i / 3) * 0.55, c: ["#ff9f1c", "#e63946", "#4cc9f0", "#ffd166"][i % 4] })), []);
  return (
    <group position={position}>
      {[-0.42, 0.42].map((x) => (
        <M key={x} position={[x, 0.95, 0]}>
          <boxGeometry args={[0.06, 1.9, 0.5]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.3} roughness={0.4} />
        </M>
      ))}
      {[0.15, 0.7, 1.25, 1.8].map((y) => (
        <M key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.9, 0.04, 0.5]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.3} roughness={0.4} />
        </M>
      ))}
      {chips.map((c, i) => (
        <M key={i} position={[c.x, c.y + 0.2, 0.05]}>
          <boxGeometry args={[0.22, 0.32, 0.12]} />
          <meshStandardMaterial color={c.c} roughness={0.5} metalness={0.2} />
        </M>
      ))}
    </group>
  );
};

export const Motorbike: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {[-0.55, 0.55].map((z) => (
      <M key={z} position={[0, 0.3, z]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.28, 0.08, 8, 16]} />
        <meshStandardMaterial color="#222" roughness={0.9} />
      </M>
    ))}
    <M position={[0, 0.5, 0]}>
      <boxGeometry args={[0.22, 0.2, 0.9]} />
      <meshStandardMaterial color="#d62828" roughness={0.4} metalness={0.4} />
    </M>
    <M position={[0, 0.72, -0.12]}>
      <boxGeometry args={[0.24, 0.1, 0.5]} />
      <meshStandardMaterial color="#222" roughness={0.8} />
    </M>
    <M position={[0, 0.9, 0.5]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
      <meshStandardMaterial color="#999" metalness={0.6} roughness={0.3} />
    </M>
  </group>
);

/** Basket of seven kinds of flowers. */
export const FlowerBasket: React.FC<{ position: Vec3; scale?: number; pop?: number }> = ({ position, scale = 1, pop = 1 }) => {
  const flowers = useMemo(() => new Array(18).fill(0).map((_, i) => ({ x: (random(`fb-x${i}`) - 0.5) * 0.38, z: (random(`fb-z${i}`) - 0.5) * 0.32, y: 0.22 + random(`fb-y${i}`) * 0.14, c: ["#ff5d8f", "#ffd166", "#ffffff", "#c77dff", "#ff9f1c", "#06d6a0", "#ef476f"][i % 7] })), []);
  return (
    <group position={position} scale={scale * pop}>
      <M position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.25, 0.18, 0.26, 12]} />
        <meshStandardMaterial color="#b5793c" roughness={1} flatShading />
      </M>
      {flowers.map((f, i) => (
        <M key={i} position={[f.x, f.y + 0.12, f.z]}>
          <icosahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial color={f.c} roughness={0.8} flatShading />
        </M>
      ))}
    </group>
  );
};

export const FloorMat: React.FC<{ position: Vec3; grow?: number }> = ({ position, grow = 1 }) => (
  <group position={position} scale={[grow, 1, grow]}>
    <M position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.6, 2.2]} />
      <meshStandardMaterial color="#d98e3f" roughness={1} />
    </M>
    {[-0.7, 0, 0.7].map((z) => (
      <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, z]}>
        <planeGeometry args={[3.6, 0.13]} />
        <meshStandardMaterial color="#8b4a1b" roughness={1} />
      </mesh>
    ))}
  </group>
);

/** A little burst of static discharge. */
export const Spark: React.FC<{ position: Vec3; s: number; seed?: string }> = ({ position, s, seed = "sp" }) => {
  if (s <= 0.02) return null;
  const rays = new Array(10).fill(0).map((_, i) => ({ a: (i / 10) * Math.PI * 2 + random(`${seed}${i}`) * 0.5, l: 0.25 + random(`${seed}l${i}`) * 0.3 }));
  return (
    <group position={position} scale={s}>
      {rays.map((r, i) => (
        <mesh key={i} position={[Math.cos(r.a) * r.l * 0.5, Math.sin(r.a) * r.l * 0.5, 0.1]} rotation={[0, 0, r.a - Math.PI / 2]}>
          <boxGeometry args={[0.035, r.l, 0.02]} />
          <meshBasicMaterial color={i % 2 ? "#fff6b0" : "#ffe14d"} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.1]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight position={[0, 0, 0.5]} intensity={16 * s} distance={5} color="#fff2a8" />
    </group>
  );
};

/** Floating "+" charge symbols. */
export const ChargePlus: React.FC<{ origin: Vec3; t: number; amount: number; spread?: number; seed?: string }> = ({ origin, t, amount, spread = 0.55, seed = "cp" }) => {
  const n = Math.round(16 * amount);
  return (
    <group>
      {new Array(n).fill(0).map((_, i) => {
        const a = random(`${seed}a${i}`) * Math.PI * 2;
        const r = 0.15 + random(`${seed}r${i}`) * spread;
        const life = (t * 0.5 + random(`${seed}t${i}`)) % 1;
        const x = origin[0] + Math.cos(a) * r;
        const y = origin[1] + (random(`${seed}y${i}`) - 0.3) * 1.3 + Math.sin(t * 2 + i) * 0.04;
        const z = origin[2] + Math.sin(a) * r * 0.6 + 0.28;
        return (
          <group key={i} position={[x, y, z]} scale={0.7 + 0.3 * Math.sin(life * Math.PI)}>
            <mesh>
              <boxGeometry args={[0.14, 0.035, 0.02]} />
              <meshBasicMaterial color="#ffd23f" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.035, 0.14, 0.02]} />
              <meshBasicMaterial color="#ffd23f" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Soft clouds + sun disc for the sky. */
export const SkyProps: React.FC<{ t: number; mood: "sun" | "rain" | "golden" }> = ({ t, mood }) => {
  const clouds = useMemo(() => new Array(7).fill(0).map((_, i) => ({ x: -26 + i * 9 + random(`cl${i}`) * 4, y: 14 + random(`cy${i}`) * 5, s: 2.5 + random(`cs${i}`) * 2 })), []);
  const col = mood === "rain" ? "#8f9aa6" : mood === "golden" ? "#ffd9b0" : "#ffffff";
  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x + t * 0.25, c.y, 40]} scale={c.s}>
          {[[0, 0, 0, 1.3], [1.2, -0.1, 0, 1.0], [-1.2, -0.1, 0, 1.0], [0.4, 0.5, 0, 0.9]].map(([x, y, z, r], k) => (
            <mesh key={k} position={[x, y, z]}>
              <sphereGeometry args={[r, 10, 8]} />
              <meshBasicMaterial color={col} transparent opacity={mood === "rain" ? 0.95 : 0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {mood !== "rain" && (
        <mesh position={[-14, mood === "golden" ? 7 : 16, 45]}>
          <sphereGeometry args={[2.3, 16, 16]} />
          <meshBasicMaterial color={mood === "golden" ? "#ffb15c" : "#fff4c2"} />
        </mesh>
      )}
    </group>
  );
};

export { THREE };

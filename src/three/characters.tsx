import React from "react";
import { Vec3 } from "./objects";

export type HairStyle3D = "short" | "spiky" | "bald" | "bun" | "long" | "bob" | "hijab";
export type HatStyle3D = "none" | "peci" | "cap";
export type GlassesStyle3D = "none" | "round" | "square";
export type FacialHair3D = "none" | "mustache" | "goatee";
export type OutfitStyle3D = "shirt" | "singlet" | "batik" | "apron" | "jacket" | "sarung" | "dress" | "school";
export type Expression3D = "neutral" | "happy" | "shocked" | "angry" | "worried";

export interface CharacterConfig {
  id: string;
  label: string;
  skinColor?: string;
  hairColor?: string;
  hijabColor?: string;
  shirtColor?: string;
  pantsColor?: string;
  shoeColor?: string;
  hairStyle?: HairStyle3D;
  hat?: HatStyle3D;
  glasses?: GlassesStyle3D;
  facialHair?: FacialHair3D;
  outfit?: OutfitStyle3D;
  expression?: Expression3D;
}

export interface CartoonCharacter3DProps extends Omit<CharacterConfig, "id" | "label"> {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  walkPhase?: number;
}

export const CartoonCharacter3D: React.FC<CartoonCharacter3DProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  walkPhase = 0,
  skinColor = "#e5b084",
  hairColor = "#1f1f24",
  hijabColor = "#d98880",
  shirtColor = "#3b7dd8",
  pantsColor = "#243242",
  shoeColor = "#3aa655",
  hairStyle = "short",
  hat = "none",
  glasses = "none",
  facialHair = "none",
  outfit = "shirt",
  expression = "neutral",
}) => {
  const legSwing = Math.sin(walkPhase) * 0.35;
  const armSwing = Math.sin(walkPhase) * 0.3;
  const sleeveColor = outfit === "singlet" ? skinColor : shirtColor;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ================= LEGS / SARUNG / DRESS ================= */}
      {outfit === "sarung" ? (
        <group position={[0, 0.52, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.31, 0.35, 0.82, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.85} />
          </mesh>
          {/* Sarung horizontal stripe */}
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.34, 0.345, 0.08, 16]} />
            <meshStandardMaterial color="#111111" roughness={0.9} transparent opacity={0.25} />
          </mesh>
        </group>
      ) : outfit === "dress" ? (
        <group>
          <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.42, 0.68, 16]} />
            <meshStandardMaterial color={shirtColor} roughness={0.75} />
          </mesh>
          {[-0.14, 0.14].map((x, idx) => (
            <mesh key={idx} position={[x, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.07, 0.32, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.75} />
            </mesh>
          ))}
        </group>
      ) : (
        <>
          {/* Left Leg */}
          <group position={[-0.15, 0.85, 0]} rotation={[legSwing, 0, 0]}>
            <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
              <capsuleGeometry args={[0.105, 0.5, 6, 12]} />
              <meshStandardMaterial color={pantsColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.72, 0.06]} castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.14, 0.32]} />
              <meshStandardMaterial color={shoeColor} roughness={0.65} />
            </mesh>
          </group>
          {/* Right Leg */}
          <group position={[0.15, 0.85, 0]} rotation={[-legSwing, 0, 0]}>
            <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
              <capsuleGeometry args={[0.105, 0.5, 6, 12]} />
              <meshStandardMaterial color={pantsColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.72, 0.06]} castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.14, 0.32]} />
              <meshStandardMaterial color={shoeColor} roughness={0.65} />
            </mesh>
          </group>
        </>
      )}

      {/* Shoes for sarung / dress */}
      {(outfit === "sarung" || outfit === "dress") && (
        <>
          <mesh position={[-0.14, 0.1, 0.06]} castShadow>
            <boxGeometry args={[0.19, 0.13, 0.3]} />
            <meshStandardMaterial color={shoeColor} roughness={0.65} />
          </mesh>
          <mesh position={[0.14, 0.1, 0.06]} castShadow>
            <boxGeometry args={[0.19, 0.13, 0.3]} />
            <meshStandardMaterial color={shoeColor} roughness={0.65} />
          </mesh>
        </>
      )}

      {/* ================= TORSO ================= */}
      <group position={[0, 1.24, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.29, 0.32, 0.78, 18]} />
          <meshStandardMaterial color={shirtColor} roughness={0.75} />
        </mesh>
        {/* Rounded shoulders */}
        <mesh position={[0, 0.36, 0]} castShadow>
          <sphereGeometry args={[0.295, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={shirtColor} roughness={0.75} />
        </mesh>

        {/* Shirt buttons */}
        {(outfit === "shirt" || outfit === "school") &&
          [0.14, -0.02, -0.18].map((y, idx) => (
            <mesh key={idx} position={[0, y, 0.3]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </mesh>
          ))}

        {/* School pocket */}
        {outfit === "school" && (
          <mesh position={[0.14, 0.12, 0.305]}>
            <boxGeometry args={[0.11, 0.12, 0.02]} />
            <meshStandardMaterial color="#c0392b" roughness={0.6} />
          </mesh>
        )}

        {/* Apron */}
        {outfit === "apron" && (
          <group>
            <mesh position={[0, -0.08, 0.31]}>
              <boxGeometry args={[0.42, 0.56, 0.04]} />
              <meshStandardMaterial color="#fff8e7" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.16, 0.335]}>
              <boxGeometry args={[0.24, 0.16, 0.02]} />
              <meshStandardMaterial color="#f4d03f" roughness={0.8} />
            </mesh>
          </group>
        )}

        {/* Jacket zipper & stripe */}
        {outfit === "jacket" && (
          <group>
            <mesh position={[0, 0, 0.305]}>
              <boxGeometry args={[0.03, 0.72, 0.02]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.305, 0.308, 0.1, 18]} />
              <meshStandardMaterial color="#2ecc71" roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Batik dots around torso (visible from all sides!) */}
        {outfit === "batik" &&
          [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <group key={i}>
                <mesh position={[Math.sin(a) * 0.305, 0.12, Math.cos(a) * 0.305]}>
                  <sphereGeometry args={[0.035, 8, 8]} />
                  <meshStandardMaterial color="#f2c94c" roughness={0.6} />
                </mesh>
                <mesh position={[Math.sin(a + 0.35) * 0.315, -0.14, Math.cos(a + 0.35) * 0.315]}>
                  <sphereGeometry args={[0.035, 8, 8]} />
                  <meshStandardMaterial color="#f2c94c" roughness={0.6} />
                </mesh>
              </group>
            );
          })}

        {/* ================= ARMS ================= */}
        {/* Left Arm */}
        <group position={[-0.38, 0.28, 0]} rotation={[-armSwing, 0, 0.12]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.42, 6, 12]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.54, 0]} castShadow>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group position={[0.38, 0.28, 0]} rotation={[armSwing, 0, -0.12]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.42, 6, 12]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.54, 0]} castShadow>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* ================= NECK ================= */}
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.16, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.75} />
      </mesh>

      {/* ================= HEAD ================= */}
      <group position={[0, 2.15, 0]}>
        {/* Main rounded head */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.45, 24, 20]} />
          <meshStandardMaterial color={skinColor} roughness={0.72} />
        </mesh>

        {/* Ears (hidden if hijab) */}
        {hairStyle !== "hijab" && (
          <>
            <mesh position={[-0.45, -0.02, 0]} castShadow>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.72} />
            </mesh>
            <mesh position={[0.45, -0.02, 0]} castShadow>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.72} />
            </mesh>
          </>
        )}

        {/* Small 3D Nose */}
        <mesh position={[0, -0.04, 0.44]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>

        {/* ================= EYES & BROWS ================= */}
        {expression === "shocked" ? (
          <>
            {[-0.16, 0.16].map((x, idx) => (
              <group key={idx} position={[x, 0.05, 0.39]}>
                <mesh>
                  <sphereGeometry args={[0.095, 14, 14]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.075]}>
                  <sphereGeometry args={[0.04, 10, 10]} />
                  <meshStandardMaterial color="#111111" roughness={0.2} />
                </mesh>
              </group>
            ))}
            {/* Open shocked mouth */}
            <mesh position={[0, -0.2, 0.4]}>
              <sphereGeometry args={[0.085, 12, 12]} />
              <meshStandardMaterial color="#7b241c" roughness={0.6} />
            </mesh>
          </>
        ) : (
          <>
            {[-0.16, 0.16].map((x, idx) => (
              <group key={idx} position={[x, 0.05, 0.4]}>
                <mesh scale={[0.9, 1.15, 0.6]}>
                  <sphereGeometry args={[0.065, 12, 12]} />
                  <meshStandardMaterial color="#141414" roughness={0.2} />
                </mesh>
                <mesh position={[-0.02, 0.025, 0.045]}>
                  <sphereGeometry args={[0.018, 8, 8]} />
                  <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
                </mesh>
              </group>
            ))}
            {/* Eyebrows */}
            <mesh
              position={[-0.16, 0.18, 0.39]}
              rotation={[0, 0, expression === "angry" ? -0.28 : expression === "worried" ? 0.22 : 0.06]}
            >
              <boxGeometry args={[0.14, 0.032, 0.04]} />
              <meshStandardMaterial color="#141414" roughness={0.6} />
            </mesh>
            <mesh
              position={[0.16, 0.18, 0.39]}
              rotation={[0, 0, expression === "angry" ? 0.28 : expression === "worried" ? -0.22 : -0.06]}
            >
              <boxGeometry args={[0.14, 0.032, 0.04]} />
              <meshStandardMaterial color="#141414" roughness={0.6} />
            </mesh>
            {/* Mouth */}
            {expression === "happy" ? (
              <mesh position={[0, -0.18, 0.41]} rotation={[0, 0, Math.PI]}>
                <cylinderGeometry args={[0.11, 0.11, 0.04, 14, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
            ) : (
              <mesh
                position={[0, -0.18, 0.42]}
                rotation={[0, 0, expression === "worried" ? 0.12 : 0]}
              >
                <boxGeometry args={[0.16, 0.028, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
              </mesh>
            )}
          </>
        )}

        {/* ================= FACIAL HAIR ================= */}
        {facialHair !== "none" && (
          <mesh position={[0, -0.1, 0.43]}>
            <boxGeometry args={[0.2, 0.042, 0.04]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
          </mesh>
        )}
        {facialHair === "goatee" && (
          <mesh position={[0, -0.3, 0.36]}>
            <coneGeometry args={[0.07, 0.12, 10]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
          </mesh>
        )}

        {/* ================= GLASSES ================= */}
        {glasses === "round" && (
          <group position={[0, 0.05, 0.43]}>
            <mesh position={[-0.16, 0, 0]}>
              <torusGeometry args={[0.11, 0.018, 8, 20]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0.16, 0, 0]}>
              <torusGeometry args={[0.11, 0.018, 8, 20]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
          </group>
        )}
        {glasses === "square" && (
          <group position={[0, 0.05, 0.43]}>
            {[-0.16, 0.16].map((x, idx) => (
              <group key={idx} position={[x, 0, 0]}>
                <mesh position={[0, 0.085, 0]}>
                  <boxGeometry args={[0.22, 0.025, 0.025]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
                <mesh position={[0, -0.085, 0]}>
                  <boxGeometry args={[0.22, 0.025, 0.025]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
                <mesh position={[-0.1, 0, 0]}>
                  <boxGeometry args={[0.025, 0.17, 0.025]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
                <mesh position={[0.1, 0, 0]}>
                  <boxGeometry args={[0.025, 0.17, 0.025]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.08, 0.025, 0.025]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          </group>
        )}

        {/* ================= HAIR STYLES (3D FULL 360°) ================= */}
        {hairStyle === "short" && (
          <group>
            <mesh position={[0, 0.08, -0.03]} castShadow>
              <sphereGeometry args={[0.47, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {/* Back hair coverage */}
            <mesh position={[0, -0.04, -0.14]} castShadow>
              <sphereGeometry args={[0.43, 18, 14]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
          </group>
        )}

        {hairStyle === "spiky" && (
          <group>
            <mesh position={[0, 0.08, -0.03]} castShadow>
              <sphereGeometry args={[0.46, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {[
              [0, 0.56, 0.05, 0, 0, 0],
              [-0.26, 0.48, 0.05, 0, 0, 0.45],
              [0.26, 0.48, 0.05, 0, 0, -0.45],
              [0, 0.46, -0.25, -0.45, 0, 0],
              [-0.22, 0.42, -0.2, -0.35, 0, 0.35],
              [0.22, 0.42, -0.2, -0.35, 0, -0.35],
            ].map(([x, y, z, rx, ry, rz], idx) => (
              <mesh key={idx} position={[x, y, z]} rotation={[rx, ry, rz]} castShadow>
                <coneGeometry args={[0.13, 0.34, 8]} />
                <meshStandardMaterial color={hairColor} roughness={0.85} />
              </mesh>
            ))}
          </group>
        )}

        {hairStyle === "bald" && (
          <mesh position={[-0.14, 0.32, 0.24]} rotation={[0.3, -0.2, 0]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.15} transparent opacity={0.55} />
          </mesh>
        )}

        {hairStyle === "bun" && (
          <group>
            <mesh position={[0, 0.08, -0.03]} castShadow>
              <sphereGeometry args={[0.47, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.04, -0.14]}>
              <sphereGeometry args={[0.43, 16, 14]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.54, -0.15]} castShadow>
              <sphereGeometry args={[0.18, 14, 14]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
          </group>
        )}

        {hairStyle === "bob" && (
          <group>
            <mesh position={[0, 0.08, -0.03]} castShadow>
              <sphereGeometry args={[0.47, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.16, -0.14]} castShadow>
              <cylinderGeometry args={[0.45, 0.48, 0.48, 16, 1, false, Math.PI * 0.65, Math.PI * 1.7]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
          </group>
        )}

        {hairStyle === "long" && (
          <group>
            <mesh position={[0, 0.08, -0.03]} castShadow>
              <sphereGeometry args={[0.47, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.35, -0.18]} castShadow>
              <cylinderGeometry args={[0.44, 0.48, 0.88, 16]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
          </group>
        )}

        {hairStyle === "hijab" && (
          <group>
            {/* Hijab dome */}
            <mesh position={[0, 0.04, -0.08]} castShadow>
              <sphereGeometry args={[0.48, 22, 18]} />
              <meshStandardMaterial color={hijabColor} roughness={0.85} />
            </mesh>
            {/* Hijab drape over shoulders */}
            <mesh position={[0, -0.45, -0.04]} castShadow>
              <cylinderGeometry args={[0.38, 0.5, 0.45, 18]} />
              <meshStandardMaterial color={hijabColor} roughness={0.85} />
            </mesh>
          </group>
        )}

        {/* ================= HATS ================= */}
        {hat === "peci" && (
          <mesh position={[0, 0.36, 0]} castShadow>
            <cylinderGeometry args={[0.36, 0.39, 0.26, 20]} />
            <meshStandardMaterial color="#18181b" roughness={0.75} />
          </mesh>
        )}
        {hat === "cap" && (
          <group position={[0, 0.22, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.48, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#27ae60" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.02, 0.42]} rotation={[0.15, 0, 0]}>
              <boxGeometry args={[0.52, 0.05, 0.36]} />
              <meshStandardMaterial color="#1e8449" roughness={0.7} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

/* ================================================================== */
/* 12 Ready-to-use Indonesian 3D Character Presets                    */
/* ================================================================== */
export const CHARACTER_PRESETS: CharacterConfig[] = [
  {
    id: "dodi",
    label: "Dodi (Tukang Cukur)",
    shirtColor: "#3b7dd8",
    hairStyle: "short",
    expression: "neutral",
  },
  {
    id: "pakSobri",
    label: "Pak Sobri (Bos Kios)",
    shirtColor: "#4a89dc",
    hairColor: "#7f8c8d",
    hairStyle: "short",
    facialHair: "mustache",
    expression: "angry",
  },
  {
    id: "pakKomar",
    label: "Pak Komar (Sesepuh)",
    shirtColor: "#c07a3e",
    outfit: "sarung",
    pantsColor: "#1e6b52",
    hairColor: "#bdc3c7",
    hat: "peci",
    glasses: "round",
    facialHair: "mustache",
    expression: "neutral",
  },
  {
    id: "masBotak",
    label: "Mas Botak (Pelanggan)",
    shirtColor: "#f5f5f5",
    outfit: "singlet",
    hairStyle: "bald",
    facialHair: "mustache",
    expression: "happy",
  },
  {
    id: "pelangganKaget",
    label: "Pelanggan (Kaget)",
    shirtColor: "#3aa655",
    hairStyle: "spiky",
    expression: "shocked",
  },
  {
    id: "kurirOjol",
    label: "Kurir / Ojol",
    shirtColor: "#27ae60",
    outfit: "jacket",
    hat: "cap",
    hairStyle: "short",
    expression: "neutral",
  },
  {
    id: "pekerjaKantor",
    label: "Pekerja Kantor",
    shirtColor: "#ecf0f1",
    pantsColor: "#2c3e50",
    hairStyle: "short",
    glasses: "square",
    expression: "worried",
  },
  {
    id: "pakRT",
    label: "Pak RT (Batik)",
    shirtColor: "#8e44ad",
    outfit: "batik",
    hairColor: "#5d6d7e",
    glasses: "square",
    facialHair: "goatee",
    expression: "happy",
  },
  {
    id: "ibuWarung",
    label: "Ibu Warung",
    shirtColor: "#f5b041",
    outfit: "apron",
    hairStyle: "bun",
    expression: "happy",
  },
  {
    id: "mbakHijab",
    label: "Mbak Hijab",
    shirtColor: "#f5b7b1",
    outfit: "dress",
    hairStyle: "hijab",
    hijabColor: "#d98880",
    expression: "happy",
  },
  {
    id: "nenek",
    label: "Nenek Ramah",
    shirtColor: "#5dade2",
    outfit: "sarung",
    pantsColor: "#6c3483",
    hairColor: "#d5dbdb",
    hairStyle: "bun",
    glasses: "round",
    expression: "happy",
  },
  {
    id: "anakSekolah",
    label: "Siswa SMA",
    shirtColor: "#ffffff",
    outfit: "school",
    pantsColor: "#7f8c8d",
    hairStyle: "short",
    expression: "worried",
  },
];

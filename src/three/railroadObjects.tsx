import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";

/* ------------------------------------------------------------------ */
/* Stick-Limb + Rounded White Head Character (Shorts 3D style)        */
/* ------------------------------------------------------------------ */
export type StickRole = "engineer" | "boss" | "competitorBoss" | "worker" | "rivalWorker";

export const StickCharacter3D: React.FC<{
  role?: StickRole;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  expression?: "neutral" | "happy" | "angry" | "worried" | "smug";
  headColor?: string;
  steamAmount?: number; // 0..1 for angry boss steam
  sweat?: boolean;
  actionPhase?: number;
  holding?: "none" | "saw" | "cane" | "newspaper";
}> = ({
  role = "engineer",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  expression = "neutral",
  headColor = "#ffffff",
  steamAmount = 0,
  sweat = false,
  actionPhase = 0,
  holding = "none",
}) => {
  const vestColor =
    role === "engineer"
      ? "#16a085"
      : role === "boss"
        ? "#d4ac0d"
        : role === "competitorBoss"
          ? "#1c2833"
          : role === "rivalWorker"
            ? "#2471a3"
            : "#784212";

  const swing = Math.sin(actionPhase) * 0.25;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Thin stick legs */}
      {[-0.12, 0.12].map((x, i) => (
        <group key={i} position={[x, 0.65, 0]} rotation={[i === 0 ? swing : -swing, 0, 0]}>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.65, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.64, 0.05]}>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      ))}

      {/* Torso */}
      <group position={[0, 1.0, 0]}>
        <mesh>
          <capsuleGeometry args={[0.21, 0.36, 8, 14]} />
          <meshStandardMaterial color={vestColor} roughness={0.7} />
        </mesh>

        {/* Shirt/vest details */}
        {role === "engineer" && (
          <>
            {/* Red bandana */}
            <mesh position={[0, 0.28, 0.16]} rotation={[0.4, 0, 0]}>
              <coneGeometry args={[0.12, 0.2, 4]} />
              <meshStandardMaterial color="#c0392b" roughness={0.8} />
            </mesh>
            {/* Pocket */}
            <mesh position={[0.1, 0.04, 0.2]}>
              <boxGeometry args={[0.09, 0.1, 0.02]} />
              <meshStandardMaterial color="#117864" />
            </mesh>
          </>
        )}

        {(role === "boss" || role === "competitorBoss") && (
          <>
            {/* Gold chain / buttons */}
            {[0.12, 0.0, -0.12].map((y, idx) => (
              <mesh key={idx} position={[0, y, 0.21]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshStandardMaterial color="#f4d03f" metalness={0.6} roughness={0.3} />
              </mesh>
            ))}
            {/* Bowtie */}
            <mesh position={[0, 0.26, 0.18]}>
              <boxGeometry args={[0.14, 0.06, 0.04]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
          </>
        )}

        {/* Stick arms */}
        <group position={[-0.24, 0.16, 0]} rotation={[-swing, 0, 0.25]}>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.46, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
        <group position={[0.24, 0.16, 0]} rotation={[swing - (holding !== "none" ? 0.8 : 0), 0, -0.25]}>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.46, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Held props */}
          {holding === "cane" && (
            <mesh position={[0, -0.58, 0.15]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.018, 0.9, 8]} />
              <meshStandardMaterial color="#b7950b" metalness={0.4} roughness={0.4} />
            </mesh>
          )}
          {holding === "saw" && (
            <group position={[-0.1, -0.45, 0.28]} rotation={[0.6, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.04, 0.06, 0.65]} />
                <meshStandardMaterial color="#bdc3c7" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.08, 0]}>
                <boxGeometry args={[0.05, 0.04, 0.65]} />
                <meshStandardMaterial color="#784212" />
              </mesh>
            </group>
          )}
          {holding === "newspaper" && (
            <mesh position={[-0.22, -0.3, 0.32]} rotation={[-0.2, 0, 0]}>
              <boxGeometry args={[0.52, 0.64, 0.03]} />
              <meshStandardMaterial color="#f5e6c8" roughness={0.9} />
            </mesh>
          )}
        </group>
      </group>

      {/* Rounded White Head */}
      <group position={[0, 1.66, 0]}>
        <mesh>
          <sphereGeometry args={[0.38, 24, 20]} />
          <meshStandardMaterial color={headColor} roughness={0.55} />
        </mesh>

        {/* Eyes */}
        {[-0.12, 0.12].map((x, idx) => (
          <mesh key={idx} position={[x, 0.04, 0.35]} scale={[1, expression === "smug" ? 0.6 : 1.15, 0.5]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        ))}

        {/* Eyebrows */}
        <mesh
          position={[-0.12, 0.14, 0.35]}
          rotation={[0, 0, expression === "angry" ? -0.35 : expression === "worried" ? 0.28 : 0.05]}
        >
          <boxGeometry args={[0.12, 0.025, 0.03]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <mesh
          position={[0.12, 0.14, 0.35]}
          rotation={[0, 0, expression === "angry" ? 0.35 : expression === "worried" ? -0.28 : -0.05]}
        >
          <boxGeometry args={[0.12, 0.025, 0.03]} />
          <meshStandardMaterial color="#111111" />
        </mesh>

        {/* Mouth */}
        {expression === "happy" ? (
          <mesh position={[0, -0.14, 0.35]} rotation={[0, 0, Math.PI]}>
            <cylinderGeometry args={[0.09, 0.09, 0.03, 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        ) : expression === "angry" ? (
          <mesh position={[0, -0.14, 0.35]}>
            <boxGeometry args={[0.14, 0.06, 0.03]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ) : (
          <mesh position={[0, -0.14, 0.35]}>
            <boxGeometry args={[0.12, 0.025, 0.03]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        )}

        {/* Boss Mustache */}
        {role === "boss" && (
          <mesh position={[0, -0.06, 0.36]}>
            <boxGeometry args={[0.16, 0.03, 0.03]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        )}

        {/* Hats */}
        {role === "engineer" && (
          <group position={[0, 0.26, 0]} rotation={[-0.1, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.3, 0.34, 0.2, 16]} />
              <meshStandardMaterial color="#2c3e50" roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.08, 0.26]}>
              <boxGeometry args={[0.42, 0.04, 0.26]} />
              <meshStandardMaterial color="#1b2631" />
            </mesh>
          </group>
        )}
        {role === "boss" && (
          <group position={[0, 0.3, 0]}>
            <mesh>
              <cylinderGeometry args={[0.42, 0.42, 0.04, 20]} />
              <meshStandardMaterial color="#1b1b1e" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <sphereGeometry args={[0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color="#1b1b1e" roughness={0.6} />
            </mesh>
          </group>
        )}
        {role === "competitorBoss" && (
          <group position={[0, 0.32, 0]}>
            <mesh>
              <cylinderGeometry args={[0.44, 0.44, 0.04, 20]} />
              <meshStandardMaterial color="#111111" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.26, 0.24, 0.42, 18]} />
              <meshStandardMaterial color="#111111" roughness={0.5} />
            </mesh>
          </group>
        )}
        {role === "rivalWorker" && (
          <group position={[0, 0.26, 0]}>
            <mesh>
              <cylinderGeometry args={[0.3, 0.32, 0.18, 16]} />
              <meshStandardMaterial color="#1b4f72" />
            </mesh>
            <mesh position={[0, -0.07, 0.24]}>
              <boxGeometry args={[0.38, 0.04, 0.24]} />
              <meshStandardMaterial color="#154360" />
            </mesh>
          </group>
        )}

        {/* Angry Steam Puffs */}
        {steamAmount > 0.05 &&
          [-1, 1].map((side) => (
            <group key={side} position={[side * (0.48 + steamAmount * 0.18), 0.18 + steamAmount * 0.12, 0]}>
              <mesh scale={0.6 + steamAmount * 0.5}>
                <sphereGeometry args={[0.14, 10, 10]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
              </mesh>
              <mesh position={[side * 0.15, 0.12, 0]} scale={0.45 + steamAmount * 0.4}>
                <sphereGeometry args={[0.11, 10, 10]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.7} />
              </mesh>
            </group>
          ))}

        {/* Sweat drop */}
        {sweat && (
          <mesh position={[-0.32, 0.18, 0.25]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color="#5dade2" roughness={0.1} />
          </mesh>
        )}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Canyon Environment (Layered Red-Orange Cliffs + Deep Blue Abyss)   */
/* ------------------------------------------------------------------ */
export const CanyonEnvironment: React.FC = () => {
  const layers = useMemo(
    () => [
      { y: 1.5, color: "#a93226" },
      { y: 4.5, color: "#d35400" },
      { y: 7.5, color: "#e67e22" },
      { y: 10.5, color: "#ca6f1e" },
      { y: 13.5, color: "#922b21" },
    ],
    []
  );

  return (
    <group>
      {/* Canyon Abyss */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -18, 0]}>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial color="#1b4f72" roughness={0.9} />
      </mesh>
      {/* Left & Right Canyon Cliffs */}
      {[-18, 18].map((x, sideIdx) => (
        <group key={sideIdx} position={[x, -6, 0]}>
          {layers.map((l, idx) => (
            <mesh key={idx} position={[sideIdx === 0 ? -4 : 4, l.y, 0]}>
              <boxGeometry args={[14, 3.1, 120]} />
              <meshStandardMaterial color={l.color} roughness={0.95} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Railroad Track with Gap, Heat Color Shift, and Sun-Kink Buckling   */
/* ------------------------------------------------------------------ */
export const RailroadTrack3D: React.FC<{
  position?: Vec3;
  length?: number;
  gapWidth?: number;     // 0 = no gap, >0 = visible expansion gap in center
  heatLevel?: number;    // 0..1 shifts rail color from steel -> purple -> orange
  buckleAmount?: number; // 0..1 bends rails sideways like a snake
}> = ({
  position = [0, 0, 0],
  length = 40,
  gapWidth = 0,
  heatLevel = 0,
  buckleAmount = 0,
}) => {
  const sleepers = useMemo(() => {
    const arr: number[] = [];
    for (let z = -length / 2; z <= length / 2; z += 1.1) {
      arr.push(z);
    }
    return arr;
  }, [length]);

  const railColor = useMemo(() => {
    const c = new THREE.Color("#7f8c8d");
    if (heatLevel > 0.01 && heatLevel <= 0.5) {
      c.lerp(new THREE.Color("#9b59b6"), heatLevel * 2);
    } else if (heatLevel > 0.5) {
      c.set("#9b59b6").lerp(new THREE.Color("#f39c12"), (heatLevel - 0.5) * 2);
    }
    return `#${c.getHexString()}`;
  }, [heatLevel]);

  const segments = useMemo(() => {
    const count = 24;
    const segLen = length / count;
    return new Array(count).fill(0).map((_, i) => {
      const z = -length / 2 + segLen * (i + 0.5);
      const kinkX = buckleAmount > 0 ? Math.sin(z * 0.45) * buckleAmount * 1.15 : 0;
      const rotY = buckleAmount > 0 ? Math.cos(z * 0.45) * buckleAmount * 0.42 : 0;
      return { z, segLen, kinkX, rotY };
    });
  }, [length, buckleAmount]);

  return (
    <group position={position}>
      {/* Gravel track bed */}
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[4.6, 0.16, length]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.95} />
      </mesh>

      {/* Wooden sleepers */}
      {sleepers.map((z, idx) => (
        <mesh key={idx} position={[0, 0.04, z]}>
          <boxGeometry args={[2.8, 0.12, 0.34]} />
          <meshStandardMaterial color="#4e342e" roughness={0.9} />
        </mesh>
      ))}

      {/* Steel rails (split if gapWidth > 0, or segmented for buckling) */}
      {gapWidth > 0 ? (
        <>
          {[-0.85, 0.85].map((rx, idx) => (
            <group key={idx}>
              <mesh position={[rx, 0.18, -(length / 4 + gapWidth / 2)]}>
                <boxGeometry args={[0.14, 0.16, length / 2]} />
                <meshStandardMaterial
                  color={railColor}
                  emissive={heatLevel > 0.2 ? railColor : "#000000"}
                  emissiveIntensity={heatLevel * 0.7}
                  metalness={0.6}
                  roughness={0.35}
                />
              </mesh>
              <mesh position={[rx, 0.18, length / 4 + gapWidth / 2]}>
                <boxGeometry args={[0.14, 0.16, length / 2]} />
                <meshStandardMaterial
                  color={railColor}
                  emissive={heatLevel > 0.2 ? railColor : "#000000"}
                  emissiveIntensity={heatLevel * 0.7}
                  metalness={0.6}
                  roughness={0.35}
                />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        segments.map((s, idx) =>
          [-0.85, 0.85].map((rx, rIdx) => (
            <mesh
              key={`${idx}-${rIdx}`}
              position={[rx + s.kinkX, 0.18, s.z]}
              rotation={[0, s.rotY, 0]}
            >
              <boxGeometry args={[0.14, 0.16, s.segLen + 0.05]} />
              <meshStandardMaterial
                color={railColor}
                emissive={heatLevel > 0.2 ? railColor : "#000000"}
                emissiveIntensity={heatLevel * 0.8}
                metalness={0.6}
                roughness={0.35}
              />
            </mesh>
          ))
        )
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* 3D Steam Locomotive Train                                          */
/* ------------------------------------------------------------------ */
export const SteamTrain3D: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  smokePhase?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, smokePhase = 0 }) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Chassis */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.9, 0.4, 4.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      {/* Boiler */}
      <mesh position={[0, 1.25, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 2.8, 18]} />
        <meshStandardMaterial color="#212f3d" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Gold trim band */}
      <mesh position={[0, 1.25, 1.92]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.74, 0.74, 0.1, 18]} />
        <meshStandardMaterial color="#f1c40f" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Headlight */}
      <mesh position={[0, 1.4, 1.98]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#fff9c4" emissive="#f9e79f" emissiveIntensity={1.6} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.5, -1.3]}>
        <boxGeometry args={[1.85, 1.6, 1.5]} />
        <meshStandardMaterial color="#922b21" roughness={0.65} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.38, -1.3]}>
        <boxGeometry args={[2.0, 0.16, 1.7]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Smokestack */}
      <mesh position={[0, 2.15, 1.4]}>
        <cylinderGeometry args={[0.22, 0.15, 0.7, 12]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Smoke puffs */}
      {[0, 1, 2].map((i) => {
        const yOff = ((smokePhase + i * 0.33) % 1) * 1.8;
        return (
          <mesh key={i} position={[0, 2.6 + yOff, 1.4 - yOff * 0.5]} scale={0.7 + yOff * 0.5}>
            <sphereGeometry args={[0.28, 10, 10]} />
            <meshStandardMaterial color="#2c3e50" transparent opacity={0.75 - yOff * 0.3} />
          </mesh>
        );
      })}
      {/* Cowcatcher */}
      <mesh position={[0, 0.45, 2.45]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.9, 0.7, 4]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
    </group>
  );
};

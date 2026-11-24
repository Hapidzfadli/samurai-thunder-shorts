import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";

/* ------------------------------------------------------------------ */
/* Reusable Toon / Cel-Outlined & X-Ray Primitive Helpers             */
/* ------------------------------------------------------------------ */
const OUTLINE_COLOR = "#0c1117";
const XRAY_FILL = "#0ea5e9";
const XRAY_EDGE = "#7dd3fc";

export const OutlinedBox: React.FC<{
  args: [number, number, number];
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  xray?: boolean;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}> = ({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  xray = false,
  metalness = 0.15,
  roughness = 0.7,
  emissive = "#000000",
  emissiveIntensity = 0,
}) => {
  const edgesGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(args[0], args[1], args[2]);
    const e = new THREE.EdgesGeometry(g);
    g.dispose();
    return e;
  }, [args[0], args[1], args[2]]);

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={args} />
        {xray ? (
          <meshBasicMaterial
            color={XRAY_FILL}
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        ) : (
          <meshStandardMaterial
            color={color}
            metalness={metalness}
            roughness={roughness}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        )}
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color={xray ? XRAY_EDGE : OUTLINE_COLOR}
          transparent={xray}
          opacity={xray ? 0.85 : 1}
        />
      </lineSegments>
    </group>
  );
};

export const OutlinedCylinder: React.FC<{
  args: [number, number, number, number];
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  xray?: boolean;
  metalness?: number;
  roughness?: number;
  outlineScale?: number;
}> = ({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  xray = false,
  metalness = 0.25,
  roughness = 0.65,
  outlineScale = 1.08,
}) => {
  const edgesGeo = useMemo(() => {
    if (!xray) return null;
    const g = new THREE.CylinderGeometry(args[0], args[1], args[2], args[3]);
    const e = new THREE.EdgesGeometry(g, 22);
    g.dispose();
    return e;
  }, [xray, args[0], args[1], args[2], args[3]]);

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={args} />
        {xray ? (
          <meshBasicMaterial
            color={XRAY_FILL}
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        ) : (
          <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
        )}
      </mesh>
      {xray && edgesGeo ? (
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color={XRAY_EDGE} transparent opacity={0.8} />
        </lineSegments>
      ) : (
        <mesh scale={[outlineScale, 1.02, outlineScale]}>
          <cylinderGeometry args={args} />
          <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Apache Pilot / Gunner Character (Stick-Limb + IHADSS Monocle Helm) */
/* ------------------------------------------------------------------ */
export const ApachePilot3D: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  headYaw?: number;
  headPitch?: number;
  helmetColor?: string;
  expression?: "cool" | "focused" | "smile" | "shocked";
  monocleGlow?: boolean;
  showIrCones?: boolean;
  showAimLaser?: boolean;
  aimLaserLen?: number;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  headYaw = 0,
  headPitch = 0,
  helmetColor = "#6f7f82",
  expression = "cool",
  monocleGlow = true,
  showIrCones = false,
  showAimLaser = false,
  aimLaserLen = 14,
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Flight Suit Torso */}
      <group position={[0, 0.25, 0]}>
        <mesh>
          <capsuleGeometry args={[0.19, 0.26, 8, 14]} />
          <meshStandardMaterial color="#707f5d" roughness={0.8} />
        </mesh>
        <mesh scale={1.08}>
          <capsuleGeometry args={[0.19, 0.26, 8, 14]} />
          <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
        {/* Tactical Harness Straps */}
        <mesh position={[-0.08, 0.02, 0.16]} rotation={[0, 0, 0.18]}>
          <boxGeometry args={[0.045, 0.44, 0.05]} />
          <meshStandardMaterial color="#1f2428" roughness={0.9} />
        </mesh>
        <mesh position={[0.08, 0.02, 0.16]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.045, 0.44, 0.05]} />
          <meshStandardMaterial color="#1f2428" roughness={0.9} />
        </mesh>
        {/* Indonesian Flag Patch (Merah Putih) */}
        <mesh position={[0.09, 0.04, 0.195]}>
          <boxGeometry args={[0.085, 0.03, 0.015]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0.09, 0.01, 0.195]}>
          <boxGeometry args={[0.085, 0.03, 0.015]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Stick Arms reaching cockpit controls */}
        <mesh position={[-0.22, -0.02, 0.15]} rotation={[0.9, 0, 0.25]}>
          <cylinderGeometry args={[0.032, 0.032, 0.42, 8]} />
          <meshStandardMaterial color="#15191d" />
        </mesh>
        <mesh position={[0.22, -0.02, 0.15]} rotation={[0.9, 0, -0.25]}>
          <cylinderGeometry args={[0.032, 0.032, 0.42, 8]} />
          <meshStandardMaterial color="#15191d" />
        </mesh>
      </group>

      {/* Articulated Head + IHADSS Helmet */}
      <group position={[0, 0.78, 0]} rotation={[headPitch, headYaw, 0]}>
        {/* White Round Head + Black Outline */}
        <mesh>
          <sphereGeometry args={[0.31, 22, 18]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.45} />
        </mesh>
        <mesh scale={1.065}>
          <sphereGeometry args={[0.31, 22, 18]} />
          <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>

        {/* Eyes & Eyelids */}
        {[-0.1, 0.1].map((ex, i) => (
          <group key={i} position={[ex, 0.02, 0.285]}>
            {expression === "shocked" ? (
              <>
                <mesh>
                  <sphereGeometry args={[0.068, 12, 12]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[0, 0, 0.045]}>
                  <sphereGeometry args={[0.028, 10, 10]} />
                  <meshBasicMaterial color="#111111" />
                </mesh>
              </>
            ) : (
              <>
                <mesh scale={[1.15, expression === "cool" ? 0.55 : 0.95, 0.5]}>
                  <sphereGeometry args={[0.048, 10, 10]} />
                  <meshBasicMaterial color="#14181d" />
                </mesh>
              </>
            )}
          </group>
        ))}

        {/* Expressive Eyebrows */}
        <mesh
          position={[-0.1, 0.12, 0.285]}
          rotation={[0, 0, expression === "focused" ? -0.2 : 0.06]}
        >
          <boxGeometry args={[0.11, 0.024, 0.025]} />
          <meshBasicMaterial color="#14181d" />
        </mesh>
        <mesh
          position={[0.1, 0.12, 0.285]}
          rotation={[0, 0, expression === "focused" ? 0.2 : -0.06]}
        >
          <boxGeometry args={[0.11, 0.024, 0.025]} />
          <meshBasicMaterial color="#14181d" />
        </mesh>

        {/* Mouth */}
        {expression === "smile" ? (
          <mesh position={[0, -0.12, 0.285]} rotation={[0, 0, Math.PI]}>
            <cylinderGeometry args={[0.065, 0.065, 0.02, 10, 1, false, 0, Math.PI]} />
            <meshBasicMaterial color="#14181d" />
          </mesh>
        ) : (
          <mesh position={[0, -0.12, 0.29]}>
            <boxGeometry args={[0.1, 0.022, 0.02]} />
            <meshBasicMaterial color="#14181d" />
          </mesh>
        )}

        {/* Aviator Helmet Shell */}
        <group position={[0, 0.04, -0.03]}>
          <mesh rotation={[-0.22, 0, 0]}>
            <sphereGeometry args={[0.345, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={helmetColor} roughness={0.55} metalness={0.15} />
          </mesh>
          <mesh rotation={[-0.22, 0, 0]} scale={1.055}>
            <sphereGeometry args={[0.345, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshBasicMaterial color={OUTLINE_COLOR} side={THREE.BackSide} />
          </mesh>
          {/* Visor Housing Bump on top */}
          <mesh position={[0, 0.31, 0.1]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.24, 0.08, 0.18]} />
            <meshStandardMaterial color="#4b595c" roughness={0.6} />
          </mesh>
          {/* Left & Right Earcups */}
          {[-0.33, 0.33].map((sx, idx) => (
            <group key={idx} position={[sx, -0.04, 0.02]} rotation={[0, 0, Math.PI / 2]}>
              <OutlinedCylinder args={[0.11, 0.11, 0.08, 14]} color="#4c595c" />
            </group>
          ))}
          {/* Glowing IR Helmet Markers on sides (for IR tracking scene) */}
          {showIrCones &&
            [-0.35, 0.35].map((sx, idx) => (
              <mesh key={idx} position={[sx, 0.05, -0.14]}>
                <sphereGeometry args={[0.045, 10, 10]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            ))}
        </group>

        {/* IHADSS Right-Eye Monocle Boom & Glowing Glass Lens */}
        <group position={[-0.31, -0.02, 0.04]}>
          <mesh position={[0.09, -0.01, 0.2]} rotation={[0.1, 0.45, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.32, 8]} />
            <meshStandardMaterial color="#1f2937" metalness={0.5} />
          </mesh>
          {/* Monocle Frame + Glowing Green Thermal Combiner Lens in front of right eye */}
          <group position={[0.21, 0.03, 0.31]}>
            <mesh>
              <torusGeometry args={[0.072, 0.015, 8, 18]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <mesh>
              <circleGeometry args={[0.068, 16]} />
              <meshBasicMaterial
                color={monocleGlow ? "#4ade80" : "#93c5fd"}
                transparent
                opacity={monocleGlow ? 0.72 : 0.45}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Glowing Green Aiming Laser Beam shooting from monocle */}
            {showAimLaser && (
              <mesh position={[0, 0, aimLaserLen / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.045, aimLaserLen, 10]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.65} />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Detailed AH-64 Apache Attack Helicopter (Normal & X-Ray Blueprint) */
/* ------------------------------------------------------------------ */
export const ApacheHelicopter3D: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  rotorPhase?: number;
  headYaw?: number;
  headPitch?: number;
  gunYaw?: number;
  gunPitch?: number;
  fireFlash?: number;      // 0..1 muzzle flash intensity
  xray?: boolean;          // Turns hull into glowing blue X-Ray hologram!
  showInternalAmmo?: boolean;
  showIrSensors?: boolean;
  showAimLaser?: boolean;
  gunFoldUp?: number;      // 0..1 crash-safety upward fold between seats!
  pilotExpression?: "cool" | "focused" | "smile" | "shocked";
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  rotorPhase = 0,
  headYaw = 0,
  headPitch = 0,
  gunYaw = 0,
  gunPitch = 0,
  fireFlash = 0,
  xray = false,
  showInternalAmmo = false,
  showIrSensors = false,
  showAimLaser = false,
  gunFoldUp = 0,
  pilotExpression = "cool",
}) => {
  const hullGreen = "#495b3d";
  const hullDark = "#34422c";
  const darkMetal = "#262c30";

  // Pre-build 4x12 stacked brass shells for the internal 1,200-round magazine in X-Ray mode
  const ammoShells = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 14; col++) {
        arr.push([0, -0.22 + row * 0.13, -0.78 + col * 0.12]);
      }
    }
    return arr;
  }, []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ================= MAIN FUSELAGE & ENGINE BODY ================= */}
      {/* Lower Hull Floor */}
      <OutlinedBox args={[1.38, 0.56, 4.4]} position={[0, -0.18, 0.35]} color={hullGreen} xray={xray} />
      {/* Side Avionics Cheek Sponsons (iconic Apache angular sides) */}
      <OutlinedBox args={[0.38, 0.44, 3.2]} position={[-0.84, -0.22, 0.65]} color={hullDark} xray={xray} />
      <OutlinedBox args={[0.38, 0.44, 3.2]} position={[0.84, -0.22, 0.65]} color={hullDark} xray={xray} />
      {/* Upper Engine Spine behind cockpit */}
      <OutlinedBox args={[1.22, 0.96, 2.3]} position={[0, 0.55, -0.82]} color={hullGreen} xray={xray} />

      {/* Twin T700 Turbine Engine Nacelles */}
      <OutlinedCylinder
        args={[0.34, 0.34, 2.0, 12]}
        position={[-0.78, 0.52, -0.88]}
        rotation={[Math.PI / 2, 0, 0]}
        color={hullDark}
        xray={xray}
      />
      <OutlinedCylinder
        args={[0.34, 0.34, 2.0, 12]}
        position={[0.78, 0.52, -0.88]}
        rotation={[Math.PI / 2, 0, 0]}
        color={hullDark}
        xray={xray}
      />

      {/* ================= TANDEM COCKPIT ROLL-CAGE & CREW ================= */}
      {/* Cockpit Floor & Consoles */}
      <OutlinedBox args={[1.15, 0.16, 2.4]} position={[0, 0.1, 1.25]} color="#232b2d" xray={xray} />
      {/* Front Instrument Dashboard */}
      <OutlinedBox args={[0.92, 0.36, 0.32]} position={[0, 0.42, 2.32]} color="#1f262a" xray={xray} />
      {/* Glowing Cockpit Buttons (yellow / green / red) */}
      {!xray && (
        <group position={[0, 0.56, 2.18]}>
          <mesh position={[-0.24, 0, 0]}>
            <boxGeometry args={[0.14, 0.05, 0.05]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.14, 0.05, 0.05]} />
            <meshBasicMaterial color="#4ade80" />
          </mesh>
          <mesh position={[0.24, 0, 0]}>
            <boxGeometry args={[0.14, 0.05, 0.05]} />
            <meshBasicMaterial color="#f87171" />
          </mesh>
        </group>
      )}
      {/* Red Fire Extinguisher inside Cockpit (detail from reference frame 03!) */}
      {!xray && (
        <group position={[-0.45, 0.46, 1.55]}>
          <OutlinedCylinder args={[0.075, 0.075, 0.36, 10]} color="#dc2626" />
        </group>
      )}

      {/* Cockpit Cage Frame Struts */}
      {[
        [-0.56, 0.86, 2.25, 0.45, 0, 0, 1.1],
        [0.56, 0.86, 2.25, 0.45, 0, 0, 1.1],
        [-0.56, 1.05, 1.15, 0, 0, 0, 1.15],
        [0.56, 1.05, 1.15, 0, 0, 0, 1.15],
        [-0.56, 1.1, 0.25, -0.15, 0, 0, 1.15],
        [0.56, 1.1, 0.25, -0.15, 0, 0, 1.15],
      ].map(([x, y, z, rx, ry, rz, len], idx) => (
        <mesh key={idx} position={[x, y, z]} rotation={[rx, ry, rz]}>
          <cylinderGeometry args={[0.04, 0.04, len, 6]} />
          <meshBasicMaterial color={xray ? XRAY_EDGE : "#1b241d"} />
        </mesh>
      ))}
      {/* Top Canopy Rails */}
      <OutlinedBox args={[0.07, 0.07, 2.05]} position={[-0.56, 1.48, 1.12]} color="#253026" xray={xray} />
      <OutlinedBox args={[0.07, 0.07, 2.05]} position={[0.56, 1.48, 1.12]} color="#253026" xray={xray} />
      <OutlinedBox args={[1.18, 0.07, 0.07]} position={[0, 1.48, 2.02]} color="#253026" xray={xray} />
      <OutlinedBox args={[1.18, 0.07, 0.07]} position={[0, 1.48, 1.12]} color="#253026" xray={xray} />
      <OutlinedBox args={[1.18, 0.07, 0.07]} position={[0, 1.48, 0.22]} color="#253026" xray={xray} />

      {/* Seat Backs */}
      <OutlinedBox args={[0.58, 0.65, 0.14]} position={[0, 0.52, 1.4]} color="#2f3638" xray={xray} />
      <OutlinedBox args={[0.58, 0.72, 0.14]} position={[0, 0.72, 0.35]} color="#2f3638" xray={xray} />

      {/* Front Gunner Seat (slightly lower) */}
      <ApachePilot3D
        position={[0, 0.22, 1.72]}
        headYaw={headYaw}
        headPitch={headPitch}
        helmetColor="#7c8770"
        expression={pilotExpression}
        monocleGlow
        showIrCones={showIrSensors}
        showAimLaser={showAimLaser}
      />

      {/* Rear Pilot Seat (slightly elevated tandem position) */}
      <ApachePilot3D
        position={[0, 0.42, 0.68]}
        headYaw={headYaw * 0.65}
        headPitch={headPitch * 0.5}
        helmetColor="#6c7a89"
        expression={pilotExpression}
        monocleGlow
        showIrCones={showIrSensors}
        showAimLaser={false}
      />

      {/* Red Infrared Sensor Boxes & Translucent Scanning Cones in Cockpit */}
      {showIrSensors && (
        <group>
          {[-0.52, 0.52].map((sx, idx) => (
            <group key={idx} position={[sx, 1.15, 1.32]}>
              <OutlinedBox args={[0.14, 0.14, 0.18]} color="#1f2937" />
              {/* Glowing Red IR Beam Cone aimed at Front Gunner Helmet */}
              <mesh
                position={[sx > 0 ? -0.18 : 0.18, -0.08, 0.22]}
                rotation={[0.75, 0, sx > 0 ? 0.55 : -0.55]}
              >
                <coneGeometry args={[0.2, 0.55, 14, 1, true]} />
                <meshBasicMaterial
                  color="#ef4444"
                  transparent
                  opacity={0.42}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ================= INTERNAL 1,200-ROUND AMMO MAGAZINE (X-RAY) ================= */}
      {showInternalAmmo && (
        <group position={[0, -0.15, -0.65]}>
          {/* Outer Ammo Drum Frame */}
          <OutlinedBox args={[0.78, 0.66, 1.85]} color="#334155" xray />
          {/* Stacked Glowing Brass 30mm Shells */}
          {ammoShells.map(([x, y, z], idx) => (
            <mesh key={idx} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.042, 0.042, 0.66, 8]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#d97706"
                emissiveIntensity={0.65}
                metalness={0.8}
                roughness={0.25}
              />
            </mesh>
          ))}
          {/* Glowing Status Indicator Orbs like reference frame 06 */}
          <mesh position={[0.45, -0.25, 0.45]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color="#f87171" />
          </mesh>
          <mesh position={[0.45, 0.25, 0.45]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshBasicMaterial color="#4ade80" />
          </mesh>
        </group>
      )}

      {/* ================= NOSE TADS / PNVS FLIR SENSOR POD ================= */}
      <group position={[0, 0.05, 2.86]} rotation={[0, headYaw * 0.75, 0]}>
        {/* Main TADS Box */}
        <OutlinedBox args={[0.92, 0.54, 0.66]} color={hullGreen} xray={xray} />
        {/* Left & Right Sensor Housings */}
        <OutlinedBox args={[0.32, 0.48, 0.24]} position={[-0.3, 0, 0.36]} color={hullDark} xray={xray} />
        <OutlinedBox args={[0.32, 0.48, 0.24]} position={[0.3, 0, 0.36]} color={hullDark} xray={xray} />
        {/* Top PNVS Rotating Night-Vision Dome */}
        <OutlinedCylinder args={[0.17, 0.19, 0.28, 12]} position={[0, 0.4, 0.05]} color={hullDark} xray={xray} />
        {/* Glowing Blue Optical & Thermal Lenses with Dark Bezels */}
        {[
          [-0.29, 0.11, 0.49, 0.068],
          [-0.29, -0.1, 0.49, 0.068],
          [0.29, 0.01, 0.49, 0.092],
          [0, 0.4, 0.21, 0.065],
        ].map(([lx, ly, lz, lr], idx) => (
          <group key={idx} position={[lx, ly, lz]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[lr, lr, 0.035, 16]} />
              <meshStandardMaterial
                color="#7dd3fc"
                emissive="#0284c7"
                emissiveIntensity={0.9}
                roughness={0.12}
              />
            </mesh>
            <mesh position={[0, 0, 0.018]}>
              <torusGeometry args={[lr, 0.014, 8, 16]} />
              <meshBasicMaterial color={OUTLINE_COLOR} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================= M230 30MM CHAIN GUN (ARTICULATED & FOLDING) ================= */}
      {/* When gunFoldUp goes 0->1, gun folds straight UP cleanly into gap z=1.18 between front & rear seats! */}
      <group
        position={[0, -0.58 + gunFoldUp * 0.92, 1.82 - gunFoldUp * 0.62]}
        rotation={[gunPitch - gunFoldUp * 1.48, gunYaw * (1 - gunFoldUp), 0]}
      >
        {/* Turret Swivel Mount */}
        <OutlinedCylinder args={[0.2, 0.22, 0.26, 12]} position={[0, 0.14, 0]} color={darkMetal} />
        {/* Receiver Box */}
        <OutlinedBox args={[0.3, 0.28, 0.72]} position={[0, -0.05, 0.18]} color="#374151" />
        {/* Main 30mm Barrel with Recoil */}
        <group position={[0, -0.05, 0.95 - fireFlash * 0.14]}>
          <OutlinedCylinder
            args={[0.068, 0.075, 1.35, 12]}
            rotation={[Math.PI / 2, 0, 0]}
            color="#4b5563"
            metalness={0.7}
            roughness={0.3}
          />
          {/* Muzzle Brake Collar */}
          <OutlinedCylinder
            args={[0.095, 0.095, 0.18, 12]}
            position={[0, 0, 0.65]}
            rotation={[Math.PI / 2, 0, 0]}
            color="#1f2937"
          />
          {/* Bright Stylized Muzzle Flash */}
          {fireFlash > 0.1 && (
            <group position={[0, 0, 0.85]} scale={0.7 + fireFlash * 0.7}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.24, 0.85, 8]} />
                <meshBasicMaterial color="#fb923c" transparent opacity={0.9} />
              </mesh>
              <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.14, 0.55, 8]} />
                <meshBasicMaterial color="#fef08a" />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* ================= STUB WINGS & WEAPON PODS ================= */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.65, -0.1, -0.45]}>
          <OutlinedBox args={[1.65, 0.18, 0.95]} rotation={[0, 0, side * -0.12]} color={hullGreen} xray={xray} />
          {/* Rocket Pod */}
          <OutlinedCylinder
            args={[0.22, 0.22, 0.98, 12]}
            position={[side * 0.2, -0.26, 0.05]}
            rotation={[Math.PI / 2, 0, 0]}
            color={hullDark}
            xray={xray}
          />
          {/* 4x Hellfire Missiles */}
          {[-0.14, 0.14].map((mx, mi) => (
            <OutlinedCylinder
              key={mi}
              args={[0.06, 0.06, 1.15, 8]}
              position={[side * 0.62 + mx, -0.24, 0.08]}
              rotation={[Math.PI / 2, 0, 0]}
              color="#1e293b"
              xray={xray}
            />
          ))}
        </group>
      ))}

      {/* ================= TAIL BOOM & TAIL ROTOR ================= */}
      <OutlinedBox args={[0.52, 0.52, 4.8]} position={[0, 0.24, -4.15]} color={hullGreen} xray={xray} />
      {/* Vertical Tail Fin */}
      <OutlinedBox args={[0.16, 1.65, 0.88]} position={[0, 0.85, -6.35]} rotation={[-0.22, 0, 0]} color={hullGreen} xray={xray} />
      {/* Horizontal Stabilizer */}
      <OutlinedBox args={[2.1, 0.12, 0.56]} position={[0, 0.18, -6.15]} color={hullDark} xray={xray} />
      {/* Spinning Tail Rotor */}
      <group position={[0.22, 1.32, -6.5]} rotation={[rotorPhase * 2.2, 0, 0]}>
        <OutlinedBox args={[0.06, 1.35, 0.14]} color="#1e293b" xray={xray} />
        <OutlinedBox args={[0.06, 0.14, 1.35]} color="#1e293b" xray={xray} />
      </group>

      {/* ================= MAIN 4-BLADE ROTOR ================= */}
      <group position={[0, 1.48, -0.65]}>
        <OutlinedCylinder args={[0.18, 0.24, 0.58, 12]} position={[0, -0.2, 0]} color={darkMetal} xray={xray} />
        <group rotation={[0, rotorPhase, 0]}>
          <OutlinedBox args={[8.8, 0.06, 0.26]} color="#1e293b" xray={xray} />
          <OutlinedBox args={[0.26, 0.06, 8.8]} color="#1e293b" xray={xray} />
        </group>
        {/* Translucent Rotor Motion-Blur Disc */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 4.45, 36]} />
          <meshBasicMaterial
            color={xray ? "#38bdf8" : "#cbd5e1"}
            transparent
            opacity={xray ? 0.12 : 0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ================= LANDING GEAR WHEELS ================= */}
      {[-0.95, 0.95].map((wx, i) => (
        <group key={i} position={[wx, -0.78, 1.15]}>
          <mesh position={[0, 0.24, 0]} rotation={[0, 0, wx > 0 ? -0.35 : 0.35]}>
            <cylinderGeometry args={[0.055, 0.055, 0.62, 8]} />
            <meshStandardMaterial color={darkMetal} />
          </mesh>
          <OutlinedCylinder
            args={[0.28, 0.28, 0.16, 14]}
            rotation={[0, 0, Math.PI / 2]}
            color="#111827"
            xray={xray}
          />
        </group>
      ))}
      {/* Tail Wheel */}
      <group position={[0, -0.58, -5.9]}>
        <OutlinedCylinder args={[0.16, 0.16, 0.1, 12]} rotation={[0, 0, Math.PI / 2]} color="#111827" xray={xray} />
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Stylized Night Countryside (Patchwork Fields, Trees, Moon, Stars)  */
/* ------------------------------------------------------------------ */
export const CountrysideNightEnv: React.FC<{
  scrollZ?: number;
  moonY?: number;
  dawnFactor?: number; // 0 = starry twilight night, 1 = warm sunrise dawn
}> = ({ scrollZ = 0, moonY = 9.5, dawnFactor = 0 }) => {
  const patches = useMemo(() => {
    const colors = ["#3f6236", "#547942", "#6e8e4e", "#2f4e2a", "#859956", "#4b6e3c"];
    const arr: { x: number; z: number; w: number; d: number; c: string }[] = [];
    for (let gx = -5; gx <= 5; gx++) {
      for (let gz = -6; gz <= 6; gz++) {
        const idx = Math.abs(gx * 7 + gz * 13) % colors.length;
        arr.push({
          x: gx * 7.2 + ((gz % 2) * 1.4),
          z: gz * 7.2,
          w: 6.9,
          d: 6.9,
          c: colors[idx],
        });
      }
    }
    return arr;
  }, []);

  const trees = useMemo(() => {
    const arr: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 38; i++) {
      const x = ((i * 19) % 44) - 22;
      const z = ((i * 29) % 60) - 30;
      if (Math.abs(x) < 3.2) continue; // Keep road clear
      arr.push({ x, z, s: 0.75 + (i % 4) * 0.25 });
    }
    return arr;
  }, []);

  const stars = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 45; i++) {
      arr.push([((i * 37) % 60) - 30, 8 + ((i * 17) % 22), -36 - (i % 10)]);
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Glowing Full Moon */}
      <mesh position={[0, moonY, -42]}>
        <circleGeometry args={[5.5, 32]} />
        <meshBasicMaterial color={dawnFactor > 0.5 ? "#fde68a" : "#fef9c3"} />
      </mesh>
      {/* Soft Moon Halo */}
      <mesh position={[0, moonY, -42.5]}>
        <circleGeometry args={[8.5, 32]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.18} />
      </mesh>

      {/* Stars */}
      {dawnFactor < 0.7 &&
        stars.map(([sx, sy, sz], i) => (
          <mesh key={i} position={[sx, sy, sz]}>
            <sphereGeometry args={[0.12, 6, 6]} />
            <meshBasicMaterial color="#e2e8f0" />
          </mesh>
        ))}

      {/* Distant Mountain Silhouettes */}
      {[-24, -8, 10, 26].map((mx, i) => (
        <mesh key={i} position={[mx, -4.5, -35]} rotation={[0, 0.4 * i, 0]}>
          <coneGeometry args={[14 + (i % 2) * 4, 14, 5]} />
          <meshBasicMaterial color={dawnFactor > 0.5 ? "#475569" : "#1e2948"} />
        </mesh>
      ))}

      {/* Ground Plane scrolling underneath */}
      <group position={[0, -9.5, scrollZ % 14.4]}>
        {/* Base dark border grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#1a2618" roughness={1} />
        </mesh>
        {/* Patchwork Rice Fields */}
        {patches.map((p, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.01, p.z]}>
            <planeGeometry args={[p.w, p.d]} />
            <meshStandardMaterial color={p.c} roughness={0.95} />
          </mesh>
        ))}
        {/* Winding Dirt Road */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <planeGeometry args={[2.6, 110]} />
          <meshStandardMaterial color="#8d6e53" roughness={1} />
        </mesh>
        {/* Blue River Strip */}
        <mesh rotation={[-Math.PI / 2, 0, 0.35]} position={[-11, 0.03, -4]}>
          <planeGeometry args={[2.8, 100]} />
          <meshStandardMaterial color="#2563eb" roughness={0.4} />
        </mesh>
        {/* Low-Poly Trees with Outlines */}
        {trees.map((tr, i) => (
          <group key={i} position={[tr.x, 0, tr.z]} scale={tr.s}>
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.16, 0.24, 1.2, 6]} />
              <meshStandardMaterial color="#4e342e" />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
              <icosahedronGeometry args={[1.05, 0]} />
              <meshStandardMaterial color="#224429" flatShading roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* Red-roofed Village Houses */}
        {[
          [-6.5, -10],
          [7.5, -16],
          [-5.2, 4],
        ].map(([hx, hz], i) => (
          <group key={i} position={[hx, 0, hz]}>
            <OutlinedBox args={[1.8, 1.2, 1.6]} position={[0, 0.6, 0]} color="#d6c7a9" />
            <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[1.55, 0.95, 4]} />
              <meshStandardMaterial color="#b91c1c" flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Armored Vehicle Target + Low-Poly Stylized Explosion Cloud         */
/* ------------------------------------------------------------------ */
export const ArmoredVehicle3D: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  thermal?: boolean;       // Glowing white-hot in FLIR thermal vision!
  explodeProgress?: number; // 0..1 stylized low-poly fireball
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], thermal = false, explodeProgress = 0 }) => {
  const hullColor = thermal ? "#f0fdf4" : "#5c6b4d";
  const wheelColor = thermal ? "#86efac" : "#1f2937";

  return (
    <group position={position} rotation={rotation}>
      {explodeProgress < 0.75 && (
        <group>
          <OutlinedBox
            args={[1.6, 0.72, 3.2]}
            position={[0, 0.65, 0]}
            color={hullColor}
            emissive={thermal ? "#bbf7d0" : "#000000"}
            emissiveIntensity={thermal ? 1.4 : 0}
          />
          <OutlinedBox
            args={[1.05, 0.45, 1.3]}
            position={[0, 1.18, 0.1]}
            color={hullColor}
            emissive={thermal ? "#ffffff" : "#000000"}
            emissiveIntensity={thermal ? 1.6 : 0}
          />
          {/* Gun barrel */}
          <OutlinedCylinder
            args={[0.07, 0.08, 1.4, 8]}
            position={[0, 1.22, 1.1]}
            rotation={[Math.PI / 2, 0, 0]}
            color={thermal ? "#dcfce7" : "#374151"}
          />
          {/* 6 Wheels */}
          {[-0.85, 0.85].map((wx) =>
            [-1.0, 0, 1.0].map((wz) => (
              <OutlinedCylinder
                key={`${wx}-${wz}`}
                args={[0.34, 0.34, 0.24, 12]}
                position={[wx, 0.34, wz]}
                rotation={[0, 0, Math.PI / 2]}
                color={wheelColor}
              />
            ))
          )}
        </group>
      )}

      {/* Stylized Low-Poly Explosion Fireball (matches reference frame 07!) */}
      {explodeProgress > 0.02 && (
        <group position={[0, 0.8, 0]}>
          {/* Shockwave Ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]} scale={0.6 + explodeProgress * 5.2}>
            <ringGeometry args={[0.7, 0.95, 28]} />
            <meshBasicMaterial color="#fde047" transparent opacity={1 - explodeProgress} side={THREE.DoubleSide} />
          </mesh>
          {/* Multi-Puff Cartoon Cloud */}
          {[
            [0, 0.5, 0, 1.5, "#fef08a"],
            [-0.9, 0.3, 0.4, 1.15, "#fb923c"],
            [0.95, 0.4, -0.3, 1.2, "#f97316"],
            [0.2, 1.35, 0.2, 1.1, "#fde047"],
            [-0.5, 1.0, -0.6, 0.95, "#ea580c"],
            [0.6, 0.2, 0.8, 1.0, "#fbbf24"],
          ].map(([px, py, pz, r, col], idx) => (
            <mesh
              key={idx}
              position={[
                (px as number) * (0.4 + explodeProgress * 1.4),
                (py as number) * (0.4 + explodeProgress * 1.6),
                (pz as number) * (0.4 + explodeProgress * 1.4),
              ]}
              scale={0.3 + Math.sin(Math.min(1, explodeProgress) * Math.PI * 0.85) * 1.55}
            >
              <icosahedronGeometry args={[r as number, 1]} />
              <meshBasicMaterial color={col as string} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* X-Ray Glowing Blueprint Grid Floor (matches frames 06 & 16!)       */
/* ------------------------------------------------------------------ */
export const XRayBlueprintGrid: React.FC<{ y?: number }> = ({ y = -1.6 }) => {
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#051c33" />
      </mesh>
      <gridHelper args={[50, 32, "#38bdf8", "#0c4a6e"]} />
    </group>
  );
};

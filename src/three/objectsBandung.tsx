import React, { useMemo } from "react";
import * as THREE from "three";
import { P } from "./objectsRig";
import { InkBox, facadeTex } from "./objectsMolase";
import { Sign, Wheel } from "./objectsMolaseProps";

type V3 = [number, number, number];
const B = InkBox;

const Cyl: React.FC<{ pos: V3; r: number; h: number; color: string; rot?: V3; hull?: number; seg?: number; emissive?: string }> = ({
  pos,
  r,
  h,
  color,
  rot = [0, 0, 0],
  hull = 0.06,
  seg = 12,
  emissive,
}) => <P geo={() => <cylinderGeometry args={[r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} emissive={emissive} />;

/* ------------------------------------------------------------------ */
/* Painted Strategy Map Texture (Bandung Utara vs Selatan + Dayeuhkolot) */
/* ------------------------------------------------------------------ */
let mapCache: THREE.CanvasTexture | null = null;
const bandungMapTex = (): THREE.CanvasTexture => {
  if (mapCache) return mapCache;
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 360;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#efe0bc";
  c.fillRect(0, 0, 512, 360);
  c.strokeStyle = "#3a2818";
  c.lineWidth = 10;
  c.strokeRect(5, 5, 502, 350);
  // Subtle grid
  c.strokeStyle = "rgba(70,50,30,0.22)";
  c.lineWidth = 2;
  for (let x = 64; x < 512; x += 64) {
    c.beginPath();
    c.moveTo(x, 12);
    c.lineTo(x, 348);
    c.stroke();
  }
  for (let y = 60; y < 360; y += 60) {
    c.beginPath();
    c.moveTo(12, y);
    c.lineTo(500, y);
    c.stroke();
  }
  // Railway dividing North & South Bandung
  c.strokeStyle = "#241726";
  c.lineWidth = 6;
  c.setLineDash([14, 8]);
  c.beginPath();
  c.moveTo(20, 155);
  c.lineTo(492, 145);
  c.stroke();
  c.setLineDash([]);
  // Labels
  c.fillStyle = "#1d3557";
  c.font = "bold 25px Inter, sans-serif";
  c.fillText("BANDUNG UTARA (SEKUTU)", 85, 95);
  c.fillStyle = "#b91c1c";
  c.fillText("BANDUNG SELATAN (API)", 95, 222);
  // Dayeuhkolot target circle
  c.strokeStyle = "#d62828";
  c.lineWidth = 5;
  c.beginPath();
  c.arc(365, 290, 26, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "#d62828";
  c.beginPath();
  c.arc(365, 290, 8, 0, Math.PI * 2);
  c.fill();
  c.font = "bold 22px Inter, sans-serif";
  c.fillText("DAYEUHKOLOT", 190, 298);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  mapCache = t;
  return t;
};

/* ================================================================== */
/* 1. BANDUNG 1946 COLONIAL CITY & WAR STREET PROPS                   */
/* ================================================================== */
export const GedungSate: React.FC<{ pos?: V3; lit?: number }> = ({ pos = [0, 0, 0], lit = 0.45 }) => {
  const map = facadeTex("#e8dcc4", 21, 5, 3, lit, false);
  return (
    <group position={pos}>
      {/* Main colonial cream facade */}
      <B pos={[0, 3.6, 0]} size={[11.0, 7.2, 4.4]} map={map} />
      {/* Sloped red-brown Nusantara colonial roof */}
      <P geo={() => <coneGeometry args={[7.4, 2.2, 4]} />} color="#7a3228" pos={[0, 8.2, 0]} rot={[0, Math.PI / 4, 0]} hull={0.04} />
      {/* Central Iconic Sate Tower */}
      <B pos={[0, 9.2, 0]} size={[2.2, 2.6, 2.2]} color="#efe4cc" ink={0.06} />
      <P geo={() => <coneGeometry args={[1.9, 1.3, 4]} />} color="#6a2a22" pos={[0, 11.1, 0]} rot={[0, Math.PI / 4, 0]} hull={0.05} />
      {/* Spire + 6 Orbs (Tusuk Sate) */}
      <Cyl pos={[0, 12.6, 0]} r={0.08} h={1.8} color="#241726" hull={0.1} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <P key={i} geo={() => <sphereGeometry args={[0.14, 10, 8]} />} color="#e8b84a" pos={[0, 12.1 + i * 0.24, 0]} hull={0.08} />
      ))}
      <Sign pos={[0, 5.4, 2.28]} w={4.4} h={0.95} text="BANDOENG · 1946" bg="#f4e8c8" fg="#7a1c1c" />
    </group>
  );
};

export const ColonialHouse: React.FC<{ pos?: V3; base?: string; seed?: number; lit?: number; burning?: number; t?: number }> = ({
  pos = [0, 0, 0],
  base = "#dfd2b8",
  seed = 4,
  lit = 0.5,
  burning = 0,
  t = 0,
}) => {
  const map = facadeTex(base, seed, 3, 2, lit, true);
  return (
    <group position={pos}>
      <B pos={[0, 2.8, 0]} size={[5.6, 5.6, 3.8]} map={map} />
      <P geo={() => <coneGeometry args={[4.4, 1.8, 4]} />} color="#8f3b2b" pos={[0, 6.45, 0]} rot={[0, Math.PI / 4, 0]} hull={0.04} />
      {burning > 0.05 && <FireCluster pos={[0, 5.4, 1.4]} scale={1.1 * burning} t={t} seed={seed} />}
    </group>
  );
};

export const SandbagBarricade: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    {[0, 1, 2].map((row) =>
      [-1.1, -0.36, 0.36, 1.1].map((x, idx) =>
        row === 2 && (idx === 0 || idx === 3) ? null : (
          <P
            key={`${row}-${idx}`}
            geo={() => <sphereGeometry args={[0.38, 10, 8]} />}
            color={row % 2 ? "#c2a878" : "#ad9364"}
            pos={[x + (row % 2) * 0.14, 0.22 + row * 0.34, (idx % 2) * 0.06]}
            scale={[1.15, 0.58, 0.78]}
            hull={0.08}
          />
        )
      )
    )}
    {/* Wooden X Cheval-de-frise post */}
    {[-1.55, 1.55].map((x, i) => (
      <group key={i} position={[x, 0.65, 0.15]}>
        <B pos={[0, 0, 0]} size={[0.12, 1.4, 0.12]} rot={[0, 0, 0.55]} color="#6b4a2a" ink={0.03} />
        <B pos={[0, 0, 0]} size={[0.12, 1.4, 0.12]} rot={[0, 0, -0.55]} color="#6b4a2a" ink={0.03} />
      </group>
    ))}
  </group>
);

export const FlagPoleID: React.FC<{ pos?: V3; h?: number; t?: number }> = ({ pos = [0, 0, 0], h = 4.6, t = 0 }) => (
  <group position={pos}>
    <Cyl pos={[0, h / 2, 0]} r={0.06} h={h} color="#4a3826" hull={0.14} />
    <group position={[0.78, h - 0.55, 0]} rotation={[0, Math.sin(t * 4) * 0.18, 0]}>
      <B pos={[0, 0.24, 0]} size={[1.5, 0.48, 0.04]} color="#d62828" ink={0.03} />
      <B pos={[0, -0.24, 0]} size={[1.5, 0.48, 0.04]} color="#fffaf0" ink={0.03} />
    </group>
  </group>
);

export const RefugeeCart: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0.72, 0]} size={[2.2, 0.16, 1.15]} color="#8b5a2b" ink={0.04} />
    {[-1.08, 1.08].map((x) => (
      <B key={x} pos={[x, 0.98, 0]} size={[0.08, 0.45, 1.15]} color="#704620" ink={0.03} />
    ))}
    {[-0.58, 0.58].map((z) => (
      <Wheel key={z} pos={[0, 0.5, z]} r={0.5} />
    ))}
    {/* Pulling shafts */}
    {[-0.36, 0.36].map((z) => (
      <B key={z} pos={[1.55, 0.72, z]} size={[1.2, 0.07, 0.07]} color="#6b4222" ink={0.02} />
    ))}
    {/* Rolled mattress + suitcases + cloth bundles */}
    <Cyl pos={[-0.45, 1.18, 0]} r={0.3} h={1.05} rot={[Math.PI / 2, 0, 0]} color="#c49a6c" />
    <B pos={[0.35, 1.12, -0.15]} size={[0.78, 0.52, 0.58]} color="#6b3e26" ink={0.04} />
    <P geo={() => <sphereGeometry args={[0.34, 10, 8]} />} color="#d97757" pos={[0.35, 1.48, 0.16]} hull={0.07} />
  </group>
);

/* ================================================================== */
/* 2. ALLIED WAR VEHICLES (3D INK-OUTLINED TANK & BOMBER)             */
/* ================================================================== */
export const AlliedTank3D: React.FC<{ pos?: V3; rot?: V3; turretYaw?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  turretYaw = 0,
}) => (
  <group position={pos} rotation={rot}>
    {/* Tracks */}
    {[-1.05, 1.05].map((x) => (
      <group key={x} position={[x, 0.42, 0]}>
        <B pos={[0, 0, 0]} size={[0.52, 0.78, 3.8]} color="#25282c" ink={0.05} />
        {[-1.3, -0.45, 0.45, 1.3].map((z) => (
          <Cyl key={z} pos={[x > 0 ? 0.28 : -0.28, -0.08, z]} r={0.28} h={0.08} rot={[0, 0, Math.PI / 2]} color="#4a5248" />
        ))}
      </group>
    ))}
    {/* Armored Hull */}
    <B pos={[0, 0.96, 0]} size={[1.95, 0.85, 3.6]} color="#526146" ink={0.06} />
    <B pos={[0, 0.96, 1.92]} size={[1.8, 0.62, 0.55]} rot={[0.45, 0, 0]} color="#46543c" ink={0.05} />
    {/* Rotating Turret + Main Cannon */}
    <group position={[0, 1.65, 0.15]} rotation={[0, turretYaw, 0]}>
      <B pos={[0, 0, 0]} size={[1.38, 0.72, 1.65]} color="#5e6e50" ink={0.06} />
      <Cyl pos={[0, 0.08, 1.75]} r={0.11} h={2.2} rot={[Math.PI / 2, 0, 0]} color="#3a4434" />
      <Cyl pos={[0, 0.46, -0.15]} r={0.34} h={0.2} color="#46543c" />
    </group>
  </group>
);

export const AlliedPlane3D: React.FC<{ pos?: V3; rot?: V3; t?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  t = 0,
}) => (
  <group position={pos} rotation={rot}>
    <Cyl pos={[0, 0, 0]} r={0.42} h={4.4} rot={[Math.PI / 2, 0, 0]} color="#6b7768" />
    <B pos={[0, 0.32, 0.2]} size={[0.52, 0.36, 1.1]} color="#8fd3ff" ink={0.04} />
    <B pos={[0, -0.05, 0.35]} size={[6.2, 0.12, 1.05]} color="#5b6658" ink={0.05} />
    <B pos={[0, 0.48, -1.9]} size={[0.12, 0.95, 0.7]} color="#5b6658" ink={0.04} />
    <B pos={[0, 0.08, -1.9]} size={[2.0, 0.1, 0.55]} color="#5b6658" ink={0.04} />
    {/* Spinning Propeller */}
    <group position={[0, 0, 2.28]} rotation={[0, 0, t * 35]}>
      <B pos={[0, 0, 0]} size={[1.35, 0.12, 0.05]} color="#241726" ink={0.02} />
    </group>
  </group>
);

/* ================================================================== */
/* 3. TRI COMMAND ROOM PROPS (INDOOR MARKAS DIVISI III)               */
/* ================================================================== */
export const BandungMapBoard: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => {
  const tex = useMemo(() => bandungMapTex(), []);
  return (
    <group position={pos} rotation={rot}>
      <B pos={[0, 0, 0]} size={[3.6, 2.5, 0.12]} color="#5a381e" ink={0.04} />
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[3.35, 2.28]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
};

export const CommandDesk: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[0, 1.05, 0]} size={[3.2, 0.14, 1.5]} color="#7a4e2a" ink={0.04} />
    {[-1.4, 1.4].flatMap((x) =>
      [-0.6, 0.6].map((z) => <B key={`${x}${z}`} pos={[x, 0.5, z]} size={[0.14, 1.0, 0.14]} color="#5a381e" ink={0.03} />)
    )}
    {/* Crank Field Telephone */}
    <B pos={[-0.95, 1.28, 0.2]} size={[0.45, 0.34, 0.34]} color="#3a4236" ink={0.03} />
    <Cyl pos={[-0.95, 1.52, 0.2]} r={0.06} h={0.48} rot={[0, 0, Math.PI / 2]} color="#1c1c22" />
    {/* Ultimatum Letter + Desk Lamp */}
    <B pos={[0.2, 1.14, 0.15]} size={[0.62, 0.03, 0.8]} color="#f7eed6" ink={0.02} />
    <Cyl pos={[1.1, 1.38, -0.3]} r={0.05} h={0.55} color="#2c2c34" />
    <P geo={() => <coneGeometry args={[0.26, 0.22, 10]} />} color="#2b7a4b" pos={[1.1, 1.66, -0.3]} hull={0.07} emissive="#ffe08a" />
  </group>
);

/* ================================================================== */
/* 4. DAYEUHKOLOT AMMO DEPOT, SEARCHLIGHT, TNT CRATES & 3D FIRE       */
/* ================================================================== */
export const AmmoDepot: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    {/* Massive reinforced concrete & dark steel warehouse */}
    <B pos={[0, 3.6, 0]} size={[11.5, 7.2, 6.2]} color="#5b626c" ink={0.08} />
    <B pos={[0, 7.4, 0]} size={[12.0, 0.45, 6.6]} color="#343a42" ink={0.06} />
    {/* Heavy Double Blast Doors */}
    <B pos={[0, 2.2, 3.16]} size={[4.2, 4.4, 0.18]} color="#3a3f46" ink={0.05} />
    <B pos={[0, 2.2, 3.26]} size={[0.14, 4.4, 0.08]} color="#181a1f" ink={0.02} />
    {/* Warning Sign */}
    <Sign pos={[0, 5.4, 3.18]} w={5.6} h={1.05} text="DANGER · AMMO DEPOT" bg="#facc15" fg="#991b1b" />
    {/* Sandbags flanking door */}
    <SandbagBarricade pos={[-3.9, 0, 3.4]} />
    <SandbagBarricade pos={[3.9, 0, 3.4]} />
  </group>
);

export const WatchTower: React.FC<{ pos?: V3; sweepAngle?: number }> = ({ pos = [0, 0, 0], sweepAngle = 0 }) => (
  <group position={pos}>
    {[-0.85, 0.85].flatMap((x) =>
      [-0.85, 0.85].map((z) => <B key={`${x}${z}`} pos={[x, 3.1, z]} size={[0.18, 6.2, 0.18]} color="#5a4028" ink={0.03} />)
    )}
    <B pos={[0, 6.2, 0]} size={[2.4, 0.22, 2.4]} color="#6b4c30" ink={0.05} />
    <B pos={[0, 6.8, 0]} size={[2.2, 1.0, 2.2]} color="#4a3826" ink={0.04} />
    <P geo={() => <coneGeometry args={[1.95, 0.9, 4]} />} color="#3a2a1e" pos={[0, 8.6, 0]} rot={[0, Math.PI / 4, 0]} hull={0.05} />
    {/* Sweeping Searchlight Beam */}
    <group position={[0, 7.1, 1.1]} rotation={[0.42, sweepAngle, 0]}>
      <Cyl pos={[0, 0, 0]} r={0.28} h={0.4} rot={[Math.PI / 2, 0, 0]} color="#1e242b" emissive="#fef08a" />
      <mesh position={[0, 0, 6.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[2.6, 13, 18, 1, true]} />
        <meshBasicMaterial color="#fef08a" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  </group>
);

export const TntCrateStack: React.FC<{ pos?: V3 }> = ({ pos = [0, 0, 0] }) => (
  <group position={pos}>
    <B pos={[-0.75, 0.55, 0]} size={[1.3, 1.1, 1.1]} color="#a86f38" ink={0.04} />
    <B pos={[0.75, 0.55, 0]} size={[1.3, 1.1, 1.1]} color="#945e2c" ink={0.04} />
    <B pos={[0, 1.65, 0]} size={[1.35, 1.1, 1.1]} color="#b87a3d" ink={0.04} />
    <Sign pos={[0, 1.65, 0.59]} w={1.15} h={0.48} text="TNT" bg="#dc2626" fg="#fef08a" />
    {/* Brass Artillery Shells beside crates */}
    {[1.75, 2.08, 2.41].map((x, i) => (
      <group key={i} position={[x, 0.45, 0.2]}>
        <Cyl pos={[0, 0, 0]} r={0.13} h={0.85} color="#d4a437" />
        <P geo={() => <coneGeometry args={[0.13, 0.28, 10]} />} color="#b91c1c" pos={[0, 0.56, 0]} hull={0.08} />
      </group>
    ))}
  </group>
);

export const FireCluster: React.FC<{ pos?: V3; scale?: number; t?: number; seed?: number }> = ({
  pos = [0, 0, 0],
  scale = 1,
  t = 0,
  seed = 1,
}) => (
  <group position={pos} scale={scale}>
    {[
      [0, 0.7, 0, 0.95, "#f97316"],
      [-0.75, 0.5, 0.2, 0.75, "#dc2626"],
      [0.75, 0.55, -0.1, 0.78, "#ea580c"],
      [0.1, 1.25, 0.15, 0.65, "#facc15"],
    ].map(([x, y, z, r, col], idx) => {
      const pulse = 1 + Math.sin(t * 7 + seed + idx * 1.4) * 0.14;
      return (
        <P
          key={idx}
          geo={() => <icosahedronGeometry args={[r as number, 1]} />}
          color={col as string}
          emissive={col as string}
          pos={[x as number, (y as number) + Math.sin(t * 5 + idx) * 0.12, z as number]}
          scale={[pulse, pulse * 1.25, pulse]}
          hull={0.05}
        />
      );
    })}
  </group>
);

/* 3D Detachable Hand Props (for beanHandWorld() action continuity!) */
export const Dynamite3D: React.FC<{ pos: V3; rot?: V3; scale?: number; lit?: boolean; t?: number }> = ({
  pos,
  rot = [0, 0, 0],
  scale = 1,
  lit = true,
  t = 0,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    {[-0.08, 0, 0.08].map((x, i) => (
      <Cyl key={i} pos={[x, 0, 0]} r={0.045} h={0.42} color="#dc2626" hull={0.1} />
    ))}
    <B pos={[0, 0.08, 0]} size={[0.26, 0.05, 0.12]} color="#1c1917" ink={0.02} />
    <B pos={[0, -0.08, 0]} size={[0.26, 0.05, 0.12]} color="#1c1917" ink={0.02} />
    {lit && (
      <P
        geo={() => <sphereGeometry args={[0.07 + Math.sin(t * 25) * 0.02, 8, 8]} />}
        color="#fef08a"
        emissive="#f97316"
        pos={[0.06, 0.29, 0]}
        hull={0.12}
      />
    )}
  </group>
);

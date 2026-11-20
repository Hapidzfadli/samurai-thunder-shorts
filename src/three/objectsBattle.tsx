import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";
import { hash, useTex } from "./objectsSoda";

const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/* ------------------------------------------------------------------ */
/* Bright battlefield: grass, dirt road, river, hills with trees,       */
/* far mountains and clouds                                              */
/* ------------------------------------------------------------------ */
export const Terrain: React.FC<{ t: number; hillAt?: Vec3 }> = ({ t, hillAt = [-20, 0, 0] }) => {
  const grass = useTex("grass", 512, 512, (g) => {
    g.fillStyle = "#7fb04a";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1800; i++) {
      const a = hash(i, 1);
      g.fillStyle = a > 0.6 ? "rgba(190,215,90,0.35)" : a > 0.3 ? "rgba(70,125,50,0.35)" : "rgba(150,170,70,0.3)";
      g.fillRect(hash(i, 2) * 512, hash(i, 3) * 512, 3 + hash(i, 4) * 6, 3 + hash(i, 5) * 6);
    }
    for (let i = 0; i < 400; i++) {
      g.strokeStyle = "rgba(55,105,40,0.5)";
      g.lineWidth = 2;
      const x = hash(i, 6) * 512;
      const y = hash(i, 7) * 512;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (hash(i, 8) - 0.5) * 6, y - 8 - hash(i, 9) * 6);
      g.stroke();
    }
  }, [18, 10]);
  const dirt = useTex("dirt", 256, 256, (g) => {
    g.fillStyle = "#b9955f";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = hash(i, 1) > 0.5 ? "rgba(255,235,190,0.25)" : "rgba(110,80,45,0.3)";
      g.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 2 + hash(i, 4) * 3, 2 + hash(i, 5) * 3);
    }
  }, [12, 2]);
  const trees = useMemo(() => new Array(38).fill(0).map((_, i) => ({ x: -34 + hash(i, 1) * 70, z: (i % 2 ? 1 : -1) * (15 + hash(i, 2) * 30), s: 0.8 + hash(i, 3) * 1.1 })), []);
  const clouds = useMemo(() => new Array(9).fill(0).map((_, i) => ({ x: -50 + hash(i, 4) * 120, y: 24 + hash(i, 5) * 12, z: -40 - hash(i, 6) * 30, s: 5 + hash(i, 7) * 6 })), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 120]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[220, 5]} />
        <meshStandardMaterial map={dirt} roughness={1} />
      </mesh>
      {/* river behind the Takeda side */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[34, 0.03, 0]}>
        <planeGeometry args={[7, 120]} />
        <meshStandardMaterial color="#4aa3d8" roughness={0.3} metalness={0.1} emissive="#1e5f8a" emissiveIntensity={0.25} />
      </mesh>
      {/* hill for the commander */}
      <M position={[hillAt[0], hillAt[1] - 1.2, hillAt[2]]} scale={[9, 4.2, 12]}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshStandardMaterial color="#78a845" roughness={1} flatShading />
      </M>
      {/* far mountains */}
      {[-60, -30, 5, 40, 70].map((x, i) => (
        <mesh key={i} position={[x, 9 + (i % 2) * 3, -48 - (i % 3) * 5]} scale={[16 + i * 2, 15 + (i % 2) * 6, 10]}>
          <coneGeometry args={[1, 1, 5]} />
          <meshStandardMaterial color={i % 2 ? "#7f98b8" : "#6f89aa"} flatShading roughness={1} />
        </mesh>
      ))}
      {/* trees */}
      {trees.map((tr, i) => (
        <group key={i} position={[tr.x, 0, tr.z]} scale={tr.s}>
          <M position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.18, 0.24, 1.4, 6]} />
            <meshStandardMaterial color="#6b4a2c" />
          </M>
          <M position={[0, 2.1, 0]}>
            <coneGeometry args={[1.1, 2.4, 7]} />
            <meshStandardMaterial color={i % 3 ? "#3f8f46" : "#4c9b3a"} flatShading />
          </M>
          <M position={[0, 3.1, 0]}>
            <coneGeometry args={[0.8, 1.8, 7]} />
            <meshStandardMaterial color="#4aa04a" flatShading />
          </M>
        </group>
      ))}
      {/* clouds */}
      {clouds.map((c, i) => (
        <group key={i} position={[c.x + t * 0.5, c.y, c.z]}>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[(k - 1.5) * c.s * 0.45, Math.sin(k * 1.7) * 0.6, 0]} scale={[c.s * (0.5 + 0.1 * k % 3), c.s * 0.3, c.s * 0.35]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.92} />
            </mesh>
          ))}
        </group>
      ))}
      <ambientLight intensity={1.15} color="#dfeaff" />
      <hemisphereLight args={["#bfe0ff", "#7d9a55", 0.7]} />
      <directionalLight position={[-14, 24, 14]} intensity={2.4} color="#fff3d6" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={20} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={90} shadow-bias={-0.0005} />
      <fog attach="fog" args={["#cfe4f5", 45, 130]} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Palisade                                                              */
/* ------------------------------------------------------------------ */
export const Palisade: React.FC<{ x: number; z0: number; z1: number; rows?: number }> = ({ x, z0, z1, rows = 2 }) => {
  const n = Math.round(Math.abs(z1 - z0) / 0.42);
  return (
    <group>
      {new Array(rows).fill(0).map((_, r) =>
        new Array(n).fill(0).map((_, i) => {
          const z = z0 + ((z1 - z0) * (i + (r % 2) * 0.5)) / n;
          const h = 1.35 + hash(i, r) * 0.25;
          return (
            <group key={`${r}${i}`} position={[x + r * 0.35, h / 2, z]} rotation={[0, 0, (hash(i, r + 5) - 0.5) * 0.06]}>
              <M>
                <cylinderGeometry args={[0.1, 0.12, h, 6]} />
                <meshStandardMaterial color={r ? "#7a5632" : "#8a6238"} roughness={0.9} flatShading />
              </M>
              <M position={[0, h / 2 + 0.1, 0]}>
                <coneGeometry args={[0.1, 0.22, 6]} />
                <meshStandardMaterial color="#9a7040" flatShading />
              </M>
            </group>
          );
        })
      )}
      {[0.5, 1.0].map((y) => (
        <M key={y} position={[x + 0.17, y, (z0 + z1) / 2]}>
          <boxGeometry args={[0.12, 0.1, Math.abs(z1 - z0)]} />
          <meshStandardMaterial color="#5e4026" />
        </M>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Banners (nobori / sashimono) with mon                                 */
/* ------------------------------------------------------------------ */
export const Nobori: React.FC<{ position: Vec3; t: number; clan: "oda" | "takeda"; h?: number; seed?: number; rotationY?: number }> = ({ position, t, clan, h = 3.6, seed = 0, rotationY = 0 }) => {
  const tex = useTex("mon" + clan, 128, 384, (g) => {
    if (clan === "takeda") {
      g.fillStyle = "#c21d1d";
      g.fillRect(0, 0, 128, 384);
      g.fillStyle = "#f4efe0";
      for (let k = 0; k < 2; k++) {
        const cy = 90 + k * 170;
        g.beginPath();
        g.moveTo(64, cy - 42);
        g.lineTo(100, cy);
        g.lineTo(64, cy + 42);
        g.lineTo(28, cy);
        g.closePath();
        g.fill();
        g.fillStyle = "#c21d1d";
        g.beginPath();
        g.moveTo(64, cy - 22);
        g.lineTo(82, cy);
        g.lineTo(64, cy + 22);
        g.lineTo(46, cy);
        g.closePath();
        g.fill();
        g.fillStyle = "#f4efe0";
      }
    } else {
      g.fillStyle = "#f4f1e8";
      g.fillRect(0, 0, 128, 384);
      g.fillStyle = "#1d3f8a";
      g.fillRect(0, 0, 128, 22);
      g.fillRect(0, 362, 128, 22);
      g.strokeStyle = "#1d3f8a";
      g.lineWidth = 10;
      g.beginPath();
      g.arc(64, 160, 42, 0, 7);
      g.stroke();
      g.fillStyle = "#1d3f8a";
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(64 + Math.cos(i * 1.256) * 22, 160 + Math.sin(i * 1.256) * 22, 11, 0, 7);
        g.fill();
      }
    }
  });
  const segs = 6;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, h, 5]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
      <mesh position={[0.32, h - 0.1, 0]}>
        <boxGeometry args={[0.7, 0.04, 0.04]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
      {new Array(segs).fill(0).map((_, i) => {
        const k = i / segs;
        return (
          <mesh key={i} position={[0.32 + Math.sin(t * 3 + seed + k * 4) * 0.06 * (0.3 + k), h - 0.1 - (k + 0.5 / segs) * 1.9, Math.sin(t * 2.4 + seed + k * 3) * 0.08 * k]} rotation={[0, Math.sin(t * 2.6 + seed + k * 3) * 0.2 * k, 0]}>
            <planeGeometry args={[0.6, 1.9 / segs + 0.01]} />
            <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Cheap soldiers for the crowds                                         */
/* ------------------------------------------------------------------ */
export const Soldier: React.FC<{ position: Vec3; rotationY?: number; clan: "oda" | "takeda"; t: number; seed?: number; banner?: boolean; spear?: boolean }> = ({ position, rotationY = 0, clan, t, seed = 0, banner = false, spear = false }) => {
  const body = clan === "takeda" ? "#a81c1c" : "#2f4a7c";
  const hat = clan === "takeda" ? "#1a1418" : "#3a3a48";
  const sway = Math.sin(t * 2 + seed) * 0.03;
  return (
    <group position={position} rotation={[0, rotationY, sway]}>
      <M position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.2, 0.5, 4, 8]} />
        <meshStandardMaterial color={body} roughness={0.8} flatShading />
      </M>
      <M position={[0, 0.22, 0]}>
        <boxGeometry args={[0.36, 0.34, 0.26]} />
        <meshStandardMaterial color="#1f1d26" flatShading />
      </M>
      <M position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color="#c79a72" flatShading />
      </M>
      {clan === "oda" ? (
        <M position={[0, 1.12, 0]}>
          <coneGeometry args={[0.3, 0.16, 8]} />
          <meshStandardMaterial color={hat} flatShading />
        </M>
      ) : (
        <>
          <M position={[0, 1.08, 0]}>
            <sphereGeometry args={[0.16, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={hat} flatShading />
          </M>
          <mesh position={[0, 1.28, 0.02]}>
            <boxGeometry args={[0.03, 0.2, 0.02]} />
            <meshStandardMaterial color="#d8a93a" />
          </mesh>
        </>
      )}
      {spear && (
        <mesh position={[0.28, 0.9, 0.12]}>
          <cylinderGeometry args={[0.015, 0.015, 2.2, 4]} />
          <meshStandardMaterial color="#3a2a1c" />
        </mesh>
      )}
      {banner && <Nobori position={[-0.12, 0.2, -0.18]} t={t} clan={clan} h={2.4} seed={seed} />}
    </group>
  );
};

export const Crowd: React.FC<{ origin: Vec3; cols: number; rows: number; dx?: number; dz?: number; clan: "oda" | "takeda"; t: number; rotationY?: number; bannerEvery?: number; spear?: boolean }> = ({ origin, cols, rows, dx = 0.9, dz = 0.85, clan, t, rotationY = 0, bannerEvery = 7, spear = false }) => (
  <group>
    {new Array(rows).fill(0).flatMap((_, r) =>
      new Array(cols).fill(0).map((_, c) => {
        const k = r * cols + c;
        const jx = (hash(k, 1) - 0.5) * 0.35;
        const jz = (hash(k, 2) - 0.5) * 0.35;
        return <Soldier key={k} position={[origin[0] + r * dx + jx, origin[1], origin[2] + (c - (cols - 1) / 2) * dz + jz]} rotationY={rotationY} clan={clan} t={t} seed={k} banner={k % bannerEvery === 3} spear={spear && k % 3 === 0} />;
      })
    )}
  </group>
);

/* ------------------------------------------------------------------ */
/* Puffs: gunsmoke and dust                                              */
/* ------------------------------------------------------------------ */
export const Puffs: React.FC<{ origin: Vec3; start: number; f: number; n?: number; size?: number; color?: string; spread?: number; rise?: number; life?: number; seed?: number; dir?: Vec3 }> = ({ origin, start, f, n = 10, size = 0.7, color = "#f4f4f6", spread = 1.2, rise = 1.4, life = 70, seed = 1, dir = [1, 0, 0] }) => {
  const k = (f - start) / life;
  if (k < 0 || k > 1) return null;
  return (
    <group>
      {new Array(n).fill(0).map((_, i) => {
        const a = hash(i, seed) * 6.28;
        const rr = hash(i, seed + 3);
        const e = Math.min(1, k * 1.6);
        return (
          <mesh key={i} position={[origin[0] + dir[0] * e * spread * (0.4 + rr) + Math.cos(a) * spread * 0.4 * e, origin[1] + rise * k * (0.4 + rr) + 0.2, origin[2] + dir[2] * e * spread * rr + Math.sin(a) * spread * 0.4 * e]} scale={size * (0.5 + 1.6 * e) * (0.6 + 0.6 * rr)}>
            <sphereGeometry args={[0.5, 9, 7]} />
            <meshBasicMaterial color={color} transparent opacity={0.75 * (1 - k)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Maku: React.FC<{ position: Vec3; w?: number }> = ({ position, w = 4 }) => (
  <group position={position}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0, 1.0, (i - 1) * (w / 3)]}>
        <boxGeometry args={[0.05, 1.6, w / 3 - 0.04]} />
        <meshStandardMaterial color={i === 1 ? "#f4f1e8" : "#1d3f8a"} />
      </mesh>
    ))}
  </group>
);
export { clamp01 };

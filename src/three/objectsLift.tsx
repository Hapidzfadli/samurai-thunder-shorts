import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";
import { Sign, cl, hash, sm, useTex, usePlanks } from "./objectsSoda";

const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;

const useMarble = (a: string, b: string) =>
  useTex("marble" + a + b, 256, 256, (g) => {
    g.fillStyle = a;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = b;
    g.fillRect(0, 0, 128, 128);
    g.fillRect(128, 128, 128, 128);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(120,120,140,${0.05 + hash(i, 1) * 0.1})`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(hash(i, 2) * 256, hash(i, 3) * 256);
      g.lineTo(hash(i, 4) * 256, hash(i, 5) * 256);
      g.stroke();
    }
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 3;
    g.strokeRect(0, 0, 256, 256);
  }, [10, 10]);

const Plant: React.FC<{ position: Vec3; s?: number }> = ({ position, s = 1 }) => (
  <group position={position} scale={s}>
    <M position={[0, 0.3, 0]}>
      <cylinderGeometry args={[0.3, 0.22, 0.6, 10]} />
      <meshStandardMaterial color="#b4543a" roughness={0.8} />
    </M>
    {[0, 1, 2, 3, 4].map((i) => (
      <M key={i} position={[Math.sin(i * 1.3) * 0.2, 0.9 + (i % 2) * 0.25, Math.cos(i * 1.3) * 0.15]} rotation={[0, 0, Math.sin(i * 1.3) * 0.5]}>
        <coneGeometry args={[0.16, 0.9, 5]} />
        <meshStandardMaterial color="#2f9e5a" flatShading />
      </M>
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/* Lobby (also used for the 20th floor)                                  */
/* ------------------------------------------------------------------ */
export const Lobby: React.FC<{ t: number; doorOpen?: number; title?: string; sub?: string; warm?: boolean; portal?: boolean }> = ({ t, doorOpen = 0, title = "PRIMA TOWER", sub = "LOBI UTAMA", warm = true, portal = false }) => {
  const marble = useMarble(warm ? "#ece4d6" : "#dde6f0", warm ? "#cbbfa8" : "#b8c6d8");
  const gold = useTex("gold", 128, 512, (g) => {
    g.fillStyle = "#c9a45a";
    g.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(255,240,190,${hash(i, 1) * 0.12})`;
      g.fillRect(0, hash(i, 2) * 512, 128, 2);
    }
  });
  const open = sm(cl(doorOpen));
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial map={marble} roughness={0.25} metalness={0.15} />
      </mesh>
      {portal ? (
        <>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 7.0, 3.5, -2.2]}>
              <planeGeometry args={[11, 7]} />
              <meshStandardMaterial map={gold} color={warm ? "#ffffff" : "#b9c8e8"} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 5.4, -2.2]}>
            <planeGeometry args={[3, 3.6]} />
            <meshStandardMaterial map={gold} color={warm ? "#ffffff" : "#b9c8e8"} roughness={0.6} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 3.5, -2.2]}>
          <planeGeometry args={[24, 7]} />
          <meshStandardMaterial map={gold} color={warm ? "#ffffff" : "#b9c8e8"} roughness={0.6} />
        </mesh>
      )}
      {[-5.5, -3.6, 3.6, 5.5].map((x, i) => (
        <M key={i} position={[x, 3, -2.1]}>
          <boxGeometry args={[0.7, 5.2, 0.15]} />
          <meshStandardMaterial color={warm ? "#7a5a2a" : "#33415c"} roughness={0.5} />
        </M>
      ))}
      <Sign position={[0, 5.9, -2.1]} size={[4.6, 0.9]} text={title} sub={sub} bg="#1b1f2e" fg="#f5e2a8" accent="#c9a45a" />
      {/* lift doors */}
      {!portal && (
        <M position={[0, 1.7, -2.12]}>
          <boxGeometry args={[3.0, 3.6, 0.1]} />
          <meshStandardMaterial color="#2a2f3d" />
        </M>
      )}
      {[-1, 1].map((s) => (
        <M key={s} position={[s * (0.72 + open * 0.7), 1.65, -2.02]}>
          <boxGeometry args={[1.38, 3.3, 0.08]} />
          <meshStandardMaterial color="#b7bfca" metalness={0.8} roughness={0.3} />
        </M>
      ))}
      <mesh position={[0, 3.75, -2.0]}>
        <boxGeometry args={[1.0, 0.34, 0.06]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[0, 3.75, -1.96]}>
        <boxGeometry args={[0.2, 0.16, 0.02]} />
        <meshBasicMaterial color={Math.sin(t * 5) > 0 ? "#ff4d4d" : "#7a1b1b"} />
      </mesh>
      <Plant position={[-4.4, 0, -1.2]} s={1.3} />
      <Plant position={[4.4, 0, -1.2]} s={1.3} />
      <ambientLight intensity={0.85} color={warm ? "#fff0d8" : "#d8e8ff"} />
      <directionalLight position={[2, 6, 6]} intensity={1.6} color={warm ? "#fff3dc" : "#e6f0ff"} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-2} />
      <pointLight position={[0, 4.5, 2]} intensity={50} distance={16} color="#ffe2b0" />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Lift cabin (camera sits at the door looking in)                       */
/* ------------------------------------------------------------------ */
export const LiftRoom: React.FC<{ t: number; z0?: number; tint?: string; gas?: number }> = ({ t, z0 = 0, tint = "#b9c0cc", gas = 0 }) => {
  const panel = useTex("liftpanel" + tint, 256, 256, (g) => {
    g.fillStyle = tint;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(i * 64 + 6, 8, 52, 240);
      g.strokeStyle = "rgba(0,0,0,0.3)";
      g.lineWidth = 3;
      g.strokeRect(i * 64 + 6, 8, 52, 240);
    }
  }, [3, 1]);
  const wood = usePlanks("#8a6a4a");
  return (
    <group position={[0, 0, z0]}>
      <mesh position={[0, 1.7, -1.3]}>
        <planeGeometry args={[4.6, 3.4]} />
        <meshStandardMaterial map={panel} metalness={0.5} roughness={0.35} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.3, 1.7, 0.7]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[4, 3.4]} />
          <meshStandardMaterial map={panel} metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.7]} receiveShadow>
        <planeGeometry args={[4.6, 4]} />
        <meshStandardMaterial map={wood} roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.4, 0.7]}>
        <planeGeometry args={[4.6, 4]} />
        <meshStandardMaterial color="#eef1f6" emissive="#fff6dc" emissiveIntensity={0.6} />
      </mesh>
      <M position={[0, 1.2, -1.22]}>
        <boxGeometry args={[4.4, 0.08, 0.1]} />
        <meshStandardMaterial color="#d8c27a" metalness={0.9} roughness={0.2} />
      </M>
      <M position={[1.95, 1.4, 0.2]}>
        <boxGeometry args={[0.08, 0.9, 0.5]} />
        <meshStandardMaterial color="#222" />
      </M>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[1.9, 1.15 + i * 0.2, 0.2]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={i === 2 ? "#ffd23f" : "#9aa0ac"} />
        </mesh>
      ))}
      <mesh position={[-1.9, 3.2, -1.1]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      <mesh position={[-1.9, 3.2, -0.95]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={Math.sin(t * 6) > 0 ? "#ff3b30" : "#551010"} />
      </mesh>
      <ambientLight intensity={0.9 - 0.2 * gas} color="#fff4e0" />
      <pointLight position={[0, 3.0, 1]} intensity={70} distance={12} color={gas > 0.3 ? "#c8f08a" : "#fff0d0"} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* The smell                                                             */
/* ------------------------------------------------------------------ */
export const Gas: React.FC<{ origin: Vec3; k: number; t: number; spread?: number }> = ({ origin, k, t, spread = 2.6 }) => {
  const puffs = useMemo(() => new Array(34).fill(0).map((_, i) => ({ a: hash(i, 1) * 6.28, r: hash(i, 2), y: hash(i, 3), s: 0.4 + hash(i, 4) * 0.5, ph: hash(i, 5) * 6 })), []);
  return (
    <group>
      {puffs.map((p, i) => {
        const e = sm(cl(k * 1.2 - p.r * 0.2));
        if (e <= 0.01) return null;
        const rr = e * spread * (0.3 + p.r);
        return (
          <mesh key={i} position={[origin[0] + Math.cos(p.a) * rr + Math.sin(t * 1.2 + p.ph) * 0.08, origin[1] + p.y * 1.6 * e + Math.sin(t * 1.5 + p.ph) * 0.06, origin[2] + Math.sin(p.a) * rr * 0.6]} scale={p.s * (0.6 + e)}>
            <sphereGeometry args={[0.55, 10, 8]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#a8d65a" : "#86c232"} transparent opacity={0.22 + 0.1 * (i % 2)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Building exterior with a glass lift climbing                          */
/* ------------------------------------------------------------------ */
export const Building: React.FC<{ t: number; floor: number }> = ({ t, floor }) => {
  const facade = useTex("facade", 256, 1024, (g) => {
    g.fillStyle = "#26345a";
    g.fillRect(0, 0, 256, 1024);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 4; x++) {
        const on = hash(x, y) > 0.35;
        g.fillStyle = on ? "#f7dc8c" : "#3c4c78";
        g.fillRect(x * 64 + 8, y * 51 + 8, 48, 36);
      }
    }
  });
  const y = 1.0 + floor * 0.95;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#2a3350" />
      </mesh>
      <mesh position={[0, 10, -3]}>
        <boxGeometry args={[8, 20, 3]} />
        <meshStandardMaterial map={facade} roughness={0.7} />
      </mesh>
      {[-7, -12, 8, 13].map((x, i) => (
        <mesh key={i} position={[x, 5 + hash(i, 1) * 5, -6 - i]}>
          <boxGeometry args={[3.5, 10 + hash(i, 2) * 8, 3]} />
          <meshStandardMaterial map={facade} roughness={0.8} />
        </mesh>
      ))}
      <M position={[0, 10, -1.35]}>
        <boxGeometry args={[1.5, 20.4, 0.1]} />
        <meshStandardMaterial color="#10162b" />
      </M>
      <M position={[0, y, -1.2]}>
        <boxGeometry args={[1.2, 1.0, 0.3]} />
        <meshStandardMaterial color="#dfe7f5" emissive="#fff2c8" emissiveIntensity={0.7} metalness={0.5} roughness={0.3} />
      </M>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.4 + i * 0.2, y + 0.05, -1.04]}>
          <circleGeometry args={[0.07, 8]} />
          <meshBasicMaterial color={["#ffd1b0", "#a8d6ff", "#e0b0ff", "#b0ffd1", "#ffe08a"][i]} />
        </mesh>
      ))}
      {new Array(30).fill(0).map((_, i) => (
        <mesh key={i} position={[(hash(i, 1) - 0.5) * 50, 6 + hash(i, 2) * 22, -30]}>
          <circleGeometry args={[0.07 + hash(i, 3) * 0.08, 5]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      ))}
      <ambientLight intensity={0.8} color="#9aa8ff" />
      <directionalLight position={[-4, 8, 8]} intensity={1.4} color="#c9d3ff" />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Inside Pak Budi's belly: a bacteria party                             */
/* ------------------------------------------------------------------ */
export const Bacteria: React.FC<{ position: Vec3; t: number; color?: string; seed?: number; scale?: number; cheer?: number }> = ({ position, t, color = "#b6e04a", seed = 0, scale = 1, cheer = 0 }) => {
  const hop = Math.abs(Math.sin(t * 5 + seed)) * 0.18 * (0.6 + cheer);
  return (
    <group position={[position[0], position[1] + hop, position[2]]} scale={scale}>
      <M scale={[1, 1.15, 1]}>
        <sphereGeometry args={[0.5, 14, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </M>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.18, 0.12, 0.44]}>
            <sphereGeometry args={[0.13, 10, 10]} />
            <meshBasicMaterial color="#fff" />
          </mesh>
          <mesh position={[s * 0.18, 0.12, 0.55]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          <mesh position={[s * 0.52, -0.05 + Math.sin(t * 9 + seed + s) * 0.14, 0.1]} rotation={[0, 0, -s * 0.9]}>
            <capsuleGeometry args={[0.05, 0.3, 4, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.14, 0.47]} scale={[1, 0.8 + 0.5 * cheer, 0.4]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshBasicMaterial color="#3a1010" />
      </mesh>
      <M position={[0, 0.72, 0]} rotation={[0, 0, 0.1]}>
        <coneGeometry args={[0.22, 0.5, 8]} />
        <meshStandardMaterial color={["#ff4d6d", "#4cc9f0", "#ffd23f"][seed % 3]} />
      </M>
    </group>
  );
};

export const Gut: React.FC<{ t: number; gas: number; cheer?: number }> = ({ t, gas, cheer = 0 }) => {
  const confetti = useMemo(() => new Array(60).fill(0).map((_, i) => ({ x: (hash(i, 1) - 0.5) * 7, z: -1 + hash(i, 2) * 3, ph: hash(i, 3) * 6, c: ["#ff4d6d", "#4cc9f0", "#ffd23f", "#7ddc8b"][i % 4] })), []);
  const chunks = useMemo(() => new Array(7).fill(0).map((_, i) => ({ x: (hash(i, 4) - 0.5) * 6, y: -1 + hash(i, 5) * 3, z: -2 + hash(i, 6) * 2, s: 0.3 + hash(i, 7) * 0.3 })), []);
  const bubbles = useMemo(() => new Array(18).fill(0).map((_, i) => ({ x: (hash(i, 8) - 0.5) * 6.5, y: -1.5 + hash(i, 9) * 3.5, z: -2 + hash(i, 10) * 3 })), []);
  return (
    <group>
      <mesh rotation={[0, 0, 0]} position={[0, 0.5, -2]}>
        <cylinderGeometry args={[5.5, 5.5, 60, 16, 1, true]} />
        <meshStandardMaterial color="#e89aa8" side={THREE.BackSide} roughness={0.8} flatShading emissive="#6e2a3c" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.5, -2]} />
      {new Array(10).fill(0).map((_, i) => (
        <mesh key={i} position={[0, 0.5, -14 + i * 4]} rotation={[0, 0, 0]}>
          <torusGeometry args={[5.4, 0.3, 6, 20]} />
          <meshStandardMaterial color="#d9788c" flatShading />
        </mesh>
      ))}
      {chunks.map((c, i) => (
        <mesh key={i} position={[c.x, c.y + Math.sin(t + i) * 0.1, c.z]} scale={c.s} rotation={[t * 0.3 + i, t * 0.2, 0]}>
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color="#6b4423" flatShading />
        </mesh>
      ))}
      {bubbles.map((b, i) => {
        const e = sm(cl(gas * 1.4 - i / 30));
        if (e <= 0.02) return null;
        return (
          <mesh key={i} position={[b.x, b.y + e * 0.6, b.z]} scale={0.25 + e * 0.6}>
            <sphereGeometry args={[0.6, 12, 10]} />
            <meshStandardMaterial color="#a8e063" transparent opacity={0.55} emissive="#7bc043" emissiveIntensity={0.5} depthWrite={false} />
          </mesh>
        );
      })}
      {confetti.map((c, i) => (
        <mesh key={i} position={[c.x, 3 - ((t * 0.9 + c.ph) % 1) * 5.5, c.z]} rotation={[t * 4 + i, t * 3, 0]}>
          <boxGeometry args={[0.12, 0.2, 0.02]} />
          <meshBasicMaterial color={c.c} />
        </mesh>
      ))}
      <mesh position={[0, 3.4, -1.5]}>
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshStandardMaterial color="#e5e9f5" metalness={0.9} roughness={0.15} emissive="#ffffff" emissiveIntensity={0.3} flatShading />
      </mesh>
      {[-2.4, -0.8, 0.8, 2.4].map((x, i) => (
        <Bacteria key={i} position={[x, -1.6, -0.6 - (i % 2) * 0.7]} t={t} seed={i} color={["#b6e04a", "#8ed16f", "#d4e157", "#a5d63f"][i]} scale={0.9} cheer={cheer} />
      ))}
      <ambientLight intensity={1.1} color="#ffc6d2" />
      <pointLight position={[0, 3, 2]} intensity={90} distance={16} color="#fff0f0" />
      <pointLight position={[0, 0, 4]} intensity={60} distance={14} color={gas > 0.5 ? "#c8f08a" : "#ffd6a0"} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* HR office                                                             */
/* ------------------------------------------------------------------ */
export const HRRoom: React.FC<{ t: number }> = ({ t }) => {
  const wood = usePlanks("#a07448");
  const marble = useMarble("#d9d4c8", "#c3bcab");
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial map={marble} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.2, -4]}>
        <planeGeometry args={[20, 6.4]} />
        <meshStandardMaterial color="#e9e2d2" roughness={0.9} />
      </mesh>
      <mesh position={[-1.8, 3.2, -3.95]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshBasicMaterial color="#8fd3ff" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-3.6 + i * 0.9, 1.9 + hash(i, 3) * 0.8, -3.9]}>
          <boxGeometry args={[0.6, 1.2 + hash(i, 4) * 1.2, 0.02]} />
          <meshBasicMaterial color="#6f8fb8" />
        </mesh>
      ))}
      <M position={[-1.8, 3.2, -3.92]}>
        <boxGeometry args={[4.6, 3.6, 0.06]} />
        <meshStandardMaterial color="#5a4630" />
      </M>
      <mesh position={[-1.8, 3.2, -3.88]}>
        <planeGeometry args={[4.4, 3.4]} />
        <meshBasicMaterial color="#8fd3ff" transparent opacity={0.0} />
      </mesh>
      <Sign position={[2.6, 3.8, -3.9]} size={[2.2, 0.9]} text="HRD" sub="RUANG WAWANCARA" bg="#1d3557" fg="#f1faee" accent="#e63946" />
      <M position={[0.6, 0.78, -2.3]}>
        <boxGeometry args={[3.4, 0.12, 1.4]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </M>
      <M position={[0.6, 0.38, -2.3]}>
        <boxGeometry args={[3.2, 0.7, 1.2]} />
        <meshStandardMaterial map={wood} roughness={0.9} />
      </M>
      <Plant position={[4.4, 0, -3.2]} s={1.4} />
      <ambientLight intensity={0.9} color="#fff4e0" />
      <directionalLight position={[2, 6, 6]} intensity={1.6} color="#fff3dc" />
      <pointLight position={[0, 4, 2]} intensity={50} distance={14} color="#ffe6c0" />
    </group>
  );
};
export { sm, cl };

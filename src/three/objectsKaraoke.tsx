import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";
import { Sign, cl, hash, sm, useTex, usePlanks, useSand } from "./objectsSoda";

const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;

const useWindows = (lit: string) =>
  useTex("win" + lit, 256, 256, (g) => {
    g.fillStyle = "#5b4636";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = lit;
    g.fillRect(16, 16, 96, 96);
    g.fillRect(144, 16, 96, 96);
    g.strokeStyle = "#2a1c12";
    g.lineWidth = 8;
    g.strokeRect(16, 16, 96, 96);
    g.strokeRect(144, 16, 96, 96);
    g.beginPath();
    g.moveTo(64, 16);
    g.lineTo(64, 112);
    g.moveTo(192, 16);
    g.lineTo(192, 112);
    g.stroke();
  });

const House: React.FC<{ position: Vec3; w?: number; h?: number; color: string; roof: string; lit?: string; label?: string; door?: string }> = ({ position, w = 4.2, h = 3, color, roof, lit = "#ffe08a", door = "#6b3a1c" }) => {
  const wall = useTex("wall" + color, 256, 256, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(0,0,0,${hash(i, 1) * 0.07})`;
      g.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 3, 3);
    }
    for (let y = 0; y < 8; y++) {
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillRect(0, y * 32, 256, 2);
    }
  });
  const win = useWindows(lit);
  return (
    <group position={position}>
      <M position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 3]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </M>
      <M position={[0, h + 0.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.75]}>
        <coneGeometry args={[w * 0.78, 1.3, 4]} />
        <meshStandardMaterial color={roof} roughness={0.8} flatShading />
      </M>
      <mesh position={[-w * 0.24, h * 0.62, 1.52]}>
        <planeGeometry args={[w * 0.4, h * 0.4]} />
        <meshBasicMaterial map={win} toneMapped={false} />
      </mesh>
      <M position={[w * 0.26, 0.85, 1.52]}>
        <boxGeometry args={[0.9, 1.7, 0.08]} />
        <meshStandardMaterial color={door} />
      </M>
    </group>
  );
};

const Speaker: React.FC<{ position: Vec3; pulse: number; s?: number }> = ({ position, pulse, s = 1 }) => (
  <group position={position} scale={s}>
    <M position={[0, 0.9, 0]}>
      <boxGeometry args={[1.0, 1.8, 0.8]} />
      <meshStandardMaterial color="#17171d" roughness={0.6} />
    </M>
    {[1.35, 0.55].map((y, i) => (
      <group key={i} position={[0, y, 0.42]} scale={1 + pulse * (i ? 0.12 : 0.06)}>
        <mesh>
          <circleGeometry args={[i ? 0.34 : 0.22, 18]} />
          <meshBasicMaterial color="#2a2a33" />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[i ? 0.14 : 0.09, 14]} />
          <meshBasicMaterial color="#555a66" />
        </mesh>
      </group>
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/* The street at night (or dawn)                                         */
/* ------------------------------------------------------------------ */
export const Gang: React.FC<{ t: number; pulse?: number; dawn?: number; stage?: boolean; disco?: number }> = ({ t, pulse = 0, dawn = 0, stage = false, disco = 1 }) => {
  const sand = useSand();
  const asphalt = useTex("asphalt", 256, 256, (g) => {
    g.fillStyle = "#3a3a42";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = hash(i, 1) > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.15)";
      g.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 2, 2);
    }
  }, [8, 4]);
  const planks = usePlanks("#8a5a30");
  const night = 1 - dawn;
  const cols = ["#ff3b6b", "#3bff8a", "#3b8aff", "#ffd23b"];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]}>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial map={sand} color={dawn > 0.5 ? "#c9a37a" : "#6b6b8a"} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1.2]}>
        <planeGeometry args={[60, 5]} />
        <meshStandardMaterial map={asphalt} roughness={0.95} />
      </mesh>
      <House position={[-6.3, 0, -3.5]} color="#e9a3bf" roof="#8a3b4f" lit="#ffe9a8" />
      <House position={[0, 0, -3.5]} w={5.2} h={3.2} color="#f1d37a" roof="#a0522d" lit="#ff9ad6" />
      <House position={[6.4, 0, -3.5]} color="#8fb8e8" roof="#3b5a8a" lit="#bfe3ff" />
      {/* Pak Joko's terrace: speakers + disco */}
      <M position={[0, 0.2, -1.3]}>
        <boxGeometry args={[5.2, 0.4, 1.2]} />
        <meshStandardMaterial color="#b9b2a6" roughness={0.9} />
      </M>
      <Speaker position={[-1.9, 0.4, -1.0]} pulse={pulse} s={1.1} />
      <Speaker position={[1.9, 0.4, -1.0]} pulse={pulse} s={1.1} />
      {cols.map((c, i) => {
        const a = t * 2.2 + i * 1.6;
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * 1.6, 3.7 + Math.sin(a * 1.3) * 0.2, -1.4]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshBasicMaterial color={c} />
            </mesh>
            {disco > 0 && <pointLight position={[Math.cos(a) * 2.4, 2.6, 0.4]} intensity={45 * disco} distance={9} color={c} />}
          </group>
        );
      })}
      <M position={[0, 3.9, -1.2]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color="#e5e9f5" metalness={0.9} roughness={0.15} flatShading />
      </M>
      <Sign position={[0, 3.0, -1.9]} size={[2.6, 0.6]} text="KARAOKE KELUARGA" bg="#4a1d6a" fg="#ffe9b0" accent="#ff9ad6" />
      {/* fence */}
      {new Array(21).fill(0).map((_, i) => (
        <M key={i} position={[-3.0 + i * 0.3, 0.55, -0.55]}>
          <boxGeometry args={[0.06, 1.1, 0.06]} />
          <meshStandardMaterial color="#222" />
        </M>
      ))}
      <M position={[0, 1.0, -0.55]}>
        <boxGeometry args={[6.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#222" />
      </M>
      {/* street lamp */}
      <group position={[-3.2, 0, 2.6]}>
        <M position={[0, 2.2, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 4.4, 8]} />
          <meshStandardMaterial color="#444" />
        </M>
        <mesh position={[0, 4.5, 0]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshBasicMaterial color="#fff2b0" />
        </mesh>
        <pointLight position={[0, 4.3, 0.5]} intensity={35 * night} distance={10} color="#ffe9a0" />
      </group>
      {/* stage */}
      {stage && (
        <group>
          <M position={[0.4, 0.25, 0.4]}>
            <boxGeometry args={[4.6, 0.5, 2.0]} />
            <meshStandardMaterial map={planks} roughness={0.9} />
          </M>
          <Sign position={[0.4, 2.8, -0.4]} size={[3.4, 0.7]} text="MALAM SYAHDU" bg="#7a1f3a" fg="#ffe9b0" accent="#ffd23f" />
          {new Array(9).fill(0).map((_, i) => (
            <mesh key={i} position={[-1.7 + i * 0.5, 2.4 - Math.sin((i / 8) * Math.PI) * 0.2, 0.6]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color={i % 2 ? "#ffd27a" : "#ff9ad6"} />
            </mesh>
          ))}
        </group>
      )}
      {new Array(40).fill(0).map((_, i) => (
        <mesh key={i} position={[(hash(i, 1) - 0.5) * 50, 7 + hash(i, 2) * 12, -22]}>
          <circleGeometry args={[0.07 + hash(i, 3) * 0.08, 5]} />
          <meshBasicMaterial color="#fff" transparent opacity={night} />
        </mesh>
      ))}
      <mesh position={[-9, 9, -23]}>
        <circleGeometry args={[1.8, 24]} />
        <meshBasicMaterial color={dawn > 0.5 ? "#ffd9a0" : "#fff5c8"} />
      </mesh>
      <ambientLight intensity={0.65 + 0.4 * dawn} color={dawn > 0.5 ? "#ffd9b0" : "#9aa8ff"} />
      <directionalLight position={[-4, 7, 8]} intensity={1.1 + 0.8 * dawn} color={dawn > 0.5 ? "#ffcf9a" : "#c9d3ff"} />
      <fog attach="fog" args={[dawn > 0.5 ? "#f0b88a" : "#161a3d", 18, 55]} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Guard post                                                            */
/* ------------------------------------------------------------------ */
export const PosRonda: React.FC<{ t: number }> = ({ t }) => {
  const planks = usePlanks("#7a4a28");
  const sand = useSand();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial map={sand} color="#6b6b8a" roughness={1} />
      </mesh>
      <M position={[0, 0.4, -1.2]}>
        <boxGeometry args={[5.2, 0.12, 3.0]} />
        <meshStandardMaterial map={planks} roughness={0.9} />
      </M>
      {[[-2.5, -2.5], [2.5, -2.5], [-2.5, 0.0], [2.5, 0.0]].map(([x, z], i) => (
        <M key={i} position={[x, 1.6, z]}>
          <boxGeometry args={[0.18, 2.4, 0.18]} />
          <meshStandardMaterial color="#5a381e" />
        </M>
      ))}
      <M position={[0, 2.9, -1.25]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[5.8, 0.16, 3.6]} />
        <meshStandardMaterial color="#7d8793" metalness={0.5} roughness={0.5} />
      </M>
      <M position={[0, 1.6, -2.6]}>
        <boxGeometry args={[5.2, 2.4, 0.1]} />
        <meshStandardMaterial map={planks} roughness={0.9} />
      </M>
      <M position={[-1.2, 0.85, -2.0]}>
        <boxGeometry args={[2.6, 0.12, 0.7]} />
        <meshStandardMaterial map={planks} />
      </M>
      <M position={[1.6, 0.9, -1.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 1.2, 12]} />
        <meshStandardMaterial color="#8a5a30" />
      </M>
      <mesh position={[1.6, 1.0, -1.42]}>
        <boxGeometry args={[0.9, 0.06, 0.02]} />
        <meshBasicMaterial color="#1a0f08" />
      </mesh>
      <M position={[0.4, 0.62, -1.9]}>
        <cylinderGeometry args={[0.13, 0.1, 0.22, 10]} />
        <meshStandardMaterial color="#f4f1ea" />
      </M>
      <Sign position={[0, 2.45, -2.5]} size={[2.0, 0.5]} text="POS RONDA" bg="#1d3d1d" fg="#ffe9b0" accent="#7ddc8b" />
      <mesh position={[-1.6, 2.5, -0.6]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshBasicMaterial color="#fff2b0" />
      </mesh>
      <pointLight position={[-1.6, 2.4, -0.4]} intensity={50} distance={9} color="#ffe9a0" />
      {new Array(30).fill(0).map((_, i) => (
        <mesh key={i} position={[(hash(i, 1) - 0.5) * 36, 5 + hash(i, 2) * 12, -16]}>
          <circleGeometry args={[0.07 + hash(i, 3) * 0.08, 5]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      ))}
      <ambientLight intensity={0.7} color="#9aa8ff" />
      <directionalLight position={[2, 6, 6]} intensity={1.0} color="#c9d3ff" />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Pak Joko's living room                                               */
/* ------------------------------------------------------------------ */
export const LivingRoom: React.FC<{ t: number; party?: number }> = ({ t, party = 1 }) => {
  const tiles = useTex("ltiles", 256, 256, (g) => {
    g.fillStyle = "#e7dcc4";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#d3c4a4";
    g.fillRect(0, 0, 128, 128);
    g.fillRect(128, 128, 128, 128);
    g.strokeStyle = "rgba(0,0,0,0.2)";
    g.lineWidth = 3;
    g.strokeRect(0, 0, 256, 256);
  }, [8, 6]);
  const wall = useTex("lwall", 256, 256, (g) => {
    g.fillStyle = "#e9c1d4";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) {
        g.strokeStyle = "rgba(160,60,100,0.25)";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(i * 42 + 21, j * 42);
        g.lineTo(i * 42 + 42, j * 42 + 21);
        g.lineTo(i * 42 + 21, j * 42 + 42);
        g.lineTo(i * 42, j * 42 + 21);
        g.closePath();
        g.stroke();
      }
  }, [3, 1]);
  const lyrics = useTex("lyrics", 512, 320, (g) => {
    g.fillStyle = "#0b1030";
    g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#ffd23f";
    g.font = "bold 48px Anton, Impact, sans-serif";
    g.textAlign = "center";
    g.fillText("KARAOKE", 256, 80);
    g.fillStyle = "#fff";
    g.font = "bold 36px Inter, sans-serif";
    g.fillText("sedalam parit,", 256, 170);
    g.fillStyle = "#ff9ad6";
    g.fillText("selebar gorong-gorong", 256, 230);
  });
  const cols = ["#ff3b6b", "#3bff8a", "#3b8aff", "#ffd23b"];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial map={tiles} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3, -4]}>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <M position={[-2.6, 1.9, -3.9]}>
        <boxGeometry args={[2.6, 1.6, 0.12]} />
        <meshStandardMaterial color="#111" />
      </M>
      <mesh position={[-2.6, 1.9, -3.82]}>
        <planeGeometry args={[2.4, 1.4]} />
        <meshBasicMaterial map={lyrics} toneMapped={false} />
      </mesh>
      <M position={[2.4, 0.55, -3.2]}>
        <boxGeometry args={[3.0, 1.1, 1.1]} />
        <meshStandardMaterial color="#b4543a" roughness={0.9} />
      </M>
      <M position={[2.4, 1.35, -3.5]}>
        <boxGeometry args={[3.0, 0.9, 0.3]} />
        <meshStandardMaterial color="#b4543a" roughness={0.9} />
      </M>
      <Speaker position={[-5.0, 0, -2.6]} pulse={party * Math.abs(Math.sin(t * 9))} s={1.15} />
      <Speaker position={[5.0, 0, -2.6]} pulse={party * Math.abs(Math.sin(t * 9))} s={1.15} />
      <M position={[0, 5.0, -1.5]}>
        <sphereGeometry args={[0.45, 10, 8]} />
        <meshStandardMaterial color="#e5e9f5" metalness={0.9} roughness={0.15} flatShading />
      </M>
      {cols.map((c, i) => {
        const a = t * 2.4 + i * 1.6;
        return <pointLight key={i} position={[Math.cos(a) * 3.4, 3.4, -1.2 + Math.sin(a) * 1.4]} intensity={55 * party} distance={9} color={c} />;
      })}
      {cols.map((c, i) => {
        const a = t * 2.4 + i * 1.6;
        return (
          <mesh key={`b${i}`} position={[Math.cos(a) * 3.4, 3.6 + 0.2 * Math.sin(a * 2), -1.2 + Math.sin(a) * 1.4]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshBasicMaterial color={c} />
          </mesh>
        );
      })}
      <ambientLight intensity={0.8} color="#ffe6f0" />
      <directionalLight position={[2, 6, 6]} intensity={1.1} color="#fff0f0" />
    </group>
  );
};
export { sm, cl };

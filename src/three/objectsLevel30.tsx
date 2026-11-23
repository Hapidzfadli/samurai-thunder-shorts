import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Vec3 } from "./objects";

const M: React.FC<React.ComponentProps<"mesh">> = (props) => <mesh castShadow receiveShadow {...props} />;
const sm = (x: number) => x * x * (3 - 2 * x);
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                       */
/* ------------------------------------------------------------------ */
const useCanvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) =>
  useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d")!);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

const drop = (g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) => {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - s);
  g.bezierCurveTo(x + s * 0.9, y - s * 0.1, x + s * 0.8, y + s * 0.9, x, y + s * 0.9);
  g.bezierCurveTo(x - s * 0.8, y + s * 0.9, x - s * 0.9, y - s * 0.1, x, y - s);
  g.fill();
};

export const Sign: React.FC<{ position: Vec3; rotation?: Vec3; size: [number, number]; text: string; sub?: string; bg: string; fg: string; accent?: string }> = ({ position, rotation = [0, 0, 0], size, text, sub, bg, fg, accent = "#ffd23f" }) => {
  const tex = useCanvasTex(`${text}${sub}${bg}${fg}`, 1024, Math.round((1024 * size[1]) / size[0]), (g) => {
    const w = 1024;
    const h = Math.round((1024 * size[1]) / size[0]);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = accent;
    g.lineWidth = 14;
    g.strokeRect(16, 16, w - 32, h - 32);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `bold ${sub ? h * 0.46 : h * 0.6}px Anton, Impact, 'DejaVu Sans', sans-serif`;
    g.fillText(text, w / 2, sub ? h * 0.38 : h * 0.54);
    if (sub) {
      g.fillStyle = accent;
      g.font = `bold ${h * 0.2}px Anton, Impact, 'DejaVu Sans', sans-serif`;
      g.fillText(sub, w / 2, h * 0.78);
    }
  });
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* Guard: a tiny cartoon worker (taste receptor / brain operator /      */
/* nerve messenger). Everything is a primitive, so it renders fast.      */
/* ------------------------------------------------------------------ */
export const Guard: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  alarm?: number;
  cheer?: number;
  slump?: number;
  fire?: number;
  cry?: number;
  press?: number;
  run?: number;
  body?: string;
  cap?: string;
  glasses?: boolean;
  headset?: boolean;
  seed?: string;
  look?: number;
}> = ({ position, rotationY = 0, scale = 1, t, alarm = 0, cheer = 0, slump = 0, fire = 0, cry = 0, press = 0, run = 0, body = "#2f6fe0", cap = "#1c3f8f", glasses = false, headset = false, seed = "g", look = 0 }) => {
  const sn = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const up = Math.max(alarm, cheer);
  const hop = Math.abs(Math.sin(t * (alarm > cheer ? 15 : 9) + sn)) * 0.14 * up + Math.sin(t * 3 + sn) * 0.012;
  const blinkPh = (t + sn * 0.37) % 2.6;
  const eyeY = Math.max(0.12, (blinkPh < 0.12 ? 0.1 : 1) * (1 - slump * 0.75));
  const swing = Math.sin(t * 14) * run;
  const flap = Math.sin(t * 16 + sn) * 0.35 * up;
  const shake = Math.sin(t * 22) * 0.04 * alarm;
  const worried = alarm > 0.3 || cry > 0.3;
  const arm = (side: number) => (
    <group position={[side * 0.25, 0.78, 0]} rotation={[-press * (side > 0 ? 1.25 : 0) + (run ? -side * swing * 0.9 : 0) + (side > 0 && press > 0 ? 0 : 0), 0, side * (0.3 + up * 2.3) + (up ? side * flap : 0)]}>
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.34, 6]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <M position={[0, -0.34, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshToonMaterial color="#ffffff" />
      </M>
    </group>
  );
  return (
    <group position={[position[0] + shake, position[1] + hop, position[2]]} rotation={[slump * 0.32 + run * 0.25, rotationY, 0]} scale={scale}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 0.36, 0]} rotation={[s * swing * 0.9, 0, 0]}>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.38, 6]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          <M position={[0, -0.37, 0.05]} scale={[1, 0.5, 1.7]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshBasicMaterial color="#111" />
          </M>
        </group>
      ))}
      <mesh position={[0, 0.62, 0]} scale={[1.13, 1.07, 0.9]}>
        <capsuleGeometry args={[0.2, 0.22, 6, 10]} />
        <meshBasicMaterial color="#111" side={THREE.BackSide} />
      </mesh>
      <M position={[0, 0.62, 0]} scale={[1, 1, 0.8]}>
        <capsuleGeometry args={[0.2, 0.22, 6, 10]} />
        <meshToonMaterial color={body} />
      </M>
      <mesh position={[0.09, 0.7, 0.18]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshStandardMaterial color="#ffd23f" emissive="#ffb300" emissiveIntensity={0.4} />
      </mesh>
      {arm(-1)}
      {arm(1)}
      <group position={[0, 1.12, 0]} rotation={[0, look, Math.sin(t * 2 + sn) * 0.02 + (cry > 0 ? Math.sin(t * 20) * 0.05 : 0)]}>
        <mesh scale={[1.07, 1.02, 1.03]}>
          <sphereGeometry args={[0.27, 14, 12]} />
          <meshBasicMaterial color="#111" side={THREE.BackSide} />
        </mesh>
        <M scale={[1, 0.95, 0.96]}>
          <sphereGeometry args={[0.27, 14, 12]} />
          <meshToonMaterial color="#ffffff" />
        </M>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.1, 0.05, 0.22]} scale={[1, eyeY, 1]}>
              <sphereGeometry args={[alarm > 0.4 ? 0.09 : 0.075, 10, 10]} />
              <meshStandardMaterial color="#fff" roughness={0.4} />
            </mesh>
            <mesh position={[s * 0.1, 0.05, 0.285]} scale={[1, eyeY, 1]}>
              <sphereGeometry args={[alarm > 0.4 ? 0.028 : 0.036, 8, 8]} />
              <meshBasicMaterial color="#17110d" />
            </mesh>
            <mesh position={[s * 0.1, 0.16, 0.24]} rotation={[0, 0, -s * (worried ? 0.4 : fire > 0 ? 0.3 : -0.08)]}>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <meshBasicMaterial color="#3a2a20" />
            </mesh>
            {glasses && (
              <mesh position={[s * 0.1, 0.05, 0.27]}>
                <torusGeometry args={[0.1, 0.012, 6, 16]} />
                <meshBasicMaterial color="#111" />
              </mesh>
            )}
          </group>
        ))}
        {alarm > 0.3 || cheer > 0.5 ? (
          <mesh position={[0, -0.1, 0.255]} scale={[1, cheer > 0.5 ? 0.9 : 1.4, 0.4]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshBasicMaterial color="#3a0f12" />
          </mesh>
        ) : slump > 0.3 ? (
          <mesh position={[0, -0.13, 0.26]}>
            <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#5a1f22" />
          </mesh>
        ) : (
          <mesh position={[0, -0.09, 0.26]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#5a1f22" />
          </mesh>
        )}
        {/* cap */}
        <M position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.26, 0.28, 0.14, 12]} />
          <meshStandardMaterial color={cap} roughness={0.8} flatShading />
        </M>
        <M position={[0, 0.17, 0.2]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[0.34, 0.03, 0.22]} />
          <meshStandardMaterial color={cap} roughness={0.8} />
        </M>
        {headset && (
          <>
            <mesh position={[0, 0.02, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.29, 0.02, 6, 20, Math.PI]} />
              <meshBasicMaterial color="#222" />
            </mesh>
            <mesh position={[0.3, -0.02, 0.0]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshBasicMaterial color="#222" />
            </mesh>
          </>
        )}
        {fire > 0.02 &&
          [0, 1, 2].map((i) => {
            const f = 0.8 + 0.4 * Math.sin(t * 17 + i * 2 + sn);
            return (
              <mesh key={i} position={[(i - 1) * 0.11, 0.38 + 0.08 * f * fire, 0]} scale={[fire, fire * f, fire]}>
                <coneGeometry args={[0.07, 0.24, 6]} />
                <meshStandardMaterial color={i === 1 ? "#ffcf3d" : "#ff6a1a"} emissive={i === 1 ? "#ffa000" : "#ff3b00"} emissiveIntensity={1.2} flatShading />
              </mesh>
            );
          })}
        {cry > 0.02 &&
          [-1, 1].map((s) => {
            const k = (t * 1.8 + (s > 0 ? 0.4 : 0)) % 1;
            return (
              <mesh key={s} position={[s * 0.13 + s * k * 0.03, 0.0 - k * 0.22, 0.26]} scale={cry * (1 - k * 0.4)}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial color="#7ad0ff" emissive="#2a9dff" emissiveIntensity={0.4} />
              </mesh>
            );
          })}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Capsaicin molecule: a smug little orange imp                          */
/* ------------------------------------------------------------------ */
export const Capsa: React.FC<{ position: Vec3; scale?: number; t: number; seed?: string; mad?: number }> = ({ position, scale = 1, t, seed = "c", mad = 1 }) => {
  const sn = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <group position={position} scale={scale} rotation={[Math.sin(t * 5 + sn) * 0.12, Math.sin(t * 3 + sn) * 0.3, Math.sin(t * 4 + sn) * 0.1]}>
      <mesh scale={1.1}>
        <dodecahedronGeometry args={[0.24, 0]} />
        <meshBasicMaterial color="#111" side={THREE.BackSide} />
      </mesh>
      <M>
        <dodecahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color="#ff5a1f" emissive="#ff3b00" emissiveIntensity={0.55} roughness={0.6} flatShading />
      </M>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.12, 0.25, 0.02]} rotation={[0, 0, -s * 0.45]}>
            <coneGeometry args={[0.05, 0.14, 5]} />
            <meshStandardMaterial color="#8f1300" flatShading />
          </mesh>
          <mesh position={[s * 0.085, 0.04, 0.2]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[s * 0.085, 0.04, 0.24]}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshBasicMaterial color="#000" />
          </mesh>
          <mesh position={[s * 0.085, 0.11, 0.22]} rotation={[0, 0, s * 0.5 * mad]}>
            <boxGeometry args={[0.08, 0.018, 0.01]} />
            <meshBasicMaterial color="#400" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.09, 0.22]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshBasicMaterial color="#400" />
      </mesh>
    </group>
  );
};

export const ChiliPepper: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; bite?: number; tag?: boolean }> = ({ position, rotation = [0, 0, 0], scale = 1, bite = 0, tag = true }) => {
  const tex = useCanvasTex("lv30", 256, 128, (g) => {
    g.fillStyle = "#fff6d8";
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#d62828";
    g.font = "bold 76px Anton, Impact, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("LV 30", 128, 70);
    g.strokeStyle = "#d62828";
    g.lineWidth = 8;
    g.strokeRect(6, 6, 244, 116);
  });
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group scale={[1, 1 - bite * 0.3, 1]} position={[0, bite * 0.1, 0]}>
        <M position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.085, 0.4, 10]} />
          <meshStandardMaterial color="#d81b1b" roughness={0.35} flatShading />
        </M>
        <M position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.085, 0.3, 10]} />
          <meshStandardMaterial color="#d81b1b" roughness={0.35} flatShading />
        </M>
      </group>
      <M position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.03, 0.045, 0.14, 6]} />
        <meshStandardMaterial color="#2f8f3a" flatShading />
      </M>
      <M position={[0.05, 0.43, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.022, 0.03, 0.12, 6]} />
        <meshStandardMaterial color="#2f8f3a" flatShading />
      </M>
      {tag && (
        <mesh position={[0.14, 0.25, 0.08]} rotation={[0, -0.4, -0.2]}>
          <planeGeometry args={[0.28, 0.14]} />
          <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Kantin: the warung table where Budi eats                             */
/* ------------------------------------------------------------------ */
export const Kantin: React.FC<{ t: number; milk?: number; water?: number; level?: 30 | 31 }> = ({ t, milk = 0, water = 1 }) => {
  const wood = useCanvasTex("kantinwood", 256, 256, (g) => {
    g.fillStyle = "#3b2312";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#b98650" : "#cf9d62";
      g.fillRect(0, i * 32 + 2, 256, 28);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = "rgba(90,50,20,0.35)";
        g.lineWidth = 1.5;
        const y = i * 32 + 4 + Math.abs(Math.sin(i * 7.3 + k * 1.9)) * 24;
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(80, y + 3, 170, y - 3, 256, y + 1);
        g.stroke();
      }
    }
  });
  const wall = useCanvasTex("kantinwall", 512, 256, (g) => {
    g.fillStyle = "#e9c791";
    g.fillRect(0, 0, 512, 256);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const ox = r % 2 ? 32 : 0;
        g.fillStyle = (r * 5 + c * 3) % 4 === 0 ? "#dcb67c" : (r + c) % 3 === 0 ? "#f1d3a0" : "#e6c28a";
        g.fillRect(c * 64 + ox + 2, r * 32 + 2, 60, 28);
      }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(110,70,30,${0.04 + (i % 5) * 0.015})`;
      g.beginPath();
      g.arc((i * 97) % 512, (i * 53) % 256, 6 + (i % 7) * 4, 0, 7);
      g.fill();
    }
  });
  wall.wrapS = wall.wrapT = THREE.RepeatWrapping;
  wall.repeat.set(3, 1);
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.repeat.set(6, 4);
  const bulbs = [-4, -2.4, -0.8, 0.8, 2.4, 4];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial map={wood} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.6, -2.6]} receiveShadow>
        <planeGeometry args={[18, 6]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.5, -2.58]}>
        <boxGeometry args={[18, 1.0, 0.04]} />
        <meshStandardMaterial color="#a64b2a" roughness={0.9} />
      </mesh>
      <Sign position={[-1.7, 2.45, -2.52]} size={[2.6, 1.1]} text="WARUNG PEDAS" sub="BUKA SAMPAI HABIS" bg="#7a1f12" fg="#ffe9b0" />
      <Sign position={[1.9, 2.3, -2.52]} size={[1.5, 1.7]} text="LEVEL 30" sub="SANGAT PEDAS" bg="#1b1b1b" fg="#ff5a1f" accent="#ff5a1f" />
      <mesh position={[4.2, 2.1, -2.5]}>
        <planeGeometry args={[1.6, 1.8]} />
        <meshBasicMaterial color="#bfe8ff" />
      </mesh>
      {bulbs.map((x, i) => (
        <group key={x} position={[x, 3.6 - Math.sin(((i + 0.5) / bulbs.length) * Math.PI) * 0.25, -1.9]}>
          <mesh>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshBasicMaterial color="#ffe08a" />
          </mesh>
          <pointLight intensity={0.5} distance={4} color="#ffd890" />
        </group>
      ))}
      {/* table with a cloth that hides Budi's legs */}
      <M position={[0, 0.41, 1.75]}>
        <boxGeometry args={[3.6, 0.82, 0.9]} />
        <meshStandardMaterial color="#d94f3d" roughness={0.9} />
      </M>
      <M position={[0, 0.84, 1.75]}>
        <boxGeometry args={[3.7, 0.05, 1.0]} />
        <meshStandardMaterial color="#fff4e0" roughness={0.9} />
      </M>
      {/* plate, rice, chicken */}
      <M position={[-0.7, 0.9, 1.75]}>
        <cylinderGeometry args={[0.32, 0.28, 0.04, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </M>
      <M position={[-0.76, 0.96, 1.75]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshStandardMaterial color="#fffbe9" roughness={0.9} flatShading />
      </M>
      <M position={[-0.55, 0.97, 1.78]} rotation={[0.2, 0.5, 1.2]}>
        <capsuleGeometry args={[0.07, 0.2, 4, 8]} />
        <meshStandardMaterial color="#a65a1f" roughness={0.8} flatShading />
      </M>
      {/* sambal bowl */}
      <M position={[0.7, 0.92, 1.8]}>
        <cylinderGeometry args={[0.2, 0.14, 0.12, 14]} />
        <meshStandardMaterial color="#f1f1f1" roughness={0.5} />
      </M>
      <M position={[0.7, 0.98, 1.8]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.17, 12, 8]} />
        <meshStandardMaterial color="#b3120c" roughness={0.5} flatShading />
      </M>
      {/* water / milk glass */}
      <M position={[1.25, 1.0, 1.7]}>
        <cylinderGeometry args={[0.1, 0.085, 0.3, 12]} />
        <meshStandardMaterial color={milk > 0.5 ? "#fffaf0" : "#9fd9ff"} transparent opacity={milk > 0.5 ? 0.95 : 0.55 * water + 0.1} roughness={0.2} />
      </M>
    </group>
  );
};

export const MenuBoard: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <M position={[0, 0, 0]}>
      <boxGeometry args={[0.9, 0.6, 0.04]} />
      <meshStandardMaterial color="#222" roughness={0.9} />
    </M>
    <Sign position={[0, 0, 0.025]} size={[0.84, 0.54]} text="LEVEL 31" sub="BERANI?" bg="#8a0f0f" fg="#ffe9b0" accent="#ff5a1f" />
  </group>
);

/* ------------------------------------------------------------------ */
/* Face effects for Budi: tears, sweat, steam, runny nose, bitten chili  */
/* ------------------------------------------------------------------ */
export const FaceFX: React.FC<{ head: Vec3; t: number; tears?: number; sweat?: number; steam?: number; snot?: number }> = ({ head, t, tears = 0, sweat = 0, steam = 0, snot = 0 }) => {
  const [hx, hy, hz] = head;
  return (
    <group position={[hx, hy, hz]} scale={1.55}>
      <group position={[-hx, -hy, -hz]}>
      {tears > 0.02 &&
        [-1, 1].flatMap((s) =>
          [0, 1, 2].map((i) => {
            const k = (t * 1.6 + i / 3 + (s > 0 ? 0.17 : 0)) % 1;
            return (
              <mesh key={`${s}${i}`} position={[hx + s * (0.09 + k * 0.05), hy + 0.035 - k * 0.5, hz + 0.19 + k * 0.1]} scale={tears * (1 - 0.3 * k) * (i === 0 ? 1.2 : 1)}>
                <sphereGeometry args={[0.032, 8, 8]} />
                <meshStandardMaterial color="#7ad0ff" emissive="#2a9dff" emissiveIntensity={0.5} transparent opacity={1 - k * 0.5} />
              </mesh>
            );
          })
        )}
      {sweat > 0.02 &&
        [0, 1, 2, 3, 4].map((i) => {
          const k = (t * 1.3 + i * 0.21) % 1;
          const sx = (random(`sw${i}`) - 0.5) * 0.28;
          return (
            <mesh key={i} position={[hx + sx, hy + 0.2 - k * 0.45, hz + 0.16]} scale={[sweat * 0.8, sweat * 1.1, sweat * 0.8]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#d8f3ff" emissive="#67c8ff" emissiveIntensity={0.35} transparent opacity={0.9 - k * 0.5} />
            </mesh>
          );
        })}
      {steam > 0.02 &&
        [-1, 1].flatMap((s) =>
          [0, 1, 2, 3].map((i) => {
            const k = (t * 0.9 + i * 0.25 + (s > 0 ? 0.1 : 0)) % 1;
            return (
              <mesh key={`${s}${i}`} position={[hx + s * (0.22 + k * 0.1), hy + 0.05 + k * 0.7, hz - 0.02]} scale={steam * (0.6 + k * 1.4)}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.6 * (1 - k)} />
              </mesh>
            );
          })
        )}
      {snot > 0.02 && (
        <group position={[hx + 0.01, hy - 0.06, hz + 0.21]}>
          <mesh position={[0, -0.04 - 0.1 * snot, 0]} scale={[1, snot, 1]}>
            <capsuleGeometry args={[0.018, 0.2, 4, 8]} />
            <meshStandardMaterial color="#b6e69a" emissive="#6fbf55" emissiveIntensity={0.25} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.14 - 0.2 * snot, 0]} scale={0.8 + 0.3 * Math.sin(t * 8)}>
            <sphereGeometry args={[0.035 * snot, 8, 8]} />
            <meshStandardMaterial color="#b6e69a" emissive="#6fbf55" emissiveIntensity={0.25} roughness={0.2} />
          </mesh>
        </group>
      )}
      </group>
    </group>
  );
};


/* ------------------------------------------------------------------ */
/* Toon: big white outlined head, capsule torso, hair-thin limbs        */
/* (the minimalist look the viral blueprint asks for)                    */
/* ------------------------------------------------------------------ */
export type ToonExpr = "neutral" | "surprised" | "worried" | "happy" | "smug";
const HULL = "#111";
export const Toon: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  shirt?: string;
  pants?: string;
  hairColor?: string;
  hat?: "none" | "peci" | "cap";
  hatColor?: string;
  apron?: string;
  face?: string; // face colour (white -> red / purple for anger)
  expr?: ToonExpr;
  walking?: boolean;
  walkF?: number;
  armsUp?: number;
  pointArm?: number;
  shake?: number;
  jump?: number;
  seed?: string;
  look?: number;
}> = ({ position, rotationY = 0, scale = 1, t, shirt = "#3a86c8", pants = "#222", hairColor = "#1c1410", hat = "none", hatColor = "#111", apron, face = "#ffffff", expr = "neutral", walking = false, walkF = 2.2, armsUp = 0, pointArm = 0, shake = 0, jump = 0, seed = "toon", look = 0 }) => {
  const sn = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const ph = Math.PI * walkF * t;
  const c = walking ? Math.cos(ph) : 0;
  const bob = (walking ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(t * 2.2 + sn) * 0.01) + jump * 0.2;
  const jx = shake * Math.sin(t * 60) * 0.05;
  const blink = (t + sn * 0.3) % 3 < 0.12 ? 0.12 : 1;
  const lid = expr === "smug" ? 0.5 : expr === "happy" ? 0.8 : 1;
  const eyeR = expr === "surprised" ? 0.105 : 0.088;
  const browTilt = expr === "worried" ? 0.45 : expr === "smug" ? -0.25 : expr === "surprised" ? 0 : expr === "happy" ? -0.1 : 0.12;
  const browY = expr === "surprised" ? 0.2 : 0.155;
  const arm = (side: number) => {
    const swing = walking ? -side * 0.55 * c : 0;
    const up = -armsUp * 2.6;
    const point = side > 0 ? -pointArm * 1.45 : 0;
    return (
      <group key={side} position={[side * 0.2, 1.0, 0]} rotation={[swing + up + point, 0, side * (0.14 + armsUp * 0.35)]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.5, 6]} />
          <meshBasicMaterial color={HULL} />
        </mesh>
        <M position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.058, 8, 8]} />
          <meshToonMaterial color="#ffffff" />
        </M>
      </group>
    );
  };
  return (
    <group position={[position[0] + jx, position[1] + bob, position[2]]} rotation={[0, rotationY, shake * Math.sin(t * 50) * 0.05]} scale={scale}>
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.09, 0.62, 0]} rotation={[sd * 0.55 * c, 0, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.62, 6]} />
            <meshBasicMaterial color={HULL} />
          </mesh>
          <M position={[0, -0.62, 0.05]} scale={[1, 0.5, 1.8]}>
            <sphereGeometry args={[0.075, 8, 6]} />
            <meshBasicMaterial color={HULL} />
          </M>
        </group>
      ))}
      <mesh position={[0, 0.9, 0]} scale={[1.12, 1.06, 0.92]}>
        <capsuleGeometry args={[0.19, 0.3, 6, 12]} />
        <meshBasicMaterial color={HULL} side={THREE.BackSide} />
      </mesh>
      <M position={[0, 0.9, 0]} scale={[1, 1, 0.82]}>
        <capsuleGeometry args={[0.19, 0.3, 6, 12]} />
        <meshToonMaterial color={shirt} />
      </M>
      <M position={[0, 0.7, 0]} scale={[1.02, 0.6, 0.86]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshToonMaterial color={pants} />
      </M>
      {apron && (
        <M position={[0, 0.84, 0.155]}>
          <boxGeometry args={[0.28, 0.4, 0.02]} />
          <meshToonMaterial color={apron} />
        </M>
      )}
      {arm(-1)}
      {arm(1)}
      <group position={[0, 1.5, 0]} rotation={[0, look + Math.sin(t * 0.8 + sn) * 0.05, 0]}>
        <mesh scale={[1.05, 1.02, 1.03]}>
          <sphereGeometry args={[0.32, 20, 16]} />
          <meshBasicMaterial color={HULL} side={THREE.BackSide} />
        </mesh>
        <M>
          <sphereGeometry args={[0.32, 20, 16]} />
          <meshToonMaterial color={face} />
        </M>
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <mesh position={[sd * 0.12, 0.03, 0.27]} scale={[1, Math.min(lid, blink), 0.5]}>
              <sphereGeometry args={[eyeR * 1.12, 12, 10]} />
              <meshBasicMaterial color={HULL} />
            </mesh>
            <mesh position={[sd * 0.12, 0.03, 0.285]} scale={[1, Math.min(lid, blink), 0.5]}>
              <sphereGeometry args={[eyeR, 12, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[sd * 0.12 + Math.sin(look) * 0.015, 0.03, 0.335]} scale={[1, Math.min(lid, blink), 1]}>
              <sphereGeometry args={[expr === "surprised" ? 0.026 : 0.036, 8, 8]} />
              <meshBasicMaterial color={HULL} />
            </mesh>
            <mesh position={[sd * 0.12, browY, 0.28]} rotation={[0, 0, -sd * browTilt]}>
              <boxGeometry args={[0.14, 0.032, 0.02]} />
              <meshBasicMaterial color={HULL} />
            </mesh>
          </group>
        ))}
        {expr === "surprised" && (
          <mesh position={[0, -0.13, 0.3]} scale={[1, 1.4, 0.4]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshBasicMaterial color="#3a0a10" />
          </mesh>
        )}
        {(expr === "happy" || expr === "smug") && (
          <mesh position={[expr === "smug" ? 0.03 : 0, -0.08, 0.3]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.075, 0.014, 6, 16, Math.PI]} />
            <meshBasicMaterial color={HULL} />
          </mesh>
        )}
        {expr === "worried" && (
          <mesh position={[0, -0.16, 0.3]}>
            <torusGeometry args={[0.06, 0.014, 6, 16, Math.PI]} />
            <meshBasicMaterial color={HULL} />
          </mesh>
        )}
        {expr === "neutral" && (
          <mesh position={[0, -0.12, 0.3]}>
            <boxGeometry args={[0.11, 0.022, 0.01]} />
            <meshBasicMaterial color={HULL} />
          </mesh>
        )}
        {hat === "none" && [0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[(i - 2) * 0.07, 0.33 + (i % 2) * 0.02, 0]} rotation={[0, 0, -(i - 2) * 0.28]}>
            <coneGeometry args={[0.03, 0.14, 4]} />
            <meshBasicMaterial color={hairColor} />
          </mesh>
        ))}
        {hat === "peci" && (
          <M position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.17, 14]} />
            <meshToonMaterial color={hatColor} />
          </M>
        )}
        {hat === "cap" && (
          <>
            <M position={[0, 0.28, 0]}>
              <sphereGeometry args={[0.34, 14, 8, 0, Math.PI * 2, 0, 1.0]} />
              <meshToonMaterial color={hatColor} />
            </M>
            <M position={[0, 0.2, 0.3]} rotation={[0.15, 0, 0]}>
              <boxGeometry args={[0.3, 0.03, 0.2]} />
              <meshToonMaterial color={hatColor} />
            </M>
          </>
        )}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Inside the mouth                                                      */
/* ------------------------------------------------------------------ */
export const tongueY = (x: number, z: number) => {
  const q = 1 - (x / 3.8) ** 2 - (z / 6.5) ** 2;
  return -0.2 + 0.7 * Math.sqrt(Math.max(0, q));
};

export const MouthSet: React.FC<{ t: number; hot?: number; front?: boolean }> = ({ t, hot = 0, front = false }) => {
  const wall = new THREE.Color("#e8828f").lerp(new THREE.Color("#d8283a"), hot).getStyle();
  const tongue = new THREE.Color("#e0586d").lerp(new THREE.Color("#c4122a"), hot).getStyle();
  const bumps = useMemo(
    () =>
      new Array(140).fill(0).map((_, i) => {
        const x = (random(`bx${i}`) - 0.5) * 7;
        const z = (random(`bz${i}`) - 0.5) * 12;
        const ok = (x / 3.6) ** 2 + (z / 6.2) ** 2 < 1;
        return ok ? { x, z, r: 0.07 + random(`br${i}`) * 0.08 } : null;
      }).filter(Boolean) as { x: number; z: number; r: number }[],
    []
  );
  const teeth = [-3.2, -2.3, -1.4, -0.45, 0.45, 1.4, 2.3, 3.2];
  return (
    <group>
      <mesh position={[0, 2, 0]} scale={[1, 0.75, 1.25]}>
        <icosahedronGeometry args={[9, 2]} />
        <meshStandardMaterial color={wall} side={THREE.BackSide} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.4, -8.5]}>
        <sphereGeometry args={[2.6, 12, 10]} />
        <meshBasicMaterial color="#3a0b14" />
      </mesh>
      <mesh position={[0, 3.3, -6.4]} scale={[1, 1.4, 1]}>
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshStandardMaterial color="#f08a9a" flatShading />
      </mesh>
      <M position={[0, -0.2, 0]} scale={[3.8, 0.7, 6.5]}>
        <sphereGeometry args={[1, 28, 16]} />
        <meshStandardMaterial color={tongue} roughness={0.7} flatShading />
      </M>
      {bumps.map((b, i) => (
        <mesh key={i} position={[b.x, tongueY(b.x, b.z) + 0.01, b.z]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[b.r, 6, 5]} />
          <meshStandardMaterial color={hot > 0.5 ? "#e0384a" : "#f59aa8"} roughness={0.6} flatShading />
        </mesh>
      ))}
      {front && teeth.map((x, i) => (
        <group key={i}>
          <M position={[x, 3.6, 6.4 - Math.abs(x) * 0.35]}>
            <boxGeometry args={[0.85, 1.9, 0.6]} />
            <meshStandardMaterial color="#fff9ee" roughness={0.35} />
          </M>
          <M position={[x, 0.4, 6.4 - Math.abs(x) * 0.35]}>
            <boxGeometry args={[0.8, 1.2, 0.6]} />
            <meshStandardMaterial color="#fff9ee" roughness={0.35} />
          </M>
        </group>
      ))}
      {front && (
      <mesh position={[0, 2, 7.2]} rotation={[0, 0, 0]} scale={[1.2, 0.8, 1]}>
        <torusGeometry args={[4.4, 1, 10, 28]} />
        <meshStandardMaterial color="#d95a6e" roughness={0.6} flatShading />
      </mesh>)}
      <ambientLight intensity={0.8} color="#ffb7c2" />
      <pointLight position={[0, 4.2, 4]} intensity={90} distance={16} color="#ffe2dc" />
      <pointLight position={[0, 2, 0]} intensity={30 + hot * 60} distance={14} color={hot > 0.3 ? "#ff6a3a" : "#ffb3c1"} />
    </group>
  );
};

export const GUARD_SPOTS: [number, number][] = [
  [-2.2, 3.4], [-0.9, 2.5], [0.7, 3.5], [2.0, 2.3], [-1.6, 0.8], [0.3, 1.0], [1.7, -0.2], [-0.5, -1.0],
];

/* ------------------------------------------------------------------ */
/* Nerve tunnel                                                          */
/* ------------------------------------------------------------------ */
export const NerveTunnel: React.FC<{ t: number; speed?: number }> = ({ t, speed = 26 }) => {
  const rings = new Array(26).fill(0).map((_, i) => i);
  const LEN = 78;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -30]}>
        <cylinderGeometry args={[2.6, 2.6, 160, 14, 1, true]} />
        <meshStandardMaterial color="#f5b7c8" side={THREE.BackSide} roughness={0.9} flatShading emissive="#7a2f48" emissiveIntensity={0.25} />
      </mesh>
      {rings.map((i) => {
        const z = ((i * 3 + t * speed) % LEN) - 54;
        return (
          <mesh key={i} position={[0, 0, z]}>
            <torusGeometry args={[2.5, 0.07, 6, 18]} />
            <meshStandardMaterial color="#ffe9a8" emissive="#ffd23f" emissiveIntensity={0.9} />
          </mesh>
        );
      })}
      {new Array(10).fill(0).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const z = ((i * 7 + t * speed * 1.3) % LEN) - 54;
        return (
          <mesh key={`s${i}`} position={[Math.cos(a) * 2.4, Math.sin(a) * 2.4, z]}>
            <boxGeometry args={[0.05, 0.05, 2.4]} />
            <meshBasicMaterial color="#fff6c8" />
          </mesh>
        );
      })}
      <pointLight position={[0, 0, 2]} intensity={60} distance={20} color="#fff1c8" />
      <ambientLight intensity={1.0} color="#ffd8e4" />
    </group>
  );
};

export const Envelope: React.FC<{ position: Vec3; t: number; scale?: number; open?: number }> = ({ position, t, scale = 1, open = 0 }) => (
  <group position={position} scale={scale} rotation={[0, 0, Math.sin(t * 9) * 0.08]}>
    <M>
      <boxGeometry args={[0.55, 0.36, 0.06]} />
      <meshStandardMaterial color="#e63946" emissive="#a30000" emissiveIntensity={0.4} />
    </M>
    <mesh position={[0, 0, 0.04]}>
      <boxGeometry args={[0.07, 0.2, 0.01]} />
      <meshBasicMaterial color="#fff" />
    </mesh>
    <mesh position={[0, -0.14, 0.04]}>
      <boxGeometry args={[0.07, 0.07, 0.01]} />
      <meshBasicMaterial color="#fff" />
    </mesh>
    <M position={[0, 0.2, 0]} rotation={[open * 2.0, 0, 0]}>
      <boxGeometry args={[0.5, 0.02, 0.2]} />
      <meshStandardMaterial color="#c1121f" />
    </M>
  </group>
);

export const Brain: React.FC<{ position: Vec3; scale?: number; t: number; nod?: number; happy?: number; glow?: number }> = ({ position, scale = 1, t, nod = 0, happy = 0, glow = 0 }) => {
  const lumps = useMemo(
    () =>
      new Array(26).fill(0).map((_, i) => {
        const th = Math.acos(1 - 2 * ((i + 0.5) / 26));
        const ph = i * 2.399963;
        return { p: [Math.sin(th) * Math.cos(ph) * 1.5, Math.cos(th) * 1.15 + 0.1, Math.sin(th) * Math.sin(ph) * 1.2] as Vec3, r: 0.36 + random(`l${i}`) * 0.12 };
      }),
    []
  );
  const blink = (t % 3) < 0.12 ? 0.1 : 1;
  return (
    <group position={position} scale={scale} rotation={[nod * Math.sin(t * 8) * 0.12, 0, 0]}>
      <M scale={[1.5, 1.15, 1.25]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#ff9db8" emissive="#ff4f86" emissiveIntensity={0.25 + glow * 0.6} roughness={0.6} flatShading />
      </M>
      {lumps.map((l, i) => (
        <M key={i} position={l.p}>
          <sphereGeometry args={[l.r, 7, 6]} />
          <meshStandardMaterial color={i % 2 ? "#ffb0c6" : "#ff8aa9"} roughness={0.6} flatShading />
        </M>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.45, 0.1, 1.45]} scale={[1, blink, 1]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshBasicMaterial color="#fff" />
          </mesh>
          <mesh position={[s * 0.45, 0.1, 1.64]} scale={[1, blink, 1]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#111" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.28, 1.5]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.22, 0.04, 6, 14, Math.PI]} />
        <meshBasicMaterial color="#6a1530" />
      </mesh>
      {happy > 0.5 && (
        <mesh position={[0, -0.28, 1.5]} scale={[1, 0.8, 0.5]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#6a1530" />
        </mesh>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Brain control room                                                    */
/* ------------------------------------------------------------------ */
const useScreen = (kind: "tear" | "snot" | "sweat" | "temp", label: string) =>
  useCanvasTex(kind, 512, 384, (g) => {
    g.fillStyle = "#0b1535";
    g.fillRect(0, 0, 512, 384);
    const col = kind === "tear" ? "#5ab8ff" : kind === "snot" ? "#9be564" : kind === "sweat" ? "#6fe0ff" : "#ff4d3a";
    g.strokeStyle = col;
    g.lineWidth = 12;
    g.strokeRect(10, 10, 492, 364);
    g.fillStyle = col;
    g.font = "bold 70px Anton, Impact, sans-serif";
    g.textAlign = "center";
    g.fillText(label, 256, 90);
    if (kind === "tear") drop(g, 256, 230, 90, col);
    if (kind === "snot") {
      g.fillRect(236, 150, 40, 130);
      g.beginPath();
      g.arc(256, 300, 42, 0, 7);
      g.fill();
    }
    if (kind === "sweat") {
      drop(g, 150, 230, 55, col);
      drop(g, 256, 270, 55, col);
      drop(g, 362, 220, 55, col);
    }
    if (kind === "temp") {
      g.fillStyle = "#222";
      g.fillRect(80, 160, 352, 60);
      g.fillStyle = col;
      g.fillRect(80, 160, 330, 60);
      g.font = "bold 80px Anton, Impact, sans-serif";
      g.fillText("TINGGI", 256, 310);
    }
  });

export const BrainRoom: React.FC<{ t: number; pressed: [number, number, number]; alarm?: number }> = ({ t, pressed, alarm = 1 }) => {
  const sc = [useScreen("tear", "AIR MATA"), useScreen("snot", "INGUS"), useScreen("sweat", "KERINGAT")];
  const temp = useScreen("temp", "SUHU");
  const beacon = alarm * (0.5 + 0.5 * Math.sin(t * 12));
  return (
    <group>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9, 28]} />
        <meshStandardMaterial color="#26335f" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[9, 9, 8, 18, 1, true]} />
        <meshStandardMaterial color="#35457e" side={THREE.BackSide} roughness={0.9} flatShading />
      </mesh>
      {[-2.9, 0, 2.9].map((x, i) => {
        const on = pressed[i];
        return (
          <group key={i}>
            <mesh position={[x, 3.3, -4.4]}>
              <planeGeometry args={[2.6, 1.95]} />
              <meshBasicMaterial map={sc[i]} toneMapped={false} color={new THREE.Color().setScalar(0.6 + on * 0.6)} />
            </mesh>
            <M position={[x, 3.3, -4.48]}>
              <boxGeometry args={[2.8, 2.15, 0.1]} />
              <meshStandardMaterial color="#111827" />
            </M>
          </group>
        );
      })}
      <mesh position={[0, 5.9, -4.4]}>
        <planeGeometry args={[3.2, 2.4]} />
        <meshBasicMaterial map={temp} toneMapped={false} />
      </mesh>
      <M position={[0, 0.5, -1.2]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[8.6, 0.8, 1.6]} />
        <meshStandardMaterial color="#d9dde8" roughness={0.5} />
      </M>
      {[-2.9, 0, 2.9].map((x, i) => (
        <M key={i} position={[x, 0.93 - pressed[i] * 0.07, -1.1]}>
          <cylinderGeometry args={[0.42, 0.46, 0.14, 14]} />
          <meshStandardMaterial color={["#2f9bff", "#7ddc48", "#35d3e8"][i]} emissive={["#2f9bff", "#7ddc48", "#35d3e8"][i]} emissiveIntensity={0.3 + pressed[i] * 0.9} />
        </M>
      ))}
      <mesh position={[-7, 4.5, -1]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={new THREE.Color("#ff2a2a").multiplyScalar(0.3 + beacon)} />
      </mesh>
      <mesh position={[7, 4.5, -1]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={new THREE.Color("#ff2a2a").multiplyScalar(0.3 + beacon)} />
      </mesh>
      <ambientLight intensity={0.9} color="#b6c4ff" />
      <pointLight position={[0, 6, 3]} intensity={90} distance={24} color="#ffffff" />
      <pointLight position={[0, 3, 4]} intensity={40 * beacon} distance={16} color="#ff3030" />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Droplets: water (blue) and milk (cream)                               */
/* ------------------------------------------------------------------ */
export const Droplet: React.FC<{ position: Vec3; r?: number; color?: string; opacity?: number }> = ({ position, r = 0.16, color = "#5ab8ff", opacity = 0.75 }) => (
  <mesh position={position}>
    <sphereGeometry args={[r, 12, 10]} />
    <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.1} emissive={color} emissiveIntensity={0.25} />
  </mesh>
);

export const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export { sm, cl, THREE };

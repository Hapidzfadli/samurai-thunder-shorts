import React, { useMemo } from "react";
import * as THREE from "three";
import { P } from "./objectsRig";

type V3 = [number, number, number];
const INK = "#0b0a0c";

/* ------------------------------------------------------------------ */
/* painted textures                                                      */
/* ------------------------------------------------------------------ */
const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const cache: Record<string, THREE.CanvasTexture> = {};
export const facadeTex = (base: string, seed: number, cols = 3, rows = 4, lit = 0.35, shop = false): THREE.CanvasTexture => {
  const key = `${base}|${seed}|${cols}|${rows}|${lit}|${shop}`;
  if (cache[key]) return cache[key];
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 768;
  const c = cv.getContext("2d")!;
  c.fillStyle = base;
  c.fillRect(0, 0, 512, 768);
  // brick courses
  for (let y = 0; y < 768; y += 24) {
    for (let x = (y / 24) % 2 ? 0 : 20; x < 512; x += 48) {
      c.fillStyle = `rgba(0,0,0,${0.05 + rnd(x * 3 + y + seed) * 0.08})`;
      c.fillRect(x + 2, y + 2, 44, 20);
    }
  }
  c.strokeStyle = "rgba(20,10,10,0.28)";
  c.lineWidth = 2;
  for (let y = 0; y < 768; y += 24) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(512, y);
    c.stroke();
  }
  // plinth + cornice
  c.fillStyle = "rgba(40,20,20,0.35)";
  c.fillRect(0, 700, 512, 68);
  c.fillStyle = "rgba(255,240,220,0.35)";
  c.fillRect(0, 0, 512, 40);
  const ww = 512 / cols;
  const hh = (700 - 60) / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = k * ww + ww * 0.2;
      const y = 60 + r * hh + hh * 0.14;
      const w = ww * 0.6;
      const h = hh * 0.66;
      const isLit = rnd(seed * 7 + r * 13 + k * 5) < lit;
      c.fillStyle = "#2b1c1c";
      c.fillRect(x - 8, y - 8, w + 16, h + 16);
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, isLit ? "#ffe9a8" : "#5b7aa8");
      g.addColorStop(1, isLit ? "#ffb85a" : "#2f4a78");
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
      c.strokeStyle = "#2b1c1c";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x + w / 2, y);
      c.lineTo(x + w / 2, y + h);
      c.moveTo(x, y + h * 0.45);
      c.lineTo(x + w, y + h * 0.45);
      c.stroke();
      c.fillStyle = "rgba(255,255,255,0.4)";
      c.fillRect(x - 10, y + h + 8, w + 20, 8);
    }
  }
  if (shop) {
    c.fillStyle = "#8f2d2d";
    c.fillRect(0, 560, 512, 60);
    c.fillStyle = "#ffd98a";
    c.fillRect(30, 630, 452, 80);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache[key] = tex;
  return tex;
};
export const cobbleTex = (a: string, b: string): THREE.CanvasTexture => {
  const key = `cob|${a}|${b}`;
  if (cache[key]) return cache[key];
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 512;
  const c = cv.getContext("2d")!;
  c.fillStyle = a;
  c.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    for (let x = (y / 32) % 2 ? 0 : 24; x < 512; x += 48) {
      c.fillStyle = `rgba(${rnd(x + y) > 0.5 ? "255,255,255" : "0,0,0"},0.06)`;
      c.beginPath();
      c.ellipse(x + 22, y + 15, 21, 13, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = b;
      c.lineWidth = 3;
      c.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache[key] = tex;
  return tex;
};

/* ------------------------------------------------------------------ */
/* building blocks with ink outlines                                      */
/* ------------------------------------------------------------------ */
export const InkBox: React.FC<{ pos: V3; size: V3; color?: string; map?: THREE.Texture; rot?: V3; ink?: number; emissive?: string }> = ({ pos, size, color = "#d8c6a8", map, rot = [0, 0, 0], ink = 0.09, emissive }) => (
  <group position={pos} rotation={rot}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={map ? "#ffffff" : color} map={map} roughness={0.95} emissive={emissive ?? "#000"} />
    </mesh>
    <mesh>
      <boxGeometry args={[size[0] + ink * 2, size[1] + ink * 2, size[2] + ink * 2]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);
export const Building: React.FC<{ pos: V3; w?: number; h?: number; d?: number; base?: string; seed?: number; cols?: number; rows?: number; lit?: number; shop?: boolean; roof?: string }> = ({ pos, w = 5, h = 8, d = 4, base = "#b5573f", seed = 1, cols = 3, rows = 4, lit = 0.35, shop = false, roof = "#4a3a45" }) => {
  const map = facadeTex(base, seed, cols, rows, lit, shop);
  return (
    <group position={pos}>
      <InkBox pos={[0, h / 2, 0]} size={[w, h, d]} map={map} />
      <InkBox pos={[0, h + 0.15, 0]} size={[w + 0.5, 0.3, d + 0.5]} color={roof} ink={0.06} />
      {[0, 1].map((i) => <InkBox key={i} pos={[-w * 0.3 + i * w * 0.6, h + 0.65, -d * 0.2]} size={[0.5, 0.9, 0.5]} color="#8a4a3a" ink={0.05} />)}
    </group>
  );
};
export const SkyDome: React.FC<{ top: string; horizon: string; r?: number }> = ({ top, horizon, r = 120 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) } },
        vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*1.6+0.05, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h,0.8)), 1.0); }",
      }),
    [top, horizon]
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[r, 24, 16]} />
    </mesh>
  );
};
export const Ground: React.FC<{ color: string; size?: number; y?: number }> = ({ color, size = 200, y = 0 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
    <planeGeometry args={[size, size]} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>
);
export const Cobble: React.FC<{ a?: string; b?: string; w?: number; z?: number; len?: number }> = ({ a = "#8d8fa6", b = "#3d3a52", w = 8, z = 0, len = 80 }) => {
  const tex = useMemo(() => cobbleTex(a, b).clone(), [a, b]);
  tex.repeat.set(len / 5, w / 5);
  tex.needsUpdate = true;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]} receiveShadow>
      <planeGeometry args={[len, w]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
};
export const LampPost: React.FC<{ pos: V3; on?: boolean }> = ({ pos, on = false }) => (
  <group position={pos}>
    <P geo={() => <cylinderGeometry args={[0.07, 0.1, 3.4, 8]} />} color="#2a2a33" pos={[0, 1.7, 0]} hull={0.15} />
    <P geo={() => <sphereGeometry args={[0.22, 10, 8]} />} color={on ? "#fff0b0" : "#dfe6ee"} pos={[0, 3.5, 0]} hull={0.12} emissive={on ? "#ffd36a" : "#000"} />
  </group>
);
export const Crate: React.FC<{ pos: V3; s?: number; rot?: V3; color?: string }> = ({ pos, s = 0.8, rot = [0, 0, 0], color = "#b9824a" }) => (
  <InkBox pos={pos} size={[s, s, s]} color={color} rot={rot} ink={0.04} />
);
export const Barrel: React.FC<{ pos: V3; s?: number; color?: string }> = ({ pos, s = 1, color = "#8b5a2b" }) => (
  <group position={pos} scale={s}>
    <P geo={() => <cylinderGeometry args={[0.38, 0.38, 0.9, 12]} />} color={color} pos={[0, 0.45, 0]} hull={0.07} />
    {[0.2, 0.7].map((y) => <P key={y} geo={() => <cylinderGeometry args={[0.395, 0.395, 0.06, 12]} />} color="#3a3a44" pos={[0, y, 0]} nohull />)}
  </group>
);

/* ------------------------------------------------------------------ */
/* the tank                                                              */
/* ------------------------------------------------------------------ */
export const Tank: React.FC<{ pos: V3; r?: number; h?: number; paint?: number; leak?: number; t?: number; burst?: number; shake?: number }> = ({ pos, r = 1.9, h = 4.4, paint = 0, leak = 1, t = 0, burst = 0, shake = 0 }) => {
  const rust = "#8a5a3a";
  const brown = "#6d3d1f";
  const body = rust;
  const gap = Math.min(1, burst) * 2.0; // opening angle of the split
  return (
    <group position={[pos[0] + Math.sin(t * 60) * shake * 0.05, pos[1], pos[2]]}>
      {burst < 0.02 ? (
        <P geo={() => <cylinderGeometry args={[r, r, h, 32]} />} color={body} pos={[0, h / 2, 0]} hull={0.015} />
      ) : (
        <>
          <P geo={() => <cylinderGeometry args={[r, r, h, 32, 1, true, gap, Math.PI * 2 - gap]} />} color={body} pos={[0, h / 2, 0]} hull={0.012} />
          <mesh position={[0, h / 2, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[r * 0.98, r * 0.98, h, 32, 1, true, gap, Math.PI * 2 - gap]} />
            <meshBasicMaterial color="#3a1c0a" side={THREE.BackSide} />
          </mesh>
        </>
      )}
      {paint > 0 && <P geo={() => <cylinderGeometry args={[r + 0.04, r + 0.04, h * Math.min(1, paint), 32]} />} color={brown} pos={[0, (h * Math.min(1, paint)) / 2, 0]} hull={0.01} />}
      {/* paint band stripes */}
      {[0.18, 0.4, 0.62, 0.84].map((k) => <P key={k} geo={() => <cylinderGeometry args={[r + 0.05, r + 0.05, 0.12, 32]} />} color="#3a3a44" pos={[0, h * k, 0]} nohull />)}
      <P geo={() => <coneGeometry args={[r * 1.04, 0.8, 32]} />} color="#4a4a58" pos={[0, h + 0.4, 0]} hull={0.02} />
      {/* ladder */}
      <InkBox pos={[0, h / 2, r + 0.1]} size={[0.5, h, 0.12]} color="#2a2a33" ink={0.03} />
      {/* leak streaks + drips */}
      {leak > 0 && [0, 1, 2, 3].map((i) => {
        const a = -0.9 + i * 0.5;
        const len = (0.9 + (i % 2) * 0.7) * leak;
        return (
          <group key={i} position={[Math.sin(a) * (r + 0.04), 0, Math.cos(a) * (r + 0.04)]} rotation={[0, a, 0]}>
            <mesh position={[0, 0.6 + len / 2, 0.01]}>
              <planeGeometry args={[0.16, len]} />
              <meshBasicMaterial color="#2b1305" />
            </mesh>
            <mesh position={[0, 0.6 - ((t * 1.2 + i * 0.37) % 1) * 0.6, 0.03]}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshBasicMaterial color="#3a1c0a" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* molasses                                                              */
/* ------------------------------------------------------------------ */
const MOL = "#8a4a1c";
const MOL_HI = "#d98a3a";
export const Molasses: React.FC<{ pos: V3; size: V3; ink?: number; t?: number }> = ({ pos, size, ink = 0.06, t = 0 }) => (
  <group position={pos}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={MOL} roughness={0.25} metalness={0.1} />
    </mesh>
    <mesh position={[0, size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size[0] * 0.96, size[2] * 0.96]} />
      <meshStandardMaterial color={MOL} roughness={0.15} metalness={0.2} emissive="#2a0f04" />
    </mesh>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[-size[0] * 0.3 + i * size[0] * 0.28 + Math.sin(t + i) * 0.1, size[1] / 2 + 0.02, -size[2] * 0.2 + i * size[2] * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] * 0.12, 0.12]} />
        <meshBasicMaterial color={MOL_HI} transparent opacity={0.6} />
      </mesh>
    ))}
    <mesh>
      <boxGeometry args={[size[0] + ink * 2, size[1] + ink * 2, size[2] + ink * 2]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);
/** a rolling wave of molasses travelling toward -x; `front` is the x of the leading face */
export const Wave: React.FC<{ front: number; z?: number; width?: number; h?: number; t?: number }> = ({ front, z = 0, width = 9, h = 3.6, t = 0 }) => (
  <group position={[front, 0, z]}>
    {[[0, 0.55, 1.0], [1.3, 0.8, 0.8], [2.6, 1.0, 0.6]].map(([dx, k, kw], i) => (
      <group key={i} position={[dx, 0, 0]}>
        <P geo={() => <capsuleGeometry args={[h * k * 0.5, width * kw, 6, 16]} />} color={MOL} pos={[0, h * k * 0.5, 0]} rot={[Math.PI / 2, 0, 0]} hull={0.05} />
        <mesh position={[-h * k * 0.18, h * k * 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[h * k * 0.06, width * kw * 0.92, 4, 10]} />
          <meshBasicMaterial color={MOL_HI} />
        </mesh>
      </group>
    ))}
    {[0, 1, 2, 3, 4].map((i) => (
      <P key={i} geo={() => <sphereGeometry args={[0.45 + (i % 2) * 0.2, 10, 8]} />} color={MOL} pos={[-0.4 + Math.sin(t * 3 + i) * 0.15, h * 0.62 + (i % 3) * 0.3 + Math.sin(t * 4 + i * 2) * 0.1, -width * 0.38 + i * width * 0.19]} hull={0.08} />
    ))}
  </group>
);
export const Puddle: React.FC<{ x0: number; x1: number; z?: number; width?: number; h?: number; t?: number }> = ({ x0, x1, z = 0, width = 14, h = 0.3, t = 0 }) => {
  const len = Math.max(0.01, Math.abs(x1 - x0));
  return <Molasses pos={[(x0 + x1) / 2, h / 2, z]} size={[len, h, width]} t={t} />;
};

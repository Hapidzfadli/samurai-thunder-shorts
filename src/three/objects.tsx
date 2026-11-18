import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import * as THREE from "three";

export type Vec3 = [number, number, number];

/* ------------------------------------------------------------------ */
/* Camera: positioned declaratively from the current frame.           */
/* ------------------------------------------------------------------ */
export const CameraRig: React.FC<{ position: Vec3; lookAt: Vec3; fov?: number }> = ({
  position,
  lookAt,
  fov,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // Mutating during render keeps the camera in sync with the frame before
  // ThreeCanvas advances the R3F render loop.
  camera.position.set(...position);
  camera.lookAt(...lookAt);
  if (fov !== undefined && camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Ocean: low-poly faceted water driven by a time uniform.            */
/* ------------------------------------------------------------------ */
const oceanVertex = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying float vH;
  varying vec3 vWorld;
  void main() {
    vec3 p = position;
    float h = sin(p.x * 0.35 + uTime * 1.2) * 0.35
            + sin(p.y * 0.50 + uTime * 0.9) * 0.25
            + sin((p.x + p.y) * 0.9 + uTime * 2.0) * 0.08;
    h *= uAmp;
    p.z += h;
    vH = h;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const oceanFragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uCrest;
  uniform vec3 uFog;
  uniform vec3 uMoonDir;
  uniform float uFlash;
  uniform vec3 uGlowColor;
  uniform vec3 uGlowPos;
  uniform float uGlow;
  uniform float uAmp;
  varying float vH;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (n.y < 0.0) n = -n;
    vec3 L = normalize(uMoonDir);
    vec3 V = normalize(cameraPosition - vWorld);
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(-L, n), V), 0.0), 30.0);

    vec3 col = mix(uDeep, uCrest, smoothstep(-0.45 * uAmp, 0.6 * uAmp, vH));
    col *= 0.45 + 0.9 * diff;
    col += vec3(0.75, 0.82, 1.0) * spec * 0.9;

    float gd = distance(vWorld.xz, uGlowPos.xz);
    col += uGlowColor * uGlow / (1.0 + gd * gd * 0.08);
    col += vec3(0.55, 0.6, 0.8) * uFlash * (0.4 + diff);

    float d = distance(vWorld, cameraPosition);
    col = mix(col, uFog, smoothstep(12.0, 75.0, d));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const Ocean: React.FC<{
  t: number;
  flash?: number;
  amp?: number;
  deep?: string;
  crest?: string;
  fog?: string;
  glow?: { pos: Vec3; strength: number; color?: string };
  y?: number;
}> = ({ t, flash = 0, amp = 1, deep = "#06142b", crest = "#2c5a8a", fog = "#0b1630", glow, y = 0 }) => {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 1 },
      uDeep: { value: new THREE.Color() },
      uCrest: { value: new THREE.Color() },
      uFog: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3(-0.4, 0.6, -0.7) },
      uFlash: { value: 0 },
      uGlowColor: { value: new THREE.Color("#ff7a1a") },
      uGlowPos: { value: new THREE.Vector3() },
      uGlow: { value: 0 },
    }),
    []
  );
  uniforms.uTime.value = t;
  uniforms.uAmp.value = amp;
  uniforms.uDeep.value.set(deep);
  uniforms.uCrest.value.set(crest);
  uniforms.uFog.value.set(fog);
  uniforms.uFlash.value = flash;
  uniforms.uGlow.value = glow?.strength ?? 0;
  if (glow) {
    uniforms.uGlowPos.value.set(...glow.pos);
    uniforms.uGlowColor.value.set(glow.color ?? "#ff7a1a");
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, -40]}>
      <planeGeometry args={[200, 200, 72, 72]} />
      <shaderMaterial vertexShader={oceanVertex} fragmentShader={oceanFragment} uniforms={uniforms} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* Mongol / Yuan war junk (low-poly).                                 */
/* ------------------------------------------------------------------ */
const WOOD = "#6b4526";
const DARK_WOOD = "#3d2612";

export const Ship: React.FC<{
  position: Vec3;
  t: number;
  phase?: number;
  scale?: number;
  rotationY?: number;
  sailColor?: string;
}> = ({ position, t, phase = 0, scale = 1, rotationY = 0, sailColor = "#9a2a1c" }) => {
  const bob = Math.sin(t * 1.4 + phase) * 0.15;
  const roll = Math.sin(t * 1.1 + phase) * 0.06;
  const pitch = Math.sin(t * 0.9 + phase * 1.3) * 0.04;
  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[pitch, rotationY, roll]} scale={scale}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.7, 0.8, 4.2]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.65, 2.25]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[1.5, 0.5, 1.0]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.05, -1.6]}>
        <boxGeometry args={[1.6, 0.8, 1.2]} />
        <meshStandardMaterial color={DARK_WOOD} roughness={0.9} flatShading />
      </mesh>
      {[0.7, -0.4].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh position={[0, 2.3, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 3.8, 6]} />
            <meshStandardMaterial color={DARK_WOOD} />
          </mesh>
          <mesh position={[0, 2.6 - i * 0.2, 0]}>
            <boxGeometry args={[2.3 - i * 0.4, 2.5 - i * 0.5, 0.05]} />
            <meshStandardMaterial color={sailColor} roughness={1} side={THREE.DoubleSide} />
          </mesh>
          {[-0.9, -0.3, 0.3, 0.9].map((y) => (
            <mesh key={y} position={[0, 2.6 - i * 0.2 + y * (1 - i * 0.2), 0.04]}>
              <boxGeometry args={[2.35 - i * 0.4, 0.05, 0.06]} />
              <meshStandardMaterial color={DARK_WOOD} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.6, -2.25]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshBasicMaterial color="#ffb347" />
      </mesh>
      <mesh position={[0, 1.0, 2.6]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffb347" />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Samurai (stylised low-poly).                                       */
/* ------------------------------------------------------------------ */
export const Samurai: React.FC<{
  position: Vec3;
  rotationY?: number;
  knock?: number; // 0 = standing, 1 = knocked flat
  knockDir?: number; // radians on the ground plane
  t: number;
  phase?: number;
  swordUp?: number;
}> = ({ position, rotationY = 0, knock = 0, knockDir = 0, t, phase = 0, swordUp = 0 }) => {
  const breathe = Math.sin(t * 2 + phase) * 0.02;
  const tilt = knock * 1.35;
  const slide = knock * 1.2;
  return (
    <group
      position={[position[0] + Math.sin(knockDir) * slide, position[1], position[2] + Math.cos(knockDir) * slide]}
      rotation={[0, knockDir, 0]}
    >
      <group rotation={[tilt, 0, 0]}>
        <group rotation={[0, rotationY - knockDir, 0]}>
          {/* legs / hakama */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.28, 0.42, 0.9, 6]} />
            <meshStandardMaterial color="#1b1b24" flatShading />
          </mesh>
          {/* torso armour (do) */}
          <mesh position={[0, 1.25 + breathe, 0]}>
            <boxGeometry args={[0.72, 0.75, 0.42]} />
            <meshStandardMaterial color="#26222a" metalness={0.3} roughness={0.6} flatShading />
          </mesh>
          {[1.05, 1.22, 1.39].map((y) => (
            <mesh key={y} position={[0, y + breathe, 0.215]}>
              <boxGeometry args={[0.74, 0.04, 0.02]} />
              <meshStandardMaterial color="#9c1c1c" />
            </mesh>
          ))}
          {/* shoulder guards (sode) */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.48, 1.45 + breathe, 0]} rotation={[0, 0, s * -0.35]}>
              <boxGeometry args={[0.3, 0.42, 0.46]} />
              <meshStandardMaterial color="#2c2630" flatShading />
            </mesh>
          ))}
          {/* head */}
          <mesh position={[0, 1.82 + breathe, 0]}>
            <sphereGeometry args={[0.17, 10, 8]} />
            <meshStandardMaterial color="#c79a72" flatShading />
          </mesh>
          {/* kabuto */}
          <mesh position={[0, 1.9 + breathe, 0]}>
            <sphereGeometry args={[0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#141218" metalness={0.5} roughness={0.4} flatShading />
          </mesh>
          <mesh position={[0, 1.88 + breathe, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.36, 0.05, 10]} />
            <meshStandardMaterial color="#141218" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* kuwagata (golden horns) */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.12, 2.15 + breathe, 0.17]} rotation={[0, 0, s * -0.45]}>
              <boxGeometry args={[0.04, 0.38, 0.02]} />
              <meshStandardMaterial color="#d8a93a" metalness={0.9} roughness={0.25} emissive="#5a3d00" />
            </mesh>
          ))}
          {/* arms + katana */}
          <group position={[0.25, 1.3 + breathe, 0.25]} rotation={[-0.6 - swordUp * 1.4, 0, -0.15]}>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.12, 0.12, 0.25]} />
              <meshStandardMaterial color="#1b1b24" />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[0.035, 1.25, 0.06]} />
              <meshStandardMaterial color="#e8eef5" metalness={1} roughness={0.15} />
            </mesh>
          </group>
          {/* sashimono banner */}
          <mesh position={[0, 2.25, -0.25]}>
            <cylinderGeometry args={[0.015, 0.015, 1.6, 4]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0.18, 2.55, -0.25]}>
            <boxGeometry args={[0.34, 0.8, 0.01]} />
            <meshStandardMaterial color="#e9e2d0" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.18, 2.7, -0.24]}>
            <circleGeometry args={[0.1, 16]} />
            <meshBasicMaterial color="#b3141b" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Tetsuhō – ceramic gunpowder bomb.                                  */
/* ------------------------------------------------------------------ */
export const Bomb: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  frame: number;
  split?: number; // 0..1 opens the shell to reveal contents
  showSparks?: boolean;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, frame, split = 0, showSparks = true }) => {
  const shards = useMemo(
    () =>
      new Array(26).fill(0).map((_, i) => {
        const u = random(`s-u-${i}`) * 2 - 1;
        const th = random(`s-t-${i}`) * Math.PI * 2;
        const r = 0.55 + random(`s-r-${i}`) * 0.3;
        const s = Math.sqrt(1 - u * u);
        return {
          pos: [Math.cos(th) * s * r, u * r, Math.sin(th) * s * r] as Vec3,
          rot: [random(`s-a-${i}`) * 6, random(`s-b-${i}`) * 6, 0] as Vec3,
          size: 0.08 + random(`s-z-${i}`) * 0.07,
        };
      }),
    []
  );
  const flicker = 0.7 + 0.3 * Math.sin(frame * 1.7) * Math.sin(frame * 0.63);
  const sparks = showSparks
    ? new Array(28).fill(0).map((_, i) => {
        const life = 14;
        const born = Math.floor(random(`sp-o-${i}`) * life);
        const age = ((frame + born) % life) / life;
        const cycle = Math.floor((frame + born) / life);
        const dx = (random(`sp-x-${i}-${cycle}`) - 0.5) * 2;
        const dz = (random(`sp-z-${i}-${cycle}`) - 0.5) * 2;
        const up = 0.6 + random(`sp-y-${i}-${cycle}`);
        return {
          pos: [dx * age * 0.9, 1.45 + up * age * 0.9 - age * age * 0.6, dz * age * 0.9] as Vec3,
          s: (1 - age) * 0.05,
        };
      })
    : [];
  const shellMat = (
    <meshStandardMaterial color="#4b4038" roughness={0.95} flatShading side={THREE.DoubleSide} />
  );
  const gap = split * 0.55;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* two hemispheres – they slide apart to reveal the inside */}
      <mesh position={[-gap, 0, 0]}>
        <sphereGeometry args={[1, 14, 10, Math.PI * 1.5, Math.PI]} />
        {shellMat}
      </mesh>
      <mesh position={[gap, 0, 0]}>
        <sphereGeometry args={[1, 14, 10, Math.PI * 0.5, Math.PI]} />
        {shellMat}
      </mesh>
      {/* glaze band */}
      {split < 0.02 && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.0, 0.05, 6, 24]} />
          <meshStandardMaterial color="#2a221c" roughness={0.6} />
        </mesh>
      )}
      {/* gunpowder core + iron shrapnel */}
      {split > 0.02 && (
        <group scale={0.6 + 0.4 * split}>
          <mesh>
            <icosahedronGeometry args={[0.5, 1]} />
            <meshStandardMaterial color="#1a1512" emissive="#ff3a00" emissiveIntensity={0.18 * flicker} flatShading />
          </mesh>
          {shards.map((s, i) => (
            <mesh key={i} position={s.pos.map((v) => v * (1 + split * 0.15)) as Vec3} rotation={s.rot}>
              <tetrahedronGeometry args={[s.size]} />
              <meshStandardMaterial color="#b4b8bf" metalness={0.6} roughness={0.45} flatShading />
            </mesh>
          ))}
        </group>
      )}
      {/* fuse */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.25, 8]} />
        <meshStandardMaterial color="#2a221c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.33, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 5]} />
        <meshStandardMaterial color="#c8b48a" />
      </mesh>
      {showSparks && (
        <>
          <mesh position={[0.04, 1.47, 0]}>
            <sphereGeometry args={[0.07 * flicker + 0.03, 8, 8]} />
            <meshBasicMaterial color="#fff2a8" />
          </mesh>
          <pointLight position={[0, 1.6, 0.3]} intensity={6 * flicker} distance={6} color="#ff9a3a" />
          {sparks.map((s, i) => (
            <mesh key={i} position={s.pos}>
              <sphereGeometry args={[Math.max(s.s, 0.001), 4, 4]} />
              <meshBasicMaterial color={i % 3 === 0 ? "#ffffff" : "#ffb347"} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Explosion – fireball, shrapnel, smoke, shockwave.                  */
/* ------------------------------------------------------------------ */
export const Explosion: React.FC<{ position: Vec3; frame: number; start: number; seed?: string; size?: number }> = ({
  position,
  frame,
  start,
  seed = "e",
  size = 1,
}) => {
  const f = frame - start;
  if (f < 0 || f > 90) return null;
  const t = f / 30;
  const fire = Math.min(1, f / 5) * Math.max(0, 1 - f / 28);
  const fireScale = (0.4 + 3.2 * (1 - Math.exp(-f / 5))) * size;
  const debris = new Array(40).fill(0).map((_, i) => {
    const a = random(`${seed}-a-${i}`) * Math.PI * 2;
    const sp = 6 + random(`${seed}-s-${i}`) * 9;
    const up = 5 + random(`${seed}-u-${i}`) * 9;
    const y = Math.max(0, up * t - 9.8 * t * t);
    return {
      pos: [Math.cos(a) * sp * t * size, y * size, Math.sin(a) * sp * t * size] as Vec3,
      rot: [f * 0.3 + i, f * 0.2, 0] as Vec3,
      hot: i % 2 === 0,
    };
  });
  const smoke = new Array(14).fill(0).map((_, i) => {
    const a = random(`${seed}-sa-${i}`) * Math.PI * 2;
    const r = (0.5 + random(`${seed}-sr-${i}`) * 1.8) * size;
    const grow = Math.min(1, f / 25);
    return {
      pos: [Math.cos(a) * r * grow * 1.6, (0.8 + random(`${seed}-sy-${i}`) * 2 + t * 1.2) * size, Math.sin(a) * r * grow * 1.6] as Vec3,
      s: (0.6 + random(`${seed}-ss-${i}`) * 0.8) * (0.3 + grow) * size,
      o: Math.min(1, f / 8) * Math.max(0, 1 - f / 90) * 0.8,
    };
  });
  return (
    <group position={position}>
      <pointLight position={[0, 1.5, 0]} intensity={180 * fire + 20 * Math.max(0, 1 - f / 60)} distance={40} color="#ff8a2a" />
      <mesh position={[0, 0.8 * size, 0]} scale={fireScale}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color="#ff6a00" transparent opacity={fire * 0.85} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.8 * size, 0]} scale={fireScale * 0.6}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color="#fff1b0" transparent opacity={fire} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={(1 + f * 0.45) * size}>
        <ringGeometry args={[0.85, 1, 48]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={Math.max(0, 1 - f / 18) * 0.8} depthWrite={false} />
      </mesh>
      {smoke.map((s, i) => (
        <mesh key={`s${i}`} position={s.pos} scale={s.s}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#2b2522" transparent opacity={s.o} depthWrite={false} flatShading />
        </mesh>
      ))}
      {debris.map((d, i) => (
        <mesh key={i} position={d.pos} rotation={d.rot}>
          <tetrahedronGeometry args={[0.09 * size]} />
          {d.hot && f < 40 ? (
            <meshBasicMaterial color="#ffcf6a" />
          ) : (
            <meshStandardMaterial color="#5c5f66" metalness={0.8} roughness={0.4} />
          )}
        </mesh>
      ))}
    </group>
  );
};

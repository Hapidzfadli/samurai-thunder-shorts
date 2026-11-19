import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Vec3 } from "./objects";

/* ------------------------------------------------------------------ */
/* Moonlit village floor with a pale dirt path and low drifting mist. */
/* ------------------------------------------------------------------ */
export const NightGround: React.FC<{
  t: number;
  ground?: string;
  path?: string;
  mist?: string;
  mistOpacity?: number;
}> = ({ t, ground = "#243050", path = "#4d4a60", mist = "#9fb0e0", mistOpacity = 0.1 }) => {
  const puffs = useMemo(
    () =>
      new Array(9).fill(0).map((_, i) => ({
        x: (random(`ng-x-${i}`) - 0.5) * 26,
        z: -24 + random(`ng-z-${i}`) * 30,
        r: 2.4 + random(`ng-r-${i}`) * 2.6,
        sp: 0.25 + random(`ng-s-${i}`) * 0.5,
        ph: random(`ng-p-${i}`) * 6,
      })),
    []
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.03]} position={[0, 0.02, -10]}>
        <planeGeometry args={[3.6, 70]} />
        <meshStandardMaterial color={path} roughness={1} />
      </mesh>
      {puffs.map((m, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[m.x + Math.sin(t * m.sp + m.ph) * 1.6, 0.2 + (i % 3) * 0.14, m.z]}
        >
          <circleGeometry args={[m.r, 14]} />
          <meshBasicMaterial color={mist} transparent opacity={mistOpacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

export const NightLights: React.FC<{ flash?: number; warm?: boolean }> = ({ flash = 0, warm = false }) => (
  <>
    <ambientLight intensity={(warm ? 1.0 : 0.95) + flash * 2.2} color={warm ? "#d9a99a" : "#8fa2e0"} />
    <directionalLight
      position={warm ? [-8, 5, -24] : [-10, 12, -22]}
      intensity={(warm ? 2.8 : 2.1) + flash * 5}
      color={warm ? "#ffb070" : "#b8c6ff"}
    />
    <directionalLight position={[6, 5, 14]} intensity={warm ? 1.0 : 1.2} color={warm ? "#ffd9b0" : "#9fb4ff"} />
  </>
);

/* ------------------------------------------------------------------ */
/* Yu Darmi — village wife in kebaya, holding a flickering pelita.     */
/* ------------------------------------------------------------------ */
export const YuDarmi: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  lantern?: boolean;
}> = ({ position, rotationY = 0, scale = 1, t, lantern = true }) => {
  const flick = 0.85 + Math.sin(t * 17) * 0.08 + Math.sin(t * 9.3) * 0.07;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* kain batik */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.27, 0.36, 1.04, 8]} />
        <meshStandardMaterial color="#6b3d2a" roughness={0.9} flatShading />
      </mesh>
      {[0.25, 0.55, 0.85].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.27 + (1 - y) * 0.06, 0.27 + (1 - y) * 0.06 + 0.012, 0.05, 8]} />
          <meshStandardMaterial color="#d9a441" roughness={0.8} />
        </mesh>
      ))}
      {/* kebaya */}
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.5, 0.62, 0.3]} />
        <meshStandardMaterial color="#2f8c86" roughness={0.8} flatShading />
      </mesh>
      {/* selendang */}
      <mesh position={[0.1, 1.42, 0.02]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.1, 0.8, 0.34]} />
        <meshStandardMaterial color="#e1b04a" roughness={0.7} />
      </mesh>
      {/* head, hair, sanggul */}
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#c58f66" flatShading />
      </mesh>
      <mesh position={[0, 1.83, -0.01]}>
        <sphereGeometry args={[0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0f0c10" />
      </mesh>
      <mesh position={[0, 1.86, -0.17]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#0f0c10" />
      </mesh>
      {/* arm holding the lantern */}
      <mesh position={[0.36, 1.2, 0.18]} rotation={[-0.9, 0, -0.1]}>
        <cylinderGeometry args={[0.055, 0.05, 0.62, 6]} />
        <meshStandardMaterial color="#c58f66" flatShading />
      </mesh>
      <mesh position={[-0.33, 1.15, 0]} rotation={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.055, 0.05, 0.62, 6]} />
        <meshStandardMaterial color="#c58f66" flatShading />
      </mesh>
      {lantern && (
        <group position={[0.38, 1.12, 0.52]}>
          <mesh>
            <boxGeometry args={[0.13, 0.2, 0.13]} />
            <meshBasicMaterial color="#ffd27d" />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <coneGeometry args={[0.1, 0.07, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <pointLight position={[0, 0, 0.15]} intensity={7 * flick} distance={9} color="#ffa955" />
        </group>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Suami — merantau, bawa tas. Does not animate his legs (the tell).   */
/* eyeGlow > 0 makes his eyes begin to glow red.                       */
/* ------------------------------------------------------------------ */
export const SuamiFigure: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  eyeGlow?: number;
  bag?: boolean;
  walking?: boolean;
  walkF?: number; // steps per second; a footfall lands whenever sin(pi*f*t) = 0 (feet apart, body lowest)
}> = ({ position, rotationY = 0, scale = 1, t, eyeGlow = 0, bag = true, walking = false, walkF = 1.8 }) => {
  const ph = Math.PI * walkF * t;
  const c = walking ? Math.cos(ph) : 0;
  const sn = walking ? Math.sin(ph) : 0;
  const bob = Math.abs(sn) * 0.06;
  const sway = Math.sin(t * 1.3) * (walking ? 0.004 : 0.015) + c * 0.03;
  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[0, rotationY, sway]} scale={scale}>
      {/* shoes: feet swing front/back and lift mid-stride */}
      {[-1, 1].map((sd) => (
        <mesh
          key={sd}
          position={[sd * 0.13, 0.04 - bob + 0.08 * Math.max(0, sd * sn * -1), sd * 0.2 * c]}
        >
          <boxGeometry args={[0.13, 0.07, 0.26]} />
          <meshStandardMaterial color="#1a1410" roughness={1} flatShading />
        </mesh>
      ))}
      {/* sarung */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.38, 1.0, 8]} />
        <meshStandardMaterial color="#38588c" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0.0]}>
        <cylinderGeometry args={[0.305, 0.385, 0.06, 8]} />
        <meshStandardMaterial color="#e6e1d2" />
      </mesh>
      {/* baju */}
      <mesh position={[0, 1.38, 0]}>
        <boxGeometry args={[0.64, 0.72, 0.34]} />
        <meshStandardMaterial color="#d9d2bd" roughness={0.85} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.4, 1.66, 0]} rotation={[-s * 0.4 * c, 0, 0]}>
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.065, 0.06, 0.78, 6]} />
            <meshStandardMaterial color="#d9d2bd" flatShading />
          </mesh>
        </group>
      ))}
      {/* head + peci */}
      <mesh position={[0, 1.92, 0]}>
        <sphereGeometry args={[0.17, 10, 8]} />
        <meshStandardMaterial color="#b9835d" flatShading />
      </mesh>
      <mesh position={[0, 2.06, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.13, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* eyes */}
      {[-0.06, 0.06].map((x, i) => (
        <mesh key={i} position={[x, 1.94, 0.15]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          {eyeGlow > 0 ? <meshBasicMaterial color="#ff2a10" /> : <meshBasicMaterial color="#1a1210" />}
        </mesh>
      ))}
      {eyeGlow > 0 && <pointLight position={[0, 1.94, 0.4]} intensity={3 * eyeGlow} distance={4} color="#ff2a10" />}
      {bag && (
        <mesh position={[0.46, 0.78, 0.08]}>
          <boxGeometry args={[0.28, 0.34, 0.18]} />
          <meshStandardMaterial color="#7a5430" roughness={0.9} flatShading />
        </mesh>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Genderuwo — hulking shaggy ape-like spirit, red eyes, fangs.        */
/* ------------------------------------------------------------------ */
export const GenderuwoFigure: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  eyeGlow?: number;
  lean?: number; // 0..1 hunch forward
  pound?: number; // 0..1 arms slamming forward
  rage?: number; // 0..1 head thrown back / jitter
  flare?: number; // 0..1 eyes blaze
  walking?: boolean;
  walkF?: number; // steps per second; heavy footfall whenever sin(pi*f*t) = 0
}> = ({ position, rotationY = 0, scale = 1, t, eyeGlow = 1, lean = 0.25, pound = 0, rage = 0, flare = 0, walking = false, walkF = 3.4 }) => {
  const wph = Math.PI * walkF * t;
  const wc = walking ? Math.cos(wph) : 0;
  const wbob = walking ? Math.abs(Math.sin(wph)) * 0.12 : 0;
  const fur = useMemo(
    () =>
      new Array(46).fill(0).map((_, i) => {
        const a = random(`gf-a-${i}`) * Math.PI * 2;
        const h = random(`gf-h-${i}`);
        const r = 0.5 + random(`gf-r-${i}`) * 0.35;
        return {
          x: Math.cos(a) * r * 1.05,
          y: 1.2 + h * 1.35,
          z: Math.sin(a) * r * 0.8,
          len: 0.4 + random(`gf-l-${i}`) * 0.45,
          tilt: (random(`gf-t-${i}`) - 0.5) * 0.5,
        };
      }),
    []
  );
  const jitter = rage * Math.sin(t * 40) * 0.025;
  const breathe = Math.sin(t * 2.2) * 0.03;
  const furColor = "#2a1c15";
  const skin = "#403836";

  const arm = (s: number) => {
    const swing = Math.sin(t * 2 + s) * 0.05;
    const rx = -0.1 - lean * 0.3 - pound * 1.15 + swing;
    return (
      <group position={[s * 0.82, 2.2 + breathe, 0]} rotation={[rx, 0, s * 0.1]}>
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.24, 0.2, 1.45, 7]} />
          <meshStandardMaterial color={skin} roughness={0.95} flatShading />
        </mesh>
        {/* shaggy fur on the arm */}
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} position={[(k % 2 ? 0.17 : -0.17) * s, -0.2 - k * 0.26, 0.05]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.1, 0.38, 4]} />
            <meshStandardMaterial color={furColor} roughness={1} flatShading />
          </mesh>
        ))}
        <mesh position={[0, -1.5, 0.03]}>
          <sphereGeometry args={[0.27, 7, 6]} />
          <meshStandardMaterial color={skin} roughness={0.95} flatShading />
        </mesh>
        {[-0.12, 0, 0.12].map((x) => (
          <mesh key={x} position={[x, -1.78, 0.1]} rotation={[Math.PI - 0.25, 0, 0]}>
            <coneGeometry args={[0.04, 0.3, 4]} />
            <meshStandardMaterial color="#d8d0b8" roughness={0.6} />
          </mesh>
        ))}
      </group>
    );
  };

  return (
    <group position={[position[0], position[1] + wbob * scale, position[2]]} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={[jitter * 3, 0, 0]}>
        {/* legs */}
        {[-0.38, 0.38].map((x) => (
          <group key={x} position={[x, 1.05, 0]} rotation={[Math.sign(x) * 0.55 * wc, 0, 0]}>
            <mesh position={[0, -0.53, 0]}>
              <cylinderGeometry args={[0.28, 0.24, 1.06, 7]} />
              <meshStandardMaterial color={skin} roughness={0.95} flatShading />
            </mesh>
          </group>
        ))}
        {/* torso, hunched */}
        <group rotation={[lean * 0.3, 0, 0]}>
          <mesh position={[0, 1.72 + breathe, 0]} scale={[1.12, 1.15, 0.85]}>
            <icosahedronGeometry args={[0.85, 1]} />
            <meshStandardMaterial color={skin} roughness={0.95} flatShading />
          </mesh>
          {fur.map((f, i) => (
            <mesh key={i} position={[f.x, f.y, f.z + 0.2]} rotation={[Math.PI + f.tilt, 0, f.tilt]}>
              <coneGeometry args={[0.1, f.len, 4]} />
              <meshStandardMaterial color={furColor} roughness={1} flatShading />
            </mesh>
          ))}
          {/* arms */}
          {arm(-1)}
          {arm(1)}
          {/* head */}
          <group position={[0, 2.78, 0.3]} rotation={[-rage * 0.45 + 0.12, 0, 0]}>
            <mesh scale={[1.05, 0.92, 1]}>
              <sphereGeometry args={[0.4, 9, 8]} />
              <meshStandardMaterial color="#33241d" roughness={0.9} flatShading />
            </mesh>
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <mesh
                key={k}
                position={[(k - 3) * 0.1, 0.32, -0.02 - Math.abs(k - 3) * 0.02]}
                rotation={[-0.2, 0, (k - 3) * 0.18]}
              >
                <coneGeometry args={[0.08, 0.42, 4]} />
                <meshStandardMaterial color={furColor} roughness={1} flatShading />
              </mesh>
            ))}
            {/* brow */}
            <mesh position={[0, 0.1, 0.34]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.6, 0.09, 0.14]} />
              <meshStandardMaterial color={furColor} roughness={1} flatShading />
            </mesh>
            {/* glowing eyes */}
            {[-0.15, 0.15].map((x, i) => (
              <mesh key={i} position={[x, 0.04, 0.38]}>
                <sphereGeometry args={[0.065 * (1 + flare * 1.1), 8, 8]} />
                <meshBasicMaterial color={flare > 0.3 ? "#ff5a3a" : "#ff2a10"} />
              </mesh>
            ))}
            {/* mouth + fangs */}
            <mesh position={[0, -0.14, 0.38]}>
              <boxGeometry args={[0.3, 0.1 + rage * 0.12, 0.06]} />
              <meshBasicMaterial color="#120404" />
            </mesh>
            {[-0.09, 0.09].map((x) => (
              <mesh key={x} position={[x, -0.1, 0.41]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.025, 0.12, 4]} />
                <meshStandardMaterial color="#f0ead8" />
              </mesh>
            ))}
            <pointLight position={[0, 0.04, 0.8]} intensity={1.0 * eyeGlow + flare * 9} distance={4.0 + flare * 4} color="#ff3a1a" />
          </group>
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Daun kelor — scattered sprigs, softly glowing green.                */
/* ------------------------------------------------------------------ */
export const KelorLeaves: React.FC<{ position: Vec3; width?: number; grow?: number }> = ({
  position,
  width = 1.1,
  grow = 1,
}) => {
  const leaves = useMemo(
    () =>
      new Array(46).fill(0).map((_, i) => ({
        x: (random(`kl-x-${i}`) - 0.5) * width,
        z: (random(`kl-z-${i}`) - 0.5) * 0.4,
        rot: random(`kl-r-${i}`) * Math.PI,
        s: 0.7 + random(`kl-s-${i}`) * 0.7,
        c: i % 3 === 0 ? "#6cd45a" : "#3fae4a",
      })),
    [width]
  );
  return (
    <group position={position} scale={[1, Math.max(0.01, grow), 1]}>
      {leaves.map((l, i) => (
        <mesh key={i} position={[l.x, 0.05, l.z]} rotation={[0, l.rot, 0]} scale={[0.1 * l.s, 0.025, 0.05 * l.s]}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshStandardMaterial color={l.c} emissive="#1d6a24" emissiveIntensity={0.9} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Singkong-bakar smoke wisps drifting across the yard.                */
/* ------------------------------------------------------------------ */
export const SmokeWisps: React.FC<{ t: number; origin?: Vec3; spread?: number; count?: number }> = ({
  t,
  origin = [3, 0.4, -9],
  spread = 5,
  count = 18,
}) => {
  const seeds = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        a: random(`sw-a-${i}`),
        b: random(`sw-b-${i}`),
        c: random(`sw-c-${i}`),
      })),
    [count]
  );
  return (
    <group>
      {seeds.map((s, i) => {
        const life = (t * 0.22 + s.a) % 1;
        const x = origin[0] - life * spread * 1.4 + (s.b - 0.5) * 1.6 + Math.sin(t + i) * 0.3;
        const y = origin[1] + life * 3.4;
        const z = origin[2] + life * spread * 1.6 + (s.c - 0.5) * 2;
        const r = 0.25 + life * 0.9;
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r, 8, 6]} />
            <meshBasicMaterial color="#b9c3dc" transparent opacity={0.16 * Math.sin(Math.PI * life)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Lampu minyak gantung — swings on its chain, flame flickers.          */
/* sway 0..1 scales the pendulum swing; the flame gutters as it grows.  */
/* ------------------------------------------------------------------ */
export const HangingLamp: React.FC<{ position: Vec3; t: number; sway?: number; chain?: number }> = ({
  position,
  t,
  sway = 0,
  chain = 2.3,
}) => {
  const ang = sway * 0.4 * Math.sin(t * 2.7) * (1 + 0.18 * Math.sin(t * 1.1)) + Math.sin(t * 0.9) * 0.012;
  const flame = 0.85 + 0.2 * Math.sin(t * 23) + 0.12 * Math.sin(t * 37 + 1.3) - sway * 0.3 * Math.abs(Math.sin(t * 2.7));
  return (
    <group position={position}>
      {/* ceiling hook */}
      <mesh>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#1a1612" />
      </mesh>
      <group rotation={[0, 0, ang]}>
        <mesh position={[0, -chain / 2, 0]}>
          <cylinderGeometry args={[0.013, 0.013, chain, 5]} />
          <meshStandardMaterial color="#2a2622" metalness={0.6} roughness={0.5} />
        </mesh>
        <group position={[0, -chain, 0]}>
          {/* brass cap + ring */}
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.17, 0.14, 8]} />
            <meshStandardMaterial color="#9c7a34" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <torusGeometry args={[0.035, 0.01, 6, 10]} />
            <meshStandardMaterial color="#9c7a34" metalness={0.8} roughness={0.35} />
          </mesh>
          {/* glass chimney, glowing */}
          <mesh>
            <cylinderGeometry args={[0.1, 0.12, 0.3, 10]} />
            <meshBasicMaterial color="#ffd68a" transparent opacity={0.55 + 0.25 * flame} />
          </mesh>
          {/* flame */}
          <mesh position={[0, -0.02, 0]} scale={[1, Math.max(0.4, flame), 1]}>
            <coneGeometry args={[0.06, 0.2, 7]} />
            <meshBasicMaterial color="#fff2c4" />
          </mesh>
          {/* oil reservoir */}
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.14, 0.11, 0.14, 10]} />
            <meshStandardMaterial color="#9c7a34" metalness={0.8} roughness={0.35} />
          </mesh>
          <pointLight position={[0, 0, 0.15]} intensity={Math.max(1.5, 11 * flame)} distance={11} color="#ffa955" />
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Telapak kaki besar berbulu di tanah.                                */
/* ------------------------------------------------------------------ */
export const Footprint: React.FC<{ position: Vec3; rotationY?: number; mirror?: boolean; scale?: number }> = ({
  position,
  rotationY = 0,
  mirror = false,
  scale = 1,
}) => (
  <group position={[position[0], 0.04, position[2]]} rotation={[0, rotationY, 0]} scale={[mirror ? -scale : scale, 1, scale]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[0.34, 0.55, 1]}>
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial color="#120d0b" />
    </mesh>
    {[-0.3, -0.12, 0.06, 0.24, 0.4].map((x, i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x * 0.9, 0, -0.62 - Math.abs(x) * 0.15]} scale={[0.08, 0.1, 1]}>
        <circleGeometry args={[1, 8]} />
        <meshBasicMaterial color="#120d0b" />
      </mesh>
    ))}
  </group>
);

/* ------------------------------------------------------------------ */
/* Doorway seen from inside: dark frame posts, lintel & kelor step.    */
/* ------------------------------------------------------------------ */
export const DoorwayFrame: React.FC<{ z?: number }> = ({ z = -1.4 }) => (
  <group>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.62, 1.6, z]}>
        <boxGeometry args={[0.16, 3.4, 0.2]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.95} flatShading />
      </mesh>
    ))}
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 1.9, 1.7, z]}>
        <boxGeometry args={[2.4, 3.6, 0.3]} />
        <meshStandardMaterial color="#2a1f1a" roughness={1} flatShading />
      </mesh>
    ))}
    <mesh position={[0, 2.7, z]}>
      <boxGeometry args={[1.4, 0.22, 0.2]} />
      <meshStandardMaterial color="#3a2a20" roughness={0.95} flatShading />
    </mesh>
    {/* threshold step */}
    <mesh position={[0, 0.06, z]}>
      <boxGeometry args={[1.3, 0.12, 0.45]} />
      <meshStandardMaterial color="#4a3425" roughness={0.95} flatShading />
    </mesh>
    {/* interior floor */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z + 3]}>
      <planeGeometry args={[6, 6]} />
      <meshStandardMaterial color="#3a2a22" roughness={1} />
    </mesh>
  </group>
);

export { THREE };

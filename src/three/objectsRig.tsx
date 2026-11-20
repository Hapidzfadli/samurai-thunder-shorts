import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "./objects";

/* ================================================================== */
/* A fully jointed toon-shaded 3D character.                           */
/* Parts are primitives with a cel gradient and an inverted-hull        */
/* outline. Every limb is a two-bone chain that can be driven by        */
/* angles (FK) or by a target point (IK).                                */
/* ================================================================== */
const GRAD = (() => {
  const d = new Uint8Array([85, 150, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const INK = "#0d0b14";

const P: React.FC<{ geo: () => React.ReactNode; color: string; pos?: Vec3; rot?: Vec3; scale?: Vec3 | number; hull?: number; emissive?: string; nohull?: boolean }> = ({ geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, hull = 0.05, emissive, nohull }) => (
  <group position={pos} rotation={rot} scale={scale as never}>
    <mesh castShadow receiveShadow>
      {geo()}
      <meshToonMaterial color={color} gradientMap={GRAD} emissive={emissive ?? "#000000"} />
    </mesh>
    {!nohull && (
      <mesh scale={1 + hull}>
        {geo()}
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

export type Expr3 = "neutral" | "surprised" | "worried" | "happy" | "smug" | "sleepy" | "angry" | "grin" | "scared";
export type ArmPose = { swing?: number; out?: number; elbow?: number; ik?: { target: Vec3; pole?: Vec3 } };
export type LegPose = { swing?: number; out?: number; knee?: number };
export type Pose3 = {
  bob?: number; // extra lift of the pelvis
  lean?: number; // torso pitch (+ forward)
  twist?: number; // torso yaw
  sway?: number; // torso roll
  head?: [number, number, number]; // pitch, yaw, roll
  armL?: ArmPose;
  armR?: ArmPose;
  legL?: LegPose;
  legR?: LegPose;
  squash?: number;
};
export type Body = {
  skin?: string;
  shirt: string;
  pants: string;
  shoes?: string;
  hair?: string;
  hairStyle?: "short" | "bald" | "bun" | "messy" | "quiff" | "none";
  height?: number; // overall scale
  headScale?: number;
  belly?: number;
  mustache?: boolean;
  glasses?: boolean;
  shades?: boolean;
  sarong?: boolean;
  slim?: number;
  armor?: "samurai" | "ashigaru" | "commander" | "none";
  banner?: string; // sashimono cloth colour
  accent?: string; // armour lacing colour
};

const L_UP = 0.3;
const L_LO = 0.28;
const T_UP = 0.42;
const T_LO = 0.42;

export const ikAim = (l1: number, l2: number, shoulder: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3) => {
  const d = target.clone().sub(shoulder);
  const dist = Math.min(l1 + l2 - 0.002, Math.max(Math.abs(l1 - l2) + 0.002, d.length()));
  const dirT = d.clone().normalize();
  const A = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))));
  let pv = pole.clone().sub(dirT.clone().multiplyScalar(pole.dot(dirT)));
  if (pv.length() < 1e-4) pv = new THREE.Vector3(0, 0, 1);
  pv.normalize();
  const u = dirT.clone().multiplyScalar(Math.cos(A)).add(pv.multiplyScalar(Math.sin(A))).normalize();
  const elbow = shoulder.clone().add(u.clone().multiplyScalar(l1));
  const tgt = shoulder.clone().add(dirT.clone().multiplyScalar(dist));
  const f = tgt.sub(elbow).normalize();
  const rest = new THREE.Vector3(0, -1, 0);
  const q1 = new THREE.Quaternion().setFromUnitVectors(rest, u);
  const qw = new THREE.Quaternion().setFromUnitVectors(rest, f);
  const q2 = q1.clone().invert().multiply(qw);
  return { q1: q1.toArray() as [number, number, number, number], q2: q2.toArray() as [number, number, number, number] };
};

const Hand: React.FC<{ color: string }> = ({ color }) => <P geo={() => <sphereGeometry args={[0.065, 10, 8]} />} color={color} pos={[0, -0.04, 0]} hull={0.08} />;

const Arm: React.FC<{ side: -1 | 1; pose?: ArmPose; shirt: string; skin: string; slim: number; sode?: boolean; accent?: string }> = ({ side, pose = {}, shirt, skin, slim, sode, accent = "#9c1c1c" }) => {
  const sh: Vec3 = [side * 0.27 * slim, 0.52, 0];
  let q1: [number, number, number, number] | undefined;
  let q2: [number, number, number, number] | undefined;
  if (pose.ik) {
    const r = ikAim(L_UP, L_LO, new THREE.Vector3(...sh), new THREE.Vector3(...pose.ik.target), new THREE.Vector3(...(pose.ik.pole ?? [side * 0.6, -0.3, -0.2])));
    q1 = r.q1;
    q2 = r.q2;
  }
  const swing = pose.swing ?? 0;
  const out = (pose.out ?? 0.12) * side;
  const elbow = pose.elbow ?? 0.15;
  return (
    <group position={sh} {...(q1 ? { quaternion: q1 } : { rotation: [-swing, 0, out] })}>
      <P geo={() => <sphereGeometry args={[0.075, 10, 8]} />} color={shirt} hull={0.07} />
      {sode && (
        <group rotation={[0, 0, side * 0.25]}>
          <P geo={() => <boxGeometry args={[0.2, 0.24, 0.26]} />} color="#1a1822" pos={[side * 0.03, -0.06, 0]} />
          {[-0.1, 0, 0.1].map((y) => (
            <mesh key={y} position={[side * 0.03, -0.06 + y, 0.135]}>
              <boxGeometry args={[0.2, 0.018, 0.01]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          ))}
        </group>
      )}
      <P geo={() => <capsuleGeometry args={[0.055, L_UP - 0.11, 4, 8]} />} color={sode ? "#1a1822" : shirt} pos={[0, -L_UP / 2, 0]} />
      <group position={[0, -L_UP, 0]} {...(q2 ? { quaternion: q2 } : { rotation: [-elbow, 0, 0] })}>
        <P geo={() => <sphereGeometry args={[0.058, 8, 8]} />} color={skin} hull={0.07} />
        <P geo={() => <capsuleGeometry args={[0.048, L_LO - 0.1, 4, 8]} />} color={skin} pos={[0, -L_LO / 2, 0]} />
        <group position={[0, -L_LO, 0]}>
          <Hand color={skin} />
        </group>
      </group>
    </group>
  );
};

const Leg: React.FC<{ side: -1 | 1; pose?: LegPose; pants: string; shoes: string; sarong?: boolean }> = ({ side, pose = {}, pants, shoes, sarong }) => {
  const swing = pose.swing ?? 0;
  const knee = pose.knee ?? 0;
  const out = (pose.out ?? 0.03) * side;
  return (
    <group position={[side * 0.1, 0, 0]} rotation={[-swing, 0, out]}>
      <P geo={() => <capsuleGeometry args={[0.085, T_UP - 0.17, 4, 8]} />} color={pants} pos={[0, -T_UP / 2, 0]} />
      <group position={[0, -T_UP, 0]} rotation={[knee, 0, 0]}>
        <P geo={() => <sphereGeometry args={[0.078, 8, 8]} />} color={pants} hull={0.07} />
        {!sarong && <P geo={() => <capsuleGeometry args={[0.07, T_LO - 0.14, 4, 8]} />} color={pants} pos={[0, -T_LO / 2, 0]} />}
        {sarong && <P geo={() => <capsuleGeometry args={[0.06, T_LO - 0.12, 4, 8]} />} color="#f1c9a0" pos={[0, -T_LO / 2, 0]} />}
        <group position={[0, -T_LO, 0.0]} rotation={[-(swing - knee) * 0.0, 0, 0]}>
          <P geo={() => <boxGeometry args={[0.13, 0.08, 0.26]} />} color={shoes} pos={[0, -0.03, 0.06]} hull={0.06} />
        </group>
      </group>
    </group>
  );
};

const Face: React.FC<{ r: number; expr: Expr3; look: [number, number]; blink: number; brow: string; mustache?: boolean; glasses?: boolean; shades?: boolean }> = ({ r, expr, look, blink, brow, mustache, glasses, shades }) => {
  const eyeR = (expr === "surprised" || expr === "scared" ? 0.056 : 0.046) * (r / 0.22);
  const lid = expr === "sleepy" ? 0.15 : expr === "smug" ? 0.55 : expr === "happy" || expr === "grin" ? 0.8 : 1;
  const ey = Math.max(0.1, Math.min(lid, blink));
  const tilt = expr === "worried" || expr === "scared" ? 0.42 : expr === "angry" ? -0.42 : expr === "smug" ? -0.2 : 0;
  const by = expr === "surprised" || expr === "scared" ? 0.12 : 0.085;
  const k = r / 0.22;
  return (
    <group>
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.085 * k, 0.03 * k, r * 0.86]}>
          <mesh scale={[1, ey, 0.6]}>
            <sphereGeometry args={[eyeR, 14, 10]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[look[0] * 0.018, look[1] * 0.012, eyeR * 0.5]} scale={[1, ey, 0.5]}>
            <sphereGeometry args={[expr === "surprised" || expr === "scared" ? 0.016 * k : 0.026 * k, 10, 8]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          <mesh position={[0, (by - 0.03) * k, 0.01]} rotation={[0, 0, -sd * tilt]}>
            <boxGeometry args={[0.085 * k, 0.017 * k, 0.012]} />
            <meshBasicMaterial color={brow} />
          </mesh>
          {shades && (
            <mesh position={[0, 0, 0.035]} scale={[1, 1, 0.3]}>
              <sphereGeometry args={[eyeR * 1.22, 16, 12]} />
              <meshBasicMaterial color="#0d0d12" />
            </mesh>
          )}
          {glasses && !shades && (
            <mesh position={[0, 0, 0.03]}>
              <torusGeometry args={[eyeR * 1.35, 0.007, 6, 18]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          )}
        </group>
      ))}
      {/* mouth */}
      {(expr === "surprised" || expr === "scared") && (
        <mesh position={[0, -0.085 * k, r * 0.9]} scale={[1, 1.4, 0.4]}>
          <sphereGeometry args={[0.032 * k, 10, 8]} />
          <meshBasicMaterial color="#3a0f12" />
        </mesh>
      )}
      {(expr === "happy" || expr === "smug" || expr === "grin") && (
        <mesh position={[expr === "smug" ? 0.02 * k : 0, -0.06 * k, r * 0.93]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[(expr === "grin" ? 0.05 : 0.038) * k, 0.008, 6, 14, Math.PI]} />
          <meshBasicMaterial color="#5a1f22" />
        </mesh>
      )}
      {(expr === "worried" || expr === "angry") && (
        <mesh position={[0, -0.1 * k, r * 0.93]}>
          <torusGeometry args={[0.03 * k, 0.008, 6, 14, Math.PI]} />
          <meshBasicMaterial color="#5a1f22" />
        </mesh>
      )}
      {(expr === "neutral" || expr === "sleepy") && (
        <mesh position={[0, -0.085 * k, r * 0.93]}>
          <boxGeometry args={[0.06 * k, 0.011 * k, 0.01]} />
          <meshBasicMaterial color="#5a1f22" />
        </mesh>
      )}
      {mustache && (
        <P geo={() => <boxGeometry args={[0.16 * k, 0.035 * k, 0.03]} />} color="#2a1a10" pos={[0, -0.052 * k, r * 0.95]} hull={0.15} />
      )}
    </group>
  );
};

export const Rig3D: React.FC<{
  position: Vec3;
  rotationY?: number;
  scale?: number;
  t: number;
  body: Body;
  pose?: Pose3;
  expr?: Expr3;
  look?: [number, number];
  seed?: number;
  shadow?: boolean;
  children?: React.ReactNode;
}> = ({ position, rotationY = 0, scale = 1, t, body, pose = {}, expr = "neutral", look = [0, 0], seed = 1, shadow = true, children }) => {
  const skin = body.skin ?? "#f1c9a0";
  const slim = body.slim ?? 1;
  const hs = body.headScale ?? 1;
  const r = 0.22 * hs;
  const belly = body.belly ?? 0;
  const H = body.height ?? 1;
  const lw = pose.legL ?? {};
  const rw = pose.legR ?? {};
  // lowest foot touches the ground: vertical extent of each leg chain
  const ext = (lg: LegPose) => T_UP * Math.cos(lg.swing ?? 0) + T_LO * Math.cos((lg.swing ?? 0) - (lg.knee ?? 0)) + 0.07;
  const hipY = Math.max(ext(lw), ext(rw)) + (pose.bob ?? 0) - (pose.squash ?? 0) * 0.08;
  const blink = (t + seed * 0.37) % 3.1 < 0.11 ? 0.1 : 1;
  const breathe = 1 + Math.sin(t * 2.4 + seed) * 0.012;
  const hd = pose.head ?? [0, 0, 0];
  const hairColor = body.hair ?? "#1c1410";
  const armored = !!body.armor && body.armor !== "none";
  const accent = body.accent ?? "#9c1c1c";
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale * H}>
      <group position={[0, hipY, 0]} rotation={[pose.lean ?? 0, pose.twist ?? 0, pose.sway ?? 0]}>
        {/* pelvis + torso */}
        <P geo={() => <sphereGeometry args={[0.2, 12, 10]} />} color={body.pants} pos={[0, 0.0, 0]} scale={[1 * slim, 0.7, 0.8]} />
        <group scale={[1, breathe, 1]}>
          <P geo={() => <capsuleGeometry args={[0.2, 0.3, 6, 12]} />} color={body.shirt} pos={[0, 0.3, 0]} scale={[slim * (1 + belly * 0.1), 1, 0.78 + belly * 0.25]} />
          {belly > 0 && <P geo={() => <sphereGeometry args={[0.24, 12, 10]} />} color={body.shirt} pos={[0, 0.16, 0.1 + belly * 0.07]} scale={[1, 0.95, 0.6 + belly * 0.4]} />}
        </group>
        {armored && (
          <group>
            <P geo={() => <boxGeometry args={[0.44 * slim, 0.46, 0.1]} />} color={body.armor === "ashigaru" ? "#3a3646" : "#1a1822"} pos={[0, 0.3, 0.13 + belly * 0.05]} />
            {[0.14, 0.26, 0.38, 0.5].map((y) => (
              <mesh key={y} position={[0, y, 0.185 + belly * 0.05]}>
                <boxGeometry args={[0.44 * slim, 0.02, 0.01]} />
                <meshBasicMaterial color={accent} />
              </mesh>
            ))}
            <P geo={() => <boxGeometry args={[0.52 * slim, 0.26, 0.4]} />} color="#14131a" pos={[0, -0.2, 0.0]} />
            {[-0.2, -0.1, 0.0, 0.1].map((y) => (
              <mesh key={y} position={[0, -0.2 + y * 0.6, 0.205]}>
                <boxGeometry args={[0.5 * slim, 0.012, 0.01]} />
                <meshBasicMaterial color={accent} />
              </mesh>
            ))}
            {body.armor !== "ashigaru" && (
              <group position={[0, 0.75, -0.22]} rotation={[0.05 * Math.sin(t * 2 + seed), 0, 0.04 * Math.sin(t * 1.6 + seed)]}>
                <mesh position={[0, 0.45, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 1.5, 5]} />
                  <meshBasicMaterial color="#111" />
                </mesh>
                <mesh position={[0.17, 0.85 + Math.sin(t * 3 + seed) * 0.01, 0]} rotation={[0, Math.sin(t * 2.2 + seed) * 0.15, 0]}>
                  <planeGeometry args={[0.34, 0.78]} />
                  <meshStandardMaterial color={body.banner ?? "#e9e2d0"} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0.17, 1.0, 0.004]}>
                  <circleGeometry args={[0.09, 16]} />
                  <meshBasicMaterial color="#b3141b" />
                </mesh>
              </group>
            )}
            {body.armor === "commander" && (
              <mesh position={[0, 0.3, -0.2]} rotation={[0.12 + 0.05 * Math.sin(t * 2.4), 0, 0]}>
                <planeGeometry args={[0.7, 1.05]} />
                <meshStandardMaterial color="#8a1018" side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )}
        {body.sarong && <P geo={() => <cylinderGeometry args={[0.24 * slim, 0.3 * slim, 0.55, 14]} />} color={body.pants} pos={[0, -0.18, 0]} />}
        <P geo={() => <cylinderGeometry args={[0.055, 0.065, 0.1, 8]} />} color={skin} pos={[0, 0.64, 0]} />
        {/* head */}
        <group position={[0, 0.64 + r + 0.02, 0]} rotation={[hd[0], hd[1], hd[2]]}>
          <P geo={() => <sphereGeometry args={[r, 20, 16]} />} color={skin} scale={[0.96, 1.04, 0.98]} hull={0.045} />
          {[-1, 1].map((sd) => (
            <P key={sd} geo={() => <sphereGeometry args={[0.04 * hs, 8, 8]} />} color={skin} pos={[sd * r * 0.95, -0.01, 0]} scale={[0.5, 1, 0.8]} hull={0.1} />
          ))}
          <P geo={() => <sphereGeometry args={[0.03 * hs, 8, 8]} />} color={skin} pos={[0, -0.025, r * 0.96]} hull={0.1} />
          <Face r={r} expr={expr} look={look} blink={blink} brow={body.hairStyle === "bald" ? "#3a2a20" : hairColor} mustache={body.mustache} glasses={body.glasses} shades={body.shades} />
          {armored && body.armor !== "ashigaru" && (
            <group>
              <P geo={() => <sphereGeometry args={[r * 1.18, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />} color="#14131a" pos={[0, 0.02, -0.01]} hull={0.04} />
              <P geo={() => <cylinderGeometry args={[r * 1.28, r * 1.7, 0.1, 12]} />} color="#14131a" pos={[0, -0.04, -0.06]} />
              <P geo={() => <boxGeometry args={[r * 1.5, 0.12, 0.14]} />} color="#2a2430" pos={[0, -r * 0.4, r * 0.72]} />
              {[-1, 1].map((sd) => (
                <mesh key={sd} position={[sd * 0.1, r * 1.35, r * 0.7]} rotation={[0, 0, -sd * 0.45]}>
                  <boxGeometry args={[0.035, 0.34, 0.02]} />
                  <meshStandardMaterial color="#d8a93a" metalness={0.9} roughness={0.25} emissive="#5a3d00" />
                </mesh>
              ))}
              {body.armor === "commander" && (
                <mesh position={[0, r * 1.45, r * 0.74]} rotation={[0, 0, Math.PI]}>
                  <torusGeometry args={[0.2, 0.022, 6, 18, Math.PI]} />
                  <meshStandardMaterial color="#d8a93a" metalness={0.9} roughness={0.25} emissive="#5a3d00" />
                </mesh>
              )}
            </group>
          )}
          {armored && body.armor === "ashigaru" && (
            <group>
              <P geo={() => <coneGeometry args={[r * 2.0, 0.2, 14]} />} color="#2b2a33" pos={[0, r * 0.95, 0]} hull={0.04} />
              <P geo={() => <boxGeometry args={[r * 1.4, 0.1, 0.12]} />} color="#2a2430" pos={[0, -r * 0.42, r * 0.7]} />
            </group>
          )}
          {/* hair */}
          {!armored && body.hairStyle === "short" && <P geo={() => <sphereGeometry args={[r * 1.05, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52]} />} color={hairColor} pos={[0, 0.012, -0.005]} hull={0.04} />}
          {!armored && body.hairStyle === "quiff" && (
            <>
              {/* side/back base, hairline high on forehead */}
              <P geo={() => <sphereGeometry args={[r * 1.04, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />} color={hairColor} pos={[0, 0.0, -0.05]} rot={[-0.62, 0, 0]} hull={0.04} />
              {/* big pompadour wave: rises from front hairline and sweeps back */}
              {[
                [0.0, 0.98, 0.5, 0.52, 0.5, -0.5],
                [0.0, 1.22, 0.3, 0.6, 0.55, -0.3],
                [0.0, 1.34, 0.0, 0.62, 0.55, -0.05],
                [0.0, 1.32, -0.34, 0.58, 0.5, 0.2],
                [0.0, 1.2, -0.66, 0.5, 0.42, 0.45],
                [0.0, 1.1, -0.92, 0.36, 0.32, 0.9],
              ].map(([x, y, z, rx, ry, tilt], k) => (
                <P key={k} geo={() => <sphereGeometry args={[r * 0.5, 12, 10]} />} color={hairColor} pos={[x, r * y - 0.03, r * z]} scale={[1.38 + (k === 4 ? 0.1 : 0), ry * 1.15, rx * 1.35]} rot={[tilt, 0, 0]} hull={0.05} />
              ))}
              {/* flick at the back */}
              <P geo={() => <coneGeometry args={[r * 0.3, r * 0.7, 6]} />} color={hairColor} pos={[0, r * 1.12, -r * 1.12]} rot={[-1.9, 0, 0]} hull={0.05} />
            </>
          )}
          {body.hairStyle === "messy" &&
            [0, 1, 2, 3, 4, 5, 6].map((i) => (
              <P key={i} geo={() => <coneGeometry args={[0.04 * hs, 0.14 * hs, 5]} />} color={hairColor} pos={[Math.cos(i * 0.9) * r * 0.55, r * 0.88 + (i % 2) * 0.02, Math.sin(i * 0.9) * r * 0.4 - 0.02]} rot={[Math.sin(i) * 0.5, 0, -Math.cos(i * 0.9) * 0.6]} hull={0.08} />
            ))}
          {body.hairStyle === "bun" && (
            <>
              <P geo={() => <sphereGeometry args={[r * 1.04, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />} color={hairColor} pos={[0, 0.012, -0.01]} hull={0.04} />
              <P geo={() => <sphereGeometry args={[r * 0.38, 10, 8]} />} color={hairColor} pos={[0, r * 1.02, -0.04]} />
            </>
          )}
          {body.hairStyle === "bald" &&
            [-1, 1].map((sd) => <P key={sd} geo={() => <sphereGeometry args={[0.05 * hs, 8, 8]} />} color={hairColor} pos={[sd * r * 0.93, 0.03, -0.02]} scale={[0.6, 1, 0.9]} hull={0.1} />)}
        </group>
        {children}
        <Arm side={-1} pose={pose.armL} shirt={body.shirt} skin={skin} slim={slim} sode={armored && body.armor !== "ashigaru"} accent={body.accent} />
        <Arm side={1} pose={pose.armR} shirt={body.shirt} skin={skin} slim={slim} sode={armored && body.armor !== "ashigaru"} accent={body.accent} />
        <group position={[0, -0.02, 0]}>
          <Leg side={-1} pose={lw} pants={body.pants} shoes={body.shoes ?? "#2a211c"} sarong={body.sarong} />
          <Leg side={1} pose={rw} pants={body.pants} shoes={body.shoes ?? "#2a211c"} sarong={body.sarong} />
        </group>
      </group>
      {shadow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} scale={[1, 0.8, 1]}>
          <circleGeometry args={[0.42, 20]} />
          <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Cat                                                                  */
/* ------------------------------------------------------------------ */
export const Cat3D: React.FC<{ position: Vec3; rotationY?: number; t: number; scale?: number; alert?: number; fur?: string; sit?: boolean; tailPhase?: number }> = ({ position, rotationY = 0, t, scale = 1, alert = 0, fur = "#f59e0b", sit = true, tailPhase = 0 }) => {
  const tail = useMemo(() => new Array(9).fill(0).map((_, i) => i), []);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={[0, 0.0, 0]}>
        <P geo={() => <sphereGeometry args={[0.26, 14, 12]} />} color={fur} pos={[0, 0.27, 0]} scale={[1, sit ? 1.1 : 0.8, sit ? 0.9 : 1.5]} />
        <P geo={() => <sphereGeometry args={[0.17, 14, 12]} />} color="#fde7c2" pos={[0, 0.2, 0.17]} scale={[0.8, 0.9, 0.5]} nohull />
        {[-1, 1].map((s) => (
          <P key={s} geo={() => <capsuleGeometry args={[0.045, 0.16, 4, 8]} />} color={fur} pos={[s * 0.11, 0.1, 0.2]} />
        ))}
        {/* head */}
        <group position={[0, 0.62, 0.1]} rotation={[0, Math.sin(t * 0.7) * 0.1 * (1 - alert), 0]}>
          <P geo={() => <sphereGeometry args={[0.19, 16, 12]} />} color={fur} scale={[1.05, 0.92, 0.95]} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <P geo={() => <coneGeometry args={[0.07, 0.14, 4]} />} color={fur} pos={[s * 0.11, 0.17, -0.01]} rot={[0, 0, -s * 0.25]} />
              <mesh position={[s * 0.075, 0.03, 0.15]} scale={[1, 1 + alert * 0.4, 0.5]}>
                <sphereGeometry args={[0.05, 12, 10]} />
                <meshBasicMaterial color="#ffe94d" />
              </mesh>
              <mesh position={[s * 0.075, 0.03, 0.175]} scale={[0.35, 1 + alert * 0.4, 0.4]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshBasicMaterial color={INK} />
              </mesh>
              <pointLight position={[s * 0.075, 0.03, 0.3]} intensity={0.6} distance={1.6} color="#ffe94d" />
            </group>
          ))}
          <mesh position={[0, -0.03, 0.18]}>
            <sphereGeometry args={[0.018, 6, 6]} />
            <meshBasicMaterial color="#f08a9a" />
          </mesh>
        </group>
        {/* tail */}
        {tail.map((i) => {
          const k = i / 8;
          const a = Math.sin(t * 2.2 + tailPhase - k * 2.4) * (0.25 + 0.5 * k);
          return <P key={i} geo={() => <sphereGeometry args={[0.055 - k * 0.012, 8, 8]} />} color={fur} pos={[Math.sin(a) * 0.3 * k * 1.4, 0.12 + k * 0.5, -0.24 - 0.12 * Math.sin(k * 2)]} hull={0.08} />;
        })}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Animation helpers                                                    */
/* ------------------------------------------------------------------ */
export const cl01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth3 = (x: number) => {
  const k = cl01(x);
  return k * k * (3 - 2 * k);
};
export const easeInOut3 = (x: number) => {
  const k = cl01(x);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};
export const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];

/** Poses that blend: pass a and b with k in 0..1 */
export const blendPose = (a: Pose3, b: Pose3, k: number): Pose3 => {
  const lp = (x?: number, y?: number) => lerpN(x ?? 0, y ?? 0, k);
  const arm = (p?: ArmPose, q?: ArmPose): ArmPose => ({ swing: lp(p?.swing, q?.swing), out: lerpN(p?.out ?? 0.12, q?.out ?? 0.12, k), elbow: lerpN(p?.elbow ?? 0.15, q?.elbow ?? 0.15, k) });
  const leg = (p?: LegPose, q?: LegPose): LegPose => ({ swing: lp(p?.swing, q?.swing), out: lerpN(p?.out ?? 0.03, q?.out ?? 0.03, k), knee: lp(p?.knee, q?.knee) });
  return { bob: lp(a.bob, b.bob), lean: lp(a.lean, b.lean), twist: lp(a.twist, b.twist), sway: lp(a.sway, b.sway), squash: lp(a.squash, b.squash), head: [lp(a.head?.[0], b.head?.[0]), lp(a.head?.[1], b.head?.[1]), lp(a.head?.[2], b.head?.[2])], armL: arm(a.armL, b.armL), armR: arm(a.armR, b.armR), legL: leg(a.legL, b.legL), legR: leg(a.legR, b.legR) };
};

/**
 * Walk cycle, forward-facing character. `phase` in cycles.
 * "walk" normal gait, "tiptoe" short high-knee steps with arms out for balance, "sneak" low and slow.
 */
export const walk3 = (phase: number, mode: "walk" | "tiptoe" | "sneak" = "walk"): Pose3 => {
  const ph = phase * Math.PI * 2;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  const A = mode === "walk" ? 0.6 : mode === "tiptoe" ? 0.34 : 0.45;
  const K = mode === "walk" ? 0.9 : mode === "tiptoe" ? 1.15 : 1.0;
  const liftL = Math.max(0, c);
  const liftR = Math.max(0, -c);
  const armS = mode === "walk" ? 0.5 : 0.1;
  const out = mode === "walk" ? 0.12 : 0.9;
  return {
    bob: (mode === "tiptoe" ? 0.03 : 0.02) * Math.abs(s) + (mode === "tiptoe" ? 0.04 : 0) - (mode === "sneak" ? 0.1 : 0),
    lean: mode === "walk" ? 0.08 : mode === "sneak" ? 0.28 : 0.1,
    sway: s * 0.045,
    twist: s * 0.12,
    squash: Math.abs(s) * 0.15,
    legL: { swing: A * s, knee: K * liftL * 0.9 + (mode === "sneak" ? 0.35 : 0) },
    legR: { swing: -A * s, knee: K * liftR * 0.9 + (mode === "sneak" ? 0.35 : 0) },
    armL: { swing: -armS * s, out: out, elbow: mode === "walk" ? 0.35 : 0.5 },
    armR: { swing: armS * s, out: out, elbow: mode === "walk" ? 0.35 : 0.5 },
    head: [0.02, Math.sin(ph * 0.5) * 0.06, 0],
  };
};

export const idle3 = (t: number, seed = 0): Pose3 => ({
  bob: 0,
  lean: 0.02 + Math.sin(t * 2.4 + seed) * 0.01,
  sway: Math.sin(t * 0.9 + seed) * 0.015,
  armL: { swing: 0.02 * Math.sin(t * 2.4 + seed), out: 0.1, elbow: 0.12 },
  armR: { swing: -0.02 * Math.sin(t * 2.4 + seed), out: 0.1, elbow: 0.12 },
  legL: { swing: 0, knee: 0 },
  legR: { swing: 0, knee: 0 },
  head: [0, Math.sin(t * 0.6 + seed) * 0.05, 0],
});

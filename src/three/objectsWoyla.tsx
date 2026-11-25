// 3D Assets & Hollywood Climax VFX for "Operasi Woyla 1981: 3 Menit di Don Mueang"
// Reuses heroic organic rig (objectsHero.tsx) + toon/X-ray shaders (toon.tsx).
import React from "react";
import * as THREE from "three";
import { BlueGrid, CanvasPlane, G, Limb, T, Vec3, XR } from "./toon";
import { Hero, HeroP, heroHand } from "./objectsHero";

const HIP_Y = 0.95;

/** World-space position of Hero's left or right hand (matches Hero torso lean/turn + group transform). */
export const heroHandWorld = (
  p: HeroP,
  side: "L" | "R",
  position: Vec3 = [0, 0, 0],
  rotY = 0,
  scale = 1
): Vec3 => {
  const local = heroHand(p, side);
  const v = new THREE.Vector3(local[0], local[1] - HIP_Y, local[2]);
  v.applyEuler(new THREE.Euler(p.lean ?? 0, p.turn ?? 0, 0, "XYZ"));
  v.y += HIP_Y;
  v.multiplyScalar(scale);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  return [position[0] + v.x, position[1] + v.y, position[2] + v.z];
};

/* ============================================================================
   1. TACTICAL GEAR & SEPARATE 3D HAND PROPS (1981 KOPASSANDHA & GARUDA)
   ============================================================================ */

export const BaretMerah: React.FC<{ position?: Vec3; scale?: number }> = ({
  position = [0, 1.77, 0.0],
  scale = 1,
}) => (
  <group position={position} scale={scale}>
    <T g={G.cyl(0.118, 0.115, 0.036, 18)} c="#181416" position={[0, -0.012, 0]} o={2} />
    <T
      g={G.sph(0.135, 18, 12)}
      c="#a8141e"
      position={[0.028, 0.036, -0.005]}
      rotation={[0.05, 0, -0.34]}
      scale={[1.08, 0.56, 1.02]}
    />
    <T g={G.cyl(0.022, 0.022, 0.008, 12)} c="#eab308" position={[-0.045, 0.03, 0.112]} rotation={[Math.PI / 2, 0, 0]} o={false} />
    <T g={G.sph(0.011, 8, 6)} c="#fef08a" position={[-0.045, 0.03, 0.118]} o={false} />
  </group>
);

export const CommandoGear: React.FC<{
  team?: "merah" | "biru" | "hijau" | "komandan";
  beret?: boolean;
  nightCap?: boolean;
}> = ({ team = "merah", beret = false, nightCap = false }) => {
  const teamCol =
    team === "merah" ? "#ef4444" : team === "biru" ? "#3b82f6" : team === "hijau" ? "#22c55e" : "#eab308";
  return (
    <group>
      <T g={G.rbox(0.42, 0.38, 0.25, 0.25)} c="#1e2420" position={[0, 1.25, 0.01]} />
      {[-0.11, 0, 0.11].map((x, i) => (
        <T key={i} g={G.rbox(0.075, 0.13, 0.055, 0.2)} c="#2b332c" position={[x, 1.18, 0.145]} o={2} />
      ))}
      {[-1, 1].map((s) => (
        <T key={s} g={G.box(0.065, 0.035, 0.24)} c="#181e1a" position={[s * 0.14, 1.45, 0.0]} o={2} />
      ))}
      <T g={G.box(0.085, 0.04, 0.016)} c={teamCol} emissive={teamCol} ei={0.35} position={[-0.11, 1.35, 0.138]} o={false} />
      <T g={G.rbox(0.16, 0.22, 0.08, 0.2)} c="#242a25" position={[0.04, 1.28, -0.155]} />
      <Limb a={[0.1, 1.38, -0.16]} b={[0.14, 1.88, -0.19]} r={0.006} c="#141816" o={false} />
      <T g={G.tor(0.118, 0.012, 8, 20)} c="#1b1f24" position={[0, 1.69, -0.01]} rotation={[0, 0, 0]} o={false} />
      {[-1, 1].map((s) => (
        <T key={s} g={G.cyl(0.036, 0.036, 0.028, 12)} c="#1f2429" position={[s * 0.115, 1.66, 0]} rotation={[0, 0, Math.PI / 2]} o={2} />
      ))}
      <Limb a={[-0.115, 1.64, 0.02]} b={[-0.03, 1.6, 0.12]} r={0.006} c="#262a30" o={false} />
      <T g={G.sph(0.014, 8, 6)} c="#14161a" position={[-0.024, 1.6, 0.125]} o={false} />
      {beret ? <BaretMerah /> : null}
      {nightCap ? (
        <group position={[0, 1.74, 0.0]}>
          <T g={G.sph(0.126, 16, 10)} c="#1c2420" position={[0, 0.015, 0]} scale={[1, 0.72, 1.04]} />
          <T g={G.rbox(0.15, 0.016, 0.11, 0.25)} c="#161c19" position={[0, -0.012, 0.105]} rotation={[0.15, 0, 0]} />
        </group>
      ) : null}
    </group>
  );
};

export const MP5Gun: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  muzzleFlash?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, muzzleFlash = 0 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.055, 0.075, 0.36, 0.2)} c="#1e2228" position={[0, 0.03, 0.1]} />
    <T g={G.cyl(0.018, 0.018, 0.34, 10)} c="#2b3038" position={[0, 0.074, 0.16]} rotation={[Math.PI / 2, 0, 0]} o={2} />
    <T g={G.rbox(0.052, 0.06, 0.18, 0.25)} c="#16181c" position={[0, 0.025, 0.29]} />
    <T g={G.cyl(0.012, 0.012, 0.14, 10)} c="#30363e" position={[0, 0.048, 0.41]} rotation={[Math.PI / 2, 0, 0]} o={2} />
    <T g={G.tor(0.016, 0.004, 6, 12)} c="#1f2328" position={[0, 0.076, 0.42]} o={false} />
    <T g={G.rbox(0.028, 0.19, 0.048, 0.15)} c="#1b1f24" position={[0, -0.075, 0.175]} rotation={[0.28, 0, 0]} o={2} />
    <T g={G.rbox(0.038, 0.11, 0.048, 0.2)} c="#14171c" position={[0, -0.048, 0.01]} rotation={[-0.28, 0, 0]} o={2} />
    <T g={G.box(0.042, 0.095, 0.022)} c="#16181c" position={[0, 0.015, -0.18]} o={2} />
    {[-0.02, 0.02].map((x, i) => (
      <T key={i} g={G.cyl(0.006, 0.006, 0.18, 6)} c="#3a404a" position={[x, 0.032, -0.09]} rotation={[Math.PI / 2, 0, 0]} o={false} />
    ))}
    {muzzleFlash > 0.05 ? (
      <group position={[0, 0.048, 0.52]} scale={0.7 + muzzleFlash * 0.7}>
        <T g={G.cone(0.09, 0.28, 8)} c="#fef08a" emissive="#fb923c" ei={2.2} rotation={[Math.PI / 2, 0, 0]} o={false} />
        <T g={G.sph(0.065, 10, 8)} c="#ffffff" emissive="#fef9c3" ei={3.0} position={[0, 0, -0.04]} o={false} />
      </group>
    ) : null}
  </group>
);

export const Flashbang3D: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  pinPull?: number;
  glow?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, pinPull = 0, glow = 0 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.cyl(0.034, 0.034, 0.125, 6)} c="#374151" emissive="#38bdf8" ei={glow * 1.4} />
    <T g={G.cyl(0.037, 0.037, 0.016, 12)} c="#1f2937" position={[0, 0.064, 0]} o={2} />
    <T g={G.cyl(0.037, 0.037, 0.016, 12)} c="#1f2937" position={[0, -0.064, 0]} o={2} />
    <T g={G.cyl(0.036, 0.036, 0.022, 12)} c="#93c5fd" emissive="#60a5fa" ei={0.6 + glow * 2.5} position={[0, 0.022, 0]} o={false} />
    <T g={G.cyl(0.036, 0.036, 0.022, 12)} c="#93c5fd" emissive="#60a5fa" ei={0.6 + glow * 2.5} position={[0, -0.022, 0]} o={false} />
    <T g={G.cyl(0.016, 0.02, 0.035, 10)} c="#d4a336" position={[0, 0.088, 0]} o={2} />
    <T g={G.box(0.016, 0.095, 0.01)} c="#4b5563" position={[0.038, 0.04, 0]} rotation={[0, 0, -0.14 - pinPull * 0.6]} o={false} />
    <group position={[-0.032 - pinPull * 0.14, 0.092 + pinPull * 0.04, 0]} rotation={[0, 0, pinPull * 0.9]}>
      <T g={G.tor(0.018, 0.004, 8, 16)} c="#facc15" emissive="#facc15" ei={0.45} o={false} />
    </group>
  </group>
);

export const RadioHT3D: React.FC<{ position?: Vec3; rotation?: Vec3; active?: boolean }> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  active = true,
}) => (
  <group position={position} rotation={rotation}>
    <T g={G.rbox(0.072, 0.175, 0.048, 0.18)} c="#262e28" />
    <T g={G.box(0.052, 0.065, 0.008)} c="#141a16" position={[0, 0.032, 0.025]} o={false} />
    <T g={G.sph(0.008, 8, 6)} c={active ? "#ef4444" : "#451a1a"} emissive="#ef4444" ei={active ? 1.8 : 0} position={[0.02, 0.075, 0.025]} o={false} />
    <T g={G.cyl(0.005, 0.007, 0.24, 6)} c="#141816" position={[-0.02, 0.2, 0]} o={false} />
  </group>
);

export const Pistol3D: React.FC<{ position?: Vec3; rotation?: Vec3; muzzleFlash?: number }> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  muzzleFlash = 0,
}) => (
  <group position={position} rotation={rotation}>
    <T g={G.rbox(0.032, 0.044, 0.2, 0.15)} c="#23262c" position={[0, 0.035, 0.06]} />
    <T g={G.rbox(0.03, 0.1, 0.042, 0.2)} c="#16181d" position={[0, -0.025, -0.01]} rotation={[-0.25, 0, 0]} o={2} />
    {muzzleFlash > 0.05 ? (
      <T g={G.sph(0.055, 8, 8)} c="#fde047" emissive="#f97316" ei={2.4} position={[0, 0.038, 0.2]} o={false} />
    ) : null}
  </group>
);

export const BintangSakti3D: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(0.14, 0.22, 0.02)} c="#b91c1c" position={[0, 0.18, 0]} />
    <T g={G.box(0.03, 0.22, 0.024)} c="#facc15" position={[0, 0.18, 0.002]} o={false} />
    <T g={G.cyl(0.11, 0.11, 0.025, 7)} c="#eab308" emissive="#ca8a04" ei={0.45} rotation={[Math.PI / 2, 0, 0]} />
    <T g={G.cyl(0.065, 0.065, 0.032, 16)} c="#fef08a" emissive="#facc15" ei={0.6} rotation={[Math.PI / 2, 0, 0]} o={false} />
  </group>
);

export const WoylaActor: React.FC<{
  p: HeroP;
  role: "sintong" | "merah" | "biru" | "hijau" | "pilot" | "pembajak" | "sandera";
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  beret?: boolean;
  children?: React.ReactNode;
}> = ({ p, role, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, beret = false, children }) => (
  <Hero p={p} position={position} rotation={rotation} scale={scale}>
    {role === "sintong" ? <CommandoGear team="komandan" beret={beret} nightCap={!beret} /> : null}
    {role === "merah" ? <CommandoGear team="merah" nightCap /> : null}
    {role === "biru" ? <CommandoGear team="biru" nightCap /> : null}
    {role === "hijau" ? <CommandoGear team="hijau" nightCap /> : null}
    {role === "pilot" ? (
      <group>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.175, 1.465, 0]}>
            <T g={G.box(0.095, 0.02, 0.055)} c="#0f172a" o={2} />
            <T g={G.box(0.075, 0.024, 0.012)} c="#eab308" position={[0, 0.002, 0.01]} o={false} />
            <T g={G.box(0.075, 0.024, 0.012)} c="#eab308" position={[0, 0.002, -0.01]} o={false} />
          </group>
        ))}
        <T g={G.box(0.034, 0.28, 0.018)} c="#0f172a" position={[0, 1.29, 0.148]} o={2} />
        <T g={G.cyl(0.022, 0.022, 0.01, 10)} c="#facc15" position={[0, 1.775, 0.12]} rotation={[Math.PI / 2, 0, 0]} o={false} />
      </group>
    ) : null}
    {children}
  </Hero>
);

/* ============================================================================
   2. HERO AIRCRAFT: MCDONNELL DOUGLAS DC-9-32 "WOYLA" (PK-GNJ) — 1981 LIVERY
   ============================================================================ */

export const GarudaDC9Woyla: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  wingDoorL?: number;
  wingDoorR?: number;
  frontDoor?: number;
  rearStair?: number;
  strobe?: number;
  cabinFlash?: number;
}> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  wingDoorL = 0,
  wingDoorR = 0,
  frontDoor = 0,
  rearStair = 0,
  strobe = 0,
  cabinFlash = 0,
}) => {
  const winGlow = cabinFlash > 0.05 ? "#e0f2fe" : "#fef08a";
  const winEi = cabinFlash > 0.05 ? 3.5 * cabinFlash : 0.42;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={[0, 2.65, 0]}>
        <T g={G.cyl(1.42, 1.42, 13.6, 24)} c="#f3f5f8" rotation={[Math.PI / 2, 0, 0]} />
        <T g={G.cyl(1.43, 1.43, 13.5, 24)} c="#9aa6b5" position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.96, 1, 0.72]} o={false} />

        {[-1, 1].map((s) => (
          <group key={s}>
            <T g={G.box(0.06, 0.24, 13.6)} c="#dc2626" position={[s * 1.41, 0.05, 0]} o={false} />
            <T g={G.box(0.06, 0.14, 13.6)} c="#f97316" position={[s * 1.415, -0.13, 0]} o={false} />
            <CanvasPlane
              w={6.4}
              h={0.55}
              px={640}
              drawKey="garuda-woyla-title-v2"
              position={[s * 1.435, 0.58, 1.6]}
              rotation={[0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
              o={false}
              draw={(ctx, w, h) => {
                ctx.fillStyle = "#f3f5f8";
                ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = "#b91c1c";
                ctx.font = "900 34px Inter, sans-serif";
                ctx.fillText("GARUDA INDONESIAN AIRWAYS", 12, 34);
                ctx.fillStyle = "#1e293b";
                ctx.font = "800 18px Inter, sans-serif";
                ctx.fillText("DC-9  ·  PK-GNJ  ·  WOYLA", 16, 54);
              }}
            />
          </group>
        ))}

        <T g={G.cyl(0.55, 1.42, 3.1, 24)} c="#f3f5f8" position={[0, -0.06, 8.35]} rotation={[Math.PI / 2, 0, 0]} />
        <T g={G.sph(0.58, 18, 14)} c="#1e2430" position={[0, -0.14, 9.85]} scale={[0.95, 0.85, 1.35]} />
        <T
          g={G.box(1.38, 0.42, 0.72)}
          c="#111827"
          emissive={cabinFlash > 0.1 ? "#ffffff" : "#f59e0b"}
          ei={cabinFlash > 0.1 ? 2.5 : 0.35}
          position={[0, 0.56, 7.65]}
          rotation={[0.35, 0, 0]}
        />
        <T g={G.box(0.08, 0.44, 0.76)} c="#e5e7eb" position={[0, 0.57, 7.72]} rotation={[0.35, 0, 0]} o={false} />

        <T g={G.cyl(1.42, 0.48, 3.8, 22)} c="#f3f5f8" position={[0, 0.12, -8.65]} rotation={[Math.PI / 2, 0, 0]} />
        <group position={[0, 1.95, -8.25]}>
          <T g={G.rbox(0.28, 3.7, 2.8, 0.12)} c="#f3f5f8" rotation={[-0.38, 0, 0]} />
          <T g={G.box(0.32, 3.55, 0.92)} c="#dc2626" position={[0, 0.02, -0.1]} rotation={[-0.38, 0, 0]} o={false} />
          <T g={G.box(0.33, 3.55, 0.52)} c="#f97316" position={[0, 0.02, 0.52]} rotation={[-0.38, 0, 0]} o={false} />
          <T g={G.rbox(6.2, 0.18, 1.35, 0.18)} c="#e2e8f0" position={[0, 1.75, -0.72]} />
          <T g={G.sph(0.14, 10, 8)} c="#ef4444" emissive="#ef4444" ei={0.6 + strobe * 3.0} position={[0, 1.95, -0.9]} o={false} />
        </group>

        {[-1, 1].map((s) => (
          <group key={s} position={[s * 1.88, 0.35, -6.15]}>
            <T g={G.box(0.68, 0.22, 1.25)} c="#cbd5e1" position={[-s * 0.36, -0.05, 0]} />
            <T g={G.cyl(0.56, 0.5, 3.5, 18)} c="#d8dee8" rotation={[Math.PI / 2, 0, 0]} />
            <T g={G.tor(0.54, 0.06, 8, 18)} c="#94a3b8" position={[0, 0, 1.74]} />
            <T g={G.cyl(0.46, 0.46, 0.1, 16)} c="#111827" position={[0, 0, 1.72]} rotation={[Math.PI / 2, 0, 0]} o={false} />
            <T g={G.cyl(0.42, 0.36, 0.55, 16)} c="#334155" position={[0, 0, -1.85]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        ))}

        {[-1, 1].map((s) => (
          <group key={s} position={[s * 1.2, -0.68, -0.25]}>
            <T
              g={G.rbox(7.8, 0.26, 2.75, 0.16)}
              c="#e2e8f0"
              position={[s * 3.65, 0.08, -1.05]}
              rotation={[0, -s * 0.34, s * 0.05]}
            />
            <T
              g={G.box(6.4, 0.08, 0.55)}
              c="#94a3b8"
              position={[s * 3.25, 0.2, -1.95]}
              rotation={[0, -s * 0.34, s * 0.05]}
              o={false}
            />
            <T
              g={G.sph(0.13, 10, 8)}
              c={s < 0 ? "#ef4444" : "#22c55e"}
              emissive={s < 0 ? "#ef4444" : "#22c55e"}
              ei={1.6 + strobe * 1.4}
              position={[s * 7.35, 0.32, -2.35]}
              o={false}
            />
          </group>
        ))}

        {[-1, 1].map((s) =>
          Array.from({ length: 14 }).map((_, i) => (
            <T
              key={`${s}-${i}`}
              g={G.box(0.08, 0.24, 0.18)}
              c={winGlow}
              emissive={winGlow}
              ei={winEi}
              position={[s * 1.425, 0.14, 5.1 - i * 0.72]}
              o={false}
            />
          ))
        )}

        {[
          [-1, wingDoorL, "#ef4444"],
          [1, wingDoorR, "#3b82f6"],
        ].map(([s, open, col], idx) => (
          <group
            key={idx}
            position={[(s as number) * 1.43, 0.05, 0.15]}
            rotation={[0, 0, (s as number) * -(open as number) * 1.35]}
          >
            <T g={G.box(0.1, 0.95, 0.62)} c="#f8fafc" o={2} />
            <T g={G.box(0.12, 0.95, 0.06)} c={col as string} emissive={col as string} ei={0.35} position={[0, 0, 0.3]} o={false} />
            <T g={G.box(0.12, 0.95, 0.06)} c={col as string} emissive={col as string} ei={0.35} position={[0, 0, -0.3]} o={false} />
          </group>
        ))}

        <group position={[-1.44, 0.02, 5.85]} rotation={[0, -frontDoor * 1.45, 0]}>
          <T g={G.box(0.1, 1.45, 0.85)} c="#f1f5f9" position={[0, 0, -0.4]} />
        </group>

        <group position={[0, -0.78, -8.55]} rotation={[0.55 + rearStair * 0.35, 0, 0]}>
          {rearStair > 0.02 ? (
            <group scale={[1, rearStair, 1]}>
              <T g={G.box(1.15, 2.8, 0.14)} c="#64748b" position={[0, -1.35, 0]} />
              {Array.from({ length: 7 }).map((_, i) => (
                <T key={i} g={G.box(1.02, 0.08, 0.24)} c="#94a3b8" position={[0, -0.35 - i * 0.36, 0.12]} o={false} />
              ))}
              {[-0.55, 0.55].map((x) => (
                <Limb key={x} a={[x, 0, 0.25]} b={[x, -2.6, 0.25]} r={0.025} c="#cbd5e1" o={false} />
              ))}
            </group>
          ) : null}
        </group>

        <group position={[0, -1.85, 6.45]}>
          <T g={G.cyl(0.09, 0.08, 1.55, 10)} c="#94a3b8" />
          {[-0.22, 0.22].map((x) => (
            <T key={x} g={G.cyl(0.36, 0.36, 0.18, 16)} c="#1e293b" position={[x, -0.62, 0]} rotation={[0, 0, Math.PI / 2]} />
          ))}
          <T g={G.sph(0.11, 8, 8)} c="#fef9c3" emissive="#fef08a" ei={2.2} position={[0, -0.15, 0.14]} o={false} />
        </group>
        {[-1.95, 1.95].map((x) => (
          <group key={x} position={[x, -1.82, -0.55]}>
            <T g={G.cyl(0.11, 0.1, 1.65, 10)} c="#94a3b8" />
            {[-0.28, 0.28].map((dx) => (
              <T key={dx} g={G.cyl(0.46, 0.46, 0.24, 16)} c="#1e293b" position={[dx, -0.56, 0]} rotation={[0, 0, Math.PI / 2]} />
            ))}
          </group>
        ))}
      </group>
    </group>
  );
};

/* ============================================================================
   3. HOLOGRAM X-RAY TACTICAL BLUEPRINT DC-9 (3-TEAM ASSAULT PLAN!)
   ============================================================================ */

export const WoylaHologramDC9: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  pulse?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, pulse = 0 }) => {
  const sGlow = 0.85 + Math.sin(pulse * Math.PI * 2) * 0.25;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <T g={G.cyl(1.45, 1.55, 0.08, 28)} c="#0f172a" position={[0, 0.04, 0]} />
      <T g={G.tor(1.38, 0.025, 8, 32)} c="#38bdf8" emissive="#38bdf8" ei={1.8} position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} o={false} />
      <group position={[0, 0.58 + Math.sin(pulse * Math.PI * 2) * 0.04, 0]} scale={0.145}>
        <XR g={G.cyl(1.42, 1.42, 13.6, 18)} rotation={[Math.PI / 2, 0, 0]} color="#38bdf8" />
        <XR g={G.cyl(0.55, 1.42, 3.1, 16)} position={[0, -0.06, 8.35]} rotation={[Math.PI / 2, 0, 0]} color="#38bdf8" />
        <XR g={G.cyl(1.42, 0.48, 3.8, 16)} position={[0, 0.12, -8.65]} rotation={[Math.PI / 2, 0, 0]} color="#38bdf8" />
        <XR g={G.rbox(0.28, 3.7, 2.8, 0.1)} position={[0, 1.95, -8.25]} rotation={[-0.38, 0, 0]} color="#38bdf8" />
        <XR g={G.rbox(6.2, 0.18, 1.35, 0.1)} position={[0, 3.7, -8.97]} color="#38bdf8" />
        {[-1, 1].map((s) => (
          <XR
            key={s}
            g={G.rbox(7.8, 0.26, 2.75, 0.1)}
            position={[s * 4.85, -0.6, -1.3]}
            rotation={[0, -s * 0.34, s * 0.05]}
            color="#38bdf8"
          />
        ))}
        <group position={[-5.2, 1.2, 0.3]} scale={sGlow}>
          <T g={G.cyl(0.22, 0.22, 3.6, 10)} c="#ef4444" emissive="#ef4444" ei={2.2} rotation={[0, 0, Math.PI / 2]} o={false} />
          <T g={G.cone(0.65, 1.25, 10)} c="#ef4444" emissive="#ef4444" ei={2.5} position={[2.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]} o={false} />
        </group>
        <group position={[5.2, 1.2, 0.3]} scale={sGlow}>
          <T g={G.cyl(0.22, 0.22, 3.6, 10)} c="#3b82f6" emissive="#3b82f6" ei={2.2} rotation={[0, 0, Math.PI / 2]} o={false} />
          <T g={G.cone(0.65, 1.25, 10)} c="#3b82f6" emissive="#3b82f6" ei={2.5} position={[-2.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} o={false} />
        </group>
        <group position={[0, -0.6, -13.2]} scale={sGlow}>
          <T g={G.cyl(0.22, 0.22, 3.8, 10)} c="#22c55e" emissive="#22c55e" ei={2.2} rotation={[Math.PI / 2, 0, 0]} o={false} />
          <T g={G.cone(0.65, 1.25, 10)} c="#22c55e" emissive="#22c55e" ei={2.5} position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]} o={false} />
        </group>
      </group>
    </group>
  );
};

/* ============================================================================
   4. FULL 360° 3D ENVIRONMENTS (APRON DON MUEANG · BRIEFING ROOM · DC-9 CABIN)
   ============================================================================ */

export const DonMueangApron: React.FC<{
  searchlightPhase?: number;
  beaconPhase?: number;
}> = ({ searchlightPhase = 0, beaconPhase = 0 }) => {
  const sweepA = Math.sin(searchlightPhase * Math.PI * 2) * 0.45;
  const sweepB = Math.cos(searchlightPhase * Math.PI * 2) * 0.4;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshToonMaterial color="#18202c" />
      </mesh>
      <T g={G.box(0.22, 0.02, 54)} c="#eab308" position={[0, 0.015, 0]} o={false} />
      <T g={G.box(22, 0.02, 0.22)} c="#eab308" position={[0, 0.015, 10]} o={false} />
      <T g={G.box(22, 0.02, 0.22)} c="#eab308" position={[0, 0.015, -12]} o={false} />
      {Array.from({ length: 12 }).map((_, i) => (
        <React.Fragment key={i}>
          <T g={G.sph(0.16, 8, 6)} c="#38bdf8" emissive="#38bdf8" ei={2.2} position={[-14.5, 0.18, -24 + i * 4.6]} o={false} />
          <T g={G.sph(0.16, 8, 6)} c="#f59e0b" emissive="#f59e0b" ei={2.0} position={[14.5, 0.18, -24 + i * 4.6]} o={false} />
        </React.Fragment>
      ))}
      <group position={[18, 0, -28]}>
        <T g={G.box(4.8, 12, 4.8)} c="#263142" position={[0, 6, 0]} />
        <T g={G.cyl(4.2, 3.2, 2.8, 8)} c="#1e293b" position={[0, 13.4, 0]} />
        <T g={G.cyl(4.0, 3.6, 1.4, 8)} c="#4ade80" emissive="#22c55e" ei={0.85} position={[0, 13.5, 0]} o={false} />
        <T g={G.cyl(4.4, 4.4, 0.5, 8)} c="#334155" position={[0, 14.9, 0]} />
        <group position={[0, 16.0, 0]} rotation={[0, searchlightPhase * Math.PI * 4, 0]}>
          <T g={G.box(2.4, 0.45, 0.22)} c="#cbd5e1" />
          <T g={G.sph(0.22, 8, 8)} c="#ef4444" emissive="#ef4444" ei={2.4} position={[0, 0.55, 0]} o={false} />
        </group>
      </group>
      {[-22, -6].map((x, idx) => (
        <group key={idx} position={[x, 0, -34]}>
          <T g={G.box(13, 6.2, 7.5)} c="#1f2937" position={[0, 3.1, 0]} />
          <T g={G.box(13.4, 0.6, 7.8)} c="#334155" position={[0, 6.4, 0]} />
          {[-4, 0, 4].map((wx) => (
            <T key={wx} g={G.box(2.2, 1.3, 0.12)} c="#fbbf24" emissive="#f59e0b" ei={0.65} position={[wx, 3.8, 3.8]} o={false} />
          ))}
        </group>
      ))}
      {[
        [-17, -18, sweepA],
        [17, -16, sweepB],
      ].map(([x, z, sw], idx) => (
        <group key={idx} position={[x as number, 0, z as number]}>
          <T g={G.cyl(0.22, 0.34, 15, 8)} c="#334155" position={[0, 7.5, 0]} />
          <T g={G.box(2.2, 0.65, 0.45)} c="#e2e8f0" emissive="#fef08a" ei={1.8} position={[0, 15.1, 0]} />
          <group position={[0, 14.8, 0]} rotation={[0.58, (sw as number) + (idx === 0 ? 0.45 : -0.45), 0]}>
            <mesh position={[0, -9.5, 0]}>
              <coneGeometry args={[4.4, 19, 16, 1, true]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0.075} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        </group>
      ))}
      {[-13.5, 13.5].map((x, idx) => {
        const flash = Math.sin((beaconPhase + idx * 0.5) * Math.PI * 6) > 0;
        return (
          <group key={idx} position={[x, 0, 11]} rotation={[0, idx === 0 ? 0.55 : -0.55, 0]}>
            <T g={G.rbox(1.9, 0.85, 3.9, 0.2)} c="#1e293b" position={[0, 0.72, 0]} />
            <T g={G.rbox(1.72, 0.72, 2.0, 0.2)} c="#334155" position={[0, 1.42, -0.25]} />
            <T g={G.sph(0.15, 8, 6)} c="#ef4444" emissive="#ef4444" ei={flash ? 3.2 : 0.2} position={[-0.35, 1.88, -0.1]} o={false} />
            <T g={G.sph(0.15, 8, 6)} c="#3b82f6" emissive="#3b82f6" ei={flash ? 0.2 : 3.2} position={[0.35, 1.88, -0.1]} o={false} />
            {[-0.85, 0.85].map((wx) =>
              [-1.2, 1.2].map((wz) => (
                <T key={`${wx}-${wz}`} g={G.cyl(0.35, 0.35, 0.22, 12)} c="#0f172a" position={[wx, 0.35, wz]} rotation={[0, 0, Math.PI / 2]} />
              ))
            )}
          </group>
        );
      })}
    </group>
  );
};

export const BriefingRoom1981: React.FC<{ pulse?: number }> = ({ pulse = 0 }) => (
  <group>
    <BlueGrid size={36} y={0.01} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[18, 18]} />
      <meshToonMaterial color="#101824" />
    </mesh>
    <T g={G.box(14, 5.2, 0.3)} c="#172030" position={[0, 2.6, -4.4]} />
    <T g={G.box(0.3, 5.2, 11)} c="#141c2b" position={[-6.8, 2.6, 0.8]} />
    <T g={G.box(0.3, 5.2, 11)} c="#141c2b" position={[6.8, 2.6, 0.8]} />
    <CanvasPlane
      w={5.4}
      h={2.4}
      px={760}
      drawKey="woyla-route-map"
      position={[0, 2.65, -4.2]}
      draw={(ctx, w, h) => {
        ctx.fillStyle = "#0b1320";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.strokeStyle = "rgba(56,189,248,0.18)";
        ctx.lineWidth = 1.5;
        for (let x = 40; x < w; x += 48) {
          ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, h - 10); ctx.stroke();
        }
        for (let y = 40; y < h; y += 48) {
          ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(w - 10, y); ctx.stroke();
        }
        ctx.fillStyle = "#38bdf8";
        ctx.font = "900 28px Inter, sans-serif";
        ctx.fillText("OPERASI WOYLA · GA-206 · 31 MARET 1981", 28, 46);
        const pts: [number, number, string][] = [
          [95, 275, "JAKARTA"],
          [240, 222, "PALEMBANG"],
          [395, 165, "PENANG"],
          [535, 108, "BANGKOK (DON MUEANG)"],
        ];
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
        ctx.stroke();
        ctx.setLineDash([]);
        pts.forEach(([px, py, lbl], i) => {
          ctx.fillStyle = i === 3 ? "#ef4444" : "#facc15";
          ctx.beginPath();
          ctx.arc(px, py, i === 3 ? 11 : 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f8fafc";
          ctx.font = "800 17px Inter, sans-serif";
          ctx.fillText(lbl, i === 3 ? px - 95 : px - 34, py + 28);
        });
        ctx.fillStyle = "rgba(15,23,42,0.85)";
        ctx.fillRect(28, 66, 260, 106);
        ctx.fillStyle = "#ef4444"; ctx.font = "800 18px Inter, sans-serif"; ctx.fillText("● TIM MERAH : Sayap Kiri", 42, 94);
        ctx.fillStyle = "#3b82f6"; ctx.fillText("● TIM BIRU   : Sayap Kanan", 42, 124);
        ctx.fillStyle = "#22c55e"; ctx.fillText("● TIM HIJAU  : Pintu Belakang", 42, 154);
      }}
    />
    <group position={[0, 0, 0.2]}>
      <T g={G.rbox(3.4, 0.16, 2.2, 0.12)} c="#1e293b" position={[0, 0.92, 0]} />
      {[-1.45, 1.45].map((x) =>
        [-0.85, 0.85].map((z) => <T key={`${x}-${z}`} g={G.cyl(0.06, 0.06, 0.9, 8)} c="#334155" position={[x, 0.45, z]} />)
      )}
      <WoylaHologramDC9 position={[0, 1.0, 0]} rotation={[0, pulse * Math.PI * 0.4, 0]} scale={0.9} pulse={pulse} />
    </group>
    <group position={[-4.2, 0, -2.5]}>
      <T g={G.rbox(1.4, 2.1, 0.85, 0.1)} c="#1f2937" position={[0, 1.05, 0]} />
      {[0.65, 1.1, 1.55].map((y, i) => (
        <React.Fragment key={i}>
          <T g={G.box(1.1, 0.28, 0.06)} c="#0f172a" position={[0, y, 0.44]} o={false} />
          <T g={G.sph(0.04, 8, 6)} c={i % 2 === 0 ? "#22c55e" : "#f59e0b"} emissive={i % 2 === 0 ? "#22c55e" : "#f59e0b"} ei={1.8} position={[0.38, y, 0.48]} o={false} />
        </React.Fragment>
      ))}
    </group>
    <group position={[4.1, 0, -2.2]}>
      <T g={G.rbox(1.5, 0.72, 0.82, 0.1)} c="#2b3826" position={[0, 0.36, 0]} />
      <T g={G.rbox(1.2, 0.56, 0.68, 0.1)} c="#33422c" position={[0, 1.0, 0]} />
    </group>
    <group position={[0, 4.3, 0.2]}>
      <Limb a={[0, 0.9, 0]} b={[0, 0, 0]} r={0.025} c="#334155" o={false} />
      <T g={G.cone(0.55, 0.35, 14)} c="#1e293b" />
      <T g={G.sph(0.16, 10, 8)} c="#e0f2fe" emissive="#bae6fd" ei={2.2} position={[0, -0.14, 0]} o={false} />
    </group>
  </group>
);

export const DC9CabinInterior: React.FC<{
  hideLeft?: boolean;
  hideRight?: boolean;
  hideRoof?: boolean;
  cockpitDoorOpen?: number;
  emergencyLight?: number;
  flashIntensity?: number;
}> = ({
  hideLeft = false,
  hideRight = false,
  hideRoof = false,
  cockpitDoorOpen = 0,
  emergencyLight = 0.5,
  flashIntensity = 0,
}) => {
  const wallC = flashIntensity > 0.2 ? "#e0f2fe" : "#e2ddd5";
  return (
    <group>
      <T g={G.box(3.3, 0.12, 13.0)} c="#2c3340" position={[0, -0.06, 0]} />
      <T g={G.box(0.75, 0.02, 12.8)} c="#7c2d12" position={[0, 0.015, 0]} o={false} />
      {[-0.39, 0.39].map((x) => (
        <T key={x} g={G.box(0.04, 0.02, 12.6)} c="#4ade80" emissive="#22c55e" ei={1.2 + flashIntensity * 1.5} position={[x, 0.02, 0]} o={false} />
      ))}
      {!hideLeft ? (
        <group position={[-1.65, 1.35, 0]}>
          <T g={G.box(0.16, 2.7, 13.0)} c={wallC} />
          {Array.from({ length: 8 }).map((_, i) => (
            <T key={i} g={G.rbox(0.06, 0.42, 0.3, 0.3)} c="#0f172a" position={[0.08, 0.05, -4.8 + i * 1.35]} o={false} />
          ))}
          <T g={G.rbox(0.62, 0.46, 12.6, 0.2)} c="#d6d0c4" position={[0.35, 0.95, 0]} />
        </group>
      ) : null}
      {!hideRight ? (
        <group position={[1.65, 1.35, 0]}>
          <T g={G.box(0.16, 2.7, 13.0)} c={wallC} />
          {Array.from({ length: 8 }).map((_, i) => (
            <T key={i} g={G.rbox(0.06, 0.42, 0.3, 0.3)} c="#0f172a" position={[-0.08, 0.05, -4.8 + i * 1.35]} o={false} />
          ))}
          <T g={G.rbox(0.62, 0.46, 12.6, 0.2)} c="#d6d0c4" position={[-0.35, 0.95, 0]} />
        </group>
      ) : null}
      {!hideRoof ? (
        <group position={[0, 2.68, 0]}>
          <T g={G.box(3.4, 0.16, 13.0)} c="#cbd5e1" />
          {[-3.5, 0, 3.5].map((z) => (
            <T
              key={z}
              g={G.box(0.42, 0.06, 2.2)}
              c={flashIntensity > 0.2 ? "#ffffff" : "#fef08a"}
              emissive={flashIntensity > 0.2 ? "#e0f2fe" : "#f59e0b"}
              ei={0.7 + emergencyLight * 0.7 + flashIntensity * 3.0}
              position={[0, -0.1, z]}
              o={false}
            />
          ))}
        </group>
      ) : null}
      {[-4.2, -2.8, -1.4, 0.0, 1.4, 2.8].map((z, ri) => (
        <React.Fragment key={ri}>
          {[-1.02, 1.02].map((sx) => (
            <group key={sx} position={[sx, 0, z]}>
              <T g={G.rbox(0.95, 0.18, 0.56, 0.2)} c="#c2410c" position={[0, 0.44, 0]} />
              <T g={G.rbox(0.95, 0.86, 0.16, 0.2)} c="#ea580c" position={[0, 0.86, -0.22]} rotation={[-0.14, 0, 0]} />
              <T g={G.box(0.86, 0.22, 0.18)} c="#f8fafc" position={[0, 1.15, -0.24]} rotation={[-0.14, 0, 0]} o={false} />
              <T g={G.box(0.82, 0.4, 0.08)} c="#475569" position={[0, 0.2, 0]} o={false} />
            </group>
          ))}
        </React.Fragment>
      ))}
      <group position={[0, 0, -6.2]}>
        <T g={G.box(1.1, 2.65, 0.22)} c="#d6d3d1" position={[-1.12, 1.32, 0]} />
        <T g={G.box(1.1, 2.65, 0.22)} c="#d6d3d1" position={[1.12, 1.32, 0]} />
        <T g={G.box(1.15, 0.58, 0.22)} c="#d6d3d1" position={[0, 2.36, 0]} />
        <T g={G.box(0.55, 0.16, 0.08)} c="#ef4444" emissive="#ef4444" ei={1.8} position={[0, 2.28, 0.14]} o={false} />
        <group position={[-0.55, 0, 0]} rotation={[0, cockpitDoorOpen * 1.45, 0]}>
          <T g={G.box(1.06, 2.05, 0.1)} c="#64748b" position={[0.53, 1.03, 0]} />
          <T g={G.sph(0.045, 8, 6)} c="#e2e8f0" position={[0.92, 1.0, 0.08]} o={false} />
        </group>
        <group position={[0, 0, -1.2]}>
          <T g={G.box(2.4, 1.15, 0.7)} c="#1e293b" position={[0, 0.72, -0.4]} />
          {[-0.65, -0.2, 0.2, 0.65].map((gx, i) => (
            <T
              key={i}
              g={G.box(0.28, 0.22, 0.05)}
              c={i % 2 === 0 ? "#4ade80" : "#fbbf24"}
              emissive={i % 2 === 0 ? "#22c55e" : "#f59e0b"}
              ei={1.6}
              position={[gx, 1.05, -0.02]}
              o={false}
            />
          ))}
        </group>
      </group>
    </group>
  );
};

/* ============================================================================
   5. HOLLYWOOD CLIMAX VFX: FLASHBANG SHOCKWAVE · BULLET-TIME 360° TRACERS · RAIN
   ============================================================================ */

export const FlashbangBlast3D: React.FC<{
  position?: Vec3;
  progress: number;
  scale?: number;
}> = ({ position = [0, 1.2, 0], progress, scale = 1 }) => {
  if (progress <= 0.005 || progress >= 1.0) return null;
  const coreScale = Math.sin(Math.min(1, progress * 1.6) * Math.PI) * 1.45;
  const ring1 = 0.25 + progress * 4.2;
  const ring2 = 0.15 + Math.max(0, progress - 0.12) * 3.6;
  const alpha = Math.max(0, 1 - progress * 0.88);
  return (
    <group position={position} scale={scale}>
      {coreScale > 0.05 ? (
        <>
          <mesh scale={coreScale}>
            <sphereGeometry args={[0.55, 18, 14]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={Math.min(1, alpha * 1.3)} />
          </mesh>
          <mesh scale={coreScale * 1.55}>
            <sphereGeometry args={[0.62, 18, 14]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={alpha * 0.45} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={ring1}>
        <torusGeometry args={[0.55, 0.045, 10, 32]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={alpha * 0.85} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0.5, 0]} scale={ring2}>
        <torusGeometry args={[0.52, 0.03, 10, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={alpha * 0.65} depthWrite={false} />
      </mesh>
      {Array.from({ length: 24 }).map((_, i) => {
        const phi = (i * 2.39996) % (Math.PI * 2);
        const theta = (((i * 37) % 100) / 100) * Math.PI - Math.PI / 2;
        const dist = 0.35 + progress * (1.8 + (i % 5) * 0.45);
        const sx = Math.cos(theta) * Math.cos(phi) * dist;
        const sy = Math.sin(theta) * dist * 0.72;
        const sz = Math.cos(theta) * Math.sin(phi) * dist;
        const hot = i % 3 === 0;
        return (
          <T
            key={i}
            g={hot ? G.sph(0.045, 6, 6) : G.box(0.08, 0.03, 0.14)}
            c={hot ? "#fef08a" : "#bae6fd"}
            emissive={hot ? "#f97316" : "#38bdf8"}
            ei={2.2 * alpha}
            position={[sx, sy, sz]}
            rotation={[i * 0.7 + progress * 2, i * 1.1, i * 0.4]}
            o={false}
          />
        );
      })}
    </group>
  );
};

export const BulletTimeTracers: React.FC<{
  position?: Vec3;
  progress: number;
}> = ({ position = [0, 1.35, 0], progress }) => (
  <group position={position}>
    {[
      { y: 0.15, x: -0.25, z0: 1.8, z1: -2.2, col: "#facc15" },
      { y: -0.05, x: 0.22, z0: 2.1, z1: -1.9, col: "#fb923c" },
      { y: 0.32, x: 0.05, z0: -1.6, z1: 2.0, col: "#38bdf8" },
      { y: -0.18, x: -0.1, z0: 1.4, z1: -2.4, col: "#fef08a" },
    ].map((tr, i) => {
      const z = tr.z0 + (tr.z1 - tr.z0) * (0.25 + progress * 0.55);
      const dir = tr.z1 > tr.z0 ? 1 : -1;
      return (
        <group key={i} position={[tr.x, tr.y, z]}>
          <T g={G.cyl(0.012, 0.022, 0.085, 8)} c="#fef9c3" emissive={tr.col} ei={3.0} rotation={[dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]} o={false} />
          {[0.25, 0.55, 0.9].map((d, ri) => (
            <mesh key={ri} position={[0, 0, -dir * d]}>
              <torusGeometry args={[0.045 + ri * 0.032, 0.008, 6, 16]} />
              <meshBasicMaterial color="#e0f2fe" transparent opacity={0.55 - ri * 0.14} depthWrite={false} />
            </mesh>
          ))}
          <mesh position={[0, 0, -dir * 0.65]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.004, 0.014, 1.2, 8]} />
            <meshBasicMaterial color={tr.col} transparent opacity={0.65} depthWrite={false} />
          </mesh>
        </group>
      );
    })}
    {Array.from({ length: 8 }).map((_, i) => (
      <T
        key={i}
        g={G.cyl(0.014, 0.014, 0.048, 8)}
        c="#eab308"
        emissive="#ca8a04"
        ei={0.8}
        position={[
          -0.9 + (i % 4) * 0.62,
          0.1 + Math.sin(i * 1.9) * 0.45 + progress * 0.12,
          -0.8 + Math.floor(i / 4) * 1.5,
        ]}
        rotation={[i * 0.9 + progress * 3, i * 0.6, progress * 2]}
        o={false}
      />
    ))}
  </group>
);

export const NightRain3D: React.FC<{
  time: number;
  count?: number;
  spread?: number;
  height?: number;
}> = ({ time, count = 48, spread = 16, height = 9 }) => (
  <group>
    {Array.from({ length: count }).map((_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const rx = ((seed % 1000) / 1000 - 0.5) * spread;
      const rz = (((seed * 7) % 1000) / 1000 - 0.5) * spread;
      const ry = ((height - ((time * 9.5 + i * 0.73) % height)) + height) % height;
      return (
        <mesh key={i} position={[rx, ry, rz]} rotation={[0, 0, 0.14]}>
          <cylinderGeometry args={[0.008, 0.008, 0.42, 4]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.32} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

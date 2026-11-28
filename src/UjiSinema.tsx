/** Adegan uji cinemaKit (BUKAN bagian video Napoleon): cahaya berarah, paket shot otomatis, bayangan nyata, rim light, benda bingkai. */
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { RabbitCard } from "./three/objectsKelinci";
import { AJUDAN, KAISAR, PENGAWAL, PETANI } from "./SheetNapoleon";
import { CineGrade, CineStage, Foreground, buildShots, cineCard, LIGHT_PRESETS, shotCam, smoother, cl } from "./cinemaKit";

export const TOTAL_FRAMES_UJI = 360;
const OX = { L3: 800, L4: 1200 };
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const idle = (t: number, k = 0): Partial<BeanParams> => ({
  bob: Math.abs(Math.sin(t * 1.8 + k)) * 3,
  armL: [-8 + Math.sin(t * 1.3 + k) * 4, -10],
  armR: [8 - Math.sin(t * 1.3 + k) * 4, -10],
  blink: (t + k * 0.7) % 3.1 < 0.11,
  headTilt: Math.sin(t * 0.9 + k) * 2,
});
const shotIdx = (f: number, shots: { to: number }[]) => Math.max(0, shots.findIndex((s) => f < s.to));

const focusA: Vec3 = bl(0.9, -2.8, 0.06, OX.L3);
const shotsA = buildShots({ dur: 180, focus: focusA, targets: [bl(-0.2, -3.2, 0.06, OX.L3), bl(1.9, -2.4, 0.06, OX.L3)], front: Math.atan2(9, -4), reach: 6.0, style: "tenang", seed: 3, fovBase: 46 });
const SceneA: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = shotCam(f, shotsA);
  const P: "akrab" = "akrab";
  const card = cineCard(cam, LIGHT_PRESETS[P]);
  const si = shotIdx(f, shotsA);
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/napoleon.glb" visible={(n) => n.startsWith("L3_Peternakan") || n.startsWith("Langit")} focus={focusA} preset={P}>
        <BeanCard position={bl(-0.2, -3.2, 0.06, OX.L3)} height={1.9} params={bean(AJUDAN, { ...idle(t, 3), expr: "happy" })} {...card} />
        <BeanCard position={bl(1.9, -2.4, 0.06, OX.L3)} height={2.0} params={bean(PETANI, { ...idle(t, 2), expr: "happy" })} {...card} />
        <RabbitCard position={bl(-3.2, -3.0, 0.06, OX.L3)} size={0.8} params={{ pose: "sit", expr: "polos" }} />
        <RabbitCard position={bl(4.6, -4.0, 0.06, OX.L3)} size={0.8} flip params={{ pose: "hop", expr: "polos", fur: "#cdb594" }} />
        {si % 3 === 1 && <Foreground cam={cam} kind="post" side={1} color="#3a2a1c" />}
      </CineStage>
      <CineGrade preset={P} />
    </AbsoluteFill>
  );
};

const focusB: Vec3 = bl(-1.6, -7.2, 0.05, OX.L4);
const shotsB = buildShots({ dur: 180, focus: focusB, targets: [bl(-1.6, -7.2, 0.05, OX.L4), bl(1.4, -8.4, 0, OX.L4)], front: Math.PI / 2 - 0.35, reach: 6.5, style: "kacau", seed: 5, fovBase: 46 });
const SceneB: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cam = shotCam(f, shotsB);
  const P: "senja" = "senja";
  const card = cineCard(cam, LIGHT_PRESETS[P]);
  const si = shotIdx(f, shotsB);
  const hop = Math.abs(Math.sin(t * 6)) * 12;
  const kai = bean(KAISAR, { ...idle(t, 0), expr: "scared", mouthOpen: 0.8, sweat: true, prop: "rifle", armL: [-100, -30], armR: [100, -30], bob: hop });
  const rabbits = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2 + i * 0.7;
    const r = 1.4 + ((i * 37) % 10) * 0.2;
    return { a, r, hop: Math.abs(Math.sin(t * 5 + i)) * 0.18 };
  });
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/napoleon.glb" visible={(n) => n.startsWith("L4_Lapangan") || n.startsWith("Langit")} focus={focusB} preset={P}>
        <BeanCard position={bl(-1.6, -7.2, 0.05, OX.L4)} height={2.0} params={kai} {...card} />
        <BeanCard position={bl(1.4, -8.4, 0.0, OX.L4)} height={1.9} params={bean(AJUDAN, { ...idle(t, 3), expr: "worried" })} {...card} />
        <BeanCard position={bl(-4.8, -8.4, 0.0, OX.L4)} height={2.0} params={bean(PENGAWAL, { ...idle(t, 5), expr: "scared", sweat: true })} {...card} />
        {rabbits.map((q, i) => (
          <RabbitCard key={i} position={bl(-1.6 + Math.cos(q.a) * q.r, -7.2 + Math.sin(q.a) * q.r * 0.7, 0.05 + q.hop, OX.L4)} size={0.62} flip={Math.cos(q.a) > 0} params={{ pose: "hop", expr: "lapar", fur: i % 3 ? "#f1ece2" : "#8a6a4a", mouth: 0.4 }} />
        ))}
        {si % 2 === 1 && <Foreground cam={cam} kind="bars" side={-1} color="#1d1a26" />}
      </CineStage>
      <CineGrade preset={P} />
    </AbsoluteFill>
  );
};

export const UjiSinema: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <Sequence from={0} durationInFrames={180}><SceneA /></Sequence>
    <Sequence from={180} durationInFrames={180}><SceneB /></Sequence>
  </AbsoluteFill>
);
void smoother; void cl;

/** Uji motionKit (BUKAN bagian video Napoleon): Napoleon berlari dikejar kelinci, kamera mengikuti. */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { AJUDAN, KAISAR, PENGAWAL } from "./SheetNapoleon";
import { CineGrade, CineStage, LIGHT_PRESETS, cineCard } from "./cinemaKit";
import { Anchor, ChaseRabbits, DustTrail, PathFn, linePath, recedeCam, runPose, screenDir, toThree, velOf } from "./motionKit";

export const TOTAL_FRAMES_KEJAR = 240;
const OX = 1200;
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
// lari lurus menjauhi kamera ke padang terbuka di selatan lapangan (koordinat Blender, OX lapangan = 1200)
const PATH_K: PathFn = linePath(0, -4, 1.5, -90, 0.2, 10);        // Napoleon
const PATH_A: PathFn = (f) => { const [x, y] = PATH_K(f - 9); return [x + 1.3, y]; };  // Ara sedikit di belakang-kanan
const PATH_G: PathFn = (f) => { const [x, y] = PATH_K(f + 12); return [x - 1.6, y]; }; // pengawal paling depan
// kamera: medium samping-belakang → kamera diam, pelari menjauh → rendah di belakang kelinci → crane naik melihat mereka mengecil
const ANCHORS: Anchor[] = [
  { from: 0, dx: -2.2, dy: 4.6, h: 1.5, fov: 44, lookH: 1.2 },
  { from: 70, dx: -1.2, dy: 3.0, h: 1.4, fov: 40, roll: -3, lookH: 1.0 },
  { from: 140, dx: 2.6, dy: 6.5, h: 0.5, fov: 48, roll: 5, lookH: 0.9 },
  { from: 195, dx: -2.0, dy: 9.0, h: 3.0, fov: 46, rise: 5.5, lookH: 0.6 },
];

export const UjiKejar: React.FC = () => {
  const f = useCurrentFrame();
  const cam = recedeCam(f, PATH_K, ANCHORS, OX);
  const card = cineCard(cam, LIGHT_PRESETS.senja);
  const place = (p: PathFn, h = 0.05) => {
    const [x, y] = p(f);
    return toThree(x, y, h, OX);
  };
  const dirK = screenDir(cam, velOf(PATH_K, f));
  const dirA = screenDir(cam, velOf(PATH_A, f));
  const dirG = screenDir(cam, velOf(PATH_G, f));
  const kai = bean(KAISAR, { ...runPose(f, { dir: dirK, cadence: 0.52 }), expr: "scared", mouthOpen: 0.9, sweat: true, prop: "none", back: f > 40, hair: "#2a1a12" });
  const ara = bean(AJUDAN, { ...runPose(f, { dir: dirA, cadence: 0.46, phase: 1.4, amp: 0.8 }), expr: "worried", mouthOpen: 0.5, back: f > 40, hair: "#4a2c1a" });
  const gua = bean(PENGAWAL, { ...runPose(f, { dir: dirG, cadence: 0.5, phase: 0.8 }), expr: "scared", sweat: true, mouthOpen: 0.7, back: true, hair: "#3a2a1a" });
  const [fx, fy] = PATH_K(f);
  const focus = toThree(fx, fy, 0.05, OX);
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/napoleon.glb" visible={(n) => n.startsWith("L4_Lapangan") || n.startsWith("Langit")} focus={focus} preset="senja">
        <DustTrail path={PATH_K} f={f} ox={OX} />
        <DustTrail path={PATH_A} f={f} ox={OX} count={5} />
        <BeanCard position={place(PATH_G)} height={2.0} params={gua} flip={dirG < 0} {...card} />
        <ChaseRabbits path={PATH_K} f={f} n={24} gap={2} lead={10} cam={cam} ox={OX} />
        <BeanCard position={place(PATH_A)} height={1.9} params={ara} flip={dirA < 0} {...card} />
        <BeanCard position={place(PATH_K)} height={2.0} params={kai} flip={dirK < 0} {...card} />
      </CineStage>
      <CineGrade preset="senja" />
    </AbsoluteFill>
  );
};

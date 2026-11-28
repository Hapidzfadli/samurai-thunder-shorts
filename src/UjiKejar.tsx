/** Uji motionKit (BUKAN bagian video Napoleon): Napoleon berlari dikejar kelinci, kamera mengikuti. */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { AJUDAN, KAISAR, PENGAWAL } from "./SheetNapoleon";
import { CineGrade, CineStage, LIGHT_PRESETS, cineCard } from "./cinemaKit";
import { ChaseRabbits, DustTrail, LoopPath, chaseCam, loopAt, runPose, screenDir, toThree, velAt } from "./motionKit";

export const TOTAL_FRAMES_KEJAR = 240;
const OX = 1200;
const bean = (base: BeanParams, extra: Partial<BeanParams>): BeanParams => ({ ...base, ...extra });
const PATH_K: LoopPath = { cx: 0, cy: -8, rx: 6.5, ry: 3.6, speed: 0.05, phase: 0.4 };
const PATH_A: LoopPath = { ...PATH_K, phase: 0.4 - 0.42 };      // Ara tepat di belakang Napoleon
const PATH_G: LoopPath = { cx: 0, cy: -8, rx: 6.5, ry: 3.6, speed: -0.045, phase: 2.8 }; // pengawal lari ke arah berlawanan

export const UjiKejar: React.FC = () => {
  const f = useCurrentFrame();
  const cam = chaseCam(f, (fr) => loopAt(PATH_K, fr), OX);
  const card = cineCard(cam, LIGHT_PRESETS.senja);
  const place = (p: LoopPath, h = 0.05) => {
    const [x, y] = loopAt(p, f);
    return toThree(x, y, h, OX);
  };
  const dirK = screenDir(cam, velAt(PATH_K, f));
  const dirA = screenDir(cam, velAt(PATH_A, f));
  const dirG = screenDir(cam, velAt(PATH_G, f));
  const kai = bean(KAISAR, { ...runPose(f, { dir: dirK, cadence: 0.52 }), expr: "scared", mouthOpen: 0.9, sweat: true, prop: "none" });
  const ara = bean(AJUDAN, { ...runPose(f, { dir: dirA, cadence: 0.46, phase: 1.4, amp: 0.8 }), expr: "worried", mouthOpen: 0.5 });
  const gua = bean(PENGAWAL, { ...runPose(f, { dir: dirG, cadence: 0.5, phase: 0.8 }), expr: "scared", sweat: true, mouthOpen: 0.7 });
  const [fx, fy] = loopAt(PATH_K, f);
  const focus = toThree(fx, fy, 0.05, OX);
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/napoleon.glb" visible={(n) => n.startsWith("L4_Lapangan") || n.startsWith("Langit")} focus={focus} preset="senja">
        <DustTrail path={PATH_K} f={f} ox={OX} />
        <DustTrail path={PATH_A} f={f} ox={OX} count={5} />
        <BeanCard position={place(PATH_G)} height={2.0} params={gua} flip={dirG < 0} {...card} />
        <ChaseRabbits path={PATH_K} f={f} n={24} cam={cam} ox={OX} />
        <BeanCard position={place(PATH_A)} height={1.9} params={ara} flip={dirA < 0} {...card} />
        <BeanCard position={place(PATH_K)} height={2.0} params={kai} flip={dirK < 0} {...card} />
      </CineStage>
      <CineGrade preset="senja" />
    </AbsoluteFill>
  );
};

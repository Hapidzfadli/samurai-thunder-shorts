// Bespoke Native 3D Hollywood Poster Thumbnails (9:16 Shorts & 16:9 YouTube) — Operasi Woyla 1981
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { ToonRes } from "./three/toon";
import { heroHand } from "./three/objectsHero";
import {
  BulletTimeTracers,
  DonMueangApron,
  Flashbang3D,
  FlashbangBlast3D,
  GarudaDC9Woyla,
  MP5Gun,
  NightRain3D,
  WoylaActor,
} from "./three/objectsWoyla";
import { KIRANG_HIJAU, SINTONG, TIM_MERAH } from "./SheetWoyla";

const HERO_BREACH_POSE = {
  ...KIRANG_HIJAU,
  lean: 0.22,
  turn: -0.22,
  expr: "shout" as const,
  armR: { pitch: 1.05, out: 0.22, elbow: 0.65 },
  armL: { pitch: 1.42, out: 0.3, elbow: 0.55 },
  legL: { pitch: 0.42, out: 0.14, knee: 0.25 },
  legR: { pitch: -0.35, out: 0.14, knee: 0.28 },
};

const WING_POSE = {
  ...TIM_MERAH,
  lean: 0.16,
  expr: "determined" as const,
  armR: { pitch: 0.85, out: 0.18, elbow: 0.9 },
  armL: { pitch: 1.05, out: -0.2, elbow: 1.05 },
};

const WoylaPosterScene: React.FC<{ camPos: [number, number, number]; lookAt: [number, number, number]; fov: number }> = ({
  camPos,
  lookAt,
  fov,
}) => (
  <>
    <ToonRes />
    <CameraRig position={camPos} lookAt={lookAt} fov={fov} />
    <hemisphereLight args={["#93c5fd", "#181824", 1.25]} />
    <directionalLight position={[-6, 9, 8]} intensity={2.2} color="#e0f2fe" castShadow />
    <directionalLight position={[9, 5, -4]} intensity={2.4} color="#f97316" />
    <pointLight position={[0.2, 2.2, 2.4]} intensity={2.8} color="#7dd3fc" distance={14} />

    <DonMueangApron searchlightPhase={0.14} beaconPhase={0.15} />
    <GarudaDC9Woyla position={[-1.8, 0, -9.8]} rotation={[0, 0.56, 0]} wingDoorL={1} wingDoorR={1} rearStair={1} strobe={1} cabinFlash={0.85} />
    <NightRain3D time={0.32} count={52} spread={14} height={8} />

    {/* Center foreground hero breaching through bullet-time flashbang shockwave! */}
    <WoylaActor p={HERO_BREACH_POSE} role="hijau" position={[0.1, 0, 2.3]} rotation={[0, -0.14, 0]} scale={1.18}>
      <MP5Gun position={heroHand(HERO_BREACH_POSE, "R")} rotation={[0.04, 0.12, 0.05]} muzzleFlash={0.85} />
      <Flashbang3D position={heroHand(HERO_BREACH_POSE, "L")} pinPull={1} glow={1} scale={1.2} />
    </WoylaActor>

    {/* Flanking Tim Merah & Commander Sintong (well clear of aircraft wings!) */}
    <WoylaActor p={WING_POSE} role="merah" position={[-1.55, 0, 1.35]} rotation={[0, 0.28, 0]} scale={1.06}>
      <MP5Gun position={heroHand(WING_POSE, "R")} rotation={[0.05, 0.14, 0.05]} muzzleFlash={0.45} />
    </WoylaActor>
    <WoylaActor p={SINTONG} role="sintong" beret position={[1.55, 0, 1.35]} rotation={[0, -0.28, 0]} scale={1.06} />

    {/* Explosive Flashbang Dual Shockwave behind heroes + Bullet-Time Tracers */}
    <FlashbangBlast3D position={[0.2, 1.9, -0.6]} progress={0.48} scale={1.15} />
    <BulletTimeTracers position={[0.1, 1.55, 2.25]} progress={0.48} />
  </>
);

export const ThumbWoylaShorts: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, #040914 0%, #0d1f3d 48%, #26130f 75%, #070c16 100%)" }}>
    <ThreeCanvas width={1080} height={1920} shadows flat camera={{ fov: 36, near: 0.2, far: 220, position: [0.35, 1.95, 7.6] }}>
      <WoylaPosterScene camPos={[0.35, 1.95, 7.6]} lookAt={[0, 1.55, 0.4]} fov={36} />
    </ThreeCanvas>

    {/* Dramatic Cinema Vignette */}
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,9,20,0.82) 0%, rgba(4,9,20,0.0) 26%, rgba(4,9,20,0.0) 68%, rgba(4,9,20,0.92) 100%)" }} />

    {/* Top Hollywood Blockbuster Title */}
    <div style={{ position: "absolute", top: 72, left: 48, right: 48, textAlign: "center" }}>
      <div style={{ display: "inline-block", background: "#dc2626", color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: 4, padding: "8px 26px", borderRadius: 8, boxShadow: "0 8px 28px rgba(220,38,38,0.55)" }}>
        KISAH NYATA · 31 MARET 1981
      </div>
      <div style={{ fontFamily: "Anton, sans-serif", fontSize: 138, lineHeight: 0.94, color: "#ffffff", letterSpacing: 3, marginTop: 18, textShadow: "0 8px 0 #090d16, 0 18px 42px rgba(0,0,0,0.9)" }}>
        OPERASI WOYLA
      </div>
      <div style={{ fontFamily: "Anton, sans-serif", fontSize: 64, lineHeight: 1.04, color: "#fbbf24", letterSpacing: 2, marginTop: 8, textShadow: "0 5px 0 #7c2d12, 0 12px 26px rgba(0,0,0,0.9)" }}>
        SERBUAN 3 MENIT KOPASSANDHA!
      </div>
    </div>

    {/* Bottom Tactical Stamp */}
    <div style={{ position: "absolute", bottom: 72, left: 52, right: 52, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ background: "rgba(7,12,24,0.86)", border: "2px solid #38bdf8", borderRadius: 14, padding: "14px 24px", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontWeight: 900, fontSize: 28, color: "#38bdf8" }}>GARUDA DC-9 · PK-GNJ</div>
        <div style={{ fontWeight: 700, fontSize: 22, color: "#e2e8f0" }}>48 SANDERA BEBAS · DON MUEANG</div>
      </div>
      <div style={{ background: "#dc2626", borderRadius: 14, padding: "14px 24px", fontFamily: "Anton, sans-serif", fontSize: 48, color: "#fff", letterSpacing: 2, boxShadow: "0 6px 24px rgba(220,38,38,0.6)" }}>
        02:58
      </div>
    </div>
  </AbsoluteFill>
);

export const ThumbWoylaYoutube: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(125deg, #040914 0%, #0d1f3d 52%, #29140e 100%)" }}>
    <ThreeCanvas width={1280} height={720} shadows flat camera={{ fov: 34, near: 0.2, far: 220, position: [1.65, 1.85, 6.8] }}>
      <WoylaPosterScene camPos={[1.65, 1.85, 6.8]} lookAt={[-0.7, 1.45, 0.3]} fov={34} />
    </ThreeCanvas>

    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(4,9,20,0.92) 0%, rgba(4,9,20,0.58) 44%, rgba(4,9,20,0.05) 72%)" }} />

    <div style={{ position: "absolute", top: 64, left: 54, width: 610 }}>
      <div style={{ display: "inline-block", background: "#dc2626", color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: 3, padding: "7px 18px", borderRadius: 8 }}>
        KISAH NYATA · BANGKOK 1981
      </div>
      <div style={{ fontFamily: "Anton, sans-serif", fontSize: 108, lineHeight: 0.94, color: "#ffffff", letterSpacing: 2, marginTop: 14, textShadow: "0 6px 0 #090d16, 0 14px 32px rgba(0,0,0,0.9)" }}>
        OPERASI
        <br />
        WOYLA!
      </div>
      <div style={{ fontFamily: "Anton, sans-serif", fontSize: 48, lineHeight: 1.06, color: "#fbbf24", letterSpacing: 1.5, marginTop: 12, textShadow: "0 4px 0 #7c2d12" }}>
        3 MENIT BEBASKAN 48 SANDERA
      </div>
      <div style={{ marginTop: 22, display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ background: "rgba(15,23,42,0.88)", border: "2px solid #38bdf8", color: "#38bdf8", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 22, padding: "8px 18px", borderRadius: 10 }}>
          GARUDA DC-9 · PK-GNJ
        </span>
        <span style={{ background: "#dc2626", color: "#fff", fontFamily: "Anton, sans-serif", fontSize: 32, padding: "6px 18px", borderRadius: 10 }}>
          02:58
        </span>
      </div>
    </div>
  </AbsoluteFill>
);

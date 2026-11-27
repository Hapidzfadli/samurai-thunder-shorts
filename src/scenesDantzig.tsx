import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import {
  AnneExpr,
  AnnePose,
  GeorgeExpr,
  GeorgePose,
  makeAnneTexture,
  makeClassmateTexture,
  makeGeorgeTexture,
  makeNeymanTexture,
  NeymanExpr,
  NeymanPose,
} from "./dantzig/chars2d";
import {
  ChalkboardDantzigPlane,
  CoffeeMug3D,
  HomeworkStack3D,
  loadGlbCached,
  Notebook3D,
  SkyDome,
  ThesisBinder3D,
} from "./dantzig/props3d";
import { InsertCopyHomework, InsertPaperStamp } from "./dantzig/inserts2d";
import { cl, kick, lerp, lv, rp, sm, talkAt } from "./sceneKit";
import { Vec3 } from "./three/toon";
import TIMING from "./dantzig_timing.json";

export const DANTZIG_TIMING = TIMING;
export const TOTAL_FRAMES_DANTZIG = TIMING.totalFrames;

// ---------------------------------------------------------------------------
// Helpers: Shared Camera Rig + GLB Stage Wrapper + Character Plane Components
// ---------------------------------------------------------------------------
const CamRig: React.FC<{ pos: Vec3; look: Vec3; fov: number; shake?: Vec3 }> = ({
  pos,
  look,
  fov,
  shake = [0, 0, 0],
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(pos[0] + shake[0], pos[1] + shake[1], pos[2] + shake[2]);
  camera.lookAt(look[0] + shake[0], look[1] + shake[1], look[2] + shake[2]);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

function useLoadedGlb(path: string): THREE.Group | null {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender(`Load ${path}`));
  useEffect(() => {
    let cancelled = false;
    loadGlbCached(path)
      .then((g) => {
        if (!cancelled) {
          setModel(g);
          continueRender(handle);
        }
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [path, handle]);
  return model;
}

const GeorgePlane: React.FC<{
  position: Vec3;
  expr: GeorgeExpr;
  pose?: GeorgePose;
  talk?: number;
  seated?: boolean;
  scale?: number;
  rotY?: number;
}> = ({ position, expr, pose = "idle", talk = 0, seated = false, scale = 1, rotY = 0 }) => {
  const tBucket = talk > 0.18 ? Math.round(talk * 3) / 3 : 0;
  const tex = useMemo(
    () => makeGeorgeTexture(expr, pose, tBucket, seated),
    [expr, pose, tBucket, seated]
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={[0, rotY, 0]} scale={[scale, scale, 1]}>
      <planeGeometry args={[1.18, 1.78]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
};

const NeymanPlane: React.FC<{
  position: Vec3;
  expr: NeymanExpr;
  pose?: NeymanPose;
  talk?: number;
  seated?: boolean;
  scale?: number;
  rotY?: number;
}> = ({ position, expr, pose = "idle", talk = 0, seated = false, scale = 1, rotY = 0 }) => {
  const tBucket = talk > 0.18 ? Math.round(talk * 3) / 3 : 0;
  const tex = useMemo(
    () => makeNeymanTexture(expr, pose, tBucket, seated),
    [expr, pose, tBucket, seated]
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={[0, rotY, 0]} scale={[scale, scale, 1]}>
      <planeGeometry args={[1.22, 1.84]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
};

const AnnePlane: React.FC<{
  position: Vec3;
  expr: AnneExpr;
  pose?: AnnePose;
  talk?: number;
  scale?: number;
  rotY?: number;
}> = ({ position, expr, pose = "idle", talk = 0, scale = 1, rotY = 0 }) => {
  const tBucket = talk > 0.18 ? Math.round(talk * 3) / 3 : 0;
  const tex = useMemo(() => makeAnneTexture(expr, pose, tBucket), [expr, pose, tBucket]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={[0, rotY, 0]} scale={[scale, scale, 1]}>
      <planeGeometry args={[1.12, 1.68]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
};

const ClassmatesRow: React.FC = () => {
  const t1 = useMemo(() => makeClassmateTexture("#4d6b4a", "#2c221c"), []);
  const t2 = useMemo(() => makeClassmateTexture("#6e533e", "#4a3220"), []);
  const t3 = useMemo(() => makeClassmateTexture("#3f506e", "#1e1c22"), []);
  useEffect(() => () => { t1.dispose(); t2.dispose(); t3.dispose(); }, [t1, t2, t3]);
  return (
    <group>
      <mesh position={[3.8, 5.45, -0.78]}>
        <planeGeometry args={[0.90, 1.08]} />
        <meshBasicMaterial map={t1} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[8.6, 5.45, -0.78]}>
        <planeGeometry args={[0.90, 1.08]} />
        <meshBasicMaterial map={t2} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[8.6, 5.45, 1.22]}>
        <planeGeometry args={[0.90, 1.08]} />
        <meshBasicMaterial map={t3} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const SchoolLights: React.FC = () => (
  <>
    <SkyDome top="#4a6ba8" mid="#a6b7d8" horizon="#f8d2a2" />
    <hemisphereLight args={["#ffe8c8", "#4c546e", 0.95]} />
    <ambientLight intensity={0.35} color="#fff2de" />
    <directionalLight
      position={[24, 19, 16]}
      intensity={2.2}
      color="#ffdba6"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-22}
      shadow-camera-right={22}
      shadow-camera-top={22}
      shadow-camera-bottom={-22}
      shadow-camera-near={2}
      shadow-camera-far={75}
      shadow-bias={-0.0005}
    />
    <pointLight position={[6.2, 7.6, -2.0]} intensity={12} distance={14} decay={1.6} color="#ffe3b5" />
    <pointLight position={[8.8, 6.6, -3.5]} intensity={8} distance={10} decay={1.8} color="#ffd08a" />
  </>
);

// ---------------------------------------------------------------------------
// Top Story Badge / Banner Overlay
// ---------------------------------------------------------------------------
const StoryBanner: React.FC<{ text: string; sub?: string; color?: string; show: boolean }> = ({
  text,
  sub,
  color = "#e03a32",
  show,
}) => {
  if (!show) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 155,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: `linear-gradient(180deg, ${color} 0%, #1c1e2a 180%)`,
          border: "5px solid #14121a",
          borderRadius: 20,
          padding: "12px 38px",
          color: "#ffffff",
          fontFamily: "Inter, sans-serif",
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: 1.5,
          textAlign: "center",
          whiteSpace: "nowrap",
          boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        }}
      >
        {text}
      </div>
      {sub && (
        <div
          style={{
            background: "rgba(18, 22, 36, 0.86)",
            border: "3px solid #f4cf6b",
            borderRadius: 14,
            padding: "6px 24px",
            color: "#ffeaad",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: 30,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// ADEGAN 1 — HOOK & FLY-THROUGH: UC BERKELEY 1939 (EXTERIOR -> OPEN WINDOW -> CLASS)
// ===========================================================================
export const SceneDantzigHook: React.FC = () => {
  const f = useCurrentFrame();
  const dur = TIMING.scenes.hook.durationInFrames;
  const school = useLoadedGlb("models/school.glb");

  const { posCurve, lookCurve } = useMemo(() => {
    const p = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-16.5, 17.5, 29.0),
        new THREE.Vector3(-4.2, 12.6, 20.0),
        new THREE.Vector3(4.8, 7.9, 10.8),
        new THREE.Vector3(6.2, 6.45, 5.0),
        new THREE.Vector3(6.2, 6.20, 2.4),
        new THREE.Vector3(6.15, 6.08, 1.35),
      ],
      false,
      "catmullrom",
      0.4
    );
    const l = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.5, 6.0, -1.0),
        new THREE.Vector3(3.0, 6.5, 1.5),
        new THREE.Vector3(6.2, 6.35, 3.2),
        new THREE.Vector3(6.2, 6.15, -2.0),
        new THREE.Vector3(6.15, 6.00, -4.0),
        new THREE.Vector3(6.15, 5.95, -4.5),
      ],
      false,
      "catmullrom",
      0.4
    );
    return { posCurve: p, lookCurve: l };
  }, []);

  const t = sm(cl(f / Math.max(1, dur - 18)));
  const cPos = posCurve.getPoint(t);
  const cLook = lookCurve.getPoint(t);
  const fov = lerp(48, 54, t);

  // George sneaks in cleanly into left-center of vertical frame (X: 4.5 -> 5.45)
  const gWalk = rp(f, Math.floor(dur * 0.45), Math.floor(dur * 0.85));
  const gx = lerp(4.55, 5.45, gWalk);
  const gz = lerp(-1.2, -2.85, gWalk);
  const gBob = gWalk > 0 && gWalk < 1 ? Math.abs(Math.sin(f * 0.45)) * 0.08 : 0;

  return (
    <AbsoluteFill style={{ background: "#232a40" }}>
      {school && (
        <ThreeCanvas width={1080} height={1920} dpr={0.65} gl={{ antialias: false }} shadows={false} camera={{ fov, near: 0.1, far: 400 }}>
          <SchoolLights />
          <primitive object={school} />
          <ChalkboardDantzigPlane />
          <ClassmatesRow />

          {/* Prof. Neyman teaching cleanly inside right-center of vertical frame */}
          <NeymanPlane
            position={[6.92, 5.42, -4.25]}
            expr="serius"
            pose="point_board"
          />

          {/* George sneaking in late clutching his notebook! */}
          <GeorgePlane
            position={[gx, 5.40 + gBob, gz]}
            expr="panik"
            pose="clutch_book"
          />
          <Notebook3D position={[gx + 0.08, 5.36 + gBob, gz + 0.16]} rotation={[0.4, 0.2, 0.1]} />

          <CamRig pos={[cPos.x, cPos.y, cPos.z]} look={[cLook.x, cLook.y, cLook.z]} fov={fov} />
        </ThreeCanvas>
      )}
      <StoryBanner
        text="UC BERKELEY · 1939"
        sub="TELAT MASUK KELAS → PECAHKAN SOAL MUSTAHIL!"
        color="#c9362e"
        show={f > 6 && f < 95}
      />
    </AbsoluteFill>
  );
};

// ===========================================================================
// ADEGAN 2 — KELAS: SALAH PAHAM DI PAPAN TULIS + INSERT MENYALIN PR
// ===========================================================================
export const SceneDantzigKelas: React.FC = () => {
  const f = useCurrentFrame();
  const dur = TIMING.scenes.kelas.durationInFrames;
  const evCopy = TIMING.events["kelas.menyalinnya"] ?? Math.floor(dur * 0.55);
  const school = useLoadedGlb("models/school.glb");

  // Clean wide vertical classroom shot keeping chalkboard + George + Prof. Neyman 100% inside frame
  const k1 = rp(f, 0, Math.floor(dur * 0.45));
  const pos: Vec3 = lv([6.15, 6.08, 1.35], [6.15, 6.10, 0.85], k1);
  const look: Vec3 = lv([6.15, 6.10, -4.9], [6.15, 6.18, -4.95], k1);

  const insertStart = Math.max(25, evCopy - 12);
  const insertDur = 54; // 1.8s crisp close-up insert
  const insertProg = (f - insertStart) / insertDur;

  const isCopying = f >= insertStart - 15;

  return (
    <AbsoluteFill style={{ background: "#232a40" }}>
      {school && (
        <ThreeCanvas width={1080} height={1920} dpr={0.65} gl={{ antialias: false }} shadows={false} camera={{ fov: 54, near: 0.1, far: 400 }}>
          <SchoolLights />
          <primitive object={school} />
          <ChalkboardDantzigPlane />
          <ClassmatesRow />

          {/* Prof. Neyman gesturing at the 2 unsolved theorems */}
          <NeymanPlane
            position={[6.92, 5.42, -4.25]}
            expr="serius"
            pose={f < insertStart ? "point_board" : "idle"}
          />

          {/* George seated/standing left-center copying earnestly! */}
          <GeorgePlane
            position={[5.42, 5.40, -2.95]}
            expr={isCopying ? "fokus" : "panik"}
            pose={isCopying ? "write" : "clutch_book"}
          />
          <Notebook3D position={[5.62, 5.26, -2.70]} rotation={[0.35, -0.15, 0]} />

          <CamRig pos={pos} look={look} fov={54} />
        </ThreeCanvas>
      )}
      {insertProg >= 0 && insertProg <= 1 && <InsertCopyHomework progress={insertProg} />}
    </AbsoluteFill>
  );
};

// ===========================================================================
// ADEGAN 3 — KAMAR BELAJAR MALAM (02:00): BEGADANG + ANNE BAWA KOPI
// ===========================================================================
export const SceneDantzigKamar: React.FC = () => {
  const f = useCurrentFrame();
  const dur = TIMING.scenes.kamar.durationInFrames;
  const lines = TIMING.lines.kamar;
  const evKetemu = TIMING.events["kamar.ketemu"] ?? Math.floor(dur * 0.68);
  const rooms = useLoadedGlb("models/dantzig_rooms.glb");

  // Wider vertical shot in Study Room (Set 1 at X=0) so BOTH George & Anne fit with clock 02:00 & night window!
  const kCam = rp(f, 0, dur);
  const pos: Vec3 = lv([0.85, 1.92, 2.05], [-0.15, 1.78, 1.85], kCam);
  const look: Vec3 = lv([0.22, 1.38, -2.2], [0.18, 1.32, -2.0], kCam);

  // Crumpled paper wad tossed by George early in scene (frames 18..48)
  const wadP = cl((f - 18) / 28);
  const wadShow = f >= 18 && f <= 58;
  const wadX = lerp(-0.10, 1.18, wadP);
  const wadY = lerp(1.18, 0.45, wadP) + Math.sin(wadP * Math.PI) * 0.55;
  const wadZ = lerp(-1.85, -1.90, wadP);

  // Anne walks cleanly into right-center (X: 1.55 -> 0.64) carrying steaming CoffeeMug3D, sets it on desk!
  const anneWalk = rp(f, 12, 62);
  const ax = lerp(1.55, 0.66, anneWalk);
  const az = lerp(-0.85, -1.45, anneWalk);
  const placeMug = rp(f, 62, 84);
  const mugPos: Vec3 = lv([ax - 0.16, 0.98, az + 0.14], [0.32, 0.82, -1.92], placeMug);

  const anneTalk = talkAt(f, lines[0]);
  const georgeTalk = talkAt(f, lines[1]);
  const solvedMoment = f >= evKetemu;

  return (
    <AbsoluteFill style={{ background: "#0e1222" }}>
      {rooms && (
        <ThreeCanvas width={1080} height={1920} dpr={0.65} gl={{ antialias: false }} shadows={false} camera={{ fov: 56, near: 0.1, far: 120 }}>
          {/* Cozy late-night moody lighting + glowing green banker's lamp */}
          <ambientLight intensity={0.44} color="#8ba0cf" />
          <hemisphereLight args={["#5a72a8", "#2b2018", 0.58]} />
          <pointLight
            position={[-0.78, 1.22, -2.35]}
            intensity={14}
            distance={9}
            decay={1.6}
            color="#ffcb7a"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[1.2, 2.5, 0.2]} intensity={5.8} distance={10} decay={1.8} color="#ffdba8" />

          <primitive object={rooms} />

          {/* George at left-center of his study desk */}
          <GeorgePlane
            position={[-0.36, 1.12, -1.58]}
            expr={solvedMoment ? "bangga" : "pusing"}
            pose={solvedMoment ? "write" : f < 55 ? "scratch_head" : "write"}
            talk={georgeTalk}
            scale={0.94}
          />

          {/* Anne walking cleanly into right-center carrying warm steaming coffee mug */}
          <AnnePlane
            position={[ax, 0.86 + (anneWalk < 1 ? Math.abs(Math.sin(f * 0.32)) * 0.04 : 0), az]}
            expr={solvedMoment ? "senyum_hangat" : "khawatir"}
            pose={placeMug < 0.3 ? "carry_mug" : placeMug < 1 ? "place_mug" : "idle"}
            talk={anneTalk}
            rotY={-0.25}
            scale={0.92}
          />

          {/* Transferrable Coffee Mug 3D (Anne's hand -> George's desk!) */}
          <CoffeeMug3D position={mugPos} frame={f} scale={1.15} />

          {/* George's growing HomeworkStack3D on desk */}
          <HomeworkStack3D position={[-0.18, 0.84, -2.02]} rotation={[0, 0.08, 0]} />

          {/* Animated flying crumpled paper ball */}
          {wadShow && (
            <mesh position={[wadX, wadY, wadZ]}>
              <icosahedronGeometry args={[0.07, 1]} />
              <meshStandardMaterial color="#f5f2ea" roughness={0.85} />
            </mesh>
          )}

          <CamRig pos={pos} look={look} fov={56} />
        </ThreeCanvas>
      )}
      <StoryBanner text="JAM 02:00 MALAM" sub="BEGADANG MENGERJAKAN 'PR'" color="#26406e" show={f > 6 && f < 68} />
    </AbsoluteFill>
  );
};

// ===========================================================================
// ADEGAN 4 — RUANG KERJA PROF. NEYMAN: SERAH-TERIMA KERTAS KE BUKIT MEJA
// ===========================================================================
export const SceneDantzigKantor: React.FC = () => {
  const f = useCurrentFrame();
  const dur = TIMING.scenes.kantor.durationInFrames;
  const lines = TIMING.lines.kantor;
  const evTaruh = TIMING.events["kantor.taruh"] ?? Math.floor(dur * 0.50);
  const rooms = useLoadedGlb("models/dantzig_rooms.glb");

  // Office Set 2 at X=24.0: wider camera Z=2.75 so George (front-left) + Prof. Neyman (back-center) + paper mountain ALL fit!
  const kCam = rp(f, 0, dur);
  const pos: Vec3 = lv([23.85, 1.82, 2.85], [24.05, 1.76, 2.45], kCam);
  const look: Vec3 = lv([24.0, 1.28, -1.4], [24.08, 1.24, -1.45], kCam);

  // Staggered front/back positioning so both characters stay 100% inside 9:16 frame
  const walkIn = rp(f, 0, 36);
  const gx = lerp(23.10, 23.52, walkIn);
  const gz = lerp(0.55, -0.25, walkIn);
  const transfer = rp(f, evTaruh + 6, evTaruh + 34);
  const stackPos: Vec3 = [
    lerp(gx + 0.36, 24.58, transfer),
    lerp(1.08, 1.28, transfer) + Math.sin(transfer * Math.PI) * 0.28,
    lerp(gz - 0.18, -1.27, transfer),
  ];

  const georgeTalk = talkAt(f, lines[0]);
  const profTalk = talkAt(f, lines[1]);

  return (
    <AbsoluteFill style={{ background: "#2e241b" }}>
      {rooms && (
        <ThreeCanvas width={1080} height={1920} dpr={0.65} gl={{ antialias: false }} shadows={false} camera={{ fov: 54, near: 0.1, far: 120 }}>
          <ambientLight intensity={0.55} color="#fff5e4" />
          <hemisphereLight args={["#fff4dc", "#5a4636", 0.95]} />
          <directionalLight
            position={[24, 6, -5]}
            intensity={1.6}
            color="#fff0d4"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[24.0, 3.1, 0.5]} intensity={14} distance={14} decay={1.6} color="#ffe9c8" />

          <primitive object={rooms} />

          {/* Prof. Neyman busy behind his cluttered executive desk */}
          <NeymanPlane
            position={[24.22, 1.24, -2.05]}
            expr="sibuk"
            pose={f >= evTaruh - 4 && f < evTaruh + 45 ? "dismiss_wave" : "idle"}
            talk={profTalk}
            seated
            scale={0.94}
          />

          {/* George stepping up apologetically cleanly inside left-center of frame */}
          <GeorgePlane
            position={[gx, 0.88, gz]}
            expr="sungkan"
            pose={f < 36 ? "clutch_book" : transfer < 0.95 ? "reach_right" : "idle"}
            talk={georgeTalk}
            rotY={0.18}
            scale={0.90}
          />

          {/* Separate 3D HomeworkStack physically moving from George's hand -> top of Prof's desk pile! */}
          <HomeworkStack3D position={stackPos} rotation={[0, 0.25 * (1 - transfer), 0]} scale={1.1} />

          <CamRig pos={pos} look={look} fov={54} />
        </ThreeCanvas>
      )}
    </AbsoluteFill>
  );
};

// ===========================================================================
// ADEGAN 5 — 6 MINGGU KEMUDIAN, MINGGU PAGI 08:00: PINTU DIGEDOR & DIBUKA!
// ===========================================================================
export const SceneDantzigMinggu: React.FC = () => {
  const f = useCurrentFrame();
  const dur = TIMING.scenes.minggu.durationInFrames;
  const lines = TIMING.lines.minggu;
  const evGedor = TIMING.events["minggu.gedor"] ?? 45;
  const evGeorge = TIMING.events["minggu.george"] ?? Math.floor(dur * 0.62);
  const rooms = useLoadedGlb("models/dantzig_rooms.glb");

  // Animate Hinged 3D Front Door Pivot!
  const doorOpen = rp(f, evGeorge - 22, evGeorge - 2);
  useEffect(() => {
    if (!rooms) return;
    const pivot = rooms.getObjectByName("FrontDoor_Pivot");
    if (pivot) {
      const knockJolt =
        f >= evGedor && f < evGedor + 24 ? Math.sin((f - evGedor) * 2.2) * 0.04 : 0;
      // Positive Y rotation swings door OUTWARD onto the porch (never blocking George!)
      pivot.rotation.y = 1.42 * doorOpen + knockJolt;
    }
  }, [rooms, doorOpen, f, evGedor]);

  const shake = kick(f, [evGedor, evGedor + 7, evGedor + 14, evGedor + 21], 0.08);
  const kCam = rp(f, 0, dur);
  // Wider Z=1.85 -> 1.55 so clock 08:00 + George (left) + Prof in doorway (center) + Anne (right) ALL fit cleanly!
  const pos: Vec3 = lv([47.85, 1.72, 1.95], [48.0, 1.62, 1.55], kCam);
  const look: Vec3 = lv([47.90, 1.42, -2.85], [48.0, 1.38, -3.1], kCam);

  const gStep = rp(f, evGedor + 10, evGeorge - 18);
  const gx = lerp(47.28, 47.42, gStep);
  const gz = lerp(-0.95, -1.90, gStep);

  const anneTalk = talkAt(f, lines[1]);
  const profTalk = talkAt(f, lines[2]);
  const knockBurst = f >= evGedor && f < evGedor + 26;

  return (
    <AbsoluteFill style={{ background: "#2e261e" }}>
      {rooms && (
        <ThreeCanvas width={1080} height={1920} dpr={0.65} gl={{ antialias: false }} shadows={false} camera={{ fov: 56, near: 0.1, far: 120 }}>
          <ambientLight intensity={0.62} color="#fff6e2" />
          <hemisphereLight args={["#ffebb8", "#5c4a38", 1.0]} />
          <directionalLight
            position={[48, 7, -8]}
            intensity={2.0}
            color="#ffd98a"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[48.0, 2.9, -0.5]} intensity={12} distance={14} decay={1.6} color="#ffebd0" />

          <primitive object={rooms} />

          {/* Prof. Neyman standing outside on the sunlit porch waving George's papers! */}
          <NeymanPlane
            position={[48.02, 0.92, -3.62]}
            expr="heboh"
            pose="wave_paper"
            talk={profTalk}
            scale={0.94}
          />
          <HomeworkStack3D
            position={[48.48, 1.58 + Math.sin(f * 0.45) * 0.08, -3.52]}
            rotation={[0.4, 0.2, -0.35 + Math.sin(f * 0.45) * 0.2]}
            stamped
          />

          {/* George pulling door open cleanly inside left side */}
          <GeorgePlane
            position={[gx, 0.88, gz]}
            expr={doorOpen > 0.4 ? "syok" : "panik"}
            pose={doorOpen > 0.1 && doorOpen < 0.95 ? "pull_door" : "idle"}
            rotY={0.22}
            scale={0.88}
          />

          {/* Anne startled cleanly inside right side */}
          <AnnePlane
            position={[48.55, 0.84, -1.65]}
            expr="kaget"
            pose="gasp"
            talk={anneTalk}
            rotY={-0.22}
            scale={0.88}
          />

          <CamRig pos={pos} look={look} fov={56} shake={shake} />
        </ThreeCanvas>
      )}
      <StoryBanner text="6 MINGGU KEMUDIAN" sub="MINGGU PAGI · JAM 08:00" color="#d9821e" show={f < evGeorge - 10} />
      {knockBurst && (
        <div
          style={{
            position: "absolute",
            top: 620,
            left: "50%",
            transform: `translateX(-50%) rotate(${Math.sin(f * 1.5) * 6}deg) scale(${1 + Math.abs(Math.sin(f * 0.9)) * 0.16})`,
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            fontSize: 96,
            color: "#ffde59",
            WebkitTextStroke: "14px #14121a",
            paintOrder: "stroke fill",
          }}
        >
          DOK! DOK! DOK!
        </div>
      )}
    </AbsoluteFill>
  );
};

// ===========================================================================
// ADEGAN 6 — PLOT TWIST: "ITU BUKAN PR!" + INSERT STAMP TERPECAHKAN!
// ===========================================================================
export const SceneDantzigTwist: React.FC = () => {
  const f = useCurrentFrame();
  const dur = TIMING.scenes.twist.durationInFrames;
  const lines = TIMING.lines.twist;
  const evBukan = TIMING.events["twist.bukan"] ?? 24;
  const evSerius = TIMING.events["twist.serius"] ?? Math.floor(dur * 0.45);
  const rooms = useLoadedGlb("models/dantzig_rooms.glb");

  useEffect(() => {
    if (!rooms) return;
    const pivot = rooms.getObjectByName("FrontDoor_Pivot");
    if (pivot) pivot.rotation.y = 1.42;
  }, [rooms]);

  const kCam = rp(f, 0, dur);
  const pos: Vec3 = lv([48.02, 1.60, 1.55], [47.98, 1.62, 1.72], kCam);
  const look: Vec3 = lv([48.0, 1.32, -2.5], [48.0, 1.30, -2.3], kCam);

  // Handover of paper from Prof. Neyman -> George's hands!
  const handOver = rp(f, evBukan, evBukan + 28);
  const paperPos: Vec3 = [
    lerp(48.08, 47.62, handOver),
    lerp(1.18, 1.12, handOver) + Math.sin(handOver * Math.PI) * 0.12,
    lerp(-3.10, -1.95, handOver),
  ];

  const insertStart = Math.max(20, evBukan + 8);
  const insertDur = 48; // 1.6s close-up insert with TERPECAHKAN stamp!
  const insertProg = (f - insertStart) / insertDur;

  const profTalk = talkAt(f, lines[0]);
  const anneTalk = talkAt(f, lines[1]);
  const joyMoment = f >= evSerius + 12;

  return (
    <AbsoluteFill style={{ background: "#2e261e" }}>
      {rooms && (
        <ThreeCanvas width={1080} height={1920} dpr={0.65} gl={{ antialias: false }} shadows={false} camera={{ fov: 56, near: 0.1, far: 120 }}>
          <ambientLight intensity={0.65} color="#fff6e2" />
          <hemisphereLight args={["#ffebb8", "#5c4a38", 1.0]} />
          <directionalLight
            position={[48, 7, -8]}
            intensity={2.0}
            color="#ffd98a"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[48.0, 2.9, -0.5]} intensity={12} distance={14} decay={1.6} color="#ffebd0" />

          <primitive object={rooms} />

          <NeymanPlane
            position={[48.02, 0.92, -3.55]}
            expr="takjub"
            pose={handOver < 0.85 ? "hand_paper" : "wave_paper"}
            talk={profTalk}
            scale={0.94}
          />
          <GeorgePlane
            position={[47.42, 0.88, -1.95]}
            expr={joyMoment ? "bangga" : "syok"}
            pose="reach_both"
            rotY={0.22}
            scale={0.88}
          />
          <AnnePlane
            position={[48.55, 0.84, -1.65]}
            expr={joyMoment ? "bangga" : "kaget"}
            pose={joyMoment ? "clap" : "gasp"}
            talk={anneTalk}
            rotY={-0.22}
            scale={0.88}
          />

          <HomeworkStack3D position={paperPos} rotation={[0.25, 0.2, 0]} stamped scale={1.15} />

          <CamRig pos={pos} look={look} fov={56} />
        </ThreeCanvas>
      )}
      {insertProg >= 0 && insertProg <= 1 && <InsertPaperStamp progress={insertProg} />}
    </AbsoluteFill>
  );
};

// ===========================================================================
// ADEGAN 7 — PENUTUP: DISERTASI DOKTOR & REVERSE FLY-OUT KELUAR JENDELA KAMPUS!
// ===========================================================================
export const SceneDantzigAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const dur = TIMING.scenes.akhir.durationInFrames;
  const school = useLoadedGlb("models/school.glb");

  // Reverse majestic fly-out: start inside classroom showing George + Anne + Prof + green checks
  // -> glide smoothly BACK OUT through the open 2nd-floor window to golden campus aerial!
  const { posCurve, lookCurve } = useMemo(() => {
    const p = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(6.15, 6.08, 1.05),
        new THREE.Vector3(6.20, 6.18, 2.2),
        new THREE.Vector3(6.20, 6.35, 5.2),
        new THREE.Vector3(4.2, 8.8, 12.5),
        new THREE.Vector3(-8.5, 14.5, 24.0),
      ],
      false,
      "catmullrom",
      0.4
    );
    const l = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(6.15, 6.05, -4.95),
        new THREE.Vector3(6.15, 6.10, -4.5),
        new THREE.Vector3(6.0, 6.2, -1.0),
        new THREE.Vector3(2.8, 6.4, 0.5),
        new THREE.Vector3(0.5, 6.2, -0.5),
      ],
      false,
      "catmullrom",
      0.4
    );
    return { posCurve: p, lookCurve: l };
  }, []);

  const flyT = rp(f, Math.floor(dur * 0.44), dur - 6);
  const cPos = posCurve.getPoint(flyT);
  const cLook = lookCurve.getPoint(flyT);
  const fov = lerp(54, 48, flyT);
  const solvedAnim = cl(f / 32);

  return (
    <AbsoluteFill style={{ background: "#232a40" }}>
      {school && (
        <ThreeCanvas width={1080} height={1920} dpr={0.65} gl={{ antialias: false }} shadows={false} camera={{ fov, near: 0.1, far: 400 }}>
          <SchoolLights />
          <primitive object={school} />
          <ChalkboardDantzigPlane solvedCheck={solvedAnim} />
          <ClassmatesRow />

          {/* All 3 heroes framed together cleanly in vertical 9:16! */}
          <GeorgePlane position={[6.15, 5.40, -3.75]} expr="bangga" pose="hold_binder" scale={0.94} />
          <ThesisBinder3D position={[6.15, 5.06, -3.56]} rotation={[0.10, 0.12, 0]} scale={0.72} />
          <AnnePlane position={[5.30, 5.36, -4.05]} expr="bangga" pose="clap" rotY={0.18} scale={0.90} />
          <NeymanPlane position={[7.00, 5.40, -4.08]} expr="heboh" pose="idle" rotY={-0.18} scale={0.92} />

          <CamRig pos={[cPos.x, cPos.y, cPos.z]} look={[cLook.x, cLook.y, cLook.z]} fov={fov} />
        </ThreeCanvas>
      )}
      <StoryBanner
        text="DISERTASI DOKTOR (PhD)"
        sub="GEORGE B. DANTZIG · UC BERKELEY"
        color="#238a46"
        show={f > 10 && f < Math.floor(dur * 0.65)}
      />
    </AbsoluteFill>
  );
};

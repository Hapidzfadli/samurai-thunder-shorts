import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import * as THREE from "three";
import timeline from "../public/audio/apache_timeline.json";
import {
  ApacheHelicopter3D,
  ArmoredVehicle3D,
  CountrysideNightEnv,
  XRayBlueprintGrid,
} from "./three/apacheObjects";

const FPS = 30;
export const TOTAL_FRAMES_APACHE = timeline.totalFrames;

/* ------------------------------------------------------------------ */
/* Exact Frame-Synchronized Camera Position & LookAt Controller       */
/* ------------------------------------------------------------------ */
const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}> = ({ position, target, fov = 44 }) => {
  const { camera } = useThree();
  const applyCamera = () => {
    camera.position.set(position[0], position[1], position[2]);
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateMatrixWorld();
  };
  applyCamera();
  useFrame(() => {
    applyCamera();
  });
  return null;
};

/* ------------------------------------------------------------------ */
/* Kinetic 1-2 Word Subtitles (Synced to Mak Ijah Audio Timeline)     */
/* ------------------------------------------------------------------ */
const KineticSubtitles: React.FC<{ frame: number }> = ({ frame }) => {
  const cue = timeline.captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const age = frame - cue.startFrame;
  const pop = interpolate(age, [0, 4], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 330,
        left: 60,
        right: 60,
        textAlign: "center",
        transform: `scale(${pop})`,
        fontFamily: "Inter, sans-serif",
        fontSize: 66,
        fontWeight: 800,
        letterSpacing: 0.5,
        color: cue.highlight ? "#facc15" : "#ffffff",
        textShadow:
          "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 8px 16px rgba(0,0,0,0.85)",
        pointerEvents: "none",
      }}
    >
      {cue.text}
    </div>
  );
};

/* ================================================================== */
/* SCENE 1: HOOK (Wide Night Apache -> Smooth Zoom Into Cockpit)      */
/* ================================================================== */
const Scene1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const isCloseup = f >= 120;

  const headYaw = Math.sin(t * 2.4) * 0.65;
  const headPitch = Math.sin(t * 1.4) * 0.12 - 0.08;
  const heliBob = Math.sin(t * 2.2) * 0.14;

  const camPos: [number, number, number] = isCloseup
    ? [
        interpolate(f, [120, 222], [0.65, 0.15]),
        interpolate(f, [120, 222], [1.28, 1.12]),
        interpolate(f, [120, 222], [3.95, 3.35]),
      ]
    : [
        interpolate(f, [0, 120], [11.2, 5.8]),
        interpolate(f, [0, 120], [1.1, 0.9]),
        interpolate(f, [0, 120], [6.8, 5.2]),
      ];

  const camTarget: [number, number, number] = isCloseup
    ? [0, 0.85 + heliBob, 1.72]
    : [0, 0.25 + heliBob, -0.3];

  return (
    <ThreeCanvas width={1080} height={1920}>
      <CameraRig position={camPos} target={camTarget} fov={isCloseup ? 44 : 46} />
      <color attach="background" args={["#162242"]} />
      <fog attach="fog" args={["#1e2d52", 26, 72]} />
      <ambientLight intensity={0.95} color="#cbd5e1" />
      <directionalLight position={[6, 12, 8]} intensity={1.4} color="#fef3c7" />
      <directionalLight position={[-6, 4, -8]} intensity={0.65} color="#60a5fa" />

      <CountrysideNightEnv scrollZ={t * 4.5} />
      <ApacheHelicopter3D
        position={[0, heliBob, 0]}
        rotation={[0.04, 0, Math.sin(t * 1.3) * 0.03]}
        rotorPhase={t * 28}
        headYaw={headYaw}
        headPitch={headPitch}
        gunYaw={headYaw}
        gunPitch={headPitch - 0.12}
        pilotExpression={isCloseup ? "focused" : "cool"}
      />
    </ThreeCanvas>
  );
};

/* ================================================================== */
/* SCENE 2: M230 CANNON FIRING -> BLUE X-RAY 1,200-ROUND MAGAZINE     */
/* ================================================================== */
const Scene2CannonXRay: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const isXRay = f >= 112;

  const fireBurst = !isXRay && f >= 32 && f <= 105 ? (Math.sin(f * 1.45) > 0.15 ? 1 : 0) : 0;

  // Firing tracer rounds flying away from the M230 barrel
  const tracers = [0, 1, 2, 3, 4].map((i) => {
    const prog = ((f - 30 + i * 14) % 45) / 45;
    return prog;
  });

  const camPos: [number, number, number] = isXRay
    ? [
        interpolate(f, [112, 228], [4.6, 3.2]),
        interpolate(f, [112, 228], [0.85, 0.35]),
        interpolate(f, [112, 228], [1.6, -2.0]),
      ]
    : [
        interpolate(f, [0, 112], [3.6, 2.5]),
        interpolate(f, [0, 112], [-0.45, -0.32]),
        interpolate(f, [0, 112], [5.8, 4.9]),
      ];

  const camTarget: [number, number, number] = isXRay ? [0, -0.1, -0.5] : [0, -0.45, 2.6];

  return (
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920}>
        <CameraRig position={camPos} target={camTarget} fov={45} />
        <color attach="background" args={[isXRay ? "#04162b" : "#182647"]} />
        <ambientLight intensity={isXRay ? 1.15 : 0.9} />
        <directionalLight position={[5, 10, 6]} intensity={1.5} color={isXRay ? "#7dd3fc" : "#fef3c7"} />

        {isXRay ? (
          <XRayBlueprintGrid y={-1.55} />
        ) : (
          <CountrysideNightEnv scrollZ={t * 5.2} />
        )}

        <ApacheHelicopter3D
          position={[0, isXRay ? 0 : Math.sin(t * 2.5) * 0.08, 0]}
          rotorPhase={t * 28}
          gunPitch={isXRay ? 0 : -0.18}
          fireFlash={fireBurst}
          xray={isXRay}
          showInternalAmmo={isXRay}
          pilotExpression="focused"
        />

        {/* Glowing 30mm Tracer Rounds streaking forward */}
        {!isXRay &&
          f >= 32 &&
          tracers.map((p, idx) => (
            <mesh
              key={idx}
              position={[0, -0.65 - p * 2.2, 3.5 + p * 12]}
              rotation={[Math.PI / 2 + 0.18, 0, 0]}
            >
              <capsuleGeometry args={[0.075, 0.65, 6, 8]} />
              <meshBasicMaterial color="#fb923c" />
            </mesh>
          ))}
      </ThreeCanvas>

      {/* Subtle Blueprint Telemetry Tag during X-Ray Mode */}
      {isXRay && (
        <div
          style={{
            position: "absolute",
            top: 120,
            left: 55,
            padding: "12px 24px",
            borderRadius: 12,
            border: "2px solid #38bdf8",
            background: "rgba(4, 22, 43, 0.78)",
            color: "#7dd3fc",
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1.5,
          }}
        >
          X-RAY // MAGAZEN 1.200 PELURU 30MM
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 3: TANDEM COCKPIT INFRARED HELMET TRACKING + GREEN AIM BEAM  */
/* ================================================================== */
const Scene3IrTracking: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const isExteriorAim = f >= 145;

  const headYaw = Math.sin(t * 2.1) * 0.72;
  const headPitch = -0.06 + Math.cos(t * 1.7) * 0.08;

  // Smooth orbital arc around the cockpit so camera NEVER clips through the helmet!
  const orbitAngle = interpolate(f, [0, 145], [0.85, -0.85]);
  const camPos: [number, number, number] = isExteriorAim
    ? [
        interpolate(f, [145, 256], [5.8, 6.8]),
        interpolate(f, [145, 256], [0.85, 0.55]),
        interpolate(f, [145, 256], [5.2, 6.2]),
      ]
    : [
        Math.sin(orbitAngle) * 3.5,
        1.55,
        1.35 + Math.cos(orbitAngle) * 2.8,
      ];

  const camTarget: [number, number, number] = isExteriorAim
    ? [0, 0.25, 1.8]
    : [0, 0.88, 1.35];

  return (
    <ThreeCanvas width={1080} height={1920}>
      <CameraRig position={camPos} target={camTarget} fov={44} />
      <color attach="background" args={["#1c2747"]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[6, 10, 8]} intensity={1.4} color="#fde68a" />
      <CountrysideNightEnv scrollZ={t * 4.0} />
      <ApacheHelicopter3D
        position={[0, Math.sin(t * 2) * 0.08, 0]}
        rotorPhase={t * 28}
        headYaw={headYaw}
        headPitch={headPitch}
        gunYaw={headYaw}
        gunPitch={headPitch - 0.14}
        showIrSensors={!isExteriorAim}
        showAimLaser
        pilotExpression="cool"
      />
    </ThreeCanvas>
  );
};

/* ================================================================== */
/* SCENE 4: NOSE FLIR CAMERA -> SPLIT-SCREEN DUAL-EYE THERMAL POV     */
/* ================================================================== */
const Scene4FlirSplit: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const isSplit = f >= 98;
  const headYaw = Math.sin(t * 2.6) * 0.55;

  if (!isSplit) {
    // Part A: Macro close-up on the glowing blue FLIR sensor lenses at the nose
    const camPos: [number, number, number] = [
      interpolate(f, [0, 98], [1.8, -1.5]),
      interpolate(f, [0, 98], [0.3, 0.45]),
      interpolate(f, [0, 98], [5.2, 4.8]),
    ];
    return (
      <ThreeCanvas width={1080} height={1920}>
        <CameraRig position={camPos} target={[0, 0.12, 2.9]} fov={42} />
        <color attach="background" args={["#131e3b"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 8]} intensity={1.4} color="#bae6fd" />
        <CountrysideNightEnv scrollZ={t * 3.5} />
        <ApacheHelicopter3D
          rotorPhase={t * 28}
          headYaw={headYaw}
          gunYaw={headYaw}
          pilotExpression="focused"
        />
      </ThreeCanvas>
    );
  }

  // Part B: TRUE SPLIT-SCREEN POV (Left Eye = Dark Cockpit | Right Eye = Green FLIR Thermal!)
  const panX = interpolate(f, [98, 218], [-1.8, 0.2]);
  const lockPulse = 0.92 + Math.sin(t * 14) * 0.08;

  return (
    <AbsoluteFill style={{ flexDirection: "row", display: "flex", backgroundColor: "#000" }}>
      {/* LEFT EYE: Dark Cockpit Interior looking out windshield over dashboard */}
      <div style={{ width: 540, height: 1920, position: "relative", overflow: "hidden" }}>
        <ThreeCanvas width={540} height={1920}>
          <CameraRig position={[0, 1.05, 1.98]} target={[panX * 0.2, 0.65, 6.0]} fov={56} />
          <color attach="background" args={["#0b152c"]} />
          <ambientLight intensity={0.65} color="#64748b" />
          <directionalLight position={[2, 5, 4]} intensity={0.75} color="#cbd5e1" />
          <CountrysideNightEnv scrollZ={t * 3.0} />
          <ApacheHelicopter3D rotorPhase={t * 28} />
        </ThreeCanvas>
        <div
          style={{
            position: "absolute",
            top: 130,
            left: 24,
            right: 24,
            textAlign: "center",
            padding: "10px 14px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "2px solid #94a3b8",
            borderRadius: 10,
            color: "#e2e8f0",
            fontFamily: "Inter, sans-serif",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          MATA KIRI (GELAP)
        </div>
      </div>

      {/* RIGHT EYE: Bright Green FLIR Thermal Vision Locking Onto Hot Armored Target */}
      <div style={{ width: 540, height: 1920, position: "relative", overflow: "hidden", borderLeft: "6px solid #4ade80" }}>
        <ThreeCanvas width={540} height={1920}>
          <CameraRig position={[panX, 3.6, 12.2]} target={[0, 0.7, 0]} fov={40} />
          <color attach="background" args={["#052e16"]} />
          <ambientLight intensity={0.85} color="#22c55e" />
          <directionalLight position={[4, 10, 6]} intensity={1.2} color="#86efac" />
          {/* Thermal forest floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[50, 50]} />
            <meshBasicMaterial color="#064e24" />
          </mesh>
          {/* Cool forest trees */}
          {[-4.2, -2.8, 3.1, 4.6, -3.5, 2.7].map((tx, i) => (
            <mesh key={i} position={[tx, 1.5, -2 - i * 1.4]}>
              <coneGeometry args={[1.1, 3.0, 6]} />
              <meshBasicMaterial color="#0b662f" />
            </mesh>
          ))}
          {/* White-hot Glowing Armored Vehicle! */}
          <ArmoredVehicle3D position={[0, 0, 0]} rotation={[0, 0.65, 0]} thermal />
        </ThreeCanvas>

        {/* FLIR Green HUD Crosshair Reticle Overlay */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 240,
            height: 240,
            marginLeft: -120,
            marginTop: -120,
            border: "5px solid #4ade80",
            borderRadius: 16,
            transform: `scale(${lockPulse})`,
            boxShadow: "0 0 28px rgba(74, 222, 128, 0.7)",
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "absolute", top: "50%", left: -30, right: -30, height: 3, background: "#4ade80" }} />
          <div style={{ position: "absolute", left: "50%", top: -30, bottom: -30, width: 3, background: "#4ade80" }} />
        </div>

        <div
          style={{
            position: "absolute",
            top: 130,
            left: 24,
            right: 24,
            textAlign: "center",
            padding: "10px 14px",
            background: "rgba(5, 46, 22, 0.85)",
            border: "2px solid #4ade80",
            borderRadius: 10,
            color: "#86efac",
            fontFamily: "Inter, sans-serif",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          MATA KANAN (THERMAL)
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* SCENE 5: BALLISTIC TRAJECTORY ARC -> ARMORED TARGET EXPLOSION      */
/* ================================================================== */
const Scene5BallisticStrike: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const isImpact = f >= 102;

  // Parabolic ballistic dots from Apache [-7, 2.5, 0] to Vehicle [0, -8.5, -2]
  const arcDots = new Array(16).fill(0).map((_, i) => {
    const u = i / 15;
    const x = interpolate(u, [0, 1], [-6.2, 0]);
    const y = interpolate(u, [0, 1], [1.6, -8.3]) + Math.sin(u * Math.PI) * 2.2;
    const z = interpolate(u, [0, 1], [2.5, -2.0]);
    const active = ((f * 0.45) % 16) >= i;
    return { x, y, z, active };
  });

  const explode = isImpact
    ? interpolate(f, [118, 188], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  const shakeX = explode > 0.02 && explode < 0.65 ? Math.sin(f * 3.1) * 0.25 : 0;
  const shakeY = explode > 0.02 && explode < 0.65 ? Math.cos(f * 3.7) * 0.2 : 0;

  const camPos: [number, number, number] = isImpact
    ? [3.8 + shakeX, -6.4 + shakeY, 5.4]
    : [
        interpolate(f, [0, 102], [-2.5, 1.5]),
        interpolate(f, [0, 102], [4.5, 2.2]),
        interpolate(f, [0, 102], [14.5, 12.2]),
      ];

  const camTarget: [number, number, number] = isImpact ? [0, -8.2, -2.0] : [-1.8, -4.5, -0.8];

  return (
    <ThreeCanvas width={1080} height={1920}>
      <CameraRig position={camPos} target={camTarget} fov={46} />
      <color attach="background" args={["#1c2a4d"]} />
      <fog attach="fog" args={["#233357", 28, 78]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[8, 14, 10]} intensity={1.5} color="#fde68a" />

      <CountrysideNightEnv scrollZ={0} />

      {/* Flying Apache on upper left firing down */}
      <ApacheHelicopter3D
        position={[-6.8 + t * 0.55, 2.2, 2.5]}
        rotation={[0.08, 1.1, -0.05]}
        scale={0.78}
        rotorPhase={t * 28}
        fireFlash={!isImpact && Math.sin(f * 1.4) > 0.2 ? 1 : 0}
      />

      {/* Glowing Ballistic Trajectory Dots */}
      {!isImpact &&
        arcDots.map((d, i) => (
          <mesh key={i} position={[d.x, d.y, d.z]} scale={d.active ? 1.1 : 0.65}>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshBasicMaterial color={d.active ? "#fef08a" : "#fb923c"} />
          </mesh>
        ))}

      {/* Red Laser Rangefinder Line onto Target */}
      {isImpact && explode < 0.15 && (
        <mesh position={[-2.5, -5.8, -0.5]} rotation={[0.45, 0.35, -0.82]}>
          <cylinderGeometry args={[0.05, 0.05, 9.5, 8]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
        </mesh>
      )}

      {/* Armored Target Vehicle on the Dirt Road */}
      <ArmoredVehicle3D
        position={[0, -9.45, -2.0]}
        rotation={[0, 0.45, 0]}
        explodeProgress={explode}
      />
    </ThreeCanvas>
  );
};

/* ================================================================== */
/* SCENE 6: CRASH SAFETY X-RAY GUN FOLD -> GOLDEN DAWN FINALE         */
/* ================================================================== */
const Scene6SafetyOutro: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const isDawnFinale = f >= 145;

  const gunFoldUp = interpolate(f, [25, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headYaw = isDawnFinale ? interpolate(f, [160, 225], [0, 0.72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  const camPos: [number, number, number] = isDawnFinale
    ? [
        interpolate(f, [145, 243], [4.2, 6.8]),
        interpolate(f, [145, 243], [0.85, 1.15]),
        interpolate(f, [145, 243], [4.5, 6.2]),
      ]
    : [
        interpolate(f, [0, 145], [4.4, 3.6]),
        interpolate(f, [0, 145], [0.55, 0.45]),
        interpolate(f, [0, 145], [1.4, 1.6]),
      ];

  const camTarget: [number, number, number] = isDawnFinale ? [0, 0.25, 0.8] : [0, 0.3, 1.25];

  return (
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1920}>
        <CameraRig position={camPos} target={camTarget} fov={44} />
        <color attach="background" args={[isDawnFinale ? "#5c4d66" : "#04162b"]} />
        <ambientLight intensity={isDawnFinale ? 1.05 : 1.15} color={isDawnFinale ? "#fde68a" : "#bae6fd"} />
        <directionalLight position={[6, 10, 6]} intensity={1.6} color={isDawnFinale ? "#fbbf24" : "#7dd3fc"} />

        {isDawnFinale ? (
          <CountrysideNightEnv scrollZ={t * 4.2} moonY={7.5} dawnFactor={1} />
        ) : (
          <XRayBlueprintGrid y={-1.5} />
        )}

        <ApacheHelicopter3D
          position={[0, isDawnFinale ? Math.sin(t * 2.2) * 0.12 : 0, 0]}
          rotorPhase={t * 28}
          xray={!isDawnFinale}
          gunFoldUp={isDawnFinale ? 0 : gunFoldUp}
          headYaw={headYaw}
          gunYaw={headYaw}
          pilotExpression={isDawnFinale ? "smile" : "shocked"}
        />
      </ThreeCanvas>

      {!isDawnFinale && (
        <div
          style={{
            position: "absolute",
            top: 120,
            left: 55,
            padding: "12px 24px",
            borderRadius: 12,
            border: "2px solid #38bdf8",
            background: "rgba(4, 22, 43, 0.78)",
            color: "#7dd3fc",
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1.5,
          }}
        >
          X-RAY // SISTEM LIPAT DARURAT MERIAM
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* MAIN MASTER COMPOSITION                                            */
/* ================================================================== */
export const ApacheDetailed: React.FC = () => {
  const frame = useCurrentFrame();
  const s = timeline.scenes;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <Audio src={staticFile("audio/apache_master.mp3")} />

      <Sequence from={0} durationInFrames={s[0].startFrame + s[0].durationInFrames}>
        <Scene1Hook />
      </Sequence>
      <Sequence from={s[1].startFrame} durationInFrames={s[1].durationInFrames}>
        <Scene2CannonXRay />
      </Sequence>
      <Sequence from={s[2].startFrame} durationInFrames={s[2].durationInFrames}>
        <Scene3IrTracking />
      </Sequence>
      <Sequence from={s[3].startFrame} durationInFrames={s[3].durationInFrames}>
        <Scene4FlirSplit />
      </Sequence>
      <Sequence from={s[4].startFrame} durationInFrames={s[4].durationInFrames}>
        <Scene5BallisticStrike />
      </Sequence>
      <Sequence from={s[5].startFrame} durationInFrames={s[5].durationInFrames}>
        <Scene6SafetyOutro />
      </Sequence>

      <KineticSubtitles frame={frame} />
    </AbsoluteFill>
  );
};

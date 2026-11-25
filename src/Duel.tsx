import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import timingRaw from "./duel_timing.json";
import {
  Cam,
  CinematicStage,
  GoldenWildWestLighting,
  ModernDeskLighting,
  PostFXProps,
  Vec3,
} from "./three/CinematicPipeline";
import {
  CowboyCharacter,
  CowboyExpr,
  HollywoodBulletCam,
  ModernDeskSet,
  Revolver3D,
  TownsfolkBystander,
  WildWestTown,
} from "./three/objectsDuel";

type WordT = { w: string; from: number; to: number };
type LineT = { id: string; speaker: string; text: string; from: number; to: number; words: WordT[] };
type SceneT = { scene: string; from: number; to: number; lines: LineT[] };
type TimingT = {
  fps: number;
  totalFrames: number;
  totalSec: number;
  bulletCam: {
    triggerFrame: number;
    slowStartFrame: number;
    slowEndFrame: number;
    impactFrame: number;
  };
  scenes: SceneT[];
};

const TIMING = timingRaw as TimingT;
export const TOTAL_FRAMES_DUEL = TIMING.totalFrames;

const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x: number) => {
  const t = cl(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const rp = (f: number, a: number, b: number) => sm((f - a) / Math.max(1, b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lv = (a: Vec3, b: Vec3, k: number): Vec3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function activeLine(f: number): { scene: string; line: LineT | null } {
  for (const sc of TIMING.scenes) {
    if (f >= sc.from && f < sc.to) {
      for (const ln of sc.lines) {
        if (f >= ln.from && f < ln.to) return { scene: sc.scene, line: ln };
      }
      return { scene: sc.scene, line: null };
    }
  }
  return { scene: TIMING.scenes[TIMING.scenes.length - 1]?.scene ?? "payoff", line: null };
}

function talkLevel(f: number, ln: LineT | null, speaker: string): number {
  if (!ln || ln.speaker !== speaker) return 0;
  return 0.25 + 0.75 * Math.abs(Math.sin(f * 0.95));
}

// 1-2 Word Viral Subtitle Overlay + Sleek Speaker Badge
const ViralSubtitle: React.FC<{ f: number }> = ({ f }) => {
  let chunk = "";
  let born = 0;
  let activeSpeaker = "";

  for (const sc of TIMING.scenes) {
    for (const ln of sc.lines) {
      if (f >= ln.from && f <= ln.to && ln.speaker !== "qinmu") {
        activeSpeaker =
          ln.speaker === "sombong"
            ? "RICO (PENANTANG)"
            : ln.speaker === "ara"
            ? "WARGA KOTA"
            : ln.speaker === "bang_udin"
            ? "BANG JEK"
            : "";
      }
      const ws = ln.words;
      // Group into 1-2 word pairs for ultra-punchy readability
      for (let i = 0; i < ws.length; i += 2) {
        const w1 = ws[i];
        const w2 = i + 1 < ws.length ? ws[i + 1] : null;
        const pairStart = w1.from - 1;
        const nextStart = i + 2 < ws.length ? ws[i + 2].from : (w2 ? w2.to : w1.to) + 6;
        if (f >= pairStart && f < nextStart) {
          chunk = w2 ? `${w1.w} ${w2.w}` : w1.w;
          born = pairStart;
        }
      }
    }
  }

  const badgeColor =
    activeSpeaker.includes("RICO")
      ? "#ff5252"
      : activeSpeaker.includes("BANG JEK")
      ? "#ffd23f"
      : "#6ec6ff";

  const pop = chunk ? 1 + 0.1 * Math.max(0, 1 - (f - born) / 4) : 1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {activeSpeaker && (
        <div
          style={{
            position: "absolute",
            top: 1295,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(12, 12, 18, 0.82)",
            border: `2.5px solid ${badgeColor}`,
            borderRadius: 999,
            padding: "6px 20px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: 1.5,
            color: badgeColor,
          }}
        >
          {activeSpeaker}
        </div>
      )}
      {chunk && (
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          <text
            x={540}
            y={1435}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontWeight={900}
            fontSize={76 * pop}
            fill="#ffffff"
            stroke="#0b0b10"
            strokeWidth={16}
            strokeLinejoin="round"
            paintOrder="stroke fill"
          >
            {chunk.toUpperCase()}
          </text>
        </svg>
      )}
    </AbsoluteFill>
  );
};

// Hook Title Banner (0 - 3s)
const HookBanner: React.FC<{ f: number }> = ({ f }) => {
  if (f > 95) return null;
  const k = rp(f, 2, 10) * (1 - rp(f, 82, 95));
  return (
    <div
      style={{
        position: "absolute",
        top: 165,
        left: 60,
        right: 60,
        textAlign: "center",
        opacity: k,
        transform: `scale(${0.86 + 0.14 * k})`,
        fontFamily: "Anton, Inter, sans-serif",
        fontSize: 64,
        lineHeight: 1.08,
        color: "#ffd23f",
        textShadow: "0 6px 0 #120d16, 0 0 24px rgba(0,0,0,0.7)",
        pointerEvents: "none",
      }}
    >
      YANG TEMBAK DULUAN
      <br />
      <span style={{ color: "#ffffff", fontSize: 56 }}>JUSTRU KALAH?!</span>
    </div>
  );
};

export const Duel: React.FC = () => {
  const f = useCurrentFrame();
  const { scene, line } = activeLine(f);
  const bc = TIMING.bulletCam;

  // Scene frame boundaries
  const sSetup = TIMING.scenes[1].from;
  const sMocker = TIMING.scenes[2].from;
  const sEsk = TIMING.scenes[3].from;
  const sAnalogi = TIMING.scenes[4].from;
  const sPayoff = TIMING.scenes[5].from;

  const isAnalogi = f >= sAnalogi && f < sPayoff;
  const isSlowMo = f >= bc.slowStartFrame && f < bc.slowEndFrame;
  const postImpact = f >= bc.impactFrame;

  // Slow-mo time dilation factor for world motion (0.04x freeze during Bullet-Cam!)
  const worldTime = isSlowMo
    ? bc.slowStartFrame + (f - bc.slowStartFrame) * 0.04
    : f;

  // Positions of the two duelists along the clear street corridor (x = 0)
  const JEK_POS: Vec3 = [0, 0, 5.2]; // Old calm cowboy (facing -Z toward Rico)
  const RICO_POS: Vec3 = [0, 0, -5.2]; // Young cocky challenger (facing +Z toward Jek)

  // Character Micro-Acting & Expressions
  const jekBlink = (f % 115) >= 111;
  const ricoBlink = ((f + 42) % 98) >= 94;

  const jekExpr: CowboyExpr = f >= sPayoff - 15 ? "focused" : "deadpan";
  let ricoExpr: CowboyExpr = "smug";
  if (f >= sEsk && f < sAnalogi) ricoExpr = f >= sEsk + 110 ? "angry" : "smug";
  if (postImpact) ricoExpr = "shocked";

  // Arm draw angles
  const jekDraw =
    f < bc.triggerFrame - 12
      ? 0.08
      : f < bc.triggerFrame
      ? lerp(0.08, 1.38, rp(f, bc.triggerFrame - 12, bc.triggerFrame))
      : 1.38;
  const jekGunInHand = f >= bc.triggerFrame - 8;

  const ricoStartsDraw = f >= sEsk + 125 && f < sAnalogi;
  const ricoDraw = ricoStartsDraw
    ? lerp(0.1, 0.95, rp(f, sEsk + 125, sAnalogi - 4))
    : f >= sPayoff && !postImpact
    ? 1.15
    : postImpact
    ? lerp(1.15, 1.75, rp(f, bc.impactFrame, bc.impactFrame + 10)) // arm knocked back!
    : 0.1;
  const ricoGunInHand = (f >= sEsk + 130 && f < sAnalogi) || (f >= sPayoff && !postImpact);

  // Flying revolver after impact!
  const flyK = postImpact ? rp(f, bc.impactFrame, bc.impactFrame + 28) : 0;
  const flyingGunPos: Vec3 = [
    lerp(-0.3, -1.65, flyK),
    lerp(1.32, 0.08, flyK * flyK) + Math.sin(flyK * Math.PI) * 1.1,
    lerp(-4.5, -5.8, flyK),
  ];
  const flyingGunRot: Vec3 = [flyK * 9.5, flyK * 4.2, flyK * 7.0];

  // Bullet trajectory during Hollywood Bullet-Cam (from Bang Jek's muzzle to Rico's revolver)
  const slowP = isSlowMo ? cl((f - bc.slowStartFrame) / Math.max(1, bc.slowEndFrame - bc.slowStartFrame)) : 0;
  const muzzlePos: Vec3 = [-0.3, 1.32, 4.45];
  const targetPos: Vec3 = [-0.3, 1.32, -4.55];
  const bulletPos: Vec3 = lv(muzzlePos, targetPos, lerp(0.08, 0.94, slowP));

  // Camera Choreography (Low-Wide Continuous Glide + Planned Close-Up / 160° Reverse / Match-Cut / Bullet-Cam)
  let cam: Cam = { pos: [1.6, 1.15, 7.8], look: [0, 1.25, -1.5], fov: 44 };
  let shake: Vec3 = [0, 0, 0];
  let postfx: PostFXProps = {
    dofTarget: [0, 1.3, 2.0],
    dofRange: 11.0,
    bokehScale: 1.6,
    bloomIntensity: 0.55,
  };

  if (f < sSetup) {
    // 1. Hook: Low-wide continuous glide behind Bang Jek looking down the dusty street at Rico
    const k = rp(f, 0, sSetup);
    cam = {
      pos: lv([1.75, 1.05, 8.2], [1.15, 1.18, 6.8], k),
      look: lv([0, 1.25, 0], [0, 1.35, -1.5], k),
      fov: 44,
    };
    postfx = { dofTarget: JEK_POS, dofRange: 9.0, bokehScale: 2.0, bloomIntensity: 0.58 };
  } else if (f < sMocker) {
    // 2. Setup: Smooth wide lateral dolly across the street showing both duelists
    const k = rp(f, sSetup, sMocker);
    cam = {
      pos: lv([3.2, 1.35, 2.5], [3.5, 1.35, -2.4], k),
      look: lv([0, 1.3, 1.2], [0, 1.3, -1.2], k),
      fov: 42,
    };
    postfx = { dofTarget: [0, 1.3, 0], dofRange: 10.0, bokehScale: 1.5, bloomIntensity: 0.55 };
  } else if (f < sEsk) {
    // 3. The Mocker: 160° Reverse-Angle POV on Rico mocking -> glide to Bang Jek's deadpan face
    const split = sSetup + (sMocker - sSetup) + 105; // ~3.5s on Rico
    if (f < split) {
      const k = rp(f, sMocker, split);
      cam = {
        pos: lv([-0.95, 1.48, -3.35], [-0.72, 1.52, -3.65], k),
        look: [0, 1.52, -5.2],
        fov: 38,
      };
      postfx = { dofTarget: [0, 1.52, -5.2], dofRange: 2.5, bokehScale: 4.0, bloomIntensity: 0.55 };
    } else {
      const k = rp(f, split, sEsk);
      cam = {
        pos: lv([0.85, 1.48, 3.35], [0.65, 1.52, 3.65], k),
        look: [0, 1.52, 5.2],
        fov: 38,
      };
      postfx = { dofTarget: [0, 1.52, 5.2], dofRange: 2.2, bokehScale: 4.5, bloomIntensity: 0.55 };
    }
  } else if (f < sAnalogi) {
    // 4. Escalation 3x: Extreme Close-Up Holster -> Bystanders -> Rico 160° Reverse -> Rico Draw
    const t1 = sEsk + 100;
    const t2 = sEsk + 205;
    const t3 = sEsk + 305;
    if (f < t1) {
      // Extreme Close-Up on Bang Jek's calm hand hovering over holster + DOF bokeh
      const k = rp(f, sEsk, t1);
      cam = {
        pos: lv([-0.92, 0.92, 4.45], [-0.82, 0.9, 4.6], k),
        look: [-0.28, 0.85, 5.2],
        fov: 32,
      };
      postfx = { dofTarget: [-0.28, 0.85, 5.2], dofRange: 0.9, bokehScale: 6.0, bloomIntensity: 0.55 };
    } else if (f < t2) {
      // Bystanders on Saloon porch reacting
      const k = rp(f, t1, t2);
      cam = {
        pos: lv([-2.2, 1.45, 0.9], [-2.5, 1.48, 0.5], k),
        look: [-4.6, 1.35, -0.4],
        fov: 38,
      };
      postfx = { dofTarget: [-4.6, 1.35, -0.4], dofRange: 2.8, bokehScale: 3.5, bloomIntensity: 0.6 };
    } else if (f < t3) {
      // Rico cocky close-up
      const k = rp(f, t2, t3);
      cam = {
        pos: lv([0.85, 1.55, -3.65], [0.65, 1.58, -3.85], k),
        look: [0, 1.55, -5.2],
        fov: 34,
      };
      postfx = { dofTarget: [0, 1.55, -5.2], dofRange: 1.8, bokehScale: 5.0, bloomIntensity: 0.55 };
    } else {
      // Rico draws first! Tight low-angle on his gun hand
      const k = rp(f, t3, sAnalogi);
      cam = {
        pos: lv([-1.15, 0.95, -4.15], [-0.95, 1.15, -4.05], k),
        look: [-0.25, 1.05, -5.1],
        fov: 36,
      };
      postfx = { dofTarget: [-0.25, 1.05, -5.1], dofRange: 1.5, bokehScale: 5.2, bloomIntensity: 0.6 };
    }
  } else if (isAnalogi) {
    // 5. Match-Cut Modern Desk Analogy (Phone sliding off desk + Hand reflex catch!)
    const k = rp(f, sAnalogi, sPayoff);
    cam = {
      pos: lv([1.55, 1.36, 2.05], [1.28, 1.15, 1.85], k),
      look: [0.48, 0.72, 0.16],
      fov: 44,
    };
    postfx = { dofTarget: [0.65, 0.72, 0.24], dofRange: 2.2, bokehScale: 3.8, bloomIntensity: 0.65 };
  } else if (f < bc.slowStartFrame) {
    // 6a. Payoff Lead-in: Match-cut back to Bang Jek drawing faster & saying "Terlambat, anak muda."
    const k = rp(f, sPayoff, bc.slowStartFrame);
    cam = {
      pos: lv([0.85, 1.38, 3.65], [-0.65, 1.34, 3.85], k),
      look: [-0.15, 1.36, 4.95],
      fov: 36,
    };
    postfx = { dofTarget: [-0.15, 1.36, 4.95], dofRange: 1.8, bokehScale: 4.8, bloomIntensity: 0.7 };
  } else if (isSlowMo) {
    // 6b. HOLLYWOOD BULLET-CAM MACRO SLOW-MO (28cm Macro Orbit 100° from front-side to rear-side!)
    const orbitAngle = lerp(-2.05, -0.3, slowP); // ~100° cinematic side sweep!
    const dist = 0.28; // 28 cm from bullet!
    const cx = bulletPos[0] + Math.sin(orbitAngle) * dist;
    const cy = bulletPos[1] + 0.04 + Math.sin(slowP * Math.PI) * 0.025;
    const cz = bulletPos[2] + Math.cos(orbitAngle) * dist;
    cam = { pos: [cx, cy, cz], look: bulletPos, fov: 36 };
    // Subtle handheld micro-shake as shockwave passes lens
    shake = [
      Math.sin(f * 1.9) * 0.004,
      Math.cos(f * 2.3) * 0.003,
      0,
    ];
    postfx = {
      dofTarget: bulletPos,
      dofRange: 0.45,
      bokehScale: 6.5,
      bloomIntensity: 0.75,
    };
  } else {
    // 6c. Post-Impact Shock & Auto-Loop Lead-Out
    const k = rp(f, bc.impactFrame, TIMING.totalFrames);
    cam = {
      pos: lv([-1.35, 1.35, -3.45], [-2.1, 1.48, -2.2], k),
      look: [0, 1.35, -5.2],
      fov: 40,
    };
    if (f < bc.impactFrame + 10) {
      const impA = (1 - (f - bc.impactFrame) / 10) * 0.08;
      shake = [Math.sin(f * 3.1) * impA, Math.cos(f * 2.7) * impA, 0];
    }
    postfx = { dofTarget: [0, 1.42, -5.2], dofRange: 3.5, bokehScale: 3.8, bloomIntensity: 0.6 };
  }

  // Analogy phone slide & hand catch progress
  const phoneSlide = isAnalogi ? rp(f, sAnalogi + 35, sAnalogi + 240) : 0;
  const handCatch = isAnalogi ? rp(f, sAnalogi + 225, sAnalogi + 310) : 0;

  return (
    <AbsoluteFill>
      <Audio src={staticFile("audio/duel_master.mp3")} />
      <CinematicStage cam={cam} shake={shake} postfx={postfx}>
        {isAnalogi ? (
          <>
            <ModernDeskLighting />
            <ModernDeskSet frame={f} phoneSlide={phoneSlide} handCatch={handCatch} />
          </>
        ) : (
          <>
            <GoldenWildWestLighting sunBoost={isSlowMo ? 1.25 : 1.0} />
            <WildWestTown frame={worldTime} />

            {/* Bang Jek (Calm Old Cowboy) */}
            <CowboyCharacter
              pos={JEK_POS}
              yaw={Math.PI}
              coatColor="#8c6239"
              vestColor="#3a2b24"
              hatColor="#4e3624"
              kerchiefColor="#a83226"
              hasMustache
              mustacheColor="#d0d4dc"
              expr={jekExpr}
              talk={talkLevel(f, line, "bang_udin")}
              blink={jekBlink}
              breathe={worldTime}
              armAngle={jekDraw}
              fingerTwitch={f >= sEsk && f < sAnalogi ? Math.sin(worldTime * 0.25) * 0.04 : 0}
              gunInHand={jekGunInHand}
              gunInHolster={!jekGunInHand}
              gunFinish="steel"
            />

            {/* Rico (Cocky Young Challenger) */}
            <CowboyCharacter
              pos={RICO_POS}
              yaw={0}
              coatColor="#2b2630"
              vestColor="#782228"
              hatColor="#1e1b22"
              kerchiefColor="#d49b35"
              expr={ricoExpr}
              talk={talkLevel(f, line, "sombong")}
              blink={ricoBlink}
              breathe={worldTime + 18}
              armAngle={ricoDraw}
              fingerTwitch={f >= sEsk && f < sAnalogi ? Math.sin(worldTime * 0.7) * 0.14 : 0}
              sweat={f >= sEsk && f < sAnalogi ? rp(f, sEsk + 30, sEsk + 140) : 0}
              lean={postImpact ? -0.18 : 0}
              gunInHand={ricoGunInHand}
              gunInHolster={!ricoGunInHand && !postImpact}
              gunFinish="silver"
              hatTilt={postImpact ? -0.28 : -0.14}
            />

            {/* Rico's Flying Revolver after impact! */}
            {postImpact && <Revolver3D pos={flyingGunPos} rot={flyingGunRot} scale={1.05} finish="silver" />}

            {/* Townsfolk Bystanders on Saloon Porch */}
            <TownsfolkBystander
              pos={[-4.8, 0.24, -0.5]}
              yaw={Math.PI / 2}
              shirtColor="#b5524c"
              hatColor="#7a5b3e"
              talk={talkLevel(f, line, "ara")}
              lean={f >= sEsk ? 0.12 : 0}
            />
            <TownsfolkBystander
              pos={[-4.8, 0.24, 0.8]}
              yaw={Math.PI / 2}
              shirtColor="#4d6b8a"
              hatColor="#3d2e22"
              lean={f >= sEsk ? 0.08 : 0}
            />

            {/* HOLLYWOOD BULLET-CAM HERO SHOT */}
            {isSlowMo && (
              <HollywoodBulletCam
                bulletPos={bulletPos}
                muzzlePos={muzzlePos}
                slowMoProgress={slowP}
                frame={f}
              />
            )}
          </>
        )}
      </CinematicStage>

      <HookBanner f={f} />
      <ViralSubtitle f={f} />
    </AbsoluteFill>
  );
};

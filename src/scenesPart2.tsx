import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Explosion, Ocean, Samurai, Ship, Vec3 } from "./three/objects";
import { FloatingWreckage, IronChain, RaidBoat, SinkingShip, StoneWall, TyphoonVortex } from "./three/objectsPart2";
import {
  Bolt,
  Caption,
  FONT_BODY,
  FONT_JP,
  FONT_TITLE,
  GOLD,
  Kicker,
  NightSky,
  RED,
  Rain,
  SceneFade,
  lightning,
} from "./ui";

const CYAN = "#5ce1ff";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

export const DURATIONS_P2 = {
  hook: 120,
  wall: 210,
  chains: 240,
  typhoon: 210,
  outro: 120,
};

const Canvas: React.FC<{ children: React.ReactNode; fov?: number }> = ({ children, fov = 50 }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov, near: 0.1, far: 400, position: [0, 2, 10] }}>
      {children}
    </ThreeCanvas>
  );
};

/* ================================================================== */
/* 1. HOOK — Part 2: The Kamikaze Mega Storm                          */
/* ================================================================== */
export const SceneP2Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flash = lightning(frame, [10, 68]);

  const l1 = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  const l2 = spring({ frame: frame - 14, fps, config: { damping: 11 } });
  const l3 = spring({ frame: frame - 68, fps, config: { damping: 9, stiffness: 190 } });
  const shake = flash * 15;

  return (
    <AbsoluteFill>
      <NightSky storm flash={flash} />
      <Canvas fov={56}>
        <CameraRig
          position={[Math.sin(t * 1.4) * 0.6, 2.2 + Math.cos(t * 1.8) * 0.25, 13 - t * 1.4]}
          lookAt={[0, 1.4, -22]}
        />
        <ambientLight intensity={0.7 + flash * 2.5} color="#8098c8" />
        <directionalLight position={[-12, 14, -20]} intensity={1.8 + flash * 6} color="#bcd4ff" />
        <Ocean t={t * 1.6} amp={2.1} flash={flash} deep="#040c1a" crest="#2b4c6f" fog="#101826" />
        {[-7, 0, 8].map((x, i) => (
          <SinkingShip
            key={i}
            position={[x, 0, -24 - i * 5]}
            t={t * 1.5}
            phase={i * 1.8}
            scale={1.25}
            listAngle={(i - 1) * 0.18}
          />
        ))}
      </Canvas>
      <Bolt visible={lightning(frame, [10])} seed="p2b1" x={760} />
      <Bolt visible={lightning(frame, [68])} seed="p2b2" x={290} />
      <Rain count={95} />

      <div
        style={{
          position: "absolute",
          top: 310,
          width: "100%",
          textAlign: "center",
          transform: `translate(${Math.sin(frame * 9) * shake}px, ${Math.cos(frame * 7) * shake}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 60,
            letterSpacing: 10,
            color: GOLD,
            opacity: l1,
            transform: `translateY(${(1 - l1) * 35}px)`,
            textShadow: "0 4px 18px rgba(0,0,0,0.9)",
          }}
        >
          PART 2 · 1281 AD
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 175,
            lineHeight: 1.05,
            color: "white",
            opacity: l2,
            transform: `scale(${1.4 - 0.4 * l2})`,
            textShadow: "0 8px 30px rgba(0,0,0,0.9)",
          }}
        >
          THE KAMIKAZE
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 215,
            lineHeight: 1.0,
            color: CYAN,
            opacity: l3,
            transform: `scale(${1.9 - 0.9 * l3})`,
            textShadow: `0 0 ${45 + flash * 80}px rgba(92,225,255,${0.65 + flash * 0.35}), 0 10px 0 #0b3547`,
          }}
        >
          MEGA STORM
        </div>
      </div>
      <SceneFade duration={DURATIONS_P2.hook} inFrames={10} outFrames={6} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. WALL — 20 km Genkō Bōrui Stone Wall & Night Raids               */
/* ================================================================== */
export const SceneP2Wall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = interpolate(frame, [0, DURATIONS_P2.wall], [0, 1], { ...clamp, easing: ease });
  const cam: Vec3 = [
    interpolate(p, [0, 1], [-4.5, 4.5]),
    interpolate(p, [0, 1], [5.8, 4.9]),
    interpolate(p, [0, 1], [18.0, 15.8]),
  ];
  const swordUp = interpolate(frame, [10, 45], [0, 1], { ...clamp, easing: ease });

  return (
    <AbsoluteFill>
      <NightSky moonX={260} moonY={310} />
      <Canvas fov={52}>
        <CameraRig position={cam} lookAt={[0, 1.5, -8]} />
        <ambientLight intensity={1.0} color="#8fa2e0" />
        <directionalLight position={[-14, 15, -25]} intensity={2.4} color="#c8d4ff" />
        <directionalLight position={[8, 6, 18]} intensity={1.3} color="#ffaa66" />
        <Ocean t={t} />

        {/* The 20km defensive stone wall along Hakata beach */}
        <StoneWall position={[0, 0, 8.5]} frame={frame} />

        {/* Samurai defenders standing atop the stone wall */}
        {[-7.5, -4.2, -1.4, 1.6, 4.5, 7.5].map((x, i) => (
          <Samurai
            key={i}
            position={[x, 2.15, 8.6]}
            rotationY={Math.PI}
            t={t}
            phase={i * 1.3}
            swordUp={swordUp}
          />
        ))}

        {/* Samurai night-raid boats (kobaya) charging toward the fleet */}
        {[-4.5, 0.5, 5.0].map((x, i) => (
          <RaidBoat
            key={i}
            position={[x, 0, 3.5 - t * 1.4 - i * 1.2]}
            t={t}
            phase={i * 2}
          />
        ))}

        {/* Returning Mongol armada offshore */}
        {[-12, -6, 0, 6, 12, -9, -2, 5, 10].map((x, i) => (
          <Ship
            key={i}
            position={[x, 0, -18 - Math.floor(i / 5) * 10 - (i % 3) * 2.5]}
            t={t}
            phase={i}
            scale={1.15}
          />
        ))}
      </Canvas>

      <Kicker text="1281 · THE SECOND INVASION" from={6} top={245} />
      <Caption
        text="Kublai Khan returned with 4,400 WARSHIPS"
        from={12}
        to={104}
        highlight={["4,400", "WARSHIPS"]}
        highlightColor={RED}
        top={1260}
      />
      <Caption
        text="Samurai built a 20 KM STONE WALL to block every beach"
        from={108}
        to={208}
        highlight={["20", "KM", "STONE", "WALL"]}
        highlightColor={GOLD}
        top={1260}
      />
      <SceneFade duration={DURATIONS_P2.wall} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. CHAINS — The Chained Fleet Fortress Trap                        */
/* ================================================================== */
const P2Chip: React.FC<{ label: string; from: number; to: number; i: number }> = ({ label, from, to, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 13 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 1310 + i * 118,
        left: i % 2 === 0 ? 90 : undefined,
        right: i % 2 === 1 ? 90 : undefined,
        padding: "15px 32px",
        borderRadius: 16,
        background: "rgba(8,12,20,0.82)",
        border: `3px solid ${CYAN}`,
        fontFamily: FONT_BODY,
        fontWeight: 800,
        fontSize: 46,
        color: "white",
        letterSpacing: 2.5,
        opacity: s * out,
        transform: `translateX(${(1 - s) * (i % 2 === 0 ? -120 : 120)}px)`,
        boxShadow: "0 10px 40px rgba(92,225,255,0.25)",
      }}
    >
      <span style={{ color: CYAN }}>{["①", "②", "③"][i]} </span>
      {label}
    </div>
  );
};

export const SceneP2Chains: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const lockProgress = interpolate(frame, [40, 95], [0, 1], { ...clamp, easing: ease });
  const spread = interpolate(lockProgress, [0, 1], [4.2, 2.75]);
  const glow = interpolate(frame, [90, 130, 190], [0, 1, 0.3], clamp);
  const title = spring({ frame: frame - 18, fps, config: { damping: 11 } });
  const titleOut = interpolate(frame, [198, 210], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #10253a 0%, #07111e 50%, #03060c 100%)" }}>
      <Canvas fov={46}>
        <CameraRig
          position={[Math.sin(t * 0.45) * 3.2, 4.6 - Math.cos(t * 0.35) * 0.6, 11.2]}
          lookAt={[0, 1.3, 0]}
        />
        <ambientLight intensity={1.1} color="#9bb8e8" />
        <directionalLight position={[6, 10, 8]} intensity={2.4} color="#ffd8a8" />
        <directionalLight position={[-6, 8, -6]} intensity={2.0} color="#6aa8ff" />
        <Ocean t={t} amp={0.75} deep="#051326" crest="#1e4268" fog="#07111e" />

        {/* Three Mongol warships locked side-by-side */}
        <Ship position={[-spread, 0, 0]} t={t} phase={0.2} scale={1.1} />
        <Ship position={[0, 0, 0.2]} t={t} phase={0.5} scale={1.15} />
        <Ship position={[spread, 0, 0]} t={t} phase={0.8} scale={1.1} />

        {/* Heavy iron chains connecting the hulls fore and aft */}
        {frame >= 35 && (
          <>
            <IronChain from={[-spread + 0.8, 0.9, 1.2]} to={[-0.8, 0.9, 1.3]} sag={0.35 - lockProgress * 0.2} glow={glow} />
            <IronChain from={[-spread + 0.8, 0.9, -1.1]} to={[-0.8, 0.9, -1.0]} sag={0.35 - lockProgress * 0.2} glow={glow} />
            <IronChain from={[0.8, 0.9, 1.3]} to={[spread - 0.8, 0.9, 1.2]} sag={0.35 - lockProgress * 0.2} glow={glow} />
            <IronChain from={[0.8, 0.9, -1.0]} to={[spread - 0.8, 0.9, -1.1]} sag={0.35 - lockProgress * 0.2} glow={glow} />
          </>
        )}
      </Canvas>

      <div style={{ position: "absolute", top: 195, width: "100%", textAlign: "center", opacity: title * titleOut }}>
        <div
          style={{
            fontFamily: FONT_JP,
            fontWeight: 900,
            fontSize: 115,
            color: "white",
            letterSpacing: 16,
            transform: `scale(${0.7 + 0.3 * title})`,
            textShadow: "0 0 30px rgba(92,225,255,0.7)",
          }}
        >
          連環船
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 138,
            color: CYAN,
            letterSpacing: 6,
            lineHeight: 1.08,
            textShadow: "0 0 40px rgba(92,225,255,0.5), 0 8px 0 #083042",
          }}
        >
          CHAINED FLEET
        </div>
      </div>

      <Caption
        text="Raided at night, Mongols CHAINED their warships together"
        from={8}
        to={115}
        highlight={["CHAINED"]}
        highlightColor={CYAN}
        top={1310}
      />
      <P2Chip label="BLOCKED BY STONE WALLS" from={120} to={200} i={0} />
      <P2Chip label="RAIDED AT NIGHT BY SAMURAI" from={134} to={200} i={1} />
      <P2Chip label="LOCKED TOGETHER WITH CHAINS" from={148} to={200} i={2} />
      <Caption
        text="A floating fortress... that became a DEADLY TRAP"
        from={202}
        to={240}
        highlight={["DEADLY", "TRAP"]}
        highlightColor={RED}
        top={1320}
        size={78}
      />
      <SceneFade duration={DURATIONS_P2.chains} outFrames={4} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. TYPHOON — August 15, 1281: Chained Armada Crushed               */
/* ================================================================== */
const SMASHES = [64, 92, 118];

export const SceneP2Typhoon: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flash = lightning(frame, [14, 64, 118]);

  let shake = 0;
  for (const at of SMASHES) {
    const d = frame - at;
    if (d >= 0) shake += Math.exp(-d / 8) * 0.5;
  }

  const smash1 = interpolate(frame, [50, 74], [0, 1], { ...clamp, easing: ease });
  const smash2 = interpolate(frame, [82, 125], [0, 1], { ...clamp, easing: ease });
  const sinkProg = interpolate(frame, [110, 195], [0, 1], { ...clamp, easing: ease });

  const cam: Vec3 = [
    Math.sin(t * 0.9) * 1.4 + Math.sin(frame * 3.1) * shake,
    3.6 + Math.cos(frame * 2.7) * shake,
    13.5,
  ];

  return (
    <AbsoluteFill>
      <NightSky storm flash={flash} />
      <Canvas fov={54}>
        <CameraRig position={cam} lookAt={[0, 1.2, -4]} />
        <ambientLight intensity={0.65 + flash * 2.2} color="#7f96c4" />
        <directionalLight position={[-12, 15, -18]} intensity={1.9 + flash * 5} color="#c3d8ff" />
        <directionalLight position={[10, 6, 12]} intensity={1.2} color="#ff8a47" />
        <Ocean t={t * 1.9} amp={2.6} flash={flash} deep="#030812" crest="#264766" fog="#0e1622" />

        {/* 3D swirling typhoon funnel and flying debris */}
        <TyphoonVortex frame={frame} />

        {/* Chained Mongol ships colliding, snapping masts, and sinking */}
        <SinkingShip
          position={[-3.2 + smash1 * 1.25, 0, -2.5]}
          t={t * 1.6}
          phase={0.1}
          scale={1.15}
          listAngle={smash1 * 0.48 + sinkProg * 0.45}
          mastBreak={smash1}
          sink={sinkProg * 1.6}
        />
        <SinkingShip
          position={[0 - smash1 * 0.4, 0, -2.2]}
          t={t * 1.6}
          phase={1.2}
          scale={1.2}
          listAngle={-smash1 * 0.35 - smash2 * 0.4}
          mastBreak={smash2}
          sink={sinkProg * 1.9}
        />
        <SinkingShip
          position={[3.2 - smash2 * 1.3, 0, -2.6]}
          t={t * 1.6}
          phase={2.4}
          scale={1.15}
          listAngle={-smash2 * 0.55}
          mastBreak={smash2}
          sink={sinkProg * 1.5}
        />

        {/* Collision blasts & timber debris when chained hulls smash together */}
        <Explosion position={[-1.2, 0.8, -2.2]} frame={frame} start={64} seed="sm1" size={0.95} />
        <Explosion position={[1.3, 0.8, -2.3]} frame={frame} start={92} seed="sm2" size={0.95} />
        <Explosion position={[0, 0.6, -2.0]} frame={frame} start={118} seed="sm3" size={1.05} />
      </Canvas>

      <Bolt visible={lightning(frame, [64])} seed="p2b3" x={520} />
      <Bolt visible={lightning(frame, [118])} seed="p2b4" x={740} />
      <Rain count={135} />

      <CrushedBanner at={64} />

      <Caption
        text="August 15, 1281: a SUPER TYPHOON slammed the bay"
        from={4}
        to={60}
        highlight={["SUPER", "TYPHOON"]}
        highlightColor={CYAN}
        top={1250}
        size={72}
      />
      <Caption
        text="Chained together, ships SMASHED each other apart"
        from={78}
        to={142}
        highlight={["SMASHED"]}
        highlightColor={RED}
        top={1260}
        size={84}
      />
      <Caption
        text="Over 100,000 invaders vanished beneath the waves"
        from={146}
        to={208}
        highlight={["100,000"]}
        highlightColor={GOLD}
        top={1260}
        size={78}
      />
      <SceneFade duration={DURATIONS_P2.typhoon} inFrames={4} />
    </AbsoluteFill>
  );
};

const CrushedBanner: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = frame - at;
  if (d < 0 || d > 26) return null;
  const s = spring({ frame: d, fps, config: { damping: 7, stiffness: 250 } });
  const out = interpolate(d, [18, 26], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 470,
        width: "100%",
        textAlign: "center",
        fontFamily: FONT_TITLE,
        fontSize: 175,
        color: CYAN,
        opacity: out,
        transform: `rotate(-6deg) scale(${0.3 + s * 0.85})`,
        WebkitTextStroke: "9px #062333",
        paintOrder: "stroke fill",
        textShadow: "0 0 60px rgba(92,225,255,0.95)",
      }}
    >
      CRUSHED!
    </div>
  );
};

/* ================================================================== */
/* 5. OUTRO — Dawn Over Hakata Bay: Japan Unconquered                 */
/* ================================================================== */
export const SceneP2Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const big = spring({ frame: frame - 36, fps, config: { damping: 10 } });
  const cta = spring({ frame: frame - 70, fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 5) * 0.025;

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(#0d0718 0%, #3d1628 28%, #8f2d26 46%, #e8833a 58%, #ffd27a 64%, #1a2436 100%)",
      }}
    >
      {/* Rising Golden Sun */}
      <div
        style={{
          position: "absolute",
          left: 540 - 130,
          top: 860 - 130,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, #fffbe0 0%, #ffcf5c 55%, rgba(255,140,40,0) 75%)",
          boxShadow: "0 0 140px 60px rgba(255,170,60,0.45)",
        }}
      />

      <Canvas fov={50}>
        <CameraRig position={[1.4, 4.4, 15.8 - t * 0.35]} lookAt={[0, 1.8, -10]} />
        <ambientLight intensity={1.25} color="#ffd8ad" />
        <directionalLight position={[4, 9, 14]} intensity={1.8} color="#ffe0a8" />
        <directionalLight position={[0, 8, -30]} intensity={2.6} color="#ffd080" />
        <Ocean
          t={t * 0.7}
          amp={0.45}
          deep="#1b1c30"
          crest="#7a4438"
          fog="#c86432"
          glow={{ pos: [0, 0, -20], strength: 1.6, color: "#ff9d3b" }}
        />
        <FloatingWreckage t={t} />
        <StoneWall position={[0, 0, 8.8]} frame={frame} />
        {[-3.2, 2.8].map((x, i) => (
          <Samurai key={i} position={[x, 2.15, 8.9]} rotationY={Math.PI} t={t} phase={i} swordUp={1} />
        ))}
      </Canvas>

      <Caption text="The samurai called it KAMIKAZE" from={2} to={36} highlight={["KAMIKAZE"]} top={340} size={76} />

      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", opacity: frame >= 36 ? big : 0 }}>
        <div
          style={{
            fontFamily: FONT_JP,
            fontWeight: 900,
            fontSize: 135,
            color: GOLD,
            textShadow: "0 0 40px rgba(255,201,74,0.85)",
          }}
        >
          神風 · 不敗
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 175,
            color: "white",
            lineHeight: 1.05,
            transform: `scale(${1.5 - 0.5 * big})`,
            textShadow: "0 0 50px rgba(255,160,60,0.9), 0 10px 0 #3a1208",
          }}
        >
          UNCONQUERED
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 42,
            letterSpacing: 8,
            color: "#ffe4b5",
            marginTop: 10,
            textShadow: "0 3px 12px rgba(0,0,0,0.9)",
          }}
        >
          JAPAN STOOD FREE FOR 650 YEARS
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1340,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: cta,
          transform: `translateY(${(1 - cta) * 50}px) scale(${pulse})`,
        }}
      >
        <div
          style={{
            padding: "24px 54px",
            borderRadius: 999,
            background: "linear-gradient(90deg, #d9381e, #ff7b1a)",
            border: `3px solid ${GOLD}`,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 50,
            color: "white",
            letterSpacing: 3,
            boxShadow: "0 12px 50px rgba(255,120,30,0.6)",
          }}
        >
          SUBSCRIBE FOR MORE HISTORY ★
        </div>
      </div>
      <SceneFade duration={DURATIONS_P2.outro} inFrames={6} outFrames={12} />
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Bomb, CameraRig, Explosion, Ocean, Samurai, Ship, Vec3 } from "./three/objects";
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

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

export const DURATIONS = { hook: 120, fleet: 210, weapon: 240, thunder: 210, outro: 120 };

const Canvas: React.FC<{ children: React.ReactNode; fov?: number }> = ({ children, fov = 50 }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov, near: 0.1, far: 400, position: [0, 2, 10] }}>
      {children}
    </ThreeCanvas>
  );
};

/* ================================================================== */
/* 1. HOOK – stormy night sea + title                                 */
/* ================================================================== */
export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flash = lightning(frame, [12, 70]);

  const l1 = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const l2 = spring({ frame: frame - 16, fps, config: { damping: 12 } });
  const l3 = spring({ frame: frame - 70, fps, config: { damping: 9, stiffness: 180 } });
  const shake = flash * 14;

  return (
    <AbsoluteFill>
      <NightSky flash={flash} />
      <Canvas fov={55}>
        <CameraRig position={[0, 1.9 + Math.sin(t * 1.3) * 0.15, 14 - t * 1.6]} lookAt={[0, 1.6, -20]} />
        <ambientLight intensity={0.8 + flash * 2.5} color="#8fa2e0" />
        <directionalLight position={[-10, 12, -25]} intensity={1.3 + flash * 6} color="#b8c6ff" />
        <Ocean t={t} flash={flash} />
        {[-9, 2, 11].map((x, i) => (
          <Ship key={i} position={[x, 0, -48 - i * 6]} t={t} phase={i * 2} scale={1.3} />
        ))}
      </Canvas>
      <Bolt visible={lightning(frame, [12])} seed="b1" x={820} />
      <Bolt visible={lightning(frame, [70])} seed="b2" x={240} />

      <div
        style={{
          position: "absolute",
          top: 330,
          width: "100%",
          textAlign: "center",
          transform: `translate(${Math.sin(frame * 9) * shake}px, ${Math.cos(frame * 7) * shake}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 66,
            letterSpacing: 6,
            color: "white",
            opacity: l1,
            transform: `translateY(${(1 - l1) * 40}px)`,
            textShadow: "0 4px 18px rgba(0,0,0,0.9)",
          }}
        >
          WHY SAMURAI FEARED
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 190,
            lineHeight: 1.05,
            color: "white",
            opacity: l2,
            transform: `scale(${1.5 - 0.5 * l2})`,
            filter: `blur(${(1 - l2) * 10}px)`,
            textShadow: "0 8px 30px rgba(0,0,0,0.9)",
          }}
        >
          THE FLYING
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 270,
            lineHeight: 1,
            color: GOLD,
            opacity: l3,
            transform: `scale(${2 - l3})`,
            textShadow: `0 0 ${40 + flash * 80}px rgba(255,201,74,${0.6 + flash * 0.4}), 0 10px 0 #7a4b00`,
          }}
        >
          THUNDER
        </div>
      </div>
      <SceneFade duration={DURATIONS.hook} inFrames={10} outFrames={6} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. FLEET – the Mongol armada approaches                           */
/* ================================================================== */
const FLEET = new Array(12).fill(0).map((_, i) => ({
  x: ((i % 4) - 1.5) * 7 + (random(`fx${i}`) - 0.5) * 3,
  z: -16 - Math.floor(i / 4) * 14 - random(`fz${i}`) * 5,
  phase: random(`fp${i}`) * 6,
  scale: 1 + random(`fs${i}`) * 0.25,
}));

export const SceneFleet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = interpolate(frame, [0, DURATIONS.fleet], [0, 1], { ...clamp, easing: ease });
  const cam: Vec3 = [interpolate(p, [0, 1], [0, 3.5]), interpolate(p, [0, 1], [8, 2.6]), interpolate(p, [0, 1], [24, 9])];

  return (
    <AbsoluteFill>
      <NightSky moonX={300} moonY={330} />
      <Canvas fov={50}>
        <CameraRig position={cam} lookAt={[0, 1.6, -18]} />
        <ambientLight intensity={1.1} color="#8fa2e0" />
        <directionalLight position={[-15, 14, -30]} intensity={2.6} color="#c3ceff" />
        <directionalLight position={[10, 6, 20]} intensity={1.4} color="#ffb27a" />
        <Ocean t={t} />
        {FLEET.map((s, i) => (
          <Ship key={i} position={[s.x, 0, s.z + t * 2.2]} t={t} phase={s.phase} scale={s.scale} />
        ))}
      </Canvas>
      <Kicker text="1274 · HAKATA BAY, JAPAN" from={8} top={250} />
      <Caption
        text="Nearly 900 Mongol warships appeared on the horizon"
        from={14}
        to={104}
        highlight={["900", "MONGOL"]}
        top={1260}
      />
      <Caption
        text="Kublai Khan demanded Japan's surrender"
        from={108}
        to={208}
        highlight={["KUBLAI", "KHAN"]}
        highlightColor={RED}
        top={1260}
      />
      <SceneFade duration={DURATIONS.fleet} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. WEAPON – the tetsuhō reveal                                     */
/* ================================================================== */
const Chip: React.FC<{ label: string; from: number; to: number; i: number }> = ({ label, from, to, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 13 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 1330 + i * 120,
        left: i % 2 === 0 ? 110 : undefined,
        right: i % 2 === 1 ? 110 : undefined,
        padding: "16px 34px",
        borderRadius: 16,
        background: "rgba(10,8,8,0.75)",
        border: `3px solid ${GOLD}`,
        fontFamily: FONT_BODY,
        fontWeight: 800,
        fontSize: 52,
        color: "white",
        letterSpacing: 3,
        opacity: s * out,
        transform: `translateX(${(1 - s) * (i % 2 === 0 ? -120 : 120)}px)`,
        boxShadow: "0 10px 40px rgba(255,140,40,0.25)",
      }}
    >
      <span style={{ color: GOLD }}>{["①", "②", "③"][i]} </span>
      {label}
    </div>
  );
};

export const SceneWeapon: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  const split = interpolate(frame, [112, 136, 186, 200], [0, 1, 1, 0], { ...clamp, easing: ease });
  const fly = interpolate(frame, [206, 238], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const title = spring({ frame: frame - 40, fps, config: { damping: 10 } });
  const titleOut = interpolate(frame, [196, 206], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 48%, #3a120a 0%, #12060a 45%, #050307 100%)" }}>
      <Canvas fov={42}>
        <CameraRig position={[Math.sin(t * 0.35) * 0.9, 0.6, 9.5]} lookAt={[0, 0.9, 0]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} color="#ffd2a1" />
        <directionalLight position={[-4, 2, -3]} intensity={2.5} color="#6f8cff" />
        <Bomb
          frame={frame}
          scale={enter * 0.95 * (1 - fly * 0.6)}
          position={[fly * 2.5, 0.25 + fly * 9, -fly * 4]}
          rotation={[0.25 + fly * 4, Math.sin(t * 0.8) * 0.45, 0.1]}
          split={split}
        />
      </Canvas>

      <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", opacity: title * titleOut }}>
        <div
          style={{
            fontFamily: FONT_JP,
            fontWeight: 900,
            fontSize: 120,
            color: "white",
            letterSpacing: 18,
            transform: `scale(${0.7 + 0.3 * title})`,
            textShadow: "0 0 30px rgba(255,90,40,0.7)",
          }}
        >
          てつはう
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 150,
            color: GOLD,
            letterSpacing: 8,
            lineHeight: 1.1,
            textShadow: "0 0 40px rgba(255,201,74,0.5), 0 8px 0 #6b3a00",
          }}
        >
          TETSUHO
        </div>
      </div>

      <Caption
        text="They brought a weapon Japan had NEVER seen..."
        from={8}
        to={108}
        highlight={["NEVER"]}
        highlightColor={RED}
        top={1330}
      />
      <Chip label="CERAMIC SHELL" from={124} to={200} i={0} />
      <Chip label="GUNPOWDER" from={138} to={200} i={1} />
      <Chip label="IRON SHRAPNEL" from={152} to={200} i={2} />
      <Caption text="Lit... thrown... and then" from={204} to={240} top={1330} size={84} />
      <SceneFade duration={DURATIONS.weapon} outFrames={4} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. THUNDER – bombs hit the beach                                   */
/* ================================================================== */
const IMPACTS: { at: number; pos: Vec3; from: Vec3 }[] = [
  { at: 66, pos: [-1.2, 0.6, 3.2], from: [-3, 3, -24] },
  { at: 92, pos: [3.4, 0.6, 5.0], from: [6, 3, -26] },
  { at: 110, pos: [-4.8, 0.6, 6.0], from: [-9, 3, -25] },
];
const FLIGHT = 30;
const WARRIORS = new Array(6).fill(0).map((_, i) => ({ x: -5 + i * 2 + (random(`wx${i}`) - 0.5) * 0.6, z: 7.5 + random(`wz${i}`) }));

export const SceneThunder: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Camera shake decays after each impact.
  let shake = 0;
  let flash = 0;
  let glow = 0;
  let glowPos: Vec3 = [0, 0, 0];
  for (const im of IMPACTS) {
    const d = frame - im.at;
    if (d >= 0) {
      shake += Math.exp(-d / 7) * 0.45;
      flash = Math.max(flash, Math.exp(-d / 3));
      const g = Math.exp(-d / 25) * 1.2;
      if (g > glow) {
        glow = g;
        glowPos = im.pos;
      }
    }
  }
  const push = interpolate(frame, [0, DURATIONS.thunder], [0, 1], { ...clamp, easing: ease });
  const cam: Vec3 = [
    interpolate(push, [0, 1], [2.5, 1]) + Math.sin(frame * 3.1) * shake,
    interpolate(push, [0, 1], [2.8, 3.6]) + Math.cos(frame * 2.7) * shake,
    interpolate(push, [0, 1], [15, 17]),
  ];
  const swordUp = interpolate(frame, [8, 34], [0, 1], { ...clamp, easing: ease });

  return (
    <AbsoluteFill>
      <NightSky moonX={820} moonY={300} />
      <Canvas fov={52}>
        <CameraRig position={cam} lookAt={[0, 1.4, -8]} />
        <ambientLight intensity={0.5} color="#7f93d6" />
        <directionalLight position={[-12, 14, -20]} intensity={1.6} color="#c3ceff" />
        <Ocean t={t} glow={{ pos: glowPos, strength: glow }} />
        {/* beach */}
        <mesh position={[0, 0.1, 13]}>
          <boxGeometry args={[80, 1, 30]} />
          <meshStandardMaterial color="#8a7556" roughness={1} />
        </mesh>
        {[-10, -3, 4, 11].map((x, i) => (
          <Ship key={i} position={[x, 0, -25 - (i % 2) * 4]} t={t} phase={i * 1.7} scale={1.2} />
        ))}
        {WARRIORS.map((w, i) => {
          let knock = 0;
          let dir = 0;
          for (const im of IMPACTS) {
            const dx = w.x - im.pos[0];
            const dz = w.z - im.pos[2];
            const dist = Math.hypot(dx, dz);
            if (dist < 4.2 && frame >= im.at) {
              const k = spring({ frame: frame - im.at, fps, config: { damping: 14 } }) * (dist < 3 ? 1 : 0.35);
              if (k > knock) {
                knock = k;
                dir = Math.atan2(dx, dz);
              }
            }
          }
          return (
            <Samurai
              key={i}
              position={[w.x, 0.6, w.z]}
              rotationY={Math.PI}
              t={t}
              phase={i}
              knock={knock}
              knockDir={dir}
              swordUp={swordUp * (1 - knock)}
            />
          );
        })}
        {IMPACTS.map((im, i) => {
          const d = frame - (im.at - FLIGHT);
          if (d < 0 || d >= FLIGHT) return null;
          const p = d / FLIGHT;
          const pos: Vec3 = [
            im.from[0] + (im.pos[0] - im.from[0]) * p,
            im.from[1] + (im.pos[1] - im.from[1]) * p + Math.sin(p * Math.PI) * 10,
            im.from[2] + (im.pos[2] - im.from[2]) * p,
          ];
          return <Bomb key={i} frame={frame} position={pos} scale={0.32} rotation={[frame * 0.3, frame * 0.2, 0]} />;
        })}
        {IMPACTS.map((im, i) => (
          <Explosion key={i} position={[im.pos[0], 0.6, im.pos[2]]} frame={frame} start={im.at} seed={`ex${i}`} size={1.1} />
        ))}
      </Canvas>

      <AbsoluteFill style={{ background: "#fff3d6", opacity: flash * 0.7 }} />
      <Boom at={IMPACTS[0].at} />

      <Caption
        text="Samurai fought with honor: one warrior against another"
        from={4}
        to={60}
        highlight={["HONOR"]}
        top={1240}
        size={70}
      />
      <Caption text="Then the sky EXPLODED" from={80} to={142} highlight={["EXPLODED"]} highlightColor={RED} top={1260} size={96} />
      <Caption text="Fire. Iron. A roar like THUNDER." from={146} to={208} highlight={["THUNDER"]} top={1260} size={88} />
      <SceneFade duration={DURATIONS.thunder} inFrames={3} />
    </AbsoluteFill>
  );
};

const Boom: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = frame - at;
  if (d < 0 || d > 26) return null;
  const s = spring({ frame: d, fps, config: { damping: 7, stiffness: 260 } });
  const out = interpolate(d, [18, 26], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 470,
        width: "100%",
        textAlign: "center",
        fontFamily: FONT_TITLE,
        fontSize: 300,
        color: GOLD,
        opacity: out,
        transform: `rotate(-8deg) scale(${0.3 + s * 0.9})`,
        WebkitTextStroke: "10px #5a0d00",
        paintOrder: "stroke fill",
        textShadow: "0 0 60px rgba(255,120,30,0.9)",
      }}
    >
      BOOM!
    </div>
  );
};

/* ================================================================== */
/* 5. OUTRO – the storm / cliffhanger                                 */
/* ================================================================== */
export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + 3;
  const flash = lightning(frame, [6, 44, 82]);
  const big = spring({ frame: frame - 44, fps, config: { damping: 9 } });
  const cta = spring({ frame: frame - 76, fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 4) * 0.03;

  return (
    <AbsoluteFill>
      <NightSky storm flash={flash} />
      <Canvas fov={55}>
        <CameraRig position={[0, 2.6 + Math.sin(t * 2) * 0.3, 12]} lookAt={[0, 1.2, -20]} />
        <ambientLight intensity={0.3 + flash * 2.5} color="#8090b0" />
        <directionalLight position={[-10, 12, -25]} intensity={0.8 + flash * 6} color="#c8d4ff" />
        <Ocean t={t * 1.4} amp={1.9} flash={flash} deep="#03070e" crest="#24384c" fog="#141b26" />
        {[-6, 3, 9].map((x, i) => (
          <Ship key={i} position={[x, 0, -22 - i * 7]} t={t * 2.2} phase={i} scale={1.2} rotationY={0.6 - i * 0.4} />
        ))}
      </Canvas>
      <Bolt visible={lightning(frame, [44])} seed="b3" x={540} />
      <Rain />
      <Caption text="But Japan had one more ally..." from={2} to={44} top={760} size={80} />
      <div style={{ position: "absolute", top: 520, width: "100%", textAlign: "center", opacity: frame >= 44 ? big : 0 }}>
        <div style={{ fontFamily: FONT_JP, fontWeight: 900, fontSize: 150, color: "white", textShadow: "0 0 40px rgba(160,190,255,0.8)" }}>
          神風
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 220,
            color: "white",
            lineHeight: 1.05,
            transform: `scale(${1.6 - 0.6 * big})`,
            textShadow: `0 0 ${30 + flash * 70}px rgba(170,200,255,0.9), 0 10px 0 #1b2740`,
          }}
        >
          KAMIKAZE
        </div>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 48, letterSpacing: 14, color: "#cfd9ff" }}>
          THE DIVINE WIND
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1300,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: cta,
          transform: `translateY(${(1 - cta) * 60}px) scale(${pulse})`,
        }}
      >
        <div
          style={{
            padding: "26px 60px",
            borderRadius: 999,
            background: RED,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 58,
            color: "white",
            letterSpacing: 2,
            boxShadow: "0 12px 50px rgba(255,59,47,0.55)",
          }}
        >
          FOLLOW FOR PART 2 →
        </div>
      </div>
      <SceneFade duration={DURATIONS.outro} inFrames={6} outFrames={12} />
    </AbsoluteFill>
  );
};

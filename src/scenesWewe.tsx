import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import {
  BeringinTree,
  ChildFigure,
  KampungHouse,
  SoccerBall,
  VillageGround,
  VillagerWithTorch,
  WeweGombelFigure,
} from "./three/objectsWewe";
import {
  Bolt,
  Caption,
  FONT_BODY,
  FONT_TITLE,
  GOLD,
  Kicker,
  RED,
  SceneFade,
  lightning,
} from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

export const DURATIONS_WEWE = {
  hook: 120,
  senja: 210,
  sosok: 240,
  diculik: 210,
  outro: 120,
};

const Canvas: React.FC<{ children: React.ReactNode; fov?: number }> = ({ children, fov = 50 }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov, near: 0.1, far: 300, position: [0, 2, 10] }}>
      {children}
    </ThreeCanvas>
  );
};

/** Blood-red & purple Indonesian Maghrib dusk sky with flying bats/crows. */
const MaghribSky: React.FC<{ flash?: number; dark?: boolean }> = ({ flash = 0, dark = false }) => {
  const frame = useCurrentFrame();
  const bg = dark
    ? "linear-gradient(#040208 0%, #15081f 40%, #2c0b1e 68%, #120914 100%)"
    : "linear-gradient(#090414 0%, #2b0f30 32%, #7a1c24 54%, #d1491f 66%, #181216 100%)";

  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* Dusk sun / blood moon glow on the horizon */}
      <div
        style={{
          position: "absolute",
          left: 540 - 150,
          top: dark ? 340 - 90 : 880 - 150,
          width: dark ? 180 : 300,
          height: dark ? 180 : 300,
          borderRadius: "50%",
          background: dark
            ? "radial-gradient(circle, #ffd8c0 0%, #c83e2b 55%, rgba(120,20,20,0) 75%)"
            : "radial-gradient(circle, #ff9e44 0%, #c8281c 55%, rgba(120,20,20,0) 75%)",
          boxShadow: "0 0 120px 50px rgba(210,50,30,0.38)",
        }}
      />
      {/* Flying dusk bats / crows (kalong) */}
      {!dark &&
        new Array(7).fill(0).map((_, i) => {
          const x = ((i * 190 + frame * (2.8 + (i % 3) * 0.7)) % 1300) - 110;
          const y = 320 + i * 55 + Math.sin(frame * 0.25 + i) * 18;
          const wing = Math.sin(frame * 0.6 + i * 2) * 10;
          return (
            <svg
              key={i}
              width="48"
              height="28"
              style={{ position: "absolute", left: x, top: y, opacity: 0.75 }}
            >
              <path
                d={`M 4 ${14 + wing} Q 14 4 24 14 Q 34 4 44 ${14 + wing}`}
                fill="none"
                stroke="#12060c"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>
          );
        })}
      <AbsoluteFill style={{ background: "#ffcfc2", opacity: flash * 0.55 }} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 1. HOOK — Jangan Main Saat Magrib!                                 */
/* ================================================================== */
export const SceneWeweHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flash = lightning(frame, [14, 70]);

  const l1 = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  const l2 = spring({ frame: frame - 14, fps, config: { damping: 11 } });
  const l3 = spring({ frame: frame - 68, fps, config: { damping: 9, stiffness: 190 } });
  const shake = flash * 14;

  return (
    <AbsoluteFill>
      <MaghribSky flash={flash} />
      <Canvas fov={52}>
        <CameraRig position={[0, 2.3, 12.5 - t * 1.1]} lookAt={[0, 2.4, -10]} />
        <ambientLight intensity={0.85 + flash * 2.0} color="#d97a6c" />
        <directionalLight position={[0, 8, -20]} intensity={2.2 + flash * 5} color="#ff6a33" />
        <VillageGround t={t} mistColor="#591c2b" />
        <KampungHouse position={[-5.5, 0, -4]} rotationY={0.35} />
        <KampungHouse position={[5.8, 0, -5]} rotationY={-0.35} />
        <BeringinTree position={[0, 0, -11.5]} scale={1.15} t={t} eerieGlow={0.6 + flash} />
        <WeweGombelFigure position={[0, 0.2, -9.2]} scale={0.95} t={t} reveal={frame > 65 ? 1 : 0.25} />
      </Canvas>
      <Bolt visible={lightning(frame, [14])} seed="wb1" x={780} />
      <Bolt visible={lightning(frame, [70])} seed="wb2" x={280} />

      <div
        style={{
          position: "absolute",
          top: 290,
          width: "100%",
          textAlign: "center",
          transform: `translate(${Math.sin(frame * 9) * shake}px, ${Math.cos(frame * 7) * shake}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 52,
            letterSpacing: 8,
            color: GOLD,
            opacity: l1,
            transform: `translateY(${(1 - l1) * 35}px)`,
            textShadow: "0 4px 18px rgba(0,0,0,0.95)",
          }}
        >
          MITOS URBAN INDONESIA
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 175,
            lineHeight: 1.05,
            color: "white",
            opacity: l2,
            transform: `scale(${1.4 - 0.4 * l2})`,
            textShadow: "0 8px 30px rgba(0,0,0,0.95)",
          }}
        >
          JANGAN MAIN
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 185,
            lineHeight: 1.02,
            color: RED,
            opacity: l3,
            transform: `scale(${1.9 - 0.9 * l3})`,
            WebkitTextStroke: "4px #2a0000",
            paintOrder: "stroke fill",
            textShadow: `0 0 ${45 + flash * 80}px rgba(255,59,47,0.85), 0 10px 0 #3d0500`,
          }}
        >
          SAAT MAGRIB!
        </div>
      </div>
      <SceneFade duration={DURATIONS_WEWE.hook} inFrames={10} outFrames={6} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. SENJA — Anak Masih Main di Luar Saat Langit Memerah             */
/* ================================================================== */
export const SceneWeweSenja: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = interpolate(frame, [0, DURATIONS_WEWE.senja], [0, 1], { ...clamp, easing: ease });
  const cam: Vec3 = [
    interpolate(p, [0, 1], [-2.2, 1.8]),
    interpolate(p, [0, 1], [3.2, 2.5]),
    interpolate(p, [0, 1], [11.5, 8.5]),
  ];
  const childZ = interpolate(p, [0, 1], [3.5, -2.5]);

  return (
    <AbsoluteFill>
      <MaghribSky />
      <Canvas fov={50}>
        <CameraRig position={cam} lookAt={[0, 1.5, -6]} />
        <ambientLight intensity={0.95} color="#e0886c" />
        <directionalLight position={[-8, 10, -15]} intensity={2.2} color="#ff7733" />
        <VillageGround t={t} mistColor="#4d1926" />

        <KampungHouse position={[-5.2, 0, 0]} rotationY={0.45} />
        <KampungHouse position={[5.2, 0, -1.5]} rotationY={-0.45} />
        <KampungHouse position={[-5.5, 0, -7]} rotationY={0.35} />
        <BeringinTree position={[0, 0, -13]} scale={1.2} t={t} eerieGlow={0.8} />

        {/* Child running after a rolling soccer ball toward the banyan tree */}
        <ChildFigure position={[0.2, 0, childZ]} rotationY={Math.PI} t={t} running />
        <SoccerBall position={[0.1, 0, childZ - 1.5]} t={t} />
      </Canvas>

      <Kicker text="18.00 WIB · WAKTU MAGRIB" from={6} top={245} />
      <Caption
        text="Saat langit merah senja, orang tua menyuruh cepat pulang"
        from={12}
        to={106}
        highlight={["MERAH", "SENJA", "PULANG"]}
        highlightColor={GOLD}
        top={1250}
        size={72}
      />
      <Caption
        text="Katanya... anak yang masih keluyuran akan DICULIK!"
        from={110}
        to={208}
        highlight={["DICULIK"]}
        highlightColor={RED}
        top={1260}
        size={78}
      />
      <SceneFade duration={DURATIONS_WEWE.senja} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. SOSOK — Anatomi Mitos Wewe Gombel                               */
/* ================================================================== */
const WeweChip: React.FC<{ label: string; from: number; to: number; i: number }> = ({
  label,
  from,
  to,
  i,
}) => {
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
        left: i % 2 === 0 ? 80 : undefined,
        right: i % 2 === 1 ? 80 : undefined,
        padding: "15px 30px",
        borderRadius: 16,
        background: "rgba(18,6,10,0.85)",
        border: `3px solid ${RED}`,
        fontFamily: FONT_BODY,
        fontWeight: 800,
        fontSize: 44,
        color: "white",
        letterSpacing: 2,
        opacity: s * out,
        transform: `translateX(${(1 - s) * (i % 2 === 0 ? -120 : 120)}px)`,
        boxShadow: "0 10px 40px rgba(255,59,47,0.3)",
      }}
    >
      <span style={{ color: GOLD }}>{["①", "②", "③"][i]} </span>
      {label}
    </div>
  );
};

export const SceneWeweSosok: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const reveal = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const title = spring({ frame: frame - 20, fps, config: { damping: 11 } });
  const titleOut = interpolate(frame, [202, 214], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #3a0b14 0%, #14050c 50%, #050206 100%)" }}>
      <Canvas fov={46}>
        <CameraRig
          position={[Math.sin(t * 0.5) * 1.4, 2.4, 7.6 - Math.cos(t * 0.4) * 0.5]}
          lookAt={[0, 2.2, 0]}
        />
        <ambientLight intensity={0.75} color="#a85566" />
        <directionalLight position={[4, 7, 6]} intensity={1.8} color="#ff6644" />
        <directionalLight position={[-5, 4, -4]} intensity={1.6} color="#7744aa" />

        <VillageGround t={t} mistColor="#5c1628" />
        <BeringinTree position={[0, 0, -2.2]} scale={1.05} t={t} eerieGlow={1.3} />
        <WeweGombelFigure position={[0, 0.1, 0.6]} scale={1.12} t={t} reveal={reveal} />
      </Canvas>

      <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", opacity: title * titleOut }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 44,
            color: GOLD,
            letterSpacing: 10,
          }}
        >
          LEGENDA BUKIT GOMBEL
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 155,
            color: RED,
            letterSpacing: 6,
            lineHeight: 1.08,
            textShadow: "0 0 45px rgba(255,59,47,0.7), 0 8px 0 #360400",
          }}
        >
          WEWE GOMBEL
        </div>
      </div>

      <Caption
        text="Sosok penunggu pohon beringin tua yang muncul saat Magrib"
        from={8}
        to={115}
        highlight={["POHON", "BERINGIN", "MAGRIB"]}
        highlightColor={GOLD}
        top={1310}
        size={70}
      />
      <WeweChip label="MUNCUL SAAT SENJA MAGRIB" from={120} to={204} i={0} />
      <WeweChip label="BERSEMBUNYI DI POHON BERINGIN" from={134} to={204} i={1} />
      <WeweChip label="MENGINCAR ANAK LUPA PULANG" from={148} to={204} i={2} />
      <Caption
        text="Ia mengincar anak-anak yang masih bermain di kegelapan..."
        from={206}
        to={240}
        highlight={["KEGELAPAN"]}
        highlightColor={RED}
        top={1320}
        size={72}
      />
      <SceneFade duration={DURATIONS_WEWE.sosok} outFrames={4} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. DICULIK — Hilang di Pohon Beringin & Kentongan Warga            */
/* ================================================================== */
export const SceneWeweDiculik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flash = lightning(frame, [62, 110]);
  const kidnapped = frame >= 62;

  const d = Math.max(0, frame - 62);
  const shake = frame >= 62 ? Math.exp(-d / 8) * 0.55 : 0;
  const villagerZ = interpolate(frame, [75, 205], [8.5, 1.5], { ...clamp, easing: ease });

  return (
    <AbsoluteFill>
      <MaghribSky dark flash={flash} />
      <Canvas fov={52}>
        <CameraRig
          position={[
            Math.sin(t * 0.8) * 1.1 + Math.sin(frame * 3.1) * shake,
            2.6 + Math.cos(frame * 2.7) * shake,
            10.5,
          ]}
          lookAt={[0, 1.8, -3]}
        />
        <ambientLight intensity={0.7 + flash * 2.2} color="#8a5a7a" />
        <directionalLight position={[-6, 10, 8]} intensity={1.7 + flash * 4} color="#ff8855" />
        <VillageGround t={t} mistColor="#4a1628" />
        <BeringinTree position={[0, 0, -5.5]} scale={1.2} t={t} eerieGlow={1.5} />

        {/* Before frame 62: child stands near the tree while Wewe Gombel looms behind */}
        {!kidnapped && (
          <>
            <ChildFigure position={[0, 0, -0.5]} rotationY={Math.PI} t={t} />
            <WeweGombelFigure
              position={[0, 0.2, -3.2 + (frame / 62) * 1.8]}
              scale={1.1}
              t={t}
              reveal={1}
            />
          </>
        )}

        {/* Lonely soccer ball left behind on the ground */}
        <SoccerBall position={[0.6, 0, 0.2]} t={t * 0.2} />

        {/* After frame 72: villagers arrive with blazing bamboo torches & kentongan */}
        {frame >= 72 &&
          [-3.2, -1.1, 1.2, 3.3].map((x, i) => (
            <VillagerWithTorch
              key={i}
              position={[x, 0, villagerZ + (i % 2) * 0.9]}
              rotationY={Math.PI}
              t={t}
              phase={i * 1.5}
            />
          ))}
      </Canvas>

      <Bolt visible={lightning(frame, [62])} seed="wb3" x={540} />
      <DiculikBanner at={62} />

      <Caption
        text="Tiba-tiba... anak itu HILANG di balik kabut beringin!"
        from={4}
        to={60}
        highlight={["HILANG"]}
        highlightColor={RED}
        top={1250}
        size={74}
      />
      <Caption
        text="Warga kampung keluar memukul KENTONGAN BAMBU!"
        from={78}
        to={148}
        highlight={["KENTONGAN", "BAMBU"]}
        highlightColor={GOLD}
        top={1250}
        size={76}
      />
      <Caption
        text="Bunyi kentongan membuat Wewe Gombel ketakutan"
        from={152}
        to={208}
        highlight={["KETAKUTAN"]}
        highlightColor={RED}
        top={1260}
        size={74}
      />
      <SceneFade duration={DURATIONS_WEWE.diculik} inFrames={4} />
    </AbsoluteFill>
  );
};

const DiculikBanner: React.FC<{ at: number }> = ({ at }) => {
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
        fontSize: 205,
        color: RED,
        opacity: out,
        transform: `rotate(-6deg) scale(${0.3 + s * 0.85})`,
        WebkitTextStroke: "9px #240000",
        paintOrder: "stroke fill",
        textShadow: "0 0 60px rgba(255,59,47,0.95)",
      }}
    >
      DICULIK!
    </div>
  );
};

/* ================================================================== */
/* 5. OUTRO — Pesan Orang Tua: Pulang Sebelum Magrib!                 */
/* ================================================================== */
export const SceneWeweOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const big = spring({ frame: frame - 30, fps, config: { damping: 10 } });
  const cta = spring({ frame: frame - 66, fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 5) * 0.025;

  return (
    <AbsoluteFill>
      <MaghribSky dark />
      <Canvas fov={50}>
        <CameraRig position={[0, 2.5, 11.2 - t * 0.35]} lookAt={[0, 1.6, -4]} />
        <ambientLight intensity={0.95} color="#d89a72" />
        <directionalLight position={[4, 8, 10]} intensity={1.8} color="#ffbb66" />
        <VillageGround t={t} mistColor="#38182e" />

        <KampungHouse position={[0, 0, -2.5]} rotationY={0} scale={1.15} lightOn />
        <BeringinTree position={[-7, 0, -14]} scale={1.0} t={t} />
        <VillagerWithTorch position={[-0.8, 0, 1.2]} rotationY={0.2} t={t} />
        <ChildFigure position={[0.5, 0, 1.4]} rotationY={-0.2} t={t} />
      </Canvas>

      <Caption
        text="Jadi ingat... jangan pernah lupa waktu!"
        from={2}
        to={30}
        highlight={["JANGAN", "LUPA"]}
        top={310}
        size={72}
      />

      <div style={{ position: "absolute", top: 240, width: "100%", textAlign: "center", opacity: frame >= 30 ? big : 0 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 46,
            letterSpacing: 8,
            color: GOLD,
            textShadow: "0 4px 16px rgba(0,0,0,0.9)",
          }}
        >
          INGAT PESAN ORANG TUA
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 155,
            color: "white",
            lineHeight: 1.05,
            transform: `scale(${1.4 - 0.4 * big})`,
            textShadow: "0 0 45px rgba(255,90,40,0.85), 0 10px 0 #2b0800",
          }}
        >
          PULANG SEBELUM
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 185,
            color: GOLD,
            lineHeight: 1.02,
            textShadow: "0 0 50px rgba(255,201,74,0.85), 0 10px 0 #4a2400",
          }}
        >
          MAGRIB!
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
            padding: "24px 52px",
            borderRadius: 999,
            background: "linear-gradient(90deg, #b81d13, #ff4b2b)",
            border: `3px solid ${GOLD}`,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 48,
            color: "white",
            letterSpacing: 2,
            boxShadow: "0 12px 50px rgba(255,59,47,0.65)",
          }}
        >
          MASIH BERANI KELUYURAN? 👀
        </div>
      </div>
      <SceneFade duration={DURATIONS_WEWE.outro} inFrames={6} outFrames={12} />
    </AbsoluteFill>
  );
};

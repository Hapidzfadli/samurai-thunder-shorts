import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { BeringinTree, KampungHouse } from "./three/objectsWewe";
import {
  DoorwayFrame,
  Footprint,
  GenderuwoFigure,
  HangingLamp,
  KelorLeaves,
  NightGround,
  NightLights,
  SmokeWisps,
  SuamiFigure,
  YuDarmi,
} from "./three/objectsGenderuwo";
import timing from "./genderuwo_timing.json";
import { Caption, FONT_BODY, FONT_TITLE, GOLD, Kicker, NightSky, RED, SceneFade, lightning } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

/** Scene lengths, caption windows and visual beats all come from the narration timing written by
 *  scripts/build_audio_genderuwo.py, so the picture always follows the speech. */
export const DURATIONS_GEN = timing.scenes as {
  hook: number;
  rumah: number;
  tanda: number;
  panggil: number;
  kelor: number;
  gedor: number;
  fajar: number;
};
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const capTo = (id: LineId) => LN(id).to + 4;
const STEP = (timing as unknown as { stepF: { fake: number; real: number; gen: number } }).stepF;

const Canvas: React.FC<{ children: React.ReactNode; fov?: number }> = ({ children, fov = 50 }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov, near: 0.1, far: 400, position: [0, 2, 10] }}>
      {children}
    </ThreeCanvas>
  );
};

/** Sprung-in label chip in the Samurai gold style. */
const Chip: React.FC<{ label: string; n: string; from: number; to: number; top: number; left?: boolean }> = ({
  label,
  n,
  from,
  to,
  top,
  left = true,
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
        top,
        left: left ? 80 : undefined,
        right: left ? undefined : 80,
        padding: "15px 30px",
        borderRadius: 16,
        background: "rgba(6,8,18,0.88)",
        border: `3px solid ${GOLD}`,
        fontFamily: FONT_BODY,
        fontWeight: 800,
        fontSize: 44,
        color: "white",
        letterSpacing: 2,
        opacity: s * out,
        transform: `translateX(${(1 - s) * (left ? -120 : 120)}px)`,
        boxShadow: "0 10px 40px rgba(255,201,74,0.25)",
      }}
    >
      <span style={{ color: GOLD }}>{n} </span>
      {label}
    </div>
  );
};

/* ================================================================== */
/* 1. HOOK — a closed door in the dead of night                        */
/* ================================================================== */
const DoorInside: React.FC<{ frame: number }> = ({ frame }) => {
  const knocks = [EV("hook.knock1"), EV("hook.knock2"), EV("hook.knock3")];
  let shake = 0;
  for (const k of knocks) {
    const d = frame - k;
    if (d >= 0 && d < 8) shake = Math.max(shake, 1 - d / 8);
  }
  const shadowX = interpolate(frame, [12, EV("hook.eyes") - 4], [-2.4, 0.2], clamp);
  const eyes = interpolate(frame, [EV("hook.eyes"), EV("hook.eyes") + 12], [0, 1], clamp);
  const plank = "#7d5636";
  return (
    <group>
      {/* walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 3.0, 1.7, -0.1]}>
          <boxGeometry args={[4.1, 3.6, 0.3]} />
          <meshStandardMaterial color="#35261f" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 3.2, -0.1]}>
        <boxGeometry args={[2.0, 0.8, 0.3]} />
        <meshStandardMaterial color="#35261f" roughness={1} flatShading />
      </mesh>
      {/* moonlit yard seen through the slit */}
      <mesh position={[0, 1.6, -0.5]}>
        <planeGeometry args={[4, 4]} />
        <meshBasicMaterial color="#7f9cf0" />
      </mesh>
      {/* passing shadow */}
      <mesh position={[shadowX, 1.4, -0.3]}>
        <boxGeometry args={[0.9, 3, 0.05]} />
        <meshBasicMaterial color="#05060c" />
      </mesh>
      {/* eyes behind the slit */}
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 1.9, -0.25]}>
          <sphereGeometry args={[0.055 * eyes + 0.0001, 8, 8]} />
          <meshBasicMaterial color="#ff2a10" />
        </mesh>
      ))}
      {/* door leaf with a slit at y=1.9 */}
      <group position={[shake * Math.sin(frame * 2.3) * 0.03, 0, shake * 0.05]}>
        <mesh position={[0, 0.92, 0.02]}>
          <boxGeometry args={[1.96, 1.84, 0.12]} />
          <meshStandardMaterial color={plank} roughness={0.95} flatShading />
        </mesh>
        <mesh position={[0, 2.3, 0.02]}>
          <boxGeometry args={[1.96, 0.7, 0.12]} />
          <meshStandardMaterial color={plank} roughness={0.95} flatShading />
        </mesh>
        {[-0.65, -0.22, 0.22, 0.65].map((x) => (
          <mesh key={x} position={[x, 1.3, 0.085]}>
            <boxGeometry args={[0.025, 2.6, 0.02]} />
            <meshStandardMaterial color="#20150e" />
          </mesh>
        ))}
        {/* iron latch */}
        <mesh position={[0.7, 1.15, 0.1]}>
          <boxGeometry args={[0.28, 0.06, 0.04]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0.84, 1.15, 0.1]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.8} roughness={0.35} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 4]}>
        <planeGeometry args={[9, 10]} />
        <meshStandardMaterial color="#3a2a22" roughness={1} />
      </mesh>
    </group>
  );
};

export const SceneGenHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const l1 = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const l2 = spring({ frame: frame - 16, fps, config: { damping: 12 } });
  const l3 = spring({ frame: frame - EV("hook.text"), fps, config: { damping: 9, stiffness: 190 } });
  const knockFlash = lightning(frame, [EV("hook.knock1"), EV("hook.knock2"), EV("hook.knock3")]);
  const camZ = interpolate(frame, [0, DURATIONS_GEN.hook], [8.2, 6.6], { ...clamp, easing: ease });

  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <Canvas fov={50}>
        <CameraRig position={[0, 1.9, camZ]} lookAt={[0, 1.8, 0]} />
        <ambientLight intensity={1.1} color="#8a9ae0" />
        <directionalLight position={[3, 5, 8]} intensity={1.3} color="#9fb4ff" />
        <pointLight position={[1.2, 2.4, 3.2]} intensity={10 + Math.sin(t * 13) * 1.2} distance={12} color="#ffb366" />
        <DoorInside frame={frame} />
      </Canvas>
      <AbsoluteFill style={{ background: "#9fb4ff", opacity: knockFlash * 0.07 }} />

      <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 62,
            letterSpacing: 6,
            color: "white",
            opacity: l1,
            transform: `translateY(${(1 - l1) * 40}px)`,
            textShadow: "0 4px 18px rgba(0,0,0,0.9)",
          }}
        >
          KALAU SUAMIMU PULANG
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 150,
            lineHeight: 1.05,
            color: GOLD,
            opacity: l2,
            transform: `scale(${1.5 - 0.5 * l2})`,
            filter: `blur(${(1 - l2) * 10}px)`,
            textShadow: "0 0 40px rgba(255,201,74,0.55), 0 10px 0 #7a4b00",
          }}
        >
          TENGAH MALAM
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1590,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT_TITLE,
          fontSize: 150,
          color: RED,
          opacity: l3,
          transform: `scale(${1.9 - 0.9 * l3}) translate(${Math.sin(frame * 9) * knockFlash * 8}px, 0)`,
          WebkitTextStroke: "4px #2a0000",
          paintOrder: "stroke fill",
          textShadow: "0 0 45px rgba(255,59,47,0.8), 0 10px 0 #3d0500",
        }}
      >
        JANGAN DIBUKA!
      </div>
      <SceneFade duration={DURATIONS_GEN.hook} inFrames={10} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. RUMAH — the village, Yu Darmi alone, the old banyan              */
/* ================================================================== */
export const SceneGenRumah: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = interpolate(frame, [0, DURATIONS_GEN.rumah], [0, 1], { ...clamp, easing: ease });
  const pan = interpolate(frame, [EV("rumah.pan"), EV("rumah.pan") + 70], [0, 1], { ...clamp, easing: ease });
  const cam: Vec3 = [interpolate(p, [0, 1], [0.4, 0.1]) + pan * 1.2, interpolate(p, [0, 1], [2.3, 1.9]), interpolate(p, [0, 1], [11, 8.6])];

  return (
    <AbsoluteFill>
      <NightSky moonX={820} moonY={330} />
      <Canvas fov={50}>
        <CameraRig position={cam} lookAt={[0.2 + pan * 2.2, 1.9 + pan * 0.9, -3 - pan * 3]} />
        <NightLights />
        <NightGround t={t} />
        <KampungHouse position={[0.6, 0, -3.0]} rotationY={0.12} scale={1.15} />
        <YuDarmi position={[-0.9, 0, 1.2]} rotationY={0.3} t={t} />
        <KampungHouse position={[-11, 0, -14]} rotationY={0.2} scale={1.2} lightOn={false} />
        <KampungHouse position={[11, 0, -22]} rotationY={-0.3} scale={1.2} lightOn={false} />
        <BeringinTree position={[4.9, 0, -8]} scale={1.1} t={t} eerieGlow={0.2} />
      </Canvas>
      <Kicker text="SEBUAH KAMPUNG · TENGAH MALAM" from={6} top={235} />
      <Caption
        text="Konon, di sebuah kampung, tengah malam..."
        from={LN("rumah_1").from}
        to={capTo("rumah_1b")}
        highlight={["MALAM"]}
        top={1290}
        size={66}
      />
      <Caption
        text="YU DARMI tinggal sendirian. Suaminya merantau jauh."
        from={LN("rumah_2").from}
        to={capTo("rumah_3")}
        highlight={["YU", "DARMI", "SENDIRIAN", "MERANTAU"]}
        top={1290}
        size={66}
      />
      <Caption
        text="Di ujung jalan, berdiri beringin tua"
        from={LN("rumah_4").from}
        to={capTo("rumah_4")}
        highlight={["BERINGIN"]}
        top={1290}
        size={70}
      />
      <Caption
        text="Kata warga, itu rumah GENDERUWO"
        from={LN("rumah_5").from}
        to={capTo("rumah_5")}
        highlight={["GENDERUWO"]}
        highlightColor={RED}
        top={1290}
        size={74}
      />
      <SceneFade duration={DURATIONS_GEN.rumah} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. TANDA — smell of burnt cassava, the dog goes silent              */
/* ================================================================== */
export const SceneGenTanda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = interpolate(frame, [0, DURATIONS_GEN.tanda], [0, 1], { ...clamp, easing: ease });
  const cam: Vec3 = [interpolate(p, [0, 1], [-0.5, 0.2]), interpolate(p, [0, 1], [1.9, 1.7]), interpolate(p, [0, 1], [8.4, 6.8])];
  const eyes = interpolate(frame, [EV("tanda.eyes"), EV("tanda.eyes") + 14], [0, 1], clamp);
  const lampDim = 0.55 + 0.45 * Math.abs(Math.sin(frame * 0.35)) * (frame > EV("tanda.eyes") ? 1 : 0.4);

  return (
    <AbsoluteFill>
      <NightSky moonX={300} moonY={340} />
      <Canvas fov={50}>
        <CameraRig position={cam} lookAt={[1.6, 2.2, -12]} />
        <NightLights />
        <NightGround t={t} />
        <BeringinTree position={[3.6, 0, -12]} scale={1.35} t={t} eerieGlow={0.08 + eyes * 0.3} />
        {/* two red eyes appearing high in the canopy */}
        {[-0.28, 0.28].map((x, i) => (
          <mesh key={i} position={[3.6 + x, 5.7, -9.6]}>
            <sphereGeometry args={[0.09 * eyes + 0.0001, 8, 8]} />
            <meshBasicMaterial color="#ff2a10" />
          </mesh>
        ))}
        <SmokeWisps t={t} origin={[3.4, 0.5, -10]} spread={7} count={20} />
        <KampungHouse position={[-8.5, 0, -6]} rotationY={0.5} scale={1.2} lightOn={false} />
        <HangingLamp
          position={[1.0, 4.9, 3.4]}
          t={t}
          sway={interpolate(frame, [EV("tanda.lamp0"), EV("tanda.lamp0") + 50], [0, 1], clamp)}
        />
        <group scale={1}>
          <YuDarmi position={[-0.1, 0, 1.2]} rotationY={Math.PI - 0.3} t={t} lantern />
        </group>
        <pointLight position={[0.2, 1.6, 0.4]} intensity={3 * lampDim} distance={6} color="#ffa955" />
      </Canvas>
      <Kicker text="TENGAH MALAM · TANDA PERTAMA" from={6} top={235} />
      <Chip n="①" label="BAU SINGKONG BAKAR" from={LN("tanda_1a").from + 24} to={capTo("tanda_1b")} top={430} left />
      <Chip n="②" label="ANJING TERDIAM" from={LN("tanda_2a").from + 6} to={capTo("tanda_2b")} top={430} left />
      <Caption
        text="Tercium bau singkong bakar menyengat, padahal tak ada yang membakar"
        from={LN("tanda_1a").from}
        to={capTo("tanda_1b")}
        highlight={["SINGKONG", "BAKAR"]}
        top={1290}
        size={62}
      />
      <Caption
        text="Anjing berhenti menggonggong..."
        from={LN("tanda_2a").from}
        to={capTo("tanda_2a")}
        highlight={["MENGGONGGONG"]}
        top={1290}
        size={70}
      />
      <Caption
        text="diam."
        from={LN("tanda_2b").from}
        to={capTo("tanda_2b") + 10}
        highlightColor={RED}
        top={1340}
        size={44}
      />
      <Caption
        text="Lampu minyak bergoyang..."
        from={LN("tanda_3").from}
        to={capTo("tanda_3")}
        highlight={["BERGOYANG"]}
        top={1290}
        size={66}
      />
      <SceneFade duration={DURATIONS_GEN.tanda} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* Shared view: from inside the doorway looking out at the yard        */
/* ================================================================== */
const Yard: React.FC<{ t: number; flash?: number; children?: React.ReactNode }> = ({ t, flash = 0, children }) => (
  <>
    <NightLights flash={flash} />
    <NightGround t={t} />
    <BeringinTree position={[-4.2, 0, -17]} scale={1.0} t={t} eerieGlow={0.1} />
    <KampungHouse position={[9, 0, -12]} rotationY={-0.5} scale={1.1} lightOn={false} />
    <DoorwayFrame z={-1.4} />
    {/* warm lamp from the room behind the camera */}
    <pointLight position={[0.4, 2.2, 1.4]} intensity={3} distance={7} color="#ffb366" />
    {children}
  </>
);

/* ================================================================== */
/* 4. PANGGILAN — a voice calls from the banyan                        */
/* ================================================================== */
export const SceneGenPanggil: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const walk = interpolate(frame, [EV("panggil.walk0"), EV("panggil.walk1")], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const pos: Vec3 = [interpolate(walk, [0, 1], [-3.0, 0.1]), 0, interpolate(walk, [0, 1], [-14.5, -5.2])];
  const quote = spring({ frame: frame - EV("panggil.quote0"), fps, config: { damping: 12 } });
  const quoteOut = interpolate(frame, [EV("panggil.quote1") - 10, EV("panggil.quote1")], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <NightSky moonX={760} moonY={350} />
      <Canvas fov={50}>
        <CameraRig position={[0, 1.6, 1.5]} lookAt={[0, 1.45, -10]} />
        <Yard t={t}>
          <SuamiFigure position={pos} rotationY={0} t={t} walking={walk > 0.001 && walk < 0.999} walkF={STEP.fake} />
        </Yard>
      </Canvas>
      <Kicker text="SUARA DARI ARAH BERINGIN" from={6} top={235} />
      <div
        style={{
          position: "absolute",
          top: 1180,
          width: "100%",
          textAlign: "center",
          opacity: quote * quoteOut,
          transform: `scale(${0.8 + 0.2 * quote})`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 118,
            lineHeight: 1.1,
            color: "white",
            textShadow: "0 8px 30px rgba(0,0,0,0.95), 0 0 40px rgba(159,180,255,0.35)",
          }}
        >
          “DIK... BUKAKAN PINTU.
        </div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 118, lineHeight: 1.1, color: GOLD, textShadow: "0 8px 30px #000" }}>
          MAS PULANG.”
        </div>
      </div>
      <Caption text="Lalu terdengar suara dari arah beringin" from={LN("panggil_1").from} to={capTo("panggil_1")} highlight={["SUARA"]} top={1290} size={70} />
      <Caption
        text="Suaranya PERSIS suaminya."
        from={LN("panggil_3a").from}
        to={capTo("panggil_3a")}
        highlight={["PERSIS"]}
        highlightColor={RED}
        top={1290}
        size={70}
      />
      <Caption
        text="Tapi kenapa ia tak mau MENDEKAT?"
        from={LN("panggil_3b").from}
        to={capTo("panggil_3b")}
        highlight={["MENDEKAT"]}
        highlightColor={RED}
        top={1290}
        size={64}
      />
      <SceneFade duration={DURATIONS_GEN.panggil} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. KELOR — the leaves at the doorstep, the thing shows its face     */
/* ================================================================== */
export const SceneGenKelor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const approach = interpolate(frame, [EV("kelor.approach0"), EV("kelor.approach1")], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const flipF = EV("kelor.flip");
  const z = interpolate(approach, [0, 1], [-5.4, -4.3]);
  const flash = lightning(frame, [flipF, flipF + 8]);
  const isGen = frame >= flipF;
  const kelorGrow = spring({ frame: frame - EV("kelor.leaves"), fps, config: { damping: 14 } });
  // blocked: lean in, recoil, lean in, recoil
  const press = isGen ? Math.max(0, Math.sin((frame - flipF - 8) * 0.16)) : 0;
  const rage = interpolate(frame, [flipF + 30, DURATIONS_GEN.kelor], [0, 1], clamp);
  const flareF = EV("kelor.flare");
  const flare = interpolate(frame, [flareF, flareF + 6, flareF + 40], [0, 1, 0.6], clamp);
  const burst = interpolate(frame, [flareF, flareF + 3, flareF + 16], [0, 0.4, 0], clamp);
  const grow = interpolate(frame, [flipF, LN("kelor_3a").to], [0.5, 0.72], { ...clamp, easing: ease });
  const shakeAmt = (isGen ? 0.02 + rage * 0.03 : 0) + burst * 0.1;
  const camShake: Vec3 = [Math.sin(frame * 3.1) * shakeAmt, Math.cos(frame * 2.7) * shakeAmt, 0];

  return (
    <AbsoluteFill>
      <NightSky flash={flash} moonX={800} moonY={340} />
      <Canvas fov={50}>
        <CameraRig position={[camShake[0], 1.6 + camShake[1], 1.5]} lookAt={[0, 1.5, -10]} />
        <Yard t={t} flash={flash}>
          <KelorLeaves position={[0, 0.12, -1.35]} width={1.0} grow={kelorGrow} />
          {!isGen && (
            <SuamiFigure
              position={[0.1, 0, z]}
              t={t}
              eyeGlow={frame > EV("kelor.eyes") ? interpolate(frame, [EV("kelor.eyes"), EV("kelor.eyes") + 30], [0.3, 1], clamp) : 0}
            />
          )}
          {isGen && (
            <GenderuwoFigure
              position={[0.1, 0, -4.3]}
              scale={grow}
              t={t}
              lean={0.2 + press * 0.5}
              rage={Math.max(rage, burst * 2)}
              flare={flare}
              eyeGlow={1 + flare * 2}
            />
          )}
        </Yard>
      </Canvas>
      <AbsoluteFill style={{ background: "#ff3a1a", opacity: burst }} />
      <Chip n="①" label="DAUN KELOR DI AMBANG PINTU" from={LN("kelor_1b").from + 6} to={capTo("kelor_1b")} top={430} left />
      <Caption
        text="Yu Darmi ingat pesan Mbah..."
        from={LN("kelor_1a").from}
        to={capTo("kelor_1a")}
        top={1290}
        size={68}
      />
      <Caption
        text="Sebarkan DAUN KELOR di ambang pintu"
        from={LN("kelor_1b").from}
        to={capTo("kelor_1b")}
        highlight={["DAUN", "KELOR"]}
        highlightColor="#7bdc66"
        top={1290}
        size={68}
      />
      <Caption
        text="Sosok itu berhenti di depan pintu. Ia tak sanggup melangkah."
        from={LN("kelor_2").from}
        to={capTo("kelor_2")}
        highlight={["BERHENTI", "MELANGKAH"]}
        top={1290}
        size={60}
      />
      <Caption
        text="Lalu bayangannya membesar..."
        from={LN("kelor_3a").from}
        to={capTo("kelor_3a")}
        top={1290}
        size={66}
      />
      <Caption
        text="Dan matanya MERAH MENYALA!"
        from={LN("kelor_3b").from}
        to={DURATIONS_GEN.kelor - 6}
        highlight={["MERAH", "MENYALA"]}
        highlightColor={RED}
        top={1250}
        size={100}
      />
      <SceneFade duration={DURATIONS_GEN.kelor} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. GEDOR — pounding the door, then a roar, then it vanishes         */
/* ================================================================== */
export const SceneGenGedor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const roarF = EV("gedor.roar");
  const flee = interpolate(frame, [EV("gedor.flee0"), EV("gedor.flee1")], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const pound = frame < roarF ? Math.max(0, Math.sin(frame * 0.55)) : 0;
  const hit = frame < roarF ? Math.max(0, Math.sin(frame * 0.55 - 0.4)) ** 6 : 0;
  const roar = interpolate(frame, [roarF - 16, roarF + 6], [0, 1], clamp) * (frame < EV("gedor.flee0") ? 1 : 0);
  const gz = interpolate(flee, [0, 1], [-4.3, -20]);
  const sx = frame < EV("gedor.flee0") ? 0.03 + hit * 0.06 : 0;
  const redFlash = hit * 0.18;
  
  return (
    <AbsoluteFill>
      <NightSky moonX={780} moonY={340} />
      <Canvas fov={50}>
        <CameraRig
          position={[Math.sin(frame * 3.7) * sx, 1.6 + Math.cos(frame * 3.1) * sx, 1.5]}
          lookAt={[0, 1.5, -10]}
        />
        <Yard t={t}>
          <KelorLeaves position={[0, 0.12, -1.35]} width={1.0} />
          {flee < 1 && (
            <GenderuwoFigure
              position={[0.1, 0, gz]}
              rotationY={flee > 0.05 ? Math.PI * Math.min(1, flee * 4) : 0}
              scale={0.7}
              t={t}
              pound={pound}
              rage={Math.max(roar, hit)}
              lean={flee > 0.02 ? 0.7 : 0.3}
              eyeGlow={1 - flee}
              walking={flee > 0.02 && flee < 1}
              walkF={STEP.gen}
            />
          )}
        </Yard>
      </Canvas>
      <AbsoluteFill style={{ background: "#ff2a10", opacity: redFlash }} />
      <Caption
        text="“Dik... bukakan pintu...”"
        from={LN("gedor_g").from}
        to={capTo("gedor_g")}
        top={1280}
        size={84}
      />
      <Caption
        text="Ia menggedor pintu berkali-kali..."
        from={LN("gedor_1a").from}
        to={capTo("gedor_1a")}
        highlight={["MENGGEDOR"]}
        highlightColor={RED}
        top={1290}
        size={72}
      />
      <Caption
        text="lalu meraung, dan menghilang"
        from={LN("gedor_1b").from}
        to={capTo("gedor_1b") + 10}
        highlight={["MERAUNG", "MENGHILANG"]}
        top={1290}
        size={74}
      />
      <SceneFade duration={DURATIONS_GEN.gedor} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. FAJAR — dawn, footprints, the real husband comes home            */
/* ================================================================== */
const DawnSky: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(#2c3b73 0%, #7e5f95 32%, #e8845f 54%, #ffc98f 63%, #2a2a3c 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 540 - 130,
        top: 860 - 130,
        width: 260,
        height: 260,
        borderRadius: "50%",
        background: "radial-gradient(circle, #fff1c9 0%, #ffb76b 50%, rgba(255,150,80,0) 72%)",
        boxShadow: "0 0 120px 60px rgba(255,170,100,0.35)",
      }}
    />
    {new Array(60).fill(0).map((_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: random(`ds-x${i}`) * 1080,
          top: random(`ds-y${i}`) * 520,
          width: 1.6,
          height: 1.6,
          borderRadius: "50%",
          background: "white",
          opacity: 0.5 * (1 - random(`ds-y${i}`) * 1.6 > 0 ? 1 - random(`ds-y${i}`) * 1.6 : 0),
        }}
      />
    ))}
  </AbsoluteFill>
);

export const SceneGenFajar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = interpolate(frame, [0, DURATIONS_GEN.fajar], [0, 1], { ...clamp, easing: ease });
  const cam: Vec3 = [interpolate(p, [0, 1], [-0.2, 0.3]), interpolate(p, [0, 1], [2.3, 1.9]), interpolate(p, [0, 1], [9.2, 7.6])];
  const walk = interpolate(frame, [EV("fajar.husband0"), EV("fajar.husband1")], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const husbandPos: Vec3 = [interpolate(walk, [0, 1], [1.6, 0.35]), 0, interpolate(walk, [0, 1], [-32, -1.2])];
  const title = spring({ frame: frame - EV("fajar.card"), fps, config: { damping: 12 } });
  const t2 = spring({ frame: frame - EV("fajar.big"), fps, config: { damping: 10, stiffness: 180 } });
  const t3 = spring({ frame: frame - EV("fajar.big") - 14, fps, config: { damping: 10, stiffness: 180 } });
  const prints: { p: Vec3; r: number; m: boolean }[] = [
    { p: [3.2, 0, -6.2], r: 0.5, m: false },
    { p: [2.2, 0, -4.6], r: 0.45, m: true },
    { p: [1.4, 0, -3.0], r: 0.4, m: false },
    { p: [0.9, 0, -1.4], r: 0.3, m: true },
    { p: [4.4, 0, -7.6], r: 0.55, m: true },
  ];

  return (
    <AbsoluteFill>
      <DawnSky />
      <Canvas fov={50}>
        <CameraRig position={cam} lookAt={[0.2, 1.5, -5]} />
        <NightLights warm />
        <NightGround t={t} ground="#4a3f4e" path="#8a7566" mist="#ffd2a0" mistOpacity={0.14} />
        <BeringinTree position={[5.2, 0, -9]} scale={1.15} t={t} eerieGlow={0} />
        <KampungHouse position={[-3.4, 0, -5.4]} rotationY={0.3} scale={1.2} lightOn={false} />
        {prints.map((f, i) => (
          <Footprint key={i} position={f.p} rotationY={f.r} mirror={f.m} scale={1.6} />
        ))}
        <YuDarmi position={[-1.0, 0, -1.7]} rotationY={0.5} t={t} lantern={false} />
        {frame >= EV("fajar.husband0") && (
          <SuamiFigure position={[husbandPos[0], 0, husbandPos[2]]} t={t} scale={1} walking={walk > 0.001 && walk < 0.999} walkF={STEP.real} />
        )}
      </Canvas>
      <Kicker text="FAJAR · JEJAK DI BAWAH BERINGIN" from={6} top={235} />
      <Caption
        text="Fajar tiba. Hanya tersisa jejak besar berbulu di bawah beringin"
        from={LN("fajar_1").from}
        to={capTo("fajar_1")}
        highlight={["JEJAK", "BERBULU"]}
        highlightColor={GOLD}
        top={1290}
        size={62}
      />
      <Caption
        text="Tiga hari kemudian, suami Yu Darmi pulang sungguhan"
        from={LN("fajar_2").from}
        to={capTo("fajar_2")}
        highlight={["SUNGGUHAN"]}
        highlightColor="#7bdc66"
        top={1290}
        size={62}
      />
      <AbsoluteFill style={{ background: "rgba(5,6,14,0.5)", opacity: title }} />
      <div style={{ position: "absolute", top: 330, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: 5,
            color: "white",
            opacity: title,
            transform: `translateY(${(1 - title) * 40}px)`,
            textShadow: "0 4px 18px rgba(0,0,0,0.9)",
          }}
        >
          KALAU ADA YANG MEMANGGIL DARI GELAP
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 190,
            lineHeight: 1.05,
            color: "white",
            opacity: t2,
            transform: `scale(${1.5 - 0.5 * t2})`,
            textShadow: "0 8px 30px rgba(0,0,0,0.9)",
          }}
        >
          PASTIKAN DIA
        </div>
        <div
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 200,
            lineHeight: 1,
            color: GOLD,
            opacity: t3,
            transform: `scale(${1.8 - 0.8 * t3})`,
            textShadow: "0 0 40px rgba(255,201,74,0.6), 0 10px 0 #7a4b00",
          }}
        >
          BERANI MASUK
        </div>
      </div>
      <SceneFade duration={DURATIONS_GEN.fajar} inFrames={0} outFrames={14} />
    </AbsoluteFill>
  );
};

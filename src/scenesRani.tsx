import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { ChargePlus, FlowerBasket, FloorMat, IronPole, Person, Spark, WarungSet } from "./three/objectsRani";
import timing from "./rani_timing.json";
import { Caption, FONT_BODY, FONT_TITLE, GOLD, Kicker, Rain, SceneFade } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const PINK = "#ff5d8f";
const SKY = "#bfe6ff";

export const DURATIONS_RANI = timing.scenes as {
  hook: number;
  curiga: number;
  sengat: number;
  hujan: number;
  aldi: number;
  tik: number;
  akhir: number;
};
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const capTo = (id: LineId) => LN(id).to + 4;
const STEP_RANI = (timing as unknown as { stepF: { rani: number } }).stepF.rani;
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Sprung-in label chip, comedic palette. */
const Chip: React.FC<{ label: string; n: string; from: number; to: number; top: number; left?: boolean; color?: string }> = ({ label, n, from, to, top, left = true, color = GOLD }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: left ? 70 : undefined,
        right: left ? undefined : 70,
        padding: "14px 28px",
        borderRadius: 18,
        background: "rgba(20,24,40,0.9)",
        border: `3px solid ${color}`,
        fontFamily: FONT_BODY,
        fontWeight: 800,
        fontSize: 42,
        color: "white",
        letterSpacing: 1.5,
        opacity: s * out,
        transform: `translateX(${(1 - s) * (left ? -120 : 120)}px) scale(${0.9 + 0.1 * s})`,
        boxShadow: `0 10px 36px ${color}55`,
      }}
    >
      <span style={{ color }}>{n} </span>
      {label}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Shared stage: the warung with its customers, Rani, Bu Ratmi, Aldi.  */
/* ------------------------------------------------------------------ */
type Cust = { x: number; up: number; away: number };
const CUST_LOOK = [
  { skin: "#c89068", shirt: "#e76f51", hair: "#1c1410", style: "short" as const },
  { skin: "#a8754f", shirt: "#264653", hair: "#3a2410", style: "short" as const },
  { skin: "#d2a679", shirt: "#6a994e", hair: "#000000", style: "bald" as const },
  { skin: "#c89068", shirt: "#f4a261", hair: "#6b4a2b", style: "short" as const },
];
const CUST_X = [-1.45, -0.8, -0.15, 0.5];
const POLE_L: Vec3 = [-1.3, 0, 1.4];
const POLE_R: Vec3 = [1.3, 0, 1.4];

const Stage: React.FC<{
  t: number;
  rain?: number; // 0..1
  raniX: number;
  raniZ?: number;
  raniRot?: number;
  raniWalking?: boolean;
  raniWalkF?: number;
  raniUp?: number;
  raniReach?: number;
  raniShake?: number;
  custs: Cust[];
  ratmi?: { armsUp?: number; point?: number };
  aldi?: { x: number; visible: boolean; point?: number };
  mat?: number;
  basket?: number;
  spark?: { pos: Vec3; s: number; seed?: string };
  plus?: number;
  plastic?: boolean;
  cam?: Vec3;
  look?: Vec3;
  fov?: number;
}> = ({ t, rain = 0, raniX, raniZ = 1.4, raniRot = 0, raniWalking = false, raniWalkF = 2, raniUp = 0, raniReach = 0, raniShake = 0, custs, ratmi, aldi, mat = 0, basket = 1, spark, plus = 0, plastic = false, cam = [0, 1.6, 7.2], look = [0, 1.15, 0], fov = 50 }) => {
  const { width, height } = useVideoConfig();
  const dim = 1 - 0.38 * rain;
  return (
    <>
    <ThreeCanvas width={width} height={height} camera={{ fov, near: 0.1, far: 200, position: cam }}>
      <CameraRig position={cam} lookAt={look} />
      <ambientLight intensity={1.35 * dim + 0.2} color={rain > 0.5 ? "#a9bdd6" : "#fff4e0"} />
      <directionalLight position={[3, 7, 6]} intensity={2.0 * dim} color={rain > 0.5 ? "#c8d8f0" : "#fff1d0"} />
      <directionalLight position={[-4, 3, 4]} intensity={0.7 * dim} color="#ffd9a8" />
      <WarungSet rainy={rain > 0.5} />
      <IronPole position={POLE_L} />
      <IronPole position={POLE_R} />
      {mat > 0.01 && <FloorMat position={[0, 0, 0.1]} grow={mat} />}
      {basket > 0.01 && <FlowerBasket position={[mat > 0.01 || basket >= 0 ? 0.95 : 0.95, 1.0, -1.1]} pop={basket} scale={1.1} />}
      {/* Bu Ratmi behind the counter */}
      <Person position={[1.35, 0, -1.7]} t={t} skin="#c58f66" shirt="#c0407a" pants="#8a3b2a" hair="#d9d9d9" style="bun" seed="ratmi" scale={0.96} armsUp={ratmi?.armsUp ?? 0} pointArm={ratmi?.point ?? 0} rotationY={ratmi?.point ? -0.5 : 0} />
      {/* customers */}
      {custs.map((c, i) => {
        const look = CUST_LOOK[i];
        const walking = c.away > 0.02 && c.away < 0.98;
        return (
          <Person
            key={i}
            position={[c.x - c.away * 3.8, 0, 0]}
            rotationY={walking ? -Math.PI / 2 : 0}
            t={t}
            walking={walking}
            walkF={2.6}
            skin={look.skin}
            shirt={look.shirt}
            hair={look.hair}
            style={look.style}
            hairUp={look.style === "bald" ? 0 : c.up}
            lean={[Math.max(-1, Math.min(1, (raniX - c.x) * 0.9)), 0.5]}
            seed={`c${i}`}
          />
        );
      })}
      {/* Aldi */}
      {aldi?.visible && <Person position={[aldi.x, 0, 2.0]} t={t} scale={0.62} skin="#d2a679" shirt="#ffffff" pants="#d62828" hair="#1a1410" style="short" seed="aldi" pointArm={aldi.point ?? 0} rotationY={aldi.point ? 0.3 : -0.2} />}
      {/* Rani */}
      <Person
        position={[raniX, 0, raniZ]}
        rotationY={raniRot}
        t={t}
        walking={raniWalking}
        walkF={raniWalkF}
        skin="#c58f66"
        shirt="#2fb5a8"
        pants="#3b3f63"
        hair="#241a14"
        style="ponytail"
        apron="#ff8a3d"
        hairUp={raniUp}
        lean={[0, 0.2]}
        pointArm={raniReach}
        shake={raniShake}
        seed="rani"
      />
      {plastic && (
        <mesh position={[raniX + Math.sin(raniRot) * 0.55, 0.78, raniZ + Math.cos(raniRot) * 0.55]} rotation={[0.4, 0.3, 0.2]}>
          <boxGeometry args={[0.28, 0.03, 0.22]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={0.2} />
        </mesh>
      )}
      {plus > 0.02 && <ChargePlus origin={[raniX, 1.1, raniZ]} t={t} amount={plus} />}
      {spark && <Spark position={spark.pos} s={spark.s} seed={spark.seed} />}
    </ThreeCanvas>
    <AbsoluteFill style={{ background: "linear-gradient(rgba(10,20,45,0) 58%, rgba(10,20,45,0.62) 82%, rgba(10,20,45,0.8) 100%)" }} />
    </>
  );
};

const Backdrop: React.FC<{ rain?: number }> = ({ rain = 0 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(${rain > 0.5 ? "#7e8ea3" : "#7fc8ff"} 0%, ${rain > 0.5 ? "#aab6c5" : SKY} 55%, ${rain > 0.5 ? "#8b97a6" : "#fff0c9"} 100%)` }} />
);

const hairFor = (raniX: number, base: number): Cust[] =>
  CUST_X.map((x) => {
    const near = Math.max(0, 1 - Math.abs(raniX - x) / 1.3);
    return { x, up: base * (0.6 + 0.4 * smooth(near)), away: 0 };
  });

/* ================================================================== */
/* 1. HOOK — Rani passes by, hair stands up                            */
/* ================================================================== */
export const SceneRaniHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const x = interpolate(frame, [EV("hook.walk0"), EV("hook.walk1")], [-2.2, 2.2], clamp);
  const walking = frame > EV("hook.walk0") && frame < EV("hook.walk1");
  const stand = interpolate(frame, [EV("hook.stand"), EV("hook.stand") + 24], [0, 1], clamp);
  const l1 = spring({ frame: frame - 4, fps, config: { damping: 13 } });
  const l2 = spring({ frame: frame - 14, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stage t={t} raniX={x} raniRot={Math.PI / 2} raniWalking={walking} raniWalkF={2.0} custs={hairFor(x, stand)} ratmi={{}} />
      <div style={{ position: "absolute", top: 215, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 52, letterSpacing: 5, color: "white", WebkitTextStroke: "3px #1d3557", paintOrder: "stroke fill", opacity: l1, transform: `translateY(${(1 - l1) * 30}px)` }}>
          WARUNG BU RATMI
        </div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1.04, color: "white", opacity: l2, transform: `scale(${1.4 - 0.4 * l2})`, WebkitTextStroke: "5px #1d3557", paintOrder: "stroke fill", textShadow: "0 10px 0 #1d3557" }}>
          RAMBUT
        </div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 168, lineHeight: 1, color: GOLD, opacity: l2, transform: `scale(${1.5 - 0.5 * l2})`, WebkitTextStroke: "5px #7a4b00", paintOrder: "stroke fill", textShadow: "0 10px 0 #7a4b00" }}>
          BERDIRI?
        </div>
      </div>
      <Caption text="Rani, kasir baru, bisa bikin rambut orang BERDIRI, cuma dengan lewat" from={LN("hook_1").from} to={capTo("hook_1")} highlight={["RANI", "BERDIRI"]} top={1290} size={64} />
      <Caption text="Rambut para pembeli tegak serentak, condong ke arahnya" from={LN("hook_2").from} to={capTo("hook_2")} highlight={["SERENTAK", "CONDONG"]} top={1290} size={64} />
      <SceneFade duration={DURATIONS_RANI.hook} inFrames={8} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. CURIGA — "aura", the flower baths, the new vinyl floor           */
/* ================================================================== */
export const SceneRaniCuriga: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = interpolate(frame, [0, DURATIONS_RANI.curiga], [0, 1], { ...clamp, easing: ease });
  const basket = spring({ frame: frame - EV("curiga.basket"), fps, config: { damping: 9 } });
  const point = interpolate(frame, [LN("curiga_1").from, LN("curiga_1").from + 14], [0, 1], clamp);
  const x = 0.1 + Math.sin(t * 1.2) * 0.06;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stage
        t={t}
        raniX={x}
        custs={hairFor(x, 0.8)}
        ratmi={{ point, armsUp: 0 }}
        basket={frame >= EV("curiga.basket") ? basket : 0}
        cam={[interpolate(p, [0, 1], [0, 0.5]), 1.5, interpolate(p, [0, 1], [7.2, 5.9])]}
        look={[interpolate(p, [0, 1], [0, 0.6]), 1.15, 0]}
      />
      <Kicker text="KATA BU RATMI..." from={4} top={235} />
      <Chip n="①" label="AURA ANEH?" from={EV("curiga.aura")} to={capTo("curiga_1") - 40} top={430} left color={PINK} />
      <Chip n="②" label="MANDI KEMBANG 7 RUPA" from={EV("curiga.basket")} to={capTo("curiga_1")} top={540} left={false} color={PINK} />
      <Chip n="③" label="LANTAI VINIL BARU" from={EV("curiga.vinyl")} to={capTo("curiga_2")} top={430} left />
      <Caption text="Bu Ratmi yakin Rani punya AURA aneh. Harus mandi kembang tujuh rupa" from={LN("curiga_1").from} to={capTo("curiga_1")} highlight={["AURA", "KEMBANG"]} highlightColor={PINK} top={1290} size={62} />
      <Caption text="Padahal Rani baru seminggu kerja, sejak lantai diganti VINIL baru yang licin" from={LN("curiga_2").from} to={capTo("curiga_2")} highlight={["VINIL", "SEMINGGU"]} top={1290} size={62} />
      <SceneFade duration={DURATIONS_RANI.curiga} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. SENGAT — "tik!", clinging plastic, customers leave               */
/* ================================================================== */
export const SceneRaniSengat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const touchF = EV("sengat.touch");
  const tikF = EV("sengat.tik");
  const reach = interpolate(frame, [touchF, tikF], [0, 1], clamp);
  const burst = interpolate(frame, [tikF, tikF + 3, tikF + 16], [0, 1, 0], clamp);
  const shake = frame >= tikF && frame < tikF + 14 ? 1 : 0;
  const leave = interpolate(frame, [EV("sengat.leave"), EV("sengat.leave") + 70], [0, 1], clamp);
  const raniX = -0.7;
  const custs = hairFor(raniX, 0.75).map((c, i) => ({ ...c, away: i === 2 ? 0 : leave }));
  const flash = interpolate(frame, [tikF, tikF + 2, tikF + 8], [0, 0.55, 0], clamp);
  const tik = spring({ frame: frame - tikF, fps, config: { damping: 7, stiffness: 220 } });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stage
        t={t}
        raniX={raniX}
        raniRot={-Math.PI / 2}
        raniReach={reach}
        raniShake={shake}
        raniUp={frame >= tikF ? 0.9 : 0.1}
        custs={custs}
        plastic={frame >= EV("sengat.plastic")}
        spark={{ pos: [raniX - 0.62, 1.25, 1.71], s: burst * 1.6, seed: "s1" }}
        cam={[-0.4, 1.5, 6.3]}
        look={[-0.35, 1.15, 0]}
      />
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
      {frame >= tikF && frame < tikF + 40 && (
        <div style={{ position: "absolute", top: 520, left: 110, fontFamily: FONT_TITLE, fontSize: 210, color: "#ffe14d", WebkitTextStroke: "6px #7a4b00", paintOrder: "stroke fill", transform: `scale(${0.4 + 0.8 * tik}) rotate(-8deg)`, opacity: interpolate(frame, [tikF + 28, tikF + 40], [1, 0], clamp), textShadow: "0 10px 0 #7a4b00" }}>
          TIK!
        </div>
      )}
      <Chip n="⚡" label="RAK BESI" from={touchF} to={tikF + 30} top={430} left={false} color="#ffe14d" />
      <Caption text="Tiap Rani pegang rak besi, dia TERSENGAT" from={LN("sengat_1a").from} to={capTo("sengat_1a")} highlight={["TERSENGAT"]} top={1290} size={66} />
      <Caption text="Plastik bungkus menempel di lengannya, susah dikibas" from={LN("sengat_1c").from} to={capTo("sengat_1c")} highlight={["MENEMPEL"]} top={1290} size={64} />
      <Caption text="Pembeli pindah ke warung sebelah. Cuma Pak Botak yang santai" from={LN("sengat_2").from} to={capTo("sengat_2")} highlight={["PINDAH", "BOTAK"]} highlightColor={PINK} top={1290} size={60} />
      <SceneFade duration={DURATIONS_RANI.sengat} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. HUJAN — three rainy days: no hair stands. Then it's hot again.   */
/* ================================================================== */
export const SceneRaniHujan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rainOn = interpolate(frame, [EV("hujan.rain0"), EV("hujan.rain0") + 14], [0, 1], clamp);
  const rainOff = interpolate(frame, [EV("hujan.sun"), EV("hujan.sun") + 18], [1, 0], clamp);
  const rain = rainOn * rainOff;
  const up = interpolate(frame, [EV("hujan.up"), EV("hujan.up") + 24], [0, 0.85], clamp);
  const cheer = interpolate(frame, [LN("hujan_2a").from, LN("hujan_2a").from + 14, LN("hujan_2b").from - 6, LN("hujan_2b").from + 6], [0, 1, 1, 0], clamp);
  const x = 0.2;
  return (
    <AbsoluteFill>
      <Backdrop rain={rain} />
      <Stage t={t} rain={rain} raniX={x} custs={hairFor(x, up)} ratmi={{ armsUp: cheer }} cam={[0.2, 1.5, 6.6]} look={[0.2, 1.15, 0]} />
      {rain > 0.05 && (
        <AbsoluteFill style={{ opacity: rain }}>
          <Rain count={70} />
        </AbsoluteFill>
      )}
      <Kicker text="3 HARI KEMUDIAN" from={4} top={235} />
      <Chip n="🌧" label="HUJAN 3 HARI" from={EV("hujan.rain0") + 6} to={LN("hujan_1").to + 4} top={430} left color="#7fb4ff" />
      <Chip n="☀" label="PANAS LAGI" from={EV("hujan.sun")} to={capTo("hujan_2b")} top={430} left={false} color={GOLD} />
      <Caption text="Hujan tiga hari, nggak ada satu pun rambut yang berdiri" from={LN("hujan_1").from} to={capTo("hujan_1")} highlight={["HUJAN", "TIGA"]} highlightColor="#7fb4ff" top={1290} size={62} />
      <Caption text="Kata Bu Ratmi, auranya sudah LUNTUR" from={LN("hujan_2a").from} to={capTo("hujan_2a")} highlight={["LUNTUR"]} highlightColor={PINK} top={1290} size={66} />
      <Caption text="Begitu cuaca panas lagi, rambut-rambut itu berdiri LAGI" from={LN("hujan_2b").from} to={capTo("hujan_2b")} highlight={["PANAS", "LAGI"]} top={1290} size={62} />
      <SceneFade duration={DURATIONS_RANI.hujan} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. ALDI — the kid watches Rani drag her sandals                     */
/* ================================================================== */
export const SceneRaniAldi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = interpolate(frame, [EV("aldi.enter"), EV("aldi.enter") + 40], [0, 1], { ...clamp, easing: ease });
  const aldiX = interpolate(enter, [0, 1], [2.3, 1.0]);
  const point = interpolate(frame, [EV("aldi.point"), EV("aldi.point") + 12], [0, 1], clamp);
  // Rani paces back and forth, dragging her sandals at STEP_RANI steps per second
  const phase = t * 0.55;
  const raniX = 0.2 + Math.sin(phase * Math.PI * 2) * 1.0;
  const dir = Math.cos(phase * Math.PI * 2) >= 0 ? Math.PI / 2 : -Math.PI / 2;
  const plus = interpolate(frame, [LN("aldi_1").from, LN("aldi_1").to], [0.1, 0.7], clamp);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stage
        t={t}
        raniX={raniX}
        raniRot={dir}
        raniWalking
        raniWalkF={STEP_RANI}
        raniUp={0.55}
        custs={hairFor(raniX, 0.6)}
        aldi={{ x: aldiX, visible: true, point }}
        plus={plus}
        cam={[0.2, 1.35, 5.9]}
        look={[0.2, 1.05, 0]}
      />
      <Kicker text="ALDI, ANAK SD" from={4} top={235} />
      <Chip n="🔍" label="SANDAL DISERET DI VINIL" from={LN("aldi_1").from + 30} to={capTo("aldi_1")} top={430} left color="#7bdc66" />
      <Caption text="Aldi, anak SD yang lagi pintar IPA, memperhatikan Rani menyeret sandal di atas vinil" from={LN("aldi_1").from} to={capTo("aldi_1")} highlight={["ALDI", "MENYERET", "VINIL"]} top={1290} size={58} />
      <Caption text="Dia menyuruh Rani memegang PAGAR BESI" from={LN("aldi_2").from} to={capTo("aldi_2")} highlight={["PAGAR", "BESI"]} top={1290} size={68} />
      <SceneFade duration={DURATIONS_RANI.aldi} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. TIK — the discharge, hair falls, the explanation                 */
/* ================================================================== */
export const SceneRaniTik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const tikF = EV("tik.tik");
  const fallF = EV("tik.fall");
  const rel = Math.round(LN("tik_3").from + 0.62 * (LN("tik_3").to - LN("tik_3").from));
  const raniX = 0.7;
  const reach = interpolate(frame, [EV("tik.touch"), tikF], [0, 1], clamp);
  const burst1 = interpolate(frame, [tikF, tikF + 3, tikF + 16], [0, 1, 0], clamp);
  const burst2 = interpolate(frame, [rel, rel + 3, rel + 16], [0, 1, 0], clamp);
  // hair: standing before the touch, falls flat, stands again as the charge is explained, falls for good on the release
  const up = frame < fallF ? 0.85 : frame < EV("tik.charge") ? interpolate(frame, [fallF, fallF + 12], [0.85, 0], clamp) : frame < rel ? interpolate(frame, [EV("tik.charge"), EV("tik.charge") + 24], [0, 0.9], clamp) : interpolate(frame, [rel, rel + 10], [0.9, 0], clamp);
  const plus = frame >= EV("tik.charge") && frame < rel ? interpolate(frame, [EV("tik.charge"), EV("tik.charge") + 20], [0, 1], clamp) : frame >= rel ? interpolate(frame, [rel, rel + 14], [0.6, 0], clamp) : frame < tikF ? 0.5 : 0;
  const flash = interpolate(frame, [tikF, tikF + 2, tikF + 9], [0, 0.6, 0], clamp);
  const flash2 = interpolate(frame, [rel, rel + 2, rel + 9], [0, 0.45, 0], clamp);
  const tik = spring({ frame: frame - tikF, fps, config: { damping: 7, stiffness: 220 } });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stage
        t={t}
        raniX={raniX}
        raniRot={Math.PI / 2}
        raniReach={reach}
        raniUp={up}
        raniShake={frame >= tikF && frame < tikF + 12 ? 1 : 0}
        custs={hairFor(raniX, up)}
        plus={plus}
        spark={{ pos: [raniX + 0.62, 1.25, 1.09], s: Math.max(burst1, burst2) * 1.7, seed: frame >= rel ? "s3" : "s2" }}
        cam={[0.55, 1.4, 6.1]}
        look={[0.55, 1.1, 0]}
      />
      <AbsoluteFill style={{ background: "white", opacity: Math.max(flash, flash2) }} />
      {frame >= tikF && frame < tikF + 42 && (
        <div style={{ position: "absolute", top: 500, left: 90, fontFamily: FONT_TITLE, fontSize: 230, color: "#ffe14d", WebkitTextStroke: "6px #7a4b00", paintOrder: "stroke fill", transform: `scale(${0.4 + 0.8 * tik}) rotate(-6deg)`, opacity: interpolate(frame, [tikF + 30, tikF + 42], [1, 0], clamp), textShadow: "0 10px 0 #7a4b00" }}>
          TIK!
        </div>
      )}
      <Kicker text="TERNYATA..." from={LN("tik_1b").from} top={235} />
      <Chip n="①" label="SANDAL KARET + LANTAI VINIL" from={LN("tik_2b").from} to={capTo("tik_2b")} top={430} left color="#7bdc66" />
      <Chip n="②" label="MUATAN SAMA = SALING TOLAK" from={LN("tik_3").from} to={rel - 4} top={430} left={false} color={GOLD} />
      <Chip n="③" label="SENTUH BESI = MUATAN LEPAS" from={rel} to={capTo("tik_3")} top={430} left color="#7fb4ff" />
      <Caption text="Rambut semua orang langsung TURUN" from={LN("tik_1b").from} to={capTo("tik_1b")} highlight={["TURUN"]} top={1290} size={72} />
      <Caption text="Itu LISTRIK STATIS, Bu!" from={LN("tik_2a").from} to={capTo("tik_2a")} highlight={["LISTRIK", "STATIS"]} highlightColor="#ffe14d" top={1290} size={84} />
      <Caption text="Sandal karet diseret di lantai vinil bikin badan penuh MUATAN" from={LN("tik_2b").from} to={capTo("tik_2b")} highlight={["MUATAN"]} highlightColor="#ffe14d" top={1290} size={62} />
      <Caption text="Rambut berdiri karena muatannya sama, jadi saling TOLAK. Begitu menyentuh besi, muatannya LEPAS" from={LN("tik_3").from} to={capTo("tik_3")} highlight={["TOLAK", "LEPAS"]} highlightColor="#ffe14d" top={1290} size={56} />
      <SceneFade duration={DURATIONS_RANI.tik} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. AKHIR — the mat goes down; the flower basket stays (callback)    */
/* ================================================================== */
export const SceneRaniAkhir: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const mat = spring({ frame: frame - EV("akhir.mat"), fps, config: { damping: 12 } });
  const basketPop = spring({ frame: frame - EV("akhir.basket"), fps, config: { damping: 6, stiffness: 160 } });
  const raniX = 0.35;
  const endF = LN("akhir_2").to - 8;
  const c1 = spring({ frame: frame - endF, fps, config: { damping: 12 } });
  const c2 = spring({ frame: frame - endF - 10, fps, config: { damping: 10, stiffness: 180 } });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Stage
        t={t}
        raniX={raniX}
        custs={hairFor(raniX, 0)}
        ratmi={{}}
        mat={frame >= EV("akhir.mat") ? mat : 0}
        basket={1 + 0.35 * Math.max(0, basketPop - 0.9) * (frame >= EV("akhir.basket") ? 1 : 0)}
        cam={[0.6, 1.45, 6.0]}
        look={[0.6, 1.1, 0]}
      />
      <Kicker text="BESOKNYA" from={4} top={235} />
      <Chip n="✔" label="KESET KAIN" from={EV("akhir.mat")} to={capTo("akhir_1")} top={430} left color="#7bdc66" />
      <Chip n="🌺" label="KEMBANG TETAP ADA" from={EV("akhir.basket") + 20} to={endF} top={430} left={false} color={PINK} />
      <Caption text="Bu Ratmi memasang KESET kain, lantai vinil pun ditutup" from={LN("akhir_1").from} to={capTo("akhir_1")} highlight={["KESET"]} top={1290} size={64} />
      <Caption text="Tapi keranjang kembang tujuh rupa TETAP ada. Jaga-jaga" from={LN("akhir_2").from} to={endF} highlight={["TETAP", "JAGA-JAGA"]} highlightColor={PINK} top={1290} size={64} />
      <AbsoluteFill style={{ background: "rgba(255,255,255,0.0)" }} />
      {frame >= endF && (
        <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1.04, color: "white", opacity: c1, transform: `scale(${1.5 - 0.5 * c1})`, WebkitTextStroke: "5px #1d3557", paintOrder: "stroke fill", textShadow: "0 10px 0 #1d3557" }}>
            LISTRIK STATIS
          </div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 168, lineHeight: 1, color: GOLD, opacity: c2, transform: `scale(${1.7 - 0.7 * c2})`, WebkitTextStroke: "5px #7a4b00", paintOrder: "stroke fill", textShadow: "0 10px 0 #7a4b00" }}>
            BUKAN AURA
          </div>
        </div>
      )}
      <SceneFade duration={DURATIONS_RANI.akhir} inFrames={0} outFrames={14} />
    </AbsoluteFill>
  );
};

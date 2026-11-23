import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { ChargePlus, Expr, FlowerBasket, FloorMat, IronRack, Person, SkyProps, Spark, WarungWorld } from "./three/objectsRani";
import timing from "./rani_timing.json";
import { Caption, FONT_BODY, FONT_TITLE, GOLD, Kicker, Rain, SceneFade } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const PINK = "#ff5d8f";

export const DURATIONS_RANI = timing.scenes as { hook: number; curiga: number; sengat: number; hujan: number; aldi: number; tik: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const capTo = (id: LineId) => LN(id).to + 4;
const STEP_RANI = (timing as unknown as { stepF: { rani: number } }).stepF.rani;
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/* ------------------------------------------------------------------ */
/* Shots: each one dollies from (p0,l0) to (p1,l1); `to` is the frame  */
/* where it cuts to the next. `follow` makes the camera track Rani.     */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; follow?: number };
const shotCam = (frame: number, shots: Shot[], followX = 0) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const k = smooth(Math.min(1, Math.max(0, (frame - start) / Math.max(1, Math.min(s.to, start + 400) - start))));
      const p = lerp3(s.p0, s.p1 ?? s.p0, k);
      const l = lerp3(s.l0, s.l1 ?? s.l0, k);
      const f = (s.follow ?? 0) * followX;
      return { pos: [p[0] + f, p[1], p[2]] as Vec3, look: [l[0] + f, l[1], l[2]] as Vec3, fov: s.fov ?? 50, index: i };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 50, index: 0 };
};

/** Sprung-in label chip. */
const Chip: React.FC<{ label: string; n: string; from: number; to: number; top: number; left?: boolean; color?: string }> = ({ label, n, from, to, top, left = true, color = GOLD }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: left ? 70 : undefined, right: left ? undefined : 70, padding: "14px 28px", borderRadius: 18, background: "rgba(20,24,40,0.9)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 42, color: "white", letterSpacing: 1.5, opacity: s * out, transform: `translateX(${(1 - s) * (left ? -120 : 120)}px) scale(${0.9 + 0.1 * s})`, boxShadow: `0 10px 36px ${color}55` }}>
      <span style={{ color }}>{n} </span>
      {label}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Look: colour grade, vignette, sun shafts, and a shade under captions */
/* ------------------------------------------------------------------ */
const FilmLook: React.FC<{ mood: "sun" | "rain" | "golden"; t: number }> = ({ mood, t }) => (
  <>
    {mood !== "rain" && (
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: mood === "golden" ? 0.5 : 0.32, background: `linear-gradient(${112 + Math.sin(t * 0.5) * 2}deg, rgba(255,240,200,0) 18%, rgba(255,240,200,0.55) 26%, rgba(255,240,200,0) 36%, rgba(255,240,200,0.35) 48%, rgba(255,240,200,0) 58%)`, filter: "blur(18px)" }} />
    )}
    <AbsoluteFill style={{ mixBlendMode: "soft-light", background: mood === "rain" ? "linear-gradient(#5b7aa8aa, #2c3e5a55)" : mood === "golden" ? "linear-gradient(#ff9a4d99, #ff6a3d44)" : "linear-gradient(#ffd18a55, #ffb36b22)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(10,14,30,0.42) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(10,20,45,0) 62%, rgba(10,20,45,0.6) 84%, rgba(10,20,45,0.78) 100%)" }} />
  </>
);

/* ------------------------------------------------------------------ */
/* Stage                                                                */
/* ------------------------------------------------------------------ */
type Cust = { x: number; up: number; away: number };
const CUST_LOOK = [
  { skin: "#c89068", shirt: "#e76f51", hair: "#1c1410", style: "short" as const },
  { skin: "#a8754f", shirt: "#264653", hair: "#3a2410", style: "short" as const },
  { skin: "#d2a679", shirt: "#6a994e", hair: "#000000", style: "bald" as const },
  { skin: "#c89068", shirt: "#f4a261", hair: "#6b4a2b", style: "short" as const },
];
const CUST_X = [-1.5, -0.85, -0.2, 0.45];
const CUST_Z = 0.3;
const RACK: Vec3 = [-2.5, 0, 1.0];
const handPos = (x: number, z: number, rot: number): [number, number] => [x + 0.31 * Math.cos(rot) + 0.6 * Math.sin(rot), z - 0.31 * Math.sin(rot) + 0.6 * Math.cos(rot)];

const Stage: React.FC<{
  t: number;
  mood?: "sun" | "rain" | "golden";
  rain?: number;
  raniX: number;
  raniZ?: number;
  raniRot?: number;
  raniWalking?: boolean;
  raniWalkF?: number;
  raniUp?: number;
  raniReach?: number;
  raniShake?: number;
  raniExpr?: Expr;
  raniJump?: number;
  custs: Cust[];
  ratmi?: { armsUp?: number; point?: number; expr?: Expr };
  aldi?: { x: number; z?: number; visible: boolean; point?: number; rot?: number; expr?: Expr };
  mat?: number;
  basket?: number;
  spark?: { pos: Vec3; s: number; seed?: string };
  plus?: number;
  plusOrigin?: Vec3;
  plastic?: boolean;
  cam: Vec3;
  look: Vec3;
  fov?: number;
}> = ({ t, mood = "sun", rain = 0, raniX, raniZ = 1.5, raniRot = 0, raniWalking = false, raniWalkF = 2, raniUp = 0, raniReach = 0, raniShake = 0, raniExpr = "neutral", raniJump = 0, custs, ratmi, aldi, mat = 0, basket = 1, spark, plus = 0, plusOrigin, plastic = false, cam, look, fov = 50 }) => {
  const { width, height } = useVideoConfig();
  const wet = rain;
  const golden = mood === "golden";
  const sunCol = golden ? "#ffb26b" : wet > 0.5 ? "#b9c8de" : "#fff1d0";
  const skyTop = golden ? "#ff9a5c" : wet > 0.5 ? "#7e8ea3" : "#6ec6ff";
  const skyMid = golden ? "#ffc58a" : wet > 0.5 ? "#aab6c5" : "#cfeeff";
  const skyBot = golden ? "#ffe3c2" : wet > 0.5 ? "#8b97a6" : "#fff4d6";
  const hand = handPos(raniX, raniZ, raniRot);
  const relaxed: [number, number] = [raniX + 0.34 * Math.cos(raniRot) + 0.05 * Math.sin(raniRot), raniZ - 0.34 * Math.sin(raniRot) + 0.05 * Math.cos(raniRot)];
  const plasticPos: Vec3 = raniReach > 0.3 ? [hand[0], 0.95, hand[1]] : [relaxed[0], 0.8, relaxed[1]];
  const sceneCusts = custs.map((c, i) => {
    const away = c.away;
    const out = away > 0;
    const k1 = Math.min(1, away / 0.4);
    const k2 = Math.max(0, (away - 0.4) / 0.6);
    return { ...c, px: out ? c.x - k2 * 9 : c.x, pz: out ? CUST_Z + k1 * 2.9 : CUST_Z, rot: out ? (k2 > 0 ? -Math.PI / 2 : 0) : 0, walking: out && away < 0.98 };
  });
  return (
    <>
      <AbsoluteFill style={{ background: `linear-gradient(${skyTop} 0%, ${skyMid} 52%, ${skyBot} 100%)` }} />
      <ThreeCanvas width={width} height={height} shadows camera={{ fov, near: 0.1, far: 260, position: cam }}>
        <CameraRig position={cam} lookAt={look} fov={fov} />
        <fog attach="fog" args={[skyMid, 22, 95]} />
        <hemisphereLight args={[skyMid, "#8a7d6a", golden ? 0.9 : 0.85 - 0.25 * wet]} />
        <ambientLight intensity={0.55 - 0.15 * wet} color={golden ? "#ffd9b0" : "#ffffff"} />
        <directionalLight
          position={golden ? [-6, 4.5, 9] : [5, 10, 9]}
          intensity={(golden ? 2.2 : 2.6) * (1 - 0.6 * wet)}
          color={sunCol}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-camera-near={1}
          shadow-camera-far={40}
          shadow-bias={-0.0006}
        />
        <directionalLight position={[-5, 3, 6]} intensity={0.5 * (1 - 0.5 * wet)} color="#ffd9a8" />
        <SkyProps t={t} mood={mood} />
        <WarungWorld t={t} rain={wet} fanSpeed={wet > 0.5 ? 3 : 7} />
        <IronRack position={RACK} />
        {mat > 0.01 && <FloorMat position={[0, 0, 0.6]} grow={mat} />}
        {basket > 0.01 && <FlowerBasket position={[0.9, 1.0, -1.0]} pop={basket} scale={1.1} />}
        <Person position={[1.45, 0, -1.7]} t={t} skin="#c58f66" shirt="#c0407a" pants="#8a3b2a" hair="#d9d9d9" style="bun" seed="ratmi" scale={0.96} armsUp={ratmi?.armsUp ?? 0} pointArm={ratmi?.point ?? 0} rotationY={ratmi?.point ? -0.45 : 0} expr={ratmi?.expr ?? "neutral"} look={Math.max(-1, Math.min(1, Math.atan2(raniX - 1.45, raniZ + 1.7)))} />
        {sceneCusts.map((c, i) => {
          const lk = CUST_LOOK[i];
          const surprised = c.up > 0.35;
          return (
            <Person
              key={i}
              position={[c.px, 0, c.pz]}
              rotationY={c.rot}
              t={t}
              walking={c.walking}
              walkF={2.6}
              skin={lk.skin}
              shirt={lk.shirt}
              hair={lk.hair}
              style={lk.style}
              hairUp={lk.style === "bald" ? 0 : c.up}
              lean={[Math.max(-1, Math.min(1, (raniX - c.x) * 0.9)), 0.5]}
              seed={`c${i}`}
              expr={c.away > 0 ? "worried" : lk.style === "bald" ? "smug" : surprised ? "surprised" : "neutral"}
              look={c.away > 0 ? 0 : Math.max(-1, Math.min(1, Math.atan2(raniX - c.x, Math.max(0.6, raniZ - CUST_Z))))}
            />
          );
        })}
        {aldi?.visible && <Person position={[aldi.x, 0, aldi.z ?? 2.3]} t={t} scale={0.62} skin="#d2a679" shirt="#ffffff" pants="#d62828" hair="#1a1410" style="short" seed="aldi" pointArm={aldi.point ?? 0} rotationY={aldi.rot ?? 0} expr={aldi.expr ?? "smug"} look={Math.max(-0.9, Math.min(0.9, Math.atan2(raniX - aldi.x, 1)))} />}
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
          expr={raniExpr}
          jump={raniJump}
        />
        {plastic && (
          <mesh position={plasticPos} rotation={[0.4, 0.3, 0.2]} castShadow>
            <boxGeometry args={[0.3, 0.04, 0.24]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.85} roughness={0.15} />
          </mesh>
        )}
        {plus > 0.02 && <ChargePlus origin={plusOrigin ?? [raniX, 1.1, raniZ]} t={t} amount={plus} />}
        {spark && <Spark position={spark.pos} s={spark.s} seed={spark.seed} />}
      </ThreeCanvas>
      <FilmLook mood={mood} t={t} />
    </>
  );
};

const hairFor = (raniX: number, base: number): Cust[] =>
  CUST_X.map((x) => ({ x, up: base * (0.6 + 0.4 * smooth(Math.max(0, 1 - Math.abs(raniX - x) / 1.4))), away: 0 }));

const Tik: React.FC<{ frame: number; at: number; top: number; left: number; size?: number }> = ({ frame, at, top, left, size = 220 }) => {
  const { fps } = useVideoConfig();
  const tik = spring({ frame: frame - at, fps, config: { damping: 7, stiffness: 220 } });
  if (frame < at || frame > at + 42) return null;
  return (
    <div style={{ position: "absolute", top, left, fontFamily: FONT_TITLE, fontSize: size, color: "#ffe14d", WebkitTextStroke: "6px #7a4b00", paintOrder: "stroke fill", transform: `scale(${0.4 + 0.8 * tik}) rotate(-7deg)`, opacity: interpolate(frame, [at + 30, at + 42], [1, 0], clamp), textShadow: "0 10px 0 #7a4b00" }}>
      TIK!
    </div>
  );
};

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const SceneRaniHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const x = interpolate(frame, [EV("hook.walk0"), EV("hook.walk1")], [-3.3, 3.3], clamp);
  const walking = frame > EV("hook.walk0") && frame < EV("hook.walk1");
  const stand = interpolate(frame, [EV("hook.stand"), EV("hook.stand") + 24], [0, 1], clamp);
  const l1 = spring({ frame: frame - 4, fps, config: { damping: 13 } });
  const l2 = spring({ frame: frame - 14, fps, config: { damping: 11 } });
  const titleOut = interpolate(frame, [LN("hook_1").to - 14, LN("hook_1").to + 6], [1, 0], clamp);
  const cam = shotCam(
    frame,
    [
      { to: 48, p0: [1.8, 4.3, 14.5], l0: [0, 1.9, 0.5], p1: [0.8, 2.4, 10.8], l1: [0, 1.6, 0.5], fov: 44 },
      { to: EV("hook.stand") - 6, p0: [0, 1.35, 5.6], l0: [0, 1.25, 0.4], p1: [0, 1.3, 5.0], l1: [0, 1.2, 0.4], fov: 46, follow: 0.85 },
      { to: LN("hook_2").from + 84, p0: [-1.7, 0.85, 3.2], l0: [-1.0, 1.62, 0.3], p1: [0.5, 0.95, 3.2], l1: [0.35, 1.66, 0.3], fov: 34 },
      { to: 9999, p0: [3.2, 2.7, 7.2], l0: [-0.3, 1.35, 0.6], p1: [1.8, 2.5, 6.6], l1: [-0.3, 1.35, 0.6], fov: 48 },
    ],
    x
  );
  return (
    <AbsoluteFill>
      <Stage t={t} raniX={x} raniRot={Math.PI / 2} raniWalking={walking} raniWalkF={2.0} raniExpr={stand > 0.5 ? "worried" : "neutral"} custs={hairFor(x, stand)} ratmi={{ expr: "neutral" }} cam={cam.pos} look={cam.look} fov={cam.fov} />
      <div style={{ position: "absolute", top: 215, width: "100%", textAlign: "center", opacity: titleOut }}>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 52, letterSpacing: 5, color: "white", WebkitTextStroke: "3px #1d3557", paintOrder: "stroke fill", opacity: l1, transform: `translateY(${(1 - l1) * 30}px)` }}>WARUNG BU RATMI</div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1.04, color: "white", opacity: l2, transform: `scale(${1.4 - 0.4 * l2})`, WebkitTextStroke: "5px #1d3557", paintOrder: "stroke fill", textShadow: "0 10px 0 #1d3557" }}>RAMBUT</div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 168, lineHeight: 1, color: GOLD, opacity: l2, transform: `scale(${1.5 - 0.5 * l2})`, WebkitTextStroke: "5px #7a4b00", paintOrder: "stroke fill", textShadow: "0 10px 0 #7a4b00" }}>BERDIRI?</div>
      </div>
      <Caption text="Rani, kasir baru, bisa bikin rambut orang BERDIRI, cuma dengan lewat" from={LN("hook_1").from} to={capTo("hook_1")} highlight={["RANI", "BERDIRI"]} top={1290} size={64} />
      <Caption text="Rambut para pembeli tegak serentak, condong ke arahnya" from={LN("hook_2").from} to={capTo("hook_2")} highlight={["SERENTAK", "CONDONG"]} top={1290} size={64} />
      <SceneFade duration={DURATIONS_RANI.hook} inFrames={8} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. CURIGA                                                            */
/* ================================================================== */
export const SceneRaniCuriga: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const basket = spring({ frame: frame - EV("curiga.basket"), fps, config: { damping: 9 } });
  const point = interpolate(frame, [LN("curiga_1").from, LN("curiga_1").from + 14], [0, 1], clamp);
  const x = 0.1 + Math.sin(t * 1.2) * 0.06;
  const cam = shotCam(frame, [
    { to: EV("curiga.aura") + 34, p0: [-1.2, 1.5, 3.4], l0: [0.9, 1.45, -0.9], p1: [-0.5, 1.5, 2.7], l1: [1.1, 1.45, -1.2], fov: 40 },
    { to: EV("curiga.basket") + 44, p0: [0.5, 1.55, 1.4], l0: [0.95, 1.1, -1.0], p1: [0.7, 1.4, 0.9], l1: [0.95, 1.12, -1.0], fov: 32 },
    { to: EV("curiga.vinyl") - 8, p0: [0.4, 1.6, 5.6], l0: [0.5, 1.25, 0.2], p1: [0.2, 1.55, 5.0], l1: [0.4, 1.2, 0.4], fov: 46 },
    { to: 9999, p0: [-0.3, 0.22, 4.0], l0: [0.1, 0.08, 1.5], p1: [0.5, 0.26, 3.3], l1: [0.4, 0.06, 1.5], fov: 42 },
  ]);
  return (
    <AbsoluteFill>
      <Stage t={t} raniX={x} raniExpr="worried" custs={hairFor(x, 0.8)} ratmi={{ point, expr: "smug" }} basket={frame >= EV("curiga.basket") ? basket : 0} cam={cam.pos} look={cam.look} fov={cam.fov} />
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
/* 3. SENGAT                                                            */
/* ================================================================== */
export const SceneRaniSengat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const touchF = EV("sengat.touch");
  const tikF = EV("sengat.tik");
  const walkIn = interpolate(frame, [0, touchF - 6], [-0.3, -1.55], { ...clamp, easing: ease });
  const raniX = walkIn;
  const walking = frame < touchF - 6;
  const reach = interpolate(frame, [touchF - 4, tikF], [0, 1], clamp);
  const burst = interpolate(frame, [tikF, tikF + 3, tikF + 16], [0, 1, 0], clamp);
  const turn = interpolate(frame, [tikF, tikF + 8], [0, 1], clamp);
  const rot = frame < touchF - 6 ? -Math.PI / 2 : -Math.PI / 2 + turn * (Math.PI / 2 - 0.3);
  const leave = interpolate(frame, [EV("sengat.leave"), EV("sengat.leave") + 85], [0, 1], clamp);
  const custs = hairFor(raniX, 0.75).map((c, i) => ({ ...c, away: i === 2 ? 0 : leave }));
  const flash = interpolate(frame, [tikF, tikF + 2, tikF + 8], [0, 0.55, 0], clamp);
  const hp = handPos(raniX, 0.69, -Math.PI / 2);
  const cam = shotCam(
    frame,
    [
      { to: touchF, p0: [0.6, 1.45, 4.2], l0: [-1.2, 1.2, 0.7], p1: [-0.2, 1.4, 3.6], l1: [-1.7, 1.2, 0.7], fov: 44 },
      { to: tikF + 5, p0: [-1.0, 1.35, 2.0], l0: [-2.15, 1.25, 1.0], p1: [-1.35, 1.3, 1.7], l1: [-2.15, 1.25, 1.0], fov: 26 },
      { to: tikF + 36, p0: [-1.0, 1.8, 3.1], l0: [-1.55, 1.68, 0.75], p1: [-1.15, 1.76, 2.7], l1: [-1.55, 1.68, 0.75], fov: 30 },
      { to: EV("sengat.plastic") + 48, p0: [-0.3, 1.15, 2.5], l0: [-1.22, 0.85, 0.75], p1: [-0.6, 1.0, 2.1], l1: [-1.22, 0.82, 0.75], fov: 30 },
      { to: 9999, p0: [-0.5, 1.8, 8.2], l0: [-1.0, 1.2, 2.2], p1: [-1.8, 1.7, 7.4], l1: [-3.0, 1.1, 2.6], fov: 50 },
    ]
  );
  return (
    <AbsoluteFill>
      <Stage
        t={t}
        raniX={raniX}
        raniZ={0.69}
        raniRot={rot}
        raniWalking={walking}
        raniWalkF={2.0}
        raniReach={frame >= tikF + 4 ? Math.max(0, 1 - (frame - tikF - 4) / 8) : reach}
        raniShake={frame >= tikF && frame < tikF + 14 ? 1 : 0}
        raniUp={frame >= tikF ? 0.9 : 0.1}
        raniExpr={frame >= tikF ? "surprised" : "worried"}
        raniJump={frame >= tikF && frame < tikF + 10 ? Math.sin(((frame - tikF) / 10) * Math.PI) : 0}
        custs={custs}
        plastic={frame >= EV("sengat.plastic")}
        spark={{ pos: [hp[0] - 0.05, 1.22, hp[1]], s: burst * 1.7, seed: "s1" }}
        cam={cam.pos}
        look={cam.look}
        fov={cam.fov}
      />
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
      <Tik frame={frame} at={tikF} top={520} left={110} size={210} />
      <Chip n="⚡" label="RAK BESI" from={touchF} to={tikF + 30} top={430} left={false} color="#ffe14d" />
      <Caption text="Tiap Rani pegang rak besi, dia TERSENGAT" from={LN("sengat_1a").from} to={capTo("sengat_1a")} highlight={["TERSENGAT"]} top={1290} size={66} />
      <Caption text="Plastik bungkus menempel di lengannya, susah dikibas" from={LN("sengat_1c").from} to={capTo("sengat_1c")} highlight={["MENEMPEL"]} top={1290} size={64} />
      <Caption text="Pembeli pindah ke warung sebelah. Cuma Pak Botak yang santai" from={LN("sengat_2").from} to={capTo("sengat_2")} highlight={["PINDAH", "BOTAK"]} highlightColor={PINK} top={1290} size={60} />
      <SceneFade duration={DURATIONS_RANI.sengat} inFrames={0} outFrames={0} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. HUJAN                                                             */
/* ================================================================== */
export const SceneRaniHujan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rainOn = interpolate(frame, [EV("hujan.rain0"), EV("hujan.rain0") + 14], [0, 1], clamp);
  const rainOff = interpolate(frame, [EV("hujan.sun"), EV("hujan.sun") + 22], [1, 0], clamp);
  const rain = rainOn * rainOff;
  const up = interpolate(frame, [EV("hujan.up"), EV("hujan.up") + 24], [0, 0.85], clamp);
  const cheer = interpolate(frame, [LN("hujan_2a").from, LN("hujan_2a").from + 14, LN("hujan_2b").from - 6, LN("hujan_2b").from + 6], [0, 1, 1, 0], clamp);
  const x = 0.3;
  const sunBack = frame >= EV("hujan.sun");
  const cam = shotCam(frame, [
    { to: LN("hujan_2a").from - 4, p0: [0.6, 2.15, -2.55], l0: [0.1, 1.2, 7], p1: [0.3, 2.05, -2.2], l1: [0.0, 1.2, 7], fov: 58 },
    { to: EV("hujan.sun") - 4, p0: [0.4, 1.65, 0.9], l0: [1.3, 1.55, -1.7], p1: [0.6, 1.6, 0.6], l1: [1.35, 1.55, -1.7], fov: 40 },
    { to: EV("hujan.up") + 6, p0: [0.0, 1.5, 6.6], l0: [0.3, 1.25, 0.5], p1: [0.0, 1.5, 6.0], l1: [0.3, 1.25, 0.5], fov: 46 },
    { to: 9999, p0: [3.6, 2.3, 13.5], l0: [0, 1.5, 0.6], p1: [2.4, 2.0, 10.5], l1: [0, 1.5, 0.6], fov: 46 },
  ]);
  return (
    <AbsoluteFill>
      <Stage t={t} mood="sun" rain={rain} raniX={x} raniZ={1.6} raniExpr={cheer > 0.5 ? "happy" : "neutral"} custs={hairFor(x, up)} ratmi={{ armsUp: cheer, expr: cheer > 0.5 ? "happy" : "neutral" }} cam={cam.pos} look={cam.look} fov={cam.fov} />
      {rain > 0.05 && (
        <AbsoluteFill style={{ opacity: rain }}>
          <Rain count={90} />
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
/* 5. ALDI                                                              */
/* ================================================================== */
export const SceneRaniAldi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = interpolate(frame, [EV("aldi.enter"), EV("aldi.enter") + 40], [0, 1], { ...clamp, easing: ease });
  const aldiX = interpolate(enter, [0, 1], [3.4, 1.3]);
  const point = interpolate(frame, [EV("aldi.point"), EV("aldi.point") + 12], [0, 1], clamp);
  const phase = t * 0.55;
  const raniX = 0.2 + Math.sin(phase * Math.PI * 2) * 1.0;
  const dir = Math.cos(phase * Math.PI * 2) >= 0 ? Math.PI / 2 : -Math.PI / 2;
  const plus = interpolate(frame, [LN("aldi_1").from, LN("aldi_1").to], [0.15, 0.8], clamp);
  const cam = shotCam(
    frame,
    [
      { to: LN("aldi_1").from + 66, p0: [0.1, 0.3, 4.4], l0: [0.0, 0.16, 1.5], p1: [0.1, 0.34, 3.7], l1: [0.0, 0.14, 1.5], fov: 40, follow: 0.7 },
      { to: LN("aldi_1").to - 34, p0: [1.0, 0.95, 4.3], l0: [1.3, 0.88, 2.3], p1: [1.05, 0.98, 3.7], l1: [1.3, 0.9, 2.3], fov: 30 },
      { to: LN("aldi_2").from + 8, p0: [0.4, 1.25, 6.2], l0: [0.4, 0.95, 1.8], p1: [0.4, 1.2, 5.6], l1: [0.4, 0.95, 1.8], fov: 46 },
      { to: 9999, p0: [-1.2, 1.4, 7.4], l0: [1.9, 1.0, 3.6], p1: [-0.6, 1.5, 7.0], l1: [2.2, 1.0, 3.8], fov: 46 },
    ],
    raniX
  );
  return (
    <AbsoluteFill>
      <Stage
        t={t}
        raniX={raniX}
        raniZ={1.5}
        raniRot={dir}
        raniWalking
        raniWalkF={STEP_RANI}
        raniUp={0.55}
        raniExpr="neutral"
        custs={hairFor(raniX, 0.6)}
        aldi={{ x: aldiX, z: 2.4, visible: true, point, rot: point > 0.1 ? Math.PI / 2 - 0.15 : -0.15, expr: "smug" }}
        plus={plus}
        plusOrigin={[raniX, 0.55, 1.5]}
        cam={cam.pos}
        look={cam.look}
        fov={cam.fov}
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
/* 6. TIK                                                               */
/* ================================================================== */
export const SceneRaniTik: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const tikF = EV("tik.tik");
  const fallF = EV("tik.fall");
  const rel = Math.round(LN("tik_3").from + 0.62 * (LN("tik_3").to - LN("tik_3").from));
  const raniX = 1.58;
  const raniZ = 4.46;
  const reach = interpolate(frame, [EV("tik.touch"), tikF], [0, 1], clamp);
  const burst1 = interpolate(frame, [tikF, tikF + 3, tikF + 16], [0, 1, 0], clamp);
  const burst2 = interpolate(frame, [rel, rel + 3, rel + 16], [0, 1, 0], clamp);
  const up = frame < fallF ? 0.85 : frame < EV("tik.charge") ? interpolate(frame, [fallF, fallF + 14], [0.85, 0], clamp) : frame < rel ? interpolate(frame, [EV("tik.charge"), EV("tik.charge") + 24], [0, 0.9], clamp) : interpolate(frame, [rel, rel + 10], [0.9, 0], clamp);
  const plus = frame >= EV("tik.charge") && frame < rel ? interpolate(frame, [EV("tik.charge"), EV("tik.charge") + 20], [0, 1], clamp) : frame >= rel ? interpolate(frame, [rel, rel + 14], [0.6, 0], clamp) : frame < tikF ? 0.5 : 0;
  const flash = interpolate(frame, [tikF, tikF + 2, tikF + 9], [0, 0.6, 0], clamp);
  const flash2 = interpolate(frame, [rel, rel + 2, rel + 9], [0, 0.45, 0], clamp);
  const hp = handPos(raniX, raniZ, Math.PI / 2);
  const cam = shotCam(frame, [
    { to: tikF + 4, p0: [1.55, 1.3, 5.9], l0: [2.15, 1.2, 4.15], p1: [1.75, 1.28, 5.4], l1: [2.15, 1.2, 4.15], fov: 24 },
    { to: fallF + 46, p0: [-0.8, 1.9, 11.0], l0: [0.4, 1.3, 1.2], p1: [-0.2, 1.8, 10.2], l1: [0.5, 1.3, 1.4], fov: 52 },
    { to: LN("tik_2b").from, p0: [0.4, 1.45, 8.0], l0: [1.5, 1.25, 4.4], p1: [0.8, 1.45, 7.2], l1: [1.6, 1.25, 4.4], fov: 40 },
    { to: rel - 10, p0: [1.3, 1.78, 6.9], l0: [1.58, 1.76, 4.46], p1: [1.45, 1.78, 6.4], l1: [1.58, 1.76, 4.46], fov: 27 },
    { to: rel + 40, p0: [0.9, 1.5, 8.2], l0: [1.9, 1.3, 4.4], p1: [1.2, 1.45, 7.6], l1: [1.95, 1.3, 4.4], fov: 38 },
    { to: 9999, p0: [0.0, 1.9, 9.4], l0: [0.8, 1.3, 2.6], p1: [-0.6, 2.2, 11.5], l1: [0.8, 1.3, 2.2], fov: 50 },
  ]);
  return (
    <AbsoluteFill>
      <Stage
        t={t}
        raniX={raniX}
        raniZ={raniZ}
        raniRot={Math.PI / 2}
        raniReach={frame >= tikF + 14 && frame < rel ? 0 : reach}
        raniUp={up}
        raniShake={frame >= tikF && frame < tikF + 12 ? 1 : 0}
        raniExpr={frame < tikF ? "neutral" : frame < EV("tik.charge") ? "surprised" : "smug"}
        custs={hairFor(raniX, up)}
        plus={plus}
        plusOrigin={[raniX, 1.2, raniZ]}
        spark={{ pos: [hp[0] - 0.02, 1.22, hp[1]], s: Math.max(burst1, burst2) * 1.7, seed: frame >= rel ? "s3" : "s2" }}
        cam={cam.pos}
        look={cam.look}
        fov={cam.fov}
      />
      <AbsoluteFill style={{ background: "white", opacity: Math.max(flash, flash2) }} />
      <Tik frame={frame} at={tikF} top={500} left={90} size={230} />
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
/* 7. AKHIR                                                             */
/* ================================================================== */
export const SceneRaniAkhir: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const mat = spring({ frame: frame - EV("akhir.mat"), fps, config: { damping: 12 } });
  const basketPop = spring({ frame: frame - EV("akhir.basket"), fps, config: { damping: 6, stiffness: 160 } });
  const raniX = 0.4;
  const endF = LN("akhir_2").to - 8;
  const c1 = spring({ frame: frame - endF, fps, config: { damping: 12 } });
  const c2 = spring({ frame: frame - endF - 10, fps, config: { damping: 10, stiffness: 180 } });
  const cam = shotCam(frame, [
    { to: EV("akhir.mat") + 22, p0: [1.2, 2.3, 4.6], l0: [0.0, 0.0, 0.6], p1: [0.6, 2.0, 4.0], l1: [0.0, 0.0, 0.6], fov: 52 },
    { to: EV("akhir.basket") + 36, p0: [0.4, 1.25, 0.7], l0: [0.9, 1.18, -1.0], p1: [0.55, 1.28, 0.4], l1: [0.9, 1.2, -1.0], fov: 30 },
    { to: 9999, p0: [0.5, 1.6, 6.8], l0: [0.3, 1.4, 0], p1: [0.1, 2.3, 13.0], l1: [0.0, 1.7, 0], fov: 46 },
  ]);
  return (
    <AbsoluteFill>
      <Stage t={t} mood="golden" raniX={raniX} raniZ={1.7} raniExpr="happy" custs={hairFor(raniX, 0)} ratmi={{ expr: "happy" }} mat={frame >= EV("akhir.mat") ? mat : 0} basket={1 + 0.35 * Math.max(0, basketPop - 0.9) * (frame >= EV("akhir.basket") ? 1 : 0)} cam={cam.pos} look={cam.look} fov={cam.fov} />
      <Kicker text="BESOKNYA" from={4} top={235} />
      <Chip n="✔" label="KESET KAIN" from={EV("akhir.mat")} to={capTo("akhir_1")} top={430} left color="#7bdc66" />
      <Chip n="🌺" label="KEMBANG TETAP ADA" from={EV("akhir.basket") + 20} to={endF} top={430} left={false} color={PINK} />
      <Caption text="Bu Ratmi memasang KESET kain, lantai vinil pun ditutup" from={LN("akhir_1").from} to={capTo("akhir_1")} highlight={["KESET"]} top={1290} size={64} />
      <Caption text="Tapi keranjang kembang tujuh rupa TETAP ada. Jaga-jaga" from={LN("akhir_2").from} to={endF} highlight={["TETAP", "JAGA-JAGA"]} highlightColor={PINK} top={1290} size={64} />
      {frame >= endF && (
        <div style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1.04, color: "white", opacity: c1, transform: `scale(${1.5 - 0.5 * c1})`, WebkitTextStroke: "5px #1d3557", paintOrder: "stroke fill", textShadow: "0 10px 0 #1d3557" }}>LISTRIK STATIS</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 168, lineHeight: 1, color: GOLD, opacity: c2, transform: `scale(${1.7 - 0.7 * c2})`, WebkitTextStroke: "5px #7a4b00", paintOrder: "stroke fill", textShadow: "0 10px 0 #7a4b00" }}>BUKAN AURA</div>
        </div>
      )}
      <SceneFade duration={DURATIONS_RANI.akhir} inFrames={0} outFrames={14} />
    </AbsoluteFill>
  );
};

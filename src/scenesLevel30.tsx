import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { Expr, Person } from "./three/objectsRani";
import { Brain, BrainRoom, Capsa, ChiliPepper, Droplet, Envelope, FaceFX, GUARD_SPOTS, Guard, Kantin, MenuBoard, MouthSet, NerveTunnel, THREE, cl, lerp3, sm, tongueY } from "./three/objectsLevel30";
import timing from "./level30_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_L30 = timing.scenes as { hook: number; lidah: number; saraf: number; otak: number; air: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];

/* ------------------------------------------------------------------ */
/* Camera: every shot moves                                             */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; shake?: number };
const shotCam = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const k = sm(cl((frame - start) / Math.max(1, Math.min(s.to, start + 400) - start)));
      const p = lerp3(s.p0, s.p1 ?? s.p0, k);
      const l = lerp3(s.l0, s.l1 ?? s.l0, k);
      const sh = s.shake ?? 0;
      const jx = sh * Math.sin(frame * 2.3) * 0.5 + sh * Math.sin(frame * 5.1) * 0.3;
      const jy = sh * Math.cos(frame * 2.9) * 0.5;
      return { pos: [p[0] + jx, p[1] + jy, p[2]] as Vec3, look: l, fov: s.fov ?? 50 };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 50 };
};

const Stage: React.FC<{ cam: { pos: Vec3; look: Vec3; fov: number }; bg: string; shadows?: boolean; children: React.ReactNode }> = ({ cam, bg, shadows = false, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={width} height={height} shadows={shadows} camera={{ fov: cam.fov, near: 0.05, far: 220, position: cam.pos }}>
        <CameraRig position={cam.pos} lookAt={cam.look} fov={cam.fov} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* UI: 1-2 word captions synced to speech (safe area), tags, look        */
/* ------------------------------------------------------------------ */
const chunkText = (text: string) => {
  const words = text.replace(/[.,!?]/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const n = words[i + 1];
    if (n && w.length <= 4 && (w + n).length <= 12) {
      out.push(`${w} ${n}`);
      i++;
    } else out.push(w);
  }
  return out;
};

const Caps: React.FC<{ ids: LineId[]; hl?: string[]; color?: string; top?: number }> = ({ ids, hl = [], color = "#ffd23f", top = 1240 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hlU = hl.map((h) => h.toUpperCase());
  for (const id of ids) {
    const ln = LN(id);
    const chunks = chunkText(ln.text);
    const total = chunks.reduce((a, c) => a + c.length + 2, 0);
    const span = ln.to - ln.from + 3;
    let acc = 0;
    for (let i = 0; i < chunks.length; i++) {
      const s = ln.from + (acc / total) * span;
      acc += chunks[i].length + 2;
      const e = i === chunks.length - 1 ? ln.to + 8 : ln.from + (acc / total) * span;
      if (frame >= s && frame < e) {
        const sp = spring({ frame: frame - s, fps, config: { damping: 10, stiffness: 260 } });
        const txt = chunks[i].toUpperCase();
        const isHl = txt.split(" ").some((w) => hlU.includes(w));
        const size = Math.min(124, 740 / (txt.length * 0.5));
        return (
          <div style={{ position: "absolute", top, left: 90, width: 760, textAlign: "center" }}>
            <span
              style={{
                display: "inline-block",
                fontFamily: FONT_TITLE,
                fontSize: size,
                lineHeight: 1.1,
                color: isHl ? color : "white",
                WebkitTextStroke: "7px rgba(10,6,18,0.95)",
                paintOrder: "stroke fill",
                textShadow: isHl ? `0 0 34px ${color}99, 0 8px 0 rgba(10,6,18,0.7)` : "0 8px 0 rgba(10,6,18,0.7)",
                transform: `scale(${0.55 + 0.45 * sp}) rotate(${(1 - sp) * -3}deg)`,
                opacity: Math.min(1, sp * 1.6),
              }}
            >
              {txt}
            </span>
          </div>
        );
      }
    }
  }
  return null;
};

const Tag: React.FC<{ label: string; from: number; to: number; color?: string; top?: number; right?: boolean }> = ({ label, from, to, color = "#ffd23f", top = 190, right = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: right ? undefined : 60, right: right ? 190 : undefined, padding: "10px 24px", borderRadius: 16, background: "rgba(16,16,34,0.88)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, letterSpacing: 2, color: "white", opacity: s * out, transform: `translateX(${(1 - s) * (right ? 90 : -90)}px)`, boxShadow: `0 8px 30px ${color}55` }}>
      <span style={{ color }}>● </span>
      {label}
    </div>
  );
};

const Look: React.FC<{ tint?: string; heat?: number }> = ({ tint = "rgba(20,10,30,0)", heat = 0 }) => (
  <>
    <AbsoluteFill style={{ background: tint }} />
    {heat > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, rgba(255,40,0,0) 40%, rgba(255,30,0,${0.5 * heat}) 100%)`, mixBlendMode: "screen" }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(8,4,16,0.5) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(8,4,16,0) 62%, rgba(8,4,16,0.55) 86%, rgba(8,4,16,0.7) 100%)" }} />
  </>
);

/* ------------------------------------------------------------------ */
/* Shared pieces                                                         */
/* ------------------------------------------------------------------ */
const redden = (hot: number) => new THREE.Color("#c89068").lerp(new THREE.Color("#e03a2a"), cl(hot)).getStyle();

const KantinLights: React.FC = () => (
  <>
    <hemisphereLight args={["#fff2d6", "#8a6a4a", 0.9]} />
    <ambientLight intensity={0.55} color="#ffe9c8" />
    <directionalLight position={[3, 6, 7]} intensity={2.2} color="#fff1d0" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-3} shadow-camera-near={1} shadow-camera-far={25} shadow-bias={-0.0006} />
    <directionalLight position={[-4, 2, 5]} intensity={0.5} color="#ffd9a8" />
  </>
);

const BUDI_Z = 0.85;
const Budi: React.FC<{ t: number; hot?: number; expr?: Expr; shake?: number; jump?: number; armsUp?: number; fx?: { tears?: number; sweat?: number; steam?: number; snot?: number } }> = ({ t, hot = 0, expr = "neutral", shake = 0, jump = 0, armsUp = 0, fx }) => (
  <>
    <Person position={[0, -0.42, BUDI_Z]} t={t} skin={redden(hot)} shirt="#3a86c8" pants="#3b3f63" hair="#1c1410" style="short" seed="budi" expr={expr} shake={shake} jump={jump} armsUp={armsUp} />
    <FaceFX head={[0, 1.18, BUDI_Z]} t={t} {...fx} />
  </>
);

type GuardState = { alarm?: number; cheer?: number; slump?: number; fire?: number; cry?: number };
const Guards: React.FC<{ t: number; st: (i: number) => GuardState; n?: number }> = ({ t, st, n = 8 }) => (
  <>
    {GUARD_SPOTS.slice(0, n).map(([x, z], i) => (
      <Guard key={i} t={t} position={[x, tongueY(x, z) - 0.02, z]} scale={0.9} seed={`gd${i}`} look={Math.sin(i * 1.7) * 0.3} {...st(i)} />
    ))}
  </>
);
const guardHead = (i: number): Vec3 => {
  const [x, z] = GUARD_SPOTS[i];
  return [x + 0.4, tongueY(x, z) + 1.25, z + 0.3];
};

/* ================================================================== */
/* 1. HOOK: Budi bites the chili, freezes, camera dives into his mouth */
/* ================================================================== */
export const SceneL30Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const bite = EV("hook.bite");
  const freeze = EV("hook.freeze");
  const dive = EV("hook.dive");
  const hot = interpolate(f, [bite, freeze + 60], [0, 1], clamp);
  const chiliZ = interpolate(f, [0, bite - 4, bite, bite + 16], [1.52, 1.4, 1.4, 1.6], clamp);
  const chiliX = interpolate(f, [bite, bite + 16], [0.1, 1.1], clamp);
  const mouthS = f >= dive ? interpolate(f, [dive, dive + 52], [0.03, 2.1], clamp) : 0;
  const cam = shotCam(f, [
    { to: bite + 14, p0: [0.42, 1.28, 2.55], l0: [0.1, 1.1, 1.15], p1: [0.2, 1.22, 2.15], l1: [0.06, 1.1, 1.1], fov: 38 },
    { to: freeze + 60, p0: [0, 1.25, 2.3], l0: [0, 1.2, 1.0], p1: [0, 1.21, 1.62], l1: [0, 1.17, 1.0], fov: 30 },
    { to: dive, p0: [3.4, 1.7, 5.4], l0: [0, 1.1, 1.0], p1: [2.5, 1.55, 4.4], l1: [0, 1.1, 1.0], fov: 44 },
    { to: 9999, p0: [0, 1.14, 2.5], l0: [0, 1.1, 1.0], p1: [0, 1.1, 1.28], l1: [0, 1.1, 1.0], fov: 40, shake: 0.02 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#f3d9a6" shadows>
        <KantinLights />
        <Kantin t={t} />
        <Budi t={t} hot={hot} expr={f < bite ? "neutral" : "surprised"} shake={interpolate(f, [freeze + 20, freeze + 60], [0, 0.6], clamp)} fx={{ steam: interpolate(f, [freeze + 40, freeze + 64], [0, 1], clamp), sweat: interpolate(f, [freeze + 30, freeze + 50], [0, 1], clamp) }} />
        <ChiliPepper position={[chiliX, 1.09, chiliZ]} rotation={[Math.PI / 2, 0, 0.1]} scale={1.15} bite={f > bite ? 1 : 0} />
        {mouthS > 0 && (
          <mesh position={[0, 1.07, 1.05]} scale={[mouthS, mouthS * 1.15, 0.3]}>
            <sphereGeometry args={[0.1, 14, 12]} />
            <meshBasicMaterial color="#4a0a14" />
          </mesh>
        )}
      </Stage>
      <Look heat={hot * 0.7} />
      <Tag label="LEVEL 30" from={0} to={bite + 40} color="#ff5a1f" />
      <Caps ids={["hook_1", "hook_2", "hook_3"]} hl={["level", "tiga", "puluh", "Diam", "mulutnya"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. LIDAH: receptor guards get tricked by capsaicin                   */
/* ================================================================== */
export const SceneL30Lidah: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const chiliF = EV("lidah.chili");
  const cheat = EV("lidah.cheat");
  const alarm = EV("lidah.alarm");
  const hot = interpolate(f, [cheat, cheat + 50], [0, 0.85], clamp);
  const fireK = interpolate(f, [cheat, cheat + 24], [0, 1], clamp);
  const al = f >= alarm ? 1 : 0;
  const chiliK = sm(cl((f - (chiliF - 16)) / 16));
  const chiliPos: Vec3 = [0.3, 4.2 + (tongueY(0.3, 2.0) + 0.25 - 4.2) * chiliK, 2.0];
  const cam = shotCam(f, [
    { to: 40, p0: [0, 2.6, 11.5], l0: [0, 1, 2], p1: [0, 2.1, 7.6], l1: [0, 0.9, 2.2], fov: 52 },
    { to: 108, p0: [-3.2, 0.9, 6.3], l0: [-0.8, 1, 2.6], p1: [1.0, 1.1, 5.6], l1: [0.4, 1.0, 2.4], fov: 44 },
    { to: 168, p0: [3.6, 2.6, 6.2], l0: [0.3, 0.7, 2], p1: [2.4, 1.9, 5.4], l1: [0.5, 0.9, 2], fov: 44 },
    { to: alarm, p0: [-0.2, 1.55, 4.6], l0: [-0.9, 1.2, 2.5], p1: [-0.6, 1.45, 3.9], l1: [-0.9, 1.25, 2.5], fov: 30 },
    { to: 9999, p0: [0, 1.9, 8], l0: [0, 1.3, 2.5], p1: [0, 1.7, 5.4], l1: [0, 1.3, 2.5], fov: 50, shake: 0.09 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#5a0f1a">
        <MouthSet t={t} hot={hot} front={f < 44} />
        <Guards t={t} st={(i) => ({ alarm: al ? 1 : fireK > 0.4 ? 0.5 : 0, fire: fireK * (i % 7 === 6 ? 0.7 : 1), cheer: 0 })} />
        <ChiliPepper position={chiliPos} rotation={[0.2, 0.4, Math.PI / 2 + 0.1]} scale={1.5} bite={1} tag />
        {f > chiliF &&
          GUARD_SPOTS.map((_, j) => {
            const k = sm(cl((f - (chiliF + 4 + j * 3)) / 38));
            const from: Vec3 = [0.3, tongueY(0.3, 2) + 0.5, 2.0];
            const to = guardHead(j);
            const p = lerp3(from, to, k);
            return <Capsa key={j} t={t} position={[p[0], p[1] + Math.sin(k * Math.PI) * 1.2, p[2]]} scale={0.85} seed={`m${j}`} />;
          })}
      </Stage>
      <Look heat={hot * 0.8 + (al ? 0.25 * (0.5 + 0.5 * Math.sin(f * 0.8)) : 0)} />
      <Tag label="RESEPTOR LIDAH" from={4} to={104} color="#6fb1ff" />
      <Tag label="CAPSAICIN" from={chiliF} to={cheat + 40} color="#ff7a2a" />
      <Caps ids={["lidah_1", "lidah_2", "lidah_3"]} hl={["satpam", "reseptor", "capsaicin", "menipu", "terbakar", "Kebakaran"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. SARAF: the fake news runs to the brain                            */
/* ================================================================== */
export const SceneL30Saraf: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const brainF = EV("saraf.brain");
  const believe = EV("saraf.believe");
  const arrive = sm(cl((f - brainF) / 37));
  const runnerZ = -8 * arrive;
  const envK = sm(cl((f - (believe - 12)) / 14));
  const cam = shotCam(f, [
    { to: 40, p0: [5.5, 0.2, 3.5], l0: [0, -0.7, 0], p1: [4.4, 0.0, 2.4], l1: [0, -0.7, 0], fov: 55 },
    { to: brainF, p0: [0.7, -0.4, 5.2], l0: [0, -0.5, -4], p1: [0.2, 0.0, 3.3], l1: [0, -0.5, -4], fov: 72 },
    { to: believe, p0: [0.4, -0.3, 3.5], l0: [0, -0.2, -12], p1: [0.2, -0.3, -4.5], l1: [0, 0, -13], fov: 62 },
    { to: 9999, p0: [0, 0.2, -8.2], l0: [0, 0, -13], p1: [0, 0.1, -9.4], l1: [0, 0.1, -13], fov: 40 },
  ]);
  const showBrain = f >= brainF - 8;
  const brainScale = 0.6 + 0.6 * sm(cl((f - (brainF - 8)) / 30));
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#2a0f24">
        <NerveTunnel t={t} speed={f < brainF ? 26 : 12 * (1 - arrive) + 3} />
        <Guard t={t} position={[f >= believe ? -1.2 : 0, -1.5, runnerZ - (f >= believe ? 2.5 : 0)]} rotationY={Math.PI} scale={1.1} run={f >= believe ? 0 : 1} cheer={f >= believe ? 0.6 : 0} body="#e63946" cap="#7a0f1a" seed="runner" />
        {f < believe - 12 && <Envelope position={[0, -0.55, runnerZ - 0.1]} t={t} scale={1.2} />}
        {f >= believe - 12 && <Envelope position={lerp3([0, -0.55, runnerZ - 0.1], [0, 1.0, -11.3], envK)} t={t} scale={1.2 - 0.5 * envK} open={envK} />}
        <mesh position={[0, 0, -14.6]}>
          <circleGeometry args={[2.55, 20]} />
          <meshBasicMaterial color="#fff2d8" />
        </mesh>
        {showBrain && <Brain position={[0, 0, -13]} scale={brainScale} t={t} nod={f >= believe ? 1 : 0} happy={f >= believe ? 1 : 0} glow={f >= believe ? 1 : arrive} />}
      </Stage>
      <Look heat={f < brainF ? 0.3 : 0} />
      <Tag label="JALUR SARAF" from={2} to={74} color="#ffd23f" />
      <Tag label="OTAK" from={brainF + 4} to={believe + 50} color="#ff8fb1" />
      <Caps ids={["saraf_1", "saraf_2"]} hl={["bohong", "berlari", "otak", "percaya"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. OTAK: panicked operator pushes every button; Budi leaks            */
/* ================================================================== */
const pulse = (f: number, at: number, len = 12) => (f < at ? 0 : f > at + len ? 0 : Math.sin(((f - at) / len) * Math.PI));

export const SceneL30Otak: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const cry = EV("otak.cry");
  const b1 = EV("otak.b1");
  const b2 = EV("otak.b2");
  const b3 = EV("otak.b3");
  const inRoom = f < cry;
  if (inRoom) {
    const pr: [number, number, number] = [pulse(f, b1 + 14), pulse(f, b2 + 14), pulse(f, b3 + 14)];
    const opX = interpolate(f, [b1, b1 + 14, b2, b2 + 14, b3, b3 + 14], [0, -2.9, -2.9, 0, 0, 2.9], clamp);
    const press = Math.max(...pr);
    const cam = shotCam(f, [
      { to: 42, p0: [0, 3.4, 10], l0: [0, 1.9, -1], p1: [0, 2.7, 7.4], l1: [0, 2.0, -1], fov: 50 },
      { to: b1, p0: [2.8, 2.3, 3.2], l0: [0, 1.5, -1.8], p1: [1.4, 2.1, 2.5], l1: [0, 1.4, -1.8], fov: 46, shake: 0.03 },
      { to: b2, p0: [-1.0, 1.8, 2.4], l0: [-2.6, 1.6, -2.2], p1: [-2.0, 1.9, 1.5], l1: [-2.8, 2.0, -3.0], fov: 46 },
      { to: b3, p0: [0.0, 1.9, 2.6], l0: [0, 1.9, -2.5], p1: [0.4, 2.1, 1.7], l1: [0, 2.2, -3.2], fov: 46 },
      { to: 9999, p0: [3.4, 1.8, 2.8], l0: [2.9, 1.9, -2.6], p1: [4.2, 2.2, 3.8], l1: [1.5, 2.2, -2], fov: 52, shake: 0.05 },
    ]);
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="#1c2547">
          <BrainRoom t={t} pressed={pr} />
          <Guard t={t} position={[opX, 0.1, -2.0]} scale={1.5} press={press} alarm={0.8} glasses headset body="#8a5fd1" cap="#3d2a7a" seed="boss" />
          <Guard t={t} position={[-5.2, 0.0, -1.0]} rotationY={0.5} scale={1.1} alarm={1} body="#2f6fe0" seed="aid1" />
          <Guard t={t} position={[5.2, 0.0, -1.0]} rotationY={-0.5} scale={1.1} alarm={1} body="#2fa86a" cap="#165c3a" seed="aid2" />
        </Stage>
        <Look tint="rgba(60,0,10,0.12)" heat={0.25 + 0.2 * Math.sin(f * 0.5)} />
        <Tag label="RUANG KENDALI OTAK" from={2} to={b1 - 8} color="#b69bff" />
        <Caps ids={["otak_1", "otak_2"]} hl={["panik", "Air", "mata", "Ingus", "Keringat", "semuanya"]} color="#ff6a6a" />
      </AbsoluteFill>
    );
  }
  const snotF = EV("otak.snot");
  const sweatF = EV("otak.sweat");
  const cam = shotCam(f, [
    { to: snotF, p0: [0, 1.28, 2.5], l0: [0, 1.17, 1.0], p1: [0, 1.22, 1.9], l1: [0, 1.15, 1.0], fov: 34 },
    { to: sweatF, p0: [0.55, 1.1, 1.9], l0: [0, 1.08, 1.0], p1: [0.3, 1.1, 1.5], l1: [0, 1.08, 1.0], fov: 32 },
    { to: 9999, p0: [2.6, 1.9, 4.4], l0: [0, 1.0, 1.0], p1: [1.6, 1.7, 3.6], l1: [0, 1.0, 1.0], fov: 44 },
  ]);
  const wet = interpolate(f, [cry, cry + 24], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#f3d9a6" shadows>
        <KantinLights />
        <Kantin t={t} />
        <Budi t={t} hot={1} expr="worried" shake={0.25} armsUp={0.25} fx={{ tears: wet, snot: interpolate(f, [snotF, snotF + 24], [0, 1], clamp), sweat: interpolate(f, [sweatF - 10, sweatF + 10], [0.4, 1.6], clamp), steam: 1 }} />
      </Stage>
      <Look heat={0.55} />
      <Tag label="MAS BUDI" from={cry + 2} to={cry + 60} color="#ff7a5a" />
      <Caps ids={["otak_3"]} hl={["menangis", "ingusan", "basah", "satu", "gigitan"]} color="#7ad0ff" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. AIR: water bounces off; milk pulls the capsaicin away              */
/* ================================================================== */
const N_DROPS = 30;
const dropSpec = (i: number) => {
  const near = random(`dn${i}`) < 0.65;
  const g = i % 8;
  const [gx, gz] = GUARD_SPOTS[g];
  return {
    g,
    near,
    x: near ? gx + 0.35 + (random(`dx${i}`) - 0.5) * 0.5 : (random(`dx${i}`) - 0.5) * 6,
    z: near ? gz + 0.3 + (random(`dz${i}`) - 0.5) * 0.4 : (random(`dz${i}`) - 0.3) * 5.5 + 1,
    s: 70 + i * 3.2,
    dir: random(`dd${i}`) > 0.5 ? 1 : -1,
  };
};
const MILK: Vec3[] = [[-1.5, 1.4, 2.6], [0.9, 1.5, 2.7], [1.7, 1.4, 0.6], [-0.4, 1.3, 0.1]];

export const SceneL30Air: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const macro = EV("air.macro");
  const nope = EV("air.nope");
  const milk = EV("air.milk");
  const pull = EV("air.pull");
  const chug = f < macro - 2;
  if (chug) {
    const cam = shotCam(f, [{ to: 9999, p0: [0.9, 1.35, 2.7], l0: [0, 1.15, 1.0], p1: [0.4, 1.25, 2.0], l1: [0, 1.12, 1.0], fov: 36 }]);
    const tilt = interpolate(f, [4, 22], [0.4, 1.0], clamp);
    return (
      <AbsoluteFill>
        <Stage cam={cam} bg="#f3d9a6" shadows>
          <KantinLights />
          <Kantin t={t} />
          <Budi t={t} hot={1} expr="worried" shake={0.1} fx={{ sweat: 1, tears: 0.6, steam: 0.8 }} />
          <group position={[0.02, 1.2, 1.3]} rotation={[-Math.PI / 2 - 0.7 * tilt, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
              <meshStandardMaterial color="#aee0ff" transparent opacity={0.5} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.33, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 0.14, 8]} />
              <meshStandardMaterial color="#fff" />
            </mesh>
            <mesh position={[0, -0.05 * (1 + f / 60), 0]} scale={[1, Math.max(0.1, 1 - f / 70), 1]}>
              <cylinderGeometry args={[0.085, 0.085, 0.4, 12]} />
              <meshStandardMaterial color="#4db1ff" transparent opacity={0.8} />
            </mesh>
          </group>
        </Stage>
        <Look heat={0.4} />
        <Caps ids={["air_1"]} hl={["menenggak", "air"]} color="#7ad0ff" />
      </AbsoluteFill>
    );
  }
  const cool = interpolate(f, [pull, pull + 30], [0, 1], clamp);
  const hot = 0.85 * (1 - cool * 0.8);
  const fire = 1 - cool;
  const cam = shotCam(f, [
    { to: 122, p0: [-2.6, 2.8, 6.6], l0: [0, 1.0, 1.5], p1: [0.6, 2.4, 5.6], l1: [-0.3, 1.0, 1.8], fov: 46 },
    { to: 173, p0: [0.9, 2.1, 4.6], l0: [-0.5, 1.6, 2.7], p1: [0.2, 2.0, 4.0], l1: [-0.55, 1.6, 2.8], fov: 30 },
    { to: nope - 4, p0: [-1.6, 2.0, 4.4], l0: [-0.6, 1.6, 2.8], p1: [-0.9, 1.9, 3.8], l1: [-0.5, 1.6, 2.8], fov: 26 },
    { to: milk, p0: [0, 1.8, 7.2], l0: [0, 1.2, 2], p1: [0, 1.8, 5.9], l1: [0, 1.2, 2], fov: 48, shake: 0.04 },
    { to: pull, p0: [0, 4.2, 8], l0: [0, 1.0, 1.5], p1: [0, 3.4, 7.2], l1: [0, 1.0, 1.5], fov: 50 },
    { to: 9999, p0: [1.8, 2.2, 5.6], l0: [0, 1.2, 2.0], p1: [0.4, 2.2, 4.6], l1: [0, 1.2, 2.0], fov: 42 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#5a0f1a">
        <MouthSet t={t} hot={hot} />
        <Guards
          t={t}
          st={(i) => ({
            alarm: f < nope ? 0.5 : 0,
            cry: f >= nope && f < pull ? 1 : 0,
            slump: 0,
            cheer: f > pull + 20 ? 1 : 0,
            fire: fire * (i % 7 === 6 ? 0.7 : 1),
          })}
        />
        {GUARD_SPOTS.map((_, j) => {
          const h = guardHead(j);
          const blob = MILK[j % 4];
          const k = sm(cl((f - (pull + j * 2)) / 40));
          const fade = 1 - sm(cl((f - (pull + 52)) / 24));
          const stuck: Vec3 = [h[0] + Math.sin(t * 17 + j) * 0.015, h[1] + Math.cos(t * 13 + j) * 0.015, h[2]];
          const p = lerp3(stuck, [blob[0], blob[1] + 0.3, blob[2]], k);
          return <Capsa key={j} t={t} position={p} scale={0.85 * (1 - 0.45 * k) * fade} seed={`m${j}`} mad={1 - k} />;
        })}
        {Array.from({ length: N_DROPS }, (_, i) => {
          const d = dropSpec(i);
          const fl = f - (macro + d.s - 64);
          if (fl < 0) return null;
          const ground = tongueY(d.x, d.z) + 0.16;
          const hc = d.near ? tongueY(d.x, d.z) + 1.3 : ground;
          const tc = (9 - hc) / 0.34;
          let pos: Vec3;
          let op = 0.8;
          if (fl < tc) pos = [d.x, 9 - fl * 0.34, d.z];
          else {
            const u = fl - tc;
            if (d.near) {
              const uu = Math.min(u, 26) / 26;
              pos = [d.x + d.dir * u * 0.045, hc + 0.9 * uu - 1.0 * uu * uu * 1.0 - (u > 26 ? (u - 26) * 0.07 : 0), d.z + u * 0.01];
              if (pos[1] < ground) pos[1] = ground;
            } else pos = [d.x, ground, d.z - u * 0.05];
            op = 0.8 * (1 - cl((u - 70) / 30));
          }
          if (f > milk + 20) op *= 1 - cl((f - (milk + 20)) / 20);
          if (op <= 0.02) return null;
          return <Droplet key={i} position={pos} r={0.15} opacity={op} />;
        })}
        {f > milk &&
          MILK.map((b, i) => {
            const k = sm(cl((f - (milk + i * 5)) / 36));
            const y = 9 + (b[1] - 9) * k;
            const s = 0.6 + 0.35 * (i % 2) + 0.1 * Math.sin(t * 4 + i);
            return (
              <mesh key={i} position={[b[0], y, b[2]]} scale={[s, s * 0.95, s]}>
                <sphereGeometry args={[1, 14, 12]} />
                <meshStandardMaterial color="#fffaf0" transparent opacity={0.82 - 0.35 * cool} roughness={0.2} emissive="#fff3d6" emissiveIntensity={0.4} />
              </mesh>
            );
          })}
      </Stage>
      <Look heat={hot * 0.55} />
      <Tag label="AIR" from={macro} to={nope - 4} color="#5ab8ff" />
      <Tag label="MINYAK" from={macro + 6} to={nope - 4} color="#ff7a2a" top={262} />
      <Tag label="SUSU" from={milk} to={pull + 70} color="#fff3d6" />
      <Caps ids={["air_2", "air_3", "air_4"]} hl={["minyak", "bukan", "lewat", "nempel", "mempan", "susu", "lemaknya", "pergi"]} color="#ffb45a" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. AKHIR: relief, the waiter, level 31                               */
/* ================================================================== */
export const SceneL30Akhir: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const waiterF = EV("akhir.waiter");
  const nod = EV("akhir.nod");
  const sigh = EV("akhir.sigh");
  const card = EV("akhir.card");
  const wx = interpolate(f, [waiterF - 20, waiterF + 22], [5.2, 2.0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cam = shotCam(f, [
    { to: waiterF, p0: [1.4, 1.6, 5.6], l0: [0, 1.15, 1], p1: [0.6, 1.4, 4.4], l1: [0, 1.15, 1], fov: 42 },
    { to: nod - 8, p0: [2.8, 1.4, 4.8], l0: [1.2, 1.3, 0.9], p1: [1.8, 1.45, 4.1], l1: [1.0, 1.25, 0.9], fov: 42 },
    { to: sigh, p0: [0, 1.28, 2.6], l0: [0, 1.15, 1.0], p1: [0, 1.2, 1.95], l1: [0, 1.15, 1.0], fov: 32 },
    { to: 9999, p0: [0, 2.1, 7.2], l0: [0, 1.0, 2], p1: [0, 1.7, 5.6], l1: [0, 1.0, 2], fov: 48 },
  ]);
  const cutaway = f >= sigh;
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      {cutaway ? (
        <Stage cam={cam} bg="#5a0f1a">
          <MouthSet t={t} hot={0.1} />
          <Guards t={t} st={() => ({ slump: 1, cry: 0, fire: 0 })} />
        </Stage>
      ) : (
        <Stage cam={cam} bg="#f3d9a6" shadows>
          <KantinLights />
          <Kantin t={t} milk={1} />
          <Budi t={t} hot={interpolate(f, [0, 70], [0.5, 0.1], clamp)} expr={f > nod - 6 ? "smug" : "happy"} jump={pulse(f, nod, 10) * 0.3} fx={{ steam: interpolate(f, [0, 40], [0.6, 0], clamp) }} />
          <Person position={[wx, 0, 0.9]} rotationY={-0.5} t={t} walking={f < waiterF + 22} walkF={2.4} skin="#a8754f" shirt="#2a9d8f" pants="#222" hair="#0e0a08" style="short" apron="#ffffff" pointArm={f > waiterF + 22 ? 0.0 : 0} expr="happy" seed="waiter" look={-0.3} />
          {f > waiterF - 10 && <MenuBoard position={[wx - 0.32, 1.3, 1.28]} rotation={[0, -0.25, 0.05]} scale={1.35} />}
        </Stage>
      )}
      <Look heat={0} />
      <Caps ids={["akhir_1", "akhir_2", "akhir_3", "akhir_4"]} hl={["tenang", "tambah", "level", "satu", "mengangguk", "Lagi"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(10,6,18,${0.62 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.7 + 0.3 * cardK})`, opacity: cardK, width: 760 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1.05, color: "#ff5a1f", WebkitTextStroke: "8px #1a0a0a", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a0a0a" }}>LEVEL 31?</div>
            <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 48, color: "white", lineHeight: 1.25 }}>Kena pedas? Minum susu, bukan air.</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

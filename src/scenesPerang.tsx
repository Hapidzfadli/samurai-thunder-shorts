import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig, Vec3 } from "./three/objects";
import { Body, Pose3, Rig3D, idle3, lerpN, lerpV, smooth3, walk3 } from "./three/objectsRig";
import { Horse3D, Matchlock } from "./three/objectsWar";
import { Crowd, Maku, Nobori, Palisade, Puffs, Terrain } from "./three/objectsBattle";
import timing from "./perang_timing.json";
import { FONT_BODY, FONT_TITLE } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const DURATIONS_PERANG = timing.scenes as { hook: number; pagar: number; serbu: number; tembak: number; runtuh: number; panglima: number; akhir: number };
type LineId = keyof typeof timing.lines;
const LN = (id: LineId) => timing.lines[id];
const EV = (name: string) => (timing.events as Record<string, number>)[name];
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/* ------------------------------------------------------------------ */
/* Camera                                                                */
/* ------------------------------------------------------------------ */
type Shot = { to: number; p0: Vec3; l0: Vec3; p1?: Vec3; l1?: Vec3; fov?: number; fov1?: number };
const shotCam = (frame: number, shots: Shot[]) => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, Math.min(s.to, start + 600) - start);
      const k = smooth3((frame - start) / len);
      const f0 = s.fov ?? 40;
      return { pos: lerpV(s.p0, s.p1 ?? s.p0, k), look: lerpV(s.l0, s.l1 ?? s.l0, k), fov: f0 + ((s.fov1 ?? f0) - f0) * k };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 40 };
};
type Cam = { pos: Vec3; look: Vec3; fov: number };

const SKY = "linear-gradient(#5aa9e6 0%, #8cc6f0 45%, #cfe7f7 80%, #eaf4fb 100%)";
const Stage: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: SKY }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.1, far: 220, position: cam.pos }}>
        <CameraRig position={cam.pos} lookAt={cam.look} fov={cam.fov} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* UI: documentary titles, chips, tiny captions                          */
/* ------------------------------------------------------------------ */
const chunkText = (text: string) => {
  const words = text.replace(/[.,!?:]/g, " ").split(/\s+/).filter(Boolean);
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
const Caps: React.FC<{ ids: LineId[]; hl?: string[]; color?: string; top?: number }> = ({ ids, hl = [], color = "#ffd23f", top = 1330 }) => {
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
        const sp = spring({ frame: frame - s, fps, config: { damping: 12, stiffness: 240 } });
        const txt = chunks[i].toLowerCase();
        const isHl = txt.split(" ").some((w) => hlU.includes(w.toUpperCase()));
        const size = Math.min(88, 700 / (txt.length * 0.52));
        return (
          <div style={{ position: "absolute", top, left: 90, width: 760, textAlign: "center" }}>
            <span style={{ display: "inline-block", fontFamily: FONT_BODY, fontWeight: 800, fontSize: size, lineHeight: 1.1, color: isHl ? color : "#fff", WebkitTextStroke: "7px rgba(18,12,10,0.95)", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(18,12,10,0.6)", transform: `scale(${0.7 + 0.3 * sp})`, opacity: Math.min(1, sp * 1.6) }}>
              {txt}
            </span>
          </div>
        );
      }
    }
  }
  return null;
};
const Chip: React.FC<{ label: string; from: number; to: number; top?: number; color?: string; n?: string }> = ({ label, from, to, top = 190, color = "#ffd23f", n }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame > to) return null;
  const s = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top, left: 60, padding: "12px 26px", borderRadius: 10, background: "rgba(24,18,16,0.88)", border: `3px solid ${color}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, letterSpacing: 3, color: "#fff", opacity: s * out, transform: `translateX(${(1 - s) * -100}px)`, boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}>
      {n && <span style={{ color }}>{n} </span>}
      {label}
    </div>
  );
};
const Finish: React.FC<{ warm?: number }> = ({ warm = 0.2 }) => (
  <>
    <AbsoluteFill style={{ mixBlendMode: "soft-light", background: `rgba(255,210,150,${warm})` }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 62%, rgba(20,14,10,0.38) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(rgba(20,14,10,0) 66%, rgba(20,14,10,0.5) 88%, rgba(20,14,10,0.62) 100%)" }} />
  </>
);

/* ------------------------------------------------------------------ */
/* World and characters                                                  */
/* ------------------------------------------------------------------ */
const ASH: Body = { shirt: "#3a4a6a", pants: "#2a2f40", skin: "#c79a72", hairStyle: "none", armor: "ashigaru", accent: "#c9b27a", height: 0.98, shoes: "#111" };
const NOB: Body = { shirt: "#1a1822", pants: "#16141c", skin: "#c79a72", hairStyle: "none", armor: "commander", banner: "#f4f1e8", accent: "#b3141b", height: 1.06, shoes: "#111" };
const GUARD: Body = { shirt: "#1a1822", pants: "#16141c", skin: "#c79a72", hairStyle: "none", armor: "samurai", banner: "#f4f1e8", accent: "#1d3f8a", height: 1.0, shoes: "#111" };
const TAK: Body = { shirt: "#8a1c1c", pants: "#2a1418", skin: "#c79a72", hairStyle: "none", armor: "samurai", banner: "#c21d1d", accent: "#d8a93a", height: 0.92, shoes: "#111" };

const PALI_X = -3.0;
const ROW_X = [-5.8, -6.8, -7.8];
const ROW_Z = [-1.6, 0, 1.6];

const OdaArmy: React.FC<{ t: number; cheer?: number }> = ({ t, cheer = 0 }) => (
  <>
    <Crowd origin={[-11.4, 0, 0]} cols={15} rows={4} dx={1.0} dz={0.95} clan="oda" t={t} rotationY={Math.PI / 2} bannerEvery={6} />
    <Crowd origin={[-6.2, 0, -8.2]} cols={4} rows={2} dx={1.0} dz={0.95} clan="oda" t={t} rotationY={Math.PI / 2} bannerEvery={5} />
    <Crowd origin={[-6.2, 0, 6.6]} cols={4} rows={2} dx={1.0} dz={0.95} clan="oda" t={t} rotationY={Math.PI / 2} bannerEvery={5} />
    <Palisade x={PALI_X} z0={-10.5} z1={10.5} />
  </>
);
const TakedaArmy: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Crowd origin={[22, 0, 0]} cols={17} rows={5} dx={1.2} dz={0.95} clan="takeda" t={t} rotationY={-Math.PI / 2} bannerEvery={5} spear />
  </>
);

/** Row of three arquebusiers. state: "aim" | "fire" | "reload". */
const GunRow: React.FC<{ x: number; t: number; state: "aim" | "fire" | "reload"; fireK?: number; seed: number }> = ({ x, t, state, fireK = 0, seed }) => (
  <>
    {ROW_Z.map((z, i) => {
      const aim: Pose3 = { ...idle3(t, seed + i), lean: 0.1, armR: { ik: { target: [0.12, 0.6, 0.34], pole: [0.5, -0.4, -0.1] } }, armL: { ik: { target: [-0.04, 0.66, 0.72], pole: [-0.5, -0.3, 0] } }, legL: { swing: 0.25, knee: 0.3 }, legR: { swing: -0.15, knee: 0.2 }, head: [0.05, 0, 0] };
      const kick: Pose3 = { ...aim, lean: -0.18 * fireK + 0.1 * (1 - fireK), bob: 0.02 * fireK, head: [-0.1 * fireK, 0, 0] };
      const reload: Pose3 = { ...idle3(t, seed + i), lean: 0.06, armR: { swing: 0.9, out: 0.2, elbow: 1.3 }, armL: { swing: 0.7, out: 0.2, elbow: 1.2 }, head: [0.25, 0, 0] };
      const pose = state === "fire" ? kick : state === "aim" ? aim : reload;
      return (
        <Rig3D key={i} position={[x, 0, z]} rotationY={Math.PI / 2} t={t} body={ASH} pose={pose} seed={seed + i}>
          <Matchlock position={[0.05, 0.62, 0.3]} rotation={[state === "reload" ? -1.4 : -0.15 + fireK * 0.12, 0, 0]} fire={state === "fire" ? fireK : 0} />
        </Rig3D>
      );
    })}
  </>
);

/** Charging rider: lane z, start x, goes toward the palisade. */
const Rider: React.FC<{ z: number; x: number; phase: number; t: number; fall?: number; seed: number; banner?: boolean }> = ({ z, x, phase, t, fall = 0, seed, banner }) => {
  const ride: Pose3 = { lean: 0.2, legL: { swing: 0.9, out: 0.55, knee: 0.9 }, legR: { swing: 0.9, out: 0.55, knee: 0.9 }, armL: { swing: -0.7, out: 0.2, elbow: 0.9 }, armR: { swing: -2.0, out: 0.3, elbow: 0.4 } };
  const slide = fall * 1.2;
  return (
    <group position={[x - slide, 0.5 * Math.sin(fall * Math.PI) * 1.2, z]} rotation={[0, 0, fall * 1.45]}>
      <Horse3D position={[0, 0, 0]} rotationY={-Math.PI / 2} phase={fall > 0 ? phase * (1 - fall) : phase} t={t} color={seed % 2 ? "#3b2a22" : "#6a4a32"} rider={{ body: seed % 3 ? TAK : { ...TAK, banner: "#c21d1d" }, pose: ride }} />
      {banner && <Nobori position={[0.3, 1.4, 0.25]} t={t} clan="takeda" h={2.4} seed={seed} />}
    </group>
  );
};
const DustTrail: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[x + 1.6 + i * 1.0, 0.35 + i * 0.12, z]} scale={0.7 + i * 0.5}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshBasicMaterial color="#d9c49a" transparent opacity={0.5 - i * 0.1} depthWrite={false} />
      </mesh>
    ))}
  </>
);

/* ================================================================== */
/* 1. HOOK                                                              */
/* ================================================================== */
export const ScenePerangHook: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const title = EV("hook.title");
  const tak = EV("hook.takeda");
  const cam = shotCam(f, [
    { to: tak, p0: [-22, 6.2, 3.2], l0: [8, 1.8, -0.4], p1: [-17.5, 4.4, 2.0], l1: [9, 1.8, -0.4], fov: 42 },
    { to: 9999, p0: [10, 2.2, 6.4], l0: [24, 1.7, 0], p1: [13, 2.6, 8], l1: [24, 1.7, 0], fov: 38 },
  ]);
  const ts = spring({ frame: f - title, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Terrain t={t} />
        <OdaArmy t={t} />
        <TakedaArmy t={t} />
        {[-1, 1].map((s) => (
          <Rig3D key={s} position={[-4.4, 0, s * 3.4]} rotationY={Math.PI / 2} t={t} body={GUARD} pose={idle3(t, s)} seed={s + 4} />
        ))}
      </Stage>
      <Finish />
      {f >= title && f < tak + 20 && (
        <div style={{ position: "absolute", top: 300, left: 70, width: 800, opacity: Math.min(1, ts), transform: `scale(${0.92 + 0.08 * ts})` }}>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontWeight: 900, fontSize: 72, color: "#ffd23f", textShadow: "0 4px 0 rgba(20,12,8,0.85)" }}>長篠の戦い</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 150, lineHeight: 1, color: "#fff", WebkitTextStroke: "8px #1a110c", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a110c" }}>NAGASHINO</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 52, letterSpacing: 10, color: "#fff", WebkitTextStroke: "5px #1a110c", paintOrder: "stroke fill" }}>1575</div>
        </div>
      )}
      <Chip label="PASUKAN ODA" from={4} to={tak - 6} color="#7fa8ff" />
      <Chip label="PASUKAN TAKEDA" from={tak + 4} to={tak + 80} color="#ff6b6b" />
      <Caps ids={["hook_1", "hook_2"]} hl={["seribu", "Nagashino", "berperang", "berkuda", "ditakuti"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. PAGAR                                                              */
/* ================================================================== */
export const ScenePerangPagar: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const count = EV("pagar.count");
  const match = EV("pagar.match");
  const cam = shotCam(f, [
    { to: count, p0: [-1.2, 1.75, 6.2], l0: [-6, 1.2, 0.5], p1: [-2.2, 1.6, 4.0], l1: [-6, 1.2, 0.3], fov: 34 },
    { to: 9999, p0: [-18, 3.8, -5], l0: [-3, 1.4, 0], p1: [-17, 3.4, 4.5], l1: [-3, 1.4, 0], fov: 40 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Terrain t={t} />
        <OdaArmy t={t} />
        <TakedaArmy t={t} />
        {ROW_X.map((x, r) => (
          <GunRow key={r} x={x} t={t} state={r === 0 ? "aim" : "reload"} seed={r * 3} />
        ))}
      </Stage>
      <Finish />
      <Chip label="3.000 PENEMBAK" from={count - 4} to={count + 90} color="#ffd23f" />
      <Chip label="SUMBU MENYALA" from={match} to={match + 80} color="#ff9f43" top={262} />
      <Caps ids={["pagar_1", "pagar_2"]} hl={["rencana", "tiga", "ribu", "penembak", "pagar", "Sumbu", "dinyalakan"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. SERBU                                                              */
/* ================================================================== */
const LANES = [-4.2, -2.6, -1.0, 0.6, 2.2, 3.8, -3.4, 1.4];
export const ScenePerangSerbu: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const shout = EV("serbu.shout");
  const total = DURATIONS_PERANG.serbu;
  const k = cl(f / total);
  const xs = LANES.map((_, i) => lerpN(30 + (i % 4) * 2.2, 2 + (i % 3) * 0.8, k));
  const lead = xs[3];
  const cam = shotCam(f, [
    { to: shout - 4, p0: [-15.5, 1.9, 0.0], l0: [10, 1.4, -0.3], p1: [-14.5, 1.8, 0.5], l1: [10, 1.4, -0.2], fov: 34 },
    { to: 9999, p0: [lead - 10, 2.0, 5.0], l0: [lead, 1.5, 0.6], p1: [lead - 9, 1.9, 4.6], l1: [lead, 1.5, 0.6], fov: 34 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Terrain t={t} />
        <OdaArmy t={t} />
        {ROW_X.map((x, r) => (
          <GunRow key={r} x={x} t={t} state="aim" seed={r * 3} />
        ))}
        {LANES.map((z, i) => (
          <group key={i}>
            <Rider z={z} x={xs[i]} phase={t * 1.9 + i * 0.3} t={t} seed={i} banner={i % 3 === 0} />
            <DustTrail x={xs[i]} z={z} />
          </group>
        ))}
      </Stage>
      <Finish />
      <Chip label="KAVALERI TAKEDA" from={6} to={shout - 4} color="#ff6b6b" />
      <Caps ids={["serbu_1", "serbu_2"]} hl={["menyerbu", "penuh", "Serbu"]} color="#ff9a8a" />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. TEMBAK: three rows, volley after volley                            */
/* ================================================================== */
export const ScenePerangTembak: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const rowsF = EV("tembak.rows");
  const v1 = EV("tembak.v1");
  const v2 = EV("tembak.v2");
  const v3 = EV("tembak.v3");
  const nev = EV("tembak.never");
  const MOVE = 22;
  // row A fires v1 then goes to the back; B fires v2; C fires v3
  const slot = (row: number) => {
    const order = [0, 1, 2];
    const phase1 = smooth3((f - (v1 + 10)) / MOVE);
    const phase2 = smooth3((f - (v2 + 10)) / MOVE);
    // slots: 0 front, 1 mid, 2 back. Start: row0 front, row1 mid, row2 back.
    // after v1: row0->2, row1->0, row2->1 ; after v2: row1->2, row2->0, row0->1
    const s0 = [0, 1, 2];
    const s1 = [2, 0, 1];
    const s2 = [1, 2, 0];
    const a = lerpN(s0[row], s1[row], phase1);
    const b = lerpN(a, s2[row], phase2);
    return order[0] * 0 + b;
  };
  const rowX = (row: number) => {
    const s = slot(row);
    return lerpN(lerpN(ROW_X[0], ROW_X[1], cl(s)), ROW_X[2], cl(s - 1));
  };
  const fireK = (v: number) => (f >= v && f < v + 12 ? 1 - (f - v) / 12 : 0);
  const state = (row: number): "aim" | "fire" | "reload" => {
    const vs = [v1, v2, v3][row];
    if (f < vs - 2) return row === 0 ? "aim" : f > [v1, v2][row - 1] + 30 ? "aim" : "reload";
    if (f < vs + 12) return "fire";
    return "reload";
  };
  const k = cl(f / (v3 + 60));
  const XC = [14, 12.5, 11, 15.5, 13.5, 12];
  const fallT = [v1 + 12, v1 + 20, v1 + 28, v2 + 12, v2 + 22, v3 + 10];
  const cam = shotCam(f, [
    { to: v1 - 6, p0: [-15.6, 2.8, 0.4], l0: [6, 1.2, 0], p1: [-14.4, 2.6, 0.6], l1: [6, 1.2, 0], fov: 36 },
    { to: v2 - 6, p0: [-6.8, 1.5, 9.8], l0: [-6.6, 1.3, 0], p1: [-6.8, 1.45, 8.6], l1: [-6.6, 1.3, 0], fov: 34 },
    { to: v3 - 6, p0: [-1.0, 1.05, 3.2], l0: [-6, 1.3, 0.2], p1: [-1.6, 1.1, 2.8], l1: [-6, 1.3, 0.1], fov: 32 },
    { to: 9999, p0: [-16, 3.2, 0.0], l0: [4, 1.4, 0], p1: [-15, 2.8, 0.8], l1: [4, 1.3, 0], fov: 38 },
  ]);
  const gunPos = (row: number, i: number): Vec3 => [rowX(row) + 1.0, 1.2, ROW_Z[i]];
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Terrain t={t} />
        <OdaArmy t={t} />
        {[0, 1, 2].map((r) => (
          <GunRow key={r} x={rowX(r)} t={t} state={state(r)} fireK={fireK([v1, v2, v3][r])} seed={r * 3} />
        ))}
        {[v1, v2, v3].map((v, r) =>
          ROW_Z.map((_, i) => <Puffs key={`${r}${i}`} origin={[ROW_X[0] + 1.0, 1.25, ROW_Z[i]]} start={v} f={f} n={9} size={1.0} spread={4} rise={1.8} life={110} seed={r * 7 + i} dir={[1, 0, 0]} />)
        )}
        {XC.map((x0, i) => {
          const hit = fallT[i];
          const kk = cl((f - 0) / (hit - 0));
          const x = f < hit ? lerpN(x0 + 18, -2.6 + (i % 3) * 0.4, kk) : -2.6 + (i % 3) * 0.4;
          const fall = f >= hit ? smooth3((f - hit) / 26) : 0;
          return (
            <group key={i}>
              <Rider z={LANES[i]} x={x} phase={t * 1.9 + i * 0.3} t={t} fall={fall} seed={i} banner={i % 3 === 0} />
              {f < hit && <DustTrail x={x} z={LANES[i]} />}
            </group>
          );
        })}
      </Stage>
      <Finish />
      {f >= rowsF && f < v1 + 40 && (
        <div style={{ position: "absolute", top: 190, left: 60, display: "flex", gap: 14 }}>
          {[["TEMBAK", "#ff9f43"], ["MUNDUR", "#7fa8ff"], ["ISI ULANG", "#7ddc8b"]].map(([l, c], i) => {
            const on = f >= rowsF + i * 22;
            return (
              <div key={l} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(24,18,16,0.9)", border: `3px solid ${c}`, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 34, color: "#fff", opacity: on ? 1 : 0.25, transform: `scale(${on ? 1 : 0.9})` }}>
                <span style={{ color: c as string }}>{i + 1} </span>
                {l}
              </div>
            );
          })}
        </div>
      )}
      <Chip label="VOLI KE-1" from={v1} to={v1 + 40} color="#ffd23f" top={262} />
      <Chip label="VOLI KE-2" from={v2} to={v2 + 40} color="#ffd23f" top={262} />
      <Chip label="VOLI KE-3" from={v3} to={v3 + 40} color="#ffd23f" top={262} />
      <Caps ids={["tembak_1", "tembak_2", "tembak_3"]} hl={["tiga", "tembak", "mundur", "isi", "ulang", "Tembak", "tidak", "berhenti"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. RUNTUH                                                             */
/* ================================================================== */
export const ScenePerangRuntuh: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const fall = EV("runtuh.fall");
  const last = EV("runtuh.last");
  const cam = shotCam(f, [
    { to: last, p0: [-3.4, 1.9, 11.5], l0: [-3.2, 1.0, 0], p1: [-3.4, 1.8, 9.2], l1: [-3.2, 1.0, 0], fov: 34 },
    { to: 9999, p0: [-17, 3.6, -2], l0: [2, 1.2, 0], p1: [-15, 3.2, 1.5], l1: [2, 1.2, 0], fov: 40 },
  ]);
  const hits = [fall, fall + 10, fall + 20, fall + 30, fall + 44, fall + 56, fall + 70, last];
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Terrain t={t} />
        <OdaArmy t={t} />
        {ROW_X.map((x, r) => (
          <GunRow key={r} x={x} t={t} state="reload" seed={r * 3} />
        ))}
        {LANES.map((z, i) => {
          const h = hits[i];
          const x0 = lerpN(8 + (i % 3) * 3, -2.7, cl((f + 12) / Math.max(1, h + 12)));
          const x = f < h ? x0 : -2.7 - (i % 2) * 0.3;
          const fl = f >= h ? smooth3((f - h) / 28) : 0;
          return (
            <group key={i}>
              <Rider z={z} x={x} phase={t * 1.9 + i * 0.3} t={t} fall={fl} seed={i} banner={i % 3 === 0} />
              {f >= h && <Puffs origin={[-3.3, 0.3, z]} start={h} f={f} n={8} size={1.1} color="#d9c49a" spread={2.4} rise={1.4} life={90} seed={i} dir={[0.5, 0, 0]} />}
            </group>
          );
        })}
        <Puffs origin={[-5, 1.2, 0]} start={0} f={f} n={14} size={2.2} spread={9} rise={3} life={DURATIONS_PERANG.runtuh} seed={3} />
      </Stage>
      <Finish />
      <Chip label="SERBUAN HANCUR" from={fall + 6} to={fall + 100} color="#ff9f43" />
      <Caps ids={["runtuh_1"]} hl={["tumbang", "ditakuti", "hancur"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. PANGLIMA                                                           */
/* ================================================================== */
export const ScenePerangPanglima: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const hill = EV("panglima.hill");
  const cam = shotCam(f, [{ to: 9999, p0: [-12.5, 4.6, 9.5], l0: [-19, 3.9, 0], p1: [-12.0, 4.2, 7.0], l1: [-19, 4.0, 0], fov: 34 }]);
  const nobPose: Pose3 = { ...idle3(t, 3), armR: { swing: -0.6, out: 0.5, elbow: 1.0 }, armL: { swing: 0.2, out: 0.3, elbow: 0.6 }, head: [0, Math.sin(t * 0.5) * 0.2, 0] };
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Terrain t={t} />
        <OdaArmy t={t} />
        <Rig3D position={[-19.2, 3.0, 0]} rotationY={Math.PI / 2} t={t} body={NOB} pose={nobPose} seed={7} />
        {[-1, 1].map((s) => (
          <Rig3D key={s} position={[-19.4, 2.8, s * 2.4]} rotationY={Math.PI / 2} t={t} body={GUARD} pose={idle3(t, s)} seed={s + 9} />
        ))}
        <Maku position={[-21.5, 2.4, 0]} w={6} />
        <Nobori position={[-20.4, 2.9, 1.6]} t={t} clan="oda" h={4.4} seed={2} />
        <Nobori position={[-20.4, 2.9, -1.6]} t={t} clan="oda" h={4.4} seed={5} />
        <Puffs origin={[-6, 1.2, 0]} start={0} f={f} n={14} size={2.6} spread={9} rise={3} life={DURATIONS_PERANG.panglima} seed={9} />
      </Stage>
      <Finish />
      <Chip label="ODA NOBUNAGA" from={hill} to={hill + 110} color="#7fa8ff" />
      <Caps ids={["panglima_1"]} hl={["Nobunaga", "mengamati"]} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. AKHIR                                                              */
/* ================================================================== */
export const ScenePerangAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / 30;
  const end = EV("akhir.end");
  const card = EV("akhir.card");
  const cam = shotCam(f, [{ to: 9999, p0: [2, 2.6, 7.5], l0: [-6, 1.8, 0], p1: [10, 5.2, 14], l1: [-6, 2.2, 0], fov: 40 }]);
  const cardK = spring({ frame: f - card, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <Stage cam={cam}>
        <Terrain t={t} />
        <OdaArmy t={t} />
        <Palisade x={-3} z0={-10.5} z1={10.5} />
        {[0, 1, 2, 3].map((i) => (
          <Rig3D key={i} position={[-5.2 - (i % 2) * 0.9, 0, -3.6 + i * 2.4]} rotationY={Math.PI / 2} t={t} body={ASH} pose={{ ...idle3(t, i), armR: { swing: -2.6 + 0.3 * Math.sin(t * 4 + i), out: 0.3, elbow: 0.4 }, armL: { swing: -2.6 + 0.3 * Math.sin(t * 4 + i + 1), out: 0.3, elbow: 0.4 } }} seed={i} />
        ))}
        <Puffs origin={[-1, 1.2, 0]} start={0} f={f} n={16} size={3.0} spread={12} rise={4} life={DURATIONS_PERANG.akhir} seed={4} />
      </Stage>
      <Finish warm={0.35} />
      <Caps ids={["akhir_1"]} hl={["era", "kavaleri", "berakhir"]} />
      {f >= card && (
        <AbsoluteFill style={{ background: `rgba(24,16,12,${0.55 * cardK})`, alignItems: "center", justifyContent: "center", paddingRight: 150 }}>
          <div style={{ textAlign: "center", transform: `scale(${0.75 + 0.25 * cardK})`, opacity: cardK, width: 780 }}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontWeight: 900, fontSize: 70, color: "#ffd23f" }}>長篠 · 1575</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 112, lineHeight: 1.05, color: "#fff", WebkitTextStroke: "8px #1a110c", paintOrder: "stroke fill", textShadow: "0 10px 0 #1a110c" }}>ERA BARU PERANG</div>
            <div style={{ marginTop: 22, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 44, color: "white", lineHeight: 1.25 }}>±3.000 penembak mengalahkan kavaleri terkuat di Jepang.</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

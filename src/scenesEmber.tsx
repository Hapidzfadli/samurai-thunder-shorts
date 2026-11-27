import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import timing from "./ember_timing.json";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import { ToonSky } from "./three/toon";
import { WoodenBucket3D } from "./three/objectsEmber";
import { Chip, Emote, Stamp } from "./scenesKelelawar";
import { EmberWorld, KOMANDAN, MILISI_BOLOGNA, PRAJURIT_MODENA, UTUSAN_ARA } from "./SheetEmber";

export type EmberScene = "hook" | "rival" | "jumlah" | "zappolino" | "gerbang" | "mitos" | "akhir";
export const EMBER_ORDER = timing.order as EmberScene[];
export const TOTAL_FRAMES_EMBER = timing.totalFrames;
const DUR = (k: EmberScene): number => (timing.scenes as Record<string, { durationInFrames: number }>)[k].durationInFrames;

type Word = { w: string; from: number; to: number };
type Line = { voice: string; style: string; text: string; from: number; to: number; words: Word[] };
const LINES = timing.lines as unknown as Record<EmberScene, Line[]>;
const FONT_BODY = "Inter, system-ui, sans-serif";
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
const ramp = (f: number, a: number, len: number) => smoother(cl((f - a) / Math.max(1, len)));
const pulse = (f: number, at: number, len = 10) => {
  const d = f - at;
  return d < 0 || d > len ? 0 : Math.sin((d / len) * Math.PI);
};
const lineAt = (s: EmberScene, i: number): Line => LINES[s][i];
const mouth = (s: EmberScene, voice: string, f: number): number => {
  for (const ln of LINES[s]) {
    if (ln.voice !== voice) continue;
    for (const w of ln.words) {
      if (f >= w.from - 1 && f <= w.to + 1) return 0.3 + 0.7 * Math.abs(Math.sin((f - w.from) * 0.9 + w.from));
    }
  }
  return 0;
};
const speaking = (s: EmberScene, i: number, f: number) => f >= LINES[s][i].from - 2 && f <= LINES[s][i].to + 2;
const nod = (s: EmberScene, voice: string, f: number) => {
  let v = 0;
  for (const ln of LINES[s]) if (ln.voice === voice) for (const w of ln.words) if (w.w.length > 5) v += pulse(f, w.from - 1, 8) * 5;
  return v;
};

/* ------------------------------------------------------------------ dunia Blender */
const OX = { L1: 0, L2: 400, L3: 800, L4: 1200 };
type EmberLatar = "L1_Museum" | "L2_Balai" | "L3_Zappolino" | "L4_Gerbang";
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];

type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };
type Shot = { to: number; p0: Vec3; p1?: Vec3; l0: Vec3; l1?: Vec3; fov?: number; fov1?: number; roll0?: number; roll1?: number; ease?: "out" | "smooth" };

const shotCam = (frame: number, shots: Shot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, s.to - start);
      const local = frame - start;
      const x = cl(local / len);
      const k = s.ease === "out" ? 1 - Math.pow(1 - x, 3) : smoother(x);
      const look = lerpV(s.l0, s.l1 ?? s.l0, k);
      const pos = lerpV(s.p0, s.p1 ?? s.p0, k);
      // subtle handheld cinematic drift so camera never feels dead
      const driftX = Math.sin(frame * 0.045) * 0.04;
      const driftY = Math.cos(frame * 0.035) * 0.025;
      const f0 = s.fov ?? 44;
      return {
        pos: [pos[0] + driftX, pos[1] + driftY, pos[2]],
        look,
        fov: lerpN(f0, s.fov1 ?? f0, k),
        roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k),
      };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 44, roll: 0 };
};

const pathCam = (frame: number, t0: number, t1: number, P: Vec3[], Lk: Vec3[], fov0: number, fov1: number, roll0 = 0, roll1 = 0): Cam => {
  const k = smoother(cl((frame - t0) / Math.max(1, t1 - t0)));
  const pc = new THREE.CatmullRomCurve3(P.map((v) => new THREE.Vector3(...v)), false, "catmullrom", 0.45);
  const lc = new THREE.CatmullRomCurve3(Lk.map((v) => new THREE.Vector3(...v)), false, "catmullrom", 0.45);
  const p = pc.getPoint(k);
  const l = lc.getPoint(k);
  return { pos: [p.x, p.y, p.z], look: [l.x, l.y, l.z], fov: lerpN(fov0, fov1, k), roll: lerpN(roll0, roll1, k) };
};

const kick = (f: number, hits: number[], amp = 0.12, len = 12): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < len) {
      const a = (1 - d / len) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 3 ? 1 : -1) * a * 0.7;
    }
  }
  return [x, y, 0];
};

const Rig: React.FC<{ cam: Cam; shake?: Vec3 }> = ({ cam, shake = [0, 0, 0] }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(cam.pos[0] + shake[0], cam.pos[1] + shake[1], cam.pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(cam.look[0] + shake[0] * 0.5, cam.look[1] + shake[1] * 0.5, cam.look[2]);
  camera.rotateZ((cam.roll * Math.PI) / 180);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};

type PL = { p: Vec3; i: number; col?: string };
const Stage: React.FC<{
  cam: Cam;
  active: EmberLatar;
  focus: Vec3;
  shake?: Vec3;
  skyTop?: string;
  skyMid?: string;
  pts?: PL[];
  children: React.ReactNode;
}> = ({ cam, active, focus, shake, skyTop = "#5c9ce0", skyMid = "#f4e6cc", pts = [], children }) => {
  const { width, height } = useVideoConfig();
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <AbsoluteFill style={{ background: skyMid }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.1, far: 1500, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <group position={cam.pos}>
          <ToonSky top={skyTop} horizon={skyMid} bottom={skyMid} r={900} />
        </group>
        <hemisphereLight args={["#fff8ea", "#9e8670", 1.55]} />
        <primitive object={target} position={focus} />
        <directionalLight
          target={target}
          position={[focus[0] + 18, focus[1] + 28, focus[2] + 22]}
          intensity={1.95}
          color="#fff0d8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-22}
          shadow-bias={-0.0006}
        />
        {pts.map((q, i) => (
          <pointLight key={i} position={q.p} intensity={q.i} distance={14} decay={1.5} color={q.col ?? "#ffe6b8"} />
        ))}
        <EmberWorld only={active} />
        {children}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const bean = (base: BeanParams, ov: Partial<BeanParams>): BeanParams => ({ ...base, ...ov });
const idle = (t: number, ph: number): Partial<BeanParams> => ({
  bob: Math.sin(t * 2.6 + ph) * 2.5,
  blink: Math.sin(t * 1.9 + ph) > 0.96,
});
const beanWalk = (t: number, spd = 9): Partial<BeanParams> => {
  const s = Math.sin(t * spd);
  const c = Math.cos(t * spd);
  return { legL: [24 * s, Math.max(0, -c) * 20], legR: [-24 * s, Math.max(0, c) * 20], armL: [-22 * s, -12], armR: [22 * s, -12], bob: Math.abs(s) * 5 };
};
const beanRun = (t: number): Partial<BeanParams> => {
  const s = Math.sin(t * 15);
  const c = Math.cos(t * 15);
  return { legL: [34 * s, Math.max(0, -c) * 32], legR: [-34 * s, Math.max(0, c) * 32], armL: [-38 * s, -18], armR: [38 * s, -18], bob: Math.abs(s) * 9, lean: 14 };
};

export const DissolveEmber: React.FC<{ first?: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame();
  const op = first ? 1 : interpolate(f, [0, 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

/* ------------------------------------------------------------------ CAPTION 1-2 KATA */
export const EmberCaptions: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cues = timing.captions as { text: string; startFrame: number; endFrame: number; highlight: boolean; voice: string }[];
  const cur = cues.find((c) => f >= c.startFrame && f < c.endFrame);
  if (!cur) return null;
  const sc = spring({ frame: f - cur.startFrame, fps, config: { damping: 14, stiffness: 260 }, from: 0.78, to: 1 });
  const isAra = cur.voice === "ara";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 245,
        left: 48,
        right: 48,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `scale(${sc})`,
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: cur.highlight ? 82 : 70,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          textAlign: "center",
          color: cur.highlight ? "#ffe34d" : isAra ? "#ffd8e4" : "#ffffff",
          WebkitTextStroke: "5px #1e1220",
          paintOrder: "stroke fill",
          textShadow: "0 8px 20px rgba(0,0,0,0.6)",
          lineHeight: 1.05,
        }}
      >
        {cur.text}
      </div>
    </div>
  );
};

/* ================================================================== */
/* 1. HOOK — MUSEUM GHIRLANDINA (ORBIT + PUSH-IN + WHIP KE ARA)       */
/* ================================================================== */
const SceneHook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("hook");
  const L0 = lineAt("hook", 0);
  const L1 = lineAt("hook", 1);

  const cam =
    f < L1.from - 4
      ? pathCam(
          f,
          0,
          L1.from - 4,
          [bl(-2.4, -5.6, 3.3, OX.L1), bl(-0.9, -3.5, 2.55, OX.L1), bl(0.25, -2.15, 2.2, OX.L1)],
          [bl(0, 1.3, 1.9, OX.L1), bl(0, 1.3, 2.0, OX.L1), bl(0, 1.3, 2.05, OX.L1)],
          48,
          34,
          2,
          0
        )
      : shotCam(f - (L1.from - 4), [
          {
            to: dur - (L1.from - 4),
            p0: bl(0.25, -2.4, 2.2, OX.L1),
            p1: bl(0.35, -5.5, 2.25, OX.L1),
            l0: bl(0.35, 0.5, 1.9, OX.L1),
            l1: bl(0.15, 0.7, 1.75, OX.L1),
            fov: 40,
            fov1: 47,
            roll0: -3.5,
            roll1: 0,
            ease: "out",
          },
        ]);

  const walkIn = ramp(f, L1.from - 14, 18);
  const araPos = lerpV(bl(2.5, -0.7, 0, OX.L1), bl(0.75, -0.7, 0, OX.L1), walkIn);
  const araWalk = walkIn > 0.02 && walkIn < 0.98 ? beanWalk(t, 12) : {};

  return (
    <AbsoluteFill>
      <Stage
        cam={cam}
        active="L1_Museum"
        focus={bl(0, 1.3, 1.8, OX.L1)}
        shake={kick(f, [L1.from], 0.14, 14)}
        pts={[{ p: bl(0, 1.3, 4.3, OX.L1), i: 22 }]}
      >
        <WoodenBucket3D position={bl(0, 1.3, 1.56, OX.L1)} rotation={[0, t * 0.45, 0]} scale={1.4} withRope={false} />
        <BeanCard
          position={araPos}
          height={2.5}
          params={bean(UTUSAN_ARA, {
            ...idle(t, 1),
            ...araWalk,
            expr: f >= L1.from - 2 ? "shock" : "neutral",
            sweat: f >= L1.from - 2,
            look: -0.7,
            mouthOpen: mouth("hook", "ara", f),
            armL: f >= L1.from ? [-60, -85] : [-15, -20],
            armR: f >= L1.from ? [45, -60] : [15, -20],
          })}
        />
      </Stage>
      <Chip from={4} to={L1.from - 4} top={165} color="#7a1f28" size={44}>
        MODENA · ITALIA
      </Chip>
      <Emote x={690} y={540} from={L1.from} to={dur - 2} text="HAH?!" color="#c4222b" size={88} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2. RIVAL — BALAI DEWAN BOLOGNA (CRANE-DOWN + WHIP KE ARA MARAH)    */
/* ================================================================== */
const SceneRival: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("rival");
  const L0 = lineAt("rival", 0);
  const L1 = lineAt("rival", 1);

  const cam = shotCam(f, [
    {
      to: L1.from - 6,
      p0: bl(-1.8, -5.6, 3.6, OX.L2),
      p1: bl(-0.3, -3.9, 2.45, OX.L2),
      l0: bl(-0.15, 1.2, 1.45, OX.L2),
      l1: bl(-0.35, 1.7, 1.8, OX.L2),
      fov: 48,
      fov1: 42,
    },
    {
      to: dur,
      p0: bl(-0.3, -3.9, 2.45, OX.L2),
      p1: bl(0.2, -5.4, 2.3, OX.L2),
      l0: bl(0.45, 0.2, 1.75, OX.L2),
      l1: bl(0.05, 0.9, 1.75, OX.L2),
      fov: 44,
      fov1: 48,
      roll0: 3,
      roll1: 0,
      ease: "out",
    },
  ]);

  const slam = ramp(f, L1.from, 10);

  return (
    <AbsoluteFill>
      <Stage
        cam={cam}
        active="L2_Balai"
        focus={bl(0, 1.0, 1.6, OX.L2)}
        shake={kick(f, [L1.from + 2], 0.16, 14)}
        pts={[{ p: bl(1.85, 1.35, 2.6, OX.L2), i: 14, col: "#ffcb70" }]}
      >
        <BeanCard
          position={bl(-0.65, 2.25, 0, OX.L2)}
          height={2.7}
          params={bean(KOMANDAN, {
            ...idle(t, 0),
            expr: "smug",
            look: 0.55,
            mouthOpen: mouth("rival", "dodi", f),
            headTilt: nod("rival", "dodi", f),
            armR: [lerpN(25, 78, ramp(f, L0.from + 20, 22)), -40],
          })}
        />
        <BeanCard
          position={bl(0.58, -0.65, 0, OX.L2)}
          height={2.5}
          params={bean(UTUSAN_ARA, {
            ...idle(t, 2),
            expr: f >= L1.from - 4 ? "angry" : "think",
            look: -0.55,
            lean: slam * 8,
            mouthOpen: mouth("rival", "ara", f),
            armL: f >= L1.from - 2 ? [-60, -25] : [-15, -20],
            armR: f >= L1.from - 2 ? [65, -25] : [15, -20],
          })}
        />
      </Stage>
      <Chip from={4} to={L1.from - 6} top={165} color="#1f4a94" size={44}>
        ITALIA · TAHUN 1325
      </Chip>
      <Stamp from={L1.from + 8} to={dur - 4} text="SERANG!!" color="#c4222b" y={490} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3. JUMLAH — BUKIT ZAPPOLINO (ORBITING PAN 32.000 VS 7.000)         */
/* ================================================================== */
const SceneJumlah: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("jumlah");
  const L0 = lineAt("jumlah", 0);
  const L1 = lineAt("jumlah", 1);

  const cam = shotCam(f, [
    {
      to: L1.from - 4,
      p0: bl(2.1, -4.9, 2.35, OX.L3),
      p1: bl(0.8, -4.3, 2.25, OX.L3),
      l0: bl(0.95, 0.5, 1.75, OX.L3),
      l1: bl(0.75, 0.2, 1.75, OX.L3),
      fov: 46,
      fov1: 42,
    },
    {
      to: dur,
      p0: bl(0.8, -4.3, 2.25, OX.L3),
      p1: bl(-1.3, -4.4, 2.3, OX.L3),
      l0: bl(-0.85, 0.2, 1.85, OX.L3),
      l1: bl(0.2, 2.2, 1.7, OX.L3),
      fov: 42,
      fov1: 47,
    },
  ]);

  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L3_Zappolino" focus={bl(0, 1.5, 1.6, OX.L3)} skyTop="#d97b42" skyMid="#ffd494">
        <BeanCard
          position={bl(-0.95, -0.35, 0, OX.L3)}
          height={2.6}
          params={bean(KOMANDAN, {
            ...idle(t, 0),
            expr: speaking("jumlah", 1, f) ? "smug" : "neutral",
            look: 0.6,
            mouthOpen: mouth("jumlah", "dodi", f),
            headTilt: nod("jumlah", "dodi", f),
            armL: [-15, -45],
            armR: [20, -45],
          })}
        />
        <BeanCard
          position={bl(0.95, -0.45, 0, OX.L3)}
          height={2.5}
          params={bean(UTUSAN_ARA, {
            ...idle(t, 1.5),
            expr: speaking("jumlah", 0, f) ? "happy" : "think",
            look: -0.6,
            mouthOpen: mouth("jumlah", "ara", f),
            armR: speaking("jumlah", 0, f) ? [75 + Math.sin(t * 7) * 8, -85] : [20, -25],
          })}
        />
        {/* Barisan bertingkat (depan-belakang agar pas frame vertikal) */}
        <BeanCard position={bl(1.45, 2.1, 0, OX.L3)} height={2.35} params={bean(MILISI_BOLOGNA, { ...idle(t, 2), expr: "think", look: -0.4, armR: [42, -10] })} />
        <BeanCard position={bl(0.4, 3.4, 0, OX.L3)} height={2.25} params={bean(MILISI_BOLOGNA, { ...idle(t, 3), expr: "scared", sweat: true })} />
        <BeanCard position={bl(-1.45, 2.2, 0, OX.L3)} height={2.35} params={bean(PRAJURIT_MODENA, { ...idle(t, 4), expr: "neutral" })} />
        <BeanCard position={bl(-0.6, 3.6, 0, OX.L3)} height={2.25} params={bean(PRAJURIT_MODENA, { ...idle(t, 5), expr: "neutral" })} />
      </Stage>
      <Chip from={4} to={L0.to} top={165} color="#b8222b" size={44}>
        BOLOGNA: 32.000 PASUKAN
      </Chip>
      <Chip from={L1.from} to={dur - 4} top={165} color="#1f4a94" size={44}>
        MODENA: 7.000 VETERAN
      </Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4. ZAPPOLINO — PERTEMPURAN & BOLOGNA KABUR (TRACKING + ROLL)       */
/* ================================================================== */
const SceneZappolino: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("zappolino");
  const L0 = lineAt("zappolino", 0);
  const L1 = lineAt("zappolino", 1);

  const charge = ramp(f, L0.to - 8, dur - L0.to + 8);
  const runX = lerpN(-0.6, 2.8, charge);

  const cam = shotCam(f, [
    {
      to: L0.to,
      p0: bl(-2.4, -4.4, 1.9, OX.L3),
      p1: bl(-1.4, -3.5, 2.15, OX.L3),
      l0: bl(-1.1, 0.2, 1.8, OX.L3),
      l1: bl(-0.9, 0.2, 1.85, OX.L3),
      fov: 40,
      fov1: 35,
      roll0: -3,
      roll1: 0,
    },
    {
      to: dur,
      p0: bl(-0.4, -5.2, 2.25, OX.L3),
      p1: bl(2.1, -5.0, 2.35, OX.L3),
      l0: bl(0.2, 0.4, 1.65, OX.L3),
      l1: bl(2.4, 0.4, 1.65, OX.L3),
      fov: 46,
      fov1: 48,
      roll0: -2.5,
      roll1: 2.5,
    },
  ]);

  return (
    <AbsoluteFill>
      <Stage
        cam={cam}
        active="L3_Zappolino"
        focus={bl(runX, 0.5, 1.5, OX.L3)}
        shake={kick(f, [L0.from + 12, L1.from], 0.18, 16)}
        skyTop="#b85432"
        skyMid="#f5b470"
      >
        {/* Komandan Modena memberi aba-aba */}
        <BeanCard
          position={bl(-1.2, 0.5, 0, OX.L3)}
          height={2.6}
          params={bean(KOMANDAN, {
            ...idle(t, 0),
            expr: "angry",
            mouthOpen: mouth("zappolino", "dodi", f),
            armR: [130, -10],
          })}
        />
        {/* Prajurit Modena mengejar */}
        <BeanCard
          position={bl(runX - 1.55, 0.1, 0, OX.L3)}
          height={2.55}
          params={bean(PRAJURIT_MODENA, { ...beanRun(t), expr: "angry", armR: [88, -12] })}
        />
        {/* Ara & Milisi Bologna lari kocar-kacir */}
        <BeanCard
          position={bl(runX, -0.5, 0, OX.L3)}
          height={2.5}
          params={bean(UTUSAN_ARA, {
            ...beanRun(t + 0.15),
            expr: "scared",
            sweat: true,
            look: -0.7,
            mouthOpen: mouth("zappolino", "ara", f),
          })}
        />
        <BeanCard
          position={bl(runX + 1.15, 0.9, 0, OX.L3)}
          height={2.4}
          params={bean(MILISI_BOLOGNA, { ...beanRun(t + 0.3), expr: "scared", sweat: true })}
        />
      </Stage>
      <Chip from={4} to={L0.to} top={165} color="#1f4a94" size={44}>
        PERTEMPURAN ZAPPOLINO · 1325
      </Chip>
      <Emote x={540} y={540} from={L1.from} to={dur - 2} text="LHO?!" color="#c4222b" size={88} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5. GERBANG BOLOGNA — VERTICAL CRANE-UP + ANGKAT EMBER 3D           */
/* ================================================================== */
const SceneGerbang: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("gerbang");
  const L0 = lineAt("gerbang", 0);
  const L1 = lineAt("gerbang", 1);

  const lift = ramp(f, L0.from + 22, 24);
  const komPos = bl(-0.15, -0.55, 0, OX.L4);
  const komArmR: [number, number] = [lerpN(45, 138, lift), lerpN(-25, -20, lift)];
  const handPos = beanHandWorld(komPos, 2.6, false, komArmR, "R");
  const wellTop = bl(1.65, 0.55, 1.18, OX.L4);
  const bucketPos: Vec3 = lift < 0.05 ? wellTop : lerpV(wellTop, [handPos[0] + 0.06, handPos[1] - 0.12, handPos[2] + 0.12], lift);

  // Kamera super dinamis: orbit rendah di sumur -> tilt/crane naik ke Ara di atas tembok -> pull-back lebar!
  const cam = shotCam(f, [
    {
      to: L1.from - 6,
      p0: bl(2.1, -4.4, 1.9, OX.L4),
      p1: bl(-0.3, -4.8, 2.15, OX.L4),
      l0: bl(0.9, 0.3, 1.45, OX.L4),
      l1: bl(0.1, -0.2, 1.95, OX.L4),
      fov: 45,
      fov1: 42,
    },
    {
      to: L1.from + 38,
      p0: bl(-0.3, -4.8, 2.15, OX.L4),
      p1: bl(0.7, -4.4, 4.4, OX.L4),
      l0: bl(0.75, 3.25, 4.85, OX.L4),
      l1: bl(0.75, 3.25, 5.0, OX.L4),
      fov: 40,
      fov1: 36,
      ease: "out",
    },
    {
      to: dur,
      p0: bl(0.7, -4.4, 4.4, OX.L4),
      p1: bl(0.2, -6.7, 2.8, OX.L4),
      l0: bl(0.3, 2.2, 3.5, OX.L4),
      l1: bl(0.1, 1.5, 2.55, OX.L4),
      fov: 38,
      fov1: 48,
    },
  ]);

  return (
    <AbsoluteFill>
      <Stage
        cam={cam}
        active="L4_Gerbang"
        focus={bl(0, 1.2, 2.2, OX.L4)}
        shake={kick(f, [L1.from], 0.14, 12)}
        skyTop="#5d9de0"
        skyMid="#e8eef6"
      >
        <BeanCard
          position={bl(0.75, 3.25, 3.9, OX.L4)}
          height={2.35}
          params={bean(UTUSAN_ARA, {
            ...idle(t, 1),
            expr: f >= L1.from - 4 ? "shock" : "scared",
            sweat: true,
            mouthOpen: mouth("gerbang", "ara", f),
            armL: f >= L1.from ? [-60, -80] : [-25, -35],
            armR: f >= L1.from ? [60, -80] : [25, -35],
          })}
        />
        <BeanCard
          position={komPos}
          height={2.6}
          params={bean(KOMANDAN, {
            ...idle(t, 0),
            expr: "smug",
            mouthOpen: mouth("gerbang", "dodi", f),
            armL: [-20, -30],
            armR: komArmR,
          })}
        />
        <WoodenBucket3D position={bucketPos} rotation={[0, t * 0.6, lift * -0.15]} scale={1.15} withRope />
        <BeanCard position={bl(-1.4, 0.3, 0, OX.L4)} height={2.45} params={bean(PRAJURIT_MODENA, { ...idle(t, 3), expr: "happy" })} />
      </Stage>
      <Chip from={4} to={L1.from - 6} top={165} color="#7a1f28" size={42}>
        GERBANG PORTA SAN FELICE
      </Chip>
      <Emote x={560} y={420} from={L1.from} to={dur - 2} text="BALIKIN!!" color="#c4222b" size={82} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6. MITOS VS FAKTA — PUISI 1622 (PUSH-IN + KARTU PUISI + ARA)       */
/* ================================================================== */
const SceneMitos: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("mitos");
  const L0 = lineAt("mitos", 0);
  const L1 = lineAt("mitos", 1);

  const cam = shotCam(f, [
    {
      to: L1.from - 4,
      p0: bl(1.8, -4.8, 2.7, OX.L2),
      p1: bl(-0.3, -3.5, 2.3, OX.L2),
      l0: bl(0, 1.1, 1.65, OX.L2),
      l1: bl(0.4, 0.4, 1.75, OX.L2),
      fov: 46,
      fov1: 40,
    },
    {
      to: dur,
      p0: bl(-0.3, -3.5, 2.3, OX.L2),
      p1: bl(0.6, -3.2, 2.25, OX.L2),
      l0: bl(0.85, -0.5, 1.85, OX.L2),
      l1: bl(0.85, -0.5, 1.9, OX.L2),
      fov: 40,
      fov1: 36,
      roll0: -2,
      roll1: 2,
    },
  ]);

  return (
    <AbsoluteFill>
      <Stage cam={cam} active="L2_Balai" focus={bl(0, 1.0, 1.6, OX.L2)} pts={[{ p: bl(1.85, 1.35, 2.6, OX.L2), i: 14, col: "#ffcb70" }]}>
        <BeanCard position={bl(-0.95, 2.25, 0, OX.L2)} height={2.7} params={bean(KOMANDAN, { ...idle(t, 0), expr: "smug", mouthOpen: mouth("mitos", "dodi", f) })} />
        <BeanCard
          position={bl(0.85, -0.6, 0, OX.L2)}
          height={2.55}
          params={bean(UTUSAN_ARA, {
            ...idle(t, 2),
            expr: f >= L1.from - 2 ? "shock" : "think",
            sweat: f >= L1.from,
            look: -0.4,
            mouthOpen: mouth("mitos", "ara", f),
            armR: f >= L1.from ? [118, -130] : [20, -25],
          })}
        />
      </Stage>
      <Chip from={4} to={L0.to} top={165} color="#6b3e1e" size={40}>
        PUISI SATIR · "LA SECCHIA RAPITA" (1622)
      </Chip>
      <Emote x={690} y={560} from={L1.from} to={dur - 2} text="HAH?!" color="#c4222b" size={84} />
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7. AKHIR — MUSEUM MODENA HARI INI (ORBIT PENUTUP + HERO SHOT)      */
/* ================================================================== */
const SceneAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const dur = DUR("akhir");
  const L1 = lineAt("akhir", 1);

  const cam =
    f < L1.from - 4
      ? pathCam(
          f,
          0,
          L1.from - 4,
          [bl(-2.2, -4.6, 2.4, OX.L1), bl(-0.9, -4.0, 2.2, OX.L1), bl(0.2, -4.4, 2.25, OX.L1)],
          [bl(-0.7, 0.5, 1.85, OX.L1), bl(0, 1.3, 1.9, OX.L1), bl(0.4, 0.5, 1.8, OX.L1)],
          44,
          42
        )
      : shotCam(f - (L1.from - 4), [
          {
            to: dur - (L1.from - 4),
            p0: bl(0.2, -4.4, 2.25, OX.L1),
            p1: bl(0, -5.6, 2.35, OX.L1),
            l0: bl(0.6, 0.4, 1.8, OX.L1),
            l1: bl(0, 1.2, 1.85, OX.L1),
            fov: 42,
            fov1: 47,
            ease: "out",
          },
        ]);

  return (
    <AbsoluteFill>
      <Stage
        cam={cam}
        active="L1_Museum"
        focus={bl(0, 1.3, 1.8, OX.L1)}
        shake={kick(f, [L1.from], 0.12, 12)}
        pts={[{ p: bl(0, 1.3, 4.3, OX.L1), i: 22 }]}
      >
        <WoodenBucket3D position={bl(0, 1.3, 1.56, OX.L1)} rotation={[0, t * 0.55, 0]} scale={1.4} withRope={false} />
        <BeanCard
          position={bl(-1.1, -0.6, 0, OX.L1)}
          height={2.6}
          params={bean(KOMANDAN, {
            ...idle(t, 0),
            expr: "smug",
            look: 0.6,
            mouthOpen: mouth("akhir", "dodi", f),
            headTilt: nod("akhir", "dodi", f),
            armR: [68, -45],
          })}
        />
        <BeanCard
          position={bl(1.1, -0.7, 0, OX.L1)}
          height={2.5}
          params={bean(UTUSAN_ARA, {
            ...idle(t, 2),
            expr: f >= L1.from - 2 ? "angry" : "shock",
            sweat: f >= L1.from,
            look: -0.6,
            mouthOpen: mouth("akhir", "ara", f),
            armL: f >= L1.from ? [-70 + Math.sin(t * 16) * 12, -35] : [-40, -50],
          })}
        />
      </Stage>
      <Chip from={4} to={dur - 6} top={165} color="#1f4a94" size={40}>
        700 TAHUN KEMUDIAN · MASIH DI MODENA
      </Chip>
      <Emote x={720} y={560} from={L1.from} to={dur - 2} text="7 ABAD?!" color="#c4222b" size={80} />
    </AbsoluteFill>
  );
};

export const EMBER_SCENES: Record<EmberScene, React.FC> = {
  hook: SceneHook,
  rival: SceneRival,
  jumlah: SceneJumlah,
  zappolino: SceneZappolino,
  gerbang: SceneGerbang,
  mitos: SceneMitos,
  akhir: SceneAkhir,
};

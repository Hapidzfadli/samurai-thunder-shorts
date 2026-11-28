/** Adegan "Terowongan ke Brankas" (Nice 1976). Latar: public/models/terowongan.glb (+ lightmap bake per latar).
 *  Koordinat di file ini = Blender relatif terhadap OX latar (x kanan, y ke dalam, z naik); bl() mengubah ke Three.js. */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import timing from "./terowongan_timing.json";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld, beanWalk, poseClimb, poseCrawl, poseCrouch, poseDig, poseJump, poseRunSide, poseSit, poseWalkSide } from "./three/objectsBean";
import { Cam, CineGrade, CineStage, Foreground, LIGHT_PRESETS, PL, Shot, cineCard, kick, shotCam } from "./cinemaKit";
import { CineLook, Dust, LightShaft } from "./cinePost";
import { Bucket, Brush, Drill, Handcuffs, InHand, Lantern, ManholeCover, MoneyBundle, Motorbike, Necklace, OpenDrawer, Sack, Sparks, WallText } from "./three/objectsTerowongan";
import { HandSvg, Stamp, Chip, Emote } from "./scenesKelelawar";
import { FOTOGRAFER, FOTOGRAFER_GALI, HAKIM, KOMPLOTAN, MANAJER, MIMI, MIMI_GOT, POLISI } from "./SheetTerowongan";

export type TwScene = "hook" | "ide" | "got" | "gali" | "brankas" | "uang" | "pesan" | "tangkap" | "kabur";
export const TW_ORDER = timing.order as TwScene[];
export const TOTAL_FRAMES_TEROWONGAN = timing.totalFrames;
const DUR = (k: TwScene): number => (timing.scenes as Record<string, { durationInFrames: number }>)[k].durationInFrames;
type Word = { w: string; from: number; to: number };
type Line = { voice: string; style: string; text: string; from: number; to: number; words: Word[] };
const LINES = timing.lines as unknown as Record<TwScene, Line[]>;
const EV = timing.events as Record<string, number>;

const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const sm = (x: number) => { const t = cl(x); return t * t * t * (t * (t * 6 - 15) + 10); };
const ease = (f: number, a: number, b: number) => sm((f - a) / Math.max(1, b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: number[], b: number[], k: number): [number, number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];
const OX = { L1: 0, L2: 400, L3: 800, L4: 1200, L5: 1600, L6: 2000 } as const;
type Lat = keyof typeof OX;
const NODE: Record<Lat, string> = { L1: "L1_Jalan", L2: "L2_Studio", L3: "L3_Got", L4: "L4_Penampang", L5: "L5_Brankas", L6: "L6_Hakim" };
const LM_I: Record<Lat, number> = { L1: 1.6, L2: 1.8, L3: 1.4, L4: 1.6, L5: 1.8, L6: 1.8 };
const FZ = 4.6;

const LUAR: CineLook = { exposure: 1.1, env: 0.6, ao: 2.5, aoRadius: 1.6, bloom: 0.45 };
const DALAM: CineLook = { exposure: 1.0, env: 0.65, ao: 3.2, aoRadius: 0.9, bloom: 0.55 };
const MALAM: CineLook = { exposure: 0.7, env: 0, ao: 2.5, aoRadius: 0.9, bloom: 1.0 };

/* ------------------------------------------------------------ suara -> mulut */
const mouth = (s: TwScene, voice: string, f: number): number => {
  for (const ln of LINES[s]) {
    if (ln.voice !== voice || ln.style === "narasi") continue;
    for (const w of ln.words) if (f >= w.from - 1 && f <= w.to + 1) return 0.3 + 0.7 * Math.abs(Math.sin((f - w.from) * 0.9 + w.from));
  }
  return 0;
};
const lineF = (s: TwScene, i: number, end = false) => { const l = LINES[s][i]; return l ? (end ? l.to : l.from) : 0; };
const idle = (f: number, k = 0): Partial<BeanParams> => ({ bob: Math.abs(Math.sin(f / 30 * 1.8 + k)) * 3, blink: (f / 30 + k * 0.7) % 3.1 < 0.11, headTilt: Math.sin(f / 30 * 0.9 + k) * 2 });
const talk = (s: TwScene, voice: string, f: number, k = 0): Partial<BeanParams> => {
  const m = mouth(s, voice, f);
  return m > 0 ? { expr: "talk", mouthOpen: m, armR: [40 + Math.sin(f * 0.25 + k) * 22, -40 + Math.sin(f * 0.37 + k) * 18] } : {};
};

/* ------------------------------------------------------------ mesin adegan */
type Item = { kind: "lantern" | "drill" | "sack" | "cover" | "bucket" | "brush" | "cuffs" | "necklace" | "money"; hand?: "L" | "R" | "both"; off?: Vec3; rot?: Vec3; s?: number };
type Act = { p: BeanParams; at: number[]; h?: number; flip?: boolean; toCam?: number; item?: Item };
type Key = { to: number; p0: number[]; p1?: number[]; l0: number[]; l1?: number[]; fov?: number; fov1?: number; r0?: number; r1?: number };
type Part = {
  lat: Lat; preset: keyof typeof LIGHT_PRESETS; look: CineLook; pts?: number[][]; keys: Key[];
  actors?: (f: number, cam: Cam) => Act[]; extra?: (f: number, cam: Cam) => React.ReactNode; shake?: number[]; fg?: (f: number) => "bars" | "post" | "edge" | null;
  shafts?: { a: number[]; b: number[]; r0?: number; r1?: number; col?: string; s?: number }[]; dust?: { c: number[]; sz: number[] }; interior?: boolean; dof?: (f: number) => number[] | null;
};
const ITEM = (k: Item["kind"]) => ({ lantern: <Lantern />, drill: <Drill />, sack: <Sack />, cover: <ManholeCover />, bucket: <Bucket />, brush: <Brush />, cuffs: <Handcuffs />, necklace: <Necklace />, money: <MoneyBundle /> })[k];

const Stage: React.FC<{ part: Part; f: number }> = ({ part, f }) => {
  const ox = OX[part.lat];
  const shots: Shot[] = part.keys.map((k) => ({ to: k.to, p0: bl(k.p0[0], k.p0[1], k.p0[2], ox), p1: k.p1 ? bl(k.p1[0], k.p1[1], k.p1[2], ox) : undefined, l0: bl(k.l0[0], k.l0[1], k.l0[2], ox), l1: k.l1 ? bl(k.l1[0], k.l1[1], k.l1[2], ox) : undefined, fov: k.fov ?? 48, fov1: k.fov1, roll0: k.r0 ?? 0, roll1: k.r1 ?? k.r0 ?? 0, ease: "out" }));
  const cam = shotCam(f, shots);
  const P = LIGHT_PRESETS[part.preset];
  const card = cineCard(cam, P);
  const pts: PL[] = (part.pts ?? []).map(([x, y, z, i]) => ({ p: bl(x, y, z, ox), i }));
  const shake = part.shake ? kick(f, part.shake, 0.06, 12) : ([0, 0, 0] as Vec3);
  const dofP = part.dof?.(f);
  const look: CineLook = { ...part.look, dof: dofP ? { focus: bl(dofP[0], dofP[1], dofP[2], ox), range: 1.4, blur: 3 } : undefined };
  const fgk = part.fg?.(f);
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/terowongan.glb" visible={(n) => n.startsWith(NODE[part.lat]) || n.startsWith("Langit")} focus={bl(cam.look[0] - ox, -cam.look[2], 0, ox)} preset={part.preset} pts={pts} interior={part.interior} shake={shake}
        look={look} lightmaps={[{ prefix: NODE[part.lat], url: `models/terowongan_lm_${part.lat}.png`, intensity: LM_I[part.lat] }]} hemiScale={0.55}>
        {(part.actors?.(f, cam) ?? []).map((t, i) => {
          const dx = cam.pos[0] - (ox + t.at[0]);
          const dy = -cam.pos[2] - t.at[1];
          const L = Math.hypot(dx, dy) || 1;
          const k = (t.toCam ?? 0) / L;
          const pos = bl(t.at[0] + dx * k, t.at[1] + dy * k, t.at[2], ox);
          const it = t.item;
          return (
            <React.Fragment key={i}>
              <BeanCard position={pos} height={t.h ?? 1.9} params={t.p} flip={t.flip} {...card} />
              {it && (
                <InHand p={t.p} position={pos} height={t.h ?? 1.9} cam={cam.pos} flip={t.flip} hand={it.hand ?? "R"} off={it.off} rot={it.rot}>
                  <group scale={(it.s ?? 1) * ((t.h ?? 1.9) / 1.9)}>{ITEM(it.kind)}</group>
                </InHand>
              )}
            </React.Fragment>
          );
        })}
        {part.extra?.(f, cam)}
        {part.shafts?.map((q, i) => <LightShaft key={i} from={bl(q.a[0], q.a[1], q.a[2], ox)} to={bl(q.b[0], q.b[1], q.b[2], ox)} r0={q.r0} r1={q.r1} color={q.col} strength={q.s} />)}
        {part.dust && <Dust center={bl(part.dust.c[0], part.dust.c[1], part.dust.c[2], ox)} size={[part.dust.sz[0], part.dust.sz[2], part.dust.sz[1]]} frame={f} />}
        {fgk && <Foreground cam={cam} kind={fgk} side={1} color="#1a1a22" />}
      </CineStage>
      <CineGrade preset={part.preset} />
    </AbsoluteFill>
  );
};
/** pilih part berdasarkan batas frame (until) */
const Multi: React.FC<{ parts: [number, Part][] }> = ({ parts }) => {
  const f = useCurrentFrame();
  let start = 0;
  for (const [until, p] of parts) {
    if (f < until) return <Stage part={p} f={f - start} />;
    start = until;
  }
  const [, last] = parts[parts.length - 1];
  return <Stage part={last} f={f - (parts.length > 1 ? parts[parts.length - 2][0] : 0)} />;
};
/** frame lokal sebuah part: shot di dalam part memakai frame relatif awal part */
const at = (d: number, k: number) => Math.round(d * k);
const wpos = (p: BeanParams, side: "L" | "R", a: number[], ox: number, cam: Cam, flip = false, h = 1.9) => beanHandWorld(p, side, bl(a[0], a[1], a[2], ox), h, cam.pos, flip);

/* ================================================================== 1 HOOK */
export const SceneTwHook: React.FC = () => {
  const D = DUR("hook");
  const cut = at(D, 0.3);
  const f0 = useCurrentFrame();
  const A: Part = {
    lat: "L1", preset: "siang", look: LUAR,
    keys: [{ to: cut, p0: [-5, -15, 8.5], p1: [-3.4, -10.5, 2.0], l0: [0, 9, 7], l1: [0, 8, 3.6], fov: 50, r0: -2, r1: -3 }],
    actors: (f) => {
      const k = cl(f / cut);
      const pos = lerp3([-3.2, -4.0, 0], [-0.4, 6.4, 0.26 * ease(f, cut * 0.6, cut)], k);
      return [{ p: { ...MANAJER, ...beanWalk(f / 16), back: true, hair: "#2a2a2a" }, at: pos }];
    },
  };
  const B: Part = {
    lat: "L5", preset: "tegang", look: { ...DALAM, exposure: 0.62 }, interior: true, pts: [[0, 3.6, 2.0, 4], [-1.7, -1.4, 0.3, 3]],
    shake: [EV["hook.brankas"] - cut + 8, EV["hook.brankas"] - cut + 22, EV["hook.brankas"] - cut + 36].map((v) => Math.max(0, v)),
    keys: [
      { to: at(D, 0.62) - cut, p0: [0.2, -2.2, 1.5], p1: [0.1, 1.2, 1.9], l0: [0, 4.3, 2.05], fov: 46, r0: 3, r1: 0 },
      { to: at(D, 0.8) - cut, p0: [-0.6, 2.9, 2.5], p1: [-0.9, 3.2, 2.7], l0: [-1.5, 4.3, 2.6], fov: 34, r0: -4 },
      { to: D - cut, p0: [0.9, -2.8, 2.6], p1: [0.4, -3.4, 2.1], l0: [-1.7, -1.4, 0.0], l1: [-1.7, -1.2, 0.3], fov: 50, r0: 5, r1: 2 },
    ],
    dust: { c: [0, 1.8, 1.8], sz: [3, 3, 2] },
  };
  return (
    <AbsoluteFill>
      <Multi parts={[[cut, A], [D, B]]} />
      <TitleHook from={6} to={cut + 20} />
      <Chip from={cut + 26} to={cut + 96} top={1130} size={52}>NICE, PRANCIS · JULI 1976</Chip>
      <Stamp text="DIKUNCI DARI DALAM" from={EV["hook.dalam"]} to={D} top={560} color="#b91c1c" />
      {void f0}
    </AbsoluteFill>
  );
};
const TitleHook: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 10, stiffness: 180 } });
  const o = interpolate(f, [to - 8, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 330, left: 40, right: 40, textAlign: "center", opacity: o, transform: `scale(${0.7 + 0.3 * s})` }}>
      <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 112, lineHeight: 1.0, color: "#ffd23f", WebkitTextStroke: "10px #241726", paintOrder: "stroke fill", textShadow: "0 12px 0 rgba(36,23,38,0.6)" }}>DIRAMPOK</div>
      <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 88, lineHeight: 1.05, color: "#fff", WebkitTextStroke: "9px #241726", paintOrder: "stroke fill", textShadow: "0 10px 0 rgba(36,23,38,0.6)" }}>TANPA SATU TEMBAKAN</div>
    </div>
  );
};

/* ================================================================== 2 IDE */
export const SceneTwIde: React.FC = () => {
  const D = DUR("ide");
  const ePeta = EV["ide.peta"];
  const eBr = EV["ide.brankas2"];
  const P: Part = {
    lat: "L2", preset: "akrab", look: DALAM, interior: true, pts: [[1.2, 2.0, 1.25, 10], [0.2, 0.8, 2.3, 10]],
    shafts: [{ a: [-3.5, 0.2, 1.9], b: [-1.2, 0.9, 0], r0: 0.55, r1: 1.0, s: 0.2 }], dust: { c: [-2.2, 0.5, 1.2], sz: [2.2, 2.4, 1.8] },
    keys: [
      { to: Math.max(40, lineF("ide", 1) - 4), p0: [2.6, -2.9, 1.7], p1: [2.2, -2.4, 1.6], l0: [-0.4, 1.8, 1.2], fov: 50, r0: -2 },
      { to: ePeta + 50, p0: [1.3, -0.7, 1.35], p1: [1.1, -0.5, 1.3], l0: [0.2, 1.4, 1.05], fov: 42, r0: 3, r1: 1 },
      { to: eBr - 2, p0: [2.2, -2.2, 1.5], l0: [-0.2, 1.5, 1.1], fov: 46 },
      { to: eBr + 40, p0: [0.25, -0.95, 1.6], p1: [0.15, -0.75, 1.6], l0: [-0.7, 0.35, 1.5], fov: 32, r0: -4 },
      { to: D, p0: [2.4, -2.7, 1.8], l0: [-0.3, 1.6, 1.2], fov: 52, r0: -2 },
    ],
    fg: (f) => (f < lineF("ide", 1) ? "edge" : null),
    actors: (f) => {
      const walkK = ease(f, 0, lineF("ide", 0) + 25);
      const araPos = lerp3([-2.7, 0.0, 0], [-0.65, 0.3, 0], walkK);
      const walking = walkK < 1;
      const point = f >= ePeta - 4 && f < ePeta + 60;
      return [
        { p: { ...FOTOGRAFER, ...poseSit(), ...idle(f, 1), expr: "smug", ...talk("ide", "dodi", f, 1), ...(point ? { armR: [95, -20] } : {}) }, at: [0.2, 1.2, 0], toCam: 0.3 },
        { p: walking ? { ...MIMI, ...poseWalkSide(f), ...talk("ide", "ara", f) } : { ...MIMI, ...idle(f, 2), turn: 0.5, ...talk("ide", "ara", f, 2), ...(f >= eBr - 2 ? { expr: "shock", sweat: true, mouthOpen: 0.6 } : {}) }, at: araPos },
      ];
    },
  };
  return (
    <AbsoluteFill>
      <Multi parts={[[D, P]]} />
      <MapInsert from={ePeta - 2} len={52} />
      <Emote x={300} y={760} from={eBr} to={eBr + 30} text="?!" />
    </AbsoluteFill>
  );
};
/** insert close-up: jari menelusuri garis got di peta sampai kotak BANQUE */
const MapInsert: React.FC<{ from: number; len: number }> = ({ from, len }) => {
  const f = useCurrentFrame();
  const d = f - from;
  if (d < 0 || d > len) return null;
  const op = Math.min(sm(d / 5), sm((len - d) / 5));
  const k = sm((d - 6) / (len - 16));
  const route = [[140, 1420], [330, 1350], [470, 1180], [610, 1160], [760, 1010], [900, 980]];
  const seg = k * (route.length - 1);
  const i = Math.min(route.length - 2, Math.floor(seg));
  const t = seg - i;
  const hx = lerp(route[i][0], route[i + 1][0], t);
  const hy = lerp(route[i][1], route[i + 1][1], t);
  const pts = route.slice(0, i + 1).concat([[hx, hy]]).map((p) => p.join(",")).join(" ");
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920">
        <rect width="1080" height="1920" fill="#e9dcb4" />
        {Array.from({ length: 24 }, (_, j) => <line key={`v${j}`} x1={j * 48} y1="0" x2={j * 48} y2="1920" stroke="#d2c49a" strokeWidth="2" />)}
        {Array.from({ length: 40 }, (_, j) => <line key={`h${j}`} x1="0" y1={j * 48} x2="1080" y2={j * 48} stroke="#d2c49a" strokeWidth="2" />)}
        {[600, 820, 1100, 1300, 1560].map((y, j) => <line key={j} x1="0" y1={y} x2="1080" y2={y + (j % 2 ? 60 : -50)} stroke="#bfae86" strokeWidth="40" />)}
        <polyline points={route.map((p) => p.join(",")).join(" ")} fill="none" stroke="#2a5a9a" strokeWidth="18" strokeDasharray="4 22" strokeLinecap="round" opacity="0.5" />
        <polyline points={pts} fill="none" stroke="#2a5a9a" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="840" y="860" width="200" height="140" fill="none" stroke="#b02a22" strokeWidth="12" />
        <text x="850" y="840" fontFamily="Anton, Impact" fontSize="56" fill="#b02a22">BANQUE</text>
        <text x="100" y="1500" fontFamily="Anton, Impact" fontSize="56" fill="#2a5a9a">ÉGOUT</text>
        {k > 0.92 && <circle cx="940" cy="930" r={60 + 10 * Math.sin(d)} fill="none" stroke="#b02a22" strokeWidth="10" />}
        <HandSvg x={hx - 40} y={hy + 160} rot={-70} s={1.0} grip={0.6} sleeve="#d9c79e" skin="#f0cfae" />
      </svg>
    </AbsoluteFill>
  );
};

/* ================================================================== 3 GOT */
export const SceneTwGot: React.FC = () => {
  const D = DUR("got");
  const c1 = at(D, 0.27);
  const c2 = at(D, 0.52);
  const eBau = EV["got.bau"];
  const A: Part = {
    lat: "L1", preset: "malam", look: MALAM, pts: [[-5, 6.7, 4.3, 14], [5, 6.7, 4.3, 14], [-3.2, -1.8, 0.5, 6]],
    keys: [{ to: c1, p0: [-0.1, -5.9, 0.7], p1: [-0.6, -5.1, 0.55], l0: [-2.8, -1.5, 0.8], fov: 50, r0: 4 }],
    actors: (f) => {
      const lift = ease(f, 6, c1 - 10);
      return [
        { p: { ...FOTOGRAFER_GALI, ...poseCrouch(true), expr: "smug", armL: [40 + lift * 30, -20], armR: [55 + lift * 30, -30] }, at: [-2.2, -1.75, 0], flip: true, item: { kind: "cover", hand: "both", rot: [lerp(0.1, 1.45, lift), lerp(0, 1.15, lift), 0], s: 0.78 } },
        { p: { ...MIMI_GOT, ...idle(f, 3), expr: "disgust", turn: -0.5, armR: [50, -60] }, at: [-4.0, -0.9, 0], item: { kind: "lantern" } },
      ];
    },
  };
  const B: Part = {
    lat: "L3", preset: "malam", look: MALAM, interior: true, pts: [[0.9, 0, 4.5, 14], [-1.4, 2, 2.4, 6], [-1.4, 8, 2.4, 6]],
    shafts: [{ a: [0.9, 0, 6.2], b: [0.9, 0, -0.4], r0: 0.38, r1: 0.75, col: "#e8f0ff", s: 0.16 }],
    keys: [{ to: c2 - c1, p0: [-0.75, -0.75, 1.6], l0: [1.25, 0, 1.35], fov: 54, r0: -2 }],
    actors: (f) => {
      const z = lerp(2.6, 0, ease(f, 0, c2 - c1 - 4));
      const p: BeanParams = { ...MIMI_GOT, ...poseClimb(f), hair: "#4a2a1a", ...(f >= c2 - c1 - 4 ? { ground: true } : {}) };
      return [{ p, at: [1.1, 0, z], item: { kind: "lantern", hand: "L", s: 0.9 } }];
    },
  };
  const C: Part = {
    lat: "L3", preset: "malam", look: MALAM, interior: true, pts: [[-1.4, 2, 2.4, 6], [-1.4, 8, 2.4, 6], [-1.4, 14, 2.4, 6], [0.9, 0, 4.5, 10]],
    shafts: [{ a: [0.9, 0, 6.2], b: [0.9, 0, -0.4], r0: 0.38, r1: 0.75, col: "#e8f0ff", s: 0.16 }], dust: { c: [0.9, 0, 2.2], sz: [1.4, 4.0, 1.4] },
    keys: [
      { to: eBau - c2 - 4, p0: [0.4, -2.6, 1.45], p1: [0.5, -0.2, 1.4], l0: [0.9, 6, 1.0], fov: 50, r0: 3 },
      { to: eBau - c2 + 36, p0: [1.0, 1.9, 1.55], l0: [1.3, 4.2, 1.45], fov: 36, r0: -3 },
      { to: D - c2, p0: [0.4, -1.0, 1.5], p1: [0.5, 1.6, 1.45], l0: [0.8, 9, 0.9], fov: 52, r0: 2 },
    ],
    actors: (f) => {
      const gf = f + c2;
      const stop = gf >= eBau - 4 && gf < eBau + 36;
      const aY = stop ? lerp(0.8, 4.6, ease(eBau - 4 - c2, 0, D - c2)) : lerp(0.8, 7.5, ease(f, 0, D - c2));
      const dY = lerp(-2.6, 4.0, ease(f, 0, D - c2));
      return [
        { p: stop ? { ...MIMI_GOT, expr: "disgust", turn: -0.6, ...talk("got", "ara", gf), armR: [50, -60] } : { ...MIMI_GOT, ...beanWalk(f / 17), back: true, hair: "#4a2a1a", armR: [50, -60] }, at: [1.3, aY, 0], item: { kind: "lantern" } },
        { p: { ...FOTOGRAFER_GALI, ...beanWalk(f / 16 + 0.4), back: mouth("got", "dodi", gf) === 0, hair: "#2a1c14", ...talk("got", "dodi", gf) }, at: [1.25, dY, 0] },
      ];
    },
  };
  return <Multi parts={[[c1, A], [c2, B], [D, C]]} />;
};

/* ================================================================== 4 GALI (penampang) */
export const SceneTwGali: React.FC = () => {
  const D = DUR("gali");
  const eA = EV["gali.ambruk"];
  const eB = EV["gali.bersin"];
  const P: Part = {
    lat: "L4", preset: "siang", look: LUAR, pts: [[-8, -1.3, -4.6, 6], [-3.5, -1.2, -4.5, 5], [0, -1.2, -4.5, 5], [1.2, -1.2, -4.5, 5]],
    shake: [eA, eA + 6],
    keys: [
      { to: lineF("gali", 1) - 6, p0: [-9.5, -19.5, -1.6], p1: [-2.5, -19.5, -1.8], l0: [-9.5, 0, -2.4], l1: [-2.5, 0, -2.8], fov: 46 },
      { to: eA + 22, p0: [-3.4, -6.5, -4.6], p1: [-3.6, -5.6, -4.65], l0: [-3.6, 0, -4.95], fov: 34, r0: 2 },
      { to: eB + 30, p0: [0.2, -6.2, -4.5], p1: [0.5, -5.4, -4.6], l0: [0.8, 0, -4.95], fov: 34, r0: -2 },
      { to: D, p0: [-1.5, -17, -2.2], l0: [-1.5, 0, -3.0], fov: 46 },
    ],
    actors: (f) => {
      const craw = Math.sin(f / 50) * 0.5 + 0.5;
      return [
        { p: { ...FOTOGRAFER_GALI, ...poseDig(f, 1.3), ...talk("gali", "dodi", f), headTilt: -10 }, at: [0.95, -1.88, -5.42], item: { kind: "drill", rot: [0, 0, 0.2] } },
        { p: { ...MIMI_GOT, ...poseCrawl(f, 1.2), expr: f >= eA - 2 ? "scared" : "worried", sweat: true, ...(mouth("gali", "ara", f) ? { mouthOpen: mouth("gali", "ara", f) } : {}) }, at: [lerp(-3.0, -4.2, craw), -1.88, -5.42], flip: true },
        { p: { ...KOMPLOTAN, ...poseCrouch(true), expr: "neutral", armR: [40, -20] }, at: [-7.4, -1.3, -5.42], item: { kind: "bucket" } },
        { p: { ...POLISI, ...poseWalkSide(f), expr: "neutral" }, at: [lerp(-15, -8.5, f / D), -1.4, 0.24] },
      ];
    },
    extra: (f) => (f >= eA - 2 && f < eA + 60 ? <Dust center={bl(-3.6, -1.6, -4.6, OX.L4)} size={[2.5, 1.0, 1.0]} frame={f * 3} color="#c8a070" /> : null),
  };
  return (
    <AbsoluteFill>
      <Multi parts={[[D, P]]} />
      <Chip from={12} to={lineF("gali", 0, true)} top={1130} size={50}>±8 METER · BERMINGGU-MINGGU</Chip>
      <Emote x={540} y={600} from={eB + 4} to={eB + 34} text="..." />
    </AbsoluteFill>
  );
};

/* ================================================================== 5 BRANKAS */
export const SceneTwBrankas: React.FC = () => {
  const D = DUR("brankas");
  const eK = EV["brk.kotak"];
  const eS = EV["brk.sopan"];
  const rise = (f: number, a: number) => lerp(-1.9, -0.95, ease(f, a, a + 22));
  const P: Part = {
    lat: "L5", preset: "tegang", look: DALAM, interior: true, pts: [[-2.5, 0.5, 3.2, 12], [2.5, 0.5, 3.2, 12], [-1.7, -1.4, 0.4, 5]],
    dust: { c: [-1.2, -0.6, 1.4], sz: [3, 3, 2] },
    shafts: [{ a: [0, 0.3, 3.3], b: [-0.4, 0.2, 0], r0: 0.4, r1: 1.4, col: "#fff2d0", s: 0.12 }],
    keys: [
      { to: lineF("brankas", 0, true) + 6, p0: [-0.3, -3.4, 0.3], p1: [-0.4, -3.1, 0.35], l0: [-1.8, -0.9, 1.0], fov: 44, r0: 5, r1: 3 },
      { to: eK - 3, p0: [2.6, -4.4, 1.9], l0: [-0.6, 2.2, 1.2], fov: 56, r0: -3 },
      { to: eS - 4, p0: [0.3, -1.0, 1.6], p1: [0.0, -0.7, 1.65], l0: [-4.7, 0.3, 1.8], fov: 50, r0: 4 },
      { to: D, p0: [0.5, -2.6, 1.5], l0: [-1.0, -0.6, 1.2], fov: 40, r0: -2 },
    ],
    dof: (f) => (f < lineF("brankas", 0, true) ? [-1.7, -1.4, 0.2] : null),
    actors: (f) => {
      const out = f >= eK - 3;
      const dz = out ? 0 : rise(f, 4);
      const az = rise(f, lineF("brankas", 1) - 30);
      return [
        { p: { ...FOTOGRAFER_GALI, ...idle(f), expr: "smug", ...talk("brankas", "dodi", f), ...(out ? {} : { armL: [-100, -30], armR: [100, 30] }), ...(f >= eS ? { lean: 10, headTilt: 12 } : {}) }, at: out ? [-1.0, -0.9, 0] : [-1.7, -1.4, dz] },
        { p: { ...MIMI_GOT, ...idle(f, 2), ...talk("brankas", "ara", f), ...(f >= eK - 3 && f < eS ? { expr: "shock", sweat: true, mouthOpen: Math.max(0.5, mouth("brankas", "ara", f)), armL: [-140, -10], armR: [140, 10] } : {}) }, at: f >= eK - 3 ? [-2.6, 0.6, 0] : [-1.7, -1.4, az] },
      ];
    },
  };
  return (
    <AbsoluteFill>
      <Multi parts={[[D, P]]} />
      <Chip from={eK} to={eK + 50} top={1100} size={64}>371 KOTAK DEPOSIT</Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== 5b UANG */
export const SceneTwUang: React.FC = () => {
  const D = DUR("uang");
  const eT = EV["uang.tangkap"];
  const eW = EV["uang.wangi"];
  const c1 = Math.max(30, eT - 6);
  const c2 = Math.max(c1 + 20, eW - 6);
  const ox = OX.L5;
  const pts = [[-2.5, 0.5, 3.2, 12], [-3.9, -0.8, 1.9, 6]];
  const A: Part = {
    lat: "L5", preset: "tegang", look: DALAM, interior: true, pts,
    keys: [{ to: c1, p0: [-3.15, -2.3, 1.35], l0: [-4.45, -0.05, 0.95], fov: 44, r0: 3 }],
    actors: (f) => {
      const reach = ease(f, 0, c1 * 0.3);
      const pull = ease(f, c1 * 0.35, c1 * 0.65);
      const grab = f >= c1 * 0.75;
      const p: BeanParams = { ...FOTOGRAFER_GALI, ...poseCrouch(true), pitch: lerp(26, 12, reach), expr: grab ? "smug" : "think", armL: [40, -30], armR: [lerp(40, 98, reach) - 30 * pull + (grab ? 20 : 0), lerp(-30, -6, reach) - 20 * pull - (grab ? 30 : 0)] };
      return [{ p, at: [-3.95, 0.25, 0], flip: true, ...(grab ? { item: { kind: "money" as const, rot: [0.2, 0.5, 0] as Vec3 } } : {}) }];
    },
    extra: (f, cam) => {
      const full: BeanParams = { ...FOTOGRAFER_GALI, ...poseCrouch(true), pitch: 12, armR: [98, -6] };
      const h = wpos(full, "R", [-3.95, 0.25, 0], ox, cam, true);
      const out = 0.02 + 0.4 * ease(f, c1 * 0.35, c1 * 0.65);
      return (
        <group position={[ox - 4.77, h[1] - 0.05, h[2]]} rotation={[0, Math.PI / 2, 0]}>
          <OpenDrawer out={out} bundles={f >= c1 * 0.75 ? 5 : 6} />
        </group>
      );
    },
  };
  const toss = (f: number) => ease(f, 6, 24);
  const B: Part = {
    lat: "L5", preset: "tegang", look: DALAM, interior: true, pts, dust: { c: [-2.6, -0.2, 1.4], sz: [2, 2, 1.6] },
    keys: [{ to: c2 - c1, p0: [-1.3, -4.8, 1.5], p1: [-1.5, -4.4, 1.5], l0: [-2.95, -0.1, 1.0], fov: 54, r0: -3 }],
    actors: (f) => [
      { p: { ...FOTOGRAFER_GALI, ...poseCrouch(true), expr: "laugh", mouthOpen: mouth("uang", "dodi", f + c1) || 0.3, armL: [60, 10], armR: [lerp(90, 150, ease(f, 0, 8)), 20] }, at: [-3.75, -0.3, 0] },
      { p: { ...MIMI_GOT, expr: toss(f) < 1 ? "shock" : "happy", sweat: toss(f) < 1, turn: -0.4, armL: [-120, -30], armR: [120, 30] }, at: [-1.7, 0.4, 0], flip: true, ...(toss(f) >= 1 ? { item: { kind: "money" as const, hand: "both" as const, off: [0, -0.1, 0] as Vec3 } } : {}) },
    ],
    extra: (f) => {
      const k = toss(f);
      if (k <= 0 || k >= 1) return null;
      const p = lerp3([-3.4, -0.2, 1.35], [-1.9, 0.35, 1.55], k);
      p[2] += Math.sin(k * Math.PI) * 0.55;
      return <group position={bl(p[0], p[1], p[2], ox)} rotation={[k * 8, k * 5, 0]}><MoneyBundle /></group>;
    },
  };
  const C: Part = {
    lat: "L5", preset: "tegang", look: DALAM, interior: true, pts: [[-2.5, 0.5, 3.2, 12], [-1.2, -0.5, 1.8, 6]],
    keys: [{ to: D - c2, p0: [-0.9, -1.6, 1.55], p1: [-1.0, -1.3, 1.55], l0: [-1.75, 0.4, 1.35], fov: 40, r0: 3 }],
    dof: () => [-1.7, 0.4, 1.5],
    actors: (f) => [{ p: { ...MIMI_GOT, expr: "happy", blink: true, turn: -0.5, ...talk("uang", "ara", f + c2), armL: [-30, -40], armR: [118, 92] }, at: [-1.75, 0.4, 0], item: { kind: "money", hand: "R", off: [0, 0.02, 0], rot: [0.2, 0.3, 0.9] } }],
    extra: () => <group position={bl(-1.15, 0.2, 0.42, ox)}><Sack /></group>,
  };
  return <Multi parts={[[c1, A], [c2, B], [D, C]]} />;
};

/* ================================================================== 6 PESAN */
export const SceneTwPesan: React.FC = () => {
  const D = DUR("pesan");
  const l1 = LINES.pesan[1];
  const eM = EV["psn.mencuri"];
  const c1 = Math.max(30, lineF("pesan", 0) - 4);
  const ox = OX.L5;
  const W: Part = {
    lat: "L5", preset: "tegang", look: { ...DALAM, exposure: 0.85 }, interior: true, pts: [[-2.5, 0.5, 3.2, 8]],
    keys: [{ to: c1, p0: [1.4, 1.2, 1.3], p1: [1.2, 1.6, 1.25], l0: [-1.3, 4.1, 1.1], fov: 40, r0: 4 }],
    actors: (f) => [{ p: { ...FOTOGRAFER_GALI, ...poseCrouch(true), expr: "angry", armL: [70, -30], armR: [85, -40] }, at: [-1.0, 3.45, 0] }],
    extra: (f) => <group position={bl(-1.62, 3.92, 1.0, ox)}><Sparks frame={f} /></group>,
  };
  const prog = (f: number) => (l1 ? cl((f - l1.from) / Math.max(1, l1.to - l1.from)) : 0);
  const T: Part = {
    lat: "L5", preset: "tegang", look: DALAM, interior: true, pts: [[-2.5, 0.5, 3.2, 12], [-2.6, 2.6, 2.0, 6]],
    keys: [
      { to: Math.max(20, lineF("pesan", 1) - c1 - 2), p0: [-0.6, 0.2, 1.6], l0: [-3.0, 4.2, 1.9], fov: 46, r0: -2 },
      { to: Math.max(40, eM - c1 - 30), p0: [-2.2, 2.2, 1.7], p1: [-2.4, 2.5, 1.75], l0: [-3.0, 4.2, 2.0], fov: 40, r0: 2 },
      { to: D - c1, p0: [-0.3, 0.3, 1.6], p1: [-0.35, 0.55, 1.6], l0: [-1.0, 1.4, 1.6], fov: 32, r0: -3 },
    ],
    actors: (f) => {
      const gf = f + c1;
      const painting = l1 && gf >= l1.from - 6 && gf <= l1.to + 4;
      const stroke = Math.sin(gf * 0.5) * 18;
      return [
        { p: painting ? { ...FOTOGRAFER_GALI, back: true, hair: "#2a1c14", armR: [150 + stroke, -10], armL: [-20, -10] } : { ...FOTOGRAFER_GALI, ...idle(gf), expr: "smug", turn: 0.5, ...talk("pesan", "dodi", gf) }, at: [-3.0, 3.6, 0], item: { kind: "brush", rot: [0, 0, 0.4] } },
        { p: { ...MIMI_GOT, ...idle(gf, 2), turn: 0.6, ...talk("pesan", "ara", gf), ...(gf >= eM - 30 ? { expr: mouth("pesan", "ara", gf) ? "talk" : "neutral", headTilt: -6 } : {}) }, at: [-1.0, 1.3, 0] },
      ];
    },
    extra: (f) => <group position={bl(-3.1, 4.18, 2.05, ox)}><WallText lines={["SANS ARMES,", "NI HAINE,", "NI VIOLENCE"]} progress={prog(f + c1)} w={2.0} h={1.05} /></group>,
  };
  return (
    <AbsoluteFill>
      <Multi parts={[[c1, W], [D, T]]} />
      <Chip from={l1 ? l1.from : 0} to={l1 ? l1.to + 20 : 0} top={1150} size={46}>"tanpa senjata, tanpa kebencian, tanpa kekerasan"</Chip>
    </AbsoluteFill>
  );
};

/* ================================================================== 7 TANGKAP */
export const SceneTwTangkap: React.FC = () => {
  const D = DUR("tangkap");
  const eT = EV["tkp.tertangkap"];
  const eL = EV["tkp.lenyap"];
  const c1 = Math.max(60, eT - 10);
  const A: Part = {
    lat: "L5", preset: "siang", look: DALAM, interior: true, pts: [[-2.5, 0.5, 3.2, 10], [2.5, 0.5, 3.2, 10]],
    keys: [
      { to: Math.round(c1 * 0.5), p0: [-0.3, -3.4, 0.35], l0: [-1.8, -0.9, 1.0], fov: 44, r0: 4 },
      { to: c1, p0: [0.4, -1.6, 1.5], p1: [0.2, -1.2, 1.5], l0: [-2.8, 3.6, 1.9], fov: 46, r0: -2 },
    ],
    actors: (f) => {
      const up = lerp(-1.9, 0, ease(f, 4, c1 * 0.45));
      const readK = f > c1 * 0.5;
      return [
        { p: { ...POLISI, ...idle(f), expr: readK ? "shock" : "neutral", sweat: readK, ...(readK ? { turn: 0.6 } : { armL: [-100, -30], armR: [100, 30] }) }, at: readK ? [-1.2, -0.6, 0] : [-1.7, -1.4, up] },
      ];
    },
    extra: () => <group position={bl(-3.1, 4.18, 2.05, OX.L5)}><WallText lines={["SANS ARMES,", "NI HAINE,", "NI VIOLENCE"]} progress={1} w={2.0} h={1.05} /></group>,
  };
  const B: Part = {
    lat: "L2", preset: "akrab", look: DALAM, interior: true, pts: [[1.2, 2.0, 1.25, 10], [0.2, 0.8, 2.3, 10]],
    keys: [
      { to: 34, p0: [0.55, 0.35, 0.95], l0: [0.22, 1.05, 0.78], fov: 30, r0: 5 },
      { to: D - c1, p0: [2.3, -2.6, 1.6], p1: [2.0, -2.2, 1.6], l0: [-0.4, 1.4, 1.2], fov: 50, r0: -2 },
    ],
    actors: (f) => {
      const gf = f + c1;
      const cuffed = gf >= eT + 4;
      return [
        { p: { ...FOTOGRAFER, ...poseSit(), ...idle(gf), expr: "smug", armL: [-28, -40], armR: [28, 40] }, at: [0.2, 1.2, 0], toCam: 0.3, ...(cuffed ? { item: { kind: "cuffs" as const, hand: "both" as const } } : {}) },
        { p: { ...POLISI, ...idle(gf, 3), expr: "angry", turn: -0.4, armR: [60, -60] }, at: [1.2, 1.9, 0] },
        { p: { ...MIMI, ...idle(gf, 2), turn: 0.5, expr: "smug", ...talk("tangkap", "ara", gf) }, at: [-1.4, 0.5, 0] },
      ];
    },
  };
  return (
    <AbsoluteFill>
      <Multi parts={[[c1, A], [D, B]]} />
      <Chip from={eL - 4} to={eL + 60} top={1080} size={58}>±50 JUTA FRANC LENYAP</Chip>
      <Stamp text="TERTANGKAP" from={eT + 4} to={eT + 50} top={520} color="#1e3a8a" />
    </AbsoluteFill>
  );
};

/* ================================================================== 8 KABUR */
export const SceneTwKabur: React.FC = () => {
  const D = DUR("kabur");
  const eJ = EV["kbr.melompat"];
  const eA = EV["kbr.atap"];
  const eM = EV["kbr.motor"];
  const eH = EV["kbr.hah"];
  const l3 = lineF("kabur", 3);
  const runA = eJ - 26;
  const ox = OX.L6;
  const A: Part = {
    lat: "L6", preset: "siang", look: DALAM, interior: true, pts: [[0.5, 4.1, FZ + 2.7, 8]],
    shafts: [{ a: [-1.8, 0.2, FZ + 1.7], b: [-0.2, 3.4, FZ], r0: 0.7, r1: 1.3, s: 0.2 }], dust: { c: [-1.0, 1.8, FZ + 1.0], sz: [2, 2.6, 1.8] },
    keys: [
      { to: runA - 2, p0: [3.9, 0.7, FZ + 1.6], p1: [3.6, 1.1, FZ + 1.55], l0: [-0.1, 5.1, FZ + 1.0], fov: 50, r0: -2 },
      { to: eJ + 6, p0: [2.4, 2.6, FZ + 1.5], l0: [-1.6, 0.4, FZ + 1.4], fov: 48, r0: 4 },
    ],
    actors: (f) => {
      const run = ease(f, runA, eJ);
      const running = f >= runA;
      const dPos = running ? lerp3([0.3, 3.5, FZ], [-1.8, 0.7, FZ + (run > 0.85 ? (run - 0.85) * 4 : 0)], run) : [0.3, 3.5, FZ];
      const pointMap = f >= EV["kbr.peta"] - 4 && !running;
      return [
        { p: { ...HAKIM, ...poseSit(), ...idle(f, 4), expr: pointMap ? "think" : "neutral", lean: pointMap ? 8 : 0, prop: "paper", armR: [40, -60] }, at: [0.8, 6.0, FZ], toCam: 0.25 },
        running
          ? { p: { ...FOTOGRAFER, ...(run > 0.85 ? poseJump(true) : poseRunSide(f, 1.2)), expr: "smug" }, at: dPos, flip: true, item: { kind: "cuffs", hand: "both" } }
          : { p: { ...FOTOGRAFER, ...poseSit(true), ...idle(f), expr: "smug", ...talk("kabur", "dodi", f), ...(pointMap ? { armR: [95, -10] } : { armL: [60, -40], armR: [64, -44] }) }, at: [0.3, 3.5, FZ], toCam: 0.28, flip: true, item: { kind: "cuffs", hand: "both" } },
        { p: { ...MIMI, ...poseSit(), ...idle(f, 2), expr: running ? "shock" : "neutral", sweat: running, prop: "pen" }, at: [-2.6, 4.75, FZ], toCam: 0.3 },
        { p: { ...POLISI, ...idle(f, 3), expr: running ? "shock" : "neutral", turn: 0.4 }, at: [-1.6, 4.2, FZ] },
      ];
    },
  };
  const c2 = eJ + 6;
  const bikeX = (f: number) => lerp(3.4, 26, ease(f, eM - c2 + 10, eH - c2 + 30));
  const B: Part = {
    lat: "L6", preset: "siang", look: LUAR,
    keys: [
      { to: eA - c2 + 18, p0: [1.6, -8.6, 1.4], l0: [-1.4, -1.6, 2.9], l1: [-1.4, -2.6, 1.6], fov: 52, r0: 4 },
      { to: eH - c2 - 2, p0: [0.2, -9.5, 1.0], p1: [6, -10.5, 1.1], l0: [3.2, -4.6, 0.9], l1: [12, -4.8, 0.9], fov: 46, r0: -3 },
    ],
    shake: [eA - c2 + 2],
    actors: (f) => {
      const g = f + c2;
      const fall = ease(g, eJ + 2, eA + 2);
      const onRoof = g >= eA + 2 && g < eM - 4;
      const toBike = ease(g, eM - 4, eM + 10);
      if (g < eM - 4) {
        const p0 = [-1.8, 0.1, FZ + 0.6];
        const p1 = [-1.6, -3.2, 1.62];
        const pos = lerp3(p0, p1, fall);
        pos[2] += Math.sin(fall * Math.PI) * 0.6;
        return [{ p: onRoof ? { ...FOTOGRAFER, ...poseCrouch(), squash: Math.max(0, 0.12 - (g - eA) * 0.01), expr: "smug" } : { ...FOTOGRAFER, ...poseJump(), expr: "shock", sweat: true }, at: pos, item: { kind: "cuffs", hand: "both" } }];
      }
      const bx = bikeX(f);
      return [{ p: { ...FOTOGRAFER, ...poseSit(true), shin: 210, expr: "laugh", mouthOpen: 0.5, armR: [80, -20], armL: [70, -20] }, at: lerp3([-1.6, -3.2, 1.62], [bx - 0.1, -4.8, 0.55], toBike) }];
    },
    extra: (f) => <group position={bl(bikeX(f), -4.8, 0.0, ox)}><Motorbike spin={bikeX(f) / 0.27} /></group>,
  };
  const c3 = eH - 4;
  const C: Part = {
    lat: "L6", preset: "siang", look: DALAM, interior: true, pts: [[0.5, 4.1, FZ + 2.7, 8]],
    keys: [{ to: l3 - c3, p0: [-1.6, 2.6, FZ + 1.45], p1: [-1.7, 2.9, FZ + 1.45], l0: [-2.6, 4.7, FZ + 1.2], fov: 34, r0: -4 }],
    actors: (f) => [{ p: { ...MIMI, ...idle(f + c3, 2), expr: "shock", sweat: true, mouthOpen: mouth("kabur", "ara", f + c3) || 0.5, armL: [-150, -10], armR: [150, 10] }, at: [-2.6, 4.75, FZ] }],
  };
  const E: Part = {
    lat: "L6", preset: "senja", look: LUAR,
    keys: [{ to: D - l3, p0: [-2, -16, 3.5], p1: [-3, -20, 6], l0: [4, 0, 3], l1: [8, 0, 5], fov: 52, r0: -2 }],
    actors: (f) => [{ p: { ...FOTOGRAFER, ...poseSit(true), shin: 210, expr: "laugh", armR: [80, -20] }, at: [26 + f * 0.25 - 0.1, -4.8, 0.55], h: 1.9 }],
    extra: (f) => <group position={bl(26 + f * 0.25, -4.8, 0.0, ox)}><Motorbike spin={f} /></group>,
  };
  return (
    <AbsoluteFill>
      <Multi parts={[[c2, A], [c3, B], [l3, C], [D, E]]} />
      <Chip from={eJ - 40} to={eJ + 10} top={1120} size={50}>MARET 1977 · KANTOR HAKIM</Chip>
      <Stamp text="KABUR!" from={eA} to={eA + 40} top={500} color="#b91c1c" rot={5} />
      <EndCard from={l3 + 10} />
    </AbsoluteFill>
  );
};
const EndCard: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame();
  if (f < from) return null;
  const s = spring({ frame: f - from, fps: 30, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", top: 430, left: 50, right: 50, textAlign: "center", transform: `scale(${0.8 + 0.2 * s})`, opacity: Math.min(1, s * 1.5) }}>
      <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 92, lineHeight: 1.02, color: "#ffd23f", WebkitTextStroke: "9px #241726", paintOrder: "stroke fill", textShadow: "0 10px 0 rgba(36,23,38,0.6)" }}>UANGNYA TAK PERNAH DITEMUKAN</div>
      <div style={{ marginTop: 18, display: "inline-block", background: "#241726", color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 34, padding: "8px 26px", borderRadius: 16 }}>Kisah nyata · Nice, 1976–1977</div>
    </div>
  );
};

export const TW_SCENES: Record<TwScene, React.FC> = {
  hook: SceneTwHook, ide: SceneTwIde, got: SceneTwGot, gali: SceneTwGali, brankas: SceneTwBrankas, uang: SceneTwUang, pesan: SceneTwPesan, tangkap: SceneTwTangkap, kabur: SceneTwKabur,
};

/* caption 1-2 kata; tepi beda per suara */
export const TwCaptions: React.FC = () => {
  const f = useCurrentFrame();
  const cue = (timing.captions as { text: string; startFrame: number; endFrame: number; highlight: boolean; voice: string }[]).find((c) => f >= c.startFrame && f < c.endFrame);
  if (!cue) return null;
  const sp = spring({ frame: f - cue.startFrame, fps: 30, config: { damping: 12, stiffness: 250 } });
  const txt = cue.text.toLowerCase();
  const size = Math.min(92, 760 / (Math.max(4, txt.length) * 0.52));
  const ara = cue.voice === "ara";
  return (
    <div style={{ position: "absolute", top: 1370, left: 60, right: 60, textAlign: "center", pointerEvents: "none" }}>
      <span style={{ display: "inline-block", fontFamily: "Inter, system-ui, sans-serif", fontWeight: 900, fontSize: size, lineHeight: 1.1, color: cue.highlight ? "#ffd23f" : ara ? "#ffd6ea" : "#ffffff", WebkitTextStroke: `7px ${ara ? "#5a1838" : "rgba(24,10,28,0.96)"}`, paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(24,10,28,0.72)", transform: `scale(${0.7 + 0.3 * sp}) rotate(${(1 - sp) * (ara ? 4 : -4)}deg)`, opacity: Math.min(1, sp * 1.6) }}>{txt}</span>
    </div>
  );
};
void Drill; void Necklace; void Bucket; void Brush; void LightShaft; void poseClimb;

/** Pratinjau latar Blender "Terowongan ke Brankas": satu frame = satu shot (still-check, bukan video). */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanWalk, poseCrawl, poseCrouch, poseJump, poseKneel, poseSit, poseWalkSide } from "./three/objectsBean";
import { CineGrade, CineStage, Foreground, LIGHT_PRESETS, PL, cineCard, Cam } from "./cinemaKit";
import { CineLook, Dust, LightShaft } from "./cinePost";
import { FOTOGRAFER, FOTOGRAFER_GALI, MIMI, MIMI_GOT, MANAJER, POLISI, HAKIM, KOMPLOTAN } from "./SheetTerowongan";

const OX = { L1: 0, L2: 400, L3: 800, L4: 1200, L5: 1600, L6: 2000 } as const;
type Lat = keyof typeof OX;
const NODE: Record<Lat, string> = { L1: "L1_Jalan", L2: "L2_Studio", L3: "L3_Got", L4: "L4_Penampang", L5: "L5_Brankas", L6: "L6_Hakim" };
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];

type Tok = { p: BeanParams; at: [number, number, number]; h?: number; flip?: boolean };
type View = { judul: string; lat: Lat; cam: [number, number, number]; look: [number, number, number]; fov: number; roll?: number; preset: keyof typeof LIGHT_PRESETS; pts?: [number, number, number, number][]; tok: Tok[]; fg?: "bars" | "post" | "edge"; fgSide?: 1 | -1; interior?: boolean;
  gaya?: CineLook; shafts?: { a: [number, number, number]; b: [number, number, number]; r0?: number; r1?: number; col?: string; s?: number }[]; dust?: { c: [number, number, number]; sz: [number, number, number] } };
const LUAR: CineLook = { exposure: 1.1, env: 0.6, ao: 2.5, aoRadius: 1.6, bloom: 0.45 };
const DALAM: CineLook = { exposure: 1.0, env: 0.65, ao: 3.2, aoRadius: 0.9, bloom: 0.55 };
const MALAM: CineLook = { exposure: 0.62, env: 0, ao: 2.5, aoRadius: 0.9, bloom: 1.0 };

const FZ = 4.6;
const VIEWS: View[] = [
  { judul: "L1 · Jalan Nice + bank (siang)", lat: "L1", cam: [-7.5, -10.5, 1.6], look: [0.5, 9, 4.8], fov: 52, roll: -3, preset: "siang", fg: "post", fgSide: -1,
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER, expr: "talk", mouthOpen: 0.5, turn: 0.5, armR: [40, -80] }, at: [-2.2, -2.6, 0] }, { p: { ...MIMI, ...poseWalkSide(10), expr: "think" }, at: [-4.0, -1.2, 0] }, { p: { ...MANAJER, expr: "neutral", turn: -0.4 }, at: [1.2, 7.4, 0.26] }] },
  { judul: "L1 · Malam: tutup got dibuka", lat: "L1", cam: [-0.2, -5.6, 0.55], look: [-3.0, -1.8, 0.8], fov: 46, roll: 4, preset: "malam",
    pts: [[-5, 6.7, 4.3, 14], [5, 6.7, 4.3, 14], [-3.2, -1.8, 0.5, 6]],
    gaya: MALAM,
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseCrouch(true), expr: "smug", armL: [10, -20], armR: [20, -30] }, at: [-2.2, -1.75, 0], flip: true }, { p: { ...MIMI_GOT, expr: "disgust", turn: -0.5, prop: "torch", armR: [40, -70] }, at: [-4.4, -2.6, 0] }] },
  { judul: "L2 · Studio foto (akrab)", lat: "L2", cam: [2.3, -2.6, 1.6], look: [-0.1, 1.8, 1.2], fov: 50, roll: -2, preset: "akrab", interior: true, fg: "edge",
    pts: [[1.2, 2.0, 1.25, 10], [0.2, 0.8, 2.3, 10]],
    gaya: DALAM, shafts: [{ a: [-3.5, 0.2, 1.9], b: [-1.2, 0.9, 0], r0: 0.55, r1: 1.0, s: 0.2 }], dust: { c: [-2.2, 0.5, 1.2], sz: [2.2, 2.4, 1.8] },
    tok: [{ p: { ...FOTOGRAFER, ...poseSit(), expr: "smug", armR: [70, -50] }, at: [0.2, 1.2, 0] }, { p: { ...MIMI, expr: "shock", sweat: true, turn: 0.5 }, at: [-0.55, 0.1, 0] }] },
  { judul: "L3 · Got (malam, lentera)", lat: "L3", cam: [0.5, -4.6, 1.4], look: [-0.1, 10, 0.9], fov: 50, roll: 3, preset: "malam", interior: true,
    pts: [[1.3, 1.6, 1.3, 14], [-1.4, 2, 2.5, 6], [-1.4, 8, 2.5, 6], [-1.4, 14, 2.5, 6], [0.9, 0, 4, 12]],
    gaya: MALAM, shafts: [{ a: [0.9, 0, 6.2], b: [0.9, 0, -0.4], r0: 0.38, r1: 0.75, col: "#e8f0ff", s: 0.16 }], dust: { c: [0.9, 0, 2.2], sz: [1.4, 4.0, 1.4] },
    tok: [{ p: { ...MIMI_GOT, ...beanWalk(0.2), back: true, hair: "#4a2a1a", prop: "torch", armR: [40, -70] }, at: [1.3, 2.4, 0] }, { p: { ...FOTOGRAFER_GALI, ...beanWalk(0.7), back: true, hair: "#2a1c14" }, at: [1.25, 6.0, 0] }] },
  { judul: "L4 · Penampang: jalan → got → terowongan", lat: "L4", cam: [-5.0, -19.5, -1.6], look: [-5.0, 0, -2.6], fov: 46, preset: "siang",
    pts: [[-8, -1.3, -4.6, 6], [-3.5, -1.2, -4.5, 5], [0, -1.2, -4.5, 5]],
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseCrawl(4), expr: "neutral" }, at: [-1.0, -1.3, -5.42], h: 1.9 }, { p: { ...MIMI_GOT, ...poseCrawl(12), expr: "worried", sweat: true }, at: [-4.0, -1.3, -5.42], h: 1.9, flip: true },
      { p: { ...KOMPLOTAN, ...poseCrouch(true), expr: "neutral", prop: "bucket", propHand: "R" }, at: [-7.4, -1.3, -5.42], h: 1.9 }, { p: { ...POLISI, ...poseWalkSide(6), expr: "neutral" }, at: [-10.5, -1.4, 0.24], h: 1.9 }] },
  { judul: "L4 · Penampang: terowongan → brankas", lat: "L4", cam: [4.8, -19.5, -1.6], look: [4.8, 0, -2.6], fov: 46, preset: "siang",
    pts: [[7.4, -1.2, -3.2, 8], [1.5, -1.2, -4.5, 5]],
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseKneel(), expr: "smug", armL: [-150, 0], armR: [150, 0] }, at: [6.4, -1.0, -5.66], h: 1.9 }, { p: { ...MIMI_GOT, expr: "shock", sweat: true, turn: -0.4 }, at: [8.4, -1.2, -5.66], h: 1.9 }, { p: { ...KOMPLOTAN, ...poseCrawl(9), expr: "neutral" }, at: [1.4, -1.3, -5.42], h: 1.9 }] },
  { judul: "L5 · Brankas lebar", lat: "L5", cam: [2.4, -4.4, 1.9], look: [-0.6, 2.8, 1.3], fov: 56, roll: -3, preset: "tegang", interior: true, fg: "post", fgSide: 1,
    pts: [[-2.5, 0.5, 3.2, 12], [2.5, 0.5, 3.2, 12], [2.5, 0.9, 1.6, 10]],
    gaya: DALAM, shafts: [{ a: [2.5, 0.72, 1.66], b: [0.0, 4.0, 2.1], r0: 0.18, r1: 1.0, col: "#f4f4ff", s: 0.3 }], dust: { c: [1.2, 2.2, 1.9], sz: [2.6, 3.0, 2.0] },
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug", armL: [-100, -30], armR: [100, 30] }, at: [-1.7, -1.4, -0.95] }, { p: { ...MIMI_GOT, ...poseCrouch(), expr: "shock", sweat: true }, at: [-1.2, 1.4, 0] }, { p: { ...KOMPLOTAN, ...poseWalkSide(5), expr: "neutral", prop: "sack" }, at: [2.4, 1.6, 0], flip: true }] },
  { judul: "L5 · Sudut rendah: muncul dari lubang", lat: "L5", cam: [-0.3, -3.4, 0.3], look: [-1.8, -0.9, 1.0], fov: 44, roll: 5, preset: "tegang", interior: true,
    pts: [[-2.5, 0.5, 3.2, 12], [-1.7, -1.4, 0.4, 5]],
    gaya: { ...DALAM, dof: { focus: [-1.7, -1.4, 0.2], range: 1.6, blur: 3 } }, dust: { c: [-1.5, -0.6, 1.2], sz: [2, 2, 2] },
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug", armL: [-120, -10], armR: [120, -10] }, at: [-1.7, -1.4, -0.95] }] },
  { judul: "L6 · Kantor hakim (lantai 2)", lat: "L6", cam: [3.9, 0.7, FZ + 1.6], look: [-0.5, 5.0, FZ + 1.0], fov: 50, roll: -2, preset: "siang", interior: true,
    pts: [[0.5, 4.1, FZ + 2.7, 8]],
    gaya: DALAM, shafts: [{ a: [-1.8, 0.2, FZ + 1.7], b: [-0.2, 3.4, FZ], r0: 0.7, r1: 1.3, s: 0.2 }], dust: { c: [-1.0, 1.8, FZ + 1.0], sz: [2, 2.6, 1.8] },
    tok: [{ p: { ...HAKIM, ...poseSit(), expr: "think", prop: "paper", armR: [40, -60] }, at: [0.8, 6.0, FZ] }, { p: { ...FOTOGRAFER, ...poseSit(), expr: "smug", turn: -0.5 }, at: [0.3, 3.5, FZ] }, { p: { ...POLISI, expr: "neutral", turn: 0.4 }, at: [-1.6, 4.2, FZ] }] },
  { judul: "L6 · Luar: jendela → atap mobil → motor", lat: "L6", cam: [3.6, -12.5, 1.0], look: [0.6, 0, 3.6], fov: 56, roll: 4, preset: "siang",
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER, ...poseJump(), expr: "shock", sweat: true }, at: [-1.5, -2.2, 2.1], h: 1.9 }, { p: { ...KOMPLOTAN, ...poseSit(true), expr: "smug", armR: [80, -20] }, at: [3.3, -4.8, 0.5], h: 1.9 }] },
];
export const TOTAL_FRAMES_PRATINJAU_T = VIEWS.length * 2; // frame N.. = versi lama (tanpa look) untuk perbandingan

export const PratinjauTerowongan: React.FC = () => {
  const f = useCurrentFrame();
  const lama = f >= VIEWS.length;
  const v = VIEWS[f % VIEWS.length];
  const ox = OX[v.lat];
  const cam: Cam = { pos: bl(v.cam[0], v.cam[1], v.cam[2], ox), look: bl(v.look[0], v.look[1], v.look[2], ox), fov: v.fov, roll: v.roll ?? 0 };
  const P = LIGHT_PRESETS[v.preset];
  const card = cineCard(cam, P);
  const pts: PL[] = (v.pts ?? []).map(([x, y, z, i]) => ({ p: bl(x, y, z, ox), i }));
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/terowongan.glb" visible={(n) => n.startsWith(NODE[v.lat]) || n.startsWith("Langit")} focus={bl(v.look[0], v.look[1], 0, ox)} preset={v.preset} pts={pts} interior={v.interior}
        look={lama || !v.gaya ? undefined : { ...v.gaya, dof: v.gaya.dof ? { ...v.gaya.dof, focus: bl(v.gaya.dof.focus[0], v.gaya.dof.focus[1], v.gaya.dof.focus[2], ox) } : undefined }}>
        {v.tok.map((t, i) => (
          <BeanCard key={i} position={bl(t.at[0], t.at[1], t.at[2], ox)} height={t.h ?? 1.9} params={t.p} flip={t.flip} {...card} />
        ))}
        {!lama && v.shafts?.map((q, i) => <LightShaft key={i} from={bl(q.a[0], q.a[1], q.a[2], ox)} to={bl(q.b[0], q.b[1], q.b[2], ox)} r0={q.r0} r1={q.r1} color={q.col} strength={q.s} />)}
        {!lama && v.dust && <Dust center={bl(v.dust.c[0], v.dust.c[1], v.dust.c[2], ox)} size={[v.dust.sz[0], v.dust.sz[2], v.dust.sz[1]]} frame={f} />}
        {v.fg && <Foreground cam={cam} kind={v.fg} side={v.fgSide ?? 1} color="#1a1a22" />}
      </CineStage>
      <CineGrade preset={v.preset} />
      <div style={{ position: "absolute", top: 40, left: 40, right: 40, fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 40, color: "#fff", textShadow: "0 3px 8px #000" }}>
        {(f % VIEWS.length) + 1}. {v.judul}{lama ? " (lama)" : ""}
      </div>
    </AbsoluteFill>
  );
};

/** Pratinjau latar Blender "Terowongan ke Brankas": satu frame = satu shot (still-check, bukan video). */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanWalk, poseCrawl, poseCrouch, poseJump, poseKneel, poseSit, poseWalkSide } from "./three/objectsBean";
import { CineGrade, CineStage, Foreground, LIGHT_PRESETS, PL, cineCard, Cam } from "./cinemaKit";
import { CineLook, Dust, LightShaft } from "./cinePost";
import { Watermark } from "./Watermark";
import { Brush, Bucket, Drill, Handcuffs, InHand, Lantern, ManholeCover, MoneyBundle, Necklace, OpenDrawer, Sack, Shovel } from "./three/objectsTerowongan";
import { FOTOGRAFER, FOTOGRAFER_GALI, MIMI, MIMI_GOT, MANAJER, POLISI, HAKIM, KOMPLOTAN } from "./SheetTerowongan";

const OX = { L1: 0, L2: 400, L3: 800, L4: 1200, L5: 1600, L6: 2000 } as const;
type Lat = keyof typeof OX;
const NODE: Record<Lat, string> = { L1: "L1_Jalan", L2: "L2_Studio", L3: "L3_Got", L4: "L4_Penampang", L5: "L5_Brankas", L6: "L6_Hakim" };
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];

type Item = { kind: "lantern" | "drill" | "sack" | "cover" | "bucket" | "shovel" | "brush" | "cuffs" | "necklace" | "money"; hand?: "L" | "R" | "both"; off?: Vec3; rot?: Vec3; s?: number };
type Tok = { p: BeanParams; at: [number, number, number]; h?: number; flip?: boolean; toCam?: number; item?: Item }; // toCam: geser kartu ke arah kamera (m), mis. agar duduk DI DEPAN sandaran/dudukan kursi
type View = { judul: string; lat: Lat; cam: [number, number, number]; look: [number, number, number]; fov: number; roll?: number; preset: keyof typeof LIGHT_PRESETS; pts?: [number, number, number, number][]; tok: Tok[]; fg?: "bars" | "post" | "edge"; fgSide?: 1 | -1; interior?: boolean;
  gaya?: CineLook; shafts?: { a: [number, number, number]; b: [number, number, number]; r0?: number; r1?: number; col?: string; s?: number }[]; dust?: { c: [number, number, number]; sz: [number, number, number] };
  props?: { kind: "drawer" | "money" | "sack"; at: [number, number, number]; rot?: Vec3; s?: number }[] };
const LUAR: CineLook = { exposure: 1.1, env: 0.6, ao: 2.5, aoRadius: 1.6, bloom: 0.45 };
const DALAM: CineLook = { exposure: 1.0, env: 0.65, ao: 3.2, aoRadius: 0.9, bloom: 0.55 };
const MALAM: CineLook = { exposure: 0.62, env: 0, ao: 2.5, aoRadius: 0.9, bloom: 1.0 };

const FZ = 4.6;
// kekuatan peta cahaya pantul hasil bake per latar
const LM_I: Record<Lat, number> = { L1: 1.6, L2: 1.8, L3: 1.4, L4: 1.6, L5: 1.8, L6: 1.8 };
const VIEWS: View[] = [
  { judul: "L1 · Jalan Nice + bank (siang)", lat: "L1", cam: [-7.5, -10.5, 1.6], look: [0.5, 9, 4.8], fov: 52, roll: -3, preset: "siang", fg: "post", fgSide: -1,
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER, expr: "talk", mouthOpen: 0.5, turn: 0.5, armR: [40, -80] }, at: [-2.2, -2.6, 0] }, { p: { ...MIMI, ...poseWalkSide(10), expr: "think" }, at: [-4.0, -1.2, 0] }, { p: { ...MANAJER, expr: "neutral", turn: -0.4 }, at: [1.2, 7.4, 0.26] }] },
  { judul: "L1 · Malam: tutup got dibuka", lat: "L1", cam: [-0.2, -5.6, 0.6], look: [-2.9, -1.6, 0.8], fov: 50, roll: 4, preset: "malam",
    pts: [[-5, 6.7, 4.3, 14], [5, 6.7, 4.3, 14], [-3.2, -1.8, 0.5, 6]],
    gaya: MALAM,
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseCrouch(true), expr: "smug", armL: [40, -20], armR: [55, -30] }, at: [-2.2, -1.75, 0], flip: true, item: { kind: "cover", hand: "both", rot: [1.45, 1.15, 0], off: [0, 0.02, 0], s: 0.78 } }, { p: { ...MIMI_GOT, expr: "disgust", turn: -0.5, armR: [50, -60] }, at: [-4.0, -0.9, 0], item: { kind: "lantern" } }] },
  { judul: "L2 · Studio foto (akrab)", lat: "L2", cam: [2.3, -2.6, 1.6], look: [-0.1, 1.8, 1.2], fov: 50, roll: -2, preset: "akrab", interior: true, fg: "edge",
    pts: [[1.2, 2.0, 1.25, 10], [0.2, 0.8, 2.3, 10]],
    gaya: DALAM, shafts: [{ a: [-3.5, 0.2, 1.9], b: [-1.2, 0.9, 0], r0: 0.55, r1: 1.0, s: 0.2 }], dust: { c: [-2.2, 0.5, 1.2], sz: [2.2, 2.4, 1.8] },
    tok: [{ p: { ...FOTOGRAFER, ...poseSit(), expr: "smug", armR: [70, -50] }, at: [0.2, 1.2, 0], toCam: 0.3 }, { p: { ...MIMI, expr: "shock", sweat: true, turn: 0.5 }, at: [-0.55, 0.1, 0] }] },
  { judul: "L3 · Got (malam, lentera)", lat: "L3", cam: [0.5, -4.6, 1.4], look: [-0.1, 10, 0.9], fov: 50, roll: 3, preset: "malam", interior: true,
    pts: [[1.3, 1.6, 1.3, 14], [-1.4, 2, 2.5, 6], [-1.4, 8, 2.5, 6], [-1.4, 14, 2.5, 6], [0.9, 0, 4, 12]],
    gaya: MALAM, shafts: [{ a: [0.9, 0, 6.2], b: [0.9, 0, -0.4], r0: 0.38, r1: 0.75, col: "#e8f0ff", s: 0.16 }], dust: { c: [0.9, 0, 2.2], sz: [1.4, 4.0, 1.4] },
    tok: [{ p: { ...MIMI_GOT, ...beanWalk(0.2), back: true, hair: "#4a2a1a", armR: [50, -60] }, at: [1.3, 2.4, 0], item: { kind: "lantern" } }, { p: { ...FOTOGRAFER_GALI, ...beanWalk(0.7), back: true, hair: "#2a1c14" }, at: [1.25, 6.0, 0] }] },
  { judul: "L4 · Penampang: jalan → got → terowongan", lat: "L4", cam: [-4.6, -19.5, -1.6], look: [-4.6, 0, -2.6], fov: 46, preset: "siang",
    pts: [[-8, -1.3, -4.6, 6], [-3.5, -1.2, -4.5, 5], [0, -1.2, -4.5, 5]],
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseCrawl(4), expr: "neutral" }, at: [-1.6, -1.88, -5.42], h: 1.9, item: { kind: "shovel", hand: "L", rot: [0, 0, 1.45], s: 0.8 } }, { p: { ...MIMI_GOT, ...poseCrawl(12), expr: "worried", sweat: true }, at: [-4.3, -1.88, -5.42], h: 1.9, flip: true },
      { p: { ...KOMPLOTAN, ...poseCrouch(true), expr: "neutral", armR: [40, -20] }, at: [-7.4, -1.3, -5.42], h: 1.9, item: { kind: "bucket" } }, { p: { ...POLISI, ...poseWalkSide(6), expr: "neutral" }, at: [-10.5, -1.4, 0.24], h: 1.9 }] },
  { judul: "L4 · Penampang: terowongan → brankas", lat: "L4", cam: [4.8, -19.5, -1.6], look: [4.8, 0, -2.6], fov: 46, preset: "siang",
    pts: [[7.4, -1.2, -3.2, 8], [1.5, -1.2, -4.5, 5]],
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseKneel(), expr: "laugh", mouthOpen: 0.6, armL: [-150, 0], armR: [150, 0] }, at: [6.4, -1.0, -5.66], h: 1.9, item: { kind: "necklace", hand: "R" } }, { p: { ...MIMI_GOT, expr: "shock", sweat: true, turn: -0.4 }, at: [8.4, -1.2, -5.66], h: 1.9 }, { p: { ...KOMPLOTAN, ...poseCrawl(9), expr: "neutral" }, at: [1.4, -1.88, -5.42], h: 1.9 }] },
  { judul: "L5 · Brankas lebar", lat: "L5", cam: [3.0, -5.3, 2.7], look: [-0.2, 0.9, 0.7], fov: 62, roll: -3, preset: "tegang", interior: true, fg: "post", fgSide: 1,
    pts: [[-2.5, 0.5, 3.2, 12], [2.5, 0.5, 3.2, 12], [2.5, 0.9, 1.6, 10]],
    gaya: DALAM, shafts: [{ a: [2.5, 0.72, 1.66], b: [0.0, 4.0, 2.1], r0: 0.18, r1: 1.0, col: "#f4f4ff", s: 0.3 }], dust: { c: [1.2, 2.2, 1.9], sz: [2.6, 3.0, 2.0] },
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug", armL: [-100, -30], armR: [70, -60] }, at: [-1.7, -1.4, -0.95], item: { kind: "drill", rot: [0, 0, 0.3] } }, { p: { ...MIMI_GOT, ...poseCrouch(), expr: "shock", sweat: true, armR: [60, -80] }, at: [-1.6, 1.6, 0], item: { kind: "necklace" } }, { p: { ...KOMPLOTAN, ...poseWalkSide(5), expr: "neutral", armR: [10, -10] }, at: [1.3, -0.4, 0], flip: true, item: { kind: "sack" } }] },
  // ---- adegan 5b: mengambil uang (daftar gerakan) ----
  { judul: "5b-1 · Insert: laci dibuka, uang franc", lat: "L5", cam: [-3.55, -1.35, 1.55], look: [-4.6, -0.45, 1.05], fov: 38, roll: 4, preset: "tegang", interior: true,
    pts: [[-3.9, -0.8, 1.9, 6], [-2.5, 0.5, 3.2, 10]], gaya: { ...DALAM, dof: { focus: [-4.45, -0.45, 1.1], range: 0.8, blur: 4 } },
    props: [{ kind: "drawer", at: [-4.77, -0.45, 1.13], rot: [0, Math.PI / 2, 0] }],
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseCrouch(true), pitch: 10, expr: "smug", armL: [80, 10], armR: [100, -6] }, at: [-4.05, 0.3, 0], flip: true, item: { kind: "money", rot: [0.2, 0.4, 0] } }] },
  { judul: "5b-2 · Dodi melempar bundel ke Ara", lat: "L5", cam: [-1.3, -4.8, 1.5], look: [-2.95, -0.1, 1.0], fov: 54, roll: -3, preset: "tegang", interior: true,
    pts: [[-2.5, 0.5, 3.2, 12], [-3.9, -0.8, 1.9, 6]], gaya: DALAM, dust: { c: [-2.6, -0.2, 1.4], sz: [2, 2, 1.6] },
    props: [{ kind: "drawer", at: [-4.77, -0.45, 1.13], rot: [0, Math.PI / 2, 0] }, { kind: "money", at: [-2.8, -0.1, 1.75], rot: [0.6, 0.9, 0.3] }],
    tok: [{ p: { ...FOTOGRAFER_GALI, ...poseCrouch(true), expr: "laugh", mouthOpen: 0.6, armL: [60, 10], armR: [150, 20] }, at: [-3.75, -0.3, 0] }, { p: { ...MIMI_GOT, expr: "shock", sweat: true, turn: -0.4, armL: [-120, -30], armR: [120, 30] }, at: [-1.7, 0.4, 0], flip: true }] },
  { judul: "5b-3 · Ara menangkap & mengendus uang", lat: "L5", cam: [-0.9, -1.6, 1.55], look: [-1.75, 0.4, 1.35], fov: 40, roll: 3, preset: "tegang", interior: true,
    pts: [[-2.5, 0.5, 3.2, 12], [-1.2, -0.5, 1.8, 6]], gaya: { ...DALAM, dof: { focus: [-1.7, 0.4, 1.5], range: 1.0, blur: 3 } },
    props: [{ kind: "sack", at: [-1.15, 0.2, 0.42] }],
    tok: [{ p: { ...MIMI_GOT, expr: "happy", turn: -0.5, armL: [-30, -40], armR: [118, 92] }, at: [-1.75, 0.4, 0], item: { kind: "money", hand: "R", off: [0, 0.02, 0], rot: [0.2, 0.3, 0.9] } }] },
  { judul: "5b-4 · Karung penuh diseret ke lubang", lat: "L5", cam: [1.9, -4.6, 2.0], look: [-1.4, -0.9, 0.6], fov: 52, roll: -2, preset: "tegang", interior: true,
    pts: [[-2.5, 0.5, 3.2, 12], [2.5, 0.5, 3.2, 10], [-1.7, -1.4, 0.4, 5]], gaya: DALAM, dust: { c: [-1.0, -1.0, 1.2], sz: [2.4, 2, 1.6] },
    props: [{ kind: "sack", at: [-0.95, -1.2, 0.42], s: 1.1 }, { kind: "money", at: [-0.3, -1.6, 0.03], rot: [0, 0.6, 0] }, { kind: "money", at: [-0.55, -2.0, 0.03], rot: [0, 2.1, 0] }],
    tok: [{ p: { ...KOMPLOTAN, ...poseWalkSide(6, 1, 0.6), pitch: 22, expr: "angry", sweat: true, armL: [-40, -10], armR: [-50, -20] }, at: [-0.25, -1.05, 0] }, { p: { ...FOTOGRAFER_GALI, expr: "smug", armL: [-100, -30], armR: [100, 30] }, at: [-1.7, -1.4, -0.95] }] },
  { judul: "L5 · Sudut rendah: muncul dari lubang", lat: "L5", cam: [-0.3, -3.4, 0.3], look: [-1.8, -0.9, 1.0], fov: 44, roll: 5, preset: "tegang", interior: true,
    pts: [[-2.5, 0.5, 3.2, 12], [-1.7, -1.4, 0.4, 5]],
    gaya: { ...DALAM, dof: { focus: [-1.7, -1.4, 0.2], range: 1.6, blur: 3 } }, dust: { c: [-1.5, -0.6, 1.2], sz: [2, 2, 2] },
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug", armL: [-120, -10], armR: [110, -40] }, at: [-1.7, -1.4, -0.95], item: { kind: "drill", rot: [0, 0, 0.6] } }] },
  { judul: "L6 · Kantor hakim (lantai 2)", lat: "L6", cam: [3.9, 0.7, FZ + 1.6], look: [-0.1, 5.1, FZ + 1.0], fov: 50, roll: -2, preset: "siang", interior: true,
    pts: [[0.5, 4.1, FZ + 2.7, 8]],
    gaya: DALAM, shafts: [{ a: [-1.8, 0.2, FZ + 1.7], b: [-0.2, 3.4, FZ], r0: 0.7, r1: 1.3, s: 0.2 }], dust: { c: [-1.0, 1.8, FZ + 1.0], sz: [2, 2.6, 1.8] },
    tok: [{ p: { ...HAKIM, ...poseSit(), expr: "think", prop: "paper", armR: [40, -60] }, at: [0.8, 6.0, FZ], toCam: 0.25 }, { p: { ...FOTOGRAFER, ...poseSit(true), expr: "smug", armL: [60, -40], armR: [64, -44] }, at: [0.3, 3.5, FZ], toCam: 0.28, flip: true, item: { kind: "cuffs", hand: "both" } }, { p: { ...POLISI, expr: "neutral", turn: 0.4 }, at: [-1.6, 4.2, FZ] }] },
  { judul: "L6 · Luar: jendela → atap mobil → motor", lat: "L6", cam: [1.6, -8.6, 1.4], look: [-0.9, -1.2, 2.9], fov: 52, roll: 4, preset: "siang",
    gaya: LUAR,
    tok: [{ p: { ...FOTOGRAFER, ...poseJump(), expr: "shock", sweat: true }, at: [-1.6, -2.3, 2.2], h: 1.9 }, { p: { ...KOMPLOTAN, ...poseSit(true), expr: "smug", armR: [80, -20] }, at: [3.3, -4.8, 0.5], h: 1.9 }] },
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
        lightmaps={lama ? undefined : [{ prefix: NODE[v.lat], url: `models/terowongan_lm_${v.lat}.png`, intensity: LM_I[v.lat] }]} hemiScale={lama ? 1 : 0.55}
        look={lama || !v.gaya ? undefined : { ...v.gaya, dof: v.gaya.dof ? { ...v.gaya.dof, focus: bl(v.gaya.dof.focus[0], v.gaya.dof.focus[1], v.gaya.dof.focus[2], ox) } : undefined }}>
        {v.tok.map((t, i) => {
          const dx = v.cam[0] - t.at[0];
          const dy = v.cam[1] - t.at[1];
          const L = Math.hypot(dx, dy) || 1;
          const k = (t.toCam ?? 0) / L;
          const pos = bl(t.at[0] + dx * k, t.at[1] + dy * k, t.at[2], ox);
          const it = t.item;
          const obj = it && ({ lantern: <Lantern />, drill: <Drill />, sack: <Sack />, cover: <ManholeCover />, bucket: <Bucket />, shovel: <Shovel />, brush: <Brush />, cuffs: <Handcuffs />, necklace: <Necklace />, money: <MoneyBundle /> } as Record<string, React.ReactNode>)[it.kind];
          return (
            <React.Fragment key={i}>
              <BeanCard position={pos} height={t.h ?? 1.9} params={t.p} flip={t.flip} {...card} />
              {it && (
                <InHand p={t.p} position={pos} height={t.h ?? 1.9} cam={cam.pos} flip={t.flip} hand={it.hand ?? "R"} off={it.off} rot={it.rot}>
                  <group scale={(it.s ?? 1) * ((t.h ?? 1.9) / 1.9)}>{obj}</group>
                </InHand>
              )}
            </React.Fragment>
          );
        })}
        {v.props?.map((q, i) => {
          const obj = q.kind === "drawer" ? <OpenDrawer /> : q.kind === "money" ? <MoneyBundle /> : <Sack />;
          return (
            <group key={`pr${i}`} position={bl(q.at[0], q.at[1], q.at[2], ox)} rotation={q.rot ?? [0, 0, 0]} scale={q.s ?? 1}>
              {obj}
            </group>
          );
        })}
        {!lama && v.shafts?.map((q, i) => <LightShaft key={i} from={bl(q.a[0], q.a[1], q.a[2], ox)} to={bl(q.b[0], q.b[1], q.b[2], ox)} r0={q.r0} r1={q.r1} color={q.col} strength={q.s} />)}
        {!lama && v.dust && <Dust center={bl(v.dust.c[0], v.dust.c[1], v.dust.c[2], ox)} size={[v.dust.sz[0], v.dust.sz[2], v.dust.sz[1]]} frame={f} />}
        {v.fg && <Foreground cam={cam} kind={v.fg} side={v.fgSide ?? 1} color="#1a1a22" />}
      </CineStage>
      <CineGrade preset={v.preset} />
      <Watermark />
      <div style={{ position: "absolute", top: 40, left: 40, right: 40, fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 40, color: "#fff", textShadow: "0 3px 8px #000" }}>
        {(f % VIEWS.length) + 1}. {v.judul}{lama ? " (lama)" : ""}
      </div>
    </AbsoluteFill>
  );
};

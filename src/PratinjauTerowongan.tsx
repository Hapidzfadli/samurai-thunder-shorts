/** Pratinjau latar Blender "Terowongan ke Brankas": satu frame = satu shot (still-check, bukan video). */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { CineGrade, CineStage, Foreground, LIGHT_PRESETS, PL, cineCard, Cam } from "./cinemaKit";
import { FOTOGRAFER, FOTOGRAFER_GALI, MIMI, MIMI_GOT, MANAJER, POLISI, HAKIM, KOMPLOTAN } from "./SheetTerowongan";

const OX = { L1: 0, L2: 400, L3: 800, L4: 1200, L5: 1600, L6: 2000 } as const;
type Lat = keyof typeof OX;
const NODE: Record<Lat, string> = { L1: "L1_Jalan", L2: "L2_Studio", L3: "L3_Got", L4: "L4_Penampang", L5: "L5_Brankas", L6: "L6_Hakim" };
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];

type Tok = { p: BeanParams; at: [number, number, number]; h?: number; flip?: boolean };
type View = { judul: string; lat: Lat; cam: [number, number, number]; look: [number, number, number]; fov: number; roll?: number; preset: keyof typeof LIGHT_PRESETS; pts?: [number, number, number, number][]; tok: Tok[]; fg?: "bars" | "post" | "edge"; fgSide?: 1 | -1; interior?: boolean };

const FZ = 4.6;
const VIEWS: View[] = [
  { judul: "L1 · Jalan Nice + bank (siang)", lat: "L1", cam: [-7.5, -10.5, 1.6], look: [0.5, 9, 4.8], fov: 52, roll: -3, preset: "siang", fg: "post", fgSide: -1,
    tok: [{ p: { ...FOTOGRAFER, expr: "smug", armR: [40, -80] }, at: [-2.2, -2.6, 0] }, { p: { ...MIMI, expr: "think" }, at: [-4.0, -1.2, 0] }, { p: { ...MANAJER, expr: "neutral" }, at: [1.2, 7.4, 0.26] }] },
  { judul: "L1 · Malam: tutup got dibuka", lat: "L1", cam: [-0.2, -5.6, 0.55], look: [-3.0, -1.8, 0.8], fov: 46, roll: 4, preset: "malam",
    pts: [[-5, 6.7, 4.3, 14], [5, 6.7, 4.3, 14], [-3.2, -1.8, 0.5, 6]],
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug", armL: [-60, -40], armR: [60, -40] }, at: [-2.3, -1.2, 0] }, { p: { ...MIMI_GOT, expr: "disgust", prop: "torch", armR: [40, -70] }, at: [-4.2, -0.6, 0] }] },
  { judul: "L2 · Studio foto (akrab)", lat: "L2", cam: [2.3, -2.6, 1.6], look: [-0.1, 1.8, 1.2], fov: 50, roll: -2, preset: "akrab", interior: true, fg: "edge",
    pts: [[1.2, 2.0, 1.25, 10], [0.2, 0.8, 2.3, 10]],
    tok: [{ p: { ...FOTOGRAFER, expr: "smug", armR: [80, -40] }, at: [0.9, 1.35, 0] }, { p: { ...MIMI, expr: "shock", sweat: true }, at: [-0.5, 1.0, 0] }] },
  { judul: "L3 · Got (malam, lentera)", lat: "L3", cam: [0.5, -4.6, 1.4], look: [-0.1, 10, 0.9], fov: 50, roll: 3, preset: "malam", interior: true,
    pts: [[1.3, 1.6, 1.3, 14], [-1.4, 2, 2.5, 6], [-1.4, 8, 2.5, 6], [-1.4, 14, 2.5, 6], [0.9, 0, 4, 12]],
    tok: [{ p: { ...MIMI_GOT, back: true, hair: "#4a2a1a", prop: "torch", armR: [40, -70] }, at: [1.3, 2.4, 0] }, { p: { ...FOTOGRAFER_GALI, expr: "think" }, at: [1.25, 6.0, 0] }] },
  { judul: "L4 · Penampang: jalan → got → terowongan", lat: "L4", cam: [-5.0, -19.5, -1.6], look: [-5.0, 0, -2.6], fov: 46, preset: "siang",
    pts: [[-8, -1.3, -4.6, 6], [-3.5, -1.2, -4.5, 5], [0, -1.2, -4.5, 5]],
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "think", armL: [-90, -20], armR: [90, -20] }, at: [-1.2, -1.3, -5.42], h: 0.95 }, { p: { ...MIMI_GOT, expr: "worried", prop: "bucket" }, at: [-4.3, -1.3, -5.42], h: 0.9 },
      { p: { ...KOMPLOTAN, expr: "neutral" }, at: [-7.6, -1.3, -5.4], h: 1.0 }, { p: { ...POLISI, expr: "neutral" }, at: [-10.5, -1.4, 0.24], h: 1.9 }] },
  { judul: "L4 · Penampang: terowongan → brankas", lat: "L4", cam: [4.8, -19.5, -1.6], look: [4.8, 0, -2.6], fov: 46, preset: "siang",
    pts: [[7.4, -1.2, -3.2, 8], [1.5, -1.2, -4.5, 5]],
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug" }, at: [6.2, -1.2, -5.68], h: 1.6 }, { p: { ...MIMI_GOT, expr: "shock", sweat: true }, at: [8.0, -1.2, -5.68], h: 1.5 }, { p: { ...FOTOGRAFER_GALI, expr: "think" }, at: [1.2, -1.3, -5.42], h: 0.95 }] },
  { judul: "L5 · Brankas lebar", lat: "L5", cam: [2.4, -4.4, 1.9], look: [-0.6, 2.8, 1.3], fov: 56, roll: -3, preset: "tegang", interior: true, fg: "post", fgSide: 1,
    pts: [[-2.5, 0.5, 3.2, 12], [2.5, 0.5, 3.2, 12], [2.5, 0.9, 1.6, 10]],
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug" }, at: [-1.7, -1.4, -0.75] }, { p: { ...MIMI_GOT, expr: "shock", sweat: true }, at: [-1.0, 1.2, 0] }, { p: { ...KOMPLOTAN, expr: "neutral", prop: "sack" }, at: [2.9, 1.8, 0] }] },
  { judul: "L5 · Sudut rendah: muncul dari lubang", lat: "L5", cam: [-0.3, -3.4, 0.3], look: [-1.8, -0.9, 1.0], fov: 44, roll: 5, preset: "tegang", interior: true,
    pts: [[-2.5, 0.5, 3.2, 12], [-1.7, -1.4, 0.4, 5]],
    tok: [{ p: { ...FOTOGRAFER_GALI, expr: "smug", armL: [-120, -10], armR: [120, -10] }, at: [-1.7, -1.4, -0.95] }] },
  { judul: "L6 · Kantor hakim (lantai 2)", lat: "L6", cam: [3.5, 1.0, FZ + 1.6], look: [-0.1, 5.2, FZ + 1.1], fov: 50, roll: -2, preset: "siang", interior: true,
    pts: [[0.5, 4.1, FZ + 2.7, 8]],
    tok: [{ p: { ...HAKIM, expr: "think", prop: "paper", armR: [40, -60] }, at: [0.8, 5.95, FZ] }, { p: { ...FOTOGRAFER, expr: "smug" }, at: [0.9, 3.0, FZ] }, { p: { ...POLISI, expr: "neutral" }, at: [-1.6, 4.2, FZ] }] },
  { judul: "L6 · Luar: jendela → atap mobil → motor", lat: "L6", cam: [3.4, -11.5, 1.0], look: [-0.2, 0, 4.0], fov: 56, roll: 4, preset: "siang",
    tok: [{ p: { ...FOTOGRAFER, expr: "shock", armL: [-150, -10], armR: [150, -10] }, at: [-1.8, -0.1, FZ + 0.5], h: 1.9 }, { p: { ...KOMPLOTAN, expr: "smug" }, at: [2.8, -4.2, 0] }] },
];
export const TOTAL_FRAMES_PRATINJAU_T = VIEWS.length;

export const PratinjauTerowongan: React.FC = () => {
  const f = useCurrentFrame();
  const v = VIEWS[Math.min(f, VIEWS.length - 1)];
  const ox = OX[v.lat];
  const cam: Cam = { pos: bl(v.cam[0], v.cam[1], v.cam[2], ox), look: bl(v.look[0], v.look[1], v.look[2], ox), fov: v.fov, roll: v.roll ?? 0 };
  const P = LIGHT_PRESETS[v.preset];
  const card = cineCard(cam, P);
  const pts: PL[] = (v.pts ?? []).map(([x, y, z, i]) => ({ p: bl(x, y, z, ox), i }));
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/terowongan.glb" visible={(n) => n.startsWith(NODE[v.lat]) || n.startsWith("Langit")} focus={bl(v.look[0], v.look[1], 0, ox)} preset={v.preset} pts={pts} interior={v.interior}>
        {v.tok.map((t, i) => (
          <BeanCard key={i} position={bl(t.at[0], t.at[1], t.at[2], ox)} height={t.h ?? 1.9} params={t.p} flip={t.flip} {...card} />
        ))}
        {v.fg && <Foreground cam={cam} kind={v.fg} side={v.fgSide ?? 1} color="#1a1a22" />}
      </CineStage>
      <CineGrade preset={v.preset} />
      <div style={{ position: "absolute", top: 40, left: 40, right: 40, fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 40, color: "#fff", textShadow: "0 3px 8px #000" }}>
        {f + 1}. {v.judul}
      </div>
    </AbsoluteFill>
  );
};

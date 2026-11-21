import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import * as K from "./three/objectsMolaseProps";
import { Building, Tank } from "./three/objectsMolase";

type Item = { name: string; note: string; el: React.ReactNode; w: number; h: number; span?: number };
const W = 2000;
const PX = 125;
const ROW_U = 3.9; // vertical units per row (prop + label)
const TOP_U = 2.0; // title area in units

const sheetHeight = (items: Item[], cols: number) => {
  let col = 0;
  let rows = 1;
  for (const it of items) {
    const sp = it.span ?? 1;
    if (col + sp > cols) {
      rows++;
      col = 0;
    }
    col += sp;
  }
  return Math.round((TOP_U + rows * ROW_U) * PX) + 20;
};

const Sheet: React.FC<{ title: string; sub: string; items: Item[]; bg: [string, string]; cols?: number }> = ({ title, sub, items, bg, cols = Math.ceil(items.length / 2) }) => {
  const H = sheetHeight(items, cols);
  const UH = H / PX;
  const fov = (2 * Math.atan(UH / 2 / 40) * 180) / Math.PI;
  const cw = W / cols;
  const cwU = cw / PX;
  // slot layout
  let col = 0;
  let row = 0;
  const slots = items.map((it) => {
    const sp = it.span ?? 1;
    if (col + sp > cols) {
      row++;
      col = 0;
    }
    const c0 = col;
    col += sp;
    const cx = (c0 + sp / 2) * cw;
    const base = UH / 2 - TOP_U - 2.6 - row * ROW_U;
    return { cx, row, base, sp, labelTop: (UH / 2 - base) * PX + 14 };
  });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${bg[0]}, ${bg[1]})` }}>
      <ThreeCanvas width={W} height={H} shadows camera={{ fov, near: 1, far: 200, position: [0, 0, 40] }}>
        <CameraRig position={[0, 0, 40]} lookAt={[0, 0, 0]} fov={fov} />
        {items.map((it, i) => {
          const sl = slots[i];
          const s = Math.min(2.6 / it.h, (cwU * sl.sp * 0.9) / it.w, 1.9);
          return (
            <group key={it.name} position={[sl.cx / PX - W / PX / 2, sl.base, 0]} scale={s} rotation={[0.12, -0.55, 0]}>
              {it.el}
            </group>
          );
        })}
        <hemisphereLight args={["#ffffff", "#bba8c8", 1.6]} />
        <directionalLight position={[-6, 10, 14]} intensity={2.2} color="#fff0d8" />
        <directionalLight position={[4, 3, 14]} intensity={0.8} color="#cfe0ff" />
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 58, color: "#2a1a38", letterSpacing: 2 }}>{title}</div>
      <div style={{ position: "absolute", top: 98, left: 42, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 24, color: "#5a4a6a" }}>{sub}</div>
      {items.map((it, i) => {
        const sl = slots[i];
        return (
          <div key={it.name} style={{ position: "absolute", left: sl.cx - (cw * sl.sp) / 2 + 8, width: cw * sl.sp - 16, top: sl.labelTop, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontWeight: 800, fontSize: 25, color: "#2a1a38" }}>{it.name}</div>
            <div style={{ fontWeight: 600, fontSize: 17, color: "#5a4a6a", lineHeight: 1.2, marginTop: 2 }}>{it.note}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const SheetPropsLuar: React.FC = () => (
  <Sheet
    title="PROPERTI · LUAR RUANG · COMMERCIAL ST, BOSTON 1919"
    sub="Riset: tangki di tepi air, rel layang (El) Atlantic Ave, pemadam Engine 31, pelabuhan, kereta kuda, trem"
    bg={["#ffe9cf", "#f5c9d4"]}
    cols={8}
    items={[
      { name: "Lampu gas", note: "tiang besi + lentera", el: <K.GasLamp lit />, w: 0.8, h: 4.3 },
      { name: "Hidran", note: "pemadam kebakaran", el: <K.Hydrant />, w: 0.6, h: 1.1 },
      { span: 2, name: "Kereta kuda", note: "bak kayu, roda, tong, kuda", el: <K.Wagon withHorse t={0} />, w: 6, h: 2.5 },
      { name: "Rel layang (El)", note: "pilar besi + gerbong", el: <K.ElevatedRail len={7} />, w: 7, h: 9 },
      { span: 2, name: "Pemadam Engine 31", note: "pintu lengkung + menara", el: <K.Firehouse />, w: 7.5, h: 10 },
      { span: 2, name: "Gudang molase", note: "pintu muat + katrol", el: <K.Warehouse />, w: 8.4, h: 6.5 },
      { name: "Rumah susun", note: "tangga darurat, jemuran, tiang barber", el: <K.Tenement />, w: 5.9, h: 9.4 },
      { span: 2, name: "Trem", note: "gerbong hijau + tiang listrik", el: <K.Streetcar />, w: 5.2, h: 3.6 },
      { span: 2, name: "Kapal uap", note: "cerobong + asap + tiang", el: <K.Steamer />, w: 12, h: 7 },
      { name: "Derek pelabuhan", note: "lengan merah + peti", el: <K.Crane />, w: 4, h: 5 },
      { span: 2, name: "Dermaga", note: "papan kayu + tiang pancang", el: <K.Pier len={5} />, w: 5, h: 1.2 },
      { name: "Tumpukan tong", note: "tong kayu + gelang besi", el: <K.BarrelStack />, w: 2.3, h: 2 },
      { name: "Peti & karung", note: "peti kayu, karung goni", el: <group><K.CrateStack /><K.Sacks pos={[1.8, 0, 0]} /></group>, w: 3.2, h: 1.7 },
      { name: "Kios koran", note: "atap merah + koran", el: <K.NewsStand />, w: 2, h: 2.2 },
      { span: 2, name: "Bangku, kotak pos, sepeda", note: "perabot jalan", el: <group><K.Bench /><K.Mailbox pos={[1.7, 0, 0]} /><K.Bicycle pos={[3.2, 0, 0]} /></group>, w: 4.6, h: 1.8 },
      { name: "Pagar besi & bolder", note: "tepi dermaga", el: <group><K.IronFence len={2.4} /><K.Bollard pos={[1.9, 0, 0]} /></group>, w: 3.2, h: 1.2 },
    ]}
  />
);
export const SheetPropsTangki: React.FC = () => (
  <Sheet
    title="PROPERTI · LOKASI TANGKI · 529 COMMERCIAL ST"
    sub="Riset: tangki baja ±15 m di tepi air; warga melihat rembesan; tangki dicat cokelat untuk menyamarkannya"
    bg={["#e0ecff", "#ffe2c8"]}
    cols={4}
    items={[
      { name: "Tangki (karatan)", note: "sebelum dicat, rembesan hitam", el: <Tank pos={[0, 0, 0]} r={1.9} h={4.4} leak={1} t={0.3} />, w: 4.2, h: 5.4 },
      { name: "Tangki (dicat cokelat)", note: "cat menutupi rembesan", el: <Tank pos={[0, 0, 0]} r={1.9} h={4.4} leak={0.5} paint={1} />, w: 4.2, h: 5.4 },
      { name: "Tangki (pecah)", note: "retak melebar + keling terlepas", el: <Tank pos={[0, 0, 0]} r={1.9} h={4.4} leak={0} paint={1} burst={1} />, w: 4.2, h: 5.4 },
      { name: "Lahan tangki", note: "pelat beton, tangga, pipa, katup, gubuk", el: <K.TankSite r={1.9} />, w: 10, h: 2.4 },
      { name: "Papan nama", note: "PURITY DISTILLING", el: <K.Sign pos={[0, 0.5, 0]} w={3} h={0.9} text="PURITY DISTILLING" bg="#e8dcb8" fg="#3a1c0a" />, w: 3.2, h: 1.2 },
      { name: "Salju meleleh", note: "bercak salju di jalan", el: <group><K.SnowPatch /><K.SnowPatch pos={[2.2, 0, 0.3]} s={0.8} /></group>, w: 4, h: 0.5 },
      { name: "Gedung bata", note: "fasad bata + jendela menyala", el: <Building pos={[0, 0, 0]} w={5} h={7} d={3} base="#b5573f" seed={4} cols={3} rows={4} lit={0.4} shop />, w: 5.6, h: 8.5 },
      { name: "Gedung bata (krem)", note: "variasi warna", el: <Building pos={[0, 0, 0]} w={5} h={6} d={3} base="#c9a066" seed={7} cols={3} rows={3} lit={0.3} />, w: 5.6, h: 7.5 },
    ]}
  />
);
export const SheetPropsDapur: React.FC = () => (
  <Sheet
    title="PROPERTI · DALAM RUANGAN · DAPUR (PENJELASAN MADU)"
    sub="Analogi modern: madu di kulkas (dingin, lambat) vs di dapur hangat (deras)"
    bg={["#fff2d8", "#e8d8f0"]}
    cols={5}
    items={[
      { name: "Kulkas (tertutup)", note: "pintu + gagang", el: <K.Fridge />, w: 1.6, h: 2.8 },
      { name: "Kulkas (terbuka)", note: "rak dalam, lampu dingin", el: <K.Fridge open={1} />, w: 2.8, h: 2.8 },
      { name: "Kompor", note: "tungku menyala + teko", el: <K.Stove hot />, w: 1.7, h: 1.7 },
      { name: "Meja & kursi", note: "meja kayu, 2 kursi", el: <group><K.KitchenTable /><K.Chair pos={[-0.7, 0, 1.0]} rot={Math.PI} /><K.Chair pos={[0.7, 0, 1.0]} rot={Math.PI} /></group>, w: 2.4, h: 1.9 },
      { name: "Jendela + tirai", note: "cahaya pagi", el: <K.Window pos={[0, 1.0, 0]} />, w: 3, h: 2.2 },
      { name: "Lemari dapur", note: "rak atas + laci bawah", el: <K.Cabinet />, w: 2.1, h: 2.8 },
      { name: "Rak toples madu", note: "madu, selai, acar", el: <K.JarShelf pos={[0, 0.5, 0]} />, w: 2.2, h: 0.9 },
      { name: "Jam, tanaman, panci", note: "dekorasi dinding & lantai", el: <group><K.WallClock pos={[0, 1.8, 0]} /><K.Plant pos={[0.9, 0, 0]} /><K.Pot pos={[-0.7, 0, 0]} /></group>, w: 2.2, h: 2.3 },
      { name: "Karpet", note: "karpet merah motif", el: <K.Rug w={2.4} d={1.6} />, w: 2.4, h: 0.4 },
    ]}
  />
);
export const SheetPropsSidang: React.FC = () => (
  <Sheet
    title="PROPERTI · DALAM RUANGAN · RUANG SIDANG"
    sub="Catatan: detail interior pengadilan 1920-an tidak terverifikasi di sumber, jadi memakai unsur ruang sidang AS yang umum"
    bg={["#f4e0c8", "#d8c0b0"]}
    cols={6}
    items={[
      { name: "Meja hakim", note: "mimbar tinggi + lambang", el: <K.JudgeBench />, w: 4.6, h: 3.6 },
      { name: "Kursi saksi", note: "bilik saksi", el: <K.WitnessStand />, w: 1.8, h: 2.2 },
      { name: "Kotak juri", note: "2 baris kursi", el: <K.JuryBox />, w: 5.2, h: 1.8 },
      { name: "Bangku pengunjung", note: "3 baris bangku", el: <K.Pews rows={2} />, w: 5.2, h: 1.1 },
      { name: "Pagar sidang", note: "pembatas kayu berjeruji", el: <K.BarRail len={4} />, w: 4, h: 1.2 },
      { name: "Bendera", note: "bendera AS di tiang", el: <K.FlagStand />, w: 1.6, h: 3.6 },
      { name: "Timbangan keadilan", note: "patung emas", el: <K.Scales />, w: 1.3, h: 1.6 },
      { name: "Rak buku hukum", note: "buku tebal", el: <K.Bookshelf />, w: 2.2, h: 3.2 },
      { name: "Lampu gantung", note: "cincin emas + bohlam", el: <K.Chandelier />, w: 1.6, h: 1.3 },
      { name: "Meja pengacara", note: "berkas + map", el: <K.Lawyers />, w: 2.4, h: 1.2 },
      { name: "Jam & jendela", note: "jam dinding + jendela tinggi", el: <group><K.WallClock pos={[0, 2.6, 0]} r={0.4} /><K.Window pos={[0, 1.0, 0]} curtain="#8a1a1a" /></group>, w: 2.4, h: 3.2 },
      { name: "Meja panitera", note: "pencatat sidang", el: <K.Desk />, w: 2.0, h: 1.4 },
    ]}
  />
);
export const SheetPropsKantor: React.FC = () => (
  <Sheet
    title="PROPERTI · DALAM RUANGAN · KANTOR GAMBAR TEKNIK"
    sub="Aturan baru: insinyur menandatangani dan mengesahkan rancangan (riset: kewajiban tanda tangan dan stempel gambar)"
    bg={["#e8f0ff", "#f0e8d0"]}
    cols={5}
    items={[
      { name: "Meja gambar", note: "papan miring + cetak biru + penggaris", el: <K.DraftingTable />, w: 2.6, h: 2.2 },
      { name: "Bangku tinggi", note: "kursi gambar", el: <K.Stool />, w: 0.8, h: 1.0 },
      { name: "Rak gulungan cetak biru", note: "gulungan biru & putih", el: <K.BlueprintRack />, w: 1.9, h: 2.4 },
      { name: "Lemari arsip", note: "laci besi", el: <K.FilingCabinet />, w: 0.9, h: 1.8 },
      { name: "Meja kerja", note: "stempel, lampu meja, kertas", el: <K.Desk />, w: 2.1, h: 1.4 },
      { name: "Telepon", note: "telepon tiang klasik", el: <K.Telephone />, w: 0.4, h: 0.6 },
      { name: "Gantungan mantel", note: "topi & mantel", el: <K.CoatStand />, w: 0.8, h: 2.1 },
      { name: "Globe", note: "bola dunia", el: <K.Globe />, w: 0.8, h: 1.3 },
      { name: "Peta dinding", note: "peta kota", el: <K.WallMap pos={[0, 1.0, 0]} />, w: 2.4, h: 1.8 },
      { name: "Lampu gantung hijau", note: "kap hijau kantor", el: <K.PendantLamp pos={[0, 1.4, 0]} />, w: 0.9, h: 1.6 },
    ]}
  />
);

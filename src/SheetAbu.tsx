import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { Item, Sheet, sheetHeight } from "./SheetMolaseProps";
import * as A from "./three/objectsAbuProps";

export const ABU: BeanParams = { torso: "#7a9a6a", pants: "#4a3a2a", robe: "#7a9a6a", sash: "#c8a050", hat: "turban", hatColor: "#f4f0e4", beard: "#2a1a10", wide: 0.95, seed: 41 };
export const RAJA: BeanParams = { torso: "#5a2a8a", pants: "#3a1a5a", robe: "#5a2a8a", robeTrim: "#e0b040", sash: "#e0b040", hat: "crown", beard: "#3a2418", mustache: true, wide: 1.45, seed: 42 };
export const WAZIR: BeanParams = { torso: "#1a6a5a", pants: "#1a3a3a", robe: "#1a6a5a", robeTrim: "#c8a050", hat: "tallturban", hatColor: "#f4f0e4", beard: "#a8a8b0", wide: 1.05, seed: 43 };
export const PENGAWAL: BeanParams = { torso: "#8a2a2a", pants: "#3a2a2a", robe: "#8a2a2a", sash: "#3a3a44", hat: "guardhelmet", mustache: true, wide: 1.15, seed: 44 };
export const ISTRI: BeanParams = { torso: "#c0526a", pants: "#6a3a4a", robe: "#c0526a", hat: "bonnet", hatColor: "#e8d8b0", seed: 45 };
export const PEDAGANG: BeanParams = { torso: "#c8a060", pants: "#5a4a2a", robe: "#c8a060", sash: "#8a3a2a", hat: "turban", hatColor: "#c0392b", mustache: true, wide: 1.2, seed: 46 };

const labels: [string, string, string][] = [
  ["Abu Nawas", "Tokoh utama · cerdik", "Sorban putih, jubah hijau zaitun, jenggot. Senyum licik, ekspresi berubah cepat."],
  ["Raja Harun Ar-Rasyid", "Sang penantang", "Mahkota emas, jubah ungu bersulam emas, perut besar. Tawanya menggelegar."],
  ["Wazir", "Penasihat raja", "Sorban tinggi, jenggot abu-abu. Suka menyindir Abu Nawas."],
  ["Pengawal", "Penjaga istana", "Helm besi runcing, tombak. Wajah galak, tapi ikut menutup hidung."],
  ["Istri Abu Nawas", "Di rumah", "Kerudung krem, jubah merah muda. Khawatir suaminya dihukum."],
  ["Pedagang pasar", "Warga", "Sorban merah, jualan buah. Heran melihat Abu Nawas mengejar angin."],
];
export const SheetAbu: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#ffe9cf, #f2d0b0)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.9, 21] }}>
      <CameraRig position={[0, 1.9, 21]} lookAt={[0, 1.6, 0]} fov={22} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#e8d4b4" roughness={1} />
      </mesh>
      <BeanCard position={[-5.5, 0, 0]} height={3.0} params={{ ...ABU, expr: "smug", prop: "bottle", armR: [70, -60], look: 0.5 }} />
      <BeanCard position={[-3.3, 0, 0]} height={3.1} params={{ ...RAJA, expr: "happy", armL: [-60, -40], armR: [60, -40] }} />
      <BeanCard position={[-1.1, 0, 0]} height={3.0} params={{ ...WAZIR, expr: "smug", prop: "scroll", armR: [60, -50] }} />
      <BeanCard position={[1.1, 0, 0]} height={3.0} params={{ ...PENGAWAL, expr: "angry", prop: "spear", armR: [20, -10] }} />
      <BeanCard position={[3.3, 0, 0]} height={2.8} params={{ ...ISTRI, expr: "worried", armL: [-30, -60], armR: [30, -60] }} />
      <BeanCard position={[5.5, 0, 0]} height={2.9} params={{ ...PEDAGANG, expr: "shock", armR: [80, -30] }} />
      <hemisphereLight args={["#ffffff", "#bba8c8", 1.6]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.0} color="#fff0d8" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 56, color: "#2a1a38", letterSpacing: 2 }}>KARAKTER · "ABU NAWAS MENANGKAP ANGIN"</div>
    <div style={{ position: "absolute", bottom: 24, left: 20, right: 20, display: "flex", gap: 14 }}>
      {labels.map(([n, r, d]) => (
        <div key={n} style={{ width: 320, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#2a1a38" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#a8572a" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: "#5a4a6a", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

/* expression strip: the faces we'll use */
const EXPRS: [string, BeanParams][] = [
  ["Abu: licik", { ...ABU, expr: "smug" }],
  ["Abu: bingung", { ...ABU, expr: "worried", sweat: true }],
  ["Abu: kaget (dapat ide)", { ...ABU, expr: "shock" }],
  ["Abu: berpikir", { ...ABU, expr: "think", look: 1 }],
  ["Abu: tertawa lepas", { ...ABU, expr: "laugh", mouthOpen: 1 }],
  ["Raja: menantang", { ...RAJA, expr: "smug" }],
  ["Raja: marah", { ...RAJA, expr: "angry" }],
  ["Raja: mencium bau", { ...RAJA, expr: "disgust" }],
  ["Raja: terbahak", { ...RAJA, expr: "laugh", mouthOpen: 1 }],
];
export const SheetAbuExpr: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#fff2dc, #f2d8c0)" }}>
    <ThreeCanvas width={2000} height={900} camera={{ fov: 20, near: 0.5, far: 200, position: [0, 2.2, 22] }}>
      <CameraRig position={[0, 2.5, 18]} lookAt={[0, 2.5, 0]} fov={20} />
      {EXPRS.map(([, p], i) => <BeanCard key={i} position={[-6.4 + i * 1.6, 0.4, 0]} height={3.0} params={p} shadow={false} />)}
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#2a1a38" }}>EKSPRESI WAJAH</div>
    <div style={{ position: "absolute", bottom: 30, left: 30, right: 30, display: "flex" }}>
      {EXPRS.map(([n]) => <div key={n} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 22, color: "#2a1a38" }}>{n}</div>)}
    </div>
  </AbsoluteFill>
);

/* prop sheets */
const ISTANA: Item[] = [
  { span: 2, name: "Istana Baghdad", note: "kubah biru, ubin mosaik, gerbang lengkung", el: <A.PalaceExterior />, w: 14.4, h: 13 },
  { name: "Menara", note: "menara putih + kubah", el: <A.Minaret />, w: 1.8, h: 12.2 },
  { name: "Air mancur", note: "kolam segi delapan", el: <A.Fountain t={0.6} />, w: 3.3, h: 2.2 },
  { name: "Tembok kota", note: "bata lumpur bergerigi", el: <A.CityWall len={5} />, w: 5, h: 4 },
  { name: "Pohon kurma", note: "di halaman", el: <A.Palm3D position={[0, 0, 0]} />, w: 3.2, h: 4.2 },
  { name: "Unta", note: "di gerbang kota", el: <A.Camel />, w: 2.8, h: 2.8 },
  { name: "Gerbang lengkung", note: "lengkung runcing khas", el: <A.PointedArch w={2} h={3} />, w: 2.8, h: 3.4 },
];
const AULA: Item[] = [
  { name: "Singgasana", note: "emas + bantal merah", el: <A.Throne />, w: 3.2, h: 3.9 },
  { span: 2, name: "Barisan pilar", note: "pilar putih + lengkung", el: <A.Colonnade n={4} />, w: 7, h: 4.7 },
  { name: "Karpet Persia", note: "merah-biru-emas", el: <A.Carpet w={2} d={3} />, w: 3, h: 0.5 },
  { name: "Lampu gantung", note: "lentera menyala", el: <A.HangingLamp pos={[0, 0.6, 0]} />, w: 0.8, h: 2.4 },
  { name: "Pedupaan", note: "asap dupa", el: <A.Brazier t={0.4} />, w: 0.9, h: 2.4 },
  { name: "Bantal duduk", note: "bantal sulam", el: <group><A.Cushion /><A.Cushion pos={[1.1, 0, 0]} color="#7a1f3a" /></group>, w: 2.1, h: 0.5 },
  { name: "Tirai", note: "tirai beludru", el: <A.Drapes />, w: 3, h: 5.3 },
  { name: "Jendela kisi", note: "kisi-kisi kayu", el: <A.LatticeWindow />, w: 2.2, h: 2.8 },
];
const RUMAH: Item[] = [
  { span: 2, name: "Rumah Abu Nawas", note: "rumah bata lumpur, atap datar", el: <A.MudHouse />, w: 5.3, h: 3.6 },
  { name: "Tikar", note: "tikar anyaman", el: <A.Mat />, w: 2.4, h: 0.3 },
  { name: "Pelita", note: "lampu minyak", el: <A.OilLamp t={0.3} />, w: 0.6, h: 0.5 },
  { name: "Gentong", note: "tempayan tanah liat", el: <group><A.ClayJar /><A.ClayJar pos={[0.9, 0, 0]} s={0.7} color="#a85a2a" /></group>, w: 1.8, h: 1.2 },
  { name: "Meja rendah", note: "kurma + teh", el: <A.LowTable />, w: 1.5, h: 0.6 },
  { name: "Rak + botol", note: "botol-botol kosong", el: <A.Shelf pos={[0, 0.4, 0]} />, w: 1.9, h: 1.1 },
  { span: 2, name: "Lapak pasar", note: "buah, rempah, kain", el: <group><A.MarketStall pos={[-1.5, 0, 0]} /><A.MarketStall pos={[1.5, 0, 0]} goods="spice" awning="#2a6ab0" /></group>, w: 5.8, h: 3.5 },
  { name: "Keranjang", note: "keranjang anyaman", el: <A.Basket />, w: 0.9, h: 0.8 },
];
const CERITA: Item[] = [
  { name: "Botol bersumbat", note: "wadah 'angin'", el: <A.Bottle s={2} />, w: 0.7, h: 1.4 },
  { name: "Pusaran angin", note: "angin + daun berputar", el: <A.WindSwirl t={0.4} s={1.4} />, w: 3, h: 1.6 },
  { name: "Awan bau", note: "efek 'angin' keluar", el: <A.StinkCloud t={0.5} />, w: 1, h: 1.2 },
  { name: "Layang-layang", note: "percobaan menangkap angin", el: <A.Kite pos={[0, 1.6, 0]} />, w: 1.1, h: 2.4 },
  { name: "Karung / jaring / kipas", note: "dipegang Abu Nawas (gambar 2D)", el: <A.Basket />, w: 0.9, h: 0.8 },
];
export const H_ABU = { Istana: sheetHeight(ISTANA, 4), Aula: sheetHeight(AULA, 5), Rumah: sheetHeight(RUMAH, 5), Cerita: sheetHeight(CERITA, 5) };
export const SheetAbuIstana: React.FC = () => <Sheet title="PROPERTI · LUAR · ISTANA BAGHDAD" sub="Arsitektur khas Abbasiyah versi kartun: kubah, lengkung runcing, ubin mosaik, kurma, unta" items={ISTANA} cols={4} bg={["#dff0ff", "#ffe2c0"]} />;
export const SheetAbuAula: React.FC = () => <Sheet title="PROPERTI · DALAM · BALAI SINGGASANA" sub="Tempat Raja memberi tantangan dan tempat 'angin' dibuka" items={AULA} cols={5} bg={["#fff0d8", "#f0d0c0"]} />;
export const SheetAbuRumah: React.FC = () => <Sheet title="PROPERTI · RUMAH ABU NAWAS & PASAR" sub="Rumah sederhana tempat Abu Nawas berpikir, dan pasar tempat ia mengejar angin" items={RUMAH} cols={5} bg={["#fff2dc", "#f2dcc0"]} />;
export const SheetAbuCerita: React.FC = () => <Sheet title="PROPERTI · CERITA" sub="Benda kunci adegan menangkap angin" items={CERITA} cols={5} bg={["#e8f4ff", "#fff0dc"]} />;

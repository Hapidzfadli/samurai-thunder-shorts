import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanParams } from "./three/objectsBean";
import { Item, Sheet, sheetHeight } from "./SheetMolaseProps";
import { SkyDome } from "./three/objectsMolase";
import { Cloud3D } from "./three/objectsAncol3d";
import * as K from "./three/objectsKabayanProps";

export const KABAYAN: BeanParams = { torso: "#1c1c22", pants: "#1c1c22", pangsi: "#1c1c22", sleeves: "#1c1c22", hat: "iket", hatColor: "#7a3a1a", batik: "#e8c070", slung: "#2a5aa8", barefoot: true, wide: 0.92, seed: 71 };
export const ABAH: BeanParams = { torso: "#1c1c22", pants: "#1c1c22", pangsi: "#1c1c22", sleeves: "#1c1c22", hat: "iket", hatColor: "#3a2a1a", batik: "#c8a050", mustache: true, sideHair: "#c8c8cc", golok: true, barefoot: true, wide: 1.15, seed: 72 };
export const ITEUNG: BeanParams = { torso: "#f2b8c8", kebaya: "#f2b8c8", sleeves: "#f2b8c8", skirt: "#7a4a2a", batik: "#f2d8a0", hat: "sanggul", hair: "#1c1418", selendang: "#c0526a", barefoot: true, wide: 0.92, seed: 73 };
export const AMBU: BeanParams = { torso: "#e8e0c8", kebaya: "#e8e0c8", sleeves: "#e8e0c8", skirt: "#4a3a5a", batik: "#e0c890", hat: "sanggul", hair: "#5a5058", barefoot: true, wide: 1.2, seed: 74 };
export const PETANI: BeanParams = { torso: "#5a6a4a", pants: "#3a3a3a", pangsi: "#3a3a3a", sleeves: "#5a6a4a", hat: "caping", hatColor: "#e0c080", barefoot: true, wide: 1.0, seed: 75 };

const labels: [string, string, string][] = [
  ["Si Kabayan", "Tokoh utama · pemalas cerdik", "Iket batik, baju kampret & celana pangsi hitam, sarung diselempangkan, nyeker. Santai, senyum ngeles."],
  ["Abah", "Mertua laki-laki · galak", "Iket cokelat tua, pangsi hitam, kumis tebal, uban di pelipis, golok di pinggang."],
  ["Nyi Iteung", "Istri Kabayan", "Kebaya merah muda, sinjang batik cokelat, sanggul, selendang. Sayang tapi gemas."],
  ["Ambu", "Mertua perempuan", "Kebaya krem, sinjang batik ungu tua, sanggul beruban."],
  ["Mang Tani", "Petani tetangga", "Caping, baju hijau lusuh, saksi kejadian di sawah."],
];
export const SheetKabayan: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#e6f4ff, #f6ead0)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.9, 21] }}>
      <CameraRig position={[0, 1.9, 21]} lookAt={[0, 1.6, 0]} fov={22} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#c8d8a0" roughness={1} /></mesh>
      <BeanCard position={[-5.6, 0, 0]} height={3.0} params={{ ...KABAYAN, expr: "smug", armL: [-30, -100], armR: [40, -110], look: 0.4 }} />
      <BeanCard position={[-2.8, 0, 0]} height={3.1} params={{ ...ABAH, expr: "angry", armR: [100, -20] }} />
      <BeanCard position={[0, 0, 0]} height={2.9} params={{ ...ITEUNG, expr: "happy", armL: [-20, -60], armR: [20, -60] }} />
      <BeanCard position={[2.8, 0, 0]} height={2.9} params={{ ...AMBU, expr: "worried" }} />
      <BeanCard position={[5.6, 0, 0]} height={3.0} params={{ ...PETANI, expr: "neutral", armR: [30, -40] }} />
      <hemisphereLight args={["#ffffff", "#bba8c8", 1.6]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.0} color="#fff0d8" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 56, color: "#2a1a38", letterSpacing: 2 }}>KARAKTER · "SI KABAYAN NGALA TUTUT"</div>
    <div style={{ position: "absolute", bottom: 24, left: 20, right: 20, display: "flex", gap: 14 }}>
      {labels.map(([n, r, d]) => (
        <div key={n} style={{ width: 390, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 25, color: "#2a1a38" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#2a7a4a" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: "#5a4a6a", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const EXPRS: [string, BeanParams][] = [
  ["Kabayan: malas", { ...KABAYAN, expr: "sleepy" }],
  ["Kabayan: ngeles", { ...KABAYAN, expr: "smug", look: 1 }],
  ["Kabayan: takut", { ...KABAYAN, expr: "scared", sweat: true }],
  ["Kabayan: basah kuyup", { ...KABAYAN, expr: "sad", wet: 0.9, gooColor: "#6a5030", goo: 0.25 }],
  ["Kabayan: nyengir", { ...KABAYAN, expr: "laugh", mouthOpen: 0.4, wet: 0.9 }],
  ["Abah: marah", { ...ABAH, expr: "angry" }],
  ["Abah: melongo", { ...ABAH, expr: "shock" }],
  ["Abah: tepok jidat", { ...ABAH, expr: "worried", armR: [150, -175] }],
  ["Iteung: tertawa", { ...ITEUNG, expr: "laugh", mouthOpen: 1 }],
];
export const SheetKabayanExpr: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#f2f8ff, #f2e8d0)" }}>
    <ThreeCanvas width={2000} height={900} camera={{ fov: 20, near: 0.5, far: 200, position: [0, 2.5, 18] }}>
      <CameraRig position={[0, 2.5, 18]} lookAt={[0, 2.5, 0]} fov={20} />
      {EXPRS.map(([, p], i) => <BeanCard key={i} position={[-6.4 + i * 1.6, 0.4, 0]} height={3.0} params={p} shadow={false} />)}
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#2a1a38" }}>EKSPRESI WAJAH</div>
    <div style={{ position: "absolute", bottom: 30, left: 30, right: 30, display: "flex" }}>
      {EXPRS.map(([n]) => <div key={n} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 21, color: "#2a1a38" }}>{n}</div>)}
    </div>
  </AbsoluteFill>
);

/** live preview of the key gag: the flooded rice plot mirrors the sky so it looks bottomless */
export const SheetKabayanSawah: React.FC = () => (
  <AbsoluteFill>
    <ThreeCanvas width={2000} height={1100} shadows camera={{ fov: 34, near: 0.1, far: 400, position: [0, 3.4, 10] }}>
      <CameraRig position={[0, 3.0, 9]} lookAt={[0, 0.4, -4]} fov={34} />
      <SkyDome top="#3a86e0" horizon="#d8eefc" />
      <Cloud3D position={[-6, 9, -20]} s={2.2} />
      <Cloud3D position={[5, 11, -26]} s={2.6} />
      <Cloud3D position={[0, 14, -10]} s={2.0} />
      <K.Mountain pos={[-14, 0, -60]} r={18} h={16} />
      <K.Mountain pos={[10, 0, -70]} r={22} h={20} color="#4a7a6a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial map={K.grassTex()} /></mesh>
      <K.SawahWater pos={[-3.2, 0.02, -3]} w={5.6} d={8} />
      <K.SawahWater pos={[3.4, 0.02, -3]} w={5.6} d={8} />
      <K.PadiRows pos={[3.4, 0.02, -3]} w={5.4} d={7.8} />
      <K.PadiRows pos={[-3.2, 0.02, -6]} w={5.4} d={2} />
      <K.Pematang pos={[0.1, 0, -3]} len={8.6} rotY={Math.PI / 2} />
      <K.Pematang pos={[0, 0, 1.1]} len={13} />
      <K.Saung pos={[5.4, 0, -9]} rotY={-0.3} />
      <K.Scarecrow pos={[2.0, 0, -5]} />
      <K.Kerbau pos={[-5, 0, -9]} rotY={0.6} />
      <K.Tutut pos={[-2.0, 0.03, -1]} s={2} />
      <K.Korang pos={[-0.6, 0.27, 1.1]} />
      <BeanCard position={[0.4, 0.27, 1.1]} height={2.0} params={{ ...KABAYAN, expr: "scared", armR: [100, -10], sweat: true, look: -1 }} />
      <hemisphereLight args={["#ffffff", "#9ab080", 1.5]} />
      <directionalLight position={[-6, 12, 8]} intensity={2.0} color="#fff4e0" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#fff", WebkitTextStroke: "6px #2a1a38", paintOrder: "stroke fill" }}>UJI ADEGAN KUNCI · AIR SAWAH MEMANTULKAN LANGIT</div>
  </AbsoluteFill>
);

const SAWAH: Item[] = [
  { name: "Kotak sawah", note: "air jernih dangkal (di video jadi cermin langit)", el: <group><mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 2]} /><meshStandardMaterial color="#9ad0f0" /></mesh><K.Tutut pos={[0.6, 0.03, 0.3]} s={2} /></group>, w: 3.2, h: 0.5 },
  { name: "Rumpun padi", note: "padi muda, bergoyang", el: <K.PadiRows pos={[0, 0, 0]} w={2} d={1} />, w: 2, h: 0.6 },
  { name: "Pematang", note: "galengan tanah berumput", el: <K.Pematang pos={[0, 0, 0]} len={3} />, w: 3, h: 0.4 },
  { name: "Saung", note: "gubuk jaga sawah, atap rumbia", el: <K.Saung />, w: 2.7, h: 2.9 },
  { name: "Orang-orangan sawah", note: "caping + kaleng", el: <K.Scarecrow />, w: 1.2, h: 2.2 },
  { name: "Kerbau", note: "di pinggir sawah", el: <K.Kerbau />, w: 2.4, h: 1.6 },
  { name: "Tutut", note: "keong sawah hijau-kehitaman", el: <K.Tutut s={5} />, w: 0.8, h: 0.8 },
  { name: "Korang", note: "keranjang bambu wadah tutut", el: <K.Korang s={2} full={1} />, w: 0.9, h: 1.1 },
  { name: "Gunung & terasering", note: "latar jauh", el: <group><K.Mountain pos={[0, 0, -2]} r={2.2} h={2.4} /><K.Terrace pos={[0, 0, 0]} w={3} steps={2} /></group>, w: 4.4, h: 2.8 },
  { name: "Pancuran bambu", note: "air mengalir ke sawah", el: <K.Pancuran />, w: 1.4, h: 1.3 },
];
const KAMPUNG: Item[] = [
  { span: 2, name: "Rumah panggung", note: "bilik bambu, suhunan jolopong, golodog", el: <K.RumahPanggung />, w: 7.2, h: 5.2 },
  { name: "Leuit", note: "lumbung padi", el: <K.Leuit />, w: 2.5, h: 3.7 },
  { name: "Bale-bale", note: "balai bambu tempat Kabayan tidur", el: <K.BaleBale />, w: 2.0, h: 0.6 },
  { name: "Rumpun bambu", note: "di belakang rumah", el: <K.BambooClump />, w: 2.4, h: 6.2 },
  { name: "Pohon pisang", note: "kebun", el: <K.Banana />, w: 2.6, h: 2.8 },
  { name: "Pagar bambu", note: "batas halaman", el: <K.BambooFence len={3} />, w: 3, h: 1 },
  { name: "Lisung & halu", note: "penumbuk padi", el: <K.Lisung />, w: 2, h: 1.6 },
  { name: "Ayam", note: "berkeliaran di halaman", el: <group><K.Ayam /><K.Ayam pos={[0.7, 0, 0.2]} color="#8a4a2a" rotY={2} /></group>, w: 1.3, h: 0.6 },
  { name: "Pohon kelapa", note: "kampung", el: <K.Palm3D position={[0, 0, 0]} />, w: 3.2, h: 4.2 },
];
const DAPUR: Item[] = [
  { name: "Hawu", note: "tungku tanah + seeng & aseupan", el: <K.Hawu t={0.3} />, w: 1.3, h: 1.5 },
  { name: "Boboko", note: "bakul nasi bambu", el: <K.Boboko />, w: 0.5, h: 0.5 },
  { name: "Kendi", note: "tempat air minum", el: <K.Kendi />, w: 0.6, h: 0.6 },
  { name: "Nyiru", note: "tampah bambu", el: <K.Nyiru rot={[0.5, 0, 0]} />, w: 1, h: 0.6 },
  { name: "Caping", note: "topi tani", el: <K.Caping />, w: 1, h: 0.3 },
];
export const H_KBY = { Sawah: sheetHeight(SAWAH, 5), Kampung: sheetHeight(KAMPUNG, 5), Dapur: sheetHeight(DAPUR, 5) };
export const SheetKabayanPropSawah: React.FC = () => <Sheet title="PROPERTI · LUAR · SAWAH" sub="Sawah tergenang memantulkan langit (inti lelucon), padi muda, pematang, saung, tutut di lumpur" items={SAWAH} cols={5} bg={["#e6f4ff", "#e8f0d0"]} />;
export const SheetKabayanPropKampung: React.FC = () => <Sheet title="PROPERTI · LUAR · KAMPUNG SUNDA" sub="Riset: rumah panggung bilik bambu beratap suhunan jolopong (pelana panjang), leuit = lumbung padi" items={KAMPUNG} cols={5} bg={["#fff2dc", "#e8f0d0"]} />;
export const SheetKabayanPropDapur: React.FC = () => <Sheet title="PROPERTI · DAPUR & ALAT" sub="Untuk adegan penutup (tutut dimasak) dan perlengkapan petani" items={DAPUR} cols={5} bg={["#fff2dc", "#f0dcc0"]} />;

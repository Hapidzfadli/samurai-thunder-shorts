// Lembar karakter, ekspresi & properti "Powerbank Melahirkan" (untuk disetujui sebelum membangun adegan).
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Bean3, Bean3Params, BlueGrid, Expr3, ToonRes, ToonSky, Vec3 } from "./three/toon";
import { BabyPowerbank, BossPhone, BossRoomSet, Candle, HoloPhoneGrave, NawasPhone, OpenOfficeSet, Powerbank } from "./three/objectsNawas";

export const NAWAS: Bean3Params = { body: "#2a8a5a", plaid: "#1e6a44", shirt: "#f4f0e4", pants: "#3a3a48", boots: "#6a4a32", glove: "#f1e2d0", sleeve: "#2a8a5a", hat: "peci", hatColor: "#1a1a20", hatBand: "#2a2a34", backpack: "#3a3a3a" };
export const BOS: Bean3Params = { body: "#2a2a3a", shirt: "#ffffff", tie: "#c82a2a", pants: "#2a2a3a", boots: "#1a1a1a", glove: "#f1dcc4", sleeve: "#2a2a3a", hair: "#2a2420", mustache: true, hat: "none" };
export const SINTA: Bean3Params = { body: "#f0a040", pants: "#4a4a62", boots: "#ffffff", glove: "#f1e2d0", sleeve: "#f0a040", hijab: "#7a4ab0", hat: "none" };
export const UDIN: Bean3Params = { body: "#4a7ad8", pants: "#5a5a62", boots: "#2a2a2a", glove: "#e8d2bc", sleeve: "#4a7ad8", hair: "#1a1410", hat: "none", headphones: "#2a2a30", collar: "#2a5ab0" };

const Lights: React.FC = () => (
  <>
    <hemisphereLight args={["#f4f8ff", "#c8b8a0", 1.3]} />
    <directionalLight position={[-4, 8, 10]} intensity={1.8} color="#fff4e4" castShadow />
  </>
);
const SHEET_BG = "linear-gradient(#eef6ff, #f8efe0)";
const Title: React.FC<{ t: string }> = ({ t }) => (
  <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 50, color: "#1e2240" }}>{t}</div>
);

const CHARS: [string, string, string, Bean3Params, Expr3][] = [
  ["Kang Nawas", "Tokoh utama · karyawan cerdik", "Peci hitam, kemeja flanel hijau, kaos putih, sepatu kulit cokelat, ransel. HP butut retak.", NAWAS, "smug"],
  ["Pak Bos", "Direktur super pelit", "Jas hitam, kemeja putih, dasi merah, kumis tipis (mulut tetap terlihat), HP emas terbaru.", BOS, "proud"],
  ["Mbak Sinta", "Rekan kerja · saksi", "Jilbab ungu, blus oranye. Ikut \"melayat\" HP sambil pegang lilin.", SINTA, "worried"],
  ["Mas Udin", "Rekan kerja · tukang cas", "Kemeja biru, headphone di leher. Paling sering bayar cas Rp2.000.", UDIN, "puzzled"],
];
export const SheetNawas: React.FC = () => (
  <AbsoluteFill style={{ background: SHEET_BG }}>
    <ThreeCanvas width={2000} height={1150} shadows flat camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 17] }}>
      <ToonRes />
      <CameraRig position={[0, 1.4, 11]} lookAt={[0, 1.0, 0]} fov={24} />
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshToonMaterial color="#d8d0c0" />
      </mesh>
      {CHARS.map(([, , , p, e], i) => {
        const x = -3.3 + i * 2.2;
        const extra: Partial<Bean3Params> = i === 0 ? { handR: [0.4, 0.75, 0.3] } : i === 1 ? { handR: [0.38, 0.8, 0.3] } : i === 2 ? { handR: [0.3, 0.72, 0.35] } : {};
        return (
          <group key={i}>
            <Bean3 p={{ ...p, ...extra, expr: e }} position={[x, 0, 0]} rotation={[0, 0.15, 0]} scale={1.1} />
          </group>
        );
      })}
      <Powerbank position={[-3.3 + 0.48, 0.86, 0.36]} scale={1.5} />
      <BossPhone position={[-1.1 + 0.46, 0.92, 0.36]} scale={1.5} />
      <Candle position={[1.1 + 0.36, 0.72, 0.4]} scale={1.3} />
    </ThreeCanvas>
    <Title t='KARAKTER · "POWERBANK MELAHIRKAN"' />
    <div style={{ position: "absolute", bottom: 22, left: 60, right: 60, display: "flex", gap: 30 }}>
      {CHARS.map(([n, r, d]) => (
        <div key={n} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 900, fontSize: 32, color: "#1e2240" }}>{n}</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#2a7a5a" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 18, color: "#4a4a6a", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const EXPR: [string, Bean3Params][] = [
  ["Nawas: licik", { ...NAWAS, expr: "smug" }],
  ["Nawas: pura-pura sedih", { ...NAWAS, expr: "worried" }],
  ["Nawas: bicara", { ...NAWAS, expr: "happy", talk: 0.8 }],
  ["Bos: bangga", { ...BOS, expr: "proud" }],
  ["Bos: tertawa serakah", { ...BOS, expr: "laugh" }],
  ["Bos: membentak", { ...BOS, expr: "shout" }],
  ["Bos: melongo", { ...BOS, expr: "shock" }],
  ["Sinta: ikut sedih", { ...SINTA, expr: "worried" }],
];
export const SheetNawasExpr: React.FC = () => (
  <AbsoluteFill style={{ background: SHEET_BG }}>
    <ThreeCanvas width={2000} height={800} flat camera={{ fov: 16, near: 0.5, far: 200, position: [0, 1.45, 22] }}>
      <ToonRes />
      <CameraRig position={[0, 1.5, 22]} lookAt={[0, 1.35, 0]} fov={16} />
      <Lights />
      {EXPR.map(([, p], i) => (
        <Bean3 key={i} p={p} position={[-6.65 + i * 1.9, 0, 0]} rotation={[0, 0.1, 0]} />
      ))}
    </ThreeCanvas>
    <Title t="EKSPRESI YANG DIPAKAI" />
    <div style={{ position: "absolute", bottom: 26, left: 30, right: 30, display: "flex" }}>
      {EXPR.map(([n]) => (
        <div key={n} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 22, color: "#1e2240" }}>{n}</div>
      ))}
    </div>
  </AbsoluteFill>
);

const PropShot: React.FC<{ cam: Vec3; look: Vec3; fov?: number; bg: string; children: React.ReactNode }> = ({ cam, look, fov = 40, bg, children }) => (
  <div style={{ position: "relative", width: 1000, height: 1000, overflow: "hidden", background: bg }}>
    <ThreeCanvas width={1000} height={1000} shadows flat camera={{ fov, near: 0.05, far: 200, position: cam }}>
      <ToonRes />
      <CameraRig position={cam} lookAt={look} fov={fov} />
      {children}
    </ThreeCanvas>
  </div>
);
const Cap: React.FC<{ t: string; d: string }> = ({ t, d }) => (
  <div style={{ position: "absolute", left: 16, bottom: 14, right: 16, background: "rgba(10,14,28,0.82)", color: "#fff", borderRadius: 14, padding: "10px 16px", fontFamily: "Inter, sans-serif" }}>
    <div style={{ fontWeight: 900, fontSize: 30 }}>{t}</div>
    <div style={{ fontWeight: 600, fontSize: 18, opacity: 0.9 }}>{d}</div>
  </div>
);
export const SheetNawasProps: React.FC = () => (
  <AbsoluteFill style={{ background: "#1e2240", display: "flex", flexWrap: "wrap" }}>
    <div style={{ position: "relative" }}>
      <PropShot cam={[1.2, 2.2, 4.6]} look={[-0.4, 1.2, -1.6]} fov={50} bg="#e8eef2">
        <Lights />
        <OpenOfficeSet />
      </PropShot>
      <Cap t="1 · Ruang kerja PT. Hemat Jaya (siang)" d="Dinding kuning + logo, jendela kota, stopkontak DIGEMBOK + papan 'Cas HP Rp2.000/jam', meja panjang, monitor, laptop, mug, map, kursi, bean bag, dispenser, papan target, tanaman." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[1.6, 2.0, 3.6]} look={[0.2, 1.2, -1.6]} fov={52} bg="#3a2418">
        <Lights />
        <BossRoomSet safeOpen={0.6} />
      </PropShot>
      <Cap t="2 · Ruang Pak Bos (siang)" d="Panel kayu, foto Pak Bos berbingkai emas, piagam 'Bos Terhemat', jam, meja besar, papan nama, kalkulator, celengan babi, koin, laptop 'KEUNTUNGAN', kursi kulit, brankas (tempat powerbank), sofa, lampu emas." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[0.15, 0.4, 1.75]} look={[0.15, 0.18, 0]} fov={34} bg="#f4ecd8">
        <Lights />
        <Powerbank position={[-0.25, 0.2, 0]} rotation={[0, 0.2, 0]} />
        <BabyPowerbank position={[-0.02, 0.15, 0.08]} rotation={[0, -0.1, 0]} />
        <BabyPowerbank position={[0.16, 0.15, 0.06]} rotation={[0, -0.3, 0]} swaddle />
        <BossPhone position={[0.36, 0.22, 0]} rotation={[0, -0.3, 0]} battery={100} />
        <NawasPhone position={[0.55, 0.2, 0.05]} rotation={[0, -0.4, 0]} battery={1} />
      </PropShot>
      <Cap t="3 · Benda penting (objek terpisah, ikut tangan)" d="Powerbank Pak Bos (lampu indikator), 'bayi' powerbank (pita, dot, versi dibedong), HP emas Pak Bos (layar baterai), HP butut Nawas retak 1%." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[0.5, 1.5, 3.3]} look={[0, 0.85, 0]} fov={42} bg="#020a1c">
        <hemisphereLight args={["#bfe4ff", "#123060", 1.6]} />
        <directionalLight position={[3, 6, 5]} intensity={1.4} />
        <ToonSky top="#020814" horizon="#0a2a5a" />
        <BlueGrid size={30} />
        <HoloPhoneGrave t={0.6} />
      </PropShot>
      <Cap t="4 · 'Makam' HP + hologram" d="Proyektor hologram, peti X-ray berisi HP mati (baterai 0%), 'arwah' HP bersayap + halo melayang naik, nisan hologram, kelopak berpendar, lilin. Bergerak di video." />
    </div>
  </AbsoluteFill>
);

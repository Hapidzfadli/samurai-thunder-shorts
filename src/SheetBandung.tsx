import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanParams } from "./three/objectsBean";
import {
  AlliedPlane3D,
  AlliedTank3D,
  AmmoDepot,
  BandungMapBoard,
  ColonialHouse,
  CommandDesk,
  Dynamite3D,
  FireCluster,
  FlagPoleID,
  GedungSate,
  RefugeeCart,
  SandbagBarricade,
  TntCrateStack,
  WatchTower,
} from "./three/objectsBandung";

/* ================================================================== */
/* CAST BANDUNG LAUTAN API (Gaya Karakter Bean Banjir Boston + War)   */
/* ================================================================== */
export const TOHA: BeanParams = {
  skin: "#f2d6b3",
  torso: "#b89c6a",
  pants: "#5e4e34",
  sleeves: "#b89c6a",
  hat: "headband",
  hair: "#1c1412",
  safari: true,
  bandolier: "#5a381e",
  belt: "#3e2614",
  pouches: true,
  backpack: "#6e5a3a",
  boots: "#2e1f14",
  armband: "redwhite",
  soot: 0.75,
  seed: 41,
};

export const RAMDAN: BeanParams = {
  skin: "#efd0ab",
  torso: "#8e7b52",
  pants: "#4d4430",
  sleeves: "#8e7b52",
  hat: "steel90",
  hatColor: "#4f5c3d",
  safari: true,
  bandolier: "#4a3018",
  belt: "#362212",
  pouches: true,
  backpack: "#5c4d32",
  boots: "#2a1d12",
  armband: "redwhite",
  soot: 0.65,
  seed: 42,
};

export const NASUTION: BeanParams = {
  skin: "#f3d8b8",
  torso: "#c2ab7c",
  pants: "#5c503a",
  sleeves: "#c2ab7c",
  hat: "officer",
  hatColor: "#8c7a54",
  safari: true,
  tie: "#3e3222",
  medals: true,
  belt: "#3a2212",
  boots: "#1f150e",
  wide: 1.08,
  seed: 43,
};

export const SEKUTU: BeanParams = {
  skin: "#f8dfc8",
  torso: "#5b6647",
  pants: "#454e36",
  sleeves: "#5b6647",
  hat: "brodie",
  hatColor: "#4a543a",
  safari: true,
  bandolier: "#6b5a3c",
  belt: "#4a3e28",
  pouches: true,
  boots: "#221a14",
  mustache: true,
  wide: 1.1,
  seed: 44,
};

export const IBU_BANDUNG: BeanParams = {
  skin: "#efd1ae",
  kebaya: "#c45464",
  sleeves: "#c45464",
  skirt: "#5c3424",
  batik: "#e8c070",
  selendang: "#e09f3e",
  hat: "sanggul",
  hair: "#1c1412",
  barefoot: true,
  soot: 0.4,
  seed: 45,
};

export const RELAWAN_PMI: BeanParams = {
  skin: "#f2d6b3",
  torso: "#f5f1e6",
  pants: "#3a404a",
  sleeves: "#f5f1e6",
  hat: "kerchief",
  hatColor: "#f5f1e6",
  belt: "#3a2a1c",
  armband: "redcross",
  seed: 46,
};

const CHAR_LABELS: [string, string, string][] = [
  ["Mohammad Toha", "Pejuang Muda BRI · Aksi Dayeuhkolot", "Ikat kepala Merah Putih, seragam khaki, sabuk peluru, ransel, ban lengan, bot, jelaga, bawa dinamit."],
  ["Ramdan", "Pejuang TRI · Rekan Toha", "Helm baja Tipe 90 + lencana Merah Putih, seragam tempur, tas amunisi, ransel, senapan bersangkur."],
  ["Kolonel A.H. Nasution", "Komandan Divisi III TRI", "Topi perwira, seragam khaki berdasi, tanda pangkat & medali, bot kulit, surat ultimatum."],
  ["Tentara Sekutu", "Pasukan Inggris · Penjaga Gudang", "Helm baja Brodie, seragam zaitun Inggris, sabuk webbing, kumis, senapan Lee-Enfield."],
  ["Ibu Pengungsi", "Warga Bandung Selatan", "Kebaya merah tua, kain batik, selendang, sanggul, membawa obor untuk membumihanguskan rumah."],
  ["Relawan Palang Merah", "Medis Garis Depan", "Blus putih, kerudung/kerchief, ban lengan Palang Merah, tas P3K."],
];

export const SheetBandungKarakter: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#ffe3c2, #e8b4a0)" }}>
      <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.9, 22] }}>
        <CameraRig position={[0, 1.9, 22]} lookAt={[0, 1.6, 0]} fov={22} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <meshStandardMaterial color="#e8cca8" roughness={1} />
        </mesh>
        <BeanCard position={[-5.8, 0, 0]} height={3.1} params={{ ...TOHA, expr: "angry", prop: "dynamite", armL: [-40, -50], armR: [75, -55] }} />
        <BeanCard position={[-3.5, 0, 0]} height={3.1} params={{ ...RAMDAN, expr: "neutral", prop: "rifle", armL: [-20, -40], armR: [55, -35] }} />
        <BeanCard position={[-1.2, 0, 0]} height={3.15} params={{ ...NASUTION, expr: "angry", prop: "paper", armL: [-20, -30], armR: [65, -45] }} />
        <BeanCard position={[1.2, 0, 0]} height={3.15} params={{ ...SEKUTU, expr: "smug", prop: "rifle", armL: [-15, -30], armR: [50, -35] }} />
        <BeanCard position={[3.5, 0, 0]} height={3.0} params={{ ...IBU_BANDUNG, expr: "worried", prop: "torch", armL: [-25, -40], armR: [80, -40] }} />
        <BeanCard position={[5.8, 0, 0]} height={3.0} params={{ ...RELAWAN_PMI, expr: "sad", prop: "medkit", armL: [-20, -30], armR: [35, -20] }} />
        <hemisphereLight args={["#fff8ea", "#b8928a", 1.7]} />
        <directionalLight position={[-6, 10, 14]} intensity={2.1} color="#fff0d8" castShadow />
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#241726", letterSpacing: 2 }}>
        KARAKTER · "BANDUNG LAUTAN API 1946" (GAYA BEAN BANJIR BOSTON + ATRIBUT PERANG LENGKAP)
      </div>
      <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", gap: 14 }}>
        {CHAR_LABELS.map(([n, r, d]) => (
          <div key={n} style={{ width: 320, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontWeight: 800, fontSize: 24, color: "#241726" }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#991b1b" }}>{r}</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#4a3340", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* LEMBAR PROPERTI 3D · 3 LATAR BANDUNG 1946                          */
/* ================================================================== */
const PROP_ROWS: { title: string; items: [string, string][] }[] = [
  {
    title: "LATAR 1: KOTA BANDUNG 1946 (JALAN BRAGA & PEMUKIMAN)",
    items: [
      ["Gedung Sate", "Ikon Bandung kolonial + tusuk sate"],
      ["Rumah Terbakar", "Fasad kolonial + api 3D membara"],
      ["Barikade & Bendera", "Karung pasir + Merah Putih"],
      ["Gerobak Pengungsi", "Kasur gulung, koper & buntelan"],
    ],
  },
  {
    title: "LATAR 2: ALUTSISTA SEKUTU & POS MARKAS DIVISI III TRI",
    items: [
      ["Tank Sherman 3D", "Turet berputar + meriam sekutu"],
      ["Pesawat Tempur 3D", "Baling-baling + selebaran ultimatum"],
      ["Peta Strategi Bandung", "Garis rel Utara/Selatan + Dayeuhkolot"],
      ["Meja Komando TRI", "Telepon lapangan engkol + lampu"],
    ],
  },
  {
    title: "LATAR 3: GUDANG MESIU DAYEUHKOLOT (KLIMAKS)",
    items: [
      ["Gudang Mesiu Raksasa", "Pintu baja + papan DANGER"],
      ["Menara Jaga + Sorot", "Lampu sorot 3D menyapu malam"],
      ["Peti TNT & Artileri", "Tumpukan bahan peledak 18.000 ton"],
      ["Api & Dinamit 3D", "Efek ledakan + dinamit pegangan tangan"],
    ],
  },
];

export const SheetBandungProperti: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#fae2c8, #efc8be)" }}>
      <ThreeCanvas width={2000} height={1440} shadows camera={{ fov: 28, near: 0.5, far: 200, position: [0, 2.2, 26] }}>
        <CameraRig position={[0, 2.2, 26]} lookAt={[0, 1.9, 0]} fov={28} />
        <hemisphereLight args={["#fff8ea", "#9c8080", 1.7]} />
        <directionalLight position={[-8, 12, 16]} intensity={2.0} color="#ffe8c8" />

        {/* Row 1 (Top) */}
        <group position={[-7.2, 4.4, 0]} scale={0.22}>
          <GedungSate />
        </group>
        <group position={[-2.4, 4.6, 0]} scale={0.34}>
          <ColonialHouse burning={1} t={0.4} />
        </group>
        <group position={[2.4, 4.7, 0]} scale={0.56}>
          <SandbagBarricade />
          <FlagPoleID pos={[1.5, 0, -0.4]} h={3.8} t={0.4} />
        </group>
        <group position={[7.2, 4.8, 0]} scale={0.78}>
          <RefugeeCart rot={[0, -0.35, 0]} />
        </group>

        {/* Row 2 (Middle) */}
        <group position={[-7.2, 0.9, 0]} scale={0.62}>
          <AlliedTank3D rot={[0, 0.55, 0]} turretYaw={0.2} />
        </group>
        <group position={[-2.4, 1.6, 0]} scale={0.44}>
          <AlliedPlane3D rot={[0.25, 0.55, -0.15]} t={0.3} />
        </group>
        <group position={[2.4, 1.9, 0]} scale={0.72}>
          <BandungMapBoard />
        </group>
        <group position={[7.2, 1.0, 0]} scale={0.74}>
          <CommandDesk />
        </group>

        {/* Row 3 (Bottom) */}
        <group position={[-7.2, -3.1, 0]} scale={0.25}>
          <AmmoDepot />
        </group>
        <group position={[-2.4, -3.1, 0]} scale={0.31}>
          <WatchTower sweepAngle={0.4} />
        </group>
        <group position={[2.4, -2.7, 0]} scale={0.76}>
          <TntCrateStack />
        </group>
        <group position={[7.2, -2.6, 0]} scale={0.9}>
          <FireCluster pos={[-0.6, 0, 0]} scale={0.82} t={0.5} />
          <Dynamite3D pos={[1.0, 0.9, 0.5]} scale={2.3} t={0.5} />
        </group>
      </ThreeCanvas>

      <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 48, color: "#241726", letterSpacing: 2 }}>
        PROPERTI 3D · 3 LATAR "BANDUNG LAUTAN API 1946" (GAYA INK-OUTLINE BANJIR BOSTON)
      </div>

      {PROP_ROWS.map((row, rIdx) => (
        <div
          key={row.title}
          style={{
            position: "absolute",
            top: 470 + rIdx * 440,
            left: 50,
            right: 50,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {row.items.map(([name, desc]) => (
            <div key={name} style={{ width: 440, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
              <div style={{ fontWeight: 800, fontSize: 24, color: "#241726" }}>{name}</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#5a3444" }}>{desc}</div>
            </div>
          ))}
        </div>
      ))}
    </AbsoluteFill>
  );
};

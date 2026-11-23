import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BeanCard, BeanParams } from "./three/objectsBean";
import {
  GasStove3D,
  Gayung3D,
  KosanBedroomSet,
  KosanDoorUnit,
  KosanFridge3D,
  KosanKitchenCounter,
  LpgMelon3D,
  NoodleBowl3D,
  NoodlePacket3D,
  RealisticFlame3D,
  Spatula3D,
  WaterSplash3D,
  WetTowel3D,
  WokPan3D,
} from "./three/objectsMie";

/* Synchronous camera rig for guaranteed accurate single-frame still renders */
const SyncCam: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fov?: number }> = ({
  pos,
  look,
  fov = 34,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};

/* ================================================================== */
/* CAST "MASAK MIE JAM 2 PAGI" (Gaya Bean Banjir Boston · Kosan ID)   */
/* ================================================================== */
export const RIKO: BeanParams = {
  skin: "#f3d7b5",
  torso: "#2563eb",
  sleeves: "#2563eb",
  pants: "#1e3a5f",
  hair: "#1c1412",
  apron: "#fef08a",
  barefoot: true,
  seed: 81,
};

export const BU_TINI: BeanParams = {
  skin: "#efd0ac",
  kebaya: "#991b1b",
  sleeves: "#991b1b",
  skirt: "#7f1d1d",
  batik: "#fbbf24",
  selendang: "#f59e0b",
  hat: "sanggul",
  hair: "#272025",
  wide: 1.15,
  barefoot: true,
  seed: 82,
};

export const BAGAS: BeanParams = {
  skin: "#f0d2af",
  torso: "#1f2937",
  sleeves: "#1f2937",
  pants: "#374151",
  hair: "#18141a",
  headphones: true,
  barefoot: true,
  seed: 83,
};

export const NISA: BeanParams = {
  skin: "#f6ddc0",
  torso: "#f9a8d4",
  sleeves: "#f9a8d4",
  skirt: "#be185d",
  batik: "#fbcfe8",
  hat: "kerchief",
  hatColor: "#fce7f3",
  barefoot: true,
  seed: 84,
};

export const DEDI: BeanParams = {
  skin: "#e9c69f",
  torso: "#f8fafc",
  sleeves: "#f8fafc",
  pangsi: "#14532d",
  slung: "#0f766e",
  hat: "peci",
  mustache: true,
  wide: 1.08,
  barefoot: true,
  seed: 85,
};

const CHAR_LABELS: [string, string, string][] = [
  ["Riko (Kamar 01)", "Anak Kos · Sok Chef Jam 02:00", "Kaos oblong biru, celemek kuning dadakan, ekspresi sok jago → panik parah saat wajan menyala."],
  ["Bu Tini", "Ibu Kos Galak Tapi Lapar", "Daster batik merah marun, sanggul, wajah sangar pas mendobrak dapur → langsung luluh cium bau mie."],
  ["Mas Bagas (Kamar 02)", "Tetangga Gamer Begadang", "Kaos hitam, headphone nempel di kepala, baru keluar kamar langsung syok lihat kobaran api."],
  ["Mbak Nisa (Kamar 03)", "Tetangga Rajin Skincare", "Piyama pink + kerudung instan, ikut heboh panik menyelamatkan diri dari asap dapur."],
  ["Mas Dedi (Kamar 04)", "Tetangga Siaga Ronda", "Kaos putih, sarung diselempangkan, peci miring, bawa gayung ikut bantuin padamkan api."],
];

export const SheetMieKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#fef3c7, #fed7aa)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.9, 21] }}>
      <SyncCam pos={[0, 1.9, 21]} look={[0, 1.55, 0]} fov={22} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#f5d9b5" roughness={1} />
      </mesh>
      <BeanCard position={[-5.2, 0, 0]} height={3.1} params={{ ...RIKO, expr: "smug", armL: [-30, -35], armR: [78, -42] }} />
      <Spatula3D pos={[-4.32, 1.66, 0.25]} rot={[0, 0, -0.35]} scale={1.1} />
      <BeanCard position={[-2.6, 0, 0]} height={3.15} params={{ ...BU_TINI, expr: "angry", armL: [-42, -30], armR: [62, -38] }} />
      <WetTowel3D pos={[-1.82, 1.54, 0.25]} rot={[0.3, 0.2, 0.4]} scale={0.72} />
      <BeanCard position={[0.0, 0, 0]} height={3.05} params={{ ...BAGAS, expr: "shock", sweat: true, prop: "phone", armL: [-20, -35], armR: [68, -50] }} />
      <BeanCard position={[2.6, 0, 0]} height={3.0} params={{ ...NISA, expr: "scared", sweat: true, armL: [-55, -25], armR: [55, -25] }} />
      <BeanCard position={[5.2, 0, 0]} height={3.1} params={{ ...DEDI, expr: "worried", armL: [-25, -35], armR: [72, -45] }} />
      <Gayung3D pos={[5.98, 1.62, 0.25]} rot={[0.15, 0.2, 0.12]} scale={1.1} />
      <hemisphereLight args={["#fff8ea", "#c29b7a", 1.8]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.1} color="#fff2dc" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 52, color: "#241726", letterSpacing: 2 }}>
      KARAKTER · "MASAK MIE JAM 2 PAGI, MALAH BIKIN KEBAKARAN KOSAN" (GAYA BEAN)
    </div>
    <div style={{ position: "absolute", bottom: 20, left: 26, right: 26, display: "flex", justifyContent: "space-between", gap: 16 }}>
      {CHAR_LABELS.map(([n, r, d]) => (
        <div key={n} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#241726" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#b91c1c" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#4a3340", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

/* ================================================================== */
/* LEMBAR PROPERTI & UPGRADE EFEK API REALISTIS 3D                    */
/* ================================================================== */
type CardSpec = {
  title: string;
  sub: string;
  bg: string;
  camPos: [number, number, number];
  look: [number, number, number];
  fov?: number;
  render: () => React.ReactNode;
};

const ROWS: { heading: string; cards: CardSpec[] }[] = [
  {
    heading: "1. UPGRADE EFEK VISUAL: API LIDAH TAJAM BERLAPIS, BARA, ASAP, GOSONG & CIPRATAN AIR",
    cards: [
      {
        title: "Api Tajam Berlapis + Bara + Asap",
        sub: "Lidah api runcing 3 warna + pointLight oranye",
        bg: "#1c131d",
        camPos: [1.8, 1.8, 4.4],
        look: [0, 1.35, 0],
        render: () => (
          <>
            <WokPan3D pos={[0, 0.25, 0]} hasNoodles />
            <RealisticFlame3D pos={[0, 0.42, 0]} scale={1.0} heightMul={1.25} t={1.4} seed={2} />
          </>
        ),
      },
      {
        title: "Dapur & Lemari Gosong Terbakar",
        sub: "Noda jelaga hangus merambat di dinding & lemari",
        bg: "#261a24",
        camPos: [2.2, 2.5, 6.2],
        look: [0.3, 1.9, -0.1],
        render: () => <KosanKitchenCounter pos={[0, 0, 0]} burnerOn scorchLevel={0.95} fireScale={0.85} t={2.1} />,
      },
      {
        title: "Kompor 2 Tungku + Api Biru + LPG 3kg",
        sub: "Api biru realistis melingkar + tabung melon hijau",
        bg: "#242c3c",
        camPos: [1.9, 1.6, 3.6],
        look: [0.2, 0.7, 0],
        render: () => (
          <>
            <GasStove3D pos={[0, 0.9, 0]} burnerOn t={0.8} />
            <LpgMelon3D pos={[0.8, 0, 0.35]} />
          </>
        ),
      },
      {
        title: "Gayung Biru + Cipratan Air 3D",
        sub: "Pemicu ledakan api minyak goreng (grease fire)",
        bg: "#1e293b",
        camPos: [1.6, 1.4, 3.2],
        look: [0, 0.65, 0],
        render: () => (
          <>
            <Gayung3D pos={[-0.3, 1.1, 0]} rot={[0, 0, -0.85]} />
            <WaterSplash3D pos={[0.15, 0.25, 0]} progress={0.55} />
          </>
        ),
      },
    ],
  },
  {
    heading: "2. LATAR 3D KOSAN INDONESIA (KAMAR JAM 02:00, KORIDOR, KULKAS & HANDUK BASAH)",
    cards: [
      {
        title: "Kamar Kos + Jam 02:00 + Kipas",
        sub: "Kasur biru, bantal, guling, kipas berputar",
        bg: "#1f2438",
        camPos: [2.2, 2.2, 5.2],
        look: [0, 1.25, -0.2],
        render: () => <KosanBedroomSet pos={[0, 0, 0]} t={1.2} />,
      },
      {
        title: "Pintu Koridor Kos (Bisa Terbuka)",
        sub: "Nomor kamar 02, gagang kuningan & sandal jepit",
        bg: "#2e2524",
        camPos: [1.5, 1.6, 4.9],
        look: [0.1, 1.35, 0],
        render: () => <KosanDoorUnit pos={[0, 0, 0]} num="02" openAngle={-0.32} />,
      },
      {
        title: "Kulkas Bersama + Galon Air",
        sub: "Catatan khas kosan: 'JANGAN AMBIL TELOR!'",
        bg: "#27303f",
        camPos: [1.7, 2.1, 5.8],
        look: [0, 1.75, 0],
        render: () => <KosanFridge3D pos={[0, 0, 0]} />,
      },
      {
        title: "Handuk Basah Pemadam (Bu Tini)",
        sub: "Dilempar menutupi wajan untuk memadamkan api",
        bg: "#263344",
        camPos: [1.2, 1.2, 2.5],
        look: [0, 0.3, 0],
        render: () => <WetTowel3D pos={[0, 0.35, 0]} rot={[0.35, 0.4, 0.1]} scale={1.3} />,
      },
    ],
  },
  {
    heading: "3. PROPERTI 3D TERPISAH (DIGENGGAM & PINDAH TANGAN VIA beanHandWorld)",
    cards: [
      {
        title: "Wajan + Mie Goreng Telur + Cabai",
        sub: "Bisa digoyang-goyang saat aksi sok chef flambé",
        bg: "#2d2324",
        camPos: [1.0, 1.15, 2.1],
        look: [0.1, 0.25, 0],
        render: () => <WokPan3D pos={[0, 0.1, 0]} hasNoodles scale={1.25} />,
      },
      {
        title: "Bungkus Mie Goreng Jumbo",
        sub: "Tekstur kemasan ikonik warna merah-kuning-hijau",
        bg: "#2e2420",
        camPos: [0.6, 0.55, 1.55],
        look: [0, 0.35, 0],
        render: () => <NoodlePacket3D pos={[0, 0.35, 0]} rot={[0.05, 0.35, -0.08]} scale={1.45} />,
      },
      {
        title: "Sodet / Spatula Chef Riko",
        sub: "Spatula logam bergagang merah untuk aduk wajan",
        bg: "#28222c",
        camPos: [0.7, 0.55, 1.6],
        look: [0, 0.35, 0],
        render: () => <Spatula3D pos={[0, 0.35, 0]} rot={[0.1, 0.4, -0.35]} scale={1.35} />,
      },
      {
        title: "Mangkok Ayam Jago + Uap Hangat",
        sub: "Mangkok ikonik Indonesia + telur + sumpit + uap",
        bg: "#2d221c",
        camPos: [0.85, 0.9, 1.75],
        look: [0, 0.32, 0],
        render: () => <NoodleBowl3D pos={[0, 0.08, 0]} scale={1.3} t={0.6} steam />,
      },
    ],
  },
];

export const SheetMieProperti: React.FC = () => (
  <AbsoluteFill style={{ background: "#f8efe2", padding: "26px 34px" }}>
    <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 48, color: "#241726", letterSpacing: 1.5, marginBottom: 14 }}>
      PROPERTI 3D & UPGRADE EFEK API REALISTIS · "MASAK MIE JAM 2 PAGI"
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {ROWS.map((row) => (
        <div key={row.heading}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 22, color: "#991b1b", marginBottom: 8 }}>
            {row.heading}
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {row.cards.map((card) => (
              <div
                key={card.title}
                style={{
                  flex: 1,
                  background: "#fffaf2",
                  border: "4px solid #241726",
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                }}
              >
                <div style={{ width: 465, height: 292, position: "relative", background: card.bg }}>
                  <ThreeCanvas width={465} height={292} shadows camera={{ fov: card.fov ?? 34, near: 0.1, far: 100, position: card.camPos }}>
                    <SyncCam pos={card.camPos} look={card.look} fov={card.fov ?? 34} />
                    <color attach="background" args={[card.bg]} />
                    <hemisphereLight args={["#fff4e0", "#4a3d4c", 1.5]} />
                    <directionalLight position={[4, 8, 7]} intensity={1.9} color="#fff0d4" castShadow />
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                      <planeGeometry args={[20, 20]} />
                      <meshStandardMaterial color="#36323e" roughness={1} />
                    </mesh>
                    {card.render()}
                  </ThreeCanvas>
                </div>
                <div style={{ padding: "8px 12px 10px", fontFamily: "Inter, sans-serif" }}>
                  <div style={{ fontWeight: 800, fontSize: 19, color: "#241726" }}>{card.title}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#574852", marginTop: 2 }}>{card.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

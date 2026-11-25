import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanExpr, BeanParams } from "./three/objectsBean";
import {
  CanteenTruck,
  ControlDesk,
  CornBag3D,
  GrainSilo,
  PelicanNoseCone,
  PelicanRig,
  PigeonCard,
  PigeonFlock,
  RadarSet1944,
  ShipTargetBoard,
  SkinnerBox,
  TrainCoach,
} from "./three/objectsMerpati";

/* ================================================================== */
/* CAST "RUDAL MERPATI 1944" (Gaya Bean Bandung — Seri Dodi & Ara)    */
/* ================================================================== */
export const DODI_M: BeanParams = {
  skin: "#f0d2ad",
  torso: "#7d7451",
  sleeves: "#7d7451",
  pants: "#6a6046",
  hat: "cap",
  hatColor: "#6a6244",
  hair: "#2a1c14",
  safari: true,
  belt: "#3e3020",
  boots: "#3a2618",
  pouches: true,
  seed: 61,
};

export const ARA_M: BeanParams = {
  skin: "#f6dcc0",
  torso: "#857b56",
  sleeves: "#857b56",
  skirt: "#6c6248",
  batik: "#6c6248",
  hat: "sanggul",
  hair: "#3a2418",
  sideHair: "#3a2418",
  tie: "#4a4030",
  belt: "#4a3a26",
  boots: "#3a2618",
  safari: true,
  seed: 62,
};

export const SKINNER: BeanParams = {
  skin: "#f3d6bc",
  torso: "#f5f3eb",
  sleeves: "#f5f3eb",
  pants: "#474a54",
  coat: true,
  tie: "#8b2626",
  hair: "#4a3728",
  sideHair: "#4a3728",
  hat: "none",
  seed: 63,
};

export const JENDERAL_M: BeanParams = {
  skin: "#f2cfae",
  torso: "#6e6a4c",
  sleeves: "#6e6a4c",
  pants: "#8a7f62",
  hat: "officer",
  hatColor: "#5a5640",
  tie: "#3a3424",
  medals: true,
  mustache: true,
  belt: "#3a2614",
  boots: "#2a1a10",
  wide: 1.12,
  seed: 64,
};

const CHAR_LABELS: [string, string, string, string][] = [
  ["Sersan Dodi", "Pria · suara: dodi", "Asisten uji kendali senjata. Sok yakin merpati lebih pintar dari radar.", "Seragam zaitun AS, topi lapangan, sabuk & kantong, bot."],
  ["Kopral Ara", "Wanita · suara: ara", "Anggota WAC perawat merpati. Polos, sayang burung & bawa kantong jagung.", "Seragam zaitun, rok, dasi, rambut disanggul, bot."],
  ["Prof. B.F. Skinner", "Pria · figuran (tanpa dialog)", "Psikolog perilaku penggagas Proyek Merpati (10.000 patukan!).", "Jas putih peneliti, dasi merah tua, papan catatan."],
  ["Pak Jenderal", "Pria · figuran (fiktif)", "Penguji komite NDRC yang skeptis. Truk kantin jagungnya diserbu merpati.", "Topi perwira, medali dada, kumis tebal, bot kulit."],
  ["Skuadron 3 Merpati", "Bintang tamu", "3 pilot merpati berompi Pelican, memilih arah rudal lewat voting mayoritas.", "Rompi sabuk emas, kacamata pilot, ekspresi fokus/lapar/kaget."],
];

export const SheetMerpatiKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#ffe6c4, #eab186)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 19, near: 0.5, far: 200, position: [0, 1.6, 25] }}>
      <CameraRig position={[0, 1.6, 25]} lookAt={[0, 2.1, 0]} fov={19} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#e3c598" roughness={1} />
      </mesh>
      <BeanCard position={[-5.8, 0, 0]} height={3.1} params={{ ...DODI_M, expr: "smug", armL: [-20, -40], armR: [80, -55] }} />
      <BeanCard position={[-3.0, 0, 0]} height={2.95} params={{ ...ARA_M, expr: "happy", armL: [-20, -30], armR: [68, -50] }} />
      <CornBag3D pos={[-2.42, 1.38, 0.1]} scale={1.15} />
      <BeanCard position={[-0.2, 0, 0]} height={3.0} params={{ ...SKINNER, expr: "think", prop: "paper", armL: [-25, -35], armR: [72, -45] }} />
      <BeanCard position={[2.6, 0, 0]} height={3.2} params={{ ...JENDERAL_M, expr: "angry", armL: [-15, -30], armR: [20, -20] }} />
      <PigeonCard position={[5.15, 2.15, 0]} size={1.65} params={{ flap: 0.55, expr: "focus", harness: true, goggles: true, seed: 1 }} />
      <PigeonCard position={[4.55, 0.25, 0]} size={1.15} params={{ flap: 0, peck: 0.75, expr: "hungry", harness: true, corn: true, seed: 2 }} shadow />
      <PigeonCard position={[5.85, 0.25, 0]} size={1.15} params={{ flap: 0, expr: "smug", harness: true, faceDir: -1, seed: 3 }} shadow />
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.7]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.1} color="#fff0d8" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#241726", letterSpacing: 2 }}>
      KARAKTER · "RUDAL MERPATI 1944" (GAYA BOM KELELAWAR / BEAN BANDUNG)
    </div>
    <div style={{ position: "absolute", bottom: 18, left: 20, right: 20, display: "flex", gap: 14 }}>
      {CHAR_LABELS.map(([n, r, d, o]) => (
        <div key={n} style={{ width: 380, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 26, color: "#241726" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#991b1b" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#4a3340", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          <div style={{ fontWeight: 500, fontSize: 14, color: "#6a4a50", marginTop: 2, lineHeight: 1.2 }}>{o}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

/* ================================================================== */
/* EKSPRESI SERSAN DODI & KOPRAL ARA                                   */
/* ================================================================== */
const EXPRS: [BeanExpr, string][] = [
  ["neutral", "biasa"], ["talk", "bicara"], ["smug", "sok yakin"], ["happy", "senang"],
  ["think", "mikir"], ["worried", "cemas"], ["shock", "kaget"], ["scared", "takut"],
];

export const SheetMerpatiEkspresi: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#fff0dc, #f0c8a6)" }}>
    <ThreeCanvas width={2000} height={1150} camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 26] }}>
      <CameraRig position={[0, 1.6, 26]} lookAt={[0, 1.55, 0]} fov={22} />
      {EXPRS.map(([e], i) => (
        <BeanCard
          key={`d${e}`}
          position={[-7.2 + i * 2.05, 2.2, 0]}
          height={2.3}
          shadow={false}
          params={{ ...DODI_M, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "worried" }}
        />
      ))}
      {EXPRS.map(([e], i) => (
        <BeanCard
          key={`a${e}`}
          position={[-7.2 + i * 2.05, -1.35, 0]}
          height={2.2}
          shadow={false}
          params={{ ...ARA_M, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "worried" }}
        />
      ))}
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.9]} />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#241726", letterSpacing: 2 }}>
      EKSPRESI · SERSAN DODI (ATAS) & KOPRAL ARA (BAWAH)
    </div>
    {[0, 1].map((r) => (
      <div key={r} style={{ position: "absolute", top: r ? 970 : 525, left: 120, right: 120, display: "flex", justifyContent: "space-between" }}>
        {EXPRS.map(([, lbl]) => (
          <div key={lbl} style={{ width: 200, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 22, color: "#5a2a30" }}>{lbl}</div>
        ))}
      </div>
    ))}
  </AbsoluteFill>
);

/* ================================================================== */
/* PROPERTI 3D · 3 LATAR "RUDAL MERPATI 1944"                          */
/* ================================================================== */
const PROP_ROWS: { title: string; items: [string, string][] }[] = [
  {
    title: "LATAR 1 · KERETA & PABRIK TEPUNG MINNESOTA (1940, SENJA)",
    items: [
      ["Gerbong Kereta 1940-an", "Tempat Prof. Skinner melihat burung bermanuver"],
      ["Silo & Pabrik Tepung", "Markas awal riset General Mills di Minneapolis"],
      ["Kawanan Merpati Manuver", "Terbang serempak seperti sistem kendali hidup"],
      ["Kantong Jagung Hadiah", "Objek 3D terpisah untuk latih & pemicu kacau"],
    ],
  },
  {
    title: "LATAR 2 · LAB PELATIHAN 'PROJECT PIGEON' ($25,000)",
    items: [
      ["Kotak Latih Skinner", "Layar proyeksi kapal + lampu hijau + jagung"],
      ["Meja Penghitung 10.000×", "Penghitung patukan, toples jagung & berkas rahasia"],
      ["Moncong Pelican 3-Layar", "Cutaway 3 lensa optik & 3 kabin voting merpati"],
      ["Merpati Pilot Berompi", "Rompi Pelican + kontak paruh + kacamata pilot"],
    ],
  },
  {
    title: "LATAR 3 · LAPANGAN UJI SIMULASI NDRC (OKTOBER 1944)",
    items: [
      ["Bom Luncur Pelican & Rig", "Berayun kiri-kanan mengikuti voting 3 merpati"],
      ["Papan Target Kapal", "Sasaran resmi yang seharusnya dipatuk lurus"],
      ["Truk Kantin Jagung Jenderal", "Sasaran salah belok saat Ara menumpahkan jagung!"],
      ["Perangkat Radar 1944", "Teknologi elektronik pengganti merpati pilot"],
    ],
  },
];

export const SheetMerpatiProperti: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#fbe4c6, #efc3a8)" }}>
    <ThreeCanvas width={2000} height={1440} shadows camera={{ fov: 28, near: 0.5, far: 200, position: [0, 2.2, 26] }}>
      <CameraRig position={[0, 2.2, 26]} lookAt={[0, 1.9, 0]} fov={28} />
      <hemisphereLight args={["#fff8ea", "#9c8080", 1.7]} />
      <directionalLight position={[-8, 12, 16]} intensity={2.0} color="#ffe8c8" />

      {/* Baris 1: Minnesota 1940 */}
      <group position={[-7.0, 4.95, 0]} scale={0.36} rotation={[0, 0.2, 0]}><TrainCoach /></group>
      <group position={[-2.3, 4.78, 0]} scale={0.36} rotation={[0, -0.25, 0]}><GrainSilo /></group>
      <PigeonFlock center={[2.4, 5.65, 0]} count={10} spread={[3.0, 1.1, 0.5]} t={0.4} size={0.44} drift={[0, 0, 0]} seed={5} />
      <group position={[7.2, 5.15, 0]} scale={2.6} rotation={[0.15, -0.3, 0]}><CornBag3D spill={0.55} /></group>

      {/* Baris 2: Lab Project Pigeon */}
      <group position={[-7.1, 0.72, 0]} scale={0.78} rotation={[0.08, -0.24, 0]}><SkinnerBox pecked={0.65} /></group>
      <group position={[-2.4, 0.88, 0]} scale={0.92} rotation={[0.22, 0, 0]}><ControlDesk /></group>
      <group position={[2.4, 0.72, 0]} scale={0.82}><PelicanNoseCone open={0.95} peckPhase={0.35} /></group>
      <PigeonCard position={[7.2, 1.18, 0]} size={2.0} params={{ flap: 0.5, expr: "focus", harness: true, goggles: true, seed: 8 }} />

      {/* Baris 3: Lapangan Uji 1944 */}
      <group position={[-7.0, -3.48, 0]} scale={0.41} rotation={[0, 0.25, 0]}><PelicanRig yaw={0.32} peckPhase={0.5} /></group>
      <group position={[-2.4, -3.18, 0]} scale={0.66} rotation={[0, -0.2, 0]}><ShipTargetBoard /></group>
      <group position={[2.4, -3.22, 0]} scale={0.55} rotation={[0, -0.35, 0]}><CanteenTruck chaos={1} t={0.5} /></group>
      <group position={[7.2, -3.25, 0]} scale={0.72} rotation={[0, -0.3, 0]}><RadarSet1944 t={0.4} /></group>
    </ThreeCanvas>

    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 48, color: "#241726", letterSpacing: 2 }}>
      PROPERTI 3D · 3 LATAR "RUDAL MERPATI 1944 (PROJECT PIGEON)"
    </div>
    {PROP_ROWS.map((row, rIdx) => (
      <div key={row.title} style={{ position: "absolute", top: 452 + rIdx * 450, left: 50, right: 50 }}>
        <div style={{ position: "absolute", top: [-355, -332, -330][rIdx], left: 0, fontFamily: "Anton, Impact, sans-serif", fontSize: 26, color: "#7a1f1f", background: "#fff3e2", padding: "2px 12px", borderRadius: 6 }}>
          {row.title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {row.items.map(([name, desc]) => (
            <div key={name} style={{ width: 440, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: "#241726" }}>{name}</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#5a3444" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </AbsoluteFill>
);


import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanParams, BeanExpr } from "./three/objectsBean";
import { FireCluster } from "./three/objectsBandung";
import {
  BatCanister, BatCard, BatFridge, CaveMouth, Cactus, FuelTank, Hangar, LabBench, Mesa, StaffCar, BatSwarm, Runway,
} from "./three/objectsKelelawar";

/* ================================================================== */
/* CAST "BOM KELELAWAR 1943" (gaya Bean Bandung)                       */
/* ================================================================== */
export const DODI: BeanParams = {
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
  seed: 51,
};
export const ARA: BeanParams = {
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
  seed: 52,
};
export const ADAMS: BeanParams = {
  skin: "#f3d6bc",
  torso: "#f4f2ea",
  sleeves: "#f4f2ea",
  pants: "#4a4a52",
  coat: true,
  tie: "#2f4a7a",
  hair: "#cfcac4",
  hat: "none",
  seed: 53,
};
export const JENDERAL: BeanParams = {
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
  seed: 54,
};

const CHAR_LABELS: [string, string, string, string][] = [
  ["Sersan Dodi", "Pria · suara: dodi", "Tentara AS penjaga proyek. Sok yakin, bangga pada \"senjata rahasia\".", "Seragam zaitun, topi lapangan, sabuk & kantong, bot."],
  ["Kopral Ara", "Wanita · suara: ara", "Anggota korps wanita AD (WAC), pengurus kelelawar. Polos & banyak tanya.", "Seragam zaitun, rok, dasi, rambut disanggul, bot."],
  ["Dr. Adams", "Pria · figuran (tanpa dialog)", "Dokter gigi penggagas ide bom kelelawar.", "Jas putih dokter, dasi biru, rambut uban."],
  ["Pak Jenderal", "Pria · figuran (fiktif)", "Datang meninjau uji coba. Mobilnya ikut terbakar.", "Topi perwira, medali, kumis, bot kulit."],
  ["Kelelawar", "Bintang tamu", "Kelelawar ekor bebas Meksiko, membawa tabung bakar mini.", "Sayap mengepak, ekspresi: senang/licik/kaget/beku."],
];

export const SheetKelelawarKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#ffe2c0, #e9a77e)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 19, near: 0.5, far: 200, position: [0, 1.6, 25] }}>
      <CameraRig position={[0, 1.6, 25]} lookAt={[0, 2.1, 0]} fov={19} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#e6c49a" roughness={1} />
      </mesh>
      <BeanCard position={[-5.8, 0, 0]} height={3.1} params={{ ...DODI, expr: "smug", armL: [-20, -40], armR: [70, -60] }} />
      <BeanCard position={[-3.0, 0, 0]} height={2.95} params={{ ...ARA, expr: "think", prop: "paper", armL: [-20, -30], armR: [65, -55] }} />
      <BeanCard position={[-0.2, 0, 0]} height={3.0} params={{ ...ADAMS, expr: "happy", armL: [-30, -40], armR: [120, -20] }} />
      <BeanCard position={[2.6, 0, 0]} height={3.2} params={{ ...JENDERAL, expr: "angry", armL: [-15, -30], armR: [20, -20] }} />
      <BatCard position={[5.0, 2.6, 0]} size={1.7} params={{ flap: 0.6, expr: "sneaky", bomb: true, fuse: 0.7, seed: 3 }} />
      <BatCard position={[5.2, 0.75, 0]} size={1.1} params={{ flap: 0, expr: "frozen", frost: 1, seed: 4 }} />
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.7]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.1} color="#fff0d8" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#241726", letterSpacing: 2 }}>
      KARAKTER · "BOM KELELAWAR 1943" (GAYA BEAN BANDUNG)
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
/* EKSPRESI DODI & ARA                                                 */
/* ================================================================== */
const EXPRS: [BeanExpr, string][] = [
  ["neutral", "biasa"], ["talk", "bicara"], ["smug", "sok yakin"], ["happy", "senang"], ["think", "mikir"], ["worried", "cemas"], ["shock", "kaget"], ["scared", "takut"],
];
export const SheetKelelawarEkspresi: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#fff0dc, #f0c8a6)" }}>
    <ThreeCanvas width={2000} height={1150} camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 26] }}>
      <CameraRig position={[0, 1.6, 26]} lookAt={[0, 1.55, 0]} fov={22} />
      {EXPRS.map(([e], i) => (
        <BeanCard key={`d${e}`} position={[-7.2 + i * 2.05, 2.35, 0]} height={2.3} shadow={false} params={{ ...DODI, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "worried" }} />
      ))}
      {EXPRS.map(([e], i) => (
        <BeanCard key={`a${e}`} position={[-7.2 + i * 2.05, -1.1, 0]} height={2.2} shadow={false} params={{ ...ARA, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "worried" }} />
      ))}
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.9]} />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#241726", letterSpacing: 2 }}>
      EKSPRESI · SERSAN DODI (ATAS) & KOPRAL ARA (BAWAH)
    </div>
    {[0, 1].map((r) => (
      <div key={r} style={{ position: "absolute", top: r ? 1100 : 560, left: 120, right: 120, display: "flex", justifyContent: "space-between" }}>
        {EXPRS.map(([, lbl]) => (
          <div key={lbl} style={{ width: 200, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 22, color: "#5a2a30" }}>{lbl}</div>
        ))}
      </div>
    ))}
  </AbsoluteFill>
);

/* ================================================================== */
/* PROPERTI · 3 LATAR                                                  */
/* ================================================================== */
const PROP_ROWS: { title: string; items: [string, string][] }[] = [
  {
    title: "LATAR 1 · GUA CARLSBAD, NEW MEXICO (SENJA)",
    items: [["Mulut Gua Carlsbad", "Tebing bergaris, stalaktit, papan nama"], ["Mesa & Kaktus", "Bukit batu merah bergaris + kaktus"], ["Kawanan Kelelawar", "Jutaan kelelawar keluar gua saat senja"], ["Mobil Sedan 1940-an", "Kendaraan Dr. Adams & Jenderal"]],
  },
  {
    title: "LATAR 2 · LAB PROYEK RAHASIA",
    items: [["Kulkas Hibernasi", "Rak baki, kelelawar beku, \"JANGAN DIBUKA!\""], ["Meja Lab", "Tabung bakar mini, map PROYEK X-RAY, lampu"], ["Bom Wadah Kelelawar", "Casing terbelah, baki bertingkat, sirip"], ["Kelelawar + Tabung", "Tabung bakar diikat di perut"]],
  },
  {
    title: "LATAR 3 · PANGKALAN UDARA CARLSBAD (KLIMAKS)",
    items: [["Hangar Quonset", "Seng bergelombang + papan CARLSBAD ARMY AIRFIELD"], ["Tangki BBM", "Kaki besi, kelelawar bergelantungan di bawahnya"], ["Mobil Dinas Jenderal", "Model 1940-an, bintang di pintu"], ["Landasan & Api", "Landasan beton + api menjalar"]],
  },
];

export const SheetKelelawarProperti: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#fbe4c6, #efc3a8)" }}>
    <ThreeCanvas width={2000} height={1440} shadows camera={{ fov: 28, near: 0.5, far: 200, position: [0, 2.2, 26] }}>
      <CameraRig position={[0, 2.2, 26]} lookAt={[0, 1.9, 0]} fov={28} />
      <hemisphereLight args={["#fff8ea", "#9c8080", 1.7]} />
      <directionalLight position={[-8, 12, 16]} intensity={2.0} color="#ffe8c8" />
      {/* baris 1 */}
      <group position={[-7.0, 4.4, 0]} scale={0.3}><CaveMouth /></group>
      <group position={[-2.4, 4.6, 0]} scale={0.32}><Mesa pos={[-1, 0, -2]} w={6} h={3.2} /><Cactus pos={[3, 0, 1]} s={1.2} /><Cactus pos={[-3.5, 0, 2]} s={0.8} /></group>
      <BatSwarm center={[2.4, 5.6, 0]} count={12} spread={[3.4, 1.4, 0.5]} t={0.4} size={0.42} drift={[0, 0, 0]} seed={2} />
      <group position={[7.2, 4.8, 0]} scale={0.55}><StaffCar rot={[0, -0.5, 0]} /></group>
      {/* baris 2 */}
      <group position={[-7.2, 0.6, 0]} scale={0.62} rotation={[0, 0.35, 0]}><BatFridge open={0.75} t={0.3} /></group>
      <group position={[-2.4, 0.9, 0]} scale={0.95} rotation={[0.25, 0, 0]}><LabBench /></group>
      <group position={[2.4, 0.8, 0]} scale={1.0}><BatCanister open={0.35} /></group>
      <BatCard position={[7.2, 2.0, 0]} size={2.0} params={{ flap: 0.55, expr: "happy", bomb: true, seed: 9 }} />
      {/* baris 3 */}
      <group position={[-6.8, -3.0, 0]} scale={0.27} rotation={[0, -0.5, 0]}><Hangar /></group>
      <group position={[-2.4, -3.2, 0]} scale={0.52}><FuelTank bats={8} /></group>
      <group position={[2.4, -2.9, 0]} scale={0.62}><StaffCar rot={[0, 0.4, 0]} burn={0.8} t={0.5} soot={0.5} /></group>
      <group position={[7.2, -3.1, 0]} scale={0.55} rotation={[0.35, 0.5, 0]}><Runway len={10} /><FireCluster pos={[0.4, 0, -1]} scale={1.1} t={0.6} seed={4} /></group>
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 48, color: "#241726", letterSpacing: 2 }}>
      PROPERTI 3D · 3 LATAR "BOM KELELAWAR 1943"
    </div>
    {PROP_ROWS.map((row, rIdx) => (
      <div key={row.title} style={{ position: "absolute", top: 448 + rIdx * 450, left: 50, right: 50 }}>
        <div style={{ position: "absolute", top: [-330, -320, -318][rIdx], left: 0, fontFamily: "Anton, Impact, sans-serif", fontSize: 26, color: "#7a1f1f", background: "#fff3e2", padding: "2px 12px", borderRadius: 6 }}>{row.title}</div>
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

import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanParams, BeanExpr } from "./three/objectsBean";
import { RabbitCard } from "./three/objectsKelinci";

/* ================================================================== */
/* CAST "NAPOLEON VS KELINCI" (legenda, 1807): Dodi = Kaisar, Ara = ajudan fiktif */
/* ================================================================== */
export const KAISAR: BeanParams = {
  skin: "#f2d2b0",
  torso: "#223c78",
  sleeves: "#223c78",
  pants: "#f1ead8",
  hat: "bicorne",
  hatColor: "#1c1a22",
  hair: "#3a2a20",
  sideHair: "#3a2a20",
  bandolier: "#f4f0e6",
  medals: true,
  belt: "#d8aa3a",
  boots: "#1c1816",
  wide: 1.08,
  seed: 61,
};
export const AJUDAN: BeanParams = {
  skin: "#f6dcc0",
  torso: "#7a2430",
  sleeves: "#7a2430",
  skirt: "#2c3556",
  batik: "#d8aa3a",
  hat: "sanggul",
  hair: "#3a2418",
  sideHair: "#3a2418",
  tie: "#f4f0e6",
  belt: "#d8aa3a",
  boots: "#1c1816",
  medals: true,
  seed: 62,
};
export const PETANI: BeanParams = {
  skin: "#e8c49c",
  torso: "#9a8458",
  sleeves: "#9a8458",
  pants: "#5c4a34",
  hat: "cap",
  hatColor: "#7a5a3a",
  apron: "#d8c8a0",
  mustache: true,
  boots: "#3a2a1e",
  seed: 63,
};
export const PENGAWAL: BeanParams = {
  skin: "#f0cfae",
  torso: "#2a4a8a",
  sleeves: "#2a4a8a",
  pants: "#f1ead8",
  hat: "guardhelmet",
  hatColor: "#1c1a22",
  bandolier: "#f4f0e6",
  belt: "#d8aa3a",
  boots: "#1c1816",
  mustache: true,
  wide: 1.05,
  seed: 64,
};

const LABELS: [string, string, string, string][] = [
  ["Kaisar Napoleon", "Pria · suara: dodi", "Penakluk Eropa yang bosan setelah menang. Percaya diri, mudah panik.", "Topi bicorne dengan kokade, mantel biru, sabuk silang putih, kancing & medali emas."],
  ["Ajudan Ara", "Wanita · suara: ara · tokoh fiktif", "Pengatur acara berburu. Rajin, ceria, dan agak ceroboh.", "Jaket merah tua berkancing emas, rok biru, sanggul, bot hitam."],
  ["Pak Petani", "Figuran (tanpa suara)", "Penjual kelinci jinak dari peternakan.", "Topi cokelat, celemek, kumis."],
  ["Pengawal Kaisar", "Figuran (tanpa suara)", "Menjaga Kaisar, ikut lari saat kelinci menyerbu.", "Helm pengawal, mantel biru, sabuk putih."],
  ["Kelinci Peternakan", "Bintang tamu", "Jinak, tidak takut manusia, dan LAPAR.", "Dua pose (duduk, melompat), ekspresi: polos, lapar, kenyang, kaget."],
];

export const SheetNapoleonKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#e8ecf8, #cdb8a0)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 19, near: 0.5, far: 200, position: [0, 1.6, 25] }}>
      <CameraRig position={[0, 1.6, 25]} lookAt={[0, 2.1, 0]} fov={19} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#d8c4a4" roughness={1} />
      </mesh>
      <BeanCard position={[-6.2, 0, 0]} height={3.15} params={{ ...KAISAR, expr: "smug", armL: [-20, -30], armR: [60, -75] }} />
      <BeanCard position={[-3.5, 0, 0]} height={2.95} params={{ ...AJUDAN, expr: "happy", prop: "paper", armL: [-20, -30], armR: [65, -55] }} />
      <BeanCard position={[-0.9, 0, 0]} height={2.9} params={{ ...PETANI, expr: "neutral", armL: [-20, -30], armR: [30, -30] }} />
      <BeanCard position={[2.0, 0, 0]} height={3.1} params={{ ...PENGAWAL, expr: "neutral", armL: [-15, -20], armR: [20, -20] }} />
      <RabbitCard position={[4.4, 0, 0]} size={1.5} params={{ pose: "sit", expr: "polos" }} />
      <RabbitCard position={[6.0, 0, 0.3]} size={1.4} params={{ pose: "hop", expr: "lapar", mouth: 0.5, fur: "#cdb594" }} />
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.7]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.1} color="#fff0d8" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#241726", letterSpacing: 2 }}>
      KARAKTER · "NAPOLEON VS KELINCI" (LEGENDA 1807)
    </div>
    <div style={{ position: "absolute", bottom: 18, left: 20, right: 20, display: "flex", gap: 14 }}>
      {LABELS.map(([n, r, d, o]) => (
        <div key={n} style={{ width: 380, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 26, color: "#241726" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#991b1b" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#4a3340", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          <div style={{ fontWeight: 500, fontSize: 14, color: "#6a4a50", marginTop: 2, lineHeight: 1.2 }}>{o}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const EXPRS: [BeanExpr, string][] = [
  ["neutral", "biasa"], ["talk", "bicara"], ["smug", "bangga"], ["happy", "senang"], ["think", "mikir"], ["shock", "kaget"], ["scared", "panik"], ["angry", "marah"],
];
export const SheetNapoleonEkspresi: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#f2f0f8, #e0c8b0)" }}>
    <ThreeCanvas width={2000} height={1150} camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 26] }}>
      <CameraRig position={[0, 1.6, 26]} lookAt={[0, 1.55, 0]} fov={22} />
      {EXPRS.map(([e], i) => (
        <BeanCard key={`k${e}`} position={[-7.2 + i * 2.05, 2.35, 0]} height={2.3} shadow={false} params={{ ...KAISAR, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "shock" }} />
      ))}
      {EXPRS.map(([e], i) => (
        <BeanCard key={`a${e}`} position={[-7.2 + i * 2.05, -1.1, 0]} height={2.2} shadow={false} params={{ ...AJUDAN, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "shock" }} />
      ))}
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.9]} />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#241726", letterSpacing: 2 }}>
      EKSPRESI · KAISAR NAPOLEON (ATAS) & AJUDAN ARA (BAWAH)
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

import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CameraRig, Vec3 } from "./three/objects";
import { BeanCard, BeanExpr, BeanParams } from "./three/objectsBean";
import { WoodenBucket3D } from "./three/objectsEmber";

/* ================================================================== */
/* LOADER DUNIA BLENDER (public/models/ember.glb)                     */
/* ================================================================== */
const OX = { L1: 0, L2: 400, L3: 800, L4: 1200 };
type EmberLatar = "L1_Museum" | "L2_Balai" | "L3_Zappolino" | "L4_Gerbang";
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];

let emberWorldCache: Promise<THREE.Group> | null = null;
const loadEmberWorld = (): Promise<THREE.Group> => {
  if (!emberWorldCache) {
    emberWorldCache = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        staticFile("models/ember.glb"),
        (g) => {
          g.scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              const nm = m.name;
              m.castShadow = !(nm.includes("Meadow") || nm.includes("Dirt") || nm.includes("Cobble") || nm.includes("Marble") || nm.includes("Terracotta") || nm.includes("Hill"));
              m.receiveShadow = true;
              m.frustumCulled = false;
            }
          });
          resolve(g.scene);
        },
        undefined,
        reject
      );
    });
  }
  return emberWorldCache;
};

export const EmberWorld: React.FC<{ only: EmberLatar }> = ({ only }) => {
  const invalidate = useThree((st) => st.invalidate);
  const advance = useThree((st) => st.advance);
  const [raw, setRaw] = useState<THREE.Group | null>(null);
  const [h] = useState(() => delayRender(`ember.glb:${only}`));
  useEffect(() => {
    loadEmberWorld()
      .then(setRaw)
      .catch((e) => {
        console.error(e);
        continueRender(h);
      });
  }, [h]);
  useEffect(() => {
    if (!raw) return;
    invalidate();
    const id = setTimeout(() => {
      invalidate();
      advance(performance.now() / 1000, true);
      continueRender(h);
    }, 400);
    return () => clearTimeout(id);
  }, [raw, h, invalidate, advance]);
  const scene = useMemo(() => {
    if (!raw) return null;
    const cloned = raw.clone(true);
    cloned.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.visible = o.name.startsWith(only);
      }
    });
    return cloned;
  }, [raw, only]);
  return scene ? <primitive object={scene} /> : null;
};

/* ================================================================== */
/* CAST "PERANG EMBER KAYU 1325" (Modena vs Bologna): Dodi + Ara      */
/* ================================================================== */
export const KOMANDAN: BeanParams = {
  skin: "#f2d2b0",
  torso: "#22468a",
  sleeves: "#22468a",
  pants: "#d8ceb8",
  hat: "brodie",
  hatColor: "#7e8694",
  hair: "#3c2b20",
  sideHair: "#3c2b20",
  bandolier: "#5c3b20",
  medals: true,
  belt: "#d8aa3a",
  boots: "#241b16",
  wide: 1.08,
  seed: 71,
};

export const UTUSAN_ARA: BeanParams = {
  skin: "#f6dcc0",
  torso: "#9e2430",
  sleeves: "#9e2430",
  skirt: "#2c3556",
  batik: "#e0b64a",
  hat: "sanggul",
  hair: "#3a2418",
  sideHair: "#3a2418",
  tie: "#f4f0e6",
  belt: "#d8aa3a",
  boots: "#1c1816",
  seed: 72,
};

export const PRAJURIT_MODENA: BeanParams = {
  skin: "#ecc8a0",
  torso: "#2a56a3",
  sleeves: "#2a56a3",
  pants: "#4b4a46",
  hat: "helmet",
  hatColor: "#6d7582",
  belt: "#d8aa3a",
  boots: "#241b16",
  mustache: true,
  prop: "spear",
  seed: 73,
};

export const MILISI_BOLOGNA: BeanParams = {
  skin: "#f0cfae",
  torso: "#b82e35",
  sleeves: "#f0e8d8",
  pants: "#5e4c3a",
  hat: "cap",
  hatColor: "#7a5838",
  belt: "#4a3320",
  boots: "#33251a",
  prop: "spear",
  seed: 74,
};

const LABELS: [string, string, string, string][] = [
  ["Komandan Modena", "Pria · suara: dodi", "Tenang, licik, santai tapi suka menyindir.", "Helm besi ringan, tunik biru-emas, selempang kulit, medali, bot gelap."],
  ["Utusan Bologna (Ara)", "Wanita · suara: ara · fiktif", "Heboh, gampang kaget, emosional soal harga diri kota.", "Tunik merah marun Bologna, rok biru bermotif emas, sanggul, bot hitam."],
  ["Prajurit Modena", "Figuran (tanpa suara)", "Pasukan veteran disiplin (7.000 orang).", "Helm baja, tunik biru, sabuk emas, tombak."],
  ["Milisi Bologna", "Figuran (tanpa suara)", "Pasukan banyak (32.000) tapi kurang terlatih.", "Topi kain cokelat, tunik merah-putih, tombak."],
  ["Ember Kayu (Secchia)", "Objek 3D terpisah", "Bintang tamu! Diperebutkan & dipajang 700 tahun.", "Kayu ek, 2 ring besi, gagang besi + tali rami."],
];

/* ------------------------------------------------------------------ */
/* 1. LEMBAR KARAKTER (2000 x 1150)                                   */
/* ------------------------------------------------------------------ */
export const SheetEmberKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#e8ecf8, #d4be9e)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 19, near: 0.5, far: 200, position: [0, 1.6, 25] }}>
      <CameraRig position={[0, 1.6, 25]} lookAt={[0, 2.0, 0]} fov={19} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#d8c4a4" roughness={1} />
      </mesh>
      <BeanCard position={[-6.0, 0, 0]} height={3.15} params={{ ...KOMANDAN, expr: "smug", armL: [-20, -30], armR: [55, -70] }} />
      <BeanCard position={[-3.0, 0, 0]} height={2.95} params={{ ...UTUSAN_ARA, expr: "shock", sweat: true, armL: [-45, -60], armR: [50, -65] }} />
      <BeanCard position={[0.0, 0, 0]} height={3.05} params={{ ...PRAJURIT_MODENA, expr: "neutral", armL: [-15, -25], armR: [35, -35] }} />
      <BeanCard position={[3.0, 0, 0]} height={2.95} params={{ ...MILISI_BOLOGNA, expr: "scared", sweat: true, armL: [-25, -40], armR: [30, -20] }} />
      <group position={[5.8, 0, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.9, 1.2]} />
          <meshStandardMaterial color="#6e222b" roughness={0.8} />
        </mesh>
        <WoodenBucket3D position={[0, 0.92, 0]} scale={2.1} withRope />
      </group>
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.75]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.1} color="#fff0d8" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#241726", letterSpacing: 2 }}>
      KARAKTER · "PERANG EMBER KAYU 1325" (MODENA VS BOLOGNA)
    </div>
    <div style={{ position: "absolute", bottom: 18, left: 20, right: 20, display: "flex", gap: 14 }}>
      {LABELS.map(([n, r, d, o]) => (
        <div key={n} style={{ width: 380, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 25, color: "#241726" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#991b1b" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#4a3340", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          <div style={{ fontWeight: 500, fontSize: 14, color: "#6a4a50", marginTop: 2, lineHeight: 1.2 }}>{o}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */
/* 2. LEMBAR EKSPRESI (2000 x 1150)                                   */
/* ------------------------------------------------------------------ */
const EXPRS: [BeanExpr, string][] = [
  ["neutral", "biasa"],
  ["talk", "bicara"],
  ["smug", "licik/bangga"],
  ["happy", "senang"],
  ["think", "curiga/tanya"],
  ["shock", "KAGET"],
  ["scared", "panik"],
  ["angry", "marah"],
];
export const SheetEmberEkspresi: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#f2f0f8, #e0c8b0)" }}>
    <ThreeCanvas width={2000} height={1150} camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 26] }}>
      <CameraRig position={[0, 1.6, 26]} lookAt={[0, 1.55, 0]} fov={22} />
      {EXPRS.map(([e], i) => (
        <BeanCard
          key={`k${e}`}
          position={[-7.2 + i * 2.05, 2.35, 0]}
          height={2.3}
          shadow={false}
          params={{ ...KOMANDAN, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "shock" }}
        />
      ))}
      {EXPRS.map(([e], i) => (
        <BeanCard
          key={`a${e}`}
          position={[-7.2 + i * 2.05, -1.1, 0]}
          height={2.2}
          shadow={false}
          params={{ ...UTUSAN_ARA, expr: e, mouthOpen: e === "talk" ? 0.7 : 0, sweat: e === "scared" || e === "shock" }}
        />
      ))}
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.9]} />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#241726", letterSpacing: 2 }}>
      EKSPRESI · KOMANDAN MODENA (ATAS) &amp; UTUSAN ARA (BAWAH)
    </div>
    {[0, 1].map((r) => (
      <div key={r} style={{ position: "absolute", top: r ? 1095 : 555, left: 100, right: 100, display: "flex", justifyContent: "space-between" }}>
        {EXPRS.map(([, lbl]) => (
          <div key={lbl} style={{ width: 200, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 22, color: "#5a2a30" }}>
            {lbl}
          </div>
        ))}
      </div>
    ))}
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */
/* 3. PREVIEW LATAR BLENDER 3D & ADEGAN (2160 x 1920 — 6 PANEL 3x2)   */
/* ------------------------------------------------------------------ */
const Panel: React.FC<{
  title: string;
  caption: string;
  bg: string;
  children: React.ReactNode;
}> = ({ title, caption, bg, children }) => (
  <div style={{ position: "relative", width: 700, height: 920, overflow: "hidden", borderRadius: 20, border: "6px solid #241726", background: bg }}>
    <ThreeCanvas width={700} height={920} shadows camera={{ fov: 44, near: 0.2, far: 400, position: [0, 2.2, 6.2] }}>
      {children}
    </ThreeCanvas>
    <div
      style={{
        position: "absolute",
        top: 18,
        left: 18,
        right: 18,
        background: "rgba(255,250,240,0.95)",
        border: "4px solid #7a1f28",
        borderRadius: 14,
        padding: "8px 16px",
        textAlign: "center",
        fontFamily: "Anton, Impact, sans-serif",
        fontSize: 28,
        color: "#241726",
        letterSpacing: 1,
      }}
    >
      {title}
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 18,
        left: 18,
        right: 18,
        background: "rgba(36,23,38,0.88)",
        borderRadius: 12,
        padding: "10px 14px",
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
        fontWeight: 800,
        fontSize: 21,
        color: "#ffe47a",
      }}
    >
      {caption}
    </div>
  </div>
);

export const SheetEmberAdegan: React.FC = () => (
  <AbsoluteFill style={{ background: "#1b1420", padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {/* PANEL 1: HOOK — MUSEUM GHIRLANDINA (BLENDER L1) */}
      <Panel title="1. HOOK · MUSEUM GHIRLANDINA (BLENDER)" caption={`Ara: "Hah?! Ember kayu?!"`} bg="linear-gradient(#f5ecd8, #d8c7a8)">
        <CameraRig position={bl(0.3, -4.8, 2.35, OX.L1)} lookAt={bl(0.05, 1.3, 1.9, OX.L1)} fov={45} />
        <EmberWorld only="L1_Museum" />
        <WoodenBucket3D position={bl(0, 1.3, 1.56, OX.L1)} scale={1.4} withRope={false} />
        <BeanCard position={bl(1.1, -0.7, 0, OX.L1)} height={2.55} params={{ ...UTUSAN_ARA, expr: "shock", sweat: true, look: -0.7, armL: [-55, -80], armR: [45, -60] }} />
        <hemisphereLight args={["#fff8ea", "#b8928a", 1.55]} />
        <directionalLight position={bl(3, -5, 6, OX.L1)} intensity={1.7} color="#fff2dc" castShadow />
        <pointLight position={bl(0, 1.3, 4.3, OX.L1)} intensity={16} color="#ffecc0" distance={12} />
      </Panel>

      {/* PANEL 2: RIVAL — BALAI DEWAN BOLOGNA (BLENDER L2) */}
      <Panel title="2. RIVAL · BALAI DEWAN BOLOGNA (BLENDER)" caption={`Ara: "Kastil kita direbut?! Serang!"`} bg="linear-gradient(#f0dcc0, #c8a27a)">
        <CameraRig position={bl(0, -4.6, 2.55, OX.L2)} lookAt={bl(0, 1.2, 1.75, OX.L2)} fov={45} />
        <EmberWorld only="L2_Balai" />
        <BeanCard position={bl(-0.95, 2.25, 0, OX.L2)} height={2.75} params={{ ...KOMANDAN, expr: "smug", look: 0.5, armR: [70, -45] }} />
        <BeanCard position={bl(0.95, -0.65, 0, OX.L2)} height={2.55} params={{ ...UTUSAN_ARA, expr: "angry", look: -0.5, armL: [-50, -30], armR: [55, -35] }} />
        <hemisphereLight args={["#fff5e0", "#a67858", 1.6]} />
        <directionalLight position={bl(-4, -5, 7, OX.L2)} intensity={1.8} color="#ffebd0" castShadow />
        <pointLight position={bl(1.85, 1.35, 2.5, OX.L2)} intensity={8} color="#ffca70" distance={8} />
      </Panel>

      {/* PANEL 3: JUMLAH — BUKIT ZAPPOLINO (BLENDER L3) */}
      <Panel title="3. ADU JUMLAH · 32.000 VS 7.000 (BLENDER)" caption={`Komandan: "Yakin? Cek dulu pasukanmu."`} bg="linear-gradient(#ffcf86, #e8995a)">
        <CameraRig position={bl(0, -5.2, 2.35, OX.L3)} lookAt={bl(0, 3.0, 1.8, OX.L3)} fov={46} />
        <EmberWorld only="L3_Zappolino" />
        <BeanCard position={bl(-0.95, -0.4, 0, OX.L3)} height={2.6} params={{ ...KOMANDAN, expr: "smug", look: 0.6, armL: [-15, -45], armR: [20, -45] }} />
        <BeanCard position={bl(0.95, -0.45, 0, OX.L3)} height={2.5} params={{ ...UTUSAN_ARA, expr: "happy", look: -0.6, armL: [-30, -40], armR: [70, -85] }} />
        <BeanCard position={bl(1.45, 2.1, 0, OX.L3)} height={2.35} params={{ ...MILISI_BOLOGNA, expr: "think", look: -0.4, armR: [40, -10] }} />
        <BeanCard position={bl(0.35, 3.5, 0, OX.L3)} height={2.25} params={{ ...MILISI_BOLOGNA, expr: "scared", sweat: true }} />
        <BeanCard position={bl(-1.45, 2.3, 0, OX.L3)} height={2.35} params={{ ...PRAJURIT_MODENA, expr: "neutral" }} />
        <hemisphereLight args={["#ffe4b5", "#8a684a", 1.55]} />
        <directionalLight position={bl(-8, -6, 9, OX.L3)} intensity={1.95} color="#ffcf8a" castShadow />
      </Panel>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {/* PANEL 4: ZAPPOLINO — BOLOGNA KABUR (BLENDER L3) */}
      <Panel title="4. ZAPPOLINO · BOLOGNA KABUR! (BLENDER)" caption={`Ara: "Lho?! Kok malah kita yang mundur?!"`} bg="linear-gradient(#f7b872, #c96e4b)">
        <CameraRig position={bl(0.1, -5.2, 2.25, OX.L3)} lookAt={bl(0, 2.2, 1.65, OX.L3)} fov={46} />
        <EmberWorld only="L3_Zappolino" />
        <BeanCard position={bl(-1.25, 0.3, 0, OX.L3)} height={2.55} params={{ ...PRAJURIT_MODENA, expr: "angry", lean: 14, legL: [-28, 25], legR: [30, -15], armR: [85, -15] }} />
        <BeanCard position={bl(0.15, -0.5, 0, OX.L3)} height={2.5} params={{ ...UTUSAN_ARA, expr: "scared", sweat: true, lean: 16, legL: [-32, 30], legR: [34, -20], armL: [-65, -40], armR: [65, -50] }} />
        <BeanCard position={bl(1.3, 1.1, 0, OX.L3)} height={2.4} params={{ ...MILISI_BOLOGNA, expr: "scared", sweat: true, lean: 18, legL: [-30, 28], legR: [32, -18] }} />
        <hemisphereLight args={["#ffd9a0", "#7a503c", 1.5]} />
        <directionalLight position={bl(-7, -5, 8, OX.L3)} intensity={1.9} color="#ffb970" castShadow />
      </Panel>

      {/* PANEL 5: GERBANG PORTA SAN FELICE — EMBER DIAMBIL (BLENDER L4) */}
      <Panel title="5. GERBANG BOLOGNA · EMBER DIAMBIL! (BLENDER)" caption={`Ara: "Hei!! Ember sumur kami mau dibawa ke mana?!"`} bg="linear-gradient(#8fc4eb, #e6dcc8)">
        <CameraRig position={bl(0.15, -6.4, 2.75, OX.L4)} lookAt={bl(0.1, 1.8, 2.6, OX.L4)} fov={47} />
        <EmberWorld only="L4_Gerbang" />
        {/* Ara mengintip marah dari atas tembok kota */}
        <BeanCard position={bl(0.0, 3.25, 3.65, OX.L4)} height={2.35} params={{ ...UTUSAN_ARA, expr: "shock", sweat: true, armL: [-55, -75], armR: [55, -75] }} />
        {/* Komandan mengangkat Ember Kayu 3D tinggi-tinggi di depan sumur */}
        <BeanCard position={bl(-0.3, -0.55, 0, OX.L4)} height={2.6} params={{ ...KOMANDAN, expr: "smug", armL: [-20, -30], armR: [135, -25] }} />
        <WoodenBucket3D position={bl(0.38, -0.65, 2.38, OX.L4)} rotation={[0, 0.3, -0.15]} scale={1.18} withRope />
        <BeanCard position={bl(-1.45, 0.3, 0, OX.L4)} height={2.45} params={{ ...PRAJURIT_MODENA, expr: "happy" }} />
        <hemisphereLight args={["#fff8ea", "#9e8670", 1.55]} />
        <directionalLight position={bl(5, -7, 10, OX.L4)} intensity={1.85} color="#fff0d0" castShadow />
      </Panel>

      {/* PANEL 6: AKHIR — 700 TAHUN KEMUDIAN (BLENDER L1) */}
      <Panel title="6. AKHIR · 700 TAHUN MASIH DI MODENA (BLENDER)" caption={`Komandan: "Masih di sini!" · Ara: "Balikin dong!"`} bg="linear-gradient(#f5ecd8, #d8c7a8)">
        <CameraRig position={bl(0, -5.2, 2.3, OX.L1)} lookAt={bl(0, 1.3, 1.85, OX.L1)} fov={46} />
        <EmberWorld only="L1_Museum" />
        <WoodenBucket3D position={bl(0, 1.3, 1.56, OX.L1)} scale={1.4} withRope={false} />
        <BeanCard position={bl(-1.1, -0.6, 0, OX.L1)} height={2.6} params={{ ...KOMANDAN, expr: "smug", look: 0.6, armL: [-20, -30], armR: [65, -45] }} />
        <BeanCard position={bl(1.1, -0.7, 0, OX.L1)} height={2.5} params={{ ...UTUSAN_ARA, expr: "angry", look: -0.6, armL: [-65, -35], armR: [30, -40] }} />
        <hemisphereLight args={["#fff8ea", "#b8928a", 1.55]} />
        <directionalLight position={bl(3, -5, 6, OX.L1)} intensity={1.7} color="#fff2dc" castShadow />
        <pointLight position={bl(0, 1.3, 4.3, OX.L1)} intensity={16} color="#ffecc0" distance={12} />
      </Panel>
    </div>
  </AbsoluteFill>
);

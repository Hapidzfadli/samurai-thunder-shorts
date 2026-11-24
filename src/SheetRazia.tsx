import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BeanCard, BeanParams, beanHandWorld } from "./three/objectsBean";
import { BAGAS, BU_TINI, RIKO } from "./SheetMie";
import {
  BesekPindang3D,
  Ember3D,
  IkanTongkol3D,
  KamarKosRiko,
  KipasAngin3D,
  KoridorLantai2,
  Lemari2Pintu3D,
  OrenHero3D,
  PapanLarangan3D,
  SapuIjuk3D,
  Selimut3D,
  BayanganSapu3D,
} from "./three/objectsRazia";

type V3 = [number, number, number];

const SyncCam: React.FC<{ pos: V3; look: V3; fov?: number }> = ({ pos, look, fov = 34 }) => {
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
/* CAST "RAZIA KAMAR KOS MENDADAK — KUCING OREN" (Kos Bu Tini Ep. 4)   */
/* ================================================================== */
export const RIKO_RAZIA: BeanParams = { ...RIKO, apron: undefined, barefoot: true, seed: 141 };
export const BAGAS_RAZIA: BeanParams = { ...BAGAS, barefoot: true, seed: 142 };
export const BU_TINI_RAZIA: BeanParams = { ...BU_TINI, barefoot: false, seed: 143 };
export const ARA: BeanParams = {
  skin: "#f7dcc0",
  torso: "#fde047",
  sleeves: "#fde047",
  skirt: "#a78bfa",
  batik: "#ede9fe",
  hat: "kerchief",
  hatColor: "#f0abfc",
  barefoot: true,
  wide: 0.9,
  seed: 144,
};
export const NADIA: BeanParams = {
  skin: "#f0cfa8",
  torso: "#0ea5e9",
  sleeves: "#0ea5e9",
  skirt: "#1e293b",
  hat: "kerchief",
  hatColor: "#fcd9b6",
  barefoot: false,
  seed: 145,
};

/** warna badge pembicara (dipakai juga di caption video) */
export const SPEAKER_COLORS: Record<string, string> = {
  nadia: "#0ea5e9",
  riko: "#2563eb",
  bagas: "#334155",
  ara: "#c026d3",
  bu_tini: "#b91c1c",
};

const CAST: { p: BeanParams; flip?: boolean; name: string; voice: string; role: string; desc: string; color: string }[] = [
  {
    p: { ...NADIA, expr: "happy", armR: [70, 50], mouthOpen: 0.5 },
    name: "Mbak Nadia",
    voice: "01_nadia_storyteller",
    role: "Narator \"Hai wak!\"",
    desc: "Jaket denim biru + kerudung krem. Muncul di pojok pembuka & penutup, ekspresi senyum usil → ngakak.",
    color: SPEAKER_COLORS.nadia,
  },
  {
    p: { ...RIKO_RAZIA, expr: "scared", sweat: true, armL: [-30, 60], armR: [30, 60] },
    name: "Riko (Kamar 01)",
    voice: "06_riko_panikan",
    role: "Diam-diam pelihara Oren",
    desc: "Kaos biru, celana navy, nyeker. Ekspresi: senyum sayang → panik keringetan → ngeles → lega.",
    color: SPEAKER_COLORS.riko,
  },
  {
    p: { ...BAGAS_RAZIA, expr: "smug", armL: [-20, -10], armR: [40, 70] },
    name: "Mas Bagas (Kamar 02)",
    voice: "07_bagas_santai",
    role: "Santuy, ide \"bantal bulu\"",
    desc: "Kaos hitam + headphone. Ekspresi: santai/smug → ide (think) → kaget pas diusir.",
    color: SPEAKER_COLORS.bagas,
  },
  {
    p: { ...ARA, expr: "think", armR: [150, 30], look: 0.4 },
    flip: true,
    name: "Mbak Ara (Kamar 03)",
    voice: "02_cewek_polos_lucu",
    role: "Polos, keceplosan",
    desc: "Kaos kuning oversize, rok lilac, kerudung pink. Ekspresi: bingung polos → kaget → happy minta bebek.",
    color: SPEAKER_COLORS.ara,
  },
  {
    p: { ...BU_TINI_RAZIA, expr: "angry", armR: [150, 20], armL: [-25, -10] },
    flip: true,
    name: "Bu Tini",
    voice: "04_bu_tini_ibu_kos",
    role: "Galak → luluh gemes",
    desc: "Daster batik merah marun, sanggul, sandal. Bawa sapu ijuk (objek 3D di tangan). Marah → curiga → gemes → bahagia.",
    color: SPEAKER_COLORS.bu_tini,
  },
];

const SHEET_CAM: V3 = [0, 1.9, 21];
const XS = [-5.7, -2.85, 0, 2.85, 5.7];

export const SheetRaziaKarakter: React.FC = () => {
  const tini = CAST[4];
  const hand = beanHandWorld(tini.p, "R", [XS[4], 0, 0], 2.6, SHEET_CAM, true);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#fff3d6, #ffd6a5)" }}>
      <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 22, near: 0.5, far: 200, position: SHEET_CAM }}>
        <SyncCam pos={SHEET_CAM} look={[0, 1.55, 0]} fov={22} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <meshStandardMaterial color="#f5d9b5" roughness={1} />
        </mesh>
        <hemisphereLight args={["#fff7e8", "#b08968", 1.2]} />
        <directionalLight position={[4, 8, 8]} intensity={1.4} castShadow />
        {CAST.map((c, i) => (
          <BeanCard key={c.name} position={[XS[i], 0, 0]} height={2.6} params={c.p} flip={c.flip} />
        ))}
        <SapuIjuk3D pos={hand} rot={[0, 0, 0.25]} scale={1.1} />
        {/* Si Oren di depan Riko & Bagas */}
        <OrenHero3D pos={[-1.45, 0, 1.6]} rot={[0, 0.25, 0]} scale={1.9} t={1.0} pose="sit" sparkle={0.15} />
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 24, left: 0, right: 0, textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            padding: "10px 36px",
            borderRadius: 18,
            background: "#7c2d12",
            border: "6px solid #fb923c",
            fontFamily: "Anton, Impact, sans-serif",
            fontSize: 50,
            color: "#fff7ed",
            letterSpacing: 1.5,
          }}
        >
          LEMBAR KARAKTER — KOS BU TINI EP. 4: RAZIA KAMAR & KUCING OREN
        </span>
      </div>
      <div style={{ position: "absolute", bottom: 22, left: 30, right: 30, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {CAST.map((c) => (
          <div key={c.name} style={{ background: "rgba(255,252,245,0.97)", border: `5px solid ${c.color}`, borderRadius: 16, padding: "10px 13px", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#1c1917" }}>{c.name}</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: c.color, marginTop: 2 }}>{c.role}</div>
            <div style={{ fontSize: 13, color: "#57534e", marginTop: 2, fontFamily: "monospace" }}>🎙 {c.voice}</div>
            <div style={{ fontSize: 14, color: "#44403c", marginTop: 5, lineHeight: 1.33 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* LEMBAR HERO RIG: KUCING OREN (4 state + ekspresi)                   */
/* ================================================================== */
const OREN_STATES: { title: string; sub: string; el: React.ReactNode; cam: V3; look: V3 }[] = [
  {
    title: "1. Normal — duduk manis",
    sub: "Ekor bersegmen bergoyang, kuping kedut, kedip otomatis",
    el: <OrenHero3D pos={[0, 0, 0]} rot={[0, 0.35, 0]} t={1.2} pose="sit" />,
    cam: [0.2, 0.55, 1.75],
    look: [0, 0.38, 0],
  },
  {
    title: "2. Makan ikan tongkol",
    sub: "Pose rebah + mulut mengunyah (adegan Hook)",
    el: (
      <>
        <OrenHero3D pos={[0, 0, -0.1]} rot={[0, 0.2, 0]} t={0.7} pose="loaf" chew={1} look={[0, 0.35]} />
        <IkanTongkol3D pos={[0.05, 0, 0.32]} scale={0.9} eaten={0.3} t={0.5} />
      </>
    ),
    cam: [0.5, 0.75, 1.65],
    look: [0, 0.2, 0.05],
  },
  {
    title: "3. Penyamaran \"BANTAL BULU\"",
    sub: "Sarung bantal kuning + kuping nongol (adegan 3–5)",
    el: <OrenHero3D pos={[0, 0, 0]} rot={[0, 0.3, 0]} t={0.4} pose="loaf" disguise={1} />,
    cam: [0.35, 0.7, 1.55],
    look: [0, 0.22, 0],
  },
  {
    title: "4. MATA BERBINAR \"Meeeoow~\"",
    sub: "Pupil membesar, kilau ganda, kepala miring (adegan 6)",
    el: <OrenHero3D pos={[0, 0, 0]} rot={[0, 0.0, 0]} t={0.55} pose="sit" sparkle={1} meow={0.7} tailAmp={0.2} />,
    cam: [0.0, 0.62, 1.1],
    look: [0, 0.52, 0],
  },
  {
    title: "5. Digendong — dengkur bahagia",
    sub: "Pose 'held' kaki menjuntai + mata merem senyum (adegan 7)",
    el: <OrenHero3D pos={[0, 0.25, 0]} rot={[0, 0.3, 0]} t={0.9} pose="held" purr={1} />,
    cam: [0.25, 0.8, 1.7],
    look: [0, 0.55, 0],
  },
];

export const SheetRaziaOren: React.FC = () => (
  <AbsoluteFill style={{ background: "#fff7ed", padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ textAlign: "center" }}>
      <span style={{ display: "inline-block", padding: "10px 36px", borderRadius: 18, background: "#f97316", border: "6px solid #7c2d12", fontFamily: "Anton, Impact, sans-serif", fontSize: 46, color: "#fff", letterSpacing: 1.5 }}>
        HERO RIG 3D — SI OREN (KUCING KAMPUNG GEMBUL)
      </span>
    </div>
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
      {OREN_STATES.map((s) => (
        <div key={s.title} style={{ borderRadius: 18, overflow: "hidden", border: "5px solid #241726", display: "flex", flexDirection: "column", background: "#fde7c4" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <ThreeCanvas width={364} height={880} shadows camera={{ fov: 34, near: 0.05, far: 50, position: s.cam }}>
              <SyncCam pos={s.cam} look={s.look} fov={34} />
              <color attach="background" args={["#fde7c4"]} />
              <hemisphereLight args={["#fff7e8", "#b08968", 1.3]} />
              <directionalLight position={[2, 4, 3]} intensity={1.4} castShadow />
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#e8dcc7" />
              </mesh>
              {s.el}
            </ThreeCanvas>
          </div>
          <div style={{ background: "#0f172a", color: "#fff", padding: "10px 14px", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#fdba74" }}>{s.title}</div>
            <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 2 }}>{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

/* ================================================================== */
/* LEMBAR PROPERTI & LATAR                                             */
/* ================================================================== */
const PropTile: React.FC<{ title: string; subtitle: string; camPos: V3; look: V3; bg?: string; fov?: number; children: React.ReactNode; lights?: boolean }> = ({
  title,
  subtitle,
  camPos,
  look,
  bg = "#fde7c4",
  fov = 34,
  children,
  lights = true,
}) => (
  <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "5px solid #241726", background: bg, display: "flex", flexDirection: "column" }}>
    <div style={{ position: "relative", flex: 1 }}>
      <ThreeCanvas width={460} height={470} shadows camera={{ fov, near: 0.05, far: 140, position: camPos }}>
        <SyncCam pos={camPos} look={look} fov={fov} />
        <color attach="background" args={[bg]} />
        {lights && (
          <>
            <hemisphereLight args={["#fff7e8", "#b08968", 1.3]} />
            <directionalLight position={[3, 6, 5]} intensity={1.4} color="#fff5db" castShadow />
          </>
        )}
        {children}
      </ThreeCanvas>
    </div>
    <div style={{ background: "#0f172a", color: "#ffffff", padding: "10px 14px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: "#fde047" }}>{title}</div>
      <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 2 }}>{subtitle}</div>
    </div>
  </div>
);

export const SheetRaziaProperti: React.FC = () => (
  <AbsoluteFill style={{ background: "#1c1917", padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
    <div style={{ textAlign: "center" }}>
      <span style={{ display: "inline-block", padding: "10px 36px", borderRadius: 18, background: "#fef08a", border: "5px solid #dc2626", fontFamily: "Anton, Impact, sans-serif", fontSize: 44, color: "#1c1917", letterSpacing: 1.5 }}>
        LEMBAR PROPERTI & LATAR 3D — KAMAR KOS RIKO & KORIDOR LANTAI 2
      </span>
    </div>
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 18 }}>
      <PropTile title="1. Kamar Kos Riko (360°)" subtitle="Sinar sore volumetrik, sprei kotak, lemari, meja laptop, kipas" camPos={[1.6, 2.35, 2.3]} look={[-0.6, 1.0, -1.2]} fov={62} lights={false}>
        <KamarKosRiko t={0.6} />
        <OrenHero3D pos={[-0.9, 0.46, -1.45]} rot={[0, 0.5, 0]} scale={0.95} t={0.6} pose="sit" />
      </PropTile>
      <PropTile title="2. Sisi Pintu & Dispenser" subtitle="Reverse 160°: pintu 01, rak sepatu, cermin, galon, karpet" camPos={[-1.7, 1.75, -1.2]} look={[1.0, 1.0, 1.4]} fov={66} lights={false}>
        <KamarKosRiko t={0.6} doorOpen={0.6} />
      </PropTile>
      <PropTile title="3. Koridor Lantai 2" subtitle="Pintu 02/03, pagar besi, jemuran, pot, papan RAZIA, langit sore" camPos={[3.9, 1.6, 4.8]} look={[3.0, 1.2, -1.5]} fov={58} lights={false}>
        <KoridorLantai2 t={0.5} noticeGlow={1} />
        <hemisphereLight args={["#fff1d6", "#b08968", 1.2]} />
        <directionalLight position={[8, 6, 2]} intensity={1.3} color="#ffd59a" />
        <BayanganSapu3D pos={[2.36, 1.25, 1.5]} rot={[0, Math.PI / 2, 0]} opacity={0.45} />
      </PropTile>
      <PropTile title="4. Lemari 2 Pintu (bisa dibuka)" subtitle="Engsel kiri/kanan, cermin, baju gantung, rak kaos" camPos={[0.4, 1.3, 2.9]} look={[0, 1.0, 0]} fov={44}>
        <Lemari2Pintu3D pos={[0, 0, 0]} openL={0.75} openR={0.45} />
      </PropTile>
      <PropTile title="5. Papan Larangan + Kipas" subtitle="Papan merah TTD Bu Tini & kipas berdiri berputar" camPos={[0.1, 1.15, 2.6]} look={[0, 1.0, 0]} fov={42}>
        <PapanLarangan3D pos={[-0.35, 1.55, -0.3]} scale={1.05} />
        <KipasAngin3D pos={[0.45, 0, 0]} rot={[0, -0.35, 0]} t={0.4} />
      </PropTile>
      <PropTile title="6. Ikan Tongkol & Besek Pindang" subtitle="Tongkol goreng mengepul (umpan) vs pindang hadiah Bu Tini" camPos={[0, 0.75, 1.15]} look={[0, 0.08, 0]} fov={40}>
        <IkanTongkol3D pos={[-0.24, 0, 0]} t={0.6} />
        <BesekPindang3D pos={[0.25, 0, 0.02]} rot={[0, -0.4, 0]} lid={1} />
      </PropTile>
      <PropTile title="7. Sapu Ijuk & Ember Biru" subtitle="Senjata razia Bu Tini & tempat sembunyi gagal" camPos={[0.2, 0.9, 2.4]} look={[0, 0.55, 0]} fov={40}>
        <SapuIjuk3D pos={[-0.3, 1.32, 0]} rot={[0, 0, 0.12]} />
        <Ember3D pos={[0.35, 0, 0.1]} />
      </PropTile>
      <PropTile title="8. Selimut Ditarik → Ketahuan!" subtitle="Selimut garis tersingkap memperlihatkan 'bantal bulu'" camPos={[0.6, 1.2, 1.9]} look={[0, 0.35, 0]} fov={42}>
        <OrenHero3D pos={[0, 0, 0]} rot={[0, 0.2, 0]} t={0.3} pose="loaf" disguise={1} />
        <Selimut3D pos={[0, 0.25, 0]} pull={0.55} t={0.3} />
      </PropTile>
    </div>
  </AbsoluteFill>
);

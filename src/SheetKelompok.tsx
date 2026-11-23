// Lembar karakter & properti "Kerja Kelompok" (untuk disetujui sebelum membangun adegan).
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Bean3, Bean3Params, BlueGrid, Expr3, ToonRes, Vec3 } from "./three/toon";
import { Calendar, CafeSet, ChatBubble, ClassroomSet, KosSet, Laptop, Marker, Mug, Phone } from "./three/objectsKelompok";

export const DIMAS: Bean3Params = { body: "#3a6ab0", plaid: "#22447a", shirt: "#f4f4f0", pants: "#3a4a6a", boots: "#f0f0f0", glove: "#f1e2d0", sleeve: "#3a6ab0", hair: "#2a1e18", hat: "none", backpack: "#5a6a3a" };
export const RARA: Bean3Params = { body: "#f08ab0", pants: "#4a5a8a", boots: "#ffffff", glove: "#f1e2d0", sleeve: "#f08ab0", hair: "#3a2418", ponytail: true, hat: "none", hood: "#e07aa0" };
export const BAYU: Bean3Params = { body: "#26262c", pants: "#5a5a62", boots: "#c83a2a", glove: "#e8d2bc", sleeve: "#26262c", hair: "#1a1410", hat: "cap", hatColor: "#d23a3a", hatBand: "#a82a2a", headphones: "#e8e8e8" };
export const SARI: Bean3Params = { body: "#f0c040", pants: "#3a3a48", boots: "#6a4a3a", glove: "#f1e2d0", sleeve: "#2a8a5a", hijab: "#2a8a8a", hat: "none" };
export const JOKO: Bean3Params = { body: "#3a8a4a", pants: "#4a4a52", boots: "#2a2a2a", glove: "#e8d2bc", sleeve: "#3a8a4a", hair: "#2a1e18", hat: "none", collar: "#2a6a3a" };
export const BUDOSEN: Bean3Params = { body: "#6a6a78", shirt: "#f4f0f4", pants: "#4a4a58", boots: "#2a2a30", glove: "#f1e2d0", sleeve: "#6a6a78", hair: "#4a3a3a", longHair: true, glassesUp: true, hat: "none" };

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
  ["Dimas", "Tokoh utama · satu-satunya yang kerja", "Flanel biru, kaos putih, jins, sepatu putih, ransel hijau.", DIMAS, "determined"],
  ["Rara", "\"Nanti aku edit ya!\"", "Hoodie pink, rambut kuncir kuda, selalu pegang HP.", RARA, "smug"],
  ["Bayu", "\"Aku cari referensi!\"", "Kaos hitam, topi merah dibalik, headphone di leher.", BAYU, "laugh"],
  ["Sari", "\"Sinyalku jelek…\"", "Jilbab hijau tosca, baju kuning, lengan hijau.", SARI, "worried"],
  ["Joko", "Hilang tanpa kabar", "Jaket kampus hijau, celana abu, rambut pendek.", JOKO, "neutral"],
  ["Bu Dosen", "Pemberi tugas & nilai", "Blazer abu, rambut panjang, kacamata di atas kepala.", BUDOSEN, "happy"],
];
export const SheetKelompok: React.FC = () => (
  <AbsoluteFill style={{ background: SHEET_BG }}>
    <ThreeCanvas width={2000} height={1150} shadows flat camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 17] }}>
      <ToonRes />
      <CameraRig position={[0, 1.5, 14.5]} lookAt={[0, 1.2, 0]} fov={24} />
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshToonMaterial color="#d8d0c0" />
      </mesh>
      {CHARS.map(([, , , p, e], i) => {
        const x = -4.6 + i * 1.84;
        const extra: Partial<Bean3Params> = i === 1 ? { handR: [0.25, 1.0, 0.35] } : i === 0 ? { handR: [0.4, 0.75, 0.25] } : {};
        return (
          <Bean3 key={i} p={{ ...p, ...extra, expr: e }} position={[x, 0, 0]} rotation={[0, i === 0 ? 0.25 : 0.15, 0]} scale={1.05}>
            {i === 1 ? <Phone position={[0.25, 1.05, 0.42]} rotation={[-0.3, 0, 0]} /> : null}
          </Bean3>
        );
      })}
    </ThreeCanvas>
    <Title t='KARAKTER · "KERJA KELOMPOK"' />
    <div style={{ position: "absolute", bottom: 22, left: 30, right: 30, display: "flex", gap: 12 }}>
      {CHARS.map(([n, r, d]) => (
        <div key={n} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 900, fontSize: 28, color: "#1e2240" }}>{n}</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#2a7a5a" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: "#4a4a6a", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const EXPR: [string, Bean3Params][] = [
  ["Dimas: semangat", { ...DIMAS, expr: "determined" }],
  ["Dimas: cemas", { ...DIMAS, expr: "worried" }],
  ["Dimas: mata panda", { ...DIMAS, expr: "sleepy" }],
  ["Dimas: melongo", { ...DIMAS, expr: "shock" }],
  ["Rara: licik", { ...RARA, expr: "smug" }],
  ["Rara: bicara", { ...RARA, expr: "happy", talk: 0.8 }],
  ["Bayu: ketawa", { ...BAYU, expr: "laugh" }],
  ["Sari: bingung", { ...SARI, expr: "puzzled" }],
];
export const SheetKelompokExpr: React.FC = () => (
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
export const SheetKelompokProps: React.FC = () => (
  <AbsoluteFill style={{ background: "#1e2240", display: "flex", flexWrap: "wrap" }}>
    <div style={{ position: "relative" }}>
      <PropShot cam={[3.2, 2.6, 6.0]} look={[0, 1.3, -1.2]} bg="#e8eef2">
        <Lights />
        <ClassroomSet board={["TUGAS KELOMPOK", "DEADLINE: JUMAT"]} />
      </PropShot>
      <Cap t="1 · Ruang kelas (siang)" d="Papan tulis, layar proyektor, bangku berderet, meja dosen + laptop, jam, kipas, jendela terang, poster, tanaman, tas." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[1.5, 2.0, 3.2]} look={[0.3, 0.9, -1.6]} bg="#1a2a4a">
        <directionalLight position={[2, 4, 3]} intensity={0.6} color="#a8b8ff" />
        <KosSet night={1} mugs={5} />
        <Laptop position={[0.75, 0.78, -1.85]} rotation={[0, 0, 0]} typed={0.7} />
      </PropShot>
      <Cap t="2 · Kamar kos Dimas (malam → subuh)" d="Kasur & guling, meja belajar, lampu, laptop, gelas kopi bertumpuk, mi instan, rak buku, jam weker, jemuran handuk, kipas, poster, jendela malam." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[1.8, 1.9, 3.4]} look={[-0.2, 1.0, -1.0]} bg="#e8d2b8">
        <directionalLight position={[2, 5, 4]} intensity={1.0} color="#fff0d8" castShadow />
        <CafeSet />
      </PropShot>
      <Cap t="3 · Kafe (teman-teman nongkrong)" d="Dinding bata, papan nama, lampu gantung, meja bundar, es kopi susu, kentang goreng, rak cangkir, tanaman." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[0, 2.2, 5.2]} look={[0, 1.0, 0]} bg="#020a1c">
        <hemisphereLight args={["#bfe4ff", "#123060", 1.6]} />
        <directionalLight position={[3, 6, 5]} intensity={1.4} />
        <BlueGrid size={40} />
        <ChatBubble position={[-0.6, 2.3, 0]} name="Rara" text="Nanti aku edit ya! 😘" />
        <ChatBubble position={[0.6, 1.75, 0.2]} name="Bayu" text="Aku cari referensi 🔥" />
        <ChatBubble position={[-0.5, 1.2, 0.4]} name="Dimas" text="Bagiannya mana? 🥲" mine />
        <Phone position={[1.2, 0.55, 1.4]} rotation={[-0.6, -0.4, 0]} scale={3} />
        <Laptop position={[-1.1, 0.05, 1.3]} rotation={[0, 0.5, 0]} scale={1.6} typed={0.5} />
        <Mug position={[0.1, 0.0, 2.1]} scale={2} full={0.7} />
        <Calendar position={[1.4, 0.4, -0.4]} rotation={[0, -0.3, 0]} day="5" scale={1.6} />
        <Marker position={[-0.2, 0.08, 2.4]} rotation={[0, 0, Math.PI / 2]} />
      </PropShot>
      <Cap t="4 · Hologram grup + benda penting" d="Gelembung chat 3D, HP, laptop (layar terisi bertahap), gelas kopi, kalender sobek, spidol — semua objek terpisah yang bisa dipegang." />
    </div>
  </AbsoluteFill>
);

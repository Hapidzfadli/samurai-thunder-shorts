// Lembar Karakter & Properti 3D — "Operasi Woyla 1981: 3 Menit di Don Mueang"
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { ToonRes } from "./three/toon";
import { HeroP, heroHand } from "./three/objectsHero";
import {
  BriefingRoom1981,
  BulletTimeTracers,
  DC9CabinInterior,
  DonMueangApron,
  Flashbang3D,
  FlashbangBlast3D,
  GarudaDC9Woyla,
  MP5Gun,
  Pistol3D,
  RadioHT3D,
  WoylaActor,
} from "./three/objectsWoyla";

export const SINTONG: HeroP = {
  skin: "#b97c50",
  hair: "#161414",
  hairStyle: "crop",
  head: "none",
  shirt: "#2d3b2d",
  shirtDark: "#1f2a20",
  sleeves: "long",
  pants: "#253025",
  feet: "boots",
  bootColor: "#141618",
  belt: "#1c1f1c",
  mustache: true,
  expr: "determined",
  armR: { pitch: 0.45, out: 0.16, elbow: 1.35 },
  armL: { pitch: 0.2, out: 0.16, elbow: 0.45 },
  legL: { pitch: 0.08, out: 0.08 },
  legR: { pitch: -0.08, out: 0.08 },
};

export const TIM_MERAH: HeroP = {
  skin: "#b4784c",
  hair: "#141212",
  hairStyle: "crop",
  head: "none",
  shirt: "#26322b",
  shirtDark: "#1a231e",
  sleeves: "long",
  pants: "#202a24",
  feet: "boots",
  bootColor: "#121416",
  belt: "#1a1e1a",
  expr: "determined",
  armR: { pitch: 0.4, out: 0.18, elbow: 1.25 },
  armL: { pitch: 0.95, out: -0.22, elbow: 1.2 },
  legL: { pitch: 0.2, out: 0.1, knee: 0.12 },
  legR: { pitch: -0.18, out: 0.1, knee: 0.1 },
};

export const TIM_BIRU: HeroP = {
  ...TIM_MERAH,
  skin: "#bd8156",
};

export const KIRANG_HIJAU: HeroP = {
  skin: "#b67a4e",
  hair: "#141212",
  hairStyle: "crop",
  head: "none",
  shirt: "#243028",
  shirtDark: "#18211b",
  sleeves: "long",
  pants: "#1e2822",
  feet: "boots",
  bootColor: "#121416",
  belt: "#1a1e1a",
  expr: "shout",
  armR: { pitch: 0.42, out: 0.2, elbow: 1.2 },
  armL: { pitch: 1.35, out: 0.24, elbow: 0.75 },
  legL: { pitch: 0.22, out: 0.1, knee: 0.12 },
  legR: { pitch: -0.2, out: 0.1, knee: 0.14 },
};

export const KAPTEN_HERMAN: HeroP = {
  skin: "#c58c62",
  hair: "#1c1816",
  hairStyle: "slick",
  head: "peaked",
  headColor: "#f8fafc",
  shirt: "#f8fafc",
  shirtDark: "#dbe2ea",
  sleeves: "short",
  pants: "#1e293b",
  feet: "boots",
  bootColor: "#111827",
  belt: "#111827",
  mustache: true,
  expr: "calm",
  armR: { pitch: 0.18, out: 0.16, elbow: 0.45 },
  armL: { pitch: 0.35, out: 0.14, elbow: 0.95 },
  legL: { pitch: 0.06, out: 0.06 },
  legR: { pitch: -0.06, out: 0.06 },
};

export const PEMBAJAK: HeroP = {
  skin: "#ba7e54",
  hair: "#161210",
  hairStyle: "short",
  head: "none",
  shirt: "#4b382c",
  shirtDark: "#36271e",
  sleeves: "rolled",
  open: true,
  undershirt: "#27272a",
  pants: "#27272a",
  feet: "boots",
  bootColor: "#18181b",
  belt: "#2e221b",
  expr: "angry",
  armR: { pitch: 1.35, out: 0.15, elbow: 0.18 },
  armL: { pitch: 0.4, out: 0.22, elbow: 0.8 },
  legL: { pitch: 0.14, out: 0.09 },
  legR: { pitch: -0.14, out: 0.09 },
};

export const SANDERA_IBU: HeroP = {
  skin: "#cfa078",
  hair: "#1a1412",
  hairStyle: "short",
  hairLong: true,
  female: true,
  head: "none",
  shirt: "#d97706",
  shirtDark: "#b45309",
  sleeves: "short",
  pants: "#334155",
  feet: "sandals",
  belt: "#78350f",
  pockets: false,
  expr: "sad",
  armR: { pitch: 0.55, out: 0.12, elbow: 1.25 },
  armL: { pitch: 0.55, out: 0.12, elbow: 1.25 },
  legL: { pitch: 0.05 },
  legR: { pitch: -0.05 },
};

export const SANDERA_BAPAK: HeroP = {
  skin: "#c48d62",
  hair: "#1e1a18",
  hairStyle: "slick",
  head: "none",
  shirt: "#9a6b3e",
  shirtDark: "#7a522c",
  sleeves: "short",
  pants: "#2c3442",
  feet: "boots",
  bootColor: "#231a14",
  belt: "#3a2a1e",
  expr: "sad",
  armR: { pitch: 0.4, out: 0.15, elbow: 1.1 },
  armL: { pitch: 0.4, out: 0.15, elbow: 1.1 },
  legL: { pitch: 0.06 },
  legR: { pitch: -0.06 },
};

type CastRow = {
  name: string;
  sub: string;
  desc: string;
  role: "sintong" | "merah" | "biru" | "hijau" | "pilot" | "pembajak" | "sandera";
  p: HeroP;
  beret?: boolean;
  rotY: number;
  prop?: (p: HeroP) => React.ReactNode;
};

const CAST: CastRow[] = [
  {
    name: "Letkol Sintong Panjaitan",
    sub: "Komandan Operasi · Kopassandha",
    desc: "Baret Merah & seragam komando 1981, rompi taktis, headset radio, memegang HT militer untuk aba-aba serentak.",
    role: "sintong",
    p: SINTONG,
    beret: true,
    rotY: 0.22,
    prop: (p) => <RadioHT3D position={heroHand(p, "R")} rotation={[0.1, 0.2, 0]} active />,
  },
  {
    name: "Tim Merah & Tim Biru",
    sub: "Penyerbu Pintu Darurat Sayap",
    desc: "Coverall taktis malam, rompi antipeluru, patch kode tim (Merah/Biru), headset, siaga dengan SMG MP5 di atas sayap DC-9.",
    role: "merah",
    p: TIM_MERAH,
    rotY: 0.16,
    prop: (p) => <MP5Gun position={heroHand(p, "R")} rotation={[0.05, 0.18, 0.08]} muzzleFlash={0.45} />,
  },
  {
    name: "Peltu Achmad Kirang",
    sub: "Tim Hijau · Penerobos Pintu Belakang",
    desc: "Pahlawan penerobos tangga belakang DC-9; patch Hijau, SMG MP5 di tangan kanan & granat kejut (flashbang) di tangan kiri.",
    role: "hijau",
    p: KIRANG_HIJAU,
    rotY: 0.08,
    prop: (p) => (
      <>
        <MP5Gun position={heroHand(p, "R")} rotation={[0.08, 0.12, 0.06]} />
        <Flashbang3D position={heroHand(p, "L")} pinPull={0.6} glow={0.7} scale={1.15} />
      </>
    ),
  },
  {
    name: "Kapten Herman Rante",
    sub: "Pilot Garuda DC-9 'Woyla'",
    desc: "Seragam pilot Garuda 1981 putih dengan 4 garis epaulette emas, dasi hitam, topi pet kapten; tegar melindungi 48 penumpang.",
    role: "pilot",
    p: KAPTEN_HERMAN,
    rotY: -0.06,
  },
  {
    name: "Pembajak (5 Orang)",
    sub: "Antagonis Bersenjata",
    desc: "Jaket safari gelap lusuh, kemeja terbuka, pistol 3D terangkat; ekspresi tegang lalu tersilaukan flashbang saat serbuan.",
    role: "pembajak",
    p: PEMBAJAK,
    rotY: -0.18,
    prop: (p) => <Pistol3D position={heroHand(p, "R")} rotation={[0.05, 0, 0]} />,
  },
  {
    name: "Penumpang Sandera",
    sub: "48 Sipil GA-206 (1981)",
    desc: "Busana sipil klasik 1981; meringkuk ketakutan di kursi kabin oranye lalu lari selamat menuruni tangga darurat.",
    role: "sandera",
    p: SANDERA_IBU,
    rotY: -0.22,
  },
];

export const SheetWoylaKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, #070d19 0%, #10203a 48%, #2a1814 64%, #101622 65%, #090e18 100%)" }}>
    <ThreeCanvas width={2000} height={1150} shadows flat camera={{ fov: 24, near: 0.5, far: 180, position: [0, 1.05, 11.2] }}>
      <ToonRes />
      <CameraRig position={[0, 1.05, 11.2]} lookAt={[0, 0.92, 0]} fov={24} />
      <hemisphereLight args={["#93c5fd", "#1e1b24", 1.15]} />
      <directionalLight position={[-6, 7, 7]} intensity={2.1} color="#e0f2fe" castShadow />
      <directionalLight position={[7, 4, -5]} intensity={1.7} color="#f97316" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 26]} />
        <meshToonMaterial color="#182230" />
      </mesh>
      {CAST.map((c, i) => (
        <WoylaActor
          key={c.name}
          p={c.p}
          role={c.role}
          beret={c.beret}
          position={[(i - (CAST.length - 1) / 2) * 1.38, 0, 0]}
          rotation={[0, c.rotY, 0]}
          scale={1.06}
        >
          {c.prop ? c.prop(c.p) : null}
        </WoylaActor>
      ))}
    </ThreeCanvas>

    <div style={{ position: "absolute", top: 24, left: 42, right: 42, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 42, color: "#f8fafc", letterSpacing: 1.5, textShadow: "0 4px 18px rgba(0,0,0,0.8)" }}>
          KARAKTER 3D · OPERASI WOYLA 1981
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 19, color: "#38bdf8", marginTop: 4 }}>
          Heroic Organic Rig (7,5 Kepala) · Properti Tangan 3D Terpisah · Pencahayaan Teal-Orange Hollywood
        </div>
      </div>
      <div style={{ background: "#b91c1c", color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 20, padding: "10px 20px", borderRadius: 10 }}>
        GARUDA GA-206 · 3 MENIT
      </div>
    </div>

    <div style={{ position: "absolute", bottom: 18, left: 28, right: 28, display: "flex", gap: 12 }}>
      {CAST.map((c) => (
        <div
          key={c.name}
          style={{
            flex: 1,
            background: "rgba(9,14,24,0.84)",
            border: "1px solid rgba(56,189,248,0.28)",
            borderRadius: 12,
            padding: "10px 10px",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 20, color: "#f8fafc" }}>{c.name}</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#fb923c", marginTop: 2 }}>{c.sub}</div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#cbd5e1", marginTop: 5, lineHeight: 1.3 }}>{c.desc}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const PanelLabel: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div
    style={{
      position: "absolute",
      bottom: 14,
      left: 16,
      right: 16,
      background: "rgba(7,12,22,0.84)",
      border: "1px solid rgba(56,189,248,0.3)",
      borderRadius: 10,
      padding: "8px 14px",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div style={{ fontWeight: 900, fontSize: 22, color: "#f8fafc" }}>{title}</div>
    <div style={{ fontWeight: 600, fontSize: 15, color: "#93c5fd", marginTop: 2 }}>{sub}</div>
  </div>
);

export const SheetWoylaProperti: React.FC = () => (
  <AbsoluteFill style={{ background: "#060b14", display: "flex", flexWrap: "wrap", padding: 14, gap: 14 }}>
    <div style={{ position: "relative", width: 979, height: 699, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg,#050b18 0%,#102342 58%,#1a202c 100%)" }}>
      <ThreeCanvas width={979} height={699} shadows flat camera={{ fov: 36, near: 0.3, far: 260, position: [12.5, 6.2, 14.5] }}>
        <ToonRes />
        <CameraRig position={[12.5, 6.2, 14.5]} lookAt={[0, 2.5, -1.0]} fov={36} />
        <hemisphereLight args={["#93c5fd", "#1e293b", 1.1]} />
        <directionalLight position={[14, 16, 12]} intensity={1.9} color="#dbeafe" castShadow />
        <directionalLight position={[-12, 6, -8]} intensity={1.4} color="#f97316" />
        <DonMueangApron searchlightPhase={0.18} beaconPhase={0.2} />
        <GarudaDC9Woyla wingDoorL={0.85} wingDoorR={0.85} rearStair={1} strobe={1} />
      </ThreeCanvas>
      <PanelLabel
        title="1. PESAWAT HERO DC-9-32 'WOYLA' (PK-GNJ) & APRON DON MUEANG"
        sub="Livery Garuda 1969–1985 merah-oranye, ekor T-tail, 2 mesin belakang, pintu sayap & tangga ekor aktif, menara ATC + searchlight."
      />
    </div>

    <div style={{ position: "relative", width: 979, height: 699, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg,#040a14 0%,#0b1a30 100%)" }}>
      <ThreeCanvas width={979} height={699} shadows flat camera={{ fov: 36, near: 0.2, far: 120, position: [0.3, 2.8, 4.9] }}>
        <ToonRes />
        <CameraRig position={[0.3, 2.8, 4.9]} lookAt={[0, 1.55, -0.6]} fov={36} />
        <hemisphereLight args={["#7dd3fc", "#0f172a", 1.0]} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} color="#bae6fd" />
        <BriefingRoom1981 pulse={0.25} />
      </ThreeCanvas>
      <PanelLabel
        title="2. RUANG TAKTIS & HOLOGRAM X-RAY 3 TIM SERBU"
        sub="Blueprint hologram DC-9 menyala biru + vektor serbuan MERAH (sayap kiri), BIRU (sayap kanan), HIJAU (ekor) & peta rute 1981."
      />
    </div>

    <div style={{ position: "relative", width: 979, height: 699, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg,#0f172a 0%,#1e1b24 100%)" }}>
      <ThreeCanvas width={979} height={699} shadows flat camera={{ fov: 40, near: 0.1, far: 80, position: [0.0, 1.55, 4.4] }}>
        <ToonRes />
        <CameraRig position={[0.0, 1.55, 4.4]} lookAt={[0, 1.15, -3.2]} fov={40} />
        <hemisphereLight args={["#fed7aa", "#1e293b", 1.1]} />
        <directionalLight position={[2, 4, 3]} intensity={1.6} color="#ffedd5" />
        <DC9CabinInterior cockpitDoorOpen={0.75} emergencyLight={0.8} />
        <WoylaActor p={PEMBAJAK} role="pembajak" position={[0, 0, -3.2]} rotation={[0, 0, 0]} scale={0.95}>
          <Pistol3D position={heroHand(PEMBAJAK, "R")} />
        </WoylaActor>
      </ThreeCanvas>
      <PanelLabel
        title="3. INTERIOR KABIN & KOKPIT DC-9 (CUTAWAY 360°)"
        sub="Barisan kursi oranye retro Garuda 1981, strip lantai darurat hijau, bagasi atas, pintu kokpit terbuka & panel instrumen menyala."
      />
    </div>

    <div style={{ position: "relative", width: 979, height: 699, borderRadius: 14, overflow: "hidden", background: "radial-gradient(circle at 50% 45%, #1d3a5f 0%, #050a14 75%)" }}>
      <ThreeCanvas width={979} height={699} flat camera={{ fov: 36, near: 0.1, far: 80, position: [2.8, 1.85, 3.8] }}>
        <ToonRes />
        <CameraRig position={[2.8, 1.85, 3.8]} lookAt={[0, 1.15, 0]} fov={36} />
        <hemisphereLight args={["#bae6fd", "#1e293b", 1.3]} />
        <directionalLight position={[-3, 5, 4]} intensity={2.2} color="#e0f2fe" />
        <directionalLight position={[4, 2, -2]} intensity={1.8} color="#fb923c" />
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshToonMaterial color="#101827" />
        </mesh>
        <Flashbang3D position={[-1.4, 1.15, 0.7]} pinPull={1} glow={1} scale={2.4} />
        <FlashbangBlast3D position={[0.1, 1.2, -0.2]} progress={0.42} scale={0.92} />
        <BulletTimeTracers position={[0.1, 1.25, 0]} progress={0.45} />
      </ThreeCanvas>
      <PanelLabel
        title="4. EFEK KLIMAKS HOLLYWOOD: FLASHBANG & BULLET-TIME 360°"
        sub="Granat kejut 3D (pin cabut), bola cahaya + dual shockwave ring, 24 serpihan kaca beku & 4 peluru tracer supersonik siap orbit 360°!"
      />
    </div>
  </AbsoluteFill>
);

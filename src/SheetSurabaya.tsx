// Lembar karakter "Pertempuran Surabaya, 10 November 1945" — rig Hero (proporsi heroik), untuk persetujuan.
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { ToonRes } from "./three/toon";
import { Bambu, Binoculars, Hero, HeroP, Kukri, MedBag, RadioMic, Rifle, heroHand } from "./three/objectsHero";

export const AREK: HeroP = {
  skin: "#b8784a", hair: "#141010", hairStyle: "short", head: "ikat",
  shirt: "#e4dccb", shirtDark: "#c8bea8", sleeves: "rolled", open: true, undershirt: "#f4efe4",
  pants: "#7a6a4a", shorts: true, feet: "bare", belt: "#4a3420", bandolier: true, pockets: false,
  expr: "shout",
  armR: { pitch: 0.55, out: 0.25, elbow: 1.05 }, armL: { pitch: 2.75, out: 0.35, elbow: 0.25 },
  legL: { pitch: 0.18, out: 0.1 }, legR: { pitch: -0.15, out: 0.08, knee: 0.15 },
};
export const TKR: HeroP = {
  skin: "#b47a4e", hair: "#141010", hairStyle: "crop", head: "helmJP",
  shirt: "#a8925e", shirtDark: "#8a7848", sleeves: "long", pants: "#a08a58", puttees: "#9a865a", feet: "boots", bootColor: "#3a2a1a",
  belt: "#4a3420", armband: "merahputih", expr: "determined",
  armR: { pitch: 0.35, out: 0.2, elbow: 1.2 }, armL: { pitch: 1.0, out: -0.25, elbow: 1.3 },
  legL: { pitch: 0.12, out: 0.08 }, legR: { pitch: -0.1, out: 0.1 },
};
export const ORATOR: HeroP = {
  skin: "#c08a5a", hair: "#141010", hairStyle: "slick", head: "none",
  shirt: "#b8a070", shirtDark: "#9a8452", sleeves: "long", pants: "#5a4e3a", feet: "boots", bootColor: "#2a1e16",
  belt: "#3a2a1a", expr: "shout",
  armR: { pitch: 1.75, out: 0.2, elbow: 0.05 }, armL: { pitch: 0.9, out: 0.1, elbow: 1.5 },
  legL: { pitch: 0.12 }, legR: { pitch: -0.08 },
};
export const PMI: HeroP = {
  skin: "#c8946a", hair: "#1a1210", hairStyle: "short", hairLong: true, female: true, head: "none",
  shirt: "#f2eee4", shirtDark: "#d8d2c4", sleeves: "rolled", pants: "#4e4e5a", feet: "sandals",
  belt: "#6a5a4a", armband: "redcross", pockets: false, collar: true, expr: "determined",
  armR: { pitch: 0.25, out: 0.2, elbow: 0.6 }, armL: { pitch: 0.1, out: 0.25, elbow: 0.2 },
  legL: { pitch: 0.06 }, legR: { pitch: -0.06 },
};
export const GURKHA: HeroP = {
  skin: "#a87048", hair: "#141010", hairStyle: "crop", head: "slouch", headColor: "#4a4a30",
  shirt: "#4e5a3a", shirtDark: "#3e4a2e", sleeves: "rolled", pants: "#4e5a3a", puttees: "#5a6040", feet: "boots",
  webbing: "#a8a070", expr: "angry",
  armR: { pitch: 2.4, out: 0.45, elbow: 0.7 }, armL: { pitch: 0.7, out: 0.2, elbow: 0.9 },
  legL: { pitch: 0.3, out: 0.1, knee: 0.2 }, legR: { pitch: -0.25, out: 0.1, knee: 0.1 },
};
export const OFFICER: HeroP = {
  skin: "#e0b498", hair: "#6a4a2a", hairStyle: "crop", head: "peaked", headColor: "#6a6a48",
  shirt: "#6a6a48", shirtDark: "#565638", sleeves: "long", pants: "#6a6a48", feet: "boots", bootColor: "#3a2416",
  belt: "#6a4a2a", expr: "calm", mustache: true, scarf: "#b81e2a",
  armR: { pitch: 1.5, out: 0.25, elbow: 0.05 }, armL: { pitch: 0.55, out: 0.05, elbow: 1.35 },
  legL: { pitch: 0.08 }, legR: { pitch: -0.08 },
};
export const BRITISH: HeroP = {
  skin: "#d8a888", hair: "#5a3a22", hairStyle: "crop", head: "brodie",
  shirt: "#58603e", shirtDark: "#464e30", sleeves: "long", pants: "#58603e", puttees: "#6a6a48", feet: "boots",
  webbing: "#b0a878", expr: "determined", mustache: true,
  armR: { pitch: 0.35, out: 0.2, elbow: 1.2 }, armL: { pitch: 1.0, out: -0.25, elbow: 1.3 },
  legL: { pitch: 0.25, out: 0.1, knee: 0.1 }, legR: { pitch: -0.2, out: 0.12 },
};

type Row = [string, string, string, HeroP, (p: HeroP) => React.ReactNode];
const at = (p: HeroP, s: "L" | "R") => heroHand(p, s);
const INDONESIA: Row[] = [
  ["Arek Suroboyo", "Pemuda pejuang", "Ikat kepala merah-putih, kemeja lusuh lengan digulung, sabuk peluru silang, celana pendek, kaki telanjang, bambu runcing berbendera.", AREK, (p) => (
    <group position={at(p, "R")} rotation={[0.08, 0, -0.05]}><group position={[0, -1.0, 0]}><Bambu len={2.2} /></group></group>
  )],
  ["Pejuang TKR", "Tentara Keamanan Rakyat", "Helm baja Tipe 90 rampasan Jepang, seragam khaki, ban lengan merah-putih, pembalut betis, sepatu bot, senapan Arisaka bersangkur.", TKR, (p) => (
    <group position={at(p, "R")} rotation={[0.1, 0, 0.75]}><group position={[0, -0.05, 0.02]}><Rifle kind="arisaka" /></group></group>
  )],
  ["Orator Radio", "Terinspirasi Bung Tomo", "Kemeja khaki, rambut klimis, mikrofon Radio Pemberontakan; menunjuk tegas sambil membakar semangat.", ORATOR, () => (
    <group position={[-0.26, 1.2, 0.36]}><RadioMic /></group>
  )],
  ["Relawan Palang Merah", "Penolong di garis depan", "Blus putih, rambut disanggul, ban lengan palang merah, tas obat, sandal.", PMI, (p) => (
    <group position={at(p, "L")}><MedBag /></group>
  )],
];
const INGGRIS: Row[] = [
  ["Prajurit Gurkha", "Divisi India ke-5", "Topi lebar khas Gurkha, seragam hijau rimba, webbing, pembalut betis, golok kukri terangkat.", GURKHA, (p) => (
    <group position={at(p, "R")} rotation={[0.6, 0, -0.5]}><Kukri /></group>
  )],
  ["Tentara Inggris", "Brigade India ke-49", "Helm Brodie berjaring, seragam hijau rimba, webbing 37, kumis, siaga dengan Lee-Enfield No.4 bersangkur.", BRITISH, (p) => (
    <group position={at(p, "R")} rotation={[0.1, 0, 0.75]}><group position={[0, -0.05, 0.02]}><Rifle kind="enfield" bayonet /></group></group>
  )],
  ["Perwira Inggris", "Komandan lapangan (fiktif)", "Topi pet berpita merah, seragam perwira, syal merah, kumis, teropong; tenang & angkuh.", OFFICER, (p) => (
    <group position={at(p, "L")} rotation={[0, 0, 0]}><group position={[0.03, 0.04, 0.03]}><Binoculars /></group></group>
  )],
];
const Sheet: React.FC<{ title: string; rows: Row[]; rot: number[]; bg: string }> = ({ title, rows, rot, bg }) => {
  const n = rows.length;
  const gap = 1.55;
  const dist = 4.4 + n * 1.0;
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas width={2000} height={1150} shadows flat camera={{ fov: 24, near: 0.5, far: 200, position: [0, 1.0, dist] }}>
        <ToonRes />
        <CameraRig position={[0, 1.0, dist]} lookAt={[0, 0.92, 0]} fov={24} />
        <hemisphereLight args={["#ffe2c4", "#4a3a3a", 1.1]} />
        <directionalLight position={[-5, 6, 6]} intensity={1.9} color="#fff0dc" castShadow />
        <directionalLight position={[6, 3, -4]} intensity={1.2} color="#ff9a5a" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <meshToonMaterial color="#5a4a3e" />
        </mesh>
        {rows.map(([, , , p, extra], i) => (
          <Hero key={i} p={p} position={[(i - (n - 1) / 2) * gap, 0, 0]} rotation={[0, rot[i], 0]} scale={1.1}>
            {extra(p)}
          </Hero>
        ))}
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 22, left: 40, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 46, color: "#fff4e0", textShadow: "3px 3px 0 #000" }}>{title}</div>
      <div style={{ position: "absolute", bottom: 18, left: 40, right: 40, display: "flex", gap: 16 }}>
        {rows.map(([nm, r, d]) => (
          <div key={nm} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif", background: "rgba(10,8,14,0.72)", borderRadius: 12, padding: "8px 10px" }}>
            <div style={{ fontWeight: 900, fontSize: 27, color: "#fff4e0" }}>{nm}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#ffb05a" }}>{r}</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#e8dccb", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
const BG = "linear-gradient(#1e1a2e 0%, #6a3a2a 45%, #c8743a 62%, #3a2a24 63%, #2a201c 100%)";
export const SheetSurabaya: React.FC = () => <Sheet title="KARAKTER · PIHAK INDONESIA · SURABAYA 1945" rows={INDONESIA} rot={[0.3, 0.15, 0.1, -0.1]} bg={BG} />;
export const SheetSurabayaInggris: React.FC = () => <Sheet title="KARAKTER · PIHAK INGGRIS (SEKUTU) · SURABAYA 1945" rows={INGGRIS} rot={[0.25, -0.15, -0.25]} bg="linear-gradient(#141a24 0%, #3a3a4a 45%, #8a6a4a 62%, #2a2a26 63%, #1e1e1c 100%)" />;

// Lembar karakter & properti "Kantor di Atas Awan" (Kang Nawas #2) — untuk disetujui sebelum membangun adegan.
import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { Bean3, Bean3Params, Expr3, ToonRes, ToonSky, Vec3 } from "./three/toon";
import { Brick, Bucket, CardboardOffice, Kite, OldPhoto, RooftopSet, Shovel, Tears, ToyDrone } from "./three/objectsAwan";
import { BOS, NAWAS, SINTA, UDIN } from "./SheetNawas";

const HELM = (p: Bean3Params, c = "#ffcc1a"): Bean3Params => ({ ...p, hat: "helmet", hatColor: c, hatBand: "#e8a800" });
const Lights: React.FC = () => (
  <>
    <hemisphereLight args={["#f4f8ff", "#c8b8a0", 1.3]} />
    <directionalLight position={[-4, 8, 10]} intensity={1.8} color="#fff4e4" castShadow />
  </>
);
const Title: React.FC<{ t: string }> = ({ t }) => (
  <div style={{ position: "absolute", top: 24, left: 40, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 50, color: "#1e2240" }}>{t}</div>
);

const CHARS: [string, string, Bean3Params, Expr3][] = [
  ["Kang Nawas", "helm kuning, peci dilepas", HELM(NAWAS), "smug"],
  ["Pak Bos: memerintah", "jas + dasi merah", BOS, "shout"],
  ["Pak Bos: melempar bata", "berkeringat", { ...BOS, handR: [0.3, 1.5, 0.1] }, "determined"],
  ["Pak Bos: menangis", "pegang foto lama", { ...BOS, handR: [0.12, 1.0, 0.4], handL: [-0.12, 1.0, 0.4], headTilt: -0.15 }, "worried"],
  ["Mbak Sinta", "helm putih, ember semen", HELM(SINTA, "#f4f4f4"), "worried"],
  ["Mas Udin", "helm oranye, sekop", HELM(UDIN, "#ff8a2a"), "laugh"],
];
export const SheetAwan: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#eef6ff, #f8efe0)" }}>
    <ThreeCanvas width={2000} height={1000} shadows flat camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 17] }}>
      <ToonRes />
      <CameraRig position={[0, 1.35, 14]} lookAt={[0, 1.0, 0]} fov={22} />
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshToonMaterial color="#d8d0c0" />
      </mesh>
      {CHARS.map(([, , p, e], i) => {
        const x = -4.6 + i * 1.84;
        return (
          <group key={i}>
            <Bean3 p={{ ...p, expr: e }} position={[x, 0, 0]} rotation={[0, 0.12, 0]} />
            {i === 2 ? <Brick position={[x + 0.3, 1.58, 0.1]} rotation={[0.3, 0.4, 0.2]} /> : null}
            {i === 3 ? (
              <>
                <OldPhoto position={[x, 1.08, 0.48]} rotation={[-0.3, 0.12, 0]} scale={1.6} />
                <Tears head={[x, 1.42, 0]} f={6} yaw={0.12} />
              </>
            ) : null}
            {i === 4 ? <Bucket position={[x + 0.42, 0.42, 0.15]} scale={0.8} /> : null}
            {i === 5 ? <Shovel position={[x + 0.45, 0.15, 0.15]} rotation={[0, 0, -0.15]} /> : null}
          </group>
        );
      })}
    </ThreeCanvas>
    <Title t='KARAKTER · "KANTOR DI ATAS AWAN"' />
    <div style={{ position: "absolute", bottom: 26, left: 30, right: 30, display: "flex", gap: 10 }}>
      {CHARS.map(([n, d]) => (
        <div key={n} style={{ flex: 1, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 900, fontSize: 26, color: "#1e2240" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#4a4a6a", marginTop: 4 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const PropShot: React.FC<{ cam: Vec3; look: Vec3; fov?: number; bg: string; children: React.ReactNode }> = ({ cam, look, fov = 40, bg, children }) => (
  <div style={{ position: "relative", width: 1000, height: 1000, overflow: "hidden", background: bg }}>
    <ThreeCanvas width={1000} height={1000} shadows flat camera={{ fov, near: 0.05, far: 300, position: cam }}>
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
export const SheetAwanProps: React.FC = () => (
  <AbsoluteFill style={{ background: "#1e2240", display: "flex", flexWrap: "wrap" }}>
    <div style={{ position: "relative" }}>
      <PropShot cam={[1.5, 2.6, 7.5]} look={[0, 1.0, -1.0]} fov={48} bg="#8ac8ff">
        <ToonSky top="#4a9ae8" horizon="#cfe8ff" />
        <Lights />
        <RooftopSet />
      </PropShot>
      <Cap t="1 · Rooftop kantor (siang)" d="Lantai beton, tembok pembatas, tangki air biru, 2 unit AC, antena lampu merah, pipa, pintu tangga, pot tanaman, kursi plastik, gedung kota, mobil hitam Pak Bos (parkir atap)." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[0.6, 1.8, 4.4]} look={[0, 1.15, -0.5]} fov={46} bg="#ff9a5a">
        <ToonSky top="#3a2a6a" horizon="#ff9a4a" />
        <hemisphereLight args={["#ffd8a8", "#5a3a5a", 1.0]} />
        <directionalLight position={[5, 3, -4]} intensity={1.6} color="#ffb070" />
        <RooftopSet dusk={1} car={false} office={<CardboardOffice position={[0, 0, -0.8]} tarp={1} />} />
      </PropShot>
      <Cap t="2 · Kejutan: kantor kardus 'di atas awan' (senja)" d="Kardus 3×3 m, awan kapas, spanduk 'Kantor Pertama Kita · Jilid 2', meja lipat, laptop kardus, kipas, lampu tumbler, foto lama ditempel; terpal biru penutup ditarik." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[0, 0.9, 2.3]} look={[0, 0.6, 0]} fov={40} bg="#cfe8ff">
        <ToonSky top="#6ab0f0" horizon="#e8f4ff" />
        <Lights />
        <Kite position={[-0.55, 1.05, 0]} rotation={[0, 0.2, 0.15]} sway={0.5} />
        <ToyDrone position={[0.45, 0.95, 0]} rotation={[0.15, -0.3, 0]} scale={1.6} spin={0.5} />
        <Brick position={[-0.35, 0.25, 0.4]} rotation={[0, 0.4, 0]} scale={1.4} />
        <Bucket position={[0.15, 0, 0.3]} />
        <Shovel position={[0.6, 0.12, 0.2]} rotation={[0, 0, -0.3]} />
        <OldPhoto position={[-0.05, 0.55, 0.6]} rotation={[-0.2, 0, 0]} scale={2.0} />
      </PropShot>
      <Cap t="3 · Benda penting (ikut tangan)" d="Layang-layang, drone mainan membawa 1 bata kecil, bata merah, ember semen, sekop, foto lama Pak Bos muda + ayahnya ('Kantor pertama kita · 3x3 m')." />
    </div>
    <div style={{ position: "relative" }}>
      <PropShot cam={[3.9, 1.9, 4.6]} look={[2.0, 0.5, 2.0]} fov={40} bg="#8ac8ff">
        <ToonSky top="#4a9ae8" horizon="#cfe8ff" />
        <Lights />
        <RooftopSet dent={1} />
        <Brick position={[2.16, 0.7, 2.43]} rotation={[0.3, 0.8, 0.1]} />
      </PropShot>
      <Cap t="4 · Bata jatuh ke kap mobil Pak Bos" d="Kap penyok + retak, bata tergeletak di atasnya (KREK!). Lemparan kedua jatuh ke celengan babi (dari ruang Pak Bos)." />
    </div>
  </AbsoluteFill>
);

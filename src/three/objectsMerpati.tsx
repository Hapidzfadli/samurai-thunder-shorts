/* Rudal Merpati 1944 (Project Pigeon) — merpati 2D (kartu kanvas DataTexture tiap frame) + properti 3D bergaris tinta. */
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { P } from "./objectsRig";
import { InkBox } from "./objectsMolase";
import { Sign, signTex } from "./objectsMolaseProps";

type V3 = [number, number, number];
const B = InkBox;
const INKC = "#241726";

const Cyl: React.FC<{ pos: V3; r: number; h: number; color: string; rot?: V3; hull?: number; seg?: number; r2?: number; emissive?: string }> = ({
  pos, r, h, color, rot = [0, 0, 0], hull = 0.06, seg = 16, r2, emissive,
}) => <P geo={() => <cylinderGeometry args={[r2 ?? r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} emissive={emissive} />;

const Ball: React.FC<{ pos: V3; r: number; color: string; scale?: V3; hull?: number; emissive?: string }> = ({
  pos, r, color, scale, hull = 0.06, emissive,
}) => <P geo={() => <sphereGeometry args={[r, 18, 14]} />} color={color} pos={pos} scale={scale ?? 1} hull={hull} emissive={emissive} />;

/* ================================================================== */
/* MERPATI PILOT 2D (kartu kanvas DataTexture, digambar tiap frame!)  */
/* ================================================================== */
export type PigeonParams = {
  flap?: number; // 0..1 sayap (0 = terlipat rapi, 0.5 = rentang, 1 = kepak atas)
  peck?: number; // 0..1 leher menukik mematuk ke depan
  expr?: "focus" | "happy" | "hungry" | "shock" | "smug";
  harness?: boolean; // rompi sabuk pengaman proyek Pelican + kontak paruh
  goggles?: boolean; // kacamata pilot mini di dahi
  corn?: boolean; // biji jagung kuning di paruh
  faceDir?: 1 | -1; // arah hadap profil 3/4
  body?: string;
  seed?: number;
};

const PW = 460;
const PH = 380;

const drawPigeon = (c: CanvasRenderingContext2D, p: PigeonParams) => {
  c.clearRect(0, 0, PW, PH);
  const body = p.body ?? "#8b9bb0";
  const wingC = "#6c7c92";
  const darkBar = "#374254";
  const fl = p.flap ?? 0;
  const pk = p.peck ?? 0;
  const dir = p.faceDir ?? 1;

  c.save();
  if (dir < 0) {
    c.translate(PW, 0);
    c.scale(-1, 1);
  }
  c.lineJoin = "round";
  c.lineCap = "round";

  const cx = 215;
  const cy = 220;

  // Sayap belakang (jika mengepak)
  if (fl > 0.06) {
    const lift = fl * 125;
    c.beginPath();
    c.moveTo(cx - 10, cy - 22);
    c.quadraticCurveTo(cx - 75, cy - 95 - lift * 0.7, cx - 125, cy - 40 - lift);
    c.quadraticCurveTo(cx - 85, cy + 5 - lift * 0.3, cx - 18, cy + 12);
    c.closePath();
    c.fillStyle = "#5c6b80";
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.stroke();
  }

  // Ekor kipas abu-abu + pita hitam khas merpati kota
  c.beginPath();
  c.moveTo(cx - 56, cy + 8);
  c.lineTo(cx - 134, cy + 36);
  c.lineTo(cx - 124, cy + 62);
  c.lineTo(cx - 48, cy + 30);
  c.closePath();
  c.fillStyle = wingC;
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 7;
  c.stroke();
  c.strokeStyle = darkBar;
  c.lineWidth = 10;
  c.beginPath();
  c.moveTo(cx - 115, cy + 31);
  c.lineTo(cx - 107, cy + 54);
  c.stroke();

  // Kaki merah muda oranye khas merpati
  c.strokeStyle = "#d95b43";
  c.lineWidth = 7;
  for (const dx of [-14, 12]) {
    c.beginPath();
    c.moveTo(cx + dx, cy + 52);
    c.lineTo(cx + dx + 4, cy + 92);
    c.moveTo(cx + dx - 8, cy + 92);
    c.lineTo(cx + dx + 18, cy + 92);
    c.stroke();
  }

  // Badan bulat gempal merpati
  c.beginPath();
  c.ellipse(cx, cy + 8, 68, 52, -0.18, 0, Math.PI * 2);
  c.fillStyle = body;
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 8;
  c.stroke();

  // Kilau leher/dada hijau-ungu khas merpati
  c.beginPath();
  c.ellipse(cx + 36, cy - 8, 28, 32, 0.2, 0, Math.PI * 2);
  c.fillStyle = "#5ea38a";
  c.fill();
  c.beginPath();
  c.ellipse(cx + 32, cy + 6, 24, 22, 0.2, 0, Math.PI * 2);
  c.fillStyle = "#8f6ca8";
  c.fill();

  // Rompi sabuk pengaman (harness kulit/kanvas Proyek Pelican)
  if (p.harness) {
    c.fillStyle = "#8b6d43";
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.beginPath();
    c.roundRect(cx - 32, cy - 32, 64, 76, 12);
    c.fill();
    c.stroke();
    // Gesper logam kuning di tengah rompi
    c.fillStyle = "#eab308";
    c.beginPath();
    c.roundRect(cx - 8, cy - 4, 22, 22, 4);
    c.fill();
    c.stroke();
  }

  // Sayap depan (terlipat dengan 2 garis hitam khas merpati, atau mengepak)
  if (fl <= 0.06) {
    c.beginPath();
    c.ellipse(cx - 10, cy + 10, 50, 28, -0.15, 0, Math.PI * 2);
    c.fillStyle = wingC;
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = darkBar;
    c.lineWidth = 7;
    for (const ox of [-22, -4]) {
      c.beginPath();
      c.moveTo(cx + ox, cy - 10);
      c.lineTo(cx + ox - 8, cy + 28);
      c.stroke();
    }
  } else {
    const lift = (fl - 0.3) * 145;
    c.beginPath();
    c.moveTo(cx + 4, cy - 6);
    c.quadraticCurveTo(cx - 45, cy - 105 - lift, cx - 115, cy - 65 - lift);
    c.quadraticCurveTo(cx - 75, cy + 10 - lift * 0.3, cx - 12, cy + 20);
    c.closePath();
    c.fillStyle = wingC;
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.stroke();
  }

  // Kepala + Leher (manggut maju-bawah saat mematuk `peck`)
  c.save();
  const hx = cx + 46 + pk * 36;
  const hy = cy - 48 + pk * 26;
  c.translate(hx, hy);
  c.rotate(pk * 0.48);

  // Leher penghubung
  c.beginPath();
  c.ellipse(-10, 24, 24, 30, -0.25, 0, Math.PI * 2);
  c.fillStyle = body;
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 7;
  c.stroke();

  // Kepala bulat
  c.beginPath();
  c.arc(0, 0, 32, 0, Math.PI * 2);
  c.fillStyle = body;
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 7.5;
  c.stroke();

  // Kacamata pilot di dahi (opsional)
  if (p.goggles) {
    c.strokeStyle = "#4a321f";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-28, -12);
    c.lineTo(24, -16);
    c.stroke();
    c.fillStyle = "#bae6fd";
    c.strokeStyle = INKC;
    c.lineWidth = 5;
    c.beginPath();
    c.roundRect(-4, -28, 28, 20, 6);
    c.fill();
    c.stroke();
  }

  // Paruh runcing + cere putih di pangkal paruh
  c.beginPath();
  c.moveTo(28, -4);
  c.lineTo(62, 4);
  c.lineTo(28, 12);
  c.closePath();
  c.fillStyle = p.harness ? "#d97706" : "#475569"; // ujung paruh tembaga kontak layar saat bertugas!
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 6;
  c.stroke();

  c.beginPath();
  c.ellipse(29, -3, 8, 6, -0.2, 0, Math.PI * 2);
  c.fillStyle = "#f8fafc";
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 4;
  c.stroke();

  // Biji jagung emas di paruh + remah saat lapar/makan
  if (p.corn) {
    c.beginPath();
    c.ellipse(60, 8, 11, 8, 0.3, 0, Math.PI * 2);
    c.fillStyle = "#facc15";
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 4.5;
    c.stroke();
  }

  // Garis kejut patuk ("TOK!") saat peck > 0.65
  if (pk > 0.65) {
    c.strokeStyle = "#ef4444";
    c.lineWidth = 5;
    for (const a of [-0.6, 0, 0.6]) {
      c.beginPath();
      c.moveTo(68 + Math.cos(a) * 6, 4 + Math.sin(a) * 6);
      c.lineTo(68 + Math.cos(a) * 20, 4 + Math.sin(a) * 20);
      c.stroke();
    }
  }

  // Mata ekspresif merpati (lingkar luar oranye terang + pupil hitam)
  const ex = p.expr ?? "focus";
  const er = ex === "shock" ? 15 : ex === "hungry" ? 14 : 12;
  c.beginPath();
  c.arc(8, -4, er, 0, Math.PI * 2);
  c.fillStyle = ex === "hungry" ? "#fde047" : "#fb923c";
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 5;
  c.stroke();

  c.beginPath();
  c.arc(10, -4, ex === "shock" ? 4.5 : 6, 0, Math.PI * 2);
  c.fillStyle = INKC;
  c.fill();

  c.beginPath();
  c.arc(12, -7, 2.2, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();

  // Alis ekspresi (fokus tajam / sok yakin / senang)
  if (ex === "focus" || ex === "smug") {
    c.strokeStyle = INKC;
    c.lineWidth = 5.5;
    c.beginPath();
    c.moveTo(-4, -16);
    c.lineTo(21, ex === "focus" ? -11 : -15);
    c.stroke();
  } else if (ex === "happy") {
    c.strokeStyle = INKC;
    c.lineWidth = 4.5;
    c.beginPath();
    c.arc(8, -14, 10, 1.1 * Math.PI, 1.9 * Math.PI);
    c.stroke();
  }

  c.restore();
  c.restore();
};

export const PigeonCard: React.FC<{
  position: V3;
  size?: number;
  params: PigeonParams;
  roll?: number;
  faceCam?: boolean;
  shadow?: boolean;
}> = ({ position, size = 0.62, params, roll = 0, faceCam = true, shadow = false }) => {
  const frameNo = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const { cv, tex, buf } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = PW;
    cv.height = PH;
    const buf = new Uint8Array(PW * PH * 4);
    const tex = new THREE.DataTexture(buf, PW, PH, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return { cv, tex, buf };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameNo]);
  useEffect(() => () => tex.dispose(), [tex]);
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  drawPigeon(ctx, params);
  buf.set(ctx.getImageData(0, 0, PW, PH).data);
  tex.needsUpdate = true;

  const face = faceCam ? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]) : 0;
  const h = size * (PH / PW);
  return (
    <group position={position} rotation={[0, face, 0]}>
      <mesh position={[0, h * 0.42, 0]} rotation={[0, 0, roll]}>
        <planeGeometry args={[size, h]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {shadow && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.45, 1]}>
          <circleGeometry args={[size * 0.28, 16]} />
          <meshBasicMaterial color="#1a1030" transparent opacity={0.28} />
        </mesh>
      )}
    </group>
  );
};

/** Kawanan merpati bermanuver serempak di langit Minnesota */
export const PigeonFlock: React.FC<{
  center: V3;
  count?: number;
  spread?: V3;
  t: number;
  size?: number;
  drift?: V3;
  seed?: number;
}> = ({ center, count = 12, spread = [4, 1.8, 1.8], t, size = 0.42, drift = [0.7, 0.15, 0], seed = 1 }) => {
  const items = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const h = (k: number) => {
          const x = Math.sin((i + 1) * 12.9898 * k + seed * 78.233) * 43758.5453;
          return x - Math.floor(x);
        };
        return { x: h(1) - 0.5, y: h(2) - 0.5, z: h(3) - 0.5, ph: h(4), sp: 0.85 + h(5) * 0.35, s: 0.8 + h(6) * 0.35 };
      }),
    [count, seed]
  );
  const bank = Math.sin(t * 1.6) * 0.22;
  return (
    <group>
      {items.map((b, i) => {
        const k = t * b.sp;
        const pos: V3 = [
          center[0] + b.x * spread[0] + drift[0] * k + Math.cos(t * 1.6 + b.ph) * 0.6,
          center[1] + b.y * spread[1] + drift[1] * k + Math.sin(t * 2.1 + b.ph * 4) * 0.35,
          center[2] + b.z * spread[2] + drift[2] * k,
        ];
        const flap = 0.25 + 0.75 * Math.abs(Math.sin((t * 9.5 + b.ph * 5) * b.sp));
        return (
          <PigeonCard
            key={i}
            position={pos}
            size={size * b.s}
            params={{ flap, expr: "focus", seed: i }}
            roll={bank}
          />
        );
      })}
    </group>
  );
};

/* ================================================================== */
/* OBJEK TANGAN 3D TERPISAH (mengikuti beanHandWorld — CLAUDE.md §3!) */
/* ================================================================== */
export const CornBag3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; spill?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
  spill = 0,
}) => (
  <group position={pos} rotation={rot} scale={scale}>
    <B pos={[0, 0.14, 0]} size={[0.24, 0.30, 0.16]} color="#e6c387" ink={0.03} />
    <B pos={[0, 0.15, 0.085]} size={[0.18, 0.10, 0.01]} color="#b91c1c" ink={0.01} />
    {/* Tumpukan biji jagung emas di mulut kantong */}
    {[-0.06, 0, 0.06].map((x, i) => (
      <Ball key={i} pos={[x, 0.30 + (i === 1 ? 0.02 : 0), 0]} r={0.045} color="#facc15" hull={0.12} />
    ))}
    {spill > 0 &&
      [0, 1, 2, 3, 4].map((i) => (
        <Ball
          key={`sp${i}`}
          pos={[(i - 2) * 0.06 * spill, 0.28 - spill * (0.25 + i * 0.09), 0.06 + spill * 0.12]}
          r={0.03}
          color="#fde047"
          hull={0.15}
        />
      ))}
  </group>
);

export const CornScatter3D: React.FC<{ pos?: V3; count?: number }> = ({ pos = [0, 0, 0], count = 14 }) => (
  <group position={pos}>
    {new Array(count).fill(0).map((_, i) => {
      const a = i * 2.399;
      const r = 0.08 + (i % 5) * 0.11;
      return <Ball key={i} pos={[Math.cos(a) * r, 0.03, Math.sin(a) * r]} r={0.032} color={i % 2 ? "#facc15" : "#fde047"} hull={0.14} />;
    })}
  </group>
);

/* ================================================================== */
/* LATAR 1: KERETA & PABRIK TEPUNG MINNESOTA (1940, SENJA)            */
/* ================================================================== */
export const TrainCoach: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    {/* Rel kereta & bantalan kayu */}
    <B pos={[0, 0.04, 0.65]} size={[9.5, 0.08, 0.12]} color="#52525b" ink={0.02} />
    <B pos={[0, 0.04, -0.65]} size={[9.5, 0.08, 0.12]} color="#52525b" ink={0.02} />
    {new Array(11).fill(0).map((_, i) => (
      <B key={i} pos={[-4.2 + i * 0.84, 0.01, 0]} size={[0.26, 0.05, 1.8]} color="#6b4423" ink={0.02} />
    ))}
    {/* Roda besi */}
    {[-2.8, -1.8, 1.8, 2.8].map((x) =>
      [-0.65, 0.65].map((z) => (
        <Cyl key={`${x}${z}`} pos={[x, 0.36, z]} r={0.34} h={0.14} color="#27272a" rot={[Math.PI / 2, 0, 0]} hull={0.08} />
      ))
    )}
    {/* Badan gerbong penumpang hijau Pullman 1940-an */}
    <B pos={[0, 1.85, 0]} size={[7.6, 2.35, 2.1]} color="#2f4f3e" ink={0.05} />
    <B pos={[0, 0.85, 1.07]} size={[7.62, 0.16, 0.04]} color="#eab308" ink={0.01} />
    <B pos={[0, 3.12, 0]} size={[7.8, 0.28, 2.24]} color="#243b2f" ink={0.04} />
    {/* Deretan jendela kaca terang */}
    {[-2.5, -1.25, 0, 1.25, 2.5].map((x, i) => (
      <group key={i} position={[x, 2.05, 1.07]}>
        <B pos={[0, 0, 0]} size={[0.92, 0.86, 0.06]} color="#9a6b38" ink={0.02} />
        <B pos={[0, 0, 0.02]} size={[0.78, 0.72, 0.04]} color="#fde68a" ink={0.01} />
      </group>
    ))}
    <Sign pos={[0, 1.32, 1.09]} w={2.8} h={0.28} text="MINNESOTA EXPRESS · 1940" bg="#f6e8c8" fg="#1f2937" />
  </group>
);

export const GrainSilo: React.FC<{ pos?: V3; scale?: number }> = ({ pos = [0, 0, 0], scale = 1 }) => (
  <group position={pos} scale={scale}>
    <Cyl pos={[-1.1, 2.4, 0]} r={0.95} h={4.8} color="#dfd6c3" hull={0.05} seg={20} />
    <P geo={() => <sphereGeometry args={[0.98, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />} color="#b91c1c" pos={[-1.1, 4.8, 0]} hull={0.05} />
    <Cyl pos={[0.85, 2.0, -0.2]} r={0.8} h={4.0} color="#e5decb" hull={0.05} seg={20} />
    <P geo={() => <sphereGeometry args={[0.83, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />} color="#b91c1c" pos={[0.85, 4.0, -0.2]} hull={0.05} />
    {/* Gudang pabrik tepung General Mills */}
    <B pos={[0.2, 1.25, 1.1]} size={[3.4, 2.5, 1.9]} color="#b4533a" ink={0.05} />
    <B pos={[0.2, 2.62, 1.1]} size={[3.6, 0.28, 2.1]} color="#573428" ink={0.04} />
    <Sign pos={[0.2, 1.85, 2.08]} w={2.7} h={0.52} text="FLOUR MILL · MINNEAPOLIS" bg="#fbf2dc" fg="#7f1d1d" />
  </group>
);

export const ParkBench: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0.48, 0]} size={[1.8, 0.08, 0.55]} color="#9a683a" ink={0.03} />
    <B pos={[0, 0.88, -0.24]} size={[1.8, 0.55, 0.08]} color="#9a683a" ink={0.03} rot={[-0.15, 0, 0]} />
    {[-0.75, 0.75].map((x) => (
      <group key={x}>
        <B pos={[x, 0.24, 0.18]} size={[0.09, 0.48, 0.09]} color="#27272a" ink={0.02} />
        <B pos={[x, 0.45, -0.2]} size={[0.09, 0.9, 0.09]} color="#27272a" ink={0.02} />
      </group>
    ))}
  </group>
);

/* ================================================================== */
/* LATAR 2: LAB PROYEK MERPATI (KOTAK PATUK & MONCONG 3-LAYAR)        */
/* ================================================================== */
/** Kotak pelatihan patuk Skinner: layar target kapal + lampu hadiah + dispenser jagung */
export const SkinnerBox: React.FC<{
  pos?: V3;
  rot?: V3;
  shipOffset?: [number, number];
  pecked?: number;
  pigeonInside?: boolean;
  t?: number;
}> = ({ pos = [0, 0, 0], rot = [0, 0, 0], shipOffset = [0, 0], pecked = 0, pigeonInside = true, t = 0 }) => (
  <group position={pos} rotation={rot}>
    {/* Meja penyangga */}
    <B pos={[0, 0.45, 0]} size={[1.9, 0.9, 1.2]} color="#6b4b32" ink={0.04} />
    {/* Kotak pelatihan berpintu kaca terbuka di depan */}
    <B pos={[0, 1.55, -0.48]} size={[1.75, 1.3, 0.12]} color="#d6cbb5" ink={0.04} />
    <B pos={[-0.84, 1.55, 0]} size={[0.1, 1.3, 1.05]} color="#c9bda6" ink={0.04} />
    <B pos={[0.84, 1.55, 0]} size={[0.1, 1.3, 1.05]} color="#c9bda6" ink={0.04} />
    <B pos={[0, 2.22, 0]} size={[1.82, 0.12, 1.12]} color="#525b44" ink={0.04} />

    {/* Layar kaca proyeksi target kapal di sisi kanan dalam */}
    <B pos={[0.74, 1.62, 0.02]} size={[0.08, 0.68, 0.68]} color="#bae6fd" ink={0.03} />
    {/* Siluet kapal musuh kecil di layar */}
    <B
      pos={[0.7, 1.60 + shipOffset[1] * 0.15, 0.02 + shipOffset[0] * 0.18]}
      size={[0.03, 0.12, 0.34]}
      color={pecked > 0.3 ? "#dc2626" : "#1e293b"}
      ink={0.01}
    />
    {/* Lampu indikator hijau "HADIAH JAGUNG" */}
    <Ball pos={[0.72, 2.04, 0.02]} r={0.07} color={pecked > 0.2 ? "#4ade80" : "#94a3b8"} emissive={pecked > 0.2 ? "#22c55e" : undefined} hull={0.12} />

    {/* Corong & mangkuk biji jagung */}
    <Cyl pos={[0.58, 1.05, 0.28]} r={0.14} h={0.14} color="#eab308" hull={0.08} />
    <Sign pos={[0, 2.42, 0.3]} w={1.65} h={0.32} text="KOTAK LATIH SKINNER" bg="#fbf2dc" fg="#1e293b" />

    {pigeonInside && (
      <PigeonCard
        position={[-0.08, 0.92, 0.12]}
        size={0.72}
        faceCam={false}
        params={{ flap: 0, peck: pecked, harness: true, expr: "focus", seed: 4 }}
      />
    )}
    {t < -999 && null}
  </group>
);

/** Moncong Bom Luncur Pelican 3-Lensa & 3-Kompartemen Merpati (Cutaway / Utuh) */
export const PelicanNoseCone: React.FC<{
  pos?: V3;
  rot?: V3;
  open?: number;
  peckPhase?: number;
  distracted?: boolean;
  scale?: number;
}> = ({ pos = [0, 0, 0], rot = [0, 0, 0], open = 0.5, peckPhase = 0, distracted = false, scale = 1 }) => (
  <group position={pos} rotation={rot} scale={scale}>
    {/* Kaki dudukan bengkel */}
    <B pos={[0, 0.34, 0]} size={[1.5, 0.68, 1.1]} color="#475569" ink={0.04} />
    {/* Dinding belakang silinder bom zaitun (setengah belakang tetap utuh agar kabin terlihat) */}
    <B pos={[0, 1.48, -0.32]} size={[1.42, 1.56, 0.42]} color="#596240" ink={0.04} />

    {/* 3 kompartemen segitiga untuk 3 merpati "voting mayoritas" */}
    {[
      [-0.34, 1.78, 0.14],
      [0.34, 1.78, 0.14],
      [0.0, 1.16, 0.14],
    ].map(([px, py, pz], i) => {
      const pk = 0.25 + 0.75 * Math.abs(Math.sin(peckPhase * 9 + i * 1.4));
      return (
        <group key={i} position={[px, py, pz]}>
          <B pos={[0, 0, -0.12]} size={[0.56, 0.50, 0.12]} color="#1e293b" ink={0.025} />
          <B pos={[0, -0.23, 0.04]} size={[0.56, 0.06, 0.36]} color="#334155" ink={0.015} />
          {/* Layar kaca proyeksi di samping kanan tiap kabin agar merpati mematuk terlihat jelas */}
          <B pos={[0.21, 0.04, 0.10]} size={[0.06, 0.34, 0.28]} color={distracted ? "#fde047" : "#7dd3fc"} ink={0.015} />
          <PigeonCard
            position={[-0.05, -0.20, 0.16]}
            size={0.44}
            faceCam={false}
            params={{
              flap: 0,
              peck: pk,
              harness: true,
              corn: distracted,
              expr: distracted ? "hungry" : "focus",
              seed: 10 + i,
            }}
          />
        </group>
      );
    })}

    {/* Cangkang depan ber-3 lensa optik (terbelah ke kiri/kanan saat open > 0) */}
    {[-1, 1].map((s) => (
      <group key={s} position={[s * open * 0.92, 1.48, 0.18]} rotation={[0, s * open * 0.35, -s * open * 0.12]}>
        <B pos={[s * 0.36, 0, 0.22]} size={[0.72, 1.50, 0.12]} color="#6b7450" ink={0.03} />
        <B pos={[s * 0.36, -0.52, 0.29]} size={[0.66, 0.16, 0.02]} color="#facc15" ink={0.01} />
        <Cyl pos={[s * 0.34, 0.32, 0.30]} r={0.14} h={0.10} color="#38bdf8" rot={[Math.PI / 2, 0, 0]} hull={0.1} />
        {s > 0 && <Cyl pos={[-0.34 + (1 - Math.min(1, open)) * 0.34, -0.24, 0.30]} r={0.14} h={0.10} color="#38bdf8" rot={[Math.PI / 2, 0, 0]} hull={0.1} />}
      </group>
    ))}
    {/* Kubah pucuk atas */}
    <P geo={() => <cylinderGeometry args={[0.42, 0.72, 0.34, 18]} />} color="#596240" pos={[0, 2.43, -0.08]} hull={0.04} />
    <Sign pos={[0, 0.44, 0.58]} w={1.38} h={0.28} text="PELICAN · 3 MERPATI" bg="#fbf2dc" fg="#7f1d1d" />
  </group>
);

/** Meja kendali lab + penghitung 10.000 patukan + map $25,000 */
export const ControlDesk: React.FC<{ pos?: V3; rot?: V3; countText?: string }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  countText = "10.000 PATUKAN!",
}) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0.9, 0]} size={[2.6, 0.12, 1.1]} color="#8a5a34" ink={0.04} />
    {[-1.15, 1.15].map((x) =>
      [-0.42, 0.42].map((z) => <B key={`${x}${z}`} pos={[x, 0.44, z]} size={[0.1, 0.88, 0.1]} color="#5a3a22" ink={0.03} />)
    )}
    {/* Penghitung mekanik besar */}
    <B pos={[-0.55, 1.18, -0.1]} size={[0.95, 0.44, 0.36]} color="#27272a" ink={0.03} />
    <Sign pos={[-0.55, 1.2, 0.09]} w={0.86} h={0.3} text={countText} bg="#fef9c3" fg="#991b1b" />
    {/* Toples kaca biji jagung */}
    <Cyl pos={[0.25, 1.14, 0.1]} r={0.14} h={0.36} color="#fde047" hull={0.09} />
    <Cyl pos={[0.25, 1.34, 0.1]} r={0.15} h={0.07} color="#78350f" hull={0.1} />
    {/* Map berkas PROJECT PIGEON */}
    <mesh position={[0.82, 0.97, 0.18]} rotation={[-Math.PI / 2, 0, 0.18]}>
      <planeGeometry args={[0.48, 0.6]} />
      <meshBasicMaterial map={signTex("PROJECT PIGEON · $25,000", "#f6f0dc", "#1e293b", 320, 380)} />
    </mesh>
  </group>
);

/* ================================================================== */
/* LATAR 3: LAPANGAN UJI SIMULASI NDRC (OKTOBER 1944 — KLIMAKS)       */
/* ================================================================== */
/** Bom Luncur Pelican bersayap tergantung di Gantungan Ayun Uji (miring ikut suara 3 merpati!) */
export const PelicanRig: React.FC<{
  pos?: V3;
  yaw?: number;
  pitch?: number;
  peckPhase?: number;
  cornMode?: boolean;
}> = ({ pos = [0, 0, 0], yaw = 0, pitch = 0, peckPhase = 0, cornMode = false }) => (
  <group position={pos}>
    {/* Rangka baja menara gantungan */}
    <B pos={[-1.45, 2.1, 0]} size={[0.16, 4.2, 0.16]} color="#475569" ink={0.04} />
    <B pos={[1.45, 2.1, 0]} size={[0.16, 4.2, 0.16]} color="#475569" ink={0.04} />
    <B pos={[0, 4.15, 0]} size={[3.2, 0.18, 0.22]} color="#334155" ink={0.04} />
    <B pos={[-1.45, 0.08, 0]} size={[0.55, 0.16, 1.4]} color="#334155" ink={0.03} />
    <B pos={[1.45, 0.08, 0]} size={[0.55, 0.16, 1.4]} color="#334155" ink={0.03} />

    {/* Batang ayun + Bom Luncur Pelican */}
    <group position={[0, 4.05, 0]} rotation={[pitch, yaw, -yaw * 0.35]}>
      <Cyl pos={[0, -0.65, 0]} r={0.05} h={1.3} color="#64748b" hull={0.12} />
      <group position={[0, -1.45, 0]}>
        {/* Badan bom luncur */}
        <Cyl pos={[0, 0, 0]} r={0.48} h={2.5} color="#66704b" rot={[Math.PI / 2, 0, 0]} hull={0.04} seg={20} />
        <P geo={() => <sphereGeometry args={[0.48, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />} color="#555e3d" pos={[0, 0, 1.25]} rot={[Math.PI / 2, 0, 0]} hull={0.05} />
        {/* 3 jendela lensa merpati di hidung */}
        {[-0.18, 0, 0.18].map((x, i) => (
          <Ball key={i} pos={[x, i === 1 ? 0.16 : -0.06, 1.66]} r={0.09} color={cornMode ? "#facc15" : "#bae6fd"} hull={0.1} />
        ))}
        {/* Sayap luncur lebar Pelican + sirip ekor kembar */}
        <B pos={[0, 0.12, 0.1]} size={[3.4, 0.09, 0.62]} color="#78825a" ink={0.04} />
        <B pos={[-0.75, 0.35, -1.15]} size={[0.08, 0.68, 0.48]} color="#555e3d" ink={0.03} />
        <B pos={[0.75, 0.35, -1.15]} size={[0.08, 0.68, 0.48]} color="#555e3d" ink={0.03} />
        <B pos={[0, 0.35, -1.15]} size={[1.6, 0.08, 0.42]} color="#66704b" ink={0.03} />
        <Sign pos={[0, 0.05, 0.5]} w={1.2} h={0.24} text="PELICAN" bg="#fef08a" fg="#1e293b" rot={[0, Math.PI / 2, 0]} />
      </group>
    </group>
    {/* Panel indikator suara mayoritas 3 merpati di atas palang */}
    <Sign
      pos={[0, 4.55, 0.14]}
      w={2.5}
      h={0.44}
      text={cornMode ? "SUARA 3-0: JAGUNG!!" : peckPhase > 0 ? "SUARA 3-0: KAPAL TARGET" : "UJI KENDALI MERPATI"}
      bg={cornMode ? "#fee2e2" : "#dcfce7"}
      fg={cornMode ? "#991b1b" : "#166534"}
    />
  </group>
);

/** Papan siluet kapal perang target di atas rel uji */
export const ShipTargetBoard: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0.18, 0]} size={[3.2, 0.36, 0.9]} color="#57534e" ink={0.04} />
    <B pos={[0, 0.95, 0]} size={[2.9, 0.65, 0.14]} color="#334155" ink={0.04} />
    <B pos={[0, 1.52, 0]} size={[1.4, 0.55, 0.14]} color="#475569" ink={0.04} />
    <Cyl pos={[0.25, 2.02, 0]} r={0.16} h={0.55} color="#1e293b" hull={0.08} />
    {/* Lingkaran sasaran merah-putih */}
    <Cyl pos={[-0.2, 0.98, 0.09]} r={0.34} h={0.04} color="#dc2626" rot={[Math.PI / 2, 0, 0]} hull={0.06} />
    <Cyl pos={[-0.2, 0.98, 0.11]} r={0.21} h={0.04} color="#ffffff" rot={[Math.PI / 2, 0, 0]} hull={0.04} />
    <Cyl pos={[-0.2, 0.98, 0.13]} r={0.09} h={0.04} color="#dc2626" rot={[Math.PI / 2, 0, 0]} hull={0.04} />
    <Sign pos={[0, 0.42, 0.48]} w={1.9} h={0.28} text="TARGET UJI · KAPAL" bg="#fbf2dc" fg="#1e293b" />
  </group>
);

/** Truk kantin militer pembawa jagung hangat Jenderal (sasaran salah belok!) */
export const CanteenTruck: React.FC<{ pos?: V3; rot?: V3; chaos?: number; t?: number }> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  chaos = 0,
  t = 0,
}) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0.72, 0]} size={[3.8, 0.72, 1.75]} color="#4d593c" ink={0.05} />
    <B pos={[1.25, 1.38, 0]} size={[1.25, 0.75, 1.65]} color="#596646" ink={0.05} />
    <B pos={[1.55, 1.4, 0]} size={[0.7, 0.45, 1.68]} color="#bae6fd" ink={0.015} />
    {/* Tenda kanvas belakang truk kantin */}
    <B pos={[-0.65, 1.65, 0]} size={[2.45, 1.25, 1.72]} color="#dfd3b6" ink={0.05} />
    {[-1.25, 1.25].map((x) =>
      [-0.86, 0.86].map((z) => (
        <Cyl key={`${x}${z}`} pos={[x, 0.4, z]} r={0.4} h={0.26} color="#1e1e22" rot={[Math.PI / 2, 0, 0]} hull={0.06} />
      ))
    )}
    <Sign pos={[-0.65, 1.68, 0.88]} w={2.1} h={0.42} text="KANTIN · JAGUNG JENDERAL" bg="#fef3c7" fg="#991b1b" />
    {/* Karung & ember jagung menggunung di samping truk */}
    <Cyl pos={[-1.5, 0.35, 1.15]} r={0.28} h={0.7} color="#d6b37c" hull={0.08} />
    <Ball pos={[-1.5, 0.72, 1.15]} r={0.25} color="#facc15" scale={[1, 0.5, 1]} hull={0.08} />
    {chaos > 0 && (
      <>
        <CornScatter3D pos={[-1.1, 0, 1.45]} count={18} />
        {[0, 1, 2, 3, 4].map((i) => (
          <PigeonCard
            key={i}
            position={[-1.6 + i * 0.45, 0.72 + (i % 2) * 1.45, 1.15 - (i % 2) * 0.4]}
            size={0.46}
            params={{
              flap: 0.4 + 0.5 * Math.abs(Math.sin(t * 12 + i)),
              peck: Math.abs(Math.sin(t * 14 + i)),
              corn: true,
              expr: "happy",
              seed: 30 + i,
            }}
          />
        ))}
      </>
    )}
  </group>
);

/** Perangkat Radar Elektronik 1944 (alasan sejarah Proyek Merpati dipensiunkan) */
export const RadarSet1944: React.FC<{ pos?: V3; rot?: V3; t?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], t = 0 }) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0.75, 0]} size={[1.4, 1.5, 0.95]} color="#3f4a3c" ink={0.05} />
    {/* Layar bundar osiloskop hijau */}
    <Cyl pos={[0, 1.05, 0.49]} r={0.32} h={0.06} color="#14532d" rot={[Math.PI / 2, 0, 0]} hull={0.08} />
    <Cyl pos={[0, 1.05, 0.51]} r={0.26} h={0.04} color="#4ade80" emissive="#22c55e" rot={[Math.PI / 2, 0, 0]} hull={0.04} />
    {/* Tiang & piringan parabola radar berputar */}
    <Cyl pos={[0, 1.85, 0]} r={0.08} h={0.75} color="#64748b" hull={0.1} />
    <group position={[0, 2.35, 0]} rotation={[0, t * 1.8, 0]}>
      <P geo={() => <sphereGeometry args={[0.62, 18, 12, 0, Math.PI * 2, 0, 1.05]} />} color="#cbd5e1" pos={[0, 0, 0.18]} rot={[-Math.PI / 2, 0, 0]} hull={0.05} />
      <Cyl pos={[0, 0, 0.35]} r={0.04} h={0.45} color="#ef4444" rot={[Math.PI / 2, 0, 0]} hull={0.14} />
    </group>
    <Sign pos={[0, 0.35, 0.49]} w={1.18} h={0.26} text="RADAR · OKT 1944" bg="#dcfce7" fg="#14532d" />
  </group>
);

export const GrassField: React.FC<{ size?: number; color?: string }> = ({ size = 220, color = "#a9b87a" }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[size, size]} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>
);

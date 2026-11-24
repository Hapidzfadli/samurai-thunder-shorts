import React, { useMemo } from "react";
import * as THREE from "three";
import { InkBox } from "./objectsMolase";
import { Sign } from "./objectsMolaseProps";
import { P } from "./objectsRig";
import { Laptop, Mug } from "./objectsKelompok";

/* ====================================================================== */
/* Kos Bu Tini Ep. 4 — "Razia Kamar Kos Mendadak: Kucing Oren"            */
/* Kamar Kos Riko (dollhouse 360°) + Koridor Lantai 2 + Kucing Oren Hero   */
/* ====================================================================== */

type V3 = [number, number, number];
const INKC = "#241726";

const B: React.FC<{ pos: V3; size: V3; color?: string; rot?: V3; ink?: number; map?: THREE.Texture; emissive?: string }> = ({
  pos,
  size,
  color = "#fff",
  rot = [0, 0, 0],
  ink = 0.03,
  map,
  emissive,
}) => <InkBox pos={pos} size={size} color={color} rot={rot} ink={ink} map={map} emissive={emissive} />;

const Cyl: React.FC<{ pos: V3; r: number; h: number; rTop?: number; color: string; rot?: V3; hull?: number; seg?: number; nohull?: boolean }> = ({
  pos,
  r,
  h,
  rTop = r,
  color,
  rot = [0, 0, 0],
  hull = 0.06,
  seg = 14,
  nohull,
}) => <P geo={() => <cylinderGeometry args={[rTop, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} nohull={nohull} />;

const Ball: React.FC<{ pos: V3; r: number; color: string; scale?: V3 | number; hull?: number; emissive?: string; nohull?: boolean; rot?: V3 }> = ({
  pos,
  r,
  color,
  scale = 1,
  hull = 0.05,
  emissive,
  nohull,
  rot,
}) => <P geo={() => <sphereGeometry args={[r, 16, 12]} />} color={color} pos={pos} scale={scale} hull={hull} emissive={emissive} nohull={nohull} rot={rot} />;

/* ---------------------------------------------------------------------- */
/* 1. TEXTURES                                                             */
/* ---------------------------------------------------------------------- */
const canvasTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, rep: [number, number] = [1, 1]) => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 8;
  return t;
};

/** Sprei kotak-kotak (gingham) merah-putih khas kasur kos */
const ginghamTex = (a = "#dc2626", b = "#ffffff", rep: [number, number] = [3, 2]) =>
  canvasTex(
    256,
    256,
    (c) => {
      c.fillStyle = b;
      c.fillRect(0, 0, 256, 256);
      c.globalAlpha = 0.55;
      c.fillStyle = a;
      for (let i = 0; i < 8; i += 2) {
        c.fillRect(i * 32, 0, 32, 256);
        c.fillRect(0, i * 32, 256, 32);
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 8; i += 2) for (let j = 0; j < 8; j += 2) {
        c.fillStyle = a;
        c.fillRect(i * 32, j * 32, 32, 32);
      }
      c.strokeStyle = "rgba(60,0,0,0.12)";
      for (let k = 0; k < 256; k += 4) {
        c.beginPath();
        c.moveTo(k, 0);
        c.lineTo(k, 256);
        c.stroke();
      }
    },
    rep,
  );

/** Dinding cat krem bertekstur + list bawah */
const plasterTex = (base = "#f3e3c3", rep: [number, number] = [2, 1]) =>
  canvasTex(
    512,
    256,
    (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 2200; i++) {
        const x = (i * 97) % 512;
        const y = (i * 61 + ((i * i) % 37)) % 256;
        c.fillStyle = i % 3 ? "rgba(120,90,50,0.05)" : "rgba(255,255,255,0.10)";
        c.fillRect(x, y, 3, 3);
      }
      // noda rembesan halus di pojok atas
      const g = c.createRadialGradient(470, 10, 4, 470, 10, 90);
      g.addColorStop(0, "rgba(150,110,60,0.14)");
      g.addColorStop(1, "rgba(150,110,60,0)");
      c.fillStyle = g;
      c.fillRect(360, 0, 152, 110);
      c.fillStyle = "#8a5a3a";
      c.fillRect(0, 238, 512, 18);
    },
    rep,
  );

/** Lantai keramik 40×40 krem */
const tileTex = (rep: [number, number] = [6, 6]) =>
  canvasTex(
    256,
    256,
    (c) => {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 ? "#efe6d6" : "#e8dcc7";
        c.fillRect(i * 128, j * 128, 128, 128);
        c.strokeStyle = "#b9a98f";
        c.lineWidth = 4;
        c.strokeRect(i * 128 + 2, j * 128 + 2, 124, 124);
        c.fillStyle = "rgba(255,255,255,0.25)";
        c.fillRect(i * 128 + 14, j * 128 + 12, 60, 8);
      }
    },
    rep,
  );

const woodTex = (base = "#a16207", rep: [number, number] = [1, 1]) =>
  canvasTex(
    256,
    512,
    (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 46; i++) {
        c.strokeStyle = i % 2 ? "rgba(60,30,5,0.18)" : "rgba(255,220,160,0.10)";
        c.lineWidth = 2 + (i % 3);
        c.beginPath();
        const x = (i * 5.7) % 256;
        c.moveTo(x, 0);
        c.bezierCurveTo(x + 10, 170, x - 8, 340, x + 6, 512);
        c.stroke();
      }
    },
    rep,
  );

/* ---------------------------------------------------------------------- */
/* 2. KUCING OREN — HERO RIG                                               */
/* ---------------------------------------------------------------------- */
const OREN = "#f28c28";
const OREN_D = "#d9661a";
const OREN_L = "#ffb35c";
const CREAM = "#fff4e2";

export type OrenPose = "sit" | "loaf" | "stand" | "held";
export type OrenProps = {
  pos?: V3;
  rot?: V3;
  scale?: number;
  t?: number; // detik
  pose?: OrenPose;
  /** 0..1 mata berbinar ala Puss in Boots (pupil melebar, kilau besar, kepala miring) */
  sparkle?: number;
  /** 0..1 mulut membuka "meooow" */
  meow?: number;
  /** 0..1 kelopak mata menutup */
  blink?: number;
  /** amplitudo goyang ekor */
  tailAmp?: number;
  /** [yaw, pitch] kepala dalam radian */
  look?: [number, number];
  /** 0..1 penyamaran "bantal bulu" (sarung bantal menutupi badan, kuping nongol) */
  disguise?: number;
  /** 0..1 mengunyah ikan */
  chew?: number;
  /** 0..1 dengkur bahagia (mata merem senyum) */
  purr?: number;
};

/** Ekor bersegmen: tiap ruas mewarisi rotasi ruas sebelumnya → gelombang mengalir dari pangkal ke ujung */
const TailChain: React.FC<{ n: number; i?: number; t: number; amp: number; curl: number; len: number }> = ({ n, i = 0, t, amp, curl, len }) => {
  if (i >= n) return null;
  const k = i / n;
  const r = 0.042 * (1 - k * 0.45);
  const wag = Math.sin(t * 6.2 - i * 0.75) * amp * (0.35 + k * 0.9);
  const tip = i === n - 1;
  return (
    <group rotation={[curl * (0.4 + k), 0, wag]}>
      <Cyl pos={[0, len / 2, 0]} r={r} rTop={r * 0.92} h={len * 1.08} color={i % 2 ? OREN_D : OREN} hull={0.1} seg={10} />
      {tip && <Ball pos={[0, len, 0]} r={r * 1.05} color={OREN_L} hull={0.1} />}
      <group position={[0, len, 0]}>
        <TailChain n={n} i={i + 1} t={t} amp={amp} curl={curl} len={len} />
      </group>
    </group>
  );
};

const Leg: React.FC<{ pos: V3; h?: number; rot?: V3 }> = ({ pos, h = 0.2, rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <Cyl pos={[0, -h / 2, 0]} r={0.045} rTop={0.05} h={h} color={OREN} hull={0.09} seg={10} />
    <Ball pos={[0, -h, 0.018]} r={0.05} scale={[1, 0.62, 1.25]} color={CREAM} hull={0.09} />
  </group>
);

const Sparkle: React.FC<{ pos: V3; s: number; rot?: number }> = ({ pos, s, rot = 0 }) => (
  <group position={pos} rotation={[0, 0, rot]} scale={s}>
    <mesh>
      <planeGeometry args={[0.012, 0.09]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.95} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <planeGeometry args={[0.012, 0.09]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.95} />
    </mesh>
  </group>
);

/** Mata kucing toon: iris kuning-hijau, pupil melebar saat sparkle, kilau ganda, kelopak untuk kedip/dengkur. */
const CatEye: React.FC<{ side: -1 | 1; sparkle: number; blink: number; purr: number; t: number }> = ({ side, sparkle, blink, purr, t }) => {
  const size = 1 + sparkle * 0.38;
  const pupilW = 0.012 + sparkle * 0.032; // celah vertikal → bulat besar
  const pupilH = 0.05 + sparkle * 0.006;
  const wet = sparkle * Math.sin(t * 9 + side) * 0.002;
  const close = Math.max(blink, purr);
  return (
    <group position={[side * 0.066, 0.028, 0.128]} rotation={[0, side * 0.32, side * -0.12 * sparkle]} scale={size}>
      {/* soket hitam (garis tepi mata) */}
      <Ball pos={[0, 0, -0.004]} r={0.05} scale={[1.05, 1.08, 0.5]} color={INKC} nohull />
      {/* iris */}
      <Ball pos={[0, 0, 0.004]} r={0.046} scale={[1, 1.06, 0.48]} color={sparkle > 0.4 ? "#b7d63c" : "#d8c23a"} nohull emissive={sparkle > 0.4 ? "#1d2a06" : undefined} />
      {/* pupil */}
      <Ball pos={[wet, -0.002, 0.016]} r={1} scale={[pupilW, pupilH, 0.01]} color="#120b14" nohull />
      {/* kilau besar + kecil (emisif) */}
      <Ball pos={[-0.014 + wet, 0.017, 0.026]} r={0.012 + sparkle * 0.007} color="#ffffff" emissive="#ffffff" nohull />
      <Ball pos={[0.016, -0.016, 0.025]} r={0.006 + sparkle * 0.004} color="#ffffff" emissive="#ffffff" nohull />
      {sparkle > 0.3 && <Ball pos={[0.0, -0.03, 0.02]} r={1} scale={[0.03, 0.006, 0.006]} color="#e8fbff" emissive="#9fe8ff" nohull />}
      {/* kelopak atas halus mengikuti lengkung bola mata + lengkung senyum saat mendengkur */}
      {close > 0.02 && (
        <group position={[0, 0.002, 0.014]}>
          <mesh scale={[1.04, Math.max(0.05, close) * 1.06, 0.56]} position={[0, (1 - close) * 0.042, 0.008]}>
            <sphereGeometry args={[0.05, 14, 10]} />
            <meshToonMaterial color={OREN} />
          </mesh>
          {close > 0.45 && (
            <mesh position={[0, -0.004, 0.036]} rotation={[0, 0, purr > 0.4 ? 0 : Math.PI]} scale={[1, 0.65, 1]}>
              <torusGeometry args={[0.028, 0.0055, 6, 16, Math.PI]} />
              <meshBasicMaterial color={INKC} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};

const CatHead: React.FC<{ t: number; sparkle: number; meow: number; blink: number; chew: number; purr: number }> = ({ t, sparkle, meow, blink, chew, purr }) => {
  const earTw = Math.max(0, Math.sin(t * 1.7) - 0.92) * 4; // kedutan kuping sesekali
  const mouth = Math.max(meow, chew * (0.3 + 0.3 * Math.abs(Math.sin(t * 12))));
  return (
    <group>
      {/* tempurung kepala + pipi gembul */}
      <Ball pos={[0, 0, 0]} r={0.16} scale={[1.14, 0.97, 0.98]} color={OREN} hull={0.06} />
      <Ball pos={[-0.09, -0.045, 0.06]} r={0.075} scale={[1.1, 0.85, 0.9]} color={OREN_L} hull={0.06} />
      <Ball pos={[0.09, -0.045, 0.06]} r={0.075} scale={[1.1, 0.85, 0.9]} color={OREN_L} hull={0.06} />
      {/* motif "M" tabby di dahi */}
      {[-0.045, 0, 0.045].map((x, i) => (
        <B key={i} pos={[x, 0.105, 0.11]} size={[0.018, 0.06, 0.02]} rot={[0.55, 0, x * 6]} color={OREN_D} ink={0.002} />
      ))}
      {[-1, 1].map((s) => (
        <B key={s} pos={[s * 0.15, 0.0, 0.05]} size={[0.06, 0.014, 0.03]} rot={[0, s * 0.9, s * 0.25]} color={OREN_D} ink={0.002} />
      ))}
      {/* kuping + bagian dalam pink */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.095, 0.12, -0.01]} rotation={[-0.15 - (s > 0 ? earTw * 0.3 : 0), 0, -s * 0.38 - s * sparkle * 0.25]}>
          <P geo={() => <coneGeometry args={[0.062, 0.13, 4]} />} color={OREN} pos={[0, 0.05, 0]} rot={[0, Math.PI / 4, 0]} hull={0.08} />
          <P geo={() => <coneGeometry args={[0.036, 0.09, 4]} />} color="#f9a8b8" pos={[0, 0.04, 0.022]} rot={[0, Math.PI / 4, 0]} nohull />
        </group>
      ))}
      {/* "alis" bulu yang terangkat memelas saat sparkle */}
      {sparkle > 0.05 &&
        [-1, 1].map((s) => (
          <B key={s} pos={[s * 0.062, 0.088 + sparkle * 0.01, 0.135]} size={[0.045, 0.011, 0.01]} rot={[0, 0, s * (0.15 + sparkle * 0.45)]} color={OREN_D} ink={0.003} />
        ))}
      <CatEye side={-1} sparkle={sparkle} blink={blink} purr={purr} t={t} />
      <CatEye side={1} sparkle={sparkle} blink={blink} purr={purr} t={t} />
      {/* moncong putih, hidung pink, mulut */}
      <Ball pos={[-0.028, -0.06, 0.135]} r={0.04} scale={[1, 0.8, 0.8]} color={CREAM} hull={0.05} />
      <Ball pos={[0.028, -0.06, 0.135]} r={0.04} scale={[1, 0.8, 0.8]} color={CREAM} hull={0.05} />
      <P geo={() => <coneGeometry args={[0.018, 0.022, 3]} />} color="#f472b6" pos={[0, -0.032, 0.168]} rot={[Math.PI, 0, 0]} hull={0.12} />
      <group position={[0, -0.088, 0.152]} scale={[1, 0.2 + mouth * 1.6, 1]}>
        <Ball pos={[0, 0, 0]} r={0.022} scale={[1.1, 1, 0.5]} color="#5b1626" nohull />
        {mouth > 0.3 && <Ball pos={[0, -0.009, 0.004]} r={0.012} scale={[1.2, 0.6, 0.5]} color="#fb7185" nohull />}
      </group>
      {/* kumis */}
      {[-1, 1].map((s) =>
        [-0.012, 0.004, 0.02].map((dy, j) => (
          <mesh key={`${s}${j}`} position={[s * 0.115, -0.062 + dy, 0.125]} rotation={[0, s * 0.25, Math.PI / 2 + s * (j - 1) * 0.16]}>
            <cylinderGeometry args={[0.0018, 0.0018, 0.13, 4]} />
            <meshBasicMaterial color="#3b2a2a" />
          </mesh>
        )),
      )}
      {/* bintang kilau di sekitar mata */}
      {sparkle > 0.5 && (
        <>
          <Sparkle pos={[-0.17, 0.1, 0.16]} s={(sparkle - 0.5) * 2 * (0.8 + 0.3 * Math.sin(t * 7))} rot={t * 2} />
          <Sparkle pos={[0.18, 0.06, 0.16]} s={(sparkle - 0.5) * 2 * (0.6 + 0.3 * Math.sin(t * 6 + 1))} rot={-t * 2} />
          <Sparkle pos={[0.12, 0.2, 0.12]} s={(sparkle - 0.5) * 1.4 * (0.6 + 0.3 * Math.sin(t * 8 + 2))} />
        </>
      )}
    </group>
  );
};

export const OrenHero3D: React.FC<OrenProps> = ({
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  scale = 1,
  t = 0,
  pose = "sit",
  sparkle = 0,
  meow = 0,
  blink,
  tailAmp = 0.45,
  look = [0, 0],
  disguise = 0,
  chew = 0,
  purr = 0,
}) => {
  const autoBlink = blink ?? (t % 3.4 > 3.25 ? 1 : 0);
  const breathe = 1 + Math.sin(t * 3.1) * 0.015 + purr * Math.sin(t * 40) * 0.006;
  const tilt = sparkle * 0.22 * Math.sin(t * 1.3 + 0.6);
  const disg = disguise > 0.5;
  const head = (
    <group rotation={[look[1], look[0], tilt]}>
      <CatHead t={t} sparkle={sparkle} meow={meow} blink={autoBlink} chew={chew} purr={purr} />
    </group>
  );

  let bodyEl: React.ReactNode;
  if (pose === "sit" || pose === "held") {
    const dang = pose === "held";
    bodyEl = (
      <>
        <group scale={[1, breathe, 1]}>
          <Ball pos={[0, 0.22, -0.02]} r={0.19} scale={[1.02, 1.28, 0.98]} color={OREN} hull={0.06} />
          {/* belang punggung */}
          {[0.16, 0.25, 0.34].map((y, i) => (
            <B key={i} pos={[0, y, -0.205]} size={[0.24 - i * 0.03, 0.03, 0.03]} rot={[0.15, 0, 0]} color={OREN_D} ink={0.003} />
          ))}
          <Ball pos={[0, 0.25, 0.12]} r={0.12} scale={[0.95, 1.25, 0.55]} color={CREAM} hull={0.04} />
          {/* paha belakang */}
          {!dang && [-1, 1].map((s) => <Ball key={s} pos={[s * 0.15, 0.1, -0.04]} r={0.1} scale={[0.7, 0.9, 1.25]} color={OREN} hull={0.06} />)}
          {!dang && [-1, 1].map((s) => <Ball key={`f${s}`} pos={[s * 0.15, 0.025, 0.1]} r={0.05} scale={[1, 0.6, 1.4]} color={CREAM} hull={0.08} />)}
        </group>
        <Leg pos={[-0.075, 0.24, 0.1]} h={dang ? 0.2 : 0.23} rot={dang ? [0.3, 0, 0.1] : [0, 0, 0]} />
        <Leg pos={[0.075, 0.24, 0.1]} h={dang ? 0.2 : 0.23} rot={dang ? [0.3, 0, -0.1] : [0, 0, 0]} />
        {dang && [-1, 1].map((s) => <Leg key={s} pos={[s * 0.12, 0.08, 0.02]} h={0.18} rot={[0.2, 0, s * 0.15]} />)}
        <group position={[0, 0.51, 0.03]}>{head}</group>
        <group position={[0.1, 0.05, -0.17]} rotation={dang ? [2.6, 0, 0.3] : [-1.35, 0.9, 0]}>
          <TailChain n={7} t={t} amp={tailAmp} curl={dang ? -0.05 : 0.18} len={0.07} />
        </group>
      </>
    );
  } else {
    const stand = pose === "stand";
    const h = stand ? 0.3 : 0.15;
    const gait = stand ? Math.sin(t * 7) * 0.35 : 0;
    bodyEl = (
      <>
        <group scale={[1, breathe, 1]}>
          <Ball pos={[0, h, -0.04]} r={0.2} scale={[0.95, 0.72, 1.45]} color={OREN} hull={0.06} />
          {[-0.12, 0, 0.12].map((z, i) => (
            <B key={i} pos={[0, h + 0.135, z - 0.04]} size={[0.26, 0.03, 0.035]} color={OREN_D} ink={0.003} />
          ))}
          <Ball pos={[0, h - 0.05, 0.12]} r={0.13} scale={[0.95, 0.6, 0.9]} color={CREAM} hull={0.04} />
        </group>
        {stand ? (
          <>
            <Leg pos={[-0.09, 0.23, 0.17]} h={0.22} rot={[gait, 0, 0]} />
            <Leg pos={[0.09, 0.23, 0.17]} h={0.22} rot={[-gait, 0, 0]} />
            <Leg pos={[-0.09, 0.23, -0.22]} h={0.22} rot={[-gait, 0, 0]} />
            <Leg pos={[0.09, 0.23, -0.22]} h={0.22} rot={[gait, 0, 0]} />
          </>
        ) : (
          [-1, 1].map((s) => <Ball key={s} pos={[s * 0.07, 0.03, 0.27]} r={0.045} scale={[1, 0.6, 1.3]} color={CREAM} hull={0.08} />)
        )}
        <group position={[0, h + 0.13, 0.27]}>{disg ? null : head}</group>
        <group position={[0.06, h, -0.3]} rotation={stand ? [-0.6, 0, 0] : [-1.5, 0.95, 0]}>
          <TailChain n={7} t={t} amp={tailAmp} curl={stand ? 0.12 : 0.05} len={0.07} />
        </group>
      </>
    );
  }

  const pillowTex = useMemo(() => ginghamTex("#f59e0b", "#fef3c7", [3, 3]), []);

  return (
    <group position={pos} rotation={rot} scale={scale}>
      {bodyEl}
      {disg && (
        <group>
          {/* sarung bantal kuning kotak-kotak menutupi badan: "BANTAL BULU" */}
          <group scale={[1, breathe, 1]}>
            <group position={[0, 0.17, 0.02]} scale={[1.18, 0.62, 1.38]}>
              <mesh castShadow receiveShadow>
                <sphereGeometry args={[0.25, 20, 14]} />
                <meshStandardMaterial map={pillowTex} roughness={0.92} />
              </mesh>
              <mesh scale={1.045}>
                <sphereGeometry args={[0.25, 16, 12]} />
                <meshBasicMaterial color={INKC} side={THREE.BackSide} />
              </mesh>
            </group>
            {/* renda tepi sarung bantal */}
            <P geo={() => <torusGeometry args={[0.26, 0.018, 6, 24]} />} color="#fffbeb" pos={[0, 0.17, 0.02]} rot={[Math.PI / 2, 0, 0]} scale={[1.15, 1.36, 1]} hull={0.08} />
          </group>
          {/* kuping yang nongol tembus sarung bantal — kocak & mencurigakan */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.09, 0.3, 0.2]} rotation={[-0.2, 0, -s * 0.3 + Math.sin(t * 2.3 + s) * 0.08]}>
              <P geo={() => <coneGeometry args={[0.058, 0.13, 4]} />} color={OREN} pos={[0, 0.05, 0]} rot={[0, Math.PI / 4, 0]} hull={0.08} />
              <P geo={() => <coneGeometry args={[0.034, 0.085, 4]} />} color="#f9a8b8" pos={[0, 0.04, 0.02]} rot={[0, Math.PI / 4, 0]} nohull />
            </group>
          ))}
        </group>
      )}
      {/* bayangan kontak */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, pose === "sit" ? 1 : 1.5, 1]}>
        <circleGeometry args={[0.24, 20]} />
        <meshBasicMaterial color="#1a1030" transparent opacity={pose === "held" ? 0 : 0.28} depthWrite={false} />
      </mesh>
    </group>
  );
};

/* ---------------------------------------------------------------------- */
/* 3. PROPERTI CERITA (objek 3D terpisah → bisa dipegang & berpindah tangan) */
/* ---------------------------------------------------------------------- */
const Fish: React.FC<{ pos?: V3; rot?: V3; scale?: number; color?: string; belly?: string }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, color = "#5b7c99", belly = "#cbd5e1" }) => (
  <group position={pos} rotation={rot} scale={scale}>
    <Ball pos={[0, 0, 0]} r={0.1} scale={[1.6, 0.62, 0.45]} color={color} hull={0.06} />
    <Ball pos={[0.01, -0.018, 0]} r={0.08} scale={[1.6, 0.42, 0.46]} color={belly} hull={0.02} />
    <P geo={() => <coneGeometry args={[0.06, 0.09, 3]} />} color={color} pos={[-0.19, 0, 0]} rot={[0, 0, Math.PI / 2]} scale={[1, 1, 0.3]} hull={0.08} />
    <P geo={() => <coneGeometry args={[0.03, 0.06, 3]} />} color={color} pos={[0, 0.07, 0]} scale={[1.4, 1, 0.3]} hull={0.08} />
    <Ball pos={[0.115, 0.016, 0.035]} r={0.012} color="#111" nohull />
    <Ball pos={[0.118, 0.019, 0.044]} r={0.004} color="#fff" nohull />
  </group>
);

/** Ikan tongkol goreng di piring berlapis daun pisang (bau "parfum pantai Ancol"!) */
export const IkanTongkol3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; eaten?: number; t?: number; steam?: boolean }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, eaten = 0, t = 0, steam = true }) => (
  <group position={pos} rotation={rot} scale={scale}>
    <Cyl pos={[0, 0.012, 0]} r={0.2} rTop={0.22} h={0.024} color="#f8fafc" hull={0.05} seg={24} />
    <P geo={() => <circleGeometry args={[0.17, 7]} />} color="#16a34a" pos={[0, 0.026, 0]} rot={[-Math.PI / 2, 0, 0.3]} nohull />
    {eaten < 0.95 && <Fish pos={[0, 0.06, 0]} rot={[0, 0.4, 0]} scale={1 - eaten * 0.5} color="#8a5a2b" belly="#c2884a" />}
    {eaten >= 0.95 && <B pos={[0, 0.04, 0]} size={[0.22, 0.01, 0.02]} color="#f1e6cf" ink={0.004} />}
    {steam &&
      [0, 1, 2].map((i) => {
        const k = ((t * 0.6 + i / 3) % 1 + 1) % 1;
        return (
          <mesh key={i} position={[-0.05 + i * 0.05, 0.1 + k * 0.28, Math.sin(t * 2 + i) * 0.02]}>
            <sphereGeometry args={[0.03 + k * 0.03, 10, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.35 * (1 - k)} depthWrite={false} />
          </mesh>
        );
      })}
  </group>
);

/** Besek bambu berisi 2 ikan pindang (hadiah Bu Tini untuk si Oren) */
export const BesekPindang3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; lid?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, lid = 1 }) => {
  const weave = useMemo(
    () =>
      canvasTex(128, 128, (c) => {
        c.fillStyle = "#d6b46a";
        c.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 128; i += 16) for (let j = 0; j < 128; j += 16) {
          c.fillStyle = (i + j) % 32 ? "#c49a4c" : "#e3c78a";
          c.fillRect(i, j, 16, 8);
        }
      }),
    [],
  );
  return (
    <group position={pos} rotation={rot} scale={scale}>
      <B pos={[0, 0.05, 0]} size={[0.34, 0.1, 0.34]} map={weave} ink={0.02} />
      <Fish pos={[-0.02, 0.11, -0.06]} rot={[0, 0.2, 0]} scale={0.8} color="#a8a29e" belly="#e7e5e4" />
      <Fish pos={[0.02, 0.115, 0.06]} rot={[0, -0.25, 0]} scale={0.8} color="#a8a29e" belly="#e7e5e4" />
      <group position={[-0.17, 0.1, 0]} rotation={[0, 0, (1 - lid) * 0 + lid * 1.9]}>
        <B pos={[0.17, 0.02, 0]} size={[0.36, 0.035, 0.36]} map={weave} ink={0.02} />
      </group>
    </group>
  );
};

/** Sapu ijuk Bu Tini (gagang kayu + serat ijuk hitam). Titik pivot = genggaman tangan. */
export const SapuIjuk3D: React.FC<{ pos?: V3; rot?: V3; scale?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1 }) => (
  <group position={pos} rotation={rot} scale={scale}>
    <Cyl pos={[0, -0.35, 0]} r={0.022} h={1.25} color="#b45309" hull={0.12} />
    <Cyl pos={[0, 0.25, 0]} r={0.026} h={0.06} color="#ef4444" hull={0.1} />
    <B pos={[0, -0.98, 0]} size={[0.3, 0.07, 0.07]} color="#7c2d12" ink={0.02} />
    <B pos={[0, -0.99, 0]} size={[0.32, 0.03, 0.08]} color="#ef4444" ink={0.01} />
    {Array.from({ length: 11 }, (_, i) => (
      <Cyl key={i} pos={[-0.15 + i * 0.03, -1.14, (i % 2) * 0.02 - 0.01]} r={0.012} rTop={0.016} h={0.28} rot={[0, 0, (i - 5) * 0.035]} color={i % 3 ? "#1f1a17" : "#3b302a"} hull={0.08} seg={6} />
    ))}
  </group>
);

/** Ember plastik biru (salah satu opsi persembunyian yang gagal) */
export const Ember3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; color?: string }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, color = "#2563eb" }) => (
  <group position={pos} rotation={rot} scale={scale}>
    <Cyl pos={[0, 0.17, 0]} r={0.15} rTop={0.2} h={0.34} color={color} hull={0.05} seg={20} />
    <P geo={() => <torusGeometry args={[0.2, 0.014, 6, 24]} />} color={color} pos={[0, 0.34, 0]} rot={[Math.PI / 2, 0, 0]} hull={0.1} />
    <Cyl pos={[0, 0.341, 0]} r={0.185} h={0.004} color="#1e3a8a" nohull seg={20} />
    <P geo={() => <torusGeometry args={[0.2, 0.008, 6, 20, Math.PI]} />} color="#cbd5e1" pos={[0, 0.34, 0]} rot={[0, 0, 0]} hull={0.15} />
  </group>
);

/** Selimut garis yang bisa ditarik (pull 0 = menutupi, 1 = tersingkap & melayang di tangan) */
export const Selimut3D: React.FC<{ pos?: V3; pull?: number; t?: number }> = ({ pos = [0, 0, 0], pull = 0, t = 0 }) => {
  const tex = useMemo(
    () =>
      canvasTex(256, 256, (c) => {
        c.fillStyle = "#1d4ed8";
        c.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 256; i += 40) {
          c.fillStyle = "#93c5fd";
          c.fillRect(i, 0, 12, 256);
          c.fillStyle = "#fde047";
          c.fillRect(i + 18, 0, 5, 256);
        }
      }),
    [],
  );
  const flap = Math.sin(t * 9) * 0.05 * pull;
  return (
    <group position={[pos[0] + pull * 0.55, pos[1] + pull * 0.55, pos[2] + pull * 0.45]} rotation={[-pull * 1.1 + flap, pull * 0.4, pull * 0.35]}>
      <B pos={[0, 0.03, 0]} size={[0.95, 0.06 + (1 - pull) * 0.04, 0.9]} map={tex} ink={0.02} />
    </group>
  );
};

/** Papan merah "DILARANG PELIHARA HEWAN!" (aturan Bu Tini) */
export const PapanLarangan3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; shake?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, shake = 0 }) => {
  const tex = useMemo(
    () =>
      canvasTex(512, 300, (c) => {
        c.fillStyle = "#dc2626";
        c.fillRect(0, 0, 512, 300);
        c.strokeStyle = "#ffffff";
        c.lineWidth = 12;
        c.strokeRect(14, 14, 484, 272);
        c.fillStyle = "#ffffff";
        c.textAlign = "center";
        c.font = "900 58px Arial, sans-serif";
        c.fillText("DILARANG", 232, 92);
        c.fillText("PELIHARA", 232, 160);
        c.fillText("HEWAN!", 232, 228);
        c.font = "800 22px Arial, sans-serif";
        c.fillStyle = "#fde68a";
        c.fillText("— TTD. BU TINI (PEMILIK KOS) —", 256, 272);
        // ikon larangan di sisi kanan tanpa menabrak teks
        c.strokeStyle = "#fde68a";
        c.lineWidth = 8;
        c.beginPath();
        c.arc(442, 148, 38, 0, Math.PI * 2);
        c.moveTo(415, 121);
        c.lineTo(469, 175);
        c.stroke();
      }),
    [],
  );
  return (
    <group position={pos} rotation={[rot[0], rot[1], rot[2] + Math.sin(shake * 40) * 0.05 * Math.min(1, shake)]} scale={scale}>
      <B pos={[0, 0, 0]} size={[0.92, 0.56, 0.03]} color="#7f1d1d" ink={0.02} />
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.88, 0.52]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Ball pos={[0, 0.33, 0.0]} r={0.02} color="#9ca3af" hull={0.1} />
    </group>
  );
};

/** Lemari kayu 2 pintu — pintu bisa dibuka (openL/openR 0..1). Menghadap +z lokal. */
export const Lemari2Pintu3D: React.FC<{ pos?: V3; rot?: V3; openL?: number; openR?: number; shake?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], openL = 0, openR = 0, shake = 0 }) => {
  const wood = useMemo(() => woodTex("#a0522d"), []);
  const W = 1.2;
  const H = 1.95;
  const D = 0.55;
  const jig = Math.sin(shake * 50) * 0.012 * Math.min(1, shake);
  return (
    <group position={pos} rotation={rot}>
      {/* badan lemari */}
      <B pos={[0, H / 2 + 0.06, -D / 2]} size={[W, H, 0.04]} map={wood} ink={0.02} />
      <B pos={[-W / 2, H / 2 + 0.06, 0]} size={[0.04, H, D]} map={wood} ink={0.02} />
      <B pos={[W / 2, H / 2 + 0.06, 0]} size={[0.04, H, D]} map={wood} ink={0.02} />
      <B pos={[0, H + 0.08, 0]} size={[W + 0.08, 0.06, D + 0.06]} color="#7c3a16" ink={0.025} />
      <B pos={[0, 0.06, 0]} size={[W, 0.12, D]} color="#6b2f12" ink={0.025} />
      {/* isi: rak + baju tergantung + tumpukan kaos */}
      <B pos={[0.3, 1.25, 0]} size={[0.54, 0.03, D - 0.04]} color="#8b4513" ink={0.01} />
      <Cyl pos={[-0.28, 1.72, 0]} r={0.012} h={0.56} rot={[0, 0, Math.PI / 2]} color="#cbd5e1" hull={0.1} />
      {["#ef4444", "#facc15", "#22c55e", "#f8fafc"].map((c, i) => (
        <B key={c} pos={[-0.48 + i * 0.13, 1.35, 0.02]} size={[0.1, 0.72, 0.36]} color={c} ink={0.015} />
      ))}
      {["#1e40af", "#be185d", "#0f766e"].map((c, i) => (
        <B key={c} pos={[0.3, 1.3 + i * 0.07, 0.02]} size={[0.42, 0.06, 0.34]} color={c} ink={0.012} />
      ))}
      <B pos={[0.3, 0.4, 0.04]} size={[0.44, 0.34, 0.36]} color="#d6b48a" ink={0.02} />
      {/* pintu kiri (engsel di kiri) & kanan (engsel di kanan) */}
      <group position={[-W / 2, 0.06, D / 2]} rotation={[0, -openL * 1.75 + jig, 0]}>
        <B pos={[W / 4, H / 2, 0]} size={[W / 2 - 0.01, H - 0.02, 0.035]} map={wood} ink={0.02} />
        <B pos={[W / 4, H / 2, 0.022]} size={[W / 2 - 0.12, H - 0.24, 0.01]} color="#b5652f" ink={0.01} />
        <mesh position={[W / 4, H * 0.62, 0.03]}>
          <planeGeometry args={[0.32, 0.9]} />
          <meshStandardMaterial color="#dbeafe" metalness={0.6} roughness={0.15} />
        </mesh>
        <Ball pos={[W / 2 - 0.06, H / 2, 0.04]} r={0.022} color="#facc15" hull={0.12} />
      </group>
      <group position={[W / 2, 0.06, D / 2]} rotation={[0, openR * 1.75 - jig, 0]}>
        <B pos={[-W / 4, H / 2, 0]} size={[W / 2 - 0.01, H - 0.02, 0.035]} map={wood} ink={0.02} />
        <B pos={[-W / 4, H / 2, 0.022]} size={[W / 2 - 0.12, H - 0.24, 0.01]} color="#b5652f" ink={0.01} />
        <Ball pos={[-W / 2 + 0.06, H / 2, 0.04]} r={0.022} color="#facc15" hull={0.12} />
        {/* stiker klub bola tempelan anak kos */}
        <mesh position={[-W / 4, H * 0.7, 0.03]}>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      </group>
      {/* kardus & tas di atas lemari */}
      <B pos={[-0.25, H + 0.24, -0.02]} size={[0.45, 0.28, 0.38]} color="#c8a26e" ink={0.02} />
      <B pos={[0.3, H + 0.2, 0]} size={[0.4, 0.2, 0.3]} color="#334155" ink={0.02} />
    </group>
  );
};

/** Kipas angin berdiri dengan baling-baling berputar & kepala menoleh */
export const KipasAngin3D: React.FC<{ pos?: V3; rot?: V3; t?: number; on?: boolean }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], t = 0, on = true }) => {
  const swing = on ? Math.sin(t * 0.8) * 0.6 : 0;
  return (
    <group position={pos} rotation={rot}>
      <Cyl pos={[0, 0.04, 0]} r={0.26} h={0.07} color="#e2e8f0" hull={0.06} seg={20} />
      <Cyl pos={[0, 0.65, 0]} r={0.03} h={1.2} color="#cbd5e1" hull={0.14} />
      <group position={[0, 1.27, 0]} rotation={[0, swing, 0]}>
        <B pos={[0, 0, -0.08]} size={[0.14, 0.14, 0.18]} color="#e2e8f0" ink={0.02} />
        <group position={[0, 0, 0.06]}>
          <P geo={() => <torusGeometry args={[0.3, 0.012, 6, 28]} />} color="#94a3b8" hull={0.15} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
              <boxGeometry args={[0.6, 0.004, 0.004]} />
              <meshBasicMaterial color="#94a3b8" />
            </mesh>
          ))}
          <group rotation={[0, 0, on ? -t * 22 : 0]}>
            {[0, 1, 2].map((i) => (
              <P key={i} geo={() => <sphereGeometry args={[0.13, 10, 8]} />} color="#38bdf8" pos={[Math.cos((i * 2 * Math.PI) / 3) * 0.13, Math.sin((i * 2 * Math.PI) / 3) * 0.13, 0]} scale={[1, 0.45, 0.08]} rot={[0, 0, (i * 2 * Math.PI) / 3]} hull={0.06} />
            ))}
            <Ball pos={[0, 0, 0.02]} r={0.04} color="#0ea5e9" hull={0.1} />
          </group>
        </group>
      </group>
      <B pos={[0, 0.1, 0.18]} size={[0.16, 0.04, 0.06]} color="#64748b" ink={0.01} />
    </group>
  );
};

/** Berkas sinar sore volumetrik dari jendela + debu melayang */
export const SunBeams3D: React.FC<{ from: V3; dir: V3; t?: number; strength?: number; width?: number; color?: string }> = ({ from, dir, t = 0, strength = 1, width = 1.1, color = "#ffe2a8" }) => {
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  const q = useMemo(() => {
    const v = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), v);
  }, [dir[0], dir[1], dir[2]]);
  return (
    <group position={from} quaternion={q}>
      {[-0.4, -0.13, 0.14, 0.4].map((x, i) => (
        <mesh key={i} position={[x * width, -len / 2, 0]} rotation={[0, (i - 1.5) * 0.25, 0]}>
          <planeGeometry args={[width * 0.24, len]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={(0.1 + 0.03 * Math.sin(t * 1.2 + i)) * strength}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
      {Array.from({ length: 16 }, (_, i) => {
        const k = ((t * 0.05 + i * 0.137) % 1 + 1) % 1;
        return (
          <mesh key={`d${i}`} position={[Math.sin(i * 2.3 + t * 0.4) * width * 0.4, -k * len, Math.cos(i * 1.7) * 0.2]}>
            <sphereGeometry args={[0.008, 6, 4]} />
            <meshBasicMaterial color="#fff7d6" transparent opacity={0.8 * strength * Math.sin(k * Math.PI)} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Jam dinding (default 16:45 sore) */
const WallClock: React.FC<{ pos: V3; rot?: V3; hour?: number; minute?: number }> = ({ pos, rot = [0, 0, 0], hour = 16, minute = 45 }) => (
  <group position={pos} rotation={rot}>
    <Cyl pos={[0, 0, 0]} r={0.18} h={0.04} rot={[Math.PI / 2, 0, 0]} color="#f8fafc" hull={0.1} seg={24} />
    {Array.from({ length: 12 }, (_, i) => (
      <B key={i} pos={[Math.sin((i * Math.PI) / 6) * 0.14, Math.cos((i * Math.PI) / 6) * 0.14, 0.025]} size={[0.012, 0.03, 0.005]} rot={[0, 0, -(i * Math.PI) / 6]} color="#1f2937" ink={0} />
    ))}
    <group position={[0, 0, 0.03]} rotation={[0, 0, -((hour % 12) + minute / 60) * (Math.PI / 6)]}>
      <B pos={[0, 0.045, 0]} size={[0.018, 0.09, 0.005]} color="#111" ink={0} />
    </group>
    <group position={[0, 0, 0.032]} rotation={[0, 0, -minute * (Math.PI / 30)]}>
      <B pos={[0, 0.065, 0]} size={[0.012, 0.13, 0.005]} color="#dc2626" ink={0} />
    </group>
  </group>
);

/** Pintu kamar kos (engsel kiri), menghadap +z lokal, open 0..1, bisa digebrak (bang) */
export const PintuKos3D: React.FC<{ pos?: V3; rot?: V3; open?: number; num?: string; bang?: number; color?: string }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], open = 0, num = "01", bang = 0, color = "#b47b4e" }) => {
  const wood = useMemo(() => woodTex(color), [color]);
  const rattle = Math.sin(bang * 60) * 0.03 * Math.max(0, 1 - bang) * (bang > 0 ? 1 : 0);
  return (
    <group position={pos} rotation={rot}>
      <B pos={[-0.52, 1.1, 0]} size={[0.08, 2.2, 0.16]} color="#5b3a22" ink={0.02} />
      <B pos={[0.52, 1.1, 0]} size={[0.08, 2.2, 0.16]} color="#5b3a22" ink={0.02} />
      <B pos={[0, 2.24, 0]} size={[1.12, 0.1, 0.16]} color="#5b3a22" ink={0.02} />
      <group position={[-0.47, 0, 0]} rotation={[0, open * 1.6 + rattle, 0]}>
        <B pos={[0.47, 1.09, 0]} size={[0.92, 2.14, 0.05]} map={wood} ink={0.02} />
        {[0.55, 1.55].map((y) => (
          <B key={y} pos={[0.47, y, 0.03]} size={[0.66, 0.7, 0.012]} color="#9a6034" ink={0.008} />
        ))}
        <Ball pos={[0.84, 1.05, 0.05]} r={0.03} color="#facc15" hull={0.1} />
        <Ball pos={[0.84, 1.05, -0.05]} r={0.03} color="#facc15" hull={0.1} />
        <Sign pos={[0.47, 1.95, 0.035]} w={0.3} h={0.2} text={num} bg="#fef3c7" fg="#1c1917" />
        <Sign pos={[0.47, 1.95, -0.035]} rot={[0, Math.PI, 0]} w={0.3} h={0.2} text={num} bg="#fef3c7" fg="#1c1917" />
      </group>
    </group>
  );
};

/* ---------------------------------------------------------------------- */
/* 4. KAMAR KOS RIKO — DOLLHOUSE 360° (dinding hanya terlihat dari dalam)  */
/* ---------------------------------------------------------------------- */
export const ROOM = { xMin: -2.3, xMax: 2.3, zMin: -2.2, zMax: 2.4, h: 2.9 };
/** posisi penting di kamar untuk koreografi */
export const SPOT = {
  bedCenter: [-1.25, 0.5, -1.6] as V3,
  pillow: [-1.95, 0.52, -1.6] as V3,
  bedFront: [-1.0, 0, -0.75] as V3,
  wardrobe: [-1.7, 0, 0.1] as V3, // depan lemari
  door: [2.3, 0, 0.8] as V3,
  doorInside: [1.7, 0, 0.8] as V3,
  desk: [1.15, 0, -1.25] as V3,
  center: [0, 0, 0.3] as V3,
  ember: [1.75, 0, 1.75] as V3,
};

const Wall: React.FC<{ pos: V3; rot: V3; w: number; h: number; map: THREE.Texture; tint?: string }> = ({ pos, rot, w, h, map, tint = "#ffffff" }) => (
  <mesh position={pos} rotation={rot} receiveShadow>
    <planeGeometry args={[w, h]} />
    <meshStandardMaterial map={map} color={tint} roughness={0.95} side={THREE.FrontSide} />
  </mesh>
);

const Poster: React.FC<{ pos: V3; rot?: V3; w: number; h: number; draw: (c: CanvasRenderingContext2D) => void }> = ({ pos, rot = [0, 0, 0], w, h, draw }) => {
  const tex = useMemo(() => canvasTex(256, Math.round((256 * h) / w), draw), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={pos} rotation={rot}>
      <B pos={[0, 0, -0.008]} size={[w + 0.03, h + 0.03, 0.012]} color="#1f2937" ink={0.006} />
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Plant: React.FC<{ pos: V3; s?: number; t?: number }> = ({ pos, s = 1, t = 0 }) => (
  <group position={pos} scale={s}>
    <Cyl pos={[0, 0.1, 0]} r={0.1} rTop={0.13} h={0.2} color="#c2410c" hull={0.06} />
    {[0, 1, 2, 3, 4].map((i) => (
      <P
        key={i}
        geo={() => <sphereGeometry args={[0.09, 8, 6]} />}
        color={i % 2 ? "#16a34a" : "#22c55e"}
        pos={[Math.cos(i * 1.26) * 0.08, 0.3 + (i % 3) * 0.06, Math.sin(i * 1.26) * 0.08]}
        rot={[0, i, 0.4 + Math.sin(t * 1.5 + i) * 0.04]}
        scale={[0.5, 1.6, 0.25]}
        hull={0.06}
      />
    ))}
  </group>
);

export const KamarKosRiko: React.FC<{ t?: number; fanOn?: boolean; sun?: number; signShake?: number; lemariL?: number; lemariR?: number; lemariShake?: number; doorOpen?: number; doorBang?: number; showPillow?: boolean; cozy?: number; hideFront?: boolean; hideWardrobe?: boolean }> = ({
  t = 0,
  fanOn = true,
  sun = 1,
  signShake = 0,
  lemariL = 0,
  lemariR = 0,
  lemariShake = 0,
  doorOpen = 0,
  doorBang = 0,
  showPillow = true,
  cozy = 0,
  hideFront = false,
  hideWardrobe = false,
}) => {
  const tx = useMemo(
    () => ({
      wall: plasterTex("#f6e7c8", [2, 1]),
      wallSide: plasterTex("#f6e7c8", [2, 1]),
      floor: tileTex([6, 6]),
      sheet: ginghamTex("#dc2626", "#ffffff", [3, 2]),
      wood: woodTex("#8b5a2b"),
    }),
    [],
  );
  const { xMin, xMax, zMin, zMax, h } = ROOM;
  const W = xMax - xMin;
  const D = zMax - zMin;
  const cx = (xMin + xMax) / 2;
  const cz = (zMin + zMax) / 2;
  return (
    <group>
      {/* lantai, langit-langit, 4 dinding (FrontSide menghadap ke dalam → kamera di luar tetap melihat isi kamar) */}
      <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={tx.floor} roughness={0.6} />
      </mesh>
      <Wall pos={[cx, h / 2, zMin]} rot={[0, 0, 0]} w={W} h={h} map={tx.wall} />
      <Wall pos={[cx, h / 2, zMax]} rot={[0, Math.PI, 0]} w={W} h={h} map={tx.wall} />
      <Wall pos={[xMin, h / 2, cz]} rot={[0, Math.PI / 2, 0]} w={D} h={h} map={tx.wallSide} />
      <Wall pos={[xMax, h / 2, cz]} rot={[0, -Math.PI / 2, 0]} w={D} h={h} map={tx.wallSide} />
      <mesh position={[cx, h, cz]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#fffaf0" side={THREE.FrontSide} />
      </mesh>
      {/* lampu neon langit-langit */}
      <B pos={[0, h - 0.05, 0.1]} size={[1.0, 0.06, 0.1]} color="#f8fafc" emissive={cozy > 0.5 ? "#fde68a" : "#e0f2fe"} ink={0.01} />

      {/* ---------- DINDING BELAKANG: jendela + sinar sore + papan larangan ---------- */}
      <group position={[-1.2, 1.75, zMin + 0.01]}>
        <B pos={[0, 0, 0]} size={[1.25, 1.1, 0.04]} color="#ffe9b0" emissive="#ffcf70" ink={0.0} />
        {/* langit sore + atap tetangga terlihat dari jendela */}
        <B pos={[0, -0.36, 0.01]} size={[1.2, 0.3, 0.02]} color="#b45309" ink={0} emissive="#3b1a05" />
        <B pos={[0, 0, 0.04]} size={[1.33, 0.07, 0.08]} color="#f8fafc" ink={0.015} />
        <B pos={[0, 0.56, 0.04]} size={[1.37, 0.08, 0.08]} color="#f8fafc" ink={0.015} />
        <B pos={[0, -0.56, 0.06]} size={[1.45, 0.08, 0.16]} color="#f8fafc" ink={0.015} />
        <B pos={[-0.64, 0, 0.04]} size={[0.07, 1.18, 0.08]} color="#f8fafc" ink={0.015} />
        <B pos={[0.64, 0, 0.04]} size={[0.07, 1.18, 0.08]} color="#f8fafc" ink={0.015} />
        <B pos={[0, 0, 0.04]} size={[0.05, 1.12, 0.07]} color="#f8fafc" ink={0.012} />
        {/* gorden tersibak + tiupan kipas */}
        <B pos={[-0.78, -0.02, 0.1]} size={[0.24, 1.25, 0.05]} rot={[0, 0, Math.sin(t * 1.3) * 0.02]} color="#14b8a6" ink={0.015} />
        <B pos={[0.78, -0.02, 0.1]} size={[0.24, 1.25, 0.05]} rot={[0, 0, -Math.sin(t * 1.1) * 0.02]} color="#14b8a6" ink={0.015} />
        <Cyl pos={[0, 0.68, 0.1]} r={0.015} h={1.9} rot={[0, 0, Math.PI / 2]} color="#a8a29e" hull={0.12} />
        <Plant pos={[0.42, -0.55, 0.12]} s={0.7} t={t} />
      </group>
      <SunBeams3D from={[-1.2, 1.8, zMin + 0.1]} dir={[0.55, -1.75, 1.8]} t={t} strength={sun} width={1.1} />
      {/* bercak cahaya hangat di lantai & kasur */}
      <mesh position={[-0.75, 0.012, -0.3]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[1.25, 0.95]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.22 * sun} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <PapanLarangan3D pos={[1.0, 2.22, zMin + 0.03]} shake={signShake} />
      <WallClock pos={[2.0, 2.4, zMin + 0.03]} />

      {/* ---------- KASUR: dipan kayu + kasur + sprei kotak + bantal + guling ---------- */}
      <group position={[-1.25, 0, -1.6]}>
        <B pos={[0, 0.12, 0]} size={[1.95, 0.24, 1.1]} map={tx.wood} ink={0.025} />
        <B pos={[-1.0, 0.45, 0]} size={[0.06, 0.9, 1.12]} map={tx.wood} ink={0.025} />
        <B pos={[0, 0.34, 0]} size={[1.88, 0.2, 1.02]} map={tx.sheet} ink={0.02} />
        <B pos={[0, 0.34, 0.52]} size={[1.88, 0.18, 0.02]} color="#b91c1c" ink={0.004} />
        {showPillow && <Ball pos={[-0.68, 0.5, -0.2]} r={0.2} scale={[1.05, 0.42, 0.8]} color="#fef9c3" hull={0.05} />}
        <Cyl pos={[0.25, 0.52, -0.38]} r={0.11} h={0.9} rot={[0, 0, Math.PI / 2]} color="#f9a8d4" hull={0.06} />
        {/* kaos lecek + charger HP di kasur */}
        <B pos={[0.55, 0.45, 0.2]} size={[0.35, 0.03, 0.28]} rot={[0, 0.4, 0]} color="#22c55e" ink={0.008} />
        <B pos={[0.12, 0.45, 0.25]} size={[0.07, 0.012, 0.14]} rot={[0, -0.3, 0]} color="#0f172a" ink={0.005} />
      </group>

      {/* ---------- MEJA BELAJAR + LAPTOP + PERNAK-PERNIK ---------- */}
      <group position={[1.15, 0, -1.75]}>
        <B pos={[0, 0.74, 0]} size={[1.3, 0.05, 0.62]} map={tx.wood} ink={0.02} />
        {[-0.6, 0.6].map((x) => [-0.26, 0.26].map((z) => <B key={`${x}${z}`} pos={[x, 0.37, z]} size={[0.05, 0.74, 0.05]} color="#5b3a22" ink={0.01} />))}
        <Laptop position={[-0.12, 0.765, 0.02]} rotation={[0, 0, 0]} scale={0.75} screenText="SKRIPSI_FINAL_rev9" />
        <Mug position={[0.38, 0.77, 0.12]} c="#f97316" scale={0.8} />
        {["#ef4444", "#3b82f6", "#eab308", "#10b981"].map((c, i) => (
          <B key={c} pos={[0.45 + i * 0.045, 0.9, -0.2]} size={[0.04, 0.28, 0.2]} color={c} ink={0.008} />
        ))}
        {/* lampu belajar */}
        <Cyl pos={[-0.52, 0.78, -0.18]} r={0.07} h={0.03} color="#334155" hull={0.08} />
        <Cyl pos={[-0.52, 0.98, -0.18]} r={0.012} h={0.4} rot={[0, 0, 0.3]} color="#334155" hull={0.12} />
        <P geo={() => <coneGeometry args={[0.08, 0.12, 12, 1, true]} />} color="#facc15" pos={[-0.46, 1.18, -0.1]} rot={[0.9, 0, 0]} hull={0.08} />
        {/* kursi plastik dengan jaket tersampir */}
        <group position={[0.05, 0, 0.6]}>
          <B pos={[0, 0.44, 0]} size={[0.44, 0.05, 0.44]} color="#ef4444" ink={0.015} />
          <B pos={[0, 0.72, 0.21]} size={[0.44, 0.5, 0.04]} color="#ef4444" ink={0.015} />
          {[-0.19, 0.19].map((x) => [-0.19, 0.19].map((z) => <B key={`${x}${z}`} pos={[x, 0.22, z]} size={[0.04, 0.44, 0.04]} color="#dc2626" ink={0.01} />))}
          <B pos={[0, 0.82, 0.25]} size={[0.5, 0.36, 0.06]} color="#475569" ink={0.012} />
        </group>
        {/* tempelan sticky note + jadwal kuliah di dinding */}
        {["#fde047", "#f9a8d4", "#86efac"].map((c, i) => (
          <B key={c} pos={[-0.45 + i * 0.14, 1.32 + (i % 2) * 0.1, -0.3]} size={[0.11, 0.11, 0.005]} color={c} ink={0.003} />
        ))}
      </group>

      <KipasAngin3D pos={[1.95, 0, -0.75]} rot={[0, -0.9, 0]} t={t} on={fanOn} />

      {/* ---------- DINDING KIRI: lemari 2 pintu + gantungan handuk ---------- */}
      {!hideWardrobe && (
        <>
          <Lemari2Pintu3D pos={[xMin + 0.3, 0, 0.1]} rot={[0, Math.PI / 2, 0]} openL={lemariL} openR={lemariR} shake={lemariShake} />
          <group position={[xMin + 0.03, 1.6, 1.4]} rotation={[0, Math.PI / 2, 0]}>
            <Poster
              pos={[0, 0.25, 0]}
              w={0.6}
              h={0.82}
              draw={(c) => {
                c.fillStyle = "#1e1b4b";
                c.fillRect(0, 0, 256, 350);
                c.fillStyle = "#facc15";
                c.font = "900 40px Arial";
                c.textAlign = "center";
                c.fillText("KONSER", 128, 70);
                c.fillText("INDIE", 128, 116);
                c.fillStyle = "#f472b6";
                c.beginPath();
                c.arc(128, 220, 70, 0, Math.PI * 2);
                c.fill();
              }}
            />
            <Cyl pos={[0, -0.35, 0.05]} r={0.012} h={0.5} rot={[0, 0, Math.PI / 2]} color="#94a3b8" hull={0.1} />
            <B pos={[-0.1, -0.62, 0.06]} size={[0.3, 0.55, 0.03]} color="#06b6d4" ink={0.01} />
          </group>
        </>
      )}

      {/* ---------- DINDING KANAN: pintu ke koridor + rak sepatu + gantungan kunci ---------- */}
      <PintuKos3D pos={[xMax, 0, 0.8]} rot={[0, -Math.PI / 2, 0]} open={doorOpen} num="01" bang={doorBang} />
      <group position={[xMax - 0.2, 0, 1.75]}>
        <B pos={[0, 0.25, 0]} size={[0.35, 0.5, 0.6]} color="#78350f" ink={0.02} />
        {["#111827", "#ef4444", "#f8fafc"].map((c, i) => (
          <B key={c} pos={[0, 0.12 + (i % 2) * 0.22, -0.18 + i * 0.17]} size={[0.26, 0.08, 0.13]} color={c} ink={0.008} />
        ))}
      </group>

      {/* ---------- DINDING DEPAN (terlihat saat orbit 360°): dispenser galon + cermin + keset ---------- */}
      {!hideFront && (
        <>
          <group position={[-1.6, 0, zMax - 0.3]}>
            <B pos={[0, 0.45, 0]} size={[0.36, 0.9, 0.36]} color="#e2e8f0" ink={0.02} />
            <Cyl pos={[0, 1.15, 0]} r={0.16} h={0.5} color="#7dd3fc" hull={0.05} seg={18} />
            <B pos={[0.0, 0.7, 0.19]} size={[0.1, 0.06, 0.04]} color="#3b82f6" ink={0.006} />
            <B pos={[0.0, 0.62, 0.19]} size={[0.1, 0.06, 0.04]} color="#ef4444" ink={0.006} />
          </group>
          <group position={[0.4, 1.5, zMax - 0.02]} rotation={[0, Math.PI, 0]}>
            <B pos={[0, 0, 0]} size={[0.5, 0.75, 0.03]} color="#8b5a2b" ink={0.012} />
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[0.42, 0.66]} />
              <meshStandardMaterial color="#e0f2fe" metalness={0.7} roughness={0.12} />
            </mesh>
          </group>
          <group position={[-0.5, 0, zMax - 0.35]}>
            <B pos={[0, 0.03, 0]} size={[0.7, 0.03, 0.45]} color="#a3e635" ink={0.01} />
          </group>
        </>
      )}
      {/* karpet bulu di tengah kamar */}
      <mesh position={[0.15, 0.008, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 32]} />
        <meshStandardMaterial color={cozy > 0.5 ? "#fda4af" : "#c4b5fd"} roughness={1} />
      </mesh>
      {/* tempat sampah + bungkus mie */}
      <group position={[1.85, 0, 0.0]}>
        <Cyl pos={[0, 0.17, 0]} r={0.13} rTop={0.15} h={0.34} color="#16a34a" hull={0.05} />
        <B pos={[0.05, 0.36, 0.02]} size={[0.12, 0.03, 0.09]} rot={[0.3, 0.4, 0]} color="#facc15" ink={0.006} />
      </group>

      {/* ---------- PENCAHAYAAN ---------- */}
      <hemisphereLight args={[cozy > 0.5 ? "#fff1d6" : "#fff7e8", "#b08968", 0.75 + cozy * 0.2]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3.5, 5.5, -6]} intensity={1.6 * sun} color="#ffd59a" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, h - 0.3, 0.2]} intensity={cozy > 0.5 ? 8 : 5} distance={7} color={cozy > 0.5 ? "#ffcf8a" : "#f0f9ff"} />
    </group>
  );
};

/* ---------------------------------------------------------------------- */
/* 5. KORIDOR LANTAI 2 (di luar pintu kanan kamar Riko, x > 2.3)            */
/* ---------------------------------------------------------------------- */
export const KORIDOR = { x0: 2.34, x1: 4.3, z0: -5.5, z1: 6 };

export const KoridorLantai2: React.FC<{ t?: number; noticeGlow?: number; hideRoof?: boolean }> = ({ t = 0, noticeGlow = 0, hideRoof = false }) => {
  const tx = useMemo(
    () => ({
      wall: plasterTex("#fde7c4", [4, 1]),
      floor: tileTex([3, 10]),
      sky: canvasTex(512, 256, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, "#7dd3fc");
        g.addColorStop(0.55, "#fed7aa");
        g.addColorStop(1, "#fb923c");
        c.fillStyle = g;
        c.fillRect(0, 0, 512, 256);
        c.fillStyle = "#fff7ed";
        c.beginPath();
        c.arc(380, 170, 34, 0, Math.PI * 2);
        c.fill();
        for (let i = 0; i < 14; i++) {
          c.fillStyle = i % 2 ? "#9a3412" : "#7c2d12";
          const w = 30 + (i * 13) % 40;
          const hh = 40 + (i * 29) % 70;
          c.fillRect(i * 38, 256 - hh, w, hh);
          c.fillStyle = "#b45309";
          c.beginPath();
          c.moveTo(i * 38 - 4, 256 - hh);
          c.lineTo(i * 38 + w / 2, 256 - hh - 18);
          c.lineTo(i * 38 + w + 4, 256 - hh);
          c.fill();
        }
      }),
    }),
    [],
  );
  const { x0, x1, z0, z1 } = KORIDOR;
  const L = z1 - z0;
  const zc = (z0 + z1) / 2;
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0, zc]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[x1 - x0, L]} />
        <meshStandardMaterial map={tx.floor} roughness={0.6} />
      </mesh>
      {/* dinding luar deretan kamar (menghadap +x) */}
      <Wall pos={[x0, 1.45, zc]} rot={[0, Math.PI / 2, 0]} w={L} h={2.9} map={tx.wall} />
      {/* atap/kanopi koridor */}
      {!hideRoof && <B pos={[(x0 + x1) / 2 + 0.2, 3.0, zc]} size={[x1 - x0 + 0.6, 0.1, L]} color="#9a3412" ink={0.02} />}
      {/* pagar besi + pot tanaman di pagar + jemuran */}
      <B pos={[x1, 1.0, zc]} size={[0.06, 0.06, L]} color="#1f2937" ink={0.012} />
      <B pos={[x1, 0.08, zc]} size={[0.08, 0.16, L]} color="#d6d3d1" ink={0.012} />
      {Array.from({ length: Math.floor(L / 0.25) }, (_, i) => (
        <B key={i} pos={[x1, 0.55, z0 + 0.12 + i * 0.25]} size={[0.025, 0.9, 0.025]} color="#334155" ink={0.004} />
      ))}
      {[-3.6, -1.2, 2.4, 4.6].map((z, i) => (
        <Plant key={z} pos={[x1 - 0.25, 0, z]} s={1.1 + (i % 2) * 0.3} t={t} />
      ))}
      <Cyl pos={[x1 - 0.05, 2.3, zc]} r={0.006} h={L} rot={[Math.PI / 2, 0, 0]} color="#e5e7eb" hull={0.2} />
      {["#f472b6", "#60a5fa", "#fbbf24", "#34d399", "#f8fafc"].map((c, i) => (
        <B key={c} pos={[x1 - 0.05, 2.0, -4.6 + i * 0.55]} size={[0.02, 0.55, 0.42]} rot={[Math.sin(t * 1.4 + i) * 0.08, 0, 0]} color={c} ink={0.008} />
      ))}
      {/* langit sore & atap kampung di balik pagar */}
      <mesh position={[x1 + 3.4, 2.0, zc]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[L + 16, 9]} />
        <meshBasicMaterial map={tx.sky} toneMapped={false} />
      </mesh>
      {/* pintu kamar 02 (Bagas) & 03 (Mbak Ara) */}
      <PintuKos3D pos={[x0 + 0.01, 0, -2.6]} rot={[0, Math.PI / 2, 0]} num="02" color="#6b8e23" />
      <PintuKos3D pos={[x0 + 0.01, 0, 3.9]} rot={[0, Math.PI / 2, 0]} num="03" color="#c084fc" />
      {/* papan pengumuman razia */}
      <group position={[x0 + 0.03, 1.55, -0.9]} rotation={[0, Math.PI / 2, 0]}>
        <B pos={[0, 0, 0]} size={[0.8, 0.62, 0.04]} color="#92400e" ink={0.015} />
        <Sign pos={[0, 0, 0.03]} w={0.72} h={0.54} text="RAZIA KAMAR HARI INI!" bg={noticeGlow > 0.5 ? "#fde047" : "#fef9c3"} fg="#b91c1c" />
      </group>
      {/* rak sandal jepit + galon + sapu lidi bersandar */}
      {[-1.6, 2.0, 5.1].map((z, i) => (
        <group key={z} position={[x0 + 0.25, 0, z]}>
          <B pos={[0, 0.18, 0]} size={[0.3, 0.36, 0.55]} color="#a16207" ink={0.015} />
          <B pos={[0.06, 0.38, -0.12]} size={[0.12, 0.04, 0.26]} color={["#22c55e", "#ef4444", "#3b82f6"][i]} ink={0.006} />
          <B pos={[0.06, 0.38, 0.12]} size={[0.12, 0.04, 0.26]} color={["#22c55e", "#ef4444", "#3b82f6"][i]} ink={0.006} />
        </group>
      ))}
      <Cyl pos={[x0 + 0.3, 0.25, 0.55 + 1.2]} r={0.16} h={0.5} color="#7dd3fc" hull={0.05} seg={16} />
      <group position={[x0 + 0.12, 0.7, -4.2]} rotation={[0, 0, -0.18]}>
        <Cyl pos={[0, 0, 0]} r={0.015} h={1.3} color="#a16207" hull={0.12} />
        <P geo={() => <coneGeometry args={[0.16, 0.45, 10]} />} color="#d6b46a" pos={[0, -0.75, 0]} rot={[Math.PI, 0, 0]} hull={0.06} />
      </group>
      {/* lampu teras koridor */}
      {[-2, 2.6].map((z) => (
        <group key={z} position={[x0 + 0.05, 2.55, z]}>
          <Ball pos={[0.06, 0, 0]} r={0.08} color="#fffbeb" emissive="#fde68a" hull={0.05} />
        </group>
      ))}
    </group>
  );
};

/** Bayangan sapu yang mendekat di dinding/lantai koridor (siluet hitam transparan) */
export const BayanganSapu3D: React.FC<{ pos?: V3; rot?: V3; scale?: number; opacity?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, opacity = 0.55 }) => {
  const tex = useMemo(
    () =>
      canvasTex(256, 512, (c) => {
        c.clearRect(0, 0, 256, 512);
        c.fillStyle = "#000";
        // kepala bersanggul
        c.beginPath();
        c.arc(110, 70, 42, 0, Math.PI * 2);
        c.arc(110, 26, 22, 0, Math.PI * 2);
        c.fill();
        // badan daster melebar
        c.beginPath();
        c.moveTo(70, 112);
        c.lineTo(150, 112);
        c.lineTo(185, 470);
        c.lineTo(40, 470);
        c.closePath();
        c.fill();
        // lengan + sapu terangkat
        c.lineWidth = 18;
        c.strokeStyle = "#000";
        c.beginPath();
        c.moveTo(145, 140);
        c.lineTo(205, 70);
        c.stroke();
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(205, 70);
        c.lineTo(235, 4);
        c.moveTo(205, 70);
        c.lineTo(160, 300);
        c.stroke();
        c.beginPath();
        c.moveTo(135, 290);
        c.lineTo(185, 300);
        c.lineTo(175, 380);
        c.lineTo(115, 370);
        c.closePath();
        c.fill();
      }),
    [],
  );
  return (
    <mesh position={pos} rotation={rot} scale={scale}>
      <planeGeometry args={[1.2, 2.4]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

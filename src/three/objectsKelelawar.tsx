/* Bom Kelelawar 1943 — kelelawar 2D (kartu kanvas) + properti 3D bergaris tinta. */
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { P } from "./objectsRig";
import { InkBox } from "./objectsMolase";
import { Sign, signTex } from "./objectsMolaseProps";
import { FireCluster } from "./objectsBandung";
import { useStrata, useSand } from "./objectsSoda";

type V3 = [number, number, number];
const B = InkBox;
const INKC = "#241726";

const Cyl: React.FC<{ pos: V3; r: number; h: number; color: string; rot?: V3; hull?: number; seg?: number; r2?: number; emissive?: string }> = ({
  pos, r, h, color, rot = [0, 0, 0], hull = 0.06, seg = 16, r2, emissive,
}) => <P geo={() => <cylinderGeometry args={[r2 ?? r, r, h, seg]} />} color={color} pos={pos} rot={rot} hull={hull} emissive={emissive} />;
const Ball: React.FC<{ pos: V3; r: number; color: string; scale?: V3; hull?: number }> = ({ pos, r, color, scale, hull = 0.06 }) => (
  <P geo={() => <sphereGeometry args={[r, 18, 14]} />} color={color} pos={pos} scale={scale ?? 1} hull={hull} />
);

/* ================================================================== */
/* KELELAWAR 2D (kartu kanvas, digambar ulang tiap frame)             */
/* ================================================================== */
export type BatParams = {
  flap?: number; // 0..1 posisi sayap (0 = terlipat, 0.5 = terbentang, 1 = ke atas)
  expr?: "happy" | "sleepy" | "sneaky" | "shock" | "frozen";
  bomb?: boolean; // tabung bakar kecil di perut
  fuse?: number; // 0..1 percik sumbu
  frost?: number; // 0..1 beku (hibernasi di kulkas)
  hang?: boolean; // tergantung terbalik
  body?: string;
  seed?: number;
};
const CW = 480;
const CH = 360;

const drawBat = (c: CanvasRenderingContext2D, p: BatParams) => {
  c.clearRect(0, 0, CW, CH);
  const body = p.body ?? "#6e5a6a";
  const wingC = "#4c3c4e";
  const fl = p.flap ?? 0.5;
  c.save();
  if (p.hang) {
    c.translate(CW / 2, CH / 2);
    c.rotate(Math.PI);
    c.translate(-CW / 2, -CH / 2);
  }
  c.lineJoin = "round";
  c.lineCap = "round";
  const cx = 240, cy = 190;
  // sayap: tiap sisi = membran bergerigi dari bahu ke ujung
  const wing = (s: number) => {
    const lift = (fl - 0.5) * 150; // + = ke atas
    const span = 60 + Math.min(fl, 1 - fl * 0.3) * 2 * 120; // terlipat = sempit
    const tipX = cx + s * span;
    const tipY = cy - 30 - lift;
    c.beginPath();
    c.moveTo(cx + s * 22, cy - 26);
    c.quadraticCurveTo(cx + s * span * 0.55, tipY - 40, tipX, tipY);
    // gerigi bawah (3 lengkung)
    const n = 3;
    for (let i = 1; i <= n; i++) {
      const fx = tipX + (cx + s * 26 - tipX) * (i / n);
      const fy = tipY + (cy + 30 - tipY) * (i / n);
      const mx = (tipX + (cx + s * 26 - tipX) * ((i - 0.5) / n));
      const my = (tipY + (cy + 30 - tipY) * ((i - 0.5) / n)) - 26 * (1 - i / (n + 1));
      c.quadraticCurveTo(mx, my, fx, fy);
    }
    c.closePath();
    c.fillStyle = wingC;
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.stroke();
    // tulang jari
    c.strokeStyle = "#2c2030";
    c.lineWidth = 3.5;
    for (let i = 1; i < n; i++) {
      const fx = tipX + (cx + s * 26 - tipX) * (i / n);
      const fy = tipY + (cy + 30 - tipY) * (i / n);
      c.beginPath();
      c.moveTo(cx + s * 22, cy - 22);
      c.lineTo(fx, fy - 4);
      c.stroke();
    }
  };
  wing(-1);
  wing(1);
  // telinga
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx + s * 14, cy - 70);
    c.lineTo(cx + s * 44, cy - 128);
    c.lineTo(cx + s * 50, cy - 62);
    c.closePath();
    c.fillStyle = body;
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.stroke();
    c.beginPath();
    c.moveTo(cx + s * 26, cy - 72);
    c.lineTo(cx + s * 41, cy - 108);
    c.lineTo(cx + s * 44, cy - 70);
    c.closePath();
    c.fillStyle = "#e8a0a8";
    c.fill();
  }
  // badan bulat (kacang)
  c.beginPath();
  c.ellipse(cx, cy - 10, 56, 68, 0, 0, Math.PI * 2);
  c.fillStyle = body;
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 8;
  c.stroke();
  // perut terang
  c.beginPath();
  c.ellipse(cx, cy + 14, 32, 34, 0, 0, Math.PI * 2);
  c.fillStyle = "#a08c96";
  c.fill();
  // kaki kecil
  for (const s of [-1, 1]) {
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(cx + s * 16, cy + 52);
    c.lineTo(cx + s * 20, cy + 70);
    c.stroke();
  }
  // wajah
  const ex = p.expr ?? "happy";
  const eyeY = cy - 30;
  for (const s of [-1, 1]) {
    const x = cx + s * 20;
    if (ex === "sleepy" || ex === "frozen") {
      c.strokeStyle = INKC;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(x, eyeY + 2, 11, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
    } else {
      const r = ex === "shock" ? 17 : 14;
      c.beginPath();
      c.arc(x, eyeY, r, 0, Math.PI * 2);
      c.fillStyle = "#ffffff";
      c.fill();
      c.strokeStyle = INKC;
      c.lineWidth = 5;
      c.stroke();
      c.beginPath();
      c.arc(x + (ex === "sneaky" ? s * 2 + 4 : 0), eyeY + 2, ex === "shock" ? 5 : 7, 0, Math.PI * 2);
      c.fillStyle = INKC;
      c.fill();
      if (ex === "sneaky") {
        // kelopak setengah turun
        c.beginPath();
        c.moveTo(x - r - 2, eyeY - 2);
        c.lineTo(x + r + 2, eyeY - 2 + s * -3);
        c.lineTo(x + r + 2, eyeY - r - 4);
        c.lineTo(x - r - 2, eyeY - r - 4);
        c.closePath();
        c.fillStyle = body;
        c.fill();
        c.strokeStyle = INKC;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x - r - 2, eyeY - 2);
        c.lineTo(x + r + 2, eyeY - 2 + s * -3);
        c.stroke();
      }
    }
  }
  // hidung & mulut + taring
  c.fillStyle = "#3a2430";
  c.beginPath();
  c.ellipse(cx, cy - 12, 7, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 5;
  c.beginPath();
  if (ex === "shock") {
    c.ellipse(cx, cy + 6, 11, 13, 0, 0, Math.PI * 2);
    c.fillStyle = "#5a1a2a";
    c.fill();
    c.stroke();
  } else if (ex === "sleepy" || ex === "frozen") {
    c.moveTo(cx - 10, cy + 4);
    c.lineTo(cx + 10, cy + 4);
    c.stroke();
  } else {
    c.arc(cx, cy - 2, 16, 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();
    c.fillStyle = "#ffffff";
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(cx + s * 7, cy + 10);
      c.lineTo(cx + s * 4, cy + 19);
      c.lineTo(cx + s * 10, cy + 12);
      c.closePath();
      c.fill();
    }
  }
  // tabung bakar (diikat tali di perut)
  if (p.bomb) {
    c.strokeStyle = "#8a6a3a";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(cx - 34, cy + 30);
    c.lineTo(cx + 34, cy + 30);
    c.stroke();
    c.beginPath();
    c.roundRect(cx - 15, cy + 34, 30, 52, 8);
    c.fillStyle = "#c8c0a8";
    c.fill();
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = "#d63a2a";
    c.fillRect(cx - 13, cy + 52, 26, 9);
    // sumbu
    c.strokeStyle = INKC;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx, cy + 86);
    c.quadraticCurveTo(cx + 10, cy + 98, cx + 4, cy + 108);
    c.stroke();
    if ((p.fuse ?? 0) > 0) {
      const k = p.fuse ?? 0;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + (p.seed ?? 0);
        c.strokeStyle = i % 2 ? "#ffd23a" : "#ff7a1a";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(cx + 4, cy + 108);
        c.lineTo(cx + 4 + Math.cos(a) * 16 * k, cy + 108 + Math.sin(a) * 16 * k);
        c.stroke();
      }
    }
  }
  c.restore();
  // beku: lapisan es biru + kristal
  const fr = p.frost ?? 0;
  if (fr > 0) {
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(150,210,255,${0.55 * fr})`;
    c.fillRect(0, 0, CW, CH);
    c.globalCompositeOperation = "source-over";
    c.strokeStyle = `rgba(235,250,255,${fr})`;
    c.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const x = 170 + i * 35, y = 130 + (i % 2) * 70;
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        c.beginPath();
        c.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9);
        c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
        c.stroke();
      }
    }
  }
};

export const BatCard: React.FC<{ position: V3; size?: number; params: BatParams; roll?: number; faceCam?: boolean; shadow?: boolean }> = ({
  position, size = 0.6, params, roll = 0, faceCam = true, shadow = false,
}) => {
  const frameNo = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const { cv, tex, buf } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = CW;
    cv.height = CH;
    const buf = new Uint8Array(CW * CH * 4);
    const tex = new THREE.DataTexture(buf, CW, CH, THREE.RGBAFormat, THREE.UnsignedByteType);
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
  drawBat(ctx, params);
  buf.set(ctx.getImageData(0, 0, CW, CH).data);
  tex.needsUpdate = true;
  const face = faceCam ? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]) : 0;
  const h = size * (CH / CW);
  return (
    <group position={position} rotation={[0, face, 0]}>
      <mesh rotation={[0, 0, roll]}>
        <planeGeometry args={[size, h]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {shadow && (
        <mesh position={[0, -h * 0.5 - 0.02, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.4, 1]}>
          <circleGeometry args={[size * 0.3, 16]} />
          <meshBasicMaterial color="#1a1030" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
};

/** kawanan kelelawar: posisi semu-acak yang mengalir sepanjang waktu t (detik) */
export const BatSwarm: React.FC<{ center: V3; count?: number; spread?: V3; t: number; size?: number; drift?: V3; bomb?: boolean; seed?: number }> = ({
  center, count = 14, spread = [4, 2, 2], t, size = 0.32, drift = [0, 0.6, 0], bomb = false, seed = 1,
}) => {
  const items = useMemo(
    () => new Array(count).fill(0).map((_, i) => {
      const h = (k: number) => {
        const x = Math.sin((i + 1) * 12.9898 * k + seed * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };
      return { x: h(1) - 0.5, y: h(2) - 0.5, z: h(3) - 0.5, ph: h(4), sp: 0.7 + h(5) * 0.6, s: 0.75 + h(6) * 0.5 };
    }),
    [count, seed],
  );
  return (
    <group>
      {items.map((b, i) => {
        const k = t * b.sp;
        const pos: V3 = [
          center[0] + b.x * spread[0] + drift[0] * k + Math.sin(k * 1.7 + b.ph * 6) * 0.35,
          center[1] + b.y * spread[1] + drift[1] * k + Math.sin(k * 2.3 + b.ph * 9) * 0.25,
          center[2] + b.z * spread[2] + drift[2] * k,
        ];
        const flap = 0.5 + 0.5 * Math.sin((t * 9 + b.ph * 6) * b.sp);
        return <BatCard key={i} position={pos} size={size * b.s} params={{ flap, expr: i % 4 === 0 ? "sneaky" : "happy", bomb, seed: i }} roll={Math.sin(k + i) * 0.2} />;
      })}
    </group>
  );
};

/* ================================================================== */
/* LATAR 1: GUA CARLSBAD, NEW MEXICO (senja)                          */
/* ================================================================== */
export const Mesa: React.FC<{ pos: V3; w?: number; h?: number; d?: number }> = ({ pos, w = 8, h = 3, d = 5 }) => {
  const strata = useStrata([1.5, 0.7]);
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.42, w * 0.55, h, 9]} />
        <meshStandardMaterial map={strata} roughness={1} />
      </mesh>
      <mesh position={[0, h / 2, 0]} scale={[1.02, 1.01, 1.02]}>
        <cylinderGeometry args={[w * 0.42, w * 0.55, h, 9]} />
        <meshBasicMaterial color="#1a0d10" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, h + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, d / w, 1]}>
        <circleGeometry args={[w * 0.42, 9]} />
        <meshStandardMaterial color="#d9874a" roughness={1} />
      </mesh>
    </group>
  );
};

export const Cactus: React.FC<{ pos: V3; s?: number }> = ({ pos, s = 1 }) => (
  <group position={pos} scale={s}>
    <Cyl pos={[0, 0.9, 0]} r={0.2} h={1.8} color="#4f8a46" hull={0.08} />
    <Ball pos={[0, 1.8, 0]} r={0.2} color="#4f8a46" />
    <Cyl pos={[0.38, 1.05, 0]} r={0.12} h={0.6} color="#4f8a46" hull={0.1} />
    <Cyl pos={[0.22, 0.8, 0]} r={0.12} h={0.36} color="#4f8a46" rot={[0, 0, Math.PI / 2]} hull={0.1} />
    <Cyl pos={[-0.36, 1.25, 0]} r={0.11} h={0.5} color="#4f8a46" hull={0.1} />
    <Cyl pos={[-0.2, 1.02, 0]} r={0.11} h={0.32} color="#4f8a46" rot={[0, 0, Math.PI / 2]} hull={0.1} />
  </group>
);

/** mulut gua batu kapur raksasa + tangga batu + papan nama */
export const CaveMouth: React.FC<{ pos?: V3; scale?: number }> = ({ pos = [0, 0, 0], scale = 1 }) => {
  const strata = useStrata([2.5, 1.2]);
  const rocks = useMemo(
    () => new Array(9).fill(0).map((_, i) => {
      const a = Math.PI * (i / 8);
      return { x: Math.cos(a) * 2.9, y: Math.sin(a) * 2.6, r: 0.55 + (i % 3) * 0.15 };
    }),
    [],
  );
  return (
    <group position={pos} scale={scale}>
      {/* tebing belakang */}
      <mesh position={[0, 2.6, -1.2]} castShadow receiveShadow>
        <boxGeometry args={[12, 5.2, 2]} />
        <meshStandardMaterial map={strata} roughness={1} />
      </mesh>
      {/* lubang gua gelap */}
      <mesh position={[0, 1.4, -0.15]}>
        <circleGeometry args={[2.6, 28, 0, Math.PI]} />
        <meshBasicMaterial color="#0c0710" />
      </mesh>
      <mesh position={[0, 1.4, -0.14]} scale={[1, 0.001, 1]}>
        <boxGeometry args={[5.2, 1, 0.1]} />
        <meshBasicMaterial color="#0c0710" />
      </mesh>
      <mesh position={[0, 0.7, -0.15]}>
        <planeGeometry args={[5.2, 1.4]} />
        <meshBasicMaterial color="#0c0710" />
      </mesh>
      {/* bongkah batu melengkung di bibir gua */}
      {rocks.map((r, i) => (
        <Ball key={i} pos={[r.x, r.y + 0.1, 0.05]} r={r.r} color={i % 2 ? "#a85a3a" : "#94482e"} scale={[1.3, 0.7, 0.5]} hull={0.05} />
      ))}
      {/* stalaktit */}
      {[-1.6, -0.8, 0, 0.9, 1.7].map((x, i) => (
        <P key={i} geo={() => <coneGeometry args={[0.16, 0.6 + (i % 2) * 0.3, 7]} />} color="#e0b088" pos={[x, 3.2 - (i % 2) * 0.2, 0.2]} rot={[Math.PI, 0, 0]} hull={0.08} />
      ))}
      {/* jalan setapak */}
      <B pos={[0, 0.06, 1.6]} size={[2.2, 0.12, 2.6]} color="#cfa27a" ink={0.04} />
      <Sign pos={[3.6, 1.2, 1.6]} w={2.2} h={0.8} text="CARLSBAD CAVERNS" bg="#f2dcae" fg="#4a2414" rot={[0, -0.25, 0]} />
      <Cyl pos={[3.6, 0.4, 1.6]} r={0.07} h={0.8} color="#6b4a2e" hull={0.1} />
    </group>
  );
};

/* ================================================================== */
/* LATAR 2: LAB PENDINGIN (kulkas hibernasi kelelawar)                */
/* ================================================================== */
const frostTex = (() => {
  let cache: THREE.CanvasTexture | null = null;
  return () => {
    if (cache) return cache;
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 256;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#dbeaf6";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + (i % 5) * 0.1})`;
      g.fillRect((i * 97) % 256, (i * 57) % 256, 3, 2);
    }
    g.strokeStyle = "rgba(120,160,200,0.35)";
    g.lineWidth = 2;
    for (let y = 16; y < 256; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(256, y);
      g.stroke();
    }
    cache = new THREE.CanvasTexture(cv);
    cache.colorSpace = THREE.SRGBColorSpace;
    return cache;
  };
})();

/** kulkas militer besar; open 0..1 membuka pintu; isi = rak baki kelelawar beku */
export const BatFridge: React.FC<{ pos?: V3; open?: number; frost?: number; t?: number; rot?: V3 }> = ({ pos = [0, 0, 0], open = 0, frost = 1, t = 0, rot = [0, 0, 0] }) => {
  const ft = frostTex();
  return (
    <group position={pos} rotation={rot}>
      <B pos={[0, 1.5, 0]} size={[1.9, 3.0, 1.3]} color="#e9eef2" ink={0.05} />
      {/* bagian dalam */}
      <mesh position={[0, 1.55, 0.66]}>
        <planeGeometry args={[1.7, 2.7]} />
        <meshStandardMaterial map={ft} roughness={1} />
      </mesh>
      {[0.65, 1.35, 2.05, 2.7].map((y, i) => (
        <group key={y}>
          <B pos={[0, y - 0.12, 0.55]} size={[1.6, 0.05, 0.3]} color="#b9cde0" ink={0.01} />
          {[-0.55, -0.18, 0.18, 0.55].map((x, k) => (
            <BatCard key={k} position={[x, y + 0.14, 0.72]} size={0.42} faceCam={false} params={{ flap: 0, expr: "frozen", frost, hang: false, seed: i * 4 + k }} roll={Math.sin(t * 2 + i + k) * 0.03} />
          ))}
        </group>
      ))}
      {/* pintu engsel kiri */}
      <group position={[-0.95, 1.5, 0.66]} rotation={[0, -open * 1.75, 0]}>
        <B pos={[0.95, 0, 0.04]} size={[1.9, 3.0, 0.1]} color="#d7e1ea" ink={0.04} />
        <B pos={[1.72, 0.1, 0.14]} size={[0.08, 0.7, 0.1]} color="#5a6a80" ink={0.015} />
        <mesh position={[0.95, 0.7, 0.1]}>
          <planeGeometry args={[1.3, 0.38]} />
          <meshBasicMaterial map={signTex("JANGAN DIBUKA!", "#f4e8c8", "#b0201a", 512, 150)} />
        </mesh>
      </group>
      {/* termometer */}
      <B pos={[1.15, 2.3, 0.2]} size={[0.16, 0.8, 0.06]} color="#ffffff" ink={0.02} />
      <B pos={[1.15, 2.1, 0.24]} size={[0.05, 0.36, 0.02]} color="#3a7ad6" ink={0.005} />
      {/* uap dingin */}
      {open > 0.2 && [0, 1, 2].map((i) => (
        <Ball key={i} pos={[-0.4 + i * 0.4, 0.3 + ((t * 0.5 + i * 0.33) % 1) * 0.4, 1.0 + ((t * 0.4 + i * 0.3) % 1) * 0.6]} r={0.22} color="#eef6ff" hull={0.02} />
      ))}
    </group>
  );
};

/** meja kerja lab: baki, tabung bakar berjajar, lampu, kertas */
export const LabBench: React.FC<{ pos?: V3; rot?: V3 }> = ({ pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <B pos={[0, 0.9, 0]} size={[2.6, 0.12, 1.1]} color="#8a5a34" ink={0.04} />
    {[-1.15, 1.15].map((x) => [-0.42, 0.42].map((z) => <B key={`${x}${z}`} pos={[x, 0.44, z]} size={[0.1, 0.88, 0.1]} color="#5a3a22" ink={0.03} />))}
    {[-0.9, -0.6, -0.3].map((x) => (
      <group key={x} position={[x, 1.08, 0.1]}>
        <Cyl pos={[0, 0, 0]} r={0.06} h={0.24} color="#c8c0a8" hull={0.12} />
        <Cyl pos={[0, 0.02, 0]} r={0.062} h={0.05} color="#d63a2a" hull={0.05} />
      </group>
    ))}
    <B pos={[0.4, 0.99, -0.1]} size={[0.8, 0.06, 0.5]} color="#9aa8b4" ink={0.02} />
    <mesh position={[0.9, 0.97, 0.25]} rotation={[-Math.PI / 2, 0, 0.2]}>
      <planeGeometry args={[0.42, 0.56]} />
      <meshBasicMaterial map={signTex("PROYEK X-RAY", "#f6f0dc", "#2a1a10", 256, 340)} />
    </mesh>
    {/* lampu meja */}
    <Cyl pos={[1.05, 1.0, -0.35]} r={0.1} h={0.06} color="#2f4a3a" hull={0.1} />
    <Cyl pos={[1.05, 1.25, -0.35]} r={0.025} h={0.5} color="#2f4a3a" hull={0.2} />
    <P geo={() => <coneGeometry args={[0.16, 0.18, 12, 1, true]} />} color="#3e6a4c" pos={[1.0, 1.5, -0.3]} rot={[0.4, 0, 0.3]} hull={0.08} />
  </group>
);

/* ================================================================== */
/* PROPERTI UTAMA: BOM WADAH KELELAWAR                                */
/* ================================================================== */
/** casing bom berisi baki-baki bundar bertingkat; open 0..1 membelah casing */
export const BatCanister: React.FC<{ pos?: V3; rot?: V3; open?: number; scale?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], open = 0, scale = 1 }) => (
  <group position={pos} rotation={rot} scale={scale}>
    {/* baki bertingkat */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Cyl key={i} pos={[0, 0.25 + i * 0.28, 0]} r={0.42} h={0.05} color="#c9b48a" hull={0.05} seg={20} />
    ))}
    <Cyl pos={[0, 1.0, 0]} r={0.04} h={1.6} color="#7a6a50" hull={0.2} />
    {/* dua belahan casing */}
    {[-1, 1].map((s) => (
      <group key={s} position={[s * open * 0.55, 0, 0]} rotation={[0, 0, s * open * 0.18]}>
        <mesh position={[0, 0.95, 0]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.48, 1.7, 20, 1, true, -Math.PI / 2, Math.PI]} />
          <meshToonMaterial color="#6f7a5a" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.95, 0]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={1.04}>
          <cylinderGeometry args={[0.48, 0.48, 1.7, 20, 1, true, -Math.PI / 2, Math.PI]} />
          <meshBasicMaterial color="#0d0b14" side={THREE.BackSide} />
        </mesh>
      </group>
    ))}
    {/* hidung & sirip */}
    <P geo={() => <sphereGeometry args={[0.48, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />} color="#5f6a4c" pos={[0, 1.8, 0]} hull={0.05} />
    {[0, 1, 2, 3].map((i) => (
      <B key={i} pos={[Math.cos((i * Math.PI) / 2) * 0.5, 0.15, Math.sin((i * Math.PI) / 2) * 0.5]} size={[0.06, 0.4, 0.4]} rot={[0, (-i * Math.PI) / 2, 0]} color="#56603f" ink={0.03} />
    ))}
    {/* parasut terlipat */}
    <Cyl pos={[0, 0.02, 0]} r={0.3} h={0.12} color="#e8dcc0" hull={0.1} />
  </group>
);

/* ================================================================== */
/* LATAR 3: PANGKALAN UDARA CARLSBAD (gurun, hangar, tangki BBM)      */
/* ================================================================== */
/** hangar setengah tabung (Quonset) dengan papan nama */
export const Hangar: React.FC<{ pos?: V3; rot?: V3; burn?: number; t?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], burn = 0, t = 0 }) => (
  <group position={pos} rotation={rot}>
    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[3, 3, 9, 24, 1, false, Math.PI / 2, Math.PI]} />
      <meshToonMaterial color="#9aa29a" side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={1.02}>
      <cylinderGeometry args={[3, 3, 9, 24, 1, false, Math.PI / 2, Math.PI]} />
      <meshBasicMaterial color="#0d0b14" side={THREE.BackSide} />
    </mesh>
    {/* rusuk seng */}
    {[-4, -2.7, -1.35, 0, 1.35, 2.7, 4].map((z) => (
      <mesh key={z} position={[0, 0, z]} rotation={[0, 0, 0]}>
        <torusGeometry args={[3.02, 0.04, 6, 24, Math.PI]} />
        <meshBasicMaterial color="#5a625a" />
      </mesh>
    ))}
    {/* dinding depan + pintu */}
    <mesh position={[0, 0, 4.5]}>
      <circleGeometry args={[3, 24, 0, Math.PI]} />
      <meshToonMaterial color="#b4b8ae" />
    </mesh>
    <B pos={[0, 1.2, 4.55]} size={[3.2, 2.4, 0.08]} color="#4a5444" ink={0.04} />
    <Sign pos={[0, 2.55, 4.62]} w={3.4} h={0.5} text="CARLSBAD ARMY AIRFIELD" bg="#f2e6c8" fg="#2a2a3a" />
    {burn > 0 && (
      <>
        <FireCluster pos={[-1.6, 2.2, 1]} scale={1.1 * burn} t={t} seed={3} />
        <FireCluster pos={[1.4, 2.6, -1.5]} scale={1.3 * burn} t={t} seed={5} />
      </>
    )}
  </group>
);

/** tangki bahan bakar di atas kaki besi (tempat kelelawar bersembunyi) */
export const FuelTank: React.FC<{ pos?: V3; burn?: number; t?: number; bats?: number }> = ({ pos = [0, 0, 0], burn = 0, t = 0, bats = 0 }) => (
  <group position={pos}>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
      <Cyl key={i} pos={[x * 1.0, 1.5, z * 1.0]} r={0.09} h={3} color="#7a5a3a" hull={0.12} />
    ))}
    <B pos={[0, 1.3, 1.0]} size={[2.1, 0.08, 0.08]} color="#7a5a3a" ink={0.02} rot={[0, 0, 0.9]} />
    <B pos={[0, 1.3, -1.0]} size={[2.1, 0.08, 0.08]} color="#7a5a3a" ink={0.02} rot={[0, 0, -0.9]} />
    <B pos={[0, 3.02, 0]} size={[2.5, 0.1, 2.5]} color="#6a4a2e" ink={0.03} />
    <Cyl pos={[0, 4.0, 0]} r={1.3} h={1.9} color="#d8d2c0" hull={0.05} seg={22} />
    <P geo={() => <coneGeometry args={[1.38, 0.5, 22]} />} color="#a8a090" pos={[0, 5.2, 0]} hull={0.05} />
    <mesh position={[0, 4.0, 1.31]}>
      <planeGeometry args={[1.5, 0.6]} />
      <meshBasicMaterial map={signTex("FUEL · BBM", "#f4e8c8", "#b0201a", 400, 160)} />
    </mesh>
    {/* kelelawar bergelantungan di bawah tangki */}
    {new Array(bats).fill(0).map((_, i) => (
      <BatCard key={i} position={[-0.9 + (i % 6) * 0.36, 2.72, 1.05 + Math.floor(i / 6) * 0.1]} size={0.34} params={{ flap: 0, hang: true, expr: i % 3 ? "sneaky" : "happy", bomb: true, fuse: burn > 0 ? 0 : 0.6, seed: i }} />
    ))}
    {burn > 0 && (
      <>
        <FireCluster pos={[0, 4.6, 0]} scale={1.6 * burn} t={t} seed={7} />
        <FireCluster pos={[0.6, 3.1, 0.3]} scale={0.9 * burn} t={t} seed={8} />
      </>
    )}
  </group>
);

/** mobil dinas jenderal tahun 1940-an (bintang di pintu); burn 0..1 */
export const StaffCar: React.FC<{ pos?: V3; rot?: V3; burn?: number; t?: number; soot?: number }> = ({ pos = [0, 0, 0], rot = [0, 0, 0], burn = 0, t = 0, soot = 0 }) => {
  const body = soot > 0 ? new THREE.Color("#3e4a34").lerp(new THREE.Color("#1c1a18"), soot).getStyle() : "#3e4a34";
  return (
    <group position={pos} rotation={rot}>
      <B pos={[0, 0.62, 0]} size={[3.6, 0.6, 1.6]} color={body} ink={0.05} />
      <B pos={[-0.2, 1.18, 0]} size={[1.9, 0.55, 1.5]} color={body} ink={0.05} />
      <B pos={[-0.2, 1.2, 0]} size={[1.7, 0.4, 1.52]} color="#a8c8dc" ink={0.01} />
      {/* spatbor bulat */}
      {[-1.25, 1.25].map((x) => [-0.8, 0.8].map((z) => (
        <group key={`${x}${z}`}>
          <Ball pos={[x, 0.55, z]} r={0.48} color={body} scale={[1.2, 0.8, 0.5]} hull={0.05} />
          <Cyl pos={[x, 0.38, z * 1.02]} r={0.36} h={0.24} color="#1e1e22" rot={[Math.PI / 2, 0, 0]} hull={0.06} />
          <Cyl pos={[x, 0.38, z * 1.1]} r={0.15} h={0.06} color="#c8c8c0" rot={[Math.PI / 2, 0, 0]} hull={0.06} />
        </group>
      )))}
      {/* lampu depan + bintang pintu */}
      {[-0.5, 0.5].map((z) => <Ball key={z} pos={[1.82, 0.85, z]} r={0.13} color="#fff4c0" hull={0.08} />)}
      <mesh position={[-0.2, 0.66, 0.81]}>
        <circleGeometry args={[0.2, 5]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* bendera kecil bintang di spatbor */}
      <Cyl pos={[1.6, 1.15, 0.7]} r={0.015} h={0.5} color="#888" hull={0.2} />
      <B pos={[1.75, 1.3, 0.7]} size={[0.28, 0.18, 0.01]} color="#c0302a" ink={0.01} />
      {burn > 0 && <FireCluster pos={[-0.2, 1.4, 0]} scale={1.0 * burn} t={t} seed={11} />}
    </group>
  );
};

/** tanah gurun berpasir datar luas + landasan */
export const DesertGround: React.FC<{ size?: number }> = ({ size = 160 }) => {
  const sand = useSand();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={sand} roughness={1} />
      </mesh>
    </group>
  );
};

/** landasan beton bergaris */
export const Runway: React.FC<{ pos?: V3; len?: number; rot?: V3 }> = ({ pos = [0, 0, 0], len = 40, rot = [0, 0, 0] }) => (
  <group position={pos} rotation={rot}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
      <planeGeometry args={[6, len]} />
      <meshStandardMaterial color="#8c8a86" roughness={1} />
    </mesh>
    {new Array(Math.floor(len / 4)).fill(0).map((_, i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -len / 2 + 2 + i * 4]}>
        <planeGeometry args={[0.25, 1.8]} />
        <meshBasicMaterial color="#f2efe4" />
      </mesh>
    ))}
  </group>
);

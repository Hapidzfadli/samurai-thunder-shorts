/* Kelinci 2D (kartu kanvas, digambar ulang tiap frame) untuk cerita Napoleon vs Kelinci. */
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";

type V3 = [number, number, number];
const INKC = "#241726";
export type RabbitParams = {
  pose?: "sit" | "hop";
  expr?: "polos" | "lapar" | "kenyang" | "kaget";
  fur?: string; // warna bulu
  mouth?: number; // 0..1 (mengunyah)
  flop?: number; // 0..1 telinga terkulai
  seed?: number;
};
const CW = 520;
const CH = 420;

const ell = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0, w = 8) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = w;
  c.strokeStyle = INKC;
  c.stroke();
};

export const drawRabbit = (c: CanvasRenderingContext2D, p: RabbitParams) => {
  c.clearRect(0, 0, CW, CH);
  const fur = p.fur ?? "#f1ece2";
  const dark = "#cfc4b2";
  const hop = p.pose === "hop";
  const flop = p.flop ?? 0;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.save();
  if (hop) {
    c.translate(260, 250);
    c.rotate(-0.22);
    c.translate(-260, -250);
  }
  // ekor
  ell(c, 108, hop ? 232 : 262, 30, 28, "#ffffff", 0, 7);
  // kaki belakang (paha + telapak)
  ell(c, 168, hop ? 330 : 318, 58, 44, dark, hop ? -0.4 : 0, 8);
  ell(c, hop ? 110 : 150, hop ? 372 : 356, hop ? 70 : 54, 17, fur, hop ? -0.15 : 0, 7);
  // badan
  ell(c, 232, 268, 124, 88, fur, 0, 9);
  ell(c, 260, 300, 70, 40, "#fbf8f1", 0, 0);
  // kaki depan
  ell(c, hop ? 372 : 322, hop ? 340 : 336, 20, hop ? 44 : 34, fur, hop ? 0.9 : 0, 7);
  // kepala
  ell(c, 348, 208, 72, 66, fur, 0, 9);
  // telinga (tegak, atau terkulai saat flop)
  const ear = (x: number, side: number) => {
    c.save();
    c.translate(x, 160);
    c.rotate(side * (0.18 + flop * 1.0));
    ell(c, 0, -62, 25, 82, fur, 0, 8);
    ell(c, 0, -58, 12, 62, "#f6b3c2", 0, 0);
    c.restore();
  };
  ear(318, -1);
  ear(380, 1);
  // pipi + mata
  ell(c, 398, 232, 22, 15, "rgba(246,160,176,0.65)", 0, 0);
  const ex = p.expr ?? "polos";
  const eyeX = 372;
  const eyeY = 198;
  if (ex === "kenyang") {
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(eyeX, eyeY + 4, 12, 1.15 * Math.PI, 1.85 * Math.PI);
    c.stroke();
  } else {
    const r = ex === "kaget" ? 21 : ex === "lapar" ? 19 : 16;
    ell(c, eyeX, eyeY, r, r, "#ffffff", 0, 5);
    ell(c, eyeX + 3, eyeY + 1, ex === "kaget" ? 5 : ex === "lapar" ? 10 : 8, ex === "kaget" ? 5 : ex === "lapar" ? 10 : 8, INKC, 0, 0);
    ell(c, eyeX + 6, eyeY - 4, 3, 3, "#ffffff", 0, 0);
    if (ex === "lapar") {
      // alis menukik: tekad besar untuk mencari makanan
      c.strokeStyle = INKC;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(eyeX - 22, eyeY - 24);
      c.lineTo(eyeX + 20, eyeY - 12);
      c.stroke();
    }
  }
  // hidung, mulut, gigi kelinci, kumis
  c.fillStyle = "#e7708a";
  c.beginPath();
  c.moveTo(406, 224);
  c.lineTo(424, 226);
  c.lineTo(414, 240);
  c.closePath();
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = INKC;
  c.stroke();
  const mo = p.mouth ?? 0;
  if (ex === "lapar" || mo > 0) {
    ell(c, 408, 256, 14, 6 + mo * 14, "#6a1a2a", 0, 5);
  } else {
    c.beginPath();
    c.moveTo(414, 242);
    c.quadraticCurveTo(404, 256, 392, 250);
    c.stroke();
  }
  c.fillStyle = "#ffffff";
  c.fillRect(398, 252 + mo * 8, 9, 14);
  c.fillRect(409, 252 + mo * 8, 9, 14);
  c.lineWidth = 2.5;
  c.strokeRect(398, 252 + mo * 8, 9, 14);
  c.strokeRect(409, 252 + mo * 8, 9, 14);
  c.lineWidth = 3;
  for (const dy of [-6, 4]) {
    c.beginPath();
    c.moveTo(402, 236 + dy);
    c.lineTo(450, 228 + dy * 2);
    c.stroke();
  }
  c.restore();
};

export const RabbitCard: React.FC<{ position: V3; size?: number; params: RabbitParams; faceCam?: boolean; flip?: boolean; roll?: number; shadow?: boolean }> = ({
  position, size = 0.7, params, faceCam = true, flip = false, roll = 0, shadow = true,
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
  drawRabbit(ctx, params);
  buf.set(ctx.getImageData(0, 0, CW, CH).data);
  tex.needsUpdate = true;
  const face = faceCam ? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]) : 0;
  const h = size * (CH / CW);
  return (
    <group position={position} rotation={[0, face, 0]}>
      <group rotation={[0, 0, roll]}>
        <mesh position={[0, h / 2 - h * 0.08, 0]} scale={[flip ? -1 : 1, 1, 1]}>
          <planeGeometry args={[size, h]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {shadow && (
        <mesh position={[0, 0.012, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.4, 1]}>
          <circleGeometry args={[size * 0.38, 16]} />
          <meshBasicMaterial color="#1a1030" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
};

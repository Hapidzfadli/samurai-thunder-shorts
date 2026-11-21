import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";

type Vec3 = [number, number, number];
export const BW = 600;
export const BH = 1000;
const INKC = "#241726";

export type BeanExpr = "neutral" | "worried" | "shock" | "angry" | "smug" | "scared" | "happy" | "sad" | "sleepy" | "talk";
export type BeanParams = {
  expr?: BeanExpr;
  look?: number; // -1..1 pupils
  skin?: string;
  torso?: string;
  pants?: string;
  hat?: "none" | "cap" | "bowler" | "bonnet" | "helmet" | "tophat" | "wig" | "kerchief";
  hatColor?: string;
  hair?: string;
  mustache?: boolean;
  apron?: string;
  tie?: string;
  coat?: boolean;
  /** leg/arm angles in degrees, 0 = hanging down, + = toward facing (right) */
  legL?: [number, number];
  legR?: [number, number];
  armL?: [number, number];
  armR?: [number, number];
  lean?: number;
  bob?: number;
  prop?: "none" | "brush" | "bucket" | "paper" | "gavel" | "stamp" | "jar" | "pen" | "umbrella";
  propHand?: "L" | "R";
  propRot?: number;
  goo?: number; // 0..1 brown coverage from the feet up
  sweat?: boolean;
  blink?: boolean;
  mouthOpen?: number; // 0..1 for talk
  seed?: number;
};

const poly = (c: CanvasRenderingContext2D, pts: [number, number][], fill?: string, stroke = INKC, w = 8) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  c.strokeStyle = stroke;
  c.lineWidth = w;
  c.lineJoin = "round";
  c.stroke();
};
const seg = (c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w = 9, col = INKC) => {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
};
const R = (d: number) => (d * Math.PI) / 180;
const tip = (x: number, y: number, len: number, a: number): [number, number] => [x + len * Math.sin(R(a)), y + len * Math.cos(R(a))];

const limb = (c: CanvasRenderingContext2D, x: number, y: number, l1: number, l2: number, a: [number, number], w = 9): [number, number, number] => {
  const e = tip(x, y, l1, a[0]);
  const h = tip(e[0], e[1], l2, a[0] + a[1]);
  seg(c, x, y, e[0], e[1], w);
  seg(c, e[0], e[1], h[0], h[1], w);
  return [h[0], h[1], a[0] + a[1]];
};

const drawProp = (c: CanvasRenderingContext2D, p: BeanParams, hx: number, hy: number, ang: number) => {
  if (!p.prop || p.prop === "none") return;
  c.save();
  c.translate(hx, hy);
  c.rotate(R(-(ang) + (p.propRot ?? 0)));
  switch (p.prop) {
    case "brush":
      seg(c, 0, 0, 0, 120, 9, "#8b5a2b");
      poly(c, [[-18, 120], [18, 120], [14, 170], [-14, 170]], "#4a2410", INKC, 6);
      break;
    case "bucket":
      poly(c, [[-40, 10], [40, 10], [32, 90], [-32, 90]], "#7a7f8a", INKC, 7);
      c.fillStyle = "#4a2410";
      c.fillRect(-36, 10, 72, 14);
      break;
    case "paper":
      poly(c, [[-42, -10], [42, -10], [42, 110], [-42, 110]], "#f7f1dd", INKC, 6);
      seg(c, -26, 20, 26, 20, 4);
      seg(c, -26, 44, 26, 44, 4);
      seg(c, -26, 68, 10, 68, 4);
      break;
    case "gavel":
      seg(c, 0, 0, 0, 90, 10, "#8b5a2b");
      poly(c, [[-40, -14], [40, -14], [40, 22], [-40, 22]], "#a96b34", INKC, 7);
      break;
    case "stamp":
      seg(c, 0, 0, 0, 60, 14, "#8b5a2b");
      poly(c, [[-40, 60], [40, 60], [40, 90], [-40, 90]], "#c93b3b", INKC, 7);
      break;
    case "jar":
      poly(c, [[-34, 0], [34, 0], [38, 100], [-38, 100]], "#ffd36a", INKC, 7);
      poly(c, [[-38, -16], [38, -16], [38, 0], [-38, 0]], "#c8a050", INKC, 6);
      break;
    case "pen":
      seg(c, 0, -10, 0, 60, 8, "#222");
      break;
    case "umbrella":
      seg(c, 0, 0, 0, 200, 8, "#3a2a1a");
      break;
  }
  c.restore();
};

export const drawBean = (c: CanvasRenderingContext2D, p: BeanParams) => {
  c.clearRect(0, 0, BW, BH);
  const skin = p.skin ?? "#f7ead6";
  const torso = p.torso ?? "#6b84b8";
  const pants = p.pants ?? "#3a3a4a";
  const lean = p.lean ?? 0;
  const bob = p.bob ?? 0;
  const lL = p.legL ?? [0, 0];
  const lR = p.legR ?? [0, 0];
  const aL = p.armL ?? [-6, -8];
  const aR = p.armR ?? [6, -8];
  c.save();
  c.translate(300, 975);
  c.rotate(R(lean) * 0.0);
  c.translate(-300, -975 - bob);
  const hipY = 640;
  const shY = 350;
  // far leg + arm
  limb(c, 280, hipY, 165, 170, lL, 10);
  const footL = tip(...tip(280, hipY, 165, lL[0]), 170, lL[0] + lL[1]);
  seg(c, footL[0], footL[1], footL[0] + 40, footL[1], 10);
  const handL = limb(c, 262, shY + 14, 130, 120, aL, 9);
  c.fillStyle = INKC;
  c.beginPath();
  c.arc(handL[0], handL[1], 12, 0, Math.PI * 2);
  c.fill();
  if (p.propHand === "L") drawProp(c, p, handL[0], handL[1], handL[2]);
  // torso (lean: shift top)
  const tx = lean * 3.2;
  if (p.coat) {
    poly(c, [[238 + tx, shY - 4], [362 + tx, shY - 4], [372, hipY + 40], [228, hipY + 40]], torso, INKC, 8);
    poly(c, [[286 + tx, shY - 4], [314 + tx, shY - 4], [300 + tx * 0.6, shY + 90]], "#f5efe0", INKC, 5);
    if (p.tie) poly(c, [[294 + tx, shY + 14], [306 + tx, shY + 14], [312 + tx * 0.8, shY + 120], [300 + tx * 0.8, shY + 136], [288 + tx * 0.8, shY + 120]], p.tie, INKC, 4);
  } else {
    poly(c, [[246 + tx, shY - 2], [354 + tx, shY - 2], [364, hipY + 20], [236, hipY + 20]], torso, INKC, 8);
  }
  if (p.apron) poly(c, [[260 + tx * 0.8, shY + 60], [340 + tx * 0.8, shY + 60], [352, hipY + 130], [248, hipY + 130]], p.apron, INKC, 6);
  if (!p.coat) poly(c, [[246, hipY + 10], [354, hipY + 10], [350, hipY + 40], [250, hipY + 40]], pants, INKC, 6);
  // near leg
  limb(c, 322, hipY, 165, 170, lR, 10);
  const footR = tip(...tip(322, hipY, 165, lR[0]), 170, lR[0] + lR[1]);
  seg(c, footR[0], footR[1], footR[0] + 40, footR[1], 10);
  // head
  const hx = 300 + tx * 1.3;
  c.save();
  c.translate(hx, 330);
  c.rotate(R(lean) * 0.6);
  c.translate(-300, -330);
  // neck
  seg(c, 300, 326, 300, 352, 9);
  // hair/hat behind
  const hatCol = p.hatColor ?? "#5a3a22";
  c.beginPath();
  c.moveTo(300, 88);
  c.bezierCurveTo(382, 88, 422, 150, 420, 212);
  c.bezierCurveTo(418, 276, 372, 320, 300, 320);
  c.bezierCurveTo(228, 320, 182, 276, 180, 212);
  c.bezierCurveTo(178, 150, 218, 88, 300, 88);
  c.closePath();
  c.fillStyle = skin;
  c.fill();
  c.strokeStyle = INKC;
  c.lineWidth = 10;
  c.stroke();
  // face
  const ex = [262, 338];
  const look = (p.look ?? 0) * 7;
  const big = p.expr === "shock" || p.expr === "scared" ? 24 : 19;
  const blink = p.blink || p.expr === "sleepy";
  const eyeY = 212;
  ex.forEach((x, i) => {
    if (blink) {
      seg(c, x - 16, eyeY + 4, x + 16, eyeY + 4, 6);
    } else if (p.expr === "happy") {
      c.strokeStyle = INKC;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(x, eyeY + 8, 15, Math.PI, 0);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(x, eyeY, big, 0, Math.PI * 2);
      c.fillStyle = "#fffdf6";
      c.fill();
      c.strokeStyle = INKC;
      c.lineWidth = 5;
      c.stroke();
      c.beginPath();
      c.arc(x + look, eyeY + (p.expr === "sad" ? 4 : 0), p.expr === "shock" ? 5 : 8, 0, Math.PI * 2);
      c.fillStyle = INKC;
      c.fill();
    }
    // brows
    let ang = 0;
    let by = eyeY - 36;
    if (p.expr === "worried" || p.expr === "scared" || p.expr === "sad") ang = i === 0 ? -18 : 18;
    if (p.expr === "angry") ang = i === 0 ? 22 : -22;
    if (p.expr === "smug") ang = i === 0 ? 8 : -2;
    if (p.expr === "shock") by -= 12;
    c.save();
    c.translate(x, by);
    c.rotate(R(ang));
    seg(c, -17, 0, 17, 0, 7);
    c.restore();
  });
  // mouth
  const my = 270;
  c.strokeStyle = INKC;
  c.lineWidth = 7;
  c.lineCap = "round";
  const mo = p.mouthOpen ?? 0;
  if (p.expr === "shock" || p.expr === "scared") {
    c.beginPath();
    c.ellipse(300, my + 6, 16, 22, 0, 0, Math.PI * 2);
    c.fillStyle = INKC;
    c.fill();
  } else if (p.expr === "happy") {
    c.beginPath();
    c.arc(300, my - 6, 26, 0.15, Math.PI - 0.15);
    c.stroke();
  } else if (p.expr === "angry" || p.expr === "sad" || p.expr === "worried") {
    c.beginPath();
    c.arc(300, my + 26, 22, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
  } else if (p.expr === "smug") {
    c.beginPath();
    c.moveTo(280, my + 4);
    c.quadraticCurveTo(310, my + 18, 330, my - 4);
    c.stroke();
  } else if (p.expr === "talk") {
    c.beginPath();
    c.ellipse(300, my + 4, 18, 8 + mo * 14, 0, 0, Math.PI * 2);
    c.fillStyle = INKC;
    c.fill();
  } else {
    seg(c, 282, my + 4, 318, my + 4, 7);
  }
  if (p.mustache) {
    c.fillStyle = "#2b1a12";
    c.beginPath();
    c.moveTo(300, my - 12);
    c.quadraticCurveTo(258, my - 26, 236, my - 2);
    c.quadraticCurveTo(262, my + 2, 300, my - 6);
    c.quadraticCurveTo(338, my + 2, 364, my - 2);
    c.quadraticCurveTo(342, my - 26, 300, my - 12);
    c.fill();
    c.stroke();
  }
  // hats
  const hat = p.hat ?? "none";
  if (hat === "cap") {
    poly(c, [[196, 150], [200, 112], [300, 84], [400, 112], [404, 150], [330, 138], [250, 138]], hatCol, INKC, 8);
    poly(c, [[196, 150], [330, 146], [340, 166], [200, 170]], hatCol, INKC, 8);
  } else if (hat === "bowler") {
    poly(c, [[230, 130], [240, 80], [300, 62], [360, 80], [370, 130]], hatCol, INKC, 8);
    poly(c, [[196, 134], [404, 134], [394, 154], [206, 154]], hatCol, INKC, 8);
  } else if (hat === "tophat") {
    poly(c, [[236, 128], [240, 20], [360, 20], [364, 128]], hatCol, INKC, 8);
    poly(c, [[196, 130], [404, 130], [396, 152], [204, 152]], hatCol, INKC, 8);
    poly(c, [[238, 108], [362, 108], [362, 124], [238, 124]], "#c93b3b", INKC, 4);
  } else if (hat === "helmet") {
    poly(c, [[196, 160], [206, 100], [300, 70], [394, 100], [404, 160]], hatCol, INKC, 8);
  } else if (hat === "bonnet") {
    poly(c, [[184, 220], [186, 120], [300, 70], [414, 120], [416, 220], [380, 150], [220, 150]], hatCol, INKC, 8);
  } else if (hat === "kerchief") {
    poly(c, [[190, 170], [210, 100], [300, 78], [390, 100], [410, 170], [350, 128], [250, 128]], hatCol, INKC, 8);
    poly(c, [[392, 160], [440, 190], [420, 230], [396, 180]], hatCol, INKC, 6);
  } else if (hat === "wig") {
    poly(c, [[170, 250], [176, 120], [300, 60], [424, 120], [430, 250], [400, 190], [200, 190]], "#f2f2f2", INKC, 7);
  } else if (p.hair) {
    c.fillStyle = p.hair;
    c.beginPath();
    c.moveTo(188, 170);
    c.bezierCurveTo(196, 100, 260, 80, 300, 82);
    c.bezierCurveTo(350, 80, 410, 100, 414, 170);
    c.bezierCurveTo(380, 130, 220, 130, 188, 170);
    c.fill();
    c.stroke();
  }
  if (p.sweat) {
    c.fillStyle = "#8fd3ff";
    c.strokeStyle = INKC;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(410, 150);
    c.quadraticCurveTo(430, 186, 410, 196);
    c.quadraticCurveTo(388, 186, 410, 150);
    c.fill();
    c.stroke();
  }
  c.restore();
  // near arm
  const handR = limb(c, 338 + tx, shY + 14, 130, 120, aR, 9);
  c.fillStyle = INKC;
  c.beginPath();
  c.arc(handR[0], handR[1], 12, 0, Math.PI * 2);
  c.fill();
  if (p.propHand !== "L") drawProp(c, p, handR[0], handR[1], handR[2]);
  c.restore();
  // goo coverage from the feet up (only where the character is drawn)
  if (p.goo && p.goo > 0) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    const top = 980 - p.goo * 900;
    c.fillStyle = "#5a2a10";
    c.beginPath();
    c.moveTo(0, 1000);
    c.lineTo(0, top);
    for (let x = 0; x <= BW; x += 30) c.lineTo(x, top + Math.sin(x * 0.05 + (p.seed ?? 0)) * 10 + ((x / 30) % 2) * 6);
    c.lineTo(BW, 1000);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,180,90,0.35)";
    c.fillRect(80, top + 6, 440, 6);
    c.restore();
  }
};

/** Camera-facing 2D bean card in the 3D world; drawn fresh per frame (reusing a texture left cards blank in video renders). */
export const BeanCard: React.FC<{ position: Vec3; height?: number; params: BeanParams; flip?: boolean; roll?: number; shadow?: boolean; tint?: string; faceCam?: boolean; yaw?: number }> = ({ position, height = 2.0, params, flip = false, roll = 0, shadow = true, tint = "#fff1e0", faceCam = true, yaw = 0 }) => {
  const frameNo = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const { cv, tex, buf } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = BW;
    cv.height = BH;
    const buf = new Uint8Array(BW * BH * 4);
    const tex = new THREE.DataTexture(buf, BW, BH, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    return { cv, tex, buf };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameNo]);
  useEffect(() => () => tex.dispose(), [tex]);
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  drawBean(ctx, params);
  buf.set(ctx.getImageData(0, 0, BW, BH).data);
  tex.needsUpdate = true;
  const w = (height * BW) / BH;
  const face = faceCam ? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]) : yaw;
  return (
    <group position={position} rotation={[0, face, 0]}>
      <group rotation={[0, 0, roll]}>
        <mesh position={[0, height / 2 - height * 0.025, 0]} scale={[flip ? -1 : 1, 1, 1]}>
          <planeGeometry args={[w, height]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} color={tint} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {shadow && (
        <mesh position={[0.1, 0.015, 0.05]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.4, 1]}>
          <circleGeometry args={[0.55 * (height / 2.0), 20]} />
          <meshBasicMaterial color="#1a1030" transparent opacity={0.38} />
        </mesh>
      )}
    </group>
  );
};

/** simple walk cycle poses for BeanParams */
export const beanWalk = (phase: number, amp = 1): Partial<BeanParams> => {
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  return {
    legL: [28 * s * amp, Math.max(0, -c) * 28 * amp],
    legR: [-28 * s * amp, Math.max(0, c) * 28 * amp],
    armL: [-22 * s * amp, -10],
    armR: [22 * s * amp, -10],
    bob: Math.abs(s) * 8 * amp,
    lean: 3 * amp,
  };
};

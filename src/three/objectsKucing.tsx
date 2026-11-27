/**
 * Karakter 2D ekstra-ekspresif (gaya Rudal Merpati 1944, di-upgrade!) & Properti 3D animasi
 * untuk "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)":
 *   - AgentBeanCard : Dodi, Ara, Pak Direktur CIA, Diplomat (dengan kacamata hitam melorot,
 *                     earpiece/headset, urat marah, keringat melayang, kilau mata, squash-stretch)
 *   - CatCard       : Agen Meong (kucing oren mata-mata dengan 8 ekspresi, rompi pemancar,
 *                     antena ekor bergetar + lampu merah kedip, ikan di mulut, gerak lari)
 *   - CatXray3D     : Hologram X-Ray 3D Kucing di atas grid biru dengan cincin sinyal radio
 *   - SignalWaveArcs, GrilledFishSmoke, FloatingDollarRain
 */
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { BH, BW, BeanExpr, BeanParams, drawBean } from "./objectsBean";
import { xrayMat } from "./toon";

type Vec3 = [number, number, number];
const INKC = "#221720";

export type ComicFx = "none" | "shock" | "anger" | "question" | "sparkle" | "dizzy" | "sweat";

export type AgentExtra = {
  shades?: boolean;       // CIA black sunglasses
  shadesSlip?: number;    // 0 = cool on eyes, 1 = slid dramatically down nose!
  earpiece?: boolean;     // coiled black CIA spy earpiece cord
  fishBox?: boolean;      // Ara's secret grilled fish lunchbox in hand
  fx?: ComicFx;           // animated comic emotion overlay above head
  fxPhase?: number;       // animation time in seconds
  facing?: 1 | -1;        // card facing direction so text props never mirror
};

/** Draw upgraded CIA spy overlays + ultra-expressive comic FX on top of BeanCard canvas. */
export const drawAgentBean = (c: CanvasRenderingContext2D, p: BeanParams, ex: AgentExtra = {}) => {
  drawBean(c, p);
  const t = ex.fxPhase ?? 0;
  const bob = p.bob ?? 0;
  const tilt = ((p.headTilt ?? 0) * Math.PI) / 180;
  const hx = 300;
  const hy = 242 + bob;

  c.save();
  c.translate(hx, hy);
  c.rotate(tilt);

  // 1. Coiled CIA spy earpiece on left ear
  if (ex.earpiece) {
    c.strokeStyle = "#19191f";
    c.lineWidth = 6;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-108, 12);
    for (let i = 0; i < 6; i++) {
      const yy = 18 + i * 16;
      c.quadraticCurveTo(-124 + (i % 2 ? 12 : -8), yy + 6, -104, yy + 14);
    }
    c.stroke();
    c.fillStyle = "#2b303a";
    c.beginPath();
    c.arc(-108, 10, 10, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // 2. Glossy CIA Aviator Sunglasses (with comedic slide-down-nose animation!)
  if (ex.shades) {
    const slip = ex.shadesSlip ?? 0;
    const gy = -8 + slip * 36;
    const rot = slip * 0.09 * Math.sin(t * 14);
    c.save();
    c.translate(0, gy);
    c.rotate(rot);
    // Bridge & temples
    c.strokeStyle = "#141418";
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(-98, -10);
    c.lineTo(98, -10);
    c.stroke();
    // Left & right dark lenses
    for (const sx of [-48, 48]) {
      c.beginPath();
      c.roundRect(sx - 38, -22, 76, 46, [10, 10, 22, 22]);
      c.fillStyle = "#161a24";
      c.fill();
      c.lineWidth = 6;
      c.strokeStyle = "#0e0e12";
      c.stroke();
      // Diagonal glossy reflection stripe
      c.strokeStyle = "rgba(255,255,255,0.55)";
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(sx - 20, 12);
      c.lineTo(sx + 6, -14);
      c.stroke();
      c.lineWidth = 3.5;
      c.beginPath();
      c.moveTo(sx - 4, 14);
      c.lineTo(sx + 18, -8);
      c.stroke();
    }
    c.restore();
  }

  // 3. Animated Comic Emotion FX around head!
  const fx = ex.fx ?? "none";
  const pulse = 1 + 0.14 * Math.sin(t * 14);
  if (fx === "shock") {
    // Bold red/yellow twin exclamation marks + flying sweat drops!
    c.save();
    c.translate(128, -96);
    c.scale(pulse, pulse);
    c.rotate(0.18);
    c.font = "900 72px sans-serif";
    c.lineWidth = 12;
    c.strokeStyle = INKC;
    c.strokeText("!!", 0, 0);
    c.fillStyle = "#ffde3b";
    c.fillText("!!", 0, 0);
    c.restore();
    // Flying blue sweat drops
    for (let i = 0; i < 3; i++) {
      const k = (t * 2.4 + i * 0.35) % 1;
      const sx = -125 - k * 42;
      const sy = -55 - i * 24 + k * 28;
      c.fillStyle = "#62dcff";
      c.strokeStyle = INKC;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(sx, sy, 12 * (1 - k * 0.3), 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  } else if (fx === "anger") {
    // Classic anime throbbing red cross-vein + steam puffs!
    c.save();
    c.translate(92, -88);
    c.scale(pulse, pulse);
    c.strokeStyle = "#e62e2d";
    c.lineWidth = 10;
    c.lineCap = "round";
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.beginPath();
      c.moveTo(dx * 24, dy * 6);
      c.quadraticCurveTo(dx * 6, dy * 6, dx * 6, dy * 24);
      c.stroke();
    }
    c.restore();
    // Steam puff from ears
    for (const side of [-1, 1]) {
      const k = (t * 2.1 + (side > 0 ? 0.5 : 0)) % 1;
      c.save();
      c.globalAlpha = 1 - k;
      c.fillStyle = "#fff4ee";
      c.strokeStyle = INKC;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(side * (128 + k * 45), -10 - k * 35, 18 + k * 14, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();
    }
  } else if (fx === "question") {
    c.save();
    c.translate(120, -104 + Math.sin(t * 8) * 10);
    c.rotate(Math.sin(t * 6) * 0.14);
    c.font = "900 78px sans-serif";
    c.lineWidth = 12;
    c.strokeStyle = INKC;
    c.strokeText("?", 0, 0);
    c.fillStyle = "#ff78c4";
    c.fillText("?", 0, 0);
    c.restore();
  } else if (fx === "sparkle") {
    const drawStar = (x: number, y: number, r: number) => {
      c.save();
      c.translate(x, y);
      c.fillStyle = "#ffe552";
      c.strokeStyle = INKC;
      c.lineWidth = 4;
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rad = i % 2 === 0 ? r : r * 0.32;
        if (i === 0) c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    };
    drawStar(132, -88, 22 * pulse);
    drawStar(-136, -68, 16 * (2 - pulse));
  } else if (fx === "sweat") {
    const sy = -42 + ((t * 50) % 28);
    c.fillStyle = "#62dcff";
    c.strokeStyle = INKC;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(106, sy - 22);
    c.quadraticCurveTo(122, sy + 4, 106, sy + 14);
    c.quadraticCurveTo(90, sy + 4, 106, sy - 22);
    c.fill();
    c.stroke();
  } else if (fx === "dizzy") {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * Math.PI * 2) / 3;
      const sx = Math.cos(a) * 86;
      const sy = -134 + Math.sin(a) * 18;
      c.fillStyle = "#ffd942";
      c.strokeStyle = INKC;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(sx, sy, 12, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  }

  c.restore();

  // 4. Optional secret grilled fish box carried by Ara
  if (ex.fishBox) {
    c.save();
    c.translate(425, 535 + bob);
    c.rotate(-0.1);
    c.fillStyle = "#e8c48c";
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.beginPath();
    c.roundRect(-55, -45, 110, 90, 12);
    c.fill();
    c.stroke();
    // Red stripe + crisp un-mirrored IKAN text
    c.fillStyle = "#d93b32";
    c.fillRect(-46, -12, 92, 34);
    if (ex.facing === -1) c.scale(-1, 1);
    c.fillStyle = "#fff6e0";
    c.font = "900 22px sans-serif";
    c.textAlign = "center";
    c.fillText("IKAN", 0, 12);
    c.restore();
  }
};

export const AgentBeanCard: React.FC<{
  position: Vec3;
  height?: number;
  facing?: 1 | -1;
  params: BeanParams;
  extra?: AgentExtra;
  yaw?: number;
}> = ({ position, height = 1.68, facing = 1, params, extra, yaw }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const { canvas, tex } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = BW;
    cv.height = BH;
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: cv, tex: t };
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, BW, BH);
    drawAgentBean(ctx, params, { ...extra, facing, fxPhase: frame / 30 });
    tex.needsUpdate = true;
  }

  const autoYaw = yaw ?? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]);
  const w = height * (BW / BH);
  const sq = params.squash ?? 0;
  return (
    <group position={position} rotation={[0, autoYaw, 0]} scale={[facing * (1 - sq), 1 + sq, 1]}>
      <mesh position={[0, height * 0.5, 0]}>
        <planeGeometry args={[w, height]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/* =================== AGEN MEONG (2D SUPER-EXPRESSIVE SPY CAT!) =================== */
export type CatExpr = "cuek" | "fokus" | "lapar" | "ngantuk" | "lari" | "makan" | "smug" | "kaget";

export type CatDrawOpts = {
  expr?: CatExpr;
  t?: number;
  shades?: boolean;
  shadesSlip?: number;
  antenna?: boolean;
  vest?: boolean;
  fishInMouth?: boolean;
  runCycle?: number; // 0 = sitting/standing, >0 = sprint animation phase
};

export const drawSpyCat = (c: CanvasRenderingContext2D, opts: CatDrawOpts = {}) => {
  const {
    expr = "cuek",
    t = 0,
    shades = false,
    shadesSlip = 0,
    antenna = true,
    vest = true,
    fishInMouth = false,
    runCycle = 0,
  } = opts;

  const W = 520;
  const H = 440;
  c.clearRect(0, 0, W, H);
  const bob = runCycle > 0 ? Math.abs(Math.sin(runCycle * 14)) * -22 : Math.sin(t * 4) * 5;

  c.save();
  c.translate(W / 2, H * 0.62 + bob);

  // 1. Wagging Tail + Spy Wire Antenna with Blinking Red Radio LED!
  const wag = Math.sin(t * (runCycle > 0 ? 16 : 5.5)) * 22;
  c.lineCap = "round";
  c.lineJoin = "round";
  // Orange tail outline + fill
  c.strokeStyle = INKC;
  c.lineWidth = 34;
  c.beginPath();
  c.moveTo(-78, 22);
  c.bezierCurveTo(-155, 10, -175 + wag * 0.5, -85, -135 + wag, -135);
  c.stroke();
  c.strokeStyle = "#f29b38";
  c.lineWidth = 20;
  c.stroke();

  if (antenna) {
    // Silver spy wire antenna extending straight up from tail tip!
    const tx = -135 + wag;
    const ty = -135;
    c.strokeStyle = "#2b3038";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(tx, ty);
    c.lineTo(tx + wag * 0.25, ty - 68);
    c.stroke();
    // Blinking red radio tip + tiny signal rings!
    const ledOn = Math.sin(t * 10) > -0.2;
    const ax = tx + wag * 0.25;
    const ay = ty - 72;
    if (ledOn) {
      c.strokeStyle = "rgba(255, 65, 54, 0.55)";
      c.lineWidth = 4;
      c.beginPath();
      c.arc(ax, ay, 16 + ((t * 28) % 18), 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = ledOn ? "#ff3b30" : "#802020";
    c.strokeStyle = INKC;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(ax, ay, 9, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // 2. Legs (sitting vs sprinting!)
  const legSwing = runCycle > 0 ? Math.sin(runCycle * 14) * 34 : 0;
  const drawLeg = (x: number, y: number, swing: number, col: string) => {
    c.save();
    c.translate(x, y);
    c.rotate((swing * Math.PI) / 180);
    c.fillStyle = col;
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.beginPath();
    c.roundRect(-16, 0, 32, 62, 14);
    c.fill();
    c.stroke();
    // Cute white paw
    c.fillStyle = "#fff7eb";
    c.beginPath();
    c.ellipse(4, 58, 19, 12, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  };
  drawLeg(-56, 42, -legSwing, "#d97e24");
  drawLeg(44, 42, legSwing, "#d97e24");

  // 3. Plump Orange Tabby Body
  c.fillStyle = "#f29b38";
  c.strokeStyle = INKC;
  c.lineWidth = 8;
  c.beginPath();
  c.ellipse(-6, 18, 92, 62, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // Cream belly patch
  c.fillStyle = "#fff2d9";
  c.beginPath();
  c.ellipse(14, 34, 52, 34, 0, 0, Math.PI * 2);
  c.fill();
  // Tabby stripes on back
  c.strokeStyle = "#b85d14";
  c.lineWidth = 9;
  for (const sx of [-42, -16, 10]) {
    c.beginPath();
    c.moveTo(sx, -38);
    c.lineTo(sx - 6, -12);
    c.stroke();
  }

  // 4. Mini Black CIA Spy Harness Vest + Glowing Green Chest Transmitter!
  if (vest) {
    c.fillStyle = "#222933";
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.beginPath();
    c.roundRect(-42, -38, 66, 86, 12);
    c.fill();
    c.stroke();
    // Gold CIA buckle & glowing transmitter LED
    c.fillStyle = "#f0c243";
    c.fillRect(-16, 14, 20, 14);
    c.fillStyle = "#45ff8a";
    c.beginPath();
    c.arc(-8, -8, 9, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // Front legs
  drawLeg(-28, 46, legSwing, "#f29b38");
  drawLeg(58, 46, -legSwing, "#f29b38");

  // 5. Big Expressive Cat Head!
  c.save();
  const headNod = expr === "makan" ? Math.sin(t * 18) * 0.08 : Math.sin(t * 3.5) * 0.03;
  c.translate(72, -46);
  c.rotate(headNod);

  // Pointed cat ears (with ear twitch!)
  const twitch = Math.sin(t * 9) > 0.9 ? 0.18 : 0;
  for (const [ex, er] of [[-46, -0.25 - twitch], [38, 0.25]]) {
    c.save();
    c.translate(ex, -46);
    c.rotate(er);
    c.fillStyle = "#f29b38";
    c.strokeStyle = INKC;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(-26, 22);
    c.lineTo(0, -34);
    c.lineTo(26, 22);
    c.closePath();
    c.fill();
    c.stroke();
    // Pink inner ear
    c.fillStyle = "#f5a5a5";
    c.beginPath();
    c.moveTo(-13, 14);
    c.lineTo(0, -16);
    c.lineTo(13, 14);
    c.closePath();
    c.fill();
    c.restore();
  }
  // Mini silver ear mic clipped on left ear!
  if (antenna) {
    c.fillStyle = "#b8c8d6";
    c.strokeStyle = INKC;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(-58, -42, 10, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // Round head base
  c.fillStyle = "#f29b38";
  c.strokeStyle = INKC;
  c.lineWidth = 8;
  c.beginPath();
  c.ellipse(0, 0, 74, 62, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // Cute white muzzle
  c.fillStyle = "#fff6e5";
  c.beginPath();
  c.ellipse(10, 20, 40, 26, 0, 0, Math.PI * 2);
  c.fill();
  // Forehead M tabby stripes
  c.strokeStyle = "#b85d14";
  c.lineWidth = 6;
  for (const fx of [-16, 0, 16]) {
    c.beginPath();
    c.moveTo(fx, -54);
    c.lineTo(fx, -32);
    c.stroke();
  }

  // 6. Cat Eyes by Expression!
  const drawEye = (ex: number, ey: number) => {
    if (expr === "ngantuk" || expr === "makan") {
      c.strokeStyle = INKC;
      c.lineWidth = 7;
      c.beginPath();
      if (expr === "makan") {
        c.arc(ex, ey + 4, 14, Math.PI * 1.1, Math.PI * 1.9);
      } else {
        c.moveTo(ex - 16, ey);
        c.lineTo(ex + 16, ey);
      }
      c.stroke();
      return;
    }
    const r = expr === "kaget" || expr === "lapar" ? 19 : 16;
    c.fillStyle = expr === "lapar" ? "#fff9c4" : "#ffffff";
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(ex, ey, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    if (expr === "lapar") {
      // Huge starry golden eyes!
      c.fillStyle = "#171412";
      c.beginPath();
      c.arc(ex + 2, ey, 11, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffe552";
      c.beginPath();
      c.arc(ex - 3, ey - 4, 5, 0, Math.PI * 2);
      c.arc(ex + 5, ey + 4, 3, 0, Math.PI * 2);
      c.fill();
    } else {
      const pr = expr === "kaget" ? 5 : 9;
      c.fillStyle = "#171412";
      c.beginPath();
      c.arc(ex + 4, ey, pr, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(ex + 1, ey - 4, 3.5, 0, Math.PI * 2);
      c.fill();
    }
    // Half-closed bored eyelids for classic cat 'cuek' or 'smug'!
    if (expr === "cuek" || expr === "smug") {
      c.fillStyle = "#f29b38";
      c.beginPath();
      c.rect(ex - 20, ey - 22, 40, 20);
      c.fill();
      c.strokeStyle = INKC;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(ex - 18, ey - 2);
      c.lineTo(ex + 18, ey - 2);
      c.stroke();
    }
    if (expr === "fokus") {
      c.strokeStyle = INKC;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(ex - 18, ey - 16);
      c.lineTo(ex + 18, ey - 8);
      c.stroke();
    }
  };
  drawEye(-18, -10);
  drawEye(34, -10);

  // Cute pink triangle nose + cat mouth (w)
  c.fillStyle = "#f26d7d";
  c.strokeStyle = INKC;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(4, 8);
  c.lineTo(18, 8);
  c.lineTo(11, 17);
  c.closePath();
  c.fill();
  c.stroke();

  c.strokeStyle = INKC;
  c.lineWidth = 5;
  if (expr === "kaget" || expr === "lari") {
    c.fillStyle = "#d94e5a";
    c.beginPath();
    c.ellipse(11, 28, 12, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  } else {
    c.beginPath();
    c.arc(3, 22, 9, 0.1, Math.PI - 0.1);
    c.stroke();
    c.beginPath();
    c.arc(19, 22, 9, 0.1, Math.PI - 0.1);
    c.stroke();
  }

  // Drool drop for 'lapar'!
  if (expr === "lapar") {
    c.fillStyle = "#7ce4ff";
    c.strokeStyle = INKC;
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(24, 38 + Math.sin(t * 10) * 4, 6, 11, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // Grilled Fish in Mouth!
  if (fishInMouth || expr === "makan") {
    c.save();
    c.translate(38, 28);
    c.rotate(-0.18 + Math.sin(t * 18) * 0.12);
    c.fillStyle = "#8bb8d8";
    c.strokeStyle = INKC;
    c.lineWidth = 5;
    c.beginPath();
    c.ellipse(18, 0, 32, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(46, 0);
    c.lineTo(66, -14);
    c.lineTo(66, 14);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  // Whiskers
  c.strokeStyle = INKC;
  c.lineWidth = 4;
  for (const dy of [-4, 8]) {
    c.beginPath();
    c.moveTo(-46, 16 + dy);
    c.lineTo(-82, 12 + dy * 1.6);
    c.moveTo(54, 16 + dy);
    c.lineTo(88, 12 + dy * 1.6);
    c.stroke();
  }

  // Optional Cool Agent Cat Sunglasses!
  if (shades) {
    c.save();
    c.translate(8, -10 + shadesSlip * 26);
    for (const sx of [-26, 26]) {
      c.fillStyle = "#151822";
      c.strokeStyle = INKC;
      c.lineWidth = 5;
      c.beginPath();
      c.roundRect(sx - 22, -13, 44, 28, [6, 6, 14, 14]);
      c.fill();
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,0.6)";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(sx - 10, 8);
      c.lineTo(sx + 6, -7);
      c.stroke();
    }
    c.restore();
  }

  // Zzz for ngantuk
  if (expr === "ngantuk") {
    c.font = "900 34px sans-serif";
    c.strokeStyle = INKC;
    c.lineWidth = 6;
    c.strokeText("Zzz", 52, -58 + Math.sin(t * 4) * 8);
    c.fillStyle = "#8ce0ff";
    c.fillText("Zzz", 52, -58 + Math.sin(t * 4) * 8);
  }

  c.restore(); // end head
  c.restore();
};

export const CatCard: React.FC<{
  position: Vec3;
  height?: number;
  facing?: 1 | -1;
  opts?: CatDrawOpts;
  yaw?: number;
}> = ({ position, height = 0.72, facing = 1, opts, yaw }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const { canvas, tex } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 520;
    cv.height = 440;
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: cv, tex: t };
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);

  const ctx = canvas.getContext("2d");
  if (ctx) {
    drawSpyCat(ctx, { ...opts, t: frame / 30 });
    tex.needsUpdate = true;
  }
  const autoYaw = yaw ?? Math.atan2(camera.position.x - position[0], camera.position.z - position[2]);
  const w = height * (520 / 440);
  return (
    <group position={position} rotation={[0, autoYaw, 0]} scale={[facing, 1, 1]}>
      <mesh position={[0, height * 0.5, 0]}>
        <planeGeometry args={[w, height]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/* =================== 3D X-RAY HOLOGRAM CAT CUTAWAY =================== */
export const CatXray3D: React.FC<{ position?: Vec3; phase?: number }> = ({ position = [0, 1.0, 0], phase = 0 }) => {
  const matCyan = useMemo(() => xrayMat("#53dcff", 0.16), []);
  const pulse = 1 + 0.18 * Math.sin(phase * 8);

  return (
    <group position={position} rotation={[0, phase * 0.65, 0]}>
      {/* Translucent X-Ray 3D Cat Silhouette */}
      <mesh position={[0, 0, 0]} scale={[0.92, 0.58, 0.52]} material={matCyan}>
        <sphereGeometry args={[0.62, 24, 18]} />
      </mesh>
      <mesh position={[0.62, 0.34, 0]} scale={[0.46, 0.42, 0.42]} material={matCyan}>
        <sphereGeometry args={[0.8, 22, 16]} />
      </mesh>
      {/* Ears */}
      {[-0.18, 0.18].map((ez, i) => (
        <mesh key={i} position={[0.60, 0.72, ez]} rotation={[ez * 0.8, 0, -0.15]} material={matCyan}>
          <coneGeometry args={[0.14, 0.32, 12]} />
        </mesh>
      ))}
      {/* Tail */}
      <mesh position={[-0.78, 0.32, 0]} rotation={[0, 0, 0.55]} material={matCyan}>
        <cylinderGeometry args={[0.06, 0.08, 0.88, 12]} />
      </mesh>

      {/* 1. Glowing Ear Microphone Implant (Yellow-Gold) */}
      <mesh position={[0.58, 0.56, 0.16]} scale={[pulse, pulse, pulse]}>
        <sphereGeometry args={[0.085, 16, 12]} />
        <meshBasicMaterial color="#ffe047" />
      </mesh>

      {/* 2. Glowing Chest Radio Transmitter & Battery Pack (Red/Green) */}
      <mesh position={[0.18, 0.02, 0]}>
        <boxGeometry args={[0.28, 0.20, 0.22]} />
        <meshBasicMaterial color="#ff4742" />
      </mesh>
      <mesh position={[-0.18, -0.05, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.24, 12]} />
        <meshBasicMaterial color="#4cff91" />
      </mesh>

      {/* 3. Internal Wire Spine -> Tail Antenna -> Expanding Radio Rings! */}
      <mesh position={[-0.25, 0.14, 0]} rotation={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.02, 0.02, 1.05, 8]} />
        <meshBasicMaterial color="#ff9d2e" />
      </mesh>
      <mesh position={[-0.95, 0.82, 0]} rotation={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.018, 0.018, 0.65, 8]} />
        <meshBasicMaterial color="#ff4742" />
      </mesh>
      {[0, 1, 2].map((k) => {
        const s = 0.25 + ((phase * 1.4 + k * 0.33) % 1) * 1.1;
        const op = 1 - ((phase * 1.4 + k * 0.33) % 1);
        return (
          <mesh key={k} position={[-1.02, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[s, s, s]}>
            <torusGeometry args={[0.45, 0.025, 8, 28]} />
            <meshBasicMaterial color="#58f5ff" transparent opacity={op * 0.85} />
          </mesh>
        );
      })}
    </group>
  );
};

/* =================== 3D ANIMATED EFFECTS: SMOKE, DOLLARS, RADIO ARCS =================== */
export const GrilledFishSmoke: React.FC<{ position: Vec3; phase: number }> = ({ position, phase }) => (
  <group position={position}>
    {[0, 1, 2, 3, 4].map((i) => {
      const k = (phase * 0.65 + i * 0.2) % 1;
      const y = k * 1.35;
      const x = Math.sin(phase * 3 + i * 1.7) * 0.18;
      const r = 0.14 + k * 0.22;
      return (
        <mesh key={i} position={[x, y, 0]} scale={[r, r * 0.85, r]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#fff3dc" transparent opacity={(1 - k) * 0.55} />
        </mesh>
      );
    })}
  </group>
);

export const FloatingDollarRain: React.FC<{ center: Vec3; phase: number }> = ({ center, phase }) => (
  <group position={center}>
    {Array.from({ length: 14 }).map((_, i) => {
      const seed = i * 1.37;
      const k = (phase * 0.45 + (i % 7) * 0.14) % 1;
      const x = Math.sin(seed * 4 + phase * 2.2) * 1.8;
      const y = 2.4 - k * 2.5;
      const z = Math.cos(seed * 3) * 0.9;
      return (
        <mesh key={i} position={[x, y, z]} rotation={[phase * 2 + seed, phase * 3 + i, Math.sin(phase * 4 + i) * 0.5]}>
          <boxGeometry args={[0.32, 0.16, 0.012]} />
          <meshStandardMaterial color="#4eb862" roughness={0.6} />
        </mesh>
      );
    })}
  </group>
);

export const SignalWaveArcs: React.FC<{ from: Vec3; color?: string; phase: number }> = ({
  from,
  color = "#4cff91",
  phase,
}) => (
  <group position={from}>
    {[0, 1, 2].map((i) => {
      const k = (phase * 1.8 + i * 0.33) % 1;
      const r = 0.18 + k * 1.25;
      return (
        <mesh key={i} position={[0, k * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[r, r, r]}>
          <torusGeometry args={[0.45, 0.03, 8, 24]} />
          <meshBasicMaterial color={color} transparent opacity={(1 - k) * 0.9} />
        </mesh>
      );
    })}
  </group>
);

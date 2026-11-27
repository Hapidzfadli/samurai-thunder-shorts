/**
 * 2D Articulated Character Rig for Zhuge Liang: Strategi Kota Kosong (Samkok).
 * 2-segment arms/legs, walk/run cycle, breathing, blinks, pupil gaze,
 * dynamic facial expressions, and real-time lip-sync for EVERY speaking character.
 */
import * as THREE from 'three';

export type ZhugeRole =
  | 'zhuge'
  | 'simayi'
  | 'simazhao'
  | 'pengintai'
  | 'perwira'
  | 'penyapu'
  | 'pelayan'
  | 'warga'
  | 'wei_soldier';

export type ZhugeExpr =
  | 'calm'
  | 'smile'
  | 'command'
  | 'suspicious'
  | 'angry'
  | 'shock'
  | 'panic'
  | 'eager'
  | 'relieved'
  | 'neutral';

export interface ZhugeCharPose {
  role: ZhugeRole;
  seed?: number;
  variant?: number;
  expr?: ZhugeExpr;
  mouthOpen?: number; // 0..1
  armL?: [number, number];
  armR?: [number, number];
  walkPhase?: number;
  walkAmp?: number;
  lean?: number;
  headTilt?: number;
  gazeX?: number;
  blink?: boolean;
  breathe?: number;
  sweat?: boolean;
  sitting?: boolean; // for Zhuge Liang playing Guqin atop the gate tower!
}

interface Palette {
  robe: string;
  robeDark: string;
  trim: string;
  sash: string;
  accent: string;
  skin: string;
  hair: string;
  hat: 'guan' | 'wei_gen' | 'wei_young' | 'conical' | 'shu_cap' | 'boy_buns' | 'wei_helm' | 'civilian';
  armor?: boolean;
  cape?: string;
  beard?: 'scholar' | 'general' | 'old';
}

const WARGA_ROBES = [
  { robe: '#8e7d68', dark: '#6d5e4c', trim: '#dfd4be', sash: '#5a4a3a' },
  { robe: '#72807a', dark: '#54615b', trim: '#e2d9c5', sash: '#7c5a44' },
  { robe: '#8c6d63', dark: '#6b5148', trim: '#e6dcc9', sash: '#4f5d52' },
];

function paletteOf(role: ZhugeRole, variant = 0): Palette {
  switch (role) {
    case 'zhuge':
      return {
        robe: '#efe9d8',
        robeDark: '#d5cbb4',
        trim: '#526b82',
        sash: '#3c5368',
        accent: '#d8b464',
        skin: '#f2d3b0',
        hair: '#222124',
        hat: 'guan',
        beard: 'scholar',
      };
    case 'simayi':
      return {
        robe: '#2d2d33',
        robeDark: '#1c1c21',
        trim: '#d6ac54',
        sash: '#8c2626',
        accent: '#e2bd66',
        skin: '#eac49b',
        hair: '#252326',
        hat: 'wei_gen',
        armor: true,
        cape: '#6b1d1f',
        beard: 'general',
      };
    case 'simazhao':
      return {
        robe: '#4a3228',
        robeDark: '#332018',
        trim: '#cfa052',
        sash: '#9c2d27',
        accent: '#e3b860',
        skin: '#eec89f',
        hair: '#1f1c1b',
        hat: 'wei_young',
        armor: true,
        cape: '#8a2824',
      };
    case 'pengintai':
      return {
        robe: '#8e6f4c',
        robeDark: '#6b5236',
        trim: '#e0d3b6',
        sash: '#46382b',
        accent: '#b4945e',
        skin: '#ecc69c',
        hair: '#241e1b',
        hat: 'shu_cap',
      };
    case 'perwira':
      return {
        robe: '#3f5a4b',
        robeDark: '#2c4135',
        trim: '#d9c598',
        sash: '#6b482e',
        accent: '#cfa85c',
        skin: '#ecc79e',
        hair: '#231e1c',
        hat: 'shu_cap',
        armor: true,
      };
    case 'penyapu':
      return {
        robe: '#888270',
        robeDark: '#696353',
        trim: '#d6ccb4',
        sash: '#544a3d',
        accent: '#9c8b68',
        skin: '#e5be96',
        hair: '#c8c4bc',
        hat: 'conical',
        beard: 'old',
      };
    case 'pelayan':
      return {
        robe: '#6e8ea8',
        robeDark: '#516d84',
        trim: '#f0e7d4',
        sash: '#c8a662',
        accent: '#f0d796',
        skin: '#f4d8ba',
        hair: '#211d1c',
        hat: 'boy_buns',
      };
    case 'wei_soldier':
      return {
        robe: '#35353c',
        robeDark: '#222228',
        trim: '#8d2b28',
        sash: '#6e2321',
        accent: '#c29b4d',
        skin: '#e6bf96',
        hair: '#1d1c1d',
        hat: 'wei_helm',
        armor: true,
      };
    default: {
      const v = WARGA_ROBES[Math.abs(variant) % WARGA_ROBES.length];
      return {
        robe: v.robe,
        robeDark: v.dark,
        trim: v.trim,
        sash: v.sash,
        accent: v.trim,
        skin: '#f1d0ab',
        hair: '#231d1c',
        hat: 'civilian',
      };
    }
  }
}

const W = 512;
const H = 1024;
const CX = W / 2;
const INK = '#221c19';
const DEG = Math.PI / 180;

const HIP_Y = 665;
const SHOULDER_Y = 435;
const NECK_Y = 390;
const HEAD_Y = 278;
const HEAD_RX = 90;
const HEAD_RY = 85;
const SHOULDER_DX = 64;
const UPPER_ARM = 112;
const FORE_ARM = 104;

function drawArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  upperDeg: number,
  foreDeg: number,
  pal: Palette,
  side: -1 | 1,
) {
  const a1 = (90 - side * upperDeg) * DEG;
  const ex = sx + Math.cos(a1) * UPPER_ARM;
  const ey = sy + Math.sin(a1) * UPPER_ARM;
  const a2 = a1 - side * foreDeg * DEG;
  const hx = ex + Math.cos(a2) * FORE_ARM;
  const hy = ey + Math.sin(a2) * FORE_ARM;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Wide flowing robe sleeve (wider for Zhuge Liang)
  const sw = pal.hat === 'guan' ? 48 : 42;
  ctx.strokeStyle = INK;
  ctx.lineWidth = sw;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx - Math.cos(a2) * 14, hy - Math.sin(a2) * 14);
  ctx.stroke();

  ctx.strokeStyle = pal.robe;
  ctx.lineWidth = sw - 12;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx - Math.cos(a2) * 14, hy - Math.sin(a2) * 14);
  ctx.stroke();

  // Cuff trim
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = sw - 10;
  ctx.beginPath();
  ctx.moveTo(hx - Math.cos(a2) * 28, hy - Math.sin(a2) * 28);
  ctx.lineTo(hx - Math.cos(a2) * 12, hy - Math.sin(a2) * 12);
  ctx.stroke();

  // Hand
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(hx, hy, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawZhugeChar(ctx: CanvasRenderingContext2D, pose: ZhugeCharPose) {
  ctx.clearRect(0, 0, W, H);
  const pal = paletteOf(pose.role, pose.variant ?? pose.seed ?? 0);
  const expr = pose.expr ?? 'neutral';
  const mouth = Math.max(0, Math.min(1, pose.mouthOpen ?? 0));
  const breathe = (pose.breathe ?? 0) * 5;
  const walkAmp = pose.sitting ? 0 : (pose.walkAmp ?? 0);
  const wp = pose.walkPhase ?? 0;
  const stride = Math.sin(wp) * 34 * walkAmp;
  const liftL = Math.max(0, Math.cos(wp)) * 22 * walkAmp;
  const liftR = Math.max(0, -Math.cos(wp)) * 22 * walkAmp;
  const bob = Math.abs(Math.sin(wp)) * 12 * walkAmp;

  // Ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(24, 18, 13, 0.28)';
  ctx.beginPath();
  ctx.ellipse(CX, 982, 95, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(CX, HIP_Y - bob + (pose.sitting ? 85 : 0));
  ctx.rotate((pose.lean ?? 0) * DEG);
  ctx.translate(-CX, -HIP_Y);

  // Flowing general cape behind shoulders (Sima Yi / Sima Zhao)
  if (pal.cape) {
    ctx.save();
    ctx.fillStyle = pal.cape;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(CX - 76, SHOULDER_Y + breathe);
    ctx.lineTo(CX + 76, SHOULDER_Y + breathe);
    ctx.lineTo(CX + 124, 905);
    ctx.quadraticCurveTo(CX, 926, CX - 124, 905);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Legs (hidden if sitting behind Guqin table)
  if (!pose.sitting) {
    const drawLeg = (lx: number, dx: number, lift: number) => {
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      const fx = lx + dx;
      const fy = 968 - lift;
      ctx.beginPath();
      ctx.moveTo(lx, 870);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = '#26201c';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(fx - 18, fy + 6);
      ctx.lineTo(fx + 32, fy + 6);
      ctx.quadraticCurveTo(fx + 44, fy - 10, fx + 26, fy - 7);
      ctx.lineTo(fx - 18, fy - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    drawLeg(CX - 34, -stride, liftL);
    drawLeg(CX + 34, stride, liftR);
  }

  // Back arm (left)
  const armL = pose.armL ?? [16, -8];
  const armR = pose.armR ?? [20, 12];
  drawArm(ctx, CX - SHOULDER_DX, SHOULDER_Y + breathe, armL[0], armL[1], pal, -1);

  // Robe / Armor Torso
  ctx.save();
  ctx.fillStyle = pal.robe;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(CX - 68, SHOULDER_Y - 10 + breathe);
  ctx.quadraticCurveTo(CX, SHOULDER_Y - 26 + breathe, CX + 68, SHOULDER_Y - 10 + breathe);
  ctx.lineTo(CX + 98, 895);
  ctx.quadraticCurveTo(CX, 912, CX - 98, 895);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shading panel
  ctx.fillStyle = pal.robeDark;
  ctx.beginPath();
  ctx.moveTo(CX + 26, SHOULDER_Y + breathe);
  ctx.lineTo(CX + 64, SHOULDER_Y - 6 + breathe);
  ctx.lineTo(CX + 94, 892);
  ctx.lineTo(CX + 48, 900);
  ctx.closePath();
  ctx.fill();

  // Crossed Han collar
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(CX + 34, NECK_Y + 24 + breathe);
  ctx.lineTo(CX - 18, SHOULDER_Y + 132 + breathe);
  ctx.moveTo(CX - 34, NECK_Y + 24 + breathe);
  ctx.lineTo(CX + 36, SHOULDER_Y + 150 + breathe);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(CX - 43, NECK_Y + 24 + breathe);
  ctx.lineTo(CX + 30, SHOULDER_Y + 156 + breathe);
  ctx.moveTo(CX + 43, NECK_Y + 24 + breathe);
  ctx.lineTo(CX - 22, SHOULDER_Y + 134 + breathe);
  ctx.stroke();

  // Ornate battle armor plates (Sima Yi, Sima Zhao, Perwira, Wei soldiers)
  if (pal.armor) {
    ctx.fillStyle = pal.robeDark;
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(CX - 58, SHOULDER_Y + 20 + breathe, 116, 140, 16);
    ctx.fill();
    ctx.stroke();
    // Lamellar armor horizontal bands
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 3.5;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(CX - 50, SHOULDER_Y + 50 + k * 28 + breathe);
      ctx.lineTo(CX + 50, SHOULDER_Y + 50 + k * 28 + breathe);
      ctx.stroke();
    }
    // Shoulder pauldrons
    ctx.fillStyle = pal.robe;
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(CX - 66, SHOULDER_Y + 14 + breathe, 28, 22, -0.3, 0, Math.PI * 2);
    ctx.ellipse(CX + 66, SHOULDER_Y + 14 + breathe, 28, 22, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Sash & belt
  ctx.fillStyle = pal.sash;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(CX - 78, 588 + breathe * 0.5, 156, 44, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.roundRect(CX - 22, 594 + breathe * 0.5, 44, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = pal.sash;
  ctx.beginPath();
  ctx.moveTo(CX - 16, 632);
  ctx.lineTo(CX + 16, 632);
  ctx.lineTo(CX + 22, 832);
  ctx.lineTo(CX - 22, 832);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hem trim
  ctx.fillStyle = pal.trim;
  ctx.fillRect(CX - 90, 868, 180, 18);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(CX - 90, 868, 180, 18);
  ctx.restore();

  // Front arm (right)
  drawArm(ctx, CX + SHOULDER_DX, SHOULDER_Y + breathe, armR[0], armR[1], pal, 1);

  // Head & Neck
  ctx.save();
  ctx.translate(CX, NECK_Y + breathe);
  ctx.rotate((pose.headTilt ?? 0) * DEG);
  ctx.translate(-CX, -NECK_Y);

  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(CX - 18, NECK_Y - 36, 36, 56, 10);
  ctx.fill();
  ctx.stroke();

  // Ears
  ctx.beginPath();
  ctx.ellipse(CX - HEAD_RX + 2, HEAD_Y + 6, 15, 21, 0, 0, Math.PI * 2);
  ctx.ellipse(CX + HEAD_RX - 2, HEAD_Y + 6, 15, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(CX, HEAD_Y, HEAD_RX, HEAD_RY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair cap
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.ellipse(CX, HEAD_Y - 22, HEAD_RX + 2, HEAD_RY - 12, 0, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(CX + 46, HEAD_Y - 42, CX, HEAD_Y - 46);
  ctx.quadraticCurveTo(CX - 46, HEAD_Y - 42, CX - HEAD_RX - 2, HEAD_Y - 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Headwear per role
  if (pal.hat === 'guan') {
    // Iconic Zhuge Liang dark blue-black scholar guan hat!
    ctx.fillStyle = '#2d3b4d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(CX - 54, HEAD_Y - 142, 108, 92, 18);
    ctx.fill();
    ctx.stroke();
    // Pleated vertical ribs
    ctx.strokeStyle = '#4c637d';
    ctx.lineWidth = 4;
    for (const rx of [-28, -10, 10, 28]) {
      ctx.beginPath();
      ctx.moveTo(CX + rx, HEAD_Y - 134);
      ctx.lineTo(CX + rx, HEAD_Y - 58);
      ctx.stroke();
    }
    ctx.fillStyle = '#d8b464';
    ctx.fillRect(CX - 58, HEAD_Y - 62, 116, 14);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(CX - 58, HEAD_Y - 62, 116, 14);
  } else if (pal.hat === 'wei_gen') {
    // Sima Yi golden general crown & topknot
    ctx.fillStyle = '#d6ac54';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(CX - 34, HEAD_Y - 126, 68, 56, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8c2626';
    ctx.fillRect(CX - 46, HEAD_Y - 102, 92, 12);
    ctx.strokeRect(CX - 46, HEAD_Y - 102, 92, 12);
  } else if (pal.hat === 'wei_young') {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.roundRect(CX - 30, HEAD_Y - 118, 60, 44, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#cfa052';
    ctx.fillRect(CX - 36, HEAD_Y - 94, 72, 14);
    ctx.strokeRect(CX - 36, HEAD_Y - 94, 72, 14);
  } else if (pal.hat === 'conical') {
    // Iconic bamboo conical hat (caping) for disguised elderly sweeper!
    ctx.fillStyle = '#c9a967';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(CX, HEAD_Y - 146);
    ctx.lineTo(CX + 136, HEAD_Y - 46);
    ctx.quadraticCurveTo(CX, HEAD_Y - 22, CX - 136, HEAD_Y - 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Bamboo weave ribs
    ctx.strokeStyle = '#997a3f';
    ctx.lineWidth = 3.5;
    for (const dx of [-85, -42, 0, 42, 85]) {
      ctx.beginPath();
      ctx.moveTo(CX, HEAD_Y - 140);
      ctx.lineTo(CX + dx, HEAD_Y - 42);
      ctx.stroke();
    }
  } else if (pal.hat === 'wei_helm') {
    ctx.fillStyle = '#2d2e34';
    ctx.beginPath();
    ctx.arc(CX, HEAD_Y - 30, HEAD_RX + 6, Math.PI * 1.02, Math.PI * 1.98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8d2b28';
    ctx.beginPath();
    ctx.moveTo(CX - 10, HEAD_Y - 122);
    ctx.lineTo(CX + 10, HEAD_Y - 122);
    ctx.lineTo(CX + 18, HEAD_Y - 156);
    ctx.lineTo(CX - 18, HEAD_Y - 156);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pal.hat === 'boy_buns') {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(CX - 54, HEAD_Y - 76, 26, 0, Math.PI * 2);
    ctx.arc(CX + 54, HEAD_Y - 76, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (pal.hat === 'shu_cap') {
    ctx.fillStyle = '#435847';
    ctx.beginPath();
    ctx.roundRect(CX - 46, HEAD_Y - 110, 92, 48, 12);
    ctx.fill();
    ctx.stroke();
  }

  // Eyes
  const eyeY = HEAD_Y - 4;
  const eyeDX = 35;
  const gx = (pose.gazeX ?? 0) * 6;
  if (pose.blink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 16, eyeY);
    ctx.lineTo(CX - eyeDX + 16, eyeY);
    ctx.moveTo(CX + eyeDX - 16, eyeY);
    ctx.lineTo(CX + eyeDX + 16, eyeY);
    ctx.stroke();
  } else if (expr === 'relieved' || expr === 'smile') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(CX - eyeDX, eyeY + 6, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX + eyeDX, eyeY + 6, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    const rEye = expr === 'shock' || expr === 'panic' ? 22 : expr === 'suspicious' ? 15 : 18;
    const rPupil = expr === 'shock' || expr === 'panic' ? 5.5 : 8;
    for (const s of [-1, 1]) {
      const ex = CX + s * eyeDX;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(ex, eyeY, rEye, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(ex + gx, eyeY, rPupil, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + gx - 3, eyeY - 3, 2.8, 0, Math.PI * 2);
      ctx.fill();
      // Narrow suspicious eyelids for Sima Yi!
      if (expr === 'suspicious') {
        ctx.fillStyle = pal.skin;
        ctx.fillRect(ex - 20, eyeY - 22, 40, 14);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ex - 18, eyeY - 8);
        ctx.lineTo(ex + 18, eyeY - 8);
        ctx.stroke();
      }
    }
  }

  // Eyebrows
  ctx.strokeStyle = pal.hair === '#c8c4bc' ? '#a8a298' : INK;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const browY = eyeY - 29;
  if (expr === 'command' || expr === 'angry' || expr === 'eager' || expr === 'suspicious') {
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 18, browY - 4);
    ctx.lineTo(CX - eyeDX + 18, browY + 10);
    ctx.moveTo(CX + eyeDX + 18, browY - 4);
    ctx.lineTo(CX + eyeDX - 18, browY + 10);
    ctx.stroke();
  } else if (expr === 'panic' || expr === 'shock') {
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 18, browY + 6);
    ctx.lineTo(CX - eyeDX + 16, browY - 10);
    ctx.moveTo(CX + eyeDX + 18, browY + 6);
    ctx.lineTo(CX + eyeDX - 16, browY - 10);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 16, browY);
    ctx.lineTo(CX - eyeDX + 16, browY);
    ctx.moveTo(CX + eyeDX - 16, browY);
    ctx.lineTo(CX + eyeDX + 16, browY);
    ctx.stroke();
  }

  // Neat strategist mustache / chin beard (leaves mouth 100% open & clear for lip-sync!)
  if (pal.beard) {
    ctx.strokeStyle = pal.hair;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(CX - 4, HEAD_Y + 24);
    ctx.quadraticCurveTo(CX - 26, HEAD_Y + 22, CX - 40, HEAD_Y + 34);
    ctx.moveTo(CX + 4, HEAD_Y + 24);
    ctx.quadraticCurveTo(CX + 26, HEAD_Y + 22, CX + 40, HEAD_Y + 34);
    ctx.stroke();
    // Pointed chin beard below mouth
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.moveTo(CX - 14, HEAD_Y + 72);
    ctx.lineTo(CX + 14, HEAD_Y + 72);
    ctx.lineTo(CX, HEAD_Y + (pal.beard === 'old' ? 112 : 102));
    ctx.closePath();
    ctx.fill();
  }

  // Mouth (lip-sync + emotion)
  const my = HEAD_Y + 44;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  if (mouth > 0.08 || expr === 'panic' || expr === 'shock') {
    const open = expr === 'panic' || expr === 'shock' ? Math.max(0.52, mouth) : mouth;
    const rw = expr === 'command' || expr === 'angry' || expr === 'panic' ? 23 : 19;
    const rh = Math.max(6, open * 22);
    ctx.fillStyle = '#7a2428';
    ctx.beginPath();
    ctx.ellipse(CX, my, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (open > 0.4) {
      ctx.fillStyle = '#fff9f0';
      ctx.fillRect(CX - rw * 0.62, my - rh + 3, rw * 1.24, Math.min(7, rh * 0.45));
    }
  } else if (expr === 'calm' || expr === 'smile' || expr === 'relieved') {
    ctx.beginPath();
    ctx.moveTo(CX - 18, my - 2);
    ctx.quadraticCurveTo(CX, my + 12, CX + 18, my - 2);
    ctx.stroke();
  } else if (expr === 'suspicious' || expr === 'angry') {
    ctx.beginPath();
    ctx.moveTo(CX - 18, my + 5);
    ctx.quadraticCurveTo(CX, my - 5, CX + 18, my + 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(CX - 18, my);
    ctx.lineTo(CX + 18, my);
    ctx.stroke();
  }

  // Sweat drop on panic/suspicion
  if (pose.sweat || expr === 'panic') {
    ctx.fillStyle = '#9be0ff';
    ctx.strokeStyle = '#3c6e85';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(CX + 66, HEAD_Y - 34);
    ctx.quadraticCurveTo(CX + 80, HEAD_Y - 12, CX + 66, HEAD_Y - 6);
    ctx.quadraticCurveTo(CX + 52, HEAD_Y - 12, CX + 66, HEAD_Y - 34);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore(); // head
  ctx.restore(); // torso
}

export function zhugeHandWorld(
  pose: ZhugeCharPose,
  side: 'L' | 'R',
  pos: [number, number, number],
  height: number,
  camPos: [number, number, number],
  fixedYaw?: number,
): [number, number, number] {
  const s = side === 'L' ? -1 : 1;
  const arm = (side === 'L' ? pose.armL : pose.armR) ?? (side === 'L' ? [16, -8] : [20, 12]);
  const a1 = (90 - s * arm[0]) * DEG;
  const a2 = a1 - s * arm[1] * DEG;
  const breathe = (pose.breathe ?? 0) * 5;
  const hx = CX + s * SHOULDER_DX + Math.cos(a1) * UPPER_ARM + Math.cos(a2) * FORE_ARM;
  const hy = SHOULDER_Y + breathe + Math.sin(a1) * UPPER_ARM + Math.sin(a2) * FORE_ARM;

  const worldW = height * (W / H);
  const localX = ((hx - CX) / W) * worldW;
  const localY = ((H - hy) / H) * height;
  const yaw = fixedYaw !== undefined ? fixedYaw : Math.atan2(camPos[0] - pos[0], camPos[2] - pos[2]);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return [pos[0] + localX * cos + 0.08 * sin, pos[1] + localY, pos[2] - localX * sin + 0.08 * cos];
}

export const ZHUGE_ASPECT = W / H;

export function makeZhugeTexture(): { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { canvas, tex };
}

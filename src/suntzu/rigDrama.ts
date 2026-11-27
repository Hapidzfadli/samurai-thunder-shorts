/**
 * 2D Articulated Character Rig for Sun Tzu: Latihan Istana (Full Dramatic Version).
 * 2-segment arms/legs, walk/run cycle, breathing, blinks, pupil gaze,
 * expressive emotions (smug, command, cold, laugh, shock, panic, fear, sad),
 * and real-time lip-sync for EVERY speaking character.
 */
import * as THREE from 'three';

export type DramaRole =
  | 'raja'
  | 'suntzu'
  | 'selir_a'
  | 'selir_b'
  | 'utusan'
  | 'pengawal'
  | 'pasukan'
  | 'pengganti_a'
  | 'pengganti_b';

export type DramaExpr =
  | 'neutral'
  | 'smug'
  | 'command'
  | 'cold'
  | 'laugh'
  | 'shock'
  | 'panic'
  | 'fear'
  | 'sad';

export interface DramaCharPose {
  role: DramaRole;
  seed?: number;
  variant?: number; // robe color variation for pasukan (0..3)
  expr?: DramaExpr;
  mouthOpen?: number; // 0..1
  armL?: [number, number]; // [upperDeg, foreDeg]
  armR?: [number, number];
  walkPhase?: number; // radians; if walkAmp > 0 legs stride
  walkAmp?: number; // 0..1
  lean?: number; // torso lean degrees
  headTilt?: number; // degrees
  gazeX?: number; // -1..1 pupil look direction
  blink?: boolean;
  breathe?: number; // -1..1
  sweat?: boolean; // panic sweat drop
}

interface Palette {
  robe: string;
  robeDark: string;
  trim: string;
  sash: string;
  sashAccent: string;
  skin: string;
  hair: string;
  hat?: 'king' | 'topknot' | 'bun_gold' | 'bun_pearl' | 'bun_simple' | 'guard' | 'runner';
  beard?: boolean;
  armor?: boolean;
}

const PASUKAN_ROBES = [
  { robe: '#7d9387', dark: '#5e7368', trim: '#e6d8b9', sash: '#c29b6c' },
  { robe: '#9f7f78', dark: '#7c605a', trim: '#ebe0c9', sash: '#7b998c' },
  { robe: '#798da0', dark: '#5b6d7e', trim: '#e7dcc5', sash: '#c8a777' },
  { robe: '#9b8b6c', dark: '#786a50', trim: '#efe4cc', sash: '#7c6b86' },
];

function paletteOf(role: DramaRole, variant = 0): Palette {
  switch (role) {
    case 'raja':
      return {
        robe: '#7d282b',
        robeDark: '#591b1e',
        trim: '#e2bd6b',
        sash: '#d9b153',
        sashAccent: '#3ca382',
        skin: '#f0cfa9',
        hair: '#231e1d',
        hat: 'king',
        beard: true,
      };
    case 'suntzu':
      return {
        robe: '#435847',
        robeDark: '#2f4033',
        trim: '#e4d2aa',
        sash: '#6b482e',
        sashAccent: '#c4a162',
        skin: '#ecc9a0',
        hair: '#221e1c',
        hat: 'topknot',
      };
    case 'selir_a':
      return {
        robe: '#b95c68',
        robeDark: '#90414b',
        trim: '#f3e5c7',
        sash: '#e5be63',
        sashAccent: '#fff0bd',
        skin: '#f5d7b8',
        hair: '#221b1c',
        hat: 'bun_gold',
      };
    case 'selir_b':
      return {
        robe: '#4c6d92',
        robeDark: '#36506e',
        trim: '#f0e5cf',
        sash: '#6fc0b2',
        sashAccent: '#d6f5ee',
        skin: '#f4d6b6',
        hair: '#201b1e',
        hat: 'bun_pearl',
      };
    case 'pengganti_a':
      return {
        robe: '#8e6d74',
        robeDark: '#6b5056',
        trim: '#f0e4cc',
        sash: '#e5be63',
        sashAccent: '#fff2c2',
        skin: '#f2d3b1',
        hair: '#231d1c',
        hat: 'bun_simple',
      };
    case 'pengganti_b':
      return {
        robe: '#647d89',
        robeDark: '#4a5f69',
        trim: '#f0e4cc',
        sash: '#6fc0b2',
        sashAccent: '#d9f4ee',
        skin: '#f1d2af',
        hair: '#231d1c',
        hat: 'bun_simple',
      };
    case 'utusan':
      return {
        robe: '#8e6f4e',
        robeDark: '#6c5238',
        trim: '#dfd0b0',
        sash: '#46372b',
        sashAccent: '#b59460',
        skin: '#ecc79d',
        hair: '#241e1b',
        hat: 'runner',
      };
    case 'pengawal':
      return {
        robe: '#3d4248',
        robeDark: '#292d32',
        trim: '#9d8a68',
        sash: '#5e3d28',
        sashAccent: '#b99c66',
        skin: '#e6bf96',
        hair: '#1f1d1d',
        hat: 'guard',
        armor: true,
      };
    default: {
      const v = PASUKAN_ROBES[Math.abs(variant) % PASUKAN_ROBES.length];
      return {
        robe: v.robe,
        robeDark: v.dark,
        trim: v.trim,
        sash: v.sash,
        sashAccent: v.trim,
        skin: '#f3d4b4',
        hair: '#231c1d',
        hat: 'bun_simple',
      };
    }
  }
}

const W = 512;
const H = 1024;
const CX = W / 2;
const INK = '#241e1c';

const DEG = Math.PI / 180;

// Geometry constants in canvas pixels (feet at y = 980)
const HIP_Y = 665;
const SHOULDER_Y = 435;
const NECK_Y = 390;
const HEAD_Y = 278;
const HEAD_RX = 92;
const HEAD_RY = 86;
const SHOULDER_DX = 64;
const UPPER_ARM = 112;
const FORE_ARM = 104;

function drawTwoSegArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  upperDeg: number,
  foreDeg: number,
  pal: Palette,
  side: -1 | 1,
) {
  const a1 = (90 + side * upperDeg) * DEG;
  const ex = sx + Math.cos(a1) * UPPER_ARM;
  const ey = sy + Math.sin(a1) * UPPER_ARM;
  const a2 = a1 + side * foreDeg * DEG;
  const hx = ex + Math.cos(a2) * FORE_ARM;
  const hy = ey + Math.sin(a2) * FORE_ARM;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Wide ancient Chinese robe sleeve outline + fill
  ctx.strokeStyle = INK;
  ctx.lineWidth = 44;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx - Math.cos(a2) * 14, hy - Math.sin(a2) * 14);
  ctx.stroke();

  ctx.strokeStyle = pal.robe;
  ctx.lineWidth = 32;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx - Math.cos(a2) * 14, hy - Math.sin(a2) * 14);
  ctx.stroke();

  // Cuff trim near wrist
  const cx1 = hx - Math.cos(a2) * 26;
  const cy1 = hy - Math.sin(a2) * 26;
  const cx2 = hx - Math.cos(a2) * 12;
  const cy2 = hy - Math.sin(a2) * 12;
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(cx1, cy1);
  ctx.lineTo(cx2, cy2);
  ctx.stroke();

  // Hand circle
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(hx, hy, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawDramaChar(ctx: CanvasRenderingContext2D, pose: DramaCharPose) {
  ctx.clearRect(0, 0, W, H);
  const pal = paletteOf(pose.role, pose.variant ?? pose.seed ?? 0);
  const expr = pose.expr ?? 'neutral';
  const mouth = Math.max(0, Math.min(1, pose.mouthOpen ?? 0));
  const breathe = (pose.breathe ?? 0) * 5;
  const walkAmp = pose.walkAmp ?? 0;
  const wp = pose.walkPhase ?? 0;
  const stride = Math.sin(wp) * 32 * walkAmp;
  const liftL = Math.max(0, Math.cos(wp)) * 22 * walkAmp;
  const liftR = Math.max(0, -Math.cos(wp)) * 22 * walkAmp;
  const bob = Math.abs(Math.sin(wp)) * 12 * walkAmp;

  // Ground contact shadow ellipse
  ctx.save();
  ctx.fillStyle = 'rgba(26, 20, 14, 0.28)';
  ctx.beginPath();
  ctx.ellipse(CX, 982, 92, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(CX, HIP_Y - bob);
  ctx.rotate((pose.lean ?? 0) * DEG);
  ctx.translate(-CX, -HIP_Y);

  // 1. Legs & traditional upturned shoes
  const drawLeg = (lx: number, dx: number, lift: number) => {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    const footX = lx + dx;
    const footY = 968 - lift;
    ctx.beginPath();
    ctx.moveTo(lx, 870);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    // Shoe
    ctx.fillStyle = '#2d2520';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(footX - 18, footY + 6);
    ctx.lineTo(footX + 34, footY + 6);
    ctx.quadraticCurveTo(footX + 46, footY - 12, footX + 28, footY - 8);
    ctx.lineTo(footX - 18, footY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  drawLeg(CX - 34, -stride, liftL);
  drawLeg(CX + 34, stride, liftR);

  // 2. Back arm (left arm drawn behind torso if tucked, or in front if raised)
  const armL = pose.armL ?? [-18, -14];
  const armR = pose.armR ?? [20, -24];
  drawTwoSegArm(ctx, CX - SHOULDER_DX, SHOULDER_Y + breathe, armL[0], armL[1], pal, -1);

  // 3. Layered Ancient Wu Robe Torso & Skirt
  ctx.save();
  ctx.fillStyle = pal.robe;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(CX - 66, SHOULDER_Y - 10 + breathe);
  ctx.quadraticCurveTo(CX, SHOULDER_Y - 26 + breathe, CX + 66, SHOULDER_Y - 10 + breathe);
  ctx.lineTo(CX + 96, 895);
  ctx.quadraticCurveTo(CX, 912, CX - 96, 895);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle vertical shading panel
  ctx.fillStyle = pal.robeDark;
  ctx.beginPath();
  ctx.moveTo(CX + 26, SHOULDER_Y + breathe);
  ctx.lineTo(CX + 62, SHOULDER_Y - 6 + breathe);
  ctx.lineTo(CX + 92, 892);
  ctx.lineTo(CX + 46, 900);
  ctx.closePath();
  ctx.fill();

  // Crossed Han-style collar (jiaoling youren: left lapel over right)
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 22;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(CX + 34, NECK_Y + 24 + breathe);
  ctx.lineTo(CX - 18, SHOULDER_Y + 130 + breathe);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX - 34, NECK_Y + 24 + breathe);
  ctx.lineTo(CX + 36, SHOULDER_Y + 150 + breathe);
  ctx.stroke();

  // Collar ink lines
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(CX - 43, NECK_Y + 24 + breathe);
  ctx.lineTo(CX + 30, SHOULDER_Y + 156 + breathe);
  ctx.moveTo(CX + 43, NECK_Y + 24 + breathe);
  ctx.lineTo(CX - 22, SHOULDER_Y + 132 + breathe);
  ctx.stroke();

  // Guard chest plate if armor
  if (pal.armor) {
    ctx.fillStyle = '#535860';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(CX - 54, SHOULDER_Y + 24 + breathe, 108, 128, 14);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#9d8a68';
    ctx.lineWidth = 4;
    for (let y = 0; y < 3; y++) {
      ctx.beginPath();
      ctx.moveTo(CX - 46, SHOULDER_Y + 56 + y * 32 + breathe);
      ctx.lineTo(CX + 46, SHOULDER_Y + 56 + y * 32 + breathe);
      ctx.stroke();
    }
  }

  // Waist Sash (wider & brighter for commander roles!)
  ctx.fillStyle = pal.sash;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(CX - 76, 588 + breathe * 0.5, 152, 44, 10);
  ctx.fill();
  ctx.stroke();

  // Sash buckle / jade pendant + hanging ribbon
  ctx.fillStyle = pal.sashAccent;
  ctx.beginPath();
  ctx.roundRect(CX - 22, 594 + breathe * 0.5, 44, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = pal.sash;
  ctx.beginPath();
  ctx.moveTo(CX - 16, 632);
  ctx.lineTo(CX + 16, 632);
  ctx.lineTo(CX + 24, 830);
  ctx.lineTo(CX - 24, 830);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Decorative hem border
  ctx.fillStyle = pal.trim;
  ctx.fillRect(CX - 88, 868, 176, 18);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(CX - 88, 868, 176, 18);
  ctx.restore();

  // 4. Right arm (weapon / command / gesture arm — drawn in front of torso)
  drawTwoSegArm(ctx, CX + SHOULDER_DX, SHOULDER_Y + breathe, armR[0], armR[1], pal, 1);

  // 5. Neck & Head
  ctx.save();
  ctx.translate(CX, NECK_Y + breathe);
  ctx.rotate((pose.headTilt ?? 0) * DEG);
  ctx.translate(-CX, -NECK_Y);

  // Neck
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(CX - 18, NECK_Y - 38, 36, 58, 10);
  ctx.fill();
  ctx.stroke();

  // Ears
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(CX - HEAD_RX + 2, HEAD_Y + 6, 16, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(CX + HEAD_RX - 2, HEAD_Y + 6, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head oval
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
  ctx.ellipse(CX, HEAD_Y - 20, HEAD_RX + 2, HEAD_RY - 12, 0, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(CX + 50, HEAD_Y - 42, CX, HEAD_Y - 46);
  ctx.quadraticCurveTo(CX - 50, HEAD_Y - 42, CX - HEAD_RX - 2, HEAD_Y - 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hairdo / Hat per role
  if (pal.hat === 'king') {
    // Stylized ceremonial Wu royal cap (not European crown, not Ming/Qing)
    ctx.fillStyle = '#1f1a1c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(CX - 62, HEAD_Y - 126, 124, 58, 14);
    ctx.fill();
    ctx.stroke();
    // Gold horizontal ceremonial bar & jade ornament
    ctx.fillStyle = '#e5be63';
    ctx.fillRect(CX - 78, HEAD_Y - 114, 156, 14);
    ctx.strokeRect(CX - 78, HEAD_Y - 114, 156, 14);
    ctx.fillStyle = '#3ca382';
    ctx.beginPath();
    ctx.arc(CX, HEAD_Y - 96, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (pal.hat === 'topknot') {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.roundRect(CX - 34, HEAD_Y - 118, 68, 42, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c4a162';
    ctx.fillRect(CX - 48, HEAD_Y - 102, 96, 10);
    ctx.strokeRect(CX - 48, HEAD_Y - 102, 96, 10);
  } else if (pal.hat === 'bun_gold' || pal.hat === 'bun_pearl' || pal.hat === 'bun_simple') {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(CX + 42, HEAD_Y - 78, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (pal.hat === 'bun_pearl') {
      ctx.beginPath();
      ctx.arc(CX - 42, HEAD_Y - 78, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (pal.hat !== 'bun_simple') {
      // Hairpin
      ctx.strokeStyle = pal.hat === 'bun_gold' ? '#f0c85a' : '#dcecf5';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(CX + 10, HEAD_Y - 74);
      ctx.lineTo(CX + 88, HEAD_Y - 98);
      ctx.stroke();
      ctx.fillStyle = pal.hat === 'bun_gold' ? '#f0c85a' : '#ffffff';
      ctx.beginPath();
      ctx.arc(CX + 88, HEAD_Y - 98, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pal.hat === 'guard') {
    ctx.fillStyle = '#363b42';
    ctx.beginPath();
    ctx.arc(CX, HEAD_Y - 34, HEAD_RX + 6, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b99c66';
    ctx.fillRect(CX - 14, HEAD_Y - 122, 28, 22);
    ctx.strokeRect(CX - 14, HEAD_Y - 122, 28, 22);
  } else if (pal.hat === 'runner') {
    ctx.fillStyle = '#c8b38a';
    ctx.fillRect(CX - HEAD_RX + 4, HEAD_Y - 46, (HEAD_RX - 4) * 2, 18);
    ctx.strokeRect(CX - HEAD_RX + 4, HEAD_Y - 46, (HEAD_RX - 4) * 2, 18);
  }

  // Cheeks blush for laugh/selir
  if (expr === 'laugh' || pose.role === 'selir_a' || pose.role === 'selir_b') {
    ctx.fillStyle = expr === 'laugh' ? 'rgba(225, 105, 110, 0.38)' : 'rgba(225, 125, 125, 0.2)';
    ctx.beginPath();
    ctx.ellipse(CX - 54, HEAD_Y + 20, 18, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(CX + 54, HEAD_Y + 20, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes
  const eyeY = HEAD_Y - 4;
  const eyeDX = 36;
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
  } else if (expr === 'laugh') {
    // Happy curved laughing eyes (^ ^)
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(CX - eyeDX, eyeY + 6, 17, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX + eyeDX, eyeY + 6, 17, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    const rEye = expr === 'shock' || expr === 'panic' ? 22 : expr === 'cold' ? 16 : 19;
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
      ctx.arc(ex + gx, eyeY + (expr === 'sad' ? 3 : 0), rPupil, 0, Math.PI * 2);
      ctx.fill();

      // Tiny specular highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + gx - 3, eyeY - 3, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Eyebrows per expression
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const browY = eyeY - 30;
  if (expr === 'command' || expr === 'cold') {
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 18, browY - 4);
    ctx.lineTo(CX - eyeDX + 18, browY + 10);
    ctx.moveTo(CX + eyeDX + 18, browY - 4);
    ctx.lineTo(CX + eyeDX - 18, browY + 10);
    ctx.stroke();
  } else if (expr === 'panic' || expr === 'fear' || expr === 'sad') {
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 18, browY + 8);
    ctx.lineTo(CX - eyeDX + 16, browY - 8);
    ctx.moveTo(CX + eyeDX + 18, browY + 8);
    ctx.lineTo(CX + eyeDX - 16, browY - 8);
    ctx.stroke();
  } else if (expr === 'shock') {
    ctx.beginPath();
    ctx.arc(CX - eyeDX, browY - 4, 18, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX + eyeDX, browY - 4, 18, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (expr === 'smug') {
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 16, browY + 2);
    ctx.lineTo(CX - eyeDX + 16, browY - 4);
    ctx.moveTo(CX + eyeDX - 16, browY - 8);
    ctx.lineTo(CX + eyeDX + 18, browY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(CX - eyeDX - 16, browY);
    ctx.lineTo(CX - eyeDX + 16, browY);
    ctx.moveTo(CX + eyeDX - 16, browY);
    ctx.lineTo(CX + eyeDX + 16, browY);
    ctx.stroke();
  }

  // Stylized thin royal mustache (leaves mouth 100% clear for lip-sync!)
  if (pal.beard) {
    ctx.strokeStyle = pal.hair;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(CX - 4, HEAD_Y + 25);
    ctx.quadraticCurveTo(CX - 28, HEAD_Y + 22, CX - 42, HEAD_Y + 34);
    ctx.moveTo(CX + 4, HEAD_Y + 25);
    ctx.quadraticCurveTo(CX + 28, HEAD_Y + 22, CX + 42, HEAD_Y + 34);
    ctx.stroke();
  }

  // Mouth (real-time lip-sync + emotion!)
  const my = HEAD_Y + 43;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  if (mouth > 0.08 || expr === 'laugh' || expr === 'panic' || expr === 'shock') {
    const open =
      expr === 'laugh'
        ? Math.max(0.55, mouth)
        : expr === 'panic' || expr === 'shock'
          ? Math.max(0.5, mouth)
          : mouth;
    const rw = expr === 'command' || expr === 'panic' ? 24 : 20;
    const rh = Math.max(6, open * 24);
    ctx.fillStyle = '#7c2529';
    ctx.beginPath();
    ctx.ellipse(CX, my, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Upper teeth highlight when shouting/laughing
    if (open > 0.4) {
      ctx.fillStyle = '#fff9f0';
      ctx.fillRect(CX - rw * 0.65, my - rh + 3, rw * 1.3, Math.min(8, rh * 0.45));
    }
  } else if (expr === 'smug') {
    ctx.beginPath();
    ctx.moveTo(CX - 18, my + 2);
    ctx.quadraticCurveTo(CX + 4, my + 12, CX + 22, my - 5);
    ctx.stroke();
  } else if (expr === 'sad' || expr === 'fear') {
    ctx.beginPath();
    ctx.moveTo(CX - 18, my + 8);
    ctx.quadraticCurveTo(CX, my - 6, CX + 18, my + 8);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(CX - 18, my);
    ctx.lineTo(CX + 18, my);
    ctx.stroke();
  }

  // Panic sweat drop
  if (pose.sweat || expr === 'panic') {
    ctx.fillStyle = '#9be0ff';
    ctx.strokeStyle = '#3c6e85';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(CX + 68, HEAD_Y - 34);
    ctx.quadraticCurveTo(CX + 82, HEAD_Y - 12, CX + 68, HEAD_Y - 6);
    ctx.quadraticCurveTo(CX + 54, HEAD_Y - 12, CX + 68, HEAD_Y - 34);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore(); // head
  ctx.restore(); // torso lean
}

/**
 * Exact 3D world position of character's left or right hand for attaching 3D props (spear, scroll, drumstick).
 */
export function dramaHandWorld(
  pose: DramaCharPose,
  side: 'L' | 'R',
  pos: [number, number, number],
  height: number,
  camPos: [number, number, number],
  fixedYaw?: number,
): [number, number, number] {
  const s = side === 'L' ? -1 : 1;
  const arm = (side === 'L' ? pose.armL : pose.armR) ?? (side === 'L' ? [-18, -14] : [20, -24]);
  const a1 = (90 + s * arm[0]) * DEG;
  const a2 = a1 + s * arm[1] * DEG;
  const breathe = (pose.breathe ?? 0) * 5;
  const hx = CX + s * SHOULDER_DX + Math.cos(a1) * UPPER_ARM + Math.cos(a2) * FORE_ARM;
  const hy = SHOULDER_Y + breathe + Math.sin(a1) * UPPER_ARM + Math.sin(a2) * FORE_ARM;

  const worldW = height * (W / H);
  const localX = ((hx - CX) / W) * worldW;
  const localY = ((980 - hy) / H) * height;
  const yaw = fixedYaw !== undefined ? fixedYaw : Math.atan2(camPos[0] - pos[0], camPos[2] - pos[2]);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return [pos[0] + localX * cos + 0.08 * sin, pos[1] + localY, pos[2] - localX * sin + 0.08 * cos];
}

export const DRAMA_ASPECT = W / H;

export function makeDramaTexture(): { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { canvas, tex };
}

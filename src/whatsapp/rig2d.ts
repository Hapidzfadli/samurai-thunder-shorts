import * as THREE from 'three';

export type WaCharId = 'jan' | 'brian' | 'faina' | 'mark' | 'hr' | 'dev1' | 'dev2' | 'clerk';

export type WaExpr =
  | 'calm'
  | 'happy'
  | 'proud'
  | 'tired'
  | 'shock'
  | 'sad'
  | 'warm'
  | 'serious';

export type WaArmPose =
  | 'idle'
  | 'walk'
  | 'typing'
  | 'hold_phone'
  | 'hold_folder'
  | 'offer_right'
  | 'offer_left'
  | 'point_right'
  | 'point_left'
  | 'point_up'
  | 'sign'
  | 'handshake'
  | 'celebrate'
  | 'hold_bags'
  | 'pat_right'
  | 'crossed';

export interface WaCharState {
  id: WaCharId;
  expr: WaExpr;
  arm: WaArmPose;
  /** 0..1 continuous mouth openness driven by speech cadence */
  talk: number;
  /** Time in seconds for continuous breathing, blinking, typing, walking */
  timeSec: number;
  /** 0 = standing still, >0 = active walk cycle intensity (0..1) */
  walkAmount?: number;
  /** Walk phase in radians (accumulated from distance/time) */
  walkPhase?: number;
  /** Facing: +1 faces slightly right, -1 faces slightly left */
  facing?: 1 | -1;
  /** Dynamic pupil gaze offset (-1..+1) */
  gazeX?: number;
  gazeY?: number;
  /** Subtle body lean in radians (e.g. leaning forward over desk) */
  lean?: number;
  /** Head tilt/nod in radians */
  headTilt?: number;
}

const CW = 560;
const CH = 840;

function smoothBlink(timeSec: number, seed: number): number {
  const period = 3.4 + (seed % 7) * 0.25;
  const phase = ((timeSec + seed * 0.71) % period) / period;
  // Quick smooth blink near end of cycle
  if (phase > 0.945 && phase < 0.985) {
    const u = (phase - 0.945) / 0.04;
    return Math.sin(u * Math.PI);
  }
  return 0;
}

function drawLimb2Seg(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  ang1: number,
  len1: number,
  ang2: number,
  len2: number,
  width: number,
  fill: string,
  outline = '#14171c',
  handColor?: string,
  cuffColor?: string,
) {
  const x1 = x0 + Math.sin(ang1) * len1;
  const y1 = y0 + Math.cos(ang1) * len1;
  const x2 = x1 + Math.sin(ang2) * len2;
  const y2 = y1 + Math.cos(ang2) * len2;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Thick cartoon ink outline
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + 11;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner sleeve / pant fill
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Optional cuff accent near wrist
  if (cuffColor) {
    const cx = x1 + Math.sin(ang2) * (len2 * 0.80);
    const cy = y1 + Math.cos(ang2) * (len2 * 0.80);
    ctx.strokeStyle = cuffColor;
    ctx.lineWidth = width * 0.82;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Hand circle with clean outline
  if (handColor) {
    ctx.fillStyle = handColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x2, y2, width * 0.56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  return { x: x2, y: y2 };
}

function drawShoe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  color: string,
  soleColor: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#14171c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-20, -14, 62, 30, [14, 20, 8, 8]);
  ctx.fill();
  ctx.stroke();
  // Clean modern sneaker sole
  ctx.fillStyle = soleColor;
  ctx.fillRect(-17, 6, 56, 7);
  ctx.restore();
}

function resolveArmAngles(
  arm: WaArmPose,
  t: number,
  walkAmt: number,
  walkPh: number,
): { l1: number; l2: number; r1: number; r2: number } {
  const sway = Math.sin(t * 2.2) * 0.05;
  switch (arm) {
    case 'walk': {
      const sw = Math.sin(walkPh) * 0.42 * Math.max(0.25, walkAmt);
      return { l1: -0.18 + sw, l2: -0.05 + sw * 1.25, r1: 0.18 - sw, r2: 0.05 - sw * 1.25 };
    }
    case 'typing': {
      const kL = Math.sin(t * 16.0) * 0.10;
      const kR = Math.cos(t * 17.5) * 0.10;
      return { l1: -0.26, l2: 0.92 + kL, r1: 0.26, r2: -0.92 + kR };
    }
    case 'hold_phone':
      return { l1: -0.16 + sway, l2: -0.08, r1: 0.42, r2: 1.55 + Math.sin(t * 2.5) * 0.05 };
    case 'hold_folder':
      return { l1: -0.22, l2: 0.65, r1: 0.34, r2: -0.78 + sway };
    case 'offer_right':
      return { l1: -0.15 + sway, l2: -0.06, r1: 0.95, r2: 1.38 + Math.sin(t * 3.0) * 0.04 };
    case 'offer_left':
      return { l1: -0.95, l2: -1.38 + Math.sin(t * 3.0) * 0.04, r1: 0.15 - sway, r2: 0.06 };
    case 'point_right':
      return { l1: -0.18 + sway, l2: -0.08, r1: 1.22, r2: 1.48 + Math.sin(t * 3.5) * 0.06 };
    case 'point_left':
      return { l1: -1.22, l2: -1.48 + Math.sin(t * 3.5) * 0.06, r1: 0.18 - sway, r2: 0.08 };
    case 'point_up':
      return { l1: -0.20, l2: -0.10, r1: 1.65, r2: 2.35 + Math.sin(t * 4.0) * 0.08 };
    case 'sign': {
      const w = Math.sin(t * 12.0) * 0.14;
      return { l1: -0.35, l2: 0.72, r1: 0.55, r2: -0.58 + w };
    }
    case 'handshake':
      return { l1: -0.16, l2: -0.08, r1: 0.88, r2: 1.35 + Math.sin(t * 9.0) * 0.12 };
    case 'celebrate': {
      const pump = Math.sin(t * 7.5) * 0.14;
      return { l1: -2.25 + pump, l2: -2.65 + pump, r1: 2.25 - pump, r2: 2.65 - pump };
    }
    case 'hold_bags':
      return { l1: -0.26, l2: -0.12, r1: 0.26, r2: 0.12 };
    case 'pat_right':
      return { l1: -0.22, l2: -0.12, r1: 0.82, r2: 1.25 + Math.sin(t * 5.0) * 0.08 };
    case 'crossed':
      return { l1: -0.35, l2: 1.05, r1: 0.35, r2: -1.05 };
    case 'idle':
    default: {
      const g = Math.sin(t * 2.1) * 0.06;
      return { l1: -0.18 + g, l2: -0.06 + g, r1: 0.18 - g, r2: 0.06 - g };
    }
  }
}

export function drawWaCharToCanvas(ctx: CanvasRenderingContext2D, st: WaCharState) {
  ctx.clearRect(0, 0, CW, CH);
  const t = st.timeSec;
  const facing = st.facing ?? 1;
  const walkAmt = st.walkAmount ?? 0;
  const walkPh = st.walkPhase ?? t * 7.5;
  const seed = st.id.charCodeAt(0) * 13 + st.id.length * 7;
  const blink = smoothBlink(t, seed);

  // Subtle organic breathing & walking bounce
  const breath = Math.sin(t * 2.4 + seed) * 3.2;
  const walkBob = walkAmt > 0.01 ? -Math.abs(Math.sin(walkPh)) * 14 * walkAmt : 0;
  const talkBob = st.talk > 0.08 ? -Math.abs(Math.sin(t * 14)) * 3.5 * st.talk : 0;

  // Palette per character (100% matched to approved whatsapp-karakter.jpg)
  const pal: Record<WaCharId, {
    skin: string; hair: string; top: string; topInner: string; pants: string;
    shoe: string; sole: string; sleeve: string; cuff?: string;
    isFemale?: boolean; glasses?: boolean; plaid?: boolean; curly?: boolean;
    hoodie?: boolean; cardigan?: boolean; blazer?: boolean;
  }> = {
    jan: {
      skin: '#e7b18a', hair: '#3b2618', top: '#31353b', topInner: '#787e86',
      pants: '#405a74', shoe: '#2c3138', sole: '#edf0f2', sleeve: '#31353b', cuff: '#23262b',
      hoodie: true,
    },
    brian: {
      skin: '#f0bfa0', hair: '#9d6c3e', top: '#3a6a9c', topInner: '#2a4d74',
      pants: '#b99b6d', shoe: '#6e492e', sole: '#3e2919', sleeve: '#3a6a9c', cuff: '#2a4d74',
      glasses: true, plaid: true,
    },
    faina: {
      skin: '#f1c2a0', hair: '#694025', top: '#839e7a', topInner: '#f3ecd8',
      pants: '#6b5644', shoe: '#523828', sole: '#2d1e15', sleeve: '#839e7a',
      isFemale: true, cardigan: true,
    },
    mark: {
      skin: '#f3c5a6', hair: '#5a3922', top: '#868b92', topInner: '#70757c',
      pants: '#2c415c', shoe: '#2d3239', sole: '#545b64', sleeve: '#868b92',
      curly: true,
    },
    hr: {
      skin: '#efc09e', hair: '#2c201b', top: '#283d58', topInner: '#f5f7fa',
      pants: '#1f2836', shoe: '#22252b', sole: '#121418', sleeve: '#283d58',
      isFemale: true, blazer: true,
    },
    dev1: {
      skin: '#e2ac84', hair: '#231c18', top: '#226c62', topInner: '#1a524a',
      pants: '#353e4a', shoe: '#2a2e34', sole: '#e8ecef', sleeve: '#226c62',
      glasses: true,
    },
    dev2: {
      skin: '#f2c4a2', hair: '#754828', top: '#984a36', topInner: '#f2ece4',
      pants: '#2f3d4d', shoe: '#342c28', sole: '#e6eaed', sleeve: '#984a36',
      isFemale: true,
    },
    clerk: {
      skin: '#ddb08c', hair: '#3c2e24', top: '#395a7e', topInner: '#eef2f6',
      pants: '#2d333d', shoe: '#252930', sole: '#14171c', sleeve: '#395a7e',
      glasses: true, blazer: true,
    },
  };
  const p = pal[st.id];

  ctx.save();
  ctx.translate(CW / 2, 0);
  if (facing < 0) ctx.scale(-1, 1);

  const hipY = 545 + walkBob;
  const shoulderY = 352 + breath + walkBob;
  const headY = 205 + breath * 1.1 + walkBob + talkBob;

  // Soft contact ground shadow
  ctx.fillStyle = 'rgba(15, 22, 34, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 792, 92 - Math.abs(walkBob) * 0.8, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // ==================== 1. ARTICULATED LEGS (2-SEGMENT WALK CYCLE) ====================
  const legSwing = Math.sin(walkPh) * 0.36 * walkAmt;
  const kneeL = Math.max(0, -Math.cos(walkPh)) * 0.34 * walkAmt;
  const kneeR = Math.max(0, Math.cos(walkPh)) * 0.34 * walkAmt;

  const footL = drawLimb2Seg(
    ctx, -36, hipY,
    -0.04 + legSwing, 118,
    -0.02 + legSwing - kneeL, 114,
    34, p.pants, '#14171c',
  );
  const footR = drawLimb2Seg(
    ctx, 36, hipY,
    0.04 - legSwing, 118,
    0.02 - legSwing - kneeR, 114,
    34, p.pants, '#14171c',
  );
  drawShoe(ctx, footL.x, footL.y + 8, 1, p.shoe, p.sole);
  drawShoe(ctx, footR.x, footR.y + 8, 1, p.shoe, p.sole);

  // ==================== 2. BACK ARM ====================
  const arms = resolveArmAngles(st.arm, t, walkAmt, walkPh);
  const lean = st.lean ?? 0;

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(lean);
  ctx.translate(0, -hipY);

  // Left arm (behind torso slightly)
  drawLimb2Seg(
    ctx, -76, shoulderY + 12,
    arms.l1, 92,
    arms.l2, 86,
    28, p.sleeve, '#14171c', p.skin, p.cuff,
  );

  // ==================== 3. TORSO & DETAILED MODERN OUTFIT ====================
  ctx.fillStyle = p.top;
  ctx.strokeStyle = '#14171c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(-78, shoulderY - 10, 156, hipY - shoulderY + 34, [44, 44, 24, 24]);
  ctx.fill();
  ctx.stroke();

  // Outfit-specific crisp modern details
  if (p.hoodie) {
    // Inner grey tee strip + open zip-up hoodie lapels + white drawstrings
    ctx.fillStyle = p.topInner;
    ctx.fillRect(-26, shoulderY - 4, 52, hipY - shoulderY + 26);
    ctx.strokeStyle = '#14171c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-26, shoulderY - 4); ctx.lineTo(-26, hipY + 22);
    ctx.moveTo(26, shoulderY - 4);  ctx.lineTo(26, hipY + 22);
    ctx.stroke();
    // Hood collar arc
    ctx.fillStyle = '#25292e';
    ctx.beginPath();
    ctx.ellipse(0, shoulderY - 6, 56, 18, 0, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    // Drawstrings
    ctx.strokeStyle = '#e8ecf0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-18, shoulderY + 8); ctx.lineTo(-20, shoulderY + 72);
    ctx.moveTo(18, shoulderY + 8);  ctx.lineTo(20, shoulderY + 72);
    ctx.stroke();
  } else if (p.plaid) {
    // Crisp blue plaid lines + button-up placket + collar
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-74, shoulderY - 6, 148, hipY - shoulderY + 28, [40, 40, 20, 20]);
    ctx.clip();
    ctx.strokeStyle = 'rgba(20, 38, 62, 0.45)';
    ctx.lineWidth = 6;
    for (let x = -60; x <= 60; x += 26) {
      ctx.beginPath(); ctx.moveTo(x, shoulderY - 12); ctx.lineTo(x, hipY + 30); ctx.stroke();
    }
    for (let y = shoulderY + 12; y <= hipY + 20; y += 26) {
      ctx.beginPath(); ctx.moveTo(-80, y); ctx.lineTo(80, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(170, 212, 248, 0.35)';
    ctx.lineWidth = 2;
    for (let x = -47; x <= 60; x += 26) {
      ctx.beginPath(); ctx.moveTo(x, shoulderY - 12); ctx.lineTo(x, hipY + 30); ctx.stroke();
    }
    ctx.restore();
    // Collar + center buttons
    ctx.fillStyle = p.topInner;
    ctx.strokeStyle = '#14171c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-26, shoulderY - 8); ctx.lineTo(0, shoulderY + 16); ctx.lineTo(26, shoulderY - 8);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = '#e5eef8';
      ctx.beginPath();
      ctx.arc(0, shoulderY + 38 + k * 36, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.cardigan || p.blazer) {
    // Open cardigan / blazer revealing cream blouse / shirt inside
    ctx.fillStyle = p.topInner;
    ctx.beginPath();
    ctx.moveTo(-34, shoulderY - 6);
    ctx.lineTo(34, shoulderY - 6);
    ctx.lineTo(22, hipY + 22);
    ctx.lineTo(-22, hipY + 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#14171c';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Blouse collar V
    ctx.beginPath();
    ctx.moveTo(-22, shoulderY - 6); ctx.lineTo(0, shoulderY + 28); ctx.lineTo(22, shoulderY - 6);
    ctx.stroke();
  } else {
    // Clean modern crew-neck tee (Mark Zuckerberg) with subtle fold shading
    ctx.strokeStyle = 'rgba(20, 23, 28, 0.25)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, shoulderY - 10, 32, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-42, shoulderY + 60); ctx.quadraticCurveTo(0, shoulderY + 72, 42, shoulderY + 58);
    ctx.stroke();
  }

  // Subtle belt / hem line
  ctx.fillStyle = '#20242a';
  ctx.fillRect(-72, hipY + 12, 144, 14);

  // ==================== 4. HEAD, NECK & LIVING FACE ====================
  // Neck
  ctx.fillStyle = p.skin;
  ctx.strokeStyle = '#14171c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-22, headY + 86, 44, 62, 12);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.translate(0, headY);
  const tilt = (st.headTilt ?? 0) + Math.sin(t * 1.9 + seed) * 0.025 + (st.talk > 0.1 ? Math.sin(t * 9) * 0.03 * st.talk : 0);
  ctx.rotate(tilt);

  // Back hair bun (for Ibu Faina / female characters)
  if (p.isFemale) {
    ctx.fillStyle = p.hair;
    ctx.strokeStyle = '#14171c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(-78, 34, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Ears
  for (const ex of [-92, 92]) {
    ctx.fillStyle = p.skin;
    ctx.strokeStyle = '#14171c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(ex, 10, 18, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (p.cardigan) {
      // Pearl earring for Ibu Faina
      ctx.fillStyle = '#fffdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex, 32, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Head shape (warm editorial 2.5D cartoon proportions)
  ctx.fillStyle = p.skin;
  ctx.strokeStyle = '#14171c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 108, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle warm cheek blush
  ctx.fillStyle = 'rgba(225, 118, 98, 0.18)';
  ctx.beginPath();
  ctx.ellipse(-46, 26, 17, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(46, 26, 17, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair styles (matched closely to approved sheet)
  ctx.fillStyle = p.hair;
  ctx.strokeStyle = '#14171c';
  ctx.lineWidth = 6;
  if (p.curly) {
    // Mark Zuckerberg short curly brown hair
    const puffs = [
      [-68, -56, 26], [-44, -84, 28], [-12, -98, 30], [24, -96, 29],
      [54, -80, 27], [74, -52, 24], [-82, -26, 20], [82, -26, 20],
    ];
    ctx.beginPath();
    for (const [px, py, pr] of puffs) {
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    // Clean inner fill over curl seams
    ctx.beginPath();
    ctx.ellipse(0, -72, 74, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.isFemale) {
    // Smooth parted hair (Faina / HR)
    ctx.beginPath();
    ctx.moveTo(-92, 4);
    ctx.quadraticCurveTo(-96, -108, 0, -112);
    ctx.quadraticCurveTo(96, -108, 92, 4);
    ctx.quadraticCurveTo(60, -48, 12, -56);
    ctx.quadraticCurveTo(-48, -42, -92, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (p.hoodie) {
    // Jan Koum short neat receding hairline
    ctx.beginPath();
    ctx.moveTo(-90, -14);
    ctx.quadraticCurveTo(-92, -108, 0, -112);
    ctx.quadraticCurveTo(92, -108, 90, -14);
    ctx.quadraticCurveTo(68, -56, 36, -64);
    ctx.quadraticCurveTo(0, -76, -36, -64);
    ctx.quadraticCurveTo(-68, -56, -90, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Brian Acton neat modern side-swept hair
    ctx.beginPath();
    ctx.moveTo(-90, -12);
    ctx.quadraticCurveTo(-96, -104, -18, -114);
    ctx.lineTo(18, -124);
    ctx.quadraticCurveTo(88, -112, 92, -12);
    ctx.quadraticCurveTo(58, -54, 0, -56);
    ctx.quadraticCurveTo(-56, -54, -90, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ==================== EYES WITH NATURAL BLINK & DYNAMIC GAZE ====================
  const gx = (st.gazeX ?? 0.12) * 5.5;
  const gy = (st.gazeY ?? 0) * 4.0;
  const eyeScaleY = Math.max(0.08, 1 - blink * 0.92) * (st.expr === 'shock' ? 1.18 : 1.0);

  for (const ex of [-34, 34]) {
    ctx.save();
    ctx.translate(ex, -4);
    ctx.scale(1, eyeScaleY);
    if (blink > 0.72) {
      // Closed eyelid arc
      ctx.strokeStyle = '#14171c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#14171c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupil tracking gaze
      ctx.fillStyle = '#14171c';
      ctx.beginPath();
      ctx.arc(gx, gy, st.expr === 'shock' ? 6.5 : 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Crisp specular highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx - 3, gy - 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Modern rectangular glasses (Brian Acton / Dev)
  if (p.glasses) {
    ctx.strokeStyle = '#1c2026';
    ctx.lineWidth = 5.5;
    ctx.fillStyle = 'rgba(210, 235, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(-62, -26, 52, 42, 8);
    ctx.roundRect(10, -26, 52, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -8); ctx.lineTo(10, -8);
    ctx.moveTo(-62, -8); ctx.lineTo(-86, -4);
    ctx.moveTo(62, -8);  ctx.lineTo(86, -4);
    ctx.stroke();
  }

  // Expressive Eyebrows
  ctx.strokeStyle = '#241912';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  const browY = st.expr === 'shock' ? -40 : st.expr === 'tired' || st.expr === 'sad' ? -30 : -34;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    if (st.expr === 'serious') {
      ctx.moveTo(side * 54, browY - 4);
      ctx.lineTo(side * 16, browY + 5);
    } else if (st.expr === 'sad' || st.expr === 'tired') {
      ctx.moveTo(side * 54, browY + 7);
      ctx.lineTo(side * 16, browY - 5);
    } else if (st.expr === 'shock') {
      ctx.moveTo(side * 54, browY + 4);
      ctx.quadraticCurveTo(side * 34, browY - 12, side * 14, browY);
    } else {
      ctx.moveTo(side * 54, browY + 2);
      ctx.quadraticCurveTo(side * 34, browY - 6, side * 16, browY + 1);
    }
    ctx.stroke();
  }

  // Clean minimalist nose
  ctx.strokeStyle = '#7e523a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, 4);
  ctx.quadraticCurveTo(10, 18, 1, 24);
  ctx.stroke();

  // ==================== EXPRESSIVE MOUTH & REAL-TIME LIP-SYNC ====================
  const open = st.talk;
  ctx.strokeStyle = '#14171c';
  ctx.lineWidth = 5.5;
  if (open > 0.14) {
    // Animated speaking mouth synced to syllable cadence
    const mh = 8 + open * 22;
    const mw = 18 + open * 12;
    ctx.fillStyle = '#7a2026';
    ctx.beginPath();
    ctx.ellipse(0, 50, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Upper teeth & tongue accent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-mw * 0.65, 50 - mh * 0.85, mw * 1.3, Math.min(8, mh * 0.45));
    ctx.fillStyle = '#d96b70';
    ctx.beginPath();
    ctx.ellipse(0, 50 + mh * 0.45, mw * 0.55, mh * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.expr === 'happy' || st.expr === 'proud') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 44, 24, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (st.expr === 'warm') {
    ctx.beginPath();
    ctx.arc(0, 40, 22, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
  } else if (st.expr === 'shock') {
    ctx.fillStyle = '#7a2026';
    ctx.beginPath();
    ctx.ellipse(0, 52, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (st.expr === 'sad' || st.expr === 'tired') {
    ctx.beginPath();
    ctx.arc(0, 68, 22, 1.18 * Math.PI, 1.82 * Math.PI);
    ctx.stroke();
  } else {
    // Calm / determined subtle smile
    ctx.beginPath();
    ctx.moveTo(-18, 50);
    ctx.quadraticCurveTo(0, 57, 20, 48);
    ctx.stroke();
  }

  ctx.restore(); // end head

  // ==================== 5. FRONT RIGHT ARM (IN FRONT OF TORSO) ====================
  drawLimb2Seg(
    ctx, 76, shoulderY + 12,
    arms.r1, 92,
    arms.r2, 86,
    28, p.sleeve, '#14171c', p.skin, p.cuff,
  );

  ctx.restore(); // end torso lean
  ctx.restore(); // end facing
}

/**
 * Create a fresh Canvas + CanvasTexture every frame (per CLAUDE.md rule 5:
 * DataTexture / CanvasTexture must be freshly uploaded for headless Remotion stability).
 */
export function makeWaCharTexture(st: WaCharState): THREE.DataTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d')!;
  drawWaCharToCanvas(ctx, st);
  const img = ctx.getImageData(0, 0, CW, CH);
  const tex = new THREE.DataTexture(img.data, CW, CH, THREE.RGBAFormat);
  tex.flipY = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Compute world-space right/left hand position for attaching separate 3D props
 * (smartphone, folder, coffee cup, sticky note, pen, grocery bag).
 */
export function waHandWorld(
  charPos: [number, number, number],
  charHeight: number,
  facing: 1 | -1,
  arm: WaArmPose,
  side: 'left' | 'right' = 'right',
  timeSec = 0,
): [number, number, number] {
  const arms = resolveArmAngles(arm, timeSec, 0, 0);
  const scale = charHeight / CH;
  const sx = side === 'right' ? 76 : -76;
  const sy = 364;
  const a1 = side === 'right' ? arms.r1 : arms.l1;
  const a2 = side === 'right' ? arms.r2 : arms.l2;
  const hx = sx + Math.sin(a1) * 92 + Math.sin(a2) * 86;
  const hy = sy + Math.cos(a1) * 92 + Math.cos(a2) * 86;
  // Canvas Y=800 is feet (charPos[1])
  const wx = charPos[0] + hx * facing * scale;
  const wy = charPos[1] + (800 - hy) * scale;
  const wz = charPos[2] + 0.14;
  return [wx, wy, wz];
}

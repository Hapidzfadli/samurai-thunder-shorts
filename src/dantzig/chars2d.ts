import * as THREE from "three";

export type GeorgeExpr = "panik" | "fokus" | "pusing" | "sungkan" | "syok" | "bangga";
export type GeorgePose = "idle" | "clutch_book" | "write" | "reach_right" | "reach_both" | "scratch_head" | "hold_binder" | "pull_door";

export type NeymanExpr = "serius" | "sibuk" | "takjub" | "heboh";
export type NeymanPose = "idle" | "point_board" | "dismiss_wave" | "wave_paper" | "hand_paper";

export type AnneExpr = "khawatir" | "senyum_hangat" | "kaget" | "bangga";
export type AnnePose = "idle" | "carry_mug" | "place_mug" | "gasp" | "clap";

const INK = "#14121a";

function drawFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  expr: string,
  opts: {
    skin?: string;
    glasses?: boolean;
    lashes?: boolean;
    blush?: boolean;
    sweat?: boolean;
    talk?: number;
  } = {}
) {
  const { skin = "#f6ddc2", glasses = false, lashes = false, blush = false, sweat = false, talk = 0 } = opts;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Head circle
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (blush) {
    ctx.fillStyle = "rgba(242, 168, 162, 0.45)";
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.50, cy + r * 0.16, r * 0.17, r * 0.10, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.50, cy + r * 0.16, r * 0.17, r * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const ex = r * 0.34;
  const ey = cy - r * 0.04;
  const er = r * 0.11;

  // Eyes & eyebrows
  if (expr === "panik" || expr === "syok" || expr === "takjub" || expr === "kaget") {
    const wr = r * 0.19;
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx + sgn * ex, ey, wr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx + sgn * ex, ey, r * 0.075, 0, Math.PI * 2);
      ctx.fill();
      // High arched brows
      ctx.beginPath();
      ctx.arc(cx + sgn * ex, ey - r * 0.24, r * 0.18, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (expr === "pusing") {
    for (const sgn of [-1, 1]) {
      // Dark tired bags
      ctx.save();
      ctx.strokeStyle = "#877684";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx + sgn * ex, ey + r * 0.10, r * 0.16, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.restore();
      // Half-closed eyes
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(cx + sgn * ex, ey + r * 0.03, er, er * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + sgn * ex - r * 0.18, ey - r * 0.04);
      ctx.lineTo(cx + sgn * ex + r * 0.18, ey - r * 0.01);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - ex - r * 0.16, ey - r * 0.26);
    ctx.lineTo(cx - ex + r * 0.16, ey - r * 0.18);
    ctx.moveTo(cx + ex - r * 0.16, ey - r * 0.18);
    ctx.lineTo(cx + ex + r * 0.16, ey - r * 0.26);
    ctx.stroke();
  } else {
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx + sgn * ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx + sgn * ex - er * 0.3, ey - er * 0.35, er * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (expr === "serius" || expr === "fokus") {
      ctx.beginPath();
      ctx.moveTo(cx - ex - r * 0.16, ey - r * 0.26);
      ctx.lineTo(cx - ex + r * 0.18, ey - r * 0.20);
      ctx.moveTo(cx + ex - r * 0.18, ey - r * 0.20);
      ctx.lineTo(cx + ex + r * 0.16, ey - r * 0.26);
      ctx.stroke();
    } else if (expr === "sungkan" || expr === "khawatir") {
      ctx.beginPath();
      ctx.moveTo(cx - ex - r * 0.16, ey - r * 0.18);
      ctx.lineTo(cx - ex + r * 0.16, ey - r * 0.28);
      ctx.moveTo(cx + ex - r * 0.16, ey - r * 0.28);
      ctx.lineTo(cx + ex + r * 0.16, ey - r * 0.18);
      ctx.stroke();
    } else if (expr === "senyum_hangat" || expr === "bangga" || expr === "heboh") {
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + sgn * ex, ey - r * 0.20, r * 0.17, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
    } else {
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sgn * ex - r * 0.16, ey - r * 0.24);
        ctx.lineTo(cx + sgn * ex + r * 0.16, ey - r * 0.24);
        ctx.stroke();
      }
    }
  }

  if (lashes) {
    for (const sgn of [-1, 1]) {
      const lx = cx + sgn * (ex + r * 0.14);
      ctx.beginPath();
      ctx.moveTo(lx, ey - r * 0.08);
      ctx.lineTo(lx + sgn * r * 0.10, ey - r * 0.16);
      ctx.moveTo(lx, ey - r * 0.01);
      ctx.lineTo(lx + sgn * r * 0.11, ey - r * 0.06);
      ctx.stroke();
    }
  }

  if (glasses) {
    ctx.save();
    ctx.strokeStyle = "#3a3430";
    ctx.lineWidth = 6;
    const gr = r * 0.25;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sgn * ex, ey, gr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - ex + gr, ey);
    ctx.lineTo(cx + ex - gr, ey);
    ctx.stroke();
    ctx.restore();
  }

  // Mouth (modulated cleanly by lip-sync `talk` when speaking!)
  const my = cy + r * 0.38;
  if (talk > 0.18) {
    const mh = r * (0.08 + 0.14 * Math.min(1, talk));
    const mw = r * 0.20;
    ctx.fillStyle = "#78202a";
    ctx.beginPath();
    ctx.ellipse(cx, my, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expr === "syok" || expr === "takjub" || expr === "kaget") {
    ctx.fillStyle = "#78202a";
    ctx.beginPath();
    ctx.ellipse(cx, my, r * 0.16, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expr === "panik") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.22, my - r * 0.11, r * 0.44, r * 0.22, 10);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.20, my);
    ctx.lineTo(cx + r * 0.20, my);
    ctx.stroke();
  } else if (expr === "heboh") {
    ctx.fillStyle = "#8c242e";
    ctx.beginPath();
    ctx.arc(cx, my - r * 0.04, r * 0.24, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (expr === "senyum_hangat" || expr === "bangga") {
    ctx.beginPath();
    ctx.arc(cx, my - r * 0.04, r * 0.22, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (expr === "pusing" || expr === "khawatir" || expr === "sungkan") {
    ctx.beginPath();
    ctx.arc(cx, my + r * 0.14, r * 0.20, Math.PI + 0.3, Math.PI * 2 - 0.3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.18, my);
    ctx.lineTo(cx + r * 0.18, my);
    ctx.stroke();
  }

  if (sweat) {
    const sx = cx + r * 0.72;
    const sy = cy - r * 0.34;
    ctx.fillStyle = "#7dd2ff";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 20);
    ctx.quadraticCurveTo(sx + 16, sy + 6, sx, sy + 16);
    ctx.quadraticCurveTo(sx - 16, sy + 6, sx, sy - 20);
    ctx.fill();
    ctx.stroke();
  }
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  angle: number,
  len: number,
  sleeveColor: string,
  skinColor: string
) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.fillStyle = sleeveColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(-17, -14, 34, len, 17);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, len - 4, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 1. GEORGE DANTZIG (24 thn)
// ---------------------------------------------------------------------------
export function makeGeorgeTexture(
  expr: GeorgeExpr,
  pose: GeorgePose = "idle",
  talk = 0,
  seated = false
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 768);

  const cx = 256;
  const baseY = 720;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";

  if (!seated) {
    // Shoes
    ctx.fillStyle = "#4e2e1c";
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sgn * 38, baseY - 12, 32, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Trousers
    ctx.fillStyle = "#444852";
    for (const sgn of [-1, 1]) {
      const x0 = cx + (sgn > 0 ? 10 : -54);
      ctx.beginPath();
      ctx.roundRect(x0, baseY - 168, 44, 152, 10);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Torso: Navy sweater vest + white collar + maroon tie
  const ty0 = baseY - 348;
  const ty1 = baseY - 156;
  ctx.fillStyle = "#2c3e66";
  ctx.beginPath();
  ctx.moveTo(cx - 72, ty0 + 12);
  ctx.lineTo(cx + 72, ty0 + 12);
  ctx.lineTo(cx + 78, ty1);
  ctx.lineTo(cx - 78, ty1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Vest shade & hem
  ctx.fillStyle = "#202e4e";
  ctx.fillRect(cx - 76, ty1 - 22, 152, 22);
  ctx.strokeRect(cx - 76, ty1 - 22, 152, 22);
  // White V-shirt + maroon tie
  ctx.fillStyle = "#f6f4ee";
  ctx.beginPath();
  ctx.moveTo(cx - 34, ty0 + 10);
  ctx.lineTo(cx + 34, ty0 + 10);
  ctx.lineTo(cx, ty0 + 88);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#9e262e";
  ctx.beginPath();
  ctx.moveTo(cx - 10, ty0 + 14);
  ctx.lineTo(cx + 10, ty0 + 14);
  ctx.lineTo(cx + 12, ty0 + 66);
  ctx.lineTo(cx, ty0 + 84);
  ctx.lineTo(cx - 12, ty0 + 66);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Articulated Arms by Pose!
  const shY = ty0 + 34;
  if (pose === "clutch_book") {
    drawArm(ctx, cx - 78, shY, -0.55, 118, "#f2f0ea", "#f6ddc2");
    drawArm(ctx, cx + 78, shY, 0.55, 118, "#f2f0ea", "#f6ddc2");
  } else if (pose === "write") {
    drawArm(ctx, cx - 78, shY, -0.30, 122, "#f2f0ea", "#f6ddc2");
    drawArm(ctx, cx + 78, shY, 0.72, 128, "#f2f0ea", "#f6ddc2");
  } else if (pose === "reach_right") {
    drawArm(ctx, cx - 78, shY, 0.08, 128, "#f2f0ea", "#f6ddc2");
    drawArm(ctx, cx + 78, shY, -1.25, 138, "#f2f0ea", "#f6ddc2");
  } else if (pose === "reach_both" || pose === "hold_binder") {
    drawArm(ctx, cx - 78, shY, -0.78, 125, "#f2f0ea", "#f6ddc2");
    drawArm(ctx, cx + 78, shY, 0.78, 125, "#f2f0ea", "#f6ddc2");
  } else if (pose === "scratch_head") {
    drawArm(ctx, cx - 78, shY, 0.12, 126, "#f2f0ea", "#f6ddc2");
    drawArm(ctx, cx + 78, shY, -2.55, 136, "#f2f0ea", "#f6ddc2");
  } else if (pose === "pull_door") {
    drawArm(ctx, cx - 78, shY, 0.12, 126, "#f2f0ea", "#f6ddc2");
    drawArm(ctx, cx + 78, shY, -1.55, 136, "#f2f0ea", "#f6ddc2");
  } else {
    drawArm(ctx, cx - 78, shY, 0.06, 132, "#f2f0ea", "#f6ddc2");
    drawArm(ctx, cx + 78, shY, -0.06, 132, "#f2f0ea", "#f6ddc2");
  }

  // Head + Hair
  const hy = ty0 - 94;
  const hr = 104;
  drawFace(ctx, cx, hy, hr, expr, { sweat: expr === "panik" || expr === "pusing", talk });

  // 1939 Side-part dark brown hair
  ctx.fillStyle = "#362a24";
  ctx.beginPath();
  ctx.arc(cx, hy - 8, hr * 1.04, Math.PI * 1.04, Math.PI * 1.96);
  ctx.quadraticCurveTo(cx + 30, hy - 54, cx - 44, hy - 68);
  ctx.quadraticCurveTo(cx - 88, hy - 44, cx - hr * 1.02, hy - 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (expr === "panik" || expr === "pusing") {
    ctx.beginPath();
    ctx.moveTo(cx + 16, hy - hr);
    ctx.lineTo(cx + 34, hy - hr - 26);
    ctx.moveTo(cx + 2, hy - hr - 2);
    ctx.lineTo(cx + 14, hy - hr - 22);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// 2. PROF. JERZY NEYMAN (45 thn)
// ---------------------------------------------------------------------------
export function makeNeymanTexture(
  expr: NeymanExpr,
  pose: NeymanPose = "idle",
  talk = 0,
  seated = false
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 768);

  const cx = 256;
  const baseY = 720;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";

  if (!seated) {
    ctx.fillStyle = "#201e22";
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sgn * 40, baseY - 12, 34, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#48382e";
    for (const sgn of [-1, 1]) {
      const x0 = cx + (sgn > 0 ? 10 : -56);
      ctx.beginPath();
      ctx.roundRect(x0, baseY - 170, 46, 154, 10);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Tweed jacket torso
  const ty0 = baseY - 356;
  const ty1 = baseY - 154;
  ctx.fillStyle = "#8a6648";
  ctx.beginPath();
  ctx.roundRect(cx - 84, ty0 + 10, 168, ty1 - ty0 - 10, 22);
  ctx.fill();
  ctx.stroke();

  // Cream shirt + lapels + forest green bowtie
  ctx.fillStyle = "#f6f0e0";
  ctx.beginPath();
  ctx.moveTo(cx - 34, ty0 + 10);
  ctx.lineTo(cx + 34, ty0 + 10);
  ctx.lineTo(cx, ty0 + 96);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#76563c";
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sgn * 34, ty0 + 10);
    ctx.lineTo(cx + sgn * 52, ty0 + 66);
    ctx.lineTo(cx, ty0 + 96);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Green bowtie
  ctx.fillStyle = "#266040";
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sgn * 26, ty0 + 22);
    ctx.lineTo(cx, ty0 + 34);
    ctx.lineTo(cx + sgn * 26, ty0 + 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Buttons + handkerchief
  ctx.fillStyle = "#382a20";
  for (const by of [ty0 + 116, ty0 + 150]) {
    ctx.beginPath();
    ctx.arc(cx, by, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f6f4ee";
  ctx.beginPath();
  ctx.moveTo(cx + 28, ty0 + 88);
  ctx.lineTo(cx + 46, ty0 + 66);
  ctx.lineTo(cx + 60, ty0 + 88);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Articulated Arms
  const shY = ty0 + 36;
  if (pose === "point_board") {
    drawArm(ctx, cx - 90, shY, 0.08, 134, "#8a6648", "#f2d6ba");
    drawArm(ctx, cx + 90, shY, -1.95, 144, "#8a6648", "#f2d6ba");
  } else if (pose === "dismiss_wave") {
    drawArm(ctx, cx - 90, shY, 0.25, 128, "#8a6648", "#f2d6ba");
    drawArm(ctx, cx + 90, shY, -1.15, 136, "#8a6648", "#f2d6ba");
  } else if (pose === "wave_paper") {
    drawArm(ctx, cx - 90, shY, 0.30, 128, "#8a6648", "#f2d6ba");
    drawArm(ctx, cx + 90, shY, -2.40, 142, "#8a6648", "#f2d6ba");
  } else if (pose === "hand_paper") {
    drawArm(ctx, cx - 90, shY, 0.95, 138, "#8a6648", "#f2d6ba");
    drawArm(ctx, cx + 90, shY, -0.25, 128, "#8a6648", "#f2d6ba");
  } else {
    drawArm(ctx, cx - 90, shY, 0.06, 134, "#8a6648", "#f2d6ba");
    drawArm(ctx, cx + 90, shY, -0.06, 134, "#8a6648", "#f2d6ba");
  }

  // Head + Silver Side Hair + Thin Round Glasses
  const hy = ty0 - 94;
  const hr = 104;
  ctx.fillStyle = "#9898a0";
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sgn * hr * 0.80, hy - hr * 0.24, hr * 0.26, hr * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  drawFace(ctx, cx, hy, hr, expr, { skin: "#f2d6ba", glasses: true, talk });

  // Wispy silver top tuft
  ctx.save();
  ctx.strokeStyle = "#9898a0";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, hy - hr * 0.14, hr * 0.96, Math.PI * 1.28, Math.PI * 1.72);
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// 3. ANNE DANTZIG (23 thn)
// ---------------------------------------------------------------------------
export function makeAnneTexture(
  expr: AnneExpr,
  pose: AnnePose = "idle",
  talk = 0
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 768);

  const cx = 256;
  const baseY = 720;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";

  // Legs + brown flats
  for (const sgn of [-1, 1]) {
    const lx = cx + sgn * 32;
    ctx.fillStyle = "#f6dec6";
    ctx.beginPath();
    ctx.roundRect(lx - 15, baseY - 134, 30, 118, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#74442e";
    ctx.beginPath();
    ctx.ellipse(lx, baseY - 12, 26, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Pastel Blue 1939 A-line skirt
  const ty0 = baseY - 338;
  const waistY = baseY - 220;
  ctx.fillStyle = "#82aed6";
  ctx.beginPath();
  ctx.moveTo(cx - 60, waistY);
  ctx.lineTo(cx + 60, waistY);
  ctx.lineTo(cx + 98, baseY - 108);
  ctx.lineTo(cx - 98, baseY - 108);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cream cardigan bodice + brown waist belt + peter-pan collar
  ctx.fillStyle = "#f4e8ce";
  ctx.beginPath();
  ctx.roundRect(cx - 68, ty0 + 10, 136, waistY - ty0 - 8, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#82aed6";
  ctx.beginPath();
  ctx.moveTo(cx - 24, ty0 + 12);
  ctx.lineTo(cx + 24, ty0 + 12);
  ctx.lineTo(cx, waistY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fcfaf6";
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sgn * 22, ty0 + 20, 22, 16, sgn * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#c48e4e";
  ctx.beginPath();
  ctx.roundRect(cx - 64, waistY - 12, 128, 22, 8);
  ctx.fill();
  ctx.stroke();

  // Articulated Arms
  const shY = ty0 + 34;
  if (pose === "carry_mug") {
    drawArm(ctx, cx - 76, shY, -0.75, 115, "#f4e8ce", "#f8e0c8");
    drawArm(ctx, cx + 76, shY, 0.75, 115, "#f4e8ce", "#f8e0c8");
  } else if (pose === "place_mug") {
    drawArm(ctx, cx - 76, shY, 1.15, 128, "#f4e8ce", "#f8e0c8");
    drawArm(ctx, cx + 76, shY, -0.15, 118, "#f4e8ce", "#f8e0c8");
  } else if (pose === "gasp") {
    drawArm(ctx, cx - 76, shY, -2.15, 118, "#f4e8ce", "#f8e0c8");
    drawArm(ctx, cx + 76, shY, 2.15, 118, "#f4e8ce", "#f8e0c8");
  } else if (pose === "clap") {
    drawArm(ctx, cx - 76, shY, -1.05, 112, "#f4e8ce", "#f8e0c8");
    drawArm(ctx, cx + 76, shY, 1.05, 112, "#f4e8ce", "#f8e0c8");
  } else {
    drawArm(ctx, cx - 76, shY, 0.08, 122, "#f4e8ce", "#f8e0c8");
    drawArm(ctx, cx + 76, shY, -0.08, 122, "#f4e8ce", "#f8e0c8");
  }

  // Head + 1930s wavy brown bob + yellow hair clip
  const hy = ty0 - 92;
  const hr = 100;
  ctx.fillStyle = "#6c422a";
  ctx.beginPath();
  ctx.roundRect(cx - hr * 1.14, hy - hr * 0.70, hr * 2.28, hr * 1.88, 66);
  ctx.fill();
  ctx.stroke();

  drawFace(ctx, cx, hy, hr, expr, { skin: "#f8e0c8", lashes: true, blush: true, talk });

  // Front bangs + clip
  ctx.fillStyle = "#6c422a";
  ctx.beginPath();
  ctx.arc(cx, hy - 8, hr * 1.03, Math.PI * 1.06, Math.PI * 1.94);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#eec044";
  ctx.beginPath();
  ctx.roundRect(cx - hr * 0.76, hy - hr * 0.56, hr * 0.34, hr * 0.14, 7);
  ctx.fill();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// 4. CLASSMATE FIGURAN (1939 seated students)
// ---------------------------------------------------------------------------
export function makeClassmateTexture(shirtColor: string, hairColor: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 460;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 384, 460);
  const cx = 192;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;

  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(cx - 64, 265, 128, 175, 24);
  ctx.fill();
  ctx.stroke();

  drawFace(ctx, cx, 175, 88, "fokus", { skin: "#f5dbc0" });
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(cx, 166, 91, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

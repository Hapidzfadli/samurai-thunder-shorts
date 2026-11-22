// Gaya "3D explainer" (referensi: analysis/text/analisis_video_apache_3d.md):
// toon shading + garis tepi hitam (inverted hull, tebal konstan di layar),
// tokoh kepala bulat 3D dengan wajah ekspresif, material X-ray, lantai grid biru, subtitle 1 kata.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Vec3 = [number, number, number];

/* ---------------- geometri (di-cache supaya tidak dibuat ulang tiap frame) ---------------- */
const gcache = new Map<string, THREE.BufferGeometry>();
const memo = (k: string, f: () => THREE.BufferGeometry) => {
  let g = gcache.get(k);
  if (!g) {
    g = f();
    gcache.set(k, g);
  }
  return g;
};
export const G = {
  box: (w: number, h: number, d: number) => memo(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt: number, rb: number, h: number, s = 18, open = false, t0 = 0, tl = Math.PI * 2) =>
    memo(`cyl${rt},${rb},${h},${s},${open},${t0},${tl}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open, t0, tl)),
  sph: (r: number, w = 28, h = 18) => memo(`sph${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h)),
  dome: (r: number, th: number, w = 28) => memo(`dome${r},${th},${w}`, () => new THREE.SphereGeometry(r, w, 12, 0, Math.PI * 2, 0, th)),
  cap: (r: number, len: number, s = 16) => memo(`cap${r},${len},${s}`, () => new THREE.CapsuleGeometry(r, len, 6, s)),
  cone: (r: number, h: number, s = 14) => memo(`cone${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)),
  tor: (R: number, r: number, rs = 8, ts = 28, arc = Math.PI * 2) => memo(`tor${R},${r},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc)),
  ico: (r: number, d = 0) => memo(`ico${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
  dodec: (r: number) => memo(`dod${r}`, () => new THREE.DodecahedronGeometry(r, 0)),
  // cincin datar tebal (tepi topi, roda): sektor dari t0 sepanjang tl, berbaring di bidang XZ
  annulus: (rIn: number, rOut: number, t0 = 0, tl = Math.PI * 2, depth = 0.03) =>
    memo(`ann${rIn},${rOut},${t0},${tl},${depth}`, () => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, rOut, t0, t0 + tl, false);
      sh.absarc(0, 0, rIn, t0 + tl, t0, true);
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 32 });
      g.translate(0, 0, -depth / 2);
      g.rotateX(Math.PI / 2);
      return g;
    }),
  // kotak membulat (karung pasir, bantal, kursi)
  rbox: (w: number, h: number, d: number, rr = 0.25) =>
    memo(`rbox${w},${h},${d},${rr}`, () => {
      const g = new THREE.BoxGeometry(w, h, d, 6, 4, 6);
      const p = g.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = new THREE.Vector3(v.x / (w / 2), v.y / (h / 2), v.z / (d / 2));
        const k = Math.pow(Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)), 1);
        const s = n.clone().normalize().multiplyScalar(k);
        n.lerp(s, rr);
        p.setXYZ(i, (n.x * w) / 2, (n.y * h) / 2, (n.z * d) / 2);
      }
      g.computeVertexNormals();
      return g;
    }),
};

/* ---------------- material ---------------- */
let GRAD: THREE.DataTexture | null = null;
export const toonGradient = () => {
  if (!GRAD) {
    const d = new Uint8Array([105, 165, 215, 255]);
    GRAD = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
    GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
    GRAD.generateMipmaps = false;
    GRAD.needsUpdate = true;
  }
  return GRAD;
};
const toonMats = new Map<string, THREE.MeshToonMaterial>();
export const toonMat = (c: string, emissive = "#000000", ei = 0) => {
  const k = `${c}|${emissive}|${ei}`;
  let m = toonMats.get(k);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient(), emissive, emissiveIntensity: ei });
    toonMats.set(k, m);
  }
  return m;
};

// garis tepi: hull terbalik, didorong sepanjang normal di ruang layar (tebal konstan dalam piksel)
export const OUTLINE_RES = { value: new THREE.Vector2(1080, 1920) };
const outlineMats = new Map<string, THREE.ShaderMaterial>();
export const outlineMat = (px = 3, color = "#14121a") => {
  const k = `${px}|${color}`;
  let m = outlineMats.get(k);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uPx: { value: px }, uRes: OUTLINE_RES, uColor: { value: new THREE.Color(color) } },
      vertexShader: /* glsl */ `
        uniform float uPx; uniform vec2 uRes;
        void main(){
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vec2 dir = (projectionMatrix * vec4(n, 0.0)).xy;
          float l = length(dir);
          if (l > 1e-5) clip.xy += (dir / l) * uPx * 2.0 / uRes * clip.w;
          gl_Position = clip;
        }`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
    });
    outlineMats.set(k, m);
  }
  return m;
};
const hulls = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
export const hullOf = (g: THREE.BufferGeometry) => {
  let h = hulls.get(g);
  if (!h) {
    const c = g.clone();
    for (const k of Object.keys(c.attributes)) if (k !== "position") c.deleteAttribute(k);
    h = mergeVertices(c, 1e-4);
    h.computeVertexNormals();
    hulls.set(g, h);
  }
  return h;
};

export const ToonRes: React.FC = () => {
  const size = useThree((s) => s.size);
  OUTLINE_RES.value.set(size.width, size.height);
  return null;
};

/* ---------------- komponen dasar ---------------- */
export type TProps = {
  g: THREE.BufferGeometry;
  c: string;
  o?: number | false; // tebal garis tepi (px), false = tanpa garis
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  emissive?: string;
  ei?: number;
  shadow?: boolean;
  children?: React.ReactNode;
};
export const T: React.FC<TProps> = ({ g, c, o = 3, position, rotation, scale, emissive, ei = 0, shadow = true, children }) => (
  <group position={position} rotation={rotation} scale={scale as any}>
    <mesh geometry={g} material={toonMat(c, emissive, ei)} castShadow={shadow} receiveShadow />
    {o ? <mesh geometry={hullOf(g)} material={outlineMat(o)} /> : null}
    {children}
  </group>
);

// batang dari titik a ke titik b (lengan, kaki, pipa, tiang miring)
export const Limb: React.FC<{ a: Vec3; b: Vec3; r: number; c: string; o?: number | false; cap?: boolean }> = ({ a, b, r, c, o = 3, cap = true }) => {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = Math.max(d.length(), 1e-4);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  return (
    <T g={cap ? G.cap(r, Math.max(0.001, len), 10) : G.cyl(r, r, len, 10)} c={c} o={o} position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]} />
  );
};

/* ---------------- X-ray / hologram ---------------- */
const xrayMats = new Map<string, THREE.ShaderMaterial>();
export const xrayMat = (color = "#5fd4ff", base = 0.12) => {
  const k = `${color}|${base}`;
  let m = xrayMats.get(k);
  if (!m) {
    m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uBase; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
          gl_FragColor = vec4(uColor * (0.55 + 0.9*f), uBase + 0.55*f); }`,
    });
    xrayMats.set(k, m);
  }
  return m;
};
const edgeCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
export const XR: React.FC<{ g: THREE.BufferGeometry; position?: Vec3; rotation?: Vec3; scale?: number | Vec3; color?: string; edges?: boolean }> = ({
  g,
  position,
  rotation,
  scale,
  color = "#5fd4ff",
  edges = true,
}) => {
  let e = edgeCache.get(g);
  if (!e) {
    e = new THREE.EdgesGeometry(g, 28);
    edgeCache.set(g, e);
  }
  return (
    <group position={position} rotation={rotation} scale={scale as any}>
      <mesh geometry={g} material={xrayMat(color)} renderOrder={2} />
      {edges ? (
        <lineSegments geometry={e} renderOrder={3}>
          <lineBasicMaterial color={color} transparent opacity={0.75} depthWrite={false} />
        </lineSegments>
      ) : null}
    </group>
  );
};

export const BlueGrid: React.FC<{ size?: number; y?: number }> = ({ size = 60, y = 0 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
        fragmentShader: /* glsl */ `
          varying vec3 vW;
          float line(float x, float w){ float d = abs(fract(x - 0.5) - 0.5); return 1.0 - smoothstep(0.0, w, d); }
          void main(){
            float g = max(line(vW.x, 0.035), line(vW.z, 0.035));
            float g2 = max(line(vW.x*4.0, 0.06), line(vW.z*4.0, 0.06)) * 0.25;
            float fade = exp(-length(vW.xz) * 0.06);
            vec3 base = mix(vec3(0.02,0.08,0.2), vec3(0.04,0.22,0.48), fade);
            vec3 col = base + vec3(0.25,0.65,1.0) * (g + g2) * (0.35 + 0.65*fade);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    []
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

/* ---------------- tokoh kepala bulat 3D ---------------- */
export type Expr3 = "neutral" | "smug" | "shock" | "angry" | "happy" | "worried" | "determined" | "laugh" | "puzzled" | "shout" | "proud" | "sleepy";
export type Bean3Params = {
  body: string; // warna baju
  pants?: string;
  boots?: string;
  glove?: string; // warna tangan (bola)
  skin?: string; // warna kepala
  sleeve?: string;
  hat?: "peaked" | "slouch" | "wide" | "fedora" | "cap" | "peci" | "none";
  hatColor?: string;
  hatBand?: string;
  expr?: Expr3;
  look?: number; // arah lirikan -1..1
  belt?: string;
  strap?: string; // tali selempang (Sam Browne)
  pockets?: boolean;
  collar?: string;
  mustache?: boolean;
  braces?: string; // bretel petani
  plaid?: string; // kotak-kotak flanel
  handL?: Vec3; // posisi tangan relatif kaki tokoh
  handR?: Vec3;
  bob?: number;
  lean?: number; // condong maju (rad)
  headTilt?: number;
  headTurn?: number;
  walk?: number; // fase langkah (rad); undefined = berdiri
  talk?: number; // 0..1 bukaan mulut saat bicara
  hair?: string; // rambut (untuk tokoh tanpa topi)
  seated?: boolean; // duduk (kaki ke depan)
  kneel?: number; // 0..1 berlutut/jongkok di balik karung pasir
  tie?: string; // dasi (jas)
  shirt?: string; // kerah kemeja di balik jas
  medal?: boolean; // medali veteran di dada
  hide?: "hat"[]; // sembunyikan bagian (topi dipegang/terlempar sebagai benda terpisah)
  ponytail?: boolean; // kuncir kuda (warna = hair)
  longHair?: boolean; // rambut panjang terurai di belakang (warna = hair)
  hijab?: string; // jilbab (menutup rambut & leher, wajah tetap terbuka)
  backpack?: string; // ransel di punggung
  headphones?: string; // headphone melingkar di leher
  glassesUp?: boolean; // kacamata diletakkan di atas kepala
  hood?: string; // tudung hoodie di belakang leher
};
const FACE = 512;
type FaceSlot = { cv: HTMLCanvasElement; tex: THREE.DataTexture; buf: Uint8Array; key: string };
const drawFace = (ctx: CanvasRenderingContext2D, expr: Expr3, look: number, mustache: boolean, talk = 0) => {
  const W = FACE;
  ctx.clearRect(0, 0, W, W);
  const ink = "#3b3a44";
  const ex = W * 0.5,
    ey = W * 0.535;
  const dx = W * 0.15;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // alis: tebal, lembut
  const brow = (x: number, y: number, ang: number, len = 70, th = 22, curve = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(70,68,80,0.92)";
    ctx.lineWidth = th;
    ctx.shadowColor = "rgba(40,40,50,0.45)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.quadraticCurveTo(0, -curve, len / 2, 0);
    ctx.stroke();
    ctx.restore();
  };
  const eye = (x: number, y: number, open = 1, r = 24) => {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(x + look * 10, y, r * 0.8, r * Math.max(0.12, open), 0, 0, Math.PI * 2);
    ctx.fill();
    if (open > 0.5) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(x + look * 10 - r * 0.25, y - r * 0.35 * open, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const arc = (x: number, y: number, up: boolean, r = 26) => {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 11;
    ctx.beginPath();
    if (up) ctx.arc(x, y + r * 0.5, r, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(x, y - r * 0.5, r, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  };
  const mouth = (kind0: "line" | "smirk" | "o" | "frown" | "smile" | "open" | "wavy") => {
    const my = W * 0.715;
    let kind = kind0;
    if (talk > 0.12 && kind0 !== "open" && kind0 !== "o") {
      // mulut bicara: elips terbuka, tinggi mengikuti suara
      ctx.strokeStyle = ink;
      ctx.fillStyle = "#4a2a30";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(ex, my + 4, 30 + talk * 10, 8 + talk * 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = ink;
    ctx.fillStyle = "#4a2a30";
    ctx.lineWidth = 9;
    ctx.beginPath();
    if (kind === "line") {
      ctx.moveTo(ex - 40, my);
      ctx.lineTo(ex + 40, my);
      ctx.stroke();
    } else if (kind === "smirk") {
      ctx.moveTo(ex - 38, my + 2);
      ctx.quadraticCurveTo(ex + 10, my + 8, ex + 44, my - 12);
      ctx.stroke();
    } else if (kind === "frown") {
      ctx.moveTo(ex - 40, my + 10);
      ctx.quadraticCurveTo(ex, my - 16, ex + 40, my + 10);
      ctx.stroke();
    } else if (kind === "smile") {
      ctx.moveTo(ex - 48, my - 8);
      ctx.quadraticCurveTo(ex, my + 30, ex + 48, my - 8);
      ctx.stroke();
    } else if (kind === "wavy") {
      ctx.moveTo(ex - 40, my);
      ctx.bezierCurveTo(ex - 20, my - 12, ex, my + 12, ex + 20, my);
      ctx.quadraticCurveTo(ex + 32, my - 8, ex + 40, my);
      ctx.stroke();
    } else if (kind === "o") {
      ctx.ellipse(ex, my + 4, 20, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.moveTo(ex - 52, my - 10);
      ctx.quadraticCurveTo(ex, my + 52, ex + 52, my - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };
  const by = W * 0.375;
  switch (expr) {
    case "smug":
      brow(ex - dx, by - 14, -0.18, 76, 22, 8);
      brow(ex + dx, by + 6, 0.06, 76, 22);
      eye(ex - dx, ey, 1);
      eye(ex + dx, ey + 4, 0.35);
      mouth("smirk");
      break;
    case "shock":
      brow(ex - dx, by - 26, 0.12, 64, 20, 14);
      brow(ex + dx, by - 26, -0.12, 64, 20, 14);
      eye(ex - dx, ey, 1.15, 22);
      eye(ex + dx, ey, 1.15, 22);
      mouth("o");
      break;
    case "angry":
      brow(ex - dx, by + 8, 0.38, 78, 24);
      brow(ex + dx, by + 8, -0.38, 78, 24);
      eye(ex - dx, ey + 6, 0.55);
      eye(ex + dx, ey + 6, 0.55);
      mouth("frown");
      break;
    case "happy":
      brow(ex - dx, by - 14, -0.08, 66, 20, 10);
      brow(ex + dx, by - 14, 0.08, 66, 20, 10);
      arc(ex - dx, ey, true);
      arc(ex + dx, ey, true);
      mouth("smile");
      break;
    case "laugh":
      brow(ex - dx, by - 18, -0.12, 66, 20, 12);
      brow(ex + dx, by - 18, 0.12, 66, 20, 12);
      arc(ex - dx, ey, true);
      arc(ex + dx, ey, true);
      mouth("open");
      break;
    case "worried":
      brow(ex - dx, by - 6, -0.32, 70, 20);
      brow(ex + dx, by - 6, 0.32, 70, 20);
      eye(ex - dx, ey, 0.85);
      eye(ex + dx, ey, 0.85);
      mouth("wavy");
      break;
    case "determined":
      brow(ex - dx, by + 2, 0.16, 80, 24);
      brow(ex + dx, by + 2, -0.16, 80, 24);
      eye(ex - dx, ey + 2, 0.7);
      eye(ex + dx, ey + 2, 0.7);
      mouth("line");
      break;
    case "shout":
      brow(ex - dx, by + 6, 0.42, 80, 26);
      brow(ex + dx, by + 6, -0.42, 80, 26);
      eye(ex - dx, ey + 4, 0.6);
      eye(ex + dx, ey + 4, 0.6);
      mouth("open");
      break;
    case "sleepy":
      // mata panda: kantung gelap + mata setengah tertutup
      ctx.fillStyle = "rgba(90,80,120,0.45)";
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(ex + sx * dx, ey + 26, 38, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      brow(ex - dx, by + 4, -0.18, 68, 20);
      brow(ex + dx, by + 4, 0.18, 68, 20);
      eye(ex - dx, ey + 6, 0.22);
      eye(ex + dx, ey + 6, 0.22);
      mouth("wavy");
      break;
    case "proud":
      brow(ex - dx, by - 10, -0.12, 74, 22, 6);
      brow(ex + dx, by - 10, 0.12, 74, 22, 6);
      eye(ex - dx, ey + 4, 0.4);
      eye(ex + dx, ey + 4, 0.4);
      mouth("smirk");
      break;
    case "puzzled":
      brow(ex - dx, by - 20, -0.1, 70, 22, 12);
      brow(ex + dx, by + 6, -0.22, 70, 22);
      eye(ex - dx, ey, 1);
      eye(ex + dx, ey + 2, 0.6);
      mouth("wavy");
      break;
    default:
      brow(ex - dx, by - 4, 0, 70, 22);
      brow(ex + dx, by - 4, 0, 70, 22);
      eye(ex - dx, ey, 0.9);
      eye(ex + dx, ey, 0.9);
      mouth("line");
  }
  if (mustache) {
    // kumis tipis, di atas mulut (tidak menutupi mulut)
    ctx.fillStyle = "#5a4636";
    const my = W * 0.64;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(ex, my);
      ctx.quadraticCurveTo(ex + s * 40, my - 14, ex + s * 70, my + 6);
      ctx.quadraticCurveTo(ex + s * 40, my + 4, ex, my + 10);
      ctx.fill();
    }
  }
};

const FaceDecal: React.FC<{ r: number; expr: Expr3; look: number; mustache: boolean; talk?: number }> = ({ r, expr, look, mustache, talk = 0 }) => {
  const slot = useMemo<FaceSlot>(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = FACE;
    const buf = new Uint8Array(FACE * FACE * 4);
    const tex = new THREE.DataTexture(buf, FACE, FACE, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return { cv, tex, buf, key: "" };
  }, []);
  const tq = Math.round(talk * 6) / 6;
  const key = `${expr}|${look.toFixed(2)}|${mustache}|${tq}`;
  if (slot.key !== key) {
    const ctx = slot.cv.getContext("2d", { willReadFrequently: true })!;
    drawFace(ctx, expr, look, mustache, tq);
    slot.buf.set(ctx.getImageData(0, 0, FACE, FACE).data);
    slot.key = key;
  }
  // aturan teknis: tekstur diunggah ulang setiap frame (render video kosong kalau tidak)
  slot.tex.needsUpdate = true;
  const PHI = 1.05,
    TH = 0.95;
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[r * 1.004, 40, 30, Math.PI / 2 - PHI, PHI * 2, Math.PI / 2 - TH, TH * 2]} />
      <meshBasicMaterial map={slot.tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
    </mesh>
  );
};

export const Hat: React.FC<{ kind: Bean3Params["hat"]; c: string; band: string; r: number }> = ({ kind, c, band, r }) => {
  if (!kind || kind === "none") return null;
  if (kind === "peaked")
    return (
      <group position={[0, r * 0.68, 0]} rotation={[-0.12, 0, 0]}>
        <T g={G.cyl(r * 0.98, r * 0.8, r * 0.36, 28)} c={c} position={[0, r * 0.3, -0.01]} />
        <T g={G.cyl(r * 0.82, r * 0.82, r * 0.16, 28)} c={band} position={[0, r * 0.06, 0]} o={2} />
        {/* pet topi menonjol ke depan, di atas alis */}
        <T g={G.cyl(r * 0.98, r * 0.98, 0.025, 28, false, -Math.PI / 2, Math.PI)} c="#1a1814" position={[0, -r * 0.02, r * 0.05]} rotation={[0.2, 0, 0]} scale={[0.82, 1, 1]} o={2} />
        <T g={G.sph(r * 0.08, 10, 8)} c="#e8c050" position={[0, r * 0.26, r * 0.86]} o={2} emissive="#6a4a00" ei={0.4} />
      </group>
    );
  if (kind === "peci")
    // peci/songkok hitam: rendah di atas dahi, alis tetap terlihat
    return (
      <group position={[0, r * 0.62, -r * 0.04]} rotation={[-0.14, 0, 0]}>
        <T g={G.cyl(r * 0.8, r * 0.86, r * 0.44, 28)} c={c} position={[0, r * 0.16, 0]} scale={[1, 1, 0.94]} />
        <T g={G.cyl(r * 0.81, r * 0.81, r * 0.02, 28)} c={band} position={[0, r * 0.36, 0]} scale={[1, 1, 0.94]} o={false} />
        <T g={G.cyl(r * 0.865, r * 0.87, r * 0.05, 28)} c={band} position={[0, -r * 0.04, 0]} scale={[1, 1, 0.94]} o={2} />
      </group>
    );
  if (kind === "cap")
    // topi baseball dipakai terbalik: pet di belakang, dahi & alis tetap terlihat
    return (
      <group position={[0, 0, 0]} rotation={[-0.35, 0, 0]}>
        <T g={G.dome(r * 1.05, 0.95)} c={c} />
        <T g={G.sph(r * 0.08, 10, 8)} c={band} position={[0, r * 0.55, 0]} o={2} />
        <T g={G.cyl(r * 0.75, r * 0.75, 0.025, 24, false, Math.PI / 2, Math.PI)} c={band} position={[0, r * 0.2, -r * 0.55]} rotation={[-0.25, 0, 0]} scale={[0.8, 1, 1]} o={2} />
      </group>
    );
  if (kind === "fedora")
    return (
      <group position={[0, r * 0.66, 0]} rotation={[-0.1, 0, 0.06]}>
        <T g={G.cyl(r * 0.6, r * 0.78, r * 0.48, 24)} c={c} position={[0, r * 0.24, 0]} scale={[1, 1, 0.9]} />
        <T g={G.box(r * 0.5, r * 0.08, r * 0.2)} c={c} position={[0, r * 0.49, 0]} o={2} />
        <T g={G.cyl(r * 0.79, r * 0.79, r * 0.12, 24)} c={band} position={[0, r * 0.04, 0]} scale={[1, 1, 0.9]} o={2} />
        <T g={G.annulus(r * 0.75, r * 1.25, 0, Math.PI * 2)} c={c} o={2} scale={[1, 1, 0.92]} />
      </group>
    );
  if (kind === "slouch")
    return (
      <group position={[0, r * 0.7, 0]} rotation={[-0.08, 0, 0]}>
        <T g={G.cyl(r * 0.66, r * 0.8, r * 0.42, 24)} c={c} position={[0, r * 0.2, 0]} />
        <T g={G.cyl(r * 0.81, r * 0.81, r * 0.12, 24)} c={band} position={[0, r * 0.02, 0]} o={2} />
        {/* tepi datar di depan/belakang/kanan; hanya sisi samping yang dilipat ke atas (khas topi Australia) */}
        <T g={G.annulus(r * 0.78, r * 1.45, -0.75 * Math.PI, 1.5 * Math.PI)} c={c} o={2} />
        <group position={[-r * 0.55, 0, 0]} rotation={[0, 0, -1.25]}>
          <T g={G.annulus(r * 0.78, r * 1.45, 0.75 * Math.PI, 0.5 * Math.PI)} c={c} position={[r * 0.55, 0, 0]} o={2} />
        </group>
        <T g={G.sph(r * 0.1, 10, 8)} c="#c8a040" position={[-r * 1.02, r * 0.4, 0]} o={2} />
      </group>
    );
  return (
    <group position={[0, r * 0.62, 0]} rotation={[-0.1, 0, 0]}>
      <T g={G.cyl(r * 0.6, r * 0.75, r * 0.5, 24)} c={c} position={[0, r * 0.25, 0]} />
      <T g={G.cyl(r * 0.76, r * 0.76, r * 0.12, 24)} c={band} position={[0, r * 0.04, 0]} o={2} />
      <T g={G.cyl(r * 1.6, r * 1.6, 0.03, 32)} c={c} o={2} />
    </group>
  );
};

export const HEAD_R = 0.46;
const bodyOffset = (p: Bean3Params): Vec3 => {
  const walkBob = p.walk !== undefined ? Math.abs(Math.sin(p.walk)) * 0.035 : 0;
  const kneel = p.kneel ?? 0;
  return [0, (p.bob ?? 0) + walkBob - kneel * 0.32 - (p.seated ? 0.2 : 0), 0];
};
const defaultHand = (p: Bean3Params, side: -1 | 1): Vec3 => {
  const sw = p.walk !== undefined ? Math.sin(p.walk) * 0.16 * side : 0;
  return [side * 0.42, 0.6, 0.1 + sw];
};
/** posisi dunia tangan tokoh (untuk benda yang dipegang / berpindah tangan) */
export const bean3HandWorld = (p: Bean3Params, side: "L" | "R", position: Vec3, rotY = 0, scale = 1): Vec3 => {
  const h = side === "L" ? p.handL ?? defaultHand(p, -1) : p.handR ?? defaultHand(p, 1);
  const off = bodyOffset(p);
  const lean = p.lean ?? 0;
  const y = h[1] * Math.cos(lean) - h[2] * Math.sin(lean);
  const z = h[1] * Math.sin(lean) + h[2] * Math.cos(lean);
  const lx = h[0] * scale,
    ly = (y + off[1]) * scale,
    lz = z * scale;
  return [position[0] + lx * Math.cos(rotY) + lz * Math.sin(rotY), position[1] + ly, position[2] - lx * Math.sin(rotY) + lz * Math.cos(rotY)];
};
/** posisi dunia puncak kepala (untuk topi yang dipakaikan) */
export const bean3HeadWorld = (p: Bean3Params, position: Vec3, rotY = 0, scale = 1): Vec3 => {
  const off = bodyOffset(p);
  return [position[0], position[1] + (1.42 + off[1]) * scale, position[2]];
};

export const Bean3: React.FC<{ p: Bean3Params; position?: Vec3; rotation?: Vec3; scale?: number; children?: React.ReactNode }> = ({ p, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, children }) => {
  const R = HEAD_R;
  const skin = p.skin ?? "#f4f1ec";
  const glove = p.glove ?? "#2a2a2e";
  const sleeve = p.sleeve ?? p.body;
  const pants = p.pants ?? p.body;
  const boots = p.boots ?? "#2e241c";
  const off = bodyOffset(p);
  const SH: Vec3[] = [
    [-0.25, 1.0, 0.02],
    [0.25, 1.0, 0.02],
  ];
  const hL = p.handL ?? defaultHand(p, -1);
  const hR = p.handR ?? defaultHand(p, 1);
  const kneel = p.kneel ?? 0;
  const leg = (side: -1 | 1) => {
    const x = side * 0.12;
    if (p.seated)
      return (
        <group key={side} position={[x, 0.2, 0]}>
          <Limb a={[0, 0, 0]} b={[0, 0, 0.34]} r={0.075} c={pants} />
          <Limb a={[0, 0, 0.34]} b={[0, -0.2, 0.36]} r={0.07} c={pants} />
          <T g={G.rbox(0.17, 0.11, 0.26, 0.5)} c={boots} position={[0, -0.25, 0.42]} />
        </group>
      );
    const swing = p.walk !== undefined ? Math.sin(p.walk) * 0.55 * -side : 0;
    const lift = p.walk !== undefined ? Math.max(0, Math.sin(p.walk * side)) * 0.05 : 0;
    return (
      <group key={side} position={[x, 0.38 - kneel * 0.32 + lift, 0]} rotation={[swing - kneel * 0.9, 0, 0]}>
        <T g={G.cyl(0.075, 0.07, 0.36, 12)} c={pants} position={[0, -0.18, 0]} />
        <T g={G.rbox(0.17, 0.11, 0.26, 0.5)} c={boots} position={[0, -0.325, 0.04]} rotation={[kneel * 0.9, 0, 0]} />
      </group>
    );
  };
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {leg(-1)}
      {leg(1)}
      <group position={off} rotation={[p.lean ?? 0, 0, 0]}>
        {/* badan */}
        <T g={G.cap(0.29, 0.42, 20)} c={p.body} position={[0, 0.76, 0]} />
        {p.shirt ? <T g={G.cone(0.13, 0.3, 3)} c={p.shirt} position={[0, 0.97, 0.235]} rotation={[0.25, 0, Math.PI]} o={2} /> : null}
        {p.tie ? <T g={G.box(0.06, 0.26, 0.02)} c={p.tie} position={[0, 0.9, 0.285]} rotation={[-0.1, 0, 0]} o={2} /> : null}
        {p.plaid ? (
          <>
            {[-0.16, 0, 0.16].map((x) => (
              <T key={x} g={G.box(0.035, 0.62, 0.02)} c={p.plaid!} o={false} position={[x, 0.78, 0.285]} />
            ))}
            {[0.62, 0.82].map((y) => (
              <T key={y} g={G.box(0.5, 0.03, 0.02)} c={p.plaid!} o={false} position={[0, y, 0.282]} />
            ))}
          </>
        ) : null}
        {p.pockets ? (
          <>
            <T g={G.rbox(0.13, 0.1, 0.03, 0.4)} c={p.body} position={[-0.12, 0.88, 0.27]} rotation={[-0.15, -0.35, 0]} o={2} />
            <T g={G.rbox(0.13, 0.1, 0.03, 0.4)} c={p.body} position={[0.12, 0.88, 0.27]} rotation={[-0.15, 0.35, 0]} o={2} />
            {[0.99, 0.86, 0.73, 0.6].map((y) => (
              <T key={y} g={G.sph(0.018, 8, 6)} c="#c8a040" o={false} position={[0, y, 0.292]} />
            ))}
          </>
        ) : null}
        {p.medal ? (
          <group position={[-0.14, 0.9, 0.27]}>
            <T g={G.box(0.05, 0.07, 0.015)} c="#c8323a" o={2} position={[0, 0.04, 0]} />
            <T g={G.cyl(0.035, 0.035, 0.015, 14)} c="#e8c050" o={2} rotation={[Math.PI / 2, 0, 0]} emissive="#6a4a00" ei={0.4} />
          </group>
        ) : null}
        {p.collar ? <T g={G.cyl(0.2, 0.26, 0.08, 18)} c={p.collar} position={[0, 1.06, 0]} o={2} /> : null}
        {p.hood ? <T g={G.tor(0.2, 0.08, 8, 20)} c={p.hood} position={[0, 1.06, -0.12]} rotation={[Math.PI / 2 + 0.3, 0, 0]} o={2} /> : null}
        {p.headphones ? (
          <group position={[0, 1.08, 0]}>
            <T g={G.tor(0.21, 0.025, 6, 24, Math.PI)} c={p.headphones} rotation={[Math.PI / 2, 0, 0]} o={2} />
            {[-1, 1].map((sd) => (
              <T key={sd} g={G.cyl(0.07, 0.07, 0.05, 14)} c={p.headphones!} position={[sd * 0.21, 0, 0.02]} rotation={[0, 0, Math.PI / 2]} o={2} />
            ))}
          </group>
        ) : null}
        {p.backpack ? (
          <group position={[0, 0.82, -0.32]}>
            <T g={G.rbox(0.44, 0.52, 0.2, 0.4)} c={p.backpack} />
            <T g={G.rbox(0.3, 0.2, 0.08, 0.4)} c={p.backpack} position={[0, -0.12, -0.12]} o={2} />
            {[-0.14, 0.14].map((x) => (
              <T key={x} g={G.box(0.05, 0.55, 0.02)} c="#2a2a30" position={[x, 0.08, 0.61]} rotation={[0.05, 0, 0]} o={2} />
            ))}
          </group>
        ) : null}
        {p.belt ? <T g={G.tor(0.29, 0.035, 6, 28)} c={p.belt} position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} o={2} /> : null}
        {p.strap ? <T g={G.box(0.05, 0.62, 0.02)} c={p.strap} position={[0.02, 0.8, 0.27]} rotation={[0, 0, -0.55]} o={2} /> : null}
        {p.braces
          ? [-0.11, 0.11].map((x) => <T key={x} g={G.box(0.045, 0.5, 0.02)} c={p.braces!} position={[x, 0.82, 0.282]} o={2} />)
          : null}
        {/* lengan tongkat + tangan bola */}
        <Limb a={SH[0]} b={hL} r={0.05} c={sleeve} />
        <Limb a={SH[1]} b={hR} r={0.05} c={sleeve} />
        <T g={G.sph(0.085, 14, 10)} c={glove} position={hL} />
        <T g={G.sph(0.085, 14, 10)} c={glove} position={hR} />
        {/* kepala */}
        <group position={[0, 1.42, 0]} rotation={[p.headTilt ?? 0, p.headTurn ?? 0, 0]}>
          <T g={G.sph(R, 36, 24)} c={skin} emissive="#ffffff" ei={0.08} />
          <FaceDecal r={R} expr={p.expr ?? "neutral"} look={p.look ?? 0} mustache={!!p.mustache} talk={p.talk ?? 0} />
          {p.hair && !p.hijab ? <T g={G.dome(R * 1.035, 1.2)} c={p.hair} rotation={[-0.42, 0, 0]} o={2} /> : null}
          {p.hair && p.longHair && !p.hijab ? <T g={G.cap(R * 0.75, R * 0.9, 18)} c={p.hair} position={[0, -R * 0.35, -R * 0.42]} scale={[1.15, 1, 0.55]} o={2} /> : null}
          {p.hair && p.ponytail && !p.hijab ? (
            <group>
              <T g={G.sph(R * 0.14, 10, 8)} c="#e04a7a" position={[0, R * 0.55, -R * 0.85]} o={2} />
              <T g={G.cap(R * 0.2, R * 0.75, 12)} c={p.hair} position={[0, R * 0.15, -R * 1.12]} rotation={[0.35, 0, 0]} o={2} />
            </group>
          ) : null}
          {p.hijab ? (
            <group>
              {/* kain di atas kepala sampai belakang, wajah terbuka */}
              <T g={G.sph(R * 1.08, 30, 20)} c={p.hijab} position={[0, R * 0.06, -R * 0.2]} o={2} />
              <T g={G.cone(R * 1.05, R * 1.1, 24)} c={p.hijab} position={[0, -R * 0.78, -R * 0.05]} o={2} />
            </group>
          ) : null}
          {p.glassesUp ? (
            <group position={[0, R * 0.82, R * 0.35]} rotation={[-0.9, 0, 0]}>
              {[-1, 1].map((sd) => (
                <T key={sd} g={G.tor(R * 0.17, R * 0.03, 6, 18)} c="#2a2a30" position={[sd * R * 0.22, 0, 0]} o={false} />
              ))}
              <T g={G.box(R * 0.12, R * 0.03, R * 0.03)} c="#2a2a30" o={false} />
            </group>
          ) : null}
          {p.hide?.includes("hat") ? null : <Hat kind={p.hat} c={p.hatColor ?? "#6a6a4a"} band={p.hatBand ?? "#3a2a1a"} r={R} />}
        </group>
        {children}
      </group>
    </group>
  );
};

/* ---------------- subtitle 1 kata (putih, garis tepi hitam) ---------------- */
export const WordSub: React.FC<{ word: string; y?: number; size?: number }> = ({ word, y = 1330, size = 78 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
    <text
      x={540}
      y={y}
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontWeight={900}
      fontSize={size}
      fill="#ffffff"
      stroke="#0c0c10"
      strokeWidth={size * 0.2}
      strokeLinejoin="round"
      paintOrder="stroke fill"
    >
      {word}
    </text>
  </svg>
);

/* ---------------- langit gradasi (warna sRGB benar) ---------------- */
export const ToonSky: React.FC<{ top: string; horizon: string; bottom?: string; r?: number }> = ({ top, horizon, bottom, r = 300 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHor: { value: new THREE.Color(horizon) },
          uBot: { value: new THREE.Color(bottom ?? horizon) },
        },
        vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: /* glsl */ `
          uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uBot; varying vec3 vP;
          void main(){ float h = normalize(vP).y;
            vec3 c = h > 0.0 ? mix(uHor, uTop, pow(clamp(h*1.8, 0.0, 1.0), 0.7)) : mix(uHor, uBot, clamp(-h*4.0, 0.0, 1.0));
            gl_FragColor = vec4(pow(c, vec3(1.0/2.2)), 1.0); }`,
      }),
    [top, horizon, bottom]
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[r, 32, 16]} />
    </mesh>
  );
};

/* ---------------- tekstur kanvas (diunggah ulang tiap frame, aturan render video) ---------------- */
type CvSlot = { cv: HTMLCanvasElement; tex: THREE.DataTexture; buf: Uint8Array; key: string };
export const useCanvasTex = (w: number, h: number, key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const slot = useMemo<CvSlot>(() => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const buf = new Uint8Array(w * h * 4);
    const tex = new THREE.DataTexture(buf, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    return { cv, tex, buf, key: "" };
  }, [w, h]);
  if (slot.key !== key) {
    const ctx = slot.cv.getContext("2d", { willReadFrequently: true })!;
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    slot.buf.set(ctx.getImageData(0, 0, w, h).data);
    slot.key = key;
  }
  slot.tex.needsUpdate = true;
  return slot.tex;
};
/** bidang bertekstur kanvas (kertas, papan nama, peta, koran) */
export const CanvasPlane: React.FC<{ w: number; h: number; px?: number; drawKey: string; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; position?: Vec3; rotation?: Vec3; toon?: boolean; o?: number | false }> = ({
  w,
  h,
  px = 512,
  drawKey,
  draw,
  position,
  rotation,
  toon = true,
  o = 2,
}) => {
  const tw = px;
  const th = Math.max(8, Math.round((px * h) / w));
  const tex = useCanvasTex(tw, th, drawKey, draw);
  const g = G.box(w, h, 0.004);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={g} receiveShadow>
        {toon ? <meshToonMaterial map={tex} gradientMap={toonGradient()} /> : <meshBasicMaterial map={tex} toneMapped={false} />}
      </mesh>
      {o ? <mesh geometry={hullOf(g)} material={outlineMat(o)} /> : null}
    </group>
  );
};

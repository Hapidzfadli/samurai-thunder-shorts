/**
 * 8 Adegan Penuh V3 (FRAMING LUAS & GERAK MULUS) — "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)"
 * Perbaikan V3 berdasarkan evaluasi langsung V2:
 *   - Framing Medium / Medium-Wide konsisten (`FOV 42°-50°`, jarak 2,5-7,6 m) agar latar 3D Blender,
 *     lawan bicara, dan properti bergerak SELALU terlihat utuh (tidak pernah terlalu nge-zoom / nge-crop wajah!)
 *   - 0% efek "lompat-lompat": kaki karakter menapak kokoh di lantai saat bicara (tidak ada `talkHop` / `diploJump` / `smugHop`);
 *     ekspresi tetap hidup lewat per-word Whisper lip-sync, `wordNod()`, ayunan lengan, dan `beanWalk` jalan/lari!
 *   - Transisi kamera antar-shot 100% halus (`evalSmoothCam` cubic blend 16-20 frame, tanpa jump-cut kaget-kagetan!),
 *     plus `camKick` terkendali hanya di 3 benturan fisik nyata (rem taksi, mendarat di gerobak, gebrak meja Direktur).
 */
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  continueRender,
  delayRender,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BeanParams, beanWalk } from "./three/objectsBean";
import {
  AgentBeanCard,
  AgentExtra,
  CatCard,
  CatDrawOpts,
  CatXray3D,
  FloatingDollarRain,
  GrilledFishSmoke,
  SignalWaveArcs,
} from "./three/objectsKucing";
import { ARA_BASE, DIPLOMAT_BASE, DIREKTUR_BASE, DODI_BASE } from "./SheetKucing";

type Vec3 = [number, number, number];

export type KucingWord = {
  word: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
};

export type KucingTiming = {
  fps: number;
  totalFrames: number;
  totalSec: number;
  scenes: Record<string, { start: number; end: number; startFrame: number; endFrame: number; durationFrames: number }>;
  events: Record<string, number>;
  lines: {
    scene: string;
    idx: number;
    voice: string;
    style: string;
    text: string;
    startFrame: number;
    endFrame: number;
    words?: KucingWord[];
  }[];
  captions: {
    text: string;
    voice: string;
    style: string;
    startFrame: number;
    endFrame: number;
  }[];
};

// Coordinate conversion: Blender (x, y, z) -> Three.js Y-up (x, z, -y)
const B2T = (bx: number, by: number, bz: number): Vec3 => [bx, bz, -by];

// Clean 1960s solid CIA wool skirt for Ara (matching batik color to hide dots!)
const ARA_CIA: BeanParams = {
  ...ARA_BASE,
  skirt: "#5c5042",
  batik: "#5c5042",
};

const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
const smooth = (f: number, a: number, b: number, y0 = 0, y1 = 1) =>
  interpolate(f, [a, Math.max(a + 1, b)], [y0, y1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
const pulse = (f: number, at: number, len = 8) => {
  const d = f - at;
  return d < 0 || d > len ? 0 : Math.sin((d / len) * Math.PI);
};

/* ================================================================== */
/* KOREOGRAFI KAMERA V3 — MULUS, LEBAR, TANPA LOMPAT-LOMPAT           */
/* Semua transisi antar-shot di dalam 1 adegan memakai smooth glide!  */
/* ================================================================== */
type CamMode = "crane" | "glide" | "vertigo";
type SmoothShot = {
  to: number; // global endFrame of this shot
  mode?: CamMode;
  p0: Vec3;
  p1?: Vec3;
  l0: Vec3;
  l1?: Vec3;
  fov?: number;
  fov1?: number;
  roll0?: number;
  roll1?: number;
  blendFrames?: number; // smooth transition duration from previous shot (default 16f = 0.53s)
};
type CamState = { pos: Vec3; look: Vec3; fov: number; roll: number };

const evalRawShot = (s: SmoothShot, local: number, len: number): CamState => {
  const mode = s.mode ?? "glide";
  const x = cl(local / Math.max(1, len));
  const f0 = s.fov ?? 46;
  const f1 = s.fov1 ?? f0;

  if (mode === "vertigo") {
    // Controlled Hitchcock Dolly-Zoom: keeps wide readable context (FOV 48 -> 38)
    const k = smoother(x);
    const fov = lerpN(f0, f1, k);
    const look = lerp3(s.l0, s.l1 ?? s.l0, k);
    const dx = s.p0[0] - s.l0[0];
    const dy = s.p0[1] - s.l0[1];
    const dz = s.p0[2] - s.l0[2];
    const d0 = Math.max(0.4, Math.hypot(dx, dy, dz));
    const scale = Math.tan((f0 * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
    const d = d0 * scale;
    const pos: Vec3 = [look[0] + (dx / d0) * d, look[1] + (dy / d0) * d, look[2] + (dz / d0) * d];
    return { pos, look, fov, roll: lerpN(s.roll0 ?? 0, s.roll1 ?? -3.4, k) };
  }

  const k = mode === "crane" ? 1 - Math.pow(1 - x, 2.2) : smoother(x);
  const look = lerp3(s.l0, s.l1 ?? s.l0, k);
  const pos = lerp3(s.p0, s.p1 ?? s.p0, k);
  return { pos, look, fov: lerpN(f0, f1, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
};

const evalSmoothCam = (frame: number, sceneStart: number, shots: SmoothShot[]): CamState => {
  let start = sceneStart;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, s.to - start);
      const local = Math.max(0, frame - start);
      const cur = evalRawShot(s, local, len);

      // EVERY shot transition glides smoothly from previous shot's end state (0% jarring jump-cuts!)
      let out = cur;
      const bf = s.blendFrames ?? 16;
      if (i > 0 && bf > 0 && local < bf) {
        const prev = shots[i - 1];
        const prevStart = i >= 2 ? shots[i - 2].to : sceneStart;
        const prevLen = Math.max(1, prev.to - prevStart);
        const prevEnd = evalRawShot(prev, prevLen, prevLen);
        const w = smoother(cl(local / bf));
        out = {
          pos: lerp3(prevEnd.pos, cur.pos, w),
          look: lerp3(prevEnd.look, cur.look, w),
          fov: lerpN(prevEnd.fov, cur.fov, w),
          roll: lerpN(prevEnd.roll, cur.roll, w),
        };
      }

      // Gentle cinematic handheld breathing (smooth & non-bouncy!)
      const brX = Math.sin(frame * 0.055) * 0.012;
      const brY = Math.cos(frame * 0.045) * 0.009;
      const brR = Math.sin(frame * 0.04) * 0.16;
      return {
        pos: [out.pos[0] + brX, out.pos[1] + brY, out.pos[2]],
        look: [out.look[0] + brX * 0.35, out.look[1] + brY * 0.35, out.look[2]],
        fov: out.fov,
        roll: out.roll + brR,
      };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 46, roll: 0 };
};

/** Controlled impact camera kick ONLY on genuine physical slams (brakes, landing, desk slam). */
const camKick = (f: number, hits: number[], amp = 0.06, len = 9): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < len) {
      const a = (1 - d / len) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 3 ? 1 : -1) * a * 0.65;
    }
  }
  return [x, y, 0];
};

/** TRUE PER-WORD Whisper lip-sync + gentle emphasized-word head nod (`wordNod`)! */
const useSpeakState = (timing: KucingTiming, globalFrame: number, voice: string) => {
  const active = timing.lines.find(
    (l) => l.voice === voice && globalFrame >= l.startFrame - 1 && globalFrame <= l.endFrame + 1
  );
  if (!active) return { talking: false, mouthOpen: 0, nodDeg: 0, style: "" };

  let mouthOpen = 0;
  let nodDeg = 0;
  if (active.words && active.words.length > 0) {
    for (const w of active.words) {
      if (globalFrame >= w.startFrame - 1 && globalFrame <= w.endFrame + 1) {
        mouthOpen = cl(0.35 + 0.65 * Math.abs(Math.sin((globalFrame - w.startFrame) * 0.92 + w.startFrame)));
      }
      if (w.word.length > 6) {
        nodDeg += pulse(globalFrame, w.startFrame - 1, 9) * 4.2;
      }
    }
  } else {
    const t = (globalFrame - active.startFrame) / 30;
    mouthOpen = cl(0.38 + 0.52 * Math.abs(Math.sin(t * 20)));
  }
  return { talking: true, mouthOpen, nodDeg, style: active.style };
};

/** Crisp high-res 3D signboard mesh mounted cleanly in the Blender 3D worlds. */
const Signboard3D: React.FC<{
  position: Vec3;
  rotation?: Vec3;
  size: [number, number];
  title: string;
  subtitle?: string;
  bg?: string;
  fg?: string;
  border?: string;
}> = ({ position, rotation = [0, 0, 0], size, title, subtitle, bg = "#1c2b3a", fg = "#ffd94a", border = "#f2c94c" }) => {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 768;
    cv.height = 256;
    const c = cv.getContext("2d")!;
    c.fillStyle = bg;
    c.fillRect(0, 0, 768, 256);
    c.strokeStyle = border;
    c.lineWidth = 14;
    c.strokeRect(10, 10, 748, 236);
    c.fillStyle = fg;
    c.font = "900 58px system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(title, 384, subtitle ? 96 : 128);
    if (subtitle) {
      c.fillStyle = "#ffffff";
      c.font = "800 36px system-ui, sans-serif";
      c.fillText(subtitle, 384, 174);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [title, subtitle, bg, fg, border]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
    </mesh>
  );
};

/** Camera controller supporting full 3D position, lookAt target, FOV, Roll, & Shake! */
const CameraRig: React.FC<{ cam: CamState; shake?: Vec3 }> = ({ cam, shake = [0, 0, 0] }) => {
  const { camera } = useThree();
  camera.position.set(cam.pos[0] + shake[0], cam.pos[1] + shake[1], cam.pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(cam.look[0] + shake[0] * 0.45, cam.look[1] + shake[1] * 0.45, cam.look[2]);
  if (Math.abs(cam.roll) > 0.001) {
    camera.rotateZ((cam.roll * Math.PI) / 180);
  }
  const pc = camera as THREE.PerspectiveCamera;
  if (Math.abs(pc.fov - cam.fov) > 0.04) {
    pc.fov = cam.fov;
    pc.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};

/** Warm sunset sky dome behind outdoor Washington scenes so the sky is vibrant & seamless! */
const SunsetSkyDome: React.FC<{ center: Vec3 }> = ({ center }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          cTop: { value: new THREE.Color("#213d73") },
          cMid: { value: new THREE.Color("#d97e5e") },
          cBot: { value: new THREE.Color("#f7c27c") },
        },
        vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 cTop, cMid, cBot; varying vec3 vPos;
          void main(){
            float h = clamp((normalize(vPos).y + 0.05) / 0.72, 0.0, 1.0);
            vec3 col = h < 0.35 ? mix(cBot, cMid, h / 0.35) : mix(cMid, cTop, (h - 0.35) / 0.65);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    []
  );
  return (
    <mesh position={center} material={mat}>
      <sphereGeometry args={[52, 24, 16]} />
    </mesh>
  );
};

/** Neon blue holographic blueprint grid for Scene 3 (X-Ray 3D Cat Cutaway). */
const BlueXrayStage: React.FC<{ center: Vec3 }> = ({ center }) => {
  const gridTex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 256;
    const c = cv.getContext("2d")!;
    c.fillStyle = "#08182e";
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = "#29b6ff";
    c.lineWidth = 4;
    c.strokeRect(2, 2, 252, 252);
    c.strokeStyle = "rgba(41,182,255,0.35)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(128, 0);
    c.lineTo(128, 256);
    c.moveTo(0, 128);
    c.lineTo(256, 128);
    c.stroke();
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 14);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <group position={center}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshBasicMaterial map={gridTex} />
      </mesh>
      <mesh position={[0, 5, -10]}>
        <planeGeometry args={[32, 18]} />
        <meshBasicMaterial color="#071326" />
      </mesh>
    </group>
  );
};

let _kucingGlbPromise: Promise<THREE.Group> | null = null;
function loadKucingGlb(url: string): Promise<THREE.Group> {
  if (!_kucingGlbPromise) {
    _kucingGlbPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        url,
        (gltf) => {
          console.log("KUCING_GLB_READY children=", gltf.scene.children.length);
          gltf.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const m = obj as THREE.Mesh;
              m.frustumCulled = false;
            }
          });
          resolve(gltf.scene);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }
  return _kucingGlbPromise;
}

export function useLoadedKucingGlb(path: string): THREE.Group | null {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender(`Load ${path}`));
  useEffect(() => {
    let cancelled = false;
    loadKucingGlb(staticFile(path))
      .then((g) => {
        if (!cancelled) {
          setModel(g);
          continueRender(handle);
        }
      })
      .catch((e) => {
        console.error("GLB LOAD ERR:", e);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [path, handle]);
  return model;
}

/**
 * Main 3D World V3: Wide Readable Framing + Smooth Non-Jumping Camera + Grounded Character Acting!
 */
export const KucingWorld3D: React.FC<{ timing: KucingTiming; sceneRoot: THREE.Group | null }> = ({ timing, sceneRoot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ev = (name: string) => timing.events[name] ?? 0;

  const activeScene = useMemo(() => {
    for (const [k, s] of Object.entries(timing.scenes)) {
      if (frame >= s.startFrame && frame < s.endFrame) return k;
    }
    return "akhir";
  }, [frame, timing.scenes]);

  const scMeta = timing.scenes[activeScene] ?? timing.scenes.hook;
  const f = frame - scMeta.startFrame;

  // ========== VISIBILITY CULLING: ONLY DRAW ACTIVE 3D WORLD PER SCENE! ==========
  if (sceneRoot) {
    const showL1 = activeScene === "hook" || activeScene === "lab" || activeScene === "akhir";
    const showL2 = activeScene === "van" || activeScene === "direktur";
    const showL3 = activeScene === "lepas" || activeScene === "kacau";
    for (const child of sceneRoot.children) {
      const n = child.name;
      if (n.startsWith("L1_") || n === "ANIM_ReelLabL" || n === "ANIM_ReelLabR") {
        child.visible = showL1;
      } else if (n.startsWith("L2_") || n === "ANIM_ReelVanL" || n === "ANIM_ReelVanR" || n === "ANIM_VanDoor" || n === "ANIM_VanRadar") {
        child.visible = showL2;
      } else if (n.startsWith("L3_") || n === "ANIM_YellowTaxi" || n === "ANIM_FishCart") {
        child.visible = showL3;
      }
    }
  }

  // ========== ANIMATE ALL 8 BLENDER 3D 'ANIM_*' PROPS SMOOTHLY! ==========
  const reelLabL = sceneRoot?.getObjectByName("ANIM_ReelLabL");
  const reelLabR = sceneRoot?.getObjectByName("ANIM_ReelLabR");
  const reelVanL = sceneRoot?.getObjectByName("ANIM_ReelVanL");
  const reelVanR = sceneRoot?.getObjectByName("ANIM_ReelVanR");
  const vanDoor = sceneRoot?.getObjectByName("ANIM_VanDoor");
  const vanRadar = sceneRoot?.getObjectByName("ANIM_VanRadar");
  const yellowTaxi = sceneRoot?.getObjectByName("ANIM_YellowTaxi");
  const fishCart = sceneRoot?.getObjectByName("ANIM_FishCart");

  if (reelLabL) reelLabL.rotation.z = -t * 3.5;
  if (reelLabR) reelLabR.rotation.z = -t * 4.0;
  const vanSpeed = activeScene === "direktur" ? 8.5 : 4.4;
  if (reelVanL) reelVanL.rotation.x = t * vanSpeed;
  if (reelVanR) reelVanR.rotation.x = t * (vanSpeed * 1.18);
  if (vanRadar) {
    vanRadar.rotation.y = activeScene === "kacau" ? t * 4.8 : t * 1.8;
  }
  if (vanDoor) {
    const openAmt =
      activeScene === "van"
        ? smooth(frame, ev("van.pintu"), ev("van.pintu") + 20, 0, 1)
        : activeScene === "lepas" || activeScene === "kacau"
        ? 1
        : 0;
    vanDoor.position.z = -0.40 + openAmt * 1.55;
  }
  if (yellowTaxi) {
    let tx = 801.4;
    let pitch = 0;
    if (activeScene === "lepas") {
      tx = smooth(frame, scMeta.startFrame + 15, scMeta.endFrame, 787.5, 797.6);
    } else if (activeScene === "kacau") {
      const fBrake = ev("kac.ngerem");
      const slideK = smooth(frame, scMeta.startFrame, fBrake + 10, 0, 1);
      tx = 797.6 + slideK * 3.6;
      const sinceBrake = frame - (fBrake - 4);
      if (sinceBrake > 0 && sinceBrake < 34) {
        pitch = -0.15 * Math.exp(-sinceBrake * 0.11) * Math.sin(sinceBrake * 0.35);
      }
    }
    yellowTaxi.position.set(tx, 0, 2.5);
    yellowTaxi.rotation.z = pitch;
  }
  if (fishCart) {
    const fJump = ev("kac.gerobak");
    let rock = Math.sin(t * 4.5) * 0.005;
    if (activeScene === "kacau" && frame >= fJump) {
      const dt = frame - fJump;
      rock = Math.sin(dt * 0.65) * 0.075 * Math.exp(-dt * 0.085);
    }
    fishCart.rotation.z = rock;
  }

  // ========== TRUE PER-WORD WHISPER LIP-SYNC & GROUNDED ACTING ==========
  const spDodi = useSpeakState(timing, frame, "dodi");
  const spAra = useSpeakState(timing, frame, "ara");
  const spDir = useSpeakState(timing, frame, "direktur");

  const blink = (seed: number) => Math.sin(t * 2.4 + seed) > 0.965;
  // Subtle organic breathing squash ONLY (ZERO pogo-stick floor jumping!)
  const talkSquash = (sp: { mouthOpen: number }) =>
    sp.mouthOpen > 0.15 ? Math.sin(t * 11) * 0.018 : Math.sin(t * 2.4) * 0.008;

  // Restrained camera impact shake ONLY on 3 real physical slams!
  const shake = camKick(
    frame,
    [ev("kac.ngerem") - 2, ev("kac.gerobak"), ev("dir.siapa") + 24],
    0.065,
    9
  );

  // ========== WIDE, READABLE, SMOOTHLY GLIDING CAMERA STAGING ==========
  let cam: CamState = { pos: [0, 1.85, 3.8], look: [0, 1.3, -1.3], fov: 46, roll: 0 };

  let dodiPos: Vec3 = [0, -100, 0];
  let dodiParams: BeanParams = { ...DODI_BASE, expr: "smug" };
  let dodiExtra: AgentExtra = { shades: true, earpiece: true };
  let dodiFacing: 1 | -1 = 1;

  let araPos: Vec3 = [0, -100, 0];
  let araParams: BeanParams = { ...ARA_CIA, expr: "neutral" };
  let araExtra: AgentExtra = {};
  let araFacing: 1 | -1 = -1;

  let dirPos: Vec3 = [0, -100, 0];
  let dirParams: BeanParams = { ...DIREKTUR_BASE, expr: "angry" };
  let dirExtra: AgentExtra = {};

  let catPos: Vec3 = [0, -100, 0];
  let catFacing: 1 | -1 = 1;
  let catHeight = 0.74;
  let catOpts: CatDrawOpts = { expr: "cuek", antenna: true, vest: true };

  if (activeScene === "hook") {
    // Wide CIA Lab reveal -> Smooth medium two-shot (Dodi + Agen Meong + board) -> Clear medium push on Agen Meong!
    const fDolar = ev("hook.dolar");
    const fCat = ev("hook.kucing");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fDolar - 6, mode: "crane", p0: [1.7, 2.75, 4.3], p1: [0.45, 1.88, 3.35], l0: [-0.2, 1.5, -1.8], l1: [-0.25, 1.35, -1.35], fov: 49, fov1: 47, roll0: 1.0, roll1: 0 },
      { to: fCat - 16, mode: "glide", p0: [-0.35, 1.72, 3.15], p1: [-0.20, 1.68, 2.75], l0: [-0.45, 1.32, -1.10], l1: [-0.15, 1.32, -1.25], fov: 46, fov1: 45, blendFrames: 20 },
      { to: scMeta.endFrame, mode: "glide", p0: [0.15, 1.65, 2.25], p1: [0.20, 1.58, 1.45], l0: [0.22, 1.35, -1.45], l1: [0.22, 1.36, -1.45], fov: 44, fov1: 42, blendFrames: 18 },
    ]);

    // Dodi walks smoothly into Lab CIA (`beanWalk`) then stands firmly planted presenting Agen Meong!
    const walkK = smooth(frame, scMeta.startFrame + 12, fDolar + 12, 0, 1);
    const isWalking = walkK > 0.02 && walkK < 0.98;
    const walkPose = isWalking ? beanWalk(t * 2.1, 0.85) : {};
    dodiPos = [lerpN(-2.45, -1.15, walkK), 0, -0.68];
    dodiParams = {
      ...DODI_BASE,
      ...walkPose,
      expr: spDodi.talking ? "talk" : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: isWalking ? walkPose.armR : [64 + Math.sin(t * 6) * 10, -26],
      armL: isWalking ? walkPose.armL : [-18, 12],
      headTilt: spDodi.nodDeg,
      squash: talkSquash(spDodi),
      blink: blink(1),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame >= fDolar ? "sparkle" : "none" };

    // Agen Meong sits calmly on red cushion, flipping shades to deadpan CUEK!
    const isCuek = frame >= fCat + 10;
    catPos = [0.22, 1.09, -1.45];
    catHeight = 0.78;
    catOpts = {
      expr: isCuek ? "cuek" : "smug",
      shades: !isCuek,
      shadesSlip: frame >= fCat && !isCuek ? 0.65 : 0,
      antenna: true,
      vest: true,
    };
  } else if (activeScene === "lab") {
    // Wide readable Lab staging: Dodi + Ara + Agen Meong + CIA Lab ALL clearly visible in context!
    const fHah = ev("lab.hah");
    const fNyadap = ev("lab.nyadap");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fHah - 8, mode: "glide", p0: [-0.35, 1.72, 3.25], p1: [-0.25, 1.68, 2.95], l0: [-0.45, 1.30, -0.90], l1: [-0.20, 1.30, -0.95], fov: 47, fov1: 46 },
      { to: fNyadap - 10, mode: "glide", p0: [0.55, 1.70, 3.05], p1: [0.60, 1.66, 2.85], l0: [0.45, 1.30, -0.85], l1: [0.55, 1.30, -0.85], fov: 46, fov1: 45, blendFrames: 18 },
      { to: fNyadap + 55, mode: "glide", p0: [-0.15, 1.72, 3.35], p1: [0.05, 1.68, 3.05], l0: [-0.20, 1.30, -1.00], l1: [0.05, 1.30, -1.10], fov: 48, fov1: 46, blendFrames: 18 },
      { to: scMeta.endFrame, mode: "glide", p0: [0.15, 1.68, 2.55], p1: [0.20, 1.60, 1.75], l0: [0.22, 1.32, -1.45], l1: [0.22, 1.34, -1.45], fov: 45, fov1: 42, blendFrames: 18 },
    ]);

    const dWalk = smooth(frame, scMeta.startFrame, scMeta.startFrame + 42, 0, 1);
    const dIsW = dWalk > 0.02 && dWalk < 0.98;
    const dW = dIsW ? beanWalk(t * 2.0, 0.8) : {};
    dodiPos = [lerpN(-1.60, -1.08, dWalk), 0, -0.58];
    dodiParams = {
      ...DODI_BASE,
      ...dW,
      expr: spDodi.talking ? (frame >= fNyadap ? "smug" : "talk") : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: dIsW ? dW.armR : spDodi.talking ? [70 + Math.sin(t * 8) * 14, -30] : [42, -18],
      armL: dIsW ? dW.armL : [-18, 14],
      headTilt: spDodi.nodDeg + Math.sin(t * 2.8) * 2,
      squash: talkSquash(spDodi),
      blink: blink(2),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame < fHah ? "sparkle" : "none" };

    const aWalk = smooth(frame, scMeta.startFrame + 55, fHah - 6, 0, 1);
    const aIsW = aWalk > 0.02 && aWalk < 0.98;
    const aW = aIsW ? beanWalk(t * 2.1, 0.85) : {};
    araPos = [lerpN(2.05, 1.12, aWalk), 0, -0.58];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      ...aW,
      expr: frame >= fHah && frame < fNyadap ? "shock" : "think",
      mouthOpen: spAra.mouthOpen,
      armL: aIsW ? aW.armL : frame >= fHah && frame < fNyadap ? [-98, 22] : [-38, 22],
      armR: aIsW ? aW.armR : spAra.talking ? [74 + Math.sin(t * 9) * 14, -24] : [32, -18],
      headTilt: spAra.nodDeg + (spAra.talking ? 5 : -3),
      sweat: frame >= fHah && frame < fNyadap,
      squash: talkSquash(spAra),
      blink: blink(5),
    };
    araExtra = { fx: frame >= fHah && frame < fNyadap ? "question" : "none" };

    catPos = [0.22, 1.09, -1.45];
    catFacing = frame >= fNyadap - 10 ? -1 : 1;
    catHeight = 0.76;
    catOpts = { expr: frame >= fNyadap ? "ngantuk" : "cuek", antenna: true, vest: true };
  } else if (activeScene === "xray") {
    // 3D X-Ray Cat Hologram ALWAYS stays fully visible in frame alongside Dodi & Ara!
    const cx = 200;
    const fEkor = ev("xr.ekor");
    const fYakin = ev("xr.yakin");
    const fProf = ev("xr.profesional");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fEkor, mode: "crane", p0: [cx - 2.4, 2.85, 5.4], p1: [cx - 0.6, 2.05, 4.9], l0: [cx, 1.32, 0], l1: [cx, 1.28, 0], fov: 48, fov1: 46 },
      { to: fYakin - 10, mode: "glide", p0: [cx - 0.6, 2.05, 4.9], p1: [cx + 1.8, 2.0, 4.7], l0: [cx, 1.28, 0], l1: [cx + 0.15, 1.28, -0.2], fov: 46, fov1: 46, blendFrames: 18 },
      { to: fProf - 24, mode: "glide", p0: [cx + 1.8, 2.0, 4.7], p1: [cx + 1.45, 1.88, 4.15], l0: [cx + 0.45, 1.28, -0.45], l1: [cx + 0.55, 1.28, -0.55], fov: 46, fov1: 45, blendFrames: 20 },
      { to: scMeta.endFrame, mode: "glide", p0: [cx - 1.25, 1.88, 4.25], p1: [cx - 1.45, 1.82, 3.95], l0: [cx - 0.45, 1.28, -0.50], l1: [cx - 0.35, 1.28, -0.45], fov: 46, fov1: 45, blendFrames: 22 },
    ]);

    const dWalk = smooth(frame, fProf - 35, fProf + 5, 0, 1);
    const dW = dWalk > 0.02 && dWalk < 0.98 ? beanWalk(t * 2.1, 0.8) : {};
    dodiPos = [lerpN(cx - 1.75, cx - 1.42, dWalk), 0, -1.15];
    dodiParams = {
      ...DODI_BASE,
      ...dW,
      expr: spDodi.talking ? "smug" : "happy",
      mouthOpen: spDodi.mouthOpen,
      armR: [68 + Math.sin(t * 7) * 10, -22],
      headTilt: spDodi.nodDeg,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame >= fProf - 20 ? "sparkle" : "none" };

    const aWalk = smooth(frame, fYakin - 25, fYakin + 10, 0, 1);
    const aW = aWalk > 0.02 && aWalk < 0.98 ? beanWalk(t * 2.0, 0.8) : {};
    araPos = [lerpN(cx + 1.85, cx + 1.42, aWalk), 0, -1.15];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      ...aW,
      expr: spAra.talking ? "think" : "worried",
      mouthOpen: spAra.mouthOpen,
      armR: [50 + Math.sin(t * 7) * 10, -24],
      headTilt: 6 + spAra.nodDeg,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: spAra.talking ? "question" : "sweat" };
  } else if (activeScene === "van") {
    // Wide Surveillance Van interior: CRT consoles + spinning reels + Dodi + Ara + sliding door + cat ALL visible!
    const fPintu = ev("van.pintu");
    const fIkan = ev("van.ikan");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fPintu - 12, mode: "glide", p0: [401.25, 1.78, 2.55], p1: [400.55, 1.66, 2.05], l0: [399.4, 1.42, -0.9], l1: [400.0, 1.38, -1.1], fov: 50, fov1: 48 },
      { to: fIkan - 38, mode: "glide", p0: [400.35, 1.64, 2.25], p1: [400.05, 1.62, 2.35], l0: [400.75, 1.28, -0.55], l1: [401.05, 1.25, -0.55], fov: 49, fov1: 49, blendFrames: 18 },
      { to: scMeta.endFrame, mode: "glide", p0: [400.05, 1.64, 2.05], p1: [400.15, 1.60, 1.75], l0: [400.45, 1.35, -0.65], l1: [400.65, 1.35, -0.60], fov: 47, fov1: 44, blendFrames: 18 },
    ]);

    const pullK = smooth(frame, fPintu - 18, fPintu + 14, 0, 1);
    const dWalk = pullK > 0.02 && pullK < 0.98 ? beanWalk(t * 2.1, 0.8) : {};
    dodiPos = [lerpN(399.45, 400.05, pullK), 0.29, -0.85];
    dodiParams = {
      ...DODI_BASE,
      ...dWalk,
      expr: spDodi.talking ? "talk" : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: frame >= fPintu - 6 ? [92, -18] : [52, -32],
      lean: 5,
      headTilt: spDodi.nodDeg,
      squash: talkSquash(spDodi),
      blink: blink(3),
    };
    dodiExtra = { shades: true, earpiece: true };

    araPos = [400.85, 0.29, -0.55];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      expr: frame >= fIkan - 30 ? "worried" : "neutral",
      mouthOpen: spAra.mouthOpen,
      armR: [46 + Math.sin(t * 7) * 8, -22],
      headTilt: 6 + spAra.nodDeg,
      sweat: frame >= fIkan - 28,
      squash: talkSquash(spAra),
      blink: blink(7),
    };
    araExtra = { fishBox: true, fx: frame >= fIkan - 25 ? "sweat" : "none" };

    // Real physical jump ONLY when Agen Meong hops out the sliding van door!
    const hopOut = smooth(frame, fPintu + 4, fPintu + 34, 0, 1);
    catPos = [400.9 + hopOut * 1.8, 0.32 + Math.sin(hopOut * Math.PI) * 0.52, -0.42];
    catHeight = 0.70;
    catOpts = {
      expr: frame >= fIkan - 20 ? "lapar" : "fokus",
      shades: true,
      shadesSlip: frame >= fIkan - 20 ? 0.8 : 0,
      antenna: true,
      vest: true,
      runCycle: hopOut > 0.05 && hopOut < 0.95 ? t : 0,
    };
  } else if (activeScene === "lepas") {
    // Wide Washington D.C. Park & Avenue: Dodi + Ara + Diplomats + Running Cat + Yellow Taxi ALL visible!
    const fApa = ev("lep.apa");
    const fBelok = ev("lep.belok");
    const fTaksi = ev("lep.taksi");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fApa + 52, mode: "glide", p0: [798.7, 2.05, 4.55], p1: [798.75, 1.92, 3.85], l0: [798.6, 1.30, -1.45], l1: [798.65, 1.28, -1.45], fov: 49, fov1: 46, roll0: 0, roll1: -1.5 },
      { to: fBelok + 18, mode: "glide", p0: [799.2, 2.25, 6.2], p1: [799.8, 2.20, 6.8], l0: [798.6, 1.15, -0.5], l1: [799.1, 1.10, 0.6], fov: 49, fov1: 50, blendFrames: 18 },
      { to: scMeta.endFrame, mode: "glide", p0: [799.8, 2.20, 6.8], p1: [799.4, 2.25, 8.4], l0: [799.1, 1.10, 0.6], l1: [798.4, 0.95, 2.0], fov: 50, fov1: 50, roll0: -1.5, roll1: -2.2, blendFrames: 18 },
    ]);

    const slipAmt = smooth(frame, fApa, fApa + 8, 0, 1);
    const chaseK = smooth(frame, fApa + 46, scMeta.endFrame, 0, 1);
    const isChasing = chaseK > 0.02;
    const dRun = isChasing ? beanWalk(t * 3.4, 1.2) : {};
    dodiPos = [lerpN(798.75, 800.75, chaseK), 0.16, -1.55];
    dodiParams = {
      ...DODI_BASE,
      ...dRun,
      expr: "shock",
      mouthOpen: spDodi.mouthOpen || 0.75,
      armL: [-132 + Math.sin(t * 14) * 14, -20],
      armR: [132 - Math.sin(t * 14) * 14, 20],
      lean: isChasing ? 9 : 0,
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: slipAmt, earpiece: true, fx: "shock" };

    const aRun = isChasing ? beanWalk(t * 3.2 + 0.4, 1.15) : {};
    araPos = [lerpN(796.75, 799.15, chaseK), 0.16, -1.55];
    araFacing = 1;
    araParams = {
      ...ARA_CIA,
      ...aRun,
      expr: "scared",
      mouthOpen: spAra.mouthOpen,
      armR: [115, -18],
      armL: [-108, 22],
      lean: isChasing ? 8 : 0,
      sweat: true,
      squash: talkSquash(spAra),
    };
    araExtra = { fishBox: true, fx: "shock" };

    const runK = smooth(frame, scMeta.startFrame + 16, scMeta.endFrame, 0, 1);
    catPos = [796.2 + runK * 3.8, 0.12 + Math.abs(Math.sin(t * 12)) * 0.08, 1.95 + Math.sin(runK * Math.PI) * 0.55];
    catHeight = 0.90;
    catOpts = {
      expr: runK < 0.25 ? "lapar" : "lari",
      shades: runK < 0.30,
      shadesSlip: 1.0,
      antenna: true,
      vest: true,
      runCycle: runK > 0.1 ? t * 1.15 : 0,
    };
  } else if (activeScene === "kacau") {
    // Wide Taxi Brake -> Smooth glide tracking Cat's high arc leap onto Fish Cart -> Wide medium Fish Cart + Dodi & Ara!
    const fBrake = ev("kac.ngerem");
    const fGerobak = ev("kac.gerobak");
    const fRadar = ev("kac.radar");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fBrake + 26, mode: "glide", p0: [800.8, 2.05, 7.2], p1: [801.4, 1.95, 6.2], l0: [800.5, 1.0, 2.2], l1: [801.2, 1.05, 1.8], fov: 50, fov1: 48, roll0: -2.2, roll1: 0 },
      { to: fGerobak + 14, mode: "glide", p0: [802.2, 2.05, 5.0], p1: [803.0, 2.05, 3.6], l0: [802.8, 1.55, -0.6], l1: [803.8, 1.60, -1.85], fov: 48, fov1: 46, blendFrames: 18 },
      { to: fRadar + 12, mode: "glide", p0: [803.0, 2.05, 3.6], p1: [803.4, 1.98, 2.75], l0: [803.8, 1.60, -1.85], l1: [804.0, 1.62, -1.95], fov: 46, fov1: 44, blendFrames: 16 },
      { to: scMeta.endFrame, mode: "glide", p0: [803.1, 1.92, 3.35], p1: [803.2, 1.95, 3.55], l0: [803.1, 1.45, -1.55], l1: [803.4, 1.52, -1.70], fov: 47, fov1: 47, blendFrames: 18 },
    ]);

    // Real physical arc leap onto Fish Cart, then sits steadily munching (ZERO idle bouncing!)
    const leapK = smooth(frame, scMeta.startFrame + 16, fGerobak + 6, 0, 1);
    const catX = lerpN(801.3, 804.35, leapK);
    const catY = lerpN(0.16, 1.48, leapK) + Math.sin(leapK * Math.PI) * 1.35;
    const catZ = lerpN(1.75, -1.98, leapK);
    catPos = [catX, catY, catZ];
    catHeight = 0.84;
    catFacing = -1;
    catOpts = {
      expr: leapK < 0.88 ? "lari" : "makan",
      fishInMouth: leapK >= 0.88,
      shades: leapK >= 0.95,
      antenna: true,
      vest: true,
      runCycle: leapK < 0.88 ? t * 1.1 : 0,
    };

    const chase2 = smooth(frame, scMeta.startFrame, fGerobak + 22, 0, 1);
    const isRun2 = chase2 < 0.95;
    const dRun2 = isRun2 ? beanWalk(t * 3.1, 1.05) : {};
    const aRun2 = isRun2 ? beanWalk(t * 2.9 + 0.5, 1.0) : {};
    dodiPos = [lerpN(800.4, 801.75, chase2), 0.16, -1.15];
    dodiParams = {
      ...DODI_BASE,
      ...dRun2,
      expr: "shock",
      mouthOpen: spDodi.mouthOpen,
      armR: [118, -20],
      armL: [-92, 22],
      lean: isRun2 ? 7 : 2,
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 1.0, earpiece: true, fx: "shock" };

    araPos = [lerpN(801.1, 802.45, chase2), 0.16, -1.35];
    araFacing = 1;
    araParams = {
      ...ARA_CIA,
      ...aRun2,
      expr: frame >= fRadar - 6 ? "smug" : "shock",
      mouthOpen: spAra.mouthOpen,
      armR: [76 + Math.sin(t * 8) * 10, -24],
      headTilt: spAra.nodDeg,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: frame >= fRadar - 6 ? "sparkle" : "sweat" };
  } else if (activeScene === "direktur") {
    // Readable Van Interior Two-Shot -> Controlled Vertigo Dolly-Zoom (FOV 48 -> 38) so BOTH Dodi & Pak Direktur + console stay visible!
    const fSiapa = ev("dir.siapa");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fSiapa - 4, mode: "glide", p0: [400.25, 1.66, 2.25], p1: [400.05, 1.62, 1.95], l0: [399.85, 1.38, -1.0], l1: [399.95, 1.40, -1.05], fov: 49, fov1: 47 },
      { to: scMeta.endFrame, mode: "vertigo", p0: [400.18, 1.62, 1.85], l0: [400.15, 1.40, -1.15], l1: [400.22, 1.42, -1.20], fov: 48, fov1: 38, roll0: -0.5, roll1: -3.6, blendFrames: 14 },
    ]);

    dodiPos = [399.42, 0.29, -0.85];
    dodiParams = {
      ...DODI_BASE,
      expr: "scared",
      mouthOpen: spDodi.mouthOpen,
      armL: [-128, -32],
      armR: [118, 32],
      lean: -5,
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 1.0, earpiece: true, fx: "shock" };

    dirPos = [400.40, 0.29, -1.25];
    dirParams = {
      ...DIREKTUR_BASE,
      expr: "angry",
      mouthOpen: spDir.mouthOpen || 0.85,
      armL: [-138 + Math.sin(t * 16) * 16, -18],
      armR: [134 - Math.sin(t * 16) * 16, 18],
      headTilt: spDir.nodDeg,
      squash: talkSquash(spDir),
    };
    dirExtra = { fx: "anger" };
  } else {
    // Scene 8 (`akhir`): Wide Lab CIA Finale -> Gentle pan to Ara -> Gentle pan to Dodi -> Clear Medium-Wide Push on Agen Meong!
    const fBatal = ev("akh.batal");
    const fFakta = ev("akh.fakta");
    const fMeong = ev("akh.meong");
    cam = evalSmoothCam(frame, scMeta.startFrame, [
      { to: fBatal + 95, mode: "crane", p0: [0.55, 2.25, 3.65], p1: [0.05, 1.78, 3.15], l0: [0.0, 1.34, -1.25], l1: [0.0, 1.30, -1.25], fov: 49, fov1: 47 },
      { to: fFakta + 115, mode: "glide", p0: [0.45, 1.68, 2.95], p1: [0.55, 1.65, 2.75], l0: [0.55, 1.30, -0.95], l1: [0.60, 1.30, -0.95], fov: 47, fov1: 46, blendFrames: 20 },
      { to: fMeong - 24, mode: "glide", p0: [-0.45, 1.66, 2.90], p1: [-0.50, 1.62, 2.70], l0: [-0.55, 1.28, -0.95], l1: [-0.60, 1.26, -0.95], fov: 47, fov1: 45, blendFrames: 20 },
      { to: scMeta.endFrame, mode: "glide", p0: [0.15, 1.68, 2.55], p1: [0.20, 1.60, 1.65], l0: [0.22, 1.34, -1.45], l1: [0.22, 1.36, -1.45], fov: 45, fov1: 42, roll0: 0, roll1: -1.8, blendFrames: 20 },
    ]);

    const aWalk = smooth(frame, fBatal + 75, fFakta + 20, 0, 1);
    const aW = aWalk > 0.02 && aWalk < 0.98 ? beanWalk(t * 2.0, 0.8) : {};
    araPos = [lerpN(1.60, 1.08, aWalk), 0, -0.85];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      ...aW,
      expr: spAra.talking ? "happy" : "smug",
      mouthOpen: spAra.mouthOpen,
      armR: [58 + Math.sin(t * 7) * 10, -22],
      headTilt: -5 + spAra.nodDeg,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: spAra.talking ? "sparkle" : "none" };

    dodiPos = [-1.08, 0, -0.85];
    dodiParams = {
      ...DODI_BASE,
      expr: frame >= fFakta + 95 ? "sad" : "worried",
      mouthOpen: spDodi.mouthOpen,
      armL: [-10, 8],
      armR: [10, -8],
      lean: frame >= fFakta + 95 ? 9 : 3,
      headTilt: frame >= fFakta + 95 ? 11 : 2,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 0.80, earpiece: true, fx: frame >= fFakta + 95 ? "sweat" : "none" };

    catPos = [0.22, 1.09, -1.45];
    catHeight = 0.80;
    catOpts = { expr: "makan", fishInMouth: true, shades: true, antenna: true, vest: true };
  }

  const xrayScale = activeScene === "xray" ? spring({ frame: f, fps, config: { damping: 14, stiffness: 100 } }) : 0;

  // Diplomats react cleanly in shock WITHOUT bouncing up and down!
  const diploShock = activeScene === "kacau" || (activeScene === "lepas" && frame >= ev("lep.taksi") - 15);

  return (
    <>
      <CameraRig cam={cam} shake={shake} />

      <ambientLight intensity={activeScene === "van" || activeScene === "direktur" ? 0.58 : 0.86} color="#fff5e4" />
      <hemisphereLight args={["#cfe4ff", "#7a5b3c", 0.68]} />
      <directionalLight position={[12, 18, 12]} intensity={1.38} color="#ffe7c4" />
      <directionalLight position={[812, 18, 12]} intensity={1.58} color="#ffd9a0" />
      <directionalLight position={[410, 14, 10]} intensity={1.18} color="#ffe0b5" />
      <pointLight position={[0, 3.1, -1.4]} intensity={2.4} distance={14} color="#ffe6b0" />
      <pointLight position={[400, 2.6, -0.3]} intensity={2.6} distance={10} color="#ffe2a3" />
      <pointLight position={[399.2, 1.7, -0.6]} intensity={1.5} distance={6} color="#4cff9b" />
      {activeScene === "xray" && <pointLight position={[200, 3.2, 2.5]} intensity={2.6} color="#58e4ff" />}

      {sceneRoot && <primitive object={sceneRoot} />}

      <SunsetSkyDome center={[400, 0, 0]} />
      <SunsetSkyDome center={[800, 0, 0]} />

      <Signboard3D
        position={B2T(-0.85, 3.92, 2.48)}
        size={[1.98, 0.72]}
        title="ACOUSTIC KITTY"
        subtitle="ANGGARAN: $20,000,000 · CIA"
        bg="#142d4c"
        fg="#ffe45e"
        border="#58f5ff"
      />
      <Signboard3D
        position={B2T(4.4, 1.42, 2.74)}
        size={[2.15, 0.56]}
        title="IKAN BAKAR SEGAR"
        subtitle="TONGKOL HANGAT · $1"
        bg="#c82822"
        fg="#ffea61"
        border="#fff4d6"
      />

      {activeScene === "xray" && (
        <>
          <BlueXrayStage center={[200, 0, 0]} />
          <group position={[200, 0, 0]} scale={[xrayScale, xrayScale, xrayScale]}>
            <CatXray3D position={[0, 1.25, 0]} phase={t} />
          </group>
        </>
      )}

      {(activeScene === "lepas" || activeScene === "kacau") && (
        <>
          <AgentBeanCard
            position={[798.25, 0.16, -5.35]}
            height={1.62}
            facing={1}
            params={{
              ...DIPLOMAT_BASE,
              expr: diploShock ? "shock" : "talk",
              armL: diploShock ? [-122, -18] : [-15, 10],
              armR: diploShock ? [122, 18] : [38, -24],
              prop: "paper",
              propHand: "R",
              mouthOpen: diploShock ? 0.75 : 0.35 * Math.abs(Math.sin(t * 7)),
              sweat: diploShock,
            }}
            extra={{ fx: diploShock ? "shock" : "none" }}
          />
          <AgentBeanCard
            position={[799.15, 0.16, -5.35]}
            height={1.62}
            facing={-1}
            params={{
              ...DIPLOMAT_BASE,
              torso: "#2c3440",
              expr: diploShock ? "scared" : "think",
              armL: diploShock ? [-115, 22] : [-28, 18],
              armR: diploShock ? [115, -22] : [18, -12],
              sweat: diploShock,
            }}
            extra={{ fx: diploShock ? "question" : "none" }}
          />
          <GrilledFishSmoke position={[803.98, 1.62, -2.05]} phase={t} />
          <SignalWaveArcs
            from={[catPos[0], catPos[1] + 0.72, catPos[2]]}
            color={activeScene === "kacau" ? "#ff772e" : "#4cff91"}
            phase={t}
          />
        </>
      )}

      {activeScene === "akhir" && <FloatingDollarRain center={[0, 0.2, -1.2]} phase={t} />}

      {dodiPos[1] > -50 && (
        <AgentBeanCard position={dodiPos} height={1.72} facing={dodiFacing} params={dodiParams} extra={dodiExtra} />
      )}
      {araPos[1] > -50 && (
        <AgentBeanCard position={araPos} height={1.66} facing={araFacing} params={araParams} extra={araExtra} />
      )}
      {dirPos[1] > -50 && (
        <AgentBeanCard position={dirPos} height={1.82} facing={-1} params={dirParams} extra={dirExtra} />
      )}
      {catPos[1] > -50 && (
        <CatCard position={catPos} height={catHeight} facing={catFacing} opts={catOpts} />
      )}
    </>
  );
};

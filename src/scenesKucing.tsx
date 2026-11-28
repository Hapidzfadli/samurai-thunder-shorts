/**
 * 8 Adegan Penuh V2 DINAMIS & INTERAKTIF — "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)"
 * Upgrade V2 ala Rudal Merpati 1944 + Latar 3D Blender V2:
 *   - Sistem Kamera `riksCam` penuh (34 shot dinamis, ganti sudut tiap 2,5-4 dtk:
 *     crane | push | ots | snap 8f easeOutBack | whip 9f + roll ±4° | true Hitchcock vertigo dolly-zoom)
 *   - Handheld micro-breathing di 100% frame (0% frame mati!) + `kick()` camera shake pada momen impact
 *   - Per-word Whisper lip-sync + `wordNod()` anggukan kata penting
 *   - Karakter aktif berjalan/berlari (`beanWalk`), membuka pintu van, mengejar kucing, Diplomat kaget bereaksi,
 *     dan 8 properti 3D Blender `ANIM_*` tersinkronisasi penuh!
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
const easeOutBack = (x: number) => 1 + 2.3 * Math.pow(x - 1, 3) + 1.3 * Math.pow(x - 1, 2);
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
/* KOREOGRAFI KAMERA DINAMIS ALA @RicksClips3000 (`riksCam`)          */
/* 6 Jurus: crane | push | ots | snap (8f) | whip (9f+roll) | vertigo */
/* ================================================================== */
type CamMode = "crane" | "push" | "ots" | "snap" | "whip" | "vertigo";
type RiksShot = {
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
  whipDir?: 1 | -1;
};
type CamState = { pos: Vec3; look: Vec3; fov: number; roll: number };

const evalRawShot = (s: RiksShot, local: number, len: number): CamState => {
  const mode = s.mode ?? "push";
  const x = cl(local / Math.max(1, len));
  const f0 = s.fov ?? 40;
  const f1 = s.fov1 ?? f0;

  if (mode === "vertigo") {
    // True Hitchcock / @RicksClips3000 Dolly-Zoom: distance scales inversely with tan(fov/2)
    const k = smoother(x);
    const fov = lerpN(f0, f1, k);
    const look = lerp3(s.l0, s.l1 ?? s.l0, k);
    const dx = s.p0[0] - s.l0[0];
    const dy = s.p0[1] - s.l0[1];
    const dz = s.p0[2] - s.l0[2];
    const d0 = Math.max(0.25, Math.hypot(dx, dy, dz));
    const scale = Math.tan((f0 * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
    const d = d0 * scale;
    const pos: Vec3 = [look[0] + (dx / d0) * d, look[1] + (dy / d0) * d, look[2] + (dz / d0) * d];
    return { pos, look, fov, roll: lerpN(s.roll0 ?? -1, s.roll1 ?? -6.2, k) };
  }

  if (mode === "snap") {
    // ECU Snap-Zoom cepat (8 frame easeOutBack) + micro-creep agar terus bernapas!
    const snapK = cl(local / 8);
    const k = snapK < 1 ? cl(easeOutBack(snapK), 0, 1.07) : 1;
    const creep = 1 - 0.0012 * Math.max(0, local - 8);
    const look = lerp3(s.l0, s.l1 ?? s.l0, smoother(x));
    const baseP = lerp3(s.p0, s.p1 ?? s.p0, k);
    const pos: Vec3 = [
      look[0] + (baseP[0] - look[0]) * creep,
      look[1] + (baseP[1] - look[1]) * creep,
      look[2] + (baseP[2] - look[2]) * creep,
    ];
    return {
      pos,
      look,
      fov: lerpN(f0, f1, Math.min(1, k)),
      roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, smoother(x)),
    };
  }

  const k = mode === "crane" ? 1 - Math.pow(1 - x, 2.4) : smoother(x);
  const look = lerp3(s.l0, s.l1 ?? s.l0, k);
  const p = lerp3(s.p0, s.p1 ?? s.p0, k);
  const push = 1 - 0.00095 * Math.min(local, 360);
  const pos: Vec3 = [
    look[0] + (p[0] - look[0]) * push,
    look[1] + (p[1] - look[1]) * push,
    look[2] + (p[2] - look[2]) * push,
  ];
  return { pos, look, fov: lerpN(f0, f1, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
};

const evalRiksCam = (frame: number, sceneStart: number, shots: RiksShot[]): CamState => {
  let start = sceneStart;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, s.to - start);
      const local = Math.max(0, frame - start);
      const cur = evalRawShot(s, local, len);

      // Whip-Pan 9 frame (0.30 dtk) dari posisi akhir shot sebelumnya + ayunan roll ±4.2°!
      let out = cur;
      if (s.mode === "whip" && i > 0 && local < 9) {
        const prev = shots[i - 1];
        const prevStart = i >= 2 ? shots[i - 2].to : sceneStart;
        const prevLen = Math.max(1, prev.to - prevStart);
        const prevEnd = evalRawShot(prev, prevLen, prevLen);
        const w = smoother(cl(local / 9));
        const dir = s.whipDir ?? (cur.pos[0] >= prevEnd.pos[0] ? 1 : -1);
        const whipRoll = Math.sin(w * Math.PI) * 4.2 * dir;
        out = {
          pos: lerp3(prevEnd.pos, cur.pos, w),
          look: lerp3(prevEnd.look, cur.look, w),
          fov: lerpN(prevEnd.fov, cur.fov, w),
          roll: lerpN(prevEnd.roll, cur.roll, w) + whipRoll,
        };
      }

      // Handheld micro-breathing halus di 100% frame (0% frame mati!)
      const brX = Math.sin(frame * 0.082) * 0.022;
      const brY = Math.cos(frame * 0.068) * 0.016;
      const brR = Math.sin(frame * 0.055) * 0.35;
      return {
        pos: [out.pos[0] + brX, out.pos[1] + brY, out.pos[2]],
        look: [out.look[0] + brX * 0.45, out.look[1] + brY * 0.45, out.look[2]],
        fov: out.fov,
        roll: out.roll + brR,
      };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 40, roll: 0 };
};

/** Impact camera kick/shake on loud comedy hits (brakes, shouts, slams)! */
const camKick = (f: number, hits: number[], amp = 0.12, len = 11): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < len) {
      const a = (1 - d / len) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 3 ? 1 : -1) * a * 0.72;
    }
  }
  return [x, y, 0];
};

/** TRUE PER-WORD Whisper lip-sync + emphasized-word head nod (`wordNod`)! */
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
        mouthOpen = cl(0.35 + 0.65 * Math.abs(Math.sin((globalFrame - w.startFrame) * 0.96 + w.startFrame)));
      }
      if (w.word.length > 5) {
        nodDeg += pulse(globalFrame, w.startFrame - 1, 8) * 5.5;
      }
    }
  } else {
    const t = (globalFrame - active.startFrame) / 30;
    mouthOpen = cl(0.38 + 0.52 * Math.abs(Math.sin(t * 21)));
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
  camera.lookAt(cam.look[0] + shake[0] * 0.5, cam.look[1] + shake[1] * 0.5, cam.look[2]);
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
 * Main 3D World V2 + 34-Shot riksCam + Active beanWalk/Running + 8 Animated Blender GLB Props!
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
  const vanSpeed = activeScene === "direktur" ? 9.0 : 4.6;
  if (reelVanL) reelVanL.rotation.x = t * vanSpeed;
  if (reelVanR) reelVanR.rotation.x = t * (vanSpeed * 1.18);
  if (vanRadar) {
    vanRadar.rotation.y = activeScene === "kacau" ? t * 5.2 : t * 1.8;
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
      if (sinceBrake > 0 && sinceBrake < 38) {
        pitch = -0.17 * Math.exp(-sinceBrake * 0.1) * Math.sin(sinceBrake * 0.38);
      }
    }
    yellowTaxi.position.set(tx, 0, 2.5);
    yellowTaxi.rotation.z = pitch;
  }
  if (fishCart) {
    const fJump = ev("kac.gerobak");
    let rock = Math.sin(t * 5.5) * 0.008;
    if (activeScene === "kacau" && frame >= fJump) {
      const dt = frame - fJump;
      rock = Math.sin(dt * 0.72) * 0.095 * Math.exp(-dt * 0.075);
    }
    fishCart.rotation.z = rock;
  }

  // ========== TRUE PER-WORD WHISPER LIP-SYNC & NOD STATES ==========
  const spDodi = useSpeakState(timing, frame, "dodi");
  const spAra = useSpeakState(timing, frame, "ara");
  const spDir = useSpeakState(timing, frame, "direktur");

  const blink = (seed: number) => Math.sin(t * 2.4 + seed) > 0.965;
  const talkHop = (sp: { mouthOpen: number }) => (sp.mouthOpen > 0.15 ? Math.abs(Math.sin(t * 15)) * 0.055 : 0);
  const talkSquash = (sp: { mouthOpen: number }) => (sp.mouthOpen > 0.15 ? Math.sin(t * 15) * 0.048 : Math.sin(t * 3.2) * 0.015);

  // ========== CAMERA SHAKE HITS ACROSS ENTIRE VIDEO ==========
  const shake = camKick(
    frame,
    [
      ev("hook.dolar"),
      ev("hook.kucing"),
      ev("lab.hah"),
      ev("van.pintu") + 6,
      ev("lep.apa"),
      ev("lep.taksi"),
      ev("kac.ngerem") - 2,
      ev("kac.gerobak"),
      ev("dir.siapa"),
      ev("dir.siapa") + 28,
      ev("dir.siapa") + 58,
      ev("dir.ikan"),
      ev("akh.batal"),
    ],
    activeScene === "direktur" || activeScene === "kacau" ? 0.16 : 0.10,
    12
  );

  // ========== 34-SHOT DYNAMIC `riksCam` & ACTIVE CHARACTER ACTING ==========
  let cam: CamState = { pos: [0, 1.8, 4.5], look: [0, 1.3, -1.5], fov: 42, roll: 0 };

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
    // 4 Dynamic Shots: Crane establish -> Whip to Dodi walking in -> OTS past Dodi -> Snap 8f ECU on Agen Meong!
    const fDolar = ev("hook.dolar");
    const fCat = ev("hook.kucing");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fDolar - 10, mode: "crane", p0: [2.1, 3.2, 3.5], p1: [0.65, 1.95, 2.25], l0: [-0.3, 1.55, -1.9], l1: [-0.25, 1.35, -1.45], fov: 46, fov1: 42, roll0: 1.8, roll1: 0 },
      { to: fCat - 70, mode: "whip", p0: [-0.55, 1.56, 1.55], p1: [-0.85, 1.50, 1.25], l0: [-1.25, 1.32, -0.58], l1: [-1.15, 1.32, -0.58], fov: 38, fov1: 35, whipDir: -1 },
      { to: fCat - 8, mode: "ots", p0: [-1.75, 1.62, 0.55], p1: [-1.35, 1.58, 0.35], l0: [0.22, 1.35, -1.45], l1: [0.22, 1.38, -1.45], fov: 40, fov1: 37, roll0: -1.5, roll1: 0.5 },
      { to: scMeta.endFrame, mode: "snap", p0: [0.45, 1.56, 0.55], p1: [0.24, 1.48, -0.15], l0: [0.22, 1.36, -1.45], l1: [0.22, 1.40, -1.45], fov: 40, fov1: 30, roll0: 0, roll1: -2.4 },
    ]);

    // Dodi walks confidently from left into Lab CIA (`beanWalk`!) and gestures to the podium
    const walkK = smooth(frame, scMeta.startFrame + 10, fDolar + 15, 0, 1);
    const isWalking = walkK > 0.02 && walkK < 0.98;
    const dodiX = lerpN(-2.65, -1.22, walkK);
    const walkPose = isWalking ? beanWalk(t * 2.4, 1.0) : {};
    dodiPos = [dodiX, 0 + (isWalking ? 0 : talkHop(spDodi)), -0.58];
    dodiParams = {
      ...DODI_BASE,
      ...walkPose,
      expr: spDodi.talking ? "talk" : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: isWalking ? walkPose.armR : [68 + Math.sin(t * 10) * 16, -28],
      armL: isWalking ? walkPose.armL : [-22, 14],
      headTilt: spDodi.nodDeg,
      squash: talkSquash(spDodi),
      blink: blink(1),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame >= fDolar ? "sparkle" : "none" };

    // Agen Meong hops onto the velvet cushion, flips sunglasses off for iconic deadpan CUEK!
    const catHop = pulse(frame, fCat - 12, 14) * 0.28;
    const isCuek = frame >= fCat + 10;
    catPos = [0.22, 1.09 + catHop, -1.45];
    catHeight = 0.78;
    catOpts = {
      expr: isCuek ? "cuek" : "smug",
      shades: !isCuek,
      shadesSlip: frame >= fCat && !isCuek ? 0.75 : 0,
      antenna: true,
      vest: true,
    };
  } else if (activeScene === "lab") {
    // 5 Dynamic Shots: Push Dodi walking -> Whip Ara stepping forward HAH?! -> Snap ECU Ara -> Whip Dodi boasting -> Snap Agen Meong Zzz!
    const fMeong = ev("lab.meong");
    const fHah = ev("lab.hah");
    const fNyadap = ev("lab.nyadap");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fMeong - 10, mode: "push", p0: [-0.45, 1.54, 1.95], p1: [-0.62, 1.48, 1.42], l0: [-1.12, 1.28, -0.52], l1: [-1.05, 1.30, -0.52], fov: 38, fov1: 35 },
      { to: fHah - 4, mode: "whip", p0: [0.05, 1.65, 2.35], p1: [0.15, 1.58, 1.85], l0: [0.18, 1.32, -1.35], l1: [0.22, 1.36, -1.45], fov: 40, fov1: 36, whipDir: 1 },
      { to: fHah + 85, mode: "snap", p0: [0.95, 1.58, 2.05], p1: [1.05, 1.52, 1.38], l0: [1.15, 1.30, -0.52], l1: [1.12, 1.32, -0.52], fov: 40, fov1: 33, roll0: 2.5, roll1: -1.5 },
      { to: fNyadap + 35, mode: "whip", p0: [-0.55, 1.52, 1.75], p1: [-0.40, 1.56, 1.95], l0: [-1.10, 1.30, -0.52], l1: [-0.70, 1.28, -0.75], fov: 36, fov1: 40, whipDir: -1 },
      { to: scMeta.endFrame, mode: "snap", p0: [0.35, 1.58, 1.15], p1: [0.26, 1.48, 0.05], l0: [0.22, 1.32, -1.45], l1: [0.22, 1.38, -1.45], fov: 40, fov1: 31, roll0: 0, roll1: 2.4 },
    ]);

    // Dodi steps closer while boasting (`beanWalk`)
    const dWalk = smooth(frame, scMeta.startFrame, scMeta.startFrame + 45, 0, 1);
    const dIsW = dWalk > 0.02 && dWalk < 0.98;
    const dW = dIsW ? beanWalk(t * 2.2, 0.9) : {};
    dodiPos = [lerpN(-1.65, -1.12, dWalk), 0 + (dIsW ? 0 : talkHop(spDodi)), -0.52];
    dodiParams = {
      ...DODI_BASE,
      ...dW,
      expr: spDodi.talking ? (frame >= fNyadap ? "smug" : "talk") : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: dIsW ? dW.armR : spDodi.talking ? [78 + Math.sin(t * 14) * 20, -34] : [45, -20],
      armL: dIsW ? dW.armL : [-20, 16],
      headTilt: spDodi.nodDeg + Math.sin(t * 4) * 3,
      squash: talkSquash(spDodi),
      blink: blink(2),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame < fHah ? "sparkle" : "none" };

    // Ara walks in from right edge (`beanWalk`) then freezes in shock at HAH?!
    const aWalk = smooth(frame, fMeong - 25, fHah - 4, 0, 1);
    const aIsW = aWalk > 0.02 && aWalk < 0.98;
    const aW = aIsW ? beanWalk(t * 2.5, 1.0) : {};
    const araJump = pulse(frame, fHah, 12) * 0.16;
    araPos = [lerpN(2.25, 1.15, aWalk), araJump + (aIsW ? 0 : talkHop(spAra)), -0.52];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      ...aW,
      expr: frame >= fHah && frame < fNyadap ? "shock" : "think",
      mouthOpen: spAra.mouthOpen,
      armL: aIsW ? aW.armL : frame >= fHah && frame < fNyadap ? [-108, 22] : [-42, 25],
      armR: aIsW ? aW.armR : spAra.talking ? [84 + Math.sin(t * 16) * 22, -26] : [35, -18],
      headTilt: spAra.nodDeg + (spAra.talking ? 7 : -4),
      sweat: frame >= fHah && frame < fNyadap,
      squash: talkSquash(spAra),
      blink: blink(5),
    };
    araExtra = { fx: frame >= fHah && frame < fNyadap ? "question" : "none" };

    // Agen Meong ignores Dodi, turns away, and falls asleep Zzz!
    catPos = [0.22, 1.09, -1.45];
    catFacing = frame >= fNyadap - 10 ? -1 : 1;
    catHeight = 0.76;
    catOpts = { expr: frame >= fNyadap ? "ngantuk" : "cuek", antenna: true, vest: true };
  } else if (activeScene === "xray") {
    // 5 Dynamic Shots instead of 1 slow 19s orbit!
    const cx = 200;
    const fKuping = ev("xr.kuping");
    const fEkor = ev("xr.ekor");
    const fYakin = ev("xr.yakin");
    const fProf = ev("xr.profesional");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fKuping - 8, mode: "crane", p0: [cx - 2.6, 3.2, 5.2], p1: [cx - 0.6, 2.0, 4.4], l0: [cx, 1.35, 0], l1: [cx, 1.30, 0], fov: 46, fov1: 42 },
      { to: fEkor - 8, mode: "snap", p0: [cx - 0.5, 1.95, 4.2], p1: [cx + 0.35, 1.85, 3.05], l0: [cx, 1.35, 0], l1: [cx + 0.15, 1.45, 0], fov: 42, fov1: 34, roll0: 0, roll1: 2.2 },
      { to: fYakin - 8, mode: "whip", p0: [cx + 2.6, 2.1, 3.3], p1: [cx + 2.1, 1.9, 3.6], l0: [cx - 0.35, 1.45, 0], l1: [cx, 1.32, 0], fov: 38, fov1: 42, whipDir: 1 },
      { to: fProf - 24, mode: "whip", p0: [cx + 1.0, 1.55, 1.45], p1: [cx + 1.18, 1.50, 1.12], l0: [cx + 1.45, 1.28, -1.15], l1: [cx + 1.45, 1.28, -1.15], fov: 38, fov1: 33, whipDir: 1, roll0: -2, roll1: 1.5 },
      { to: scMeta.endFrame, mode: "snap", p0: [cx - 0.9, 1.62, 1.85], p1: [cx - 1.12, 1.52, 1.15], l0: [cx - 1.45, 1.28, -1.15], l1: [cx - 1.45, 1.30, -1.15], fov: 40, fov1: 32, roll0: 2.5, roll1: -1.8 },
    ]);

    const dWalk = smooth(frame, fProf - 35, fProf + 5, 0, 1);
    const dW = dWalk > 0.02 && dWalk < 0.98 ? beanWalk(t * 2.4, 0.9) : {};
    dodiPos = [lerpN(cx - 1.75, cx - 1.45, dWalk), 0 + talkHop(spDodi), -1.15];
    dodiParams = {
      ...DODI_BASE,
      ...dW,
      expr: spDodi.talking ? "smug" : "happy",
      mouthOpen: spDodi.mouthOpen,
      armR: [76 + Math.sin(t * 12) * 14, -24],
      headTilt: spDodi.nodDeg,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame >= fProf - 20 ? "sparkle" : "none" };

    const aWalk = smooth(frame, fYakin - 25, fYakin + 10, 0, 1);
    const aW = aWalk > 0.02 && aWalk < 0.98 ? beanWalk(t * 2.2, 0.85) : {};
    araPos = [lerpN(cx + 1.85, cx + 1.45, aWalk), 0 + talkHop(spAra), -1.15];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      ...aW,
      expr: spAra.talking ? "think" : "worried",
      mouthOpen: spAra.mouthOpen,
      armR: [54 + Math.sin(t * 10) * 12, -26],
      headTilt: 8 + spAra.nodDeg,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: spAra.talking ? "question" : "sweat" };
  } else if (activeScene === "van") {
    // 5 Dynamic Shots: Reels & CRT push -> OTS behind Dodi -> Whip to Dodi sliding open ANIM_VanDoor -> Cat leap -> Snap ECU Ara with IKAN box!
    const fNapas = ev("van.napas");
    const fPintu = ev("van.pintu");
    const fIkan = ev("van.ikan");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fNapas - 12, mode: "push", p0: [401.25, 1.72, 2.35], p1: [400.72, 1.56, 1.35], l0: [399.05, 1.50, -0.9], l1: [399.5, 1.42, -1.2], fov: 46, fov1: 42 },
      { to: fPintu - 12, mode: "ots", p0: [398.95, 1.65, 0.35], p1: [399.15, 1.60, 0.15], l0: [400.1, 1.40, -2.5], l1: [400.5, 1.32, -2.5], fov: 44, fov1: 38, roll0: -1.5, roll1: 0.5 },
      { to: fPintu + 38, mode: "whip", p0: [400.25, 1.52, 1.15], p1: [399.9, 1.44, 0.92], l0: [401.4, 1.18, -0.45], l1: [402.1, 1.05, -0.45], fov: 42, fov1: 38, whipDir: 1 },
      { to: fIkan - 36, mode: "push", p0: [400.3, 1.54, 1.25], p1: [400.1, 1.54, 1.35], l0: [401.2, 1.25, -0.55], l1: [400.85, 1.32, -0.55], fov: 40, fov1: 37 },
      { to: scMeta.endFrame, mode: "snap", p0: [400.05, 1.56, 1.55], p1: [400.28, 1.52, 0.85], l0: [400.85, 1.32, -0.55], l1: [400.85, 1.35, -0.55], fov: 40, fov1: 31, roll0: 0, roll1: -3.2 },
    ]);

    // Dodi steps toward sliding door to pull it open!
    const pullK = smooth(frame, fPintu - 18, fPintu + 14, 0, 1);
    const dWalk = pullK > 0.02 && pullK < 0.98 ? beanWalk(t * 2.4, 0.85) : {};
    dodiPos = [lerpN(399.45, 400.15, pullK), 0.29 + talkHop(spDodi), -0.85];
    dodiParams = {
      ...DODI_BASE,
      ...dWalk,
      expr: spDodi.talking ? "talk" : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: frame >= fPintu - 6 ? [98, -18] : [54, -36],
      lean: 6,
      headTilt: spDodi.nodDeg,
      squash: talkSquash(spDodi),
      blink: blink(3),
    };
    dodiExtra = { shades: true, earpiece: true };

    araPos = [400.85, 0.29 + talkHop(spAra), -0.55];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      expr: frame >= fIkan - 30 ? "worried" : "neutral",
      mouthOpen: spAra.mouthOpen,
      armR: [48 + Math.sin(t * 10) * 12, -24],
      headTilt: 7 + spAra.nodDeg,
      sweat: frame >= fIkan - 28,
      squash: talkSquash(spAra),
      blink: blink(7),
    };
    araExtra = { fishBox: true, fx: frame >= fIkan - 25 ? "sweat" : "none" };

    // Agen Meong hops smoothly out the sliding door!
    const hopOut = smooth(frame, fPintu + 4, fPintu + 34, 0, 1);
    catPos = [400.9 + hopOut * 1.8, 0.32 + Math.sin(hopOut * Math.PI) * 0.55, -0.42];
    catHeight = 0.70;
    catOpts = {
      expr: frame >= fIkan - 20 ? "lapar" : "fokus",
      shades: true,
      shadesSlip: frame >= fIkan - 20 ? 0.85 : 0,
      antenna: true,
      vest: true,
      runCycle: hopOut > 0.05 && hopOut < 0.95 ? t : 0,
    };
  } else if (activeScene === "lepas") {
    // 4 High-Energy Action Shots: Snap ECU Dodi APA?! -> Whip chase (Dodi & Ara SPRINTING!) -> Low-angle Cat sprint -> Dutch-tilt Taxi + Cat crosswalk!
    const fApa = ev("lep.apa");
    const fBelok = ev("lep.belok");
    const fTaksi = ev("lep.taksi");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fApa + 55, mode: "snap", p0: [798.7, 1.72, 2.95], p1: [798.75, 1.62, 1.45], l0: [798.75, 1.38, -1.55], l1: [798.75, 1.38, -1.55], fov: 42, fov1: 31, roll0: 0, roll1: -3.2 },
      { to: fBelok + 10, mode: "whip", p0: [799.1, 2.05, 5.2], p1: [800.1, 1.95, 5.4], l0: [798.5, 1.25, -1.2], l1: [799.6, 1.15, -0.8], fov: 46, fov1: 44, whipDir: 1, roll0: 2.5, roll1: -1.5 },
      { to: fTaksi - 6, mode: "whip", p0: [798.2, 1.15, 5.6], p1: [799.6, 1.25, 5.9], l0: [797.5, 0.78, 1.9], l1: [799.2, 0.78, 2.2], fov: 44, fov1: 46, whipDir: 1, roll0: -2.0, roll1: 2.5 },
      { to: scMeta.endFrame, mode: "snap", p0: [799.4, 2.25, 8.2], p1: [799.1, 2.05, 7.6], l0: [798.4, 0.92, 2.05], l1: [798.3, 0.88, 2.1], fov: 50, fov1: 44, roll0: -4.2, roll1: -2.5 },
    ]);

    // Dodi reacts APA?! (shades fly down!) THEN SPRINTS right chasing Agen Meong (`beanWalk` fast!)
    const slipAmt = smooth(frame, fApa, fApa + 8, 0, 1);
    const chaseK = smooth(frame, fApa + 50, scMeta.endFrame, 0, 1);
    const isChasing = chaseK > 0.02;
    const dRun = isChasing ? beanWalk(t * 3.8, 1.3) : {};
    const dodiJump = pulse(frame, fApa, 12) * 0.22;
    dodiPos = [lerpN(798.75, 800.85, chaseK), 0.16 + dodiJump + (isChasing ? 0 : talkHop(spDodi)), -1.55];
    dodiParams = {
      ...DODI_BASE,
      ...dRun,
      expr: "shock",
      mouthOpen: spDodi.mouthOpen || 0.85,
      armL: [-138 + Math.sin(t * 24) * 20, -20],
      armR: [138 - Math.sin(t * 24) * 20, 20],
      lean: isChasing ? 10 : 0,
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: slipAmt, earpiece: true, fx: "shock" };

    // Ara also SPRINTS after Dodi holding her IKAN box!
    const aRun = isChasing ? beanWalk(t * 3.6 + 0.4, 1.2) : {};
    araPos = [lerpN(796.65, 799.2, chaseK), 0.16 + (isChasing ? 0 : talkHop(spAra)), -1.55];
    araFacing = 1;
    araParams = {
      ...ARA_CIA,
      ...aRun,
      expr: "scared",
      mouthOpen: spAra.mouthOpen,
      armR: [122, -18],
      armL: [-112, 22],
      lean: isChasing ? 9 : 0,
      sweat: true,
      squash: talkSquash(spAra),
    };
    araExtra = { fishBox: true, fx: "shock" };

    // Agen Meong sprints furiously across the zebra crosswalk right beside the Yellow Taxi!
    const runK = smooth(frame, scMeta.startFrame + 16, scMeta.endFrame, 0, 1);
    catPos = [796.2 + runK * 3.8, 0.12 + Math.abs(Math.sin(t * 16)) * 0.18, 1.95 + Math.sin(runK * Math.PI) * 0.55];
    catHeight = 0.90;
    catOpts = {
      expr: runK < 0.25 ? "lapar" : "lari",
      shades: runK < 0.30,
      shadesSlip: 1.0,
      antenna: true,
      vest: true,
      runCycle: runK > 0.1 ? t * 1.25 : 0,
    };
  } else if (activeScene === "kacau") {
    // 4 Action Shots: Snap Taxi Brake CIIIT! -> Whip tracking Cat high arc leap -> Hero push on Fish Cart -> Whip to smug Ara!
    const fBrake = ev("kac.ngerem");
    const fGerobak = ev("kac.gerobak");
    const fRadar = ev("kac.radar");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fBrake + 26, mode: "snap", p0: [800.8, 1.62, 6.4], p1: [801.2, 1.45, 5.2], l0: [800.4, 0.95, 2.3], l1: [801.1, 0.95, 2.3], fov: 46, fov1: 38, roll0: -4.5, roll1: 2.0 },
      { to: fGerobak + 12, mode: "whip", p0: [802.2, 1.95, 4.4], p1: [803.2, 1.95, 3.2], l0: [803.0, 1.65, -0.5], l1: [804.4, 1.72, -2.0], fov: 44, fov1: 38, whipDir: 1 },
      { to: fRadar + 10, mode: "snap", p0: [803.6, 2.05, 1.8], p1: [804.1, 1.98, 0.85], l0: [804.4, 1.70, -2.05], l1: [804.4, 1.74, -2.05], fov: 38, fov1: 31, roll0: 2.0, roll1: -1.8 },
      { to: scMeta.endFrame, mode: "whip", p0: [802.9, 1.62, 1.55], p1: [803.3, 1.72, 1.95], l0: [802.45, 1.32, -1.25], l1: [803.6, 1.55, -1.75], fov: 36, fov1: 42, whipDir: -1 },
    ]);

    // Agen Meong leaps high from crosswalk onto Fish Cart counter & bounces happily while eating!
    const leapK = smooth(frame, scMeta.startFrame + 16, fGerobak + 6, 0, 1);
    const chewBounce = leapK >= 0.99 ? Math.abs(Math.sin(t * 10)) * 0.07 : 0;
    const catX = lerpN(801.3, 804.4, leapK);
    const catY = lerpN(0.16, 1.48, leapK) + Math.sin(leapK * Math.PI) * 1.45 + chewBounce;
    const catZ = lerpN(1.75, -2.02, leapK);
    catPos = [catX, catY, catZ];
    catHeight = 0.82;
    catFacing = -1;
    catOpts = {
      expr: leapK < 0.88 ? "lari" : "makan",
      fishInMouth: leapK >= 0.88,
      shades: leapK >= 0.95,
      antenna: true,
      vest: true,
      runCycle: leapK < 0.88 ? t * 1.2 : 0,
    };

    // Dodi & Ara sprint up to the fish cart panting (`beanWalk`!)
    const chase2 = smooth(frame, scMeta.startFrame, fGerobak + 20, 0, 1);
    const isRun2 = chase2 < 0.95;
    const dRun2 = isRun2 ? beanWalk(t * 3.4, 1.15) : {};
    const aRun2 = isRun2 ? beanWalk(t * 3.2 + 0.5, 1.1) : {};
    dodiPos = [lerpN(800.4, 801.75, chase2), 0.16 + (isRun2 ? 0 : talkHop(spDodi)), -1.15];
    dodiParams = {
      ...DODI_BASE,
      ...dRun2,
      expr: "shock",
      mouthOpen: spDodi.mouthOpen,
      armR: [125, -20],
      armL: [-98, 22],
      lean: isRun2 ? 8 : 3,
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 1.0, earpiece: true, fx: "shock" };

    araPos = [lerpN(801.1, 802.45, chase2), 0.16 + (isRun2 ? 0 : talkHop(spAra)), -1.35];
    araFacing = 1;
    araParams = {
      ...ARA_CIA,
      ...aRun2,
      expr: frame >= fRadar - 6 ? "smug" : "shock",
      mouthOpen: spAra.mouthOpen,
      armR: [82 + Math.sin(t * 12) * 14, -24],
      headTilt: spAra.nodDeg,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: frame >= fRadar - 6 ? "sparkle" : "sweat" };
  } else if (activeScene === "direktur") {
    // 3 Explosive Climax Shots: Snap Dodi clutching earpiece -> TRUE VERTIGO DOLLY-ZOOM + Dutch Tilt on Pak Direktur! -> Snap wide slam!
    const fSiapa = ev("dir.siapa");
    const fIkan = ev("dir.ikan");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fSiapa - 4, mode: "snap", p0: [400.45, 1.58, 1.45], p1: [399.85, 1.52, 0.55], l0: [399.45, 1.38, -0.85], l1: [399.45, 1.40, -0.85], fov: 40, fov1: 31, roll0: 0, roll1: 3.0 },
      { to: fIkan - 12, mode: "vertigo", p0: [400.32, 1.58, 0.52], l0: [400.38, 1.44, -1.25], l1: [400.38, 1.46, -1.25], fov: 54, fov1: 24, roll0: -1.5, roll1: -6.8 },
      { to: scMeta.endFrame, mode: "snap", p0: [400.1, 1.62, 1.95], p1: [400.0, 1.56, 1.45], l0: [400.1, 1.40, -1.05], l1: [400.25, 1.44, -1.15], fov: 44, fov1: 36, roll0: 3.5, roll1: -3.5 },
    ]);

    dodiPos = [399.45 + Math.sin(t * 32) * 0.025, 0.29 + talkHop(spDodi), -0.85];
    dodiParams = {
      ...DODI_BASE,
      expr: "scared",
      mouthOpen: spDodi.mouthOpen,
      armL: [-135, -35],
      armR: [125, 35],
      lean: -6,
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 1.0, earpiece: true, fx: "shock" };

    const dirBounce = spDir.mouthOpen > 0.2 ? Math.abs(Math.sin(t * 20)) * 0.08 : 0;
    dirPos = [400.38 + (spDir.talking ? Math.sin(t * 42) * 0.045 : 0), 0.29 + dirBounce, -1.25];
    dirParams = {
      ...DIREKTUR_BASE,
      expr: "angry",
      mouthOpen: spDir.mouthOpen || 0.9,
      armL: [-142 + Math.sin(t * 30) * 22, -18],
      armR: [138 - Math.sin(t * 30) * 22, 18],
      headTilt: spDir.nodDeg,
      squash: talkSquash(spDir),
    };
    dirExtra = { fx: "anger" };
  } else {
    // Scene 8 (`akhir`): 4 Shots! Crane through raining $20M -> Whip Ara strolling & teasing -> Whip Dodi defeated -> Snap ECU Agen Meong SMUG!
    const fBatal = ev("akh.batal");
    const fFakta = ev("akh.fakta");
    const fMeong = ev("akh.meong");
    cam = evalRiksCam(frame, scMeta.startFrame, [
      { to: fBatal + 95, mode: "crane", p0: [0.65, 2.35, 3.15], p1: [0.05, 1.72, 2.35], l0: [0.0, 1.35, -1.35], l1: [0.0, 1.30, -1.35], fov: 46, fov1: 42 },
      { to: fFakta + 115, mode: "whip", p0: [0.65, 1.54, 1.55], p1: [0.82, 1.50, 1.15], l0: [1.15, 1.30, -0.85], l1: [1.05, 1.30, -0.85], fov: 38, fov1: 34, whipDir: 1 },
      { to: fMeong - 18, mode: "whip", p0: [-0.55, 1.50, 1.45], p1: [-0.68, 1.46, 1.12], l0: [-1.10, 1.26, -0.85], l1: [-1.10, 1.22, -0.85], fov: 38, fov1: 33, whipDir: -1, roll0: 0, roll1: 2.8 },
      { to: scMeta.endFrame, mode: "snap", p0: [0.22, 1.58, 1.05], p1: [0.22, 1.50, 0.35], l0: [0.22, 1.36, -1.45], l1: [0.22, 1.38, -1.45], fov: 40, fov1: 35, roll0: 0, roll1: -2.4 },
    ]);

    const aWalk = smooth(frame, fBatal + 75, fFakta + 20, 0, 1);
    const aW = aWalk > 0.02 && aWalk < 0.98 ? beanWalk(t * 2.2, 0.85) : {};
    araPos = [lerpN(1.65, 1.05, aWalk), 0 + talkHop(spAra), -0.85];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      ...aW,
      expr: spAra.talking ? "happy" : "smug",
      mouthOpen: spAra.mouthOpen,
      armR: [62 + Math.sin(t * 10) * 14, -22],
      headTilt: -6 + spAra.nodDeg,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: spAra.talking ? "sparkle" : "none" };

    dodiPos = [-1.10, 0 + talkHop(spDodi), -0.85];
    dodiParams = {
      ...DODI_BASE,
      expr: frame >= fFakta + 95 ? "sad" : "worried",
      mouthOpen: spDodi.mouthOpen,
      armL: [-10, 8],
      armR: [10, -8],
      lean: frame >= fFakta + 95 ? 10 : 3,
      headTilt: frame >= fFakta + 95 ? 12 : 2,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 0.82, earpiece: true, fx: frame >= fFakta + 95 ? "sweat" : "none" };

    const smugHop = Math.abs(Math.sin(t * 7)) * 0.05;
    catPos = [0.22, 1.09 + smugHop, -1.45];
    catHeight = 0.80;
    catOpts = { expr: "makan", fishInMouth: true, shades: true, antenna: true, vest: true };
  }

  const xrayScale = activeScene === "xray" ? spring({ frame: f, fps, config: { damping: 12, stiffness: 120 } }) : 0;

  // Diplomats on Washington park bench actually REACT in shock when the cat & taxi chaos starts!
  const diploShock = activeScene === "kacau" || (activeScene === "lepas" && frame >= ev("lep.taksi") - 15);
  const diploJump = diploShock ? Math.abs(Math.sin(t * 10)) * 0.12 : 0;

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
            position={[798.25, 0.16 + diploJump, -5.35]}
            height={1.62}
            facing={1}
            params={{
              ...DIPLOMAT_BASE,
              expr: diploShock ? "shock" : "talk",
              armL: diploShock ? [-125, -18] : [-15, 10],
              armR: diploShock ? [125, 18] : [38, -24],
              prop: "paper",
              propHand: "R",
              mouthOpen: diploShock ? 0.8 : 0.4 * Math.abs(Math.sin(t * 8)),
              sweat: diploShock,
            }}
            extra={{ fx: diploShock ? "shock" : "none" }}
          />
          <AgentBeanCard
            position={[799.15, 0.16 + diploJump * 0.8, -5.35]}
            height={1.62}
            facing={-1}
            params={{
              ...DIPLOMAT_BASE,
              torso: "#2c3440",
              expr: diploShock ? "scared" : "think",
              armL: diploShock ? [-118, 22] : [-28, 18],
              armR: diploShock ? [118, -22] : [18, -12],
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

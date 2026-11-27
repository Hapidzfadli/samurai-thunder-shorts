/**
 * 8 Adegan Penuh "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)"
 * Formula Rudal Merpati Upgraded:
 *   - Latar & Properti 3D Blender V2 (public/models/kucing_cia.glb) + animasi mulus 8 objek ANIM_*
 *   - Karakter 2D BeanCard Dodi, Ara, Pak Direktur CIA, Diplomat & Agen Meong ekstra ekspresif + lip-sync
 *   - 6 Jurus Kamera @RicksClips3000 (Crane-Down, Low-Angle Push-In, Through-Windshield,
 *     Whip-Pan + Roll, ECU Snap-Zoom, & Vertigo Dolly-Zoom + Dutch Tilt!)
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
import { BeanExpr, BeanParams } from "./three/objectsBean";
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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (f: number, a: number, b: number, y0 = 0, y1 = 1) =>
  interpolate(f, [a, Math.max(a + 1, b)], [y0, y1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
const lerp3 = (a: Vec3, b: Vec3, k: number): Vec3 => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

/** Check if a given voice is actively speaking at globalFrame & compute natural lip-sync mouthOpen! */
const useSpeakState = (timing: KucingTiming, globalFrame: number, voice: string) => {
  const active = timing.lines.find(
    (l) => l.voice === voice && globalFrame >= l.startFrame && globalFrame <= l.endFrame
  );
  if (!active) return { talking: false, mouthOpen: 0, style: "" };
  const t = (globalFrame - active.startFrame) / 30;
  const mouthOpen = clamp01(0.38 + 0.52 * Math.abs(Math.sin(t * 21)) * (0.7 + 0.3 * Math.cos(t * 9)));
  return { talking: true, mouthOpen, style: active.style };
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

/** Camera controller supporting full 3D position, lookAt target, FOV (Vertigo Dolly-Zoom!), & Roll (Dutch Tilt / Whip-Pan)! */
const CameraRig: React.FC<{ pos: Vec3; target: Vec3; fov?: number; rollDeg?: number }> = ({
  pos,
  target,
  fov = 42,
  rollDeg = 0,
}) => {
  const { camera } = useThree();
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(target[0], target[1], target[2]);
  if (Math.abs(rollDeg) > 0.001) {
    camera.rotateZ((rollDeg * Math.PI) / 180);
  }
  const pc = camera as THREE.PerspectiveCamera;
  if (Math.abs(pc.fov - fov) > 0.05) {
    pc.fov = fov;
    pc.updateProjectionMatrix();
  }
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
 * Main 3D World + Animated Blender GLB Props + All 8 Comedy Scenes!
 */
export const KucingWorld3D: React.FC<{ timing: KucingTiming; sceneRoot: THREE.Group | null }> = ({ timing, sceneRoot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Helper to fetch event frame safely
  const ev = (name: string) => timing.events[name] ?? 0;

  // Determine current active scene
  const activeScene = useMemo(() => {
    for (const [k, s] of Object.entries(timing.scenes)) {
      if (frame >= s.startFrame && frame < s.endFrame) return k;
    }
    return "akhir";
  }, [frame, timing.scenes]);

  const scMeta = timing.scenes[activeScene] ?? timing.scenes.hook;
  const f = frame - scMeta.startFrame; // local frame within scene

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

  // ========== ANIMATE ALL BLENDER 3D 'ANIM_*' PROPS SMOOTHLY EVERY FRAME! ==========
  const reelLabL = sceneRoot?.getObjectByName("ANIM_ReelLabL");
  const reelLabR = sceneRoot?.getObjectByName("ANIM_ReelLabR");
  const reelVanL = sceneRoot?.getObjectByName("ANIM_ReelVanL");
  const reelVanR = sceneRoot?.getObjectByName("ANIM_ReelVanR");
  const vanDoor = sceneRoot?.getObjectByName("ANIM_VanDoor");
  const vanRadar = sceneRoot?.getObjectByName("ANIM_VanRadar");
  const yellowTaxi = sceneRoot?.getObjectByName("ANIM_YellowTaxi");
  const fishCart = sceneRoot?.getObjectByName("ANIM_FishCart");

  // 1. Mainframe magnetic tape reels spin continuously (local Z in Blender -> Y-up Z!)
  if (reelLabL) reelLabL.rotation.z = -t * 3.2;
  if (reelLabR) reelLabR.rotation.z = -t * 3.6;
  // 2. Surveillance van reels spin faster during tense chase!
  const vanSpeed = activeScene === "direktur" ? 7.5 : 4.2;
  if (reelVanL) reelVanL.rotation.x = t * vanSpeed;
  if (reelVanR) reelVanR.rotation.x = t * (vanSpeed * 1.15);
  // 3. Surveillance van roof radar dish rotates 360 deg (speeds up frantically when locked on fish!)
  if (vanRadar) {
    vanRadar.rotation.y = activeScene === "kacau" ? t * 4.5 : t * 1.6;
  }
  // 4. Sliding Van Door smoothly opens right at ev("van.pintu")!
  if (vanDoor) {
    const openAmt =
      activeScene === "van"
        ? smooth(frame, ev("van.pintu"), ev("van.pintu") + 22, 0, 1)
        : activeScene === "lepas" || activeScene === "kacau"
        ? 1
        : 0;
    // Original Blender y=0.40 -> Three.js z=-0.40; slide rearwards along +Z!
    vanDoor.position.z = -0.40 + openAmt * 1.55;
  }
  // 5. Classic 1960s Yellow Taxi drives fast along Washington Ave & SLAMS BRAKES (pitch dip!)
  if (yellowTaxi) {
    // Blender (801.4, -2.5, 0) -> Three.js (801.4, 0, 2.5)
    let tx = 801.4;
    let pitch = 0;
    if (activeScene === "lepas") {
      // Races in from left!
      tx = smooth(frame, scMeta.startFrame, scMeta.endFrame, 788.0, 797.5);
    } else if (activeScene === "kacau") {
      const fBrake = ev("kac.ngerem");
      const slideK = smooth(frame, scMeta.startFrame, fBrake + 12, 0, 1);
      tx = 797.5 + slideK * 3.8;
      // Dramatic forward nose-dive brake pitch + suspension rebound bounce!
      const sinceBrake = frame - (fBrake - 4);
      if (sinceBrake > 0 && sinceBrake < 35) {
        pitch = -0.14 * Math.exp(-sinceBrake * 0.11) * Math.sin(sinceBrake * 0.35);
      }
    }
    yellowTaxi.position.set(tx, 0, 2.5);
    yellowTaxi.rotation.z = pitch;
  }
  // 6. Grilled Fish Cart vibrates subtly with sizzling heat (and rocks when Agen Meong leaps onto it!)
  if (fishCart) {
    const fJump = ev("kac.gerobak");
    let rock = Math.sin(t * 5) * 0.006;
    if (activeScene === "kacau" && frame >= fJump) {
      const dt = frame - fJump;
      rock = Math.sin(dt * 0.65) * 0.075 * Math.exp(-dt * 0.08);
    }
    fishCart.rotation.z = rock;
  }

  // ========== VOICE LIP-SYNC STATES ==========
  const spDodi = useSpeakState(timing, frame, "dodi");
  const spAra = useSpeakState(timing, frame, "ara");
  const spDir = useSpeakState(timing, frame, "direktur");

  // Natural micro-animations
  const blink = (seed: number) => Math.sin(t * 2.4 + seed) > 0.965;
  const talkHop = (sp: { talking: boolean }) => (sp.talking ? Math.abs(Math.sin(t * 14)) * 0.05 : 0);
  const talkSquash = (sp: { talking: boolean }) => (sp.talking ? Math.sin(t * 14) * 0.04 : Math.sin(t * 3) * 0.012);

  // ========== CAMERA & STAGING PER SCENE ==========
  let camPos: Vec3 = [0, 1.8, 4.5];
  let camTgt: Vec3 = [0, 1.3, -1.5];
  let camFov = 42;
  let camRoll = 0;

  // Dynamic actor poses
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
  let catHeight = 0.72;
  let catOpts: CatDrawOpts = { expr: "cuek", antenna: true, vest: true };

  // Scene-specific visual staging!
  if (activeScene === "hook") {
    // L1 Lab CIA (ox = 0). Table top is at Blender (0, 1.45, 0.97) -> Three.js (0, 0.97, -1.45)
    const fCat = ev("hook.kucing");
    const zoomK = smooth(frame, fCat - 8, fCat + 8, 0, 1);
    const craneK = smooth(frame, scMeta.startFrame, fCat - 10, 0, 1);

    // Crane-Down establish -> ECU Snap-Zoom straight onto Agen Meong on the velvet cushion!
    const p1 = lerp3([1.8, 3.1, 3.2], [0.45, 1.85, 1.55], craneK);
    const t1 = lerp3([-0.4, 1.55, -2.0], [0.22, 1.35, -1.45], craneK);
    camPos = lerp3(p1, [0.26, 1.48, -0.05], zoomK);
    camTgt = lerp3(t1, [0.22, 1.40, -1.45], zoomK);
    camFov = interpolate(zoomK, [0, 1], [44, 32]);
    camRoll = Math.sin(t * 1.5) * 1.0;

    // Agen Meong sitting smugly on the red cushion, switching to iconic deadpan CUEK!
    catPos = [0.22, 1.09, -1.45];
    catHeight = 0.76;
    const isCuek = frame >= fCat + 12;
    catOpts = {
      expr: isCuek ? "cuek" : "smug",
      shades: !isCuek,
      antenna: true,
      vest: true,
    };

    // Dodi standing proudly behind/beside table
    dodiPos = [-1.45, 0 + talkHop(spDodi), -1.65];
    dodiParams = {
      ...DODI_BASE,
      expr: spDodi.talking ? "talk" : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: [62, -28],
      armL: [-15, 12],
      squash: talkSquash(spDodi),
      blink: blink(1),
    };
    dodiExtra = { shades: true, earpiece: true, fx: zoomK > 0.5 ? "sparkle" : "none" };
  } else if (activeScene === "lab") {
    // Scene 2: Dodi boasting -> Whip-Pan + Roll to Ara questioning -> Back to Dodi while cat sleeps!
    const fHah = ev("lab.hah");
    const fNyadap = ev("lab.nyadap");
    const whip1 = smooth(frame, fHah - 4, fHah + 6, 0, 1);
    const whip2 = smooth(frame, fNyadap - 10, fNyadap + 2, 0, 1);

    const pDodi: Vec3 = [-0.55, 1.50, 1.85];
    const tDodi: Vec3 = [-1.15, 1.25, -0.52];
    const pAra: Vec3 = [1.05, 1.54, 1.85];
    const tAra: Vec3 = [1.20, 1.25, -0.52];
    const pWide: Vec3 = [0.10, 1.72, 2.65];
    const tWide: Vec3 = [0.05, 1.25, -0.95];

    if (frame < fNyadap - 10) {
      camPos = lerp3(pDodi, pAra, whip1);
      camTgt = lerp3(tDodi, tAra, whip1);
      camFov = interpolate(whip1, [0, 0.5, 1], [36, 43, 36]);
      camRoll = Math.sin(whip1 * Math.PI) * 4.2;
    } else {
      camPos = lerp3(pAra, pWide, whip2);
      camTgt = lerp3(tAra, tWide, whip2);
      camFov = interpolate(whip2, [0, 1], [36, 42]);
      camRoll = -Math.sin(whip2 * Math.PI) * 3.5;
    }

    dodiPos = [-1.20, 0 + talkHop(spDodi), -0.52];
    dodiParams = {
      ...DODI_BASE,
      expr: spDodi.talking ? (frame >= fNyadap ? "smug" : "talk") : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: spDodi.talking ? [72 + Math.sin(t * 12) * 14, -32] : [45, -20],
      armL: [-18, 14],
      headTilt: Math.sin(t * 5) * 4,
      squash: talkSquash(spDodi),
      blink: blink(2),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame < fHah ? "sparkle" : "none" };

    araPos = [1.20, 0 + talkHop(spAra), -0.52];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      expr: spAra.talking ? "shock" : "think",
      mouthOpen: spAra.mouthOpen,
      armL: [-42, 25],
      armR: spAra.talking ? [68 + Math.sin(t * 14) * 16, -24] : [35, -18],
      headTilt: spAra.talking ? 7 : -4,
      squash: talkSquash(spAra),
      blink: blink(5),
    };
    araExtra = { fx: frame >= fHah && frame < fNyadap ? "question" : "none" };

    // Agen Meong completely ignores Dodi's speech and naps Zzz on the cushion!
    catPos = [0.22, 1.09, -1.45];
    catHeight = 0.74;
    catOpts = { expr: frame >= fNyadap ? "ngantuk" : "cuek", antenna: true, vest: true };
  } else if (activeScene === "xray") {
    // Scene 3: Holographic Blue X-Ray 3D Cat Cutaway orbiting smoothly! (Center at [200, 0, 0])
    const cx = 200;
    const ang = smooth(frame, scMeta.startFrame, scMeta.endFrame, -0.55, 1.35);
    const rad = interpolate(f, [0, scMeta.durationFrames], [5.1, 4.3], { extrapolateRight: "clamp" });
    camPos = [cx + Math.sin(ang) * rad, 2.05 + Math.sin(t * 1.4) * 0.14, Math.cos(ang) * rad];
    camTgt = [cx, 1.25, 0];
    camFov = 42;
    camRoll = Math.sin(t * 1.8) * 1.6;

    // Mini Dodi & Ara reacting on the edges of the hologram grid!
    dodiPos = [cx - 1.55, 0 + talkHop(spDodi), -1.35];
    dodiParams = {
      ...DODI_BASE,
      expr: spDodi.talking ? "smug" : "happy",
      mouthOpen: spDodi.mouthOpen,
      armR: [68, -22],
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, earpiece: true, fx: frame >= ev("xr.profesional") ? "sparkle" : "none" };

    araPos = [cx + 1.55, 0 + talkHop(spAra), -1.35];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      expr: spAra.talking ? "think" : "worried",
      mouthOpen: spAra.mouthOpen,
      armR: [45, -24],
      headTilt: 8,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: spAra.talking ? "question" : "sweat" };
  } else if (activeScene === "van") {
    // Scene 4: Inside 1960s CIA Surveillance Van (ox = 400)!
    // Blender Van Interior: x in [398..402], y in [-3..3] -> Three.js z in [-3..3], floor y=0.29
    const fPintu = ev("van.pintu");
    const fIkan = ev("van.ikan");
    const kTrack = smooth(frame, scMeta.startFrame, fPintu - 5, 0, 1);
    const kDoor = smooth(frame, fPintu - 5, fIkan - 8, 0, 1);
    const kWhip = smooth(frame, fIkan - 6, fIkan + 4, 0, 1);

    if (frame < fPintu - 5) {
      camPos = lerp3([401.1, 1.68, 2.15], [400.65, 1.56, 1.25], kTrack);
      camTgt = lerp3([399.1, 1.48, -0.8], [400.2, 1.38, -2.2], kTrack);
      camFov = 46;
    } else if (frame < fIkan - 6) {
      camPos = lerp3([400.65, 1.56, 1.25], [399.8, 1.45, 0.85], kDoor);
      camTgt = lerp3([400.2, 1.38, -2.2], [401.8, 1.15, -0.45], kDoor);
      camFov = 42;
    } else {
      camPos = lerp3([399.8, 1.45, 0.85], [400.1, 1.56, 1.45], kWhip);
      camTgt = lerp3([401.8, 1.15, -0.45], [400.85, 1.35, -0.55], kWhip);
      camFov = 36;
      camRoll = -Math.sin(kWhip * Math.PI) * 3.8;
    }

    dodiPos = [399.45, 0.29 + talkHop(spDodi), -0.85];
    dodiParams = {
      ...DODI_BASE,
      expr: spDodi.talking ? "talk" : "smug",
      mouthOpen: spDodi.mouthOpen,
      armR: [54, -36],
      lean: 5,
      squash: talkSquash(spDodi),
      blink: blink(3),
    };
    dodiExtra = { shades: true, earpiece: true };

    araPos = [400.85, 0.29 + talkHop(spAra), -0.55];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      expr: spAra.talking ? "worried" : "neutral",
      mouthOpen: spAra.mouthOpen,
      armR: [44, -22],
      headTilt: 6,
      squash: talkSquash(spAra),
      blink: blink(7),
    };
    araExtra = { fishBox: true, fx: frame >= fIkan ? "sweat" : "none" };

    // Agen Meong hops out of the sliding van door right at fPintu!
    const hopOut = smooth(frame, fPintu + 4, fPintu + 34, 0, 1);
    catPos = [400.9 + hopOut * 1.65, 0.32 + Math.sin(hopOut * Math.PI) * 0.45, -0.42];
    catHeight = 0.68;
    catOpts = {
      expr: frame >= fIkan ? "lapar" : "fokus",
      shades: true,
      shadesSlip: frame >= fIkan ? 0.8 : 0,
      antenna: true,
      vest: true,
      runCycle: hopOut > 0.05 && hopOut < 0.95 ? t : 0,
    };
  } else if (activeScene === "lepas") {
    // Scene 5: Washington Park & Avenue (ox = 800)! Dodi's shades SLIP DOWN IN SHOCK while Agen Meong sprints across the crosswalk!
    const fApa = ev("lep.apa");
    const fTaksi = ev("lep.taksi");
    const k1 = smooth(frame, scMeta.startFrame, fTaksi - 4, 0, 1);
    const k2 = smooth(frame, fTaksi - 4, scMeta.endFrame, 0, 1);

    if (frame < fTaksi - 4) {
      // Snap-Zoom onto Dodi & Ara clear of STOP pole -> pull back showing park, Capitol skyline & zebra crosswalk!
      camPos = lerp3([798.6, 1.72, 2.85], [799.2, 2.35, 7.6], k1);
      camTgt = lerp3([798.6, 1.38, -1.55], [798.8, 1.05, 0.8], k1);
      camFov = interpolate(k1, [0, 1], [38, 48]);
      camRoll = Math.sin(k1 * Math.PI) * 3.0;
    } else {
      // Dramatic tracking showing BOTH Yellow Taxi & Agen Meong dashing across the zebra crosswalk!
      camPos = lerp3([799.2, 2.35, 7.6], [799.4, 2.15, 8.6], k2);
      camTgt = lerp3([798.8, 1.05, 0.8], [798.2, 0.85, 2.1], k2);
      camFov = 48;
      camRoll = -2.8;
    }

    // Dodi on Washington sidewalk (100% clear of STOP pole at 797.65!) waving frantically, SHADES SLIDING DOWN NOSE!
    const slipAmt = smooth(frame, fApa, fApa + 10, 0, 1);
    dodiPos = [798.75 + Math.sin(t * 22) * 0.04, 0.16 + talkHop(spDodi), -1.55];
    dodiParams = {
      ...DODI_BASE,
      expr: "shock",
      mouthOpen: spDodi.mouthOpen || 0.85,
      armL: [-135 + Math.sin(t * 22) * 16, -20],
      armR: [135 - Math.sin(t * 22) * 16, 20],
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: slipAmt, earpiece: true, fx: "shock" };

    araPos = [796.65, 0.16 + talkHop(spAra), -1.55];
    araFacing = 1;
    araParams = {
      ...ARA_CIA,
      expr: "scared",
      mouthOpen: spAra.mouthOpen,
      armR: [115, -18],
      armL: [-110, 22],
      sweat: true,
      squash: talkSquash(spAra),
    };
    araExtra = { fishBox: true, fx: "shock" };

    // Agen Meong sprinting across zebra crosswalk right alongside the incoming Yellow Taxi!
    const runK = smooth(frame, scMeta.startFrame + 20, scMeta.endFrame, 0, 1);
    catPos = [796.4 + runK * 3.4, 0.12 + Math.abs(Math.sin(t * 14)) * 0.14, 1.95 + Math.sin(runK * Math.PI) * 0.55];
    catHeight = 0.88;
    catOpts = {
      expr: runK < 0.28 ? "lapar" : "lari",
      shades: runK < 0.35,
      shadesSlip: 1.0,
      antenna: true,
      vest: true,
      runCycle: runK > 0.15 ? t : 0,
    };
  } else if (activeScene === "kacau") {
    // Scene 6: Yellow Taxi slams brakes CIIIT! Agen Meong leaps onto Grilled Fish Cart & munches fish!
    const fGerobak = ev("kac.gerobak");
    const fRadar = ev("kac.radar");
    const k1 = smooth(frame, scMeta.startFrame, fGerobak, 0, 1);
    const k2 = smooth(frame, fGerobak, scMeta.endFrame, 0, 1);

    if (frame < fGerobak) {
      camPos = lerp3([800.6, 1.55, 6.1], [802.2, 1.85, 4.6], k1);
      camTgt = lerp3([799.8, 0.95, 2.2], [803.8, 1.45, -1.6], k1);
      camFov = 42;
      camRoll = Math.sin(k1 * Math.PI) * -4.0;
    } else {
      // Hero push-in on Agen Meong happily munching grilled fish on top of ANIM_FishCart!
      camPos = lerp3([802.2, 1.85, 4.6], [804.0, 2.05, 1.25], k2);
      camTgt = lerp3([803.8, 1.45, -1.6], [804.4, 1.68, -2.05], k2);
      camFov = interpolate(k2, [0, 1], [40, 34]);
      camRoll = Math.sin(t * 2.5) * 1.5;
    }

    // Agen Meong leaps cleanly from road onto Fish Cart counter (Three.js y=1.42, z=-2.05)
    const leapK = smooth(frame, scMeta.startFrame + 14, fGerobak + 10, 0, 1);
    const catX = interpolate(leapK, [0, 1], [801.4, 804.4]);
    const catY = interpolate(leapK, [0, 1], [0.16, 1.48]) + Math.sin(leapK * Math.PI) * 1.25;
    const catZ = interpolate(leapK, [0, 1], [1.65, -2.02]);
    catPos = [catX, catY, catZ];
    catHeight = 0.78;
    catFacing = -1;
    catOpts = {
      expr: leapK < 0.85 ? "lari" : "makan",
      fishInMouth: leapK >= 0.85,
      antenna: true,
      vest: true,
      runCycle: leapK < 0.85 ? t : 0,
    };

    // Dodi & Ara chasing from sidewalk behind
    dodiPos = [801.4 + k2 * 0.8, 0.15 + talkHop(spDodi), -1.15];
    dodiParams = {
      ...DODI_BASE,
      expr: "shock",
      mouthOpen: spDodi.mouthOpen,
      armR: [120, -20],
      armL: [-95, 22],
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 1.0, earpiece: true, fx: "shock" };

    araPos = [802.3, 0.15 + talkHop(spAra), -1.35];
    araFacing = 1;
    araParams = {
      ...ARA_CIA,
      expr: frame >= fRadar ? "smug" : "shock",
      mouthOpen: spAra.mouthOpen,
      armR: [75, -25],
      squash: talkSquash(spAra),
    };
    araExtra = { fx: frame >= fRadar ? "sparkle" : "sweat" };
  } else if (activeScene === "direktur") {
    // Scene 7: CLIMAX! Inside CIA Van (ox = 400) — VERTIGO DOLLY-ZOOM + DUTCH TILT onto FURIOUS CIA DIRECTOR!
    const fSiapa = ev("dir.siapa");
    if (frame < fSiapa) {
      // Dodi sweating bullets holding his earpiece!
      const kPre = smooth(frame, scMeta.startFrame, fSiapa, 0, 1);
      camPos = lerp3([400.4, 1.56, 1.35], [399.9, 1.52, 0.65], kPre);
      camTgt = [399.5, 1.38, -0.85];
      camFov = 38;
      camRoll = 2.0;
    } else {
      // JURUS #6 @RicksClips3000: VERTIGO DOLLY-ZOOM (camera pulls back while FOV narrows 50 -> 26 + Dutch Tilt -5.5 deg!)
      const kVert = smooth(frame, fSiapa, scMeta.endFrame - 8, 0, 1);
      const shakeX = Math.sin(t * 48) * 0.035 * (1 - kVert * 0.4);
      const shakeY = Math.cos(t * 42) * 0.025 * (1 - kVert * 0.4);
      camPos = [400.25 + shakeX, 1.58 + shakeY, interpolate(kVert, [0, 1], [0.55, 2.35])];
      camTgt = [400.35, 1.42, -1.25];
      camFov = interpolate(kVert, [0, 1], [52, 26]);
      camRoll = interpolate(kVert, [0, 1], [-1.5, -5.8]);
    }

    dodiPos = [399.45, 0.29 + talkHop(spDodi), -0.85];
    dodiParams = {
      ...DODI_BASE,
      expr: "scared",
      mouthOpen: spDodi.mouthOpen,
      armL: [-130, -35],
      armR: [120, 35],
      sweat: true,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 1.0, earpiece: true, fx: "shock" };

    // Furious CIA Director exploding in rage!
    dirPos = [400.40 + (spDir.talking ? Math.sin(t * 36) * 0.03 : 0), 0.29 + talkHop(spDir), -1.25];
    dirParams = {
      ...DIREKTUR_BASE,
      expr: "angry",
      mouthOpen: spDir.mouthOpen || 0.9,
      armL: [-135 + Math.sin(t * 26) * 14, -18],
      armR: [130 - Math.sin(t * 26) * 14, 18],
      squash: talkSquash(spDir),
    };
    dirExtra = { fx: "anger" };
  } else {
    // Scene 8: Finale in Lab CIA (ox = 0) — $20M Dollars Flying Away + Dodi Defeated + Agen Meong SMUG munching fish!
    const fMeong = ev("akh.meong");
    const kGlide = smooth(frame, scMeta.startFrame, fMeong - 4, 0, 1);
    const kEnd = smooth(frame, fMeong - 4, scMeta.endFrame, 0, 1);

    if (frame < fMeong - 4) {
      camPos = lerp3([0.35, 1.92, 2.75], [-0.15, 1.65, 1.95], kGlide);
      camTgt = lerp3([0.0, 1.32, -1.35], [0.05, 1.28, -1.35], kGlide);
      camFov = 42;
      camRoll = 0;
    } else {
      // Slow comedic push-in + slight roll onto Agen Meong happily eating fish while Dodi sighs!
      camPos = lerp3([-0.15, 1.65, 1.95], [0.18, 1.50, 0.25], kEnd);
      camTgt = lerp3([0.05, 1.28, -1.35], [0.22, 1.38, -1.45], kEnd);
      camFov = interpolate(kEnd, [0, 1], [40, 32]);
      camRoll = interpolate(kEnd, [0, 1], [0, -3.0]);
    }

    dodiPos = [-1.10, 0 + talkHop(spDodi), -1.10];
    dodiParams = {
      ...DODI_BASE,
      expr: frame >= fMeong - 25 ? "sad" : "worried",
      mouthOpen: spDodi.mouthOpen,
      armL: [-12, 8],
      armR: [12, -8],
      lean: frame >= fMeong - 25 ? 8 : 2,
      headTilt: frame >= fMeong - 25 ? 10 : 0,
      squash: talkSquash(spDodi),
    };
    dodiExtra = { shades: true, shadesSlip: 0.75, earpiece: true, fx: frame >= fMeong - 25 ? "sweat" : "none" };

    araPos = [1.20, 0 + talkHop(spAra), -1.10];
    araFacing = -1;
    araParams = {
      ...ARA_CIA,
      expr: spAra.talking ? "happy" : "smug",
      mouthOpen: spAra.mouthOpen,
      armR: [58, -22],
      headTilt: -6,
      squash: talkSquash(spAra),
    };
    araExtra = { fx: spAra.talking ? "sparkle" : "none" };

    // Agen Meong smugly munching fish on the velvet cushion!
    catPos = [0.22, 1.09, -1.45];
    catHeight = 0.78;
    catOpts = { expr: "makan", fishInMouth: true, shades: true, antenna: true, vest: true };
  }

  // Spring bounce for X-ray hologram entrance
  const xrayScale = activeScene === "xray" ? spring({ frame: f, fps, config: { damping: 12, stiffness: 110 } }) : 0;

  return (
    <>
      <CameraRig pos={camPos} target={camTgt} fov={camFov} rollDeg={camRoll} />

      {/* Warm Cinematic 3-Point + Ambient Lighting across all 3 Blender Worlds */}
      <ambientLight intensity={activeScene === "van" || activeScene === "direktur" ? 0.55 : 0.82} color="#fff5e4" />
      <hemisphereLight args={["#cfe4ff", "#7a5b3c", 0.65]} />
      <directionalLight position={[12, 18, 12]} intensity={1.35} color="#ffe7c4" />
      <directionalLight position={[812, 18, 12]} intensity={1.55} color="#ffd9a0" />
      <directionalLight position={[410, 14, 10]} intensity={1.15} color="#ffe0b5" />
      {/* Interior warm point lights inside CIA Lab & Surveillance Van */}
      <pointLight position={[0, 3.1, -1.4]} intensity={2.4} distance={14} color="#ffe6b0" />
      <pointLight position={[400, 2.6, -0.3]} intensity={2.6} distance={10} color="#ffe2a3" />
      <pointLight position={[399.2, 1.7, -0.6]} intensity={1.4} distance={6} color="#4cff9b" />
      {activeScene === "xray" && <pointLight position={[200, 3.2, 2.5]} intensity={2.5} color="#58e4ff" />}

      {/* Blender 3D V2 GLB World! */}
      {sceneRoot && <primitive object={sceneRoot} />}

      {/* Vibrant Sunset Sky Domes for Outdoor Washington Scenes */}
      <SunsetSkyDome center={[400, 0, 0]} />
      <SunsetSkyDome center={[800, 0, 0]} />

      {/* Crisp High-Res 3D Signboards inside the Blender Worlds */}
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

      {/* Scene 3: Holographic X-Ray 3D Cat Stage */}
      {activeScene === "xray" && (
        <>
          <BlueXrayStage center={[200, 0, 0]} />
          <group position={[200, 0, 0]} scale={[xrayScale, xrayScale, xrayScale]}>
            <CatXray3D position={[0, 1.25, 0]} phase={t} />
          </group>
        </>
      )}

      {/* Scene 5 & 6: Diplomat Targets on Washington Park Bench (Blender ox-1.35, y=5.35 -> Three.js 798.65, 0.35, -5.35) */}
      {(activeScene === "lepas" || activeScene === "kacau") && (
        <>
          <AgentBeanCard
            position={[798.25, 0.16, -5.35]}
            height={1.62}
            facing={1}
            params={{ ...DIPLOMAT_BASE, expr: "talk", armR: [38, -24], prop: "paper", propHand: "R", mouthOpen: 0.4 * Math.abs(Math.sin(t * 8)) }}
          />
          <AgentBeanCard
            position={[799.15, 0.16, -5.35]}
            height={1.62}
            facing={-1}
            params={{ ...DIPLOMAT_BASE, torso: "#2c3440", expr: "think", armL: [-28, 18] }}
          />
          {/* Sizzling Grilled Fish Smoke rising from Blender ANIM_FishCart! */}
          <GrilledFishSmoke position={[803.98, 1.62, -2.05]} phase={t} />
          {/* Radio Signal Waves beaming from Agen Meong's tail antenna! */}
          <SignalWaveArcs
            from={[catPos[0], catPos[1] + 0.72, catPos[2]]}
            color={activeScene === "kacau" ? "#ff772e" : "#4cff91"}
            phase={t}
          />
        </>
      )}

      {/* Scene 8: $20,000,000 Dollar Bills Flying Away in Lab CIA! */}
      {activeScene === "akhir" && <FloatingDollarRain center={[0, 0.2, -1.2]} phase={t} />}

      {/* 2D Extra-Expressive Characters! */}
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

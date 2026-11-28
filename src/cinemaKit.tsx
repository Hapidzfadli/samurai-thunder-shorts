/**
 * cinemaKit — perkakas sinematik bersama untuk video baru (cahaya berarah, kamera bervariasi, tokoh menyatu).
 * Dipakai ulang dari pola Napoleon (src/scenesNapoleon.tsx). Lihat CLAUDE.md bagian 2b.
 *
 *  - buildShots()   : paket shot otomatis (lebar → medium → close-up → sudut rendah/miring → orbit) ganti tiap 2-3 detik
 *  - LIGHT_PRESETS  : cahaya berarah per suasana (siang, senja, malam, tegang, akrab)
 *  - CineStage      : kanvas 3D dengan 1 lampu utama berarah + hemisphere gelap + lampu titik + sky + bayangan nyata
 *  - cineCard()     : props BeanCard/RabbitCard (tint, rim, bayangan nyata) dari preset cahaya
 *  - Foreground     : benda bingkai di depan kamera (jeruji/tiang/tepi) agar komposisi berlapis
 */
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Vec3 } from "./three/objects";
import { ToonSky } from "./three/toon";
import { CineLook, CinePost } from "./cinePost";

export const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
export const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerpN(a[0], b[0], k), lerpN(a[1], b[1], k), lerpN(a[2], b[2], k)];
export const ramp = (f: number, a: number, len: number) => smoother(cl((f - a) / len));
export const pulse = (f: number, at: number, len = 10) => {
  const d = f - at;
  return d < 0 || d > len ? 0 : Math.sin((d / len) * Math.PI);
};
export type Cam = { pos: Vec3; look: Vec3; fov: number; roll: number };
export type Shot = { to: number; p0: Vec3; p1?: Vec3; l0: Vec3; l1?: Vec3; fov?: number; fov1?: number; roll0?: number; roll1?: number; creep?: number; ease?: "out" };
export const shotCam = (frame: number, shots: Shot[]): Cam => {
  let start = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (frame < s.to || i === shots.length - 1) {
      const len = Math.max(1, s.to - start);
      const local = frame - start;
      const x = cl(local / len);
      const k = s.ease === "out" ? 1 - Math.pow(1 - x, 3) : smoother(x);
      const look = lerpV(s.l0, s.l1 ?? s.l0, k);
      const p = lerpV(s.p0, s.p1 ?? s.p0, k);
      const push = 1 - (s.creep ?? 0.0006) * Math.min(local, 400);
      const pos: Vec3 = [look[0] + (p[0] - look[0]) * push, look[1] + (p[1] - look[1]) * push, look[2] + (p[2] - look[2]) * push];
      const f0 = s.fov ?? 38;
      return { pos, look, fov: lerpN(f0, s.fov1 ?? f0, k), roll: lerpN(s.roll0 ?? 0, s.roll1 ?? s.roll0 ?? 0, k) };
    }
    start = s.to;
  }
  return { pos: shots[0].p0, look: shots[0].l0, fov: 38, roll: 0 };
};
/** kamera terbang di sepanjang kurva Catmull-Rom (pola fly-through sekolah) */
export const pathCam = (frame: number, t0: number, t1: number, P: Vec3[], Lk: Vec3[], fov0: number, fov1: number): Cam => {
  const k = smoother(cl((frame - t0) / Math.max(1, t1 - t0)));
  const pc = new THREE.CatmullRomCurve3(P.map((v) => new THREE.Vector3(...v)), false, "catmullrom", 0.4);
  const lc = new THREE.CatmullRomCurve3(Lk.map((v) => new THREE.Vector3(...v)), false, "catmullrom", 0.4);
  const p = pc.getPoint(k);
  const l = lc.getPoint(k);
  return { pos: [p.x, p.y, p.z], look: [l.x, l.y, l.z], fov: lerpN(fov0, fov1, k), roll: 0 };
};
export const kick = (f: number, hits: number[], amp = 0.1, len = 12): Vec3 => {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < len) {
      const a = (1 - d / len) * amp;
      x += (d % 2 ? -1 : 1) * a;
      y += (d % 3 ? 1 : -1) * a * 0.7;
    }
  }
  return [x, y, 0];
};

export const Rig: React.FC<{ cam: Cam; shake?: Vec3 }> = ({ cam, shake = [0, 0, 0] }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(cam.pos[0] + shake[0], cam.pos[1] + shake[1], cam.pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(cam.look[0] + shake[0] * 0.5, cam.look[1] + shake[1] * 0.5, cam.look[2]);
  camera.rotateZ((cam.roll * Math.PI) / 180);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};

/* ---------------------------------------------------------------- dunia GLB generik */
const glbCache: Record<string, Promise<THREE.Group>> = {};
const loadGlb = (url: string): Promise<THREE.Group> => {
  if (!glbCache[url]) {
    glbCache[url] = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        staticFile(url),
        (g) => {
          g.scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              const nm = m.name;
              m.castShadow = !(nm.includes("Plafon") || nm.includes("Water") || nm.includes("Meadow") || nm.includes("Dirt") || nm.includes("Langit") || nm.includes("Hill"));
              m.receiveShadow = !nm.includes("Langit");
              m.frustumCulled = false;
            }
          });
          resolve(g.scene);
        },
        undefined,
        reject,
      );
    });
  }
  return glbCache[url];
};

/** Muat GLB sekali, clone per komponen, tampilkan node yang lolos `visible(namaNode)`. Memanggil invalidate/advance sebelum continueRender. */
export const GlbWorld: React.FC<{ glb: string; visible: (name: string) => boolean }> = ({ glb, visible }) => {
  const invalidate = useThree((st) => st.invalidate);
  const advance = useThree((st) => st.advance);
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [h] = useState(() => delayRender("glb " + glb));
  useEffect(() => {
    loadGlb(glb).then(setScene).catch((e) => { console.error(e); continueRender(h); });
  }, [h, glb]);
  useEffect(() => {
    if (!scene) return;
    invalidate();
    const id = setTimeout(() => { invalidate(); advance(performance.now() / 1000, true); continueRender(h); }, 500);
    return () => clearTimeout(id);
  }, [scene, h, invalidate, advance]);
  const inst = useMemo(() => {
    if (!scene) return null;
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.visible = visible(o.name);
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);
  return inst ? <primitive object={inst} /> : null;
};

/* ---------------------------------------------------------------- cahaya berarah */
export type LightPreset = {
  sky: [string, string];            // atas, cakrawala
  hemi: [string, string, number];   // langit, tanah, intensitas (rendah = sisi gelap terasa)
  key: { color: string; intensity: number; dir: Vec3 }; // dir = arah DARI fokus KE lampu (tidak harus ternormalisasi)
  rim: string;                      // warna rim light tepi tokoh
  tint: string;                     // warna ambien kartu tokoh sisi terang
  shade: string;                    // sisi gelap kartu tokoh
  point: string;                    // warna lampu titik
  bg: string;
  grade: { warm: number; dark: number };
};
export const LIGHT_PRESETS: Record<"siang" | "senja" | "malam" | "tegang" | "akrab", LightPreset> = {
  siang: { sky: ["#4a86d8", "#f6f0dc"], hemi: ["#cfe2ff", "#7a6a50", 0.7], key: { color: "#fff2d8", intensity: 3.2, dir: [26, 42, 20] }, rim: "#fff6e0", tint: "#fff3e4", shade: "#b8b4c8", point: "#ffd9a0", bg: "#f6f0dc", grade: { warm: 0.1, dark: 0 } },
  senja: { sky: ["#5a4a9a", "#ffb070"], hemi: ["#9a88c8", "#6a4a38", 0.7], key: { color: "#ffa860", intensity: 3.8, dir: [-30, 26, 16] }, rim: "#ffd0a0", tint: "#ffe2c8", shade: "#8a7aa8", point: "#ffb878", bg: "#ffb070", grade: { warm: 0.45, dark: 0.04 } },
  malam: { sky: ["#070b20", "#202c5a"], hemi: ["#3a4a8a", "#120c20", 0.18], key: { color: "#7e90ff", intensity: 0.7, dir: [-20, 40, 18] }, rim: "#b4c4ff", tint: "#eef0ff", shade: "#aab4e0", point: "#ffc880", bg: "#070b20", grade: { warm: 0.25, dark: 0.0 } },
  tegang: { sky: ["#1a2440", "#5a6a8a"], hemi: ["#6a7aa8", "#1a1420", 0.28], key: { color: "#cfe0ff", intensity: 3.0, dir: [30, 34, -10] }, rim: "#bcd0ff", tint: "#dfe6ff", shade: "#5a6288", point: "#ffe0a0", bg: "#1a2440", grade: { warm: 0.0, dark: 0.04 } },
  akrab: { sky: ["#6a9ae0", "#ffe8c0"], hemi: ["#ffe6c8", "#8a6a50", 0.6], key: { color: "#ffd8a0", intensity: 2.8, dir: [-22, 30, 26] }, rim: "#ffe8c0", tint: "#fff0dc", shade: "#c0a8a0", point: "#ffc878", bg: "#ffe8c0", grade: { warm: 0.4, dark: 0 } },
};

export type CineCam = Cam;
/** sisi layar (+1 kanan / -1 kiri) tempat lampu utama berada, untuk rim light kartu tokoh */
export const lightSide = (cam: Cam, key: LightPreset["key"]): number => {
  const f = new THREE.Vector3(cam.look[0] - cam.pos[0], 0, cam.look[2] - cam.pos[2]).normalize();
  const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  return new THREE.Vector3(key.dir[0], 0, key.dir[2]).dot(right) >= 0 ? 1 : -1;
};
/** props untuk BeanCard/RabbitCard agar menyatu dengan cahaya adegan */
export const cineCard = (cam: Cam, p: LightPreset) => ({ tint: p.tint, shade: p.shade, rim: p.rim, lightSide: lightSide(cam, p.key), realShadow: true });

export type PL = { p: Vec3; i: number };
export const CineStage: React.FC<{
  cam: Cam; glb: string; visible: (n: string) => boolean; focus: Vec3; preset: keyof typeof LIGHT_PRESETS;
  shake?: Vec3; pts?: PL[]; interior?: boolean; look?: CineLook; children: React.ReactNode;
}> = ({ cam, glb, visible, focus, preset, shake = [0, 0, 0], pts = [], interior = false, look, children }) => {
  const { width, height } = useVideoConfig();
  const target = useMemo(() => new THREE.Object3D(), []);
  const P = LIGHT_PRESETS[preset];
  const k = P.key;
  return (
    <AbsoluteFill style={{ background: P.bg }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.1, far: 1500, position: cam.pos }}>
        <Rig cam={cam} shake={shake} />
        <group position={cam.pos}>
          <ToonSky top={P.sky[0]} horizon={P.sky[1]} bottom={P.sky[1]} r={900} />
        </group>
        <hemisphereLight args={[P.hemi[0], P.hemi[1], interior ? P.hemi[2] * 1.4 : P.hemi[2]]} />
        <primitive object={target} position={focus} />
        <directionalLight
          target={target}
          position={[focus[0] + k.dir[0], focus[1] + k.dir[1], focus[2] + k.dir[2]]}
          intensity={interior ? k.intensity * 0.65 : k.intensity}
          color={k.color}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={24}
          shadow-camera-bottom={-24}
          shadow-camera-near={1}
          shadow-camera-far={140}
          shadow-bias={-0.0005}
          shadow-radius={4}
        />
        {pts.map((q, i) => (
          <pointLight key={i} position={q.p} intensity={q.i} distance={16} decay={1.6} color={P.point} />
        ))}
        <GlbWorld glb={glb} visible={visible} />
        {children}
        {look && <CinePost look={look} />}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- benda bingkai di depan kamera */
export const Foreground: React.FC<{ cam: Cam; kind?: "bars" | "post" | "edge"; side?: 1 | -1; color?: string; dist?: number }> = ({ cam, kind = "bars", side = 1, color = "#1a1a22", dist = 1.1 }) => {
  const q = useMemo(() => new THREE.Quaternion(), []);
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...cam.pos), new THREE.Vector3(...cam.look), new THREE.Vector3(0, 1, 0));
  q.setFromRotationMatrix(m);
  const fwd = new THREE.Vector3(cam.look[0] - cam.pos[0], cam.look[1] - cam.pos[1], cam.look[2] - cam.pos[2]).normalize();
  const pos = new THREE.Vector3(...cam.pos).addScaledVector(fwd, dist);
  const w = Math.tan((cam.fov * Math.PI) / 360) * dist * 2 * (9 / 16); // lebar tampak pada jarak dist
  return (
    <group position={pos.toArray() as Vec3} quaternion={q}>
      {kind === "bars" &&
        [0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[side * (w / 2 - 0.04 * w - i * 0.075 * w), 0, 0]}>
            <boxGeometry args={[0.022 * w, 4, 0.04]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        ))}
      {kind === "post" && (
        <mesh position={[side * (w / 2 - 0.03 * w), 0, 0]}>
          <boxGeometry args={[0.07 * w, 4, 0.1]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}
      {kind === "edge" && (
        <mesh position={[0, -Math.tan((cam.fov * Math.PI) / 360) * dist * 0.82, 0]}>
          <boxGeometry args={[w * 3, 0.14, 0.2]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
};

/* ---------------------------------------------------------------- paket shot otomatis */
export type ShotStyle = "tenang" | "tegang" | "kacau";
/**
 * Bangun daftar Shot untuk 1 adegan: ganti sudut tiap ~2-3 detik, variasi jarak/tinggi/roll/gerak.
 * focus = titik yang disorot (mis. tokoh utama, Three.js coords), front = azimut (radian) arah kamera relatif fokus,
 * reach = jarak dasar kamera (m). Hasilnya dimasukkan ke shotCam(frame, shots).
 */
export const buildShots = (o: { dur: number; focus: Vec3; targets?: Vec3[]; front?: number; reach?: number; style?: ShotStyle; seed?: number; fovBase?: number }): Shot[] => {
  const { dur, focus: focus0, targets = [], front = -Math.PI / 2, reach = 6, style = "tenang", seed = 1, fovBase = 44 } = o;
  const rnd = (i: number) => { const x = Math.sin(i * 91.7 + seed * 13.3) * 43758.5453; return x - Math.floor(x); };
  const seg = style === "kacau" ? 54 : style === "tegang" ? 66 : 78;   // ±2-2,6 detik
  // jenis shot: [jarak x reach, tinggi (m), roll (derajat), fov, gerak push (+1 maju, -1 mundur)]
  const kinds: Array<{ d: number; h: number; roll: number; fov: number; move: number; az: number }> = [
    { d: 1.0, h: 1.9, roll: 0, fov: fovBase, move: 0.12, az: 0 },        // lebar
    { d: 0.62, h: 1.5, roll: 0, fov: fovBase - 6, move: 0.18, az: 0.35 }, // medium
    { d: 0.34, h: 1.9, roll: 0, fov: fovBase - 12, move: 0.22, az: -0.25 }, // close-up
    { d: 0.72, h: 0.5, roll: 4.5, fov: fovBase - 4, move: 0.1, az: 0.55 },  // sudut rendah + miring
    { d: 0.9, h: 3.4, roll: -3, fov: fovBase, move: -0.12, az: -0.7 },     // crane/atas
    { d: 0.5, h: 1.2, roll: -5, fov: fovBase - 8, move: 0.2, az: 0.9 },     // miring dekat
  ];
  const order = style === "kacau" ? [0, 3, 2, 5, 1, 4] : style === "tegang" ? [0, 1, 3, 2, 4, 5] : [0, 1, 2, 1, 4, 0];
  const shots: Shot[] = [];
  let t = 0;
  let i = 0;
  while (t < dur) {
    const k = kinds[order[i % order.length]];
    // medium/close-up menyorot tokoh bergantian (targets = posisi kaki tokoh); lebar/crane menyorot titik fokus adegan
    const focus: Vec3 = k.d <= 0.62 && targets.length ? targets[i % targets.length] : focus0;
    const len = i === 0 ? seg + 20 : seg + Math.round((rnd(i) - 0.5) * 20);
    const end = Math.min(dur, t + len);
    const az0 = front + k.az + (rnd(i + 7) - 0.5) * 0.25;
    const az1 = az0 + (style === "kacau" ? 0.3 : 0.14) * (i % 2 ? 1 : -1);          // orbit pelan
    const r0 = reach * k.d;
    const r1 = r0 * (1 - k.move);
    const pos = (a: number, r: number, h: number): Vec3 => [focus[0] + Math.cos(a) * r, focus[1] + h, focus[2] + Math.sin(a) * r];
    shots.push({
      to: end,
      p0: pos(az0, r0, k.h),
      p1: pos(az1, r1, k.h + (k.h > 2 ? -0.5 : 0.1)),
      l0: [focus[0], focus[1] + (k.d < 0.4 ? 1.6 : 1.2), focus[2]],
      fov: k.fov,
      fov1: k.fov - 2,
      roll0: k.roll,
      roll1: k.roll * 0.4,
      creep: 0,
    });
    t = end;
    i++;
  }
  shots[shots.length - 1].to = Math.max(shots[shots.length - 1].to, dur);
  return shots;
};

/** overlay gradasi warna + vignette per preset */
export const CineGrade: React.FC<{ preset: keyof typeof LIGHT_PRESETS }> = ({ preset }) => {
  const g = LIGHT_PRESETS[preset].grade;
  return (
    <>
      {g.warm > 0 && <AbsoluteFill style={{ mixBlendMode: "soft-light", background: `rgba(255,170,90,${0.3 * g.warm})` }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(10,6,24,0.5) 100%)" }} />
      {g.dark > 0 && <AbsoluteFill style={{ background: `rgba(6,10,36,${g.dark})` }} />}
    </>
  );
};

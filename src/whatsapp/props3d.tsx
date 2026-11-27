import React, { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makeWaCharTexture, WaCharState } from './rig2d';

// ==================== CACHED GLB LOADER ====================
const glbCache = new Map<string, Promise<THREE.Group>>();

function loadGlbCached(url: string): Promise<THREE.Group> {
  let p = glbCache.get(url);
  if (!p) {
    p = new Promise<THREE.Group>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const m = obj as THREE.Mesh;
              const n = m.name || '';
              const isDecalOrSky =
                n.includes('AO') ||
                n.includes('AoSoft') ||
                n.includes('Sky') ||
                n.includes('NightView') ||
                n.includes('SunsetView') ||
                n.includes('Glass');
              const isFlatSurface =
                n.includes('Floor') ||
                n.includes('Ground') ||
                n.includes('Plaza') ||
                n.includes('Road') ||
                n.includes('Sidewalk') ||
                n.includes('Rug') ||
                n.includes('Ceiling');
              m.castShadow = !isDecalOrSky && !isFlatSurface;
              m.receiveShadow = !isDecalOrSky;
              const mat = m.material as THREE.MeshStandardMaterial;
              if (mat && mat.isMeshStandardMaterial) {
                mat.envMapIntensity = n.includes('Glass') || n.includes('Chrome') || n.includes('Brass') || n.includes('Marble') ? 1.45 : 0.85;
              }
            }
          });
          resolve(gltf.scene);
        },
        undefined,
        reject,
      );
    });
    glbCache.set(url, p);
  }
  return p;
}

/**
 * Procedural PMREMGenerator studio/architectural environment map.
 * Gives every metallic, glass, marble, and polished wood surface crisp realistic PBR reflections!
 */
export const WaStudioEnv: React.FC<{
  mode: 'golden' | 'morning' | 'office' | 'night' | 'boardroom';
}> = ({ mode }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envScene = new THREE.Scene();

    const palettes: Record<
      typeof mode,
      { bg: string; top: string; key: string; fill: string; floor: string }
    > = {
      golden:    { bg: '#6e84ad', top: '#ffd8a8', key: '#fff0d4', fill: '#7aa4d6', floor: '#584b3e' },
      morning:   { bg: '#8bbce6', top: '#ffffff', key: '#fff7e8', fill: '#a9d2f5', floor: '#8a867e' },
      office:    { bg: '#d6dde6', top: '#ffffff', key: '#fffdf8', fill: '#c8dff5', floor: '#9c866d' },
      night:     { bg: '#10192b', top: '#3c527a', key: '#ffd99e', fill: '#3ed89b', floor: '#181c26' },
      boardroom: { bg: '#3b3340', top: '#ffe4b8', key: '#ffbe70', fill: '#6c7ea8', floor: '#281f1a' },
    };
    const pal = palettes[mode];
    envScene.background = new THREE.Color(pal.bg);

    // Lightformer panels (overhead softbox, key window, cool fill, warm bounce)
    const addPanel = (pos: [number, number, number], size: [number, number], color: string, rot: [number, number, number]) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(size[0], size[1]),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
      );
      m.position.set(...pos);
      m.rotation.set(...rot);
      envScene.add(m);
    };
    addPanel([0, 6, 0], [10, 10], pal.top, [Math.PI / 2, 0, 0]);
    addPanel([6, 2.5, 4], [7, 5], pal.key, [0, -Math.PI / 3, 0]);
    addPanel([-6, 2.5, 3], [7, 5], pal.fill, [0, Math.PI / 3, 0]);
    addPanel([0, -5, 0], [12, 12], pal.floor, [-Math.PI / 2, 0, 0]);

    const rt = pmrem.fromScene(envScene, 0.04);
    const envTex = rt.texture;

    // Apply PMREM PBR reflections selectively to shiny/metallic/glass/marble/wood meshes
    // (matte grass/concrete/carpet/walls skip heavy cubeUV octahedral sampling on CPU SwiftShader!)
    const touched: THREE.MeshStandardMaterial[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial && (mat.metalness > 0.15 || mat.roughness < 0.48)) {
          mat.envMap = envTex;
          mat.envMapIntensity = mat.metalness > 0.3 || mat.roughness < 0.22 ? 1.45 : 0.95;
          mat.needsUpdate = true;
          touched.push(mat);
        }
      }
    });

    // Static architecture & static key light -> bake shadow map ONCE per scene mount!
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;

    return () => {
      for (const m of touched) {
        m.envMap = null;
        m.needsUpdate = true;
      }
      gl.shadowMap.autoUpdate = true;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, mode]);

  return null;
};

export function useWaGlb(file: string): THREE.Group | null {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender(`Load GLB ${file}`));

  useEffect(() => {
    let alive = true;
    loadGlbCached(staticFile(file))
      .then((root) => {
        if (!alive) return;
        setScene(root);
        continueRender(handle);
      })
      .catch((err) => {
        console.error('GLB load failed:', file, err);
        continueRender(handle);
      });
    return () => {
      alive = false;
    };
  }, [file, handle]);

  return scene;
}

export const WaGlbInstance: React.FC<{
  model: THREE.Group | null;
  position?: [number, number, number];
  slidingDoorOpen?: number;
}> = ({ model, position = [0, 0, 0], slidingDoorOpen = 0 }) => {
  if (!model) return null;
  const left = model.getObjectByName('GlassDoor_Left');
  const right = model.getObjectByName('GlassDoor_Right');
  const slide = Math.max(0, Math.min(1, slidingDoorOpen)) * 1.25;
  if (left) left.position.x = -0.76 - slide;
  if (right) right.position.x = 0.76 + slide;
  return <primitive object={model} position={position} />;
};

// ==================== PROCEDURAL SKY DOME ====================
export const WaSkyDome: React.FC<{ mode: 'golden' | 'morning' | 'night' }> = ({ mode }) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    if (mode === 'golden') {
      g.addColorStop(0.0, '#1e3c72');
      g.addColorStop(0.32, '#476ba3');
      g.addColorStop(0.54, '#e58e52');
      g.addColorStop(0.68, '#f8c87a');
      g.addColorStop(1.0, '#d6b384');
    } else if (mode === 'morning') {
      g.addColorStop(0.0, '#2c6eb8');
      g.addColorStop(0.45, '#7cb7e8');
      g.addColorStop(0.68, '#d5ecfb');
      g.addColorStop(1.0, '#eaf4fb');
    } else {
      g.addColorStop(0.0, '#070c1a');
      g.addColorStop(0.55, '#121d38');
      g.addColorStop(1.0, '#1b2640');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    const img = ctx.getImageData(0, 0, 64, 256);
    const t = new THREE.DataTexture(img.data, 64, 256, THREE.RGBAFormat);
    t.flipY = true;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [mode]);

  return (
    <mesh scale={[95, 95, 95]}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
};

// ==================== ARTICULATED 2D CHARACTER SPRITE (Y-BILLBOARDED FOR ORBITING CAMERAS) ====================
export const WaCharSprite: React.FC<{
  state: WaCharState;
  position: [number, number, number];
  height?: number;
  camPos?: [number, number, number];
  rotY?: number;
}> = ({ state, position, height = 1.72, camPos, rotY }) => {
  const tex = useMemo(() => makeWaCharTexture(state), [
    state.id,
    state.expr,
    state.arm,
    Math.round(state.talk * 20),
    Math.round(state.timeSec * 30),
    Math.round((state.walkAmount ?? 0) * 20),
    Math.round((state.walkPhase ?? 0) * 15),
    state.facing,
    Math.round((state.gazeX ?? 0) * 10),
    Math.round((state.gazeY ?? 0) * 10),
    Math.round((state.lean ?? 0) * 20),
    Math.round((state.headTilt ?? 0) * 20),
  ]);

  useEffect(() => {
    return () => {
      tex.dispose();
    };
  }, [tex]);

  const width = height * (560 / 840);
  // Subtle Y-billboard facing toward camera so orbiting cameras never see paper-thin cutout edge!
  const yaw = useMemo(() => {
    if (rotY !== undefined) return rotY;
    if (!camPos) return 0;
    const dx = camPos[0] - position[0];
    const dz = camPos[2] - position[2];
    return Math.atan2(dx, dz) * 0.72;
  }, [camPos?.[0], camPos?.[2], position[0], position[2], rotY]);

  // Offset Y so feet at canvas y=800/840 sit flush on floor position[1]
  const centerY = position[1] + height * 0.452;

  return (
    <mesh position={[position[0], centerY, position[2]]} rotation={[0, yaw, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ==================== CRISP DYNAMIC CANVAS WALL SIGNS & MONITORS ====================
function makeCanvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.DataTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const img = c.getContext('2d')!.getImageData(0, 0, w, h);
  const t = new THREE.DataTexture(img.data, w, h, THREE.RGBAFormat);
  t.flipY = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export const WelfareSignPlane: React.FC = () => {
  const tex = useMemo(
    () =>
      makeCanvasTex(1024, 160, (ctx) => {
        ctx.fillStyle = '#182b44';
        ctx.fillRect(0, 0, 1024, 160);
        ctx.strokeStyle = '#6ba3d6';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, 1008, 144);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SOCIAL SERVICES CENTER', 512, 74);
        ctx.fillStyle = '#9fd0ff';
        ctx.font = '600 32px sans-serif';
        ctx.fillText('MOUNTAIN VIEW · CALIFORNIA', 512, 126);
      }),
    [],
  );
  return (
    <mesh position={[0, 4.78, 4.38]}>
      <planeGeometry args={[6.1, 0.80]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
};

export const QueueLedPlane: React.FC<{ ticket?: string }> = ({ ticket = 'A-047' }) => {
  const tex = useMemo(
    () =>
      makeCanvasTex(512, 160, (ctx) => {
        ctx.fillStyle = '#111419';
        ctx.fillRect(0, 0, 512, 160);
        ctx.fillStyle = '#8b99ad';
        ctx.font = '700 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NOW SERVING', 256, 48);
        ctx.fillStyle = '#ff3b30';
        ctx.font = '900 76px monospace';
        ctx.fillText(ticket, 256, 132);
      }),
    [ticket],
  );
  return (
    <mesh position={[0, 3.15, -5.20]}>
      <planeGeometry args={[1.76, 0.46]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
};

export const OfficeDisplayPlane: React.FC<{
  mode: 'interview' | 'growth';
  growthProgress?: number;
}> = ({ mode, growthProgress = 1 }) => {
  const gp = Math.round(Math.max(0, Math.min(1, growthProgress)) * 40) / 40;
  const tex = useMemo(
    () =>
      makeCanvasTex(960, 540, (ctx) => {
        ctx.fillStyle = '#0d1522';
        ctx.fillRect(0, 0, 960, 540);
        if (mode === 'interview') {
          // Modern Silicon Valley Tech HQ HR Panel
          const g = ctx.createLinearGradient(0, 0, 960, 540);
          g.addColorStop(0, '#10213d');
          g.addColorStop(1, '#183661');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 960, 540);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(48, 48, 864, 444);
          ctx.fillStyle = '#60a5fa';
          ctx.font = '700 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SILICON VALLEY TECH HQ · 2009', 480, 130);
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 58px sans-serif';
          ctx.fillText('INTERVIEW ROOM B', 480, 220);
          // Status pill
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.roundRect(240, 290, 480, 92, 46);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '800 40px sans-serif';
          ctx.fillText('STATUS: NOT SELECTED', 480, 350);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '600 26px sans-serif';
          ctx.fillText('Facebook & Twitter Recruitment Review', 480, 440);
        } else {
          // Animated Skyrocketing WhatsApp Growth Dashboard!
          const g = ctx.createLinearGradient(0, 0, 960, 540);
          g.addColorStop(0, '#091a16');
          g.addColorStop(1, '#0d2b22');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 960, 540);
          // Subtle grid
          ctx.strokeStyle = 'rgba(37, 211, 102, 0.14)';
          ctx.lineWidth = 2;
          for (let y = 130; y <= 450; y += 80) {
            ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(880, y); ctx.stroke();
          }
          ctx.fillStyle = '#25d366';
          ctx.font = '800 30px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('WHATSAPP · 0% ADS', 64, 72);

          const bars = [
            { lbl: '2011', val: '10 JT', h: 70, x: 140 },
            { lbl: '2012', val: '100 JT', h: 155, x: 340 },
            { lbl: '2013', val: '200 JT', h: 230, x: 540 },
            { lbl: '2014', val: '450 JT!', h: 325, x: 740 },
          ];
          bars.forEach((b, idx) => {
            const localP = Math.max(0, Math.min(1, gp * 4 - idx * 0.65));
            const bh = b.h * localP;
            const by = 450 - bh;
            ctx.fillStyle = idx === 3 ? '#25d366' : '#1ea855';
            ctx.beginPath();
            ctx.roundRect(b.x - 52, by, 104, bh, [14, 14, 0, 0]);
            ctx.fill();
            if (localP > 0.3) {
              ctx.fillStyle = '#ffffff';
              ctx.font = '900 30px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(b.val, b.x, by - 14);
            }
            ctx.fillStyle = '#94a3b8';
            ctx.font = '700 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.lbl, b.x, 492);
          });

          // Badge top-right: only 55 employees!
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.beginPath();
          ctx.roundRect(570, 32, 330, 56, 14);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.font = '800 25px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('HANYA 55 KARYAWAN', 735, 69);
        }
      }),
    [mode, gp],
  );
  useEffect(() => () => tex.dispose(), [tex]);

  return (
    <mesh position={[28.0, 2.25, -3.42]}>
      <planeGeometry args={[2.94, 1.60]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
};

export const BoardroomOfferPlane: React.FC<{ reveal?: number }> = ({ reveal = 1 }) => {
  const rv = Math.round(Math.max(0, Math.min(1, reveal)) * 20) / 20;
  const tex = useMemo(
    () =>
      makeCanvasTex(820, 420, (ctx) => {
        ctx.fillStyle = 'rgba(12, 18, 30, 0.92)';
        ctx.fillRect(0, 0, 820, 420);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 800, 400);
        ctx.fillStyle = '#93c5fd';
        ctx.font = '700 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FACEBOOK  ×  WHATSAPP', 410, 84);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 26px sans-serif';
        ctx.fillText('OFFICIAL ACQUISITION OFFER · FEB 2014', 410, 134);
        ctx.fillStyle = rv > 0.2 ? '#4ade80' : '#64748b';
        ctx.font = '900 84px sans-serif';
        ctx.fillText(rv > 0.2 ? '$19,000,000,000' : 'CONFIDENTIAL', 410, 256);
        ctx.fillStyle = '#fde047';
        ctx.font = '800 34px sans-serif';
        ctx.fillText(rv > 0.2 ? '≈ Rp 280 TRILIUN' : 'PROPOSAL REVIEW', 410, 336);
      }),
    [rv],
  );
  useEffect(() => () => tex.dispose(), [tex]);

  return (
    <group position={[56.0, 2.38, -3.40]}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[2.76, 1.46, 0.06]} />
        <meshStandardMaterial color="#181c22" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh>
        <planeGeometry args={[2.64, 1.34]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
};

// ==================== SEPARATE HAND-TRANSFERRABLE 3D PROPS ====================
export const Smartphone3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh>
      <boxGeometry args={[0.11, 0.21, 0.022]} />
      <meshStandardMaterial color="#1e2228" metalness={0.6} roughness={0.25} />
    </mesh>
    <mesh position={[0, 0.005, 0.013]}>
      <planeGeometry args={[0.094, 0.165]} />
      <meshBasicMaterial color="#25d366" />
    </mesh>
    {/* Mini chat bubble lines on phone screen */}
    <mesh position={[-0.01, 0.04, 0.015]}>
      <planeGeometry args={[0.055, 0.022]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
    <mesh position={[0.012, -0.005, 0.015]}>
      <planeGeometry args={[0.055, 0.022]} />
      <meshBasicMaterial color="#dcf8c6" />
    </mesh>
  </group>
);

export const PaperFolder3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], color = '#1e3a5f', scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh>
      <boxGeometry args={[0.34, 0.035, 0.44]} />
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
    <mesh position={[0.01, 0.019, 0]}>
      <boxGeometry args={[0.30, 0.012, 0.40]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.7} />
    </mesh>
    {/* Gold emblem bar */}
    <mesh position={[0, 0.026, -0.08]}>
      <boxGeometry args={[0.18, 0.006, 0.035]} />
      <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
    </mesh>
  </group>
);

export const CoffeeCup3D: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh>
      <cylinderGeometry args={[0.058, 0.044, 0.15, 14]} />
      <meshStandardMaterial color="#f5f5f4" roughness={0.4} />
    </mesh>
    {/* Kraft sleeve */}
    <mesh position={[0, -0.005, 0]}>
      <cylinderGeometry args={[0.056, 0.049, 0.068, 14]} />
      <meshStandardMaterial color="#b07d4f" roughness={0.75} />
    </mesh>
    {/* Lid */}
    <mesh position={[0, 0.082, 0]}>
      <cylinderGeometry args={[0.062, 0.060, 0.022, 14]} />
      <meshStandardMaterial color="#27272a" roughness={0.4} />
    </mesh>
  </group>
);

export const StickyNote3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh>
      <boxGeometry args={[0.20, 0.20, 0.008]} />
      <meshStandardMaterial color="#fde047" roughness={0.65} />
    </mesh>
    <mesh position={[0, 0.03, 0.006]}>
      <planeGeometry args={[0.15, 0.022]} />
      <meshBasicMaterial color="#1f2937" />
    </mesh>
    <mesh position={[0, -0.02, 0.006]}>
      <planeGeometry args={[0.14, 0.022]} />
      <meshBasicMaterial color="#dc2626" />
    </mesh>
  </group>
);

export const GroceryBag3D: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh>
      <boxGeometry args={[0.26, 0.30, 0.15]} />
      <meshStandardMaterial color="#d8c8ae" roughness={0.85} />
    </mesh>
    {/* Fresh green veggie peeking out */}
    <mesh position={[0.06, 0.19, 0]} rotation={[0, 0, -0.22]}>
      <cylinderGeometry args={[0.035, 0.028, 0.14, 10]} />
      <meshStandardMaterial color="#4d9a3e" roughness={0.7} />
    </mesh>
    <mesh position={[-0.05, 0.17, 0.01]}>
      <sphereGeometry args={[0.048, 10, 10]} />
      <meshStandardMaterial color="#e07a38" roughness={0.65} />
    </mesh>
  </group>
);

export const Pen3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, -0.6] }) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <cylinderGeometry args={[0.011, 0.011, 0.22, 10]} />
      <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.25} />
    </mesh>
    <mesh position={[0, -0.12, 0]}>
      <coneGeometry args={[0.011, 0.035, 10]} />
      <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
    </mesh>
  </group>
);

export const CouponEnvelope3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <boxGeometry args={[0.26, 0.018, 0.16]} />
      <meshStandardMaterial color="#f5e6c4" roughness={0.75} />
    </mesh>
    <mesh position={[0, 0.011, 0]}>
      <boxGeometry args={[0.16, 0.004, 0.04]} />
      <meshStandardMaterial color="#2563eb" roughness={0.6} />
    </mesh>
  </group>
);

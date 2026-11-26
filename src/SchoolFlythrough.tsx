import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";

export const TOTAL_FRAMES_SCHOOL = 180;

// ---------------------------------------------------------------------------
// Cached GLB loader (parses once across Remotion frames)
// ---------------------------------------------------------------------------
let cachedGltfPromise: Promise<THREE.Group> | null = null;

function loadSchoolGlb(): Promise<THREE.Group> {
  if (!cachedGltfPromise) {
    const loader = new GLTFLoader();
    cachedGltfPromise = new Promise((resolve, reject) => {
      loader.load(
        staticFile("models/school.glb"),
        (gltf) => {
          gltf.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              const isNoCast =
                mesh.name.includes("Floor") ||
                mesh.name.includes("Ground") ||
                mesh.name.includes("Ceiling") ||
                mesh.name.includes("Walkway") ||
                mesh.name.includes("Lawn");
              mesh.castShadow = !isNoCast;
              mesh.receiveShadow = true;
            }
          });
          resolve(gltf.scene);
        },
        undefined,
        reject
      );
    });
  }
  return cachedGltfPromise;
}

// ---------------------------------------------------------------------------
// Sunset Sky Dome (matches the warm dusk/dawn sky in @Dasiman3d frame 1)
// ---------------------------------------------------------------------------
const SunsetSky: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color("#5c6b9c") },
          uMid: { value: new THREE.Color("#b48996") },
          uHorizon: { value: new THREE.Color("#f5bf93") },
          uBottom: { value: new THREE.Color("#3b3f54") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uMid;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          varying vec3 vWorldPos;
          void main() {
            float h = normalize(vWorldPos).y;
            vec3 col = uHorizon;
            if (h > 0.0) {
              vec3 lowMix = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));
              col = mix(lowMix, uTop, smoothstep(0.22, 0.72, h));
            } else {
              col = mix(uHorizon, uBottom, smoothstep(0.0, -0.25, h));
            }
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    []
  );
  return (
    <mesh material={mat} scale={[180, 180, 180]}>
      <sphereGeometry args={[1, 24, 16]} />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// 2D Canvas Sprite Textures (Einstein + Laughing Students + Chalkboard Math)
// ---------------------------------------------------------------------------
function makeEinsteinTexture(frame: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 768);

  const cx = 256;
  const ink = "#121216";

  // Legs
  ctx.fillStyle = "#484c56";
  ctx.strokeStyle = ink;
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(cx - 46, 560, 32, 145, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(cx + 14, 560, 32, 145, 10);
  ctx.fill();
  ctx.stroke();

  // Shoes
  ctx.fillStyle = "#1d1f26";
  ctx.beginPath();
  ctx.ellipse(cx - 38, 712, 34, 16, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 38, 712, 34, 16, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Suit Torso
  ctx.fillStyle = "#525763";
  ctx.beginPath();
  ctx.moveTo(cx - 64, 385);
  ctx.lineTo(cx + 64, 385);
  ctx.lineTo(cx + 80, 578);
  ctx.quadraticCurveTo(cx, 594, cx - 80, 578);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shirt V & Tie
  ctx.fillStyle = "#2b2e38";
  ctx.beginPath();
  ctx.moveTo(cx - 28, 385);
  ctx.lineTo(cx + 28, 385);
  ctx.lineTo(cx, 468);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pocket handkerchief
  ctx.fillStyle = "#eef0f5";
  ctx.beginPath();
  ctx.moveTo(cx + 24, 465);
  ctx.lineTo(cx + 38, 444);
  ctx.lineTo(cx + 48, 465);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left arm hanging
  ctx.fillStyle = "#525763";
  ctx.beginPath();
  ctx.roundRect(cx - 88, 398, 28, 138, 14);
  ctx.fill();
  ctx.stroke();

  // Right arm pointing at chalkboard with chalk!
  const wave = Math.sin(frame * 0.14) * 0.08;
  ctx.save();
  ctx.translate(cx + 60, 412);
  ctx.rotate(-0.35 + wave);
  ctx.fillStyle = "#525763";
  ctx.beginPath();
  ctx.roundRect(0, -14, 125, 28, 14);
  ctx.fill();
  ctx.stroke();
  // Hand
  ctx.fillStyle = "#f2ddc6";
  ctx.beginPath();
  ctx.arc(130, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // White chalk
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(138, -5, 30, 10);
  ctx.strokeRect(138, -5, 30, 10);
  ctx.restore();

  // Spiky Wild Einstein Hair (behind head)
  ctx.fillStyle = "#e6e6eb";
  ctx.beginPath();
  const hy = 258;
  const spikes = 13;
  for (let i = 0; i < spikes; i++) {
    const a = -Math.PI * 1.08 + (i / (spikes - 1)) * Math.PI * 1.16;
    const rx = cx + Math.cos(a) * 142;
    const ry = hy + Math.sin(a) * 142;
    const bx1 = cx + Math.cos(a - 0.15) * 96;
    const by1 = hy + Math.sin(a - 0.15) * 96;
    const bx2 = cx + Math.cos(a + 0.15) * 96;
    const by2 = hy + Math.sin(a + 0.15) * 96;
    if (i === 0) ctx.moveTo(bx1, by1);
    ctx.lineTo(rx, ry);
    ctx.lineTo(bx2, by2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Round Cartoon Head
  ctx.fillStyle = "#f4e1cc";
  ctx.beginPath();
  ctx.arc(cx, hy, 102, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wavy forehead hair tuft
  ctx.fillStyle = "#e6e6eb";
  ctx.beginPath();
  ctx.arc(cx, hy - 22, 92, Math.PI * 1.15, Math.PI * 1.85);
  ctx.quadraticCurveTo(cx + 35, hy - 64, cx, hy - 74);
  ctx.quadraticCurveTo(cx - 35, hy - 64, cx - 78, hy - 64);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eyebrows
  ctx.fillStyle = "#d9d9e0";
  ctx.beginPath();
  ctx.roundRect(cx - 64, hy - 34, 44, 16, 8);
  ctx.roundRect(cx + 20, hy - 34, 44, 16, 8);
  ctx.fill();
  ctx.stroke();

  // Eyes
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(cx - 38, hy + 6, 10, 0, Math.PI * 2);
  ctx.arc(cx + 38, hy + 6, 10, 0, Math.PI * 2);
  ctx.fill();

  // Bushy Mustache
  ctx.fillStyle = "#e6e6eb";
  ctx.beginPath();
  ctx.ellipse(cx, hy + 46, 46, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle Mouth under mustache
  ctx.beginPath();
  ctx.moveTo(cx - 18, hy + 72);
  ctx.lineTo(cx + 18, hy + 72);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeStudentTexture(shirtColor: string, hairColor: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 460;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 384, 460);

  const cx = 192;
  const ink = "#121216";
  ctx.strokeStyle = ink;
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";

  // Torso
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(cx - 66, 265, 132, 175, 28);
  ctx.fill();
  ctx.stroke();

  // Tie
  ctx.fillStyle = "#b82828";
  ctx.beginPath();
  ctx.moveTo(cx - 14, 272);
  ctx.lineTo(cx + 14, 272);
  ctx.lineTo(cx + 10, 355);
  ctx.lineTo(cx, 375);
  ctx.lineTo(cx - 10, 355);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = "#f9e3c6";
  ctx.beginPath();
  ctx.arc(cx, 175, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair cap
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(cx, 165, 94, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(cx, 128, cx - 94, 165);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Laughing arched eyes (^ ^)
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(cx - 34, 172, 16, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 34, 172, 16, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Big laughing open mouth
  ctx.fillStyle = "#5c141c";
  ctx.beginPath();
  ctx.arc(cx, 204, 28, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeChalkMathTexture(circleProgress: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 1024, 512);

  // Chalky multiplication table (9 x 1 .. 9 x 10 = 91)
  ctx.font = "900 38px Inter, Arial, sans-serif";
  ctx.fillStyle = "rgba(244, 244, 236, 0.92)";
  ctx.textBaseline = "middle";

  const lines = [
    "9 × 1 = 9",
    "9 × 2 = 18",
    "9 × 3 = 27",
    "9 × 4 = 36",
    "9 × 5 = 45",
    "9 × 6 = 54",
    "9 × 7 = 63",
    "9 × 8 = 72",
    "9 × 9 = 81",
    "9 × 10 = 91",
  ];
  const startX = 485;
  const startY = 66;
  const stepY = 42;
  lines.forEach((line, idx) => {
    ctx.fillText(line, startX, startY + idx * stepY);
  });

  // Animated Red Chalk Circle around "91"
  if (circleProgress > 0.01) {
    ctx.save();
    ctx.strokeStyle = "#e03830";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(
      startX + 195,
      startY + 9 * stepY,
      54,
      28,
      -0.08,
      -Math.PI * 0.85,
      -Math.PI * 0.85 + Math.PI * 2.05 * Math.min(1, circleProgress)
    );
    ctx.stroke();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// 3D Classroom Dust Motes (strictly inside sunbeam zone near chalkboard)
// ---------------------------------------------------------------------------
const DustMotes: React.FC<{ frame: number }> = ({ frame }) => {
  const motes = useMemo(() => {
    const arr: { x: number; y: number; z: number; s: number; ph: number }[] = [];
    for (let i = 0; i < 36; i++) {
      const seed = (i * 9301 + 49297) % 233280;
      const r1 = seed / 233280;
      const r2 = ((seed * 7 + 13) % 233280) / 233280;
      const r3 = ((seed * 17 + 29) % 233280) / 233280;
      arr.push({
        x: 4.1 + r1 * 4.4,
        y: 4.8 + r2 * 2.8,
        z: -4.65 + r3 * 1.4,
        s: 0.012 + (i % 3) * 0.004,
        ph: i * 0.9,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {motes.map((m, i) => (
        <mesh
          key={i}
          position={[
            m.x + Math.sin(frame * 0.03 + m.ph) * 0.07,
            m.y + Math.cos(frame * 0.025 + m.ph) * 0.05,
            m.z,
          ]}
        >
          <boxGeometry args={[m.s, m.s, m.s]} />
          <meshBasicMaterial color="#fff6d6" transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Smooth Camera Fly-Through Controller (Outside School -> Through Window -> Inside Classroom)
// ---------------------------------------------------------------------------
const FlythroughCamera: React.FC<{ frame: number }> = ({ frame }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const { posCurve, lookCurve } = useMemo(() => {
    // Three.js coords: X = Blender.X, Y = Blender.Z, Z = -Blender.Y
    // Hero open window: (6.2, 6.35, 3.8), Chalkboard center: (6.2, 6.62, -4.95)
    const pCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-16.5, 17.5, 29.0), // 0.00: Wide aerial shot of whole school + clock tower + courtyard + trees!
        new THREE.Vector3(-4.5, 13.0, 20.5),  // 0.20: Sweeping across front courtyard
        new THREE.Vector3(4.8, 8.0, 11.2),    // 0.40: Diving toward 2nd-floor open hero window
        new THREE.Vector3(6.2, 6.45, 5.2),    // 0.54: Directly outside open window
        new THREE.Vector3(6.2, 6.25, 2.3),    // 0.65: Flying cleanly INSIDE classroom!
        new THREE.Vector3(6.15, 6.10, 0.4),   // 0.80: Gliding smoothly down center aisle past desks
        new THREE.Vector3(6.05, 5.98, -0.35), // 1.00: Full-body Einstein + sunlit wooden floor + chalkboard!
      ],
      false,
      "catmullrom",
      0.4
    );

    const lCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.5, 5.8, -1.0),    // Looking at full school + courtyard + clock tower
        new THREE.Vector3(2.8, 6.5, 1.5),     // Shifting gaze toward East wing
        new THREE.Vector3(6.2, 6.35, 3.2),    // Locking onto open hero window
        new THREE.Vector3(6.2, 6.20, -2.0),   // Looking inside classroom
        new THREE.Vector3(6.2, 6.05, -4.5),   // Focusing on front of classroom
        new THREE.Vector3(6.10, 5.95, -4.95), // Framing Einstein + floor + chalkboard
        new THREE.Vector3(6.08, 5.95, -4.95), // Steady hero lock
      ],
      false,
      "catmullrom",
      0.4
    );
    return { posCurve: pCurve, lookCurve: lCurve };
  }, []);

  // Ease-in-out timing curve across frames 0..162, hold gently 162..180
  const rawT = Math.min(1, Math.max(0, frame / 162));
  const easedT =
    rawT < 0.5
      ? 2 * rawT * rawT
      : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

  const pos = posCurve.getPoint(easedT);
  const look = lookCurve.getPoint(easedT);

  // Cinematic vertical portrait FOV
  const fov = interpolate(easedT, [0, 0.55, 1], [48, 50, 52]);

  camera.position.copy(pos);
  camera.lookAt(look);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

// ---------------------------------------------------------------------------
// 3D Scene Content (Blender GLB + 2D Cutout Characters + Chalkboard Text)
// ---------------------------------------------------------------------------
const SchoolSceneContent: React.FC<{ frame: number; schoolModel: THREE.Group }> = ({
  frame,
  schoolModel,
}) => {
  // Quantize Einstein arm wave to 15fps steps (saves half the CanvasTexture uploads on CPU swangle)
  const einsteinStep = Math.floor(frame / 2) * 2;
  const einsteinTex = useMemo(() => makeEinsteinTexture(einsteinStep), [einsteinStep]);
  const student1Tex = useMemo(() => makeStudentTexture("#233252", "#1a181c"), []);
  const student2Tex = useMemo(() => makeStudentTexture("#d6d0c4", "#5c3b22"), []);
  const student3Tex = useMemo(() => makeStudentTexture("#4e6b48", "#3a2415"), []);

  // Only redraw chalk canvas when red circle is actively animating (frames 135..168)
  const circleStep = Math.round(
    interpolate(frame, [135, 168], [0, 24], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const chalkTex = useMemo(() => makeChalkMathTexture(circleStep / 24), [circleStep]);

  // Dispose dynamic canvas textures cleanly
  useEffect(() => {
    return () => {
      einsteinTex.dispose();
    };
  }, [einsteinTex]);
  useEffect(() => {
    return () => {
      chalkTex.dispose();
    };
  }, [chalkTex]);

  const einsteinBob = Math.sin(frame * 0.12) * 0.025;
  const laughBob = Math.abs(Math.sin(frame * 0.28)) * 0.04;

  return (
    <>
      <SunsetSky />

      {/* Global Warm Sunset Ambient + Hemisphere Fill */}
      <hemisphereLight args={["#ffdfba", "#4c546e", 0.95]} />
      <ambientLight intensity={0.35} color="#fff1dc" />

      {/* Warm Golden Sun streaming from Southeast (1024 shadow map = crisp & 3x faster in swangle) */}
      <directionalLight
        position={[24, 19, 16]}
        intensity={2.2}
        color="#ffd79e"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={2}
        shadow-camera-far={75}
        shadow-bias={-0.0005}
      />

      {/* Warm Interior Classroom Fill Lights */}
      <pointLight position={[6.2, 7.6, -2.0]} intensity={12} distance={14} decay={1.6} color="#ffe3b5" />
      <pointLight position={[8.8, 6.6, -3.5]} intensity={8} distance={10} decay={1.8} color="#ffd08a" />

      {/* The Headless-Blender-Built 3D School + Interior Classroom! */}
      <primitive object={schoolModel} />

      {/* Dynamic Chalkboard Math Overlay (placed 1cm in front of Chalkboard_Surface at Z = -4.94) */}
      <mesh position={[6.2, 6.62, -4.935]}>
        <planeGeometry args={[5.2, 2.0]} />
        <meshBasicMaterial map={chalkTex} transparent depthWrite={false} />
      </mesh>

      {/* 2D Cartoon Einstein Standing in 3D Classroom (just like maxresdefault.jpg!) */}
      <mesh position={[5.30, 5.42 + einsteinBob, -4.25]}>
        <planeGeometry args={[1.22, 1.84]} />
        <meshBasicMaterial map={einsteinTex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* 2D Cartoon Students Seated Behind 3D Wooden Desks (flanking left & right of aisle!) */}
      <mesh position={[3.8, 5.46 + laughBob, -0.75]}>
        <planeGeometry args={[0.92, 1.1]} />
        <meshBasicMaterial map={student2Tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[8.6, 5.46 + laughBob * 1.1, -0.75]}>
        <planeGeometry args={[0.92, 1.1]} />
        <meshBasicMaterial map={student3Tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* Back row students */}
      <mesh position={[3.8, 5.46 + laughBob * 0.9, 1.25]}>
        <planeGeometry args={[0.92, 1.1]} />
        <meshBasicMaterial map={student1Tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[8.6, 5.46 + laughBob * 0.7, 1.25]}>
        <planeGeometry args={[0.92, 1.1]} />
        <meshBasicMaterial map={student2Tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating Sunbeam Dust Motes */}
      <DustMotes frame={frame} />

      <FlythroughCamera frame={frame} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Main Remotion Composition (1080x1920 Vertical Shorts)
// ---------------------------------------------------------------------------
export const SchoolFlythrough: React.FC = () => {
  const frame = useCurrentFrame();
  const [schoolModel, setSchoolModel] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender("Loading school.glb from Blender"));

  useEffect(() => {
    let cancelled = false;
    loadSchoolGlb()
      .then((group) => {
        if (!cancelled) {
          setSchoolModel(group);
          continueRender(handle);
        }
      })
      .catch((err) => {
        console.error("Failed to load school.glb", err);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  // Red "1 SALAH" badge + subtitle pop-in near the chalkboard shot
  const badgeScale = interpolate(frame, [145, 155], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#23263a" }}>
      {schoolModel && (
        <ThreeCanvas
          width={1080}
          height={1920}
          shadows
          camera={{ fov: 48, near: 0.1, far: 400, position: [-16.5, 17.5, 29.0] }}
        >
          <SchoolSceneContent frame={frame} schoolModel={schoolModel} />
        </ThreeCanvas>
      )}

      {/* Remotion 2D UI Overlay (neatly above chalkboard math, matching @Dasiman3d!) */}
      {badgeScale > 0.01 && (
        <div
          style={{
            position: "absolute",
            top: 230,
            left: "50%",
            transform: `translateX(-50%) scale(${badgeScale})`,
            background: "linear-gradient(180deg, #df3630 0%, #9b1b17 100%)",
            border: "5px solid #590d0b",
            borderRadius: 18,
            padding: "12px 46px",
            color: "#ffffff",
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            fontSize: 50,
            letterSpacing: 2,
            boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
          }}
        >
          1 SALAH
        </div>
      )}

      {frame >= 150 && (
        <div
          style={{
            position: "absolute",
            bottom: 510,
            width: "100%",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            fontSize: 78,
            color: "#ffffff",
            WebkitTextStroke: "14px #101014",
            paintOrder: "stroke fill",
          }}
        >
          SALAH,
        </div>
      )}
    </AbsoluteFill>
  );
};

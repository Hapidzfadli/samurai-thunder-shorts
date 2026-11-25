import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";

export type Vec3 = [number, number, number];
export type Cam = { pos: Vec3; look: Vec3; fov: number };

const CameraRig: React.FC<{ cam: Cam; shake?: Vec3 }> = ({ cam, shake = [0, 0, 0] }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(cam.pos[0] + shake[0], cam.pos[1] + shake[1], cam.pos[2] + shake[2]);
  camera.lookAt(cam.look[0] + shake[0] * 0.4, cam.look[1] + shake[1] * 0.4, cam.look[2] + shake[2] * 0.4);
  if (Math.abs(camera.fov - cam.fov) > 0.01) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

export interface PostFXProps {
  dofTarget?: Vec3;
  dofRange?: number;
  bokehScale?: number;
  bloomIntensity?: number;
  aoIntensity?: number;
}

export const CinematicPostFX: React.FC<PostFXProps> = ({
  dofTarget = [0, 1.3, 0],
  dofRange = 8.0,
  bokehScale = 2.0,
  bloomIntensity = 0.55,
}) => {
  const { gl, scene, camera, size } = useThree();

  const passes = useMemo(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;

    const composer = new EffectComposer(gl);
    composer.setSize(size.width, size.height);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bokehPass = new BokehPass(scene, camera, {
      focus: 3.0,
      aperture: 0.0005,
      maxblur: 0.012,
    });
    composer.addPass(bokehPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(size.width * 0.5), Math.floor(size.height * 0.5)),
      bloomIntensity,
      0.38,
      0.94
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    return { composer, bokehPass, bloomPass };
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    return () => {
      passes.composer.dispose();
    };
  }, [passes]);

  // Update dynamic DOF focus & Bloom per frame (enable BokehPass on close-ups & Bullet-Cam)
  const distToTarget = Math.hypot(
    camera.position.x - dofTarget[0],
    camera.position.y - dofTarget[1],
    camera.position.z - dofTarget[2]
  );
  passes.bokehPass.enabled = bokehScale >= 3.2;
  const uniforms = passes.bokehPass.uniforms as Record<string, { value: number }>;
  if (uniforms["focus"]) uniforms["focus"].value = Math.max(0.15, distToTarget);
  const aperture = Math.min(0.0045, (bokehScale / Math.max(0.4, dofRange)) * 0.00038);
  if (uniforms["aperture"]) uniforms["aperture"].value = aperture;
  if (uniforms["maxblur"]) uniforms["maxblur"].value = bokehScale > 4.5 ? 0.016 : 0.006;
  passes.bloomPass.strength = bloomIntensity;

  // Priority 1 takes over R3F rendering synchronously on every advance() call
  useFrame(() => {
    passes.composer.render();
  }, 1);

  return null;
};

export const CinematicStage: React.FC<{
  cam: Cam;
  shake?: Vec3;
  w?: number;
  h?: number;
  bg?: string;
  postfx?: PostFXProps;
  children: React.ReactNode;
}> = ({ cam, shake, w = 1080, h = 1920, bg = "#1c1728", postfx, children }) => {
  return (
    <AbsoluteFill style={{ background: bg, width: w, height: h }}>
      <ThreeCanvas
        width={w}
        height={h}
        shadows
        dpr={1}
        gl={{
          preserveDrawingBuffer: true,
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ fov: cam.fov, near: 0.03, far: 250, position: cam.pos }}
      >
        <CameraRig cam={cam} shake={shake} />
        {children}
        <CinematicPostFX {...postfx} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Warm Low Sun (golden rim light + long shadows) vs Cool Purple-Blue Fill (#4a5588 / #38436e). */
export const GoldenWildWestLighting: React.FC<{ sunBoost?: number }> = ({ sunBoost = 1.0 }) => {
  return (
    <>
      <color attach="background" args={["#231c32"]} />
      <fog attach="fog" args={["#3c2b3c", 18, 85]} />
      <hemisphereLight args={["#6a7cc2", "#38436e", 1.05]} />
      <directionalLight position={[14, 9, 12]} intensity={1.15} color="#4a5588" />
      <directionalLight
        position={[-18, 5.2, -14]}
        intensity={3.4 * sunBoost}
        color="#ffad4d"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={16}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      <pointLight position={[0, 0.8, 0]} intensity={0.6} distance={16} color="#d98943" />
    </>
  );
};

/** Warm late-afternoon room lighting for the modern smartphone-drop analogy mini-set. */
export const ModernDeskLighting: React.FC = () => {
  return (
    <>
      <color attach="background" args={["#1d2236"]} />
      <fog attach="fog" args={["#1d2236", 10, 32]} />
      <hemisphereLight args={["#6c7ec4", "#38436e", 0.95]} />
      <directionalLight position={[6, 6, 6]} intensity={0.9} color="#4a5588" />
      <directionalLight
        position={[-7, 4.5, -4]}
        intensity={3.0}
        color="#ffb55c"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-1.15, 1.55, -0.55]} intensity={2.2} distance={5.5} color="#ffbe6b" />
    </>
  );
};

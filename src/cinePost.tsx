/**
 * Tampilan "render 3D jadi" seperti video referensi: tone mapping ACES, pantulan lingkungan (IBL) untuk logam/lantai,
 * ambient occlusion (N8AO), bloom lampu, depth of field opsional, sorot cahaya volumetrik palsu + debu.
 * Dipakai lewat <CineStage look={...}>. Semua opsional; default lama tidak berubah.
 */
import React, { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BloomEffect, DepthOfFieldEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, VignetteEffect } from "postprocessing";
// @ts-expect-error n8ao tanpa deklarasi tipe
import { N8AOPostPass } from "n8ao";
import { Vec3 } from "./three/objects";

export type CineLook = {
  exposure?: number;      // 1.0 netral
  env?: number;           // kekuatan IBL (0 = mati)
  ao?: number;            // intensitas ambient occlusion (0 = mati)
  aoRadius?: number;      // meter
  bloom?: number;         // intensitas bloom (0 = mati)
  dof?: { focus: Vec3; range?: number; blur?: number }; // fokus pada titik dunia
};

export const CinePost: React.FC<{ look: CineLook }> = ({ look }) => {
  const { gl, scene, camera, size } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = look.exposure ?? 1.0;
    scene.environment = (look.env ?? 0) > 0 ? env : null;
    (scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = look.env ?? 0;
  }, [gl, scene, env, look.exposure, look.env]);

  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    c.addPass(new RenderPass(scene, camera));
    if ((look.ao ?? 0) > 0) {
      const ao = new N8AOPostPass(scene, camera, size.width, size.height);
      ao.configuration.aoRadius = look.aoRadius ?? 1.2;
      ao.configuration.distanceFalloff = 1.0;
      ao.configuration.intensity = look.ao;
      ao.configuration.halfRes = false;
      ao.configuration.aoSamples = 16;
      ao.configuration.denoiseSamples = 8;
      ao.configuration.denoiseRadius = 12;
      ao.configuration.gammaCorrection = false;
      c.addPass(ao);
    }
    const fx: unknown[] = [];
    if ((look.bloom ?? 0) > 0) fx.push(new BloomEffect({ intensity: look.bloom, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 }));
    if (look.dof) {
      const d = new DepthOfFieldEffect(camera, { worldFocusRange: look.dof.range ?? 2.5, bokehScale: look.dof.blur ?? 3.0, height: 720 });
      d.target = new THREE.Vector3(...look.dof.focus);
      fx.push(d);
    }
    fx.push(new SMAAEffect());
    fx.push(new VignetteEffect({ offset: 0.3, darkness: 0.35 }));
    // @ts-expect-error spread efek
    c.addPass(new EffectPass(camera, ...fx));
    c.setSize(size.width, size.height);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, size.width, size.height, look.ao, look.aoRadius, look.bloom, look.dof?.range, look.dof?.blur]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => {
    composer.render();
  }, 1);
  return null;
};

/* ---------------------------------------------------------------- sorot cahaya volumetrik palsu */
const shaftMat = (color: string, strength: number) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uS: { value: strength } },
    vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader:
      "uniform vec3 uColor; uniform float uS; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float along = smoothstep(0.0,0.15,vUv.y)*(1.0-vUv.y*0.65); float edge = pow(abs(dot(vN,vV)),1.6); gl_FragColor = vec4(uColor*uS*along*edge, 1.0); }",
  });

/** kerucut cahaya dari `from` ke `to` (mis. jendela → lantai, lubang got → dasar). */
export const LightShaft: React.FC<{ from: Vec3; to: Vec3; r0?: number; r1?: number; color?: string; strength?: number }> = ({ from, to, r0 = 0.4, r1 = 1.2, color = "#fff1cc", strength = 0.35 }) => {
  const mat = useMemo(() => shaftMat(color, strength), [color, strength]);
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
  return (
    <mesh position={mid.toArray() as Vec3} quaternion={q} material={mat} renderOrder={10}>
      <cylinderGeometry args={[r0, r1, len, 32, 1, true]} />
    </mesh>
  );
};

/** debu melayang (deterministik per frame) di dalam kotak; tampak di sorot cahaya */
export const Dust: React.FC<{ center: Vec3; size: Vec3; n?: number; frame: number; color?: string }> = ({ center, size, n = 160, frame, color = "#fff6dd" }) => {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1, Math.sin(i * 39.425) * 9876.54 % 1].map((v) => Math.abs(v))), [n]);
  const pos = new Float32Array(n * 3);
  seeds.forEach(([x, y, z], i) => {
    const t = frame / 30;
    pos[i * 3] = center[0] + (x - 0.5) * size[0] + Math.sin(t * 0.4 + i) * 0.08;
    pos[i * 3 + 1] = center[1] + (((y + t * 0.015 * (0.5 + z)) % 1) - 0.5) * size[1];
    pos[i * 3 + 2] = center[2] + (z - 0.5) * size[2] + Math.cos(t * 0.3 + i) * 0.08;
  });
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return (
    <points geometry={geo} renderOrder={11}>
      <pointsMaterial size={0.018} color={color} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
};

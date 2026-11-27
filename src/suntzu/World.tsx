import React, { useEffect, useMemo, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { V } from './timing';

let cached: Promise<THREE.Group> | null = null;
const load = () =>
  cached ??
  (cached = new Promise((resolve, reject) =>
    new GLTFLoader().load(
      staticFile('models/suntzu-palace.glb'),
      (g) => resolve(g.scene),
      undefined,
      reject,
    ),
  ));

/**
 * Loads the Sun Tzu palace GLB with real shadow casting on static architecture,
 * and bakes the shadow map once per scene mount for ultra-fast GPU rendering.
 */
export const Palace: React.FC<{ onAnchors?: (a: Record<string, V>) => void }> = ({ onAnchors }) => {
  const [source, setSource] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender('SunTzu palace mounted'));
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const advance = useThree((s) => s.advance);

  useEffect(() => {
    load().then(setSource).catch(cancelRender);
  }, []);

  const instance = useMemo(() => {
    if (!source) return null;
    const s = source.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.receiveShadow = true;
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });
    return s;
  }, [source]);

  useEffect(() => {
    if (!instance) return;
    instance.updateMatrixWorld(true);
    if (onAnchors) {
      const a: Record<string, V> = {};
      instance.traverse((o) => {
        if (o.name.startsWith('WP_') || o.name === 'ACTION_CommandDrum') {
          const p = o.getWorldPosition(new THREE.Vector3());
          a[o.name] = [p.x, p.y, p.z];
        }
      });
      onAnchors(a);
    }
    // Bake static scene shadow map once per scene mount (super crisp & fast!)
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    const timer = setTimeout(() => {
      gl.shadowMap.needsUpdate = true;
      invalidate();
      advance(performance.now() / 1000, true);
      continueRender(handle);
    }, 180);
    return () => clearTimeout(timer);
  }, [instance, handle, gl, invalidate, advance, onAnchors]);

  return instance ? <primitive object={instance} /> : null;
};

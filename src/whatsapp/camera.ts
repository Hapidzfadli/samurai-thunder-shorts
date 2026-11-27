import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface CameraShotSpec {
  /** Catmull-Rom spline control points for camera world position [x,y,z] */
  pos: [number, number, number][];
  /** Catmull-Rom spline control points for lookAt target [x,y,z] */
  look: [number, number, number][];
  /** Progress 0..1 along the spline */
  t: number;
  /** Time in seconds for continuous organic gimbal breathing micro-motion */
  timeSec: number;
  /** Optional FOV (defaults to 52) */
  fov?: number;
  /** Gimbal micro-drift amplitude (defaults to 0.032m; set 0.015 for tight shots) */
  drift?: number;
  /** Subtle camera Dutch roll in radians (optional) */
  roll?: number;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-5, edge1 - edge0)));
  return u * u * (3 - 2 * u);
}

export function easeOutCubic(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOutQuad(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

export function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  u: number,
): [number, number, number] {
  const k = Math.max(0, Math.min(1, u));
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

export function evalSpline(pts: [number, number, number][], u: number): THREE.Vector3 {
  const c = Math.max(0, Math.min(1, u));
  if (pts.length === 1) return new THREE.Vector3(...pts[0]);
  if (pts.length === 2) {
    return new THREE.Vector3(...lerp3(pts[0], pts[1], c));
  }
  const curve = new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
    0.5,
  );
  return curve.getPoint(c);
}

/**
 * Dynamic continuous cinema camera with Catmull-Rom spline motion + organic gimbal drift.
 * Guarantees smooth non-stop cinematic movement on every single frame.
 */
export const DynamicCamera: React.FC<CameraShotSpec> = ({
  pos,
  look,
  t,
  timeSec,
  fov = 52,
  drift = 0.032,
  roll = 0,
}) => {
  const { camera } = useThree();

  const { pVec, lVec } = useMemo(() => {
    const p = evalSpline(pos, t);
    const l = evalSpline(look, t);
    // Subtle multi-frequency cinema gimbal micro-motion (never frozen!)
    const dx = Math.sin(timeSec * 0.85) * drift + Math.cos(timeSec * 1.45) * drift * 0.45;
    const dy = Math.cos(timeSec * 0.72) * drift * 0.65 + Math.sin(timeSec * 1.32) * drift * 0.30;
    const dz = Math.sin(timeSec * 0.60 + 1.1) * drift * 0.50;
    p.x += dx;
    p.y += dy;
    p.z += dz;
    l.x += dx * 0.25;
    l.y += dy * 0.20;
    return { pVec: p, lVec: l };
  }, [pos, look, t, timeSec, drift]);

  camera.position.copy(pVec);
  camera.lookAt(lVec);
  if (roll !== 0) {
    camera.rotation.z += roll;
  }
  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const pc = camera as THREE.PerspectiveCamera;
    if (Math.abs(pc.fov - fov) > 0.05) {
      pc.fov = fov;
      pc.updateProjectionMatrix();
    }
  }
  return null;
};

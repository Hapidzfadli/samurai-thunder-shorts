/** Benda 3D terpisah untuk "Terowongan ke Brankas" — mengikuti titik tangan tokoh (beanHandWorld), bisa berpindah tangan. */
import React, { useMemo } from "react";
import * as THREE from "three";
import { BeanParams, beanHandWorld } from "./objectsBean";

type Vec3 = [number, number, number];
const std = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const INK = new THREE.MeshBasicMaterial({ color: "#241726", side: THREE.BackSide });

/** garis tepi kartun: salinan sedikit lebih besar dengan sisi belakang hitam */
const Inked: React.FC<{ geo: THREE.BufferGeometry; mat: THREE.Material; pos?: Vec3; rot?: Vec3; s?: number; ink?: number }> = ({ geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], s = 1, ink = 0.06 }) => (
  <group position={pos} rotation={rot} scale={s}>
    <mesh geometry={geo} material={mat} castShadow />
    <mesh geometry={geo} material={INK} scale={1 + ink} />
  </group>
);

/** Lentera minyak: alas, kaca menyala, rangka, gagang. Titik (0,0,0) = gagang (dipegang). */
export const Lantern: React.FC<{ s?: number; light?: number }> = ({ s = 1, light = 2.2 }) => {
  const g = useMemo(() => ({
    base: new THREE.CylinderGeometry(0.07, 0.08, 0.04, 16),
    glass: new THREE.CylinderGeometry(0.055, 0.055, 0.13, 16),
    cap: new THREE.ConeGeometry(0.075, 0.06, 16),
    bar: new THREE.BoxGeometry(0.01, 0.14, 0.01),
    ring: new THREE.TorusGeometry(0.045, 0.008, 6, 16),
  }), []);
  const m = useMemo(() => ({ iron: std("#2a2a30", { metalness: 0.6, roughness: 0.4 }), glow: new THREE.MeshStandardMaterial({ color: "#ffe2a0", emissive: "#ffb040", emissiveIntensity: 3 }) }), []);
  return (
    <group scale={s}>
      <mesh geometry={g.ring} material={m.iron} position={[0, -0.01, 0]} />
      <Inked geo={g.cap} mat={m.iron} pos={[0, -0.08, 0]} />
      <mesh geometry={g.glass} material={m.glow} position={[0, -0.18, 0]} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} geometry={g.bar} material={m.iron} position={[Math.cos((i * Math.PI) / 2) * 0.058, -0.18, Math.sin((i * Math.PI) / 2) * 0.058]} />
      ))}
      <Inked geo={g.base} mat={m.iron} pos={[0, -0.26, 0]} />
      {light > 0 && <pointLight position={[0, -0.18, 0.05]} intensity={light} distance={6} decay={1.6} color="#ffc070" />}
    </group>
  );
};

/** Bor listrik 1970-an (hijau). Titik (0,0,0) = pegangan; mata bor mengarah +X. */
export const Drill: React.FC<{ s?: number; spin?: number }> = ({ s = 1, spin = 0 }) => {
  const g = useMemo(() => ({ body: new THREE.BoxGeometry(0.26, 0.1, 0.08), grip: new THREE.BoxGeometry(0.06, 0.16, 0.07), chuck: new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), bit: new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8) }), []);
  const m = useMemo(() => ({ body: std("#3e7a4a"), dark: std("#202024"), steel: std("#c8ccd2", { metalness: 0.9, roughness: 0.25 }) }), []);
  return (
    <group scale={s}>
      <Inked geo={g.grip} mat={m.dark} pos={[0, 0, 0]} />
      <Inked geo={g.body} mat={m.body} pos={[0.05, 0.1, 0]} />
      <mesh geometry={g.chuck} material={m.dark} position={[0.21, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={g.bit} material={m.steel} position={[0.35, 0.1, 0]} rotation={[spin, 0, Math.PI / 2]} />
    </group>
  );
};

/** Karung goni berisi jarahan. Titik (0,0,0) = ikatan (dipegang). */
export const Sack: React.FC<{ s?: number; full?: number }> = ({ s = 1, full = 1 }) => {
  const g = useMemo(() => {
    const sp = new THREE.SphereGeometry(0.2, 18, 14);
    const pos = sp.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setY(i, y * 1.15);
      const k = y > 0.1 ? 1 - (y - 0.1) * 2.2 : 1;
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k * 0.85);
    }
    sp.computeVertexNormals();
    return { bag: sp, tie: new THREE.CylinderGeometry(0.035, 0.045, 0.06, 10), tuft: new THREE.ConeGeometry(0.05, 0.07, 8) };
  }, []);
  const m = useMemo(() => ({ jute: std("#c2a46e", { roughness: 1 }), rope: std("#6a4a2a") }), []);
  return (
    <group scale={s}>
      <mesh geometry={g.tie} material={m.rope} position={[0, -0.02, 0]} />
      <mesh geometry={g.tuft} material={m.jute} position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]} />
      <Inked geo={g.bag} mat={m.jute} pos={[0, -0.27, 0]} s={0.8 + 0.2 * full} />
    </group>
  );
};

/** Tutup got besi bundar (dipegang dua tangan di tepinya). Titik (0,0,0) = pusat. */
export const ManholeCover: React.FC<{ s?: number }> = ({ s = 1 }) => {
  const g = useMemo(() => ({ disc: new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32), rib: new THREE.BoxGeometry(0.7, 0.012, 0.03) }), []);
  const m = useMemo(() => ({ iron: std("#3a3a40", { metalness: 0.5, roughness: 0.55 }), rib: std("#24242a") }), []);
  return (
    <group scale={s}>
      <Inked geo={g.disc} mat={m.iron} ink={0.03} />
      {[-0.2, -0.1, 0, 0.1, 0.2].map((z) => (
        <mesh key={z} geometry={g.rib} material={m.rib} position={[0, 0.03, z]} />
      ))}
    </group>
  );
};

/** Ember berisi tanah. Titik (0,0,0) = gagang. */
export const Bucket: React.FC<{ s?: number; soil?: boolean }> = ({ s = 1, soil = true }) => {
  const g = useMemo(() => ({ pail: new THREE.CylinderGeometry(0.13, 0.1, 0.22, 16, 1, true), bottom: new THREE.CircleGeometry(0.1, 16), soil: new THREE.SphereGeometry(0.12, 12, 8), handle: new THREE.TorusGeometry(0.13, 0.008, 6, 20, Math.PI) }), []);
  const m = useMemo(() => ({ zinc: std("#9aa0a8", { metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }), soil: std("#8a5a32", { roughness: 1 }) }), []);
  return (
    <group scale={s}>
      <mesh geometry={g.handle} material={m.zinc} position={[0, -0.12, 0]} />
      <Inked geo={g.pail} mat={m.zinc} pos={[0, -0.25, 0]} ink={0.04} />
      <mesh geometry={g.bottom} material={m.zinc} position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {soil && <mesh geometry={g.soil} material={m.soil} position={[0, -0.15, 0]} scale={[1, 0.45, 1]} />}
    </group>
  );
};

/** Sekop. Titik (0,0,0) = gagang atas; bilah di bawah (-Y). */
export const Shovel: React.FC<{ s?: number }> = ({ s = 1 }) => {
  const g = useMemo(() => ({ shaft: new THREE.CylinderGeometry(0.018, 0.018, 0.9, 8), blade: new THREE.BoxGeometry(0.2, 0.26, 0.02), grip: new THREE.BoxGeometry(0.14, 0.03, 0.03) }), []);
  const m = useMemo(() => ({ wood: std("#8a5a32"), steel: std("#8a9098", { metalness: 0.8, roughness: 0.35 }) }), []);
  return (
    <group scale={s}>
      <mesh geometry={g.grip} material={m.wood} />
      <mesh geometry={g.shaft} material={m.wood} position={[0, -0.45, 0]} />
      <Inked geo={g.blade} mat={m.steel} pos={[0, -1.0, 0]} />
    </group>
  );
};

/** Kuas cat (untuk menulis pesan di dinding). Titik (0,0,0) = gagang. */
export const Brush: React.FC<{ s?: number; paint?: string }> = ({ s = 1, paint = "#c8242a" }) => {
  const g = useMemo(() => ({ handle: new THREE.CylinderGeometry(0.012, 0.015, 0.2, 8), ferrule: new THREE.BoxGeometry(0.06, 0.04, 0.02), bristle: new THREE.BoxGeometry(0.055, 0.06, 0.018) }), []);
  const m = useMemo(() => ({ wood: std("#a8743a"), steel: std("#c8ccd2", { metalness: 0.9 }), paint: std(paint) }), [paint]);
  return (
    <group scale={s}>
      <mesh geometry={g.handle} material={m.wood} position={[0, 0.06, 0]} />
      <mesh geometry={g.ferrule} material={m.steel} position={[0, -0.06, 0]} />
      <mesh geometry={g.bristle} material={m.paint} position={[0, -0.11, 0]} />
    </group>
  );
};

/** Borgol: dua cincin + rantai. Titik (0,0,0) = tengah rantai. */
export const Handcuffs: React.FC<{ s?: number; gap?: number }> = ({ s = 1, gap = 0.16 }) => {
  const g = useMemo(() => ({ ring: new THREE.TorusGeometry(0.045, 0.009, 8, 20), link: new THREE.TorusGeometry(0.012, 0.004, 6, 10) }), []);
  const m = useMemo(() => std("#c8ccd2", { metalness: 0.95, roughness: 0.2 }), []);
  return (
    <group scale={s}>
      {[-1, 1].map((sd) => <mesh key={sd} geometry={g.ring} material={m} position={[(sd * gap) / 2, 0, 0]} />)}
      {[-2, -1, 0, 1, 2].map((i) => <mesh key={i} geometry={g.link} material={m} position={[(i * gap) / 10, 0, 0]} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]} />)}
    </group>
  );
};

/** Kalung mutiara dengan liontin merah. Titik (0,0,0) = dijepit jari. */
export const Necklace: React.FC<{ s?: number }> = ({ s = 1 }) => {
  const g = useMemo(() => ({ pearl: new THREE.SphereGeometry(0.014, 8, 6), gem: new THREE.OctahedronGeometry(0.03) }), []);
  const m = useMemo(() => ({ pearl: std("#f4f0e6", { roughness: 0.2, metalness: 0.1 }), gem: std("#d0203a", { roughness: 0.05, metalness: 0.3, emissive: "#400008" }) }), []);
  const n = 22;
  return (
    <group scale={s}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / (n - 1)) * Math.PI;
        return <mesh key={i} geometry={g.pearl} material={m.pearl} position={[Math.cos(a) * 0.08, -Math.sin(a) * 0.16, 0]} />;
      })}
      <mesh geometry={g.gem} material={m.gem} position={[0, -0.19, 0]} />
    </group>
  );
};

/**
 * Letakkan benda di tangan tokoh. `card` = props kartu yang sama dengan BeanCard (posisi, tinggi, flip).
 * `hand` "L"/"R"/"both" (both = titik tengah dua tangan, mis. tutup got). `off` geser lokal, `rot` putar.
 */
export const InHand: React.FC<{
  p: BeanParams; position: Vec3; height: number; cam: Vec3; flip?: boolean; hand?: "L" | "R" | "both";
  off?: Vec3; rot?: Vec3; children: React.ReactNode;
}> = ({ p, position, height, cam, flip = false, hand = "R", off = [0, 0, 0], rot = [0, 0, 0], children }) => {
  const at = (sd: "L" | "R") => beanHandWorld(p, sd, position, height, cam, flip);
  const h = hand === "both" ? (() => { const a = at("L"); const b = at("R"); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] as Vec3; })() : at(hand);
  const face = Math.atan2(cam[0] - position[0], cam[2] - position[2]);
  return (
    <group position={[h[0] + off[0], h[1] + off[1], h[2] + off[2]]} rotation={[0, face, 0]}>
      <group rotation={rot}>{children}</group>
    </group>
  );
};

/** Bundel uang kertas franc berikat pita kertas. Titik (0,0,0) = pusat. */
export const MoneyBundle: React.FC<{ s?: number; tint?: string }> = ({ s = 1, tint = "#c9b98a" }) => {
  const g = useMemo(() => ({ stack: new THREE.BoxGeometry(0.16, 0.035, 0.075), band: new THREE.BoxGeometry(0.03, 0.038, 0.078), edge: new THREE.BoxGeometry(0.162, 0.004, 0.077) }), []);
  const m = useMemo(() => ({ note: std(tint, { roughness: 0.9 }), band: std("#f4ecd8"), edge: std("#8a7a50") }), [tint]);
  return (
    <group scale={s}>
      <Inked geo={g.stack} mat={m.note} ink={0.04} />
      {[-0.01, 0.0, 0.01].map((y) => <mesh key={y} geometry={g.edge} material={m.edge} position={[0, y, 0]} />)}
      <mesh geometry={g.band} material={m.band} />
    </group>
  );
};

/** Laci deposit baja yang ditarik keluar dari dinding, berisi tumpukan uang + kalung. Titik = mulut laci di dinding; laci menjulur ke +Z lokal. */
export const OpenDrawer: React.FC<{ out?: number; bundles?: number }> = ({ out = 0.42, bundles = 6 }) => {
  const g = useMemo(() => ({ floor: new THREE.BoxGeometry(0.3, 0.012, out), side: new THREE.BoxGeometry(0.012, 0.16, out), front: new THREE.BoxGeometry(0.32, 0.18, 0.02), plate: new THREE.BoxGeometry(0.08, 0.03, 0.005) }), [out]);
  const m = useMemo(() => ({ steel: std("#aeb4bc", { metalness: 0.7, roughness: 0.35 }), brass: std("#c9a24a", { metalness: 0.8, roughness: 0.3 }) }), []);
  return (
    <group>
      <mesh geometry={g.floor} material={m.steel} position={[0, -0.08, out / 2]} castShadow />
      {[-1, 1].map((sd) => <mesh key={sd} geometry={g.side} material={m.steel} position={[sd * 0.15, 0, out / 2]} />)}
      <Inked geo={g.front} mat={m.steel} pos={[0, 0, out]} ink={0.03} />
      <mesh geometry={g.plate} material={m.brass} position={[0, 0.04, out + 0.012]} />
      {Array.from({ length: bundles }, (_, i) => (
        <group key={i} position={[(i % 2 ? 0.06 : -0.06), -0.055 + Math.floor(i / 2) * 0.036, out - 0.08 - (i % 3) * 0.07]} rotation={[0, (i % 3) * 0.08, 0]}>
          <MoneyBundle />
        </group>
      ))}
    </group>
  );
};

// Properti "Perang Emu 1932" dengan gaya toon 3D (garis tepi hitam).
import React, { useMemo } from "react";
import * as THREE from "three";
import { G, Limb, T, Vec3, XR, toonGradient } from "./toon";

/* ---------------- emu ---------------- */
export type EmuPose = {
  neck?: number; // 0 tegak .. 1 menjulur maju/menunduk
  headTilt?: number; // miring kepala (rad)
  headTurn?: number;
  run?: number; // fase lari (rad); undefined = berdiri
  peck?: number; // 0..1 mematuk
  eyes?: "round" | "half"; // half = tatapan cuek/mengejek
  blink?: number;
};
const EMU_BODY = "#5b4a3e";
const EMU_DARK = "#43362e";
const EMU_NECK = "#8090a2";
export const Emu3D: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; pose?: EmuPose }> = ({ position, rotation, scale = 1, pose = {} }) => {
  const n = pose.neck ?? 0.2;
  const peck = pose.peck ?? 0;
  const run = pose.run;
  const bounce = run !== undefined ? Math.abs(Math.sin(run)) * 0.06 : 0;
  const bodyY = 1.02 + bounce;
  // titik leher: pangkal -> tengah -> kepala
  const base: Vec3 = [0, bodyY + 0.22, 0.38];
  const mid: Vec3 = [0, bodyY + 0.5 - n * 0.25, 0.5 + n * 0.25];
  const head: Vec3 = [0, bodyY + 0.82 - n * 0.45 - peck * 0.75, 0.48 + n * 0.45 + peck * 0.3];
  const leg = (side: number) => {
    const ph = run !== undefined ? run + (side > 0 ? 0 : Math.PI) : 0;
    const swing = run !== undefined ? Math.sin(ph) * 0.32 : 0;
    const lift = run !== undefined ? Math.max(0, Math.cos(ph)) * 0.22 : 0;
    const hip: Vec3 = [side * 0.16, bodyY - 0.15, 0.02];
    const foot: Vec3 = [side * 0.17, 0.05 + lift, 0.06 + swing];
    const knee: Vec3 = [side * 0.17, (hip[1] + foot[1]) * 0.5 + 0.02, Math.min(hip[2], foot[2]) - 0.2];
    return (
      <group key={side}>
        <Limb a={hip} b={knee} r={0.05} c="#5c5c62" />
        <Limb a={knee} b={foot} r={0.033} c="#6a6a70" />
        {[-0.45, 0, 0.45].map((a) => (
          <Limb key={a} a={foot} b={[foot[0] + Math.sin(a) * 0.13, foot[1] - 0.02, foot[2] + Math.cos(a) * 0.13]} r={0.018} c="#4a4a50" o={2} />
        ))}
      </group>
    );
  };
  const eyeOpen = pose.eyes === "half" ? 0.45 : 1;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {leg(1)}
      {leg(-1)}
      {/* badan berbulu lebat */}
      <group position={[0, bodyY, 0]}>
        <T g={G.sph(0.5, 26, 18)} c={EMU_BODY} scale={[0.72, 0.6, 1.0]} />
        {(
          [
            [0, 0.18, -0.25, 0.3],
            [0.2, 0.08, -0.38, 0.24],
            [-0.2, 0.08, -0.38, 0.24],
            [0, 0.05, -0.5, 0.26],
            [0.24, -0.12, -0.2, 0.22],
            [-0.24, -0.12, -0.2, 0.22],
            [0, -0.2, -0.42, 0.22],
            [0.12, 0.22, 0.05, 0.2],
            [-0.12, 0.22, 0.05, 0.2],
          ] as [number, number, number, number][]
        ).map(([x, y, z, r], i) => (
          <T key={i} g={G.dodec(r)} c={i % 2 ? EMU_DARK : EMU_BODY} position={[x, y, z]} rotation={[i * 0.7, i * 1.3, 0]} o={2} />
        ))}
      </group>
      {/* leher biru keabuan */}
      <Limb a={base} b={mid} r={0.075} c={EMU_NECK} />
      <Limb a={mid} b={head} r={0.06} c={EMU_NECK} />
      <T g={G.dodec(0.11)} c={EMU_DARK} position={[base[0], base[1] + 0.02, base[2] - 0.02]} o={2} />
      {/* kepala */}
      <group position={head} rotation={[(pose.headTilt ?? 0) * 0.3 + peck * 0.9, pose.headTurn ?? 0, pose.headTilt ?? 0]}>
        <T g={G.sph(0.12, 18, 12)} c="#7a8696" scale={[0.9, 0.85, 1.1]} />
        <T g={G.sph(0.06, 10, 8)} c={EMU_DARK} position={[0, 0.09, -0.03]} o={2} />
        <T g={G.cone(0.045, 0.17, 10)} c="#3a3634" position={[0, -0.02, 0.17]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.6]} o={2} />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.075, 0.03, 0.06]}>
            <T g={G.sph(0.048, 14, 10)} c="#ffffff" o={2} scale={[1, eyeOpen, 1]} />
            <T g={G.sph(0.026, 10, 8)} c="#c8641e" o={false} position={[0, 0, 0.032]} scale={[1, eyeOpen, 1]} />
            <T g={G.sph(0.014, 8, 6)} c="#111111" o={false} position={[0, 0, 0.05]} />
            {pose.eyes === "half" ? <T g={G.box(0.11, 0.03, 0.07)} c="#6a7686" o={2} position={[0, 0.025, 0.02]} rotation={[0, 0, -s * 0.25]} /> : null}
          </group>
        ))}
      </group>
    </group>
  );
};

/* ---------------- senapan mesin Lewis (bisa mode X-ray) ---------------- */
const Part: React.FC<{ xray: boolean; g: THREE.BufferGeometry; c: string; position?: Vec3; rotation?: Vec3; scale?: number | Vec3 }> = ({ xray, g, c, position, rotation, scale }) =>
  xray ? <XR g={g} position={position} rotation={rotation} scale={scale} /> : <T g={g} c={c} position={position} rotation={rotation} scale={scale} />;

export const LewisGun: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; xray?: boolean; jam?: number; bipod?: boolean }> = ({
  position,
  rotation,
  scale = 1,
  xray = false,
  jam = 0,
  bipod = true,
}) => {
  const metal = "#3c423a";
  const dark = "#26272a";
  const wood = "#8a5a32";
  const rounds = useMemo(() => {
    const out: { p: Vec3; r: Vec3 }[] = [];
    for (let tier = 0; tier < 2; tier++)
      for (let i = 0; i < 25; i++) {
        const a = (i / 25) * Math.PI * 2;
        out.push({ p: [Math.cos(a) * 0.11, 0.16 + tier * 0.028, 0.05 + Math.sin(a) * 0.11], r: [0, -a, Math.PI / 2] });
      }
    return out;
  }, []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* selubung pendingin laras */}
      <Part xray={xray} g={G.cyl(0.07, 0.07, 0.72, 20)} c={metal} position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} />
      {[0.22, 0.42, 0.62, 0.8].map((z) => (
        <Part key={z} xray={xray} g={G.tor(0.07, 0.01, 6, 20)} c={dark} position={[0, 0, z]} />
      ))}
      <Part xray={xray} g={G.cyl(0.035, 0.07, 0.1, 16)} c={dark} position={[0, 0, 0.91]} rotation={[Math.PI / 2, 0, 0]} />
      <Part xray={xray} g={G.cyl(0.018, 0.018, 0.08, 10)} c={dark} position={[0, 0, 1.0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* rumah mekanisme + gagang kokang */}
      <Part xray={xray} g={G.rbox(0.13, 0.15, 0.4, 0.2)} c={dark} position={[0, 0.0, 0.0]} />
      <Part xray={xray} g={G.box(0.05, 0.04, 0.08)} c={dark} position={[0.09, 0.0, 0.05 - jam * 0.0]} />
      {/* magazen drum di atas */}
      <Part xray={xray} g={G.cyl(0.19, 0.19, 0.07, 30)} c={metal} position={[0, 0.17, 0.05]} />
      <Part xray={xray} g={G.cyl(0.05, 0.05, 0.1, 14)} c={dark} position={[0, 0.18, 0.05]} />
      {/* popor kayu & pegangan */}
      <Part xray={xray} g={G.rbox(0.09, 0.13, 0.42, 0.3)} c={wood} position={[0, -0.04, -0.4]} rotation={[0.12, 0, 0]} />
      <Part xray={xray} g={G.rbox(0.06, 0.15, 0.07, 0.3)} c={wood} position={[0, -0.13, -0.12]} rotation={[-0.35, 0, 0]} />
      {bipod
        ? [-1, 1].map((s) => (
            <group key={s}>
              {xray ? (
                <XR g={G.cyl(0.014, 0.014, 0.45, 8)} position={[s * 0.1, -0.2, 0.72]} rotation={[0.25, 0, s * 0.35]} />
              ) : (
                <Limb a={[0, -0.03, 0.72]} b={[s * 0.18, -0.42, 0.82]} r={0.014} c={dark} o={2} />
              )}
            </group>
          ))
        : null}
      {/* isi magazen: 47 peluru .303 (terlihat jelas saat X-ray) */}
      {xray
        ? rounds.map((r, i) => <T key={i} g={G.cyl(0.009, 0.009, 0.075, 8)} c="#e0a840" emissive="#7a4a00" ei={0.5} o={false} position={r.p} rotation={r.r} />)
        : null}
      {xray ? (
        // peluru macet di jalur pengisian: merah menyala
        <T g={G.cyl(0.012, 0.012, 0.085, 10)} c="#ff3b30" emissive="#ff2010" ei={1.2 * (0.6 + 0.4 * jam)} o={2} position={[0, 0.06, 0.12]} rotation={[0.9, 0, 0]} />
      ) : null}
    </group>
  );
};

/* ---------------- karung pasir ---------------- */
export const Sandbags: React.FC<{ position?: Vec3; rotation?: Vec3; n?: number; rows?: number }> = ({ position, rotation, n = 4, rows = 2 }) => (
  <group position={position} rotation={rotation}>
    {Array.from({ length: rows }).flatMap((_, r) =>
      Array.from({ length: n - r }).map((__, i) => {
        const x = (i - (n - r - 1) / 2) * 0.5;
        const ang = x * 0.18;
        return (
          <T key={`${r}-${i}`} g={G.rbox(0.52, 0.2, 0.32, 0.55)} c={(r + i) % 2 ? "#c8b488" : "#bca67a"} position={[x, 0.1 + r * 0.19, -Math.abs(x) * 0.12]} rotation={[0, ang, 0]} />
        );
      })
    )}
  </group>
);

/* ---------------- ladang gandum (instanced, tanpa garis tepi): batang + bulir ---------------- */
export const Wheat: React.FC<{ area: [number, number, number, number]; n?: number; seed?: number; clear?: [number, number, number][] }> = ({ area, n = 1800, seed = 3, clear = [] }) => {
  const group = useMemo(() => {
    const stalkG = new THREE.CylinderGeometry(0.012, 0.018, 1, 5);
    stalkG.translate(0, 0.5, 0);
    const earG = new THREE.SphereGeometry(1, 7, 5);
    const mat = new THREE.MeshToonMaterial({ gradientMap: toonGradient(), color: "#ffffff" });
    const stalks = new THREE.InstancedMesh(stalkG, mat, n);
    const ears = new THREE.InstancedMesh(earG, mat, n);
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const o = new THREE.Object3D();
    const cs = ["#d6b058", "#c8a04a", "#e0be68"].map((c) => new THREE.Color(c));
    const ce = ["#f0cc6a", "#e8bc56", "#f6d884", "#dcae48"].map((c) => new THREE.Color(c));
    let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) {
      const x = area[0] + rnd() * (area[1] - area[0]);
      const z = area[2] + rnd() * (area[3] - area[2]);
      if (clear.some(([cx, cz, cr]) => (x - cx) ** 2 + (z - cz) ** 2 < cr * cr)) continue;
      const h = 0.7 + rnd() * 0.3;
      const tx = (rnd() - 0.5) * 0.3,
        tz = (rnd() - 0.5) * 0.3;
      o.position.set(x, 0, z);
      o.rotation.set(tx, 0, tz);
      o.scale.set(1, h, 1);
      o.updateMatrix();
      stalks.setMatrixAt(k, o.matrix);
      stalks.setColorAt(k, cs[Math.floor(rnd() * cs.length)]);
      // bulir di ujung batang (ikut kemiringan batang)
      const top = new THREE.Vector3(0, h, 0).applyEuler(new THREE.Euler(tx, 0, tz));
      o.position.set(x + top.x, top.y + 0.05, z + top.z);
      o.rotation.set(tx * 1.6, rnd() * 6, tz * 1.6);
      o.scale.set(0.035, 0.11, 0.035);
      o.updateMatrix();
      ears.setMatrixAt(k, o.matrix);
      ears.setColorAt(k, ce[Math.floor(rnd() * ce.length)]);
      k++;
    }
    stalks.count = ears.count = k;
    stalks.castShadow = ears.castShadow = true;
    stalks.receiveShadow = ears.receiveShadow = true;
    const grp = new THREE.Group();
    grp.add(stalks, ears);
    return grp;
  }, [area[0], area[1], area[2], area[3], n, seed, JSON.stringify(clear)]);
  return <primitive object={group} />;
};

/* ---------------- latar belakang: kincir angin, rumah seng, eukaliptus, pagar ---------------- */
export const Windmill: React.FC<{ position?: Vec3; spin?: number; scale?: number }> = ({ position, spin = 0, scale = 1 }) => {
  const H = 5.5;
  const legs: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  return (
    <group position={position} scale={scale}>
      {legs.map(([x, z], i) => (
        <Limb key={i} a={[x * 0.75, 0, z * 0.75]} b={[x * 0.16, H, z * 0.16]} r={0.04} c="#b4b8bc" o={2} cap={false} />
      ))}
      {[1.2, 2.6, 4.0].map((y) => {
        const w = 0.75 - (y / H) * 0.59;
        return legs.map(([x, z], i) => {
          const [x2, z2] = legs[(i + 1) % 4];
          return <Limb key={`${y}-${i}`} a={[x * w, y, z * w]} b={[x2 * w, y, z2 * w]} r={0.02} c="#a4a8ac" o={2} cap={false} />;
        });
      })}
      <group position={[0, H + 0.15, 0.25]} rotation={[0, 0, spin]}>
        <T g={G.cyl(0.14, 0.14, 0.2, 14)} c="#8a8e92" rotation={[Math.PI / 2, 0, 0]} o={2} />
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return <T key={i} g={G.box(0.16, 1.05, 0.02)} c="#c8ccd0" position={[Math.sin(a) * 0.75, Math.cos(a) * 0.75, 0]} rotation={[0, 0.3, -a]} o={2} />;
        })}
        <T g={G.tor(1.25, 0.025, 6, 40)} c="#9a9ea2" o={2} />
      </group>
      <T g={G.box(0.05, 0.7, 1.4)} c="#c8ccd0" position={[0, H + 0.15, -0.9]} o={2} />
      {/* tangki air seng */}
      <group position={[1.9, 0, 0.4]}>
        {[-0.5, 0.5].map((x) =>
          [-0.5, 0.5].map((z) => <T key={`${x}${z}`} g={G.box(0.1, 1.4, 0.1)} c="#8a6a4a" position={[x, 0.7, z]} o={2} />)
        )}
        <T g={G.cyl(0.85, 0.85, 1.1, 22)} c="#aeb4b8" position={[0, 1.95, 0]} />
        {[1.55, 1.85, 2.15, 2.4].map((y) => (
          <T key={y} g={G.tor(0.855, 0.018, 4, 30)} c="#8e9498" position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} o={false} />
        ))}
      </group>
    </group>
  );
};

export const Farmhouse: React.FC<{ position?: Vec3; rotation?: Vec3 }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    {/* dinding papan */}
    <T g={G.box(5, 2.6, 4)} c="#ecdfc2" position={[0, 1.3, 0]} />
    {[0.5, 0.9, 1.3, 1.7, 2.1].map((y) => (
      <T key={y} g={G.box(5.02, 0.03, 4.02)} c="#cdbf9e" position={[0, y, 0]} o={false} />
    ))}
    {/* atap seng limasan */}
    <T g={G.cone(3.9, 1.9, 4)} c="#a6acb2" position={[0, 3.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.82]} />
    {/* beranda */}
    <T g={G.box(5.6, 0.08, 1.6)} c="#9aa0a6" position={[0, 2.45, 2.7]} rotation={[0.22, 0, 0]} />
    {[-2.6, -0.9, 0.9, 2.6].map((x) => (
      <T key={x} g={G.box(0.12, 2.3, 0.12)} c="#f2ead8" position={[x, 1.15, 3.35]} o={2} />
    ))}
    <T g={G.box(5.6, 0.12, 1.6)} c="#9a7a56" position={[0, 0.06, 2.7]} o={2} />
    <T g={G.box(5.4, 0.08, 0.06)} c="#f2ead8" position={[0, 0.95, 3.35]} o={2} />
    {/* pintu & jendela */}
    <T g={G.box(0.9, 1.9, 0.08)} c="#3e5a7a" position={[0, 0.95, 2.02]} o={2} />
    {[-1.7, 1.7].map((x) => (
      <group key={x} position={[x, 1.45, 2.02]}>
        <T g={G.box(0.95, 0.85, 0.06)} c="#f6f0e0" o={2} />
        <T g={G.box(0.75, 0.68, 0.08)} c="#7ab0d8" emissive="#5a9ad0" ei={0.15} o={false} />
        <T g={G.box(0.05, 0.68, 0.1)} c="#f6f0e0" o={false} />
      </group>
    ))}
    {/* cerobong bata */}
    <T g={G.box(0.5, 1.6, 0.5)} c="#a8503a" position={[1.4, 3.7, -0.6]} />
    {/* tangki air hujan */}
    <T g={G.cyl(0.6, 0.6, 1.5, 18)} c="#b0b6ba" position={[-3.1, 0.75, 1.2]} />
  </group>
);

export const Eucalyptus: React.FC<{ position?: Vec3; scale?: number; seed?: number }> = ({ position, scale = 1, seed = 1 }) => {
  const s = seed;
  return (
    <group position={position} scale={scale}>
      <Limb a={[0, 0, 0]} b={[0.25, 2.2, 0]} r={0.16} c="#dcd6c8" cap={false} />
      <Limb a={[0.25, 2.2, 0]} b={[-0.4, 3.8, 0.1]} r={0.11} c="#d6d0c2" />
      <Limb a={[0.25, 2.2, 0]} b={[1.0, 3.5, -0.1]} r={0.09} c="#d6d0c2" />
      {(
        [
          [-0.5, 4.1, 0.1, 1.0],
          [0.9, 3.8, -0.1, 0.95],
          [0.2, 4.6, 0, 1.05],
          [-1.1, 3.7, -0.2, 0.75],
          [1.5, 3.4, 0.2, 0.7],
        ] as [number, number, number, number][]
      ).map(([x, y, z, r], i) => (
        <T key={i} g={G.ico(r, 1)} c={(i + s) % 2 ? "#7c9a7e" : "#6a8a6e"} position={[x, y, z]} scale={[1.2, 0.75, 1.1]} rotation={[0, i + s, 0]} />
      ))}
    </group>
  );
};

export const Fence: React.FC<{ from: [number, number]; to: [number, number]; posts?: number; broken?: number }> = ({ from, to, posts = 8, broken = -1 }) => {
  const pts = Array.from({ length: posts }).map((_, i) => {
    const k = i / (posts - 1);
    return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k] as [number, number];
  });
  return (
    <group>
      {pts.map(([x, z], i) => (
        <T key={i} g={G.cyl(0.05, 0.06, 1.15, 8)} c="#8a6a48" position={[x, 0.55, z]} rotation={i === broken ? [0.5, 0, 0.6] : [0, 0, (i % 3) * 0.03]} o={2} />
      ))}
      {[0.4, 0.75, 1.05].map((y) =>
        pts.slice(0, -1).map(([x, z], i) =>
          i === broken || i + 1 === broken ? null : <Limb key={`${y}-${i}`} a={[x, y, z]} b={[pts[i + 1][0], y - 0.03, pts[i + 1][1]]} r={0.008} c="#8a8e92" o={false} cap={false} />
        )
      )}
    </group>
  );
};

export const Hills: React.FC = () => (
  <group>
    {(
      [
        [-30, -55, 18, "#b8c48a"],
        [5, -60, 22, "#a8b87e"],
        [38, -52, 16, "#c0c890"],
        [-60, -40, 20, "#b0bc86"],
      ] as [number, number, number, string][]
    ).map(([x, z, r, c], i) => (
      <T key={i} g={G.ico(r, 2)} c={c} position={[x, -r * 0.78, z]} scale={[1.6, 1, 1]} o={2} />
    ))}
  </group>
);

export const ToonCloud: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    {(
      [
        [0, 0, 0, 1.2],
        [1.3, -0.2, 0.2, 0.95],
        [-1.3, -0.25, 0, 0.9],
        [0.5, 0.55, -0.2, 0.85],
      ] as [number, number, number, number][]
    ).map(([x, y, z, r], i) => (
      <T key={i} g={G.sph(r, 16, 12)} c="#ffffff" emissive="#ffffff" ei={0.35} position={[x, y, z]} o={2} shadow={false} />
    ))}
  </group>
);

export const Binoculars: React.FC<{ position?: Vec3; rotation?: Vec3 }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    {[-0.055, 0.055].map((x) => (
      <T key={x} g={G.cyl(0.04, 0.045, 0.16, 12)} c="#2a2a2c" position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} o={2} />
    ))}
    <T g={G.box(0.06, 0.03, 0.05)} c="#3a3a3c" o={2} />
  </group>
);

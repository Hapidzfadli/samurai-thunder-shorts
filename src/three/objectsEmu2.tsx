// Properti tambahan "Perang Emu 1932": truk, kantor menteri, bendungan, kemah, kelinci,
// peti amunisi, stempel & kertas, koran, buku catatan, efek tembakan (gaya toon 3D).
import React from "react";
import { CanvasPlane, G, Limb, T, Vec3 } from "./toon";

/* ---------------- truk 1930-an (menghadap +z) ---------------- */
export const Truck: React.FC<{ position?: Vec3; rotation?: Vec3; spin?: number; bounce?: number; tilt?: number; children?: React.ReactNode }> = ({ position, rotation, spin = 0, bounce = 0, tilt = 0, children }) => {
  const body = "#55663f";
  const dark = "#1e2020";
  const wheel = (x: number, z: number) => (
    <group key={`${x}${z}`} position={[x, 0.45, z]} rotation={[spin, 0, 0]}>
      <T g={G.cyl(0.45, 0.45, 0.26, 20)} c={dark} rotation={[0, 0, Math.PI / 2]} />
      <T g={G.cyl(0.22, 0.22, 0.28, 14)} c="#8a2a22" rotation={[0, 0, Math.PI / 2]} o={2} />
      {[0, 1, 2].map((i) => (
        <T key={i} g={G.box(0.3, 0.05, 0.05)} c="#c8c8c0" position={[x > 0 ? 0.15 : -0.15, 0, 0]} rotation={[(i * Math.PI) / 3, 0, 0]} o={false} />
      ))}
    </group>
  );
  return (
    <group position={position} rotation={rotation}>
      {wheel(0.85, 1.35)}
      {wheel(-0.85, 1.35)}
      {wheel(0.85, -1.25)}
      {wheel(-0.85, -1.25)}
      <group position={[0, bounce, 0]} rotation={[tilt, 0, 0]}>
        <T g={G.box(1.3, 0.2, 4.0)} c={dark} position={[0, 0.62, 0]} />
        {/* spatbor depan melengkung */}
        {[-0.85, 0.85].map((x) => (
          <T key={x} g={G.cyl(0.56, 0.56, 0.34, 16, false, 0, Math.PI)} c={body} position={[x, 0.5, 1.35]} rotation={[0, Math.PI / 2, Math.PI / 2]} />
        ))}
        {/* kap mesin + gril radiator + lampu */}
        <T g={G.rbox(1.0, 0.62, 1.15, 0.15)} c={body} position={[0, 1.02, 1.42]} />
        <T g={G.box(0.82, 0.66, 0.08)} c="#2a2c2c" position={[0, 1.04, 2.02]} />
        {[0.86, 0.98, 1.1, 1.22].map((y) => (
          <T key={y} g={G.box(0.7, 0.025, 0.1)} c="#9a9a92" position={[0, y, 2.03]} o={false} />
        ))}
        {[-0.62, 0.62].map((x) => (
          <group key={x} position={[x, 1.08, 1.95]}>
            <T g={G.sph(0.13, 14, 10)} c="#c8c8c0" />
            <T g={G.cyl(0.1, 0.1, 0.03, 14)} c="#fff6c8" position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} emissive="#fff0a0" ei={0.5} o={false} />
          </group>
        ))}
        <T g={G.box(1.6, 0.08, 0.12)} c="#9a9a92" position={[0, 0.62, 2.1]} o={2} />
        {/* kabin */}
        <T g={G.box(1.55, 1.05, 1.0)} c={body} position={[0, 1.4, 0.35]} />
        <T g={G.rbox(1.65, 0.12, 1.15, 0.3)} c="#44532f" position={[0, 1.98, 0.35]} />
        <T g={G.box(1.3, 0.48, 0.04)} c="#9ac8e8" emissive="#7ab0d8" ei={0.2} position={[0, 1.62, 0.86]} o={2} />
        {[-0.79, 0.79].map((x) => (
          <T key={x} g={G.box(0.04, 0.45, 0.6)} c="#9ac8e8" emissive="#7ab0d8" ei={0.2} position={[x, 1.62, 0.35]} o={2} />
        ))}
        {[-0.82, 0.82].map((x) => (
          <T key={x} g={G.box(0.3, 0.05, 1.3)} c={dark} position={[x, 0.68, 0.6]} o={2} />
        ))}
        {/* bak kayu */}
        <T g={G.box(1.8, 0.12, 2.4)} c="#9a6a3a" position={[0, 0.86, -1.05]} />
        {[-0.86, 0.86].map((x) => (
          <group key={x}>
            <T g={G.box(0.06, 0.08, 2.4)} c="#8a5a30" position={[x, 1.25, -1.05]} o={2} />
            {[-2.1, -1.5, -0.9, -0.3].map((z) => (
              <T key={z} g={G.box(0.06, 0.45, 0.06)} c="#8a5a30" position={[x, 1.08, z + 0.0]} o={2} />
            ))}
          </group>
        ))}
        <T g={G.box(1.8, 0.4, 0.06)} c="#8a5a30" position={[0, 1.08, -2.22]} o={2} />
        {children}
      </group>
    </group>
  );
};

/* ---------------- debu & efek tembakan ---------------- */
export const Dust: React.FC<{ position: Vec3; k: number; seed?: number; scale?: number; color?: string }> = ({ position, k, seed = 1, scale = 1, color = "#d8c49a" }) => {
  if (k <= 0 || k >= 1) return null;
  const grow = Math.sin(Math.min(1, k) * Math.PI);
  return (
    <group position={position} scale={scale}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = seed * 1.7 + i * 1.26;
        const r = 0.18 + 0.5 * k;
        return <T key={i} g={G.ico(0.22, 1)} c={color} o={2} shadow={false} position={[Math.cos(a) * r, 0.15 + k * 0.35 + (i % 2) * 0.12, Math.sin(a) * r * 0.6]} scale={0.3 + grow * 0.9} />;
      })}
    </group>
  );
};
export const MuzzleFlash: React.FC<{ position?: Vec3; rotation?: Vec3; on: boolean; seed?: number; scale?: number }> = ({ position, rotation, on, seed = 0, scale = 1 }) =>
  on ? (
    <group position={position} rotation={rotation} scale={scale}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + seed;
        return <T key={i} g={G.cone(0.05, 0.28, 6)} c="#ffd84a" emissive="#ffb020" ei={1.4} o={2} shadow={false} position={[Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.1]} rotation={[0, 0, a - Math.PI / 2]} />;
      })}
      <T g={G.cone(0.1, 0.5, 8)} c="#fff2a0" emissive="#ffd040" ei={1.6} o={2} shadow={false} position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  ) : null;
/** peluru cahaya (titik-titik) dari a ke b; t = waktu sejak tembakan dimulai (frame) */
export const Tracers: React.FC<{ from: Vec3; to: Vec3[]; t: number; dur: number; every?: number; speed?: number; color?: string }> = ({ from, to, t, dur, every = 2, speed = 0.22, color = "#ffe070" }) => {
  if (t < 0) return null;
  const out: React.ReactNode[] = [];
  for (let s = 0; s <= Math.min(t, dur); s += every) {
    const life = (t - s) * speed;
    if (life > 1.05) continue;
    const tgt = to[Math.floor(s / every) % to.length];
    for (let d = 0; d < 3; d++) {
      const k = life - d * 0.05;
      if (k < 0 || k > 1) continue;
      const p: Vec3 = [from[0] + (tgt[0] - from[0]) * k, from[1] + (tgt[1] - from[1]) * k, from[2] + (tgt[2] - from[2]) * k];
      out.push(<T key={`${s}-${d}`} g={G.sph(0.045 - d * 0.01, 8, 6)} c={color} emissive={color} ei={1.5} o={false} shadow={false} position={p} />);
    }
  }
  return <group>{out}</group>;
};
/** lintasan titik-titik (gaya penjelas balistik / jejak pergerakan) */
export const DotPath: React.FC<{ pts: Vec3[]; k: number; color?: string; step?: number; size?: number }> = ({ pts, k, color = "#7fe8ff", step = 0.35, size = 0.06 }) => {
  if (k <= 0) return null;
  const seg: Vec3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.round(len / step));
    for (let j = 0; j < n; j++) {
      const u = j / n;
      seg.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]);
    }
  }
  const show = Math.floor(seg.length * Math.min(1, k));
  return (
    <group>
      {seg.slice(0, show).map((p, i) => (
        <T key={i} g={G.sph(size, 8, 6)} c={color} emissive={color} ei={1.2} o={false} shadow={false} position={p} />
      ))}
    </group>
  );
};

/* ---------------- kelinci ---------------- */
export const Rabbit: React.FC<{ position?: Vec3; rotation?: Vec3; hop?: number; scale?: number }> = ({ position, rotation, hop = 0, scale = 1 }) => {
  const h = Math.abs(Math.sin(hop)) * 0.18;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={[0, h, 0]} rotation={[-Math.sin(hop) * 0.25, 0, 0]}>
        <T g={G.sph(0.16, 16, 12)} c="#9a8a7a" position={[0, 0.17, 0]} scale={[0.9, 0.85, 1.2]} />
        <T g={G.sph(0.1, 14, 10)} c="#a89888" position={[0, 0.3, 0.16]} />
        {[-0.04, 0.04].map((x) => (
          <T key={x} g={G.cap(0.025, 0.14, 8)} c="#a89888" position={[x, 0.45, 0.13]} rotation={[-0.3, 0, x * 3]} o={2} />
        ))}
        {[-0.045, 0.045].map((x) => (
          <T key={x} g={G.sph(0.018, 8, 6)} c="#111" position={[x, 0.32, 0.25]} o={false} />
        ))}
        <T g={G.sph(0.05, 10, 8)} c="#f4f0e8" position={[0, 0.2, -0.19]} o={2} />
      </group>
    </group>
  );
};

/* ---------------- peti amunisi .303 ---------------- */
export const AmmoCrate: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(0.5, 0.3, 0.32)} c="#6a7a44" />
    <T g={G.box(0.52, 0.05, 0.34)} c="#4a5830" position={[0, 0.13, 0]} o={2} />
    <CanvasPlane
      w={0.36}
      h={0.12}
      px={256}
      drawKey="303"
      draw={(c, w, h) => {
        c.fillStyle = "#6a7a44";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#f0e8c8";
        c.font = `900 ${h * 0.75}px Inter, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(".303  ×250", w / 2, h / 2);
      }}
      position={[0, -0.02, 0.163]}
      o={false}
    />
  </group>
);
export const Casings: React.FC<{ center: Vec3; n?: number; r?: number; seed?: number }> = ({ center, n = 20, r = 0.6, seed = 3 }) => {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return (
    <group position={center}>
      {Array.from({ length: n }).map((_, i) => (
        <T key={i} g={G.cyl(0.012, 0.012, 0.06, 8)} c="#d8a040" emissive="#6a4000" ei={0.3} o={false} position={[(rnd() - 0.5) * r * 2, 0.012, (rnd() - 0.5) * r * 2]} rotation={[Math.PI / 2, rnd() * 6, 0]} />
      ))}
    </group>
  );
};

/* ---------------- kertas surat & stempel ---------------- */
export const Letter: React.FC<{ position?: Vec3; rotation?: Vec3; stamped?: number; w?: number }> = ({ position, rotation, stamped = 0, w = 0.42 }) => (
  <CanvasPlane
    w={w}
    h={w * 1.3}
    px={512}
    drawKey={`letter${stamped > 0 ? 1 : 0}`}
    draw={(c, W, H) => {
      c.fillStyle = "#f6f0dc";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#2a2a30";
      c.font = `800 ${W * 0.06}px Inter, sans-serif`;
      c.fillText("REQUEST: MACHINE GUNS", W * 0.08, H * 0.1);
      c.fillStyle = "#6a6a70";
      for (let i = 0; i < 9; i++) c.fillRect(W * 0.08, H * (0.17 + i * 0.055), W * (0.7 + ((i * 37) % 20) / 100), H * 0.012);
      if (stamped > 0) {
        c.save();
        c.translate(W * 0.52, H * 0.78);
        c.rotate(-0.18);
        c.strokeStyle = "#d22a2a";
        c.fillStyle = "#d22a2a";
        c.lineWidth = W * 0.02;
        c.strokeRect(-W * 0.36, -H * 0.07, W * 0.72, H * 0.14);
        c.font = `900 ${W * 0.12}px Inter, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("APPROVED", 0, 0);
        c.restore();
      }
    }}
    position={position}
    rotation={rotation}
  />
);
export const Stamp: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(0.12, 0.03, 0.07)} c="#2a2a2a" position={[0, 0.015, 0]} />
    <T g={G.box(0.12, 0.012, 0.07)} c="#d22a2a" position={[0, -0.002, 0]} o={false} />
    <T g={G.cyl(0.018, 0.022, 0.1, 10)} c="#8a5a32" position={[0, 0.08, 0]} />
    <T g={G.sph(0.04, 12, 10)} c="#8a5a32" position={[0, 0.15, 0]} />
  </group>
);

/* ---------------- koran & buku catatan ---------------- */
export const Newspaper: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <CanvasPlane
      w={0.62}
      h={0.84}
      px={620}
      drawKey="koran"
      draw={(c, W, H) => {
        c.fillStyle = "#efe8d4";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#1a1a1a";
        c.textAlign = "center";
        c.font = `900 ${W * 0.06}px Georgia, serif`;
        c.fillText("THE DAILY WHEATBELT · 1932", W / 2, H * 0.07);
        c.fillRect(W * 0.05, H * 0.085, W * 0.9, 3);
        c.font = `900 ${W * 0.15}px Georgia, serif`;
        c.fillText("EMU WAR!", W / 2, H * 0.21);
        c.font = `700 ${W * 0.052}px Georgia, serif`;
        c.fillText("Birds Outmanoeuvre Machine Guns", W / 2, H * 0.28);
        // ilustrasi: emu & senapan
        c.save();
        c.translate(W * 0.5, H * 0.52);
        c.fillStyle = "#3a3a3a";
        c.beginPath();
        c.ellipse(0, 0, W * 0.16, H * 0.07, 0, 0, Math.PI * 2);
        c.fill();
        c.fillRect(W * 0.08, -H * 0.17, W * 0.03, H * 0.15);
        c.beginPath();
        c.arc(W * 0.095, -H * 0.18, W * 0.035, 0, Math.PI * 2);
        c.fill();
        c.fillRect(-W * 0.07, H * 0.05, W * 0.015, H * 0.12);
        c.fillRect(W * 0.05, H * 0.05, W * 0.015, H * 0.12);
        c.restore();
        c.fillStyle = "#7a7a7a";
        for (let col = 0; col < 3; col++) for (let i = 0; i < 10; i++) c.fillRect(W * (0.06 + col * 0.31), H * (0.72 + i * 0.024), W * 0.27, H * 0.008);
      }}
    />
  </group>
);
export const Notebook: React.FC<{ position?: Vec3; rotation?: Vec3; text: string; k: number; scale?: number }> = ({ position, rotation, text, k, scale = 1 }) => {
  const n = Math.floor(text.length * Math.min(1, Math.max(0, k)));
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <T g={G.box(0.34, 0.012, 0.46)} c="#6a3a22" position={[0, -0.008, 0]} o={2} />
      <CanvasPlane
        w={0.32}
        h={0.44}
        px={512}
        drawKey={`nb${n}`}
        rotation={[-Math.PI / 2, 0, 0]}
        o={false}
        draw={(c, W, H) => {
          c.fillStyle = "#f8f2de";
          c.fillRect(0, 0, W, H);
          c.strokeStyle = "#9ab4d8";
          c.lineWidth = 2;
          for (let i = 1; i < 14; i++) {
            c.beginPath();
            c.moveTo(0, i * (H / 14));
            c.lineTo(W, i * (H / 14));
            c.stroke();
          }
          c.fillStyle = "#1a2a5a";
          c.font = `italic 700 ${W * 0.1}px Georgia, serif`;
          const words = text.slice(0, n).split(" ");
          let line = "",
            y = H / 14 - 6;
          for (const w of words) {
            if (c.measureText(line + w).width > W * 0.86) {
              c.fillText(line, W * 0.07, y + H / 14);
              line = "";
              y += H / 14;
            }
            line += w + " ";
          }
          c.fillText(line, W * 0.07, y + H / 14);
        }}
      />
    </group>
  );
};
export const Pencil: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.cyl(0.014, 0.014, 0.2, 6)} c="#f0c030" position={[0, 0.1, 0]} o={2} />
    <T g={G.cone(0.014, 0.04, 6)} c="#e8c8a0" position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} o={2} />
  </group>
);

/* ---------------- kantor Menteri Pertahanan ---------------- */
const flagDraw = (c: CanvasRenderingContext2D, W: number, H: number) => {
  c.fillStyle = "#1a3a8a";
  c.fillRect(0, 0, W, H);
  // kanton Union Jack (sederhana)
  const cw = W / 2,
    ch = H / 2;
  c.save();
  c.beginPath();
  c.rect(0, 0, cw, ch);
  c.clip();
  c.strokeStyle = "#ffffff";
  c.lineWidth = ch * 0.2;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(cw, ch);
  c.moveTo(cw, 0);
  c.lineTo(0, ch);
  c.stroke();
  c.strokeStyle = "#d22a2a";
  c.lineWidth = ch * 0.07;
  c.stroke();
  c.fillStyle = "#ffffff";
  c.fillRect(cw * 0.42, 0, cw * 0.16, ch);
  c.fillRect(0, ch * 0.4, cw, ch * 0.2);
  c.fillStyle = "#d22a2a";
  c.fillRect(cw * 0.46, 0, cw * 0.08, ch);
  c.fillRect(0, ch * 0.45, cw, ch * 0.1);
  c.restore();
  const star = (x: number, y: number, r: number, n = 7) => {
    c.fillStyle = "#ffffff";
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.fill();
  };
  star(cw / 2, H * 0.75, H * 0.12);
  star(W * 0.75, H * 0.2, H * 0.06);
  star(W * 0.64, H * 0.45, H * 0.06);
  star(W * 0.86, H * 0.4, H * 0.06);
  star(W * 0.75, H * 0.8, H * 0.06);
  star(W * 0.8, H * 0.58, H * 0.035, 5);
};
const mapDraw = (c: CanvasRenderingContext2D, W: number, H: number) => {
  c.fillStyle = "#cfe4f0";
  c.fillRect(0, 0, W, H);
  c.strokeStyle = "#8aaac0";
  c.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    c.beginPath();
    c.moveTo((i * W) / 8, 0);
    c.lineTo((i * W) / 8, H);
    c.moveTo(0, (i * H) / 8);
    c.lineTo(W, (i * H) / 8);
    c.stroke();
  }
  // siluet benua Australia (kasar)
  const pts = [
    [0.12, 0.42], [0.2, 0.3], [0.32, 0.26], [0.4, 0.18], [0.48, 0.22], [0.55, 0.14], [0.62, 0.2], [0.68, 0.1], [0.74, 0.28], [0.82, 0.4], [0.88, 0.56], [0.84, 0.7], [0.74, 0.8], [0.62, 0.78], [0.56, 0.7], [0.48, 0.72], [0.36, 0.68], [0.22, 0.72], [0.12, 0.62],
  ];
  c.fillStyle = "#e2c27a";
  c.strokeStyle = "#7a5a2a";
  c.lineWidth = 3;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * W, y * H) : c.moveTo(x * W, y * H)));
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#d22a2a";
  c.beginPath();
  c.arc(0.2 * W, 0.6 * H, W * 0.022, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#2a2a2a";
  c.font = `800 ${W * 0.045}px Inter, sans-serif`;
  c.fillText("CAMPION", 0.12 * W, 0.56 * H);
};
export const OfficeSet: React.FC<{ fan?: number }> = ({ fan = 0 }) => (
  <group>
    {/* lantai papan */}
    <T g={G.box(8, 0.1, 6)} c="#a8784a" position={[0, -0.05, 0]} o={false} />
    {Array.from({ length: 16 }).map((_, i) => (
      <T key={i} g={G.box(0.02, 0.005, 6)} c="#8a5a32" position={[-4 + i * 0.5, 0.002, 0]} o={false} />
    ))}
    <T g={G.box(3.2, 0.012, 2.0)} c="#8a2a2a" position={[0, 0.006, 0.2]} o={2} />
    <T g={G.box(2.9, 0.014, 1.7)} c="#b8484a" position={[0, 0.008, 0.2]} o={false} />
    {/* dinding: krem di atas, panel kayu di bawah */}
    <T g={G.box(8, 3.4, 0.12)} c="#efe2c4" position={[0, 1.7, -2.4]} />
    <T g={G.box(8, 1.0, 0.16)} c="#7a4a2a" position={[0, 0.5, -2.36]} />
    <T g={G.box(8, 0.06, 0.2)} c="#5a3418" position={[0, 1.02, -2.34]} o={2} />
    <T g={G.box(0.12, 3.4, 6)} c="#e8d8b8" position={[-3.5, 1.7, 0]} />
    <T g={G.box(0.16, 1.0, 6)} c="#7a4a2a" position={[-3.46, 0.5, 0]} />
    {/* jendela + tirai */}
    <group position={[1.9, 1.9, -2.32]}>
      <T g={G.box(1.3, 1.5, 0.06)} c="#f6f0e0" />
      <T g={G.box(1.1, 1.3, 0.08)} c="#a8d8f0" emissive="#9ad0f0" ei={0.45} o={false} />
      <T g={G.box(0.05, 1.3, 0.1)} c="#f6f0e0" o={false} />
      <T g={G.box(1.1, 0.05, 0.1)} c="#f6f0e0" o={false} />
      {[-0.78, 0.78].map((x) => (
        <T key={x} g={G.box(0.32, 1.75, 0.08)} c="#8a2a3a" position={[x, -0.05, 0.08]} />
      ))}
    </group>
    {/* bendera & peta */}
    <group position={[-1.9, 2.15, -2.32]}>
      <T g={G.cyl(0.025, 0.025, 1.4, 8)} c="#c8a040" position={[-0.62, -0.25, 0.05]} o={2} />
      <CanvasPlane w={1.1} h={0.55} px={440} drawKey="flag" draw={flagDraw} position={[0, 0.12, 0.05]} />
    </group>
    <group position={[-3.42, 1.85, -0.6]} rotation={[0, Math.PI / 2, 0]}>
      <T g={G.box(1.5, 1.05, 0.04)} c="#6a4a2a" />
      <CanvasPlane w={1.38} h={0.94} px={520} drawKey="map" draw={mapDraw} position={[0, 0, 0.03]} o={false} />
    </group>
    {/* jam dinding */}
    <group position={[0.15, 2.65, -2.32]}>
      <T g={G.cyl(0.22, 0.22, 0.06, 24)} c="#6a4a2a" rotation={[Math.PI / 2, 0, 0]} />
      <T g={G.cyl(0.18, 0.18, 0.07, 24)} c="#f8f4e8" rotation={[Math.PI / 2, 0, 0]} o={false} />
      <T g={G.box(0.02, 0.13, 0.02)} c="#222" position={[0, 0.05, 0.05]} o={false} />
      <T g={G.box(0.1, 0.02, 0.02)} c="#222" position={[0.04, 0, 0.05]} o={false} />
    </group>
    {/* meja jati */}
    <group position={[0, 0, -0.9]}>
      <T g={G.box(2.2, 0.09, 1.0)} c="#7a4422" position={[0, 0.8, 0]} />
      {[-0.82, 0.82].map((x) => (
        <T key={x} g={G.box(0.5, 0.76, 0.9)} c="#6a3a1c" position={[x, 0.38, 0]} />
      ))}
      {[-0.82, 0.82].map((x) =>
        [0.2, 0.45].map((y) => <T key={`${x}${y}`} g={G.box(0.3, 0.02, 0.02)} c="#d8b060" position={[x, y, 0.46]} o={false} />)
      )}
      {/* telepon, mesin ketik, lampu hijau, tempat tinta, papan nama */}
      <group position={[-0.8, 0.85, -0.15]}>
        <T g={G.cyl(0.08, 0.1, 0.03, 14)} c="#1a1a1a" />
        <T g={G.cyl(0.02, 0.02, 0.26, 8)} c="#1a1a1a" position={[0, 0.14, 0]} />
        <T g={G.cyl(0.04, 0.05, 0.05, 10)} c="#1a1a1a" position={[0, 0.28, 0.02]} rotation={[0.4, 0, 0]} />
        <T g={G.cap(0.02, 0.16, 8)} c="#1a1a1a" position={[0.1, 0.18, 0]} rotation={[0, 0, 0.2]} />
      </group>
      <group position={[0.7, 0.85, -0.2]} rotation={[0, -0.3, 0]}>
        <T g={G.rbox(0.36, 0.12, 0.3, 0.3)} c="#2a2a2e" position={[0, 0.06, 0]} />
        <T g={G.cyl(0.03, 0.03, 0.42, 10)} c="#3a3a3e" position={[0, 0.15, -0.1]} rotation={[0, 0, Math.PI / 2]} />
        <T g={G.box(0.24, 0.16, 0.01)} c="#f6f0e0" position={[0, 0.24, -0.11]} rotation={[-0.2, 0, 0]} o={2} />
      </group>
      <group position={[0.25, 0.85, -0.3]}>
        <T g={G.cyl(0.07, 0.09, 0.03, 12)} c="#c8a040" />
        <T g={G.cyl(0.012, 0.012, 0.24, 8)} c="#c8a040" position={[0, 0.12, 0]} />
        <T g={G.cyl(0.07, 0.07, 0.2, 14, false, 0, Math.PI)} c="#2a7a4a" emissive="#1a6a3a" ei={0.25} position={[0, 0.27, 0.02]} rotation={[0, 0, Math.PI / 2]} />
      </group>
      <T g={G.cyl(0.04, 0.04, 0.06, 10)} c="#1a1a3a" position={[-0.4, 0.875, 0.1]} />
      <T g={G.box(0.3, 0.1, 0.03)} c="#3a2a1a" position={[0, 0.9, 0.42]} rotation={[-0.4, 0, 0]} o={2} />
      <T g={G.box(0.26, 0.04, 0.32)} c="#f6f0e0" position={[-0.35, 0.86, -0.15]} rotation={[0, 0.2, 0]} o={2} />
    </group>
    {/* kursi kulit di belakang meja */}
    <group position={[0, 0, -1.75]}>
      <T g={G.rbox(0.7, 0.14, 0.6, 0.3)} c="#5a2a1a" position={[0, 0.5, 0]} />
      <T g={G.rbox(0.7, 0.85, 0.14, 0.3)} c="#5a2a1a" position={[0, 0.95, -0.25]} />
      <T g={G.cyl(0.04, 0.04, 0.45, 8)} c="#2a2a2a" position={[0, 0.22, 0]} />
    </group>
    {/* lemari arsip, rak buku, palem, gantungan topi */}
    <group position={[-2.9, 0, -1.9]}>
      <T g={G.box(0.6, 1.4, 0.55)} c="#7a8a7a" position={[0, 0.7, 0]} />
      {[0.35, 0.75, 1.15].map((y) => (
        <T key={y} g={G.box(0.5, 0.02, 0.02)} c="#d0d0c8" position={[0, y, 0.28]} o={false} />
      ))}
    </group>
    <group position={[3.0, 0, -1.9]}>
      <T g={G.box(1.2, 2.2, 0.4)} c="#6a3a1c" position={[0, 1.1, 0]} />
      {[0.4, 0.95, 1.5, 2.0].map((y) =>
        [0, 1, 2, 3, 4, 5].map((i) => (
          <T key={`${y}${i}`} g={G.box(0.12, 0.38, 0.28)} c={["#8a2a2a", "#2a4a7a", "#3a6a3a", "#c8a040", "#5a3a6a", "#a85a2a"][(i + Math.round(y * 3)) % 6]} position={[-0.42 + i * 0.17, y + 0.02, 0.04]} o={2} />
        ))
      )}
    </group>
    <group position={[-2.4, 0, 0.9]}>
      <T g={G.cyl(0.25, 0.2, 0.45, 14)} c="#b8603a" position={[0, 0.22, 0]} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <T key={i} g={G.cone(0.12, 0.9, 5)} c="#4a8a4a" position={[Math.cos(i) * 0.15, 0.85, Math.sin(i) * 0.15]} rotation={[Math.sin(i) * 0.6, 0, Math.cos(i) * 0.6]} />
      ))}
    </group>
    {/* kipas langit-langit */}
    <group position={[0, 3.2, -0.3]} rotation={[0, fan, 0]}>
      <T g={G.cyl(0.02, 0.02, 0.5, 8)} c="#3a3a3a" position={[0, 0.25, 0]} />
      <T g={G.cyl(0.12, 0.12, 0.1, 14)} c="#5a4a3a" />
      {[0, 1, 2, 3].map((i) => (
        <T key={i} g={G.box(0.9, 0.02, 0.16)} c="#7a5a3a" position={[Math.cos((i * Math.PI) / 2) * 0.5, -0.02, Math.sin((i * Math.PI) / 2) * 0.5]} rotation={[0, (-i * Math.PI) / 2, 0]} />
      ))}
    </group>
  </group>
);

/* ---------------- bendungan tanah ---------------- */
export const Dam: React.FC<{ position?: Vec3; t?: number }> = ({ position, t = 0 }) => (
  <group position={position}>
    <T g={G.cyl(4.2, 4.2, 0.06, 40)} c="#5ab0d8" emissive="#3a90c0" ei={0.25} position={[0, 0.02, 0]} scale={[1.4, 1, 1]} o={false} />
    <T g={G.tor(4.4, 0.7, 8, 40)} c="#b08a5a" position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.4, 1, 0.45]} />
    {[0, 1, 2].map((i) => {
      const k = ((t * 0.02 + i / 3) % 1 + 1) % 1;
      return <T key={i} g={G.tor(0.6 + k * 2.2, 0.015, 4, 40)} c="#d8f0ff" o={false} position={[1.2, 0.06, 0.6]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]} />;
    })}
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return <T key={i} g={G.cone(0.04, 0.7 + (i % 3) * 0.2, 5)} c={i % 2 ? "#6a9a4a" : "#7aaa5a"} position={[Math.cos(a) * 5.4, 0.35, Math.sin(a) * 3.9]} rotation={[0.1 * Math.sin(i), 0, 0.1 * Math.cos(i)]} o={2} />;
    })}
    {[
      [-5.8, 0, -2.6],
      [5.6, 0, 2.4],
      [4.8, 0, -3.4],
    ].map((p, i) => (
      <T key={i} g={G.dodec(0.35 + i * 0.1)} c="#9a948a" position={p as Vec3} />
    ))}
  </group>
);

/* ---------------- kemah (tenda, meja lipat, api unggun) ---------------- */
export const Camp: React.FC<{ position?: Vec3; t?: number }> = ({ position, t = 0 }) => (
  <group position={position}>
    {/* tenda segitiga */}
    <group position={[0, 0, -1.5]}>
      {[-1, 1].map((s) => (
        <T key={s} g={G.box(0.04, 2.0, 3.0)} c="#b8a878" position={[s * 0.68, 0.92, 0]} rotation={[0, 0, s * 0.66]} />
      ))}
      <T g={G.cone(1.45, 1.75, 3)} c="#a89868" position={[0, 0.85, -1.48]} rotation={[0, Math.PI, 0]} scale={[1, 1, 0.05]} />
      <T g={G.cyl(0.03, 0.03, 2.0, 8)} c="#6a4a2a" position={[0, 1.0, 1.52]} o={2} />
      <Limb a={[0, 1.95, 1.5]} b={[0, 0, 2.6]} r={0.008} c="#d8d0b8" o={false} cap={false} />
    </group>
    {/* meja lipat + lentera + peta */}
    <group position={[1.5, 0, 0.2]}>
      <T g={G.box(1.0, 0.05, 0.6)} c="#8a6a42" position={[0, 0.72, 0]} />
      <Limb a={[-0.4, 0, -0.25]} b={[0.4, 0.7, 0.25]} r={0.02} c="#6a4a2a" o={2} />
      <Limb a={[0.4, 0, -0.25]} b={[-0.4, 0.7, 0.25]} r={0.02} c="#6a4a2a" o={2} />
      <group position={[0.3, 0.76, -0.1]}>
        <T g={G.cyl(0.06, 0.07, 0.04, 10)} c="#3a3a3a" />
        <T g={G.cyl(0.05, 0.05, 0.12, 10)} c="#ffe8a0" emissive="#ffcc60" ei={0.8} position={[0, 0.08, 0]} />
        <T g={G.cyl(0.03, 0.07, 0.05, 10)} c="#3a3a3a" position={[0, 0.16, 0]} />
      </group>
      <T g={G.box(0.4, 0.005, 0.3)} c="#e8dcb0" position={[-0.2, 0.75, 0]} rotation={[0, 0.2, 0]} o={2} />
    </group>
    {/* api unggun + ketel */}
    <group position={[-1.5, 0, 0.6]}>
      {[0, 1, 2, 3].map((i) => (
        <T key={i} g={G.cyl(0.05, 0.05, 0.6, 8)} c="#5a3a22" position={[0, 0.05, 0]} rotation={[Math.PI / 2, (i * Math.PI) / 4, 0]} o={2} />
      ))}
      {[0, 1, 2].map((i) => (
        <T key={i} g={G.cone(0.1 - i * 0.02, 0.35 + 0.08 * Math.sin(t * 0.6 + i * 2), 6)} c={i ? "#ffd040" : "#ff8a20"} emissive={i ? "#ffb020" : "#ff6010"} ei={1.2} o={2} shadow={false} position={[Math.sin(i * 2.1) * 0.06, 0.2, Math.cos(i * 2.1) * 0.06]} />
      ))}
      <T g={G.sph(0.14, 12, 10)} c="#3a3a3a" position={[0.0, 0.55, 0]} scale={[1, 0.8, 1]} />
    </group>
    {/* kursi lipat & peti */}
    <T g={G.box(0.45, 0.05, 0.4)} c="#6a7a44" position={[0.6, 0.45, 0.9]} />
    <Limb a={[0.4, 0, 0.75]} b={[0.8, 0.45, 1.05]} r={0.015} c="#3a3a3a" o={2} />
    <Limb a={[0.8, 0, 0.75]} b={[0.4, 0.45, 1.05]} r={0.015} c="#3a3a3a" o={2} />
    <AmmoCrate position={[2.4, 0.15, -1.0]} rotation={[0, -0.4, 0]} />
    <AmmoCrate position={[2.5, 0.45, -1.0]} rotation={[0, -0.2, 0]} />
  </group>
);

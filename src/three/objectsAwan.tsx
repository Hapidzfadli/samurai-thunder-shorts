// Properti "Kantor di Atas Awan" (Kang Nawas #2): rooftop senja, kantor kardus, mobil Pak Bos, layang-layang, drone, bata, foto lama.
import React from "react";
import { CanvasPlane, G, Limb, T, Vec3 } from "./toon";

/* ================= benda kecil (objek terpisah, mengikuti tangan) ================= */
export const Brick: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(0.2, 0.06, 0.1)} c="#c0563a" o={2} />
    {[-0.05, 0.05].map((x) => (
      <T key={x} g={G.cyl(0.015, 0.015, 0.061, 8)} c="#8a3a24" position={[x, 0, 0]} o={false} />
    ))}
  </group>
);
export const Kite: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; sway?: number }> = ({ position, rotation, scale = 1, sway = 0 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <group rotation={[0, 0, Math.sin(sway) * 0.15]}>
      <CanvasPlane
        w={0.6}
        h={0.8}
        px={240}
        toon={false}
        alpha
        o={false}
        drawKey="kite"
        draw={(c, W, H) => {
          c.clearRect(0, 0, W, H);
          c.beginPath();
          c.moveTo(W / 2, 0);
          c.lineTo(W, H * 0.38);
          c.lineTo(W / 2, H);
          c.lineTo(0, H * 0.38);
          c.closePath();
          c.fillStyle = "#e83a3a";
          c.fill();
          c.beginPath();
          c.moveTo(W / 2, 0);
          c.lineTo(W, H * 0.38);
          c.lineTo(W / 2, H * 0.38);
          c.closePath();
          c.fillStyle = "#ffd23f";
          c.fill();
          c.strokeStyle = "#2a1a10";
          c.lineWidth = 6;
          c.beginPath();
          c.moveTo(W / 2, 0);
          c.lineTo(W / 2, H);
          c.moveTo(0, H * 0.38);
          c.lineTo(W, H * 0.38);
          c.stroke();
        }}
      />
      {/* ekor pita */}
      {[0, 1, 2, 3].map((i) => (
        <T key={i} g={G.box(0.08, 0.03, 0.005)} c={i % 2 ? "#ffd23f" : "#e83a3a"} position={[Math.sin(sway * 2 + i) * 0.05, -0.48 - i * 0.12, 0]} rotation={[0, 0, Math.sin(sway + i) * 0.5]} o={false} />
      ))}
    </group>
  </group>
);
export const ToyDrone: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; spin?: number; brick?: boolean }> = ({ position, rotation, scale = 1, spin = 0, brick = true }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.16, 0.05, 0.16, 0.4)} c="#f4f4f4" />
    <T g={G.sph(0.02, 8, 6)} c="#ff3a3a" emissive="#ff0000" ei={1.2} position={[0, 0.0, 0.085]} o={false} />
    {[
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ].map(([x, z], i) => (
      <group key={i} position={[x * 0.13, 0.03, z * 0.13]}>
        <T g={G.cyl(0.015, 0.015, 0.04, 8)} c="#2a2a30" o={false} />
        <group rotation={[0, spin + i, 0]}>
          <T g={G.box(0.14, 0.004, 0.02)} c="#3a8ad8" position={[0, 0.025, 0]} o={false} />
        </group>
        <Limb a={[-x * 0.13, -0.03, -z * 0.13]} b={[0, 0, 0]} r={0.008} c="#d8d8d8" o={false} />
      </group>
    ))}
    {brick ? (
      <>
        <Limb a={[0, -0.03, 0]} b={[0, -0.18, 0]} r={0.003} c="#2a2a2a" o={false} />
        <Brick position={[0, -0.21, 0]} scale={0.5} />
      </>
    ) : null}
  </group>
);
/** foto lama: Pak Bos muda + ayahnya di kamar sewaan 3x3 */
export const OldPhoto: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <CanvasPlane
      w={0.15}
      h={0.11}
      px={420}
      toon={false}
      o={2}
      drawKey="oldphoto"
      draw={(c, W, H) => {
        c.fillStyle = "#f4ead0";
        c.fillRect(0, 0, W, H);
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#c8a878");
        g.addColorStop(1, "#8a6a48");
        c.fillStyle = g;
        c.fillRect(W * 0.05, H * 0.06, W * 0.9, H * 0.72);
        // meja kecil + kipas + papan nama tulisan tangan
        c.fillStyle = "#5a3a22";
        c.fillRect(W * 0.08, H * 0.55, W * 0.84, H * 0.08);
        c.fillStyle = "#f4ead0";
        c.fillRect(W * 0.62, H * 0.12, W * 0.28, H * 0.14);
        c.fillStyle = "#3a2a1a";
        c.font = `700 ${H * 0.07}px Inter, sans-serif`;
        c.fillText("PT. Hemat", W * 0.64, H * 0.21);
        // dua tokoh kepala bulat: ayah (kumis, peci) & anak muda
        const head = (x: number, y: number, r: number) => {
          c.fillStyle = "#f1e2d0";
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#2a1a10";
          c.lineWidth = 3;
          c.stroke();
          c.fillStyle = "#2a1a10";
          c.beginPath();
          c.arc(x - r * 0.35, y, r * 0.09, 0, Math.PI * 2);
          c.arc(x + r * 0.35, y, r * 0.09, 0, Math.PI * 2);
          c.fill();
          c.beginPath();
          c.arc(x, y + r * 0.25, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
          c.stroke();
        };
        c.fillStyle = "#4a4a58";
        c.fillRect(W * 0.18, H * 0.42, W * 0.22, H * 0.36);
        c.fillStyle = "#2a5a8a";
        c.fillRect(W * 0.5, H * 0.45, W * 0.2, H * 0.33);
        head(W * 0.29, H * 0.32, H * 0.13);
        head(W * 0.6, H * 0.36, H * 0.12);
        c.fillStyle = "#1a1a20";
        c.fillRect(W * 0.2, H * 0.14, W * 0.18, H * 0.07);
        c.fillRect(W * 0.25, H * 0.355, W * 0.08, H * 0.02);
        c.fillStyle = "#3a2a1a";
        c.font = `700 ${H * 0.08}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText("Kantor pertama kita · 3x3 m", W / 2, H * 0.92);
      }}
    />
  </group>
);
export const Tears: React.FC<{ head: Vec3; f: number; yaw?: number }> = ({ head, f, yaw = 0 }) => (
  <group position={head} rotation={[0, yaw, 0]}>
    {[-1, 1].map((sd) => {
      const k = ((f + (sd > 0 ? 9 : 0)) % 20) / 20;
      return <T key={sd} g={G.sph(0.035, 10, 8)} c="#8ad8ff" emissive="#4ab8ff" ei={0.5} position={[sd * 0.16, -0.08 - k * 0.3, 0.42]} scale={[0.8, 1.3, 0.8]} o={2} />;
    })}
  </group>
);
export const Shovel: React.FC<{ position?: Vec3; rotation?: Vec3 }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <T g={G.cyl(0.015, 0.015, 0.9, 8)} c="#a8784a" position={[0, 0.45, 0]} />
    <T g={G.box(0.16, 0.2, 0.02)} c="#8a8c94" position={[0, -0.02, 0]} />
  </group>
);
export const Bucket: React.FC<{ position?: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <T g={G.cyl(0.13, 0.1, 0.22, 16)} c="#3a3c44" position={[0, 0.11, 0]} />
    <T g={G.cyl(0.12, 0.12, 0.01, 16)} c="#a8a8a0" position={[0, 0.2, 0]} o={false} />
    <T g={G.tor(0.12, 0.006, 6, 20, Math.PI)} c="#8a8c94" position={[0, 0.24, 0]} o={false} />
  </group>
);

/* ================= mobil Pak Bos (sedan mewah hitam) ================= */
export const BossCar: React.FC<{ position?: Vec3; rotation?: Vec3; dent?: number }> = ({ position, rotation, dent = 0 }) => (
  <group position={position} rotation={rotation}>
    <T g={G.rbox(1.9, 0.42, 0.9, 0.35)} c="#1e2028" position={[0, 0.42, 0]} />
    <T g={G.rbox(1.05, 0.36, 0.82, 0.35)} c="#1e2028" position={[-0.1, 0.78, 0]} />
    {[-1, 1].map((sd) => (
      <T key={sd} g={G.box(0.9, 0.24, 0.01)} c="#8ac8e8" emissive="#4a7a9a" ei={0.2} position={[-0.1, 0.8, sd * 0.415]} o={false} />
    ))}
    {[
      [0.6, 1],
      [0.6, -1],
      [-0.6, 1],
      [-0.6, -1],
    ].map(([x, z], i) => (
      <T key={i} g={G.cyl(0.19, 0.19, 0.12, 18)} c="#1a1a1a" position={[x, 0.19, z * 0.42]} rotation={[Math.PI / 2, 0, 0]} />
    ))}
    <T g={G.box(0.02, 0.1, 0.7)} c="#d8d8d8" position={[0.95, 0.42, 0]} o={false} />
    {[-0.3, 0.3].map((z) => (
      <T key={z} g={G.sph(0.06, 10, 8)} c="#fff8d0" emissive="#ffe8a0" ei={0.8} position={[0.95, 0.5, z]} o={false} />
    ))}
    {/* penyok di kap mesin */}
    {dent > 0 ? (
      <group position={[0.6, 0.64, 0.05]}>
        <T g={G.sph(0.14 * dent, 14, 10)} c="#0e0f14" scale={[1, 0.3, 1]} o={false} />
        {[0, 1, 2, 3, 4].map((i) => (
          <T key={i} g={G.box(0.12 * dent, 0.004, 0.01)} c="#e8e8f0" position={[0, 0.01, 0]} rotation={[0, i * 1.26, 0]} o={false} />
        ))}
      </group>
    ) : null}
    <T g={G.box(0.3, 0.06, 0.02)} c="#f4f4f0" position={[-0.96, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} o={false} />
  </group>
);

/* ================= kantor kardus "di atas awan" (dibangun karyawan) ================= */
export const CardboardOffice: React.FC<{ position?: Vec3; rotation?: Vec3; reveal?: number; tarp?: number }> = ({ position, rotation, reveal = 1, tarp = 0 }) => (
  <group position={position} rotation={rotation}>
    {/* dinding kardus 3x3 (sisi depan terbuka) */}
    <T g={G.box(1.8, 1.5, 0.04)} c="#c89a62" position={[0, 0.75, -0.9]} />
    <T g={G.box(0.04, 1.5, 1.8)} c="#b88a52" position={[-0.9, 0.75, 0]} />
    <T g={G.box(0.04, 1.5, 1.8)} c="#b88a52" position={[0.9, 0.75, 0]} />
    {[-0.5, 0, 0.5].map((x) => (
      <T key={x} g={G.box(0.005, 1.46, 0.045)} c="#a87a42" position={[x, 0.75, -0.88]} o={false} />
    ))}
    {/* lakban & tulisan spidol di kardus */}
    <T g={G.box(1.8, 0.06, 0.045)} c="#d8c8a0" position={[0, 1.2, -0.88]} o={false} />
    {/* spanduk */}
    <CanvasPlane
      w={1.6}
      h={0.32}
      px={640}
      toon={false}
      o={2}
      position={[0, 2.12, -0.78]}
      drawKey="banner"
      draw={(c, W, H) => {
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#c81e1e";
        c.font = `900 ${H * 0.36}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText("KANTOR PERTAMA KITA", W / 2, H * 0.46);
        c.fillStyle = "#1e2240";
        c.font = `800 ${H * 0.26}px Inter, sans-serif`;
        c.fillText("Jilid 2 · di atas awan ☁️", W / 2, H * 0.84);
      }}
    />
    {/* awan kapas di atap & sekeliling */}
    {[
      [-0.7, 1.6, -0.6, 0.28],
      [-0.3, 1.66, -0.5, 0.33],
      [0.25, 1.62, -0.55, 0.3],
      [0.7, 1.58, -0.6, 0.27],
      [-1.0, 0.25, 0.4, 0.3],
      [1.05, 0.25, 0.5, 0.32],
      [0.0, 0.15, 0.95, 0.26],
    ].map(([x, y, z, r], i) => (
      <group key={i} position={[x, y, z]} scale={reveal}>
        <T g={G.sph(r, 16, 12)} c="#ffffff" emissive="#ffffff" ei={0.35} o={2} />
        <T g={G.sph(r * 0.7, 14, 10)} c="#f4f8ff" emissive="#ffffff" ei={0.35} position={[r * 0.7, -r * 0.15, 0]} o={2} />
        <T g={G.sph(r * 0.65, 14, 10)} c="#f4f8ff" emissive="#ffffff" ei={0.35} position={[-r * 0.7, -r * 0.18, 0]} o={2} />
      </group>
    ))}
    {/* meja lipat + laptop kardus + kipas kecil + foto */}
    <T g={G.box(1.0, 0.04, 0.5)} c="#e8e0d0" position={[0, 0.72, -0.4]} />
    {[-0.45, 0.45].map((x) => (
      <Limb key={x} a={[x, 0.7, -0.6]} b={[x, 0, -0.2]} r={0.015} c="#8a8c94" o={false} />
    ))}
    <T g={G.box(0.3, 0.2, 0.02)} c="#c89a62" position={[-0.2, 0.86, -0.55]} rotation={[-0.2, 0, 0]} />
    <T g={G.box(0.3, 0.015, 0.2)} c="#b88a52" position={[-0.2, 0.75, -0.42]} />
    <group position={[0.3, 0.74, -0.5]}>
      <T g={G.cyl(0.03, 0.06, 0.04, 12)} c="#f4f4f4" position={[0, 0.02, 0]} />
      <T g={G.cyl(0.01, 0.01, 0.2, 8)} c="#f4f4f4" position={[0, 0.12, 0]} />
      <T g={G.cyl(0.1, 0.1, 0.03, 18)} c="#8ad0ff" position={[0, 0.24, 0.02]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
    <OldPhoto position={[0.05, 1.05, -0.87]} scale={2.2} />
    {/* lampu tumbler */}
    {Array.from({ length: 9 }).map((_, i) => (
      <T key={i} g={G.sph(0.025, 8, 6)} c="#fff0a0" emissive="#ffd860" ei={1.6} position={[-0.85 + i * 0.21, 1.48 - Math.sin((i / 8) * Math.PI) * 0.08, -0.86]} o={false} />
    ))}
    {/* terpal penutup (ditarik ke samping saat kejutan) */}
    {tarp < 1 ? (
      <group scale={[1 + tarp * 0.15, 1 - tarp * 0.97, 1 + tarp * 0.15]} rotation={[0, 0, tarp * 0.05]}>
        <T g={G.box(1.95, 1.9, 1.95)} c="#2a6ad8" position={[0, 0.95, 0]} />
        {[-0.6, 0, 0.6].map((x) => (
          <T key={x} g={G.box(0.02, 1.9, 0.02)} c="#1a4aa8" position={[x, 0.95, 0.98]} o={false} />
        ))}
        <T g={G.sph(0.06, 8, 6)} c="#d8d8d8" position={[0.97, 1.88, 0.97]} o={false} />
      </group>
    ) : null}
  </group>
);

/* ================= LOKASI: rooftop gedung kantor (siang -> senja) ================= */
export const RooftopSet: React.FC<{ dusk?: number; car?: boolean; dent?: number; office?: React.ReactNode; carPos?: Vec3; carRot?: number; chair?: boolean }> = ({ dusk = 0, car = true, dent = 0, office, carPos = [1.6, 0, 2.2], carRot = -0.3, chair = true }) => {
  const mix = (a: string, b: string) => {
    const pa = parseInt(a.slice(1), 16),
      pb = parseInt(b.slice(1), 16);
    const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - dusk) + ((pb >> s) & 255) * dusk);
    return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
  };
  return (
    <group>
      {/* lantai beton + garis nat */}
      <T g={G.box(10, 0.12, 8)} c={mix("#b8b4ac", "#a89080")} position={[0, -0.06, 0]} o={false} />
      {Array.from({ length: 10 }).map((_, i) => (
        <T key={i} g={G.box(0.02, 0.004, 8)} c="#9a968e" position={[-5 + i, 0.002, 0]} o={false} />
      ))}
      {/* tembok pembatas (parapet) belakang & samping */}
      <T g={G.box(10, 0.7, 0.2)} c={mix("#d8d0c0", "#c8a890")} position={[0, 0.35, -3.0]} />
      <T g={G.box(10, 0.06, 0.26)} c="#8a8478" position={[0, 0.72, -3.0]} o={2} />
      <T g={G.box(0.2, 0.7, 6)} c={mix("#d0c8b8", "#c0a088")} position={[-4.0, 0.35, 0]} />
      {/* tangki air, unit AC, antena, pipa */}
      <group position={[2.9, 0, -2.2]}>
        {[-0.4, 0.4].map((x) => (
          <Limb key={x} a={[x, 0, 0]} b={[x, 1.0, 0]} r={0.04} c="#6a6c74" />
        ))}
        <T g={G.cyl(0.55, 0.55, 1.0, 20)} c="#3a7ac8" position={[0, 1.5, 0]} />
        <T g={G.cone(0.58, 0.25, 20)} c="#2a5aa8" position={[0, 2.12, 0]} />
      </group>
      {[-2.6, -1.7].map((x) => (
        <group key={x} position={[x, 0, -2.45]}>
          <T g={G.box(0.75, 0.55, 0.45)} c="#e8eaec" position={[0, 0.3, 0]} />
          <T g={G.cyl(0.2, 0.2, 0.02, 18)} c="#5a5c64" position={[0.05, 0.32, 0.23]} rotation={[Math.PI / 2, 0, 0]} o={false} />
        </group>
      ))}
      <Limb a={[-3.4, 0, -2.6]} b={[-3.4, 2.6, -2.6]} r={0.025} c="#8a8c94" />
      <T g={G.sph(0.06, 10, 8)} c="#ff3a3a" emissive="#ff0000" ei={1.4} position={[-3.4, 2.65, -2.6]} o={false} />
      <Limb a={[-3.9, 0.2, -2.8]} b={[2.2, 0.2, -2.8]} r={0.05} c="#7a7c84" o={2} />
      {/* pintu tangga darurat */}
      <group position={[-3.2, 0, 1.4]}>
        <T g={G.box(1.2, 2.3, 1.2)} c={mix("#d8d0c0", "#c8a890")} position={[0, 1.15, 0]} />
        <T g={G.box(0.7, 1.8, 0.04)} c="#5a6a7a" position={[0.61, 0.9, 0]} rotation={[0, Math.PI / 2, 0]} />
        <CanvasPlane w={0.5} h={0.18} px={260} toon={false} o={2} position={[0.62, 2.0, 0]} rotation={[0, Math.PI / 2, 0]} drawKey="exit" draw={(c, W, H) => { c.fillStyle = "#1a8a3a"; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; c.font = `900 ${H * 0.6}px Inter, sans-serif`; c.textAlign = "center"; c.fillText("TANGGA", W / 2, H * 0.75); }} />
      </group>
      {/* tanaman pot & kursi plastik */}
      {[
        [3.6, 0.6],
        [-3.5, -1.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <T g={G.cyl(0.22, 0.17, 0.45, 12)} c="#c8643a" position={[0, 0.22, 0]} />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <T key={k} g={G.cone(0.08, 0.7, 5)} c="#3a8a4a" position={[Math.cos(k) * 0.1, 0.75, Math.sin(k) * 0.1]} rotation={[Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5]} />
          ))}
        </group>
      ))}
      {chair ? <PlasticChair position={[2.4, 0, 0.9]} rotation={[0, -0.6, 0]} /> : null}
      {/* (kursi lama) */}
      <group visible={false}>
        <T g={G.box(0.45, 0.04, 0.45)} c="#e84a3a" position={[0, 0.45, 0]} />
        <T g={G.box(0.45, 0.45, 0.04)} c="#e84a3a" position={[0, 0.68, -0.21]} />
        {[
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ].map(([x, z], i) => (
          <Limb key={i} a={[x * 0.2, 0.44, z * 0.2]} b={[x * 0.22, 0, z * 0.22]} r={0.015} c="#e84a3a" o={false} />
        ))}
      </group>
      {/* langit kota: gedung-gedung di kejauhan */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = -14 + i * 2.1;
        const h = 3 + ((i * 37) % 6);
        return (
          <group key={i} position={[x, -4, -14 - (i % 3) * 3]}>
            <T g={G.box(1.6, h + 4, 1.6)} c={mix(["#8a9ab8", "#9aa8c4", "#7a8aa8"][i % 3], ["#6a5a7a", "#7a6080", "#5a4a6a"][i % 3])} position={[0, (h + 4) / 2, 0]} o={false} />
            {Array.from({ length: Math.floor(h) }).map((_, r) => (
              <T key={r} g={G.box(1.2, 0.12, 0.01)} c={dusk > 0.5 ? "#ffe8a0" : "#c8d8f0"} emissive={dusk > 0.5 ? "#ffc860" : "#000000"} ei={dusk > 0.5 ? 0.6 : 0} position={[0, 4.4 + r * 0.9, 0.81]} o={false} />
            ))}
          </group>
        );
      })}
      {/* matahari senja */}
      {dusk > 0 ? <T g={G.sph(2.2, 24, 16)} c="#ffb04a" emissive="#ff8a20" ei={1.2 * dusk} position={[6, 3 - dusk * 2.5, -40]} o={false} /> : null}
      {car ? <BossCar position={carPos} rotation={[0, carRot, 0]} dent={dent} /> : null}
      {office}
      <hemisphereLight args={[mix("#ffffff", "#ffc890"), mix("#c8b8a0", "#6a4a5a"), 0.6]} />
    </group>
  );
};

export const PlasticChair: React.FC<{ position?: Vec3; rotation?: Vec3; c?: string }> = ({ position, rotation, c = "#e84a3a" }) => (
  <group position={position} rotation={rotation}>
    <T g={G.box(0.45, 0.04, 0.45)} c={c} position={[0, 0.45, 0]} />
    <T g={G.box(0.45, 0.45, 0.04)} c={c} position={[0, 0.68, -0.21]} />
    {[
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ].map(([x, z], i) => (
      <Limb key={i} a={[x * 0.2, 0.44, z * 0.2]} b={[x * 0.22, 0, z * 0.22]} r={0.015} c={c} o={false} />
    ))}
  </group>
);
/** celengan babi; broken 0..1 = pecah, koin berhamburan */
export const Piggy: React.FC<{ position?: Vec3; rotation?: Vec3; broken?: number; scale?: number }> = ({ position, rotation, broken = 0, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {broken <= 0 ? (
      <group>
        <T g={G.sph(0.14, 16, 12)} c="#f6a8c8" scale={[1.25, 1, 1]} position={[0, 0.14, 0]} />
        <T g={G.cyl(0.05, 0.05, 0.04, 12)} c="#f08ab0" position={[0.18, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} o={2} />
        {[-1, 1].map((sd) => (
          <T key={sd} g={G.cone(0.035, 0.06, 6)} c="#f6a8c8" position={[0.1, 0.27, sd * 0.06]} o={2} />
        ))}
        {[-0.08, 0.08].map((x) =>
          [-0.07, 0.07].map((z) => <T key={`${x}${z}`} g={G.cyl(0.025, 0.025, 0.06, 8)} c="#f08ab0" position={[x, 0.03, z]} o={false} />)
        )}
        <T g={G.box(0.06, 0.005, 0.012)} c="#3a2a2a" position={[0, 0.285, 0]} o={false} />
      </group>
    ) : (
      <group>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = i * 0.9;
          const r = 0.05 + broken * 0.25;
          return <T key={i} g={G.dodec(0.05)} c="#f6a8c8" position={[Math.cos(a) * r, 0.03 + Math.max(0, 0.25 * Math.sin(Math.PI * Math.min(1, broken * 1.4))) * ((i % 3) / 2), Math.sin(a) * r]} rotation={[a, a * 2, 0]} scale={[1, 0.5, 1]} />;
        })}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = i * 0.53 + 0.2;
          const r = 0.04 + broken * (0.3 + (i % 4) * 0.08);
          const h = Math.max(0, Math.sin(Math.PI * Math.min(1, broken * 1.2)) * (0.3 + (i % 3) * 0.1));
          return <T key={`c${i}`} g={G.cyl(0.03, 0.03, 0.008, 12)} c="#e8c040" emissive="#6a4a00" ei={0.3} position={[Math.cos(a) * r, 0.01 + h, Math.sin(a) * r]} rotation={[broken * 8 + i, 0, broken * 5]} o={false} />;
        })}
      </group>
    )}
  </group>
);
/** HP dengan layar bergambar (foto bayi / resep / video call investor) */
export const ScreenPhone: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; kind: "baby" | "call"; t?: number }> = ({ position, rotation, scale = 1, kind, t = 0 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.085, 0.17, 0.012, 0.3)} c={kind === "call" ? "#d8b468" : "#2a2c34"} o={2} />
    <CanvasPlane
      w={0.074}
      h={0.152}
      px={220}
      toon={false}
      o={false}
      position={[0, 0, 0.0065]}
      drawKey={`scr${kind}${kind === "call" ? Math.floor(t * 4) % 2 : 0}`}
      draw={(c, W, H) => {
        if (kind === "baby") {
          c.fillStyle = "#fde8ee";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#f1e2d0";
          c.beginPath();
          c.arc(W / 2, H * 0.42, W * 0.3, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#3a2a2a";
          c.lineWidth = 3;
          c.stroke();
          c.fillStyle = "#3a2a2a";
          c.beginPath();
          c.arc(W * 0.4, H * 0.4, 4, 0, Math.PI * 2);
          c.arc(W * 0.6, H * 0.4, 4, 0, Math.PI * 2);
          c.fill();
          c.beginPath();
          c.arc(W / 2, H * 0.47, 9, 0.1 * Math.PI, 0.9 * Math.PI);
          c.stroke();
          c.fillStyle = "#7ad0ff";
          c.fillRect(W * 0.15, H * 0.62, W * 0.7, H * 0.18);
          c.fillStyle = "#c83a6a";
          c.font = `900 ${W * 0.11}px Inter, sans-serif`;
          c.textAlign = "center";
          c.fillText("Dek Rafa ♥", W / 2, H * 0.92);
        } else {
          c.fillStyle = "#1e2a3a";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#5a7aa8";
          c.fillRect(W * 0.06, H * 0.08, W * 0.88, H * 0.62);
          c.fillStyle = "#f1e2d0";
          c.beginPath();
          c.arc(W / 2, H * 0.34, W * 0.24, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#3a3a48";
          c.fillRect(W * 0.26, H * 0.5, W * 0.48, H * 0.2);
          c.fillStyle = "#2a1a10";
          c.beginPath();
          c.arc(W * 0.42, H * 0.32, 4, 0, Math.PI * 2);
          c.arc(W * 0.58, H * 0.32, 4, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#2a1a10";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(W / 2, H * 0.37, 8, 0.1 * Math.PI, 0.9 * Math.PI);
          c.stroke();
          c.fillStyle = "#8ad8ff";
          c.beginPath();
          c.arc(W * 0.36, H * 0.38 + (Math.floor(t * 4) % 2) * 4, 3, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#fff";
          c.font = `800 ${W * 0.12}px Inter, sans-serif`;
          c.textAlign = "center";
          c.fillText("Investor", W / 2, H * 0.8);
          c.fillStyle = "#e84a3a";
          c.beginPath();
          c.arc(W / 2, H * 0.92, W * 0.07, 0, Math.PI * 2);
          c.fill();
        }
      }}
    />
  </group>
);
/** kertas resep obat (dilipat: fold 0..1) */
export const Prescription: React.FC<{ position?: Vec3; rotation?: Vec3; fold?: number; scale?: number }> = ({ position, rotation, fold = 0, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <group scale={[1, 1 - fold * 0.5, 1]}>
      <CanvasPlane
        w={0.15}
        h={0.2}
        px={240}
        toon={false}
        o={2}
        drawKey="resep"
        draw={(c, W, H) => {
          c.fillStyle = "#ffffff";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#2a8a5a";
          c.fillRect(0, 0, W, H * 0.14);
          c.fillStyle = "#fff";
          c.font = `900 ${H * 0.08}px Inter, sans-serif`;
          c.fillText("RESEP · APOTEK", W * 0.06, H * 0.1);
          c.fillStyle = "#1a1a2a";
          c.font = `700 ${H * 0.06}px Inter, sans-serif`;
          c.fillText("R/ Obat jantung Ibu", W * 0.06, H * 0.3);
          c.fillText("3x sehari", W * 0.06, H * 0.42);
          c.fillStyle = "#c81e1e";
          c.font = `900 ${H * 0.08}px Inter, sans-serif`;
          c.fillText("Rp850.000", W * 0.06, H * 0.62);
          c.fillStyle = "#8a90a0";
          for (let i = 0; i < 3; i++) c.fillRect(W * 0.06, H * (0.72 + i * 0.07), W * 0.7, 3);
        }}
      />
    </group>
  </group>
);
export const Moon: React.FC<{ position?: Vec3; k?: number }> = ({ position = [-6, 9, -40], k = 1 }) => (
  <group position={position} scale={k}>
    <T g={G.sph(2.4, 28, 18)} c="#fff4c8" emissive="#ffe8a0" ei={0.9} o={false} />
    {[
      [0.8, 0.6, 0.5],
      [-0.7, -0.4, 0.4],
      [0.2, -1.0, 0.3],
    ].map(([x, y, r], i) => (
      <T key={i} g={G.sph(r, 12, 8)} c="#e8d8a0" position={[x, y, 2.1]} scale={[1, 1, 0.3]} o={false} />
    ))}
  </group>
);

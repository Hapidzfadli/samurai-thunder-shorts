// Properti "Kerja Kelompok" (gaya toon 3D): kelas, kamar kos, kafe, benda yang dipegang.
import React from "react";
import { CanvasPlane, G, Limb, T, Vec3 } from "./toon";

/* ---------------- benda kecil (bisa dipegang / berpindah tangan) ---------------- */
export const Phone: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; screen?: string; lit?: boolean }> = ({ position, rotation, scale = 1, screen = "#3a8ad8", lit = true }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.08, 0.16, 0.012, 0.3)} c="#1a1a20" o={2} />
    <T g={G.box(0.068, 0.138, 0.004)} c={lit ? screen : "#101014"} emissive={lit ? screen : "#000000"} ei={lit ? 0.6 : 0} position={[0, 0, 0.007]} o={false} />
  </group>
);
export const Laptop: React.FC<{ position?: Vec3; rotation?: Vec3; open?: number; scale?: number; screenText?: string; typed?: number }> = ({ position, rotation, open = 1, scale = 1, screenText = "TUGAS KELOMPOK", typed = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(0.42, 0.025, 0.3)} c="#9aa0a8" position={[0, 0.0125, 0]} />
    <T g={G.box(0.36, 0.004, 0.14)} c="#2a2c30" position={[0, 0.027, 0.03]} o={false} />
    <group position={[0, 0.025, -0.15]} rotation={[-(Math.PI / 2) * open * 0.82 + 0, 0, 0]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <T g={G.box(0.42, 0.29, 0.02)} c="#9aa0a8" position={[0, 0.145, 0]} />
        <CanvasPlane
          w={0.38}
          h={0.25}
          px={384}
          toon={false}
          o={false}
          position={[0, 0.145, 0.011]}
          drawKey={`lap${screenText}${Math.round(typed * 40)}`}
          draw={(c, W, H) => {
            c.fillStyle = "#f4f6fa";
            c.fillRect(0, 0, W, H);
            c.fillStyle = "#2a5aa8";
            c.fillRect(0, 0, W, H * 0.1);
            c.fillStyle = "#1a1a2a";
            c.font = `900 ${H * 0.09}px Inter, sans-serif`;
            c.fillText(screenText, W * 0.06, H * 0.24);
            c.fillStyle = "#8a90a0";
            const n = Math.floor(12 * typed);
            for (let i = 0; i < n; i++) c.fillRect(W * 0.06, H * (0.32 + i * 0.055), W * (0.6 + ((i * 29) % 30) / 100), H * 0.02);
          }}
        />
      </group>
    </group>
  </group>
);
export const Mug: React.FC<{ position?: Vec3; rotation?: Vec3; c?: string; scale?: number; full?: number }> = ({ position, rotation, c = "#f4f0e8", scale = 1, full = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.cyl(0.045, 0.04, 0.1, 14)} c={c} position={[0, 0.05, 0]} />
    <T g={G.tor(0.025, 0.008, 6, 12)} c={c} position={[0.05, 0.055, 0]} o={2} />
    {full > 0 ? <T g={G.cyl(0.041, 0.041, 0.005, 14)} c="#4a2a18" position={[0, 0.02 + 0.075 * full, 0]} o={false} /> : null}
  </group>
);
export const IcedCoffee: React.FC<{ position?: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <T g={G.cyl(0.045, 0.036, 0.16, 14)} c="#c89a6a" position={[0, 0.08, 0]} />
    <T g={G.cyl(0.047, 0.047, 0.03, 14)} c="#f0e8dc" position={[0, 0.15, 0]} o={2} />
    <T g={G.cyl(0.005, 0.005, 0.12, 6)} c="#2a8a4a" position={[0.015, 0.2, 0]} rotation={[0, 0, 0.15]} o={false} />
  </group>
);
export const Marker: React.FC<{ position?: Vec3; rotation?: Vec3; c?: string }> = ({ position, rotation, c = "#2a5aa8" }) => (
  <group position={position} rotation={rotation}>
    <T g={G.cyl(0.014, 0.014, 0.13, 8)} c="#f4f4f4" o={2} />
    <T g={G.cyl(0.015, 0.015, 0.04, 8)} c={c} position={[0, 0.07, 0]} o={2} />
  </group>
);
/** kalender sobek; page = nomor hari yang tampil */
export const Calendar: React.FC<{ position?: Vec3; rotation?: Vec3; day: string; label?: string; scale?: number }> = ({ position, rotation, day, label = "NOV", scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(0.32, 0.4, 0.03)} c="#e8e2d4" />
    <CanvasPlane
      w={0.3}
      h={0.38}
      px={300}
      o={false}
      position={[0, 0, 0.017]}
      drawKey={`cal${day}${label}`}
      draw={(c, W, H) => {
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#d23a3a";
        c.fillRect(0, 0, W, H * 0.24);
        c.fillStyle = "#fff";
        c.font = `900 ${H * 0.13}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText(label, W / 2, H * 0.17);
        c.fillStyle = "#1a1a2a";
        c.font = `900 ${H * 0.42}px Inter, sans-serif`;
        c.fillText(day, W / 2, H * 0.72);
      }}
    />
    <T g={G.box(0.32, 0.03, 0.04)} c="#2a2a30" position={[0, 0.2, 0]} o={2} />
  </group>
);
/** gelembung chat 3D (untuk hologram grup) */
export const ChatBubble: React.FC<{ position?: Vec3; text: string; mine?: boolean; scale?: number; name?: string }> = ({ position, text, mine = false, scale = 1, name = "" }) => (
  <group position={position} scale={scale}>
    <CanvasPlane
      w={1.4}
      h={0.42}
      px={560}
      toon={false}
      o={3}
      drawKey={`chat${text}${name}${mine}`}
      draw={(c, W, H) => {
        c.fillStyle = mine ? "#d8f8c8" : "#ffffff";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#2a8a5a";
        c.font = `800 ${H * 0.2}px Inter, sans-serif`;
        c.fillText(name, W * 0.05, H * 0.28);
        c.fillStyle = "#1a1a22";
        c.font = `800 ${H * 0.32}px Inter, sans-serif`;
        c.fillText(text, W * 0.05, H * 0.72);
      }}
    />
  </group>
);

/* ---------------- ruang kelas ---------------- */
export const Whiteboard: React.FC<{ position?: Vec3; text?: string[]; reveal?: number }> = ({ position, text = ["TUGAS KELOMPOK", "DEADLINE: JUMAT"], reveal = 1 }) => {
  const n = Math.floor(text.join("").length * reveal);
  return (
    <group position={position}>
      <T g={G.box(3.2, 1.5, 0.06)} c="#d8dce0" />
      <CanvasPlane
        w={3.05}
        h={1.36}
        px={900}
        toon={false}
        o={false}
        position={[0, 0, 0.032]}
        drawKey={`wb${n}`}
        draw={(c, W, H) => {
          c.fillStyle = "#fbfcfd";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#1e4aa8";
          c.font = `900 ${H * 0.2}px "Comic Sans MS", Inter, sans-serif`;
          let left = n;
          text.forEach((t, i) => {
            const s = t.slice(0, Math.max(0, left));
            left -= t.length;
            c.fillStyle = i === 1 ? "#d22a2a" : "#1e4aa8";
            c.fillText(s, W * 0.06, H * (0.35 + i * 0.32));
          });
        }}
      />
      <T g={G.box(3.2, 0.05, 0.14)} c="#9aa0a8" position={[0, -0.78, 0.06]} o={2} />
    </group>
  );
};
export const DeskChair: React.FC<{ position?: Vec3; rotation?: Vec3; bag?: string }> = ({ position, rotation, bag }) => (
  <group position={position} rotation={rotation}>
    <T g={G.box(0.6, 0.04, 0.4)} c="#c89a62" position={[0, 0.74, 0.1]} />
    <T g={G.box(0.45, 0.04, 0.42)} c="#3a5a8a" position={[0, 0.45, -0.15]} />
    <T g={G.box(0.45, 0.42, 0.04)} c="#3a5a8a" position={[0, 0.68, -0.37]} />
    {[
      [-0.2, -0.33],
      [0.2, -0.33],
      [-0.2, 0.05],
      [0.2, 0.05],
    ].map(([x, z], i) => (
      <T key={i} g={G.cyl(0.018, 0.018, 0.45, 6)} c="#3a3a40" position={[x, 0.22, z]} o={2} />
    ))}
    <T g={G.cyl(0.02, 0.02, 0.3, 6)} c="#3a3a40" position={[0.28, 0.6, 0.1]} o={2} />
    {bag ? <T g={G.rbox(0.3, 0.34, 0.16, 0.4)} c={bag} position={[0.05, 0.62, -0.3]} rotation={[0.3, 0, 0]} /> : null}
  </group>
);
export const ClassroomSet: React.FC<{ fan?: number; board?: string[]; reveal?: number; slide?: boolean; grades?: number }> = ({ fan = 0, board, reveal = 1, slide = false, grades = 0 }) => (
  <group>
    <T g={G.box(14, 0.1, 12)} c="#c8c0b0" position={[0, -0.05, 0]} o={false} />
    {Array.from({ length: 14 }).map((_, i) => (
      <T key={i} g={G.box(0.02, 0.004, 12)} c="#b0a896" position={[-7 + i, 0.002, 0]} o={false} />
    ))}
    <T g={G.box(14, 3.6, 0.12)} c="#e8eef2" position={[0, 1.8, -3]} />
    <T g={G.box(14, 0.9, 0.14)} c="#7a9ab8" position={[0, 0.45, -2.97]} />
    <T g={G.box(0.12, 3.6, 12)} c="#dde6ec" position={[-4.5, 1.8, 0]} />
    <Whiteboard position={[-0.4, 1.75, -2.9]} text={board} reveal={reveal} />
    {/* layar proyektor */}
    <group position={[2.6, 2.0, -2.88]}>
      <T g={G.box(1.8, 1.25, 0.03)} c="#ffffff" emissive={slide ? "#ffffff" : "#000000"} ei={slide ? 0.25 : 0} />
      {slide ? (
        <CanvasPlane
          w={1.7}
          h={1.15}
          px={510}
          toon={false}
          o={false}
          position={[0, 0, 0.02]}
          drawKey="slide"
          draw={(c, W, H) => {
            c.fillStyle = "#f6f8fc";
            c.fillRect(0, 0, W, H);
            c.fillStyle = "#2a5aa8";
            c.fillRect(0, 0, W, H * 0.2);
            c.fillStyle = "#fff";
            c.font = `900 ${H * 0.12}px Inter, sans-serif`;
            c.fillText("HASIL KELOMPOK 3", W * 0.05, H * 0.14);
            const bars = [0.6, 0.85, 0.4, 0.95];
            bars.forEach((b, i) => {
              c.fillStyle = ["#e86a4a", "#4aa86a", "#e8b84a", "#4a8ae8"][i];
              c.fillRect(W * (0.1 + i * 0.2), H * (0.9 - b * 0.6), W * 0.12, H * b * 0.6);
            });
          }}
        />
      ) : null}
      <T g={G.box(1.9, 0.05, 0.06)} c="#3a3a40" position={[0, 0.66, 0.02]} o={2} />
    </group>
    {/* papan nilai */}
    {grades > 0 ? (
      <CanvasPlane
        w={1.3}
        h={1.2}
        px={520}
        toon={false}
        position={[-3.4, 1.8, -2.9]}
        drawKey={`grades${Math.round(grades * 5)}`}
        draw={(c, W, H) => {
          c.fillStyle = "#fffbe8";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#1a1a22";
          c.font = `900 ${H * 0.1}px Inter, sans-serif`;
          c.fillText("NILAI KELOMPOK 3", W * 0.06, H * 0.13);
          ["Dimas", "Rara", "Bayu", "Sari", "Joko"].forEach((n, i) => {
            c.fillStyle = "#2a2a30";
            c.font = `800 ${H * 0.09}px Inter, sans-serif`;
            c.fillText(n, W * 0.08, H * (0.3 + i * 0.15));
            if (i < Math.round(grades * 5)) {
              c.fillStyle = "#d22a2a";
              c.font = `900 ${H * 0.12}px Inter, sans-serif`;
              c.fillText("A", W * 0.75, H * (0.31 + i * 0.15));
            }
          });
        }}
      />
    ) : (
      <group position={[-3.4, 1.9, -2.9]}>
        <T g={G.box(1.0, 1.3, 0.03)} c="#f0d070" />
        <T g={G.box(0.8, 0.12, 0.04)} c="#d24a3a" position={[0, 0.4, 0]} o={false} />
      </group>
    )}
    {/* jam dinding & kipas */}
    <group position={[1.2, 3.1, -2.9]}>
      <T g={G.cyl(0.2, 0.2, 0.05, 22)} c="#2a2a30" rotation={[Math.PI / 2, 0, 0]} />
      <T g={G.cyl(0.17, 0.17, 0.06, 22)} c="#ffffff" rotation={[Math.PI / 2, 0, 0]} o={false} />
    </group>
    <group position={[0, 3.4, 0.5]} rotation={[0, fan, 0]}>
      <T g={G.cyl(0.1, 0.1, 0.1, 12)} c="#e8e8e8" />
      {[0, 1, 2].map((i) => (
        <T key={i} g={G.box(0.8, 0.02, 0.15)} c="#f0f0f0" position={[Math.cos((i * 2 * Math.PI) / 3) * 0.45, -0.03, Math.sin((i * 2 * Math.PI) / 3) * 0.45]} rotation={[0, (-i * 2 * Math.PI) / 3, 0]} />
      ))}
    </group>
    {/* jendela terang di dinding kiri */}
    {[-1.5, 1.0].map((z) => (
      <group key={z} position={[-4.42, 1.9, z]} rotation={[0, Math.PI / 2, 0]}>
        <T g={G.box(1.4, 1.3, 0.05)} c="#ffffff" />
        <T g={G.box(1.2, 1.1, 0.06)} c="#aee0ff" emissive="#9ad8ff" ei={0.5} o={false} />
      </group>
    ))}
    {/* deretan bangku */}
    {[-2.4, -0.8, 0.8].map((x) =>
      [0.4, 1.7, 3.0].map((z, j) => <DeskChair key={`${x}${z}`} position={[x, 0, z]} bag={j === 1 && x < 0 ? "#c8503a" : undefined} />)
    )}
    {/* meja dosen */}
    <group position={[2.8, 0, -1.6]}>
      <T g={G.box(1.4, 0.06, 0.7)} c="#8a5a32" position={[0, 0.76, 0]} />
      <T g={G.box(1.3, 0.72, 0.05)} c="#7a4a28" position={[0, 0.38, 0.32]} />
      <T g={G.box(0.3, 0.05, 0.4)} c="#3a6aa8" position={[-0.3, 0.81, 0]} o={2} />
      <Laptop position={[0.3, 0.79, 0]} rotation={[0, 0.4, 0]} scale={0.9} screenText="NILAI" />
    </group>
    {/* poster & tanaman */}
    <group position={[4.8, 1.9, -2.92]}>
      <T g={G.box(0.8, 1.1, 0.02)} c="#4aa8a8" />
      <T g={G.box(0.6, 0.15, 0.03)} c="#ffffff" position={[0, 0.35, 0]} o={false} />
    </group>
    <group position={[-3.9, 0, -2.4]}>
      <T g={G.cyl(0.22, 0.18, 0.4, 12)} c="#b8603a" position={[0, 0.2, 0]} />
      {[0, 1, 2, 3, 4].map((i) => (
        <T key={i} g={G.ico(0.22, 1)} c="#4a9a5a" position={[Math.cos(i) * 0.15, 0.6 + (i % 2) * 0.2, Math.sin(i) * 0.15]} />
      ))}
    </group>
  </group>
);

/* ---------------- kamar kos Dimas ---------------- */
export const KosSet: React.FC<{ night?: number; mugs?: number; noodles?: boolean }> = ({ night = 1, mugs = 1, noodles = true }) => (
  <group>
    <T g={G.box(8, 0.1, 7)} c="#c8a88a" position={[0, -0.05, 0]} o={false} />
    {Array.from({ length: 8 }).map((_, i) =>
      Array.from({ length: 7 }).map((__, j) => <T key={`${i}${j}`} g={G.box(0.98, 0.004, 0.98)} c={(i + j) % 2 ? "#d8c4a8" : "#cdb898"} position={[-3.5 + i, 0.002, -3 + j]} o={false} />)
    )}
    <T g={G.box(8, 3.2, 0.12)} c="#b8d0c0" position={[0, 1.6, -2.6]} />
    <T g={G.box(0.12, 3.2, 7)} c="#c8dcc8" position={[-3, 1.6, 0]} />
    {/* jendela: langit malam -> fajar */}
    <group position={[1.6, 1.9, -2.53]}>
      <T g={G.box(1.3, 1.2, 0.05)} c="#f4f4f0" />
      <T g={G.box(1.1, 1.0, 0.06)} c={night > 0.5 ? "#1a2a5a" : "#f8b878"} emissive={night > 0.5 ? "#2a3a7a" : "#ffb070"} ei={0.6} o={false} />
      {night > 0.5 ? <T g={G.sph(0.08, 12, 8)} c="#fff8d0" emissive="#fff4c0" ei={1} position={[0.3, 0.25, 0.04]} o={false} /> : null}
      <T g={G.box(0.04, 1.0, 0.08)} c="#f4f4f0" o={false} />
    </group>
    {/* kasur tipis + bantal + guling */}
    <group position={[-1.8, 0, -1.2]}>
      <T g={G.rbox(1.1, 0.22, 2.0, 0.3)} c="#e8e8f0" position={[0, 0.11, 0]} />
      <T g={G.box(1.1, 0.02, 1.5)} c="#5a8ad0" position={[0, 0.225, 0.25]} o={false} />
      <T g={G.rbox(0.6, 0.12, 0.35, 0.5)} c="#f8f8f8" position={[0, 0.28, -0.75]} />
      <T g={G.cap(0.1, 0.8, 10)} c="#e8d0a0" position={[0.35, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
    {/* meja belajar + lampu + rak buku */}
    <group position={[0.8, 0, -1.9]}>
      <T g={G.box(1.6, 0.05, 0.7)} c="#a87a4a" position={[0, 0.75, 0]} />
      {[-0.75, 0.75].map((x) => (
        <T key={x} g={G.box(0.05, 0.75, 0.65)} c="#8a5a32" position={[x, 0.375, 0]} />
      ))}
      <group position={[-0.6, 0.78, -0.15]}>
        <T g={G.cyl(0.08, 0.1, 0.03, 12)} c="#2a2a30" />
        <Limb a={[0, 0, 0]} b={[0.05, 0.38, 0]} r={0.015} c="#2a2a30" o={2} />
        <Limb a={[0.05, 0.38, 0]} b={[0.25, 0.42, 0.1]} r={0.015} c="#2a2a30" o={2} />
        <T g={G.cone(0.08, 0.12, 12)} c="#e8c040" position={[0.27, 0.38, 0.12]} rotation={[Math.PI, 0, 0]} emissive="#ffd060" ei={0.6} />
      </group>
      <pointLight position={[-0.3, 1.1, 0]} intensity={night > 0.5 ? 1.2 : 0.4} color="#ffd8a0" distance={4} />
      {Array.from({ length: Math.max(0, mugs) }).map((_, i) => (
        <Mug key={i} position={[0.35 + (i % 3) * 0.12, 0.78 + Math.floor(i / 3) * 0.0, -0.15 - Math.floor(i / 3) * 0.12]} full={i === mugs - 1 ? 0.6 : 0} c={["#f4f0e8", "#d84a3a", "#4a8ad8"][i % 3]} />
      ))}
      {noodles ? (
        <group position={[0.65, 0.78, 0.18]}>
          <T g={G.cyl(0.08, 0.06, 0.1, 14)} c="#f0e0c0" position={[0, 0.05, 0]} />
          <T g={G.cyl(0.082, 0.082, 0.02, 14)} c="#d23a2a" position={[0, 0.095, 0]} o={false} />
        </group>
      ) : null}
      <group position={[0, 1.7, -0.25]}>
        <T g={G.box(1.4, 0.04, 0.25)} c="#8a5a32" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <T key={i} g={G.box(0.1, 0.3, 0.2)} c={["#d24a3a", "#3a6ad8", "#e8b83a", "#4aa86a", "#8a4ad8", "#e86a9a", "#3a3a40"][i]} position={[-0.55 + i * 0.15, 0.17, 0]} rotation={[0, 0, i === 6 ? 0.3 : 0]} o={2} />
        ))}
      </group>
      <group position={[0.65, 0.78, -0.25]}>
        <T g={G.cyl(0.07, 0.07, 0.1, 14)} c="#d84a3a" position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <T g={G.cyl(0.055, 0.055, 0.11, 14)} c="#ffffff" position={[0, 0.06, 0.005]} rotation={[Math.PI / 2, 0, 0]} o={false} />
      </group>
    </group>
    {/* kursi belajar */}
    <group position={[0.6, 0, -1.2]}>
      <T g={G.box(0.5, 0.05, 0.5)} c="#3a3a40" position={[0, 0.48, 0]} />
      <T g={G.box(0.5, 0.5, 0.05)} c="#3a3a40" position={[0, 0.75, 0.25]} />
      <T g={G.cyl(0.03, 0.03, 0.45, 8)} c="#2a2a2a" position={[0, 0.23, 0]} />
    </group>
    {/* jemuran handuk, kipas angin, poster */}
    <group position={[-2.9, 0, 1.6]}>
      <Limb a={[0, 0, 0]} b={[0, 1.6, 0]} r={0.02} c="#9a9aa0" o={2} />
      <Limb a={[0, 1.6, -0.6]} b={[0, 1.6, 0.6]} r={0.02} c="#9a9aa0" o={2} />
      <T g={G.box(0.04, 0.7, 0.5)} c="#4ab8c8" position={[0.03, 1.25, 0.25]} />
      <T g={G.box(0.04, 0.5, 0.35)} c="#f0c040" position={[0.03, 1.35, -0.3]} />
    </group>
    <group position={[2.6, 0, -1.6]}>
      <T g={G.cyl(0.18, 0.2, 0.05, 14)} c="#e8e8e8" position={[0, 0.025, 0]} />
      <T g={G.cyl(0.02, 0.02, 0.9, 8)} c="#e8e8e8" position={[0, 0.47, 0]} />
      <T g={G.cyl(0.25, 0.25, 0.1, 18)} c="#5ab8e8" position={[0, 0.95, 0.03]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
    <group position={[-2.92, 2.0, -0.6]} rotation={[0, Math.PI / 2, 0]}>
      <T g={G.box(0.7, 0.95, 0.02)} c="#2a2a3a" />
      <T g={G.box(0.5, 0.12, 0.03)} c="#e8d040" position={[0, 0.3, 0]} o={false} />
    </group>
    <hemisphereLight args={night > 0.5 ? ["#8a9ad8", "#3a2a4a", 0.6] : ["#fff0d8", "#8a6a5a", 1.1]} />
  </group>
);

/* ---------------- kafe ---------------- */
export const CafeSet: React.FC = () => (
  <group>
    <T g={G.box(8, 0.1, 7)} c="#7a5a42" position={[0, -0.05, 0]} o={false} />
    <T g={G.box(8, 3.2, 0.12)} c="#e8d2b8" position={[0, 1.6, -2.6]} />
    {/* dinding bata aksen */}
    {Array.from({ length: 6 }).map((_, r) =>
      Array.from({ length: 6 }).map((__, c) => <T key={`${r}${c}`} g={G.box(0.5, 0.2, 0.03)} c={(r + c) % 2 ? "#b8643a" : "#a8542a"} position={[-2.6 + c * 0.55 + (r % 2) * 0.27, 1.0 + r * 0.24, -2.52]} o={false} />)
    )}
    <CanvasPlane
      w={1.3}
      h={0.5}
      px={420}
      toon={false}
      position={[1.6, 2.6, -2.52]}
      drawKey="kopi"
      draw={(c, W, H) => {
        c.fillStyle = "#2a2a30";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#ffd890";
        c.font = `900 ${H * 0.42}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText("KOPI SANTUY", W / 2, H * 0.65);
      }}
    />
    {/* lampu gantung */}
    {[-1.2, 0.6].map((x) => (
      <group key={x} position={[x, 2.3, -0.4]}>
        <Limb a={[0, 0.9, 0]} b={[0, 0.2, 0]} r={0.01} c="#2a2a2a" o={false} />
        <T g={G.cone(0.2, 0.22, 14, )} c="#2a2a30" position={[0, 0.1, 0]} />
        <T g={G.sph(0.07, 10, 8)} c="#fff0b0" emissive="#ffe090" ei={1.2} position={[0, 0, 0]} o={false} />
        <pointLight position={[0, -0.1, 0]} intensity={0.9} color="#ffd898" distance={3.5} />
      </group>
    ))}
    {/* meja bundar + kursi + minuman */}
    <group position={[-0.3, 0, -0.3]}>
      <T g={G.cyl(0.6, 0.6, 0.05, 24)} c="#c89a62" position={[0, 0.74, 0]} />
      <T g={G.cyl(0.05, 0.08, 0.72, 10)} c="#2a2a30" position={[0, 0.36, 0]} />
      <IcedCoffee position={[-0.25, 0.765, 0.1]} />
      <IcedCoffee position={[0.2, 0.765, 0.2]} />
      <IcedCoffee position={[0.05, 0.765, -0.25]} />
      <T g={G.rbox(0.3, 0.06, 0.25, 0.4)} c="#e8b060" position={[0.32, 0.79, -0.15]} o={2} />
    </group>
    {/* tanaman & rak */}
    <group position={[2.6, 0, -2.0]}>
      <T g={G.cyl(0.25, 0.2, 0.5, 12)} c="#e8e0d0" position={[0, 0.25, 0]} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <T key={i} g={G.cone(0.1, 0.8, 5)} c="#3a8a4a" position={[Math.cos(i) * 0.12, 0.85, Math.sin(i) * 0.12]} rotation={[Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5]} />
      ))}
    </group>
    <group position={[-2.4, 1.6, -2.45]}>
      <T g={G.box(1.2, 0.04, 0.25)} c="#5a3a22" />
      {[0, 1, 2, 3].map((i) => (
        <T key={i} g={G.cyl(0.07, 0.07, 0.2, 10)} c={["#3a2a1a", "#e8d0a0", "#8a4a2a", "#f4f0e8"][i]} position={[-0.45 + i * 0.3, 0.12, 0]} o={2} />
      ))}
    </group>
    <hemisphereLight args={["#ffe8c8", "#5a3a2a", 1.0]} />
  </group>
);

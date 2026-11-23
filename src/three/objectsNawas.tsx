// Properti "Powerbank Melahirkan" (Kang Nawas zaman now): kantor startup, ruang Pak Bos, benda yang dipegang.
import React from "react";
import { CanvasPlane, G, Limb, T, Vec3, XR } from "./toon";
import { Laptop, Mug } from "./objectsKelompok";

/* ================= benda kecil (objek terpisah, mengikuti tangan) ================= */

/** powerbank besar Pak Bos: hitam doff, 4 lampu indikator, logo petir */
export const Powerbank: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; charge?: number }> = ({ position, rotation, scale = 1, charge = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.14, 0.24, 0.045, 0.35)} c="#2a2c34" o={2} />
    <T g={G.box(0.1, 0.012, 0.004)} c="#4a4c56" position={[0, 0.1, 0.024]} o={false} />
    {[0, 1, 2, 3].map((i) => {
      const on = charge > i / 4 + 0.01;
      return <T key={i} g={G.sph(0.009, 8, 6)} c={on ? "#5aff9a" : "#3a3c44"} emissive={on ? "#3aff7a" : "#000000"} ei={on ? 1.4 : 0} position={[-0.03 + i * 0.02, -0.08, 0.024]} o={false} />;
    })}
    <CanvasPlane
      w={0.08}
      h={0.08}
      px={128}
      toon={false}
      o={false}
      position={[0, 0.01, 0.0235]}
      drawKey="pbBolt"
      draw={(c, W, H) => {
        c.clearRect(0, 0, W, H);
        c.fillStyle = "#ffd23f";
        c.beginPath();
        c.moveTo(W * 0.58, H * 0.05);
        c.lineTo(W * 0.22, H * 0.55);
        c.lineTo(W * 0.48, H * 0.55);
        c.lineTo(W * 0.38, H * 0.95);
        c.lineTo(W * 0.8, H * 0.42);
        c.lineTo(W * 0.52, H * 0.42);
        c.closePath();
        c.fill();
      }}
    />
    {/* port USB di atas */}
    <T g={G.box(0.05, 0.006, 0.014)} c="#101014" position={[0, 0.121, 0]} o={false} />
  </group>
);

/** "bayi" powerbank: mini, pink, pita, dot bayi, kain bedong opsional */
export const BabyPowerbank: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; swaddle?: boolean }> = ({ position, rotation, scale = 1, swaddle = false }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.075, 0.12, 0.03, 0.45)} c="#f6a8c8" o={2} />
    {[0, 1].map((i) => (
      <T key={i} g={G.sph(0.006, 8, 6)} c="#5aff9a" emissive="#3aff7a" ei={1.4} position={[-0.008 + i * 0.016, -0.04, 0.016]} o={false} />
    ))}
    {/* dot bayi */}
    <T g={G.cyl(0.018, 0.018, 0.006, 14)} c="#7ad0ff" position={[0, 0.005, 0.018]} rotation={[Math.PI / 2, 0, 0]} o={2} />
    <T g={G.sph(0.009, 10, 8)} c="#fff2c8" position={[0, 0.005, 0.026]} o={false} />
    {/* pita di atas */}
    <T g={G.cone(0.02, 0.03, 8)} c="#ff4a8a" position={[-0.017, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} o={2} />
    <T g={G.cone(0.02, 0.03, 8)} c="#ff4a8a" position={[0.017, 0.07, 0]} rotation={[0, 0, -Math.PI / 2]} o={2} />
    <T g={G.sph(0.009, 8, 6)} c="#ff2a6a" position={[0, 0.07, 0]} o={false} />
    {swaddle ? <T g={G.cyl(0.05, 0.055, 0.08, 16)} c="#fff4e0" position={[0, -0.035, 0]} o={2} /> : null}
  </group>
);

/** HP terbaru Pak Bos: emas, 3 kamera; layar menampilkan baterai */
export const BossPhone: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; battery?: number; dead?: boolean }> = ({ position, rotation, scale = 1, battery = 100, dead = false }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.085, 0.17, 0.012, 0.3)} c="#d8b468" o={2} />
    {/* kamera tiga lensa di punggung */}
    {[
      [-0.022, 0.06],
      [0.0, 0.06],
      [-0.011, 0.04],
    ].map(([x, y], i) => (
      <T key={i} g={G.cyl(0.009, 0.009, 0.006, 12)} c="#1a1a20" position={[x, y, -0.008]} rotation={[Math.PI / 2, 0, 0]} o={false} />
    ))}
    <CanvasPlane
      w={0.074}
      h={0.152}
      px={160}
      toon={false}
      o={false}
      position={[0, 0, 0.0065]}
      drawKey={`bp${dead}${battery}`}
      draw={(c, W, H) => {
        if (dead) {
          c.fillStyle = "#08080a";
          c.fillRect(0, 0, W, H);
          return;
        }
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#3a6ad8");
        g.addColorStop(1, "#8a4ad8");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#ffffff";
        c.font = `900 ${W * 0.28}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText("09:41", W / 2, H * 0.3);
        // ikon baterai
        const bw = W * 0.5,
          bh = H * 0.07,
          bx = (W - bw) / 2,
          by = H * 0.6;
        c.strokeStyle = "#fff";
        c.lineWidth = 3;
        c.strokeRect(bx, by, bw, bh);
        c.fillStyle = battery <= 5 ? "#ff3a3a" : "#5aff8a";
        c.fillRect(bx + 3, by + 3, (bw - 6) * (battery / 100), bh - 6);
        c.fillStyle = "#fff";
        c.font = `800 ${W * 0.16}px Inter, sans-serif`;
        c.fillText(`${battery}%`, W / 2, by + bh + H * 0.1);
      }}
    />
  </group>
);

/** HP butut Kang Nawas: retak di pojok, baterai 1% */
export const NawasPhone: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; battery?: number }> = ({ position, rotation, scale = 1, battery = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.rbox(0.08, 0.16, 0.014, 0.3)} c="#3a6a4a" o={2} />
    <CanvasPlane
      w={0.068}
      h={0.14}
      px={150}
      toon={false}
      o={false}
      position={[0, 0, 0.0075]}
      drawKey={`np${battery}`}
      draw={(c, W, H) => {
        c.fillStyle = "#1a1a22";
        c.fillRect(0, 0, W, H);
        c.fillStyle = battery <= 5 ? "#ff3a3a" : "#5aff8a";
        c.font = `900 ${W * 0.34}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText(`${battery}%`, W / 2, H * 0.55);
        // retakan
        c.strokeStyle = "rgba(255,255,255,0.7)";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(W * 0.95, H * 0.02);
        c.lineTo(W * 0.7, H * 0.16);
        c.lineTo(W * 0.78, H * 0.26);
        c.moveTo(W * 0.7, H * 0.16);
        c.lineTo(W * 0.55, H * 0.12);
        c.stroke();
      }}
    />
  </group>
);

/** kabel cas USB menjuntai (dari a ke b, melengkung ke bawah) */
export const Cable: React.FC<{ a: Vec3; b: Vec3; sag?: number; c?: string }> = ({ a, b, sag = 0.15, c = "#f4f4f4" }) => {
  const n = 8;
  const pts: Vec3[] = Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(Math.PI * k) * sag, a[2] + (b[2] - a[2]) * k];
  });
  return (
    <group>
      {pts.slice(1).map((p, i) => (
        <Limb key={i} a={pts[i]} b={p} r={0.006} c={c} o={false} />
      ))}
    </group>
  );
};

/** lilin kecil (dipegang rekan kantor saat "melayat" HP) */
export const Candle: React.FC<{ position?: Vec3; scale?: number; flicker?: number }> = ({ position, scale = 1, flicker = 0 }) => (
  <group position={position} scale={scale}>
    <T g={G.cyl(0.018, 0.018, 0.12, 10)} c="#f8f4e8" position={[0, 0.06, 0]} o={2} />
    <T g={G.cone(0.012, 0.04 + Math.sin(flicker) * 0.006, 8)} c="#ffcc40" emissive="#ff9a20" ei={1.6} position={[0, 0.14, 0]} o={false} />
    <pointLight position={[0, 0.16, 0]} intensity={0.25} distance={0.9} color="#ffb860" />
  </group>
);

/** "makam" HP: kotak dus HP sebagai peti, bunga tabur, foto HP berbingkai, papan nisan kecil */
export const PhoneGrave: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(0.5, 0.06, 0.32)} c="#7a5a3a" position={[0, 0.03, 0]} />
    <T g={G.box(0.3, 0.08, 0.18)} c="#f4f4f4" position={[0, 0.1, 0]} />
    <T g={G.box(0.3, 0.012, 0.18)} c="#d8b468" position={[0, 0.146, 0]} o={false} />
    {Array.from({ length: 14 }).map((_, i) => (
      <T key={i} g={G.sph(0.016, 6, 5)} c={["#ff4a6a", "#ffd23f", "#ffffff", "#ff8ab0"][i % 4]} position={[-0.2 + ((i * 37) % 40) / 100, 0.07, -0.12 + ((i * 53) % 24) / 100]} o={false} />
    ))}
    <CanvasPlane
      w={0.16}
      h={0.2}
      px={160}
      toon={false}
      o={2}
      position={[0, 0.25, -0.13]}
      rotation={[-0.15, 0, 0]}
      drawKey="nisan"
      draw={(c, W, H) => {
        c.fillStyle = "#2a2a30";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#ffffff";
        c.font = `900 ${W * 0.13}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText("RIP", W / 2, H * 0.22);
        c.fillStyle = "#d8b468";
        c.fillRect(W * 0.32, H * 0.3, W * 0.36, H * 0.42);
        c.fillStyle = "#3a6ad8";
        c.fillRect(W * 0.36, H * 0.34, W * 0.28, H * 0.34);
        c.fillStyle = "#ffffff";
        c.font = `800 ${W * 0.09}px Inter, sans-serif`;
        c.fillText("HP Pak Bos", W / 2, H * 0.86);
      }}
    />
  </group>
);

/* ================= tanda / papan teks ================= */
export const Sign: React.FC<{ position?: Vec3; rotation?: Vec3; w?: number; h?: number; lines: string[]; bg?: string; fg?: string; peel?: number }> = ({
  position,
  rotation,
  w = 0.7,
  h = 0.4,
  lines,
  bg = "#fff6c8",
  fg = "#c81e1e",
  peel = 0,
}) => (
  <group position={position} rotation={[(rotation?.[0] ?? 0) + peel * 0.6, rotation?.[1] ?? 0, (rotation?.[2] ?? 0) + peel * 0.5]}>
    <CanvasPlane
      w={w}
      h={h}
      px={420}
      toon={false}
      o={2}
      drawKey={`sign${lines.join("|")}${bg}`}
      draw={(c, W, H) => {
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);
        c.fillStyle = fg;
        c.textAlign = "center";
        const n = lines.length;
        lines.forEach((l, i) => {
          c.font = `900 ${(H / (n + 0.6)) * (i === 0 ? 0.78 : 0.6)}px Inter, sans-serif`;
          c.fillText(l, W / 2, (H * (i + 0.85)) / (n + 0.25));
        });
      }}
    />
  </group>
);

/* ================= tanaman & perabot kecil ================= */
export const Plant: React.FC<{ position: Vec3; s?: number }> = ({ position, s = 1 }) => (
  <group position={position} scale={s}>
    <T g={G.cyl(0.2, 0.15, 0.4, 12)} c="#f0ece4" position={[0, 0.2, 0]} />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <T key={i} g={G.cone(0.09, 0.7, 5)} c={i % 2 ? "#3a8a4a" : "#2a7a3a"} position={[Math.cos(i * 0.9) * 0.1, 0.7, Math.sin(i * 0.9) * 0.1]} rotation={[Math.sin(i * 0.9) * 0.5, 0, Math.cos(i * 0.9) * 0.5]} />
    ))}
  </group>
);
const OfficeChair: React.FC<{ position: Vec3; rotation?: Vec3; c?: string }> = ({ position, rotation, c = "#2a2c34" }) => (
  <group position={position} rotation={rotation}>
    <T g={G.rbox(0.46, 0.08, 0.44, 0.4)} c={c} position={[0, 0.48, 0]} />
    <T g={G.rbox(0.44, 0.52, 0.07, 0.4)} c={c} position={[0, 0.8, -0.22]} rotation={[-0.1, 0, 0]} />
    <T g={G.cyl(0.03, 0.03, 0.4, 8)} c="#8a8c94" position={[0, 0.26, 0]} />
    {[0, 1, 2, 3, 4].map((i) => (
      <T key={i} g={G.box(0.3, 0.03, 0.04)} c="#3a3c44" position={[Math.cos((i * Math.PI * 2) / 5) * 0.14, 0.05, Math.sin((i * Math.PI * 2) / 5) * 0.14]} rotation={[0, -(i * Math.PI * 2) / 5, 0]} o={2} />
    ))}
  </group>
);
const Monitor: React.FC<{ position: Vec3; rotation?: Vec3; screen?: string }> = ({ position, rotation, screen = "#4a8ad8" }) => (
  <group position={position} rotation={rotation}>
    <T g={G.box(0.56, 0.34, 0.03)} c="#1e2028" position={[0, 0.3, 0]} />
    <T g={G.box(0.52, 0.3, 0.004)} c={screen} emissive={screen} ei={0.35} position={[0, 0.3, 0.017]} o={false} />
    <T g={G.box(0.04, 0.14, 0.04)} c="#3a3c44" position={[0, 0.08, -0.02]} o={2} />
    <T g={G.box(0.2, 0.015, 0.14)} c="#3a3c44" position={[0, 0.008, -0.02]} o={2} />
  </group>
);

/** stopkontak dinding + charger yang berderet */
export const PowerStrip: React.FC<{ position: Vec3; locked?: boolean }> = ({ position, locked = true }) => (
  <group position={position}>
    <T g={G.box(0.5, 0.09, 0.05)} c="#f4f4f4" />
    {[0, 1, 2, 3].map((i) => (
      <T key={i} g={G.cyl(0.022, 0.022, 0.01, 12)} c="#c8c8c8" position={[-0.18 + i * 0.12, 0, 0.028]} rotation={[Math.PI / 2, 0, 0]} o={false} />
    ))}
    {locked ? (
      <group position={[0, 0, 0.06]}>
        <T g={G.box(0.54, 0.13, 0.03)} c="#9aa0a8" o={2} />
        <T g={G.box(0.06, 0.06, 0.03)} c="#d8a830" position={[0, -0.09, 0.01]} o={2} />
        <T g={G.tor(0.022, 0.007, 6, 12, Math.PI)} c="#c8c8d0" position={[0, -0.055, 0.01]} o={false} />
      </group>
    ) : null}
  </group>
);

/* ================= LOKASI 1: ruang kerja kantor startup (siang) ================= */
export const OpenOfficeSet: React.FC<{ signPeel?: number; freeSign?: number; sign?: boolean; locked?: boolean }> = ({ signPeel = 0, freeSign = 0, sign = true, locked = true }) => (
  <group>
    {/* lantai vinyl kayu muda + karpet abu */}
    <T g={G.box(9, 0.1, 7)} c="#d8c0a0" position={[0, -0.05, 0]} o={false} />
    {Array.from({ length: 18 }).map((_, i) => (
      <T key={i} g={G.box(0.015, 0.004, 7)} c="#c4a884" position={[-4.5 + i * 0.5, 0.002, 0]} o={false} />
    ))}
    <T g={G.box(3.6, 0.012, 2.2)} c="#8a94a4" position={[0, 0.006, 0.3]} o={2} />
    {/* dinding belakang: putih + aksen kuning, bata putih sebagian */}
    <T g={G.box(9, 3.4, 0.12)} c="#f4f2ec" position={[0, 1.7, -2.6]} />
    <T g={G.box(3.2, 3.4, 0.14)} c="#ffd23f" position={[-2.6, 1.7, -2.58]} />
    <T g={G.box(0.12, 3.4, 7)} c="#ece8de" position={[-4.0, 1.7, 0]} />
    {/* logo perusahaan */}
    <Sign position={[-2.6, 2.45, -2.5]} w={2.2} h={0.6} lines={["PT. HEMAT JAYA", "startup paling efisien"]} bg="#ffd23f" fg="#1e2240" />
    {/* jendela kaca besar dengan gedung kota */}
    <group position={[1.6, 1.85, -2.52]}>
      <T g={G.box(2.8, 1.9, 0.05)} c="#2a2c34" />
      <CanvasPlane
        w={2.7}
        h={1.8}
        px={540}
        toon={false}
        o={false}
        position={[0, 0, 0.03]}
        drawKey="kota"
        draw={(c, W, H) => {
          const g = c.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, "#8ac8ff");
          g.addColorStop(1, "#d8f0ff");
          c.fillStyle = g;
          c.fillRect(0, 0, W, H);
          const bs = [0.08, 0.2, 0.33, 0.47, 0.6, 0.74, 0.88];
          bs.forEach((x, i) => {
            const h = H * (0.35 + ((i * 37) % 40) / 100);
            c.fillStyle = ["#7a8ab0", "#9aa8c8", "#6a7aa0", "#8a9ac0"][i % 4];
            c.fillRect(W * x - W * 0.06, H - h, W * 0.11, h);
            c.fillStyle = "rgba(255,255,255,0.55)";
            for (let r = 0; r < 12; r++) for (let k = 0; k < 3; k++) c.fillRect(W * x - W * 0.05 + k * W * 0.033, H - h + 10 + r * 18, W * 0.02, 8);
          });
        }}
      />
      {[-0.9, 0, 0.9].map((x) => (
        <T key={x} g={G.box(0.04, 1.85, 0.06)} c="#2a2c34" position={[x, 0, 0.03]} o={false} />
      ))}
    </group>
    {/* stopkontak terkunci + papan "cas berbayar" (di dinding kuning, bisa dijangkau) */}
    <PowerStrip position={[-2.5, 0.95, -2.5]} locked={locked} />
    {sign ? (
      freeSign > 0 ? (
        <Sign position={[-2.5, 1.4, -2.48]} w={0.8} h={0.42} lines={["CAS GRATIS", "untuk semua"]} bg="#d8ffd8" fg="#1a7a3a" />
      ) : (
        <Sign position={[-2.5, 1.4, -2.48]} w={0.8} h={0.42} lines={["CAS HP", "Rp2.000/JAM"]} peel={signPeel} />
      )
    ) : null}
    {/* meja kerja panjang bersama (benching) */}
    <group position={[0.2, 0, -1.2]}>
      <T g={G.box(3.2, 0.05, 0.9)} c="#f4f0e8" position={[0, 0.74, 0]} />
      {[-1.5, 1.5].map((x) => (
        <T key={x} g={G.box(0.05, 0.72, 0.8)} c="#2a2c34" position={[x, 0.37, 0]} />
      ))}
      <T g={G.box(3.1, 0.3, 0.03)} c="#9ac8b8" position={[0, 0.92, -0.05]} o={2} />
      <Monitor position={[-1.0, 0.765, -0.25]} />
      <Monitor position={[0.2, 0.765, -0.25]} screen="#e8a84a" />
      <Laptop position={[1.1, 0.765, 0.05]} rotation={[0, -0.3, 0]} screenText="LAPORAN" />
      <Mug position={[-0.55, 0.765, 0.15]} c="#ffd23f" />
      <Mug position={[0.75, 0.765, 0.2]} c="#e84a4a" full={0.3} />
      {/* tumpukan map */}
      {[0, 1, 2].map((i) => (
        <T key={i} g={G.box(0.3, 0.025, 0.22)} c={["#4a8ad8", "#e84a4a", "#3aa86a"][i]} position={[-1.35, 0.78 + i * 0.026, 0.15]} rotation={[0, i * 0.1, 0]} o={2} />
      ))}
    </group>
    <OfficeChair position={[-0.8, 0, -0.45]} rotation={[0, Math.PI, 0]} />
    <OfficeChair position={[0.6, 0, -0.45]} rotation={[0, Math.PI + 0.3, 0]} c="#3a5a8a" />
    {/* bean bag + dispenser + papan tulis */}
    <T g={G.sph(0.42, 20, 14)} c="#e8643a" position={[-3.2, 0.3, 0.6]} scale={[1, 0.7, 1]} />
    <group position={[3.4, 0, -1.9]}>
      <T g={G.box(0.4, 1.0, 0.4)} c="#e8eef4" position={[0, 0.5, 0]} />
      <T g={G.cyl(0.16, 0.16, 0.4, 14)} c="#8ad0ff" position={[0, 1.2, 0]} o={2} />
      <T g={G.box(0.06, 0.04, 0.04)} c="#e84a4a" position={[-0.08, 0.75, 0.22]} o={false} />
      <T g={G.box(0.06, 0.04, 0.04)} c="#4a8ad8" position={[0.08, 0.75, 0.22]} o={false} />
    </group>
    <group position={[-3.92, 1.6, -0.6]} rotation={[0, Math.PI / 2, 0]}>
      <T g={G.box(1.5, 0.95, 0.04)} c="#ffffff" />
      <Sign position={[0, 0, 0.03]} w={1.4} h={0.85} lines={["TARGET Q4", "HEMAT LISTRIK 90%", "— Pak Bos"]} bg="#ffffff" fg="#2a5aa8" />
    </group>
    <Plant position={[3.4, 0, 0.6]} />
    <Plant position={[-3.4, 0, -2.0]} s={0.8} />
    {/* lampu panel di plafon */}
    {[-1.5, 1.5].map((x) => (
      <T key={x} g={G.box(1.2, 0.03, 0.3)} c="#ffffff" emissive="#ffffff" ei={0.6} position={[x, 3.2, -0.5]} o={false} />
    ))}
    <hemisphereLight args={["#ffffff", "#c8b8a0", 0.6]} />
  </group>
);

/* ================= LOKASI 2: ruang Pak Bos (siang) ================= */
export const BossRoomSet: React.FC<{ safeOpen?: number }> = ({ safeOpen = 0 }) => (
  <group>
    {/* lantai marmer krem + karpet merah tebal */}
    <T g={G.box(8, 0.1, 6.5)} c="#e8dcc8" position={[0, -0.05, 0]} o={false} />
    {Array.from({ length: 8 }).map((_, i) => (
      <T key={i} g={G.box(0.012, 0.004, 6.5)} c="#d0c0a8" position={[-4 + i, 0.002, 0]} o={false} />
    ))}
    <T g={G.box(3.0, 0.014, 2.0)} c="#9a2a2a" position={[0, 0.007, 0.4]} o={2} />
    <T g={G.box(2.7, 0.016, 1.7)} c="#b83a3a" position={[0, 0.009, 0.4]} o={false} />
    {/* dinding panel kayu gelap */}
    <T g={G.box(8, 3.4, 0.12)} c="#5a3a24" position={[0, 1.7, -2.5]} />
    {Array.from({ length: 7 }).map((_, i) => (
      <T key={i} g={G.box(0.04, 3.2, 0.03)} c="#4a2e1a" position={[-3 + i, 1.7, -2.43]} o={false} />
    ))}
    <T g={G.box(0.12, 3.4, 6.5)} c="#6a4630" position={[-3.6, 1.7, 0]} />
    {/* foto Pak Bos berbingkai emas + piagam */}
    <group position={[0, 2.3, -2.42]}>
      <T g={G.box(0.9, 1.05, 0.05)} c="#d8b040" />
      <Sign position={[0, 0, 0.03]} w={0.78} h={0.92} lines={["😎", "PAK BOS", "Pendiri"]} bg="#f4ecd8" fg="#5a3a24" />
    </group>
    <group position={[-1.5, 2.2, -2.42]}>
      <T g={G.box(0.7, 0.5, 0.04)} c="#2a2a30" />
      <Sign position={[0, 0, 0.025]} w={0.62} h={0.42} lines={["PIAGAM", "Bos Terhemat", "5 Tahun Berturut"]} bg="#fff8e0" fg="#8a6a1a" />
    </group>
    {/* jam dinding */}
    <group position={[1.6, 2.5, -2.42]}>
      <T g={G.cyl(0.22, 0.22, 0.05, 24)} c="#f4f4f4" rotation={[Math.PI / 2, 0, 0]} />
      <T g={G.box(0.02, 0.15, 0.01)} c="#1a1a1a" position={[0, 0.06, 0.03]} o={false} />
      <T g={G.box(0.1, 0.02, 0.01)} c="#1a1a1a" position={[0.05, 0, 0.03]} o={false} />
    </group>
    {/* meja bos besar dari kayu, kursi kulit tinggi */}
    <group position={[0, 0, -1.2]}>
      <T g={G.box(2.0, 0.08, 0.9)} c="#6a3a1a" position={[0, 0.78, 0]} />
      <T g={G.box(1.95, 0.72, 0.06)} c="#5a2e14" position={[0, 0.38, 0.4]} />
      <T g={G.box(0.5, 0.74, 0.8)} c="#5a2e14" position={[-0.72, 0.37, 0]} />
      <T g={G.box(0.5, 0.74, 0.8)} c="#5a2e14" position={[0.72, 0.37, 0]} />
      {/* papan nama, kalkulator, celengan, koin */}
      <Sign position={[0, 0.88, 0.38]} rotation={[-0.4, 0, 0]} w={0.5} h={0.1} lines={["DIREKTUR UTAMA"]} bg="#2a2a30" fg="#d8b040" />
      <group position={[0.55, 0.83, 0.1]}>
        <T g={G.box(0.16, 0.025, 0.22)} c="#3a3c44" />
        <T g={G.box(0.12, 0.004, 0.05)} c="#a8d8a8" emissive="#6aa86a" ei={0.3} position={[0, 0.014, -0.07]} o={false} />
      </group>
      <group position={[-0.55, 0.82, 0.05]}>
        <T g={G.sph(0.12, 16, 12)} c="#f6a8c8" scale={[1.2, 1, 1]} position={[0, 0.1, 0]} />
        <T g={G.cone(0.04, 0.06, 6)} c="#f6a8c8" position={[0.15, 0.12, 0]} rotation={[0, 0, -Math.PI / 2]} o={2} />
      </group>
      {Array.from({ length: 6 }).map((_, i) => (
        <T key={i} g={G.cyl(0.03, 0.03, 0.008, 12)} c="#d8b040" position={[-0.2 + (i % 3) * 0.08, 0.825 + Math.floor(i / 3) * 0.009, 0.12]} o={false} />
      ))}
      <Laptop position={[0.05, 0.82, -0.1]} screenText="KEUNTUNGAN" />
    </group>
    <group position={[0, 0, -2.0]}>
      <T g={G.rbox(0.7, 0.12, 0.6, 0.4)} c="#2a1a14" position={[0, 0.5, 0]} />
      <T g={G.rbox(0.7, 1.1, 0.14, 0.4)} c="#2a1a14" position={[0, 1.1, -0.26]} />
    </group>
    {/* brankas di pojok (tempat charger & powerbank dikunci) */}
    <group position={[2.4, 0, -1.9]}>
      <T g={G.box(0.7, 0.9, 0.6)} c="#4a5058" position={[0, 0.45, 0]} />
      <group position={[-0.35, 0.45, 0.31]} rotation={[0, -safeOpen * 1.6, 0]}>
        <T g={G.box(0.66, 0.84, 0.05)} c="#5a6068" position={[0.33, 0, 0]} />
        <T g={G.cyl(0.08, 0.08, 0.04, 16)} c="#c8c8d0" position={[0.33, 0.05, 0.04]} rotation={[Math.PI / 2, 0, 0]} o={2} />
      </group>
    </group>
    {/* sofa tamu + tanaman */}
    <group position={[-2.6, 0, 0.5]} rotation={[0, Math.PI / 2, 0]}>
      <T g={G.rbox(1.4, 0.4, 0.6, 0.4)} c="#3a2a24" position={[0, 0.3, 0]} />
      <T g={G.rbox(1.4, 0.5, 0.18, 0.4)} c="#3a2a24" position={[0, 0.65, -0.26]} />
    </group>
    <Plant position={[3.0, 0, 0.4]} s={1.1} />
    {/* lampu gantung kuning */}
    <group position={[0, 3.2, -0.8]}>
      <T g={G.cone(0.3, 0.2, 16)} c="#d8b040" />
      <pointLight position={[0, -0.3, 0]} intensity={1.0} color="#ffe0a0" distance={6} />
    </group>
    <hemisphereLight args={["#fff0d8", "#5a3a2a", 0.6]} />
  </group>
);

/* ================= hologram "makam HP" (gaya X-ray Perang Emu) ================= */
/** t = waktu (detik) untuk animasi: arwah HP naik-turun, lingkaran proyektor berputar, kelopak melayang */
export const HoloPhoneGrave: React.FC<{ position?: Vec3; scale?: number; t?: number }> = ({ position, scale = 1, t = 0 }) => {
  const float = Math.sin(t * 2) * 0.04;
  return (
    <group position={position} scale={scale}>
      {/* alas proyektor hologram: piringan gelap + cincin bercahaya berlapis */}
      <T g={G.cyl(0.78, 0.84, 0.08, 40)} c="#16263e" position={[0, 0.04, 0]} />
      <T g={G.cyl(0.62, 0.62, 0.012, 40)} c="#1a6a9a" emissive="#2a9ad8" ei={0.5} position={[0, 0.086, 0]} o={false} />
      {[0.7, 0.5].map((r, i) => (
        <mesh key={r} position={[0, 0.1 + i * 0.01, 0]} rotation={[Math.PI / 2, 0, t * (i ? -0.8 : 0.5)]}>
          <torusGeometry args={[r, 0.008, 6, 64, Math.PI * 1.6]} />
          <meshBasicMaterial color="#8ae8ff" toneMapped={false} />
        </mesh>
      ))}
      {/* sorot cahaya proyektor ke atas */}
      <XR g={G.cyl(0.5, 0.62, 1.9, 32, true)} position={[0, 1.05, 0]} color="#3ab8ff" edges={false} />

      {/* peti = dus HP versi X-ray (heksagonal seperti peti) */}
      <group position={[0, 0.32, 0]} rotation={[0, 0.5, 0]}>
        <XR g={G.cyl(0.3, 0.24, 0.24, 6)} scale={[1, 1, 0.55]} color="#5fd4ff" />
        {/* HP di dalam peti: layar mati, baterai 0% merah */}
        <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <T g={G.rbox(0.17, 0.34, 0.025, 0.3)} c="#d8b468" o={2} />
          <CanvasPlane
            w={0.15}
            h={0.31}
            px={160}
            toon={false}
            o={false}
            position={[0, 0, 0.014]}
            drawKey="holoDead"
            draw={(c, W, H) => {
              c.fillStyle = "#06080c";
              c.fillRect(0, 0, W, H);
              const bw = W * 0.56,
                bh = H * 0.12,
                bx = (W - bw) / 2,
                by = H * 0.4;
              c.strokeStyle = "#ff3a3a";
              c.lineWidth = 5;
              c.strokeRect(bx, by, bw, bh);
              c.fillStyle = "#ff3a3a";
              c.fillRect(bx + bw, by + bh * 0.3, 7, bh * 0.4);
              c.font = `900 ${W * 0.2}px Inter, sans-serif`;
              c.textAlign = "center";
              c.fillText("0%", W / 2, by + bh + H * 0.12);
            }}
          />
        </group>
      </group>

      {/* "arwah" HP melayang naik: HP transparan, sayap & lingkaran halo emas */}
      <group position={[0, 1.5 + float, 0.1]} rotation={[0, Math.sin(t) * 0.25, 0.08]}>
        <XR g={G.rbox(0.2, 0.4, 0.03, 0.3)} color="#e8f8ff" />
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
          <torusGeometry args={[0.1, 0.014, 8, 32]} />
          <meshBasicMaterial color="#ffd85a" toneMapped={false} />
        </mesh>
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.15, 0.06, -0.02]} rotation={[0, 0, sd * (0.35 + Math.sin(t * 6) * 0.2)]}>
            <XR g={G.sph(0.14, 16, 10)} position={[sd * 0.1, 0, 0]} scale={[1, 0.45, 0.15]} color="#bfefff" />
          </group>
        ))}
      </group>

      {/* nisan hologram melayang di belakang */}
      <group position={[0, 0.72, -0.62]} scale={0.85}>
        <XR g={G.box(0.62, 0.78, 0.04)} color="#5fd4ff" />
        <CanvasPlane
          w={0.58}
          h={0.74}
          px={300}
          toon={false}
          o={false}
          alpha
          position={[0, 0, 0.03]}
          drawKey="holoNisan"
          draw={(c, W, H) => {
            c.clearRect(0, 0, W, H);
            c.textAlign = "center";
            c.shadowColor = "#5fd4ff";
            c.shadowBlur = 14;
            c.fillStyle = "#e8fbff";
            c.font = `900 ${W * 0.22}px Inter, sans-serif`;
            c.fillText("R.I.P", W / 2, H * 0.24);
            c.strokeStyle = "#9ae8ff";
            c.lineWidth = 4;
            c.strokeRect(W * 0.32, H * 0.31, W * 0.36, H * 0.34);
            c.fillStyle = "rgba(255,216,90,0.9)";
            c.fillRect(W * 0.36, H * 0.34, W * 0.28, H * 0.28);
            c.fillStyle = "#e8fbff";
            c.font = `800 ${W * 0.085}px Inter, sans-serif`;
            c.fillText("HP Pak Bos", W / 2, H * 0.76);
            c.font = `600 ${W * 0.065}px Inter, sans-serif`;
            c.fillText("baterai 100% → 0%", W / 2, H * 0.88);
          }}
        />
      </group>

      {/* kelopak bunga melayang & berpendar */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = i * 2.4 + t * 0.6;
        const r = 0.35 + (i % 4) * 0.1;
        const y = 0.2 + (((i * 0.37 + t * 0.25) % 1) * 1.3);
        return (
          <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshBasicMaterial color={["#ff7ab0", "#ffd85a", "#ffffff", "#ff9ac8"][i % 4]} toneMapped={false} />
          </mesh>
        );
      })}

      {/* lilin di kiri-kanan alas */}
      <Candle position={[-0.52, 0.08, 0.32]} scale={1.4} flicker={t * 9} />
      <Candle position={[0.52, 0.08, 0.32]} scale={1.4} flicker={t * 9 + 2} />
    </group>
  );
};

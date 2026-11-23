// Latar & properti "Pertempuran Surabaya 1945": Hotel Yamato, bendera robek, tank Sherman, Jembatan Merah,
// kota/kampung, studio radio, kapal perang, pesawat, selebaran, ledakan & asap, tandu, Tugu Pahlawan.
import React from "react";
import { CanvasPlane, G, Limb, T, Vec3 } from "./toon";

const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ================= bendera (Belanda -> merah putih) ================= */
/** tiang + bendera 3 warna; tear 0..1 = strip biru dirobek & jatuh; wave = fase kibaran */
export const FlagPole: React.FC<{ position?: Vec3; h?: number; tear?: number; wave?: number; merahPutih?: boolean; scale?: number }> = ({ position, h = 4, tear = 0, wave = 0, merahPutih = false, scale = 1 }) => {
  const W = 1.5,
    S = 0.33; // lebar bendera, tinggi tiap strip
  const strips = merahPutih ? ["#d81e1e", "#f8f8f4"] : ["#c8102e", "#f8f8f4", "#21468b"];
  const seg = 6;
  return (
    <group position={position} scale={scale}>
      <T g={G.cyl(0.04, 0.05, h, 10)} c="#d8d8d0" position={[0, h / 2, 0]} />
      <T g={G.sph(0.08, 10, 8)} c="#d8b040" position={[0, h + 0.05, 0]} o={false} />
      {strips.map((c, si) => {
        const isBlue = si === 2;
        if (isBlue && tear >= 1) return null;
        const fall = isBlue ? tear : 0;
        return (
          <group key={si} position={[fall * 0.6, h - 0.2 - si * S - fall * 3.5, fall * 0.4]} rotation={[fall * 1.2, 0, fall * 0.8]}>
            {Array.from({ length: seg }).map((_, k) => {
              const x = (k + 0.5) * (W / seg);
              const z = Math.sin(wave + k * 0.8) * 0.06 * (k / seg + 0.3);
              const rip = isBlue && tear > 0 && tear < 0.15 ? (k % 2) * 0.03 : 0;
              return <T key={k} g={G.box(W / seg + 0.01, S, 0.012)} c={c} position={[x, -S / 2 - rip, z]} rotation={[0, Math.cos(wave + k * 0.8) * 0.12, 0]} o={k === 0 || k === seg - 1 ? 2 : false} />;
            })}
          </group>
        );
      })}
      {/* serpihan kain saat dirobek */}
      {tear > 0 && tear < 0.6
        ? Array.from({ length: 6 }).map((_, i) => (
            <T key={i} g={G.box(0.06, 0.03, 0.005)} c="#21468b" position={[0.3 + i * 0.2, h - 0.86 - tear * (1.5 + rnd(i) * 2), Math.sin(i) * 0.3]} rotation={[tear * 8 + i, tear * 5, 0]} o={false} />
          ))
        : null}
    </group>
  );
};

/* ================= Hotel Yamato (dulu Hotel Oranje) ================= */
const Window: React.FC<{ position: Vec3; w?: number; h?: number; arch?: boolean; lit?: boolean }> = ({ position, w = 0.9, h = 1.6, arch = false, lit = false }) => (
  <group position={position}>
    <T g={G.box(w + 0.16, h + 0.16, 0.06)} c="#e8e0cc" o={false} />
    <T g={G.box(w, h, 0.07)} c={lit ? "#ffd88a" : "#3a4a5a"} emissive={lit ? "#ffb040" : "#000000"} ei={lit ? 0.6 : 0} position={[0, 0, 0.01]} o={false} />
    {arch ? <T g={G.cyl(w / 2, w / 2, 0.07, 16, false, 0, Math.PI)} c={lit ? "#ffd88a" : "#3a4a5a"} position={[0, h / 2, 0.01]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} o={false} /> : null}
    <T g={G.box(0.05, h, 0.08)} c="#e8e0cc" position={[0, 0, 0.02]} o={false} />
    <T g={G.box(w, 0.05, 0.08)} c="#e8e0cc" position={[0, h * 0.15, 0.02]} o={false} />
    {/* krepyak hijau */}
    {!arch
      ? [-1, 1].map((s) => <T key={s} g={G.box(w * 0.45, h, 0.05)} c="#3a6a4a" position={[s * (w * 0.72 + 0.06), 0, 0.03]} o={2} />)
      : null}
  </group>
);
export const HotelYamato: React.FC<{ position?: Vec3; tear?: number; wave?: number; merahPutih?: boolean }> = ({ position, tear = 0, wave = 0, merahPutih = false }) => {
  const L = 22,
    D = 9,
    FL = 3.6;
  return (
    <group position={position}>
      {/* badan bangunan 3 lantai, krem putih */}
      <T g={G.box(L, FL * 3, D)} c="#efe6d2" position={[0, (FL * 3) / 2, 0]} />
      {/* plint batu bawah */}
      <T g={G.box(L + 0.2, 0.8, D + 0.2)} c="#b8ac94" position={[0, 0.4, 0]} />
      {/* lis tiap lantai */}
      {[1, 2, 3].map((k) => (
        <T key={k} g={G.box(L + 0.4, 0.2, D + 0.4)} c="#d8ccb0" position={[0, k * FL, 0]} />
      ))}
      {/* jendela depan */}
      {[0, 1, 2].map((fl) =>
        Array.from({ length: 11 }).map((_, i) => {
          const x = -L / 2 + 1.2 + i * 1.96;
          if (fl === 0 && Math.abs(x) < 2.2) return null;
          return <Window key={`${fl}-${i}`} position={[x, fl * FL + 1.9, D / 2 + 0.01]} arch={fl === 0} lit={fl === 1 && i % 3 === 1} />;
        })
      )}
      {/* pintu masuk lengkung + kanopi + papan nama */}
      <T g={G.box(3.0, 3.2, 0.1)} c="#4a3a2a" position={[0, 1.6, D / 2 + 0.02]} />
      <T g={G.cyl(1.5, 1.5, 0.1, 20, false, 0, Math.PI)} c="#4a3a2a" position={[0, 3.2, D / 2 + 0.02]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} o={false} />
      <T g={G.box(5.0, 0.25, 2.2)} c="#d8ccb0" position={[0, 3.9, D / 2 + 1.1]} />
      {[-2.2, 2.2].map((x) => (
        <T key={x} g={G.cyl(0.14, 0.16, 3.9, 12)} c="#f4ecd8" position={[x, 1.95, D / 2 + 2.0]} />
      ))}
      <CanvasPlane
        w={4.6}
        h={0.6}
        px={700}
        toon={false}
        o={2}
        position={[0, 4.4, D / 2 + 2.2]}
        drawKey="yamato"
        draw={(c, W, H) => {
          c.fillStyle = "#2a2a30";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#f4e8c0";
          c.font = `900 ${H * 0.62}px Inter, serif`;
          c.textAlign = "center";
          c.fillText("HOTEL YAMATO", W / 2, H * 0.74);
        }}
      />
      {/* balkon lantai 2 */}
      <T g={G.box(L * 0.6, 0.15, 1.2)} c="#d8ccb0" position={[0, FL + 0.1, D / 2 + 0.6]} />
      {Array.from({ length: 26 }).map((_, i) => (
        <T key={i} g={G.cyl(0.035, 0.035, 0.8, 6)} c="#f4ecd8" position={[-L * 0.3 + i * (L * 0.6 / 25), FL + 0.55, D / 2 + 1.15]} o={false} />
      ))}
      <T g={G.box(L * 0.6, 0.08, 0.1)} c="#f4ecd8" position={[0, FL + 0.97, D / 2 + 1.15]} />
      {/* atap genteng merah (perisai) */}
      <group position={[0, FL * 3, 0]}>
        <T g={G.box(L + 0.8, 0.25, D + 0.8)} c="#c8bca0" position={[0, 0.1, 0]} />
        <T g={G.cone(Math.hypot(L, D) / 2 + 0.3, 2.6, 4)} c="#a8442a" position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} scale={[L / Math.hypot(L, D) * 1.41, 1, D / Math.hypot(L, D) * 1.41]} />
      </group>
      {/* menara tengah + kubah kecil + jam */}
      <group position={[0, FL * 3, D / 2 - 1.8]}>
        <T g={G.box(3.6, 4.4, 3.6)} c="#efe6d2" position={[0, 2.2, 0]} />
        <T g={G.box(3.9, 0.25, 3.9)} c="#d8ccb0" position={[0, 4.45, 0]} />
        {[-1, 1].map((s) => (
          <Window key={s} position={[s * 0.85, 2.2, 1.81]} w={0.6} h={1.4} arch />
        ))}
        {/* tembok pagar atas menara (tempat pemuda berdiri) */}
        {[
          [0, 1.85, 3.7, 0.15],
          [0, -1.85, 3.7, 0.15],
          [1.85, 0, 0.15, 3.7],
          [-1.85, 0, 0.15, 3.7],
        ].map(([x, z, w, d], i) => (
          <T key={i} g={G.box(w, 0.7, d)} c="#efe6d2" position={[x, 4.9, z]} />
        ))}
        <FlagPole position={[0, 4.6, 0]} h={4.2} tear={tear} wave={wave} merahPutih={merahPutih} />
      </group>
      {/* pohon & lampu jalan depan */}
      {[-9, -5, 5, 9].map((x, i) => (
        <group key={x} position={[x, 0, D / 2 + 3.6]}>
          <T g={G.cyl(0.12, 0.18, 2.4, 8)} c="#5a3a22" position={[0, 1.2, 0]} />
          <T g={G.sph(1.3, 12, 10)} c={i % 2 ? "#3a7a3a" : "#2e6a34"} position={[0, 3.0, 0]} scale={[1, 0.85, 1]} />
        </group>
      ))}
    </group>
  );
};

/* ================= tank Sherman (dipakai pasukan Inggris) ================= */
export const Sherman: React.FC<{ position?: Vec3; rotation?: Vec3; turret?: number; recoil?: number; track?: number; scale?: number }> = ({ position, rotation, turret = 0, recoil = 0, track = 0, scale = 1 }) => {
  const olive = "#5a5e3a",
    dark = "#3e4228";
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* rantai + roda */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0.45, s * 1.25]}>
          <T g={G.rbox(5.6, 0.85, 0.55, 0.35)} c="#2a2a26" />
          {Array.from({ length: 6 }).map((_, i) => (
            <group key={i} position={[-2.0 + i * 0.8, -0.1, s * 0.3]} rotation={[Math.PI / 2, 0, track + i]}>
              <T g={G.cyl(0.3, 0.3, 0.12, 14)} c={dark} o={2} />
              <T g={G.box(0.5, 0.06, 0.13)} c="#2a2a26" o={false} />
            </group>
          ))}
          {/* bogie suspensi */}
          {[-1.6, 0, 1.6].map((x) => (
            <T key={x} g={G.box(0.6, 0.3, 0.1)} c={olive} position={[x, 0.15, s * 0.32]} o={2} />
          ))}
        </group>
      ))}
      {/* lambung: depan miring */}
      <T g={G.box(5.4, 1.0, 2.4)} c={olive} position={[-0.1, 1.25, 0]} />
      <T g={G.box(1.4, 1.0, 2.4)} c={olive} position={[2.45, 1.05, 0]} rotation={[0, 0, -0.75]} />
      <T g={G.box(0.4, 0.4, 0.4)} c={dark} position={[2.2, 1.65, 0.6]} o={2} />
      {/* bintang putih di samping */}
      {[-1, 1].map((s) => (
        <group key={s} position={[-0.6, 1.25, s * 1.21]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <T g={G.cyl(0.35, 0.35, 0.01, 5)} c="#e8e8e0" rotation={[Math.PI / 2, 0, 0]} o={false} />
        </group>
      ))}
      {/* peralatan: sekop, ban cadangan rantai */}
      <T g={G.box(1.4, 0.08, 0.15)} c="#7a5a3a" position={[-1.6, 1.78, 0.9]} o={false} />
      {/* menara + meriam 75 mm */}
      <group position={[0.2, 1.75, 0]} rotation={[0, turret, 0]}>
        <T g={G.cyl(1.0, 1.15, 0.85, 20)} c={olive} position={[0, 0.42, 0]} scale={[1.15, 1, 1]} />
        <T g={G.box(0.6, 0.5, 0.8)} c={olive} position={[0.95, 0.4, 0]} />
        <T g={G.cyl(0.3, 0.3, 0.2, 12)} c={dark} position={[-0.2, 0.92, 0.3]} />
        <group position={[1.2 - recoil * 0.35, 0.42, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <T g={G.cyl(0.075, 0.09, 2.6, 12)} c={dark} position={[0, 1.3, 0]} />
          <T g={G.cyl(0.11, 0.11, 0.2, 12)} c={dark} position={[0, 2.55, 0]} />
        </group>
        <Limb a={[-0.4, 0.85, -0.4]} b={[-0.7, 2.8, -0.5]} r={0.012} c="#2a2a26" o={false} />
      </group>
    </group>
  );
};

/* ================= efek: ledakan, asap, api, kilatan ================= */
export const Explosion: React.FC<{ position: Vec3; k: number; scale?: number; seed?: number }> = ({ position, k, scale = 1, seed = 0 }) => {
  if (k <= 0 || k >= 1) return null;
  const fire = Math.max(0, 1 - k * 2.2);
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = i * 0.7 + seed;
        const r = 0.3 + k * (1.2 + rnd(i, seed) * 0.8);
        return (
          <T key={i} g={G.ico(0.5 + rnd(i + 3, seed) * 0.4, 1)} c={k < 0.25 ? "#ffd86a" : k < 0.5 ? "#e8642a" : "#4a4440"} emissive={k < 0.45 ? "#ff7a20" : "#000000"} ei={fire * 1.6} position={[Math.cos(a) * r * 0.7, 0.4 + k * 2.2 * rnd(i + 7, seed) + Math.sin(i) * 0.3, Math.sin(a) * r * 0.7]} scale={0.6 + k * 1.6} o={false} />
        );
      })}
      {fire > 0 ? <pointLight intensity={8 * fire} distance={14} color="#ff9a40" position={[0, 1, 0]} /> : null}
      {/* serpihan */}
      {Array.from({ length: 10 }).map((_, i) => (
        <T key={`d${i}`} g={G.box(0.12, 0.08, 0.1)} c="#3a3430" position={[Math.cos(i * 2.1) * k * 4, 0.3 + Math.sin(Math.PI * Math.min(1, k * 1.5)) * (2 + rnd(i, seed) * 2), Math.sin(i * 2.1) * k * 4]} rotation={[k * 9 + i, k * 7, 0]} o={false} />
      ))}
    </group>
  );
};
export const SmokeColumn: React.FC<{ position: Vec3; t: number; h?: number; scale?: number; dark?: boolean }> = ({ position, t, h = 12, scale = 1, dark = true }) => (
  <group position={position} scale={scale}>
    {Array.from({ length: 10 }).map((_, i) => {
      const k = ((t * 0.08 + i / 10) % 1);
      return <T key={i} g={G.ico(0.9, 1)} c={dark ? (k < 0.3 ? "#3a3430" : "#5a5450") : "#c8c0b8"} position={[Math.sin(i * 1.7 + t * 0.2) * k * 1.4 + k * 2.0, k * h, Math.cos(i * 1.3) * k]} scale={0.6 + k * 2.4} o={false} />;
    })}
  </group>
);
export const Fire: React.FC<{ position: Vec3; t: number; scale?: number }> = ({ position, t, scale = 1 }) => (
  <group position={position} scale={scale}>
    {Array.from({ length: 6 }).map((_, i) => {
      const k = ((t * 1.6 + i / 6) % 1);
      return <T key={i} g={G.cone(0.28 * (1 - k * 0.6), 0.8, 7)} c={k < 0.4 ? "#ffd86a" : "#ff6a2a"} emissive="#ff6a20" ei={1.4} position={[Math.sin(i * 2.3) * 0.25, 0.3 + k * 0.9, Math.cos(i * 2.3) * 0.25]} scale={1 - k * 0.5} o={false} />;
    })}
    <pointLight intensity={2.5} distance={8} color="#ff8a30" position={[0, 0.8, 0]} />
  </group>
);

/* ================= Jembatan Merah + Kali Mas ================= */
export const JembatanMerah: React.FC<{ t?: number }> = ({ t = 0 }) => {
  const red = "#b8322a",
    deep = "#8a2018";
  const Lb = 30,
    Wb = 7;
  return (
    <group>
      {/* sungai */}
      <T g={G.box(80, 0.1, 18)} c="#3a6a6a" position={[0, -1.6, 0]} o={false} />
      {Array.from({ length: 30 }).map((_, i) => (
        <T key={i} g={G.box(1.2 + rnd(i) * 2, 0.02, 0.06)} c="#8ac0c0" position={[-30 + ((i * 7.3 + t * 0.6) % 60), -1.53, -8 + rnd(i, 2) * 16]} o={false} />
      ))}
      {/* tanggul batu kedua sisi */}
      {[-1, 1].map((s) => (
        <T key={s} g={G.box(80, 2.0, 0.8)} c="#8a8478" position={[0, -0.6, s * 9.2]} />
      ))}
      {/* jalan di tepi */}
      {[-1, 1].map((s) => (
        <T key={`r${s}`} g={G.box(80, 0.2, 14)} c="#7a7268" position={[0, 0.3, s * 16.5]} o={false} />
      ))}
      {/* geladak jembatan melintang sungai (sumbu z) */}
      <T g={G.box(Wb, 0.5, Lb)} c="#6a625a" position={[0, 0.3, 0]} />
      {/* pagar baja merah: tiang + lengkung */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (Wb / 2 + 0.1), 0.55, 0]}>
          <T g={G.box(0.2, 0.2, Lb)} c={red} position={[0, 1.15, 0]} />
          <T g={G.box(0.2, 0.15, Lb)} c={red} position={[0, 0.1, 0]} />
          {Array.from({ length: 16 }).map((_, i) => (
            <T key={i} g={G.box(0.18, 1.2, 0.18)} c={deep} position={[0, 0.65, -Lb / 2 + i * (Lb / 15)]} />
          ))}
          {Array.from({ length: 15 }).map((_, i) => (
            <group key={`x${i}`} position={[0, 0.65, -Lb / 2 + (i + 0.5) * (Lb / 15)]}>
              <T g={G.box(0.06, 1.3, 0.06)} c={red} rotation={[0.85, 0, 0]} o={false} />
              <T g={G.box(0.06, 1.3, 0.06)} c={red} rotation={[-0.85, 0, 0]} o={false} />
            </group>
          ))}
          {/* lampu jembatan */}
          {[-10, 0, 10].map((z) => (
            <group key={z} position={[0, 1.2, z]}>
              <T g={G.cyl(0.06, 0.08, 2.4, 8)} c="#2a2a2a" position={[0, 1.2, 0]} />
              <T g={G.sph(0.18, 10, 8)} c="#f4e8c0" position={[0, 2.5, 0]} />
            </group>
          ))}
        </group>
      ))}
      {/* pilar jembatan */}
      {[-6, 6].map((z) => (
        <T key={z} g={G.box(Wb, 2.0, 1.0)} c="#8a8478" position={[0, -1.0, z]} />
      ))}
    </group>
  );
};

/* ================= gedung kota kolonial & kampung ================= */
export const CityBlock: React.FC<{ position?: Vec3; rotation?: Vec3; n?: number; seed?: number; ruined?: number; dusk?: boolean }> = ({ position, rotation, n = 5, seed = 1, ruined = 0, dusk = false }) => (
  <group position={position} rotation={rotation}>
    {Array.from({ length: n }).map((_, i) => {
      const w = 4 + rnd(i, seed) * 3;
      const h = 5 + rnd(i + 9, seed) * 7 - (ruined > 0 && i % 2 ? ruined * 4 : 0);
      const x = i * 7.5;
      const col = ["#e8dcc4", "#d8c8a8", "#efe6d2", "#c8b898"][Math.floor(rnd(i + 3, seed) * 4)];
      return (
        <group key={i} position={[x, 0, 0]}>
          <T g={G.box(w, h, 6)} c={col} position={[0, h / 2, 0]} />
          <T g={G.box(w + 0.4, 0.3, 6.4)} c="#a8442a" position={[0, h + 0.15, 0]} />
          {Array.from({ length: Math.max(1, Math.floor(h / 2.6)) }).map((_, r) =>
            Array.from({ length: Math.max(1, Math.floor(w / 1.4)) }).map((__, c) => (
              <T key={`${r}${c}`} g={G.box(0.6, 1.0, 0.05)} c={dusk && rnd(r * 7 + c, seed + i) > 0.6 ? "#ffd070" : "#3a4a58"} emissive={dusk && rnd(r * 7 + c, seed + i) > 0.6 ? "#ff9a30" : "#000000"} ei={0.5} position={[-w / 2 + 0.8 + c * 1.4, 1.6 + r * 2.6, 3.01]} o={false} />
            ))
          )}
          {ruined > 0 && i % 2 ? (
            <>
              {Array.from({ length: 6 }).map((_, k) => (
                <T key={k} g={G.dodec(0.5 + rnd(k, i) * 0.5)} c="#8a8278" position={[-w / 2 + rnd(k + 1, i) * w, 0.3, 3.2 + rnd(k + 2, i) * 1.5]} rotation={[k, k * 2, 0]} />
              ))}
            </>
          ) : null}
        </group>
      );
    })}
  </group>
);
export const KampungHouse: React.FC<{ position?: Vec3; rotation?: Vec3; c?: string }> = ({ position, rotation, c = "#d8c8a0" }) => (
  <group position={position} rotation={rotation}>
    <T g={G.box(4, 2.6, 4)} c={c} position={[0, 1.3, 0]} />
    <T g={G.cone(3.3, 1.8, 4)} c="#9a3a22" position={[0, 3.5, 0]} rotation={[0, Math.PI / 4, 0]} />
    <T g={G.box(0.9, 1.9, 0.08)} c="#5a3a22" position={[0, 0.95, 2.02]} />
    {[-1.3, 1.3].map((x) => (
      <T key={x} g={G.box(0.8, 0.8, 0.08)} c="#3a4a3a" position={[x, 1.6, 2.02]} o={false} />
    ))}
  </group>
);
export const Rubble: React.FC<{ position: Vec3; n?: number; r?: number; seed?: number }> = ({ position, n = 14, r = 2.5, seed = 1 }) => (
  <group position={position}>
    {Array.from({ length: n }).map((_, i) => (
      <T key={i} g={G.dodec(0.2 + rnd(i, seed) * 0.45)} c={["#8a8278", "#a8442a", "#6a625a"][i % 3]} position={[(rnd(i + 1, seed) - 0.5) * r * 2, 0.15, (rnd(i + 2, seed) - 0.5) * r * 2]} rotation={[i, i * 2, 0]} />
    ))}
  </group>
);
export const SandbagWall: React.FC<{ position?: Vec3; rotation?: Vec3; n?: number; rows?: number }> = ({ position, rotation, n = 8, rows = 3 }) => (
  <group position={position} rotation={rotation}>
    {Array.from({ length: rows }).map((_, r) =>
      Array.from({ length: n - (r % 2) }).map((_, i) => (
        <T key={`${r}${i}`} g={G.rbox(0.62, 0.24, 0.36, 0.5)} c={(r + i) % 2 ? "#a8946a" : "#988458"} position={[-n * 0.3 + i * 0.6 + (r % 2) * 0.3, 0.12 + r * 0.23, 0]} rotation={[0, rnd(i, r) * 0.15, 0]} />
      ))
    )}
  </group>
);

/* ================= studio Radio Pemberontakan (malam) ================= */
export const RadioStudio: React.FC<{ t?: number; onAir?: boolean }> = ({ t = 0, onAir = true }) => (
  <group>
    <T g={G.box(8, 0.1, 7)} c="#5a4232" position={[0, -0.05, 0]} o={false} />
    <T g={G.box(8, 3.4, 0.12)} c="#6a5a48" position={[0, 1.7, -2.6]} />
    <T g={G.box(0.12, 3.4, 7)} c="#5e5040" position={[-3.2, 1.7, 0]} />
    {/* panel peredam suara */}
    {Array.from({ length: 4 }).map((_, r) =>
      Array.from({ length: 6 }).map((__, c) => <T key={`${r}${c}`} g={G.box(0.9, 0.6, 0.06)} c={(r + c) % 2 ? "#8a7a62" : "#7a6a52"} position={[-2.6 + c * 1.0, 0.8 + r * 0.7, -2.52]} o={false} />)
    )}
    {/* lemari pemancar dengan meteran & lampu */}
    <group position={[2.0, 0, -2.1]}>
      <T g={G.box(1.6, 2.2, 0.7)} c="#3a3a36" position={[0, 1.1, 0]} />
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-0.45 + i * 0.45, 1.6, 0.36]}>
          <T g={G.cyl(0.15, 0.15, 0.04, 16)} c="#f4ecd0" rotation={[Math.PI / 2, 0, 0]} o={2} />
          <T g={G.box(0.01, 0.12, 0.01)} c="#c81e1e" position={[0, 0.03, 0.03]} rotation={[0, 0, Math.sin(t * 3 + i) * 0.8]} o={false} />
        </group>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <T key={i} g={G.sph(0.04, 8, 6)} c={i % 2 ? "#ff5a3a" : "#5aff8a"} emissive={i % 2 ? "#ff2a1a" : "#3aff6a"} ei={Math.sin(t * 6 + i) > 0 ? 1.6 : 0.2} position={[-0.5 + i * 0.2, 1.1, 0.37]} o={false} />
      ))}
      <T g={G.cyl(0.08, 0.08, 0.06, 12)} c="#c8c8c0" position={[-0.4, 0.7, 0.37]} rotation={[Math.PI / 2, 0, 0]} />
      <T g={G.cyl(0.08, 0.08, 0.06, 12)} c="#c8c8c0" position={[0.4, 0.7, 0.37]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
    {/* meja siaran + kertas naskah + lampu meja */}
    <group position={[-0.4, 0, -0.6]}>
      <T g={G.box(2.4, 0.08, 1.0)} c="#7a4a2a" position={[0, 0.82, 0]} />
      {[-1.1, 1.1].map((x) => (
        <T key={x} g={G.box(0.08, 0.8, 0.9)} c="#5a3418" position={[x, 0.4, 0]} />
      ))}
      {[0, 1, 2].map((i) => (
        <T key={i} g={G.box(0.26, 0.005, 0.34)} c="#f4f0e0" position={[-0.6 + i * 0.12, 0.865 + i * 0.002, 0.1]} rotation={[0, i * 0.2, 0]} o={false} />
      ))}
      <group position={[0.9, 0.86, -0.2]}>
        <T g={G.cyl(0.1, 0.12, 0.04, 12)} c="#2a5a3a" />
        <Limb a={[0, 0.02, 0]} b={[0.05, 0.4, 0.05]} r={0.012} c="#2a5a3a" o={false} />
        <T g={G.cone(0.14, 0.14, 12)} c="#2a5a3a" position={[0.08, 0.45, 0.08]} rotation={[0.5, 0, -0.3]} />
        <pointLight intensity={1.6} distance={4} color="#ffd890" position={[0.1, 0.35, 0.1]} />
      </group>
    </group>
    {/* poster + lampu ON AIR */}
    <CanvasPlane
      w={1.2}
      h={1.6}
      px={360}
      toon={false}
      o={2}
      position={[-1.6, 2.0, -2.48]}
      drawKey="poster"
      draw={(c, W, H) => {
        c.fillStyle = "#f0e4c4";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#c81e1e";
        c.fillRect(0, 0, W, H / 2);
        c.fillStyle = "#1a1a1a";
        c.font = `900 ${W * 0.16}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText("MERDEKA", W / 2, H * 0.68);
        c.fillText("ATAU MATI!", W / 2, H * 0.82);
        c.fillStyle = "#fff";
        c.font = `900 ${W * 0.2}px Inter, sans-serif`;
        c.fillText("1945", W / 2, H * 0.3);
      }}
    />
    <group position={[0.4, 2.8, -2.5]}>
      <T g={G.box(0.9, 0.3, 0.08)} c={onAir ? "#d81e1e" : "#5a2a2a"} emissive={onAir ? "#ff2a2a" : "#000000"} ei={onAir ? 1.2 : 0} />
      <CanvasPlane w={0.84} h={0.26} px={300} toon={false} o={false} position={[0, 0, 0.045]} drawKey={`onair${onAir}`} draw={(c, W, H) => { c.fillStyle = onAir ? "#ff3a3a" : "#5a2a2a"; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; c.font = `900 ${H * 0.7}px Inter, sans-serif`; c.textAlign = "center"; c.fillText("MENGUDARA", W / 2, H * 0.78); }} />
    </group>
    {/* jendela malam bulan */}
    <group position={[-3.13, 1.9, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <T g={G.box(1.6, 1.4, 0.06)} c="#2a2a30" />
      <T g={G.box(1.5, 1.3, 0.07)} c="#141c34" emissive="#0a1030" ei={0.5} o={false} />
      <T g={G.sph(0.14, 12, 10)} c="#fff4c8" emissive="#ffe8a0" ei={1} position={[0.4, 0.3, 0.05]} o={false} />
    </group>
    <pointLight intensity={1.0} distance={8} color="#ffc070" position={[0, 2.8, 0.5]} />
  </group>
);

/* ================= kapal perang, pesawat, selebaran ================= */
export const Warship: React.FC<{ position?: Vec3; rotation?: Vec3; flash?: number; scale?: number }> = ({ position, rotation, flash = 0, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.box(22, 2.4, 3.4)} c="#6a7078" position={[0, 0.8, 0]} />
    <T g={G.cone(1.75, 4, 4)} c="#6a7078" position={[12.6, 0.8, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.97]} />
    <T g={G.box(6, 2.4, 2.4)} c="#7a8088" position={[1, 3.2, 0]} />
    <T g={G.box(2.4, 1.6, 2.0)} c="#7a8088" position={[2.5, 5.2, 0]} />
    <T g={G.cyl(0.6, 0.7, 2.6, 12)} c="#5a6068" position={[-2.5, 4.6, 0]} />
    <Limb a={[2.5, 6, 0]} b={[2.5, 10, 0]} r={0.08} c="#4a5058" />
    {[7, -7].map((x, i) => (
      <group key={x} position={[x, 2.4, 0]} rotation={[0, i ? Math.PI : 0, 0]}>
        <T g={G.cyl(0.9, 1.0, 0.8, 14)} c="#5a6068" />
        {[-0.2, 0.2].map((z) => (
          <T key={z} g={G.cyl(0.09, 0.09, 3, 8)} c="#3a4048" position={[1.5, 0.2, z]} rotation={[0, 0, -Math.PI / 2 + 0.15]} />
        ))}
        {flash > 0 ? <T g={G.ico(0.9, 1)} c="#ffd86a" emissive="#ff9a20" ei={2} position={[3.4, 0.6, 0]} scale={flash * 2} o={false} /> : null}
      </group>
    ))}
    {flash > 0 ? <pointLight intensity={10 * flash} distance={30} color="#ffa040" position={[8, 3, 0]} /> : null}
  </group>
);
export const Fighter: React.FC<{ position?: Vec3; rotation?: Vec3; prop?: number; scale?: number }> = ({ position, rotation, prop = 0, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <T g={G.cap(0.45, 3.6, 14)} c="#6a7058" rotation={[0, 0, Math.PI / 2]} />
    <T g={G.box(1.6, 0.12, 9.0)} c="#6a7058" position={[0.2, -0.15, 0]} />
    <T g={G.box(0.9, 0.1, 3.2)} c="#6a7058" position={[-2.3, 0.1, 0]} />
    <T g={G.box(0.9, 1.4, 0.1)} c="#6a7058" position={[-2.3, 0.75, 0]} />
    <T g={G.sph(0.4, 12, 10)} c="#8ac8e8" position={[0.4, 0.4, 0]} scale={[1.6, 0.8, 0.8]} />
    {[-1, 1].map((s) => (
      <group key={s} position={[0.2, -0.1, s * 3.0]} rotation={[0, 0, 0]}>
        <T g={G.cyl(0.4, 0.4, 0.02, 20)} c="#2a3a6a" rotation={[Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} o={false} />
        <T g={G.cyl(0.28, 0.28, 0.025, 20)} c="#f4f4f4" rotation={[Math.PI / 2, 0, 0]} position={[0, 0.075, 0]} o={false} />
        <T g={G.cyl(0.14, 0.14, 0.03, 20)} c="#c81e1e" rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} o={false} />
      </group>
    ))}
    <group position={[2.35, 0, 0]} rotation={[prop, 0, 0]}>
      <T g={G.box(0.06, 3.0, 0.2)} c="#2a2a2a" o={false} />
      <T g={G.box(0.06, 0.2, 3.0)} c="#2a2a2a" o={false} />
    </group>
    <T g={G.cone(0.3, 0.5, 12)} c="#2a2a2a" position={[2.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
  </group>
);
export const Leaflet: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; text?: boolean }> = ({ position, rotation, scale = 1, text = false }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {text ? (
      <CanvasPlane
        w={0.21}
        h={0.3}
        px={300}
        toon={false}
        o={2}
        drawKey="ultimatum"
        draw={(c, W, H) => {
          c.fillStyle = "#f4f0e0";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#1a1a1a";
          c.font = `900 ${W * 0.12}px serif`;
          c.textAlign = "center";
          c.fillText("ULTIMATUM", W / 2, H * 0.12);
          c.font = `600 ${W * 0.062}px serif`;
          ["Seluruh pemimpin &", "rakyat Indonesia di", "Surabaya wajib", "menyerahkan senjata", "paling lambat", ""].forEach((l, i) => c.fillText(l, W / 2, H * (0.24 + i * 0.075)));
          c.fillStyle = "#b81e1e";
          c.font = `900 ${W * 0.085}px serif`;
          c.fillText("10 NOV 1945", W / 2, H * 0.7);
          c.fillText("PUKUL 06.00", W / 2, H * 0.8);
          c.fillStyle = "#4a4a4a";
          c.font = `600 ${W * 0.05}px serif`;
          c.fillText("— Komando Sekutu", W / 2, H * 0.93);
        }}
      />
    ) : (
      <T g={G.box(0.21, 0.3, 0.004)} c="#f4f0e0" o={false} />
    )}
  </group>
);

/* ================= tandu ================= */
export const Stretcher: React.FC<{ position?: Vec3; rotation?: Vec3 }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    {[-0.28, 0.28].map((z) => (
      <T key={z} g={G.cyl(0.025, 0.025, 2.3, 8)} c="#8a6a3a" position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]} />
    ))}
    <T g={G.box(1.8, 0.02, 0.56)} c="#d8d0b8" />
  </group>
);

/* ================= Tugu Pahlawan (paku terbalik, beralur) ================= */
export const TuguPahlawan: React.FC<{ position?: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <T g={G.box(8, 0.6, 8)} c="#d8d0c0" position={[0, 0.3, 0]} />
    <T g={G.box(5, 0.6, 5)} c="#e4dccc" position={[0, 0.9, 0]} />
    {/* batang meruncing ke bawah? -> tugu asli: paku terbalik, kepala di bawah, runcing ke atas */}
    <T g={G.cyl(0.5, 1.6, 18, 10)} c="#f4ecdc" position={[0, 10.2, 0]} />
    {Array.from({ length: 10 }).map((_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return <T key={i} g={G.box(0.12, 18, 0.12)} c="#d8ccb4" position={[Math.cos(a) * 1.05, 10.2, Math.sin(a) * 1.05]} rotation={[Math.sin(a) * 0.06, 0, -Math.cos(a) * 0.06]} o={false} />;
    })}
    <T g={G.cone(0.5, 1.4, 10)} c="#f4ecdc" position={[0, 19.9, 0]} />
  </group>
);

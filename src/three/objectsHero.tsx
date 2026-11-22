// Rig tokoh "Hero": proporsi heroik (±7,5 kepala), bahu lebar, wajah berfitur (rahang, hidung, telinga, alis tegas),
// pakaian berlapis + atribut lengkap. Gaya toon + garis tepi (sama dengan toon.tsx). Untuk video perang Surabaya 1945.
import React from "react";
import { CanvasPlane, G, Limb, T, Vec3 } from "./toon";

export type HeroExpr = "determined" | "shout" | "angry" | "sad" | "calm" | "smile";
export type HeroHead = "ikat" | "helmJP" | "brodie" | "slouch" | "peci" | "fieldcap" | "peaked" | "none";
export type HeroWeapon = "bambu" | "arisaka" | "enfield" | "kukri" | "mic" | "medbag" | "flag" | "none";
export type HeroArm = { pitch?: number; out?: number; elbow?: number }; // rad: pitch + = ke depan/atas, out + = menjauh dari badan
export type HeroLeg = { pitch?: number; out?: number; knee?: number };
export type HeroP = {
  skin?: string;
  hair?: string;
  hairStyle?: "short" | "slick" | "crop" | "none";
  head?: HeroHead;
  headColor?: string;
  shirt: string;
  shirtDark?: string;
  sleeves?: "long" | "rolled" | "short";
  open?: boolean; // kemeja terbuka, kaos dalam terlihat
  undershirt?: string;
  pants: string;
  shorts?: boolean;
  puttees?: string;
  feet?: "boots" | "sandals" | "bare";
  bootColor?: string;
  belt?: string;
  bandolier?: boolean;
  webbing?: string; // sabuk webbing + kantong (Inggris)
  armband?: "merahputih" | "redcross" | "none";
  pockets?: boolean;
  collar?: boolean;
  scarf?: string; // syal leher
  mustache?: boolean;
  expr?: HeroExpr;
  look?: number;
  armL?: HeroArm;
  armR?: HeroArm;
  legL?: HeroLeg;
  legR?: HeroLeg;
  lean?: number;
  turn?: number; // putar badan atas
  talk?: number;
  female?: boolean;
  hairLong?: boolean; // sanggul / rambut diikat
};

/* ---------------- proporsi ---------------- */
const HIP_Y = 0.95;
const SH_Y = 1.45;
const SH_X = 0.215;
const UP = 0.3;
const LO = 0.28;
const TH = 0.46;
const SHIN = 0.43;
const HEAD_Y = 1.665;

/** arah tulang dari sudut (mulai dari bawah) */
const dirOf = (pitch: number, out: number, side: number): Vec3 => {
  // turunan dari vektor (0,-1,0): putar keluar (sumbu z) lalu ke depan (sumbu x)
  const sx = Math.sin(out) * side;
  const cy = -Math.cos(out);
  return [sx, cy * Math.cos(pitch), -cy * Math.sin(pitch)];
};
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** posisi lokal tangan (untuk menempel senjata / benda) */
export const heroHand = (p: HeroP, side: "L" | "R"): Vec3 => {
  const sd = side === "L" ? -1 : 1;
  const a = (side === "L" ? p.armL : p.armR) ?? {};
  const S: Vec3 = [SH_X * sd, SH_Y, 0];
  const E = add(S, dirOf(a.pitch ?? 0.05, a.out ?? 0.12, sd), UP);
  const W = add(E, dirOf((a.pitch ?? 0.05) + (a.elbow ?? 0.15), a.out ?? 0.12, sd), LO);
  return W;
};

/* ---------------- wajah ---------------- */
const Face: React.FC<{ p: HeroP }> = ({ p }) => {
  const e = p.expr ?? "determined";
  const skin = p.skin ?? "#c98e62";
  const ink = "#1a120e";
  const browA = e === "angry" || e === "shout" ? 0.32 : e === "sad" ? -0.3 : e === "determined" ? 0.16 : 0.02;
  const browY = e === "sad" ? 0.045 : 0.035;
  const lid = e === "angry" || e === "determined" ? 0.55 : 0.75;
  const lx = (p.look ?? 0) * 0.012;
  const open = e === "shout" ? 1 : (p.talk ?? 0);
  return (
    <group>
      {/* kepala: tengkorak + rahang tegas + dagu */}
      <T g={G.sph(0.112, 24, 18)} c={skin} scale={[0.92, 1.08, 1.0]} position={[0, 0.02, 0]} />
      <T g={G.rbox(0.165, 0.095, 0.15, 0.55)} c={skin} position={[0, -0.058, 0.012]} o={2} />
      <T g={G.sph(0.045, 12, 10)} c={skin} position={[0, -0.095, 0.07]} scale={[1.3, 0.8, 0.9]} o={false} />
      {/* telinga */}
      {[-1, 1].map((s) => (
        <T key={s} g={G.sph(0.028, 10, 8)} c={skin} position={[s * 0.103, 0.0, -0.005]} scale={[0.5, 1, 0.8]} o={2} />
      ))}
      {/* hidung */}
      <T g={G.cone(0.022, 0.06, 8)} c={skin} position={[0, -0.005, 0.118]} rotation={[Math.PI / 2 + 0.25, 0, 0]} o={2} />
      {/* mata: putih + pupil + kelopak atas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.042, 0.022, 0.1]}>
          <T g={G.sph(0.019, 12, 10)} c="#f8f4ee" scale={[1.2, 0.8 * lid + 0.25, 0.5]} o={false} />
          <T g={G.sph(0.01, 10, 8)} c={ink} position={[lx, -0.002, 0.008]} o={false} />
          <T g={G.box(0.048, 0.008, 0.02)} c={ink} position={[0, 0.012 * lid + 0.004, 0.004]} o={false} />
        </group>
      ))}
      {/* alis tebal */}
      {[-1, 1].map((s) => (
        <T key={s} g={G.box(0.05, 0.013, 0.02)} c={p.hair ?? ink} position={[s * 0.044, 0.022 + browY, 0.108]} rotation={[0, 0, -s * browA]} o={false} />
      ))}
      {/* mulut */}
      {open > 0.15 ? (
        <group position={[0, -0.062, 0.1]}>
          <T g={G.sph(0.026, 12, 10)} c="#3a1210" scale={[1.2, 0.5 + open * 0.6, 0.4]} o={false} />
          <T g={G.box(0.036, 0.006, 0.01)} c="#f4f0e8" position={[0, 0.008 + open * 0.004, 0.006]} o={false} />
        </group>
      ) : (
        <T g={G.box(0.042, 0.006, 0.01)} c="#5a2a22" position={[0, -0.062, 0.108]} rotation={[0, 0, e === "smile" ? 0 : e === "sad" ? 0.0 : 0]} scale={[1, e === "smile" ? 1.6 : 1, 1]} o={false} />
      )}
      {e === "smile" ? <T g={G.tor(0.02, 0.004, 6, 12, Math.PI)} c="#5a2a22" position={[0, -0.056, 0.106]} rotation={[0, 0, Math.PI]} o={false} /> : null}
      {p.mustache ? <T g={G.box(0.05, 0.01, 0.012)} c={p.hair ?? ink} position={[0, -0.045, 0.112]} o={false} /> : null}
      {/* garis tulang pipi (bayangan) */}
      {[-1, 1].map((s) => (
        <T key={s} g={G.box(0.004, 0.03, 0.004)} c="#8a5a3a" position={[s * 0.07, -0.035, 0.09]} rotation={[0, 0, s * 0.3]} o={false} />
      ))}
      {/* rambut */}
      {p.hairStyle !== "none" ? (
        <group>
          <T g={G.dome(0.118, p.hairStyle === "crop" ? 1.05 : 1.25)} c={p.hair ?? "#1a1410"} position={[0, 0.035, -0.008]} scale={[0.95, p.hairStyle === "slick" ? 0.95 : 0.9, 1.02]} />
          {p.hairStyle === "slick" ? <T g={G.box(0.17, 0.03, 0.06)} c={p.hair ?? "#1a1410"} position={[0, 0.115, 0.06]} rotation={[0.35, 0, 0]} o={2} /> : null}
          {p.hairLong ? <T g={G.sph(0.05, 12, 10)} c={p.hair ?? "#1a1410"} position={[0, 0.03, -0.12]} o={2} /> : null}
          {[-1, 1].map((s) => (
            <T key={s} g={G.box(0.02, 0.05, 0.05)} c={p.hair ?? "#1a1410"} position={[s * 0.1, 0.035, 0.03]} o={false} />
          ))}
        </group>
      ) : null}
    </group>
  );
};

/* ---------------- penutup kepala ---------------- */
const HeadGear: React.FC<{ kind: HeroHead; c?: string }> = ({ kind, c }) => {
  if (kind === "ikat")
    return (
      <group position={[0, 0.06, 0]}>
        <T g={G.tor(0.112, 0.013, 8, 32)} c="#d81e1e" position={[0, 0.012, 0]} rotation={[Math.PI / 2 - 0.12, 0, 0]} scale={[0.93, 1, 1]} o={2} />
        <T g={G.tor(0.113, 0.011, 8, 32)} c="#f8f8f4" position={[0, -0.012, 0]} rotation={[Math.PI / 2 - 0.12, 0, 0]} scale={[0.93, 1, 1]} o={2} />
        {/* simpul + ujung kain berkibar di belakang */}
        <T g={G.sph(0.022, 10, 8)} c="#d81e1e" position={[0, 0.0, -0.11]} o={2} />
        <T g={G.box(0.03, 0.12, 0.01)} c="#d81e1e" position={[0.02, -0.06, -0.13]} rotation={[0.5, 0, 0.3]} o={2} />
        <T g={G.box(0.03, 0.1, 0.01)} c="#f8f8f4" position={[-0.025, -0.05, -0.13]} rotation={[0.4, 0, -0.35]} o={2} />
      </group>
    );
  if (kind === "helmJP")
    // helm baja Tipe 90 (rampasan Jepang) + bintang depan; kulit pelindung leher kain
    return (
      <group position={[0, 0.05, -0.005]} rotation={[-0.08, 0, 0]}>
        <T g={G.dome(0.135, 1.35)} c={c ?? "#5a6238"} scale={[0.95, 0.95, 1.02]} />
        <T g={G.tor(0.128, 0.008, 6, 32)} c="#4a5230" position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} o={false} />
        <T g={G.cone(0.016, 0.01, 5)} c="#c8a830" position={[0, 0.075, 0.118]} rotation={[Math.PI / 2, 0, 0]} o={false} />
      </group>
    );
  if (kind === "brodie")
    // helm Brodie Mk II (Inggris): kubah dangkal + pinggiran lebar datar + jaring kamuflase
    return (
      <group position={[0, 0.085, 0]} rotation={[-0.1, 0, 0]}>
        <T g={G.dome(0.12, 1.1)} c={c ?? "#4e5636"} scale={[1, 0.75, 1.05]} />
        <T g={G.cyl(0.19, 0.19, 0.012, 32)} c={c ?? "#4e5636"} scale={[1, 1, 1.08]} />
        {Array.from({ length: 6 }).map((_, i) => (
          <T key={i} g={G.box(0.2, 0.004, 0.004)} c="#2e3420" position={[0, 0.07, 0]} rotation={[0, (i * Math.PI) / 6, 0]} o={false} />
        ))}
        <Limb a={[-0.1, -0.02, 0.02]} b={[-0.08, -0.16, 0.06]} r={0.004} c="#6a5a3a" o={false} />
        <Limb a={[0.1, -0.02, 0.02]} b={[0.08, -0.16, 0.06]} r={0.004} c="#6a5a3a" o={false} />
      </group>
    );
  if (kind === "slouch")
    // topi Gurkha: pinggiran lebar, sisi kanan dilipat? (dipakai miring) + pita merah-hitam
    return (
      <group position={[0, 0.09, 0]} rotation={[-0.05, 0, -0.12]}>
        <T g={G.cyl(0.095, 0.11, 0.09, 24)} c={c ?? "#4a4a30"} position={[0, 0.04, 0]} />
        <T g={G.cyl(0.112, 0.112, 0.02, 24)} c="#2a2a1a" position={[0, 0.005, 0]} o={false} />
        <T g={G.cyl(0.21, 0.21, 0.012, 32)} c={c ?? "#4a4a30"} />
        <T g={G.box(0.04, 0.04, 0.01)} c="#c8a830" position={[0.11, 0.03, 0.02]} rotation={[0, Math.PI / 2, 0]} o={false} />
      </group>
    );
  if (kind === "peci")
    return <T g={G.cyl(0.1, 0.108, 0.075, 24)} c={c ?? "#141416"} position={[0, 0.105, -0.005]} rotation={[-0.12, 0, 0]} scale={[1, 1, 0.94]} />;
  if (kind === "peaked")
    // topi pet perwira Inggris: pita merah, lencana emas, pet hitam mengkilap
    return (
      <group position={[0, 0.1, 0]} rotation={[-0.12, 0, 0]}>
        <T g={G.cyl(0.13, 0.105, 0.06, 28)} c={c ?? "#6a6a48"} position={[0, 0.03, 0]} scale={[1, 1, 1.08]} />
        <T g={G.cyl(0.107, 0.107, 0.035, 28)} c="#b81e2a" position={[0, -0.01, 0]} o={false} />
        <T g={G.cyl(0.11, 0.11, 0.008, 28, false, -Math.PI / 2, Math.PI)} c="#141416" position={[0, -0.03, 0.03]} scale={[1, 1, 1.35]} rotation={[0.2, 0, 0]} o={2} />
        <T g={G.sph(0.018, 10, 8)} c="#d8b040" position={[0, 0.02, 0.112]} scale={[1, 1, 0.4]} o={false} />
      </group>
    );
  if (kind === "fieldcap")
    return (
      <group position={[0, 0.09, 0]} rotation={[-0.1, 0, 0]}>
        <T g={G.cyl(0.105, 0.115, 0.07, 24)} c={c ?? "#a08a5a"} />
        <T g={G.cyl(0.11, 0.11, 0.008, 24, false, -Math.PI / 2, Math.PI)} c={c ?? "#a08a5a"} position={[0, -0.03, 0.04]} scale={[1, 1, 1.3]} o={2} />
        <T g={G.cone(0.014, 0.008, 5)} c="#c8a830" position={[0, 0.0, 0.11]} rotation={[Math.PI / 2, 0, 0]} o={false} />
      </group>
    );
  return null;
};

/* ---------------- senjata & benda ---------------- */
export const Bambu: React.FC<{ len?: number; flag?: boolean }> = ({ len = 2.1, flag = true }) => (
  <group>
    <T g={G.cyl(0.018, 0.02, len, 10)} c="#b8a04a" position={[0, len / 2, 0]} />
    {Array.from({ length: 6 }).map((_, i) => (
      <T key={i} g={G.cyl(0.022, 0.022, 0.015, 10)} c="#8a7a32" position={[0, 0.2 + i * (len / 6.5), 0]} o={false} />
    ))}
    <T g={G.cone(0.019, 0.16, 8)} c="#d8c47a" position={[0, len + 0.08, 0]} rotation={[0, 0, 0.05]} />
    {flag ? (
      <group position={[0.07, len - 0.12, 0]}>
        <T g={G.box(0.14, 0.05, 0.004)} c="#d81e1e" position={[0, 0.025, 0]} o={2} />
        <T g={G.box(0.14, 0.05, 0.004)} c="#f8f8f4" position={[0, -0.025, 0]} o={2} />
      </group>
    ) : null}
  </group>
);
/** senapan bolt-action (Arisaka Tipe 99 rampasan / Lee-Enfield No.4) — sumbu laras +y */
export const Rifle: React.FC<{ kind?: "arisaka" | "enfield"; bayonet?: boolean }> = ({ kind = "arisaka", bayonet = true }) => {
  const wood = kind === "arisaka" ? "#8a5a32" : "#6a4022";
  return (
    <group>
      <T g={G.box(0.045, 0.32, 0.07)} c={wood} position={[0, 0.0, -0.01]} />
      <T g={G.box(0.038, 0.55, 0.045)} c={wood} position={[0, 0.42, 0.005]} />
      <T g={G.cyl(0.011, 0.011, 1.0, 8)} c="#2a2c30" position={[0, 0.62, 0.025]} />
      <T g={G.box(0.03, 0.09, 0.04)} c="#3a3c42" position={[0, 0.2, 0.03]} />
      <Limb a={[0.02, 0.22, 0.04]} b={[0.07, 0.2, 0.05]} r={0.008} c="#3a3c42" o={false} />
      <T g={G.sph(0.012, 8, 6)} c="#3a3c42" position={[0.075, 0.2, 0.05]} o={false} />
      <T g={G.box(0.03, 0.05, 0.035)} c="#2a2c30" position={[0, 0.14, -0.035]} o={false} />
      {kind === "enfield" ? <T g={G.box(0.04, 0.14, 0.06)} c="#2a2c30" position={[0, 0.22, -0.02]} o={2} /> : null}
      <Limb a={[0.025, 0.05, -0.02]} b={[0.025, 0.7, 0.0]} r={0.004} c="#6a5a3a" o={false} />
      {bayonet ? <T g={G.box(0.012, 0.36, 0.02)} c="#b8bcc4" position={[0, 1.27, 0.03]} o={2} /> : null}
    </group>
  );
};
export const Kukri: React.FC = () => (
  <group>
    <T g={G.box(0.03, 0.12, 0.035)} c="#4a2a1a" position={[0, 0, 0]} />
    {[0, 1, 2].map((i) => (
      <T key={i} g={G.box(0.008, 0.13, 0.045 + i * 0.01)} c="#c8ccd4" position={[0, 0.12 + i * 0.1, 0.012 + i * 0.022]} rotation={[0.25 + i * 0.18, 0, 0]} o={2} />
    ))}
  </group>
);
export const RadioMic: React.FC = () => (
  <group>
    <Limb a={[0, -0.6, 0]} b={[0, 0, 0]} r={0.012} c="#3a3a42" />
    <T g={G.cyl(0.12, 0.14, 0.03, 18)} c="#2a2a30" position={[0, -0.61, 0]} />
    <T g={G.tor(0.07, 0.01, 8, 24)} c="#b8bcc4" position={[0, 0.07, 0]} />
    <T g={G.rbox(0.07, 0.11, 0.045, 0.5)} c="#c8ccd4" position={[0, 0.07, 0]} />
    {Array.from({ length: 5 }).map((_, i) => (
      <T key={i} g={G.box(0.06, 0.004, 0.047)} c="#5a5c64" position={[0, 0.035 + i * 0.018, 0]} o={false} />
    ))}
    <CanvasPlane w={0.06} h={0.025} px={120} toon={false} o={false} position={[0, 0.0, 0.025]} drawKey="rri" draw={(c, W, H) => { c.fillStyle = "#d81e1e"; c.fillRect(0, 0, W, H); c.fillStyle = "#fff"; c.font = `900 ${H * 0.75}px Inter, sans-serif`; c.textAlign = "center"; c.fillText("RADIO", W / 2, H * 0.8); }} />
  </group>
);
export const MedBag: React.FC = () => (
  <group>
    <T g={G.rbox(0.2, 0.15, 0.09, 0.3)} c="#f0ece0" position={[0, -0.09, 0]} />
    <T g={G.box(0.05, 0.015, 0.093)} c="#d81e1e" position={[0, -0.08, 0]} o={false} />
    <T g={G.box(0.015, 0.05, 0.093)} c="#d81e1e" position={[0, -0.08, 0]} o={false} />
    <T g={G.tor(0.05, 0.008, 6, 16, Math.PI)} c="#6a5a3a" position={[0, 0.0, 0]} o={false} />
  </group>
);
export const MerahPutih: React.FC<{ wave?: number }> = ({ wave = 0 }) => (
  <group>
    <T g={G.cyl(0.012, 0.012, 1.6, 8)} c="#8a6a3a" position={[0, 0.8, 0]} />
    <T g={G.sph(0.02, 8, 6)} c="#d8b040" position={[0, 1.61, 0]} o={false} />
    {[0, 1, 2, 3].map((i) => (
      <group key={i} position={[0.06 + i * 0.12, 1.42, Math.sin(wave + i) * 0.03]}>
        <T g={G.box(0.12, 0.13, 0.006)} c="#d81e1e" position={[0, 0.065, 0]} rotation={[0, Math.sin(wave + i) * 0.25, 0]} o={i === 0 ? 2 : false} />
        <T g={G.box(0.12, 0.13, 0.006)} c="#f8f8f4" position={[0, -0.065, 0]} rotation={[0, Math.sin(wave + i) * 0.25, 0]} o={i === 0 ? 2 : false} />
      </group>
    ))}
  </group>
);

/* ---------------- lengan & kaki ---------------- */
const Arm: React.FC<{ p: HeroP; side: 1 | -1 }> = ({ p, side }) => {
  const a = (side < 0 ? p.armL : p.armR) ?? {};
  const pitch = a.pitch ?? 0.05,
    out = a.out ?? 0.12,
    elb = a.elbow ?? 0.15;
  const S: Vec3 = [SH_X * side, SH_Y, 0];
  const E = add(S, dirOf(pitch, out, side), UP);
  const W = add(E, dirOf(pitch + elb, out, side), LO);
  const skin = p.skin ?? "#c98e62";
  const sleeveUp = p.sleeves === "short" ? 0.5 : 1;
  const mid = add(S, dirOf(pitch, out, side), UP * sleeveUp);
  return (
    <group>
      <T g={G.sph(0.068, 14, 10)} c={p.shirt} position={S} scale={[1.05, 0.9, 1]} />
      <Limb a={S} b={mid} r={0.058} c={p.shirt} />
      {sleeveUp < 1 ? <Limb a={mid} b={E} r={0.047} c={skin} /> : null}
      {p.sleeves === "long" ? (
        <Limb a={E} b={W} r={0.046} c={p.shirt} />
      ) : (
        <>
          <Limb a={E} b={W} r={0.042} c={skin} />
          {p.sleeves === "rolled" ? <T g={G.sph(0.058, 12, 8)} c={p.shirtDark ?? p.shirt} position={E} scale={[1, 0.7, 1]} /> : null}
        </>
      )}
      {/* ban lengan */}
      {p.armband && p.armband !== "none" && side < 0 ? (
        <group position={add(S, dirOf(pitch, out, side), UP * 0.55)}>
          {p.armband === "merahputih" ? (
            <>
              <T g={G.cyl(0.062, 0.062, 0.035, 14)} c="#d81e1e" position={[0, 0.018, 0]} rotation={[pitch, 0, -out * side]} o={2} />
              <T g={G.cyl(0.062, 0.062, 0.035, 14)} c="#f8f8f4" position={[0, -0.018, 0]} rotation={[pitch, 0, -out * side]} o={2} />
            </>
          ) : (
            <>
              <T g={G.cyl(0.062, 0.062, 0.06, 14)} c="#f8f8f4" rotation={[pitch, 0, -out * side]} o={2} />
              <T g={G.box(0.03, 0.01, 0.02)} c="#d81e1e" position={[-0.055, 0, 0.02]} o={false} />
              <T g={G.box(0.01, 0.03, 0.02)} c="#d81e1e" position={[-0.055, 0, 0.02]} o={false} />
            </>
          )}
        </group>
      ) : null}
      {/* tangan mengepal */}
      <T g={G.sph(0.05, 12, 10)} c={skin} position={W} scale={[0.9, 1.05, 1]} />
      <T g={G.sph(0.022, 8, 6)} c={skin} position={add(W, [-side * 0.03, 0.02, 0.03])} o={false} />
    </group>
  );
};
const Leg: React.FC<{ p: HeroP; side: 1 | -1 }> = ({ p, side }) => {
  const l = (side < 0 ? p.legL : p.legR) ?? {};
  const pitch = l.pitch ?? 0,
    out = l.out ?? 0.06,
    knee = l.knee ?? 0;
  const H: Vec3 = [0.1 * side, HIP_Y, 0];
  const K = add(H, dirOf(pitch, out, side), TH);
  const A = add(K, dirOf(pitch - knee, out * 0.5, side), SHIN);
  const skin = p.skin ?? "#c98e62";
  const shortK = add(H, dirOf(pitch, out, side), TH * 0.55);
  const foot = p.feet ?? "boots";
  return (
    <group>
      <Limb a={H} b={p.shorts ? shortK : K} r={0.078} c={p.pants} />
      {p.shorts ? <Limb a={shortK} b={K} r={0.058} c={skin} /> : null}
      <Limb a={K} b={A} r={p.shorts ? 0.05 : 0.064} c={p.puttees ?? (p.shorts ? skin : p.pants)} />
      {p.puttees
        ? Array.from({ length: 5 }).map((_, i) => (
            <T key={i} g={G.tor(0.058, 0.006, 6, 16)} c="#6a5a3a" position={add(K, [A[0] - K[0], A[1] - K[1], A[2] - K[2]], 0.15 + i * 0.16)} rotation={[Math.PI / 2 + 0.3, 0, 0]} o={false} />
          ))
        : null}
      {/* alas kaki */}
      {foot === "boots" ? (
        <group position={[A[0], A[1] - 0.02, A[2]]}>
          <T g={G.cyl(0.058, 0.06, 0.12, 12)} c={p.bootColor ?? "#2a1e16"} position={[0, 0.03, 0]} />
          <T g={G.rbox(0.11, 0.07, 0.24, 0.4)} c={p.bootColor ?? "#2a1e16"} position={[0, -0.04, 0.06]} />
        </group>
      ) : foot === "sandals" ? (
        <group position={[A[0], A[1] - 0.04, A[2]]}>
          <T g={G.rbox(0.09, 0.05, 0.2, 0.5)} c={skin} position={[0, -0.01, 0.05]} />
          <T g={G.box(0.1, 0.018, 0.22)} c="#5a3a22" position={[0, -0.045, 0.05]} />
          <T g={G.box(0.095, 0.012, 0.02)} c="#3a2a1a" position={[0, 0.0, 0.06]} o={false} />
        </group>
      ) : (
        <T g={G.rbox(0.09, 0.05, 0.2, 0.5)} c={skin} position={[A[0], A[1] - 0.05, A[2] + 0.05]} />
      )}
    </group>
  );
};

/* ---------------- badan ---------------- */
export const Hero: React.FC<{ p: HeroP; position?: Vec3; rotation?: Vec3; scale?: number; children?: React.ReactNode }> = ({ p, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, children }) => {
  const dark = p.shirtDark ?? p.shirt;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Leg p={p} side={-1} />
      <Leg p={p} side={1} />
      <group position={[0, HIP_Y, 0]} rotation={[p.lean ?? 0, p.turn ?? 0, 0]}>
        <group position={[0, -HIP_Y, 0]}>
          {/* panggul & celana */}
          <T g={G.cyl(0.16, 0.15, 0.16, 18)} c={p.pants} position={[0, HIP_Y + 0.03, 0]} scale={[1, 1, 0.8]} />
          {/* torso V: dada lebar -> pinggang ramping */}
          {p.female ? (
            <T g={G.cyl(0.2, 0.15, 0.42, 18)} c={p.shirt} position={[0, 1.24, 0]} scale={[1, 1, 0.72]} />
          ) : (
            <T g={G.cyl(0.235, 0.155, 0.44, 18)} c={p.shirt} position={[0, 1.25, 0]} scale={[1, 1, 0.68]} />
          )}
          {/* otot dada / lipatan kemeja */}
          {!p.female ? (
            <>
              <T g={G.sph(0.11, 14, 10)} c={p.shirt} position={[-0.085, 1.33, 0.07]} scale={[1, 0.75, 0.55]} o={false} />
              <T g={G.sph(0.11, 14, 10)} c={p.shirt} position={[0.085, 1.33, 0.07]} scale={[1, 0.75, 0.55]} o={false} />
            </>
          ) : null}
          {p.open ? <T g={G.box(0.1, 0.36, 0.02)} c={p.undershirt ?? "#ece6da"} position={[0, 1.26, 0.125]} rotation={[-0.08, 0, 0]} o={false} /> : null}
          {/* kerah + kancing + saku */}
          {p.collar !== false ? (
            <>
              <T g={G.box(0.08, 0.05, 0.03)} c={dark} position={[-0.055, 1.455, 0.1]} rotation={[0.3, 0, 0.5]} o={2} />
              <T g={G.box(0.08, 0.05, 0.03)} c={dark} position={[0.055, 1.455, 0.1]} rotation={[0.3, 0, -0.5]} o={2} />
            </>
          ) : null}
          {!p.open
            ? [1.38, 1.28, 1.18, 1.09].map((y) => <T key={y} g={G.sph(0.009, 6, 5)} c="#d8c8a0" position={[0, y, 0.155 - (1.4 - y) * 0.12]} o={false} />)
            : null}
          {p.pockets !== false
            ? [-1, 1].map((s) => (
                <group key={s} position={[s * 0.1, 1.31, 0.135]}>
                  <T g={G.box(0.08, 0.08, 0.012)} c={dark} o={2} />
                  <T g={G.box(0.085, 0.025, 0.014)} c={dark} position={[0, 0.04, 0.003]} o={false} />
                </group>
              ))
            : null}
          {/* sabuk */}
          <T g={G.cyl(0.162, 0.162, 0.05, 18)} c={p.belt ?? "#3a2a1a"} position={[0, 1.05, 0]} scale={[1, 1, 0.8]} o={2} />
          <T g={G.box(0.05, 0.04, 0.02)} c="#c8a830" position={[0, 1.05, 0.13]} o={false} />
          {/* sabuk peluru silang */}
          {p.bandolier ? (
            <group>
              <Limb a={[-0.2, 1.44, 0.06]} b={[0.17, 1.04, 0.1]} r={0.022} c="#6a4a2a" />
              {Array.from({ length: 7 }).map((_, i) => {
                const k = 0.1 + i * 0.12;
                return <T key={i} g={G.cyl(0.008, 0.008, 0.045, 6)} c="#c8a040" position={[-0.2 + 0.37 * k, 1.44 - 0.4 * k, 0.09 + 0.04 * k]} rotation={[0, 0, 0.8]} o={false} />;
              })}
            </group>
          ) : null}
          {/* webbing Inggris: dua tali + kantong amunisi */}
          {p.webbing ? (
            <group>
              {[-1, 1].map((s) => (
                <Limb key={s} a={[s * 0.15, 1.46, 0.08]} b={[s * 0.12, 1.07, 0.12]} r={0.016} c={p.webbing!} />
              ))}
              {[-1, 1].map((s) => (
                <T key={`p${s}`} g={G.rbox(0.09, 0.11, 0.05, 0.3)} c={p.webbing!} position={[s * 0.11, 1.17, 0.13]} />
              ))}
              <T g={G.cyl(0.164, 0.164, 0.055, 18)} c={p.webbing} position={[0, 1.05, 0]} scale={[1, 1, 0.8]} o={2} />
            </group>
          ) : null}
          {/* syal */}
          {p.scarf ? <T g={G.tor(0.075, 0.025, 8, 18)} c={p.scarf} position={[0, 1.48, 0.01]} rotation={[Math.PI / 2 - 0.2, 0, 0]} /> : null}
          {/* leher + kepala */}
          <T g={G.cyl(0.05, 0.06, 0.1, 12)} c={p.skin ?? "#c98e62"} position={[0, 1.52, 0]} />
          <group position={[0, HEAD_Y, 0.005]}>
            <Face p={p} />
            {p.head && p.head !== "none" ? <HeadGear kind={p.head} c={p.headColor} /> : null}
          </group>
          <Arm p={p} side={-1} />
          <Arm p={p} side={1} />
          {children}
        </group>
      </group>
    </group>
  );
};

export const Binoculars: React.FC = () => (
  <group>
    {[-1, 1].map((s) => (
      <T key={s} g={G.cyl(0.024, 0.028, 0.13, 12)} c="#1e1e22" position={[s * 0.035, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
    ))}
    <T g={G.box(0.05, 0.02, 0.05)} c="#3a3a42" position={[0, 0, 0.01]} o={false} />
  </group>
);

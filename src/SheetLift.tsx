import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { ToonParams, drawToon } from "./three/objectsSoda";

const Card: React.FC<{ p: ToonParams; w: number; name: string; role: string; note: string }> = ({ p, w, name, role, note }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (c) drawToon(c.getContext("2d")!, p);
  }, [p]);
  const h = (w * 1600) / 1024;
  return (
    <div style={{ width: w, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      <canvas ref={ref} width={1024} height={1600} style={{ width: w, height: h, display: "block" }} />
      <div style={{ fontWeight: 800, fontSize: 30, color: "#fff", marginTop: 6 }}>{name}</div>
      <div style={{ fontWeight: 700, fontSize: 21, color: "#ffd23f" }}>{role}</div>
      <div style={{ fontWeight: 600, fontSize: 18, color: "#cbd5e1", marginTop: 4, lineHeight: 1.25 }}>{note}</div>
    </div>
  );
};

const budi: ToonParams = { expr: "neutral", shirt: "#dbeafe", pants: "#3b3f63", hat: "bald", hatColor: "#3a2a1a", mustache: true, belly: 0.9, tie: "#dc2626", lanyard: false, seed: 4 };

export const SheetLift: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#1b2240, #2b3566)", padding: 36 }}>
    <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#fff", letterSpacing: 2 }}>KARAKTER · "KENTUT DI LIFT" v2</div>
    <div style={{ display: "flex", gap: 22, marginTop: 8, justifyContent: "space-between" }}>
      <Card w={290} name="Pak Budi" role="TOKOH UTAMA · karyawan 45 th" note="Botak dengan rambut di samping, kumis, perut buncit, dasi merah miring. Pelamar kerja yang makan jengkol." p={{ ...budi, expr: "worried", sweat: 1, armR: [0.5, -1.4], armL: [-0.5, 1.4] }} />
      <Card w={290} name="Bu Ratna" role="Penumpang · ibu-ibu parfum" note="Berjilbab ungu, blus pink. Paling cepat sadar dan paling lantang menuduh." p={{ expr: "angry", shirt: "#e76f9a", pants: "#5a3a5a", hat: "hijab", hatColor: "#7c3aed", seed: 6, armR: [3.5, 0.4], armL: [-3.5, -0.4], face: "#d8f0b0" }} />
      <Card w={290} name="Pak Direktur" role="Penumpang · bos & pewawancara" note="Jas gelap, dasi biru, kacamata, topi bowler, kumis tipis. Ternyata dia yang mewawancarai Pak Budi." p={{ expr: "neutral", shirt: "#1f2937", pants: "#111827", hat: "bowler", hatColor: "#222", glasses: true, mustache: true, tie: "#1d4ed8", seed: 9 }} />
      <Card w={290} name="Dimas" role="Penumpang · anak magang" note="Muda, rambut pendek, kacamata, kalung ID card, kemeja hijau. Selalu jadi tertuduh." p={{ expr: "happy", shirt: "#22c55e", pants: "#334155", hat: "short", hatColor: "#1c1410", glasses: true, lanyard: true, seed: 13 }} />
      <Card w={290} name="Kang Ojek" role="Penumpang · kurir paket" note="Topi dan jaket oranye, membawa kardus. Siulan santainya berhenti saat bau datang." p={{ expr: "happy", shirt: "#f97316", pants: "#7c2d12", hat: "cap", hatColor: "#c2410c", prop: "box", seed: 15, armR: [1.0, -1.8] }} />
      <Card w={290} name="Bu Sari" role="HRD · menunggu di lantai 20" note="Blazer ungu, rambut panjang diikat, senyum profesional yang perlahan berubah." p={{ expr: "happy", shirt: "#7c3aed", pants: "#1f2937", hat: "hair", hatColor: "#2a1a10", seed: 21 }} />
    </div>
  </AbsoluteFill>
);

export const SheetLiftExpr: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#1b2240, #2b3566)", padding: 36 }}>
    <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#fff", letterSpacing: 2 }}>PAK BUDI · EKSPRESI</div>
    <div style={{ display: "flex", gap: 24, marginTop: 8, justifyContent: "space-between" }}>
      <Card w={330} name="Biasa" role="di lobi" note="Santai, belum sadar apa yang akan terjadi." p={{ ...budi, expr: "neutral" }} />
      <Card w={330} name="Panik menahan" role="di lift" note="Berkeringat, tangan di perut." p={{ ...budi, expr: "worried", sweat: 1, armR: [0.5, -1.4], armL: [-0.5, 1.4], squash: 0.2 }} />
      <Card w={330} name="Lega" role="setelah 'pssst'" note="Mata menyipit, senyum tipis." p={{ ...budi, expr: "smirk", armR: [0.3, 0.1], armL: [-0.3, -0.1] }} />
      <Card w={330} name="Pura-pura polos" role="saat dituduh" note="Mengipasi hidung, ikut mengeluh." p={{ ...budi, expr: "smirk", armR: [0.3, 0.1], armL: [-1.8, -0.6] }} />
      <Card w={330} name="Pasrah" role="di ruang HRD" note="Cemas, ditolak, tapi 'berkesan'." p={{ ...budi, expr: "worried", sweat: 1, armR: [0.4, -0.2], armL: [-0.4, 0.2] }} />
    </div>
  </AbsoluteFill>
);

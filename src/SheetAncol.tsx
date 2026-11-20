import React from "react";
import { AbsoluteFill } from "remotion";
import { Stick, INK } from "./stick/draw";
import { hijab, pompadour, shades, mask, blush } from "./stick/sehat";

const A = hijab("#c0529a");
const labels: [string, string, string][] = [
  ["Hapid (aku)", "Tokoh utama", "Pompadour dan kacamata hitam. Tampil percaya diri, padahal grogi, apalagi pakai masker."],
  ["Asti", "Pasangan di hari spesial", "Berhijab magenta. Pemalu, manis, tertawa sambil menutup masker."],
  ["Kakak Fotografer", "Penyampai doa", "Pengunjung ramah yang berpesan: 'Semoga langgeng ya, Kak!'"],
  ["Petugas Warung", "Penolong", "Petugas baik hati yang mengembalikan dompet yang jatuh."],
];
export const SheetAncol: React.FC = () => (
  <AbsoluteFill style={{ background: "#fff6ec" }}>
    <svg width={2000} height={1080} viewBox="0 0 2000 1080">
      <line x1={0} y1={820} x2={2000} y2={820} stroke={INK} strokeWidth={6} />
      <Stick x={250} y={640} s={0.85} expr="happy" color="#2d6cdf" tuft={false} headFront={<>{shades}{pompadour()}{mask("#bfe6ff")}</>} pose={{ aL: [-10, -6], aR: [30, -60] }} />
      <Stick x={750} y={640} s={0.85} expr="happy" color="#f48fb1" tuft={false} headBack={A.back} headFront={<>{A.front}{blush}{mask("#ffd6e7")}</>} pose={{ aL: [-10, -6], aR: [60, -90] }} />
      <Stick x={1250} y={640} s={0.85} expr="happy" color="#ffb703" tuft={false} headFront={<path d="M -60 -30 Q -50 -90 0 -92 Q 50 -90 60 -30 Q 30 -62 0 -62 Q -30 -62 -60 -30 Z" fill="#5a3a22" stroke={INK} strokeWidth={6} />} pose={{ aR: [120, -40], aL: [-8, -10] }} />
      <Stick x={1740} y={640} s={0.85} expr="happy" color="#2bb673" tuft={false} headFront={<path d="M -64 -26 Q -60 -100 0 -100 Q 60 -100 64 -26 L 70 -40 Q 40 -112 -70 -40 Z" fill="#fff" stroke={INK} strokeWidth={6} />} pose={{ aR: [40, -30], aL: [-8, -10] }} />
    </svg>
    <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: INK, letterSpacing: 2 }}>KARAKTER STIKMAN · "HARI PERTAMA KE ANCOL"</div>
    <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", gap: 18 }}>
      {labels.map(([n, r, d]) => (
        <div key={n} style={{ width: 480, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 26, color: INK }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 19, color: "#c0529a" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 17, color: "#444", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

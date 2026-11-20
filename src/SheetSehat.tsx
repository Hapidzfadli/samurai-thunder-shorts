import React from "react";
import { AbsoluteFill } from "remotion";
import { Stick } from "./stick/draw";
import { hijab, pompadour, shades, belly, Hormone } from "./stick/sehat";

const labels: [string, string, string][] = [
  ["Bu Asti", "TOKOH UTAMA · hamil muda", "Berhijab, perut mulai membulat. Ceria, tapi kini aroma nasi goreng terasa seperti musuh."],
  ["Pak Hapid", "Suami yang panik", "Rambut pompadour, kacamata hitam bulat. Niat baik, kikuk di dapur, sumber humor."],
  ["Bu Bidan Ratih", "Pemandu edukasi", "Berhijab putih, tenang, menjelaskan dengan perumpamaan sederhana."],
  ["Kurir hCG & Estrogen", "Penghuni tubuh", "Makhluk bertopi kerucut pembawa surat 'Kamu hamil!'."],
  ["Satpam Hidung", "Penghuni tubuh", "Hidung super peka, membunyikan alarm pada hampir semua bau."],
];
const A = hijab("#c0529a");
const B = hijab("#ffffff", "#00000033");
export const SheetSehat: React.FC = () => (
  <AbsoluteFill style={{ background: "#f6f4ec" }}>
    <svg width={2000} height={1080} viewBox="0 0 2000 1080">
      <line x1={0} y1={820} x2={2000} y2={820} stroke={INK} strokeWidth={6} />
      <Stick x={230} y={640} s={0.85} expr="surprised" color="#f48fb1" tuft={false} headBack={A.back} headFront={A.front} bodyFront={belly("#f48fb1")} pose={{ aL: [-10, -6], aR: [22, -70] }} />
      <Stick x={640} y={640} s={0.85} expr="surprised" color="#2d6cdf" tuft={false} headFront={<>{shades}{pompadour()}</>} pose={{ aL: [-40, -30], aR: [50, -30] }} />
      <Stick x={1050} y={640} s={0.85} expr="happy" color="#ffffff" tuft={false} headBack={B.back} headFront={B.front} pose={{ aR: [60, -20] }} />
      <Hormone x={1450} y={760} s={1.0} c="#ffd23f" hat="#6ec6ff" kind="mail" />
      <Hormone x={1700} y={760} s={1.0} c="#ff8fb1" hat="#ffd23f" />
      <Hormone x={1900} y={760} s={0.9} c="#9bd6ff" hat="#ff5a6a" kind="nose" />
    </svg>
    <div style={{ position: "absolute", top: 26, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#12121a", letterSpacing: 2 }}>KARAKTER STIKMAN · "ASTI DAN ALARM HIDUNG"</div>
    <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", gap: 18 }}>
      {labels.map(([n, r, d]) => (
        <div key={n} style={{ width: 380, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 25, color: "#12121a" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#c0529a" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: "#444", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
const INK = "#12121a";

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
      <div style={{ fontWeight: 700, fontSize: 21, color: "#ffb347" }}>{role}</div>
      <div style={{ fontWeight: 600, fontSize: 18, color: "#cbd5e1", marginTop: 4, lineHeight: 1.25 }}>{note}</div>
    </div>
  );
};

const TV = { color: "rgba(110,185,255,0.65)", side: -1 as const };
const TINT = "rgba(10,24,60,0.16)";
const SW = ["#0b1226", "#16294f", "#2c6fb7", "#ff9a3c", "#ffe3b0"];

export const SheetMisi: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 20% 40%, #17305a 0%, #0a1226 70%)", padding: 36 }}>
    <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#fff", letterSpacing: 2 }}>KARAKTER · "MISI: REMOTE TV" (gaya sinematik)</div>
    <div style={{ display: "flex", gap: 30, marginTop: 8, justifyContent: "space-between", alignItems: "flex-start" }}>
      <Card w={360} name="Bima" role="TOKOH UTAMA · 10 tahun" note="Anak kecil berpiyama biru, rambut berantakan, mata besar. Agen rahasia dadakan yang ingin nonton kartun jam 2 pagi." p={{ expr: "nervous", shirt: "#3b82c4", pants: "#1e3a8a", hat: "short", hatColor: "#2a1a10", pattern: "flower", seed: 5, armR: [0.7, -1.3], armL: [-0.6, 1.2], rim: TV, tint: TINT }} />
      <Card w={360} name="Ayah (Pak Hendra)" role="Penjaga sofa · pura-pura tidur" note="Kumis, perut buncit, singlet putih dan sarung. Mendengkur keras, tapi satu matanya selalu waspada." p={{ expr: "sleepy", shirt: "#e5e7eb", pants: "#7c2d12", hat: "bald", hatColor: "#3a2a1a", mustache: true, belly: 0.95, seed: 8, rim: TV, tint: TINT }} />
      <Card w={360} name="Ibu (Bu Dewi)" role="Pengawas tak terduga" note="Daster ungu, rambut disanggul, membawa senter. Muncul tepat saat semuanya terasa aman." p={{ expr: "angry", shirt: "#8b5cf6", pants: "#4c1d95", hat: "bun", hatColor: "#2a1a10", pattern: "flower", seed: 11, armR: [2.4, -0.8], rim: TV, tint: TINT }} />
      <Card w={360} name="Mpus" role="Kucing penjaga" note="Kucing oranye bermata menyala di kegelapan. Mengunci pandang pada Bima dari kejauhan." p={{ expr: "neutral", kind: "cat", shirt: "#f59e0b", seed: 3, rim: TV, tint: TINT }} />
    </div>
    <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center", fontFamily: "Inter, sans-serif", color: "#cbd5e1", fontWeight: 700, fontSize: 22 }}>
      <span style={{ marginRight: 10 }}>PALET:</span>
      {SW.map((c) => (
        <div key={c} style={{ width: 70, height: 40, borderRadius: 8, background: c, border: "2px solid rgba(255,255,255,0.35)" }} />
      ))}
      <span style={{ marginLeft: 16 }}>biru malam + cahaya TV biru + satu aksen hangat (senter / lampu dapur)</span>
    </div>
  </AbsoluteFill>
);

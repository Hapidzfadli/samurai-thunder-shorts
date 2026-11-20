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

export const SheetKaraoke: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#1b1236, #3a1f5c)", padding: 36 }}>
    <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 54, color: "#fff", letterSpacing: 2 }}>KARAKTER · "KARAOKE TETANGGA JAM 12 MALAM"</div>
    <div style={{ display: "flex", gap: 26, marginTop: 8, justifyContent: "space-between" }}>
      <Card w={340} name="Pak Joko" role="TOKOH UTAMA · penyanyi dadakan" note="Pria 50-an, kumis tebal, rambut klimis, kacamata hitam, kemeja batik, perut buncit, mic di tangan. Percaya diri penuh, suara pas-pasan." p={{ expr: "happy", shirt: "#8a4b1f", pants: "#2a2a3a", hat: "short", hatColor: "#111", mustache: true, shades: true, belly: 0.8, pattern: "batik", prop: "mic", seed: 3, armR: [1.2, -1.6] }} />
      <Card w={340} name="Bu Tini" role="Ibu RT · tetangga sebelah" note="Wanita 50-an, rambut penuh rol warna-warni, daster bunga. Galak tapi diam-diam hafal semua lagu dangdut." p={{ expr: "angry", shirt: "#f4a6c0", pants: "#7a4a6a", hat: "curlers", hatColor: "#3a2410", pattern: "flower", seed: 6, armR: [2.4, -0.6], armL: [-0.5, 0.2] }} />
      <Card w={340} name="Pak Ujang" role="Hansip · penjaga pos ronda" note="Bapak kurus berkumis, topi dan seragam hansip hijau, peluit di leher. Selalu ngantuk, tapi paling cepat goyang." p={{ expr: "neutral", shirt: "#4d7c3a", pants: "#2f4a24", hat: "cap", hatColor: "#2f4a24", mustache: true, whistle: true, seed: 12 }} />
      <Card w={340} name="Mas Rizal" role="Tetangga muda · pekerja WFH" note="Pemuda berkaos hitam, rambut berantakan, headphone besar. Besok ada meeting jam 8 dan ia hanya ingin tidur." p={{ expr: "worried", shirt: "#27272a", pants: "#334155", hat: "short", hatColor: "#3a2a1a", headphones: true, sweat: 1, seed: 17 }} />
      <Card w={340} name="Nenek Mina" role="Tetangga paling tua" note="Nenek berkacamata tebal, sanggul putih, kebaya biru, bertongkat. Diam sepanjang malam, lalu jadi bintang yang tak terduga." p={{ expr: "smirk", shirt: "#3b82c4", pants: "#5a3a5a", hat: "bun", hatColor: "#e5e7eb", glasses: true, prop: "cane", pattern: "flower", seed: 21 }} />
    </div>
  </AbsoluteFill>
);

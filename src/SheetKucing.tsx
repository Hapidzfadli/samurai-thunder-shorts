/**
 * Lembar Karakter & Ekspresi Ekstra-Ekspresif: "Kucing Mata-Mata CIA $20 Juta"
 * Merender 2D canvas langsung (tajam & cepat) untuk persetujuan karakter sebelum render video penuh.
 */
import React, { useEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { BH, BW, BeanParams } from "./three/objectsBean";
import { AgentExtra, CatDrawOpts, drawAgentBean, drawSpyCat } from "./three/objectsKucing";

const CanvasBean: React.FC<{ params: BeanParams; extra?: AgentExtra; width?: number; height?: number }> = ({
  params,
  extra,
  width = 210,
  height = 350,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, BW, BH);
    drawAgentBean(ctx, params, { ...extra, fxPhase: 0.45 });
  }, [params, extra]);
  return <canvas ref={ref} width={BW} height={BH} style={{ width, height, display: "block" }} />;
};

const CanvasCat: React.FC<{ opts: CatDrawOpts; width?: number; height?: number }> = ({
  opts,
  width = 230,
  height = 195,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    drawSpyCat(ctx, { ...opts, t: 0.45 });
  }, [opts]);
  return <canvas ref={ref} width={520} height={440} style={{ width, height, display: "block" }} />;
};

export const DODI_BASE: BeanParams = {
  skin: "#f3cfa5",
  torso: "#1f242e",
  pants: "#181c24",
  hair: "#2b1d14",
  tie: "#c92a2a",
  coat: true,
  boots: "#141418",
  badge: true,
};

export const ARA_BASE: BeanParams = {
  skin: "#f5d4ae",
  torso: "#d6c29f",
  pants: "#54483a",
  skirt: "#6e5d49",
  hair: "#2e1c14",
  hat: "sanggul",
  hatColor: "#2e1c14",
  tie: "#2f3e4f",
  headphones: true,
  boots: "#261b14",
};

export const DIREKTUR_BASE: BeanParams = {
  skin: "#ecc296",
  torso: "#2c3442",
  pants: "#202630",
  hair: "#6e747c",
  mustache: true,
  tie: "#8f1d1d",
  coat: true,
  medals: true,
  wide: 1.15,
  boots: "#141418",
};

export const DIPLOMAT_BASE: BeanParams = {
  skin: "#f0c8a0",
  torso: "#3c414d",
  pants: "#2b2f38",
  hat: "bowler",
  hatColor: "#20242c",
  tie: "#24476b",
  coat: true,
  boots: "#19191d",
};

export const SheetKucingKarakter: React.FC = () => {
  const cast: {
    name: string;
    role: string;
    desc: string;
    params: BeanParams;
    extra: AgentExtra;
  }[] = [
    {
      name: "Agen Dodi (Sombong)",
      role: "Suara: dodi · Sok James Bond",
      desc: "Jas CIA, kacamata hitam mengilap, earpiece spiral",
      params: { ...DODI_BASE, expr: "smug", armR: [52, -35], armL: [-14, 10], headTilt: -5 },
      extra: { shades: true, shadesSlip: 0, earpiece: true, fx: "sparkle" },
    },
    {
      name: "Agen Dodi (Panik!!)",
      role: "Ekspresi Ekstra: Kacamata Melorot!",
      desc: "Kacamata hitam melorot ke hidung, keringat & !!",
      params: { ...DODI_BASE, expr: "shock", armL: [-135, -20], armR: [135, 20], mouthOpen: 0.9, sweat: true },
      extra: { shades: true, shadesSlip: 1.0, earpiece: true, fx: "shock" },
    },
    {
      name: "Agen Ara (Sindir / Polos)",
      role: "Suara: ara · Operator Van",
      desc: "Trench coat, sanggul, headset penyadap, kotak ikan!",
      params: { ...ARA_BASE, expr: "think", armR: [36, -24], armL: [-22, 16], headTilt: 7 },
      extra: { fishBox: true, fx: "question" },
    },
    {
      name: "Pak Direktur CIA (Murka!)",
      role: "Suara: direktur (berat menggelegar)",
      desc: "Kumis tebal, urat marah berdenyut & asap telinga!",
      params: { ...DIREKTUR_BASE, expr: "angry", armL: [-125, -18], armR: [115, 25], mouthOpen: 1.0 },
      extra: { fx: "anger" },
    },
    {
      name: "Diplomat Target",
      role: "Figuran di Bangku Taman",
      desc: "Topi bowler, mantel panjang, bawa dokumen rahasia",
      params: { ...DIPLOMAT_BASE, expr: "neutral", armR: [35, -20], prop: "paper", propHand: "R" },
      extra: {},
    },
  ];

  const catModes: { label: string; sub: string; opts: CatDrawOpts }[] = [
    { label: "CUEK (Khas Kucing)", sub: "Muka datar bodo amat", opts: { expr: "cuek", shades: false, antenna: true, vest: true } },
    { label: "AGEN COOL", sub: "Kacamata hitam + rompi", opts: { expr: "smug", shades: true, antenna: true, vest: true } },
    { label: "LAPAR LIHAT IKAN!", sub: "Mata berkilau + liur!", opts: { expr: "lapar", shades: true, shadesSlip: 0.9, antenna: true, vest: true } },
    { label: "KABUR NGEBUT!", sub: "Lari lintas jalan!", opts: { expr: "lari", runCycle: 0.4, antenna: true, vest: true } },
    { label: "NGUNYAH IKAN!!", sub: "Siaran KRES-KRES!", opts: { expr: "makan", fishInMouth: true, antenna: true, vest: true } },
    { label: "NGANTUK / ZZZ", sub: "Disuruh malah tidur", opts: { expr: "ngantuk", antenna: true, vest: true } },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #1b2230 0%, #242e40 52%, #f4e4c8 52%, #ead4b0 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "36px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#ffd447", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>
            LEMBAR KARAKTER & EKSPRESI EKSTRA · GAYA RUDAL MERPATI UPGRADED
          </div>
          <div style={{ color: "#fff8eb", fontSize: 42, fontWeight: 900, marginTop: 4 }}>
            KUCING MATA-MATA CIA $20 JUTA (1966)
          </div>
        </div>
        <div
          style={{
            background: "#c92a2a",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 12,
            fontSize: 22,
            fontWeight: 900,
            border: "3px solid #ffd447",
          }}
        >
          TOP SECRET · ACOUSTIC KITTY
        </div>
      </div>

      {/* Row 1: Human Cast */}
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", marginTop: -8 }}>
        {cast.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 320 }}>
            <CanvasBean params={c.params} extra={c.extra} width={220} height={365} />
            <div
              style={{
                background: "#181d26",
                color: "#fff",
                borderRadius: 12,
                padding: "10px 14px",
                textAlign: "center",
                width: "100%",
                border: "2px solid #ffd447",
                marginTop: -6,
              }}
            >
              <div style={{ fontSize: 21, fontWeight: 900, color: "#ffd447" }}>{c.name}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#7ce4ff", marginTop: 2 }}>{c.role}</div>
              <div style={{ fontSize: 14, color: "#dde4ef", marginTop: 3 }}>{c.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Agen Meong 6 Expressions */}
      <div
        style={{
          background: "rgba(255,250,240,0.92)",
          borderRadius: 20,
          border: "4px solid #221720",
          padding: "16px 24px",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, color: "#221720", marginBottom: 8 }}>
          BINTANG TAMU: AGEN MEONG (KUCING MATA-MATA CIA · 6 EKSPRESI + ANTENA EKOR + ROMPI PEMANCAR)
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {catModes.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 280 }}>
              <CanvasCat opts={m.opts} width={235} height={198} />
              <div style={{ fontSize: 18, fontWeight: 900, color: "#221720", marginTop: 2 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#5e4938" }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

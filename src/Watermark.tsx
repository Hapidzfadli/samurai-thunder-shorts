/** Watermark kanal "PZClip" — wajib di setiap video (lihat CLAUDE.md). Pojok kanan atas, semi-transparan, tidak menutupi subtitle/judul. */
import React from "react";
import { AbsoluteFill } from "remotion";

export const Watermark: React.FC<{ text?: string; opacity?: number; corner?: "tr" | "tl" | "br" }> = ({ text = "PZClip", opacity = 0.72, corner = "tr" }) => {
  const pos: React.CSSProperties = corner === "tr" ? { top: 118, right: 40 } : corner === "tl" ? { top: 118, left: 40 } : { bottom: 360, right: 40 };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", ...pos, display: "flex", alignItems: "center", gap: 10, opacity, padding: "8px 16px 8px 10px", borderRadius: 999, background: "rgba(10,8,20,0.38)", border: "2px solid rgba(255,255,255,0.35)" }}>
        <svg width="34" height="34" viewBox="0 0 34 34">
          <circle cx="17" cy="17" r="15" fill="#ffcc33" stroke="#241726" strokeWidth="3" />
          <path d="M13 10 L25 17 L13 24 Z" fill="#241726" />
        </svg>
        <span style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 40, letterSpacing: 1.5, color: "#ffffff", textShadow: "0 2px 0 #241726, 0 0 6px rgba(0,0,0,0.6)" }}>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

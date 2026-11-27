/**
 * Komposisi Utama Video Shorts 9:16 (1080x1920 @ 30fps):
 *   "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)"
 *
 * Mempertahankan kekuatan Motion Graphics Remotion gaya Rudal Merpati 1944 (di-upgrade lebih variatif!):
 *   - BigTitle hook memantul + Counter Anggaran $0 -> $20,000,000
 *   - Callout X-Ray 3D menyala berurutan (Mikrofon Kuping -> Pemancar Dada -> Antena Ekor)
 *   - HUD Radar Penyadap berubah real-time: TARGET DIPLOMAT ❌ -> LOCKED: IKAN TONGKOL ✅
 *   - Gelombang Audio Radio "MEONG!! KRES-KRES!!" & Stamp Miring Bergetar
 *   - Subtitle 1-2 kata berwarna per pembicara dengan animasi pop/shake sesuai gaya emosi!
 */
import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { KucingTiming, KucingWorld3D, useLoadedKucingGlb } from "./scenesKucing";
import rawTiming from "./kucing_timing.json";

const TIMING = rawTiming as unknown as KucingTiming;
export const TOTAL_FRAMES_KUCING = TIMING.totalFrames;

const Stamp: React.FC<{
  text: string;
  color?: string;
  bg?: string;
  rotate?: number;
  top?: number;
  startFrame: number;
  endFrame: number;
}> = ({ text, color = "#fff9e6", bg = "#d62828", rotate = -4, top = 210, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame || frame > endFrame) return null;
  const f = frame - startFrame;
  const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 220, mass: 0.7 } });
  const outOp = interpolate(frame, [endFrame - 6, endFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = f < 10 ? Math.sin(f * 3.5) * 3 : 0;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: outOp,
      }}
    >
      <div
        style={{
          transform: `scale(${s}) rotate(${rotate}deg) translateX(${shake}px)`,
          background: bg,
          color,
          border: "5px solid #1a1418",
          boxShadow: "0 10px 0 rgba(20,14,18,0.85)",
          borderRadius: 18,
          padding: "14px 34px",
          fontSize: 46,
          fontWeight: 950,
          letterSpacing: 1.5,
          textShadow: "0 3px 0 rgba(0,0,0,0.45)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const TopPill: React.FC<{ text: string; accent?: string; visible: boolean }> = ({ text, accent = "#ffd447", visible }) => {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 88,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(18, 24, 34, 0.88)",
          color: "#fff8eb",
          border: `3px solid ${accent}`,
          borderRadius: 999,
          padding: "9px 26px",
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: 1.4,
          boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const KucingCia: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sceneRoot = useLoadedKucingGlb("models/kucing_cia.glb");
  const S = TIMING.scenes;
  const EV = TIMING.events;

  const inScene = (name: string) => {
    const m = S[name];
    return m ? frame >= m.startFrame && frame < m.endFrame : false;
  };

  // 1. Dynamic Hook Budget Counter ($0 -> $20,000,000!)
  const showBudget = inScene("hook") && frame >= EV["hook.dolar"] - 8;
  const budgetVal = Math.round(
    interpolate(frame, [EV["hook.dolar"] - 8, EV["hook.dolar"] + 34], [0, 20000000], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  // 2. X-Ray Callouts in Scene 3
  const showXr = inScene("xray");
  const xrStep =
    frame >= EV["xr.ekor"] ? 3 : frame >= EV["xr.pemancar"] ? 2 : frame >= EV["xr.kuping"] ? 1 : 0;

  // 3. Surveillance Radar HUD in Scene 6 (switches from DIPLOMAT -> IKAN TONGKOL!)
  const showRadarHud = inScene("kacau") && frame >= EV["kac.gerobak"] - 10;
  const lockedFish = frame >= EV["kac.radar"] - 4;

  // 4. Active Word-Synced Dynamic Colored Caption!
  const activeCap = TIMING.captions.find((c) => frame >= c.startFrame && frame <= c.endFrame);

  const renderCaption = () => {
    if (!activeCap) return null;
    const cf = frame - activeCap.startFrame;
    const pop = spring({ frame: cf, fps, config: { damping: 12, stiffness: 280, mass: 0.6 } });
    const isIntense = ["kaget", "panik", "marah"].includes(activeCap.style);
    const isWhisper = activeCap.style === "bisik";
    const isDir = activeCap.voice === "direktur";
    const isAra = activeCap.voice === "ara";

    const color = isDir ? "#ffeb52" : isAra ? "#ffd6ea" : isIntense ? "#ffe047" : "#ffffff";
    const strokeBg = isDir ? "#9c1111" : "#161118";
    const fontSize = isDir ? 78 : isIntense ? 74 : isWhisper ? 54 : 66;
    const shakeX = isIntense || isDir ? Math.sin(cf * 2.8) * 5 : 0;
    const tilt = isIntense ? (cf % 6 < 3 ? -2.2 : 2.2) : isAra ? -1.2 : 0;

    return (
      <div
        style={{
          position: "absolute",
          bottom: 295,
          left: 44,
          right: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {/* Small speaker badge on dialogue turns for instant visual variety */}
        {isDir && (
          <div
            style={{
              background: "#c92a2a",
              color: "#fff",
              fontSize: 22,
              fontWeight: 900,
              padding: "4px 16px",
              borderRadius: 999,
              border: "3px solid #161118",
              marginBottom: 8,
              letterSpacing: 1.5,
            }}
          >
            PAK DIREKTUR CIA (VIA HEADSET)
          </div>
        )}
        <div
          style={{
            transform: `scale(${0.86 + pop * 0.14}) translateX(${shakeX}px) rotate(${tilt}deg)`,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 950,
            fontSize,
            lineHeight: 1.08,
            textAlign: "center",
            color,
            textTransform: isDir || isIntense ? "uppercase" : "none",
            fontStyle: isWhisper ? "italic" : "normal",
            WebkitTextStroke: `4px ${strokeBg}`,
            paintOrder: "stroke fill",
            textShadow: `0 7px 0 ${strokeBg}, 0 12px 24px rgba(0,0,0,0.6)`,
          }}
        >
          {activeCap.text}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#141a24" }}>
      {/* Main 3D Blender + 2D Extra-Expressive World (mounted strictly after GLB loads!) */}
      {sceneRoot && (
        <ThreeCanvas width={width} height={height} shadows={false} dpr={1} camera={{ near: 0.1, far: 400 }}>
          <KucingWorld3D timing={TIMING} sceneRoot={sceneRoot} />
        </ThreeCanvas>
      )}

      {/* Master Audio (Ultra-Expressive VoxCPM2 + Spy Jazz BGM + Foley SFX @ -14 LUFS) */}
      {withAudio && <Audio src={staticFile("audio/kucing_master.mp3")} />}

      {/* Subtle cinematic vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 45%, transparent 58%, rgba(8,10,16,0.42) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ========== TOP CONTEXT PILLS PER SCENE ========== */}
      <TopPill text="CIA TOP SECRET · WASHINGTON 1966" visible={inScene("hook") || inScene("lab")} />
      <TopPill text="BEDAH X-RAY · OPERATION ACOUSTIC KITTY" accent="#53dcff" visible={inScene("xray")} />
      <TopPill text="VAN PENYADAP CIA · MISI PERDANA" accent="#4cff91" visible={inScene("van")} />
      <TopPill text="PENNSYLVANIA AVE · WASHINGTON D.C." accent="#ff9d2e" visible={inScene("lepas") || inScene("kacau")} />
      <TopPill text="REKAMAN LANGSUNG · HEADSET DIREKTUR" accent="#ff3b30" visible={inScene("direktur")} />
      <TopPill text="ARSIP CIA · 1967 (RESMI DIBATALKAN)" accent="#ffd447" visible={inScene("akhir")} />

      {/* ========== HOOK BIG TITLE & $20M COUNTER ========== */}
      {showBudget && (
        <div
          style={{
            position: "absolute",
            top: 170,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(16, 28, 22, 0.92)",
              border: "4px solid #4cff91",
              borderRadius: 18,
              padding: "10px 30px",
              color: "#4cff91",
              fontFamily: "monospace",
              fontSize: 48,
              fontWeight: 900,
              boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            }}
          >
            ${budgetVal.toLocaleString("en-US")}
          </div>
        </div>
      )}
      <Stamp
        text="KUCING CIA · $20 JUTA!"
        bg="#f4b41a"
        color="#181214"
        rotate={-3}
        top={275}
        startFrame={EV["hook.kucing"]}
        endFrame={S.hook.endFrame}
      />

      {/* ========== SCENE 3: X-RAY 3D GADGET CALLOUT BADGES ========== */}
      {showXr && xrStep >= 1 && (
        <div
          style={{
            position: "absolute",
            top: 175,
            left: 56,
            right: 56,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            pointerEvents: "none",
          }}
        >
          {[
            { n: 1, label: "1. MIKROFON MINI DI KUPING", col: "#ffe047" },
            { n: 2, label: "2. PEMANCAR RADIO DI DADA", col: "#ff5c54" },
            { n: 3, label: "3. ANTENA KAWAT DI EKOR", col: "#53dcff" },
          ]
            .filter((item) => xrStep >= item.n)
            .map((item) => (
              <div
                key={item.n}
                style={{
                  background: "rgba(8, 22, 42, 0.88)",
                  borderLeft: `8px solid ${item.col}`,
                  border: `2px solid ${item.col}`,
                  borderRadius: 12,
                  padding: "10px 20px",
                  color: "#ffffff",
                  fontSize: 27,
                  fontWeight: 900,
                  fontFamily: "system-ui, sans-serif",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.45)",
                }}
              >
                <span style={{ color: item.col }}>●</span> {item.label}
              </div>
            ))}
        </div>
      )}

      {/* ========== SCENE 5: ALARM WARNING BANNER ========== */}
      <Stamp
        text="AWAS TAKSI KUNING!!"
        bg="#e6392e"
        color="#fff6cc"
        rotate={3}
        top={185}
        startFrame={EV["lep.taksi"] - 4}
        endFrame={S.lepas.endFrame}
      />

      {/* ========== SCENE 6: INTERACTIVE SURVEILLANCE RADAR HUD ========== */}
      {showRadarHud && (
        <div
          style={{
            position: "absolute",
            top: 165,
            left: 64,
            right: 64,
            background: lockedFish ? "rgba(65, 16, 14, 0.92)" : "rgba(10, 32, 24, 0.90)",
            border: `4px solid ${lockedFish ? "#ff5247" : "#4cff91"}`,
            borderRadius: 18,
            padding: "14px 24px",
            fontFamily: "monospace",
            boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        >
          <div style={{ color: "#d8e4f0", fontSize: 21, fontWeight: 800 }}>
            RADAR SINYAL ACOUSTIC KITTY ($20,000,000)
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 32,
              fontWeight: 950,
              color: lockedFish ? "#ffe047" : "#4cff91",
            }}
          >
            {lockedFish ? "LOCKED: IKAN TONGKOL BAKAR!!" : "TARGET: DIPLOMAT TAMAN..."}
          </div>
          <div style={{ marginTop: 4, fontSize: 20, color: lockedFish ? "#ff8a80" : "#9af7c4", fontWeight: 700 }}>
            {lockedFish ? "DIPLOMAT: DITINGGAL ❌   |   KUCING: NGUNYAH ✅" : "STATUS: MELENCENG KE GEROBAK..."}
          </div>
        </div>
      )}

      {/* ========== SCENE 7: RADIO AUDIO WAVEFORM + DIRECTOR FURY STAMP ========== */}
      {inScene("direktur") && frame < EV["dir.siapa"] && (
        <Stamp
          text='HEADSET: "MEONG! KRES-KRES!"'
          bg="#1d2f45"
          color="#53dcff"
          rotate={-2}
          top={185}
          startFrame={S.direktur.startFrame + 6}
          endFrame={EV["dir.siapa"]}
        />
      )}
      <Stamp
        text="MISI GAGAL TOTAL!!"
        bg="#c92222"
        color="#ffea5c"
        rotate={-5}
        top={180}
        startFrame={EV["dir.siapa"] + 12}
        endFrame={S.direktur.endFrame}
      />

      {/* ========== SCENE 8: CANCELLED ARCHIVE STAMP ========== */}
      <Stamp
        text="DIBATALKAN · 1967"
        bg="#8f1d1d"
        color="#fff6e0"
        rotate={4}
        top={180}
        startFrame={EV["akh.batal"]}
        endFrame={EV["akh.meong"] - 10}
      />

      {/* ========== DYNAMIC COLORED 1-2 WORD CAPTIONS ========== */}
      {renderCaption()}
    </AbsoluteFill>
  );
};

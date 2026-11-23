import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DUR_KEL, KEL_ORDER, KelScene, SceneKelGrup, SceneKelHilang, SceneKelHook, SceneKelKamis, SceneKelKirim, SceneKelNilai, SceneKelPresentasi, SceneKelXray } from "./scenesKelompok";

const C: Record<KelScene, React.FC> = {
  hook: SceneKelHook,
  grup: SceneKelGrup,
  hilang: SceneKelHilang,
  kamis: SceneKelKamis,
  xray: SceneKelXray,
  kirim: SceneKelKirim,
  presentasi: SceneKelPresentasi,
  nilai: SceneKelNilai,
};
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= OVERLAP ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
export const TOTAL_FRAMES_KEL = KEL_ORDER.reduce((a, k) => a + DUR_KEL(k), 0);
export const Kelompok: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/kelompok_master.mp3")} />
      {KEL_ORDER.map((k, i) => {
        const d = DUR_KEL(k);
        const last = i === KEL_ORDER.length - 1;
        const Comp = C[k];
        const seq = (
          <Sequence key={k} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={k}>
            <Dissolve first={i === 0}>
              <Comp />
            </Dissolve>
          </Sequence>
        );
        from += d;
        return seq;
      })}
    </AbsoluteFill>
  );
};

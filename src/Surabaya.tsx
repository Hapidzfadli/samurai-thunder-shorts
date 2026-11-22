import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DUR_SB, SB_ORDER, SbScene, SceneSbAkhir, SceneSbHook, SceneSbJembatan, SceneSbPahlawan, SceneSbPmi, SceneSbRadio, SceneSbSerangan, SceneSbUltimatum, SceneSbYamato } from "./scenesSby";

const C: Record<SbScene, React.FC> = {
  hook: SceneSbHook,
  yamato: SceneSbYamato,
  ultimatum: SceneSbUltimatum,
  radio: SceneSbRadio,
  serangan: SceneSbSerangan,
  jembatan: SceneSbJembatan,
  pmi: SceneSbPmi,
  akhir: SceneSbAkhir,
  pahlawan: SceneSbPahlawan,
};
const OVERLAP = 10;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= OVERLAP ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
export const TOTAL_FRAMES_SB = SB_ORDER.reduce((a, k) => a + DUR_SB(k), 0);
export const Surabaya: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/sby_master.mp3")} />
      {SB_ORDER.map((k, i) => {
        const d = DUR_SB(k);
        const last = i === SB_ORDER.length - 1;
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

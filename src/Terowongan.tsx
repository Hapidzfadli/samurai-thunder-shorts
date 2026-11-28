import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import timing from "./terowongan_timing.json";
import { TW_ORDER, TW_SCENES, TOTAL_FRAMES_TEROWONGAN, TwCaptions } from "./scenesTerowongan";
import { Watermark } from "./Watermark";

const OVERLAP = 8;
export { TOTAL_FRAMES_TEROWONGAN };
const SC = timing.scenes as Record<string, { startFrame: number }>;

const Dissolve: React.FC<{ first?: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, OVERLAP], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const Terowongan: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: "black" }}>
    {withAudio && <Audio src={staticFile("audio/terowongan_master.mp3")} />}
    {TW_ORDER.map((key, i) => {
      const from = SC[key].startFrame;
      const last = i === TW_ORDER.length - 1;
      const nextFrom = last ? TOTAL_FRAMES_TEROWONGAN : SC[TW_ORDER[i + 1]].startFrame;
      const Comp = TW_SCENES[key];
      return (
        <Sequence key={key} from={from} durationInFrames={nextFrom - from + (last ? 0 : OVERLAP)} name={key}>
          <Dissolve first={i === 0}>
            <Comp />
          </Dissolve>
        </Sequence>
      );
    })}
    <Watermark />
    <TwCaptions />
  </AbsoluteFill>
);

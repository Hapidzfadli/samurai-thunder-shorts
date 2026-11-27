import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./napoleon_timing.json";
import { DissolveNp, NapoleonCaptions, NP_ORDER, NP_SCENES, TOTAL_FRAMES_NAPOLEON } from "./scenesNapoleon";

const OVERLAP = 8;
export { TOTAL_FRAMES_NAPOLEON };
const SC = timing.scenes as Record<string, { startFrame: number }>;

export const Napoleon: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: "black" }}>
    {withAudio && <Audio src={staticFile("audio/napoleon_master.mp3")} />}
    {NP_ORDER.map((key, i) => {
      const from = i === 0 ? 0 : SC[key].startFrame;
      const last = i === NP_ORDER.length - 1;
      const nextFrom = last ? TOTAL_FRAMES_NAPOLEON : SC[NP_ORDER[i + 1]].startFrame;
      const Comp = NP_SCENES[key];
      return (
        <Sequence key={key} from={from} durationInFrames={nextFrom - from + (last ? 0 : OVERLAP)} name={key}>
          <DissolveNp first={i === 0}>
            <Comp />
          </DissolveNp>
        </Sequence>
      );
    })}
    <NapoleonCaptions />
  </AbsoluteFill>
);

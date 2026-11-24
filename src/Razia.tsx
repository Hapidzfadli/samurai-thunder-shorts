import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./razia_timing.json";
import { DissolveRazia, RAZIA_ORDER, RAZIA_SCENES, RaziaCaptions, TOTAL_FRAMES_RAZIA } from "./scenesRazia";

const OVERLAP = 8;
export { TOTAL_FRAMES_RAZIA };

export const Razia: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#1c120c" }}>
      <Audio src={staticFile("audio/razia_master.mp3")} />
      {RAZIA_ORDER.map((key, i) => {
        const from = i === 0 ? 0 : timing.scenes[key].startFrame;
        const last = i === RAZIA_ORDER.length - 1;
        const nextFrom = last ? TOTAL_FRAMES_RAZIA : timing.scenes[RAZIA_ORDER[i + 1]].startFrame;
        const d = nextFrom - from;
        const Comp = RAZIA_SCENES[key];
        return (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <DissolveRazia first={i === 0}>
              <Comp />
            </DissolveRazia>
          </Sequence>
        );
      })}
      <RaziaCaptions />
    </AbsoluteFill>
  );
};

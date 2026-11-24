import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./horor_timing.json";
import { DissolveHoror, HOROR_ORDER, HOROR_SCENES, HororCaptions, TOTAL_FRAMES_HOROR } from "./scenesHoror";

const OVERLAP = 10;
export { TOTAL_FRAMES_HOROR };

export const Horor: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/horor_master.mp3")} />
      {HOROR_ORDER.map((key, i) => {
        const from = i === 0 ? 0 : timing.scenes[key].startFrame;
        const last = i === HOROR_ORDER.length - 1;
        const nextFrom = last ? TOTAL_FRAMES_HOROR : timing.scenes[HOROR_ORDER[i + 1]].startFrame;
        const d = nextFrom - from;
        const Comp = HOROR_SCENES[key];
        return (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <DissolveHoror first={i === 0}>
              <Comp />
            </DissolveHoror>
          </Sequence>
        );
      })}
      <HororCaptions />
    </AbsoluteFill>
  );
};

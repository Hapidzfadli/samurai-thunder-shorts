import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./bubur_timing.json";
import { BUBUR_ORDER, BUBUR_SCENES, BuburCaptions, DissolveBubur, TOTAL_FRAMES_BUBUR } from "./scenesBubur";

const OVERLAP = 10;
export { TOTAL_FRAMES_BUBUR };

export const Bubur: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/bubur_master.mp3")} />
      {BUBUR_ORDER.map((key, i) => {
        const from = i === 0 ? 0 : timing.scenes[key].startFrame;
        const last = i === BUBUR_ORDER.length - 1;
        const nextFrom = last ? TOTAL_FRAMES_BUBUR : timing.scenes[BUBUR_ORDER[i + 1]].startFrame;
        const d = nextFrom - from;
        const Comp = BUBUR_SCENES[key];
        return (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <DissolveBubur first={i === 0}>
              <Comp />
            </DissolveBubur>
          </Sequence>
        );
      })}
      <BuburCaptions />
    </AbsoluteFill>
  );
};

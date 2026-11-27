import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./ember_timing.json";
import { DissolveEmber, EMBER_ORDER, EMBER_SCENES, EmberCaptions, TOTAL_FRAMES_EMBER } from "./scenesEmber";

const OVERLAP = 8;
export { TOTAL_FRAMES_EMBER };
const SC = timing.scenes as Record<string, { startFrame: number }>;

export const Ember: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: "black" }}>
    {withAudio && <Audio src={staticFile("audio/ember_master.mp3")} />}
    {EMBER_ORDER.map((key, i) => {
      const from = i === 0 ? 0 : SC[key].startFrame;
      const last = i === EMBER_ORDER.length - 1;
      const nextFrom = last ? TOTAL_FRAMES_EMBER : SC[EMBER_ORDER[i + 1]].startFrame;
      const Comp = EMBER_SCENES[key];
      return (
        <Sequence key={key} from={from} durationInFrames={nextFrom - from + (last ? 0 : OVERLAP)} name={key}>
          <DissolveEmber first={i === 0}>
            <Comp />
          </DissolveEmber>
        </Sequence>
      );
    })}
    <EmberCaptions />
  </AbsoluteFill>
);

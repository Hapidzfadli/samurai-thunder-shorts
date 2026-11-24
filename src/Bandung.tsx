import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./bandung_timing.json";
import { BANDUNG_ORDER, BANDUNG_SCENES, BandungCaptions, DissolveBd, TOTAL_FRAMES_BANDUNG } from "./scenesBandung";

const OVERLAP = 10;
export { TOTAL_FRAMES_BANDUNG };

export const Bandung: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/bandung_master.mp3")} />
      {BANDUNG_ORDER.map((key, i) => {
        const from = i === 0 ? 0 : timing.scenes[key].startFrame;
        const last = i === BANDUNG_ORDER.length - 1;
        const nextFrom = last ? TOTAL_FRAMES_BANDUNG : timing.scenes[BANDUNG_ORDER[i + 1]].startFrame;
        const d = nextFrom - from;
        const Comp = BANDUNG_SCENES[key];
        return (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <DissolveBd first={i === 0}>
              <Comp />
            </DissolveBd>
          </Sequence>
        );
      })}
      <BandungCaptions />
    </AbsoluteFill>
  );
};

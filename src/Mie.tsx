import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./mie_timing.json";
import { DissolveMie, MIE_ORDER, MIE_SCENES, MieCaptions, TOTAL_FRAMES_MIE } from "./scenesMie";

const OVERLAP = 10;
export { TOTAL_FRAMES_MIE };

export const Mie: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/mie_master.mp3")} />
      {MIE_ORDER.map((key, i) => {
        const from = i === 0 ? 0 : timing.scenes[key].startFrame;
        const last = i === MIE_ORDER.length - 1;
        const nextFrom = last ? TOTAL_FRAMES_MIE : timing.scenes[MIE_ORDER[i + 1]].startFrame;
        const d = nextFrom - from;
        const Comp = MIE_SCENES[key];
        return (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <DissolveMie first={i === 0}>
              <Comp />
            </DissolveMie>
          </Sequence>
        );
      })}
      <MieCaptions />
    </AbsoluteFill>
  );
};

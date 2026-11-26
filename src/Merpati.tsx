import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./merpati_timing.json";
import { DissolveMp, MerpatiCaptions, MP_ORDER, MP_SCENES, TOTAL_FRAMES_MERPATI } from "./scenesMerpati";

const OVERLAP = 8;
export { TOTAL_FRAMES_MERPATI };
const SC = timing.scenes as Record<string, { startFrame: number }>;

export const Merpati: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: "black" }}>
    {withAudio && <Audio src={staticFile("audio/merpati_master.mp3")} />}
    {MP_ORDER.map((key, i) => {
      const from = i === 0 ? 0 : SC[key].startFrame;
      const last = i === MP_ORDER.length - 1;
      const nextFrom = last ? TOTAL_FRAMES_MERPATI : SC[MP_ORDER[i + 1]].startFrame;
      const Comp = MP_SCENES[key];
      return (
        <Sequence key={key} from={from} durationInFrames={nextFrom - from + (last ? 0 : OVERLAP)} name={key}>
          <DissolveMp first={i === 0}>
            <Comp />
          </DissolveMp>
        </Sequence>
      );
    })}
    <MerpatiCaptions />
  </AbsoluteFill>
);

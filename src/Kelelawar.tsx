import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./kelelawar_timing.json";
import { DissolveKl, KelelawarCaptions, KL_ORDER, KL_SCENES, TOTAL_FRAMES_KELELAWAR } from "./scenesKelelawar";

const OVERLAP = 8;
export { TOTAL_FRAMES_KELELAWAR };
const SC = timing.scenes as Record<string, { startFrame: number }>;

export const Kelelawar: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: "black" }}>
    {withAudio && <Audio src={staticFile("audio/kelelawar_master.mp3")} />}
    {KL_ORDER.map((key, i) => {
      const from = i === 0 ? 0 : SC[key].startFrame;
      const last = i === KL_ORDER.length - 1;
      const nextFrom = last ? TOTAL_FRAMES_KELELAWAR : SC[KL_ORDER[i + 1]].startFrame;
      const Comp = KL_SCENES[key];
      return (
        <Sequence key={key} from={from} durationInFrames={nextFrom - from + (last ? 0 : OVERLAP)} name={key}>
          <DissolveKl first={i === 0}>
            <Comp />
          </DissolveKl>
        </Sequence>
      );
    })}
    <KelelawarCaptions />
  </AbsoluteFill>
);

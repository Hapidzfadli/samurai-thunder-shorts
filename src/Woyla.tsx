import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timing from "./woyla_timing.json";
import { DissolveWoyla, TOTAL_FRAMES_WOYLA, WOYLA_ORDER, WOYLA_SCENES, WoylaCaptions } from "./scenesWoyla";

const OVERLAP = 8;
export { TOTAL_FRAMES_WOYLA };

export const Woyla: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#03060d" }}>
      <Audio src={staticFile("audio/woyla_master.mp3")} />
      {WOYLA_ORDER.map((key, i) => {
        const from = i === 0 ? 0 : timing.scenes[key].startFrame;
        const last = i === WOYLA_ORDER.length - 1;
        const nextFrom = last ? TOTAL_FRAMES_WOYLA : timing.scenes[WOYLA_ORDER[i + 1]].startFrame;
        const d = nextFrom - from;
        const Comp = WOYLA_SCENES[key];
        const hardCut = key === "klimaks"; // Explosive hard cut out of 0.75s sub-drop silence!
        return (
          <Sequence key={key} from={from} durationInFrames={d + (last || key === "ababa" ? 0 : OVERLAP)} name={key}>
            <DissolveWoyla first={i === 0} hardCut={hardCut}>
              <Comp />
            </DissolveWoyla>
          </Sequence>
        );
      })}
      <WoylaCaptions />
    </AbsoluteFill>
  );
};

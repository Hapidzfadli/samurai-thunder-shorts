import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { DURATIONS, SceneFleet, SceneHook, SceneOutro, SceneThunder, SceneWeapon } from "./scenes";
import { Finish } from "./ui";

const ORDER = [
  { key: "hook", C: SceneHook },
  { key: "fleet", C: SceneFleet },
  { key: "weapon", C: SceneWeapon },
  { key: "thunder", C: SceneThunder },
  { key: "outro", C: SceneOutro },
] as const;

export const TOTAL_FRAMES = Object.values(DURATIONS).reduce((a, b) => a + b, 0);

export const SamuraiThunder: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/part1_master.mp3")} />
      {ORDER.map(({ key, C }) => {
        const d = DURATIONS[key];
        const seq = (
          <Sequence key={key} from={from} durationInFrames={d} name={key}>
            <C />
          </Sequence>
        );
        from += d;
        return seq;
      })}
      <Finish />
    </AbsoluteFill>
  );
};

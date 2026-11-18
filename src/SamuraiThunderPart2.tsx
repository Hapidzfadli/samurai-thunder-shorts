import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import {
  DURATIONS_P2,
  SceneP2Chains,
  SceneP2Hook,
  SceneP2Outro,
  SceneP2Typhoon,
  SceneP2Wall,
} from "./scenesPart2";
import { Finish } from "./ui";

const ORDER_P2 = [
  { key: "hook", C: SceneP2Hook },
  { key: "wall", C: SceneP2Wall },
  { key: "chains", C: SceneP2Chains },
  { key: "typhoon", C: SceneP2Typhoon },
  { key: "outro", C: SceneP2Outro },
] as const;

export const TOTAL_FRAMES_P2 = Object.values(DURATIONS_P2).reduce((a, b) => a + b, 0);

export const SamuraiThunderPart2: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/part2_master.mp3")} />
      {ORDER_P2.map(({ key, C }) => {
        const d = DURATIONS_P2[key];
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

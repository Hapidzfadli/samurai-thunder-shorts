import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import {
  DURATIONS_WEWE,
  SceneWeweDiculik,
  SceneWeweHook,
  SceneWeweOutro,
  SceneWeweSenja,
  SceneWeweSosok,
} from "./scenesWewe";
import { Finish } from "./ui";

const ORDER_WEWE = [
  { key: "hook", C: SceneWeweHook },
  { key: "senja", C: SceneWeweSenja },
  { key: "sosok", C: SceneWeweSosok },
  { key: "diculik", C: SceneWeweDiculik },
  { key: "outro", C: SceneWeweOutro },
] as const;

export const TOTAL_FRAMES_WEWE = Object.values(DURATIONS_WEWE).reduce((a, b) => a + b, 0);

export const WeweGombel: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/wewe_master.mp3")} />
      {ORDER_WEWE.map(({ key, C }) => {
        const d = DURATIONS_WEWE[key];
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

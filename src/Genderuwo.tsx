import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import {
  DURATIONS_GEN,
  SceneGenFajar,
  SceneGenGedor,
  SceneGenHook,
  SceneGenKelor,
  SceneGenPanggil,
  SceneGenRumah,
  SceneGenTanda,
} from "./scenesGenderuwo";
import { Finish } from "./ui";

const ORDER_GEN = [
  { key: "hook", C: SceneGenHook },
  { key: "rumah", C: SceneGenRumah },
  { key: "tanda", C: SceneGenTanda },
  { key: "panggil", C: SceneGenPanggil },
  { key: "kelor", C: SceneGenKelor },
  { key: "gedor", C: SceneGenGedor },
  { key: "fajar", C: SceneGenFajar },
] as const;

export const TOTAL_FRAMES_GEN = Object.values(DURATIONS_GEN).reduce((a, b) => a + b, 0);

export const Genderuwo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/genderuwo_master.mp3")} />
      {ORDER_GEN.map(({ key, C }) => {
        const d = DURATIONS_GEN[key];
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

import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
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

/** Scenes dissolve into each other (no dip to black): the outgoing scene keeps playing for OVERLAP frames
 *  underneath while the incoming one fades in on top. Audio ambience leads the cut (J-cut). */
const OVERLAP = 10;
const CrossFade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const o = frames > 0 ? interpolate(frame, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_GEN = Object.values(DURATIONS_GEN).reduce((a, b) => a + b, 0);

export const Genderuwo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/genderuwo_master.mp3")} />
      {ORDER_GEN.map(({ key, C }, i) => {
        const d = DURATIONS_GEN[key];
        const last = i === ORDER_GEN.length - 1;
        const seq = (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <CrossFade frames={i === 0 ? 0 : OVERLAP}>
              <C />
            </CrossFade>
          </Sequence>
        );
        from += d;
        return seq;
      })}
      <Finish />
    </AbsoluteFill>
  );
};

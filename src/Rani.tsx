import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  DURATIONS_RANI,
  SceneRaniAkhir,
  SceneRaniAldi,
  SceneRaniCuriga,
  SceneRaniHook,
  SceneRaniHujan,
  SceneRaniSengat,
  SceneRaniTik,
} from "./scenesRani";

const ORDER = [
  { key: "hook", C: SceneRaniHook },
  { key: "curiga", C: SceneRaniCuriga },
  { key: "sengat", C: SceneRaniSengat },
  { key: "hujan", C: SceneRaniHujan },
  { key: "aldi", C: SceneRaniAldi },
  { key: "tik", C: SceneRaniTik },
  { key: "akhir", C: SceneRaniAkhir },
] as const;

/** Scenes dissolve into each other; the outgoing scene keeps playing underneath for OVERLAP frames. */
const OVERLAP = 8;
const CrossFade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const o = frames > 0 ? interpolate(frame, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_RANI = Object.values(DURATIONS_RANI).reduce((a, b) => a + b, 0);

export const Rani: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/rani_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_RANI[key];
        const last = i === ORDER.length - 1;
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
    </AbsoluteFill>
  );
};

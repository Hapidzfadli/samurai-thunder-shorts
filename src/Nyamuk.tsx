import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_NYAMUK, SceneNyamukAsap, SceneNyamukHook, SceneNyamukKelambu, SceneNyamukPagi, SceneNyamukRaket, SceneNyamukSenter, SceneNyamukTampar } from "./scenesNyamuk";

const ORDER = [
  { key: "hook", C: SceneNyamukHook },
  { key: "tampar", C: SceneNyamukTampar },
  { key: "raket", C: SceneNyamukRaket },
  { key: "asap", C: SceneNyamukAsap },
  { key: "senter", C: SceneNyamukSenter },
  { key: "pagi", C: SceneNyamukPagi },
  { key: "kelambu", C: SceneNyamukKelambu },
] as const;

/** Quick dissolve between scenes; the outgoing scene keeps playing underneath. */
const OVERLAP = 6;
const CrossFade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const o = frames > 0 ? interpolate(frame, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_NYAMUK = Object.values(DURATIONS_NYAMUK).reduce((a, b) => a + b, 0);

export const Nyamuk: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/nyamuk_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_NYAMUK[key];
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

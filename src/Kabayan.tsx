import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_KBY, SceneKPagi, SceneKJalan, SceneKPematang, SceneKSaung, SceneKSore, SceneKSeret, SceneKDorong, SceneKAkhir } from "./scenesKabayan";

const ORDER = [
  { key: "pagi", C: SceneKPagi },
  { key: "jalan", C: SceneKJalan },
  { key: "pematang", C: SceneKPematang },
  { key: "saung", C: SceneKSaung },
  { key: "sore", C: SceneKSore },
  { key: "seret", C: SceneKSeret },
  { key: "dorong", C: SceneKDorong },
  { key: "akhir", C: SceneKAkhir },
] as const;

/** Mostly glide-through: a short 6 frame dissolve only at place/time changes, hard cut elsewhere. */
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  const o = first || frame >= OVERLAP ? 1 : ease(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_KBY = Object.values(DURATIONS_KBY).reduce((a, b) => a + b, 0);

export const Kabayan: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/kabayan_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_KBY[key];
        const last = i === ORDER.length - 1;
        const seq = (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <Dissolve first={i === 0}>
              <C />
            </Dissolve>
          </Sequence>
        );
        from += d;
        return seq;
      })}
    </AbsoluteFill>
  );
};

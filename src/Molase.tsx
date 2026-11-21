import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_M, SceneMCat, SceneMCourt, SceneMAturan, SceneMGelombang, SceneMHangat, SceneMHook, SceneMMadu, SceneMPecah, SceneMRembes, SceneMTangki, SceneMTwist } from "./scenesMolase";

const ORDER = [
  { key: "hook", C: SceneMHook },
  { key: "tangki", C: SceneMTangki },
  { key: "rembes", C: SceneMRembes },
  { key: "cat", C: SceneMCat },
  { key: "hangat", C: SceneMHangat },
  { key: "pecah", C: SceneMPecah },
  { key: "gelombang", C: SceneMGelombang },
  { key: "madu", C: SceneMMadu },
  { key: "court", C: SceneMCourt },
  { key: "aturan", C: SceneMAturan },
  { key: "twist", C: SceneMTwist },
] as const;

/** Mostly glide-through: a short 6 frame dissolve only at place/time changes, hard cut elsewhere. */
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  const o = first || frame >= OVERLAP ? 1 : ease(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_M = Object.values(DURATIONS_M).reduce((a, b) => a + b, 0);

export const Molase: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/molase_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_M[key];
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

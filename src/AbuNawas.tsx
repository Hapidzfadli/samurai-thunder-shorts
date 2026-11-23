import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_ABU, SceneATantang, SceneAPasar, SceneAHari2, SceneAMalam, SceneAKentut, SceneAIstana, SceneABuka, SceneAAkhir } from "./scenesAbu";

const ORDER = [
  { key: "tantang", C: SceneATantang },
  { key: "pasar", C: SceneAPasar },
  { key: "hari2", C: SceneAHari2 },
  { key: "malam", C: SceneAMalam },
  { key: "kentut", C: SceneAKentut },
  { key: "istana", C: SceneAIstana },
  { key: "buka", C: SceneABuka },
  { key: "akhir", C: SceneAAkhir },
] as const;

/** Mostly glide-through: a short 6 frame dissolve only at place/time changes, hard cut elsewhere. */
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  const o = first || frame >= OVERLAP ? 1 : ease(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_ABU = Object.values(DURATIONS_ABU).reduce((a, b) => a + b, 0);

export const AbuNawas: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/abu_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_ABU[key];
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

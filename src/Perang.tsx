import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_PERANG, ScenePerangAkhir, ScenePerangHook, ScenePerangPagar, ScenePerangPanglima, ScenePerangRuntuh, ScenePerangSerbu, ScenePerangTembak } from "./scenesPerang";

const ORDER = [
  { key: "hook", C: ScenePerangHook },
  { key: "pagar", C: ScenePerangPagar },
  { key: "serbu", C: ScenePerangSerbu },
  { key: "tembak", C: ScenePerangTembak },
  { key: "runtuh", C: ScenePerangRuntuh },
  { key: "panglima", C: ScenePerangPanglima },
  { key: "akhir", C: ScenePerangAkhir },
] as const;

const OVERLAP = 6;
const Dip: React.FC<{ dur: number; first: boolean; last: boolean; children: React.ReactNode }> = ({ dur, first, last, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  let o = 1;
  if (!first && frame < OVERLAP) o = ease(frame / OVERLAP);
  if (!last && frame > dur) o = 1 - ease(Math.min(1, (frame - dur) / OVERLAP));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_PERANG = Object.values(DURATIONS_PERANG).reduce((a, b) => a + b, 0);

export const Perang: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/perang_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_PERANG[key];
        const last = i === ORDER.length - 1;
        const seq = (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <Dip dur={d} first={i === 0} last={last}>
              <C />
            </Dip>
          </Sequence>
        );
        from += d;
        return seq;
      })}
    </AbsoluteFill>
  );
};

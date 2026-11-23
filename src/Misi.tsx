import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_MISI, SceneMisiAkhir, SceneMisiHook, SceneMisiKucing, SceneMisiLorong, SceneMisiTangan, SceneMisiTwist } from "./scenesMisi";

const ORDER = [
  { key: "hook", C: SceneMisiHook },
  { key: "lorong", C: SceneMisiLorong },
  { key: "kucing", C: SceneMisiKucing },
  { key: "tangan", C: SceneMisiTangan },
  { key: "twist", C: SceneMisiTwist },
  { key: "akhir", C: SceneMisiAkhir },
] as const;

/** Cinematic cuts: hard cuts with a short dip to black between scenes (no whip pans for a serious tone). */
const OVERLAP = 6;
const Dip: React.FC<{ dur: number; first: boolean; last: boolean; children: React.ReactNode }> = ({ dur, first, last, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  let o = 1;
  if (!first && frame < OVERLAP) o = ease(frame / OVERLAP);
  if (!last && frame > dur) o = 1 - ease(Math.min(1, (frame - dur) / OVERLAP));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_MISI = Object.values(DURATIONS_MISI).reduce((a, b) => a + b, 0);

export const Misi: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/misi_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_MISI[key];
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

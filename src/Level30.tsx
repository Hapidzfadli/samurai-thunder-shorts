import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_L30, SceneL30Air, SceneL30Akhir, SceneL30Hook, SceneL30Lidah, SceneL30Otak, SceneL30Saraf } from "./scenesLevel30";

const ORDER = [
  { key: "hook", C: SceneL30Hook },
  { key: "lidah", C: SceneL30Lidah },
  { key: "saraf", C: SceneL30Saraf },
  { key: "otak", C: SceneL30Otak },
  { key: "air", C: SceneL30Air },
  { key: "akhir", C: SceneL30Akhir },
] as const;

/** Whip pan: the outgoing scene is flung left while the next one slams in from the right, both motion-blurred. */
const OVERLAP = 8;
const W = 1080;
const Whip: React.FC<{ dur: number; first: boolean; last: boolean; children: React.ReactNode }> = ({ dur, first, last, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.7, 0, 0.3, 1);
  let x = 0;
  if (!first && frame < OVERLAP) x = (1 - ease(frame / OVERLAP)) * W;
  if (!last && frame > dur) x = -ease(Math.min(1, (frame - dur) / OVERLAP)) * W;
  const blur = Math.abs(x) > 0 ? Math.min(26, Math.abs(x) / 22) : 0;
  return <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_L30 = Object.values(DURATIONS_L30).reduce((a, b) => a + b, 0);

export const Level30: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/level30_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_L30[key];
        const last = i === ORDER.length - 1;
        const seq = (
          <Sequence key={key} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={key}>
            <Whip dur={d} first={i === 0} last={last}>
              <C />
            </Whip>
          </Sequence>
        );
        from += d;
        return seq;
      })}
    </AbsoluteFill>
  );
};

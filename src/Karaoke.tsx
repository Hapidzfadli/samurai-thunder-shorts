import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_KARAOKE, SceneKDalam, SceneKHook, SceneKPagar, SceneKPanggung, SceneKRizal, SceneKRonda, SceneKTini } from "./scenesKaraoke";

const ORDER = [
  { key: "hook", C: SceneKHook },
  { key: "tini", C: SceneKTini },
  { key: "rizal", C: SceneKRizal },
  { key: "ronda", C: SceneKRonda },
  { key: "pagar", C: SceneKPagar },
  { key: "dalam", C: SceneKDalam },
  { key: "panggung", C: SceneKPanggung },
] as const;

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

export const TOTAL_FRAMES_KARAOKE = Object.values(DURATIONS_KARAOKE).reduce((a, b) => a + b, 0);

export const Karaoke: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/karaoke_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_KARAOKE[key];
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

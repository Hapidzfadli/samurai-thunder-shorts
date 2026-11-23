import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_ANCOL, SceneAncolAkhir, SceneAncolBiang, SceneAncolChat, SceneAncolCoaster, SceneAncolEskrim, SceneAncolFoto, SceneAncolJalan, SceneAncolJemput, SceneAncolMakan, SceneAncolMalu, SceneAncolMinum, SceneAncolMuter, SceneAncolPulang, SceneAncolRencana } from "./scenesAncol";

const ORDER = [
  { key: "chat", C: SceneAncolChat },
  { key: "rencana", C: SceneAncolRencana },
  { key: "jemput", C: SceneAncolJemput },
  { key: "malu", C: SceneAncolMalu },
  { key: "jalan", C: SceneAncolJalan },
  { key: "foto", C: SceneAncolFoto },
  { key: "muter", C: SceneAncolMuter },
  { key: "minum", C: SceneAncolMinum },
  { key: "eskrim", C: SceneAncolEskrim },
  { key: "biang", C: SceneAncolBiang },
  { key: "makan", C: SceneAncolMakan },
  { key: "coaster", C: SceneAncolCoaster },
  { key: "pulang", C: SceneAncolPulang },
  { key: "akhir", C: SceneAncolAkhir },
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

export const TOTAL_FRAMES_ANCOL = Object.values(DURATIONS_ANCOL).reduce((a, b) => a + b, 0);

export const Ancol: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/ancol_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_ANCOL[key];
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

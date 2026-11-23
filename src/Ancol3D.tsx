import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_A3, SceneA3Akhir, SceneA3Biang, SceneA3Bersiap, SceneA3Cair, SceneA3Chat, SceneA3Coaster, SceneA3Foto, SceneA3Jemput, SceneA3Makan, SceneA3Motor, SceneA3Muter, SceneA3Pulang, SceneA3Rencana } from "./scenesAncol3D";

const ORDER = [
  { key: "chat", C: SceneA3Chat },
  { key: "rencana", C: SceneA3Rencana },
  { key: "bersiap", C: SceneA3Bersiap },
  { key: "jemput", C: SceneA3Jemput },
  { key: "motor", C: SceneA3Motor },
  { key: "foto", C: SceneA3Foto },
  { key: "muter", C: SceneA3Muter },
  { key: "cair", C: SceneA3Cair },
  { key: "biang", C: SceneA3Biang },
  { key: "makan", C: SceneA3Makan },
  { key: "coaster", C: SceneA3Coaster },
  { key: "pulang", C: SceneA3Pulang },
  { key: "akhir", C: SceneA3Akhir },
] as const;

/** Romantic dissolve: the incoming scene fades in over the outgoing one (no whip pans, no dip to black). */
const OVERLAP = 12;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  const o = first || frame >= OVERLAP ? 1 : ease(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_A3 = Object.values(DURATIONS_A3).reduce((a, b) => a + b, 0);

export const Ancol3D: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/ancol3d_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_A3[key];
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

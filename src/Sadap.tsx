import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DURATIONS_S, SceneSIstana, SceneSKerja, SceneSServer, SceneSDaftar, SceneSBosan, SceneSHapus, SceneSLapor, SceneSBareskrim, SceneSPenutup } from "./scenesSadap";

const ORDER = [
  { key: "istana", C: SceneSIstana },
  { key: "kerja", C: SceneSKerja },
  { key: "server", C: SceneSServer },
  { key: "daftar", C: SceneSDaftar },
  { key: "bosan", C: SceneSBosan },
  { key: "hapus", C: SceneSHapus },
  { key: "lapor", C: SceneSLapor },
  { key: "bareskrim", C: SceneSBareskrim },
  { key: "penutup", C: SceneSPenutup },
] as const;

/** Mostly glide-through: a short 6 frame dissolve only at place/time changes, hard cut elsewhere. */
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  const o = first || frame >= OVERLAP ? 1 : ease(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const TOTAL_FRAMES_S = Object.values(DURATIONS_S).reduce((a, b) => a + b, 0);

export const Sadap: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/sadap_master.mp3")} />
      {ORDER.map(({ key, C }, i) => {
        const d = DURATIONS_S[key];
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

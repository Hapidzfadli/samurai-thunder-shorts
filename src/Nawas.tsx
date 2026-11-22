import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DUR_NW, NW_ORDER, NwScene, SceneNwGratis, SceneNwHook, SceneNwHpEmas, SceneNwLahir, SceneNwMeninggal, SceneNwPelit, SceneNwPinjam, SceneNwPunch } from "./scenesNawas";

const C: Record<NwScene, React.FC> = {
  hook: SceneNwHook,
  pelit: SceneNwPelit,
  pinjam: SceneNwPinjam,
  lahir: SceneNwLahir,
  hpemas: SceneNwHpEmas,
  meninggal: SceneNwMeninggal,
  punchline: SceneNwPunch,
  gratis: SceneNwGratis,
};
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= OVERLAP ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
export const TOTAL_FRAMES_NW = NW_ORDER.reduce((a, k) => a + DUR_NW(k), 0);
export const Nawas: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/nawas_master.mp3")} />
      {NW_ORDER.map((k, i) => {
        const d = DUR_NW(k);
        const last = i === NW_ORDER.length - 1;
        const Comp = C[k];
        const seq = (
          <Sequence key={k} from={from} durationInFrames={d + (last ? 0 : OVERLAP)} name={k}>
            <Dissolve first={i === 0}>
              <Comp />
            </Dissolve>
          </Sequence>
        );
        from += d;
        return seq;
      })}
    </AbsoluteFill>
  );
};

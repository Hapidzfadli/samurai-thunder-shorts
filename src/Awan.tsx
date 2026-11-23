import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import { AW_ORDER, AwScene, DUR_AW, SceneAwBulan, SceneAwHariH, SceneAwHook, SceneAwKejutan, SceneAwLempar, SceneAwPerintah, SceneAwRuntuh, SceneAwSanggup, SceneAwSedih, SceneAwSiap } from "./scenesAwan";

const C: Record<AwScene, React.FC> = {
  hook: SceneAwHook,
  perintah: SceneAwPerintah,
  sedih: SceneAwSedih,
  sanggup: SceneAwSanggup,
  siap: SceneAwSiap,
  harih: SceneAwHariH,
  lempar: SceneAwLempar,
  runtuh: SceneAwRuntuh,
  kejutan: SceneAwKejutan,
  bulan: SceneAwBulan,
};
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const o = first || frame >= OVERLAP ? 1 : Easing.bezier(0.4, 0, 0.6, 1)(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
export const TOTAL_FRAMES_AW = AW_ORDER.reduce((a, k) => a + DUR_AW(k), 0);
export const Awan: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/awan_master.mp3")} />
      {AW_ORDER.map((k, i) => {
        const d = DUR_AW(k);
        const last = i === AW_ORDER.length - 1;
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

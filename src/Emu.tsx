import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, staticFile, useCurrentFrame } from "remotion";
import {
  DUR_EMU,
  EMU_ORDER,
  EmuScene,
  SceneEmuAkhir,
  SceneEmuBendungan,
  SceneEmuDatang,
  SceneEmuGerilya,
  SceneEmuHook,
  SceneEmuKantor,
  SceneEmuKutipan,
  SceneEmuSerbu,
  SceneEmuTruk,
} from "./scenesEmu";

const C: Record<EmuScene, React.FC> = {
  hook: SceneEmuHook,
  serbu: SceneEmuSerbu,
  kantor: SceneEmuKantor,
  datang: SceneEmuDatang,
  gerilya: SceneEmuGerilya,
  bendungan: SceneEmuBendungan,
  truk: SceneEmuTruk,
  kutipan: SceneEmuKutipan,
  akhir: SceneEmuAkhir,
};
const OVERLAP = 6;
const Dissolve: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.4, 0, 0.6, 1);
  const o = first || frame >= OVERLAP ? 1 : ease(frame / OVERLAP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
export const TOTAL_FRAMES_EMU = EMU_ORDER.reduce((a, k) => a + DUR_EMU(k), 0);
export const Emu: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <Audio src={staticFile("audio/emu_master.mp3")} />
      {EMU_ORDER.map((k, i) => {
        const d = DUR_EMU(k);
        const last = i === EMU_ORDER.length - 1;
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

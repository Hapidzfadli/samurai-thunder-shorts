import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import {
  DANTZIG_TIMING,
  SceneDantzigAkhir,
  SceneDantzigHook,
  SceneDantzigKamar,
  SceneDantzigKantor,
  SceneDantzigKelas,
  SceneDantzigMinggu,
  SceneDantzigTwist,
  TOTAL_FRAMES_DANTZIG,
} from "./scenesDantzig";

export { TOTAL_FRAMES_DANTZIG };

const SCENE_MAP: Record<string, React.FC> = {
  hook: SceneDantzigHook,
  kelas: SceneDantzigKelas,
  kamar: SceneDantzigKamar,
  kantor: SceneDantzigKantor,
  minggu: SceneDantzigMinggu,
  twist: SceneDantzigTwist,
  akhir: SceneDantzigAkhir,
};

const CaptionsOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const active = DANTZIG_TIMING.captions.find((c) => f >= c.startFrame && f < c.endFrame);
  if (!active) return null;
  const age = f - active.startFrame;
  const pop = 1 + 0.12 * Math.max(0, 1 - age / 4);
  const fill = active.highlight ? "#ffe047" : active.voice === "ara" ? "#b7f0ff" : "#ffffff";
  const fontSize = active.text.length > 10 ? 74 : 84;

  return (
    <svg
      width={1080}
      height={1920}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <text
        x={540}
        y={1445}
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontWeight={900}
        fontSize={fontSize * pop}
        fill={fill}
        stroke="#0e0c14"
        strokeWidth={fontSize * 0.22}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      >
        {active.text}
      </text>
    </svg>
  );
};

export const Dantzig: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  return (
    <AbsoluteFill style={{ background: "#141622" }}>
      {withAudio && <Audio src={staticFile("audio/dantzig_master.mp3")} />}
      {DANTZIG_TIMING.order.map((key) => {
        const meta = DANTZIG_TIMING.scenes[key as keyof typeof DANTZIG_TIMING.scenes];
        const Comp = SCENE_MAP[key];
        if (!meta || !Comp) return null;
        return (
          <Sequence
            key={key}
            from={meta.startFrame}
            durationInFrames={meta.durationInFrames}
            name={key}
          >
            <Comp />
          </Sequence>
        );
      })}
      <CaptionsOverlay />
    </AbsoluteFill>
  );
};

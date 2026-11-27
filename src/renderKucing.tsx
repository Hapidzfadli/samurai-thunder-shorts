import React from "react";
import { Composition, registerRoot } from "remotion";
import { KucingCia, TOTAL_FRAMES_KUCING } from "./KucingCia";

const KucingRoot: React.FC = () => (
  <Composition
    id="KucingCia"
    component={KucingCia}
    durationInFrames={TOTAL_FRAMES_KUCING}
    fps={30}
    width={1080}
    height={1920}
  />
);

registerRoot(KucingRoot);

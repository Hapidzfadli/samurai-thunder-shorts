import React from "react";
import { Composition, registerRoot } from "remotion";
import { SheetKucingKarakter } from "./SheetKucing";

const PreviewRoot: React.FC = () => (
  <Composition
    id="SheetKucingKarakter"
    component={SheetKucingKarakter}
    durationInFrames={1}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(PreviewRoot);

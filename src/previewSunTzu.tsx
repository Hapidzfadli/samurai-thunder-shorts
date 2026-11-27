import React from "react";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import {Composition,registerRoot} from "remotion";
import {SheetSunTzuKarakter,SheetSunTzuEkspresi} from "./SheetSunTzu";
import {SunTzuPreviewWorld} from "./SunTzuPreviewWorld";
const PreviewRoot:React.FC=()=> <>
<Composition id="SheetSunTzuKarakter" component={SheetSunTzuKarakter} durationInFrames={1} fps={30} width={2400} height={1500}/>
<Composition id="SheetSunTzuEkspresi" component={SheetSunTzuEkspresi} durationInFrames={1} fps={30} width={2400} height={1450}/>
<Composition id="SunTzuPreviewWorld" component={SunTzuPreviewWorld} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{view:0,story:false}}/>
</>;
registerRoot(PreviewRoot);

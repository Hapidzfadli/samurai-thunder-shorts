import "@fontsource/anton/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "@fontsource/noto-serif-jp/900.css";
import { Composition } from "remotion";
import { SamuraiThunder, TOTAL_FRAMES } from "./SamuraiThunder";
import { SamuraiThunderPart2, TOTAL_FRAMES_P2 } from "./SamuraiThunderPart2";
import { TOTAL_FRAMES_WEWE, WeweGombel } from "./WeweGombel";
import { Genderuwo, TOTAL_FRAMES_GEN } from "./Genderuwo";
import { Rani, TOTAL_FRAMES_RANI } from "./Rani";
import { Nyamuk, TOTAL_FRAMES_NYAMUK } from "./Nyamuk";
import { Level30, TOTAL_FRAMES_L30 } from "./Level30";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Level30"
        component={Level30}
        durationInFrames={TOTAL_FRAMES_L30}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Nyamuk"
        component={Nyamuk}
        durationInFrames={TOTAL_FRAMES_NYAMUK}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Rani"
        component={Rani}
        durationInFrames={TOTAL_FRAMES_RANI}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Genderuwo"
        component={Genderuwo}
        durationInFrames={TOTAL_FRAMES_GEN}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="WeweGombel"
        component={WeweGombel}
        durationInFrames={TOTAL_FRAMES_WEWE}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SamuraiThunder"
        component={SamuraiThunder}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SamuraiThunderPart2"
        component={SamuraiThunderPart2}
        durationInFrames={TOTAL_FRAMES_P2}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

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
import { Soda, TOTAL_FRAMES_SODA } from "./Soda";
import { Paket, TOTAL_FRAMES_PAKET } from "./Paket";
import { Kos, TOTAL_FRAMES_KOS } from "./Kos";
import { Lift, TOTAL_FRAMES_LIFT } from "./Lift";
import { SheetLift, SheetLiftExpr } from "./SheetLift";
import { SheetKaraoke } from "./SheetKaraoke";
import { SheetMisi } from "./SheetMisi";
import { MotionTest, MOTION_TEST_FRAMES } from "./MotionTest";
import { RigTest, RIG_TEST_FRAMES } from "./RigTest";
import { Misi, TOTAL_FRAMES_MISI } from "./Misi";
import { SheetWar } from "./SheetWar";
import { Perang, TOTAL_FRAMES_PERANG } from "./Perang";
import { Karaoke, TOTAL_FRAMES_KARAOKE } from "./Karaoke";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Karaoke"
        component={Karaoke}
        durationInFrames={TOTAL_FRAMES_KARAOKE}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Misi"
        component={Misi}
        durationInFrames={TOTAL_FRAMES_MISI}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Perang"
        component={Perang}
        durationInFrames={TOTAL_FRAMES_PERANG}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition id="SheetWar" component={SheetWar} durationInFrames={1} fps={30} width={2000} height={1080} />
      <Composition id="RigTest" component={RigTest} durationInFrames={RIG_TEST_FRAMES} fps={30} width={1080} height={1080} />
      <Composition id="MotionTest" component={MotionTest} durationInFrames={MOTION_TEST_FRAMES} fps={30} width={1080} height={1080} />
      <Composition id="SheetMisi" component={SheetMisi} durationInFrames={1} fps={30} width={2000} height={1080} />
      <Composition id="SheetKaraoke" component={SheetKaraoke} durationInFrames={1} fps={30} width={2000} height={1080} />
      <Composition id="SheetLift" component={SheetLift} durationInFrames={1} fps={30} width={2000} height={1080} />
      <Composition id="SheetLiftExpr" component={SheetLiftExpr} durationInFrames={1} fps={30} width={2000} height={1080} />
      <Composition
        id="Lift"
        component={Lift}
        durationInFrames={TOTAL_FRAMES_LIFT}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Kos"
        component={Kos}
        durationInFrames={TOTAL_FRAMES_KOS}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Paket"
        component={Paket}
        durationInFrames={TOTAL_FRAMES_PAKET}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Soda"
        component={Soda}
        durationInFrames={TOTAL_FRAMES_SODA}
        fps={30}
        width={1080}
        height={1920}
      />
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

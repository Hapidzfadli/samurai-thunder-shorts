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
import { SheetSehat } from "./SheetSehat";
import { Hamil, TOTAL_FRAMES_HAMIL } from "./Hamil";
import { SheetAncol } from "./SheetAncol";
import { Ancol3DTest } from "./Ancol3DTest";
import { Ancol3D, TOTAL_FRAMES_A3 } from "./Ancol3D";
import { Molase, TOTAL_FRAMES_M } from "./Molase";
import { SheetSadap } from "./SheetSadap";
import { Kabayan, TOTAL_FRAMES_KBY } from "./Kabayan";
import { StyleEmuA, StyleEmuB } from "./StyleEmu";
import { Kelompok, TOTAL_FRAMES_KEL } from "./Kelompok";
import { SheetKelompok, SheetKelompokExpr, SheetKelompokProps } from "./SheetKelompok";
import { SheetNawas, SheetNawasExpr, SheetNawasProps } from "./SheetNawas";
import { Nawas, TOTAL_FRAMES_NW } from "./Nawas";
import { SheetAwan, SheetAwanProps } from "./SheetAwan";
import { Awan, TOTAL_FRAMES_AW } from "./Awan";
import { Emu, TOTAL_FRAMES_EMU } from "./Emu";
import { H_KBY, SheetKabayan, SheetKabayanExpr, SheetKabayanPropDapur, SheetKabayanPropKampung, SheetKabayanPropSawah, SheetKabayanSawah } from "./SheetKabayan";
import { AbuNawas, TOTAL_FRAMES_ABU } from "./AbuNawas";
import { H_ABU, SheetAbu, SheetAbuAula, SheetAbuCerita, SheetAbuExpr, SheetAbuIstana, SheetAbuRumah } from "./SheetAbu";
import { Sadap, TOTAL_FRAMES_S } from "./Sadap";
import { H_SADAP, SheetSadapBareskrim, SheetSadapIstana, SheetSadapKerja, SheetSadapServer, SheetSadapWarung } from "./SheetSadapProps";
import { SheetPropsDapur, SheetPropsKantor, SheetPropsLuar, SheetPropsSidang, SheetPropsTangki } from "./SheetMolaseProps";
import { Ancol, TOTAL_FRAMES_ANCOL } from "./Ancol";
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
      <Composition id="Hamil" component={Hamil} durationInFrames={TOTAL_FRAMES_HAMIL} fps={30} width={1080} height={1920} />
      <Composition id="Ancol" component={Ancol} durationInFrames={TOTAL_FRAMES_ANCOL} fps={30} width={1080} height={1920} />
      <Composition id="SheetPropsLuar" component={SheetPropsLuar} durationInFrames={1} fps={30} width={2000} height={1732} />
      <Composition id="SheetPropsTangki" component={SheetPropsTangki} durationInFrames={1} fps={30} width={2000} height={1245} />
      <Composition id="SheetPropsDapur" component={SheetPropsDapur} durationInFrames={1} fps={30} width={2000} height={1245} />
      <Composition id="SheetPropsSidang" component={SheetPropsSidang} durationInFrames={1} fps={30} width={2000} height={1245} />
      <Composition id="SheetPropsKantor" component={SheetPropsKantor} durationInFrames={1} fps={30} width={2000} height={1245} />
      <Composition id="SheetSadapIstana" component={SheetSadapIstana} durationInFrames={1} fps={30} width={2000} height={H_SADAP.Istana} />
      <Composition id="SheetSadapKerja" component={SheetSadapKerja} durationInFrames={1} fps={30} width={2000} height={H_SADAP.Kerja} />
      <Composition id="SheetSadapServer" component={SheetSadapServer} durationInFrames={1} fps={30} width={2000} height={H_SADAP.Server} />
      <Composition id="SheetSadapWarung" component={SheetSadapWarung} durationInFrames={1} fps={30} width={2000} height={H_SADAP.Warung} />
      <Composition id="SheetSadapBareskrim" component={SheetSadapBareskrim} durationInFrames={1} fps={30} width={2000} height={H_SADAP.Bareskrim} />
      <Composition id="Sadap" component={Sadap} durationInFrames={TOTAL_FRAMES_S} fps={30} width={1080} height={1920} />
      <Composition id="AbuNawas" component={AbuNawas} durationInFrames={TOTAL_FRAMES_ABU} fps={30} width={1080} height={1920} />
      <Composition id="SheetAbu" component={SheetAbu} durationInFrames={1} fps={30} width={2000} height={1150} />
      <Composition id="SheetAbuExpr" component={SheetAbuExpr} durationInFrames={1} fps={30} width={2000} height={900} />
      <Composition id="SheetAbuIstana" component={SheetAbuIstana} durationInFrames={1} fps={30} width={2000} height={H_ABU.Istana} />
      <Composition id="SheetAbuAula" component={SheetAbuAula} durationInFrames={1} fps={30} width={2000} height={H_ABU.Aula} />
      <Composition id="SheetAbuRumah" component={SheetAbuRumah} durationInFrames={1} fps={30} width={2000} height={H_ABU.Rumah} />
      <Composition id="SheetAbuCerita" component={SheetAbuCerita} durationInFrames={1} fps={30} width={2000} height={H_ABU.Cerita} />
      <Composition id="Kabayan" component={Kabayan} durationInFrames={TOTAL_FRAMES_KBY} fps={30} width={1080} height={1920} />
      <Composition id="Emu" component={Emu} durationInFrames={TOTAL_FRAMES_EMU} fps={30} width={1080} height={1920} />
      <Composition id="Kelompok" component={Kelompok} durationInFrames={TOTAL_FRAMES_KEL} fps={30} width={1080} height={1920} />
      <Composition id="Nawas" component={Nawas} durationInFrames={TOTAL_FRAMES_NW} fps={30} width={1080} height={1920} />
      <Composition id="Awan" component={Awan} durationInFrames={TOTAL_FRAMES_AW} fps={30} width={1080} height={1920} />
      <Composition id="SheetAwan" component={SheetAwan} durationInFrames={1} fps={30} width={2000} height={1000} />
      <Composition id="SheetAwanProps" component={SheetAwanProps} durationInFrames={1} fps={30} width={2000} height={2000} />
      <Composition id="SheetNawas" component={SheetNawas} durationInFrames={1} fps={30} width={2000} height={1150} />
      <Composition id="SheetNawasExpr" component={SheetNawasExpr} durationInFrames={1} fps={30} width={2000} height={800} />
      <Composition id="SheetNawasProps" component={SheetNawasProps} durationInFrames={1} fps={30} width={2000} height={2000} />
      <Composition id="SheetKelompok" component={SheetKelompok} durationInFrames={1} fps={30} width={2000} height={1150} />
      <Composition id="SheetKelompokExpr" component={SheetKelompokExpr} durationInFrames={1} fps={30} width={2000} height={800} />
      <Composition id="SheetKelompokProps" component={SheetKelompokProps} durationInFrames={1} fps={30} width={2000} height={2000} />
      <Composition id="StyleEmuA" component={StyleEmuA} durationInFrames={60} fps={30} width={1080} height={1920} />
      <Composition id="StyleEmuB" component={StyleEmuB} durationInFrames={60} fps={30} width={1080} height={1920} />
      <Composition id="SheetKabayan" component={SheetKabayan} durationInFrames={1} fps={30} width={2000} height={1150} />
      <Composition id="SheetKabayanExpr" component={SheetKabayanExpr} durationInFrames={1} fps={30} width={2000} height={900} />
      <Composition id="SheetKabayanSawah" component={SheetKabayanSawah} durationInFrames={1} fps={30} width={2000} height={1100} />
      <Composition id="SheetKabayanPropSawah" component={SheetKabayanPropSawah} durationInFrames={1} fps={30} width={2000} height={H_KBY.Sawah} />
      <Composition id="SheetKabayanPropKampung" component={SheetKabayanPropKampung} durationInFrames={1} fps={30} width={2000} height={H_KBY.Kampung} />
      <Composition id="SheetKabayanPropDapur" component={SheetKabayanPropDapur} durationInFrames={1} fps={30} width={2000} height={H_KBY.Dapur} />
      <Composition id="SheetSadap" component={SheetSadap} durationInFrames={1} fps={30} width={2000} height={1150} />
      <Composition id="Molase" component={Molase} durationInFrames={TOTAL_FRAMES_M} fps={30} width={1080} height={1920} />
      <Composition id="Ancol3D" component={Ancol3D} durationInFrames={TOTAL_FRAMES_A3} fps={30} width={1080} height={1920} />
      <Composition id="Ancol3DTest" component={Ancol3DTest} durationInFrames={1} fps={30} width={1080} height={1080} />
      <Composition id="SheetAncol" component={SheetAncol} durationInFrames={1} fps={30} width={2000} height={1080} />
      <Composition id="SheetSehat" component={SheetSehat} durationInFrames={1} fps={30} width={2000} height={1080} />
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

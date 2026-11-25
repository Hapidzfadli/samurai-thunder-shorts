import React from "react";
import { AbsoluteFill } from "remotion";
import { Cam, CinematicStage, GoldenWildWestLighting, Vec3 } from "./three/CinematicPipeline";
import { CowboyCharacter, HollywoodBulletCam, WildWestTown } from "./three/objectsDuel";

const ThumbScene: React.FC<{ w: number; h: number; isShorts: boolean }> = ({ w, h, isShorts }) => {
  const bulletPos: Vec3 = [-0.28, 1.32, 3.25];
  const muzzlePos: Vec3 = [-0.3, 1.32, 4.45];
  const cam: Cam = isShorts
    ? { pos: [-0.02, 1.37, 2.96], look: [-0.28, 1.32, 3.28], fov: 40 }
    : { pos: [0.04, 1.37, 2.96], look: [-0.28, 1.32, 3.28], fov: 40 };

  return (
    <AbsoluteFill style={{ width: w, height: h }}>
      <CinematicStage
        w={w}
        h={h}
        cam={cam}
        postfx={{ dofTarget: bulletPos, dofRange: 0.55, bokehScale: 5.5, bloomIntensity: 0.65 }}
      >
        <GoldenWildWestLighting sunBoost={1.25} />
        <WildWestTown frame={120} />
        <CowboyCharacter
          pos={[0, 0, 5.2]}
          yaw={Math.PI}
          coatColor="#8c6239"
          vestColor="#3a2b24"
          hatColor="#4e3624"
          kerchiefColor="#a83226"
          hasMustache
          mustacheColor="#d0d4dc"
          expr="focused"
          armAngle={1.38}
          gunInHand
          gunInHolster={false}
        />
        <CowboyCharacter
          pos={[0, 0, -5.2]}
          yaw={0}
          coatColor="#2b2630"
          vestColor="#782228"
          hatColor="#1e1b22"
          kerchiefColor="#d49b35"
          expr="shocked"
          armAngle={1.1}
          gunInHand
          gunInHolster={false}
          gunFinish="silver"
        />
        <HollywoodBulletCam bulletPos={bulletPos} muzzlePos={muzzlePos} slowMoProgress={0.42} frame={45} />
      </CinematicStage>

      <div
        style={{
          position: "absolute",
          top: isShorts ? 140 : 60,
          left: isShorts ? 50 : 70,
          right: isShorts ? 50 : "auto",
          textAlign: isShorts ? "center" : "left",
          fontFamily: "Anton, Inter, sans-serif",
          fontSize: isShorts ? 84 : 88,
          lineHeight: 1.04,
          color: "#ffd23f",
          textShadow: "0 8px 0 #120d16, 0 0 32px rgba(0,0,0,0.8)",
          pointerEvents: "none",
        }}
      >
        PENEMBAK KEDUA
        <br />
        <span style={{ color: "#ffffff" }}>SELALU MENANG?!</span>
      </div>
    </AbsoluteFill>
  );
};

export const ThumbDuelShorts: React.FC = () => <ThumbScene w={1080} h={1920} isShorts />;
export const ThumbDuelYoutube: React.FC = () => <ThumbScene w={1920} h={1080} isShorts={false} />;

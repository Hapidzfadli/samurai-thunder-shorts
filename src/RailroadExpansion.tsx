import React from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  CanyonEnvironment,
  RailroadTrack3D,
  SteamTrain3D,
  StickCharacter3D,
} from "./three/railroadObjects";

const FPS = 30;
const SCENE_FRAMES = 180; // 6s per scene * 6 scenes = 36s (1080 frames)
export const TOTAL_FRAMES_RAILROAD = SCENE_FRAMES * 6;

interface CaptionCue {
  from: number;
  to: number;
  text: string;
  highlight?: boolean;
}

const CAPTIONS: CaptionCue[] = [
  // Scene 1 (0 - 180)
  { from: 6, to: 42, text: "Menggergaji celah" },
  { from: 42, to: 82, text: "di setiap rel kereta.", highlight: true },
  { from: 88, to: 132, text: "Semua mengira" },
  { from: 132, to: 175, text: "dia sudah gila.", highlight: true },
  // Scene 2 (180 - 360)
  { from: 185, to: 235, text: "Dua perusahaan berlomba" },
  { from: 235, to: 280, text: "di ngarai terdalam.", highlight: true },
  { from: 285, to: 320, text: "SIAPA CEPAT," },
  { from: 320, to: 356, text: "KUASAI SEMUANYA!", highlight: true },
  // Scene 3 (360 - 540)
  { from: 365, to: 410, text: "Bosnya murka" },
  { from: 410, to: 455, text: "wajahnya UNGU!", highlight: true },
  { from: 455, to: 500, text: '"Kau merusak relku!"' },
  { from: 500, to: 536, text: "Dia tetap menolak.", highlight: true },
  // Scene 4 (540 - 720)
  { from: 545, to: 595, text: "Rel lawan mulus" },
  { from: 595, to: 635, text: "tanpa celah.", highlight: true },
  { from: 638, to: 680, text: "Kereta mereka senyap," },
  { from: 680, to: 716, text: "keretanya CLICKETY-CLACK!", highlight: true },
  // Scene 5 (720 - 900)
  { from: 725, to: 770, text: "MUSIM PANAS TIBA!", highlight: true },
  { from: 770, to: 820, text: "Celah rel menyusut," },
  { from: 820, to: 860, text: "rel lawan mulai" },
  { from: 860, to: 896, text: "MENJERIT KEPANASAN!", highlight: true },
  // Scene 6 (900 - 1080)
  { from: 905, to: 950, text: "Di hari terpanas," },
  { from: 950, to: 990, text: "celahnya menutup PAS!", highlight: true },
  { from: 992, to: 1035, text: "Rel sempurna lawan" },
  { from: 1035, to: 1076, text: "MELENGKUNG & MELEDAK!", highlight: true },
];

const SubtitleOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const cue = CAPTIONS.find((c) => frame >= c.from && frame < c.to);
  if (!cue) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 340,
        left: 60,
        right: 60,
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1.15,
        color: cue.highlight ? "#facc15" : "#ffffff",
        textShadow:
          "-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 8px 18px rgba(0,0,0,0.8)",
        pointerEvents: "none",
      }}
    >
      {cue.text}
    </div>
  );
};

/* ---------------- SCENE 1: HOOK (Sawing Gaps) ---------------- */
const Scene1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const camX = interpolate(f, [0, 180], [-2.2, 0.8]);
  const camZ = interpolate(f, [0, 180], [4.6, 3.3]);
  const trainZ = interpolate(f, [0, 180], [-26, -7]);

  return (
    <ThreeCanvas
      width={1080}
      height={1920}
      camera={{ position: [camX, 1.85, camZ], fov: 46 }}
    >
      <color attach="background" args={["#3b82f6"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[8, 12, 6]} intensity={1.5} color="#fff5e1" />
      <CanyonEnvironment />
      <RailroadTrack3D gapWidth={0.45} length={50} />
      <StickCharacter3D
        role="engineer"
        position={[-1.0, 0.1, 0.4]}
        rotation={[0, 0.7, 0]}
        holding="saw"
        actionPhase={t * 8}
        expression="smug"
      />
      <SteamTrain3D position={[0, 0.15, trainZ]} smokePhase={t * 1.4} />
    </ThreeCanvas>
  );
};

/* ---------------- SCENE 2: STAKES (Canyon & Gold) ---------------- */
const Scene2Stakes: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const camY = interpolate(f, [0, 180], [4.5, 2.2]);
  const camZ = interpolate(f, [0, 180], [11.5, 5.2]);

  return (
    <ThreeCanvas
      width={1080}
      height={1920}
      camera={{ position: [0, camY, camZ], fov: 46 }}
    >
      <color attach="background" args={["#60a5fa"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 12, 8]} intensity={1.5} />
      <CanyonEnvironment />
      {/* Red podium */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[4.5, 0.3, 4.5]} />
        <meshStandardMaterial color="#b03a2e" />
      </mesh>
      {/* Gold bars / bags */}
      {[-1.3, 1.3, -0.7, 0.7].map((x, idx) => (
        <mesh key={idx} position={[x, 0.65, idx > 1 ? -1.1 : -0.4]}>
          <sphereGeometry args={[0.42, 12, 12]} />
          <meshStandardMaterial color="#f1c40f" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      <StickCharacter3D
        role="competitorBoss"
        position={[0, 0.3, 0.3]}
        expression="happy"
        actionPhase={t * 3}
      />
    </ThreeCanvas>
  );
};

/* ---------------- SCENE 3: CONFLICT (Boss Purple) ---------------- */
const Scene3Conflict: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const anger = interpolate(f, [45, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headHex = anger > 0.35 ? "#7d3c98" : "#ffffff";
  const camZ = interpolate(f, [0, 180], [5.4, 3.6]);

  return (
    <ThreeCanvas
      width={1080}
      height={1920}
      camera={{ position: [0.3, 1.85, camZ], fov: 44 }}
    >
      <color attach="background" args={["#60a5fa"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 10, 6]} intensity={1.5} />
      <CanyonEnvironment />
      <RailroadTrack3D gapWidth={0.42} length={40} />
      <StickCharacter3D
        role="engineer"
        position={[-1.1, 0.1, -0.4]}
        rotation={[0, 0.5, 0]}
        expression="smug"
      />
      <StickCharacter3D
        role="boss"
        position={[0.75, 0.1, 0.3]}
        rotation={[0, -0.4, 0]}
        holding="cane"
        expression="angry"
        headColor={headHex}
        steamAmount={anger}
        actionPhase={t * 6}
      />
    </ThreeCanvas>
  );
};

/* ---------------- SCENE 4: RIVAL LEAD (Clickety Clack) ---------------- */
const Scene4Rival: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const camX = interpolate(f, [0, 180], [-0.4, 0.4]);
  const shakeY = f > 80 ? Math.sin(t * 38) * 0.08 : 0;

  return (
    <ThreeCanvas
      width={1080}
      height={1920}
      camera={{ position: [camX, 1.9 + shakeY, 4.4], fov: 45 }}
    >
      <color attach="background" args={["#74b9ff"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 10, 6]} intensity={1.4} />
      <CanyonEnvironment />
      <RailroadTrack3D gapWidth={0} length={40} />
      {f < 90 ? (
        <StickCharacter3D
          role="competitorBoss"
          position={[0, 0.1, 0]}
          expression="happy"
          actionPhase={t * 2}
        />
      ) : (
        <StickCharacter3D
          role="boss"
          position={[0, 0.1 + shakeY, 0]}
          expression="worried"
          sweat
          actionPhase={t * 10}
        />
      )}
    </ThreeCanvas>
  );
};

/* ---------------- SCENE 5: SUMMER HEAT (Rails Glowing) ---------------- */
const Scene5Heat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const heat = interpolate(f, [20, 165], [0.1, 0.95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gapShrink = interpolate(f, [20, 165], [0.35, 0.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const camY = interpolate(f, [0, 180], [2.4, 1.3]);
  const camZ = interpolate(f, [0, 180], [5.8, 3.2]);

  return (
    <ThreeCanvas
      width={1080}
      height={1920}
      camera={{ position: [0.8, camY, camZ], fov: 44 }}
    >
      <color attach="background" args={["#f39c12"]} />
      <ambientLight intensity={0.95} color="#ffe0b2" />
      <directionalLight position={[4, 12, 6]} intensity={1.8} color="#ffecb3" />
      <CanyonEnvironment />
      <RailroadTrack3D gapWidth={gapShrink} heatLevel={heat} length={40} />
      <StickCharacter3D
        role="engineer"
        position={[-1.2, 0.1, -0.8]}
        rotation={[0, 0.4, 0]}
        expression="happy"
        actionPhase={t * 3}
      />
    </ThreeCanvas>
  );
};

/* ---------------- SCENE 6: CLIMAX (Sun Kink & Explosion) ---------------- */
const Scene6Climax: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const buckle = interpolate(f, [40, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const trainZ = interpolate(f, [0, 130], [-22, -1]);
  const explode = interpolate(f, [115, 175], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const camZ = interpolate(f, [0, 180], [9.5, 6.2]);

  return (
    <ThreeCanvas
      width={1080}
      height={1920}
      camera={{ position: [0, 3.4, camZ], fov: 46 }}
    >
      <color attach="background" args={["#e67e22"]} />
      <ambientLight intensity={0.9} color="#ffe0b2" />
      <directionalLight position={[6, 12, 8]} intensity={1.8} />
      <CanyonEnvironment />
      <RailroadTrack3D gapWidth={0} heatLevel={1} buckleAmount={buckle} length={46} />
      <SteamTrain3D
        position={[buckle * 0.8, 0.15 - explode * 1.8, trainZ]}
        rotation={[explode * 0.6, buckle * 0.4, explode * 0.9]}
        smokePhase={t * 2}
      />
      {explode > 0.05 && (
        <group position={[0.6, 1.4, -1]}>
          <mesh scale={0.5 + explode * 4.2}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#e74c3c" emissive="#f39c12" emissiveIntensity={1.8} transparent opacity={1 - explode * 0.4} />
          </mesh>
          <mesh position={[0.4, 0.5, 0.3]} scale={0.3 + explode * 3.1}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#f1c40f" emissive="#f1c40f" emissiveIntensity={2} transparent opacity={1 - explode * 0.5} />
          </mesh>
        </group>
      )}
    </ThreeCanvas>
  );
};

export const RailroadExpansion: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <Audio src={staticFile("audio/railroad_master.mp3")} />
      <Sequence from={0} durationInFrames={SCENE_FRAMES}>
        <Scene1Hook />
      </Sequence>
      <Sequence from={SCENE_FRAMES} durationInFrames={SCENE_FRAMES}>
        <Scene2Stakes />
      </Sequence>
      <Sequence from={SCENE_FRAMES * 2} durationInFrames={SCENE_FRAMES}>
        <Scene3Conflict />
      </Sequence>
      <Sequence from={SCENE_FRAMES * 3} durationInFrames={SCENE_FRAMES}>
        <Scene4Rival />
      </Sequence>
      <Sequence from={SCENE_FRAMES * 4} durationInFrames={SCENE_FRAMES}>
        <Scene5Heat />
      </Sequence>
      <Sequence from={SCENE_FRAMES * 5} durationInFrames={SCENE_FRAMES}>
        <Scene6Climax />
      </Sequence>
      <SubtitleOverlay frame={frame} />
    </AbsoluteFill>
  );
};

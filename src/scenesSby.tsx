// Adegan "Pertempuran Surabaya 1945" — rig Hero, kamera sinematik (crane, orbit, low-angle dolly, parallax, fly-through).
// Waktu aksi dari src/sby_timing.json (scripts/build_audio_sby.py).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import timing from "./sby_timing.json";
import { BlueGrid, G, T, ToonSky, Vec3 } from "./three/toon";
import { Bambu, Hero, HeroP, Kukri, MedBag, RadioMic, Rifle, heroHand } from "./three/objectsHero";
import { CityBlock, Explosion, Fighter, Fire, FlagPole, HotelYamato, JembatanMerah, KampungHouse, Leaflet, RadioStudio, Rubble, SandbagWall, Sherman, SmokeColumn, Stretcher, TuguPahlawan, Warship } from "./three/objectsSby";
import { AREK, BRITISH, GURKHA, OFFICER, ORATOR, PMI, TKR } from "./SheetSurabaya";
import { BigTitle, Cam, Chip, Stage, SubWord, kick, lerp, lv, rp, shotCam, talkAt } from "./sceneKit";

const TM = timing as any;
export type SbScene = "hook" | "yamato" | "ultimatum" | "radio" | "serangan" | "jembatan" | "pmi" | "akhir" | "pahlawan";
export const SB_ORDER: SbScene[] = TM.order;
export const DUR_SB = (k: SbScene): number => TM.scenes[k].dur;
const EV = (n: string): number => TM.events[n];
const LN = (k: SbScene, i: number): { from: number; to: number } => TM.lines[k][i];
const Sub: React.FC<{ scene: SbScene }> = ({ scene }) => <SubWord timing={TM} scene={scene} />;

/* ---------------- kamera & pose ---------------- */
/** orbit kamera di sekitar titik: sudut (rad, 0 = dari +z), radius, tinggi */
const orbit = (center: Vec3, r: number, ang: number, y: number, fov = 40, lookY?: number): Cam => ({
  pos: [center[0] + Math.sin(ang) * r, y, center[2] + Math.cos(ang) * r],
  look: [center[0], lookY ?? center[1], center[2]],
  fov,
});
const blend = (a: Cam, b: Cam, k: number): Cam => ({ pos: lv(a.pos, b.pos, k), look: lv(a.look, b.look, k), fov: lerp(a.fov, b.fov, k) });
/** pose jalan: kaki & lengan berayun */
const walk = (p: HeroP, ph: number, amt = 1): HeroP => ({
  ...p,
  legL: { pitch: Math.sin(ph) * 0.45 * amt, knee: Math.max(0, -Math.sin(ph)) * 0.5 * amt },
  legR: { pitch: -Math.sin(ph) * 0.45 * amt, knee: Math.max(0, Math.sin(ph)) * 0.5 * amt },
});
const Fog: React.FC<{ c: string; near: number; far: number }> = ({ c, near, far }) => <fog attach="fog" args={[c, near, far]} />;
const Grade: React.FC<{ c: string; a?: number }> = ({ c, a = 0.18 }) => <AbsoluteFill style={{ background: c, opacity: a, mixBlendMode: "multiply", pointerEvents: "none" }} />;
const Bars: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />
  </>
);
const Embers: React.FC<{ f: number; n?: number; seed?: number }> = ({ f, n = 26, seed = 1 }) => (
  <>
    {Array.from({ length: n }).map((_, i) => {
      const k = ((f * (0.004 + (i % 5) * 0.0012) + i / n) % 1);
      const x = Math.sin(i * 12.9 + seed) * 6;
      const z = Math.cos(i * 7.3 + seed) * 6;
      return <T key={i} g={G.sph(0.03, 6, 4)} c="#ffb050" emissive="#ff8a20" ei={2} position={[x + Math.sin(f * 0.05 + i) * 0.4, k * 7, z]} o={false} />;
    })}
  </>
);
const DuskSky: React.FC = () => <ToonSky top="#2a1e3a" horizon="#e87a3a" />;
const DayLight: React.FC = () => (
  <>
    <hemisphereLight args={["#f4f8ff", "#b8a890", 1.1]} />
    <directionalLight position={[-12, 20, 14]} intensity={1.9} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
  </>
);
const DuskLight: React.FC = () => (
  <>
    <hemisphereLight args={["#ffc89a", "#3a2a3a", 0.95]} />
    <directionalLight position={[14, 6, -10]} intensity={1.7} color="#ff9a5a" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
    <directionalLight position={[-6, 8, 10]} intensity={0.7} color="#a8b8ff" />
  </>
);

/* variasi pemuda */
const PEMUDA2: HeroP = { ...AREK, shirt: "#7a5a3a", shirtDark: "#5a4228", open: false, pockets: true, bandolier: false, skin: "#a86a40", expr: "shout" };
const PEMUDA3: HeroP = { ...AREK, shirt: "#3a4a6a", shirtDark: "#2a3a52", head: "peci", sleeves: "rolled", open: false, shorts: false, pants: "#5a5040", skin: "#b8804e", expr: "determined" };
const TKR2: HeroP = { ...TKR, head: "fieldcap", headColor: "#a08a5a", skin: "#a87044" };

/* ===================== 1. HOOK: bambu runcing vs tank ===================== */
export const SceneSbHook: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("hook");
  const fire = EV("hook.tank");
  const tz = lerp(-14, -9, f / D);
  const arek: HeroP = { ...AREK, expr: f > fire ? "shout" : "determined", armR: { pitch: 0.9, out: 0.15, elbow: 0.7 }, armL: { pitch: 0.8, out: -0.1, elbow: 0.6 }, legL: { pitch: 0.35, knee: 0.15 }, legR: { pitch: -0.3, knee: 0.1 }, lean: 0.12 };
  const hand = heroHand(arek, "R");
  const k = rp(f, 0, D);
  const camA: Cam = { pos: [0.55, 1.25, 6.8], look: [0, 1.6, -6], fov: 44 };
  const camB = orbit([0, 1.9, 4], 2.6, 0.95, 0.85, 42, 2.1);
  const cam = blend(camA, camB, rp(f, 18, D - 10));
  const boomK = (f - fire) / 34;
  const shake = kick(f, [fire, fire + 4], 0.08);
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={shake} bg="#c87a4a">
        <DuskSky />
        <Fog c="#b8704a" near={14} far={70} />
        <DuskLight />
        <JembatanMerah t={f} />
        <CityBlock position={[-20, 0.3, -24]} n={6} seed={3} ruined={0.6} dusk />
        <CityBlock position={[4, 0.3, -24]} n={4} seed={5} ruined={0.8} dusk />
        <SmokeColumn position={[-8, 0, -26]} t={f / 30} h={18} scale={1.6} />
        <SmokeColumn position={[10, 0, -22]} t={f / 30 + 3} h={16} scale={1.3} />
        <Fire position={[-3.6, 0.55, -4]} t={f / 30} />
        <Sherman position={[0, 0.55, tz]} rotation={[0, -Math.PI / 2, 0]} turret={Math.sin(f * 0.02) * 0.05} recoil={f >= fire && f < fire + 6 ? 1 - (f - fire) / 6 : 0} track={f * 0.15} />
        {f >= fire && f < fire + 6 ? <Explosion position={[0, 2.3, tz + 4.2]} k={(f - fire) / 12} scale={0.5} /> : null}
        <Explosion position={[4.5, 0.6, 1]} k={boomK} scale={1.2} seed={2} />
        <Hero p={arek} position={[0, 0.55, 4]} rotation={[0, Math.PI, 0]}>
          <group position={hand} rotation={[-1.0, 0, 0]}>
            <group position={[0, -0.9, 0]}>
              <Bambu len={2.2} />
            </group>
          </group>
        </Hero>
        <Embers f={f} />
      </Stage>
      <Grade c="#ff9a5a" a={0.12} />
      <Bars />
      <BigTitle at={6} to={D} top={150} size={74} line1="10 NOVEMBER 1945" line2="SURABAYA MEMBARA 🔥" />
      <Sub scene="hook" />
    </AbsoluteFill>
  );
};

/* ===================== 2. HOTEL YAMATO: bendera dirobek ===================== */
export const SceneSbYamato: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("yamato");
  const bend = EV("yamato.bendera");
  const panjat = EV("yamato.panjat");
  const robek = EV("yamato.robek");
  const merah = EV("yamato.merah");
  const H: Vec3 = [0, 0, -12];
  const towerTop: Vec3 = [0, 15.25, -9.3];
  const tear = rp(f, robek, robek + 26);
  const climb = rp(f, panjat, robek - 4);
  const wave = f * 0.18;
  const cheer = f >= merah;
  // pemuda di atas menara: satu memanjat tiang, satu menahan
  const climber: HeroP = { ...PEMUDA2, expr: "shout", armL: { pitch: 2.9, out: 0.15, elbow: 0.2 }, armR: { pitch: f >= robek ? 2.0 + tear * 0.6 : 2.7, out: 0.3, elbow: 0.3 }, legL: { pitch: 0.5, knee: 0.8 }, legR: { pitch: 0.1, knee: 0.3 } };
  const helper: HeroP = { ...AREK, expr: cheer ? "shout" : "determined", armL: { pitch: 1.6, out: 0.1, elbow: 0.4 }, armR: cheer ? { pitch: 2.9, out: 0.3, elbow: 0.2 } : { pitch: 1.4, out: 0.1, elbow: 0.5 } };
  const crowd: [HeroP, Vec3, number][] = [
    [AREK, [-2.2, 0, -1.5], 0.3],
    [PEMUDA3, [-0.6, 0, -0.8], 0.1],
    [TKR2, [1.2, 0, -1.2], -0.2],
    [PEMUDA2, [2.6, 0, -2.0], -0.35],
    [PEMUDA3, [-3.6, 0, -2.8], 0.4],
    [AREK, [3.8, 0, -3.2], -0.3],
    [TKR2, [0.4, 0, -3.4], 0],
  ];
  const shots = (): Cam => {
    if (f < panjat - 8) {
      // crane naik dari kerumunan jalan ke menara
      const k = rp(f, 0, panjat - 8);
      return { pos: lv([4.2, 1.4, 7.5], [6.5, 11.5, 2.0], k), look: lv([0, 4.0, -8], [0, 16.5, -9.3], k), fov: lerp(46, 42, k) };
    }
    if (f < merah + 6) {
      // orbit dekat di puncak menara
      const k = rp(f, panjat - 8, merah + 6);
      return orbit([0, 17.6, -9.3], lerp(6.2, 4.4, k), lerp(0.75, 1.55, k), lerp(17.4, 18.2, k), 40, 17.9);
    }
    // bendera merah putih berkibar, kamera mengitari lalu menjauh
    const k = rp(f, merah + 6, D);
    return orbit([0, 18.6, -9.3], lerp(4.4, 7.5, k), lerp(1.55, 2.4, k), lerp(18.2, 16.8, k), 40, 18.4);
  };
  return (
    <AbsoluteFill>
      <Stage cam={shots()} bg="#8ac0f0">
        <ToonSky top="#3a7ad8" horizon="#d8ecff" />
        <Fog c="#c8dcf0" near={30} far={110} />
        <DayLight />
        <T g={G.box(120, 0.1, 80)} c="#8a8274" position={[0, -0.05, 0]} o={false} />
        <T g={G.box(120, 0.02, 9)} c="#5a564e" position={[0, 0.01, 0.5]} o={false} />
        <HotelYamato position={H} tear={tear} wave={wave} />
        <CityBlock position={[-40, 0, -14]} n={3} seed={8} />
        <CityBlock position={[18, 0, -14]} n={3} seed={9} />
        <CityBlock position={[-30, 0, 12]} n={8} seed={10} rotation={[0, Math.PI, 0]} />
        {crowd.map(([p, pos, yaw], i) => {
          const up = f > bend + i * 2;
          return <Hero key={i} p={{ ...p, expr: cheer ? "shout" : p.expr, armR: up ? { pitch: cheer ? 3.0 : 2.4 + Math.sin(f * 0.2 + i) * 0.2, out: 0.3, elbow: 0.3 } : undefined, armL: undefined }} position={pos} rotation={[0, Math.PI + yaw, 0]} />;
        })}
        <Hero p={climber} position={[towerTop[0] + 0.35, towerTop[1] + climb * 1.25, towerTop[2] + 0.3]} rotation={[0, Math.PI, 0]} />
        <Hero p={helper} position={[towerTop[0] - 0.9, towerTop[1], towerTop[2] + 0.9]} rotation={[0, Math.PI + 0.6, 0]} />
      </Stage>
      <Bars />
      <Chip at={bend} to={panjat} top={210} color="#21468b">🇳🇱 19 Sept 1945 · Hotel Yamato (Oranje)</Chip>
      <Chip at={merah + 4} to={D} top={210} color="#d81e1e">✊ Biru dirobek → MERAH PUTIH</Chip>
      <Sub scene="yamato" />
    </AbsoluteFill>
  );
};

/* ===================== 3. BENTROKAN + ULTIMATUM DARI UDARA ===================== */
export const SceneSbUltimatum: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("ultimatum");
  const bent = EV("ult.bentrok");
  const tewas = EV("ult.tewas");
  const udara = EV("ult.udara");
  const serah = EV("ult.serah");
  const planeX = lerp(-40, 40, rp(f, udara - 30, udara + 70));
  const flashes = [bent, bent + 7, bent + 15, bent + 26, tewas - 4];
  const tkr: HeroP = { ...TKR, expr: "determined", armR: { pitch: 1.0, out: 0.1, elbow: 1.0 }, armL: { pitch: 1.2, out: -0.2, elbow: 0.4 } };
  const tkrPos: Vec3 = [1.2, 0, 3.0];
  const insAt = Math.max(serah + 20, LN("ultimatum", 1).to - 40);
  const lf = rp(f, udara + 10, insAt);
  const leafPos: Vec3 = lv([2.0, 12, -4], lv(tkrPos, [tkrPos[0] + 0.15, 1.35, tkrPos[2] + 0.45], 1), lf);
  const insert = f >= insAt;
  const cam = (): Cam => {
    if (f < udara - 10) {
      const k = rp(f, 0, udara - 10);
      return { pos: lv([-3.5, 1.2, 9], [-2.0, 1.5, 6.5], k), look: [0.5, 1.6, -6], fov: 44 };
    }
    if (f < udara + 30) {
      // tilt ke atas mengikuti pesawat
      const k = rp(f, udara - 10, udara + 20);
      return { pos: [-2.0, 1.5, 6.5], look: lv([0.5, 1.6, -6], [planeX * 0.3, 11, -8], k), fov: 48 };
    }
    // ikuti selebaran turun ke tangan pejuang
    const k = rp(f, udara + 30, insAt);
    return { pos: lv([0.5, 9, 4], [tkrPos[0] + 1.1, 1.7, tkrPos[2] + 2.2], k), look: leafPos, fov: lerp(48, 40, k) };
  };
  if (insert) {
    return (
      <AbsoluteFill>
        <Stage cam={{ pos: [tkrPos[0] + 0.25, 1.5, tkrPos[2] + 1.45 - (f - insAt) * 0.003], look: [tkrPos[0] + 0.15, 1.33, tkrPos[2] + 0.45], fov: 36 }} bg="#c8b8a0">
          <ToonSky top="#6a8ab8" horizon="#e8dcc8" />
          <DayLight />
          <CityBlock position={[-10, 0, -6]} n={4} seed={12} />
          <Hero p={tkr} position={tkrPos} rotation={[0, Math.PI, 0]} />
          <Leaflet position={[tkrPos[0] + 0.15, 1.35, tkrPos[2] + 0.45]} rotation={[-0.35, 0, 0.04]} scale={1.6} text />
          {[-1, 1].map((s) => (
            <T key={s} g={G.sph(0.05, 12, 10)} c={TKR.skin!} position={[tkrPos[0] + 0.15 + s * 0.17, 1.12, tkrPos[2] + 0.5]} o={2} />
          ))}
        </Stage>
        <Bars />
        <Chip at={insAt} to={D} top={210} color="#ff4a4a">⏰ Batas: 10 Nov 1945 · 06.00</Chip>
        <Sub scene="ultimatum" />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Stage cam={cam()} shake={kick(f, flashes, 0.03)} bg="#c8b8a0">
        <ToonSky top="#6a8ab8" horizon="#e8dcc8" />
        <Fog c="#d8c8b0" near={20} far={90} />
        <DayLight />
        <T g={G.box(120, 0.1, 80)} c="#7a7268" position={[0, -0.05, 0]} o={false} />
        <CityBlock position={[-16, 0, -12]} n={5} seed={12} />
        <CityBlock position={[-16, 0, 12]} n={5} seed={13} rotation={[0, 0, 0]} />
        <KampungHouse position={[-7, 0, 6]} rotation={[0, 0.4, 0]} />
        <KampungHouse position={[8, 0, 7]} rotation={[0, -0.3, 0]} c="#c8b890" />
        <Sherman position={[4, 0, -9]} rotation={[0, -Math.PI / 2 - 0.3, 0]} turret={-0.2} track={f * 0.05} />
        <Hero p={{ ...GURKHA, armR: { pitch: 1.2, out: 0.2, elbow: 0.6 } }} position={[2.0, 0, -6.5]} rotation={[0, 0.2, 0]}>
          <group position={heroHand({ ...GURKHA, armR: { pitch: 1.2, out: 0.2, elbow: 0.6 } }, "R")} rotation={[1.0, 0, 0]}>
            <Kukri />
          </group>
        </Hero>
        <Hero p={{ ...BRITISH, armR: { pitch: 1.15, out: 0.15, elbow: 1.35 }, armL: { pitch: 1.45, out: -0.05, elbow: 0.15 } }} position={[5.8, 0, -5.2]} rotation={[0, -0.25, 0]}>
          <group position={heroHand({ ...BRITISH, armR: { pitch: 1.15, out: 0.15, elbow: 1.35 } }, "R")} rotation={[Math.PI / 2, 0, 0]}>
            <group position={[0, -0.1, 0]}>
              <Rifle kind="enfield" bayonet={false} />
            </group>
          </group>
        </Hero>
        <Hero p={tkr} position={tkrPos} rotation={[0, Math.PI, 0]}>
          <group position={heroHand(tkr, "R")} rotation={[Math.PI / 2 + 0.1, 0, 0]}>
            <group position={[0, -0.12, 0]}>
              <Rifle kind="arisaka" />
            </group>
          </group>
        </Hero>
        <Hero p={{ ...AREK, armR: { pitch: 0.7, out: 0.2, elbow: 0.9 } }} position={[-1.4, 0, 2.4]} rotation={[0, Math.PI + 0.2, 0]} />
        {flashes.map((fl, i) => (
          <Explosion key={i} position={[[-1, 6, 3, -3, 7][i], 0.4, [-6, -3, -8, -4, -7][i]]} k={(f - fl) / 30} scale={0.8} seed={i} />
        ))}
        <Fighter position={[planeX, 11, -10]} rotation={[0, 0, 0.05]} prop={f * 1.7} />
        {f >= udara + 2
          ? Array.from({ length: 30 }).map((_, i) => {
              const t = (f - udara - 2 - i * 1.5) / 60;
              if (t < 0) return null;
              const sx = -40 + 80 * ((udara - 30 + i * 1.5 + 40) / 130);
              return <Leaflet key={i} position={[sx + Math.sin(t * 6 + i) * 1.5, 11 - t * 9, -10 + i * 0.4 + t * 6]} rotation={[t * 8 + i, t * 5, i]} scale={1.2} />;
            })
          : null}
        {f > udara + 10 ? <Leaflet position={leafPos} rotation={[f * 0.12, f * 0.07, 0.3]} scale={1.4} /> : null}
      </Stage>
      <Bars />
      <Chip at={bent} to={tewas - 2} top={210} color="#ff9a4a">💥 Akhir Okt 1945 · bentrokan di seluruh kota</Chip>
      <Chip at={tewas} to={udara - 4} top={210} color="#9aa0b0">⚔️ 30 Okt · Brigjen Mallaby tewas</Chip>
      <Sub scene="ultimatum" />
    </AbsoluteFill>
  );
};

/* ===================== 4. RADIO: "MERDEKA ATAU MATI!" ===================== */
export const SceneSbRadio: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("radio");
  const suara = EV("radio.suara");
  const merd = EV("radio.merdeka");
  const holo = f >= merd - 4;
  const orP: HeroP = { ...ORATOR, expr: f >= LN("radio", 1).from ? "shout" : "determined", talk: talkAt(f, LN("radio", 1), 1), armR: f >= LN("radio", 1).from ? { pitch: 1.75 + Math.sin(f * 0.3) * 0.08, out: 0.2, elbow: 0.05 } : { pitch: 0.5, out: 0.1, elbow: 1.2 }, armL: { pitch: 0.9, out: 0.1, elbow: 1.5 } };
  const pos: Vec3 = [-0.4, 0, 0.1];
  if (holo) {
    const k = rp(f, merd - 4, D);
    const cam = orbit([0, 1, 0], lerp(14, 22, k), lerp(0.2, 0.9, k), lerp(6, 13, k), 46, 1.5);
    return (
      <AbsoluteFill style={{ background: "#020a1c" }}>
        <Stage cam={cam} bg="#020a1c">
          <hemisphereLight args={["#bfe4ff", "#123060", 1.6]} />
          <directionalLight position={[3, 6, 5]} intensity={1.5} />
          <ToonSky top="#020814" horizon="#0a2a5a" />
          <BlueGrid size={120} />
          {/* menara radio */}
          <T g={G.cyl(0.08, 0.4, 7, 4)} c="#7fe8ff" emissive="#3ab8ff" ei={0.8} position={[0, 3.5, 0]} o={false} />
          <T g={G.sph(0.3, 12, 10)} c="#ff3a3a" emissive="#ff2a2a" ei={2} position={[0, 7.1, 0]} o={false} />
          {[0, 1, 2, 3, 4].map((i) => {
            const r = ((f - merd + i * 14) % 70) / 70;
            return (
              <mesh key={i} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={1 + r * 26}>
                <torusGeometry args={[1, 0.02, 6, 64]} />
                <meshBasicMaterial color="#7fe8ff" transparent opacity={1 - r} />
              </mesh>
            );
          })}
          {/* kota hologram: blok-blok + rakyat mengepalkan tangan */}
          {Array.from({ length: 28 }).map((_, i) => {
            const a = i * 2.39;
            const r = 6 + (i % 7) * 1.8;
            const h = 1 + ((i * 37) % 5);
            return <T key={i} g={G.box(1.4, h, 1.4)} c="#2a5aa8" emissive="#1a4a9a" ei={0.6} position={[Math.cos(a) * r, h / 2, Math.sin(a) * r]} o={2} />;
          })}
          {Array.from({ length: 14 }).map((_, i) => {
            const a = i * 0.45 + 0.3;
            const r = 3.6 + (i % 3) * 0.9;
            const lit = f > merd + 6 + i * 2;
            return <Hero key={i} p={{ ...[AREK, PEMUDA2, PEMUDA3, TKR2][i % 4], expr: "shout", armR: lit ? { pitch: 3.0, out: 0.3, elbow: 0.2 } : undefined }} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a - Math.PI / 2, 0]} scale={0.8} />;
          })}
        </Stage>
        <Chip at={merd} to={D} top={210} color="#7fe8ff">📻 Radio Pemberontakan · seluruh kota mendengar</Chip>
        <BigTitle at={EV("radio.mati")} to={D} top={300} size={76} line1="MERDEKA" line2="ATAU MATI!" />
        <Sub scene="radio" />
      </AbsoluteFill>
    );
  }
  // dolly maju dari jendela ke wajah orator, sedikit mengitari
  const k = rp(f, 0, merd - 4);
  const cam = orbit([pos[0], 1.75, pos[2]], lerp(4.4, 1.6, k), lerp(-0.9, 0.35, k), lerp(2.2, 1.85, k), lerp(44, 36, k), lerp(1.4, 1.82, k));
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#1a1420">
        <hemisphereLight args={["#ffd8a8", "#1a1430", 0.55]} />
        <directionalLight position={[2, 4, 3]} intensity={0.9} color="#ffd8a0" />
        <RadioStudio t={f / 30} onAir={f >= suara} />
        <Hero p={orP} position={pos} rotation={[0, 0, 0]} />
        <group position={[pos[0] + 0.05, 0, pos[2] + 0.48]}>
          <group position={[0, 1.35, 0]}>
            <RadioMic />
          </group>
        </group>
      </Stage>
      <Grade c="#ffb060" a={0.1} />
      <Bars />
      <Chip at={8} to={merd} top={210} color="#ffb05a">🎙️ 9 Nov 1945 · malam sebelum serangan</Chip>
      <Sub scene="radio" />
    </AbsoluteFill>
  );
};

/* ===================== 5. SERANGAN: kapal, pesawat, tank ===================== */
export const SceneSbSerangan: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("serangan");
  const mer = EV("serang.meriam");
  const bom = EV("serang.bom");
  const tk = EV("serang.tank");
  const shipFl = (i: number) => {
    const d = f - (mer + i * 14);
    return d >= 0 && d < 8 ? 1 - d / 8 : 0;
  };
  const booms = [mer + 18, mer + 30, mer + 42, bom + 16, bom + 22, bom + 30];
  // fly-through: dari laut (kapal) ke kota (ledakan) ke jalan (tank)
  const cam = (): Cam => {
    if (f < bom - 6) {
      // dari laut: rendah di belakang kapal, menghadap kota yang ditembaki
      const k = rp(f, 0, bom - 6);
      return { pos: lv([-22, 3.5, -82], [-6, 6, -70], k), look: lv([-10, 3, -48], [0, 4, 8], k), fov: 48 };
    }
    if (f < tk - 4) {
      // udara: mengikuti pesawat di atas kota
      const k = rp(f, bom - 6, tk - 4);
      return { pos: lv([-24, 26, -16], [-4, 30, -10], k), look: lv([-6, 2, 14], [8, 0, 16], k), fov: 50 };
    }
    // jalan: tank melintas sangat dekat kamera rendah
    const k = rp(f, tk - 4, D);
    return { pos: lv([-1.5, 0.7, 31.5], [-2.2, 0.6, 30.8], k), look: [-9, 1.8, 27], fov: 46 };
  };
  const planeK = rp(f, bom - 40, bom + 40);
  return (
    <AbsoluteFill>
      <Stage cam={cam()} shake={kick(f, booms, 0.05)} bg="#e8a070">
        <ToonSky top="#4a5a8a" horizon="#ffb070" />
        <Fog c="#d89a70" near={25} far={140} />
        <hemisphereLight args={["#ffd8b0", "#4a3a3a", 1.0]} />
        <directionalLight position={[-20, 10, -30]} intensity={1.8} color="#ffc080" />
        {/* laut */}
        <T g={G.box(200, 0.1, 80)} c="#3a5a7a" position={[0, -0.5, -70]} o={false} />
        {Array.from({ length: 40 }).map((_, i) => (
          <T key={i} g={G.box(2 + (i % 4), 0.02, 0.1)} c="#8ab0d0" position={[-60 + ((i * 13 + f * 0.3) % 120), -0.44, -40 - (i % 10) * 4]} o={false} />
        ))}
        <Warship position={[-10, -0.5, -48]} rotation={[0, 0.25, 0]} flash={shipFl(0)} />
        <Warship position={[14, -0.5, -58]} rotation={[0, -0.2, 0]} flash={shipFl(1)} scale={0.9} />
        <Warship position={[-30, -0.5, -62]} rotation={[0, 0.4, 0]} flash={shipFl(2)} scale={0.8} />
        {/* daratan kota */}
        <T g={G.box(200, 0.4, 120)} c="#7a7268" position={[0, -0.2, 30]} o={false} />
        <CityBlock position={[-30, 0, 4]} n={9} seed={21} ruined={0.5} dusk />
        <CityBlock position={[-30, 0, 16]} n={9} seed={22} ruined={0.4} dusk />
        <CityBlock position={[-34, 0, 40]} n={10} seed={23} ruined={0.3} dusk />
        <CityBlock position={[6, 0, 40]} n={6} seed={24} dusk />
        {[-12, 6, 20, -4].map((x, i) => (
          <SmokeColumn key={i} position={[x, 0, 8 + i * 6]} t={f / 30 + i} h={22} scale={1.6} />
        ))}
        {booms.map((b, i) => (
          <Explosion key={i} position={[[-8, 4, 12, -2, 7, 15][i], 0.5, [10, 14, 8, 18, 20, 16][i]]} k={(f - b) / 34} scale={2.2} seed={i} />
        ))}
        {[0, 1, 2].map((i) => (
          <Fighter key={i} position={[lerp(-50, 50, planeK) + i * -6, 16 - i * 1.5, 6 + i * 4]} rotation={[0.15, 0, -0.08]} prop={f * 1.7} scale={0.9} />
        ))}
        {/* jalan & tank melaju ke kamera */}
        <Sherman position={[lerp(-18, -5, rp(f, tk - 10, D)), 0, 27]} rotation={[0, 0, 0]} turret={Math.sin(f * 0.03) * 0.2} track={f * 0.2} />
        <Fire position={[-10, 0, 31]} t={f / 30} scale={1.5} />
        <Rubble position={[-3, 0, 24]} />
      </Stage>
      <Grade c="#ff8a40" a={0.12} />
      <Bars />
      <Chip at={6} to={bom - 6} top={210} color="#ff6a4a">🚢 10 Nov 1945 · 06.00 · meriam kapal</Chip>
      <Chip at={bom} to={tk - 4} top={210} color="#ff6a4a">✈️ bom dari udara</Chip>
      <Chip at={tk} to={D} top={210} color="#ff6a4a">🛡️ tank Sherman memasuki kota</Chip>
      <Sub scene="serangan" />
    </AbsoluteFill>
  );
};

/* ===================== 6. JEMBATAN MERAH: "MEREKA TIDAK MUNDUR" ===================== */
export const SceneSbJembatan: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("jembatan");
  const mund = EV("jemb.mundur");
  const tz = lerp(-16, -10, rp(f, 0, D));
  const stand = rp(f, mund - 6, mund + 8);
  const fire = (i: number) => (f % (18 + i * 5)) < 3;
  const crouch = (p: HeroP, i: number): HeroP => ({ ...p, expr: "determined", legL: { pitch: 1.0, knee: 1.6 }, legR: { pitch: 0.4, knee: 1.2 }, armR: { pitch: 1.4, out: 0.15, elbow: 0.9 }, armL: { pitch: 1.5, out: -0.2, elbow: 0.3 }, lean: 0.3 + Math.sin(f * 0.1 + i) * 0.02 });
  const arek: HeroP = stand > 0.5 ? { ...AREK, expr: "shout", armR: { pitch: 2.7, out: 0.25, elbow: 0.2 }, armL: { pitch: 0.4, out: 0.2, elbow: 1.0 }, legL: { pitch: 0.3, knee: 0.1 }, legR: { pitch: -0.25 } } : { ...crouch(AREK, 9), armR: { pitch: 0.9, out: 0.2, elbow: 0.8 } };
  const arekPos: Vec3 = [0, 0.55 + (stand > 0.5 ? stand * 0.45 : 0), 8.4];
  const hand = heroHand(arek, "R");
  const defenders: [HeroP, Vec3, "arisaka" | null][] = [
    [TKR, [-2.2, 0.55, 8.3], "arisaka"],
    [PEMUDA2, [-1.2, 0.55, 8.5], "arisaka"],
    [TKR2, [1.3, 0.55, 8.3], "arisaka"],
    [PEMUDA3, [2.4, 0.55, 8.6], null],
  ];
  const cam = (): Cam => {
    if (f < mund - 10) {
      // tracking rendah menyusuri barikade karung pasir (parallax)
      const k = rp(f, 0, mund - 10);
      return { pos: lv([-2.4, 2.05, 11.6], [2.4, 2.1, 11.4], k), look: lv([-1.2, 1.2, -6], [1.0, 1.3, -8], k), fov: 44 };
    }
    // low-angle orbit mengitari Arek yang berdiri dengan tank di belakang
    const k = rp(f, mund - 10, D);
    return orbit([0, 2.0, 8.4], lerp(3.2, 3.8, k), lerp(-0.4, -1.1, k), lerp(1.0, 1.25, k), 44, lerp(1.9, 2.3, k));
  };
  return (
    <AbsoluteFill>
      <Stage cam={cam()} shake={kick(f, [mund - 30, mund + 20], 0.05)} bg="#c87a4a">
        <DuskSky />
        <Fog c="#a8704a" near={12} far={70} />
        <DuskLight />
        <JembatanMerah t={f} />
        <CityBlock position={[-24, 0.3, -24]} n={7} seed={31} ruined={0.7} dusk />
        <SmokeColumn position={[-6, 0, -22]} t={f / 30} h={18} scale={1.5} />
        <SmokeColumn position={[8, 0, -18]} t={f / 30 + 2} h={14} scale={1.2} />
        <SandbagWall position={[0, 0.55, 9.2]} n={11} rows={3} />
        <SandbagWall position={[-3.5, 0.55, 8.4]} rotation={[0, 1.2, 0]} n={4} rows={3} />
        <Sherman position={[0, 0.55, tz]} rotation={[0, Math.PI / 2, 0]} turret={Math.sin(f * 0.02) * 0.1} track={f * 0.12} recoil={f >= mund - 30 && f < mund - 24 ? 1 : 0} />
        <Explosion position={[3.2, 0.8, 4]} k={(f - (mund - 30)) / 32} scale={1.3} seed={4} />
        <Explosion position={[-2.5, 0.8, -6]} k={(f - (mund + 20)) / 32} scale={1.5} seed={6} />
        {defenders.map(([p, pos, gun], i) => {
          const pp = crouch(p, i);
          return (
            <Hero key={i} p={pp} position={pos} rotation={[0, Math.PI, 0]}>
              {gun ? (
                <group position={heroHand(pp, "R")} rotation={[Math.PI / 2 + 0.05, 0, 0]}>
                  <group position={[0, -0.12, 0]}>
                    <Rifle kind={gun} />
                  </group>
                </group>
              ) : null}
              {gun && fire(i) ? <T g={G.ico(0.12, 0)} c="#ffd86a" emissive="#ff9a20" ei={2} position={[heroHand(pp, "R")[0], heroHand(pp, "R")[1] + 0.1, heroHand(pp, "R")[2] + 1.6]} o={false} /> : null}
            </Hero>
          );
        })}
        <Hero p={arek} position={arekPos} rotation={[0, Math.PI - stand * 1.1, 0]}>
          <group position={hand} rotation={stand > 0.5 ? [0.1, 0, 0] : [-1.0, 0, 0]}>
            <group position={[0, -0.9, 0]}>
              <Bambu len={2.2} />
            </group>
          </group>
        </Hero>
        <Embers f={f} />
      </Stage>
      <Grade c="#ff9a5a" a={0.12} />
      <Bars />
      <Chip at={8} to={mund - 10} top={210} color="#d81e1e">🌉 Jembatan Merah · barikade karung pasir</Chip>
      <Sub scene="jembatan" />
    </AbsoluteFill>
  );
};

/* ===================== 7. RELAWAN MENGGOTONG YANG TERLUKA ===================== */
export const SceneSbPmi: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("pmi");
  const z = lerp(-5, 2.2, f / D);
  const ph = f * 0.13;
  const carry = (p: HeroP): HeroP => ({ ...walk(p, ph, 0.7), armR: { pitch: 0.35, out: 0.2, elbow: 0.2 }, armL: { pitch: 0.35, out: 0.2, elbow: 0.2 }, expr: "determined" });
  const front = carry(PMI);
  const back = carry({ ...TKR2, expr: "sad" });
  const wounded: HeroP = { ...AREK, expr: "sad", armL: { pitch: 0.1, out: 0.3, elbow: 0.4 }, armR: { pitch: 0.3, out: 0.1, elbow: 1.4 } };
  const k = rp(f, 0, D);
  const cam: Cam = { pos: lv([3.2, 1.3, z + 4.4], [-2.4, 1.0, z + 2.6], k), look: [0, 1.0, z - 0.6], fov: 42 };
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#6a5a5a">
        <ToonSky top="#3a3440" horizon="#a8806a" />
        <Fog c="#7a6a64" near={6} far={40} />
        <hemisphereLight args={["#e8c8b0", "#2a2028", 0.85]} />
        <directionalLight position={[8, 6, -8]} intensity={1.3} color="#ff9a6a" castShadow />
        <T g={G.box(60, 0.1, 60)} c="#5a524a" position={[0, -0.05, 0]} o={false} />
        <CityBlock position={[-14, 0, -12]} n={4} seed={41} ruined={1} dusk />
        <KampungHouse position={[-5.5, 0, -2]} rotation={[0, 0.6, 0]} c="#a89878" />
        <KampungHouse position={[6, 0, -6]} rotation={[0, -0.5, 0]} c="#9a8a6a" />
        <Rubble position={[-2.6, 0, 4.5]} n={10} r={1.2} seed={3} />
        <Rubble position={[2.8, 0, 1]} n={14} r={1.6} seed={4} />
        <Fire position={[-4.4, 0.2, 0.5]} t={f / 30} />
        <Fire position={[5, 0.2, -3]} t={f / 30 + 1} scale={1.3} />
        <SmokeColumn position={[-6, 0, -8]} t={f / 30} h={14} scale={1.3} />
        {/* tandu dibawa dua orang */}
        <Hero p={front} position={[0, 0, z + 1.1]} rotation={[0, 0, 0]}>
          <group position={heroHand(front, "L")}>
            <MedBag />
          </group>
        </Hero>
        <Hero p={back} position={[0, 0, z - 1.1]} rotation={[0, 0, 0]} />
        <Stretcher position={[0, 0.88, z]} rotation={[0, Math.PI / 2, 0]} />
        <group position={[0, 0.98, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <group position={[0, -0.9, 0]}>
            <Hero p={wounded} scale={0.95} />
          </group>
        </group>
        <Embers f={f} n={30} seed={5} />
      </Stage>
      <Grade c="#6a7a9a" a={0.2} />
      <Bars />
      <Chip at={10} to={D} top={210} color="#f4f0e8">✚ Relawan Palang Merah di garis depan</Chip>
      <Sub scene="pmi" />
    </AbsoluteFill>
  );
};

/* ===================== 8. KOTA JATUH, SEMANGAT MENYALA ===================== */
export const SceneSbAkhir: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("akhir");
  const sem = EV("akhir.semangat");
  const k = rp(f, 0, D);
  // crane naik dari kaki bendera di reruntuhan ke langit senja
  const cam: Cam = { pos: lv([1.2, 0.6, 3.2], [3.5, 7.5, 9.5], k), look: lv([0, 1.4, 0], [0, 2.5, -14], k), fov: 44 };
  const lights = rp(f, sem - 4, sem + 40);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#c86a3a">
        <DuskSky />
        <Fog c="#a8603a" near={10} far={90} />
        <DuskLight />
        <T g={G.box(140, 0.1, 140)} c="#5a4a40" position={[0, -0.05, 0]} o={false} />
        <Rubble position={[0, 0, 0]} n={22} r={1.8} seed={7} />
        <FlagPole position={[0, 0.3, 0]} h={2.4} merahPutih wave={f * 0.14} scale={0.8} />
        <group position={[0.8, 0.12, 0.6]} rotation={[Math.PI / 2 - 0.08, 0, 1.1]}>
          <Bambu len={2.0} flag={false} />
        </group>
        <T g={G.tor(0.1, 0.012, 6, 20)} c="#d81e1e" position={[-0.6, 0.06, 0.8]} rotation={[Math.PI / 2, 0, 0]} o={2} />
        <CityBlock position={[-30, 0, -20]} n={9} seed={51} ruined={1} dusk />
        <CityBlock position={[-26, 0, -36]} n={8} seed={52} ruined={0.8} dusk />
        <SmokeColumn position={[-10, 0, -24]} t={f / 30} h={20} scale={1.8} />
        <SmokeColumn position={[12, 0, -30]} t={f / 30 + 2} h={18} scale={1.5} />
        <T g={G.sph(6, 24, 16)} c="#ffb04a" emissive="#ff8a20" ei={1.2} position={[18, 6 - k * 3, -110]} o={false} />
        {/* titik-titik api perlawanan menyala di seluruh cakrawala */}
        {lights > 0
          ? Array.from({ length: 40 }).map((_, i) => {
              const on = lights > i / 40;
              const a = -1.2 + (i / 40) * 2.4;
              const r = 40 + (i % 5) * 12;
              return on ? <T key={i} g={G.sph(0.35, 8, 6)} c="#ffd860" emissive="#ff9a20" ei={2.4} position={[Math.sin(a) * r, 0.6 + (i % 3) * 0.4, -Math.cos(a) * r]} o={false} /> : null;
            })
          : null}
        <Embers f={f} n={30} seed={9} />
      </Stage>
      <Grade c="#ff9a5a" a={0.12} />
      <Bars />
      <Chip at={8} to={sem - 4} top={210} color="#9aa0b0">🕯️ ±3 minggu · ribuan pejuang gugur</Chip>
      <Chip at={sem + 6} to={D} top={210} color="#ffd23f">🔥 Semangat menjalar ke seluruh negeri</Chip>
      <Sub scene="akhir" />
    </AbsoluteFill>
  );
};

/* ===================== 9. HARI PAHLAWAN: Tugu Pahlawan ===================== */
export const SceneSbPahlawan: React.FC = () => {
  const f = useCurrentFrame();
  const D = DUR_SB("pahlawan");
  const hari = EV("pahl.hari");
  const k = rp(f, 0, D);
  const cam = orbit([0, 8, 0], lerp(30, 24, k), lerp(-0.6, 0.5, k), lerp(1.6, 3.0, k), 46, lerp(10, 12, k));
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#e88a4a">
        <ToonSky top="#2a2a5a" horizon="#ff9a4a" />
        <Fog c="#d88a5a" near={40} far={160} />
        <DuskLight />
        <T g={G.box(200, 0.1, 200)} c="#6a6a4a" position={[0, -0.05, 0]} o={false} />
        <T g={G.box(30, 0.12, 30)} c="#b8b0a0" position={[0, 0.02, 0]} o={false} />
        <TuguPahlawan position={[0, 0, 0]} />
        <FlagPole position={[-7, 0, 6]} h={12} merahPutih wave={f * 0.12} scale={1.6} />
        {[-10, -6, 6, 10].map((x, i) => (
          <group key={x} position={[x, 0, 12 + (i % 2) * 2]}>
            <T g={G.cyl(0.2, 0.3, 3, 8)} c="#5a3a22" position={[0, 1.5, 0]} />
            <T g={G.sph(2.2, 12, 10)} c="#2e5a2e" position={[0, 4.2, 0]} scale={[1, 0.9, 1]} />
          </group>
        ))}
        <CityBlock position={[-40, 0, -40]} n={11} seed={61} dusk />
        <T g={G.sph(7, 24, 16)} c="#ffc060" emissive="#ff9a30" ei={1.2} position={[-30, 10, -130]} o={false} />
      </Stage>
      <Grade c="#ff9a5a" a={0.1} />
      <Bars />
      <BigTitle at={hari - 2} to={D + 10} top={170} size={78} line1="10 NOVEMBER" line2="HARI PAHLAWAN 🇮🇩" badge="Surabaya, 1945" />
      <Sub scene="pahlawan" />
    </AbsoluteFill>
  );
};

// Adegan "Powerbank Melahirkan" (Kang Nawas zaman now) — gaya 3D explainer (toon + garis tepi, hologram X-ray, layar terbelah).
// Semua waktu aksi dari src/nawas_timing.json (scripts/build_audio_nawas.py), sinkron dengan suara.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import timing from "./nawas_timing.json";
import { Bean3, Bean3Params, BlueGrid, G, HEAD_R, Hat, Limb, T, ToonSky, Vec3, bean3HandWorld } from "./three/toon";
import { BabyPowerbank, BossPhone, BossRoomSet, Candle, HoloPhoneGrave, NawasPhone, OpenOfficeSet, Powerbank, Sign } from "./three/objectsNawas";
import { BOS, NAWAS, SINTA, UDIN } from "./SheetNawas";
import { BigTitle, Cam, Chip, Stage, SubWord, Vignette, kick, lerp, lv, pullBack, rp, shotCam, talkAt, walkLerp, yawTo } from "./sceneKit";

const TM = timing as any;
export type NwScene = "hook" | "pelit" | "pinjam" | "lahir" | "hpemas" | "meninggal" | "punchline" | "gratis";
export const NW_ORDER: NwScene[] = TM.order;
export const DUR_NW = (k: NwScene): number => TM.scenes[k].dur;
const EV = (n: string): number => TM.events[n];
const LN = (k: NwScene, i: number): { from: number; to: number } => TM.lines[k][i];
const Sub: React.FC<{ scene: NwScene }> = ({ scene }) => <SubWord timing={TM} scene={scene} />;

/* ---------------- perkakas kecil ---------------- */
const Day: React.FC<{ warm?: boolean }> = ({ warm }) => (
  <>
    <hemisphereLight args={[warm ? "#fff2dc" : "#f6faff", "#c8b8a0", 1.15]} />
    <directionalLight position={[-3, 7, 6]} intensity={1.6} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
  </>
);
const Holo: React.FC = () => (
  <>
    <hemisphereLight args={["#bfe4ff", "#123060", 1.6]} />
    <directionalLight position={[3, 6, 5]} intensity={1.5} color="#e8f4ff" />
    <ToonSky top="#020814" horizon="#0a2a5a" />
    <BlueGrid size={60} />
  </>
);
/** tangan besar untuk close-up insert (bola + lengan baju) */
const Hand: React.FC<{ at: Vec3; sleeve: string; glove?: string; dir?: Vec3; r?: number }> = ({ at, sleeve, glove = "#f1e2d0", dir = [0.5, -0.6, 0.6], r = 0.09 }) => (
  <group>
    <T g={G.sph(r, 16, 12)} c={glove} position={at} />
    <Limb a={at} b={[at[0] + dir[0], at[1] + dir[1], at[2] + dir[2]]} r={r * 0.55} c={sleeve} />
  </group>
);
const Coin: React.FC<{ position: Vec3; spin?: number }> = ({ position, spin = 0 }) => (
  <group position={position} rotation={[Math.PI / 2, spin, 0]}>
    <T g={G.cyl(0.035, 0.035, 0.008, 16)} c="#e8c040" emissive="#6a4a00" ei={0.3} o={2} />
  </group>
);
/** peci dipegang di tangan (dilepas saat berduka) */
const PeciHeld: React.FC<{ position: Vec3; yaw?: number }> = ({ position, yaw = 0 }) => (
  <group position={[position[0], position[1] - HEAD_R * 0.75, position[2]]} rotation={[1.2, yaw, 0]}>
    <Hat kind="peci" c="#1a1a20" band="#2a2a34" r={HEAD_R} />
  </group>
);
/** benda berpindah tangan: melayang melengkung dari a ke b dalam 15 frame */
const pass = (f: number, at: number, a: Vec3, b: Vec3, len = 15): Vec3 => {
  if (f < at) return a;
  if (f >= at + len) return b;
  const k = rp(f, at, at + len);
  const p = lv(a, b, k);
  return [p[0], p[1] + Math.sin(Math.PI * k) * 0.08, p[2]];
};
/** arah badan untuk shot dialog: menoleh ke lawan bicara tapi tetap 3/4 menghadap kamera (kamera di +z) */
const face = (a: Vec3, b: Vec3, k = 0.75) => Math.max(-1.0, Math.min(1.0, Math.atan2(b[0] - a[0], 1.0) * k * 1.3));
/** panggung close-up tersendiri: benda + tangan besar di depan latar (tanpa tokoh, kamera tidak masuk ke badan) */
const Insert: React.FC<{ set: React.ReactNode; at: Vec3; dist?: number; f: number; from: number; bg: string; warm?: boolean; children: React.ReactNode }> = ({ set, at, dist = 0.75, f, from, bg, warm, children }) => (
  <Stage cam={{ pos: [at[0] + 0.06, at[1] + 0.06, at[2] + dist - (f - from) * 0.002], look: at, fov: 34 }} bg={bg}>
    <Day warm={warm} />
    {set}
    {children}
  </Stage>
);
const REACH_XR: Vec3 = [-0.06, 0.98, 0.52]; // tangan kanan menjulur menyilang ke kiri badan
const REST_R: Vec3 = [0.42, 0.6, 0.1];
const REST_L: Vec3 = [-0.42, 0.6, 0.1];
const REACH_R: Vec3 = [0.18, 0.98, 0.5];
const REACH_L: Vec3 = [-0.18, 0.98, 0.5];
const CHEST_R: Vec3 = [0.12, 0.88, 0.32];
const CHEST_L: Vec3 = [-0.12, 0.88, 0.32];
/** lengan: istirahat -> menjulur -> kembali ke dada */
const armPath = (f: number, a: number, b: number, c: number, d: number, rest: Vec3, reach: Vec3, end: Vec3): Vec3 => {
  if (f < b) return lv(rest, reach, rp(f, a, b));
  if (f < c) return reach;
  return lv(reach, end, rp(f, c, d));
};
const Hearts: React.FC<{ f: number; at: number; pos: Vec3 }> = ({ f, at, pos }) => {
  if (f < at) return null;
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const k = ((f - at + i * 9) % 36) / 36;
        return (
          <group key={i} position={[pos[0] + Math.sin(i * 2.1) * 0.18 + Math.sin(k * 6) * 0.04, pos[1] + k * 0.6, pos[2]]} scale={0.04 * Math.sin(Math.PI * k)}>
            <T g={G.sph(1, 10, 8)} c="#ff4a8a" emissive="#ff2a6a" ei={0.5} position={[-0.5, 0, 0]} o={false} />
            <T g={G.sph(1, 10, 8)} c="#ff4a8a" emissive="#ff2a6a" ei={0.5} position={[0.5, 0, 0]} o={false} />
            <T g={G.cone(1.25, 1.6, 12)} c="#ff4a8a" emissive="#ff2a6a" ei={0.5} position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]} o={false} />
          </group>
        );
      })}
    </>
  );
};
const Sweat: React.FC<{ pos: Vec3; f: number }> = ({ pos, f }) => {
  const k = (f % 24) / 24;
  return <T g={G.sph(0.05, 10, 8)} c="#8ad8ff" emissive="#4ab8ff" ei={0.4} position={[pos[0] + 0.32, pos[1] - k * 0.25, pos[2] + 0.2]} scale={[0.8, 1.2, 0.8]} o={2} />;
};
const SplitLine: React.FC<{ vertical?: boolean }> = ({ vertical }) => (
  <div style={{ position: "absolute", left: vertical ? 534 : 0, top: vertical ? 0 : 954, width: vertical ? 12 : 1080, height: vertical ? 1920 : 12, background: "#ffd23f", boxShadow: "0 0 0 4px #0c0c10" }} />
);
const Panel: React.FC<{ x?: number; y?: number; w: number; h: number; children: React.ReactNode }> = ({ x = 0, y = 0, w, h, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>{children}</div>
);

/* posisi tetap di ruang Pak Bos */
const BOS_DESK: Vec3 = [-0.55, 0, -0.3];
const NAWAS_FRONT: Vec3 = [0.55, 0, -0.2];

/* ===================== 1. HOOK: powerbank + bayinya ===================== */
export const SceneNwHook: React.FC = () => {
  const f = useCurrentFrame();
  const give = EV("hook.give");
  const bayi = EV("hook.bayi");
  const D = DUR_NW("hook");
  const inA = bayi - 2;
  const inB = bayi + 30;
  const nYaw = face(NAWAS_FRONT, BOS_DESK);
  const bYaw = face(BOS_DESK, NAWAS_FRONT);
  const reach = rp(f, give - 6, give + 8);
  const nP: Bean3Params = { ...NAWAS, expr: f > bayi ? "smug" : "happy", lean: 0.12 * reach, handR: lv(REST_R, [0.2, 0.95, 0.48], reach), handL: lv(REST_L, [-0.2, 0.95, 0.48], reach), talk: 0 };
  const bP: Bean3Params = { ...BOS, expr: f >= bayi ? "shock" : "neutral", look: f >= bayi ? 0.4 : 0, lean: f >= bayi ? -0.08 : 0, bob: f >= bayi && f < bayi + 8 ? 0.06 * Math.sin(((f - bayi) / 8) * Math.PI) : 0 };
  const pbW = bean3HandWorld(nP, "R", NAWAS_FRONT, nYaw);
  const babyW = bean3HandWorld(nP, "L", NAWAS_FRONT, nYaw);
  const cam = shotCam(f, [{ to: D, p0: [0.2, 1.75, 6.0], l0: [0, 1.15, -0.2], p1: [0.1, 1.65, 4.9], l1: [0, 1.15, -0.2], fov: 42 }]);
  const close: Cam = { pos: [babyW[0] + 0.3, babyW[1] + 0.15, babyW[2] + 1.4], look: babyW, fov: 36 };
  const camF = pullBack(f, inB, inB + 20, close, cam);
  if (f >= inA && f < inB) {
    const at: Vec3 = [0, 1.05, 1.6];
    return (
      <AbsoluteFill>
        <Insert set={<BossRoomSet />} at={at} f={f} from={inA} bg="#3a2418" warm>
          <BabyPowerbank position={[at[0], at[1] + 0.02, at[2]]} rotation={[0, -0.25, Math.sin(f * 0.5) * 0.08]} scale={1.3} />
          <Hand at={[at[0] + 0.02, at[1] - 0.1, at[2] + 0.02]} sleeve={NAWAS.sleeve!} dir={[-0.4, -0.5, 0.5]} r={0.075} />
          <Hearts f={f} at={inA + 4} pos={[at[0], at[1] + 0.12, at[2]]} />
        </Insert>
        <Chip at={inA + 2} to={inB} top={250} color="#ff7ab0">👶 bayi powerbank?!</Chip>
        <Sub scene="hook" />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Stage cam={camF} bg="#3a2418">
        <Day warm />
        <BossRoomSet />
        <Bean3 p={nP} position={NAWAS_FRONT} rotation={[0, nYaw, 0]} />
        <Bean3 p={bP} position={BOS_DESK} rotation={[0, bYaw, 0]} />
        <Powerbank position={[pbW[0], pbW[1] + 0.1, pbW[2]]} rotation={[0, nYaw, 0]} />
        <BabyPowerbank position={[babyW[0], babyW[1] + 0.07, babyW[2]]} rotation={[0, nYaw, 0]} />
      </Stage>
      <Vignette />
      <BigTitle at={0} to={D} top={150} size={70} line1="POWERBANK" line2="BISA MELAHIRKAN?! 🔋👶" />
      <Sub scene="hook" />
    </AbsoluteFill>
  );
};

/* ===================== 2. BOS PELIT: colokan digembok, cas bayar ===================== */
export const SceneNwPelit: React.FC = () => {
  const f = useCurrentFrame();
  const gembok = EV("pelit.gembok");
  const bayar = EV("pelit.bayar");
  const bos = EV("pelit.bos");
  const D = DUR_NW("pelit");
  const inA = gembok - 4;
  const inB = bayar - 10;
  const udinPos: Vec3 = [-3.0, 0, -0.95];
  const bosPos: Vec3 = [-1.95, 0, -0.85];
  const uYaw = face(udinPos, bosPos);
  const bYaw0 = face(bosPos, udinPos);
  const turn = rp(f, bos - 10, bos + 4);
  const bYaw = lerp(bYaw0, 0.1, turn);
  // koin: Udin julurkan (bayar..+10) -> pindah (+10..+25) -> Bos tarik ke saku (+25..+40)
  const uHand = armPath(f, bayar - 6, bayar + 8, bayar + 24, bayar + 36, REST_R, REACH_R, REST_R);
  const bHandL = armPath(f, bayar + 2, bayar + 14, bayar + 26, bayar + 40, [-0.15, 0.8, 0.3], REACH_L, [-0.25, 0.72, 0.22]);
  const bHandR: Vec3 = f < bos - 4 ? [0.15, 0.8, 0.3] : lv([0.15, 0.8, 0.3], [0.25, 1.2, 0.58], rp(f, bos - 4, bos + 6));
  const uP: Bean3Params = { ...UDIN, expr: f > bayar + 20 ? "worried" : "puzzled", handR: uHand, handL: [-0.25, 0.95, 0.35] };
  const bP: Bean3Params = { ...BOS, expr: f >= bos ? "shout" : f > bayar + 26 ? "proud" : "smug", handR: bHandR, handL: bHandL, talk: talkAt(f, LN("pelit", 1), 0.9) };
  const uW = bean3HandWorld(uP, "R", udinPos, uYaw);
  const bW = bean3HandWorld(bP, "L", bosPos, bYaw);
  const coinPos = pass(f, bayar + 10, uW, bW);
  const showCoin = f < bayar + 34;
  const phoneW = bean3HandWorld(uP, "L", udinPos, uYaw);
  const camWide = shotCam(f, [{ to: inA, p0: [-0.2, 2.1, 5.0], l0: [-0.9, 1.15, -1.3], p1: [-1.2, 1.9, 4.3], l1: [-1.7, 1.15, -1.4], fov: 46 }]);
  const camTwo = shotCam(f, [
    { to: bos - 8, p0: [-2.3, 1.65, 3.6], l0: [-2.45, 1.15, -1.0], p1: [-2.4, 1.62, 3.3], l1: [-2.45, 1.15, -1.0], fov: 42 },
    { to: D, p0: [-2.4, 1.62, 3.3], l0: [-2.45, 1.15, -1.0], p1: [-2.0, 1.6, 2.6], l1: [-1.95, 1.3, -0.9], fov: 42, ease: bos + 12 },
  ]);
  const close: Cam = { pos: [-2.45, 1.2, -0.5], look: [-2.5, 1.15, -2.5], fov: 40 };
  const cam = f < inA ? camWide : pullBack(f, inB, inB + 20, close, camTwo);
  const people = (
    <>
      <Bean3 p={uP} position={udinPos} rotation={[0, uYaw, 0]} />
      <NawasPhoneHeld at={phoneW} yaw={uYaw} />
      <Bean3 p={bP} position={bosPos} rotation={[0, bYaw, 0]} />
      {showCoin && f >= bayar - 6 ? <Coin position={coinPos} spin={f * 0.3} /> : null}
      <Bean3 p={{ ...SINTA, expr: "worried", handL: [-0.18, 1.0, 0.45], handR: [0.18, 1.0 + Math.max(0, Math.sin(f * 1.3)) * 0.04, 0.45] }} position={[0.3, 0, -0.25]} rotation={[0, Math.PI + 0.35, 0]} />
      <Bean3 p={{ ...NAWAS, expr: "puzzled", look: -0.5 }} position={[0.9, 0, -0.1]} rotation={[0, -0.6, 0]} />
    </>
  );
  if (f >= inA && f < inB) {
    const tap = Math.max(0, Math.sin((f - inA) * 0.5)) * 0.03;
    return (
      <AbsoluteFill>
        <Stage cam={{ pos: [-2.45, 1.2, -0.5 - (f - inA) * 0.002], look: [-2.5, 1.15, -2.5], fov: 40 }} bg="#e8eef2">
          <Day />
          <OpenOfficeSet />
          <Hand at={[-2.3, 0.86 + tap, -2.38]} sleeve={BOS.sleeve!} glove={BOS.glove} dir={[0.5, -0.4, 0.7]} r={0.07} />
        </Stage>
        <Chip at={inA + 2} to={inB} top={250}>🔒 Colokan digembok · 💸 Rp2.000/jam</Chip>
        <Sub scene="pelit" />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#e8eef2">
        <Day />
        <OpenOfficeSet />
        {people}
      </Stage>
      <Vignette />
      <Chip at={4} to={inA} top={210}>🏢 PT. HEMAT JAYA</Chip>
      <Chip at={bayar + 24} to={bos - 6} top={210} color="#7ae87a">💰 +Rp2.000</Chip>
      <Chip at={bos} to={D} top={210} color="#ff6a4a">📜 Aturan Pak Bos: pinjam 1, balik 2</Chip>
      <Sub scene="pelit" />
    </AbsoluteFill>
  );
};
const NawasPhoneHeld: React.FC<{ at: Vec3; yaw: number }> = ({ at, yaw }) => <NawasPhone position={[at[0], at[1] + 0.06, at[2]]} rotation={[-0.3, yaw, 0]} battery={12} />;

/* ===================== 3. PINJAM POWERBANK (dari brankas) ===================== */
export const SceneNwPinjam: React.FC = () => {
  const f = useCurrentFrame();
  const batt = EV("pinjam.batt");
  const ask = EV("pinjam.ask");
  const give = EV("pinjam.give");
  const D = DUR_NW("pinjam");
  const inA = batt - 4;
  const inB = ask - 6;
  const bosPos: Vec3 = [1.55, 0, -1.05];
  const nIn = walkLerp(f, 0, batt - 10, [0.2, 0, 1.9], [0.5, 0, -0.45]);
  const nPos = nIn.pos;
  const nYaw = f < batt - 10 ? nIn.yaw : face(nPos, bosPos);
  // Bos: menghitung uang di brankas -> menoleh saat ditanya -> ambil powerbank -> serahkan -> tutup brankas
  const safeIn: Vec3 = [2.4, 0.6, -1.85];
  const bYawSafe = yawTo(bosPos, [2.4, 0, -1.9]);
  const bYawN = face(bosPos, nPos);
  const tReach = give - 34;
  const tOut = give - 18;
  const bYaw = f < ask + 6 ? bYawSafe : f < tReach ? lerp(bYawSafe, bYawN, rp(f, ask + 6, ask + 18)) : f < tOut ? lerp(bYawN, bYawSafe, rp(f, tReach, tReach + 8)) : lerp(bYawSafe, bYawN, rp(f, tOut, tOut + 10));
  const count = f < ask ? Math.sin(f * 0.6) * 0.04 : 0;
  const bHandR: Vec3 = f < tReach ? [0.25, 0.85 + count, 0.4] : f < tOut ? lv([0.25, 0.85, 0.4], [0.15, 0.62, 0.62], rp(f, tReach, tReach + 10)) : armPath(f, tOut, give, give + 15, give + 30, [0.15, 0.62, 0.62], REACH_XR, REST_R);
  const bP: Bean3Params = { ...BOS, expr: f < ask ? "happy" : f < give ? "smug" : "proud", handR: bHandR, handL: f < ask ? [-0.2, 0.85, 0.4] : REST_L, look: f > ask ? -0.3 : 0 };
  const phoneUp = f >= batt - 10 && f < give - 6;
  const nHandR: Vec3 = phoneUp ? [0.2, 1.05, 0.42] : f < give + 30 ? armPath(f, give - 10, give + 2, give + 15, give + 30, REST_R, REACH_R, CHEST_R) : CHEST_R;
  const nP: Bean3Params = { ...NAWAS, expr: f < ask ? "worried" : f < give + 15 ? "happy" : "smug", handR: nHandR, handL: f >= ask && f < give - 6 ? [-0.15, 0.95, 0.4] : REST_L, talk: talkAt(f, LN("pinjam", 1), 0.7), walk: nIn.walk };
  const nW = bean3HandWorld(nP, "R", nPos, nYaw);
  const bW = bean3HandWorld(bP, "R", bosPos, bYaw);
  const safeOpen = f < give + 34 ? 1 : 1 - rp(f, give + 34, give + 50);
  let pb: Vec3 = safeIn;
  if (f >= tReach + 10) pb = bW;
  if (f >= give) pb = pass(f, give, bW, nW);
  const cam = shotCam(f, [{ to: D, p0: [1.2, 1.8, 5.4], l0: [1.5, 1.1, -0.9], p1: [1.5, 1.7, 4.8], l1: [1.6, 1.1, -0.9], fov: 44 }]);
  if (f >= inA && f < inB) {
    const blink = Math.floor(f / 8) % 2 === 0;
    return (
      <AbsoluteFill>
        <Stage cam={{ pos: [0.05, 1.1, 0.75], look: [0, 1.05, 0], fov: 36 }} bg="#e8dcc8">
          <Day warm />
          <BossRoomSet safeOpen={1} />
          <group position={[0, 1.05, 0]} rotation={[0, 0, Math.sin(f * 0.2) * 0.03]}>
            <NawasPhone scale={2.4} battery={1} />
            {blink ? <T g={G.sph(0.03, 10, 8)} c="#ff3a3a" emissive="#ff0000" ei={1.5} position={[0.08, 0.18, 0.03]} o={false} /> : null}
          </group>
          <Hand at={[0.1, 0.84, 0.0]} sleeve={NAWAS.sleeve!} dir={[0.5, -0.5, 0.3]} r={0.08} />
        </Stage>
        <Chip at={inA + 2} to={inB} top={250} color="#ff4a4a">🪫 Baterai 1%</Chip>
        <Sub scene="pinjam" />
      </AbsoluteFill>
    );
  }
  const camF = pullBack(f, inB, inB + 20, { pos: [nW[0] + 0.2, nW[1] + 0.15, nW[2] + 1.5], look: nW, fov: 36 }, cam);
  return (
    <AbsoluteFill>
      <Stage cam={camF} bg="#e8dcc8">
        <Day warm />
        <BossRoomSet safeOpen={safeOpen} />
        <Bean3 p={nP} position={nPos} rotation={[0, nYaw, 0]} />
        <Bean3 p={bP} position={bosPos} rotation={[0, bYaw, 0]} />
        {phoneUp ? <NawasPhone position={[nW[0], nW[1] + 0.06, nW[2]]} rotation={[-0.2, nYaw, 0]} battery={1} /> : null}
        <Powerbank position={[pb[0], pb[1] + 0.08, pb[2]]} rotation={[0, f >= give ? nYaw : bYaw, 0]} />
        {f < ask ? <Coin position={[bW[0], bW[1] + 0.04, bW[2]]} spin={f * 0.4} /> : null}
      </Stage>
      <Vignette />
      <Chip at={8} to={inA} top={210}>🕔 Sore hari · ruang Pak Bos</Chip>
      <Chip at={give + 18} to={D} top={210} color="#7fe8ff">🔋 Pinjam 1 powerbank</Chip>
      <Sub scene="pinjam" />
    </AbsoluteFill>
  );
};

/* ===================== 4. POWERBANK "MELAHIRKAN" ===================== */
export const SceneNwLahir: React.FC = () => {
  const f = useCurrentFrame();
  const sel = EV("lahir.selamat");
  const lahir = EV("lahir.lahir");
  const girang = EV("lahir.girang");
  const terima = EV("lahir.terima");
  const D = DUR_NW("lahir");
  const inA = lahir - 2;
  const inB = lahir + 30;
  const nIn = walkLerp(f, 4, sel - 6, [1.7, 0, 2.0], NAWAS_FRONT);
  const nPos = nIn.pos;
  const nYaw = f < sel - 6 ? nIn.yaw : face(NAWAS_FRONT, BOS_DESK);
  const bYaw = face(BOS_DESK, nPos);
  const bow = rp(f, sel - 4, sel + 8) * (1 - rp(f, terima + 16, terima + 30));
  const nR = f < terima ? lv(REST_R, [0.2, 0.95, 0.48], bow) : lv([0.2, 0.95, 0.48], REST_R, rp(f, terima + 10, terima + 24));
  const nL = f < terima ? lv(REST_L, [-0.2, 0.95, 0.48], bow) : lv([-0.2, 0.95, 0.48], REST_L, rp(f, terima + 10, terima + 24));
  const nP: Bean3Params = { ...NAWAS, expr: f < lahir ? "happy" : "smug", lean: 0.22 * bow, handR: nR, handL: nL, talk: talkAt(f, LN("lahir", 0), 0.8), walk: nIn.walk };
  const laugh = f >= girang && f < terima;
  const take = rp(f, terima - 8, terima + 4);
  const cradle = f >= terima + 15;
  const rock = cradle ? Math.sin((f - terima) * 0.25) * 0.05 : 0;
  const bR: Vec3 = cradle ? lv(REACH_R, [0.18, 0.9, 0.36], rp(f, terima + 15, terima + 30)) : lv(REST_R, REACH_R, take);
  const bL: Vec3 = cradle ? lv(REACH_L, [-0.05 + rock, 1.0, 0.38], rp(f, terima + 15, terima + 30)) : lv(REST_L, REACH_L, take);
  const bP: Bean3Params = { ...BOS, expr: f < lahir ? "neutral" : laugh || cradle ? "laugh" : "shock", bob: laugh ? Math.abs(Math.sin(f * 0.5)) * 0.05 : 0, handR: bR, handL: bL };
  const nRW = bean3HandWorld(nP, "R", nPos, nYaw);
  const nLW = bean3HandWorld(nP, "L", nPos, nYaw);
  const bRW = bean3HandWorld(bP, "R", BOS_DESK, bYaw);
  const bLW = bean3HandWorld(bP, "L", BOS_DESK, bYaw);
  const pbPos = pass(f, terima, nRW, bRW);
  const babyPos = pass(f, terima + 3, nLW, bLW);
  const cam = shotCam(f, [{ to: D, p0: [0.3, 1.75, 6.0], l0: [0, 1.15, -0.2], p1: [0.1, 1.65, 4.9], l1: [0, 1.15, -0.2], fov: 42 }]);
  const camF = pullBack(f, inB, inB + 20, { pos: [nLW[0] + 0.3, nLW[1] + 0.15, nLW[2] + 1.4], look: nLW, fov: 36 }, cam);
  if (f >= inA && f < inB) {
    const at: Vec3 = [0, 1.05, 1.6];
    return (
      <AbsoluteFill>
        <Insert set={<BossRoomSet />} at={at} f={f} from={inA} bg="#e8dcc8" warm>
          <BabyPowerbank position={[at[0] - 0.05, at[1] + 0.02, at[2]]} rotation={[0, 0.2, Math.sin(f * 0.5) * 0.1]} scale={1.3} swaddle />
          <Hand at={[at[0] - 0.04, at[1] - 0.12, at[2] + 0.02]} sleeve={NAWAS.sleeve!} dir={[-0.4, -0.5, 0.5]} r={0.075} />
          <Powerbank position={[at[0] + 0.2, at[1] + 0.02, at[2] - 0.08]} rotation={[0, -0.3, 0]} scale={0.9} />
          <Hand at={[at[0] + 0.22, at[1] - 0.12, at[2] - 0.06]} sleeve={NAWAS.sleeve!} dir={[0.4, -0.5, 0.5]} r={0.075} />
          <Hearts f={f} at={inA + 2} pos={[at[0] - 0.05, at[1] + 0.15, at[2]]} />
        </Insert>
        <Chip at={inA + 2} to={inB} top={250} color="#ff7ab0">🍼 lahir: 1 bayi powerbank</Chip>
        <Sub scene="lahir" />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Stage cam={camF} bg="#e8dcc8">
        <Day warm />
        <BossRoomSet />
        <Bean3 p={nP} position={nPos} rotation={[0, nYaw, 0]} />
        <Bean3 p={bP} position={BOS_DESK} rotation={[0, bYaw, 0]} />
        <Powerbank position={[pbPos[0], pbPos[1] + 0.1, pbPos[2]]} rotation={[0, f >= terima + 8 ? bYaw : nYaw, 0]} />
        <BabyPowerbank position={[babyPos[0], babyPos[1] + 0.07, babyPos[2]]} rotation={[0, f >= terima + 10 ? bYaw : nYaw, cradle ? rock * 3 : 0]} swaddle />
        {cradle ? <Hearts f={f} at={terima + 15} pos={[bLW[0], bLW[1] + 0.25, bLW[2]]} /> : null}
      </Stage>
      <Vignette />
      <Chip at={6} to={sel} top={210}>☀️ Besok paginya…</Chip>
      <Chip at={terima + 20} to={D} top={210} color="#7ae87a">📈 STOK POWERBANK: 1 → 2</Chip>
      <Sub scene="lahir" />
    </AbsoluteFill>
  );
};

/* ===================== 5. PINJAM HP EMAS ===================== */
export const SceneNwHpEmas: React.FC = () => {
  const f = useCurrentFrame();
  const pamer = EV("hp.pamer");
  const boleh = EV("hp.boleh");
  const give = EV("hp.give");
  const D = DUR_NW("hpemas");
  const inA = pamer - 2;
  const inB = pamer + 32;
  const bosPos: Vec3 = [0.5, 0, 0.45];
  const nPos: Vec3 = [-0.55, 0, 0.5];
  const bYaw = face(bosPos, nPos);
  const nYaw = face(nPos, bosPos);
  const show = f < give - 8;
  const bR: Vec3 = show ? lv(REST_R, [0.3, 1.3, 0.35], rp(f, 6, 22)) : armPath(f, give - 8, give, give + 15, give + 28, [0.3, 1.3, 0.35], REACH_XR, REST_R);
  const bP: Bean3Params = { ...BOS, expr: f > give + 20 ? "smug" : f >= boleh ? "happy" : "proud", handR: bR, talk: talkAt(f, LN("hpemas", 1), 0.8), headTilt: f > give + 20 ? 0.12 : 0 };
  const pocket: Vec3 = [0.16, 0.78, 0.26];
  const nR: Vec3 = armPath(f, give - 6, give + 2, give + 16, give + 30, REST_R, REACH_R, pocket);
  const nP: Bean3Params = { ...NAWAS, expr: f > give + 30 ? "smug" : "happy", handR: f < give - 6 ? REST_R : nR, look: show ? 0.3 : 0 };
  const bW = bean3HandWorld(bP, "R", bosPos, bYaw);
  const nW = bean3HandWorld(nP, "R", nPos, nYaw);
  const phonePos = pass(f, give, bW, nW);
  const showPhone = f < give + 30;
  const cam = shotCam(f, [{ to: D, p0: [-0.2, 1.85, 6.0], l0: [0, 1.2, 0.2], p1: [0.05, 1.7, 5.2], l1: [0, 1.2, 0.3], fov: 44 }]);
  if (f >= inA && f < inB) {
    const at: Vec3 = [0, 1.15, 1.7];
    return (
      <AbsoluteFill>
        <Insert set={<OpenOfficeSet />} at={at} f={f} from={inA} bg="#e8eef2">
          <BossPhone position={at} rotation={[0, Math.sin(f * 0.12) * 0.45, 0]} battery={100} scale={1.3} />
          <Hand at={[at[0] + 0.02, at[1] - 0.13, at[2] + 0.01]} sleeve={BOS.sleeve!} glove={BOS.glove} dir={[0.4, -0.5, 0.5]} r={0.07} />
          {[0, 1, 2, 3].map((i) => {
            const k = ((f - inA + i * 8) % 32) / 32;
            return <T key={i} g={G.ico(0.02, 0)} c="#fff4b0" emissive="#ffe060" ei={2} position={[at[0] + Math.sin(i * 2.4) * 0.13, at[1] + Math.cos(i * 1.7) * 0.13, at[2] + 0.05]} scale={Math.sin(Math.PI * k) * 1.4} o={false} />;
          })}
        </Insert>
        <Chip at={inA + 2} to={inB} top={250} color="#ffd23f">📱 HP terbaru · 3 kamera · emas</Chip>
        <Sub scene="hpemas" />
      </AbsoluteFill>
    );
  }
  const camF = pullBack(f, inB, inB + 20, { pos: [bW[0] + 0.2, bW[1] + 0.1, bW[2] + 1.4], look: bW, fov: 36 }, cam);
  return (
    <AbsoluteFill>
      <Stage cam={camF} bg="#e8eef2">
        <Day />
        <OpenOfficeSet />
        <Bean3 p={bP} position={bosPos} rotation={[0, bYaw, 0]} />
        <Bean3 p={nP} position={nPos} rotation={[0, nYaw, 0]} />
        <Bean3 p={{ ...SINTA, expr: "puzzled", look: 0.4 }} position={[-1.1, 0, -0.35]} rotation={[0, 0.5, 0]} />
        <Bean3 p={{ ...UDIN, expr: "worried", look: -0.4 }} position={[1.35, 0, -0.3]} rotation={[0, -0.5, 0]} />
        {showPhone ? <BossPhone position={[phonePos[0], phonePos[1] + 0.1, phonePos[2]]} rotation={[0, f >= give ? nYaw : bYaw + Math.sin(f * 0.12) * 0.3, 0]} /> : null}
      </Stage>
      <Vignette />
      <Chip at={6} to={inA} top={210}>📅 Seminggu kemudian…</Chip>
      <Chip at={give + 20} to={D} top={210} color="#ff9a4a">⚠️ Syarat: balik bawa anaknya</Chip>
      <Sub scene="hpemas" />
    </AbsoluteFill>
  );
};

/* ===================== 6. "HP MENINGGAL" (layar terbelah: hologram makam + wajah Bos) ===================== */
export const SceneNwMeninggal: React.FC = () => {
  const f = useCurrentFrame();
  const start = EV("mati.start");
  const word = EV("mati.word");
  const bentak = EV("mati.bentak");
  const D = DUR_NW("meninggal");
  const splitA = word;
  const splitB = bentak + 26;
  const nIn = walkLerp(f, 4, start - 4, [1.5, 0, 2.2], NAWAS_FRONT);
  const nPos = nIn.pos;
  const nYaw = f < start - 4 ? nIn.yaw : face(NAWAS_FRONT, BOS_DESK);
  const bYaw = face(BOS_DESK, nPos);
  const nP: Bean3Params = { ...NAWAS, hide: ["hat"], expr: "worried", headTilt: -0.12, handR: CHEST_R, handL: CHEST_L, walk: nIn.walk, talk: talkAt(f, LN("meninggal", 0), 0.5) };
  const peciW = lv(bean3HandWorld(nP, "R", nPos, nYaw), bean3HandWorld(nP, "L", nPos, nYaw), 0.5);
  const angry = f >= bentak;
  const bP: Bean3Params = { ...BOS, expr: angry ? "shout" : f >= word ? "shock" : "happy", handL: [-0.05, 0.98, 0.36], handR: angry ? [0.35, 1.25, 0.5] : [0.18, 0.9, 0.36], talk: talkAt(f, LN("meninggal", 1), 1), lean: angry ? 0.1 : 0 };
  const babyW = bean3HandWorld(bP, "L", BOS_DESK, bYaw);
  // pelayat: Sinta & Udin di belakang Nawas (bertingkat), memegang lilin
  const s0 = walkLerp(f, 14, start + 6, [2.0, 0, 2.4], [1.3, 0, -0.75]);
  const u0 = walkLerp(f, 22, start + 14, [2.4, 0, 2.6], [1.8, 0, -1.25]);
  const sP: Bean3Params = { ...SINTA, expr: "worried", handR: [0.2, 0.78, 0.38], walk: s0.walk };
  const uP: Bean3Params = { ...UDIN, expr: "worried", handR: [0.2, 0.78, 0.38], walk: u0.walk };
  const sYaw = f < start + 6 ? s0.yaw : face(s0.pos, BOS_DESK);
  const uYaw = f < start + 14 ? u0.yaw : face(u0.pos, BOS_DESK);
  const shake = kick(f, [bentak + 2, bentak + 10], 0.06);
  const room = (camera: Cam, extra?: React.ReactNode) => (
    <Stage cam={camera} shake={shake} bg="#e8dcc8">
      <Day warm />
      <BossRoomSet />
      <Bean3 p={nP} position={nPos} rotation={[0, nYaw, 0]} />
      <PeciHeld position={peciW} yaw={nYaw} />
      <Bean3 p={bP} position={BOS_DESK} rotation={[0, bYaw, 0]} />
      <BabyPowerbank position={[babyW[0], babyW[1] + 0.07, babyW[2]]} rotation={[0, bYaw, 0]} swaddle />
      <Bean3 p={sP} position={s0.pos} rotation={[0, sYaw, 0]} />
      <Candle position={bean3HandWorld(sP, "R", s0.pos, sYaw)} flicker={f * 0.6} />
      <Bean3 p={uP} position={u0.pos} rotation={[0, uYaw, 0]} />
      <Candle position={bean3HandWorld(uP, "R", u0.pos, uYaw)} flicker={f * 0.6 + 2} />
      {extra}
    </Stage>
  );
  const camWide = shotCam(f, [{ to: D, p0: [0.7, 1.85, 6.6], l0: [0.55, 1.1, -0.5], p1: [0.6, 1.75, 6.0], l1: [0.5, 1.1, -0.5], fov: 44 }]);
  if (f >= splitA && f < splitB) {
    const bHead: Vec3 = [BOS_DESK[0], 1.45, BOS_DESK[2]];
    const fx = Math.sin(bYaw) * 1.6;
    const fz = Math.cos(bYaw) * 1.6;
    return (
      <AbsoluteFill style={{ background: "#020a1c" }}>
        <Panel w={1080} h={960}>
          <Stage cam={{ pos: [0.4, 1.35, 3.0 - (f - splitA) * 0.004], look: [0, 0.85, 0], fov: 42 }} h={960} bg="#020a1c">
            <Holo />
            <HoloPhoneGrave t={(f - splitA) / 30} />
          </Stage>
          <Chip at={splitA + 4} to={splitB} top={60} color="#7fe8ff">🪦 HP Pak Bos · 2025–2026</Chip>
        </Panel>
        <Panel y={960} w={1080} h={960}>
          <Stage cam={{ pos: [bHead[0] + fx, bHead[1] + 0.1, bHead[2] + fz], look: bHead, fov: 38 }} shake={shake} h={960} bg="#e8dcc8">
            <Day warm />
            <BossRoomSet />
            <Bean3 p={bP} position={BOS_DESK} rotation={[0, bYaw, 0]} />
            <BabyPowerbank position={[babyW[0], babyW[1] + 0.07, babyW[2]]} rotation={[0, bYaw, 0]} swaddle />
            {angry ? <Sweat pos={bHead} f={f} /> : null}
          </Stage>
        </Panel>
        <SplitLine />
        <Sub scene="meninggal" />
      </AbsoluteFill>
    );
  }
  const camF = pullBack(f, splitB, splitB + 18, { pos: [BOS_DESK[0] + 0.6, 1.55, BOS_DESK[2] + 1.5], look: [BOS_DESK[0], 1.35, BOS_DESK[2]], fov: 40 }, camWide);
  return (
    <AbsoluteFill>
      {room(camF)}
      <Vignette />
      <Chip at={6} to={start} top={210} color="#9aa0b0">🕯️ Kang Nawas datang… berduka</Chip>
      <Sub scene="meninggal" />
    </AbsoluteFill>
  );
};

/* ===================== 7. PUNCHLINE (layar terbelah kiri/kanan) ===================== */
export const SceneNwPunch: React.FC = () => {
  const f = useCurrentFrame();
  const start = EV("punch.start");
  const pl = EV("punch.lahir");
  const pm = EV("punch.mati");
  const mel = EV("punch.melongo");
  const D = DUR_NW("punchline");
  const bYaw = face(BOS_DESK, NAWAS_FRONT);
  const nYaw = face(NAWAS_FRONT, BOS_DESK);
  const nP: Bean3Params = { ...NAWAS, expr: "smug", handR: f < pl ? [0.3, 1.05, 0.4] : REST_R, handL: [-0.3, 0.75, 0.2], talk: talkAt(f, LN("punchline", 0), 0.8), headTilt: 0.1, look: 0.3 };
  const bP: Bean3Params = { ...BOS, expr: f >= mel - 4 ? "shock" : "angry", handL: [-0.05, 0.98, 0.36], handR: REST_R, bob: f >= mel ? -0.02 : 0 };
  const babyW = bean3HandWorld(bP, "L", BOS_DESK, bYaw);
  const room = (cam: Cam) => (
    <Stage cam={cam} bg="#e8dcc8">
      <Day warm />
      <BossRoomSet />
      <Bean3 p={nP} position={NAWAS_FRONT} rotation={[0, nYaw, 0]} />
      <Bean3 p={bP} position={BOS_DESK} rotation={[0, bYaw, 0]} />
      <BabyPowerbank position={[babyW[0], babyW[1] + 0.07, babyW[2]]} rotation={[0, bYaw, 0]} swaddle />
      {f >= mel + 10 ? (
        <>
          <Bean3 p={{ ...SINTA, expr: "laugh", handR: [0.08, 1.2, 0.42], bob: Math.abs(Math.sin(f * 0.5)) * 0.03 }} position={[1.4, 0, -0.8]} rotation={[0, -0.5, 0]} />
          <Bean3 p={{ ...UDIN, expr: "laugh", handL: [-0.08, 1.2, 0.42], bob: Math.abs(Math.sin(f * 0.5 + 1)) * 0.03 }} position={[1.85, 0, -1.3]} rotation={[0, -0.6, 0]} />
        </>
      ) : null}
    </Stage>
  );
  if (f >= pl && f < mel - 4) {
    return (
      <AbsoluteFill style={{ background: "#020a1c" }}>
        <Panel w={540} h={1920}>
          <Stage cam={{ pos: [0, 0.55, 1.6], look: [0, 0.35, 0], fov: 40 }} w={540} bg="#020a1c">
            <Holo />
            <BabyPowerbank position={[0, 0.35, 0]} rotation={[0, Math.sin(f * 0.08) * 0.5, 0]} scale={2.4} swaddle />
            <Hearts f={f} at={pl} pos={[0, 0.65, 0]} />
          </Stage>
          <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 52, color: "#7ae87a", textShadow: "4px 4px 0 #0c0c10" }}>
            MELAHIRKAN
            <div style={{ fontSize: 40, color: "#fff" }}>✅ percaya</div>
          </div>
        </Panel>
        <Panel x={540} w={540} h={1920}>
          {f >= pm ? (
            <>
              <Stage cam={{ pos: [0.2, 1.35, 3.4], look: [0, 0.85, 0], fov: 44 }} w={540} bg="#020a1c">
                <Holo />
                <HoloPhoneGrave t={(f - pm) / 30 + 1} />
              </Stage>
              <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 52, color: "#ff7a6a", textShadow: "4px 4px 0 #0c0c10" }}>
                MENINGGAL
                <div style={{ fontSize: 40, color: "#fff" }}>❌ nggak percaya?</div>
              </div>
            </>
          ) : (
            <div style={{ width: 540, height: 1920, background: "radial-gradient(#0a2a5a, #020814)" }} />
          )}
        </Panel>
        <SplitLine vertical />
        <Sub scene="punchline" />
      </AbsoluteFill>
    );
  }
  const bHead: Vec3 = [BOS_DESK[0], 1.45, BOS_DESK[2]];
  const fx = Math.sin(bYaw);
  const fz = Math.cos(bYaw);
  const closeBos: Cam = { pos: [bHead[0] + fx * 1.4, 1.5, bHead[2] + fz * 1.4], look: bHead, fov: 38 };
  const two = shotCam(f, [{ to: pl, p0: [0.15, 1.7, 4.6], l0: [0, 1.25, -0.25], p1: [0.1, 1.65, 4.1], l1: [0, 1.25, -0.25], fov: 42 }]);
  const wide: Cam = { pos: [0.7, 1.85, 6.6], look: [0.55, 1.1, -0.5], fov: 44 };
  const cam = f < pl ? two : f < mel + 24 ? closeBos : pullBack(f, mel + 24, mel + 54, closeBos, wide);
  return (
    <AbsoluteFill>
      {room(cam)}
      <Vignette />
      {f >= mel + 6 ? <Chip at={mel + 6} to={D} top={210} color="#9aa0b0">🦗 …krik krik</Chip> : null}
      <Sub scene="punchline" />
    </AbsoluteFill>
  );
};

/* ===================== 8. CAS GRATIS + HP "HIDUP LAGI" ===================== */
export const SceneNwGratis: React.FC = () => {
  const f = useCurrentFrame();
  const cabut = EV("gratis.cabut");
  const grat = EV("gratis.gratis");
  const balik = EV("gratis.balik");
  const end = EV("gratis.end");
  const D = DUR_NW("gratis");
  const bosSign: Vec3 = [-2.05, 0, -1.95];
  const bosMid: Vec3 = [-0.45, 0, 0.45];
  const nPos: Vec3 = [0.6, 0, 0.6];
  const bWalk = walkLerp(f, grat + 14, balik - 14, bosSign, bosMid);
  const bPos = f < grat + 14 ? bosSign : bWalk.pos;
  const atSign = f < grat + 14;
  const bYaw = atSign ? -Math.PI / 2 : f < balik - 14 ? bWalk.yaw : face(bosMid, nPos);
  // tangan Bos mencabut papan lama (cabut..+20), lalu menempel papan baru (grat-6..grat+4)
  const signOld: Vec3 = [-2.5, 1.4, -2.47];
  const SIGN_L: Vec3 = [-0.5, 1.36, 0.42]; // tangan kiri menyentuh papan di dinding
  const DOWN_L: Vec3 = [-0.45, 0.75, 0.3];
  const bL: Vec3 = atSign
    ? f < cabut
      ? lv(REST_L, SIGN_L, rp(f, cabut - 14, cabut))
      : f < grat - 6
        ? lv(SIGN_L, DOWN_L, rp(f, cabut + 6, cabut + 22))
        : lv(DOWN_L, SIGN_L, rp(f, grat - 6, grat + 2))
    : REST_L;
  const bR: Vec3 = atSign || f < balik ? REST_R : armPath(f, balik + 2, balik + 12, balik + 26, balik + 40, REST_R, REACH_R, [0.2, 1.05, 0.42]);
  const bP: Bean3Params = { ...BOS, expr: f < grat ? "worried" : f < balik ? "neutral" : "happy", handR: bR, walk: bWalk.walk, handL: bL };
  const bRW = bean3HandWorld(bP, "R", bPos, bYaw);
  const bLW = bean3HandWorld(bP, "L", bPos, bYaw);
  const peel = rp(f, cabut, cabut + 8);
  const oldSign: Vec3 = f < cabut + 6 ? signOld : f < grat - 8 ? [bLW[0] - 0.05, bLW[1] + 0.05, bLW[2]] : [-2.6, 0.03, -1.6];
  const nR: Vec3 = f < balik - 10 ? [0.18, 1.05, 0.42] : armPath(f, balik - 10, balik + 2, balik + 18, balik + 30, [0.18, 1.05, 0.42], REACH_XR, REST_R);
  const nP: Bean3Params = { ...NAWAS, expr: f > balik + 20 ? "laugh" : "smug", handR: nR, talk: talkAt(f, LN("gratis", 1), 0.8) };
  const nYaw = face(nPos, bosMid);
  const nW = bean3HandWorld(nP, "R", nPos, nYaw);
  const phonePos = pass(f, balik + 12, nW, bRW);
  const cheer = f >= grat;
  const jump = (i: number) => (cheer ? Math.max(0, Math.sin((f - grat - i * 4) * 0.32)) * 0.22 : 0);
  const sP: Bean3Params = { ...SINTA, expr: cheer ? "laugh" : "puzzled", bob: jump(0), handL: cheer ? [-0.35, 1.5, 0.15] : undefined, handR: cheer ? [0.35, 1.5, 0.15] : undefined };
  const uP: Bean3Params = { ...UDIN, expr: cheer ? "laugh" : "puzzled", bob: jump(1), handR: [0.2, 0.95, 0.4] };
  const uPos: Vec3 = [-1.55, 0, -1.1];
  const uYaw = 0.6;
  const uPhone = bean3HandWorld(uP, "R", uPos, uYaw);
  const camSign: Cam = shotCam(f, [{ to: grat + 10, p0: [-1.6, 1.6, 1.4], l0: [-2.35, 1.15, -2.1], p1: [-1.75, 1.55, 1.0], l1: [-2.35, 1.15, -2.1], fov: 44 }]);
  const camWide: Cam = shotCam(f, [{ to: D, p0: [-0.6, 1.9, 6.2], l0: [-0.5, 1.15, -0.5], p1: [0.0, 1.75, 5.4], l1: [0.0, 1.15, 0.0], fov: 44 }]);
  const cam = f < grat + 10 ? camSign : pullBack(f, grat + 10, grat + 40, camSign, camWide);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#e8eef2">
        <Day />
        <OpenOfficeSet sign={false} locked={f < cabut + 4} />
        {f < grat ? <Sign position={oldSign} rotation={[f >= grat - 8 ? -Math.PI / 2 : 0, 0, 0]} w={0.8} h={0.42} lines={["CAS HP", "Rp2.000/JAM"]} peel={f < cabut + 6 ? peel : 0} /> : <Sign position={[-2.6, 0.03, -1.6]} rotation={[-Math.PI / 2, 0, 0.4]} w={0.8} h={0.42} lines={["CAS HP", "Rp2.000/JAM"]} />}
        {f >= grat - 2 ? <group scale={1 + 0.15 * Math.max(0, 1 - (f - grat) / 8)} position={[-2.5, 1.4, -2.47]}><Sign w={0.8} h={0.42} lines={["CAS GRATIS", "untuk semua"]} bg="#d8ffd8" fg="#1a7a3a" /></group> : null}
        <Bean3 p={bP} position={bPos} rotation={[0, bYaw, 0]} />
        <Bean3 p={nP} position={nPos} rotation={[0, nYaw, 0]} />
        {<BossPhone position={[phonePos[0], phonePos[1] + 0.1, phonePos[2]]} rotation={[0, f >= balik + 20 ? bYaw : nYaw, 0]} battery={100} />}
        <Bean3 p={sP} position={[0.95, 0, -0.5]} rotation={[0, -0.4, 0]} />
        <Bean3 p={uP} position={uPos} rotation={[0, uYaw, 0]} />
        <NawasPhone position={[uPhone[0], uPhone[1] + 0.06, uPhone[2]]} rotation={[-0.3, uYaw, 0]} battery={cheer ? 100 : 12} />
        {f >= cabut + 4 ? <CableToStrip to={uPhone} /> : null}
        {f >= grat ? <Confetti f={f} at={grat} /> : null}
      </Stage>
      <Vignette />
      <Chip at={grat + 4} to={balik - 4} top={210} color="#7ae87a">🔌 CAS HP: GRATIS!</Chip>
      <Chip at={balik + 22} to={end} top={210} color="#7fe8ff">📱 HP Pak Bos “hidup lagi” · 100%</Chip>
      <BigTitle at={end} to={D + 10} top={170} size={64} line1="FOLLOW" line2="untuk kisah Kang Nawas berikutnya!" />
      <Sub scene="gratis" />
    </AbsoluteFill>
  );
};
const CableToStrip: React.FC<{ to: Vec3 }> = ({ to }) => {
  const a: Vec3 = [-2.38, 0.95, -2.42];
  const n = 10;
  const pts: Vec3[] = Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n;
    return [lerp(a[0], to[0], k), lerp(a[1], to[1], k) - Math.sin(Math.PI * k) * 0.45, lerp(a[2], to[2], k)];
  });
  return (
    <>
      {pts.slice(1).map((p, i) => (
        <Limb key={i} a={pts[i]} b={p} r={0.008} c="#f4f4f4" o={false} />
      ))}
    </>
  );
};
const Confetti: React.FC<{ f: number; at: number }> = ({ f, at }) => (
  <>
    {Array.from({ length: 40 }).map((_, i) => {
      const t = (f - at) / 30;
      const x = -2.4 + ((i * 37) % 100) / 100 * 3.4;
      const z = -1.4 + ((i * 53) % 100) / 100 * 2.4;
      const y = 2.9 - ((t * (0.8 + (i % 5) * 0.15) + (i % 7) * 0.1) % 2.9);
      return <T key={i} g={G.box(0.05, 0.08, 0.005)} c={["#ffd23f", "#ff4a8a", "#4ab8ff", "#7ae87a"][i % 4]} position={[x + Math.sin(f * 0.1 + i) * 0.1, y, z]} rotation={[f * 0.1 + i, f * 0.13, i]} o={false} />;
    })}
  </>
);

// Adegan "Kantor di Atas Awan" (Kang Nawas #2) — gaya 3D explainer. Waktu aksi dari src/awan_timing.json (scripts/build_audio_awan.py).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import timing from "./awan_timing.json";
import { Bean3, Bean3Params, G, Limb, T, ToonSky, Vec3, XR, bean3HandWorld } from "./three/toon";
import { BossRoomSet, OpenOfficeSet } from "./three/objectsNawas";
import { Brick, Bucket, CardboardOffice, Kite, Moon, OldPhoto, Piggy, PlasticChair, Prescription, RooftopSet, ScreenPhone, Shovel, Tears, ToyDrone } from "./three/objectsAwan";
import { BOS, NAWAS, SINTA, UDIN } from "./SheetNawas";
import { CHEST_R, Day, Hand, Insert, Panel, REACH_R, REST_L, REST_R, SplitLine, armPath, face, pass } from "./scenesNawas";
import { BigTitle, Cam, Chip, Stage, SubWord, Vignette, kick, lerp, lv, pullBack, rp, shotCam, talkAt, walkLerp } from "./sceneKit";

const TM = timing as any;
export type AwScene = "hook" | "perintah" | "sedih" | "sanggup" | "siap" | "harih" | "lempar" | "runtuh" | "kejutan" | "bulan";
export const AW_ORDER: AwScene[] = TM.order;
export const DUR_AW = (k: AwScene): number => TM.scenes[k].dur;
const EV = (n: string): number => TM.events[n];
const LN = (k: AwScene, i: number): { from: number; to: number } => TM.lines[k][i];
const Sub: React.FC<{ scene: AwScene }> = ({ scene }) => <SubWord timing={TM} scene={scene} />;

/* ---------------- perkakas ---------------- */
const HELM = (p: Bean3Params, c = "#ffcc1a"): Bean3Params => ({ ...p, hat: "helmet", hatColor: c, hatBand: "#e8a800" });
const NAWAS_H = HELM(NAWAS);
const SINTA_H = HELM(SINTA, "#f4f4f4");
const UDIN_H = HELM(UDIN, "#ff8a2a");
/** titik dunia -> koordinat tangan lokal tokoh (kebalikan bean3HandWorld, tanpa lean/bob) */
const toLocal = (w: Vec3, pos: Vec3, yaw: number): Vec3 => {
  const dx = w[0] - pos[0],
    dz = w[2] - pos[2];
  return [dx * Math.cos(yaw) - dz * Math.sin(yaw), w[1] - pos[1], dx * Math.sin(yaw) + dz * Math.cos(yaw)];
};
const Sky: React.FC<{ dusk?: number }> = ({ dusk = 0 }) => (
  <ToonSky top={dusk > 0.5 ? "#2a2060" : "#3a8ae0"} horizon={dusk > 0.5 ? "#ff9a4a" : "#cfe8ff"} />
);
const RoofLight: React.FC<{ dusk?: number }> = ({ dusk = 0 }) =>
  dusk > 0.3 ? (
    <>
      <hemisphereLight args={["#ffd8a8", "#5a3a5a", 1.0]} />
      <directionalLight position={[6, 3, -4]} intensity={1.5} color="#ffb070" castShadow />
      <directionalLight position={[-3, 5, 6]} intensity={0.6} color="#c8b8ff" />
    </>
  ) : (
    <Day />
  );
/** hologram gedung melayang di atas awan (X-ray) */
const CloudTower: React.FC<{ position: Vec3; k: number; t: number }> = ({ position, k, t }) =>
  k <= 0 ? null : (
    <group position={[position[0], position[1] + Math.sin(t * 1.5) * 0.05, position[2]]} scale={k} rotation={[0, t * 0.3, 0]}>
      <XR g={G.box(0.32, 0.7, 0.32)} position={[0, 0.45, 0]} color="#7fe8ff" />
      <XR g={G.box(0.2, 0.45, 0.2)} position={[0.25, 0.3, 0.1]} color="#7fe8ff" />
      <XR g={G.cone(0.12, 0.25, 4)} position={[0, 0.92, 0]} color="#ffd23f" />
      {[
        [-0.25, 0, 0, 0.2],
        [0.05, -0.04, 0.1, 0.24],
        [0.32, 0, -0.05, 0.18],
        [0, 0.02, -0.25, 0.19],
      ].map(([x, y, z, r], i) => (
        <XR key={i} g={G.sph(r, 16, 12)} position={[x, y, z]} scale={[1, 0.6, 1]} color="#ffffff" edges={false} />
      ))}
    </group>
  );
const Fall: React.FC<{ pos: Vec3; yaw: number; k: number; children: React.ReactNode }> = ({ pos, yaw, k, children }) => (
  <group position={pos} rotation={[0, yaw, 0]}>
    <group rotation={[-k * 1.3, 0, 0]}>{children}</group>
  </group>
);

/* posisi tetap rooftop */
const CAR_POS: Vec3 = [2.35, 0, -0.35];
const CAR_ROT = Math.PI;
const HOOD: Vec3 = [CAR_POS[0] - 0.6, 0.68, CAR_POS[2] - 0.05];
const OFFICE_POS: Vec3 = [-1.7, 0, -1.7];
const PIGGY: Vec3 = [0.85, 0.22, 1.05];
const PILE: Vec3 = [-1.05, 0, 0.95];
const BrickPile: React.FC<{ n?: number }> = ({ n = 5 }) => (
  <group position={PILE}>
    {Array.from({ length: n }).map((_, i) => (
      <Brick key={i} position={[(i % 2) * 0.1 - 0.05, 0.03 + Math.floor(i / 2) * 0.06, (i % 3) * 0.04]} rotation={[0, (i % 2) * Math.PI / 2, 0]} />
    ))}
  </group>
);

/* ===================== 1. HOOK ===================== */
export const SceneAwHook: React.FC = () => {
  const f = useCurrentFrame();
  const aw = EV("hook.awan");
  const D = DUR_AW("hook");
  const up = f >= aw;
  const holo = rp(f, aw - 4, aw + 10);
  const who: [Bean3Params, Vec3, number][] = [
    [SINTA, [-0.85, 0, -0.2], 0.35],
    [NAWAS, [0.05, 0, 0.45], 0],
    [UDIN, [0.9, 0, -0.1], -0.35],
  ];
  const cam = shotCam(f, [{ to: D, p0: [0.1, 1.9, 6.0], l0: [0, 1.45, -0.4], p1: [0.05, 1.8, 5.0], l1: [0, 1.5, -0.4], fov: 44 }]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#e8eef2">
        <Day />
        <OpenOfficeSet />
        {who.map(([p, pos, yaw], i) => (
          <Bean3 key={i} p={{ ...p, expr: up ? "shock" : "neutral", lean: up ? -0.12 : 0, bob: up && f < aw + 8 ? 0.05 * Math.sin(((f - aw) / 8) * Math.PI) : 0, handL: up ? [-0.3, 1.05, 0.35] : undefined, handR: up ? [0.3, 1.05, 0.35] : undefined }} position={pos} rotation={[0, yaw, 0]} />
        ))}
        <CloudTower position={[0, 2.35, -0.6]} k={holo} t={f / 30} />
      </Stage>
      <Vignette />
      <BigTitle at={0} to={D} top={150} size={70} line1="KANTOR" line2="DI ATAS AWAN?! ☁️🏢" />
      <Sub scene="hook" />
    </AbsoluteFill>
  );
};

/* ===================== 2. PERINTAH GILA (ruang Pak Bos) ===================== */
export const SceneAwPerintah: React.FC = () => {
  const f = useCurrentFrame();
  const geb = EV("perintah.gebrak");
  const aw = EV("perintah.awan");
  const pec = EV("perintah.pecat");
  const D = DUR_AW("perintah");
  const bos: Vec3 = [0, 0, -1.75];
  const hit = geb + 4;
  const raise = rp(f, geb - 8, geb);
  const slam = rp(f, geb, hit);
  const point = f >= aw && f < pec - 6;
  const bR: Vec3 = point ? lv([0.25, 0.8, 0.45], [0.3, 1.8, 0.25], rp(f, aw, aw + 6)) : f < hit + 10 ? lv(lv(REST_R, [0.3, 1.15, 0.35], raise), [0.25, 0.8, 0.45], slam) : f >= pec - 6 ? lv([0.25, 0.8, 0.45], [0.2, 1.15, 0.55], rp(f, pec - 6, pec)) : [0.25, 0.8, 0.45];
  const bL: Vec3 = f < hit + 10 ? lv(lv(REST_L, [-0.3, 1.15, 0.35], raise), [-0.25, 0.8, 0.45], slam) : [-0.25, 0.8, 0.45];
  const bP: Bean3Params = { ...BOS, expr: f >= geb ? "shout" : "angry", handR: bR, handL: bL, talk: Math.max(talkAt(f, LN("perintah", 0), 1), talkAt(f, LN("perintah", 1), 1)), lean: f >= hit && f < hit + 8 ? 0.15 : 0 };
  const back = rp(f, pec, pec + 10) * 0.35;
  const emp: [Bean3Params, Vec3, number][] = [
    [SINTA, [-1.0, 0, -0.45 + back], 0.75],
    [NAWAS, [1.0, 0, -0.4 + back], -0.75],
    [UDIN, [0.45, 0, 0.35 + back], -0.3],
  ];
  const shake = kick(f, [hit], 0.07);
  const jump = (i: number) => (f >= hit ? Math.max(0, Math.sin(((f - hit - i * 2) / 10) * Math.PI)) * 0.12 * (f < hit + 10 + i * 2 ? 1 : 0) : 0);
  const cam = shotCam(f, [{ to: D, p0: [0.1, 1.85, 4.9], l0: [0, 1.25, -0.9], p1: [0.05, 1.8, 4.3], l1: [0, 1.3, -0.9], fov: 44 }]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={shake} bg="#e8dcc8">
        <Day warm />
        <BossRoomSet />
        <Bean3 p={bP} position={bos} />
        {[0, 1, 2].map((i) => (
          <T key={i} g={G.box(0.21, 0.004, 0.28)} c="#f8f8f4" position={[-0.35 + i * 0.32, 0.83 + jump(i), -1.15]} rotation={[0, i * 0.3, jump(i) * 2]} o={2} />
        ))}
        {emp.map(([p, pos, yaw], i) => (
          <Bean3 key={i} p={{ ...p, expr: f >= pec ? "shock" : f >= geb ? "worried" : "neutral", lean: f >= aw && f < pec ? -0.1 : 0, bob: f >= hit && f < hit + 8 ? 0.05 : 0 }} position={pos} rotation={[0, yaw, 0]} />
        ))}
        <CloudTower position={[-0.2, 2.5, -1.4]} k={rp(f, aw - 2, aw + 10) * (1 - rp(f, pec - 2, pec + 6))} t={f / 30} />
      </Stage>
      <Vignette />
      <Chip at={geb + 6} to={aw} top={210} color="#ff6a4a">💼 Investor datang minggu depan</Chip>
      <Chip at={pec - 2} to={D} top={210} color="#ff4a4a">⏰ Deadline 7 hari · gagal = DIPECAT</Chip>
      <Sub scene="perintah" />
    </AbsoluteFill>
  );
};

/* ===================== 3. TARUHAN EMOSIONAL (layar terbelah) ===================== */
export const SceneAwSedih: React.FC = () => {
  const f = useCurrentFrame();
  const ud = EV("sedih.udin");
  const si = EV("sedih.sinta");
  const D = DUR_AW("sedih");
  // atas: Udin menatap foto bayi di HP, ibu jari mengusap layar
  const uP: Bean3Params = { ...UDIN, expr: f > ud ? "worried" : "neutral", handR: [0.1, 1.08, 0.42], handL: [-0.08, 1.02, 0.42], headTilt: 0, lean: 0.12 };
  const uPhone = bean3HandWorld(uP, "R", [0, 0, 0], 0);
  const swipe = Math.sin(f * 0.15) * 0.02;
  // bawah: Sinta melipat resep (si..si+20) lalu memasukkan ke saku (si+26..si+40)
  const fold = rp(f, si + 4, si + 22);
  const pocket = rp(f, si + 26, si + 40);
  const sHand: Vec3 = lv([0.12, 1.05, 0.42], [0.22, 0.72, 0.25], pocket);
  const sP: Bean3Params = { ...SINTA, expr: f > si ? "worried" : "neutral", handR: sHand, handL: lv([-0.1, 1.05, 0.42], REST_L, pocket), lean: 0.1 };
  const sPaper = bean3HandWorld(sP, "R", [0, 0, 0], 0);
  return (
    <AbsoluteFill style={{ background: "#101828" }}>
      <Panel w={1080} h={960}>
        <Stage cam={{ pos: [0.35, 1.45, 1.9 - f * 0.002], look: [0.02, 1.2, 0.2], fov: 38 }} h={960} bg="#e8eef2">
          <Day />
          <OpenOfficeSet />
          <Bean3 p={uP} />
          <ScreenPhone kind="baby" position={[uPhone[0] - 0.02, uPhone[1] + 0.05, uPhone[2] + 0.02]} rotation={[-0.5, 0.15, 0]} scale={1.3} />
          <T g={G.sph(0.03, 8, 6)} c="#e8d2bc" position={[uPhone[0] + swipe, uPhone[1] + 0.03, uPhone[2] + 0.05]} o={2} />
        </Stage>
        <Chip at={ud} to={D} top={60} color="#ff9ac0">👶 Udin · baru jadi ayah</Chip>
      </Panel>
      <Panel y={960} w={1080} h={960}>
        <Stage cam={{ pos: [-0.3, 1.45, 1.9 - f * 0.002], look: [0.02, 1.15, 0.2], fov: 38 }} h={960} bg="#e8eef2">
          <Day />
          <OpenOfficeSet />
          <Bean3 p={sP} />
          {pocket < 0.95 ? <Prescription position={[sPaper[0] - 0.04, sPaper[1] + 0.08, sPaper[2] + 0.02]} rotation={[-0.4, 0, 0]} fold={fold} scale={1.3 - pocket * 0.5} /> : null}
        </Stage>
        <Chip at={si} to={D} top={50} color="#7ae87a">💊 Sinta · obat jantung ibunya</Chip>
      </Panel>
      <SplitLine />
      <AbsoluteFill style={{ background: "rgba(20,30,60,0.12)", pointerEvents: "none" }} />
      <Sub scene="sedih" />
    </AbsoluteFill>
  );
};

/* ===================== 4. KANG NAWAS MENYANGGUPI ===================== */
export const SceneAwSanggup: React.FC = () => {
  const f = useCurrentFrame();
  const jari = EV("sanggup.jari");
  const atas = EV("sanggup.atas");
  const salam = EV("sanggup.salam");
  const D = DUR_AW("sanggup");
  const bos: Vec3 = [-0.62, 0, -0.3];
  const nIn = walkLerp(f, 0, jari - 12, [1.3, 0, 0.6], [0.62, 0, -0.2]);
  const nPos = nIn.pos;
  const nYaw = f < jari - 12 ? nIn.yaw : face(nPos, bos);
  const bYaw = face(bos, nPos);
  const M: Vec3 = [0, 0.98, -0.12];
  const shakeY = f >= salam + 6 && f < salam + 30 ? Math.sin((f - salam) * 0.8) * 0.05 : 0;
  const meet: Vec3 = [M[0], M[1] + shakeY, M[2]];
  const nR: Vec3 = f < salam - 4 ? (f >= jari && f < atas ? [0.25, 1.35, 0.38] : f >= atas ? [0.2, 1.75, 0.25] : REST_R) : lv([0.2, 1.75, 0.25], toLocal(meet, nPos, nYaw), rp(f, salam - 4, salam + 6));
  const bR: Vec3 = f < salam - 2 ? REST_R : lv(REST_R, toLocal(meet, bos, bYaw), rp(f, salam - 2, salam + 6));
  const nP: Bean3Params = { ...NAWAS, expr: f >= jari ? "smug" : "determined", handR: f > salam + 34 ? REST_R : nR, talk: talkAt(f, LN("sanggup", 0), 0.8), walk: nIn.walk, look: f >= atas && f < salam ? 0.2 : 0 };
  const bP: Bean3Params = { ...BOS, expr: f >= salam ? "laugh" : f >= atas ? "puzzled" : "proud", handR: f > salam + 34 ? REST_R : bR, talk: talkAt(f, LN("sanggup", 1), 1), handL: [-0.15, 0.8, 0.3] };
  const cam = shotCam(f, [{ to: D, p0: [0.2, 1.75, 5.6], l0: [0, 1.15, -0.2], p1: [0.1, 1.65, 4.6], l1: [0, 1.15, -0.2], fov: 42 }]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#e8dcc8">
        <Day warm />
        <BossRoomSet />
        <Bean3 p={nP} position={nPos} rotation={[0, nYaw, 0]} />
        <Bean3 p={bP} position={bos} rotation={[0, bYaw, 0]} />
      </Stage>
      <Vignette />
      <Chip at={jari} to={salam} top={210} color="#7fe8ff">☝️ Syarat: Bos yang kirim bahan ke atas</Chip>
      <Chip at={salam + 6} to={D} top={210} color="#7ae87a">🤝 Deal!</Chip>
      <Sub scene="sanggup" />
    </AbsoluteFill>
  );
};

/* ===================== 5. PERSIAPAN KOCAK: layang-layang & drone ===================== */
export const SceneAwSiap: React.FC = () => {
  const f = useCurrentFrame();
  const kite = EV("siap.kite");
  const drone = EV("siap.drone");
  const D = DUR_AW("siap");
  const nPos: Vec3 = [-0.3, 0, 0.6];
  const pull = Math.sin(f * 0.25);
  const nP: Bean3Params = { ...NAWAS_H, expr: "happy", handR: [0.15, 1.25 + pull * 0.08, 0.35], handL: [-0.1, 1.05 - pull * 0.08, 0.38], lean: -0.1, bob: Math.abs(Math.sin(f * 0.25)) * 0.02 };
  const hR = bean3HandWorld(nP, "R", nPos, 0.2);
  const kitePos: Vec3 = [-1.4 + Math.sin(f * 0.04) * 0.4, 4.2 + Math.sin(f * 0.07) * 0.25, -3];
  const dk = rp(f, drone, drone + 45);
  const dronePos: Vec3 = [0.8 + Math.sin(f * 0.1) * 0.08, lerp(0.15, 3.4, dk) + Math.sin(f * 0.3) * 0.04, -0.6];
  const uP: Bean3Params = { ...UDIN_H, expr: "laugh", handR: [0.1, 1.0, 0.4], handL: [-0.1, 1.0, 0.4], lean: -0.08 };
  const uPos: Vec3 = [0.95, 0, 0.55];
  const uH = bean3HandWorld(uP, "R", uPos, -0.4);
  const holo = rp(f, drone + 40, drone + 52);
  const cam = shotCam(f, [{ to: D, p0: [0.6, 1.3, 5.4], l0: [-0.2, 2.0, -0.8], p1: [0.4, 1.4, 4.8], l1: [0, 2.2, -0.8], fov: 50 }]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#8ac8ff">
        <Sky />
        <RoofLight />
        <RooftopSet car={false} office={<CardboardOffice position={OFFICE_POS} tarp={0} />} />
        <Bean3 p={nP} position={nPos} rotation={[0, 0.2, 0]} />
        {f >= kite - 10 ? (
          <>
            <Kite position={kitePos} rotation={[0.2, 0.3, 0]} sway={f * 0.1} scale={1.2} />
            <Limb a={hR} b={[kitePos[0], kitePos[1] - 0.4, kitePos[2]]} r={0.004} c="#f4f4f4" o={false} />
          </>
        ) : null}
        <Bean3 p={uP} position={uPos} rotation={[0, -0.4, 0]} />
        <T g={G.rbox(0.14, 0.08, 0.03, 0.4)} c="#3a3c44" position={[uH[0] - 0.08, uH[1] + 0.04, uH[2] + 0.02]} o={2} />
        {f >= drone - 6 ? <ToyDrone position={dronePos} spin={f * 1.3} scale={1.4} /> : null}
        {holo > 0 ? (
          <group position={[dronePos[0], 3.15, dronePos[2]]} scale={holo}>
            {[
              [-0.35, 0, 0, 0.3],
              [0.1, -0.05, 0.1, 0.36],
              [0.45, 0, -0.05, 0.28],
            ].map(([x, y, z, r], i) => (
              <XR key={i} g={G.sph(r, 16, 12)} position={[x, y, z]} scale={[1, 0.5, 1]} color="#bfefff" edges={false} />
            ))}
          </group>
        ) : null}
      </Stage>
      <Vignette />
      <Chip at={kite} to={drone + 36} top={210} color="#ffd23f">📅 Hari 1–6: main layang-layang</Chip>
      <Chip at={drone + 40} to={D} top={210} color="#7fe8ff">🏗️ Progres fondasi: 1 bata</Chip>
      <Sub scene="siap" />
    </AbsoluteFill>
  );
};

/* ===================== 6. HARI H: "MANA BATANYA?" ===================== */
const CREW = (f: number, up: boolean): [Bean3Params, Vec3, number][] => [
  [{ ...SINTA_H, expr: up ? "shout" : "neutral", lean: up ? -0.15 : 0, handR: up ? [0.25, 1.6, 0.2] : [0.3, 0.7, 0.2] }, [-0.75, 0, -0.1], 0.25],
  [{ ...NAWAS_H, expr: up ? "laugh" : "smug", lean: up ? -0.15 : 0, handR: up ? [0.25, 1.75 + Math.sin(f * 0.6) * 0.1, 0.15] : REST_R, handL: up ? [-0.25, 1.75 - Math.sin(f * 0.6) * 0.1, 0.15] : REST_L }, [0.1, 0, 0.45], 0],
  [{ ...UDIN_H, expr: up ? "shout" : "neutral", lean: up ? -0.15 : 0, handL: up ? [-0.25, 1.6, 0.2] : REST_L, handR: [0.3, 0.85, 0.2] }, [0.9, 0, -0.05], -0.25],
];
export const SceneAwHariH: React.FC = () => {
  const f = useCurrentFrame();
  const tiba = EV("harih.tiba");
  const ter = EV("harih.teriak");
  const D = DUR_AW("harih");
  const up = f >= ter;
  const bWalk = walkLerp(f, tiba, ter - 6, [-2.5, 0, 1.4], [-1.45, 0, 1.0]);
  const bYaw = f < ter - 6 ? bWalk.yaw : 0.5;
  const crew = CREW(f, up);
  const cam = shotCam(f, [{ to: D, p0: [0.0, 2.0, 6.6], l0: [-0.3, 1.25, -0.3], p1: [-0.1, 1.85, 5.6], l1: [-0.3, 1.35, -0.3], fov: 46 }]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#8ac8ff">
        <Sky />
        <RoofLight />
        <RooftopSet carPos={CAR_POS} carRot={CAR_ROT} chair={false} office={<CardboardOffice position={OFFICE_POS} tarp={0} />} />
        <BrickPile />
        <Bucket position={[PIGGY[0], 0, PIGGY[2]]} />
        <Piggy position={PIGGY} rotation={[0, -0.6, 0]} />
        {crew.map(([p, pos, yaw], i) => (
          <group key={i}>
            <Bean3 p={p} position={pos} rotation={[0, yaw, 0]} />
            {i === 0 ? <Bucket position={bean3HandWorld(p, "R", pos, yaw).map((v, j) => (j === 1 ? v - 0.22 : v)) as Vec3} scale={0.8} /> : null}
            {i === 2 ? <Shovel position={bean3HandWorld(p, "R", pos, yaw).map((v, j) => (j === 1 ? v - 0.55 : v)) as Vec3} rotation={[0, 0, -0.1]} /> : null}
          </group>
        ))}
        {f >= tiba ? <Bean3 p={{ ...BOS, expr: up ? "puzzled" : "proud", walk: bWalk.walk }} position={bWalk.pos} rotation={[0, bYaw, 0]} /> : null}
      </Stage>
      <Vignette />
      <Chip at={4} to={ter} top={210}>📅 Hari ke-7 · rooftop</Chip>
      <Chip at={ter + 4} to={D} top={210} color="#ffd23f">🦺 Tukang siap · bahan: belum ada</Chip>
      <Sub scene="harih" />
    </AbsoluteFill>
  );
};

/* ===================== 7. BOS MELEMPAR BATA ===================== */
export const SceneAwLempar: React.FC = () => {
  const f = useCurrentFrame();
  const ambil = EV("lempar.ambil");
  const lem = EV("lempar.lempar");
  const krek = EV("lempar.krek");
  const cel = EV("lempar.celeng");
  const D = DUR_AW("lempar");
  const bPos: Vec3 = [-0.55, 0, 0.9];
  const bYaw = 0.35;
  const land1 = krek + 3;
  const rel1 = lem + 4;
  const rel2 = Math.max(land1 + 14, cel - 22);
  const land2 = cel + 3;
  // pose lempar: membungkuk ambil bata -> tarik ke belakang -> ayun ke atas
  const throwPose = (rel: number): Vec3 => {
    if (f < rel - 14) return [0.25, 0.9, 0.35];
    if (f < rel - 2) return lv([0.25, 0.9, 0.35], [0.35, 1.25, -0.35], rp(f, rel - 14, rel - 4));
    return lv([0.35, 1.25, -0.35], [0.2, 1.85, 0.35], rp(f, rel - 2, rel + 4));
  };
  const bend = rp(f, ambil, ambil + 8) * (1 - rp(f, ambil + 14, ambil + 22));
  const pickTo = toLocal([PILE[0], 0.15, PILE[2]], bPos, bYaw);
  let bR: Vec3 = REST_R;
  if (f >= ambil && f < ambil + 22) bR = lv(REST_R, pickTo, bend);
  else if (f >= ambil + 22 && f < land1 + 6) bR = throwPose(rel1);
  else if (f >= land1 + 6 && f < rel2 - 20) bR = lv([0.2, 1.85, 0.35], REST_R, rp(f, land1 + 6, land1 + 16));
  else if (f >= rel2 - 20 && f < land2 + 6) bR = f < rel2 - 14 ? lv(REST_R, [0.25, 0.9, 0.35], rp(f, rel2 - 20, rel2 - 14)) : throwPose(rel2);
  const bP: Bean3Params = { ...BOS, expr: f >= land2 ? "shock" : f >= land1 ? "shock" : f >= lem ? "determined" : "proud", handR: bR, lean: bend * 0.55 + (f >= rel1 - 2 && f < rel1 + 10 ? -0.12 : 0), handL: f >= land1 && f < land1 + 30 ? [-0.2, 1.3, 0.4] : REST_L };
  const hW = bean3HandWorld(bP, "R", bPos, bYaw);
  const flight = (rel: number, land: number, to: Vec3, peak = 5.2): Vec3 | null => {
    if (f < rel || f > land) return null;
    const k = (f - rel) / Math.max(1, land - rel);
    const from: Vec3 = [bPos[0] + 0.2, 1.95, bPos[2] + 0.1];
    return [lerp(from[0], to[0], k), lerp(from[1], to[1], k) + 4 * peak * k * (1 - k), lerp(from[2], to[2], k)];
  };
  const b1 = flight(rel1, land1, [HOOD[0], HOOD[1] + 0.04, HOOD[2]]);
  const b2 = flight(rel2, land2, [PIGGY[0], PIGGY[1] + 0.12, PIGGY[2]], 4.0);
  const holding1 = f >= ambil + 12 && f < rel1;
  const holding2 = f >= rel2 - 14 && f < rel2;
  const dent = rp(f, land1, land1 + 3);
  const broken = rp(f, land2, land2 + 24);
  const flyY = b1 ? b1[1] : b2 ? b2[1] : 1.3;
  const shake = kick(f, [land1, land2], 0.06);
  const crew = CREW(f, false).map(([p, pos, yaw]) => [{ ...p, expr: f >= land1 ? "laugh" : "puzzled", lean: (b1 || b2) ? -0.15 : 0, handR: REST_R, handL: REST_L } as Bean3Params, [pos[0] + 0.1, 0, pos[2] - 0.75] as Vec3, yaw] as [Bean3Params, Vec3, number]);
  const base: Cam = { pos: [0.85, 1.9, 6.4], look: [0.75, 1.15, -0.1], fov: 46 };
  const cam: Cam = { ...base, look: [base.look[0], lerp(base.look[1], Math.min(4.2, flyY), b1 || b2 ? 0.55 : 0), base.look[2]] };
  return (
    <AbsoluteFill>
      <Stage cam={cam} shake={shake} bg="#8ac8ff">
        <Sky />
        <RoofLight />
        <RooftopSet carPos={CAR_POS} carRot={CAR_ROT} dent={dent} chair={false} office={<CardboardOffice position={OFFICE_POS} tarp={0} />} />
        <BrickPile n={f >= ambil + 12 ? 4 : 5} />
        <Bucket position={[PIGGY[0], 0, PIGGY[2]]} />
        <Piggy position={PIGGY} rotation={[0, -0.6, 0]} broken={broken} />
        {crew.map(([p, pos, yaw], i) => (
          <Bean3 key={i} p={p} position={pos} rotation={[0, yaw, 0]} />
        ))}
        <Bean3 p={bP} position={bPos} rotation={[0, bYaw, 0]} />
        {holding1 || holding2 ? <Brick position={[hW[0], hW[1] + 0.05, hW[2]]} rotation={[0, bYaw, 0.3]} /> : null}
        {b1 ? <Brick position={b1} rotation={[f * 0.4, f * 0.3, 0]} /> : null}
        {b2 ? <Brick position={b2} rotation={[f * 0.4, f * 0.3, 0]} /> : null}
        {f > land1 ? <Brick position={[HOOD[0], HOOD[1] + 0.03, HOOD[2]]} rotation={[0.2, 0.7, 0.15]} /> : null}
        {f > land2 ? <Brick position={[PIGGY[0] + 0.05, 0.25, PIGGY[2]]} rotation={[0.1, 0.3, 0.2]} /> : null}
      </Stage>
      <Vignette />
      {f >= land1 && f < land1 + 26 ? <div style={{ position: "absolute", top: 520, left: 560, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 130, color: "#ffd23f", WebkitTextStroke: "8px #0c0c10", transform: `rotate(-10deg) scale(${1 + 0.3 * Math.max(0, 1 - (f - land1) / 6)})` }}>KREK!</div> : null}
      {f >= land2 && f < land2 + 26 ? <div style={{ position: "absolute", top: 760, left: 460, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 110, color: "#ff9ac0", WebkitTextStroke: "8px #0c0c10", transform: `rotate(8deg) scale(${1 + 0.3 * Math.max(0, 1 - (f - land2) / 6)})` }}>PRANG!</div> : null}
      <Chip at={land1 + 8} to={rel2 - 10} top={210} color="#ff6a4a">🚗 Mobil Pak Bos: penyok</Chip>
      <Chip at={land2 + 8} to={D} top={210} color="#ff9ac0">🐷 Celengan Pak Bos: pecah</Chip>
      <Sub scene="lempar" />
    </AbsoluteFill>
  );
};

/* ===================== 8. BOS RUNTUH: foto lama ===================== */
export const SceneAwRuntuh: React.FC = () => {
  const f = useCurrentFrame();
  const foto = EV("runtuh.foto");
  const hil = EV("runtuh.hilang");
  const D = DUR_AW("runtuh");
  const dusk = 0.35 + 0.55 * (f / D);
  const bPos: Vec3 = [-0.15, 0, 0.2];
  const inA = foto + 14;
  const inB = foto + 64;
  const pull = rp(f, foto, foto + 10);
  const show = rp(f, foto + 10, foto + 18);
  const bR: Vec3 = f < foto + 10 ? lv(REST_R, [0.12, 0.92, 0.28], pull) : lv([0.12, 0.92, 0.28], [0.06, 0.95, 0.45], show);
  const bP: Bean3Params = { ...BOS, seated: true, expr: "worried", headTilt: -0.12, lean: 0.12, handR: bR, handL: [-0.06, 0.92, 0.45], talk: talkAt(f, LN("runtuh", 0), 0.5) };
  const hW = bean3HandWorld(bP, "R", bPos, 0);
  const head: Vec3 = [bPos[0], 1.22, bPos[2]];
  const nP: Bean3Params = { ...NAWAS_H, expr: "worried", handR: CHEST_R };
  const cam = shotCam(f, [{ to: D, p0: [0.6, 1.4, 3.6], l0: [0, 0.95, 0], p1: [0.4, 1.35, 3.0], l1: [0, 0.98, 0], fov: 42 }]);
  if (f >= inA && f < inB) {
    const at: Vec3 = [0, 1.1, 1.8];
    const drop = ((f - inA) % 24) / 24;
    return (
      <AbsoluteFill>
        <Insert set={<RooftopSet dusk={dusk} car={false} chair={false} />} at={at} dist={0.62} f={f} from={inA} bg="#ff9a5a" warm>
          <Sky dusk={dusk} />
          <OldPhoto position={at} rotation={[0, 0, 0.04]} scale={2.0} />
          <Hand at={[at[0] + 0.16, at[1] - 0.09, at[2] - 0.01]} sleeve={BOS.sleeve!} glove={BOS.glove} dir={[0.4, -0.5, 0.4]} r={0.04} />
          <Hand at={[at[0] - 0.16, at[1] - 0.09, at[2] - 0.01]} sleeve={BOS.sleeve!} glove={BOS.glove} dir={[-0.4, -0.5, 0.4]} r={0.04} />
          <T g={G.sph(0.012, 8, 6)} c="#8ad8ff" emissive="#4ab8ff" ei={0.6} position={[at[0] + 0.03, at[1] + 0.25 - drop * 0.28, at[2] + 0.02]} scale={[0.8, 1.3, 0.8]} o={false} />
        </Insert>
        <Chip at={inA + 4} to={inB} top={210} color="#f4ead0">📷 Kantor pertama · Bos muda & ayahnya</Chip>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(40,20,10,0.45) 100%)" }} />
        <Sub scene="runtuh" />
      </AbsoluteFill>
    );
  }
  const camF = pullBack(f, inB, inB + 20, { pos: [hW[0] + 0.1, hW[1] + 0.15, hW[2] + 1.0], look: hW, fov: 38 }, cam);
  return (
    <AbsoluteFill>
      <Stage cam={camF} bg="#ff9a5a">
        <Sky dusk={dusk} />
        <RoofLight dusk={dusk} />
        <RooftopSet dusk={dusk} carPos={CAR_POS} carRot={CAR_ROT} dent={1} chair={false} office={<CardboardOffice position={OFFICE_POS} tarp={0} />} />
        <PlasticChair position={[bPos[0], 0, bPos[2] - 0.12]} />
        <Bean3 p={bP} position={bPos} />
        {f >= foto + 4 ? <OldPhoto position={[hW[0] - 0.06, hW[1] + 0.06, hW[2] + 0.02]} rotation={[-0.3, 0, 0]} scale={1.4} /> : null}
        {f >= foto + 20 ? <Tears head={head} f={f} /> : null}
        <Bean3 p={nP} position={[0.85, 0, 0.75]} rotation={[0, -0.7, 0]} />
        <Bean3 p={{ ...SINTA_H, expr: "worried", handR: CHEST_R }} position={[-1.05, 0, -0.55]} rotation={[0, 0.5, 0]} />
        <Bean3 p={{ ...UDIN_H, expr: "worried" }} position={[0.55, 0, -0.7]} rotation={[0, -0.3, 0]} />
      </Stage>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(40,20,10,0.4) 100%)" }} />
      <Chip at={hil + 6} to={D} top={210} color="#f4ead0">🏚️ Perusahaan peninggalan ayahnya</Chip>
      <Sub scene="runtuh" />
    </AbsoluteFill>
  );
};

/* ===================== 9. KEJUTAN: kantor kardus di atas awan ===================== */
export const SceneAwKejutan: React.FC = () => {
  const f = useCurrentFrame();
  const st = EV("kejut.start");
  const tarik = EV("kejut.tarik");
  const peluk = EV("kejut.peluk");
  const D = DUR_AW("kejutan");
  const off = OFFICE_POS;
  const tarpEdge: Vec3 = [off[0] + 1.0, 1.4, off[2] + 0.9];
  const nWalk = walkLerp(f, st, tarik - 8, [0.6, 0, 0.6], [off[0] + 1.35, 0, off[2] + 1.05]);
  const nPos = nWalk.pos;
  const nYaw = f < tarik - 8 ? nWalk.yaw : -1.2;
  const grab = rp(f, tarik - 8, tarik);
  const yank = rp(f, tarik, tarik + 10);
  const nR: Vec3 = f < tarik - 8 ? REST_R : f < tarik ? lv(REST_R, toLocal(tarpEdge, nPos, nYaw), grab) : lv(toLocal(tarpEdge, nPos, nYaw), [0.35, 0.7, 0.1], yank);
  const tarp = rp(f, tarik + 2, tarik + 14);
  const lights = f >= tarik + 18;
  const hug = rp(f, peluk, peluk + 20);
  const bStand = rp(f, tarik + 20, tarik + 30);
  const bWalk = walkLerp(f, tarik + 34, peluk, [-0.15, 0, 0.2], [-0.75, 0, 0.0]);
  const bPos = f < tarik + 34 ? ([-0.15, 0, 0.2] as Vec3) : bWalk.pos;
  const bP: Bean3Params = { ...BOS, seated: bStand < 0.5, expr: f >= tarik + 14 ? (f >= peluk ? "laugh" : "shock") : "worried", walk: bWalk.walk, handL: hug > 0 ? [-0.4, 1.0, 0.35] : REST_L, handR: hug > 0 ? [0.4, 1.0, 0.35] : REST_R };
  const head: Vec3 = [bPos[0], bStand < 0.5 ? 1.22 : 1.42, bPos[2]];
  const center: Vec3 = [-0.75, 0, 0.0];
  const hugPos = (p0: Vec3, ang: number): Vec3 => lv(p0, [center[0] + Math.sin(ang) * 0.62, 0, center[2] + Math.cos(ang) * 0.62], hug);
  const crew: [Bean3Params, Vec3, number][] = [
    [{ ...SINTA_H, expr: f >= peluk ? "laugh" : "happy", handR: hug > 0 ? [0.35, 1.0, 0.35] : CHEST_R, handL: hug > 0 ? [-0.35, 1.0, 0.35] : REST_L }, hugPos([-1.2, 0, 0.75], -0.9), 0.4 + hug * 0.6],
    [{ ...UDIN_H, expr: f >= peluk ? "laugh" : "happy", handR: hug > 0 ? [0.35, 1.0, 0.35] : REST_R, handL: hug > 0 ? [-0.35, 1.0, 0.35] : REST_L }, hugPos([0.55, 0, -0.5], 1.1), -0.4 - hug * 0.9],
  ];
  const nHug = hugPos(nPos, 0.25);
  const cam = shotCam(f, [
    { to: tarik + 30, p0: [0.4, 1.8, 5.2], l0: [-0.7, 1.15, -0.8], p1: [0.2, 1.75, 4.7], l1: [-0.8, 1.15, -0.9], fov: 46 },
    { to: D, p0: [0.2, 1.75, 4.7], l0: [-0.8, 1.15, -0.9], p1: [-0.4, 1.55, 3.6], l1: [-0.8, 1.15, -0.5], fov: 44 },
  ]);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#ff9a5a">
        <Sky dusk={1} />
        <RoofLight dusk={1} />
        <RooftopSet dusk={1} carPos={CAR_POS} carRot={CAR_ROT} dent={1} chair={false} office={<CardboardOffice position={off} tarp={tarp} />} />
        {lights ? <pointLight position={[off[0], 1.4, off[2] + 0.2]} intensity={1.6} distance={4} color="#ffd890" /> : null}
        {bStand < 0.5 ? <PlasticChair position={[-0.15, 0, 0.08]} /> : <PlasticChair position={[-0.15, 0, 0.08]} rotation={[0, 0.2, 0]} />}
        <Bean3 p={bP} position={bPos} rotation={[0, f < tarik + 14 ? 0 : f < peluk ? -0.6 : 0.3, 0]} />
        {f >= tarik + 14 && f < peluk + 40 ? <Tears head={head} f={f} yaw={f < peluk ? -0.6 : 0.3} /> : null}
        <Bean3 p={{ ...NAWAS_H, expr: f >= peluk ? "laugh" : f >= tarik ? "happy" : "smug", handR: hug > 0 ? [0.35, 1.0, 0.35] : nR, talk: talkAt(f, LN("kejutan", 0), 0.7), walk: nWalk.walk }} position={hug > 0 ? nHug : nPos} rotation={[0, hug > 0 ? lerp(nYaw, Math.PI + 0.25, hug) : nYaw, 0]} />
        {crew.map(([p, pos, yaw], i) => (
          <Bean3 key={i} p={p} position={pos} rotation={[0, yaw, 0]} />
        ))}
      </Stage>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(60,20,10,0.35) 100%)" }} />
      <Chip at={tarik + 16} to={peluk} top={210} color="#ffd23f">☁️ Dibangun diam-diam oleh semua karyawan</Chip>
      <Chip at={peluk + 4} to={D} top={210} color="#ff9ac0">🤗 Kantor Pertama Kita · Jilid 2</Chip>
      <Sub scene="kejutan" />
    </AbsoluteFill>
  );
};

/* ===================== 10. INVESTOR SETUJU + KANTOR DI BULAN ===================== */
export const SceneAwBulan: React.FC = () => {
  const f = useCurrentFrame();
  const call = EV("bulan.call");
  const set = EV("bulan.setuju");
  const bln = EV("bulan.bulan");
  const pin = EV("bulan.pingsan");
  const end = EV("bulan.end");
  const D = DUR_AW("bulan");
  const bPos: Vec3 = [-0.45, 0, 0.3];
  const nPos: Vec3 = [0.6, 0, 0.35];
  const bYaw = f < bln ? face(bPos, nPos) : -0.35;
  const phoneUp = f >= call && f < bln - 4;
  const bR: Vec3 = phoneUp ? [0.12, 1.15, 0.4] : f >= bln - 4 ? lv([0.12, 1.15, 0.4], [-0.25, 1.85, 0.3], rp(f, bln - 4, bln + 4)) : REST_R;
  const bP: Bean3Params = { ...BOS, expr: f >= bln - 4 ? "shout" : f >= set ? "laugh" : "happy", handR: bR, talk: talkAt(f, LN("bulan", 1), 1), lean: f >= bln ? -0.1 : 0 };
  const ph = bean3HandWorld(bP, "R", bPos, bYaw);
  const fall = rp(f, pin, pin + 12);
  const catchK = rp(f, pin + 4, pin + 12);
  const moon = rp(f, bln - 2, bln + 14);
  const inA = call + 4;
  const inB = set + 16;
  const cam = shotCam(f, [{ to: D, p0: [0.2, 1.75, 5.6], l0: [0, 1.4, -0.3], p1: [0.1, 1.85, 5.0], l1: [-0.2, 1.7, -0.6], fov: 46 }]);
  if (f >= inA && f < inB) {
    const at: Vec3 = [0, 1.15, 1.8];
    return (
      <AbsoluteFill>
        <Insert set={<RooftopSet dusk={1} car={false} chair={false} />} at={at} f={f} from={inA} bg="#ff9a5a" warm>
          <Sky dusk={1} />
          <ScreenPhone kind="call" position={at} rotation={[0, 0.1, 0]} scale={1.3} t={f / 30} />
          <Hand at={[at[0] + 0.02, at[1] - 0.13, at[2] + 0.01]} sleeve={BOS.sleeve!} glove={BOS.glove} dir={[0.4, -0.5, 0.5]} r={0.04} />
        </Insert>
        <Chip at={inA + 2} to={inB} top={210} color="#7ae87a">📞 Video call · Investor</Chip>
        <Sub scene="bulan" />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Stage cam={pullBack(f, inB, inB + 18, { pos: [ph[0] + 0.15, ph[1] + 0.1, ph[2] + 1.2], look: ph, fov: 38 }, cam)} bg="#3a2a6a">
        <Sky dusk={1} />
        <RoofLight dusk={1} />
        <RooftopSet dusk={1} carPos={CAR_POS} carRot={CAR_ROT} dent={1} chair={false} office={<CardboardOffice position={OFFICE_POS} tarp={1} />} />
        <pointLight position={[OFFICE_POS[0], 1.4, OFFICE_POS[2] + 0.2]} intensity={1.6} distance={4} color="#ffd890" />
        {moon > 0 ? <Moon position={[-7, 10, -40]} k={moon} /> : null}
        <Bean3 p={bP} position={bPos} rotation={[0, bYaw, 0]} />
        {phoneUp ? <ScreenPhone kind="call" position={[ph[0], ph[1] + 0.08, ph[2]]} rotation={[0, bYaw, 0]} t={f / 30} /> : null}
        <Fall pos={nPos} yaw={face(nPos, bPos)} k={fall}>
          <Bean3 p={{ ...NAWAS_H, expr: f >= pin ? "shock" : f >= bln ? "worried" : "happy", handL: f >= pin ? [-0.4, 1.3, 0.1] : REST_L, handR: f >= pin ? [0.4, 1.3, 0.1] : REST_R }} />
        </Fall>
        <Bean3 p={{ ...SINTA_H, expr: f >= pin ? "laugh" : "happy", handR: lv(REST_R, [0.35, 0.85, 0.45], catchK) }} position={lv([1.15, 0, -0.35], [0.95, 0, -0.25], catchK)} rotation={[0, -0.6, 0]} />
        <Bean3 p={{ ...UDIN_H, expr: f >= pin ? "laugh" : "happy", handL: lv(REST_L, [-0.35, 0.85, 0.45], catchK) }} position={lv([0.0, 0, -0.55], [0.25, 0, -0.35], catchK)} rotation={[0, 0.5, 0]} />
      </Stage>
      <Vignette />
      <Chip at={set + 18} to={bln - 4} top={210} color="#7ae87a">✅ Investasi disetujui!</Chip>
      <Chip at={bln + 4} to={end} top={210} color="#ffd23f">🌕 Target berikutnya: kantor di BULAN</Chip>
      <BigTitle at={end} to={D + 10} top={170} size={64} line1="FOLLOW" line2="untuk kisah Kang Nawas berikutnya!" />
      <Sub scene="bulan" />
    </AbsoluteFill>
  );
};

/** Uji aksi (still-check filmstrip, bukan video): ambil laci, turun tangga got, merangkak di terowongan. */
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Vec3 } from "./three/objects";
import { BeanCard, BeanParams, beanHandWorld, poseClimb, poseCrawl, poseCrouch } from "./three/objectsBean";
import { CineGrade, CineStage, LIGHT_PRESETS, cineCard, Cam, cl, smoother } from "./cinemaKit";
import { InHand, Lantern, MoneyBundle, OpenDrawer } from "./three/objectsTerowongan";
import { FOTOGRAFER_GALI, MIMI_GOT } from "./SheetTerowongan";
import { Watermark } from "./Watermark";

export const TOTAL_FRAMES_UJI_AKSI = 180;
const bl = (x: number, y: number, z: number, ox = 0): Vec3 => [ox + x, z, -y];
const ease = (f: number, a: number, b: number) => smoother(cl((f - a) / (b - a)));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const LM = (L: string, i = 1.8) => [{ prefix: { L3: "L3_Got", L4: "L4_Penampang", L5: "L5_Brankas" }[L]!, url: `models/terowongan_lm_${L}.png`, intensity: i }];
const DALAM = { exposure: 1.0, env: 0.65, ao: 3.2, aoRadius: 0.9, bloom: 0.55 };

/* 1 · Dodi meraih laci -> menarik laci keluar -> mengambil bundel uang (0-60f) */
const AmbilLaci: React.FC = () => {
  const f = useCurrentFrame();
  const ox = 1600;
  const cam: Cam = { pos: bl(-3.15, -2.3, 1.35, ox), look: bl(-4.45, -0.05, 0.95, ox), fov: 44, roll: 3 };
  const pos = bl(-3.95, 0.25, 0, ox);
  const reach = ease(f, 0, 18); // tangan menjulur ke gagang
  const lift = ease(f, 42, 56); // tangan mengangkat bundel
  const p: BeanParams = { ...FOTOGRAFER_GALI, ...poseCrouch(true), pitch: lerp(26, 12, reach), expr: f < 40 ? "think" : "smug", armL: [40, -30], armR: [lerp(40, 98, reach) + lift * 25, lerp(-30, -6, reach) - lift * 40] };
  const full: BeanParams = { ...p, pitch: 12, armR: [98, -6] };
  const hFull = beanHandWorld(full, "R", pos, 1.9, cam.pos, true);
  const wallX = ox - 4.77;
  const h = beanHandWorld(p, "R", pos, 1.9, cam.pos, true);
  const pullK = ease(f, 20, 40); // laci ikut tangan saat ditarik (tangan mundur 0,42 m)
  const out = 0.02 + 0.4 * pullK;
  const drawerPos: Vec3 = [wallX, hFull[1] - 0.05, hFull[2]];
  const pHand: BeanParams = f >= 20 && f < 42 ? { ...p, armR: [98 - 30 * pullK, -6 - 20 * pullK] } : p;
  const card = cineCard(cam, LIGHT_PRESETS.tegang);
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/terowongan.glb" visible={(n) => n.startsWith("L5_Brankas")} focus={bl(-4, 0, 0, ox)} preset="tegang" interior pts={[{ p: bl(-3.6, -0.8, 1.9, ox), i: 8 }, { p: bl(-2.5, 0.5, 3.2, ox), i: 10 }]} look={DALAM} lightmaps={LM("L5")} hemiScale={0.55}>
        <BeanCard position={pos} height={1.9} params={pHand} flip {...card} />
        <group position={drawerPos} rotation={[0, Math.PI / 2, 0]}>
          <OpenDrawer out={out} bundles={f >= 46 ? 5 : 6} />
        </group>
        {f >= 46 && (
          <InHand p={pHand} position={pos} height={1.9} cam={cam.pos} flip hand="R" rot={[0.2, 0.5, 0]}>
            <MoneyBundle />
          </InHand>
        )}
        {void h}
      </CineStage>
      <CineGrade preset="tegang" />
      <Label t={`AMBIL LACI · f${f} · ${f < 20 ? "meraih gagang" : f < 42 ? "menarik laci" : "mengambil bundel"}`} />
    </AbsoluteFill>
  );
};

/* 2 · Ara turun tangga besi dari lubang jalan ke got (60f): tampak belakang, tangan-kaki bergantian */
const TurunTangga: React.FC = () => {
  const f = useCurrentFrame();
  const ox = 800;
  const cam: Cam = { pos: bl(-0.75, -0.75, 1.6, ox), look: bl(1.25, 0, 1.35, ox), fov: 54, roll: -2 };
  const z = lerp(2.6, 0.0, ease(f, 0, 58));
  const pos = bl(1.1, 0, z, ox);
  const p: BeanParams = { ...MIMI_GOT, ...poseClimb(f), hair: "#4a2a1a", ...(f >= 56 ? { ground: true } : {}) };
  const card = cineCard(cam, LIGHT_PRESETS.malam);
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/terowongan.glb" visible={(n) => n.startsWith("L3_Got")} focus={bl(0.9, 0, 0, ox)} preset="malam" interior pts={[{ p: bl(0.9, 0, 4.5, ox), i: 14 }, { p: bl(-1.4, 2, 2.4, ox), i: 6 }]} look={{ exposure: 0.75, env: 0, ao: 2.5, aoRadius: 0.9, bloom: 1.0 }} lightmaps={LM("L3", 1.4)} hemiScale={0.55}>
        <BeanCard position={pos} height={1.9} params={p} {...card} />
        <InHand p={p} position={pos} height={1.9} cam={cam.pos} hand="L"><Lantern s={0.9} /></InHand>
      </CineStage>
      <CineGrade preset="malam" />
      <Label t={`TURUN TANGGA · f${f} · tangan & kaki bergantian`} />
    </AbsoluteFill>
  );
};

/* 3 · Dodi merangkak maju di terowongan (penampang), benar-benar berpindah tempat */
const Merangkak: React.FC = () => {
  const f = useCurrentFrame();
  const ox = 1200;
  const x = lerp(-5.6, -2.2, f / 60);
  const cam: Cam = { pos: bl(x + 0.4, -8.5, -4.55, ox), look: bl(x + 0.3, 0, -4.95, ox), fov: 34, roll: 0 };
  const pos = bl(x, -1.88, -5.42, ox);
  const p: BeanParams = { ...FOTOGRAFER_GALI, ...poseCrawl(f, 1.4), expr: "think", sweat: true };
  const card = cineCard(cam, LIGHT_PRESETS.siang);
  return (
    <AbsoluteFill>
      <CineStage cam={cam} glb="models/terowongan.glb" visible={(n) => n.startsWith("L4_Penampang")} focus={bl(x, -1.5, -5.4, ox)} preset="siang" pts={[{ p: bl(x + 0.6, -1.3, -4.5, ox), i: 6 }]} look={{ exposure: 1.1, env: 0.6, ao: 2.5, aoRadius: 1.2, bloom: 0.45 }} lightmaps={LM("L4", 1.6)} hemiScale={0.55}>
        <BeanCard position={pos} height={1.9} params={p} {...card} />
      </CineStage>
      <CineGrade preset="siang" />
      <Label t={`MERANGKAK · f${f} · maju ${(x + 5.6).toFixed(1)} m`} />
    </AbsoluteFill>
  );
};

const Label: React.FC<{ t: string }> = ({ t }) => (
  <div style={{ position: "absolute", top: 40, left: 40, right: 40, fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 40, color: "#fff", textShadow: "0 3px 8px #000" }}>{t}</div>
);

export const UjiAksiTerowongan: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <Sequence from={0} durationInFrames={60}><AmbilLaci /></Sequence>
    <Sequence from={60} durationInFrames={60}><TurunTangga /></Sequence>
    <Sequence from={120} durationInFrames={60}><Merangkak /></Sequence>
    <Watermark />
  </AbsoluteFill>
);

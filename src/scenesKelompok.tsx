// Adegan "Kerja Kelompok" — gaya 3D explainer (toon + garis tepi, hologram grup, layar terbelah, X-ray energi).
// Semua waktu aksi dari src/kelompok_timing.json (scripts/build_audio_kelompok.py), sinkron dengan suara.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import timing from "./kelompok_timing.json";
import { Bean3, Bean3Params, BlueGrid, CanvasPlane, G, Limb, T, Vec3, XR, bean3HandWorld } from "./three/toon";
import { Calendar, CafeSet, ChatBubble, ClassroomSet, KosSet, Laptop, Marker, Mug, Phone } from "./three/objectsKelompok";
import { BUDOSEN, BAYU, DIMAS, JOKO, RARA, SARI } from "./SheetKelompok";
import { BigTitle, Cam, Chip, Flash, Stage, SubWord, Vignette, cl, kick, lerp, lv, pullBack, rp, shotCam, talkAt, walkLerp, yawTo } from "./sceneKit";

const TM = timing as any;
export type KelScene = "hook" | "grup" | "hilang" | "kamis" | "xray" | "kirim" | "presentasi" | "nilai";
export const KEL_ORDER: KelScene[] = TM.order;
export const DUR_KEL = (k: KelScene): number => TM.scenes[k].dur;
const EV = (n: string): number => TM.events[n];
const LN = (k: KelScene, i: number): { from: number; to: number } => TM.lines[k][i];
const Sub: React.FC<{ scene: KelScene }> = ({ scene }) => <SubWord timing={TM} scene={scene} />;

const Day: React.FC = () => (
  <>
    <hemisphereLight args={["#f6faff", "#c8b8a0", 1.2]} />
    <directionalLight position={[-3, 7, 6]} intensity={1.7} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
  </>
);
const Holo: React.FC = () => (
  <>
    <hemisphereLight args={["#bfe4ff", "#123060", 1.6]} />
    <directionalLight position={[3, 6, 5]} intensity={1.5} color="#e8f4ff" />
    <BlueGrid size={60} />
  </>
);
/** tangan besar untuk close-up insert (bola + lengan baju) */
const Hand: React.FC<{ at: Vec3; sleeve: string; glove?: string; dir?: Vec3; r?: number }> = ({ at, sleeve, glove = "#f1e2d0", dir = [0.5, 0.9, 0.6], r = 0.09 }) => (
  <group>
    <T g={G.sph(r, 16, 12)} c={glove} position={at} />
    <Limb a={at} b={[at[0] + dir[0], at[1] + dir[1], at[2] + dir[2]]} r={r * 0.55} c={sleeve} />
  </group>
);
/** papan nama melayang di atas kepala */
const NameTag: React.FC<{ name: string; position: Vec3; color?: string; scale?: number }> = ({ name, position, color = "#ffffff", scale = 1 }) => (
  <group position={position} scale={scale}>
    <CanvasPlane
      w={0.7}
      h={0.2}
      px={280}
      toon={false}
      o={2}
      drawKey={`tag${name}${color}`}
      draw={(c, W, H) => {
        c.fillStyle = color;
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#1a1a22";
        c.font = `900 ${H * 0.62}px Inter, sans-serif`;
        c.textAlign = "center";
        c.fillText(name, W / 2, H * 0.74);
      }}
    />
  </group>
);
const Zzz: React.FC<{ f: number; from: number; x: number; y: number }> = ({ f, from, x, y }) => {
  if (f < from) return null;
  return (
    <>
      {[0, 1, 2].map((i) => {
        const t = ((f - from + i * 14) % 42) / 42;
        return (
          <div key={i} style={{ position: "absolute", left: x + t * 90 + i * 20, top: y - t * 160, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 56 + i * 14, color: "#fff", opacity: Math.sin(t * Math.PI), textShadow: "4px 4px 0 #0c0c10" }}>
            Z
          </div>
        );
      })}
    </>
  );
};

/* ===================== 1. HOOK: kelas, siapa yang kerja? ===================== */
const GANG: [Bean3Params, Vec3, string][] = [
  [DIMAS, [-0.75, 0, 1.5], "DIMAS"],
  [RARA, [0.75, 0, 1.5], "RARA"],
  [BAYU, [-1.2, 0, 0.3], "BAYU"],
  [SARI, [0, 0, 0.15], "SARI"],
  [JOKO, [1.2, 0, 0.3], "JOKO"],
];
export const SceneKelHook: React.FC = () => {
  const f = useCurrentFrame();
  const tebak = EV("hook.tebak");
  const write = EV("hook.write");
  const jumat = EV("hook.jumat");
  const D = DUR_KEL("hook");
  const insertA = write - 4;
  const insertB = jumat + 22;
  const point = rp(f, tebak, tebak + 8);
  const cam = shotCam(f, [
    { to: insertA, p0: [0.2, 2.5, 10.4], l0: [0, 1.25, 0.8], p1: [0.1, 2.4, 9.6], l1: [0, 1.25, 0.8], fov: 40 },
    { to: D, p0: [3.6, 2.2, 1.6], l0: [-0.9, 1.5, -2.0], p1: [3.9, 2.3, 1.9], l1: [-0.9, 1.45, -2.0], fov: 50 },
  ]);
  const camF = pullBack(f, insertB, insertB + 18, { pos: [0.6, 1.75, -0.6], look: [0.55, 1.7, -2.9], fov: 44 }, cam);
  const reveal = rp(f, write, jumat + 4);
  if (f >= insertA && f < insertB) {
    // close-up papan: tangan Bu Dosen menulis dengan spidol
    const txtLen = 14 + 15;
    const n = reveal * txtLen;
    const line = n < 14 ? 0 : 1;
    const xk = line === 0 ? n / 14 : (n - 14) / 15;
    const hx = -1.75 + xk * 2.4;
    const hy = line === 0 ? 2.12 : 1.68;
    const circle = rp(f, jumat, jumat + 14);
    return (
      <AbsoluteFill>
        <Stage cam={{ pos: [hx - 0.3, hy - 0.1, 0.6], look: [hx - 0.45, hy - 0.1, -2.9], fov: 46 }} bg="#e8eef2">
          <Day />
          <ClassroomSet board={["TUGAS KELOMPOK", "DEADLINE: JUMAT"]} reveal={reveal} />
          {circle > 0 ? <T g={G.tor(0.36, 0.018, 6, 40, Math.PI * 2 * circle)} c="#d22a2a" o={false} position={[0.55, 1.6, -2.85]} scale={[1.4, 0.7, 1]} /> : null}
          <group position={[hx + (circle > 0 ? 0.6 * circle : 0), hy + Math.sin(f * 1.4) * 0.02, -2.78]}>
            <Marker rotation={[0.3, 0, 0.6]} c="#2a5aa8" />
            <Hand at={[0.05, -0.07, 0.05]} sleeve={BUDOSEN.body} dir={[0.3, -0.45, 0.35]} r={0.06} />
          </group>
        </Stage>
        <Sub scene="hook" />
      </AbsoluteFill>
    );
  }
  const others = (i: number): Partial<Bean3Params> => {
    if (f < tebak) return { expr: "happy" };
    if (i === 0) return { expr: "worried", look: 0.3 };
    // empat lainnya menunjuk Dimas
    const d = GANG[0][1];
    const me = GANG[i][1];
    const dir = [d[0] - me[0], d[2] - me[2]];
    const L = Math.hypot(dir[0], dir[1]) || 1;
    const hand: Vec3 = lv([0.42, 0.6, 0.1], [(dir[0] / L) * 0.55, 1.05, 0.25 + (dir[1] / L) * 0.3], point);
    return { expr: "smug", handR: hand, look: -0.6 };
  };
  const dosenWalk = walkLerp(f, insertB - 2, insertB + 30, [-1.6, 0, -2.2], [-2.0, 0, -1.6]);
  return (
    <AbsoluteFill>
      <Stage cam={camF} bg="#e8eef2">
        <Day />
        <ClassroomSet board={["TUGAS KELOMPOK", "DEADLINE: JUMAT"]} reveal={f >= insertA ? 1 : 0} fan={f * 0.3} />
        {f >= insertB ? <T g={G.tor(0.36, 0.018, 6, 40)} c="#d22a2a" o={false} position={[0.55, 1.6, -2.85]} scale={[1.4, 0.7, 1]} /> : null}
        {f < insertA
          ? GANG.map(([p, pos, name], i) => (
              <group key={name}>
                <Bean3 p={{ ...p, ...others(i), bob: Math.abs(Math.sin(f * 0.15 + i)) * 0.02 }} position={pos} rotation={[0, -pos[0] * 0.15, 0]} />
                <NameTag name={name} position={[pos[0], 2.15, pos[2]]} color={i === 0 ? "#ffd23f" : "#ffffff"} scale={0.85} />
              </group>
            ))
          : (
              <>
                <Bean3 p={{ ...BUDOSEN, expr: "happy", talk: talkAt(f, LN("hook", 1), 0.6), walk: dosenWalk.walk, handR: f > insertB + 30 ? [0.5, 1.25, 0.1] : undefined }} position={f < insertB ? [-1.6, 0, -2.2] : dosenWalk.pos} rotation={[0, f < insertB + 30 ? 0.6 : 0.55, 0]} />
                {GANG.map(([p, pos], i) => (
                  <Bean3 key={i} p={{ ...p, expr: i === 0 ? "determined" : "neutral" }} position={[pos[0] * 1.3 + 0.6, 0, pos[2] + 1.6]} rotation={[0, Math.PI + 0.5, 0]} />
                ))}
              </>
            )}
      </Stage>
      <Vignette />
      <BigTitle at={0} to={tebak + 16} top={140} size={62} line1="KERJA KELOMPOK 5 ORANG" line2="YANG KERJA… COBA TEBAK 🤔" />
      <Sub scene="hook" />
    </AbsoluteFill>
  );
};

/* ===================== 2. GRUP CHAT (hologram) ===================== */
const RING: [Bean3Params, Vec3][] = [
  [DIMAS, [0, 0, 1.2]],
  [JOKO, [-1.5, 0, 0.3]],
  [SARI, [1.5, 0, 0.3]],
  [RARA, [-0.9, 0, -0.9]],
  [BAYU, [0.9, 0, -0.9]],
];
export const SceneKelGrup: React.FC = () => {
  const f = useCurrentFrame();
  const cheer = EV("grup.cheer");
  const pops = ["grup.pop1", "grup.pop2", "grup.pop3", "grup.pop4"].map(EV);
  const D = DUR_KEL("grup");
  const ang = 0.25 * Math.sin(f * 0.012);
  const cam: Cam = { pos: [Math.sin(ang) * 6.8, 4.0, Math.cos(ang) * 6.8], look: [0, 1.6, 0], fov: 46 };
  const bubbles: [number, string, string, Vec3][] = [
    [cheer - 6, "Dimas", "Ayo mulai! 💪", [0.0, 2.55, 1.2]],
    [pops[0], "Joko", "Siap! 🫡", [-1.5, 2.55, 0.3]],
    [pops[1], "Sari", "Gas! 🔥", [1.5, 2.55, 0.3]],
    [pops[2], "Rara", "Nanti aku edit ya! 😘", [-0.9, 3.15, -0.9]],
    [pops[3], "Bayu", "Aku cari referensi!", [0.9, 3.75, -0.9]],
  ];
  return (
    <AbsoluteFill style={{ background: "#020a1c" }}>
      <Stage cam={cam} bg="#020a1c">
        <Holo />
        {RING.map(([p, pos], i) => {
          const jump = f >= cheer ? Math.max(0, Math.sin((f - cheer - i * 3) * 0.35)) * 0.25 : 0;
          const yaw = yawTo(pos, [0, 0, 6]);
          return <Bean3 key={i} p={{ ...p, expr: f >= cheer ? "laugh" : "happy", bob: jump, handL: f >= cheer ? [-0.35, 1.5, 0.15] : undefined, handR: f >= cheer ? [0.35, 1.5, 0.15] : undefined }} position={pos} rotation={[0, yaw, 0]} scale={0.85} />;
        })}
        {bubbles.map(([at, name, text, pos], i) => {
          if (f < at) return null;
          const s = Math.min(1, (f - at) / 5) * (1 + 0.15 * Math.max(0, 1 - (f - at) / 8));
          return <ChatBubble key={i} position={pos} name={name} text={text} mine={i === 0} scale={1.0 * s} />;
        })}
      </Stage>
      <Chip at={4} to={D} top={210} color="#7fe8ff">📱 GRUP: KELOMPOK 3 (5 orang)</Chip>
      <Sub scene="grup" />
    </AbsoluteFill>
  );
};

/* ===================== 3. HARI DEMI HARI, ANGGOTA MENGHILANG ===================== */
const DAYS = ["SEN|2", "SEL|3", "RAB|4", "KAM|5"];
export const SceneKelHilang: React.FC = () => {
  const f = useCurrentFrame();
  const tear = EV("hilang.tear");
  const ev = { joko: EV("hilang.joko"), sari: EV("hilang.sari"), bayu: EV("hilang.bayu"), rara: EV("hilang.rara") };
  const D = DUR_KEL("hilang");
  const calEnd = ev.joko - 8;
  if (f < calEnd) {
    // close-up kalender: tangan Dimas menyobek satu halaman tiap hari
    const step = Math.max(10, Math.floor((calEnd - tear) / 4));
    const idx = Math.min(3, Math.max(0, Math.floor((f - tear) / step)));
    const local = f - tear - idx * step;
    const pull = f < tear ? 0 : rp(local, 0, step * 0.5);
    const fly = f < tear ? 0 : rp(local, step * 0.35, step);
    const [dName, dNum] = DAYS[Math.min(3, idx)].split("|");
    const [nName, nNum] = DAYS[Math.min(3, idx + 1)].split("|");
    return (
      <AbsoluteFill>
        <Stage cam={{ pos: [0.2, 1.75, 0.9], look: [0, 1.65, -0.2], fov: 40 }} bg="#b8d0c0">
          <hemisphereLight args={["#fff4e0", "#8a7a6a", 1.3]} />
          <directionalLight position={[1, 3, 3]} intensity={1.2} />
          <T g={G.box(4, 3, 0.1)} c="#b8d0c0" position={[0, 1.6, -0.3]} o={false} />
          <Calendar position={[0, 1.65, -0.22]} day={f < tear ? "1" : nNum} label={f < tear ? "MIN" : nName} scale={1.4} />
          {f >= tear && fly < 1 ? (
            <group position={[0.1 + fly * 0.5, 1.65 - fly * 1.2, -0.16 + fly * 0.4]} rotation={[fly * 1.5, 0, -pull * 0.3 - fly * 1.2]}>
              <Calendar day={dNum} label={dName} scale={1.4} />
            </group>
          ) : null}
          {f >= tear && fly < 0.6 ? <Hand at={[0.2 + pull * 0.15 + fly * 0.4, 1.62 - fly * 0.6, -0.08]} sleeve={DIMAS.body} dir={[0.6, -0.4, 0.8]} r={0.08} /> : null}
        </Stage>
        <Chip at={tear} to={calEnd} top={210}>📅 HARI KE-{Math.min(4, idx + 2)}</Chip>
        <Sub scene="hilang" />
      </AbsoluteFill>
    );
  }
  const gone = (at: number) => rp(f, at + 10, at + 24);
  const ang = 0.2 * Math.sin(f * 0.012 + 1);
  const cam: Cam = { pos: [Math.sin(ang) * 6.6, 4.0, Math.cos(ang) * 6.6], look: [0, 1.4, 0], fov: 46 };
  const who: [Bean3Params, Vec3, number, Partial<Bean3Params>][] = [
    [JOKO, [-1.5, 0, 0.3], gone(ev.joko), { expr: "neutral" }],
    [SARI, [1.5, 0, 0.3], gone(ev.sari), { expr: "puzzled" }],
    [BAYU, [0.9, 0, -0.9], gone(ev.bayu), { expr: "smug" }],
    [RARA, [-0.9, 0, -0.9], gone(ev.rara + 6), { expr: "smug" }],
  ];
  return (
    <AbsoluteFill style={{ background: "#020a1c" }}>
      <Stage cam={cam} bg="#020a1c">
        <Holo />
        <Bean3 p={{ ...DIMAS, expr: f > ev.rara ? "worried" : "neutral", look: Math.sin(f * 0.08) * 0.8, headTurn: Math.sin(f * 0.06) * 0.5 }} position={[0, 0, 1.2]} rotation={[0, 0, 0]} scale={0.85} />
        {who.map(([p, pos, g, extra], i) => (g < 1 ? <Bean3 key={i} p={{ ...p, ...extra }} position={[pos[0], -g * 1.9, pos[2]]} rotation={[0, yawTo(pos, [0, 0, 6]) + g * 6, 0]} scale={0.85 * (1 - g * 0.4)} /> : null))}
        {f >= ev.bayu && f < ev.bayu + 30 ? <ChatBubble position={[0.9, 2.6, -0.9]} name="Bayu" text="🔗 1 link" scale={0.7} /> : null}
        {f >= ev.rara ? <ChatBubble position={[-0.9, 2.6, -0.9]} name="Rara" text="Nanti ya… ⏳" scale={0.7} /> : null}
        {who.map(([, pos, g], i) => (g > 0 ? <T key={i} g={G.tor(0.45, 0.03, 6, 30)} c="#7fe8ff" emissive="#4ac8ff" ei={1} o={false} position={[pos[0], 0.05, pos[2]]} rotation={[Math.PI / 2, 0, 0]} scale={1 + g} /> : null))}
      </Stage>
      <Chip at={ev.joko} to={ev.sari - 2} top={210} color="#9aa0b0">👻 Joko · terakhir dilihat 3 hari lalu</Chip>
      <Chip at={ev.sari} to={ev.bayu - 2} top={210} color="#9aa0b0">📶 Sari · sinyal jelek</Chip>
      <Chip at={ev.bayu} to={ev.rara - 2} top={210} color="#9aa0b0">🔗 Bayu · kirim 1 link</Chip>
      <Chip at={ev.rara} to={D} top={210} color="#ff9ac0">⏳ Rara · nunggu buat ngedit</Chip>
      <Sub scene="hilang" />
    </AbsoluteFill>
  );
};

/* ===================== 4. KAMIS MALAM: layar terbelah kos vs kafe ===================== */
const ChatScreen: React.FC<{ f: number; sent: number; read: number }> = ({ f, sent, read }) => {
  const msg = "Teman-teman, bagiannya mana? 🥲";
  const n = Math.floor(msg.length * rp(f, sent - 16, sent));
  return (
    <Stage cam={{ pos: [0, 0.95, 1.45], look: [0, 0.92, -0.05], fov: 40 }} bg="#1a2a4a">
      <hemisphereLight args={["#9aa8e8", "#2a2a4a", 1.0]} />
      <pointLight position={[0.3, 1.3, 0.6]} intensity={1.2} color="#ffe0b0" />
      <T g={G.box(1.2, 0.6, 0.02)} c="#9aa0a8" position={[0, 0.92, -0.08]} o={false} />
      <CanvasPlane
        w={0.56}
        h={0.36}
        px={700}
        toon={false}
        o={2}
        position={[0, 0.92, -0.06]}
        drawKey={`chat${n}${f >= sent}${f >= read}`}
        draw={(c, W, H) => {
          c.fillStyle = "#e8ddd2";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#1e6a52";
          c.fillRect(0, 0, W, H * 0.16);
          c.fillStyle = "#fff";
          c.font = `800 ${H * 0.07}px Inter, sans-serif`;
          c.fillText("KELOMPOK 3 (5)", W * 0.04, H * 0.1);
          const bub = (y: number, who: string, t: string, mine: boolean) => {
            c.fillStyle = mine ? "#d8f8c8" : "#ffffff";
            const bw = W * 0.6;
            const x = mine ? W * 0.36 : W * 0.04;
            c.fillRect(x, y, bw, H * 0.13);
            c.fillStyle = "#2a8a5a";
            c.font = `800 ${H * 0.04}px Inter, sans-serif`;
            c.fillText(who, x + 8, y + H * 0.045);
            c.fillStyle = "#1a1a22";
            c.font = `700 ${H * 0.05}px Inter, sans-serif`;
            c.fillText(t, x + 8, y + H * 0.105);
          };
          bub(H * 0.2, "Rara · Senin", "Nanti aku edit ya! 😘", false);
          bub(H * 0.36, "Bayu · Selasa", "🔗 jurnal.com/link", false);
          if (n > 0) bub(H * 0.6, "Dimas · 23.41", msg.slice(0, n), true);
          if (f >= sent) {
            c.fillStyle = f >= read ? "#3a8ae8" : "#8a8a90";
            c.font = `900 ${H * 0.05}px Inter, sans-serif`;
            c.fillText(f >= read ? "✓✓ Dibaca 4" : "✓", W * 0.8, H * 0.79);
          }
        }}
      />
    </Stage>
  );
};
export const SceneKelKamis: React.FC = () => {
  const f = useCurrentFrame();
  const send = EV("kamis.send");
  const read = EV("kamis.read");
  const flip = EV("kamis.flip");
  const D = DUR_KEL("kamis");
  const insert = f >= send - 18 && f < read + 22;
  const type = Math.sin(f * 1.3);
  const dimasP: Bean3Params = { ...DIMAS, seated: true, expr: f >= flip + 6 ? "worried" : "determined", look: 0, handL: [-0.18, 1.0 + Math.max(0, type) * 0.04, 0.5], handR: [0.18, 1.0 + Math.max(0, -type) * 0.04, 0.5], headTilt: 0.08 };
  const flipK = (i: number) => rp(f, flip + i * 4, flip + 10 + i * 4);
  const gangCafe: [Bean3Params, Vec3, number][] = [
    [RARA, [-0.95, 0, 0.25], 0.9],
    [BAYU, [0.5, 0, 0.6], -0.45],
    [SARI, [-0.3, 0, 0.95], 0.25],
    [JOKO, [0.35, 0, -0.85], 0.1],
  ];
  return (
    <AbsoluteFill style={{ background: "#0c0c10" }}>
      {insert ? (
        <ChatScreen f={f} sent={send} read={read} />
      ) : (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 1920, overflow: "hidden" }}>
            <Stage cam={{ pos: [2.9, 1.75, -2.2], look: [0.7, 1.1, -1.25], fov: 56 }} w={540} h={1920} bg="#1a2a4a">
              <directionalLight position={[1, 4, 2]} intensity={0.5} color="#a8b8ff" />
              <KosSet night={1} mugs={2} />
              <Laptop position={[0.75, 0.78, -1.75]} typed={0.3 + rp(f, 0, D) * 0.5} />
              <Bean3 p={dimasP} position={[0.75, 0, -1.15]} rotation={[0, Math.PI, 0]} />
            </Stage>
            <div style={{ position: "absolute", top: 210, left: 24, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 40, color: "#fff", background: "rgba(10,14,28,0.86)", padding: "10px 18px", borderRadius: 16, border: "4px solid #7fa8ff" }}>🌙 KOS · 23.40</div>
          </div>
          <div style={{ position: "absolute", left: 540, top: 0, width: 540, height: 1920, overflow: "hidden" }}>
            <Stage cam={{ pos: [1.6, 2.7, 5.6], look: [-0.15, 1.0, 0.0], fov: 60 }} w={540} h={1920} bg="#e8d2b8">
              <directionalLight position={[2, 5, 4]} intensity={1.0} color="#fff0d8" />
              <CafeSet />
              {gangCafe.map(([p, pos, yaw], i) => {
                const k = flipK(i);
                const hold: Vec3 = [0.2, 1.1, 0.4];
                const handR: Vec3 = f < read ? [0.42, 0.6, 0.1] : f < flip ? hold : lv(hold, [0.25, 0.78, 0.45], k);
                const pp: Bean3Params = { ...p, expr: f >= read && f < flip + 10 ? "puzzled" : "laugh", bob: f < read || f > flip + 14 ? Math.abs(Math.sin(f * 0.6 + i)) * 0.04 : 0, handR, look: f >= read && f < flip ? 0.4 : 0 };
                const phoneW = bean3HandWorld(pp, "R", pos, yaw);
                return (
                  <group key={i}>
                    <Bean3 p={pp} position={pos} rotation={[0, yaw, 0]} />
                    {f >= read ? <Phone position={k >= 1 ? [phoneW[0], 0.77, phoneW[2]] : phoneW} rotation={[-Math.PI / 2 * (0.3 + 0.7 * k) - (k >= 1 ? Math.PI : 0) * 0, yaw, 0]} lit={k < 0.5} scale={1.2} /> : null}
                  </group>
                );
              })}
            </Stage>
            <div style={{ position: "absolute", top: 210, left: 24, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 40, color: "#fff", background: "rgba(10,14,28,0.86)", padding: "10px 18px", borderRadius: 16, border: "4px solid #ffd23f" }}>☕ KAFE · 23.40</div>
          </div>
          <div style={{ position: "absolute", left: 536, top: 0, width: 8, height: 1920, background: "#0c0c10" }} />
        </>
      )}
      <Sub scene="kamis" />
    </AbsoluteFill>
  );
};

/* ===================== 5. X-RAY ENERGI DIMAS ===================== */
export const SceneKelXray: React.FC = () => {
  const f = useCurrentFrame();
  const drink = EV("xray.drink");
  const batt = EV("xray.battery");
  const panda = EV("xray.panda");
  const D = DUR_KEL("xray");
  const level = lerp(1, 0.03, rp(f, 0, batt));
  const low = f >= batt;
  const lift = rp(f, drink, drink + 12) * (1 - rp(f, drink + 34, drink + 46));
  const p: Bean3Params = { ...DIMAS, expr: f >= panda - 2 ? "sleepy" : f >= batt ? "worried" : "determined", handR: lv([0.4, 0.75, 0.25], [0.12, 1.32, 0.42], lift), headTilt: lift * -0.25 + (f >= panda ? 0.12 : 0) };
  const mugW = bean3HandWorld(p, "R", [0, 0, 0]);
  const cam = shotCam(f, [
    { to: panda - 4, p0: [0.3, 1.5, 3.4], l0: [0, 1.0, 0], p1: [0.2, 1.45, 3.0], l1: [0, 1.0, 0], fov: 42 },
    { to: panda + 20, p0: [0.1, 1.5, 2.3], l0: [0, 1.3, 0], fov: 40 },
    { to: D, p0: [0.1, 1.5, 2.3], l0: [0, 1.4, 0], p1: [0.3, 1.5, 3.2], l1: [0, 1.05, 0], fov: 42 },
  ]);
  const hour = f < drink ? "01.00" : f < panda - 10 ? "02.30" : "04.00";
  const col = level > 0.5 ? "#4ade80" : level > 0.2 ? "#facc15" : "#ef4444";
  return (
    <AbsoluteFill style={{ background: "#020a1c" }}>
      <Stage cam={cam} bg="#020a1c">
        <Holo />
        <Bean3 p={p} position={[0, 0, 0]} />
        {/* cangkang X-ray di badan + baterai energi di dada */}
        <XR g={G.cap(0.31, 0.44, 20)} position={[0, 0.76, 0]} />
        <group position={[0, 0.8, 0.33]}>
          <XR g={G.box(0.26, 0.4, 0.03)} color="#a8f0ff" />
          <T g={G.box(0.1, 0.04, 0.03)} c="#a8f0ff" position={[0, 0.22, 0]} o={false} />
          <T g={G.box(0.22, 0.36 * level, 0.03)} c={col} emissive={col} ei={low && f % 10 < 5 ? 1.6 : 0.8} o={false} position={[0, -0.18 + 0.18 * level, 0.005]} />
        </group>
        {/* aliran kopi masuk ke "baterai" */}
        {f >= drink + 12 && f < drink + 40
          ? [0, 1, 2, 3, 4].map((i) => {
              const k = ((f - drink - 12) * 0.05 + i * 0.2) % 1;
              return <T key={i} g={G.sph(0.03, 8, 6)} c="#8a4a22" emissive="#6a3a1a" ei={0.6} o={false} position={[0, lerp(1.2, 0.85, k), 0.3]} />;
            })
          : null}
        <Mug position={[mugW[0] - 0.05, mugW[1] - 0.05, mugW[2]]} rotation={[0, 0, -lift * 1.2]} full={1 - rp(f, drink + 12, drink + 34)} scale={1.3} />
        {[0, 1, 2].map((i) => (
          <Mug key={i} position={[-0.9 + i * 0.25, 0, 0.6]} c={["#f4f0e8", "#d84a3a", "#4a8ad8"][i]} full={0} scale={1.4} />
        ))}
      </Stage>
      <Chip at={2} to={D} top={210} color="#7fe8ff">🕐 {hour}</Chip>
      <div style={{ position: "absolute", top: 330, left: 70, fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 58, color: col, textShadow: "4px 4px 0 #0c0c10" }}>⚡ ENERGI {Math.round(level * 100)}%</div>
      <Chip at={drink + 4} to={batt - 2} top={430} color="#c8864a">☕ KOPI GELAS KE-3</Chip>
      <Sub scene="xray" />
    </AbsoluteFill>
  );
};

/* ===================== 6. SUBUH: KIRIM, LALU TERTIDUR ===================== */
export const SceneKelKirim: React.FC = () => {
  const f = useCurrentFrame();
  const press = EV("kirim.press");
  const sleep = EV("kirim.sleep");
  const D = DUR_KEL("kirim");
  const insert = f >= press - 14 && f < press + 22;
  const down = rp(f, sleep, sleep + 14);
  const dawn = rp(f, 0, D);
  if (insert) {
    const push = f < press ? rp(f, press - 12, press) : 1 - rp(f, press + 4, press + 12);
    const sent = f >= press;
    return (
      <AbsoluteFill>
        <Stage cam={{ pos: [0, 0.98, 1.45], look: [0, 0.9, -0.05], fov: 40 }} bg="#1a2a4a" shake={kick(f, [press], 0.01)}>
          <hemisphereLight args={["#c8b8e8", "#2a2a4a", 1.0]} />
          <pointLight position={[0.3, 1.3, 0.6]} intensity={1.2} color="#ffe0b0" />
          <CanvasPlane
            w={0.56}
            h={0.36}
            px={700}
            toon={false}
            o={2}
            position={[0, 0.92, -0.06]}
            drawKey={`kirim${sent}`}
            draw={(c, W, H) => {
              c.fillStyle = "#f4f6fa";
              c.fillRect(0, 0, W, H);
              c.fillStyle = "#2a5aa8";
              c.fillRect(0, 0, W, H * 0.14);
              c.fillStyle = "#fff";
              c.font = `800 ${H * 0.07}px Inter, sans-serif`;
              c.fillText("E-LEARNING · Kumpul Tugas", W * 0.04, H * 0.095);
              c.fillStyle = "#1a1a22";
              c.font = `800 ${H * 0.06}px Inter, sans-serif`;
              c.fillText("📄 Tugas_Kelompok3_FINAL_fix2.docx", W * 0.06, H * 0.32);
              c.fillStyle = sent ? "#2a9a5a" : "#2a5aa8";
              c.fillRect(W * 0.3, H * 0.52, W * 0.4, H * 0.17);
              c.fillStyle = "#fff";
              c.font = `900 ${H * 0.08}px Inter, sans-serif`;
              c.textAlign = "center";
              c.fillText(sent ? "✓ TERKIRIM" : "KIRIM", W / 2, H * 0.64);
              c.fillStyle = "#6a6a70";
              c.font = `700 ${H * 0.05}px Inter, sans-serif`;
              c.fillText(sent ? "Jumat, 04.58" : "", W / 2, H * 0.82);
            }}
          />
          <group position={[0.02, 0.86, 0.12 - push * 0.15]}>
            <Hand at={[0, 0, 0]} sleeve={DIMAS.body} dir={[0.25, -0.35, 0.5]} r={0.04} />
          </group>
        </Stage>
        <Flash at={press} dur={5} color="#c8ffd8" />
        <Sub scene="kirim" />
      </AbsoluteFill>
    );
  }
  const p: Bean3Params = { ...DIMAS, seated: true, expr: "sleepy", lean: down * 1.0, headTilt: down * 0.3, handL: f < sleep ? [-0.18, 1.0, 0.5] : [-0.3, 1.0, 0.45], handR: f < sleep ? [0.18, 1.0, 0.5] : [0.3, 1.0, 0.45] };
  return (
    <AbsoluteFill>
      <Stage cam={shotCam(f, [{ to: D, p0: [-1.0, 1.6, 1.4], l0: [0.6, 1.0, -1.5], p1: [-1.3, 1.7, 1.9], l1: [0.6, 0.95, -1.5], fov: 44 }])} bg="#3a3a5a">
        <directionalLight position={[2, 3, -3]} intensity={0.4 + dawn * 1.0} color="#ffb070" />
        <KosSet night={dawn > 0.4 ? 0 : 1} mugs={5} />
        <Laptop position={[0.75, 0.78, -1.75]} typed={1} screenText="✓ TERKIRIM" />
        <Bean3 p={p} position={[0.75, 0, -1.15]} rotation={[0, Math.PI - 0.3, 0]} />
      </Stage>
      <Zzz f={f} from={sleep + 14} x={420} y={860} />
      <Chip at={4} to={D} top={210} color="#ffb070">🌅 JUMAT · 04.58</Chip>
      <Sub scene="kirim" />
    </AbsoluteFill>
  );
};

/* ===================== 7. PRESENTASI ===================== */
export const SceneKelPresentasi: React.FC = () => {
  const f = useCurrentFrame();
  const bayuEv = EV("pres.bayu");
  const raraEv = EV("pres.rara");
  const D = DUR_KEL("presentasi");
  const l1 = LN("presentasi", 1);
  const l2 = LN("presentasi", 2);
  const cam = shotCam(f, [
    { to: bayuEv - 4, p0: [-0.2, 2.1, 6.4], l0: [0.6, 1.4, -1.5], p1: [-0.1, 2.0, 6.0], l1: [0.6, 1.4, -1.5], fov: 44 },
    { to: raraEv - 4, p0: [1.3, 1.8, 2.6], l0: [1.3, 1.4, -1.6], fov: 42 },
    { to: D - 24, p0: [0.5, 1.75, 2.6], l0: [0.5, 1.35, -1.3], fov: 42 },
    { to: D, p0: [-1.4, 1.6, 1.6], l0: [2.6, 1.0, -1.6], fov: 42 },
  ]);
  const nod = (i: number) => Math.sin(f * 0.25 + i) * 0.12;
  const point = rp(f, bayuEv, bayuEv + 8);
  const chest = rp(f, raraEv, raraEv + 6);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#e8eef2">
        <Day />
        <ClassroomSet slide board={["TUGAS KELOMPOK", "DEADLINE: JUMAT"]} fan={f * 0.3} />
        <Bean3 p={{ ...BAYU, expr: f >= bayuEv ? "proud" : "smug", talk: talkAt(f, l1), handR: lv([0.42, 0.6, 0.1], [0.55, 1.45, 0.05], point) }} position={[1.4, 0, -1.6]} rotation={[0, 0.25, 0]} />
        <Bean3 p={{ ...RARA, expr: f >= raraEv ? "proud" : "happy", talk: talkAt(f, l2), handR: lv([0.42, 0.6, 0.1], [0.1, 1.0, 0.3], chest) }} position={[0.55, 0, -1.3]} rotation={[0, 0.15, 0]} />
        <Bean3 p={{ ...SARI, expr: "happy", headTilt: nod(1) }} position={[-0.3, 0, -1.4]} rotation={[0, 0.25, 0]} />
        <Bean3 p={{ ...JOKO, expr: "proud", headTilt: nod(2) }} position={[-1.1, 0, -1.55]} rotation={[0, 0.35, 0]} />
        <Bean3 p={{ ...DIMAS, expr: "sleepy", headTilt: 0.15 + Math.sin(f * 0.07) * 0.12, lean: Math.sin(f * 0.07) * 0.06 }} position={[-1.9, 0, -1.9]} rotation={[0, 0.45, 0]} />
        <Bean3 p={{ ...BUDOSEN, seated: true, expr: "happy", headTilt: Math.sin(f * 0.2) * 0.08, handR: [0.3, 1.05, 0.45] }} position={[2.9, 0, -2.2]} rotation={[0, -0.9, 0]} />
      </Stage>
      <Vignette />
      <Chip at={4} to={bayuEv - 4} top={210}>🎤 PRESENTASI KELOMPOK 3</Chip>
      <Sub scene="presentasi" />
    </AbsoluteFill>
  );
};

/* ===================== 8. NILAI ===================== */
export const SceneKelNilai: React.FC = () => {
  const f = useCurrentFrame();
  const board = EV("nilai.board");
  const shock = EV("nilai.shock");
  const tos = EV("nilai.tos");
  const smile = EV("nilai.smile");
  const title = EV("nilai.title");
  const D = DUR_KEL("nilai");
  const grades = rp(f, board, board + 16);
  const cam = shotCam(f, [
    { to: board - 2, p0: [-1.2, 1.9, 2.6], l0: [-2.6, 1.6, -2.4], fov: 42 },
    { to: shock + 4, p0: [-2.2, 1.95, 0.5], l0: [-3.3, 1.8, -2.9], fov: 40 },
    { to: title, p0: [0.0, 1.9, 6.2], l0: [-0.3, 1.2, -0.2], p1: [0.0, 1.85, 5.4], l1: [-0.3, 1.25, -0.2], fov: 42 },
    { to: D, p0: [0.0, 1.85, 5.4], l0: [-0.3, 1.25, -0.2], p1: [0.0, 2.2, 7.0], l1: [-0.3, 1.2, -0.2], fov: 42 },
  ]);
  const hi = rp(f, tos, tos + 8) * (1 - rp(f, tos + 26, tos + 34));
  const dPos: Vec3 = [-0.4, 0, 0.3];
  const shoulder: Vec3 = [dPos[0] + 0.25, 1.05, dPos[2]];
  const raraPos: Vec3 = [0.45, 0, 0.1];
  const raraYaw = -0.6;
  // tangan Rara ke bahu Dimas (posisi lokal dihitung dari target dunia)
  const dx = shoulder[0] - raraPos[0],
    dz = shoulder[2] - raraPos[2];
  const lx = dx * Math.cos(raraYaw) - dz * Math.sin(raraYaw);
  const lz = dx * Math.sin(raraYaw) + dz * Math.cos(raraYaw);
  const pat = rp(f, tos + 30, tos + 38);
  return (
    <AbsoluteFill>
      <Stage cam={cam} bg="#e8eef2">
        <Day />
        <ClassroomSet slide grades={f >= board ? grades : 0} fan={f * 0.3} />
        <Bean3 p={{ ...DIMAS, expr: f >= smile ? "happy" : f >= shock ? "shock" : "sleepy", bob: f >= shock && f < shock + 8 ? Math.sin(((f - shock) / 8) * Math.PI) * 0.1 : 0 }} position={dPos} rotation={[0, 0.2, 0]} />
        <Bean3 p={{ ...RARA, expr: "laugh", talk: talkAt(f, LN("nilai", 2)), handR: f >= tos + 30 ? lv([0.42, 0.6, 0.1], [cl(lx, -0.7, 0.7), 1.05, cl(lz, 0.1, 0.8)], pat) : lv([0.42, 0.6, 0.1], [0.3, 1.5, 0.3], hi) }} position={raraPos} rotation={[0, raraYaw, 0]} />
        <Bean3 p={{ ...BAYU, expr: "laugh", handL: lv([-0.42, 0.6, 0.1], [-0.3, 1.5, 0.3], hi) }} position={[1.3, 0, -0.4]} rotation={[0, -0.9, 0]} />
        <Bean3 p={{ ...SARI, expr: "happy", handR: lv([0.42, 0.6, 0.1], [0.3, 1.45, 0.3], hi) }} position={[-1.3, 0, -0.5]} rotation={[0, 0.5, 0]} />
        <Bean3 p={{ ...JOKO, expr: "laugh", handL: lv([-0.42, 0.6, 0.1], [-0.3, 1.45, 0.3], hi) }} position={[-2.0, 0, -1.0]} rotation={[0, 0.6, 0]} />
      </Stage>
      <Vignette />
      <Flash at={board} dur={4} />
      <BigTitle at={title} top={170} line1="KERJA KELOMPOK" line2="1 YANG KERJA · 5 NILAI A" badge="🏆 KECUALI DIMAS 🥲" size={64} />
      <Sub scene="nilai" />
    </AbsoluteFill>
  );
};

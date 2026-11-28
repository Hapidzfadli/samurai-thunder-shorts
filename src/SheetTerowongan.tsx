import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./three/objects";
import { BeanCard, BeanParams, BeanExpr } from "./three/objectsBean";

/* ================================================================== */
/* CAST "TEROWONGAN KE BRANKAS" (kisah nyata Nice 1976).               */
/* Tokoh dialog fiktif: Dodi = "Si Fotografer" (diperankan, terinspirasi */
/* Spaggiari), Ara = "Mimi" (anggota komplotan fiktif). Figuran fiktif.  */
/* ================================================================== */
export const FOTOGRAFER: BeanParams = {
  skin: "#f0cfae", torso: "#d9c79e", sleeves: "#d9c79e", safari: true, pants: "#4a3a2c",
  hat: "none", hair: "#2a1c14", sideHair: "#2a1c14", belt: "#3a2a1e", boots: "#2a1e16", seed: 71,
};
export const FOTOGRAFER_GALI: BeanParams = {
  skin: "#f0cfae", torso: "#3c4a5c", sleeves: "#3c4a5c", pants: "#2e3440",
  hat: "helmet", hatColor: "#e0b83a", hair: "#2a1c14", boots: "#1c1a18", soot: 0.45, seed: 72,
};
export const MIMI: BeanParams = {
  skin: "#f6dcc0", torso: "#a8323a", sleeves: "#a8323a", skirt: "#2c3a56", batik: "#c9a24a",
  hat: "sanggul", hair: "#4a2a1a", sideHair: "#4a2a1a", belt: "#3a2a1e", boots: "#1c1816", seed: 73,
};
export const MIMI_GOT: BeanParams = { ...MIMI, torso: "#5a6a4a", sleeves: "#5a6a4a", boots: "#2e3a2a", soot: 0.3, wet: 0.25, seed: 74 };
export const MANAJER: BeanParams = {
  skin: "#f2d4b8", torso: "#2a2a34", coat: true, tie: "#8a2a2a", pants: "#2a2a34",
  hat: "bowler", hatColor: "#1c1c22", mustache: true, boots: "#141414", seed: 75,
};
export const POLISI: BeanParams = {
  skin: "#e8c49c", torso: "#26345a", sleeves: "#26345a", pants: "#26345a", hat: "policecap", hatColor: "#1c2440",
  badge: true, belt: "#141414", boots: "#141414", seed: 76,
};
export const HAKIM: BeanParams = {
  skin: "#f0d0b4", torso: "#16161c", robe: "#16161c", robeTrim: "#f4f0e6", tie: "#f4f0e6",
  hat: "none", hair: "#9a9a9a", sideHair: "#9a9a9a", seed: 77,
};
export const KOMPLOTAN: BeanParams = {
  skin: "#e2bc94", torso: "#6a4a32", sleeves: "#6a4a32", pants: "#3a3a3a", hat: "kerchief", hatColor: "#2a3a4a",
  boots: "#1c1a18", soot: 0.5, wide: 1.06, seed: 78,
};

const LABELS: [string, string, string, string][] = [
  ["Si Fotografer", "DODI · pria · tokoh fiktif", "Otak komplotan (terinspirasi Spaggiari). Tenang, licik, suka gaya.", "Kemeja safari krem + celana cokelat; saat menggali: baju kerja biru, helm kuning, coreng tanah."],
  ["Mimi", "ARA · wanita · tokoh fiktif", "Penunjuk jalan di got. Skeptis, cerewet, paling waras.", "Sanggul, blus merah, rok biru; di got: blus hijau lumut, bot karet, basah sampai betis."],
  ["Manajer Bank", "Figuran", "Senin pagi: pintu brankas tak bisa dibuka.", "Topi bowler, jas, dasi merah, kumis."],
  ["Polisi Nice", "Figuran", "Menemukan lubang & tulisan di dinding.", "Kepi polisi, seragam biru, lencana."],
  ["Hakim", "Figuran", "Interogasi Maret 1977, sebelum tokoh kita melompat dari jendela.", "Toga hitam, kerah putih, rambut uban."],
  ["Anggota komplotan", "Figuran ×2-3", "Mengoper ember tanah & membawa bor.", "Ikat kepala, baju kerja cokelat, kotor."],
];

export const SheetTerowonganKarakter: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#e6ebf4, #c9b49a)" }}>
    <ThreeCanvas width={2000} height={1150} shadows camera={{ fov: 21, near: 0.5, far: 200, position: [0, 1.6, 25] }}>
      <CameraRig position={[0, 1.6, 25]} lookAt={[0, 1.15, 0]} fov={21} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#d2bea0" roughness={1} />
      </mesh>
      {/* Dodi: depan biasa, depan menggali, belakang */}
      <BeanCard position={[-7.6, 0, 0]} height={3.6} params={{ ...FOTOGRAFER, expr: "smug", armL: [-20, -30], armR: [55, -70] }} />
      <BeanCard position={[-5.9, 0, 0]} height={3.6} params={{ ...FOTOGRAFER_GALI, expr: "think", armL: [-15, -20], armR: [30, -60] }} />
      <BeanCard position={[-4.3, 0, 0]} height={3.6} params={{ ...FOTOGRAFER_GALI, back: true, hair: "#2a1c14" }} />
      {/* Ara */}
      <BeanCard position={[-2.5, 0, 0]} height={3.4} params={{ ...MIMI, expr: "talk", mouthOpen: 0.5, armL: [-20, -30], armR: [65, -55] }} />
      <BeanCard position={[-0.9, 0, 0]} height={3.4} params={{ ...MIMI_GOT, expr: "disgust", prop: "torch", armL: [-15, -20], armR: [40, -70] }} />
      <BeanCard position={[0.6, 0, 0]} height={3.4} params={{ ...MIMI_GOT, back: true, hair: "#4a2a1a" }} />
      {/* figuran */}
      <BeanCard position={[2.5, 0, 0]} height={3.5} params={{ ...MANAJER, expr: "shock", sweat: true, armL: [-40, -60], armR: [40, -60] }} />
      <BeanCard position={[4.2, 0, 0]} height={3.5} params={{ ...POLISI, expr: "angry", armL: [-15, -20], armR: [20, -20] }} />
      <BeanCard position={[5.9, 0, 0]} height={3.5} params={{ ...HAKIM, expr: "think", prop: "paper", armL: [-15, -20], armR: [40, -60] }} />
      <BeanCard position={[7.6, 0, 0]} height={3.45} params={{ ...KOMPLOTAN, expr: "neutral", prop: "bucket", armL: [-15, -20], armR: [30, -40] }} />
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.7]} />
      <directionalLight position={[-6, 10, 14]} intensity={2.1} color="#fff0d8" castShadow />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 22, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#241726", letterSpacing: 2 }}>
      KARAKTER · "TEROWONGAN KE BRANKAS" (NICE, 1976)
    </div>
    <div style={{ position: "absolute", top: 86, left: 40, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 20, color: "#5a3a40" }}>
      Dodi: biasa · menggali · tampak belakang (masuk got) &nbsp;|&nbsp; Ara: biasa · di got bawa lentera · tampak belakang &nbsp;|&nbsp; figuran
    </div>
    <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, display: "flex", gap: 12 }}>
      {LABELS.map(([n, r, d, o], i) => (
        <div key={n} style={{ flex: i < 2 ? 3 : 1, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#241726" }}>{n}</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#991b1b" }}>{r}</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#4a3340", marginTop: 4, lineHeight: 1.25 }}>{d}</div>
          <div style={{ fontWeight: 500, fontSize: 13, color: "#6a4a50", marginTop: 2, lineHeight: 1.2 }}>{o}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const EXPRS: [BeanExpr, string][] = [
  ["neutral", "biasa"], ["talk", "bicara"], ["smug", "licik/puas"], ["think", "mikir"], ["shock", "kaget"], ["scared", "panik"], ["disgust", "jijik (got)"], ["laugh", "tertawa"],
];
export const SheetTerowonganEkspresi: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#f2f0f8, #e0c8b0)" }}>
    <ThreeCanvas width={2000} height={1150} camera={{ fov: 22, near: 0.5, far: 200, position: [0, 1.6, 26] }}>
      <CameraRig position={[0, 1.6, 26]} lookAt={[0, 1.55, 0]} fov={22} />
      {EXPRS.map(([e], i) => (
        <BeanCard key={`d${e}`} position={[-7.2 + i * 2.05, 2.35, 0]} height={2.3} shadow={false} params={{ ...FOTOGRAFER, expr: e, mouthOpen: e === "talk" || e === "laugh" ? 0.7 : 0, sweat: e === "scared" || e === "shock" }} />
      ))}
      {EXPRS.map(([e], i) => (
        <BeanCard key={`a${e}`} position={[-7.2 + i * 2.05, -1.1, 0]} height={2.2} shadow={false} params={{ ...MIMI, expr: e, mouthOpen: e === "talk" || e === "laugh" ? 0.7 : 0, sweat: e === "scared" || e === "shock" }} />
      ))}
      <hemisphereLight args={["#fff8ea", "#b8928a", 1.9]} />
    </ThreeCanvas>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 48, color: "#241726", letterSpacing: 2 }}>
      EKSPRESI · SI FOTOGRAFER / DODI (ATAS) & MIMI / ARA (BAWAH)
    </div>
    {[0, 1].map((r) => (
      <div key={r} style={{ position: "absolute", top: r ? 1100 : 560, left: 120, right: 120, display: "flex", justifyContent: "space-between" }}>
        {EXPRS.map(([, lbl]) => (
          <div key={lbl} style={{ width: 200, textAlign: "center", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 22, color: "#5a2a30" }}>{lbl}</div>
        ))}
      </div>
    ))}
  </AbsoluteFill>
);

/* ---------------- Lembar latar + penampang (rancangan, belum model Blender) ---------------- */
const LATAR: [string, string, string, string][] = [
  ["L1 · Jalan Nice + fasad bank", "siang, hangat; pagi Senin dingin", "#f2c46a",
    "Fasad batu krem bergaya Belle Époque, papan 'BANQUE', jendela berjeruji, jalan berbatu, pohon palem, lampu jalan besi, mobil 1970-an, kafe bertenda, tutup got besi, bendera tiga warna (Bastille Day), merpati, kertas berserakan."],
  ["L2 · Studio foto Si Fotografer", "akrab, lampu meja kuning", "#e8a85a",
    "Meja kayu penuh peta got, kamera tua di tripod, lampu kerja, tali jemuran foto, kotak film, poster, rak berdebu, kursi rotan, asbak, jam dinding, jendela bertirai sorot cahaya."],
  ["L3 · Got bawah kota", "malam, hijau gelap + lentera", "#5e8a5a",
    "Lorong bata melengkung berlumut, air keruh mengalir, pipa berkarat, tangga besi dari lubang jalan, troli/kereta dorong, kabel lampu darurat, tikus, uap tipis, noda & retak."],
  ["L4 · Ruang brankas", "dingin biru + lampu kerja kuning", "#5a7ab0",
    "Pintu brankas bundar raksasa (roda, engsel, baut), dinding laci deposit bernomor, lubang menganga di dinding/lantai + puing beton, meja lipat, alat las & tabung gas, bor, karung, perhiasan & dokumen berserakan, lampu sorot di tripod."],
  ["L5 · Kantor hakim (lantai atas)", "siang, cahaya jendela", "#c9b07a",
    "Meja hakim besar, map berkas, mesin tik, bendera, rak buku hukum, kipas angin, jendela besar terbuka ke jalan; di bawah: mobil diparkir + motor menunggu."],
];
const Cutaway: React.FC = () => (
  <svg width={980} height={1220} viewBox="0 0 980 1220">
    <defs>
      <pattern id="soil" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="#c58a52" /><circle cx="8" cy="10" r="3" fill="#a8703e" /><circle cx="28" cy="26" r="4" fill="#d9a46a" /><circle cx="18" cy="34" r="2" fill="#8a5a32" />
      </pattern>
      <pattern id="brick" width="40" height="20" patternUnits="userSpaceOnUse">
        <rect width="40" height="20" fill="#a6463a" /><path d="M0 0H40M0 10H40M20 0V10M0 10V20M40 10V20" stroke="#5a2a22" strokeWidth="2" />
      </pattern>
    </defs>
    {/* langit + jalan */}
    <rect x="0" y="0" width="980" height="230" fill="#9fd0f0" />
    <rect x="560" y="40" width="380" height="190" fill="#efe0c0" stroke="#1a1a22" strokeWidth="5" />
    <text x="750" y="90" textAnchor="middle" fontFamily="Anton, Impact" fontSize="40" fill="#1a1a22">BANQUE</text>
    {[600, 680, 760, 840].map((x) => <rect key={x} x={x} y={110} width={50} height={80} fill="#5a6a7a" stroke="#1a1a22" strokeWidth="4" />)}
    <rect x="80" y="160" width="150" height="55" rx="14" fill="#d84a3a" stroke="#1a1a22" strokeWidth="5" />
    <circle cx="115" cy="218" r="14" fill="#222" /><circle cx="200" cy="218" r="14" fill="#222" />
    <rect x="0" y="230" width="980" height="34" fill="#4a4a52" />
    <path d="M0 247 H980" stroke="#f2e6a0" strokeWidth="4" strokeDasharray="30 22" />
    <rect x="300" y="226" width="60" height="10" fill="#2a2a2a" />
    {/* lapisan tanah */}
    <rect x="0" y="264" width="980" height="956" fill="url(#soil)" />
    <rect x="0" y="264" width="980" height="40" fill="#8a8a8a" opacity="0.8" />
    <rect x="0" y="700" width="980" height="520" fill="#b07a46" opacity="0.5" />
    {/* lubang tangga got */}
    <rect x="310" y="236" width="40" height="300" fill="#2a2a2a" />
    {[270, 310, 350, 390, 430, 470, 510].map((y) => <rect key={y} x={314} y={y} width={32} height={5} fill="#9a9a9a" />)}
    {/* got bata melengkung */}
    <ellipse cx="250" cy="600" rx="230" ry="95" fill="url(#brick)" stroke="#1a1a22" strokeWidth="6" />
    <ellipse cx="250" cy="600" rx="195" ry="70" fill="#1f2a22" />
    <rect x="70" y="620" width="360" height="40" fill="#4a6a4a" opacity="0.9" />
    <text x="250" y="585" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="26" fill="#cfe6c0">GOT KOTA</text>
    {/* terowongan ~8 m */}
    <path d="M430 600 L770 640 L770 700 L430 660 Z" fill="#3a2414" stroke="#1a1a22" strokeWidth="5" />
    {[480, 560, 640, 720].map((x) => <rect key={x} x={x} y={612 + (x - 430) * 0.12} width={12} height={56} fill="#8a6a3a" stroke="#1a1a22" strokeWidth="3" />)}
    <text x="600" y="745" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="26" fill="#1a1a22">terowongan ±8 m</text>
    {/* tokoh kecil merangkak + ember */}
    <circle cx="560" cy="640" r="13" fill="#f0cfae" stroke="#1a1a22" strokeWidth="3" /><rect x="565" y="640" width="34" height="16" rx="8" fill="#3c4a5c" stroke="#1a1a22" strokeWidth="3" />
    <circle cx="690" cy="655" r="13" fill="#f6dcc0" stroke="#1a1a22" strokeWidth="3" /><rect x="650" y="655" width="34" height="16" rx="8" fill="#5a6a4a" stroke="#1a1a22" strokeWidth="3" />
    <rect x="610" y="652" width="18" height="16" fill="#9a9a9a" stroke="#1a1a22" strokeWidth="3" />
    {/* brankas */}
    <rect x="770" y="470" width="200" height="300" fill="#7a7f8a" stroke="#1a1a22" strokeWidth="6" />
    <rect x="790" y="490" width="160" height="260" fill="#cfd4dc" stroke="#1a1a22" strokeWidth="4" />
    {[0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((k) => <rect key={`${r}${k}`} x={800 + k * 50} y={500 + r * 46} width={42} height={38} fill="#b8a46a" stroke="#1a1a22" strokeWidth="3" />))}
    <polygon points="770,640 800,630 812,672 770,700" fill="#3a2414" stroke="#1a1a22" strokeWidth="4" />
    <text x="870" y="800" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="26" fill="#1a1a22">BRANKAS</text>
    <text x="870" y="828" textAnchor="middle" fontFamily="Inter" fontWeight="600" fontSize="19" fill="#1a1a22">dinding beton</text><text x="870" y="852" textAnchor="middle" fontFamily="Inter" fontWeight="600" fontSize="19" fill="#1a1a22">ditembus</text>
    {/* catatan */}
    <text x="40" y="900" fontFamily="Anton, Impact" fontSize="38" fill="#241726">SHOT PENAMPANG (model Blender khusus)</text>
    <text x="40" y="945" fontFamily="Inter" fontWeight="600" fontSize="23" fill="#241726">• kamera geser kiri→kanan: jalan ramai di atas, got, terowongan, brankas</text>
    <text x="40" y="980" fontFamily="Inter" fontWeight="600" fontSize="23" fill="#241726">• tokoh kecil tampak SAMPING: merangkak, menggali, mengoper ember</text>
    <text x="40" y="1015" fontFamily="Inter" fontWeight="600" fontSize="23" fill="#241726">• mobil & orang lewat di atas tanpa tahu apa-apa (gag)</text>
    <text x="40" y="1050" fontFamily="Inter" fontWeight="600" fontSize="23" fill="#241726">• debu jatuh dari langit-langit tiap mobil lewat</text>
    <text x="40" y="1100" fontFamily="Inter" fontWeight="500" fontSize="19" fill="#5a3a40">(gambar ini rancangan/sketsa susunan; model 3D dibuat setelah disetujui)</text>
  </svg>
);
export const SheetTerowonganLatar: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#efe9dc, #d8c4a6)", fontFamily: "Inter, sans-serif" }}>
    <div style={{ position: "absolute", top: 20, left: 40, fontFamily: "Anton, Impact, sans-serif", fontSize: 50, color: "#241726", letterSpacing: 2 }}>
      LATAR & PROPERTI · "TEROWONGAN KE BRANKAS"
    </div>
    <div style={{ position: "absolute", top: 100, left: 30, border: "5px solid #241726", borderRadius: 18, overflow: "hidden", background: "#fff" }}>
      <Cutaway />
    </div>
    <div style={{ position: "absolute", top: 100, left: 1050, right: 30, display: "flex", flexDirection: "column", gap: 14 }}>
      {LATAR.map(([t, l, c, d]) => (
        <div key={t} style={{ background: "#fffaf0", border: "4px solid #241726", borderRadius: 16, padding: "14px 18px", display: "flex", gap: 16 }}>
          <div style={{ width: 22, minWidth: 22, borderRadius: 8, background: c, border: "3px solid #241726" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 27, color: "#241726" }}>{t}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#991b1b", marginTop: 2 }}>cahaya: {l}</div>
            <div style={{ fontWeight: 500, fontSize: 18, color: "#3a2a30", marginTop: 6, lineHeight: 1.3 }}>{d}</div>
          </div>
        </div>
      ))}
      <div style={{ background: "#241726", color: "#f4ead8", borderRadius: 16, padding: "14px 18px", fontSize: 19, fontWeight: 600, lineHeight: 1.35 }}>
        Benda terpisah (ikut tangan via beanHandWorld): peta got · lentera · sekop · bor listrik · ember tanah · obor las · kuas & kaleng cat · kotak deposit · kalung/perhiasan · borgol · koper kecil
      </div>
    </div>
  </AbsoluteFill>
);

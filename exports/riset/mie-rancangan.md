# Rancangan Produksi: "Masak Mie Instan Jam 2 Pagi, Malah Bikin 'Kebakaran' Kosan 🔥🍜"

- **Gaya Visual:** Karakter `Bean` (*hand-inked* Banjir Molase Boston) + properti & latar 3D kosan Indonesia super padat (`src/three/objectsMie.tsx`).
- **2 Upgrade Utama Khusus Video Ini:**
  1. **Efek Api & Terbakar Realistis (`RealisticFlame3D` + `ScorchedMark3D` + `WaterSplash3D`):** Lidah api runcing berlapis 3 warna (merah-oranye-kuning-putih) yang meliuk dinamis (bukan bola bulat), bara melayang spiral, kepulan asap naik, `<pointLight>` oranye berkedip memantul ke dinding & wajah, serta noda jelaga gosong merambat di ubin keramik & lemari gantung kayu!
  2. **Kamera 3D Sinematik & Berenergi (`orbitCam`, `trackCam`, `whipPan`, `dutchTilt`, `slowMoArc`, `craneUp`):** Mengelilingi karakter & wajan secara nyata di ruang 3D, *low-angle follow* di ketinggian sandal, *close-up insert* tombol kompor & siraman gayung, hingga *crane-up* melingkar di penutup.
- **Format:** Vertikal `1080×1920`, `30 fps`, durasi target ±65–72 detik.
- **Audio:** Pipeline **Kantor di Atas Awan** — **VoxCPM2** gaya bertutur **Dodi** 4-emosi (`narasi`, `santai`, `tegang`, `tegas`) + alignment kata **Whisper** + mix stereo `-14 LUFS` (perut keroncongan, bunyi sandal jepit, cetek kompor, desis minyak panas, *WHOOSH* api menyambar, siraman air gayung + ledakan uap, pintu dobrak beruntun, pad musik komedi & haru/kocak penutup).

---

## 1. Daftar 5 Karakter (`exports/riset/mie-karakter.png`)
1. **Riko (Kamar 01)** — Anak kos sok *chef* tengah malam: kaos oblong biru, celemek kuning dadakan, ekspresi santai/sombong → panik ekstrem saat api menyala.
2. **Bu Tini** — Ibu Kos galak tapi diam-diam lapar: daster batik merah marun + selendang, sanggul, wajah sangar saat mendobrak dapur → langsung kalem & luluh mencium aroma mie goreng.
3. **Mas Bagas (Kamar 02)** — Tetangga gamer begadang: kaos hitam, *headphone* di kepala, bawa HP, langsung syok lihat dapur penuh asap.
4. **Mbak Nisa (Kamar 03)** — Tetangga rajin *skincare*: piyama pink + kerudung instan, heboh panik menyelamatkan diri.
5. **Mas Dedi (Kamar 04)** — Tetangga siaga ronda: kaos putih, sarung diselempangkan, peci miring, kumis, datang bawa gayung.

---

## 2. Daftar Properti 3D & Efek Visual (`exports/riset/mie-properti.png`)
- **Efek Visual Upgrade:** `RealisticFlame3D` (lidah api tajam berlapis + bara + asap + *pointLight* berkedip), `GasBurnerFlame` (api biru kompor gas melingkar), `ScorchedMark3D` (noda gosong hangus merambat di tembok & lemari atas), `WaterSplash3D` (cipratan air gayung 3D).
- **Latar 3D Padat:**
  - *Kamar Kos 01:* Kasur biru, bantal, guling pink, kipas angin berdiri berputar, jam dinding 3D **`02:00`**.
  - *Koridor Kos:* Deretan pintu kamar `01`, `02`, `03`, `04` (bisa terbuka berayun 3D!), sandal jepit di depan pintu, papan aturan `"KOS BU TINI · JAM MALAM 22.00"`.
  - *Dapur Bersama Kos:* Meja keramik biru-putih, kompor gas 2 tungku, tabung gas **LPG 3 kg hijau ("melon")**, kulkas dengan catatan `"JANGAN AMBIL TELOR!"` + galon air, lemari gantung kayu (bisa hangus menghitam!), deretan botol kecap, sambal, minyak goreng.
- **Properti 3D Terpisah (`beanHandWorld`):** `WokPan3D` (wajan + mie + telur mata sapi + cabai), `NoodlePacket3D` (*Mie Goreng Jumbo*), `Spatula3D` (sodet), `Gayung3D` (gayung biru berisi air), `WetTowel3D` (handuk basah pemadam), `NoodleBowl3D` (**Mangkok Ayam Jago** + sumpit + uap panas).

---

## 3. Daftar 8 Adegan, Gerakan Fisik (*Action Beats*) & Kamera 3D Sinematik

1. **Adegan 1 — Hook: Perut Keroncongan Jam 02:00 (`~7 dtk`)**
   - **Kamera 3D:** *Push-in* cepat dari jam dinding `02:00` → **orbit 55°** mengelilingi Riko yang meringkuk di kasur biru + kipas angin berputar → *dolly-out* saat Riko bangkit menyalakan HP.
   - **Gerakan Fisik:** Riko menggeliat memegangi perut (`0-55f`) → duduk kaget dengan mata melotot lapar (`55-95f`) → meraih **Bungkus Mie Goreng 3D** di samping bantal (`95-155f`) → berdiri mengendap menuju pintu (`155-end`).
2. **Adegan 2 — Operasi Senyap di Koridor Kos (`~8 dtk`)**
   - **Kamera 3D:** **Low-angle tracking follow** menyusuri deretan pintu `01` → `02` → `03` → papan `"JAM MALAM 22.00"`, lalu **orbit cepat ke samping** saat Riko menoleh cemas ke pintu Bu Tini!
   - **Gerakan Fisik:** Riko berjalan jinjit pelan (`0-95f`) → berhenti mematung sambil menempelkan jari ke bibir saat melintasi kamar `02` & `03` (`95-145f`) → melesat masuk dapur (`145-end`).
3. **Adegan 3 — Masuk Dapur & Gaya Sok Chef (*Flambé* Berlebihan) (`~10 dtk`)**
   - **Kamera 3D:** **Hero orbit 120°** mengelilingi dapur kos yang padat (LPG melon, kulkas `"JANGAN AMBIL TELOR!"`, kompor) → *zoom-in* ke knop kompor menyala (api biru muncul!) → *orbit* naik saat Riko menggoyang **Wajan 3D** & **Sodet 3D** dengan gaya sombong!
   - **Gerakan Fisik:** Riko menaruh wajan & memutar knop kompor (`0-65f`) → api biru menyala (`65f`) → menuang minyak terlalu banyak & melempar mie dengan gaya chef sombong (`70-180f`) → memiringkan wajan sok *flambé* (`180-end`).
4. **Adegan 4 — Api Tajam Menyambar & Lemari Mulai Gosong! (`~8 dtk`)**
   - **Kamera 3D:** **Dramatic low-angle push-in** di bibir wajan menghadap ke atas (terasa tinggi apinya!) + **dutch tilt** `-8°` saat lidah api membesar, lalu *pull-back* cepat menampakkan asap & lemari gantung mulai gosong menghitam!
   - **Gerakan Fisik:** **Lidah api 3D tajam berlapis** menyambar tinggi dari wajan (`25-110f`) → bara berhamburan & `ScorchedMark3D` mulai menghitamkan keramik & lemari gantung kayu (`80-end`) → Riko menjatuhkan sodet & mundur panik keringatan (`90-end`).
5. **Adegan 5 — Blunder Fatal: Siram Pakai Gayung Air! (`~9 dtk`)**
   - **Kamera 3D:** **Fast tracking follow** mengikuti Riko menyambar **Gayung Biru 3D** → **slow-motion arc orbit** saat air melengkung jatuh ke wajan → **BOOM!** *camera shake* kuat + *whip pull-back* saat semburan lidah api raksasa menjulang hampir menyentuh plafon!
   - **Gerakan Fisik:** Riko berlari mengambil gayung (`0-65f`) → mengayun & menyiramkan air (`WaterSplash3D`, `65-115f`) → api minyak meledak 3× lebih tinggi + asap mengepul tebal + lemari atas hangus penuh jelaga (`115-end`).
6. **Adegan 6 — Satu Kosan Panik & Kedatangan Bu Tini (`~8 dtk`)**
   - **Kamera 3D:** **Whip-pan dinamis** sepanjang koridor mengikuti pintu `02`, `03`, `04` yang terbuka beruntun → **dramatic low-angle zoom-in** pada siluet Bu Tini yang murka melangkah masuk dapur!
   - **Gerakan Fisik:** Pintu `02` (Mas Bagas + headphone), `03` (Mbak Nisa), `04` (Mas Dedi bawa gayung) terbuka satu per satu (`10-120f`) → mereka berlari heboh ke arah asap → Bu Tini mendobrak masuk dengan **Handuk Basah 3D** di tangan & ekspresi super sangar (`130-end`).
7. **Adegan 7 — Jurus Pro Bu Tini & Plot Twist Aroma Mie (`~9 dtk`)**
   - **Kamera 3D:** **Tracking arc** mengikuti **Handuk Basah 3D** melayang dari tangan Bu Tini tepat menutup wajan → *orbit* lembut ke wajah Bu Tini yang berubah dari murka menjadi melongo menikmati kepulan aroma mie!
   - **Gerakan Fisik:** Bu Tini mengayun & melempar handuk basah (`25-75f`) → api seketika padam berganti kepulan uap putih harum (`75-120f`) → Riko & penghuni kos gemetar ketakutan (`110-165f`) → Bu Tini mengendus udara, matanya berbinar (`165-end`).
8. **Adegan 8 — Penutup Kocak: Makan Bareng Jam 2 Pagi (`~8 dtk`)**
   - **Kamera 3D:** **Warm crane-up & orbit** melingkar di dapur yang lemari atasnya masih ada bekas gosong — memperlihatkan semua orang (Bu Tini, Riko, Bagas, Nisa, Dedi) lahap menyantap **Mangkok Ayam Jago 3D** beruap hangat!
   - **Gerakan Fisik:** Semua mengangkat mangkok / mengangguk nikmat (`0-120f`) → Bu Tini menunjuk lemari gosong sambil senyum santai (*"Besok cat ulang ya, Riko... tambah telor satu lagi!"*) → Riko mengangguk pasrah lega (`120-end`).

# Rancangan Produksi: "Bandung Lautan Api (23–24 Maret 1946)"

- **Gaya Visual:** Karakter `Bean` (*hand-inked* Banjir Molase Boston di `src/three/objectsBean.tsx`) + atribut tempur lengkap, dipadukan latar & properti 3D bertekstur *ink-outline* (`objectsBandung.tsx` + `objectsMolase.tsx`), kamera 3D dinamis (`shotCam` + `Rig` + `kick`), dan pencahayaan/vignette sinematik (`Grade`).
- **Format:** Vertikal `1080×1920`, `30 fps`, durasi target ±60–70 detik.
- **Audio:** Suara multi-emosi (Mak Ijah / VoxCPM2) + SFX per aksi (pesawat, langkah berbaris, api berkobar, telepon lapangan, sorot lampu, ledakan Dayeuhkolot) + BGM ducking.

---

## 1. Riset Fakta Sejarah
- **Tanggal:** 23–24 Maret 1946 di Bandung Selatan.
- **Pemicu:** Ultimatum kedua Sekutu/Inggris (23 Maret 1946) memerintahkan TRI dan rakyat mengosongkan Bandung Selatan paling lambat pukul 24.00 (7 jam).
- **Strategi Bumi Hangus:** Kolonel A.H. Nasution (Komandan Divisi III TRI) bersama rakyat memutuskan mengungsi sambil membakar bangunan sendiri agar Bandung tidak dijadikan markas militer Sekutu. Sekitar **200.000 warga** membakar rumah mereka — membentuk lautan api sepanjang **11 km**.
- **Aksi Heroik Dayeuhkolot:** Mohammad Toha & Ramdan menyusup ke **Gudang Mesiu Sekutu di Dayeuhkolot** (berisi ~18.000 ton bahan peledak) dan meledakkannya pada 24 Maret 1946 agar senjata itu tidak digunakan menyerang rakyat.

---

## 2. Daftar 6 Karakter (`exports/riset/bandung-karakter.png`)
1. **Mohammad Toha** — Pejuang muda BRI: ikat kepala Merah Putih, seragam tempur khaki, sabuk peluru silang (*bandolier*), tas amunisi pinggang, ransel, ban lengan Merah Putih, sepatu bot + pembalut betis, corengan jelaga perang, membawa dinamit 3D.
2. **Ramdan** — Pejuang TRI (rekan Toha): helm baja Tipe 90 berlencana Merah Putih, seragam tempur, sabuk peluru, ransel, ban lengan Merah Putih, bot, membawa senapan Arisaka bersangkur.
3. **Kolonel A.H. Nasution** — Komandan Divisi III TRI: topi perwira, seragam khaki berdasi, medali & tanda pangkat bahu, ikat pinggang kulit ber-gesper emas, bot kulit.
4. **Tentara Sekutu / Inggris** — Penjaga gudang: helm baja *Brodie*, seragam zaitun Inggris, sabuk webbing & tas peluru, kumis, bot berat, senapan Lee-Enfield.
5. **Ibu Pengungsi Bandung** — Warga Bandung Selatan: kebaya merah tua, kain batik, selendang, sanggul, membawa obor kayu menyala.
6. **Relawan Palang Merah** — Medis garis depan: blus putih, *kerchief*, ban lengan Palang Merah, tas P3K.

---

## 3. Daftar 8 Adegan & Action Beats (Gerakan Fisik)

1. **Adegan 1 — Hook: Bandung Membara (`~7 dtk`)**
   - **Latar:** Jalan Braga & Gedung Sate di kejauhan; cakrawala Bandung Selatan berkobar api 3D berlapis.
   - **Kamera 3D:** *Push-in* pelan menembus asap dari *wide* Gedung Sate ke barikade depan (`fov 40 -> 34`).
   - **Gerakan:** Mohammad Toha & Ramdan berlari kecil menuju barikade (`0-50f`) → berhenti menghadap kobaran api (`50-90f`) → Toha mengepalkan tangan + ekspresi tegas (`90-140f`). Kartu info: `BANDUNG · 23 MARET 1946`.
2. **Adegan 2 — Ultimatum Sekutu dari Udara (`~8 dtk`)**
   - **Latar:** Jalan kolonial Bandung + Tank Sherman Sekutu melaju di kejauhan + Pesawat Sekutu melintas di langit.
   - **Kamera 3D:** *Tilt down* mengikuti pesawat tempur menukik → *pan* ke kertas ultimatum yang jatuh dan dipungut warga.
   - **Gerakan:** Pesawat Sekutu melintas (`0-90f`) → puluhan selebaran kertas jatuh berputar (`30-130f`) → Ramdan membungkuk memungut kertas ultimatum 3D (`110-160f`) → ekspresi kaget & marah (`160-210f`). Kartu info: `ULTIMATUM · 7 JAM`.
3. **Adegan 3 — Keputusan Berat di Markas TRI (`~9 dtk`)**
   - **Latar:** Ruangan Pos Markas Divisi III TRI (peta strategi Bandung Selatan di dinding, meja komando, telepon engkol, lampu gantung, bendera Merah Putih).
   - **Kamera 3D:** *Orbit* lembut mengelilingi meja komando → *push-in* ke wajah Kolonel Nasution lalu *pull-back* ke Peta Bandung.
   - **Gerakan:** Ramdan berjalan masuk menyerahkan surat ultimatum (`0-45f`) → tangan Nasution terulur menerima surat (`45-70f`) → Nasution menaruh surat di meja & menunjuk garis merah Bandung Selatan di peta (`85-160f`) → memberi perintah tegas (`160-240f`).
4. **Adegan 4 — 200.000 Warga Membakar Rumahnya Sendiri (`~10 dtk`)**
   - **Latar:** Deretan rumah kolonial Bandung Selatan + gerobak pengungsi penuh koper/kasur + lampu jalan.
   - **Kamera 3D:** *Tracking dolly* menyusuri jalanan penuh warga mengungsi → *close-up insert* tangan menyulut obor ke kusen rumah → *pull-back* rumah mulai berkobar.
   - **Gerakan:** Ibu Pengungsi menoleh sedih ke rumahnya (`0-55f`) → mengangkat obor menyala dengan tangan kanan (`55-95f`) → menyentuhkan obor ke teras (`95-130f`) → api 3D menjalar ke atap (`130-210f`) → berjalan mendorong gerobak pengungsi dibantu Relawan Palang Merah (`210-290f`). Kartu info: `200.000 WARGA · 11 KM API`.
5. **Adegan 5 — Misi Rahasia: Gudang Mesiu Dayeuhkolot (`~8 dtk`)**
   - **Latar:** Luar Gudang Mesiu raksasa (`DANGER · AMMO DEPOT`), menara jaga dengan sorotan lampu 3D menyapu malam, barikade karung pasir.
   - **Kamera 3D:** *Low-angle sweep* melewati lampu sorot menara jaga → *zoom* ke Toha & Ramdan mengendap di balik barikade.
   - **Gerakan:** Tentara Sekutu berpatroli bolak-balik (`0-220f`) → sorotan lampu menyapu kiri-kanan (`0-220f`) → Toha & Ramdan merunduk saat lampu lewat (`40-110f`), lalu bergegas menyusup mendekati pintu samping gudang (`120-210f`).
6. **Adegan 6 — Menyusup & Menyalakan Dinamit (`~9 dtk`)**
   - **Latar:** Dalam Gudang Mesiu penuh tumpukan peti `TNT` dan peluru artileri kuningan.
   - **Kamera 3D:** *Push-in* dramatis ke tumpukan TNT → *close-up* tangan Toha meletakkan bundel dinamit 3D & menyalakan sumbunya (`lit=true`).
   - **Gerakan:** Toha melangkah cepat ke tumpukan peti TNT (`0-55f`) → meletakkan dinamit 3D dari tangannya ke atas peti (`55-95f`) → menyalakan sumbu percikan api (`95-140f`) → menoleh tenang sambil memberi isyarat Ramdan mundur (`140-230f`).
7. **Adegan 7 — Ledakan Dahsyat Dayeuhkolot (`~7 dtk`)**
   - **Latar:** Eksterior Gudang Mesiu Dayeuhkolot di malam hari.
   - **Kamera 3D:** *Pull-back* cepat + *camera shake* kuat (`kick`) + *white flash* saat gudang meledak!
   - **Gerakan:** Sorotan lampu berhenti kaget (`0-35f`) → Tentara Sekutu menjatuhkan senapan & berlari (`35-70f`) → gelombang api 3D raksasa & asap membumbung meluluhlantakkan gudang (`70-190f`). Kartu info: `18.000 TON MESIU HANCUR`.
8. **Adegan 8 — Penutup: Langit Fajar Bandung (`~7 dtk`)**
   - **Latar:** Panorama Bandung Selatan saat fajar kemerahan, siluet Gedung Sate, bendera Merah Putih tetap berkibar gagah di atas barikade.
   - **Kamera 3D:** *Crane up* perlahan ke arah bendera Merah Putih & langit fajar.
   - **Gerakan:** Barisan warga & pejuang berdiri tegap memandang fajar, bendera Merah Putih berkibar tenang. Kartu penutup: `BANDUNG LAUTAN API · 1946`.

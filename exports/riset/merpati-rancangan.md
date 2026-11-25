# Rancangan Produksi: "Rudal Merpati 1944 (Project Pigeon)"

- **Gaya visual:** tokoh `BeanCard` 2D (gaya **Bom Kelelawar 1943** / Bandung) di dunia 3D bergaris tinta 360°-aman (`InkBox`, `P`), merpati pilot 2D (`PigeonCard`), properti baru di `src/three/objectsMerpati.tsx`.
- **Gaya pergerakan kamera:** koreografi dinamis **ala `@RicksClips3000`** ([referensi YouTube Shorts `aD73kaL_PtY`](https://youtube.com/shorts/aD73kaL_PtY)):
  1. **Ritme ~56 camera beats/menit (2,0–3,5 dtk per shot)** yang **terikat ke kata pemicu narasi** (bukan timer kaku) dan tanpa satu pun shot statis.
  2. **6 Jurus Kamera Khas:** ① *Crane-Down Establish* sudut tinggi (FOV lebar 46–50°), ② *Low-Angle Hero Push-In* (FOV 34–38°), ③ *Over-The-Shoulder (OTS) / Through-Glass* menembus kaca jendela & lensa moncong rudal, ④ *ECU Snap-Zoom* (0,20 dtk) pada aksi mikro patukan + *Insert SVG* tangan besar, ⑤ *Whip-Pan 0,28 dtk (8–9 frame) + Slight Roll (±3,5°)* saat tektokan dialog Dodi ↔ Ara, dan ⑥ **Vertigo Dolly-Zoom + Dutch Tilt** (kamera mundur sambil FOV menyempit) pada klimaks bencana jagung & murkanya Pak Jenderal!
- **Format:** vertikal 1080×1920, 30 fps, target ±65–75 detik, caption 1–2 kata berwarna per pembicara (`dodi` putih, `ara` pink `#ffd6ea`, highlight kuning `#ffd23f`).
- **Suara:** **dialog favorit Dodi ↔ Ara** (`dodi` + `ara` dari `voices/pengisi_suara.json`, via `scripts/voice_vox.py` VoxCPM2) + sedikit narasi Dodi di pembuka & penutup.
- **Lembar persetujuan:** `merpati-karakter.png`, `merpati-ekspresi.png`, `merpati-properti.png`.

---

## 1. Riset Fakta Sejarah (dengan Sumber)
- **Penggagas:** **B. F. Skinner** (psikolog perilaku terkenal AS, pelopor *operant conditioning*). Tahun 1940 saat naik kereta melintasi Minnesota, ia melihat kawanan burung bermanuver serempak di samping gerbong dan membayangkan mereka sebagai *"alat penglihatan dan kendali peluru kendali"*. ([Wikipedia: Project Pigeon](https://en.wikipedia.org/wiki/Project_Pigeon), [Skinner 1960, *Pigeons in a Pelican*, American Psychologist](https://psycnet.apa.org/record/1960-05092-001)).
- **Pendanaan & Markas:** Awalnya ditolak militer, lalu didanai pabrik tepung **General Mills** di Minneapolis (\$5.000, dilatih di lantai atas gedung pabrik tepung!) sebelum **National Defense Research Committee (NDRC)** mengucurkan **\$25.000** pada Juni 1943 untuk memandu bom luncur **Pelican** (*Pelican glide bomb*). ([Smithsonian National Museum of American History](https://americanhistory.si.edu/collections/object/nmah_692462), [MiGFlug](https://migflug.com/afterburner/project-pigeon-skinner-guided-bomb/)).
- **Cara Kerja "Demokrasi 3 Merpati":** Di dalam moncong bom luncur **Pelican**, dipasang **3 lensa optik** yang memproyeksikan gambar kapal target ke **3 layar kaca buram** di hadapan **3 ekor merpati berompi (*harness*)**. Merpati dilatih dengan hadiah biji jagung untuk mematuk gambar kapal tepat di tengah layar (rekor uji nyata: **lebih dari 10.000 patukan dalam 45 menit** tanpa henti!). Bila sasaran bergeser ke tepi layar, patukan merpati menggerakkan katup/kabel kemudi sirip bom berdasarkan **suara mayoritas (2 dari 3 merpati)** agar satu burung yang meleng kalah voting.
- **Akhir Proyek & Warisan:** Meski uji simulator sukses, para petinggi militer enggan mempercayakan bom sungguhan pada burung hidup (*"Masalah kami adalah tidak ada yang menganggap kami serius"* — Skinner). Proyek dihentikan **8 Oktober 1944** karena militer memprioritaskan **radar** (sempat dihidupkan lagi Angkatan Laut AS sebagai *Project Orcon* 1948–1953, dan tahun **2024** Skinner dianugerahi **Ig Nobel Peace Prize**).
- **Dramatisasi Komedi:** Sersan Dodi, Kopral Ara, dan Pak Jenderal adalah tokoh fiktif. Adegan uji lapangan saat kantong jagung Ara tumpah di dekat truk kantin Jenderal (sehingga 3 merpati kompak *voting* 3–0 belok ke jagung!) ditampilkan sebagai komedi visual tanpa diklaim sebagai fakta sejarah.

---

## 2. Karakter
| Tokoh | Suara | Penampilan | Ekspresi dipakai |
|---|---|---|---|
| Sersan Dodi (pria) | `dodi` | seragam zaitun AS, topi lapangan, sabuk & kantong, bot | sok yakin, bicara, senang, kaget, takut |
| Kopral Ara (wanita, WAC) | `ara` | seragam zaitun, rok, dasi, rambut disanggul, bot, bawa kantong jagung 3D | biasa, bicara, senang, mikir, cemas, kaget |
| Prof. B.F. Skinner (figuran) | – | jas putih peneliti, dasi merah tua, papan catatan | mikir, kaget, senang |
| Pak Jenderal (figuran fiktif) | – | topi perwira, medali dada, kumis tebal, bot kulit | biasa, kaget, marah |
| Skuadron 3 Merpati (`PigeonCard`) | – | merpati abu-abu kebiruan, rompi sabuk Pelican, kacamata pilot mini | fokus, senang, lapar (+ jagung di paruh), sok yakin, kaget |

---

## 3. Latar 3D (360°-Aman untuk Orbit & Whip-Pan) & Properti
1. **Kereta & Pabrik Tepung Minnesota (1940, senja):** gerbong kereta hijau Pullman 1940-an di atas rel panjang, silo gandum & gedung pabrik tepung Minneapolis, bangku stasiun, kawanan merpati bermanuver serempak.
2. **Lab Proyek Merpati (lantai atas pabrik tepung, 3 dinding bertekstur penuh):** kotak latih patuk Skinner (layar proyeksi kapal + lampu hijau + corong jagung), meja kendali penghitung `10.000 PATUKAN` + toples jagung + berkas `PROJECT PIGEON · $25,000`, moncong bom Pelican 3-layar terbelah (*cutaway*), karung tepung, peta & papan rahasia, lampu gantung.
3. **Lapangan Uji Simulasi NDRC (Oktober 1944, siang cerah):** menara gantungan ayun (*gimbal test rig*) dengan bom luncur bersayap **Pelican** + papan indikator voting `SUARA 3-0`, papan target kapal di atas rel uji, truk kantin militer `JAGUNG JENDERAL`, karung jagung tumpah, dan perangkat **Radar Elektronik 1944** berpiringan putar.

---

## 4. Naskah + 8 Adegan + Koreografi Kamera `@RicksClips3000` + Action Beats
Format baris: `[suara · gaya] kalimat utuh`. Semua angka ditulis huruf di JSON suara.

### Adegan 1 — Hook (±6 dtk) · Langit & Lapangan Uji Rudal
- `[dodi · narasi]` Sebelum ada komputer dan GPS, Amerika pernah memasang pilot hidup di dalam moncong peluru kendali...
- `[dodi · santai]` seekor burung merpati.
- **Kamera (`@RicksClips3000`):** **Tracking Sweep cepat** sejajar badan bom luncur Pelican yang meluncur di udara (FOV 46°) → tepat sebelum kata *"merpati"*, **ECU Snap-Zoom (7 frame)** menembus kaca lensa moncong memperlihatkan merpati berompi & berkacamata pilot sedang mematuk kaca `TOK! TOK!` → *pull-back* sedikit saat `BigTitle` **RUDAL MERPATI · 1944** memantul turun.
- **Action Beats:** bom Pelican bergoyang membelok (0–75f) → kamera menembus jendela lensa, merpati menoleh ke kamera & menyeringai *smug* lalu mematuk kaca dua kali tepat sebelum kata *"merpati"* (75–125f) → judul besar muncul (125–180f).

### Adegan 2 — Ide di Kereta Minnesota (±7 dtk) · Gerbong Kereta & Pabrik Tepung (1940)
- `[dodi · narasi]` Idenya muncul saat seorang psikolog melihat kawanan merpati bermanuver rapi di samping kereta, lalu melatih mereka di loteng pabrik tepung.
- **Kamera (`@RicksClips3000`):** **Crane-Down Establish** dari langit senja menyusuri gerbong kereta & silo pabrik tepung (FOV 48° → 40°) → **Through-Glass Shot** menembus jendela kereta ke wajah Prof. Skinner → *orbit* ringan mengikuti tangannya menunjuk kawanan burung.
- **Action Beats:** kawanan `PigeonFlock` terbang berbelok serempak di atas rel (0–210f) → Prof. Skinner di samping gerbong mendongak kaget `!!` (35–85f) → mengangkat tangan menunjuk kawanan burung, wajah berubah senang (85–145f) → bohlam ide 3D memantul di atas kepalanya (145–210f).

### Adegan 3 — Latihan 10.000 Patukan! (±10 dtk) · Lab Proyek Merpati
- `[dodi · tegas]` Ara, kenalkan pilot terbaik kita! Sekali lihat gambar kapal, dia patuk sepuluh ribu kali tanpa capek!
- `[ara · santai]` Lah, bayar gajinya pakai apa, Sersan?
- `[dodi · santai]` Cukup satu biji jagung! Murah, rajin, dan nggak pernah minta cuti!
- **Kamera (`@RicksClips3000`):** **Low-Angle Hero Push-In** ke Dodi di samping `SkinnerBox` (FOV 36°) → **Whip-Pan 8 frame (`roll +3.5°`)** ke Ara yang memegang papan catatan & kantong jagung 3D → **ECU Snap-Zoom + Insert SVG Tangan** saat memberi jagung & merpati mematuk layar → *pull-back* ke *two-shot* bertingkat.
- **Action Beats:** merpati di dalam `SkinnerBox` mematuk siluet kapal cepat-cepat sambil penghitung meja berkedip `10.000 PATUKAN!` (0–85f) → Ara memiringkan kepala mikir sebelum *"gajinya"* (85–140f) → **Insert SVG Close-Up (40f / 1,3 dtk):** tangan Dodi menjatuhkan sebutir jagung kuning ke corong & paruh merpati mematuk layar kapal `TOK! TOK!` → kembali ke *two-shot*, Dodi berkacak pinggang bangga pada *"minta cuti!"* (akhir).

### Adegan 4 — Demokrasi 3 Merpati (X-Ray) (±10 dtk) · Lab & Hologram X-Ray `BlueGrid`
- `[ara · santai]` Tapi Sersan, kalau di jalan satu merpatinya ngantuk atau meleng gimana?
- `[dodi · narasi]` Tenang! Di dalam moncong rudal kita pasang tiga merpati sekaligus pakai sistem pemungutan suara!
- `[dodi · tegas]` Kalau dua patuk ke kiri dan satu meleng ke kanan, rudalnya tetap ikut suara terbanyak!
- **Kamera (`@RicksClips3000`):** **OTS (Over-The-Shoulder)** dari balik bahu Ara ke moncong `PelicanNoseCone` terbuka → *snap* masuk ke **Panggung X-Ray `BlueGrid` 3D** mengorbit 120° mengelilingi moncong transparan berisi 3 kabin merpati → *pull-back* kembali ke Dodi & Ara.
- **Action Beats:** Ara menunjuk moncong terbuka dengan ekspresi cemas (0–75f) → mode X-Ray menyala: kubah moncong membelah memperlihatkan 3 merpati di depan 3 layar (75–180f) → Merpati #1 & #2 kompak mematuk kiri (`✓`, `✓` hijau) sedangkan Merpati #3 meleng kanan (`✗` merah), panah kemudi besar membelok mantap ke kiri + `Stamp` **MENANG VOTING 2–1!** (180–280f).

### Adegan 5 — Pameran di Depan Jenderal (±8 dtk) · Lapangan Uji NDRC
- `[dodi · narasi]` Oktober sembilan belas empat puluh empat, sistem ini diuji di depan komite jenderal.
- `[ara · bisik]` Sersan... merpatinya belum sarapan, ini aku bawain jagung hangat.
- `[dodi · tegang]` Hus! Simpan dulu kantong jagungnya, Ara!
- **Kamera (`@RicksClips3000`):** **Establish Crane-Down** dari atas menara uji `PelicanRig` ke lapangan uji, papan target kapal, & Pak Jenderal yang bersedekap skeptis (FOV 48° → 38°) → **OTS Close-Up** ke Ara yang mengintip `CornBag3D` di tangannya → **Whip-Pan 8 frame (`roll -3.5°`)** ke Dodi yang melotot panik berbisik.
- **Action Beats:** Pak Jenderal berdiri bersedekap memicingkan mata di dekat meja penguji (0–70f) → Ara melangkah pelan sambil memegang `CornBag3D` dengan kedua tangan mengikuti `beanHandWorld` (70–150f) → Dodi menoleh cepat, keringat dingin muncul sebelum *"Hus!"*, tangan menjulur mau menahan kantong jagung (150–230f).

### Adegan 6 — Kantong Jagung Tumpah! (±8 dtk) · Lapangan Uji, Dekat Truk Kantin
- `[ara · tegang]` Eh, licin, Sersan... tumpah ke truk kantin!
- `[dodi · tegang]` Waduh! Ketiga lensanya langsung nyorot jagung!
- **Kamera (`@RicksClips3000`):** **ECU Insert SVG (34f)** tangan Ara & Dodi berebut kantong kertas sampai robek dan biji jagung emas berhamburan → **Tracking Drop** mengikuti butir jagung jatuh bergulir ke dekat `CanteenTruck` Jenderal → **Snap-Zoom** ke 3 lensa depan bom Pelican yang serempak memutar fokus kuning menyala!
- **Action Beats:** tarik-menarik kecil antara Dodi & Ara (0–20f) → **Insert SVG Close-Up:** kantong kertas robek `KRETEK!`, biji jagung berhamburan (20–54f) → `CornScatter3D` berserakan di depan truk kantin Jenderal (54–120f) → di dalam moncong `PelicanNoseCone`, mata ke-3 merpati berubah kuning lapar (`hungry`) memandang jagung & mulai mematuk gila-gilaan (120–230f).

### Adegan 7 — Klimaks Voting 3–0 Serbu Jagung! (±10 dtk) · Lapangan Uji (Klimaks)
- `[ara · tegang]` Sersan! Ketiganya kompak voting tiga kosong ke arah panci jenderal!
- `[dodi · tegang]` Jangan matuk situ! Itu makan siang Pak Jenderal!
- **Kamera (`@RicksClips3000`):** **Whip-Track cepat** mengikuti ayunan tajam bom Pelican di menara uji dari papan kapal langsung berbelok ke arah `CanteenTruck` → **Jurus #6 `@RicksClips3000`: Vertigo Dolly-Zoom + Dutch Tilt (`roll -5°`, kamera mundur sambil FOV menyempit 46° → 28°!)** tepat ke wajah Pak Jenderal yang merah padam saat kawanan merpati menyerbu panci jagungnya!
- **Action Beats:** papan indikator di atas rig berubah merah **`SUARA 3-0: JAGUNG!!`** & moncong Pelican membanting miring ke arah truk kantin (0–75f) → Dodi berlari (`beanWalk` cepat) melambaikan dua tangan mencoba menghalangi lensa (75–155f) → kawanan merpati lepas menyerbu ember jagung truk kantin, biji jagung berterbangan (155–225f) → Pak Jenderal melompat kaget, kumis bergetar marah di tengah efek *Vertigo Dolly-Zoom* + `Stamp` **SALAH SASARAN!** (225–295f).

### Adegan 8 — Digantikan Radar & Ig Nobel (±9 dtk) · Lapangan Uji Sore + Radar 1944
- `[dodi · narasi]` Proyek Merpati akhirnya dibatalkan tahun itu juga, karena militer lebih memilih radar elektronik yang tidak doyan jagung.
- `[ara · santai]` Tapi delapan puluh tahun kemudian, penemunya malah dapat penghargaan Ig Nobel lho, Sersan!
- `[dodi · santai]` Iya... pialanya buat profesor, jagungnya habis buat mereka.
- **Kamera (`@RicksClips3000`):** **Crane Glide tenang** dari piringan `RadarSet1944` yang berputar mulus ke *two-shot* Dodi & Ara (FOV 40° → 35°) → di kalimat terakhir, **Slow Push-In + Slight Roll (`-3°`)** ke atas topi Dodi saat seekor merpati berompi mendarat santai sambil mengunyah jagung!
- **Action Beats:** piringan `RadarSet1944` berputar dengan layar hijau menyala + `Stamp` **DIGANTI RADAR · 1944** (0–90f) → Ara menoleh ceria ke Dodi sambil menunjuk ke atas pada kata *"Ig Nobel"* (90–175f) → Dodi menghela napas pasrah (`sigh`, bahu turun) pada *"Iya..."* (175–215f) → `PigeonCard` mendarat tepat di atas topi Dodi dengan biji jagung di paruh & ekspresi *smug* tepat di kata *"mereka"* (215–265f).

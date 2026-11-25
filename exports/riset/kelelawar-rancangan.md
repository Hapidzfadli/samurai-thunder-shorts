# Rancangan Produksi: "Bom Kelelawar 1943"

- **Gaya visual:** tokoh `BeanCard` 2D (gaya Bandung/Banjir Molase) di dunia 3D bergaris tinta, kelelawar 2D baru (`BatCard`), properti baru di `src/three/objectsKelelawar.tsx`.
- **Format:** vertikal 1080×1920, 30 fps, target ±60 detik, subtitle 1 kata.
- **Suara:** **dialog Dodi ↔ Ara** + sedikit narasi (Dodi) di pembuka & penutup. Suara `dodi` dan `ara` dari `voices/pengisi_suara.json`.
- **Lembar:** `kelelawar-karakter.png`, `kelelawar-ekspresi.png`, `kelelawar-properti.png`.

---

## 1. Riset fakta (dengan sumber)
- **Penggagas:** Lytle S. Adams, dokter gigi dari Pennsylvania. Idenya muncul setelah melihat jutaan kelelawar keluar dari Gua Carlsbad, New Mexico, sekitar serangan Pearl Harbor (Des 1941). [PubMed](https://pubmed.ncbi.nlm.nih.gov/15666497/), [Wikipedia](https://en.wikipedia.org/wiki/Bat_bomb)
- **Cara kerja:** kelelawar ekor bebas Meksiko diberi tabung bakar kecil, **didinginkan sampai hibernasi**, dimasukkan ke casing bom berbaki, dijatuhkan dari pesawat; saat hangat mereka bangun dan bersembunyi di atap/loteng. [Air & Space Forces](https://www.airandspaceforces.com/article/1090bat/), [Stars and Stripes](https://www.stripes.com/history/2021-10-05/bat-bombs-new-mexico-tests-project-x-ray-3137452.html)
- **Kecelakaan:** **15 Mei 1943**, kelelawar bersenjata tidak sengaja lepas di Pangkalan Udara Bantu Carlsbad, bersembunyi di bawah **tangki bahan bakar**, dan membakar area uji. [Wikipedia](https://en.wikipedia.org/wiki/Bat_bomb), [NPS](https://www.nps.gov/articles/batbombsandballoons.htm), [Task & Purpose](https://taskandpurpose.com/history/bat-bombs-burned-base/)
- **Mobil jenderal ikut terbakar:** hanya dari satu sumber → ditampilkan sebagai lelucon visual, **tidak** diucapkan sebagai fakta.
- **Akhir:** proyek dipindah ke Angkatan Laut (Project X-Ray), lalu **dibatalkan 1944**; bom atom lebih diprioritaskan. Biaya sering disebut ±2 juta dolar.
- **Dramatisasi:** Sersan Dodi & Kopral Ara adalah tokoh fiktif. Pintu kandang dibuka Ara adalah versi komedi dari "tidak sengaja lepas".

## 2. Karakter
| Tokoh | Suara | Penampilan | Ekspresi dipakai |
|---|---|---|---|
| Sersan Dodi (pria) | dodi | seragam zaitun AS, topi lapangan, sabuk & kantong, bot | sok yakin, bicara, senang, kaget, takut |
| Kopral Ara (wanita, WAC) | ara | seragam zaitun, rok, dasi, rambut disanggul, bot, papan catatan | mikir, bicara, senang, cemas, kaget |
| Dr. Adams (figuran) | – | jas putih dokter, dasi biru, uban | senang |
| Pak Jenderal (figuran fiktif) | – | topi perwira, medali, kumis | marah, kaget |
| Kelelawar | – | kartu 2D, tabung bakar di perut | senang, licik, kaget, beku |

## 3. Latar & properti
1. **Gua Carlsbad (senja):** mulut gua bertebing bergaris, stalaktit, papan nama, mesa merah, kaktus, kawanan kelelawar, sedan 1940-an.
2. **Lab proyek rahasia:** kulkas hibernasi (rak baki + kelelawar beku + "JANGAN DIBUKA!"), meja lab (tabung bakar, map PROYEK X-RAY, lampu), bom wadah kelelawar (casing terbelah), dinding papan + peta + lampu gantung.
3. **Pangkalan Udara Carlsbad (siang terik → kebakaran):** hangar Quonset, tangki BBM berkaki, landasan, mobil dinas jenderal, kandang kelelawar, kaktus & mesa di kejauhan.

---

## 4. Naskah + adegan + daftar gerakan
Format baris: `[suara · gaya] kalimat`. Durasi adalah perkiraan; jadwal pasti mengikuti audio.

### Adegan 1 — Hook (±5 dtk) · langit senja gurun
- `[dodi · narasi]` Tahun sembilan belas empat puluh tiga, Amerika membuat bom rahasia...
- `[dodi · santai]` dari kelelawar.
- **Kamera:** kelelawar bertabung terbang dari kejauhan ke depan lensa, push-in, lalu pull-back.
- **Gerakan:** kelelawar mengepak mendekat (0-60f) → berhenti melayang di depan kamera, menyeringai licik tepat sebelum kata "kelelawar" (60-100f) → judul **BOM KELELAWAR · 1943** muncul (100-150f).

### Adegan 2 — Ide dari gua (±7 dtk) · Gua Carlsbad, senja
- `[dodi · narasi]` Idenya datang dari seorang dokter gigi, yang melihat jutaan kelelawar keluar dari gua.
- **Kamera:** wide mesa & mulut gua → glide ke Dr. Adams di samping sedan.
- **Gerakan:** kawanan kelelawar menyembur dari gua ke langit (0-210f) → Dr. Adams mendongak, mulut ternganga (40-90f) → menunjuk ke kawanan, wajah berubah senang (90-150f) → bohlam ide (kartu kecil) muncul di atas kepala (150-200f).

### Adegan 3 — Senjata rahasia (±9 dtk) · Lab
- `[dodi · tegas]` Ara, lihat ini. Senjata rahasia kita: kelelawar pembawa bom api!
- `[ara · santai]` Kelelawar? Yang kecil begini, Sersan?
- `[dodi · narasi]` Justru itu. Satu kelelawar, satu bom kecil. Ribuan kelelawar, ribuan kebakaran!
- **Kamera:** two-shot (Dodi depan-kiri, Ara belakang-kanan, bertingkat) → push-in ke kelelawar di tangan Dodi.
- **Gerakan:** Dodi mengangkat kelelawar dari meja dengan tangan kanan (0-35f) → menyodorkannya ke Ara (35-60f) → Ara condong, memicingkan mata (60-100f) → **insert close-up**: tangan Dodi mengikat tabung bakar ke perut kelelawar (1,5 dtk) → kembali two-shot; Dodi merentangkan tangan "ribuan" sementara layar terbelah memperlihatkan atap-atap terbakar (hologram grid biru) (akhir adegan).

### Adegan 4 — Kulkas (±9 dtk) · Lab, depan kulkas
- `[ara · santai]` Terus, gimana caranya biar mereka nggak kabur?
- `[dodi · santai]` Gampang. Masukin kulkas. Kedinginan, mereka tidur nyenyak.
- `[ara · santai]` Ih, lucu... kayak es loli.
- **Kamera:** medium Ara di depan kulkas → over-shoulder ke dalam kulkas → pull-back.
- **Gerakan:** Ara melangkah ke kulkas (0-30f) → **insert**: tangan Ara menarik gagang pintu (1 dtk) → pintu terbuka, uap dingin keluar (40-80f) → kelelawar beku berderet di baki, satu menggigil (80-140f) → Ara menempelkan tangan ke pipi, senyum (sebelum "lucu") → Dodi menutup pintu dari samping (akhir).

### Adegan 5 — Cara kerja bom (±9 dtk) · Lab, X-ray bom wadah
- `[dodi · narasi]` Nanti dijatuhkan dari pesawat. Begitu hangat, mereka bangun, terbang, lalu sembunyi di atap.
- `[ara · bisik]` Sembunyi di tempat yang gelap... dan tinggi, ya, Sersan?
- `[dodi · tegas]` Persis!
- **Kamera:** push-in ke casing bom; efek X-ray memperlihatkan baki bertingkat; casing membelah; pull-back ke Dodi & Ara.
- **Gerakan:** Dodi memasukkan baki berisi kelelawar ke casing (0-45f) → X-ray: casing jatuh, parasut mengembang, casing terbelah, kelelawar menyebar ke atap rumah kertas (45-200f) → Ara mengetuk dagu sambil berpikir (sebelum "gelap") → Dodi mengacungkan jempol pada "Persis!".

### Adegan 6 — 15 Mei 1943 (±8 dtk) · Pangkalan, kandang di bawah terik
- Kartu waktu: **CARLSBAD · 15 MEI 1943** (kilat putih 6 frame).
- `[ara · santai]` Sersan... kelelawarnya sudah bangun.
- `[dodi · tegang]` Hah? Siapa yang buka kandangnya?!
- `[ara · bisik]` Tadi kepanasan. Kasihan...
- **Kamera:** wide pangkalan (hangar, tangki BBM) → medium Ara di kandang → whip ke Dodi.
- **Gerakan:** matahari terik, gelombang panas (0-30f) → Ara membuka pintu kandang dengan tangan (insert 1 dtk) → kelelawar bertabung keluar satu per satu, mengepak (60-160f) → Dodi berbalik kaget, topinya melompat (sebelum "Hah") → Ara memainkan jari, menunduk (akhir).

### Adegan 7 — Tangki BBM (±10 dtk) · Pangkalan
- `[ara · tegang]` Sersan, tempat gelap dan tinggi... kayak itu?
- `[dodi · tegang]` Jangan ke sana... jangan ke sana!
- **Kamera:** ikut kawanan menuju tangki BBM → crane-down di bawah tangki (kelelawar bergelantungan, sumbu memercik) → pull-back cepat + guncangan saat api.
- **Gerakan:** Ara menunjuk tangki BBM (0-30f) → kawanan terbang dan bergelantungan di bawah tangki (30-120f) → Dodi berlari ke arah tangki, kedua tangan terangkat (100-170f) → percikan, api membesar di tangki & hangar (170-240f) → Dodi rem mendadak, berbalik lari (240-280f) → mobil jenderal di latar ikut terbakar; Pak Jenderal menoleh dengan wajah marah, kumis bergetar (280-300f).

### Adegan 8 — Penutup (±8 dtk) · Pangkalan berasap, senja
- `[dodi · narasi]` Bomnya berhasil. Terbukti bisa membakar... pangkalan sendiri.
- `[dodi · narasi]` Setahun kemudian proyek ini dibatalkan, kalah cepat dari bom atom.
- `[ara · santai]` Jadi... kita menang, Sersan?
- `[dodi · santai]` Yang menang... kelelawarnya.
- **Kamera:** wide asap & hangar gosong → glide ke Dodi & Ara berwajah jelaga → push-in ke kelelawar yang bertengger santai di topi Dodi (twist) → stop musik, sting.
- **Gerakan:** Dodi & Ara berdiri berjelaga, mengibas asap (0-60f) → Ara menoleh ke Dodi (sebelum pertanyaan) → Dodi menghela napas, bahu turun (pada "Yang menang") → kelelawar mendarat di topi Dodi & nyengir tepat di kata terakhir.

**Total ±65 dtk** (naskah ±175 kata).

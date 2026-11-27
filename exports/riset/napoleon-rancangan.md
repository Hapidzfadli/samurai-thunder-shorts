# Rancangan Produksi: "Napoleon vs Kelinci" (legenda, Juli 1807)

- **Gaya:** latar 3D arsitektur dari **Blender headless → GLB → Remotion** (pola `scripts/build_school_glb.py` + `src/SchoolFlythrough.tsx`), kamera fly-through `CatmullRomCurve3`, tokoh **kartu 2D** (`BeanCard`) dan kelinci 2D (`RabbitCard`). Cahaya, bayangan, kamera, tokoh ada di Remotion.
- **Format:** 1080×1920, 30 fps, subtitle 1-2 kata, perkiraan **±95-105 dtk** (dialog panjang, 8 adegan, 6 latar). Bisa dipangkas bila perlu.
- **Suara:** VoxCPM2. `dodi` = Kaisar Napoleon **dan** narator (gaya `narasi` untuk narator, `santai/tegas/tegang` untuk Kaisar). `ara` = Ajudan Ara (tokoh fiktif).
- **Cara menyampaikan (mudah dipahami):** satu adegan satu ide; hook di kalimat pertama; Ara mewakili penonton dengan bertanya; selalu ada sebab-akibat ("karena... jadi..."); kalimat pendek; kartu info untuk tahun/tempat; penutup satu kalimat.

---

## 1. Fakta & sumber (legenda, bukan sejarah pasti)
- **Waktu dan tempat:** pesta berburu kelinci diadakan setelah **Perjanjian Tilsit (Juli 1807)** antara Napoleon dan Tsar Rusia. [Mental Floss](https://www.mentalfloss.com/history/military/time-napoleon-was-attacked-rabbits), [AOL](https://www.aol.com/articles/napoleon-once-attacked-hundreds-rabbits-202617271.html)
- **Penyelenggara:** Marsekal **Berthier**. Di video penyelenggaranya diganti **Ajudan Ara (tokoh fiktif)**.
- **Jumlah kelinci:** berbeda tiap sumber, dari beberapa ratus sampai ±3.000. Di video disebut "ratusan".
- **Sebab utama kekacauan:** kelinci **dibeli dari peternak**, bukan ditangkap liar, jadi jinak dan terbiasa didekati manusia; dalam versi cerita, kelinci itu **belum diberi makan hari itu**, sehingga menyerbu rombongan Kaisar. [Mental Floss](https://www.mentalfloss.com/history/military/time-napoleon-was-attacked-rabbits)
- **Sumber cerita:** memoar **Jenderal Thiébault**, terbit dalam bahasa Prancis **1895**, jauh setelah kejadian, dan ia disebut menyimpan ketidaksukaan pada Berthier, sehingga sebagian sejarawan berhati-hati. [Deseret News](https://www.deseret.com/u-s-world/2023/10/4/23901896/the-battle-napoleon-bonaparte-lost-to-rabbits), [The Star: fact-check](https://www.thestar.com.my/news/true-or-not/2024/09/05/quickcheck-did-a-hunt-cause-napoleon-bonaparte-to-retreat-due-to-rabbits)
- **Detail hiasan yang hanya dari popularisasi:** kelinci melompat ke kereta Kaisar. Di video ditampilkan sebagai komedi dan diberi label **"KONON"**.
- **Pembingkaian:** semua adegan bertanda "KONON · 1807"; penutup menyebut sumbernya satu memoar.
- Tokoh sejarah di sini sudah meninggal; Ara fiktif; Kaisar tidak dijadikan bahan hinaan, hanya situasi lucu.

## 2. Karakter (`exports/riset/napoleon-karakter.png`, `napoleon-ekspresi.png`)
| Tokoh | Suara | Penampilan | Ekspresi dipakai |
|---|---|---|---|
| Kaisar Napoleon (pria) | dodi | topi bicorne + kokade 3 warna, mantel biru, sabuk silang putih, kancing/medali emas, celana putih, bot hitam | bangga, senang, mikir, kaget, panik, marah |
| Ajudan Ara (wanita, fiktif) | ara | jaket merah tua berkancing emas, rok biru, sanggul, dasi krem, bot hitam, bawa gulungan kertas | senang, mikir, kaget, panik |
| Pak Petani (figuran) | – | topi cokelat, celemek, kumis | biasa, senang |
| Pengawal (figuran) | – | helm pengawal, mantel biru, sabuk putih | biasa, panik |
| Kelinci (banyak) | – | 2 pose (duduk, melompat), bulu putih/krem/cokelat; ekspresi polos, **lapar**, kenyang, kaget | – |

## 3. Latar & properti (6 latar; interior + eksterior)
| # | Latar | Dibuat dengan | Properti (tidak ada ruang kosong) |
|---|---|---|---|
| L1 | **Paviliun di atas rakit, Sungai Niemen (Tilsit)** — luar + ruang perjanjian | Blender GLB (+ lubang jendela untuk kamera masuk) | rakit kayu, paviliun bertiang dan kain tirai, bendera Prancis dan Rusia, sungai, perahu kecil, meja perjanjian, dua kursi, tumpukan dokumen, pena bulu dan tinta, lilin, karpet, lukisan, jendela besar |
| L2 | **Ruang tenda markas Napoleon** (siang; dipakai lagi malam di adegan akhir) | Blender GLB | tenda kanvas besar, meja peta, peta Eropa, kursi lipat, lampu minyak, peti perbekalan, tombak dan senapan bersandar, tempat bendera, karpet, tempat tidur lapangan, tungku kecil |
| L3 | **Peternakan kelinci** | Blender GLB | gudang kayu, kandang berkawat bersusun penuh kelinci, jerami, tong dan peti, gerobak, pagar, ember wortel, papan harga, ayam di halaman, pohon |
| L4 | **Lapangan perburuan** | Three.js + properti GLB | padang rumput luas, tenda pesta bergaris, meja panjang berisi makanan, deretan kursi, bendera, para jenderal figuran, kandang kayu besar, pohon dan semak, awan |
| L5 | **Kereta kuda Kaisar** (dalam kereta + jalan) | Blender GLB (interior) + jalan prosedural | kereta berornamen, jok beludru, jendela, tirai, dua kuda dengan kusir, jalan tanah, pohon di tepi jalan |
| L6 | **Tenda markas, malam** | L2 dengan cahaya malam | seperti L2, lilin dan lampu menyala hangat |

Kamera pembuka (fly-through): terbang dari **udara di atas sungai** → turun ke rakit → menembus **jendela paviliun** → mendarat di meja perjanjian.

## 4. Naskah + adegan + daftar gerakan
Format baris: `[suara · gaya] kalimat`. Durasi adalah perkiraan; jadwal pasti mengikuti audio. Kartu info: **KONON · 1807**.

### Adegan 1 — Hook (±7 dtk) · L1 eksterior (udara)
- `[dodi · narasi]` Napoleon hampir tidak pernah kalah perang.
- `[dodi · santai]` Tapi suatu hari dia lari terbirit-birit... dari kelinci.
- **Kamera:** terbang dari udara di atas Sungai Niemen ke arah paviliun di rakit (fly-through awal).
- **Gerakan:** kamera meluncur turun (0-120f) → kartu **"KONON · 1807"** muncul (60-120f) → seekor kelinci mengintip dari pinggir rakit dan menyeringai (130-200f).

### Adegan 2 — Perjanjian Tilsit (±16 dtk) · L1 interior
- `[dodi · narasi]` Juli 1807. Napoleon baru menang dan menandatangani perjanjian damai dengan Rusia.
- `[ara · santai]` Selamat, Yang Mulia! Perang akhirnya selesai.
- `[dodi · santai]` Akhirnya. Tapi... aku jadi bosan.
- `[ara · santai]` Bosan? Setelah menang?
- `[dodi · santai]` Iya. Tiga tahun perang terus. Sekarang aku butuh hiburan. Ada ide?
- **Kamera:** menembus jendela, mendarat di sisi meja → two-shot (Dodi depan, Ara belakang).
- **Gerakan:** Dodi duduk membubuhkan tanda tangan dengan pena bulu (0-90f; **insert close-up tangan menulis** 60-120f) → meletakkan pena, bersandar puas (120-160f) → Ara bertepuk tangan (160-200f) → Dodi menguap dan menopang dagu (240-300f) → Ara memiringkan kepala, kaget (300-340f) → Dodi mengangkat satu jari "butuh hiburan" (380-440f).

### Adegan 3 — Ide berburu (±13 dtk) · L2 tenda markas
- `[ara · santai]` Bagaimana kalau berburu kelinci? Seru, ramai, dan tidak berbahaya.
- `[dodi · tegas]` Bagus! Besok pagi. Aku mau kelinci yang banyak!
- `[ara · santai]` Siap! Berapa banyak, Yang Mulia?
- `[dodi · tegas]` Ratusan! Semuanya harus siap.
- **Kamera:** two-shot di depan meja peta → push-in ke Dodi saat "ratusan" → pull-back.
- **Gerakan:** Ara membuka gulungan jadwal dan menunjuk gambar kelinci (0-80f) → Dodi menepuk meja bersemangat (100-130f) → Ara menulis di gulungan, menghitung dengan jari (200-280f; insert) → Dodi merentangkan tangan "ratusan" (300-340f).

### Adegan 4 — Beli di peternakan (±14 dtk) · L3 peternakan
- `[dodi · narasi]` Masalahnya, menangkap ratusan kelinci liar itu sulit.
- `[ara · bisik]` Kelinci liar susah ditangkap... Ah! Beli saja yang dari peternakan!
- `[ara · santai]` Pak, kelinci ini jinak, kan?
- `[dodi · narasi]` Jinak sekali. Terlalu jinak. Karena tiap hari mereka diberi makan oleh manusia.
- **Kamera:** wide peternakan → pull in ke Ara dan Pak Petani.
- **Gerakan:** Ara berjalan di antara kandang kelinci (0-70f) → mengetuk dagu berpikir, lalu menjentikkan jari (90-130f) → Pak Petani mengangkat seekor kelinci jinak ke tangan Ara (**serah-terima**: mendekat → julur tangan → kelinci berpindah → Ara memeluk, 200-280f) → kelinci mengendus tangan Ara dan mengunyah wortel (280-340f) → Ara membayar uang koin, petani menghitung (360-420f).

### Adegan 5 — Hari perburuan, kandang dibuka (±16 dtk) · L4 lapangan
- `[dodi · narasi]` Besok paginya, para jenderal sudah siap dengan senapan.
- `[dodi · tegas]` Bukalah kandangnya!
- `[ara · santai]` Siap, Yang Mulia!
- `[dodi · tegang]` Hm? Kenapa mereka tidak lari?
- `[ara · bisik]` Eh... mereka justru... menuju ke sini.
- `[dodi · tegang]` Ke arahku?!
- **Kamera:** wide lapangan dari udara → turun ke Kaisar → low-angle melihat kelinci menyerbu.
- **Gerakan:** Kaisar berdiri bangga, senapan di bahu (0-80f) → Ara berlari ke kandang besar (110-170f; **insert close-up tangan membuka palang kandang** 170-230f) → pintu terbuka, ratusan kelinci keluar (230-290f) → kelinci berbelok lurus ke Kaisar (290-350f) → Kaisar menurunkan senapan, bingung (330-380f) → ekspresi kaget, topi bergetar (400-460f).

### Adegan 6 — Kelinci menyerbu (±12 dtk) · L4 lapangan
- `[ara · bisik]` Yang Mulia, mereka mengira Anda membawa makanan.
- `[dodi · tegang]` Makanan?! Aku bawa senapan!
- `[ara · tegang]` Tadi pagi mereka belum diberi makan, Yang Mulia!
- `[dodi · tegas]` Pengawal! Usir mereka!
- **Kamera:** wide kelinci melompat dari segala arah; whip ke pengawal.
- **Gerakan:** kelinci naik ke sepatu dan menggigit ujung mantel Kaisar (0-90f) → Kaisar berjingkat, mengibas-ngibas (90-150f) → pengawal melambai-lambaikan topi mengusir, tapi kelinci malah makin banyak (170-250f) → Ara menutup mulut dengan tangan, menahan tawa (260-320f).

### Adegan 7 — Kabur ke kereta (±12 dtk) · L5 kereta
- `[dodi · tegang]` Cepat! Siapkan keretaku!
- `[ara · santai]` Anda sudah di dalam kereta, Yang Mulia!
- `[dodi · tegang]` Lalu kenapa kelincinya ikut masuk?!
- `[ara · santai]` Mereka sangat menyukai Anda!
- **Kamera:** dari luar kereta (kuda berlari) → ke dalam kereta close-up → whip ke Ara yang mengintip dari jendela.
- **Gerakan:** Kaisar melompat naik ke kereta (0-50f) → membanting pintu (50-70f) → kereta melaju, debu mengepul (70-140f) → kelinci melompat masuk lewat jendela, satu per satu (140-260f) → Kaisar menutupi kepala dengan topi, jongkok di jok (260-330f).

### Adegan 8 — Penutup (±13 dtk) · L6 tenda malam
- `[dodi · santai]` Ara... jangan bilang siapa-siapa soal ini.
- `[ara · santai]` Rahasia aman, Yang Mulia!
- `[dodi · narasi]` Tapi para saksi menuliskannya. Hampir sembilan puluh tahun kemudian, kisahnya terbit.
- `[dodi · narasi]` Sekuat apa pun kamu, jangan remehkan kelinci yang lapar.
- **Kamera:** two-shot hangat dari lilin → pull-back keluar tenda → kelinci bertengger di topi Kaisar (twist, mirip penutup Bom Kelelawar).
- **Gerakan:** Kaisar duduk lelah, mantel acak-acakan, bulu kelinci menempel (0-80f) → menaruh jari di bibir "ssst" (100-140f) → Ara menirukan "ssst" sambil tersenyum (170-210f) → kartu info **"Sumber: memoar Jenderal Thiébault, terbit 1895"** (260-330f) → kelinci mendarat di topi Kaisar dan menyeringai tepat di kata terakhir (330-390f).

**Jumlah:** ±27 baris dialog dan narasi, ±200 kata. Perkiraan total ±100 dtk (di Bom Kelelawar estimasi 65 dtk jadi 85 dtk, jadi angka ini bisa lebih panjang).

## 5. Rencana pembuatan (setelah disetujui)
1. Skrip Blender `scripts/build_napoleon_glb.py`: L1 (paviliun rakit), L2 (tenda markas), L3 (peternakan), kereta; ekspor GLB (UV asli + material Principled).
2. Lapangan perburuan dengan Three.js + properti GLB; kereta dengan jalan prosedural.
3. Naskah JSON → suara VoxCPM2 (dodi + ara) di latar belakang → mix audio dan efek suara (kelinci, langkah, kuda, kereta) → jadwal.
4. 8 adegan: mulut sinkron kata, kelinci banyak (instansi `RabbitCard`), insert close-up tangan, ekspresi.
5. Still-check satu lembar kontak → render → mux → QA → kirim.

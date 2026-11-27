# Rancangan Produksi: "Telat Masuk Kelas, Malah Pecahkan 2 Soal Paling Mustahil di Dunia 🤯📐"
**Kisah Nyata George Bernard Dantzig — UC Berkeley, 1939**

- **Format:** Vertikal `1080×1920`, `30 fps`, durasi target **±62–68 detik**.
- **Gaya Visual:** **Hybrid 2.5D** — Lingkungan arsitektur 3D padat hasil **Blender Headless (`.glb`)** + **Karakter 2D Cutout bergaris tepi hitam tebal** (gaya `@Dasiman3d`) ditempatkan di dalam ruang 3D, lengkap dengan transisi kamera *fly-through* dari luar gedung masuk menembus jendela ke dalam kelas!
- **Audio Standar (`CLAUDE.md`):** **VoxCPM2** (`scripts/voice_vox.py`) memakai duo favorit **`dodi`** (Narator utama + George + Prof. Neyman nada tegas berwibawa) & **`ara`** (Anne Dantzig) + alignment **Whisper** + SFX fisik (lonceng kampus, pintu berderit, pensil/kertas, gedoran pintu Minggu pagi, musik *ducking*).

---

## 1. Riset Fakta Sejarah (Terverifikasi)
- **Waktu & Tempat:** Tahun **1939**, Universitas California, Berkeley (AS).
- **Tokoh Nyata:** **George Bernard Dantzig** (24 tahun, mahasiswa pascasarjana/S3 statistika), **Profesor Jerzy Neyman** (ahli statistika ternama asal Polandia), dan **Anne Dantzig** (istri George).
- **Kejadian Asli** *(sumber: wawancara George Dantzig di College Mathematics Journal 1986 & Wikipedia)*:
  1. George datang **terlambat** ke kuliah statistika Prof. Neyman. Di papan tulis ada **2 soal** yang sebenarnya adalah contoh **2 teorema statistika terkenal yang belum pernah terpecahkan** (*Student's Hypothesis* & *Neyman–Pearson Lemma*).
  2. Karena datang telat, George **mengira itu PR biasa**, lalu menyalinnya ke buku catatan.
  3. Selama beberapa hari ia mengerjakannya susah payah di rumah bersama istrinya Anne yang menemani (*"PR kali ini kok agak lebih susah dari biasanya..."*).
  4. Beberapa hari kemudian ia menyerahkan jawabannya ke ruang kerja Prof. Neyman sambil minta maaf karena terlambat; sang profesor sedang sibuk dan menyuruhnya **melempar kertas itu ke meja kerjanya yang berantakan**.
  5. **Enam minggu kemudian, Minggu pagi jam 08.00**, George & Anne kaget dibangunkan suara gedoran keras di pintu depan — ternyata **Prof. Neyman** berlari membawa kertas George dengan penuh semangat: *"Aku baru menulis kata pengantar untuk makalahmu! Dua soal itu bukan PR, itu dua soal statistika paling mustahil yang belum pernah terpecahkan!"*
  6. Setahun kemudian, kedua jawaban "PR" itu langsung dijadikan **disertasi doktor (PhD)** George Dantzig—dan kisahnya menjadi inspirasi adegan pembuka film *Good Will Hunting*.

---

## 2. Lembar Karakter & Ekspresi 2D Cutout (`@Dasiman3d` Style)

![Lembar Karakter dan Ekspresi George Dantzig 1939](/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/fcefef0b-c410-48a6-bb03-550d9f77f94f/dantzig_karakter_sheet.png)

1. **George Bernard Dantzig (24 thn, Pria)** — *Suara: `dodi`*
   - **Pakaian:** Kemeja putih berkerah, dasi marun, rompi rajut biru dongker (berlipat & kelim), celana abu gelap, sepatu pantofel cokelat.
   - **Ekspresi:** `panik_telat` (keringat + rambut jigrak), `fokus_mencatat`, `pusing` (kantung mata begadang), `sungkan`, `syok`, `bangga`.
2. **Profesor Jerzy Neyman (45 thn, Pria)** — *Suara: `dodi` (gaya tegas/berwibawa)*
   - **Pakaian:** Jas tweed cokelat berkerah *lapel* + saputangan saku, kemeja krem, dasi kupu-kupu hijau tua, kacamata bundar bingkai tipis (tidak menutupi mata/alis), celana cokelat tua, oxford hitam.
   - **Ekspresi:** `serius`, `sibuk_acuh`, `takjub`, `heboh_pagi`.
3. **Anne Dantzig (23 thn, Wanita)** — *Suara: `ara`*
   - **Pakaian:** Gaun rumahan 1939 biru pastel + kerah putih, kardigan krem, sabuk cokelat tipis, rambut gelombang sebahu + jepit kuning, sepatu *flat* cokelat.
   - **Ekspresi:** `khawatir`, `senyum_hangat`, `kaget_pintu`, `bangga`.
4. **Teman Sekelas (2–3 figuran 1939)** — Kemeja/jaket era 1939 duduk rapi di bangku kayu kelas.

---

## 3. Lembar Properti 3D per Latar (Dibangun dengan Blender Headless `.glb`)

Semua latar padat properti (tidak ada ruangan kosong), tekstur prosedural *packed*:

| Latar 3D (`.glb`) | Properti Lingkungan Padat | Properti Terpisah (Pindah Tangan / Aksi Fisik) |
| :--- | :--- | :--- |
| **1. Eksterior & Kelas UC Berkeley (`school.glb` upgrade)** | Gedung kampus klasik 2 lantai, atap merah, menara jam bundar, halaman rumput, pohon *low-poly*, lampu taman, jendela lantai 2 berlubang Boolean; di dalam kelas: lantai papan kayu, *wainscoting*, papan tulis hijau berisi **2 soal statistika**, jam dinding `09:20`, meja kayu + buku + botol tinta, pintu kelas 3D berayun. | **Tas kulit**, **Buku Catatan**, **Pensil 3D**, **Kapur & Penghapus**. |
| **2. Kamar Belajar Malam George (`dantzig_rooms.glb`)** | Meja belajar kayu hangat, **lampu meja hijau klasik (*banker's lamp*)** menyala hangat, rak buku penuh, jendela malam berbintang, kalender meja `1939`, ranjang di latar belakang, **bola-bola kertas remasan gagal** berserakan di lantai kayu. | **Cangkir Kopi berasap** (dibawa Anne → diletakkan di meja George), **Tumpukan Kertas Jawaban "PR"** (menebal bertahap), **Pensil**. |
| **3. Ruang Kerja Prof. Neyman (`dantzig_rooms.glb`)** | Meja kerja profesor yang **sangat berantakan** dengan bukit tumpukan kertas & map, rak buku setinggi plafon, globe vintage, jendela terang siang hari, bingkai rumus dinding. | **Tumpukan Kertas Jawaban George** (berpindah dari tangan George → mendarat di puncak tumpukan meja profesor). |
| **4. Pintu Depan & Ruang Tamu Minggu Pagi (`dantzig_rooms.glb`)** | Pintu depan kayu berayun 3D, cahaya matahari pagi keemasan masuk lewat celah pintu, jam dinding **`08:00`**, karpet hangat, rak mantel, sofa ruang tamu di belakang. | **Lembar Makalah + Kata Pengantar** (dilambaikan Prof. Neyman → diserahkan ke tangan George) & **Binder Disertasi PhD** di penutup. |

---

## 4. Daftar 7 Adegan, Gerakan Fisik (*Action Beats*) & Kamera 3D

1. **Adegan 1 — Hook & Fly-Through: Telat Masuk Kelas UC Berkeley 1939 (`~9 dtk`)**
   - **Kamera 3D:** Dimulai dari **shot udara eksterior gedung kampus 3D** (menara jam + halaman + langit pagi) → **terbang mulus (*CatmullRomCurve3*) menembus jendela lantai 2 yang terbuka** masuk ke dalam ruang kelas!
   - **Gerakan Fisik:** Pintu kelas di kiri terbuka pelan berayun (`65-100f`) → George masuk mengendap panik sambil mendekap **Tas & Buku Catatan** (`100-175f`) → melirik jam dinding `09:20` & buru-buru duduk di bangku kayu belakang (`175-end`).
   - **Narasi (`dodi`):** Hook penasaran: *"Gara-gara telat masuk kelas, mahasiswa ini malah tak sengaja memecahkan dua soal matematika paling mustahil di dunia!"*

2. **Adegan 2 — Salah Paham di Papan Tulis (`~9 dtk`)**
   - **Kamera 3D:** *Glide* dari bangku George menuju papan tulis hijau penuh **2 Soal Statistika** → **Close-up Insert SVG/2D (1,5 dtk)** tangan George memegang **Pensil** menyalin rumus dengan cepat ke **Buku Catatan** → *pull-back* ke kelas.
   - **Gerakan Fisik:** George menatap papan tulis bingung lalu mengangguk mantap (*"Oh, PR baru!"*) (`0-70f`) → tangan membuka **Buku Catatan** & mengangkat **Pensil** (`70-110f`) → insert close-up goresan pensil menyalin `Soal 1` & `Soal 2` (`110-165f`) → George menutup buku & memasukkannya ke tas (`165-end`).
   - **Narasi (`dodi`):** Menjelaskan bahwa Prof. Neyman menulis 2 contoh soal statistika yang belum pernah terpecahkan, tapi George yang telat mengira itu tugas PR biasa.

3. **Adegan 3 — Begadang Susah Payah di Rumah (`~10 dtk`)**
   - **Kamera 3D:** Transisi lembut masuk ke **Kamar Belajar Malam 3D** (cahaya hangat *banker's lamp*) → *orbit* pelan memperlihatkan bola-bola kertas remasan di lantai → *push-in* saat Anne masuk membawa kopi.
   - **Gerakan Fisik:** George menggaruk kepala pusing, meremas kertas gagal lalu melemparnya ke lantai (`0-85f`) → Anne berjalan mendekat membawa **Cangkir Kopi berasap**, mengulurkan tangan dan meletakkannya di samping buku George (`85-155f`) → George menoleh, tersenyum letih, lalu meraih **Pensil** & mulai menulis solusi akhir (`155-end`).
   - **Dialog (`dodi` & `ara`):**
     - **Anne (`ara`):** *"George, udah jam dua malam... PR-nya susah banget ya?"*
     - **George (`dodi`):** *"Iya nih, agak lebih susah dari biasanya... tapi kayaknya aku baru nemu caranya!"*

4. **Adegan 4 — Menyerahkan "PR" ke Meja Berantakan Profesor (`~9 dtk`)**
   - **Kamera 3D:** *Dolly* masuk ke **Ruang Kerja Prof. Neyman 3D** yang penuh bukit tumpukan kertas → *close-up* serah-terima kertas → *pull-back* saat George keluar dengan wajah ragu.
   - **Gerakan Fisik:** George melangkah maju mendekap **Tumpukan Kertas Jawaban** (`0-65f`) → menjulurkan kertas ke arah Prof. Neyman yang sibuk menunduk menulis (`65-115f`) → Prof. Neyman melambaikan tangan menunjuk bukit kertas di mejanya (`115-150f`) → George pelan-pelan meletakkan kertasnya di puncak tumpukan & mundur sungkan (`150-end`).
   - **Dialog (`dodi`):** George minta maaf telat mengumpulkan PR; Prof. Neyman acuh menyuruh taruh saja di tumpukan meja.

5. **Adegan 5 — 6 Minggu Kemudian: Gedoran Pintu Minggu Pagi Jam 08.00! (`~9 dtk`)**
   - **Kamera 3D:** *Push-in* ke jam dinding **`08:00`** + kartu waktu `"6 MINGGU KEMUDIAN · MINGGU PAGI"` → *camera shake* saat pintu kayu digedor keras (*DOK! DOK! DOK!*) → *whip-pan* lembut saat pintu terbuka lebar.
   - **Gerakan Fisik:** Anne & George berlari kaget dari ruang tamu (`0-70f`) → George meraih gagang & menarik **Pintu Depan 3D** terbuka berayun (`70-120f`) → Prof. Neyman berdiri ngos-ngosan di teras, mata melotot takjub sambil melambaikan **Kertas Jawaban George** di udara (`120-end`).
   - **Dialog (`ara` & `dodi`):**
     - **Anne (`ara`):** *"Siapa sih yang gedor pintu jam delapan Minggu pagi?!"*
     - **Prof. Neyman (`dodi`, tegas bersemangat):** *"George! Aku baru menulis kata pengantar jurnalmu! Baca sekarang juga!"*

6. **Adegan 6 — Plot Twist: "Itu Bukan PR, George!" (`~9 dtk`)**
   - **Kamera 3D:** **Close-up Insert (1,5 dtk)** tangan Prof. Neyman menyerahkan **Makalah** dengan stempel merah `"TERPECAHKAN!"` ke tangan George → *orbit* memperlihatkan ekspresi George & Anne yang melongo syok berubah jadi haru!
   - **Gerakan Fisik:** Prof. Neyman mengulurkan **Makalah** (`0-55f`) → George mengulurkan kedua tangan menerima makalah & menariknya ke dada sambil membaca (`55-120f`) → Anne menoleh ke George menutup mulut terkejut lalu tersenyum bangga (`120-end`).
   - **Narasi + Dialog (`dodi`):** Prof. Neyman menjelaskan bahwa 2 soal di papan tulis itu bukan PR, melainkan dua teorema statistika terkenal yang belum pernah bisa dipecahkan ahli mana pun—dan setahun kemudian langsung diterima jadi **disertasi doktor** George!

7. **Adegan 7 — Penutup & Pesan Menohok (`~8 dtk`)**
   - **Kamera 3D:** Kembali ke **ruang kelas 3D sunlit** (George berdiri bangga memegang **Binder Disertasi PhD** di depan papan tulis yang kini bertuliskan 2 soal dengan tanda centang hijau `✓ TERPECAHKAN`) → **crane-up mundur perlahan keluar lewat jendela** menutup cerita dengan indahnya gedung kampus 3D!
   - **Narasi (`dodi`):** *"George bisa memecahkannya bukan karena soalnya tiba-tiba jadi mudah—tapi karena tidak ada yang sempat bilang padanya bahwa soal itu mustahil. Kadang, batas terbesar kita cuma rasa takut sebelum mencoba."*

---

> **Menunggu persetujuan kamu sebelum saya mulai membangun aset 3D Blender, naskah & audio VoxCPM2 (`dodi` + `ara`), serta adegan Remotion.**
> Kalau sudah cocok tinggal klik setuju/balas **"Lanjut"**, atau beri tahu kalau ada revisi pada karakter, properti, atau alur adegannya!

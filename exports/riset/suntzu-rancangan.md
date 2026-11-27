# SUN TZU — PAKET PERSETUJUAN DESAIN 01

Status: PRATINJAU saja. Belum audio, animasi final, atau video penuh. Target akhir 1080×1920, 30 fps, 100–120 detik, 8 adegan. Branch claude/sun-tzu-latihan-istana; bukan main.

## 1. Riset dan batas fakta
Sumber yang berhasil dibaca pada 27 November 2026:
- Sima Qian, *Shiji*, bab 65 (biografi Sun Wu / Wu Qi), dikutip dan diterjemahkan Lionel Giles dalam pengantar *Sun Tzu on the Art of War* (1910), bagian “Sun Wu and his Book”. Salinan domain publik: https://raw.githubusercontent.com/GITenberg/The-Art-of-War_132/master/132.txt . Halaman katalog: https://www.gutenberg.org/ebooks/132 . Situs Gutenberg saat pemeriksaan sedang maintenance; teks diverifikasi melalui salinan GITenberg.
- Sumber teks Shiji untuk pembaca: https://ctext.org/shiji/sun-zi-wu-qi-lie-zhuan . Halaman ini tidak dapat dibaca otomatis karena pemeriksaan koneksi; TIDAK diklaim sebagai verifikasi kedua yang independen.

Yang ada dalam terjemahan Giles atas kisah Shiji: Raja Helü (Ho Lu) menguji Sun Tzu; 180 perempuan istana dibagi dua kelompok; dua selir kesayangan raja memimpin; peserta memegang tombak; aba-aba pertama belok kanan, kedua belok kiri; tawa berulang; Sun Tzu membedakan perintah tidak jelas (tanggung jawab panglima) dari perintah jelas yang tidak dipatuhi (tanggung jawab pemimpin kelompok); raja menyaksikan dari paviliun tinggi dan mengirim pesan penghentian; Sun Tzu menolak; dua pemimpin dihukum mati; pengganti diangkat; latihan menjadi tertib.

Ini kisah biografis dalam catatan yang ditulis jauh sesudah masa yang dikaitkan dengan Sun Tzu, bukan cerita dalam 13 bab inti The Art of War dan bukan bukti bahwa setiap peristiwa sungguh terjadi. Jangan mencantumkan tahun kejadian yang pasti. Semua dialog Dodi/Ara adalah dramatisasi modern; komentar “tertib karena takut” adalah pembacaan Ara, bukan kutipan sumber. Akhir video harus memuat label: “Kisah dalam Shiji • Dialog didramatisasi”.

Jumlah figuran disederhanakan secara visual, bukan klaim hanya ada belasan peserta. Tidak menciptakan nama untuk dua pemimpin. Rupa, busana, denah, warna, waktu, cuaca, dan detail properti adalah interpretasi artistik; bukan rekonstruksi arkeologis. Hindari mahkota Eropa, topi militer modern, atribut merah-putih, batik, arsitektur Kota Terlarang, dan stempel aksara palsu.

## 2. Lembar karakter
Render aktual template BeanCard 2D: suntzu-karakter.png dan suntzu-ekspresi.png.
- Dodi, pria: pembawa cerita fiktif, jubah biru tinta, kerah silang, sabuk emas kusam, ikat rambut. Suara dodi. Penasaran/menjelaskan/tegas/reflektif.
- Ara, wanita: penonton fiktif, jubah toska, sabuk koral, sanggul bertusuk; mulut dan mata selalu jelas. Suara ara. Bertanya/tertawa ringan/kaget/cemas/prihatin.
- Sun Tzu, pria: reka rupa tokoh sejarah, jubah zaitun, sabuk kulit cokelat, topknot, tanpa janggut yang menutup mulut; gestur ringkas, bukan amukan. Tanpa suara sendiri.
- Raja Helü, pria: reka rupa tokoh sejarah, jubah merah kayu, kelim oker, penutup kepala seremonial hitam stilisasi; percaya diri → kaget → murung. Tanpa suara sendiri.
- Pemimpin A/B, wanita: nama tidak diketahui; jubah mawar dan biru, sanggul, sabuk berbeda jelas; tertawa → bingung → takut. Tanpa seksualisasi atau humor saat penderitaan.
- Utusan pria: figur interpretatif, jubah tanah, topknot, gestur tergesa-gesa; pesan LISAN, tidak perlu menciptakan surat perintah tertulis.
- Peserta/pengawal: variasi warna tanah dari template, pengganti dibedakan pita sabuk, wajah terlihat; tombak properti terpisah.

## 3. Latar & lapisan properti
Satu kompleks Blender → GLB, dipratinjau di Remotion/Three.js. Atap genteng abu, kayu merah kusam, lantai tanah/batu, panel anyaman/kayu, bukan istana kekaisaran jauh lebih muda.

A. Gerbang dan halaman luar (pagi hangat): foreground daun/ranting/batu; tengah jalan batu, panji, guci, pengawal; belakang tembok bertekstur, atap, pohon, langit berawan. Bukaan gapura nyata untuk fly-through.
B. Balairung (pagi, sinar samping + lampu minyak): foreground ujung meja rendah; tengah tikar, meja, cawan, bundel bilah bambu dan takhta rendah; belakang panel, kisi jendela, gantungan kain, lampu perunggu. Jalur kamera dan dua wajah bebas tiang.
C. Halaman latihan (siang, hangat beralih lebih netral): foreground tepian tanah dan rak tombak; tengah dua kelompok bertingkat, genderang, panji; belakang tangga paviliun, pohon, dinding. Ruang tengah bersih untuk komando.
D. Paviliun komando (siang akhir / cahaya makin dingin sebagai grading, bukan klaim kejadian berlangsung seharian): foreground pagar kayu, cawan; tengah kursi rendah/tikar raja; belakang panel kayu, lampu, atap. Tangga utusan punya rute bebas.
E. Selasar refleksi (cahaya senja artistik): lantai, kolom, lampu minyak hangat, halaman jauh. Tidak dipaksakan malam karena kisah tidak memerlukannya.

Properti aksi berdiri sendiri: tombak, pemukul genderang, genderang, bilah bambu, cawan, panji. Pemukul terhubung ke tangan; pukulan → kontak kulit genderang → pemukul memantul → SFX. Tidak ada kapak/pedang eksekusi untuk preview ini. Benda penting tidak dilukis menempel pada kartu karakter.

Rencana hidup latar saat animasi: panji berkibar lembut, daun bergoyang, debu di berkas cahaya, asap lampu, bayangan dedaunan, kedip/idle figuran. Gambar pratinjau belum membuktikan animasi ini.

## 4. Delapan adegan + shot dan action beats
Waktu di bawah editorial sementara; diganti timing kata VoxCPM2 sesudah desain disetujui. Frame lokal 30 fps. Tiap shot tetap bergerak memakai smoother; tidak ada kamera statis >3 detik. FOV interior 40–55. Setelah close-up selalu shot lebih lebar. Pemandu depan/belakang, bukan melebar hingga terpotong.

### 1 — Ujian Raja (0–14 dtk; 420f)
Shot: 0–120f fly-through CatmullRom luar atap → bukaan balairung (bukan menembus atap); 120–210f medium Dodi/Ara + dolly pelan; 210–270f close-up bilah bambu 2 dtk; 270–345f pull-back raja/Sun Tzu; 345–420f orbit lebar menuju halaman.
Gerak: Ara menoleh ke raja (0–25f) → angkat satu tangan bertanya (25–60f); raja lengan terangkat (270–295f) → menunjuk halaman (295–320f); Sun Tzu mengangguk (320–340f). Bilah bambu tidak diserahterimakan tanpa aksi.
Label: UJIAN SANG AHLI STRATEGI.

### 2 — Dua Pemimpin (14–27 dtk; 390f)
Shot: 0–105f fly-through kedua dari luar gerbang → paviliun latihan; 105–180f tracking dua pemimpin maju; 180–225f CU sabuk penanda; 225–300f pull-back dua kelompok; 300–390f medium host, orbit kecil.
Gerak: A melangkah ke titik depan (105–145f) → B menyusul ke titik belakang (125–170f) → peserta mengambil posisi (165–225f). Tombak diambil: tangan menjulur → menggenggam → terangkat, objek terpisah.
Label: 2 KELOMPOK • 2 PEMIMPIN. Catatan kecil rancangan: sumber menyebut 180 perempuan; figuran disederhanakan.

### 3 — Perintah Pertama (27–40 dtk; 390f)
Shot: 0–90f crane turun ke Sun Tzu; 90–150f insert pemukul genderang 2 dtk; 150–225f wide kelompok, dolly lateral; 225–285f CU tawa; 285–390f pull-back medium Dodi/Ara.
Gerak: tangan drummer naik (90–105f) → pukul (105–110f) → pantul (110–128f); Sun Tzu memberi aba-aba kanan (130–155f); A/B saling melirik (160–180f) → tertawa (180–230f); Sun Tzu telapak terbuka mengakui tanggung jawab (300–345f).
Label: PERINTAH BELUM JELAS → TANGGUNG JAWAB PANGLIMA.

### 4 — Kesempatan Kedua (40–53 dtk; 390f)
Shot: 0–90f medium penjelasan, push-in; 90–135f insert tangan menunjuk arah kiri (1,5 dtk); 135–225f pull-back peserta mengangguk; 225–285f CU tawa kembali; 285–390f wide raja, dolly mundur.
Gerak: tangan Sun Tzu beralih kanan → netral → kiri; peserta mengangguk → aba-aba kiri → tawa kedua; senyum raja memudar, Ara mulai khawatir.
Label: DIJELASKAN ULANG.

### 5 — Hukuman (53–69 dtk; 480f)
Shot: 0–100f tracking maju Sun Tzu lebih cepat; 100–160f CU telapak komando; 160–260f pull-back dua pemimpin; 260–330f CU Ara terkejut; 330–480f crane mundur memperlihatkan jarak raja dan halaman.
Gerak: Sun Tzu telapak mengunci (100–125f) → genderang berhenti; kedua pemimpin tertawa berhenti (160–185f) → saling menatap (185–220f); Ara tangan terangkat (260–290f). Kick kamera singkat 6–10f pada kata “mati”, bukan pada benturan manusia. Tidak ada aksi eksekusi.
Label: PERINTAH JELAS → TANGGUNG JAWAB PEMIMPIN KELOMPOK.

### 6 — Raja Menghentikan (69–83 dtk; 420f)
Shot: 0–75f medium raja berdiri, push cepat eased; 75–120f insert tangan memberi isyarat berhenti 1,5 dtk; 120–240f pull-back/tracking utusan menuruni tangga; 240–300f CU utusan; 300–420f wide Sun Tzu menolak, orbit lambat.
Gerak: raja condong → berdiri → tangan terulur; utusan membungkuk → berbalik → berjalan/turun tangga nyata → berhenti → menyampaikan pesan dengan gestur; Sun Tzu angkat telapak menolak. Tidak menciptakan surat atau stempel sebagai fakta.
Label: PERINTAH RAJA vs KOMANDO LAPANGAN.

### 7 — Barisan Berubah (83–97 dtk; 420f)
Shot: 0–65f kamera menyimpang ke panji/kayu paviliun; 65–83f dip singkat (tidak ada eksekusi/SFX tebasan); 83–180f wide pengganti maju; 180–240f CU genggaman tombak 2 dtk; 240–330f pull-back barisan berbelok; 330–420f medium Ara prihatin.
Gerak: dua pemimpin lama keluar frame tanpa penyeretan; cutaway; dua pengganti maju → peserta menegakkan tombak → belok serempak dengan kaki berpindah; Ara menurunkan tangan dan bahu. Hukuman hanya diceritakan Dodi.
Label: BARISAN TERTIB. Ara: “Tertib… karena takut” adalah interpretasi.

### 8 — Harga Kepatuhan (97–115 dtk; 540f)
Shot: 0–120f wide crane dari halaman; 120–210f medium pemandu bertingkat; 210–270f CU raja murung; 270–390f pull-back ke selasar; 390–540f dolly mundur + kartu pertanyaan dengan latar tetap bergerak.
Gerak: Dodi telapak terbuka → Ara menggeleng pelan → raja menoleh dari halaman; pemandu menatap penonton. Hindari wajah saling menutupi.
Label akhir: DISIPLIN ATAU KEKEJAMAN? / Kisah dalam Shiji • Dialog didramatisasi.

## 5. Audio, tipografi, dan gerbang persetujuan
- Sesudah setuju: dialog dodi+ara dengan VoxCPM2, satu kalimat utuh per take. Timing final menentukan durasi (target 100–120 dtk), mouth sync dan reaksi 0–3f sebelum kata.
- Musik perkusi/kecapi bernuansa Asia Timur secara stilisasi, bukan klaim musik otentik. Duck di bawah dialog; berhenti pada hukuman; tidak ada komedi/tawa sintetis pada penderitaan.
- SFX: langkah tanah/kayu, kain, angin, genderang, gesekan tombak. Tanpa suara pemenggalan.
- Subtitle 1–2 kata, kartu label Indonesia sederhana, cream/ink dengan aksen teal dan merah kusam. Safe area: judul tidak menutupi wajah, bawah aman UI Shorts.
- Ini paket desain. Sesudah persetujuan karakter/latar: naskah teknis dan audio, adegan final, lalu satu lembar kontak sekitar 24 frame pada scale 0.4 untuk persetujuan still terpisah. TIDAK render penuh sebelum persetujuan still tersebut.
- Sesudah persetujuan still: render per 300 frame atau Colab, mux, kompres <100 MB, ffprobe + cek frame dari MP4 final; kirim file + link exports di branch kerja.

## 6. Reproduksi preview
npm ci --no-audit --no-fund
npx remotion browser ensure
npx remotion still src/previewSunTzu.tsx SheetSunTzuKarakter exports/riset/suntzu-karakter.png --gl=swangle --overwrite
npx remotion still src/previewSunTzu.tsx SheetSunTzuEkspresi exports/riset/suntzu-ekspresi.png --gl=swangle --overwrite
Latar: scripts/build_suntzu_glb.py → public/models/suntzu-palace.glb; lihat suntzu-model-notes.md dan skrip render preview untuk sudut aman.
node scripts/render_suntzu_preview.mjs latar
node scripts/render_suntzu_preview.mjs properti
node scripts/render_suntzu_preview.mjs story
python3 scripts/compose_suntzu_preview.py

Pose 8 adegan hanyalah rancangan staging awal; belum memuat seluruh shot, gestur fisik, insert SVG, animasi panji/debu, maupun sinkron audio final. Pemeriksaan lintasan kamera bergerak dan serah-terima objek dilakukan pada tahap adegan setelah persetujuan. Entry preview terpisah agar komposisi lama di Root.tsx tidak berubah.

Tolong kirim seluruh revisi sekaligus, bernomor menurut karakter/latar/adegan. Persetujuan paket desain tidak otomatis memberi izin render video penuh.

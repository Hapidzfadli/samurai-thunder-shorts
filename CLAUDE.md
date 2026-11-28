# Aturan produksi video shorts (wajib diikuti setiap membuat/merevisi video)

Bahasa komunikasi dengan user: Bahasa Indonesia. Format video: vertikal 1080x1920, 30 fps.

## 1. Alur kerja (jangan dilompati)
1. **Riset dulu**: fakta cerita + sumber, ciri visual tokoh, latar (luar & dalam ruangan) dan properti era/tempatnya.
2. **Ajukan ke user dan tunggu persetujuan** sebelum membangun apa pun:
   - lembar karakter (nama & gender sesuai, pakaian, ekspresi wajah yang akan dipakai),
   - lembar properti per latar (setiap ruangan/lokasi punya properti lengkap, bukan latar kosong),
   - daftar adegan **plus daftar gerakan (action beats) per adegan** (lihat bagian 3).
3. Baru setelah disetujui: naskah + audio, lalu adegan, lalu still-check, lalu render.
4. **Cek frame dari file video final** (bukan hanya still) sebelum dikirim. Kirim via SendUserFile + link GitHub `exports/` (user tidak bisa unduh dari kartu lampiran).
5. Commit & push setiap selesai satu tahap; file kerja sementara (out/...) dimasukkan ke `.git/info/exclude`.

## 2. Tampilan
- Setiap latar padat properti (dinding bertekstur, perabot, dekorasi, lampu, tanaman, dll). Tidak ada ruangan kosong.
- Karakter: pakaian berdetail (lipatan/bayangan, kelim, aksesoris, alas kaki), ekspresi wajah tidak tertutup janggut/kumis/topi.
- Kamera tenang: glide lembut, push-in pelan, selalu menjauh lagi setelah close-up. Karakter tidak boleh saling menutupi wajah atau terpotong di tepi frame pada shot dialog.
- Background terang dan jelas kecuali cerita butuh malam.
- **Watermark kanal "PZClip" wajib di setiap video** (komponen `src/Watermark.tsx`, pojok kanan atas, semi-transparan; pasang di komposisi utama di atas grading, di bawah subtitle).

## 2b. Kualitas visual sinematik (acuan: video "Prisoner Who Tunneled Into a Bank" + Napoleon)
Gaya: latar 3D (Blender → GLB) + tokoh kartun 2D datar, tetapi harus terlihat **sinematik**, bukan stiker di ruangan kosong.
- **Pencahayaan**: tiap latar punya 1 sumber cahaya utama berarah jelas (sorot jendela/lampu) dan sisi lain lebih gelap; palet per adegan (dingin biru = tegang, hangat emas = akrab); adegan malam benar-benar gelap dengan cahaya dari lilin/lampu. Jangan cahaya rata.
- **Kamera**: ganti shot tiap 2-3 detik, tidak ada shot statis >3 detik. Paket per adegan: lebar → medium → close-up → insert tangan → lebar. Variasikan gerak (fly-through, push-in/pull-back, orbit lambat, crane, tracking), pakai sudut rendah/miring (roll 3-6°), easing halus. Bingkai tokoh dengan benda latar depan (jeruji, tiang, tepi meja) dan blur ringan di kejauhan.
- **Tokoh menyatu dengan latar**: bayangan jatuh nyata di lantai (bukan blob), rim light tipis di tepi, warna ambien dari lampu sekitar, garis tepi seragam tebalnya.
- **Detail bercerita**: papan nama, layar, label nomor, noda/karat/retak, kertas berserakan, figuran di latar belakang; tekstur kotor/lapuk, bukan permukaan "baru".
- **Atmosfer**: debu di sorot cahaya, daun, asap, bendera berkibar, kabut tipis untuk pemisahan lapisan, vignette + grading per adegan.
- Kirim pratinjau still (≥1 per jenis shot) dan minta persetujuan sebelum render.
- **Perkakas siap pakai: `src/cinemaKit.tsx`** (contoh pakai: `src/UjiSinema.tsx`, komposisi `UjiSinema`):
  - `CineStage` + `LIGHT_PRESETS` (siang/senja/malam/tegang/akrab): 1 lampu utama berarah + hemisphere gelap + bayangan nyata; `GlbWorld` memuat GLB dengan `invalidate/advance`.
  - `buildShots({dur, focus, targets, front, reach, style})` membuat paket shot otomatis (lebar/medium/close-up/sudut rendah-miring/crane/orbit, ganti ±2-2,6 detik) → `shotCam(frame, shots)`. `focus` = titik LANTAI; `targets` = posisi kaki tokoh (medium/close-up bergantian menyorot tokoh). `front` = azimut kamera di koordinat Three.js (`atan2(z, x)`, ingat z = -y Blender).
  - `cineCard(cam, preset)` → props `BeanCard` (`tint`, `shade`, `rim`, `lightSide`, `realShadow`) agar tokoh punya bayangan jatuh nyata + rim light.
  - `Foreground` (jeruji/tiang/tepi) untuk bingkai depan; `CineGrade` untuk grading + vignette.
  - Keterbatasan: `buildShots` tidak tahu properti latar. Cek still tiap shot; ruangan dengan meja/tiang besar (mis. tenda Napoleon) perlu kamera manual atau `targets`/`front` disetel agar tidak terhalang.
- **Tokoh hidup seperti referensi (wajib direncanakan di daftar gerakan per adegan)**:
  - **Arah hadap mengikuti gerak**: tokoh tidak selalu menghadap kamera. Yang berjalan/lari menjauh tampak belakang (`back: true` di BeanParams), yang lewat menyamping tampak samping/profil, yang mendekat tampak depan. Jangan pakai kartu depan untuk tokoh yang bergerak menjauh (terlihat lari mundur). Tampak samping/tiga-perempat belum ada di `drawBean`: bila adegan butuh, buat dulu untuk tokoh yang dipakai saja.
  - **Pose sesuai aksi**: berdiri saja tidak cukup. Rencanakan pose duduk (kursi/kasur, kaki menekuk), jongkok/berlutut, berbaring, merangkak, menggali, membawa beban, memanjat, muncul dari lubang. Lari pakai `runPose` + jalur `linePath`/`recedeCam` (`src/motionKit.tsx`), tokoh harus benar-benar berpindah tempat (menjauh/mendekat/melintas), bukan berputar di tempat.
  - **Menyatu dengan latar**: tokoh boleh tertutup sebagian (di dalam lubang hanya kepala, di balik kasur/jeruji, kaki menggantung di tepi ranjang); kontak dengan perabot harus pas (pantat di dudukan, tangan di meja).
  - **Benda di tangan**: tiap tokoh yang beraksi memegang benda yang relevan (sekop, cangkir, koper, karung, papan klip) lewat `beanHandWorld`, bukan digambar menyatu.
  - **Skala ekstrem**: selang-seling close-up wajah yang memenuhi layar dengan tokoh kecil di ruang besar.
  - **Shot penampang (cutaway)** untuk cerita bawah tanah/di dalam dinding/terowongan: irisan latar memperlihatkan tokoh kecil bergerak di dalamnya (model Blender khusus).
  - **Ekspresi + gag visual**: kacamata hitam, gigi meringis, keringat, wajah puas/licik; reaksi tiap kalimat penting.
- **Checklist pratinjau (cek sebelum kirim lembar kontak)**: tiap adegan ≥3 shot berbeda; ada 1 sumber cahaya berarah dengan sisi gelap yang terlihat; bayangan tokoh jatuh di lantai; ada benda bingkai depan di sebagian shot; tokoh tidak terhalang properti; adegan malam benar-benar gelap; **arah hadap tokoh sesuai arah geraknya; ada ≥1 pose selain berdiri per adegan aksi; tokoh yang lari/jalan benar-benar berpindah tempat.**

## 3. GERAKAN HARUS MASUK AKAL (aturan paling penting)
Setiap aksi yang disebut narasi harus **terlihat dikerjakan dengan tangan/tubuh**, tidak boleh "tiba-tiba sudah terjadi".
- **Benda penting (botol, sumbat, telur, surat, HP, dll) dibuat sebagai objek 3D terpisah** yang posisinya mengikuti titik tangan karakter yang memegang (pakai `beanHandWorld` di `src/three/objectsBean.tsx`), BUKAN digambar di dalam gambar karakter. Dengan begitu benda bisa berpindah tangan.
- **Serah-terima** dipecah: mendekat → menjulurkan tangan → tangan penerima terjulur → benda berpindah (terlihat melayang dari tangan ke tangan dalam 10-20 frame) → penerima menarik benda ke badannya.
- **Aksi kecil (membuka tutup, mencabut sumbat, menulis, menekan tombol, memasukkan sesuatu)** wajib punya **close-up insert** (ilustrasi SVG tangan besar bergaya sama) 1-2 detik, lalu kembali ke shot lebar.
- Arah aksi harus benar secara fisik: mis. menangkap kentut = mulut botol diarahkan ke belakang/bokong, gas terlihat masuk ke botol, lalu disumbat.
- Setiap reaksi muncul 0-3 frame sebelum kata yang memicunya di narasi.
- Tulis daftar gerakan per adegan sebelum membangun, contoh:
  `serah botol: Abu jalan ke depan singgasana (0-40f) → membungkuk & julurkan botol (40-55f) → Raja julurkan tangan (50-60f) → botol pindah (60-75f) → Raja tarik botol ke dada (75-90f)`.

## 4. Suara
- **Pengisi suara standar (pilihan user, wajib dipakai lebih dulu di setiap video baru):** 5 suara bersih di `voices/pengisi_suara.json` →
  `dodi` (narator utama/bawaan, juga pria muda), `nadia` (narator wanita serius/sejarah), `nadia_ceria` (narator wanita komedi),
  `butini` (ibu-ibu/ibu kos), `ara` (cewek muda polos). Pilih per baris naskah (kolom ke-3) atau per adegan (`"voice"`).
  **Favorit user: `dodi` + `ara`.** Utamakan dua ini: `dodi` = narator & tokoh pria, `ara` = tokoh wanita/cewek (juga narator wanita bila perlu).
  `nadia`, `nadia_ceria`, `butini` hanya cadangan, mis. saat ada dua tokoh wanita yang suaranya harus beda.
  Suara lain (bank_karakter, dll.) hanya dipakai bila tokoh butuh suara yang tidak ada di lima ini, dan sebutkan alasannya ke user.
- Narasi pakai suara klon dengan penekanan kata (emph), intonasi naik untuk pertanyaan, pelan/berbisik untuk momen licik.
- **Mesin suara standar: VoxCPM2** (`scripts/voice_vox.py`, jalankan dengan `.venv/bin/python`). Patokan yang dipilih user: `exports/riset/suara/voxcpm2-pembuka-perang-emu.mp3`. Mode referensi (contoh suara dodi per emosi, dipotong di batas kalimat) + tag gaya per kalimat (narasi/santai/tegang/tegas/bisik). Jangan pakai mode lanjutan (prompt_text): tag gaya ikut terbaca.
- **Narasi tidak boleh tersendat**: satuan = kalimat UTUH, jangan pecah jadi frasa pendek lalu disambung (hasilnya cepat-berhenti-cepat-berhenti). Jeda pecahan hanya untuk efek komedi yang disengaja ("perang... melawan burung"). Whisper memilih take terbaik; loudness dinormalisasi seluruh trek. Timing kata ada di `src/<nama>_voice.json` untuk sinkron reaksi.
- Siapkan `.venv` bila belum ada: `python3 -m venv --system-site-packages .venv && .venv/bin/pip install omnivoice==0.2.1 && .venv/bin/pip install --no-deps voxcpm==2.0.3 inflect addict simplejson sortedcontainers argbind` (model diunduh otomatis dari Hugging Face).
- **Tawa tidak boleh datar**: pakai tawa sintetis dari suku kata (`scripts/laugh_lab.py`, hasil di `exports/riset/tawa/`), naik-turun nada, melambat, ada tarikan napas; tawa ramai = beberapa lapis.
- Setiap aksi penting punya efek suara (langkah, pintu, botol, sumbat "pop", angin, dll). Musik ducking di bawah suara.

## 5. Teknis yang sering salah
- Kartu karakter 2D harus dibuat ulang tiap frame (DataTexture baru) atau akan kosong di render video.
- Jangan import `*_timing.json` yang belum ada dari `src/Root.tsx` (bundle gagal).
- Render: `npx remotion render src/index.ts <Comp> out/<x>-silent.mp4 --gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell --concurrency=4 --muted`, lalu mux dengan ffmpeg ke `exports/<judul>.mp4`. Periksa nama file output skrip render setelah meng-copy skrip lama.
- Topik politik/tokoh nyata: tokoh terduga dibuat fiktif, selalu "diduga", kartu parodi + praduga tak bersalah.
- **Pipeline Blender → GLB → Remotion (pelajaran Napoleon)**:
  - Setelah GLB termuat di `@remotion/three`, panggil `invalidate()`/`advance()` dari `useThree` sebelum `continueRender`, kalau tidak latar kosong di render. Clone scene per komponen; tampilkan hanya node latar aktif (+ "Langit").
  - Tokoh berrangka (skinned) dari Blender gagal tampil di Remotion: pakai kartu 2D.
  - Cek kamera dari semua shot: jangan ada properti (kursi, tiang, meja) yang menghalangi tokoh; kamera vertikal sempit, fov interior 40-55. Pakai `blender ... -- <out> none public/models/<x>.glb` untuk ekspor ulang.
  - Container cloud dimatikan saat idle dan menghentikan proses latar: render panjang dipotong per 300 frame (`--frames=a-b`, gabung `ffmpeg concat`) atau pakai Colab T4 (`colab/render_napoleon.ipynb`, ±40 menit). Kompres video akhir (crf 24) agar <100 MB sebelum di-push.
- **ATURAN USER: setiap render video (mp4) dilakukan di Google Colab** (`colab new --gpu T4 --high-mem`), termasuk uji pendek. Still-check (gambar diam untuk lembar kontak) boleh lokal. Jangan render video di container cloud ini kecuali user menyuruh. Render di Colab (T4, ±40 menit untuk 3.300 frame):
  - Notebook siap pakai: `colab/render_napoleon.ipynb` (salin dan ganti `BRANCH`, `COMP`, `AUDIO`, `OUT_NAME`). Runtime T4 GPU; secret `GITHUB_TOKEN` (read) di panel Secrets; mode `--gl=angle-egl`; hasil + audio digabung dan disalin ke Drive `MyDrive/shorts-render/`. Uji 10 detik dulu dengan `FRAMES="0-299"`.
  - Alur per render: (1) `colab new -s <nama> --gpu T4 --high-mem`; (2) minta user menyetujui host runtime di environment (alamat `*.prod.r.colab.dev` unik per sesi, tambahkan host persisnya lewat update_environment); (3) tar proyek (package*.json, tsconfig, remotion.config.ts, src, public/models, **semua `public/**/*.json`** karena `src/Root.tsx` mengimpornya — tanpa itu bundel gagal, + audio komposisi) lalu `colab upload`; (4) jalankan skrip setup+render di runtime secara **latar belakang** (nohup, tulis log ke file) karena `colab exec` memutus koneksi bila 30 detik tanpa keluaran; pantau log dengan `colab exec`/`ls`; (5) `colab download` hasilnya, mux audio, QA frame, kirim; (6) selalu `colab stop` setelah selesai agar compute unit tidak terbuang.
  - Colab CLI (`pip install -U google-colab-cli`, perintah `colab new --gpu T4`, `colab exec`, `colab download`, `colab usage`): login dari container butuh `gcloud auth application-default login --no-launch-browser --scopes=openid,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/colaboratory`, lalu pakai `colab --auth adc ...`. Kode verifikasi hanya berlaku selama proses login hidup (jaga container tetap aktif, mis. dengan Monitor). Host yang harus diizinkan di environment: `colab.research.google.com`, `colab.pa.googleapis.com`, `oauth2.googleapis.com`, `www.googleapis.com`.
  - Sebelum membuat runtime, cek saldo `colab usage` dan minta persetujuan user (memakai compute unit, ±1-2 unit/jam untuk T4). Hentikan runtime (`colab stop`) setelah selesai.

## 6. Gaya standar & perkakas yang dipakai ulang (jangan menulis ulang dari nol)
- Gaya video standar = **3D explainer** (referensi Apache, contoh: `exports/perang-emu-1932.mp4`, `exports/kerja-kelompok.mp4`):
  - toon + garis tepi, tokoh kepala bulat 3D, efek X-ray, hologram grid biru, layar terbelah, subtitle 1 kata;
  - judul pancingan rasa penasaran di 2–3 detik pertama.
- **Referensi gaya latar 3D arsitektur & transisi luar-ke-dalam (pilihan user untuk video cerita berikutnya)**: **Blender Headless → `.glb` → Remotion (`@remotion/three`)** (panduan lengkap: `analysis/text/referensi_blender_25d_flythrough.md`, video contoh: `exports/riset/referensi-blender-sekolah.mp4`):
  - bangun gedung eksterior + interior menyatu (dengan lubang jendela/pintu Boolean nyata & tekstur prosedural *packed*) lewat skrip Python Blender headless (pola: `scripts/build_school_glb.py` → `public/models/school.glb`);
  - di Remotion, load `.glb` sekali (`GLTFLoader` + `delayRender`), pakai kamera `CatmullRomCurve3` untuk *fly-through* mulus dari luar gedung masuk ke dalam ruangan tempat cerita berlangsung (pola: `src/SchoolFlythrough.tsx`);
  - gabungkan dengan karakter cerita (`Bean3` 3D atau cutout 2D di ruang 3D), gerakan fisik masuk akal (bagian 3), dan dialog VoxCPM2 `dodi` + `ara` (bagian 4).
- Perkakas:
  - `src/three/toon.tsx`: `Bean3` (tokoh; tangan → `bean3HandWorld`), `Hat`, `T`/`Limb`/`G` (bentuk toon), `XR` + `BlueGrid` (X-ray/hologram), `CanvasPlane` (teks/layar/kertas), `WordSub`;
  - `src/sceneKit.tsx`: `shotCam`, `pullBack`, `Stage`, `SubWord`, `Chip`, `BigTitle`, `walkLerp`, `talkAt`;
  - properti siap pakai:
    - `objectsEmu.tsx`, `objectsEmu2.tsx`: ladang, truk, kantor, kemah, efek tembak;
    - `objectsKelompok.tsx`: kelas, kos, kafe, HP, laptop, kalender, chat 3D.
- Audio:
  - suara: `scripts/voice_vox.py naskah.json <nama>`; bisa melanjutkan proses yang terhenti; potongan per kalimat disimpan di `out/voice/<nama>/`;
  - mix + jadwal: salin pola `scripts/build_audio_kelompok.py` (`SCENE_CFG` + `EVENTS` dipakai bersama efek suara & animasi; efek suara diambil dari `build_audio_emu.py`).
- Pola file per video:
  - kode: `scripts/naskah/<x>.json` → `scripts/build_audio_<x>.py` → `src/scenes<X>.tsx` + `src/<X>.tsx` + `src/Sheet<X>.tsx`;
  - render: `out/l30/render_<x>.sh`.
- Kamera vertikal 1080×1920 sangat sempit ke samping:
  - pada jarak 4 m hanya ±0,9 m kiri-kanan yang terlihat;
  - tokoh berbaris dibuat bertingkat (depan/belakang), bukan berjajar;
  - cek proyeksi sebelum still.

## 7. Hemat token
- **Satu sesi = satu video.** Mulai sesi baru untuk tiap video baru; aturan & perkakas sudah ada di repo, jadi riwayat lama tidak perlu.
- Sebelum membangun, minta persetujuan lembar karakter/properti/adegan dalam **satu** kali kirim; revisi rancangan jauh lebih murah daripada revisi video.
- Minta user mengirim **semua catatan revisi sekaligus** setelah menonton (bernomor, dengan detik), lalu kerjakan sekaligus dalam satu putaran.
- Still-check hemat:
  - satu lembar kontak (±12–20 frame kecil, `--scale=0.5`) per putaran, bukan banyak gambar terpisah;
  - render ulang hanya frame yang diperbaiki.
- Saat render berjalan: jalankan di latar belakang dengan notifikasi selesai; jawab pertanyaan progres singkat tanpa membaca file besar.
- Jangan membaca ulang file besar yang isinya sudah diketahui; edit dengan potongan kecil.

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
- Narasi pakai suara klon dengan penekanan kata (emph), intonasi naik untuk pertanyaan, pelan/berbisik untuk momen licik.
- **Narasi harus mengalir, tidak tersendat**: buat suara per adegan dalam satu tarikan (2-4 kalimat utuh sekaligus), JANGAN memotong kalimat jadi frasa pendek lalu disambung (hasilnya cepat-berhenti-cepat-berhenti). Referensi suara dipotong di batas kalimat utuh + transkripnya (mode lanjutan VoxCPM2: `scripts/tts_lab_smooth.py`), normalisasi loudness seluruh trek (bukan per frasa). Cek: kecepatan ~2,4-3 kata/detik, tidak ada jeda aneh di tengah kalimat.
- **Tawa tidak boleh datar**: pakai tawa sintetis dari suku kata (`scripts/laugh_lab.py`, hasil di `exports/riset/tawa/`), naik-turun nada, melambat, ada tarikan napas; tawa ramai = beberapa lapis.
- Setiap aksi penting punya efek suara (langkah, pintu, botol, sumbat "pop", angin, dll). Musik ducking di bawah suara.

## 5. Teknis yang sering salah
- Kartu karakter 2D harus dibuat ulang tiap frame (DataTexture baru) atau akan kosong di render video.
- Jangan import `*_timing.json` yang belum ada dari `src/Root.tsx` (bundle gagal).
- Render: `npx remotion render src/index.ts <Comp> out/<x>-silent.mp4 --gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell --concurrency=4 --muted`, lalu mux dengan ffmpeg ke `exports/<judul>.mp4`. Periksa nama file output skrip render setelah meng-copy skrip lama.
- Topik politik/tokoh nyata: tokoh terduga dibuat fiktif, selalu "diduga", kartu parodi + praduga tak bersalah.

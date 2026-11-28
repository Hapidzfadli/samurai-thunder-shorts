---
name: dialog-short-remotion
description: Buat video Shorts vertikal animasi kartun BERDIALOG (Dodi pria + Ara wanita, plus sedikit narasi) dengan Remotion + Three.js di repo Hapidzfadli/samurai-thunder-shorts. Alur lengkap seperti "Bom Kelelawar 1943": ide dari fakta unik, lembar karakter/properti untuk disetujui, naskah, suara VoxCPM2, mix audio + SFX + musik, 8 adegan ekspresif, render, mux, QA, kirim. Pakai untuk permintaan "buat video animasi/short/cerita dialog Dodi dan Ara" atau "seperti Bom Kelelawar".
---

# Dialog Short (Remotion): ide → rancangan → suara → animasi → MP4

Contoh jadi: **Bom Kelelawar 1943** (`exports/bom-kelelawar-1943.mp4`, 85 dtk, 8 adegan). Seluruh kodenya ada di repo dan menjadi template. Jangan menulis ulang dari nol: salin pola file Kelelawar, ganti isi cerita.

## 0. Siapkan repo (wajib, sebelum apa pun)
- Repo: `Hapidzfadli/samurai-thunder-shorts`, branch `main`. Bila belum ada di sesi: `add_repo` lalu clone, lalu `register_repo_root`.
- Baca `CLAUDE.md` di repo (aturan produksi: bahasa Indonesia, 1080x1920, 30 fps, alur persetujuan, aturan gerakan, aturan suara). Aturan itu MENGALAHKAN skill ini bila bertentangan.
- Cabang kerja: ikuti instruksi sesi (mis. `claude/<nama>`). Jangan push ke `main` tanpa diminta. Commit & push tiap selesai satu tahap.
- Mesin cloud biasanya tanpa GPU. `.venv` (VoxCPM2) dan `node_modules` ada di repo; bila `.venv` hilang, lihat bagian Suara di `CLAUDE.md`.
- Satu sesi = satu video.

## 1. Intake
Tanyakan hanya yang belum jelas: cerita/ide, durasi (default 60-90 dtk; naskah dialog cenderung LEBIH PANJANG dari estimasi, ±85 dtk untuk 175 kata), apakah ada narasi. Pengguna biasa memilih: **dialog Dodi & Ara + sedikit narasi Dodi di pembuka/penutup**.

Bila belum ada ide: beri 10 ide (judul, hook, twist, "kenapa seru dianimasikan", **benar/legenda/folklor**). Verifikasi fakta dengan web search sebelum menyebut sebagai fakta; legenda dibingkai "legend says". Tokoh sejarah nyata hidup dan merek tidak dijadikan bahan lelucon; tokoh dialog selalu fiktif.

## 2. Riset → rancangan (WAJIB disetujui pengguna sebelum membangun)
Kirim SEKALI dalam satu paket:
1. `exports/riset/<x>-karakter.png`, `<x>-ekspresi.png`, `<x>-properti.png` (render `SheetXKarakter/Ekspresi/Properti`).
2. `exports/riset/<x>-rancangan.md`: fakta + sumber (tautan), karakter, latar & properti, 8 adegan dengan naskah per baris `[suara · gaya] kalimat`, **daftar gerakan per adegan** dengan rentang frame (aturan paling penting di CLAUDE.md), arah kamera, insert close-up tangan untuk aksi kecil.
3. Ringkas ke pengguna; tunggu kata "setuju/lanjut".

Template kode: `src/SheetKelelawar.tsx`, `src/three/objectsKelelawar.tsx`. Daftarkan sheet di `src/Root.tsx`. Render still: `npx remotion still src/index.ts SheetXKarakter exports/riset/x-karakter.png --gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell --overwrite`.

### Karakter (kartu 2D `BeanCard` di dunia 3D)
- `BeanParams` di `src/three/objectsBean.tsx` (topi: `cap`, `sanggul`, `officer`, `kerchief`, `bowler`, ...; ekspresi: neutral, worried, shock, angry, smug, scared, happy, sad, sleepy, talk, laugh, disgust, think).
- **Dodi = pria** (topi), **Ara = wanita**. Wanita harus terbaca wanita: pakai `hat: "sanggul"` + rok/`batik`, JANGAN topi lapangan (terbaca pria).
- Figuran tanpa suara boleh (dokter, jenderal); semua fiktif.
- Properti 3D memakai `InkBox`/`P` (garis tepi). Pakai ulang properti repo (`objectsMolase*`, `objectsBandung`, `objectsSby`, `objectsSoda`) dan tulis yang baru di `objects<X>.tsx`.
- Gerak/serah-terima benda penting = objek 3D terpisah mengikuti `beanHandWorld`; aksi kecil = **insert close-up tangan SVG** 1-2 dtk (lihat komponen `Insert`/`HandSvg` di `src/scenesKelelawar.tsx`).

## 3. Suara (VoxCPM2, pengisi suara standar)
- Suara bersih ada di `voices/pengisi_suara.json`. **Favorit: `dodi` (narator + pria) dan `ara` (wanita).** `nadia`, `nadia_ceria`, `butini` hanya cadangan.
- Naskah: `scripts/naskah/<x>.json` = daftar adegan, tiap baris `[gaya, "kalimat utuh", "suara"]`, gaya: narasi | santai | tegang | tegas | bisik. Satuan = kalimat UTUH; jeda pecahan hanya untuk punchline komedi. Angka ditulis dengan kata ("seribu sembilan ratus empat puluh tiga").
- Jalankan di LATAR BELAKANG (Bash `run_in_background`), ±1 jam untuk 22 kalimat di CPU 4 core; jangan menjalankan render berat bersamaan (memperlambat keduanya):
  `.venv/bin/python scripts/voice_vox.py scripts/naskah/<x>.json <x> > out/voice_<x>.log 2>&1`
- Hasil: `src/<x>_voice.json` + `out/voice/<x>/*.wav`. Skor Whisper rendah (<0,9) sering hanya karena angka ditulis digit; periksa teksnya sebelum mengulang.
- Colab (GPU) bisa mempercepat suara; render video: `colab/render_remotion.ipynb`.

## 4. Mix audio + jadwal kata
- Salin `scripts/build_audio_kelelawar.py` → `build_audio_<x>.py`. Ubah: `SCENE_CFG` (pre/post/gaps per adegan; jeda lebih panjang sebelum punchline), `EVENTS` (adegan, indeks baris, kata, offset frame; reaksi 0-3 frame SEBELUM kata), `HIGHLIGHTS`, urutan SFX per adegan, kurva musik (`ip_t/ip_v`) dan `mutes` (musik berhenti di jeda komedi & twist).
- Dodi sedikit kiri, Ara sedikit kanan di stereo. Musik di-duck di bawah suara; loudnorm -14 LUFS.
- Keluaran: `public/audio/<x>_master.mp3` + `src/<x>_timing.json` (urutan, durasi adegan, baris+kata, events, captions 1-2 kata dengan `voice`).
- **Jadwal sementara**: saat suara masih diproses, bangun `src/<x>_timing.json` dari estimasi (≈0,12 dtk + 0,065 dtk/huruf per kata) agar adegan bisa dikode dan di-still-check lebih awal; ganti dengan jadwal asli setelah suara selesai lalu cek ulang framing.

## 5. Adegan (`src/scenes<X>.tsx` + `src/<X>.tsx`)
Salin `src/scenesKelelawar.tsx` dan `src/Kelelawar.tsx`. Mesin yang sudah ada di file itu:
- `shotCam` (glide halus + `ease:"out"`), `kick` (guncangan), `Stage`, `Lights`, `Grade` (hangat/dingin/flash/panas), `Rig`.
- Sinkron suara: `mouth(scene, voice, f)` (mulut hanya bergerak saat kata suara itu diucapkan), `speaking`, `nod` (anggukan di kata panjang), `wordF(scene, i, "kata")`, `EV["event"]`.
- Overlay: `Chip`, `Stamp`, `Emote`, `BigTitle`, `HoloPanel` (layar terbelah hologram), `Insert` (close-up tangan), `KelelawarCaptions` (caption 1-2 kata, warna tepi beda per suara).
- Karakter tidak pernah beku: `idle`, kedip, gestur saat bicara (`gesture`), anticipation + squash saat aksi.
- Kamera vertikal sempit: pada jarak 4 m hanya ±0,9 m ke kiri-kanan; tokoh dibuat bertingkat (depan/belakang) bila berdua. Wajah tidak boleh terpotong tepi atau tertutup properti.
- Daftarkan komposisi di `src/Root.tsx` dengan `defaultProps={{ withAudio: false }}`. Jangan import `*_timing.json` yang belum ada (bundle gagal).
- Cek tipe: `npx tsc --noEmit -p . | grep -i <x>`.


## 5b. Latar arsitektur 3D (gedung/kelas) + kamera terbang masuk: Blender headless → GLB → Remotion
Dipilih pengguna untuk cerita bersetting gedung (sekolah, kantor, lab). Contoh jadi: `exports/riset/referensi-blender-sekolah.mp4`; panduan: `analysis/text/referensi_blender_25d_flythrough.md`; aturan di `CLAUDE.md` bagian 6.
- **Blender hanya membuat model; Remotion yang merender** (cahaya, bayangan, kamera, tokoh ada di Three.js). Jangan merender gambar akhir dari Blender.
- Model: `scripts/build_school_glb.py` (pola) → `blender --background --python scripts/build_<x>_glb.py -- public/models/<x>.glb`. Pasang Blender bila belum ada: `apt-get install -y blender python3-numpy` (butuh numpy, dan `libegl1` untuk render EEVEE; tidak perlu untuk ekspor GLB).
- **Tekstur harus lewat UV asli + material Principled** supaya ikut ke GLB (pakai `set_box_uv`, tekstur numpy di-`pack()`). Proyeksi kotak/shader kustom di dalam material TIDAK terekspor (jadi warna polos).
- **Lubang nyata** (modifier Boolean) untuk jendela/pintu yang dilewati kamera; sediakan lorong tengah bersih untuk jalur kamera; beri objek kosong `WP_Cam_*` / `WP_Char_*` sebagai patokan koordinat.
- Koordinat Blender → Three.js (`export_yup=True`): X=X, Y=Z (tinggi), Z=-Y.
- Remotion: muat GLB sekali (cache tingkat modul + `delayRender`/`continueRender`, lepaskan penantian SETELAH state terpasang), kamera `THREE.CatmullRomCurve3` untuk posisi DAN titik pandang (ease in-out), sun + `shadow-mapSize` 1024 (cukup, 2-3x lebih cepat), langit senja dari shader kubah.
- **Karakter = kartu 2D (`BeanCard`) atau cutout 2D di ruang 3D**, bukan model 3D berrig/Mixamo. Uji model berrig di Remotion pernah gagal tampil; pengguna juga lebih suka gaya kartu 2D.
- Latar buatan sendiri di Blender sudah dicoba (`blender/sekolah*.py`, gaya low-poly lembut); untuk proyek nyata pakai pola `build_school_glb.py` agar teksturnya terbawa.

## 5c. Kualitas sinematik (cahaya, kamera, bayangan) — pakai `src/cinemaKit.tsx`
Agar video tidak datar: bangun adegan dengan `CineStage` + preset cahaya (`LIGHT_PRESETS`), kamera dari `buildShots(...)` + `shotCam(...)`, tokoh dengan `cineCard(...)` (bayangan nyata + rim light), dan `Foreground` untuk bingkai depan. Ganti shot tiap 2-3 detik. Contoh lengkap: `src/UjiSinema.tsx`. Aturan lengkap + checklist pratinjau: `CLAUDE.md` bagian 2b. Cek tiap shot di still: properti latar bisa menghalangi kamera otomatis.

## 6. Still-check hemat (satu lembar kontak)
Skrip render still memakai `@remotion/renderer` dan harus berada di root repo agar modul ditemukan (jangan di-commit; masukkan ke `.git/info/exclude`):
```js
// _stills_x.mjs  -> node _stills_x.mjs <Comp> <outDir> <f1,f2,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
// bundle({entryPoint:'src/index.ts'}) -> selectComposition -> renderStill(frame, scale 0.4, imageFormat jpeg)
// chromiumOptions {gl:'swangle'}, browserExecutable '/opt/pw-browsers/chromium_headless_shell'
```
Pilih ±23 frame: tiap momen penting (hook, judul, insert tangan, reaksi, ledakan, punchline akhir). Rakit jadi satu lembar (Pillow, 6 kolom) dan LIHAT sebelum render penuh. Perbaikan yang lazim: judul menutupi tokoh, wajah terpotong, tangan kaku di insert, karakter wanita terbaca pria, properti besar menutupi wajah, terlalu banyak bongkahan di mulut gua.

## 7. Render penuh + mux + QA
- Render bisu di latar belakang lalu mux (`out/render_<x>.sh`):
  `npx remotion render src/index.ts <Comp> out/<x>-silent.mp4 --gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell --concurrency=4 --muted --crf=18`
  `ffmpeg -i silent.mp4 -i public/audio/<x>_master.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart exports/<judul>.mp4`
- Perkiraan: 2.554 frame ≈ 40 menit di 4 core CPU; di Colab T4 `--gl=angle-egl` ≈ 0,75 dtk/frame (≈32 menit).
- **QA dari file video final** (bukan hanya still): `ffprobe` (1080x1920, 30 fps, durasi), `ffmpeg -vf "freezedetect=n=0.003:d=0.6,blackdetect=d=0.3"`, `ffmpeg -af ebur128` (≈ -14 LUFS), lalu lembar kontak `fps=1/4,tile=6x4` dan lihat. Beku ≥0,6 dtk atau layar hitam = perbaiki.
- Kirim: `SendUserFile` (display render) + tautan GitHub `exports/<judul>.mp4` (kartu lampiran kadang tak bisa diunduh). Ringkas isi tiap adegan, sebutkan catatan jujur (durasi melebihi target, skor suara rendah).
- Minta revisi dikirim SEKALIGUS, bernomor dengan detik, lalu kerjakan satu putaran.

## 8. Pelajaran dari Bom Kelelawar (hindari pengulangan)
- Dialog lebih panjang dari estimasi kata → target kata ~20% lebih sedikit atau terima ±85 dtk.
- Jeda komedi (mute musik + jangkrik) sebelum punchline membuat lucu; stamp/emote ("PERSIS!", "HAH?!") menghidupkan reaksi.
- Insert tangan: gambar jari kapsul + telapak oval, bukan jari lurus kaku.
- Wajah Ara terpotong saat menunjuk → kamera adegan itu harus lebih lebar/bergeser.
- `remotion still` butuh `--overwrite` bila file sudah ada.
- Karakter 3D Blender/Mixamo sudah dicoba dan ditolak (pengguna memilih kartu 2D). Blender dipakai HANYA untuk latar arsitektur (lihat 5b).

## Peta file template (Bom Kelelawar)
`scripts/naskah/kelelawar.json` · `scripts/build_audio_kelelawar.py` · `src/scenesKelelawar.tsx` · `src/Kelelawar.tsx` · `src/SheetKelelawar.tsx` · `src/three/objectsKelelawar.tsx` · `exports/riset/kelelawar-*.png|md` · `voices/pengisi_suara.json` · `scripts/voice_vox.py` · `colab/render_remotion.ipynb` · latar Blender: `scripts/build_school_glb.py`, `src/SchoolFlythrough.tsx`

# Referensi Pipeline 3D Arsitektur & Fly-Through (Blender Headless → Remotion)

Terinspirasi dari gaya animasi cerita 2.5D YouTube Shorts (seperti `@Dasiman3d` — kamera terbang mulus dari luar gedung masuk ke dalam ruangan kelas dengan karakter 2D/3D di dalamnya).

## 1. Aset & Contoh Referensi di Repo
- **Video contoh final**: `exports/riset/referensi-blender-sekolah.mp4` (1080×1920, 30fps, 6 detik)
- **Skrip generator 3D Blender headless**: `scripts/build_school_glb.py`
- **Model GLB hasil ekspor**: `public/models/school.glb` (2,6 MB, *self-contained* dengan tekstur *packed*)
- **Komposisi Remotion contoh**: `src/SchoolFlythrough.tsx` (terdaftar di `src/Root.tsx` sebagai `SchoolFlythrough`)

---

## 2. Alur Produksi untuk Video Cerita Berikutnya

Saat membuat video cerita baru memakai gaya ini, tetap ikuti **aturan wajib `CLAUDE.md`**:
1. **Riset & Rancangan Cerita** → ajukan lembar karakter, lembar properti per latar (eksterior + interior), dan daftar adegan + *action beats* ke user sebelum membangun.
2. **Bangun Latar 3D di Blender Headless (`scripts/build_<nama>_glb.py`)**:
   - Instal Blender bila belum ada di VM: `sudo apt-get update && sudo apt-get install -y blender python3-numpy`.
   - Ekspor `.glb` dalam ~1 detik:
     ```bash
     blender --background --python scripts/build_<nama>_glb.py -- public/models/<nama>.glb
     ```
   - **Wajib lubang nyata (*Boolean*)** untuk jendela/pintu tempat kamera terbang masuk dari luar ke dalam ruangan, sehingga eksterior dan interior benar-benar menyatu dalam 1 dunia 3D.
   - **Berikan *Waypoint Empties*** (`WP_Cam_*`, `WP_Char_*`) untuk patokan koordinat kamera & tokoh.
   - **Tekstur prosedural *packed* via `numpy` + `bpy.data.images`** (papan lantai kayu bergaris komik, genteng, papan tulis, lukisan, stuko) — tidak butuh file gambar eksternal dan 100% terbawa ke `.glb`.
3. **Animasi Cerita di Remotion (`@remotion/three`)**:
   - Load `.glb` sekali saja (cache *module-level* + `delayRender()` / `continueRender()`).
   - **Kamera pembuka sinematik (*establishing → fly-through*)**: gunakan `THREE.CatmullRomCurve3` untuk jalur terbang mulus dari luar gedung → menembus jendela/pintu → masuk ke ruangan tempat cerita dimulai.
   - **Lanjut adegan cerita di dalam ruangan**: setelah kamera mendarat di dalam ruangan, lanjutkan adegan dialog/aksi seperti standar `CLAUDE.md` (`shotCam`, `pullBack`, reaksi 0–3 frame sebelum kata pemicu, properti terpisah yang bisa dipindah tangan, *close-up insert* aksi kecil, suara standar VoxCPM2 `dodi` + `ara`).
   - **Karakter**: bisa memakai **karakter 3D `Bean3`** (`src/three/toon.tsx`) ATAU **karakter cutout 2D** bergaris tepi tebal (ditempatkan sebagai *plane* transparan di ruang 3D agar otomatis kena perspektif & *occlusion* di belakang meja/perabot 3D).

---

## 3. Aturan Teknis & Anti-Bug (Pelajaran dari Prototipe Sekolah)
- **Konversi koordinat Blender → Three.js (`export_yup=True`)**:
  - `Three.X =  Blender.X`
  - `Three.Y =  Blender.Z` (tinggi)
  - `Three.Z = -Blender.Y` (depan/Selatan = `+Z`, belakang/Utara = `-Z`)
- **Cegah trim eksterior menembus lantai interior**: pastikan elemen sabuk dinding antar-lantai (`Belt_Floor2`) ujung atasnya lebih rendah dari elevasi lantai interior (`Class_Floor`), agar lantai kayu interior tidak tertutup.
- **Sediakan lorong tengah (*aisle*) untuk jalur kamera**: jika kamera meluncur melewati meja/kursi, sisakan koridor tengah yang bersih supaya kepala karakter atau meja tidak menghalangi lensa.
- **Jarak partikel debu**: tempatkan partikel debu hanya di zona sorot cahaya dekat latar belakang/subjek, jangan di jalur kamera (agar tidak muncul kotak besar menempel di lensa).
- **Optimasi render SwiftShader (`--gl=swangle`) di VM tanpa GPU**:
  - Gunakan `shadow-mapSize` `1024×1024` (tetap tajam untuk gaya kartun, ~2–3× lebih cepat dari `2048`).
  - Hindari membuat ulang `CanvasTexture` statis setiap frame (hanya buat ulang saat animasi kanvas berubah).
  - Untuk video > 100 frame pada VM 2 vCPU, bundle sekali (`npx remotion bundle src/index.ts --out-dir=/tmp/remotion-build`) lalu render per potongan `--frames=0-89`, `--frames=90-179`, dst. dengan `--concurrency=2`, lalu gabung *lossless* pakai `ffmpeg -f concat -safe 0 -i list.txt -c copy`.

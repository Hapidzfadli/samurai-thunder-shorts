# 🐱🧹 Rancangan Produksi — Kos Bu Tini Ep. 4: "Razia Kamar Kos Mendadak: Riko Sembunyikan Kucing Oren, Eh Bu Tini Malah Rebutan Ngelus!"

## Konsep & Spesifikasi Utama
- **Format:** YouTube Shorts / TikTok / Reels (`1080×1920`, `30 fps`, ~`90–95 detik`, 8 adegan 3D penuh di Remotion + Three.js).
- **Latar 360°:** `Kamar Kos Riko` (dollhouse dinding `FrontSide` untuk kamera orbit 360° penuh: kasur sprei kotak-kotak merah-putih, lemari kayu 2 pintu engsel aktif, meja belajar + laptop skripsi, kipas angin berdiri berputar, jendela berkas sinar sore volumetrik, papan merah `"DILARANG PELIHARA HEWAN!"`, dispenser galon, cermin) + `Koridor Lantai 2` (pintu 01/02/03, pagar besi, jemuran, papan pengumuman razia, bayangan sapu mendekat).
- **Hero Rig 3D:** `OrenHero3D` — kucing oren kampung gembul berbelang tabby, ekor 7-ruas bergelombang, kuping berkedut, kedip otomatis, mode makan ikan, penyamaran `"bantal bulu"` berkuping nongol, mode **Mata Berbinar ala Puss in Boots** (pupil melebar + kilau ganda emisif + bintang kilau + kepala miring), dan pose digendong dengkur bahagia!
- **Dialog 5 Suara (`voices/bank_karakter/` via `scripts/voice_bank.py`, VoxCPM2 + Whisper, tektokan rapat `0,09–0,15 dtk`):**
  - `nadia` (`01_nadia_storyteller`) — Narator `"Hai wak!"` pembuka & penutup
  - `riko` (`06_riko_panikan`) — Riko panik sembunyikan kucing
  - `bagas` (`07_bagas_santai`) — Bagas santuy pencetus ide `"bantal bulu"`
  - `ara` (`02_cewek_polos_lucu`) — Mbak Ara polos keceplosan
  - `bu_tini` (`04_bu_tini_ibu_kos`) — Bu Tini galak dobrak pintu bawa sapu → luluh gemes!
- **Soundtrack 2 Babak Stereo Orisinal (`-14 LUFS`):**
  - **Babak 1 (Adegan 1–6a):** *Sneaky Comedy Spy* (`124 BPM`, A minor: pizzicato strings, marimba, woodblock, stealth upright bass, comedy brass stabs)
  - **Titik Balik (Adegan 6):** *Hard Record Scratch* + `"Meeeoow~"` imut berkilau
  - **Babak 2 (Adegan 6b–8):** *Cozy Ukulele-Rhodes Groove* (`112 BPM`, C mayor: ukulele strum, warm Rhodes electric piano, glockenspiel, soft shaker & cozy bass)

## Peta 8 Adegan & Daftar Gerakan (Action Beats)
| # | Kode | Adegan | Action Beats Fisik & Koreografi Kamera 3D |
| :-: | :--- | :--- | :--- |
| 1 | `hook` | **Aturan Keramat & Suap Tongkol** | Push-in ke papan merah `"DILARANG PELIHARA HEWAN!"` (bergetar) → pan turun ke Riko berlutut menyodorkan piring `IkanTongkol3D` dari tangan ke lantai depan `OrenHero3D` → Oren rebah mengunyah & ekor bergoyang; Nadia muncul di pojok narator. |
| 2 | `alarm` | **Alarm Razia Mendadak!** | Shot koridor lantai 2: papan `"RAZIA KAMAR HARI INI!"` menyala, Bu Tini berjalan tegas mengayunkan `SapuIjuk3D` di tangan kanan, `BayanganSapu3D` membesar di dinding → cut masuk kamar: Riko melompat kaget sambil menunjuk pintu! |
| 3 | `nyamar` | **Operasi Penyamaran "Bantal Bulu"** | Whip-pan ke lemari 2 pintu (Riko buka kedua pintu `lemariL/R` → baju penuh, tutup cepat!) → whip-pan ke `Ember3D` biru (Oren tidak muat!) → Bagas jalan santai ke kasur, mengambil sarung bantal kuning & memasangkannya ke Oren → close-up insert *"Bantal Bulu"* berkuping nongol! |
| 4 | `dobrak` | **Dobrak Pintu & Parfum Ancol!** | `PintuKos3D` terbuka keras (`doorBang` + camera kick) → Bu Tini melangkah masuk dengan `SapuIjuk3D` teracung, mengendus ke arah piring ikan tongkol → Riko mundur panik, mengibaskan kedua tangan sambil mengeles *"parfum pantai Ancol"*! |
| 5 | `bocor` | **Bocor Gara-Gara Mbak Ara!** | Kamera **160° reverse-angle** dari belakang kasur menatap pintu: Mbak Ara melongok masuk, menunjuk bantal bulu di kasur → kuping Oren bergerak & keluar balon `"Meow~"` kecil → Riko menepuk jidat panik! |
| 6 | `twist` | **Plot Twist: Mata Berbinar!** | Bu Tini melangkah cepat ke tepi kasur → menjulurkan tangan menarik `Selimut3D` (`pull: 0→1`) → **Vertigo Zoom** ke wajah `OrenHero3D` (`sparkle: 0→1`, `meow: 0→1`, bintang kilau) → **Hard Record Scratch!** → sapu lepas/turun dari tangan Bu Tini, ekspresi marah berubah jadi luluh (`happy/laugh`)! |
| 7 | `rebutan` | **Rebutan Ngelus & Ikan Pindang** | Cahaya kamar berubah **pastel emas hangat (`cozy: 0→1`)** + **Orbit 360°** mengelilingi kamar: Bu Tini menggendong `OrenHero3D` (`pose="held"`, `purr=1`) pindah dari kasur ke pelukan Bu Tini sambil membawa `BesekPindang3D` → Bu Tini mengusir Riko & Bagas ke arah pintu → Mbak Ara polos angkat tangan tanya boleh pelihara bebek! |
| 8 | `ending` | **Crane-Up & Kartu Vote Komen** | **Pixar Crane-Up** menyorot kamar & koridor hangat sore: Bu Tini mengelus Oren makan pindang, Riko & Bagas bengong di pintu, Mbak Ara melambai → kartu voting **`BOLEH PELIHARA KUCING 🐱`** vs **`DILARANG KERAS 🚫`** + CTA komen! |

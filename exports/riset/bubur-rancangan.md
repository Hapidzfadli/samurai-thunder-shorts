# Rancangan Produksi — Kos Bu Tini Ep. 2: Perang Dunia Gara-Gara Bubur Diaduk vs Tidak Diaduk! 🥣🥄⚡

## 1. Ringkasan Cerita & Strategi Viral (Comment + Subscribe Magnet)
- **Judul Kerja:** *Kos Bu Tini Ep. 2: Perang Dunia Gara-Gara Bubur Diaduk vs Tidak Diaduk!*
- **Format:** `1080×1920` (9:16), `30 fps`, target **~72–76 detik** (8 adegan padat).
- **Audio:** Pipeline **Kantor di Atas Awan** — **VoxCPM2** suara **Dodi** 4-emosi (`narasi`, `tegas`, `tegang`, `santai`) + seleksi & *word-level alignment* **Whisper** + mix **Stereo 44,1 kHz (`-14 LUFS`)** dengan efek suara panci/gerobak pagi, kerupuk *krenyes*, aduk sendok intens, petir & benturan pedang anime, tawa ramai, serta musik latar komedi + *epic orchestral spoof*!
- **Pemicu Komentar (Comment Triggers):**
  1. **Debat Abadi Indonesia:** *"TIM DIADUK 🥄 vs TIM TIDAK DIADUK 🥣 — Buktikan di kolom komentar!"*
  2. **Hidden Easter Egg:** Seekor **Kucing Oren 3D (`OrenCat3D`)** mengintip diam-diam di dekat roda gerobak Bang Udin pada **Adegan 2 & 6** → bisa dipancing di komentar pin (*"Siapa yang sadar ada Kucing Oren ngintip di gerobak? Tulis detiknya!"*).
- **Pemicu Subscribe (Subscribe Triggers):**
  1. **Serial *Kos Bu Tini Ep. 2*** — memakai geng karakter yang sama dari *Masak Mie Jam 2 Pagi* (**Riko, Bagas, Bu Tini, Nisa, Dedi**) + karakter baru legendaris **Bang Udin Tukang Bubur**.
  2. **3 Detik Akhir Voting:** *"Besok mau kita perangin apa lagi? Mie Goreng vs Kuah? Tulis di komen & subscribe!"*

## 2. Daftar Karakter (6 Tokoh `Bean` — Animasi Halus v2)
Lihat visual: `exports/riset/bubur-karakter.png`
1. **Riko (Kamar 01)** — Ketua **TIM TIDAK DIADUK 🥣** (kaos biru, sangat menjaga estetika mangkok bubur rapi).
2. **Mas Bagas (Kamar 02)** — Jenderal **TIM DIADUK 🥄** (kaos hitam + headphone, langsung tancap sendok & putar rata).
3. **Bang Udin *(Baru!)*** — Tukang Bubur Ayam Legendaris (topi biru, celemek hijau, handuk putih di bahu, kumis, pemegang **Buku Bon Utang**).
4. **Bu Tini** — Ibu Kos (kebaya batik merah, sanggul) — membela kubu **TIDAK DIADUK**.
5. **Mbak Nisa (Kamar 03)** — Penghuni Kos 03 (kerudung & busana pink) — membela kubu **DIADUK**.
6. **Mas Dedi (Kamar 04)** — Penghuni Kos 04 (kaos putih, sarung hijau, peci) — wasit panik di tengah perang kerupuk.

## 3. Daftar Properti & Latar 3D
Lihat visual: `exports/riset/bubur-properti.png`
- **Latar Utama (`KosanMorningStreet`):** Jalan pagi cerah depan gerbang **Kos Bu Tini** (aspal bertekstur, trotoar belang hitam-putih, gerbang kos, rumah tetangga, pot tanaman, tiang listrik).
- **Properti 3D Terpisah (Mengikuti Tangan via `beanHandWorld`):**
  - `BuburCart3D`: Gerobak *Bubur Ayam Bang Udin — Spesial Kaldu Kuning* (etalase kaca, dandang uap, roda sepeda, kanopi).
  - `BuburBowl3D`: Mangkok Ayam Jago 3D dengan parameter `mixProgress (0 → 1)` — **0** = putih bersih dengan kuah kuning, suwiran ayam, cakwe, daun bawang & kerupuk berdiri rapi; **1** = teraduk rata krem-kecokelatan dengan pusaran kecap manis!
  - `Spoon3D` (sendok logam untuk menyendok, mengaduk brutal, & benturan duel ala pedang anime!).
  - `Kerupuk3D` & `KalengKerupuk3D` (kaleng kerupuk biru legendaris + kerupuk beterbangan *slow-mo*).
  - `WarungTableSet3D` + `SatePlate3D` (meja-bangku kayu, kecap, sambal, tisu hijau, sate telur puyuh).
  - `BukuBon3D` (buku bon utang biru bertuliskan *Riko 45rb, Bagas 60rb — BELUM LUNAS!*).
  - `LightningBolt3D` + `ClashAura3D` (efek petir biru vs emas & gelombang kejut duel anime).
  - `OrenCat3D` (Easter egg Kucing Oren mengintip!).

## 4. Rincian 8 Adegan & Daftar Gerakan (*Action Beats*)

1. **Adegan 1 — Hook: Pagi Damai Sebelum Perang (~0:00–0:09)**
   - *Kamera:* Orbit 3D pagi cerah dari papan `BUBUR AYAM BANG UDIN` & dandang mengepul → tarik mundur memperlihatkan Riko & Bagas duduk berhadapan di meja warung.
   - *Gerakan:* Bang Udin mengaduk dandang (0–45f) → berjalan mengantar 2 mangkok bubur rapi (`BuburBowl3D` pindah dari tangan Bang Udin ke meja, 45–115f) → Riko & Bagas sama-sama menatap mangkok penuh cinta → petir biru & emas menyambar membelah layar tepat saat hook *"perang saudara paling panas di Indonesia!"*.

2. **Adegan 2 — Tim Tidak Diaduk: Karya Seni Riko (~0:09–0:18)**
   - *Kamera:* Push-in orbit halus mengitari mangkok estetik Riko (`mixProgress = 0`), lalu miring pelan memperlihatkan Riko yang bangga *(+ Kucing Oren ngintip di pojok belakang dekat roda gerobak!)*.
   - *Gerakan:* Riko mengangkat tangan perlahan mengagumi toping rapi (0–65f) → mencelupkan `Spoon3D` dengan super anggun hanya di pinggir mangkok, menyendok satu suapan rapi tanpa merusak kerupuk (65–145f) → mengangguk puas dengan mata berbinar & senyum *smug* (`"Seni tingkat tinggi!"`).

3. **Adegan 3 — Tragedi Pengadukan Brutal Bagas (~0:18–0:27)**
   - *Kamera:* Whip-pan dramatis ke Bagas → zoom-in intens *Dutch tilt* tepat ke mangkok Bagas saat diaduk!
   - *Gerakan:* Bagas menyeringai licik (0–45f) → mengangkat `Spoon3D` tinggi-tinggi dengan ancang-ancang (*wind-up*, 45–75f) → menghujamkan sendok ke tengah mangkok lalu **mengaduk melingkar super cepat** sehingga **`BuburBowl3D` berubah real-time dari rapi (`mixProgress=0`) menjadi pusaran krem-kecap rata (`mixProgress=1`)** (75–185f) → Riko di sisi kiri terbelalak syok sambil memegang kepala!

4. **Adegan 4 — Perdebatan Panas & Kubu Kosan Terbelah (~0:27–0:37)**
   - *Kamera:* Orbit 3D bolak-balik antar kubu di depan gerobak → tarik mundur memperlihatkan seluruh penghuni Kos Bu Tini terbelah dua sisi!
   - *Gerakan:* Riko berdiri menunjuk mangkok Bagas (*"Itu bubur atau adukan semen?!"*, 0–80f) → Bu Tini berjalan mantap berdiri di belakang Riko (kubu **TIDAK DIADUK**, 80–135f) → Nisa berlari kecil berdiri di belakang Bagas (kubu **DIADUK**, 120–175f) → Dedi berlari ke tengah melambaikan kedua tangan panik mencoba melerai (175–260f).

5. **Adegan 5 — Duel Anime Sendok 3D & Hujan Kerupuk Slow-Mo! (~0:37–0:47)**
   - *Kamera:* Langit tiba-tiba berubah dramatis biru-vs-emas, *orbit 110° slow-motion* mengelilingi titik benturan dua sendok di tengah!
   - *Gerakan:* Riko (aura petir biru) & Bagas (aura petir emas) sama-sama mundur mengambil kuda-kuda (*anticipation*, 0–55f) → melesat maju melompat (55–95f) → **dua `Spoon3D` bertabrakan tepat di tengah memicu `ClashAura3D` + `LightningBolt3D`** (95–190f) → puluhan `Kerupuk3D` melayang berputar *slow-mo* melewati kamera dan mengenai wajah Mas Dedi yang langsung menutup kepala!

6. **Adegan 6 — Bang Udin Turun Tangan dengan Jurus Pamungkas (~0:47–0:57)**
   - *Kamera:* Petir mendadak hilang *JEPRET!* kembali ke pagi cerah datar → push-in *low-angle* tegas ke Bang Udin yang berdiri tenang di belakang gerobak *(Kucing Oren terlihat lagi di dekat kaki Bang Udin!)*.
   - *Gerakan:* Bang Udin mengetuk pinggir dandang *TENG!* pakai sendok sayur (0–55f) → semua kubu membeku mendadak dan menoleh serempak ke Bang Udin (55–95f) → Bang Udin merogoh saku celemek dan **mengeluarkan `BukuBon3D` (`BON UTANG`)** lalu membukanya perlahan menghadap Riko & Bagas (95–210f).

7. **Adegan 7 — Plot Twist: "Utang Kemarin Belum Lunas!" (~0:57–1:06)**
   - *Kamera:* Close-up 3D menyapu tulisan di `BukuBon3D` (*Riko 45rb, Bagas 60rb — BELUM LUNAS!*), lalu whip-pan ke wajah melas Riko & Bagas sementara Bu Tini, Nisa, dan Dedi tertawa terbahak-bahak!
   - *Gerakan:* Bang Udin menunjuk buku bon sambil geleng-geleng kepala (lip-sync dialog pamungkas, 0–130f) → Riko & Bagas langsung merunduk malu, tangan merogoh kantong kosong dengan keringat dingin (130–200f) → Bu Tini, Nisa, & Dedi terpingkal-pingkal menepuk lutut (170–260f).

8. **Adegan 8 — Ending Damai + Voting Komen Pemancing Interaksi (~1:06–1:14)**
   - *Kamera:* *Crane-up orbit* hangat mengelilingi semua karakter duduk akur makan bubur bareng di meja Bang Udin, muncul split badge raksasa di layar: **`TIM DIADUK 🥄` VS `TIM TIDAK DIADUK 🥣`**.
   - *Gerakan:* Riko & Bagas saling cengengesan canggung lalu makan bubur masing-masing (satu rapi, satu diaduk) → semua melambaikan sendok ke kamera tepat saat narator bertanya *"Kamu tim diaduk atau tim tidak diaduk? Tulis di komen, besok kita perangin apa lagi!"*.

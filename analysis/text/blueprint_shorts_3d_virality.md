# Aturan & Blueprint Produksi Video Shorts 3D (Referensi: Thermal Expansion Railroad)

- **Video Referensi:** https://youtube.com/shorts/7xS87iActkU?si=Hf6GzgIq9_u9haAb
- **Durasi:** ~64 detik (9:16, 30/60 fps)
- **Tujuan:** Panduan praktis struktur cerita, kamera, audio, SFX, visualisasi 3D, dan subtitle untuk diterapkan di proyek **Remotion + Three.js**.

---

## 1. Aturan Struktur Cerita (*Pacing & Retention*)

| Segmen | Waktu | Aturan & Tujuan | Contoh di Video Referensi |
| :--- | :--- | :--- | :--- |
| **Hook** | `00:00 – 00:03` | Langsung mulai dari aksi aneh/kontroversial tanpa intro. Buat penonton bertanya *"Kenapa?"* | Insinyur menggergaji celah di rel setiap 39 kaki. |
| **Stakes / Taruhan** | `00:03 – 00:12` | Jelaskan konsekuensi besar jika gagal atau berhasil. Gunakan skala visual epik. | Dua perusahaan balapan membangun rel di ngarai super dalam; pemenang menguasai bisnis negara. |
| **Konflik Awal** | `00:12 – 00:22` | Tokoh otoritas/lawan memarahi atau meremehkan keputusan tokoh utama. | Bos marah sampai wajahnya ungu: *"You're wrecking my railroad!"* |
| **Keunggulan Lawan** | `00:22 – 00:35` | Tunjukkan metode "sempurna" milik lawan berhasil lebih dulu & membuat tokoh utama tampak salah. | Rel kompetitor mulus tanpa celah, kereta senyap, semua penumpang pindah. |
| **Petunjuk / Pergeseran** | `00:35 – 00:54` | Muncul variabel baru (waktu/cuaca/fisika) yang perlahan membalikkan keadaan. | Musim panas tiba; celah rel menyusut (Mei muat koin, Juli muat kertas); rel lawan mulai berderit. |
| **Klimaks Visual** | `00:54 – 01:04` | Puncak ketegangan + *payoff* spektakuler yang membuktikan tokoh utama benar. | Hari terpanas: celah menutup pas, rel lawan melengkung seperti ular (*sun kink*) dan kereta meledak jatuh. |

---

## 2. Aturan Kamera 3D (*Cinematography*)

1. **Zero Static Shots (Kamera Selalu Bergerak)**
   - Gunakan *dolly in/out*, *pan*, *orbit*, atau *tracking* di setiap adegan.
   - Di Remotion: selalu interpolasikan `camera.position` dan `camera.lookAt` menggunakan `interpolate()` / `spring()`.
2. **Kontras Skala Ekstrem (*Wide ↔ Macro*)**
   - Bergantian antara **Extreme Wide** (jembatan & ngarai raksasa) dan **Macro Close-up** (celah rel selebar jari, koin, kertas).
   - Kontras skala ini menjaga perhatian visual tetap segar setiap 2–4 detik.
3. **Transisi Menyatu dalam Ruang 3D**
   - Gunakan *whip pan* cepat atau *camera sweep* menyusuri rel/objek untuk berpindah adegan tanpa *hard cut* yang kaku.

---

## 3. Aturan Audio & Efek Suara (*Sound Design*)

1. **Narasi (*Voice-Over*)**
   - Tanpa jeda mati (*dead air*): potong napas/jeda antar kalimat agar ritme padat.
   - Sisipkan 1–2 dialog karakter singkat dengan intonasi berbeda untuk memecah kebosanan narasi tunggal.
2. **Micro-SFX di Setiap Aksi Visual**
   - Setiap gerakan penting wajib punya bunyi pendukung (*foley*):
     - Aksi fisik: suara gergaji, langkah kaki, pintu, angin ngarai.
     - Emosi karakter: suara uap mendesis saat marah, *pop* saat kaget.
     - Bukti/pengukuran: bunyi *clink* saat koin masuk celah, *rustle* kertas.
     - Kontras narasi: suara kereta mulus vs *clickety-clack* berisik.
     - Klimaks: derit logam tegang → ledakan/benturan keras.
3. **Musik Latar (BGM) Mengikuti Emosi**
   - Awal: ceria/petualangan konstruksi → Tengah: misterius/tegang → Klimaks: intens/dramatis.
   - Selalu lakukan *audio ducking* agar BGM tidak menutupi narasi.

---

## 4. Aturan Karakter & Visualisasi Konsep (*Show, Don't Just Tell*)

1. **Karakter Simpel di Lingkungan Detail**
   - Gunakan desain karakter minimalis yang kontras dengan lingkungan 3D kaya tekstur agar **ekspresi wajah langsung terbaca dalam < 0.5 detik** dan render tetap ringan.
2. **Visualisasikan Hal Abstrak dengan Perubahan Material & Properti**
   - **Panas / Suhu:** Ubah warna material rel secara bertahap (normal → ungu → merah → kuning menyala) + tambahkan termometer/kalender.
   - **Emosi Ekstrem:** Ubah warna wajah (mis. ungu saat marah) + partikel asap dari telinga/kepala.
   - **Perbandingan Ukuran:** Gunakan benda sehari-hari yang familiar (jari, koin, selembar kertas) daripada sekadar menyebut angka.

---

## 5. Aturan Teks / Subtitle

- **1–2 kata per tampil** (maksimal 3 kata pendek) agar mata tidak perlu membaca kalimat panjang.
- **Posisi:** Tengah-bawah layar (area aman di atas deskripsi & di sebelah kiri tombol interaksi YouTube Shorts).
- **Gaya:** Font tebal (*bold sans-serif*), warna putih dengan *outline* hitam pekat / *drop shadow* kuat, sinkron 100% dengan ketukan suara narator.

---

## 6. Checklist Implementasi Cepat di Remotion + Three.js

- [ ] Hook 3 detik pertama langsung menampilkan konflik visual.
- [ ] Setiap `<Sequence>` punya pergerakan kamera aktif (`useCurrentFrame()` + `interpolate()`).
- [ ] Minimal ada 1 variasi skala *Wide* dan 1 *Macro Close-up*.
- [ ] Efek perubahan kondisi memakai animasi material (`color`, `emissiveIntensity`) atau deformasi mesh.
- [ ] Setiap momen visual penting dipasangkan dengan SFX di timeline `<Audio>`.
- [ ] Subtitle dinamis 1–2 kata sinkron dengan audio narasi.

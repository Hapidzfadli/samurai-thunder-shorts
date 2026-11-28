# Rancangan: "Terowongan ke Brankas" (kisah nyata, Nice 1976)

Target: ±80 dtk · 1080×1920 · 30 fps · 8 adegan · dialog **Dodi + Ara**, narasi Dodi hanya di pembuka/penutup.
Gaya: latar 3D Blender → GLB + tokoh kartun 2D (`BeanCard`), sinematik (`cinemaKit`, `motionKit`).
Video referensi "The Prisoner Who Tunneled Into a Bank" = cerita **fiktif** (napi gali dari sel ke brankas). Kita hanya mengambil *gayanya* (irisan tanah, pintu brankas bundar, muncul dari lubang, gag kacamata hitam). Cerita, naskah, tokoh dan shot buatan sendiri.

## 1. Fakta + sumber
| Fakta | Status | Sumber |
|---|---|---|
| Juli 1976, komplotan pimpinan **Albert Spaggiari** membobol brankas **Société Générale, Nice** lewat jaringan **got kota** | konsisten di semua sumber | [Wikipedia](https://en.wikipedia.org/wiki/Albert_Spaggiari), [Riviera Radio](https://www.rivieraradio.mc/article/50-years-since-nices-heist-of-the-century-5HjddjT_2/), [Newsgram](https://www.newsgram.com/crime/2025/10/06/albert-spaggiaris-1976-heist-biggest-bank-robberies) |
| Mereka menggali **terowongan ±8 m** dari got ke ruang brankas; ada yang menyebut berminggu-minggu sampai ±2-3 bulan | panjang & lama **berbeda antarsumber** → naskah pakai "sekitar delapan meter", "berminggu-minggu" | Wikipedia; Riviera Radio |
| Dikerjakan saat **akhir pekan panjang Bastille Day** (sekitar 16-19 Juli; tanggal beda-beda), >50 jam di dalam brankas | konsisten (tanggal persis tidak dipakai) | Riviera Radio; [TrueCrimeVault](https://truecrimevault.net/cases/the-nice-bank-robbery) |
| ±**371 kotak deposit** dibuka; rampasan ±**46-50 juta franc**, tidak pernah ditemukan | angka beda tipis → naskah: "hampir lima puluh juta franc" | Wikipedia; [Papers Past 1978](https://paperspast.natlib.govt.nz/newspapers/CHP19780522.2.103) |
| Senin pagi pintu brankas tidak bisa dibuka; diduga **dilas dari dalam** | 1 sumber → narasi "diduga" | TrueCrimeVault |
| Pesan di dinding: **"Sans armes, ni haine, ni violence"** (tanpa senjata, tanpa kebencian, tanpa kekerasan) | dikutip luas; judul film 2008 merujuk pesan ini; kata persisnya belum terverifikasi dari arsip asli | Riviera Radio; [The Easy Way (film)](https://en.wikipedia.org/wiki/The_Easy_Way_(film)) |
| Spaggiari ditangkap akhir 1976 (Okt/Des, sumber beda) | naskah: "beberapa bulan kemudian" | Wikipedia; Leonardo English |
| **Maret 1977** kabur dari kantor hakim pemeriksa: lompat jendela, mendarat di (atap) mobil, kabur naik motor | lompat jendela + motor: beberapa sumber; detail atap mobil: 1 sumber | Wikipedia (film); TrueCrimeVault |
| Divonis **in absentia**, tidak pernah tertangkap lagi, meninggal 1989 | konsisten | Wikipedia |
| 2010, Jacques Cassandri mengaku dialah otak sebenarnya | disebut sekilas di penutup sebagai twist | Wikipedia |

**Kebijakan tokoh**: Spaggiari tokoh nyata (sudah meninggal). Namanya hanya disebut narasi sebagai fakta. Di layar, tokohnya **"Si Fotografer" (diperankan Dodi), tokoh kartun fiktif** tanpa kemiripan wajah. **Mimi (Ara)**, manajer, polisi, dan hakim semuanya fiktif. Nama bank hanya disebut narasi; papan di latar ditulis "BANQUE".

## 2. Karakter
Lihat `terowongan-karakter.png` dan `terowongan-ekspresi.png`.
- **Si Fotografer (Dodi)**: 2 kostum (safari krem; baju kerja biru + helm kuning + coreng tanah). Gag: **kacamata hitam** saat masuk brankas.
- **Mimi (Ara)**: sanggul + rok (terbaca wanita). Kostum got: blus hijau lumut, bot karet, basah. Memegang **lentera** (objek 3D terpisah; di lembar masih memakai obor bawaan).
- Figuran: Manajer Bank, Polisi, Hakim, 2-3 anggota komplotan.

**Arah hadap & pose yang dibutuhkan** (✔ sudah ada · ✚ dibuat setelah disetujui, lalu dikirim pratinjaunya):
| Kebutuhan | Dipakai di | Status |
|---|---|---|
| Depan, bicara, gestur | semua dialog | ✔ |
| Tampak belakang (menjauh) | A3 masuk lorong got, A8 kabur naik motor | ✔ `back:true` |
| Lari / jalan berpindah tempat | A3, A8 | ✔ `runPose` + `linePath` / `recedeCam` |
| **Tampak samping (profil)** | A4 penampang (merangkak, mengoper ember), A8 lompat | ✚ Dodi + Ara + 1 figuran |
| **Duduk** (kursi, kaki menekuk) | A2 di meja studio, A8 kursi interogasi | ✚ |
| **Jongkok / berlutut** | A5 membuka kotak deposit, A6 mengelas | ✚ |
| **Merangkak** | A4 di dalam terowongan | ✚ (profil) |
| **Menggali / mengebor** (2 tangan memegang alat) | A4 | ✚ |
| **Muncul dari lubang** (hanya kepala/badan atas) | A5 | ✚ via oklusi lantai (tanpa pose baru) |
| **Melompat / melayang** + mendarat squash | A8 jendela → atap mobil | ✚ |
| **Tangan diborgol** | A7 | ✚ objek borgol di dua tangan |
| Aksesoris baru: **kacamata hitam**, **helm lampu kepala** (sorot cahaya) | A4-A6 | ✚ |

## 3. Latar & properti (Blender headless → `public/models/terowongan.glb`, pola `scripts/build_napoleon_glb.py`)
Lihat `terowongan-latar.png`. Satu GLB, node per latar (`L1_Jalan`, `L2_Studio`, `L3_Got`, `L4_Penampang`, `L5_Brankas`, `L6_Hakim`, `Langit`).
- **L1 Jalan Nice + fasad bank**: fasad batu krem, papan BANQUE, jendela berjeruji, jalan berbatu, palem, lampu jalan, mobil 70-an, kafe bertenda, tutup got, bendera tiga warna, merpati, kertas.
- **L2 Studio foto**: meja penuh peta got, kamera tripod, lampu kerja, jemuran foto, kotak film, poster, rak berdebu, kursi, jam dinding, sorot jendela.
- **L3 Got**: lorong bata melengkung berlumut, air keruh, pipa berkarat, tangga besi, troli, kabel lampu darurat, tikus, uap.
- **L4 Penampang (cutaway)**: model irisan khusus: jalan + mobil di atas, lapisan tanah/batu/pipa, got, terowongan berpenyangga kayu, dinding beton brankas. Tokoh kecil tampak samping bergerak di dalamnya.
- **L5 Ruang brankas**: pintu bundar raksasa, dinding laci deposit bernomor, lubang di dinding + puing, lampu sorot, tabung las, meja lipat, karung, perhiasan & kertas berserakan.
- **L6 Kantor hakim lantai atas + jalan di bawah**: meja hakim, berkas, mesin tik, bendera, rak buku, kipas, jendela besar; di bawah mobil parkir + motor.

Objek terpisah (ikut `beanHandWorld`): peta, lentera, sekop, bor, ember, obor las, kuas + kaleng cat, laci deposit, kalung, borgol.
Insert tangan SVG: bor menembus beton, membuka laci deposit, menyalakan las, menulis di dinding, borgol "klik".

## 4. Adegan, naskah, kamera, gerakan
Format naskah: `[suara · gaya] kalimat`. Frame relatif terhadap awal adegan (perkiraan; disetel ke timing suara asli).

### A1 · Hook: brankas yang tidak mau terbuka (0-7 dtk, L5 + L1, palet dingin pagi)
- [dodi · tegang] Senin pagi, Juli seribu sembilan ratus tujuh puluh enam. Pintu brankas sebuah bank di kota Nice, Prancis, tidak bisa dibuka.
- [dodi · bisik] Karena dikunci... dari dalam.
- Teks judul (2 dtk pertama): **"DIRAMPOK TANPA SATU TEMBAKAN"**
- Kamera: lebar fasad bank (crane turun) → medium manajer menarik roda pintu → close-up wajah manajer berkeringat → insert tangan memutar roda yang macet → lebar dari dalam brankas yang gelap (sorot cahaya dari celah).
- Gerakan: manajer jalan ke pintu (0-30f) → pegang roda, tarik 3× dengan squash (30-90f) → jatuh terduduk (90-110f) → polisi masuk dari kanan (110-140f).

### A2 · Ide gila di studio foto (7-17 dtk, L2, palet akrab hangat)
- [ara · santai] Kamu mau bobol bank? Kamu kan cuma tukang foto.
- [dodi · bisik] Justru itu. Aku sudah lihat peta got kota ini. Ada saluran yang lewat persis di samping brankasnya.
- [ara · tegang] Di samping... brankas?
- Kamera: lebar studio dengan tepi meja di depan (Foreground edge) → medium Dodi duduk (✚) menunjuk peta → insert tangan menelusuri garis got di peta → close-up Ara kaget → lebar.
- Gerakan: Dodi duduk, memutar badan ke peta (0-20f) → telunjuk menelusuri peta (insert, 30-75f) → Ara mendekat dari pintu, tampak depan (40-80f) → Ara mencondongkan badan ke meja (80-100f).

### A3 · Masuk got (17-26 dtk, L1 malam → L3, palet hijau gelap + lentera)
- [ara · tegang] Baunya ya ampun! Aku nggak dibayar cukup buat ini.
- [dodi · santai] Kamu dibayar pakai isi brankas. Jalan terus.
- Kamera: lebar jalan malam, tutup got diangkat (insert tangan) → turun mengikuti tangga (crane) → tracking dari belakang: Ara (tampak belakang) memimpin dengan lentera, menjauh di lorong → medium Ara jijik (tampak depan, berhenti, menoleh) → lebar lorong panjang dengan tikus lewat.
- Gerakan: Dodi mengangkat tutup got (0-25f) → Ara turun tangga (25-60f) → berjalan menjauh di air (`linePath`, tampak belakang, 60-150f) → berhenti, putar ke kamera, ekspresi jijik (150-170f) → lanjut menjauh (170-220f).

### A4 · Menggali: shot penampang (26-38 dtk, L4 cutaway + close-up)
- [dodi · narasi] Berminggu-minggu, tiap malam, mereka menggali terowongan sekitar delapan meter dari got ke dinding brankas.
- [ara · tegang] Di atas kita ada jalan raya. Kalau ada mobil lewat dan semuanya ambruk, gimana?
- [dodi · santai] Makanya kita gali pelan-pelan. Dan jangan bersin.
- Kamera: **penampang lebar** geser kiri→kanan (mobil lewat di atas, debu jatuh) → medium dalam terowongan: Dodi berlutut mengebor (✚), Ara merangkak (✚ profil) membawa ember → insert tangan bor menembus beton (percikan) → close-up Dodi ber-helm lampu, sorot lampu kepala → lebar penampang (ember dioper berantai oleh figuran).
- Gerakan: Ara merangkak mundur dengan ember (0-60f, profil) → oper ember ke figuran (60-80f, benda pindah tangan) → Dodi menghentak bor 3× (80-140f, kick kamera) → beton retak, cahaya brankas menembus (140-170f).

### A5 · Tembus brankas (38-50 dtk, L5, dingin biru + lampu kerja kuning)
- [dodi · bisik] Akhir pekan Bastille Day. Bank tutup tiga hari. Kita punya waktu.
- [ara · tegang] Tiga ratus tujuh puluh satu kotak?! Kita buka semua?
- [dodi · santai] Satu per satu, dengan sopan.
- Kamera: sudut rendah dari lantai: Dodi muncul dari lubang (hanya kepala, lalu badan) **memakai kacamata hitam** (gag) → lebar dinding laci, Ara muncul di belakang → insert tangan menarik laci, perhiasan berkilau → medium Ara jongkok (✚) memasukkan kalung ke karung → close-up Dodi menyalakan las ke pintu dari dalam (insert percikan) → lebar.
- Gerakan: Dodi naik dari lubang (0-40f) → memasang kacamata (40-55f) → Ara naik, terpana (55-90f) → Dodi jongkok membuka laci (90-130f) → kalung pindah tangan Dodi → Ara → karung (130-160f) → Dodi mengelas pintu (160-220f).

### A6 · Pesan di dinding (50-58 dtk, L5)
- [ara · santai] Kamu nulis apa di tembok?
- [dodi · tegas] Tanpa senjata, tanpa kebencian, tanpa kekerasan.
- [ara · santai] Iya, tapi tetap mencuri, kan?
- Kamera: medium Dodi tampak belakang mengecat dinding → insert kuas menulis "SANS ARMES, NI HAINE, NI VIOLENCE" → close-up Ara datar (jeda komedi, musik mati) → lebar mereka turun ke lubang membawa karung.
- Gerakan: Dodi mengambil kuas dari kaleng (0-20f) → menulis (20-90f, insert) → Dodi menoleh bangga (90-105f) → reaksi Ara (105-130f) → keduanya turun ke lubang, karung ikut (130-200f).

### A7 · Senin pagi & tertangkap (58-66 dtk, L5 → L2)
- [dodi · narasi] Senin pagi, polisi masuk lewat terowongan dan menemukan hampir lima puluh juta franc lenyap. Beberapa bulan kemudian, Si Fotografer tertangkap.
- [ara · santai] Nah kan. Sudah kubilang.
- Kamera: lebar polisi merangkak keluar lubang (kembali ke A1) → close-up polisi membaca tulisan → insert borgol "klik" di tangan Dodi → medium Dodi diborgol tetap tersenyum licik → lebar.
- Gerakan: polisi keluar lubang (0-40f) → menoleh ke tulisan (40-60f) → potong: polisi memborgol Dodi (borgol objek 3D, 80-110f) → Dodi dibawa jalan menjauh, tampak belakang (110-160f).

### A8 · Lompat jendela & penutup (66-80 dtk, L6 + jalan)
- [dodi · santai] Pak Hakim, boleh saya tunjukkan di peta, bagaimana caranya?
- [dodi · narasi] Maret seribu sembilan ratus tujuh puluh tujuh. Saat diperiksa hakim, ia melompat dari jendela, mendarat di atap mobil, dan kabur naik motor.
- [ara · tegang] Hah?! Dia kabur lagi?!
- [dodi · narasi] Uangnya tidak pernah ditemukan. Dan ia tidak pernah tertangkap lagi.
- Kamera: medium Dodi duduk (✚) di depan meja hakim, menunjuk peta → hakim membungkuk melihat peta (insert) → Dodi berdiri, lari ke jendela (profil ✚) → kamera luar gedung sudut rendah: Dodi melayang (✚) → mendarat di atap mobil (squash + kick) → naik motor, kabur menjauh (tampak belakang, `recedeCam`) → close-up Ara melongo → lebar jalan, motor mengecil; teks akhir "UANGNYA TAK PERNAH DITEMUKAN".
- Gerakan: Dodi berdiri dari kursi (0-15f) → lari 3 langkah ke jendela (15-40f) → lompat (40-55f) → melayang turun (55-80f) → mendarat (80-90f) → ke motor & melaju (90-180f).

## 5. Suara & audio
- `dodi` = narator + Si Fotografer, `ara` = Mimi (VoxCPM2, kalimat utuh, gaya per baris). Total ±22 kalimat ≈ 80 dtk.
- SFX: roda brankas macet, langkah di air, tutup got besi, bor, retak beton, ember, las mendesis, laci logam, kuas, borgol "klik", kaca/jendela, atap mobil "bonk", motor. Musik heist jazz ringan, di-duck; berhenti saat jeda komedi A6 dan A8.

## 6. Setelah disetujui
1. Pose & aksesoris baru (✚) → pratinjau.
2. `scripts/build_terowongan_glb.py` → GLB, lalu still per latar.
3. Naskah JSON + suara VoxCPM2 → mix.
4. Adegan → lembar kontak still → persetujuan.
5. Render di Colab T4 high-RAM → QA dari video final → kirim.

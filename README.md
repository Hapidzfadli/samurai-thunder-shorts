# 3D YouTube Shorts — Remotion + Three.js + Neural Voice Cloning

Proyek pembuatan video **YouTube Shorts 3D vertikal (`1080×1920`, `30 fps`, `30 detik / 900 frame`)** menggunakan **Remotion 4**, **Three.js / React Three Fiber (`@remotion/three`)**, **Pocket-TTS Indonesian** (Zero-Shot Voice Cloning Bahasa Indonesia), dan **Kokoro-82M v1.0** (English Documentary Voiceover).

## Daftar Komposisi Video (`src/Root.tsx`)

1. **`WeweGombel` (Bahasa Indonesia)** — *"Jangan Main Saat Magrib! Mitos Wewe Gombel"*
   - Visual 3D: Suasana kampung senja Magrib (`18.00 WIB`), pohon beringin tua raksasa dengan akar gantung bergoyang, siluet Wewe Gombel bermata merah menyala, dan warga kampung membawa obor sambil memukul kentongan bambu.
   - Audio & Voice Cloning: `scripts/build_audio_wewe.py` menggunakan **Pocket-TTS Indonesian** (`anak10thn/pocket-tts-indonesian`) + musik **Gamelan Pelog Barang** horor, Gong Ageng, dan efek kentongan bambu.
2. **`SamuraiThunder` (Part 1 - English)** — *"Why Samurai Feared The Flying Thunder (1274)"*
   - Visual 3D: Invasi Mongol di Teluk Hakata (1274), penampang 3D bom besi *Tetsuhō*, dan hujan ledakan di garis pantai.
3. **`SamuraiThunderPart2` (Part 2 - English)** — *"How The Divine Wind Crushed 4,400 Warships (1281)"*
   - Visual 3D: Tembok pertahanan batu Hakata (*Genkō Bōrui*), armada raksasa Mongol yang dirantai, dan terpaan badai topan *Kamikaze*.

---

## Cara Menjalankan Proyek

### 1. Instalasi Dependensi Node.js
```bash
npm install
npx remotion studio
```

### 2. Render Video MP4
```bash
# Render cerita Wewe Gombel (Bahasa Indonesia)
npx remotion render src/index.ts WeweGombel out/wewe-gombel.mp4 --gl=swangle

# Render Samurai Part 1 & Part 2
npx remotion render src/index.ts SamuraiThunder out/samurai-thunder.mp4 --gl=swangle
npx remotion render src/index.ts SamuraiThunderPart2 out/samurai-thunder-part2.mp4 --gl=swangle
```

### 3. Voice Cloning Bahasa Indonesia (`Pocket-TTS Indonesian`)
```bash
# Gunakan salah satu dari 4 karakter suara asli Indonesia:
# pria_bariton | pria_hangat | wanita_storyteller | wanita_cerah
.venv/bin/python scripts/build_audio_wewe.py --voice wanita_storyteller

# Atau kloning suara dari file audio/video apa pun (.wav / .mp3):
.venv/bin/python scripts/build_audio_wewe.py --voice /path/ke/sampel_suara.wav
```

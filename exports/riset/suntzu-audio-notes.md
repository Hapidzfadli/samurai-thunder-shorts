# Sun Tzu — kontrak audio

Naskah: 8 adegan, 19 kalimat utuh, dodi + ara standar (VoxCPM2 48 kHz CUDA + Whisper word alignment, skor 0.93–1.00). Timing sekarang **AKTUAL** 89,167 detik (`2,675` frame @ 30 fps); master audio `public/audio/suntzu_master.mp3` (-14 LUFS, mean `-17.2 dB`, peak `-1.6 dB`) dan video final `exports/sun-tzu-latihan-istana.mp4` telah selesai dirender di GPU NVIDIA Tesla T4 dan lulus seluruh verifikasi QA.

Urutan scene: `hook`, `leaders`, `first`, `second`, `sentence`, `stop`, `turn`, `end`. Schema sama dengan kelelawar_timing.json: fps/totalDurationSec/totalFrames/order/scenes/lines/events/captions. `scenes[name].startFrame` global; durationInFrames durasi. Baris, kata dan event adalah frame LOKAL scene; captions frame GLOBAL.

Event wajib: drum→first[0] Genderang; right→first[0] kanan; laugh→first[0] tertawa; left→second[0] kiri; laugh2→second[0] tawa; sentence→sentence[1] hukuman; death→sentence[1] mati; stop→stop[0] menghentikan; refuse→stop[1] menolak; turn→turn[1] berbelok. Tambahan replacement→turn[0] pengganti dan fear→turn[2] takut. Semua reaksi -2 frame dari kata pemicu. `death` adalah vonis di adegan 5, bukan eksekusi; hukuman diceritakan kemudian lewat cutaway adegan 7.

Tidak ada SFX eksekusi atau lelucon penderitaan. Tidak ada laugh-track: dua tawa dinarasikan dan dianimasikan. Musik petik pentatonik stilisasi, bukan klaim musik otentik; musik berhenti pada adegan sentence/stop, ducking di bawah suara. Dodi sedikit kiri, Ara sedikit kanan.

Reproduksi: `.venv/bin/python scripts/voice_vox.py scripts/naskah/suntzu.json suntzu` lalu `.venv/bin/python scripts/build_audio_suntzu.py`. Estimasi saja: `python3 scripts/build_audio_suntzu.py --estimate` (jangan jalankan setelah aktual kecuali memang ingin mengganti).

Lingkungan awal: Python 3.14 tanpa venv/FFmpeg/torch. python3.14-venv dan FFmpeg berhasil dipasang. Instal awal panduan mengunduh paket CUDA besar hingga ruang /tmp habis; dipulihkan memakai wheel torch CPU, tetap mesin VoxCPM2 dan referensi suara yang sama.

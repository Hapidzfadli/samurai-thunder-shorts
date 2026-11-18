import argparse
import math
import subprocess
import wave
from pathlib import Path
import numpy as np
from pocket_tts import TTSModel
from scipy import signal

SR = 44100
DURATION = 30.0
N_SAMPLES = int(SR * DURATION)

ROOT = Path(__file__).resolve().parent.parent
VDIR = ROOT / "voices" / "id_prompts"
OUT_DIR = ROOT / "public" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)

POCKET_CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"

# Empat sampel suara asli pembicara Indonesia (48 kHz CC0) untuk voice cloning
BUILTIN_VOICES = {
    "pria_bariton": VDIR / "common_voice_id_19961910.wav",      # Pria suara berat/bariton (~111 Hz)
    "pria_hangat": VDIR / "common_voice_id_22918082.wav",       # Pria suara hangat (~123 Hz)
    "wanita_storyteller": VDIR / "common_voice_id_20954811.wav", # Wanita pencerita (~193 Hz)
    "wanita_cerah": VDIR / "common_voice_id_20954552.wav",      # Wanita suara cerah (~280 Hz)
}


def prepare_voice_prompt(voice_arg: str) -> Path:
    """Resolve a built-in Indonesian speaker preset or convert any custom audio file to 48kHz mono WAV."""
    if voice_arg in BUILTIN_VOICES:
        return BUILTIN_VOICES[voice_arg]
    custom_path = Path(voice_arg).expanduser().resolve()
    if not custom_path.exists():
        raise FileNotFoundError(f"File sampel suara tidak ditemukan: {custom_path}")
    out_wav = VDIR / f"custom_{custom_path.stem}_48k.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(custom_path), "-ar", "48000", "-ac", "1", "-t", "10", str(out_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return out_wav


print("Memuat model Pocket-TTS Indonesian (502 jam data suara asli Indonesia + Zero-Shot Voice Cloning)...")
tts_model = TTSModel.load_model(
    config=POCKET_CONFIG,
    eos_threshold=-6.0,
    temp=0.3,
)


def synth_id_cloned(voice_state, text: str, target_max_s: float | None = None) -> np.ndarray:
    """Synthesize native Indonesian speech cloned from voice_state and resample to 44.1 kHz."""
    audio_tensor = tts_model.generate_audio(voice_state, text, max_tokens=120)
    raw = audio_tensor.detach().cpu().numpy().squeeze().astype(np.float32)
    orig_sr = tts_model.sample_rate
    if orig_sr != SR:
        num = int(len(raw) * SR / orig_sr)
        raw = signal.resample(raw, num)
    # Trim leading/trailing silence
    idx = np.where(np.abs(raw) > 0.008)[0]
    if len(idx) > 0:
        raw = raw[max(0, idx[0] - int(0.015 * SR)) : min(len(raw), idx[-1] + int(0.05 * SR))]
    # If the cloned speaker speaks slightly slower than the scene window, gently time-compress if needed
    if target_max_s is not None and len(raw) / SR > target_max_s:
        target_len = int(target_max_s * SR)
        raw = signal.resample(raw, target_len)
    # Broadcast condenser EQ
    b, a = signal.butter(2, 85 / (SR / 2), btype="highpass")
    raw = signal.lfilter(b, a, raw)
    peak = np.max(np.abs(raw)) + 1e-6
    raw = np.tanh(raw / peak * 1.35) / np.tanh(1.35)
    return raw.astype(np.float32)


def add_clip(mix: np.ndarray, clip: np.ndarray, start_s: float, gain: float = 1.0, pan: float = 0.0):
    idx0 = int(start_s * SR)
    if idx0 >= N_SAMPLES or idx0 + len(clip) <= 0:
        return
    if idx0 < 0:
        clip = clip[-idx0:]
        idx0 = 0
    idx1 = min(N_SAMPLES, idx0 + len(clip))
    seg = clip[: idx1 - idx0]
    if seg.ndim == 1:
        l_gain = gain * math.cos((pan + 1) * math.pi / 4)
        r_gain = gain * math.sin((pan + 1) * math.pi / 4)
        mix[idx0:idx1, 0] += seg * l_gain
        mix[idx0:idx1, 1] += seg * r_gain
    else:
        mix[idx0:idx1] += seg * gain


# ---------------------------------------------------------------------------
# Indonesian Horror / Folklore SFX (Gong Ageng, Kentongan Bambu, Jangkrik, etc.)
# ---------------------------------------------------------------------------
def sfx_gong_ageng(dur: float = 2.4, f0: float = 65.41) -> np.ndarray:
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    ombak = 1.0 + 0.25 * np.sin(2 * np.pi * 2.2 * t)
    sig = (
        np.sin(2 * np.pi * f0 * t) * np.exp(-t * 1.2)
        + 0.6 * np.sin(2 * np.pi * (f0 * 1.03) * t) * np.exp(-t * 1.3)
        + 0.4 * np.sin(2 * np.pi * (f0 * 2.0) * t) * np.exp(-t * 2.5)
        + 0.25 * np.sin(2 * np.pi * (f0 * 2.98) * t) * np.exp(-t * 4.5)
    ) * ombak
    return np.tanh(sig * 1.5).astype(np.float32)


def sfx_kentongan(hits: int = 8, tempo_s: float = 0.22) -> np.ndarray:
    dur = hits * tempo_s + 0.4
    out = np.zeros(int(SR * dur), dtype=np.float32)
    for i in range(hits):
        ht = np.linspace(0, 0.25, int(SR * 0.25), endpoint=False)
        f = 580.0 if i % 2 == 0 else 640.0
        wood = (
            np.sin(2 * np.pi * f * ht) * np.exp(-ht * 24)
            + 0.45 * np.sin(2 * np.pi * (f * 2.35) * ht) * np.exp(-ht * 45)
        )
        idx = int(i * tempo_s * SR)
        out[idx : idx + len(wood)] += wood.astype(np.float32)
    return np.tanh(out * 1.8).astype(np.float32)


def sfx_thunder(dur: float = 2.6, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = rng.standard_normal(len(t))
    env_crack = np.exp(-t * 20) * 1.4
    env_rumble = (np.exp(-t * 1.1) - np.exp(-t * 12)) * (0.7 + 0.3 * np.sin(t * 8))
    b_low, a_low = signal.butter(3, 180 / (SR / 2), btype="lowpass")
    b_mid, a_mid = signal.butter(2, [150 / (SR / 2), 2400 / (SR / 2)], btype="bandpass")
    rumble = signal.lfilter(b_low, a_low, noise) * env_rumble * 3.5
    crack = signal.lfilter(b_mid, a_mid, noise) * env_crack * 2.0
    return np.tanh(rumble + crack).astype(np.float32)


def sfx_ghost_whoosh(dur: float = 1.4, seed: int = 33) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = rng.standard_normal(len(t))
    b, a = signal.butter(2, [350 / (SR / 2), 2200 / (SR / 2)], btype="bandpass")
    env = np.sin(np.pi * (t / dur)) ** 1.5
    shimmer = (
        np.sin(2 * np.pi * (520 + 80 * t) * t) + np.sin(2 * np.pi * (555 - 60 * t) * t)
    ) * env * 0.25
    return np.tanh(signal.lfilter(b, a, noise) * env * 1.8 + shimmer).astype(np.float32)


def build_gamelan_horror_bed() -> np.ndarray:
    rng = np.random.default_rng(404)
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    bed = np.zeros((N_SAMPLES, 2), dtype=np.float32)

    noise_l = rng.standard_normal(N_SAMPLES)
    noise_r = rng.standard_normal(N_SAMPLES)
    b, a = signal.butter(2, 260 / (SR / 2), btype="lowpass")
    swell = 0.4 + 0.3 * np.sin(2 * np.pi * 0.12 * t)
    bed[:, 0] += signal.lfilter(b, a, noise_l) * swell * 0.14
    bed[:, 1] += signal.lfilter(b, a, noise_r) * swell * 0.14

    chirp_env = (np.sin(2 * np.pi * 3.2 * t) > 0.3).astype(np.float32) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * t))
    cricket = np.sin(2 * np.pi * 4320 * t) * chirp_env * 0.012
    bed[:, 0] += cricket * 0.8
    bed[:, 1] += np.roll(cricket, 4000) * 0.8

    for i, f in enumerate([32.70, 65.41, 98.00, 103.83]):
        lfo = 0.65 + 0.35 * np.sin(2 * np.pi * (0.09 + i * 0.03) * t + i)
        tone = np.sin(2 * np.pi * f * t) * lfo * 0.055
        bed[:, 0] += tone
        bed[:, 1] += tone

    pelog = [261.63, 277.18, 349.23, 392.00, 415.30, 523.25]
    pattern = [0, 1, 3, 4, 3, 1, 0, 2]
    for i, s_time in enumerate(np.arange(0.6, 29.0, 0.75)):
        f = pelog[pattern[i % len(pattern)]]
        nt = np.linspace(0, 0.9, int(SR * 0.9), endpoint=False)
        bonang = (
            np.sin(2 * np.pi * f * nt) * np.exp(-nt * 3.5)
            + 0.45 * np.sin(2 * np.pi * (f * 2.76) * nt) * np.exp(-nt * 9.0)
            + 0.2 * np.sin(2 * np.pi * (f * 5.4) * nt) * np.exp(-nt * 16.0)
        )
        pan = -0.4 if i % 2 == 0 else 0.4
        add_clip(bed, bonang.astype(np.float32), s_time, gain=0.065, pan=pan)

    gong = sfx_gong_ageng(2.4, 65.41)
    for g_time in np.arange(0.2, 29.0, 4.0):
        add_clip(bed, gong, g_time, gain=0.22)

    return bed


def build_wewe(voice_arg: str = "pria_bariton"):
    prompt_wav = prepare_voice_prompt(voice_arg)
    print(f"Mengkloning karakter suara dari sampel: {prompt_wav.name}")
    voice_state = tts_model.get_state_for_audio_prompt(str(prompt_wav))

    bed = build_gamelan_horror_bed()
    sfx = np.zeros((N_SAMPLES, 2), dtype=np.float32)
    vo = np.zeros((N_SAMPLES, 2), dtype=np.float32)

    # Scene 1: Hook (0.0s - 4.0s)
    add_clip(sfx, sfx_gong_ageng(2.6, 55.0), 0.20, gain=0.6)
    add_clip(sfx, sfx_thunder(2.6, 7), 0.45, gain=0.55, pan=0.2)
    add_clip(sfx, sfx_thunder(2.8, 8), 2.30, gain=0.70, pan=-0.2)
    add_clip(sfx, sfx_ghost_whoosh(1.3, 1), 2.35, gain=0.55)

    # Scene 2: Senja di Kampung (4.0s - 11.0s)
    add_clip(sfx, sfx_ghost_whoosh(1.1, 2), 4.00, gain=0.45)
    add_clip(sfx, sfx_gong_ageng(2.2, 65.41), 7.60, gain=0.5)

    # Scene 3: Sosok Wewe Gombel (11.0s - 19.0s)
    add_clip(sfx, sfx_ghost_whoosh(1.6, 3), 11.05, gain=0.65)
    add_clip(sfx, sfx_gong_ageng(2.5, 58.27), 12.10, gain=0.55)
    add_clip(sfx, sfx_ghost_whoosh(1.4, 4), 14.80, gain=0.6)

    # Scene 4: Diculik & Kentongan Warga (19.0s - 26.0s)
    add_clip(sfx, sfx_thunder(2.9, 9), 21.10, gain=0.85)  # DICULIK!
    add_clip(sfx, sfx_ghost_whoosh(1.5, 5), 21.15, gain=0.75)
    add_clip(sfx, sfx_kentongan(12, 0.20), 22.10, gain=0.65, pan=-0.2)
    add_clip(sfx, sfx_kentongan(10, 0.22), 23.80, gain=0.55, pan=0.25)

    # Scene 5: Pesan Orang Tua (26.0s - 30.0s)
    add_clip(sfx, sfx_gong_ageng(2.8, 65.41), 26.20, gain=0.65)
    add_clip(sfx, sfx_ghost_whoosh(1.2, 6), 27.40, gain=0.45)

    # (start_s, max_dur_s, text)
    lines = [
        (0.25, 3.6, "Kenapa anak-anak dilarang bermain di luar saat waktu Magrib tiba?"),
        (4.15, 3.6, "Saat langit berubah merah senja, orang tua selalu menyuruh kita cepat pulang."),
        (7.95, 2.9, "Katanya, anak yang masih keluyuran akan diculik!"),
        (11.15, 3.8, "Dialah Wewe Gombel, sosok penunggu pohon beringin tua yang muncul saat Magrib."),
        (15.15, 3.6, "Ia mengincar anak-anak yang lupa waktu dan masih bermain di kegelapan."),
        (19.05, 2.8, "Tiba-tiba, anak itu hilang di balik kabut pohon beringin!"),
        (22.00, 3.8, "Warga kampung pun keluar memukul kentongan bambu untuk membuatnya takut."),
        (26.05, 3.7, "Jadi ingat, jangan pernah lupa pulang sebelum waktu Magrib tiba!"),
    ]
    for start_s, max_dur_s, text in lines:
        clip = synth_id_cloned(voice_state, text, target_max_s=max_dur_s)
        add_clip(vo, clip, start_s, gain=1.08)

    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    kernel = np.ones(win, dtype=np.float32) / win
    env = np.convolve(vo_mono, kernel, mode="same")
    duck_music = 1.0 / (1.0 + 3.2 * env)
    duck_sfx = 1.0 / (1.0 + 1.1 * env)

    master = bed * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.15
    fade_in = np.minimum(1.0, np.linspace(0, DURATION, N_SAMPLES) / 0.15)
    fade_out = np.minimum(1.0, np.linspace(DURATION, 0, N_SAMPLES) / 0.4)
    master *= (fade_in * fade_out)[:, None]

    peak = np.max(np.abs(master)) + 1e-6
    master = np.tanh(master / peak * 1.6) / np.tanh(1.6) * 0.92

    out_mp3 = OUT_DIR / "wewe_master.mp3"
    wav_path = out_mp3.with_suffix(".wav")
    pcm = (np.clip(master, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())

    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "192k", str(out_mp3)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wav_path.unlink(missing_ok=True)
    print(f"Selesai! Master audio tersimpan di {out_mp3} ({out_mp3.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Wewe Gombel Bahasa Indonesia audio with Zero-Shot Voice Cloning")
    parser.add_argument(
        "--voice",
        default="pria_bariton",
        help="Pilihan preset ('pria_bariton', 'pria_hangat', 'wanita_storyteller', 'wanita_cerah') atau path ke file .wav/.mp3 siapa pun untuk dikloning",
    )
    args = parser.parse_args()
    build_wewe(args.voice)

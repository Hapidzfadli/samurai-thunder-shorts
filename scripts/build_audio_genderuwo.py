import argparse
import math
import subprocess
import wave
from pathlib import Path
import numpy as np
from pocket_tts import TTSModel
from scipy import signal

SR = 44100
DURATION = 59.0
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
        ["ffmpeg", "-y", "-i", str(custom_path), "-ar", "48000", "-ac", "1", "-t", "22", str(out_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return out_wav


print("Memuat model Pocket-TTS Indonesian (502 jam data suara asli Indonesia + Zero-Shot Voice Cloning)...")
tts_model = TTSModel.load_model(
    config=POCKET_CONFIG,
    eos_threshold=-5.5,
    temp=0.62,
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
        ratio = (len(raw) / SR) / target_max_s
        print(f"    (dipadatkan x{ratio:.2f} tanpa mengubah nada)")
        # Pitch-preserving tempo change (atempo accepts 0.5-2.0) instead of resampling, which would raise the pitch.
        proc = subprocess.run(
            ["ffmpeg", "-v", "quiet", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
             "-filter:a", f"atempo={min(ratio, 2.0):.4f}", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"],
            input=raw.astype(np.float32).tobytes(), capture_output=True, check=True,
        )
        raw = np.frombuffer(proc.stdout, dtype=np.float32).copy()
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
    for i, s_time in enumerate(np.arange(0.6, DURATION - 1.0, 0.75)):
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
    for g_time in np.arange(0.2, DURATION - 1.0, 6.0):
        add_clip(bed, gong, g_time, gain=0.22)

    return bed



# ---------------------------------------------------------------------------
# Extra SFX for the Genderuwo story
# ---------------------------------------------------------------------------
def sfx_knock(dur: float = 0.45, f: float = 150.0, seed: int = 0) -> np.ndarray:
    """Heavy wooden thump on a door."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    body = np.sin(2 * np.pi * f * np.exp(-t * 6) * t * 1.0 + 0.0) * np.exp(-t * 14)
    click = rng.standard_normal(len(t)) * np.exp(-t * 90) * 0.5
    b, a = signal.butter(2, 1800 / (SR / 2), btype="lowpass")
    return np.tanh((body * 1.6 + signal.lfilter(b, a, click)) * 1.4).astype(np.float32)


def sfx_roar(dur: float = 1.6, seed: int = 21) -> np.ndarray:
    """Guttural roar: detuned saws falling in pitch + distorted noise."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    f = 95 * np.exp(-t * 0.55) + 35
    phase = 2 * np.pi * np.cumsum(f) / SR
    saw = (2 * ((phase / (2 * np.pi)) % 1.0) - 1.0) + 0.7 * (2 * ((phase * 1.51 / (2 * np.pi)) % 1.0) - 1.0)
    noise = rng.standard_normal(len(t))
    b, a = signal.butter(2, [200 / (SR / 2), 3200 / (SR / 2)], btype="bandpass")
    env = np.minimum(1.0, t / 0.08) * np.exp(-np.maximum(0, t - 0.5) * 1.8)
    out = (saw * 0.5 + signal.lfilter(b, a, noise) * 0.9) * env
    return np.tanh(out * 2.2).astype(np.float32)


def sfx_rustle(dur: float = 1.2, seed: int = 5) -> np.ndarray:
    """Dry leaves scattering."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = rng.standard_normal(len(t))
    b, a = signal.butter(2, [2500 / (SR / 2), 9000 / (SR / 2)], btype="bandpass")
    env = (rng.random(len(t) // 800 + 2)[np.minimum((t * SR // 800).astype(int), len(t) // 800 + 1)]) ** 2
    env *= np.sin(np.pi * t / dur)
    return (signal.lfilter(b, a, noise) * env * 1.4).astype(np.float32)


def sfx_birds(dur: float = 9.0, seed: int = 11) -> np.ndarray:
    """Sparse dawn bird chirps (short upward sweeps)."""
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * dur), dtype=np.float32)
    for st in np.sort(rng.random(16) * (dur - 0.5)):
        n = rng.integers(2, 5)
        base = rng.uniform(2400, 3800)
        for k in range(n):
            ct = np.linspace(0, 0.09, int(SR * 0.09), endpoint=False)
            f = base + 900 * ct / 0.09
            chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * ct / 0.09)
            idx = int((st + k * 0.13) * SR)
            if idx + len(chirp) < len(out):
                out[idx : idx + len(chirp)] += chirp.astype(np.float32) * 0.5
    return out


def voice_deepen(clip: np.ndarray, factor: float = 1.45) -> np.ndarray:
    """Slow & lower the pitch, then add growl distortion + sub boost: the fake husband's true voice."""
    n = int(len(clip) * factor)
    deep = signal.resample(clip, n)
    b, a = signal.butter(2, 140 / (SR / 2), btype="lowpass")
    sub = signal.lfilter(b, a, deep) * 1.2
    growl = np.tanh(deep * 3.0) * 0.6
    out = deep * 0.7 + sub + growl
    return (out / (np.max(np.abs(out)) + 1e-6) * 0.95).astype(np.float32)


def build_genderuwo(voice_arg: str = "pria_bariton", husband_voice: str = "pria_hangat", out_name: str = "genderuwo_master.mp3"):
    narr_wav = prepare_voice_prompt(voice_arg)
    hus_wav = prepare_voice_prompt(husband_voice)
    print(f"Narator: {narr_wav.name} | Suara suami/genderuwo: {hus_wav.name}")
    narr = tts_model.get_state_for_audio_prompt(str(narr_wav))
    hus = tts_model.get_state_for_audio_prompt(str(hus_wav))

    bed = build_gamelan_horror_bed()
    # The bed is quieter & sparser than Wewe's; it also dips into near-silence after the Genderuwo flees.
    tt = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    mask = np.full(N_SAMPLES, 0.75, dtype=np.float32)
    mask *= np.where((tt > 46.0) & (tt < 48.4), 0.12, 1.0)
    mask *= np.interp(tt, [0, 1.5, 54, 59], [0.0, 1.0, 1.0, 0.0])
    bed *= mask[:, None]

    sfx = np.zeros((N_SAMPLES, 2), dtype=np.float32)
    vo = np.zeros((N_SAMPLES, 2), dtype=np.float32)

    # Scene 1 (0-5s): door, shadow passing, three knocks
    add_clip(sfx, sfx_gong_ageng(2.8, 55.0), 0.15, gain=0.55)
    add_clip(sfx, sfx_ghost_whoosh(1.6, 1), 0.6, gain=0.4)
    add_clip(sfx, sfx_gong_ageng(2.4, 49.0), 2.6, gain=0.5)  # red eyes appear
    for i, ts in enumerate([3.07, 3.53, 4.0]):
        add_clip(sfx, sfx_knock(0.5, 130 + 8 * i, i), ts, gain=0.95)

    # Scene 2 (5-13s)
    add_clip(sfx, sfx_ghost_whoosh(1.2, 2), 5.0, gain=0.35)
    add_clip(sfx, sfx_gong_ageng(2.4, 65.41), 11.0, gain=0.4)

    # Scene 3 (13-21s): smell, dog goes silent, eyes in the canopy
    add_clip(sfx, sfx_ghost_whoosh(2.0, 3), 13.3, gain=0.4)
    add_clip(sfx, sfx_gong_ageng(2.6, 58.27), 18.0, gain=0.6)  # red eyes in canopy
    add_clip(sfx, sfx_ghost_whoosh(1.4, 4), 18.1, gain=0.5)

    # Scene 4 (21-30s)
    add_clip(sfx, sfx_ghost_whoosh(1.8, 5), 21.0, gain=0.4)

    # Scene 5 (30-40s): kelor scatter, then the reveal (thunder)
    add_clip(sfx, sfx_rustle(1.3, 6), 30.8, gain=0.7)
    add_clip(sfx, sfx_thunder(2.8, 9), 34.75, gain=0.9)
    add_clip(sfx, sfx_gong_ageng(3.0, 49.0), 34.8, gain=0.7)
    add_clip(sfx, sfx_ghost_whoosh(1.5, 7), 37.1, gain=0.6)

    # Scene 6 (40-48s): pounding, roar, flees, silence
    t0 = 40.0
    while t0 < 44.2:
        add_clip(sfx, sfx_knock(0.5, 110, int(t0 * 10)), t0, gain=1.0)
        t0 += 0.38
    add_clip(sfx, sfx_roar(1.7, 21), 43.45, gain=0.95)
    add_clip(sfx, sfx_ghost_whoosh(2.0, 8), 44.6, gain=0.7)

    # Scene 7 (48-59s): dawn birds
    add_clip(sfx, sfx_birds(10.0, 11), 48.6, gain=0.55)
    add_clip(sfx, sfx_gong_ageng(3.0, 65.41), 55.0, gain=0.35)

    # (start_s, max_dur_s, text, who)
    lines = [
        (0.25, 4.5, "Kalau suamimu pulang tengah malam, padahal katanya bulan depan, jangan buka pintunya!", "n"),
        (5.2, 3.5, "Konon, di sebuah kampung, Yu Darmi tinggal sendirian karena suaminya merantau.", "n"),
        (8.9, 3.9, "Di ujung jalan berdiri beringin tua, yang dipercaya warga sebagai rumah genderuwo.", "n"),
        (13.2, 3.9, "Suatu malam, tercium bau singkong bakar yang menyengat, padahal tak ada yang membakar.", "n"),
        (17.2, 3.6, "Anjing kampung menggonggong, lalu mendadak diam. Lampu minyak bergoyang.", "n"),
        (21.2, 2.8, "Lalu terdengar sebuah suara dari arah beringin.", "n"),
        (24.3, 2.4, "Dik, bukakan pintu. Mas pulang.", "h"),
        (27.0, 2.9, "Suaranya persis suaminya. Tapi kenapa ia tak mau mendekat?", "n"),
        (30.2, 3.6, "Yu Darmi ingat pesan Mbah: sebarkan daun kelor di ambang pintu.", "n"),
        (34.0, 2.8, "Sosok itu berhenti. Tak sanggup melangkah.", "n"),
        (37.1, 2.7, "Bayangannya membesar, matanya merah menyala!", "n"),
        (40.3, 2.4, "Dik, bukakan pintu.", "g"),
        (42.9, 3.0, "Ia menggedor pintu berkali-kali, lalu meraung dan menghilang.", "n"),
        (48.3, 3.4, "Fajar tiba. Hanya tersisa jejak besar berbulu di bawah beringin.", "n"),
        (52.0, 2.8, "Tiga hari kemudian, suami Yu Darmi pulang sungguhan.", "n"),
        (55.0, 3.9, "Kalau ada yang memanggil dari gelap, pastikan dia berani melangkah masuk.", "n"),
    ]
    for start_s, max_dur_s, text, who in lines:
        if who == "n":
            clip = synth_id_cloned(narr, text, target_max_s=max_dur_s)
        else:
            clip = synth_id_cloned(hus, text, target_max_s=max_dur_s / (1.45 if who == "g" else 1.0))
            if who == "g":
                clip = voice_deepen(clip, 1.45)
        dur = len(clip) / SR
        flag = "  <-- MELEBIHI JENDELA" if dur > max_dur_s + 0.05 else ""
        print(f"[{start_s:5.2f}s] {dur:4.2f}s/{max_dur_s:.1f}s ({who}) {text[:48]}{flag}")
        add_clip(vo, clip, start_s, gain=1.08 if who != "g" else 1.15)

    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    kernel = np.ones(win, dtype=np.float32) / win
    env = np.convolve(vo_mono, kernel, mode="same")
    duck_music = 1.0 / (1.0 + 3.2 * env)
    duck_sfx = 1.0 / (1.0 + 0.9 * env)

    master = bed * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.15
    fade_in = np.minimum(1.0, np.linspace(0, DURATION, N_SAMPLES) / 0.15)
    fade_out = np.minimum(1.0, np.linspace(DURATION, 0, N_SAMPLES) / 0.8)
    master *= (fade_in * fade_out)[:, None]

    peak = np.max(np.abs(master)) + 1e-6
    master = np.tanh(master / peak * 1.6) / np.tanh(1.6) * 0.92

    out_mp3 = OUT_DIR / out_name
    wav_path = out_mp3.with_suffix(".wav")
    pcm = (np.clip(master, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "192k", str(out_mp3)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    wav_path.unlink(missing_ok=True)
    print(f"Selesai! Master audio tersimpan di {out_mp3} ({out_mp3.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Genderuwo (Bahasa Indonesia) audio with Zero-Shot Voice Cloning")
    parser.add_argument("--voice", default="pria_bariton", help="Suara narator (preset atau path .wav/.mp3)")
    parser.add_argument("--husband", default="pria_hangat", help="Suara 'suami' (dan dasar suara genderuwo)")
    parser.add_argument("--out", default="genderuwo_master.mp3", help="Nama file mp3 keluaran di public/audio/")
    args = parser.parse_args()
    build_genderuwo(args.voice, args.husband, args.out)

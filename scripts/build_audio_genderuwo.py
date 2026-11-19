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


def set_duration(d: float):
    global DURATION, N_SAMPLES
    DURATION = d
    N_SAMPLES = int(SR * d)


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
    temp=0.5,
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
    # Articulation: lift the consonant/presence band (2-5 kHz) and tame harsh sibilance (6-9 kHz).
    bp, ap = signal.butter(2, [2000 / (SR / 2), 5000 / (SR / 2)], btype="bandpass")
    raw = raw + 0.45 * signal.lfilter(bp, ap, raw)
    bs, as_ = signal.butter(2, [6500 / (SR / 2), 9000 / (SR / 2)], btype="bandpass")
    raw = raw - 0.25 * signal.lfilter(bs, as_, raw)
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


import difflib
import hashlib
import json
import math
import re

FPS = 30
STEP_F = {"fake": 1.7, "real": 1.8, "gen": 3.4}  # steps per second; the video bobs the characters at the same rate
CACHE = ROOT / "voices" / "cache_gen"
TIMING_JSON = ROOT / "src" / "genderuwo_timing.json"

# ---------------------------------------------------------------------------------------------
# Narration, analysed by dramatic function. Each phrase is its own segment so it can get its own
# delivery (pace, pitch, loudness, whisper/shout) and an explicit pause before it.
# (id, pause_before_s, text, fx, candidates)
# fx: rate<1 = slower, pitch<1 = lower (tempo kept), gain, shout, whisper, echo, warm, growl
# ---------------------------------------------------------------------------------------------
SCENES = [
    # key, lead, tail, min_s, segments (id, pause_before_s, text, fx, candidates)
    # fx: rate (>1 faster), pitch, gain, shout, whisper, echo, warm, growl,
    #     emph = words to stress (pitch + loudness bump), emph_st/emph_db = how much,
    #     k = pitch-range expansion (1.0 = natural), end = "fall" (firm) or "rise" (question)
    ("hook", 0.30, 1.9, 4.6, [
        ("hook_1", 0.0, "Kalau suamimu pulang tengah malam.", {"rate": 1.0, "emph": ["pulang", "malam"], "k": 1.35}, 4),
        ("hook_2", 0.60, "Jangan dibuka!", {"shout": True, "rate": 1.0, "gain": 1.5, "emph": ["Jangan", "dibuka"], "emph_st": 3.0, "end": "fall"}, 3),
    ]),
    ("rumah", 0.25, 0.5, 8.0, [
        ("rumah_1", 0.0, "Konon, di sebuah kampung,", {"rate": 1.08, "emph": ["Konon"], "k": 1.4}, 3),
        ("rumah_1b", 0.10, "tengah malam.", {"rate": 0.88, "gain": 0.95, "emph": ["malam"], "emph_st": 2.5}, 3),
        ("rumah_2", 0.45, "Yu Darmi,", {"rate": 0.95, "gain": 1.18, "emph": ["Yu", "Darmi"], "emph_st": 3.0, "emph_db": 2.5}, 3),
        ("rumah_3", 0.10, "tinggal sendirian. Suaminya merantau jauh.", {"rate": 1.1, "emph": ["sendirian", "merantau", "jauh"], "k": 1.4}, 2),
        ("rumah_4", 0.35, "Di ujung jalan, berdiri beringin tua.", {"rate": 1.1, "emph": ["beringin", "tua"]}, 2),
        ("rumah_5", 0.20, "Kata warga, itu rumah genderuwo.", {"rate": 1.0, "gain": 0.98, "emph": ["genderuwo"], "emph_st": 4.0, "end": "fall"}, 2),
    ]),
    ("tanda", 0.25, 0.6, 8.0, [
        ("tanda_1a", 0.0, "Tercium bau singkong bakar yang menyengat.", {"rate": 1.1, "emph": ["singkong", "menyengat"]}, 2),
        ("tanda_1b", 0.30, "Padahal tak ada yang membakar.", {"rate": 1.05, "emph": ["tak", "membakar"], "end": "fall"}, 2),
        ("tanda_2a", 0.40, "Lalu, anjing kampung berhenti menggonggong.", {"rate": 1.0, "gain": 0.92, "emph": ["berhenti", "menggonggong"]}, 2),
        ("tanda_2b", 0.50, "Diam.", {"whisper": True, "rate": 0.9}, 3),
        ("tanda_3", 0.45, "Lampu minyak pun bergoyang.", {"rate": 0.98, "gain": 0.8, "echo": True, "emph": ["bergoyang"], "emph_st": 3.0}, 2),
    ]),
    ("panggil", 0.40, 0.7, 7.5, [
        ("panggil_1", 0.0, "Lalu terdengar suara dari arah beringin.", {"rate": 1.1, "emph": ["suara", "beringin"]}, 2),
        ("panggil_h", 0.70, "Dik... bukakan pintu. Mas pulang.", {"pitch": 0.95, "rate": 1.0, "echo": True, "warm": True, "gain": 0.95, "emph": ["Dik", "pintu", "pulang"], "emph_st": 3.0, "k": 1.5}, 3),
        ("panggil_3a", 0.35, "Suaranya persis suaminya.", {"rate": 1.05, "emph": ["persis"], "emph_st": 4.0}, 2),
        ("panggil_3b", 0.30, "Tapi kenapa ia tak mau mendekat?", {"rate": 0.98, "gain": 0.9, "emph": ["kenapa", "mendekat"], "end": "rise"}, 2),
    ]),
    ("kelor", 0.25, 0.9, 9.5, [
        ("kelor_1a", 0.0, "Yu Darmi ingat pesan Mbah:", {"rate": 1.05, "emph": ["Mbah"]}, 2),
        ("kelor_1b", 0.50, "Sebarkan daun kelor di ambang pintu.", {"rate": 1.0, "gain": 1.12, "emph": ["Sebarkan", "kelor", "pintu"], "end": "fall", "k": 1.2}, 3),
        ("kelor_2", 0.35, "Sosok itu berhenti di depan pintu. Ia tak sanggup melangkah.", {"rate": 1.1, "emph": ["berhenti", "tak", "melangkah"]}, 2),
        ("kelor_3a", 0.35, "Lalu bayangannya membesar.", {"rate": 0.95, "pitch": 0.96, "gain": 0.9, "emph": ["membesar"], "emph_st": 3.0}, 2),
        ("kelor_3b", 0.30, "Dan matanya merah menyalaaa!", {"shout": True, "rate": 0.92, "gain": 1.5, "emph": ["matanya", "merah", "menyala"], "emph_st": 4.5, "emph_db": 4.0}, 3),
    ]),
    ("gedor", 0.25, 2.4, 7.5, [
        ("gedor_g", 0.0, "Dik... bukakan pintu.", {"pitch": 0.74, "rate": 0.92, "growl": True, "echo": True, "gain": 1.1}, 3),
        ("gedor_1a", 0.30, "Ia menggedor pintu berkali-kali,", {"rate": 1.1, "emph": ["menggedor", "berkali-kali"]}, 2),
        ("gedor_1b", 0.20, "lalu meraung, dan menghilang.", {"rate": 1.0, "emph": ["meraung", "menghilang"], "end": "fall"}, 2),
    ]),
    ("fajar", 0.30, 1.9, 9.5, [
        ("fajar_1", 0.0, "Fajar tiba. Hanya tersisa jejak besar berbulu di bawah beringin.", {"rate": 1.08, "emph": ["Fajar", "jejak", "berbulu"]}, 2),
        ("fajar_2", 0.45, "Tiga hari kemudian, suami Yu Darmi pulang sungguhan.", {"rate": 1.08, "emph": ["Tiga", "sungguhan"]}, 2),
        ("fajar_3", 0.60, "Kalau ada yang memanggil dari gelap,", {"rate": 1.0, "gain": 0.95, "emph": ["memanggil", "gelap"]}, 2),
        ("fajar_3b", 0.30, "pastikan dia berani masuk.", {"rate": 0.95, "gain": 1.05, "emph": ["pastikan", "berani", "masuk"], "emph_st": 3.5, "end": "fall"}, 3),
    ]),
]

# Extra candidate counts / alternative spellings fed to the TTS (spoken text stays the same). The ellipsis in
# "Dik..." made the model garble the line, so it is written with commas.
N_OVERRIDE = {"panggil_h": 6, "gedor_g": 6, "kelor_3a": 6, "rumah_2": 5, "kelor_1a": 5, "rumah_5": 4,
              "tanda_1a": 4, "panggil_1": 4, "hook_2": 5, "fajar_1": 3, "fajar_2": 4, "kelor_3b": 5, "rumah_1b": 4}
VARIANTS = {
    "panggil_h": ["Dik, bukakan pintu. Mas pulang.", "Dik, bukakan pintunya. Mas pulang.", "Dik. Bukakan pintu, Dik. Mas pulang."],
    "gedor_g": ["Dik, bukakan pintu.", "Dik. Bukakan pintu, Dik."],
    "kelor_3a": ["Lalu, bayangannya membesar.", "Lalu bayangannya, membesar.", "Lalu bayangannya membesar."],
    "rumah_2": ["Yu Darmi,", "Yu, Darmi.", "Yuu Darmi,"],
    "kelor_1a": ["Yu Darmi ingat pesan Mbah,", "Yu Darmi ingat, pesan Mbah:", "Yu Darmi ingat pesan Mbah:"],
    "rumah_5": ["Kata warga, itu rumah genderuwo.", "Kata warga, itu rumah gendruwo."],
    "kelor_3b": ["Dan matanya merah menyalaaa!", "Dan matanya, merah menyala!"],
}

def tts_clean(text: str) -> str:
    """What the speech model actually receives. It VOICES "!" as an extra syllable ("dibuka!" -> "dibuka indah"),
    and stretched letters ("menyalaaa") add artifacts too. Firmness is done with pace/loudness (fx), not punctuation;
    the on-screen caption keeps its "!"."""
    text = re.sub(r"!+", ".", text)
    text = re.sub(r"(.)\1{2,}", r"\1", text)
    return text


_WHISPER = None


def asr_text(clip: np.ndarray) -> str:
    audio16 = signal.resample_poly(clip, 160, 441).astype(np.float32)
    segs, _ = _whisper().transcribe(audio16, language="id", beam_size=1, vad_filter=False)
    return " ".join(s.text for s in segs)


def _words(s: str):
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).split()


def _letters(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def pick_best(state, texts: list, n: int):
    """Synthesize n candidates (cycling through spelling variants) at natural speed and keep the one
    speech recognition hears most clearly. Similarity is measured per letter, so names and spacing don't hurt."""
    best, best_score = None, -1.0
    for i in range(n):
        text = texts[i % len(texts)]
        clip = synth_id_cloned(state, text, target_max_s=None)
        heard = asr_text(clip)
        score = difflib.SequenceMatcher(None, _letters(text), _letters(heard)).ratio()
        exp = max(0.5, 0.33 * len(_words(text)))
        score -= 0.04 * min(1.0, abs(len(clip) / SR - exp) / exp)
        print(f"      cand {i + 1}/{n}: {score:.2f}  <- '{heard.strip()}'")
        if score > best_score:
            best, best_score = clip, score
    if best_score < 0.65:
        print(f"      !! LEMAH (skor terbaik {best_score:.2f})")
    return best


def get_raw(state, voice_key: str, sid: str, text: str, n: int) -> np.ndarray:
    CACHE.mkdir(parents=True, exist_ok=True)
    if sid in N_OVERRIDE or sid in VARIANTS:
        n = N_OVERRIDE.get(sid, n)
        texts = [tts_clean(t) for t in VARIANTS.get(sid, [text])]
        key = hashlib.sha1(f"{voice_key}|{'/'.join(texts)}|n{n}|t0.5|v5".encode()).hexdigest()[:16]
    else:  # unchanged segments keep their already-chosen v4 clip
        texts = [tts_clean(text)]
        key = hashlib.sha1(f"{voice_key}|{text}|n{n}|t0.5|v4".encode()).hexdigest()[:16]
    f = CACHE / f"{key}.npy"
    if f.exists():
        return np.load(f)
    clip = pick_best(state, texts, n)
    np.save(f, clip)
    return clip


# ---------------------------------------------------------------------------------------------
# Delivery effects
# ---------------------------------------------------------------------------------------------
def ffmpeg_filter(clip: np.ndarray, af: str) -> np.ndarray:
    p = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", af,
         "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"],
        input=clip.astype(np.float32).tobytes(), capture_output=True, check=True,
    )
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def norm_rms(x: np.ndarray, target: float = 0.11) -> np.ndarray:
    idx = np.abs(x) > 0.02
    rms = float(np.sqrt(np.mean(x[idx] ** 2))) if idx.any() else 1.0
    return x * (target / (rms + 1e-6))


def whisperize(x: np.ndarray) -> np.ndarray:
    rng = np.random.default_rng(3)
    w = int(0.02 * SR)
    env = np.convolve(np.abs(x), np.ones(w) / w, mode="same")
    b, a = signal.butter(2, [1200 / (SR / 2), 6500 / (SR / 2)], btype="bandpass")
    n = signal.lfilter(b, a, rng.standard_normal(len(x)))
    n = n / (np.std(n) + 1e-6) * env * 1.8
    return norm_rms(0.35 * x + n, 0.07)


def shout(x: np.ndarray) -> np.ndarray:
    x = x * 1.9
    b, a = signal.butter(2, [1500 / (SR / 2), 4500 / (SR / 2)], btype="bandpass")
    x = x + 0.5 * signal.lfilter(b, a, x)
    return np.tanh(x * 1.6) / np.tanh(1.6) * 0.9


def growl(x: np.ndarray) -> np.ndarray:
    b, a = signal.butter(2, 150 / (SR / 2), btype="lowpass")
    out = x * 0.7 + signal.lfilter(b, a, x) * 1.1 + np.tanh(x * 3.0) * 0.5
    return out / (np.max(np.abs(out)) + 1e-6) * 0.4



import pyworld as pw


def _whisper():
    global _WHISPER
    if _WHISPER is None:
        from faster_whisper import WhisperModel
        _WHISPER = WhisperModel("small", device="cpu", compute_type="int8")
    return _WHISPER


def asr_words(clip: np.ndarray):
    audio16 = signal.resample_poly(clip, 160, 441).astype(np.float32)
    segs, _ = _whisper().transcribe(audio16, language="id", beam_size=5, word_timestamps=True)
    return [(w.word.strip(), w.start, w.end) for sg in segs for w in (sg.words or [])]


def _nw(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


def expressive(clip: np.ndarray, fx: dict) -> np.ndarray:
    """Make the delivery livelier without touching the voice colour:
    widen the pitch range (k), lift pitch + loudness on the words to stress, and shape how the line ends
    (fall = firm statement, rise = question)."""
    k = fx.get("k", 1.3)
    emph = fx.get("emph", [])
    est, edb = fx.get("emph_st", 3.5), fx.get("emph_db", 3.0)
    end = fx.get("end")
    x = np.ascontiguousarray(clip, dtype=np.float64)
    f0, tt = pw.harvest(x, SR, f0_floor=70, f0_ceil=450, frame_period=5.0)
    voiced = f0 > 0
    if voiced.sum() < 20:
        return clip
    sp = pw.cheaptrick(x, f0, tt, SR)
    ap = pw.d4c(x, f0, tt, SR)
    lf = np.log2(f0[voiced])
    m = lf.mean()
    f0n = f0.copy()
    f0n[voiced] = 2 ** (m + k * (lf - m))
    n = len(f0)
    shift, amp = np.zeros(n), np.zeros(n)
    if emph:
        words = asr_words(clip)
        for e in emph:
            if not words:
                break
            best = max(words, key=lambda w: difflib.SequenceMatcher(None, _nw(e), _nw(w[0])).ratio())
            if difflib.SequenceMatcher(None, _nw(e), _nw(best[0])).ratio() >= 0.6:
                i0, i1 = int(best[1] / 0.005), min(n, int(best[2] / 0.005) + 1)
                if i1 > i0 + 3:
                    bump = np.hanning(i1 - i0 + 2)[1:-1]
                    shift[i0:i1] = np.maximum(shift[i0:i1], est * bump)
                    amp[i0:i1] = np.maximum(amp[i0:i1], bump)
    vi = np.where(voiced)[0]
    if end and len(vi) > 25:
        L = min(60, len(vi))
        shift[vi[-L:]] += (4.0 if end == "rise" else -3.0) * np.linspace(0, 1, L)
    shift = np.convolve(shift, np.ones(5) / 5, mode="same")
    f0n[voiced] *= 2 ** (shift[voiced] / 12)
    y = pw.synthesize(f0n, sp, ap, SR, 5.0)
    env = np.interp(np.arange(len(y)) / SR, tt, 1 + (10 ** (edb / 20) - 1) * amp)
    y = y * env
    ref = np.sqrt(np.mean(x[np.abs(x) > 0.02] ** 2)) if (np.abs(x) > 0.02).any() else 0.1
    cur = np.sqrt(np.mean(y[np.abs(y) > 0.02] ** 2)) if (np.abs(y) > 0.02).any() else 0.1
    return (y * (ref / (cur + 1e-9))).astype(np.float32)

def apply_fx(clip: np.ndarray, fx: dict) -> np.ndarray:
    if fx.get("emph") or fx.get("end") or "k" in fx:
        clip = expressive(clip, fx)
    clip = norm_rms(clip)
    af = []
    pitch = fx.get("pitch")
    if pitch:
        af += [f"asetrate={int(SR * pitch)}", f"aresample={SR}", f"atempo={1 / pitch:.4f}"]
    rate = fx.get("rate")
    if rate and abs(rate - 1.0) > 1e-3:
        af.append(f"atempo={rate:.4f}")
    if fx.get("warm"):
        af.append("lowpass=f=4800")
    if fx.get("echo"):
        af += ["apad=pad_dur=0.45", "aecho=0.8:0.55:85:0.32"]
    if af:
        clip = ffmpeg_filter(clip, ",".join(af))
    if fx.get("growl"):
        clip = growl(clip)
    if fx.get("whisper"):
        clip = whisperize(clip)
    if fx.get("shout"):
        clip = shout(clip)
    return (clip * fx.get("gain", 1.0)).astype(np.float32)


# ---------------------------------------------------------------------------------------------
# More SFX
# ---------------------------------------------------------------------------------------------
def sfx_bark(dur: float = 0.22, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    f = 520 * np.exp(-t * 4.0) + 260
    voiced = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    b, a = signal.butter(2, [500 / (SR / 2), 3000 / (SR / 2)], btype="bandpass")
    noise = signal.lfilter(b, a, rng.standard_normal(len(t)))
    env = np.minimum(1.0, t / 0.015) * np.exp(-t * 14)
    return np.tanh((voiced * 0.6 + noise * 0.5) * env * 1.6).astype(np.float32)


def sfx_creak(dur: float = 1.6, seed: int = 4) -> np.ndarray:
    """Swinging lamp chain: slow wooden/metal creak."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    f = 190 + 70 * np.sin(2 * np.pi * 1.3 * t) + 25 * rng.standard_normal(len(t)) * 0.0
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * t)) ** 2
    b, a = signal.butter(2, [300 / (SR / 2), 2200 / (SR / 2)], btype="bandpass")
    grit = signal.lfilter(b, a, rng.standard_normal(len(t))) * 0.25
    env = np.sin(np.pi * t / dur) ** 1.2
    return np.tanh((tone * 0.7 + grit) * env).astype(np.float32)


def plan(clips: dict) -> dict:
    t_scene = 0.0
    scenes, lines = {}, {}
    for key, lead, tail, min_s, segs in SCENES:
        t = lead
        for sid, gap, text, fx, n in segs:
            t += gap
            dur = len(clips[sid]) / SR
            lines[sid] = {"scene": key, "text": text, "ls": t, "le": t + dur}
            t += dur
        frames = max(math.ceil(max(min_s, t + tail) * FPS), 1)
        scenes[key] = {"frames": frames, "start_s": t_scene}
        for sid, *_ in segs:
            lines[sid]["gs"] = t_scene + lines[sid]["ls"]
            lines[sid]["ge"] = t_scene + lines[sid]["le"]
        t_scene += frames / FPS
    return {"scenes": scenes, "lines": lines, "total_s": t_scene}


def anchors(P: dict) -> dict:
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    return {
        "hook.eyes": L["hook_1"]["le"] + 0.25,
        "hook.text": L["hook_2"]["ls"],
        "hook.knock1": L["hook_2"]["le"] + 0.15,
        "hook.knock2": L["hook_2"]["le"] + 0.62,
        "hook.knock3": L["hook_2"]["le"] + 1.09,
        "rumah.pan": L["rumah_4"]["ls"],
        "tanda.eyes": L["tanda_2b"]["ls"] + 0.15,
        "tanda.lamp0": L["tanda_3"]["ls"] - 0.4,
        "tanda.bark": L["tanda_2a"]["ls"] + 0.1,
        "panggil.walk0": 0.5,
        "panggil.walk1": L["panggil_h"]["ls"] - 0.2,
        "panggil.quote0": L["panggil_h"]["ls"],
        "panggil.quote1": L["panggil_3a"]["ls"] - 0.2,
        "kelor.leaves": L["kelor_1b"]["ls"] + 0.5,
        "kelor.approach0": 0.3,
        "kelor.approach1": L["kelor_2"]["ls"],
        "kelor.eyes": L["kelor_2"]["ls"] + 0.6 * d("kelor_2"),
        "kelor.flip": L["kelor_3a"]["ls"] + 0.3,
        "kelor.flare": L["kelor_3b"]["ls"],
        "gedor.roar": L["gedor_1b"]["ls"] + 0.1,
        "gedor.flee0": L["gedor_1b"]["ls"] + 1.0,
        "gedor.flee1": L["gedor_1b"]["ls"] + 2.9,
        "fajar.husband0": L["fajar_2"]["ls"] - 0.3,
        "fajar.husband1": L["fajar_2"]["le"] + 1.2,
        "fajar.card": L["fajar_3"]["ls"] - 0.2,
        "fajar.big": L["fajar_3b"]["ls"],
    }


def write_timing(P: dict, ev: dict):
    out = {
        "fps": FPS,
        "total_frames": sum(s["frames"] for s in P["scenes"].values()),
        "scenes": {k: v["frames"] for k, v in P["scenes"].items()},
        "lines": {
            k: {"scene": v["scene"], "text": v["text"], "from": int(v["ls"] * FPS), "to": math.ceil(v["le"] * FPS)}
            for k, v in P["lines"].items()
        },
        "events": {k: round(v * FPS) for k, v in ev.items()},
        "stepF": STEP_F,
    }
    TIMING_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return out



# =============================================================================================
# Sound design (see research notes in the commit message): layered ambience that can be cut dead,
# three-layer footsteps with distance, a layered creature roar, and J/L-cut style transitions.
# =============================================================================================
def reverb(x, rt=1.1, wet=0.25, lp=2500, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * rt)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / rt)
    b, a = signal.butter(2, lp / (SR / 2), btype="lowpass")
    ir = signal.lfilter(b, a, ir)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    x = np.array(x, dtype=np.float64)
    fl = min(len(x) // 4, int(0.04 * SR))
    x[-fl:] *= np.linspace(1.0, 0.0, fl)
    y = signal.fftconvolve(x, ir)
    out = np.zeros(len(y), dtype=np.float64)
    out[: len(x)] += x * (1.0 - 0.5 * wet)
    out += y * wet * 1.4
    return out.astype(np.float32)


def _bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="bandpass")
    return signal.lfilter(b, a, x)


def _lp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), btype="lowpass")
    return signal.lfilter(b, a, x)


def _put(buf, clip, t0, gl=1.0, gr=1.0):
    i0 = int(t0 * SR)
    if i0 >= len(buf) or i0 + len(clip) <= 0:
        return
    if i0 < 0:
        clip = clip[-i0:]
        i0 = 0
    i1 = min(len(buf), i0 + len(clip))
    seg = clip[: i1 - i0]
    buf[i0:i1, 0] += seg * gl
    buf[i0:i1, 1] += seg * gr


def amb_crickets(total, seed=7):
    """Jangkrik: each cricket is a train of 3-4 short ~4.5-5 kHz pulses, repeating with a little jitter."""
    rng = np.random.default_rng(seed)
    out = np.zeros((int(SR * total) + SR, 2), dtype=np.float32)
    for c in range(8):
        fc = rng.uniform(4300, 5300)
        pan = rng.uniform(-0.8, 0.8)
        gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        lvl = rng.uniform(0.5, 1.0)
        period = rng.uniform(0.36, 0.7)
        tt = np.arange(int(0.014 * SR)) / SR
        pulse = (np.sin(2 * np.pi * fc * tt) * np.sin(np.pi * tt / 0.014) ** 2).astype(np.float32)
        t = rng.uniform(0, period)
        while t < total - 0.4:
            sp = rng.uniform(0.034, 0.05)
            for k in range(int(rng.integers(3, 5))):
                _put(out, pulse * lvl, t + k * sp, gl, gr)
            t += period * rng.uniform(0.85, 1.2) + (rng.uniform(0.4, 1.6) if rng.random() < 0.08 else 0.0)
    return out[: int(SR * total)]


def amb_frogs(total, seed=9):
    rng = np.random.default_rng(seed)
    out = np.zeros((int(SR * total) + SR, 2), dtype=np.float32)
    for c in range(2):
        t = rng.uniform(1.0, 4.0)
        base = rng.uniform(380, 520)
        pan = rng.uniform(-0.7, 0.7)
        gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        while t < total - 1.0:
            dur = rng.uniform(0.35, 0.55)
            tt = np.arange(int(SR * dur)) / SR
            croak = np.sin(2 * np.pi * np.cumsum(base * (1 + 0.15 * np.exp(-tt * 8))) / SR) * (0.55 + 0.45 * np.sin(2 * np.pi * 26 * tt))
            croak = _lp(croak * np.sin(np.pi * tt / dur) ** 1.5, 1300)
            _put(out, croak.astype(np.float32) * 0.8, t, gl, gr)
            t += rng.uniform(2.2, 5.5)
    return out[: int(SR * total)]


def amb_owl(times, total):
    out = np.zeros((int(SR * total) + SR, 2), dtype=np.float32)
    for t0 in times:
        for k, f in enumerate([430, 345]):
            tt = np.arange(int(0.42 * SR)) / SR
            note = np.sin(2 * np.pi * f * tt + 6 * np.sin(2 * np.pi * 5 * tt) * 0.02) * np.sin(np.pi * tt / 0.42) ** 2
            _put(out, _lp(note, 1100).astype(np.float32) * 0.7, t0 + k * 0.55, 0.8, 0.5)
    return out[: int(SR * total)]


def amb_wind(total, seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * total)
    t = np.linspace(0, total, n, endpoint=False)
    out = np.zeros((n, 2), dtype=np.float32)
    for ch in range(2):
        noise = rng.standard_normal(n)
        low = _lp(noise, 420, 3) * (0.35 + 0.25 * np.sin(2 * np.pi * 0.07 * t + ch))
        gust = _bp(noise, 300, 1100) * np.clip(np.sin(2 * np.pi * 0.045 * t + 1.7 + ch), 0, 1) ** 2 * 0.5
        out[:, ch] = (low + gust).astype(np.float32)
    return out


def amb_room(total, seed=5):
    rng = np.random.default_rng(seed)
    n = int(SR * total)
    t = np.linspace(0, total, n, endpoint=False)
    x = _lp(rng.standard_normal(n), 160, 3) * 0.5 + np.sin(2 * np.pi * 50 * t) * 0.03
    return np.stack([x, x], axis=1).astype(np.float32)


def amb_birds(total, seed=11):
    """Dawn chorus: several species with different chirp shapes, rising density."""
    rng = np.random.default_rng(seed)
    out = np.zeros((int(SR * total) + SR, 2), dtype=np.float32)
    for species in range(4):
        base = rng.uniform(2200, 4200)
        sweep = rng.uniform(-900, 1200)
        pan = rng.uniform(-0.8, 0.8)
        gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        t = rng.uniform(0.2, 2.0)
        while t < total - 0.6:
            for k in range(int(rng.integers(2, 6))):
                d = rng.uniform(0.06, 0.12)
                ct = np.arange(int(SR * d)) / SR
                f = base + sweep * ct / d
                ch = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * ct / d) ** 1.2
                _put(out, ch.astype(np.float32) * 0.5, t + k * (d + 0.04), gl, gr)
            t += rng.uniform(1.4, 4.5)
    return out[: int(SR * total)]


def sfx_riser(dur=1.2, seed=2):
    """Reverse-swell: layered noise bands that bloom upward and peak at the very end."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    for i, (lo, hi) in enumerate([(200, 500), (450, 1100), (1000, 2600), (2400, 6000)]):
        env = np.clip((t - i * 0.12) / (1 - i * 0.12), 0, 1) ** (2.2 + 0.4 * i)
        out += _bp(noise, lo, hi) * env * (1.0 - 0.15 * i)
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.9).astype(np.float32)


def sfx_boom(dur=1.8, f=52, seed=4):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.8 * np.exp(-t * 9))) / SR
    x = np.sin(ph) * np.exp(-t * 2.6) + 0.3 * np.sin(2 * ph) * np.exp(-t * 5)
    y = reverb(np.tanh(x * 1.4).astype(np.float32), rt=1.6, wet=0.3, lp=900, seed=seed)
    return (y / (np.max(np.abs(y)) + 1e-9) * 0.9).astype(np.float32)


def sfx_pad_dawn(dur=4.0):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    env = np.minimum(1.0, t / 1.6) * np.exp(-np.maximum(0, t - 1.8) * 0.9)
    x = sum(np.sin(2 * np.pi * f * t + i) * g for i, (f, g) in enumerate([(261.6, 1), (329.6, 0.7), (392.0, 0.8), (523.3, 0.35)]))
    return (x * env * 0.25).astype(np.float32)


def sfx_step(seed: int, dist: float, kind: str = "dirt", bag: bool = False) -> np.ndarray:
    """Dirt footstep in three layers (attack / body / grit) with heel and toe, then distance:
    quieter and duller the farther away. kind: sandal (husband) or heavy (creature)."""
    rng = np.random.default_rng(seed)
    w = 1.0 if kind != "heavy" else 2.6
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # heel: body thump + attack click
    thump = np.sin(2 * np.pi * (62 + 38 * np.exp(-t * 70)) * t / (1.0 if kind != "heavy" else 1.3)) * np.exp(-t * (36 if kind != "heavy" else 16))
    out += thump * 0.9 * w * rng.uniform(0.9, 1.1)
    click = _bp(rng.standard_normal(n), 1200, 4200) * np.exp(-t * 180)
    out += click * 0.35 * (1.0 if kind != "heavy" else 0.5)
    # grit: a handful of tiny noise grains, as soil/gravel gives way under the foot
    for g in range(int(rng.integers(5, 9))):
        g0 = int(rng.uniform(0.004, 0.075) * SR)
        glen = int(rng.uniform(0.002, 0.006) * SR)
        grain = _bp(rng.standard_normal(glen + 64), 2200, 7000)[:glen] * np.hanning(glen)
        out[g0 : g0 + glen] += grain * rng.uniform(0.15, 0.45)
    # toe-off: lighter, a beat later, plus a short slide
    to = int(0.10 * SR)
    tt = t[: n - to]
    out[to:] += np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 55) * 0.35 * w
    out[to:] += _bp(rng.standard_normal(n - to), 1500, 5000) * np.exp(-tt * 90) * 0.12
    if kind == "sandal":
        sl = int(0.15 * SR)
        slide = _bp(rng.standard_normal(sl), 900, 3500) * np.sin(np.pi * np.arange(sl) / sl) ** 2 * 0.10
        out[int(0.16 * SR) : int(0.16 * SR) + sl] += slide
    if bag:  # cloth/bag rustle
        rl = int(0.07 * SR)
        out[int(0.03 * SR) : int(0.03 * SR) + rl] += _bp(rng.standard_normal(rl), 2500, 6500) * np.hanning(rl) * 0.12
    # distance: level ~1/d and air absorption (the highs go first)
    out = _lp(out, float(np.clip(9500 - 420 * dist, 1100, 9500)), 2)
    out *= float(np.clip(4.5 / max(dist, 1.0), 0.05, 1.0))
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.8 * float(np.clip(4.5 / max(dist, 1.0), 0.06, 1.0))).astype(np.float32)


def sfx_roar2(dur=1.9, seed=21, size=1.0):
    """Layered creature roar: inhale -> glottal source (f0 glide + jitter + 28 Hz growl AM) through two vowel
    formant sets shifted down (big body) -> sub one octave under -> saturation -> rasp tail -> dark reverb."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    smooth = lambda k: _lp(rng.standard_normal(n), k, 2)
    jit = smooth(9) / (np.std(smooth(9)) + 1e-9)
    f0 = np.interp(t, [0, 0.12, 0.5, dur], [95, 150, 120, 70]) * (1 + 0.012 * jit) / size
    ph = 2 * np.pi * np.cumsum(f0) / SR
    src = 2 * ((ph / (2 * np.pi)) % 1.0) - 1.0
    gm = 27 + 5 * smooth(2) / (np.std(smooth(2)) + 1e-9) * 0.0
    src = src * (1 - 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * gm * t)))
    breath = rng.standard_normal(n)
    drive = src + 0.3 * breath
    shift = 0.76  # formants down ~24% = a much bigger vocal tract
    vowels = {"o": [480, 830, 2300], "a": [700, 1150, 2500]}

    def formants(x, F):
        o = 0
        for f, g in zip(F, [1.0, 0.7, 0.35]):
            o = o + g * _bp(x, f * shift * 0.86, f * shift * 1.14)
        return o

    vo, va = formants(drive, vowels["o"]), formants(drive, vowels["a"])
    w = np.interp(t, [0, 0.3, dur * 0.7, dur], [0, 1, 1, 0.2])
    voice = vo * (1 - w) + va * w
    sub = np.sin(2 * np.pi * np.cumsum(f0 / 2) / SR)
    env = np.minimum(1.0, t / 0.07) * np.exp(-np.maximum(0, t - dur * 0.5) * 2.4)
    x = np.tanh((voice / (np.std(voice) + 1e-9) * 0.9 + sub * 1.3) * env * 1.8)
    # rasp tail (exhale)
    rn = int(0.7 * SR)
    rasp = _bp(rng.standard_normal(rn), 700, 3000) * np.minimum(1.0, np.arange(rn) / (0.05 * SR)) * np.exp(-np.arange(rn) / SR * 5.0) * 0.35
    x = np.concatenate([x, np.zeros(rn)])
    x[int(dur * SR * 0.55) : int(dur * SR * 0.55) + rn] += rasp
    # inhale before the roar
    inn = int(0.32 * SR)
    inh = _bp(rng.standard_normal(inn), 600, 3200) * (np.arange(inn) / inn) ** 1.6 * 0.3
    clip = np.concatenate([inh, x]).astype(np.float32)
    clip = reverb(clip, rt=1.1, wet=0.28, lp=1800, seed=seed)
    return (clip / (np.max(np.abs(clip)) + 1e-9) * 0.95).astype(np.float32), 0.32


def silence_mask(total, windows, fast=0.04, slow=0.6):
    """Gain curve: drops to `depth` almost instantly (the absence is the event) and returns slowly."""
    pts_t, pts_g = [0.0], [1.0]
    for t0, t1, depth in sorted(windows):
        pts_t += [max(t0 - fast, pts_t[-1] + 1e-3), t0, t1, t1 + slow]
        pts_g += [1.0, depth, depth, 1.0]
    pts_t.append(total + 1)
    pts_g.append(1.0)
    return pts_t, pts_g


def scene_gain(S, order, per_scene, total, jcut=0.5, xf=1.3):
    """Layer gain per scene with J-cut: the next scene's ambience begins `jcut` s before the picture changes."""
    pts_t, pts_g = [0.0], [per_scene[order[0]]]
    for i in range(1, len(order)):
        c = S[order[i]] - jcut
        pts_t += [c - xf / 2, c + xf / 2]
        pts_g += [per_scene[order[i - 1]], per_scene[order[i]]]
    pts_t.append(total + 1)
    pts_g.append(per_scene[order[-1]])
    return pts_t, pts_g


def curve(total, pts_t, pts_g):
    tt = np.linspace(0, total, int(SR * total), endpoint=False)
    return np.interp(tt, pts_t, pts_g).astype(np.float32)


def build_genderuwo(voice_arg: str, out_name: str = "genderuwo_master.mp3"):
    narr_wav = prepare_voice_prompt(voice_arg)
    print(f"Suara narator (dipakai untuk semua tokoh): {narr_wav.name}")
    narr = tts_model.get_state_for_audio_prompt(str(narr_wav))

    clips = {}
    for key, _, _, _, segs in SCENES:
        for sid, gap, text, fx, n in segs:
            raw = get_raw(narr, narr_wav.name, sid, text, n)
            clips[sid] = apply_fx(raw, fx)

    P = plan(clips)
    ev = anchors(P)
    timing = write_timing(P, ev)
    total = P["total_s"]
    print(f"Total durasi video: {total:.1f}s ({timing['total_frames']} frame)")

    set_duration(total)
    order = [k for k, *_ in SCENES]
    S = {k: v["start_s"] for k, v in P["scenes"].items()}
    G = lambda name: S[name.split(".")[0]] + ev[name]
    L = P["lines"]
    N = N_SAMPLES

    # ---- silence windows: cut-to-silence moments (research: the absence is the event) ----
    sil = [
        (L["hook_1"]["ge"] + 0.1, L["hook_2"]["gs"] - 0.02, 0.04),                  # the breath before "Jangan dibuka!"
        (L["tanda_2a"]["ge"] - 0.2, L["tanda_3"]["gs"] + 0.5, 0.0),                  # the dog stops; the night holds still
        (G("gedor.flee1") - 0.3, S["fajar"] + 0.8, 0.03),                           # after it flees
    ]
    mt, mg = silence_mask(total, sil)
    m_all = curve(total, mt, mg)
    mt2, mg2 = silence_mask(total, [(a, b, max(d, 0.18)) for a, b, d in sil], slow=0.9)
    m_soft = curve(total, mt2, mg2)  # wind/room tone never fully vanish, just thin out

    # ---- ambience is used only at chosen moments (scene openings, dramatic pauses, tails), never as a constant bed ----
    scene_end = {k: S[k] + P["scenes"][k]["frames"] / FPS for k in order}
    first = {k: min(v["gs"] for v in L.values() if v["scene"] == k) for k in order}
    last = {k: max(v["ge"] for v in L.values() if v["scene"] == k) for k in order}
    moments = []
    for k in order:
        if k != "hook":
            moments.append((S[k] - 0.6, first[k] + 0.15))        # opening: swells in under the transition (J-cut)
        if k not in ("gedor",):
            moments.append((last[k] - 0.1, scene_end[k] + 0.6))  # tail: breathes after the last line (L-cut)
    for a_, b_ in (("rumah_1b", "rumah_2"), ("panggil_1", "panggil_h"), ("kelor_1a", "kelor_1b"), ("fajar_2", "fajar_3")):
        moments.append((L[a_]["ge"] - 0.05, L[b_]["gs"] + 0.05))  # the pause before a key line
    moments.append((L["tanda_1b"]["ge"], L["tanda_2a"]["ge"]))     # crickets build, so the cut to silence lands
    tt_all = np.linspace(0, total, N, endpoint=False)
    gate = np.zeros(N, dtype=np.float32)
    for t0_, t1_ in moments:
        fade = 0.45
        gate = np.maximum(gate, np.clip(np.minimum((tt_all - t0_) / fade, (t1_ - tt_all) / fade), 0, 1).astype(np.float32))
    m_all = m_all * gate
    m_soft = m_soft * gate

    # ---- ambience layers, each with its own per-scene level and J-cut crossfades ----
    g_cr = {"hook": 0.18, "rumah": 1.0, "tanda": 1.0, "panggil": 0.9, "kelor": 0.75, "gedor": 0.9, "fajar": 0.0}
    g_fr = {"hook": 0.0, "rumah": 0.8, "tanda": 0.7, "panggil": 0.6, "kelor": 0.4, "gedor": 0.5, "fajar": 0.0}
    g_wd = {"hook": 0.25, "rumah": 0.7, "tanda": 0.8, "panggil": 0.8, "kelor": 0.9, "gedor": 1.0, "fajar": 0.5}
    g_rm = {"hook": 1.0, "rumah": 0.0, "tanda": 0.0, "panggil": 0.15, "kelor": 0.15, "gedor": 0.15, "fajar": 0.0}
    g_bd = {"hook": 0, "rumah": 0, "tanda": 0, "panggil": 0, "kelor": 0, "gedor": 0, "fajar": 1.0}
    cur = lambda d: curve(total, *scene_gain(S, order, d, total))
    amb = np.zeros((N, 2), dtype=np.float32)
    amb += amb_crickets(total) * 0.19 * (cur(g_cr) * m_all)[:, None]
    amb += amb_frogs(total) * 0.16 * (cur(g_fr) * m_all)[:, None]
    amb += amb_wind(total) * 0.30 * (cur(g_wd) * m_soft)[:, None]
    amb += amb_room(total) * 0.32 * (cur(g_rm) * m_soft)[:, None]
    # the dawn chorus begins under the last seconds of silence (L-cut into the picture)
    birds_t0 = S["fajar"] - 0.2
    birds = amb_birds(total - birds_t0)
    amb[int(birds_t0 * SR) : int(birds_t0 * SR) + len(birds)] += birds[: N - int(birds_t0 * SR)] * 0.22 * np.minimum(1.0, np.linspace(0, 6, len(birds)))[:, None][: N - int(birds_t0 * SR)] * gate[int(birds_t0 * SR) : int(birds_t0 * SR) + len(birds)][:, None][: N - int(birds_t0 * SR)]
    amb += amb_owl([L["rumah_1b"]["ge"] + 0.05, L["panggil_1"]["ge"] + 0.05], total) * 0.2 * m_all[:, None]

    # ---- music: a drone that swells toward the scares, sparse gamelan only where it is calm ----
    mus = np.zeros((N, 2), dtype=np.float32)
    tt = np.linspace(0, total, N, endpoint=False)
    inten = np.interp(tt, [0, S["rumah"], S["tanda"], S["panggil"], S["kelor"], G("kelor.flare"), S["gedor"], G("gedor.flee1"), S["fajar"], total],
                      [0.5, 0.3, 0.35, 0.4, 0.55, 1.0, 0.8, 0.15, 0.3, 0.25])
    for i, f in enumerate([32.70, 49.0, 65.41, 98.0]):
        lfo = 0.7 + 0.3 * np.sin(2 * np.pi * (0.07 + i * 0.03) * tt + i)
        d = np.sin(2 * np.pi * f * tt) * lfo * (0.016 + 0.05 * inten)
        mus[:, 0] += d
        mus[:, 1] += d
    pelog = [261.63, 277.18, 349.23, 392.00, 415.30, 523.25]
    pat = [0, 1, 3, 4, 3, 1, 0, 2]
    k = 0
    for scene, step in (("rumah", 2.8), ("fajar", 3.2)):
        t0 = S[scene] + 1.0
        while t0 < S[scene] + P["scenes"][scene]["frames"] / FPS - 1.0:
            nt = np.arange(int(0.9 * SR)) / SR
            f = pelog[pat[k % len(pat)]]
            bn = np.sin(2 * np.pi * f * nt) * np.exp(-nt * 3.5) + 0.4 * np.sin(2 * np.pi * f * 2.76 * nt) * np.exp(-nt * 9)
            _put(mus, bn.astype(np.float32) * 0.05, t0, 0.8 if k % 2 else 0.5, 0.5 if k % 2 else 0.8)
            t0 += step
            k += 1
    mus *= (m_all * 0.92 + 0.08)[:, None] * np.interp(tt, [0, 1.5, total - 4, total], [0, 1, 1, 0])[:, None]

    sfx = np.zeros((N, 2), dtype=np.float32)
    vo = np.zeros((N, 2), dtype=np.float32)

    # ---- scene transitions: swell into the cut + a low hit, tuned to the mood of what comes next ----
    trans = {"rumah": "soft", "tanda": "soft", "panggil": "dark", "kelor": "dark", "gedor": "impact", "fajar": "dawn"}
    for sc, kind in trans.items():
        b = S[sc]
        if kind == "soft":
            add_clip(sfx, sfx_riser(1.0, 2), b - 1.0, gain=0.20)
            add_clip(sfx, sfx_gong_ageng(2.0, 65.41), b, gain=0.18)
        elif kind == "dark":
            add_clip(sfx, sfx_riser(1.3, 3), b - 1.3, gain=0.30)
            add_clip(sfx, sfx_boom(1.8, 52), b, gain=0.42)
        elif kind == "impact":
            add_clip(sfx, sfx_riser(0.7, 4), b - 0.7, gain=0.30)
            add_clip(sfx, sfx_boom(2.2, 46), b, gain=0.70)
        elif kind == "dawn":
            add_clip(sfx, sfx_pad_dawn(4.5), b - 0.8, gain=0.40)

    # ---- hook ----
    add_clip(sfx, sfx_gong_ageng(2.8, 55.0), 0.15, gain=0.45)
    add_clip(sfx, sfx_gong_ageng(2.4, 49.0), G("hook.eyes"), gain=0.45)
    for i, k_ in enumerate(["hook.knock1", "hook.knock2", "hook.knock3"]):
        add_clip(sfx, sfx_knock(0.5, 130 + 8 * i, i), G(k_), gain=0.95)
    # ---- rumah / tanda ----
    add_clip(sfx, sfx_gong_ageng(2.4, 65.41), G("rumah.pan"), gain=0.35)
    for i, dt in enumerate([0.0, 0.5, 1.0, 1.4]):
        add_clip(sfx, sfx_bark(0.22, i), G("tanda.bark") + dt, gain=0.40 * (1.0 - 0.12 * i), pan=-0.3)
    add_clip(sfx, sfx_gong_ageng(2.6, 58.27), G("tanda.eyes"), gain=0.5)
    add_clip(sfx, sfx_ghost_whoosh(1.4, 4), G("tanda.eyes") + 0.1, gain=0.4)
    add_clip(sfx, sfx_creak(2.2, 4), G("tanda.lamp0"), gain=0.5, pan=-0.35)
    # ---- kelor ----
    add_clip(sfx, sfx_rustle(1.3, 6), G("kelor.leaves"), gain=0.7)
    add_clip(sfx, sfx_thunder(2.8, 9), G("kelor.flip"), gain=0.7)
    add_clip(sfx, sfx_boom(2.4, 44), G("kelor.flip") + 0.05, gain=0.6)
    r1, lead1 = sfx_roar2(1.5, 33, size=0.9)
    add_clip(sfx, r1, G("kelor.flare") - lead1, gain=0.85)
    # ---- gedor ----
    t0 = S["gedor"] + 0.2
    while t0 < G("gedor.roar") - 0.3:
        add_clip(sfx, sfx_knock(0.5, 110, int(t0 * 10)), t0, gain=1.0)
        t0 += 0.38
    r2, lead2 = sfx_roar2(2.0, 21, size=1.0)
    add_clip(sfx, r2, G("gedor.roar") - lead2, gain=1.0)

    # ---- footsteps: scene-local step times k/f match the video's walking bob exactly ----
    def steps(scene, t0, t1, f, kind, d0, d1, gain, seed0, bag=False, pan=0.0, echo=False):
        for kk in range(math.ceil(t0 * f), math.floor(t1 * f) + 1):
            tau = kk / f
            if tau < t0 or tau > t1:
                continue
            d = d0 + (d1 - d0) * ((tau - t0) / max(t1 - t0, 1e-6))
            clip = sfx_step(seed0 + kk, d, kind, bag)
            if echo:
                clip = reverb(clip, rt=0.9, wet=0.35, lp=2200, seed=kk)
            add_clip(sfx, clip, S[scene] + tau, gain=gain, pan=pan + (0.08 if kk % 2 else -0.08))

    # the "husband" walks too evenly and too hollow: it is the tell. It stops dead when the picture does.
    steps("panggil", ev["panggil.walk0"], ev["panggil.walk1"], STEP_F["fake"], "sandal", 16.0, 6.7, 0.55, 100, echo=True)
    steps("fajar", ev["fajar.husband0"], ev["fajar.husband1"], STEP_F["real"], "sandal", 40.0, 9.0, 0.65, 300, bag=True)
    steps("gedor", ev["gedor.flee0"], ev["gedor.flee1"], STEP_F["gen"], "heavy", 5.8, 21.0, 1.1, 500)

    add_clip(sfx, sfx_gong_ageng(3.0, 65.41), G("fajar.big"), gain=0.30)

    for sid, ln in L.items():
        add_clip(vo, clips[sid], ln["gs"], gain=1.08)

    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 5.0 * env)
    duck_amb = 1.0 / (1.0 + 9.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.6 * env)

    master = mus * duck_music[:, None] + amb * duck_amb[:, None] + sfx * duck_sfx[:, None] + vo * 1.25
    fade_in = np.minimum(1.0, np.linspace(0, DURATION, N) / 0.15)
    fade_out = np.minimum(1.0, np.linspace(DURATION, 0, N) / 0.8)
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
    # debugging aid: stems for listening/analysis next to the cache (not committed)
    np.save(CACHE / "_mix_stems.npy", np.stack([mus[:, 0], amb[:, 0], sfx[:, 0], vo[:, 0]]).astype(np.float16))
    print(f"Selesai! Master audio: {out_mp3} ({out_mp3.stat().st_size // 1024} KB), jadwal: {TIMING_JSON}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genderuwo audio + timing (video follows the speech)")
    parser.add_argument("--voice", default="voices/id_prompts/youtube_8ofVl1KpViI_ref.wav", help="Suara narator (preset atau path .wav/.mp3)")
    parser.add_argument("--out", default="genderuwo_master.mp3", help="Nama file mp3 keluaran di public/audio/")
    args = parser.parse_args()
    build_genderuwo(args.voice, args.out)

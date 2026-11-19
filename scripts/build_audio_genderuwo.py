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
CACHE = ROOT / "voices" / "cache_gen"
TIMING_JSON = ROOT / "src" / "genderuwo_timing.json"

# ---------------------------------------------------------------------------------------------
# Narration, analysed by dramatic function. Each phrase is its own segment so it can get its own
# delivery (pace, pitch, loudness, whisper/shout) and an explicit pause before it.
# (id, pause_before_s, text, fx, candidates)
# fx: rate<1 = slower, pitch<1 = lower (tempo kept), gain, shout, whisper, echo, warm, growl
# ---------------------------------------------------------------------------------------------
SCENES = [
    # lead, tail, min_s, segments
    ("hook", 0.35, 2.2, 5.0, [
        ("hook_1", 0.0, "Kalau suamimu pulang tengah malam.", {"rate": 0.86}, 4),
        ("hook_2", 0.90, "Jangan dibuka!", {"shout": True, "rate": 0.92, "gain": 1.45}, 3),
    ]),
    ("rumah", 0.30, 0.6, 9.0, [
        ("rumah_1", 0.0, "Konon, di sebuah kampung,", {"rate": 0.95}, 3),
        ("rumah_1b", 0.12, "tengah malam.", {"rate": 0.70, "gain": 0.95}, 3),
        ("rumah_2", 0.80, "Yu Darmi,", {"rate": 0.80, "gain": 1.18}, 3),
        ("rumah_3", 0.12, "tinggal sendirian. Suaminya merantau jauh.", {}, 2),
        ("rumah_4", 0.50, "Di ujung jalan, berdiri beringin tua.", {"rate": 0.95}, 2),
        ("rumah_5", 0.25, "Kata warga, itu rumah genderuwo.", {"rate": 0.90, "gain": 0.95}, 2),
    ]),
    ("tanda", 0.30, 0.7, 9.0, [
        ("tanda_1a", 0.0, "Tercium bau singkong bakar yang menyengat.", {}, 2),
        ("tanda_1b", 0.35, "Padahal tak ada yang membakar.", {"rate": 0.92}, 2),
        ("tanda_2a", 0.55, "Lalu, anjing kampung berhenti menggonggong.", {"rate": 0.90, "gain": 0.9}, 2),
        ("tanda_2b", 0.65, "Diam.", {"whisper": True, "rate": 0.78}, 3),
        ("tanda_3", 0.60, "Lampu minyak pun bergoyang.", {"rate": 0.88, "gain": 0.8, "echo": True}, 2),
    ]),
    ("panggil", 0.50, 0.8, 9.0, [
        ("panggil_1", 0.0, "Lalu terdengar suara dari arah beringin.", {}, 2),
        ("panggil_h", 1.00, "Dik... bukakan pintu. Mas pulang.", {"pitch": 0.94, "rate": 0.92, "echo": True, "warm": True, "gain": 0.95}, 3),
        ("panggil_3a", 0.55, "Suaranya persis suaminya.", {"rate": 0.95}, 2),
        ("panggil_3b", 0.45, "Tapi kenapa ia tak mau mendekat?", {"rate": 0.86, "gain": 0.85}, 2),
    ]),
    ("kelor", 0.30, 1.0, 11.0, [
        ("kelor_1a", 0.0, "Yu Darmi ingat pesan Mbah:", {"rate": 0.93}, 2),
        ("kelor_1b", 0.85, "Sebarkan daun kelor di ambang pintu.", {"rate": 0.88, "gain": 1.12}, 3),
        ("kelor_2", 0.50, "Sosok itu berhenti di depan pintu. Ia tak sanggup melangkah.", {"rate": 0.95}, 2),
        ("kelor_3a", 0.55, "Lalu bayangannya membesar.", {"rate": 0.82, "pitch": 0.96, "gain": 0.9}, 2),
        ("kelor_3b", 0.45, "Dan matanya merah menyalaaa!", {"shout": True, "rate": 0.78, "gain": 1.5}, 3),
    ]),
    ("gedor", 0.30, 2.6, 8.0, [
        ("gedor_g", 0.0, "Dik... bukakan pintu.", {"pitch": 0.74, "rate": 0.85, "growl": True, "echo": True, "gain": 1.1}, 3),
        ("gedor_1a", 0.50, "Ia menggedor pintu berkali-kali,", {"rate": 0.95}, 2),
        ("gedor_1b", 0.30, "lalu meraung, dan menghilang.", {"rate": 0.88}, 2),
    ]),
    ("fajar", 0.35, 2.0, 11.0, [
        ("fajar_1", 0.0, "Fajar tiba. Hanya tersisa jejak besar berbulu di bawah beringin.", {}, 2),
        ("fajar_2", 0.55, "Tiga hari kemudian, suami Yu Darmi pulang sungguhan.", {}, 2),
        ("fajar_3", 1.00, "Kalau ada yang memanggil dari gelap,", {"rate": 0.88, "gain": 0.95}, 2),
        ("fajar_3b", 0.45, "pastikan dia berani masuk.", {"rate": 0.80, "gain": 1.05}, 3),
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

_WHISPER = None


def asr_text(clip: np.ndarray) -> str:
    global _WHISPER
    if _WHISPER is None:
        from faster_whisper import WhisperModel
        _WHISPER = WhisperModel("small", device="cpu", compute_type="int8")
    audio16 = signal.resample_poly(clip, 160, 441).astype(np.float32)
    segs, _ = _WHISPER.transcribe(audio16, language="id", beam_size=1, vad_filter=False)
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
        texts = VARIANTS.get(sid, [text])
        key = hashlib.sha1(f"{voice_key}|{'/'.join(texts)}|n{n}|t0.5|v5".encode()).hexdigest()[:16]
    else:  # unchanged segments keep their already-chosen v4 clip
        texts = [text]
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


def apply_fx(clip: np.ndarray, fx: dict) -> np.ndarray:
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
    }
    TIMING_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return out


def build_genderuwo(voice_arg: str, out_name: str = "genderuwo_master.mp3"):
    narr_wav = prepare_voice_prompt(voice_arg)
    print(f"Suara narator (dipakai untuk semua tokoh): {narr_wav.name}")
    narr = tts_model.get_state_for_audio_prompt(str(narr_wav))

    clips = {}
    for key, _, _, _, segs in SCENES:
        for sid, gap, text, fx, n in segs:
            print(f"  [{sid}] {text}")
            raw = get_raw(narr, narr_wav.name, sid, text, n)
            clips[sid] = apply_fx(raw, fx)
            print(f"      -> {len(clips[sid]) / SR:.2f}s")

    P = plan(clips)
    ev = anchors(P)
    timing = write_timing(P, ev)
    total = P["total_s"]
    print(f"Total durasi video: {total:.1f}s ({timing['total_frames']} frame)")
    for k, v in P["scenes"].items():
        print(f"  scene {k:8s} {v['frames']:4d}f  mulai {v['start_s']:.2f}s")

    set_duration(total)
    S = {k: v["start_s"] for k, v in P["scenes"].items()}
    G = lambda name: S[name.split(".")[0]] + ev[name]

    bed = build_gamelan_horror_bed()
    tt = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    mask = np.full(N_SAMPLES, 0.7, dtype=np.float32)
    mask *= np.where((tt > G("gedor.flee1") - 0.5) & (tt < S["fajar"] + 0.4), 0.12, 1.0)
    # near-silence while the dog falls quiet: the music holds its breath
    mask *= np.where((tt > P["lines"]["tanda_2b"]["gs"] - 0.3) & (tt < P["lines"]["tanda_3"]["gs"]), 0.2, 1.0)
    mask *= np.interp(tt, [0, 1.5, total - 5, total], [0.0, 1.0, 1.0, 0.0])
    bed *= mask[:, None]

    sfx = np.zeros((N_SAMPLES, 2), dtype=np.float32)
    vo = np.zeros((N_SAMPLES, 2), dtype=np.float32)

    # Hook
    add_clip(sfx, sfx_gong_ageng(2.8, 55.0), 0.15, gain=0.5)
    add_clip(sfx, sfx_ghost_whoosh(1.6, 1), 0.6, gain=0.35)
    add_clip(sfx, sfx_gong_ageng(2.4, 49.0), G("hook.eyes"), gain=0.5)
    for i, k in enumerate(["hook.knock1", "hook.knock2", "hook.knock3"]):
        add_clip(sfx, sfx_knock(0.5, 130 + 8 * i, i), G(k), gain=0.95)
    # Rumah
    add_clip(sfx, sfx_ghost_whoosh(1.2, 2), S["rumah"], gain=0.3)
    add_clip(sfx, sfx_gong_ageng(2.4, 65.41), G("rumah.pan"), gain=0.4)
    # Tanda: dog barks, then nothing; canopy eyes on the silence; creaking lamp
    add_clip(sfx, sfx_ghost_whoosh(2.0, 3), S["tanda"] + 0.8, gain=0.35)
    for i, dt in enumerate([0.0, 0.5, 1.0, 1.4]):
        add_clip(sfx, sfx_bark(0.22, i), G("tanda.bark") + dt, gain=0.42 * (1.0 - 0.12 * i), pan=-0.3)
    add_clip(sfx, sfx_gong_ageng(2.6, 58.27), G("tanda.eyes"), gain=0.55)
    add_clip(sfx, sfx_ghost_whoosh(1.4, 4), G("tanda.eyes") + 0.1, gain=0.45)
    add_clip(sfx, sfx_creak(2.2, 4), G("tanda.lamp0"), gain=0.5, pan=-0.35)
    # Panggil
    add_clip(sfx, sfx_ghost_whoosh(1.8, 5), S["panggil"], gain=0.35)
    # Kelor: scatter, 'membesar' thunder, then the red-eyes flare
    add_clip(sfx, sfx_rustle(1.3, 6), G("kelor.leaves"), gain=0.7)
    add_clip(sfx, sfx_thunder(2.8, 9), G("kelor.flip"), gain=0.8)
    add_clip(sfx, sfx_gong_ageng(3.0, 49.0), G("kelor.flip") + 0.05, gain=0.6)
    add_clip(sfx, sfx_roar(1.3, 33), G("kelor.flare") + 0.15, gain=0.7)
    add_clip(sfx, sfx_gong_ageng(2.6, 55.0), G("kelor.flare"), gain=0.8)
    # Gedor
    t0 = S["gedor"] + 0.2
    while t0 < G("gedor.roar"):
        add_clip(sfx, sfx_knock(0.5, 110, int(t0 * 10)), t0, gain=1.0)
        t0 += 0.38
    add_clip(sfx, sfx_roar(1.7, 21), G("gedor.roar"), gain=0.95)
    add_clip(sfx, sfx_ghost_whoosh(2.0, 8), G("gedor.flee0"), gain=0.7)
    # Fajar
    add_clip(sfx, sfx_birds(min(12.0, total - S["fajar"]), 11), S["fajar"] + 0.4, gain=0.55)
    add_clip(sfx, sfx_gong_ageng(3.0, 65.41), G("fajar.big"), gain=0.35)

    for sid, ln in P["lines"].items():
        add_clip(vo, clips[sid], ln["gs"], gain=1.08)

    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 5.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.6 * env)

    master = bed * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.25
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
    print(f"Selesai! Master audio: {out_mp3} ({out_mp3.stat().st_size // 1024} KB), jadwal: {TIMING_JSON}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genderuwo audio + timing (video follows the speech)")
    parser.add_argument("--voice", default="voices/id_prompts/youtube_8ofVl1KpViI_ref.wav", help="Suara narator (preset atau path .wav/.mp3)")
    parser.add_argument("--out", default="genderuwo_master.mp3", help="Nama file mp3 keluaran di public/audio/")
    args = parser.parse_args()
    build_genderuwo(args.voice, args.out)

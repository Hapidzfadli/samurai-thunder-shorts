import subprocess
import wave
from pathlib import Path
import numpy as np
from pocket_tts import TTSModel
from scipy import signal

SR = 44100
DURATION = 36.0
N_SAMPLES = int(SR * DURATION)

ROOT = Path(__file__).resolve().parent.parent
VOICE_SRC = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
OUT_DIR = ROOT / "public" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PROMPT_WAV = Path("/tmp/dodi_voice_prompt_48k.wav")

# Extract clean 18s speech segment (starting at 18s after intro music) for zero-shot voice cloning
subprocess.run(
    ["ffmpeg", "-y", "-ss", "18", "-t", "18", "-i", str(VOICE_SRC), "-ar", "48000", "-ac", "1", str(PROMPT_WAV)],
    check=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

POCKET_CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"
print("Memuat Pocket-TTS Indonesian...")
tts_model = TTSModel.load_model(config=POCKET_CONFIG, eos_threshold=-5.5, temp=0.62)
voice_state = tts_model.get_state_for_audio_prompt(str(PROMPT_WAV))


def synth_line(text: str, max_s: float) -> np.ndarray:
    audio_tensor = tts_model.generate_audio(voice_state, text, max_tokens=140)
    raw = audio_tensor.detach().cpu().numpy().squeeze().astype(np.float32)
    orig_sr = tts_model.sample_rate
    if orig_sr != SR:
        raw = signal.resample(raw, int(len(raw) * SR / orig_sr))
    idx = np.where(np.abs(raw) > 0.008)[0]
    if len(idx) > 0:
        raw = raw[max(0, idx[0] - 800):min(len(raw), idx[-1] + 1200)]
    dur = len(raw) / SR
    if dur > max_s:
        # Speed up slightly via ffmpeg atempo so it fits cleanly inside the scene
        in_w = Path("/tmp/tts_in.wav")
        out_w = Path("/tmp/tts_out.wav")
        with wave.open(str(in_w), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes((np.clip(raw, -1, 1) * 32767).astype(np.int16).tobytes())
        rate = min(1.45, dur / max_s)
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(in_w), "-filter:a", f"atempo={rate:.3f}", str(out_w)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        with wave.open(str(out_w), "rb") as wf:
            raw = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    peak = np.max(np.abs(raw)) + 1e-6
    return (raw / peak) * 0.85


LINES = [
    (0.2, 5.5, "Dia menggergaji celah di setiap rel kereta. Semua orang mengira dia sudah gila."),
    (6.1, 5.6, "Dua perusahaan berlomba menaklukkan ngarai terdalam. Siapa cepat, dia kuasai bisnis seluruh negeri."),
    (12.1, 5.6, "Bosnya murka sampai wajahnya ungu! Kau merusak rel keretaku! Tapi dia tetap menolak."),
    (18.1, 5.6, "Lawan memasang rel mulus tanpa celah. Kereta mereka senyap, sementara keretanya berisik."),
    (24.1, 5.6, "Lalu musim panas tiba! Celah rel menyusut perlahan, sementara rel lawan mulai menjerit kepanasan."),
    (30.1, 5.6, "Di hari terpanas, celahnya menutup pas! Rel sempurna lawan melengkung seperti ular dan meledak!"),
]

voice_track = np.zeros(N_SAMPLES, dtype=np.float32)
for start_s, max_s, txt in LINES:
    print(f"Synth [{start_s}s]: {txt}")
    seg = synth_line(txt, max_s)
    s_idx = int(start_s * SR)
    e_idx = min(N_SAMPLES, s_idx + len(seg))
    voice_track[s_idx:e_idx] += seg[:e_idx - s_idx]

# Procedural SFX + BGM
sfx = np.zeros(N_SAMPLES, dtype=np.float32)
rng = np.random.default_rng(42)

def add_sfx(arr: np.ndarray, t_s: float, gain: float = 0.5):
    s = int(t_s * SR)
    e = min(N_SAMPLES, s + len(arr))
    if e > s:
        sfx[s:e] += arr[:e - s] * gain

# 1. Sawing metal (0.6s - 2.6s)
t_saw = np.linspace(0, 2.0, int(2.0 * SR), endpoint=False)
saw_noise = rng.normal(0, 1, len(t_saw))
b, a = signal.butter(2, [1800 / (SR / 2), 4500 / (SR / 2)], btype="band")
saw = signal.lfilter(b, a, saw_noise) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.5 * t_saw))
add_sfx(saw, 0.6, 0.35)

# 2. Angry steam hiss (13.4s)
t_stm = np.linspace(0, 1.4, int(1.4 * SR), endpoint=False)
stm = signal.lfilter(*signal.butter(2, 2200 / (SR / 2), btype="high"), rng.normal(0, 1, len(t_stm)))
stm *= np.exp(-t_stm * 2.2)
add_sfx(stm, 13.4, 0.4)

# 3. Clickety-clack train beats (21.2s - 23.4s)
for k in range(6):
    t_c = np.linspace(0, 0.12, int(0.12 * SR), endpoint=False)
    clk = np.sin(2 * np.pi * 220 * t_c) * np.exp(-t_c * 35) + rng.normal(0, 0.25, len(t_c)) * np.exp(-t_c * 45)
    add_sfx(clk, 21.2 + k * 0.32, 0.45)

# 4. Metal groan (27.5s - 29.5s)
t_gr = np.linspace(0, 2.0, int(2.0 * SR), endpoint=False)
groan = np.sin(2 * np.pi * (95 + 25 * np.sin(2 * np.pi * 1.2 * t_gr)) * t_gr) * np.sin(np.pi * t_gr / 2.0)
add_sfx(groan, 27.5, 0.35)

# 5. Explosion boom (33.8s - 35.8s)
t_exp = np.linspace(0, 2.0, int(2.0 * SR), endpoint=False)
boom = np.sin(2 * np.pi * 55 * np.exp(-t_exp * 2.5) * t_exp) * np.exp(-t_exp * 1.8)
rumble = signal.lfilter(*signal.butter(2, 420 / (SR / 2), btype="low"), rng.normal(0, 1, len(t_exp))) * np.exp(-t_exp * 1.5)
add_sfx(boom + rumble * 0.8, 33.8, 0.75)

# Light rhythmic BGM
t_all = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
bgm = (
    0.06 * np.sin(2 * np.pi * 110 * t_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.0 * t_all))
    + 0.04 * np.sin(2 * np.pi * 165 * t_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.0 * t_all))
)
# Duck BGM where voice is active
env = np.abs(voice_track)
duck = 1.0 - np.clip(signal.lfilter(np.ones(2000) / 2000, 1, env) * 4.5, 0, 0.72)
mix = voice_track + sfx + bgm * duck
mix = np.clip(mix, -0.95, 0.95)

wav_out = Path("/tmp/railroad_master.wav")
mp3_out = OUT_DIR / "railroad_master.mp3"
with wave.open(str(wav_out), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())

subprocess.run(["ffmpeg", "-y", "-i", str(wav_out), "-b:a", "192k", str(mp3_out)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print(f"Saved: {mp3_out}")

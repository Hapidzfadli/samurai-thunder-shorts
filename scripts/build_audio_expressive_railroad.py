"""
Multi-Emotion Per-Scene Indonesian TTS + Audio-First Timeline Builder.
Solves flat/rushed intonation by:
1. Using separate voice prompts per emotion (narasi, tegas, tegang, santai).
2. Generating short, well-punctuated phrases (no forced atempo speedup).
3. Exporting a JSON timeline so Remotion scenes & captions match exact voice timing.
"""
import json
import subprocess
import wave
from pathlib import Path
import numpy as np
from pocket_tts import TTSModel
from scipy import signal

SR = 44100
FPS = 30
ROOT = Path(__file__).resolve().parent.parent
DODI_MP3 = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
ID_PROMPTS = ROOT / "voices" / "id_prompts"
OUT_DIR = ROOT / "public" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PROMPT_CACHE = Path("/tmp/expressive_prompts")
PROMPT_CACHE.mkdir(parents=True, exist_ok=True)


def extract_wav(src: Path, out: Path, ss: float, dur: float) -> Path:
    subprocess.run(
        ["ffmpeg", "-y", "-ss", str(ss), "-t", str(dur), "-i", str(src), "-ar", "48000", "-ac", "1", str(out)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return out


# Prepare 4 distinct emotion voice prompts (Mak Ijah multi-emotion style)
PROMPTS = {
    "santai": ID_PROMPTS / "makijah_santai.wav",
    "narasi": ID_PROMPTS / "makijah_narasi.wav",
    "tegang": ID_PROMPTS / "makijah_panik.wav",
    "tegas": ID_PROMPTS / "makijah_sombong.wav",
}

POCKET_CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"
print("Memuat Pocket-TTS Indonesian...")
tts_model = TTSModel.load_model(config=POCKET_CONFIG, eos_threshold=-3.5, temp=0.62)
VOICE_STATES = {k: tts_model.get_state_for_audio_prompt(str(v)) for k, v in PROMPTS.items()}


def synth_phrase(text: str, emotion: str = "narasi") -> np.ndarray:
    state = VOICE_STATES.get(emotion, VOICE_STATES["narasi"])
    audio_tensor = tts_model.generate_audio(state, text, max_tokens=110)
    raw = audio_tensor.detach().cpu().numpy().squeeze().astype(np.float32)
    orig_sr = tts_model.sample_rate
    if orig_sr != SR:
        raw = signal.resample(raw, int(len(raw) * SR / orig_sr))
    idx = np.where(np.abs(raw) > 0.008)[0]
    if len(idx) > 0:
        raw = raw[max(0, idx[0] - 600):min(len(raw), idx[-1] + 900)]
    peak = np.max(np.abs(raw)) + 1e-6
    return (raw / peak) * 0.88


# Story script split into short phrases with per-phrase emotion tags
SCENES = [
    {
        "scene": "hook",
        "phrases": [
            ("narasi", "Dia menggergaji celah di setiap rel kereta."),
            ("tegang", "Semua orang mengira dia sudah gila!"),
        ],
    },
    {
        "scene": "stakes",
        "phrases": [
            ("narasi", "Dua perusahaan berlomba menaklukkan ngarai terdalam."),
            ("tegas", "Siapa paling cepat, dia kuasai bisnis seluruh negeri."),
        ],
    },
    {
        "scene": "conflict",
        "phrases": [
            ("tegang", "Bosnya murka sampai wajahnya berubah ungu!"),
            ("tegas", "Kau merusak rel keretaku!"),
            ("santai", "Tapi insinyur muda itu tetap menolak."),
        ],
    },
    {
        "scene": "rival",
        "phrases": [
            ("narasi", "Perusahaan lawan memasang rel mulus tanpa celah."),
            ("santai", "Kereta mereka melaju senyap, sedangkan keretanya berisik."),
        ],
    },
    {
        "scene": "heat",
        "phrases": [
            ("tegang", "Lalu musim panas tiba!"),
            ("narasi", "Celah relnya menyusut perlahan."),
            ("tegang", "Sementara rel lawan mulai menjerit kepanasan!"),
        ],
    },
    {
        "scene": "climax",
        "phrases": [
            ("santai", "Di hari terpanas, celahnya menutup pas."),
            ("tegang", "Rel sempurna lawan melengkung seperti ular, lalu meledak!"),
        ],
    },
]

chunks = []
timeline = []
cursor_s = 0.25
chunks.append(np.zeros(int(cursor_s * SR), dtype=np.float32))

for sc in SCENES:
    sc_start = cursor_s
    phrase_cues = []
    for emo, txt in sc["phrases"]:
        print(f"[{sc['scene']} | {emo}] {txt}")
        seg = synth_phrase(txt, emo)
        p_start = cursor_s
        p_dur = len(seg) / SR
        chunks.append(seg)
        pause = np.zeros(int(0.22 * SR), dtype=np.float32)
        chunks.append(pause)
        cursor_s += p_dur + 0.22
        phrase_cues.append({
            "emotion": emo,
            "text": txt,
            "startSec": round(p_start, 3),
            "endSec": round(p_start + p_dur, 3),
        })
    # Small breathing gap between scenes
    sc_pause = np.zeros(int(0.25 * SR), dtype=np.float32)
    chunks.append(sc_pause)
    cursor_s += 0.25
    timeline.append({
        "scene": sc["scene"],
        "startSec": round(sc_start, 3),
        "endSec": round(cursor_s, 3),
        "startFrame": int(round(sc_start * FPS)),
        "durationInFrames": int(round((cursor_s - sc_start) * FPS)),
        "phrases": phrase_cues,
    })

voice_track = np.concatenate(chunks)
total_s = len(voice_track) / SR
t_all = np.linspace(0, total_s, len(voice_track), endpoint=False)

# Subtle ducked BGM
bgm = (
    0.055 * np.sin(2 * np.pi * 110 * t_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.0 * t_all))
    + 0.035 * np.sin(2 * np.pi * 165 * t_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.0 * t_all))
)
env = np.abs(voice_track)
duck = 1.0 - np.clip(signal.lfilter(np.ones(2200) / 2200, 1, env) * 4.5, 0, 0.78)
mix = np.clip(voice_track + bgm * duck, -0.95, 0.95)

wav_out = Path("/tmp/railroad_expressive.wav")
mp3_out = OUT_DIR / "railroad_expressive.mp3"
json_out = OUT_DIR / "railroad_expressive_timeline.json"

with wave.open(str(wav_out), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())

subprocess.run(["ffmpeg", "-y", "-i", str(wav_out), "-b:a", "192k", str(mp3_out)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
json_out.write_text(json.dumps({"totalDurationSec": round(total_s, 3), "totalFrames": int(round(total_s * FPS)), "scenes": timeline}, indent=2, ensure_ascii=False))
print(f"Saved: {mp3_out} ({total_s:.2f}s) & {json_out}")

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


# Prepare 4 distinct emotion voice prompts
PROMPTS = {
    "santai": extract_wav(DODI_MP3, PROMPT_CACHE / "santai.wav", 1.0, 10.0),
    "narasi": extract_wav(DODI_MP3, PROMPT_CACHE / "narasi.wav", 18.0, 12.0),
    "tegang": extract_wav(DODI_MP3, PROMPT_CACHE / "tegang.wav", 36.5, 11.0),
    "tegas": ID_PROMPTS / "common_voice_id_19961910.wav",
}

POCKET_CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"
print("Memuat Pocket-TTS Indonesian...")
tts_model = TTSModel.load_model(config=POCKET_CONFIG, eos_threshold=-3.5, temp=0.62)
VOICE_STATES = {k: tts_model.get_state_for_audio_prompt(str(v)) for k, v in PROMPTS.items()}


import difflib
import re

from faster_whisper import WhisperModel

ASR = WhisperModel("small", device="cpu", compute_type="int8")


_NUM_WORDS = r"\b(se|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ratusan|ribu|ribuan|juta|nol)\b"


def _letters(x: str) -> str:
    # Whisper menulis angka sebagai digit ("1932", "20.000"); kata bilangan di naskah dan digit
    # di transkrip sama-sama dibuang supaya take yang benar tidak dinilai salah.
    x = re.sub(_NUM_WORDS, " ", x.lower())
    return re.sub(r"[^a-z]", "", x)


def clean_for_tts(text: str) -> str:
    """The emotion prompts make the model tack a stray syllable ("inder") onto '!' endings.
    Keep the words, but end exclamations with a full stop and turn '...' into a comma pause."""
    t = text.replace("...", ",").replace("!", ".")
    return re.sub(r"\s+", " ", t).strip()


def _synth_once(text: str, emotion: str) -> np.ndarray:
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


def _heard(clip: np.ndarray) -> str:
    a16 = signal.resample(clip, int(len(clip) * 16000 / SR)).astype(np.float32)
    segs, _ = ASR.transcribe(a16, language="id", beam_size=1)
    return " ".join(x.text for x in segs)


def synth_phrase(text: str, emotion: str = "narasi", n: int = 3) -> np.ndarray:
    """Generate n takes and keep the one speech recognition hears closest to the script
    (rejects takes with swallowed words or stray syllables)."""
    clean = clean_for_tts(text)
    best, best_score = None, -1.0
    for i in range(n):
        clip = _synth_once(clean, emotion)
        heard = _heard(clip)
        score = difflib.SequenceMatcher(None, _letters(clean), _letters(heard)).ratio()
        print(f"      take {i + 1}/{n}: {score:.2f} <- {heard.strip()}")
        if score > best_score:
            best, best_score = clip, score
        if score > 0.97:
            break
    return best


# Story script split into short phrases with per-phrase emotion tags
# Cerita: "Si Kabayan Ngala Tutut" (cerita rakyat Sunda).
# Emosi: "narasi" (pendongeng netral), "santai" (malas/ringan), "tegang" (kaget/dramatis), "tegas" (perintah/marah).
SCENES = [
    {
        "scene": "pagi",
        "phrases": [
            ("narasi", "Pagi-pagi, Si Kabayan masih mendengkur."),
            ("tegas", "Kabayan! Bangun!"),
            ("tegas", "Cari tutut ke sawah, buat lauk!"),
            ("santai", "Dengan malas, Kabayan pun bangun."),
            ("santai", "Yang banyak ya, Kang."),
        ],
    },
    {
        "scene": "jalan",
        "phrases": [
            ("santai", "Kabayan berjalan ke sawah, sambil bersiul."),
        ],
    },
    {
        "scene": "pematang",
        "phrases": [
            ("narasi", "Sampai di pematang, ia hendak turun."),
            ("tegang", "Tapi begitu melihat ke bawah..."),
            ("tegang", "Euleuh! Sawahnya dalam sekali!"),
            ("tegang", "Ada langitnya di bawah!"),
            ("narasi", "Di air sawah, terpantul langit biru dan awan."),
        ],
    },
    {
        "scene": "saung",
        "phrases": [
            ("santai", "Kabayan tidak berani turun."),
            ("santai", "Ia menunggu di saung, sampai ketiduran."),
        ],
    },
    {
        "scene": "sore",
        "phrases": [
            ("tegas", "Kabayan! Mana tututnya?"),
            ("santai", "Sawahnya dalam, Bah. Sedalam langit!"),
            ("tegang", "Abah langsung naik darah!"),
        ],
    },
    {
        "scene": "seret",
        "phrases": [
            ("tegas", "Dalam bagaimana? Ayo ikut!"),
            ("santai", "Tuh, Bah. Ada langitnya!"),
        ],
    },
    {
        "scene": "dorong",
        "phrases": [
            ("tegang", "Abah mendorong Kabayan ke sawah!"),
            ("narasi", "Ternyata, airnya cuma sebetis."),
        ],
    },
    {
        "scene": "akhir",
        "phrases": [
            ("santai", "Geuning... langitnya cuma sebetis, Bah."),
            ("narasi", "Kabayan pulang membawa tutut."),
            ("santai", "Dan lumpur, sampai ke telinga."),
        ],
    },
]

# Naskah lain bisa diberikan lewat argumen: python3 build_audio_expressive.py naskah.json
# (format: [{"scene": "...", "phrases": [["narasi", "kalimat"], ...]}, ...]); nama output = <stem>_expressive.
import sys
NAME = "kabayan_expressive"
if len(sys.argv) > 1:
    SCENES = json.loads(Path(sys.argv[1]).read_text())
    NAME = Path(sys.argv[1]).stem + "_expressive"

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

wav_out = Path(f"/tmp/{NAME}.wav")
mp3_out = OUT_DIR / f"{NAME}.mp3"
json_out = OUT_DIR / f"{NAME}_timeline.json"

with wave.open(str(wav_out), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())

subprocess.run(["ffmpeg", "-y", "-i", str(wav_out), "-b:a", "192k", str(mp3_out)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
json_out.write_text(json.dumps({"totalDurationSec": round(total_s, 3), "totalFrames": int(round(total_s * FPS)), "scenes": timeline}, indent=2, ensure_ascii=False))
print(f"Saved: {mp3_out} ({total_s:.2f}s) & {json_out}")

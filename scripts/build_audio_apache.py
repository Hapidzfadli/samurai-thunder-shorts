"""
Audio-first multi-emotion narration (Mak Ijah voice prompts) + rich procedural Apache SFX + BGM
for the detailed 3D Apache AH-64 Shorts animation.
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
ID_PROMPTS = ROOT / "voices" / "id_prompts"
OUT_DIR = ROOT / "public" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    "narasi": ID_PROMPTS / "makijah_narasi.wav",
    "santai": ID_PROMPTS / "makijah_santai.wav",
    "tegang": ID_PROMPTS / "makijah_panik.wav",
    "tegas": ID_PROMPTS / "makijah_sombong.wav",
}

POCKET_CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"
print("Memuat Pocket-TTS Indonesian (Mak Ijah 4-Emosi)...")
tts_model = TTSModel.load_model(config=POCKET_CONFIG, eos_threshold=-3.2, temp=0.58)
VOICE_STATES = {k: tts_model.get_state_for_audio_prompt(str(v)) for k, v in PROMPTS.items()}


def synth_phrase(text: str, emotion: str = "narasi") -> np.ndarray:
    state = VOICE_STATES.get(emotion, VOICE_STATES["narasi"])
    audio_tensor = tts_model.generate_audio(state, text, max_tokens=115)
    raw = audio_tensor.detach().cpu().numpy().squeeze().astype(np.float32)
    orig_sr = tts_model.sample_rate
    if orig_sr != SR:
        raw = signal.resample(raw, int(len(raw) * SR / orig_sr))
    idx = np.where(np.abs(raw) > 0.01)[0]
    if len(idx) > 0:
        raw = raw[max(0, idx[0] - 500):min(len(raw), idx[-1] + 700)]
    # Gentle fade-in/out to prevent clicks
    fade = min(400, len(raw) // 6)
    if fade > 0:
        raw[:fade] *= np.linspace(0, 1, fade)
        raw[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(raw)) + 1e-6
    return (raw / peak) * 0.88


def make_word_chunks(text: str, start_s: float, end_s: float, highlight_words: set[str]):
    """Split a phrase into 1-2 word kinetic caption cues proportional to character length."""
    words = text.split()
    groups = []
    i = 0
    while i < len(words):
        if i + 1 < len(words) and len(words[i]) + len(words[i + 1]) <= 13:
            groups.append(f"{words[i]} {words[i+1]}")
            i += 2
        else:
            groups.append(words[i])
            i += 1
    total_chars = sum(max(3, len(g)) for g in groups)
    cues = []
    cur = start_s
    dur = end_s - start_s
    for g in groups:
        g_dur = dur * (max(3, len(g)) / total_chars)
        clean_lower = g.lower().strip(".,?!")
        is_hl = any(hw in clean_lower for hw in highlight_words)
        cues.append({
            "text": g,
            "startFrame": int(round(cur * FPS)),
            "endFrame": int(round((cur + g_dur) * FPS)),
            "highlight": is_hl,
        })
        cur += g_dur
    return cues


HIGHLIGHT_WORDS = {
    "apache", "menoleh", "meriamnya", "kanon", "peluru", "seribu", "inframerah",
    "helm", "laser", "panas", "monokel", "hancur", "selamat", "melipat",
}

SCENES = [
    {
        "scene": "hook",
        "phrases": [
            ("narasi", "Di helikopter Apache, pilot cukup menoleh dan meriamnya ikut menoleh."),
            ("santai", "Tanpa tuas, tanpa joystick, bagaimana caranya?"),
        ],
    },
    {
        "scene": "cannon_xray",
        "phrases": [
            ("tegas", "Di bawah hidungnya ada kanon rantai tiga puluh milimeter."),
            ("narasi", "Menembakkan enam ratus peluru per menit, dari magazen seribu dua ratus butir."),
        ],
    },
    {
        "scene": "ir_tracking",
        "phrases": [
            ("narasi", "Di kokpit dua kursi, sensor inframerah terus melacak posisi helm."),
            ("santai", "Ke mana mata melihat, komputer langsung memutar meriam ke arah yang sama."),
        ],
    },
    {
        "scene": "flir_split",
        "phrases": [
            ("narasi", "Kamera panas di hidungnya mengirim gambar ke lensa kecil di mata kanan."),
            ("tegang", "Mata kanan melihat panas musuh, mata kiri melihat kokpit gelap."),
        ],
    },
    {
        "scene": "ballistic_strike",
        "phrases": [
            ("narasi", "Laser mengukur jarak dan angin, lalu peluru mengunci target."),
            ("tegas", "Sekali tembak, kendaraan lapis baja langsung hancur."),
        ],
    },
    {
        "scene": "safety_outro",
        "phrases": [
            ("narasi", "Kalau helikopter jatuh, meriamnya melipat ke celah antar kursi agar kru selamat."),
            ("santai", "Semua itu cukup dengan satu gerakan sederhana, menoleh."),
        ],
    },
]

chunks = []
timeline_scenes = []
all_captions = []
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
        pause = np.zeros(int(0.18 * SR), dtype=np.float32)
        chunks.append(pause)
        cursor_s += p_dur + 0.18
        phrase_cues.append({
            "emotion": emo,
            "text": txt,
            "startSec": round(p_start, 3),
            "endSec": round(p_start + p_dur, 3),
        })
        all_captions.extend(make_word_chunks(txt, p_start, p_start + p_dur, HIGHLIGHT_WORDS))

    sc_pad = 0.28
    chunks.append(np.zeros(int(sc_pad * SR), dtype=np.float32))
    cursor_s += sc_pad
    timeline_scenes.append({
        "scene": sc["scene"],
        "startSec": round(sc_start, 3),
        "endSec": round(cursor_s, 3),
        "startFrame": int(round(sc_start * FPS)),
        "durationInFrames": int(round((cursor_s - sc_start) * FPS)),
        "phrases": phrase_cues,
    })

# Trailing hold 0.6s for clean finish
chunks.append(np.zeros(int(0.6 * SR), dtype=np.float32))
cursor_s += 0.6

voice_track = np.concatenate(chunks)
N_SAMPLES = len(voice_track)
total_s = N_SAMPLES / SR
t_all = np.linspace(0, total_s, N_SAMPLES, endpoint=False)
rng = np.random.default_rng(77)

sfx = np.zeros(N_SAMPLES, dtype=np.float32)


def add_sfx(arr: np.ndarray, t_s: float, gain: float = 0.5):
    s = int(t_s * SR)
    e = min(N_SAMPLES, s + len(arr))
    if e > s and s >= 0:
        sfx[s:e] += arr[:e - s] * gain


# 1. Continuous soft helicopter rotor thump (14 Hz pulse modulated low-passed noise)
rotor_noise = signal.lfilter(*signal.butter(2, 220 / (SR / 2), btype="low"), rng.normal(0, 1, N_SAMPLES))
rotor_pulse = 0.5 + 0.5 * np.sin(2 * np.pi * 13.5 * t_all)
rotor_bed = rotor_noise * rotor_pulse * 0.14

# Helper to find scene start time
sc_map = {s["scene"]: s for s in timeline_scenes}

# 2. Mechanical turret servo whirr on Hook & IR Tracking
for key, offset in [("hook", 1.2), ("ir_tracking", 3.0), ("safety_outro", 1.8)]:
    t0 = sc_map[key]["startSec"] + offset
    t_s = np.linspace(0, 0.9, int(0.9 * SR), endpoint=False)
    whirr = np.sin(2 * np.pi * (420 + 180 * t_s) * t_s) * np.sin(np.pi * t_s / 0.9) * 0.14
    add_sfx(whirr, t0, 0.5)

# 3. M230 30mm chain gun burst (heavy rhythmic thump-thump-thump) during cannon_xray
t_gun = sc_map["cannon_xray"]["startSec"] + 1.8
for k in range(8):
    t_b = np.linspace(0, 0.11, int(0.11 * SR), endpoint=False)
    thump = np.sin(2 * np.pi * (120 * np.exp(-t_b * 24)) * t_b) * np.exp(-t_b * 28)
    crack = signal.lfilter(*signal.butter(2, [800 / (SR / 2), 3500 / (SR / 2)], btype="band"), rng.normal(0, 0.7, len(t_b))) * np.exp(-t_b * 35)
    add_sfx(thump + crack * 0.6, t_gun + k * 0.13, 0.42)

# 4. Electronic HUD / IR sensor lock beeps during ir_tracking & flir_split
for key, offset in [("ir_tracking", 0.7), ("ir_tracking", 1.3), ("flir_split", 0.8), ("ballistic_strike", 0.6)]:
    t0 = sc_map[key]["startSec"] + offset
    t_bp = np.linspace(0, 0.14, int(0.14 * SR), endpoint=False)
    beep = np.sin(2 * np.pi * 1650 * t_bp) * np.exp(-t_bp * 16)
    add_sfx(beep, t0, 0.22)

# 5. Armor strike explosion during ballistic_strike
t_exp0 = sc_map["ballistic_strike"]["endSec"] - 1.9
t_ex = np.linspace(0, 1.8, int(1.8 * SR), endpoint=False)
boom = np.sin(2 * np.pi * 58 * np.exp(-t_ex * 2.2) * t_ex) * np.exp(-t_ex * 1.9)
rumble = signal.lfilter(*signal.butter(2, 480 / (SR / 2), btype="low"), rng.normal(0, 1, len(t_ex))) * np.exp(-t_ex * 1.7)
add_sfx(boom + rumble * 0.85, t_exp0, 0.65)

# 6. Tactical subtle pulse BGM (cinematic dark synth pulse, heavily ducked under voice)
pulse_beat = 0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * t_all)
bgm = (
    0.05 * np.sin(2 * np.pi * 82.4 * t_all) * pulse_beat
    + 0.03 * np.sin(2 * np.pi * 123.5 * t_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.1 * t_all))
    + 0.018 * np.sin(2 * np.pi * 246.9 * t_all) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.4 * t_all))
)

env = np.abs(voice_track)
duck = 1.0 - np.clip(signal.lfilter(np.ones(2200) / 2200, 1, env) * 5.0, 0, 0.8)
mix = voice_track + sfx + (bgm + rotor_bed) * duck
mix = np.clip(mix, -0.95, 0.95)

wav_out = Path("/tmp/apache_master.wav")
mp3_out = OUT_DIR / "apache_master.mp3"
json_out = OUT_DIR / "apache_timeline.json"

with wave.open(str(wav_out), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())

subprocess.run(["ffmpeg", "-y", "-i", str(wav_out), "-b:a", "192k", str(mp3_out)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Ensure scene frames partition totalFrames seamlessly
total_frames = int(round(total_s * FPS))
for i in range(len(timeline_scenes)):
    if i < len(timeline_scenes) - 1:
        timeline_scenes[i]["durationInFrames"] = timeline_scenes[i + 1]["startFrame"] - timeline_scenes[i]["startFrame"]
    else:
        timeline_scenes[i]["durationInFrames"] = total_frames - timeline_scenes[i]["startFrame"]

json_out.write_text(
    json.dumps(
        {
            "totalDurationSec": round(total_s, 3),
            "totalFrames": total_frames,
            "scenes": timeline_scenes,
            "captions": all_captions,
        },
        indent=2,
        ensure_ascii=False,
    )
)
print(f"Saved: {mp3_out} ({total_s:.2f}s / {total_frames} frames) & {json_out}")

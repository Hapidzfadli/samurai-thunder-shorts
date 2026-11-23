"""
Audio-first multi-emotion narration (Mak Ijah 4-emotion Pocket-TTS) + rich war SFX + cinematic BGM
for "Bandung Lautan Api (23-24 Maret 1946)".
Outputs:
  - public/audio/bandung_master.mp3
  - src/bandung_timing.json
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
OUT_AUDIO = ROOT / "public" / "audio" / "bandung_master.mp3"
OUT_JSON = ROOT / "src" / "bandung_timing.json"
OUT_AUDIO.parent.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    "narasi": ID_PROMPTS / "makijah_narasi.wav",
    "santai": ID_PROMPTS / "makijah_santai.wav",
    "tegang": ID_PROMPTS / "makijah_panik.wav",
    "tegas": ID_PROMPTS / "makijah_sombong.wav",
}

POCKET_CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"
print("Memuat Pocket-TTS Indonesian (Suara Mak Ijah 4-Emosi)...")
tts_model = TTSModel.load_model(config=POCKET_CONFIG, eos_threshold=-3.2, temp=0.58)
VOICE_STATES = {k: tts_model.get_state_for_audio_prompt(str(v)) for k, v in PROMPTS.items()}


def synth_line(text: str, emotion: str = "narasi") -> np.ndarray:
    state = VOICE_STATES.get(emotion, VOICE_STATES["narasi"])
    audio_tensor = tts_model.generate_audio(state, text, max_tokens=135)
    raw = audio_tensor.detach().cpu().numpy().squeeze().astype(np.float32)
    orig_sr = tts_model.sample_rate
    if orig_sr != SR:
        raw = signal.resample(raw, int(len(raw) * SR / orig_sr))
    idx = np.where(np.abs(raw) > 0.01)[0]
    if len(idx) > 0:
        raw = raw[max(0, idx[0] - 500):min(len(raw), idx[-1] + 750)]
    fade = min(400, len(raw) // 6)
    if fade > 0:
        raw[:fade] *= np.linspace(0, 1, fade)
        raw[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(raw)) + 1e-6
    return (raw / peak) * 0.88


def chunk_words(text: str, start_s: float, end_s: float, hl_words: set[str]):
    words = text.replace("—", " ").split()
    groups = []
    i = 0
    while i < len(words):
        if i + 1 < len(words) and len(words[i]) + len(words[i + 1]) <= 12:
            groups.append(f"{words[i]} {words[i+1]}")
            i += 2
        else:
            groups.append(words[i])
            i += 1
    total_chars = sum(max(3, len(g)) for g in groups)
    cur = start_s
    dur = end_s - start_s
    cues = []
    for g in groups:
        g_dur = dur * (max(3, len(g)) / total_chars)
        clean = g.lower().strip(".,?!")
        is_hl = any(hw in clean for hw in hl_words)
        cues.append({
            "text": g,
            "startFrame": int(round(cur * FPS)),
            "endFrame": int(round((cur + g_dur) * FPS)),
            "highlight": is_hl,
        })
        cur += g_dur
    return cues


HIGHLIGHTS = {
    "1946", "membakar", "lautan", "api", "ultimatum", "tujuh", "jam", "nasution",
    "bumi", "hangus", "dua", "ratus", "ribu", "sebelas", "dayeuhkolot", "toha",
    "ramdan", "dinamit", "meledak", "delapan", "belas", "merdeka", "bandung",
}

SCENES = [
    (
        "hook",
        [
            ("h1", "tegang", "Maret seribu sembilan ratus empat puluh enam, ratusan ribu warga Bandung membakar rumah mereka sendiri."),
            ("h2", "narasi", "Mengapa mereka mengubah kota tercinta menjadi lautan api?"),
        ],
    ),
    (
        "ultimatum",
        [
            ("u1", "narasi", "Semua berawal saat pasukan Sekutu menjatuhkan selebaran ultimatum dari udara."),
            ("u2", "tegas", "Kosongkan Bandung Selatan sebelum tengah malam, waktunya hanya tujuh jam."),
        ],
    ),
    (
        "markas",
        [
            ("m1", "narasi", "Di pos markas, Kolonel Nasution menatap peta Bandung dengan keputusan berat."),
            ("m2", "tegas", "Lebih baik kita bumihanguskan, daripada kota ini jadi markas musuh."),
        ],
    ),
    (
        "bakar",
        [
            ("b1", "narasi", "Malam itu, dua ratus ribu warga mengungsi sambil menyulut obor ke rumah sendiri."),
            ("b2", "tegang", "Dalam sekejap, lautan api membentang sepanjang sebelas kilometer."),
        ],
    ),
    (
        "susup",
        [
            ("s1", "narasi", "Di tengah kobaran api, Mohammad Toha dan Ramdan menjalankan misi paling nekat."),
            ("s2", "tegang", "Menyusup menembus lampu sorot menuju gudang mesiu raksasa di Dayeuhkolot."),
        ],
    ),
    (
        "dinamit",
        [
            ("d1", "narasi", "Di dalam gudang penuh peti peledak, Toha meletakkan dinamit lalu menyalakan sumbunya."),
            ("d2", "tegas", "Cepat mundur, Ramdan. Biar aku yang menyelesaikan ini."),
        ],
    ),
    (
        "ledakan",
        [
            ("l1", "tegang", "Seketika, ledakan dahsyat mengguncang seluruh Bandung Selatan."),
            ("l2", "narasi", "Delapan belas ribu ton mesiu Sekutu hancur berkeping-keping."),
        ],
    ),
    (
        "fajar",
        [
            ("f1", "santai", "Esok paginya, Bandung tinggal asap dan bara, namun semangat mereka tak pernah padam."),
            ("f2", "narasi", "Inilah kisah keberanian abadi, Bandung Lautan Api."),
        ],
    ),
]

chunks = []
scene_meta = {}
lines_meta = {}
all_captions = []

cursor_s = 0.25
chunks.append(np.zeros(int(cursor_s * SR), dtype=np.float32))
order = []

for sc_key, line_list in SCENES:
    order.append(sc_key)
    sc_start = cursor_s
    for lid, emo, text in line_list:
        print(f"[{sc_key} | {lid} | {emo}] {text}")
        seg = synth_line(text, emo)
        p_start = cursor_s
        p_dur = len(seg) / SR
        chunks.append(seg)
        gap = 0.16
        chunks.append(np.zeros(int(gap * SR), dtype=np.float32))
        cursor_s += p_dur + gap
        lines_meta[lid] = {
            "scene": sc_key,
            "emotion": emo,
            "text": text,
            "startSec": round(p_start, 3),
            "endSec": round(p_start + p_dur, 3),
            "from": int(round((p_start - sc_start) * FPS)),
            "to": int(round((p_start + p_dur - sc_start) * FPS)),
            "globalFrom": int(round(p_start * FPS)),
            "globalTo": int(round((p_start + p_dur) * FPS)),
        }
        all_captions.extend(chunk_words(text, p_start, p_start + p_dur, HIGHLIGHTS))

    pad = 0.30
    chunks.append(np.zeros(int(pad * SR), dtype=np.float32))
    cursor_s += pad
    scene_meta[sc_key] = {
        "startSec": round(sc_start, 3),
        "endSec": round(cursor_s, 3),
        "startFrame": int(round(sc_start * FPS)),
        "durationInFrames": int(round((cursor_s - sc_start) * FPS)),
    }

# Final hold 0.6s
chunks.append(np.zeros(int(0.6 * SR), dtype=np.float32))
cursor_s += 0.6

voice_track = np.concatenate(chunks)
N_SAMPLES = len(voice_track)
total_s = N_SAMPLES / SR
total_frames = int(round(total_s * FPS))
t_all = np.linspace(0, total_s, N_SAMPLES, endpoint=False)
rng = np.random.default_rng(1946)

# Ensure exact frame partition
for idx, k in enumerate(order):
    if idx < len(order) - 1:
        scene_meta[k]["durationInFrames"] = scene_meta[order[idx + 1]]["startFrame"] - scene_meta[k]["startFrame"]
    else:
        scene_meta[k]["durationInFrames"] = total_frames - scene_meta[k]["startFrame"]

sfx = np.zeros(N_SAMPLES, dtype=np.float32)


def add_sfx(arr: np.ndarray, t_s: float, gain: float = 0.5):
    s = int(t_s * SR)
    e = min(N_SAMPLES, s + len(arr))
    if e > s and s >= 0:
        sfx[s:e] += arr[:e - s] * gain


# 1. Roaring fire ambience on hook, bakar, ledakan, fajar
def fire_bed(dur_s: float) -> np.ndarray:
    n = int(dur_s * SR)
    noise = rng.normal(0, 1, n)
    low = signal.lfilter(*signal.butter(2, 340 / (SR / 2), btype="low"), noise)
    crackle = signal.lfilter(*signal.butter(2, [2200 / (SR / 2), 6000 / (SR / 2)], btype="band"), noise)
    t_f = np.linspace(0, dur_s, n, endpoint=False)
    env = np.minimum(1, t_f / 0.4) * np.minimum(1, (dur_s - t_f) / 0.4)
    return (low * 0.55 + crackle * (rng.uniform(0, 1, n) > 0.985) * 1.4) * env


add_sfx(fire_bed(scene_meta["hook"]["endSec"] - scene_meta["hook"]["startSec"]), scene_meta["hook"]["startSec"], 0.28)
add_sfx(fire_bed(scene_meta["bakar"]["endSec"] - scene_meta["bakar"]["startSec"]), scene_meta["bakar"]["startSec"], 0.34)
add_sfx(fire_bed(4.0), scene_meta["fajar"]["startSec"], 0.16)

# 2. Prop plane buzz + leaflet whoosh on ultimatum
t_u = scene_meta["ultimatum"]["startSec"]
t_p = np.linspace(0, 3.2, int(3.2 * SR), endpoint=False)
plane = (np.sin(2 * np.pi * (88 - 18 * t_p / 3.2) * t_p) + 0.5 * np.sin(2 * np.pi * 176 * t_p)) * np.sin(np.pi * t_p / 3.2)
add_sfx(plane, t_u + 0.3, 0.22)

# 3. Map slap / dramatic impact on markas command
t_m = lines_meta["m2"]["startSec"] - 0.12
t_slap = np.linspace(0, 0.22, int(0.22 * SR), endpoint=False)
slap = np.sin(2 * np.pi * 95 * np.exp(-t_slap * 18) * t_slap) * np.exp(-t_slap * 20)
add_sfx(slap, t_m, 0.45)

# 4. Torch ignition whoosh on bakar
t_b = scene_meta["bakar"]["startSec"] + 2.2
t_w = np.linspace(0, 0.9, int(0.9 * SR), endpoint=False)
whoosh = signal.lfilter(*signal.butter(2, [350 / (SR / 2), 1800 / (SR / 2)], btype="band"), rng.normal(0, 1, len(t_w))) * np.sin(np.pi * t_w / 0.9)
add_sfx(whoosh, t_b, 0.45)

# 5. Suspenseful searchlight hum on susup
t_s = scene_meta["susup"]["startSec"]
dur_s = scene_meta["susup"]["endSec"] - t_s
t_su = np.linspace(0, dur_s, int(dur_s * SR), endpoint=False)
hum = np.sin(2 * np.pi * 65 * t_su) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.3 * t_su)) * np.sin(np.pi * t_su / dur_s)
add_sfx(hum, t_s, 0.22)

# 6. Dynamite fuse sizzle on dinamit
t_d = scene_meta["dinamit"]["startSec"] + 2.1
t_fz = np.linspace(0, 3.2, int(3.2 * SR), endpoint=False)
fuse = signal.lfilter(*signal.butter(2, 3200 / (SR / 2), btype="high"), rng.normal(0, 1, len(t_fz))) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t_fz)) * np.sin(np.pi * t_fz / 3.2)
add_sfx(fuse, t_d, 0.26)

# 7. MASSIVE Dayeuhkolot TNT explosion boom + debris rumble on ledakan!
t_ex0 = scene_meta["ledakan"]["startSec"] + 0.35
t_ex = np.linspace(0, 3.0, int(3.0 * SR), endpoint=False)
boom = np.sin(2 * np.pi * 52 * np.exp(-t_ex * 1.9) * t_ex) * np.exp(-t_ex * 1.4)
rumble = signal.lfilter(*signal.butter(2, 380 / (SR / 2), btype="low"), rng.normal(0, 1, len(t_ex))) * np.exp(-t_ex * 1.15)
crack = signal.lfilter(*signal.butter(2, [900 / (SR / 2), 3600 / (SR / 2)], btype="band"), rng.normal(0, 1, len(t_ex))) * np.exp(-t_ex * 6.5)
add_sfx(boom + rumble * 0.9 + crack * 0.65, t_ex0, 0.85)

# 8. Heroic Minor-Key Cinematic Score (D minor -> A minor -> F major -> C major chord progression, smoothly ducked)
chords = [
    (73.42, 110.0, 146.83, 174.61),  # Dm
    (65.41, 98.0, 130.81, 164.81),   # C
    (58.27, 87.31, 116.54, 146.83),  # Bb
    (55.0, 82.41, 110.0, 138.59),    # A
]
bgm = np.zeros(N_SAMPLES, dtype=np.float32)
chord_len = 4.0
for idx_c in range(int(np.ceil(total_s / chord_len))):
    s_i = int(idx_c * chord_len * SR)
    e_i = min(N_SAMPLES, int((idx_c + 1) * chord_len * SR))
    if e_i <= s_i:
        continue
    t_c = t_all[s_i:e_i]
    freqs = chords[idx_c % len(chords)]
    pad_wave = sum(np.sin(2 * np.pi * f * t_c) * (0.042 if j == 0 else 0.022) for j, f in enumerate(freqs))
    # Subtle march drum pulse
    pulse = 0.65 + 0.35 * np.sin(2 * np.pi * 2.0 * t_c)
    bgm[s_i:e_i] = pad_wave * pulse

env = np.abs(voice_track)
duck = 1.0 - np.clip(signal.lfilter(np.ones(2200) / 2200, 1, env) * 5.0, 0, 0.78)
mix = voice_track + sfx + bgm * duck
mix = np.clip(mix, -0.95, 0.95)

wav_tmp = Path("/tmp/bandung_master.wav")
with wave.open(str(wav_tmp), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())

subprocess.run(["ffmpeg", "-y", "-i", str(wav_tmp), "-b:a", "192k", str(OUT_AUDIO)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

OUT_JSON.write_text(
    json.dumps(
        {
            "totalDurationSec": round(total_s, 3),
            "totalFrames": total_frames,
            "order": order,
            "scenes": scene_meta,
            "lines": lines_meta,
            "captions": all_captions,
        },
        indent=2,
        ensure_ascii=False,
    )
)
print(f"Saved: {OUT_AUDIO} ({total_s:.2f}s / {total_frames} frames) & {OUT_JSON}")

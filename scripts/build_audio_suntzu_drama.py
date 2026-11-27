"""Sun Tzu Drama Penuh (10 Adegan): Master audio mixer, multi-layer crowd voices,
taiko war drums, bronze gong, running footsteps, marching stomps, and exact timing JSON.
"""
import json, math, re, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import resample_poly, butter, sosfilt
from scipy.ndimage import uniform_filter1d

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
SR = 44100
TEMPO = 1.24  # Crisp dramatic pacing (~2m 50s total, under 3-min YouTube Shorts cap)

SCENE_CFG = {
    "s01_balairung": dict(pre=0.65, post=0.45, gap=0.18),
    "s02_pasukan":   dict(pre=0.45, post=0.40, gap=0.18),
    "s03_aturan":    dict(pre=0.35, post=0.35, gap=0.15),
    "s04_perintah1": dict(pre=0.35, post=0.45, gap=0.28),
    "s05_perintah2": dict(pre=0.35, post=0.45, gap=0.28),
    "s06_vonis":     dict(pre=0.30, post=0.45, gap=0.16),
    "s07_utusan":    dict(pre=0.30, post=0.45, gap=0.25),
    "s08_eksekusi":  dict(pre=2.30, post=0.60, gap=0.20),
    "s09_serempak":  dict(pre=0.35, post=0.45, gap=0.26),
    "s10_penutup":   dict(pre=0.45, post=1.50, gap=0.24),
}

SPEAKER_PAN = {
    "narator": 0.0,
    "raja": 0.14,
    "suntzu": -0.06,
    "selir_a": -0.24,
    "selir_b": 0.24,
    "utusan": -0.14,
}

SPEAKER_LABEL = {
    "narator": "",
    "raja": "RAJA HELÜ",
    "suntzu": "SUN TZU",
    "selir_a": "SELIR A",
    "selir_b": "SELIR B",
    "utusan": "UTUSAN RAJA",
    "crowd_tahu": "PASUKAN",
    "crowd_mengerti": "PASUKAN",
    "crowd_laugh1": "PASUKAN",
    "crowd_laugh2": "PASUKAN",
    "crowd_scream": "PASUKAN",
    "crowd_siap1": "PASUKAN",
    "crowd_siap2": "PASUKAN",
}

HIGHLIGHT_WORDS = {
    "perangmu", "panglima", "kanan", "kiri", "gerak", "hahahaha", "hihihi",
    "mati", "hukuman", "aaahhh", "hentikan", "menolak", "tidak", "siap",
    "maju", "disiplin", "kekejaman", "tombak", "genderang", "tangkap",
}


def clean(w: str) -> str:
    return re.sub(r"[^a-z]", "", w.lower())


def align(text: str, heard, d: float):
    import importlib.util
    spec = importlib.util.spec_from_file_location("suntzu_emu", ROOT / "scripts/build_audio_emu.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    scaled = [[w, a / TEMPO, b / TEMPO] for w, a, b in heard]
    return mod.align_script(text, scaled, d)


_WAV_CACHE = {}


def load_wav_mono(path: Path) -> np.ndarray:
    key = str(path)
    if key in _WAV_CACHE:
        return _WAV_CACHE[key]
    p = subprocess.run(
        [
            "ffmpeg", "-v", "error", "-i", str(path),
            "-af", f"atempo={TEMPO}", "-ar", str(SR), "-ac", "1", "-f", "s16le", "-",
        ],
        capture_output=True, check=True,
    )
    y = np.frombuffer(p.stdout, np.int16).astype(np.float32) / 32768.0
    _WAV_CACHE[key] = y
    return y


def put_stereo(dst: np.ndarray, y: np.ndarray, t_sec: float, gain: float = 1.0, pan: float = 0.0):
    a = max(0, round(t_sec * SR))
    m = min(len(y), len(dst) - a)
    if m <= 0:
        return
    dst[a:a + m, 0] += y[:m] * gain * math.sqrt(max(0.0, (1.0 - pan) / 2.0))
    dst[a:a + m, 1] += y[:m] * gain * math.sqrt(max(0.0, (1.0 + pan) / 2.0))


def build():
    script = json.loads((ROOT / "scripts/naskah/suntzu_drama.json").read_text())
    actual = json.loads((ROOT / "src/suntzu_voice.json").read_text())

    scenes = {}
    lines = {}
    caps = []
    voice_events = []  # (global_t, voice_key, clip_files_list)
    cursor = 0.0

    for si, sc in enumerate(script):
        name = sc["scene"]
        cfg = SCENE_CFG[name]
        t = cfg["pre"]
        rows = []
        for li, (style, text, voice) in enumerate(sc["lines"]):
            if li > 0:
                # Extra dramatic pause right after command drum before crowd response
                extra_gap = 0.38 if (name in ("s04_perintah1", "s05_perintah2", "s09_serempak") and voice.startswith("crowd_")) else 0.0
                # Extra pause when Utusan runs down stairs before speaking
                if name == "s07_utusan" and voice == "utusan":
                    extra_gap = 1.15
                t += cfg["gap"] + extra_gap

            ln = actual["scenes"][si]["lines"][li]
            primary_path = ROOT / ln["file"]
            y_main = load_wav_mono(primary_path)
            d = len(y_main) / SR

            # Crowd clips can have multiple layered files (ara + nadia_ceria + butini)
            layer_files = [ROOT / p for p in ln.get("layers", [ln["file"]])]
            if len(layer_files) > 1:
                max_d = max(len(load_wav_mono(p)) / SR for p in layer_files)
                d = max(d, max_d)

            words = align(text, ln["wordsSec"], d)
            local_words = [{"w": w, "from": round((t + a) * FPS), "to": round((t + b) * FPS)} for w, a, b in words]
            rows.append({
                "voice": voice,
                "speaker": SPEAKER_LABEL.get(voice, ""),
                "style": style,
                "text": text,
                "from": round(t * FPS),
                "to": round((t + d) * FPS),
                "words": local_words,
            })

            # Group captions in punchy 1-2 word chunks for readability
            g_start_scene = round(cursor * FPS)
            for w in local_words:
                caps.append({
                    "text": w["w"],
                    "startFrame": g_start_scene + w["from"],
                    "endFrame": g_start_scene + max(w["from"] + 2, w["to"]),
                    "highlight": clean(w["w"]) in HIGHLIGHT_WORDS,
                    "voice": voice,
                    "speaker": SPEAKER_LABEL.get(voice, ""),
                })

            voice_events.append((cursor + t, voice, layer_files, name, li))
            t += d

        duration = round((t + cfg["post"]) * FPS)
        scenes[name] = {
            "startFrame": round(cursor * FPS),
            "durationInFrames": duration,
            "title": sc["title"],
        }
        lines[name] = rows
        cursor += duration / FPS

    def find_word(sc_name: str, li: int, target: str, fallback_ratio: float = 0.5) -> int:
        row = lines[sc_name][li]
        for w in row["words"]:
            if clean(w["w"]) == clean(target):
                return w["from"]
        return round(row["from"] + (row["to"] - row["from"]) * fallback_ratio)

    events = {
        "drum1": lines["s04_perintah1"][0]["to"] + 2,
        "laugh1": lines["s04_perintah1"][1]["from"],
        "drum2": lines["s05_perintah2"][0]["to"] + 2,
        "laugh2": lines["s05_perintah2"][1]["from"],
        "death_verdict": find_word("s06_vonis", 0, "mati", 0.72),
        "arrest_cmd": find_word("s06_vonis", 0, "tangkap", 0.88),
        "crowd_scream": lines["s06_vonis"][1]["from"],
        "utusan_run_start": lines["s07_utusan"][0]["to"] - 4,
        "utusan_arrive": lines["s07_utusan"][1]["from"],
        "suntzu_refuse": lines["s07_utusan"][2]["from"],
        "gong_exec": round(0.35 * FPS),
        "replace_cmd": lines["s08_eksekusi"][0]["from"],
        "drum3_right": lines["s09_serempak"][0]["to"] + 2,
        "siap1": lines["s09_serempak"][1]["from"],
        "drum4_left": lines["s09_serempak"][2]["to"] + 2,
        "siap2": lines["s09_serempak"][3]["from"],
    }

    total_frames = round(cursor * FPS)
    timing = {
        "fps": FPS,
        "totalDurationSec": round(cursor, 3),
        "totalFrames": total_frames,
        "order": list(scenes.keys()),
        "scenes": scenes,
        "lines": lines,
        "events": events,
        "captions": caps,
    }
    (ROOT / "src/suntzu_timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1) + "\n")
    print(f"TIMING WRITTEN: {cursor:.3f}s ({total_frames} frames, {len(scenes)} scenes)", flush=True)

    # ===== AUDIO SYNTHESIS & MASTER MIX =====
    n = round(cursor * SR)
    vo = np.zeros((n, 2), np.float32)
    bed = np.zeros((n, 2), np.float32)
    fx = np.zeros((n, 2), np.float32)
    rng = np.random.default_rng(42)

    # 1. Place all voice tracks & multi-layer crowds
    for g_t, voice, layer_files, sc_name, li in voice_events:
        if voice.startswith("crowd_") and len(layer_files) > 1:
            is_sync = voice in ("crowd_siap1", "crowd_siap2", "crowd_tahu", "crowd_mengerti")
            offsets = [0.0, 0.025, 0.055] if is_sync else [0.0, 0.095, 0.195]
            pans = [-0.38, 0.04, 0.40]
            gains = [0.68, 0.72, 0.65]
            for lf, off, pn, gn in zip(layer_files, offsets, pans, gains):
                y = load_wav_mono(lf)
                put_stereo(vo, y, g_t + off, gain=gn, pan=pn)
        else:
            y = load_wav_mono(layer_files[0])
            gain = 1.08 if voice in ("suntzu", "raja") else 1.0
            put_stereo(vo, y, g_t, gain=gain, pan=SPEAKER_PAN.get(voice, 0.0))

    # 2. Cinematic SFX generators
    def taiko_drum(intensity=1.0):
        dur = 1.15
        t = np.arange(round(dur * SR)) / SR
        # Deep resonant war drum pitch drop + wood rim crack + room decay
        f_env = 108.0 * np.exp(-t * 14.0) + 52.0
        phase = 2 * np.pi * np.cumsum(f_env) / SR
        body = np.sin(phase) * np.exp(-t * 4.5)
        sub = np.sin(2 * np.pi * 46.0 * t) * np.exp(-t * 3.4) * 0.55
        crack = rng.normal(size=len(t)) * np.exp(-t * 55.0) * 0.45
        y = (body + sub + crack) * 0.62 * intensity
        return np.tanh(y * 1.35).astype(np.float32)

    def bronze_gong(dur=3.2):
        t = np.arange(round(dur * SR)) / SR
        # Classic bronze gong inharmonic partials + low rumble swell
        ratios = [1.0, 1.48, 2.09, 2.81, 3.63, 4.92]
        base = 82.0
        y = np.zeros_like(t)
        for idx, r in enumerate(ratios):
            fm = np.sin(2 * np.pi * (base * r * 0.5) * t) * (1.2 * np.exp(-t * 1.4))
            amp = (0.45 / (idx + 1) ** 0.75) * np.exp(-t * (0.65 + idx * 0.35))
            y += np.sin(2 * np.pi * base * r * t + fm) * amp
        hit = rng.normal(size=len(t)) * np.exp(-t * 28.0) * 0.25
        y = (y + hit) * (1.0 - np.exp(-t * 45.0)) * 0.58
        return np.tanh(y * 1.2).astype(np.float32)

    def spear_clatter():
        dur = 0.55
        t = np.arange(round(dur * SR)) / SR
        y = np.zeros_like(t)
        for delay, freq in [(0.0, 420), (0.045, 510), (0.09, 380), (0.14, 620)]:
            i0 = round(delay * SR)
            tl = t[:len(t) - i0]
            hit = (np.sin(2 * np.pi * freq * tl) * 0.4 + rng.normal(size=len(tl)) * 0.25) * np.exp(-tl * 26.0)
            y[i0:] += hit * 0.28
        return y.astype(np.float32)

    def footstep(heavy=False):
        dur = 0.14
        t = np.arange(round(dur * SR)) / SR
        thud = np.sin(2 * np.pi * (85 if heavy else 125) * t) * np.exp(-t * 28.0)
        grit = rng.normal(size=len(t)) * np.exp(-t * 42.0) * 0.35
        return ((thud * 0.7 + grit) * (0.42 if heavy else 0.24)).astype(np.float32)

    def wind_gust(dur=2.4):
        t = np.arange(round(dur * SR)) / SR
        noise = rng.normal(size=len(t)).astype(np.float32)
        sos = butter(3, [180, 750], btype="bandpass", fs=SR, output="sos")
        y = sosfilt(sos, noise).astype(np.float32)
        env = np.sin(np.pi * t / dur) ** 1.4
        return (y * env * 0.18).astype(np.float32)

    def g_sec(sc_name: str, local_frame: int) -> float:
        return (scenes[sc_name]["startFrame"] + local_frame) / FPS

    # Place SFX at exact story beats
    # Scene 2: spear lift & clatter
    put_stereo(fx, spear_clatter(), g_sec("s02_pasukan", 45), 0.75, -0.15)
    put_stereo(fx, spear_clatter(), g_sec("s02_pasukan", 55), 0.70, 0.18)

    # Scene 4: 1st command WAR DRUM!
    put_stereo(fx, taiko_drum(1.05), g_sec("s04_perintah1", events["drum1"]), 0.95, 0.0)

    # Scene 5: 2nd command WAR DRUM (even punchier)!
    put_stereo(fx, taiko_drum(1.15), g_sec("s05_perintah2", events["drum2"]), 1.0, 0.0)

    # Scene 6: Death verdict BRONZE GONG + guards rushing footsteps
    put_stereo(fx, bronze_gong(2.6), g_sec("s06_vonis", events["death_verdict"]), 0.65, 0.0)
    t_arr = g_sec("s06_vonis", events["arrest_cmd"])
    for k in range(6):
        put_stereo(fx, footstep(heavy=True), t_arr + k * 0.16, 0.7, -0.25 + (k % 2) * 0.5)

    # Scene 7: Utusan running rapidly down stone stairs
    t_run = g_sec("s07_utusan", events["utusan_run_start"])
    for k in range(8):
        put_stereo(fx, footstep(heavy=False), t_run + k * 0.13, 0.85, -0.3 + k * 0.05)

    # Scene 8: Dramatic cutaway GONG + cold wind + replacement spears raised
    put_stereo(fx, bronze_gong(3.2), g_sec("s08_eksekusi", events["gong_exec"]), 0.92, 0.0)
    put_stereo(fx, wind_gust(2.5), g_sec("s08_eksekusi", 2), 0.95, 0.0)
    t_rep = g_sec("s08_eksekusi", lines["s08_eksekusi"][0]["to"] - 10)
    put_stereo(fx, spear_clatter(), t_rep, 0.9, 0.0)

    # Scene 9: Precision war drums + synchronized marching stomps!
    t_d3 = g_sec("s09_serempak", events["drum3_right"])
    put_stereo(fx, taiko_drum(1.15), t_d3, 0.95, 0.0)
    put_stereo(fx, footstep(heavy=True), t_d3 + 0.12, 1.0, -0.2)
    put_stereo(fx, footstep(heavy=True), t_d3 + 0.14, 1.0, 0.2)

    t_d4 = g_sec("s09_serempak", events["drum4_left"])
    put_stereo(fx, taiko_drum(1.2), t_d4, 1.0, 0.0)
    for k in range(5):
        put_stereo(fx, footstep(heavy=True), t_d4 + 0.15 + k * 0.28, 0.9, -0.18 if k % 2 == 0 else 0.18)

    # 3. Dynamic Pentatonic Guzheng + Tension Drone Music Bed
    def guzheng(f, dur=1.6):
        t = np.arange(round(dur * SR)) / SR
        y = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (2.6 + h * 1.1)) / (h ** 1.45) for h in [1, 2, 3, 4, 5])
        return (y * 0.085).astype(np.float32)

    def tension_drone(dur):
        t = np.arange(round(dur * SR)) / SR
        y = (np.sin(2 * np.pi * 55.0 * t) * 0.45 + np.sin(2 * np.pi * 82.4 * t) * 0.22 + np.sin(2 * np.pi * 110.5 * t) * 0.12)
        env = np.minimum(1.0, t / 0.4) * np.minimum(1.0, (dur - t) / 0.5)
        return (y * env * 0.055).astype(np.float32)

    s06_start = scenes["s06_vonis"]["startFrame"] / FPS
    s09_start = scenes["s09_serempak"]["startFrame"] / FPS
    s10_start = scenes["s10_penutup"]["startFrame"] / FPS

    # Pentatonic melody (D minor pentatonic: D3, F3, G3, A3, C4, D4)
    mel_early = [146.83, 174.61, 196.00, 220.00, 261.63, 220.00, 196.00, 174.61]
    mel_march = [146.83, 220.00, 196.00, 293.66, 261.63, 220.00]
    mel_end   = [220.00, 196.00, 174.61, 146.83, 130.81, 146.83]

    # Section 1: s01..s05 lively palace pentatonic
    for idx, t_note in enumerate(np.arange(0.0, s06_start - 0.5, 1.15)):
        put_stereo(bed, guzheng(mel_early[idx % len(mel_early)], 1.5), t_note, 0.72, (-1) ** idx * 0.28)
        if idx % 4 == 0:
            put_stereo(bed, guzheng(73.42, 2.2), t_note, 0.55, 0.0)

    # Section 2: s06..s08 dead silence of melody, only eerie low sub-drone
    put_stereo(bed, tension_drone(max(1.0, s09_start - s06_start - 0.5)), s06_start + 0.3, 1.0, 0.0)

    # Section 3: s09 disciplined martial pulse
    for idx, t_note in enumerate(np.arange(s09_start, s10_start - 0.3, 0.75)):
        put_stereo(bed, guzheng(mel_march[idx % len(mel_march)], 1.1), t_note, 0.75, (-1) ** idx * 0.25)

    # Section 4: s10 reflective poignant finale
    for idx, t_note in enumerate(np.arange(s10_start, cursor - 0.8, 1.45)):
        put_stereo(bed, guzheng(mel_end[idx % len(mel_end)], 2.0), t_note, 0.80, (-1) ** idx * 0.22)
        if idx % 3 == 0:
            put_stereo(bed, guzheng(73.42, 2.5), t_note, 0.60, 0.0)

    # Sidechain duck music bed cleanly under voices
    env = uniform_filter1d(np.max(np.abs(vo), axis=1), 4410)
    bed *= np.clip(1.0 - env * 13.0, 0.16, 1.0)[:, None]

    mixed = vo + bed + fx
    fade = min(SR, n // 2)
    mixed[-fade:] *= np.linspace(1.0, 0.0, fade)[:, None]

    out_dir = ROOT / "out/voice/suntzu"
    out_dir.mkdir(parents=True, exist_ok=True)
    rawfile = out_dir / "mix_pre_loudnorm.wav"
    with wave.open(str(rawfile), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(mixed, -1.0, 1.0) * 32767).astype(np.int16).tobytes())

    dest = ROOT / "public/audio/suntzu_master.mp3"
    dest.parent.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(rawfile), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True
    )
    report = json.loads(probe.stderr[probe.stderr.rfind("{"):])
    filt = (
        "loudnorm=I=-14:TP=-1.5:LRA=11:"
        "measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:"
        "measured_thresh={input_thresh}:offset={target_offset}:linear=true"
    ).format(**report)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(rawfile), "-af", filt, "-ar", "44100", "-b:a", "192k", str(dest)], check=True)
    print(f"MASTER AUDIO READY: {dest} ({dest.stat().st_size / 1048576:.2f} MB)", flush=True)


if __name__ == "__main__":
    build()

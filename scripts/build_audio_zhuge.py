"""Zhuge Liang: Strategi Kota Kosong (10 Adegan Penuh):
Master audio mixer with 6 distinct VoxCPM2 characters + 3-layer crowd voices
(city panic, 150k Wei war cry, retreat shouts), creaking fortress gates, broom swishes,
Taiko war drums + cavalry rumble -> sudden battlefield silence -> crystal-clear solo
pentatonic Guqin zither, ancient war horn, auto-calibrated TEMPO (<174s YouTube Shorts cap!),
and exact frame-aligned timing JSON.
"""
import json
import math
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
SR = 44100
TARGET_MAX_SEC = 172.0  # Strictly < 180s (3 min) for YouTube Shorts / TikTok / Reels!

SCENE_CFG = {
    "s01_kabar":    dict(pre=0.70, post=0.45, gap=0.22),
    "s02_panik":    dict(pre=0.35, post=0.40, gap=0.20),
    "s03_perintah": dict(pre=0.35, post=0.45, gap=0.20),
    "s04_gerbang":  dict(pre=1.35, post=0.45, gap=0.22),  # 1.35s for creaking open fortress gates + broom swish!
    "s05_simayi":   dict(pre=0.70, post=0.55, gap=0.24),
    "s06_guqin":    dict(pre=2.60, post=0.55, gap=0.22),  # 2.60s pure crystal-clear Guqin solo in sudden silence!
    "s07_debat":    dict(pre=0.30, post=0.40, gap=0.20),
    "s08_mundur":   dict(pre=0.30, post=0.55, gap=0.24),
    "s09_lega":     dict(pre=0.55, post=0.50, gap=0.22),
    "s10_penutup":  dict(pre=0.45, post=1.65, gap=0.20),
}

SPEAKER_PAN = {
    "narator": 0.0,
    "zhuge": 0.04,
    "simayi": -0.14,
    "simazhao": 0.18,
    "pengintai": -0.20,
    "perwira": 0.18,
    "penyapu": -0.10,
}

SPEAKER_LABEL = {
    "narator": "",
    "zhuge": "ZHUGE LIANG",
    "simayi": "JEND. SIMA YI",
    "simazhao": "SIMA ZHAO",
    "pengintai": "PENGINTAI SHU",
    "perwira": "PERWIRA SHU",
    "penyapu": "PENYAPU TUA",
    "crowd_panic": "WARGA & PRAJURIT",
    "crowd_wei": "150.000 PASUKAN WEI",
    "crowd_retreat": "PASUKAN WEI",
}

HIGHLIGHT_WORDS = {
    "seratus", "ribu", "tentara", "aaahhh", "mati", "kabur", "tetap",
    "panji", "gerbang", "sapulah", "serbuuu", "kosong", "serbu",
    "berhenti", "mustahil", "kecapi", "bergetar", "bodoh", "jebakan",
    "mundur", "hahaha", "pintar", "habis", "pikiran", "lawan",
}


def clean(w: str) -> str:
    return re.sub(r"[^a-z]", "", w.lower())


def align(text: str, heard, d: float, tempo: float):
    import importlib.util
    spec = importlib.util.spec_from_file_location("zhuge_align", ROOT / "scripts/build_audio_emu.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    scaled = [[w, a / tempo, b / tempo] for w, a, b in heard]
    return mod.align_script(text, scaled, d)


def probe_wav_dur(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def load_wav_mono(path: Path, tempo: float) -> np.ndarray:
    p = subprocess.run(
        [
            "ffmpeg", "-v", "error", "-i", str(path),
            "-af", f"atempo={tempo:.4f}", "-ar", str(SR), "-ac", "1", "-f", "s16le", "-",
        ],
        capture_output=True, check=True,
    )
    return np.frombuffer(p.stdout, np.int16).astype(np.float32) / 32768.0


def put_stereo(dst: np.ndarray, y: np.ndarray, t_sec: float, gain: float = 1.0, pan: float = 0.0):
    a = max(0, round(t_sec * SR))
    m = min(len(y), len(dst) - a)
    if m <= 0:
        return
    dst[a:a + m, 0] += y[:m] * gain * math.sqrt(max(0.0, (1.0 - pan) / 2.0))
    dst[a:a + m, 1] += y[:m] * gain * math.sqrt(max(0.0, (1.0 + pan) / 2.0))


def compute_tempo(script, actual) -> float:
    """Auto-calibrate TEMPO between 1.10 and 1.32 so final video is ALWAYS < 174s (<3 min Shorts)."""
    raw_voice = 0.0
    overhead = 0.0
    for si, sc in enumerate(script):
        cfg = SCENE_CFG[sc["scene"]]
        overhead += cfg["pre"] + cfg["post"]
        for li, _ in enumerate(sc["lines"]):
            if li > 0:
                overhead += cfg["gap"]
            ln = actual["scenes"][si]["lines"][li]
            layers = [ROOT / p for p in ln.get("layers", [ln["file"]])]
            raw_voice += max(probe_wav_dur(p) for p in layers)
    # Target ~164s so there is comfortable margin under 180s
    desired_voice = max(90.0, TARGET_MAX_SEC - overhead - 4.0)
    tempo = raw_voice / desired_voice
    tempo = max(1.12, min(1.32, tempo))
    est_total = overhead + raw_voice / tempo
    print(f"[TEMPO] raw_voice={raw_voice:.2f}s overhead={overhead:.2f}s -> TEMPO={tempo:.3f} -> est_total={est_total:.2f}s", flush=True)
    return tempo


# ==================== PROCEDURAL CINEMATIC SFX & GUQIN SYNTHESIS ====================

def make_guqin_note(freq: float, dur: float = 2.6, slide_semis: float = 0.0, amp: float = 0.22) -> np.ndarray:
    """Warm ancient silk-string Guqin pluck with harmonics, body resonance, and optional slide."""
    n = max(1, round(dur * SR))
    t = np.arange(n, dtype=np.float32) / SR
    # Subtle silk-string pitch slide (characteristic of Guqin!)
    if abs(slide_semis) > 0.01:
        slide = 1.0 + (2.0 ** (slide_semis / 12.0) - 1.0) * (1.0 - np.exp(-t * 9.0))
        phase = 2.0 * np.pi * np.cumsum(freq * slide) / SR
    else:
        vib = 1.0 + 0.0025 * np.sin(2.0 * np.pi * 4.5 * t) * np.clip(t * 2.0, 0, 1)
        phase = 2.0 * np.pi * np.cumsum(freq * vib) / SR

    y = np.zeros(n, dtype=np.float32)
    # Silk string harmonics (warm wooden resonance, decays gracefully)
    for h, w, dec in [(1, 1.0, 1.35), (2, 0.48, 2.2), (3, 0.24, 3.4), (4, 0.11, 5.0), (5, 0.05, 7.2)]:
        y += w * np.sin(phase * h) * np.exp(-t * dec)
    # Soft fingernail pluck transient
    rng = np.random.default_rng(int(freq * 100))
    pluck = rng.normal(0, 0.14, n).astype(np.float32) * np.exp(-t * 70.0)
    sos = butter(2, [450, 3200], btype="bandpass", fs=SR, output="sos")
    y += sosfilt(sos, pluck)
    # Gentle attack envelope (avoid click)
    atk = min(n, round(0.008 * SR))
    y[:atk] *= np.linspace(0, 1, atk, dtype=np.float32)
    return y * amp


def make_taiko_hit(pitch: float = 82.0, dur: float = 0.85, amp: float = 0.55) -> np.ndarray:
    n = round(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(int(pitch * 17))
    f_env = pitch + 42.0 * np.exp(-t * 22.0)
    phase = 2.0 * np.pi * np.cumsum(f_env) / SR
    body = np.sin(phase) * np.exp(-t * 5.2)
    slap = rng.normal(0, 0.28, n).astype(np.float32) * np.exp(-t * 40.0)
    sos = butter(2, 900, btype="lowpass", fs=SR, output="sos")
    return (body + sosfilt(sos, slap)) * amp


def make_gate_creak(dur: float = 1.6) -> np.ndarray:
    """Heavy timber fortress gate hinges groaning open + iron chain clank."""
    n = round(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(404)
    # Low resonant wood friction harmonics
    f0 = 64.0 + 18.0 * np.sin(2 * np.pi * 1.3 * t) + 9.0 * np.sin(2 * np.pi * 4.7 * t)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    groan = (0.55 * np.sin(ph) + 0.35 * np.sin(ph * 2.02) + 0.20 * np.sin(ph * 3.05))
    grit = rng.normal(0, 0.25, n).astype(np.float32)
    sos = butter(2, [140, 620], btype="bandpass", fs=SR, output="sos")
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    y = (groan * 0.45 + sosfilt(sos, grit) * 0.8) * env * 0.34
    # Deep thud when gate hits open stop
    thud_idx = round((dur - 0.22) * SR)
    thud = make_taiko_hit(58.0, 0.32, 0.32)
    m = min(len(thud), n - thud_idx)
    if m > 0:
        y[thud_idx:thud_idx + m] += thud[:m]
    return y


def make_broom_swish(dur: float = 0.52) -> np.ndarray:
    n = round(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(505)
    noise = rng.normal(0, 1.0, n).astype(np.float32)
    sos = butter(2, [900, 3800], btype="bandpass", fs=SR, output="sos")
    env = np.sin(np.pi * t / dur) ** 1.4
    return sosfilt(sos, noise) * env * 0.14


def make_cavalry_rumble(dur: float = 4.0, fade_in: float = 0.8, fade_out: float = 0.25) -> np.ndarray:
    """150,000 Wei soldiers & warhorse hooves rumbling across the dusty plain."""
    n = round(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(707)
    base = rng.normal(0, 1.0, n).astype(np.float32)
    sos_low = butter(3, [38, 175], btype="bandpass", fs=SR, output="sos")
    rumble = sosfilt(sos_low, base) * 0.75
    # Rhythmic galloping/marching modulation
    cadence = 0.65 + 0.35 * np.sin(2 * np.pi * 5.2 * t) + 0.18 * np.sin(2 * np.pi * 10.4 * t)
    y = rumble * cadence
    fi = min(n, round(fade_in * SR))
    fo = min(n, round(fade_out * SR))
    if fi > 0:
        y[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    if fo > 0:
        y[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)
    return y * 0.55


def make_war_horn(freq: float = 146.83, dur: float = 2.4, amp: float = 0.26) -> np.ndarray:
    """Deep ancient Chinese bronze/ox-horn war call (charging or retreat)."""
    n = round(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    pitch = freq * (1.0 - 0.04 * np.exp(-t * 4.5) - 0.025 * np.clip((t - dur * 0.7) / (dur * 0.3), 0, 1))
    ph = 2 * np.pi * np.cumsum(pitch) / SR
    raw = (
        1.0 * np.sin(ph)
        + 0.68 * np.sin(ph * 2)
        + 0.44 * np.sin(ph * 3)
        + 0.22 * np.sin(ph * 4)
        + 0.10 * np.sin(ph * 5)
    )
    sos = butter(2, 950, btype="lowpass", fs=SR, output="sos")
    y = sosfilt(sos, raw)
    env = np.clip(t / 0.28, 0, 1) * np.clip((dur - t) / 0.55, 0, 1)
    return y * env * amp * 0.5


def make_tension_drone(dur: float = 10.0, freq: float = 65.41, amp: float = 0.11) -> np.ndarray:
    n = round(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    y = (
        0.7 * np.sin(2 * np.pi * freq * t)
        + 0.3 * np.sin(2 * np.pi * freq * 1.5 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
    )
    env = np.clip(t / 0.9, 0, 1) * np.clip((dur - t) / 0.9, 0, 1)
    return y * env * amp


def build():
    script = json.loads((ROOT / "scripts/naskah/zhuge.json").read_text())
    actual = json.loads((ROOT / "src/zhuge_voice.json").read_text())

    tempo = compute_tempo(script, actual)

    scenes = {}
    lines = {}
    caps = []
    voice_events = []
    cursor = 0.0

    for si, sc in enumerate(script):
        name = sc["scene"]
        cfg = SCENE_CFG[name]
        t = cfg["pre"]
        rows = []
        for li, (style, text, voice) in enumerate(sc["lines"]):
            if li > 0:
                extra_gap = 0.0
                if name == "s05_simayi" and voice == "simayi":
                    extra_gap = 0.28  # crisp beat before Sima Yi slams "BERHENTI!!"
                elif name == "s08_mundur" and voice == "crowd_retreat":
                    extra_gap = 0.24
                t += cfg["gap"] + extra_gap

            ln = actual["scenes"][si]["lines"][li]
            layer_files = [ROOT / p for p in ln.get("layers", [ln["file"]])]
            d = max(len(load_wav_mono(p, tempo)) / SR for p in layer_files)

            words = align(text, ln["wordsSec"], d, tempo)
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

            g_start_scene = round(cursor * FPS)
            for w in local_words:
                caps.append({
                    "text": w["w"],
                    "startFrame": g_start_scene + w["from"],
                    "endFrame": g_start_scene + max(w["from"] + 2, w["to"]),
                    "highlight": clean(w["w"]) in HIGHLIGHT_WORDS,
                    "voice": voice,
                    "speaker": SPEAKER_LABEL.get(voice, ""),
                    "scene": name,
                })

            voice_events.append((cursor + t, voice, layer_files, name, li, d))
            t += d

        duration = round((t + cfg["post"]) * FPS)
        scenes[name] = {"startFrame": round(cursor * FPS), "durationInFrames": duration}
        lines[name] = rows
        cursor += duration / FPS

    total_frames = round(cursor * FPS)
    print(f"[TIMING] Zhuge Liang TOTAL: {cursor:.2f}s ({total_frames} frames @ {FPS}fps) [LIMIT < 180s]", flush=True)
    assert cursor < 179.0, f"Video exceeded 3-minute YouTube Shorts limit: {cursor:.2f}s!"

    timing = {
        "fps": FPS,
        "tempo": round(tempo, 4),
        "totalDurationSec": round(cursor, 3),
        "totalFrames": total_frames,
        "order": list(scenes.keys()),
        "scenes": scenes,
        "lines": lines,
        "captions": caps,
    }
    (ROOT / "src/zhuge_timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1) + "\n")

    # ==================== MASTER STEREO AUDIO MIX ====================
    n = round(cursor * SR)
    vo = np.zeros((n, 2), np.float32)
    fx = np.zeros((n, 2), np.float32)
    bed = np.zeros((n, 2), np.float32)

    # 1. Place all voices (multi-layer stereo panning for crowds!)
    for g_t, voice, layer_files, sc_name, li, d in voice_events:
        if len(layer_files) > 1:
            pans = [-0.46, 0.0, 0.46]
            offsets = [0.0, 0.07, 0.14]
            for idx, lf in enumerate(layer_files):
                y = load_wav_mono(lf, tempo)
                put_stereo(vo, y, g_t + offsets[idx % len(offsets)], gain=0.62, pan=pans[idx % len(pans)])
        else:
            y = load_wav_mono(layer_files[0], tempo)
            gain = 1.06 if voice in ("zhuge", "simayi", "narator") else 1.0
            put_stereo(vo, y, g_t, gain=gain, pan=SPEAKER_PAN.get(voice, 0.0))

    # Helper for scene global start/end
    def sc_sec(sc_name: str):
        s = scenes[sc_name]
        return s["startFrame"] / FPS, (s["startFrame"] + s["durationInFrames"]) / FPS

    # 2. Scene-by-scene atmospheric score & dramatic SFX!
    # s01_kabar & s02_panik: Urgent approaching drumbeats + tension drone
    s1_a, s1_b = sc_sec("s01_kabar")
    s2_a, s2_b = sc_sec("s02_panik")
    s3_a, s3_b = sc_sec("s03_perintah")
    put_stereo(bed, make_tension_drone(s2_b - s1_a, 65.41, 0.10), s1_a, 1.0, 0.0)
    # Dramatic opening Taiko boom
    put_stereo(fx, make_taiko_hit(74.0, 0.9, 0.42), s1_a + 0.15, 1.0, 0.0)
    # Distant urgent horse gallop & drums when pengintai runs in
    put_stereo(fx, make_cavalry_rumble(3.2, 0.4, 0.8), s1_a + 2.8, 0.35, -0.2)
    # Tension heartbeat pulses during s02_panik
    for k in range(int((s2_b - s2_a) / 0.85)):
        put_stereo(fx, make_taiko_hit(66.0, 0.45, 0.22), s2_a + k * 0.85, 1.0, 0.0)

    # s03_perintah: Calm mysterious low drone + single serene Guqin harmonic when Zhuge speaks!
    put_stereo(bed, make_tension_drone(s3_b - s3_a, 73.42, 0.08), s3_a, 1.0, 0.0)
    put_stereo(bed, make_guqin_note(220.0, 3.2, 0.0, 0.18), s3_a + 0.35, 1.0, 0.15)
    put_stereo(bed, make_guqin_note(293.66, 3.0, -0.5, 0.16), s3_a + 5.0, 1.0, -0.15)

    # s04_gerbang: Giant wooden fortress gates creaking wide open + bamboo broom swishes!
    s4_a, s4_b = sc_sec("s04_gerbang")
    put_stereo(fx, make_gate_creak(1.65), s4_a + 0.08, 1.0, 0.0)
    for k in range(7):
        t_sw = s4_a + 1.55 + k * 0.92
        if t_sw < s4_b - 0.5:
            put_stereo(fx, make_broom_swish(0.52), t_sw, 0.85, (-1) ** k * 0.25)

    # s05_simayi: MASSIVE 150,000 Wei army thunder + Taiko war drums + war horn -> HARD STOP on "BERHENTI!!"
    s5_a, s5_b = sc_sec("s05_simayi")
    # Find exact moment Sima Yi says "BERHENTI!!"
    simayi_stop_sec = s5_a + lines["s05_simayi"][-1]["from"] / FPS
    charge_dur = max(1.0, (simayi_stop_sec + 0.35) - s5_a)
    put_stereo(fx, make_cavalry_rumble(charge_dur, 0.4, 0.18), s5_a, 1.05, 0.0)
    put_stereo(fx, make_war_horn(146.83, 2.2, 0.28), s5_a + 0.15, 1.0, -0.18)
    for k in range(int(charge_dur / 0.52)):
        t_d = s5_a + k * 0.52
        if t_d < simayi_stop_sec:
            put_stereo(fx, make_taiko_hit(84.0 if k % 2 == 0 else 72.0, 0.55, 0.42), t_d, 1.0, (-1) ** k * 0.22)
    # Sharp impact boom RIGHT on "BERHENTI!!" followed by DEAD SILENCE!
    put_stereo(fx, make_taiko_hit(58.0, 0.9, 0.58), simayi_stop_sec, 1.0, 0.0)

    # s06_guqin: CRYSTAL-CLEAR PENTATONIC GUQIN SOLO (the psychological weapon!)
    # D pentatonic: D3=146.83, E3=164.81, G3=196.00, A3=220.00, B3=246.94, D4=293.66, E4=329.63, G4=392.00, A4=440.00
    s6_a, s6_b = sc_sec("s06_guqin")
    s7_a, s7_b = sc_sec("s07_debat")
    guqin_melody = [
        # Opening 2.6s pure solo phrase (unmistakable & hypnotic!)
        (0.10, 293.66, 2.2, 0.0, 0.30, -0.10),
        (0.62, 329.63, 2.0, 0.5, 0.28,  0.12),
        (1.18, 440.00, 2.6, 0.0, 0.32, -0.05),
        (1.78, 392.00, 2.2, -0.5, 0.28, 0.15),
        (2.30, 293.66, 2.8, 0.0, 0.30,  0.00),
        # Continues serenely while Sima Yi whispers in shock!
        (3.35, 220.00, 2.6, 0.0, 0.22, -0.18),
        (4.15, 246.94, 2.4, 0.4, 0.22,  0.18),
        (4.95, 293.66, 2.6, 0.0, 0.24, -0.10),
        (5.80, 329.63, 2.4, 0.0, 0.22,  0.10),
        (6.70, 440.00, 3.0, -0.4, 0.25, 0.00),
        (7.75, 392.00, 2.5, 0.0, 0.22, -0.15),
        (8.65, 293.66, 3.0, 0.0, 0.23,  0.12),
        (9.70, 220.00, 3.0, 0.0, 0.20,  0.00),
    ]
    for off, freq, dur_n, slide, amp_n, pan_n in guqin_melody:
        if s6_a + off < s7_a + 1.0:
            put_stereo(bed, make_guqin_note(freq, dur_n, slide, amp_n), s6_a + off, 1.0, pan_n)

    # s07_debat: Tense low pulse + distant subtle Guqin notes still floating from the tower!
    put_stereo(bed, make_tension_drone(s7_b - s7_a, 73.42, 0.11), s7_a, 1.0, 0.0)
    debat_notes = [293.66, 220.00, 329.63, 293.66, 196.00, 246.94, 293.66, 440.00]
    for k in range(int((s7_b - s7_a) / 1.35)):
        put_stereo(bed, make_guqin_note(debat_notes[k % len(debat_notes)], 2.2, 0.0, 0.15), s7_a + 0.5 + k * 1.35, 1.0, (-1) ** k * 0.22)

    # s08_mundur: Retreat war horn + thundering 150,000 army turning back & fading!
    s8_a, s8_b = sc_sec("s08_mundur")
    retreat_t = s8_a + lines["s08_mundur"][1]["from"] / FPS
    put_stereo(fx, make_taiko_hit(64.0, 0.85, 0.52), s8_a + 0.25, 1.0, 0.0)
    put_stereo(fx, make_war_horn(130.81, 2.8, 0.30), retreat_t - 0.15, 1.0, 0.20)
    put_stereo(fx, make_cavalry_rumble(max(2.5, s8_b - retreat_t + 0.8), 0.3, 1.6), retreat_t, 0.88, 0.0)

    # s09_lega & s10_penutup: Serene victorious Guqin & warm resolution chord!
    s9_a, s9_b = sc_sec("s09_lega")
    s10_a, s10_b = sc_sec("s10_penutup")
    outro_notes = [293.66, 329.63, 440.00, 392.00, 329.63, 293.66, 220.00, 293.66, 392.00, 440.00, 293.66]
    t_out = s9_a + 0.4
    idx_n = 0
    while t_out < s10_b - 1.2:
        put_stereo(bed, make_guqin_note(outro_notes[idx_n % len(outro_notes)], 2.8, 0.0, 0.19), t_out, 1.0, (-1) ** idx_n * 0.20)
        t_out += 1.45
        idx_n += 1
    # Final resonant D3+A3+D4 peaceful chord at the very end
    put_stereo(bed, make_guqin_note(146.83, 3.0, 0.0, 0.20), s10_b - 2.3, 1.0, -0.15)
    put_stereo(bed, make_guqin_note(220.00, 3.0, 0.0, 0.18), s10_b - 2.15, 1.0, 0.15)
    put_stereo(bed, make_guqin_note(293.66, 3.2, 0.0, 0.22), s10_b - 2.0, 1.0, 0.0)

    # Smooth ducking on bed/fx when voices speak (keep Guqin solo in s06_guqin 100% loud!)
    env = uniform_filter1d(np.max(np.abs(vo), axis=1), round(0.12 * SR))
    bed *= np.clip(1.0 - env * 4.5, 0.38, 1.0)[:, None]
    fx *= np.clip(1.0 - env * 3.0, 0.48, 1.0)[:, None]

    mixed = vo + bed + fx
    fade = min(round(1.2 * SR), n // 2)
    mixed[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)[:, None]

    out_dir = ROOT / "out/voice/zhuge"
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_wav = out_dir / "mix_pre_loudnorm.wav"
    with wave.open(str(raw_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(mixed, -0.98, 0.98) * 32767).astype(np.int16).tobytes())

    dest = ROOT / "public/audio/zhuge_master.mp3"
    dest.parent.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-i", str(raw_wav),
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        capture_output=True, text=True, check=True,
    )
    report = json.loads(probe.stderr[probe.stderr.rfind("{"):])
    filt = (
        "loudnorm=I=-14:TP=-1.5:LRA=11:"
        "measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:"
        "measured_thresh={input_thresh}:offset={target_offset}:linear=true"
    ).format(**report)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(raw_wav), "-af", filt, "-ar", "44100", "-b:a", "192k", str(dest)],
        check=True,
    )
    print(f"[MASTER] Wrote {dest} ({dest.stat().st_size / 1024 / 1024:.2f} MB) | I={report['input_i']} -> -14 LUFS", flush=True)


if __name__ == "__main__":
    build()

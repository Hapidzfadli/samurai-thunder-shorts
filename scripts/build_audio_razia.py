"""Studio 2-Act Stereo Soundtrack + 5-Voice Tektokan Mixer for Kos Bu Tini Ep. 4:
'Razia Kamar Kos Mendadak: Riko Sembunyikan Kucing Oren, Eh Bu Tini Malah Rebutan Ngelus!'

Act 1 (Scenes 1-6a): Sneaky Comedy Spy (124 BPM, A minor)
  - Pizzicato strings, woody marimba, woodblock tiptoe, upright bass, comedy brass stabs
Transition (Scene 6):
  - Blanket whoosh -> Vertigo Sparkle Chime -> Cute 'Meeeoow~' -> HARD RECORD SCRATCH!
Act 2 (Scenes 6b-8): Cozy Ukulele-Rhodes Groove (112 BPM, C major)
  - Sunny ukulele strums, warm Fender Rhodes chords, joyful glockenspiel/marimba, cozy bass & groove
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
os.environ["PATH"] = f"{ROOT / '.venv' / 'bin'}:{os.environ.get('PATH', '')}"


def _load_mod(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _ffmpeg_bin() -> str:
    cand = ROOT / ".venv" / "bin" / "ffmpeg"
    if cand.exists():
        return str(cand)
    rem = ROOT / "node_modules" / "@remotion" / "compositor-linux-x64-gnu" / "ffmpeg"
    if rem.exists():
        return str(rem)
    return "ffmpeg"


E = _load_mod("emu_audio", "scripts/build_audio_emu.py")
K = _load_mod("kel_audio", "scripts/build_audio_kelompok.py")
H = _load_mod("horor_audio", "scripts/build_audio_horor.py")

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp
midi_hz = H.midi_hz
_add_mono = H._add_mono

VOICE_JSON = ROOT / "src" / "razia_voice.json"
TIMING_JSON = ROOT / "src" / "razia_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "razia_master.mp3"

# Tight animation tektokan (0.09-0.14s inside scenes); twist has 1.72s dramatic beat for Meow + Record Scratch!
SCENE_CFG = {
    "hook": dict(pre=0.32, post=0.38, gaps=[0.0, 0.12]),
    "alarm": dict(pre=0.34, post=0.34, gaps=[0.0, 0.10]),
    "nyamar": dict(pre=0.28, post=0.40, gaps=[0.0, 0.11]),
    "dobrak": dict(pre=0.46, post=0.34, gaps=[0.0, 0.12]),
    "bocor": dict(pre=0.28, post=0.30, gaps=[0.0, 0.10]),
    "twist": dict(pre=0.26, post=0.38, gaps=[0.0, 1.72]),
    "rebutan": dict(pre=0.28, post=0.42, gaps=[0.0, 0.12, 0.13]),
    "ending": dict(pre=0.30, post=1.45, gaps=[0.0]),
}

LINE_IDS = {
    "hook": ["h1", "h2"],
    "alarm": ["a1", "a2"],
    "nyamar": ["n1", "n2"],
    "dobrak": ["d1", "d2"],
    "bocor": ["b1", "b2"],
    "twist": ["t1", "t2"],
    "rebutan": ["r1", "r2", "r3"],
    "ending": ["e1"],
}

SPEAKER_PAN = {
    "nadia": 0.0,
    "riko": -0.16,
    "bagas": -0.06,
    "ara": 0.18,
    "bu_tini": 0.14,
}

EVENTS = {
    "hook.dilarang": ("hook", 0, "dilarang", -2),
    "hook.tongkol": ("hook", 0, "tongkol", -2),
    "hook.ssst": ("hook", 1, "pelan", -2),
    "hook.koper": ("hook", 1, "koper", -2),
    "alarm.razia": ("alarm", 0, "razia", -2),
    "alarm.pintu": ("alarm", 0, "pintu", -2),
    "alarm.gawat": ("alarm", 1, "gawat", -2),
    "alarm.sapu": ("alarm", 1, "sapu", -2),
    "nyamar.lemari": ("nyamar", 0, "lemari", -2),
    "nyamar.ember": ("nyamar", 0, "ember", -2),
    "nyamar.jenius": ("nyamar", 1, "jenius", -2),
    "nyamar.bantal": ("nyamar", 1, "bantal", -2),
    "dobrak.riko": ("dobrak", 0, "riko", -2),
    "dobrak.tongkol": ("dobrak", 0, "tongkol", -2),
    "dobrak.parfum": ("dobrak", 1, "parfum", -2),
    "dobrak.ancol": ("dobrak", 1, "ancol", -2),
    "bocor.bantal": ("bocor", 0, "bantal", -2),
    "bocor.gerak": ("bocor", 0, "gerak", -2),
    "bocor.ngeong": ("bocor", 0, "ngeong", -2),
    "bocor.tamat": ("bocor", 1, "tamat", -2),
    "twist.aha": ("twist", 0, "aha", -2),
    "twist.tarik": ("twist", 0, "tarik", -2),
    "twist.pull_done": ("twist", 0, "END", 2),
    "twist.meow": ("twist", 0, "END", 13),
    "twist.scratch": ("twist", 0, "END", 35),
    "twist.luluh": ("twist", 1, "START", 0),
    "twist.gemoy": ("twist", 1, "gemoy", -2),
    "rebutan.pindang": ("rebutan", 0, "pindang", -2),
    "rebutan.keluar": ("rebutan", 0, "keluar", -2),
    "rebutan.diusir": ("rebutan", 1, "diusir", -2),
    "rebutan.bebek": ("rebutan", 2, "bebek", -2),
    "ending.vote": ("ending", 0, "vote", -2),
    "ending.boleh": ("ending", 0, "boleh", -2),
}

HIGHLIGHTS = {
    "dilarang", "hewan", "tongkol", "oren", "koper", "razia", "mendadak", "gawat",
    "sapu", "lemari", "ember", "jenius", "bantal", "bulu", "parfum", "ancol",
    "kupingnya", "ngeong", "tamat", "ketangkap", "selimut", "berbinar", "gemoy",
    "pindang", "keluar", "diusir", "bebek", "boleh", "keras", "vote", "komen",
}


# ==============================================================================
# CUSTOM INSTRUMENTS FOR EP. 4 (SPY ACT 1 + COZY UKULELE-RHODES ACT 2)
# ==============================================================================
def inst_woodblock(freq: float = 920.0, dur: float = 0.09, seed: int = 1) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    tone = (
        np.sin(2 * np.pi * freq * t) * np.exp(-t * 48.0)
        + 0.42 * np.sin(2 * np.pi * freq * 1.62 * t) * np.exp(-t * 68.0)
    )
    click = bp(nz(n, seed), 1800, 5200) * np.exp(-t * 140.0) * 0.25
    return norm((tone + click).astype(np.float32), 0.78)


def inst_brass_stab(midis: list[float], dur: float = 0.28) -> np.ndarray:
    """Punchy comedic spy-movie brass chord stab (muted horn/trombone hit)."""
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros(n, np.float32)
    for m in midis:
        f = midi_hz(m)
        # Slight upward pitch scoop at attack for jazz-spy punch
        f_inst = f * (1.0 - 0.035 * np.exp(-t * 45.0))
        ph = 2 * np.pi * np.cumsum(f_inst) / SR
        s = (
            0.52 * np.sin(ph)
            + 0.44 * np.sin(2 * ph)
            + 0.34 * np.sin(3 * ph)
            + 0.22 * np.sin(4 * ph)
            + 0.14 * np.sin(5 * ph)
            + 0.08 * np.sin(6 * ph)
        )
        out += s.astype(np.float32) / len(midis)
    env = np.minimum(1.0, t / 0.014) * np.exp(-t * 5.8) * np.minimum(1.0, (dur - t) / 0.035)
    return lp(np.tanh(out * 1.4) * env, 2900).astype(np.float32)


def inst_ukulele_chord(midis: list[float], dur: float = 0.42, up: bool = False, seed: int = 7) -> np.ndarray:
    """Bright sunny Hawaiian/indie nylon ukulele strum (re-entrant sparkle)."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    notes = list(reversed(midis)) if up else list(midis)
    for idx, m in enumerate(notes):
        i0 = int(idx * 0.011 * SR)
        if i0 >= n:
            continue
        ts = t[: n - i0]
        f = midi_hz(m)
        s = (
            1.00 * np.sin(2 * np.pi * f * ts)
            + 0.42 * np.sin(4 * np.pi * f * ts) * np.exp(-ts * 7.5)
            + 0.20 * np.sin(6 * np.pi * f * ts) * np.exp(-ts * 12.0)
            + 0.08 * np.sin(8 * np.pi * f * ts) * np.exp(-ts * 18.0)
        ) * np.minimum(1.0, ts / 0.003) * np.exp(-ts * 5.4)
        out[i0:] += s.astype(np.float32) / len(notes)
    pick = bp(nz(n, seed), 2600, 7800) * np.exp(-t * 65.0) * 0.16
    return lp(out + pick, 5200).astype(np.float32)


def inst_glockenspiel(midi: float, dur: float = 0.65) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_hz(midi)
    sig = (
        1.00 * np.sin(2 * np.pi * f * t) * np.exp(-t * 4.8)
        + 0.28 * np.sin(2 * np.pi * 2.756 * f * t) * np.exp(-t * 14.0)
        + 0.10 * np.sin(2 * np.pi * 5.404 * f * t) * np.exp(-t * 28.0)
    )
    env = np.minimum(1.0, t / 0.0025) * np.minimum(1.0, (dur - t) / 0.04)
    return (sig * env).astype(np.float32)


# ==============================================================================
# CUSTOM COMEDY & KUCING OREN SFX
# ==============================================================================
def sfx_cute_meow(dur: float = 0.68, f_base: float = 610.0, seed: int = 10) -> np.ndarray:
    """Adorable expressive kitten 'Meeeoow~' with vowel formant glide (ee -> aa -> oo)."""
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    u = t / dur
    # Pitch contour: gentle lift -> sweet peak -> melting downward glide + kitten vibrato
    pitch_curve = (
        0.86
        + 0.42 * np.sin(np.pi * np.clip(u / 0.65, 0, 1))
        - 0.26 * np.clip((u - 0.52) / 0.48, 0, 1) ** 1.3
        + 0.025 * np.sin(2 * np.pi * 7.5 * t)
    )
    f0 = f_base * pitch_curve
    ph = 2 * np.pi * np.cumsum(f0) / SR
    # Harmonic vocal source
    src = (
        1.00 * np.sin(ph)
        + 0.68 * np.sin(2 * ph)
        + 0.45 * np.sin(3 * ph)
        + 0.28 * np.sin(4 * ph)
        + 0.16 * np.sin(5 * ph)
        + 0.09 * np.sin(6 * ph)
    )
    # Time-varying formant blend: bright 'ee' early, open 'aa' mid, warm 'oo' tail
    w_ee = np.clip(1.0 - u * 2.6, 0, 1)
    w_aa = np.exp(-((u - 0.42) / 0.22) ** 2)
    w_oo = np.clip((u - 0.55) / 0.45, 0, 1)
    y_ee = bp(src, 1400, 3200) * 0.7 + bp(src, 450, 950) * 0.5
    y_aa = bp(src, 900, 2100) * 0.9 + bp(src, 550, 1200) * 0.5
    y_oo = lp(src, 1150) * 0.9
    voice = y_ee * w_ee + y_aa * w_aa + y_oo * w_oo + lp(src, 900) * 0.35
    breath = bp(nz(n, seed), 1800, 4800) * 0.08
    env = np.minimum(1.0, t / 0.055) * np.minimum(1.0, (dur - t) / 0.14) ** 1.15
    return norm(lp(((voice + breath) * env).astype(np.float32), 4200), 0.88)


def sfx_cat_purr(dur: float = 1.6, seed: int = 19) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 26.0 * t)
    breath = 0.72 + 0.28 * np.sin(2 * np.pi * 0.75 * t)
    rumble = lp(nz(n, seed), 240) * 1.4 + np.sin(2 * np.pi * 52.0 * t) * 0.25
    env = np.minimum(1.0, t / 0.15) * np.minimum(1.0, (dur - t) / 0.25)
    return norm((rumble * mod * breath * env).astype(np.float32), 0.45)


def sfx_door_dobrak(seed: int = 41) -> np.ndarray:
    """Dramatic wooden door slam/dobrak + rattling latch."""
    n = int(SR * 0.65)
    t = np.arange(n, dtype=np.float32) / SR
    f = 42.0 + 135.0 * np.exp(-t * 36.0)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11.0)
    crack = bp(nz(n, seed), 320, 2600) * np.exp(-t * 28.0) * 0.95
    rattle = bp(nz(n, seed + 1), 900, 4200) * np.exp(-((t - 0.16) / 0.045) ** 2) * 0.32
    return norm((boom + crack + rattle).astype(np.float32), 0.95)


def sfx_wood_creak(dur: float = 0.42, seed: int = 31) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    freq = 280 + 190 * np.sin(2 * np.pi * 1.7 * t) + 75 * np.sin(2 * np.pi * 24 * t)
    raw = np.sin(2 * np.pi * np.cumsum(freq) / SR)
    grit = bp(nz(n, seed), 600, 2400) * 0.3
    env = np.sin(np.pi * t / dur) ** 0.7
    return norm(bp(((raw * 0.7 + grit) * env).astype(np.float32), 260, 2200), 0.68)


def sfx_bucket_clank(seed: int = 33) -> np.ndarray:
    n = int(SR * 0.26)
    t = np.arange(n, dtype=np.float32) / SR
    body = (
        np.sin(2 * np.pi * 265 * t) * np.exp(-t * 26)
        + 0.6 * np.sin(2 * np.pi * 430 * t) * np.exp(-t * 32)
        + 0.35 * np.sin(2 * np.pi * 780 * t) * np.exp(-t * 42)
    )
    hit = bp(nz(n, seed), 600, 3200) * np.exp(-t * 60) * 0.4
    return norm((body + hit).astype(np.float32), 0.72)


def sfx_duck_quack(seed: int = 77) -> np.ndarray:
    """Hilarious double cartoon duck 'kwek-kwek!' for Mbak Ara's punchline."""
    out = np.zeros(int(SR * 0.56), np.float32)
    for start_s, dur_s, f0 in [(0.02, 0.19, 340.0), (0.26, 0.22, 315.0)]:
        n = int(SR * dur_s)
        t = np.arange(n, dtype=np.float32) / SR
        f = f0 * (1.08 - 0.32 * (t / dur_s))
        ph = 2 * np.pi * np.cumsum(f) / SR
        nasal = sum((1.0 / (k ** 0.7)) * np.sin(k * ph) for k in range(1, 9))
        q = bp(nasal.astype(np.float32), 750, 2400) * np.sin(np.pi * t / dur_s) ** 0.85
        j = int(start_s * SR)
        out[j : j + n] += q
    return norm(out, 0.84)


def sfx_sparkle_gliss(dur: float = 0.72) -> np.ndarray:
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    notes = [72, 76, 79, 84, 88, 91, 96]
    for i, m in enumerate(notes):
        g = inst_glockenspiel(m, 0.42)
        i0 = int(i * 0.065 * SR)
        k = min(len(g), n - i0)
        if k > 0:
            out[i0 : i0 + k] += g[:k] * 0.42
    return norm(out, 0.78)


def sfx_broom_drop(seed: int = 62) -> np.ndarray:
    n = int(SR * 0.48)
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros(n, np.float32)
    for hit_t, amp, fc in [(0.04, 1.0, 420), (0.17, 0.55, 510), (0.28, 0.30, 580)]:
        dt = np.maximum(0.0, t - hit_t)
        m = (t >= hit_t).astype(np.float32)
        cl = (np.sin(2 * np.pi * fc * dt) * np.exp(-dt * 42) + bp(nz(n, seed), 700, 3400) * np.exp(-dt * 55) * 0.4) * m
        out += cl * amp
    return norm(out, 0.74)


# ==============================================================================
# 2-ACT ORIGINAL STEREO SOUNDTRACK BUILDER
# ==============================================================================
def build_razia_score(total: float, t_alarm: float, t_dobrak: float, t_scratch: float, t_end: float) -> np.ndarray:
    n_tot = int(SR * total) + SR
    mus = np.zeros((n_tot, 2), np.float32)

    kick = H.drum_kick()
    rim = H.drum_rim(12)
    wb_hi = inst_woodblock(1040.0, 0.08, 1)
    wb_lo = inst_woodblock(760.0, 0.08, 2)

    # ------------------------------------------------------------------
    # ACT 1: SNEAKY COMEDY SPY (124 BPM, A MINOR) -> stops HARD at t_scratch!
    # ------------------------------------------------------------------
    beat1 = 60.0 / 124.0  # 0.48387s
    stop1 = max(1.0, t_scratch - 0.04)

    # 4-bar sneaky Am spy progression: Am -> Am/G# -> Am/G -> F7 -> E7
    spy_bars = [
        # (bass_root, bass_walk, pizz_8th_notes, marimba_8th_notes, stab_chord)
        (45, [45, 52, 48, 52], [69, None, 71, 72, None, 71, 69, None], [None, None, 81, None, 79, None, 76, None], [57, 60, 64]),
        (44, [44, 52, 47, 52], [68, None, 71, 72, None, 71, 68, None], [None, 76, None, 80, None, 79, None, None], [56, 59, 64]),
        (43, [43, 50, 47, 50], [67, None, 69, 71, None, 69, 67, None], [79, None, 76, None, 74, None, 71, None], [55, 59, 62]),
        (41, [41, 45, 40, 44], [65, None, 64, None, 68, 71, 64, None], [None, 77, None, 76, None, None, 80, None], [53, 57, 60, 63]),
    ]

    bar = 0
    while True:
        bar_t = bar * 4.0 * beat1
        if bar_t >= stop1:
            break
        _root, bwalk, pizz_pat, mar_pat, chord = spy_bars[bar % 4]
        intense = 1.0 if bar_t >= t_alarm - 0.5 else 0.78

        # Stealth pizzicato bass on quarter beats
        for b, bn in enumerate(bwalk):
            bt = bar_t + b * beat1
            if bt < stop1:
                _add_mono(mus, H.inst_bass(bn, 0.36), bt, 0.38 * intense, -0.08)

        # Tiptoe pizzicato melody (8th notes)
        for st, note in enumerate(pizz_pat):
            nt = bar_t + st * 0.5 * beat1
            if note is not None and nt < stop1:
                _add_mono(mus, H.inst_pizzicato(note, 0.32, bar * 13 + st), nt, 0.30 * intense, -0.26 + 0.52 * (st % 2))

        # Playful woody marimba counter-hook
        for st, note in enumerate(mar_pat):
            nt = bar_t + st * 0.5 * beat1
            if note is not None and nt < stop1:
                _add_mono(mus, H.inst_marimba(note, 0.30), nt, 0.24 * intense, 0.28 * np.sin(bar + st))

        # Sneaky woodblock tiptoe + soft brush groove
        for b in range(4):
            bt = bar_t + b * beat1
            if bt >= stop1:
                break
            _add_mono(mus, wb_hi if b % 2 == 0 else wb_lo, bt, 0.22 * intense, -0.32 if b % 2 == 0 else 0.32)
            if b in (1, 3) and bt + 0.5 * beat1 < stop1:
                _add_mono(mus, wb_lo, bt + 0.5 * beat1, 0.14 * intense, 0.18)
            _add_mono(mus, H.drum_shaker(bar * 19 + b, b == 3), bt + 0.5 * beat1, 0.12 * intense, -0.22)
            if b in (0, 2) and bar_t >= t_alarm - 0.5:
                _add_mono(mus, kick, bt, 0.26, 0.0)

        # Comedy brass stabs on tension accents (bar 3 beat 4, or during alarm/dobrak!)
        if bar % 4 == 3 or (bar % 2 == 0 and bar_t >= t_alarm - 0.2):
            st_t = bar_t + (3.0 if bar % 4 == 3 else 0.0) * beat1
            if st_t < stop1:
                _add_mono(mus, inst_brass_stab(chord, 0.28), st_t, 0.25 if bar_t >= t_alarm else 0.18, 0.18)
        bar += 1

    # Extra dramatic spy brass hits right at Alarm & Dobrak!
    if t_alarm < stop1:
        _add_mono(mus, inst_brass_stab([57, 60, 64, 69], 0.42), t_alarm + 0.05, 0.38, 0.0)
    if t_dobrak < stop1:
        _add_mono(mus, inst_brass_stab([52, 56, 59, 64], 0.45), t_dobrak + 0.08, 0.42, 0.0)

    # Hard brake fade (35ms) right at record scratch so silence punches!
    i_stop = int(stop1 * SR)
    i_fade = int(0.035 * SR)
    if i_stop < len(mus):
        mus[max(0, i_stop - i_fade) : i_stop] *= np.linspace(1.0, 0.0, min(i_fade, i_stop))[:, None]
        mus[i_stop:] = 0.0

    # ------------------------------------------------------------------
    # ACT 2: COZY UKULELE-RHODES GROOVE (112 BPM, C MAJOR!)
    # ------------------------------------------------------------------
    act2_start = t_scratch + 0.34
    beat2 = 60.0 / 112.0  # 0.5357s
    # 8-bar cozy sunny C-major progression: Cmaj7, Am7, Dm7, G9, Cmaj7, A7, Dm7, G13
    act2_chords = [
        (48, [60, 64, 67, 71], [67, 72, 76, 81]),  # Cmaj7 (bass, rhodes, uke)
        (45, [57, 60, 64, 67], [69, 72, 76, 79]),  # Am7
        (50, [57, 60, 62, 65], [69, 72, 74, 77]),  # Dm7
        (43, [55, 59, 62, 65], [67, 71, 74, 79]),  # G9
        (48, [60, 64, 67, 71], [67, 72, 76, 81]),  # Cmaj7
        (45, [57, 61, 64, 67], [69, 73, 76, 79]),  # A7
        (50, [57, 60, 62, 65], [69, 72, 74, 77]),  # Dm7
        (43, [55, 59, 64, 69], [67, 71, 76, 79]),  # G13
    ]
    # Adorable bouncy glockenspiel/marimba melody (8 eighth steps per bar)
    act2_mel = [
        [76, None, 79, None, 84, 83, 79, None],   # E - G - C5 B G
        [72, None, 76, 79, 81, None, 76, None],   # C - E G A - E
        [77, None, 76, 74, 72, None, 74, 76],     # F - E D C - D E
        [74, None, 79, None, 71, None, None, None],  # D - G - B
        [76, 79, 81, None, 84, None, 83, 79],     # E G A - C5 - B G
        [79, None, 81, None, 76, None, 73, None], # G - A - E - C#
        [74, None, 77, 76, 74, 72, 71, None],     # D - F E D C B
        [74, 76, 79, None, 83, None, 84, None],   # D E G - B - C5
    ]

    bar = 0
    while True:
        bar_t = act2_start + bar * 4.0 * beat2
        if bar_t >= total - 0.5:
            break
        root, rh_chord, uke_chord = act2_chords[bar % 8]
        mel = act2_mel[bar % 8]

        # Warm Fender Rhodes pad chord (left-warm stereo spread)
        for ci, cn in enumerate(rh_chord):
            _add_mono(mus, H.inst_rhodes(cn, 3.8 * beat2), bar_t + ci * 0.012, 0.145, -0.34 + ci * 0.10)

        # Sunny Ukulele island-groove strums: D - D U - U D U
        for b_off, is_up, g_u in [(0.0, False, 0.22), (1.0, False, 0.18), (1.5, True, 0.21), (2.5, True, 0.20), (3.0, False, 0.18), (3.5, True, 0.22)]:
            ut = bar_t + b_off * beat2
            if ut < total - 0.35:
                _add_mono(mus, inst_ukulele_chord(uke_chord, 0.42, is_up, bar * 23 + int(b_off * 10)), ut, g_u, 0.34)

        # Cozy bouncy bassline
        for b_off, b_note in [(0.0, root), (1.5, root + 7), (2.0, root + 5), (3.0, root + 7), (3.5, root + 4)]:
            bt = bar_t + b_off * beat2
            if bt < total - 0.35:
                _add_mono(mus, H.inst_bass(b_note, 0.45), bt, 0.40, -0.04)

        # Light cozy acoustic percussion
        for b in range(4):
            bt = bar_t + b * beat2
            if bt >= total - 0.35:
                break
            if b == 0:
                _add_mono(mus, kick, bt, 0.34, 0.0)
            if b == 2 and bt + 0.5 * beat2 < total - 0.35:
                _add_mono(mus, kick, bt + 0.5 * beat2, 0.26, 0.0)
            if b in (1, 3):
                _add_mono(mus, rim, bt, 0.26, 0.08)
            _add_mono(mus, H.drum_shaker(bar * 37 + b * 2, False), bt, 0.14, -0.25)
            if bt + 0.55 * beat2 < total - 0.35:
                _add_mono(mus, H.drum_shaker(bar * 37 + b * 2 + 1, b == 3), bt + 0.55 * beat2, 0.12, 0.25)

        # Cute glockenspiel + marimba melody
        mel_g = 0.20 if bar_t < t_end else 0.24
        for st, note in enumerate(mel):
            if note is None:
                continue
            nt = bar_t + st * 0.5 * beat2
            if nt < total - 0.45:
                _add_mono(mus, H.inst_marimba(note, 0.40), nt, mel_g, 0.16 * np.cos(bar + st * 0.7))
                if st in (0, 4):
                    _add_mono(mus, inst_glockenspiel(note + 12, 0.52), nt, mel_g * 0.48, -0.18)
        bar += 1

    # Warm final Cmaj9 resolution chord!
    end_t = max(act2_start + 1.0, total - 1.35)
    for ci, cn in enumerate([60, 64, 67, 71, 74, 79]):
        _add_mono(mus, H.inst_rhodes(cn, 1.3), end_t + ci * 0.032, 0.16, -0.35 + ci * 0.14)
    _add_mono(mus, inst_ukulele_chord([67, 72, 76, 81], 0.95, False, 99), end_t + 0.06, 0.28, 0.25)

    mus = H.stereo_room_reverb(mus, wet=0.25)
    pk = np.max(np.abs(mus)) + 1e-6
    return (mus / pk * 0.78).astype(np.float32)


def build_captions(words_global: list[dict]) -> list[dict]:
    cues = []
    i = 0
    while i < len(words_global):
        w1 = words_global[i]
        if (
            i + 1 < len(words_global)
            and words_global[i + 1]["speaker"] == w1["speaker"]
            and words_global[i + 1]["from"] - w1["to"] <= 6
            and len(w1["w"]) + len(words_global[i + 1]["w"]) <= 12
            and not w1["w"].endswith((".", "!", "?", ","))
        ):
            w2 = words_global[i + 1]
            txt = f"{w1['w']} {w2['w']}"
            sf, ef = w1["from"], max(w1["from"] + 2, w2["to"])
            i += 2
        else:
            txt = w1["w"]
            sf, ef = w1["from"], max(w1["from"] + 2, w1["to"])
            i += 1
        clean = txt.lower().strip(".,?!;:\"'")
        is_hl = any(hw in clean for hw in HIGHLIGHTS)
        cues.append({
            "text": txt,
            "speaker": w1["speaker"],
            "startFrame": sf,
            "endFrame": ef,
            "highlight": is_hl,
        })
    return cues


def main():
    V = json.loads(VOICE_JSON.read_text(encoding="utf-8"))
    order = [s["scene"] for s in V["scenes"]]
    scenes_meta = {}
    lines_by_id = {}
    lines_by_scene = {}
    all_words_global = []
    clips = []
    cur = 0.0

    for sc in V["scenes"]:
        name = sc["scene"]
        cfg = SCENE_CFG[name]
        start = cur
        t = cfg["pre"]
        sc_lines = []
        ids = LINE_IDS[name]
        for i, ln in enumerate(sc["lines"]):
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.12
            speaker = ln.get("speaker", "nadia")
            y = E.load_wav(ROOT / ln["file"])
            rms = float(np.sqrt(np.mean(y ** 2)) + 1e-6)
            y = np.clip(y * (0.175 / rms), -0.96, 0.96).astype(np.float32)
            d = len(y) / SR
            aligned = E.align_script(ln["text"], ln["wordsSec"], d)
            words_local = [
                {"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))}
                for w, a, b in aligned
            ]
            words_glob = [
                {"w": w, "speaker": speaker, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))}
                for w, a, b in aligned
            ]
            all_words_global.extend(words_glob)
            entry = {
                "scene": name,
                "speaker": speaker,
                "emotion": ln["style"],
                "text": ln["text"],
                "startSec": round(start + t, 3),
                "endSec": round(start + t + d, 3),
                "from": int(round(t * FPS)),
                "to": int(round((t + d) * FPS)),
                "globalFrom": int(round((start + t) * FPS)),
                "globalTo": int(round((start + t + d) * FPS)),
                "words": words_local,
            }
            sc_lines.append(entry)
            if i < len(ids):
                lines_by_id[ids[i]] = {k: v for k, v in entry.items() if k != "words"}
            clips.append((start + t, y, speaker))
            t += d
        t += cfg["post"]
        dur_f = int(round(t * FPS))
        start_f = int(round(start * FPS))
        end_s = start + dur_f / FPS
        scenes_meta[name] = {
            "startSec": round(start, 3),
            "endSec": round(end_s, 3),
            "startFrame": start_f,
            "durationInFrames": dur_f,
        }
        lines_by_scene[name] = sc_lines
        cur = end_s

    total = cur
    total_frames = int(round(total * FPS))

    def ev_frame(scene, li, word, off):
        ln = lines_by_scene[scene][li]
        if word == "START":
            return max(0, ln["from"] + off)
        if word == "END":
            return max(0, ln["to"] + off)
        key = E.norm_word(word)
        for w in ln["words"]:
            if E.norm_word(w["w"]).startswith(key):
                return max(0, w["from"] + off)
        print(f"  ! kata '{word}' tidak ditemukan di {scene}[{li}]")
        return max(0, ln["from"] + off)

    events_local = {ev_name: ev_frame(sc, li, w, off) for ev_name, (sc, li, w, off) in EVENTS.items()}
    captions = build_captions(all_words_global)
    timing = {
        "fps": FPS,
        "totalDurationSec": round(total, 3),
        "totalFrames": total_frames,
        "order": order,
        "scenes": scenes_meta,
        "lines": lines_by_id,
        "events": events_local,
        "captions": captions,
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=2, ensure_ascii=False), encoding="utf-8")

    S = {k: v["startFrame"] / FPS for k, v in scenes_meta.items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in events_local.items()}

    print(f"Total {total:.2f}s ({total_frames} frames)")
    for k in order:
        print(f"  {k:10s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    T_LAUGH = ROOT / "exports" / "riset" / "tawa"

    # Place 5-character dialogue cleanly in stereo field
    for t0, y, speaker in clips:
        put(vo, y, t0, 1.0, SPEAKER_PAN.get(speaker, 0.0))

    # Crisp swooshes on scene cuts
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.28, abs(hash(k)) % 50 + 17), max(0.0, S[k] - 0.14), 0.24)

    # 1. HOOK — sign bang + fish plate set + Oren happy purr & tiny meow
    put(sfx, E.sfx_thump(11, 78), EV["hook.dilarang"], 0.42, 0.1)
    put(sfx, E.sfx_paper(12), EV["hook.tongkol"], 0.35, -0.2)
    put(sfx, sfx_cat_purr(1.5, 13), EV["hook.ssst"], 0.38, -0.15)
    put(sfx, sfx_cute_meow(0.42, 650.0, 14), EV["hook.koper"] + 0.35, 0.48, -0.1)

    # 2. ALARM — corridor marching footsteps + broom thump + Riko panic boing
    put(sfx, E.sfx_thump(21, 68), S["alarm"] + 0.15, 0.50, 0.25)
    put(sfx, E.sfx_thump(22, 72), S["alarm"] + 0.55, 0.54, 0.20)
    put(sfx, E.sfx_thump(23, 76), S["alarm"] + 0.95, 0.58, 0.15)
    put(sfx, E.sfx_boing(320, 0.32), EV["alarm.gawat"] - 0.03, 0.54, -0.22)
    put(sfx, E.sfx_swoosh(0.35, 24), EV["alarm.sapu"], 0.48, 0.25)

    # 3. NYAMAR — wardrobe creak/slam + bucket clank + lightbulb ding + pillow poof
    put(sfx, sfx_wood_creak(0.38, 31), EV["nyamar.lemari"], 0.60, -0.3)
    put(sfx, E.sfx_thump(32, 90), EV["nyamar.lemari"] + 0.55, 0.48, -0.25)
    put(sfx, sfx_bucket_clank(33), EV["nyamar.ember"], 0.62, 0.25)
    put(sfx, K.sfx_notif(), EV["nyamar.jenius"], 0.56, -0.05)
    put(sfx, E.sfx_swoosh(0.30, 35), EV["nyamar.bantal"], 0.48, 0.0)

    # 4. DOBRAK — HUGE DOOR SLAM + sniff + Ancol comic boing
    put(sfx, sfx_door_dobrak(41), S["dobrak"] + 0.08, 0.95, 0.22)
    put(sfx, E.sfx_swoosh(0.28, 42), EV["dobrak.tongkol"], 0.36, 0.18)
    put(sfx, E.sfx_boing(380, 0.30), EV["dobrak.ancol"] - 0.02, 0.50, -0.18)

    # 5. BOCOR — sneaky pillow meow + Riko shock thump
    put(sfx, sfx_cute_meow(0.40, 700.0, 51), EV["bocor.gerak"] + 0.25, 0.62, -0.22)
    put(sfx, E.sfx_boing(260, 0.34), EV["bocor.ngeong"], 0.44, 0.16)
    put(sfx, E.sfx_thump(53, 62), EV["bocor.tamat"] - 0.04, 0.62, -0.18)

    # 6. TWIST — blanket pull whoosh -> Sparkle Gliss -> Hero 'Meeeoow~' -> HARD RECORD SCRATCH -> broom drops!
    put(sfx, E.sfx_swoosh(0.40, 61), EV["twist.pull_done"], 0.72, 0.05)
    put(sfx, sfx_sparkle_gliss(0.75), EV["twist.meow"] - 0.10, 0.72, 0.0)
    put(sfx, sfx_cute_meow(0.72, 620.0, 62), EV["twist.meow"], 0.92, 0.0)
    put(sfx, H.sfx_record_scratch(63), EV["twist.scratch"], 0.92, 0.0)
    put(sfx, sfx_broom_drop(64), EV["twist.luluh"] + 0.15, 0.62, 0.22)

    # 7. REBUTAN — warm purr + scoot swoosh + hilarious DUCK QUACK on 'bebek'!
    put(sfx, sfx_cat_purr(2.0, 71), S["rebutan"] + 0.30, 0.42, 0.10)
    put(sfx, sfx_sparkle_gliss(0.55), EV["rebutan.pindang"], 0.46, 0.15)
    put(sfx, E.sfx_swoosh(0.32, 72), EV["rebutan.keluar"], 0.48, -0.20)
    put(sfx, E.sfx_boing(310, 0.30), EV["rebutan.diusir"], 0.44, -0.12)
    put(sfx, sfx_duck_quack(77), EV["rebutan.bebek"] + 0.32, 0.85, 0.24)

    # 8. ENDING — happy cat meow + soft laughter + celebratory chime!
    put(sfx, sfx_cute_meow(0.46, 640.0, 81), S["ending"] + 0.18, 0.48, 0.12)
    put(sfx, E.sfx_fanfare(), EV["ending.vote"] + 0.15, 0.34, 0.0)
    if (T_LAUGH / "tawa_istana_ramai.mp3").exists():
        tmp_l = OUT_MP3.with_suffix(".laugh.wav")
        subprocess.run(
            [_ffmpeg_bin(), "-y", "-v", "error", "-i", str(T_LAUGH / "tawa_istana_ramai.mp3"), "-ac", "1", "-ar", str(SR), str(tmp_l)],
            check=True,
        )
        with wave.open(str(tmp_l), "rb") as wf:
            y_l = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768.0
        tmp_l.unlink(missing_ok=True)
        if len(y_l) > 0:
            put(sfx, norm(y_l, 0.22)[: int(SR * 1.4)], S["ending"] + 0.05, 0.22, 0.0)

    # Build 2-Act Original Stereo Soundtrack
    mus = build_razia_score(total, S["alarm"], S["dobrak"], EV["twist.scratch"], S["ending"])

    # Clean broadcast-grade dynamic ducking
    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = (
        mus[:N] * 0.50 * (1.0 / (1.0 + 4.8 * env))[:, None]
        + sfx * (1.0 / (1.0 + 1.15 * env))[:, None]
        + vo * 1.18
    )
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.05) * np.clip((total - tt) / 0.65, 0.0, 1.0))[:, None]
    master = np.tanh(master / (np.max(np.abs(master)) + 1e-6) * 1.45) / np.tanh(1.45) * 0.92
    master = master[: int(SR * total)]

    wav = OUT_MP3.with_suffix(".wav")
    OUT_MP3.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(master, -1.0, 1.0) * 32767).astype(np.int16).tobytes())
    subprocess.run(
        [
            _ffmpeg_bin(), "-y", "-v", "error", "-i", str(wav),
            "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
            "-ar", "44100", "-b:a", "192k",
            str(OUT_MP3),
        ],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(f"Selesai Ep. 4 master audio: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()

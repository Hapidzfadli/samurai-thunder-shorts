"""Mix audio + soundtrack studio 2-babak + jadwal dialog multi-karakter Kos Bu Tini Ep. 3 v2:
"Niat Uji Nyali di Rumah Kosong, Malah Hantunya Curhat & Minta Gorengan!"

Fitur v2:
  - 5 Suara Karakter Berbeda (VoxCPM2 + Whisper alignment):
      narator, riko, bagas, pocong (+ gema horor khusus saat muncul), kunti (suara wanita asli!)
  - Soundtrack Stereo Multi-Instrumen Orisinal (2 Babak):
      * Babak 1 (0:00 -> tawar): Spooky-Playful Mystery 112 BPM (D minor) — Pizzicato Strings,
        Celesta Music-Box, Upright Bass, Woodblock Tiptoe & Suspense Swell saat Penampakan Ganda!
      * Transisi: Hard Vinyl Record Scratch saat Bagas menyela!
      * Babak 2 (tawar -> ending): Warm Upbeat Acoustic-Jazz / Lo-Fi Nongkrong 114 BPM (F Major) —
        Rhodes Electric Piano, Acoustic Guitar Strum, Groovy Walking Bass, Catchy Marimba Melody,
        Crisp Rimshot/Shaker Swing Beat + Studio Stereo Room Reverb!
  - Stereo Voice Spatial Panning + Dynamic Ducking + Loudnorm -14 LUFS.
"""
import importlib.util
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent


def _load_mod(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


E = _load_mod("emu_audio", "scripts/build_audio_emu.py")
K = _load_mod("kel_audio", "scripts/build_audio_kelompok.py")
AWAN = _load_mod("awan_audio", "scripts/build_audio_awan.py")

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "horor_voice.json"
TIMING_JSON = ROOT / "src" / "horor_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "horor_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.35, post=0.45, gaps=[0.0, 0.22, 0.22]),
    "masuk": dict(pre=0.35, post=0.45, gaps=[0.0, 0.24]),
    "muncul": dict(pre=0.45, post=0.50, gaps=[0.0, 0.20]),
    "tawar": dict(pre=0.32, post=0.45, gaps=[0.0, 0.24, 0.22]),
    "curhat": dict(pre=0.35, post=0.45, gaps=[0.0, 0.22, 0.22]),
    "viral": dict(pre=0.32, post=0.50, gaps=[0.0, 0.24]),
    "foto": dict(pre=0.35, post=0.55, gaps=[0.0, 0.24]),
    "ending": dict(pre=0.35, post=1.65, gaps=[0.0]),
}

LINE_IDS = {
    "hook": ["h1", "h2", "h3"],
    "masuk": ["m1", "m2"],
    "muncul": ["u1", "u2"],
    "tawar": ["t1", "t2", "t3"],
    "curhat": ["c1", "c2", "c3"],
    "viral": ["v1", "v2"],
    "foto": ["f1", "f2"],
    "ending": ["e1"],
}

SPEAKER_PAN = {
    "narator": 0.0,
    "riko": -0.15,
    "bagas": 0.12,
    "pocong": -0.16,
    "kunti": 0.18,
}

EVENTS = {
    "hook.nyali": ("hook", 0, "nyali", -2),
    "hook.apaan": ("hook", 1, "bawa", -2),
    "hook.goreng": ("hook", 2, "pisang", -2),
    "masuk.senter": ("masuk", 0, "senter", -2),
    "masuk.berkedip": ("masuk", 0, "berkedip", -2),
    "masuk.menyan": ("masuk", 1, "menyan", -2),
    "muncul.masuk": ("muncul", 0, "berani", -8),
    "muncul.lari": ("muncul", 0, "lari", -2),
    "muncul.ampun": ("muncul", 1, "ampun", -2),
    "muncul.kaku": ("muncul", 1, "kaku", -2),
    "tawar.seram": ("tawar", 0, "eits", -2),
    "tawar.pisang": ("tawar", 0, "pisang", -2),
    "tawar.kopi": ("tawar", 0, "kopi", -2),
    "tawar.pocong": ("tawar", 1, "sebentar", -2),
    "tawar.kunti": ("tawar", 2, "tahu", -2),
    "curhat.lembur": ("curhat", 0, "lembur", -2),
    "curhat.pegal": ("curhat", 1, "pegal", -2),
    "curhat.melompat": ("curhat", 1, "melompat", -2),
    "curhat.bagas": ("curhat", 2, "istirahat", -2),
    "viral.waduh": ("viral", 0, "waduh", -2),
    "viral.ribuan": ("viral", 0, "ribuan", -2),
    "viral.halo": ("viral", 1, "halo", -2),
    "viral.gorengan": ("viral", 1, "gorengan", -2),
    "foto.bakwan": ("foto", 0, "bakwan", -2),
    "foto.cekrek": ("foto", 1, "cekrek", -2),
    "ending.kabur": ("ending", 0, "kabur", -2),
    "ending.komentar": ("ending", 0, "komentar", -2),
}

HIGHLIGHTS = {
    "jumat", "uji", "nyali", "angker", "pisang", "goreng", "kopi", "senter",
    "berkedip", "beringin", "berani", "ampun", "pocong", "kunti", "kaku",
    "eits", "renyah", "tahu", "aroma", "capek", "lembur", "pegal", "melompat",
    "istirahat", "waduh", "langsung", "ribuan", "halo", "gorengan", "foto",
    "bakwan", "rawit", "cekrek", "kabur", "ngopi", "komentar",
}


# ==============================================================================
# STUDIO INSTRUMENT SYNTHESIS FOR CINEMATIC 2-ACT SOUNDTRACK
# ==============================================================================
def midi_hz(m: float) -> float:
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def _add_mono(buf: np.ndarray, sig: np.ndarray, t_sec: float, gain: float, pan: float = 0.0):
    i0 = int(round(t_sec * SR))
    if i0 >= len(buf) or i0 + len(sig) <= 0:
        return
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    n = min(len(sig), len(buf) - i0)
    l = np.sqrt(0.5 * (1.0 - pan)) * 1.38
    r = np.sqrt(0.5 * (1.0 + pan)) * 1.38
    buf[i0 : i0 + n, 0] += sig[:n] * gain * l
    buf[i0 : i0 + n, 1] += sig[:n] * gain * r


def inst_pizzicato(midi: float, dur: float = 0.38, seed: int = 1) -> np.ndarray:
    """Warm orchestral pizzicato string pluck (Danny Elfman / Scooby-Doo vibe)."""
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_hz(midi)
    ph = 2 * np.pi * f * t
    sig = (
        1.00 * np.sin(ph)
        + 0.58 * np.sin(2 * ph) * np.exp(-t * 9.0)
        + 0.30 * np.sin(3 * ph) * np.exp(-t * 14.0)
        + 0.16 * np.sin(4 * ph) * np.exp(-t * 20.0)
        + 0.08 * np.sin(5 * ph) * np.exp(-t * 26.0)
    )
    pluck = bp(nz(n, seed), 700, 3200) * np.exp(-t * 85.0) * 0.28
    env = np.minimum(1.0, t / 0.005) * np.exp(-t * 7.8)
    return lp((sig * env + pluck).astype(np.float32), 3400)


def inst_celesta(midi: float, dur: float = 0.72) -> np.ndarray:
    """Sparkling eerie-playful Pixar celesta / music box."""
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_hz(midi)
    sig = (
        1.00 * np.sin(2 * np.pi * f * t) * np.exp(-t * 4.2)
        + 0.36 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t * 7.5)
        + 0.14 * np.sin(2 * np.pi * 3.0 * f * t) * np.exp(-t * 12.0)
        + 0.18 * np.sin(2 * np.pi * 5.42 * f * t) * np.exp(-t * 28.0)
    )
    env = np.minimum(1.0, t / 0.004) * np.minimum(1.0, (dur - t) / 0.04)
    return (sig * env).astype(np.float32)


def inst_rhodes(midi: float, dur: float = 1.6) -> np.ndarray:
    """Lush warm Fender Rhodes electric piano tone."""
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_hz(midi)
    trem = 0.90 + 0.10 * np.sin(2 * np.pi * 4.2 * t)
    sig = (
        1.00 * np.sin(2 * np.pi * f * t) * np.exp(-t * 1.45)
        + 0.32 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t * 2.8)
        + 0.11 * np.sin(2 * np.pi * 3.0 * f * t) * np.exp(-t * 5.5)
        + 0.16 * np.sin(2 * np.pi * 7.0 * f * t) * np.exp(-t * 32.0)
    ) * trem
    env = np.minimum(1.0, t / 0.008) * np.minimum(1.0, (dur - t) / 0.08)
    return lp((sig * env).astype(np.float32), 4200)


def inst_guitar_chord(midis: list[float], dur: float = 0.85, seed: int = 7) -> np.ndarray:
    """Warm acoustic nylon guitar strum with staggered string timing."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    t = np.arange(n, dtype=np.float32) / SR
    for idx, m in enumerate(midis):
        d0 = idx * 0.016
        i0 = int(d0 * SR)
        if i0 >= n:
            continue
        ts = t[: n - i0]
        f = midi_hz(m)
        s = (
            1.0 * np.sin(2 * np.pi * f * ts)
            + 0.45 * np.sin(4 * np.pi * f * ts) * np.exp(-ts * 5.0)
            + 0.22 * np.sin(6 * np.pi * f * ts) * np.exp(-ts * 9.0)
            + 0.10 * np.sin(8 * np.pi * f * ts) * np.exp(-ts * 15.0)
        ) * np.minimum(1.0, ts / 0.005) * np.exp(-ts * 3.8)
        out[i0:] += s.astype(np.float32) / len(midis)
    strum_noise = bp(nz(n, seed), 1800, 6200) * np.exp(-t * 42.0) * 0.14
    return lp(out + strum_noise, 3800)


def inst_marimba(midi: float, dur: float = 0.48) -> np.ndarray:
    """Warm woody marimba / kalimba hook melody."""
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_hz(midi)
    sig = (
        1.00 * np.sin(2 * np.pi * f * t) * np.exp(-t * 6.2)
        + 0.26 * np.sin(2 * np.pi * 4.0 * f * t) * np.exp(-t * 26.0)
        + 0.09 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t * 45.0)
    )
    env = np.minimum(1.0, t / 0.003) * np.minimum(1.0, (dur - t) / 0.03)
    return (sig * env).astype(np.float32)


def inst_bass(midi: float, dur: float = 0.55) -> np.ndarray:
    """Punchy warm upright/groove bass."""
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_hz(midi)
    sig = (
        1.00 * np.sin(2 * np.pi * f * t)
        + 0.48 * np.sin(4 * np.pi * f * t) * np.exp(-t * 4.5)
        + 0.16 * np.sin(6 * np.pi * f * t) * np.exp(-t * 10.0)
    )
    env = np.minimum(1.0, t / 0.008) * np.exp(-t * 3.4) * np.minimum(1.0, (dur - t) / 0.03)
    return lp((sig * env).astype(np.float32), 900)


def drum_kick() -> np.ndarray:
    n = int(SR * 0.22)
    t = np.arange(n, dtype=np.float32) / SR
    f = 48.0 + 95.0 * np.exp(-t * 34.0)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14.0)
    click = bp(nz(n, 91), 900, 3500) * np.exp(-t * 95.0) * 0.22
    return norm(body + click, 0.85)


def drum_rim(seed: int = 92) -> np.ndarray:
    n = int(SR * 0.11)
    t = np.arange(n, dtype=np.float32) / SR
    wood = np.sin(2 * np.pi * 860 * t) * np.exp(-t * 55.0) * 0.55
    snap = bp(nz(n, seed), 1600, 7200) * np.exp(-t * 48.0) * 0.85
    return norm(wood + snap, 0.72)


def drum_shaker(seed: int = 93, open_hat: bool = False) -> np.ndarray:
    dur = 0.14 if open_hat else 0.065
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    decay = 18.0 if open_hat else 58.0
    x = bp(nz(n, seed), 5200, 12500) * np.minimum(1.0, t / 0.005) * np.exp(-t * decay)
    return norm(x, 0.42)


def drum_woodblock(pitch: float = 920.0, seed: int = 94) -> np.ndarray:
    n = int(SR * 0.09)
    t = np.arange(n, dtype=np.float32) / SR
    x = (np.sin(2 * np.pi * pitch * t) + 0.35 * np.sin(2 * np.pi * pitch * 1.48 * t)) * np.exp(-t * 42.0)
    x += bp(nz(n, seed), 1500, 5000) * np.exp(-t * 80.0) * 0.25
    return norm(x.astype(np.float32), 0.62)


def stereo_room_reverb(sig: np.ndarray, wet: float = 0.26) -> np.ndarray:
    """Lush multi-tap stereo room reverb so synthesized acoustic instruments breathe warmly."""
    out = sig.copy()
    taps = [
        (0.023, 0.34, 0, 1),
        (0.037, 0.28, 1, 0),
        (0.053, 0.22, 0, 0),
        (0.071, 0.18, 1, 1),
        (0.097, 0.13, 0, 1),
        (0.127, 0.09, 1, 0),
    ]
    rev = np.zeros_like(sig)
    for d_s, g, src_c, dst_c in taps:
        d = int(d_s * SR)
        if d < len(sig):
            rev[d:, dst_c] += sig[:-d, src_c] * g
    rev[:, 0] = lp(rev[:, 0], 3600)
    rev[:, 1] = lp(rev[:, 1], 3600)
    return out + rev * wet


def build_cinematic_score(total: float, t_muncul: float, t_scratch: float, t_end_start: float) -> np.ndarray:
    """Compose full 2-Act stereo film score:
    Act 1 (0 -> t_muncul): Catchy Spooky-Playful Mystery (112 BPM, D minor: pizzicato + celesta + upright bass + tiptoe percussion)
    Suspense (t_muncul -> t_scratch): Eerie tremolo cello + ghostly high string shimmer riser
    Act 2 (t_scratch + 0.28 -> total): Warm Upbeat Acoustic-Jazz / Cozy Nongkrong Groove (114 BPM, F major: Rhodes + acoustic guitar + groovy bass + catchy marimba hook + swing drums)
    """
    N = int(SR * total) + SR
    mus = np.zeros((N, 2), np.float32)

    kick = drum_kick()
    rim = drum_rim(92)
    wb_hi = drum_woodblock(980, 94)
    wb_lo = drum_woodblock(740, 95)

    # ------------------------------------------------------------------
    # ACT 1: SPOOKY-PLAYFUL MYSTERY (112 BPM, D HARMONIC MINOR)
    # ------------------------------------------------------------------
    beat1 = 60.0 / 112.0  # ~0.5357s per quarter beat
    # 8-bar loop: Dm, Dm, Bb, A7, Gm, Dm, Bb, A7
    act1_chords = [
        (50, [62, 65, 69]),  # Dm
        (50, [62, 65, 69]),  # Dm
        (46, [58, 62, 65]),  # Bb
        (45, [57, 61, 64]),  # A7
        (43, [55, 58, 62]),  # Gm
        (50, [62, 65, 69]),  # Dm
        (46, [58, 62, 65]),  # Bb
        (45, [57, 61, 64]),  # A7
    ]
    # Catchy Scooby-Doo / Elfman sneaky melody (8th-note grid: 8 steps per bar, None = rest)
    act1_melody = [
        [74, None, 77, None, 81, 79, 77, 76],  # Bar 0 (Dm)
        [74, None, 73, 74, 77, None, None, None],  # Bar 1 (Dm)
        [70, None, 74, None, 77, 76, 74, 72],  # Bar 2 (Bb)
        [73, None, 76, None, 81, None, 79, 76],  # Bar 3 (A7)
        [79, None, 77, 74, 70, None, 74, None],  # Bar 4 (Gm)
        [77, None, 76, 74, 69, None, 74, None],  # Bar 5 (Dm)
        [70, 72, 74, None, 77, None, 74, None],  # Bar 6 (Bb)
        [76, None, 73, None, 69, None, 73, 76],  # Bar 7 (A7)
    ]

    bar = 0
    while True:
        bar_t = bar * 4.0 * beat1
        if bar_t >= t_muncul - 0.15:
            break
        root, triad = act1_chords[bar % 8]
        mel = act1_melody[bar % 8]

        # Walking pizzicato bass & sneaky off-beat chord plucks
        for b in range(4):
            bt = bar_t + b * beat1
            if bt >= t_muncul - 0.08:
                break
            bass_note = root if b in (0, 2) else (root + 7 if b == 1 else root + 5)
            _add_mono(mus, inst_bass(bass_note - 12, 0.52), bt, 0.42, -0.05)
            _add_mono(mus, inst_pizzicato(bass_note, 0.34, bar * 10 + b), bt, 0.36, -0.22)
            # Offbeat pizzicato triad bounce
            off_t = bt + 0.5 * beat1
            if off_t < t_muncul - 0.08:
                for ci, cn in enumerate(triad):
                    _add_mono(mus, inst_pizzicato(cn, 0.28, bar * 30 + b * 4 + ci), off_t, 0.17, 0.22 + (ci - 1) * 0.12)
            # Sneaky tiptoe woodblock & soft kick/shaker
            if b in (0, 2):
                _add_mono(mus, kick, bt, 0.24, 0.0)
            _add_mono(mus, wb_hi if b % 2 == 0 else wb_lo, bt + 0.5 * beat1, 0.16, 0.28 if b % 2 == 0 else -0.28)
            _add_mono(mus, drum_shaker(bar * 16 + b), bt, 0.10, -0.20)

        # Sparkling celesta music-box lead
        for st, note in enumerate(mel):
            if note is None:
                continue
            nt = bar_t + st * 0.5 * beat1
            if nt < t_muncul - 0.08:
                _add_mono(mus, inst_celesta(note, 0.62), nt, 0.24, 0.18 * np.sin(bar + st * 0.7))
        bar += 1

    # ------------------------------------------------------------------
    # SUSPENSE BRIDGE (t_muncul -> t_scratch): EERIE TREMOLO DRONE + RISER
    # ------------------------------------------------------------------
    susp_dur = max(0.5, t_scratch - t_muncul + 0.1)
    ns = int(SR * susp_dur)
    ts = np.arange(ns, dtype=np.float32) / SR
    swell = np.minimum(1.0, ts / 0.45) * np.minimum(1.0, (susp_dur - ts) / 0.15)
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * 6.5 * ts)
    # Dark D minor + tritone Ab eerie cluster
    drone = (
        np.sin(2 * np.pi * midi_hz(38) * ts) * 0.48
        + np.sin(2 * np.pi * midi_hz(45) * ts) * 0.26
        + np.sin(2 * np.pi * (midi_hz(68) + 3.5 * np.sin(2 * np.pi * 4.5 * ts)) * ts) * 0.15 * (ts / susp_dur)
        + np.sin(2 * np.pi * (midi_hz(74) - 2.5 * np.cos(2 * np.pi * 3.8 * ts)) * ts) * 0.12 * (ts / susp_dur)
    ) * trem * swell
    _add_mono(mus, lp(drone.astype(np.float32), 2600), t_muncul, 0.42, 0.0)

    # ------------------------------------------------------------------
    # ACT 2: WARM UPBEAT ACOUSTIC-JAZZ / COZY NONGKRONG GROOVE (114 BPM, F MAJOR!)
    # ------------------------------------------------------------------
    act2_start = t_scratch + 0.30
    beat2 = 60.0 / 114.0  # ~0.5263s
    # 8-bar sunny jazzy progression: Fmaj7, Dm7, Gm7, C9, Fmaj7, D7, Gm7, C13
    act2_chords = [
        (41, [53, 57, 60, 64]),  # Fmaj7
        (38, [50, 53, 57, 60]),  # Dm7
        (43, [55, 58, 62, 65]),  # Gm7
        (48, [55, 58, 62, 64]),  # C9
        (41, [53, 57, 60, 64]),  # Fmaj7
        (38, [50, 54, 57, 60]),  # D7 (warm turnaround!)
        (43, [55, 58, 62, 65]),  # Gm7
        (48, [55, 58, 64, 69]),  # C13
    ]
    # Super catchy, joyful, earworm Marimba/Kalimba melody (8 steps per bar!)
    act2_melody = [
        [77, None, 81, None, 79, 77, 74, None],  # Fmaj7: F - A - G F D
        [72, None, 74, 77, 81, None, 77, None],  # Dm7: C - D F A - F
        [79, None, 77, 74, 70, None, 74, 77],    # Gm7: G - F D Bb - D F
        [76, None, 79, None, 72, None, None, None],  # C9: E - G - C
        [77, 79, 81, None, 84, None, 81, 79],    # Fmaj7: F G A - C5 - A G
        [78, None, 81, None, 74, None, 77, None],  # D7: F# - A - D - F
        [79, None, 82, 81, 79, 77, 74, None],    # Gm7: G - Bb A G F D
        [76, 79, 81, None, 79, None, 77, None],  # C13: E G A - G - F
    ]

    bar = 0
    while True:
        bar_t = act2_start + bar * 4.0 * beat2
        if bar_t >= total - 0.5:
            break
        root, chord = act2_chords[bar % 8]
        mel = act2_melody[bar % 8]

        # Warm Rhodes pad chord on beat 1 (wide left-biased)
        for ci, cn in enumerate(chord):
            _add_mono(mus, inst_rhodes(cn, 3.8 * beat2), bar_t + ci * 0.012, 0.145, -0.34 + ci * 0.10)

        # Acoustic guitar upbeat strums (beat 1.5, 2.5, 4) — sunny cozy hangout bounce!
        for strum_b, g_s in [(0.0, 0.20), (1.5, 0.24), (2.5, 0.18), (3.5, 0.22)]:
            st_t = bar_t + strum_b * beat2
            if st_t < total - 0.35:
                _add_mono(mus, inst_guitar_chord([c + 12 for c in chord[:3]], 0.72, bar * 17 + int(strum_b * 10)), st_t, g_s, 0.34)

        # Groovy walking bassline
        bass_pat = [
            (0.0, root),
            (1.5, root + 7),
            (2.0, root + 5),
            (3.0, root + 7 if bar % 2 == 0 else root + 4),
            (3.5, root + 10 if bar % 4 == 3 else root + 5),
        ]
        for b_off, b_note in bass_pat:
            bt = bar_t + b_off * beat2
            if bt < total - 0.35:
                _add_mono(mus, inst_bass(b_note, 0.48), bt, 0.44, -0.04)

        # Live cozy acoustic drum swing groove (kick, warm rimshot on 2 & 4, swing shakers)
        for b in range(4):
            bt = bar_t + b * beat2
            if bt >= total - 0.35:
                break
            if b == 0:
                _add_mono(mus, kick, bt, 0.38, 0.0)
            if b == 2:
                _add_mono(mus, kick, bt + 0.5 * beat2, 0.30, 0.0)
            if b in (1, 3):
                _add_mono(mus, rim, bt, 0.28, 0.08)
            _add_mono(mus, drum_shaker(bar * 31 + b * 2, False), bt, 0.15, -0.26)
            _add_mono(mus, drum_shaker(bar * 31 + b * 2 + 1, b == 3), bt + 0.56 * beat2, 0.13, 0.26)

        # Catchy joyful Marimba melody (slightly quieter during very last CTA bar)
        mel_gain = 0.24 if bar_t < t_end_start else 0.28
        for st, note in enumerate(mel):
            if note is None:
                continue
            nt = bar_t + st * 0.5 * beat2
            if nt < total - 0.45:
                _add_mono(mus, inst_marimba(note, 0.44), nt, mel_gain, 0.16 * np.cos(bar * 1.1 + st * 0.6))
        bar += 1

    # Final warm Fmaj9 resolution chord on ending fade!
    end_chord_t = max(act2_start + 1.0, total - 1.55)
    for ci, cn in enumerate([53, 57, 60, 64, 67, 72]):
        _add_mono(mus, inst_rhodes(cn, 1.45), end_chord_t + ci * 0.035, 0.16, -0.35 + ci * 0.14)

    mus = stereo_room_reverb(mus, wet=0.28)
    pk = np.max(np.abs(mus)) + 1e-6
    return (mus / pk * 0.78).astype(np.float32)


# ==============================================================================
# CUSTOM HORROR-TO-COMEDY SFX
# ==============================================================================
def sfx_owl_hoot(seed=11):
    out = np.zeros(int(SR * 1.4), np.float32)
    for start_s, dur_s, f0, f1 in [(0.05, 0.34, 520, 440), (0.52, 0.62, 490, 380)]:
        n = int(SR * dur_s)
        t = np.arange(n) / SR
        freq = f0 + (f1 - f0) * (t / dur_s) + 12 * np.sin(2 * np.pi * 6.5 * t)
        hoot = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.sin(np.pi * t / dur_s) ** 1.3
        j = int(start_s * SR)
        out[j : j + n] += hoot.astype(np.float32)
    return norm(lp(out, 1400), 0.58)


def sfx_lamp_buzz(dur=0.85, seed=21):
    n = int(SR * dur)
    t = np.arange(n) / SR
    hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 300 * t)) * 0.4
    zap = bp(nz(n, seed), 1800, 6800) * (np.sin(2 * np.pi * 19 * t) > 0.55).astype(np.float32)
    env = np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.08)
    return norm(((hum + zap * 1.2) * env).astype(np.float32), 0.72)


def sfx_ghost_appear(dur=1.55, seed=31):
    n = int(SR * dur)
    t = np.arange(n) / SR
    shimmer = (
        np.sin(2 * np.pi * (460 + 28 * np.sin(2 * np.pi * 5 * t)) * t) * 0.35
        + np.sin(2 * np.pi * (650 - 35 * np.sin(2 * np.pi * 4.2 * t)) * t) * 0.30
        + np.sin(2 * np.pi * (920 + 20 * np.cos(2 * np.pi * 6 * t)) * t) * 0.20
    ) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    whoosh = bp(nz(n, seed), 220, 2100) * np.minimum(1, t / 0.14) * np.exp(-t * 1.8)
    thump = E.sfx_thump(seed + 1, 56)
    out = (shimmer * 0.55 + whoosh * 0.95).astype(np.float32)
    m = min(len(out), len(thump))
    out[:m] += thump[:m] * 0.95
    return norm(out, 0.92)


def sfx_record_scratch(seed=41):
    n = int(SR * 0.44)
    t = np.arange(n) / SR
    f = 420 + 1950 * np.sin(2 * np.pi * 4.5 * t) * np.exp(-t * 2.4)
    sig = np.sin(2 * np.pi * np.cumsum(np.abs(f)) / SR) * 0.65 + bp(nz(n, seed), 1200, 5200) * 0.55
    sig *= np.sin(np.pi * np.clip(t / 0.44, 0, 1)) ** 0.5
    return norm(sig.astype(np.float32), 0.92)


def sfx_gorengan_crunch(seed=51):
    n = int(SR * 0.46)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    crackle = bp(nz(n, seed), 1600, 8400)
    bursts = np.zeros(n, np.float32)
    for pos_s, amp in [(0.03, 1.0), (0.11, 0.88), (0.20, 0.80), (0.29, 0.56)]:
        bursts += np.exp(-((t - pos_s) / 0.03) ** 2).astype(np.float32) * amp
    return norm((crackle * bursts * (0.7 + 0.3 * rng.random(n))).astype(np.float32), 0.84)


def sfx_camera_shutter(seed=61):
    n = int(SR * 0.24)
    t = np.arange(n) / SR
    c1 = bp(nz(n, seed), 2000, 9000) * np.exp(-((t - 0.025) / 0.012) ** 2)
    c2 = bp(nz(n, seed + 1), 1600, 7500) * np.exp(-((t - 0.095) / 0.014) ** 2) * 0.85
    beep = np.sin(2 * np.pi * 2400 * t) * np.exp(-((t - 0.01) / 0.015) ** 2) * 0.3
    return norm((c1 + c2 + beep).astype(np.float32), 0.90)


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
    V = json.loads(VOICE_JSON.read_text())
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
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.22
            speaker = ln.get("speaker", "narator")
            y = E.load_wav(ROOT / ln["file"])
            # Normalize per-speaker clip loudness smoothly so Bagas, Pocong, Kunti, Riko, Narator sit evenly
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
    TIMING_JSON.write_text(json.dumps(timing, indent=2, ensure_ascii=False))

    S = {k: v["startFrame"] / FPS for k, v in scenes_meta.items()}
    END = {k: S[k] + v["durationInFrames"] / FPS for k, v in scenes_meta.items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in events_local.items()}

    print(f"Total {total:.2f}s ({total_frames} frames)")
    for k in order:
        print(f"  {k:10s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    T_LAUGH = ROOT / "exports" / "riset" / "tawa"

    # Place multi-character spatial voices cleanly in stereo
    for t0, y, speaker in clips:
        put(vo, y, t0, 1.0, SPEAKER_PAN.get(speaker, 0.0))

    # Clean swooshes between scenes
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.32, abs(hash(k)) % 50 + 11), max(0.0, S[k] - 0.16), 0.24)

    # 1. HOOK — Midnight owl + crickets + Bagas snack bag crinkle
    put(sfx, AWAN.sfx_crickets(END["hook"] - S["hook"]), S["hook"], 0.18)
    put(sfx, sfx_owl_hoot(12), S["hook"] + 0.35, 0.38, -0.35)
    put(sfx, E.sfx_paper(13), EV["hook.goreng"], 0.42, 0.3)

    # 2. MASUK — Sneak steps + flashlight click + porch lamp zap + banyan wind
    put(sfx, AWAN.sfx_crickets(END["masuk"] - S["masuk"]), S["masuk"], 0.15)
    put(sfx, AWAN.sfx_steps(5, 0.44, 22), S["masuk"] + 0.25, 0.30, -0.15)
    put(sfx, E.sfx_tik(2200, 23), EV["masuk.senter"], 0.42)
    put(sfx, sfx_lamp_buzz(0.85, 24), EV["masuk.berkedip"] - 0.05, 0.58, 0.1)
    put(sfx, E.sfx_wind(1.8, 25), EV["masuk.menyan"] - 0.2, 0.44, -0.25)

    # 3. MUNCUL — Dramatic ghost appear + Pocong parabolic hop boings + Kunti swoop + Riko panic thump!
    put(sfx, sfx_ghost_appear(1.45, 32), S["muncul"] + 0.05, 0.88, -0.2)
    put(sfx, E.sfx_boing(250, 0.32), S["muncul"] + 0.28, 0.38, -0.3)
    put(sfx, E.sfx_boing(280, 0.30), S["muncul"] + 0.68, 0.36, -0.2)
    put(sfx, E.sfx_swoosh(0.65, 33), S["muncul"] + 0.45, 0.65, 0.35)
    put(sfx, E.sfx_thump(34, 62), EV["muncul.ampun"] - 0.04, 0.65)

    # 4. TAWAR — HARD RECORD SCRATCH -> coffee pour -> sparkly eyes tinkle!
    put(sfx, sfx_record_scratch(42), EV["tawar.seram"] - 0.16, 0.82)
    put(sfx, K.sfx_pour(0.9), EV["tawar.kopi"] + 0.02, 0.46, 0.2)
    put(sfx, E.sfx_tinkle(8, 43), EV["tawar.pocong"] + 0.05, 0.52, -0.15)
    put(sfx, E.sfx_tinkle(8, 44), EV["tawar.kunti"] + 0.05, 0.48, 0.2)

    # 5. CURHAT — Crispy pisang goreng crunch + calf-cramp hop boing + coffee gulp
    put(sfx, sfx_gorengan_crunch(52), S["curhat"] + 0.12, 0.66, 0.22)
    put(sfx, E.sfx_boing(300, 0.34), EV["curhat.melompat"] + 0.02, 0.48, -0.22)
    put(sfx, K.sfx_gulp(), EV["curhat.bagas"] + 0.35, 0.36, 0.15)

    # 6. VIRAL — Phone LIVE alert + comic boing + roaring livestream crowd laughter!
    put(sfx, K.sfx_notif(), EV["viral.waduh"] - 0.06, 0.64, -0.22)
    put(sfx, E.sfx_boing(400, 0.32), EV["viral.ribuan"] - 0.04, 0.42, -0.2)
    put(sfx, K.sfx_notif(), EV["viral.halo"] - 0.12, 0.42, 0.22)
    if (T_LAUGH / "tawa_istana_ramai.mp3").exists():
        put(
            vo,
            norm(E.load_mp3(T_LAUGH / "tawa_istana_ramai.mp3", 1.06), 0.26)[: int(SR * 2.1)],
            EV["viral.gorengan"] + 0.25,
            0.34,
            0.08,
        )

    # 7. FOTO — Bakwan crunch + CEKREK camera shutter + sparkle!
    put(sfx, sfx_gorengan_crunch(73), EV["foto.bakwan"] + 0.08, 0.56, 0.15)
    put(sfx, sfx_camera_shutter(71), EV["foto.cekrek"] + 0.04, 0.90)
    put(sfx, E.sfx_tinkle(7, 72), EV["foto.cekrek"] + 0.20, 0.44)

    # 8. ENDING — Warm crickets + celebratory CTA fanfare
    put(sfx, AWAN.sfx_crickets(END["ending"] - S["ending"]), S["ending"], 0.14)
    put(sfx, E.sfx_fanfare(), EV["ending.komentar"] + 0.20, 0.32)

    # Build NEW 2-Act Cinematic Stereo Soundtrack!
    mus = build_cinematic_score(total, S["muncul"], EV["tawar.seram"], S["ending"])

    # Clean dynamic ducking (music rich and audible between lines, ducks gently under dialogue!)
    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.085 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = (
        mus[:N] * 0.52 * (1.0 / (1.0 + 4.8 * env))[:, None]
        + sfx * (1.0 / (1.0 + 1.15 * env))[:, None]
        + vo * 1.18
    )
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.06) * np.clip((total - tt) / 0.75, 0.0, 1.0))[:, None]
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
            "ffmpeg", "-y", "-v", "error", "-i", str(wav),
            "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
            "-ar", "44100", "-b:a", "192k",
            str(OUT_MP3),
        ],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(f"Selesai v2: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()

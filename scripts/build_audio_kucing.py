"""Mix audio komedi + jadwal adegan "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)".

Fitur Audio Upgraded:
  - Musik latar 1960s Spy Jazz / Espionage Comedy (walking upright bass, sneaky snaps, vibraphone stabs,
    intensif saat adegan kejar-kejaran taksi, dan sad comedy bass di penutup!)
  - SFX Komedi Foley sinkron presisi ke kata pemicu (EVENTS):
    * Suara kucing MEONG! + KRES-KRES! mengunyah ikan lewat radio
    * Bunyi mesin pita magnetik + scanner X-Ray + 3 blip gadget (mikrofon, pemancar, antena)
    * Pintu geser van KREEEET-KLAK! + bunyi panggang ikan SIZZLE!
    * Decit rem mendadak taksi kuning CIIIIIT!! + klakson BEEP-BEEP!
    * Alarm radar mengunci IKAN TONGKOL + statis radio + uap marah Pak Direktur PSSSSHH!
    * Whip-pan whoosh + cash register KA-CHING! ($20M) + sad wah-wah trombone
  - Normalisasi loudness final ke -14 LUFS + export public/audio/kucing_master.mp3 & src/kucing_timing.json

Pakai:
  python3 scripts/build_audio_kucing.py
"""
import importlib.util
import json
import math
import subprocess
import sys
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def _load_mod(name, rel):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


E = _load_mod("emu_audio", "scripts/build_audio_emu.py")
SR, FPS = E.SR, E.FPS
norm, bp, lp = E.norm, E.bp, E.lp
_NZ_SEED = [1966]


def nz(dur: float):
    _NZ_SEED[0] += 1
    return E.nz(int(SR * dur), _NZ_SEED[0])


def put(out: np.ndarray, clip: np.ndarray, t_sec: float, gain: float = 1.0):
    i0 = int(round(max(0.0, t_sec) * SR))
    if i0 >= len(out):
        return
    c = np.asarray(clip, dtype=np.float32)
    if c.ndim == 2:
        c = c.mean(axis=1)
    n = min(len(c), len(out) - i0)
    if n > 0:
        out[i0 : i0 + n] += c[:n] * gain

VOICE_JSON = ROOT / "src" / "kucing_voice.json"
TIMING_JSON = ROOT / "src" / "kucing_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "kucing_master.mp3"

SCENE_ORDER = ["hook", "lab", "xray", "van", "lepas", "kacau", "direktur", "akhir"]

SCENE_CFG = {
    "hook":     dict(pre=0.45, post=0.50, gaps=[0.0, 0.34]),
    "lab":      dict(pre=0.35, post=0.45, gaps=[0.0, 0.22, 0.22]),
    "xray":     dict(pre=0.38, post=0.45, gaps=[0.0, 0.24, 0.22]),
    "van":      dict(pre=0.40, post=0.45, gaps=[0.0, 0.24, 0.28]),
    "lepas":    dict(pre=0.30, post=0.40, gaps=[0.0, 0.20]),
    "kacau":    dict(pre=0.42, post=0.45, gaps=[0.0, 0.22]),
    "direktur": dict(pre=0.35, post=0.95, gaps=[0.0, 0.35]),
    "akhir":    dict(pre=0.45, post=1.35, gaps=[0.0, 0.28, 0.36]),
}

EVENTS = {
    "hook.dolar":    ("hook", 0, "dolar", -2),
    "hook.kucing":   ("hook", 1, "kucing", -3),
    "lab.meong":     ("lab", 0, "meong", -2),
    "lab.hah":       ("lab", 1, "START", -1),
    "lab.nyadap":    ("lab", 2, "nyadap", -2),
    "xr.kuping":     ("xray", 0, "kuping", -2),
    "xr.pemancar":   ("xray", 0, "pemancar", -2),
    "xr.ekor":       ("xray", 0, "ekor", -2),
    "xr.yakin":      ("xray", 1, "yakin", -2),
    "xr.profesional":("xray", 2, "profesional", -2),
    "van.napas":     ("van", 0, "napas", -2),
    "van.pintu":     ("van", 1, "pintu", -2),
    "van.ikan":      ("van", 2, "ikan", -2),
    "lep.apa":       ("lepas", 0, "START", -1),
    "lep.belok":     ("lepas", 0, "belok", -2),
    "lep.taksi":     ("lepas", 1, "taksi", -2),
    "kac.ngerem":    ("kacau", 0, "ngerem", -3),
    "kac.gerobak":   ("kacau", 0, "gerobak", -2),
    "kac.radar":     ("kacau", 1, "radar", -2),
    "kac.tongkol":   ("kacau", 1, "tongkol", -2),
    "dir.headset":   ("direktur", 0, "headset", -2),
    "dir.siapa":     ("direktur", 1, "START", -2),
    "dir.ikan":      ("direktur", 1, "ikan", -2),
    "akh.batal":     ("akhir", 0, "dibatalkan", -2),
    "akh.fakta":     ("akhir", 1, "fakta", -2),
    "akh.melayang":  ("akhir", 2, "melayang", -2),
    "akh.meong":     ("akhir", 2, "meong", -3),
}


def read_wav(p: Path):
    with wave.open(str(p), "rb") as w:
        sr = w.getframerate()
        raw = w.readframes(w.getnframes())
    y = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32767.0
    if sr != SR:
        t_old = np.linspace(0, 1, len(y))
        t_new = np.linspace(0, 1, int(len(y) * SR / sr))
        y = np.interp(t_new, t_old, y).astype(np.float32)
    return y


# ============== CUSTOM COMEDY FOLEY SFX ==============
def sfx_meow(dur=0.52, pitch=660.0):
    t = np.linspace(0, dur, int(SR * dur))
    # Formant-like cat meow pitch contour: rise then slide down
    f = pitch * (0.82 + 0.38 * np.sin(np.pi * (t / dur) ** 0.7))
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = 0.55 * np.sin(ph) + 0.30 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    sig = bp(sig, 500, 2800)
    env = np.sin(np.pi * t / dur) ** 0.75
    return norm(sig * env) * 0.75


def sfx_crunch(dur=0.65):
    y = np.zeros(int(SR * dur), dtype=np.float32)
    for k in (0.04, 0.24, 0.44):
        c = bp(nz(0.14), 1200, 5200) * np.exp(-np.linspace(0, 9, int(SR * 0.14)))
        put(y, norm(c), k, 0.85)
    return norm(y) * 0.70


def sfx_kaching(dur=0.55):
    t = np.linspace(0, dur, int(SR * dur))
    ping = (np.sin(2 * np.pi * 1980 * t) + 0.6 * np.sin(2 * np.pi * 2970 * t) + 0.4 * np.sin(2 * np.pi * 4120 * t)) * np.exp(-t * 7.5)
    clack = bp(nz(0.06), 1500, 4500) * np.exp(-np.linspace(0, 14, int(SR * 0.06)))
    y = norm(ping) * 0.65
    put(y, norm(clack), 0.0, 0.55)
    return y


def sfx_tire_screech(dur=0.85):
    t = np.linspace(0, dur, int(SR * dur))
    f1 = 1550 - 380 * (t / dur) + 35 * np.sin(2 * np.pi * 24 * t)
    f2 = 2120 - 440 * (t / dur)
    ph1 = 2 * np.pi * np.cumsum(f1) / SR
    ph2 = 2 * np.pi * np.cumsum(f2) / SR
    s = (0.5 * np.sin(ph1) + 0.4 * np.sin(ph2) + 0.35 * bp(nz(dur), 1400, 3200))
    env = np.minimum(1.0, t / 0.06) * np.exp(-np.maximum(0, t - 0.55) * 8)
    return norm(s * env) * 0.72


def sfx_taxi_horn(dur=0.45):
    y = np.zeros(int(SR * dur), dtype=np.float32)
    for st in (0.0, 0.21):
        d = 0.16
        t = np.linspace(0, d, int(SR * d))
        h = (np.sin(2 * np.pi * 440 * t) + 0.8 * np.sin(2 * np.pi * 554 * t) + 0.4 * np.sin(2 * np.pi * 880 * t))
        h = np.tanh(h * 1.4) * np.minimum(1.0, t / 0.02) * np.minimum(1.0, (d - t) / 0.02)
        put(y, norm(h), st, 0.72)
    return y


def sfx_van_door(dur=0.65):
    t = np.linspace(0, dur, int(SR * dur))
    slide = bp(nz(dur), 320, 1400) * np.sin(np.pi * t / dur)
    klak = bp(nz(0.08), 180, 900) * np.exp(-np.linspace(0, 14, int(SR * 0.08)))
    y = norm(slide) * 0.55
    put(y, norm(klak), dur - 0.10, 0.80)
    return y


def sfx_sizzle(dur=1.4):
    s = bp(nz(dur), 2600, 8000)
    t = np.linspace(0, dur, len(s))
    env = np.sin(np.pi * t / dur) ** 0.5
    return norm(s * env) * 0.42


def sfx_whip(dur=0.22):
    t = np.linspace(0, dur, int(SR * dur))
    s = bp(nz(dur), 350, 2600) * np.sin(np.pi * t / dur) ** 1.3
    return norm(s) * 0.50


def sfx_blip(freq=880.0, dur=0.14):
    t = np.linspace(0, dur, int(SR * dur))
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 16)
    return norm(s) * 0.55


def sfx_radio_static(dur=0.28):
    s = bp(nz(dur), 900, 4200)
    t = np.linspace(0, dur, len(s))
    return norm(s * np.sin(np.pi * t / dur)) * 0.55


def sfx_steam_anger(dur=0.75):
    s = bp(nz(dur), 1600, 6200)
    t = np.linspace(0, dur, len(s))
    whistle = np.sin(2 * np.pi * (1850 + 400 * t / dur) * t) * 0.28
    env = np.minimum(1.0, t / 0.06) * np.exp(-np.maximum(0, t - 0.45) * 7)
    return norm((s + whistle) * env) * 0.60


def sfx_sad_wah(dur=0.95):
    y = np.zeros(int(SR * dur), dtype=np.float32)
    notes = [(311.1, 0.0, 0.22), (293.7, 0.23, 0.22), (277.2, 0.46, 0.45)]
    for freq, st, d in notes:
        t = np.linspace(0, d, int(SR * d))
        f = freq * (1.0 - 0.08 * (t / d)) if st > 0.4 else freq
        ph = 2 * np.pi * np.cumsum(np.full_like(t, f) if np.isscalar(f) else f) / SR
        s = (0.6 * np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.exp(-t * 3.0)
        put(y, norm(s), st, 0.55)
    return y


# ============== NEW JAMES BOND 1960s SPY INSTRUMENT & FOLEY SYNTHS ==============
def _spy_twang_note(freq: float, dur: float = 0.42):
    """Vintage 1960s Spy Surf-Guitar twang note with metallic pick attack & spring-reverb shimmer."""
    n = max(64, int(SR * dur))
    t = np.linspace(0, dur, n, dtype=np.float32)
    # Rich electric guitar harmonics + slight vintage tremolo
    vib = 1.0 + 0.004 * np.sin(2 * np.pi * 5.8 * t)
    ph = 2 * np.pi * np.cumsum(np.full(n, freq, dtype=np.float32) * vib) / SR
    sig = (
        0.52 * np.sin(ph)
        + 0.36 * np.sin(2 * ph)
        + 0.24 * np.sin(3 * ph)
        + 0.14 * np.sin(4 * ph)
        + 0.08 * np.sin(5 * ph)
    )
    # Slight tube overdrive + pick transient + spring reverb tail
    sig = np.tanh(sig * 1.45) * np.exp(-t * 5.2) * (1.0 - np.exp(-t * 280.0))
    pick = bp(nz(0.025), 2000, 6500) * np.exp(-np.linspace(0, 14, int(SR * 0.025)))
    y = sig.astype(np.float32)
    put(y, norm(pick), 0.0, 0.22)
    # Simple vintage spring-reverb multi-tap echo
    out = np.zeros(n + int(SR * 0.18), dtype=np.float32)
    put(out, y, 0.0, 1.0)
    put(out, bp(y, 700, 3800), 0.042, 0.28)
    put(out, bp(y, 600, 3200), 0.095, 0.16)
    return norm(out)


def sfx_bond_chord(dur: float = 1.65):
    """Iconic 1960s Spy Minor-Major 9th guitar chord (Em(maj9): E-G-B-D#-F#) with staggered arpeggio strum!"""
    freqs = [164.81, 196.00, 246.94, 311.13, 369.99, 659.25]  # E3 G3 B3 D#4 F#4 E5
    y = np.zeros(int(SR * (dur + 0.3)), dtype=np.float32)
    for i, f in enumerate(freqs):
        note = _spy_twang_note(f, dur)
        put(y, note, i * 0.032, 0.42 if i < 4 else 0.34)
    return norm(y) * 0.72


def sfx_bond_brass(root: float = 164.81, dur: float = 0.58, intense: bool = False):
    """Punchy 1960s Spy Brass Section Stab (trombones + muted trumpets hitting dissonant spy chord!)."""
    n = int(SR * dur)
    t = np.linspace(0, dur, n, dtype=np.float32)
    ratios = [1.0, 1.189, 1.498, 1.888, 2.0] if intense else [1.0, 1.189, 1.498, 2.0]  # Em / Em(maj7)
    sig = np.zeros(n, dtype=np.float32)
    for r in ratios:
        for det in (-0.004, 0.0, 0.0045):
            f = root * r * (1.0 + det)
            # Sawtooth-like brass harmonic stack
            ph = 2 * np.pi * f * t
            h = (
                0.55 * np.sin(ph)
                + 0.42 * np.sin(2 * ph)
                + 0.30 * np.sin(3 * ph)
                + 0.20 * np.sin(4 * ph)
                + 0.12 * np.sin(5 * ph)
            )
            sig += h
    # Sharp brass blat attack + breathy bite
    env = np.minimum(1.0, t / 0.022) * np.exp(-np.maximum(0.0, t - 0.14) * (4.2 if intense else 6.0))
    sig = np.tanh(sig * 0.22) * env
    sig = bp(sig, 140, 4200)
    return norm(sig) * (0.82 if intense else 0.68)


def sfx_record_scratch(dur: float = 0.36):
    """Classic comedy vinyl record-scratch halting the spy music right before disaster!"""
    n = int(SR * dur)
    t = np.linspace(0, dur, n, dtype=np.float32)
    f = 220.0 + 1650.0 * np.sin(np.pi * (t / dur) ** 0.55) ** 2 + 420.0 * np.sin(2 * np.pi * 16 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.tanh((np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.4 * bp(nz(dur), 900, 4800)) * 1.5)
    env = np.maximum(0.0, np.sin(np.pi * t / dur)) ** 0.45
    return norm(sig * env) * 0.78


def sfx_gadget_click(dur: float = 0.24):
    """Crisp metallic spy gadget KLIK! + high-tech sonar confirmation beep."""
    y = np.zeros(int(SR * dur), dtype=np.float32)
    cl = bp(nz(0.035), 2200, 7200) * np.exp(-np.linspace(0, 18, int(SR * 0.035)))
    put(y, norm(cl), 0.0, 0.90)
    put(y, sfx_blip(1320.0, 0.12), 0.045, 0.68)
    put(y, sfx_blip(1760.0, 0.12), 0.105, 0.62)
    return norm(y) * 0.72


def sfx_desk_slam(dur: float = 0.42):
    """Heavy CIA Director desk slam BRAAK!! (deep sub thud + wooden crack)."""
    n = int(SR * dur)
    t = np.linspace(0, dur, n, dtype=np.float32)
    thud = np.sin(2 * np.pi * (115 * np.exp(-t * 14) + 38) * t) * np.exp(-t * 11)
    crack = bp(nz(0.10), 400, 3200) * np.exp(-np.linspace(0, 15, int(SR * 0.10)))
    y = thud.astype(np.float32)
    put(y, norm(crack), 0.0, 0.78)
    return norm(y) * 0.85


def sfx_stamp_thud(dur: float = 0.28):
    """Official red CIA DIBATALKAN rubber stamp thump."""
    n = int(SR * dur)
    t = np.linspace(0, dur, n, dtype=np.float32)
    th = np.sin(2 * np.pi * (95 * np.exp(-t * 16) + 42) * t) * np.exp(-t * 14)
    slap = bp(nz(0.05), 800, 3600) * np.exp(-np.linspace(0, 16, int(SR * 0.05)))
    y = th.astype(np.float32)
    put(y, norm(slap), 0.0, 0.55)
    return norm(y) * 0.72


def sfx_sonar_ping(freq: float = 1180.0, dur: float = 0.55):
    """Retro 1960s secret-lab X-Ray sonar radar ping."""
    t = np.linspace(0, dur, int(SR * dur), dtype=np.float32)
    s = (np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 2 * t)) * np.exp(-t * 6.5)
    return norm(s) * 0.48


def james_bond_spy_bgm(total_sec: float, S: dict, ev_sec: dict, dir_end: float):
    """Original 1960s James Bond-style Spy Surf-Guitar + Walking Bass + Jazz Drums + Brass + Chase Bongos!"""
    n = int(SR * total_sec)
    bgm = np.zeros(n, dtype=np.float32)

    # Pre-render reusable spy surf-guitar chromatic motif notes (E2, F2, F#2, G2, B2, E3, G3, B3, D#4)
    g_notes = {
        "E2": _spy_twang_note(82.41, 0.34),
        "F2": _spy_twang_note(87.31, 0.34),
        "Fs2": _spy_twang_note(92.50, 0.34),
        "G2": _spy_twang_note(98.00, 0.34),
        "B2": _spy_twang_note(123.47, 0.34),
        "E3": _spy_twang_note(164.81, 0.36),
        "G3": _spy_twang_note(196.00, 0.36),
        "B3": _spy_twang_note(246.94, 0.36),
        "Ds4": _spy_twang_note(311.13, 0.42),
    }
    # Original chromatic espionage vamp (distinct original rhythm, classic 1960s spy vibe!)
    vamp_bass = ["E2", "B2", "E2", "F2", "Fs2", "B2", "F2", "E2"]
    vamp_lead = [None, "E3", None, "G3", "B3", None, "Ds4", "B3"]

    # Reusable brushed jazz snare & chase bongo
    snare = norm(bp(nz(0.085), 1400, 6800) * np.exp(-np.linspace(0, 14, int(SR * 0.085))))
    ride = norm(bp(nz(0.11), 4500, 10500) * np.exp(-np.linspace(0, 12, int(SR * 0.11))))
    tb1 = np.linspace(0, 0.09, int(SR * 0.09), dtype=np.float32)
    bongo_hi = norm(np.sin(2 * np.pi * (340 * np.exp(-tb1 * 18) + 210) * tb1) * np.exp(-tb1 * 22))
    bongo_lo = norm(np.sin(2 * np.pi * (230 * np.exp(-tb1 * 16) + 145) * tb1) * np.exp(-tb1 * 20))

    t_xray0, t_xray1 = S["xray"], S["van"]
    t_chase0, t_chase1 = S["lepas"], ev_sec["kac.ngerem"] - 0.25  # Record scratch halts chase right at brake!
    t_dir0, t_dir1 = S["direktur"], dir_end
    t_end0 = S["akhir"]

    # Opening iconic spy chord + brass hit
    put(bgm, sfx_bond_chord(1.5), 0.08, 0.38)

    step = 0
    t_cur = 0.40
    while t_cur < total_sec - 0.5:
        in_xray = t_xray0 <= t_cur < t_xray1
        in_chase = t_chase0 <= t_cur < t_chase1
        in_post_brake = t_chase1 <= t_cur < t_dir0  # Comedy lull right after record scratch -> playful bass!
        in_dir = t_dir0 <= t_cur < t_dir1
        in_end = t_cur >= t_end0

        # Dynamic tempo per mood!
        b_dur = 0.29 if in_chase else (0.34 if in_dir else (0.44 if in_xray else (0.50 if in_end else 0.39)))

        # 1. Chromatic Spy Surf-Guitar Riff & Walking Upright Bass
        bn = vamp_bass[step % len(vamp_bass)]
        put(bgm, g_notes[bn], t_cur, 0.36 if in_chase else (0.20 if in_end else 0.28))

        # Deep warm upright bass support
        bf_map = {"E2": 82.41, "F2": 87.31, "Fs2": 92.50, "G2": 98.00, "B2": 123.47}
        bf = bf_map[bn]
        bd = min(0.32, b_dur * 0.9)
        tb = np.linspace(0, bd, int(SR * bd), dtype=np.float32)
        ubass = (0.78 * np.sin(2 * np.pi * bf * tb) + 0.22 * np.sin(2 * np.pi * 2 * bf * tb)) * np.exp(-tb * 6.5)
        put(bgm, ubass, t_cur, 0.30 if in_chase else 0.22)

        # 2. High Spy Guitar Twang Melody / Vibraphone Accent
        ln = vamp_lead[step % len(vamp_lead)]
        if ln and not in_end and not in_post_brake:
            put(bgm, g_notes[ln], t_cur, 0.22 if in_chase else 0.16)

        # 3. Brushed Jazz Ride & Snare / Action Chase Bongos!
        if not in_end:
            put(bgm, ride, t_cur, 0.13 if in_chase else 0.08)
            if step % 2 == 1:
                put(bgm, snare, t_cur, 0.17 if in_chase else 0.10)
            if in_chase:
                # Urgent 1960s spy-chase double-time bongos!
                put(bgm, bongo_hi if step % 2 == 0 else bongo_lo, t_cur, 0.20)
                put(bgm, bongo_lo if step % 2 == 0 else bongo_hi, t_cur + b_dur * 0.5, 0.16)
            elif in_xray and step % 4 == 0:
                put(bgm, sfx_sonar_ping(1180.0 + (step % 8) * 45, 0.42), t_cur, 0.14)
            elif in_dir and step % 4 == 0:
                # Tense dramatic timpani rumble under Pak Direktur!
                put(bgm, sfx_bond_brass(164.81, 0.35, intense=True), t_cur, 0.22)

        # Occasional dramatic brass stab on downbeat every 16 steps during sneaking/chase
        if step % 16 == 0 and not in_end and not in_xray and not in_post_brake:
            put(bgm, sfx_bond_brass(164.81, 0.45, intense=in_chase), t_cur, 0.24 if in_chase else 0.15)

        t_cur += b_dur
        step += 1

    # Classic James Bond finale Em(maj9) spy guitar chord right at end!
    put(bgm, sfx_bond_chord(1.8), max(0.0, ev_sec["akh.batal"] + 0.15), 0.34)
    return norm(bgm) * 0.30


def main():
    vdata = json.loads(VOICE_JSON.read_text())
    scenes_raw = vdata["scenes"]

    # 1. Build scene timeline & voice bed (100% IDENTICAL frame counts to V2!)
    scene_meta = {}
    line_placed = []
    t_cursor = 0.0
    for sname in SCENE_ORDER:
        cfg = SCENE_CFG[sname]
        s_start = t_cursor
        t_line = s_start + cfg["pre"]
        sc_lines = scenes_raw[sname]
        placed_sc = []
        for idx, l in enumerate(sc_lines):
            gap = cfg["gaps"][idx] if idx < len(cfg["gaps"]) else 0.22
            if idx > 0:
                t_line += gap
            dur = float(l["duration"])
            item = {
                "scene": sname,
                "idx": idx,
                "voice": l["voice"],
                "style": l["style"],
                "text": l["text"],
                "wav": l["wav"],
                "start": round(t_line, 3),
                "end": round(t_line + dur, 3),
                "startFrame": int(round(t_line * FPS)),
                "endFrame": int(round((t_line + dur) * FPS)),
                "words": [
                    {
                        "word": w["word"],
                        "start": round(t_line + w["start"], 3),
                        "end": round(t_line + w["end"], 3),
                        "startFrame": int(round((t_line + w["start"]) * FPS)),
                        "endFrame": int(round((t_line + w["end"]) * FPS)),
                    }
                    for w in l["words"]
                ],
            }
            placed_sc.append(item)
            line_placed.append(item)
            t_line += dur
        s_end = t_line + cfg["post"]
        scene_meta[sname] = {
            "start": round(s_start, 3),
            "end": round(s_end, 3),
            "startFrame": int(round(s_start * FPS)),
            "endFrame": int(round(s_end * FPS)),
            "durationFrames": int(round(s_end * FPS)) - int(round(s_start * FPS)),
        }
        t_cursor = s_end

    total_sec = t_cursor + 0.25
    total_frames = int(math.ceil(total_sec * FPS))

    # Resolve named trigger events (in seconds & frames)
    ev_sec = {}
    ev_frame = {}
    for k, (sname, lidx, kw, f_off) in EVENTS.items():
        match_line = next(x for x in line_placed if x["scene"] == sname and x["idx"] == lidx)
        t_hit = match_line["start"]
        if kw != "START":
            kw_low = kw.lower()
            for w in match_line["words"]:
                if kw_low in w["word"].lower():
                    t_hit = w["start"]
                    break
        t_hit = max(0.0, t_hit + f_off / FPS)
        ev_sec[k] = round(t_hit, 3)
        ev_frame[k] = int(round(t_hit * FPS))

    # Build 1-2 word dynamic colored captions synced to Whisper words!
    captions = []
    for l in line_placed:
        ws = l["words"]
        i = 0
        while i < len(ws):
            chunk = ws[i : i + 2]
            if len(chunk) == 2 and (len(chunk[0]["word"]) > 9 or chunk[0]["word"].endswith(("!", "?", ".", "..."))):
                chunk = ws[i : i + 1]
            txt = " ".join(x["word"] for x in chunk)
            sf = chunk[0]["startFrame"]
            ef = max(sf + 5, chunk[-1]["endFrame"])
            captions.append({
                "text": txt,
                "voice": l["voice"],
                "style": l["style"],
                "startFrame": sf,
                "endFrame": ef,
            })
            i += len(chunk)

    # 2. Mix Voice + James Bond Spy Foley SFX + Ducking James Bond Spy BGM
    n_tot = int(SR * total_sec)
    voice_bus = np.zeros(n_tot, dtype=np.float32)
    sfx_bus = np.zeros(n_tot, dtype=np.float32)

    for l in line_placed:
        y = read_wav(ROOT / l["wav"])
        y = norm(y) * (0.96 if l["voice"] == "direktur" else 0.90)
        put(voice_bus, y, l["start"], 1.0)

    S = {k: v["start"] for k, v in scene_meta.items()}

    # ===== JAMES BOND SPY STINGS + V2 INSERT & WHIP-PAN FOLEY (45+ CUES!) =====
    # Scene 1: Hook
    put(sfx_bus, sfx_bond_brass(164.81, 0.55), 0.12, 0.58)
    put(sfx_bus, sfx_kaching(), ev_sec["hook.dolar"], 0.72)
    put(sfx_bus, sfx_whip(), ev_sec["hook.dolar"] - 0.30, 0.45)
    put(sfx_bus, sfx_bond_brass(196.00, 0.48, intense=True), ev_sec["hook.kucing"] - 0.10, 0.58)
    put(sfx_bus, sfx_meow(0.55, 680.0), ev_sec["hook.kucing"] + 0.10, 0.88)

    # Scene 2: Lab CIA
    put(sfx_bus, sfx_whip(), S["lab"], 0.55)
    put(sfx_bus, sfx_whip(), ev_sec["lab.meong"] - 0.30, 0.48)
    put(sfx_bus, sfx_whip(), ev_sec["lab.hah"] - 0.12, 0.60)
    put(sfx_bus, sfx_blip(620, 0.12), ev_sec["lab.hah"], 0.45)
    put(sfx_bus, sfx_whip(), ev_sec["lab.nyadap"] + 1.05, 0.48)

    # Scene 3: X-Ray + INSERT #1 (KLIK! MIKROFON!)
    put(sfx_bus, E.sfx_xray(), S["xray"] + 0.05, 0.58)
    put(sfx_bus, sfx_gadget_click(), ev_sec["xr.kuping"] - 0.10, 0.82)
    put(sfx_bus, sfx_meow(0.32, 540.0), ev_sec["xr.kuping"] + 0.35, 0.52)  # Annoyed mrrp!
    put(sfx_bus, sfx_blip(980), ev_sec["xr.pemancar"], 0.62)
    put(sfx_bus, sfx_blip(1240), ev_sec["xr.ekor"], 0.66)
    put(sfx_bus, sfx_whip(), ev_sec["xr.ekor"] - 0.25, 0.48)
    put(sfx_bus, sfx_whip(), ev_sec["xr.yakin"] - 0.25, 0.48)
    put(sfx_bus, sfx_whip(), ev_sec["xr.profesional"] - 0.78, 0.48)

    # Scene 4: Surveillance Van + INSERT #2 (SRAAK!! MISI MULAI!)
    put(sfx_bus, sfx_whip(), S["van"], 0.55)
    put(sfx_bus, sfx_radio_static(0.24), S["van"] + 0.20, 0.45)
    put(sfx_bus, sfx_van_door(0.75), ev_sec["van.pintu"] - 0.06, 0.85)
    put(sfx_bus, sfx_bond_brass(164.81, 0.52, intense=True), ev_sec["van.pintu"] + 0.05, 0.62)
    put(sfx_bus, sfx_sizzle(1.6), ev_sec["van.ikan"] - 0.35, 0.58)
    put(sfx_bus, sfx_whip(), ev_sec["van.ikan"] - 1.15, 0.45)

    # Scene 5: Washington Park Chase
    put(sfx_bus, sfx_bond_brass(220.0, 0.45, intense=True), ev_sec["lep.apa"] - 0.05, 0.65)
    put(sfx_bus, sfx_whip(), ev_sec["lep.apa"], 0.62)
    put(sfx_bus, sfx_meow(0.42, 790.0), ev_sec["lep.belok"], 0.82)
    put(sfx_bus, sfx_whip(), ev_sec["lep.belok"] + 0.30, 0.50)
    put(sfx_bus, sfx_taxi_horn(), ev_sec["lep.taksi"] - 0.12, 0.68)

    # Scene 6: INSERT #3 (CIIIT!! NYARIS!!) + Fish Cart Leap + INSERT #4 (KRES-KRES!!)
    put(sfx_bus, sfx_record_scratch(0.36), ev_sec["kac.ngerem"] - 0.24, 0.88)
    put(sfx_bus, sfx_tire_screech(0.92), ev_sec["kac.ngerem"] - 0.10, 0.86)
    put(sfx_bus, sfx_taxi_horn(), ev_sec["kac.ngerem"] + 0.36, 0.68)
    put(sfx_bus, sfx_whip(), ev_sec["kac.gerobak"] - 0.20, 0.52)
    put(sfx_bus, sfx_sizzle(1.9), ev_sec["kac.gerobak"] - 0.10, 0.56)
    put(sfx_bus, sfx_blip(1450, 0.12), ev_sec["kac.radar"], 0.65)
    put(sfx_bus, sfx_blip(1680, 0.14), ev_sec["kac.tongkol"] - 0.65, 0.62)
    put(sfx_bus, sfx_crunch(0.75), ev_sec["kac.tongkol"] - 0.62, 0.88)  # Right on Insert #4 KRES-KRES!
    put(sfx_bus, sfx_meow(0.40, 700.0), ev_sec["kac.tongkol"] - 0.10, 0.65)

    # Scene 7: Pak Direktur CIA Explosion (Radio Static + Brass Sting + Desk Slam BRAAK!! + Steam!)
    put(sfx_bus, sfx_radio_static(0.32), ev_sec["dir.headset"] + 0.10, 0.68)
    put(sfx_bus, sfx_meow(0.45, 720.0), ev_sec["dir.siapa"] - 0.42, 0.76)
    put(sfx_bus, sfx_crunch(0.60), ev_sec["dir.siapa"] - 0.22, 0.76)
    put(sfx_bus, sfx_bond_brass(146.83, 0.68, intense=True), ev_sec["dir.siapa"] - 0.04, 0.76)
    put(sfx_bus, sfx_desk_slam(), ev_sec["dir.siapa"] + 0.80, 0.85)  # Synced to BRAAK!! emote
    put(sfx_bus, sfx_steam_anger(0.90), ev_sec["dir.ikan"] + 0.20, 0.74)

    # Scene 8: Finale (DIBATALKAN Stamp + Dollar Rain + Bond Chord + Sad Trombone + Smug Meow!)
    put(sfx_bus, sfx_stamp_thud(), ev_sec["akh.batal"], 0.78)
    put(sfx_bus, sfx_whip(), ev_sec["akh.fakta"] - 0.20, 0.48)
    put(sfx_bus, sfx_kaching(), ev_sec["akh.melayang"], 0.62)
    put(sfx_bus, sfx_bond_chord(1.4), ev_sec["akh.meong"] - 0.45, 0.45)
    put(sfx_bus, sfx_meow(0.52, 620.0), ev_sec["akh.meong"] + 0.12, 0.80)
    put(sfx_bus, sfx_sad_wah(0.98), ev_sec["akh.meong"] + 0.45, 0.72)

    # James Bond 1960s Spy Soundtrack with smooth sidechain ducking under voice!
    bgm = james_bond_spy_bgm(total_sec, S, ev_sec, scene_meta["direktur"]["end"])
    env_voice = np.abs(voice_bus)
    win = int(SR * 0.14)
    smooth_v = np.convolve(env_voice, np.ones(win) / win, mode="same")
    duck = 1.0 - np.clip(smooth_v * 5.2, 0.0, 0.56)
    mix = voice_bus + sfx_bus * 0.78 + bgm * duck
    mix = np.tanh(mix * 1.06) * 0.92

    tmp_wav = Path("/tmp/kucing_master_raw.wav")
    with wave.open(str(tmp_wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())

    OUT_MP3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(tmp_wav),
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=9",
            "-b:a", "192k", str(OUT_MP3),
        ],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    timing = {
        "fps": FPS,
        "totalFrames": total_frames,
        "totalSec": round(total_sec, 3),
        "scenes": scene_meta,
        "events": ev_frame,
        "eventsSec": ev_sec,
        "lines": line_placed,
        "captions": captions,
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=2, ensure_ascii=False))
    print(f"MASTER AUDIO OK: {OUT_MP3} ({total_sec:.2f}s / {total_frames}f, {len(captions)} captions)", flush=True)


if __name__ == "__main__":
    main()

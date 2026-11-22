"""Mix audio + jadwal adegan "Perang Emu 1932".

Masukan : src/emu_voice.json + out/voice/emu/*.wav (dari scripts/voice_vox.py, VoxCPM2).
Keluaran: public/audio/emu_master.mp3 dan src/emu_timing.json (durasi adegan, frame kalimat & kata, event aksi).
Event aksi didefinisikan sekali (EVENTS) dan dipakai bersama oleh efek suara (di sini) dan animasi (scenesEmu.tsx),
jadi suara & gerakan selalu sinkron. Semua efek suara disintesis (tanpa file luar), tawa diambil dari exports/riset/tawa.
"""
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
FPS = 30
VOICE_JSON = ROOT / "src" / "emu_voice.json"
TIMING_JSON = ROOT / "src" / "emu_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "emu_master.mp3"

# jeda per adegan (detik): sebelum kalimat pertama, setelah kalimat terakhir, dan jeda sebelum tiap kalimat
SCENE_CFG = {
    "hook": dict(pre=0.35, post=0.7, gaps=[0, 0.12]),
    "serbu": dict(pre=0.6, post=1.2, gaps=[0, 0.35]),
    "kantor": dict(pre=0.5, post=1.1, gaps=[0, 0.3, 0.55]),
    "datang": dict(pre=1.3, post=1.1, gaps=[0]),
    "gerilya": dict(pre=0.4, post=1.1, gaps=[0, 0.35]),
    "bendungan": dict(pre=0.6, post=1.2, gaps=[0, 0.4, 1.1, 0.7]),
    "truk": dict(pre=0.5, post=1.1, gaps=[0, 0.7, 0.45]),
    "kutipan": dict(pre=0.35, post=1.0, gaps=[0, 0.3, 0.5]),
    "akhir": dict(pre=0.5, post=2.8, gaps=[0, 0.45, 0.8]),
}
# event: (adegan, indeks kalimat, kata pemicu | "START" | "END", geser frame)
EVENTS = {
    "hook.salute": ("hook", 0, "perang", -10),
    "hook.emu": ("hook", 1, "burung", -14),
    "serbu.veteran": ("serbu", 0, "veteran", -6),
    "serbu.fence": ("serbu", 1, "pagar", -3),
    "serbu.peck": ("serbu", 1, "gandum", -2),
    "serbu.rabbit": ("serbu", 1, "kelinci", -3),
    "serbu.hat": ("serbu", 1, "END", 4),
    "kantor.arrive": ("kantor", 0, "menteri", 6),
    "kantor.slam": ("kantor", 1, "kirim", -2),
    "kantor.grab": ("kantor", 2, "menteri", -4),
    "kantor.stamp": ("kantor", 2, "setuju", -1),
    "datang.stop": ("datang", 0, "meredith", -8),
    "datang.lewis": ("datang", 0, "lewis", -10),
    "datang.ammo": ("datang", 0, "peluru", -16),
    "gerilya.look": ("gerilya", 0, "tidak", -2),
    "gerilya.split": ("gerilya", 1, "berpencar", -3),
    "gerilya.aim": ("gerilya", 1, "gerilya", -4),
    "bendungan.wait": ("bendungan", 0, "menunggu", 0),
    "bendungan.fire": ("bendungan", 1, "tembak", -2),
    "bendungan.jam": ("bendungan", 2, "macet", -6),
    "bendungan.cock": ("bendungan", 2, "END", 4),
    "bendungan.turn": ("bendungan", 3, "emunya", -3),
    "bendungan.flee": ("bendungan", 3, "kabur", -2),
    "truk.mount": ("truk", 0, "dipasang", -6),
    "truk.drive": ("truk", 0, "END", 4),
    "truk.wild": ("truk", 1, "tidak", -2),
    "truk.overtake": ("truk", 2, "emu", -3),
    "truk.speed": ("truk", 2, "kilometer", -12),
    "truk.stop": ("truk", 2, "END", 6),
    "kutipan.talk": ("kutipan", 1, "START", 0),
    "kutipan.write": ("kutipan", 1, "burung", -4),
    "kutipan.paper": ("kutipan", 2, "koran", -3),
    "kutipan.tarik": ("kutipan", 2, "ditarik", -3),
    "kutipan.kirim": ("kutipan", 2, "dikirim", -3),
    "kutipan.pulang": ("kutipan", 2, "pulang", -3),
    "akhir.walk": ("akhir", 1, "jadi", 0),
    "akhir.pick": ("akhir", 1, "ini", -2),
    "akhir.wear": ("akhir", 2, "emu", -3),
    "akhir.title": ("akhir", 2, "END", 10),
}


def norm_word(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def align_script(text, wsec, dur):
    """Kata naskah (ejaan benar) diberi waktu dari transkrip whisper lewat posisi huruf proporsional."""
    script = text.split()
    if not wsec:
        n = len(script)
        return [(w, dur * i / n, dur * (i + 1) / n) for i, w in enumerate(script)]
    # garis waktu huruf whisper
    marks = []
    tot = sum(max(1, len(norm_word(w))) for w, _, _ in wsec)
    acc = 0
    for w, a, b in wsec:
        L = max(1, len(norm_word(w)))
        marks.append((acc / tot, a))
        acc += L
        marks.append((acc / tot, b))
    xs = [m[0] for m in marks]
    ts = [m[1] for m in marks]
    stot = sum(max(1, len(norm_word(w))) for w in script)
    out = []
    acc = 0
    for w in script:
        L = max(1, len(norm_word(w)))
        a = float(np.interp(acc / stot, xs, ts))
        acc += L
        b = float(np.interp(acc / stot, xs, ts))
        out.append((w, a, b))
    return out


def load_wav(path):
    with wave.open(str(path)) as wf:
        sr = wf.getframerate()
        x = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32767
    if sr != SR:
        x = signal.resample_poly(x, SR, sr).astype(np.float32)
    return x


def load_mp3(path, rate=1.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(int(SR / rate)), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


# ---------------- helper DSP ----------------
def _sos(kind, f, order=4):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def lp(x, f):
    return signal.sosfilt(_sos("low", f), x).astype(np.float32)


def hp(x, f):
    return signal.sosfilt(_sos("high", f), x).astype(np.float32)


def bp(x, lo, hi):
    return signal.sosfilt(_sos("band", [lo, hi]), x).astype(np.float32)


def nz(n, seed):
    return np.random.default_rng(seed).standard_normal(n).astype(np.float32)


def env_ad(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    return (np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)).astype(np.float32)


def norm(x, peak=0.9):
    return (x / (np.max(np.abs(x)) + 1e-9) * peak).astype(np.float32)


def put(out, clip, t, gain=1.0, pan=0.0):
    i0 = int(round(t * SR))
    if i0 >= len(out) or len(clip) == 0:
        return
    if i0 < 0:
        clip = clip[-i0:]
        i0 = 0
    n = min(len(clip), len(out) - i0)
    l = np.sqrt(0.5 * (1 - pan))
    r = np.sqrt(0.5 * (1 + pan))
    out[i0 : i0 + n, 0] += clip[:n] * gain * l * 1.414
    out[i0 : i0 + n, 1] += clip[:n] * gain * r * 1.414


# ---------------- efek suara ----------------
def sfx_wind(dur, seed=1):
    n = int(SR * dur)
    x = lp(nz(n, seed), 500) * (0.6 + 0.4 * np.sin(np.linspace(0, dur * 0.9, n)) ** 2)
    return norm(x, 0.5)


def sfx_rustle(dur, seed=2):
    n = int(SR * dur)
    x = bp(nz(n, seed), 2500, 9000) * (0.3 + 0.7 * np.abs(np.sin(np.linspace(0, dur * 3.1, n))))
    return norm(x, 0.4)


def sfx_thump(seed=3, f=70):
    n = int(SR * 0.25)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f + 40 * np.exp(-t * 30)) * t) * np.exp(-t * 22) + lp(nz(n, seed), 600) * np.exp(-t * 40) * 0.5
    return norm(x, 0.9)


def sfx_herd(dur, rate=14, seed=4):
    out = np.zeros(int(SR * (dur + 0.3)), np.float32)
    rng = np.random.default_rng(seed)
    t = 0.0
    while t < dur:
        th = sfx_thump(int(rng.integers(0, 999)), f=rng.uniform(55, 95)) * rng.uniform(0.4, 1.0)
        i = int(t * SR)
        out[i : i + len(th)] += th[: len(out) - i]
        t += rng.exponential(1.0 / rate)
    return norm(out, 0.8)


def sfx_emu_boom(n_pulses=5, seed=5):
    """dengung khas emu: denyut rendah ~70 Hz"""
    out = []
    rng = np.random.default_rng(seed)
    for i in range(n_pulses):
        d = rng.uniform(0.12, 0.2)
        m = int(SR * d)
        t = np.arange(m) / SR
        f = rng.uniform(62, 78)
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.sin(np.pi * t / d) ** 2
        out += [x, np.zeros(int(SR * rng.uniform(0.05, 0.12)))]
    return norm(lp(np.concatenate(out).astype(np.float32), 400), 0.8)


def sfx_crack(seed=6):
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    snap = bp(nz(n, seed), 1500, 7000) * np.exp(-t * 35)
    wood = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 18) + np.sin(2 * np.pi * 410 * t) * np.exp(-t * 25) * 0.5
    creak = np.sin(2 * np.pi * (300 + 120 * np.sin(2 * np.pi * 9 * t)) * t) * np.exp(-t * 5) * 0.25
    return norm(snap + wood + creak, 0.9)


def sfx_tik(f=2500, seed=7, d=0.04):
    n = int(SR * d * 3)
    t = np.arange(n) / SR
    return norm(bp(nz(n, seed), f * 0.6, min(f * 1.8, 18000)) * np.exp(-t / d * 3) + np.sin(2 * np.pi * f * t) * np.exp(-t * 80) * 0.4, 0.8)


def sfx_boing(f0=380, dur=0.35):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.6 * np.exp(-t * 12) * np.sin(2 * np.pi * 14 * t))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8), 0.7)


def sfx_door(seed=8):
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    f = 420 + 180 * np.sin(2 * np.pi * 1.2 * t) + 30 * np.sin(2 * np.pi * 37 * t)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 * np.exp(-t * 2.5)
    return norm(bp(x.astype(np.float32), 300, 3000), 0.6)


def sfx_slam(seed=9):
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (95 + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 14) + lp(nz(n, seed), 1500) * np.exp(-t * 30) * 0.8
    rattle = bp(nz(n, seed + 1), 3000, 9000) * np.exp(-t * 12) * 0.25 * (np.sin(2 * np.pi * 26 * t) > 0)
    return norm(np.tanh((x + rattle) * 1.5), 0.95)


def sfx_stamp(seed=10):
    n = int(SR * 0.4)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (140 + 80 * np.exp(-t * 50)) * t) * np.exp(-t * 25) + bp(nz(n, seed), 400, 2500) * np.exp(-t * 45) * 0.7
    return norm(x, 0.9)


def sfx_engine(dur, f0=38.0, seed=11, rev=1.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = f0 * rev * (1 + 0.05 * np.sin(2 * np.pi * 0.7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph) * 0.6 + np.sin(ph * 0.5) * 0.4 + lp(nz(n, seed), 300) * 0.4
    x *= 0.75 + 0.25 * np.abs(np.sin(ph * 2))
    return norm(lp(x.astype(np.float32), 900), 0.7)


def sfx_brake(seed=12):
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (1900 + 200 * np.sin(2 * np.pi * 7 * t)) * t) * np.exp(-t * 4) * 0.3 + bp(nz(n, seed), 600, 3000) * np.exp(-t * 3) * 0.4
    return norm(x, 0.6)


def sfx_gun(seed=13):
    """satu letupan senapan Lewis (.303)"""
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    crack = bp(nz(n, seed), 900, 9000) * np.exp(-t * 70)
    boom = np.sin(2 * np.pi * (120 * np.exp(-t * 14) + 45) * t) * np.exp(-t * 11)
    tail = lp(nz(n, seed + 1), 1200) * np.exp(-t * 7) * 0.3
    return norm(np.tanh((crack * 1.3 + boom + tail) * 1.5), 0.9)


def sfx_burst(dur, rate=10.0, seed=14):
    out = np.zeros(int(SR * (dur + 0.6)), np.float32)
    k = 0
    t = 0.0
    while t < dur:
        g = sfx_gun(seed + k) * (0.8 + 0.2 * np.sin(k))
        i = int(t * SR)
        out[i : i + len(g)] += g[: len(out) - i]
        k += 1
        t += 1.0 / rate
    return norm(np.tanh(out * 0.8), 0.95)


def sfx_tinkle(n=6, seed=15):
    out = np.zeros(int(SR * 1.2), np.float32)
    rng = np.random.default_rng(seed)
    for i in range(n):
        f = rng.uniform(3500, 6500)
        m = int(SR * 0.12)
        t = np.arange(m) / SR
        x = np.sin(2 * np.pi * f * t) * np.exp(-t * 40)
        j = int(rng.uniform(0, 1.0) * SR)
        out[j : j + m] += x[: len(out) - j] * rng.uniform(0.3, 0.8)
    return norm(out, 0.5)


def sfx_whiz(seed=16):
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = 2600 * np.exp(-t * 3)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.35) * 0.4 + bp(nz(n, seed), 2000, 6000) * np.sin(np.pi * t / 0.35) * 0.3, 0.5)


def sfx_clack(seed=17):
    n = int(SR * 0.18)
    t = np.arange(n) / SR
    return norm(bp(nz(n, seed), 1800, 8000) * np.exp(-t * 60) + np.sin(2 * np.pi * 1100 * t) * np.exp(-t * 70) * 0.5, 0.9)


def sfx_scribble(dur, seed=18):
    n = int(SR * dur)
    t = np.arange(n) / SR
    am = 0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 5.5 * t + np.sin(2 * np.pi * 1.3 * t)))
    return norm(bp(nz(n, seed), 2500, 8000) * am, 0.35)


def sfx_paper(seed=19):
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    crk = bp(nz(n, seed), 1500, 9000) * (np.random.default_rng(seed).random(n) > 0.985) * 4
    return norm(crk * np.exp(-t * 3) + bp(nz(n, seed + 1), 800, 5000) * np.exp(-t * 5) * 0.3, 0.6)


def sfx_swoosh(dur=0.35, seed=20):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(nz(n, seed), 400, 5000) * np.sin(np.pi * t / dur) ** 2
    return norm(x, 0.5)


def sfx_beep(f=1760, dur=0.12):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * f * t) * np.minimum(1, (dur - t) / 0.02) * np.minimum(1, t / 0.005), 0.4)


def sfx_hud(n=2):
    return np.concatenate([np.concatenate([sfx_beep(1568, 0.07), np.zeros(int(SR * 0.04), np.float32)]) for _ in range(n)])


def sfx_xray():
    n = int(SR * 0.8)
    t = np.arange(n) / SR
    f = 300 + 1600 * t
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2) * 0.5 + bp(nz(n, 21), 3000, 9000) * np.exp(-t * 4) * 0.2, 0.5)


def sfx_wahwah():
    out = []
    for i, f in enumerate([392, 370, 349, 311]):
        d = 0.32 if i < 3 else 0.9
        m = int(SR * d)
        t = np.arange(m) / SR
        vib = 1 + (0.02 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x = signal.sawtooth(ph) * 0.5 + np.sin(ph) * 0.5
        wah = 0.5 + 0.5 * np.sin(2 * np.pi * (2.5 if i == 3 else 3.1) * t - np.pi / 2)
        x = lp(x.astype(np.float32), 900) * (0.4 + 0.6 * wah) * np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
        out.append(x)
    return norm(np.concatenate(out), 0.6)


def sfx_fanfare():
    notes = [(523.3, 0.12), (659.3, 0.12), (784.0, 0.12), (1046.5, 0.6)]
    out = []
    for f, d in notes:
        m = int(SR * d)
        t = np.arange(m) / SR
        ph = 2 * np.pi * f * t
        x = (signal.sawtooth(ph) * 0.4 + np.sin(ph) * 0.6) * np.minimum(1, t / 0.01) * np.exp(-t * (1.5 if d > 0.3 else 6))
        out.append(lp(x.astype(np.float32), 3500))
    return norm(np.concatenate(out), 0.6)


def sfx_tick_clock(dur):
    out = np.zeros(int(SR * dur), np.float32)
    for k in range(int(dur)):
        c = sfx_tik(3200, 30 + k, 0.02) * (0.6 if k % 2 else 0.4)
        i = int(k * SR)
        out[i : i + len(c)] += c[: len(out) - i]
    return out


def sfx_fan(dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return norm(lp(nz(n, 31), 700) * (0.7 + 0.3 * np.sin(2 * np.pi * 4 * t)), 0.3)


def sfx_water(dur):
    n = int(SR * dur)
    x = bp(nz(n, 32), 600, 4000) * (0.5 + 0.5 * np.abs(np.sin(np.linspace(0, dur * 2.3, n))))
    return norm(x, 0.35)


def sfx_fire(dur):
    n = int(SR * dur)
    rng = np.random.default_rng(33)
    crk = (rng.random(n) > 0.9993).astype(np.float32)
    crk = signal.lfilter([1], [1, -0.97], crk) * bp(nz(n, 34), 1500, 7000)
    return norm(lp(nz(n, 35), 400) * 0.4 + crk * 3, 0.4)


# ---------------- musik: mars jenaka (snare + tuba oom-pah + glockenspiel) ----------------
def music_bed(total, ip_t, ip_v, mutes):
    N = int(SR * total) + SR
    out = np.zeros((N, 2), np.float32)
    bpm = 116.0
    beat = 60.0 / bpm
    # F mayor: progresi I - V - I - IV
    chords = [(87.31, 130.81), (130.81, 98.0), (87.31, 130.81), (116.54, 87.31)]
    melody = [698.5, 784.0, 880.0, 698.5, 1046.5, 880.0, 784.0, 659.3, 698.5, 880.0, 784.0, 587.3, 523.3, 587.3, 659.3, 698.5]

    def muted(t):
        return any(a <= t <= b for a, b in mutes)

    def tuba(f, d):
        m = int(SR * d)
        t = np.arange(m) / SR
        ph = 2 * np.pi * f * t
        x = (np.sin(ph) + 0.35 * signal.sawtooth(ph)) * np.minimum(1, t / 0.015) * np.exp(-t * 3.5)
        return lp(x.astype(np.float32), 600)

    def snare(seed, accent=1.0):
        m = int(SR * 0.16)
        t = np.arange(m) / SR
        x = bp(nz(m, seed), 1500, 8000) * np.exp(-t * 28) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4
        return x * accent

    def glock(f, d=0.5):
        m = int(SR * d)
        t = np.arange(m) / SR
        x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 8)) * np.exp(-t * 4.5)
        return x.astype(np.float32)

    k = 0
    t = 0.0
    while t < total:
        inten = float(np.interp(t, ip_t, ip_v))
        if not muted(t) and inten > 0.03:
            bar = k // 4
            pos = k % 4
            root, fifth = chords[bar % 4]
            if pos in (0, 2):
                put(out, tuba(root if pos == 0 else fifth, beat * 0.9) * 0.55 * inten, t, 1.0, -0.1)
            # snare: ketukan 2 & 4 + gulungan kecil
            if pos in (1, 3):
                put(out, snare(k, 0.55) * inten, t, 1.0, 0.15)
                if pos == 3 and bar % 2 == 1:
                    for j in range(3):
                        put(out, snare(k * 7 + j, 0.25) * inten, t + beat * (0.5 + j / 6), 1.0, 0.15)
            if inten > 0.45:
                f = melody[(k // 2) % len(melody)]
                if k % 2 == 0:
                    put(out, glock(f) * 0.22 * inten, t, 1.0, 0.3)
        k += 1
        t += beat
    return out


def main():
    V = json.loads(VOICE_JSON.read_text())
    order = [s["scene"] for s in V["scenes"]]
    # 1) susun ulang kalimat per adegan dengan jeda sesuai SCENE_CFG
    timing = {"fps": FPS, "order": order, "scenes": {}, "lines": {}, "events": {}}
    clips = []
    cur = 0.0
    for sc in V["scenes"]:
        cfg = SCENE_CFG[sc["scene"]]
        start = cur
        t = cfg["pre"]
        lines = []
        for i, ln in enumerate(sc["lines"]):
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.3
            y = load_wav(ROOT / ln["file"])
            d = len(y) / SR
            words = [{"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))} for w, a, b in align_script(ln["text"], ln["wordsSec"], d)]
            lines.append({"text": ln["text"], "style": ln["style"], "from": int(round(t * FPS)), "to": int(round((t + d) * FPS)), "words": words})
            clips.append((start + t, y))
            t += d
        t += cfg["post"]
        dur_f = int(round(t * FPS))
        timing["scenes"][sc["scene"]] = {"from": int(round(start * FPS)), "dur": dur_f}
        timing["lines"][sc["scene"]] = lines
        cur = start + dur_f / FPS
    total = cur
    timing["total"] = int(round(total * FPS))

    # 2) event aksi (frame relatif adegan)
    def ev_frame(scene, li, word, off):
        ln = timing["lines"][scene][li]
        if word == "START":
            return ln["from"] + off
        if word == "END":
            return ln["to"] + off
        key = norm_word(word)
        for w in ln["words"]:
            if norm_word(w["w"]).startswith(key):
                return w["from"] + off
        # cadangan: posisi huruf di teks
        txt = ln["text"].lower()
        idx = txt.find(word.lower())
        frac = idx / max(1, len(txt)) if idx >= 0 else 0.5
        print(f"  ! kata '{word}' tidak ditemukan di {scene}[{li}], pakai perkiraan posisi teks")
        return int(ln["from"] + frac * (ln["to"] - ln["from"])) + off

    for name, (scene, li, word, off) in EVENTS.items():
        timing["events"][name] = ev_frame(scene, li, word, off)
    TIMING_JSON.write_text(json.dumps(timing, indent=1, ensure_ascii=False))

    S = {k: v["from"] / FPS for k, v in timing["scenes"].items()}
    E = {k: S[k.split(".")[0]] + v / FPS for k, v in timing["events"].items()}
    LT = lambda sc, i, which="from": S[sc] + timing["lines"][sc][i][which] / FPS
    END = {k: S[k] + v["dur"] / FPS for k, v in timing["scenes"].items()}
    print(f"Total {total:.1f}s ({timing['total']} frame)")
    for k in order:
        print(f"  {k:10s} {timing['scenes'][k]['dur']:4d}f  mulai {S[k]:.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    for t0, y in clips:
        put(vo, y, t0, 1.0)

    # 3) efek suara mengikuti event
    for k in ["hook", "serbu", "datang", "bendungan", "truk", "kutipan", "akhir"]:
        put(sfx, sfx_wind(END[k] - S[k] + 0.3, hash(k) % 97), S[k], 0.22)
    for k in ["hook", "serbu", "akhir"]:
        put(sfx, sfx_rustle(END[k] - S[k], hash(k) % 89), S[k], 0.12, 0.3)
    for k in order[1:]:
        put(sfx, sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.2, 0.3)
    put(sfx, sfx_tik(1800, 1), E["hook.salute"] + 0.25, 0.25)
    put(sfx, sfx_rustle(0.5, 9), E["hook.emu"], 0.45, 0.4)
    put(sfx, sfx_boing(520, 0.3), E["hook.emu"] + 0.45, 0.35, 0.4)
    put(sfx, sfx_emu_boom(4, 3), E["hook.emu"] + 0.8, 0.5, 0.3)
    put(sfx, sfx_herd(2.6, 16, 4), S["serbu"] + 0.05, 0.55)
    put(sfx, sfx_emu_boom(6, 6), S["serbu"] + 0.8, 0.45, -0.3)
    put(sfx, sfx_door(), E["serbu.veteran"] - 0.2, 0.4, -0.2)
    put(sfx, sfx_crack(), E["serbu.fence"] + 0.1, 0.8)
    for j in range(8):
        put(sfx, sfx_tik(2600 + 300 * (j % 3), 40 + j), E["serbu.peck"] + 0.08 + j * 0.13, 0.35, 0.3 * ((j % 2) * 2 - 1))
    for j in range(4):
        put(sfx, sfx_boing(700 + 60 * j, 0.18), E["serbu.rabbit"] + 0.1 + j * 0.2, 0.25, 0.5)
    put(sfx, sfx_thump(50, 60), E["serbu.hat"] + 0.35, 0.6)
    # kantor
    put(sfx, sfx_tick_clock(END["kantor"] - S["kantor"]), S["kantor"], 0.25, 0.4)
    put(sfx, sfx_fan(END["kantor"] - S["kantor"]), S["kantor"], 0.25)
    put(sfx, sfx_door(), S["kantor"] + 0.05, 0.35, -0.4)
    for j in range(6):
        put(sfx, sfx_thump(60 + j, 140), S["kantor"] + 0.25 + j * 0.36, 0.25, -0.2)
    put(sfx, sfx_slam(), E["kantor.slam"] + 0.07, 1.0)
    put(sfx, sfx_tinkle(3, 9), E["kantor.slam"] + 0.12, 0.3)
    put(sfx, sfx_swoosh(0.25, 70), E["kantor.stamp"] - 0.35, 0.35)
    put(sfx, sfx_stamp(), E["kantor.stamp"] + 0.03, 1.0)
    put(sfx, sfx_hud(2), E["kantor.stamp"] + 0.2, 0.4)
    # datang
    put(sfx, sfx_engine(E["datang.stop"] - S["datang"] + 0.3), S["datang"], 0.55, 0.3)
    put(sfx, sfx_brake(), E["datang.stop"] - 0.3, 0.45, 0.2)
    put(sfx, sfx_engine(1.5, 30, 12, 0.8) * np.linspace(1, 0, int(SR * 1.5)).astype(np.float32), E["datang.stop"], 0.35)
    put(sfx, sfx_door(), E["datang.stop"] + 0.25, 0.3)
    put(sfx, sfx_clack(1), E["datang.lewis"] + 0.35, 0.6)
    put(sfx, sfx_hud(2), E["datang.lewis"] + 0.33, 0.35)
    put(sfx, sfx_thump(71, 90), E["datang.ammo"] + 0.6, 0.7)
    put(sfx, sfx_hud(3), E["datang.ammo"] + 0.53, 0.35)
    # gerilya (peta hologram)
    put(sfx, sfx_xray(), S["gerilya"] + 0.05, 0.4)
    put(sfx, sfx_hud(2), E["gerilya.look"], 0.35)
    put(sfx, sfx_herd(1.6, 18, 80), E["gerilya.split"] + 0.1, 0.4)
    for j in range(5):
        put(sfx, sfx_beep(1200 - j * 120, 0.08), E["gerilya.aim"] + 0.12 + j * 0.16, 0.3)
    # bendungan
    put(sfx, sfx_water(END["bendungan"] - S["bendungan"]), S["bendungan"], 0.3)
    for j in range(10):
        put(sfx, sfx_tik(1500 + 200 * (j % 4), 90 + j, 0.03), S["bendungan"] + 0.4 + j * 0.42, 0.2, 0.3)
    put(sfx, sfx_clack(5), E["bendungan.wait"] + 0.1, 0.35)
    fire_t = E["bendungan.fire"] + 0.12
    burst_len = max(0.5, E["bendungan.jam"] - fire_t - 0.45)
    put(sfx, sfx_burst(burst_len, 10.0, 14), fire_t, 0.95)
    put(sfx, sfx_tinkle(10, 15), fire_t + 0.2, 0.35, 0.4)
    for j in range(3):
        put(sfx, sfx_whiz(60 + j), fire_t + 0.1 + j * 0.25, 0.25, 0.6)
    put(sfx, sfx_xray(), E["bendungan.jam"] + 0.05, 0.5)
    put(sfx, sfx_hud(3), E["bendungan.jam"] + 0.25, 0.4)
    for j in range(4):
        put(sfx, sfx_clack(20 + j), E["bendungan.cock"] + 0.1 + j * 0.22, 0.75)
    put(sfx, sfx_emu_boom(3, 11), E["bendungan.turn"] + 0.1, 0.5)
    put(sfx, sfx_herd(1.8, 9, 12), E["bendungan.flee"] + 0.1, 0.4)
    # truk
    put(sfx, sfx_clack(30), E["truk.mount"] + 0.45, 0.6)
    put(sfx, sfx_thump(31, 120), E["truk.mount"] + 0.5, 0.5)
    drive_end = E["truk.stop"]
    put(sfx, sfx_engine(drive_end - E["truk.drive"] + 0.2, 46, 40, 1.3), E["truk.drive"], 0.5)
    tb = E["truk.drive"] + 0.3
    while tb < drive_end:
        put(sfx, sfx_thump(int(tb * 100), 55), tb, 0.45)
        put(sfx, sfx_tinkle(2, int(tb * 10)), tb, 0.12)
        tb += 0.38
    put(sfx, sfx_burst(1.4, 9.0, 50), E["truk.wild"] + 0.05, 0.6)
    for j in range(4):
        put(sfx, sfx_whiz(70 + j), E["truk.wild"] + 0.15 + j * 0.3, 0.3, -0.5 + j * 0.3)
    put(sfx, sfx_herd(2.0, 16, 41), E["truk.overtake"], 0.45)
    put(sfx, sfx_hud(3), E["truk.speed"] + 0.1, 0.4)
    put(sfx, sfx_brake(), drive_end - 0.2, 0.55)
    put(sfx, sfx_slam(43), drive_end + 0.1, 0.45)
    # kutipan
    put(sfx, sfx_fire(END["kutipan"] - S["kutipan"]), S["kutipan"], 0.3, -0.4)
    put(sfx, sfx_scribble(LT("kutipan", 1, "to") - E["kutipan.write"]), E["kutipan.write"] + 0.15, 0.55, 0.2)
    put(sfx, sfx_paper(), E["kutipan.paper"] + 0.05, 0.6)
    T = ROOT / "exports" / "riset" / "tawa"
    if (T / "tawa_raja.mp3").exists():
        put(vo, norm(load_mp3(T / "tawa_raja.mp3", 1.0), 0.35), E["kutipan.paper"] + 0.35, 0.55, -0.2)
    if (T / "tawa_istana_ramai.mp3").exists():
        put(vo, norm(load_mp3(T / "tawa_istana_ramai.mp3", 1.0), 0.3)[: int(SR * 1.8)], E["kutipan.paper"] + 0.5, 0.35, 0.3)
    for k in ["kutipan.tarik", "kutipan.kirim", "kutipan.pulang"]:
        put(sfx, sfx_hud(2), E[k] + 0.1, 0.35)
        put(sfx, sfx_engine(1.0, 44, hash(k) % 50, 1.2) * np.hanning(int(SR * 1.0)).astype(np.float32), E[k] + 0.1, 0.35)
    # akhir
    for j in range(10):
        put(sfx, sfx_tik(2400 + 300 * (j % 3), 140 + j), S["akhir"] + 0.5 + j * 0.37, 0.25, 0.4 * ((j % 2) * 2 - 1))
    put(sfx, sfx_tinkle(8, 77), S["akhir"] + 0.4, 0.2)
    for j in range(4):
        put(sfx, sfx_thump(150 + j, 110), E["akhir.walk"] + j * 0.3, 0.3)
    put(sfx, sfx_tik(1200, 160), E["akhir.pick"] + 0.08, 0.5)
    put(sfx, sfx_swoosh(0.3, 161), E["akhir.wear"] - 0.1, 0.4)
    put(sfx, sfx_boing(450, 0.3), E["akhir.wear"] + 0.12, 0.45)
    put(sfx, sfx_wahwah(), E["akhir.wear"] + 0.35, 0.6)
    put(sfx, sfx_fanfare(), E["akhir.title"], 0.55)
    put(sfx, sfx_emu_boom(4, 170), E["akhir.title"] + 0.9, 0.5)

    # 4) musik dengan intensitas per adegan, berhenti sejenak di momen lucu
    base = {"hook": 0.35, "serbu": 0.75, "kantor": 0.55, "datang": 0.85, "gerilya": 0.6, "bendungan": 0.35, "truk": 0.9, "kutipan": 0.5, "akhir": 0.7}
    ip_t, ip_v = [0.0], [0.2]
    for k in order:
        ip_t += [S[k] + 0.1, END[k] - 0.1]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mutes = [
        (E["hook.emu"] - 0.1, E["hook.emu"] + 0.9),
        (E["kantor.slam"] - 0.05, E["kantor.slam"] + 0.6),
        (E["bendungan.fire"] - 0.6, E["bendungan.cock"] + 1.3),
        (E["akhir.wear"] - 0.6, E["akhir.title"] - 0.05),
    ]
    mus = music_bed(total, ip_t, ip_v, mutes)

    # 5) mix: musik merunduk di bawah suara
    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    duck = (1.0 / (1.0 + 7.0 * env))[:, None]
    master = mus[:N] * 0.6 * duck + sfx * (1.0 / (1.0 + 1.2 * env))[:, None] + vo * 1.15
    tt = np.arange(N) / SR
    master *= (np.minimum(1, tt / 0.08) * np.clip((total - tt) / 0.8, 0, 1))[:, None]
    master = np.tanh(master / (np.max(np.abs(master)) + 1e-6) * 1.5) / np.tanh(1.5) * 0.92
    master = master[: int(SR * total)]
    wav = OUT_MP3.with_suffix(".wav")
    with wave.open(str(wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(master, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", "44100", "-b:a", "192k", str(OUT_MP3)], check=True)
    wav.unlink(missing_ok=True)
    print(f"Selesai: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()

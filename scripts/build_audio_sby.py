"""Mix audio + jadwal adegan "Pertempuran Surabaya 1945". Pola sama dengan build_audio_kelompok.py.

Masukan : src/sby_voice.json + out/voice/sby/*.wav (scripts/voice_vox.py, VoxCPM2)
Keluaran: public/audio/sby_master.mp3 dan src/sby_timing.json
"""
import importlib.util
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("emu_audio", ROOT / "scripts" / "build_audio_emu.py")
E = importlib.util.module_from_spec(spec)
sys.modules["emu_audio"] = E
spec.loader.exec_module(E)
spec2 = importlib.util.spec_from_file_location("kel_audio", ROOT / "scripts" / "build_audio_kelompok.py")
K = importlib.util.module_from_spec(spec2)
sys.modules["kel_audio"] = K
spec2.loader.exec_module(K)
SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "sby_voice.json"
TIMING_JSON = ROOT / "src" / "sby_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "sby_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.6, post=1.6, gaps=[0]),
    "yamato": dict(pre=1.0, post=1.6, gaps=[0, 0.6, 1.2]),
    "ultimatum": dict(pre=0.5, post=1.2, gaps=[0, 0.8]),
    "radio": dict(pre=1.0, post=1.4, gaps=[0, 0.9]),
    "serangan": dict(pre=1.2, post=2.4, gaps=[0]),
    "jembatan": dict(pre=0.8, post=2.0, gaps=[0, 1.4]),
    "pmi": dict(pre=1.0, post=2.6, gaps=[0]),
    "akhir": dict(pre=0.8, post=1.8, gaps=[0, 0.5]),
    "pahlawan": dict(pre=0.8, post=3.4, gaps=[0]),
}
EVENTS = {
    "hook.tank": ("hook", 0, "tank", -3),
    "yamato.bendera": ("yamato", 0, "bendera", -3),
    "yamato.panjat": ("yamato", 1, "memanjat", -4),
    "yamato.robek": ("yamato", 1, "merobek", -2),
    "yamato.merah": ("yamato", 2, "merah", -3),
    "ult.bentrok": ("ultimatum", 0, "bentrokan", -3),
    "ult.tewas": ("ultimatum", 0, "tewas", -3),
    "ult.udara": ("ultimatum", 1, "udara", -6),
    "ult.serah": ("ultimatum", 1, "serahkan", -3),
    "radio.suara": ("radio", 0, "suara", -3),
    "radio.merdeka": ("radio", 1, "merdeka", -3),
    "radio.mati": ("radio", 1, "mati", -2),
    "serang.meriam": ("serangan", 0, "meriam", -3),
    "serang.bom": ("serangan", 0, "bom", -3),
    "serang.tank": ("serangan", 0, "tank", -3),
    "jemb.start": ("jembatan", 0, "START", 0),
    "jemb.mundur": ("jembatan", 1, "START", -4),
    "pmi.start": ("pmi", 0, "START", 0),
    "akhir.gugur": ("akhir", 0, "gugur", -3),
    "akhir.semangat": ("akhir", 1, "semangatnya", -3),
    "pahl.hari": ("pahlawan", 0, "hari", -3),
    "pahl.end": ("pahlawan", 0, "END", 10),
}


def sfx_baby():
    """tangis bayi versi elektronik: 'oek-oek' dari nada naik-turun + vibrato, sedikit bitcrush"""
    out = []
    for k, (f0, d) in enumerate([(520, 0.32), (600, 0.42)]):
        n = int(SR * d)
        t = np.arange(n) / SR
        f = f0 * (1 + 0.35 * np.sin(np.pi * t / d)) * (1 + 0.03 * np.sin(2 * np.pi * 9 * t))
        x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6
        x *= np.sin(np.pi * t / d) ** 0.6
        out += [x.astype(np.float32), np.zeros(int(SR * 0.08), np.float32)]
    return norm(bp(np.concatenate(out), 300, 5000), 0.55)


def sfx_kaching():
    a = K.sfx_pop(900)
    b = E.sfx_tinkle(8, 44)[: int(SR * 0.6)]
    bell = E.sfx_beep(2093, 0.25)
    out = np.zeros(int(SR * 0.9), np.float32)
    out[: len(a)] += a * 0.6
    out[int(SR * 0.05) : int(SR * 0.05) + len(bell)] += bell
    out[int(SR * 0.1) : int(SR * 0.1) + len(b)] += b * 0.8
    return norm(out, 0.7)


def sfx_coin():
    n = int(SR * 0.4)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 3200 * t) + 0.6 * np.sin(2 * np.pi * 4700 * t)) * np.exp(-t * 14)
    return norm(x, 0.5)


def sfx_crickets(dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    chirp = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 30 * t) > 0.2) * (np.sin(2 * np.pi * 1.6 * t) > 0.55)
    chirp2 = np.sin(2 * np.pi * 4700 * t) * (np.sin(2 * np.pi * 34 * t) > 0.3) * (np.sin(2 * np.pi * 1.3 * t + 1.4) > 0.6)
    return norm((chirp + chirp2 * 0.7).astype(np.float32), 0.35)


def sfx_click_lock():
    return norm(np.concatenate([E.sfx_tik(1200, 3, 0.02), np.zeros(int(SR * 0.06), np.float32), E.sfx_tik(900, 4, 0.03)]), 0.8)


def sfx_peel(dur=0.6):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return norm(bp(nz(n, 71), 1500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 40 * t)) * np.minimum(1, (dur - t) / 0.1), 0.5)


def sfx_steps(n=4, gap=0.32, seed=50):
    out = np.zeros(int(SR * (n * gap + 0.3)), np.float32)
    for i in range(n):
        s = E.sfx_thump(seed + i, 120)[: int(SR * 0.2)] * 0.6
        j = int(i * gap * SR)
        out[j : j + len(s)] += s
    return out


def sfx_drone(dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 220 * t) * 0.4 + np.sign(np.sin(2 * np.pi * 440 * t)) * 0.15 + bp(nz(n, 91), 2000, 6000) * 0.2
    x *= (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t)) * np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3)
    return norm(x.astype(np.float32), 0.4)


def sfx_flutter(dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return norm(bp(nz(n, 92), 300, 2500) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 6 * t))), 0.35)


def sfx_krek():
    a = E.sfx_slam(31)
    b = E.sfx_crack(32)
    out = np.zeros(int(SR * 0.9), np.float32)
    out[: len(a)] += a * 0.8
    out[int(SR * 0.03) : int(SR * 0.03) + len(b)] += b[: len(out) - int(SR * 0.03)] * 0.9
    return norm(out, 0.9)


def sfx_shatter():
    out = np.zeros(int(SR * 1.3), np.float32)
    c = E.sfx_crack(41)
    out[: len(c)] += c[: len(out)]
    tk = E.sfx_tinkle(14, 42)
    out[int(SR * 0.08) : int(SR * 0.08) + len(tk)] += tk[: len(out) - int(SR * 0.08)]
    return norm(out, 0.8)


def sad_pad(dur, seed=0):
    """pad lembut minor (Am - F - C - G) untuk momen emosional"""
    n = int(SR * dur)
    t = np.arange(n) / SR
    chords = [(220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (261.6, 329.6, 392.0), (196.0, 246.9, 293.7)]
    out = np.zeros(n, np.float32)
    seg = 2.4
    for i in range(int(dur / seg) + 1):
        a = int(i * seg * SR)
        b = min(n, int((i + 1) * seg * SR) + int(0.4 * SR))
        if a >= n:
            break
        tt = t[a:b] - t[a]
        env = np.minimum(1, tt / 0.5) * np.minimum(1, (tt[-1] - tt + 1e-3) / 0.5)
        for f in chords[(i + seed) % 4]:
            out[a:b] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2 * tt)) * env * 0.12
    # nada piano sederhana
    mel = [659.3, 587.3, 523.3, 493.9, 523.3, 440.0]
    for i, f in enumerate(mel * 4):
        a = int((0.6 + i * 1.2) * SR)
        if a >= n:
            break
        m = min(n - a, int(1.4 * SR))
        tt = np.arange(m) / SR
        out[a : a + m] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.5) * 0.18
    out *= np.minimum(1, t / 0.8) * np.clip((dur - t) / 0.8, 0, 1)
    return out


def sfx_flutter_awan(dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return norm(bp(nz(n, 92), 300, 2500) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 6 * t))), 0.35)



def boom(seed=1, big=1.0):
    n = int(SR * 2.2)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 6)) * t) * np.exp(-t * 2.2) * big
    x += lp(nz(n, seed), 600) * np.exp(-t * 2.6) * 0.9
    x += bp(nz(n, seed + 1), 1500, 6000) * np.exp(-t * 18) * 0.5
    return norm(np.tanh(x * 1.6).astype(np.float32), 0.95)


def plane(dur, seed=5):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 95 + 25 * np.sin(np.pi * t / dur)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + bp(nz(n, seed), 200, 1200) * 0.6
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return norm((lp(x.astype(np.float32), 1800) * env).astype(np.float32), 0.6)


def tank(dur, seed=7):
    n = int(SR * dur)
    t = np.arange(n) / SR
    eng = lp(nz(n, seed), 160) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t))
    clank = np.zeros(n, np.float32)
    for k in range(int(dur * 7)):
        j = int((k / 7 + 0.02 * np.sin(k)) * SR)
        m = min(n - j, int(0.05 * SR))
        if m > 0:
            clank[j : j + m] += bp(nz(m, seed + k), 1500, 5000) * np.exp(-np.arange(m) / SR * 80)
    return norm((eng + clank * 0.35).astype(np.float32), 0.6)


def radio_static(dur, seed=9):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return norm((bp(nz(n, seed), 2000, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t) ** 2)).astype(np.float32), 0.3)


def crowd_shout(seed=11):
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    for v in range(14):
        f0 = rng.uniform(140, 260)
        f = f0 * (1 + 0.25 * np.sin(np.pi * np.clip(t / 1.2, 0, 1)))
        x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.2
        x = bp(x.astype(np.float32), 300, 2500) * np.clip(1 - t / 1.5, 0, 1) * np.minimum(1, t / 0.08)
        out += x * rng.uniform(0.4, 1)
    return norm(out, 0.6)


def war_bed(total, levels):
    """musik perang: dentum drum + pad minor (Dm-Bb-F-C) + nada terompet; levels = [(t0,t1,gain)]"""
    N = int(SR * total) + SR
    t = np.arange(N) / SR
    out = np.zeros(N, np.float32)
    chords = [(146.8, 174.6, 220.0), (116.5, 146.8, 174.6), (174.6, 220.0, 261.6), (130.8, 164.8, 196.0)]
    seg = 2.5
    for i in range(int(total / seg) + 1):
        a = int(i * seg * SR)
        b = min(N, a + int((seg + 0.4) * SR))
        tt = t[a:b] - t[a]
        env = np.minimum(1, tt / 0.6) * np.minimum(1, (tt[-1] - tt + 1e-3) / 0.6)
        for f in chords[i % 4]:
            out[a:b] += (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2 * tt + 0.3)) * env * 0.07
    beat = 60 / 84
    for k in range(int(total / beat)):
        j = int(k * beat * SR)
        m = min(N - j, int(0.5 * SR))
        tt = np.arange(m) / SR
        hit = np.sin(2 * np.pi * (70 + 40 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 7) * (0.5 if k % 4 else 0.9)
        out[j : j + m] += hit * 0.35
    g = np.zeros(N, np.float32)
    for a, b, v in levels:
        ia, ib = int(a * SR), min(N, int(b * SR))
        g[ia:ib] = v
    g = np.convolve(g, np.ones(int(0.6 * SR)) / int(0.6 * SR), mode="same")
    return np.stack([out * g, out * g], 1)


def sad_pad(dur, seed=0):
    """pad lembut minor (Am - F - C - G) untuk momen emosional"""
    n = int(SR * dur)
    t = np.arange(n) / SR
    chords = [(220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (261.6, 329.6, 392.0), (196.0, 246.9, 293.7)]
    out = np.zeros(n, np.float32)
    seg = 2.4
    for i in range(int(dur / seg) + 1):
        a = int(i * seg * SR)
        b = min(n, int((i + 1) * seg * SR) + int(0.4 * SR))
        if a >= n:
            break
        tt = t[a:b] - t[a]
        env = np.minimum(1, tt / 0.5) * np.minimum(1, (tt[-1] - tt + 1e-3) / 0.5)
        for f in chords[(i + seed) % 4]:
            out[a:b] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2 * tt)) * env * 0.12
    # nada piano sederhana
    mel = [659.3, 587.3, 523.3, 493.9, 523.3, 440.0]
    for i, f in enumerate(mel * 4):
        a = int((0.6 + i * 1.2) * SR)
        if a >= n:
            break
        m = min(n - a, int(1.4 * SR))
        tt = np.arange(m) / SR
        out[a : a + m] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.5) * 0.18
    out *= np.minimum(1, t / 0.8) * np.clip((dur - t) / 0.8, 0, 1)
    return out


def main():
    V = json.loads(VOICE_JSON.read_text())
    order = [s["scene"] for s in V["scenes"]]
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
            y = E.load_wav(ROOT / ln["file"])
            d = len(y) / SR
            words = [{"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))} for w, a, b in E.align_script(ln["text"], ln["wordsSec"], d)]
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

    def ev_frame(scene, li, word, off):
        ln = timing["lines"][scene][li]
        if word == "START":
            return ln["from"] + off
        if word == "END":
            return ln["to"] + off
        key = E.norm_word(word)
        for w in ln["words"]:
            if E.norm_word(w["w"]).startswith(key):
                return w["from"] + off
        print(f"  ! kata '{word}' tidak ditemukan di {scene}[{li}]")
        return ln["from"] + off

    for name, (scene, li, word, off) in EVENTS.items():
        timing["events"][name] = ev_frame(scene, li, word, off)
    TIMING_JSON.write_text(json.dumps(timing, indent=1, ensure_ascii=False))

    S = {k: v["from"] / FPS for k, v in timing["scenes"].items()}
    END = {k: S[k] + v["dur"] / FPS for k, v in timing["scenes"].items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in timing["events"].items()}
    print(f"Total {total:.1f}s ({timing['total']} frame)")
    for k in order:
        print(f"  {k:10s} {timing['scenes'][k]['dur']:4d}f  mulai {S[k]:.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    for t0, y in clips:
        put(vo, y, t0, 1.0)
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.4, hash(k) % 50), S[k] - 0.25, 0.22)
    for k in ["hook", "serangan", "jembatan", "pmi", "akhir"]:
        put(sfx, E.sfx_wind(END[k] - S[k], 3 + len(k)), S[k], 0.15)
    # 1 hook: tank mendekat, dentum
    put(sfx, tank(END["hook"] - S["hook"], 7), S["hook"], 0.4, 0.3)
    put(sfx, boom(3, 0.9), EV["hook.tank"] + 0.15, 0.6)
    # 2 Yamato
    put(sfx, K.sfx_room(END["yamato"] - S["yamato"], 44, murmur=True), S["yamato"], 0.3)
    put(sfx, sfx_flutter_awan(END["yamato"] - S["yamato"]), S["yamato"], 0.25)
    put(sfx, crowd_shout(12), EV["yamato.panjat"] + 0.1, 0.45)
    put(sfx, E.sfx_paper(19), EV["yamato.robek"] + 0.1, 0.9)
    put(sfx, E.sfx_paper(23), EV["yamato.robek"] + 0.25, 0.7)
    put(sfx, crowd_shout(13), EV["yamato.merah"] + 0.4, 0.6)
    # 3 ultimatum
    put(sfx, E.sfx_burst(1.4, 9, 33), EV["ult.bentrok"] + 0.1, 0.45, -0.3)
    put(sfx, boom(5, 0.7), EV["ult.tewas"] + 0.1, 0.45)
    put(sfx, plane(4.0, 6), EV["ult.udara"] - 1.0, 0.55)
    for j in range(5):
        put(sfx, E.sfx_paper(30 + j), EV["ult.udara"] + 0.8 + j * 0.3, 0.3, (j % 2) * 0.6 - 0.3)
    # 4 radio
    put(sfx, radio_static(END["radio"] - S["radio"], 9), S["radio"], 0.25)
    put(sfx, E.sfx_tik(1200, 5), S["radio"] + 0.4, 0.5)
    put(sfx, crowd_shout(14), EV["radio.mati"] + 0.5, 0.7)
    # 5 serangan
    for j, dt in enumerate([0.0, 0.5, 1.0]):
        put(sfx, boom(40 + j, 1.0), EV["serang.meriam"] + 0.2 + dt, 0.6, (j - 1) * 0.5)
    put(sfx, plane(3.0, 8), EV["serang.bom"] - 1.2, 0.5)
    put(sfx, boom(50, 1.2), EV["serang.bom"] + 0.6, 0.8)
    put(sfx, tank(END["serangan"] - EV["serang.tank"], 9), EV["serang.tank"], 0.45)
    # 6 jembatan
    put(sfx, tank(END["jembatan"] - S["jembatan"], 11), S["jembatan"], 0.35, 0.4)
    put(sfx, E.sfx_burst(2.0, 8, 60), S["jembatan"] + 0.8, 0.35, -0.4)
    for j in range(4):
        put(sfx, E.sfx_gun(61 + j), S["jembatan"] + 1.6 + j * 0.9, 0.35, (j % 2) - 0.5)
    put(sfx, boom(62, 0.8), EV["jemb.mundur"] - 1.0, 0.55)
    put(sfx, crowd_shout(15), EV["jemb.mundur"] + 0.5, 0.65)
    # 7 pmi & 8 akhir: pad sedih
    put(sfx, sad_pad(END["akhir"] - S["pmi"] + 0.6, 0), S["pmi"], 0.6)
    put(sfx, E.sfx_fire(END["pmi"] - S["pmi"]), S["pmi"], 0.25)
    put(sfx, boom(70, 0.5), S["pmi"] + 2.2, 0.25)
    put(sfx, E.sfx_fire(END["akhir"] - S["akhir"]), S["akhir"], 0.2)
    # 9 pahlawan
    put(sfx, E.sfx_fanfare(), EV["pahl.hari"] + 0.2, 0.35)

    levels = [
        (S["hook"], END["hook"], 0.9),
        (S["yamato"], END["yamato"], 0.55),
        (S["ultimatum"], END["ultimatum"], 0.7),
        (S["radio"], END["radio"], 0.6),
        (S["serangan"], END["jembatan"], 1.0),
        (S["pmi"], END["akhir"], 0.0),
        (S["pahlawan"], total, 0.8),
    ]
    mus = war_bed(total, levels)

    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = mus[:N] * 0.55 * (1.0 / (1.0 + 7.0 * env))[:, None] + sfx * (1.0 / (1.0 + 1.2 * env))[:, None] + vo * 1.15
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

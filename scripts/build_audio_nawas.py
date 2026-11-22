"""Mix audio + jadwal adegan "Powerbank Melahirkan" (Kang Nawas zaman now). Pola sama dengan build_audio_kelompok.py.

Masukan : src/nawas_voice.json + out/voice/nawas/*.wav (scripts/voice_vox.py, VoxCPM2)
Keluaran: public/audio/nawas_master.mp3 dan src/nawas_timing.json
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

VOICE_JSON = ROOT / "src" / "nawas_voice.json"
TIMING_JSON = ROOT / "src" / "nawas_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "nawas_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.5, post=1.3, gaps=[0]),
    "pelit": dict(pre=0.4, post=1.0, gaps=[0, 0.6]),
    "pinjam": dict(pre=0.4, post=2.2, gaps=[0, 0.9]),
    "lahir": dict(pre=1.6, post=1.6, gaps=[0, 0.7]),
    "hpemas": dict(pre=0.4, post=2.0, gaps=[0, 0.5]),
    "meninggal": dict(pre=1.8, post=0.9, gaps=[0, 0.8]),
    "punchline": dict(pre=0.4, post=2.4, gaps=[0]),
    "gratis": dict(pre=0.4, post=3.0, gaps=[0, 1.2]),
}
EVENTS = {
    "hook.give": ("hook", 0, "mengembalikan", -4),
    "hook.bayi": ("hook", 0, "bayi", -3),
    "pelit.gembok": ("pelit", 0, "colokan", -4),
    "pelit.bayar": ("pelit", 0, "bayar", -4),
    "pelit.bos": ("pelit", 1, "START", -3),
    "pinjam.batt": ("pinjam", 0, "tinggal", -4),
    "pinjam.ask": ("pinjam", 1, "START", -2),
    "pinjam.give": ("pinjam", 1, "END", 4),
    "lahir.selamat": ("lahir", 0, "START", -2),
    "lahir.lahir": ("lahir", 0, "melahirkan", -3),
    "lahir.girang": ("lahir", 1, "girang", -3),
    "lahir.terima": ("lahir", 1, "diterima", -12),
    "hp.pamer": ("hpemas", 0, "terbaru", -4),
    "hp.boleh": ("hpemas", 1, "START", -2),
    "hp.give": ("hpemas", 1, "anaknya", -2),
    "mati.start": ("meninggal", 0, "START", -2),
    "mati.word": ("meninggal", 0, "meninggal", -3),
    "mati.bentak": ("meninggal", 1, "START", -2),
    "punch.start": ("punchline", 0, "START", 0),
    "punch.lahir": ("punchline", 0, "melahirkan", -3),
    "punch.mati": ("punchline", 0, "meninggal", -3),
    "punch.melongo": ("punchline", 0, "END", 0),
    "gratis.cabut": ("gratis", 0, "kantor", -8),
    "gratis.gratis": ("gratis", 0, "gratis", -3),
    "gratis.balik": ("gratis", 1, "hidup", -8),
    "gratis.end": ("gratis", 1, "END", 10),
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
        put(sfx, E.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.2, 0.3)
    office = ["pelit", "hpemas", "gratis"]
    for k in office:
        put(sfx, K.sfx_room(END[k] - S[k], 40 + len(k), murmur=True), S[k], 0.2)
        put(sfx, K.sfx_typing(END[k] - S[k] - 0.4, 7, len(k)), S[k] + 0.2, 0.12, -0.5)
    for k in ["hook", "pinjam", "lahir", "meninggal", "punchline"]:
        put(sfx, E.sfx_tick_clock(END[k] - S[k]), S[k], 0.15, 0.4)
    T = ROOT / "exports" / "riset" / "tawa"
    # 1 hook
    put(sfx, sfx_steps(3), S["hook"] + 0.1, 0.4)
    put(sfx, E.sfx_swoosh(0.3, 3), EV["hook.give"] + 0.1, 0.35)
    put(sfx, E.sfx_boing(420, 0.35), EV["hook.bayi"] + 0.05, 0.45)
    put(sfx, sfx_baby(), EV["hook.bayi"] + 0.4, 0.5)
    # 2 pelit
    put(sfx, sfx_click_lock(), EV["pelit.gembok"] + 0.15, 0.6)
    put(sfx, sfx_coin(), EV["pelit.bayar"] + 0.5, 0.6)
    put(sfx, sfx_coin(), EV["pelit.bayar"] + 0.62, 0.45)
    put(sfx, sfx_kaching(), EV["pelit.bayar"] + 0.9, 0.5)
    put(sfx, E.sfx_stamp(5), EV["pelit.bos"] + 0.1, 0.4)
    # 3 pinjam
    put(sfx, K.sfx_lowbatt(), EV["pinjam.batt"] + 0.1, 0.55)
    put(sfx, K.sfx_lowbatt(), EV["pinjam.batt"] + 0.8, 0.4)
    put(sfx, sfx_click_lock(), EV["pinjam.give"] - 1.2, 0.5)
    put(sfx, E.sfx_door(8), EV["pinjam.give"] - 1.0, 0.35)
    put(sfx, E.sfx_swoosh(0.3, 33), EV["pinjam.give"] + 0.5, 0.35)
    # 4 lahir
    put(sfx, E.sfx_door(9), S["lahir"] + 0.1, 0.4)
    put(sfx, sfx_steps(3, 0.3, 60), S["lahir"] + 0.45, 0.35)
    put(sfx, E.sfx_boing(500, 0.35), EV["lahir.lahir"] + 0.05, 0.4)
    put(sfx, sfx_baby(), EV["lahir.lahir"] + 0.3, 0.45)
    if (T / "tawa_raja.mp3").exists():
        put(vo, norm(E.load_mp3(T / "tawa_raja.mp3", 1.0), 0.55)[: int(SR * 2.0)], EV["lahir.girang"] + 0.2, 0.55, 0.3)
    put(sfx, E.sfx_swoosh(0.3, 41), EV["lahir.terima"] + 0.3, 0.35)
    put(sfx, sfx_kaching(), EV["lahir.terima"] + 0.75, 0.55)
    # 5 hp emas
    put(sfx, E.sfx_tinkle(6, 51), EV["hp.pamer"] + 0.1, 0.45)
    put(sfx, E.sfx_swoosh(0.3, 52), EV["hp.give"] + 0.3, 0.35)
    if (T / "tawa_abu_licik.mp3").exists():
        put(vo, norm(E.load_mp3(T / "tawa_abu_licik.mp3", 1.1), 0.3)[: int(SR * 1.3)], END["hpemas"] - 1.4, 0.35, -0.3)
    # 6 meninggal
    put(sfx, E.sfx_door(10), S["meninggal"] + 0.1, 0.35)
    put(sfx, sfx_steps(4, 0.42, 70), S["meninggal"] + 0.4, 0.3)
    put(sfx, E.sfx_xray(), EV["mati.word"] + 0.05, 0.4)
    put(sfx, E.sfx_slam(11), EV["mati.bentak"] + 0.1, 0.45)
    # 7 punchline
    put(sfx, E.sfx_hud(1), EV["punch.lahir"] + 0.05, 0.35)
    put(sfx, E.sfx_hud(1), EV["punch.mati"] + 0.05, 0.35)
    put(sfx, E.sfx_boing(240, 0.45), EV["punch.melongo"] + 0.1, 0.45)
    put(sfx, sfx_crickets(END["punchline"] - EV["punch.melongo"] - 0.4), EV["punch.melongo"] + 0.4, 0.5)
    # 8 gratis
    put(sfx, sfx_peel(0.7), EV["gratis.cabut"] + 0.2, 0.6)
    put(sfx, E.sfx_fanfare(), EV["gratis.gratis"] + 0.1, 0.4)
    put(sfx, K.sfx_clap(10, 1.8, 7), EV["gratis.gratis"] + 0.2, 0.4)
    if (T / "tawa_istana_ramai.mp3").exists():
        put(vo, norm(E.load_mp3(T / "tawa_istana_ramai.mp3", 1.1), 0.3)[: int(SR * 2.0)], EV["gratis.gratis"] + 0.3, 0.35, 0.4)
    put(sfx, E.sfx_swoosh(0.3, 81), EV["gratis.balik"] + 0.3, 0.35)
    put(sfx, K.sfx_notif(), EV["gratis.balik"] + 0.7, 0.45)
    put(sfx, E.sfx_wahwah(), EV["gratis.end"] - 0.2, 0.25)

    base = {"hook": 0.55, "pelit": 0.7, "pinjam": 0.5, "lahir": 0.8, "hpemas": 0.7, "meninggal": 0.25, "punchline": 0.45, "gratis": 0.85}
    ip_t, ip_v = [0.0], [0.3]
    for k in order:
        ip_t += [S[k] + 0.1, END[k] - 0.1]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mutes = [(EV["mati.word"] - 0.2, EV["mati.bentak"] + 1.4), (EV["punch.melongo"] - 0.1, END["punchline"])]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

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

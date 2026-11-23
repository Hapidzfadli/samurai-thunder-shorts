"""Mix audio + jadwal adegan "Kantor di Atas Awan" (Kang Nawas #2). Pola sama dengan build_audio_kelompok.py.

Masukan : src/awan_voice.json + out/voice/awan/*.wav (scripts/voice_vox.py, VoxCPM2)
Keluaran: public/audio/awan_master.mp3 dan src/awan_timing.json
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

VOICE_JSON = ROOT / "src" / "awan_voice.json"
TIMING_JSON = ROOT / "src" / "awan_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "awan_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.5, post=1.2, gaps=[0]),
    "perintah": dict(pre=0.5, post=0.9, gaps=[0, 0.4]),
    "sedih": dict(pre=0.8, post=1.8, gaps=[0]),
    "sanggup": dict(pre=0.4, post=1.0, gaps=[0, 0.5]),
    "siap": dict(pre=0.5, post=2.0, gaps=[0]),
    "harih": dict(pre=0.4, post=0.9, gaps=[0, 0.5]),
    "lempar": dict(pre=0.3, post=1.0, gaps=[0, 1.5, 0.8]),
    "runtuh": dict(pre=2.0, post=1.8, gaps=[0]),
    "kejutan": dict(pre=0.6, post=3.4, gaps=[0]),
    "bulan": dict(pre=0.8, post=3.2, gaps=[0, 0.6]),
}
EVENTS = {
    "hook.awan": ("hook", 0, "awan", -3),
    "perintah.gebrak": ("perintah", 0, "START", -4),
    "perintah.awan": ("perintah", 0, "awan", -3),
    "perintah.pecat": ("perintah", 1, "dipecat", -3),
    "sedih.udin": ("sedih", 0, "udin", -3),
    "sedih.sinta": ("sedih", 0, "sinta", -3),
    "sanggup.jari": ("sanggup", 0, "syaratnya", -3),
    "sanggup.atas": ("sanggup", 0, "atas", -2),
    "sanggup.salam": ("sanggup", 1, "START", -2),
    "siap.kite": ("siap", 0, "layang", -4),
    "siap.drone": ("siap", 0, "drone", -3),
    "harih.tiba": ("harih", 0, "START", 0),
    "harih.teriak": ("harih", 1, "START", -2),
    "lempar.ambil": ("lempar", 0, "START", -8),
    "lempar.lempar": ("lempar", 0, "sekuat", -2),
    "lempar.krek": ("lempar", 1, "mobilnya", -3),
    "lempar.celeng": ("lempar", 2, "kena", -2),
    "runtuh.foto": ("runtuh", 0, "START", -40),
    "runtuh.hilang": ("runtuh", 0, "hilang", -3),
    "kejut.start": ("kejutan", 0, "START", -2),
    "kejut.tarik": ("kejutan", 0, "dibangun", -8),
    "kejut.peluk": ("kejutan", 0, "END", 6),
    "bulan.call": ("bulan", 0, "START", -6),
    "bulan.setuju": ("bulan", 0, "setuju", -2),
    "bulan.bulan": ("bulan", 1, "END", -14),
    "bulan.pingsan": ("bulan", 1, "END", 4),
    "bulan.end": ("bulan", 1, "END", 34),
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
        put(sfx, E.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.2, 0.25)
    T = ROOT / "exports" / "riset" / "tawa"
    roof = ["siap", "harih", "lempar", "runtuh", "kejutan", "bulan"]
    for k in roof:
        put(sfx, E.sfx_wind(END[k] - S[k], 3 + len(k)), S[k], 0.15)
    for k in ["hook", "sedih"]:
        put(sfx, K.sfx_room(END[k] - S[k], 40 + len(k), murmur=k == "hook"), S[k], 0.18)
    put(sfx, E.sfx_tick_clock(END["perintah"] - S["perintah"]), S["perintah"], 0.15, 0.4)
    # 1 hook
    put(sfx, E.sfx_xray(), EV["hook.awan"], 0.4)
    put(sfx, E.sfx_boing(300, 0.4), EV["hook.awan"] + 0.5, 0.35)
    # 2 perintah
    put(sfx, E.sfx_slam(9), EV["perintah.gebrak"] + 0.1, 0.8)
    put(sfx, E.sfx_paper(19), EV["perintah.gebrak"] + 0.2, 0.5)
    put(sfx, E.sfx_whiz(16), EV["perintah.awan"] + 0.05, 0.3)
    put(sfx, sfx_steps(2, 0.2, 55), EV["perintah.pecat"] + 0.2, 0.4)
    put(sfx, E.sfx_boing(220, 0.4), EV["perintah.pecat"] + 0.3, 0.35)
    # 3 sedih
    put(sfx, K.sfx_notif(), EV["sedih.udin"] + 0.1, 0.25)
    put(sfx, E.sfx_paper(20), EV["sedih.sinta"] + 0.2, 0.45)
    # 4 sanggup
    put(sfx, E.sfx_tik(1800, 7), EV["sanggup.jari"] + 0.05, 0.4)
    put(sfx, E.sfx_whiz(17), EV["sanggup.atas"], 0.3)
    put(sfx, K.sfx_highfive(), EV["sanggup.salam"] + 0.3, 0.6)
    # 5 siap
    put(sfx, sfx_flutter(END["siap"] - EV["siap.kite"]), EV["siap.kite"], 0.4, -0.3)
    put(sfx, sfx_drone(END["siap"] - EV["siap.drone"]), EV["siap.drone"], 0.45, 0.3)
    put(sfx, E.sfx_xray(), EV["siap.drone"] + 0.9, 0.35)
    # 6 hari H
    put(sfx, E.sfx_door(8), S["harih"] + 0.1, 0.35)
    put(sfx, E.sfx_thump(60, 90), EV["harih.teriak"] - 0.1, 0.4)
    put(sfx, E.sfx_tinkle(4, 61), EV["harih.teriak"] + 0.1, 0.2)
    # 7 lempar
    put(sfx, E.sfx_thump(70, 140), EV["lempar.ambil"] + 0.2, 0.4)
    put(sfx, E.sfx_swoosh(0.5, 71), EV["lempar.lempar"] + 0.2, 0.6)
    put(sfx, E.sfx_whiz(18), EV["lempar.lempar"] + 0.6, 0.35)
    put(sfx, sfx_krek(), EV["lempar.krek"] + 0.1, 0.9)
    put(sfx, E.sfx_wahwah(), EV["lempar.krek"] + 1.0, 0.3)
    put(sfx, E.sfx_swoosh(0.4, 72), EV["lempar.celeng"] - 0.6, 0.5)
    put(sfx, sfx_shatter(), EV["lempar.celeng"] + 0.1, 0.8)
    if (T / "tawa_istana_ramai.mp3").exists():
        put(vo, norm(E.load_mp3(T / "tawa_istana_ramai.mp3", 1.1), 0.25)[: int(SR * 1.6)], EV["lempar.celeng"] + 0.7, 0.3, 0.4)
    # 8 runtuh + 9 kejutan: pad sedih
    pad_a = S["runtuh"]
    pad_b = EV["kejut.peluk"] + 2.0
    put(sfx, sad_pad(pad_b - pad_a, 0), pad_a, 0.55)
    put(sfx, sad_pad(END["sedih"] - S["sedih"] + 0.5, 2), S["sedih"], 0.45)
    put(sfx, E.sfx_paper(21), EV["runtuh.foto"] + 0.2, 0.4)
    put(sfx, sfx_flutter(0.7), EV["kejut.tarik"] + 0.1, 0.6)
    for j in range(9):
        put(sfx, E.sfx_beep(1046.5 + j * 60, 0.08), EV["kejut.tarik"] + 0.8 + j * 0.06, 0.15)
    put(sfx, K.sfx_clap(10, 1.6, 7), EV["kejut.peluk"] + 0.3, 0.3)
    # 10 bulan
    for j in range(3):
        put(sfx, K.sfx_notif(), EV["bulan.call"] + j * 0.45, 0.4)
    put(sfx, K.sfx_clap(12, 1.6, 8), EV["bulan.setuju"] + 0.3, 0.35)
    put(sfx, E.sfx_fanfare(), EV["bulan.bulan"] + 0.2, 0.3)
    put(sfx, E.sfx_boing(200, 0.5), EV["bulan.pingsan"] + 0.1, 0.5)
    put(sfx, E.sfx_thump(80, 70), EV["bulan.pingsan"] + 0.45, 0.7)
    if (T / "tawa_abu_lepas.mp3").exists():
        put(vo, norm(E.load_mp3(T / "tawa_abu_lepas.mp3", 1.15), 0.28)[: int(SR * 1.8)], EV["bulan.pingsan"] + 0.8, 0.35, -0.3)

    base = {"hook": 0.6, "perintah": 0.4, "sedih": 0.0, "sanggup": 0.65, "siap": 0.85, "harih": 0.75, "lempar": 0.8, "runtuh": 0.0, "kejutan": 0.0, "bulan": 0.85}
    ip_t, ip_v = [0.0], [0.3]
    for k in order:
        ip_t += [S[k] + 0.1, END[k] - 0.1]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mutes = [(S["sedih"] - 0.1, END["sedih"]), (S["runtuh"] - 0.1, EV["kejut.peluk"] + 1.5)]
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

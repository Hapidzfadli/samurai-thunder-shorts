"""Mix audio + jadwal adegan "Kerja Kelompok" (pola sama dengan build_audio_emu.py, efek suara dipakai ulang dari sana).

Masukan : src/kelompok_voice.json + out/voice/kelompok/*.wav (scripts/voice_vox.py, VoxCPM2)
Keluaran: public/audio/kelompok_master.mp3 dan src/kelompok_timing.json
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
SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "kelompok_voice.json"
TIMING_JSON = ROOT / "src" / "kelompok_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "kelompok_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.3, post=0.8, gaps=[0, 0.35]),
    "grup": dict(pre=0.35, post=0.9, gaps=[0, 0.25]),
    "hilang": dict(pre=0.5, post=0.8, gaps=[0, 0.3, 0.45]),
    "kamis": dict(pre=0.4, post=1.0, gaps=[0, 0.35, 0.5]),
    "xray": dict(pre=0.4, post=0.9, gaps=[0, 0.45]),
    "kirim": dict(pre=0.7, post=1.4, gaps=[0]),
    "presentasi": dict(pre=0.4, post=0.8, gaps=[0, 0.35, 0.35]),
    "nilai": dict(pre=0.3, post=2.8, gaps=[0, 0.6, 0.6, 0.45]),
}
EVENTS = {
    "hook.tebak": ("hook", 0, "tebak", -3),
    "hook.write": ("hook", 1, "memberi", -4),
    "hook.jumat": ("hook", 1, "jumat", -2),
    "grup.cheer": ("grup", 0, "semangat", -2),
    "grup.pop1": ("grup", 1, "siap", -2),
    "grup.pop2": ("grup", 1, "gas", -2),
    "grup.pop3": ("grup", 1, "nanti", -2),
    "grup.pop4": ("grup", 1, "referensi", -8),
    "hilang.tear": ("hilang", 0, "hari", -2),
    "hilang.joko": ("hilang", 1, "joko", -2),
    "hilang.sari": ("hilang", 1, "sari", -2),
    "hilang.bayu": ("hilang", 1, "bayu", -2),
    "hilang.rara": ("hilang", 2, "rara", -2),
    "kamis.type": ("kamis", 0, "START", 0),
    "kamis.send": ("kamis", 1, "bertanya", -2),
    "kamis.read": ("kamis", 2, "dibaca", -3),
    "kamis.flip": ("kamis", 2, "sepi", -4),
    "xray.drink": ("xray", 0, "kopi", -6),
    "xray.battery": ("xray", 0, "energinya", -3),
    "xray.panda": ("xray", 1, "panda", -3),
    "kirim.press": ("kirim", 0, "terkirim", -8),
    "kirim.sleep": ("kirim", 0, "tertidur", -3),
    "pres.start": ("presentasi", 0, "START", 0),
    "pres.bayu": ("presentasi", 1, "START", -4),
    "pres.rara": ("presentasi", 2, "START", -4),
    "nilai.board": ("nilai", 1, "semua", -4),
    "nilai.shock": ("nilai", 1, "END", 0),
    "nilai.tos": ("nilai", 2, "kerja", -2),
    "nilai.smile": ("nilai", 3, "tersenyum", -3),
    "nilai.title": ("nilai", 3, "END", 8),
}


# ---------------- efek suara tambahan ----------------
def sfx_typing(dur, rate=11.0, seed=1):
    out = np.zeros(int(SR * (dur + 0.2)), np.float32)
    rng = np.random.default_rng(seed)
    t = 0.0
    while t < dur:
        k = E.sfx_tik(rng.uniform(1800, 3200), int(rng.integers(0, 999)), 0.015) * rng.uniform(0.4, 1.0)
        i = int(t * SR)
        out[i : i + len(k)] += k[: len(out) - i]
        t += rng.exponential(1.0 / rate)
    return norm(out, 0.6)


def sfx_notif():
    a = E.sfx_beep(1318.5, 0.08)
    b = E.sfx_beep(1760.0, 0.14)
    return np.concatenate([a, np.zeros(int(SR * 0.03), np.float32), b])


def sfx_pop(f=600):
    n = int(SR * 0.12)
    t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * (f + 900 * np.exp(-t * 40)) * t) * np.exp(-t * 30), 0.7)


def sfx_squeak(dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 2200 + 500 * np.sin(2 * np.pi * 3.5 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 4.2 * t)))
    return norm(x * 0.3 + bp(nz(n, 5), 3000, 8000) * 0.2, 0.35)


def sfx_snore(dur=2.4):
    n = int(SR * dur)
    t = np.arange(n) / SR
    cyc = np.clip(np.sin(2 * np.pi * 0.45 * t), 0, 1) ** 2
    x = lp(nz(n, 9), 300) * cyc * (1 + 0.6 * np.sin(2 * np.pi * 38 * t))
    return norm(x, 0.5)


def sfx_pour(dur=1.2):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = bp(nz(n, 13), 700, 3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.2)
    return norm(x, 0.45)


def sfx_gulp():
    n = int(SR * 0.25)
    t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * (260 - 140 * t / 0.25) * t) * np.sin(np.pi * t / 0.25), 0.6)


def sfx_lowbatt():
    return np.concatenate([E.sfx_beep(880, 0.12), np.zeros(int(SR * 0.08), np.float32), E.sfx_beep(660, 0.2)])


def sfx_clap(n_people=12, dur=2.0, seed=21):
    out = np.zeros(int(SR * (dur + 0.3)), np.float32)
    rng = np.random.default_rng(seed)
    for p in range(n_people):
        t = rng.uniform(0, 0.15)
        rate = rng.uniform(3.5, 5.5)
        while t < dur:
            m = int(SR * 0.04)
            c = bp(nz(m, int(rng.integers(0, 9999))), 800, 6000) * np.exp(-np.arange(m) / SR * 90)
            i = int(t * SR)
            out[i : i + m] += c[: len(out) - i] * rng.uniform(0.3, 0.8)
            t += 1.0 / rate
    return norm(out * np.minimum(1, np.linspace(dur + 0.3, 0, len(out)) / 0.6), 0.6)


def sfx_highfive():
    n = int(SR * 0.2)
    t = np.arange(n) / SR
    return norm(bp(nz(n, 31), 900, 7000) * np.exp(-t * 45), 0.9)


def sfx_room(dur, seed=40, murmur=False):
    n = int(SR * dur)
    x = lp(nz(n, seed), 400) * 0.6
    if murmur:
        t = np.arange(n) / SR
        x += bp(nz(n, seed + 1), 300, 1500) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.3 * t) * np.sin(2 * np.pi * 0.7 * t)) * 0.8
    return norm(x, 0.35)


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
    EV = {k: S[k.split(".")[0] if not k.startswith("pres.") else "presentasi"] + v / FPS for k, v in timing["events"].items()}
    END = {k: S[k] + v["dur"] / FPS for k, v in timing["scenes"].items()}
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
    # kelas
    for k in ["hook", "presentasi", "nilai"]:
        put(sfx, sfx_room(END[k] - S[k], 40 + len(k), murmur=k != "presentasi"), S[k], 0.25)
    put(sfx, E.sfx_fan(END["hook"] - S["hook"]), S["hook"], 0.2)
    put(sfx, E.sfx_boing(500, 0.3), EV["hook.tebak"] + 0.1, 0.35)
    put(sfx, sfx_squeak(1.3), EV["hook.write"] + 0.15, 0.6)
    put(sfx, sfx_squeak(0.5), EV["hook.jumat"] + 0.05, 0.6)
    # grup chat
    put(sfx, E.sfx_xray(), S["grup"] + 0.05, 0.35)
    for k in ["grup.pop1", "grup.pop2", "grup.pop3", "grup.pop4"]:
        put(sfx, sfx_pop(600 + 150 * int(k[-1])), EV[k] + 0.05, 0.6)
        put(sfx, sfx_notif(), EV[k] + 0.08, 0.35)
    put(sfx, sfx_clap(6, 1.0, 3), EV["grup.cheer"] + 0.1, 0.3)
    # menghilang
    for j in range(4):
        put(sfx, E.sfx_paper(60 + j), EV["hilang.tear"] + 0.1 + j * 0.35, 0.55)
    for k in ["hilang.joko", "hilang.sari", "hilang.bayu", "hilang.rara"]:
        put(sfx, E.sfx_beep(440, 0.18), EV[k] + 0.1, 0.35)
        put(sfx, E.sfx_swoosh(0.3, hash(k) % 70), EV[k] + 0.2, 0.3)
    put(sfx, E.sfx_tick_clock(END["hilang"] - S["hilang"]), S["hilang"], 0.25)
    # kamis malam: ketik + kafe
    put(sfx, sfx_typing(END["kamis"] - S["kamis"] - 0.5), S["kamis"] + 0.2, 0.45, -0.3)
    put(sfx, sfx_room(END["kamis"] - S["kamis"], 77, murmur=True), S["kamis"], 0.3, 0.4)
    T = ROOT / "exports" / "riset" / "tawa"
    if (T / "tawa_istana_ramai.mp3").exists():
        put(vo, norm(E.load_mp3(T / "tawa_istana_ramai.mp3", 1.15), 0.28)[: int(SR * 2.2)], S["kamis"] + 0.6, 0.35, 0.5)
    put(sfx, E.sfx_swoosh(0.25, 81), EV["kamis.send"] + 0.2, 0.4)
    put(sfx, sfx_notif(), EV["kamis.send"] + 0.4, 0.45)
    for j in range(4):
        put(sfx, sfx_notif(), EV["kamis.read"] + 0.05 + j * 0.12, 0.2, 0.5)
    put(sfx, E.sfx_thump(88, 160), EV["kamis.flip"] + 0.2, 0.4, 0.5)
    # x-ray energi
    put(sfx, E.sfx_xray(), S["xray"] + 0.05, 0.4)
    put(sfx, sfx_pour(1.0), EV["xray.drink"], 0.55)
    put(sfx, sfx_gulp(), EV["xray.drink"] + 1.1, 0.6)
    put(sfx, sfx_gulp(), EV["xray.drink"] + 1.4, 0.5)
    put(sfx, sfx_lowbatt(), EV["xray.battery"] + 0.1, 0.5)
    put(sfx, E.sfx_tick_clock(END["xray"] - S["xray"]), S["xray"], 0.3)
    put(sfx, E.sfx_boing(300, 0.35), EV["xray.panda"] + 0.1, 0.35)
    # kirim + tidur
    put(sfx, sfx_typing(EV["kirim.press"] - S["kirim"]), S["kirim"] + 0.1, 0.35)
    put(sfx, E.sfx_clack(91), EV["kirim.press"] + 0.25, 0.7)
    put(sfx, E.sfx_swoosh(0.4, 92), EV["kirim.press"] + 0.35, 0.5)
    put(sfx, sfx_notif(), EV["kirim.press"] + 0.6, 0.45)
    put(sfx, E.sfx_thump(93, 110), EV["kirim.sleep"] + 0.2, 0.5)
    put(sfx, sfx_snore(2.6), EV["kirim.sleep"] + 0.6, 0.45)
    # presentasi
    put(sfx, E.sfx_tik(1500, 100), EV["pres.bayu"] + 0.1, 0.4)
    put(sfx, E.sfx_slam(101) * 0.4, EV["pres.rara"] + 0.15, 0.4)
    put(sfx, sfx_clap(10, 1.6, 5), END["presentasi"] - 1.2, 0.4)
    # nilai
    for j in range(5):
        put(sfx, sfx_pop(900 + j * 80), EV["nilai.board"] + 0.15 + j * 0.12, 0.45)
    put(sfx, E.sfx_boing(260, 0.4), EV["nilai.shock"] + 0.05, 0.45)
    put(sfx, sfx_highfive(), EV["nilai.tos"] + 0.35, 0.8)
    put(sfx, sfx_highfive(), EV["nilai.tos"] + 0.65, 0.7)
    if (T / "tawa_abu_lepas.mp3").exists():
        put(vo, norm(E.load_mp3(T / "tawa_abu_lepas.mp3", 1.2), 0.3)[: int(SR * 1.8)], EV["nilai.tos"] + 0.4, 0.4, -0.3)
    put(sfx, E.sfx_wahwah(), EV["nilai.smile"] + 0.4, 0.6)
    put(sfx, E.sfx_fanfare(), EV["nilai.title"], 0.5)

    base = {"hook": 0.5, "grup": 0.85, "hilang": 0.45, "kamis": 0.35, "xray": 0.4, "kirim": 0.3, "presentasi": 0.7, "nilai": 0.75}
    ip_t, ip_v = [0.0], [0.3]
    for k in order:
        ip_t += [S[k] + 0.1, END[k] - 0.1]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mutes = [(EV["nilai.board"] - 0.4, EV["nilai.shock"] + 0.8), (EV["kirim.sleep"] + 0.2, END["kirim"])]
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

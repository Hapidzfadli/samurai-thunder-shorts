"""Audio + timing for 'Kaleng Soda' - Dodi shakes a soda can to prank Rizky, then has to open it himself.

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/soda_timing.json and public/audio/soda_master.mp3.
"""
import argparse
import importlib.util
import math
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("l", ROOT / "scripts" / "build_audio_level30.py")
l = importlib.util.module_from_spec(spec)
sys.modules["l"] = l
spec.loader.exec_module(l)
r, g = l.r, l.g
np, SR, FPS = g.np, g.SR, g.FPS
TIMING_JSON = ROOT / "src" / "soda_timing.json"

BUBBLE = {"pitch": 1.3, "rate": 1.12, "k": 1.6, "gain": 1.0}
RIZKY = {"pitch": 0.88, "rate": 1.05, "k": 1.5}
DODI = {"pitch": 1.1, "rate": 1.0, "k": 1.55}

SCENES = [
    ("hook", 0.15, 0.3, 5.0, [
        ("hook_1", 0.0, "Dodi mengocok kaleng soda sekuat tenaga.", {"rate": 1.1, "emph": ["mengocok", "sekuat"], "k": 1.6}, 3),
        ("hook_2", 0.20, "Rencananya, Rizky yang akan membukanya.", {"rate": 1.05, "emph": ["Rizky", "membukanya"], "k": 1.55}, 3),
        ("hook_3", 0.25, "Kita masuk ke dalam kalengnya.", {"rate": 1.05, "emph": ["masuk", "kalengnya"], "k": 1.6}, 3),
    ]),
    ("kocok", 0.20, 0.3, 8.0, [
        ("kocok_1", 0.0, "Di dalam, ada gas karbon dioksida yang larut di soda.", {"rate": 1.07, "emph": ["gas", "larut"], "k": 1.5}, 3),
        ("kocok_2", 0.20, "Biasanya, mereka tenang dan menempel di cairan.", {"rate": 1.0, "emph": ["tenang"], "end": "fall", "k": 1.4}, 3),
        ("kocok_3", 0.25, "Tapi begitu dikocok, ribuan gelembung muncul dan menempel di dinding.", {"rate": 1.08, "emph": ["dikocok", "ribuan", "menempel"], "k": 1.6}, 3),
        ("kocok_4", 0.15, "Kami mau keluar, kami mau keluar.", dict(BUBBLE), 3),
    ]),
    ("tekan", 0.15, 0.3, 6.0, [
        ("tekan_1", 0.0, "Makin banyak gelembung, makin tinggi tekanannya.", {"rate": 1.1, "emph": ["Makin", "tinggi", "tekanannya"], "k": 1.6}, 3),
        ("tekan_2", 0.25, "Tutup kaleng menahan semuanya, kayak pintu bus mudik jam pulang.", {"rate": 1.07, "emph": ["menahan", "mudik"], "k": 1.55}, 3),
    ]),
    ("serah", 0.20, 0.3, 8.0, [
        ("serah_1", 0.0, "Dodi menyodorkan kaleng itu ke Rizky.", {"rate": 1.05, "emph": ["menyodorkan", "Rizky"], "k": 1.5}, 3),
        ("serah_2", 0.25, "Rizky menolak, lalu balik menyodorkan.", {"rate": 1.05, "emph": ["menolak", "balik"], "k": 1.5}, 3),
        ("serah_3", 0.20, "Kamu aja yang buka duluan.", dict(RIZKY, emph=["Kamu", "duluan"]), 3),
        ("serah_4", 0.30, "Dodi gugup. Tidak ada alasan lagi.", {"rate": 1.0, "emph": ["gugup", "lagi"], "end": "fall", "k": 1.4}, 3),
    ]),
    ("buka", 0.30, 0.3, 7.0, [
        ("buka_1", 0.0, "Dodi menarik cincinnya.", {"rate": 0.95, "emph": ["menarik", "cincinnya"], "k": 1.5}, 3),
        ("buka_2", 0.55, "Tekanan turun mendadak, semua gelembung berebut keluar, membawa sodanya.", {"rate": 1.1, "emph": ["mendadak", "berebut", "keluar"], "k": 1.65}, 3),
    ]),
    ("akhir", 0.20, 1.5, 7.0, [
        ("akhir_1", 0.0, "Dodi basah kuyup. Rizky tertawa terbahak-bahak.", {"rate": 1.07, "emph": ["basah", "tertawa"], "k": 1.55}, 3),
        ("akhir_2", 0.30, "Biar aman, diamkan kaleng beberapa menit sebelum dibuka.", {"rate": 1.03, "emph": ["aman", "diamkan"], "end": "fall", "k": 1.5}, 3),
        ("akhir_3", 0.35, "Kocok lagi?", dict(RIZKY, emph=["lagi"]), 3),
        ("akhir_4", 0.25, "Jangan.", dict(DODI, rate=0.95), 3),
    ]),
]
g.VARIANTS.update({"akhir_4": ["Jangan.", "Jangan!", "Jangan."]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.shake": s("hook_1", 0.05), "hook.smirk": s("hook_2", 0.1), "hook.dive": s("hook_3", 0.25),
        "kocok.calm": s("kocok_1"), "kocok.dots": s("kocok_2"), "kocok.shake": s("kocok_3", 0.2), "kocok.nucl": s("kocok_3", 0.55), "kocok.plead": s("kocok_4"),
        "tekan.rise": s("tekan_1"), "tekan.lid": s("tekan_2", 0.15), "tekan.max": s("tekan_2", 0.8),
        "serah.give": s("serah_1", 0.4), "serah.refuse": s("serah_2"), "serah.say": s("serah_3"), "serah.sweat": s("serah_4"),
        "buka.tab": s("buka_1", 0.5), "buka.pssh": s("buka_2", 0.02), "buka.rush": s("buka_2", 0.3), "buka.hit": s("buka_2", 0.78),
        "akhir.wet": s("akhir_1"), "akhir.laugh": s("akhir_1", 0.55), "akhir.tip": s("akhir_2"), "akhir.again": s("akhir_3"), "akhir.no": s("akhir_4"), "akhir.card": L["akhir_4"]["le"] + 0.2,
    }


# ------------------------------------------------------------------ SFX
def sfx_slosh(dur=1.6, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for t0 in np.arange(0.0, dur - 0.2, 0.17):
        m = int(SR * 0.2)
        tt = np.arange(m) / SR
        x[int(t0 * SR) : int(t0 * SR) + m] += g._bp(rng.standard_normal(m), 250, 2200) * np.sin(np.pi * tt / 0.2) ** 2 * rng.uniform(0.6, 1.0)
    x += np.sin(2 * np.pi * 200 * t) * 0.04
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.75).astype(np.float32)


def sfx_fizz(dur=3.0, seed=2, amount=0.5):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 4500, 11000) * (0.5 + 0.5 * np.abs(g._lp(rng.standard_normal(n), 40) * 8))
    x *= np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.4)
    return (x / (np.max(np.abs(x)) + 1e-9) * amount).astype(np.float32)


def sfx_pressure(dur=3.0):
    t = np.arange(int(SR * dur)) / SR
    f = 180 + 700 * (t / dur) ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + np.sign(np.sin(2 * np.pi * np.cumsum(f * 0.5) / SR)) * 0.12
    x *= np.minimum(1, t / 0.3) * (0.4 + 0.6 * t / dur) * np.minimum(1, (dur - t) / 0.05)
    return g._lp(x, 3500).astype(np.float32)


def sfx_tab(seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * 0.12)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 2500, 9000) * np.exp(-t * 60) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 80) * 0.5
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.8).astype(np.float32)


def sfx_pssht(dur=1.6, seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 2500, 12000) * np.exp(-t * 2.2) * np.minimum(1, t / 0.01)
    x += g._lp(rng.standard_normal(n), 900) * np.exp(-t * 5) * 0.8
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.9).astype(np.float32)


def sfx_splash(seed=5):
    rng = np.random.default_rng(seed)
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 300, 6000) * np.exp(-t * 6) * np.minimum(1, t / 0.005)
    x += np.sin(2 * np.pi * (140 - 60 * t) * t) * np.exp(-t * 14) * 0.7
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.95).astype(np.float32)


def sfx_creak(dur=1.4):
    return g.sfx_creak(dur, 4) * 0.8


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="soda_master.mp3"):
    narr_wav = g.prepare_voice_prompt(voice_arg)
    narr = g.tts_model.get_state_for_audio_prompt(str(narr_wav))
    g.SCENES = SCENES
    g.TIMING_JSON = TIMING_JSON
    g.STEP_F = {}

    clips = {}
    for key, _, _, _, segs in SCENES:
        for sid, gap, text, fx, n in segs:
            raw = g.get_raw(narr, narr_wav.name, sid, text, n)
            clips[sid] = g.apply_fx(raw, fx, text, sid)
            print(f"  {sid:10s} {len(clips[sid]) / SR:4.2f}s  {text[:56]}")
    P = g.plan(clips)
    ev = anchors(P)
    timing = g.write_timing(P, ev)
    total = P["total_s"]
    print(f"Total durasi video: {total:.1f}s ({timing['total_frames']} frame)")
    for k, v in P["scenes"].items():
        print(f"  scene {k:8s} {v['frames']:4d}f  mulai {v['start_s']:.2f}s")

    g.set_duration(total)
    N = g.N_SAMPLES
    S = {k: v["start_s"] for k, v in P["scenes"].items()}
    L = P["lines"]
    G = lambda name: S[name.split(".")[0]] + ev[name]
    order = [k for k, *_ in SCENES]
    scene_end = {k: S[k] + P["scenes"][k]["frames"] / FPS for k in order}

    sfx = np.zeros((N, 2), dtype=np.float32)
    vo = np.zeros((N, 2), dtype=np.float32)
    add = g.add_clip

    base = {"hook": 0.65, "kocok": 0.55, "tekan": 0.85, "serah": 0.7, "buka": 0.5, "akhir": 0.6}
    ip_t, ip_v = [0.0], [0.65]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("serah.sweat") + 0.3, G("buka.pssh") + 0.25), (G("buka.hit") - 0.15, G("akhir.wet") + 0.5)]
    mus = r.music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 2.5, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.28)

    # hook: sloshing shake, then diving into the can
    add(sfx, sfx_slosh(2.3, 1), G("hook.shake"), gain=0.8)
    add(sfx, l.sfx_boing(0.6), G("hook.smirk") + 0.1, gain=0.25)
    add(sfx, r.sfx_swoosh(0.6, 31), G("hook.dive"), gain=0.45)
    # kocok: calm fizz, then the shake and the nucleating bubbles
    add(sfx, sfx_fizz(3.0, 2, 0.28), G("kocok.calm"), gain=0.6)
    add(sfx, sfx_slosh(1.6, 3), G("kocok.shake"), gain=0.7)
    for i in range(10):
        add(sfx, l.sfx_pop(900 + 140 * (i % 5)), G("kocok.nucl") + 0.12 * i, gain=0.3)
    add(sfx, sfx_fizz(2.6, 4, 0.5), G("kocok.nucl"), gain=0.7)
    # tekan: pressure rising, the lid straining
    add(sfx, sfx_pressure(L["tekan_1"]["le"] - L["tekan_1"]["ls"] + 1.2), G("tekan.rise"), gain=0.45)
    add(sfx, sfx_creak(1.5), G("tekan.lid"), gain=0.6)
    add(sfx, sfx_creak(1.2), G("tekan.max") - 0.3, gain=0.6)
    # serah: passing the can back and forth, nervous gulp
    add(sfx, l.sfx_click(5), G("serah.give") + 0.1, gain=0.35)
    add(sfx, r.sfx_swoosh(0.3, 33), G("serah.refuse") + 0.2, gain=0.3)
    add(sfx, l.sfx_drip(1500, 2), G("serah.sweat") + 0.2, gain=0.4)
    add(sfx, l.sfx_drip(1700, 3), G("serah.sweat") + 0.6, gain=0.4)
    # buka: the tab, the hiss, the foam eruption, the splash
    add(sfx, sfx_tab(), G("buka.tab"), gain=0.9)
    add(sfx, sfx_pssht(1.8), G("buka.pssh"), gain=0.8)
    add(sfx, sfx_fizz(2.4, 6, 0.8), G("buka.rush"), gain=0.8)
    add(sfx, sfx_splash(), G("buka.hit"), gain=1.0)
    # akhir: dripping, a wet slide, comic boing at the end card
    for i in range(5):
        add(sfx, l.sfx_drip(1300 + 120 * i, i), G("akhir.wet") + 0.35 + 0.28 * i, gain=0.3)
    add(sfx, l.sfx_boing(0.6), G("akhir.card"), gain=0.3)

    for sid, ln in L.items():
        add(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 6.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.0 * env)
    master = mus * 0.85 * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.25
    fade_in = np.minimum(1.0, np.linspace(0, total, N) / 0.1)
    fade_out = np.minimum(1.0, np.linspace(total, 0, N) / 0.8)
    master *= (fade_in * fade_out)[:, None]
    master = np.tanh(master / (np.max(np.abs(master)) + 1e-6) * 1.6) / np.tanh(1.6) * 0.92

    out_mp3 = g.OUT_DIR / out_name
    wav_path = out_mp3.with_suffix(".wav")
    pcm = (np.clip(master, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "192k", str(out_mp3)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wav_path.unlink(missing_ok=True)
    print(f"Selesai! Master audio: {out_mp3} ({out_mp3.stat().st_size // 1024} KB), jadwal: {TIMING_JSON}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="voices/id_prompts/youtube_8ofVl1KpViI_ref.wav")
    ap.add_argument("--out", default="soda_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

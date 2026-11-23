"""Audio + timing for 'Kentut di Lift' - Pak Budi ate jengkol and is stuck in a full elevator (situational comedy with a little science).

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/lift_timing.json and public/audio/lift_master.mp3.
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
TIMING_JSON = ROOT / "src" / "lift_timing.json"

IBU = {"pitch": 1.15, "rate": 1.08, "k": 1.6}
MAGANG = {"pitch": 1.3, "rate": 1.1, "k": 1.6}
BUDI = {"pitch": 0.98, "rate": 0.98, "k": 1.2}
CEO = {"pitch": 0.85, "rate": 1.0, "k": 1.5}
BAKTERI = {"pitch": 1.35, "rate": 1.12, "k": 1.6}

SCENES = [
    ("hook", 0.15, 0.3, 6.0, [
        ("hook_1", 0.0, "Lift penuh. Tujuannya, lantai dua puluh.", {"rate": 1.08, "emph": ["penuh", "dua", "puluh"], "k": 1.55}, 3),
        ("hook_2", 0.20, "Dan Pak Budi, baru makan jengkol.", {"rate": 1.05, "emph": ["Budi", "jengkol"], "k": 1.6}, 3),
        ("hook_3", 0.25, "Perutnya berbunyi.", {"rate": 1.0, "emph": ["berbunyi"], "end": "fall", "k": 1.5}, 3),
    ]),
    ("perut", 0.15, 0.3, 8.0, [
        ("perut_1", 0.0, "Di dalam perutnya, bakteri pesta pora, menguraikan jengkol dan menghasilkan gas.", {"rate": 1.1, "emph": ["pesta", "pora", "gas"], "k": 1.55}, 3),
        ("perut_2", 0.20, "Tekanan naik. Rata-rata orang kentut empat belas kali sehari.", {"rate": 1.07, "emph": ["Tekanan", "empat", "belas"], "k": 1.55}, 3),
        ("perut_3", 0.15, "Hore, pesta!", dict(BAKTERI, emph=["pesta"]), 3),
    ]),
    ("naik", 0.15, 0.3, 8.0, [
        ("naik_1", 0.0, "Lantai tujuh. Pak Budi berkeringat dingin.", {"rate": 1.05, "emph": ["tujuh", "berkeringat"], "k": 1.55}, 3),
        ("naik_2", 0.20, "Lantai dua belas. Dia nggak kuat lagi.", {"rate": 1.05, "emph": ["dua", "belas", "nggak", "kuat"], "k": 1.6}, 3),
        ("naik_3", 0.55, "Tanpa suara. Tapi mematikan.", {"rate": 0.97, "emph": ["Tanpa", "mematikan"], "end": "fall", "k": 1.5}, 3),
    ]),
    ("bau", 0.15, 0.3, 8.0, [
        ("bau_1", 0.0, "Baunya dari gas hidrogen sulfida, hasil kerja bakteri usus.", {"rate": 1.08, "emph": ["hidrogen", "sulfida", "bakteri"], "k": 1.55}, 3),
        ("bau_2", 0.20, "Hidung manusia bisa mencium gas ini, meski cuma sedikit.", {"rate": 1.07, "emph": ["mencium", "sedikit"], "k": 1.55}, 3),
    ]),
    ("tuduh", 0.15, 0.3, 8.0, [
        ("tuduh_1", 0.0, "Semua langsung saling menuduh.", {"rate": 1.08, "emph": ["saling", "menuduh"], "k": 1.6}, 3),
        ("tuduh_2", 0.15, "Siapa ini, ya ampun!", dict(IBU, emph=["Siapa", "ampun"]), 3),
        ("tuduh_3", 0.15, "Bukan saya, Pak!", dict(MAGANG, emph=["Bukan", "saya"]), 3),
        ("tuduh_4", 0.30, "Wah, baunya, parah banget ya.", dict(BUDI, emph=["parah"]), 3),
    ]),
    ("buka", 0.15, 0.3, 6.0, [
        ("buka_1", 0.0, "Pintu terbuka di lantai dua puluh.", {"rate": 1.05, "emph": ["terbuka", "dua", "puluh"], "k": 1.5}, 3),
        ("buka_2", 0.20, "Di sana, HRD sudah menunggu Pak Budi, untuk wawancara kerja.", {"rate": 1.08, "emph": ["HRD", "menunggu", "wawancara"], "k": 1.55}, 3),
    ]),
    ("akhir", 0.20, 1.5, 7.5, [
        ("akhir_1", 0.0, "Selamat pagi, Pak Budi. Kita, sudah bertemu.", dict(CEO, emph=["Selamat", "bertemu"]), 3),
        ("akhir_2", 0.30, "Pak Budi tidak diterima. Tapi dia sangat berkesan.", {"rate": 1.05, "emph": ["tidak", "diterima", "berkesan"], "end": "fall", "k": 1.55}, 3),
        ("akhir_3", 0.30, "Lain kali, cari toilet dulu.", {"rate": 1.0, "emph": ["toilet"], "end": "fall", "k": 1.5}, 3),
    ]),
]
g.VARIANTS.update({"perut_3": ["Hore, pesta!", "Hore, pesta.", "Horee, pesta!"]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.enter": s("hook_1", 0.3), "hook.stomach": s("hook_2", 0.6), "hook.rumble": s("hook_3"),
        "perut.party": s("perut_1", 0.2), "perut.gas": s("perut_1", 0.7), "perut.press": s("perut_2"), "perut.cheer": s("perut_3"),
        "naik.seven": s("naik_1"), "naik.sweat": s("naik_1", 0.6), "naik.twelve": s("naik_2"), "naik.release": s("naik_3"),
        "bau.cloud": s("bau_1"), "bau.nose": s("bau_2"),
        "tuduh.start": s("tuduh_1"), "tuduh.ibu": s("tuduh_2"), "tuduh.magang": s("tuduh_3"), "tuduh.budi": s("tuduh_4"),
        "buka.door": s("buka_1", 0.55), "buka.hrd": s("buka_2"),
        "akhir.ceo": s("akhir_1"), "akhir.verdict": s("akhir_2"), "akhir.tip": s("akhir_3"), "akhir.card": L["akhir_3"]["le"] + 0.2,
    }


# ------------------------------------------------------------------ SFX
def sfx_growl(dur=1.6, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 70 + 40 * np.sin(2 * np.pi * 3.3 * t) + 25 * np.sin(2 * np.pi * 7.1 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.7 + g._lp(rng.standard_normal(n), 400) * 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * 5 * t))
    x *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.8).astype(np.float32)


def sfx_hum(dur=3.0, f0=120.0, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f0 * t) * 0.5 + np.sin(2 * np.pi * f0 * 2 * t) * 0.2 + g._lp(rng.standard_normal(n), 600) * 0.25
    x *= np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.4)
    return (x * 0.5).astype(np.float32)


def sfx_bubbles(dur=2.5, seed=2):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    out = np.zeros(n)
    for _ in range(int(dur * 7)):
        t0 = rng.uniform(0, dur - 0.2)
        m = int(SR * 0.12)
        tt = np.arange(m) / SR
        f = rng.uniform(500, 1200)
        out[int(t0 * SR) : int(t0 * SR) + m] += np.sin(2 * np.pi * (f + 900 * tt) * tt) * np.exp(-tt * 28) * rng.uniform(0.3, 0.8)
    out += g._lp(rng.standard_normal(n), 300) * 0.12
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.6).astype(np.float32)


def sfx_horn(seed=1):
    t = np.arange(int(SR * 0.5)) / SR
    x = np.sign(np.sin(2 * np.pi * (520 + 200 * np.minimum(1, t / 0.2)) * t)) * np.exp(-t * 4) * np.minimum(1, t / 0.01)
    return (g._lp(x, 3000) * 0.3).astype(np.float32)


def sfx_pssht(dur=0.9, seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 1800, 7000) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    x += g._lp(rng.standard_normal(n), 250) * 0.5 * np.sin(np.pi * np.clip(t / dur, 0, 1))
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.4).astype(np.float32)


def sfx_ding(seed=1):
    t = np.arange(int(SR * 1.4)) / SR
    x = np.sin(2 * np.pi * 880 * t) * np.exp(-t * 3.5) + np.sin(2 * np.pi * 1320 * np.maximum(0, t - 0.0)) * np.exp(-t * 4) * 0.4
    return (x * 0.45).astype(np.float32)


def sfx_gag(seed=5):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * 1.2))
    for t0 in (0.0, 0.4, 0.75):
        n = int(SR * 0.22)
        t = np.arange(n) / SR
        burst = g._bp(rng.standard_normal(n), 300, 1800) * np.exp(-t * 14) * np.minimum(1, t / 0.01)
        tone = np.sin(2 * np.pi * (200 - 70 * t) * t) * np.exp(-t * 12) * 0.5
        out[int(t0 * SR) : int(t0 * SR) + n] += burst + tone
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.6).astype(np.float32)


def sfx_wah(dur=1.6):
    t = np.arange(int(SR * dur)) / SR
    notes = [(0.0, 0.4, 311.0), (0.4, 0.8, 294.0), (0.8, 1.2, 277.0), (1.2, 1.6, 262.0)]
    f = np.zeros_like(t)
    for a, b, fr in notes:
        f[(t >= a) & (t < b)] = fr
    f[t >= 1.2] = 262.0 * (1 - 0.06 * np.sin(2 * np.pi * 6 * t[t >= 1.2]))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.5 + np.sin(ph) * 0.3
    x = g._lp(x, 1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * t)) * np.minimum(1, (dur - t) / 0.2)
    return (x * 0.5).astype(np.float32)


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="lift_master.mp3"):
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

    # music: bouncy lobby music, then tense, then an awkward hush, then back to bouncy for the twist
    base = {"hook": 0.6, "perut": 0.75, "naik": 0.45, "bau": 0.35, "tuduh": 0.7, "buka": 0.6, "akhir": 0.55}
    ip_t, ip_v = [0.0], [0.6]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("naik.release") - 0.4, G("bau.nose") + 0.8), (G("akhir.verdict") - 0.1, G("akhir.verdict") + 1.8)]
    mus = r.music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 2.5, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.3)

    add(sfx, sfx_ding(), G("hook.enter") - 0.2, gain=0.5)
    add(sfx, sfx_growl(1.6, 1), G("hook.rumble") - 0.05, gain=0.9)
    add(sfx, sfx_bubbles(L["perut_1"]["le"] - L["perut_1"]["ls"] + 1.5, 2), G("perut.party"), gain=0.6)
    for i in range(4):
        add(sfx, sfx_horn(i), G("perut.party") + 0.5 * i, gain=0.5)
    add(sfx, sfx_growl(1.4, 3), G("perut.press") + 0.5, gain=0.5)
    add(sfx, sfx_horn(9), G("perut.cheer"), gain=0.6)
    add(sfx, sfx_hum(L["naik_2"]["le"] - L["naik_1"]["ls"] + 1.0, 90, 4), G("naik.seven") - 0.1, gain=0.35)
    add(sfx, sfx_ding(), G("naik.seven") + 0.1, gain=0.4)
    add(sfx, l.sfx_drip(1300, 1), G("naik.sweat"), gain=0.35)
    add(sfx, sfx_ding(), G("naik.twelve") + 0.1, gain=0.4)
    add(sfx, sfx_pssht(0.9, 4), G("naik.release"), gain=0.6)
    add(sfx, sfx_gag(), G("bau.cloud") + 0.3, gain=0.6)
    add(sfx, l.sfx_sniff(), G("bau.nose") + 0.2, gain=0.4)
    add(sfx, l.sfx_boing(0.6), G("tuduh.start") + 0.1, gain=0.3)
    add(sfx, l.sfx_bonk(), G("tuduh.magang") + 0.3, gain=0.4)
    add(sfx, sfx_ding(), G("buka.door") - 0.2, gain=0.55)
    add(sfx, r.sfx_swoosh(0.6, 77), G("buka.door"), gain=0.4)
    add(sfx, sfx_wah(1.6), G("akhir.verdict") + 1.0, gain=0.5)
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
    ap.add_argument("--out", default="lift_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

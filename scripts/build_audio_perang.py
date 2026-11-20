"""Audio + timing for 'Nagashino 1575' - bright cinematic war short; taiko score, volleys, hooves, narration and shouted commands.

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/perang_timing.json and public/audio/perang_master.mp3.
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
TIMING_JSON = ROOT / "src" / "perang_timing.json"

NARR = {"rate": 1.02, "k": 1.6}
TAKEDA = {"pitch": 0.82, "rate": 1.0, "k": 1.9, "gain": 1.1}
ODA = {"pitch": 0.9, "rate": 1.0, "k": 1.9, "gain": 1.1}

SCENES = [
    ("hook", 0.20, 0.3, 8.0, [
        ("hook_1", 0.0, "Tahun seribu lima ratus tujuh puluh lima. Di Nagashino, dua pasukan siap berperang.", dict(NARR, emph=["seribu", "Nagashino", "berperang"]), 3),
        ("hook_2", 0.30, "Pasukan berkuda Takeda, ditakuti di seluruh Jepang.", dict(NARR, emph=["berkuda", "ditakuti"]), 3),
    ]),
    ("pagar", 0.15, 0.3, 8.0, [
        ("pagar_1", 0.0, "Tapi Oda Nobunaga punya rencana: tiga ribu penembak, di balik pagar kayu.", dict(NARR, emph=["rencana", "tiga", "ribu", "penembak", "pagar"]), 3),
        ("pagar_2", 0.30, "Sumbu senapan dinyalakan, satu per satu.", dict(NARR, emph=["Sumbu", "dinyalakan"]), 3),
    ]),
    ("serbu", 0.15, 0.3, 7.0, [
        ("serbu_1", 0.0, "Kavaleri Takeda menyerbu, dengan kecepatan penuh.", dict(NARR, rate=1.08, emph=["menyerbu", "penuh"]), 3),
        ("serbu_2", 0.20, "Serbu!", dict(TAKEDA, emph=["Serbu"]), 3),
    ]),
    ("tembak", 0.15, 0.3, 9.0, [
        ("tembak_1", 0.0, "Penembak Oda maju dalam tiga barisan: tembak, mundur, isi ulang.", dict(NARR, emph=["tiga", "tembak", "mundur", "isi", "ulang"]), 3),
        ("tembak_2", 0.30, "Tembak!", dict(ODA, emph=["Tembak"]), 3),
        ("tembak_3", 1.60, "Peluru tidak pernah berhenti.", dict(NARR, emph=["tidak", "berhenti"], end="fall"), 3),
    ]),
    ("runtuh", 0.15, 0.3, 7.0, [
        ("runtuh_1", 0.0, "Kuda demi kuda tumbang. Serbuan yang paling ditakuti, hancur.", dict(NARR, emph=["tumbang", "ditakuti", "hancur"], end="fall"), 3),
    ]),
    ("panglima", 0.20, 0.3, 6.0, [
        ("panglima_1", 0.0, "Dari atas bukit, Nobunaga hanya mengamati.", dict(NARR, rate=0.97, emph=["Nobunaga", "mengamati"]), 3),
    ]),
    ("akhir", 0.20, 1.8, 7.0, [
        ("akhir_1", 0.0, "Hari itu, era kavaleri samurai mulai berakhir.", dict(NARR, rate=0.96, emph=["era", "kavaleri", "berakhir"], end="fall"), 3),
    ]),
]
g.VARIANTS.update({"serbu_2": ["Serbu!", "Serbuu!", "Serbu."], "tembak_2": ["Tembak!", "Tembaak!", "Tembak."]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.pan": s("hook_1", 0.0), "hook.title": s("hook_1", 0.35), "hook.takeda": s("hook_2"),
        "pagar.line": s("pagar_1", 0.1), "pagar.count": s("pagar_1", 0.55), "pagar.match": s("pagar_2"),
        "serbu.charge": s("serbu_1", 0.1), "serbu.rumble": s("serbu_1", 0.5), "serbu.shout": s("serbu_2"),
        "tembak.rows": s("tembak_1"), "tembak.v1": s("tembak_2"), "tembak.v2": s("tembak_2") + 1.1, "tembak.v3": s("tembak_2") + 2.2, "tembak.never": s("tembak_3"),
        "runtuh.fall": s("runtuh_1", 0.1), "runtuh.last": s("runtuh_1", 0.65),
        "panglima.hill": s("panglima_1", 0.15),
        "akhir.end": s("akhir_1", 0.3), "akhir.card": L["akhir_1"]["le"] + 0.3,
    }


# ------------------------------------------------------------------ SFX
def sfx_taiko(dur=1.2, f0=62.0, seed=1):
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f0 * 2.6 * np.exp(-t * 22) + f0) * t) * np.exp(-t * 4.5)
    rng = np.random.default_rng(seed)
    x += g._bp(rng.standard_normal(n), 200, 900) * np.exp(-t * 30) * 0.4
    return (np.tanh(x * 1.5) * 0.9).astype(np.float32)


def sfx_horagai(dur=2.4):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 150 * (1 + 0.5 * np.minimum(1, t / 0.6)) * (1 + 0.01 * np.sin(2 * np.pi * 5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.6 * np.sin(2 * ph) + 0.4 * np.sin(3 * ph) + 0.25 * np.sin(4 * ph)) * np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.5)
    return (g._lp(x, 2200) * 0.35).astype(np.float32)


def sfx_gun(seed=1, reverb=True):
    rng = np.random.default_rng(seed)
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    crack = g._bp(rng.standard_normal(n), 800, 9000) * np.exp(-t * 60)
    boom = np.sin(2 * np.pi * (110 * np.exp(-t * 12) + 40) * t) * np.exp(-t * 7)
    tail = g._lp(rng.standard_normal(n), 900) * np.exp(-t * 3.2) * 0.35
    x = np.tanh((crack * 1.2 + boom * 1.0 + tail) * 1.4)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.9).astype(np.float32)


def sfx_volley(n_guns=14, spread=0.35, seed=3):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * 2.4))
    for i in range(n_guns):
        t0 = rng.uniform(0, spread)
        gun = sfx_gun(int(rng.integers(0, 999)))
        i0 = int(t0 * SR)
        out[i0 : i0 + len(gun)] += gun[: len(out) - i0] * rng.uniform(0.5, 1.0)
    return (np.tanh(out * 0.5) / (np.max(np.abs(np.tanh(out * 0.5))) + 1e-9) * 0.95).astype(np.float32)


def sfx_hooves(dur=4.0, seed=2, intensity=1.0):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    out = np.zeros(n)
    t0 = 0.0
    while t0 < dur - 0.15:
        for k in range(int(6 * intensity)):
            m = int(SR * 0.07)
            tt = np.arange(m) / SR
            th = (np.sin(2 * np.pi * (180 - 80 * tt / 0.07) * tt) * np.exp(-tt * 40) + g._bp(rng.standard_normal(m), 300, 2500) * np.exp(-tt * 60) * 0.6) * rng.uniform(0.4, 1.0)
            i0 = int((t0 + rng.uniform(0, 0.11)) * SR)
            if i0 + m < n:
                out[i0 : i0 + m] += th
        t0 += 0.16
    env = np.minimum(1, np.arange(n) / SR / 0.8) * np.minimum(1, (dur - np.arange(n) / SR) / 0.4)
    return (g._lp(out, 2500) * env * 0.8 / (np.max(np.abs(out)) + 1e-9)).astype(np.float32)


def sfx_neigh(dur=1.1, seed=1):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 700 + 500 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.8 + 60 * np.sin(2 * np.pi * 30 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.5
    return (g._lp(x, 4200) * 0.35).astype(np.float32)


def sfx_roar(dur=2.5, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 250, 1800) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2 * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.5).astype(np.float32)


def sfx_crash(seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 150, 2500) * np.exp(-t * 6) + np.sin(2 * np.pi * (90 * np.exp(-t * 8) + 40) * t) * np.exp(-t * 7)
    return (np.tanh(x * 1.2) / 1.2 * 0.9).astype(np.float32)


def sfx_hiss(dur=0.8, seed=2):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 3500, 11000) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.4).astype(np.float32)


def war_bed(total, intensity, pauses, seed=5):
    """Taiko pattern at 96 bpm + low drone + shakuhachi-like melody (D minor pentatonic)."""
    rng = np.random.default_rng(seed)
    N = int(SR * total) + SR
    out = np.zeros((N, 2), dtype=np.float32)
    beat = 60.0 / 96.0
    step = beat / 2
    pat_big = {0, 3, 6}
    pat_small = {2, 4, 5, 7}
    scale = [293.7, 349.2, 392.0, 440.0, 523.3, 587.3]

    def silent(t):
        return any(a <= t <= b for a, b in pauses)

    def flute(f, dur):
        t = np.arange(int(SR * dur)) / SR
        vib = 1 + 0.01 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.2)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x = np.sin(ph) + 0.15 * np.sin(2 * ph) + 0.08 * g._lp(rng.standard_normal(len(t)), 4500)
        return (x * np.minimum(1, t / 0.12) * np.minimum(1, (dur - t) / 0.3)).astype(np.float32)

    k = 0
    t = 0.0
    note = 2
    while t < total:
        pos = k % 8
        ti = float(np.interp(t, intensity[0], intensity[1]))
        if not silent(t) and ti > 0.05:
            if pos in pat_big:
                g._put(out, sfx_taiko(0.9, 58.0, k) * 0.85 * ti, t, 0.95, 0.95)
            elif pos in pat_small and ti > 0.5:
                g._put(out, sfx_taiko(0.4, 90.0, k) * 0.4 * ti, t, 0.8, 0.8)
            if pos == 0 and (k // 8) % 2 == 1 and ti > 0.3:
                note = int(np.clip(note + rng.integers(-2, 3), 0, len(scale) - 1))
                g._put(out, flute(scale[note], 2.0) * 0.18 * ti, t, 0.8, 0.8)
        k += 1
        t += step
    tt = np.arange(N) / SR
    drone = (np.sin(2 * np.pi * 73.4 * tt) * 0.5 + np.sin(2 * np.pi * 110 * tt) * 0.25) * np.interp(tt, intensity[0], intensity[1]) * 0.18
    out[:, 0] += drone.astype(np.float32)
    out[:, 1] += drone.astype(np.float32)
    return out[: int(SR * total)]


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="perang_master.mp3"):
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
            if sid in ("serbu_2", "tembak_2"):
                clips[sid] = g.shout(clips[sid]) if hasattr(g, "shout") else clips[sid]
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

    inten = {"hook": 0.4, "pagar": 0.55, "serbu": 0.9, "tembak": 1.0, "runtuh": 0.7, "panglima": 0.4, "akhir": 0.25}
    ip_t, ip_v = [0.0], [0.4]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [inten[k], inten[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("tembak.v1") - 0.15, G("tembak.v1") + 0.25), (G("panglima.hill") - 0.4, G("panglima.hill") + 1.2)]
    mus = war_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 0.8, total - 2.5, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.2)

    add(sfx, g.amb_birds(max(1.0, L["hook_2"]["le"] - L["hook_1"]["ls"] + 1.0), 11) * 0.5, G("hook.pan"), gain=0.5)
    add(sfx, sfx_horagai(2.4), G("hook.title") - 0.1, gain=0.8)
    add(sfx, sfx_roar(2.5, 1), G("hook.takeda") - 0.4, gain=0.3)
    for i in range(6):
        add(sfx, sfx_hiss(0.7, i), G("pagar.match") + 0.35 * i, gain=0.3)
    add(sfx, sfx_taiko(1.0, 70.0), G("pagar.count"), gain=0.8)
    add(sfx, sfx_hooves(L["serbu_1"]["le"] - L["serbu_1"]["ls"] + 3.0, 3, 1.0), G("serbu.charge"), gain=0.8)
    add(sfx, sfx_neigh(1.1, 1), G("serbu.charge") + 0.3, gain=0.5)
    add(sfx, sfx_roar(2.0, 2), G("serbu.shout") - 0.2, gain=0.5)
    add(sfx, sfx_horagai(1.8), G("serbu.shout") - 0.5, gain=0.5)
    add(sfx, sfx_volley(16, 0.4, 3), G("tembak.v1") + 0.35, gain=1.0)
    add(sfx, sfx_volley(16, 0.4, 4), G("tembak.v2") + 0.35, gain=1.0)
    add(sfx, sfx_volley(16, 0.4, 5), G("tembak.v3") + 0.35, gain=1.0)
    add(sfx, sfx_hooves(5.0, 6, 0.7), G("tembak.v1"), gain=0.5)
    add(sfx, sfx_neigh(1.0, 2), G("tembak.v2") + 0.9, gain=0.45)
    for i in range(5):
        add(sfx, sfx_crash(i), G("runtuh.fall") + 0.5 * i, gain=0.7)
    add(sfx, sfx_neigh(1.2, 3), G("runtuh.fall") + 0.2, gain=0.4)
    add(sfx, sfx_taiko(1.6, 52.0), G("panglima.hill"), gain=0.9)
    add(sfx, g.amb_birds(max(1.0, L["akhir_1"]["le"] - L["akhir_1"]["ls"] + 3.0), 12) * 0.6, G("akhir.end"), gain=0.5)
    add(sfx, sfx_taiko(2.0, 48.0), G("akhir.card"), gain=0.9)

    for sid, ln in L.items():
        add(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 5.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.2 * env)
    master = mus * 0.9 * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.25
    fade_in = np.minimum(1.0, np.linspace(0, total, N) / 0.1)
    fade_out = np.minimum(1.0, np.linspace(total, 0, N) / 1.0)
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
    ap.add_argument("--out", default="perang_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

"""Audio + timing for 'Karaoke Tetangga Jam 12 Malam' - pure entertainment comedy; sung/shouted lines, synthetic koplo backing, character voices.

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/karaoke_timing.json and public/audio/karaoke_master.mp3.
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
TIMING_JSON = ROOT / "src" / "karaoke_timing.json"

JOKO = {"pitch": 0.9, "rate": 1.0, "k": 1.6}
JOKO_SING = {"pitch": 0.95, "rate": 0.82, "k": 1.9, "emph": ["sedalam", "selebar"], "end": "rise"}
TINI = {"pitch": 1.14, "rate": 1.12, "k": 1.7}
RIZAL = {"pitch": 0.97, "rate": 0.95, "k": 1.2, "end": "fall"}
UJANG = {"pitch": 0.88, "rate": 0.95, "k": 1.5}
NENEK_SING = {"pitch": 1.18, "rate": 0.78, "k": 1.8, "end": "fall", "gain": 1.0}
NENEK = {"pitch": 1.12, "rate": 0.95, "k": 1.4}

SCENES = [
    ("hook", 0.15, 0.3, 7.0, [
        ("hook_1", 0.0, "Jam dua belas malam. Pak Joko, menyalakan karaoke.", {"rate": 1.08, "emph": ["dua", "belas", "karaoke"], "k": 1.6}, 3),
        ("hook_2", 0.25, "Satu, dua, tes. Tes.", dict(JOKO, emph=["tes", "Tes"]), 3),
        ("hook_3", 0.25, "Cintaku sedalam parit, rinduku selebar gorong-gorong!", dict(JOKO_SING), 3),
    ]),
    ("tini", 0.15, 0.3, 5.5, [
        ("tini_1", 0.0, "Di sebelah, Bu Tini langsung terbangun.", {"rate": 1.08, "emph": ["Tini", "terbangun"], "k": 1.6}, 3),
        ("tini_2", 0.15, "Astaghfirullah, siapa yang nyanyi jam segini?", dict(TINI, emph=["Astaghfirullah", "siapa"]), 3),
    ]),
    ("rizal", 0.15, 0.3, 5.5, [
        ("rizal_1", 0.0, "Mas Rizal, besok meeting jam delapan.", {"rate": 1.07, "emph": ["Rizal", "meeting", "delapan"], "k": 1.55}, 3),
        ("rizal_2", 0.20, "Ya Tuhan, tolong. Saya cuma mau tidur.", dict(RIZAL, emph=["tolong", "tidur"]), 3),
    ]),
    ("ronda", 0.15, 0.3, 5.5, [
        ("ronda_1", 0.0, "Di pos ronda, Pak Ujang jatuh dari kursi.", {"rate": 1.07, "emph": ["Ujang", "jatuh"], "k": 1.6}, 3),
        ("ronda_2", 0.15, "Ada apa ini? Maling? Gempa?", dict(UJANG, emph=["Maling", "Gempa"]), 3),
    ]),
    ("pagar", 0.15, 0.3, 8.0, [
        ("pagar_1", 0.0, "Bu Tini menggedor pagar.", {"rate": 1.08, "emph": ["menggedor", "pagar"], "k": 1.6}, 3),
        ("pagar_2", 0.15, "Pak Joko, sudah malam!", dict(TINI, emph=["Joko", "malam"]), 3),
        ("pagar_3", 0.20, "Sebentar, Bu. Lagu terakhir.", dict(JOKO, emph=["Sebentar", "terakhir"]), 3),
        ("pagar_4", 0.25, "Lagu terakhir, yang kesepuluh.", {"rate": 1.0, "emph": ["terakhir", "kesepuluh"], "end": "fall", "k": 1.6}, 3),
    ]),
    ("dalam", 0.15, 0.3, 8.0, [
        ("dalam_1", 0.0, "Warga masuk mau protes. Lalu lagu koplo favorit mereka, diputar.", {"rate": 1.08, "emph": ["protes", "koplo", "diputar"], "k": 1.6}, 3),
        ("dalam_2", 0.20, "Satu lagu saja, ya.", dict(TINI, emph=["Satu", "saja"]), 3),
        ("dalam_3", 0.25, "Semua lupa tujuan, dan ikut goyang.", {"rate": 1.07, "emph": ["lupa", "goyang"], "k": 1.6}, 3),
    ]),
    ("panggung", 0.20, 1.5, 9.0, [
        ("panggung_1", 0.0, "Lalu, Nenek Mina mengambil mic.", {"rate": 1.03, "emph": ["Nenek", "Mina", "mic"], "k": 1.55}, 3),
        ("panggung_2", 0.30, "Malam ini bulan tersenyum, menemani cintaku yang syahdu.", dict(NENEK_SING, emph=["bulan", "syahdu"]), 3),
        ("panggung_3", 0.30, "Semua terdiam. Pak Joko menangis.", {"rate": 1.0, "emph": ["terdiam", "menangis"], "end": "fall", "k": 1.5}, 3),
        ("panggung_4", 0.25, "Saya, kalah, Nek.", dict(JOKO, rate=0.9, end="fall", emph=["kalah"]), 3),
        ("panggung_5", 0.30, "Besok malam lagi, ya.", dict(TINI, emph=["Besok", "lagi"]), 3),
    ]),
]
SUNG = {"hook_3": "vibrato=f=5.8:d=0.45", "panggung_2": "vibrato=f=5.0:d=0.3"}
g.VARIANTS.update({"hook_2": ["Satu, dua, tes. Tes.", "Satu dua, tes, tes.", "Satu, dua, tes tes."]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.start": s("hook_1", 0.5), "hook.test": s("hook_2"), "hook.sing": s("hook_3"), "hook.shake": s("hook_3", 0.3),
        "tini.wake": s("tini_1", 0.3), "tini.say": s("tini_2"),
        "rizal.look": s("rizal_1"), "rizal.say": s("rizal_2"),
        "ronda.fall": s("ronda_1", 0.5), "ronda.say": s("ronda_2"),
        "pagar.knock": s("pagar_1", 0.3), "pagar.say": s("pagar_2"), "pagar.joko": s("pagar_3"), "pagar.tenth": s("pagar_4"),
        "dalam.enter": s("dalam_1"), "dalam.song": s("dalam_1", 0.55), "dalam.tini": s("dalam_2"), "dalam.dance": s("dalam_3"),
        "panggung.mic": s("panggung_1"), "panggung.sing": s("panggung_2"), "panggung.quiet": s("panggung_3"), "panggung.joko": s("panggung_4"), "panggung.tini": s("panggung_5"),
        "panggung.card": L["panggung_5"]["le"] + 0.2,
    }


# ------------------------------------------------------------------ SFX
def sfx_thump(dur=0.35):
    t = np.arange(int(SR * dur)) / SR
    x = np.sin(2 * np.pi * (140 * np.exp(-t * 14) + 45) * t) * np.exp(-t * 11)
    return (np.tanh(x * 1.6) * 0.9).astype(np.float32)


def sfx_feedback(dur=0.7):
    t = np.arange(int(SR * dur)) / SR
    f = 2400 + 900 * (t / dur) ** 1.5
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.15)
    return (x * 0.35).astype(np.float32)


def sfx_whistle(dur=1.0):
    t = np.arange(int(SR * dur)) / SR
    x = np.sin(2 * np.pi * 2900 * t + 3 * np.sin(2 * np.pi * 32 * t)) * np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.08)
    return (x * 0.4).astype(np.float32)


def sfx_rooster(dur=1.6):
    n = int(SR * dur)
    t = np.arange(n) / SR
    segs = [(0.0, 0.18, 520, 780), (0.2, 0.42, 780, 640), (0.45, 0.75, 640, 980), (0.8, 1.55, 980, 600)]
    f = np.zeros(n)
    env = np.zeros(n)
    for a, b, f0, f1 in segs:
        m = (t >= a) & (t < b)
        f[m] = f0 + (f1 - f0) * (t[m] - a) / (b - a)
        env[m] = np.sin(np.pi * (t[m] - a) / (b - a)) ** 0.6
    f *= 1 + 0.03 * np.sin(2 * np.pi * 14 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * env
    return (g._lp(x, 3500) * 0.35).astype(np.float32)


def sfx_clap(seed=1, n_claps=14):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * 2.0))
    for _ in range(n_claps):
        t0 = rng.uniform(0, 1.6)
        m = int(SR * 0.08)
        tt = np.arange(m) / SR
        out[int(t0 * SR) : int(t0 * SR) + m] += g._bp(rng.standard_normal(m), 800, 6000) * np.exp(-tt * 55) * rng.uniform(0.3, 1.0)
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


def koplo_bed(total, intensity, pauses, seed=5):
    """Synthetic koplo: kendang (dung/tak), bass, suling melody. 140 bpm."""
    rng = np.random.default_rng(seed)
    N = int(SR * total) + SR
    out = np.zeros((N, 2), dtype=np.float32)
    beat = 60.0 / 140.0
    step = beat / 4
    dung = {0, 7, 10}
    tak = {4, 12, 14}
    ting = {2, 6, 9, 15}
    bass_notes = [55.0, 55.0, 82.4, 55.0, 73.4, 55.0]
    bass_steps = [0, 3, 6, 8, 11, 14]
    scale = [440.0, 523.3, 587.3, 659.3, 784.0, 880.0]

    def silent(t):
        return any(a <= t <= b for a, b in pauses)

    def kdung():
        t = np.arange(int(SR * 0.28)) / SR
        return (np.sin(2 * np.pi * (180 * np.exp(-t * 18) + 95) * t) * np.exp(-t * 14)).astype(np.float32)

    def ktak():
        n = int(SR * 0.09)
        t = np.arange(n) / SR
        return (g._bp(rng.standard_normal(n), 1500, 6500) * np.exp(-t * 55) + np.sin(2 * np.pi * 1100 * t) * np.exp(-t * 60) * 0.4).astype(np.float32)

    def kting():
        t = np.arange(int(SR * 0.1)) / SR
        return (np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 70) * 0.5).astype(np.float32)

    def bass(f):
        t = np.arange(int(SR * 0.3)) / SR
        return (np.tanh(np.sin(2 * np.pi * f * t) * 2) * np.exp(-t * 6)).astype(np.float32)

    def suling(f, dur):
        t = np.arange(int(SR * dur)) / SR
        vib = 1 + 0.012 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.15)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        x = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.05 * g._lp(rng.standard_normal(len(t)), 5000)
        return (x * np.minimum(1, t / 0.03) * np.exp(-t * 2.2) * np.minimum(1, (dur - t) / 0.05)).astype(np.float32)

    k = 0
    t = 0.0
    note = 2
    while t < total:
        pos = k % 16
        ti = float(np.interp(t, intensity[0], intensity[1]))
        if not silent(t) and ti > 0.05:
            if pos in dung:
                g._put(out, kdung() * 0.9 * ti, t, 0.9, 0.9)
            if pos in tak:
                g._put(out, ktak() * 0.55 * ti, t, 0.85, 0.85)
            if pos in ting and ti > 0.3:
                g._put(out, kting() * 0.4 * ti, t, 0.9, 0.7)
            if pos in bass_steps:
                g._put(out, bass(bass_notes[bass_steps.index(pos)]) * 0.55 * ti, t, 0.8, 0.8)
            if ti > 0.5 and pos in (0, 6, 10, 12):
                note = int(np.clip(note + rng.integers(-2, 3), 0, len(scale) - 1))
                g._put(out, suling(scale[note], 0.35) * 0.22 * ti, t, 0.75, 0.9)
        k += 1
        t += step
    return out[: int(SR * total)]


def pad(dur, seed=1):
    t = np.arange(int(SR * dur)) / SR
    x = np.zeros_like(t)
    for f in (220.0, 261.6, 329.6, 392.0):
        x += np.sin(2 * np.pi * f * t) * 0.15 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.2 * t + f))
    x *= np.minimum(1, t / 1.0) * np.minimum(1, (dur - t) / 1.0)
    return np.stack([x, x], axis=1).astype(np.float32)


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="karaoke_master.mp3"):
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
            if sid in SUNG:
                clips[sid] = g.ffmpeg_filter(clips[sid], SUNG[sid])
                if sid == "panggung_2":
                    clips[sid] = g.reverb(clips[sid], rt=1.4, wet=0.3, lp=4500, seed=3)
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

    # the karaoke track is diegetic: full in the street / party, muffled inside the bedrooms and at the guard post
    inten = {"hook": 0.95, "tini": 0.9, "rizal": 0.9, "ronda": 0.9, "pagar": 0.95, "dalam": 1.0, "panggung": 0.0}
    ip_t, ip_v = [0.0], [0.9]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [inten[k], inten[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("panggung.mic") - 0.1, total)]
    mus_full = koplo_bed(total, (ip_t, ip_v), pauses)
    mus_low = np.stack([g._lp(mus_full[:, 0], 420), g._lp(mus_full[:, 1], 420)], axis=1).astype(np.float32)
    tt = np.linspace(0, total, N, endpoint=False)
    inside = np.zeros(N)
    for k in ("tini", "rizal", "ronda"):
        inside += np.interp(tt, [S[k] - 0.2, S[k] + 0.1, scene_end[k] - 0.1, scene_end[k] + 0.2], [0, 1, 1, 0])
    inside = np.clip(inside, 0, 1)[:, None]
    mus = mus_full * (1 - inside) + mus_low * inside * 1.2
    mus *= np.interp(tt, [0, 0.3, total - 2.0, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.25)

    add(sfx, sfx_thump(), G("hook.start"), gain=0.9)
    add(sfx, sfx_feedback(0.7), G("hook.test") - 0.05, gain=0.6)
    for i in range(6):
        add(sfx, sfx_thump(), G("hook.shake") + 0.43 * i, gain=0.5)
    add(sfx, l.sfx_boing(0.6), G("tini.wake"), gain=0.3)
    add(sfx, l.sfx_bonk(), G("tini.say") - 0.2, gain=0.4)
    add(sfx, sfx_wah(1.6), G("rizal.say") + 1.4, gain=0.35)
    add(sfx, l.sfx_drip(1500, 2), G("rizal.look") + 0.3, gain=0.3)
    add(sfx, l.sfx_bonk(), G("ronda.fall"), gain=0.8)
    add(sfx, sfx_whistle(1.0), G("ronda.say") + 1.4, gain=0.5)
    for i in range(4):
        add(sfx, l.sfx_bonk(), G("pagar.knock") + 0.32 * i, gain=0.55)
    add(sfx, sfx_feedback(0.5), G("pagar.joko") + 0.2, gain=0.4)
    add(sfx, sfx_clap(2, 10), G("dalam.dance"), gain=0.5)
    add(sfx, pad(L["panggung_2"]["le"] - L["panggung_2"]["ls"] + 3.0), G("panggung.sing") - 0.5, gain=0.5)
    add(sfx, sfx_clap(3, 26), G("panggung.quiet") + 0.2, gain=0.7)
    add(sfx, sfx_wah(1.6), G("panggung.joko") + 0.8, gain=0.4)
    add(sfx, sfx_rooster(1.6), G("panggung.tini") + 0.9, gain=0.5)
    add(sfx, l.sfx_boing(0.6), G("panggung.card"), gain=0.3)

    for sid, ln in L.items():
        add(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 4.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.0 * env)
    master = mus * 0.95 * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.25
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
    ap.add_argument("--out", default="karaoke_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

"""Audio + timing for 'Misi: Remote TV' - cinematic heist comedy; tension score, whispered lines, character voices.

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/misi_timing.json and public/audio/misi_master.mp3.
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
TIMING_JSON = ROOT / "src" / "misi_timing.json"

BIMA = {"pitch": 1.28, "rate": 1.05, "k": 1.6, "whisper": True, "gain": 1.2}
BIMA_LOUD = {"pitch": 1.3, "rate": 1.08, "k": 1.7}
AYAH = {"pitch": 0.84, "rate": 0.95, "k": 1.5}
IBU = {"pitch": 1.13, "rate": 1.1, "k": 1.7}

SCENES = [
    ("hook", 0.15, 0.3, 7.0, [
        ("hook_1", 0.0, "Jam dua pagi. Misi malam ini: ambil remote TV.", {"rate": 1.05, "emph": ["dua", "pagi", "remote"], "k": 1.6}, 3),
        ("hook_2", 0.25, "Targetnya, ada di tangan ayah.", {"rate": 1.02, "emph": ["Targetnya", "ayah"], "k": 1.6}, 3),
    ]),
    ("lorong", 0.15, 0.3, 8.0, [
        ("lorong_1", 0.0, "Satu langkah. Dua langkah.", {"rate": 0.95, "emph": ["Satu", "Dua"], "k": 1.5}, 3),
        ("lorong_2", 0.30, "Jangan berisik, jangan berisik.", dict(BIMA, emph=["Jangan", "berisik"]), 3),
        ("lorong_3", 0.60, "Lantai berderit. Bima membeku.", {"rate": 1.05, "emph": ["berderit", "membeku"], "k": 1.6}, 3),
    ]),
    ("kucing", 0.15, 0.3, 6.5, [
        ("kucing_1", 0.0, "Tapi, ada penjaga di ruangan itu.", {"rate": 1.03, "emph": ["penjaga"], "k": 1.6}, 3),
        ("kucing_2", 0.35, "Mpus, kita teman, kan?", dict(BIMA, emph=["Mpus", "teman"]), 3),
    ]),
    ("tangan", 0.15, 0.3, 7.0, [
        ("tangan_1", 0.0, "Sedikit lagi. Sedikit lagi.", {"rate": 0.92, "emph": ["Sedikit", "lagi"], "k": 1.5}, 3),
        ("tangan_2", 0.55, "Dengkur ayah, berhenti.", {"rate": 0.95, "emph": ["Dengkur", "berhenti"], "end": "fall", "k": 1.6}, 3),
    ]),
    ("twist", 0.30, 0.3, 7.0, [
        ("twist_1", 0.0, "Mau ini?", dict(AYAH, emph=["Mau"]), 3),
        ("twist_2", 0.30, "Hah?!", dict(BIMA_LOUD, emph=["Hah"]), 3),
        ("twist_3", 0.60, "Jam berapa ini?!", dict(IBU, emph=["Jam", "berapa"]), 3),
    ]),
    ("akhir", 0.20, 1.5, 8.0, [
        ("akhir_1", 0.0, "Akhirnya, satu keluarga nonton bareng, sampai jam dua pagi.", {"rate": 1.07, "emph": ["satu", "keluarga", "bareng"], "k": 1.55}, 3),
        ("akhir_2", 0.30, "Besok sekolah.", dict(IBU, rate=1.0, emph=["Besok", "sekolah"]), 3),
        ("akhir_3", 0.25, "Satu episode lagi.", dict(BIMA_LOUD, emph=["episode", "lagi"]), 3),
    ]),
]
g.VARIANTS.update({"twist_2": ["Hah?!", "Hah?", "Hah!"], "twist_1": ["Mau ini?", "Mau ini?", "Mau, ini?"]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.peek": s("hook_1", 0.0), "hook.title": s("hook_1", 0.55), "hook.target": s("hook_2", 0.4),
        "lorong.step1": s("lorong_1", 0.1), "lorong.step2": s("lorong_1", 0.55), "lorong.whisper": s("lorong_2"), "lorong.creak": s("lorong_3", 0.05), "lorong.freeze": s("lorong_3", 0.35),
        "kucing.guard": s("kucing_1", 0.5), "kucing.talk": s("kucing_2"), "kucing.hiss": s("kucing_2", 0.95),
        "tangan.reach": s("tangan_1", 0.1), "tangan.near": s("tangan_1", 0.6), "tangan.snore": s("tangan_2", 0.15), "tangan.stop": s("tangan_2", 0.6),
        "twist.eye": s("twist_1", -0.15), "twist.say": s("twist_1"), "twist.hah": s("twist_2"), "twist.light": s("twist_3", -0.2), "twist.ibu": s("twist_3"),
        "akhir.sit": s("akhir_1", 0.25), "akhir.ibu": s("akhir_2"), "akhir.bima": s("akhir_3"), "akhir.card": L["akhir_3"]["le"] + 0.2,
    }


# ------------------------------------------------------------------ SFX
def sfx_heartbeat(dur=3.0, bpm=88):
    n = int(SR * dur)
    out = np.zeros(n)
    per = 60.0 / bpm
    t0 = 0.0
    while t0 < dur - 0.3:
        for off, amp in ((0.0, 1.0), (0.18, 0.7)):
            m = int(SR * 0.16)
            tt = np.arange(m) / SR
            b = np.sin(2 * np.pi * (70 * np.exp(-tt * 10) + 38) * tt) * np.exp(-tt * 16) * amp
            i0 = int((t0 + off) * SR)
            if i0 + m < n:
                out[i0 : i0 + m] += b
        t0 += per
    return (g._lp(out, 200) * 0.9).astype(np.float32)


def sfx_snore(dur=4.0, seed=8):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    cyc = (t % 2.0) / 2.0
    env = np.where(cyc < 0.4, np.sin(np.pi * cyc / 0.4) ** 1.4, 0) + 0.3 * np.where((cyc > 0.52) & (cyc < 0.66), np.sin(np.pi * (cyc - 0.52) / 0.14), 0)
    x = g._lp(rng.standard_normal(n), 420, 3) * env
    x += 0.5 * np.sin(2 * np.pi * (55 + 25 * env) * t) * env
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)


def sfx_meow(dur=0.9, seed=1):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 520 + 380 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.8
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6
    return (g._lp(x, 3500) * 0.4).astype(np.float32)


def sfx_hiss(dur=0.7, seed=2):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 3500, 11000) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.6).astype(np.float32)


def sfx_tv(dur=6.0, seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 400, 2600) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * t)) * 0.3
    for t0 in np.arange(0.4, dur - 0.3, 0.9):
        m = int(SR * 0.25)
        tt = np.arange(m) / SR
        x[int(t0 * SR) : int(t0 * SR) + m] += np.sin(2 * np.pi * (500 + 700 * tt / 0.25) * tt) * np.exp(-tt * 9) * 0.18
    x *= np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4)
    return (g._lp(x, 3000)).astype(np.float32)


def sfx_gasp(seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * 0.45)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 600, 3500) * np.sin(np.pi * t / 0.45) ** 0.8
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.5).astype(np.float32)


def sfx_wah(dur=1.6):
    t = np.arange(int(SR * dur)) / SR
    notes = [(0.0, 0.4, 311.0), (0.4, 0.8, 294.0), (0.8, 1.2, 277.0), (1.2, 1.6, 262.0)]
    f = np.zeros_like(t)
    for a, b, fr in notes:
        f[(t >= a) & (t < b)] = fr
    f[t >= 1.2] = 262.0 * (1 - 0.06 * np.sin(2 * np.pi * 6 * t[t >= 1.2]))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.5 + np.sin(ph) * 0.3
    return (g._lp(x, 1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * t)) * np.minimum(1, (dur - t) / 0.2) * 0.5).astype(np.float32)


def tension_bed(total, intensity, pauses, seed=2):
    """Heist score: low drone with tremolo, ticking clock, sparse plucks."""
    rng = np.random.default_rng(seed)
    N = int(SR * total) + SR
    out = np.zeros((N, 2), dtype=np.float32)
    t = np.arange(N) / SR
    ti = np.interp(t, intensity[0], intensity[1])
    mask = np.ones(N)
    for a, b in pauses:
        mask[(t >= a) & (t <= b)] = 0
    mask = g._lp(mask, 8)
    drone = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.4 * t) * 0.25 + np.sin(2 * np.pi * 110 * t) * 0.12) * (0.65 + 0.35 * np.sin(2 * np.pi * 0.35 * t))
    drone *= ti * mask * 0.5
    out[:, 0] += drone
    out[:, 1] += drone
    beat = 0.5
    tt = 0.0
    k = 0
    notes = [220.0, 233.1, 220.0, 196.0, 220.0, 261.6]
    while tt < total:
        if mask[int(tt * SR)] > 0.5 and ti[int(tt * SR)] > 0.1:
            m = int(SR * 0.04)
            x = g._bp(rng.standard_normal(m), 2500, 7000) * np.exp(-np.arange(m) / SR * 90) * 0.35 * ti[int(tt * SR)]
            g._put(out, x.astype(np.float32), tt, 0.7, 0.7)
            if k % 4 == 0 and ti[int(tt * SR)] > 0.3:
                n2 = int(SR * 0.5)
                ttn = np.arange(n2) / SR
                f = notes[(k // 4) % len(notes)]
                pl = (np.sin(2 * np.pi * f * ttn) + 0.3 * np.sin(4 * np.pi * f * ttn)) * np.exp(-ttn * 7) * 0.22 * ti[int(tt * SR)]
                g._put(out, pl.astype(np.float32), tt, 0.8, 0.6)
        k += 1
        tt += beat
    return out[: int(SR * total)]


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="misi_master.mp3"):
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

    # score: tension that climbs, a hard stop for the reveal, then a bouncy family-night theme
    inten = {"hook": 0.5, "lorong": 0.7, "kucing": 0.85, "tangan": 1.0, "twist": 0.0, "akhir": 0.0}
    ip_t, ip_v = [0.0], [0.5]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [inten[k], inten[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("lorong.creak") - 0.05, G("lorong.freeze") + 0.9), (G("tangan.stop") - 0.1, G("tangan.stop") + 5.0)]
    mus = tension_bed(total, (ip_t, ip_v), pauses)
    # playful theme for the ending
    play = r.music_bed(total, ([0.0, G("akhir.sit") - 0.2, G("akhir.sit"), total], [0.0, 0.0, 0.7, 0.7]), [])
    tt = np.linspace(0, total, N, endpoint=False)
    mus = mus + play[:N] * 0.9
    mus *= np.interp(tt, [0, 0.5, total - 2.0, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.2)

    add(sfx, sfx_tv(L["hook_2"]["le"] - L["hook_1"]["ls"] + 1.5), G("hook.peek"), gain=0.5)
    add(sfx, sfx_snore(L["hook_2"]["le"] - L["hook_1"]["ls"] + 2.0), G("hook.peek"), gain=0.55)
    add(sfx, sfx_heartbeat(L["lorong_3"]["le"] - L["lorong_1"]["ls"] + 1.0), G("lorong.step1") - 0.2, gain=0.55)
    add(sfx, l.sfx_pop(500), G("lorong.step1"), gain=0.25)
    add(sfx, l.sfx_pop(560), G("lorong.step2"), gain=0.25)
    add(sfx, g.sfx_creak(1.2, 4), G("lorong.creak"), gain=0.9)
    add(sfx, sfx_snore(3.0, 9), G("kucing.guard"), gain=0.35)
    add(sfx, sfx_meow(0.9), G("kucing.hiss") - 0.4, gain=0.55)
    add(sfx, sfx_hiss(0.7), G("kucing.hiss"), gain=0.5)
    add(sfx, sfx_heartbeat(L["tangan_2"]["le"] - L["tangan_1"]["ls"] + 0.5, 110), G("tangan.reach"), gain=0.6)
    add(sfx, sfx_snore(2.4, 5), G("tangan.snore") - 0.3, gain=0.5)
    add(sfx, l.sfx_click(3), G("twist.light"), gain=0.9)
    add(sfx, sfx_gasp(), G("twist.hah") + 0.1, gain=0.5)
    add(sfx, sfx_wah(1.6), G("twist.ibu") + 0.5, gain=0.4)
    add(sfx, sfx_tv(L["akhir_3"]["le"] - L["akhir_1"]["ls"] + 2.0, 8), G("akhir.sit"), gain=0.5)
    add(sfx, l.sfx_boing(0.6), G("akhir.card"), gain=0.3)

    for sid, ln in L.items():
        add(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 5.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.0 * env)
    master = mus * 0.9 * duck_music[:, None] + sfx * duck_sfx[:, None] + vo * 1.25
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
    ap.add_argument("--out", default="misi_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

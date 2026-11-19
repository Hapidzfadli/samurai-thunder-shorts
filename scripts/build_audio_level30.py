"""Audio + timing for 'Level 30' - a comedy about why chili burns (capsaicin) and why water doesn't help.

Built to the 3D-virality blueprint: action in the first 3 s, tiny captions synced to speech, a SFX for every beat,
music that follows an emotional arc, and a distinct voice for each character.
Writes src/level30_timing.json and public/audio/level30_master.mp3.
"""
import argparse
import importlib.util
import math
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("r", ROOT / "scripts" / "build_audio_rani.py")
r = importlib.util.module_from_spec(spec)
sys.modules["r"] = r
spec.loader.exec_module(r)
g = r.g
np, SR, FPS = g.np, g.SR, g.FPS
TIMING_JSON = ROOT / "src" / "level30_timing.json"

GUARD = {"pitch": 1.22, "rate": 1.12, "k": 1.6, "gain": 1.05}       # reseptor: squeaky guard
BOSS = {"pitch": 0.86, "rate": 1.1, "k": 1.6, "gain": 1.05}         # operator otak: deep, panicked
WAITER = {"pitch": 1.08, "rate": 1.0, "k": 1.5}

SCENES = [
    ("hook", 0.15, 0.35, 5.0, [
        ("hook_1", 0.0, "Cabai level tiga puluh. Mas Budi menggigitnya.", {"rate": 1.08, "emph": ["level", "tiga", "menggigitnya"], "k": 1.6}, 3),
        ("hook_2", 0.20, "Diam. Satu detik. Dua detik.", {"rate": 0.95, "emph": ["Diam"], "k": 1.4}, 3),
        ("hook_3", 0.25, "Lalu, kamera masuk ke mulutnya.", {"rate": 1.05, "emph": ["masuk", "mulutnya"], "k": 1.6}, 3),
    ]),
    ("lidah", 0.20, 0.3, 6.0, [
        ("lidah_1", 0.0, "Di lidah, ada satpam kecil bernama reseptor.", {"rate": 1.05, "emph": ["satpam", "reseptor"], "k": 1.5}, 3),
        ("lidah_2", 0.25, "Cabai membawa capsaicin. Zat ini menipu mereka, seolah lidahnya terbakar.", {"rate": 1.05, "emph": ["capsaicin", "menipu", "terbakar"], "k": 1.55}, 3),
        ("lidah_3", 0.20, "Kebakaran, kebakaran.", dict(GUARD), 3),
    ]),
    ("saraf", 0.15, 0.3, 4.5, [
        ("saraf_1", 0.0, "Kabar bohong itu berlari lewat saraf, langsung menuju otak.", {"rate": 1.1, "emph": ["bohong", "berlari", "otak"], "k": 1.6}, 3),
        ("saraf_2", 0.25, "Dan otak, percaya begitu saja.", {"rate": 1.0, "emph": ["percaya"], "end": "fall", "k": 1.4}, 3),
    ]),
    ("otak", 0.15, 0.3, 7.0, [
        ("otak_1", 0.0, "Di ruang kendali, operator otak langsung panik.", {"rate": 1.08, "emph": ["panik"], "k": 1.6}, 3),
        ("otak_2", 0.20, "Air mata, keluarkan. Ingus, keluarkan. Keringat, keluarkan semuanya.", dict(BOSS, emph=["Air", "Ingus", "Keringat", "semuanya"]), 3),
        ("otak_3", 0.25, "Mas Budi menangis, ingusan, dan basah kuyup, padahal baru satu gigitan.", {"rate": 1.08, "emph": ["menangis", "satu"], "k": 1.55, "end": "fall"}, 3),
    ]),
    ("air", 0.15, 0.3, 8.0, [
        ("air_1", 0.0, "Dia menenggak air sebanyak-banyaknya.", {"rate": 1.1, "emph": ["menenggak", "sebanyak-banyaknya"], "k": 1.6}, 3),
        ("air_2", 0.20, "Tapi capsaicin larut di minyak, bukan di air. Airnya cuma lewat, capsaicin tetap nempel.", {"rate": 1.07, "emph": ["minyak", "bukan", "lewat", "nempel"], "k": 1.6}, 3),
        ("air_3", 0.15, "Nggak mempan, nggak mempan.", dict(GUARD), 3),
        ("air_4", 0.25, "Yang berhasil justru susu. Lemaknya menarik capsaicin pergi.", {"rate": 1.07, "emph": ["susu", "lemaknya", "pergi"], "k": 1.6}, 3),
    ]),
    ("akhir", 0.15, 1.5, 6.5, [
        ("akhir_1", 0.0, "Satu gelas susu, dan semuanya tenang.", {"rate": 1.0, "emph": ["tenang"], "k": 1.4, "end": "fall"}, 3),
        ("akhir_2", 0.35, "Mau tambah level tiga puluh satu?", dict(WAITER, emph=["tambah", "tiga", "satu"]), 3),
        ("akhir_3", 0.25, "Mas Budi mengangguk.", {"rate": 1.0, "emph": ["mengangguk"], "k": 1.5}, 3),
        ("akhir_4", 0.30, "Lagi.", dict(GUARD, rate=0.95), 3),
    ]),
]
g.VARIANTS.update({"akhir_4": ["Lagi.", "Lagi?", "Lagi lagi."]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.bite": s("hook_1", 0.62), "hook.freeze": s("hook_2"), "hook.dive": s("hook_3", 0.25),
        "lidah.guards": s("lidah_1"), "lidah.chili": s("lidah_2", 0.02), "lidah.cheat": s("lidah_2", 0.55), "lidah.alarm": s("lidah_3"),
        "saraf.run": s("saraf_1"), "saraf.brain": s("saraf_1", 0.72), "saraf.believe": s("saraf_2"),
        "otak.room": s("otak_1"), "otak.panic": s("otak_1", 0.55),
        "otak.b1": s("otak_2", 0.08), "otak.b2": s("otak_2", 0.38), "otak.b3": s("otak_2", 0.68),
        "otak.cry": s("otak_3"), "otak.snot": s("otak_3", 0.42), "otak.sweat": s("otak_3", 0.70),
        "air.chug": s("air_1"), "air.macro": s("air_2"), "air.bounce": s("air_2", 0.42), "air.stick": s("air_2", 0.78),
        "air.nope": s("air_3"), "air.milk": s("air_4"), "air.pull": s("air_4", 0.55),
        "akhir.calm": s("akhir_1", 0.2), "akhir.waiter": s("akhir_2"), "akhir.nod": s("akhir_3", 0.4),
        "akhir.sigh": s("akhir_4"), "akhir.card": L["akhir_4"]["le"] + 0.2,
    }


# ------------------------------------------------------------------ SFX
def sfx_crunch(seed=1):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * 0.5))
    for t0 in (0.0, 0.11, 0.2):
        n = int(SR * 0.09)
        t = np.arange(n) / SR
        x = g._bp(rng.standard_normal(n), 600, 6500) * np.exp(-t * 45) + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 40) * 0.6
        out[int(t0 * SR) : int(t0 * SR) + n] += x
    return (np.tanh(out * 1.3) / (np.max(np.abs(out)) + 1e-9) * 0.85).astype(np.float32)


def sfx_alarm(dur=2.0):
    t = np.arange(int(SR * dur)) / SR
    f = 800 + 400 * (np.sign(np.sin(2 * np.pi * 2.5 * t)) > 0)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
    x = g._lp(x, 3800) * np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.1)
    return (x * 0.45).astype(np.float32)


def sfx_gulp(dur=1.6, seed=2):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * dur))
    for t0 in np.arange(0.05, dur - 0.3, 0.3):
        n = int(SR * 0.22)
        t = np.arange(n) / SR
        f = 220 - 110 * t / 0.22
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + g._bp(rng.standard_normal(n), 200, 900) * np.exp(-t * 14) * 0.5
        out[int(t0 * SR) : int(t0 * SR) + n] += x
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.7).astype(np.float32)


def sfx_click(seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * 0.08)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 1500, 7000) * np.exp(-t * 90) + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 60) * 0.5
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)


def sfx_drip(f=1500.0, seed=4):
    t = np.arange(int(SR * 0.25)) / SR
    x = np.sin(2 * np.pi * (f + 900 * np.exp(-t * 30)) * t) * np.exp(-t * 22)
    return (x * 0.5).astype(np.float32)


def sfx_sniff(seed=5):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * 1.0))
    for t0 in (0.0, 0.4):
        n = int(SR * 0.3)
        t = np.arange(n) / SR
        out[int(t0 * SR) : int(t0 * SR) + n] += g._bp(rng.standard_normal(n), 1200, 5000) * np.sin(np.pi * t / 0.3) ** 2
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.6).astype(np.float32)


def sfx_sigh(dur=1.3, seed=6):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 400, 2600) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.3
    x += np.sin(2 * np.pi * (260 - 80 * t / dur) * t) * np.sin(np.pi * t / dur) * 0.15
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.5).astype(np.float32)


def sfx_boing(dur=0.6):
    t = np.arange(int(SR * dur)) / SR
    f = 260 + 520 * np.sin(np.pi * np.clip(t / 0.25, 0, 1)) ** 0.7 * np.exp(-t * 3)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.7).astype(np.float32)


def sfx_bonk(seed=7):
    t = np.arange(int(SR * 0.3)) / SR
    return (np.sin(2 * np.pi * (320 - 200 * t) * t) * np.exp(-t * 16) * 0.8).astype(np.float32)


def sfx_pop(f=700.0):
    t = np.arange(int(SR * 0.15)) / SR
    return (np.sin(2 * np.pi * (f + 600 * np.exp(-t * 40)) * t) * np.exp(-t * 28) * 0.55).astype(np.float32)


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="level30_master.mp3"):
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

    # music follows the emotional arc: playful -> urgent -> panic -> pause -> relief
    base = {"hook": 0.6, "lidah": 0.6, "saraf": 0.9, "otak": 1.0, "air": 0.8, "akhir": 0.55}
    ip_t, ip_v = [0.0], [0.6]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("hook.freeze") - 0.05, G("hook.dive") - 0.1), (G("akhir.sigh") - 0.1, G("akhir.sigh") + 0.9)]
    mus = r.music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 2.5, total], [0, 1, 1, 0])[:, None]

    # whip-pan transitions
    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.28)

    # hook
    add(sfx, sfx_crunch(1), G("hook.bite"), gain=0.9)
    add(sfx, r.sfx_crackle(1.6, 140, 3, rise=True), G("hook.bite") + 0.2, gain=0.25)
    add(sfx, sfx_boing(0.6), G("hook.dive") + 0.1, gain=0.3)
    # lidah
    add(sfx, r.sfx_ting(1568.0, 0.5), G("lidah.guards"), gain=0.15)
    add(sfx, r.sfx_crackle(2.0, 180, 5, rise=True), G("lidah.chili"), gain=0.3)
    add(sfx, sfx_alarm(2.4), G("lidah.alarm") - 0.15, gain=0.5)
    # saraf
    add(sfx, r.sfx_swoosh(0.9, 21), G("saraf.run"), gain=0.45)
    add(sfx, sfx_click(2), G("saraf.brain"), gain=0.5)
    # otak
    add(sfx, sfx_alarm(2.0), G("otak.room") + 0.2, gain=0.3)
    for i, k in enumerate(("otak.b1", "otak.b2", "otak.b3")):
        add(sfx, sfx_click(10 + i), G(k) + 0.25, gain=0.7)
        add(sfx, r.sfx_ting(1000 + 200 * i, 0.4), G(k) + 0.27, gain=0.12)
    add(sfx, sfx_sniff(), G("otak.snot"), gain=0.6)
    for i in range(4):
        add(sfx, sfx_drip(1400 + 150 * i, i), G("otak.sweat") + 0.14 * i, gain=0.4)
    # air
    add(sfx, sfx_gulp(1.7), G("air.chug") + 0.1, gain=0.7)
    add(sfx, sfx_bonk(), G("air.bounce"), gain=0.5)
    add(sfx, sfx_bonk(), G("air.bounce") + 0.25, gain=0.4)
    add(sfx, r.sfx_crackle(1.0, 120, 7, rise=False), G("air.stick"), gain=0.25)
    add(sfx, sfx_pop(760), G("air.milk") + 0.8, gain=0.5)
    add(sfx, sfx_pop(900), G("air.pull") + 0.1, gain=0.5)
    add(sfx, sfx_pop(1050), G("air.pull") + 0.35, gain=0.5)
    # akhir
    add(sfx, sfx_gulp(1.0, 5), G("akhir.calm") - 0.4, gain=0.5)
    add(sfx, sfx_sigh(1.3), G("akhir.calm") + 0.4, gain=0.35)
    add(sfx, r.sfx_ting(1318.5, 1.0), G("akhir.waiter"), gain=0.2)
    add(sfx, sfx_sigh(1.2, 9), G("akhir.sigh") - 0.1, gain=0.45)
    add(sfx, sfx_boing(0.6), G("akhir.card"), gain=0.3)

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
    ap.add_argument("--out", default="level30_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

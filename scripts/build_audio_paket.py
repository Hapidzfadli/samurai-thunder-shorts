"""Audio + timing for 'Pak Paket' - a homework file races through the internet (router, fibre, sea cable, server, cell tower).

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/paket_timing.json and public/audio/paket_master.mp3.
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
TIMING_JSON = ROOT / "src" / "paket_timing.json"

PAKET = {"pitch": 1.2, "rate": 1.1, "k": 1.6, "gain": 1.05}
ROUTER = {"pitch": 0.85, "rate": 1.05, "k": 1.5}
HIU = {"pitch": 0.78, "rate": 0.95, "k": 1.5}
PETUGAS = {"pitch": 0.95, "rate": 1.05, "k": 1.5}
DOSEN = {"pitch": 0.86, "rate": 1.0, "k": 1.5}

SCENES = [
    ("hook", 0.15, 0.3, 6.0, [
        ("hook_1", 0.0, "Jam sebelas lewat lima puluh sembilan. Rina menekan kirim.", {"rate": 1.1, "emph": ["sebelas", "kirim"], "k": 1.6}, 3),
        ("hook_2", 0.20, "Tugasnya jadi satu paket data. Namanya Pak Paket.", {"rate": 1.07, "emph": ["paket", "Paket"], "k": 1.55}, 3),
        ("hook_3", 0.20, "Waktunya cuma enam puluh detik.", {"rate": 1.05, "emph": ["enam", "puluh"], "k": 1.6}, 3),
    ]),
    ("router", 0.15, 0.3, 6.0, [
        ("router_1", 0.0, "Pertama, dia masuk ke router.", {"rate": 1.08, "emph": ["router"], "k": 1.5}, 3),
        ("router_2", 0.20, "Lampunya berkedip, semua paket antre.", {"rate": 1.05, "emph": ["berkedip", "antre"], "k": 1.5}, 3),
        ("router_3", 0.15, "Permisi, permisi, darurat.", dict(PAKET, emph=["darurat"]), 3),
        ("router_4", 0.15, "Antre, Pak.", dict(ROUTER, emph=["Antre"]), 3),
    ]),
    ("tiang", 0.15, 0.3, 8.0, [
        ("tiang_1", 0.0, "Dari rumah, dia lari lewat kabel serat optik di tiang listrik.", {"rate": 1.1, "emph": ["lari", "serat", "optik"], "k": 1.55}, 3),
        ("tiang_2", 0.20, "Di sini, dia berubah jadi cahaya.", {"rate": 1.05, "emph": ["berubah", "cahaya"], "k": 1.6}, 3),
        ("tiang_3", 0.20, "Kecepatannya, sekitar dua ratus ribu kilometer per detik.", {"rate": 1.1, "emph": ["dua", "ratus", "ribu"], "k": 1.55}, 3),
        ("tiang_4", 0.20, "Layangan nyangkut di kabel, tapi cahaya nggak peduli.", {"rate": 1.07, "emph": ["nyangkut", "nggak", "peduli"], "k": 1.5}, 3),
    ]),
    ("laut", 0.15, 0.3, 8.0, [
        ("laut_1", 0.0, "Lalu, dia menyeberang lautan lewat kabel di dasar laut.", {"rate": 1.08, "emph": ["menyeberang", "dasar", "laut"], "k": 1.55}, 3),
        ("laut_2", 0.20, "Seekor hiu menggigit kabelnya.", {"rate": 1.0, "emph": ["hiu", "menggigit"], "k": 1.6}, 3),
        ("laut_3", 0.15, "Nyam, enak.", dict(HIU, emph=["enak"]), 3),
        ("laut_4", 0.25, "Untung, kabelnya berlapis baja.", {"rate": 1.05, "emph": ["Untung", "berlapis", "baja"], "k": 1.55}, 3),
    ]),
    ("server", 0.15, 0.3, 7.0, [
        ("server_1", 0.0, "Sampai di gedung server, ribuan komputer menyala dua puluh empat jam.", {"rate": 1.1, "emph": ["ribuan", "dua", "puluh", "empat"], "k": 1.55}, 3),
        ("server_2", 0.20, "Ruangannya dingin banget, supaya mesinnya nggak kepanasan.", {"rate": 1.07, "emph": ["dingin", "kepanasan"], "k": 1.55}, 3),
        ("server_3", 0.15, "Tiket mana, tiket?", dict(PETUGAS, emph=["Tiket"]), 3),
    ]),
    ("bts", 0.15, 0.3, 6.0, [
        ("bts_1", 0.0, "Terakhir, menara sinyal mengubahnya jadi gelombang radio.", {"rate": 1.08, "emph": ["menara", "gelombang", "radio"], "k": 1.55}, 3),
        ("bts_2", 0.20, "Terbang ke HP dosen yang lagi ngopi.", {"rate": 1.05, "emph": ["Terbang", "ngopi"], "k": 1.55}, 3),
    ]),
    ("akhir", 0.20, 1.5, 7.0, [
        ("akhir_1", 0.0, "Lima puluh sembilan detik. Tepat waktu.", {"rate": 1.05, "emph": ["sembilan", "Tepat"], "k": 1.55}, 3),
        ("akhir_2", 0.25, "Kok filenya kosong?", dict(DOSEN, emph=["kosong"]), 3),
        ("akhir_3", 0.25, "Rina salah kirim. Namanya, tugas final revisi tiga beneran.", {"rate": 1.07, "emph": ["salah", "revisi", "beneran"], "end": "fall", "k": 1.55}, 3),
        ("akhir_4", 0.30, "Saya pensiun.", dict(PAKET, rate=0.95, emph=["pensiun"], end="fall"), 3),
    ]),
]
g.VARIANTS.update({"router_3": ["Permisi, permisi, darurat.", "Permisi, permisi, darurat!", "Permisi permisi, darurat."], "laut_3": ["Nyam, enak.", "Nyam nyam, enak.", "Nyam, enak!"]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.send": s("hook_1", 0.62), "hook.pack": s("hook_2", 0.5), "hook.timer": s("hook_3"),
        "router.in": s("router_1", 0.3), "router.queue": s("router_2", 0.3), "router.say": s("router_3"), "router.reply": s("router_4"),
        "tiang.run": s("tiang_1"), "tiang.light": s("tiang_2"), "tiang.speed": s("tiang_3"), "tiang.kite": s("tiang_4"),
        "laut.sea": s("laut_1"), "laut.shark": s("laut_2"), "laut.chomp": s("laut_3"), "laut.armor": s("laut_4", 0.3),
        "server.in": s("server_1"), "server.cold": s("server_2"), "server.ticket": s("server_3"),
        "bts.tower": s("bts_1"), "bts.fly": s("bts_2"),
        "akhir.time": s("akhir_1"), "akhir.empty": s("akhir_2"), "akhir.wrong": s("akhir_3"), "akhir.quit": s("akhir_4"), "akhir.card": L["akhir_4"]["le"] + 0.2,
    }


# ------------------------------------------------------------------ SFX
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


def sfx_zap(dur=0.9):
    t = np.arange(int(SR * dur)) / SR
    f = 300 + 3200 * (t / dur) ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.15)
    return (x * 0.4).astype(np.float32)


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
def build(voice_arg, out_name="paket_master.mp3"):
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

    # music: urgent chase that keeps rising, drops out for the final reveal
    base = {"hook": 0.6, "router": 0.75, "tiang": 0.85, "laut": 0.8, "server": 0.85, "bts": 0.95, "akhir": 0.5}
    ip_t, ip_v = [0.0], [0.6]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("akhir.empty") - 0.3, G("akhir.empty") + 1.2), (G("laut.chomp") - 0.05, G("laut.chomp") + 0.5)]
    mus = r.music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 2.5, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.3)

    add(sfx, l.sfx_click(1), G("hook.send"), gain=0.8)
    add(sfx, r.sfx_ting(1568.0, 0.6), G("hook.send") + 0.05, gain=0.2)
    add(sfx, l.sfx_boing(0.6), G("hook.pack"), gain=0.3)
    for i in range(6):
        add(sfx, l.sfx_click(10 + i), G("hook.timer") + 0.5 * i, gain=0.25)
    add(sfx, sfx_zap(0.7), G("router.in"), gain=0.5)
    for i in range(8):
        add(sfx, r.sfx_ting(1200 + 90 * (i % 4), 0.2), G("router.queue") + 0.17 * i, gain=0.12)
    add(sfx, l.sfx_bonk(), G("router.reply") + 0.2, gain=0.4)
    add(sfx, sfx_zap(1.2), G("tiang.light"), gain=0.55)
    add(sfx, r.sfx_swoosh(0.9, 41), G("tiang.speed"), gain=0.45)
    add(sfx, r.sfx_swoosh(0.4, 43), G("tiang.kite"), gain=0.3)
    add(sfx, sfx_bubbles(L["laut_1"]["le"] - L["laut_1"]["ls"] + 3.5, 2), G("laut.sea"), gain=0.6)
    add(sfx, l.sfx_crunch(5), G("laut.chomp") - 0.1, gain=0.9)
    add(sfx, l.sfx_bonk(), G("laut.armor"), gain=0.7)
    add(sfx, sfx_hum(L["server_2"]["le"] - L["server_1"]["ls"] + 1.0, 110, 4), G("server.in"), gain=0.5)
    add(sfx, l.sfx_click(7), G("server.ticket") + 0.4, gain=0.6)
    add(sfx, sfx_zap(0.9), G("bts.tower"), gain=0.45)
    for i in range(4):
        add(sfx, r.sfx_ting(1700 - 120 * i, 0.5), G("bts.fly") + 0.4 * i, gain=0.15)
    add(sfx, r.sfx_ting(1318.5, 0.9), G("akhir.time"), gain=0.25)
    add(sfx, sfx_wah(1.6), G("akhir.wrong") + 0.9, gain=0.6)
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
    ap.add_argument("--out", default="paket_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

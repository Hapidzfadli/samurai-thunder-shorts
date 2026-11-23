"""Audio + timing for 'Anak Kos Tanggal Tua' - a broke student hunts for money around his room (stickman comedy).

Blueprint: action in the first 3 s, tiny synced captions, SFX for every beat, music arc, distinct character voices.
Writes src/kos_timing.json and public/audio/kos_master.mp3.
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
TIMING_JSON = ROOT / "src" / "kos_timing.json"

RENDI = {"pitch": 1.1, "rate": 1.05, "k": 1.55}
BU = {"pitch": 0.86, "rate": 1.0, "k": 1.5}
KECOA = {"pitch": 1.4, "rate": 1.1, "k": 1.5}
IBU = {"pitch": 0.97, "rate": 0.92, "k": 1.4, "warm": True}

SCENES = [
    ("hook", 0.15, 0.3, 6.0, [
        ("hook_1", 0.0, "Tanggal dua puluh sembilan. Saldo Rendi, empat ribu lima ratus.", {"rate": 1.1, "emph": ["dua", "puluh", "sembilan", "empat", "ribu"], "k": 1.6}, 3),
        ("hook_2", 0.20, "Perutnya keroncongan, dompetnya cuma berisi doa.", {"rate": 1.07, "emph": ["keroncongan", "doa"], "k": 1.55}, 3),
    ]),
    ("kasur", 0.15, 0.3, 7.0, [
        ("kasur_1", 0.0, "Rendi membongkar kasur, siapa tahu ada uang terselip.", {"rate": 1.08, "emph": ["membongkar", "terselip"], "k": 1.55}, 3),
        ("kasur_2", 0.20, "Yang ketemu, cuma debu, kecoa, dan sebelah kaus kaki.", {"rate": 1.07, "emph": ["debu", "kecoa", "sebelah"], "k": 1.55}, 3),
        ("kasur_3", 0.15, "Permisi, ini kontrakan saya.", dict(KECOA, emph=["kontrakan"]), 3),
    ]),
    ("celana", 0.15, 0.3, 6.0, [
        ("celana_1", 0.0, "Di kantong celana lama, ada kertas. Uang, kah?", {"rate": 1.08, "emph": ["kertas", "Uang"], "k": 1.6}, 3),
        ("celana_2", 0.25, "Ternyata, struk fotokopi tahun lalu.", {"rate": 1.03, "emph": ["struk", "lalu"], "end": "fall", "k": 1.5}, 3),
    ]),
    ("kulkas", 0.15, 0.3, 6.0, [
        ("kulkas_1", 0.0, "Kulkas dibuka. Isinya, lampu, dan saus sachet.", {"rate": 1.07, "emph": ["lampu", "sachet"], "k": 1.55}, 3),
        ("kulkas_2", 0.25, "Bahkan jangkrik pun, nggak mau tinggal di sana.", {"rate": 1.03, "emph": ["jangkrik", "nggak"], "end": "fall", "k": 1.5}, 3),
    ]),
    ("warung", 0.15, 0.3, 9.0, [
        ("warung_1", 0.0, "Akhirnya, Rendi ke warung. Mie instan, tiga ribu lima ratus.", {"rate": 1.08, "emph": ["warung", "tiga", "ribu", "ratus"], "k": 1.55}, 3),
        ("warung_2", 0.20, "Telur, dua ribu lima ratus. Uangnya kurang seribu.", {"rate": 1.07, "emph": ["dua", "kurang", "seribu"], "k": 1.55}, 3),
        ("warung_3", 0.20, "Bu, boleh setengah telurnya?", dict(RENDI, emph=["boleh", "setengah"]), 3),
        ("warung_4", 0.25, "Ini warung, bukan lelang.", dict(BU, emph=["warung", "lelang"]), 3),
    ]),
    ("makan", 0.15, 0.3, 6.5, [
        ("makan_1", 0.0, "Malam itu, Rendi makan mie polos, sambil membayangkan telur.", {"rate": 1.07, "emph": ["polos", "membayangkan"], "k": 1.5}, 3),
        ("makan_2", 0.20, "Telurnya bersinar, melayang, lalu berubah jadi mie lagi.", {"rate": 1.05, "emph": ["bersinar", "melayang", "lagi"], "end": "fall", "k": 1.5}, 3),
    ]),
    ("akhir", 0.20, 1.5, 7.5, [
        ("akhir_1", 0.0, "Tiba-tiba, HP bergetar. Transfer masuk, lima puluh ribu, dari Ibu.", {"rate": 1.08, "emph": ["bergetar", "lima", "puluh", "ribu", "Ibu"], "k": 1.6}, 3),
        ("akhir_2", 0.30, "Nak, ini buat beli telur.", dict(IBU, emph=["telur"]), 3),
        ("akhir_3", 0.30, "Rendi menangis haru. Ibu, selalu tahu.", {"rate": 1.0, "emph": ["haru", "selalu"], "end": "fall", "k": 1.5}, 3),
    ]),
]
g.VARIANTS.update({"kasur_3": ["Permisi, ini kontrakan saya.", "Permisi, ini kontrakan saya!", "Permisi ini kontrakan saya."]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.balance": s("hook_1", 0.55), "hook.growl": s("hook_2", 0.05), "hook.wallet": s("hook_2", 0.62),
        "kasur.lift": s("kasur_1", 0.35), "kasur.dust": s("kasur_2", 0.1), "kasur.roach": s("kasur_3"), "kasur.sock": s("kasur_2", 0.7),
        "celana.reach": s("celana_1", 0.3), "celana.paper": s("celana_1", 0.7), "celana.struk": s("celana_2"),
        "kulkas.open": s("kulkas_1", 0.1), "kulkas.sauce": s("kulkas_1", 0.65), "kulkas.cricket": s("kulkas_2"),
        "warung.in": s("warung_1"), "warung.egg": s("warung_2"), "warung.ask": s("warung_3"), "warung.no": s("warung_4"),
        "makan.eat": s("makan_1"), "makan.dream": s("makan_1", 0.7), "makan.egg": s("makan_2"), "makan.back": s("makan_2", 0.7),
        "akhir.buzz": s("akhir_1"), "akhir.read": s("akhir_2"), "akhir.cry": s("akhir_3"), "akhir.card": L["akhir_3"]["le"] + 0.2,
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


def sfx_cricket(dur=2.4, seed=2):
    n = int(SR * dur)
    t = np.arange(n) / SR
    gate = (np.sin(2 * np.pi * 2.2 * t) > 0.3) * (np.sin(2 * np.pi * 28 * t) > 0)
    x = np.sin(2 * np.pi * 4300 * t) * gate.astype(float)
    x = g._lp(x, 6000) * np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.3)
    return (x * 0.3).astype(np.float32)


def sfx_buzz_phone(dur=1.4):
    n = int(SR * dur)
    t = np.arange(n) / SR
    gate = (np.sin(2 * np.pi * 6 * t) > -0.2).astype(float)
    x = (np.sin(2 * np.pi * 170 * t) * 0.6 + np.sign(np.sin(2 * np.pi * 85 * t)) * 0.2) * gate
    x *= np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05)
    return (x * 0.7).astype(np.float32)


def sfx_cash():
    t = np.arange(int(SR * 1.2)) / SR
    x = np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 5) + np.sin(2 * np.pi * 1760 * np.maximum(0, t - 0.12)) * np.exp(-np.maximum(0, t - 0.12) * 4) * (t > 0.12) + np.sin(2 * np.pi * 2093 * np.maximum(0, t - 0.25)) * np.exp(-np.maximum(0, t - 0.25) * 3.5) * (t > 0.25)
    return (x * 0.35).astype(np.float32)


def sfx_slurp(dur=1.6, seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 900, 3800) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t)) ** 1.5
    x += np.sin(2 * np.pi * (500 + 400 * t / dur) * t) * 0.1
    x *= np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.2)
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
    x = g._lp(x, 1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * t)) * np.minimum(1, (dur - t) / 0.2)
    return (x * 0.5).astype(np.float32)


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="kos_master.mp3"):
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

    # music: playful but melancholy -> sparse for the sad part -> warm for the finale
    base = {"hook": 0.55, "kasur": 0.7, "celana": 0.7, "kulkas": 0.45, "warung": 0.75, "makan": 0.4, "akhir": 0.6}
    ip_t, ip_v = [0.0], [0.55]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    pauses = [(G("celana.struk") - 0.1, G("celana.struk") + 0.9), (G("warung.no") - 0.25, G("warung.no") + 1.4), (G("akhir.buzz") - 0.3, G("akhir.buzz") + 1.0)]
    mus = r.music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 2.5, total], [0, 1, 1, 0])[:, None]

    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.3)

    add(sfx, l.sfx_click(1), G("hook.balance"), gain=0.5)
    add(sfx, sfx_growl(1.8, 1), G("hook.growl"), gain=0.9)
    add(sfx, l.sfx_boing(0.6), G("hook.wallet") + 0.15, gain=0.25)
    add(sfx, r.sfx_swoosh(0.5, 5), G("kasur.lift"), gain=0.4)
    add(sfx, r.sfx_crinkle(1.0, 3), G("kasur.dust"), gain=0.4)
    add(sfx, l.sfx_pop(900), G("kasur.roach") - 0.1, gain=0.35)
    add(sfx, l.sfx_bonk(), G("kasur.sock"), gain=0.35)
    add(sfx, r.sfx_crinkle(1.2, 8), G("celana.reach"), gain=0.6)
    add(sfx, l.sfx_pop(1100), G("celana.paper"), gain=0.35)
    add(sfx, sfx_wah(1.6), G("celana.struk") + 0.7, gain=0.45)
    add(sfx, sfx_hum(L["kulkas_1"]["le"] - L["kulkas_1"]["ls"] + 1.5, 100, 4), G("kulkas.open") - 0.1, gain=0.4)
    add(sfx, l.sfx_click(2), G("kulkas.open"), gain=0.5)
    add(sfx, l.sfx_drip(1200, 1), G("kulkas.sauce"), gain=0.3)
    add(sfx, sfx_cricket(L["kulkas_2"]["le"] - L["kulkas_2"]["ls"] + 1.0), G("kulkas.cricket"), gain=0.6)
    add(sfx, r.sfx_ting(1568.0, 0.5), G("warung.in"), gain=0.2)
    add(sfx, l.sfx_pop(800), G("warung.egg"), gain=0.35)
    add(sfx, l.sfx_bonk(), G("warung.no") + 0.1, gain=0.5)
    add(sfx, sfx_slurp(2.2), G("makan.eat"), gain=0.55)
    add(sfx, r.sfx_ting(1760.0, 1.4), G("makan.egg"), gain=0.25)
    add(sfx, l.sfx_pop(500), G("makan.back"), gain=0.35)
    add(sfx, sfx_buzz_phone(1.4), G("akhir.buzz"), gain=0.8)
    add(sfx, sfx_cash(), G("akhir.buzz") + 1.2, gain=0.5)
    add(sfx, l.sfx_sniff(), G("akhir.cry") + 0.5, gain=0.5)
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
    ap.add_argument("--out", default="kos_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

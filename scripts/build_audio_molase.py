"""Audio + timing for 'Hari Pertama ke Ancol' - romantic true-story short (stickman).
Writes src/molase_timing.json and public/audio/ancol_master.mp3."""
import argparse
import importlib.util
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("hm", ROOT / "scripts" / "build_audio_hamil.py")
hm = importlib.util.module_from_spec(spec)
sys.modules["hm"] = hm
spec.loader.exec_module(hm)
l, r, g = hm.l, hm.r, hm.g
spec2 = importlib.util.spec_from_file_location("a2", ROOT / "scripts" / "build_audio_ancol.py")
a2 = importlib.util.module_from_spec(spec2)
sys.modules["a2"] = a2
spec2.loader.exec_module(a2)
np, SR, FPS = g.np, g.SR, g.FPS
TIMING_JSON = ROOT / "src" / "molase_timing.json"

HENDRIK = {"pitch": 0.9, "rate": 1.04, "k": 1.5}
MARIA = {"pitch": 1.16, "rate": 1.06, "k": 1.5}
BOS = {"pitch": 0.82, "rate": 1.0, "k": 1.5, "warm": True}
N = lambda **k: dict({"rate": 1.1, "k": 1.45}, **k)

SCENES = [
    ("hook", 0.1, 0.25, 5.0, [
        ("h1", 0.0, "Pada tahun seribu sembilan ratus sembilan belas, sebuah kota di Amerika, diterjang gelombang sirup setinggi dua lantai.", N(emph=["gelombang", "sirup", "setinggi", "dua", "lantai"]), 3),
    ]),
    ("tangki", 0.1, 0.25, 7.0, [
        ("t1", 0.0, "Boston, bulan Januari. Di tepi pelabuhan, berdiri tangki baja raksasa, berisi lebih dari dua juta galon molase.", N(emph=["Boston", "raksasa", "dua", "juta", "galon"]), 3),
        ("t2", 0.12, "Pak Hendrik menjaganya setiap hari. Dan setiap hari, tangki itu merembes.", N(emph=["Hendrik", "setiap", "merembes"]), 3),
    ]),
    ("rembes", 0.1, 0.25, 5.0, [
        ("r1", 0.0, "Tenang, Bu. Cuma rembes sedikit.", dict(HENDRIK, emph=["Tenang", "sedikit"]), 3),
        ("r2", 0.12, "Pak, sepatuku lengket!", dict(MARIA, emph=["sepatuku", "lengket"]), 3),
    ]),
    ("cat", 0.1, 0.25, 6.5, [
        ("c1", 0.0, "Bosnya punya solusi cerdas. Cat saja tangkinya, warna cokelat.", N(emph=["solusi", "cerdas", "cokelat"]), 3),
        ("c2", 0.12, "Beres. Kalau tidak kelihatan, berarti tidak bocor.", dict(BOS, emph=["Beres", "tidak", "bocor"]), 3),
    ]),
    ("hangat", 0.1, 0.25, 8.5, [
        ("w1", 0.0, "Lalu, pada lima belas Januari, cuaca tiba-tiba hangat, sekitar empat derajat, setelah hari-hari yang membeku.", N(emph=["tiba-tiba", "hangat", "empat", "derajat", "membeku"]), 3),
        ("w2", 0.12, "Tangki mulai berderit. Tunggu, apa itu bunyi retak?", N(emph=["berderit", "Tunggu", "retak"]), 3),
    ]),
    ("pecah", 0.1, 0.25, 3.2, [
        ("p1", 0.0, "Dan dalam sekejap, tangki itu pecah.", N(rate=1.02, emph=["sekejap", "pecah"]), 3),
    ]),
    ("gelombang", 0.1, 0.25, 9.5, [
        ("g1", 0.0, "Gelombang molase setinggi tujuh meter, melaju lima puluh enam kilometer per jam, menyapu jalanan.", N(emph=["tujuh", "meter", "lima", "puluh", "enam", "menyapu"]), 3),
        ("g2", 0.2, "Dua puluh satu orang meninggal, seratus lima puluh terluka.", N(rate=1.0, emph=["Dua", "puluh", "satu", "meninggal", "terluka"]), 3),
    ]),
    ("madu", 0.1, 0.25, 11.5, [
        ("m1", 0.0, "Nah, begini. Pernah menaruh madu di kulkas? Kental, dan menetes lambat.", N(emph=["begini", "madu", "kulkas", "kental", "lambat"]), 3),
        ("m2", 0.12, "Tapi di dapur yang hangat, madu mengalir deras. Molase juga begitu.", N(emph=["hangat", "mengalir", "deras", "Molase"]), 3),
        ("m3", 0.12, "Hawa hangat hanya ikut berperan. Penyebab utamanya, dinding tangki yang terlalu tipis.", N(emph=["ikut", "berperan", "utamanya", "tipis"]), 3),
    ]),
    ("court", 0.1, 0.25, 9.5, [
        ("k1", 0.0, "Perusahaan menyalahkan anarkis pembawa bom.", N(emph=["menyalahkan", "anarkis", "bom"]), 3),
        ("k2", 0.1, "Pasti sabotase!", dict(BOS, emph=["Pasti", "sabotase"]), 3),
        ("k3", 0.12, "Tapi hakim tidak percaya. Setelah enam tahun dan tiga ribu saksi, perusahaan dinyatakan bersalah.", N(emph=["tidak", "percaya", "enam", "tiga", "ribu", "bersalah"]), 3),
    ]),
    ("aturan", 0.1, 0.25, 4.2, [
        ("a1", 0.0, "Sejak itu, insinyur wajib menandatangani rancangannya.", N(emph=["insinyur", "wajib", "menandatangani"]), 3),
    ]),
    ("twist", 0.15, 1.5, 8.5, [
        ("z1", 0.0, "Ironisnya, kebocoran paling berbahaya, ternyata yang cuma ditutup cat.", N(emph=["Ironisnya", "berbahaya", "ditutup", "cat"]), 3),
        ("z2", 0.2, "Dan konon, di hari yang panas, North End masih tercium bau manis.", N(rate=1.0, emph=["konon", "panas", "bau", "manis"], end="fall"), 3),
    ]),
]


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    return {
        "hook.wave": s("h1", 0.55), "hook.shock": s("h1", 0.2),
        "tangki.show": s("t1", 0.5), "tangki.hendrik": s("t2"), "tangki.leak": s("t2", 0.62),
        "rembes.say": s("r1"), "rembes.stick": s("r2"), "rembes.drip": s("r1", 0.4),
        "cat.paint": s("c1", 0.4), "cat.done": s("c2"), "cat.line": s("c2", 0.55),
        "hangat.cold": s("w1", 0.0), "hangat.warm": s("w1", 0.4), "hangat.deg": s("w1", 0.7), "hangat.creak": s("w2"), "hangat.crack": s("w2", 0.75),
        "pecah.snap": s("p1", 0.55),
        "gelombang.rush": s("g1"), "gelombang.speed": s("g1", 0.55), "gelombang.sweep": s("g1", 0.8), "gelombang.sad": s("g2"),
        "madu.fridge": s("m1", 0.4), "madu.slow": s("m1", 0.8), "madu.warm": s("m2", 0.1), "madu.fast": s("m2", 0.5), "madu.thin": s("m3", 0.55),
        "court.blame": s("k1", 0.4), "court.shout": s("k2"), "court.gavel": s("k3", 0.15), "court.guilty": s("k3", 0.85),
        "aturan.sign": s("a1", 0.55), "aturan.stamp": s("a1", 0.9),
        "twist.irony": s("z1"), "twist.paint": s("z1", 0.7), "twist.smell": s("z2", 0.5),
    }


def sfx_creak(dur=2.0, seed=1):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 140 + 60 * np.sin(2 * np.pi * 2.3 * t) + 40 * t / dur
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + g._bp(rng.standard_normal(n), 400, 1800) * 0.3
    x *= (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.1 * t))) * np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.25)
    return (x * 0.6).astype(np.float32)


def sfx_boom(dur=1.6, seed=2):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (70 - 40 * t / dur) * t) * np.exp(-t * 3.2) + g._lp(rng.standard_normal(n), 1800) * np.exp(-t * 6) * 0.8
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.9).astype(np.float32)


def sfx_rumble(dur=6.0, seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._lp(rng.standard_normal(n), 220) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.3 * t)) + np.sin(2 * np.pi * 48 * t) * 0.4
    x *= np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 1.0)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)


def sfx_brush(dur=2.5, seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 1200, 5000) * (0.35 + 0.65 * np.abs(np.sin(2 * np.pi * 2.2 * t))) 
    x *= np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.2)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.45).astype(np.float32)


def sfx_stamp():
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 110 * t) * np.exp(-t * 14) + np.random.default_rng(5).standard_normal(n) * np.exp(-t * 40) * 0.4
    return (x * 0.9).astype(np.float32)


def build(voice_arg, out_name="molase_master.mp3"):
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
    N_ = g.N_SAMPLES
    S = {k: v["start_s"] for k, v in P["scenes"].items()}
    L = P["lines"]
    G = lambda name: S[name.split(".")[0]] + ev[name]
    order = [k for k, *_ in SCENES]
    scene_end = {k: S[k] + P["scenes"][k]["frames"] / FPS for k in order}
    sfx = np.zeros((N_, 2), dtype=np.float32)
    vo = np.zeros((N_, 2), dtype=np.float32)
    add = g.add_clip

    base = {k: 0.5 for k in order}
    base.update({"hook": 0.55, "pecah": 0.2, "gelombang": 0.7, "madu": 0.35, "court": 0.45, "twist": 0.4})
    ip_t, ip_v = [0.0], [0.5]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mus = r.music_bed(total, (ip_t, ip_v), [])
    tt = np.linspace(0, total, N_, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, total - 3.0, total], [0, 1, 1, 0])[:, None]
    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.25)

    add(sfx, a2.sfx_heart(2, 70), G("hook.shock"), gain=0.3)
    add(sfx, sfx_rumble(3.2, 1), G("hook.wave") - 0.3, gain=0.6)
    add(sfx, r.sfx_ting(1318.5, 0.9), G("tangki.show"), gain=0.25)
    add(sfx, l.sfx_drip(1300, 1), G("tangki.leak"), gain=0.45)
    add(sfx, l.sfx_drip(1000, 2), G("tangki.leak") + 0.7, gain=0.4)
    add(sfx, l.sfx_drip(1500, 3), G("rembes.drip"), gain=0.4)
    add(sfx, l.sfx_pop(500), G("rembes.stick"), gain=0.35)
    add(sfx, l.sfx_boing(0.5), G("rembes.stick") + 0.2, gain=0.25)
    add(sfx, sfx_brush(3.0, 4), G("cat.paint"), gain=0.6)
    add(sfx, r.sfx_ting(1568.0, 0.8), G("cat.done"), gain=0.3)
    add(sfx, a2.sfx_ding(880.0), G("hangat.deg"), gain=0.3)
    add(sfx, sfx_creak(2.6, 1), G("hangat.creak"), gain=0.7)
    add(sfx, sfx_creak(1.8, 2), G("hangat.crack") - 0.6, gain=0.55)
    add(sfx, sfx_boom(2.0, 2), G("pecah.snap"), gain=1.0)
    add(sfx, sfx_rumble(8.0, 5), G("gelombang.rush") - 0.2, gain=0.8)
    add(sfx, l.sfx_pop(500), G("gelombang.sweep"), gain=0.3)
    add(sfx, l.sfx_drip(1200, 5), G("madu.fridge"), gain=0.35)
    add(sfx, l.sfx_drip(1100, 6), G("madu.slow") + 0.5, gain=0.3)
    add(sfx, r.sfx_ting(1760.0, 0.8), G("madu.warm"), gain=0.25)
    add(sfx, l.sfx_drip(1300, 7), G("madu.fast"), gain=0.45)
    add(sfx, l.sfx_drip(1300, 8), G("madu.fast") + 0.25, gain=0.45)
    add(sfx, l.sfx_bonk(), G("court.shout") + 0.7, gain=0.4)
    add(sfx, l.sfx_bonk(), G("court.gavel"), gain=0.7)
    add(sfx, l.sfx_bonk(), G("court.guilty"), gain=0.7)
    add(sfx, sfx_brush(1.4, 6), G("aturan.sign"), gain=0.35)
    add(sfx, sfx_stamp(), G("aturan.stamp"), gain=0.8)
    add(sfx, sfx_brush(1.6, 7), G("twist.paint"), gain=0.3)
    add(sfx, hm.sfx_chime_up(), G("twist.smell"), gain=0.35)

    for sid, ln in L.items():
        add(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    master = mus * 0.85 * (1.0 / (1.0 + 6.0 * env))[:, None] + sfx * (1.0 / (1.0 + 1.0 * env))[:, None] + vo * 1.25
    fade_in = np.minimum(1.0, np.linspace(0, total, N_) / 0.1)
    fade_out = np.minimum(1.0, np.linspace(total, 0, N_) / 0.8)
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
    print(f"Selesai! {out_mp3}, jadwal: {TIMING_JSON}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="voices/id_prompts/youtube_8ofVl1KpViI_ref.wav")
    ap.add_argument("--out", default="molase_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

"""Audio + timing for Abu Nawas Menangkap Angin. Writes src/abu_timing.json and public/audio/abu_master.mp3."""
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
TIMING_JSON = ROOT / "src" / "abu_timing.json"

RAJA = {"pitch": 0.8, "rate": 0.97, "k": 1.65, "warm": True}
ABU = {"pitch": 0.98, "rate": 1.06, "k": 1.65}
ISTRI = {"pitch": 1.17, "rate": 1.02, "k": 1.55, "warm": True}
DAGANG = {"pitch": 0.9, "rate": 1.04, "k": 1.55}
N = lambda **k: dict({"rate": 1.06, "k": 1.6}, **k)

SCENES = [
    ("tantang", 0.1, 0.3, 9.0, [
        ("t1", 0.0, "Suatu hari, Raja Harun Ar-Rasyid ingin menjebak Abu Nawas.", N(emph=["Raja", "menjebak", "Abu", "Nawas"]), 3),
        ("t2", 0.15, "Abu Nawas! Tangkap angin, dan bawa ke hadapanku dalam tiga hari! Kalau gagal, kau dihukum!", dict(RAJA, emph=["Tangkap", "angin", "tiga", "hari", "dihukum"]), 3),
        ("t3", 0.15, "Para wazir tertawa. Mana mungkin angin bisa ditangkap?", N(emph=["tertawa", "Mana", "mungkin", "ditangkap"], end="rise"), 3),
    ]),
    ("pasar", 0.1, 0.3, 8.0, [
        ("p1", 0.0, "Hari pertama, Abu Nawas mengejar angin di pasar, pakai karung.", N(emph=["pertama", "mengejar", "karung"]), 3),
        ("p2", 0.12, "Abu Nawas, kau sedang apa?", dict(DAGANG, emph=["sedang", "apa"], end="rise"), 3),
        ("p3", 0.12, "Menangkap angin! Eh, lolos lagi!", dict(ABU, emph=["Menangkap", "lolos", "lagi"]), 3),
    ]),
    ("hari2", 0.1, 0.3, 6.5, [
        ("h1", 0.0, "Hari kedua, ia mencoba jaring, kipas, sampai layang-layang. Hasilnya? Kosong!", N(emph=["kedua", "jaring", "kipas", "layang-layang", "Kosong"]), 3),
    ]),
    ("malam", 0.1, 0.3, 7.0, [
        ("m1", 0.0, "Suamiku, besok batas waktunya. Bagaimana ini?", dict(ISTRI, emph=["besok", "batas", "Bagaimana"], end="rise"), 3),
        ("m2", 0.15, "Abu Nawas berpikir keras, semalaman.", N(rate=1.0, emph=["berpikir", "keras", "semalaman"], end="fall"), 3),
    ]),
    ("kentut", 0.1, 2.0, 9.0, [
        ("k1", 0.0, "Hari ketiga, perutnya mulas. Lalu...", N(emph=["ketiga", "mulas", "Lalu"]), 3),
        ("k2", 1.1, "Nah! Ini dia anginnya!", dict(ABU, emph=["Nah", "Ini", "anginnya"]), 3),
        ("k3", 0.12, "Cepat-cepat, ia menangkapnya ke dalam botol, dan menyumbatnya rapat-rapat.", N(rate=1.12, emph=["Cepat-cepat", "botol", "rapat-rapat"]), 3),
    ]),
    ("istana", 0.1, 0.3, 6.5, [
        ("i1", 0.0, "Di istana, Abu Nawas menyerahkan sebuah botol.", N(emph=["istana", "botol"]), 3),
        ("i2", 0.15, "Inilah angin yang Paduka minta. Silakan dibuka.", dict(ABU, emph=["angin", "Paduka", "dibuka"]), 3),
    ]),
    ("buka", 0.1, 0.4, 6.0, [
        ("b1", 0.0, "Raja membuka sumbatnya, dan...", N(emph=["membuka", "dan"]), 3),
        ("b2", 1.3, "Hueek! Bau apa ini?!", dict(RAJA, rate=1.05, emph=["Hueek", "Bau", "apa"]), 3),
    ]),
    ("akhir", 0.1, 1.6, 13.0, [
        ("a1", 0.0, "Ampun, Paduka. Tadi hamba buang angin. Hamba langsung menangkapnya, takut lepas lagi.", dict(ABU, emph=["Ampun", "buang", "angin", "takut", "lepas"]), 3),
        ("a2", 5.2, "Raja pun tertawa terbahak-bahak. Abu Nawas lolos lagi, berkat akalnya.", N(emph=["terbahak-bahak", "lolos", "akalnya"], end="fall"), 3),
    ]),
]


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    e = lambda i: L[i]["le"]
    return {
        "tantang.raja": s("t2"), "tantang.point": s("t2", 0.05), "tantang.three": s("t2", 0.55), "tantang.laugh": s("t3"),
        "pasar.run": s("p1", 0.4), "pasar.ask": s("p2"), "pasar.miss": s("p3", 0.55),
        "hari2.net": s("h1", 0.25), "hari2.fan": s("h1", 0.45), "hari2.kite": s("h1", 0.65), "hari2.empty": s("h1", 0.9),
        "malam.wife": s("m1"), "malam.think": s("m2"),
        "kentut.belly": s("k1", 0.5), "kentut.fart": e("k1") + 0.15, "kentut.idea": s("k2"), "kentut.bottle": s("k3", 0.35), "kentut.cork": s("k3", 0.8), "kentut.giggle": e("k3") + 0.15,
        "istana.give": s("i1", 0.6), "istana.say": s("i2"),
        "buka.pop": e("b1") + 0.2, "buka.yuck": s("b2"),
        "akhir.say": s("a1"), "akhir.laugh": e("a1") + 0.25, "akhir.crowd": e("a1") + 1.6, "akhir.end": s("a2"),
    }


def load_mp3(path):
    p = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def sfx_fart(dur=1.0, seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 95 - 35 * t / dur + 14 * np.sin(2 * np.pi * 11 * t) + 6 * rng.standard_normal(n).cumsum() / np.sqrt(n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.6 + np.sin(ph) * 0.4
    x = g._lp(x, 900) + g._lp(rng.standard_normal(n), 500) * 0.25
    gate = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 7.5 * t))
    x *= gate * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.12)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.85).astype(np.float32)


def sfx_cork():
    t = np.arange(int(SR * 0.35)) / SR
    x = np.sin(2 * np.pi * (900 - 1200 * t) * t) * np.exp(-t * 22) + np.random.default_rng(2).standard_normal(len(t)) * np.exp(-t * 60) * 0.4
    return (x * 0.8).astype(np.float32)


def sfx_wind(dur=2.0, seed=5):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 300, 1800) * (0.4 + 0.6 * np.sin(np.pi * t / dur) ** 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t))
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.5).astype(np.float32)


def sfx_gong():
    t = np.arange(int(SR * 3.0)) / SR
    x = sum(np.sin(2 * np.pi * f * t) * a * np.exp(-t * dcy) for f, a, dcy in [(98, 1.0, 1.0), (196.5, 0.5, 1.4), (293, 0.3, 1.8), (415, 0.2, 2.4)])
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)


def sfx_cricket(dur=3.0):
    t = np.arange(int(SR * dur)) / SR
    gate = (np.sin(2 * np.pi * 2.0 * t) > 0.4) * (np.sin(2 * np.pi * 30 * t) > 0)
    return (np.sin(2 * np.pi * 4300 * t) * gate * 0.2 * np.minimum(1, (dur - t) / 0.3)).astype(np.float32)


def build(voice_arg, out_name="abu_master.mp3"):
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

    base = {k: 0.55 for k in order}
    base.update({"tantang": 0.6, "pasar": 0.75, "hari2": 0.75, "malam": 0.3, "kentut": 0.55, "istana": 0.5, "buka": 0.3, "akhir": 0.65})
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

    T = ROOT / "exports" / "riset" / "tawa"
    raja_laugh = load_mp3(T / "tawa_raja.mp3")
    crowd_laugh = load_mp3(T / "tawa_istana_ramai.mp3")
    abu_giggle = load_mp3(T / "tawa_abu_licik.mp3")
    abu_laugh = load_mp3(T / "tawa_abu_lepas.mp3")
    def addv(clip, at, gain=1.0):
        add(vo, g.norm_rms(clip, 0.11), at, gain=gain)
    add(sfx, sfx_gong(), G("tantang.raja") - 0.3, gain=0.5)
    add(sfx, l.sfx_boing(0.6), G("tantang.three"), gain=0.2)
    addv(crowd_laugh[: int(SR * 2.2)], G("tantang.laugh") - 0.1, gain=0.45)
    add(sfx, sfx_wind(2.2, 1), G("pasar.run"), gain=0.6)
    add(sfx, r.sfx_swoosh(0.5, 3), G("pasar.miss"), gain=0.5)
    add(sfx, l.sfx_boing(0.5), G("pasar.miss") + 0.3, gain=0.3)
    for k, nm in enumerate(["hari2.net", "hari2.fan", "hari2.kite"]):
        add(sfx, sfx_wind(1.0, 7 + k), G(nm), gain=0.5)
        add(sfx, r.sfx_swoosh(0.4, 9 + k), G(nm) + 0.3, gain=0.35)
    add(sfx, l.sfx_sigh(), G("hari2.empty"), gain=0.4)
    add(sfx, sfx_cricket(5.0), G("malam.wife") - 0.4, gain=0.5)
    add(sfx, l.sfx_gulp(1.0), G("kentut.belly"), gain=0.35)
    add(sfx, sfx_fart(1.0), G("kentut.fart"), gain=0.95)
    add(sfx, a2.sfx_ding(1760.0), G("kentut.idea"), gain=0.45)
    add(sfx, r.sfx_swoosh(0.4, 4), G("kentut.bottle"), gain=0.5)
    add(sfx, sfx_cork(), G("kentut.cork"), gain=0.6)
    addv(abu_giggle, G("kentut.giggle"), gain=0.9)
    add(sfx, a2.sfx_ding(1318.5), G("istana.give"), gain=0.3)
    add(sfx, sfx_cork(), G("buka.pop"), gain=0.9)
    add(sfx, sfx_wind(1.4, 11), G("buka.pop") + 0.15, gain=0.4)
    addv(raja_laugh, G("akhir.laugh"), gain=1.05)
    addv(crowd_laugh, G("akhir.crowd"), gain=0.75)
    addv(abu_laugh[: int(SR * 2.4)], G("akhir.crowd") + 0.6, gain=0.55)

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
    ap.add_argument("--out", default="abu_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

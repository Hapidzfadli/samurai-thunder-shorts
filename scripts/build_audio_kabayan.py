"""Audio + timing for Si Kabayan Ngala Tutut. Writes src/kabayan_timing.json and public/audio/kabayan_master.mp3."""
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
TIMING_JSON = ROOT / "src" / "kabayan_timing.json"

KAB = {"pitch": 1.0, "rate": 0.96, "k": 1.55}
ABAH = {"pitch": 0.8, "rate": 1.06, "k": 1.75, "warm": True}
ITEUNG = {"pitch": 1.2, "rate": 1.03, "k": 1.6, "warm": True}
N = lambda **k: dict({"rate": 1.04, "k": 1.6}, **k)

SCENES = [
    ("pagi", 0.1, 0.3, 11.0, [
        ("n1", 0.0, "Pagi-pagi, Si Kabayan masih mendengkur di bale-bale.", N(emph=["Pagi-pagi", "Kabayan", "mendengkur"]), 3),
        ("a1", 0.2, "Kabayan! Bangun! Cari tutut ke sawah, buat lauk makan siang!", dict(ABAH, emph=["Kabayan", "Bangun", "tutut", "sawah"]), 3),
        ("n2", 0.15, "Dengan malas, Kabayan bangun. Nyi Iteung menyerahkan korang.", N(emph=["malas", "Iteung", "korang"]), 3),
        ("i1", 0.12, "Yang banyak ya, Kang.", dict(ITEUNG, emph=["banyak", "Kang"]), 3),
    ]),
    ("jalan", 0.1, 0.3, 6.0, [
        ("n3", 0.0, "Kabayan berjalan ke sawah, sambil bersiul santai.", N(emph=["sawah", "bersiul", "santai"]), 3),
    ]),
    ("pematang", 0.1, 0.4, 13.0, [
        ("n4", 0.0, "Sampai di pematang, ia hendak turun ke sawah. Tapi begitu melihat ke bawah...", N(emph=["pematang", "turun", "melihat", "bawah"]), 3),
        ("k1", 0.5, "Euleuh! Sawahnya dalam sekali! Ada langitnya di bawah!", dict(KAB, rate=1.06, k=1.8, emph=["Euleuh", "dalam", "sekali", "langitnya"]), 3),
        ("n5", 0.2, "Di air sawah, terlihat langit biru, lengkap dengan awannya.", N(emph=["langit", "biru", "awannya"]), 3),
    ]),
    ("saung", 0.1, 0.4, 8.0, [
        ("n6", 0.0, "Kabayan tidak berani turun. Ia duduk di saung, menunggu, sampai ketiduran. Sampai sore.", N(rate=1.0, emph=["tidak", "berani", "saung", "ketiduran", "sore"], end="fall"), 3),
    ]),
    ("sore", 0.1, 0.3, 11.0, [
        ("a2", 0.0, "Kabayan! Mana tututnya?", dict(ABAH, emph=["Kabayan", "Mana", "tututnya"], end="rise"), 3),
        ("k2", 0.2, "Sawahnya dalam, Bah. Sedalam langit! Nanti saya tenggelam.", dict(KAB, emph=["dalam", "Sedalam", "langit", "tenggelam"]), 3),
        ("n7", 0.15, "Abah langsung naik darah.", N(rate=0.98, k=1.8, emph=["naik", "darah"], end="fall"), 3),
    ]),
    ("seret", 0.1, 0.3, 8.0, [
        ("a3", 0.0, "Dalam bagaimana? Ayo ikut!", dict(ABAH, rate=1.1, emph=["Dalam", "bagaimana", "ikut"]), 3),
        ("k3", 0.2, "Tuh, Bah, lihat sendiri. Ada langitnya!", dict(KAB, emph=["Tuh", "lihat", "langitnya"]), 3),
    ]),
    ("dorong", 0.1, 0.4, 8.0, [
        ("n8", 0.0, "Tanpa banyak bicara, Abah mendorong Kabayan ke sawah.", N(rate=1.08, emph=["Tanpa", "mendorong", "sawah"]), 3),
        ("n9", 1.8, "Ternyata, airnya cuma sebetis.", N(rate=0.98, emph=["Ternyata", "cuma", "sebetis"], end="fall"), 3),
    ]),
    ("akhir", 0.1, 1.6, 12.0, [
        ("k4", 0.0, "Geuning... langitnya cuma sebetis, Bah.", dict(KAB, rate=1.0, k=1.7, emph=["Geuning", "sebetis"], end="fall"), 3),
        ("n10", 3.0, "Hari itu, Kabayan pulang membawa tutut. Dan juga, lumpur sampai ke telinga.", N(emph=["tutut", "lumpur", "telinga"], end="fall"), 3),
    ]),
]


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    s = lambda i, k=0.0: L[i]["ls"] + k * d(i)
    e = lambda i: L[i]["le"]
    return {
        "pagi.snore": s("n1", 0.3), "pagi.call": s("a1"), "pagi.shake": s("a1", 0.15), "pagi.wake": s("n2", 0.1), "pagi.give": s("n2", 0.62), "pagi.thank": s("i1"),
        "jalan.whistle": s("n3", 0.5),
        "pematang.crouch": s("n4", 0.35), "pematang.foot": s("n4", 0.62), "pematang.look": s("n4", 0.88), "pematang.shock": s("k1"), "pematang.pov": s("n5"),
        "saung.sit": s("n6", 0.25), "saung.sleep": s("n6", 0.55), "saung.dusk": s("n6", 0.85),
        "sore.ask": s("a2"), "sore.flip": s("k2", 0.05), "sore.angry": s("n7"),
        "seret.drag": s("a3"), "seret.point": s("k3", 0.25),
        "dorong.walk": s("n8"), "dorong.push": s("n8", 0.78), "dorong.splash": e("n8") + 0.3, "dorong.stand": s("n9"),
        "akhir.grin": s("k4"), "akhir.facepalm": e("k4") + 0.15, "akhir.laugh": e("k4") + 0.4, "akhir.pick": s("n10", 0.3), "akhir.title": s("n10", 0.75),
    }


def load_mp3(path, ratio=1.0):
    af = f"asetrate={int(SR * ratio)},aresample={SR}" if ratio != 1.0 else "anull"
    p = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-af", af, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def pluck(freq, dur=1.6, bright=0.5, seed=0):
    """Karplus-Strong string (kecapi-like)."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    period = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, period)
    out = np.zeros(n, dtype=np.float32)
    for i in range(n):
        v = buf[i % period]
        out[i] = v
        buf[i % period] = 0.996 * (bright * v + (1 - bright) * 0.5 * (v + buf[(i + 1) % period]))
    return out * np.exp(-np.arange(n) / SR * 1.2)


def suling(freq, dur, vib=5.5):
    t = np.arange(int(SR * dur)) / SR
    f = freq * (1 + 0.012 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / 0.4))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * 0.8 + np.sin(2 * ph) * 0.12 + g._bp(np.random.default_rng(int(freq)).standard_normal(len(t)), freq * 0.8, freq * 3) * 0.08
    return (x * np.minimum(1, t / 0.12) * np.minimum(1, (dur - t) / 0.3)).astype(np.float32)


def kecapi_bed(total, level):
    """Gentle Sundanese-flavoured loop: pentatonic kecapi arpeggio + occasional suling phrases."""
    N_ = int(SR * total)
    out = np.zeros(N_, dtype=np.float32)
    scale = [293.7, 329.6, 370.0, 440.0, 493.9, 587.3, 659.3, 740.0]  # D major pentatonic-ish
    pattern = [0, 2, 4, 5, 3, 2, 1, 2, 0, 3, 5, 6, 4, 3, 2, 1]
    beat = 0.36
    cache = {}
    k = 0
    t = 0.0
    while t < total - 0.2:
        deg = pattern[k % len(pattern)] + (2 if (k // 32) % 2 else 0)
        f = scale[deg % len(scale)] / 2
        key = (round(f, 1), k % 3)
        if key not in cache:
            cache[key] = pluck(f, 1.4, 0.45, seed=k % 3)
        c = cache[key]
        i0 = int(t * SR)
        m = min(len(c), N_ - i0)
        out[i0:i0 + m] += c[:m] * (0.9 if k % 4 == 0 else 0.6)
        if k % 8 == 0:
            b = pluck(scale[0] / 4, 1.8, 0.3, seed=9)
            m2 = min(len(b), N_ - i0)
            out[i0:i0 + m2] += b[:m2] * 0.7
        t += beat
        k += 1
    phrase = [(5, 1.0), (4, 0.5), (3, 0.5), (2, 1.5), (3, 0.6), (1, 1.6)]
    for start in np.arange(4.0, total - 6, 16.0):
        tt = start
        for deg, du in phrase:
            s = suling(scale[deg] * 2, du * 0.95)
            i0 = int(tt * SR)
            m = min(len(s), N_ - i0)
            out[i0:i0 + m] += s[:m] * 0.22
            tt += du
    tt = np.arange(N_) / SR
    out *= np.interp(tt, level[0], level[1])
    out = g._lp(out, 5000)
    return np.stack([out, out], axis=1) / (np.max(np.abs(out)) + 1e-9) * 0.5


def sfx_rooster():
    t = np.arange(int(SR * 1.6)) / SR
    f = np.where(t < 0.25, 600 + 600 * t / 0.25, np.where(t < 1.1, 1200 - 150 * np.sin(np.pi * (t - 0.25) / 0.85), 1050 - 500 * (t - 1.1) / 0.5))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sign(np.sin(ph)) * 0.3 + np.sin(ph) * 0.4 + np.sin(2 * ph) * 0.2) * np.minimum(1, t / 0.05) * np.minimum(1, (1.6 - t) / 0.2)
    return (g._bp(x, 500, 4000) * 0.5).astype(np.float32)


def sfx_snore(dur=2.4):
    t = np.arange(int(SR * dur)) / SR
    rng = np.random.default_rng(3)
    env = np.clip(np.sin(2 * np.pi * t / 1.2), 0, 1) ** 1.5
    x = (g._lp(rng.standard_normal(len(t)), 300) * 0.8 + np.sign(np.sin(2 * np.pi * 70 * t)) * 0.2) * env
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.5).astype(np.float32)


def sfx_whistle():
    notes = [(784, 0.25), (880, 0.25), (988, 0.4), (880, 0.2), (784, 0.5), (659, 0.6)]
    parts = []
    for f, d in notes:
        t = np.arange(int(SR * d)) / SR
        parts.append(np.sin(2 * np.pi * f * 2 * t * (1 + 0.004 * np.sin(2 * np.pi * 6 * t))) * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.05))
    x = np.concatenate(parts) + g._bp(np.random.default_rng(1).standard_normal(sum(len(p) for p in parts)), 1500, 4000) * 0.03
    return (x * 0.3).astype(np.float32)


def sfx_water(dur=6.0, seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 900, 5000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.3 * t + rng.uniform(0, 3)))) ** 2
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.2 * np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.8)).astype(np.float32)


def sfx_frog(n=3, seed=5):
    out = []
    for i in range(n):
        t = np.arange(int(SR * 0.22)) / SR
        x = np.sign(np.sin(2 * np.pi * (180 + 40 * np.sin(2 * np.pi * 30 * t)) * t)) * np.exp(-t * 10)
        out += [g._lp(x, 1200) * 0.5, np.zeros(int(SR * 0.18))]
    return np.concatenate(out).astype(np.float32)


def sfx_splash(seed=6):
    rng = np.random.default_rng(seed)
    n = int(SR * 1.8)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 300, 6000) * np.exp(-t * 4) + np.sin(2 * np.pi * (90 - 40 * t) * t) * np.exp(-t * 8) * 0.8
    for k in range(10):
        i0 = int(SR * (0.4 + rng.uniform(0, 1.2)))
        m = int(SR * 0.05)
        tt = np.arange(m) / SR
        x[i0:i0 + m] += np.sin(2 * np.pi * rng.uniform(900, 1800) * tt) * np.exp(-tt * 60) * 0.3
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.9).astype(np.float32)


def sfx_cricket(dur=3.0):
    t = np.arange(int(SR * dur)) / SR
    gate = (np.sin(2 * np.pi * 2.0 * t) > 0.4) * (np.sin(2 * np.pi * 30 * t) > 0)
    return (np.sin(2 * np.pi * 4300 * t) * gate * 0.2 * np.minimum(1, (dur - t) / 0.3)).astype(np.float32)


def sfx_step(seed=7):
    rng = np.random.default_rng(seed)
    t = np.arange(int(SR * 0.12)) / SR
    return (g._lp(rng.standard_normal(len(t)), 500) * np.exp(-t * 40) * 0.5).astype(np.float32)


def build(voice_arg, out_name="kabayan_master.mp3"):
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

    base = {"pagi": 0.7, "jalan": 0.9, "pematang": 0.55, "saung": 0.6, "sore": 0.45, "seret": 0.7, "dorong": 0.4, "akhir": 0.85}
    ip_t, ip_v = [0.0], [0.6]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mus = kecapi_bed(total, (ip_t, ip_v))
    tt = np.linspace(0, total, N_, endpoint=False)
    mus *= np.interp(tt, [0, 0.6, G("dorong.push") - 0.2, G("dorong.push"), G("dorong.splash") + 1.2, G("dorong.splash") + 2.4, total - 3.0, total], [0, 1, 1, 0.15, 0.15, 1, 1, 0])[:, None]
    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.18, gain=0.25)

    T = ROOT / "exports" / "riset" / "tawa"
    iteung_laugh = load_mp3(T / "tawa_abu_lepas.mp3", 1.28)
    tani_laugh = load_mp3(T / "tawa_raja.mp3", 1.05)
    def addv(clip, at, gain=1.0):
        add(vo, g.norm_rms(clip, 0.11), at, gain=gain)
    add(sfx, sfx_rooster(), 0.2, gain=0.55)
    add(sfx, sfx_snore(2.6), G("pagi.snore") - 0.6, gain=0.6)
    add(sfx, l.sfx_bonk(), G("pagi.shake"), gain=0.25)
    add(sfx, l.sfx_sigh(), G("pagi.wake") + 0.2, gain=0.5)
    add(sfx, r.sfx_swoosh(0.4, 3), G("pagi.give"), gain=0.35)
    for k in range(8):
        add(sfx, sfx_step(k), S["jalan"] + 0.3 + k * 0.45, gain=0.35)
    add(sfx, sfx_whistle(), G("jalan.whistle") - 0.6, gain=0.7)
    add(sfx, sfx_water(scene_end["pematang"] - S["pematang"]), S["pematang"], gain=0.6)
    add(sfx, sfx_frog(3), G("pematang.crouch"), gain=0.4)
    add(sfx, r.sfx_ting(1760.0, 1.2), G("pematang.look"), gain=0.35)
    add(sfx, l.sfx_boing(0.6), G("pematang.shock"), gain=0.45)
    add(sfx, hm.sfx_chime_up(), G("pematang.pov"), gain=0.35)
    add(sfx, l.sfx_sigh(), G("saung.sit"), gain=0.3)
    add(sfx, sfx_snore(2.4), G("saung.sleep"), gain=0.45)
    add(sfx, sfx_cricket(4.0), G("saung.dusk"), gain=0.4)
    add(sfx, sfx_frog(2, 8), S["sore"] + 0.2, gain=0.3)
    add(sfx, l.sfx_pop(500), G("sore.flip"), gain=0.35)
    add(sfx, a2.sfx_heart(2, 110), G("sore.angry"), gain=0.45)
    for k in range(10):
        add(sfx, sfx_step(k + 20), S["seret"] + 0.2 + k * 0.3, gain=0.4)
    add(sfx, sfx_water(scene_end["dorong"] - S["dorong"]), S["dorong"], gain=0.5)
    add(sfx, r.sfx_swoosh(0.4, 7), G("dorong.push"), gain=0.6)
    add(sfx, sfx_splash(), G("dorong.splash"), gain=1.0)
    add(sfx, l.sfx_drip(1300, 3), G("dorong.stand"), gain=0.4)
    add(sfx, l.sfx_drip(1100, 4), G("dorong.stand") + 0.5, gain=0.35)
    add(sfx, l.sfx_bonk(), G("akhir.facepalm"), gain=0.45)
    addv(iteung_laugh, G("akhir.laugh"), gain=0.8)
    addv(tani_laugh, G("akhir.laugh") + 0.5, gain=0.6)
    add(sfx, l.sfx_pop(900), G("akhir.pick"), gain=0.35)
    add(sfx, hm.sfx_chime_up(), G("akhir.title"), gain=0.4)

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
    ap.add_argument("--out", default="kabayan_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

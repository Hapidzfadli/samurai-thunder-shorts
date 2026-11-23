"""Audio + timing for the comedic 'Rani & rambut berdiri' short (static electricity mistaken for an aura).

Reuses the narration engine of build_audio_genderuwo.py (cloned voice, clearest-candidate selection, expressive
prosody, punctuation pauses). Writes src/rani_timing.json (scene lengths, caption windows, visual beats) so the
picture follows the speech, and public/audio/rani_master.mp3.
"""
import argparse
import importlib.util
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("g", ROOT / "scripts" / "build_audio_genderuwo.py")
g = importlib.util.module_from_spec(spec)
sys.modules["g"] = g
spec.loader.exec_module(g)
np, signal, SR, FPS = g.np, g.signal, g.SR, g.FPS

TIMING_JSON = ROOT / "src" / "rani_timing.json"
STEP_RANI = 1.6  # Rani drags her sandals at this many steps/s while Aldi watches

# (id, pause_before_s, text, fx, candidates)
SCENES = [
    ("hook", 0.25, 0.5, 5.5, [
        ("hook_1", 0.0, "Rani, kasir baru di warung Bu Ratmi, bisa bikin rambut orang berdiri, cuma dengan lewat.", {"rate": 1.0, "emph": ["Rani", "berdiri"], "k": 1.5}, 3),
        ("hook_2", 0.30, "Rambut para pembeli di antrean tegak serentak, lalu condong ke arahnya, kayak tanaman nyari matahari.", {"rate": 1.0, "emph": ["serentak", "condong", "matahari"], "k": 1.5}, 3),
    ]),
    ("curiga", 0.25, 0.4, 7.0, [
        ("curiga_1", 0.0, "Bu Ratmi yakin Rani punya aura aneh. Katanya, harus mandi kembang tujuh rupa.", {"rate": 1.02, "emph": ["aura", "kembang"], "k": 1.5}, 3),
        ("curiga_2", 0.30, "Padahal Rani baru seminggu kerja, sejak lantai warung diganti vinil baru yang licin.", {"rate": 1.02, "emph": ["seminggu", "vinil"]}, 3),
    ]),
    ("sengat", 0.25, 0.4, 8.0, [
        ("sengat_1a", 0.0, "Tiap Rani pegang rak besi, dia tersengat.", {"rate": 1.0, "emph": ["pegang", "tersengat"], "k": 1.5}, 3),
        ("sengat_1b", 0.50, "Tik.", {"rate": 0.9, "gain": 1.1}, 6),
        ("sengat_1c", 0.22, "Plastik bungkus menempel di lengannya, dan susah dikibas.", {"rate": 1.02, "emph": ["menempel", "susah"]}, 3),
        ("sengat_2", 0.35, "Pembeli pun pindah ke warung sebelah. Cuma Pak Botak yang tetap santai.", {"rate": 1.02, "emph": ["pindah", "Botak", "santai"], "end": "fall"}, 3),
    ]),
    ("hujan", 0.25, 0.4, 8.0, [
        ("hujan_1", 0.0, "Lalu hujan turun tiga hari, dan nggak ada satu pun rambut yang berdiri.", {"rate": 1.0, "emph": ["hujan", "tiga", "satu"]}, 3),
        ("hujan_2a", 0.30, "Kata Bu Ratmi, alhamdulillah, auranya sudah luntur.", {"rate": 1.02, "emph": ["luntur"], "k": 1.5}, 3),
        ("hujan_2b", 0.40, "Tapi begitu cuaca panas lagi, rambut-rambut itu berdiri lagi.", {"rate": 1.02, "emph": ["panas", "berdiri", "lagi"], "k": 1.55}, 3),
    ]),
    ("aldi", 0.25, 0.4, 7.0, [
        ("aldi_1", 0.0, "Sampai Aldi, anak SD yang lagi pintar-pintarnya IPA, memperhatikan Rani jalan menyeret sandal di atas vinil itu.", {"rate": 1.02, "emph": ["Aldi", "menyeret", "vinil"]}, 3),
        ("aldi_2", 0.30, "Dia menyuruh Rani memegang pagar besi di depan warung.", {"rate": 1.0, "emph": ["menyuruh", "pagar", "besi"], "end": "fall"}, 3),
    ]),
    ("tik", 0.55, 0.5, 11.0, [
        ("tik_1", 0.0, "Tik.", {"rate": 0.9, "gain": 1.1}, 6),
        ("tik_1b", 0.35, "Rambut semua orang langsung turun.", {"rate": 1.0, "emph": ["langsung", "turun"], "k": 1.5, "end": "fall"}, 3),
        ("tik_2a", 0.45, "Itu listrik statis, Bu.", {"rate": 1.0, "emph": ["listrik", "statis"], "k": 1.5}, 3),
        ("tik_2b", 0.20, "Sandal karet diseret di lantai vinil bikin badan Rani penuh muatan.", {"rate": 1.02, "emph": ["diseret", "muatan"]}, 3),
        ("tik_3", 0.30, "Rambut berdiri karena muatannya sama, jadi saling tolak. Begitu menyentuh besi, muatannya lepas.", {"rate": 1.02, "emph": ["sama", "tolak", "lepas"], "end": "fall"}, 3),
    ]),
    ("akhir", 0.25, 1.2, 7.0, [
        ("akhir_1", 0.0, "Besoknya, Bu Ratmi memasang keset kain, dan lantai vinil itu pun ditutup.", {"rate": 1.02, "emph": ["keset", "ditutup"]}, 3),
        ("akhir_2", 0.40, "Tapi keranjang kembang tujuh rupa tetap ada di samping meja kasir. Jaga-jaga.", {"rate": 1.0, "emph": ["tetap", "Jaga-jaga"], "end": "fall", "k": 1.5}, 3),
    ]),
]
# make the short "Tik." fragments robust: several spellings, the clearest wins
g.VARIANTS.update({"sengat_1b": ["Tik.", "Tik, tik.", "Tek."], "tik_1": ["Tik.", "Tik, tik.", "Tek."]})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    return {
        "hook.walk0": 0.2,
        "hook.stand": L["hook_2"]["ls"],
        "hook.walk1": L["hook_2"]["le"] + 0.3,
        "curiga.aura": L["curiga_1"]["ls"] + 0.3,
        "curiga.basket": L["curiga_1"]["ls"] + 0.62 * d("curiga_1"),
        "curiga.vinyl": L["curiga_2"]["ls"] + 0.5 * d("curiga_2"),
        "sengat.touch": L["sengat_1b"]["ls"] - 0.25,
        "sengat.tik": L["sengat_1b"]["ls"],
        "sengat.plastic": L["sengat_1c"]["ls"] + 0.3,
        "sengat.leave": L["sengat_2"]["ls"],
        "hujan.rain0": L["hujan_1"]["ls"],
        "hujan.sun": L["hujan_2b"]["ls"],
        "hujan.up": L["hujan_2b"]["ls"] + 1.0,
        "aldi.enter": 0.25,
        "aldi.point": L["aldi_2"]["ls"],
        "tik.touch": L["tik_1"]["ls"] - 0.3,
        "tik.tik": L["tik_1"]["ls"],
        "tik.fall": L["tik_1b"]["ls"],
        "tik.charge": L["tik_2b"]["ls"],
        "tik.repel": L["tik_3"]["ls"],
        "tik.release": L["tik_3"]["ls"] + 0.62 * d("tik_3"),
        "akhir.mat": L["akhir_1"]["ls"] + 0.6 * d("akhir_1"),
        "akhir.basket": L["akhir_2"]["ls"],
    }


# ------------------------------------------------------------------------------ SFX
def sfx_tik(seed=1, big=False):
    """Static discharge: a dry click + a short crackle of ionised air."""
    rng = np.random.default_rng(seed)
    n = int(SR * (0.5 if big else 0.28))
    t = np.arange(n) / SR
    click = g._bp(rng.standard_normal(n), 2500, 9500) * np.exp(-t * 260)
    snap = np.sin(2 * np.pi * 1500 * t) * np.exp(-t * 90) * 0.5
    crackle = np.zeros(n)
    for k in range(int(rng.integers(5, 9) if big else rng.integers(3, 5))):
        i0 = int(rng.uniform(0.01, 0.2 if big else 0.12) * SR)
        ln = int(0.004 * SR)
        crackle[i0 : i0 + ln] += g._bp(rng.standard_normal(ln + 40), 3000, 9000)[:ln] * np.hanning(ln) * rng.uniform(0.3, 0.8)
    out = np.tanh((click * 1.6 + snap + crackle) * 1.3)
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.9).astype(np.float32)


def sfx_crackle(dur=1.0, density=60, seed=2, rise=True):
    """Hair standing up: a rising patter of tiny static crackles."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    out = np.zeros(n)
    k = int(density * dur)
    times = np.sort(rng.random(k) ** (0.6 if rise else 1.0)) * (dur - 0.02)
    for tt in times:
        ln = int(rng.uniform(0.002, 0.006) * SR)
        i0 = int(tt * SR)
        out[i0 : i0 + ln] += g._bp(rng.standard_normal(ln + 40), 2500, 9000)[:ln] * np.hanning(ln) * rng.uniform(0.2, 0.7) * (0.3 + 0.7 * tt / dur if rise else 1.0)
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.6).astype(np.float32)


def sfx_crinkle(dur=1.0, seed=3):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    out = np.zeros(n)
    for k in range(int(26 * dur)):
        i0 = int(rng.uniform(0, dur - 0.05) * SR)
        ln = int(rng.uniform(0.004, 0.02) * SR)
        out[i0 : i0 + ln] += g._bp(rng.standard_normal(ln + 40), 1800, 8000)[:ln] * np.hanning(ln) * rng.uniform(0.2, 0.8)
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.6).astype(np.float32)


def sfx_shuffle(seed=4):
    """A sandal dragged across vinyl: a dry, scratchy swish."""
    rng = np.random.default_rng(seed)
    n = int(SR * 0.34)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / 0.34, 0, 1)) ** 1.5
    x = g._bp(rng.standard_normal(n), 700, 4200) * env
    x += 0.35 * g._bp(rng.standard_normal(n), 3500, 8000) * env ** 2
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)


def sfx_slide_down(dur=0.7):
    """Hair falling flat: a quick downward whoosh."""
    t = np.arange(int(SR * dur)) / SR
    f = 1400 * np.exp(-t * 3.2) + 120
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5)
    x += 0.4 * g._bp(np.random.default_rng(5).standard_normal(len(t)), 600, 4500) * np.exp(-t * 6)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)


def sfx_ting(f=1318.5, dur=1.2):
    t = np.arange(int(SR * dur)) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 4.0) + 0.4 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t * 7)
    return (x * 0.7).astype(np.float32)


def sfx_swoosh(dur=0.35, seed=6):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 500, 5000) * np.sin(np.pi * t / dur) ** 2
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.5).astype(np.float32)


def rain_bed(dur, seed=7):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    x = g._bp(rng.standard_normal(n), 1500, 9000) * 0.5 + g._lp(rng.standard_normal(n), 800, 2) * 0.4
    drops = np.zeros(n)
    for k in range(int(dur * 70)):
        i0 = int(rng.uniform(0, dur - 0.05) * SR)
        ln = int(0.006 * SR)
        drops[i0 : i0 + ln] += g._bp(rng.standard_normal(ln + 40), 2000, 6000)[:ln] * np.hanning(ln) * rng.uniform(0.2, 0.9)
    y = x * 0.5 + drops * 0.6
    return np.stack([y, np.roll(y, 311)], axis=1).astype(np.float32)


# ------------------------------------------------------------------------------ music
def music_bed(total, intensity, pauses):
    """Playful marimba + pizzicato bass + shaker at 112 bpm over C - Am - F - G. `intensity` (0..1) is sampled at
    each note; `pauses` are (t0, t1) windows where the band drops out for the joke to land."""
    rng = np.random.default_rng(11)
    N = int(SR * total) + SR
    out = np.zeros((N, 2), dtype=np.float32)
    beat = 60.0 / 112.0
    prog = [(130.81, [261.63, 329.63, 392.0]), (110.0, [220.0, 261.63, 329.63]), (87.31, [174.61, 220.0, 261.63]), (98.0, [196.0, 246.94, 293.66])]

    def silent(t):
        return any(a <= t <= b for a, b in pauses)

    def marimba(f, dur=0.5):
        t = np.arange(int(SR * dur)) / SR
        return (np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 22)).astype(np.float32)

    def pluck(f, dur=0.45):
        t = np.arange(int(SR * dur)) / SR
        x = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.4 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 12)
        return g._lp(x, 1400).astype(np.float32)

    step = 0
    t = 0.0
    while t < total:
        bar, pos = divmod(step, 8)  # 8 eighth-notes per bar of 4 beats
        root, chord = prog[bar % 4]
        ti = np.interp(t, intensity[0], intensity[1])
        if not silent(t) and ti > 0.05:
            if pos % 4 == 0:
                g._put(out, pluck(root) * 0.5 * ti, t, 0.9, 0.9)
            elif pos in (2, 6) and ti > 0.35:
                g._put(out, pluck(root * 1.5) * 0.3 * ti, t, 0.9, 0.9)
            if ti > 0.3 and (pos % 2 == 1 or rng.random() < 0.55):
                f = chord[int(rng.integers(0, 3))] * (2 if rng.random() < 0.5 else 1)
                pan = rng.uniform(-0.4, 0.4)
                g._put(out, marimba(f) * 0.28 * ti, t, math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4))
            if ti > 0.6 and pos % 2 == 1:
                sh = g._bp(rng.standard_normal(int(0.05 * SR)), 5000, 10000) * np.hanning(int(0.05 * SR)) * 0.1
                g._put(out, sh.astype(np.float32) * ti, t, 0.7, 0.7)
        step += 1
        t += beat / 2
    return out[: int(SR * total)]


# ------------------------------------------------------------------------------ build
def build(voice_arg, out_name="rani_master.mp3"):
    narr_wav = g.prepare_voice_prompt(voice_arg)
    narr = g.tts_model.get_state_for_audio_prompt(str(narr_wav))
    g.SCENES = SCENES
    g.TIMING_JSON = TIMING_JSON
    g.STEP_F = {"rani": STEP_RANI}

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

    # ---- music: intensity per scene; the band drops out right before each "tik" so the joke lands ----
    ip_t = [0.0]
    ip_v = [0.0]
    base = {"hook": 0.9, "curiga": 0.8, "sengat": 0.8, "hujan": 0.45, "aldi": 0.7, "tik": 0.85, "akhir": 0.75}
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    ip_t[1] = 0.6
    ip_v[1] = 0.9
    pauses = [(G("sengat.tik") - 0.9, G("sengat.tik") + 0.45), (G("tik.tik") - 1.0, G("tik.tik") + 0.5)]
    mus = music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 1.0, total - 3.0, total], [0, 1, 1, 0])[:, None]

    sfx = np.zeros((N, 2), dtype=np.float32)
    vo = np.zeros((N, 2), dtype=np.float32)
    amb = np.zeros((N, 2), dtype=np.float32)

    # transitions: a quick swoosh into every cut
    for k in order[1:]:
        g.add_clip(sfx, sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.2, gain=0.14)

    # hook: hair begins to stand (crackle), staying under the narration
    g.add_clip(sfx, sfx_crackle(1.6, 70, 2), G("hook.stand"), gain=0.35)
    # curiga: the flower basket arrives
    g.add_clip(sfx, sfx_ting(1568.0, 1.0), G("curiga.basket"), gain=0.25)
    g.add_clip(sfx, sfx_ting(1975.5, 0.9), G("curiga.basket") + 0.12, gain=0.18)
    # sengat: the first "tik" (+ crinkle when the plastic clings)
    g.add_clip(sfx, sfx_tik(3), G("sengat.tik") - 0.02, gain=0.85)
    g.add_clip(sfx, sfx_crinkle(1.2, 3), G("sengat.plastic"), gain=0.5)
    for i, dt in enumerate([0.0, 0.38, 0.76, 1.14]):  # customers leaving
        g.add_clip(sfx, g.sfx_step(40 + i, 5.0, "sandal"), G("sengat.leave") + dt, gain=0.5, pan=-0.5)
    # hujan: rain for the three days, then it clears
    r0, r1 = G("hujan.rain0") - 0.3, G("hujan.sun") + 0.3
    rain = rain_bed(r1 - r0, 7)
    rain *= np.minimum(1.0, np.minimum(np.arange(len(rain)) / (0.6 * SR), (len(rain) - np.arange(len(rain))) / (0.8 * SR)))[:, None]
    g.add_clip(amb, rain, r0, gain=0.55)
    g.add_clip(sfx, sfx_ting(1046.5, 1.0), G("hujan.sun"), gain=0.22)
    g.add_clip(sfx, sfx_crackle(1.4, 70, 9), G("hujan.up"), gain=0.35)
    # aldi: the sandal drag
    t0 = S["aldi"] + ev["aldi.enter"]
    k = math.ceil(t0 * STEP_RANI)
    while k / STEP_RANI < G("aldi.point"):
        tau = k / STEP_RANI
        if tau > t0:
            g.add_clip(sfx, sfx_shuffle(70 + k), tau, gain=0.55)
        k += 1
    # tik: the discharge, hair falling, the charges
    g.add_clip(sfx, sfx_tik(8, big=True), G("tik.tik") - 0.02, gain=1.0)
    g.add_clip(sfx, sfx_slide_down(0.8), G("tik.fall"), gain=0.45)
    g.add_clip(sfx, sfx_crackle(2.5, 45, 12, rise=False), G("tik.charge"), gain=0.22)
    g.add_clip(sfx, sfx_ting(1318.5, 1.2), G("tik.repel"), gain=0.18)
    g.add_clip(sfx, sfx_tik(9), G("tik.release") - 0.02, gain=0.85)
    # akhir: the callback joke
    g.add_clip(sfx, sfx_ting(1568.0, 1.2), G("akhir.basket") + 0.9, gain=0.3)
    g.add_clip(sfx, sfx_ting(2093.0, 1.0), G("akhir.basket") + 1.05, gain=0.2)

    for sid, ln in L.items():
        g.add_clip(vo, clips[sid], ln["gs"], gain=1.08)
    vo_mono = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(vo_mono, np.ones(win, dtype=np.float32) / win, mode="same")
    duck_music = 1.0 / (1.0 + 6.0 * env)
    duck_sfx = 1.0 / (1.0 + 1.2 * env)
    master = mus * 0.9 * duck_music[:, None] + amb + sfx * duck_sfx[:, None] + vo * 1.25
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
    np.save(g.CACHE / "_rani_stems.npy", np.stack([mus[:, 0], amb[:, 0], sfx[:, 0], vo[:, 0]]).astype(np.float16))
    print(f"Selesai! Master audio: {out_mp3} ({out_mp3.stat().st_size // 1024} KB), jadwal: {TIMING_JSON}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="voices/id_prompts/youtube_8ofVl1KpViI_ref.wav")
    ap.add_argument("--out", default="rani_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

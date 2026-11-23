"""Audio + timing for the stickman comedy 'Perang lawan nyamuk' (an original story).

Reuses the narration engine (cloned voice, expressive prosody, punctuation pauses) and the playful music bed.
Writes src/nyamuk_timing.json and public/audio/nyamuk_master.mp3.
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
spec.loader.exec_module(r)  # also loads the narration engine as r.g
g = r.g
np, SR, FPS = g.np, g.SR, g.FPS
TIMING_JSON = ROOT / "src" / "nyamuk_timing.json"

SCENES = [
    ("hook", 0.30, 0.4, 6.5, [
        ("hook_1", 0.0, "Jam satu malam. Bimo baru mau tidur, tiba-tiba,", {"rate": 1.0, "emph": ["satu", "tidur", "tiba-tiba"], "k": 1.5}, 3),
        ("hook_2", 0.12, "Nging.", {"rate": 0.9, "gain": 1.1}, 6),
        ("hook_3", 0.35, "Satu nyamuk. Cuma satu. Tapi suaranya kayak pesawat jet.", {"rate": 1.02, "emph": ["satu", "pesawat", "jet"], "k": 1.55}, 3),
    ]),
    ("tampar", 0.25, 0.4, 7.0, [
        ("tampar_1a", 0.0, "Bimo menampar ke arah suara.", {"rate": 1.02, "emph": ["menampar"], "k": 1.5}, 3),
        ("tampar_1b", 0.30, "Plak.", {"rate": 0.9, "gain": 1.15}, 6),
        ("tampar_1c", 0.25, "Nyamuknya selamat, pipinya yang kena.", {"rate": 1.02, "emph": ["selamat", "pipinya"], "k": 1.5}, 3),
        ("tampar_2", 0.35, "Tamparan kedua, ketiga, keempat. Nyamuknya masih terbang santai.", {"rate": 1.05, "emph": ["kedua", "ketiga", "keempat", "santai"], "k": 1.55}, 3),
    ]),
    ("raket", 0.25, 0.4, 7.0, [
        ("raket_1", 0.0, "Bimo mengeluarkan senjata pamungkas, raket listrik.", {"rate": 1.02, "emph": ["pamungkas", "listrik"], "k": 1.55}, 3),
        ("raket_2", 0.30, "Nyamuknya menghindar, dan raketnya malah menyetrum guling kesayangan.", {"rate": 1.02, "emph": ["menghindar", "menyetrum", "guling"], "k": 1.5}, 3),
    ]),
    ("asap", 0.25, 0.4, 7.0, [
        ("asap_1", 0.0, "Obat nyamuk, kipas angin, semprotan, semuanya dinyalakan. Kamar jadi penuh asap.", {"rate": 1.05, "emph": ["semuanya", "asap"], "k": 1.5}, 3),
        ("asap_2", 0.30, "Nyamuknya baik-baik saja. Yang batuk-batuk justru Bimo.", {"rate": 1.02, "emph": ["baik-baik", "Bimo"], "k": 1.5, "end": "fall"}, 3),
    ]),
    ("senter", 0.25, 0.4, 8.0, [
        ("senter_1", 0.0, "Jam tiga pagi. Bimo matikan lampu, nyalakan senter HP, biar nyamuknya mendekat.", {"rate": 1.02, "emph": ["tiga", "senter", "mendekat"], "k": 1.5}, 3),
        ("senter_2a", 0.30, "Nyamuk hinggap di layar. Bimo menepuk sekuat tenaga.", {"rate": 1.02, "emph": ["hinggap", "sekuat"], "k": 1.55}, 3),
        ("senter_2b", 0.35, "Plak.", {"rate": 0.9, "gain": 1.15}, 6),
        ("senter_2c", 0.25, "Layar HP-nya retak.", {"rate": 1.0, "emph": ["retak"], "k": 1.5, "end": "fall"}, 3),
    ]),
    ("pagi", 0.30, 0.5, 11.0, [
        ("pagi_1", 0.0, "Akhirnya Bimo menyerah dan tertidur kelelahan.", {"rate": 0.98, "emph": ["menyerah", "kelelahan"], "k": 1.4}, 3),
        ("pagi_2", 0.45, "Paginya, badannya penuh bentol. Ternyata yang menggigit semalaman bukan si berisik, tapi puluhan nyamuk lain yang diam-diam.", {"rate": 1.05, "emph": ["bentol", "bukan", "puluhan", "diam-diam"], "k": 1.55}, 3),
        ("pagi_3", 0.40, "Sementara si berisik, tidur nyenyak di jendela.", {"rate": 1.0, "emph": ["berisik", "nyenyak"], "k": 1.5, "end": "fall"}, 3),
    ]),
    ("kelambu", 0.30, 1.6, 8.0, [
        ("kelambu_1", 0.0, "Malam berikutnya, Bimo memasang kelambu.", {"rate": 1.02, "emph": ["berikutnya", "kelambu"], "k": 1.5}, 3),
        ("kelambu_2", 0.35, "Tapi si berisik sudah masuk duluan.", {"rate": 1.0, "emph": ["berisik", "duluan"], "k": 1.6, "end": "fall"}, 3),
        ("kelambu_3", 0.35, "Nging.", {"rate": 0.9, "gain": 1.1}, 6),
    ]),
]
g.VARIANTS.update({
    "hook_2": ["Nging.", "Ngiing.", "Nging, nging."],
    "kelambu_3": ["Nging.", "Ngiing.", "Nging, nging."],
    "tampar_1b": ["Plak.", "Plak, plak.", "Plok."],
    "senter_2b": ["Plak.", "Plak, plak.", "Plok."],
})


def anchors(P):
    L = P["lines"]
    d = lambda i: L[i]["le"] - L[i]["ls"]
    return {
        "hook.buzz": L["hook_2"]["ls"],
        "hook.look": L["hook_2"]["ls"] + 0.3,
        "hook.jet": L["hook_3"]["ls"] + 0.55 * d("hook_3"),
        "tampar.swing": L["tampar_1a"]["ls"] + 0.35 * d("tampar_1a"),
        "tampar.slap1": L["tampar_1b"]["ls"],
        "tampar.slap2": L["tampar_2"]["ls"] + 0.22 * d("tampar_2"),
        "tampar.slap3": L["tampar_2"]["ls"] + 0.42 * d("tampar_2"),
        "tampar.slap4": L["tampar_2"]["ls"] + 0.62 * d("tampar_2"),
        "tampar.chill": L["tampar_2"]["ls"] + 0.82 * d("tampar_2"),
        "raket.show": L["raket_1"]["ls"] + 0.45 * d("raket_1"),
        "raket.swing": L["raket_2"]["ls"] + 0.05,
        "raket.zap": L["raket_2"]["ls"] + 0.62 * d("raket_2"),
        "asap.coil": L["asap_1"]["ls"] + 0.18 * d("asap_1"),
        "asap.fan": L["asap_1"]["ls"] + 0.36 * d("asap_1"),
        "asap.spray": L["asap_1"]["ls"] + 0.55 * d("asap_1"),
        "asap.smoke": L["asap_1"]["ls"] + 0.78 * d("asap_1"),
        "asap.cough": L["asap_2"]["ls"] + 0.55 * d("asap_2"),
        "senter.dark": L["senter_1"]["ls"] + 0.28 * d("senter_1"),
        "senter.flash": L["senter_1"]["ls"] + 0.5 * d("senter_1"),
        "senter.land": L["senter_2a"]["ls"] + 0.3 * d("senter_2a"),
        "senter.slap": L["senter_2b"]["ls"],
        "senter.crack": L["senter_2c"]["ls"],
        "pagi.sleep": L["pagi_1"]["ls"] + 0.5 * d("pagi_1"),
        "pagi.morning": L["pagi_2"]["ls"],
        "pagi.bentol": L["pagi_2"]["ls"] + 0.3 * d("pagi_2"),
        "pagi.silent": L["pagi_2"]["ls"] + 0.72 * d("pagi_2"),
        "pagi.window": L["pagi_3"]["ls"],
        "kelambu.net": L["kelambu_1"]["ls"] + 0.5 * d("kelambu_1"),
        "kelambu.inside": L["kelambu_2"]["ls"],
        "kelambu.nging": L["kelambu_3"]["ls"],
        "kelambu.card": L["kelambu_3"]["le"] + 0.15,
    }


# ------------------------------------------------------------------ comedy SFX
def stereo(x, pan=0.0):
    gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    return np.stack([x * gl, x * gr], axis=1).astype(np.float32)


def sfx_mosquito(dur, seed=1, f0=560.0, fly_by=True):
    """Wobbly high whine that swells and recedes while sweeping across the stereo field."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    vib = 1 + 0.07 * np.sin(2 * np.pi * 3.1 * t + rng.uniform(0, 6)) + 0.035 * np.sin(2 * np.pi * 7.3 * t + rng.uniform(0, 6))
    f = f0 * vib * (1 + 0.12 * np.sin(2 * np.pi * 0.4 * t + rng.uniform(0, 6)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.55 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph) + 0.12 * g._bp(rng.standard_normal(n), 2500, 6000)
    am = 0.7 + 0.3 * np.sin(2 * np.pi * (6 + 1.5 * np.sin(2 * np.pi * 0.7 * t)) * t)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7 if fly_by else np.minimum(1, t / 0.1)
    x = g._lp(x * am * env, 4200) * 0.35
    pan = np.sin(2 * np.pi * (0.5 + 0.3 * rng.random()) * t + rng.uniform(0, 6)) * 0.8
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * gl, x * gr], axis=1).astype(np.float32)


def sfx_slap(seed=2, soft=False):
    rng = np.random.default_rng(seed)
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 700, 5200) * np.exp(-t * 55) + np.sin(2 * np.pi * (170 - 60 * t) * t) * np.exp(-t * 26) * 0.9
    x = np.tanh(x * 1.5)
    return (x / (np.max(np.abs(x)) + 1e-9) * (0.6 if soft else 0.95)).astype(np.float32)


def sfx_hum(dur=1.2, seed=3):
    """Electric swatter: 100 Hz buzz with crackle."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = (2 * ((t * 100) % 1.0) - 1) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * 0.5
    x += g._bp(rng.standard_normal(n), 2500, 9000) * (rng.random(n) > 0.985) * 1.4
    return (g._lp(x, 5000) * np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.12) * 0.7).astype(np.float32)


def sfx_spray(dur=1.3, seed=4):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 2800, 9500) * np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.2)
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)


def sfx_fan(dur=2.4, seed=5):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    spin = np.minimum(1, t / 0.9)
    x = g._lp(rng.standard_normal(n), 900) * 0.55 * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * spin * t))
    x += np.sin(2 * np.pi * (45 + 25 * spin) * t) * 0.2
    return (x * spin * np.minimum(1, (dur - t) / 0.3)).astype(np.float32)


def sfx_cough(seed=6):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * 1.5))
    for k, t0 in enumerate([0.0, 0.32, 0.62]):
        n = int(SR * 0.16)
        t = np.arange(n) / SR
        burst = g._bp(rng.standard_normal(n), 300, 1800) * np.exp(-t * 20) * np.minimum(1, t / 0.01)
        tone = np.sin(2 * np.pi * (240 - 60 * t) * t) * np.exp(-t * 14) * 0.5
        i0 = int(t0 * SR)
        out[i0 : i0 + n] += burst + tone
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.6).astype(np.float32)


def sfx_glass(seed=7):
    rng = np.random.default_rng(seed)
    n = int(SR * 1.0)
    out = np.zeros(n)
    for k in range(14):
        i0 = int(rng.uniform(0, 0.25) * SR)
        ln = int(0.006 * SR)
        out[i0 : i0 + ln] += g._bp(rng.standard_normal(ln + 40), 3500, 11000)[:ln] * np.hanning(ln) * rng.uniform(0.4, 1.0)
    t = np.arange(n) / SR
    for f in (2093.0, 2637.0, 3136.0):
        out += np.sin(2 * np.pi * f * t) * np.exp(-t * 7) * 0.12
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.7).astype(np.float32)


def sfx_snore(dur=4.0, seed=8):
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    cyc = (t % 2.0) / 2.0
    env = np.where(cyc < 0.35, np.sin(np.pi * cyc / 0.35) ** 1.5, 0) + 0.25 * np.where((cyc > 0.5) & (cyc < 0.62), np.sin(np.pi * (cyc - 0.5) / 0.12), 0)
    x = g._lp(rng.standard_normal(n), 380, 3) * env
    x += 0.5 * np.sin(2 * np.pi * (60 + 20 * env) * t) * env
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.55).astype(np.float32)


def sfx_boing(dur=0.6):
    t = np.arange(int(SR * dur)) / SR
    f = 260 + 520 * np.sin(np.pi * np.clip(t / 0.25, 0, 1)) ** 0.7 * np.exp(-t * 3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    return (x * 0.7).astype(np.float32)


def sfx_lighter(seed=9):
    rng = np.random.default_rng(seed)
    out = np.zeros(int(SR * 0.7))
    for t0 in (0.0, 0.16):
        ln = int(0.02 * SR)
        i0 = int(t0 * SR)
        out[i0 : i0 + ln] += g._bp(rng.standard_normal(ln + 40), 2000, 8000)[:ln] * np.hanning(ln)
    n = int(SR * 0.35)
    out[int(0.3 * SR) : int(0.3 * SR) + n] += g._bp(rng.standard_normal(n), 300, 2000) * np.sin(np.pi * np.arange(n) / n) * 0.25
    return (out / (np.max(np.abs(out)) + 1e-9) * 0.6).astype(np.float32)


# ------------------------------------------------------------------ build
def build(voice_arg, out_name="nyamuk_master.mp3"):
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

    # music: playful band that drops out right before each slap so the joke lands
    base = {"hook": 0.55, "tampar": 0.85, "raket": 0.9, "asap": 0.8, "senter": 0.6, "pagi": 0.7, "kelambu": 0.75}
    ip_t, ip_v = [0.0, 0.6], [0.0, 0.55]
    for k in order:
        ip_t += [S[k] + 0.05, scene_end[k] - 0.05]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    ip_t[1], ip_v[1] = 0.6, 0.55
    slaps = [G("tampar.slap1"), G("tampar.slap2"), G("tampar.slap3"), G("tampar.slap4"), G("senter.slap")]
    pauses = [(G("hook.buzz") - 0.2, G("hook.buzz") + 2.4), (G("senter.dark") - 0.2, G("senter.slap") + 0.5)] + [(s - 0.35, s + 0.22) for s in slaps[:1]]
    mus = r.music_bed(total, (ip_t, ip_v), pauses)
    tt = np.linspace(0, total, N, endpoint=False)
    mus *= np.interp(tt, [0, 1.0, total - 2.5, total], [0, 1, 1, 0])[:, None]

    # transitions
    for k in order[1:]:
        add(sfx, r.sfx_swoosh(0.35, hash(k) % 50), S[k] - 0.2, gain=0.13)

    # hook: the whine arrives; it keeps circling in the following scenes
    add(sfx, sfx_mosquito(3.4, 1, 560), G("hook.buzz") - 0.1, gain=0.55)
    add(sfx, sfx_boing(0.6), G("hook.look") + 0.5, gain=0.25)
    # tampar: swing, slap, three more slaps; the mosquito keeps dodging
    add(sfx, r.sfx_swoosh(0.3, 3), G("tampar.swing"), gain=0.35)
    add(sfx, sfx_slap(1), G("tampar.slap1"), gain=0.9)
    add(sfx, sfx_mosquito(1.8, 2, 600), G("tampar.slap1") + 0.2, gain=0.4)
    for i, k in enumerate(("tampar.slap2", "tampar.slap3", "tampar.slap4")):
        add(sfx, sfx_slap(2 + i, soft=True), G(k), gain=0.75)
        add(sfx, sfx_mosquito(0.9, 10 + i, 620 + 40 * i), G(k) + 0.1, gain=0.3)
    add(sfx, sfx_mosquito(2.2, 14, 580), G("tampar.chill"), gain=0.35)
    # raket: it hums, swings, misses, zaps the bolster
    add(sfx, sfx_hum(1.4, 3), G("raket.show"), gain=0.45)
    add(sfx, sfx_mosquito(2.0, 15, 640), G("raket.swing") - 0.1, gain=0.35)
    add(sfx, r.sfx_swoosh(0.3, 5), G("raket.swing"), gain=0.35)
    add(sfx, r.sfx_tik(11, big=True), G("raket.zap"), gain=0.95)
    add(sfx, r.sfx_crackle(1.2, 90, 3, rise=False), G("raket.zap"), gain=0.45)
    add(sfx, sfx_boing(0.6), G("raket.zap") + 0.45, gain=0.25)
    # asap: lighter, fan, spray, then coughing
    add(sfx, sfx_lighter(), G("asap.coil"), gain=0.6)
    add(sfx, sfx_fan(2.6), G("asap.fan"), gain=0.5)
    add(sfx, sfx_spray(1.4), G("asap.spray"), gain=0.55)
    add(sfx, sfx_cough(), G("asap.cough"), gain=0.7)
    add(sfx, sfx_mosquito(2.0, 16, 560), G("asap.cough") + 0.3, gain=0.3)
    # senter: darkness, click, the mosquito lands, the slap, the glass
    add(sfx, r.sfx_swoosh(0.4, 7), G("senter.dark"), gain=0.2)
    add(sfx, r.sfx_ting(1760.0, 0.5), G("senter.flash"), gain=0.18)
    add(sfx, sfx_mosquito(2.2, 17, 600), G("senter.flash") + 0.2, gain=0.4)
    add(sfx, sfx_slap(7), G("senter.slap"), gain=1.0)
    add(sfx, sfx_glass(), G("senter.crack"), gain=0.8)
    # pagi: snoring, morning birds, the silent swarm, the loud one asleep
    add(sfx, sfx_snore(4.5), G("pagi.sleep"), gain=0.55)
    add(sfx, g.amb_birds(max(1.0, total - S["pagi"] - 0.2), 21) * 0.4, S["pagi"] + 1.0, gain=0.5)
    add(sfx, r.sfx_ting(1318.5, 1.2), G("pagi.bentol"), gain=0.2)
    add(sfx, sfx_snore(3.5, 9), G("pagi.window"), gain=0.35)
    # kelambu: the net, and the same whine as the opening
    add(sfx, r.sfx_swoosh(0.5, 9), G("kelambu.net"), gain=0.3)
    add(sfx, sfx_mosquito(2.6, 1, 560), G("kelambu.nging") - 0.1, gain=0.55)
    add(sfx, sfx_boing(0.6), G("kelambu.card"), gain=0.25)

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
    ap.add_argument("--out", default="nyamuk_master.mp3")
    a = ap.parse_args()
    build(a.voice, a.out)

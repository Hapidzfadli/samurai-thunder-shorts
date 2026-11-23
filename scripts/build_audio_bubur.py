"""Mix audio + jadwal adegan "Perang Dunia Gara-Gara Bubur Diaduk vs Tidak Diaduk!" (Kos Bu Tini Ep. 2).
Mengikuti arsitektur referensi "Kantor di Atas Awan" (build_audio_awan.py):
  - Suara : VoxCPM2 + Dodi 4-emosi + alignment kata Whisper (src/bubur_voice.json)
  - Mix   : Stereo, swoosh antar adegan, SFX pagi/bubur/duel anime tersinkron kata (EVENTS),
            musik komedi dinamis (E.music_bed) dengan suspense mute saat Bang Udin ketuk dandang,
            tawa ramai, ducking halus, dan mastering EBU R128 -14 LUFS.

Masukan : src/bubur_voice.json + out/voice/bubur/*.wav
Keluaran: public/audio/bubur_master.mp3 dan src/bubur_timing.json
"""
import importlib.util
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def _load_mod(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


E = _load_mod("emu_audio", "scripts/build_audio_emu.py")
K = _load_mod("kel_audio", "scripts/build_audio_kelompok.py")
AWAN = _load_mod("awan_audio", "scripts/build_audio_awan.py")
SBY = _load_mod("sby_audio", "scripts/build_audio_sby.py")

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "bubur_voice.json"
TIMING_JSON = ROOT / "src" / "bubur_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "bubur_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.38, post=0.55, gaps=[0.0, 0.24]),
    "rapi": dict(pre=0.38, post=0.55, gaps=[0.0, 0.25]),
    "aduk": dict(pre=0.35, post=0.60, gaps=[0.0, 0.26]),
    "kubu": dict(pre=0.35, post=0.60, gaps=[0.0, 0.26]),
    "duel": dict(pre=0.35, post=0.65, gaps=[0.0, 0.28]),
    "udin": dict(pre=0.38, post=0.72, gaps=[0.0, 0.32]),
    "bon": dict(pre=0.38, post=0.75, gaps=[0.0, 0.30]),
    "ending": dict(pre=0.42, post=1.55, gaps=[0.0, 0.32]),
}

EVENTS = {
    "hook.bubur": ("hook", 0, "bubur", -2),
    "hook.tusuk": ("hook", 1, "tusukan", -2),
    "hook.perang": ("hook", 1, "perang", -2),
    "rapi.seni": ("rapi", 0, "seni", -2),
    "rapi.kerupuk": ("rapi", 1, "kerupuk", -2),
    "rapi.elegan": ("rapi", 1, "elegan", -2),
    "aduk.tancap": ("aduk", 0, "menancapkan", -3),
    "aduk.mengaduk": ("aduk", 0, "mengaduk", -3),
    "aduk.pusaran": ("aduk", 1, "pusaran", -2),
    "aduk.melotot": ("aduk", 1, "melotot", -2),
    "kubu.semen": ("kubu", 0, "semen", -2),
    "kubu.tini": ("kubu", 1, "tini", -2),
    "kubu.nisa": ("kubu", 1, "nisa", -2),
    "kubu.dedi": ("kubu", 1, "dedi", -2),
    "duel.sendok": ("duel", 0, "sendok", -3),
    "duel.petir": ("duel", 0, "petir", -3),
    "duel.kerupuk": ("duel", 1, "kerupuk", -2),
    "duel.dedi": ("duel", 1, "dedi", -2),
    "udin.ketuk": ("udin", 0, "mengetuk", -3),
    "udin.buku": ("udin", 1, "buku", -3),
    "bon.utang": ("bon", 0, "utang", -2),
    "bon.kantong": ("bon", 1, "kantong", -2),
    "bon.tertawa": ("bon", 1, "tertawa", -2),
    "ending.makan": ("ending", 0, "makan", -2),
    "ending.komentar": ("ending", 1, "komentar", -2),
}

HIGHLIGHTS = {
    "pagi", "bubur", "sendok", "perang", "indonesia", "tidak", "diaduk",
    "seni", "kerupuk", "elegan", "licik", "pusaran", "kecap", "melotot",
    "semen", "proyek", "terbelah", "tini", "nisa", "dedi", "petir",
    "menyambar", "melayang", "udin", "dandang", "buku", "keramat", "utang",
    "lunas", "kosong", "tertawa", "damai", "komentar", "besok",
}

LINE_IDS = {
    "hook": ["h1", "h2"],
    "rapi": ["r1", "r2"],
    "aduk": ["a1", "a2"],
    "kubu": ["k1", "k2"],
    "duel": ["d1", "d2"],
    "udin": ["u1", "u2"],
    "bon": ["b1", "b2"],
    "ending": ["e1", "e2"],
}


def sfx_morning_birds(dur=8.0, seed=10):
    """Kicau burung gereja pagi + angin sejuk jalanan kosan Indonesia."""
    rng = np.random.default_rng(seed)
    n = int(SR * dur)
    out = E.sfx_wind(dur, seed + 1)[:n] * 0.22
    t_cur = 0.35
    while t_cur < dur - 0.5:
        n_chirps = int(rng.integers(2, 4))
        for k in range(n_chirps):
            cd = float(rng.uniform(0.08, 0.14))
            cn = int(SR * cd)
            ct = np.arange(cn) / SR
            f0 = float(rng.uniform(3100, 4400))
            f1 = f0 + float(rng.uniform(-750, 900))
            freq = f0 + (f1 - f0) * (ct / cd) + 220 * np.sin(2 * np.pi * 24 * ct)
            chirp = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.sin(np.pi * ct / cd) ** 1.4
            j = int((t_cur + k * 0.17) * SR)
            if j + cn < n:
                out[j : j + cn] += chirp.astype(np.float32) * float(rng.uniform(0.18, 0.34))
        t_cur += float(rng.uniform(1.1, 2.3))
    return norm(out, 0.45)


def sfx_bowl_clink(seed=20):
    """Bunyi mangkok keramik ayam jago + sendok menyentuh pinggir mangkok."""
    n = int(SR * 0.42)
    t = np.arange(n) / SR
    x = (
        np.sin(2 * np.pi * 1680 * t) * np.exp(-t * 18) * 0.55
        + np.sin(2 * np.pi * 2890 * t) * np.exp(-t * 24) * 0.45
        + np.sin(2 * np.pi * 4320 * t) * np.exp(-t * 32) * 0.25
        + bp(nz(n, seed), 900, 3500) * np.exp(-t * 45) * 0.35
    )
    return norm(x.astype(np.float32), 0.78)


def sfx_kerupuk_crunch(seed=30):
    """Bunyi KRESSS renyah kerupuk putih khas warung bubur."""
    n = int(SR * 0.38)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    crackle = bp(nz(n, seed), 1800, 8800)
    bursts = np.zeros(n, np.float32)
    for pos_s, amp in [(0.02, 1.0), (0.09, 0.85), (0.16, 0.72), (0.24, 0.5)]:
        env = np.exp(-((t - pos_s) / 0.028) ** 2)
        bursts += env.astype(np.float32) * amp
    x = crackle * bursts * (0.7 + 0.3 * rng.random(n))
    return norm(x.astype(np.float32), 0.82)


def sfx_stir_furious(dur=2.4, seed=40):
    """Bunyi aduk bubur brutal: gesekan sendok cepat + pusaran bubur kental!"""
    n = int(SR * dur)
    t = np.arange(n) / SR
    rate = 5.4
    swirl = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t)
    wet = bp(nz(n, seed), 320, 1450) * (0.45 + 0.55 * swirl)
    scrape = bp(nz(n, seed + 1), 1900, 4800) * (swirl ** 2.4) * 0.75
    clinks = np.zeros(n, np.float32)
    for k in range(int(dur * rate)):
        j = int((k / rate + 0.05) * SR)
        cl = sfx_bowl_clink(seed + k)[: int(SR * 0.14)]
        if j + len(cl) < n:
            clinks[j : j + len(cl)] += cl * 0.52
    env = np.minimum(1, t / 0.12) * np.minimum(1, (dur - t) / 0.22)
    return norm(((wet * 0.72 + scrape * 0.55 + clinks * 0.65) * env).astype(np.float32), 0.84)


def sfx_spoon_clash(seed=50):
    """TINGGG!! Adu sendok raksasa ala pedang anime + impact shockwave!"""
    n = int(SR * 1.15)
    t = np.arange(n) / SR
    ring = (
        np.sin(2 * np.pi * 1380 * t) * np.exp(-t * 4.2) * 0.55
        + np.sin(2 * np.pi * 2415 * t) * np.exp(-t * 5.8) * 0.45
        + np.sin(2 * np.pi * 3890 * t) * np.exp(-t * 8.0) * 0.35
        + np.sin(2 * np.pi * 5620 * t) * np.exp(-t * 11.0) * 0.25
    )
    impact = E.sfx_thump(seed, 82)
    hit = bp(nz(n, seed + 1), 1500, 8200) * np.exp(-t * 32) * 0.9
    out = (ring + hit).astype(np.float32)
    m = min(len(out), len(impact))
    out[:m] += impact[:m] * 0.95
    return norm(out, 0.95)


def sfx_thunder_crack(dur=1.45, seed=60):
    """Sambaran petir anime tajam + guntur menggelegar!"""
    n = int(SR * dur)
    t = np.arange(n) / SR
    crack = bp(nz(n, seed), 1200, 7800) * np.exp(-t * 14.0) * 1.1
    rumble = lp(nz(n, seed + 2), 260) * np.minimum(1, t / 0.05) * np.exp(-t * 2.1) * 1.3
    sub = np.sin(2 * np.pi * (62 - 22 * np.clip(t / dur, 0, 1)) * t) * np.exp(-t * 2.8) * 0.75
    return norm((crack + rumble + sub).astype(np.float32), 0.94)


def sfx_ladle_clang(seed=70):
    """TENG!! Centong besi Bang Udin mengetuk dandang bubur — bikin semua membeku!"""
    n = int(SR * 1.35)
    t = np.arange(n) / SR
    # Rich hollow stainless pot metallic clang harmonics
    bell = (
        np.sin(2 * np.pi * 520 * t) * np.exp(-t * 2.6) * 0.75
        + np.sin(2 * np.pi * 895 * t) * np.exp(-t * 3.8) * 0.55
        + np.sin(2 * np.pi * 1510 * t) * np.exp(-t * 5.2) * 0.40
        + np.sin(2 * np.pi * 2460 * t) * np.exp(-t * 7.5) * 0.25
        + bp(nz(n, seed), 1200, 5600) * np.exp(-t * 38) * 0.65
    )
    return norm(bell.astype(np.float32), 0.95)


def build_captions(words_global: list[dict]) -> list[dict]:
    cues = []
    i = 0
    while i < len(words_global):
        w1 = words_global[i]
        if (
            i + 1 < len(words_global)
            and words_global[i + 1]["from"] - w1["to"] <= 6
            and len(w1["w"]) + len(words_global[i + 1]["w"]) <= 12
            and not w1["w"].endswith((".", "!", "?", ","))
        ):
            w2 = words_global[i + 1]
            txt = f"{w1['w']} {w2['w']}"
            sf, ef = w1["from"], max(w1["from"] + 2, w2["to"])
            i += 2
        else:
            txt = w1["w"]
            sf, ef = w1["from"], max(w1["from"] + 2, w1["to"])
            i += 1
        clean = txt.lower().strip(".,?!;:\"'")
        is_hl = any(hw in clean for hw in HIGHLIGHTS)
        cues.append({"text": txt, "startFrame": sf, "endFrame": ef, "highlight": is_hl})
    return cues


def main():
    V = json.loads(VOICE_JSON.read_text())
    order = [s["scene"] for s in V["scenes"]]
    scenes_meta = {}
    lines_by_id = {}
    lines_by_scene = {}
    all_words_global = []
    clips = []
    cur = 0.0

    for sc in V["scenes"]:
        name = sc["scene"]
        cfg = SCENE_CFG[name]
        start = cur
        t = cfg["pre"]
        sc_lines = []
        ids = LINE_IDS[name]
        for i, ln in enumerate(sc["lines"]):
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.26
            y = E.load_wav(ROOT / ln["file"])
            d = len(y) / SR
            aligned = E.align_script(ln["text"], ln["wordsSec"], d)
            words_local = [
                {"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))}
                for w, a, b in aligned
            ]
            words_glob = [
                {"w": w, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))}
                for w, a, b in aligned
            ]
            all_words_global.extend(words_glob)
            entry = {
                "scene": name,
                "emotion": ln["style"],
                "text": ln["text"],
                "startSec": round(start + t, 3),
                "endSec": round(start + t + d, 3),
                "from": int(round(t * FPS)),
                "to": int(round((t + d) * FPS)),
                "globalFrom": int(round((start + t) * FPS)),
                "globalTo": int(round((start + t + d) * FPS)),
                "words": words_local,
            }
            sc_lines.append(entry)
            if i < len(ids):
                lines_by_id[ids[i]] = {k: v for k, v in entry.items() if k != "words"}
            clips.append((start + t, y))
            t += d
        t += cfg["post"]
        dur_f = int(round(t * FPS))
        start_f = int(round(start * FPS))
        end_s = start + dur_f / FPS
        scenes_meta[name] = {
            "startSec": round(start, 3),
            "endSec": round(end_s, 3),
            "startFrame": start_f,
            "durationInFrames": dur_f,
        }
        lines_by_scene[name] = sc_lines
        cur = end_s

    total = cur
    total_frames = int(round(total * FPS))

    def ev_frame(scene, li, word, off):
        ln = lines_by_scene[scene][li]
        if word == "START":
            return max(0, ln["from"] + off)
        if word == "END":
            return max(0, ln["to"] + off)
        key = E.norm_word(word)
        for w in ln["words"]:
            if E.norm_word(w["w"]).startswith(key):
                return max(0, w["from"] + off)
        print(f"  ! kata '{word}' tidak ditemukan di {scene}[{li}]")
        return max(0, ln["from"] + off)

    events_local = {ev_name: ev_frame(sc, li, w, off) for ev_name, (sc, li, w, off) in EVENTS.items()}
    captions = build_captions(all_words_global)
    timing = {
        "fps": FPS,
        "totalDurationSec": round(total, 3),
        "totalFrames": total_frames,
        "order": order,
        "scenes": scenes_meta,
        "lines": lines_by_id,
        "events": events_local,
        "captions": captions,
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=2, ensure_ascii=False))

    S = {k: v["startFrame"] / FPS for k, v in scenes_meta.items()}
    END = {k: S[k] + v["durationInFrames"] / FPS for k, v in scenes_meta.items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in events_local.items()}

    print(f"Total {total:.2f}s ({total_frames} frames)")
    for k in order:
        print(f"  {k:10s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    T_LAUGH = ROOT / "exports" / "riset" / "tawa"

    for t0, y in clips:
        put(vo, y, t0, 1.0)

    # Transisi swoosh bersih antar semua adegan (khas Kantor di Atas Awan)
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.36, abs(hash(k)) % 50 + 7), max(0.0, S[k] - 0.18), 0.28)

    # 1. HOOK — Pagi Cerah Depan Kos Bu Tini -> Tusukan Sendok Memicu Perang!
    put(sfx, sfx_morning_birds(END["hook"] - S["hook"], 11), S["hook"], 0.34)
    put(sfx, sfx_bowl_clink(12), EV["hook.bubur"], 0.55, -0.2)
    put(sfx, sfx_bowl_clink(13), EV["hook.bubur"] + 0.35, 0.52, 0.25)
    put(sfx, sfx_spoon_clash(14), EV["hook.tusuk"] + 0.04, 0.72)
    put(sfx, sfx_thunder_crack(1.1, 15), EV["hook.perang"] + 0.02, 0.62)

    # 2. RAPI — Riko Ketua Tim Tidak Diaduk (Karya Seni + Sparkle + Kerupuk)
    put(sfx, sfx_morning_birds(END["rapi"] - S["rapi"], 21), S["rapi"], 0.26)
    put(sfx, E.sfx_tinkle(8, 22), EV["rapi.seni"] - 0.05, 0.44)
    put(sfx, sfx_kerupuk_crunch(23), EV["rapi.kerupuk"] + 0.06, 0.55, 0.2)
    put(sfx, E.sfx_tinkle(6, 24), EV["rapi.elegan"] + 0.05, 0.38, -0.15)

    # 3. ADUK — Bagas Menyeringai Licik, Tancap Sendok, Aduk Brutal -> Riko Melotot!
    put(sfx, sfx_bowl_clink(31), EV["aduk.tancap"] + 0.02, 0.78, 0.2)
    put(sfx, sfx_stir_furious(2.5, 32), EV["aduk.mengaduk"] - 0.05, 0.72, 0.15)
    put(sfx, E.sfx_whiz(33), EV["aduk.pusaran"], 0.45)
    put(sfx, E.sfx_boing(310, 0.40), EV["aduk.melotot"] + 0.04, 0.58, -0.3)
    put(sfx, E.sfx_thump(34, 68), EV["aduk.melotot"] + 0.06, 0.52)

    # 4. KUBU — Satu Kosan Terbelah Dua (Bu Tini vs Mbak Nisa, Mas Dedi Panik!)
    put(sfx, K.sfx_room(END["kubu"] - S["kubu"], 41, murmur=True), S["kubu"], 0.24)
    put(sfx, E.sfx_slam(42), EV["kubu.semen"] + 0.05, 0.65, -0.3)
    put(sfx, AWAN.sfx_steps(4, 0.18, 43), EV["kubu.tini"] - 0.25, 0.42, -0.45)
    put(sfx, E.sfx_pop(640) if hasattr(E, "sfx_pop") else K.sfx_pop(640), EV["kubu.tini"] + 0.05, 0.45, -0.4)
    put(sfx, K.sfx_pop(780), EV["kubu.nisa"] + 0.05, 0.45, 0.4)
    put(sfx, E.sfx_boing(420, 0.34), EV["kubu.dedi"] + 0.08, 0.44, 0.0)

    # 5. DUEL — Matrix Bullet-Time Anime Duel Sendok + Petir + Hujan Kerupuk!
    put(sfx, E.sfx_wind(END["duel"] - S["duel"], 51), S["duel"], 0.36)
    put(sfx, E.sfx_swoosh(0.42, 52), EV["duel.sendok"] - 0.22, 0.68, -0.35)
    put(sfx, sfx_spoon_clash(53), EV["duel.sendok"] + 0.04, 0.94)
    put(sfx, sfx_thunder_crack(1.5, 54), EV["duel.petir"] - 0.04, 0.92)
    put(sfx, SBY.boom(55, 1.05), EV["duel.petir"] + 0.04, 0.78)
    put(sfx, sfx_kerupuk_crunch(56), EV["duel.kerupuk"] + 0.05, 0.72, -0.25)
    put(sfx, sfx_kerupuk_crunch(57), EV["duel.kerupuk"] + 0.38, 0.66, 0.30)
    put(sfx, E.sfx_boing(270, 0.36), EV["duel.dedi"] + 0.10, 0.48)

    # 6. UDIN — TENG! Centong Dandang Membekukan Semua + Buku Biru Keramat!
    put(sfx, sfx_ladle_clang(61), EV["udin.ketuk"] + 0.02, 0.96, 0.15)
    put(sfx, E.sfx_paper(62), EV["udin.buku"] - 0.06, 0.72, 0.0)
    put(sfx, E.sfx_thump(63, 58), EV["udin.buku"] + 0.12, 0.74)

    # 7. BON — Twist Utang Bubur Belum Lunas -> Kantong Kosong + Tawa Satu Kosan!
    put(sfx, AWAN.sfx_kaching(), EV["bon.utang"] + 0.02, 0.56)
    put(sfx, E.sfx_wahwah(), EV["bon.kantong"] + 0.08, 0.44)
    if (T_LAUGH / "tawa_istana_ramai.mp3").exists():
        put(
            vo,
            norm(E.load_mp3(T_LAUGH / "tawa_istana_ramai.mp3", 1.08), 0.28)[: int(SR * 2.1)],
            EV["bon.tertawa"] + 0.15,
            0.40,
            0.1,
        )

    # 8. ENDING — Damai Makan Bersama + CTA Vote Komentar!
    put(sfx, sfx_morning_birds(END["ending"] - S["ending"], 81), S["ending"], 0.30)
    put(sfx, sfx_bowl_clink(82), EV["ending.makan"] + 0.10, 0.46, -0.2)
    put(sfx, K.sfx_gulp(), EV["ending.makan"] + 0.45, 0.42, 0.2)
    put(sfx, E.sfx_fanfare(), EV["ending.komentar"] + 0.25, 0.34)

    # Musik latar komedi playful gaya Kantor di Atas Awan (mute dramatis pas Bang Udin ketuk dandang!)
    base = {
        "hook": 0.72,
        "rapi": 0.62,
        "aduk": 0.78,
        "kubu": 0.84,
        "duel": 0.90,
        "udin": 0.0,
        "bon": 0.72,
        "ending": 0.84,
    }
    ip_t, ip_v = [0.0], [0.35]
    for k in order:
        ip_t += [S[k] + 0.1, END[k] - 0.1]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mutes = [(EV["udin.ketuk"] - 0.04, EV["bon.utang"] + 0.35)]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    # Ducking & mastering identik Kantor di Atas Awan (build_audio_awan.py)
    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = (
        mus[:N] * 0.54 * (1.0 / (1.0 + 7.0 * env))[:, None]
        + sfx * (1.0 / (1.0 + 1.2 * env))[:, None]
        + vo * 1.15
    )
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.08) * np.clip((total - tt) / 0.8, 0.0, 1.0))[:, None]
    master = np.tanh(master / (np.max(np.abs(master)) + 1e-6) * 1.5) / np.tanh(1.5) * 0.92
    master = master[: int(SR * total)]

    wav = OUT_MP3.with_suffix(".wav")
    OUT_MP3.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(master, -1.0, 1.0) * 32767).astype(np.int16).tobytes())
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(wav),
            "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
            "-ar", "44100", "-b:a", "192k",
            str(OUT_MP3),
        ],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(f"Selesai: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()

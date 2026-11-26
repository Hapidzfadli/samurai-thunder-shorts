"""Mix audio + jadwal adegan "Rudal Merpati 1944 (Project Pigeon)" (dialog Dodi <-> Ara + narasi singkat).

Pola: build_audio_kelelawar.py (SCENE_CFG + EVENTS + caption 1-2 kata), musik mars komedi dari
build_audio_emu.music_bed, SFX dari emu/kelompok/awan/sby/horor + SFX khusus merpati, jagung, kereta, radar & vertigo.

Masukan : src/merpati_voice.json + out/voice/merpati/*.wav
Keluaran: public/audio/merpati_master.mp3 dan src/merpati_timing.json
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
SBY = _load_mod("sby_audio", "scripts/build_audio_sby.py")
AWAN = _load_mod("awan_audio", "scripts/build_audio_awan.py")
HOR = _load_mod("horor_audio", "scripts/build_audio_horor.py")

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "merpati_voice.json"
TIMING_JSON = ROOT / "src" / "merpati_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "merpati_master.mp3"

# Jeda dialog rapat & ritmis untuk koreografi kamera @RicksClips3000 (~56 camera beats/menit)
SCENE_CFG = {
    "hook":   dict(pre=0.45, post=0.55, gaps=[0.0, 0.38]),
    "kereta": dict(pre=0.40, post=0.60, gaps=[0.0]),
    "lab":    dict(pre=0.32, post=0.50, gaps=[0.0, 0.20, 0.24]),
    "voting": dict(pre=0.32, post=0.55, gaps=[0.0, 0.22, 0.20]),
    "uji":    dict(pre=0.38, post=0.42, gaps=[0.0, 0.28, 0.16]),
    "tumpah": dict(pre=0.55, post=0.48, gaps=[0.0, 0.20]),
    "serbu":  dict(pre=0.32, post=1.35, gaps=[0.0, 0.22]),
    "akhir":  dict(pre=0.45, post=1.40, gaps=[0.0, 0.28, 0.42]),
}

# (adegan, indeks baris, kata pemicu, offset frame)
EVENTS = {
    "hook.moncong":   ("hook", 0, "moncong", -2),
    "hook.merpati":   ("hook", 1, "merpati", -3),
    "ker.kawanan":    ("kereta", 0, "kawanan", -2),
    "ker.kereta":     ("kereta", 0, "kereta", -2),
    "ker.loteng":     ("kereta", 0, "loteng", -2),
    "lab.kapal":      ("lab", 0, "kapal", -2),
    "lab.sepuluh":    ("lab", 0, "sepuluh", -2),
    "lab.gajinya":    ("lab", 1, "gajinya", -2),
    "lab.jagung":     ("lab", 2, "jagung", -3),
    "lab.cuti":       ("lab", 2, "cuti", -2),
    "vot.ngantuk":    ("voting", 0, "ngantuk", -2),
    "vot.tiga":       ("voting", 1, "tiga", -2),
    "vot.suara":      ("voting", 1, "suara", -2),
    "vot.dua":        ("voting", 2, "dua", -2),
    "vot.meleng":     ("voting", 2, "meleng", -2),
    "vot.terbanyak":  ("voting", 2, "terbanyak", -2),
    "uji.jenderal":   ("uji", 0, "jenderal", -2),
    "uji.sarapan":    ("uji", 1, "sarapan", -2),
    "uji.jagung":     ("uji", 1, "jagung", -2),
    "uji.hus":        ("uji", 2, "START", -1),
    "uji.simpan":     ("uji", 2, "simpan", -2),
    "tum.tumpah":     ("tumpah", 0, "tumpah", -2),
    "tum.truk":       ("tumpah", 0, "truk", -2),
    "tum.lensanya":   ("tumpah", 1, "lensanya", -2),
    "tum.jagung":     ("tumpah", 1, "jagung", -2),
    "ser.tiga":       ("serbu", 0, "tiga", -2),
    "ser.panci":      ("serbu", 0, "panci", -2),
    "ser.jangan":     ("serbu", 1, "START", 0),
    "ser.jenderal":   ("serbu", 1, "jenderal", -3),
    "akh.dibatalkan": ("akhir", 0, "dibatalkan", -2),
    "akh.radar":      ("akhir", 0, "radar", -2),
    "akh.nobel":      ("akhir", 1, "nobel", -2),
    "akh.iya":        ("akhir", 2, "START", 0),
    "akh.mereka":     ("akhir", 2, "mereka", -3),
}

HIGHLIGHTS = {
    "merpati", "merpatinya", "moncong", "peluru", "kendali", "kawanan", "sepuluh", "ribu",
    "jagung", "jagungnya", "cuti", "tiga", "suara", "terbanyak", "jenderal", "tumpah",
    "lensanya", "kosong", "panci", "jangan", "dibatalkan", "radar", "nobel", "mereka",
}


# ------------------------------------------------------------------ SFX khusus Merpati
def sfx_peck_single(seed=1, f0=1450.0):
    """Patukan paruh merpati di kaca layar: 'TOK!' tajam beresonansi."""
    n = int(SR * 0.065)
    t = np.arange(n) / SR
    click = bp(nz(n, seed), 900, 4200) * np.exp(-t * 95)
    body = np.sin(2 * np.pi * f0 * t * (1 - 0.25 * t / 0.065)) * np.exp(-t * 58)
    return norm((0.65 * click + 0.75 * body).astype(np.float32), 0.75)


def sfx_pecks(count=3, interval=0.11, seed=10):
    dur = count * interval + 0.12
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    for i in range(count):
        p = sfx_peck_single(seed + i, float(rng.uniform(1280, 1720))) * float(rng.uniform(0.75, 1.0))
        s = int((i * interval + rng.uniform(-0.01, 0.01)) * SR)
        s = max(0, s)
        out[s : s + len(p)] += p[: max(0, n - s)]
    return norm(out, 0.75)


def sfx_coo(seed=20, dur=0.42):
    """Dekuran khas merpati 'krrr-ruuu' lembut dengan vibrato 28 Hz."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    base = rng.uniform(440, 520)
    f = base * (1.08 - 0.22 * (t / dur)) + 18.0 * np.sin(2 * np.pi * 29.0 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.3 * (0.68 + 0.32 * np.sin(2 * np.pi * 29.0 * t))
    x = (np.sin(ph) + 0.22 * np.sin(2 * ph)) * env
    return norm(lp(x.astype(np.float32), 1400), 0.55)


def sfx_coo_flock(dur=1.4, count=5, seed=30):
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    for i in range(count):
        c = sfx_coo(seed + i, float(rng.uniform(0.30, 0.46))) * float(rng.uniform(0.5, 1.0))
        s = int(rng.uniform(0, max(0.01, dur - 0.48)) * SR)
        out[s : s + len(c)] += c[: max(0, n - s)]
    return norm(out, 0.6)


def sfx_train_chug(dur=3.0, seed=40):
    """Ritme roda rel kereta 1940-an 'chug-chug-clack-clack'."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    step = 0.24
    for i in range(int(dur / step)):
        s = int(i * step * SR)
        ln = min(int(0.14 * SR), n - s)
        if ln <= 0:
            break
        tt = np.arange(ln) / SR
        puff = bp(nz(ln, seed + i), 180, 1400) * np.exp(-tt * 16) * (0.9 if i % 4 in (0, 1) else 0.55)
        clack = E.sfx_tik(1150 + (i % 2) * 260, seed + 100 + i, 0.022) * (0.55 if i % 2 == 0 else 0.35)
        out[s : s + ln] += puff
        out[s : s + min(len(clack), ln)] += clack[: min(len(clack), ln)]
    return norm(out, 0.48)


def sfx_bag_rip(seed=50):
    """Kantong kertas jagung robek 'KRETEK-SRAAK!'."""
    n = int(SR * 0.36)
    t = np.arange(n) / SR
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 46 * t)
    x = bp(nz(n, seed), 1100, 6500) * mod * np.exp(-t * 5.2) * np.minimum(1.0, t / 0.015)
    return norm(x.astype(np.float32), 0.72)


def sfx_corn_spill(dur=0.95, seed=60):
    """Puluhan biji jagung berjatuhan memantul di tanah & kaleng."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    for i in range(34):
        s = int((rng.beta(1.3, 3.2) * (dur - 0.06)) * SR)
        grain = E.sfx_tik(float(rng.uniform(1900, 3600)), seed + i, 0.018) * float(rng.uniform(0.35, 0.95))
        out[s : s + len(grain)] += grain[: max(0, n - s)]
    return norm(out, 0.65)


def sfx_pot_crash(seed=70):
    """Panci kantin jenderal berdentang diserbu merpati."""
    n = int(SR * 0.85)
    t = np.arange(n) / SR
    clang = (
        np.sin(2 * np.pi * 585 * t) * np.exp(-t * 5.5)
        + 0.7 * np.sin(2 * np.pi * 872 * t) * np.exp(-t * 7.0)
        + 0.5 * np.sin(2 * np.pi * 1318 * t) * np.exp(-t * 9.5)
    )
    hit = bp(nz(n, seed), 500, 5000) * np.exp(-t * 18.0)
    return norm((0.65 * clang + 0.55 * hit).astype(np.float32), 0.8)


def sfx_vertigo_sting():
    """Efek Vertigo Dolly-Zoom ala @RicksClips3000: glissando tegang + brass rendah."""
    n = int(SR * 1.15)
    t = np.arange(n) / SR
    f1 = 220.0 * (1.0 + 0.42 * (t / 1.15))
    f2 = 440.0 * (1.0 - 0.28 * (t / 1.15))
    p1 = 2 * np.pi * np.cumsum(f1) / SR
    p2 = 2 * np.pi * np.cumsum(f2) / SR
    env = np.minimum(1.0, t / 0.05) * np.exp(-t * 1.6)
    x = (0.65 * np.sin(p1) + 0.45 * np.sin(p2) + 0.35 * np.sin(2 * np.pi * 110 * t)) * env
    return norm(lp(x.astype(np.float32), 2400), 0.75)


def sfx_radar_ping(count=3, interval=0.58):
    """Ping layar radar CRT hijau 1944."""
    dur = count * interval + 0.25
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    for i in range(count):
        s = int(i * interval * SR)
        ln = min(int(0.24 * SR), n - s)
        tt = np.arange(ln) / SR
        ping = np.sin(2 * np.pi * 1320 * tt) * np.exp(-tt * 14.0)
        out[s : s + ln] += ping.astype(np.float32)
    return norm(out, 0.50)


def sfx_ding():
    n = int(SR * 0.85)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2349 * t)) * np.exp(-t * 4.5)
    return norm(x.astype(np.float32), 0.6)


def sfx_sting_low():
    n = int(SR * 1.8)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 55 * t * (1 - 0.15 * t)) * np.exp(-t * 2.3) + 0.4 * np.sin(2 * np.pi * 110 * t) * np.exp(-t * 3.2)
    x += 0.28 * bp(nz(n, 99), 80, 600) * np.exp(-t * 6)
    return norm(x.astype(np.float32), 0.82)


# ------------------------------------------------------------------ caption 1-2 kata
def build_captions(words_global: list[dict]) -> list[dict]:
    cues = []
    i = 0
    while i < len(words_global):
        w1 = words_global[i]
        if (
            i + 1 < len(words_global)
            and words_global[i + 1]["from"] - w1["to"] <= 6
            and len(w1["w"]) + len(words_global[i + 1]["w"]) <= 11
            and not w1["w"].endswith((".", "!", "?", ","))
            and words_global[i + 1]["voice"] == w1["voice"]
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
        cues.append({
            "text": txt,
            "startFrame": sf,
            "endFrame": ef,
            "highlight": any(hw in clean.split() or hw == clean for hw in HIGHLIGHTS),
            "voice": w1["voice"],
        })
    for a, b in zip(cues, cues[1:]):
        if b["startFrame"] - a["endFrame"] <= 8:
            a["endFrame"] = b["startFrame"]
    return cues


def main():
    V = json.loads(VOICE_JSON.read_text())
    order = [s["scene"] for s in V["scenes"]]
    scenes_meta, lines_by_scene = {}, {}
    all_words_global, clips = [], []
    cur = 0.0

    for sc in V["scenes"]:
        name = sc["scene"]
        cfg = SCENE_CFG[name]
        start = cur
        t = cfg["pre"]
        sc_lines = []
        for i, ln in enumerate(sc["lines"]):
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.24
            y = E.load_wav(ROOT / ln["file"])
            d = len(y) / SR
            aligned = E.align_script(ln["text"], ln["wordsSec"], d)
            voice = ln.get("voice", "dodi")
            words_local = [{"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))} for w, a, b in aligned]
            all_words_global.extend(
                {"w": w, "voice": voice, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))}
                for w, a, b in aligned
            )
            sc_lines.append({
                "voice": voice,
                "style": ln["style"],
                "text": ln["text"],
                "from": int(round(t * FPS)),
                "to": int(round((t + d) * FPS)),
                "words": words_local,
            })
            clips.append((start + t, y, voice))
            t += d
        t += cfg["post"]
        dur_f = int(round(t * FPS))
        scenes_meta[name] = {"startFrame": int(round(start * FPS)), "durationInFrames": dur_f}
        lines_by_scene[name] = sc_lines
        cur = start + dur_f / FPS

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
        print(f"  ! kata '{word}' tidak ditemukan di {scene}[{li}]: {ln['text']}")
        return max(0, ln["from"] + off)

    events_local = {k: ev_frame(*v) for k, v in EVENTS.items()}
    timing = {
        "fps": FPS,
        "totalDurationSec": round(total, 3),
        "totalFrames": total_frames,
        "order": order,
        "scenes": scenes_meta,
        "lines": lines_by_scene,
        "events": events_local,
        "captions": build_captions(all_words_global),
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=1, ensure_ascii=False))

    S = {k: v["startFrame"] / FPS for k, v in scenes_meta.items()}
    END = {k: S[k] + v["durationInFrames"] / FPS for k, v in scenes_meta.items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in events_local.items()}
    print(f"Total {total:.2f}s ({total_frames} frames)")
    for k in order:
        print(f"  {k:8s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    for t0, y, voice in clips:
        put(vo, y, t0, 1.0, -0.12 if voice == "dodi" else 0.12)

    # Transisi swoosh tajam antar adegan + whip-pan kamera
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.32, abs(hash(k)) % 50 + 1), max(0.0, S[k] - 0.18), 0.26)

    # 1 HOOK: luncuran angin bom Pelican + snap-zoom patukan kaca + dekuran + judul jatuh
    put(sfx, E.sfx_wind(END["hook"] - S["hook"], 3), S["hook"], 0.18)
    put(sfx, E.sfx_whiz(12), S["hook"] + 0.15, 0.26, -0.2)
    put(sfx, E.sfx_swoosh(0.22, 14), EV["hook.moncong"], 0.34)
    put(sfx, sfx_pecks(3, 0.10, 15), EV["hook.merpati"] - 0.28, 0.62, 0.08)
    put(sfx, sfx_coo(16, 0.38), EV["hook.merpati"] + 0.12, 0.52, 0.1)
    put(sfx, SBY.boom(2, 0.50), EV["hook.merpati"] + 0.42, 0.35)

    # 2 KERETA: rel kereta 1940-an + kepak kawanan merpati + bohlam ide 'ting!'
    put(sfx, sfx_train_chug(END["kereta"] - S["kereta"], 21), S["kereta"], 0.30, -0.15)
    put(sfx, AWAN.sfx_flutter(END["kereta"] - EV["ker.kawanan"] + 0.3), max(S["kereta"], EV["ker.kawanan"] - 0.2), 0.32, 0.2)
    put(sfx, sfx_coo_flock(1.6, 5, 23), EV["ker.kawanan"], 0.36, 0.2)
    put(sfx, sfx_ding(), END["kereta"] - 0.95, 0.48)

    # 3 LAB: suasana lab, patukan cepat 10.000x + klik penghitung, whip-pan Ara, insert biji jagung
    put(sfx, K.sfx_room(END["lab"] - S["lab"], 31, murmur=False), S["lab"], 0.16)
    put(sfx, sfx_pecks(8, 0.085, 32), EV["lab.kapal"] - 0.1, 0.48, -0.15)
    put(sfx, E.sfx_hud(2), EV["lab.sepuluh"] - 0.08, 0.32)
    put(sfx, E.sfx_swoosh(0.20, 33), EV["lab.gajinya"] - 0.35, 0.24, 0.15)
    put(sfx, K.sfx_pop(880), EV["lab.jagung"] - 0.12, 0.42)
    put(sfx, sfx_pecks(3, 0.09, 34), EV["lab.jagung"] + 0.18, 0.52)
    put(sfx, sfx_ding(), EV["lab.jagung"] + 0.45, 0.35)
    put(sfx, E.sfx_stamp(35), EV["lab.cuti"] + 0.12, 0.36)

    # 4 VOTING: X-Ray aktif, 3 merpati mematuk, 1 meleng boing, menang voting terbanyak
    put(sfx, E.sfx_xray(), EV["vot.tiga"] - 0.35, 0.38)
    put(sfx, sfx_pecks(5, 0.10, 41), EV["vot.dua"] - 0.05, 0.50, -0.15)
    put(sfx, E.sfx_boing(340, 0.28), EV["vot.meleng"], 0.38, 0.25)
    put(sfx, E.sfx_clack(42), EV["vot.terbanyak"] - 0.12, 0.42)
    put(sfx, E.sfx_stamp(43), EV["vot.terbanyak"] + 0.10, 0.52)

    # 5 UJI: angin lapangan uji, langkah Ara bawa kantong jagung, scratch panik Dodi
    put(sfx, E.sfx_wind(END["uji"] - S["uji"], 51), S["uji"], 0.16)
    put(sfx, AWAN.sfx_steps(3, 0.26, 52), EV["uji.sarapan"] - 0.35, 0.28, 0.2)
    put(sfx, sfx_corn_spill(0.35, 53), EV["uji.jagung"], 0.26, 0.2)
    put(sfx, HOR.sfx_record_scratch(54), EV["uji.hus"] - 0.08, 0.48)
    put(sfx, E.sfx_swoosh(0.20, 55), EV["uji.simpan"] - 0.08, 0.30, -0.15)

    # 6 TUMPAH: kantong kertas robek (SVG insert), jagung berhamburan, 3 lensa mengunci
    put(sfx, sfx_bag_rip(61), S["tumpah"] + 0.18, 0.58)
    put(sfx, sfx_corn_spill(1.05, 62), EV["tum.tumpah"] - 0.10, 0.62, 0.15)
    put(sfx, E.sfx_hud(3), EV["tum.lensanya"] - 0.08, 0.38)
    put(sfx, sfx_coo_flock(1.1, 4, 63), EV["tum.jagung"] - 0.05, 0.48)

    # 7 SERBU (KLIMAKS): ayunan rig membanting 3-0, lari Dodi, panci jenderal diserbu + Vertigo Sting!
    put(sfx, E.sfx_slam(71), EV["ser.tiga"] - 0.08, 0.55)
    put(sfx, sfx_pecks(7, 0.08, 72), EV["ser.tiga"] + 0.05, 0.52)
    put(sfx, AWAN.sfx_steps(6, 0.16, 73), EV["ser.jangan"], 0.42, -0.2)
    put(sfx, AWAN.sfx_flutter(1.8), EV["ser.panci"], 0.45, 0.25)
    put(sfx, sfx_coo_flock(1.8, 7, 74), EV["ser.panci"] + 0.1, 0.52, 0.25)
    put(sfx, sfx_pot_crash(75), EV["ser.jenderal"] - 0.10, 0.72, 0.25)
    put(sfx, sfx_vertigo_sting(), EV["ser.jenderal"] + 0.05, 0.65)
    put(sfx, E.sfx_stamp(76), EV["ser.jenderal"] + 0.35, 0.50)

    # 8 AKHIR: ping radar 1944, ting Ig Nobel, wah-wah pasrah, merpati mendarat di topi Dodi
    put(sfx, sfx_radar_ping(3, 0.55), EV["akh.radar"] - 0.20, 0.38, 0.2)
    put(sfx, E.sfx_stamp(81), EV["akh.dibatalkan"] + 0.08, 0.42)
    put(sfx, sfx_ding(), EV["akh.nobel"] + 0.05, 0.46, 0.15)
    put(sfx, E.sfx_wahwah(), EV["akh.iya"] + 0.05, 0.38)
    put(sfx, AWAN.sfx_flutter(0.65), EV["akh.mereka"] - 0.35, 0.36)
    put(sfx, sfx_coo(88, 0.45), EV["akh.mereka"] + 0.15, 0.58, -0.05)
    put(sfx, sfx_sting_low(), EV["akh.mereka"] + 0.05, 0.52)

    # Musik mars komedi: jeda hening di twist kantong jagung & penutup punchline
    ip_t = [0, S["kereta"], S["lab"], S["voting"], S["uji"], S["tumpah"], S["serbu"], EV["ser.jenderal"], S["akhir"], total]
    ip_v = [0.75, 0.55, 0.70, 0.72, 0.55, 0.78, 0.95, 1.00, 0.42, 0.30]
    mutes = [
        (EV["uji.hus"] - 0.12, EV["uji.hus"] + 0.75),
        (EV["akh.iya"] - 0.15, total),
    ]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = mus[:N] * 0.50 * (1.0 / (1.0 + 7.0 * env))[:, None] + sfx * (1.0 / (1.0 + 1.2 * env))[:, None] + vo * 1.15
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.08) * np.clip((total - tt) / 0.6, 0.0, 1.0))[:, None]
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
        ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", "44100", "-b:a", "192k", str(OUT_MP3)],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(f"Selesai: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()

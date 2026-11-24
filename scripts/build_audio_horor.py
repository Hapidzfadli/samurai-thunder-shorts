"""Mix audio + jadwal adegan "Niat Uji Nyali di Rumah Kosong, Malah Hantunya Curhat & Minta Gorengan!" (Kos Bu Tini Ep. 3).
Mengikuti arsitektur referensi "Kantor di Atas Awan" (build_audio_awan.py):
  - Suara : VoxCPM2 + Dodi 4-emosi + alignment kata Whisper (src/horor_voice.json)
  - Mix   : Stereo, swoosh antar adegan, SFX horor-ke-komedi tersinkron kata (EVENTS),
            musik komedi dinamis (E.music_bed) dengan suspense mute saat kemunculan hantu ->
            record scratch saat Bagas sodorkan gorengan, tawa ramai, ducking & loudnorm -14 LUFS.

Masukan : src/horor_voice.json + out/voice/horor/*.wav
Keluaran: public/audio/horor_master.mp3 dan src/horor_timing.json
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

VOICE_JSON = ROOT / "src" / "horor_voice.json"
TIMING_JSON = ROOT / "src" / "horor_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "horor_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.38, post=0.55, gaps=[0.0, 0.25]),
    "masuk": dict(pre=0.38, post=0.55, gaps=[0.0, 0.25]),
    "muncul": dict(pre=0.35, post=0.65, gaps=[0.0, 0.28]),
    "tawar": dict(pre=0.35, post=0.60, gaps=[0.0, 0.28]),
    "curhat": dict(pre=0.38, post=0.60, gaps=[0.0, 0.28]),
    "viral": dict(pre=0.35, post=0.65, gaps=[0.0, 0.28]),
    "foto": dict(pre=0.38, post=0.65, gaps=[0.0, 0.28]),
    "ending": dict(pre=0.40, post=1.55, gaps=[0.0, 0.30]),
}

EVENTS = {
    "hook.nyali": ("hook", 0, "nyali", -2),
    "hook.goreng": ("hook", 1, "goreng", -2),
    "masuk.senter": ("masuk", 0, "senter", -2),
    "masuk.berkedip": ("masuk", 1, "berkedip", -2),
    "masuk.beringin": ("masuk", 1, "beringin", -2),
    "muncul.pocong": ("muncul", 0, "pocong", -3),
    "muncul.kunti": ("muncul", 0, "kunti", -3),
    "muncul.membeku": ("muncul", 1, "membeku", -2),
    "tawar.gorengan": ("tawar", 0, "gorengan", -3),
    "tawar.kopi": ("tawar", 0, "kopi", -2),
    "tawar.berbinar": ("tawar", 1, "berbinar", -2),
    "curhat.kunti": ("curhat", 0, "kunti", -2),
    "curhat.pocong": ("curhat", 1, "pocong", -2),
    "curhat.melompat": ("curhat", 1, "melompat", -2),
    "viral.kaget": ("viral", 0, "kaget", -3),
    "viral.tertawa": ("viral", 1, "tertawa", -2),
    "foto.foto": ("foto", 0, "foto", -3),
    "foto.bakwan": ("foto", 1, "bakwan", -2),
    "ending.purnama": ("ending", 0, "purnama", -2),
    "ending.komentar": ("ending", 1, "komentar", -2),
}

HIGHLIGHTS = {
    "jumat", "malam", "uji", "nyali", "angker", "viral", "pisang", "goreng",
    "senter", "berkedip", "beringin", "pocong", "melompat", "kunti", "balkon",
    "membeku", "gorengan", "kopi", "berbinar", "curhat", "lembur", "pegal",
    "langsung", "tertawa", "foto", "bakwan", "rawit", "purnama", "komentar",
}

LINE_IDS = {
    "hook": ["h1", "h2"],
    "masuk": ["m1", "m2"],
    "muncul": ["u1", "u2"],
    "tawar": ["t1", "t2"],
    "curhat": ["c1", "c2"],
    "viral": ["v1", "v2"],
    "foto": ["f1", "f2"],
    "ending": ["e1", "e2"],
}


def sfx_owl_hoot(seed=11):
    """Suara burung hantu malam (huuu-huu!) atmosfer rumah kosong."""
    out = np.zeros(int(SR * 1.4), np.float32)
    for start_s, dur_s, f0, f1 in [(0.05, 0.34, 520, 440), (0.52, 0.62, 490, 380)]:
        n = int(SR * dur_s)
        t = np.arange(n) / SR
        freq = f0 + (f1 - f0) * (t / dur_s) + 12 * np.sin(2 * np.pi * 6.5 * t)
        hoot = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.sin(np.pi * t / dur_s) ** 1.3
        j = int(start_s * SR)
        out[j : j + n] += hoot.astype(np.float32)
    return norm(lp(out, 1400), 0.58)


def sfx_lamp_buzz(dur=0.85, seed=21):
    """Dengung & kedipan lampu teras tua."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 300 * t)) * 0.4
    zap = bp(nz(n, seed), 1800, 6800) * (np.sin(2 * np.pi * 19 * t) > 0.55).astype(np.float32)
    env = np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.08)
    return norm(((hum + zap * 1.2) * env).astype(np.float32), 0.72)


def sfx_ghost_appear(dur=1.55, seed=31):
    """Efek kemunculan hantu dramatis (eerie shimmering chord + wind sweep + deep boom)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    shimmer = (
        np.sin(2 * np.pi * (460 + 28 * np.sin(2 * np.pi * 5 * t)) * t) * 0.35
        + np.sin(2 * np.pi * (650 - 35 * np.sin(2 * np.pi * 4.2 * t)) * t) * 0.30
        + np.sin(2 * np.pi * (920 + 20 * np.cos(2 * np.pi * 6 * t)) * t) * 0.20
    ) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    whoosh = bp(nz(n, seed), 220, 2100) * np.minimum(1, t / 0.14) * np.exp(-t * 1.8)
    thump = E.sfx_thump(seed + 1, 56)
    out = (shimmer * 0.55 + whoosh * 0.95).astype(np.float32)
    m = min(len(out), len(thump))
    out[:m] += thump[:m] * 0.95
    return norm(out, 0.92)


def sfx_record_scratch(seed=41):
    """Comic record scratch memotong suasana seram pas Bagas sodorkan pisang goreng!"""
    n = int(SR * 0.42)
    t = np.arange(n) / SR
    f = 420 + 1850 * np.sin(2 * np.pi * 4.5 * t) * np.exp(-t * 2.5)
    sig = np.sin(2 * np.pi * np.cumsum(np.abs(f)) / SR) * 0.6 + bp(nz(n, seed), 1200, 5200) * 0.55
    sig *= np.sin(np.pi * np.clip(t / 0.42, 0, 1)) ** 0.5
    return norm(sig.astype(np.float32), 0.88)


def sfx_gorengan_crunch(seed=51):
    """Bunyi KRESSS renyah menggigit pisang goreng & tahu isi hangat!"""
    n = int(SR * 0.44)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    crackle = bp(nz(n, seed), 1600, 8200)
    bursts = np.zeros(n, np.float32)
    for pos_s, amp in [(0.03, 1.0), (0.11, 0.85), (0.20, 0.78), (0.29, 0.52)]:
        bursts += np.exp(-((t - pos_s) / 0.03) ** 2).astype(np.float32) * amp
    return norm((crackle * bursts * (0.7 + 0.3 * rng.random(n))).astype(np.float32), 0.80)


def sfx_camera_shutter(seed=61):
    """CEKREK! Suara kamera HP pas foto bareng Kang Pocong & Mbak Kunti."""
    n = int(SR * 0.24)
    t = np.arange(n) / SR
    c1 = bp(nz(n, seed), 2000, 9000) * np.exp(-((t - 0.025) / 0.012) ** 2)
    c2 = bp(nz(n, seed + 1), 1600, 7500) * np.exp(-((t - 0.095) / 0.014) ** 2) * 0.85
    beep = np.sin(2 * np.pi * 2400 * t) * np.exp(-((t - 0.01) / 0.015) ** 2) * 0.3
    return norm((c1 + c2 + beep).astype(np.float32), 0.88)


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

    # Transisi swoosh bersih antar semua adegan
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.36, abs(hash(k)) % 50 + 11), max(0.0, S[k] - 0.18), 0.28)

    # 1. HOOK — Malam Jumat Tengah Malam di Gerbang Rumah Kosong
    put(sfx, AWAN.sfx_crickets(END["hook"] - S["hook"]), S["hook"], 0.22)
    put(sfx, sfx_owl_hoot(12), S["hook"] + 0.55, 0.42, -0.35)
    put(sfx, E.sfx_paper(13), EV["hook.goreng"], 0.42, 0.3)

    # 2. MASUK — Langkah Jinjit + Senter + Lampu Teras Berkedip + Angin Beringin
    put(sfx, AWAN.sfx_crickets(END["masuk"] - S["masuk"]), S["masuk"], 0.18)
    put(sfx, AWAN.sfx_steps(6, 0.44, 22), S["masuk"] + 0.3, 0.34, -0.15)
    put(sfx, E.sfx_tik(2200, 23), EV["masuk.senter"], 0.42)
    put(sfx, sfx_lamp_buzz(0.9, 24), EV["masuk.berkedip"] - 0.05, 0.62, 0.1)
    put(sfx, E.sfx_wind(2.2, 25), EV["masuk.beringin"] - 0.15, 0.52, -0.2)

    # 3. MUNCUL — Kemunculan Dramatis Kang Pocong & Mbak Kunti!
    put(sfx, sfx_ghost_appear(1.5, 32), EV["muncul.pocong"] - 0.15, 0.90, -0.25)
    put(sfx, E.sfx_boing(260, 0.38), EV["muncul.pocong"] + 0.22, 0.42, -0.25)
    put(sfx, E.sfx_swoosh(0.65, 33), EV["muncul.kunti"] - 0.1, 0.72, 0.35)
    put(sfx, E.sfx_thump(34, 62), EV["muncul.membeku"] + 0.02, 0.70)

    # 4. TAWAR — Record Scratch -> Pisang Goreng Hangat & Mata Hantu Berbinar!
    put(sfx, sfx_record_scratch(42), EV["tawar.gorengan"] - 0.18, 0.72)
    put(sfx, K.sfx_pour(0.9), EV["tawar.kopi"] + 0.02, 0.48, 0.2)
    put(sfx, E.sfx_tinkle(8, 43), EV["tawar.berbinar"] + 0.02, 0.56)

    # 5. CURHAT — Mengunyah Gorengan + Curhat Lembur Malam Jumat + Lompat Pegal
    put(sfx, AWAN.sfx_crickets(END["curhat"] - S["curhat"]), S["curhat"], 0.12)
    put(sfx, sfx_gorengan_crunch(52), EV["curhat.kunti"] - 0.25, 0.62, 0.2)
    put(sfx, E.sfx_boing(310, 0.34), EV["curhat.melompat"] + 0.05, 0.45, -0.2)
    put(sfx, K.sfx_gulp(), EV["curhat.melompat"] + 0.65, 0.38, 0.15)

    # 6. VIRAL — Riko Kaget LIVE Masih Menyala -> Notif & Tawa Ramai!
    put(sfx, K.sfx_notif(), EV["viral.kaget"] - 0.08, 0.62, -0.2)
    put(sfx, E.sfx_boing(390, 0.34), EV["viral.kaget"] + 0.10, 0.46, -0.25)
    put(sfx, K.sfx_notif(), EV["viral.tertawa"] - 0.35, 0.42, 0.25)
    if (T_LAUGH / "tawa_istana_ramai.mp3").exists():
        put(
            vo,
            norm(E.load_mp3(T_LAUGH / "tawa_istana_ramai.mp3", 1.06), 0.27)[: int(SR * 2.0)],
            EV["viral.tertawa"] + 0.12,
            0.38,
            0.1,
        )

    # 7. FOTO — CEKREK Selfie Bareng + Kunyah Bakwan
    put(sfx, sfx_camera_shutter(71), EV["foto.foto"] + 0.08, 0.85)
    put(sfx, E.sfx_tinkle(6, 72), EV["foto.foto"] + 0.25, 0.38)
    put(sfx, sfx_gorengan_crunch(73), EV["foto.bakwan"] + 0.12, 0.58, -0.15)

    # 8. ENDING — Bulan Purnama Hangat + Fanfare CTA
    put(sfx, AWAN.sfx_crickets(END["ending"] - S["ending"]), S["ending"], 0.16)
    put(sfx, E.sfx_fanfare(), EV["ending.komentar"] + 0.22, 0.34)

    # Musik latar komedi playful (mute penuh pas adegan horor muncul -> nyala lagi pas gorengan disodorkan!)
    base = {
        "hook": 0.58,
        "masuk": 0.32,
        "muncul": 0.0,
        "tawar": 0.72,
        "curhat": 0.78,
        "viral": 0.84,
        "foto": 0.86,
        "ending": 0.82,
    }
    ip_t, ip_v = [0.0], [0.30]
    for k in order:
        ip_t += [S[k] + 0.1, END[k] - 0.1]
        ip_v += [base[k], base[k]]
    ip_t.append(total)
    ip_v.append(0.0)
    mutes = [(EV["masuk.berkedip"] - 0.05, EV["tawar.gorengan"] + 0.05)]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    # Ducking & mastering identik Kantor di Atas Awan
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

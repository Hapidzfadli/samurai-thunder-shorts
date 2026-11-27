"""Mix audio + jadwal adegan 'Kisah Nyata Jan Koum — Pendiri WhatsApp' (2+ menit).

Masukan : src/whatsapp_voice.json + out/voice/whatsapp/*.wav (scripts/voice_pocket.py)
Keluaran: public/audio/whatsapp_master.mp3 dan src/whatsapp_timing.json
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

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp

VOICE_JSON = ROOT / "src" / "whatsapp_voice.json"
TIMING_JSON = ROOT / "src" / "whatsapp_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "whatsapp_master.mp3"

TEMPO = 1.16  # Punchy viral storytelling pace (~2m 35s total: >2m min, <3m Shorts max)

SCENE_CFG = {
    "hook":    dict(pre=0.50, post=0.40, gaps=[0.0, 0.20, 0.20]),
    "antrean": dict(pre=0.40, post=0.38, gaps=[0.0, 0.18, 0.20, 0.20]),
    "ditolak": dict(pre=0.35, post=0.40, gaps=[0.0, 0.20, 0.18, 0.20]),
    "ide":     dict(pre=0.38, post=0.38, gaps=[0.0, 0.18, 0.18, 0.20]),
    "prinsip": dict(pre=0.35, post=0.40, gaps=[0.0, 0.20, 0.18, 0.20]),
    "meledak": dict(pre=0.35, post=0.40, gaps=[0.0, 0.20, 0.20]),
    "tawaran": dict(pre=0.38, post=0.40, gaps=[0.0, 0.18, 0.20, 0.20]),
    "penutup": dict(pre=0.38, post=1.60, gaps=[0.0, 0.24, 0.28]),
}

EVENTS = {
    "hook.miliar":      ("hook",    0, "sembilan", -2),
    "hook.pintu":       ("hook",    1, "pintu", -2),
    "hook.kupon":       ("hook",    2, "kupon", -2),
    "antrean.ukraina":  ("antrean", 0, "ukraina", -2),
    "antrean.ibu":      ("antrean", 2, "sabar", -2),
    "antrean.coding":   ("antrean", 3, "pemrograman", -2),
    "ditolak.maaf":     ("ditolak", 1, "maaf", -2),
    "ditolak.mentah":   ("ditolak", 2, "menolak", -2),
    "ditolak.santai":   ("ditolak", 3, "santai", -2),
    "ide.ponsel":       ("ide",     0, "ponsel", -2),
    "ide.ringan":       ("ide",     2, "aplikasi", -2),
    "ide.whatsapp":     ("ide",     3, "whatsapp", -2),
    "prinsip.kopi":     ("prinsip", 1, "kopimu", -4),
    "prinsip.catatan":  ("prinsip", 2, "catatan", -2),
    "prinsip.iklan":    ("prinsip", 3, "tanpa", -2),
    "meledak.meledak":  ("meledak", 1, "meledak", -2),
    "meledak.juta":     ("meledak", 1, "empat", -2),
    "meledak.karyawan": ("meledak", 2, "lima", -2),
    "tawaran.mark":     ("tawaran", 1, "mark", -2),
    "tawaran.akuisisi": ("tawaran", 2, "sembilan", -2),
    "penutup.tanda":    ("penutup", 0, "menandatangani", -4),
    "penutup.asal":     ("penutup", 1, "berasal", -2),
    "penutup.akhir":    ("penutup", 2, "penolakan", -2),
}

HIGHLIGHTS = {
    "19", "sembilan", "miliar", "triliun", "whatsapp", "facebook", "twitter",
    "kupon", "ukraina", "ditolak", "menolak", "ponsel", "iklan", "game",
    "meledak", "juta", "karyawan", "zuckerberg", "akuisisi", "penolakan", "besar",
}


def load_wav_tempo(path: Path, tempo: float = TEMPO) -> np.ndarray:
    """Load WAV resampled to SR with pitch-preserving ffmpeg atempo."""
    tmp = path.with_name(f"{path.stem}_t{int(round(tempo*100))}.wav")
    if not tmp.exists():
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(path), "-af", f"atempo={tempo:.3f}", "-ar", str(SR), "-ac", "1", str(tmp)],
            check=True,
        )
    return E.load_wav(tmp)


# ------------------------------------------------------------------ Custom Modern Tech SFX
def sfx_sliding_door(dur=0.9):
    """Smooth automatic glass sliding door pneumatic glide."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * t / dur) ** 1.2
    air = bp(nz(n, 101), 400, 2600) * 0.45
    motor = np.sin(2 * np.pi * (170 + 35 * t) * t) * 0.12
    return norm(((air + motor) * env).astype(np.float32), 0.45)


def sfx_mech_typing(dur=1.9, seed=202):
    """Crisp mechanical keyboard keystrokes."""
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    t = 0.04
    while t < dur - 0.08:
        kn = int(SR * 0.035)
        tt = np.arange(kn) / SR
        click = (
            bp(nz(kn, int(t * 1000) + seed), 1800, 6200) * np.exp(-tt * 140)
            + 0.35 * np.sin(2 * np.pi * (280 + rng.uniform(-40, 40)) * tt) * np.exp(-tt * 110)
        )
        s = int(t * SR)
        out[s:s + kn] += click[:max(0, n - s)] * rng.uniform(0.65, 1.0)
        t += rng.uniform(0.065, 0.145)
    return norm(out, 0.46)


def sfx_wa_ping():
    """Modern bright two-note chat notification chime."""
    n = int(SR * 0.55)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 880 * t) * np.exp(-t * 14) * 0.65
    s2 = int(0.09 * SR)
    t2 = np.arange(n - s2) / SR
    x[s2:] += np.sin(2 * np.pi * 1318.5 * t2) * np.exp(-t2 * 10) * 0.75
    return norm(x.astype(np.float32), 0.58)


def sfx_reject_thud():
    """Soft muted low rejection / email thud."""
    n = int(SR * 0.45)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (165 - 65 * t) * t) * np.exp(-t * 9.5)
    x += 0.25 * lp(nz(n, 303), 550) * np.exp(-t * 22)
    return norm(x.astype(np.float32), 0.55)


def sfx_mug_clink():
    n = int(SR * 0.26)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1480 * t) + 0.5 * np.sin(2 * np.pi * 2960 * t)) * np.exp(-t * 26)
    x += 0.32 * lp(nz(n, 404), 600) * np.exp(-t * 42)
    return norm(x.astype(np.float32), 0.52)


def sfx_sticky_slap():
    """Crisp paper slap onto glass whiteboard."""
    n = int(SR * 0.22)
    t = np.arange(n) / SR
    x = bp(nz(n, 505), 1100, 6000) * np.exp(-t * 32)
    return norm(x.astype(np.float32), 0.50)


def sfx_growth_rise(dur=1.8):
    """Ascending shimmering whoosh as user chart skyrockets."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq = 260 * (2.6 ** (t / dur))
    ph = 2 * np.pi * np.cumsum(freq) / SR
    env = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.35)
    x = (np.sin(ph) * 0.55 + np.sin(ph * 1.5) * 0.25) * env
    x += bp(nz(n, 606), 900, 4200) * env * 0.20
    return norm(x.astype(np.float32), 0.48)


def sfx_pen_sign(dur=1.1):
    """Smooth fountain pen signing on contract paper."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = (0.45 + 0.55 * np.sin(2 * np.pi * 7.5 * t) ** 2) * np.minimum(1, t / 0.06) * np.minimum(1, (dur - t) / 0.08)
    x = bp(nz(n, 707), 1900, 6200) * env
    return norm(x.astype(np.float32), 0.44)


def sfx_inspire_chord():
    """Warm major-9th ascending inspirational chime."""
    n = int(SR * 2.0)
    x = np.zeros(n, np.float32)
    for idx, f in enumerate([523.25, 659.25, 783.99, 987.77, 1174.66]):
        st = int(idx * 0.11 * SR)
        tt = np.arange(n - st) / SR
        x[st:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.1) * 0.35
    return norm(x, 0.58)


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
            "highlight": any(hw in clean for hw in HIGHLIGHTS),
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
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.20
            y = load_wav_tempo(ROOT / ln["file"], TEMPO)
            d = len(y) / SR
            scaled_words = [[w, a / TEMPO, b / TEMPO] for w, a, b in ln["wordsSec"]]
            aligned = E.align_script(ln["text"], scaled_words, d)
            voice = ln.get("voice", "dodi")
            words_local = [{"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))} for w, a, b in aligned]
            all_words_global.extend(
                {"w": w, "voice": voice, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))} for w, a, b in aligned
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
        key = E.norm_word(word)
        for w in ln["words"]:
            if E.norm_word(w["w"]).startswith(key):
                return max(0, w["from"] + off)
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
        print(f"  {k:9s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    for t0, y, voice in clips:
        pan = -0.08 if voice == "dodi" else (0.14 if voice == "butini" else 0.16)
        put(vo, y, t0, 1.0, pan)

    # Smooth scene transition whooshes
    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.42, abs(hash(k)) % 50 + 3), max(0.0, S[k] - 0.22), 0.24)

    # 1 HOOK: Silicon Valley sunset breeze + aerial whoosh + subtle impact chime
    put(sfx, E.sfx_wind(END["hook"] - S["hook"], 5), S["hook"], 0.11)
    put(sfx, E.sfx_swoosh(0.75, 11), S["hook"] + 0.3, 0.34)
    put(sfx, sfx_wa_ping(), EV["hook.miliar"], 0.32)

    # 2 ANTREAN: sliding glass door opening as camera flies inside + waiting room tone + footsteps
    put(sfx, sfx_sliding_door(0.95), S["antrean"] + 0.05, 0.55)
    put(sfx, K.sfx_room(END["antrean"] - S["antrean"], 21, murmur=False), S["antrean"] + 0.5, 0.15)
    put(sfx, AWAN.sfx_steps(4, 0.28, 22), S["antrean"] + 1.0, 0.28, -0.15)

    # 3 DITOLAK: modern office room tone + folder slide + rejection thud + footsteps walking out
    put(sfx, K.sfx_room(END["ditolak"] - S["ditolak"], 31, murmur=False), S["ditolak"], 0.14)
    put(sfx, sfx_reject_thud(), EV["ditolak.mentah"], 0.55)
    put(sfx, AWAN.sfx_steps(4, 0.26, 33), EV["ditolak.santai"] - 0.5, 0.26, 0.12)

    # 4 IDE: night city quiet + mechanical keyboard coding + WhatsApp chat ping!
    put(sfx, AWAN.sfx_crickets(END["ide"] - S["ide"]), S["ide"], 0.09)
    put(sfx, sfx_mech_typing(2.2, 41), S["ide"] + 0.5, 0.45, -0.1)
    put(sfx, sfx_wa_ping(), EV["ide.whatsapp"], 0.52)
    put(sfx, sfx_mech_typing(1.8, 42), EV["ide.whatsapp"] + 0.3, 0.38, -0.1)

    # 5 PRINSIP: Brian footsteps + ceramic coffee mug clink + sticky note slap + clean ping
    put(sfx, K.sfx_room(END["prinsip"] - S["prinsip"], 51, murmur=False), S["prinsip"], 0.12)
    put(sfx, AWAN.sfx_steps(3, 0.26, 52), EV["prinsip.kopi"] - 1.2, 0.28, 0.18)
    put(sfx, sfx_mug_clink(), EV["prinsip.kopi"] + 0.2, 0.56, 0.15)
    put(sfx, sfx_sticky_slap(), EV["prinsip.catatan"] + 0.65, 0.56, 0.12)
    put(sfx, sfx_wa_ping(), EV["prinsip.iklan"] + 0.8, 0.45)

    # 6 MELEDAK: startup bustle + typing + rising user-growth whoosh + chime
    put(sfx, K.sfx_room(END["meledak"] - S["meledak"], 61, murmur=False), S["meledak"], 0.14)
    put(sfx, sfx_mech_typing(1.6, 62), S["meledak"] + 0.4, 0.34, 0.15)
    put(sfx, sfx_growth_rise(2.0), EV["meledak.meledak"], 0.48)
    put(sfx, sfx_wa_ping(), EV["meledak.juta"], 0.50)

    # 7 TAWARAN: executive boardroom hush + folder slide + impactful chord
    put(sfx, K.sfx_room(END["tawaran"] - S["tawaran"], 71, murmur=False), S["tawaran"], 0.11)
    put(sfx, E.sfx_swoosh(0.45, 72), EV["tawaran.mark"], 0.24)
    put(sfx, sfx_inspire_chord(), EV["tawaran.akuisisi"] + 0.2, 0.52)

    # 8 PENUTUP: golden sunset breeze + pen signing contract + inspirational finale chord + crane swoosh
    put(sfx, E.sfx_wind(END["penutup"] - S["penutup"], 81), S["penutup"], 0.12)
    put(sfx, sfx_pen_sign(1.3), EV["penutup.tanda"] + 0.3, 0.50)
    put(sfx, E.sfx_swoosh(0.85, 83), END["penutup"] - 2.6, 0.26)
    put(sfx, sfx_inspire_chord(), END["penutup"] - 1.9, 0.56)

    ip_t = [0, S["antrean"], S["ditolak"], S["ide"], S["prinsip"], S["meledak"], S["tawaran"], S["penutup"], total]
    ip_v = [0.64, 0.48, 0.45, 0.54, 0.58, 0.78, 0.72, 0.80, 0.35]
    mutes = [(EV["ditolak.mentah"] - 0.08, EV["ditolak.mentah"] + 0.55)]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = mus[:N] * 0.44 * (1.0 / (1.0 + 7.5 * env))[:, None] + sfx * (1.0 / (1.0 + 1.2 * env))[:, None] + vo * 1.18
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.08) * np.clip((total - tt) / 0.7, 0.0, 1.0))[:, None]
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

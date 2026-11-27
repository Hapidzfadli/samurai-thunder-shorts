"""Mix audio + jadwal adegan 'Kisah Nyata George Dantzig (1939)' (dialog Dodi & Ara).

Masukan : src/dantzig_voice.json + out/voice/dantzig/*.wav (scripts/voice_vox.py)
Keluaran: public/audio/dantzig_master.mp3 dan src/dantzig_timing.json
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

VOICE_JSON = ROOT / "src" / "dantzig_voice.json"
TIMING_JSON = ROOT / "src" / "dantzig_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "dantzig_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.75, post=0.55, gaps=[0.0, 0.35]),
    "kelas": dict(pre=0.45, post=0.55, gaps=[0.0, 0.30]),
    "kamar": dict(pre=0.55, post=0.55, gaps=[0.0, 0.25]),
    "kantor": dict(pre=0.45, post=0.55, gaps=[0.0, 0.25]),
    "minggu": dict(pre=0.60, post=0.45, gaps=[0.0, 0.35, 0.25]),
    "twist": dict(pre=0.35, post=0.55, gaps=[0.0, 0.25, 0.30]),
    "akhir": dict(pre=0.45, post=1.80, gaps=[0.0, 0.45]),
}

EVENTS = {
    "hook.telat": ("hook", 0, "terlambat", -2),
    "hook.mustahil": ("hook", 1, "mustahil", -2),
    "kelas.papan": ("kelas", 0, "papan", -2),
    "kelas.menyalinnya": ("kelas", 1, "menyalinnya", -18),
    "kamar.dua": ("kamar", 0, "dua", -2),
    "kamar.ketemu": ("kamar", 1, "ketemu", -2),
    "kantor.maaf": ("kantor", 0, "maaf", -2),
    "kantor.taruh": ("kantor", 1, "taruh", -2),
    "minggu.gedor": ("minggu", 0, "digedor", -10),
    "minggu.siapa": ("minggu", 1, "siapa", -2),
    "minggu.george": ("minggu", 2, "george", -2),
    "twist.bukan": ("twist", 0, "bukan", -2),
    "twist.serius": ("twist", 1, "serius", -2),
    "twist.disertasi": ("twist", 2, "disertasi", -2),
    "akhir.berhasil": ("akhir", 0, "berhasil", -2),
    "akhir.takut": ("akhir", 1, "takut", -2),
}

HIGHLIGHTS = {
    "1939", "terlambat", "telat", "mustahil", "neyman", "teorema", "pr", "tugas",
    "susah", "ketemu", "profesor", "tumpukan", "minggu", "digedor", "jurnalmu",
    "bukan", "serius", "disertasi", "doktor", "berhasil", "takut", "mencoba",
}


# ------------------------------------------------------------------ Custom Dantzig SFX
def sfx_school_bell(dur=1.4):
    """Classic campus bell chime."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    x = (
        np.sin(2 * np.pi * 659.25 * t) * np.exp(-t * 2.2)
        + 0.6 * np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 3.2)
        + 0.35 * np.sin(2 * np.pi * 1975.5 * t) * np.exp(-t * 4.5)
    )
    return norm(x.astype(np.float32), 0.55)


def sfx_pencil_scribble(dur=1.4, seed=12):
    """Quick pencil scratches on paper."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = 0.5 + 0.5 * np.sin(2 * np.pi * 9.5 * t) ** 2
    x = bp(nz(n, seed), 1800, 5800) * env * np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08)
    return norm(x.astype(np.float32), 0.42)


def sfx_paper_crumple(dur=0.45, seed=22):
    """Crumpling failed paper sheet."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    burst = np.abs(np.sin(2 * np.pi * 14 * t)) ** 1.4
    x = bp(nz(n, seed), 1400, 7200) * burst * np.exp(-t * 3.0)
    return norm(x.astype(np.float32), 0.55)


def sfx_mug_clink():
    """Ceramic coffee mug gently set on wooden desk."""
    n = int(SR * 0.25)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1420 * t) + 0.5 * np.sin(2 * np.pi * 2890 * t)) * np.exp(-t * 28)
    x += 0.35 * lp(nz(n, 33), 600) * np.exp(-t * 45)
    return norm(x.astype(np.float32), 0.52)


def sfx_door_knocks(count=3, spacing=0.22, seed=44):
    """Urgent heavy wooden front door knocks (DOK! DOK! DOK!)."""
    dur = count * spacing + 0.35
    n = int(SR * dur)
    out = np.zeros(n, np.float32)
    for i in range(count):
        kn = int(SR * 0.16)
        t = np.arange(kn) / SR
        hit = (
            np.sin(2 * np.pi * (125 + i * 6) * t) * np.exp(-t * 26)
            + 0.45 * bp(nz(kn, seed + i), 180, 950) * np.exp(-t * 35)
        )
        s = int(i * spacing * SR)
        out[s:s + kn] += hit[: max(0, n - s)]
    return norm(out, 0.85)


def sfx_inspire_chime():
    """Warm ascending triad chime for finale."""
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    x = np.zeros(n, np.float32)
    for idx, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        st = int(idx * 0.10 * SR)
        ln = n - st
        tt = np.arange(ln) / SR
        x[st:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.5) * 0.4
    return norm(x, 0.6)


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
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.25
            y = E.load_wav(ROOT / ln["file"])
            d = len(y) / SR
            aligned = E.align_script(ln["text"], ln["wordsSec"], d)
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
        print(f"  {k:8s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)
    for t0, y, voice in clips:
        put(vo, y, t0, 1.0, -0.10 if voice == "dodi" else 0.12)

    for k in order[1:]:
        put(sfx, E.sfx_swoosh(0.38, abs(hash(k)) % 50 + 1), max(0.0, S[k] - 0.20), 0.24)

    # 1 HOOK: campus bell + breeze + camera whoosh flying through window + hurried footsteps
    put(sfx, sfx_school_bell(1.5), S["hook"] + 0.1, 0.40)
    put(sfx, E.sfx_wind(END["hook"] - S["hook"], 3), S["hook"], 0.12)
    put(sfx, E.sfx_swoosh(0.65, 11), S["hook"] + 2.2, 0.38)
    put(sfx, AWAN.sfx_steps(5, 0.22, 14), EV["hook.telat"], 0.32, -0.2)

    # 2 KELAS: room tone + pencil scribbling during close-up insert
    put(sfx, K.sfx_room(END["kelas"] - S["kelas"], 21, murmur=False), S["kelas"], 0.16)
    put(sfx, sfx_pencil_scribble(1.7, 22), EV["kelas.menyalinnya"], 0.55)

    # 3 KAMAR: quiet night crickets + clock tick + paper crumple + mug clink + idea chime
    put(sfx, AWAN.sfx_crickets(END["kamar"] - S["kamar"]), S["kamar"], 0.14)
    put(sfx, E.sfx_tick_clock(2.4), S["kamar"] + 0.2, 0.16)
    put(sfx, sfx_paper_crumple(0.45, 31), S["kamar"] + 0.9, 0.50, 0.15)
    put(sfx, sfx_mug_clink(), EV["kamar.dua"] + 0.6, 0.55, 0.2)
    put(sfx, sfx_inspire_chime(), EV["kamar.ketemu"], 0.40)

    # 4 KANTOR: office room tone + footsteps + paper stack thud on desk
    put(sfx, K.sfx_room(END["kantor"] - S["kantor"], 41, murmur=False), S["kantor"], 0.15)
    put(sfx, AWAN.sfx_steps(3, 0.26, 42), S["kantor"] + 0.2, 0.30, -0.2)
    put(sfx, E.sfx_slam(43), EV["kantor.taruh"] + 0.55, 0.35, 0.1)

    # 5 MINGGU: urgent 8 AM door knocks (DOK DOK DOK!) + creaking front door swinging open
    put(sfx, sfx_door_knocks(4, 0.21, 51), EV["minggu.gedor"], 0.78)
    put(sfx, AWAN.sfx_krek(), EV["minggu.george"] - 0.55, 0.52)

    # 6 TWIST: red stamp slam ("TERPECAHKAN!") + triumphant sparkle chime
    put(sfx, E.sfx_stamp(61), EV["twist.bukan"] + 0.2, 0.62)
    put(sfx, sfx_inspire_chime(), EV["twist.disertasi"], 0.55)

    # 7 AKHIR: warm campus breeze + reverse crane swoosh + inspirational final chime
    put(sfx, E.sfx_wind(END["akhir"] - S["akhir"], 71), S["akhir"], 0.12)
    put(sfx, E.sfx_swoosh(0.65, 72), END["akhir"] - 2.2, 0.28)
    put(sfx, sfx_inspire_chime(), END["akhir"] - 1.5, 0.50)

    ip_t = [0, S["kelas"], S["kamar"], S["kantor"], S["minggu"], S["twist"], S["akhir"], total]
    ip_v = [0.65, 0.55, 0.42, 0.48, 0.72, 0.80, 0.70, 0.35]
    mutes = [(EV["minggu.gedor"] - 0.1, EV["minggu.gedor"] + 0.95)]
    mus = E.music_bed(total, ip_t, ip_v, mutes)

    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = mus[:N] * 0.46 * (1.0 / (1.0 + 7.5 * env))[:, None] + sfx * (1.0 / (1.0 + 1.2 * env))[:, None] + vo * 1.18
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

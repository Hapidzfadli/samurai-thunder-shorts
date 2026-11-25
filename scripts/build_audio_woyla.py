"""Hollywood 2-Act Stereo Soundtrack + Tactical VFX/SFX + Broadcast Mixer for Operasi Woyla 1981."""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
os.environ["PATH"] = f"{ROOT / '.venv' / 'bin'}:{Path.home() / '.local' / 'bin'}:{os.environ.get('PATH', '')}"


def _load_mod(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _ffmpeg_bin() -> str:
    for cand in (
        ROOT / ".venv" / "bin" / "ffmpeg",
        Path.home() / ".local" / "bin" / "ffmpeg",
        ROOT / "node_modules" / "@remotion" / "compositor-linux-x64-gnu" / "ffmpeg",
    ):
        if cand.exists():
            return str(cand)
    return "ffmpeg"


E = _load_mod("emu_audio", "scripts/build_audio_emu.py")
H = _load_mod("horor_audio", "scripts/build_audio_horor.py")

SR, FPS = E.SR, E.FPS
put, norm, nz, bp, lp = E.put, E.norm, E.nz, E.bp, E.lp
midi_hz = H.midi_hz

VOICE_JSON = ROOT / "src" / "woyla_voice.json"
TIMING_JSON = ROOT / "src" / "woyla_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "woyla_master.mp3"

SCENE_CFG = {
    "hook": dict(pre=0.35, post=0.38, gaps=[0.0]),
    "krisis": dict(pre=0.30, post=0.38, gaps=[0.0, 0.16]),
    "briefing": dict(pre=0.30, post=0.36, gaps=[0.0, 0.16]),
    "susup": dict(pre=0.34, post=0.34, gaps=[0.0]),
    "ababa": dict(pre=0.28, post=1.18, gaps=[0.0]),
    "klimaks": dict(pre=1.42, post=0.52, gaps=[0.0, 0.34]),
    "evakuasi": dict(pre=0.32, post=0.45, gaps=[0.0]),
    "epilog": dict(pre=0.35, post=1.95, gaps=[0.0]),
}

LINE_IDS = {
    "hook": ["h1"],
    "krisis": ["k1", "k2"],
    "briefing": ["b1", "b2"],
    "susup": ["s1"],
    "ababa": ["a1"],
    "klimaks": ["c1", "c2"],
    "evakuasi": ["e1"],
    "epilog": ["p1"],
}

EVENTS = {
    "hook.bang": ("hook", 0, "garuda", -2),
    "hook.menit": ("hook", 0, "tiga", -2),
    "krisis.dibajak": ("krisis", 0, "dibajak", -2),
    "krisis.kokpit": ("krisis", 1, "herman", -2),
    "briefing.tiga": ("briefing", 0, "tiga", -2),
    "briefing.merah": ("briefing", 1, "merah", -2),
    "briefing.hijau": ("briefing", 1, "hijau", -2),
    "susup.hujan": ("susup", 0, "hujan", -2),
    "susup.merayap": ("susup", 0, "merayap", -2),
    "ababa.laksanakan": ("ababa", 0, "laksanakan", -2),
    "ababa.pin_pull": ("ababa", 0, "END", 2),
    "ababa.sub_drop": ("ababa", 0, "END", 12),
    "klimaks.breach": ("klimaks", 0, "START", -40),
    "klimaks.flashbang": ("klimaks", 0, "START", -30),
    "klimaks.bullettime": ("klimaks", 0, "START", -6),
    "klimaks.peluru": ("klimaks", 1, "peluru", -2),
    "evakuasi.timer": ("evakuasi", 0, "menit", -2),
    "evakuasi.selamat": ("evakuasi", 0, "selamat", -2),
    "epilog.gugur": ("epilog", 0, "kirang", -2),
    "epilog.gultor": ("epilog", 0, "gultor", -2),
}

HIGHLIGHTS = {
    "woyla", "garuda", "bangkok", "tiga", "menit", "dibajak", "sandera", "herman",
    "kopassandha", "sintong", "merah", "biru", "hijau", "hujan", "senyap",
    "laksanakan", "pin", "granat", "didobrak", "ledakan", "cahaya", "peluru",
    "membeku", "kokpit", "selamat", "kirang", "gultor", "kopassus",
}


def sfx_braaam(dur: float = 2.8, root_hz: float = 36.71) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros((n, 2), np.float32)
    freqs = [root_hz, root_hz * 1.006, root_hz * 2.0, root_hz * 1.992, root_hz * 3.0, root_hz * 4.0]
    for i, f in enumerate(freqs):
        sig = np.zeros(n, np.float32)
        for h in range(1, 7):
            sig += (1.0 / h) * np.sin(2 * np.pi * f * h * t + i * 0.7)
        pan = -0.35 if i % 2 == 0 else 0.35
        out[:, 0] += sig * (0.65 - pan * 0.35)
        out[:, 1] += sig * (0.65 + pan * 0.35)
    env = np.minimum(1.0, t / 0.045) * np.exp(-t * 0.85)
    sos = signal.butter(2, 680.0, btype="lowpass", fs=SR, output="sos")
    out[:, 0] = signal.sosfilt(sos, out[:, 0]) * env
    out[:, 1] = signal.sosfilt(sos, out[:, 1]) * env
    out = np.tanh(out * 1.65)
    pk = float(np.max(np.abs(out))) + 1e-6
    return (out / pk * 0.92).astype(np.float32)


def sfx_pin_pull() -> np.ndarray:
    n = int(SR * 0.32)
    t = np.arange(n, dtype=np.float32) / SR
    ring = (
        np.sin(2 * np.pi * 4250 * t) * np.exp(-t * 28)
        + 0.7 * np.sin(2 * np.pi * 6120 * t) * np.exp(-t * 36)
        + 0.4 * np.sin(2 * np.pi * 2480 * t) * np.exp(-t * 22)
    )
    t2 = np.maximum(0.0, t - 0.14)
    pop = (t >= 0.14) * (np.sin(2 * np.pi * 3150 * t2) * np.exp(-t2 * 32) + 0.5 * np.sin(2 * np.pi * 5400 * t2) * np.exp(-t2 * 45))
    return norm(ring + pop * 0.9, 0.85)


def sfx_sub_drop(dur: float = 0.75) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    f = 88.0 * np.exp(-t * 2.2) + 26.0
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) * np.minimum(1.0, t / 0.025) * np.exp(-t * 3.8)
    return norm(sig, 0.88)


def sfx_flashbang_boom(dur: float = 2.0) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(1981)
    noise = rng.standard_normal(n).astype(np.float32)
    snap = bp(noise, 900, 6500) * np.exp(-t * 32.0) * 1.8
    roar = lp(noise, 520) * np.exp(-t * 3.2) * 1.4
    punch = np.sin(2 * np.pi * (95 * np.exp(-t * 8) + 34) * t) * np.exp(-t * 4.2) * 1.7
    shimmer = np.sin(2 * np.pi * 2850 * t) * np.minimum(1.0, t / 0.12) * np.exp(-t * 2.1) * 0.075
    return norm(np.tanh((snap + roar + punch) * 1.4) + shimmer, 0.95)


def sfx_door_breach() -> np.ndarray:
    n = int(SR * 0.55)
    t = np.arange(n, dtype=np.float32) / SR
    noise = nz(n, 77)
    slam = lp(noise, 420) * np.exp(-t * 14) + np.sin(2 * np.pi * (120 * np.exp(-t * 12) + 42) * t) * np.exp(-t * 10)
    clank = bp(noise, 1400, 4200) * np.exp(-t * 24) * 0.75
    return norm(np.tanh((slam + clank) * 1.6), 0.90)


def sfx_bullet_time_whiz(dur: float = 1.4, seed: int = 11) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    env = np.sin(np.pi * t / dur) ** 1.6
    f = 1550.0 * np.exp(-t * 1.8) + 180.0
    ph = 2 * np.pi * np.cumsum(f) / SR
    zip_s = np.sin(ph) * env * 0.55
    air = bp(nz(n, seed), 260, 2600) * env * 0.7
    sub = np.sin(2 * np.pi * 55 * t) * env * 0.45
    return norm(zip_s + air + sub, 0.80)


def sfx_mp5_burst(shots: int = 3, seed: int = 44) -> np.ndarray:
    gap = 0.082
    n = int(SR * (shots * gap + 0.25))
    out = np.zeros(n, np.float32)
    for i in range(shots):
        m = int(SR * 0.14)
        t = np.arange(m, dtype=np.float32) / SR
        pop = bp(nz(m, seed + i), 320, 4200) * np.exp(-t * 42) + np.sin(2 * np.pi * 135 * t) * np.exp(-t * 36) * 0.8
        i0 = int(i * gap * SR)
        out[i0 : i0 + m] += pop
    return norm(np.tanh(out * 1.5), 0.78)


def sfx_radio_beep() -> np.ndarray:
    n = int(SR * 0.11)
    t = np.arange(n, dtype=np.float32) / SR
    sig = np.sin(2 * np.pi * 1680 * t) * (t < 0.055) + bp(nz(n, 9), 500, 2800) * 0.35
    return norm(sig * np.minimum(1.0, t / 0.006), 0.65)


def sfx_taiko_hit(f0: float = 62.0, seed: int = 5) -> np.ndarray:
    n = int(SR * 0.65)
    t = np.arange(n, dtype=np.float32) / SR
    body = np.sin(2 * np.pi * (f0 * (1 + 0.7 * np.exp(-t * 24))) * t) * np.exp(-t * 5.2)
    skin = bp(nz(n, seed), 280, 1800) * np.exp(-t * 34) * 0.55
    return norm(np.tanh((body + skin) * 1.4), 0.88)


def inst_tick(high: bool = True) -> np.ndarray:
    n = int(SR * 0.045)
    t = np.arange(n, dtype=np.float32) / SR
    f = 3400.0 if high else 2350.0
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t * 110) + bp(nz(n, 2 if high else 3), 2000, 6500) * np.exp(-t * 140) * 0.5
    return norm(sig, 0.55)


def inst_cinema_string(freq: float, dur: float) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    sig = np.zeros(n, np.float32)
    for det in (-0.004, 0.0, 0.0045):
        f = freq * (1 + det)
        sig += np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1.0, t / min(0.35, dur * 0.3)) * np.clip((dur - t) / min(0.4, dur * 0.3), 0.0, 1.0)
    return norm(lp(sig, 2600) * env, 0.55)


def inst_french_horn(freq: float, dur: float) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float32) / SR
    sig = (
        np.sin(2 * np.pi * freq * t)
        + 0.72 * np.sin(2 * np.pi * 2 * freq * t)
        + 0.42 * np.sin(2 * np.pi * 3 * freq * t)
        + 0.22 * np.sin(2 * np.pi * 4 * freq * t)
    )
    env = np.minimum(1.0, t / 0.09) * np.clip((dur - t) / 0.16, 0.0, 1.0) * (0.85 + 0.15 * np.sin(2 * np.pi * 4.5 * t))
    return norm(lp(sig, 1850) * env, 0.65)


def build_woyla_score(total: float, t_susup: float, t_subdrop: float, t_breach: float, t_evac: float, t_epilog: float) -> np.ndarray:
    n = int(SR * total) + SR
    mus = np.zeros((n, 2), np.float32)

    n_act1 = int(SR * max(0.5, t_subdrop))
    t1 = np.arange(n_act1, dtype=np.float32) / SR
    rain_l = bp(nz(n_act1, 101), 700, 4200) * 0.038
    rain_r = bp(nz(n_act1, 102), 700, 4200) * 0.038
    hum = np.sin(2 * np.pi * 55 * t1) * 0.045 + np.sin(2 * np.pi * 73.42 * t1) * 0.035
    mus[:n_act1, 0] += rain_l + hum
    mus[:n_act1, 1] += rain_r + hum

    beat = 60.0 / 128.0
    sub_beat = beat / 2.0
    chords_1 = [
        (38, [50, 57, 62, 65]),
        (34, [46, 53, 58, 62]),
        (43, [43, 50, 55, 58]),
        (45, [45, 52, 57, 61]),
    ]
    tick_hi = inst_tick(True)
    tick_lo = inst_tick(False)
    step = 0
    cur = 0.25
    while cur < t_subdrop - 0.12:
        intensity = 0.45 + 0.55 * np.clip(cur / max(1.0, t_subdrop), 0.0, 1.0)
        if cur >= t_susup or step % 2 == 0:
            tk = tick_hi if step % 2 == 0 else tick_lo
            pan = -0.25 if step % 2 == 0 else 0.25
            put(mus, tk, cur, 0.24 * intensity, pan)
        ci = (step // 8) % len(chords_1)
        root_m, pad_ms = chords_1[ci]
        f_bass = midi_hz(root_m)
        bn = int(SR * (sub_beat * 0.85))
        bt = np.arange(bn, dtype=np.float32) / SR
        pulse_b = (np.sin(2 * np.pi * f_bass * bt) + 0.45 * np.sin(2 * np.pi * 2 * f_bass * bt)) * np.exp(-bt * 6.5)
        put(mus, norm(pulse_b, 0.55), cur, 0.28 * intensity, 0.0)
        if step % 8 == 0:
            cdur = min(sub_beat * 8.2, t_subdrop - cur)
            if cdur > 0.4:
                for pi, pm in enumerate(pad_ms):
                    put(mus, inst_cinema_string(midi_hz(pm), cdur), cur, 0.11 * intensity, -0.4 + pi * 0.27)
            put(mus, sfx_taiko_hit(58.0, 20 + step), cur, 0.34 * intensity, 0.0)
        step += 1
        cur += sub_beat

    i_drop = int(t_subdrop * SR)
    i_breach = int(t_breach * SR)
    if i_breach > i_drop + int(0.1 * SR):
        fade_n = min(int(0.08 * SR), i_breach - i_drop)
        mus[i_drop : i_drop + fade_n] *= np.linspace(1, 0, fade_n)[:, None]
        mus[i_drop + fade_n : i_breach] = 0.0

    br = sfx_braaam(2.9, 36.71)
    put(mus, br[:, 0], t_breach, 0.72, -0.5)
    put(mus, br[:, 1], t_breach, 0.72, 0.5)
    if t_breach + 3.6 < t_evac:
        br2 = sfx_braaam(2.4, 43.65)
        put(mus, br2[:, 0], t_breach + 3.6, 0.52, -0.45)
        put(mus, br2[:, 1], t_breach + 3.6, 0.52, 0.45)
    c_beat = 60.0 / 132.0
    tc = t_breach + 0.45
    ci = 0
    while tc < t_evac - 0.15:
        if ci % 2 == 0:
            put(mus, sfx_taiko_hit(64.0 if ci % 4 == 0 else 78.0, 60 + ci), tc, 0.48, -0.15 if ci % 4 == 0 else 0.15)
        f_st = midi_hz(50 if (ci // 4) % 2 == 0 else 53)
        put(mus, inst_cinema_string(f_st, c_beat * 0.9), tc, 0.16, 0.35 if ci % 2 else -0.35)
        tc += c_beat * 0.5
        ci += 1

    beat2 = 60.0 / 108.0
    hero_chords = [
        (41, [53, 57, 60, 65], 69),
        (36, [48, 55, 60, 64], 67),
        (34, [46, 53, 58, 62], 65),
        (38, [50, 57, 62, 66], 69),
    ]
    cur2 = t_evac
    bar = 0
    while cur2 < total - 0.5:
        r_m, pad_ms, horn_m = hero_chords[bar % len(hero_chords)]
        bar_dur = min(beat2 * 4.0, total - cur2 - 0.1)
        if bar_dur < 0.5:
            break
        for pi, pm in enumerate(pad_ms):
            put(mus, inst_cinema_string(midi_hz(pm), bar_dur + 0.35), cur2, 0.16, -0.45 + pi * 0.30)
        is_tribute = cur2 >= t_epilog - 0.2
        put(mus, inst_french_horn(midi_hz(horn_m), bar_dur * 0.85), cur2 + 0.1, 0.26 if is_tribute else 0.20, 0.0)
        put(mus, inst_cinema_string(midi_hz(r_m), bar_dur + 0.2), cur2, 0.24, 0.0)
        put(mus, sfx_taiko_hit(55.0, 200 + bar), cur2, 0.40, 0.0)
        if bar_dur > beat2 * 2.2:
            put(mus, sfx_taiko_hit(72.0, 240 + bar), cur2 + beat2 * 2.0, 0.28, 0.18)
        cur2 += beat2 * 4.0
        bar += 1

    put(mus, inst_cinema_string(midi_hz(50), 2.2), max(0.0, total - 2.4), 0.22, -0.3)
    put(mus, inst_cinema_string(midi_hz(62), 2.2), max(0.0, total - 2.4), 0.22, 0.3)
    put(mus, inst_french_horn(midi_hz(66), 2.0), max(0.0, total - 2.2), 0.28, 0.0)

    return mus[: int(SR * total)]


def build_captions(words_glob: list[dict]) -> list[dict]:
    caps = []
    i = 0
    while i < len(words_glob):
        w0 = words_glob[i]
        text = w0["w"]
        t_from, t_to = w0["from"], w0["to"]
        spk = w0["speaker"]
        if i + 1 < len(words_glob):
            w1 = words_glob[i + 1]
            same_spk = w1["speaker"] == spk
            close = (w1["from"] - t_to) <= 5
            combined = f"{text} {w1['w']}"
            if same_spk and close and len(combined) <= 15 and not text.endswith((".", "!", "?", ",")):
                text = combined
                t_to = w1["to"]
                i += 1
        norm_toks = [E.norm_word(tok) for tok in text.split()]
        emph = any(tok in HIGHLIGHTS for tok in norm_toks)
        caps.append({"text": text, "speaker": spk, "from": t_from, "to": max(t_from + 4, t_to), "emph": emph})
        i += 1
    return caps


def main():
    V = json.loads(VOICE_JSON.read_text(encoding="utf-8"))
    order = [sc["scene"] for sc in V["scenes"]]
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
            t += cfg["gaps"][i] if i < len(cfg["gaps"]) else 0.14
            speaker = ln.get("speaker", "nadia")
            y = E.load_wav(ROOT / ln["file"])
            rms = float(np.sqrt(np.mean(y**2)) + 1e-6)
            y = np.clip(y * (0.18 / rms), -0.96, 0.96).astype(np.float32)
            d = len(y) / SR
            aligned = E.align_script(ln["text"], ln["wordsSec"], d)
            words_local = [
                {"w": w, "from": int(round((t + a) * FPS)), "to": int(round((t + b) * FPS))}
                for w, a, b in aligned
            ]
            words_glob = [
                {"w": w, "speaker": speaker, "from": int(round((start + t + a) * FPS)), "to": int(round((start + t + b) * FPS))}
                for w, a, b in aligned
            ]
            all_words_global.extend(words_glob)
            entry = {
                "scene": name,
                "speaker": speaker,
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
            clips.append((start + t, y, speaker))
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
    TIMING_JSON.write_text(json.dumps(timing, indent=2, ensure_ascii=False), encoding="utf-8")

    S = {k: v["startFrame"] / FPS for k, v in scenes_meta.items()}
    EV = {k: S[EVENTS[k][0]] + v / FPS for k, v in events_local.items()}

    print(f"Operasi Woyla Total: {total:.2f}s ({total_frames} frames)")
    for k in order:
        print(f"  {k:10s} {scenes_meta[k]['durationInFrames']:4d}f  mulai {S[k]:6.2f}s")

    N = int(SR * total) + SR
    vo = np.zeros((N, 2), np.float32)
    sfx = np.zeros((N, 2), np.float32)

    for t0, y, speaker in clips:
        put(vo, y, t0, 1.0, 0.0 if speaker == "nadia" else 0.12)

    for k in order[1:]:
        if k != "klimaks":
            put(sfx, E.sfx_swoosh(0.32, abs(hash(k)) % 50 + 17), max(0.0, S[k] - 0.14), 0.28)

    put(sfx, sfx_taiko_hit(54.0, 11), S["hook"] + 0.12, 0.72, 0.0)
    put(sfx, sfx_braaam(1.8, 36.71)[:, 0], EV["hook.menit"], 0.34, 0.0)

    put(sfx, E.sfx_thump(21, 64), EV["krisis.dibajak"], 0.48, 0.15)
    put(sfx, E.sfx_thump(22, 58), EV["krisis.kokpit"], 0.42, -0.15)

    put(sfx, sfx_radio_beep(), EV["briefing.tiga"], 0.45, 0.0)
    put(sfx, sfx_radio_beep(), EV["briefing.merah"], 0.45, -0.25)
    put(sfx, sfx_radio_beep(), EV["briefing.hijau"], 0.48, 0.25)

    put(sfx, E.sfx_thump(41, 70), EV["susup.merayap"], 0.35, -0.25)
    put(sfx, E.sfx_swoosh(0.55, 42), S["susup"] + 2.8, 0.30, 0.22)

    put(sfx, sfx_radio_beep(), S["ababa"] + 0.14, 0.65, 0.12)
    put(sfx, sfx_pin_pull(), EV["ababa.pin_pull"], 0.90, 0.0)
    put(sfx, sfx_sub_drop(0.75), EV["ababa.sub_drop"], 0.92, 0.0)

    put(sfx, sfx_door_breach(), EV["klimaks.breach"], 0.95, -0.35)
    put(sfx, sfx_door_breach(), EV["klimaks.breach"] + 0.06, 0.92, 0.35)
    put(sfx, sfx_flashbang_boom(2.1), EV["klimaks.flashbang"], 1.0, 0.0)
    put(sfx, sfx_bullet_time_whiz(1.45, 61), EV["klimaks.bullettime"], 0.88, -0.45)
    put(sfx, sfx_mp5_burst(3, 62), EV["klimaks.bullettime"] + 0.75, 0.56, -0.3)
    put(sfx, sfx_bullet_time_whiz(1.35, 63), EV["klimaks.peluru"], 0.85, 0.45)
    put(sfx, sfx_mp5_burst(3, 64), EV["klimaks.peluru"] + 0.95, 0.54, 0.28)

    put(sfx, sfx_radio_beep(), EV["evakuasi.timer"], 0.50, 0.1)
    put(sfx, sfx_taiko_hit(60.0, 71), EV["evakuasi.selamat"], 0.52, 0.0)

    put(sfx, sfx_taiko_hit(50.0, 81), EV["epilog.gugur"], 0.48, 0.0)
    put(sfx, sfx_taiko_hit(54.0, 82), EV["epilog.gultor"], 0.62, 0.0)

    mus = build_woyla_score(
        total=total,
        t_susup=S["susup"],
        t_subdrop=EV["ababa.sub_drop"],
        t_breach=EV["klimaks.breach"],
        t_evac=S["evakuasi"],
        t_epilog=S["epilog"],
    )

    env = np.abs(vo[:, 0]) + np.abs(vo[:, 1])
    win = int(0.08 * SR)
    env = np.convolve(env, np.ones(win, np.float32) / win, mode="same")
    master = (
        mus[:N] * 0.56 * (1.0 / (1.0 + 4.5 * env))[:, None]
        + sfx[:N] * (1.0 / (1.0 + 0.95 * env))[:, None]
        + vo[:N] * 1.22
    )
    tt = np.arange(N) / SR
    master *= (np.minimum(1.0, tt / 0.05) * np.clip((total - tt) / 0.85, 0.0, 1.0))[:, None]
    master = np.tanh(master / (np.max(np.abs(master)) + 1e-6) * 1.50) / np.tanh(1.50) * 0.93
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
            _ffmpeg_bin(), "-y", "-v", "error", "-i", str(wav),
            "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
            "-ar", "44100", "-b:a", "192k",
            str(OUT_MP3),
        ],
        check=True,
    )
    wav.unlink(missing_ok=True)
    print(f"Selesai Operasi Woyla master audio: {OUT_MP3} & {TIMING_JSON}")


if __name__ == "__main__":
    main()

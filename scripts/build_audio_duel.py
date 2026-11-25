"""Mix multi-voice VoxCPM2 + 2-Act Stereo Soundtrack + Time-Warp Bullet-Cam SFX -> -14 LUFS.
Outputs:
  - public/audio/duel_master.mp3
  - src/duel_timing.json
"""
from __future__ import annotations

import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
FPS = 30

VOICE_JSON = ROOT / "src" / "duel_voice.json"
TIMING_JSON = ROOT / "src" / "duel_timing.json"
OUT_MP3 = ROOT / "public" / "audio" / "duel_master.mp3"


def load_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as wf:
        sr = wf.getframerate()
        y = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32767.0
    if sr != SR:
        y = signal.resample(y, int(len(y) * SR / sr)).astype(np.float32)
    return y


def put_mono(buf: np.ndarray, t_sec: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0) -> None:
    i0 = int(round(t_sec * SR))
    if i0 >= len(buf) or i0 + len(sig) <= 0:
        return
    s0 = max(0, -i0)
    d0 = max(0, i0)
    n = min(len(sig) - s0, len(buf) - d0)
    if n <= 0:
        return
    ang = (pan + 1.0) * 0.25 * np.pi
    gl = gain * np.cos(ang)
    gr = gain * np.sin(ang)
    seg = sig[s0 : s0 + n]
    buf[d0 : d0 + n, 0] += seg * gl
    buf[d0 : d0 + n, 1] += seg * gr


def put_stereo(buf: np.ndarray, t_sec: float, sig: np.ndarray, gain: float = 1.0) -> None:
    i0 = int(round(t_sec * SR))
    if i0 >= len(buf) or i0 + len(sig) <= 0:
        return
    s0 = max(0, -i0)
    d0 = max(0, i0)
    n = min(len(sig) - s0, len(buf) - d0)
    if n <= 0:
        return
    buf[d0 : d0 + n] += sig[s0 : s0 + n] * gain


def lp(y: np.ndarray, cutoff: float) -> np.ndarray:
    b, a = signal.butter(2, min(0.95, cutoff / (SR * 0.5)), btype="low")
    return signal.lfilter(b, a, y).astype(np.float32)


def hp(y: np.ndarray, cutoff: float) -> np.ndarray:
    b, a = signal.butter(2, max(0.001, cutoff / (SR * 0.5)), btype="high")
    return signal.lfilter(b, a, y).astype(np.float32)


def bp(y: np.ndarray, f0: float, f1: float) -> np.ndarray:
    b, a = signal.butter(2, [f0 / (SR * 0.5), min(0.95, f1 / (SR * 0.5))], btype="band")
    return signal.lfilter(b, a, y).astype(np.float32)


def nz(dur: float, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.standard_normal(int(dur * SR)).astype(np.float32)


def synth_pluck(freq: float, dur: float, bright: float = 2200.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    y = np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(4 * np.pi * freq * t) + 0.2 * np.sin(6 * np.pi * freq * t)
    env = np.exp(-t * 6.5) * np.minimum(1.0, t / 0.006)
    return lp(y * env, bright) * 0.35


def synth_bass(freq: float, dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    y = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t)
    env = np.exp(-t * 3.8) * np.minimum(1.0, t / 0.01)
    return lp(y * env, 420.0) * 0.48


def synth_bell(freq: float = 293.66, dur: float = 2.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    y = (
        0.6 * np.sin(2 * np.pi * freq * t) * np.exp(-t * 1.1)
        + 0.35 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t * 1.8)
        + 0.25 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 2.6)
    )
    return (y * np.minimum(1.0, t / 0.015) * 0.45).astype(np.float32)


def synth_whoosh(dur: float = 0.45) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    env = np.sin(np.pi * t / dur) ** 1.6
    w = bp(nz(dur, 42), 250.0, 2400.0)
    return (w * env * 0.6).astype(np.float32)


def synth_gunshot_trigger() -> np.ndarray:
    # Crisp hammer cock + gunshot transient
    dur = 0.45
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    boom = np.sin(2 * np.pi * (140 * np.exp(-t * 16) + 42) * t) * np.exp(-t * 9.0)
    crack = bp(nz(dur, 7), 600, 6500) * np.exp(-t * 24.0)
    return (boom * 0.75 + crack * 0.85).astype(np.float32)


def synth_time_warp_slowmo(dur: float = 3.0) -> np.ndarray:
    """Pitch-down time-warp + 52 Hz sub-bass rumble + slow heartbeat + airy tension."""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    # Pitch-down sweep at entry (first 0.35s)
    sweep_f = 340.0 * np.exp(-t * 6.5) + 48.0
    phase = 2 * np.pi * np.cumsum(sweep_f) / SR
    sub = np.sin(phase) * 0.55 + 0.3 * np.sin(2 * np.pi * 52.0 * t)
    # Two slow heartbeat thumps at 0.7s and 1.8s
    hb = np.zeros(n, dtype=np.float32)
    for ht in (0.65, 0.85, 1.75, 1.95):
        i0 = int(ht * SR)
        m = min(int(0.22 * SR), n - i0)
        if m > 0:
            tt = np.arange(m, dtype=np.float32) / SR
            hb[i0 : i0 + m] += np.sin(2 * np.pi * 56.0 * tt) * np.exp(-tt * 18.0) * 0.65
    wind = lp(nz(dur, 99), 380.0) * (0.25 + 0.25 * np.sin(np.pi * t / dur))
    env = np.minimum(1.0, t / 0.12) * np.minimum(1.0, (dur - t) / 0.08)
    return ((sub + hb + wind) * env * 0.65).astype(np.float32)


def synth_impact_crack() -> np.ndarray:
    """Razor-sharp CRACK!! metallic ricochet + revolver clatter."""
    dur = 0.85
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    crack = hp(nz(dur, 33), 900.0) * np.exp(-t * 32.0) * 1.15
    metal = (
        np.sin(2 * np.pi * 1950 * t) * np.exp(-t * 14.0)
        + 0.6 * np.sin(2 * np.pi * 3120 * t) * np.exp(-t * 18.0)
    ) * 0.5
    punch = np.sin(2 * np.pi * (180 * np.exp(-t * 25) + 45) * t) * np.exp(-t * 12.0) * 0.8
    return np.tanh(crack + metal + punch).astype(np.float32)


def main() -> None:
    voice_data = json.loads(VOICE_JSON.read_text(encoding="utf-8"))
    by_id = voice_data["byId"]

    # Schedule lines with exact beat pacing + 3.0s Bullet-Cam Slow-Mo gap after p2
    schedule_order = [
        ("hook", ["h1"], [0.22]),
        ("setup", ["s1", "s2"], [0.24, 0.28]),
        ("mocker", ["m1", "m2"], [0.22, 0.26]),
        ("eskalasi", ["e1", "e2", "e3", "e4"], [0.20, 0.16, 0.18, 0.30]),
        ("analogi", ["a1", "a2", "a3"], [0.18, 0.16, 0.32]),
        ("payoff", ["p1", "p2", "p3", "p4"], [0.16, 0.0, 0.22, 0.32]),
    ]

    PAN = {"qinmu": 0.0, "sombong": 0.16, "ara": -0.18, "bang_udin": -0.14}

    cur = 0.25
    scenes_out = []
    voice_intervals = []
    bullet_cam = {}

    for scene_name, ids, post_gaps in schedule_order:
        sc_start = cur
        lines_out = []
        for idx, (lid, gap) in enumerate(zip(ids, post_gaps)):
            src = by_id[lid]
            dur = src["durSec"]
            line_start = cur
            line_end = cur + dur
            words_out = [
                {
                    "w": w,
                    "from": int(round((line_start + a) * FPS)),
                    "to": int(round((line_start + b) * FPS)),
                }
                for w, a, b in src["wordsSec"]
            ]
            lines_out.append(
                {
                    "id": lid,
                    "speaker": src["speaker"],
                    "text": src["text"],
                    "file": src["file"],
                    "from": int(round(line_start * FPS)),
                    "to": int(round(line_end * FPS)),
                    "words": words_out,
                }
            )
            voice_intervals.append((line_start, line_end, src["speaker"], ROOT / src["file"]))

            if lid == "p2":
                # Insert 3.0s Hollywood Bullet-Cam Slow-Mo Hero Shot right after "Kena kau."
                slow_start = line_end + 0.10
                slow_end = slow_start + 3.00
                impact_t = slow_end
                bullet_cam = {
                    "triggerFrame": int(round(line_end * FPS)),
                    "slowStartFrame": int(round(slow_start * FPS)),
                    "slowEndFrame": int(round(slow_end * FPS)),
                    "impactFrame": int(round(impact_t * FPS)),
                    "slowStartSec": round(slow_start, 3),
                    "impactSec": round(impact_t, 3),
                }
                cur = impact_t + 0.55
            else:
                cur = line_end + gap

        scenes_out.append(
            {
                "scene": scene_name,
                "from": int(round(sc_start * FPS)),
                "to": int(round(cur * FPS)),
                "lines": lines_out,
            }
        )

    total_sec = cur + 0.35
    total_frames = int(round(total_sec * FPS))

    # Build stereo master buffer
    n_tot = int(round(total_sec * SR))
    voice_buf = np.zeros((n_tot, 2), dtype=np.float32)
    music_buf = np.zeros((n_tot, 2), dtype=np.float32)
    sfx_buf = np.zeros((n_tot, 2), dtype=np.float32)

    # 1. Place Voices
    for st, en, spk, wav_p in voice_intervals:
        y = load_wav(wav_p)
        put_mono(voice_buf, st, y, gain=1.05, pan=PAN.get(spk, 0.0))

    # 2. Build 2-Act Stereo Soundtrack
    analogi_sec = scenes_out[4]["from"] / FPS
    payoff_sec = scenes_out[5]["from"] / FPS
    slow_st = bullet_cam["slowStartSec"]
    impact_t = bullet_cam["impactSec"]

    # Act 1 (0 -> analogi_sec): Spaghetti Western D minor (84 BPM -> beat = 0.714s)
    beat1 = 60.0 / 84.0
    dm_notes = [146.83, 174.61, 220.0, 174.61, 130.81, 164.81, 196.0, 220.0]
    t = 0.0
    step = 0
    while t < analogi_sec:
        put_mono(music_buf, t, synth_pluck(dm_notes[step % len(dm_notes)], 0.55, 1900), gain=0.28, pan=-0.22 if step % 2 == 0 else 0.22)
        if step % 2 == 0:
            put_mono(music_buf, t, synth_bass(dm_notes[step % len(dm_notes)] * 0.5, 0.65), gain=0.32, pan=0.0)
        t += beat1 * 0.5
        step += 1

    # Act 2 (analogi_sec -> payoff_sec): Upbeat Modern Science Groove (116 BPM)
    beat2 = 60.0 / 116.0
    fm_notes = [349.23, 440.0, 523.25, 440.0, 392.0, 493.88, 587.33, 523.25]
    t = analogi_sec
    step = 0
    while t < payoff_sec:
        put_mono(music_buf, t, synth_pluck(fm_notes[step % len(fm_notes)], 0.32, 3200), gain=0.25, pan=0.18 if step % 2 else -0.18)
        if step % 2 == 0:
            put_mono(music_buf, t, synth_bass(174.61 if (step // 4) % 2 == 0 else 196.0, 0.35), gain=0.28, pan=0.0)
        t += beat2 * 0.5
        step += 1

    # Act 1 Reprise (payoff_sec -> total_sec, ducked/warped during slow-mo)
    t = payoff_sec
    step = 0
    while t < total_sec - 0.3:
        if not (slow_st - 0.15 <= t <= impact_t):
            put_mono(music_buf, t, synth_pluck(dm_notes[step % len(dm_notes)], 0.50, 2100), gain=0.30, pan=-0.2 if step % 2 == 0 else 0.2)
            if step % 2 == 0:
                put_mono(music_buf, t, synth_bass(73.42, 0.55), gain=0.35, pan=0.0)
        t += beat1 * 0.5
        step += 1

    # 3. Foley & Hollywood Bullet-Cam SFX
    # Subtle desert wind bed
    wind = lp(nz(total_sec, 11), 320.0) * 0.055
    put_mono(sfx_buf, 0.0, wind, gain=1.0, pan=0.0)
    # Church bell toll in eskalasi
    esk_sec = scenes_out[3]["from"] / FPS
    put_mono(sfx_buf, esk_sec + 0.8, synth_bell(293.66, 2.5), gain=0.32, pan=-0.3)
    # Match-cut whoosh into analogi & back to payoff
    put_mono(sfx_buf, analogi_sec - 0.15, synth_whoosh(0.45), gain=0.45, pan=0.0)
    put_mono(sfx_buf, payoff_sec - 0.15, synth_whoosh(0.45), gain=0.48, pan=0.0)
    # Bullet-Cam: Gunshot trigger -> 3.0s Time-Warp Sub-Bass -> Impact CRACK!!
    put_mono(sfx_buf, slow_st - 0.10, synth_gunshot_trigger(), gain=0.65, pan=-0.1)
    put_mono(sfx_buf, slow_st, synth_time_warp_slowmo(3.0), gain=0.85, pan=0.0)
    put_mono(sfx_buf, impact_t, synth_impact_crack(), gain=0.95, pan=0.15)

    # Dynamic ducking of music under voice
    env_voice = np.abs(voice_buf[:, 0]) + np.abs(voice_buf[:, 1])
    b_env, a_env = signal.butter(1, 8.0 / (SR * 0.5), btype="low")
    duck = np.clip(1.0 - signal.lfilter(b_env, a_env, env_voice) * 1.8, 0.28, 1.0)
    music_buf[:, 0] *= duck
    music_buf[:, 1] *= duck

    mix = np.tanh(voice_buf + music_buf * 0.82 + sfx_buf * 0.85).astype(np.float32)

    raw_wav = ROOT / "out" / "duel_mix_raw.wav"
    raw_wav.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(raw_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(mix, -1.0, 1.0) * 32767).astype(np.int16).tobytes())

    OUT_MP3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(raw_wav),
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=8",
            "-ar", "48000", "-ac", "2", "-b:a", "192k",
            str(OUT_MP3),
        ],
        check=True,
    )

    timing = {
        "fps": FPS,
        "totalFrames": total_frames,
        "totalSec": round(total_sec, 2),
        "bulletCam": bullet_cam,
        "scenes": scenes_out,
    }
    TIMING_JSON.write_text(json.dumps(timing, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Built {OUT_MP3} & {TIMING_JSON} -> {total_sec:.2f}s ({total_frames} frames)")


if __name__ == "__main__":
    main()

import io
import math
import subprocess
import wave
from pathlib import Path
import numpy as np
from kokoro_onnx import Kokoro
from scipy import signal

SR = 44100
DURATION = 30.0
N_SAMPLES = int(SR * DURATION)

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "voices" / "kokoro-fp32.onnx"
VOICES_PATH = ROOT / "voices" / "kokoro-voices.npz"
OUT_DIR = ROOT / "public" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)

print("Loading Kokoro-82M v1.0 expressive neural voice model...")
kokoro = Kokoro(str(MODEL_PATH), str(VOICES_PATH))
# Blend British documentary baritone (bm_george) + expressive American narrator (am_michael)
DOC_VOICE = 0.55 * kokoro.get_voice_style("bm_george") + 0.45 * kokoro.get_voice_style("am_michael")


def synth_speech(text: str, speed: float = 1.0) -> np.ndarray:
    """Synthesize expressive documentary narration with Kokoro-82M and resample to 44.1 kHz."""
    samples, orig_sr = kokoro.create(text, voice=DOC_VOICE, speed=speed, lang="en-us")
    raw = np.asarray(samples, dtype=np.float32)
    if orig_sr != SR:
        num = int(len(raw) * SR / orig_sr)
        raw = signal.resample(raw, num)
    # Trim leading/trailing silence while keeping natural breath decay
    idx = np.where(np.abs(raw) > 0.006)[0]
    if len(idx) > 0:
        raw = raw[max(0, idx[0] - int(0.015 * SR)) : min(len(raw), idx[-1] + int(0.06 * SR))]
    # Warm broadcast condenser mic EQ (gentle 80Hz highpass + subtle 3.5kHz presence)
    b, a = signal.butter(2, 80 / (SR / 2), btype="highpass")
    raw = signal.lfilter(b, a, raw)
    peak = np.max(np.abs(raw)) + 1e-6
    raw = np.tanh(raw / peak * 1.35) / np.tanh(1.35)
    return raw.astype(np.float32)


def add_clip(mix: np.ndarray, clip: np.ndarray, start_s: float, gain: float = 1.0, pan: float = 0.0):
    """Add mono or stereo clip into stereo mix (shape: [N, 2]) at start_s."""
    idx0 = int(start_s * SR)
    if idx0 >= N_SAMPLES or idx0 + len(clip) <= 0:
        return
    if idx0 < 0:
        clip = clip[-idx0:]
        idx0 = 0
    idx1 = min(N_SAMPLES, idx0 + len(clip))
    seg = clip[: idx1 - idx0]
    if seg.ndim == 1:
        l_gain = gain * math.cos((pan + 1) * math.pi / 4)
        r_gain = gain * math.sin((pan + 1) * math.pi / 4)
        mix[idx0:idx1, 0] += seg * l_gain
        mix[idx0:idx1, 1] += seg * r_gain
    else:
        mix[idx0:idx1] += seg * gain


# ---------------------------------------------------------------------------
# Procedural SFX Generators
# ---------------------------------------------------------------------------
def sfx_taiko(dur: float = 0.85, f0: float = 95.0, f1: float = 38.0) -> np.ndarray:
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    freq = f1 + (f0 - f1) * np.exp(-t * 18)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 4.8)
    sub = np.sin(phase * 0.5) * np.exp(-t * 3.2) * 0.7
    # wooden rim / skin slap transient
    rng = np.random.default_rng(42)
    noise = rng.standard_normal(len(t)) * np.exp(-t * 45)
    b, a = signal.butter(2, [200 / (SR / 2), 1800 / (SR / 2)], btype="bandpass")
    attack = signal.lfilter(b, a, noise) * 0.9
    out = np.tanh((body + sub + attack) * 1.8)
    return out.astype(np.float32)


def sfx_thunder(dur: float = 2.8, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = rng.standard_normal(len(t))
    # Crack at the start + rolling low rumble
    env_crack = np.exp(-t * 22) * 1.4
    env_rumble = (np.exp(-t * 1.1) - np.exp(-t * 12)) * (0.7 + 0.3 * np.sin(t * 9))
    b_low, a_low = signal.butter(3, 180 / (SR / 2), btype="lowpass")
    b_mid, a_mid = signal.butter(2, [150 / (SR / 2), 2400 / (SR / 2)], btype="bandpass")
    rumble = signal.lfilter(b_low, a_low, noise) * env_rumble * 3.5
    crack = signal.lfilter(b_mid, a_mid, noise) * env_crack * 2.0
    return np.tanh(rumble + crack).astype(np.float32)


def sfx_explosion(dur: float = 2.6, seed: int = 10) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = rng.standard_normal(len(t))
    # Sub-bass punch
    freq = 32 + 90 * np.exp(-t * 16)
    punch = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 4.5) * 1.4
    # Blast wave roar
    b_blast, a_blast = signal.butter(3, 420 / (SR / 2), btype="lowpass")
    blast = signal.lfilter(b_blast, a_blast, noise) * np.exp(-t * 1.8) * 3.0
    # High shrapnel hiss/debris
    b_hi, a_hi = signal.butter(2, [900 / (SR / 2), 6500 / (SR / 2)], btype="bandpass")
    debris = signal.lfilter(b_hi, a_hi, noise) * np.exp(-t * 3.5) * 1.2
    return np.tanh((punch + blast + debris) * 1.5).astype(np.float32)


def sfx_fuse(dur: float = 7.5) -> np.ndarray:
    rng = np.random.default_rng(77)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = rng.standard_normal(len(t))
    b, a = signal.butter(2, [2200 / (SR / 2), 9500 / (SR / 2)], btype="bandpass")
    sizzle = signal.lfilter(b, a, noise)
    mod = 0.5 + 0.5 * np.sin(t * 23) * np.cos(t * 37)
    # Random spark pops
    pops = (rng.random(len(t)) > 0.9992).astype(np.float32) * 2.5
    pops = signal.lfilter(b, a, pops)
    fade = np.minimum(1.0, t / 0.3) * np.minimum(1.0, (dur - t) / 0.3)
    return ((sizzle * mod * 0.4 + pops) * fade).astype(np.float32)


def sfx_katana(dur: float = 0.9) -> np.ndarray:
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Metallic resonant partials + slide noise
    partials = [1820, 2740, 3910, 5120, 6800]
    ring = sum(np.sin(2 * np.pi * f * (1 + 0.04 * np.exp(-t * 12)) * t) * np.exp(-t * (4 + i)) for i, f in enumerate(partials))
    rng = np.random.default_rng(99)
    scrape = rng.standard_normal(len(t)) * np.exp(-t * 14)
    b, a = signal.butter(2, [1500 / (SR / 2), 8000 / (SR / 2)], btype="bandpass")
    scrape = signal.lfilter(b, a, scrape)
    return np.tanh((ring * 0.22 + scrape * 0.7) * 1.5).astype(np.float32)


def sfx_chain_clank(dur: float = 1.1, seed: int = 5) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros_like(t)
    for offset in [0.0, 0.14, 0.29]:
        dt = np.maximum(0, t - offset)
        mask = (t >= offset).astype(np.float32)
        freqs = [620, 980, 1540, 2420, 3680]
        hit = sum(np.sin(2 * np.pi * f * dt) * np.exp(-dt * (12 + i * 3)) for i, f in enumerate(freqs))
        noise = rng.standard_normal(len(t)) * np.exp(-dt * 30)
        b, a = signal.butter(2, [700 / (SR / 2), 5000 / (SR / 2)], btype="bandpass")
        out += mask * (hit * 0.25 + signal.lfilter(b, a, noise) * 0.8)
    return np.tanh(out * 1.4).astype(np.float32)


def sfx_chime(freq: float = 880.0, dur: float = 0.45) -> np.ndarray:
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    sig = (np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2 * t)) * np.exp(-t * 9)
    return (sig * 0.6).astype(np.float32)


def sfx_whoosh(dur: float = 0.7) -> np.ndarray:
    rng = np.random.default_rng(12)
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    noise = rng.standard_normal(len(t))
    b, a = signal.butter(2, [180 / (SR / 2), 1400 / (SR / 2)], btype="bandpass")
    env = np.sin(np.pi * (t / dur)) ** 2
    return (signal.lfilter(b, a, noise) * env * 1.5).astype(np.float32)


def build_music_bed(seed: int = 100, mode: str = "part1") -> np.ndarray:
    """30-second stereo cinematic dark Japanese-scale soundtrack + ocean & wind."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    bed = np.zeros((N_SAMPLES, 2), dtype=np.float32)

    # 1. Ocean waves & wind ambience
    noise_l = rng.standard_normal(N_SAMPLES)
    noise_r = rng.standard_normal(N_SAMPLES)
    b, a = signal.butter(2, 320 / (SR / 2), btype="lowpass")
    swell = 0.45 + 0.35 * np.sin(2 * np.pi * 0.14 * t)
    bed[:, 0] += signal.lfilter(b, a, noise_l) * swell * 0.18
    bed[:, 1] += signal.lfilter(b, a, noise_r) * swell * 0.18

    # 2. Deep cinematic minor drone (D1 = 36.71 Hz, D2 = 73.42 Hz, A2 = 110 Hz)
    drone_freqs = [36.71, 73.42, 110.0, 116.54]  # D + A + Bb (Insen / Phrygian tension)
    for i, f in enumerate(drone_freqs):
        lfo = 0.7 + 0.3 * np.sin(2 * np.pi * (0.11 + i * 0.04) * t + i)
        tone = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t)) * lfo * 0.055
        bed[:, 0] += tone * (0.8 if i % 2 == 0 else 1.0)
        bed[:, 1] += tone * (1.0 if i % 2 == 0 else 0.8)

    # 3. Koto / Shamisen plucked ostinato in D Insen scale: D3, Eb3, G3, A3, C4, D4
    scale = [146.83, 155.56, 196.00, 220.00, 261.63, 293.66]
    pattern = [0, 3, 2, 1, 0, 4, 3, 2] if mode == "part1" else [0, 2, 3, 5, 4, 3, 1, 0]
    step = 0.5  # 120 BPM eighth notes
    for i, s_time in enumerate(np.arange(0.5, 29.0, step)):
        note_f = scale[pattern[i % len(pattern)]]
        nt = np.linspace(0, 0.45, int(SR * 0.45), endpoint=False)
        pluck = (
            np.sin(2 * np.pi * note_f * nt)
            + 0.5 * np.sin(2 * np.pi * note_f * 2 * nt) * np.exp(-nt * 12)
            + 0.25 * np.sin(2 * np.pi * note_f * 3 * nt) * np.exp(-nt * 22)
        ) * np.exp(-nt * 6.5)
        pan = -0.35 if i % 2 == 0 else 0.35
        add_clip(bed, pluck.astype(np.float32), s_time, gain=0.07, pan=pan)

    # 4. Rhythmic Taiko pulse every 2.0 seconds
    taiko_hit = sfx_taiko(0.75, 85, 36)
    for beat in np.arange(0.2, 29.0, 2.0):
        add_clip(bed, taiko_hit, beat, gain=0.22)

    return bed


def duck_and_export(bed: np.ndarray, sfx_mix: np.ndarray, vo_mix: np.ndarray, out_mp3: Path):
    """Sidechain-duck the music bed when voiceover speaks, sum all layers, and encode MP3."""
    # Compute smooth voiceover envelope for ducking
    vo_mono = np.abs(vo_mix[:, 0]) + np.abs(vo_mix[:, 1])
    win = int(0.08 * SR)
    kernel = np.ones(win, dtype=np.float32) / win
    env = np.convolve(vo_mono, kernel, mode="same")
    duck_music = 1.0 / (1.0 + 3.2 * env)
    duck_sfx = 1.0 / (1.0 + 1.1 * env)

    master = bed * duck_music[:, None] + sfx_mix * duck_sfx[:, None] + vo_mix * 1.15
    # Fade in first 0.15s, fade out last 0.4s
    fade_in = np.minimum(1.0, np.linspace(0, DURATION, N_SAMPLES) / 0.15)
    fade_out = np.minimum(1.0, np.linspace(DURATION, 0, N_SAMPLES) / 0.4)
    master *= (fade_in * fade_out)[:, None]

    # Soft mastering limiter
    peak = np.max(np.abs(master)) + 1e-6
    master = np.tanh(master / peak * 1.6) / np.tanh(1.6) * 0.92

    wav_path = out_mp3.with_suffix(".wav")
    pcm = (np.clip(master, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())

    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "192k", str(out_mp3)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wav_path.unlink(missing_ok=True)
    print(f"Created {out_mp3} ({out_mp3.stat().st_size // 1024} KB)")


def build_part1():
    print("Synthesizing Part 1 soundtrack + SFX + voiceover...")
    bed = build_music_bed(seed=101, mode="part1")
    sfx = np.zeros((N_SAMPLES, 2), dtype=np.float32)
    vo = np.zeros((N_SAMPLES, 2), dtype=np.float32)

    # Scene 1: Hook (0.0s - 4.0s)
    add_clip(sfx, sfx_thunder(2.6, 1), 0.38, gain=0.55, pan=0.2)
    add_clip(sfx, sfx_taiko(0.9, 100, 35), 0.53, gain=0.5)
    add_clip(sfx, sfx_thunder(2.8, 2), 2.33, gain=0.65, pan=-0.2)
    add_clip(sfx, sfx_taiko(1.1, 110, 32), 2.33, gain=0.65)

    # Scene 2: Fleet (4.0s - 11.0s)
    add_clip(sfx, sfx_whoosh(0.8), 4.00, gain=0.45)
    add_clip(sfx, sfx_taiko(0.9, 90, 36), 4.45, gain=0.45)
    add_clip(sfx, sfx_taiko(0.9, 95, 34), 7.60, gain=0.5)

    # Scene 3: Weapon (11.0s - 19.0s)
    add_clip(sfx, sfx_whoosh(0.7), 11.00, gain=0.45)
    add_clip(sfx, sfx_fuse(7.6), 11.15, gain=0.42)
    add_clip(sfx, sfx_chime(520, 0.8), 12.33, gain=0.4)
    add_clip(sfx, sfx_whoosh(0.6), 14.73, gain=0.5)  # Bomb splits open
    add_clip(sfx, sfx_chime(740, 0.4), 15.13, gain=0.45, pan=-0.3)
    add_clip(sfx, sfx_chime(880, 0.4), 15.60, gain=0.45, pan=0.3)
    add_clip(sfx, sfx_chime(1046, 0.5), 16.07, gain=0.45, pan=-0.2)
    add_clip(sfx, sfx_whoosh(0.9), 17.87, gain=0.6)  # Bomb thrown

    # Scene 4: Thunder (19.0s - 26.0s)
    add_clip(sfx, sfx_katana(0.9), 19.27, gain=0.55)
    add_clip(sfx, sfx_explosion(2.8, 10), 21.20, gain=0.95, pan=-0.15)  # BOOM!
    add_clip(sfx, sfx_explosion(2.5, 11), 22.07, gain=0.80, pan=0.25)
    add_clip(sfx, sfx_explosion(2.6, 12), 22.67, gain=0.85, pan=-0.25)

    # Scene 5: Outro (26.0s - 30.0s)
    add_clip(sfx, sfx_thunder(2.4, 3), 26.20, gain=0.5)
    add_clip(sfx, sfx_thunder(2.8, 4), 27.47, gain=0.75)
    add_clip(sfx, sfx_taiko(1.2, 115, 30), 27.47, gain=0.75)

    # Voiceover lines with natural documentary pauses & intonation cues
    lines = [
        (0.30, "Why did the samurai... fear the Flying Thunder?", 1.02),
        (4.25, "In twelve seventy-four, nearly nine hundred Mongol warships appeared on the horizon.", 1.06),
        (8.15, "Kublai Khan... demanded Japan's surrender!", 1.02),
        (11.15, "They brought a weapon Japan had never seen... the Tetsu-ho.", 1.04),
        (14.80, "A ceramic shell, packed with gunpowder and iron shrapnel.", 1.05),
        (19.05, "Samurai fought with honor — one warrior against another.", 1.05),
        (21.70, "Then, the sky exploded! Fire, iron, and a roar like thunder!", 1.03),
        (26.05, "But Japan had one more ally... Kami-kah-zay, the Divine Wind.", 1.02),
    ]
    for start_s, text, spd in lines:
        clip = synth_speech(text, speed=spd)
        add_clip(vo, clip, start_s, gain=1.0)

    duck_and_export(bed, sfx, vo, OUT_DIR / "part1_master.mp3")


def build_part2():
    print("Synthesizing Part 2 soundtrack + SFX + voiceover...")
    bed = build_music_bed(seed=202, mode="part2")
    sfx = np.zeros((N_SAMPLES, 2), dtype=np.float32)
    vo = np.zeros((N_SAMPLES, 2), dtype=np.float32)

    # Scene 1: Hook (0.0s - 4.0s)
    add_clip(sfx, sfx_thunder(2.7, 21), 0.33, gain=0.6, pan=-0.2)
    add_clip(sfx, sfx_taiko(1.0, 105, 34), 0.45, gain=0.55)
    add_clip(sfx, sfx_thunder(2.9, 22), 2.27, gain=0.7, pan=0.2)
    add_clip(sfx, sfx_taiko(1.1, 115, 32), 2.27, gain=0.65)

    # Scene 2: Stone Wall of Hakata (4.0s - 11.0s)
    add_clip(sfx, sfx_whoosh(0.8), 4.00, gain=0.45)
    add_clip(sfx, sfx_katana(0.85), 4.60, gain=0.5, pan=-0.2)
    add_clip(sfx, sfx_taiko(0.9, 95, 35), 7.60, gain=0.5)
    add_clip(sfx, sfx_katana(0.85), 8.20, gain=0.45, pan=0.25)

    # Scene 3: Chained Fleet (11.0s - 19.0s)
    add_clip(sfx, sfx_whoosh(0.7), 11.00, gain=0.45)
    add_clip(sfx, sfx_chain_clank(1.1, 31), 12.20, gain=0.65)
    add_clip(sfx, sfx_chain_clank(1.2, 32), 14.73, gain=0.75)
    add_clip(sfx, sfx_chime(660, 0.4), 15.13, gain=0.45, pan=-0.3)
    add_clip(sfx, sfx_chime(820, 0.4), 15.60, gain=0.45, pan=0.3)
    add_clip(sfx, sfx_chime(990, 0.5), 16.07, gain=0.45, pan=-0.2)

    # Scene 4: Typhoon Strikes (19.0s - 26.0s)
    add_clip(sfx, sfx_thunder(3.0, 41), 19.20, gain=0.65)
    add_clip(sfx, sfx_explosion(2.7, 51), 21.13, gain=0.90, pan=-0.2)  # CRUSHED! Hull smash 1
    add_clip(sfx, sfx_chain_clank(1.1, 52), 21.25, gain=0.7)
    add_clip(sfx, sfx_explosion(2.5, 53), 22.07, gain=0.80, pan=0.25)  # Hull smash 2
    add_clip(sfx, sfx_explosion(2.6, 54), 22.93, gain=0.85, pan=-0.15)  # Hull smash 3

    # Scene 5: Dawn Outro (26.0s - 30.0s)
    add_clip(sfx, sfx_katana(1.0), 26.30, gain=0.55)
    add_clip(sfx, sfx_taiko(1.3, 110, 30), 27.40, gain=0.7)
    add_clip(sfx, sfx_chime(587.33, 1.4), 27.40, gain=0.45)

    lines = [
        (0.25, "Part Two... How the Divine Wind crushed the largest fleet in history!", 1.05),
        (4.20, "Kublai Khan returned, with four thousand four hundred warships.", 1.04),
        (7.70, "But samurai built a twenty-kilometer stone wall to block every beach!", 1.06),
        (11.15, "Raided at night, the Mongols chained their warships into a floating fortress.", 1.06),
        (15.00, "It stopped the samurai... but created a deadly trap in open water.", 1.05),
        (19.05, "On August fifteenth, a super typhoon slammed the bay!", 1.04),
        (21.65, "Chained together, thousands of ships smashed each other apart, and sank.", 1.05),
        (26.05, "The samurai called it Kami-kah-zay... Japan stood unconquered for six hundred years.", 1.05),
    ]
    for start_s, text, spd in lines:
        clip = synth_speech(text, speed=spd)
        add_clip(vo, clip, start_s, gain=1.0)

    duck_and_export(bed, sfx, vo, OUT_DIR / "part2_master.mp3")


if __name__ == "__main__":
    build_part1()
    build_part2()

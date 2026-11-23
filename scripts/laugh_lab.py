"""Build natural-sounding laughs from short cloned-voice syllables (instead of a flat TTS 'ha ha ha')."""
import importlib.util, subprocess, sys, wave
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("g", ROOT / "scripts" / "build_audio_genderuwo.py")
g = importlib.util.module_from_spec(spec); sys.modules["g"] = g; spec.loader.exec_module(g)
np, SR = g.np, g.SR
OUT = ROOT / "out" / "laugh"; OUT.mkdir(parents=True, exist_ok=True)
CACHE = OUT / "syl"; CACHE.mkdir(exist_ok=True)

narr_wav = g.prepare_voice_prompt("voices/id_prompts/youtube_8ofVl1KpViI_ref.wav")
state = g.tts_model.get_state_for_audio_prompt(str(narr_wav))

def trim(x, th=0.03):
    idx = np.where(np.abs(x) > th)[0]
    if len(idx) == 0: return x
    return x[max(0, idx[0] - 200): idx[-1] + 400]

def syllables(text, n=6):
    f = CACHE / (text.replace("!", "").replace(".", "") + ".npy")
    if f.exists(): return list(np.load(f, allow_pickle=True))
    out = []
    for i in range(n):
        c = trim(g.synth_id_cloned(state, text, target_max_s=None))
        if 0.12 < len(c) / SR < 0.9: out.append(c.astype(np.float32))
    np.save(f, np.array(out, dtype=object), allow_pickle=True)
    return out

def shift(x, ratio, tempo=1.0):
    af = f"asetrate={int(SR * ratio)},aresample={SR},atempo={max(0.5, min(2.0, tempo / ratio)):.3f}"
    return g.ffmpeg_filter(x, af)

def env(x, a=0.01, r=0.06):
    n = len(x); t = np.arange(n) / SR
    return x * np.minimum(1, t / a) * np.minimum(1, (n / SR - t) / r)

def breath(dur=0.45, seed=1, gain=0.12):
    rng = np.random.default_rng(seed); n = int(SR * dur); t = np.arange(n) / SR
    x = g._bp(rng.standard_normal(n), 600, 3500) * np.sin(np.pi * t / dur) ** 1.5
    return (x / (np.max(np.abs(x)) + 1e-9) * gain).astype(np.float32)

def laugh(sylls, count=8, p0=1.0, p1=0.82, gap0=0.05, gap1=0.12, tempo=1.25, a0=1.0, a1=0.55, seed=0, inhale=True, wobble=0.04):
    rng = np.random.default_rng(seed)
    parts = []
    for i in range(count):
        k = i / max(1, count - 1)
        s = sylls[rng.integers(len(sylls))]
        ratio = (p0 + (p1 - p0) * k) * (1 + rng.uniform(-wobble, wobble))
        c = env(shift(s, ratio, tempo * (1 + rng.uniform(-0.08, 0.08))), 0.005, 0.05)
        c = c[: int(SR * min(len(c) / SR * 0.85, 0.2 + 0.06 * rng.random()))]
        c = env(c, 0.004, 0.04) * (a0 + (a1 - a0) * k)
        parts.append(c)
        parts.append(np.zeros(int(SR * (gap0 + (gap1 - gap0) * k) * (1 + rng.uniform(-0.2, 0.2))), np.float32))
    if inhale:
        parts.append(np.zeros(int(SR * 0.08), np.float32))
        parts.append(breath(0.5, seed + 3))
    x = np.concatenate(parts)
    return g.norm_rms(x, 0.12)

def save(x, name):
    x = np.clip(x / (np.max(np.abs(x)) + 1e-9) * 0.9, -1, 1)
    w = OUT / f"{name}.wav"
    with wave.open(str(w), "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-i", str(w), "-b:a", "160k", str(OUT / f"{name}.mp3")], check=True)
    print("saved", name, f"{len(x)/SR:.2f}s")

ha = syllables("Ha!", 8) + syllables("Hah!", 6)
ho = syllables("Ho!", 8)
he = syllables("He!", 8)
print("syllables", len(ha), len(ho), len(he))
# Raja: deep belly laugh, starts HO HO then rolls into HA HA HA, slows down
raja = np.concatenate([laugh(ho, 3, 0.78, 0.76, 0.16, 0.18, 1.0, 1.0, 0.95, seed=1, inhale=False), np.zeros(int(SR * 0.06), np.float32), laugh(ha, 9, 0.84, 0.72, 0.04, 0.14, 1.25, 1.0, 0.5, seed=2)])
raja = g.reverb(raja, rt=0.9, wet=0.18)
save(raja, "tawa_raja")
# Abu Nawas: sly quick giggle he-he-he, higher, short
abu = laugh(he, 6, 1.08, 1.0, 0.035, 0.07, 1.45, 0.9, 0.6, seed=4, inhale=False, wobble=0.03)
save(abu, "tawa_abu_licik")
# Abu Nawas: big happy laugh
abu2 = laugh(ha, 10, 1.05, 0.9, 0.035, 0.12, 1.35, 1.0, 0.5, seed=7)
save(abu2, "tawa_abu_lepas")
# court crowd: 6 layered laughs at different pitches/offsets + reverb
n = int(SR * 3.6); crowd = np.zeros(n, np.float32)
for i, (p, off) in enumerate([(0.75, 0.0), (0.88, 0.15), (1.0, 0.32), (0.82, 0.5), (1.12, 0.2), (0.95, 0.7)]):
    l = laugh(ha if i % 2 else ho, 7 + i % 3, p, p * 0.85, 0.05, 0.13, 1.3, 1.0, 0.45, seed=10 + i, inhale=i % 3 == 0)
    st = int(SR * off); m = min(len(l), n - st); crowd[st:st + m] += l[:m] * (0.9 - 0.08 * i)
crowd = g.reverb(crowd, rt=1.3, wet=0.3)
save(crowd, "tawa_istana_ramai")
# for comparison: plain TTS of the word
plain = trim(g.synth_id_cloned(state, "Hahahaha!", target_max_s=None))
save(plain, "pembanding_tts_datar")

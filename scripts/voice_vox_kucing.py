"""Generator suara VoxCPM2 ULTRA-EKSPRESIF (10 emosi + seleksi prosodi F0 otomatis + efek suara Pak Direktur CIA)
untuk "Kucing Mata-Mata CIA $20 Juta (Operation Acoustic Kitty, 1966)".

Berjalan di GPU Colab (T4/L4 — ~45 detik untuk 19 baris!) maupun CPU lokal.
Pakai:
  python scripts/voice_vox_kucing.py scripts/naskah/kucing.json kucing
"""
import difflib
import gc
import json
import re
import subprocess
import sys
import time
import wave
from pathlib import Path
import numpy as np
import torch

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
WORK = ROOT / "out" / "voice"
WORK.mkdir(parents=True, exist_ok=True)
CAST = json.loads((ROOT / "voices" / "pengisi_suara.json").read_text())
DEFAULT_VOICE = CAST["default"]

# 10 Gaya Akting Suara Ultra-Ekspresif!
STYLE = {
    "narasi":  "lively dramatic storyteller, warm, crisp, dynamic intonation, engaging pacing",
    "santai":  "casual, amused, cheerful, playful witty banter, expressive smile in voice",
    "sombong": "boastful, overly proud, theatrical James Bond confidence, smug grinning tone",
    "tegas":   "commanding, energetic, confident, bold enthusiastic explanation",
    "bisik":   "sneaky hushed whisper, conspiratorial secret agent tone, tense quiet voice",
    "sindir":  "teasing, amused sarcastic skepticism, playful raised eyebrow tone, witty",
    "tanya":   "disbelieving, genuinely amazed questioning exclamation, high rising pitch at end",
    "kaget":   "shocked loud gasp, sudden startled exclamation, high dramatic pitch spike",
    "panik":   "frantic panicked shouting, urgent breathless alarm, fast high energy",
    "marah":   "furious booming angry boss shouting in total outrage, explosive commanding yell",
    "pasrah":  "defeated weary sighing comedy resignation, dry humorous deadpan letdown",
}

CFG_BY_STYLE = {
    "narasi":  2.10,
    "santai":  2.20,
    "sombong": 2.38,
    "tegas":   2.35,
    "bisik":   2.18,
    "sindir":  2.35,
    "tanya":   2.48,
    "kaget":   2.60,
    "panik":   2.55,
    "marah":   2.65,
    "pasrah":  2.25,
}

_NUM = r"\b(se|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu|juta|nol)\b"


def letters(x: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(_NUM, " ", x.lower()))


def measure_prosody(y: np.ndarray, sr: int) -> dict:
    hop = int(sr * 0.015)
    win = int(sr * 0.040)
    min_lag = max(1, int(sr / 480))
    max_lag = max(min_lag + 1, int(sr / 75))
    f0s = []
    for start in range(0, max(1, len(y) - win), hop):
        frame = y[start : start + win]
        rms = float(np.sqrt(np.mean(frame * frame)) + 1e-9)
        if rms < 0.015:
            continue
        frame = frame - np.mean(frame)
        ac = np.correlate(frame, frame, mode="full")[len(frame) - 1 :]
        if ac[0] <= 1e-9:
            continue
        seg = ac[min_lag : min(max_lag, len(ac))]
        if len(seg) == 0:
            continue
        idx = int(np.argmax(seg))
        if seg[idx] / ac[0] > 0.35:
            f0s.append(sr / (min_lag + idx))
    if len(f0s) < 6:
        return {"range_st": 0.0, "end_rise": 0.0}
    arr = np.array(f0s)
    st = 12.0 * np.log2(arr / np.median(arr))
    range_st = float(np.percentile(st, 92) - np.percentile(st, 8))
    end_rise = float(np.mean(st[-max(3, len(st) // 5) :]) - np.mean(st[: max(3, len(st) // 2)]))
    return {"range_st": range_st, "end_rise": end_rise}


def prosody_score(style: str, m: dict) -> float:
    rng, rise = m["range_st"], m["end_rise"]
    if style == "tanya":
        return rng * 0.7 + max(0.0, rise) * 2.5
    if style in ("kaget", "panik", "marah"):
        return rng * 1.4
    if style in ("sindir", "sombong"):
        return rng * 1.15
    return rng


def trim_silence(y: np.ndarray, sr: int, thr: float = 0.008) -> np.ndarray:
    a = np.abs(y)
    idx = np.where(a > thr)[0]
    if len(idx) == 0:
        return y
    pad = int(sr * 0.03)
    return y[max(0, idx[0] - pad) : min(len(y), idx[-1] + pad)]


def write_wav(path: Path, y: np.ndarray, sr: int):
    y = np.clip(y, -1.0, 1.0)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((y * 32767).astype(np.int16).tobytes())


def read_wav(path: Path):
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        raw = w.readframes(n)
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32767.0, sr


def apply_director_radio_fx(in_wav: Path, out_wav: Path):
    """Deepen CIA Director voice (-2.4 semitones) + punchy 1960s spy-radio warmth so he sounds distinct & booming!"""
    # Pitch down by ~2.4 semitones while preserving duration via asetrate + atempo
    ratio = 2.0 ** (-2.4 / 12.0)  # ~0.8705
    cmd = [
        "ffmpeg", "-y", "-i", str(in_wav),
        "-af", f"asetrate=44100*{ratio:.5f},aresample=44100,atempo={1.0/ratio:.5f},"
               f"highpass=f=180,lowpass=f=4800,equalizer=f=1400:t=q:w=1.2:g=4.5,acompressor=threshold=-16dB:ratio=4:makeup=4",
        "-ar", "44100", "-ac", "1", str(out_wav),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_prompt_path(voice_key: str) -> str:
    # 'direktur' clones from dodi with booming angry direction + radio pitch FX
    vk = "dodi" if voice_key == "direktur" else voice_key
    entry = CAST["voices"].get(vk, CAST["voices"][DEFAULT_VOICE])
    return str(ROOT / entry["file"])


def phase1_generate(script: list, slug: str):
    out_dir = WORK / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    missing = []
    for sc in script:
        sname = sc["scene"]
        for i, row in enumerate(sc["lines"]):
            p = out_dir / f"{sname}_{i}.wav"
            if not p.exists():
                missing.append((sname, i, row, sc.get("takes", 2), p))
    if not missing:
        print("Phase 1: all wavs cached!", flush=True)
        return

    from voxcpm import VoxCPM
    print(f"Loading VoxCPM2 for {len(missing)} lines (cuda={torch.cuda.is_available()})...", flush=True)
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2")
    sr = model.tts_model.sample_rate

    for sname, i, row, takes, out_p in missing:
        style, text, vkey = row[0], row[1], row[2]
        ref_wav = build_prompt_path(vkey)
        prompt_desc = STYLE.get(style, STYLE["narasi"])
        cfg = CFG_BY_STYLE.get(style, 2.2)
        styled_text = f"({prompt_desc}){text}"

        best_y, best_sc, best_m = None, -1e9, None
        n_takes = max(2, takes) if style in ("kaget", "panik", "marah", "tanya", "sindir", "sombong") else takes
        for tk in range(n_takes):
            t0 = time.time()
            y = model.generate(
                text=styled_text,
                reference_wav_path=ref_wav,
                cfg_value=cfg + tk * 0.08,
                inference_timesteps=12,
                normalize=True,
                denoise=False,
            )
            y = trim_silence(np.asarray(y, dtype=np.float32), sr)
            m = measure_prosody(y, sr)
            sc_val = prosody_score(style, m)
            print(f"  [{sname}_{i} {vkey}/{style}] take {tk+1}/{n_takes}: {len(y)/sr:.2f}s range={m['range_st']:.1f}st rise={m['end_rise']:.1f} ({time.time()-t0:.1f}s)", flush=True)
            if sc_val > best_sc:
                best_y, best_sc, best_m = y, sc_val, m
            # Early stop if already very expressive
            if m["range_st"] >= (7.5 if style in ("kaget", "panik", "marah", "tanya") else 5.5):
                break

        raw_p = out_dir / f"{sname}_{i}_raw.wav"
        write_wav(raw_p, best_y, sr)
        if vkey == "direktur":
            apply_director_radio_fx(raw_p, out_p)
            raw_p.unlink(missing_ok=True)
        else:
            # Resample cleanly to 44100 Hz mono + subtle loudness balance
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(raw_p), "-ar", "44100", "-ac", "1", str(out_p)],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            raw_p.unlink(missing_ok=True)

    del model
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def phase2_align(script: list, slug: str):
    import whisper
    out_dir = WORK / slug
    print("Loading Whisper small for word-level alignment...", flush=True)
    wmodel = whisper.load_model("small")

    lines_out = []
    scenes_out = {}
    all_pcm = []
    sr = 44100
    cursor = 0.0

    for sc in script:
        sname = sc["scene"]
        sc_lines = []
        for i, row in enumerate(sc["lines"]):
            style, text, vkey = row[0], row[1], row[2]
            wav_p = out_dir / f"{sname}_{i}.wav"
            y, wsr = read_wav(wav_p)
            dur = len(y) / wsr

            res = wmodel.transcribe(str(wav_p), language="id", word_timestamps=True, fp16=torch.cuda.is_available())
            w_raw = []
            for seg in res.get("segments", []):
                for wd in seg.get("words", []):
                    w_raw.append((wd["word"].strip(), float(wd["start"]), float(wd["end"])))

            # Align script words cleanly to Whisper word timestamps
            target_words = [w for w in text.split() if w.strip()]
            aligned = []
            if w_raw and target_words:
                s_let = [letters(w) for w in target_words]
                r_let = [letters(w[0]) for w in w_raw]
                sm = difflib.SequenceMatcher(None, s_let, r_let)
                matched = {}
                for tag, i1, i2, j1, j2 in sm.get_opcodes():
                    if tag == "equal":
                        for k in range(i2 - i1):
                            matched[i1 + k] = (w_raw[j1 + k][1], w_raw[j1 + k][2])
                    elif tag == "replace":
                        t_start = w_raw[j1][1]
                        t_end = w_raw[j2 - 1][2]
                        cnt = max(1, i2 - i1)
                        for k in range(i2 - i1):
                            a = t_start + (t_end - t_start) * (k / cnt)
                            b = t_start + (t_end - t_start) * ((k + 1) / cnt)
                            matched[i1 + k] = (a, b)
                # Fill any unmatched words by interpolation
                for idx, tw in enumerate(target_words):
                    if idx in matched:
                        st_t, en_t = matched[idx]
                    else:
                        prev_t = matched[idx - 1][1] if (idx - 1) in matched else (dur * idx / len(target_words))
                        next_t = matched[idx + 1][0] if (idx + 1) in matched else min(dur, prev_t + dur / len(target_words))
                        st_t, en_t = prev_t, max(prev_t + 0.08, next_t)
                    aligned.append({"word": tw, "start": round(st_t, 3), "end": round(min(dur, en_t), 3)})
            else:
                for idx, tw in enumerate(target_words):
                    a = dur * (idx / max(1, len(target_words)))
                    b = dur * ((idx + 1) / max(1, len(target_words)))
                    aligned.append({"word": tw, "start": round(a, 3), "end": round(b, 3)})

            entry = {
                "scene": sname,
                "idx": i,
                "voice": vkey,
                "style": style,
                "text": text,
                "wav": str(wav_p.relative_to(ROOT)),
                "duration": round(dur, 3),
                "words": aligned,
            }
            sc_lines.append(entry)
            lines_out.append(entry)
            all_pcm.append(y)
            cursor += dur
        scenes_out[sname] = sc_lines

    out_json = ROOT / "src" / f"{slug}_voice.json"
    out_json.write_text(json.dumps({"slug": slug, "sr": sr, "scenes": scenes_out, "lines": lines_out}, indent=2, ensure_ascii=False))
    print(f"Wrote {out_json} ({len(lines_out)} lines, total speech {cursor:.2f}s)", flush=True)


if __name__ == "__main__":
    naskah_p = Path(sys.argv[1])
    slug = sys.argv[2]
    script = json.loads(naskah_p.read_text())
    phase1_generate(script, slug)
    phase2_align(script, slug)

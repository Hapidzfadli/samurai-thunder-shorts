"""Generator suara VoxCPM2 2-fase hemat RAM dengan seleksi intonasi F0 untuk "Perang Ember Kayu 1325".

Fase 1 (VoxCPM2 + F0 prosody check):
  - Muat VoxCPM2 saja (tanpa Whisper di RAM agar tidak swap berat).
  - Untuk setiap baris yang belum ada di cache out/voice/ember/<scene>_<i>.wav:
    generate dengan tag emosi (kaget/tanya/panik/sindir/tegas/narasi/santai) & cfg_value ekspresif,
    cek kontur nada F0 (range_st & end_rise); bila kurang ekspresif ulang take 2, lalu simpan .wav ke cache.
Fase 2 (Whisper alignment & loudness norm):
  - Hanya dijalankan setelah semua .wav lengkap (tanpa perlu memuat VoxCPM2 lagi!).
  - Transkripsi timestamp kata per baris -> src/<name>_voice.json + public/audio/<name>_voice.mp3.

Pakai:
  .venv/bin/python scripts/voice_vox_ember.py scripts/naskah/ember.json ember
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

STYLE = {
    "narasi": "lively storyteller, warm, clear, expressive pacing",
    "santai": "casual, cheerful, confident, playful",
    "tegas": "commanding, firm, bold, authoritative",
    "bisik": "whispering, sly, quiet, sneaky",
    "sindir": "smug, teasing, amused, playful sarcastic tone",
    "tanya": "curious, questioning, animated, clear rising intonation at the end",
    "kaget": "shocked, surprised exclamation, gasping, high expressive pitch, dramatic",
    "panik": "panicked, startled, urgent, breathless, expressive",
}

CFG_BY_STYLE = {
    "narasi": 2.05,
    "santai": 2.15,
    "tegas": 2.30,
    "bisik": 2.10,
    "sindir": 2.25,
    "tanya": 2.40,
    "kaget": 2.50,
    "panik": 2.45,
}

_NUM = r"\b(se|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu|juta|nol)\b"


def letters(x: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(_NUM, " ", x.lower()))


def measure_prosody(y: np.ndarray, sr: int) -> dict:
    hop = int(sr * 0.015)
    win = int(sr * 0.040)
    min_lag = max(1, int(sr / 480))
    max_lag = max(min_lag + 1, int(sr / 75))
    f0s, energies = [], []
    for start in range(0, max(1, len(y) - win), hop):
        frame = y[start : start + win]
        rms = float(np.sqrt(np.mean(frame * frame)) + 1e-9)
        energies.append(rms)
        if rms < 0.015:
            continue
        frame = frame - np.mean(frame)
        ac = np.correlate(frame, frame, mode="full")[len(frame) - 1 :]
        if ac[0] <= 1e-9:
            continue
        seg = ac[min_lag : min(max_lag, len(ac))]
        if len(seg) == 0:
            continue
        peak_i = int(np.argmax(seg))
        if seg[peak_i] / ac[0] > 0.35:
            f0s.append(sr / (min_lag + peak_i))
    if len(f0s) < 6:
        return {"range_st": 0.0, "end_rise": 0.0, "dyn": 0.0}
    arr = np.array(f0s, dtype=np.float64)
    st = 12.0 * np.log2(arr / np.median(arr))
    rng = float(np.percentile(st, 92) - np.percentile(st, 8))
    n = len(st)
    mid = st[int(n * 0.35) : int(n * 0.72)]
    tail = st[int(n * 0.75) :]
    end_rise = float((np.mean(tail) - np.mean(mid)) if (len(mid) > 0 and len(tail) > 0) else 0.0)
    en = np.array(energies)
    dyn = float(np.percentile(en, 95) / (np.median(en) + 1e-6))
    return {"range_st": round(rng, 2), "end_rise": round(end_rise, 2), "dyn": round(dyn, 2)}


def build(script_path: Path, name: str):
    script = json.loads(Path(script_path).read_text())
    clip_dir = WORK / name
    clip_dir.mkdir(parents=True, exist_ok=True)

    # Siapkan daftar semua baris & cek mana yang belum ada di cache
    todo = []
    for sc in script:
        for li, ln in enumerate(sc["lines"]):
            p = clip_dir / f"{sc['scene']}_{li}.wav"
            if not p.exists():
                todo.append((sc["scene"], li, ln, p))

    # FASE 1: Generate yang belum ada dengan VoxCPM2 saja (hemat RAM)
    if todo:
        from voxcpm import VoxCPM

        torch.set_num_threads(2)
        cast = {}
        for k, v in CAST["voices"].items():
            short_p = WORK / f"cast_{k}_short.wav"
            cast[k] = short_p if short_p.exists() else WORK / f"cast_{k}.wav"
            if not cast[k].exists():
                subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-i", str(ROOT / v["file"]), "-ar", "24000", "-ac", "1", str(cast[k])],
                    check=True,
                )
        print(f"Fase 1: Memuat VoxCPM2 untuk {len(todo)} baris tersisa...", flush=True)
        tts = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
        sr = tts.tts_model.sample_rate
        fade = int(0.025 * sr)
        print("VoxCPM2 siap!", flush=True)

        for sc_name, li, ln, out_wav in todo:
            style, text = ln[0], ln[1]
            voice = ln[2] if len(ln) > 2 else DEFAULT_VOICE
            tag = STYLE.get(style, style)
            full = f"({tag}){text}" if tag else text
            cfg = CFG_BY_STYLE.get(style, 2.1)
            is_q = style == "tanya" or (text.strip().endswith("?") and style not in ("kaget", "panik"))
            t0 = time.time()
            print(f"[{sc_name}_{li} | {style} | {voice}] {text}", flush=True)

            best = None
            for take in range(2):
                y = np.asarray(
                    tts.generate(text=full, reference_wav_path=str(cast[voice]), inference_timesteps=5, cfg_value=cfg),
                    np.float32,
                )
                idx = np.where(np.abs(y) > 0.008)[0]
                if len(idx) > 0:
                    y = y[max(0, idx[0] - int(0.04 * sr)) : idx[-1] + int(0.08 * sr)]
                pr = measure_prosody(y, sr)
                score = pr["range_st"] + (pr["end_rise"] * 2.5 if is_q else 0.0) + pr["dyn"]
                print(f"    take {take + 1}/2: dur={len(y)/sr:.2f}s rng={pr['range_st']:.1f}st end={pr['end_rise']:+.1f}st dyn={pr['dyn']:.1f}", flush=True)
                if best is None or score > best[0]:
                    best = (score, y, pr)
                    yw = y.copy()
                    if len(yw) > 2 * fade:
                        yw[:fade] *= np.linspace(0, 1, fade)
                        yw[-fade:] *= np.linspace(1, 0, fade)
                    with wave.open(str(out_wav), "wb") as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(sr)
                        wf.writeframes((np.clip(yw, -1, 1) * 32767).astype(np.int16).tobytes())
                min_rng = 6.0 if (is_q or style in ("kaget", "panik")) else 4.5
                if pr["range_st"] >= min_rng and (not is_q or pr["end_rise"] > 0.2):
                    break
            print(f"    SAVED {out_wav.name} ({time.time() - t0:.1f}s)", flush=True)

        del tts
        gc.collect()

    # FASE 2: Semua .wav lengkap -> jalankan Whisper alignment + gabungkan
    print("Fase 2: Menjalankan Whisper alignment untuk semua baris...", flush=True)
    from faster_whisper import WhisperModel
    from scipy import signal

    asr = WhisperModel("base", device="cpu", compute_type="int8")
    chunks = []
    sr = 48000
    cur = 0.25
    scenes = []

    for sc in script:
        sc_from = cur
        lines = []
        for li, ln in enumerate(sc["lines"]):
            style, text = ln[0], ln[1]
            voice = ln[2] if len(ln) > 2 else sc.get("voice", DEFAULT_VOICE)
            wav_p = clip_dir / f"{sc['scene']}_{li}.wav"
            with wave.open(str(wav_p)) as wf:
                sr = wf.getframerate()
                y = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32767
            if not chunks:
                chunks.append(np.zeros(int(0.25 * sr), np.float32))
            a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
            segs, _ = asr.transcribe(a16, language="id", beam_size=5, word_timestamps=True)
            words = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in s.words]
            heard = " ".join(w[0] for w in words)
            asr_score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
            pr = measure_prosody(y, sr)
            dur = len(y) / sr
            print(f"  [{sc['scene']}_{li} | {style:6s} | {voice:4s}] dur={dur:.2f}s asr={asr_score:.2f} rng={pr['range_st']:.1f}st end={pr['end_rise']:+.1f}st <- {heard}", flush=True)
            lines.append({
                "voice": voice,
                "style": style,
                "text": text,
                "file": str(wav_p.relative_to(ROOT)),
                "from": round(cur, 3),
                "to": round(cur + dur, 3),
                "score": round(asr_score, 3),
                "prosody": pr,
                "wordsSec": [[w, round(a, 3), round(b, 3)] for w, a, b in words],
                "words": [{"w": w, "from": int(round((cur + a) * FPS)), "to": int(round((cur + b) * FPS))} for w, a, b in words],
            })
            chunks.append(y)
            gap = 0.28 if li < len(sc["lines"]) - 1 else 0.45
            chunks.append(np.zeros(int(gap * sr), np.float32))
            cur += dur + gap
        scenes.append({"scene": sc["scene"], "from": round(sc_from, 3), "to": round(cur, 3), "lines": lines})

    full = np.concatenate(chunks)
    raw_wav = WORK / f"{name}_raw.wav"
    with wave.open(str(raw_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes((np.clip(full, -1, 1) * 32767).astype(np.int16).tobytes())

    out_wav = ROOT / "public" / "audio" / f"{name}_voice.wav"
    out_mp3 = ROOT / "public" / "audio" / f"{name}_voice.mp3"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw_wav), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", str(out_wav)], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out_wav), "-b:a", "192k", str(out_mp3)], check=True)
    meta = {"name": name, "fps": FPS, "sr": sr, "duration": round(cur, 3), "scenes": scenes}
    (ROOT / "src" / f"{name}_voice.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    print(f"SELESAI: {out_mp3} ({cur:.2f}s) -> src/{name}_voice.json", flush=True)


if __name__ == "__main__":
    build(Path(sys.argv[1]), sys.argv[2])

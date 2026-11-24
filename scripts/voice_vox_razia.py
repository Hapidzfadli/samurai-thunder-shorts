"""Multi-speaker low-RAM VoxCPM2 + Whisper runner for Kos Bu Tini Ep. 4 (Razia Kucing Oren).

Uses the 5 Indonesian Character Voice Bank presets via scripts/voice_bank.py:
  - nadia   (01_nadia_storyteller) : Narator "Hai wak!" pembuka & penutup
  - riko    (06_riko_panikan)      : Riko panik sembunyikan kucing
  - bagas   (07_bagas_santai)      : Bagas santuy bikin penyamaran "bantal bulu"
  - ara     (02_cewek_polos_lucu)  : Mbak Ara polos keceplosan
  - bu_tini (04_bu_tini_ibu_kos)   : Bu Tini galak -> luluh gemes!

Note: The bank WAV prompts already contain each character's calibrated pitch signature,
so post-processing applies only EQ/highpass + loudnorm (never double-shifting pitch).
"""
from __future__ import annotations

import argparse
import ctypes
import difflib
import gc
import json
import os
import re
import resource
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from voice_bank import get_preset  # noqa: E402

FPS = 30
WORK = ROOT / "out" / "voice"
WORK.mkdir(parents=True, exist_ok=True)

STYLE_MAP = {
    "narasi": "warm expressive female storyteller, lively, conversational, slightly amused",
    "narasi_tutup": "warm cheerful female storyteller, laughing warmly, playful, engaging",
    "bisik": "hushed urgent whisper, nervous young man sneaking around, quiet hurried tone",
    "tegas_galak": "strict, loud, bossy landlady shouting an announcement, dramatic authority",
    "galak": "strict, loud, suspicious landlady scolding, comedic motherly anger",
    "panik": "panicked, fast energetic young man, frantic, loud comedic urgency",
    "ngeles": "nervous fast-talking young man making up an absurd excuse, flustered comedic",
    "santai": "super chill, deadpan funny, warm friendly relaxed young man, unbothered",
    "polos": "naive, bright youthful funny girl, playful confused comedic innocence",
    "luluh": "gasp of melting joy, soft adoring warm motherly voice cooing lovingly at a cute kitten",
    "gemes": "delighted, affectionate bossy landlady doting on a cute cat, cheerful comedic triumph",
}

_NUM = r"\b(se|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu|juta|nol)\b"


def letters(x: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(_NUM, " ", x.lower()))


def rss_mb() -> float:
    try:
        for line in Path("/proc/self/status").read_text().splitlines():
            if line.startswith("VmRSS:"):
                return int(line.split()[1]) / 1024.0
    except Exception:
        pass
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


def save_wav(path: Path, y: np.ndarray, sr: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    y16 = (np.clip(y, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(y16.tobytes())


def load_wav_raw(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as wf:
        sr = wf.getframerate()
        raw = wf.readframes(wf.getnframes())
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0, sr


def _ffmpeg_bin() -> str:
    cand = ROOT / ".venv" / "bin" / "ffmpeg"
    if cand.exists():
        return str(cand)
    rem = ROOT / "node_modules" / "@remotion" / "compositor-linux-x64-gnu" / "ffmpeg"
    if rem.exists():
        return str(rem)
    return "ffmpeg"


def _peaking_eq(y: np.ndarray, sr: int, freq: float, q: float, gain_db: float) -> np.ndarray:
    from scipy import signal

    a = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * np.pi * freq / sr
    alpha = np.sin(w0) / (2.0 * max(0.1, q))
    b0 = 1.0 + alpha * a
    b1 = -2.0 * np.cos(w0)
    b2 = 1.0 - alpha * a
    a0 = 1.0 + alpha / a
    a1 = -2.0 * np.cos(w0)
    a2 = 1.0 - alpha / a
    return signal.lfilter([b0 / a0, b1 / a0, b2 / a0], [1.0, a1 / a0, a2 / a0], y).astype(np.float32)


def polish_clip(in_wav: Path, out_wav: Path, speaker: str, style: str, sr_out: int = 48000) -> None:
    """Apply clean EQ/highpass from the voice bank preset in scipy + ffmpeg loudnorm without double-pitching."""
    from scipy import signal

    preset = get_preset(speaker)
    y, sr = load_wav_raw(in_wav)
    for flt in preset.get("filters") or ["highpass=f=80"]:
        if flt.startswith("highpass=f="):
            fc = float(flt.split("f=")[1].split(":")[0])
            sos = signal.butter(2, fc, btype="highpass", fs=sr, output="sos")
            y = signal.sosfilt(sos, y).astype(np.float32)
        elif flt.startswith("equalizer="):
            kv = dict(part.split("=", 1) for part in flt[len("equalizer=") :].split(":") if "=" in part)
            y = _peaking_eq(y, sr, float(kv.get("f", 1000)), float(kv.get("w", 1.2)), float(kv.get("g", 0)))
    if style == "luluh":
        y = _peaking_eq(y, sr, 320.0, 1.2, 1.8)
    peak = float(np.max(np.abs(y))) + 1e-6
    if peak > 0.95:
        y *= 0.95 / peak
    eq_tmp = in_wav.with_suffix(".eq.wav")
    save_wav(eq_tmp, y, sr)
    af_parts = []
    if style == "panik":
        af_parts.append("atempo=1.04")
    af_parts.append("loudnorm=I=-15:TP=-1.5:LRA=9")
    subprocess.run(
        [_ffmpeg_bin(), "-y", "-v", "error", "-i", str(eq_tmp), "-af", ",".join(af_parts), "-ar", str(sr_out), "-ac", "1", str(out_wav)],
        check=True,
    )
    eq_tmp.unlink(missing_ok=True)


def load_voxcpm2_lowram(model_id: str = "openbmb/VoxCPM2"):
    from huggingface_hub import snapshot_download
    from safetensors import safe_open
    from transformers import LlamaTokenizerFast
    from voxcpm.core import VoxCPM
    from voxcpm.model.voxcpm2 import VoxCPM2Model, VoxCPMConfig
    from voxcpm.modules.audiovae import AudioVAEV2

    local_path = Path(snapshot_download(repo_id=model_id))
    config = VoxCPMConfig.model_validate_json((local_path / "config.json").read_text(encoding="utf-8"))
    config.max_length = 512
    tokenizer = LlamaTokenizerFast.from_pretrained(str(local_path))

    audio_vae_config = getattr(config, "audio_vae_config", None)
    audio_vae = AudioVAEV2(config=audio_vae_config) if audio_vae_config else AudioVAEV2()
    vae_ckpt = torch.load(str(local_path / "audiovae.pth"), map_location="cpu", weights_only=True)
    vae_sd = vae_ckpt.get("state_dict", vae_ckpt)
    audio_vae.load_state_dict(vae_sd, strict=False)
    del vae_ckpt, vae_sd
    gc.collect()

    prev_dtype = torch.get_default_dtype()
    try:
        torch.set_default_dtype(torch.bfloat16)
        model = VoxCPM2Model(config, tokenizer, audio_vae, None, device="cpu")
    finally:
        torch.set_default_dtype(prev_dtype)
    model.audio_vae = model.audio_vae.to(torch.float32)

    st_path = str(local_path / "model.safetensors")
    state_map = dict(model.named_parameters())
    state_map.update(dict(model.named_buffers()))
    loaded = 0
    with safe_open(st_path, framework="pt", device="cpu") as sf:
        with torch.no_grad():
            for k in sf.keys():
                if k in state_map:
                    t = sf.get_tensor(k)
                    state_map[k].copy_(t)
                    del t
                    loaded += 1
    del state_map
    gc.collect()
    try:
        fd = os.open(st_path, os.O_RDONLY)
        os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
        os.close(fd)
    except Exception:
        pass
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except Exception:
        pass
    model.eval()
    print(f"Streaming load OK ({loaded} tensors) | Live VmRSS: {rss_mb():.0f} MB", flush=True)

    wrapper = VoxCPM.__new__(VoxCPM)
    wrapper.tts_model = model
    wrapper.text_normalizer = None
    wrapper.denoiser = None
    return wrapper


def run_pass1(script_path: Path, name: str, only_keys: set[str] | None, take_override: int | None):
    torch.set_num_threads(max(1, min(4, os.cpu_count() or 2)))
    script = json.loads(script_path.read_text(encoding="utf-8"))
    clip_dir = WORK / name
    clip_dir.mkdir(parents=True, exist_ok=True)

    todo = []
    for sc in script:
        n_takes = sc.get("takes", 1)
        for li, (speaker, style, text) in enumerate(sc["lines"]):
            key = f"{sc['scene']}_{li}"
            if only_keys and key not in only_keys:
                continue
            takes_list = [take_override] if take_override is not None else list(range(n_takes))
            for tk in takes_list:
                out_p = clip_dir / f"{key}_t{tk}.wav"
                if not out_p.exists():
                    todo.append((key, speaker, style, text, tk, out_p))

    if not todo:
        print("Pass 1: semua take sudah tersedia di cache!", flush=True)
        return

    print(f"Memuat VoxCPM2 multi-speaker (bfloat16) untuk {len(todo)} klip... VmRSS awal: {rss_mb():.0f} MB", flush=True)
    t_load = time.time()
    tts = load_voxcpm2_lowram("openbmb/VoxCPM2")
    sr = tts.tts_model.sample_rate
    print(f"VoxCPM2 siap (sr={sr}) dalam {time.time()-t_load:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)

    for idx, (key, speaker, style, text, tk, out_p) in enumerate(todo):
        t0 = time.time()
        preset = get_preset(speaker)
        ref = preset["wavRefPath"]
        tag = STYLE_MAP.get(style, preset["style"])
        full = f"({tag}){text}"
        print(f"[{idx+1:02d}/{len(todo):02d} | {key}_t{tk} | {speaker}:{style} | ref={ref.name}] {text}", flush=True)
        with torch.no_grad():
            parts = [
                np.asarray(chunk, np.float32)
                for chunk in tts.generate_streaming(
                    text=full,
                    reference_wav_path=str(ref),
                    inference_timesteps=8,
                    cfg_value=2.0,
                )
            ]
        y = np.concatenate(parts) if parts else np.zeros(int(0.1 * sr), np.float32)
        del parts
        w = np.where(np.abs(y) > 0.012)[0]
        if len(w) > 0:
            y = y[max(0, w[0] - int(0.025 * sr)) : w[-1] + int(0.06 * sr)]
        raw_tmp = out_p.with_suffix(".raw.wav")
        save_wav(raw_tmp, y, sr)
        polish_clip(raw_tmp, out_p, speaker, style, sr_out=48000)
        raw_tmp.unlink(missing_ok=True)
        gc.collect()
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass
        y_pol, sr_pol = load_wav_raw(out_p)
        print(f"    -> {len(y_pol)/sr_pol:.2f}s | {time.time()-t0:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)


def run_pass2(script_path: Path, name: str):
    from faster_whisper import WhisperModel
    from scipy import signal

    script = json.loads(script_path.read_text(encoding="utf-8"))
    clip_dir = WORK / name
    print(f"Memuat Whisper small (int8)... VmRSS: {rss_mb():.0f} MB", flush=True)
    asr = WhisperModel("small", device="cpu", compute_type="int8")

    def hear(y: np.ndarray, sr: int):
        a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
        segs, _ = asr.transcribe(a16, language="id", beam_size=5, word_timestamps=True)
        words = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in s.words]
        return " ".join(w[0] for w in words), words

    cur = 0.25
    scenes_out = []
    low = []

    for sc in script:
        sc_from = cur
        lines_out = []
        for li, (speaker, style, text) in enumerate(sc["lines"]):
            key = f"{sc['scene']}_{li}"
            cands = sorted(clip_dir.glob(f"{key}_t*.wav"))
            if not cands:
                raise FileNotFoundError(f"Tidak ada take untuk {key}")
            best = None
            for cand in cands:
                y, sr = load_wav_raw(cand)
                # Tight trim for snappy tektokan
                w = np.where(np.abs(y) > 0.014)[0]
                if len(w) > 0:
                    y = y[max(0, w[0] - int(0.020 * sr)) : w[-1] + int(0.050 * sr)]
                heard, words = hear(y, sr)
                score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
                print(f"  [{key:12s} | {speaker:7s} | {cand.name}] {score:.3f} <- {heard}", flush=True)
                if best is None or score > best[0]:
                    best = (score, y, words, sr)
            score, y, words, sr = best
            if score < 0.88:
                low.append((key, round(score, 3)))
            fade = int(0.016 * sr)
            y = y.copy()
            if len(y) > fade * 2:
                y[:fade] *= np.linspace(0, 1, fade)
                y[-fade:] *= np.linspace(1, 0, fade)
            clip_path = clip_dir / f"{key}.wav"
            save_wav(clip_path, y, sr)
            lines_out.append({
                "speaker": speaker,
                "style": style,
                "text": text,
                "score": round(score, 3),
                "file": str(clip_path.relative_to(ROOT)),
                "wordsSec": [[w, round(a, 3), round(b, 3)] for w, a, b in words],
                "from": int(round(cur * FPS)),
                "to": int(round((cur + len(y) / sr) * FPS)),
                "words": [
                    {"w": w, "from": int(round((cur + a) * FPS)), "to": int(round((cur + b) * FPS))}
                    for w, a, b in words
                ],
            })
            last = li == len(sc["lines"]) - 1
            gap = 0.35 if last else 0.12
            cur += len(y) / sr + gap
        scenes_out.append({
            "scene": sc["scene"],
            "from": int(round(sc_from * FPS)),
            "to": int(round(cur * FPS)),
            "lines": lines_out,
        })

    timing = {"fps": FPS, "totalFrames": int(round(cur * FPS)) + 8, "scenes": scenes_out}
    out_json = ROOT / "src" / f"{name}_voice.json"
    out_json.write_text(json.dumps(timing, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Saved: {out_json} ({cur:.1f}s raw speech timeline)", flush=True)
    if low:
        print("PERINGATAN skor < 0.88:", low, flush=True)
    else:
        print("SEMUA kalimat lolos Whisper >= 0.88!", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script", type=Path)
    ap.add_argument("name")
    ap.add_argument("--pass1", action="store_true")
    ap.add_argument("--pass2", action="store_true")
    ap.add_argument("--only", default="", help="Comma-separated scene_idx keys (e.g. hook_0,twist_1)")
    ap.add_argument("--take", type=int, default=None)
    args = ap.parse_args()
    only_keys = {x.strip() for x in args.only.split(",") if x.strip()} if args.only else None
    if args.pass1:
        run_pass1(args.script, args.name, only_keys, args.take)
    if args.pass2:
        run_pass2(args.script, args.name)


if __name__ == "__main__":
    main()

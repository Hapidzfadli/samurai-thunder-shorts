"""Two-pass low-RAM runner for VoxCPM2 (same voice/refs/tags as scripts/voice_vox.py / Kantor di Atas Awan).
Separates VoxCPM2 synthesis (--pass1) and Whisper scoring/alignment (--pass2) so peak RAM stays
comfortably under 6 GB on 8 GB CPU VMs, and caches every single take for resumable execution.
"""
import argparse
import difflib
import gc
import json
import re
import resource
import subprocess
import time
import wave
from pathlib import Path
import numpy as np
import torch

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
DODI = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
WORK = ROOT / "out" / "voice"
WORK.mkdir(parents=True, exist_ok=True)

REFS = {"santai": (0.00, 10.40), "narasi": (18.00, 28.30), "tegang": (38.60, 48.85)}
REF_OF = {"narasi": "narasi", "santai": "santai", "tegang": "tegang", "tegas": "tegang", "bisik": "santai"}
STYLE = {
    "narasi": "lively storyteller, warm, flowing",
    "santai": "casual, amused, relaxed",
    "tegang": "tense, dramatic, suspenseful",
    "tegas": "commanding, firm, loud",
    "bisik": "whispering, sly, quiet",
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


def ensure_refs():
    refs = {}
    for k, (a, b) in REFS.items():
        p = WORK / f"ref_{k}.wav"
        if not p.exists():
            subprocess.run(
                [
                    "ffmpeg", "-y", "-v", "error", "-ss", str(a), "-t", str(b - a),
                    "-i", str(DODI), "-af", f"afade=t=in:d=0.05,afade=t=out:st={b - a - 0.12}:d=0.12",
                    "-ar", "24000", "-ac", "1", str(p),
                ],
                check=True,
            )
        refs[k] = p
    return refs


def save_wav(path: Path, y: np.ndarray, sr: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes((np.clip(y, -1.0, 1.0) * 32767).astype(np.int16).tobytes())


def load_wav_raw(path: Path):
    with wave.open(str(path), "rb") as wf:
        sr = wf.getframerate()
        y = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32767.0
    return y, sr


def load_voxcpm2_lowram(repo_id: str = "openbmb/VoxCPM2"):
    import ctypes
    import os
    from huggingface_hub import snapshot_download
    from safetensors import safe_open
    from transformers import LlamaTokenizerFast
    from voxcpm.core import VoxCPM
    from voxcpm.model.voxcpm2 import VoxCPM2Model, VoxCPMConfig
    from voxcpm.modules.audiovae import AudioVAEV2

    local_path = Path(snapshot_download(repo_id=repo_id))
    config = VoxCPMConfig.model_validate_json((local_path / "config.json").read_text(encoding="utf-8"))
    # Shrink KV cache from 8192 -> 512 (16x smaller; single Shorts line + 10s ref needs <250 tokens)
    config.max_length = 512
    tokenizer = LlamaTokenizerFast.from_pretrained(str(local_path))

    # 1. Load AudioVAEV2 in float32 (~380 MB) and free checkpoint dict immediately
    audio_vae_config = getattr(config, "audio_vae_config", None)
    audio_vae = AudioVAEV2(config=audio_vae_config) if audio_vae_config else AudioVAEV2()
    vae_ckpt = torch.load(str(local_path / "audiovae.pth"), map_location="cpu", weights_only=True)
    vae_sd = vae_ckpt.get("state_dict", vae_ckpt)
    audio_vae.load_state_dict(vae_sd, strict=False)
    del vae_ckpt, vae_sd
    gc.collect()

    # 2. Instantiate VoxCPM2Model directly in bfloat16 (~4.6 GB instead of 9.2 GB float32!)
    prev_dtype = torch.get_default_dtype()
    try:
        torch.set_default_dtype(torch.bfloat16)
        model = VoxCPM2Model(config, tokenizer, audio_vae, None, device="cpu")
    finally:
        torch.set_default_dtype(prev_dtype)
    model.audio_vae = model.audio_vae.to(torch.float32)

    # 3. Stream model.safetensors tensor-by-tensor (~50 MB overhead instead of +4.6 GB copy!)
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
    print(f"Streaming load OK ({loaded} tensors, max_len={config.max_length}) | Live VmRSS: {rss_mb():.0f} MB", flush=True)

    wrapper = VoxCPM.__new__(VoxCPM)
    wrapper.tts_model = model
    wrapper.text_normalizer = None
    wrapper.denoiser = None
    return wrapper


def run_pass1(script_path: Path, name: str, start_idx: int, end_idx: int, takes_override: int | None):
    import ctypes

    torch.set_num_threads(2)
    refs = ensure_refs()
    script = json.loads(script_path.read_text())
    items = []
    for sc in script:
        n_takes = takes_override if takes_override is not None else sc.get("takes", 2)
        for li, (style, text) in enumerate(sc["lines"]):
            items.append((sc["scene"], li, style, text, n_takes))

    todo = []
    clip_dir = WORK / name
    for idx, (scene, li, style, text, n_takes) in enumerate(items):
        if idx < start_idx or idx >= end_idx:
            continue
        for tk in range(n_takes):
            out_p = clip_dir / f"{scene}_{li}_t{tk}.wav"
            if not out_p.exists():
                todo.append((idx, scene, li, style, text, tk, out_p))

    if not todo:
        print("Pass 1: semua take di rentang ini sudah tersimpan di cache!")
        return

    print(f"Memuat VoxCPM2 (low-RAM streaming bfloat16)... VmRSS awal: {rss_mb():.0f} MB", flush=True)
    t_load = time.time()
    tts = load_voxcpm2_lowram("openbmb/VoxCPM2")
    sr = tts.tts_model.sample_rate
    print(f"VoxCPM2 siap (sr={sr}) dalam {time.time()-t_load:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)

    for idx, scene, li, style, text, tk, out_p in todo:
        t0 = time.time()
        tag = STYLE.get(style, style)
        full = f"({tag}){text}" if tag else text
        ref = refs[REF_OF.get(style, "narasi")]
        print(f"[{idx:02d} | {scene}_{li} | t{tk} | {style}] {text}", flush=True)
        with torch.no_grad():
            parts = [
                np.asarray(chunk, np.float32)
                for chunk in tts.generate_streaming(
                    text=full,
                    reference_wav_path=str(ref),
                    inference_timesteps=10,
                    cfg_value=2.0,
                )
            ]
        y = np.concatenate(parts) if parts else np.zeros(int(0.1 * sr), np.float32)
        del parts
        w = np.where(np.abs(y) > 0.008)[0]
        if len(w) > 0:
            y = y[max(0, w[0] - int(0.04 * sr)) : w[-1] + int(0.08 * sr)]
        save_wav(out_p, y, sr)
        gc.collect()
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass
        print(f"    -> {len(y)/sr:.2f}s audio | selesai dalam {time.time()-t0:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)


def run_pass2(script_path: Path, name: str):
    from faster_whisper import WhisperModel
    from scipy import signal

    script = json.loads(script_path.read_text())
    clip_dir = WORK / name
    print(f"Memuat Whisper small (int8)... RSS: {rss_mb():.0f} MB", flush=True)
    asr = WhisperModel("small", device="cpu", compute_type="int8")

    def hear(y: np.ndarray, sr: int):
        a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
        segs, _ = asr.transcribe(a16, language="id", beam_size=5, word_timestamps=True)
        words = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in s.words]
        return " ".join(w[0] for w in words), words

    sr_ref = None
    chunks = []
    cur = 0.25
    scenes_out = []

    for sc in script:
        sc_from = cur
        lines_out = []
        for li, (style, text) in enumerate(sc["lines"]):
            cands = sorted(clip_dir.glob(f"{sc['scene']}_{li}_t*.wav"))
            if not cands:
                raise FileNotFoundError(f"Tidak ada take untuk {sc['scene']}_{li}")
            best = None
            for cand in cands:
                y, sr = load_wav_raw(cand)
                if sr_ref is None:
                    sr_ref = sr
                    chunks.append(np.zeros(int(0.25 * sr_ref), np.float32))
                heard, words = hear(y, sr)
                score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
                print(f"  [{sc['scene']}_{li} | {cand.name}] {score:.3f} <- {heard}", flush=True)
                if best is None or score > best[0]:
                    best = (score, y, words, sr)
            score, y, words, sr = best
            fade = int(0.025 * sr)
            y = y.copy()
            if len(y) > fade * 2:
                y[:fade] *= np.linspace(0, 1, fade)
                y[-fade:] *= np.linspace(1, 0, fade)
            clip_path = clip_dir / f"{sc['scene']}_{li}.wav"
            save_wav(clip_path, y, sr)
            lines_out.append({
                "style": style,
                "text": text,
                "score": round(score, 3),
                "file": str(clip_path.relative_to(ROOT)),
                "wordsSec": [[w, round(a, 3), round(b, 3)] for w, a, b in words],
                "from": int(round(cur * FPS)),
                "to": int(round((cur + len(y) / sr) * FPS)),
                "words": [{"w": w, "from": int(round((cur + a) * FPS)), "to": int(round((cur + b) * FPS))} for w, a, b in words],
            })
            last = li == len(sc["lines"]) - 1
            gap = 0.45 if last else (0.14 if text.rstrip().endswith((",", "...")) else 0.26)
            chunks += [y, np.zeros(int(gap * sr), np.float32)]
            cur += len(y) / sr + gap
        scenes_out.append({"scene": sc["scene"], "from": int(round(sc_from * FPS)), "to": int(round(cur * FPS)), "lines": lines_out})

    mix = np.concatenate(chunks)
    raw = WORK / f"{name}_raw.wav"
    save_wav(raw, mix, sr_ref)
    out = ROOT / "public" / "audio" / f"{name}_voice.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", str(out)], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out), "-b:a", "192k", str(out.with_suffix(".mp3"))], check=True)
    timing = {"fps": FPS, "totalFrames": int(round(cur * FPS)) + 8, "scenes": scenes_out}
    (ROOT / "src" / f"{name}_voice.json").write_text(json.dumps(timing, indent=1, ensure_ascii=False))
    print(f"Saved: {out} ({cur:.1f}s) & src/{name}_voice.json", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script", type=Path)
    ap.add_argument("name")
    ap.add_argument("--pass1", action="store_true")
    ap.add_argument("--pass2", action="store_true")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=999)
    ap.add_argument("--takes", type=int, default=None)
    args = ap.parse_args()
    if args.pass1:
        run_pass1(args.script, args.name, args.start, args.end, args.takes)
    if args.pass2:
        run_pass2(args.script, args.name)


if __name__ == "__main__":
    main()

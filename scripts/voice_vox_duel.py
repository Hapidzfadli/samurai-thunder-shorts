"""Multi-speaker VoxCPM2 + Whisper runner for Wild West Duel ("Kenapa Penembak Kedua Selalu Menang").
Uses voices/bank_karakter/ via scripts/voice_bank.py (qinmu, sombong, ara, bang_udin).
Run:
  .venv/bin/python scripts/voice_vox_duel.py scripts/naskah/duel.json duel --pass1 --takes 2
  .venv/bin/python scripts/voice_vox_duel.py scripts/naskah/duel.json duel --pass2
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
import sys
import time
import wave
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from voice_bank import apply_preset_polish, get_preset  # noqa: E402

FPS = 30
WORK = ROOT / "out" / "voice"
WORK.mkdir(parents=True, exist_ok=True)

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
    from huggingface_hub import snapshot_download
    from safetensors import safe_open
    from transformers import LlamaTokenizerFast
    from voxcpm.core import VoxCPM
    from voxcpm.model.voxcpm2 import VoxCPM2Model, VoxCPMConfig
    from voxcpm.modules.audiovae import AudioVAEV2

    local_path = Path(snapshot_download(repo_id))
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


def run_pass1(script_path: Path, name: str, start_idx: int, end_idx: int, n_takes: int) -> None:
    torch.set_num_threads(2)
    data = json.loads(script_path.read_text(encoding="utf-8"))
    items = []
    for beat in data["beats"]:
        scene = beat["scene"]
        for li, ln in enumerate(beat["lines"]):
            items.append((scene, li, ln["id"], ln["speaker"], ln.get("style", ""), ln["text"]))

    clip_dir = WORK / name
    todo = []
    for idx, (scene, li, lid, speaker, style, text) in enumerate(items):
        if idx < start_idx or idx >= end_idx:
            continue
        for tk in range(n_takes):
            out_p = clip_dir / f"{lid}_t{tk}.wav"
            if not out_p.exists():
                todo.append((idx, scene, li, lid, speaker, style, text, tk, out_p))

    if not todo:
        print("Pass 1: semua take sudah ada di cache!")
        return

    print(f"Memuat VoxCPM2... VmRSS awal: {rss_mb():.0f} MB", flush=True)
    t_load = time.time()
    tts = load_voxcpm2_lowram("openbmb/VoxCPM2")
    sr = tts.tts_model.sample_rate
    print(f"VoxCPM2 siap (sr={sr}) dalam {time.time() - t_load:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)

    for idx, scene, li, lid, speaker, style, text, tk, out_p in todo:
        t0 = time.time()
        preset = get_preset(speaker)
        ref = preset["wavRefPath"]
        tag = style or preset.get("style", "")
        full = f"({tag}){text}" if tag else text
        print(f"[{idx:02d} | {lid} | {speaker} | t{tk}] {text}", flush=True)
        with torch.no_grad():
            parts = [
                np.asarray(chunk, np.float32)
                for chunk in tts.generate_streaming(
                    text=full,
                    reference_wav_path=str(ref),
                    inference_timesteps=6,
                    cfg_value=2.0,
                )
            ]
        y = np.concatenate(parts) if parts else np.zeros(int(0.1 * sr), np.float32)
        del parts
        w = np.where(np.abs(y) > 0.008)[0]
        if len(w) > 0:
            y = y[max(0, w[0] - int(0.03 * sr)) : w[-1] + int(0.07 * sr)]
        raw_tmp = out_p.with_suffix(".raw.wav")
        save_wav(raw_tmp, y, sr)
        apply_preset_polish(raw_tmp, out_p, preset, sr_out=48000)
        raw_tmp.unlink(missing_ok=True)
        gc.collect()
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass
        y_pol, sr_pol = load_wav_raw(out_p)
        print(f"    -> {len(y_pol)/sr_pol:.2f}s | {time.time() - t0:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)


def run_pass2(script_path: Path, name: str) -> None:
    from faster_whisper import WhisperModel
    from scipy import signal

    data = json.loads(script_path.read_text(encoding="utf-8"))
    clip_dir = WORK / name
    print(f"Memuat Whisper small (int8)... RSS: {rss_mb():.0f} MB", flush=True)
    asr = WhisperModel("small", device="cpu", compute_type="int8")

    def hear(y: np.ndarray, sr: int):
        a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
        segs, _ = asr.transcribe(a16, language="id", beam_size=5, word_timestamps=True)
        words = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in s.words]
        return " ".join(w[0] for w in words), words

    cur = 0.20
    scenes_out = []
    lines_by_id = {}

    for beat in data["beats"]:
        scene = beat["scene"]
        sc_from = cur
        lines_out = []
        for li, ln in enumerate(beat["lines"]):
            lid = ln["id"]
            speaker = ln["speaker"]
            text = ln["text"]
            cands = sorted(clip_dir.glob(f"{lid}_t*.wav"))
            if not cands:
                raise FileNotFoundError(f"Tidak ada take untuk {lid}")
            best = None
            for cand in cands:
                y, sr = load_wav_raw(cand)
                heard, words = hear(y, sr)
                score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
                print(f"  [{lid} | {speaker:9s} | {cand.name}] {score:.3f} <- {heard}", flush=True)
                if best is None or score > best[0]:
                    best = (score, y, words, sr)
            score, y, words, sr = best
            fade = int(0.018 * sr)
            y = y.copy()
            if len(y) > fade * 2:
                y[:fade] *= np.linspace(0, 1, fade)
                y[-fade:] *= np.linspace(1, 0, fade)
            clip_path = clip_dir / f"{lid}.wav"
            save_wav(clip_path, y, sr)
            dur = len(y) / sr
            entry = {
                "id": lid,
                "speaker": speaker,
                "text": text,
                "score": round(score, 3),
                "durSec": round(dur, 3),
                "file": str(clip_path.relative_to(ROOT)),
                "wordsSec": [[w, round(a, 3), round(b, 3)] for w, a, b in words],
                "from": int(round(cur * FPS)),
                "to": int(round((cur + dur) * FPS)),
                "words": [{"w": w, "from": int(round((cur + a) * FPS)), "to": int(round((cur + b) * FPS))} for w, a, b in words],
            }
            lines_out.append(entry)
            lines_by_id[lid] = entry
            gap = 0.35 if li == len(beat["lines"]) - 1 else 0.16
            cur += dur + gap
        scenes_out.append({"scene": scene, "from": int(round(sc_from * FPS)), "to": int(round(cur * FPS)), "lines": lines_out})

    out_json = ROOT / "src" / "duel_voice.json"
    out_json.write_text(
        json.dumps(
            {"fps": FPS, "totalFrames": int(round(cur * FPS)) + 10, "scenes": scenes_out, "byId": lines_by_id},
            indent=1,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Saved: {out_json} (raw voice sum ~{cur:.1f}s)", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("script", type=Path)
    ap.add_argument("name")
    ap.add_argument("--pass1", action="store_true")
    ap.add_argument("--pass2", action="store_true")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=999)
    ap.add_argument("--takes", type=int, default=2)
    args = ap.parse_args()
    if args.pass1:
        run_pass1(args.script, args.name, args.start, args.end, args.takes)
    if args.pass2:
        run_pass2(args.script, args.name)


if __name__ == "__main__":
    main()

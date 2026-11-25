"""COMBO Pocket-TTS Indonesian VO + VoxCPM2 Real-Human Voice Runner for Operasi Woyla 1981."""
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
import time
import wave
from pathlib import Path

import numpy as np
import torch
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
VDIR = ROOT / "voices" / "id_prompts"
WORK = ROOT / "out" / "voice" / "woyla"
SEED_DIR = WORK / "seeds"
SCRIPT_PATH = ROOT / "scripts" / "naskah" / "woyla.json"
OUT_JSON = ROOT / "src" / "woyla_voice.json"
FPS = 30

POCKET_CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"

SEED_SPECS = {
    "nadia": {
        "src_ref": VDIR / "nadia_omara_khw_clean.wav",
        "ref_6s": SEED_DIR / "nadia_ref_6s_24k.wav",
        "seed_wav": SEED_DIR / "nadia_pocket_seed.wav",
        "seed_text": "Hai wak, dengerin cerita operasi penyelamatan paling nekat ini.",
    },
    "sintong": {
        "src_ref": VDIR / "dodi_riko_clean.wav",
        "ref_6s": SEED_DIR / "sintong_ref_6s_24k.wav",
        "seed_wav": SEED_DIR / "sintong_pocket_seed.wav",
        "seed_text": "Seluruh pasukan siap di posisi, tunggu aba-aba serbuan.",
    },
}


def _ffmpeg_bin() -> str:
    for cand in (
        ROOT / ".venv" / "bin" / "ffmpeg",
        Path.home() / ".local" / "bin" / "ffmpeg",
        ROOT / "node_modules" / "@remotion" / "compositor-linux-x64-gnu" / "ffmpeg",
    ):
        if cand.exists():
            return str(cand)
    return "ffmpeg"


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


def norm_letters(s: str) -> str:
    return re.sub(r"[^a-z]", "", s.lower())


def _peaking_eq(y: np.ndarray, sr: int, freq: float, q: float, gain_db: float) -> np.ndarray:
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


def run_seeds():
    from faster_whisper import WhisperModel
    from pocket_tts import TTSModel

    SEED_DIR.mkdir(parents=True, exist_ok=True)
    for spk, spec in SEED_SPECS.items():
        if not spec["ref_6s"].exists():
            y, sr = load_wav_raw(spec["src_ref"])
            dur = min(4.2, len(y) / sr)
            seg = signal.resample(y[: int(dur * sr)], int(dur * 24000)).astype(np.float32)
            fade = int(0.03 * 24000)
            seg[:fade] *= np.linspace(0, 1, fade)
            seg[-fade:] *= np.linspace(1, 0, fade)
            seg = seg / (np.max(np.abs(seg)) + 1e-6) * 0.89
            save_wav(spec["ref_6s"], seg, 24000)
            print(f"[REF] {spk} -> {spec['ref_6s']} ({dur:.2f}s, 24kHz)", flush=True)

    need = [k for k, sp in SEED_SPECS.items() if not sp["seed_wav"].exists()]
    if not need:
        print("Semua Pocket-TTS seeds sudah siap!", flush=True)
        return
    tts = TTSModel.load_model(config=POCKET_CONFIG, eos_threshold=-4.5, temp=0.62)
    asr = WhisperModel("small", device="cpu", compute_type="int8")
    for spk in need:
        spec = SEED_SPECS[spk]
        state = tts.get_state_for_audio_prompt(str(spec["src_ref"]))
        best_y, best_sc, best_heard = None, -1.0, ""
        for tk in range(4):
            wav = tts.generate_audio(state, spec["seed_text"], max_tokens=160).detach().cpu().numpy().squeeze().astype(np.float32)
            sr = tts.sample_rate
            idx = np.where(np.abs(wav) > 0.008)[0]
            if len(idx):
                wav = wav[max(0, idx[0] - int(0.02 * sr)) : min(len(wav), idx[-1] + int(0.06 * sr))]
            a16 = signal.resample(wav, int(len(wav) * 16000 / sr)).astype(np.float32)
            heard = " ".join(s.text.strip() for s in asr.transcribe(a16, language="id", beam_size=1)[0])
            sc = difflib.SequenceMatcher(None, norm_letters(spec["seed_text"]), norm_letters(heard)).ratio()
            print(f"  seed {spk} tk{tk+1}: score={sc:.3f} | {heard}", flush=True)
            if sc > best_sc:
                best_y, best_sc, best_heard = wav, sc, heard
            if sc >= 0.96:
                break
        sos = signal.butter(2, 80.0, btype="highpass", fs=tts.sample_rate, output="sos")
        best_y = signal.sosfilt(sos, best_y).astype(np.float32)
        best_y = best_y / (np.max(np.abs(best_y)) + 1e-6) * 0.88
        save_wav(spec["seed_wav"], best_y, tts.sample_rate)
        print(f"[SEED OK] {spk}: score={best_sc:.3f} ({len(best_y)/tts.sample_rate:.2f}s) | {best_heard}", flush=True)


def load_voxcpm2_lowram(max_len: int = 384):
    from huggingface_hub import snapshot_download
    from safetensors import safe_open
    from transformers import LlamaTokenizerFast
    from voxcpm.core import VoxCPM
    from voxcpm.model.voxcpm2 import VoxCPM2Model, VoxCPMConfig
    from voxcpm.modules.audiovae import AudioVAEV2
    from voxcpm.modules.minicpm4.model import MiniCPMLongRoPE

    local_path = Path(snapshot_download(repo_id="openbmb/VoxCPM2"))
    config = VoxCPMConfig.model_validate_json((local_path / "config.json").read_text(encoding="utf-8"))
    config.max_length = max_len
    tokenizer = LlamaTokenizerFast.from_pretrained(str(local_path))

    print(f"[load 1/4] tokenizer & config ready | RSS={rss_mb():.0f}MB", flush=True)
    audio_vae_config = getattr(config, "audio_vae_config", None)
    audio_vae = AudioVAEV2(config=audio_vae_config) if audio_vae_config else AudioVAEV2()
    vae_ckpt = torch.load(str(local_path / "audiovae.pth"), map_location="cpu", weights_only=True)
    audio_vae.load_state_dict(vae_ckpt.get("state_dict", vae_ckpt), strict=False)
    del vae_ckpt
    gc.collect()
    print(f"[load 2/4] AudioVAE ready | RSS={rss_mb():.0f}MB", flush=True)

    prev_dtype = torch.get_default_dtype()
    try:
        torch.set_default_dtype(torch.bfloat16)
        with torch.device("meta"):
            model = VoxCPM2Model(config, tokenizer, audio_vae, None, device="cpu")
    finally:
        torch.set_default_dtype(prev_dtype)
    model.audio_vae = audio_vae.to(torch.float32)
    print(f"[load 3/4] VoxCPM2Model meta skeleton ready | RSS={rss_mb():.0f}MB", flush=True)

    st_path = str(local_path / "model.safetensors")
    loaded = 0
    fd_adv = os.open(st_path, os.O_RDONLY)
    try:
        with safe_open(st_path, framework="pt", device="cpu") as sf:
            for k in sf.keys():
                parts = k.split(".")
                mod = model
                ok = True
                for p in parts[:-1]:
                    if hasattr(mod, p):
                        mod = getattr(mod, p)
                    else:
                        ok = False
                        break
                if not ok:
                    continue
                leaf = parts[-1]
                t = sf.get_tensor(k)
                if leaf in mod._parameters:
                    mod._parameters[leaf] = torch.nn.Parameter(t.to(torch.bfloat16).clone(), requires_grad=False)
                    loaded += 1
                elif leaf in mod._buffers:
                    mod._buffers[leaf] = t.to(torch.bfloat16).clone()
                    loaded += 1
                del t
                if loaded % 25 == 0:
                    try:
                        os.posix_fadvise(fd_adv, 0, 0, os.POSIX_FADV_DONTNEED)
                    except Exception:
                        pass
    finally:
        try:
            os.posix_fadvise(fd_adv, 0, 0, os.POSIX_FADV_DONTNEED)
        except Exception:
            pass
        os.close(fd_adv)

    for m in model.modules():
        if isinstance(m, MiniCPMLongRoPE):
            inv_freq = 1.0 / (m.base ** (torch.arange(0, m.dim, 2).float() / m.dim))
            m.register_buffer("inv_freq", inv_freq, persistent=False)
            m._set_cos_sin_cache(seq_len=m.max_position_embeddings, device="cpu", dtype=torch.float32)

    # Ensure KV caches and any remaining non-persistent buffers are materialized on CPU
    model.base_lm.setup_cache(1, config.max_length, "cpu", torch.bfloat16)
    model.residual_lm.setup_cache(1, config.max_length, "cpu", torch.bfloat16)
    meta_left = [
        n for n, t in list(model.named_parameters()) + list(model.named_buffers())
        if t is not None and t.device.type == "meta"
    ]
    if meta_left:
        print(f"[load warn] meta tensors remaining: {meta_left}", flush=True)

    gc.collect()
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except Exception:
        pass
    model.eval()
    print(f"[load 4/4] Loaded VoxCPM2 ({loaded} tensors) | VmRSS={rss_mb():.0f} MB", flush=True)
    wrapper = VoxCPM.__new__(VoxCPM)
    wrapper.tts_model = model
    wrapper.text_normalizer = None
    wrapper.denoiser = None
    return wrapper


def run_pass1(only_keys: set[str] | None, steps: int = 8, force: bool = False):
    torch.set_num_threads(4)
    script = json.loads(SCRIPT_PATH.read_text(encoding="utf-8"))
    WORK.mkdir(parents=True, exist_ok=True)

    todo = []
    for sc in script:
        for li, (speaker, style, text) in enumerate(sc["lines"]):
            key = f"{sc['scene']}_{li}"
            if only_keys and key not in only_keys:
                continue
            raw_p = WORK / f"{key}_raw.wav"
            if raw_p.exists() and raw_p.stat().st_size > 16000 and not force:
                continue
            todo.append((key, speaker, style, text, raw_p))

    if not todo:
        print("Pass 1: semua klip yang diminta sudah ada!", flush=True)
        return

    t0 = time.time()
    tts = load_voxcpm2_lowram(max_len=512)
    sr = tts.tts_model.sample_rate
    print(f"VoxCPM2 COMBO siap (sr={sr}, steps={steps}) dalam {time.time()-t0:.1f}s | todo={len(todo)}", flush=True)

    for idx, (key, speaker, style, text, raw_p) in enumerate(todo):
        spec = SEED_SPECS[speaker]
        t1 = time.time()
        print(f"[{idx+1}/{len(todo)} | {key} | {speaker}:{style}] {text}", flush=True)
        with torch.no_grad():
            parts = [
                np.asarray(chunk, np.float32)
                for chunk in tts.generate_streaming(
                    text=text,
                    reference_wav_path=str(spec["ref_6s"]),
                    prompt_wav_path=str(spec["seed_wav"]),
                    prompt_text=spec["seed_text"],
                    cfg_value=2.0,
                    inference_timesteps=steps,
                    normalize=False,
                    denoise=False,
                )
            ]
        wav = np.concatenate(parts) if parts else np.zeros(sr, np.float32)
        wav = np.asarray(wav, np.float32).reshape(-1)
        idx_nz = np.where(np.abs(wav) > 0.008)[0]
        if len(idx_nz):
            wav = wav[max(0, idx_nz[0] - int(0.02 * sr)) : min(len(wav), idx_nz[-1] + int(0.07 * sr))]
        save_wav(raw_p, wav, sr)
        print(f"  -> saved {raw_p.name} ({len(wav)/sr:.2f}s audio, {time.time()-t1:.1f}s wall, RSS={rss_mb():.0f}MB)", flush=True)
        gc.collect()
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass


def polish_clip(raw_p: Path, out_p: Path, speaker: str, style: str):
    y, sr = load_wav_raw(raw_p)
    if speaker == "sintong" or style == "radio":
        sos = signal.butter(4, [340.0, 2900.0], btype="bandpass", fs=sr, output="sos")
        y = signal.sosfilt(sos, y).astype(np.float32)
        y = np.tanh(y * 2.4) / np.tanh(2.4)
        rng = np.random.default_rng(1981)
        sq_n = int(0.08 * sr)
        sq = signal.sosfilt(sos, rng.standard_normal(sq_n).astype(np.float32)) * 0.14
        sq *= np.linspace(1, 0, sq_n)
        y = np.concatenate([sq * 0.7, y, sq])
    else:
        sos = signal.butter(2, 80.0, btype="highpass", fs=sr, output="sos")
        y = signal.sosfilt(sos, y).astype(np.float32)
        y = _peaking_eq(y, sr, 210.0, 1.2, 1.4)
        y = _peaking_eq(y, sr, 3400.0, 1.2, 1.6)
    peak = float(np.max(np.abs(y))) + 1e-6
    if peak > 0.92:
        y *= 0.92 / peak
    tmp = out_p.with_suffix(".eq.wav")
    save_wav(tmp, y, sr)
    subprocess.run(
        [_ffmpeg_bin(), "-y", "-v", "error", "-i", str(tmp), "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", "48000", "-ac", "1", str(out_p)],
        check=True,
    )
    tmp.unlink(missing_ok=True)


def run_pass2():
    from faster_whisper import WhisperModel

    script = json.loads(SCRIPT_PATH.read_text(encoding="utf-8"))
    asr = WhisperModel("small", device="cpu", compute_type="int8")

    scenes_out = []
    cur_f = 8
    for sc in script:
        sc_name = sc["scene"]
        sc_lines = []
        sc_from = cur_f
        for li, (speaker, style, text) in enumerate(sc["lines"]):
            key = f"{sc_name}_{li}"
            raw_p = WORK / f"{key}_raw.wav"
            fin_p = WORK / f"{key}.wav"
            if not raw_p.exists():
                raise FileNotFoundError(f"Missing raw take: {raw_p}")
            polish_clip(raw_p, fin_p, speaker, style)
            y, sr = load_wav_raw(fin_p)
            dur = len(y) / sr
            a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
            segs, _ = asr.transcribe(a16, language="id", beam_size=3, word_timestamps=True)
            words = []
            heard_parts = []
            for s in segs:
                heard_parts.append(s.text.strip())
                for w in s.words or []:
                    words.append([w.word.strip(), round(float(w.start), 3), round(float(w.end), 3)])
            heard = " ".join(heard_parts)
            score = round(difflib.SequenceMatcher(None, norm_letters(text), norm_letters(heard)).ratio(), 3)
            print(f"[PASS2] {key:12s} | {speaker:8s} | {dur:4.2f}s | score={score:.3f} | {heard}", flush=True)
            sc_lines.append({
                "speaker": speaker,
                "style": style,
                "text": text,
                "score": score,
                "heard": heard,
                "file": str(fin_p.relative_to(ROOT)),
                "durationSec": round(dur, 3),
                "wordsSec": words,
            })
            cur_f += int(round((dur + 0.14) * FPS))
        scenes_out.append({
            "scene": sc_name,
            "from": sc_from,
            "to": cur_f,
            "lines": sc_lines,
        })

    data = {"fps": FPS, "totalFrames": cur_f + 30, "scenes": scenes_out}
    OUT_JSON.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {OUT_JSON} ({len(scenes_out)} scenes)", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", action="store_true")
    ap.add_argument("--pass1", action="store_true")
    ap.add_argument("--pass2", action="store_true")
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--steps", type=int, default=8)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    if args.seeds:
        run_seeds()
    if args.pass1:
        run_pass1(set(args.only) if args.only else None, steps=args.steps, force=args.force)
    if args.pass2:
        run_pass2()


if __name__ == "__main__":
    main()

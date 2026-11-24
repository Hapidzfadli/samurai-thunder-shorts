"""Multi-speaker low-RAM VoxCPM2 + Whisper runner for Kos Bu Tini Ep. 3 v2 (Uji Nyali Gorengan).
Supports distinct Indonesian character voices via zero-shot voice cloning + studio rubberband EQ:
  - narator : Dodi expressive storyteller
  - riko    : Dodi energetic + bright youthful pitch lift (+1.45 semitones, formant preserved)
  - bagas   : vo_pria_hangat.mp3 (warm, super chill friendly male voice)
  - pocong  : vo_pria_bariton.mp3 (deep resonant baritone + subtle pitch drop -1.2 semitones;
              cavernous eerie reverb applied in mixer only during spooky entrance!)
  - kunti   : vo_wanita_cerah.mp3 (real bright expressive Indonesian female voice!)
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
WORK = ROOT / "out" / "voice"
WORK.mkdir(parents=True, exist_ok=True)

DODI = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
BARITON = ROOT / "public" / "audio" / "vo_pria_bariton.mp3"
HANGAT = ROOT / "public" / "audio" / "vo_pria_hangat.mp3"
WANITA = ROOT / "public" / "audio" / "vo_wanita_cerah.mp3"

# Clean speech slices (source, start_sec, end_sec) for each voice profile
SPEAKER_REFS = {
    "narator_narasi": (DODI, 18.00, 28.30),
    "narator_tegas": (DODI, 38.60, 48.85),
    "narator_santai": (DODI, 0.00, 10.40),
    "riko_tegang": (DODI, 38.60, 48.85),
    "riko_tegas": (DODI, 38.60, 48.85),
    "riko_santai": (DODI, 0.00, 10.40),
    "bagas": (HANGAT, 0.28, 9.95),
    "pocong": (BARITON, 0.28, 10.55),
    "kunti": (WANITA, 4.18, 14.85),
}

STYLE = {
    "narasi": "lively storyteller, warm, flowing",
    "santai": "casual, amused, friendly, relaxed",
    "tegang": "tense, dramatic, suspenseful, expressive",
    "tegas": "excited, urgent, loud, expressive",
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


def ensure_refs() -> dict[str, Path]:
    refs = {}
    ref_dir = WORK / "refs_horor_v2"
    ref_dir.mkdir(parents=True, exist_ok=True)
    for k, (src, a, b) in SPEAKER_REFS.items():
        p = ref_dir / f"ref_{k}.wav"
        if not p.exists():
            dur = b - a
            subprocess.run(
                [
                    "ffmpeg", "-y", "-v", "error", "-ss", str(a), "-t", str(dur),
                    "-i", str(src),
                    "-af", f"highpass=f=70,afade=t=in:d=0.05,afade=t=out:st={dur - 0.12}:d=0.12",
                    "-ar", "24000", "-ac", "1", str(p),
                ],
                check=True,
            )
        refs[k] = p
    return refs


def pick_ref(refs: dict[str, Path], speaker: str, style: str) -> Path:
    if f"{speaker}_{style}" in refs:
        return refs[f"{speaker}_{style}"]
    if speaker in refs:
        return refs[speaker]
    return refs["narator_narasi"]


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


def polish_speaker_wav(in_wav: Path, out_wav: Path, speaker: str, scene: str):
    """Apply subtle studio character EQ/formant-preserving pitch polish so every actor is unmistakable."""
    filters = ["highpass=f=75"]
    if speaker == "riko":
        # Bright energetic youthful male voice clearly distinct from Narator
        filters.append("rubberband=pitch=1.085:formant=preserved")
        filters.append("equalizer=f=2800:t=q:w=1.2:g=2.5")
    elif speaker == "pocong":
        # Rich deep comedic baritone (+ ghostly cavern echo ONLY during spooky entrance!)
        filters.append("rubberband=pitch=0.93:formant=preserved")
        filters.append("equalizer=f=180:t=q:w=1.1:g=3.0")
        if scene == "muncul":
            filters.append("aecho=0.8:0.75:95|190:0.35|0.18")
    elif speaker == "kunti":
        # Crisp bright female voice (+ airy sparkle)
        filters.append("rubberband=pitch=1.03:formant=preserved")
        filters.append("equalizer=f=3200:t=q:w=1.2:g=2.0")
    elif speaker == "bagas":
        # Warm relaxed buddy tone
        filters.append("equalizer=f=250:t=q:w=1.2:g=2.0")

    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(in_wav),
            "-af", ",".join(filters),
            "-ar", "48000", "-ac", "1", str(out_wav),
        ],
        check=True,
    )


def load_voxcpm2_lowram(repo_id: str = "openbmb/VoxCPM2"):
    import ctypes
    import os
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


def run_pass1(script_path: Path, name: str, start_idx: int, end_idx: int, takes_override: int | None):
    import ctypes

    torch.set_num_threads(2)
    refs = ensure_refs()
    script = json.loads(script_path.read_text())
    items = []
    for sc in script:
        n_takes = takes_override if takes_override is not None else sc.get("takes", 1)
        for li, (speaker, style, text) in enumerate(sc["lines"]):
            items.append((sc["scene"], li, speaker, style, text, n_takes))

    todo = []
    clip_dir = WORK / name
    for idx, (scene, li, speaker, style, text, n_takes) in enumerate(items):
        if idx < start_idx or idx >= end_idx:
            continue
        for tk in range(n_takes):
            out_p = clip_dir / f"{scene}_{li}_t{tk}.wav"
            if not out_p.exists():
                todo.append((idx, scene, li, speaker, style, text, tk, out_p))

    if not todo:
        print("Pass 1: semua take di rentang ini sudah tersimpan di cache!")
        return

    print(f"Memuat VoxCPM2 multi-speaker (bfloat16)... VmRSS awal: {rss_mb():.0f} MB", flush=True)
    t_load = time.time()
    tts = load_voxcpm2_lowram("openbmb/VoxCPM2")
    sr = tts.tts_model.sample_rate
    print(f"VoxCPM2 siap (sr={sr}) dalam {time.time()-t_load:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)

    for idx, scene, li, speaker, style, text, tk, out_p in todo:
        t0 = time.time()
        tag = STYLE.get(style, style)
        full = f"({tag}){text}" if tag else text
        ref = pick_ref(refs, speaker, style)
        print(f"[{idx:02d} | {scene}_{li} | {speaker}:{style} | ref={ref.name}] {text}", flush=True)
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
        raw_tmp = out_p.with_suffix(".raw.wav")
        save_wav(raw_tmp, y, sr)
        polish_speaker_wav(raw_tmp, out_p, speaker, scene)
        raw_tmp.unlink(missing_ok=True)
        gc.collect()
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass
        y_pol, sr_pol = load_wav_raw(out_p)
        print(f"    -> {len(y_pol)/sr_pol:.2f}s audio | selesai dalam {time.time()-t0:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)


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
    cur = 0.25
    scenes_out = []

    for sc in script:
        sc_from = cur
        lines_out = []
        for li, (speaker, style, text) in enumerate(sc["lines"]):
            cands = sorted(clip_dir.glob(f"{sc['scene']}_{li}_t*.wav"))
            if not cands:
                raise FileNotFoundError(f"Tidak ada take untuk {sc['scene']}_{li}")
            best = None
            for cand in cands:
                y, sr = load_wav_raw(cand)
                if sr_ref is None:
                    sr_ref = sr
                heard, words = hear(y, sr)
                score = difflib.SequenceMatcher(None, letters(text), letters(heard)).ratio()
                print(f"  [{sc['scene']}_{li} | {speaker:7s} | {cand.name}] {score:.3f} <- {heard}", flush=True)
                if best is None or score > best[0]:
                    best = (score, y, words, sr)
            score, y, words, sr = best
            fade = int(0.022 * sr)
            y = y.copy()
            if len(y) > fade * 2:
                y[:fade] *= np.linspace(0, 1, fade)
                y[-fade:] *= np.linspace(1, 0, fade)
            clip_path = clip_dir / f"{sc['scene']}_{li}.wav"
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
                "words": [{"w": w, "from": int(round((cur + a) * FPS)), "to": int(round((cur + b) * FPS))} for w, a, b in words],
            })
            last = li == len(sc["lines"]) - 1
            gap = 0.42 if last else 0.20
            cur += len(y) / sr + gap
        scenes_out.append({"scene": sc["scene"], "from": int(round(sc_from * FPS)), "to": int(round(cur * FPS)), "lines": lines_out})

    timing = {"fps": FPS, "totalFrames": int(round(cur * FPS)) + 8, "scenes": scenes_out}
    (ROOT / "src" / "horor_voice.json").write_text(json.dumps(timing, indent=1, ensure_ascii=False))
    print(f"Saved: src/horor_voice.json ({cur:.1f}s)", flush=True)


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

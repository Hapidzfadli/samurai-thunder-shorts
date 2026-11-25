"""Persistent low-RAM VoxCPM2 COMBO HTTP worker for Operasi Woyla 1981.

Loads VoxCPM2 ONCE into RAM (~3.65 GB), pre-builds Pocket-TTS + real-human prompt_cache
for 'nadia' and 'sintong', and synthesizes one clip per HTTP request with zero reload cost.
"""
from __future__ import annotations

import ctypes
import gc
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import numpy as np
import torch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import voice_combo_woyla as V  # noqa: E402

STATE = {
    "ready": False,
    "status": "starting",
    "tts": None,
    "caches": {},
    "sr": 48000,
    "lines": {},
}
LOCK = threading.Lock()


def load_all():
    try:
        torch.set_num_threads(2)
        script = json.loads(V.SCRIPT_PATH.read_text(encoding="utf-8"))
        for sc in script:
            for li, (spk, style, text) in enumerate(sc["lines"]):
                STATE["lines"][f"{sc['scene']}_{li}"] = (spk, style, text)

        STATE["status"] = "loading_voxcpm2"
        t0 = time.time()
        wrapper = V.load_voxcpm2_lowram(max_len=384)
        model = wrapper.tts_model
        STATE["tts"] = model
        STATE["sr"] = model.sample_rate
        print(f"[worker] Model loaded in {time.time()-t0:.1f}s | sr={STATE['sr']} | RSS={V.rss_mb():.0f}MB", flush=True)

        STATE["status"] = "building_prompt_caches"
        for spk, spec in V.SEED_SPECS.items():
            tc = time.time()
            with torch.inference_mode():
                cache = model.build_prompt_cache(
                    prompt_text=spec["seed_text"],
                    prompt_wav_path=str(spec["seed_wav"]),
                    reference_wav_path=str(spec["ref_6s"]),
                )
            STATE["caches"][spk] = cache
            print(f"[worker] Cached prompt '{spk}' in {time.time()-tc:.1f}s | RSS={V.rss_mb():.0f}MB", flush=True)

        gc.collect()
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass
        STATE["ready"] = True
        STATE["status"] = "ready"
        print(f"[worker] READY on http://127.0.0.1:8765 | total={time.time()-t0:.1f}s | RSS={V.rss_mb():.0f}MB", flush=True)
    except Exception as e:
        STATE["status"] = f"error: {e!r}"
        print(f"[worker] ERROR: {e!r}", flush=True)
        raise


def synth_one(key: str, steps: int = 5, force: bool = False) -> dict:
    if key not in STATE["lines"]:
        raise KeyError(f"Unknown key: {key}")
    spk, style, text = STATE["lines"][key]
    V.WORK.mkdir(parents=True, exist_ok=True)
    raw_p = V.WORK / f"{key}_raw.wav"
    sr = STATE["sr"]

    if raw_p.exists() and raw_p.stat().st_size > 16000 and not force:
        return {"key": key, "cached": True, "path": str(raw_p), "rss_mb": round(V.rss_mb(), 1)}

    model = STATE["tts"]
    cache = STATE["caches"][spk]
    t1 = time.time()
    print(f"[worker] Synth {key} ({spk}:{style}, steps={steps}): {text}", flush=True)
    parts = []
    with torch.inference_mode():
        for ci, (wav_chunk, _, _) in enumerate(model.generate_with_prompt_cache_streaming(
            target_text=text,
            prompt_cache=cache,
            min_len=2,
            max_len=95,
            inference_timesteps=steps,
            cfg_value=2.0,
            retry_badcase=False,
        )):
            parts.append(wav_chunk.squeeze().float().cpu().numpy())
            if ci == 0 or (ci + 1) % 8 == 0:
                print(f"  [{key}] chunk {ci+1} ({(ci+1)*0.16:.2f}s) | {time.time()-t1:.1f}s wall", flush=True)

    wav = np.concatenate(parts) if parts else np.zeros(sr, np.float32)
    wav = np.asarray(wav, np.float32).reshape(-1)
    idx_nz = np.where(np.abs(wav) > 0.008)[0]
    if len(idx_nz):
        wav = wav[max(0, idx_nz[0] - int(0.02 * sr)) : min(len(wav), idx_nz[-1] + int(0.07 * sr))]
    V.save_wav(raw_p, wav, sr)
    gc.collect()
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except Exception:
        pass
    dur = len(wav) / sr
    wall = time.time() - t1
    print(f"[worker] DONE {key}: audio={dur:.2f}s wall={wall:.1f}s RSS={V.rss_mb():.0f}MB", flush=True)
    return {"key": key, "cached": False, "audio_sec": round(dur, 2), "wall_sec": round(wall, 1), "rss_mb": round(V.rss_mb(), 1)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def _send(self, code: int, obj: dict):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        qs = parse_qs(u.query)
        if u.path == "/health":
            done = sorted(p.stem.replace("_raw", "") for p in V.WORK.glob("*_raw.wav")) if V.WORK.exists() else []
            self._send(200, {"ready": STATE["ready"], "status": STATE["status"], "rss_mb": round(V.rss_mb(), 1), "done": done})
            return
        if u.path == "/shutdown":
            self._send(200, {"ok": True, "msg": "shutting down"})
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return
        if u.path == "/synth":
            if not STATE["ready"]:
                self._send(503, {"error": "not ready", "status": STATE["status"]})
                return
            key = (qs.get("key") or [""])[0]
            steps = int((qs.get("steps") or ["6"])[0])
            force = (qs.get("force") or ["0"])[0] == "1"
            try:
                with LOCK:
                    res = synth_one(key, steps=steps, force=force)
                self._send(200, res)
            except Exception as e:
                self._send(500, {"error": repr(e)})
            return
        self._send(404, {"error": "not found"})


def main():
    threading.Thread(target=load_all, daemon=True).start()
    srv = HTTPServer(("127.0.0.1", 8765), Handler)
    print("[worker] HTTP listener up on 127.0.0.1:8765", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()

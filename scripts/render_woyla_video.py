"""Resumable chunked 1080x1920 30fps Remotion render + stereo audio mux for Operasi Woyla 1981."""
from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIMING = ROOT / "src" / "woyla_timing.json"
BUNDLE = ROOT / "out" / "woyla_bundle"
CHUNKS = ROOT / "out" / "woyla_chunks"
AUDIO = ROOT / "public" / "audio" / "woyla_master.mp3"
OUT_MP4 = ROOT / "exports" / "operasi-woyla-1981.mp4"


def _ffmpeg_bin() -> str:
    for cand in (
        ROOT / ".venv" / "bin" / "ffmpeg",
        Path.home() / ".local" / "bin" / "ffmpeg",
        ROOT / "node_modules" / "@remotion" / "compositor-linux-x64-gnu" / "ffmpeg",
    ):
        if cand.exists():
            return str(cand)
    return "ffmpeg"


def render_chunk(idx: int, f0: int, f1: int, force: bool = False):
    CHUNKS.mkdir(parents=True, exist_ok=True)
    out_p = CHUNKS / f"p{idx:02d}_{f0}_{f1}.mp4"
    if out_p.exists() and out_p.stat().st_size > 200_000 and not force:
        print(f"[SKIP] {out_p.name} ({out_p.stat().st_size/1e6:.2f} MB)", flush=True)
        return out_p
    t0 = time.time()
    print(f"[RENDER] chunk {idx:02d}: frames {f0}-{f1} -> {out_p.name}", flush=True)
    subprocess.run(
        [
            "npx", "remotion", "render", str(BUNDLE), "Woyla", str(out_p),
            f"--frames={f0}-{f1}",
            "--gl=swangle",
            "--browser-executable=/usr/bin/google-chrome",
            "--concurrency=2",
            "--muted",
            "--crf=21",
        ],
        cwd=str(ROOT),
        check=True,
    )
    print(f"[DONE] {out_p.name}: {out_p.stat().st_size/1e6:.2f} MB in {time.time()-t0:.1f}s", flush=True)
    return out_p


def mux_all(chunk_files: list[Path]):
    ff = _ffmpeg_bin()
    lst = CHUNKS / "concat.txt"
    lst.write_text("\n".join(f"file '{p.resolve()}'" for p in chunk_files) + "\n", encoding="utf-8")
    silent = CHUNKS / "woyla_silent.mp4"
    subprocess.run(
        [ff, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)],
        check=True,
    )
    OUT_MP4.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            ff, "-y", "-v", "error",
            "-i", str(silent),
            "-i", str(AUDIO),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            "-shortest",
            str(OUT_MP4),
        ],
        check=True,
    )
    mb = OUT_MP4.stat().st_size / (1024 * 1024)
    print(f"MUXED FINAL MP4: {OUT_MP4} ({mb:.2f} MiB)", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chunk-size", type=int, default=240)
    ap.add_argument("--only", type=int, nargs="*", default=None, help="1-based chunk indices to render")
    ap.add_argument("--mux", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    total = json.loads(TIMING.read_text(encoding="utf-8"))["totalFrames"]
    ranges = []
    f = 0
    while f < total:
        f1 = min(total - 1, f + args.chunk_size - 1)
        ranges.append((len(ranges) + 1, f, f1))
        f = f1 + 1

    print(f"Total frames={total} -> {len(ranges)} chunks of <= {args.chunk_size}f", flush=True)
    files = []
    for idx, f0, f1 in ranges:
        p = CHUNKS / f"p{idx:02d}_{f0}_{f1}.mp4"
        if args.only is None or idx in args.only:
            p = render_chunk(idx, f0, f1, force=args.force)
        files.append(p)

    if args.mux:
        missing = [p.name for p in files if not p.exists()]
        if missing:
            raise SystemExit(f"Missing chunks before mux: {missing}")
        mux_all(files)


if __name__ == "__main__":
    main()

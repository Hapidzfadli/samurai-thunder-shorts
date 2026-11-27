"""Resumable chunked Remotion renderer for 'Kucing Mata-Mata CIA $20 Juta' + lossless concat & audio mux.
Usage:
    python3 scripts/render_kucing_chunks.py render <start_chunk> <end_chunk> [chunk_size]
    python3 scripts/render_kucing_chunks.py finalize [chunk_size]
"""
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIMING = json.loads((ROOT / "src" / "kucing_timing.json").read_text())
TOTAL_FRAMES = TIMING["totalFrames"]
BUNDLE_DIR = "/tmp/kucing_bundle"
CHUNK_DIR = ROOT / "out" / "kucing_chunks"
CHUNK_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_MP3 = ROOT / "public" / "audio" / "kucing_master.mp3"
FINAL_MP4 = ROOT / "exports" / "kucing-mata-mata-cia.mp4"


def render_chunks(c_start: int, c_end: int, chunk_size: int = 400):
    n_chunks = math.ceil(TOTAL_FRAMES / chunk_size)
    print(f"Total frames: {TOTAL_FRAMES}, chunk_size: {chunk_size}, total chunks: {n_chunks}", flush=True)
    for ci in range(c_start, min(c_end + 1, n_chunks)):
        f0 = ci * chunk_size
        f1 = min(TOTAL_FRAMES - 1, (ci + 1) * chunk_size - 1)
        out_mp4 = CHUNK_DIR / f"chunk_{ci:02d}.mp4"
        if out_mp4.exists() and out_mp4.stat().st_size > 10_000:
            print(f"[skip] {out_mp4.name} already exists ({out_mp4.stat().st_size / 1024:.0f} KB)", flush=True)
            continue
        print(f"[render] chunk {ci:02d}/{n_chunks - 1}: frames {f0}-{f1} -> {out_mp4.name}", flush=True)
        subprocess.run(
            [
                "npx", "remotion", "render", BUNDLE_DIR, "KucingCia", str(out_mp4),
                f"--frames={f0}-{f1}",
                "--gl=swangle",
                "--concurrency=2",
                "--muted",
                '--props={"withAudio":false}',
            ],
            cwd=str(ROOT),
            check=True,
        )


def finalize(chunk_size: int = 400):
    n_chunks = math.ceil(TOTAL_FRAMES / chunk_size)
    list_txt = Path("/tmp/kucing_concat.txt")
    lines = []
    for ci in range(n_chunks):
        p = CHUNK_DIR / f"chunk_{ci:02d}.mp4"
        if not p.exists():
            raise SystemExit(f"Missing chunk: {p}")
        lines.append(f"file '{p.resolve()}'")
    list_txt.write_text("\n".join(lines) + "\n")

    silent_mp4 = ROOT / "out" / "kucing_silent.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(list_txt), "-c", "copy", str(silent_mp4)],
        check=True,
    )
    FINAL_MP4.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-i", str(silent_mp4),
            "-i", str(AUDIO_MP3),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-movflags", "+faststart",
            str(FINAL_MP4),
        ],
        check=True,
    )
    print(f"FINAL READY: {FINAL_MP4} ({FINAL_MP4.stat().st_size / (1024 * 1024):.2f} MB)", flush=True)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "render":
        cs = int(sys.argv[2])
        ce = int(sys.argv[3])
        sz = int(sys.argv[4]) if len(sys.argv) > 4 else 400
        render_chunks(cs, ce, sz)
    elif cmd == "finalize":
        sz = int(sys.argv[2]) if len(sys.argv) > 2 else 400
        finalize(sz)
    else:
        raise SystemExit("Usage: render_kucing_chunks.py [render c0 c1 [size] | finalize [size]]")

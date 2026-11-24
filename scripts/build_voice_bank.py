"""Build reusable 14-track Indonesian Character Voice Bank & Tektokan Animasi Demos.

Creates:
  - voices/bank_karakter/<id>.wav      : Clean 24 kHz mono reference prompts reusable with VoxCPM2
  - public/audio/bank_karakter/<id>.mp3: Broadcast-normalized (-14 LUFS) audition MP3s
  - voices/bank_karakter/catalog.json  : Complete metadata, EQ/filter recipes & Whisper scores

Run in two low-RAM passes:
  .venv/bin/python scripts/build_voice_bank.py --pass1
  .venv/bin/python scripts/build_voice_bank.py --pass2
"""
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

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "out" / "voice" / "bank_work"
REF_DIR = WORK / "refs"
RAW_DIR = WORK / "raw"
BANK_WAV_DIR = ROOT / "voices" / "bank_karakter"
BANK_MP3_DIR = ROOT / "public" / "audio" / "bank_karakter"

for d in (WORK, REF_DIR, RAW_DIR, BANK_WAV_DIR, BANK_MP3_DIR):
    d.mkdir(parents=True, exist_ok=True)

DODI = ROOT / "analysis" / "mp3" / "dodi_listrik_statis_short.mp3"
BARITON = ROOT / "public" / "audio" / "vo_pria_bariton.mp3"
HANGAT = ROOT / "public" / "audio" / "vo_pria_hangat.mp3"
WANITA_CERAH = ROOT / "public" / "audio" / "vo_wanita_cerah.mp3"
WANITA_STORY = ROOT / "public" / "audio" / "vo_wanita_storyteller.mp3"
QINMU_DRY = ROOT / "public" / "audio" / "vo_youtube_clone.mp3"
MAKIJAH_SOMBONG = ROOT / "voices" / "id_prompts" / "makijah_sombong.wav"

# 12 Solo Character Presets (5 Cewek + 7 Cowok)
CHARACTERS = [
    {
        "id": "01_nadia_storyteller",
        "name": "Mbak Nadia",
        "role": "Storyteller Ceplas-Ceplos",
        "inspiration": "Gaya Nadia Omara",
        "category": "cewek",
        "emoji": "🎙️",
        "base": "wanita_storyteller",
        "style": "warm expressive female storyteller, conversational, slightly amused, intimate",
        "filters": [
            "highpass=f=80",
            "rubberband=pitch=0.985:formant=preserved:pitchq=quality",
            "equalizer=f=200:t=q:w=1.2:g=1.8",
            "equalizer=f=3200:t=q:w=1.2:g=2.0",
        ],
        "text": "Hai wak! Pernah nggak sih niat bikin konten horor tengah malam, eh malah ujungnya nongkrong bareng hantunya sambil makan pisang goreng?!",
        "use_case": "Narator cewek horor-komedi, pembuka cerita viral, komentar ceplas-ceplos.",
    },
    {
        "id": "02_cewek_polos_lucu",
        "name": "Mbak Ara",
        "role": "Cewek Polos Cempreng Lucu",
        "inspiration": "Gaya Arafah Rianti",
        "category": "cewek",
        "emoji": "🤭",
        "base": "wanita_cerah",
        "style": "naive, bright youthful funny girl, playful confused comedic tone",
        "filters": [
            "highpass=f=95",
            "rubberband=pitch=1.10:tempo=1.04:formant=preserved:pitchq=quality",
            "equalizer=f=3500:t=q:w=1.1:g=2.8",
        ],
        "text": "Hah, serius itu hantu beneran?! Aku kira tetangga sebelah lagi pakai selimut putih gara-gara kipas anginnya rusak!",
        "use_case": "Karakter cewek polos-absurd, punchline receh yang tak terduga.",
    },
    {
        "id": "03_cewek_heboh_kartun",
        "name": "Cici Heboh",
        "role": "Cewek Kartun Hiperaktif",
        "inspiration": "Gaya Kobo Kanaeru / Kartun",
        "category": "cewek",
        "emoji": "⚡",
        "base": "wanita_cerah",
        "style": "hyperactive, excited, loud playful cartoon girl, dramatic panic",
        "filters": [
            "highpass=f=105",
            "rubberband=pitch=1.15:tempo=1.07:formant=shifted:pitchq=quality",
            "equalizer=f=3800:t=q:w=1.1:g=2.5",
        ],
        "text": "Woy tunggu dulu jangan ditinggal!! Kalau aku diculik pocong terus disuruh bayar kosan dua kali gimana dong?!",
        "use_case": "Karakter bocil/cewek hiperaktif, adegan panik kartun & anime komedi.",
    },
    {
        "id": "04_bu_tini_ibu_kos",
        "name": "Bu Tini",
        "role": "Ibu Kos Galak tapi Kocak",
        "inspiration": "Gaya Emak Heboh / Rachel",
        "category": "cewek",
        "emoji": "🩴",
        "base": "wanita_storyteller",
        "style": "strict, loud, bossy landlady, dramatic scolding, comedic motherly anger",
        "filters": [
            "highpass=f=75",
            "rubberband=pitch=0.92:tempo=1.03:formant=preserved:pitchq=quality",
            "equalizer=f=240:t=q:w=1.1:g=2.4",
            "equalizer=f=1800:t=q:w=1.1:g=2.6",
        ],
        "text": "Heh Riko! Jam dua pagi bukannya tidur malah bikin asap sekosan! Panci gosong itu potong uang jajan kamu ya!",
        "use_case": "Bu Tini ibu kos, ibu warung cerewet, adegan ngomel yang bikin ngakak.",
    },
    {
        "id": "05_mbak_nisa_santai",
        "name": "Mbak Nisa",
        "role": "Cewek Santai & Nyindir Halus",
        "inspiration": "Gaya Bestie Realistis",
        "category": "cewek",
        "emoji": "💅",
        "base": "wanita_cerah",
        "style": "relaxed, slightly sarcastic, calm friendly amused woman",
        "filters": [
            "highpass=f=80",
            "rubberband=pitch=0.96:formant=preserved:pitchq=quality",
            "equalizer=f=280:t=q:w=1.2:g=1.5",
            "equalizer=f=3000:t=q:w=1.2:g=1.5",
        ],
        "text": "Udah deh, daripada ribut bubur diaduk apa nggak, mending kalian lunasin dulu utang gorengan minggu lalu.",
        "use_case": "Penengah waras di tengah keributan, sindiran halus penutup komedi.",
    },
    {
        "id": "06_riko_panikan",
        "name": "Riko",
        "role": "Anak Kos Panikan (Tektokan)",
        "inspiration": "Gaya Dalang Pelo / Tekotok",
        "category": "cowok",
        "emoji": "😱",
        "base": "dodi_tegas",
        "style": "panicked, fast energetic young man, frantic, loud comedic urgency",
        "filters": [
            "highpass=f=85",
            "rubberband=pitch=1.09:tempo=1.05:formant=preserved:pitchq=quality",
            "equalizer=f=2800:t=q:w=1.2:g=2.5",
        ],
        "text": "Gawat Gas, gawat! Itu bukan angin biasa, lampu terasnya kedap-kedip sendiri kayak disko kampung!",
        "use_case": "Karakter utama panikan, dialog tektokan cepat & overreacting.",
    },
    {
        "id": "07_bagas_santai",
        "name": "Bagas",
        "role": "Bestie Santai & Deadpan",
        "inspiration": "Gaya Teman Receh Santuy",
        "category": "cowok",
        "emoji": "😎",
        "base": "pria_hangat",
        "style": "super chill, deadpan funny, warm friendly relaxed guy",
        "filters": [
            "highpass=f=75",
            "equalizer=f=240:t=q:w=1.2:g=2.2",
        ],
        "text": "Tenang aja Rik, hantu juga butuh karbohidrat. Nih aku bawa pisang goreng hangat sama kopi hitam!",
        "use_case": "Pasangan tektokan Riko yang selalu santai di situasi genting.",
    },
    {
        "id": "08_narator_komedi",
        "name": "Dodi Narator",
        "role": "Narator Komedi Enerjik",
        "inspiration": "Gaya Shorts Viral",
        "category": "cowok",
        "emoji": "🎬",
        "base": "dodi_narasi",
        "style": "lively energetic Indonesian comedy narrator, punchy, expressive storytelling",
        "filters": [
            "highpass=f=75",
            "equalizer=f=2600:t=q:w=1.2:g=1.8",
        ],
        "text": "Di Kos Bu Tini, masalah sekecil apa pun selalu bisa berubah jadi perang dunia dalam waktu tiga detik!",
        "use_case": "Narator hook 3 detik pertama, narasi cepat penuh energi.",
    },
    {
        "id": "09_narator_qinmu_epik",
        "name": "Narator Epik",
        "role": "Storyteller Donghua & Aksi",
        "inspiration": "Gaya Qin Mu / Promen",
        "category": "cowok",
        "emoji": "⚔️",
        "base": "qinmu_dry",
        "style": "epic dramatic storyteller, clear authoritative narrator, engaging rhythm",
        "filters": [
            "highpass=f=70",
            "equalizer=f=160:t=q:w=1.2:g=2.4",
            "equalizer=f=3200:t=q:w=1.2:g=2.0",
        ],
        "text": "Aura kedua pendekar itu langsung beradu di udara! Tidak ada yang menyangka, pertarungan ini cuma gara-gara rebutan kerupuk terakhir!",
        "use_case": "Narasi aksi parodi anime, sejarah epik, atau cerita donghua/silat.",
    },
    {
        "id": "10_bapak_bang_udin",
        "name": "Bang Udin / Pak RT",
        "role": "Bapak-Bapak Bariton Kocak",
        "inspiration": "Gaya Bimo Kusumo Bapak",
        "category": "cowok",
        "emoji": "🧔",
        "base": "pria_bariton",
        "style": "warm humorous older man, booming friendly fatherly voice, amused",
        "filters": [
            "highpass=f=65",
            "rubberband=pitch=0.94:formant=preserved:pitchq=quality",
            "equalizer=f=160:t=q:w=1.1:g=3.0",
        ],
        "text": "Woi anak-anak muda! Mau bubur diaduk kek, nggak diaduk kek, yang penting bon utangnya dibayar dulu dong!",
        "use_case": "Penjual warung, Pak RT, sesepuh kampung, suara berwibawa tapi kocak.",
    },
    {
        "id": "11_rival_sombong",
        "name": "Mas Sombong",
        "role": "Rival Lebay & Teatrikal",
        "inspiration": "Gaya Animasi Sombong",
        "category": "cowok",
        "emoji": "🦚",
        "base": "makijah_sombong",
        "style": "arrogant, theatrical, boastful comedic show-off guy",
        "filters": [
            "highpass=f=80",
            "rubberband=pitch=1.02:tempo=1.03:formant=preserved:pitchq=quality",
            "equalizer=f=2400:t=q:w=1.2:g=2.2",
        ],
        "text": "Halah, uji nyali lima menit aja gemetaran! Lihat nih master pemberani, jangankan pocong, tagihan listrik aja aku hadapi!",
        "use_case": "Karakter sok jago yang ujungnya kena karma paling lucu.",
    },
    {
        "id": "12_hantu_pocong_lucu",
        "name": "Kang Pocong",
        "role": "Hantu Bariton Curhat Lucu",
        "inspiration": "Horor → Komedi Lokal",
        "category": "cowok",
        "emoji": "👻",
        "base": "pria_bariton",
        "style": "deep resonant spooky ghost turning friendly, tired, humorous",
        "filters": [
            "highpass=f=65",
            "rubberband=pitch=0.88:formant=preserved:pitchq=quality",
            "equalizer=f=150:t=q:w=1.1:g=3.2",
            "aecho=0.8:0.7:65:0.22",
        ],
        "text": "Hiii... eh maaf mas, betis saya kram gara-gara lompat dari ujung gang. Boleh minta pisang gorengnya satu nggak?",
        "use_case": "Karakter hantu kocak, monster ramah, efek suara gua/mistis.",
    },
]

# 2 Multi-Character Tektokan Animasi Demos (6 lines total)
TEKTOKAN_DEMOS = [
    {
        "id": "13_demo_tektokan_horor",
        "name": "Tektokan Horor Cepat",
        "role": "Riko + Mbak Ara + Kang Pocong",
        "inspiration": "Timing Rapat ala Dalang Pelo",
        "category": "tektokan",
        "emoji": "🎭",
        "use_case": "Contoh dialog 3 karakter sahut-sahutan super rapat (jeda 0,09 detik) untuk komedi animasi.",
        "turns": [
            ("d1_0", "06_riko_panikan", -0.22, "Lari Ra lari! Di belakang ada pocong melotot!"),
            ("d1_1", "02_cewek_polos_lucu", +0.22, "Hah, yang pakai baju putih itu? Kirain paket kasur gulung aku baru nyampe!"),
            ("d1_2", "12_hantu_pocong_lucu", 0.00, "Heh enak aja kasur gulung! Ini kain kafan baru disetrika tahu!"),
        ],
    },
    {
        "id": "14_demo_tektokan_kosan",
        "name": "Storyteller → Tektokan Kosan",
        "role": "Mbak Nadia + Riko + Bu Tini",
        "inspiration": "Transisi Nadia Omara → Komedi",
        "category": "tektokan",
        "emoji": "🔥",
        "use_case": "Contoh format narator cewek ceplas-ceplos disambung langsung tektokan panik & emak ngegas.",
        "turns": [
            ("d2_0", "01_nadia_storyteller", 0.00, "Hai wak! Jadi malam itu Riko sok-sokan bikin konten masak jam dua pagi."),
            ("d2_1", "06_riko_panikan", -0.22, "Ssttt diem dulu, ini resep rahasia bintang lima!"),
            ("d2_2", "04_bu_tini_ibu_kos", +0.24, "Bintang lima apanya?! Dapur Ibu udah kayak knalpot bajaj nih!"),
        ],
    },
]

CHAR_MAP = {c["id"]: c for c in CHARACTERS}
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


def ensure_base_refs() -> dict[str, Path]:
    refs: dict[str, Path] = {}

    def cut(name: str, src: Path, a: float, b: float):
        p = REF_DIR / f"ref_{name}.wav"
        if not p.exists():
            dur = b - a
            subprocess.run(
                [
                    "ffmpeg", "-y", "-v", "error", "-ss", str(a), "-t", str(dur),
                    "-i", str(src),
                    "-af", f"highpass=f=70,afade=t=in:d=0.04,afade=t=out:st={max(0.05, dur-0.1)}:d=0.1",
                    "-ar", "24000", "-ac", "1", str(p),
                ],
                check=True,
            )
        refs[name] = p

    # Pure female storyteller concatenation (zero male bleed!)
    ws_p = REF_DIR / "ref_wanita_storyteller.wav"
    if not ws_p.exists():
        # Segments verified pure female via silencedetect + audio inspection
        fc = (
            "[0:a]atrim=1.27:3.85,asetpts=PTS-STARTPTS[a0];"
            "[0:a]atrim=11.16:14.92,asetpts=PTS-STARTPTS[a1];"
            "[0:a]atrim=15.88:18.75,asetpts=PTS-STARTPTS[a2];"
            "[0:a]atrim=26.91:29.75,asetpts=PTS-STARTPTS[a3];"
            "[a0][a1][a2][a3]concat=n=4:v=0:a=1,highpass=f=70[out]"
        )
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(WANITA_STORY), "-filter_complex", fc, "-map", "[out]", "-ar", "24000", "-ac", "1", str(ws_p)],
            check=True,
        )
    refs["wanita_storyteller"] = ws_p

    cut("wanita_cerah", WANITA_CERAH, 4.18, 14.85)
    cut("dodi_narasi", DODI, 18.00, 28.30)
    cut("dodi_tegas", DODI, 38.60, 48.85)
    cut("pria_hangat", HANGAT, 0.28, 9.95)
    cut("pria_bariton", BARITON, 0.28, 10.55)
    cut("qinmu_dry", QINMU_DRY, 0.25, 10.80)
    cut("makijah_sombong", MAKIJAH_SOMBONG, 0.0, 5.95)
    return refs


def save_wav(path: Path, y: np.ndarray, sr: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes((np.clip(y, -1.0, 1.0) * 32767).astype(np.int16).tobytes())


def load_wav(path: Path):
    with wave.open(str(path), "rb") as wf:
        sr = wf.getframerate()
        y = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32767.0
    return y, sr


def polish_clip(in_wav: Path, out_wav: Path, filters: list[str], sr_out: int = 48000):
    af = ",".join(filters + ["loudnorm=I=-15:TP=-1.5:LRA=9"])
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(in_wav), "-af", af, "-ar", str(sr_out), "-ac", "1", str(out_wav)],
        check=True,
    )


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
    audio_vae.load_state_dict(vae_ckpt.get("state_dict", vae_ckpt), strict=False)
    del vae_ckpt
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
    with safe_open(st_path, framework="pt", device="cpu") as sf:
        with torch.no_grad():
            for k in sf.keys():
                if k in state_map:
                    t = sf.get_tensor(k)
                    state_map[k].copy_(t)
                    del t
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
    wrapper = VoxCPM.__new__(VoxCPM)
    wrapper.tts_model = model
    wrapper.text_normalizer = None
    wrapper.denoiser = None
    print(f"VoxCPM2 siap | Live VmRSS: {rss_mb():.0f} MB", flush=True)
    return wrapper


def build_jobs(only_ids: set[str] | None, take: int):
    jobs = []
    for c in CHARACTERS:
        if only_ids and c["id"] not in only_ids:
            continue
        out_p = RAW_DIR / f"{c['id']}_t{take}.wav"
        jobs.append((c["id"], c["base"], c["style"], c["filters"], c["text"], out_p))
    for demo in TEKTOKAN_DEMOS:
        for turn_id, char_id, _pan, text in demo["turns"]:
            if only_ids and turn_id not in only_ids and demo["id"] not in only_ids:
                continue
            c = CHAR_MAP[char_id]
            out_p = RAW_DIR / f"{turn_id}_t{take}.wav"
            jobs.append((turn_id, c["base"], c["style"], c["filters"], text, out_p))
    return jobs


def run_pass1(only_ids: set[str] | None, take: int):
    torch.set_num_threads(2)
    refs = ensure_base_refs()
    jobs = [j for j in build_jobs(only_ids, take) if not j[5].exists()]
    if not jobs:
        print("Pass 1: semua klip target sudah ada di cache!", flush=True)
        return

    tts = load_voxcpm2_lowram()
    sr = tts.tts_model.sample_rate
    for idx, (jid, base, style, filters, text, out_p) in enumerate(jobs):
        t0 = time.time()
        ref = refs[base]
        full = f"({style}){text}"
        print(f"[{idx+1:02d}/{len(jobs):02d} | {jid} | ref={base}] {text}", flush=True)
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
        raw_tmp = out_p.with_suffix(".tmp.wav")
        save_wav(raw_tmp, y, sr)
        polish_clip(raw_tmp, out_p, filters, sr_out=48000)
        raw_tmp.unlink(missing_ok=True)
        gc.collect()
        try:
            ctypes.CDLL("libc.so.6").malloc_trim(0)
        except Exception:
            pass
        y2, sr2 = load_wav(out_p)
        print(f"    -> {len(y2)/sr2:.2f}s | {time.time()-t0:.1f}s | VmRSS: {rss_mb():.0f} MB", flush=True)


def run_pass2():
    from faster_whisper import WhisperModel
    from scipy import signal

    print(f"Memuat Whisper small (int8)... VmRSS: {rss_mb():.0f} MB", flush=True)
    asr = WhisperModel("small", device="cpu", compute_type="int8")

    def score_best(prefix: str, target_text: str):
        cands = sorted(RAW_DIR.glob(f"{prefix}_t*.wav"))
        if not cands:
            raise FileNotFoundError(f"Tidak ada take untuk {prefix}")
        best = None
        for cand in cands:
            y, sr = load_wav(cand)
            a16 = signal.resample(y, int(len(y) * 16000 / sr)).astype(np.float32)
            segs, _ = asr.transcribe(a16, language="id", beam_size=5)
            heard = " ".join(s.text.strip() for s in segs).strip()
            sc = difflib.SequenceMatcher(None, letters(target_text), letters(heard)).ratio()
            print(f"  [{prefix:24s} | {cand.name}] {sc:.3f} <- {heard}", flush=True)
            if best is None or sc > best[0]:
                best = (sc, cand, heard, len(y) / sr)
        return best

    catalog_entries = []
    low_scores = []

    # 1. Solo 12 characters -> clean 24kHz WAV prompt + broadcast -14 LUFS MP3
    for c in CHARACTERS:
        sc, best_wav, heard, dur = score_best(c["id"], c["text"])
        if sc < 0.85:
            low_scores.append((c["id"], sc))
        wav_out = BANK_WAV_DIR / f"{c['id']}.wav"
        mp3_out = BANK_MP3_DIR / f"{c['id']}.mp3"
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(best_wav), "-ar", "24000", "-ac", "1", str(wav_out)],
            check=True,
        )
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error", "-i", str(best_wav),
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=8",
                "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", str(mp3_out),
            ],
            check=True,
        )
        catalog_entries.append({
            "id": c["id"],
            "name": c["name"],
            "role": c["role"],
            "inspiration": c["inspiration"],
            "category": c["category"],
            "emoji": c["emoji"],
            "base": c["base"],
            "style": c["style"],
            "filters": c["filters"],
            "text": c["text"],
            "use_case": c["use_case"],
            "durationSec": round(dur, 2),
            "whisperScore": round(sc, 3),
            "wavRef": str(wav_out.relative_to(ROOT)),
            "mp3": str(mp3_out.relative_to(ROOT)),
        })

    # 2. Multi-character Tektokan Animasi Demos (snappy 0.09s banter + stereo panning!)
    sr_mix = 48000
    for demo in TEKTOKAN_DEMOS:
        turn_waves = []
        turn_scores = []
        turn_lines = []
        for turn_id, char_id, pan, text in demo["turns"]:
            sc, best_wav, heard, dur = score_best(turn_id, text)
            if sc < 0.85:
                low_scores.append((turn_id, sc))
            y, sr = load_wav(best_wav)
            if sr != sr_mix:
                y = signal.resample(y, int(len(y) * sr_mix / sr)).astype(np.float32)
            # Tight edge trim for snappy animation tektokan
            w = np.where(np.abs(y) > 0.015)[0]
            if len(w) > 0:
                y = y[max(0, w[0] - int(0.025 * sr_mix)) : w[-1] + int(0.055 * sr_mix)]
            fade = int(0.015 * sr_mix)
            if len(y) > fade * 2:
                y = y.copy()
                y[:fade] *= np.linspace(0, 1, fade)
                y[-fade:] *= np.linspace(1, 0, fade)
            turn_waves.append((y, pan))
            turn_scores.append(sc)
            turn_lines.append(f"{CHAR_MAP[char_id]['name']}: \"{text}\"")

        gap = int(0.09 * sr_mix)
        lead = int(0.12 * sr_mix)
        tail = int(0.25 * sr_mix)
        total_len = lead + sum(len(y) for y, _ in turn_waves) + gap * (len(turn_waves) - 1) + tail
        mix = np.zeros((total_len, 2), np.float32)
        pos = lead
        for y, pan in turn_waves:
            gl = float(np.cos((pan + 1.0) * np.pi / 4.0))
            gr = float(np.sin((pan + 1.0) * np.pi / 4.0))
            mix[pos : pos + len(y), 0] += y * gl * 1.35
            mix[pos : pos + len(y), 1] += y * gr * 1.35
            pos += len(y) + gap

        peak = float(np.max(np.abs(mix))) + 1e-6
        if peak > 0.92:
            mix *= 0.92 / peak

        tmp_stereo = WORK / f"{demo['id']}_stereo.wav"
        with wave.open(str(tmp_stereo), "wb") as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(sr_mix)
            wf.writeframes((np.clip(mix, -1.0, 1.0) * 32767).astype(np.int16).tobytes())

        mp3_out = BANK_MP3_DIR / f"{demo['id']}.mp3"
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error", "-i", str(tmp_stereo),
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=8",
                "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", str(mp3_out),
            ],
            check=True,
        )
        tmp_stereo.unlink(missing_ok=True)
        dur = total_len / sr_mix
        catalog_entries.append({
            "id": demo["id"],
            "name": demo["name"],
            "role": demo["role"],
            "inspiration": demo["inspiration"],
            "category": demo["category"],
            "emoji": demo["emoji"],
            "text": "  |  ".join(turn_lines),
            "use_case": demo["use_case"],
            "durationSec": round(dur, 2),
            "whisperScore": round(float(np.mean(turn_scores)), 3),
            "wavRef": None,
            "mp3": str(mp3_out.relative_to(ROOT)),
        })

    cat_path = BANK_WAV_DIR / "catalog.json"
    cat_path.write_text(json.dumps({"total": len(catalog_entries), "voices": catalog_entries}, indent=2, ensure_ascii=False))
    print(f"\nSelesai! Saved {len(catalog_entries)} voices -> {cat_path}", flush=True)
    if low_scores:
        print("PERINGATAN skor < 0.85:", low_scores, flush=True)
    else:
        print("SEMUA 18 klip lolos Whisper >= 0.85!", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pass1", action="store_true")
    ap.add_argument("--pass2", action="store_true")
    ap.add_argument("--only", default="", help="Comma-separated IDs to synthesize/retry")
    ap.add_argument("--take", type=int, default=0)
    args = ap.parse_args()
    only_ids = {x.strip() for x in args.only.split(",") if x.strip()} if args.only else None
    if args.pass1:
        run_pass1(only_ids, args.take)
    if args.pass2:
        run_pass2()


if __name__ == "__main__":
    main()

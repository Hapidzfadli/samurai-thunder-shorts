"""Offline production package checks. Does not certify visual quality or T4 support."""
import argparse
import ast
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def check(root=ROOT):
    failures, results = [], []
    def require(ok, label):
        (results if ok else failures).append(label)
    needed = ['src/renderSunTzu.tsx', 'src/SunTzu.tsx', 'src/scenesSunTzu.tsx',
              'src/suntzu_timing.json', 'src/suntzu_voice.json',
              'scripts/naskah/suntzu.json', 'public/audio/suntzu_master.mp3',
              'public/models/suntzu-palace.glb', 'colab/SunTzu_Colab_T4.ipynb',
              'package-lock.json']
    for name in needed:
        p = root / name
        require(p.is_file() and p.stat().st_size > 0, 'file: ' + name)
    timing_path = root / 'src/suntzu_timing.json'
    if timing_path.exists():
        t = json.loads(timing_path.read_text())
        require(t.get('fps') == 30, 'timing fps=30')
        order = t.get('order', [])
        require(len(order) == 8 and len(set(order)) == 8, 'eight unique scenes')
        cursor = 0
        for name in order:
            scene = t['scenes'][name]
            duration = scene['durationInFrames']
            require(scene['startFrame'] == cursor and duration > 0, 'contiguous scene: ' + name)
            for i, line in enumerate(t.get('lines', {}).get(name, [])):
                require(line['voice'] in ['dodi', 'ara'], f'voice {name}/{i}')
                require(0 <= line['from'] < line['to'] <= duration, f'line bounds {name}/{i}')
                previous = -1
                for word in line.get('words', []):
                    require(0 <= word['from'] <= word['to'] <= duration and word['from'] >= previous,
                            f'word bounds {name}/{i}/{word.get("w", "")}')
                    previous = word['from']
            cursor += duration
        require(t.get('totalFrames') == cursor, 'total frame sum')
        require(not t.get('estimated', False), 'timing not marked estimated')
        audio = root / 'public/audio/suntzu_master.mp3'
        if audio.exists():
            r = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                                '-of','default=nw=1:nk=1', str(audio)],capture_output=True,text=True)
            require(r.returncode == 0, 'audio decodes with ffprobe')
            if r.returncode == 0:
                require(abs(float(r.stdout) - cursor / 30) < .15, 'audio matches timeline within 150ms')
    notebook = root / 'colab/SunTzu_Colab_T4.ipynb'
    if notebook.exists():
        n = json.loads(notebook.read_text())
        require(n.get('nbformat') == 4, 'notebook format 4')
        for i, cell in enumerate(n['cells']):
            if cell['cell_type'] != 'code':
                continue
            source = ''.join(cell['source'])
            if not any(line.startswith(('%','!')) for line in source.splitlines()):
                try:
                    ast.parse(source)
                    require(True, f'notebook Python syntax cell {i}')
                except SyntaxError as e:
                    require(False, f'notebook cell {i}: {e}')
            require(not cell.get('outputs'), f'notebook outputs cleared {i}')
    hashes = {name: hashlib.sha256((root/name).read_bytes()).hexdigest()
              for name in needed if (root/name).is_file()}
    return dict(status='checks_passed' if not failures else 'incomplete',
                passed=len(results), failures=failures, checks=results, sha256=hashes,
                limits=['Does not certify visual QA, spoken pronunciation or actual Colab T4 execution.'])

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    report = check()
    output = json.dumps(report, ensure_ascii=False, indent=2)
    print(output)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output + chr(10))
    raise SystemExit(0 if report['status'] == 'checks_passed' else 1)

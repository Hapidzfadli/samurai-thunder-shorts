// Continuous zero-overhead resumable frame renderer: opens Chrome tabs ONCE and migrates each frame live!
import fs from "node:fs";
import path from "node:path";
import { openBrowser, renderFrames, selectComposition } from "@remotion/renderer";

const ROOT = process.cwd();
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, "src/woyla_timing.json"), "utf8"));
const bundle = path.join(ROOT, "out/woyla_bundle");
const seqDir = path.join(ROOT, "out/woyla_seq");
const tmpDir = path.join(ROOT, "out/woyla_tmp");
fs.mkdirSync(seqDir, { recursive: true });

const step = 2;
const total = timing.totalFrames;
const expected = [];
for (let f = 0; f < total; f += step) expected.push(f);

const getExisting = () =>
  new Set(
    fs.readdirSync(seqDir)
      .filter((n) => n.startsWith("f_") && n.endsWith(".jpeg") && fs.statSync(path.join(seqDir, n)).size > 4000)
      .map((n) => Number(n.replace("f_", "").replace(".jpeg", "")))
  );

const existing = getExisting();
const missing = expected.filter((f) => !existing.has(f));
console.log(`Woyla Continuous Seq (step=${step}, scale=0.5): done=${existing.size}/${expected.length} | missing=${missing.length}`);
if (missing.length === 0) process.exit(0);

const runs = [];
let rStart = missing[0];
let rPrev = missing[0];
for (let i = 1; i < missing.length; i++) {
  if (missing[i] !== rPrev + step) {
    runs.push([rStart, rPrev]);
    rStart = missing[i];
  }
  rPrev = missing[i];
}
runs.push([rStart, rPrev]);

const flushTmp = (f0) => {
  if (!fs.existsSync(tmpDir)) return 0;
  let moved = 0;
  for (const name of fs.readdirSync(tmpDir)) {
    if (!name.startsWith("element-") || !name.endsWith(".jpeg")) continue;
    const src = path.join(tmpDir, name);
    try {
      if (fs.statSync(src).size < 4000) continue;
      const idx = Number(name.replace("element-", "").replace(".jpeg", ""));
      const tf = f0 + idx * step;
      const dst = path.join(seqDir, `f_${String(tf).padStart(5, "0")}.jpeg`);
      fs.renameSync(src, dst);
      moved++;
    } catch {
      // File still finishing write on concurrent tab
    }
  }
  return moved;
};

const browser = await openBrowser("chrome", {
  browserExecutable: "/usr/bin/google-chrome",
  chromiumOptions: { gl: "swangle" },
});
try {
  const composition = await selectComposition({
    serveUrl: bundle,
    id: "Woyla",
    puppeteerInstance: browser,
  });
  const t0 = Date.now();
  let rendered = 0;
  for (const [f0, f1] of runs) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    await renderFrames({
      composition,
      serveUrl: bundle,
      outputDir: tmpDir,
      imageFormat: "jpeg",
      jpegQuality: 94,
      scale: 0.5,
      everyNthFrame: step,
      frameRange: [f0, f1],
      concurrency: 2,
      puppeteerInstance: browser,
      chromiumOptions: { gl: "swangle" },
      onStart: () => {},
      onFrameUpdate: () => {
        rendered++;
        flushTmp(f0);
        if (rendered % 25 === 0 || rendered === missing.length) {
          const sec = (Date.now() - t0) / 1000;
          const nowCount = getExisting().size;
          console.log(`[LIVE] ${nowCount}/${expected.length} (+${rendered} in ${sec.toFixed(1)}s | ${(sec / rendered).toFixed(2)}s/f)`);
        }
      },
    });
    flushTmp(f0);
  }
} finally {
  await browser.close({ silent: true });
}

// Resumable single-browser chunked 1080x1920 30fps renderer for Operasi Woyla 1981
import fs from "node:fs";
import path from "node:path";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";

const ROOT = process.cwd();
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, "src/woyla_timing.json"), "utf8"));
const bundle = path.join(ROOT, "out/woyla_bundle");
const chunksDir = path.join(ROOT, "out/woyla_chunks");
fs.mkdirSync(chunksDir, { recursive: true });

const args = process.argv.slice(2);
const chunkSize = Number(args.find((a) => a.startsWith("--chunk="))?.split("=")[1] ?? 60);
const maxChunks = Number(args.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 999);
const scale = Number(args.find((a) => a.startsWith("--scale="))?.split("=")[1] ?? 0.6667);
const force = args.includes("--force");

const total = timing.totalFrames;
const ranges = [];
for (let f = 0; f < total; f += chunkSize) {
  ranges.push([ranges.length + 1, f, Math.min(total - 1, f + chunkSize - 1)]);
}

const todo = ranges.filter(([idx, f0, f1]) => {
  const outP = path.join(chunksDir, `p${String(idx).padStart(2, "0")}_${f0}_${f1}.mp4`);
  return force || !(fs.existsSync(outP) && fs.statSync(outP).size > 50_000);
});

console.log(`Woyla Render: total=${total}f (${ranges.length} chunks of ${chunkSize}f, scale=${scale}) | done=${ranges.length - todo.length}/${ranges.length} | todo=${todo.length}`);
if (todo.length === 0) process.exit(0);

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
  let rendered = 0;
  for (const [idx, f0, f1] of todo) {
    if (rendered >= maxChunks) break;
    const outP = path.join(chunksDir, `p${String(idx).padStart(2, "0")}_${f0}_${f1}.mp4`);
    const tmpP = outP + ".part.mp4";
    const t0 = Date.now();
    await renderMedia({
      composition,
      serveUrl: bundle,
      codec: "h264",
      crf: 18,
      scale,
      imageFormat: "jpeg",
      jpegQuality: 92,
      pixelFormat: "yuv420p",
      muted: true,
      concurrency: 2,
      frameRange: [f0, f1],
      outputLocation: tmpP,
      puppeteerInstance: browser,
      chromiumOptions: { gl: "swangle" },
    });
    fs.renameSync(tmpP, outP);
    const mb = (fs.statSync(outP).size / 1e6).toFixed(2);
    console.log(`[OK] chunk ${String(idx).padStart(2, "0")}/${ranges.length} (${f0}-${f1}) -> ${mb} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    rendered++;
  }
} finally {
  await browser.close({ silent: true });
}

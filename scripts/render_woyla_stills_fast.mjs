// Ultra-fast single-browser 16-frame still-check renderer via @remotion/renderer
import fs from "node:fs";
import path from "node:path";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const ROOT = process.cwd();
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, "src/woyla_timing.json"), "utf8"));
const bundle = path.join(ROOT, "out/woyla_bundle");
const outDir = path.join(ROOT, "out/woyla_stillcheck_frames");
fs.mkdirSync(outDir, { recursive: true });

const picks = [];
for (const sc of timing.order) {
  const { startFrame: st, durationInFrames: dur } = timing.scenes[sc];
  if (sc === "ababa") {
    picks.push([st + Math.floor(dur * 0.3), `${sc} · Sintong VHF`]);
    picks.push([st + Math.floor(dur * 0.78), `${sc} · Pin Pull`]);
  } else if (sc === "klimaks") {
    picks.push([st + 14, `${sc} · Breach+Flash`]);
    picks.push([st + Math.floor(dur * 0.62), `${sc} · Bullet-Time 360`]);
  } else {
    picks.push([st + Math.floor(dur * 0.25), `${sc} · A`]);
    picks.push([st + Math.floor(dur * 0.72), `${sc} · B`]);
  }
}

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
  for (let i = 0; i < picks.length; i++) {
    const [fno, lbl] = picks[i];
    const outP = path.join(outDir, `f_${String(i).padStart(2, "0")}_${fno}.png`);
    if (fs.existsSync(outP) && fs.statSync(outP).size > 10000) {
      console.log(`[SKIP] ${path.basename(outP)}`);
      continue;
    }
    const t0 = Date.now();
    await renderStill({
      composition,
      serveUrl: bundle,
      output: outP,
      frame: fno,
      scale: 0.5,
      puppeteerInstance: browser,
      chromiumOptions: { gl: "swangle" },
    });
    console.log(`[OK] #${i + 1}/16 f=${fno} (${lbl}) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} finally {
  await browser.close({ silent: true });
}

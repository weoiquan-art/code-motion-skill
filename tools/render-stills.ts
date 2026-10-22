// Render many stills from one bundle (much faster than calling `remotion still`
// once per frame, which re-bundles every time). For the review loop: render the
// frames you care about, then tile them with tools/contact-sheet.py.
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/render-stills.ts <Composition> <outDir> 0,120,300,...
// Uses the headless shell that ships in the claude.ai cloud container; set
// REMOTION_BROWSER to override. Output files are <outDir>/f<frame>.png.
// @remotion/bundler and @remotion/renderer come with @remotion/cli.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const [id, outDir, list] = process.argv.slice(2);
if (!id || !outDir || !list) throw new Error("usage: render-stills.ts <Composition> <outDir> <frame,frame,...>");
const frames = list.split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x));
const browserExecutable = process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const frame of frames) {
  const output = path.join(outDir, `f${frame}.png`);
  await renderStill({ serveUrl, composition, frame, output, browserExecutable });
  console.log(output);
}

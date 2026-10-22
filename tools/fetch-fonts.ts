// Downloads the font files a film needs into public/fonts/ (only the Noto Sans
// SC / Noto Serif SC slices its text uses, plus Inter and JetBrains Mono
// latin). Skips files that already exist. Run with the proxy enabled:
//   NODE_USE_ENV_PROXY=1 node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/fetch-fonts.ts
// Re-run whenever on-screen text gains new characters.
// Edit the import below to point at the film's text constant.
// Source: JIN-motion- scripts/fetch-fonts.ts + scripts/fetch-fonts-free.ts.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getMonoInfo } from "@remotion/google-fonts/JetBrainsMono";
import { getInfo as getSansInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { ALL_TEXT } from "../src/film/timeline.ts";
import { INTER_DIR, localFontPath, MONO_DIR, NOTO_DIR, notoSubsetsCjkFirst, SERIF_DIR } from "../src/lib/fonts/font-subsets.ts";

const inter = getInterInfo();
const mono = getMonoInfo();
const jobs: { dir: string; url: string }[] = [];
for (const [info, dir] of [
  [getSansInfo(), NOTO_DIR],
  [getSerifInfo(), SERIF_DIR],
] as const) {
  const files = info.fonts.normal as Record<string, Record<string, string>>;
  for (const s of notoSubsetsCjkFirst(ALL_TEXT, info.unicodeRanges as Record<string, string>, inter.unicodeRanges.latin)) {
    jobs.push({ dir, url: files["400"][s] });
  }
}
jobs.push({ dir: INTER_DIR, url: (inter.fonts.normal as Record<string, Record<string, string>>)["400"].latin });
jobs.push({ dir: MONO_DIR, url: (mono.fonts.normal as Record<string, Record<string, string>>)["400"].latin });

let fetched = 0;
for (const { dir, url } of jobs) {
  const out = join("public", localFontPath(dir, url));
  if (existsSync(out)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  mkdirSync(dirname(out), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(out, buf);
  fetched++;
  console.log(`${out}  ${buf.length} bytes`);
}
console.log(`${jobs.length} font files needed, ${fetched} downloaded now.`);

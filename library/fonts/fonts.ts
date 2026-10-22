import { loadFont } from "@remotion/fonts";
import { getInfo as getInterInfo } from "@remotion/google-fonts/Inter";
import { getInfo as getMonoInfo } from "@remotion/google-fonts/JetBrainsMono";
import { getInfo as getSansInfo } from "@remotion/google-fonts/NotoSansSC";
import { getInfo as getSerifInfo } from "@remotion/google-fonts/NotoSerifSC";
import { staticFile } from "remotion";
import { INTER_DIR, localFontPath, MONO_DIR, NOTO_DIR, notoSubsetsCjkFirst, SERIF_DIR, withoutAscii } from "./font-subsets.ts";

// Register local fonts for a film. Call ONCE at the top level of the project's
// fonts.ts with every character that appears on screen:
//   export const F = registerFonts(ALL_TEXT);   // F.zhSerif, F.zhSans, F.en, F.mono
// Files come from public/fonts/ (run library/fonts/fetch-fonts.ts first): the
// render browser in the cloud container cannot reach fonts.gstatic.com.
// loadFont() holds every frame with delayRender() and cancels the render if a
// file is missing. Characters NOT in allText never get their slice registered
// and silently fall back to a system font / tofu — keep allText complete.
// CJK faces are registered without ASCII, so Latin letters and digits always
// come from Inter (or the mono face) while "，" "——" stay full-width.
// Source: JIN-motion- src/butterworth/fonts.ts, src/intro-v2/fonts.ts.

export const registerFonts = (allText: string, opts: { serif?: boolean; sans?: boolean; mono?: boolean; prefix?: string } = {}) => {
  const { serif = true, sans = true, mono = false, prefix = "Film" } = opts;
  const inter = getInterInfo();
  const interFonts = inter.fonts.normal as Record<string, Record<string, string>>;
  const fam = { serif: `NotoSerifSC-${prefix}`, sans: `NotoSansSC-${prefix}`, inter: `Inter-${prefix}`, mono: `JetBrainsMono-${prefix}` };
  type Info = { fonts: { normal: unknown }; unicodeRanges: unknown };
  const faces: [string, Info, string][] = [];
  if (serif) faces.push([fam.serif, getSerifInfo(), SERIF_DIR]);
  if (sans) faces.push([fam.sans, getSansInfo(), NOTO_DIR]);
  for (const [family, info, dir] of faces) {
    const files = info.fonts.normal as Record<string, Record<string, string>>;
    const ranges = info.unicodeRanges as Record<string, string>;
    for (const subset of notoSubsetsCjkFirst(allText, ranges, inter.unicodeRanges.latin)) {
      // variable fonts: one face per slice covers every weight
      loadFont({ family, url: staticFile(localFontPath(dir, files["400"][subset])), weight: "200 900", unicodeRange: withoutAscii(ranges[subset]) });
    }
  }
  loadFont({ family: fam.inter, url: staticFile(localFontPath(INTER_DIR, interFonts["400"].latin)), weight: "100 900", unicodeRange: inter.unicodeRanges.latin });
  if (mono) {
    const m = getMonoInfo();
    const monoFonts = m.fonts.normal as Record<string, Record<string, string>>;
    loadFont({ family: fam.mono, url: staticFile(localFontPath(MONO_DIR, monoFonts["400"].latin)), weight: "100 800", unicodeRange: m.unicodeRanges.latin });
  }
  return {
    zhSerif: `"${fam.serif}", "${fam.inter}", serif`,
    zhSans: `"${fam.sans}", "${fam.inter}", sans-serif`,
    en: `"${fam.inter}", "${fam.sans}", sans-serif`,
    mono: `"${fam.mono}", "${fam.sans}", monospace`,
  };
};

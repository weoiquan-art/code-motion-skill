import { registerFonts } from "../lib/fonts/fonts.ts";
import { ALL_TEXT } from "./timeline.ts";

// Register once, at import time. F.zhSerif (titles), F.zhSans (labels), F.en (Latin).
export const F = registerFonts(ALL_TEXT, { prefix: "Film" });

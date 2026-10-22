// Approximate advance widths (em) for laying out mixed Chinese / Latin lines
// without measuring the DOM (fonts may not be loaded yet on the first render,
// and canvas measurements get cached). Full-width characters are exactly 1em
// in Noto Sans/Serif SC; Latin is a per-letter table for Inter-like faces;
// monospace is 0.6em. Good enough for centring and camera follow.
// Source: JIN-motion- src/intro-free/anim.ts.

const LATIN: Record<string, number> = {
  A: 0.72, B: 0.68, C: 0.7, D: 0.74, E: 0.62, F: 0.6, G: 0.74, H: 0.76, I: 0.32, J: 0.56, K: 0.7,
  L: 0.58, M: 0.9, N: 0.76, O: 0.76, P: 0.66, Q: 0.76, R: 0.68, S: 0.64, T: 0.64, U: 0.74, V: 0.7,
  W: 1, X: 0.7, Y: 0.68, Z: 0.64, i: 0.28, l: 0.28, j: 0.28, m: 0.86, w: 0.8, " ": 0.26,
};

export const isWide = (ch: string) => {
  const c = ch.codePointAt(0) as number;
  return c >= 0x2e80 || (c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef);
};

export const charWidth = (ch: string, mono = false) => {
  if (isWide(ch)) return 1;
  if (mono) return 0.6;
  if (ch in LATIN) return LATIN[ch];
  if (/[a-z]/.test(ch)) return 0.56;
  if (/[0-9]/.test(ch)) return 0.62;
  return 0.32;
};

export const textWidth = (text: string, fontSize: number, mono = false) =>
  [...text].reduce((w, ch) => w + charWidth(ch, mono) * fontSize, 0);

import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { clamp, easeInOut, easeOut, hash, inv, lerp, pop, springAt } from "../core/math.ts";

// Text effects. Source: JIN-motion- src/intro-free/parts.tsx (TypeLine,
// PixelGlyph), src/intro-v2/world/Texts.tsx (slams), src/butterworth/world/MapView.tsx (Statement).

// ------------------------------------------------------------------ typing
// Cursor that blinks on the beat (on for the first half of every beat), solid while typing.
export const cursorOn = (f: number, solidUntil: number, framesPerBeat: number) =>
  f < solidUntil || ((f % framesPerBeat) + framesPerBeat) % framesPerBeat < framesPerBeat / 2;

const CursorBar: React.FC<{ color: string; visible: boolean }> = ({ color, visible }) => (
  <span style={{ display: "inline-block", position: "relative", width: 0, height: "1em" }}>
    <span style={{ position: "absolute", left: "0.06em", top: "-0.02em", width: "0.075em", height: "1.04em", background: color, opacity: visible ? 1 : 0 }} />
  </span>
);

// Grid times for typing (shared with the audio script for key clicks).
export { typeTimes } from "./typing-times.ts";

// A line typed one character at a time, each landing on its own grid time
// (times[i]). Layout is fixed from the start (unseen characters are transparent)
// so nothing shifts while typing and centring never wobbles. For special
// characters (glow, scale) pass charStyle instead of overlaying a copy.
export const TypeLine: React.FC<{
  text: string;
  times: number[];
  fontFamily: string;
  style?: CSSProperties;
  highlight?: { text: string; color: string };
  cursor?: { color: string; from: number; solidUntil: number; until?: number; framesPerBeat: number };
  charStyle?: (i: number) => CSSProperties | undefined;
}> = ({ text, times, fontFamily, style, highlight, cursor, charStyle }) => {
  const f = useCurrentFrame();
  const chars = [...text];
  const hiStart = highlight ? text.indexOf(highlight.text) : -1;
  const hiFrom = hiStart < 0 ? -1 : [...text.slice(0, hiStart)].length;
  const hiTo = hiFrom < 0 ? -1 : hiFrom + [...(highlight as { text: string }).text].length;
  const shown = times.filter((t) => f >= t - 0.25).length;
  const showCursor = cursor && f >= cursor.from && (cursor.until === undefined || f < cursor.until);
  const blink = cursor ? cursorOn(f, cursor.solidUntil, cursor.framesPerBeat) : false;
  return (
    <div style={{ display: "flex", alignItems: "center", whiteSpace: "pre", lineHeight: 1, fontFamily, ...style }}>
      {showCursor && shown === 0 ? <CursorBar color={cursor.color} visible={blink} /> : null}
      {chars.map((ch, i) => {
        const p = pop(f - times[i]);
        const color = i >= hiFrom && i < hiTo ? (highlight as { color: string }).color : undefined;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
            <span style={{ display: "inline-block", opacity: p, color, transform: `translateY(${(1 - p) * 0.14}em) scale(${1 + (1 - p) * 0.35})`, ...charStyle?.(i) }}>{ch}</span>
            {showCursor && i === shown - 1 ? <CursorBar color={cursor.color} visible={blink} /> : null}
          </span>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ pixel glyphs
// A bitmap ('#' = on) drawn cell by cell; alpha(r, c, on) sets each cell, so
// the same component draws noise, denoising, partial glyphs, scanline reveals.
// Random reveal order looks like debris; raster order + a scan line reads as "loading".
export const PixelGlyph: React.FC<{
  bitmap: string[];
  cell: number;
  gap?: number;
  color: string;
  alpha?: (r: number, c: number, on: boolean) => number;
  style?: CSSProperties;
}> = ({ bitmap, cell, gap = 1, color, alpha, style }) => {
  const rows = bitmap.length;
  const cols = bitmap[0].length;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = bitmap[r][c] === "#";
      const a = alpha ? alpha(r, c, on) : on ? 1 : 0;
      if (a <= 0.01) continue;
      cells.push(
        <div
          key={r * cols + c}
          style={{ position: "absolute", left: c * cell + gap / 2, top: r * cell + gap / 2, width: cell - gap, height: cell - gap, background: color, opacity: clamp(a) }}
        />,
      );
    }
  }
  return <div style={{ position: "relative", width: cols * cell, height: rows * cell, ...style }}>{cells}</div>;
};
// Stable per-cell random rank in [0, 1).
export const cellRank = (r: number, c: number, seed = 0) => hash(r * 16 + c + seed * 1000);

// ------------------------------------------------------------------ slam word
// A big word slammed onto the screen at frame `at` for `life` frames (spring
// from 2.6× to 1×), with an optional small English line. Screen-space: put it
// outside the world camera, or pin it with screenToWorld.
export const Slam: React.FC<{ at: number; life?: number; zh: string; en?: string; zhFont: string; enFont: string; size?: number; tilt?: number; color?: string }> = ({
  at,
  life = 17,
  zh,
  en,
  zhFont,
  enFont,
  size = 380,
  tilt = -3,
  color = "#ffffff",
}) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t >= life) return null;
  const hit = springAt(t, 420, 16, 0.6);
  const out = inv(life - 6, life, t);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "48%",
        transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${lerp(2.6, 1, hit) * (1 + 0.12 * out)})`,
        opacity: clamp(t / 2) * (1 - out),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        whiteSpace: "pre",
        textShadow: "0 0 60px rgba(0,0,0,0.85), 0 0 20px rgba(0,0,0,0.9)",
        color,
      }}
    >
      <div style={{ fontFamily: zhFont, fontWeight: 900, fontSize: size, lineHeight: 1 }}>{zh}</div>
      {en && <div style={{ fontFamily: enFont, fontWeight: 800, fontSize: size * 0.17, letterSpacing: "0.22em", marginTop: 10 }}>{en}</div>}
    </div>
  );
};

// ------------------------------------------------------------------ statement
// Two-or-more-line serif statement with an English line, lines staggered in,
// all fading out at `outF` (Butterworth map: "很多人，/只是路过北海。").
export const Statement: React.FC<{
  lines: string[];
  en?: string;
  inF: number;
  outF: number;
  zhFont: string;
  enFont: string;
  size?: number;
  left?: number;
  top?: number;
  color?: string;
}> = ({ lines, en, inF, outF, zhFont, enFont, size = 88, left = 118, top = 360, color = "#fbf3e2" }) => {
  const f = useCurrentFrame();
  const out = easeInOut(inv(outF, outF + 12, f));
  if (f < inF - 1 || out >= 1) return null;
  const enIn = easeOut(inv(inF + 22, inF + 38, f));
  return (
    <div style={{ position: "absolute", left, top, color, opacity: 1 - out }}>
      {lines.map((line, i) => {
        const a = easeOut(inv(inF + i * 9, inF + i * 9 + 18, f));
        return (
          <div key={i} style={{ fontFamily: zhFont, fontWeight: 900, fontSize: size, lineHeight: 1.22, whiteSpace: "pre", opacity: a, transform: `translateY(${lerp(24, 0, a)}px)` }}>
            {line}
          </div>
        );
      })}
      {en && <div style={{ fontFamily: enFont, fontWeight: 500, fontSize: size * 0.32, marginTop: 22, opacity: enIn * 0.85, transform: `translateY(${lerp(16, 0, enIn)}px)` }}>{en}</div>}
    </div>
  );
};

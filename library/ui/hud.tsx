import { useCurrentFrame } from "remotion";
import { easeOut, easeInOut, inv, lerp } from "../core/math.ts";

// Chapter titles and an on-screen clock (Butterworth: "07:10 清晨 DAWN / 渔船回港").
// Source: JIN-motion- src/butterworth/world/Titles.tsx.

const SHADOW = "0 2px 18px rgba(10,10,30,0.45), 0 1px 3px rgba(10,10,30,0.35)";

// Lower-left chapter title: accent rule + tag line, big serif title, English line.
// In at `inF` (staggered), out at `outF`. Keep the lower-left free of props.
// A 100 px CJK title fits ~10 characters per line.
export const ChapterTitle: React.FC<{
  inF: number;
  outF: number;
  tag?: { time?: string; zh?: string; en?: string };
  title: string;
  en?: string;
  zhSerif: string;
  zhSans: string;
  enFont: string;
  accent?: string;
  size?: number;
}> = ({ inF, outF, tag, title, en, zhSerif, zhSans, enFont, accent = "#ffd36b", size = 100 }) => {
  const f = useCurrentFrame();
  const out = easeInOut(inv(outF, outF + 10, f));
  if (f < inF - 1 || out >= 1) return null;
  const tg = easeOut(inv(inF, inF + 14, f));
  const ti = easeOut(inv(inF + 5, inF + 22, f));
  const e = easeOut(inv(inF + 12, inF + 28, f));
  const rule = easeOut(inv(inF, inF + 20, f));
  const lift = (v: number) => `translateY(${lerp(26, 0, v) - out * 18}px)`;
  return (
    <div style={{ position: "absolute", left: 118, bottom: 112, opacity: 1 - out, color: "#ffffff", textShadow: SHADOW }}>
      {tag && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: tg, transform: lift(tg) }}>
          <div style={{ width: 54 * rule, height: 4, borderRadius: 2, background: accent }} />
          {tag.time && <div style={{ fontFamily: enFont, fontWeight: 700, fontSize: 28, letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>{tag.time}</div>}
          {tag.zh && <div style={{ fontFamily: zhSans, fontWeight: 600, fontSize: 28 }}>{tag.zh}</div>}
          {tag.en && <div style={{ fontFamily: enFont, fontWeight: 600, fontSize: 21, letterSpacing: "0.22em", opacity: 0.85 }}>{tag.en}</div>}
        </div>
      )}
      <div style={{ fontFamily: zhSerif, fontWeight: 900, fontSize: size, lineHeight: 1.12, marginTop: 18, whiteSpace: "pre", opacity: ti, transform: lift(ti) }}>{title}</div>
      {en && <div style={{ fontFamily: enFont, fontWeight: 500, fontSize: size * 0.32, marginTop: 14, opacity: e * 0.92, transform: lift(e) }}>{en}</div>}
    </div>
  );
};

// "HH:MM" → minutes, and back.
export const toMinutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};
export const fmtClock = (min: number) => {
  const m = Math.round(min);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// Clock that runs forward like a time-lapse during transitions: stops = [{f, clock}],
// the clock holds at each stop and eases to the next across [f_next - lead, f_next + tail].
export const clockAt = (f: number, stops: { f: number; clock: string }[], lead = 14, tail = 6) => {
  for (let i = 1; i < stops.length; i++) {
    if (f < stops[i].f + tail) {
      const t = easeInOut(inv(stops[i].f - lead, stops[i].f + tail, f));
      return lerp(toMinutes(stops[i - 1].clock), toMinutes(stops[i].clock), t);
    }
  }
  return toMinutes(stops[stops.length - 1].clock);
};

// Sun / moon on a small arc: where the day is (06:00 → 20:30).
export const DayArc: React.FC<{ min: number; nightAfter?: number }> = ({ min, nightAfter = 19 * 60 + 20 }) => {
  const t = Math.min(1, Math.max(0, (min - 6 * 60) / (14.5 * 60)));
  const a = Math.PI * (1 - t);
  return (
    <svg width={60} height={40} style={{ overflow: "visible" }}>
      <path d="M4,34 A26,26 0 0 1 56,34" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="3 4" />
      <line x1={0} y1={34} x2={60} y2={34} stroke="rgba(255,255,255,0.45)" strokeWidth={2} />
      <circle cx={30 + Math.cos(a) * 26} cy={34 - Math.sin(a) * 26} r={6} fill={min > nightAfter ? "#e9ecff" : "#ffd36b"} />
    </svg>
  );
};

// Top bar: place name on the left, clock + day arc on the right.
export const ClockHud: React.FC<{ min: number; place: string; placeEn?: string; zhSans: string; enFont: string; opacity?: number }> = ({
  min,
  place,
  placeEn,
  zhSans,
  enFont,
  opacity = 1,
}) => (
  <div style={{ position: "absolute", inset: 0, opacity, color: "#ffffff", textShadow: SHADOW }}>
    <div style={{ position: "absolute", left: 118, top: 72, display: "flex", alignItems: "center", gap: 14 }}>
      <svg width={22} height={30} viewBox="0 0 22 30">
        <path d="M11,29 C11,29 21,17 21,10.5 A10,10 0 0 0 1,10.5 C1,17 11,29 11,29 Z" fill="#ffd36b" />
        <circle cx={11} cy={10.5} r={4} fill="#3a2a1a" />
      </svg>
      <div style={{ fontFamily: zhSans, fontWeight: 700, fontSize: 30 }}>{place}</div>
      {placeEn && <div style={{ fontFamily: enFont, fontWeight: 600, fontSize: 20, letterSpacing: "0.3em", opacity: 0.9 }}>{placeEn}</div>}
    </div>
    <div style={{ position: "absolute", right: 118, top: 64, display: "flex", alignItems: "center", gap: 16 }}>
      <DayArc min={min} />
      <div style={{ fontFamily: enFont, fontWeight: 700, fontSize: 40, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums" }}>{fmtClock(min)}</div>
    </div>
  </div>
);

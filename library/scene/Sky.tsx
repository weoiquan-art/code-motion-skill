import { AbsoluteFill, useCurrentFrame } from "remotion";
import { hash, lerp } from "../core/math.ts";
import { mixHex } from "./draw.tsx";

// Full-screen sky for a time-of-day film (Butterworth): three-stop gradient,
// sun with glow, moon, twinkling stars, drifting flat clouds. Give each scene
// a start and an end sky and blend them with lerpSky while it holds; blend to
// the next scene's sky during the transition and the day reads as a time-lapse.
// Put mountains / hills IN FRONT of it and make them opaque, so the sun rises
// and sets behind them (a translucent hill lets the sun show through).
// Source: JIN-motion- src/butterworth/world/Sky.tsx + timeline.ts SKIES.

export type Sky = {
  top: string;
  mid: string;
  low: string;
  sun: { x: number; y: number; r: number; color: string; glow: string; a: number };
  moon: number; // 0..1
  stars: number; // 0..1
};

export const lerpSky = (a: Sky, b: Sky, t: number): Sky => ({
  top: mixHex(a.top, b.top, t),
  mid: mixHex(a.mid, b.mid, t),
  low: mixHex(a.low, b.low, t),
  sun: {
    x: lerp(a.sun.x, b.sun.x, t),
    y: lerp(a.sun.y, b.sun.y, t),
    r: lerp(a.sun.r, b.sun.r, t),
    color: mixHex(a.sun.color, b.sun.color, t),
    glow: mixHex(a.sun.glow, b.sun.glow, t),
    a: lerp(a.sun.a, b.sun.a, t),
  },
  moon: lerp(a.moon, b.moon, t),
  stars: lerp(a.stars, b.stars, t),
});

// Presets used in the Butterworth day (start → end of each scene).
const sun = (x: number, y: number, r: number, color: string, glow: string, a = 1) => ({ x, y, r, color, glow, a });
export const SKY_PRESETS: Record<string, [Sky, Sky]> = {
  dawn: [
    { top: "#26315f", mid: "#b8668a", low: "#ffb07a", sun: sun(800, 612, 56, "#ffe2b0", "#ff9d6b"), moon: 0, stars: 0.25 },
    { top: "#3a4f86", mid: "#d98a8f", low: "#ffcf96", sun: sun(820, 536, 58, "#fff0cc", "#ffb57a"), moon: 0, stars: 0 },
  ],
  morning: [
    { top: "#4f9ee0", mid: "#9fd2f0", low: "#f7ead0", sun: sun(1640, 170, 44, "#fffbe8", "#fff2b8"), moon: 0, stars: 0 },
    { top: "#4a9ae0", mid: "#9ad0f0", low: "#f3ecd8", sun: sun(1650, 150, 44, "#fffbe8", "#fff2b8"), moon: 0, stars: 0 },
  ],
  noon: [
    { top: "#2f8fe0", mid: "#86c6f2", low: "#e6f3fb", sun: sun(1560, 90, 42, "#ffffff", "#fff6cc"), moon: 0, stars: 0 },
    { top: "#2f8fe0", mid: "#86c6f2", low: "#e6f3fb", sun: sun(1580, 86, 42, "#ffffff", "#fff6cc"), moon: 0, stars: 0 },
  ],
  afternoon: [
    { top: "#4689d4", mid: "#a2cbe8", low: "#f8e2b4", sun: sun(1600, 200, 46, "#fff6dc", "#ffe08a"), moon: 0, stars: 0 },
    { top: "#4a84cc", mid: "#b2c8de", low: "#fbd9a0", sun: sun(1620, 240, 48, "#fff2d0", "#ffd27a"), moon: 0, stars: 0 },
  ],
  golden: [
    { top: "#4f6db0", mid: "#e7a873", low: "#ffd08a", sun: sun(1460, 330, 58, "#fff0c0", "#ffb35c"), moon: 0, stars: 0 },
    { top: "#4a5f9e", mid: "#eb9a6c", low: "#ffc27a", sun: sun(1450, 380, 60, "#ffe6a8", "#ffa04c"), moon: 0, stars: 0 },
  ],
  sunset: [
    { top: "#3b2c6e", mid: "#d6527c", low: "#ff9b4c", sun: sun(1190, 360, 90, "#ffd38a", "#ff7a45"), moon: 0, stars: 0 },
    { top: "#1f1a4c", mid: "#9c3a6c", low: "#ff7a3c", sun: sun(1200, 566, 90, "#ffb36a", "#ff5a3a"), moon: 0, stars: 0.35 },
  ],
  night: [
    { top: "#0a0f2e", mid: "#172453", low: "#2c3a72", sun: sun(1200, 700, 90, "#ff8a4a", "#ff5a3a", 0), moon: 1, stars: 1 },
    { top: "#090d29", mid: "#15214e", low: "#28356a", sun: sun(1200, 700, 90, "#ff8a4a", "#ff5a3a", 0), moon: 1, stars: 1 },
  ],
};

const STARS = new Array(90).fill(0).map((_, i) => ({ x: hash(i * 3.1), y: hash(i * 7.7) ** 1.6 * 0.6, r: 0.8 + hash(i * 1.9) * 1.8, tw: hash(i * 5.3) * 10 }));
const CLOUDS = [
  { x: 260, y: 150, s: 1.2 },
  { x: 900, y: 90, s: 0.8 },
  { x: 1500, y: 210, s: 1.0 },
  { x: 2200, y: 130, s: 1.3 },
  { x: 2900, y: 190, s: 0.9 },
];
const cloudPath = (x: number, y: number, s: number) =>
  `M${x - 150 * s},${y + 22 * s} Q${x - 150 * s},${y - 6 * s} ${x - 100 * s},${y - 4 * s} Q${x - 86 * s},${y - 46 * s} ${x - 34 * s},${y - 40 * s} Q${x - 4 * s},${y - 78 * s} ${x + 46 * s},${y - 48 * s} Q${x + 96 * s},${y - 56 * s} ${x + 108 * s},${y - 10 * s} Q${x + 160 * s},${y - 6 * s} ${x + 160 * s},${y + 22 * s} Z`;

export const SkyLayer: React.FC<{ sky: Sky; cloudShift?: number; moonAt?: { x: number; y: number }; width?: number; height?: number; id?: string }> = ({
  sky: s,
  cloudShift = 0,
  moonAt = { x: 1500, y: 300 },
  width = 1920,
  height = 1080,
  id = "sky",
}) => {
  const f = useCurrentFrame();
  const shift = cloudShift - f * 0.4;
  const cloudA = (1 - s.stars) * 0.85;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${s.top} 0%, ${s.mid} 52%, ${s.low} 78%, ${s.low} 100%)` }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id={`${id}-sun`}>
            <stop offset="0%" stopColor={s.sun.glow} stopOpacity={0.85} />
            <stop offset="35%" stopColor={s.sun.glow} stopOpacity={0.3} />
            <stop offset="100%" stopColor={s.sun.glow} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${id}-moon`}>
            <stop offset="0%" stopColor="#dfe6ff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#dfe6ff" stopOpacity={0} />
          </radialGradient>
        </defs>
        {s.stars > 0.01 &&
          STARS.map((st, i) => (
            <circle key={i} cx={st.x * width} cy={st.y * height} r={st.r} fill="#ffffff" opacity={s.stars * (0.45 + 0.55 * Math.abs(Math.sin(f * 0.06 + st.tw)))} />
          ))}
        {s.sun.a > 0.01 && (
          <g opacity={s.sun.a}>
            <circle cx={s.sun.x} cy={s.sun.y} r={s.sun.r * 5.5} fill={`url(#${id}-sun)`} />
            <circle cx={s.sun.x} cy={s.sun.y} r={s.sun.r} fill={s.sun.color} />
          </g>
        )}
        {s.moon > 0.01 && (
          <g opacity={s.moon}>
            <circle cx={moonAt.x} cy={moonAt.y} r={170} fill={`url(#${id}-moon)`} />
            <circle cx={moonAt.x} cy={moonAt.y} r={46} fill="#f4f1e2" />
            <circle cx={moonAt.x - 16} cy={moonAt.y - 12} r={9} fill="#e3dcc4" />
            <circle cx={moonAt.x + 16} cy={moonAt.y + 14} r={6} fill="#e3dcc4" />
          </g>
        )}
        {cloudA > 0.01 && (
          <g opacity={cloudA}>
            {CLOUDS.map((c, i) => {
              const span = width + 1480;
              const x = ((((c.x + shift) % span) + span) % span) - 400;
              return <path key={i} d={cloudPath(x, c.y, c.s)} fill={mixHex("#ffffff", s.low, 0.35)} opacity={0.55} />;
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

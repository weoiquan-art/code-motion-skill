import { useCurrentFrame } from "remotion";
import { hash, noise1 } from "../core/math.ts";

// Flat-illustration helpers for SVG scenes (Butterworth). Everything animates
// from useCurrentFrame(), so it works under motion blur (fractional frames).
// Source: JIN-motion- src/butterworth/draw.tsx.

// ------------------------------------------------------------------ colour
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mixHex = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

// ------------------------------------------------------------------ paths
// Catmull-Rom spline through points, as cubic Béziers (open or closed).
export const smoothPath = (pts: [number, number][], closed = false, tension = 0.5) => {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + " Z" : d;
};

// Hill / ridge silhouette from value noise between x0 and x1, closed down to `bottom`.
export const ridge = (x0: number, x1: number, base: number, amp: number, freq: number, seed: number, bottom = 1080) => {
  const pts: [number, number][] = [];
  for (let x = x0; x <= x1; x += 40) {
    const n = noise1(x * freq, seed) * 0.65 + noise1(x * freq * 2.7, seed + 3) * 0.35;
    pts.push([x, base - amp * (0.5 + 0.5 * n)]);
  }
  return `${smoothPath(pts)} L${x1},${bottom} L${x0},${bottom} Z`;
};

// Point at t along a hanging wire drawn as `M x0,y0 Q mid,(mid y + 2·sag) x1,y1`
// (matches the quadratic Bézier exactly, so lanterns hang ON the drawn line).
export const sagPoint = (x0: number, y0: number, x1: number, y1: number, sag: number, t: number) => ({
  x: x0 + (x1 - x0) * t,
  y: y0 + (y1 - y0) * t + sag * 4 * t * (1 - t),
});
export const sagPath = (x0: number, y0: number, x1: number, y1: number, sag: number) =>
  `M${x0},${y0} Q${(x0 + x1) / 2},${(y0 + y1) / 2 + sag * 2} ${x1},${y1}`;

// ------------------------------------------------------------------ canvas
// Scene-local SVG canvas wider than the screen (x from X0 to X0 + XW), so a
// parallax layer still covers its window when the camera is half a scene away.
export const X0 = -400;
export const XW = 2720;
export const Svg: React.FC<{ children: React.ReactNode; height?: number; style?: React.CSSProperties }> = ({ children, height = 1080, style }) => (
  <svg width={XW} height={height} viewBox={`${X0} 0 ${XW} ${height}`} style={{ position: "absolute", left: X0, top: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

// ------------------------------------------------------------------ props
// Coconut palm: curved trunk, drooping fronds, sways with noise.
export const Palm: React.FC<{ x: number; y: number; h: number; lean?: number; color: string; seed?: number; fronds?: number }> = ({
  x,
  y,
  h,
  lean = 0.18,
  color,
  seed = 1,
  fronds = 7,
}) => {
  const f = useCurrentFrame();
  const sway = noise1(f * 0.02, seed) * 0.05 + Math.sin(f * 0.05 + seed) * 0.02;
  const tx = x + h * (lean + sway);
  const ty = y - h;
  const w = Math.max(5, h * 0.035);
  const trunk = `M${x - w},${y} Q${x + h * lean * 0.2},${y - h * 0.55} ${tx - w * 0.6},${ty} L${tx + w * 0.6},${ty} Q${x + h * lean * 0.2 + w * 1.6},${y - h * 0.55} ${x + w},${y} Z`;
  const leaves = new Array(fronds).fill(0).map((_, i) => {
    const a = -Math.PI + (i / (fronds - 1)) * Math.PI + (hash(seed * 13 + i) - 0.5) * 0.3 + sway * 2;
    const len = h * (0.42 + hash(seed * 7 + i) * 0.16);
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.45 + len * 0.42;
    const cx = tx + Math.cos(a) * len * 0.55;
    const cy = ty + Math.sin(a) * len * 0.7 - len * 0.12;
    const t = len * 0.07;
    return `M${tx},${ty} Q${cx},${cy - t} ${ex},${ey} Q${cx},${cy + t * 1.6} ${tx},${ty + t * 0.6} Z`;
  });
  return (
    <g fill={color}>
      <path d={trunk} />
      {leaves.map((d, i) => (
        <path key={i} d={d} />
      ))}
      <circle cx={tx} cy={ty + 4} r={w * 1.4} />
    </g>
  );
};

// Bird: a flapping "v". Keep its path away from the sun: a bird crossing the
// sun disc reads as a frowning face.
export const Gull: React.FC<{ x: number; y: number; s: number; color: string; phase?: number }> = ({ x, y, s, color, phase = 0 }) => {
  const f = useCurrentFrame();
  const wy = -Math.sin(f * 0.32 + phase) * 0.55 * s;
  return (
    <path
      d={`M${x - s},${y + wy} Q${x - s * 0.45},${y - s * 0.35 + wy * 0.4} ${x},${y} Q${x + s * 0.45},${y - s * 0.35 + wy * 0.4} ${x + s},${y + wy}`}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(2, s * 0.16)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

// Rising wisps: steam, incense, grill smoke. `drift` leans them sideways.
export const Wisps: React.FC<{ x: number; y: number; h: number; n?: number; color: string; width?: number; seed?: number; drift?: number }> = ({
  x,
  y,
  h,
  n = 3,
  color,
  width = 6,
  seed = 1,
  drift = 0,
}) => {
  const f = useCurrentFrame();
  return (
    <g fill="none" stroke={color} strokeLinecap="round">
      {new Array(n).fill(0).map((_, i) => {
        const cycle = 46 + hash(seed + i) * 20;
        const t = ((f + hash(seed * 3 + i) * cycle) % cycle) / cycle;
        const ox = x + (i - (n - 1) / 2) * width * 2.2;
        const pts: [number, number][] = [];
        for (let k = 0; k <= 6; k++) {
          const v = k / 6;
          pts.push([ox + Math.sin(v * 5 + f * 0.08 + i * 2) * width * 1.4 + drift * v * h, y - v * h * (0.55 + t * 0.45)]);
        }
        return <path key={i} d={smoothPath(pts)} strokeWidth={width * (1 - t * 0.4)} opacity={Math.sin(Math.PI * t) * 0.8} />;
      })}
    </g>
  );
};

// Red paper lantern hanging from (x, y), swinging by `swing` degrees.
export const Lantern: React.FC<{ x: number; y: number; s?: number; swing?: number; color?: string; trim?: string }> = ({
  x,
  y,
  s = 1,
  swing = 0,
  color = "#e0362a",
  trim = "#e8b04a",
}) => (
  <g transform={`translate(${x},${y}) rotate(${swing}) scale(${s})`}>
    <line x1={0} y1={-26} x2={0} y2={-6} stroke="#3a2a2a" strokeWidth={3} />
    <rect x={-12} y={-8} width={24} height={8} fill={trim} />
    <ellipse cx={0} cy={28} rx={30} ry={34} fill={color} />
    <ellipse cx={-8} cy={22} rx={10} ry={22} fill="#ffffff" opacity={0.18} />
    <rect x={-12} y={58} width={24} height={8} fill={trim} />
    <path d="M-6,66 L-8,92 M0,66 L0,96 M6,66 L8,92" stroke={trim} strokeWidth={3} />
  </g>
);

// A string of lanterns along a sagging wire, each swinging a little.
export const LanternString: React.FC<{ x0: number; y0: number; x1: number; y1: number; sag: number; n: number; s?: number; seed?: number }> = ({
  x0,
  y0,
  x1,
  y1,
  sag,
  n,
  s = 1,
  seed = 0,
}) => {
  const f = useCurrentFrame();
  return (
    <g>
      <path d={sagPath(x0, y0, x1, y1, sag)} stroke="#3a2a2a" strokeWidth={3} fill="none" />
      {new Array(n).fill(0).map((_, i) => {
        const p = sagPoint(x0, y0, x1, y1, sag, (i + 0.5) / n);
        return <Lantern key={i} x={p.x} y={p.y + 26 * s} s={s} swing={noise1(f * 0.03 + i * 0.7 + seed, 5) * 6} />;
      })}
    </g>
  );
};

// Light bulbs on a wire. A plain translucent circle looks grey on a dark sky:
// the glow needs a radial gradient (bright centre fading out). `on` 0..1.
export const StringLights: React.FC<{ id: string; x0: number; y0: number; x1: number; y1: number; sag: number; n: number; on?: number }> = ({
  id,
  x0,
  y0,
  x1,
  y1,
  sag,
  n,
  on = 1,
}) => {
  const f = useCurrentFrame();
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor="#ffd27a" stopOpacity={0.75} />
          <stop offset="45%" stopColor="#ffb35c" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#ffb35c" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={sagPath(x0, y0, x1, y1, sag)} stroke="#1a1426" strokeWidth={3} fill="none" />
      {new Array(n).fill(0).map((_, i) => {
        const p = sagPoint(x0, y0, x1, y1, sag, (i + 0.5) / n);
        const flick = 0.85 + 0.15 * Math.sin(f * 0.3 + i * 2.1);
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 8} stroke="#1a1426" strokeWidth={3} />
            <circle cx={p.x} cy={p.y + 16} r={48} fill={`url(#${id})`} opacity={on * flick} />
            <circle cx={p.x} cy={p.y + 16} r={8} fill={on > 0.5 ? "#fff6dc" : "#5a4a3a"} />
          </g>
        );
      })}
    </g>
  );
};

// Sun / moon reflection on water: a column of short bars under screen x `sx`,
// wider and dimmer further down, each jittered with noise. Put it on a layer
// pinned to the screen (k = 0) so it stays under the sun.
export const Glitter: React.FC<{ sx: number; horizon: number; depth?: number; color?: string; rows?: number; spread?: number; seed?: number }> = ({
  sx,
  horizon,
  depth = 400,
  color = "#ffe0a0",
  rows = 22,
  spread = 200,
  seed = 4,
}) => {
  const f = useCurrentFrame();
  return (
    <g>
      {new Array(rows).fill(0).map((_, i) => {
        const v = i / (rows - 1);
        const w = 30 + v * spread;
        return (
          <rect
            key={i}
            x={sx - w / 2 + noise1(f * 0.12 + i * 3, seed) * (10 + v * 40)}
            y={horizon + 6 + v * v * depth}
            width={w}
            height={3 + v * 6}
            rx={3}
            fill={color}
            opacity={(0.7 - v * 0.4) * (0.6 + 0.4 * Math.sin(f * 0.2 + i * 1.9))}
          />
        );
      })}
    </g>
  );
};

// Shimmering water lines scattered over a sea area (deterministic).
export const WaterLines: React.FC<{ horizon: number; height?: number; count?: number; color: string; seed?: number }> = ({
  horizon,
  height = 440,
  count = 60,
  color,
  seed = 3.3,
}) => {
  const f = useCurrentFrame();
  return (
    <g>
      {new Array(count).fill(0).map((_, i) => {
        const y = horizon + 10 + hash(i * seed) ** 1.5 * height;
        const x = X0 + hash(i * 9.1 + seed) * XW + Math.sin(f * 0.03 + i) * 20;
        return <rect key={i} x={x} y={y} width={30 + (y - horizon) * 0.25} height={2 + (y - horizon) / 160} rx={2} fill={color} opacity={0.15 + 0.15 * Math.sin(f * 0.07 + i * 1.7)} />;
      })}
    </g>
  );
};

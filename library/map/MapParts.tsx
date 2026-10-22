import { smoothPath } from "../scene/draw.tsx";
import { along, type MapCam, pathLength, toScreen } from "./projection.ts";

// SVG pieces for an animated map (Butterworth). Put Land / Route / Token inside
// <g transform={mapTransform(cam)}>; put MapLabel in HTML on top (text stays
// screen-sized). Source: JIN-motion- src/butterworth/world/MapView.tsx.

// Land with a shallow-water halo. `pts` are projected world px.
export const Land: React.FC<{ pts: [number, number][]; z: number; fill?: string; edge?: string; halo?: string; clipId?: string }> = ({
  pts,
  z,
  fill = "#f1e3c4",
  edge = "#cdb487",
  halo = "#1d4a5e",
  clipId,
}) => {
  const d = smoothPath(pts, true, 0.6);
  return (
    <g>
      {clipId && (
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
      )}
      <path d={d} fill="none" stroke={halo} strokeWidth={26 / z} strokeLinejoin="round" />
      <path d={d} fill={fill} stroke={edge} strokeWidth={2 / z} />
    </g>
  );
};

// Route drawn on with progress `draw` 0..1. kind: rail (dark with ties), road
// (solid), ferry (dashed, appears in the second half of the draw).
export const Route: React.FC<{ pts: [number, number][]; z: number; draw: number; kind: "rail" | "road" | "ferry"; color?: string }> = ({ pts, z, draw, kind, color }) => {
  const d = smoothPath(pts, false, 0.6);
  const len = pathLength(pts);
  if (kind === "ferry") {
    return (
      <path d={d} fill="none" stroke={color ?? "#ffffff"} strokeOpacity={0.85} strokeWidth={3 / z} strokeDasharray={`${10 / z} ${9 / z}`} strokeLinecap="round" opacity={Math.max(0, (draw - 0.5) * 2)} />
    );
  }
  if (kind === "road") {
    return <path d={d} fill="none" stroke={color ?? "#f6d28a"} strokeWidth={6 / z} strokeLinecap="round" strokeDasharray={`${len * draw} ${len}`} />;
  }
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={color ?? "#3a3346"} strokeWidth={7 / z} strokeDasharray={`${len * draw} ${len}`} />
      {draw >= 1 && <path d={d} stroke="#f3e6c8" strokeWidth={3 / z} strokeDasharray={`${12 / z} ${12 / z}`} />}
    </g>
  );
};

// Glowing token at fraction t of a route (a train, a ferry, a car).
export const Token: React.FC<{ pts: [number, number][]; t: number; z: number; opacity?: number; color?: string }> = ({ pts, t, z, opacity = 1, color = "#ffd36b" }) => {
  const p = along(pts, t);
  return (
    <g opacity={opacity}>
      <circle cx={p[0]} cy={p[1]} r={12 / z} fill={color} opacity={0.3} />
      <circle cx={p[0]} cy={p[1]} r={5.5 / z} fill={color} />
    </g>
  );
};

// Pulsing place marker (period in frames).
export const PlaceDot: React.FC<{ p: [number, number]; z: number; frame: number; period?: number; color?: string }> = ({ p, z, frame, period = 54, color = "#ffd36b" }) => {
  const pulse = (((frame % period) + period) % period) / period;
  return (
    <g>
      <circle cx={p[0]} cy={p[1]} r={(16 + 40 * pulse) / z} fill="none" stroke={color} strokeWidth={3 / z} opacity={1 - pulse} />
      <circle cx={p[0]} cy={p[1]} r={11 / z} fill={color} stroke="#ffffff" strokeWidth={3 / z} />
    </g>
  );
};

// HTML label pinned to a map point (screen-sized text). Check labels on a still:
// they easily land on a route or off the frame.
export const MapLabel: React.FC<{
  cam: MapCam;
  p: [number, number];
  zh: string;
  en?: string;
  dx?: number;
  dy?: number;
  size?: number;
  color?: string;
  align?: "left" | "right" | "center";
  opacity?: number;
  zhFont?: string;
  enFont?: string;
}> = ({ cam, p, zh, en, dx = 0, dy = 0, size = 26, color = "#2f2a3a", align = "left", opacity = 1, zhFont = "sans-serif", enFont = "sans-serif" }) => {
  const at = toScreen(cam, p);
  return (
    <div
      style={{
        position: "absolute",
        left: at.x + dx,
        top: at.y + dy,
        transform: `translate(${align === "left" ? 0 : align === "right" ? -100 : -50}%, -50%)`,
        textAlign: align,
        opacity,
        whiteSpace: "pre",
        color,
      }}
    >
      <div style={{ fontFamily: zhFont, fontWeight: 700, fontSize: size, lineHeight: 1.1 }}>{zh}</div>
      {en && <div style={{ fontFamily: enFont, fontWeight: 600, fontSize: size * 0.62, letterSpacing: "0.14em", marginTop: 4, opacity: 0.75 }}>{en}</div>}
    </div>
  );
};

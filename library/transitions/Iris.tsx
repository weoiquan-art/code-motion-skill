import { AbsoluteFill } from "remotion";
import { easeIn, easeInOut, inv, lerp } from "../core/math.ts";

// Iris ("round window") transition (Butterworth): a point on screen — e.g. a
// city dot on a map — opens into the next scene, or a scene closes back into
// the point. Use the same point to open and close the film and it gets a
// "start here, come back here" shape. The 5 px ring is what makes it read as a
// window. Pair it with the background zooming in on the point.
// Source: JIN-motion- src/butterworth/Butterworth.tsx.

export type IrisState = { r: number; scale: number; ring: number };

const FULL = (w: number, h: number) => Math.hypot(w, h) / 2 + 40;

// Opening: closed before `from`, full screen at `to`. The inside starts zoomed
// (1.35) and settles to 1, so it feels like diving in.
export const irisOpen = (f: number, from: number, to: number, width = 1920, height = 1080): IrisState | null => {
  if (f >= to) return null;
  const t = easeIn(inv(from, to, f));
  return { r: t * FULL(width, height) * 1.05, scale: lerp(1.35, 1, easeInOut(inv(from, to + 10, f))), ring: 1 - inv(to - 8, to, f) };
};

// Closing: full screen before `from`, shrunk into the point at `to`.
export const irisClose = (f: number, from: number, to: number, width = 1920, height = 1080): IrisState | null => {
  if (f < from) return null;
  const t = easeInOut(inv(from, to, f));
  return { r: lerp(FULL(width, height), 0, t), scale: lerp(1, 0.55, t), ring: inv(from, from + 6, f) };
};

// Wrap the scene that is revealed / hidden. (x, y) = the point on screen.
export const IrisWindow: React.FC<{ iris: IrisState | null; x: number; y: number; ringColor?: string; children: React.ReactNode; width?: number; height?: number }> = ({
  iris,
  x,
  y,
  ringColor = "#ffd36b",
  children,
  width = 1920,
  height = 1080,
}) => {
  if (iris && iris.r <= 0.5) return null;
  return (
    <>
      <AbsoluteFill
        style={{
          clipPath: iris ? `circle(${iris.r}px at ${x}px ${y}px)` : undefined,
          transform: iris ? `scale(${iris.scale})` : undefined,
          transformOrigin: `${x}px ${y}px`,
        }}
      >
        {children}
      </AbsoluteFill>
      {iris && iris.r > 1 && (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <circle cx={x} cy={y} r={iris.r * iris.scale} fill="none" stroke={ringColor} strokeWidth={5} opacity={iris.ring * 0.9} />
        </svg>
      )}
    </>
  );
};

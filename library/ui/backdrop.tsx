import { clamp } from "../core/math.ts";
import type { Pose, Shake } from "../camera/world-camera.ts";
import { NO_SHAKE } from "../camera/world-camera.ts";

// Background pieces. Source: JIN-motion- src/intro/Hud.tsx, src/intro-free/parts.tsx.

// Dot grid that belongs to the world: drawn in screen space from the camera, so
// it pans, zooms and rotates with everything else at almost no cost and makes
// camera motion readable on an empty background. Offsets that are whole
// multiples of `step` keep it from jumping across a cut.
export const DotGrid: React.FC<{ cam: Pose; sh?: Shake; color?: string; step?: number; width?: number; height?: number }> = ({
  cam,
  sh = NO_SHAKE,
  color = "rgba(255,255,255,0.07)",
  step = 80,
  width = 1920,
  height = 1080,
}) => {
  const st = step * cam.z;
  const size = 3600;
  const ox = (((size / 2 - cam.x * cam.z) % st) + st) % st;
  const oy = (((size / 2 - cam.y * cam.z) % st) + st) % st;
  const dot = clamp(1.4 * cam.z, 0.9, 3.4);
  return (
    <div
      style={{
        position: "absolute",
        left: width / 2 - size / 2 + sh.sx,
        top: height / 2 - size / 2 + sh.sy,
        width: size,
        height: size,
        transform: `rotate(${cam.r + sh.sr}deg)`,
        backgroundImage: `radial-gradient(circle, ${color} ${dot}px, transparent ${dot + 0.7}px)`,
        backgroundSize: `${st}px ${st}px`,
        backgroundPosition: `${ox - st / 2}px ${oy - st / 2}px`,
      }}
    />
  );
};

// Darkened corners. Weaken it on full-colour screens or the corners look dirty.
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${strength}) 100%)` }} />
);

// Soft dark gradient behind lower-third titles on busy, bright pictures.
export const BottomScrim: React.FC<{ opacity: number; color?: string }> = ({ opacity, color = "14,10,30" }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      background: `linear-gradient(0deg, rgba(${color},0.5) 0%, rgba(${color},0.18) 28%, rgba(${color},0) 48%)`,
    }}
  />
);

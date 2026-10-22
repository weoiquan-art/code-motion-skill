import { easeInOut, noise1, whip } from "../core/math.ts";

// Virtual camera over one "world" canvas: everything lives in world px and the
// camera is a single CSS transform. Source: JIN-motion- src/intro-free/camera.ts
// (additive moves), src/intro-v2/camera.ts (keyframes, screenToWorld).

export type Pose = { x: number; y: number; z: number; r: number };
export type Shake = { sx: number; sy: number; sr: number };
export const NO_SHAKE: Shake = { sx: 0, sy: 0, sr: 0 };

// A move starts on frame f. "whip" lands on the beat (see core/math whip);
// a number glides there with smootherstep over that many frames.
export type Move = { f: number; to: Partial<Pose>; ease?: "whip" | number; bounce?: number; dur?: number };

// Moves are additive (each contributes target − previous target × progress),
// so they can overlap and overshoot naturally. Zoom interpolates in log space
// (otherwise zooming speeds up / slows down unevenly).
export const camAt = (f: number, start: Pose, moves: Move[]): Pose => {
  const prev = { x: start.x, y: start.y, z: Math.log(start.z), r: start.r };
  const cur = { ...prev };
  for (const m of moves) {
    const t = f - m.f;
    const ease = m.ease ?? "whip";
    const p = ease === "whip" ? whip(t, m.bounce ?? 0.5, m.dur ?? 10) : easeInOut(t / ease);
    for (const k of ["x", "y", "z", "r"] as const) {
      const v = m.to[k];
      if (v === undefined) continue;
      const target = k === "z" ? Math.log(v) : v;
      cur[k] += (target - prev[k]) * p;
      prev[k] = target;
    }
  }
  return { x: cur.x, y: cur.y, z: Math.exp(cur.z), r: cur.r };
};

// Keyframe track: pose at f, smootherstep between keys, zoom in log space.
export type Key = { f: number; x: number; y: number; z: number; r?: number };
export const keyAt = (keys: Key[], f: number): Pose => {
  const first = keys[0];
  if (f <= first.f) return { x: first.x, y: first.y, z: first.z, r: first.r ?? 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b.f) {
      const t = easeInOut((f - a.f) / (b.f - a.f));
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t),
        r: (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * t,
      };
    }
  }
  const k = keys[keys.length - 1];
  return { x: k.x, y: k.y, z: k.z, r: k.r ?? 0 };
};

// Hand-held shake from impacts: starts on the impact frame, decays over ~4.5
// frames, amplitudes add up and are capped. Only shake where it means something.
export const shakeAt = (f: number, hits: { f: number; amp: number }[], seed = 0, cap = 1.3): Shake => {
  let a = 0;
  for (const h of hits) {
    const t = f - h.f;
    if (t >= -0.25 && t < 36) a += h.amp * Math.exp(-Math.max(0, t) / 4.5);
  }
  a = Math.min(a, cap);
  return {
    sx: a * 34 * noise1(f * 0.9, 1 + seed),
    sy: a * 26 * noise1(f * 0.9, 2 + seed),
    sr: a * 1.3 * noise1(f * 0.7, 3 + seed),
  };
};

// Put this on a div at left:0 top:0 with transformOrigin "0 0"; children use world px.
export const camTransform = (c: Pose, sh: Shake = NO_SHAKE, width = 1920, height = 1080) =>
  `translate(${width / 2 + sh.sx}px, ${height / 2 + sh.sy}px) rotate(${c.r + sh.sr}deg) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;

// Inverse (without shake): screen px → world point. Use it to pin something to
// a screen position at the moment it appears (e.g. a slam word at screen centre).
export const screenToWorld = (c: Pose, sx: number, sy: number, width = 1920, height = 1080) => {
  const dx = (sx - width / 2) / c.z;
  const dy = (sy - height / 2) / c.z;
  const a = (-c.r * Math.PI) / 180;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
};

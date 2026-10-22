import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";

// Film-style motion blur: render the children at several sub-frame times and
// average them (plus-lighter at 1/N each).
// Source: JIN-motion- src/intro/MotionBlur.tsx + src/intro-free/{Blur.tsx,shutter.ts}.
//
// Everything inside must be a pure function of (possibly fractional) frame.
// Sample count decides streak vs. ghosts: when something crosses hundreds of
// pixels in one frame, 6–7 samples show as separate copies (the Butterworth
// whip pans did); use ~14 there. Only blur the frames that move fast.

// Evenly spread offsets over `shutter` (fraction of a frame), centred on the frame.
export const centredOffsets = (samples: number, shutter = 0.5) =>
  samples <= 1 ? [0] : new Array(samples).fill(0).map((_, i) => shutter * (i / (samples - 1) - 0.5));

// Offsets for frame f given the beat frames of whips/slams (`hits`) and hard
// cuts: 14 samples on the hit frame and the next, 8 for a few frames after,
// none elsewhere. A sample never reaches across a cut (no bleed from the
// previous scene).
export const shutterOffsets = (f: number, hits: number[], cuts: number[] = []) => {
  const since = Math.min(...hits.map((h) => (f >= h ? f - h : Infinity)));
  if (!(since <= 4)) return [0];
  const n = since <= 1 ? 14 : 8;
  return new Array(n).fill(0).map((_, i) => {
    const o = -0.25 + (0.5 * i) / (n - 1);
    const cut = cuts.find((c) => f >= c && f + o < c);
    return cut === undefined ? o : cut - f;
  });
};

export const Blur: React.FC<{ offsets: number[]; children: React.ReactNode }> = ({ offsets, children }) => {
  const frame = useCurrentFrame();
  if (offsets.length <= 1) {
    return (
      <AbsoluteFill>
        <Freeze frame={frame + (offsets[0] ?? 0)}>{children}</Freeze>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {offsets.map((o, i) => (
        <AbsoluteFill key={i} style={{ mixBlendMode: "plus-lighter", filter: `opacity(${1 / offsets.length})` }}>
          <Freeze frame={frame + o}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

// Shorthand: N centred samples.
export const MotionBlur: React.FC<{ samples: number; shutter?: number; children: React.ReactNode }> = ({ samples, shutter = 0.5, children }) => (
  <Blur offsets={centredOffsets(samples, shutter)}>{children}</Blur>
);

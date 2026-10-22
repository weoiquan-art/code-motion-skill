import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";
import { hash } from "../core/math.ts";

// "Almost but wrong" glitches for any frame-driven content (a clip, a card, a
// scene). IntroV2 used them on failed AI-video results.
// Source: JIN-motion- src/intro-v2/world/GlitchCards.tsx (generalised to children).
//   stutter  – motion keeps freezing (holds every `hold` frames)
//   tear     – horizontal bands jump sideways every 3 frames
//   pixelate – mosaic via an SVG filter
//   rgb      – red / blue channels split, with flicker
//   hue      – wrong colours (hue-rotate + saturate)
export type GlitchKind = "stutter" | "tear" | "pixelate" | "rgb" | "hue";

export const Glitch: React.FC<{ kind: GlitchKind; id: string; width: number; height: number; from?: number; hold?: number; children: React.ReactNode }> = ({
  kind,
  id,
  width: w,
  height: h,
  from = 0,
  hold = 7,
  children,
}) => {
  const f = useCurrentFrame();
  const whole = Math.round(f);
  if (kind === "stutter") {
    const held = from + Math.floor((whole - from) / hold) * hold;
    return <Freeze frame={held}>{children}</Freeze>;
  }
  if (kind === "tear") {
    const bands = 7;
    return (
      <AbsoluteFill>
        {new Array(bands).fill(0).map((_, b) => {
          const step = Math.floor(whole / 3);
          const off = hash(b * 13 + step * 7) > 0.45 ? (hash(b * 31 + step) - 0.5) * 46 : 0;
          return (
            <div key={b} style={{ position: "absolute", left: 0, top: (b * h) / bands, width: w, height: h / bands + 1, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: off, top: (-b * h) / bands, width: w, height: h }}>{children}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  if (kind === "pixelate") {
    return (
      <AbsoluteFill>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={`${id}-px`} x="0" y="0" width="100%" height="100%">
            <feFlood x="5" y="5" height="2" width="2" />
            <feComposite width="12" height="12" />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" radius="6" />
          </filter>
        </svg>
        <AbsoluteFill style={{ filter: `url(#${id}-px)` }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (kind === "rgb") {
    const dx = 6 + 8 * hash(whole);
    const flicker = whole % 2 === 0 ? 1.55 : 0.75;
    return (
      <AbsoluteFill>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={`${id}-rgb`} x="-10%" y="0" width="120%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={dx} dy="0" result="r2" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx={-dx} dy="0" result="b2" />
            <feBlend in="r2" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b2" mode="screen" />
          </filter>
        </svg>
        <AbsoluteFill style={{ filter: `url(#${id}-rgb) brightness(${flicker})` }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{ filter: "hue-rotate(150deg) saturate(1.8) contrast(1.12)" }}>{children}</AbsoluteFill>;
};

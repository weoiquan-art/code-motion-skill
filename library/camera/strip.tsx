import { createContext, useContext } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeInOut, inv, lerp } from "../core/math.ts";

// Horizontal "day strip" (Butterworth): scenes laid side by side, the camera
// drifts slowly while a scene holds and whip-pans to the next one. Each scene
// is clipped to its own window; inside it, layers move with a parallax factor
// k (1 = with the ground, 0.1 = far hills, 0 = pinned to the screen, e.g. a
// sun reflection or a pop-up card). Source: JIN-motion- src/butterworth/{camera.ts,draw.tsx,world/Strip.tsx}.

export type StripScene = { from: number; to: number }; // to = next scene's first frame

export const makeStripCamera = ({
  scenes,
  span = 2400, // world px between scene centres
  drift = 90, // slow pan while holding (± px)
  panLead = 14, // frames before a scene's `to` the whip starts
  panTail = 6, // frames after it lands
  pushIn = 1.05, // zoom reached at the end of a hold
}: {
  scenes: StripScene[];
  span?: number;
  drift?: number;
  panLead?: number;
  panTail?: number;
  pushIn?: number;
}) => {
  const last = scenes.length - 1;
  const sceneX = (i: number) => i * span;
  const holdFrom = (i: number) => (i === 0 ? scenes[0].from : scenes[i].from + panTail);
  const holdTo = (i: number) => (i === last ? scenes[last].to : scenes[i].to - panLead);
  const camX = (f: number) => {
    for (let i = 0; i <= last; i++) {
      if (f < holdFrom(i)) {
        if (i === 0) return sceneX(0) - drift;
        const t = easeInOut(inv(scenes[i - 1].to - panLead, holdFrom(i), f));
        return lerp(sceneX(i - 1) + drift, sceneX(i) - drift, t);
      }
      if (f <= holdTo(i)) return lerp(sceneX(i) - drift, sceneX(i) + drift, inv(holdFrom(i), holdTo(i), f));
    }
    return sceneX(last) + drift;
  };
  const camZ = (f: number) => {
    for (let i = 0; i <= last; i++) {
      if (f < holdFrom(i)) {
        if (i === 0) return 1;
        return lerp(pushIn, 1, easeInOut(inv(scenes[i - 1].to - panLead, holdFrom(i), f)));
      }
      if (f <= holdTo(i)) return lerp(1, pushIn, inv(holdFrom(i), holdTo(i), f));
    }
    return pushIn;
  };
  // Progress of the transition into scene i (0 before the whip, 1 once landed); for skies, clocks, sounds.
  const panProgress = (f: number, i: number) => (i === 0 ? 1 : easeInOut(inv(scenes[i - 1].to - panLead, holdFrom(i), f)));
  const panSpeed = (f: number) => Math.abs(camX(f + 0.5) - camX(f - 0.5));
  return { span, sceneX, camX, camZ, panProgress, panSpeed, holdFrom, holdTo };
};

export type StripCamera = ReturnType<typeof makeStripCamera>;

const DxContext = createContext({ dx: 0, span: 2400, width: 1920 });

// One clipped window per scene; renders nothing while off screen.
export const StripWindow: React.FC<{ cam: StripCamera; index: number; width?: number; children: React.ReactNode }> = ({
  cam,
  index,
  width = 1920,
  children,
}) => {
  const f = useCurrentFrame();
  const dx = cam.camX(f) - cam.sceneX(index);
  const left = width / 2 - cam.span / 2 - dx;
  if (left >= width || left + cam.span <= 0) return null;
  return (
    <div style={{ position: "absolute", left, top: 0, width: cam.span, height: "100%", overflow: "hidden" }}>
      <DxContext.Provider value={{ dx, span: cam.span, width }}>{children}</DxContext.Provider>
    </div>
  );
};

// A parallax layer inside a StripWindow. Children use scene-local px where
// x ∈ [0, width] is the screen when the camera is centred on the scene.
export const Layer: React.FC<{ k: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ k, children, style }) => {
  const { dx, span, width } = useContext(DxContext);
  return (
    <div style={{ position: "absolute", left: (span - width) / 2 + dx * (1 - k), top: 0, width, height: "100%", ...style }}>
      {children}
    </div>
  );
};

// Whole strip: all windows, gently zoomed. Put a full-screen sky behind it.
export const Strip: React.FC<{ cam: StripCamera; scenes: React.FC[]; width?: number }> = ({ cam, scenes, width = 1920 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ transform: `scale(${cam.camZ(f)})`, overflow: "hidden" }}>
      {scenes.map((Scene, i) => (
        <StripWindow key={i} cam={cam} index={i} width={width}>
          <Scene />
        </StripWindow>
      ))}
    </AbsoluteFill>
  );
};

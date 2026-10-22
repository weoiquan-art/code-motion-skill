import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame } from "remotion";
import { Layer, makeStripCamera, Strip as StripView } from "../lib/camera/strip.tsx";
import { camAt, camTransform, type Move, type Pose } from "../lib/camera/world-camera.ts";
import { easeInOut, easeOut, inv, lerp } from "../lib/core/math.ts";
import { Blur, centredOffsets } from "../lib/core/MotionBlur.tsx";
import { Gull, Glitter, Palm, ridge, Svg, WaterLines } from "../lib/scene/draw.tsx";
import { CafeTable, Cat, HawkerCart, ShophouseRow, Stool } from "../lib/scene/props-town.tsx";
import { FishingBoat, StiltHouse, useBob, Wake } from "../lib/scene/props-water.tsx";
import { lerpSky, type Sky, SKY_PRESETS, SkyLayer } from "../lib/scene/Sky.tsx";
import { irisClose, irisOpen, IrisWindow } from "../lib/transitions/Iris.tsx";
import { BottomScrim, DotGrid, Vignette } from "../lib/ui/backdrop.tsx";
import { ChapterTitle, clockAt, ClockHud } from "../lib/ui/hud.tsx";
import { Statement, TypeLine, typeTimes } from "../lib/ui/text.tsx";
import { F } from "./fonts.ts";
import { B, DURATION, GRID, T, TEXT } from "./timeline.ts";

// Demo film for the starter: typed intro on a world camera → whip onto a dot →
// iris into a two-scene parallax strip (whip pan, time-lapse sky and clock,
// chapter titles) → iris back into the dot → closing statement.
// Replace scenes and text; keep the structure that is useful.

// ------------------------------------------------------------------ intro (world camera)
const DOT = { x: 420, y: 170 };
const START: Pose = { x: 0, y: 0, z: 1, r: 0 };
const MOVES: Move[] = [
  { f: T.typeFrom, to: { z: 1.08 }, ease: 48 },
  { f: T.zoom, to: { x: DOT.x, y: DOT.y, z: 6 }, ease: "whip", bounce: 0.4, dur: 14 },
];
const dotOnScreen = (f: number) => {
  const c = camAt(f, START, MOVES);
  return { x: 960 + (DOT.x - c.x) * c.z, y: 540 + (DOT.y - c.y) * c.z };
};
const typed = typeTimes(TEXT.intro, T.typeFrom, GRID.framesPerStep); // 16th notes

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f, START, MOVES);
  const dotIn = easeOut(inv(T.dot, T.dot + 6, f));
  const labelOut = 1 - inv(T.zoom, T.zoom + 4, f); // the label would be cut by the iris
  const pulse = ((f % 32) + 32) % 32 / 32;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1a26", overflow: "hidden" }}>
      <DotGrid cam={cam} />
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camTransform(cam) }}>
        <div style={{ position: "absolute", left: 0, top: -40, transform: "translate(-50%, -50%)", color: "#f4efe6" }}>
          <TypeLine
            text={TEXT.intro}
            times={typed}
            fontFamily={F.zhSerif}
            style={{ fontSize: 96, fontWeight: 900 }}
            cursor={{ color: "#ffd36b", from: T.typeFrom - 8, solidUntil: typed[typed.length - 1] + 4, until: T.zoom, framesPerBeat: GRID.framesPerBeat }}
          />
        </div>
        <div style={{ position: "absolute", left: 0, top: 50, transform: "translate(-50%, -50%)", fontFamily: F.en, fontWeight: 600, fontSize: 24, letterSpacing: "0.3em", color: "#8f9aa6", opacity: easeOut(inv(B(4), B(4) + 10, f)) }}>
          {TEXT.introEn}
        </div>
        <div style={{ position: "absolute", left: DOT.x, top: DOT.y, opacity: dotIn }}>
          <div style={{ position: "absolute", left: -6 - 20 * pulse, top: -6 - 20 * pulse, width: 12 + 40 * pulse, height: 12 + 40 * pulse, borderRadius: "50%", border: "1.5px solid #ffd36b", opacity: 1 - pulse }} />
          <div style={{ position: "absolute", left: -6, top: -6, width: 12, height: 12, borderRadius: "50%", background: "#ffd36b", boxShadow: "0 0 0 2px #ffffff" }} />
          <div style={{ position: "absolute", left: 18, top: -16, fontFamily: F.zhSans, fontWeight: 700, fontSize: 22, color: "#f4efe6", whiteSpace: "pre", opacity: labelOut }}>{TEXT.place}</div>
        </div>
      </div>
      <Vignette />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ the strip
const cam = makeStripCamera({ scenes: [{ from: T.scene1, to: T.scene2 }, { from: T.scene2, to: T.scene2End }], span: 2400, drift: 90 });
const HORIZON = 620;

const skyAt = (f: number): Sky => {
  const [d0, d1] = SKY_PRESETS.dawn;
  const [m0, m1] = SKY_PRESETS.morning;
  if (f < cam.holdTo(0)) return lerpSky(d0, d1, easeInOut(inv(T.scene1, cam.holdTo(0), f)));
  if (f < cam.holdFrom(1)) return lerpSky(d1, m0, cam.panProgress(f, 1));
  return lerpSky(m0, m1, easeInOut(inv(cam.holdFrom(1), T.scene2End, f)));
};

const Waterfront: React.FC = () => {
  const f = useCurrentFrame();
  const sky = skyAt(f);
  const boatX = lerp(1900, 1250, Math.min(1, inv(T.scene1 - 30, T.scene2, f)) ** 0.8);
  const bob = useBob(4);
  return (
    <>
      <Layer k={0.12}>
        <Svg>
          <path d={ridge(-400, 2320, HORIZON + 2, 130, 0.0016, 4, HORIZON + 2)} fill="#a27a9c" />
          <path d={ridge(-400, 2320, HORIZON + 2, 70, 0.0024, 9, HORIZON + 2)} fill="#866a94" />
        </Svg>
      </Layer>
      <Layer k={0.4}>
        <Svg>
          <defs>
            <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2a887" />
              <stop offset="25%" stopColor="#b77d98" />
              <stop offset="100%" stopColor="#3f3f78" />
            </linearGradient>
          </defs>
          <rect x={-400} y={HORIZON} width={2720} height={1080 - HORIZON} fill="url(#sea)" />
          <WaterLines horizon={HORIZON} color="#ffd9c0" />
        </Svg>
      </Layer>
      <Layer k={0}>
        <Svg>
          <Glitter sx={960 + (sky.sun.x - 960) / 1.02} horizon={HORIZON} color="#ffe6b8" />
        </Svg>
      </Layer>
      <Layer k={0.5}>
        <Svg>
          <Palm x={-170} y={HORIZON + 30} h={330} lean={0.12} color="#3e2c4a" seed={2} />
          <Palm x={520} y={HORIZON + 26} h={360} lean={0.2} color="#3e2c4a" seed={8} />
          <StiltHouse x={-330} w={250} h={130} floor={HORIZON + 18} water={HORIZON + 110} wall="#6b4a5c" roof="#4a3048" />
          <StiltHouse x={260} w={230} h={124} floor={HORIZON + 20} water={HORIZON + 110} wall="#6e4c60" roof="#4a3048" />
        </Svg>
      </Layer>
      <Layer k={0.85}>
        <Svg>
          {[0, 1, 2].map((i) => (
            <Gull key={i} x={300 + i * 230 + (f - T.scene1) * (1.6 + i * 0.3)} y={220 + i * 36} s={20 - i * 2} color="#3b2a45" phase={i * 1.7} />
          ))}
        </Svg>
      </Layer>
      <Layer k={1}>
        <Svg>
          <Wake x={boatX + 120} y={HORIZON + 296} dir={-1} color="#ffe8d4" opacity={0.55} />
          <FishingBoat x={boatX} y={HORIZON + 300 + bob} s={1.05} hull="#2c5f8a" stripe="#d9433a" />
        </Svg>
      </Layer>
    </>
  );
};

const GROUND = 850;
const Town: React.FC = () => (
  <>
    <Layer k={0.25}>
      <Svg>
        {[[-200, 1.1], [520, 1.3], [1320, 1.0], [2050, 1.2]].map(([x, s], i) => (
          <g key={i} fill="#7fb38c">
            <circle cx={x} cy={230} r={60 * s} />
            <circle cx={x + 60 * s} cy={240} r={48 * s} />
            <circle cx={x - 56 * s} cy={246} r={44 * s} />
          </g>
        ))}
      </Svg>
    </Layer>
    <Layer k={0.7}>
      <Svg>
        <ShophouseRow x={-400} ground={GROUND} count={8} signs={[null, TEXT.signs[0], null, TEXT.signs[1]]} signFont={F.zhSerif} />
        <rect x={-400} y={GROUND - 4} width={2720} height={30} fill="#d8cfbf" />
      </Svg>
    </Layer>
    <Layer k={1}>
      <Svg>
        <rect x={-400} y={GROUND + 20} width={2720} height={260} fill="#7a7d86" />
        <HawkerCart x={1020} ground={GROUND} label={TEXT.cart} labelFont={F.zhSerif} />
        <CafeTable x={1600} ground={GROUND + 156} />
        <Stool x={1500} ground={GROUND + 150} color="#d9433a" />
        <Stool x={1700} ground={GROUND + 150} color="#3a7fc4" />
        <Cat x={1700} y={GROUND + 54} />
      </Svg>
    </Layer>
  </>
);

const SCENES = [Waterfront, Town];

const Strip: React.FC = () => {
  const f = useCurrentFrame();
  const samples = cam.panSpeed(f) > 24 ? 14 : 1; // 14: fewer samples show as ghost copies
  return (
    <AbsoluteFill>
      <SkyLayer sky={skyAt(f)} cloudShift={-cam.camX(f) * 0.06} />
      <Blur offsets={centredOffsets(samples, 0.6)}>
        <StripView cam={cam} scenes={SCENES} />
      </Blur>
    </AbsoluteFill>
  );
};

const Titles: React.FC = () => {
  const f = useCurrentFrame();
  const stops = TEXT.scenes.map((s, i) => ({ f: [T.scene1, T.scene2][i], clock: s.clock }));
  const hud = easeOut(inv(T.scene1 - 10, T.scene1 + 14, f)) * (1 - inv(T.irisOut - 10, T.irisOut + 6, f));
  const ranges = [
    [T.scene1 + 8, T.scene2 - 22],
    [T.scene2 + 8, T.scene2End - 22],
  ];
  const scrim = ranges.reduce((v, [a, b]) => Math.max(v, inv(a - 4, a + 12, f) * (1 - inv(b, b + 14, f))), 0);
  return (
    <AbsoluteFill>
      <BottomScrim opacity={scrim} />
      {TEXT.scenes.map((s, i) => (
        <ChapterTitle key={i} inF={ranges[i][0]} outF={ranges[i][1]} tag={{ time: s.clock, ...s.tag }} title={s.title} en={s.en} zhSerif={F.zhSerif} zhSans={F.zhSans} enFont={F.en} />
      ))}
      <ClockHud min={clockAt(f, stops)} place={TEXT.place} placeEn={TEXT.placeEn} zhSans={F.zhSans} enFont={F.en} opacity={hud} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ ending
const END_DOT = { x: 1380, y: 540 };
const Ending: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = ((f % 32) + 32) % 32 / 32;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1a26" }}>
      <DotGrid cam={{ x: 0, y: 0, z: 1, r: 0 }} />
      <div style={{ position: "absolute", left: END_DOT.x, top: END_DOT.y }}>
        <div style={{ position: "absolute", left: -8 - 24 * pulse, top: -8 - 24 * pulse, width: 16 + 48 * pulse, height: 16 + 48 * pulse, borderRadius: "50%", border: "2px solid #ffd36b", opacity: 1 - pulse }} />
        <div style={{ position: "absolute", left: -8, top: -8, width: 16, height: 16, borderRadius: "50%", background: "#ffd36b", boxShadow: "0 0 0 3px #ffffff" }} />
      </div>
      <Statement lines={TEXT.end} en={TEXT.endEn} inF={T.endText} outF={DURATION + 100} zhFont={F.zhSerif} enFont={F.en} size={96} top={340} />
      <Vignette />
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const opening = irisOpen(f, T.irisIn, T.scene1);
  const closing = irisClose(f, T.irisOut, T.irisGone);
  const open = dotOnScreen(f);
  const fade = inv(0, 10, f) * (1 - inv(T.fadeOut, DURATION - 1, f));
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1a26" }}>
      <AbsoluteFill style={{ opacity: fade }}>
        {f < T.scene1 && <Intro />}
        {f >= T.irisOut && <Ending />}
        {f >= T.irisIn && f < T.irisGone && (
          <IrisWindow iris={f < T.scene1 ? opening : closing} x={f < T.scene1 ? open.x : END_DOT.x} y={f < T.scene1 ? open.y : END_DOT.y}>
            <Strip />
            <Titles />
          </IrisWindow>
        )}
      </AbsoluteFill>
      <Html5Audio src={staticFile("audio/film.wav")} />
    </AbsoluteFill>
  );
};

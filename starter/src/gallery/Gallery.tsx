import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { camTransform, keyAt, shakeAt } from "../lib/camera/world-camera.ts";
import { inv } from "../lib/core/math.ts";
import { Glitch, type GlitchKind } from "../lib/effects/Glitch.tsx";
import { Land, MapLabel, PlaceDot, Route, Token } from "../lib/map/MapParts.tsx";
import { makeProjection, mapTransform } from "../lib/map/projection.ts";
import { Gull, LanternString, Palm, StringLights, Wisps } from "../lib/scene/draw.tsx";
import { Bicycle, CafeTable, Cat, Diner, Dish, HawkerCart, HawkerStall, IncenseUrn, PottedPlant, Shophouse, Stool, TempleHall } from "../lib/scene/props-town.tsx";
import { BenchCouple, CableBridge, Catamaran, FishingBoat, LampPost, Railing, Skyline, StiltHouse, Wake } from "../lib/scene/props-water.tsx";
import { SKY_PRESETS, SkyLayer } from "../lib/scene/Sky.tsx";
import { irisOpen, IrisWindow } from "../lib/transitions/Iris.tsx";
import { DotGrid } from "../lib/ui/backdrop.tsx";
import { ChapterTitle, ClockHud } from "../lib/ui/hud.tsx";
import { PixelGlyph, Slam, Statement, TypeLine, typeTimes } from "../lib/ui/text.tsx";
import { F } from "../film/fonts.ts";

// Visual catalogue of the library: one 60-frame page per group. Render a still
// at frame page × 60 + 30 to see a page (catalogue thumbnails come from here).
export const GALLERY_PAGE = 60;

const Caption: React.FC<{ text: string; dark?: boolean }> = ({ text, dark }) => (
  <div style={{ position: "absolute", left: 40, top: 28, fontFamily: F.en, fontWeight: 700, fontSize: 30, letterSpacing: "0.08em", color: dark ? "#2b2230" : "#ffffff", textShadow: dark ? "none" : "0 2px 10px rgba(0,0,0,0.6)" }}>
    {text}
  </div>
);
const Tag: React.FC<{ x: number; y: number; text: string; dark?: boolean }> = ({ x, y, text, dark }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translateX(-50%)", fontFamily: F.en, fontWeight: 600, fontSize: 20, color: dark ? "#2b2230" : "#ffffff", background: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.45)", padding: "2px 10px", borderRadius: 6, whiteSpace: "pre" }}>
    {text}
  </div>
);
const Page: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = "#e9e4da" }) => (
  <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {children}
    </svg>
  </AbsoluteFill>
);

const Water: React.FC = () => (
  <AbsoluteFill>
    <SkyLayer sky={SKY_PRESETS.golden[0]} id="g1" />
    <Page bg="transparent">
      <rect x={0} y={640} width={1920} height={440} fill="#3f7f9a" />
      <Skyline x={1350} base={642} s={0.6} color="#6f5a86" lights={0.8} />
      <CableBridge x0={0} x1={700} y={628} color="#5a4a72" lights={1} />
      <StiltHouse x={60} w={240} h={120} floor={700} water={790} wall="#8a5a3c" roof="#5a3a2a" />
      <FishingBoat x={640} y={880} s={0.8} hull="#2c5f8a" stripe="#d9433a" />
      <Wake x={760} y={876} dir={-1} />
      <Catamaran x={1350} y={860} s={0.7} />
      <Railing x0={0} x1={1920} y={960} />
      <LampPost x={1780} ground={1040} on={1} />
      <BenchCouple x={1500} seat={1000} />
      <Palm x={320} y={790} h={300} color="#2f4a3a" seed={3} />
      <Gull x={900} y={300} s={22} color="#4a3a52" />
    </Page>
    <Caption text="scene/props-water · Sky(golden)" />
    <Tag x={180} y={600} text="StiltHouse" />
    <Tag x={640} y={760} text="FishingBoat + Wake" />
    <Tag x={1350} y={760} text="Catamaran" />
    <Tag x={1350} y={300} text="Skyline" />
    <Tag x={350} y={560} text="CableBridge" />
    <Tag x={1500} y={880} text="BenchCouple · Railing · LampPost" />
  </AbsoluteFill>
);

const Town: React.FC = () => (
  <AbsoluteFill>
    <SkyLayer sky={SKY_PRESETS.morning[0]} id="g2" />
    <Page bg="transparent">
      <Shophouse x={40} ground={860} facade="#a8d8c8" shutter="#2f7d6b" sign="茶室" signFont={F.zhSerif} gable />
      <Shophouse x={380} ground={860} facade="#f6b38e" shutter="#9a4a3a" />
      <rect x={0} y={860} width={1920} height={220} fill="#7a7d86" />
      <HawkerCart x={760} ground={860} label="粿条汤" labelFont={F.zhSerif} />
      <CafeTable x={1250} ground={1016} />
      <Stool x={1160} ground={1010} color="#d9433a" />
      <Stool x={1340} ground={1010} color="#3a7fc4" />
      <Cat x={1340} y={914} />
      <Bicycle x={1600} ground={1000} />
      <PottedPlant x={1820} ground={1000} />
    </Page>
    <Caption text="scene/props-town (day)" dark />
    <Tag x={210} y={150} text="Shophouse" dark />
    <Tag x={910} y={460} text="HawkerCart" dark />
    <Tag x={1250} y={790} text="CafeTable · Stool · Cat" dark />
    <Tag x={1620} y={840} text="Bicycle · PottedPlant" dark />
  </AbsoluteFill>
);

const Temple: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SkyLayer sky={SKY_PRESETS.afternoon[1]} id="g3" />
      <Page bg="transparent">
        <rect x={0} y={900} width={1920} height={180} fill="#d8c8a8" />
        <TempleHall cx={960} ground={900} s={0.82} name="斗母宫" nameFont={F.zhSerif} />
        <IncenseUrn x={1500} ground={1060} s={0.7} />
        <LanternString x0={-20} y0={20} x1={1940} y1={40} sag={110} n={10} s={0.9} />
        <Wisps x={300} y={1000} h={200} color="#ffffff" />
      </Page>
      <Caption text={`scene/props-town TempleHall · IncenseUrn · draw LanternString  (f${Math.round(f)})`} dark />
    </AbsoluteFill>
  );
};

const Night: React.FC = () => (
  <AbsoluteFill>
    <SkyLayer sky={SKY_PRESETS.night[0]} id="g4" moonAt={{ x: 1650, y: 330 }} />
    <Page bg="transparent">
      <rect x={0} y={870} width={1920} height={210} fill="#1a1630" />
      <HawkerStall x={140} w={380} ground={880} roof="#3a6ea5" sign={{ zh: "海鲜", en: "SEAFOOD", color: "#ffe9a8" }} signFont={F.zhSerif} enFont={F.en} cook glowId="st1" />
      <HawkerStall x={600} w={340} ground={880} roof="#c8412d" sign={{ zh: "沙爹", en: "SATAY", color: "#fff3d0" }} signFont={F.zhSerif} enFont={F.en} grill glowId="st2" />
      <HawkerStall x={1020} w={360} ground={880} roof="#2f8a6a" sign={{ zh: "炒粿条", color: "#ffe9a8" }} signFont={F.zhSerif} enFont={F.en} cook glowId="st3" />
      {[330, 780, 1200].map((x, i) => (
        <g key={x}>
          <Diner x={x - 60} seat={950} seed={i} />
          <Diner x={x + 64} seat={950} seed={i + 3} />
        </g>
      ))}
      <StringLights id="gl" x0={-20} y0={40} x1={1940} y1={60} sag={130} n={20} />
    </Page>
    <Caption text="props-town HawkerStall · Diner · draw StringLights · Sky(night)" />
  </AbsoluteFill>
);

const Food: React.FC = () => (
  <Page bg="#f3ecd8">
    {(["koayTeow", "curryMee", "lohMee", "nasiKandar"] as const).map((k, i) => (
      <g key={k} transform={`translate(${330 + i * 420},540) scale(1.5)`}>
        <Dish kind={k} />
      </g>
    ))}
    <text x={40} y={60} fontFamily={F.en} fontWeight={700} fontSize={30} fill="#2b2230">
      scene/props-town Dish: koayTeow · curryMee · lohMee · nasiKandar
    </text>
  </Page>
);

const PEN = makeProjection(100.37, 5.38);
const ISLAND: [number, number][] = [[100.31, 5.45], [100.343, 5.418], [100.321, 5.345], [100.289, 5.263], [100.195, 5.272], [100.191, 5.4], [100.18, 5.458], [100.254, 5.469]].map((p) => PEN(p as [number, number]));
const MAIN: [number, number][] = [[100.43, 5.0], [100.43, 5.3], [100.385, 5.377], [100.379, 5.413], [100.385, 5.5], [100.344, 5.67], [100.9, 5.85], [100.9, 4.9]].map((p) => PEN(p as [number, number]));
const ROUTE: [number, number][] = [[100.379, 5.4], [100.36, 5.414], [100.34, 5.417]].map((p) => PEN(p as [number, number]));
const RAIL: [number, number][] = [[100.379, 5.4], [100.41, 5.385], [100.466, 5.363], [100.478, 5.29]].map((p) => PEN(p as [number, number]));
const MapPage: React.FC = () => {
  const f = useCurrentFrame();
  const cam = { x: PEN([100.3, 5.37])[0], y: PEN([100.3, 5.37])[1], z: 1 };
  const draw = inv(0, 40, f);
  return (
    <AbsoluteFill style={{ background: "#0e2a3c" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={mapTransform(cam)}>
          <Land pts={ISLAND} z={cam.z} />
          <Land pts={MAIN} z={cam.z} />
          <Route pts={RAIL} z={cam.z} draw={draw} kind="rail" />
          <Route pts={ROUTE} z={cam.z} draw={draw} kind="ferry" />
          <Token pts={RAIL} t={(f % 60) / 60} z={cam.z} />
          <PlaceDot p={PEN([100.379, 5.4])} z={cam.z} frame={f} />
        </g>
      </svg>
      <MapLabel cam={cam} p={PEN([100.379, 5.4])} zh="北海" en="Butterworth" dx={24} dy={-46} size={36} zhFont={F.zhSans} enFont={F.en} />
      <Caption text="map/projection + MapParts: Land · Route(rail/ferry) · Token · PlaceDot · MapLabel" />
    </AbsoluteFill>
  );
};

const Card: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg,#3a6ea5,#ffb07a)" }}>
      <div style={{ position: "absolute", left: 40 + ((f * 6) % 200), top: 70, width: 120, height: 120, borderRadius: 60, background: "#fff2c8" }} />
      <div style={{ position: "absolute", left: 30, top: 230, fontFamily: F.zhSerif, fontWeight: 900, fontSize: 64, color: "#ffffff" }}>渔船回港</div>
    </AbsoluteFill>
  );
};
const GLITCHES: GlitchKind[] = ["stutter", "tear", "pixelate", "rgb", "hue"];
const Effects: React.FC = () => (
  <AbsoluteFill style={{ background: "#141417" }}>
    {GLITCHES.map((k, i) => (
      <div key={k} style={{ position: "absolute", left: 60 + (i % 3) * 610, top: 120 + Math.floor(i / 3) * 470, width: 560, height: 340, overflow: "hidden", borderRadius: 10 }}>
        <Glitch kind={k} id={`gx${i}`} width={560} height={340}>
          <Card />
        </Glitch>
        <div style={{ position: "absolute", left: 12, bottom: 10, fontFamily: F.en, fontWeight: 700, fontSize: 24, color: "#ffffff" }}>{k}</div>
      </div>
    ))}
    <div style={{ position: "absolute", left: 1280, top: 590, width: 560, height: 340, borderRadius: 10, overflow: "hidden" }}>
      <Card />
      <div style={{ position: "absolute", left: 12, bottom: 10, fontFamily: F.en, fontWeight: 700, fontSize: 24, color: "#ffffff" }}>original</div>
    </div>
    <div style={{ position: "absolute", left: 40, top: 30, fontFamily: F.en, fontWeight: 700, fontSize: 30, color: "#ffffff" }}>effects/Glitch</div>
  </AbsoluteFill>
);

const WO = [
  ".....#...#......", "....###..#.#....", ".####....#..#...", "....#....#..#...", "....#....#......", "###############.", "....#....#......", "....#....#...#..",
  "....#.#..#...#..", "....##...#..#...", "...##.....##....", ".##.#.....#...#.", "....#....#.#..#.", "....#...#...#.#.", "..#.#.##.....##.", "...#..........#.",
];
const Text: React.FC = () => {
  const f = useCurrentFrame();
  const cam = keyAt([{ f: 0, x: 0, y: 0, z: 1 }, { f: 60, x: 40, y: 10, z: 1.1 }], f);
  const sh = shakeAt(f, [{ f: 20, amp: 0.4 }]);
  return (
    <AbsoluteFill style={{ background: "#0c0c0e" }}>
      <DotGrid cam={cam} sh={sh} />
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camTransform(cam, sh) }}>
        <div style={{ position: "absolute", left: -720, top: -380, color: "#f4f1ea" }}>
          <TypeLine text="打字：每个字落在网格上" times={typeTimes("打字：每个字落在网格上", 0, 2)} fontFamily={F.zhSans} style={{ fontSize: 56, fontWeight: 800 }} cursor={{ color: "#ffb547", from: 0, solidUntil: 30, framesPerBeat: 16 }} />
        </div>
        <div style={{ position: "absolute", left: 420, top: -360 }}>
          <PixelGlyph bitmap={WO} cell={14} color="#3dd9ff" alpha={(r, c, on) => (on ? (r * 16 + c < f * 8 ? 1 : 0.15) : 0)} />
        </div>
      </div>
      <Slam at={8} life={60} zh="改。" en="EDIT." zhFont={F.zhSerif} enFont={F.en} size={240} />
      <Statement lines={["很多人，", "只是路过。"]} en="Most people only pass through." inF={0} outF={999} zhFont={F.zhSerif} enFont={F.en} size={60} left={1180} top={600} />
      <ClockHud min={7 * 60 + 10} place="北海" placeEn="BUTTERWORTH" zhSans={F.zhSans} enFont={F.en} />
      <ChapterTitle inF={0} outF={999} tag={{ time: "07:10", zh: "清晨", en: "DAWN" }} title="渔船回港" en="Boats come home" zhSerif={F.zhSerif} zhSans={F.zhSans} enFont={F.en} size={80} />
      <div style={{ position: "absolute", right: 40, bottom: 30, fontFamily: F.en, fontWeight: 700, fontSize: 24, color: "#8f8b84" }}>ui/text · ui/hud · camera keyAt/shakeAt · DotGrid</div>
    </AbsoluteFill>
  );
};

const Skies: React.FC = () => {
  const names = Object.keys(SKY_PRESETS);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {names.map((n, i) => (
        <div key={n} style={{ position: "absolute", left: (i % 4) * 480, top: Math.floor(i / 4) * 540, width: 480, height: 540, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: "scale(0.25)", transformOrigin: "0 0" }}>
            <SkyLayer sky={SKY_PRESETS[n][0]} id={`sk${i}`} />
          </div>
          <div style={{ position: "absolute", left: 0, top: 270, width: 480, height: 270, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: "scale(0.25)", transformOrigin: "0 0" }}>
              <SkyLayer sky={SKY_PRESETS[n][1]} id={`sl${i}`} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 10, top: 8, fontFamily: F.en, fontWeight: 700, fontSize: 22, color: "#ffffff" }}>{n}: start / end</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const IrisDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0e2a3c" }}>
      <IrisWindow iris={irisOpen(f, 0, 50)} x={1200} y={500}>
        <SkyLayer sky={SKY_PRESETS.dawn[0]} id="ir" />
      </IrisWindow>
      <Caption text="transitions/Iris (frame 30 of 0–50)" />
    </AbsoluteFill>
  );
};

const PAGES = [Water, Town, Temple, Night, Food, MapPage, Effects, Text, Skies, IrisDemo];
export const GALLERY_DURATION = PAGES.length * GALLERY_PAGE;

export const Gallery: React.FC = () => (
  <AbsoluteFill>
    {PAGES.map((P, i) => (
      <Sequence key={i} from={i * GALLERY_PAGE} durationInFrames={GALLERY_PAGE}>
        <P />
      </Sequence>
    ))}
  </AbsoluteFill>
);


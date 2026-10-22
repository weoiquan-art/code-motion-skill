// Single source of truth for the film: grid, timing, text, cues. The picture
// (src/film/*) and the soundtrack (scripts/gen-audio.ts) both read it, so they
// land on the same frames. Only imports plain .ts files (Node runs the scripts).
import { makeBeatGrid } from "../lib/core/beat.ts";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
// 112.5 BPM at 30 fps: 16 frames a beat, 64 a bar, 16th notes on 4-frame steps.
export const GRID = makeBeatGrid({ fps: FPS, bpm: 112.5, minDivision: 4 });
export const { B, bar } = GRID;
export const DURATION = bar(7); // 448 frames ≈ 14.9 s

export const T = {
  typeFrom: B(1), // intro line typed on 8th notes
  dot: B(5), // the place dot appears
  zoom: B(6), // camera whips onto the dot
  irisIn: B(6) + 8,
  scene1: bar(2), // iris fully open = first scene
  scene2: bar(4), // whip pan lands on the bar line
  scene2End: bar(6),
  irisOut: bar(6) - 14,
  irisGone: bar(6) + 12,
  endText: bar(6) + 10,
  fadeOut: DURATION - 20,
};

export const TEXT = {
  intro: "代码动画 · 起步模板",
  introEn: "CODE MOTION STARTER",
  place: "小镇",
  placeEn: "A SMALL TOWN",
  scenes: [
    { clock: "07:10", tag: { zh: "清晨", en: "DAWN" }, title: "渔船回港", en: "Boats come home at first light" },
    { clock: "08:30", tag: { zh: "早餐", en: "BREAKFAST" }, title: "一碗面，叫醒小镇", en: "A bowl of noodles wakes the town" },
  ],
  end: ["代码做的片子，", "下次直接复用。"],
  endEn: "Made with code — reuse it next time.",
  cart: "粿条汤",
  signs: ["茶室", "咖啡"],
};

// Everything that appears on screen (fonts are downloaded / registered from this).
export const ALL_TEXT = [
  TEXT.intro, TEXT.introEn, TEXT.place, TEXT.placeEn,
  ...TEXT.scenes.map((s) => s.clock + s.tag.zh + s.tag.en + s.title + s.en),
  ...TEXT.end, TEXT.endEn, TEXT.cart, ...TEXT.signs,
  "0123456789:",
  // characters used by src/gallery (delete with it)
  "斗母宫海鲜沙爹炒粿条北海打字：每个字落在网格上改很多人只是路过清晨渔船回港茶室",
].join("");

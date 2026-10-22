// Soundtrack for the starter film, built from the shared timeline.
//   npm run audio   → public/audio/film.wav
// Every sound is placed on a frame from src/film/timeline.ts, the same numbers
// the picture uses. Claude cannot listen: check with `npm run check` and
// ffmpeg ebur128 / showspectrumpic, and say so when delivering.

import { mkdirSync, writeFileSync } from "node:fs";
import { createSynth } from "../src/lib/audio/synth.ts";
import { B, bar, DURATION, FPS, GRID, T, TEXT } from "../src/film/timeline.ts";
import { typeTimes } from "../src/lib/ui/typing-times.ts";

const s = createSynth({ seconds: DURATION / FPS, fps: FPS });
const half = GRID.framesPerBeat / 2;

// intro: soft pad, one key click per typed character, a tick when the dot appears
s.pad(0, T.scene1, [50, 57, 62, 66], 0.05, 1400, 1.2, 0.8);
for (const [i, t] of typeTimes(TEXT.intro, T.typeFrom, GRID.framesPerStep).entries()) if ([...TEXT.intro][i].trim()) s.typeClick(t, 0.22);
s.tick(T.dot, 0.25, 0.3);
// the camera whips on T.zoom: a hit on that very frame (a picture jump needs a sound)
s.kick(T.zoom, 0.5);
s.whoosh(T.zoom, 0.25, 0.4);
// swell, not riser: it stops dead 40 ms early, so the downbeat at scene1 has a clean attack
s.swell(T.irisIn - 16, T.scene1, 0.2);
for (const [i, m] of [74, 78, 81, 86].entries()) s.bell(T.scene1 - 8 + i * 2, m, 0.06, i % 2 ? 0.5 : -0.5, 0.9);

// the day: D major, 4-chord loop, marimba eighths, kick + shaker, whoosh on the pan
const CHORDS = [
  { root: 38, notes: [62, 66, 69, 76] },
  { root: 37, notes: [61, 64, 69, 71] },
  { root: 35, notes: [59, 62, 66, 69] },
  { root: 31, notes: [59, 62, 67, 69] },
];
const pattern = [0, 2, 1, 3, 4, 3, 2, 1];
for (let b = 2; b < 6; b++) {
  const ch = CHORDS[(b - 2) % 4];
  const f0 = bar(b);
  s.pad(f0, bar(b + 1), ch.notes, 0.035, 2200);
  const tones = [...ch.notes, ch.notes[0] + 12];
  for (let k = 0; k < 8; k++) s.marimba(f0 + k * half, tones[pattern[k]], 0.07, k % 2 ? 0.35 : -0.35);
  for (let beat = 0; beat < 4; beat++) {
    s.kick(f0 + B(beat), beat % 2 ? 0.45 : 0.6);
    s.shaker(f0 + B(beat) + half, 0.08, beat % 2 ? 0.4 : -0.4);
  }
  s.bassNote(f0, GRID.framesPerBar - 4, ch.root, 0.35);
}
s.whoosh(T.scene2 - 14, 0.35, 0.6);

// ambience under each scene
s.waves(T.scene1 - 20, T.scene2 + 6, 0.12);
s.gull(T.scene1 + 20, 0.05, -0.4);
s.gull(T.scene1 + 29, 0.04, -0.3);
s.engine(T.scene1, T.scene2, 0.04);
s.murmur(T.scene2 - 6, T.scene2End, 0.05);
s.sizzle(T.scene2 + 24, 1.6, 0.04);

// ending: everything resolves on D, one bell over the statement
s.pad(T.irisOut, DURATION, [50, 57, 62, 66, 69], 0.06, 1600, 0.8, 1.2);
s.bell(T.endText, 74, 0.08, 0, 2.4);

const mix = s.mixdown();
s.fadeOut(mix, T.fadeOut - 30);
s.master(mix, -1);
mkdirSync("public/audio", { recursive: true });
writeFileSync("public/audio/film.wav", s.toWav(mix));
console.log(`public/audio/film.wav  ${(s.N / s.SR).toFixed(2)} s`);

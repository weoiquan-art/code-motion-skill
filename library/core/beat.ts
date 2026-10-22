// Beat grid shared by picture and soundtrack. No imports (Node scripts read it).
// Source: JIN-motion- src/intro-free/beat.ts, generalised.
//
// Pick a BPM where a beat is a whole number of frames: framesPerBeat = fps × 60 / bpm.
// At 30 fps: 90 BPM → 20 (16ths 5), 100 → 18 (8ths 9, 16ths 4.5!), 112.5 → 16
// (16ths 4, 32nds 2), 120 → 15 (8ths 7.5). `minDivision` is the finest note the
// PICTURE has to hit (4 = 16ths, 2 = 8ths); the grid throws if it falls between frames.

export type BeatGrid = ReturnType<typeof makeBeatGrid>;

export const makeBeatGrid = ({
  fps = 30,
  bpm,
  beatsPerBar = 4,
  minDivision = 4,
  sampleRate = 48000,
}: {
  fps?: number;
  bpm: number;
  beatsPerBar?: number;
  minDivision?: number;
  sampleRate?: number;
}) => {
  const framesPerBeat = (fps * 60) / bpm;
  const framesPerStep = framesPerBeat / minDivision;
  if (!Number.isInteger(framesPerStep)) {
    throw new Error(`BPM ${bpm} at ${fps} fps puts 1/${minDivision * 4} notes between frames (${framesPerStep} frames)`);
  }
  const framesPerBar = framesPerBeat * beatsPerBar;
  return {
    fps,
    bpm,
    beatsPerBar,
    sampleRate,
    framesPerBeat,
    framesPerStep,
    framesPerBar,
    // frame of beat n, of step n (minDivision per beat), of bar n (+ beat)
    B: (beat: number) => beat * framesPerBeat,
    S: (step: number) => step * framesPerStep,
    bar: (n: number, beat = 0) => (n * beatsPerBar + beat) * framesPerBeat,
    seconds: (frame: number) => frame / fps,
    sampleAt: (frame: number) => Math.round((frame / fps) * sampleRate),
  };
};

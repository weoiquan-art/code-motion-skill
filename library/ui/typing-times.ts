// Grid times for typing text one character at a time (no imports, so the audio
// script can use the same times for key clicks). A space is not a keystroke: it
// appears together with the next character, otherwise something moves with no sound.
export const typeTimes = (text: string, start: number, step: number) => {
  const out: number[] = [];
  let t = start;
  for (const ch of [...text]) {
    out.push(t);
    if (ch.trim() !== "") t += step;
  }
  return out;
};

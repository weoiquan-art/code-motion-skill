// Sample-free soundtrack synthesis for code-made films. Pure TypeScript (no
// Node / DOM imports): a Node script builds the score with it and writes the
// WAV (see starter/scripts/gen-audio.ts). Every sound starts on a FRAME, read
// from the same timeline as the picture, so sync is constructed, not tuned.
// Source: JIN-motion- scripts/gen-audio-free.ts (engine, drums, voices, fx,
// sidechain, reverb, master) + scripts/gen-audio-bw.ts (marimba, ambience).
//
// Lessons baked in (see references/动效.md §6):
//  · kicks carry a 1–4 kHz knock + click and the bass an upper octave, or phone
//    speakers hear nothing; nothing useful lives below 80 Hz
//  · the master gets a 32 Hz high-pass BEFORE planned silences / tape stops
//  · noise-based sounds (waves, crowd, wind) need low-passing or they hiss to 24 kHz
//  · scene cuts listed in cleanCuts end every earlier voice with a 20 ms fade

export type Bus = [Float32Array, Float32Array];
export type Voice = (t: number, i: number) => number | [number, number];

export const createSynth = ({ seconds, fps = 30, sampleRate = 48000, seed = 20261002 }: { seconds: number; fps?: number; sampleRate?: number; seed?: number }) => {
  const SR = sampleRate;
  const N = Math.ceil(seconds * SR);
  const TAU = Math.PI * 2;
  const at = (frame: number) => Math.round((frame / fps) * SR);

  // mulberry32: the same WAV on every run
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const noise = () => rnd() * 2 - 1;
  const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

  const bus = (): Bus => [new Float32Array(N), new Float32Array(N)];
  const drums = bus();
  const bass = bus();
  const music = bus();
  const fx = bus();
  const amb = bus();
  const send = bus(); // → reverb
  const kicks: { frame: number; depth: number }[] = [];
  const cleanCuts: number[] = []; // frames where everything before stops dead (20 ms fade)

  // A voice starting exactly on `frame`; fn(t, i) → mono (equal-power panned) or [l, r].
  const put = (target: Bus, frame: number, secs: number, gain: number, pan: number, fn: Voice, reverb = 0) => {
    const start = at(frame);
    let len = Math.floor(secs * SR);
    const cut = cleanCuts.find((c) => frame < c && start + len > at(c));
    const cutAt = cut === undefined ? Infinity : at(cut) - start;
    const fadeLen = Math.floor(SR * 0.02);
    if (cut !== undefined) len = cutAt;
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= N) break;
      if (idx < 0) continue;
      const v = fn(i / SR, i);
      const k = i > cutAt - fadeLen ? (cutAt - i) / fadeLen : 1;
      const l = (typeof v === "number" ? v : v[0]) * k;
      const r = (typeof v === "number" ? v : v[1]) * k;
      target[0][idx] += l * gl;
      target[1][idx] += r * gr;
      if (reverb) {
        send[0][idx] += l * gl * reverb;
        send[1][idx] += r * gr * reverb;
      }
    }
  };

  // ---------------------------------------------------------------- DSP
  // Zavalishin state-variable filter (stable at any cutoff): lp / bp / hp.
  class SVF {
    lp = 0;
    bp = 0;
    hp = 0;
    private a = 0;
    private b = 0;
    step(x: number, cutoff: number, q = 0.707) {
      const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR);
      const k = 1 / q;
      const a1 = 1 / (1 + g * (g + k));
      const a2 = g * a1;
      const a3 = g * a2;
      const v3 = x - this.b;
      const v1 = a1 * this.a + a2 * v3;
      const v2 = this.b + a2 * this.a + a3 * v3;
      this.a = 2 * v1 - this.a;
      this.b = 2 * v2 - this.b;
      this.lp = v2;
      this.bp = v1;
      this.hp = x - k * v1 - v2;
      return this;
    }
  }
  const blep = (t: number, dt: number) => {
    if (t < dt) {
      const x = t / dt;
      return x + x - x * x - 1;
    }
    if (t > 1 - dt) {
      const x = (t - 1) / dt;
      return x * x + x + x + 1;
    }
    return 0;
  };
  // Band-limited saw (polyBLEP).
  class Saw {
    ph = rnd();
    next(f: number) {
      const dt = f / SR;
      this.ph += dt;
      if (this.ph >= 1) this.ph -= 1;
      return 2 * this.ph - 1 - blep(this.ph, dt);
    }
  }
  // Swept sine (phase accumulated, so pitch can glide).
  const glide = (f: (t: number) => number) => {
    let ph = 0;
    return (t: number) => {
      ph += (TAU * f(t)) / SR;
      return Math.sin(ph);
    };
  };
  const attack = (t: number, a: number) => (t < a ? t / a : 1);
  // Attack / hold / release envelope over a voice of length `len` seconds.
  const env = (t: number, a: number, len: number, r: number) => Math.min(1, t / a) * Math.min(1, Math.max(0, (len - t) / r));

  // ---------------------------------------------------------------- drums
  const kick = (frame: number, vel: number, depth = 0.85) => {
    kicks.push({ frame, depth });
    const body = glide((t) => 50 + 115 * Math.exp(-t / 0.03));
    const knock = new SVF();
    const click = new SVF();
    put(drums, frame, 0.5, vel, 0, (t) => {
      const b = body(t) * Math.exp(-t / 0.2) * attack(t, 0.0008) * 0.85;
      const k = knock.step(noise(), 1800, 0.9).bp * Math.exp(-t / 0.007) * 1.3; // reads on phone speakers
      return Math.tanh(1.6 * (b + k)) + click.step(noise(), 4200, 0.8).bp * 1.6 * Math.exp(-t / 0.0022);
    });
  };
  // Low "heartbeat" for quiet sections: lub on the grid, dub `dubFrames` later.
  const heartbeat = (frame: number, vel: number, dubFrames = 4) => {
    for (const [off, g] of [
      [0, 1],
      [dubFrames, 0.45],
    ] as const) {
      const body = glide((t) => 52 + 46 * Math.exp(-t / 0.045));
      const lp = new SVF();
      const tk = new SVF();
      put(drums, frame + off, 0.35, vel * g, 0, (t) => lp.step(Math.tanh(2.2 * body(t) * Math.exp(-t / 0.14) * attack(t, 0.0015)), 520).lp * 1.1 + tk.step(noise(), 1100, 1.4).bp * 0.7 * Math.exp(-t / 0.008));
    }
  };
  const clap = (frame: number, vel: number) => {
    const fl = new SVF();
    const fr = new SVF();
    put(drums, frame, 0.4, vel, 0, (t) => {
      let e = 0;
      [0, 0.009, 0.018].forEach((d, i) => {
        if (t >= d) e = Math.max(e, (1 - i * 0.22) * Math.exp(-(t - d) / 0.0035));
      });
      if (t >= 0.027) e = Math.max(e, 0.5 * Math.exp(-(t - 0.027) / 0.11));
      return [fl.step(noise(), 1300, 1.1).bp * e * 2.4, fr.step(noise(), 1450, 1.1).bp * e * 2.4];
    }, 0.22);
  };
  const snare = (frame: number, vel: number) => {
    const f = new SVF();
    const tone = glide((t) => 210 - 30 * t);
    put(drums, frame, 0.22, vel, 0, (t) => f.step(noise(), 3200, 0.6).bp * 2 * Math.exp(-t / 0.055) + tone(t) * 0.5 * Math.exp(-t / 0.035), 0.15);
  };
  const hat = (frame: number, vel: number, open = false, pan = 0) => {
    const f = new SVF();
    put(drums, frame, open ? 0.45 : 0.08, vel, pan, (t) => f.step(noise(), 7600, 0.8).hp * Math.exp(-t / (open ? 0.12 : 0.018)));
  };
  const shaker = (frame: number, vel: number, pan = 0) => {
    const f = new SVF();
    put(drums, frame, 0.12, vel, pan, (t) => f.step(noise(), 6000, 1.2).bp * 1.6 * attack(t, 0.004) * Math.exp(-t / 0.035));
  };
  // Short clear "tick": makes an accent in a quiet passage easy to hear.
  const tick = (frame: number, vel: number, pan = 0) => {
    const f = new SVF();
    put(drums, frame, 0.04, vel, pan, (t) => f.step(noise(), 2600, 1.6).bp * 3 * Math.exp(-t / 0.003) + Math.sin(TAU * 1250 * t) * 0.4 * Math.exp(-t / 0.012));
  };

  // ---------------------------------------------------------------- tonal voices
  // Soft electric-piano-ish pluck: additive, upper partials die first.
  const pluck = (frame: number, midi: number, vel: number, pan = 0, decay = 0.9, reverb = 0.3) => {
    const f0 = hz(midi);
    put(music, frame, decay * 4, vel, pan, (t) => {
      let x = 0;
      for (let n = 1; n <= 6; n++) {
        if (f0 * n > 12000) break;
        x += (Math.sin(TAU * f0 * n * t) / n ** 1.6) * Math.exp(-t / (decay / (1 + 0.7 * (n - 1))));
      }
      return x * attack(t, 0.002);
    }, reverb);
  };
  // Marimba: fundamental + the 3.93× partial, wooden click (Butterworth).
  const marimba = (frame: number, midi: number, vel: number, pan = 0) => {
    const f0 = hz(midi);
    const click = new SVF();
    put(music, frame, 0.9, vel, pan, (t) => Math.sin(TAU * f0 * t) * Math.exp(-t * 5.5) + 0.28 * Math.sin(TAU * f0 * 3.93 * t) * Math.exp(-t * 22) + click.step(noise(), 2400, 2).bp * 0.5 * Math.exp(-t * 400), 0.25);
  };
  // Felt piano: slightly inharmonic partials, a little detune between ears.
  const piano = (frame: number, midis: number[], vel: number, decay = 2.4, reverb = 0.35) => {
    for (const m of midis) {
      const f0 = hz(m);
      put(music, frame, decay * 2.5, vel / Math.sqrt(midis.length), 0, (t) => {
        let l = 0;
        let r = 0;
        for (let n = 1; n <= 8; n++) {
          const fn = f0 * n * Math.sqrt(1 + 0.0004 * n * n);
          if (fn > 9000) break;
          const a = (1 / n ** 1.25) * Math.exp(-t / (decay / n ** 0.7));
          l += Math.sin(TAU * fn * 0.9997 * t) * a;
          r += Math.sin(TAU * fn * 1.0003 * t + 0.4) * a;
        }
        const e = attack(t, 0.004);
        return [l * e, r * e];
      }, reverb);
    }
  };
  // FM bell (melody, sparkles).
  const bell = (frame: number, midi: number, vel: number, pan = 0, decay = 1.6) => {
    const f0 = hz(midi);
    put(music, frame, decay * 3, vel, pan, (t) => {
      const idx = 2.2 * Math.exp(-t / 0.35);
      return Math.sin(TAU * f0 * t + idx * Math.sin(TAU * f0 * 3.5 * t)) * Math.exp(-t / decay) * attack(t, 0.0015);
    }, 0.45);
  };
  // Pad: three detuned band-limited saws per note through a low-pass. from/to in frames.
  const pad = (from: number, to: number, midis: number[], vel: number, cutoff = 1800, atk = 0.6, rel = 0.6) => {
    const holdEnd = (to - from) / fps;
    const len = holdEnd + rel;
    const g = vel / Math.sqrt(midis.length);
    for (const m of midis) {
      const oscL = [new Saw(), new Saw(), new Saw()];
      const oscR = [new Saw(), new Saw(), new Saw()];
      const fl = new SVF();
      const fr = new SVF();
      const f0 = hz(m);
      put(music, from, len, g, 0, (t) => {
        const e = Math.min(1, t / atk) * (t > holdEnd ? Math.max(0, 1 - (t - holdEnd) / rel) : 1);
        if (e <= 0) return 0;
        const l = oscL[0].next(f0 * 0.996) + oscL[1].next(f0) + oscL[2].next(f0 * 1.005);
        const r = oscR[0].next(f0 * 0.995) + oscR[1].next(f0 * 1.001) + oscR[2].next(f0 * 1.004);
        return [fl.step(l, cutoff, 0.6).lp * e * 0.33, fr.step(r, cutoff, 0.6).lp * e * 0.33];
      }, 0.4);
    }
  };
  // Supersaw chord for a "full" section (ducked by the kicks in mixdown).
  const supersaw = (from: number, to: number, midis: number[], vel: number) => {
    const holdEnd = (to - from) / fps;
    const g = vel / Math.sqrt(midis.length);
    const detune = [-0.011, -0.005, 0, 0.005, 0.011];
    for (const m of midis) {
      const f0 = hz(m);
      const oscL = detune.map(() => new Saw());
      const oscR = detune.map(() => new Saw());
      const fl = new SVF();
      const fr = new SVF();
      put(music, from, holdEnd + 0.08, g, 0, (t) => {
        const e = attack(t, 0.006) * (t > holdEnd ? Math.max(0, 1 - (t - holdEnd) / 0.08) : 1);
        let l = 0;
        let r = 0;
        detune.forEach((d, i) => {
          l += oscL[i].next(f0 * (1 + d));
          r += oscR[i].next(f0 * (1 - d * 0.9));
        });
        const cut = 3600 + 2800 * Math.exp(-t / 0.12);
        return [fl.step(l, cut, 0.7).lp * e * 0.2, fr.step(r, cut, 0.7).lp * e * 0.2];
      }, 0.18);
    }
  };
  // Saw lead through a closing filter, with a little vibrato. frames = note length.
  const lead = (frame: number, frames: number, midi: number, vel: number) => {
    const f0 = hz(midi);
    const a = new Saw();
    const b = new Saw();
    const f = new SVF();
    const hold = frames / fps;
    put(music, frame, hold + 0.25, vel, 0, (t) => {
      const e = attack(t, 0.003) * (t < hold ? 0.55 + 0.45 * Math.exp(-t / 0.09) : 0.55 * Math.exp(-(t - hold) / 0.05));
      const vib = 1 + 0.003 * Math.sin(TAU * 5.2 * t) * Math.min(1, t / 0.2);
      const x = a.next(f0 * vib) * 0.6 + b.next(f0 * 2.002 * vib) * 0.25;
      return [f.step(x, 1500 + 4200 * Math.exp(-t / 0.08), 1.2).lp * e, f.lp * e];
    }, 0.25);
  };
  // Bass: sub sine + filtered saw an octave up (so small speakers hear the line).
  const bassNote = (frame: number, frames: number, midi: number, vel: number) => {
    const f0 = hz(midi);
    const hold = frames / fps;
    const o = glide(() => f0);
    const lp = new SVF();
    const sw = new Saw();
    put(bass, frame, hold + 0.06, vel, 0, (t) => {
      const e = attack(t, 0.004) * (t < hold ? 1 : Math.max(0, 1 - (t - hold) / 0.06));
      return Math.tanh(1.4 * (o(t) * 0.55 + lp.step(sw.next(f0 * 2), 1000, 0.8).lp * 0.55)) * e;
    });
  };

  // ---------------------------------------------------------------- fx
  const typeClick = (frame: number, vel: number) => {
    const f = new SVF();
    const pan = (rnd() - 0.5) * 0.5;
    const thock = 150 + 70 * rnd();
    const centre = 3300 + 900 * rnd();
    put(drums, frame, 0.05, vel, pan, (t) => f.step(noise(), centre, 2.5).bp * 2.4 * Math.exp(-t / 0.0045) + Math.sin(TAU * thock * t) * 0.5 * Math.exp(-t / 0.018));
  };
  const blip = (frame: number, midi: number, vel: number, pan = 0, len = 0.06) => {
    const f0 = hz(midi);
    const f = new SVF();
    put(music, frame, len * 3, vel, pan, (t) => f.step(Math.sign(Math.sin(TAU * f0 * t)), 3000, 0.7).lp * Math.exp(-t / len) * attack(t, 0.001) * 0.6, 0.2);
  };
  // Air whoosh (whip pans). Starts at `frame`, peaks in the middle.
  const whoosh = (frame: number, vel: number, dur = 0.32, up = true) => {
    const f = new SVF();
    put(fx, frame, dur, vel, 0, (t) => {
      const u = t / dur;
      const c = up ? 500 * 9 ** u : 4500 / 9 ** u;
      return f.step(noise(), c, 1.4).bp * 2.2 * attack(t, 0.006) * (1 - u) ** 1.5;
    }, 0.2);
  };
  const impact = (frame: number, vel: number, size = 1) => {
    const sub = glide((t) => 64 * Math.exp(-t / (0.45 * size)) + 42);
    const n = new SVF();
    put(fx, frame, 1.4 * size, vel, 0, (t) => Math.tanh(1.8 * (sub(t) * 0.8 * Math.exp(-t / (0.32 * size)) + n.step(noise(), 2200, 0.7).lp * 1.5 * Math.exp(-t / 0.07))), 0.35);
  };
  const crash = (frame: number, vel: number) => {
    const fl = new SVF();
    const fr = new SVF();
    put(fx, frame, 2.2, vel, 0, (t) => {
      const e = attack(t, 0.002) * Math.exp(-t / 0.75);
      return [fl.step(noise(), 5200, 0.5).hp * e, fr.step(noise(), 5600, 0.5).hp * e];
    }, 0.3);
  };
  // Data glitch: random square tones re-picked every `stepFrames` frames.
  const glitch = (frame: number, frames: number, vel: number, stepFrames = 2) => {
    let note = 84;
    const f = new SVF();
    const dur = frames / fps;
    const every = at(stepFrames);
    put(music, frame, dur, vel, 0, (t, i) => {
      if (i % every === 0) note = 72 + Math.floor(rnd() * 24);
      const crushed = Math.round(Math.sign(Math.sin(TAU * hz(note) * t)) * 3) / 3;
      return f.step(crushed, 4200, 0.7).lp * 0.45 * (1 - t / dur) * attack(t, 0.001);
    }, 0.1);
  };
  // Rising filtered noise + tone, ends where `to` begins.
  const riser = (from: number, to: number, vel: number) => {
    const dur = (to - from) / fps;
    const f = new SVF();
    const tone = glide((t) => 180 * 4 ** (t / dur));
    put(fx, from, dur, vel, 0, (t) => {
      const u = t / dur;
      return (f.step(noise(), 300 * 25 ** u, 2).bp * 2 + tone(t) * 0.25) * u * u;
    }, 0.2);
  };
  // Reverse swell into a downbeat: rises and stops dead 40 ms before `to`.
  const swell = (from: number, to: number, vel: number) => {
    const dur = (to - from) / fps;
    const f = new SVF();
    put(fx, from, dur, vel, 0, (t) => {
      const gap = Math.min(1, Math.max(0, (dur - 0.04 - t) / 0.03));
      return f.step(noise(), 2500 + 5000 * (t / dur), 0.7).bp * (t / dur) ** 3 * 2 * gap;
    });
  };
  // Glassy chime with a hard attack.
  const chime = (frame: number, midis: number[], vel: number) => {
    for (const [i, m] of midis.entries()) {
      const f0 = hz(m);
      put(music, frame, 2.5, vel / midis.length, i % 2 ? 0.35 : -0.35, (t) => {
        let x = 0;
        for (const [r, a, d] of [
          [1, 1, 1.2],
          [2.76, 0.5, 0.35],
          [5.4, 0.3, 0.12],
        ]) x += Math.sin(TAU * f0 * r * t) * a * Math.exp(-t / d);
        return x * attack(t, 0.0008);
      }, 0.5);
    }
  };

  // ---------------------------------------------------------------- ambience (Butterworth)
  // Sea: slow swells; body + low-passed wash (unfiltered noise hisses to 24 kHz).
  const waves = (from: number, to: number, vel: number) => {
    const len = (to - from) / fps;
    const body = new SVF();
    const wash = new SVF();
    const wash2 = new SVF();
    put(amb, from, len, vel, 0, (t) => {
      const sw = 0.55 + 0.45 * Math.sin(TAU * 0.16 * t) ** 2;
      const w = wash2.step(wash.step(noise(), 900, 0.8).bp, 2200).lp;
      return env(t, 0.6, len, 0.6) * sw * (body.step(noise(), 600).lp * 3 + w * 0.6 * sw);
    });
  };
  const gull = (frame: number, vel: number, pan = 0) => {
    const o = glide((t) => 1650 - 500 * (t / 0.32) + 60 * Math.sin(TAU * 22 * t));
    put(amb, frame, 0.32, vel, pan, (t) => o(t) * Math.sin(Math.PI * (t / 0.32)) ** 0.6 * (0.6 + 0.4 * Math.sin(TAU * 30 * t)), 0.4);
  };
  // Ship / train horn: a chord of buzzy tones (Hz).
  const horn = (frame: number, vel: number, freqs = [110, 138.6], secs = 2.2, pan = 0.3) => {
    put(amb, frame, secs, vel, pan, (t) => {
      let x = 0;
      for (const f of freqs) for (let h = 1; h <= 6; h++) x += Math.sin(TAU * f * h * t) / h;
      return env(t, 0.12, secs, 0.5) * Math.tanh(x * 0.6);
    }, 0.7);
  };
  // Big temple bell: inharmonic partials, long decay.
  const templeBell = (frame: number, vel: number, base = 196) => {
    put(amb, frame, 4, vel, 0, (t) =>
      [[1, 1, 0.9], [2.0, 0.6, 1.4], [2.76, 0.45, 2.2], [5.4, 0.25, 4], [0.5, 0.5, 0.6]].reduce((x, [r, a, d]) => x + a * Math.sin(TAU * base * r * t) * Math.exp(-t * d), 0) * attack(t, 0.004), 0.6);
  };
  const crickets = (from: number, to: number, vel: number) => {
    const len = (to - from) / fps;
    put(amb, from, len, vel, 0.5, (t) => env(t, 0.5, len, 1) * Math.sin(TAU * 4600 * t) * (Math.sin(TAU * 28 * t) > 0.3 ? 1 : 0) * (Math.sin(TAU * 1.3 * t) > 0 ? 1 : 0));
    put(amb, from + 7, len, vel * 0.8, -0.5, (t) => env(t, 0.5, len, 1) * Math.sin(TAU * 5200 * t) * (Math.sin(TAU * 31 * t) > 0.3 ? 1 : 0) * (Math.sin(TAU * 1.1 * t + 1) > 0 ? 1 : 0));
  };
  // Crowd murmur (a night market): moving band of low-passed noise.
  const murmur = (from: number, to: number, vel: number) => {
    const len = (to - from) / fps;
    const b = new SVF();
    const lp1 = new SVF();
    const lp2 = new SVF();
    put(amb, from, len, vel, 0, (t) => {
      const c = 700 + 300 * Math.sin(t * 3.1) + 200 * Math.sin(t * 7.7);
      const x = lp2.step(lp1.step(b.step(noise(), c, 1.2).bp, 1800).lp, 1800).lp;
      return env(t, 0.6, len, 1) * x * (0.6 + 0.4 * Math.sin(t * 2.3) * Math.sin(t * 5.1));
    });
  };
  // Small boat engine putter.
  const engine = (from: number, to: number, vel: number, pan = 0.4) => {
    const len = (to - from) / fps;
    put(amb, from, len, vel, pan, (t) => env(t, 1, len, 0.6) * Math.max(0, Math.sin(TAU * 7 * t)) ** 4 * Math.sin(TAU * 70 * t));
  };
  // Wok / grill sizzle.
  const sizzle = (frame: number, secs: number, vel: number, pan = 0.3) => {
    const b = new SVF();
    const lp = new SVF();
    put(amb, frame, secs, vel, pan, (t) => lp.step(b.step(noise(), 6000, 0.8).bp, 9000).lp * env(t, 0.05, secs, 0.8));
  };

  // ---------------------------------------------------------------- mix
  // Sidechain envelope: ducks under every kick.
  const duck = (depth: number) => {
    const e = new Float32Array(N).fill(1);
    for (const k of kicks) {
      const s0 = at(k.frame);
      const d = depth * k.depth;
      for (let i = 0; i < SR * 0.4 && s0 + i < N; i++) {
        const shape = Math.min(1, i / (SR * 0.004)) * Math.exp(-i / (SR * 0.11));
        e[s0 + i] *= 1 - d * shape;
      }
    }
    return e;
  };
  // Freeverb-style room on a bus.
  const reverb = (input: Bus, room = 0.86, damp = 0.25) => {
    const scale = SR / 44100;
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
    const allp = [556, 441, 341, 225];
    const out = bus();
    for (let c = 0; c < 2; c++) {
      const spread = c ? 23 : 0;
      const x = input[c];
      const y = out[c];
      for (const len0 of combs) {
        const len = Math.round((len0 + spread) * scale);
        const buf = new Float32Array(len);
        let p = 0;
        let store = 0;
        for (let i = 0; i < N; i++) {
          const o = buf[p];
          store = o * (1 - damp) + store * damp;
          buf[p] = x[i] * 0.03 + store * room;
          y[i] += o;
          p = (p + 1) % len;
        }
      }
      for (const len0 of allp) {
        const len = Math.round((len0 + spread) * scale);
        const buf = new Float32Array(len);
        let p = 0;
        for (let i = 0; i < N; i++) {
          const b = buf[p];
          const v = y[i];
          buf[p] = v + b * 0.5;
          y[i] = b - v;
          p = (p + 1) % len;
        }
      }
    }
    return out;
  };
  // Sum the buses (bass and music ducked under kicks), 32 Hz high-pass.
  const mixdown = ({ duckBass = 0.85, duckMusic = 0.4, wet = 0.9, ambience = 1 } = {}) => {
    const dB = duck(duckBass);
    const dM = duck(duckMusic);
    const w = reverb(send);
    const mix = bus();
    for (let c = 0; c < 2; c++) {
      const f = new SVF();
      for (let i = 0; i < N; i++) {
        const v = drums[c][i] + bass[c][i] * dB[i] + music[c][i] * dM[i] + fx[c][i] + amb[c][i] * ambience + w[c][i] * wet;
        mix[c][i] = f.step(v, 32, 0.707).hp;
      }
    }
    return mix;
  };
  // Tape stop: playback slows from 1× to 0 over [from, to) (frames).
  const tapeStop = (mix: Bus, from: number, to: number) => {
    const s0 = at(from);
    const L = at(to) - s0;
    for (let c = 0; c < 2; c++) {
      const src = mix[c].slice(s0, s0 + L);
      for (let i = 0; i < L; i++) {
        const pos = i - (i * i) / (2 * L);
        const k = Math.floor(pos);
        const frac = pos - k;
        const v = src[k] * (1 - frac) + (src[k + 1] ?? 0) * frac;
        mix[c][s0 + i] = v * (1 - i / L) ** 0.5 * Math.min(1, (L - i) / (SR * 0.006));
      }
    }
  };
  // True digital silence for planned gaps (3 ms fade in front). Frames.
  const silence = (mix: Bus, from: number, to: number) => {
    const a = at(from);
    const b = Math.min(N, at(to));
    const fade = Math.floor(SR * 0.003);
    for (let c = 0; c < 2; c++) {
      for (let i = Math.max(0, a - fade); i < a; i++) mix[c][i] *= (a - i) / fade;
      for (let i = a; i < b; i++) mix[c][i] = 0;
    }
  };
  const fadeOut = (mix: Bus, from: number) => {
    const a = at(from);
    for (let c = 0; c < 2; c++) for (let i = a; i < N; i++) mix[c][i] *= Math.cos((Math.PI / 2) * ((i - a) / (N - a)) ** 2);
  };
  // Soft knee above 0.8, then normalise to `peakDb` (default −1 dBFS). In place.
  const master = (mix: Bus, peakDb = -1) => {
    let raw = 0;
    for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) raw = Math.max(raw, Math.abs(mix[c][i]));
    if (raw === 0) return mix;
    const knee = 0.8;
    const soft = (x: number) => {
      const a = Math.abs(x);
      return a <= knee ? x : Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
    };
    let peak = 0;
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < N; i++) {
        mix[c][i] = soft((mix[c][i] / raw) * 1.15);
        peak = Math.max(peak, Math.abs(mix[c][i]));
      }
    }
    const g = 10 ** (peakDb / 20) / peak;
    for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) mix[c][i] *= g;
    return mix;
  };
  // 16-bit stereo WAV bytes.
  const toWav = (mix: Bus) => {
    const bytes = new Uint8Array(44 + N * 4);
    const v = new DataView(bytes.buffer);
    const str = (o: number, x: string) => [...x].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
    str(0, "RIFF");
    v.setUint32(4, 36 + N * 4, true);
    str(8, "WAVE");
    str(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, SR, true);
    v.setUint32(28, SR * 4, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    str(36, "data");
    v.setUint32(40, N * 4, true);
    for (let i = 0; i < N; i++) {
      v.setInt16(44 + i * 4, Math.max(-32768, Math.min(32767, Math.round(mix[0][i] * 32767))), true);
      v.setInt16(46 + i * 4, Math.max(-32768, Math.min(32767, Math.round(mix[1][i] * 32767))), true);
    }
    return bytes;
  };

  return {
    N, SR, fps, at, rnd, noise, hz, TAU, bus, put, env, attack, glide, SVF, Saw,
    buses: { drums, bass, music, fx, amb, send },
    cleanCuts,
    kick, heartbeat, clap, snare, hat, shaker, tick,
    pluck, marimba, piano, bell, pad, supersaw, lead, bassNote,
    typeClick, blip, whoosh, impact, crash, glitch, riser, swell, chime,
    waves, gull, horn, templeBell, crickets, murmur, engine, sizzle,
    duck, reverb, mixdown, tapeStop, silence, fadeOut, master, toWav,
  };
};

export type Synth = ReturnType<typeof createSynth>;

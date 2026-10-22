// Audio / picture self-check for a rendered film (or just its WAV). Claude
// cannot listen or watch, so this measures instead:
//  [1] clipping: sample peak, 4× oversampled true peak, samples at full scale
//  [2] silences (< −60 dBFS, ≥ 30 ms) — each must be a planned one if a plan is given
//  [3] loudness: whole film (K-weighted, ungated, LUFS-style) and per section
//  [4] cues: where the sound really starts and where the picture really jumps, vs. the cue frame
//  [5] blind attacks vs. the note grid (if gridFrames is given)
//  [6] blind picture jumps: each should have a sound within 1 frame
// Usage (ffmpeg + ffprobe on PATH):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-av.ts out/film.mp4 [check.json]
// check.json (all optional): { "fps": 30, "sampleRate": 48000, "gridFrames": 2,
//   "cues": [{ "f": 120, "what": "stop", "kind": "stop" }],   kind "stop" = sound must END there;
//            "picture": false = only check the sound (small or gradual changes are not picture jumps)
//   "silences": [{ "from": 120, "to": 156, "why": "freeze" }],
//   "sections": { "intro": [0, 216], "day": [216, 1656] } }
// Source: JIN-motion- scripts/check-intro-free.ts (generalised).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Cfg = {
  fps?: number;
  sampleRate?: number;
  gridFrames?: number;
  cues?: { f: number; what: string; kind?: string; picture?: boolean }[];
  silences?: { from: number; to: number; why: string }[];
  sections?: Record<string, [number, number]>;
};
const file = process.argv[2];
if (!file) throw new Error("usage: check-av.ts <film.mp4|.wav> [check.json]");
const cfg: Cfg = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], "utf8")) : {};
const FPS = cfg.fps ?? 30;
const SR = cfg.sampleRate ?? 48000;
const FRAME_MS = 1000 / FPS;
const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { maxBuffer: 1 << 30 });
const toF32 = (b: Buffer) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const fmt = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "-inf");
const pad = (s: string | number, n: number) => String(s).padStart(n);
let problems = 0;
const fail = (msg: string) => {
  problems++;
  console.log(`  ✗ ${msg}`);
};

const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-of", "json", file]).toString());
const vStream = probe.streams.find((s: { codec_type: string }) => s.codec_type === "video");
const aStream = probe.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
console.log(`\n${file}`);
if (vStream) console.log(`  video: ${vStream.codec_name} ${vStream.width}x${vStream.height} ${vStream.r_frame_rate} fps, ${vStream.nb_frames} frames`);
if (!aStream) throw new Error("no audio stream");
console.log(`  audio: ${aStream.codec_name} ${aStream.sample_rate} Hz ${aStream.channels} ch, ${Number(aStream.duration).toFixed(3)} s`);

const raw = toF32(run("ffmpeg", ["-v", "error", "-i", file, "-map", "0:a:0", "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "2", "-ar", String(SR), "-"]));
const n = raw.length / 2;
const L = new Float32Array(n);
const R = new Float32Array(n);
const mono = new Float32Array(n);
for (let i = 0; i < n; i++) {
  L[i] = raw[2 * i];
  R[i] = raw[2 * i + 1];
  mono[i] = (L[i] + R[i]) / 2;
}

// [1] clipping
console.log("\n[1] 削波 / Clipping");
let samplePeak = 0;
let atFull = 0;
for (const ch of [L, R]) for (let i = 0; i < n; i++) {
  const a = Math.abs(ch[i]);
  if (a > samplePeak) samplePeak = a;
  if (a >= 0.999) atFull++;
}
const TAPS = 32;
const phases = [0.25, 0.5, 0.75].map((p) => {
  const k = new Float32Array(TAPS);
  for (let j = 0; j < TAPS; j++) {
    const x = j - TAPS / 2 + 1 - p;
    k[j] = (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * (0.5 - 0.5 * Math.cos((2 * Math.PI * (j + 0.5)) / TAPS));
  }
  return k;
});
let truePeak = samplePeak;
for (const ch of [L, R]) for (let i = TAPS; i < n - TAPS; i += 1) for (const k of phases) {
  let s = 0;
  for (let j = 0; j < TAPS; j++) s += ch[i - TAPS / 2 + 1 + j] * k[j];
  if (Math.abs(s) > truePeak) truePeak = Math.abs(s);
}
console.log(`  sample peak ${fmt(db(samplePeak), 2)} dBFS · true peak (4×) ${fmt(db(truePeak), 2)} dBTP · samples at full scale: ${atFull}`);
if (atFull > 0) fail(`${atFull} samples at full scale`);
if (truePeak >= 1) fail("true peak reaches 0 dBTP");

const envelope = (x: Float32Array, hop: number, win: number) => {
  const out = new Float32Array(Math.max(0, Math.floor((n - win) / hop)));
  for (let k = 0; k < out.length; k++) {
    let s = 0;
    const o = k * hop;
    for (let j = 0; j < win; j++) s += x[o + j] * x[o + j];
    out[k] = 10 * Math.log10(s / win + 1e-14);
  }
  return out;
};
// attacks are measured on a 700 Hz high-passed copy (bass ripples look like onsets otherwise)
const hp = new Float32Array(n);
{
  const g = Math.tan((Math.PI * 700) / SR);
  const k = Math.SQRT2;
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < n; i++) {
    const a1 = 1 / (1 + g * (g + k));
    const v3 = mono[i] - ic2;
    const v1 = a1 * ic1 + g * a1 * v3;
    const v2 = ic2 + g * a1 * ic1 + g * g * a1 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    hp[i] = mono[i] - k * v1 - v2;
  }
}
const FINE_HOP = 24;
const fine = envelope(hp, FINE_HOP, 96);
const fineAt = (sec: number) => Math.round((sec * SR) / FINE_HOP);
const fineSec = (k: number) => (k * FINE_HOP) / SR;

// [2] silences
console.log("\n[2] 静音段 / Silences (RMS < −60 dBFS, ≥ 30 ms)");
const SIL_HOP = 240;
const silEnv = envelope(mono, SIL_HOP, 480);
const silences: { a: number; b: number }[] = [];
let startK = -1;
for (let k = 0; k <= silEnv.length; k++) {
  const quiet = k < silEnv.length && silEnv[k] < -60;
  if (quiet && startK < 0) startK = k;
  if (!quiet && startK >= 0) {
    const a = (startK * SIL_HOP) / SR;
    const b = ((k - 1) * SIL_HOP + 480) / SR;
    if (b - a >= 0.03) silences.push({ a, b });
    startK = -1;
  }
}
for (const s of silences) {
  const plan = cfg.silences?.find((p) => s.a < p.to / FPS + 0.05 && s.b > p.from / FPS - 0.05);
  console.log(`  ${fmt(s.a, 3)}–${fmt(s.b, 3)} s  (帧 ${fmt(s.a * FPS)}–${fmt(s.b * FPS)})  ${plan ? `计划内：${plan.why}` : cfg.silences ? "计划外！" : ""}`);
  if (cfg.silences && !plan) fail(`unplanned silence at ${fmt(s.a, 3)} s`);
}
for (const p of cfg.silences ?? []) if (!silences.some((s) => s.a < p.to / FPS && s.b > p.from / FPS)) fail(`planned silence ${p.from}–${p.to} not found`);

// [3] loudness (ITU-R BS.1770 K-weighting, 48 kHz coefficients, ungated)
console.log("\n[3] 响度 / Loudness (K-weighted, ungated)");
const kWeight = (x: Float32Array) => {
  let src = x;
  for (const [b0, b1, b2, a1, a2] of [
    [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
    [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
  ]) {
    const y = new Float32Array(src.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) {
      const v = b0 * src[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = src[i]; y2 = y1; y1 = v;
      y[i] = v;
    }
    src = y;
  }
  return src;
};
const kL = kWeight(L);
const kR = kWeight(R);
const lufs = (a: number, b: number) => {
  let s = 0;
  const i0 = Math.round((a / FPS) * SR);
  const i1 = Math.min(n, Math.round((b / FPS) * SR));
  for (let i = i0; i < i1; i++) s += kL[i] * kL[i] + kR[i] * kR[i];
  return -0.691 + 10 * Math.log10(s / Math.max(1, i1 - i0) + 1e-14);
};
console.log(`  whole film ${fmt(lufs(0, (n / SR) * FPS))} LUFS (web delivery is usually around −14)`);
for (const [name, [a, b]] of Object.entries(cfg.sections ?? {})) {
  const v = lufs(a, b);
  console.log(`  ${name.padEnd(10)} 帧 ${pad(a, 5)}–${pad(b, 5)}  ${pad(fmt(v), 6)} LUFS  ${"█".repeat(Math.max(0, Math.round((v + 45) / 1.5)))}`);
}

// onset strength: next 2 ms vs. previous 15 ms (high-passed), every 0.25 ms
const cum = new Float64Array(n + 1);
for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + hp[i] * hp[i];
const AFTER = 96;
const BEFORE = 720;
const ratioAt = (i: number) => {
  if (i < 1 || i + AFTER > n) return -Infinity;
  const a = (cum[i + AFTER] - cum[i]) / AFTER;
  const b0 = Math.max(0, i - BEFORE);
  return 10 * Math.log10((a + 1e-12) / ((cum[i] - cum[b0]) / (i - b0) + 1e-12));
};
const STEP = 12;
let lastStrength = NaN;
const cueOnset = (f: number, kind?: string) => {
  const k0 = fineAt(f / FPS);
  if (kind === "stop") {
    lastStrength = NaN;
    for (let k = k0 - 80; k < k0 + 80; k++) if (fine[k] < -100) return fineSec(k) + AFTER / SR - 0.0005;
    return NaN;
  }
  const c = Math.round((f / FPS) * SR);
  let best = -Infinity;
  let bestI = -1;
  for (let i = c - 0.04 * SR; i <= c + 0.04 * SR; i += STEP) {
    const r = ratioAt(i);
    if (r > best) {
      best = r;
      bestI = i;
    }
  }
  lastStrength = best;
  return best >= 6 ? bestI / SR : NaN;
};

// picture: mean absolute difference of 160×90 grey frames
let diff: Float32Array | null = null;
if (vStream) {
  const W = 160;
  const H = 90;
  const frames = run("ffmpeg", ["-v", "error", "-i", file, "-map", "0:v:0", "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"]);
  const count = Math.floor(frames.length / (W * H));
  diff = new Float32Array(count);
  for (let f = 1; f < count; f++) {
    let s = 0;
    for (let j = 0; j < W * H; j++) s += Math.abs(frames[f * W * H + j] - frames[(f - 1) * W * H + j]);
    diff[f] = s / (W * H);
  }
}
const visualOnset = (f: number) => {
  if (!diff || f === 0) return f === 0 ? 0 : NaN;
  let mx = 0;
  for (let k = f - 3; k <= f + 3; k++) if (k > 0 && k < diff.length) mx = Math.max(mx, diff[k]);
  for (let k = Math.max(1, f - 3); k <= f + 3 && k < diff.length; k++) if (diff[k] >= Math.max(0.25, mx * 0.5) && diff[k] >= 2 * diff[k - 1]) return k;
  return NaN;
};

// [4] cues
if (cfg.cues?.length) {
  console.log("\n[4] 重点动作 / Cues (+ = later than the cue frame)");
  for (const c of cfg.cues) {
    const ta = cueOnset(c.f, c.kind);
    const errA = ta * FPS - c.f;
    const vf = visualOnset(c.f);
    const errV = vf - c.f;
    const a = Number.isFinite(errA) ? `${errA >= 0 ? "+" : ""}${fmt(errA, 2)} 帧` : `未检出(${fmt(lastStrength)}dB)`;
    const v = !diff || c.picture === false ? "-" : Number.isFinite(errV) ? `${errV >= 0 ? "+" : ""}${errV} 帧` : "未检出";
    console.log(`  ${pad(c.f, 5)}  声音 ${pad(a, 13)}  画面 ${pad(v, 8)}   ${c.what}`);
    if (!Number.isFinite(errA) || Math.abs(errA) > 1) fail(`sound for "${c.what}" (frame ${c.f}): ${a}`);
    if (diff && c.picture !== false && (!Number.isFinite(errV) || Math.abs(errV) > 1)) fail(`picture for "${c.what}" (frame ${c.f}): ${v}`);
  }
}

// [5] blind attacks vs. grid
const onsets: number[] = [];
{
  const strength: number[] = [];
  for (let i = 0; i < n; i += STEP) strength.push(ratioAt(i));
  const near = Math.round((0.03 * SR) / STEP);
  for (let k = 1; k < strength.length - 1; k++) {
    const v = strength[k];
    if (v < 10 || fine[Math.min(fine.length - 1, Math.floor((k * STEP + AFTER) / FINE_HOP))] < -50) continue;
    let isMax = true;
    for (let j = Math.max(0, k - near); j <= Math.min(strength.length - 1, k + near); j++) if (strength[j] > v || (strength[j] === v && j < k)) isMax = false;
    if (isMax) onsets.push((k * STEP) / SR);
  }
}
if (cfg.gridFrames) {
  console.log(`\n[5] 盲测起音点 / Attacks vs. the ${cfg.gridFrames}-frame grid`);
  let off = 0;
  for (const t of onsets) {
    const err = (t - (Math.round((t * FPS) / cfg.gridFrames) * cfg.gridFrames) / FPS) * 1000;
    if (Math.abs(err) > FRAME_MS) {
      off++;
      console.log(`  off grid: ${fmt(t, 3)} s (帧 ${fmt(t * FPS, 2)})  ${fmt(err)} ms`);
    }
  }
  console.log(`  ${onsets.length} attacks, ${off} more than 1 frame off the grid`);
  if (off) fail(`${off} attacks off the grid`);
}

// [6] picture jumps vs. sound
if (diff) {
  console.log("\n[6] 盲测画面跳变 / Picture jumps (Δ ≥ 6, ≥ 2.5× the frame before) vs. nearest attack");
  let lonely = 0;
  let jumps = 0;
  for (let f = 1; f < diff.length; f++) {
    if (diff[f] < 6 || diff[f] < 2.5 * diff[f - 1]) continue;
    jumps++;
    let best = Infinity;
    for (const o of onsets) best = Math.min(best, Math.abs(o - f / FPS));
    const near = cueOnset(f, "appear");
    if (Number.isFinite(near)) best = Math.min(best, Math.abs(near - f / FPS));
    const silentCut = cfg.silences?.some((s) => s.from === f) ?? false;
    const ok = best * FPS <= 1 || silentCut;
    if (!ok) lonely++;
    console.log(`  帧 ${pad(f, 5)}  Δ${pad(fmt(diff[f]), 5)}  最近起音 ${silentCut ? "（静音切点）" : `${fmt(best * FPS, 2)} 帧`} ${ok ? "" : "✗"}`);
  }
  console.log(`  ${jumps} jumps, ${lonely} without a sound`);
}

console.log(problems ? `\n${problems} 个问题 / problems.` : "\n全部通过 / all passed.");
process.exitCode = problems ? 1 : 0;

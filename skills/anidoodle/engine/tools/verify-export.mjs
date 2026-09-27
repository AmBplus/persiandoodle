// VERIFY-EXPORT. The gate proves the SOURCE draws the same frame every time; this proves the
// FILE that came out of the encoder is that film. It never renders the film again except where
// a check says so, it never writes near out/, and every check beyond the container facts is
// opt-in, because the right bar depends on the piece: a transparent sticker has no background
// colour to assert, and a one-shot film has no seam to hide.
//
//   node tools/verify-export.mjs <film> [--file out/x.mp4] [--adapter html-player]
//     [--width W]               expected pixel width (default: the film's own; height follows the aspect)
//     [--first-frame #rrggbb]   the average colour the decoded first frame must have (tol: --tol N, default 8)
//     [--loop]                  the last-to-first seam must read like any other step of the loop
//     [--fidelity-psnr N]       decoded frame 0 must sit within N dB of the source frame (renders it once)
//
// Always checked: the file decodes, its pixel size, its exact frame count, and its duration
// against the film's meta. Everything else is asked for explicitly.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultOutput } from "./names.mjs";

const VAL = new Set(["file", "adapter", "width", "first-frame", "tol", "fidelity-psnr", "scale"]);
const pos = [], opt = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith("--")) opt[a.slice(2)] = VAL.has(a.slice(2)) ? process.argv[++i] : true; else pos.push(a); }
const film = pos[0] ?? "fixtures";
const adapterName = opt.adapter ?? "html-player";
const SCALE = +(opt.scale ?? 1);
const TMP = resolve(".tmp/verify"); mkdirSync(TMP, { recursive: true });

let fails = 0, checks = 0;
const say = (ok, label, detail = "") => { checks++; if (!ok) fails++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? "   " + detail : ""}`); };
const note = (label, detail = "") => console.log(`  ----  ${label}${detail ? "   " + detail : ""}`);
const head = (n, t) => console.log(`\n${n}. ${t}\n${"-".repeat(58)}`);
const die = (m) => { console.error(`verify-export: ${m}`); process.exit(2); };

const ffprobe = (args) => { const r = spawnSync("ffprobe", ["-v", "error", ...args], { encoding: "utf8", maxBuffer: 1 << 24 }); if (r.status !== 0) die(`ffprobe: ${r.stderr.trim()}`); return r.stdout.trim(); };
// decode one frame to grayscale pixels at `w` px wide. H is measured from the file itself.
const grab = (file, n, w, h) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `select=eq(n\\,${n}),scale=${w}:${h}`, "-vsync", "0", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 26 });
  if (r.status !== 0) die(`ffmpeg could not decode frame ${n}: ${r.stderr.toString().trim()}`);
  if (r.stdout.length !== w * h) die(`frame ${n} decoded to ${r.stdout.length} bytes, expected ${w * h}`);
  return r.stdout;
};
const changed = (a, b, threshold = 4) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > threshold) n++; return n / a.length; };

// ---------------------------------------------------------------- the film's own numbers
const mod = await import(`./adapters/${adapterName}.mjs`);
const p = mod.probe();
if (!p.ok) die(`adapter "${adapterName}": ${p.why}`);
const s = await mod.open(film, { scale: SCALE, workers: 1 });
const meta = await s.info();
const N = meta.durationFrames, FW = Math.round(meta.W * SCALE), FH = Math.round(meta.H * SCALE);
const file = resolve(opt.file ?? defaultOutput(film));
console.log(`VERIFY-EXPORT   film "${meta.title}"   file ${file}`);
if (!existsSync(file)) die(`${file} not found`);

// ---------------------------------------------------------------- 1. the container
head(1, "CONTAINER  the file is the film's size, length and duration");
const stream = ffprobe(["-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt", "-of", "csv=p=0", file]).split("\n")[0].split(",");
const [codec, sw, sh] = [stream[0], Number(stream[1]), Number(stream[2])];
const wantW = opt.width ? Number(opt.width) : FW, wantH = Math.round((wantW * FH) / FW / 2) * 2; // encoders want even heights
say(sw === wantW && Math.abs(sh - wantH) <= 2, `pixel size ${sw}x${sh}`, `expected ${wantW}x${wantH} (${codec}${stream[3] ? ", " + stream[3] : ""})`);
const counted = Number(ffprobe(["-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", file]).split("\n")[0]);
say(counted === N, `decoded frame count is ${counted}`, `the film is ${N}`);
const dur = Number(ffprobe(["-show_entries", "format=duration", "-of", "csv=p=0", file]));
const wantDur = N / meta.fps, slack = 1 / meta.fps + 0.05;
say(Math.abs(dur - wantDur) <= slack, `duration ${dur.toFixed(3)} s`, `expected ${wantDur.toFixed(3)} s +/- ${slack.toFixed(3)} (container rounding)`);

// ---------------------------------------------------------------- 2. the first frame's colour
head(2, "FIRST FRAME  what the audience's first instant actually looks like");
const avg = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", "select=eq(n\\,0),scale=1:1", "-vsync", "0", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 16 });
if (avg.status !== 0 || avg.stdout.length < 3) die(`ffmpeg could not average frame 0: ${avg.stderr.toString().trim()}`);
const hex = `#${[...avg.stdout.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
if (opt["first-frame"]) {
  const want = opt["first-frame"].replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(want)) die(`--first-frame wants #rrggbb, got '${opt["first-frame"]}'`);
  const tol = +(opt.tol ?? 8), wr = parseInt(want.slice(0, 2), 16), wg = parseInt(want.slice(2, 4), 16), wb = parseInt(want.slice(4, 6), 16);
  const off = [Math.abs(avg.stdout[0] - wr), Math.abs(avg.stdout[1] - wg), Math.abs(avg.stdout[2] - wb)];
  say(off.every((v) => v <= tol), `decoded first frame averages ${hex}`, `expected ${opt["first-frame"]} +/- ${tol} per channel (off by ${off.join("/")})`);
} else note("no --first-frame given", `decoded first frame averages ${hex}; nothing asserted (a transparent or non-uniform first frame has no single right colour)`);

// ---------------------------------------------------------------- 3. fidelity to the source, if asked
if (opt["fidelity-psnr"]) {
  head(3, "FIDELITY  the decoded frame is the frame the source drew");
  const src = resolve(TMP, "source-0.png"), dec = resolve(TMP, "decoded-0.png");
  writeFileSync(src, (await s.frame(0, 0)).png);
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", "select=eq(n\\,0)", "-vsync", "0", "-frames:v", "1", "-y", dec], { encoding: "utf8" });
  if (r.status !== 0) die(`ffmpeg could not lift frame 0: ${r.stderr.trim()}`);
  const ps = spawnSync("ffmpeg", ["-v", "error", "-i", dec, "-i", src, "-lavfi", "psnr=stats_file=-", "-f", "null", "-"], { encoding: "utf8" });
  const m = (ps.stdout + ps.stderr).match(/psnr_avg:([0-9.]+|inf)/), v = m ? (m[1] === "inf" ? Infinity : Number(m[1])) : NaN;
  say(v >= +opt["fidelity-psnr"], `decoded frame 0 vs source frame 0: ${v === Infinity ? "inf" : v.toFixed(2)} dB`, `bar ${opt["fidelity-psnr"]} dB`);
}

// ---------------------------------------------------------------- 4. the seam, if it loops
if (opt.loop) {
  head(4, "LOOP SEAM  the join reads like any other step of the loop");
  if (N < 4) note("film too short to judge a seam", `${N} frames`);
  else {
    const W = 270, H = Math.max(2, Math.round((W * wantH) / wantW));
    const first = grab(file, 0, W, H), last = grab(file, N - 1, W, H), seam = changed(last, first);
    const samples = Math.min(11, N - 1), deltas = [];
    for (let i = 0; i < samples; i++) { const f = 1 + Math.round((i * (N - 2)) / Math.max(1, samples - 1)); if (f >= N) continue; deltas.push(changed(grab(file, f - 1, W, H), grab(file, f, W, H))); }
    deltas.sort((a, b) => a - b);
    const med = deltas[deltas.length >> 1] ?? 0, ceiling = Math.max(2 * med, 0.005);
    say(seam <= ceiling, `last-to-first step changes ${(seam * 100).toFixed(2)}% of the frame`, `mid-loop median ${(med * 100).toFixed(2)}%, ceiling ${(ceiling * 100).toFixed(2)}% (2x median, 0.5% floor)`);
  }
}

await s.close();
console.log(`\n${"=".repeat(58)}`);
console.log(fails ? `VERIFY-EXPORT: FAIL   ${fails} of ${checks} checks failed` : `VERIFY-EXPORT: PASS   ${checks}/${checks} checks`);
process.exit(fails ? 1 : 0);

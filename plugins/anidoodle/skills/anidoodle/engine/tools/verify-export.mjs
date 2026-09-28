// VERIFY-EXPORT. The gate proves the SOURCE draws the same frame every time; this proves the
// FILE that came out of the encoder is that film. It never renders the film again except where
// a check says so, it never writes near out/, and every check beyond the container facts is
// opt-in, because the right bar depends on the piece: a transparent sticker has no background
// colour to assert, and a one-shot film has no seam to hide.
//
//   node tools/verify-export.mjs <film> [--file out/x.mp4] [--adapter html-player]
//   node tools/verify-export.mjs out/<film>.mp4 [...]   the file itself: the film is its name (out/<film>[.<from>-<to>].<ext>)
//     [--width W]               expected pixel width of a .gif/.webm/.apng made with render --width
//                               (default: the film's own; height follows the aspect). Not for .mp4:
//                               render always writes the MP4 at the film's size (x --scale), so
//                               --width on an MP4 is refused rather than silently ignored
//     [--first-frame #rrggbb]   the average colour the decoded first frame must have (tol: --tol N, default 8)
//     [--loop]                  the last-to-first seam must read like any other step of the loop
//     [--fidelity-psnr N]       a decoded frame must sit within N dB of the source frame (renders it once)
//     [--frame N]               which frame --fidelity-psnr compares (default 0)
//     [--delivery]              this file ships: a near-blank frame 0 (the platform thumbnail) FAILS
//                               instead of warning; fix with render --poster-frame N
//
// Always checked: the file decodes, its pixel size, its exact frame count, its duration against
// the film's meta, and for an MP4 the score: an audio stream exactly when the film has a score,
// as long as the picture, and not silent. Everything else is asked for explicitly.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { defaultOutput, requireFilm } from "./names.mjs";
import { firstFrameBlank } from "./thumb.mjs";

const VAL = new Set(["file", "adapter", "width", "first-frame", "tol", "fidelity-psnr", "scale", "frame"]);
const pos = [], opt = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith("--")) opt[a.slice(2)] = VAL.has(a.slice(2)) ? process.argv[++i] : true; else pos.push(a); }
// a file path names its film: out/<film>.mp4 (or a range render's out/<film>.<from>-<to>.mp4)
const USAGE = "node tools/verify-export.mjs <film> [--file out/<film>.mp4] [--first-frame #rrggbb] [--loop] [--fidelity-psnr N] [--frame N] [--delivery]\n       node tools/verify-export.mjs out/<film>.mp4 [...]";
if (pos[0] && /\.(mp4|gif|webm|apng|png)$/i.test(pos[0])) {
  if (opt.file) { console.error(`verify-export: give the file once: '${pos[0]}' or --file ${opt.file}`); process.exit(2); }
  if (!existsSync(pos[0])) { console.error(`verify-export: no file '${pos[0]}'`); process.exit(2); }
  opt.file = pos[0]; pos[0] = basename(pos[0]).split(".")[0];
}
const film = requireFilm(pos[0], "verify-export", USAGE);
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
const isMp4 = /\.(mp4|m4v|mov)$/i.test(file);
if (opt.width && isMp4) die(`--width does not apply to an MP4: render writes it at the film's own size (x --scale); use --scale to check a scaled render`);
const FRAME = opt.frame === undefined ? 0 : Number(opt.frame);
if (!Number.isInteger(FRAME) || FRAME < 0 || FRAME >= N) die(`--frame wants a frame number in [0, ${N - 1}], got '${opt.frame}'`);

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

// ---------------------------------------------------------------- 1b. the score, in an MP4
if (isMp4) {
  head("1b", "SOUND  the score is in the file, as long as the picture, and audible");
  const a = ffprobe(["-select_streams", "a", "-show_entries", "stream=codec_name,duration,sample_rate,channels", "-of", "csv=p=0", file]).split("\n").filter(Boolean);
  const hasAudio = meta.hasAudio ?? Boolean(await s.audio?.(48000)); // older pages / other adapters: ask the score itself
  if (!hasAudio) say(a.length === 0, "no audio stream (the film has no score)", a.length ? `found ${a.length}: ${a.join(" | ")}` : "");
  else if (!a.length) say(false, "an audio stream (the film has a score)", "none found: was it a range render?");
  else {
    const [acodec, rate, ch, adur] = a[0].split(","), ad = Number(adur);
    say(a.length === 1, `one audio stream (${acodec}, ${rate} Hz, ${ch} ch)`, a.length > 1 ? `found ${a.length}` : "");
    say(Math.abs(ad - wantDur) <= slack + 0.05, `audio duration ${ad.toFixed(3)} s`, `picture is ${wantDur.toFixed(3)} s +/- ${(slack + 0.05).toFixed(3)} (AAC priming)`);
    const vd = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
    const mx = Number(((vd.stdout + vd.stderr).match(/max_volume:\s*(-?[0-9.]+|-inf) dB/) ?? [])[1]);
    say(Number.isFinite(mx) && mx > -40 && mx <= 0, `audio peak ${Number.isFinite(mx) ? mx.toFixed(1) : "-inf"} dBFS`, "audible (> -40 dBFS) and not clipped past 0");
  }
}

// ---------------------------------------------------------------- 2. the first frame's colour
head(2, "FIRST FRAME  what the audience's first instant actually looks like");
const thumb = firstFrameBlank(file);
if (thumb.unknown) note("thumbnail check skipped", thumb.detail);
else if (opt.delivery) say(!thumb.blank, "frame 0 (the platform thumbnail) is legible, not near-blank", thumb.detail + (thumb.blank ? "  -> render --poster-frame N" : ""));
else if (thumb.blank) note("WARNING frame 0 is near-blank", `${thumb.detail}; platforms show frame 0 as the thumbnail: render --poster-frame N (pass --delivery to fail on this)`);
else note("frame 0 is not blank", thumb.detail);
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
  const src = resolve(TMP, `source-${FRAME}.png`), dec = resolve(TMP, `decoded-${FRAME}.png`);
  writeFileSync(src, (await s.frame(FRAME, 0)).png);
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `select=eq(n\\,${FRAME})`, "-vsync", "0", "-frames:v", "1", "-y", dec], { encoding: "utf8" });
  if (r.status !== 0) die(`ffmpeg could not lift frame ${FRAME}: ${r.stderr.trim()}`);
  const ps = spawnSync("ffmpeg", ["-v", "error", "-i", dec, "-i", src, "-lavfi", "psnr=stats_file=-", "-f", "null", "-"], { encoding: "utf8" });
  const m = (ps.stdout + ps.stderr).match(/psnr_avg:([0-9.]+|inf)/), v = m ? (m[1] === "inf" ? Infinity : Number(m[1])) : NaN;
  say(v >= +opt["fidelity-psnr"], `decoded frame ${FRAME} vs source frame ${FRAME}: ${v === Infinity ? "inf" : v.toFixed(2)} dB`, `bar ${opt["fidelity-psnr"]} dB`);
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

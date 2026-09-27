// node tools/render.mjs [film] [--scale 1] [--workers 4] [--out out/x.mp4|.gif|.webm|.apng] [--gif-fps 15] [--width 640]
//                       [--blur N] [--from F] [--to F]
// --blur N  motion blur (N an integer >= 1): every output frame is the average of N subframes over
//           a one-frame shutter, integrated in linear light and weighted by alpha inside the page.
//           Fast pans and dolly moves stop juddering; held frames come out unchanged because their
//           subframes are identical. Stepped art (meta.step > 1 or onTwos) is NOT blurred: the
//           shutter would straddle two drawings. Costs N times the draw time. --blur 1 is untouched.
// --from/--to  render only frames [from, to): for checking a passage, not for shipping. A range
//           render is silent (the score would not line up), says so, and by default writes
//           out/<film>.<from>-<to>.<ext> so it can never overwrite the finished film.
// Auto-detects a backend, renders every frame through it, encodes with ffmpeg, then VERIFIES.
//   .mp4   the film, with its score
//   .gif   loops and README heroes: silent, loops forever, ONE palette built from the whole piece
//          so a wash does not band differently from frame to frame
//   .webm  VP9 with its alpha kept: stickers and overlays. Leave the background unpainted and
//          whatever sits behind the page shows through
//   .apng  animated PNG, alpha kept, loops forever, plays in every browser
// --width only applies to the silent formats; the MP4 is always the film's own size.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import { buildPage } from "./build-page.mjs";
import { detect } from "./detect.mjs";
import * as playwright from "./adapters/playwright.mjs";
import { defaultOutput } from "./names.mjs";
import { float32Wav } from "./audio.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const film = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "fixtures";
const BLUR = Number(arg("blur", 1));
if (!Number.isInteger(BLUR) || BLUR < 1) { console.error(`--blur wants a whole number of subframes >= 1, got '${arg("blur")}'`); process.exit(2); }
const scale = Number(arg("scale", 1)), fmt = (arg("out", "").match(/\.(gif|webm|apng)$/i)?.[1] ?? "mp4").toLowerCase(), workers = Number(arg("workers", Math.max(1, Math.min(4, Math.floor(cpus().length / 2)))));
const RANGE_ASKED = process.argv.includes("--from") || process.argv.includes("--to");

const env = detect();
console.log("backends found:"); for (const [k, v] of Object.entries(env.report)) console.log(`  ${k.padEnd(11)} ${v}`);
if (!env.chosen) { console.error("\nno usable render backend. The HTML player still works: node tools/build-page.mjs"); process.exit(2); }
console.log(`using: ${env.chosen}\n`);

const page = await buildPage({ entry: `src/hosts/page-${film}.ts`, out: resolve(`dist/${film}.html`), title: film });
console.log(`page: ${page.out} (${(page.bytes / 1024).toFixed(0)} KB)`);
const t0 = Date.now(), session = await playwright.open(env, page.out, { scale, workers }), meta = await session.info(), N = meta.durationFrames;
const FROM = Math.max(0, Number(arg("from", 0))), TO = Math.min(N, Number(arg("to", N)));
if (!Number.isInteger(FROM) || !Number.isInteger(TO) || TO <= FROM) { console.error(`bad range: [${FROM}, ${TO}) of ${N}`); process.exit(2); }
const ranged = FROM !== 0 || TO !== N;
// a passage never lands on the finished film's path: default to out/<film>.<from>-<to>.<ext>, and refuse an explicit --out that IS the film
const full = resolve(defaultOutput(film).replace(/\.mp4$/, `.${fmt}`));
const out = resolve(arg("out", ranged ? `out/${film}.${FROM}-${TO}.${fmt}` : full));
if (ranged && out === resolve(defaultOutput(film))) { console.error(`refusing to write a range render over the finished film ${out}; pick another --out or drop --from/--to`); process.exit(2); }
if (RANGE_ASKED && !ranged) console.log("range covers the whole film: rendering it complete, with its score");
console.log(`film: "${meta.title}" ${meta.W}x${meta.H} @ ${meta.fps} fps, ${N} frames, ${meta.bpm} bpm, scale ${scale}, ${session.workers} page(s)`);
if (BLUR > 1) console.log(`motion blur: ${BLUR} subframes per frame, one-frame shutter, linear light`);
if (ranged) console.log(`range render: frames [${FROM}, ${TO}) of ${N}, silent by design`);

// audio: pure JS in the page -> WAV here (skipped for a range render: the score would not line up)
mkdirSync(resolve(".tmp"), { recursive: true }); const wav = resolve(`.tmp/${film}.wav`), a = ranged ? null : await session.audio(48000);
if (a) writeFileSync(wav, float32Wav(a));

mkdirSync(join(out, ".."), { recursive: true });
const input = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(meta.fps), "-c:v", "png", "-i", "-"];
const gifFps = Math.min(meta.fps, Number(arg("gif-fps", meta.fps))), width = Number(arg("width", Math.round(meta.W * scale)));
const size = `scale=${width}:-2:flags=lanczos`;
const encode = {
  gif: [...input, "-vf", `fps=${gifFps},${size},split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a`, "-loop", "0", out],
  webm: [...input, "-vf", size, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-an", out],
  apng: [...input, "-vf", size, "-f", "apng", "-plays", "0", out],
  mp4: [...input, ...(a ? ["-i", wav] : []), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "medium", ...(a ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []), "-movflags", "+faststart", out],
}[fmt];
const ff = spawn(env.ffmpeg.bin, encode, { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));

// frames render in parallel across pages, and are fed to ffmpeg strictly in order
const cost = [], pending = new Map(); let next, write;
const pump = async () => { while (pending.has(write)) { const b = pending.get(write); pending.delete(write); if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once("drain", r)); write++; } };
next = FROM; write = FROM;
await Promise.all(Array.from({ length: session.workers }, async (_, w) => { while (next < TO) { const n = next++; while (n - write > session.workers * 3) await new Promise((r) => setTimeout(r, 5)); const f = BLUR > 1 ? await session.blur(n, BLUR, w) : await session.frame(n, w); cost.push({ n, shot: f.shot, draw: f.drawMs, enc: f.encodeMs, rt: f.roundTripMs }); pending.set(n, f.png); await pump(); } }));
await pump(); ff.stdin.end(); await done;
const wall = (Date.now() - t0) / 1000;

// ---- frame cost
const stat = (xs) => { const s = [...xs].sort((a, b) => a - b); return { med: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1] }; };
console.log("\nframe cost (ms), draw = art core only, png = canvas PNG encode in page:");
for (const id of [...new Set(cost.map((c) => c.shot))]) { const c = cost.filter((x) => x.shot === id), d = stat(c.map((x) => x.draw)), e = stat(c.map((x) => x.enc)); console.log(`  ${id.padEnd(12)} draw median ${d.med.toFixed(0)}  p95 ${d.p95.toFixed(0)}  max ${d.max.toFixed(0)}   | png median ${e.med.toFixed(0)}   (${c.length} frames)`); }
const slow = [...cost].sort((a, b) => b.draw - a.draw).slice(0, 3).map((c) => `#${c.n} ${c.shot} ${c.draw.toFixed(0)}ms`).join(", ");
console.log(`  slowest: ${slow}\n  budget: 150 ms draw per frame -> ${cost.every((c) => c.draw <= 150) ? "PASS" : "OVER on " + cost.filter((c) => c.draw > 150).length + " frames"}`);
console.log(`  wall clock: ${wall.toFixed(1)} s for ${TO - FROM} frames = ${((TO - FROM) / wall).toFixed(1)} fps end to end (build + launch + render + encode)`);

// ---- verify: same frame, different order, different page. Standard = visually identical; hash equality is the cheap first test.
const probe = [...new Set([0, ...meta.shots.flatMap((s) => [s.start, s.end - 1]), ...((k) => Array.from({ length: k }, (_, i) => Math.round(i * (N - 1) / (k - 1 || 1))))(Math.min(6, N)), N - 1])].filter((n) => n >= FROM && n < TO).sort((a, b) => a - b), fwd = [], rev = [];
if (!probe.length) probe.push(FROM);
const hashOf = (n, w) => (BLUR > 1 ? session.blurHash(n, BLUR, w) : session.hash(n, w)); // probe what was WRITTEN: the blurred frame when --blur
for (const n of probe) fwd.push(await hashOf(n, 0)); for (const n of [...probe].reverse()) rev.unshift(await hashOf(n, session.workers - 1));
const same = probe.filter((_, i) => fwd[i] === rev[i]).length;
console.log(`\ndeterminism: ${same}/${probe.length} probe frames${BLUR > 1 ? ` (blurred, ${BLUR} subframes)` : ""} hash-identical (forward on page 0 vs reversed on page ${session.workers - 1})${same === probe.length ? "" : "  -> fall back to PSNR > 45 dB in the Phase 2 gate"}`);
await session.close();
const pr = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,nb_frames,duration", "-of", "csv=p=0", out]).toString().trim().split("\n");
console.log(`\noutput: ${out}`); pr.forEach((l) => console.log(`  ${l}`));

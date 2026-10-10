#!/usr/bin/env node
// Render EVERY catalog entry that has no local media yet:
//   · video entries  →  library/media/entries/<source>/<name>/{preview.mp4,poster.webp,thumb.webp,meta.json,music.m4a}
//   · audio entries  →  library/media/entries/<source>/<name>/{sfx.m4a,meta.json}   (procedural SFX, no video)
//   · native entries →  library/media/entries/native/<name>/{music.m4a,meta.json}   (procedural music loops)
// Scenes come from library/typography/shots.js (the same module the page uses), so renders
// stay honest and reproducible. Resume-safe: entries with meta.json are skipped.
import { readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, "../../../..");
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const outRoot = resolve(arg("out", join(root, "library/media/entries")));
const only = (arg("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const workers = arg("workers", "3");
const catalogPath = arg("catalog") ? resolve(arg("catalog")) : join(root, "library/data/catalog.json");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const { specFor } = await import(join(root, "library/typography/shots.js"));

const slugOf = (id) => String(id).replace(/\.(mp3|wav|m4a|json|md|tsx?)$/i, "").replace(/^native\/assets\/audio\//, "native/").replace(/\/+/g, "/");
const mediaDir = (spec) => join(outRoot, slugOf(spec.id));
const engineDir = resolve(here, "..");
const run = (args) => { const r = spawnSync(process.execPath, args, { stdio: "inherit", cwd: engineDir }); if (r.error || r.status !== 0) throw new Error(`render failed: ${args.join(" ")}`); };
const ffmpeg = (args) => { const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args]); if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`); };

const hostPath = join(engineDir, "src/hosts/page-shotVariant.ts"), filmPath = join(engineDir, "src/canvas-core/shotVariant.ts");
const hostSource = `import { shotVariant } from "../canvas-core/shotVariant";\nimport { mountFilm } from "./page";\nmountFilm(shotVariant);\n`;

const specs = catalog.entries.map(specFor).filter((s) => s.archetype !== "skip").filter((s) => !only.length || only.includes(s.id));
const videos = specs.filter((s) => s.archetype !== "audio");
const sounds = specs.filter((s) => s.archetype === "audio");
console.log(`entries: ${specs.length} → ${videos.length} video + ${sounds.length} sound`);

// ------------------------------------------------ video renders
let done = 0, failed = [];
for (const spec of videos) {
  const out = mediaDir(spec);
  if (existsSync(join(out, "meta.json"))) { done++; continue; }
  await mkdir(out, { recursive: true });
  await writeFile(hostPath, hostSource, "utf8");
  await writeFile(filmPath, `import { makeShotFilm } from "./shotLibrary";\nexport const shotVariant = makeShotFilm(${JSON.stringify(spec)});\n`, "utf8");
  try {
    const frames = spec.frames, mid = Math.round(frames * 0.82);
    const stillDir = join(out, "stills");
    run(["tools/still.mjs", "shotVariant", "--frames", `0,${mid}`, "--out", `${stillDir}/`]);
    const preview = join(out, "preview.mp4");
    run(["tools/render.mjs", "shotVariant", "--out", preview, "--poster-frame", String(mid), "--workers", workers]);
    const compressed = join(out, "preview.c.mp4");
    ffmpeg(["-i", preview, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-map_metadata", "-1", compressed]);
    await rm(preview, { force: true }); await rename(compressed, preview);
    ffmpeg(["-i", preview, "-vn", "-c:a", "aac", "-b:a", "128k", join(out, "music.m4a")]);
    for (const [from, to] of [[`shotVariant-0.png`, "thumb.webp"], [`shotVariant-${mid}.png`, "poster.webp"]]) {
      ffmpeg(["-i", join(stillDir, from), "-c:v", "libwebp", "-q:v", "80", join(out, to)]);
    }
    await rm(stillDir, { recursive: true, force: true });
    await writeFile(join(out, "meta.json"), JSON.stringify({ modelId: spec.id, archetype: spec.archetype, titleFa: spec.titleFa, line1: spec.line1, seed: spec.seed, video: "preview.mp4", poster: "poster.webp", thumb: "thumb.webp", audio: "music.m4a" }, null, 2) + "\n");
    done++;
    if (done % 10 === 0) console.log(`✓ ${done}/${videos.length} videos`);
  } catch (e) {
    failed.push(spec.id + " → " + e.message.split("\n")[0]);
    console.error(`✗ ${spec.id}: ${e.message.split("\n")[0]}`);
    if (failed.length > 12) { console.error("too many failures, aborting"); break; }
  } finally {
    await rm(hostPath, { force: true }); await rm(filmPath, { force: true });
  }
}

// ------------------------------------------------ procedural SFX + native music
if (sounds.length) {
  const { build } = await import("esbuild");
  const bundle = await build({ entryPoints: [join(engineDir, "src/canvas-core/music/index.ts")], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
  const M = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
  const SR = 48000;
  const sfxPlan = (name) => {
    const n = name.toLowerCase();
    const pick = (kind, variant, seedOff = 0) => ({ kind, variant, seedOff });
    if (n.includes("whoosh") || n.includes("transition")) return pick("whoosh", n.includes("deep") ? "deep" : n.includes("fast") ? "fast" : n.includes("air") ? "air" : "soft");
    if (n.includes("riser")) return pick("riser", n.includes("tonal") ? "tonal" : n.includes("air") ? "air" : "soft");
    if (n.includes("impact") || n.includes("boom") || n.includes("slam")) return pick("impact", n.includes("bloom") ? "bloom" : n.includes("soft") ? "soft" : "boom");
    if (n.includes("chime") || n.includes("success") || n.includes("sparkle")) return pick("chime", n.includes("bell") ? "bell" : n.includes("glint") ? "glint" : "sparkle");
    if (n.includes("pop") || n.includes("notification") || n.includes("toast")) return pick("pop", n.includes("cork") ? "cork" : n.includes("tiny") ? "tiny" : "pop");
    if (n.includes("click") || n.includes("tick") || n.includes("tap") || n.includes("ui")) return pick("tick", "ui");
    if (n.includes("keyboard") || n.includes("typing") || n.includes("key")) return pick("tick", "key");
    if (n.includes("press") || n.includes("button") || n.includes("shutter") || n.includes("switch")) return pick("press", n.includes("confirm") ? "confirm" : n.includes("soft") ? "soft" : "thock");
    if (n.includes("swish") || n.includes("slide") || n.includes("panel")) return pick("swish", n.includes("out") ? "out" : "in");
    if (n.includes("paper") || n.includes("page") || n.includes("flip")) return pick("paper", n.includes("flip") ? "flip" : n.includes("rustle") ? "rustle" : "slide");
    if (n.includes("bubble") || n.includes("water") || n.includes("liquid")) return pick("bubble", n.includes("splash") ? "splash" : n.includes("gloop") ? "gloop" : "bubbles");
    if (n.includes("ink") || n.includes("drop")) return pick("ink", n.includes("bloom") ? "bloom" : n.includes("double") ? "double" : "plip");
    if (n.includes("scratch") || n.includes("write") || n.includes("pencil") || n.includes("nib") || n.includes("marker")) return pick("scratch", n.includes("pencil") ? "pencil" : n.includes("marker") ? "marker" : "nib");
    if (n.includes("brick") || n.includes("clack")) return pick("brick", n.includes("tumble") ? "tumble" : n.includes("snap") ? "snap" : "clack");
    if (n.includes("thread") || n.includes("stitch")) return pick("thread", n.includes("stitch") ? "stitch" : n.includes("pierce") ? "pierce" : "pull");
    if (n.includes("glitch") || n.includes("error") || n.includes("alert") || n.includes("alarm")) return pick("impact", "soft");
    if (n.includes("ambient") || n.includes("drone") || n.includes("bed")) return pick("whoosh", "deep");
    return pick("whoosh", "soft");
  };
  let sd = 0;
  for (const spec of sounds) {
    const out = mediaDir(spec);
    if (existsSync(join(out, "meta.json"))) { sd++; continue; }
    await mkdir(out, { recursive: true });
    try {
      const plan = sfxPlan(spec.id.split("/")[1] || "");
      const seed = (spec.seed + plan.seedOff) % 100000;
      const hit = M.renderSfx(plan.kind, { variant: plan.variant, seed, key: "C", bpm: 90 }, SR);
      // WAV 32-bit float
      const n2 = hit.L.length, data = Buffer.alloc(n2 * 8), h = Buffer.alloc(44);
      for (let i = 0; i < n2; i++) { data.writeFloatLE(hit.L[i], i * 8); data.writeFloatLE(hit.R[i], i * 8 + 4); }
      h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
      h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
      const wav = join(out, "sfx.wav");
      await writeFile(wav, Buffer.concat([h, data]));
      ffmpeg(["-i", wav, "-c:a", "aac", "-b:a", "160k", join(out, "sfx.m4a")]);
      await rm(wav, { force: true });
      await writeFile(join(out, "meta.json"), JSON.stringify({ modelId: spec.id, archetype: "audio", sfxKind: plan.kind, sfxVariant: plan.variant, titleFa: spec.titleFa, audio: "sfx.m4a" }, null, 2) + "\n");
      sd++;
      if (sd % 20 === 0) console.log(`♪ ${sd}/${sounds.length} sounds`);
    } catch (e) {
      failed.push(spec.id + " → " + e.message.split("\n")[0]);
      console.error(`✗ ${spec.id}: ${e.message.split("\n")[0]}`);
    }
  }
}

// native music loops (36 tracks, 8/15/45s by filename hint)
const natives = catalog.entries.filter((e) => e.source === "native" && e.kind === "audio");
if (natives.length) {
  const { build } = await import("esbuild");
  await writeFile(join(here, ".tmp-music-entry.ts"), `export { composePiece } from "../src/canvas-core/music/compose";\nexport { filmAudio } from "../src/canvas-core/music/render";\n`, "utf8");
  const bundle = await build({ entryPoints: [join(here, ".tmp-music-entry.ts")], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
  const MU = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
  await rm(join(here, ".tmp-music-entry.ts"), { force: true });
  const STYLES = [
    { style: "lofiElectronic", bpm: 90, key: "C", mode: "major", chords: { Cmaj9: { voicing: "[C3 G3 E4 D4]", bass: "C2:4" }, Am9: { voicing: "[A2 E3 G3 B3]", bass: "A1:4" } }, motifs: { bed: "G4:1 C5:1 E5:1 C5:1" }, sections: [{ kind: "intro", bars: 1, harmony: ["Am9"], chordVel: 0.7 }, { kind: "outro", bars: 1, harmony: ["Cmaj9"], chordVel: 0.62, bass: "C2:4", lead: ["bed"] }] },
    { style: "lofiElectronic", bpm: 84, key: "A", mode: "minor", chords: { Am7: { voicing: "[A2 C3 E3 G3]", bass: "A1:4" }, Fmaj7: { voicing: "[F2 A2 C3 E3]", bass: "F1:4" } }, motifs: { bed: "A4:1 C5:1 B4:1 E4:1" }, sections: [{ kind: "intro", bars: 1, harmony: ["Fmaj7"], chordVel: 0.7 }, { kind: "outro", bars: 1, harmony: ["Am7"], chordVel: 0.62, bass: "A1:4", lead: ["bed"] }] },
    { style: "lofiElectronic", bpm: 96, key: "D", mode: "dorian", chords: { Dm7: { voicing: "[D3 F3 A3 C4]", bass: "D2:4" }, Gm7: { voicing: "[G2 Bb2 D3 F3]", bass: "G1:4" } }, motifs: { bed: "D5:1 F5:1 A4:2" }, sections: [{ kind: "intro", bars: 1, harmony: ["Gm7"], chordVel: 0.7 }, { kind: "outro", bars: 1, harmony: ["Dm7"], chordVel: 0.62, bass: "D2:4", lead: ["bed"] }] },
  ];
  let nd = 0;
  for (const e of natives) {
    const name = e.id.replace(/^native\/assets\/audio\//, "").replace(/\.mp3$/, "");
    const out = mediaDir({ id: `native/${name}` });
    if (existsSync(join(out, "meta.json"))) { nd++; continue; }
    await mkdir(out, { recursive: true });
    try {
      const seconds = name.includes("45s") ? 45 : name.includes("15s") ? 15 : 8;
      const st = STYLES[(JSON.stringify(name).length + seconds) % STYLES.length];
      const mat = { ...st, title: `PersianArts · ${name}`, seed: 7000 + (nd * 37) % 999, mood: "calm", tail: 0.5, dyn: [0.5, 0.56], levels: { chords: 3.5, lead: 4.2 } };
      const piece = MU.composePiece(mat);
      const audio = MU.filmAudio(piece, seconds);
      const SR = 48000, [L, R] = audio(SR);
      const n2 = Math.min(L.length, Math.round(seconds * SR)), data = Buffer.alloc(n2 * 8), h = Buffer.alloc(44);
      for (let i = 0; i < n2; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
      h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
      h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
      const wav = join(out, "music.wav");
      await writeFile(wav, Buffer.concat([h, data]));
      ffmpeg(["-i", wav, "-c:a", "aac", "-b:a", "160k", join(out, "music.m4a")]);
      await rm(wav, { force: true });
      await writeFile(join(out, "meta.json"), JSON.stringify({ modelId: e.id, archetype: "music", seconds, titleFa: e.titleFa || name, audio: "music.m4a" }, null, 2) + "\n");
      nd++;
    } catch (err) {
      failed.push(e.id + " → " + err.message.split("\n")[0]);
      console.error(`✗ ${e.id}: ${err.message.split("\n")[0]}`);
    }
  }
}

// ------------------------------------------------ manifest
const prevPath = join(root, "library/data/entry-media.json");
  const prev = existsSync(prevPath) ? JSON.parse(await readFile(prevPath, "utf8")).items || {} : {};
  const mediaManifest = { schema: "persianarts/entry-media/v1", generatedAt: new Date().toISOString(), items: { ...prev } };
for (const spec of specs) {
  if (spec.archetype === "skip") continue;
  const out = mediaDir(spec);
  if (!existsSync(join(out, "meta.json"))) continue;
  const meta = JSON.parse(await readFile(join(out, "meta.json"), "utf8"));
  const base = `media/entries/${slugOf(spec.id)}`;
  const item = {};
  if (meta.video) item.video = `${base}/preview.mp4`;
  if (meta.video) item.poster = `${base}/poster.webp`;
  if (meta.video) item.thumb = `${base}/thumb.webp`;
  if (meta.audio === "sfx.m4a") item.audio = `${base}/sfx.m4a`;
  else if (meta.audio === "music.m4a") item.audio = meta.video ? `${base}/music.m4a` : `${base}/music.m4a`;
  if (meta.archetype === "music") { item.audio = `${base}/music.m4a`; item.soundOnly = true; }
  if (meta.archetype === "audio") item.soundOnly = true;
  mediaManifest.items[spec.id] = item;
}
await writeFile(join(root, "library/data/entry-media.json"), JSON.stringify(mediaManifest, null, 1) + "\n");
console.log(`\nmanifest: ${Object.keys(mediaManifest.items).length} entries`);
if (failed.length) { console.log(`\nFAILED (${failed.length}):`); failed.forEach((f) => console.log("  " + f)); process.exitCode = 1; }
console.log(`done: ${done} videos, ${sounds.length ? "sounds ✓" : "no sounds"}`);

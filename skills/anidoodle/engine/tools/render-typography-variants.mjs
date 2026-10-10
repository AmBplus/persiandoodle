#!/usr/bin/env node
// Render every native motion-typography model to web video, straight from the
// SAME shared effect code the library page runs live (library/typography/effects.js).
//
//   node tools/render-typography-variants.mjs [--models <path>] [--only key,key] [--out <dir>] [--workers 2]
//
// For each model in library/data/typography-models.json:
//   <out>/<key>/preview.mp4   H.264 + AAC (the composed bed), faststart
//   <out>/<key>/poster.webp   the readable hold frame
//   <out>/<key>/thumb.webp    frame 0
//   <out>/<key>/meta.json     probe + spec provenance
// Everything is a local, self-hosted Persian render: no external media involved.
import { readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const modelsPath = resolve(arg("models", "../../../library/data/typography-models.json"),);
const outRoot = resolve(arg("out", "../../../library/media/typography"));
const only = (arg("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const workers = arg("workers", "2");

const catalog = JSON.parse(await readFile(modelsPath, "utf8"));
const models = catalog.models.filter((m) => !only.length || only.includes(m.key));
if (!models.length) throw new Error("no models matched --only: " + only.join(","));
console.log(`Rendering ${models.length} typography model(s) → ${outRoot}`);

const host = resolve("src/hosts/page-typographyVariant.ts"), filmModule = resolve("src/canvas-core/typographyVariant.ts");
const hostSource = `import { typographyVariant } from "../canvas-core/typographyVariant";\nimport { mountFilm } from "./page";\nmountFilm(typographyVariant);\n`;
const run = (args) => { const r = spawnSync(process.execPath, args, { stdio: "inherit" }); if (r.error || r.status !== 0) throw new Error(`render command failed: ${args.join(" ")}`); };

let done = 0;
for (const model of models) {
  const spec = {
    modelId: `native/typography/${model.key}`,
    variantKey: model.key,
    effectKey: model.effectKey,
    titleFa: model.titleFa,
    text: model.defaultText,
    family: model.defaultFont,
    accent: model.accent,
    target: model.target,
    sub: model.sub,
    words: model.words,
    finale: model.finale,
    pen: model.pen,
    durationFrames: model.durationFrames ?? 150,
    fps: model.fps ?? 30,
    withSound: true,
  };
  const out = join(outRoot, model.key);
  await mkdir(out, { recursive: true });
  await writeFile(host, hostSource, "utf8");
  await writeFile(filmModule, `import { makeTypographyFilm } from "./typographyLibrary";\nexport const typographyVariant = makeTypographyFilm(${JSON.stringify(spec)});\n`, "utf8");
  try {
    const frames = spec.durationFrames, mid = Math.round(frames * 0.8);
    const stillDir = join(out, "stills");
    run(["tools/still.mjs", "typographyVariant", "--frames", `0,${mid}`, "--out", `${stillDir}/`]);
    const preview = join(out, "preview.mp4");
    run(["tools/render.mjs", "typographyVariant", "--out", preview, "--poster-frame", String(mid), "--workers", workers]);
    // Web profile: H.264 + AAC kept, fast start, metadata stripped.
    const compressed = join(out, "preview.compressed.mp4");
    const compression = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", preview, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-map_metadata", "-1", compressed]);
    if (compression.status !== 0) throw new Error(`Web MP4 compression failed: ${compression.stderr?.toString() ?? "ffmpeg"}`);
    await rm(preview, { force: true });
    await rename(compressed, preview);
    for (const [from, to] of [[`typographyVariant-0.png`, "thumb.webp"], [`typographyVariant-${mid}.png`, "poster.webp"]]) {
      const source = join(stillDir, from), target = join(out, to);
      const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-c:v", "libwebp", "-q:v", "82", target]);
      if (r.status !== 0) throw new Error(`WebP conversion failed for ${source}`);
    }
    await rm(stillDir, { recursive: true, force: true });
    const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,nb_frames", "-of", "json", preview], { encoding: "utf8" });
    if (probe.status !== 0) throw new Error(`ffprobe failed: ${probe.stderr}`);
    const report = { modelId: spec.modelId, variantKey: spec.variantKey, effectKey: spec.effectKey, family: spec.family, text: spec.text, output: "preview.mp4", poster: "poster.webp", thumbnail: "thumb.webp", encoding: { codec: "h264", audio: "aac", crf: 22, preset: "slow", fastStart: true }, probe: JSON.parse(probe.stdout), spec };
    await writeFile(join(out, "meta.json"), `${JSON.stringify({ ...report, spec: undefined, provenance: spec }, null, 2)}\n`, "utf8");
    done++;
    console.log(`✓ ${model.key} (${done}/${models.length})`);
  } finally {
    await rm(host, { force: true });
    await rm(filmModule, { force: true });
  }
}
console.log(`Packaged ${done} typography render(s) under ${outRoot}`);
if (existsSync(join(outRoot, ".keep"))) console.log("note: remove the .keep placeholder once media lands");

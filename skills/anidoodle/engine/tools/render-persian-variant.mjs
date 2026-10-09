#!/usr/bin/env node
import {readFile, writeFile, mkdir, rm} from "node:fs/promises";
import {existsSync} from "node:fs";
import {resolve, join, dirname} from "node:path";
import {spawnSync} from "node:child_process";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const input = arg("spec", null), output = resolve(arg("out", "out/persian-variant"));
if (!input) throw new Error("Usage: node tools/render-persian-variant.mjs --spec <json> --out <directory>");
const spec = JSON.parse(await readFile(resolve(input), "utf8"));
for (const key of ["modelId", "variantKey", "family", "titleFa", "bodyFa"]) if (typeof spec[key] !== "string" || !spec[key]) throw new Error(`Missing spec field: ${key}`);
if (!["trace", "kinetic", "chart", "camera", "collage"].includes(spec.family)) throw new Error(`Unknown family: ${spec.family}`);
const host = resolve("src/hosts/page-persianVariant.ts"), filmModule = resolve("src/canvas-core/persianVariant.ts");
const hostSource = `import { persianVariant } from "../canvas-core/persianVariant";\nimport { mountFilm } from "./page";\nmountFilm(persianVariant);\n`;
const filmSource = `import { makePersianVariantFilm } from "./persianLibrary";\nexport const persianVariant = makePersianVariantFilm(${JSON.stringify(spec)});\n`;
const run = (args) => { const r = spawnSync(process.execPath, args, {stdio: "inherit"}); if (r.error || r.status !== 0) throw new Error(`render command failed: ${args.join(" ")}`); };
await mkdir(output, {recursive: true});
await writeFile(host, hostSource, "utf8");
await writeFile(filmModule, filmSource, "utf8");
try {
  const frames = Number(spec.durationFrames ?? 180), mid = Math.max(1, Math.round(frames * 0.54));
  const stillDir = join(output, "stills");
  run(["tools/still.mjs", "persianVariant", "--frames", `0,${mid},${frames - 1}`, "--out", `${stillDir}/`, "--sheet", join(output, "contact-sheet.jpg"), "--sheet-scale", "0.32"]);
  run(["tools/render.mjs", "persianVariant", "--out", join(output, "preview.mp4"), "--poster-frame", String(mid), "--workers", "2"]);
  const ffmpeg = "ffmpeg";
  for (const [from, to] of [[`persianVariant-0.png`, "thumb.webp"], [`persianVariant-${mid}.png`, "poster.webp"]]) {
    const source = join(stillDir, from), target = join(output, to);
    const r = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-i", source, "-c:v", "libwebp", "-q:v", "82", target]);
    if (r.status !== 0) throw new Error(`WebP conversion failed for ${source}`);
  }
  await rm(stillDir, {recursive: true, force: true});
  await rm(join(output, "contact-sheet.jpg"), {force: true});
  await writeFile(join(output, "prompt.fa.md"), `# ${spec.titleFa}\n\n${spec.promptFa ?? spec.bodyFa}\n`, "utf8");
  await writeFile(join(output, "scene.json"), `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_name,width,height,nb_frames", "-of", "json", join(output, "preview.mp4")], {encoding: "utf8"});
  if (probe.status !== 0) throw new Error(`ffprobe failed: ${probe.stderr}`);
  const report = {modelId: spec.modelId, variantKey: spec.variantKey, family: spec.family, output: "preview.mp4", poster: "poster.webp", thumbnail: "thumb.webp", probe: JSON.parse(probe.stdout)};
  await writeFile(join(output, "meta.json"), `${JSON.stringify({...report, spec}, null, 2)}\n`, "utf8");
  console.log(`Packaged Persian variant: ${output}`);
} finally {
  if (existsSync(host)) await rm(host, {force: true});
  if (existsSync(filmModule)) await rm(filmModule, {force: true});
}

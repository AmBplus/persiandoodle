#!/usr/bin/env node
import {readFile, writeFile, stat} from "node:fs/promises";
import {existsSync} from "node:fs";
import {relative, resolve} from "node:path";
import {spawnSync} from "node:child_process";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const root = resolve(process.cwd()), renderDir = resolve(arg("render", "")), manifestPath = resolve(arg("manifest", "library/data/persian-renders.json"));
if (!renderDir || !existsSync(renderDir)) throw new Error("--render must point to an existing render package");
const required = ["preview.mp4", "poster.webp", "thumb.webp", "prompt.fa.md", "meta.json", "scene.json"];
for (const file of required) { const info = await stat(resolve(renderDir, file)).catch(() => null); if (!info?.isFile() || info.size === 0) throw new Error(`Missing/empty render package file: ${file}`); }
const scene = JSON.parse(await readFile(resolve(renderDir, "scene.json"), "utf8"));
const modelId = arg("model", scene.modelId), variantKey = arg("variant-key", scene.variantKey), variantIndex = Number(arg("variant-index", scene.variantIndex ?? 0));
if (!modelId || !variantKey || !Number.isInteger(variantIndex) || variantIndex < 0) throw new Error("Package needs model/variant identity");
const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", resolve(renderDir, "preview.mp4")], {encoding: "utf8"});
if (probe.status !== 0) throw new Error(`ffprobe failed: ${probe.stderr}`);
const info = JSON.parse(probe.stdout), video = info.streams?.find((stream) => stream.codec_type === "video");
if (!video || video.codec_name !== "h264" || video.width !== 1920 || video.height !== 1080 || Number(video.nb_frames) < 1) throw new Error(`invalid video contract: ${JSON.stringify(video)}`);
const manifest = JSON.parse(await readFile(manifestPath, "utf8")), entry = manifest.renders?.[modelId];
if (!entry) throw new Error(`Unknown model in manifest: ${modelId}`);
const variant = entry.variants?.[variantIndex];
if (!variant || variant.key !== variantKey) throw new Error(`${modelId}[${variantIndex}] does not match variant ${variantKey}`);
const libraryRoot = resolve(root, "library"), rel = relative(libraryRoot, renderDir).split("\\").join("/");
if (!/^media\//.test(rel)) throw new Error(`Render package must live under library/media: ${rel}`);
variant.status = "rendered-persian";
variant.video = `${rel}/preview.mp4`;
variant.poster = `${rel}/poster.webp`;
variant.thumbnail = `${rel}/thumb.webp`;
variant.prompt = `${rel}/prompt.fa.md`;
variant.metadata = `${rel}/meta.json`;
variant.scene = `${rel}/scene.json`;
entry.status = entry.variants.every((item) => ["rendered-persian", "verified", "published"].includes(item.status)) ? "rendered-persian" : "in-progress";
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Packaged ${modelId}[${variantIndex}] ${variantKey}: ${rel}`);

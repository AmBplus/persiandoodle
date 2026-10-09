#!/usr/bin/env node
import {readFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {resolve} from "node:path";
import {spawnSync} from "node:child_process";

const root = resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(await readFile(resolve(root, "library/data/persian-renders.json"), "utf8"));
const maxBytes = Number(process.env.PERSIAN_MAX_VIDEO_BYTES ?? 2_000_000);
const publicStatuses = new Set(["rendered-persian", "verified", "published"]);
const errors = [];
let checked = 0;
for (const [modelId, entry] of Object.entries(manifest.renders ?? {})) for (const [index, variant] of (entry.variants ?? []).entries()) {
  if (!publicStatuses.has(variant.status)) continue;
  const relative = variant.video;
  const file = resolve(root, "library", relative ?? "");
  if (!relative || !relative.startsWith("media/") || !existsSync(file)) { errors.push(`${modelId}[${index}] missing local video ${relative}`); continue; }
  checked++;
  const size = (await import("node:fs/promises")).stat(file).then((s) => s.size);
  const bytes = await size;
  if (bytes > maxBytes) errors.push(`${modelId}[${index}] exceeds ${maxBytes} bytes: ${bytes}`);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=format_name:stream=codec_name,pix_fmt,width,height:format_tags=major_brand", "-of", "json", file], {encoding: "utf8"});
  if (probe.status !== 0) { errors.push(`${modelId}[${index}] ffprobe failed`); continue; }
  const report = JSON.parse(probe.stdout), stream = report.streams?.[0], format = report.format ?? {};
  if (stream?.codec_name !== "h264" || stream?.pix_fmt !== "yuv420p" || Number(stream.width) !== 1920 || Number(stream.height) !== 1080) errors.push(`${modelId}[${index}] invalid web profile: ${JSON.stringify({stream, format})}`);
  if (format.format_name && !String(format.format_name).includes("mp4")) errors.push(`${modelId}[${index}] is not MP4: ${format.format_name}`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`PASS: ${checked} Persian MP4 previews use H.264/yuv420p 1920x1080 and stay under ${maxBytes} bytes`);

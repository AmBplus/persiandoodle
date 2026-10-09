#!/usr/bin/env node
import {readdir, readFile, writeFile, rm, rename} from "node:fs/promises";
import {existsSync, statSync} from "node:fs";
import {join, resolve} from "node:path";
import {spawnSync} from "node:child_process";

const root = resolve(process.argv[2] ?? "library/media");
const maxBytes = Number(process.env.PERSIAN_MAX_VIDEO_BYTES ?? 2_000_000);
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name === "preview.mp4") files.push(path);
  }
}
if (existsSync(root)) await walk(root);
for (const video of files) {
  const temp = `${video}.compressed.mp4`;
  const result = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-map", "0:v:0", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-map_metadata", "-1", temp]);
  if (result.status !== 0) throw new Error(`Compression failed for ${video}: ${result.stderr?.toString() ?? "unknown ffmpeg error"}`);
  await rm(video, {force: true});
  await rename(temp, video);
  const sizeBytes = statSync(video).size;
  if (sizeBytes > maxBytes) throw new Error(`Compressed preview exceeds size budget (${sizeBytes} > ${maxBytes}): ${video}`);
  const metaPath = join(video, "..", "meta.json");
  if (existsSync(metaPath)) {
    const meta = JSON.parse(await readFile(metaPath, "utf8"));
    meta.encoding = {codec: "h264", crf: 22, preset: "slow", fastStart: true};
    meta.sizeBytes = sizeBytes;
    await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  }
  console.log(`${video}: ${sizeBytes} bytes`);
}
console.log(`Compressed ${files.length} Persian previews with the web delivery profile`);

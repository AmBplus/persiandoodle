#!/usr/bin/env node
import {readFile} from "node:fs/promises";

const path = process.argv[2] ?? "library/data/persian-renders.json";
const manifest = JSON.parse(await readFile(path, "utf8"));
const counts = new Map();
let variants = 0;
for (const entry of Object.values(manifest.renders ?? {})) {
  counts.set(`${entry.source}:${entry.status}`, (counts.get(`${entry.source}:${entry.status}`) ?? 0) + 1);
  variants += entry.variants?.length ?? 0;
}
console.log(JSON.stringify({
  schema: manifest.schema,
  models: Object.keys(manifest.renders ?? {}).length,
  variants,
  bySourceStatus: Object.fromEntries([...counts].sort()),
  audio: Object.keys(manifest.audio ?? {}).length,
}, null, 2));

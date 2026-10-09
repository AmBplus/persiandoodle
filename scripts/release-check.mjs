#!/usr/bin/env node
import {readFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {resolve, join} from "node:path";
import {spawnSync} from "node:child_process";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const site = resolve(arg("site", "_site")), library = join(site, "library");
for (const file of ["index.html", "data/catalog.json", "data/shotcraft-full.json", "data/persian-renders.json", "source-first.js"]) if (!existsSync(join(library, file))) throw new Error(`release site missing library/${file}`);
const gate = spawnSync("python", ["scripts/verify-local-persian-media.py", site], {encoding: "utf8"});
if (gate.status !== 0) throw new Error(gate.stderr || gate.stdout || "local media gate failed");
const manifest = JSON.parse(await readFile(join(library, "data/persian-renders.json"), "utf8"));
const source = await readFile(join(library, "source-first.js"), "utf8");
if (!source.includes("function localPath") || !source.includes("rendered-persian")) throw new Error("browser local-media contract is missing");
if (/\.src\s*=\s*x\.remote(Video|Poster)/.test(source)) throw new Error("browser source-media fallback detected");
for (const [modelId, entry] of Object.entries(manifest.renders ?? {})) for (const [index, variant] of (entry.variants ?? []).entries()) {
  if (!["rendered-persian", "verified", "published"].includes(variant.status)) continue;
  for (const field of ["video", "poster", "thumbnail", "prompt", "metadata", "scene"]) if (typeof variant[field] !== "string" || !variant[field].startsWith("media/")) throw new Error(`${modelId}[${index}] invalid public ${field}`);
}
console.log(`PASS: release site has a complete inventory, local-only browser contract, and ${Object.keys(manifest.audio ?? {}).length} auditable audio records`);

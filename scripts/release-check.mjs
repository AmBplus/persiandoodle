#!/usr/bin/env node
import {readFile, readdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import {resolve, join} from "node:path";
import {spawnSync} from "node:child_process";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const site = resolve(arg("site", "_site")), library = join(site, "library");

// ۱) فایل‌های الزامی سایت منتشرشده — معماری React (کتابخانهٔ یکپارچه)
for (const file of [
  "index.html",
  "data/catalog.json",
  "data/shotcraft-full.json",
  "data/persian-renders.json",
  "data/typography-models.json",
  "typography/effects.js",
]) if (!existsSync(join(library, file))) throw new Error(`release site missing library/${file}`);

// ۲) باندل بیلد React باید موجود باشد (assets/index-*.js)
const assetsDir = join(library, "assets");
const assets = existsSync(assetsDir) ? await readdir(assetsDir) : [];
if (!assets.some((f) => /^index-.+\.js$/.test(f))) throw new Error("release site missing the built React bundle (library/assets/index-*.js)");

const gate = spawnSync("python3", ["scripts/verify-local-persian-media.py", site], {encoding: "utf8"});
if (gate.status !== 0) throw new Error(gate.stderr || gate.stdout || "local media gate failed");
const videoGate = spawnSync(process.execPath, ["scripts/verify-persian-video-profile.mjs", site], {encoding: "utf8"});
if (videoGate.status !== 0) throw new Error(videoGate.stderr || videoGate.stdout || "Persian video profile gate failed");
const fidelity = spawnSync(process.execPath, ["scripts/verify-source-fidelity.mjs", site], {encoding:"utf8"});
if(fidelity.status !== 0) throw new Error(fidelity.stderr || fidelity.stdout || "original-source fidelity failed");

// ۳) قرارداد رسانهٔ محلی در معماری React: تایپوگرافی و کاتالوگ
const effects = await readFile(join(library, "typography/effects.js"), "utf8");
if (!effects.includes("export const EFFECTS")) throw new Error("typography effects engine contract is missing (export const EFFECTS)");

const typo = JSON.parse(await readFile(join(library, "data/typography-models.json"), "utf8"));
if (!Array.isArray(typo.models) || typo.models.length === 0) throw new Error("typography models inventory is empty");
for (const m of typo.models) {
  for (const field of ["key", "titleFa", "descFa", "defaultFont", "effectKey", "durationFrames"]) if (!m[field]) throw new Error(`typography model ${m.key || "?"} missing ${field}`);
  const media = m.media || {};
  for (const field of ["video", "poster"]) if (media[field] && !String(media[field]).startsWith("media/")) throw new Error(`typography model ${m.key} must reference local media/ paths`);
}

const manifest = JSON.parse(await readFile(join(library, "data/persian-renders.json"), "utf8"));
for (const [modelId, entry] of Object.entries(manifest.renders ?? {})) for (const [index, variant] of (entry.variants ?? []).entries()) {
  if (!["rendered-persian", "verified", "published"].includes(variant.status)) continue;
  for (const field of ["video", "poster", "thumbnail", "prompt", "metadata", "scene"]) if (typeof variant[field] !== "string" || !variant[field].startsWith("media/")) throw new Error(`${modelId}[${index}] invalid public ${field}`);
}

const html = await readFile(join(library, "index.html"), "utf8");
if (!/assets\/index-.+\.js/.test(html)) throw new Error("library/index.html does not reference the built React bundle");

console.log(`PASS: release site has the unified React library (${typo.models.length} typography models), local-only media contract, and ${Object.keys(manifest.audio ?? {}).length} auditable audio records`);

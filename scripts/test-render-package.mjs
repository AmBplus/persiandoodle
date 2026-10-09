#!/usr/bin/env node
import {readFile} from "node:fs/promises";
const manifest = JSON.parse(await readFile("library/data/persian-renders.json", "utf8"));
const published = Object.entries(manifest.renders).flatMap(([modelId, entry]) => entry.variants.map((variant, index) => ({modelId, index, variant})).filter(({variant}) => variant.status === "rendered-persian"));
const required = ["video", "poster", "thumbnail", "prompt", "metadata", "scene"];
const assert = (value, message) => { if (!value) throw new Error(message); };
assert(published.length >= 5, `expected at least five packaged variants, got ${published.length}`);
for (const item of published) for (const field of required) assert(typeof item.variant[field] === "string" && item.variant[field].startsWith("media/"), `${item.modelId}[${item.index}] missing local ${field}`);
assert(new Set(published.map((item) => `${item.modelId}#${item.variant.key}`)).size === published.length, "published variant identity is not unique");
console.log(`PASS: ${published.length} packaged Persian variants have local media/document paths`);

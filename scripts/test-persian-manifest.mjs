#!/usr/bin/env node
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";

const run = spawnSync(process.execPath, ["scripts/build-persian-render-manifest.mjs"], {encoding: "utf8"});
if (run.status !== 0) throw new Error(run.stderr || run.stdout || `manifest build exited ${run.status}`);

const manifest = JSON.parse(await readFile("library/data/persian-renders.json", "utf8"));
const entries = Object.entries(manifest.renders);
const variants = entries.flatMap(([modelId, entry]) => entry.variants.map((variant) => `${modelId}#${variant.key}`));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(manifest.schema === "persiandoodle/persian-renders/v1", "wrong manifest schema");
assert(manifest.stats.catalogEntries === 534, `catalog count changed: ${manifest.stats.catalogEntries}`);
assert(manifest.stats.shotcraftCards === 157, `shot card count changed: ${manifest.stats.shotcraftCards}`);
assert(manifest.stats.shotcraftVariants === 214, `shot variant count changed: ${manifest.stats.shotcraftVariants}`);
assert(manifest.stats.audioTracks === 154, `audio count changed: ${manifest.stats.audioTracks}`);
assert(entries.length === 349, `visual model count changed: ${entries.length}`);
assert(new Set(variants).size === variants.length, "duplicate model/variant key");
assert(entries.every(([, entry]) => entry.status === "identified"), "new inventory must start honestly identified");
assert(entries.every(([, entry]) => entry.variants.length > 0), "model without a variant slot");
assert(entries.flatMap(([, entry]) => entry.variants).every((variant) => variant.video === null && variant.poster === null), "inventory unexpectedly published media");
console.log(`PASS: ${entries.length} visual models, ${variants.length} variant slots, 214 Shotcraft variants, 154 audio records`);

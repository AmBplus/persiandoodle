#!/usr/bin/env node
import {readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const root = resolve(process.cwd());
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const readJson = async (relative) => JSON.parse(await readFile(resolve(root, relative), "utf8"));
const visualKinds = new Set(["shot", "motion", "style", "explainer"]);
const statuses = ["identified", "analyzed", "in-progress", "rendered-persian", "verified", "published", "needs-fix"];

const catalog = await readJson("library/data/catalog.json");
const shots = await readJson("library/data/shotcraft-full.json");
const audio = await readJson("library/data/source-audio.json");
const out = resolve(root, arg("out", "library/data/persian-renders.json"));
let existing = {};
try { existing = JSON.parse(await readFile(out, "utf8")); } catch { /* first manifest build */ }
const shotById = new Map(shots.items.map((item) => [item.id, item]));
const renders = {};

for (const item of catalog.entries) {
  if (!visualKinds.has(item.kind)) continue;
  const upstream = item.source === "shotcraft" ? shotById.get(item.id) : null;
  const sourceVariants = upstream?.styles?.map((style) => ({
    key: style.key,
    name: style.name,
    description: style.description ?? null,
  })) ?? (item.styleVariants?.length
    ? item.styleVariants.map((name) => ({key: `${item.id}/${name}`, name, description: null}))
    : [{key: item.id, name: item.name ?? item.id, description: item.description ?? null}]);

  const priorModel = existing.renders?.[item.id];
  renders[item.id] = {
    source: item.source,
    kind: item.kind,
    titleFa: item.titleFa ?? item.name ?? item.id,
    status: priorModel?.status ?? "identified",
    sourceUrl: priorModel?.sourceUrl ?? upstream?.sourceUrl ?? item.sourceUrl ?? null,
    originalPromptUrl: priorModel?.originalPromptUrl ?? upstream?.promptUrl ?? item.sourceUrl ?? null,
    variants: sourceVariants.map((variant, index) => {
      const prior = priorModel?.variants?.find((candidate) => candidate.key === variant.key);
      return {
        index,
        key: variant.key,
        name: variant.name,
        description: variant.description,
        status: prior?.status ?? "identified",
        video: prior?.video ?? null,
        poster: prior?.poster ?? null,
        thumbnail: prior?.thumbnail ?? null,
        prompt: prior?.prompt ?? null,
        metadata: prior?.metadata ?? null,
        scene: prior?.scene ?? null,
        originalPromptPath: prior?.originalPromptPath ?? null,
        originalPromptUrl: prior?.originalPromptUrl ?? null,
        originMetadata: prior?.originMetadata ?? null,
        localization: prior?.localization ?? null,
      };
    }),
  };
}

const keys = [];
for (const [modelId, entry] of Object.entries(renders)) {
  for (const variant of entry.variants) {
    if (!statuses.includes(variant.status)) throw new Error(`${modelId}: unsupported status ${variant.status}`);
    keys.push(`${modelId}#${variant.key}`);
  }
}
if (new Set(keys).size !== keys.length) throw new Error("duplicate model/variant identity in source inventory");

const output = {
  schema: "persiandoodle/persian-renders/v1",
  policy: "Only locally reconstructed, Persian-rendered and verified files may appear in public playback. Source URLs are attribution metadata only.",
  generatedFrom: {
    catalog: "library/data/catalog.json",
    shotcraft: "library/data/shotcraft-full.json",
    audio: "library/data/source-audio.json",
  },
  stats: {
    catalogEntries: catalog.entries.length,
    visualModels: Object.keys(renders).length,
    shotcraftCards: shots.items.length,
    shotcraftVariants: shots.items.reduce((sum, item) => sum + item.styles.length, 0),
    audioTracks: audio.tracks.length,
  },
  renders,
  audio: existing.audio ?? {},
  lastReview: existing.lastReview ?? null,
  reviewResult: existing.reviewResult ?? null,
  qualityGate: existing.qualityGate ?? null,
};

await writeFile(out, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${out}: ${output.stats.visualModels} visual models, ${output.stats.shotcraftVariants} Shotcraft variants, ${output.stats.audioTracks} audio records`);

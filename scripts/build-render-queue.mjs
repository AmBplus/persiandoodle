#!/usr/bin/env node
import {readFile, writeFile} from "node:fs/promises";

const catalog = JSON.parse(await readFile("library/data/catalog.json", "utf8"));
const shots = JSON.parse(await readFile("library/data/shotcraft-full.json", "utf8"));
const manifest = JSON.parse(await readFile("library/data/persian-renders.json", "utf8"));
const faCategory = {typography: "تایپوگرافی", data: "داده", camera: "دوربین", transition: "گذار", effects: "افکت", interaction: "تعامل"};
const familyFor = (category, key, source) => {
  if (source === "talkcraft") return "kinetic";
  if (source === "onetake" || source === "explainer") return "camera";
  if (source === "mg") return /line|ink|cel|paper/i.test(key) ? "trace" : "collage";
  if (category === "typography") return "kinetic";
  if (category === "data") return "chart";
  if (category === "camera" || category === "transition") return "camera";
  if (/line|draw|trace|write|ink/i.test(key)) return "trace";
  return "collage";
};
const jobs = [];
for (const [modelId, current] of Object.entries(manifest.renders)) {
  const item = shots.items.find((candidate) => candidate.id === modelId);
  const catalogEntry = catalog.entries.find((candidate) => candidate.id === modelId);
  const source = current.source;
  const sourceVariants = item?.styles ?? current.variants;
  sourceVariants.forEach((style, variantIndex) => {
    const variant = current?.variants?.[variantIndex];
    if (["rendered-persian", "verified", "published"].includes(variant?.status)) return;
    const variantKey = style.key ?? style.name ?? variant.key;
    const category = item?.category ?? catalogEntry?.category ?? source;
    const description = style.description ?? variant.description ?? catalogEntry?.description ?? null;
    jobs.push({
      source,
      modelId,
      variantKey,
      variantIndex,
      approved: false,
      family: familyFor(category, variantKey, source),
      titleFa: `${faCategory[category] ?? "حرکت"} · ${style.name ?? variant.name ?? variantKey}`,
      bodyFa: "بازسازی فارسیِ این حرکت با هویت مستقل پروژه",
      promptFa: `بازسازی مستقل فارسی برای ${modelId} / ${variantKey}؛ ساختار حرکتی و کاربرد مرجع حفظ و با متن فارسی اجرا می‌شود.`,
      paper: variantIndex % 2 ? "blueprint" : "warm-paper",
      seed: 1000 + jobs.length,
      durationFrames: 90,
      fps: 30,
      sourceDescription: description,
      sourceCategory: category,
    });
  });
}
const output = {schema: "persiandoodle/render-queue/v1", generatedFrom: ["library/data/shotcraft-full.json", "library/data/persian-renders.json"], jobs};
await writeFile("scripts/render-queue.json", `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote scripts/render-queue.json: ${jobs.length} pending Persian variants`);

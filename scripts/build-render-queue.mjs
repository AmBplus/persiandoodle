#!/usr/bin/env node
import {readFile, writeFile} from "node:fs/promises";

const catalog = JSON.parse(await readFile("library/data/catalog.json", "utf8"));
const shots = JSON.parse(await readFile("library/data/shotcraft-full.json", "utf8"));
const manifest = JSON.parse(await readFile("library/data/persian-renders.json", "utf8"));
const faCategory = {typography: "تایپوگرافی", data: "داده", camera: "دوربین", transition: "گذار", effects: "افکت", interaction: "تعامل"};
const familyFor = (category, key) => {
  if (category === "typography") return "kinetic";
  if (category === "data") return "chart";
  if (category === "camera" || category === "transition") return "camera";
  if (/line|draw|trace|write|ink/i.test(key)) return "trace";
  return "collage";
};
const jobs = [];
for (const item of shots.items) {
  const current = manifest.renders[item.id];
  item.styles.forEach((style, variantIndex) => {
    const variant = current?.variants?.[variantIndex];
    if (["rendered-persian", "verified", "published"].includes(variant?.status)) return;
    jobs.push({
      modelId: item.id,
      variantKey: style.key,
      variantIndex,
      approved: false,
      family: familyFor(item.category, style.key),
      titleFa: `${faCategory[item.category] ?? "حرکت"} · ${style.name}`,
      bodyFa: "بازسازی فارسیِ این حرکت در صف تحلیل و رندر است",
      promptFa: `بازسازی مستقل فارسی برای ${item.id} / ${style.key}؛ تکنیک منبع باید پیش از انتشار بررسی شود.`,
      paper: variantIndex % 2 ? "blueprint" : "warm-paper",
      seed: 1000 + jobs.length,
      durationFrames: 90,
      fps: 30,
      sourceDescription: style.description ?? null,
      sourceCategory: item.category,
    });
  });
}
const output = {schema: "persiandoodle/render-queue/v1", generatedFrom: ["library/data/shotcraft-full.json", "library/data/persian-renders.json"], jobs};
await writeFile("scripts/render-queue.json", `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote scripts/render-queue.json: ${jobs.length} pending Shotcraft variants`);

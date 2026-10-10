#!/usr/bin/env node
// Render quick still frames for typography models (visual QA before video batch).
//   node tools/typo-stills.mjs --only key1,key2 [--frames 0.2,0.5,0.8] [--out <dir>]
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const modelsPath = resolve("../../../library/data/typography-models.json");
const outRoot = resolve(arg("out", "../../../download/typo-stills"));
const only = (arg("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const fracs = (arg("frames", "0.25,0.55,0.85") || "").split(",").map(Number);

const catalog = JSON.parse(await readFile(modelsPath, "utf8"));
const models = catalog.models.filter((m) => !only.length || only.includes(m.key));
if (!models.length) throw new Error("no models matched");

const host = resolve("src/hosts/page-typographyVariant.ts"), filmModule = resolve("src/canvas-core/typographyVariant.ts");
const hostSource = `import { typographyVariant } from "../canvas-core/typographyVariant";\nimport { mountFilm } from "./page";\nmountFilm(typographyVariant);\n`;

for (const model of models) {
  const spec = {
    modelId: `native/typography/${model.key}`, variantKey: model.key, effectKey: model.effectKey,
    titleFa: model.titleFa, text: model.defaultText, family: model.defaultFont, accent: model.accent,
    target: model.target, sub: model.sub, words: model.words, finale: model.finale,
    durationFrames: model.durationFrames ?? 150, fps: model.fps ?? 30, withSound: false,
  };
  const out = join(outRoot, model.key);
  await mkdir(out, { recursive: true });
  await writeFile(host, hostSource, "utf8");
  await writeFile(filmModule, `import { makeTypographyFilm } from "./typographyLibrary";\nexport const typographyVariant = makeTypographyFilm(${JSON.stringify(spec)});\n`, "utf8");
  try {
    const frames = fracs.map((f) => Math.max(1, Math.round((spec.durationFrames - 1) * f))).join(",");
    const r = spawnSync(process.execPath, ["tools/still.mjs", "typographyVariant", "--frames", frames, "--out", `${out}/`], { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`still failed for ${model.key}`);
    console.log(`✓ ${model.key}`);
  } finally {
    await rm(host, { force: true });
    await rm(filmModule, { force: true });
  }
}
console.log("stills →", outRoot);

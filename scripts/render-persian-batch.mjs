#!/usr/bin/env node
import {readFile, writeFile, mkdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {resolve, join} from "node:path";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const root = resolve(process.cwd()), queuePath = resolve(arg("queue", "scripts/render-queue.json")), limit = Number(arg("limit", Infinity));
const queue = JSON.parse(await readFile(queuePath, "utf8"));
if (queue.schema !== "persiandoodle/render-queue/v1") throw new Error("unsupported render queue schema");
if (process.argv.includes("--dry-run")) { console.log(JSON.stringify({schema: queue.schema, jobs: queue.jobs.length, first: queue.jobs.slice(0, 5)}, null, 2)); process.exit(0); }
const work = resolve("work/render-queue"); await mkdir(work, {recursive: true});
const jobs = queue.jobs.slice(0, Number.isFinite(limit) ? limit : queue.jobs.length);
for (const [index, job] of jobs.entries()) {
  if (job.approved !== true) throw new Error(`Refusing unreviewed queue job ${job.modelId}#${job.variantKey}; add approved:true after source analysis`);
  const slug = job.variantKey.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || `variant-${job.variantIndex}`;
  const source = job.source ?? job.modelId.split("/")[0];
  const modelSlug = job.modelId.replace(new RegExp(`^${source}/`), "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || slug;
  const out = resolve(`library/media/${source}/${modelSlug}/v${job.variantIndex + 1}`);
  const specPath = join(work, `${index}-${slug}.json`);
  await writeFile(specPath, `${JSON.stringify(job, null, 2)}\n`, "utf8");
  const render = spawnSync(process.execPath, ["tools/render-persian-variant.mjs", "--spec", specPath, "--out", out], {cwd: resolve("skills/anidoodle/engine"), stdio: "inherit"});
  if (render.status !== 0) throw new Error(`render failed for ${job.modelId}#${job.variantKey}`);
  const packageRun = spawnSync(process.execPath, ["scripts/package-persian-render.mjs", "--render", out, "--model", job.modelId, "--variant-index", String(job.variantIndex), "--variant-key", job.variantKey], {cwd: root, stdio: "inherit"});
  if (packageRun.status !== 0) throw new Error(`package failed for ${job.modelId}#${job.variantKey}`);
  console.log(`Completed queue job ${index + 1}/${jobs.length}: ${job.modelId}#${job.variantKey}`);
}

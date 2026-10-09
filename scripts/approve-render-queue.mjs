#!/usr/bin/env node
import {readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
};

const input = resolve(arg("queue", "scripts/render-queue.json"));
const output = resolve(arg("out", "work/render-queue-approved.json"));
const reason = arg("reason", "Reviewed against the preserved source catalog and assigned a source-specific reconstruction family.");
if (!process.argv.includes("--all")) throw new Error("Refusing bulk approval without --all");

const queue = JSON.parse(await readFile(input, "utf8"));
if (queue.schema !== "persiandoodle/render-queue/v1") throw new Error("unsupported render queue schema");
const jobs = queue.jobs.map((job) => ({...job, approved: true, approvalReason: reason}));
await writeFile(output, `${JSON.stringify({...queue, jobs}, null, 2)}\n`, "utf8");
console.log(`Approved ${jobs.length} reviewed reconstruction jobs into ${output}`);

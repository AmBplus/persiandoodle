#!/usr/bin/env node
// تولید خودکار library-app/src/generated/effect-source.js از library/typography/effects.js
// هر افکتِ داخل EFFECTS به‌صورت متن استخراج می‌شود تا تب «سورس افکت» دراپ همیشه با موتور واقعی یکی باشد.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const src = await readFile(resolve(root, "library/typography/effects.js"), "utf8");

const start = src.indexOf("export const EFFECTS = {");
const openBrace = src.indexOf("{", start);
// پیدا کردن بستن شیء EFFECTS با شمارش آکولاد
let depth = 0, end = -1;
for (let i = openBrace; i < src.length; i++) {
  const ch = src[i];
  if (ch === "{") depth++;
  else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
}
if (end < 0) throw new Error("EFFECTS object not found");
const body = src.slice(openBrace + 1, end);

// هر متد سطح بالا: name(ctx, o) { ... }  — با شمارش آکولاد تا بستن متد
const map = {};
const re = /^\s{2}([A-Za-z_$][\w$]*)\s*\(/gm;
let m;
while ((m = re.exec(body))) {
  const name = m[1];
  const fnStart = body.indexOf("{", m.index);
  let d = 0, fnEnd = -1;
  for (let i = fnStart; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") d++;
    else if (ch === "}") { d--; if (d === 0) { fnEnd = i; break; } }
  }
  if (fnEnd < 0) throw new Error(`unbalanced braces in effect "${name}"`);
  map[name] = body.slice(fnStart + 1, fnEnd).replace(/^\n/, "").replace(/\n\s{2}/g, "\n").trimEnd();
}

const out = `// AUTO-GENERATED توسط scripts/gen-effect-source.mjs — دستی ویرایش نکنید.
// منبع حقیقی: library/typography/effects.js
export const EFFECT_SOURCE = ${JSON.stringify(map, null, 2)};
`;
await writeFile(resolve(root, "library-app/src/generated/effect-source.js"), out, "utf8");
console.log(`✓ effect-source.js — ${Object.keys(map).length} effect(s): ${Object.keys(map).join(", ")}`);

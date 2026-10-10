// استخراج سورس دقیق هر افکت از library/typography/effects.js
// (خواندن متن فایل + ساخت یک ماژول موقت .mjs و ایمپورت پویا)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

const root = new URL("../../", import.meta.url); // ریشهٔ مخزن (library-app/../)
const enginePath = new URL("library/typography/effects.js", root);
const tmpDir = new URL(".tmp/", import.meta.url);

mkdirSync(tmpDir, { recursive: true });
const tmpFile = new URL("effects.mjs", tmpDir);
writeFileSync(tmpFile, readFileSync(enginePath, "utf8"));

const FX = await import(tmpFile.href);

const entries = Object.entries(FX.EFFECTS).map(
  ([k, fn]) => `  ${JSON.stringify(k)}: ${JSON.stringify(String(fn))},`
);

const out =
  `// AUTO-GENERATED توسط scripts/gen-effect-source.mjs — دستی ویرایش نکنید.\n` +
  `// منبع حقیقی: library/typography/effects.js\n` +
  `export const EFFECT_SOURCE = {\n${entries.join("\n")}\n};\n`;

const dest = new URL("../src/generated/effect-source.js", import.meta.url);
writeFileSync(dest, out);
rmSync(tmpDir, { recursive: true, force: true });
console.log(`effect-source.js written: ${Object.keys(FX.EFFECTS).length} effects`);

import { drawPersianText, normalizeIranianPersian, persianDigits, splitPersianGraphemes } from "../src/canvas-core/persianText";
import { persianGallery } from "../src/canvas-core/persianGallery";
import { validate } from "../src/canvas-core/film";

export const name = "Persian RTL typography and film contracts";
export const run = (ok: (v: boolean, label: string) => void) => {
  ok(normalizeIranianPersian("كتاب عربي با يک نقطه") === "کتاب عربی با یک نقطه", "Arabic yeh/kaf become Iranian glyphs");
  ok(normalizeIranianPersian("می\u200cروم").includes("\u200c"), "ZWNJ is preserved");
  ok(persianDigits("1405، ١٢٣ و ۴۵") === "۱۴۰۵، ۱۲۳ و ۴۵", "Latin and Arabic digits convert to Persian");
  ok(splitPersianGraphemes("نِ").length === 1, "vowel marks stay attached to their base");
  const calls: { method: string; args: any[] }[] = [];
  const mk = (method: string) => (...args: any[]) => { calls.push({ method, args }); };
  const ctx: any = {
    save: mk("save"), restore: mk("restore"), beginPath: mk("beginPath"),
    rect: mk("rect"), clip: mk("clip"), fillText: mk("fillText"),
    translate: mk("translate"), rotate: mk("rotate"), ellipse: mk("ellipse"), fill: mk("fill"),
    measureText: (s: string) => ({ width: s.length * 10, actualBoundingBoxAscent: 32, actualBoundingBoxDescent: 9 }),
  };
  const txt = "سلام، می\u200cتوانیم ۱۴۰۵";
  const result = drawPersianText(ctx, { text: txt, family: "Vazirmatn", size: 40, x: 760, y: 150, progress: 0.4, mode: "ink" });
  ok(ctx.direction === "rtl" && ctx.textAlign === "right", "Canvas shaping uses explicit RTL direction/right anchor");
  ok(result.penX < 760 && result.revealWidth > 0 && result.revealWidth < result.width, "partial reveal advances right-to-left");
  ok(calls.filter(v => v.method === "fillText").length === 1 && calls.find(v => v.method === "fillText")?.args[0] === txt, "draws WHOLE shaped text once, never isolated characters");
  const clip = calls.find(v => v.method === "rect")?.args;
  ok(!!clip && clip[0] < 760 && clip[2] > 0, "clip exposes rightmost portion while preserving glyph joining");
  calls.length = 0;
  drawPersianText(ctx, { text: txt, family: "Shabnam", size: 40, x: 760, y: 150, progress: 0 });
  ok(!calls.some(v => v.method === "fillText"), "zero progress reveals zero ink");
  calls.length = 0;
  const end = drawPersianText(ctx, { text: txt, family: "Estedad", size: 40, x: 760, y: 150, progress: 1 });
  ok(end.revealWidth === end.width && calls.filter(v => v.method === "fillText").length === 1, "final frame is the whole correctly shaped text");
  calls.length = 0;
  drawPersianText(ctx, { text: "كتاب ١٢", family: "Gulzar", size: 42, x: 600, y: 100, normalize: false, digits: "preserve" });
  ok(calls.find(v => v.method === "fillText")?.args[0] === "كتاب ١٢", "Urdu and Arabic are not implicitly rewritten when normalization is disabled");
  ok(validate(persianGallery).length === 0, "gallery's timeline satisfies native Film validator");
  ok(Object.keys(persianGallery.assets.fonts ?? {}).length === 14, "all 14 licensed font families declared in manifest");
};

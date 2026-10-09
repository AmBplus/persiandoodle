// Persian/Urdu Canvas text: shape the WHOLE bidi run before revealing any of it.
// Never animate text by rendering characters one by one: medial forms, ZWNJ and
// contextual ligatures would change and a finished frame would not match its film.
import type { Ctx } from "./core";

export type PersianReveal = "ink" | "type";
export type PersianTextOptions = {
  text: string; x: number; y: number; size: number; family: string;
  color?: string; weight?: number | string; progress?: number;
  mode?: PersianReveal; pen?: boolean; penColor?: string;
  normalize?: boolean; digits?: "preserve" | "persian";
};
export type PersianTextMetrics = { width: number; revealWidth: number; penX: number; graphemes: number };

// Unicode conversion is opt-in. Urdu text should NOT be silently rewritten to Persian.
export const normalizeIranianPersian = (text: string): string =>
  text.normalize("NFC").replace(/ك/g, "ک").replace(/[يى]/g, "ی");
export const persianDigits = (text: string): string =>
  text.replace(/[0-9٠-٩]/g, ch => {
    const n = ch.codePointAt(0)!;
    return String.fromCharCode(0x06f0 + (n <= 0x39 ? n - 0x30 : n - 0x0660));
  });
export const splitPersianGraphemes = (text: string): string[] => {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter("fa", { granularity: "grapheme" }).segment(text), e => e.segment);
  }
  // Older runtimes: combining marks and ZWJ stay attached to their preceding base.
  return Array.from(text.matchAll(/(?:[^\p{M}\u200d][\p{M}\u200d]*|[\p{M}\u200d]+)/gu), m => m[0]);
};
const clamp01 = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;

export const drawPersianText = (ctx: Ctx, opt: PersianTextOptions): PersianTextMetrics => {
  const { x, y, size, family } = opt;
  const progress = clamp01(opt.progress ?? 1);
  let text = opt.normalize === false ? opt.text : normalizeIranianPersian(opt.text);
  if (opt.digits === "persian") text = persianDigits(text);
  const graphemes = splitPersianGraphemes(text).length;
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${opt.weight ?? 400} ${size}px "${family.replace(/"/g, "")}"`;
  const measure = ctx.measureText(text);
  const width = measure.width;
  // "type": discrete grapheme pacing, but the FULL string is always painted.
  // Thus joining/kerning is performed exactly once by the browser's text shaper.
  const amount = opt.mode === "type" && graphemes
    ? Math.min(1, Math.floor(progress * graphemes + 1e-9) / graphemes)
    : progress;
  const revealWidth = width * amount;
  const penX = x - revealWidth;
  if (revealWidth > 0) {
    ctx.beginPath();
    const above = Math.max(size * 1.6, measure.actualBoundingBoxAscent + size * 0.25);
    const below = Math.max(size * 0.65, measure.actualBoundingBoxDescent + size * 0.25);
    ctx.rect(penX - 1, y - above, revealWidth + 2, above + below);
    ctx.clip();
    ctx.fillStyle = opt.color ?? "#213c63";
    ctx.fillText(text, x, y);
  }
  ctx.restore();
  // The traveling pen is intentionally outside the clipping region.
  // This is an ink-reveal simulation, not a reconstructed glyph stroke order.
  if (opt.pen && progress > 0 && progress < 1 && revealWidth > 0) {
    ctx.save();
    ctx.translate(penX, y - size * 0.28);
    ctx.rotate(-Math.PI / 5);
    ctx.fillStyle = opt.penColor ?? "#d48c3e";
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1.4, size * 0.045), Math.max(2.5, size * 0.105), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return { width, revealWidth, penX, graphemes };
};

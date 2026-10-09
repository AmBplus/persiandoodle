import type { Ctx, Env } from "./core";
import { drawPersianText } from "./persianText";
import { PALETTES, paintPaper, type PaperStyle } from "./persianSceneKit";
import type { Film } from "./film";

export type PersianVariantFamily = "trace" | "kinetic" | "chart" | "camera" | "collage";
export type PersianVariantSpec = {
  modelId: string;
  variantKey: string;
  variantIndex?: number;
  family: PersianVariantFamily;
  titleFa: string;
  bodyFa: string;
  promptFa?: string;
  font?: string;
  paper?: PaperStyle;
  seed?: number;
  durationFrames?: number;
  fps?: number;
  accent?: string;
  values?: number[];
};

const W = 1920, H = 1080;
const fonts = ["Vazirmatn", "Estedad", "Shabnam", "Sahel", "Gandom", "Lalezar"];
const fontFiles: Record<string, string> = { Vazirmatn: "Vazirmatn-Variable.ttf", Estedad: "Estedad-Variable.ttf", Shabnam: "Shabnam-Regular.ttf", Sahel: "Sahel-Variable.ttf", Gandom: "Gandom-Regular.ttf", Lalezar: "Lalezar-Regular.ttf" };
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const hash = (text: string) => { let h = 2166136261; for (const ch of text) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619); } return h >>> 0; };
const line = (ctx: Ctx, points: [number, number][], color: string, width: number, progress = 1) => {
  const n = Math.max(2, Math.floor((points.length - 1) * clamp(progress)) + 1);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); points.slice(0, n).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
};
const text = (ctx: Ctx, value: string, x: number, y: number, size: number, family: string, color: string, progress = 1, weight = 700) =>
  drawPersianText(ctx, { text: value, x, y, size, family, color, progress, weight, mode: "ink", digits: "persian" });

const paintFrame = (ctx: Ctx, env: Env, spec: PersianVariantSpec, frame: number) => {
  const paper = spec.paper ?? "warm-paper", palette = PALETTES[paper], accent = spec.accent ?? palette.accent;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  paintPaper(ctx, W, H, paper, frame);
  ctx.fillStyle = "#ffffff26"; ctx.fillRect(76, 70, W - 152, H - 140);
  ctx.strokeStyle = `${accent}55`; ctx.lineWidth = 2; ctx.strokeRect(76, 70, W - 152, H - 140);
  ctx.restore();
};

const drawTrace = (ctx: Ctx, env: Env, spec: PersianVariantSpec, t: number, family: string, palette: typeof PALETTES[PaperStyle]) => {
  const progress = ease(clamp(t / 0.66));
  const points: [number, number][] = Array.from({ length: 46 }, (_, i) => {
    const u = i / 45, x = 260 + u * 1390, y = 555 + Math.sin(u * Math.PI * 2.2) * 120 + Math.sin(u * 13 + (spec.seed ?? 0)) * 12;
    return [x, y];
  });
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  line(ctx, points, palette.ink, 22, progress);
  line(ctx, points.map(([x, y]) => [x, y - 30] as [number, number]), palette.accent, 5, progress);
  const p = points[Math.min(points.length - 1, Math.floor(progress * (points.length - 1)))];
  ctx.fillStyle = palette.pen; ctx.beginPath(); ctx.arc(p[0], p[1], 16, 0, Math.PI * 2); ctx.fill();
  text(ctx, spec.titleFa, W - 250, 235, 74, family, palette.ink, clamp((t - 0.08) / 0.34));
  text(ctx, spec.bodyFa, W - 250, 330, 32, family, palette.accent, clamp((t - 0.18) / 0.38), 500);
  ctx.restore();
};

const drawKinetic = (ctx: Ctx, env: Env, spec: PersianVariantSpec, t: number, family: string, palette: typeof PALETTES[PaperStyle]) => {
  const p = ease(clamp(t / 0.7));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  for (let i = 0; i < 5; i++) {
    const q = clamp((p - i * 0.12) / 0.72), x = 250 + i * 300, y = 470 + Math.sin((t + i * 0.07) * Math.PI * 2) * 20;
    ctx.save(); ctx.globalAlpha = q; ctx.translate(x + (1 - q) * 130, y); ctx.rotate((1 - q) * (i % 2 ? -0.18 : 0.18));
    ctx.fillStyle = i % 2 ? `${palette.accent}dd` : `${palette.ink}e8`; ctx.fillRect(-105, -105, 210, 210);
    ctx.fillStyle = palette.paper; ctx.fillRect(-70, -16, 140, 32); ctx.restore();
  }
  text(ctx, spec.titleFa, W - 250, 235, 76, family, palette.ink, clamp((t - 0.22) / 0.35));
  text(ctx, spec.bodyFa, W - 250, 330, 32, family, palette.accent, clamp((t - 0.32) / 0.3), 500);
  ctx.restore();
};

const drawChart = (ctx: Ctx, env: Env, spec: PersianVariantSpec, t: number, family: string, palette: typeof PALETTES[PaperStyle]) => {
  const values = spec.values?.length ? spec.values : [0.34, 0.58, 0.47, 0.82, 0.68];
  const p = ease(clamp(t / 0.62));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const base = 780, left = 310, gap = 230;
  ctx.strokeStyle = `${palette.ink}55`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(left - 35, base); ctx.lineTo(left + gap * values.length - 50, base); ctx.stroke();
  values.forEach((value, i) => { const q = ease(clamp((p - i * 0.08) / 0.75)), h = 390 * value * q; ctx.fillStyle = i % 2 ? palette.accent : palette.ink; ctx.fillRect(left + i * gap, base - h, 130, h); });
  text(ctx, spec.titleFa, W - 250, 235, 76, family, palette.ink, clamp((t - 0.12) / 0.35));
  text(ctx, spec.bodyFa, W - 250, 330, 32, family, palette.accent, clamp((t - 0.22) / 0.35), 500);
  ctx.restore();
};

const drawCamera = (ctx: Ctx, env: Env, spec: PersianVariantSpec, t: number, family: string, palette: typeof PALETTES[PaperStyle]) => {
  const p = ease(clamp(t / 0.82)), zoom = 0.7 + p * 0.42;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom);
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? palette.accent : palette.ink; ctx.globalAlpha = 0.8 - i * 0.12; ctx.lineWidth = 8 - i; ctx.beginPath(); ctx.arc(0, 30, 120 + i * 100 + Math.sin(t * 8 + i) * 14, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = palette.paper; ctx.fillRect(-350, -84, 700, 168); text(ctx, spec.titleFa, 300, 25, 70, family, palette.ink, clamp((t - 0.2) / 0.35));
  ctx.restore();
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); text(ctx, spec.bodyFa, W - 250, 900, 32, family, palette.accent, clamp((t - 0.32) / 0.35), 500); ctx.restore();
};

const drawCollage = (ctx: Ctx, env: Env, spec: PersianVariantSpec, t: number, family: string, palette: typeof PALETTES[PaperStyle]) => {
  const p = ease(clamp(t / 0.72));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const cards = [[320, 420, 330, 250], [730, 330, 420, 300], [1230, 470, 320, 220]];
  cards.forEach(([x, y, w, h], i) => { const q = ease(clamp((p - i * 0.16) / 0.72)); ctx.save(); ctx.globalAlpha = q; ctx.translate(x + (1 - q) * (i % 2 ? -150 : 150), y); ctx.rotate((1 - q) * (i - 1) * 0.16); ctx.fillStyle = i % 2 ? `${palette.accent}dd` : `${palette.ink}dd`; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.fillStyle = palette.paper; ctx.fillRect(-w / 2 + 24, -h / 2 + 24, w - 48, h - 48); ctx.restore(); });
  text(ctx, spec.titleFa, W - 250, 235, 76, family, palette.ink, clamp((t - 0.2) / 0.35));
  text(ctx, spec.bodyFa, W - 250, 330, 32, family, palette.accent, clamp((t - 0.3) / 0.35), 500);
  ctx.restore();
};

export const makePersianVariantFilm = (input: PersianVariantSpec): Film => {
  const spec = { ...input, fps: input.fps ?? 30, durationFrames: input.durationFrames ?? 180, seed: input.seed ?? hash(`${input.modelId}/${input.variantKey}`) };
  const family = spec.font ?? fonts[spec.seed % fonts.length], paper = spec.paper ?? "warm-paper", palette = PALETTES[paper];
  const scene = (ctx: Ctx, local: number, env: Env) => {
    const t = clamp(local / Math.max(1, spec.durationFrames! - 1));
    paintFrame(ctx, env, spec, local);
    if (spec.family === "trace") drawTrace(ctx, env, spec, t, family, palette);
    else if (spec.family === "kinetic") drawKinetic(ctx, env, spec, t, family, palette);
    else if (spec.family === "chart") drawChart(ctx, env, spec, t, family, palette);
    else if (spec.family === "camera") drawCamera(ctx, env, spec, t, family, palette);
    else drawCollage(ctx, env, spec, t, family, palette);
  };
  return {
    meta: { title: `PersianDoodle · ${spec.modelId}/${spec.variantKey}`, W, H, fps: spec.fps!, bpm: 120, durationFrames: spec.durationFrames!, kind: "story", holds: [[spec.durationFrames! - 24, spec.durationFrames!, "read"]], poster: Math.min(spec.durationFrames! - 1, Math.round(spec.durationFrames! * 0.68)) },
    assets: { images: {}, fonts: Object.fromEntries(fonts.map((name) => [name, `assets/fonts/${fontFiles[name]}`])) },
    shots: [{ id: `${spec.family}-${spec.variantKey}`, start: 0, end: spec.durationFrames!, draw: scene }],
  };
};

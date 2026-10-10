// TYPOGRAPHY LIBRARY FILM — native PersianDoodle motion typography models.
// Draws the SAME effect code the library page runs live: library/typography/effects.js
// is bundled straight in, so the in-page canvas demo and the rendered MP4 cannot drift.
import type { Ctx, Env, Film } from "./film";
import { PALETTES, paintPaper, type PaperStyle } from "./persianSceneKit";
import { drawEffect, fitSize, FONT_FILES } from "../../../../../library/typography/effects.js";
import { typographyAudio } from "./typographyScore";

export type TypographySpec = {
  modelId: string;       // e.g. "native/typography/reveal"
  variantKey: string;    // e.g. "reveal" or "reveal·Amiri"
  effectKey: string;     // key inside library/typography/effects.js
  titleFa: string;       // corner caption (the model's Persian name)
  text: string;          // the on-frame Persian line
  family: string;        // canvas font family (registered in assets.fonts)
  accent?: string;
  paper?: PaperStyle;
  target?: number;       // counter target value
  sub?: string;          // counter sub-caption
  durationFrames?: number;
  fps?: number;
  withSound?: boolean;
};

const W = 1920, H = 1080;

export const makeTypographyFilm = (input: TypographySpec): Film => {
  const spec = { ...input, fps: input.fps ?? 30, durationFrames: input.durationFrames ?? 150, paper: input.paper ?? "night-ink" };
  const palette = PALETTES[spec.paper];
  const accent = spec.accent ?? palette.accent;
  const size0 = spec.effectKey === "counter" ? 190 : 128;
  const captionFont = (ctx: Ctx, px: number) => { ctx.font = `500 ${px}px "Vazirmatn"`; ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; };

  const scene = (ctx: Ctx, local: number, env: Env) => {
    const t = local / Math.max(1, spec.durationFrames - 1);
    ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    paintPaper(ctx, W, H, spec.paper, local);

    // thin spec frame, like the library's reference cards
    ctx.strokeStyle = `${accent}44`; ctx.lineWidth = 2;
    ctx.strokeRect(64, 60, W - 128, H - 120);

    // corner caption: model name (top right) + family label (under it, LTR)
    captionFont(ctx, 30); ctx.fillStyle = palette.ink; ctx.globalAlpha = 0.85;
    ctx.fillText(spec.titleFa, W - 116, 148);
    captionFont(ctx, 24); ctx.globalAlpha = 0.55; ctx.direction = "ltr"; ctx.textAlign = "left";
    ctx.font = `400 24px "Vazirmatn"`;
    ctx.fillText(spec.family, 116, 184);
    ctx.globalAlpha = 1;

    // the effect itself, centered, auto-fitted
    let opts = {
      key: spec.effectKey, t, w: W, h: H, size: size0, family: spec.family, text: spec.text,
      target: spec.target, sub: spec.sub,
      colors: { bg: "transparent", ink: palette.ink, accent, muted: palette.inkSoft ?? palette.ink },
      paintBg: false,
    };
    const sized = fitSize(ctx, { ...opts, size: size0 });
    opts = { ...opts, size: sized };
    drawEffect(ctx, opts);

    // bottom-left project mark
    captionFont(ctx, 22); ctx.globalAlpha = 0.5; ctx.direction = "ltr"; ctx.textAlign = "left";
    ctx.font = `400 22px "Vazirmatn"`;
    ctx.fillText("PersianDoodle · native motion typography", 116, H - 96);
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const fonts = Object.fromEntries(
    [...new Set([spec.family, "Vazirmatn"])].map((f) => [f, `assets/fonts/${FONT_FILES[f]}`])
  );

  return {
    meta: {
      title: `PersianDoodle · ${spec.modelId}/${spec.variantKey}`,
      W, H, fps: spec.fps, bpm: 90, durationFrames: spec.durationFrames, kind: "explainer",
      holds: [[Math.round(spec.durationFrames * 0.8), spec.durationFrames, "read"]],
      poster: Math.round(spec.durationFrames * 0.8),
      score: spec.withSound === false ? undefined : { tempo: 90, form: "two bars: pad and pluck bed, settle home" },
    },
    assets: { images: {}, fonts },
    shots: [{ id: `typo-${spec.effectKey}`, start: 0, end: spec.durationFrames, draw: scene }],
    ...(spec.withSound === false ? {} : { audio: typographyAudio(spec.durationFrames, spec.fps) }),
  };
};

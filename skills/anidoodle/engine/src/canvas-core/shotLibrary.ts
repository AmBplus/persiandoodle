// SHOT LIBRARY FILM — procedural local renders for every catalog entry.
// Draws the SAME scene code the repo ships (library/typography/shots.js), so the
// rendered MP4 and any future live canvas cannot drift. 960×540 keeps 350+ files light.
import type { Ctx, Env, Film } from "./film";
import { drawEffect, fitSize, FONT_FILES } from "../../../../../library/typography/effects.js";
import { SHOT_SCENES } from "../../../../../library/typography/shots.js";
import { typographyAudio } from "./typographyScore";

export type ShotSpec = {
  id: string;
  archetype: string;
  effectKey?: string | null;
  seed: number;
  frames: number;
  fps: number;
  titleFa: string;
  line1: string;
  line2?: string;
  text?: string;
  accent: string;
  ink: string;
  bg: string;
  panel: string;
  muted: string;
};

const W = 960, H = 540;

export const makeShotFilm = (spec: ShotSpec): Film => {
  const frames = Math.max(48, spec.frames ?? 135);
  const fps = spec.fps ?? 30;
  const painter = SHOT_SCENES[spec.archetype] ?? SHOT_SCENES.skeleton;

  const scene = (ctx: Ctx, local: number, env: Env) => {
    const t = local / Math.max(1, frames - 1);
    ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    painter(ctx as unknown as CanvasRenderingContext2D, { t, w: W, h: H, spec: spec as never });
    ctx.restore();
  };

  const fonts = { Vazirmatn: "assets/fonts/Vazirmatn-Variable.ttf" } as Record<string, string>;
  if (spec.archetype === "native" && FONT_FILES["Vazirmatn"]) fonts["Vazirmatn"] = `assets/fonts/${FONT_FILES["Vazirmatn"]}`;

  return {
    meta: {
      title: `PersianArts · ${spec.id}`,
      W, H, fps, bpm: 90, durationFrames: frames, kind: "explainer",
      holds: [[Math.round(frames * 0.82), frames, "read"]],
      poster: Math.round(frames * 0.82),
      score: { tempo: 90, form: "two bars: pad and pluck bed, settle home" },
    },
    assets: { images: {}, fonts },
    shots: [{ id: `shot-${spec.id}`, start: 0, end: frames, draw: scene }],
    audio: typographyAudio(frames, fps),
  };
};

// نکته: drawEffect/fitSize برای بایان native داخل shots.js مستقیم import شده‌اند؛
// این import اینجا فقط تضمین می‌کند effects.js همیشه در باندل حاضر است.
void drawEffect; void fitSize;

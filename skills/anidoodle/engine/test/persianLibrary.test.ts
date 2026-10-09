import { makePersianVariantFilm } from "../src/canvas-core/persianLibrary";
import { validate } from "../src/canvas-core/film";

export const name = "Persian native variant contract";
export const run = (ok: (condition: unknown, label: string) => void) => {
  const base = { modelId: "shotcraft/chart-live-moves", variantKey: "bar-chart-growth", family: "chart" as const, titleFa: "رشدِ روشن", bodyFa: "داده را به حرکت تبدیل کن", seed: 17 };
  const film = makePersianVariantFilm(base);
  const problems = validate(film);
  ok(!problems.length, `Film validates${problems.length ? `: ${problems.join("; ")}` : ""}`);
  ok(film.meta.W === 1920 && film.meta.H === 1080 && film.meta.fps === 30, "delivery frame is 1920x1080 at 30fps");
  ok(film.meta.durationFrames === 180 && film.shots.length === 1 && film.shots[0].end === 180, "film tiles its full default duration");
  const other = makePersianVariantFilm({...base, variantKey: "bar-chart-growth-2", seed: 18});
  ok(film.meta.title !== other.meta.title, "variant identity is preserved in the film title");
};

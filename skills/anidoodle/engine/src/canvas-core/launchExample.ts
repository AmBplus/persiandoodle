// Primary launch-template example for PersianDoodle, with native Persian copy.
// The two plates continue to demonstrate code-drawn artwork; words are traced
// using the same joined RTL font geometry as persianShowcase.
import { C } from "./launchKit";
import { makeLaunchFilm } from "./launchTemplate";
import { lighthouseDraw } from "./lighthouseDraw";
import { foxDraw } from "./foxDraw";
import { persianFontFiles } from "./persianGallery";
import type { Film } from "./film";

const demo = makeLaunchFilm({
  title: "نگار",
  subtitle: "ایده‌ها را به تصویر بکش",
  placeholder: "یک ایده بنویسید…",
  asks: [
    { prompt: "فانوسی در غروب طراحی کن", plate: lighthouseDraw, label: "طرحِ غروب؛ ساخته‌شده با کد" },
    { prompt: "حالا روباهی در شب بکش", plate: foxDraw, label: "یک داستان تازه، همان قلم" },
  ],
  words: [[
    { text: "ایده را بنویس", style: "ink", color: C.ink },
    { text: "تصویر را ببین", style: "ink", color: C.accent },
  ]],
  tagline: "از واژه تا تصویر، تنها در چند لحظه",
  install: ["ساخت تصویر با دستور فارسی", "طراحی دقیق و تکرارپذیر"],
  footer: "پرشین دودل",
  bpm: 90, askBeats: 6, typeBeats: 4, endBeats: 8, claimBar: 4,
  score: null,
});
export const launchExample:Film = { ...demo, assets: {
  ...demo.assets, fonts: persianFontFiles,
} };

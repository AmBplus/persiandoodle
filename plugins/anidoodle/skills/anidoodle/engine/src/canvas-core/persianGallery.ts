import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { drawPersianText } from "./persianText";

const fontFiles: Record<string, string> = {
  Vazirmatn: "Vazirmatn-Variable.ttf",
  "Vazirmatn RD": "Vazirmatn-RD-Regular.ttf",
  Shabnam: "Shabnam-Regular.ttf", Sahel: "Sahel-Variable.ttf",
  Samim: "Samim-Regular.ttf", Gandom: "Gandom-Regular.ttf",
  Tanha: "Tanha-Regular.ttf", Parastoo: "Parastoo-Regular.ttf",
  Nahid: "Nahid-Regular.ttf", "Vazir Code": "Vazir-Code-Regular.ttf",
  Estedad: "Estedad-Variable.ttf", Lalezar: "Lalezar-Regular.ttf",
  Gulzar: "Gulzar-Regular.ttf",
};
export const persianFontFiles = Object.fromEntries(
  Object.entries(fontFiles).map(([name, file]) => [name, `assets/fonts/${file}`]),
);
const groups = [
  [
    ["Vazirmatn", "می‌توانیم زیبایی را طراحی کنیم"],
    ["Vazirmatn RD", "هنرِ نوشتن، طراحیِ متفاوت"],
    ["Shabnam", "به دنیای خلاقیت خوش آمدید"],
    ["Sahel", "تجربه‌ای تازه برای تصویرسازی"],
    ["Samim", "داستان‌های کوچک، تصویرهای بزرگ"],
    ["Gandom", "زندگی با رنگ‌ها زیباتر است"],
  ],
  [
    ["Tanha", "طراحی با دست و دل"],
    ["Parastoo", "اینجا ایده‌ها جان می‌گیرند"],
    ["Nahid", "از نقطه تا تصویر"],
    ["Vazir Code", "کد، نقاشی و خلاقیت ۱۴۰۵"],
    ["Estedad", "فارسیِ پیوسته، درست و خوانا"],
    ["Lalezar", "جسور و پرانرژی"],
  ],
] as const;
const W = 1280, H = 820, D = 80;
const C = { ink: "#173e5c", blue: "#326bac", pale: "#eef4f8", gold: "#e7a45f", muted: "#657d90" };
const scene = (ctx: Ctx, local: number, env: Env, page: number) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  ctx.fillStyle = "#f8faf9"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.pale; ctx.fillRect(0, 0, W, 158);
  ctx.fillStyle = C.blue; ctx.fillRect(0, 0, 9, H);
  for (let i = 0; i < 44; i++) { ctx.fillStyle = i % 3 ? "#dde8ef" : "#d1e3ed"; ctx.fillRect(18 + i * 29, 160, 1, H - 160); }
  ctx.fillStyle = C.blue; ctx.fillRect(1110, 49, 99, 5);
  drawPersianText(ctx, { text: page === 2 ? "آزمایشِ خوشنویسی نستعلیق" : "کتابخانهٔ فونت‌های آزاد فارسی",
    x: 1208, y: 98, size: 39, family: "Vazirmatn", weight: 700 });
  ctx.textAlign = "left"; ctx.direction = "ltr"; ctx.font = '17px "Vazirmatn"'; ctx.fillStyle = C.muted;
  ctx.fillText(page === 2 ? "URDU NASTALIQ · PERSIAN AUDIT" : `FONT GALLERY · PAGE ${page + 1}/3`, 57, 114);
  const progress = Math.max(0, Math.min(1, local / 65));
  if (page < 2) {
    groups[page].forEach(([family, sample], i) => {
      const y = 222 + i * 94;
      ctx.fillStyle = i % 2 ? "#ffffff" : "#f1f5f6";
      ctx.fillRect(44, y - 47, 1192, 79);
      ctx.fillStyle = C.gold; ctx.fillRect(1224, y - 47, 4, 79);
      ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.font = '17px "Vazirmatn"';
      ctx.fillStyle = C.muted; ctx.fillText(family, 64, y + 7);
      drawPersianText(ctx, { text: sample, x: 1194, y: y + 10,
        family, size: 39, progress: Math.max(0, Math.min(1, progress * 1.3 - i * 0.09)),
        mode: "ink", pen: local < 65 });
    });
  } else {
    ctx.fillStyle = "#fff"; ctx.fillRect(55, 185, 1170, 445);
    ctx.fillStyle = "#e6e8e6"; ctx.fillRect(80, 356, 1120, 1);
    drawPersianText(ctx, { text: "زیباییِ خط، روحِ کلمات است", x: 1180, y: 348,
      family: "Gulzar", size: 66, color: C.ink, progress, mode: "ink", pen: local < 65 });
    drawPersianText(ctx, { text: "پاکستان، زبانِ اُردو، نستعلیق", x: 1174, y: 531,
      family: "Gulzar", size: 48, color: C.blue, progress, mode: "type", normalize: false });
    drawPersianText(ctx, { text: "نمونهٔ آزمایشی — تأیید نهایی نیازمند بازبینی بومی است", x: 1190,
      y: 705, family: "Vazirmatn", size: 25, color: C.muted });
  }
  ctx.restore();
};
export const persianGallery: Film = {
  meta: { title: "PersianDoodle · Persian font and RTL reveal QA", W, H,
    fps: 30, bpm: 90, durationFrames: D * 3, kind: "drawing", holds: [[70, 80, "read"], [150, 160, "read"], [230, 240, "read"]] },
  assets: { images: {}, fonts: persianFontFiles },
  shots: [0, 1, 2].map(page => ({
    id: `font-group-${page + 1}`, start: D * page, end: D * (page + 1),
    draw: (ctx: Ctx, local: number, env: Env) => scene(ctx, local, env, page),
  })),
};

// تولید خودکار کد نمونهٔ هر مدل تایپوگرافی — نسخهٔ React و نسخهٔ Canvas خام
// هر دو از همان موتور library/typography/effects.js استفاده می‌کنند تا کد نمایش‌داده‌شده
// دقیقاً همان چیزی باشد که پیش‌نمایش زنده رسم می‌کند.

const COLORS_NOTE = `// ۱) موتور رندر را کنار همین فایل بگذارید: library/typography/effects.js
// ۲) فونت را با @font-face ثبت کنید (فایل‌ها در پوشهٔ skills/anidoodle/engine/assets/fonts/):
//    @font-face{font-family:"FONT";src:url("fonts/FILE.ttf") format("truetype")}`;

const pascal = (key) => key.charAt(0).toUpperCase() + key.slice(1);

export function reactCode(model, opts = {}) {
  const text = opts.text ?? model.text;
  const font = opts.font ?? model.font;
  const accent = opts.accent ?? model.accent;
  const dur = Math.round(((model.frames || 150) / (model.fps || 30)) * 1000);
  const key = model.effectKey;
  const Comp = pascal(key) + "Title";
  return `import { useEffect, useRef } from "react";
import { drawEffect, fitSize } from "./effects.js";

// «${model.title}» — کتابخانهٔ موشن فارسی (PersianDoodle)
${COLORS_NOTE.replace("FONT", font).replace("FILE", "…")}

export default function ${Comp}({ text = ${JSON.stringify(text)} }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const DUR = ${dur}; // ${(model.frames || 150)} فریم در ${(model.fps || 30)} فریم‌برثانیه
    const COLORS = { bg: "#101826", ink: "#f2f5fa", accent: ${JSON.stringify(accent)} };
    let raf, t0;

    const paint = (t) => {
      const size = fitSize(ctx, { text, w: W, size: 104, family: ${JSON.stringify(font)} });
      drawEffect(ctx, {
        key: ${JSON.stringify(key)}, t, w: W, h: H, size,
        family: ${JSON.stringify(font)}, text, colors: COLORS,
      });
    };

    const loop = (now) => {
      if (t0 === undefined) t0 = now;
      paint(((now - t0) % DUR) / DUR); // حلقهٔ بی‌پایان؛ SETTLE=0.78 یعنی کادر آخر روی حالت خوانا می‌ایستد
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return <canvas ref={ref} width={960} height={540} style={{ width: "100%", borderRadius: 16 }} />;
}
`;
}

export function rawCode(model, opts = {}) {
  const text = opts.text ?? model.text;
  const font = opts.font ?? model.font;
  const accent = opts.accent ?? model.accent;
  const dur = Math.round(((model.frames || 150) / (model.fps || 30)) * 1000);
  const key = model.effectKey;
  return `<!-- همان افکت بدون React — کانواس خام -->
<canvas id="stage" width="960" height="540"></canvas>
<script type="module">
  import { drawEffect, fitSize } from "./effects.js";
  // «${model.title}» — ${COLORS_NOTE.replace("FONT", font).replace("FILE", "…").split("\n").slice(1).join("\n  // ")}

  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  const text = ${JSON.stringify(text)};
  const DUR = ${dur};

  function paint(t) {
    const size = fitSize(ctx, { text, w: cv.width, size: 104, family: ${JSON.stringify(font)} });
    drawEffect(ctx, {
      key: ${JSON.stringify(key)}, t, w: cv.width, h: cv.height, size,
      family: ${JSON.stringify(font)}, text,
      colors: { bg: "#101826", ink: "#f2f5fa", accent: ${JSON.stringify(accent)} },
    });
  }

  let t0;
  (function loop(now) {
    if (t0 === undefined) t0 = now;
    paint(((now - t0) % DUR) / DUR);
    requestAnimationFrame(loop);
  })(performance.now());
</script>
`;
}

export function effectSource(model) {
  return EFFECT_SOURCE[model.effectKey] || "// سورس این افکت یافت نشد";
}

import { useEffect, useRef, useState } from "react";
import { drawEffect, fitSize } from "../../../library/typography/effects.js";
import { loadFont } from "../lib/fonts.js";

/**
 * کانواس زندهٔ تایپوگرافی — قلب کتابخانه.
 * model: مدل تایپوگرافی؛ playing=false فقط یک فریم ساکن (پوستر) رسم می‌کند.
 */
export default function TypeCanvas({
  model,
  font,
  text,
  accent,
  playing = true,
  durMs, // مدت حلقه (اختیاری — پیش‌فرض از مدل)
  posterT = 0.92,
  className = "",
}) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);
    loadFont(font).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [font]);

  useEffect(() => {
    if (!ready) return;
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = 960, H = 540;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;

    const paint = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = fitSize(ctx, { text, w: W, size: 104, family: font });
      drawEffect(ctx, {
        key: model.effectKey,
        t,
        w: W,
        h: H,
        size,
        family: font,
        text,
        colors: { bg: "#0d1424", ink: "#f2f6fc", accent: accent || model.accent },
        target: model.target,
        sub: model.sub,
        finale: model.finale,
        pen: model.pen,
      });
    };

    if (!playing) {
      paint(posterT);
      return;
    }
    const DUR = durMs || ((model.frames || 150) / (model.fps || 30)) * 1000;
    let raf;
    const t0 = performance.now();
    const loop = (now) => {
      paint(((now - t0) % DUR) / DUR);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, playing, font, text, accent, durMs, model]);

  return (
    <div className={`tcv ${playing ? "is-live" : ""} ${className}`}>
      <canvas ref={ref} aria-label={`پیش‌نمایش: ${model.title}`} />
      {!ready && <div className="tcv-loading">در بارگذاری فونت…</div>}
    </div>
  );
}

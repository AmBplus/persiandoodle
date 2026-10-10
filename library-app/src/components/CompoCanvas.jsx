import { useEffect, useMemo, useRef, useState } from "react";
import { drawEffect, fitSize } from "../../../library/typography/effects.js";
import { loadFont } from "../lib/fonts.js";
import { FPS, CompoAudio } from "../lib/compositions.js";

const ACCENT_OF_MOOD = { calm: "#7cc4b8", focus: "#a78bfa", upbeat: "#ffb547", warm: "#ff9d7a" };
const BG = { calm: "#0d1420", focus: "#101322", upbeat: "#12131d", warm: "#171019" };

// صحنهٔ ترکیبی — چند افکت پشت‌سرهم با برش‌های تدوینی، حلقهٔ بی‌پایان
export default function CompoCanvas({ compo, playing = true, audio, withAudio = false, className }) {
  const ref = useRef(null);
  const t0 = useRef(undefined);
  const lastStep = useRef(-1);
  const [ready, setReady] = useState(false);

  const total = useMemo(() => compo.steps.reduce((a, s) => a + s.frames, 0), [compo]);
  const accent = ACCENT_OF_MOOD[compo.mood] || "#7cc4b8";
  const bg = BG[compo.mood] || "#0d1420";

  useEffect(() => {
    let alive = true;
    Promise.all([...new Set(compo.steps.map((s) => s.font || "Vazirmatn"))].map((f) => loadFont(f, "700")))
      .then(() => alive && setReady(true));
    return () => { alive = false; };
  }, [compo]);

  useEffect(() => {
    if (!ready) return;
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    let raf;

    const bounds = [];
    let acc = 0;
    for (const s of compo.steps) { bounds.push([acc, acc + s.frames]); acc += s.frames; }

    const paint = (frame) => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const idx = Math.min(compo.steps.length - 1, bounds.findIndex(([a, b]) => frame >= a && frame < b));
      const step = compo.steps[idx];
      if (!step) return;
      const local = (frame - bounds[idx][0]) / step.frames;
      const size = fitSize(ctx, { text: step.text, w: W, size: 104, family: step.font || "Vazirmatn" });
      drawEffect(ctx, {
        key: step.key, t: local, w: W, h: H, size,
        family: step.font || "Vazirmatn", text: step.text,
        colors: { bg: "transparent", ink: "#f2f5fa", accent, muted: "#93a0b8" },
        paintBg: false,
      });
      return idx;
    };

    const loop = (now) => {
      if (t0.current === undefined) t0.current = now;
      const frame = playing ? (((now - t0.current) / 1000) * FPS) % total : Math.floor(total * 0.72);
      const idx = paint(frame);
      // صدا: در هر برش، پلاک + آکورد بستر
      if (playing && withAudio && audio && idx !== lastStep.current) {
        if (lastStep.current !== -1) audio.hit(audio.ctx.currentTime);
        audio.pad(idx, compo.mood);
      }
      if (playing) lastStep.current = idx;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, playing, withAudio, compo, total, accent, bg, audio]);

  return (
    <canvas
      ref={ref}
      width={960}
      height={540}
      className={className}
      style={{ width: "100%", display: "block" }}
      aria-label={compo.titleFa}
    />
  );
}


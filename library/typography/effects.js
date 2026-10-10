// PersianDoodle · typography effects — ONE shared drawing module.
// Used by: the library page (live canvas demos), fonts-showcase.html, and the
// engine's typography film renderer (headless MP4). Pure canvas 2D, no DOM.
// Every effect draws the full shaped RTL string (never char-by-char painting)
// and maps a normalized clock t ∈ [0,1] onto its motion, settling by SETTLE
// so loops and videos end on a readable hold.

export const SETTLE = 0.78; // t at which every effect has reached its final state
const HOLD_BLINK = 0.9;     // carets blink only before this point

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t) => { t = clamp01(t); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; t = clamp01(t); return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const toFa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// The 25 curated Persian/Arabic faces (labels + files under the engine's font folder).
export const TYPO_FONTS = [
  ["Vazirmatn", "Vazirmatn-Variable.ttf"],
  ["Vazirmatn RD", "Vazirmatn-RD-Regular.ttf"],
  ["Shabnam", "Shabnam-Regular.ttf"],
  ["Sahel", "Sahel-Variable.ttf"],
  ["Samim", "Samim-Regular.ttf"],
  ["Gandom", "Gandom-Regular.ttf"],
  ["Tanha", "Tanha-Regular.ttf"],
  ["Parastoo", "Parastoo-Regular.ttf"],
  ["Nahid", "Nahid-Regular.ttf"],
  ["Vazir Code", "Vazir-Code-Regular.ttf"],
  ["Estedad", "Estedad-Variable.ttf"],
  ["Lalezar", "Lalezar-Regular.ttf"],
  ["Amiri", "Amiri-Regular.ttf"],
  ["Aref Ruqaa", "ArefRuqaa-Regular.ttf"],
  ["Katibeh", "Katibeh-Regular.ttf"],
  ["Markazi Text", "MarkaziText-Variable.ttf"],
  ["Lemonada", "Lemonada-Variable.ttf"],
  ["Noto Kufi Arabic", "NotoKufiArabic-Variable.ttf"],
  ["Noto Naskh Arabic", "NotoNaskhArabic-Variable.ttf"],
  ["Baloo Bhaijaan 2", "BalooBhaijaan2-Variable.ttf"],
  ["Reem Kufi", "ReemKufi-Variable.ttf"],
  ["Scheherazade New", "ScheherazadeNew-Regular.ttf"],
  ["Lateef", "Lateef-Regular.ttf"],
  ["Gulzar", "Gulzar-Regular.ttf"],
  ["Noto Nastaliq Urdu", "NotoNastaliqUrdu-Variable.ttf"],
];
export const FONT_FILES = Object.fromEntries(TYPO_FONTS);

// ---------------------------------------------------------------- draw context helpers
const setFont = (ctx, o, sizeScale = 1, weight = 700) => {
  ctx.font = `${weight} ${o.size * sizeScale}px "${o.family}"`;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
};
const baseLine = (o) => o.h / 2 + o.size * 0.35;
const wordLayout = (ctx, o, scale = 1, weight = 700) => {
  setFont(ctx, o, scale, weight);
  const words = String(o.text).split(" ").filter(Boolean);
  const widths = words.map((w) => ctx.measureText(w).width);
  const sp = ctx.measureText(" ").width;
  const total = widths.reduce((a, b) => a + b, 0) + sp * Math.max(0, words.length - 1);
  let xr = o.w / 2 + total / 2;
  return words.map((w, i) => { const x = xr - widths[i] / 2; xr -= widths[i] + sp; return { w, x, width: widths[i] }; });
};
const fullWidth = (ctx, o, scale = 1, weight = 700) => { setFont(ctx, o, scale, weight); return ctx.measureText(o.text).width; };

// ---------------------------------------------------------------- the ten effects
const EFFECTS = {
  // بازشدن از راست — RTL clip reveal with a traveling cursor.
  reveal(ctx, o) {
    const t = clamp01(o.t / SETTLE), p = easeOut(t), tw = fullWidth(ctx, o), right = o.w / 2 + tw / 2, base = baseLine(o);
    ctx.save(); ctx.beginPath(); ctx.rect(right - tw * p - 1, 0, tw * p + 2, o.h); ctx.clip();
    setFont(ctx, o); ctx.fillStyle = o.colors.ink; ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    if (p < 1 || o.t < HOLD_BLINK) {
      const blink = p >= 1 ? (Math.sin(o.t * Math.PI * 6) > 0 ? 1 : 0.25) : 1;
      ctx.save(); ctx.globalAlpha = blink; ctx.fillStyle = o.colors.accent;
      ctx.fillRect(right - tw * p - o.size * 0.06, base - o.size * 0.86, o.size * 0.07, o.size * 1.08); ctx.restore();
    }
  },

  // بالا آمدن با ماسک — the line rises from behind a mask window.
  mask(ctx, o) {
    const e = easeOut(clamp01(o.t / SETTLE)), base = baseLine(o), off = (1 - e) * o.h * 0.28;
    const top = base - o.size * 1.25, bottom = base + o.size * 0.38;
    ctx.save(); ctx.beginPath(); ctx.rect(o.w * 0.06, top, o.w * 0.88, bottom - top); ctx.clip();
    ctx.globalAlpha = 0.35 + 0.65 * e;
    setFont(ctx, o); ctx.fillStyle = o.colors.ink; ctx.fillText(o.text, o.w / 2, base + off);
    ctx.restore();
    if (e < 1) { ctx.save(); ctx.globalAlpha = (1 - e) * 0.5; ctx.fillStyle = o.colors.accent;
      ctx.fillRect(o.w * 0.06, bottom - 3, o.w * 0.88, 3); ctx.restore(); }
  },

  // محو کلمه‌به‌کلمه — word-by-word fade with a soft rise.
  wordfade(ctx, o) {
    const layout = wordLayout(ctx, o), n = layout.length, base = baseLine(o);
    setFont(ctx, o); ctx.fillStyle = o.colors.ink;
    layout.forEach((it, i) => {
      const s = (i / n) * 0.5, k = easeOut(clamp01((o.t - s) / 0.42));
      if (k <= 0) return;
      ctx.globalAlpha = k;
      ctx.fillText(it.w, it.x, base + (1 - k) * o.h * 0.16);
    });
    ctx.globalAlpha = 1;
  },

  // پاپ کلمات — each word pops in with a small overshoot.
  wordpop(ctx, o) {
    const layout = wordLayout(ctx, o), n = layout.length, base = baseLine(o);
    layout.forEach((it, i) => {
      const s = (i / n) * 0.58, k = easeBack(clamp01((o.t - s) / 0.4));
      if (k <= 0) return;
      ctx.save(); ctx.translate(it.x, base); ctx.scale(k, k);
      ctx.globalAlpha = clamp01(k);
      setFont(ctx, o); ctx.fillStyle = i % 2 ? o.colors.accent : o.colors.ink;
      ctx.fillText(it.w, 0, 0); ctx.restore();
    });
    ctx.globalAlpha = 1;
  },

  // هایلایت — an accent sweep paints over the muted line.
  highlight(ctx, o) {
    const p = easeInOut(clamp01(o.t / SETTLE)), tw = fullWidth(ctx, o), right = o.w / 2 + tw / 2, base = baseLine(o);
    setFont(ctx, o); ctx.fillStyle = o.colors.muted; ctx.fillText(o.text, o.w / 2, base);
    ctx.save(); ctx.beginPath(); ctx.rect(right - tw * p - 1, 0, tw * p + 2, o.h); ctx.clip();
    ctx.fillStyle = o.colors.ink; ctx.fillText(o.text, o.w / 2, base);
    ctx.restore();
    const by = base + o.size * 0.24, bh = Math.max(3, o.size * 0.09);
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = o.colors.accent;
    ctx.fillRect(right - tw, by, tw, bh); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = o.colors.accent;
    ctx.fillRect(right - tw * p, by, tw * p, bh); ctx.restore();
  },

  // شمارنده — Persian digits count up with a filling progress bar.
  counter(ctx, o) {
    const e = easeOut(clamp01(o.t / SETTLE)), target = Number(o.target ?? 1405), value = Math.round(e * target);
    setFont(ctx, o, 1.35); ctx.fillStyle = o.colors.accent;
    ctx.fillText(toFa(value), o.w / 2, o.h / 2 + o.size * 0.42);
    const barW = Math.min(o.w * 0.42, 460), y = o.h / 2 + o.size * 0.95;
    ctx.fillStyle = o.colors.muted; ctx.fillRect(o.w / 2 - barW / 2, y, barW, Math.max(5, o.size * 0.09));
    ctx.fillStyle = o.colors.ink;
    ctx.fillRect(o.w / 2 + barW / 2 - barW * e, y, barW * e, Math.max(5, o.size * 0.09));
    if (o.sub) { setFont(ctx, o, 0.32, 500); ctx.fillStyle = o.colors.muted; ctx.fillText(o.sub, o.w / 2, y + o.size * 0.62); }
  },

  // ماشین‌نویس — grapheme-stepped reveal of the already-shaped string, with a block caret.
  typewriter(ctx, o) {
    const p = clamp01(o.t / SETTLE), tw = fullWidth(ctx, o), right = o.w / 2 + tw / 2, base = baseLine(o);
    const steps = Math.max(8, Math.round(String(o.text).length * 1.6));
    const stepped = Math.ceil(p * steps) / steps;
    ctx.save(); ctx.beginPath(); ctx.rect(right - tw * stepped - 1, 0, tw * stepped + 2, o.h); ctx.clip();
    setFont(ctx, o); ctx.fillStyle = o.colors.ink; ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    if (p < 1) { ctx.fillStyle = o.colors.accent; ctx.fillRect(right - tw * stepped - o.size * 0.05, base - o.size * 0.82, o.size * 0.5, o.size * 0.1); }
    else if (o.t < HOLD_BLINK && Math.sin(o.t * Math.PI * 6) > 0) { ctx.fillStyle = o.colors.accent; ctx.fillRect(right - o.size * 0.05, base - o.size * 0.82, o.size * 0.5, o.size * 0.1); }
  },

  // نوشتن با قلم — an ink sweep with a nib riding the reveal edge.
  inktrace(ctx, o) {
    const t = clamp01(o.t / SETTLE), p = easeInOut(t), tw = fullWidth(ctx, o), right = o.w / 2 + tw / 2, base = baseLine(o);
    ctx.save(); ctx.beginPath(); ctx.rect(right - tw * p - 1, 0, tw * p + 2, o.h); ctx.clip();
    setFont(ctx, o, 1, 500); ctx.fillStyle = o.colors.ink; ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    if (p > 0 && p < 1) {
      const x = right - tw * p, wob = Math.sin(t * Math.PI * 5) * o.size * 0.05;
      ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = o.colors.ink; ctx.lineWidth = o.size * 0.05; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, base - o.size * 0.55); ctx.quadraticCurveTo(x - tw * 0.02, base - o.size * 0.2 + wob, x, base + o.size * 0.18); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = o.colors.accent; ctx.strokeStyle = o.colors.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, base - o.size * 0.34, o.size * 0.075, o.size * 0.14, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },

  // کلمات پرنده — words arrive from depth and settle into the line.
  flyingwords(ctx, o) {
    const layout = wordLayout(ctx, o), n = layout.length, base = baseLine(o), r = rng(hashStr(o.text + o.family));
    layout.forEach((it, i) => {
      const s = (i / n) * 0.55, k = easeOut(clamp01((o.t - s) / 0.45));
      if (k <= 0) return;
      const dir = r() > 0.5 ? 1 : -1, z = 1 + (1 - k) * 1.6, rot = (1 - k) * dir * 0.35;
      ctx.save(); ctx.translate(it.x, base + (1 - k) * (r() - 0.3) * o.h * 0.4);
      ctx.rotate(rot); ctx.scale(z, z); ctx.globalAlpha = k;
      setFont(ctx, o); ctx.fillStyle = i % 3 === 1 ? o.colors.accent : o.colors.ink;
      ctx.fillText(it.w, 0, 0); ctx.restore();
    });
    ctx.globalAlpha = 1;
  },

  // گلیچ — RGB-split bursts that resolve into a stable line.
  glitch(ctx, o) {
    const t = clamp01(o.t), p = clamp01(o.t / SETTLE), base = baseLine(o), r = rng(hashStr(o.family + o.text));
    const bursts = Array.from({ length: 6 }, (_, i) => 0.08 + i * (SETTLE / 6) + r() * 0.05);
    const amp = bursts.reduce((a, b) => a + (Math.abs(t - b) < 0.045 ? 1 - Math.abs(t - b) / 0.045 : 0), 0) * (1 - easeOut(p)) + (1 - easeOut(p)) * 0.12;
    const slices = 5, sh = o.h / slices;
    setFont(ctx, o);
    if (amp > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = Math.min(0.85, amp); ctx.fillStyle = o.colors.glitchA ?? "#ff5470";
      ctx.fillText(o.text, o.w / 2 - amp * o.size * 0.09, base - amp * o.size * 0.05);
      ctx.fillStyle = o.colors.glitchB ?? "#37d3c8";
      ctx.fillText(o.text, o.w / 2 + amp * o.size * 0.09, base + amp * o.size * 0.05);
      ctx.restore();
    }
    for (let i = 0; i < slices; i++) {
      const off = amp > 0.02 ? (r() - 0.5) * amp * o.size * 0.35 : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(0, i * sh, o.w, sh + 1); ctx.clip();
      ctx.globalAlpha = amp > 0.02 ? 0.92 : 1;
      ctx.fillStyle = o.colors.ink; ctx.fillText(o.text, o.w / 2 + off, base);
      ctx.restore();
    }
  },
};

export const EFFECT_KEYS = Object.keys(EFFECTS);

/**
 * Paint one effect into a canvas 2D context.
 * o = { key, t, w, h, size, family, text, colors:{bg,ink,accent,muted}, paintBg, target, sub }
 * Colors fall back to the library's ink/paper palette.
 */
export function drawEffect(ctx, o) {
  const fn = EFFECTS[o.key];
  if (!fn) return;
  const colors = { bg: "#101826", ink: "#f2f5fa", accent: "#ffb547", muted: "#4a5873", ...(o.colors || {}) };
  const env = { ...o, colors };
  if (o.paintBg !== false && colors.bg !== "transparent") { ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, o.w, o.h); }
  fn(ctx, env);
}

/** Scale a font size so long lines still fit the canvas. */
export function fitSize(ctx, o) {
  let size = o.size;
  for (let i = 0; i < 14; i++) {
    setFont(ctx, { ...o, size }, 1, o.weight ?? 700);
    const w = ctx.measureText(o.text).width;
    if (w <= o.w * 0.86) break;
    size *= Math.max(0.72, (o.w * 0.86) / w);
  }
  return size;
}

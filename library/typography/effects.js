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

// ---------------------------------------------------------------- Persian joined-group kit
// Persian joining: these letters never join FORWARD, so they always end a group.
const NON_JOINERS = "اآأإدذرزژو";
const DIGITS = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩0123456789";
/** Split text into connected letter groups (+ " " separators) so per-group motion never breaks a join. */
const joinedGroups = (text) => {
  const out = []; let cur = "";
  for (const ch of String(text)) {
    if (ch === " ") { if (cur) { out.push(cur); cur = ""; } out.push(" "); continue; }
    if (ch === "\u200c") { if (cur) { out.push(cur); cur = ""; } continue; }
    cur += ch;
    if (NON_JOINERS.includes(ch) || DIGITS.includes(ch)) { out.push(cur); cur = ""; }
  }
  if (cur) out.push(cur);
  return out;
};
/** RTL layout of joined groups (falls back to words for Latin), x = group centre. */
const groupLayout = (ctx, o, scale = 1, weight = 700) => {
  setFont(ctx, o, scale, weight);
  const parts = /[\u0600-\u06FF]/.test(String(o.text)) ? joinedGroups(o.text) : String(o.text).split(/(\s+)/).filter(Boolean);
  const items = parts.map((g) => ({ g, w: g === " " ? ctx.measureText(" ").width : ctx.measureText(g).width }));
  const total = items.reduce((a, it) => a + it.w, 0);
  let xr = o.w / 2 + total / 2;
  return items.map((it) => { const x = xr - it.w / 2; xr -= it.w; return { ...it, x }; });
};
// Offscreen raster cache — per-group sprites and dot-split word rasters, 2× for crispness.
const RASTER_SCALE = 2;
const spriteCache = new Map();
const cachePut = (k, v) => { if (spriteCache.size > 90) spriteCache.clear(); spriteCache.set(k, v); return v; };
const lerpK = (p, a, b) => a + (b - a) * clamp01(p);
const spriteKey = (o, text) => [text, o.family, Math.round(o.size), o.weight ?? 700].join("|");
/** Raster one string (usually a joined group) into a tight sprite canvas, pre-tinted. */
const groupSprite = (ctx, o, text, color) => {
  const k = spriteKey(o, text) + "|" + (color || "");
  const hit = spriteCache.get(k); if (hit) return hit;
  setFont(ctx, o, 1, o.weight ?? 700);
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  const h = Math.ceil(o.size * 2.1);
  const c = document.createElement ? document.createElement("canvas") : null;
  if (!c) return null; // no DOM (defensive) — callers fall back to direct fillText
  c.width = w * RASTER_SCALE; c.height = h * RASTER_SCALE;
  const c2 = c.getContext("2d");
  c2.scale(RASTER_SCALE, RASTER_SCALE);
  c2.font = `${o.weight ?? 700} ${o.size}px "${o.family}"`;
  c2.direction = "rtl"; c2.textAlign = "center"; c2.textBaseline = "alphabetic";
  c2.fillStyle = color || "#fff";
  c2.fillText(text, w / 2, h * 0.74);
  return cachePut(k, { c, w, h, base: h * 0.74 });
};
/** Connected-component analysis of a word raster: body sprite + dot sprites (above/below the join line). */
const dotSplit = (ctx, o, text) => {
  const k = "dots:" + spriteKey(o, text) + "|" + (o.colors?.ink || "") + (o.colors?.accent || "");
  const hit = spriteCache.get(k); if (hit) return hit;
  setFont(ctx, o, 1, o.weight ?? 700);
  const w = Math.ceil(ctx.measureText(text).width) + 8, h = Math.ceil(o.size * 2.1), base = h * 0.74;
  const c = document.createElement ? document.createElement("canvas") : null;
  if (!c) return null;
  c.width = w * RASTER_SCALE; c.height = h * RASTER_SCALE;
  const c2 = c.getContext("2d", { willReadFrequently: true });
  c2.scale(RASTER_SCALE, RASTER_SCALE);
  c2.font = `${o.weight ?? 700} ${o.size}px "${o.family}"`;
  c2.direction = "rtl"; c2.textAlign = "center"; c2.textBaseline = "alphabetic";
  const inkC = o.colors?.ink || "#f2f5fa", accC = o.colors?.accent || "#ffb547";
  c2.fillStyle = inkC; c2.fillText(text, w / 2, base);
  const img = c2.getImageData(0, 0, c.width, c.height), px = img.data, W = c.width, H = c.height;
  const label = new Int32Array(W * H); const comps = []; let next = 0;
  const stack = new Int32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (!px[p * 4 + 3] || label[p]) continue;
    const id = ++next; let sp = 0; stack[sp++] = p; label[p] = id;
    let minX = W, maxX = 0, minY = H, maxY = 0, area = 0;
    while (sp) {
      const q = stack[--sp], qx = q % W, qy = (q / W) | 0; area++;
      if (qx < minX) minX = qx; if (qx > maxX) maxX = qx; if (qy < minY) minY = qy; if (qy > maxY) maxY = qy;
      for (const n of [q - 1, q + 1, q - W, q + W]) {
        if (n < 0 || n >= W * H || label[n] || !px[n * 4 + 3]) continue;
        if ((n === q - 1 && qx === 0) || (n === q + 1 && qx === W - 1)) continue;
        label[n] = id; stack[sp++] = n;
      }
    }
    comps.push({ id, area, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  }
  const sizePx = o.size * RASTER_SCALE;
  const dots = comps.filter((cp) => cp.w < sizePx * 0.32 && cp.h < sizePx * 0.32 && cp.area < sizePx * sizePx * 0.045);
  const dotSet = new Set(dots.map((d) => d.id));
  const body = c2.createImageData(W, H); const bodyPx = body.data;
  const bodyC = document.createElement("canvas"); bodyC.width = W; bodyC.height = H;
  const bodyCtx = bodyC.getContext("2d");
  const accRGB = hexRGB(accC), inkRGB = hexRGB(inkC);
  for (let p = 0; p < W * H; p++) if (px[p * 4 + 3] && !dotSet.has(label[p])) { bodyPx[p * 4] = inkRGB[0]; bodyPx[p * 4 + 1] = inkRGB[1]; bodyPx[p * 4 + 2] = inkRGB[2]; bodyPx[p * 4 + 3] = px[p * 4 + 3]; }
  bodyCtx.putImageData(body, 0, 0);
  const sprites = dots.map((d) => {
    const dc = document.createElement("canvas"); dc.width = d.w; dc.height = d.h;
    const dctx = dc.getContext("2d"); const di = dctx.createImageData(d.w, d.h); const dp = di.data;
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const s = ((d.y + y) * W + (d.x + x)) * 4, t = (y * d.w + x) * 4;
      if (label[(d.y + y) * W + (d.x + x)] === d.id && px[s + 3]) { dp[t] = accRGB[0]; dp[t + 1] = accRGB[1]; dp[t + 2] = accRGB[2]; dp[t + 3] = px[s + 3]; }
    }
    dctx.putImageData(di, 0, 0);
    const cx = (d.x + d.w / 2) / RASTER_SCALE, cy = (d.y + d.h / 2) / RASTER_SCALE;
    return { c: dc, x: cx, y: cy, w: d.w / RASTER_SCALE, h: d.h / RASTER_SCALE, above: cy < base - o.size * 0.16 };
  });
  return cachePut(k, { body: bodyC, dots: sprites, w, h, base });
};
const hexRGBLate = null;
const hexRGB = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [242, 245, 250];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
////----------------------------------------------------------------------------------------------

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
/** تایپِ واژه‌به‌واژه — هر واژه جداگانه رسم می‌شود تا اتصال حروف هرگز نشکند.
 *  (برش clip که از روی جوهر حروف فارسی رد شود، شکل‌دهی کل خط را در کروم می‌شکند؛
 *  پس افکت‌های «تایپ‌شدنی» با فید واژه‌ها کار می‌کنند، نه با clip روی رشتهٔ کامل.)
 *  برمی‌گرداند: لبهٔ چپِ متنِ نمایان (جای نشانگر) و عرض کل. */
const wordReveal = (ctx, o, { p, xRight, y, scale = 1, weight = 700, color, rise = 0.14 }) => {
  setFont(ctx, o, scale, weight);
  const words = String(o.text).split(" ").filter(Boolean);
  const ws = words.map((w) => ctx.measureText(w).width);
  const spw = ctx.measureText(" ").width;
  const n = words.length;
  const prog = clamp01(p) * n;
  ctx.save();
  ctx.direction = "rtl"; ctx.textAlign = "right";
  let xr = xRight;
  for (let i = 0; i < n; i++) {
    const k = clamp01(prog - i);
    if (k > 0) {
      const kk = k >= 1 ? 1 : easeOut(k);
      ctx.globalAlpha = kk;
      ctx.fillStyle = color;
      ctx.fillText(words[i], xr, y + (1 - kk) * o.size * scale * rise);
      ctx.globalAlpha = 1;
    }
    xr -= ws[i] + spw;
  }
  ctx.restore();
  const shown = Math.min(n, Math.ceil(prog - 1e-6) || (prog > 0 ? 1 : 0));
  let edge = xRight;
  for (let i = 0; i < shown; i++) edge -= ws[i] + spw;
  return { edge, totalW: ws.reduce((a, b) => a + b, 0) + spw * Math.max(0, n - 1), n };
};

// ---------------------------------------------------------------- the ten effects
export const EFFECTS = {
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

  // ماشین‌نویس — word-stepped reveal (اتصال حروف هرگز نمی‌شکند) با نشانگر بلوکی عمودی روی لبهٔ تایپ.
  typewriter(ctx, o) {
    const p = clamp01(o.t / SETTLE), base = baseLine(o);
    const tw = fullWidth(ctx, o), xRight = o.w / 2 + tw / 2;
    const caretW = o.size * 0.09, caretH = o.size * 1.04;
    const { edge, totalW } = wordReveal(ctx, o, { p, xRight, y: base, color: o.colors.ink });
    const blinkOn = Math.sin(o.t * Math.PI * 7) > -0.25;
    if (p < 1) {
      if (blinkOn) { ctx.fillStyle = o.colors.accent; ctx.fillRect(edge - caretW - o.size * 0.05, base - caretH * 0.78, caretW, caretH); }
    } else if (o.t < HOLD_BLINK && blinkOn) {
      ctx.fillStyle = o.colors.accent;
      ctx.fillRect(o.w / 2 - totalW / 2 - caretW - o.size * 0.05, base - caretH * 0.78, caretW, caretH);
    }
  },

  // نوشتن با قلم — ink fade واژه‌به‌واژه با نوک قلم سوار بر لبهٔ نمایان (بدون clip روی متن).
  inktrace(ctx, o) {
    const t = clamp01(o.t / SETTLE), p = easeInOut(t), base = baseLine(o);
    const tw = fullWidth(ctx, o, 1, 500), xRight = o.w / 2 + tw / 2;
    const { edge } = wordReveal(ctx, o, { p, xRight, y: base, scale: 1, weight: 500, color: o.colors.ink, rise: 0.07 });
    if (p > 0.02 && p < 1) {
      const wob = Math.sin(t * Math.PI * 5) * o.size * 0.05;
      ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = o.colors.ink; ctx.lineWidth = o.size * 0.05; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(edge, base - o.size * 0.55); ctx.quadraticCurveTo(edge - tw * 0.02, base - o.size * 0.2 + wob, edge, base + o.size * 0.18); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = o.colors.accent; ctx.strokeStyle = o.colors.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(edge - o.size * 0.1, base - o.size * 0.34, o.size * 0.075, o.size * 0.14, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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

  // ------------------------------------------------------------------ video-shotcraft ports
  // ورود نرم سه‌کاناله — words surface from defocus; y/blur/opacity share ONE progress (blur-slide).
  blurslide(ctx, o) {
    const line = (text, win0, gap, dyS, baseY, sc, wt, col) => {
      const layout = wordLayout(ctx, { ...o, text }, sc, wt);
      layout.forEach((it, i) => {
        const p = easeOut(clamp01((o.t - (win0 + i * gap)) / 0.32));
        if (p <= 0) return;
        const b = (1 - p) * 10 * (o.size / 56);
        ctx.save(); ctx.globalAlpha = p;
        if (b > 0.3) ctx.filter = `blur(${b.toFixed(2)}px)`;
        setFont(ctx, o, sc, wt); ctx.fillStyle = col;
        ctx.fillText(it.w, it.x, baseY + (1 - p) * o.size * dyS);
        ctx.restore();
      });
    };
    const sub = o.sub || "پیش‌نمایش زندهٔ تایپوگرافی";
    line(o.text, 0.06, 0.055, 0.72, baseLine(o) - o.size * 0.16, 1, 700, o.colors.ink);
    line(sub, 0.34, 0.04, 0.5, baseLine(o) + o.size * 0.86, 0.42, 400, o.colors.muted);
  },

  // پردهٔ آکولاد — braces snap open with an overshoot; the title width is bound to their span (brace-expand).
  brace(ctx, o) {
    const on = o.t >= 0.07 ? 1 : 0;
    const ex = easeBack(clamp01((o.t - 0.13) / 0.21));
    const sc = 0.6 + 0.4 * ex;
    // آکولادها به عرضِ واقعیِ متن می‌چسبند (نه فاصلهٔ ثابت از لبه)
    const tw = fullWidth(ctx, o, 1, 700) * sc;
    const x = tw / 2 + o.size * 0.34 * sc;
    const bsize = o.size * 1.02 * sc;
    const clipW = Math.max(0, x * 2 - bsize * 1.2);
    ctx.save(); ctx.beginPath();
    ctx.rect(o.w / 2 - clipW / 2, baseLine(o) - o.size * 1.5, clipW, o.size * 2.2);
    ctx.clip(); ctx.globalAlpha = on;
    setFont(ctx, o, 1, 700); ctx.fillStyle = o.colors.ink;
    ctx.save(); ctx.translate(o.w / 2, baseLine(o)); ctx.scale(sc, sc);
    ctx.fillText(o.text, 0, 0); ctx.restore();
    ctx.restore();
    for (const [ch, dx] of [["{", -x], ["}", x]]) {
      if (!on) continue;
      ctx.save();
      ctx.font = `${800} ${bsize}px "${o.family}"`; ctx.direction = "ltr";
      ctx.textAlign = "center"; ctx.fillStyle = o.colors.accent;
      ctx.fillText(ch, o.w / 2 + dx, baseLine(o) + bsize * 0.35);
      ctx.restore();
    }
  },

  // کوبش سلیولویدی — one word per hard beat: punch-scale settle + 2-frame background strobe (cel-flash-stomp).
  stomp(ctx, o) {
    const words = (o.words && o.words.length ? o.words : String(o.text).split(" ").filter(Boolean)).slice(0, 4);
    const n = words.length, T0 = 0.08, STEP = 0.24;
    let idx = -1, local = 0;
    if (o.t >= T0) { idx = Math.min(n - 1, Math.floor((o.t - T0) / STEP)); local = o.t - (T0 + idx * STEP); }
    if (idx >= 0) {
      const flashing = local < 0.05 && Math.floor(local * 132 / 2) % 2 === 0;
      if (flashing) { ctx.fillStyle = o.colors.strobe || "#1c2740"; ctx.fillRect(0, 0, o.w, o.h); }
      const p = 1 - Math.pow(1 - clamp01(local / 0.09), 5); // poly(5) hard settle
      const scale = 0.9 + 0.1 * p, r = idx === 0 ? 0 : (rng(hashStr(words[idx]))() - 0.5) * 0.05 * (1 - p);
      ctx.save(); ctx.translate(o.w / 2, o.h / 2 + o.size * 0.36);
      ctx.rotate(r); ctx.scale(scale, scale);
      setFont(ctx, o, 1.5, 800); ctx.fillStyle = idx === n - 1 ? o.colors.accent : o.colors.ink;
      ctx.fillText(words[idx], 0, 0);
      ctx.restore();
    }
    const labelP = easeOut(clamp01((o.t - (T0 + (n - 1) * STEP)) / 0.12));
    if (labelP > 0) {
      const bh = o.h * 0.1, y = o.h - bh * labelP;
      ctx.save(); ctx.fillStyle = o.colors.ink; ctx.globalAlpha = 0.92 * labelP;
      ctx.fillRect(0, y, o.w, bh); ctx.globalAlpha = 1;
      ctx.fillStyle = o.colors.bg; ctx.direction = "rtl"; ctx.textAlign = "right";
      ctx.font = `700 ${o.size * 0.3}px "${o.family}"`;
      ctx.fillText("پرشین‌دودل · استودیوی موشن", o.w - o.w * 0.06, y + bh * 0.63);
      ctx.restore();
    }
  },

  // رمزگشایی — per-GROUP scramble locking right→left with a glow flash (scramble; joining never breaks).
  scramble(ctx, o) {
    const POOL = "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی۰۱۲۳۴۵۶۷۸۹#$&*";
    const layout = groupLayout(ctx, o).filter(it => it.g !== " ");
    const fr2 = Math.floor(o.t * 75);
    layout.forEach((it, i) => {
      if (o.t < 0.06) return;
      const lockAt = 0.22 + (i / Math.max(1, layout.length)) * 0.58 + (rng(hashStr(o.text + i))() - 0.5) * 0.06;
      if (o.t < lockAt) {
        const ch = POOL[Math.floor(rng(hashStr(o.text + i * 131 + fr2))() * POOL.length)];
        setFont(ctx, o, 1); ctx.fillStyle = o.colors.muted;
        ctx.fillText(ch, it.x, baseLine(o));
      } else {
        const flash = 1 - clamp01((o.t - lockAt) / 0.1);
        ctx.save();
        if (flash > 0.05) { ctx.shadowColor = o.colors.accent; ctx.shadowBlur = flash * o.size * 0.45; }
        setFont(ctx, o, 1); ctx.fillStyle = o.colors.ink;
        ctx.fillText(it.g, it.x, baseLine(o));
        ctx.restore();
      }
    });
  },

  // تابلوی فرودگاه — split-flap cells flip through garble and click into place, cascading RTL (split-flap-title).
  splitflap(ctx, o) {
    const POOL = "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی۰۱۲۳۴۵۶۷۸۹";
    const rndS = (a) => { const x = Math.sin(a * 127.3) * 43758.5453; return x - Math.floor(x); };
    const garble = (i, k) => POOL[Math.floor(rndS(i * 7.13 + k * 3.71 + 1) * POOL.length)];
    const groups = groupLayout(ctx, o, 0.78).filter(it => it.g !== " ");
    const cellH = o.size * 1.5, cy = o.h / 2 - cellH / 2 + o.size * 0.18;
    const START = 0.16, STAGGER = 0.028, FLIP = 0.036, NFLIP = 3;
    // چیدمان دوبارهٔ سلول‌ها با گپ واقعی — پس‌زمینهٔ سلولِ بعدی هرگز روی حرفِ سلولِ قبل نمی‌نشیند
    const PAD = o.size * 0.3, GAP = Math.max(3, o.size * 0.055);
    const cws = groups.map((it) => Math.max(it.w + PAD, o.size * 0.82));
    const totalW = cws.reduce((a, b) => a + b, 0) + GAP * (groups.length - 1);
    let xr = o.w / 2 + totalW / 2;
    const cells = groups.map((it, i) => { const cw = cws[i]; const cx = xr - cw; xr -= cw + GAP; return { ...it, cx, cw, i }; });
    // گذر ۱ — همهٔ بدنه‌های سلول
    for (const c of cells) {
      ctx.fillStyle = "#141412"; ctx.fillRect(c.cx - 1.5, cy - 1.5, c.cw + 3, cellH + 3);
      ctx.fillStyle = "#232320"; ctx.fillRect(c.cx, cy, c.cw, cellH);
      ctx.fillStyle = "#0d0d0b"; ctx.fillRect(c.cx, cy + cellH / 2 - 1.5, c.cw, 3);
    }
    // گذر ۲ — نیمه‌های حروف و برگهٔ فلپ
    for (const c of cells) {
      const { g: fin, cx, cw, i } = c;
      const seq = [garble(i, 0), garble(i, 1), garble(i, 2), fin];
      const local = o.t - (START + i * STAGGER);
      const done = local >= NFLIP * FLIP;
      let clickY = 0;
      if (done) {
        const cp = clamp01((local * 132 - 15) / 7);
        clickY = cp < 0.5 ? cp * 2 * o.size * 0.06 : Math.max(0, (1 - (cp - 0.5) * 2)) * o.size * 0.06 - o.size * 0.015 * Math.max(0, 1 - Math.abs(cp - 0.75) * 4);
      }
      let topCh = seq[0], botCh = seq[0], leaf = null;
      if (done) topCh = botCh = fin;
      else if (local > 0) {
        const k = Math.min(NFLIP - 1, Math.floor(local / FLIP));
        const p = Math.pow(clamp01((local - k * FLIP) / FLIP), 2);
        topCh = seq[k + 1]; botCh = seq[k];
        const isTop = p < 0.5;
        const ang = isTop ? p * 2 * Math.PI / 2 : Math.PI / 2 - (p - 0.5) * 2 * Math.PI / 2;
        leaf = { ch: isTop ? seq[k] : seq[k + 1], isTop, cos: Math.cos(ang), bright: isTop ? 1 - p * 2 * 0.45 : 0.55 + (p - 0.5) * 2 * 0.45 };
      }
      ctx.save(); ctx.translate(0, clickY);
      const drawHalf = (ch, top) => {
        ctx.save(); ctx.beginPath();
        ctx.rect(cx, top ? cy : cy + cellH / 2, cw, cellH / 2 + 1);
        ctx.clip();
        setFont(ctx, o, 0.78, 700); ctx.fillStyle = o.colors.ink;
        ctx.fillText(ch, cx + cw / 2, cy + cellH / 2 + o.size * 0.34);
        ctx.restore();
      };
      drawHalf(topCh, true); drawHalf(botCh, false);
      if (leaf) {
        ctx.save();
        const hinge = cy + cellH / 2;
        ctx.beginPath(); ctx.rect(cx, leaf.isTop ? cy : cy + cellH / 2, cw, cellH / 2); ctx.clip();
        ctx.translate(0, hinge); ctx.scale(1, Math.max(0.04, Math.abs(leaf.cos))); ctx.translate(0, -hinge);
        setFont(ctx, o, 0.78, 700);
        ctx.fillStyle = o.colors.ink; ctx.globalAlpha = 0.35 + 0.65 * leaf.bright;
        ctx.fillText(leaf.ch, cx + cw / 2, cy + cellH / 2 + o.size * 0.34);
        ctx.restore();
      }
      ctx.restore();
    }
  },

  // پرکردن دورخط — dashed circle shrinks in, outlined word pops to solid with a flash (outline-word-fill).
  outlinefill(ctx, o) {
    const light = { bg: "#f5f6f8", ink: "#17181c", accent: o.colors.accent, muted: "#7d838e" };
    ctx.fillStyle = light.bg; ctx.fillRect(0, 0, o.w, o.h);
    // ورود زودتر: دایره و واژهٔ دورخط از همان ابتدا حاضرند؛ پرشدن با ضربِ کوتاه
    const shrink = easeOut(clamp01(o.t / 0.22)), born = easeOut(clamp01((o.t - 0.08) / 0.16));
    const zoom = lerpK(shrink, 3.2, 1), pop = easeOut(clamp01((o.t - 0.52) / 0.13));
    const flash = 1 - clamp01((o.t - 0.65) / 0.12), ext = easeOut(clamp01((o.t - 0.1) / 0.2));
    ctx.save(); ctx.translate(o.w / 2, o.h / 2);
    ctx.strokeStyle = light.muted; ctx.lineWidth = Math.max(1, o.size * 0.02);
    ctx.setLineDash([o.size * 0.12, o.size * 0.16]);
    ctx.globalAlpha = 0.8 * born;
    ctx.save(); ctx.rotate(o.t * 0.5); ctx.scale(lerpK(shrink, 2.8, 1), lerpK(shrink, 2.8, 1));
    ctx.beginPath(); ctx.arc(0, 0, o.size * 1.9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.globalAlpha = ext * 0.9;
    const tspan = fullWidth(ctx, o, 1.1, 500) * zoom * 0.62; // keep side dashes clear of the word
    for (const s of [-1, 1]) {
      const edge = s * o.w * 0.5, inner = s * (o.w * 0.5 - ext * (o.w * 0.5 - tspan - o.size * 0.3));
      ctx.beginPath(); ctx.moveTo(edge, 0); ctx.lineTo(inner, 0); ctx.stroke();
    }
    ctx.restore();
    const base = baseLine(o) + o.size * 0.36;
    ctx.save(); ctx.translate(o.w / 2, base); ctx.scale(zoom, zoom);
    setFont(ctx, o, 1.1, 500);
    ctx.strokeStyle = light.ink; ctx.lineWidth = Math.max(1, o.size * 0.022); ctx.lineJoin = "round";
    // دورخط با ورود محو می‌شود و پرشدن جای آن را می‌گیرد (بدون دو‌نمایی)
    ctx.globalAlpha = born * (1 - pop); ctx.strokeText(o.text, 0, 0);
    if (pop > 0) {
      if (flash > 0.02) { ctx.shadowColor = "#ffffff"; ctx.shadowBlur = flash * o.size * 0.35; }
      ctx.globalAlpha = born * pop; ctx.fillStyle = light.ink; ctx.fillText(o.text, 0, 0);
    }
    ctx.restore();
    void light.muted;
  },

  // کارت کاغذی — serif words settle onto warm paper, a rule draws beneath, caption follows (paper-title-card).
  papercard(ctx, o) {
    ctx.fillStyle = "#f7f2e7"; ctx.fillRect(0, 0, o.w, o.h);
    const g = ctx.createRadialGradient(o.w / 2, o.h * 0.42, o.h * 0.1, o.w / 2, o.h * 0.42, o.w * 0.75);
    g.addColorStop(0, "rgba(255,253,246,0.85)"); g.addColorStop(1, "rgba(255,253,246,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, o.w, o.h);
    const words = wordLayout(ctx, { ...o, text: o.text }, 1, 600), base = baseLine(o);
    const accentIdx = words.length - 1;
    words.forEach((it, i) => {
      const p = 1 - Math.pow(1 - clamp01((o.t - (0.04 + i * 0.045)) / 0.14), 3);
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = p;
      const b = (1 - p) * 7 * (o.size / 56);
      if (b > 0.3) ctx.filter = `blur(${b.toFixed(2)}px)`;
      setFont(ctx, o, 1, 600); ctx.translate(it.x, base); ctx.scale(1.28 - 0.28 * p, 1.28 - 0.28 * p);
      ctx.fillStyle = i === accentIdx ? "#a4552f" : "#2e2a24";
      ctx.fillText(it.w, 0, 0); ctx.restore();
    });
    const up = Math.pow(clamp01((o.t - 0.34) / 0.2), 1.2) * (0.3 + 0.7 * clamp01((o.t - 0.34) / 0.2));
    const uw = o.w * 0.3, ux = o.w / 2 - uw / 2;
    ctx.save(); ctx.fillStyle = "#a4552f"; ctx.globalAlpha = up > 0 ? 1 : 0;
    ctx.beginPath(); ctx.roundRect(o.w / 2 - (uw / 2) * up, base + o.size * 0.72, uw * up, Math.max(4, o.size * 0.09), o.size * 0.045); ctx.fill();
    ctx.restore();
    const subP = clamp01((o.t - 0.5) / 0.12);
    if (subP > 0 && o.sub) {
      ctx.save(); ctx.globalAlpha = subP; setFont(ctx, o, 0.32, 500);
      ctx.fillStyle = "#8a8378"; ctx.fillText(o.sub, o.w / 2, base + o.size * 1.35); ctx.restore();
    }
    void ux;
  },

  // خط ماژیک — title rises, then a marker band draws itself under the key word, RTL (marker-underline-title).
  markerline(ctx, o) {
    ctx.fillStyle = "#f4f4f2"; ctx.fillRect(0, 0, o.w, o.h);
    const enter = clamp01(o.t / 0.35), eo = 1 - Math.pow(1 - enter, 3);
    const base = baseLine(o) + (1 - eo) * o.size * 0.6;
    ctx.save(); ctx.globalAlpha = Math.min(1, enter * 1.6);
    setFont(ctx, o, 1.15, 800); ctx.fillStyle = "#191919";
    ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    const draw = 1 - Math.pow(1 - clamp01((o.t - 0.5) / 0.22), 2.2);
    if (draw > 0) {
      const words = wordLayout(ctx, { ...o, text: o.text }, 1.15, 800);
      const it = words[Math.min(1, words.length - 1)]; // the second (read) word carries the stroke
      const len = it.width * 1.12, right = it.x + it.width * 0.56, y = base + o.size * 0.5;
      const th = o.size * 0.14;
      ctx.save(); ctx.beginPath();
      ctx.rect(right - len - 2, y - th * 1.6, len * draw + 4, th * 3.2); ctx.clip();
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.moveTo(right, y);
      ctx.quadraticCurveTo(right - len * 0.5, y - th * 0.55, right - len, y + th * 0.1);
      ctx.lineTo(right - len, y + th);
      ctx.quadraticCurveTo(right - len * 0.5, y + th * 1.5, right, y + th * 1.05);
      ctx.closePath(); ctx.fill();
      if (draw < 1) { ctx.beginPath(); ctx.ellipse(right - len * draw, y + th * 0.5, th * 0.34, th * 0.62, 0.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  },

  // موج گرادیان — a luminous gradient fills the word with a bright wavefront and settling glow (gradient-word-sweep).
  sweep(ctx, o) {
    const p = easeInOut(clamp01(o.t / 0.55));
    const gl = clamp01((o.t - 0.5) / 0.2);
    const base = baseLine(o), tw = fullWidth(ctx, o, 1.25), right = o.w / 2 + tw / 2;
    setFont(ctx, o, 1.25, 800);
    ctx.save(); ctx.fillStyle = o.colors.muted; ctx.globalAlpha = 0.5;
    ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    const grad = ctx.createLinearGradient(right - tw * p, 0, right, 0);
    grad.addColorStop(0, o.colors.accent); grad.addColorStop(0.55, "#ffd9a8"); grad.addColorStop(1, "#ffffff");
    const layers = [[18, 0.5 * gl, 1.05], [8, 0.62 * gl, 1.15], [3, 0.72 * Math.min(1, gl + 0.1), 1.25]];
    for (const [blur, alpha, bright] of layers) {
      ctx.save(); ctx.beginPath(); ctx.rect(right - tw * p - 2, 0, tw * p + 4, o.h); ctx.clip();
      ctx.globalAlpha = alpha; ctx.filter = `blur(${blur * (o.size / 96)}px) brightness(${bright})`;
      ctx.fillStyle = grad; ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(right - tw * p - 2, 0, tw * p + 4, o.h); ctx.clip();
    ctx.fillStyle = grad; ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    if (p > 0 && p < 1) { // bright head at the wavefront
      const hx = right - tw * p;
      ctx.save(); ctx.beginPath(); ctx.rect(hx, 0, tw * 0.08, o.h); ctx.clip();
      ctx.filter = `blur(2px)`; ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#fff"; ctx.shadowColor = o.colors.accent; ctx.shadowBlur = o.size * 0.5;
      ctx.fillText(o.text, o.w / 2, base); ctx.restore();
    }
    // after-fill bolts: occasional seeded lightning over the settled word
    if (p >= 1 && Math.sin(o.t * 40) > 0.86) {
      const r = rng(hashStr(o.text + Math.floor(o.t * 30)));
      ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = "#ffd8f2"; ctx.lineWidth = o.size * 0.02; ctx.lineJoin = "miter";
      let x = right - tw * r(), y = base - o.size * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i < 5; i++) { x += (r() - 0.5) * tw * 0.12; y += o.size * (0.16 + r() * 0.2); ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
    }
  },

  // زوم کلمهٔ پیشرو — the lead word recedes from a push-in while the rest assemble behind it (lead-word-zoom-assemble).
  leadzoom(ctx, o) {
    const words = wordLayout(ctx, o), lead = words[0], rest = words.slice(1), base = baseLine(o);
    const lift = easeOut(clamp01(o.t / 0.3));
    const leadP = easeOut(clamp01((o.t - 0.06) / 0.4));
    const crash = Math.pow(clamp01((o.t - 0.86) / 0.14), 2);
    ctx.save();
    ctx.translate(o.w / 2, o.h / 2);
    ctx.scale(1 + crash * 0.28, 1 + crash * 0.28);
    ctx.translate(-o.w / 2, -o.h / 2);
    ctx.globalAlpha = 1 - crash * 0.4;
    if (crash > 0.05) ctx.filter = `blur(${(crash * o.size * 0.18).toFixed(1)}px)`;
    if (lead) {
      const sc = lerpK(leadP, 2.4, 1);
      ctx.save(); ctx.globalAlpha *= clamp01(o.t / 0.12);
      ctx.translate(lead.x, base + (1 - lift) * o.h * 0.1); ctx.scale(sc, sc);
      setFont(ctx, o, 1, 800); ctx.fillStyle = o.colors.accent;
      ctx.fillText(lead.w, 0, 0); ctx.restore();
    }
    rest.forEach((it, i) => {
      const s = 0.34 + i * 0.055, p = easeOut(clamp01((o.t - s) / 0.22));
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha *= p;
      setFont(ctx, o, 1, 700); ctx.fillStyle = o.colors.ink;
      ctx.fillText(it.w, it.x + (1 - p) * o.size * 0.9, base + (1 - lift) * o.h * 0.1);
      ctx.restore();
    });
    if (o.sub) {
      ctx.save(); ctx.globalAlpha *= lift * (1 - crash);
      setFont(ctx, o, 0.34, 500); ctx.fillStyle = o.colors.muted;
      ctx.fillText(o.sub, o.w / 2, base + o.size * 0.95 + (1 - lift) * 16); ctx.restore();
    }
    ctx.restore();
  },

  // شمارش معکوس قوسی — a digit arc sweeps to rest, the target digit flies into the headline (countdown-arc-scatter).
  countdown(ctx, o) {
    ctx.fillStyle = "#f7f7f5"; ctx.fillRect(0, 0, o.w, o.h);
    const INK = "#17181c", ACC = o.colors.accent;
    const rot = lerpK(easeOut(clamp01(o.t / 0.52)), 96, 0); // degrees
    const hand = (() => { const p = clamp01((o.t - 0.52) / 0.18); return p * p * (3 - 2 * p); })();
    const out = Math.pow(clamp01((o.t - 0.5) / 0.2), 2);
    const px = o.w / 2, py = o.h * 0.52, R0 = o.h * 0.3, SP = 16;
    const title = wordLayout(ctx, { ...o, text: o.text || "ثانیه تا انتشار" }, 0.9, 700);
    const titleW = title.reduce((a, it) => a + it.width, 0);
    const tx = o.w / 2 + titleW * 0.5 * 0.9 + o.size * 0.55, ty = py - o.size * 0.28; // the digit lands at the title's RIGHT end (start of RTL reading)
    ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "ltr";
    "۵۴۳۲۱۰".split("").forEach((n, i) => {
      const is5 = i === 0;
      const pa = (i - 3) * SP + rot, rad = pa * Math.PI / 180;
      let x = Math.sin(rad) * R0, y = -Math.cos(rad) * R0, rSelf = pa, op = Math.max(0, Math.min(1, (70 - Math.abs(pa)) / 22));
      if (is5) { x = lerpK(hand, x, tx - px); y = lerpK(hand, y, ty - py); rSelf *= 1 - hand; }
      else op *= 1 - out;
      if (op <= 0.01) return;
      ctx.save(); ctx.globalAlpha = op;
      if (!is5 && out > 0.02) ctx.filter = `blur(${(out * 3 * (o.size / 56)).toFixed(1)}px)`;
      ctx.font = `800 ${o.size * 0.8}px "${o.family}"`;
      ctx.fillStyle = is5 && hand > 0.9 ? ACC : INK;
      ctx.translate(px + x, py + y); ctx.rotate(rSelf * Math.PI / 180);
      ctx.fillText(n, 0, 0); ctx.restore();
    });
    // short tick hand
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot * 0.35 * Math.PI / 180);
    ctx.globalAlpha = 1 - out; ctx.fillStyle = INK;
    ctx.fillRect(-1.5 * (o.size / 56), -o.size * 1.5, 3 * (o.size / 56), o.size * 0.42);
    ctx.restore();
    ctx.restore();
    // headline words appear as the digit lands
    title.forEach((it, k) => {
      const p = easeOut(clamp01((o.t - (0.54 + k * 0.07)) / 0.14));
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = p; setFont(ctx, o, 0.9, 700);
      ctx.fillStyle = k === title.length - 1 && o.t > 0.84 ? ACC : INK;
      ctx.fillText(it.w, it.x + (1 - p) * o.size * 0.4, py + o.size * 0.22);
      ctx.restore();
    });
  },

  // سندِ تایپ‌شونده — paper types its title word-by-word near the top, stub rows file in beneath.
  docwrite(ctx, o) {
    const cardW = o.w * 0.6, cardH = o.h * 0.72, cx = o.w / 2, cy = o.h / 2;
    const inP = easeOut(clamp01(o.t / 0.14));
    ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = inP;
    ctx.scale(0.96 + 0.04 * inP, 0.96 + 0.04 * inP);
    ctx.fillStyle = "#f8f6f0"; ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 10); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#d8d2c4"; ctx.fillRect(-cardW / 2 + 24, -cardH / 2 + 22, cardW * 0.22, 8);
    // عنوانِ تایپی نزدیک بالای برگه — واژه‌به‌واژه با نشانگرِ خطیِ هم‌ارزِ متن
    const p = clamp01((o.t - 0.16) / 0.4), txt = o.text || "گزارش فصل سوم";
    const tSize = o.size * 0.42, right = cardW / 2 - 24, ty = -cardH * 0.3;
    const { edge } = wordReveal(ctx, { ...o, text: txt, size: tSize }, { p, xRight: right, y: ty + tSize * 0.3, color: "#26241f", rise: 0.1 });
    const caretW = tSize * 0.085;
    if (p < 1 && Math.sin(o.t * 26) > -0.3) {
      ctx.fillStyle = o.colors.accent;
      ctx.fillRect(edge - caretW - tSize * 0.06, ty + tSize * 0.3 - tSize * 0.82, caretW, tSize * 0.98);
    }
    // ردیف‌های شاهد
    const rows = [[0.62, 0.9], [0.68, 0.72], [0.74, 0.55]];
    rows.forEach(([s, wFrac], i) => {
      const rp = easeOut(clamp01((o.t - s) / 0.12));
      if (rp <= 0) return;
      const y = ty + tSize * 0.95 + i * tSize * 0.95;
      ctx.globalAlpha = rp * 0.9;
      ctx.fillStyle = i === 0 ? o.colors.accent : "#cfc9ba";
      ctx.beginPath(); ctx.roundRect(-cardW / 2 + 24, y, (cardW - 48) * wFrac * rp, tSize * 0.16, tSize * 0.08); ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  },

  // قرصِ گردان — a stem stays put while a pill chip rolls through its labels, ending on the finale word (pill-slot-cycle).
  pillslot(ctx, o) {
    const words = (o.words && o.words.length ? o.words : ["طراحی", "رندر", "انتشار"]);
    const finale = o.finale || "همه‌چیز.";
    const base = baseLine(o);
    const entry = easeOut(clamp01(o.t / 0.1));
    const cycles = words.length, per = (0.78 - 0.14) / cycles;
    let slotWord = words[0], rollT = 0, idx = 0, ending = o.t > 0.82;
    if (!ending) {
      idx = Math.max(0, Math.min(cycles - 1, Math.floor((o.t - 0.14) / per)));
      slotWord = words[idx];
      rollT = clamp01(((o.t - 0.14) - idx * per) / (per * 0.4));
    }
    ctx.save(); ctx.globalAlpha = entry;
    ctx.translate(0, (1 - entry) * o.size * 0.5);
    setFont(ctx, o, 1, 800);
    const stemW2 = ctx.measureText(o.text).width;
    setFont(ctx, o, 0.62, 800);
    const slotW = Math.max(...words.map((w) => ctx.measureText(w).width));
    const pw = slotW + o.size * 1.1, ph = o.size * 1.35;
    const totalW = stemW2 + o.size * 0.35 + pw, rightX = o.w / 2 + totalW / 2;
    ctx.fillStyle = o.colors.ink; ctx.direction = "rtl"; ctx.textAlign = "right";
    ctx.fillText(o.text, rightX, base);
    // pill slot after the stem (to its LEFT in RTL)
    const px = rightX - stemW2 - o.size * 0.35 - pw;
    ctx.save(); ctx.translate(px + pw / 2, base - ph / 2 + o.size * 0.32);
    ctx.fillStyle = o.colors.accent; ctx.globalAlpha = entry * 0.14;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.globalAlpha = entry;
    if (!ending) {
      // vertical roll: outgoing lifts with blur, incoming lands
      const outY = -rollT * ph * 1.1, blur = rollT * o.size * 0.16;
      ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -ph / 2, pw, ph); ctx.clip();
      ctx.globalAlpha = 1 - rollT * 0.9;
      if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      setFont(ctx, o, 0.62, 800); ctx.fillStyle = o.colors.ink; ctx.textAlign = "center";
      ctx.fillText(words[Math.max(0, idx - 1)] || slotWord, 0, o.size * 0.22 + outY);
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -ph / 2, pw, ph); ctx.clip();
      const inY = (1 - rollT) * ph * 1.1, ib = (1 - rollT) * o.size * 0.16;
      if (ib > 0.5) ctx.filter = `blur(${ib.toFixed(1)}px)`;
      setFont(ctx, o, 0.62, 800); ctx.fillStyle = o.colors.ink; ctx.textAlign = "center";
      ctx.fillText(slotWord, 0, o.size * 0.22 + inY);
      ctx.restore();
    } else {
      // finale: pill flies away, final word drops in
      const finP = easeOut(clamp01((o.t - 0.84) / 0.12));
      ctx.save(); ctx.globalAlpha = 1 - finP;
      ctx.translate(0, -finP * ph * 1.4); if (finP > 0) ctx.filter = `blur(${(finP * o.size * 0.14).toFixed(1)}px)`;
      setFont(ctx, o, 0.62, 800); ctx.fillStyle = o.colors.ink; ctx.textAlign = "center";
      ctx.fillText(words[words.length - 1], 0, o.size * 0.22); ctx.restore();
      if (finP > 0) {
        ctx.save(); ctx.globalAlpha = finP;
        setFont(ctx, o, 1, 800); ctx.fillStyle = o.colors.accent; ctx.textAlign = "center";
        ctx.fillText(finale, 0, o.size * 0.36 * finP); ctx.restore();
      }
    }
    ctx.restore(); ctx.restore();
  },

  // برچسبِ دسته‌دار — icon chips roll through a masked window, then park into one row (real widths, no overlap).
  chipcycle(ctx, o) {
    const words = (o.words && o.words.length ? o.words : ["طراحی", "رندر", "انتشار"]);
    const base = baseLine(o), entry = easeOut(clamp01(o.t / 0.1));
    const cycles = words.length, per = (0.8 - 0.14) / cycles;
    const idx = Math.min(cycles - 1, Math.max(0, Math.floor((o.t - 0.14) / per)));
    const rollT = clamp01(((o.t - 0.14) - idx * per) / (per * 0.4));
    const chipWpx = (label) => { setFont(ctx, o, 0.52, 700); return ctx.measureText(label).width + o.size * 1.15; };
    const chip = (label, x, y, sc = 1, alpha = 1, blur = 0) => {
      const cw = chipWpx(label) * sc, chh = o.size * 1.06 * sc;
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
      if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.fillStyle = o.colors.accent; ctx.globalAlpha = alpha * 0.16;
      ctx.beginPath(); ctx.roundRect(-cw / 2, -chh / 2, cw, chh, chh / 2); ctx.fill();
      ctx.globalAlpha = alpha; ctx.fillStyle = o.colors.accent;
      ctx.beginPath(); ctx.arc(cw / 2 - chh * 0.42, 0, chh * 0.13, 0, Math.PI * 2); ctx.fill();
      setFont(ctx, o, 0.52 * sc, 700); ctx.fillStyle = o.colors.ink; ctx.textAlign = "center";
      ctx.fillText(label, -chh * 0.14, chh * 0.18);
      ctx.restore();
    };
    // ساقه — بالا و راست، خارج از میدان چیپ‌ها
    ctx.save(); ctx.globalAlpha = entry; setFont(ctx, o, 0.72, 700);
    ctx.fillStyle = o.colors.muted; ctx.direction = "rtl"; ctx.textAlign = "right";
    ctx.fillText(o.text || "مسیر ساخت:", o.w * 0.82, base - o.size * 1.05);
    ctx.restore();
    const cy = base + o.size * 0.5;
    if (o.t < 0.82) {
      // پنجرهٔ غلتک — برش فقط عمودی است و لبه‌ها از جوهرِ چیپ دورند
      const winW = Math.max(...words.map(chipWpx)) + o.size * 0.6, cx = o.w / 2;
      // چیپ‌های ردشده پشت پنجره پارک می‌شوند (عرض واقعی، گپ ثابت)
      let px = cx - winW / 2 - o.size * 0.55;
      for (let k = idx - 1; k >= 0; k--) {
        const w2 = chipWpx(words[k]) * 0.72;
        chip(words[k], px - w2 / 2, cy, 0.72, 0.5);
        px -= w2 + o.size * 0.3;
      }
      ctx.save(); ctx.beginPath(); ctx.rect(cx - winW / 2, cy - o.size * 1.6, winW, o.size * 3.2); ctx.clip();
      const outY = -rollT * o.size * 1.5, ib = (1 - rollT) * o.size * 0.14, ob = rollT * o.size * 0.14;
      if (rollT < 1) chip(words[idx], cx, cy + outY, 1, 1 - rollT, ob);
      const nxt = words[Math.min(idx + 1, cycles - 1)];
      chip(nxt, cx, cy + (1 - rollT) * o.size * 1.5, 1, rollT, ib);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = o.colors.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx - winW / 2, cy - o.size * 0.53, winW, o.size * 1.06, o.size * 0.53); ctx.stroke(); ctx.restore();
    } else {
      // فینال: ردیف چیپ‌ها با عرض واقعی، داخل کادر
      setFont(ctx, o, 0.52, 700);
      const widths = words.map(chipWpx), gap = o.size * 0.35;
      const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
      let xr = Math.min(o.w * 0.92, o.w / 2 + total / 2);
      words.forEach((wd, i) => {
        const ap = easeOut(clamp01((o.t - (0.84 + i * 0.03)) / 0.1));
        chip(wd, xr - widths[i] / 2, base + o.size * 0.5, 0.85, ap, (1 - ap) * o.size * 0.1);
        xr -= widths[i] + gap;
      });
    }
  },

  // همگرایی ستون‌ها — a pinned label meets a rotating word, then the pair converges to one line (text-column-converge).
  converge(ctx, o) {
    const words = (o.words && o.words.length ? o.words : ["رندر فارسی", "موسیقی", "تدوین"]);
    const base = baseLine(o), INK = o.colors.ink;
    const cycles = words.length, per = 0.72 / cycles;
    const idx = Math.min(cycles - 1, Math.floor(o.t / per));
    const inP = easeOut(clamp01((o.t - idx * per) / 0.16));
    const cv = (() => { const p = clamp01((o.t - 0.78) / 0.16); return p === 0 ? 0 : p * p * (3 - 2 * p) * (p < 1 ? 1 : 1); })();
    const stem = o.text || "جدید";
    setFont(ctx, o, 0.8, 600);
    const stemW = ctx.measureText(stem).width;
    const mergedLeft = o.w / 2 - (stemW + o.size * 0.6) / 2;
    const stemX = lerpK(cv, o.w / 2 + o.w * 0.18, mergedLeft + stemW); // right anchor for RTL stem
    const wordX = lerpK(cv, o.w / 2 - o.w * 0.16, mergedLeft);
    ctx.save(); ctx.direction = "rtl"; ctx.textAlign = "right";
    ctx.globalAlpha = easeOut(clamp01(o.t / 0.1));
    ctx.font = `600 ${o.size * 0.8}px "${o.family}"`; ctx.fillStyle = o.colors.accent;
    ctx.fillText(stem, stemX, base);
    ctx.restore();
    // rotating feature word: right edge pinned during rotation
    ctx.save();
    setFont(ctx, o, 0.8, 600);
    ctx.direction = "rtl"; ctx.textAlign = "right";
    ctx.globalAlpha = inP * (1 - clamp01((o.t - 0.94) / 0.06));
    ctx.fillStyle = INK;
    ctx.fillText(words[idx], wordX + (1 - inP) * o.size * 0.3, base + (1 - inP) * o.size * 0.18);
    ctx.restore();
    const subP = clamp01((o.t - 0.94) / 0.06);
    if (subP > 0 && o.sub) {
      ctx.save(); ctx.globalAlpha = subP; setFont(ctx, o, 0.3, 500);
      ctx.fillStyle = o.colors.muted; ctx.direction = "rtl"; ctx.textAlign = "right";
      ctx.fillText(o.sub, mergedLeft + stemW, base + o.size * 0.8); ctx.restore();
    }
  },

  // تنزل عنوان — hero reads, gets selected, then shrinks into a corner chip that exactly fits the text.
  demote(ctx, o) {
    const title = o.text || "اجرای همزمان عوامل";
    const words = wordLayout(ctx, { ...o, text: title }, 1, 800);
    const base = o.h / 2 + o.size * 0.36;
    const rev = easeOut(clamp01(o.t / 0.22));
    const sel0 = clamp01((o.t - 0.3) / 0.14), dem = easeInOut(clamp01((o.t - 0.5) / 0.2));
    const skel = easeOut(clamp01((o.t - 0.68) / 0.16));
    // هندسهٔ چیپ مقصد — زیر برچسب گوشه، با اندازهٔ دقیق از عرض واقعی متن
    const tw = fullWidth(ctx, o, 1, 800);
    const tagScale = Math.min(0.4, (o.w * 0.28) / (tw + o.size * 0.6));
    const pad = o.size * 0.3 * tagScale;
    const chipW = tw * tagScale + pad * 2, chipH = o.size * 0.78 * tagScale + pad * 0.7;
    const chipX = o.w - o.w * 0.065 - chipW / 2, chipY = o.h * 0.24;
    const scale = lerpK(dem, 1, tagScale);
    const tx = lerpK(dem, o.w / 2, chipX), ty = lerpK(dem, base - o.size * 0.4, chipY);
    ctx.save(); ctx.translate(tx, ty); ctx.scale(scale, scale); ctx.translate(-o.w / 2, -(base - o.size * 0.4));
    // selection band behind the middle word before demotion
    if (sel0 > 0 && dem < 1) {
      const it = words[Math.min(1, words.length - 1)];
      ctx.save(); ctx.globalAlpha = 0.85;
      ctx.fillStyle = o.colors.accent;
      ctx.beginPath(); ctx.roundRect(it.x - it.width / 2 - o.size * 0.12, base - o.size * 0.92, it.width + o.size * 0.24, o.size * 1.14, o.size * 0.1); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = rev;
    if (rev < 1) ctx.filter = `blur(${((1 - rev) * o.size * 0.2).toFixed(1)}px)`;
    setFont(ctx, o, 1, 800);
    words.forEach((it, i) => ctx.fillText(it.w, it.x, base));
    ctx.restore();
    ctx.restore();
    // resting chip frame after demotion — دقیقاً هم‌اندازهٔ متنِ تنزل‌یافته
    if (dem > 0.6) {
      ctx.save(); ctx.globalAlpha = (dem - 0.6) / 0.4;
      ctx.strokeStyle = o.colors.accent; ctx.lineWidth = Math.max(1.5, o.size * 0.03 * tagScale + 1);
      ctx.beginPath(); ctx.roundRect(chipX - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2); ctx.stroke(); ctx.restore();
    }
    // skeleton content fades in below
    if (skel > 0) {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = o.colors.muted;
        ctx.globalAlpha = skel * (i === 0 ? 0.9 : 0.45);
        ctx.beginPath(); ctx.roundRect(o.w * 0.08, o.h * 0.36 + i * o.size * 0.5, o.w * (0.5 - i * 0.12), o.size * 0.16, o.size * 0.08); ctx.fill();
      }
      ctx.restore();
    }
  },

  // بازشدن فاصلهٔ گروه‌ها — groups start compressed and drift out to their natural spacing (tracking-expand; joins intact).
  assembly(ctx, o) {
    const layout = groupLayout(ctx, o).filter(it => it.g !== " ");
    const base = baseLine(o), n = layout.length;
    const p = easeOut(clamp01(o.t / 0.6));
    layout.forEach((it, i) => {
      const lp = easeOut(clamp01((o.t - (0.05 + (i / n) * 0.3)) / 0.3));
      if (lp <= 0) return;
      const cx = lerpK(lp, o.w / 2, it.x); // converge from centre outward
      ctx.save(); ctx.globalAlpha = lp * 0.4 + p * 0.6;
      setFont(ctx, o, 1, 700); ctx.fillStyle = i % 2 ? o.colors.accent : o.colors.ink;
      ctx.translate(cx, base + (1 - lp) * o.size * 0.1);
      const sc = lerpK(lp, 0.7, 1); ctx.scale(sc, sc);
      ctx.fillText(it.g, 0, 0); ctx.restore();
    });
  },

  // سقوط فیزیکی گروه‌ها — groups drop, bounce twice, tilt, then snap tidy (letter-drop-physics; joins intact).
  letterdrop(ctx, o) {
    const layout = groupLayout(ctx, o).filter(it => it.g !== " ");
    const floorY = baseLine(o) + o.size * 0.18;
    // floor line
    ctx.save(); ctx.fillStyle = o.colors.muted; ctx.globalAlpha = 0.5;
    ctx.fillRect(o.w * 0.08, floorY + o.size * 0.06, o.w * 0.84, Math.max(2, o.size * 0.05));
    ctx.restore();
    const T_FALL = 0.16, T_B1 = 0.1, T_B2 = 0.08, DROP = o.h * 0.55;
    const snap = easeOut(clamp01((o.t - 0.66) / 0.14));
    layout.forEach((it, i) => {
      const start = 0.05 + i * 0.045, tt = o.t - start;
      if (tt <= 0) return;
      let y;
      if (tt < T_FALL) y = -DROP + DROP * Math.pow(tt / T_FALL, 2);
      else if (tt < T_FALL + T_B1) { const u = (tt - T_FALL) / T_B1; y = -DROP * 0.3 * 4 * u * (1 - u); }
      else if (tt < T_FALL + T_B1 + T_B2) { const u = (tt - T_FALL - T_B1) / T_B2; y = -DROP * 0.09 * 4 * u * (1 - u); }
      else y = 0;
      const h = rng(hashStr(o.text + i));
      const landP = clamp01((tt - T_FALL) / 0.2);
      const rot = (h() - 0.5) * 0.21 * landP * (1 - snap);
      const jitter = (h() - 0.5) * o.size * 0.18 * landP * (1 - snap);
      ctx.save();
      ctx.translate(it.x, floorY + jitter + y);
      ctx.rotate(rot);
      const sc = o.t > 0.66 ? 1 + 0.06 * (1 - snap) : 1;
      ctx.scale(sc, sc);
      setFont(ctx, o, 1, 800); ctx.fillStyle = i % 3 === 1 ? o.colors.accent : o.colors.ink;
      ctx.fillText(it.g, 0, 0);
      ctx.restore();
    });
  },

  // کارائوکهٔ ضرب‌بسته — each word fills right→left on its beat with a reading underline (karaoke-fill-sync).
  karaoke(ctx, o) {
    const words = wordLayout(ctx, o), n = Math.max(1, words.length), base = baseLine(o);
    const per = 0.68 / n;
    words.forEach((it, i) => {
      const p = clamp01((o.t - (0.08 + i * per)) / per);
      const active = p > 0 && p < 1;
      setFont(ctx, o, 1, 800);
      ctx.fillStyle = o.colors.muted; ctx.globalAlpha = 0.55;
      ctx.fillText(it.w, it.x, base);
      ctx.globalAlpha = 1;
      if (p > 0) {
        ctx.save(); ctx.beginPath();
        ctx.rect(it.x - it.width / 2, base - o.size * 1.3, it.width * p, o.size * 1.8); ctx.clip();
        ctx.fillStyle = o.colors.ink; ctx.fillText(it.w, it.x, base);
        ctx.restore();
      }
      if (active) {
        const y = base + o.size * 0.3, w = it.width * p;
        ctx.fillStyle = o.colors.accent;
        ctx.fillRect(it.x + it.width / 2 - w, y, w, Math.max(3, o.size * 0.07));
      }
    });
  },

  // پمپِ وزن قلم — the variable font's weight breathes on every beat (font-weight-pump; variable faces only).
  fonthymp(ctx, o) {
    const bpm = 90, beat = (o.t * 5 * bpm) / 60; // assume ~5s scene
    const phase = beat - Math.floor(beat);
    const pulse = Math.exp(-phase * 5);
    const w = Math.round((400 + 500 * pulse) / 50) * 50;
    const sc = 1 + pulse * 0.05;
    ctx.save(); ctx.translate(o.w / 2, baseLine(o)); ctx.scale(sc, sc);
    setFont(ctx, o, 1.4, w); ctx.fillStyle = pulse > 0.5 ? o.colors.accent : o.colors.ink;
    ctx.fillText(o.text, 0, 0); ctx.restore();
    // beat ticks along the bottom
    for (let b = 0; b < Math.floor(beat) + 1 && b < 10; b++) {
      const bp = clamp01(beat - b);
      ctx.save(); ctx.globalAlpha = 0.25 + 0.6 * Math.exp(-bp * 4);
      ctx.fillStyle = o.colors.accent;
      ctx.beginPath(); ctx.arc(o.w / 2 - o.w * 0.3 + b * o.w * 0.06, o.h * 0.82, o.size * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  // ترمینال — a command types itself, then the Persian output answers beneath (terminal-typewriter).
  terminal(ctx, o) {
    const cardW = o.w * 0.72, cardH = o.h * 0.6, cx = o.w / 2, cy = o.h / 2;
    const inP = easeOut(clamp01(o.t / 0.12));
    ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = inP;
    ctx.scale(0.97 + 0.03 * inP, 0.97 + 0.03 * inP);
    ctx.fillStyle = "#0c1017"; ctx.strokeStyle = "#1e2635"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12); ctx.fill(); ctx.stroke();
    const dots = ["#ff5f57", "#febc2e", "#28c840"];
    dots.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-cardW / 2 + 22 + i * 20, -cardH / 2 + 22, 6, 0, Math.PI * 2); ctx.fill(); });
    ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.font = `500 ${o.size * 0.22}px "${o.family}"`;
    ctx.fillStyle = "#5a657d"; ctx.fillText("render — زنده", -cardW / 2 + 86, -cardH / 2 + 27);
    // typed command
    const cmd = "render --fa --music";
    const p = clamp01((o.t - 0.16) / 0.34), nC = Math.floor(p * cmd.length);
    ctx.font = `500 ${o.size * 0.34}px "${o.family}"`; ctx.fillStyle = "#e8ecf4";
    ctx.fillText("$ " + cmd.slice(0, nC), -cardW / 2 + 28, -cardH * 0.1);
    if (p < 1 && p > 0 && Math.sin(o.t * 26) > 0) {
      const cw = ctx.measureText("$ " + cmd.slice(0, nC)).width;
      ctx.fillStyle = o.colors.accent; ctx.fillRect(-cardW / 2 + 28 + cw + 4, -cardH * 0.1 - o.size * 0.24, o.size * 0.16, o.size * 0.3);
    }
    // Persian output lines
    const out1 = o.text || "رندر فارسی کامل شد";
    const p1 = clamp01((o.t - 0.56) / 0.14);
    if (p1 > 0) {
      ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.font = `700 ${o.size * 0.36}px "${o.family}"`;
      ctx.fillStyle = "#67d3b2"; ctx.globalAlpha = inP * p1;
      ctx.fillText("✓ " + out1, cardW / 2 - 28, o.h * 0.12);
    }
    const p2 = clamp01((o.t - 0.74) / 0.12);
    if (p2 > 0) {
      ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.font = `500 ${o.size * 0.26}px "${o.family}"`;
      ctx.fillStyle = "#8b97ae"; ctx.globalAlpha = inP * p2;
      ctx.fillText(o.sub || "۲۷ کامپوننت آمادهٔ موشن", cardW / 2 - 28, o.h * 0.2);
    }
    ctx.restore();
  },

  // بلوک کد — two panels: right fades lines in, left types characters with a cursor block (typing-code-block).
  codeblock(ctx, o) {
    const INK = "#e8ecf4", ACC = o.colors.accent, STR = "#67d3b2", KEY = "#8fb7e8", MUT = "#5a657d";
    const LINES = [
      [["function ", KEY], ["salaam", ACC], ["(name) {", INK]],
      [["  return ", KEY], ["«سلام، »", STR], [" + name", INK]],
      [["}", INK]],
    ];
    const panel = (x, w, label) => {
      ctx.fillStyle = "#10141f"; ctx.strokeStyle = "#1c2334"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x, o.h * 0.16, w, o.h * 0.62, 10); ctx.fill(); ctx.stroke();
      ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.font = `500 ${o.size * 0.16}px "${o.family}"`;
      ctx.fillStyle = MUT; ctx.fillText(label, x + w - 14, o.h * 0.16 + o.size * 0.28);
    };
    const rightX = o.w * 0.52, pw = o.w * 0.4;
    panel(rightX, pw, "محوِ خط‌به‌خط");
    panel(o.w * 0.08, pw, "تایپِ حرف‌به‌حرف");
    const lineH = o.size * 0.42, ty0 = o.h * 0.32;
    // right: line fade-in — code blocks read LTR; the Persian literal shapes natively inside
    LINES.forEach((ln, i) => {
      const k = easeOut(clamp01((o.t - (0.1 + i * 0.16)) / 0.3));
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * o.size * 0.16);
      ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.font = `500 ${o.size * 0.3}px "${o.family}"`;
      let x = rightX + 18;
      for (const [txt, col] of ln) { ctx.fillStyle = col; ctx.fillText(txt, x, ty0 + i * lineH); x += ctx.measureText(txt).width; }
      ctx.restore();
    });
    // left: char typing with cursor
    const flat = LINES.flatMap((ln, r) => { let xAcc = 0; return ln.flatMap(([txt, col]) => { const cs = [...txt].map((ch, j) => ({ ch, col, r, xOff: null })); xAcc += txt.length; return cs; }); });
    const totalC = flat.length, typed = Math.floor(clamp01((o.t - 0.1) / 0.62) * totalC);
    ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.font = `500 ${o.size * 0.3}px "${o.family}"`;
    let ci = 0;
    LINES.forEach((ln, r) => {
      let x = o.w * 0.08 + 18;
      for (const [txt, col] of ln) {
        const wFull = ctx.measureText(txt).width;
        const shown = Math.max(0, Math.min(txt.length, typed - ci));
        const wShown = ctx.measureText([...txt].slice(0, shown).join("")).width;
        if (shown > 0) { ctx.fillStyle = col; ctx.fillText([...txt].slice(0, shown).join(""), x, ty0 + r * lineH); }
        if (shown < txt.length && typed >= ci) {
          ctx.fillStyle = "#3a4468"; ctx.fillRect(x + wShown, ty0 + r * lineH - o.size * 0.26, o.size * 0.14, o.size * 0.36);
        }
        x += wFull; ci += txt.length;
      }
    });
  },

  // غلتک عمودی — stem right, roller window left of it (measured), rows never collide.
  rollcycle(ctx, o) {
    const words = (o.words && o.words.length ? o.words : ["آموزش", "تبلیغات", "داستان"]);
    const base = baseLine(o), ROW = o.size * 1.12;
    const stemP = easeOut(clamp01(o.t / 0.1));
    const roll = clamp01((o.t - 0.12) / 0.72) * (words.length - 1);
    const fade = 1 - clamp01((o.t - 0.9) / 0.09);
    const stemTxt = o.text || "ساخته‌شده برای";
    setFont(ctx, o, 0.62, 800);
    const stemW = ctx.measureText(stemTxt).width;
    const stemX = o.w * 0.94;
    ctx.save(); ctx.globalAlpha = stemP * fade;
    ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.fillStyle = o.colors.ink;
    ctx.fillText(stemTxt, stemX, base);
    ctx.restore();
    // پنجرهٔ غلتک سمت چپ ساقه — برش فقط عمودی و لبه‌ها از جوهر دورند
    const maxW = Math.max(...words.map((w) => { setFont(ctx, o, 0.62, 800); return ctx.measureText(w).width; }));
    const winW = maxW + o.size * 0.55;
    const winRight = stemX - stemW - o.size * 0.55;
    const winX = winRight - winW;
    ctx.save();
    ctx.beginPath(); ctx.rect(winX - o.size * 0.25, base - ROW * 1.52, winW + o.size * 0.5, ROW * 3.04); ctx.clip();
    words.forEach((wd, i) => {
      const d = i - roll;
      if (Math.abs(d) > 1.6) return;
      const blur = Math.abs(d) < 1 ? 3 * Math.abs(d) * (o.size / 56) : 3 + 2 * Math.min(Math.abs(d) - 1, 1);
      const op = Math.abs(d) < 1 ? 1 - 0.6 * Math.abs(d) : Math.max(0.08, 0.3 - 0.2 * (Math.abs(d) - 1));
      const mixC = clamp01(1 - Math.abs(d) * 2.4);
      ctx.save();
      ctx.globalAlpha = op * fade;
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(2)}px)`;
      setFont(ctx, o, 0.62, 800); ctx.direction = "rtl"; ctx.textAlign = "center";
      ctx.fillStyle = mixC > 0.5 ? o.colors.accent : o.colors.ink;
      ctx.fillText(wd, winX + winW / 2, base - d * ROW);
      ctx.restore();
    });
    ctx.restore();
  },

  // نوار فیلم و اسباب‌کشی واژه — card strip steps vertically; the verb relays: old lifts out, new lands in (no superimpose).
  filmstrip(ctx, o) {
    const WORDS = (o.words && o.words.length ? o.words : ["پژوهش می‌کند", "می‌سازد", "کد می‌زند"]);
    const SWITCHES = [0.16, 0.44, 0.72], SW = 0.16;
    const smooth = (x) => x * x * (3 - 2 * x);
    let stepF = 0;
    SWITCHES.forEach((s) => { stepF += smooth(clamp01((o.t - s) / SW)); });
    const scroll = stepF; // in card units
    // vertical card strip (left side) — گام یکنواخت و فاصلهٔ تمیز
    const CARD_H = o.h * 0.145, CARD_W = o.w * 0.27, STEP = CARD_H + o.h * 0.035, X = o.w * 0.075;
    for (let rep = -1; rep <= 1; rep++) {
      for (let i = 0; i < 6; i++) {
        const y = o.h * 0.08 + i * STEP + rep * 6 * STEP - scroll * STEP;
        if (y > o.h + CARD_H || y < -CARD_H * 1.5) continue;
        ctx.save();
        const dark = i % 2 === 0;
        ctx.fillStyle = dark ? "#1a2130" : "#f2efe8";
        ctx.strokeStyle = dark ? "#232c40" : "#ddd6c8"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(X, y, CARD_W, CARD_H, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = dark ? "#2e3a54" : "#c9c2b2";
        ctx.beginPath(); ctx.roundRect(X + 12, y + 12, CARD_W * 0.5, CARD_H * 0.14, 4); ctx.fill();
        ctx.beginPath(); ctx.roundRect(X + 12, y + CARD_H * 0.36, CARD_W * 0.8, CARD_H * 0.1, 4); ctx.fill();
        ctx.beginPath(); ctx.roundRect(X + 12, y + CARD_H * 0.54, CARD_W * 0.62, CARD_H * 0.1, 4); ctx.fill();
        ctx.restore();
      }
    }
    // ستون واژه (راست): سرخطِ ثابت یک خط کامل بالاتر، فعل با اسباب‌کشی متوالی
    const headW = "رایانه";
    const verbBase = baseLine(o);
    ctx.save();
    setFont(ctx, o, 0.68, 500);
    ctx.direction = "rtl"; ctx.textAlign = "right";
    ctx.fillStyle = o.colors.muted;
    ctx.fillText(headW, o.w * 0.94, verbBase - o.size * 1.45);
    ctx.restore();
    const relay = (wd, alpha, dy, grey) => {
      if (alpha <= 0.01) return;
      const lerp = (a, b) => Math.round(a + (b - a) * grey);
      ctx.save(); ctx.globalAlpha = alpha;
      setFont(ctx, o, 0.95, 700);
      ctx.direction = "rtl"; ctx.textAlign = "right";
      ctx.fillStyle = `rgb(${lerp(242, 120)},${lerp(245, 118)},${lerp(250, 126)})`;
      ctx.fillText(wd, o.w * 0.94, verbBase + dy);
      ctx.restore();
    };
    WORDS.forEach((wd, i) => {
      const sIn = i === 0 ? 0.02 : SWITCHES[i] + SW * 0.32;
      const sOut = i + 1 < WORDS.length ? SWITCHES[i + 1] : null;
      const pIn = easeOut(clamp01((o.t - sIn) / (i === 0 ? 0.1 : SW * 0.55)));
      const grey = sOut ? smooth(clamp01((o.t - (sOut - 0.05)) / 0.09)) : 0;
      const pOut = sOut ? smooth(clamp01((o.t - sOut) / (SW * 0.3))) : 0;
      relay(wd, pIn * (1 - pOut), (1 - pIn) * o.size * 0.4 - pOut * o.size * 0.5, grey);
    });
  },

  // ------------------------------------------------------------------ persian-motion-director ports
  // حروفِ کاغذی — each joined group is a rigid paper piece on threes, one light, shadows agree (PMD 06).
  cutout(ctx, o) {
    const layout = groupLayout(ctx, o).filter(it => it.g !== " ");
    const base = baseLine(o), baseY = base + o.size * 0.42;
    // table line
    ctx.save(); ctx.fillStyle = o.colors.muted; ctx.globalAlpha = 0.35;
    ctx.fillRect(o.w * 0.06, baseY + o.size * 0.1, o.w * 0.88, 2); ctx.restore();
    const tStep = Math.floor(o.t * 24 / 3) * 3 / 24; // on threes: 8 poses/sec
    layout.forEach((it, i) => {
      const sp = groupSprite(ctx, { ...o, colors: { ...o.colors } }, it.g, o.colors.ink);
      const arrive = easeBack(clamp01((o.t - (0.05 + i * 0.07)) / 0.2));
      if (arrive <= 0 || !sp) return;
      const r = rng(hashStr(o.text + i));
      const lift = Math.max(0, Math.sin((tStep + i * 0.37) * Math.PI * 2) * 0.5 + 0.15);
      const moving = (Math.sin((tStep + i) * 7.3) + 1) > 1.4; // some poses nudge, holds stay
      const nudgeX = moving ? (r() - 0.5) * o.size * 0.05 : 0;
      const nudgeR = moving ? (r() - 0.5) * 0.014 : 0;
      const rot = arrive * (r() - 0.5) * 0.3 + nudgeR;
      const y = baseY - arrive * o.size * (0.5 + lift * 0.9);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowOffsetY = o.size * (0.04 + lift * 0.14);
      ctx.shadowBlur = o.size * (0.06 + lift * 0.2);
      ctx.translate(it.x + nudgeX, y);
      ctx.rotate(rot);
      const sc = lerpK(arrive, 1.06, 1);
      ctx.scale(sc, sc);
      ctx.drawImage(sp.c, -sp.w / 2, -sp.base, sp.w, sp.h);
      ctx.restore();
    });
  },

  // نقطه‌ها آخر — bodies arrive as a per-word RTL wipe, then every dot falls/rises and squashes (PMD 07).
  nuqta(ctx, o) {
    const words = wordLayout(ctx, o), base = baseLine(o);
    const per = 0.52 / Math.max(1, words.length);
    words.forEach((it, wi) => {
      const wStart = 0.06 + wi * per;
      const sp = dotSplit(ctx, { ...o, colors: { ...o.colors } }, it.w);
      if (!sp) { setFont(ctx, o); ctx.fillStyle = o.colors.ink; ctx.fillText(it.w, it.x, base); return; }
      const wipe = easeOut(clamp01((o.t - wStart) / 0.2)); // body wipe
      const push = easeOut(clamp01((o.t - 0.8) / 0.2));    // slow push 1 → 1.014
      const ox = it.x - sp.w / 2, oy = base - sp.base;
      ctx.save();
      ctx.translate(it.x, base); ctx.scale(1 + push * 0.014, 1 + push * 0.014); ctx.translate(-it.x, -base);
      if (wipe > 0) {
        ctx.save(); ctx.beginPath();
        ctx.rect(it.x + sp.w / 2 - sp.w * wipe, oy - o.size * 0.4, sp.w * wipe + 2, sp.h + o.size * 0.8);
        ctx.clip();
        ctx.translate((1 - wipe) * o.size * 0.35, 0);
        ctx.drawImage(sp.body, ox, oy, sp.w, sp.h);
        ctx.restore();
      }
      // dots: right→left, above fall from above, below rise from below; squash on landing
      const dots = [...sp.dots].sort((a, b) => b.x - a.x);
      dots.forEach((d, di) => {
        const at = wStart + 0.2 + di * 0.026 + (rng(hashStr(o.text + wi + di))() - 0.5) * 0.012;
        const dt = (o.t - at) / 0.26;
        if (dt <= 0) return;
        const p = clamp01(dt);
        const H = o.size * 1.15, dir = d.above ? -1 : 1;
        const fall = (1 - p * p) * H * dir;
        let sx = 1, sy = 1;
        if (p >= 1) {
          const u = clamp01(dt - 1) * 2.6;
          const sq = 0.34 * Math.exp(-16 * u) * Math.cos(34 * u);
          sy = 1 - sq; sx = 1 + sq * 0.55;
        }
        const stretch = 1 + 0.25 * (1 - p * p);
        ctx.save();
        ctx.translate(ox + d.x, oy + d.y + fall);
        ctx.scale(sx * (2 - stretch), sy * stretch);
        ctx.drawImage(d.c, -d.w / 2, -d.h / 2, d.w, d.h);
        ctx.restore();
      });
      ctx.restore();
    });
  },

  // کشیده، نه فاصله — the joining stroke pulls out in tatweel units over a rhombic ruler, then springs back (PMD 08).
  kashida(ctx, o) {
    const word = (String(o.text).split(" ").sort((a, b) => b.length - a.length)[0] || o.text).replace(/\u200c/g, "");
    const joint = (() => {
      for (let i = 0; i < word.length - 1; i++) {
        if (!NON_JOINERS.includes(word[i]) && !NON_JOINERS.includes(word[i + 1])) return i;
      }
      return -1;
    })();
    const K = 5;
    const pull = (() => {
      const p = clamp01((o.t - 0.12) / 0.42); // cubic-bezier(.65,0,.12,1) approximation
      const q = p < 0.5 ? 4 * p * p * p * 0.5 + p * 0.5 : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const rel = clamp01((o.t - 0.68) / 0.22);
      return (q - easeBack(rel)) * K;
    })();
    const k = Math.max(0, Math.round(pull));
    const shown = joint >= 0 ? word.slice(0, joint + 1) + "ـ".repeat(k) + word.slice(joint + 1) : word;
    const base = baseLine(o);
    ctx.save(); setFont(ctx, o, 1.2, 700); ctx.fillStyle = o.colors.ink;
    ctx.fillText(shown, o.w / 2, base); ctx.restore();
    // rhombic-dot ruler under the stretched span, popping in as the stroke passes
    if (joint >= 0 && k > 0) {
      setFont(ctx, o, 1.2, 700);
      const full = ctx.measureText(shown), baseW = ctx.measureText(word).width;
      const spanW = full.width - baseW;
      const spanRight = o.w / 2 + full.width / 2 - ctx.measureText(word.slice(joint + 1)).width;
      const nDots = Math.ceil(spanW / (o.size * 0.55));
      for (let d = 0; d < Math.min(nDots, 9); d++) {
        const dp = easeBack(clamp01((pull / K - (d / nDots) * 0.9) / 0.12));
        if (dp <= 0) continue;
        const x = spanRight - (d + 0.5) * (spanW / nDots), y = base + o.size * 0.42;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.scale(dp, dp);
        ctx.fillStyle = o.colors.accent;
        ctx.fillRect(-o.size * 0.045, -o.size * 0.045, o.size * 0.09, o.size * 0.09);
        ctx.restore();
      }
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

// LAUNCH KIT. The pieces of the launch film that are not artwork: timing curves, a camera, a
// chat surface, a pointer, an ink blot, and the one bridge that matters, `plateLayer`, which
// draws any existing film of this engine into an offscreen surface at any frame so the launch
// film can place it, zoom it and cut out of it. Every plate shown in the launch film is the real
// plate drawn live by its own code, never a recording of it.
import { fractal, type Ctx, type Env, type Layer, type P } from "./core";
import { renderFrame, type Film } from "./film";

// ---------------------------------------------------------------- palette and type
export const C = {
  bg: "#ece6da", card: "#fffdf8", ink: "#1d1a16", soft: "#6f675c", mute: "#a39a8c", line: "#e0d8c8",
  chip: "#f3ede1", accent: "#d4622b", accentDeep: "#a9471a", paper: "#fbf9f3", shadow: "rgba(60,40,20,0.10)",
};
export const SANS = (w: number, px: number) => `${w} ${px}px "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif`;
export const MONO = (px: number) => `${px}px "SF Mono", Menlo, Monaco, monospace`;

// ---------------------------------------------------------------- time
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpP = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const inOut = (t: number) => { const c = clamp(t); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
export const out3 = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const in3 = (t: number) => Math.pow(clamp(t), 3);
// expo in/out: the camera move of motion design, slow off the mark, fast through, slow landing
export const expo = (t: number) => { const c = clamp(t); return c === 0 ? 0 : c === 1 ? 1 : c < 0.5 ? Math.pow(2, 20 * c - 10) / 2 : (2 - Math.pow(2, -20 * c + 10)) / 2; };
// a closed-form damped spring step: 0 before t0, settles to 1. zeta < 1 overshoots a little.
export const spring = (f: number, t0: number, omega = 0.45, zeta = 0.72) => {
  const t = f - t0; if (t <= 0) return 0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
};
// a press: 0 -> dips toward 1 -> springs back past 0 and settles
export const press = (f: number, down: number, up: number) => (f < down ? 0 : f < up ? out3((f - down) / (up - down)) : 1 - spring(f, up, 0.55, 0.45));

// ---------------------------------------------------------------- camera
// world coordinates are the 1920x1080 frame; the camera looks at `c` with magnification `z`
export type Cam = { c: P; z: number };
export const HOME: Cam = { c: [960, 540], z: 1 };
export const camLerp = (a: Cam, b: Cam, t: number): Cam => {
  const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)); // zoom travels in log space or it lurches
  // keep the path of the centre steady on screen, not in world: weight it by the zoom
  const w = (z - a.z) / (b.z - a.z || 1);
  return { z, c: lerpP(a.c, b.c, Math.abs(b.z - a.z) < 1e-6 ? t : clamp(w)) };
};
export const useCam = (ctx: Ctx, env: Env, cam: Cam) => {
  const s = env.scale * cam.z;
  ctx.setTransform(s, 0, 0, s, env.scale * (env.W / 2 - cam.c[0] * cam.z), env.scale * (env.H / 2 - cam.c[1] * cam.z));
};
export const toScreen = (cam: Cam, p: P, W = 1920, H = 1080): P => [W / 2 + (p[0] - cam.c[0]) * cam.z, H / 2 + (p[1] - cam.c[1]) * cam.z];

// ---------------------------------------------------------------- plates, live
// Draw frame `frame` of `film` into a surface sized for `px` device pixels across. Sub-films get
// their own cache (their bake keys must never meet the launch film's) and the surface is reused.
export const plateLayer = (env: Env, key: string, film: Film, frame: number, px = 1080): Layer => {
  const res = px / film.meta.W, scale = res, lk = `plate:${key}:${px}`;
  let rec = env.cache.get(lk) as { L: Layer; sub: Env; last: number } | undefined;
  if (!rec) {
    const L = env.canvas(Math.round(film.meta.W * scale), Math.round(film.meta.H * scale));
    rec = { L, sub: { W: film.meta.W, H: film.meta.H, scale, cache: new Map(), canvas: env.canvas, image: env.image }, last: NaN };
    env.cache.set(lk, rec);
  }
  const f = Math.max(0, Math.min(film.meta.durationFrames - 1, Math.round(frame)));
  if (rec.last !== f) { renderFrame(film, rec.L.ctx, f, rec.sub); rec.last = f; }
  return rec.L;
};
// a surface the launch film draws into itself (a scene inside a scene), same reuse rule
export const selfLayer = (env: Env, key: string, w: number, h: number): Layer => {
  const lk = `self:${key}:${w}x${h}`; let L = env.cache.get(lk) as Layer | undefined;
  if (!L) { L = env.canvas(w, h); env.cache.set(lk, L); }
  L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.clearRect(0, 0, w, h); return L;
};

// ---------------------------------------------------------------- shapes
export const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  const q = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + q, y); ctx.arcTo(x + w, y, x + w, y + h, q); ctx.arcTo(x + w, y + h, x, y + h, q); ctx.arcTo(x, y + h, x, y, q); ctx.arcTo(x, y, x + w, y, q); ctx.closePath();
};
export const softShadow = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number, depth = 1) => {
  for (let i = 5; i >= 1; i--) { ctx.fillStyle = `rgba(70,45,20,${0.018 * depth})`; rr(ctx, x - i * 2, y - i * 1 + i * 3, w + i * 4, h + i * 4, r + i * 2); ctx.fill(); }
};
// an ink blot of radius R about c: a wobbling rim, seeded; `grow` 0..1 lets the lobes lead
export const blot = (c: P, R: number, seed: number, n = 96): P[] => {
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = fractal(seed, Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, 1, 1, 3);
    const r = R * (0.9 + 0.22 * k);
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
  }
  return pts;
};
export const pathOf = (ctx: Ctx, pts: P[]) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

// ---------------------------------------------------------------- pointer
export const pointer = (ctx: Ctx, p: P, down = 0, s = 1.35) => {
  const k = s * (1 - 0.12 * down);
  const shape: P[] = [[0, 0], [0, 25], [6.4, 19.2], [10.6, 29], [14.8, 27.2], [10.8, 17.8], [19, 17.8]];
  ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; pathOf(ctx, shape.map(([x, y]) => [x + 1.2, y + 2] as P)); ctx.fill();
  pathOf(ctx, shape); ctx.fillStyle = "#111"; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round"; ctx.stroke();
  ctx.restore();
};

// ---------------------------------------------------------------- the chat
// The layout of the one conversation the film lives in (world coordinates).
export const CHAT = { x: 300, y: 56, w: 1320, h: 968, r: 34 };
export const INPUT = { x: 360, y: 884, w: 1200, h: 104, r: 30 };
export const GEN = { x: 1370, y: 906, w: 166, h: 60, r: 30 };
export const REPLY = { x: 400, y: 214, s: 600 }; // the art card: a square the plate lands in
export const TEXT = { x: 404, base: 948, px: 34 };

export type ChatState = {
  typed: string; caret: boolean; placeholder?: string;
  sent?: string; sentAlpha?: number;       // the user's message once it has gone up
  attach?: { img: CanvasImageSource; label: string } | null;
  genPress?: number; genHot?: number;       // the button: press depth 0..1, hover glow 0..1
  label?: string; labelAlpha?: number;      // the reply's byline
  // your product: the thread's name and subline, the button's word, the accent (defaults: anidoodle's own)
  title?: string; subtitle?: string; genLabel?: string; accent?: string;
};

export const drawChatFrame = (ctx: Ctx, s: ChatState) => {
  ctx.fillStyle = C.bg; ctx.fillRect(-2000, -2000, 6000, 6000);
  softShadow(ctx, CHAT.x, CHAT.y, CHAT.w, CHAT.h, CHAT.r, 1.2);
  ctx.fillStyle = C.card; rr(ctx, CHAT.x, CHAT.y, CHAT.w, CHAT.h, CHAT.r); ctx.fill();
  // the thread's head: a small ink dot and a name, nothing that belongs to anyone else
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(CHAT.x + 58, CHAT.y + 52, 9, 0, Math.PI * 2); ctx.fill();
  ctx.font = SANS(600, 22); ctx.fillStyle = C.ink; ctx.textBaseline = "middle"; ctx.fillText(s.title ?? "anidoodle", CHAT.x + 80, CHAT.y + 53);
  const subX = s.title === undefined ? CHAT.x + 196 : CHAT.x + 80 + ctx.measureText(s.title).width + 16;
  ctx.font = SANS(500, 18); ctx.fillStyle = C.mute; ctx.fillText(s.subtitle ?? "drawn in code", subX, CHAT.y + 54);
  ctx.fillStyle = C.line; ctx.fillRect(CHAT.x + 32, CHAT.y + 98, CHAT.w - 64, 1.5);
  // the sent message, right aligned
  if (s.sent) {
    ctx.globalAlpha = s.sentAlpha ?? 1; ctx.font = SANS(500, 26);
    const tw = ctx.measureText(s.sent).width, pad = 26, bw = tw + pad * 2, bx = CHAT.x + CHAT.w - 60 - bw, by = CHAT.y + 124;
    let ay = by;
    if (s.attach) { const iw = 240, ih = 150; ay = by; ctx.save(); rr(ctx, CHAT.x + CHAT.w - 60 - iw, ay, iw, ih, 16); ctx.clip(); ctx.drawImage(s.attach.img, CHAT.x + CHAT.w - 60 - iw, ay, iw, ih); ctx.restore(); ay += ih + 10; }
    ctx.fillStyle = C.chip; rr(ctx, bx, ay, bw, 56, 22); ctx.fill();
    ctx.fillStyle = C.ink; ctx.textBaseline = "middle"; ctx.fillText(s.sent, bx + pad, ay + 29);
    ctx.globalAlpha = 1;
  }
  if (s.label) { ctx.globalAlpha = s.labelAlpha ?? 1; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(REPLY.x + 9, REPLY.y - 26, 7, 0, Math.PI * 2); ctx.fill(); ctx.font = SANS(600, 20); ctx.textBaseline = "middle"; ctx.fillText(s.label, REPLY.x + 26, REPLY.y - 25); ctx.globalAlpha = 1; }
  // the composer
  ctx.fillStyle = C.paper; rr(ctx, INPUT.x, INPUT.y, INPUT.w, INPUT.h, INPUT.r); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke();
  ctx.font = SANS(500, TEXT.px); ctx.textBaseline = "alphabetic";
  if (!s.typed && s.placeholder) { ctx.fillStyle = C.mute; ctx.fillText(s.placeholder, TEXT.x, TEXT.base); }
  ctx.fillStyle = C.ink; ctx.fillText(s.typed, TEXT.x, TEXT.base);
  const acc = s.accent ?? C.accent;
  if (s.caret) { const x = TEXT.x + ctx.measureText(s.typed).width + 3; ctx.fillStyle = acc; ctx.fillRect(x, TEXT.base - 32, 3, 40); }
  // Generate
  const pr = s.genPress ?? 0, hot = s.genHot ?? 0, k = 1 - 0.07 * pr, gx = GEN.x + (GEN.w * (1 - k)) / 2, gy = GEN.y + (GEN.h * (1 - k)) / 2;
  ctx.fillStyle = hot > 0 ? mixHex(acc, s.accent ? deepen(acc) : C.accentDeep, 0.35 * hot + 0.4 * pr) : acc; rr(ctx, gx, gy, GEN.w * k, GEN.h * k, GEN.r * k); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = SANS(600, 24 * k); ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillText(s.genLabel ?? "Generate", GEN.x + GEN.w / 2, GEN.y + GEN.h / 2 + 1); ctx.textAlign = "left";
};
export const caretAt = (ctx: Ctx, typed: string): P => { ctx.font = SANS(500, TEXT.px); return [TEXT.x + ctx.measureText(typed).width, TEXT.base - 12]; };

const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const deepen = (h: string) => "#" + hx(h).map((v) => Math.round(v * 0.78).toString(16).padStart(2, "0")).join("");
export const mixHex = (a: string, b: string, t: number) => { const x = hx(a), y = hx(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(t)))).join(",")})`; };

// the art card: paper, a hairline, and whatever layer is inside, clipped to the rounded square
export const artCard = (ctx: Ctx, x: number, y: number, s: number, L: Layer | null, r = 22) => {
  softShadow(ctx, x, y, s, s, r, 1.4);
  ctx.save(); rr(ctx, x, y, s, s, r); ctx.clip(); ctx.fillStyle = C.paper; ctx.fillRect(x, y, s, s);
  if (L) ctx.drawImage(L.canvas, x, y, s, s);
  ctx.restore();
  ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,0.08)"; rr(ctx, x, y, s, s, r); ctx.stroke();
};

// ---------------------------------------------------------------- typing, the drop, the answer card
// Human typing: the time each character lands, uneven and seeded, spaces a little slower.
export const charTimes = (text: string, t0: number, rate: number, seed: number) => { const out: number[] = []; let t = t0; for (let i = 0; i < text.length; i++) { const h = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453, j = h - Math.floor(h); t += rate * (0.55 + j * 0.9) + (text[i] === " " ? 0.6 * rate : 0); out.push(t); } return out; };
export const typedAt = (text: string, f: number, times: number[]) => text.slice(0, times.filter((t) => f >= t).length);
// The drop: a bead of ink lifts off Generate and arcs to where the answer card will land.
export type Drop = { t0: number; land: number; full: number };
export const inkDrop = (ctx: Ctx, f: number, d: { t0: number; land: number }, to: P) => {
  const GEN_C: P = [GEN.x + GEN.w / 2, GEN.y + GEN.h / 2];
  if (f < d.t0 - 6 || f >= d.land) return;
  if (f < d.t0) { const w = out3(ramp(f, d.t0 - 6, d.t0)); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(GEN_C[0], GEN.y + 6 - w * 22, 30 * (0.3 + 0.7 * w), 0, Math.PI * 2); ctx.fill(); return; }
  const at = (g: number): P => { const u = ramp(g, d.t0, d.land), e = inOut(u); return [lerp(GEN_C[0], to[0], e), lerp(GEN.y - 16, to[1], e) - Math.sin(Math.PI * u) * 150]; };
  for (let k = 24; k >= 0; k--) { const p = at(f - k * 0.1); ctx.fillStyle = C.ink; ctx.globalAlpha = k === 0 ? 1 : 0.22 * (1 - k / 25); ctx.beginPath(); ctx.arc(p[0], p[1], 30 * (1 - k * 0.022), 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
};
// The answer card in the thread: a byline, then the art, revealed by the landed drop blooming open.
// `art` is any layer (plateLayer gives a live plate); `crop` picks a source rectangle.
export const inkCard = (ctx: Ctx, x: number, y: number, s: number, f: number, d: Drop, art: Layer, label: string, crop?: [number, number, number, number]) => {
  ctx.fillStyle = C.ink; ctx.globalAlpha = ramp(f, d.land, d.land + 10); ctx.beginPath(); ctx.arc(x + 9, y - 16, 7, 0, Math.PI * 2); ctx.fill();
  ctx.font = SANS(600, 20); ctx.textBaseline = "middle"; ctx.fillText(label, x + 26, y - 15); ctx.globalAlpha = 1;
  const grow = out3(ramp(f, d.land, d.full)), c: P = [x + s / 2, y + s / 2];
  softShadow(ctx, x, y, s, s, 20, grow * 1.3);
  ctx.save(); rr(ctx, x, y, s, s, 20); ctx.clip();
  if (grow < 1) { pathOf(ctx, blot(c, lerp(16, s * 0.8, grow) + 28 * (1 - grow), 77)); ctx.fillStyle = C.ink; ctx.fill(); pathOf(ctx, blot(c, Math.max(0, lerp(16, s * 0.8, grow) - 5), 77)); ctx.clip(); }
  ctx.fillStyle = C.paper; ctx.fillRect(x, y, s, s);
  if (crop) ctx.drawImage(art.canvas, ...crop, x, y, s, s); else ctx.drawImage(art.canvas, x, y, s, s);
  ctx.restore();
};

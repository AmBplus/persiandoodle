// LAUNCH, CUT 3. Alex on cut 2: "every frame has ugly text overlaying visual elements... text must be
// a frame: white, big animated text, then the show." So the words never sit on the art. Cut 3 is
// cut 2's pictures (launch2.content2, all type removed) spliced with TYPE FRAMES: a sheet of paper
// sweeps in over the picture, one big word letters itself on in its own medium, and the paper sweeps
// off to reveal the next scene. (Chosen: the ink bloom, and every word in ink.) 29 bars of the score (launchLofi3), 77 s.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { C, blot, expo, pathOf, ramp, selfLayer } from "./launchKit";
import { content2, SFX2, T2, WEB_SKIP } from "./launch2";
import { logoBug, measure, writeOn, type KStyle } from "./kinetic";
import { launchLofi3 } from "./music/pieces/launch";
import { renderPiece } from "./music/render";
import { rng } from "./core";

const W = 1920, H = 1080, FPS = 30;
type Line = { text: string; style: KStyle; color: string };
type Seg = { kind: "pic"; from: number; to: number; len: number } | { kind: "type"; lines: Line[]; len: number; before: number; after: number };
const pic = (from: number, to: number, len = to - from): Seg => ({ kind: "pic", from, to, len });
const type = (lines: Line[], len: number, before: number, after = before): Seg => ({ kind: "type", lines, len, before, after });
// Alex on cut 3: gentler pacing; ANIMATIONS before the swim request; the koi-and-code beat much
// shorter; the embroidery long enough to see; the site from Bit's hero on. The film beat's length is
// solved so "All in pure code." (content T2.words[0] + 140) lands on bar 26, the score's home chord.
const WEB_FROM = T2.web[0] + 10, WEB_LEN = 360 - WEB_SKIP;
const HEAD: Seg[] = [
  pic(0, 200),
  pic(200, 360, 90), // the koi and its code, twice as fast
  type([{ text: "NO IMAGE MODEL.", style: "ink", color: C.ink }, { text: "JUST CODE.", style: "ink", color: C.accent }], 64, 359, 360),
  pic(360, 372),
  type([{ text: "ANIMATIONS", style: "ink", color: C.ink }], 50, 371, 372),
  pic(372, 560),
  type([{ text: "31 STYLES", style: "ink", color: C.ink }], 50, 559, 570),
  pic(570, 800),
  pic(800, 1040, 200),
  pic(1040, 1200),
  type([{ text: "LOOPS", style: "ink", color: C.ink }], 50, 1199, 1200),
  pic(1200, 1360),
  type([{ text: "INTERACTIVE", style: "ink", color: C.ink }], 50, 1359, WEB_FROM),
  pic(WEB_FROM, WEB_FROM + WEB_LEN),
  type([{ text: "FILMS", style: "ink", color: C.ink }], 60, WEB_FROM + WEB_LEN - 1, T2.film[0]),
];
const headLen = HEAD.reduce((a, s) => a + s.len, 0), CLAIM = 26 * 80, FILM_LEN = CLAIM - 140 - headLen;
if (FILM_LEN < 90) throw new Error(`launch3: the film beat would be ${FILM_LEN} frames; the cut before it is too long for the claim to land on bar 26`);
const SEGS: Seg[] = [...HEAD, pic(T2.film[0], T2.film[1], FILM_LEN), pic(T2.words[0], T2.words[1]), pic(T2.end[0], T2.end[1]), pic(T2.end[1] - 1, T2.end[1], 60)];
const STARTS = (() => { let t = 0; return SEGS.map((s) => { const a = t; t += s.len; return a; }); })();
export const N3 = STARTS[STARTS.length - 1] + SEGS[SEGS.length - 1].len;
const at = (F: number) => { let i = SEGS.length - 1; while (i > 0 && STARTS[i] > F) i--; return { s: SEGS[i], local: F - STARTS[i] }; };
const contentOf = (s: Extract<Seg, { kind: "pic" }>, local: number) => s.from + ((s.to - s.from) * local) / s.len;
// a content frame, mapped to the cut (for the sound events); events inside a cut-away go to its start
export const cutOf = (c: number) => { for (let i = 0; i < SEGS.length; i++) { const s = SEGS[i]; if (s.kind === "pic" && c >= s.from && c < s.to) return STARTS[i] + ((c - s.from) * s.len) / (s.to - s.from); } return -1; };

// ---------------------------------------------------------------- a type frame
const IN = 14, OUT = 14; // gentle: the bloom opens and closes over half a second
// Alex's pick: B, the ink bloom. The Generate drop's own ink blooms from the centre over the picture,
// the page is inside the bloom, the word is written on it in ink by the pointed pen, and the ink
// shrinks back to a point to show the next scene.
const drawType = (ctx: Ctx, env: Env, s: Extract<Seg, { kind: "type" }>, local: number, F: number) => {
  const u = expo(ramp(local, 0, IN + 2)), v = expo(ramp(local, s.len - OUT, s.len)), R = 1250 * (v > 0 ? 1 - v : u);
  content2(ctx, env, local < s.len / 2 ? s.before : s.after);
  if (R < 2) return;
  const L = selfLayer(env, "sheet", Math.round(W * env.scale), Math.round(H * env.scale)), c = L.ctx;
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
  const n = s.lines.length, size = Math.min(n === 1 ? 190 : 130, ...s.lines.map((l) => (1560 / measure(l.text, 100)) * 100)), gap = size * 1.45, y0 = H / 2 - ((n - 1) * gap) / 2 + size * 0.5;
  s.lines.forEach((l, i) => writeOn(c, env, l.text, W / 2, y0 + i * gap, size, ramp(local, IN - 2 + i * 20, IN + 16 + i * 20), l.style, { color: l.color, align: "center", seed: 7 + i }));
  logoBug(c, env, F, 1700, 1040, 0.9, { t0: -100, fps: FPS });
  const ctr: [number, number] = [W / 2, H / 2];
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.save();
  pathOf(ctx, blot(ctr, R + 26, 88)); ctx.fillStyle = C.ink; ctx.fill(); pathOf(ctx, blot(ctr, Math.max(0, R - 4), 88)); ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L.canvas, 0, 0); ctx.restore();
};

// ---------------------------------------------------------------- the sound
const audio3 = (sr: number): [Float32Array, Float32Array] => {
  const n = Math.round((N3 / FPS) * sr), L = new Float32Array(n), R = new Float32Array(n), m = renderPiece(launchLofi3(), sr);
  for (let i = 0; i < n && i < m.L.length; i++) { L[i] = m.L[i]; R[i] = m.R[i]; }
  const fade = Math.round(1.2 * sr); for (let i = 0; i < fade; i++) { const g = i / fade; L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
  const r = rng(4242), add = (fr: number, len: number, fn: (s: number) => number, gain: number, pan = 0) => { if (fr < 0) return; const i0 = Math.round((fr / FPS) * sr); for (let i = 0; i < len * sr && i0 + i < n; i++) { const v = fn(i / sr) * gain; L[i0 + i] += v * (1 - Math.max(0, pan)); R[i0 + i] += v * (1 + Math.min(0, pan)); } };
  const click = (fr: number) => { const f0 = 2600 + r() * 1400, ph = r() * 6; add(fr, 0.03, (s) => Math.sin(2 * Math.PI * f0 * s + ph) * Math.exp(-s / 0.004) + (r() - 0.5) * Math.exp(-s / 0.002) * 0.6, 0.05, (r() - 0.5) * 0.4); };
  const thock = (fr: number) => add(fr, 0.14, (s) => Math.sin(2 * Math.PI * (70 + 90 * Math.exp(-s / 0.02)) * s) * Math.exp(-s / 0.05), 0.2);
  const plip = (fr: number) => add(fr, 0.16, (s) => Math.sin(2 * Math.PI * (320 + 700 * Math.exp(-s / 0.03)) * s) * Math.exp(-s / 0.06), 0.12);
  const whoosh = (fr: number, len = 0.4, g = 0.5) => { let z = 0; add(fr, len, (s) => { z += 0.14 * ((r() - 0.5) - z); return z * Math.sin((Math.PI * s) / len) ** 2; }, g); };
  const scratch = (fr: number, len: number, g = 0.05) => { let z = 0; add(fr, len, (s) => { z += 0.5 * ((r() - 0.5) - z); return z * (0.6 + 0.4 * Math.sin(s * 70)) * Math.min(1, s * 20) * Math.min(1, (len - s) * 20); }, g); };
  const e = SFX2();
  e.clicks.forEach((c) => click(cutOf(c))); e.thocks.forEach((c) => thock(cutOf(c))); e.plips.forEach((c) => plip(cutOf(c)));
  e.punches.forEach((c) => whoosh(cutOf(c), 0.3, 0.4)); whoosh(cutOf(e.flip), 0.3, 0.4); whoosh(cutOf(T2.brick[0] + 120), 0.9); whoosh(cutOf(T2.hand[0]), 0.5);
  scratch(2, 1.6);
  SEGS.forEach((s, i) => { if (s.kind !== "type") return; whoosh(STARTS[i], 0.32, 0.55); s.lines.forEach((_, k) => scratch(STARTS[i] + IN - 2 + k * 10, 0.6, 0.07)); whoosh(STARTS[i] + s.len - OUT, 0.32, 0.55); });
  return [L, R];
};

export const launch3: Film = {
  meta: { title: "anidoodle · launch, cut 3", W, H, fps: FPS, bpm: 90, durationFrames: N3, raster: "cpu", kind: "launch" },
  assets: { images: { almond: "../../../../anidoodle-research/launch-film/refs/vangogh-almond-blossom.jpg" } }, // public domain; provenance in refs/PROVENANCE.json
  shots: [{ id: "cut", start: 0, end: N3, draw: (ctx, F, env) => { const { s, local } = at(F); if (s.kind === "pic") content2(ctx, env, contentOf(s, local)); else drawType(ctx, env, s, local, F); } }],
  audio: audio3,
};
export const SEGS3 = () => SEGS.map((s, i) => [s.kind, STARTS[i], s.len, s.kind === "type" ? s.lines.map((l) => l.text).join(" / ") : `${s.from}-${s.to}`]);

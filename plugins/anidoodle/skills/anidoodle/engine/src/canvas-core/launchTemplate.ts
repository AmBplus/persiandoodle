// LAUNCH TEMPLATE. Your product's launch film from data: a product name, the prompts a user would
// type, the plates that answer them, the words for the type frames, and the exact install lines.
// It is the launch film's grammar (references/workflows/launch-video-kit.md) with nothing of
// anidoodle's own left in it:
//
//   ask:  the prompt is already being typed at frame 0 (a silent-readable hook), the camera eases
//         out from the composer, the pointer presses Generate, an ink drop arcs into the thread and
//         blooms open into a card where the plate draws itself, live. Earlier answers stay and the
//         thread scrolls. The camera then leans in on the new card.
//   type: a full-frame word page inside an ink bloom (launchCut.ts). Words never sit on the art.
//   end:  the bloom opens onto the end card and stays: the name written on, one line, the install
//         lines in a dark panel, held for `endBeats` (3 s or more).
//
// Everything is timed on a beat grid (bpm from the brief, fps). With `claimBar`, the last ask's length is solved so
// the end card lands on that bar's downbeat, or the build throws.
//
//   export const myLaunch = makeLaunchFilm({ title: "Tally", asks: [...], words: [...], ... });
//   (then a host page, src/hosts/page-myLaunch.ts, and: node tools/render.mjs myLaunch)
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import {
  C, GEN, HOME, INPUT, REPLY, SANS, MONO, TEXT, camLerp, caretAt, charTimes, clamp, drawChatFrame, expo, inOut, inkCard, inkDrop,
  lerp, lerpP, out3, plateLayer, pointer, press, ramp, rr, typedAt, useCam, type Cam, type Drop,
} from "./launchKit";
import { beatGrid, bloomFrame, bloomRadius, makeCut, pic, type, typeFrame, type Seg, type TypeLine } from "./launchCut";
import { measure, writeOn } from "./kinetic";
import { renderPiece } from "./music/render";
import { loudness, truePeak } from "./music/meter";
import * as families from "./music/pieces/families";
import * as launchPieces from "./music/pieces/launch";
import * as nocturnePieces from "./music/pieces/nocturne";
import * as samplers from "./music/pieces/samplers";
import type { Piece } from "./music/plan";
import { composePiece, type Material } from "./music/compose";
import { novelty } from "./music/novelty";

export type LaunchAsk = {
  prompt: string;            // what the user types, in their words
  plate: Film;               // the answer: any film of this engine, drawn live into the card
  label: string;             // the card's byline ("marker comic", "your dashboard, redrawn")
  from?: number; to?: number; // the plate frames to play while the card is up (default: all of it)
  crop?: [number, number, number, number]; // a source rectangle of the plate, in plate pixels at 1080 across
};
export type LaunchSpec = {
  title: string;             // the product name: the thread's name, the end card, the corner mark
  subtitle?: string;         // the thread's subline
  placeholder?: string;      // the empty composer
  genLabel?: string;         // the button's word (default "Generate")
  accent?: string;           // the button and caret colour, hex
  asks: LaunchAsk[];         // 1 to 3 prompt-to-result beats
  words?: TypeLine[][];      // words[i] is a type frame after asks[i], for i < asks.length - 1
  tagline: string;           // the one line under the name on the end card
  install: string[];         // the exact lines a viewer copies; held on screen for the whole end card
  footer?: string;           // small print under the panel (where it runs, the repo)
  bpm: number; fps?: number; // the beat grid: bpm comes from the brief (the score composed for it); a beat is 60 * fps / bpm frames
  askBeats?: number; typeBeats?: number; endBeats?: number; // default 6, 4, 8
  claimBar?: number;         // land the end card on this bar's downbeat (solves the last ask)
  // The score: a piece COMPOSED for this product's brief (references/music/compose.md), or null for
  // a silent film. Required, so no film inherits a score by default. anidoodle's own pieces are
  // refused: every user's film gets its own music, never ours.
  // A Material (what compose.md writes) is composed here; a finished Piece is used as is.
  score: (() => Piece | Material) | null;
  audio?: Film["audio"];     // or your own finished mix; wins over score
};

const W = 1920, H = 1080;
// anidoodle's own pieces (the demos and our launch score) are examples of the composer, never a
// user's soundtrack. Refused by identity, by title and by content (the novelty gate), so a thin or
// retitled wrapper does not slip through. `audio` is the caller's own finished mix and is not checked.
const OURS: (() => Piece)[] = [...Object.values(families), ...Object.values(launchPieces), ...Object.values(nocturnePieces), ...Object.values(samplers)].filter((v): v is () => Piece => typeof v === "function");
const asPiece = (score: () => Piece | Material) => (): Piece => { const x = score(); return "plan" in x ? x : composePiece(x); };
const refuseOurs = (score: () => Piece | Material) => {
  const ours = () => new Set(OURS.map((f) => { try { return f().title; } catch { return null; } }).filter(Boolean));
  if ((OURS as unknown[]).includes(score) || ours().has(score().title)) throw new Error(`launchTemplate: "${score().title}" is one of anidoodle's own pieces; compose a score for this product's brief (references/music/compose.md) or pass score: null`);
  // by content too: a retitled copy, a transposition or a quoted line of ours fails the same novelty gate `music.mjs check` runs
  const corpus: Record<string, () => Piece> = {};
  OURS.forEach((f, i) => { try { const p = asPiece(f)(); corpus[`${p.title} #${i}`] = () => p; } catch { /* not a piece */ } });
  const v = novelty(asPiece(score)(), corpus);
  if (!v.pass) throw new Error(`launchTemplate: "${score().title}" is too close to anidoodle's own "${v.worst.name.replace(/ #\d+$/, "")}" (similarity ${v.worst.score}, ${v.worst.reusedFragments} reused 6-note fragments); compose a score for this product's brief (references/music/compose.md) or pass score: null`);
};
const TYPE_O = { lead: -4, stagger: 18 }; // the word starts as the bloom closes over the frame; lines run on without a gap
const TOP = 170, VIEW_BOTTOM = INPUT.y - 26, BUBBLE = 58, CARD = 460;
const GEN_C: P = [GEN.x + GEN.w / 2, GEN.y + GEN.h / 2];

// the timing inside one ask beat, from its prompt and its length
const askTiming = (prompt: string, i: number, ASK: number) => {
  const raw = charTimes(prompt, 0, 1, 7 + i * 4), last = raw[raw.length - 1] || 1;
  const b = Math.round(ASK * 0.25), a = i === 0 ? -Math.round(b * 1.2) : 4; // the first prompt is under way at frame 0
  const times = raw.map((t) => a + (t / last) * (b - a));
  const down = b + 16, up = down + 5, drop: Drop = { t0: up + 5, land: up + 19, full: up + 40 };
  return { times, b, down, up, drop };
};

export const makeLaunchFilm = (spec: LaunchSpec): Film & { cut: ReturnType<typeof makeCut> } => {
  const fps = spec.fps ?? 30, n = spec.asks.length;
  if (!(spec.bpm > 0)) throw new Error("launchTemplate: set bpm from the brief (the tempo of the score composed for this film)");
  if (spec.score === undefined && !spec.audio) throw new Error("launchTemplate: `score` is required: a piece composed for this product (references/music/compose.md), or null for silence");
  if (spec.score) refuseOurs(spec.score);
  const grid = beatGrid(spec.bpm, fps);
  const ASK = Math.round((spec.askBeats ?? 6) * grid.beat), TYPE = Math.round((spec.typeBeats ?? 4) * grid.beat), END = Math.round((spec.endBeats ?? 8) * grid.beat);
  if (n < 1 || n > 3) throw new Error("launchTemplate: 1 to 3 asks; more is a feature list, not a story");
  if (ASK < 100) throw new Error(`launchTemplate: an ask beat needs 100 frames or more (it has ${ASK}); raise askBeats`);
  if (END < 3 * fps + 40) throw new Error("launchTemplate: the end card must hold the install lines 3 s or more; raise endBeats");
  const T = spec.asks.map((a, i) => ({ ...askTiming(a.prompt, i, ASK), base: i * ASK }));
  const END0 = n * ASK; // content frame where the end card starts

  // ---------------------------------------------------------------- the thread
  type Item = { at: number; h: number; user?: string; card?: number };
  const items: Item[] = [];
  T.forEach((t, i) => { items.push({ at: t.base + t.up, h: BUBBLE, user: spec.asks[i].prompt }); items.push({ at: t.base + t.drop.land, h: CARD + 34, card: i }); });
  const ys = (() => { let y = TOP; return items.map((it) => { const r = y; y += it.h + 26; return r; }); })();
  const scrollAt = (f: number) => { let s = 0; items.forEach((it, k) => { const want = Math.max(0, ys[k] + it.h - VIEW_BOTTOM); if (want > s) s += (want - s) * expo(ramp(f, it.at - 2, it.at + 16)); }); return s; };
  const cardY = (i: number, f: number) => ys[items.findIndex((it) => it.card === i)] + 34 - scrollAt(f);
  const plateFrame = (i: number, f: number) => { const a = spec.asks[i], t = T[i], from = a.from ?? 0, to = a.to ?? a.plate.meta.durationFrames - 1; return lerp(from, to, ramp(f, t.base + t.drop.land, t.base + ASK - 8)); };

  const bug = (c: Ctx, env: Env) => writeOn(c, env, spec.title, W - 40, H - 34, 24, 1, "ink", { color: C.soft, align: "right", seed: 3 });
  const chat = (ctx: Ctx, env: Env, f: number, typed: string, caret: boolean, pr: number, hot: number) => {
    drawChatFrame(ctx, { typed, caret, placeholder: spec.placeholder ?? "Describe what you want…", genPress: pr, genHot: hot, title: spec.title, subtitle: spec.subtitle ?? "", genLabel: spec.genLabel, accent: spec.accent });
    const sc = scrollAt(f);
    ctx.save(); ctx.beginPath(); ctx.rect(300, 158, 1320, VIEW_BOTTOM - 158); ctx.clip();
    items.forEach((it, k) => {
      if (f < it.at) return;
      const y = ys[k] - sc; if (y > VIEW_BOTTOM || y + it.h < 100) return;
      if (it.user !== undefined) {
        ctx.globalAlpha = ramp(f, it.at, it.at + 8); ctx.font = SANS(500, 26);
        const bw = ctx.measureText(it.user).width + 52; ctx.fillStyle = C.chip; rr(ctx, 1560 - bw, y, bw, BUBBLE - 2, 22); ctx.fill();
        ctx.fillStyle = C.ink; ctx.textBaseline = "middle"; ctx.fillText(it.user, 1560 - bw + 26, y + 29); ctx.globalAlpha = 1;
      } else {
        const i = it.card!, a = spec.asks[i];
        const d = T[i].drop, b = T[i].base;
        inkCard(ctx, REPLY.x, y + 34, CARD, f, { t0: b + d.t0, land: b + d.land, full: b + d.full }, plateLayer(env, `ask${i}`, a.plate, plateFrame(i, f), 1080), a.label, a.crop);
      }
    });
    ctx.restore();
    T.forEach((t, i) => inkDrop(ctx, f, { t0: t.base + t.drop.t0, land: t.base + t.drop.land }, [REPLY.x + CARD / 2, cardY(i, t.base + t.drop.land) + CARD / 2]));
  };
  // the camera: macro on the composer while typing, out to the room for the press, then a lean in on the new card
  const leanOn = (i: number): Cam => ({ c: lerpP(HOME.c, [REPLY.x + CARD / 2, cardY(i, T[i].base + ASK) + CARD / 2], 0.55), z: 1.18 });
  // `lean` (0..1) is how far the camera leans in; the corner mark steps aside while it does, since
  // the lean carries the composer under the corner and type never sits over the UI or the art
  const camAt = (ctx: Ctx, f: number, i: number): { cam: Cam; lean: number } => {
    const t = T[i], l = f - t.base, typed = typedAt(spec.asks[i].prompt, l, t.times), [cx] = caretAt(ctx, typed);
    // the macro creeps in while the words arrive: the frame is never a still
    const macro: Cam = { c: [Math.max(TEXT.x + 330, cx - 110), 934], z: 2.4 + 0.25 * inOut(ramp(l, t.times[0] - 8, t.b)) };
    if (i > 0 && l < 16) { const k = inOut(ramp(l, 0, 16)); return { cam: camLerp(leanOn(i - 1), macro, k), lean: 1 - k }; }
    if (l > t.drop.full - 10) { const k = inOut(ramp(l, t.drop.full - 10, ASK)); return { cam: camLerp(HOME, leanOn(i), k), lean: k }; }
    return { cam: l < t.b - 4 ? macro : camLerp(macro, HOME, expo(ramp(l, t.b - 4, t.down))), lean: 0 };
  };
  const askScene = (ctx: Ctx, env: Env, f: number) => {
    const i = Math.min(n - 1, Math.floor(f / ASK)), t = T[i], l = f - t.base;
    const { cam, lean } = camAt(ctx, f, i);
    useCam(ctx, env, cam);
    const typed = typedAt(spec.asks[i].prompt, l, t.times), pr = press(l, t.down, t.up);
    chat(ctx, env, f, l < t.up ? typed : "", l < t.up, pr, ramp(l, t.down - 10, t.down - 2));
    // the pointer comes in for the press and glides back out; it never pops
    const off: P = [1780, 1140], on: P = [GEN_C[0] + 18, GEN_C[1] + 6];
    if (l >= t.b - 4 && l < t.up + 24) pointer(ctx, l < t.up + 4 ? lerpP(off, on, out3(ramp(l, t.b - 4, t.down))) : lerpP(on, off, inOut(ramp(l, t.up + 4, t.up + 24))), pr * 0.8);
    // the mark is gone BEFORE the lean moves the composer under it, and back only once the camera has left
    const show = lean > 0 && l > ASK / 2 ? 1 - ramp(l, t.drop.full - 18, t.drop.full - 10) : i > 0 && l < 24 ? ramp(l, 16, 24) : 1;
    if (show > 0) { ctx.globalAlpha = show; bug(ctx, env); ctx.globalAlpha = 1; }
  };
  // ---------------------------------------------------------------- the end card
  const endPage = (c: Ctx, env: Env, e: number) => {
    const cx = W / 2, size = Math.min(150, (1300 / measure(spec.title, 100)) * 100);
    writeOn(c, env, spec.title, cx, 400, size, ramp(e, 10, 44), "ink", { color: C.ink, align: "center", seed: 11 });
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.textAlign = "center"; c.textBaseline = "middle";
    c.globalAlpha = ramp(e, 34, 46); c.fillStyle = C.soft; c.font = SANS(500, 30); c.fillText(spec.tagline, cx, 520);
    c.globalAlpha = ramp(e, 40, 52); c.font = MONO(30);
    const pw = Math.max(...spec.install.map((s) => c.measureText(s).width)) + 120, ph = 60 * spec.install.length + 50, py = 590;
    c.fillStyle = "#1f1c18"; rr(c, cx - pw / 2, py, pw, ph, 22); c.fill();
    c.fillStyle = "#ece4d6"; spec.install.forEach((s, k) => c.fillText(s, cx, py + 55 + k * 60));
    // a terminal caret blinks after the last line: the hold reads as live, never as a freeze
    const lastW = c.measureText(spec.install[spec.install.length - 1]).width;
    if (Math.floor((e - 40) / 15) % 2 === 0) c.fillRect(cx + lastW / 2 + 8, py + 55 + (spec.install.length - 1) * 60 - 17, 16, 34);
    if (spec.footer) { c.fillStyle = C.soft; c.font = SANS(500, 24); c.fillText(spec.footer, cx, py + ph + 60); }
    c.globalAlpha = 1; c.textAlign = "left";
  };
  const content = (ctx: Ctx, env: Env, f: number) => {
    const g = clamp(Math.round(f), 0, END0 + END - 1);
    if (g < END0) return askScene(ctx, env, g);
    const e = g - END0;
    bloomFrame(ctx, env, e + 2, END + 2, () => askScene(ctx, env, END0 - 1), (c) => endPage(c, env, e), { close: false, inF: 16 });
  };

  // ---------------------------------------------------------------- the cut, as data
  const words = spec.words ?? [];
  const segs: Seg[] = [];
  spec.asks.forEach((_, i) => {
    const last = i === n - 1, fixed = segs.reduce((s, x) => s + x.len, 0);
    segs.push(last && spec.claimBar !== undefined ? pic(i * ASK, (i + 1) * ASK, grid.solve(spec.claimBar, fixed, 60)) : pic(i * ASK, (i + 1) * ASK));
    if (!last && words[i]?.length) segs.push(type(words[i], TYPE, (i + 1) * ASK - 1, (i + 1) * ASK));
  });
  segs.push(pic(END0, END0 + END));
  const cut = makeCut(segs);
  const draw = (ctx: Ctx, F: number, env: Env) => {
    const { s, local } = cut.at(F);
    if (s.kind === "pic") content(ctx, env, cut.contentOf(s, local));
    // offset by 2 frames at each end so the bloom is already moving on the first and last frame
    else typeFrame(ctx, env, s.lines, local + 2, s.len + 4, (first) => content(ctx, env, first ? s.before : s.after), (c) => bug(c, env), TYPE_O);
  };
  // declared holds: the words' reading time on each type frame, and the end card once it is all on
  const holds: [number, number][] = [];
  cut.SEGS.forEach((s, k) => {
    if (s.kind !== "type") return;
    const written = 14 + TYPE_O.lead + 18 + (s.lines.length - 1) * TYPE_O.stagger - 2; // local frame the last line is done
    let open = s.len - 1; while (open > written && bloomRadius(open + 2, s.len + 4) < 1110) open--;   // last fully covered frame
    holds.push([cut.STARTS[k] + written + 1, cut.STARTS[k] + open + 1]);
  });
  holds.push([cut.N - END + 53, cut.N]); // the end card, all on: read it, screenshot it
  return {
    meta: { title: `${spec.title} · launch`, W, H, fps, bpm: spec.bpm, durationFrames: cut.N, raster: "cpu", kind: "launch", holds },
    assets: { images: {} },
    shots: [{ id: "cut", start: 0, end: cut.N, draw }],
    audio: spec.audio ?? (spec.score ? musicBed(asPiece(spec.score), cut.N, fps) : undefined),
    cut,
  };
};

// A music bed: the first `frames` of a composed piece, faded out over the last 1.2 s, then set to
// `lufs` integrated (default -14, the one published cross-platform target) with the true peak held
// at or under -1 dBTP. Compose the piece for this film, at the film's bpm, so the cuts sit on its downbeats.
export const musicBed = (piece: () => Piece, frames: number, fps = 30, lufs = -14) => (sr: number): [Float32Array, Float32Array] => {
  const n = Math.round((frames / fps) * sr), L = new Float32Array(n), R = new Float32Array(n), m = renderPiece(piece(), sr);
  for (let i = 0; i < n && i < m.L.length; i++) { L[i] = m.L[i]; R[i] = m.R[i]; }
  const fade = Math.round(1.2 * sr); for (let i = 0; i < fade && i < n; i++) { const g = i / fade; L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
  const now = loudness([L, R], sr).integrated, peak = truePeak([L, R]).dbtp;
  const gainDb = Math.min(lufs - now, -1 - peak), g = Math.pow(10, gainDb / 20); // loudness first, never past -1 dBTP
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  return [L, R];
};

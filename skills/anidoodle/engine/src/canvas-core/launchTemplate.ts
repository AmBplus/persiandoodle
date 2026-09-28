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
  C, SANS, MONO, camLerp, caretAt, charTimes, clamp, drawChatFrame, expo, inOut, inkCard, inkDrop,
  lerp, lerpP, out3, plateLayer, pointer, press, ramp, rr, typedAt, useCam, type Cam, type Drop,
} from "./launchKit";
import { launchLayout, SHAPES, type LaunchLayout, type Shape } from "./launchLayout";
import { beatGrid, bloomFrame, bloomRadius, makeCut, pic, type, typeFrame, type Seg, type TypeLine } from "./launchCut";
import { measure, writeOn } from "./kinetic";
import { fitScore, limiter, renderPiece } from "./music/render";
import { loudness, truePeak } from "./music/meter";
import * as families from "./music/pieces/families";
import * as launchPieces from "./music/pieces/launch";
import * as nocturnePieces from "./music/pieces/nocturne";
import * as samplers from "./music/pieces/samplers";
import type { Piece } from "./music/plan";
import { composePiece, stretchIndex, withStretch, type Material } from "./music/compose";
import { perform } from "./music/perform";
import { beatsPerBar } from "./music/plan";
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
  claimBar?: number;         // land the end card on this bar's downbeat, counting from bar 0 (solves the last ask)
  // The score: a piece COMPOSED for this product's brief (references/music/compose.md), or null for
  // a silent film. Required, so no film inherits a score by default. anidoodle's own pieces are
  // refused: every user's film gets its own music, never ours.
  // A Material (what compose.md writes) is composed here; a finished Piece is used as is.
  score: (() => Piece | Material) | null;
  audio?: Film["audio"];     // or your own finished mix; wins over score
  limit?: boolean;           // let a look-ahead limiter take the score's last peaks so it reaches -14 LUFS (default off: the peak ceiling wins)
  shape?: Shape;             // the frame: 16x9 (default), 1x1, 4x5, 9x16. Every shape is re-composed by launchLayout, never cropped; film.reshape(s) gives the same film in another shape
};

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

// the timing inside one ask beat, from its prompt and its length
const askTiming = (prompt: string, i: number, ASK: number) => {
  const raw = charTimes(prompt, 0, 1, 7 + i * 4), last = raw[raw.length - 1] || 1;
  const b = Math.round(ASK * 0.25), a = i === 0 ? -Math.round(b * 1.2) : 4; // the first prompt is under way at frame 0
  const times = raw.map((t) => a + (t / last) * (b - a));
  const down = b + 16, up = down + 5, drop: Drop = { t0: up + 5, land: up + 19, full: up + 40 };
  return { times, b, down, up, drop };
};

export type LaunchFilm = Omit<Film, "reshape"> & { cut: ReturnType<typeof makeCut>; layout: LaunchLayout; reshape: (shape: string) => LaunchFilm };
export const makeLaunchFilm = (spec: LaunchSpec): LaunchFilm => {
  const fps = spec.fps ?? 30, n = spec.asks.length, shape = spec.shape ?? "16x9";
  if (!(shape in SHAPES)) throw new Error(`launchTemplate: shape '${shape}' is not one of ${Object.keys(SHAPES).join(", ")}`);
  const L = launchLayout(shape, { prompts: spec.asks.map((a) => a.prompt), install: spec.install, tagline: spec.tagline, title: spec.title });
  const W = L.W, H = L.stage.h, G = L.chat, TH = L.thread, CAM = L.cam, CARD = TH.card, VIEW_BOTTOM = TH.viewBottom;
  const GEN_C: P = [G.GEN.x + G.GEN.w / 2, G.GEN.y + G.GEN.h / 2];
  if (!(spec.bpm > 0)) throw new Error("launchTemplate: set bpm from the brief (the tempo of the score composed for this film)");
  if (spec.score === undefined && !spec.audio) throw new Error("launchTemplate: `score` is required: a piece composed for this product (references/music/compose.md), or null for silence");
  if (spec.score) refuseOurs(spec.score);
  const grid = beatGrid(spec.bpm, fps);
  const ASK = Math.round((spec.askBeats ?? 6) * grid.beat), TYPE = Math.round((spec.typeBeats ?? 4) * grid.beat), END0_HOLD = Math.round((spec.endBeats ?? 8) * grid.beat);
  let END = END0_HOLD; // the end card is a hold: a scored film sets it so the film is whole bars of its score
  if (n < 1 || n > 3) throw new Error("launchTemplate: 1 to 3 asks; more is a feature list, not a story");
  if (ASK < 100) throw new Error(`launchTemplate: an ask beat needs 100 frames or more (it has ${ASK}); raise askBeats`);
  if (END < MIN_END(fps)) throw new Error("launchTemplate: the end card must hold the install lines 3 s or more; raise endBeats");
  // claimBar solves the last ask's length. A longer ask is really longer (the card holds, the plate
  // draws over the extra time); it is never the same ask slowed down, which would repeat frames.
  const typeCount = spec.asks.slice(0, -1).filter((_, i) => spec.words?.[i]?.length).length;
  const SOLVED = spec.claimBar !== undefined ? grid.solve(spec.claimBar, (n - 1) * ASK + typeCount * TYPE, 60) : ASK;
  const LEN = spec.asks.map((_, i) => (i === n - 1 ? Math.max(ASK, SOLVED) : ASK)); // content frames per ask
  const BASE = LEN.map((_, i) => LEN.slice(0, i).reduce((a, b) => a + b, 0));
  const T = spec.asks.map((a, i) => ({ ...askTiming(a.prompt, i, ASK), base: BASE[i], len: LEN[i] }));
  const END0 = BASE[n - 1] + LEN[n - 1]; // content frame where the end card starts

  // ---------------------------------------------------------------- the thread
  type Item = { at: number; h: number; user?: string; lines?: string[]; card?: number };
  const items: Item[] = [];
  T.forEach((t, i) => { items.push({ at: t.base + t.up, h: TH.bubbleH + (TH.bubbles[i].length - 1) * TH.bubbleLineH, user: spec.asks[i].prompt, lines: TH.bubbles[i] }); items.push({ at: t.base + t.drop.land, h: CARD + TH.cardDy, card: i }); });
  const ys = (() => { let y = TH.top; return items.map((it) => { const r = y; y += it.h + TH.gap; return r; }); })();
  const scrollAt = (f: number) => { let s = 0; items.forEach((it, k) => { const want = Math.max(0, ys[k] + it.h - VIEW_BOTTOM); if (want > s) s += (want - s) * expo(ramp(f, it.at - 2, it.at + 16)); }); return s; };
  const cardY = (i: number, f: number) => ys[items.findIndex((it) => it.card === i)] + TH.cardDy - scrollAt(f);
  const plateFrame = (i: number, f: number) => { const a = spec.asks[i], t = T[i], from = a.from ?? 0, to = a.to ?? a.plate.meta.durationFrames - 1; return lerp(from, to, ramp(f, t.base + t.drop.land, t.base + t.len - 8)); };

  const bug = (c: Ctx, env: Env) => writeOn(c, env, spec.title, L.bug.x, L.bug.y, L.bug.px, 1, "ink", { color: C.soft, align: "right", seed: 3 });
  const chat = (ctx: Ctx, env: Env, f: number, typed: string, caret: boolean, pr: number, hot: number) => {
    drawChatFrame(ctx, { typed, caret, placeholder: spec.placeholder ?? "Describe what you want…", genPress: pr, genHot: hot, title: spec.title, subtitle: spec.subtitle ?? "", genLabel: spec.genLabel, accent: spec.accent }, G);
    const sc = scrollAt(f);
    ctx.save(); ctx.beginPath(); ctx.rect(...TH.clip); ctx.clip();
    items.forEach((it, k) => {
      if (f < it.at) return;
      const y = ys[k] - sc; if (y > VIEW_BOTTOM || y + it.h < 100) return;
      if (it.user !== undefined) {
        ctx.globalAlpha = ramp(f, it.at, it.at + 8); ctx.font = SANS(500, G.px.bubble);
        const bw = Math.max(...it.lines!.map((l) => ctx.measureText(l).width)) + 2 * TH.bubblePad; ctx.fillStyle = C.chip; rr(ctx, TH.bubbleR - bw, y, bw, it.h - 2, TH.bubbleRad); ctx.fill();
        ctx.fillStyle = C.ink; ctx.textBaseline = "middle"; it.lines!.forEach((l, j) => ctx.fillText(l, TH.bubbleR - bw + TH.bubblePad, y + TH.bubbleH / 2 + j * TH.bubbleLineH)); ctx.globalAlpha = 1;
      } else {
        const i = it.card!, a = spec.asks[i];
        const d = T[i].drop, b = T[i].base;
        inkCard(ctx, TH.cardX, y + TH.cardDy, CARD, f, { t0: b + d.t0, land: b + d.land, full: b + d.full }, plateLayer(env, `ask${i}`, a.plate, plateFrame(i, f), 1080), a.label, a.crop, G);
      }
    });
    ctx.restore();
    T.forEach((t, i) => inkDrop(ctx, f, { t0: t.base + t.drop.t0, land: t.base + t.drop.land }, [TH.cardX + CARD / 2, cardY(i, t.base + t.drop.land) + CARD / 2], G));
  };
  // the camera: macro on the composer while typing, out to the room for the press, then a lean in on the new card
  const HOME = CAM.home;
  const leanOn = (i: number): Cam => ({ c: lerpP(HOME.c, [TH.cardX + CARD / 2, cardY(i, T[i].base + T[i].len) + CARD / 2], 0.55), z: CAM.leanZ });
  // `lean` (0..1) is how far the camera leans in; the corner mark steps aside while it does, since
  // the lean carries the composer under the corner and type never sits over the UI or the art
  // on a phone frame the words wrap, so the caret jumps back a line: the camera follows a smoothed
  // caret (the mean of its last 10 frames), a glide down to the new line, never a jump
  const phoneMacro = (ctx: Ctx, i: number, l: number, z: number): P => {
    const half = W / 2 / z, lo = G.INPUT.x - 24 * G.k + half, hi = Math.max(lo, G.GEN.x + G.GEN.w + 30 * G.k - half);
    let x = 0, y = 0; for (let j = 0; j < 10; j++) { const [cx, cy] = caretAt(ctx, typedAt(spec.asks[i].prompt, l - j, T[i].times), G); x += clamp(cx - 110 * G.k, lo, hi); y += cy; }
    const yLo = G.INPUT.y + (H / 2) / z - 90 * G.k, yHi = G.INPUT.y + G.INPUT.h + 40 * G.k - (H / 2) / z;
    return [x / 10, clamp(y / 10, Math.min(yLo, yHi), Math.max(yLo, yHi))];
  };
  const camAt = (ctx: Ctx, f: number, i: number): { cam: Cam; lean: number } => {
    const t = T[i], l = f - t.base, typed = typedAt(spec.asks[i].prompt, l, t.times), [cx] = caretAt(ctx, typed, G);
    // the macro creeps in while the words arrive: the frame is never a still. On a phone frame the
    // whole composer is in view (the words wrap), so it holds on the composer instead of the caret
    const mz = CAM.macroZ + CAM.macroCreep * inOut(ramp(l, t.times[0] - 8, t.b));
    const macro: Cam = { c: L.shape === "16x9" ? [Math.max(G.TEXT.x + CAM.macroX0, cx - 110), CAM.macroY] : phoneMacro(ctx, i, l, mz), z: mz };
    if (i > 0 && l < 16) { const k = inOut(ramp(l, 0, 16)); return { cam: camLerp(leanOn(i - 1), macro, k), lean: 1 - k }; }
    if (l > t.drop.full - 10) { const k = inOut(ramp(l, t.drop.full - 10, t.len)); return { cam: camLerp(HOME, leanOn(i), k), lean: k }; }
    return { cam: l < t.b - 4 ? macro : camLerp(macro, HOME, expo(ramp(l, t.b - 4, t.down))), lean: 0 };
  };
  const askScene = (ctx: Ctx, env: Env, f: number) => {
    let i = n - 1; while (i > 0 && T[i].base > f) i--; const t = T[i], l = f - t.base;
    const { cam, lean } = camAt(ctx, f, i);
    useCam(ctx, env, cam);
    const typed = typedAt(spec.asks[i].prompt, l, t.times), pr = press(l, t.down, t.up);
    chat(ctx, env, f, l < t.up ? typed : "", l < t.up, pr, ramp(l, t.down - 10, t.down - 2));
    // the pointer comes in for the press and glides back out; it never pops
    const off: P = CAM.pointerOff, on: P = CAM.pointerOn;
    if (l >= t.b - 4 && l < t.up + 24) pointer(ctx, l < t.up + 4 ? lerpP(off, on, out3(ramp(l, t.b - 4, t.down))) : lerpP(on, off, inOut(ramp(l, t.up + 4, t.up + 24))), pr * 0.8, CAM.pointerS);
    // the mark is gone BEFORE the lean moves the composer under it, and back only once the camera has left
    const show = lean > 0 && l > ASK / 2 ? 1 - ramp(l, t.drop.full - 18, t.drop.full - 10) : i > 0 && l < 24 ? ramp(l, 16, 24) : 1;
    if (show > 0) { ctx.globalAlpha = show; bug(ctx, env); ctx.globalAlpha = 1; }
  };
  // ---------------------------------------------------------------- the end card
  const endPage = (c: Ctx, env: Env, e: number) => {
    const E = L.end, cx = E.cx, size = Math.min(E.titleMax, (E.titleW / measure(spec.title, 100)) * 100);
    writeOn(c, env, spec.title, cx, E.titleY, size, ramp(e, 10, 44), "ink", { color: C.ink, align: "center", seed: 11 });
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.textAlign = "center"; c.textBaseline = "middle";
    c.globalAlpha = ramp(e, 34, 46); c.fillStyle = C.soft; c.font = SANS(500, E.taglinePx); E.tagline.forEach((t, j) => c.fillText(t, cx, E.taglineY + j * E.taglineLH));
    c.globalAlpha = ramp(e, 40, 52); c.font = MONO(E.monoPx);
    const nI = spec.install.length, pw = Math.max(...spec.install.map((s) => c.measureText(s).width)) + 2 * E.padX, ph = E.rowH * nI + 2 * (E.lineY0 - E.panelY) - E.rowH, py = E.panelY;
    c.fillStyle = "#1f1c18"; rr(c, cx - pw / 2, py, pw, ph, 22 * L.k); c.fill();
    c.fillStyle = "#ece4d6"; spec.install.forEach((s, k) => c.fillText(s, cx, E.lineY0 + k * E.rowH));
    // a terminal caret blinks after the last line: the hold reads as live, never as a freeze
    const lastW = c.measureText(spec.install[nI - 1]).width;
    if (Math.floor((e - 40) / 15) % 2 === 0) c.fillRect(cx + lastW / 2 + 8 * (E.monoPx / 30), E.lineY0 + (nI - 1) * E.rowH - E.caret[1] / 2, E.caret[0], E.caret[1]);
    if (spec.footer) { c.fillStyle = C.soft; c.font = SANS(500, E.footerPx); c.fillText(spec.footer, cx, E.footerY); }
    c.globalAlpha = 1; c.textAlign = "left";
  };
  const content = (ctx: Ctx, env: Env, f: number) => {
    const g = clamp(Math.round(f), 0, END0 + END - 1);
    if (g < END0) return askScene(ctx, env, g);
    const e = g - END0;
    bloomFrame(ctx, env, e + 2, END + 2, () => askScene(ctx, env, END0 - 1), (c) => endPage(c, env, e), { close: false, inF: 16, W, H });
  };

  // ---------------------------------------------------------------- the cut, as data
  const words = spec.words ?? [];
  const TYPE_OPTS = L.shape === "16x9" ? TYPE_O : { ...TYPE_O, W, H, maxW: L.type.maxW };
  const segs: Seg[] = [];
  spec.asks.forEach((_, i) => {
    const last = i === n - 1;
    const b = BASE[i], e = b + LEN[i];
    segs.push(last && spec.claimBar !== undefined ? pic(b, e, SOLVED) : pic(b, e)); // SOLVED < ASK plays the ask faster; never slower
    if (!last && words[i]?.length) segs.push(type(fitWords(words[i], L), TYPE, e - 1, e));
  });
  // the score plays at the film's bpm, exactly: the cuts sit on this grid. Sync wins over length, so
  // the end-card hold (not the tempo) takes up the difference: the film becomes whole bars of the score.
  const bed = !spec.audio && spec.score ? gridScore(spec.score, spec.bpm, fps, segs.reduce((a, x) => a + x.len, 0), END) : null;
  if (bed) END = bed.end;
  segs.push(pic(END0, END0 + END));
  const cut = makeCut(segs);
  const draw = (ctx: Ctx, F: number, env: Env) => {
    const { s, local } = cut.at(F);
    if (s.kind === "pic") content(ctx, env, cut.contentOf(s, local));
    // offset by 2 frames at each end so the bloom is already moving on the first and last frame
    else typeFrame(ctx, env, s.lines, local + 2, s.len + 4, (first) => content(ctx, env, first ? s.before : s.after), (c) => bug(c, env), TYPE_OPTS);
  };
  // declared holds: the words' reading time on each type frame, and the end card once it is all on
  const holds: [number, number][] = [];
  cut.SEGS.forEach((s, k) => {
    if (s.kind !== "type") return;
    const written = 14 + TYPE_O.lead + 18 + (s.lines.length - 1) * TYPE_O.stagger - 2; // local frame the last line is done
    let open = s.len - 1; while (open > written && bloomRadius(open + 2, s.len + 4) < L.type.cover) open--;   // last fully covered frame
    holds.push([cut.STARTS[k] + written + 1, cut.STARTS[k] + open + 1]);
  });
  // a solved ask longer than the grid's: the finished card rests on screen until the end card blooms
  if (LEN[n - 1] > ASK) { const S = cut.STARTS[cut.SEGS.length - 2]; holds.push([S + LEN[n - 1] - 18, S + LEN[n - 1] + 6]); }
  holds.push([cut.N - END + 53, cut.N]); // the end card, all on: read it, screenshot it
  let memo: Map<string, LaunchFilm> | null = null;
  const self: LaunchFilm = {
    meta: { title: `${spec.title} · launch${shape === "16x9" ? "" : ` · ${shape}`}`, W, H: L.H, fps, bpm: spec.bpm, durationFrames: cut.N, raster: "cpu", kind: "launch", holds, ...(bed ? { score: { tempo: spec.bpm, form: bed.form, grid: true } } : {}) },
    assets: { images: {} },
    shots: [{ id: "cut", start: 0, end: cut.N, draw }],
    audio: spec.audio ?? (bed ? musicBed(() => bed.piece, cut.N, fps, -14, { limit: spec.limit, tempo: spec.bpm }) : undefined),
    cut, layout: L,
    // the same film composed for another frame shape (one timeline: the cut, the timing and the sound do not change)
    reshape: (s: string) => { if (s === shape) return self; memo ??= new Map(); let f = memo.get(s); if (!f) { f = makeLaunchFilm({ ...spec, shape: s as Shape }); memo.set(s, f); } return f; },
  };
  return self;
};

// Words sized for the frame: a line that would come out under the phone-safe type size is broken at
// its middle space (a word page holds at most three lines); one that still cannot is an error.
export const fitWords = (lines: TypeLine[], L: LaunchLayout): TypeLine[] => {
  const sizeOf = (ls: TypeLine[]) => Math.min(ls.length === 1 ? 190 : 130, ...ls.map((l) => (L.type.maxW / measure(l.text, 100)) * 100));
  let out = lines;
  while (sizeOf(out) < L.type.minPx && out.length < 3) {
    const k = out.reduce((b, l, i) => (measure(l.text, 100) > measure(out[b].text, 100) ? i : b), 0), words = out[k].text.split(" ");
    if (words.length < 2) break;
    let best = 1, bw = Infinity; for (let j = 1; j < words.length; j++) { const w = Math.max(measure(words.slice(0, j).join(" "), 100), measure(words.slice(j).join(" "), 100)); if (w < bw) { bw = w; best = j; } }
    out = [...out.slice(0, k), { ...out[k], text: words.slice(0, best).join(" ") }, { ...out[k], text: words.slice(best).join(" ") }, ...out.slice(k + 1)];
  }
  if (sizeOf(out) < L.type.minPx) throw new Error(`launchTemplate ${L.shape}: the words "${lines.map((l) => l.text).join(" / ")}" would be ${sizeOf(out).toFixed(0)} px on a word page (phone-safe minimum ${L.type.minPx} px): use fewer words`);
  return out;
};

type Fit = ReturnType<typeof fitScore>;
const MIN_END = (fps: number) => 3 * fps + 40; // the install lines held 3 s or more, after the card writes on

/**
 * The score for a beat-grid film: played at the film's bpm exactly (the cuts sit on that grid), and
 * the film made whole bars of it. A Material's stretch section is repeated 0..n times; each form is
 * `bars` long plus whole bars for its tail to ring out, and the form whose length puts the end-card
 * hold nearest the one asked for wins (the hold stays between 3 s and the asked hold + 4 bars).
 * No tempo is changed; if no form fits, it throws. Bars before the final ritard are checked against
 * the grid to half a frame, so a rubato or a breath can never pull a downbeat off a cut.
 */
export const gridScore = (score: () => Piece | Material, bpm: number, fps: number, before: number, hold: number) => {
  const x = score(), barF = (4 * 60 * fps) / bpm, lo = MIN_END(fps), hi = hold + 4 * barF;
  const forms: (() => Piece)[] = "plan" in x ? [() => x] : stretchIndex(x) < 0 ? [() => composePiece(x)] : Array.from({ length: 33 }, (_, r) => () => composePiece(withStretch(x, r)));
  let best: { piece: Piece; end: number; bars: number; ring: number } | null = null, tried: string[] = [];
  for (const make of forms) {
    const p = make(), bpb = beatsPerBar(p.plan.meter);
    if (bpb !== 4) throw new Error(`launchTemplate: the score is in ${p.plan.meter}; a launch film's cuts sit on 4-beat bars, so compose it in 4/4`);
    if (p.plan.pickupBeats) throw new Error(`launchTemplate: the score opens with a ${p.plan.pickupBeats}-beat pickup; frame 0 is a downbeat, so start the score on the bar`);
    const bars = p.plan.sections.reduce((a, q) => a + q.bars, 0), ring = Math.ceil((p.tail * bpm) / 60 / 4 - 1e-9), end = Math.round((bars + ring) * barF) - before;
    tried.push(`${bars}+${ring} bars -> hold ${(end / fps).toFixed(1)} s`);
    if (end >= lo && end <= hi && (!best || Math.abs(end - hold) < Math.abs(best.end - hold))) best = { piece: p, end, bars, ring };
    if (end > hi) break; // more repeats only make it longer
  }
  if (!best) throw new Error(`launchTemplate: the score cannot end on a bar of this film at ${bpm} bpm without changing its tempo. The cut before the end card is ${(before / fps).toFixed(1)} s and the end-card hold must be ${(lo / fps).toFixed(1)}-${(hi / fps).toFixed(1)} s; the score's forms give ${tried.join(", ")}. Compose a 1-bar stretch section (stretch: true), or change askBeats/endBeats/claimBar.`);
  const piece: Piece = { ...best.piece, plan: { ...best.piece.plan, tempo: bpm, rubato: 0 } }, perf = perform(piece, bpm, { expressive: true }), spb = 60 / bpm;
  const lastBar = Math.floor((perf.lastOnset / spb - 6) / 4); // the final ritard lives in the last 6 beats, inside the end card
  for (let k = 0; k <= lastBar; k++) { const drift = perf.sec(4 * k) - 4 * k * spb; if (Math.abs(drift) > 0.5 / fps) throw new Error(`launchTemplate: the score's bar ${k} lands ${(drift * 1000).toFixed(0)} ms off the film's grid (a breath or a caesura in the score); a launch film's cuts need every downbeat on the grid: even out the section dynamics there`); }
  return { piece, end: best.end, bars: best.bars, form: `${best.bars} bars + ${best.ring} to ring, at the film's ${bpm} bpm` };
};

// A music bed: the piece FITTED to the film, never cut and faded. With `tempo` (a beat-grid film, as
// the launch template passes it) the piece plays at exactly that tempo and the film is already whole
// bars of it (gridScore); without, fitScore fits it as filmAudio does (its stretch section repeated or
// dropped, the tempo trimmed so the tail rings out on the last frame). Then it is set to `lufs` integrated (default -14, the one published
// cross-platform target) with the true peak held at or under -1 dBTP. A dynamic piece stops at the
// peak ceiling first (render prints how far short); `limit: true` lets a look-ahead limiter take
// those few peaks instead so the bed reaches the target. Compose the piece for this film at the
// film's bpm, so the cuts sit on its downbeats. `piece` may return a Piece or a fitScore result.
export const musicBed = (piece: () => Piece | Fit, frames: number, fps = 30, lufs = -14, o: { limit?: boolean; tempo?: number } = {}) => (sr: number): [Float32Array, Float32Array] => {
  const seconds = frames / fps, x = piece(), fit = "order" in x ? x : o.tempo ? { piece: x, tempo: o.tempo } : fitScore(x, seconds);
  const m = renderPiece(fit.piece, sr, { seconds, tempo: fit.tempo }), n = Math.round(seconds * sr);
  const L = new Float32Array(n), R = new Float32Array(n); L.set(m.L.subarray(0, n)); R.set(m.R.subarray(0, n));
  const gain = (dB: number) => { const g = Math.pow(10, dB / 20); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } };
  const now = loudness([L, R], sr).integrated, peak = truePeak([L, R]).dbtp;
  if (!o.limit || lufs - now <= -1 - peak) { gain(Math.min(lufs - now, -1 - peak)); return [L, R]; } // loudness first, never past -1 dBTP
  gain(lufs - now); limiter(L, R, sr, Math.pow(10, -1.3 / 20));                                     // the limiter takes the peaks
  const again = lufs - loudness([L, R], sr).integrated; if (again > 0) { gain(Math.min(again, 1)); limiter(L, R, sr, Math.pow(10, -1.3 / 20)); }
  const tp = truePeak([L, R]).dbtp; if (tp > -1) gain(-1.05 - tp);                                    // an inter-sample overshoot: a last static trim
  return [L, R];
};


// LAUNCH LAYOUT TESTS. One timeline, four frame shapes: each shape is a composition of its own (the
// chat, the cards, the word pages, the split beat, the end card), every line a viewer reads is at
// least the phone-safe size, nothing sits over anything else, and 16x9 is the desktop film exactly.
import { CHAT_GEOM, chatGeom, CHAT } from "../src/canvas-core/launchKit";
import { launchLayout, SHAPES, MIN_PX, monoWidth, parseShapes, type Shape } from "../src/canvas-core/launchLayout";
import { makeLaunchFilm, fitWords } from "../src/canvas-core/launchTemplate";
import type { Film } from "../src/canvas-core/film";

type R = { x: number; y: number; w: number; h: number };
const inside = (a: R, b: R, tol = 0.5) => a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const overlap = (a: R, b: R) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const name = "launchLayout";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const g = chatGeom(CHAT, 1, CHAT_GEOM.px, 34, 0);
  ok(JSON.stringify([g.CHAT, g.INPUT, g.GEN, g.REPLY.x, g.REPLY.y, g.TEXT]) === JSON.stringify([CHAT_GEOM.CHAT, CHAT_GEOM.INPUT, CHAT_GEOM.GEN, CHAT_GEOM.REPLY.x, CHAT_GEOM.REPLY.y, CHAT_GEOM.TEXT]), "the chat derivation at k = 1 IS the desktop chat (one component, not two)");
  const content = { prompts: ["a lighthouse at sunset, as a print", "now a fox at dusk"], install: ["/plugin marketplace add alexgreensh/anidoodle", "/plugin install anidoodle@alexgreensh-anidoodle"], tagline: "Illustrations, loops and films, drawn in code" };
  for (const shape of Object.keys(SHAPES) as Shape[]) {
    const L = launchLayout(shape, content), frame = { x: 0, y: 0, w: L.W, h: L.H }, c = L.chat;
    ok(L.W === SHAPES[shape].W && L.H === SHAPES[shape].H, `${shape}: the frame is ${L.W}x${L.H}`);
    const small = L.roles.filter((r) => r.px < r.min);
    ok(!small.length, `${shape}: every text role is at or over its minimum (${L.roles.map((r) => `${r.role} ${r.px.toFixed(0)}`).join(", ")})`);
    if (L.phone) ok(L.roles.filter((r) => ["prompt", "bubble", "card label", "tagline", "install lines"].includes(r.role)).every((r) => r.px >= MIN_PX.phone.read), `${shape}: the lines a viewer must read are phone-safe (>= ${MIN_PX.phone.read} px)`);
    ok(inside(c.CHAT, frame) && inside(c.INPUT, c.CHAT) && inside(c.GEN, c.INPUT), `${shape}: window in frame, composer in window, button in composer`);
    ok(L.thread.cardX >= c.CHAT.x && L.thread.cardX + L.thread.card <= c.CHAT.x + c.CHAT.w && L.thread.card > 0, `${shape}: the answer card (${L.thread.card} px) sits inside the thread`);
    ok(L.thread.bubbles.every((ls) => ls.length <= 3), `${shape}: prompts wrap to at most 3 bubble lines (${L.thread.bubbles.map((b) => b.length).join(", ")})`);
    ok(L.bug.y > c.CHAT.y + c.CHAT.h, `${shape}: the corner mark sits below the chat window, never on it`);
    const pw = Math.max(...content.install.map((s) => monoWidth(s, L.end.monoPx))) + 2 * L.end.padX;
    ok(pw <= L.W, `${shape}: the install panel (${pw.toFixed(0)} px at ${L.end.monoPx.toFixed(1)} px mono) fits the frame's width`);
    ok(L.end.titleY < L.end.taglineY && L.end.taglineY < L.end.panelY && L.end.footerY < L.stage.h, `${shape}: the end card stacks title, line, panel, footer, all in frame`);
    ok(!overlap(L.split.words, L.split.ui) && inside(L.split.words, L.stage) && inside(L.split.ui, L.stage), `${shape}: a split beat's words and live UI have their own areas (${L.split.vertical ? "stacked" : "side by side"})`);
    if (L.phone) { const B = launchLayout(shape, { ...content, band: true }); ok(!!B.band && !overlap(B.band, B.stage) && B.band.y + B.band.h === B.H, `${shape}: burned-in captions get their own band under the picture (${B.band?.h} px)`); }
  }
  let err = ""; try { launchLayout("16x9", { ...content, band: true }); } catch (e) { err = (e as Error).message; } ok(/sidecar/.test(err), "16x9 refuses a burned-in band: its captions ship as .srt/.vtt");
  err = ""; try { launchLayout("9x16", { ...content, install: ["npx some-very-long-package-name@latest init --with-every-flag-there-is"] }); } catch (e) { err = (e as Error).message; } ok(/install lines would be/.test(err), `an install line that cannot be phone-safe is an error: ${err.slice(0, 80)}`);
  ok(parseShapes("16x9, 9x16").join() === "16x9,9x16", "parseShapes reads a --shapes list");
  err = ""; try { parseShapes("16x10"); } catch (e) { err = (e as Error).message; } ok(/not a shape/.test(err), "parseShapes refuses an unknown shape");

  // one timeline, every shape: the same cut and length, a different composition
  const plate: Film = { meta: { title: "plate", W: 1080, H: 1080, fps: 30, bpm: 90, durationFrames: 60 }, assets: { images: {} }, shots: [{ id: "p", start: 0, end: 60, draw: () => {} }] };
  const f = makeLaunchFilm({ title: "Tally", asks: [{ prompt: content.prompts[0], plate, label: "l" }, { prompt: content.prompts[1], plate, label: "l" }], words: [[{ text: "EVERY NUMBER, COUNTED.", style: "ink", color: "#000" }]], tagline: content.tagline, install: ["npm i tally"], bpm: 90, claimBar: 4, score: null });
  const shapes = (Object.keys(SHAPES) as Shape[]).map((s) => f.reshape(s));
  ok(shapes.every((x) => x.meta.durationFrames === f.meta.durationFrames && JSON.stringify(x.cut.STARTS) === JSON.stringify(f.cut.STARTS)), `every shape is the same cut (${f.meta.durationFrames} frames, cuts at ${f.cut.STARTS.join(", ")})`);
  ok(shapes.every((x, i) => x.meta.W === SHAPES[(Object.keys(SHAPES) as Shape[])[i]].W && x.meta.H === SHAPES[(Object.keys(SHAPES) as Shape[])[i]].H), "each shape renders at its own frame size");
  ok(f.reshape("16x9") === f && f.reshape("9x16") === f.reshape("9x16"), "reshape returns the film itself for its own shape, and one film per shape");
  const tall = fitWords([{ text: "EVERY NUMBER, COUNTED.", style: "ink", color: "#000" }], f.reshape("9x16").layout), wide = fitWords([{ text: "EVERY NUMBER, COUNTED.", style: "ink", color: "#000" }], f.layout);
  // a film ask (any film in a card) with its words beside it builds in every shape, its seam into the end card matched
  const fa = makeLaunchFilm({ title: "Tally", asks: [{ prompt: content.prompts[0], plate, label: "l" }, { kind: "film", film: plate, split: [{ text: "Any film.", style: "ink", color: "#000" }] }], tagline: "t", install: ["npm i tally"], bpm: 90, score: null });
  ok((Object.keys(SHAPES) as Shape[]).every((sh) => fa.reshape(sh).seams.every((q) => Math.hypot(q.out.p[0] - q.into.p[0], q.out.p[1] - q.into.p[1]) < 2)), "a film ask builds in every shape, the motif's seam matched");
  // the hook: the first prompt is the hero, large enough to read muted in the first 2 s, in every shape
  ok((Object.keys(SHAPES) as Shape[]).every((sh) => { const x = f.reshape(sh); return (x.heroPx ?? 0) >= (x.layout.phone ? 64 : 56); }), `the first prompt is the hero: ${(Object.keys(SHAPES) as Shape[]).map((sh) => `${sh} ${f.reshape(sh).heroPx} px`).join(", ")} (>= 64 on a phone frame, 56 on 16x9)`);
  let long = ""; try { makeLaunchFilm({ title: "Tally", shape: "9x16", asks: [{ prompt: "a very long first prompt that goes on and on about everything it could possibly want drawn today", plate, label: "l" }], tagline: "t", install: ["npm i tally"], bpm: 90, score: null }); } catch (e) { long = (e as Error).message; }
  ok(/shorten it/.test(long), "a first prompt too long for a readable hook is an error, never tiny type");
  ok(wide.length === 1 && tall.length === 2, `a word page re-sets its lines for a narrow frame (16x9: ${wide.length} line, 9x16: ${tall.map((l) => l.text).join(" / ")})`);
};

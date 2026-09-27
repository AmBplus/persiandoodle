# The launch kit: build your product's launch film

The pieces anidoodle's own launch film is made of, in `engine/src/canvas-core/`, usable for any
product. The rules they serve are in `launch-video.md`.

## Start from the template (16 s, one file)

`launchTemplate.ts` turns data into a film: two or three prompts answered by plates drawing
themselves in a chat thread, a type frame between them, and an end card with your install lines.
`launchExample.ts` is a complete one for a made-up product. Copy it:

```ts
import { C } from "./launchKit";
import { makeLaunchFilm } from "./launchTemplate";
import { lighthouseDraw } from "./lighthouseDraw";
import { foxDraw } from "./foxDraw";
import { launchLofi3 } from "./music/pieces/launch";

export const myLaunch = makeLaunchFilm({
  title: "Your Product", subtitle: "the one line it lives by",
  asks: [
    { prompt: "a lighthouse at sunset, as a print", plate: lighthouseDraw, label: "print · drawn in code" },
    { prompt: "now a fox at dusk", plate: foxDraw, label: "a second answer, same thread" },
  ],
  words: [[{ text: "IDEA IN.", style: "ink", color: C.ink }, { text: "ART OUT.", style: "ink", color: C.accent }]],
  tagline: "One sentence that says what it is",
  install: ["npm install your-product", "your-product init"],
  bpm: 90, askBeats: 6, typeBeats: 4, endBeats: 8, claimBar: 4,
  score: launchLofi3,
});
```

Add `src/hosts/page-myLaunch.ts` (three lines, copy `page-launchExample.ts`), then:

```bash
node tools/still.mjs myLaunch --frame 0 --out out/poster.png   # the first frame is the thumbnail
node tools/render.mjs myLaunch
node tools/gate.mjs myLaunch
node tools/verify-export.mjs myLaunch --file out/myLaunch.mp4
```

What you get: the first prompt already being typed at frame 0 in a close-up (a hook that reads
muted), the camera easing out for the press, an ink drop arcing from Generate into the thread
and blooming open into a card where the plate draws itself live, the thread keeping earlier
answers and scrolling, a gentle lean onto each new card, full-frame word pages between asks,
and the end card blooming open and holding. The corner mark (your name, hand-lettered) steps
aside before any lean. Real holds are declared, so the gate passes; the score is set to -14
LUFS with the true peak at or under -1 dBTP (`musicBed`; a very dynamic piece stops at the
peak ceiling first). Plates can be any film of this engine: a style plate, a `*Draw` drawing
film, or a scene you built.

| Spec field | Meaning |
|---|---|
| `title`, `subtitle`, `placeholder`, `genLabel`, `accent` | the chat's name, subline, empty text, button word, button colour |
| `asks[]` | 1-3 of `{ prompt, plate, label, from?, to?, crop? }` |
| `words[i]` | the type frame after `asks[i]` (not after the last ask; it flows into the end card) |
| `tagline`, `install[]`, `footer` | the end card; install lines are shown exactly as given |
| `bpm`, `fps`, `askBeats`, `typeBeats`, `endBeats` | the beat grid and each part's length in beats |
| `claimBar` | land the end card on this bar's downbeat; throws if it cannot |
| `score` or `audio` | a composed piece as a bed, or your own mix |

The template refuses a feature list (more than 3 asks) and an end card too short to read.

## The parts, for a film of your own shape

**`launchKit.ts`**: timing and UI.
- Easing: `ramp`, `inOut`, `out3`, `in3`, `expo`, a closed-form `spring`, `press` (a button
  press that dips and springs back). Camera: `Cam`, `camLerp` (zoom travels in log space),
  `useCam`, `toScreen`. For longer camera work use `references/camera.md`.
- `plateLayer(env, key, film, frame, px)`: draw ANY film of this engine into an offscreen layer
  at any frame. This is composition without recordings: every plate in a launch film is the real
  plate drawn live by its own code. `selfLayer` is a scratch surface for a scene inside a scene.
- The chat: `drawChatFrame(ctx, state)` (window, composer, Generate; `title`, `subtitle`,
  `genLabel`, `accent` are yours), `charTimes`/`typedAt` (human typing), `caretAt`, `pointer`,
  `inkDrop` (the drop from the button to the card), `inkCard` (the answer card that blooms
  open), `artCard`, `softShadow`, `rr`.
- The ink: `blot(c, R, seed)` and `pathOf`, a seeded wobbling rim for blooms and drops.

**`kinetic.ts`**: lettering that is written, never set.
- `writeOn(ctx, env, text, x, y, size, p, style, opts)`: a line written stroke by stroke by a
  visible tool, in `ink`, `crayon`, `thread`, `chalk`, `brick` or `marker`. `measure` sizes it.
- `sentence` (one medium per word, one word per beat), `caption` (a small callout with an
  underline or arrow), `logo`/`logoCentred` and `logoBug` (anidoodle's own wordmark and corner
  mark; for your product, write your name with `writeOn` as the template does).

**`launchCut.ts`**: the cut as data.
- `pic(from, to, len)` plays a span of your content timeline over `len` frames; `type(lines,
  len, before, after)` is a word page. `makeCut(segs)` gives `N`, `at(F)`, `contentOf`, `cutOf`
  (map content-frame sound events onto the cut).
- `beatGrid(bpm, fps)`: `beat`, `bar`, `frameOf(bar, beat)`, and `solve(bar, fixed)`, the frames
  left for one flexible segment so the claim lands on a bar (launch3 lands on bar 26).
- `bloomFrame` (a page inside an ink bloom; `close: false` keeps it open for an end card),
  `typeFrame` (one to three lines written on it; `lead`, `stagger`), `bloomRadius` (for holds).

**`launchGallery.ts`**: `drawWall` and `wallCam`, a rolling wall of style cards where the
focus card GROWS toward the viewer instead of the camera zooming. The proof-of-range beat.

**`webTour.ts`**: a website drawn in code and toured: the whole page first, then the camera
zooms to each click, with the pointer and input log driving the page's own state.

## Worked example

`launch2.ts` is anidoodle's content timeline (chat, koi with its code streaming, the wall, the
brick balloon, the almond hand, the embroidery loop, the web tour, the butterfly film, the end
card); `launch3.ts` is the cut: data segments spliced with type frames, 77 s on the score's 29
bars. Study them for pacing; build yours on the template.

# PersianDoodle ink engine v3 — handwriting reconstruction and QA

## Problem addressed

The old `persianTrace.ts` used a thin font-image skeleton, rendered all traversed strokes with one progressively widening `ctx.lineWidth`, intersected the result with a complete font mask via `source-in`, then **switched instantly to the complete font at progress=1**. That produced large jumps, especially near Persian dots, joins and stroke branches.

## New pipeline (all deterministic)

1. **Shape the entire Unicode phrase**, not isolated characters. The browser's Arabic shaper retains joining, ligatures, Urdu alternates and ZWNJ.
2. Render the shaped text once to a transparent mask with the selected, preloaded licensed font.
3. Skeletonize the mask; extract **every skeleton graph EDGE**, not just unvisited points. This covers branch junctions, loop returns and detached components.
4. Label connected opaque components; classify small detached dots/diacritics and punctuation separately from large joined glyph bodies. The rule is size- and area-based; classification can be reviewed and tuned for particular typefaces.
5. Assign deterministic travel-time intervals to body strokes right-to-left, followed by **individual dot strokes**. Every stroke, however short, receives a nonzero interval.
6. Derive the arrival time of every final opaque font pixel by propagating from the scheduled skeleton samples **through its own connected ink component** using bucketed multi-source geodesic propagation.
7. Paint each pixel according to its immutable `arrivalTime`, with a short antialias transition. **No global stroke-width changes, `source-in` growth, or end-frame drawing pop.** All pixels have fully arrived by 98.7% progress.
8. Put the nib exactly on the stroke interpolated at the same global drawing time. Between genuinely disconnected strokes the nib lifts instead of revealing a disconnected block.

`skills/anidoodle/engine/src/canvas-core/persianInkPlan.ts` implements dot segmentation, time assignment, and raster coverage; `persianTrace.ts` implements graph traversal and host-facing drawing.

## Testable invariants

- Every skeleton graph edge belongs to a traversed stroke; no lost branch.
- Dot-like components are distinguishable, and their strokes follow body strokes.
- Every nontransparent ink pixel has a valid arrival time.
- No previously painted pixel disappears or changes color as progress advances.
- The image at progress 0.99 already matches the complete 1.00 glyph; no last-frame snap.
- Actual browser frames at 0%, 20%, 45%, 70%, 90%, 98% and 99% for each Persian handwriting scene are reproducible.
- Each rendered page must keep dots, ZWNJ, kaf/yeh, numbers, titles and ascenders inside the safe text area.

## Run

```bash
cd skills/anidoodle/engine
npm ci
npx playwright-core install chromium
node tools/persian-qa.mjs
# out/persian-showcase-contact.jpg (32 intermediate samples)
# out/persian-showcase.mp4, out/persian-gallery-contact.jpg
```

GitHub Actions runs the above for pull requests and attaches original PNGs, MP4 and tiled previews as artifacts.

## Limitations / responsible claims

This is **geometry-driven ink deposition**, which visibly follows the actual final glyph strokes and dots instead of a horizontal mask. It does **not** know the historical human writing order of each contextual Nastaliq ligature, the pressure of a human hand, or every pen lift prescribed by Persian calligraphy. Those require font-specific authored stroke metadata, type-design expertise and supervised native Persian QA. A font outline alone supplies boundaries rather than the human calligrapher's intended middle-line sequence.

Sources are the original preloaded licensed fonts already vendored in the project. Do not silently alter licensed Urdu fonts or assume an Urdu Nastaliq form is identical to Iranian Persian.

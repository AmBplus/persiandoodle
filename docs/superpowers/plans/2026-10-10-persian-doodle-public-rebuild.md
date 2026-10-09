# PersianDoodle Public Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a self-hosted Persian motion library from the existing 534-entry source inventory, with independent verified media for every published variant.

**Architecture:** Keep the source catalog as a complete searchable inventory, add a generated local-render manifest as the sole public playback authority, and render native Persian scenes through the existing Anidoodle Canvas/Remotion engine. Use explicit status values so unrendered work remains visible without falling back to foreign media.

**Tech Stack:** Vanilla RTL browser UI, JSON manifests, Node 24/TypeScript engine, Canvas/Remotion, Playwright, Python validation, FFmpeg/ffprobe, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-10-persian-doodle-public-rebuild-design.md`

## Global Constraints

- Preserve all 534 catalog entries, 157 Shotcraft cards, 214 distinct Shotcraft variants, 5 music records, and 149 SFX records.
- Only `library/data/persian-renders.json` may authorize public media playback.
- Every published variant must have local video, poster, thumbnail, Persian prompt, metadata, and an editable scene/config file.
- A missing render must display an honest status and must not use a source URL as a playback fallback.
- All viewer-facing scene text must be Persian RTL with correct shaping and a declared font.
- Verify actual media with `ffprobe` and actual UI behavior with Playwright before claiming completion.

---

### Task 1: Make inventory and local-media status machine-verifiable

**Files:**
- Create: `scripts/build-persian-render-manifest.mjs`
- Create: `scripts/manifest-report.mjs`
- Modify: `library/data/persian-renders.json`
- Modify: `scripts/verify-local-persian-media.py`
- Modify: `docs/PERSIAN-RENDER-CONTRACT.md`
- Test: `scripts/test-persian-manifest.mjs`

**Interfaces:**
- `build-persian-render-manifest.mjs` reads `library/data/catalog.json` and `library/data/shotcraft-full.json`, then writes a deterministic manifest preserving expected variant slots.
- `verify-local-persian-media.py` accepts a site directory and rejects invalid local paths, missing files, wrong statuses, duplicate variant keys, and unexpected public media fields.
- `manifest-report.mjs` prints counts grouped by source and status for release reports.

- [ ] Add the status enum `identified`, `analyzed`, `in-progress`, `rendered-persian`, `verified`, `published`, and `needs-fix`, and validate it in both Node and Python.
- [ ] Generate one manifest record per catalog model and one variant record per distinct Shotcraft style, with `null` media fields until files exist.
- [ ] Add tests that prove 534 models, 214 Shotcraft variants, and no duplicate variant keys are represented.
- [ ] Run `node scripts/test-persian-manifest.mjs` and `python scripts/verify-local-persian-media.py .`; keep the empty manifest honest until a real render is added.
- [ ] Commit the inventory/contract change as `feat: formalize local Persian render inventory`.

### Task 2: Enforce local-only playback in the browser

**Files:**
- Modify: `library/source-first.js`
- Modify: `library/index.html`
- Modify: `library/source-first.css`
- Create: `skills/anidoodle/engine/tools/source-first-local-media-qa.mjs`

**Interfaces:**
- `localPath(value)` accepts only project-relative `media/...` paths from the manifest and returns `null` for external URLs.
- `resolveVariantMedia(item, index)` returns `{video, poster, thumbnail, status}` from the manifest without consulting source preview fields.

- [ ] Replace source-video/source-poster fallback in cards and detail preview with `resolveVariantMedia`.
- [ ] Render an honest status label and research link for `identified`, `in-progress`, and `needs-fix` records.
- [ ] Ensure audio controls use only manifest-local previews; source audio remains metadata-only when no local file exists.
- [ ] Add a Playwright assertion that no `<video>`, `<audio>`, or media `src` on the library page contains `http://` or `https://`.
- [ ] Run the browser QA against the current empty manifest and verify it fails only on the expected “no local render” assertions, then update the test to accept honest empty states.
- [ ] Commit as `fix: remove foreign media playback fallbacks`.

### Task 3: Add a native Persian variant scene contract

**Files:**
- Create: `skills/anidoodle/engine/src/canvas-core/persianLibrary.ts`
- Create: `skills/anidoodle/engine/src/hosts/page-persianLibrary.ts`
- Create: `skills/anidoodle/engine/tools/render-persian-variant.mjs`
- Create: `skills/anidoodle/engine/test/persianLibrary.test.ts`
- Modify: `skills/anidoodle/engine/tools/render-library-scene.mjs`

**Interfaces:**
- `PersianVariantSpec` contains `modelId`, `variantKey`, `family`, `titleFa`, `bodyFa`, `font`, `durationFrames`, `fps`, `seed`, and family parameters.
- `makePersianVariantFilm(spec)` returns the engine `Film` with deterministic frame output and Persian RTL text.
- `render-persian-variant.mjs --spec <json> --out <dir>` writes an MP4, poster, thumbnail, editable spec, and render report.

- [ ] Implement the shared frame contract at 1920x1080, 30fps, with explicit RTL canvas text direction and Vazirmatn fallback.
- [ ] Implement family dispatch for `trace`, `kinetic`, `chart`, `camera`, and `collage`; reject unknown families instead of silently using a generic scene.
- [ ] Add deterministic seed and variant identity into the scene so two distinct variants cannot produce the same output accidentally.
- [ ] Add tests for Persian shaping, finite frames, stable hashes, variant identity, and out-of-frame bounds.
- [ ] Run the focused test and a 30-frame smoke render before any long batch.
- [ ] Commit as `feat: add native Persian variant render contract`.

### Task 4: Render and package a representative verified batch

**Files:**
- Create: `library/render-specs/*.json`
- Create: `library/media/<source>/<model>/v<index>/*`
- Create: `scripts/package-persian-render.mjs`
- Modify: `library/data/persian-renders.json`
- Test: `scripts/test-render-package.mjs`

**Interfaces:**
- `package-persian-render.mjs --render <dir> --manifest <path>` updates one manifest variant only after all required files exist and pass media inspection.
- A packaged directory contains `preview.mp4`, `poster.webp`, `thumb.webp`, `prompt.fa.md`, `meta.json`, and `scene.json`.

- [ ] Select at least one real source variant from each family and record its source technique, timing, Persian copy, and mapping in `library/render-specs`.
- [ ] Render a short smoke output, inspect contact sheets, then render the complete representative batch.
- [ ] Convert posters/thumbnails to WebP, extract them from real rendered frames, and run `ffprobe` on every MP4.
- [ ] Package only outputs with valid local paths and status `rendered-persian`; leave failures as `needs-fix`.
- [ ] Run the manifest gate and browser QA against the representative batch.
- [ ] Commit as `feat: publish verified Persian render batch`.

### Task 5: Build the queued batch renderer for the remaining variants

**Files:**
- Create: `scripts/render-persian-batch.mjs`
- Create: `scripts/render-queue.json`
- Create: `scripts/render-report.mjs`
- Modify: `library/data/persian-renders.json`
- Modify: `.github/workflows/render-scene.yml`

**Interfaces:**
- `render-persian-batch.mjs --queue scripts/render-queue.json --workers 2` renders independent jobs, writes per-job logs, and never copies another variant’s output.
- `render-report.mjs` compares expected source variant keys against packaged outputs and reports missing, failed, verified, and published counts.

- [ ] Generate a queue from the source inventory with a stable `modelId/variantIndex/variantKey` identity.
- [ ] Render in bounded batches with resumable reports and no overwrite of a successful verified package.
- [ ] Add an explicit review gate that checks contact-sheet dimensions, duration, Persian glyph presence, and variant hash uniqueness.
- [ ] Run batches until every distinct variant has either a verified local render or a documented `needs-fix` record; never label unresolved items published.
- [ ] Commit each coherent batch with its generated report and keep the repository below the Pages size limit.

### Task 6: Make audio publication local and auditable

**Files:**
- Create: `scripts/build-local-audio-manifest.mjs`
- Create: `library/media/audio/native/*`
- Modify: `library/data/persian-renders.json`
- Modify: `library/data/source-audio.json`
- Modify: `library/source-first.js`
- Test: `scripts/test-audio-publication.mjs`

**Interfaces:**
- Local audio records contain `sourceId`, `localPreview`, `kind`, `duration`, `format`, `bytes`, `licenseStatus`, and `publicationStatus`.
- `build-local-audio-manifest.mjs` refuses to mark a source stock URL as a local project asset.

- [ ] Preserve all 154 source audio records and their attribution metadata.
- [ ] Generate or package only licensed/project-owned previews for public playback, using native engine audio where stock redistribution is not permitted.
- [ ] Run `ffprobe` on every published MP3/OGG and verify the UI points only to local paths.
- [ ] Commit as `feat: add auditable local audio publication records`.

### Task 7: Full release and deployed-site verification

**Files:**
- Modify: `.github/workflows/deploy-library.yml`
- Modify: `.github/workflows/source-first-library-qa.yml`
- Create: `scripts/release-check.mjs`
- Modify: `README.md`

**Interfaces:**
- `release-check.mjs --site <dir>` runs manifest validation, file existence checks, ffprobe checks, external-media scans, and catalog/variant count checks.

- [ ] Make Pages build invoke the release checker and fail on any external public media, missing required asset, or invalid status.
- [ ] Run engine tests, focused manifest tests, browser desktop/mobile QA, release checks, and FFmpeg inspection locally.
- [ ] Build `_site`, verify the actual Pages URL in a browser, and test models from multiple sources plus multiple variants from one model.
- [ ] Record final counts, file sizes, test results, known gaps, commit hashes, and deployment URL in the final operational report.
- [ ] Commit as `chore: enforce final Persian library release gate` and publish `main` only after all release checks pass.

# S7c docs track: handoff

Worktree `/Users/alexgreenshpun/CascadeProjects/Prompts/Claude-Skills/anidoodle-wt/S7c-docs`, branch
`ship/S7c-docs`. Docs only. Never edit `plugins/` (generated). `engine/src` and `engine/tools` are
read-only here.

Brief: `anidoodle-research/sound-pack/BRIEF-S3-docs.md`.

## Done and committed

| Commit | File | What changed |
|---|---|---|
| `821b40d` | `skills/anidoodle/references/music/README.md` | New "Recorded instruments: the optional sound pack" section: instrument table with real ranges read from `pack-v1/manifest.json`, `soundfetch` commands, what changes for a composer, the three rooms, and how `check` reports the split. Fixed the title and the "100 % procedural / no samples, no recordings, ever" opening, step 3's "procedural approximations" line, step 4's room, and added `sounds-licenses.md` to the pages list. |
| `598e4f0` | `skills/anidoodle/references/music/compose.md` | New "Recorded instruments" section after the workflow; `variant` / `sampled` added to the Voices bullet; step 1's "performs, synthesizes ... in code" line corrected. |
| `e9194c5` | `skills/anidoodle/SKILL.md` | Intro now says "composes the score and plays it" plus one sentence on the pack; the two `soundfetch.mjs` commands are in the engine bash block; law 5 no longer claims nothing is downloaded. **150 lines, limit 150. Frontmatter description 29 words = 38 tokens, limit 50.** Do not add lines without removing one. |
| `3a6ccbc` | `NOTICE` | Sound pack section: VCSL CC0 (no attribution required) and the three OpenAIR rooms under CC BY 4.0 with per-room URLs and the B-format decode note. |

## Still to do

1. **`skills/anidoodle/references/music/sounds-licenses.md`** (brief item 4). New file. Copy the VCSL
   CC0 note and the OpenAIR CC BY 4.0 block from
   `anidoodle-research/sound-pack/pack-v1/LICENSES.md` lines 1-6 and 522-531. Say that the per-file
   VCSL source lists are in the pack's own `LICENSES.md`. `music/README.md` already links to it.

2. **Root `README.md`** (brief item 5). Two or three plain lines in the `## Music, composed in code`
   section (around lines 95-100). English only; do not touch `README.es-ES.md`, `README.fr-FR.md`,
   `README.ja-JP.md`, `README.ko-KR.md`, `README.zh-CN.md`.

3. **The false sentences below**, then re-run `node tools/docs-check.mjs` from `skills/anidoodle/engine`.

4. **Final report** as the last message: every file changed, every false sentence before and after,
   the SKILL.md line count and description token count, and anything uncertain.

## False sentences still to fix

Verified true at the time of writing (line numbers from `git diff` HEAD~4).

| File | Line | Before | Note |
|---|---|---|---|
| `README.md` | 15 | `Every mark is a function and every note is arithmetic, so the same source` | hero; music half is now false |
| `README.md` | 97 | `No samples and no recordings. The notes are written as data and every sound is synthesized in code.` | the worst one |
| `README.md` | 178 | `**Music** is composed for each piece from a genre's vocabulary and synthesized in code:` | |
| `skills/anidoodle/references/music/sound-design.md` | 3-4 | `anidoodle makes its sound effects the way it makes its music: **in code, from nothing**. No samples or recordings.` | SFX really are code. Keep that true, drop "the way it makes its music" |
| `skills/anidoodle/references/determinism-and-contract.md` | 13 | `**No assets.** No images, no fonts from the network, no audio samples. Lettering is pen strokes; texture is seeded noise; music is arithmetic.` | keep "nothing in the repo", admit the separate pack |
| `skills/anidoodle/references/workflows/start-here.md` | 28 | `and synthesizes everything else.` | mild, fix |
| `scripts/plugin-README.md` | 5 | `with original music composed and synthesized in code.` | source for the generated `plugins/` README. Edit here, never in `plugins/` |
| `scripts/plugin-README.md` | 7 | `played by a sound engine built in code: a piano modelled on a real Steinway` | now partly recordings |
| `scripts/plugin-README.md` | 9 | `Every mark is a function and every note is arithmetic` | |
| `.codex-plugin/plugin.json` | 9 | `longDescription` ... `with original scores composed and synthesized in code.` | |

Checked and left alone, with reasons:

- `skills/anidoodle/example/README.md:5` and `example/src/canvas-core/butterfly/alive/score.ts:2`. That
  film's score is hand-written pure maths into two Float32Arrays, never a `Piece`, so the sampler
  cannot reach it. The claim is scoped to that file and is true.
- `engine/src/canvas-core/music/piano.ts:1` `No samples: every sound below is a sum of`, and
  `engine/src/canvas-core/lessonOwlScore.ts:2` `No samples.` Both module-scoped and true of those
  modules, and `engine/src` is read-only here. **Worth S1 softening**; raise it in the report.
- `engine/src/canvas-core/launch.ts:20` `no recordings` is about drawn plates, not audio. True.
- `engine/tools/html-player.mjs:42` `any score is synthesized in the page, never loaded` is now
  conditionally false with a pack installed. `engine/tools` is read-only here. Flag for S1/S2.

## Facts to keep checkable

From `anidoodle-research/sound-pack/pack-v1/manifest.json` (regenerate with the `node -e` snippet in
the transcript; ranges are `range[0]`-`range[1]` as note names):

- `piano` Steinway B A0 to G#7, 3 layers, damped, `sus`+`rel`, normalized
- `piano.upright` Knight A0 to C8, 2 layers, `rel` only
- `harp` D1 to G7, 2 layers, undamped
- `marimba` D2 to C7, 3 layers, undamped, `sparse`, `maxShift` 3
- `vibes` F3 to F6, 3 layers, damped
- `glockenspiel` G5 to C8, 3 layers, undamped, `sparse`, `maxShift` 3
- `bell.tubular` C4 to F#5, 2 layers, undamped
- `timpani` C#2 to B3, 3 layers, undamped
- rooms: `live-room` rt60 0.201, `small-room` 0.432, `recital-hall` 1.838

Engine facts already verified in code:

- `sampler.ts:66` throws on a note outside `range`.
- `sampler.ts:115` `opts.pedal !== false`; `sus` zones play for notes struck while the pedal is down.
- `sounds.mjs` `printSounds` prints `voices   recordings: ...; modeled: ...`; `music.mjs` calls it in
  both `check` and `render`.
- `mixReverb.ts:187` an unregistered room id keeps the synthesized space, so `--room` is safe with no
  pack.

## Open question for Alex

`mixProfiles.ts:101` names `room: "rymer"` for `nocturne`, but the pack's ids are `small-room`,
`recital-hall`, `live-room`. `roomFor("rymer")` is undefined, so nocturne keeps its synthesized space
and the Arthur Sykes Rymer recording is never used. That is an engine file, out of scope here.
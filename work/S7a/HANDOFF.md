# S7a film handoff

Updated 2026-10-04. Branch `ship/S7a-film`. Local commits only, do not push.

## Priority review fixes, live checkpoint

The owner paused masking until REVIEW-engine.md findings 1-5 and the scoped
REVIEW-security.md loader/default-install findings are fixed. ship/S7b-fetch was
merged successfully. No push.

Done and proven:
- Engine 1, 2, 3, 5: commit 7b26ef8. MIX_PROFILES nocturne names small-room;
  RecordedRoom carries/validates directFrames; recordedReverb skips direct frames
  and separately normalizes early/late stereo pairs to synthIR energy; directFrames
  pins voice/cache identity; effectiveSpace ignores unavailable room-only overrides.
  rooms.test.ts reproduced eight failures before the fixes and now passes all 21 checks.
- Engine 4: commit ea1fced. samplerVoice and readRel use sinc at every rate other
  than exactly 1, with cutoff divided by max(1, rate). Four image-energy regressions
  at -3 and -200 cents failed before and pass now. Combined rooms/sampler suite:
  89 passed, 0 failed, exit 0. TypeScript passes after the return-type annotation.
- The three no-pack baseline hashes were independently re-derived from release/0.6
  revision 7970552c1a7a6d986c972cdd3d7df145c9ce634a; all MATCH. See release-baseline.log/json.

- Security 2: commit 7a9434d. music.mjs main and audio.mjs prepareFilmSounds discover
  soundsDir() when flags/environment are unset. Both default-install tests failed
  before and passed again in review-default-commit.log (exit 0).

Done and proven, loader commits:
- 131be2d: Object.hasOwn prevents inherited instrument lookup. Regression failed
  before and passes in review-own-commit2.log; full run exited 0.
- fe88af3: ffprobe/ffmpeg force FLAC and decode the exact hashed stdin bytes.
  The regression replaces the path after hashing and checks both decoder inputs.
  Symlink-containment rejection is also tested. review-bytes-commit.log records PASS.
- 0a74d41: loadBanks forwards directFrames and compares it for room reload identity.
  Both metadata checks pass in review-direct-commit.log.
- Windows: absolute PATH resolver in sounds.mjs decoderPath; simulated Windows test
  passed in review-windows-commit2.log (exit 0) and failed with ENOENT when the resolver
  was removed in review-windows-red2.log (exit 1). Native Windows was not run.

Half done or untouched:
- No scoped review production fix remains untouched. Final full-suite verification
  after restoring masking is pending.
- Masking production delta remains saved, not applied. render.ts calibrateBank/renderV2,
  mixProfiles.ts recordedEq, sampler.ts SampleTrim, guards.ts maskingPlan and loader
  measurement logging need restoration from masking-in-progress.patch. Its behavioral
  tests are saved in recordedMix-in-progress.ts. New acceptance is untouched.

Masking is paused. masking-in-progress.patch and recordedMix-in-progress.ts retain
its production/test delta. Previous current-pack.json acceptance predates the room
and sinc fixes and is INVALID as final acceptance. Reapply the patch after review
commits, adapting hunks to the new room code, and rerun all acceptance measurements.
Never treat historical trial/final/current JSON as current acceptance.

An initial default-install regression used music calibrate, which can regenerate
vocabTrim.ts without a pack. It was stopped before any palette write; read-back git
diff confirmed vocabTrim.ts unchanged. It was replaced with check nocturne --seconds 1.

## Scope and authority

The owner accepted part 1 and now authorizes part 2 in this same session.
Part 1 is committed and proven below. Part 2 is in progress: restore load-time
spectral measurements, apply role-aware EQ in the existing mix stage, and keep
guard role renders on the complete part's EQ. No scores or per-piece tuning.
The earlier experiment was removed before part 1 delivery; its results below
remain historical until the new implementation passes fresh acceptance checks.

Read first for continuation:
- `/Users/alexgreenshpun/CascadeProjects/Prompts/Claude-Skills/anidoodle-research/sound-pack/BRIEF-S1-film.md`
- `CONTRACT.md` in the same folder, including amendments (b)/(c).
- `/Users/alexgreenshpun/CascadeProjects/Prompts/Claude-Skills/anidoodle-wt/S6b-voice/work/B2-acoustics/HANDOFF.md`
- `MARIMBA-MASKING.md` beside that handoff.

All were read in full in this session. The supplied AGENTS.md requires sequential
execution. Initially only `skills/anidoodle/engine/node_modules` was untracked;
that dependency symlink is preserved and excluded from commits. No installations,
pushes, or edits to soundpack.mjs, soundfetch.mjs, references, SKILL.md, or README files.

## Delivered part 1

- `FilmAudio.scores` exposes score requirements without changing the audio function's
  call signature. `filmAudio`, `musicBed`, and `launchAudio` propagate it. Existing
  launch1/2/3 declare their scores and retain `Piece.legacy`, so they remain modeled.
- `tools/audio.mjs` bundles the film and music registry together, loads the needed
  banks plus rooms through the existing `tools/sounds.mjs` loader, and renders the
  complete film track including cues. Each load has its own registry. Variant banks
  are checked with instrument plus variant. The WAV CLI is now also available there.
- `build-page.mjs` pre-renders a 48 kHz stereo Float32 track when recordings or a
  recorded room apply, then embeds it in the self-contained HTML. The browser does
  no pack fetch or FLAC decoding. Manifest hashes, FLAC validation and calibration
  remain the shared loader's responsibility. This route was announced before building.
  It avoids maintaining another FLAC/hash loader in the browser and preserves the
  complete Node mix, including its cues, without browser decoder differences.
- Browser synthesis previously happened in `hosts/page.ts`, in `audio(sr)` and
  click-to-play `play()`. Both now use the embedded complete track when present.
  Click playback creates its AudioBuffer at the track's 48 kHz rate; Web Audio
  handles the device rate. The export API supports other rates with interpolation
  and an anti-alias filter when reducing the rate. No-pack uses the original synth.
- Playwright and HTML-player adapters, render, emit, gate and verify-export inherit
  this page path. Remotion and Hyperframes use the shared Node audio path directly.
  Hyperframes previously asked its engine to capture audio elements, which did not
  contain this film's synthesized score.
- Fallback tools print one line naming code-built instruments and explaining
  `ANIDOODLE_SOUNDS=<pack-dir>` after downloading the optional sound pack.

Commits: `de2b2a0` (score metadata), `e65f64c` (recorded exports and playback).

## Proof and exact results

Testing pack:
`/Users/alexgreenshpun/CascadeProjects/Prompts/Claude-Skills/anidoodle-research/sound-pack/pack-snap2`.

Both shipped launch examples have `score: null`; the other scored launch films
are legacy, which the contract forbids sampling. The owner explicitly approved
using the shipped shortest `launchExample` plus a scored launch-template fixture.
`scored-film.ts` is that 14 s fixture, with harp lead and marimba chords/bass.
It does not change any shipped score. `launchExample` is 16 s of code-built cues.

Before editing production code, `node work/S7a/film-baseline.mjs` captured WAV hashes
in `film-baseline.json` and `film-baseline.log`. Baseline source revision is
`b0be4f708b2dc7f59dc8704f515c16885ae4e5fb`. Do not overwrite the baseline.

From the worktree root:
```
node work/S7a/film-proof.mjs /Users/alexgreenshpun/CascadeProjects/Prompts/Claude-Skills/anidoodle-research/sound-pack/pack-snap2
```
Final run exited 0 and printed `FILM PROOF PASS`. Results are `film-proof.json` and
`film-proof.log`:
- launchExample, with and without pack: WAV MD5 `f9c4185f6c42c64ac0610196b5233e89`.
- Scored fixture without pack: WAV MD5 `344a1e1d68c265ccca57165c7896ef9b`.
- Scored fixture with pack: WAV MD5 `5658bd32a3d2d8276c957d9ccf7c4991`.
- Recorded log names chords (marimba), lead (harp), bass (marimba). Celesta and
  percussion remain modeled. This is the complete score-plus-cues film track.
- No-pack Node WAVs match pre-edit baselines exactly. No-pack browser PCM matches
  the original browser source exactly. Node and browser synth outputs already
  differed before this change; the proof compares each runtime with its baseline.
- Recorded browser PCM is sample-identical to Node at 48 kHz. All four offline
  pages made zero outside requests, had no page errors, retained duration at
  24 kHz, and passed click playback with a forced 44.1 kHz device context.
  Recorded clicks used a 48 kHz AudioBuffer, modeled clicks used 44.1 kHz.
- Proof pins the baseline revision, so it remains runnable after these commits.

Additional real CLI check, from `skills/anidoodle/engine`:
```
ANIDOODLE_SOUNDS= node tools/audio.mjs launchExample ../../../work/S7a/launchExample-cli.wav
```
Exit 0, fallback notice, `768000 frames @ 48000 Hz`; read-back WAV MD5 was
`f9c4185f6c42c64ac0610196b5233e89`.

Required checks from `skills/anidoodle/engine`:
- `node tools/test.mjs`: exit 0, **315 passed, 0 failed**, `test-final.log`.
- `ANIDOODLE_SOUNDS= ANIDOODLE_THREADS=2 node tools/music-unit.mjs`: exit 0,
  **38 checks PASS in 211 s**, `music-unit-final.log`.
- `./node_modules/.bin/tsc --noEmit`: exit 0.
- `node --check tools/audio.mjs`, `node --check tools/adapters/hyperframes.mjs`,
  and `git diff --check`: exit 0.

## Limits and remaining work

No listening judgment, full MP4 encode, complete emit verification, or installed
Remotion/Hyperframes runtime was exercised. Their audio routing is implemented;
the offline real page, Node mix, browser export and click path are the runtime proof.
The embedded Float32 track grows HTML by roughly 512 kB per second of audio.
Custom audio closures that render a score must expose `.scores`, or use the provided
wrappers, for the host to discover their pack requirements.

Part 2 is not complete. Production sampler, mixProfiles and guards are identical
to the baseline. Existing recorded masking failures therefore remain. The fresh
engineer must implement the measured role EQ and rerun all original part 2 checks.

## Historical mix evidence, not delivered acceptance

These durable files preserve work done BEFORE the owner narrowed scope. They do
not describe the committed mix and must not be counted as final passing checks:
`baseline.json`, `baseline-pack.json`, `trial-pack.json`, `final-pack.json`,
`mix-diagnostics.json`, `acceptance.mjs`, `mix-diagnostics.mjs`, and their local logs.
The diagnostic script imports removed experimental exports and cannot run on the
delivered code. `acceptance.mjs` can measure the current baseline; pass/fail is
asserted when its mode is not `baseline`. Never overwrite `baseline.json`.

Pre-change pack measurements in `baseline-pack.json`: marimbaCurious clear in 0%
of bars, harpTender 100%, nocturne 68.75%. Worst lead-relative balance errors were
0.721, 0.717, 1.498 dB respectively, using the worse of pre-EQ and post-EQ checks.

Withdrawn experiment measured zone energy fractions in 500 Hz to 4 kHz, compared
them with modeled references, and applied a broad 1.4 kHz bell at Q 0.45 to bass
or accompaniment only. It considered both relative excess and absolute fraction;
using relative excess alone left nocturne failing. No scores or faders were changed.
Its last measurements passed, but the implementation was removed as instructed.

Important finding for the next engineer: guard renders that isolate a note role
must retain the full part's fixed EQ choice. Recalculating the median spectrum
after filtering the part's notes changed nocturne's accompaniment cut and made
the guard measure a different mix. This correction is also withdrawn, not shipped.

Next action: implement part 2 from the original brief in a fresh session, using
the baseline and the prior engineer's acoustic findings. Do not infer acceptance
from historical trial/final JSON.

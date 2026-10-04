# S7a film handoff

Updated 2026-10-04. Branch `ship/S7a-film`. Local commits only, no push.

## Current result

Part 1 was accepted by the owner. The priority engine/loader review fixes are
committed. Part 2 now meets the three-piece masking and balance acceptance on
pack-snap2, after correcting the recorded rooms and sinc sampler. No score,
per-piece setting, or palette trim changed.

Authoritative acceptance: `accepted-pack.json`, copied and verified from
`stronger-pack.json`. Every row has `pass: true`.

| Piece | Clear bars | Worst margin | Worst balance error |
| --- | --- | --- | --- |
| marimbaCurious | 100% | 5.348 dB | 0.721 dB |
| harpTender | 100% | 10.461 dB | 0.771 dB |
| nocturne | 81.25% | 1.259 dB | 1.605 dB |

The guard requires at least 80% of sounding bars with a 3 dB margin. Nocturne
passes 13/16 bars; three bars remain below 3 dB. Balance compares each part to
the lead against the modeled mix, both pre-EQ and post-EQ, and stays below 2.5 dB.

## Priority review findings, completed and proven

- Engine 1: nocturne names `small-room`. rooms.test.ts verifies every room named
  in MIX_PROFILES against the pack builder's room list.
- Engine 2: RecordedRoom and loadBanks carry directFrames; recordedReverb skips
  it at the output sample rate. Voice/cache identity and loader reload identity
  include directFrames. Tests cover 48/24 kHz skip, invalid values and stale jobs.
- Engine 3: early and late recorded responses separately match synthIR's stereo
  energy convention (total energy 2, preserving channel balance). Impulse tests
  verify the actual early/late gains.
- Engine 4: samplerVoice uses sinc at every rate other than exactly 1, including
  readRel. Cutoff is 0.94 / max(1, rate). Four image-energy tests exercise -3 and
  -200 cent humanisation on strikes and releases; unity identity still passes.
- Engine 5: effectiveSpace ignores unavailable room-only overrides. musicBoxJoy
  and chiptunePlayful retain their original no-pack recipe byte for byte.
- Security 2: music.mjs and audio.mjs import soundsDir from the merged fetch
  branch. Explicit --sounds/environment settings take precedence; an unset
  setting discovers the default install. Separate CLI and film tests prove it.
- Loader: Object.hasOwn excludes inherited instrument keys. Both decoders force
  FLAC and consume the exact hashed Buffer on stdin; ffprobe counts frames to
  avoid early-exit EPIPE. The regression changes the path after hashing and
  checks both inputs. A symlink-containment regression also passes.
- Windows loader: decoderPath selects absolute PATH binaries rather than implicit
  current-directory lookup. A simulated Windows PATH/PATHEXT regression passes
  and fails with ENOENT when the resolver is removed. Native Windows was not run.

Rooms reproduced 8 failures (13 passed) before the fixes. Sinc reproduced 4
failures (64 passed). The scoped loader regressions failed before their fixes.
Red/green logs are kept in this folder. The independent release/0.6 baseline
was re-derived by release-baseline.mjs from revision
7970552c1a7a6d986c972cdd3d7df145c9ce634a, rather than trusting prior recorded hashes.

Engine 1/2/3/5 were already grouped in 7b26ef8 before the later request to split
commits. Later loader findings each have their own commit and regression:
- ea1fced: sinc fix.
- 7a9434d: default-install discovery.
- 131be2d: inherited-property lookup.
- fe88af3: verified bytes and forced FLAC.
- 0a74d41: loader directFrames and reload identity.
- 297d3e4: Windows PATH resolver.

ship/S7b-fetch was merged as explicitly requested. Other fetch security findings
and archive/fetch test gaps belong to the other track; soundfetch.mjs and
soundpack.mjs were not manually edited. No README, reference or SKILL.md edits.

## Part 2 implementation

calibrateBank measures each ordinary zone's 500 Hz-4 kHz energy fraction and
excess over its fixed modeled pitch/layer reference at load. These finite,
deterministic measurements are stored in SampleTrim and included in bank identity.
Recording PCM and existing level calibration are unchanged.

renderV2 selects the played zones and applies their median measurements through
recordedEq in the existing stem EQ stage, only for recorded bass/accompaniment.
A broad 1400 Hz bell uses capped, role-aware cuts; the existing +/-3 dB RMS
makeup holds balance. There are no instrument/piece exceptions. Bass cap is
12 dB, accompaniment 9 dB. General accompaniment strength compensates the broad
bell's rolloff and subsequent makeup. Code-built and melody EQ paths are unchanged.

maskingPlan supplies complete part strikes through RenderOpts.mixKeys, so a
role-isolated guard uses the same EQ selection as the complete mix. The fixture
avoids the EQ cap hiding an incorrect selection. mix-regression-proof.mjs passes
on current code, then proves one failure when support EQ is removed and one when
complete guard context is removed.

Commits: c4a92ba (load measurement), eddaf94 (mix and guard context),
83319b6 (stronger accompaniment plus cap-sensitive regression), d3f82d7
(final general accompaniment response). accepted-pack.json is committed in 38d035f.

## Film audio, part 1

FilmAudio.scores exposes score requirements. Node film tools share the verified
loader before rendering. The page gets a complete Node-rendered 48 kHz stereo
Float32 track, including cues, rather than decoding an unverified pack in-browser.
Remotion/Hyperframes use the same Node path. No pack uses the original synthesis.
Click playback creates the recorded AudioBuffer at 48 kHz even on a 44.1 kHz device.

The owner explicitly approved a scored launch-template fixture alongside the
unchanged shipped launchExample: both shipped launch examples have score:null,
and the other scored launch films are legacy, which cannot sample under the contract.
The fixture is scored-film.ts. Shipped scores were not changed.

Part 1 commits: de2b2a0, e65f64c, 2253206 and b7b2941. film-proof.mjs now excludes
newly added sources from its original-source overlay; those did not exist in the
baseline revision b0be4f708b2dc7f59dc8704f515c16885ae4e5fb.

## Verification

Run from skills/anidoodle/engine unless stated otherwise. The pack placeholder is
`/Users/alexgreenshpun/CascadeProjects/Prompts/Claude-Skills/anidoodle-research/sound-pack/pack-snap2`.
- `node tools/test.mjs`: 332 passed, 0 failed, exit 0 on final code.
  The final recorded-mix fixture also passed 4 checks.
- `node tools/music-unit.mjs`: 38 checks PASS in 229 s, exit 0. It verifies modeled
  output; final acceptance independently verifies no-pack bytes after the mix change.
- `node tools/sounds-unit.mjs ../../../work/S7a/loader-review-all-final`:
  SOUNDS LOADER REVIEW PASS, exit 0. Use a new fixture directory when rerunning.
- `node node_modules/typescript/bin/tsc --noEmit`: exit 0 on final code.
- Repo root: `node work/S7a/acceptance.mjs stronger <pack-snap2>`:
  all three masking/balance PASS, no-pack byte identity PASS, exit 0.
- Repo root: `node work/S7a/mix-regression-proof.mjs`: two deliberate removals each
  reproduce one regression; current code has none. Final stronger proof exit 0.
- Repo root: `node work/S7a/release-baseline.mjs`: independent baseline MATCH, exit 0.
- Repo root: `node work/S7a/film-proof.mjs <pack-snap2>`: FILM PROOF PASS, exit 0
  on final code. Node/browser equality, offline 0 external requests, click playback,
  24 kHz export and original/current no-pack byte identity pass. Final recorded
  scoredFilm WAV MD5: 797816b302690bc935ba97e1a420287b.
  Browser launch requires sandbox escalation.

No-pack stereo PCM MD5s at 48 kHz remain:
- marimbaCurious: d787a58c5704cf940a4404281e33d07a
- harpTender: f71a7e20d442d77462ef0b94e4ca8824
- nocturne: acd240c8adffd25d00ee5279f2c72d3e

No-pack film WAV MD5s remain:
- launchExample: f9c4185f6c42c64ac0610196b5233e89
- scoredFilm: 344a1e1d68c265ccca57165c7896ef9b

## Remaining state and limits

No scoped finding is half implemented or untouched. All acceptance and required
checks are complete, with exit status and output read back. Self-review checked
loader containment, decoder inputs, registry/cache identity, room timing/energy,
sinc strikes/releases and recorded-only EQ/guard context; no additional defect
was retained. This was self-review, not another independent review. No native Windows
run, MP4 export or listening judgment was performed. Masking acceptance covers the
three requested pieces and pack-snap2; it is not a claim about every score or pack.

Historical final-pack.json, current-pack.json, reviewed-pack.json, trial files and
mix-diagnostics.json are experiments, not authoritative acceptance. Saved
*-in-progress files and adaptation patches are committed checkpoints only. Loader
fixtures/media are ignored; the original node_modules symlink is preserved and
excluded from commits. No installations or pushes were performed.

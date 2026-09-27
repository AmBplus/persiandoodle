# Style: lo-fi electronic (chill, upbeat, clean)

> The style the anidoodle launch film is scored in. Ask for it by name: **"lo-fi electronic"**.
> Code: `engine/src/canvas-core/music/lofiElectronic.ts` (the builder), `lofiKit.ts` (the voices),
> `STYLES.lofiElectronic` in `tables.ts`. Worked examples: `pieces/lofi.ts` (Daylight) and
> `pieces/launch.ts` (`launchLofi3`, the approved launch score, Cmaj9 landing on bar 26).
> The old `lofi` row (ePiano, vinyl, dusty low-pass) is a different, noisier sound. Don't use it for this.

## What it should sound like

Chill but **upbeat**, **clear**, **not noisy**. A warm chord loop that breathes with the kick, a
bright plucked hook bouncing through a ping-pong delay, a round sub, a kick that bounces, a snare on
2 and 4, 16th hats. Listeners' words for the approved launch score: "more upbeat, clearer, less noisy".

**Never:** a synth electric piano (Alex: no ePiano), vinyl crackle, bit-crush, a dark master
low-pass, heavy tape. Each of these reads as "dusty lo-fi hip-hop", not clean electronic.

## The recipe

| Layer | Voice (part id) | How it's made | Stem RMS target |
|---|---|---|---|
| Chords | `warmPad` (`pad`) | 7 PolyBLEP saws spread by 0.55 x +-14 cents, slow per-voice drift (chorus), 12 dB low-pass at 2.6 kHz, 0.5 s attack, 1.4 s release, rootless 3-4 note voicings around E3-E4 | -21 dB |
| Hook | `softPluck` (`lead`) | triangle + square an octave down, filter snaps open and falls in 90 ms, 0.42 s decay, dotted-eighth ping-pong delay (feedback 0.28, mix 0.24) | -16.5 dB |
| Sparkle | `softPluck` (`sparkle`) | the same an octave up (C6 area), panned 0.35, more delay (0.35) and more room | -24 dB |
| Sub | `sub` (`sub`) | sine + a whisper of the 2nd harmonic, low-passed at 150 Hz; root for 3 beats, a walk note on the last eighth | -18 dB |
| Kick | `kick` (`kick`) | two alternating bouncy bar patterns | -14 dB |
| Snare | `snare` (`snare`) | beats 2 and 4, rim ghosts (`ghost`) about 11 dB under | -20 dB |
| Hats | `hat` (`hat`) | 16ths, accents 0.85 / 0.35 / 0.6 / 0.4 | -28 dB |

Bus: the kick ducks the pad and sparkle (depth 0.38, release 0.24 s: the pump that makes it
breathe). Tape barely there (2.5 cents wow at 0.4 Hz, no flutter, drive 1.02). `fx.clean`: no
lo-fi master tone. Room send only. Master: dense, **-14 LUFS**, true peak **<= -1 dBTP** through
the look-ahead limiter.

**Tempo** 90-100 bpm (the style range is 80-100), swing 0.54 (a hint, not a shuffle). **Harmony:**
a 4-bar, one-chord-per-bar loop of 7th/9th chords with rootless pads that move by step. Two that
work: ii-V-I-vi in C (Dm9 G13 Cmaj9 Am9, the launch) and I-vi-IV-V in D (Dmaj9 Bm9 Gmaj9 A13,
Daylight). **Hook:** one 4-bar phrase over the loop, the question ending off the tonic on the last
chord, the answer landing on the home chord; give it a second-pass variant (`hook: [a, b]`) so two
8-bar blocks are never identical.

## The API

```ts
import { lofiElectronic } from "./music";
const piece = lofiElectronic({
  bpm: 96, key: "D", mood: "joy",
  progression: [ // one bar each: pad voicing, sub root + walk note, hook bar(s), sparkle bar
    { name: "Dmaj9", pad: "[F#3 A3 C#4 E4]", root: "D2", walk: "A1", hook: "r:.5 F#4:.5 A4:.5 D5:1 C#5:.5 A4:1", sparkle: "r:1 A5:.5 C#6:.5 E6:2" },
    /* Bm9, Gmaj9, A13 */ ],
  home: 0,               // the home chord (index in the progression)
  land: "claim",         // this bar lands on home: a bar number or a section id; default = the last drop
  sections: [
    { kind: "intro", bars: 2 }, { kind: "hook", bars: 4 }, { kind: "hook", bars: 4, sparkle: true, stretch: true },
    { kind: "half", bars: 2 }, { kind: "breakdown", bars: 2 }, { kind: "drop", bars: 1, id: "claim" }, { kind: "outro", bars: 2 },
  ],
  levels: { sub: -6 },   // part gainDb, set by measuring stems (below)
});
```

| Kind | Layers |
|---|---|
| `intro` | pad only (`intro` chords if given, e.g. IV V into home) |
| `groove` | pad, sub, full drums |
| `hook` | groove + hook |
| `half` | pad, sub, half-time drums (kick on 1, snare on 3, quarter hats) |
| `breakdown` | pad only: drums and sub out, before the landing |
| `drop` | groove + hook: everything back, on the home chord |
| `outro` | the home chord held, sub on the home root, the home note on the last bar |

Any section takes `hook: true/false` and `sparkle: true`. Every bar is checked by `line()`: a hook
bar that doesn't add up to 4 beats throws.

- **Film score:** `filmAudio(piece, seconds)` calls `fitScore`, which runs `piece.refit(seconds)`
  first. The `stretch` section (default: the longest hook/groove/drop) gains or loses **whole
  loop cycles**, so the harmony stays in phase and a numeric `land` after it moves with it. Then
  `fitToDuration` trims the tempo by the remaining few percent (up to about +-6 %). The score ends
  on its outro phrase at the film's last frame. It is never chopped by the picture.
- **Loop:** `loop: true` (no final ritard, no cadence relax), then `renderLoop(piece, sr)`. It renders
  the tail, folds reverb, delay and pad release back onto the start, and snaps tape wow to whole
  cycles per loop. Loop length = bars x 4 x 60 / bpm (12 bars at 96 bpm = 30 s exactly).

## Arrangement (how the launch score moves)

Intro pad (2 bars) -> groove -> hook -> hook + sparkle -> half-time for a scene change ->
groove with sparkle -> breakdown (drums out) -> **drop on the home chord on the claim** -> outro
holding home. Sections change on scene changes. At 90 bpm a bar is 80 frames at 30 fps.

## Mixing: balance by stem RMS, then master

```
node tools/music.mjs stems <piece>            # each part's stem RMS vs its target; FLAG when > 3 dB off
node tools/music.mjs render <piece> out.mp3 --stems
```

A stem is a part's own signal: unmastered, pre-room, after its gain and the duck. It is measured
as RMS over its **active** samples (|x| > 1e-4), left channel, at 24 kHz, the way the targets were
calibrated (`LOFI_STEM_TARGETS`). Fix a flagged part with its `levels` gain, never with the master.

**The lesson:** integrated LUFS only says how loud the whole mix is. On the launch score the
mix read a healthy -14 LUFS while the sub sat **7-10 dB too hot**. The number was right and the
balance was wrong. `tools/music-unit.mjs` keeps a regression for this: a sub 9 dB hot
still masters to -14.0 LUFS, and only the stem meter flags it.

## Checks (`node tools/music-unit.mjs`)

- launchLofi3 md5 unchanged;
- determinism (same md5 twice);
- true peak <= -1 dBTP;
- -14 LUFS +-1;
- stems within +-3 dB;
- the hot-sub lesson;
- the loop seam is an ordinary sample step;
- a film fit ends on the home note at `seconds - tail`.

Meters prove we aren't obviously wrong. **A human hears it before it ships:** mp3 on a page first.

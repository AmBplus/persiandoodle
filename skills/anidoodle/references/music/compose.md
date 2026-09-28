# Compose: from a brief to an original score

A style is a **vocabulary**. It gives you:
- sound: voices, levels and fx;
- groove families;
- a harmony language;
- melody rules;
- an arrangement grammar.

It never gives you notes. **You write every note**:
- the chords and their voicings;
- the bass lines;
- the motifs and lines;
- the form.

The engine refuses to fill gaps. Missing harmony, melody, grooves or form is an error that tells you
what to compose. The engine then performs, synthesizes, mixes and masters, deterministically, in code.

> **Never reuse shipped material.** The demos (`node tools/music.mjs list`) and our own film scores
> are listening references and the novelty corpus. They are never a film's score or a template. Don't
> copy them, transpose them or re-rhythm them. `node tools/music.mjs novelty` fails a score that
> sounds like any shipped piece, or that quotes a 6-note fragment of one (transposed or not).
>
> **Idioms are fine.** A ii-V-I, a plagal amen, a two-chord vamp, a I-bVII-IV are vocabulary. The
> style pages name them so you can use them. What is not fine is reusing the same music: a
> multi-bar progression together with its rhythm, groove, contour and form, or a quoted melody.
>
> Why this rule exists: a "new" example once changed the key, chords and pitches of the launch
> score but kept its rhythms, contour, drums and form. It was heard at once as the same song. The
> novelty fingerprint weighs exactly those things.

## The workflow

1. **Read the brief as numbers.** Write down:
   - the use case (launch film, explainer, loop for a site, game, ad);
   - the length in seconds, and whether it must loop;
   - 3-5 picture beats with their times (the reveal, the claim, the cut to the end card);
   - the words the person used for the feeling.
2. **Pick one style and one mood.** Styles:
   ```
   node tools/music.mjs vocab
   node tools/music.mjs vocab <style>
   ```
   For the details, see [styles/vocabularies.md](styles/vocabularies.md). The mood is a row in
   `tables.ts` (see the README's mood list). Then set the five **mood controls**, each 0..1, where
   0.5 = the calibrated palette:

   | Control | What it moves |
   |---|---|
   | `energy` | groove density, drum level, sidechain depth, dynamics |
   | `warmth` | filters darker, tape drive and wow, a little more bass |
   | `brightness` | filters and pluck brightness open, hats up |
   | `tension` | pad detune wider, string attacks shorter, lead decays shorter |
   | `space` | reverb sends, delay mix, pad release |

   Controls change the sound only. Harmonic tension is yours to write (step 3).
3. **Compose the harmony.** Work inside the style's harmony language: its modes, chord qualities,
   tendencies and voicing rule. Decide the key and mode from the mood, not from habit.
   - Write a progression **for this brief**. Choose its length (2, 3, 4, 5, 6 or 8 bars) and its
     harmonic rhythm (one chord per bar, two per bar, or one per two bars) on purpose.
   - Voice each chord yourself. Move the voices by step and hold common tones. The bass owns the
     root.
   - Write each chord's bass line (one bar) in the style's bass idiom: held root, root and fifth,
     walking, offbeat 8ths, a syncopated 808 figure. Make the rhythm YOURS.
   - **Tension and release as a curve.** Stable (tonic), moving away (subdominant, relative,
     borrowed), leaning (dominant, suspension, pedal), home. Put home on the picture's key beat.
4. **Compose the motif(s).** A motif is 2-5 notes with its own rhythm. Invent the rhythm first:
   - Which beats does it avoid?
   - Does it start on an upbeat?
   - Where is the long note?

   Then the pitches: the contour, one leap, then steps back.

   Develop the motif. Don't photocopy it:
   - **repeat**, then **vary**: change the last interval, displace it by an eighth, extend it;
   - **sequence**: the same shape a step or a third higher;
   - **call and response**: the question ends off the tonic, the answer lands on it, or another
     instrument answers;
   - **fragment** it in a build, **augment** it (slower, longer notes) at the climax;
   - put it in the bass for menace, or high and quiet at the close.

   The phrase's high point goes in its second half. A phrase is 2 or 4 bars; a period is two phrases
   (question, answer). The line must respect the style's range and density.
5. **Choose or write the groove.** Pick a family from the style's list (`bounce`, `trap`,
   `brushes`, `hand`, ...). Set `density` 0..1, `variation` 0..1 and `fill` (a fill on a section's
   last bar). The seed varies every bar, so no two pieces share a loop. You can also write the drum
   bars yourself as notation, one or more bars per lane: `kick`, `snare`, `ghost`, `hat`, `perc`.
   Use a second groove for contrast (`half`, `build`).
6. **Write the form.** Sections are `{ kind, bars, harmony, lead, counter, arp, groove, bass,
   chordVel, energy, repeat, stretch }`.
   - The **kind** sets which layers may sound: intro, verse, groove, hook, build, half, breakdown,
     drop, bridge, swell, breath, outro. See the arrangement grammar in vocabularies.md.
   - Lines sound only where you write them.
   - Land each section change on a picture beat. At `bpm`, a bar lasts `beatsPerBar x 60 / bpm`
     seconds, and at 30 fps a beat is `1800 / bpm` frames.
   - Mark one section `stretch: true`: a film fit repeats or drops it to reach the exact length and
     still end on your outro.
7. **Check, render, listen:**
   ```
   node tools/music.mjs check <file>.ts#<export> [--fit --seconds 62]   # EVERYTHING, must PASS (below)
   node tools/music.mjs render <file>.ts#<export> out.mp3 --stems       # the file, plus the same report
   node tools/music.mjs novelty <a>.ts#x <b>.ts#y                       # several scores: vs shipped AND pairwise
   node tools/music.mjs score <file>.ts#<export>                        # the text score, bar by bar
   ```
   `check` runs everything:
   - key/mode problems and composer warnings (for example, a line shorter than its section);
   - the master: loudness vs target, true peak, and a note when the -1 dBTP ceiling stopped the
     gain short;
   - the **ghost, reverb and masking guards**;
   - the stems;
   - novelty.

   It exits non-zero on any failure. `render` prints the same report (stems with `--stems`), except
   novelty.
   - **Stems:** fix any part flagged more than 3 dB off with `levels`. `levels` is a **dB offset** per
     slot (+2 = two dB louder), added on top of the calibrated gain, the trims and the mood controls'
     shifts. LUFS alone once hid a sub 7-10 dB too hot.
   - **When the guards and the stems disagree, the guards win.** If masking fails (the melody isn't
     heard), raise the lead. The stem meter lets the lead sit up to +3 dB above its tolerance for
     this. You can also lower or thin what sits in the melody's register. Mood controls shift the
     stem targets with the sound (for example, brightness lifts the hats and their target); the
     printed targets already include that.
   - **Master short of target:** a gentle master (-16 LUFS) never compresses. If one peak blocks the
     gain, the whole piece stays quieter, and `check` says by how much. Fix it in the notes: stagger
     the bass under the loudest downbeat, roll the big chord, don't double the climax note.
   - **Novelty:** if it fails, change what the numbers point at. The per-feature scores name it:
     the lead's rhythm, the contour, the groove, the chord colours, the form. Changing the key fixes
     nothing.
   - **Listen:** the person hears it before it is used. Meters prove you aren't obviously wrong.
     Only an ear says right. For a **loop**, deliver a `.wav`: mp3 adds encoder padding, so it clicks
     or gaps at the loop point.

## The material format

Write the score in the film's own file, e.g. `engine/src/canvas-core/<film>Score.ts`, and export it:

```ts
import type { Material } from "./music";
export const score = (): Material => ({
  style: "<style id>", title: "<this film's score>", seed: <any integer>, mood: "<mood id>",
  bpm: <tempo in the style's range>, key: "<tonic>", mode: "<mode id>", meter: "<meter>",
  moodControls: { energy: <0..1>, warmth: <0..1>, brightness: <0..1>, tension: <0..1>, space: <0..1> },
  swing: <0.5 straight .. 0.67 hard>, dyn: [<start 0..1>, <end 0..1>], tail: <seconds of ring-out>,
  chords: { "<name>": { voicing: "[<note> <note> <note>]", bass: "<one bar of notation>" }, /* ... */ },
  motifs: { "<motif>": "<one or more bars of notation>", /* your variations are motifs too */ },
  grooves: { main: { family: "<family>", density: <0..1>, variation: <0..1> }, half: { family: "<family>" } },
  sections: [
    { kind: "intro", bars: <n>, harmony: ["<chord>", /* per bar, cycled */], chordVel: <0..1> },
    { kind: "hook", bars: <n>, harmony: [/* ... */], lead: ["<motif>", "<motif variant>", "r:<beats>"], stretch: true, energy: <0..1> },
    { kind: "groove", bars: <n>, harmony: [/* ... */], lead: ["<2-bar motif>"], loopLines: true },
    { kind: "bridge", bars: <n>, key: "<new tonic>", mode: "<mode>", harmony: [/* in the new key */], lead: [/* ... */] },
    /* ... */
    { kind: "outro", bars: <n>, harmony: ["<home chord>"], lead: ["<the motif's last word>"] },
  ],
});
```

A film plays it with `filmScore(score(), fps, frames)` from `canvas-core/score.ts`. That fits your
form to the exact length. `score.ts` is an empty skeleton to copy.

- **Voices:** `voices: { lead: "<alternate name>" }` swaps a slot for one of the style's
  alternates. Or give your own `{ inst, role, gainDb, opts }` (instruments: README table).
- **Loops:** `loop: true`, and the form length is the loop. `render` makes it seamless.
- **Split bars:** `harmony: ["<chord> <chord>"]` splits a bar in two. Give that section a `bass`
  override for it.
- **Lines play once.** `lead`, `counter` and `arp` start at the section's first bar and play ONCE,
  even though `harmony` cycles. A shorter line leaves rests, and `check` warns. Set
  `loopLines: true` to repeat the line until the section is full. `repeat: n` replays the whole
  section, lines included.
- **Section `energy`** (0..1, 0.5 = as written) sets the section's dynamics for every part,
  hand-written lines included. It scales velocity from 0.55x to 1.45x, roughly -5 to +3 dB. It
  also sets the density of generated grooves.
- **`dyn`** is the whole piece's dynamic level `[start, end]`, ramped (default `[0.62, 0.66]`).
  `swing` and `tail` default to the style's lower swing bound and 3.2 s.
- **Modulation:** give a section its own `key` and `mode`. The key check then reads each key region
  on its own. A lift of a step for the last chorus is fine when that section declares the new key.
- **The key check weighs the tonic.** It accepts your declared tonic and mode when the mode's scale
  explains the notes as well as any other reading, and the tonic is heard (at least 8 % of note
  time). A lydian or dorian passage whose notes lean on another degree gets read as that degree's
  major. Put the bass on the tonic at section starts and cadences, and state the mode's colour note.
- **Written drums:**
  - A `LiteralGroove` gives notation bars per lane (`kick`, `snare`, `ghost`, `hat`, `perc`).
  - The bars cycle from each section's first bar; `cycle: "piece"` cycles on the piece's bar count
    instead.
  - Unpitched drums ignore the written pitch: write `C4`.
  - A timpani in a drum lane (orchestral, choral, suspense, world) is tuned to the tonic of `key`,
    generated grooves included (`epic`).

**Notation** (bar-checked; a bar that doesn't add up throws, the last bar too: a line that ends
mid-bar writes its rest, `C2:3 r:1`, never a silent gap):
- A token is `NOTE:DUR[@VEL]` (a pitch name with an octave, e.g. `F#4`), `[NOTE NOTE ...]:DUR` (a
  chord) or `r:DUR` (a rest).
- Bars are separated by `|`, or given as array items.
- Durations are in beats. In 6/8, 9/8 and 12/8 a beat is a dotted quarter, so an eighth is `1/3`.
  In 7/8 a beat is a quarter, so an eighth is `.5` and a bar is 3.5.
- `@VEL` scales the line's velocity (0..1).
- In a hand-written piece, a one-bar sting on any beat says so: `line(t, "G6:1", { ..., hit: true })`.

## Craft notes (what makes it good, not just valid)

- **One idea, developed.** Most memorable scores have one motif, heard 6-12 times, never the same
  way twice. Two motifs at most; the second answers or contrasts the first.
- **Contrast by section:**
  - change the density (layers in and out);
  - change the register (the motif up an octave);
  - change the harmonic rhythm (twice as fast into a cadence);
  - change the groove (half-time).

  A section that only repeats the previous one is dead air.
- **Cadences on picture beats.** The strongest arrival (home chord, full layers, the motif's peak)
  goes on the most important frame. The claim, the reveal and the logo each get a structural
  downbeat. Use a breakdown or a breath (drums out, one bar of silence) right before it.
- **Tension curve.** Plan energy 0..1 per section before writing notes: rise, a dip before the peak,
  then release. Match it with density, register and harmony (leaning chords before home).
- **Endings.** End on a phrase, never on the last frame by accident:
  - a held home chord with the motif's last word;
  - a button (a short tutti hit);
  - an unresolved hold (suspense only).
- **Mood fit.** Match the mode, tempo and brightness to the words. If the listener names a different
  emotion from the one you declared, the choice was wrong, not the listener.
- **Breadth.** Across projects, vary the meter, the harmonic rhythm, the groove family and the form
  length. Two scores for two products should not be siblings.

## What checks what

| Check | Runs in | Fails when |
|---|---|---|
| key/mode (`planProblems`) | `check`, `render` | a key region's notes don't support its declared tonic and mode |
| composer warnings | `check`, `render` | (warns only) a line is shorter than its section, ... |
| master | `check`, `render` | (notes only) the peak ceiling stopped the gain short of the target |
| ghost guard | `check`, `render` | 4-bar windows are formless (few onsets, sustained, wet, no cadence) |
| reverb guard | `check`, `render` | the late tail sits within 10 dB of the dry sound |
| masking guard | `check`, `render` | the melody doesn't clear the other parts in 500 Hz-4 kHz |
| stems | `check`, `render --stems`, `stems` | a part is more than 3 dB off target (lead: up to +6 dB allowed); advisory for uncalibrated styles |
| novelty | `check`, `novelty` | similarity above 0.5 to a shipped piece (or to each other), or a reused 6-note melody fragment |

`tools/music-unit.mjs` keeps the engine honest: determinism, no defaults, every vocabulary renders.

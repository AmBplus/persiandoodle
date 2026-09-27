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
> copy them, transpose them or re-rhythm them. Also don't reuse a progression, motif or form printed
> anywhere in these docs. `node tools/music.mjs novelty` fails a score that sounds like any shipped
> piece, or that quotes a 6-note fragment of one (transposed or not).
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
7. **Render, meter, check, listen:**
   ```
   node tools/music.mjs render <file>.ts#<export> out.mp3 --stems   # loudness, peak, stems
   node tools/music.mjs render <file>.ts#<export> out.mp3 --fit --seconds 62
   node tools/music.mjs novelty <file>.ts#<export>                   # must PASS
   node tools/music.mjs score <file>.ts#<export>                     # the text score, bar by bar
   ```
   - **Stems:** fix any part flagged more than 3 dB off with `levels` (gainDb per slot). LUFS alone
     once hid a sub 7-10 dB too hot.
   - **Novelty:** if it fails, change what the numbers point at. The per-feature scores name it:
     the lead's rhythm, the contour, the groove, the chord colours, the form. Changing the key fixes
     nothing.
   - **Listen:** the person hears it (an mp3 on a page) before it is used. Meters prove you aren't
     obviously wrong. Only an ear says right.

## The material format

Write the score in the film's own file, e.g. `engine/src/canvas-core/<film>Score.ts`, and export it:

```ts
import type { Material } from "./music";
export const score = (): Material => ({
  style: "<style id>", title: "<this film's score>", seed: <any integer>, mood: "<mood id>",
  bpm: <tempo in the style's range>, key: "<tonic>", mode: "<mode id>", meter: "<meter>",
  moodControls: { energy: <0..1>, warmth: <0..1>, brightness: <0..1>, tension: <0..1>, space: <0..1> },
  chords: { "<name>": { voicing: "[<note> <note> <note>]", bass: "<one bar of notation>" }, /* ... */ },
  motifs: { "<motif>": "<one or more bars of notation>", /* your variations are motifs too */ },
  grooves: { main: { family: "<family>", density: <0..1>, variation: <0..1> }, half: { family: "<family>" } },
  sections: [
    { kind: "intro", bars: <n>, harmony: ["<chord>", /* per bar, cycled */], chordVel: <0..1> },
    { kind: "hook", bars: <n>, harmony: [/* ... */], lead: ["<motif>", "<motif variant>", "r:<beats>"], stretch: true },
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

**Notation** (bar-checked; a bar that doesn't add up throws):
- A token is `NOTE:DUR[@VEL]` (a pitch name with an octave, e.g. `F#4`), `[NOTE NOTE ...]:DUR` (a
  chord) or `r:DUR` (a rest).
- Bars are separated by `|`, or given as array items.
- Durations are in beats. In 6/8, 9/8 and 12/8 a beat is a dotted quarter, so an eighth is `1/3`.
  In 7/8 a beat is a quarter, so an eighth is `.5` and a bar is 3.5.
- `@VEL` scales the line's velocity (0..1).

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

## Checks that run for you

- `planProblems`: the declared key and mode match the notes.
- `guards`:
  - ghost: formless sustained sound fails;
  - reverb;
  - masking: the melody must be heard.
- The stem meter (`--stems`).
- The master: -14 LUFS for dense styles, -16 for gentle ones, true peak <= -1 dBTP.
- `novelty` (above).
- `tools/music-unit.mjs` keeps the engine honest (determinism, no defaults, every vocabulary renders).

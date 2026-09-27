// LO-FI ELECTRONIC EXAMPLES, written on the style API (lofiElectronic.ts). "Daylight": D major, 96
// bpm, the I-vi-IV-V loop Dmaj9 Bm9 Gmaj9 A13 with rootless pads that move by step
// (F#-A-C#-E, F#-A-C#-D, F#-A-B-D, G-B-C#-F#). The hook asks on the A13 (ends off the tonic) and the
// loop answers on Dmaj9; its second pass lifts the G and A bars. No ePiano, no vinyl: clean.
//   lofiDaylightLoop  12 bars, 30 s, seamless: render with renderLoop (tools/music.mjs picks it).
//   lofiDaylight      the arranged form: intro (IV V into home), hook, hook + sparkle, half-time,
//                     breakdown, the drop landing on Dmaj9, outro. refit() stretches it for a film.
import type { Piece } from "../plan";
import { lofiElectronic, type LofiChord, type LofiSpec } from "../lofiElectronic";

export const DAYLIGHT_PROGRESSION: LofiChord[] = [
  { name: "Dmaj9", pad: "[F#3 A3 C#4 E4]", root: "D2", walk: "A1", hook: "r:.5 F#4:.5 A4:.5 D5:1 C#5:.5 A4:1", sparkle: "r:1 A5:.5 C#6:.5 E6:2" },
  { name: "Bm9", pad: "[F#3 A3 C#4 D4]", root: "B1", walk: "F#1", hook: "r:.5 F#4:.5 B4:.5 C#5:.5 D5:1 B4:1", sparkle: "r:1 F#5:.5 A5:.5 C#6:2" },
  { name: "Gmaj9", pad: "[F#3 A3 B3 D4]", root: "G1", walk: "D2", hook: ["r:.5 D5:.5 E5:.5 F#5:1 E5:.5 D5:1", "r:.5 D5:.5 E5:.5 F#5:.5 A5:1 F#5:1"], sparkle: "r:1 F#6:.5 D6:.5 B5:2" },
  { name: "A13", pad: "[G3 B3 C#4 F#4]", root: "A1", walk: "E2", hook: ["C#5:1.5 B4:.5 A4:1 r:1", "E5:1.5 C#5:.5 E5:1 r:1"], sparkle: "C#6:1 B5:1 A5:2" },
];
// levels: set by measuring the stems against LOFI_STEM_TARGETS (node tools/music.mjs stems lofiDaylightLoop)
const LEVELS = { pad: -3, lead: 6, sparkle: 8, sub: -6, kick: 0.5, snare: 8, ghost: 4, hat: 20 };

export const lofiDaylightLoopSpec = (): LofiSpec => ({
  title: "Daylight (loop)", seed: 96, bpm: 96, key: "D", progression: DAYLIGHT_PROGRESSION, loop: true, tail: 3.5, mood: "joy", levels: LEVELS,
  sections: [{ kind: "hook", bars: 4 }, { kind: "hook", bars: 4, sparkle: true }, { kind: "half", bars: 2, sparkle: true }, { kind: "hook", bars: 2 }],
});
export const lofiDaylightSpec = (): LofiSpec => ({
  title: "Daylight", seed: 96, bpm: 96, key: "D", progression: DAYLIGHT_PROGRESSION, home: 0, mood: "joy", levels: LEVELS,
  sections: [
    { kind: "intro", bars: 2 }, { kind: "hook", bars: 4 }, { kind: "hook", bars: 4, sparkle: true, stretch: true }, { kind: "half", bars: 2, sparkle: true },
    { kind: "breakdown", bars: 2 }, { kind: "drop", bars: 1 }, { kind: "outro", bars: 2 },
  ],
});
export const lofiDaylightLoop = (): Piece => lofiElectronic(lofiDaylightLoopSpec());
export const lofiDaylight = (): Piece => lofiElectronic(lofiDaylightSpec());

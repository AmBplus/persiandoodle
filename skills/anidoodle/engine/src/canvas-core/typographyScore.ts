// TYPOGRAPHY BED — the demo score for the native motion-typography videos.
// Two bars at 90 bpm: a soft pad intro, then the home chord with one gentle
// pluck phrase. This is a BACKGROUND bed for component demos, not a shipped
// film's featured score. Fitted to each film's exact length by filmAudio.
import type { Material } from "./music/compose";
import { composePiece } from "./music/compose";
import { filmAudio } from "./music/render";

export const TYPO_BPM = 90;

export const typographyBed = (): Material => ({
  style: "lofiElectronic",
  title: "PersianDoodle typography bed",
  seed: 1401,
  mood: "calm",
  bpm: TYPO_BPM,
  key: "C",
  mode: "major",
  tail: 0.5,
  dyn: [0.5, 0.56],
  chords: {
    Cmaj9: { voicing: "[C3 G3 E4 D4]", bass: "C2:4" },
    Am9: { voicing: "[A2 E3 G3 B3]", bass: "A1:4" },
  },
  motifs: { bed: "G4:1 C5:1 E5:1 C5:1" },
  levels: { chords: 3.5, lead: 4.7 },
  sections: [
    { kind: "intro", bars: 1, harmony: ["Am9"], chordVel: 0.7 },
    { kind: "outro", bars: 1, harmony: ["Cmaj9"], chordVel: 0.62, bass: "C2:4", lead: ["bed"] },
  ],
});

/** A film's `audio` for a typography film `frames` long at `fps`. */
export const typographyAudio = (frames: number, fps: number) =>
  filmAudio(composePiece(typographyBed()), frames / fps);

// anidoodle music: 100 % procedural, notes as data, synthesized in code. No samples, ever.
export * from "./theory";
export * from "./tables";
export * from "./plan";
export * from "./perform";
export * from "./piano";
export * from "./render";
export * from "./meter";
export * from "./guards";
export * from "./score-text";
export * from "./novelty";
export * as instruments from "./instruments";
export * from "./sfx";
import { nocturne, pianoPhrase8 } from "./pieces/nocturne";
import { launchLofi, launchLofi2, launchLofi3 } from "./pieces/launch";
import { musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic } from "./pieces/samplers";
import { marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm } from "./pieces/families";
import { ghostFixture } from "./pieces/fixtures";
import type { Piece } from "./plan";
export { launchLofi, launchLofi2, launchLofi3, nocturne, pianoPhrase8, musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic, marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm, ghostFixture };
/** Named pieces a film (or the tool) can ask for. ghostFixture is a test fixture, never a score. */
export const PIECES = { launchLofi, launchLofi2, launchLofi3, nocturne, pianoPhrase8, musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic, marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm, ghostFixture };
/** Every shipped score (the novelty corpus: a new score must not sound like these). */
export const SHIPPED: Record<string, () => Piece> = Object.fromEntries(Object.entries(PIECES).filter(([k]) => k !== "ghostFixture"));
/** Cuts of one score: compared to each other they are the same music, by design. */
export const PIECE_FAMILIES: Record<string, string[]> = { launch: ["launchLofi", "launchLofi2", "launchLofi3"], nocturne: ["nocturne", "pianoPhrase8"] };

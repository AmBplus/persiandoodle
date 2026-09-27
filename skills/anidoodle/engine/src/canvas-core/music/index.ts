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
export * from "./lofiElectronic";
export * as instruments from "./instruments";
import { nocturne, pianoPhrase8 } from "./pieces/nocturne";
import { launchLofi, launchLofi2, launchLofi3 } from "./pieces/launch";
import { lofiDaylight, lofiDaylightLoop } from "./pieces/lofi";
export { lofiDaylightSpec, lofiDaylightLoopSpec, DAYLIGHT_PROGRESSION } from "./pieces/lofi";
export { launchLofi3Spec, LAUNCH_PROGRESSION } from "./pieces/launch";
import { musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic } from "./pieces/samplers";
import { marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm } from "./pieces/families";
import { ghostFixture } from "./pieces/fixtures";
export { lofiDaylight, lofiDaylightLoop, launchLofi, launchLofi2, launchLofi3, nocturne, pianoPhrase8, musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic, marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm, ghostFixture };
/** Named pieces a film (or the tool) can ask for. ghostFixture is a test fixture, never a score. */
export const PIECES = { lofiDaylight, lofiDaylightLoop, launchLofi, launchLofi2, launchLofi3, nocturne, pianoPhrase8, musicBoxJoy, minorPianoMelancholy, cinematicAwe, chiptunePlayful, lofiNostalgic, marimbaCurious, harpTender, guitarWistful, celestaWonder, bellsHopeful, driveElectronic, folkCalm, ghostFixture };

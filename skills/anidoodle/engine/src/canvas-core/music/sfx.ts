// anidoodle sound effects: the kit (sfxKit), its building blocks (sfxCore) and film placement (sfxMix).
// Docs: references/music/sound-design.md. Tool: engine/tools/sfx.mjs.
export { SFX, SFX_KINDS, sfxVariants, sfxInfo, renderSfx, validateSfx, parseKey, type SfxKind, type SfxOpts, type SfxSound } from "./sfxKit";
export { placeSfx, sfxDuck, sfxAudibility, mixSfx, assertSfxAudible, filmSfx, validateSfxPlan, type SfxCue, type SfxPlan, type SfxSnap, type PlacedCue, type SfxAudibility, type SfxMix } from "./sfxMix";
export { type SfxStereo } from "./sfxCore";

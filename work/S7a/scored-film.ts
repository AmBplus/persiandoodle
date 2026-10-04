import { makeLaunchFilm } from '../../skills/anidoodle/engine/src/canvas-core/launchTemplate';
import type { Material } from '../../skills/anidoodle/engine/src/canvas-core/music/compose';
import type { Film } from '../../skills/anidoodle/engine/src/canvas-core/film';
const plate: Film = { meta: { title: 'test plate', W: 320, H: 320, fps: 30, bpm: 120, durationFrames: 60 }, assets: { images: {} }, shots: [{ id: 'plate', start: 0, end: 60, draw: (c) => { c.fillStyle = '#204060'; c.fillRect(0, 0, 320, 320); } }] };
const score = (): Material => ({
  style: 'playful', title: 'S7a recorded film fixture', seed: 5, mood: 'curious', bpm: 120, key: 'G', mode: 'mixolydian',
  voices: { lead: { inst: 'harp', role: 'melody' }, chords: { inst: 'marimba', role: 'accomp' }, bass: { inst: 'marimba', role: 'bass' } },
  chords: { G: { voicing: '[D4 G4 B4]', bass: 'G2:1.5 D3:.5 G2:1 F2:1' }, F: { voicing: '[C4 F4 A4]', bass: 'F2:1.5 C3:.5 F2:1 E2:1' } },
  motifs: { a: 'B4:.5 D5:.5 G5:1 r:.5 F5:.25 E5:.25 D5:1', b: 'r:1 A4:.5 C5:.5 F5:1 E5:.5 C5:.5' },
  grooves: { main: { family: 'shuffle', density: 0.45, variation: 0.35 } },
  sections: [{ kind: 'groove', bars: 4, harmony: ['G', 'F'], lead: ['a', 'b', 'a', 'b'], groove: 'main', stretch: true }, { kind: 'outro', bars: 1, harmony: ['G'], lead: ['a'] }],
});
export const scoredFilm = makeLaunchFilm({ title: 'S7a proof', asks: [{ prompt: 'draw it', plate, label: 'proof' }], tagline: 'recorded score', install: ['local fixture'], bpm: 120, askBeats: 8, endBeats: 12, score });
